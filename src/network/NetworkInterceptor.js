import { getUnsafeWindow } from '../platform/window.js';
import { RestPayloadHandler } from './RestPayloadHandler.js';

/** @typedef {import('../types.js').AppConfig} AppConfig */
/** @typedef {import('../store/ReactionUserStore.js').ReactionUserStore} ReactionUserStore */
/** @typedef {import('../auth/SlackTokenProvider.js').SlackTokenProvider} SlackTokenProvider */
/** @typedef {import('../slack/SlackDom.js').SlackDom} SlackDom */

/** @typedef {(channelId: string, ts: string) => void} ReactionEventRefresh */

/**
 * Patches fetch/XHR/WebSocket to passively ingest Slack traffic.
 * @param {object} deps
 * @param {ReactionUserStore} deps.store
 * @param {SlackTokenProvider} deps.tokenProvider
 * @param {AppConfig} deps.config
 * @param {SlackDom} deps.slackDom
 * @param {ReactionEventRefresh} [deps.onReactionEvent]
 */
export class NetworkInterceptor {
  constructor({ store, tokenProvider, config, slackDom, onReactionEvent }) {
    this.store = store;
    this.tokenProvider = tokenProvider;
    this.config = config;
    this.payloadHandler = new RestPayloadHandler(store, slackDom);
    this.onReactionEvent = onReactionEvent ?? (() => {});
    this.win = getUnsafeWindow();
    this._wrapFetch();
    this._wrapXhr();
    this._wrapWebSocket();
  }

  /**
   * @param {string} url
   */
  _isWatched(url) {
    return this.config.watchedRestPatterns.some((pattern) => pattern.test(url));
  }

  /**
   * @param {BodyInit | null | undefined} body
   */
  _captureToken(body) {
    const token = this.tokenProvider.extractFromRequestBody(body);
    if (token) this.tokenProvider.setToken(token);
  }

  _wrapFetch() {
    const originalFetch = this.win.fetch;
    const self = this;

    this.win.fetch = async function patchedFetch(...args) {
      try {
        self._captureToken(args[1]?.body);
      } catch {
        // ignore
      }

      const response = await originalFetch.apply(this, args);

      try {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (self._isWatched(url)) {
          response
            .clone()
            .json()
            .then((json) => self.payloadHandler.handle(url, json))
            .catch(() => {});
        }
      } catch {
        // ignore
      }

      return response;
    };
  }

  _wrapXhr() {
    const self = this;
    const { win } = this;
    const originalOpen = win.XMLHttpRequest.prototype.open;
    const originalSend = win.XMLHttpRequest.prototype.send;

    win.XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      this.__reactionBreakdownUrl = url;
      return originalOpen.call(this, method, url, ...rest);
    };

    win.XMLHttpRequest.prototype.send = function patchedSend(...sendArgs) {
      try {
        self._captureToken(sendArgs[0]);
      } catch {
        // ignore
      }

      this.addEventListener('load', function onLoad() {
        try {
          const url = this.__reactionBreakdownUrl || '';
          if (self._isWatched(url) && this.responseText) {
            const json = JSON.parse(this.responseText);
            self.payloadHandler.handle(url, json);
          }
        } catch {
          // ignore non-JSON or parse errors
        }
      });

      return originalSend.apply(this, sendArgs);
    };
  }

  _wrapWebSocket() {
    const self = this;
    const OriginalWebSocket = this.win.WebSocket;

    function PatchedWebSocket(url, protocols) {
      const ws = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(String(event.data));
          if (data?.type === 'reaction_added' || data?.type === 'reaction_removed') {
            self.store.applyReactionEvent(data);
            const channelId = data.item?.channel;
            const ts = data.item?.ts;
            if (channelId && ts) {
              self.onReactionEvent(channelId, ts);
            }
          }
        } catch {
          // not a JSON frame
        }
      });

      return ws;
    }

    PatchedWebSocket.prototype = OriginalWebSocket.prototype;
    this.win.WebSocket = PatchedWebSocket;
  }
}
