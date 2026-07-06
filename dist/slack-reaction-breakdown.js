(() => {
  // src/config.js
  var CONFIG = {
    activeFallback: {
      enabled: true,
      batchDelayMs: 250,
      maxBatchSize: 8,
      retryCooldownMs: 6e4
    },
    watchedRestPatterns: [
      /\/api\/conversations\.history/,
      /\/api\/conversations\.replies/,
      /\/api\/conversations\.members/,
      /\/api\/conversations\.info/,
      /\/api\/reactions\.get/,
      /\/api\/reactions\.list/,
      /\/api\/search\.messages/,
      /\/api\/users\.info/,
      /\/api\/users\.list/,
      /\/api\/client\.boot/,
      /\/api\/client\.userBoot/,
      /\/api\/client\.counts/,
      /\/api\/emoji\.list/,
      /edgeapi\.slack\.com\/cache\//
    ],
    selectors: {
      messageContainer: '[data-qa="message_container"], [data-qa="virtual-list-item"]',
      messageList: '[data-qa="slack_kit_list"], [data-qa="message_pane"]',
      reactionPill: '[data-qa="reaction"]',
      reactionEmoji: '[data-qa="emoji"], img.c-emoji, span.c-emoji, img[data-stringify-type="emoji"], [data-stringify-emoji]',
      timestampAttr: "data-ts"
    },
    toolbar: {
      messageActions: '[data-qa="message-actions"]',
      messageActionsGroup: ".c-message_actions__group"
    },
    ui: {
      avatarSize: 18,
      maxRowsPerPage: 3,
      maxUsersHeight: 110
    }
  };

  // src/utils/event-bus.js
  var EventBus = class {
    constructor() {
      this._listeners = /* @__PURE__ */ new Map();
    }
    /**
     * @param {string} event
     * @param {(payload: unknown) => void} listener
     * @returns {() => void}
     */
    on(event, listener) {
      const set = this._listeners.get(event) ?? /* @__PURE__ */ new Set();
      set.add(listener);
      this._listeners.set(event, set);
      return () => set.delete(listener);
    }
    /**
     * @param {string} event
     * @param {unknown} [payload]
     */
    emit(event, payload) {
      const set = this._listeners.get(event);
      if (!set) return;
      set.forEach((listener) => {
        try {
          listener(payload);
        } catch {
        }
      });
    }
  };
  var StoreEvents = {
    USER_RESOLVED: "user:resolved",
    EMOJI_LIST_LOADED: "emoji:list-loaded"
  };

  // src/utils/dom.js
  function onDomReady(callback) {
    const readyStates = ["interactive", "complete"];
    if (readyStates.includes(document.readyState)) {
      callback();
      return;
    }
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  // src/store/ReactionUserStore.js
  var ReactionUserStore = class _ReactionUserStore {
    /**
     * @param {EventBus} [events]
     */
    constructor(events = new EventBus()) {
      this.events = events;
      this.messageReactions = /* @__PURE__ */ new Map();
      this.userDirectory = /* @__PURE__ */ new Map();
      this.channelMembers = /* @__PURE__ */ new Map();
      this.emojiIconCache = /* @__PURE__ */ new Map();
      this.emojiUrlMap = /* @__PURE__ */ new Map();
    }
    /**
     * @param {string} channelId
     * @param {string} ts
     * @returns {string}
     */
    static keyFor(channelId, ts) {
      return `${channelId}::${ts}`;
    }
    /**
     * @param {string} channelId
     * @param {string} ts
     * @param {ReactionEntry[]} reactions
     */
    upsertMessageReactions(channelId, ts, reactions) {
      if (!ts) return;
      const key = _ReactionUserStore.keyFor(channelId, ts);
      this.messageReactions.set(key, {
        reactions: (reactions || []).map((reaction) => ({
          name: reaction.name,
          count: reaction.count,
          users: reaction.users || []
        })),
        updatedAt: Date.now()
      });
    }
    /**
     * @param {string} channelId
     * @param {string} ts
     * @returns {MessageReactionsSnapshot | undefined}
     */
    getMessageReactions(channelId, ts) {
      return this.messageReactions.get(_ReactionUserStore.keyFor(channelId, ts));
    }
    /**
     * @param {Array<{ id?: string; name?: string; real_name?: string; profile?: { real_name?: string; image_24?: string; image_original?: string; image_32?: string } }>} users
     */
    upsertUsers(users) {
      (users || []).forEach((user) => {
        if (!user?.id) return;
        const isNewOrChanged = !this.userDirectory.has(user.id);
        this.userDirectory.set(user.id, {
          id: user.id,
          name: user.name ?? user.id,
          real_name: user.profile?.real_name || user.real_name || user.name || user.id,
          image: user.profile?.image_24 || user.profile?.image_original || user.profile?.image_32 || null
        });
        if (isNewOrChanged) {
          this.events.emit(StoreEvents.USER_RESOLVED, user.id);
        }
      });
    }
    /**
     * @param {string} channelId
     * @param {string[]} memberIds
     */
    upsertChannelMembers(channelId, memberIds) {
      if (!channelId) return;
      const members = this.channelMembers.get(channelId) ?? /* @__PURE__ */ new Set();
      (memberIds || []).forEach((id) => members.add(id));
      this.channelMembers.set(channelId, members);
    }
    /**
     * @param {string} userId
     * @returns {string | null}
     */
    resolveUserLabel(userId) {
      const user = this.userDirectory.get(userId);
      if (!user) return null;
      return user.real_name || user.name || userId;
    }
    /**
     * @param {string} channelId
     * @returns {number | null}
     */
    getChannelMemberCount(channelId) {
      const members = this.channelMembers.get(channelId);
      return members ? members.size : null;
    }
    /**
     * @param {string} name
     * @param {string} html
     */
    cacheEmojiHtml(name, html) {
      if (!name || !html) return;
      if (!this.emojiIconCache.has(name)) {
        this.emojiIconCache.set(name, html);
      }
    }
    /**
     * @param {string} name
     * @returns {string | null}
     */
    getEmojiHtml(name) {
      return this.emojiIconCache.get(name) ?? null;
    }
    /**
     * @param {Record<string, string>} emojiObj
     */
    upsertEmojiMap(emojiObj) {
      if (!emojiObj || typeof emojiObj !== "object") return;
      let added = false;
      Object.keys(emojiObj).forEach((name) => {
        if (!this.emojiUrlMap.has(name)) added = true;
        this.emojiUrlMap.set(name, emojiObj[name]);
      });
      if (added) {
        this.events.emit(StoreEvents.EMOJI_LIST_LOADED);
      }
    }
    /**
     * @param {string} name
     * @returns {string | null}
     */
    getEmojiUrl(name) {
      let value = this.emojiUrlMap.get(name);
      let depth = 0;
      while (value?.startsWith("alias:") && depth < 5) {
        value = this.emojiUrlMap.get(value.slice("alias:".length));
        depth += 1;
      }
      return value && !value.startsWith("alias:") ? value : null;
    }
    /**
     * @param {(userId: string) => void} listener
     * @returns {() => void}
     */
    onUserResolved(listener) {
      return this.events.on(StoreEvents.USER_RESOLVED, (payload) => {
        listener(
          /** @type {string} */
          payload
        );
      });
    }
    /**
     * @param {() => void} listener
     * @returns {() => void}
     */
    onEmojiListLoaded(listener) {
      return this.events.on(StoreEvents.EMOJI_LIST_LOADED, () => listener());
    }
    /**
     * @param {{ type?: string; reaction?: string; user?: string; item?: { channel?: string; ts?: string } }} event
     */
    applyReactionEvent(event) {
      const channelId = event.item?.channel;
      const ts = event.item?.ts;
      if (!channelId || !ts) return;
      const key = _ReactionUserStore.keyFor(channelId, ts);
      const current = this.messageReactions.get(key) ?? { reactions: [], updatedAt: 0 };
      const index = current.reactions.findIndex((reaction) => reaction.name === event.reaction);
      if (event.type === "reaction_added") {
        if (index === -1) {
          current.reactions.push({
            name: event.reaction ?? "",
            count: 1,
            users: [event.user ?? ""]
          });
        } else {
          const reaction = current.reactions[index];
          if (event.user && !reaction.users.includes(event.user)) {
            reaction.users.push(event.user);
          }
          reaction.count = reaction.users.length;
        }
      } else if (event.type === "reaction_removed" && index !== -1) {
        const reaction = current.reactions[index];
        reaction.users = reaction.users.filter((uid) => uid !== event.user);
        reaction.count = reaction.users.length;
        if (reaction.count <= 0) {
          current.reactions.splice(index, 1);
        }
      }
      current.updatedAt = Date.now();
      this.messageReactions.set(key, current);
    }
  };

  // src/platform/window.js
  function getUnsafeWindow() {
    return typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
  }

  // src/auth/SlackTokenProvider.js
  var SlackTokenProvider = class {
    /**
     * @param {() => string | null} getActiveTeamId
     */
    constructor(getActiveTeamId) {
      this.getActiveTeamId = getActiveTeamId;
      this.win = getUnsafeWindow();
      this.token = null;
    }
    /** @returns {string | null} */
    _extractFromGlobals() {
      try {
        const { win } = this;
        if (win.boot_data?.api_token) return win.boot_data.api_token;
        if (win.TS?.boot_data?.api_token) return win.TS.boot_data.api_token;
      } catch {
      }
      return null;
    }
    /** @returns {string | null} */
    _extractFromLocalStorage() {
      try {
        const raw = this.win.localStorage.getItem("localConfig_v2");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const teams = parsed?.teams ?? {};
        const activeTeamId = this.getActiveTeamId();
        if (activeTeamId && teams[activeTeamId]?.token) {
          return teams[activeTeamId].token;
        }
        const firstWithToken = Object.values(teams).find(
          (team) => team && typeof team === "object" && "token" in team && team.token
        );
        return firstWithToken?.token ?? null;
      } catch {
        return null;
      }
    }
    /**
     * @param {BodyInit | null | undefined} body
     * @returns {string | null}
     */
    extractFromRequestBody(body) {
      try {
        if (!body) return null;
        if (typeof body === "string" && body.includes("token=")) {
          const match = body.match(/token=(xoxc-[^&]+)/);
          if (match) return decodeURIComponent(match[1]);
        }
        if (typeof FormData !== "undefined" && body instanceof FormData && body.has("token")) {
          return String(body.get("token"));
        }
        if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams && body.has("token")) {
          return body.get("token");
        }
      } catch {
      }
      return null;
    }
    /** @returns {string | null} */
    getToken() {
      if (this.token) return this.token;
      this.token = this._extractFromGlobals() || this._extractFromLocalStorage();
      return this.token;
    }
    /** @param {string | null | undefined} token */
    setToken(token) {
      if (token && token !== this.token) {
        this.token = token;
      }
    }
  };

  // src/slack/SlackContext.js
  var SlackContext = class {
    /** @returns {string | null} */
    static getActiveChannelId() {
      const match = location.pathname.match(/\/client\/[A-Z0-9]+\/([A-Z0-9]+)/);
      return match ? match[1] : null;
    }
    /** @returns {string | null} */
    static getActiveTeamId() {
      const match = location.pathname.match(/\/client\/([A-Z0-9]+)/);
      return match ? match[1] : null;
    }
  };

  // src/slack/SlackDom.js
  function createSlackDom(config) {
    const { selectors } = config;
    return {
      getActiveChannelId: SlackContext.getActiveChannelId,
      /**
       * @param {Element} messageEl
       * @returns {string | null}
       */
      getMessageTs(messageEl) {
        const tsNode = messageEl.querySelector(`[${selectors.timestampAttr}]`);
        if (tsNode) return tsNode.getAttribute(selectors.timestampAttr);
        return messageEl.id && /\d{10}\.\d{6}/.test(messageEl.id) ? messageEl.id : null;
      },
      /** @returns {Element[]} */
      getAllReactionPills() {
        const scopes = Array.from(document.querySelectorAll(selectors.messageList));
        const roots = scopes.length ? scopes : [document.body];
        const pills = [];
        roots.forEach((root) => {
          root.querySelectorAll(selectors.reactionPill).forEach((pill) => pills.push(pill));
        });
        return pills;
      },
      /**
       * @param {Element} pillEl
       * @returns {Element | null}
       */
      getEmojiNode(pillEl) {
        return pillEl.querySelector(selectors.reactionEmoji);
      },
      /**
       * @param {Element | null} emojiNode
       * @returns {string | null}
       */
      getEmojiRawName(emojiNode) {
        if (!emojiNode) return null;
        const raw = emojiNode.getAttribute("data-stringify-emoji") || emojiNode.getAttribute("alt") || emojiNode.getAttribute("aria-label") || emojiNode.getAttribute("title") || "";
        const stripped = raw.trim().replace(/^:/, "").replace(/:$/, "");
        if (!stripped || /\s/.test(stripped)) return null;
        return stripped;
      }
    };
  }

  // src/network/RestPayloadHandler.js
  var RestPayloadHandler = class {
    /**
     * @param {ReactionUserStore} store
     * @param {SlackDom} slackDom
     */
    constructor(store, slackDom) {
      this.store = store;
      this.slackDom = slackDom;
    }
    /**
     * @param {string} url
     * @param {Record<string, unknown>} json
     */
    handle(url, json) {
      if (!json) return;
      const channelId = this._extractChannelId(url, json);
      if (Array.isArray(json.messages)) {
        json.messages.forEach((message) => {
          const msg = (
            /** @type {{ ts?: string; reactions?: import('../types.js').ReactionEntry[] }} */
            message
          );
          if (msg.reactions) {
            this.store.upsertMessageReactions(channelId, msg.ts ?? "", msg.reactions);
          }
        });
      }
      if (json.message && typeof json.message === "object") {
        const message = (
          /** @type {{ ts?: string; reactions?: import('../types.js').ReactionEntry[] }} */
          json.message
        );
        if (message.reactions) {
          this.store.upsertMessageReactions(channelId, message.ts ?? "", message.reactions);
        }
      }
      if (Array.isArray(json.items)) {
        json.items.forEach((item) => {
          const entry = (
            /** @type {{ channel?: string; message?: { ts?: string; reactions?: import('../types.js').ReactionEntry[] } }} */
            item
          );
          if (entry.message?.reactions) {
            this.store.upsertMessageReactions(
              entry.channel || channelId,
              entry.message.ts ?? "",
              entry.message.reactions
            );
          }
        });
      }
      if (json.messages && typeof json.messages === "object") {
        const messages = (
          /** @type {{ matches?: Array<{ ts?: string; reactions?: import('../types.js').ReactionEntry[]; channel?: { id?: string } }> }} */
          json.messages
        );
        messages.matches?.forEach((match) => {
          if (match.reactions) {
            this.store.upsertMessageReactions(match.channel?.id || channelId, match.ts ?? "", match.reactions);
          }
        });
      }
      if (json.emoji && typeof json.emoji === "object") {
        this.store.upsertEmojiMap(
          /** @type {Record<string, string>} */
          json.emoji
        );
      }
      if (json.user) {
        this.store.upsertUsers([
          /** @type {object} */
          json.user
        ]);
      }
      if (Array.isArray(json.users)) {
        this.store.upsertUsers(
          /** @type {object[]} */
          json.users
        );
      }
      if (Array.isArray(json.members)) {
        if (json.members[0] && typeof json.members[0] === "object") {
          this.store.upsertUsers(
            /** @type {object[]} */
            json.members
          );
        } else {
          this.store.upsertChannelMembers(
            channelId,
            /** @type {string[]} */
            json.members
          );
        }
      }
    }
    /**
     * @param {string} url
     * @param {Record<string, unknown>} json
     * @returns {string}
     */
    _extractChannelId(url, json) {
      if (typeof json.channel === "string") return json.channel;
      if (json.channel && typeof json.channel === "object" && "id" in json.channel) {
        return String(
          /** @type {{ id?: string }} */
          json.channel.id
        );
      }
      const match = url.match(/channel=([A-Z0-9]+)/);
      return match ? match[1] : this.slackDom.getActiveChannelId() ?? "";
    }
  };

  // src/network/NetworkInterceptor.js
  var NetworkInterceptor = class {
    constructor({ store, tokenProvider, config, slackDom, onReactionEvent }) {
      this.store = store;
      this.tokenProvider = tokenProvider;
      this.config = config;
      this.payloadHandler = new RestPayloadHandler(store, slackDom);
      this.onReactionEvent = onReactionEvent ?? (() => {
      });
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
        }
        const response = await originalFetch.apply(this, args);
        try {
          const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
          if (self._isWatched(url)) {
            response.clone().json().then((json) => self.payloadHandler.handle(url, json)).catch(() => {
            });
          }
        } catch {
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
        }
        this.addEventListener("load", function onLoad() {
          try {
            const url = this.__reactionBreakdownUrl || "";
            if (self._isWatched(url) && this.responseText) {
              const json = JSON.parse(this.responseText);
              self.payloadHandler.handle(url, json);
            }
          } catch {
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
        ws.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(String(event.data));
            if (data?.type === "reaction_added" || data?.type === "reaction_removed") {
              self.store.applyReactionEvent(data);
              const channelId = data.item?.channel;
              const ts = data.item?.ts;
              if (channelId && ts) {
                self.onReactionEvent(channelId, ts);
              }
            }
          } catch {
          }
        });
        return ws;
      }
      PatchedWebSocket.prototype = OriginalWebSocket.prototype;
      this.win.WebSocket = PatchedWebSocket;
    }
  };

  // src/api/SlackApiClient.js
  var SlackApiClient = class {
    constructor() {
      this.win = getUnsafeWindow();
    }
    /**
     * @param {string} token
     * @returns {Promise<Record<string, unknown> | null>}
     */
    async fetchEmojiList(token) {
      return this._post("/api/emoji.list", { token });
    }
    /**
     * @param {string} token
     * @param {string} userId
     * @returns {Promise<Record<string, unknown> | null>}
     */
    async fetchUserInfo(token, userId) {
      return this._post("/api/users.info", { token, user: userId });
    }
    /**
     * @param {string} token
     * @param {string} channelId
     * @param {string} ts
     * @returns {Promise<Record<string, unknown> | null>}
     */
    async fetchReactions(token, channelId, ts) {
      return this._post("/api/reactions.get", {
        token,
        channel: channelId,
        timestamp: ts,
        full: "true"
      });
    }
    /**
     * @param {string} path
     * @param {Record<string, string>} params
     * @returns {Promise<Record<string, unknown> | null>}
     */
    async _post(path, params) {
      try {
        const body = new URLSearchParams(params);
        const response = await this.win.fetch(`${location.origin}${path}`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString()
        });
        return await response.json();
      } catch {
        return null;
      }
    }
  };

  // src/api/ActiveUserResolver.js
  var ActiveUserResolver = class {
    /**
     * @param {ReactionUserStore} store
     * @param {SlackTokenProvider} tokenProvider
     * @param {ActiveFallbackConfig} config
     * @param {SlackApiClient} [apiClient]
     */
    constructor(store, tokenProvider, config, apiClient = new SlackApiClient()) {
      this.store = store;
      this.tokenProvider = tokenProvider;
      this.config = config;
      this.api = apiClient;
      this.pending = /* @__PURE__ */ new Set();
      this.attempted = /* @__PURE__ */ new Map();
      this.queue = [];
      this.isFlushScheduled = false;
      this._emojiListRequested = false;
    }
    ensureEmojiListLoaded() {
      if (!this.config.enabled || this._emojiListRequested) return;
      const token = this.tokenProvider.getToken();
      if (!token) return;
      this._emojiListRequested = true;
      this._loadEmojiList(token);
    }
    /**
     * @param {string} token
     */
    async _loadEmojiList(token) {
      const json = await this.api.fetchEmojiList(token);
      if (json?.ok && json.emoji && typeof json.emoji === "object") {
        this.store.upsertEmojiMap(
          /** @type {Record<string, string>} */
          json.emoji
        );
        return;
      }
      this._emojiListRequested = false;
    }
    /**
     * @param {string} userId
     */
    requestResolve(userId) {
      if (!this.config.enabled || !userId || this.store.userDirectory.has(userId)) return;
      if (this.pending.has(userId)) return;
      const lastAttemptAt = this.attempted.get(userId);
      if (lastAttemptAt && Date.now() - lastAttemptAt < this.config.retryCooldownMs) return;
      this.pending.add(userId);
      this.queue.push(userId);
      this._scheduleFlush();
    }
    _scheduleFlush() {
      if (this.isFlushScheduled) return;
      this.isFlushScheduled = true;
      setTimeout(() => this._flush(), this.config.batchDelayMs);
    }
    async _flush() {
      this.isFlushScheduled = false;
      const batch = this.queue.splice(0, this.config.maxBatchSize);
      if (this.queue.length > 0) this._scheduleFlush();
      if (batch.length === 0) return;
      const token = this.tokenProvider.getToken();
      if (!token) {
        batch.forEach((id) => this.pending.delete(id));
        return;
      }
      await Promise.all(batch.map((userId) => this._resolveOne(userId, token)));
    }
    /**
     * @param {string} userId
     * @param {string} token
     */
    async _resolveOne(userId, token) {
      this.attempted.set(userId, Date.now());
      try {
        const json = await this.api.fetchUserInfo(token, userId);
        if (json?.ok && json.user) {
          this.store.upsertUsers([
            /** @type {object} */
            json.user
          ]);
        }
      } finally {
        this.pending.delete(userId);
      }
    }
    /**
     * @param {string} channelId
     * @param {string} ts
     * @returns {Promise<ApiResult>}
     */
    async fetchReactionsFor(channelId, ts) {
      if (!this.config.enabled) return { ok: false, error: "disabled" };
      if (!channelId || !ts) return { ok: false, error: "missing-channel-or-ts" };
      const token = this.tokenProvider.getToken();
      if (!token) return { ok: false, error: "no-token" };
      const json = await this.api.fetchReactions(token, channelId, ts);
      if (json?.ok && json.message && typeof json.message === "object") {
        const message = (
          /** @type {{ ts?: string; reactions?: import('../types.js').ReactionEntry[] }} */
          json.message
        );
        this.store.upsertMessageReactions(channelId, message.ts || ts, message.reactions || []);
        return { ok: true };
      }
      return { ok: false, error: json?.error && String(json.error) || "unknown" };
    }
  };

  // src/utils/styles.js
  function addStyle(css) {
    if (typeof GM_addStyle === "function") {
      GM_addStyle(css);
      return;
    }
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  // src/utils/clipboard.js
  async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
      }
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  // src/ui/CopyTextBuilder.js
  var CopyTextBuilder = class {
    /**
     * @param {ReactionUserStore} store
     */
    constructor(store) {
      this.store = store;
    }
    /**
     * @param {string} uidsCsv
     * @param {string} emojiName
     */
    buildMentionText(uidsCsv, emojiName) {
      const mentions = (uidsCsv || "").split(",").filter(Boolean).map((uid) => `<@${uid}>`).join(" ");
      if (!mentions) return "";
      return emojiName ? `:${emojiName}: ${mentions}` : mentions;
    }
    /**
     * @param {string} uidsCsv
     * @param {string} emojiName
     */
    buildNamesText(uidsCsv, emojiName) {
      const names = (uidsCsv || "").split(",").filter(Boolean).map((uid) => this.store.resolveUserLabel(uid) || `(loading: ${uid})`);
      if (names.length === 0) return "";
      const prefix = emojiName ? `:${emojiName}: ` : "";
      return `${prefix}${names.join(", ")}`;
    }
    /**
     * @param {string} uidsCsv
     * @param {string} emojiName
     */
    buildHandlesText(uidsCsv, emojiName) {
      const handles = (uidsCsv || "").split(",").filter(Boolean).map((uid) => {
        const user = this.store.userDirectory.get(uid);
        const handle = user?.name || this.store.resolveUserLabel(uid) || uid;
        return `@${handle}`;
      });
      if (handles.length === 0) return "";
      const prefix = emojiName ? `:${emojiName}: ` : "";
      return `${prefix}${handles.join(", ")}`;
    }
    /**
     * @param {'mention' | 'names' | 'handles'} kind
     * @param {string} uidsCsv
     * @param {string} emojiName
     */
    build(kind, uidsCsv, emojiName) {
      switch (kind) {
        case "names":
          return this.buildNamesText(uidsCsv, emojiName);
        case "handles":
          return this.buildHandlesText(uidsCsv, emojiName);
        case "mention":
          return this.buildMentionText(uidsCsv, emojiName);
        default: {
          const _exhaustive = kind;
          void _exhaustive;
          return "";
        }
      }
    }
  };

  // src/utils/html.js
  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return ch;
      }
    });
  }

  // src/ui/ReactionRowRenderer.js
  function formatFallbackEmojiName(name) {
    const base = String(name || "").split("::")[0].replace(/_/g, " ").trim();
    return base || name;
  }
  var ReactionRowRenderer = class {
    /**
     * @param {ReactionUserStore} store
     * @param {SlackDom} slackDom
     * @param {ActiveUserResolver} activeResolver
     */
    constructor(store, slackDom, activeResolver) {
      this.store = store;
      this.slackDom = slackDom;
      this.activeResolver = activeResolver;
    }
    prewarmEmojiCache() {
      this.activeResolver.ensureEmojiListLoaded();
      this.slackDom.getAllReactionPills().forEach((pillEl) => {
        const emojiNode = this.slackDom.getEmojiNode(pillEl);
        if (!emojiNode) return;
        const rawName = this.slackDom.getEmojiRawName(emojiNode);
        if (!rawName || this.store.getEmojiHtml(rawName)) return;
        this.store.cacheEmojiHtml(rawName, emojiNode.cloneNode(true).outerHTML);
      });
    }
    /**
     * @param {string} uid
     */
    renderUserChip(uid) {
      const user = this.store.userDirectory.get(uid);
      const label = user ? user.real_name || user.name || uid : `(loading: ${uid})`;
      const safeLabel = escapeHtml(label);
      const initial = escapeHtml(
        (label.replace(/[()]/g, "").trim().charAt(0) || "?").toUpperCase()
      );
      const avatarHtml = user?.image ? `<img class="rb-avatar" src="${user.image}" alt="" />` : `<span class="rb-avatar rb-avatar-placeholder">${initial}</span>`;
      return `<span class="rb-user-chip" data-uid="${uid}">${avatarHtml}<span class="rb-username">${safeLabel}</span></span>`;
    }
    /**
     * @param {ReactionEntry[]} reactions
     * @param {Set<string>} [pendingUidsOut]
     */
    buildRowsHtml(reactions, pendingUidsOut) {
      this.prewarmEmojiCache();
      return reactions.map((reaction) => {
        const rawEmojiName = String(reaction.name || "").split("::")[0];
        const emojiAttr = escapeHtml(rawEmojiName);
        const emojiUrl = this.store.getEmojiUrl(rawEmojiName);
        const cachedHtml = this.store.getEmojiHtml(reaction.name);
        const emojiHtml = emojiUrl ? `<img class="rb-emoji" src="${escapeHtml(emojiUrl)}" alt=":${emojiAttr}:" title=":${emojiAttr}:" />` : cachedHtml || `<span class="rb-emoji-fallback">:${escapeHtml(formatFallbackEmojiName(reaction.name))}:</span>`;
        const uidsForCopy = reaction.users.join(",");
        const chipsHtml = reaction.users.map((uid) => {
          if (!this.store.userDirectory.has(uid) && pendingUidsOut) {
            pendingUidsOut.add(uid);
          }
          return this.renderUserChip(uid);
        }).join("");
        const peopleLabel = reaction.count === 1 ? "person" : "people";
        return `
          <div class="rb-row">
            <div class="rb-row-head">
              <span class="rb-emoji-group">
                <span class="rb-emoji">${emojiHtml}</span>
                <span class="rb-emoji-name">:${emojiAttr}:</span>
              </span>
              <span class="rb-count-text"><span class="rb-count">${reaction.count}</span> ${peopleLabel} reacted</span>
            </div>
            <div class="rb-copy-group">
              <button type="button" class="rb-copy-btn" data-kind="mention" data-uids="${uidsForCopy}" data-emoji="${emojiAttr}" title="Copy as Slack @mentions (&lt;@uid&gt;), prefixed with :${emojiAttr}: - pasting into Slack shows real names">\u{1F4CB} Mention</button>
              <button type="button" class="rb-copy-btn" data-kind="names" data-uids="${uidsForCopy}" data-emoji="${emojiAttr}" title="Copy plain-text display names, prefixed with :${emojiAttr}:">\u{1F4CB} Names</button>
              <button type="button" class="rb-copy-btn" data-kind="handles" data-uids="${uidsForCopy}" data-emoji="${emojiAttr}" title="Copy plain-text @handles (real usernames), prefixed with :${emojiAttr}:">\u{1F4CB} Handles</button>
            </div>
            <div class="rb-users">${chipsHtml}</div>
          </div>`;
      }).join("");
    }
    /**
     * @param {number} page
     * @param {number} totalPages
     */
    buildPaginationHtml(page, totalPages) {
      if (totalPages <= 1) return "";
      return `
      <div class="rb-pagination">
        <button type="button" class="rb-page-btn" data-dir="prev" ${page === 0 ? "disabled" : ""}>&larr; Prev</button>
        <span class="rb-page-info">Page ${page + 1}/${totalPages}</span>
        <button type="button" class="rb-page-btn" data-dir="next" ${page >= totalPages - 1 ? "disabled" : ""}>Next &rarr;</button>
      </div>`;
    }
  };

  // src/ui/styles.js
  function buildPopoverStyles(ui) {
    return `
    .rb-toolbar-btn svg {
      width: 20px;
      height: 20px;
      display: block;
    }
    #rb-popover {
      position: absolute;
      display: none;
      flex-direction: column;
      width: clamp(260px, 88vw, 340px);
      max-height: min(70vh, 480px);
      background: var(--sk_primary_background, #ffffff);
      color: var(--sk_foreground_max, #1d1c1d);
      border-radius: 8px;
      box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.18);
      font-family: Slack-Lato, Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 13px;
      z-index: 950;
      overflow: hidden;
    }
    #rb-popover .rb-header {
      font-weight: 700;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--sk_border_default, rgba(29,28,29,0.08));
      flex: 0 0 auto;
    }
    #rb-popover .rb-badge {
      background: var(--sk_highlight_active, #eeeef7);
      color: var(--sk_foreground_low, #616061);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    #rb-popover .rb-header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    #rb-popover .rb-fetch-btn {
      border: 1px solid var(--sk_border_default, rgba(29,28,29,0.13));
      background: var(--sk_primary_background, #ffffff);
      color: var(--sk_foreground_low, #616061);
      border-radius: 12px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    #rb-popover .rb-fetch-btn:hover:not(:disabled) {
      background: var(--sk_highlight_hover, #f8f8f8);
      color: var(--sk_foreground_max, #1d1c1d);
    }
    #rb-popover .rb-fetch-btn:disabled { opacity: 0.6; cursor: default; }
    #rb-popover .rb-fetch-btn.is-error {
      background: #fdeceb;
      color: #c0362c;
      border-color: #c0362c;
    }
    #rb-popover .rb-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: 4px 12px;
    }
    #rb-popover .rb-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 0;
      border-top: 1px solid var(--sk_border_default, rgba(29,28,29,0.08));
    }
    #rb-popover .rb-row:first-of-type { border-top: none; }
    #rb-popover .rb-row-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    #rb-popover .rb-emoji-group {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1 1 auto;
    }
    #rb-popover .rb-emoji { width: 18px; height: 18px; flex: 0 0 auto; }
    #rb-popover .rb-emoji-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--sk_foreground_low, #616061);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    #rb-popover .rb-emoji-fallback {
      display: inline-block;
      background: var(--sk_highlight_active, #eeeef7);
      color: var(--sk_foreground_low, #616061);
      border-radius: 4px;
      padding: 1px 5px;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 140px;
      flex: 0 0 auto;
    }
    #rb-popover .rb-count-text {
      font-size: 12px;
      color: var(--sk_foreground_low, #616061);
      white-space: nowrap;
      flex: 0 0 auto;
      margin-left: auto;
    }
    #rb-popover .rb-count { font-weight: 700; color: var(--sk_foreground_max, #1d1c1d); }
    #rb-popover .rb-copy-group {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 2px 0 4px;
    }
    #rb-popover .rb-copy-btn {
      border: 1px solid var(--sk_border_default, rgba(29,28,29,0.13));
      background: var(--sk_primary_background, #ffffff);
      color: var(--sk_foreground_low, #616061);
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 8px;
      border-radius: 10px;
      flex: 0 0 auto;
      white-space: nowrap;
    }
    #rb-popover .rb-copy-btn:hover {
      background: var(--sk_highlight_hover, #f8f8f8);
      color: var(--sk_foreground_max, #1d1c1d);
    }
    #rb-popover .rb-copy-btn.is-copied {
      background: #e3f6e8;
      color: #17803d;
      border-color: #17803d;
    }
    #rb-popover .rb-users {
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      gap: 4px 8px;
      color: var(--sk_foreground_low, #616061);
      line-height: 1.4;
      max-height: ${ui.maxUsersHeight}px;
      overflow-y: auto;
      padding-right: 2px;
    }
    #rb-popover .rb-user-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: 100%;
    }
    #rb-popover .rb-avatar {
      width: ${ui.avatarSize}px;
      height: ${ui.avatarSize}px;
      border-radius: 50%;
      object-fit: cover;
      flex: 0 0 auto;
    }
    #rb-popover .rb-avatar-placeholder {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--sk_highlight_active, #eeeef7);
      color: var(--sk_foreground_low, #616061);
      font-size: 10px;
      font-weight: 700;
    }
    #rb-popover .rb-username {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }
    #rb-popover .rb-empty { color: var(--sk_foreground_low, #616061); font-style: italic; padding: 4px 0; }
    #rb-popover .rb-pagination {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-top: 1px solid var(--sk_border_default, rgba(29,28,29,0.08));
    }
    #rb-popover .rb-page-btn {
      border: 1px solid var(--sk_border_default, rgba(29,28,29,0.13));
      background: var(--sk_primary_background, #ffffff);
      color: var(--sk_foreground_max, #1d1c1d);
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    #rb-popover .rb-page-btn:hover:not(:disabled) { background: var(--sk_highlight_hover, #f8f8f8); }
    #rb-popover .rb-page-btn:disabled { opacity: 0.4; cursor: default; }
    #rb-popover .rb-page-info { font-size: 11px; color: var(--sk_foreground_low, #616061); }
  `;
  }
  var TOOLBAR_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" data-p4o="true" data-qa="reaction-people" aria-hidden="true"><path fill="currentColor" d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z"></path></svg>';
  var ToolbarInjector = class {
    /**
     * @param {ToolbarConfig} toolbarConfig
     */
    constructor(toolbarConfig) {
      this.toolbarConfig = toolbarConfig;
      this._observer = null;
    }
    start() {
      const injectAll = () => {
        document.querySelectorAll(this.toolbarConfig.messageActions).forEach((container) => {
          if (container.querySelector(".rb-toolbar-btn")) return;
          const group = container.querySelector(this.toolbarConfig.messageActionsGroup) || container;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "c-button-unstyled c-icon_button c-icon_button--size_smedium c-icon_button--default c-message_actions__button rb-toolbar-btn";
          button.setAttribute("aria-label", "Reaction details");
          button.setAttribute("data-qa", "rb-toolbar-btn");
          button.title = "Reaction details";
          button.innerHTML = TOOLBAR_ICON_SVG;
          group.appendChild(button);
        });
      };
      injectAll();
      this._observer = new MutationObserver(injectAll);
      this._observer.observe(document.body, { childList: true, subtree: true });
    }
    stop() {
      this._observer?.disconnect();
      this._observer = null;
    }
  };

  // src/ui/ReactionPanelUI.js
  var ReactionPanelUI = class _ReactionPanelUI {
    /** @type {ReactionPanelUI | null} */
    static instance = null;
    /**
     * @param {object} deps
     * @param {ReactionUserStore} deps.store
     * @param {ActiveUserResolver} deps.activeResolver
     * @param {SlackDom} deps.slackDom
     * @param {AppConfig} deps.config
     */
    constructor({ store, activeResolver, slackDom, config }) {
      this.store = store;
      this.activeResolver = activeResolver;
      this.slackDom = slackDom;
      this.config = config;
      this.copyTextBuilder = new CopyTextBuilder(store);
      this.rowRenderer = new ReactionRowRenderer(store, slackDom, activeResolver);
      this.toolbarInjector = new ToolbarInjector(config.toolbar);
      this.activeMessageEl = null;
      this._activeAnchorEl = null;
      this._unsubscribeUserResolved = null;
      this._pageKey = null;
      this._currentPage = 0;
      addStyle(buildPopoverStyles(config.ui));
      this.toolbarInjector.start();
      this._createPopover();
      this._bindEvents();
      this.store.onEmojiListLoaded(() => {
        if (this.activeMessageEl && this.popoverEl.style.display === "flex") {
          this._openPopoverFor(this.activeMessageEl);
        }
      });
      this.activeResolver.ensureEmojiListLoaded();
      _ReactionPanelUI.instance = this;
    }
    _createPopover() {
      this.popoverEl = document.createElement("div");
      this.popoverEl.id = "rb-popover";
      document.body.appendChild(this.popoverEl);
    }
    _bindEvents() {
      document.body.addEventListener("click", (event) => {
        const target = (
          /** @type {Element} */
          event.target
        );
        const toolbarBtn = target.closest(".rb-toolbar-btn");
        if (toolbarBtn) {
          event.stopPropagation();
          event.preventDefault();
          const messageEl = toolbarBtn.closest(this.config.selectors.messageContainer);
          if (!messageEl) return;
          this.activeMessageEl = messageEl;
          this._activeAnchorEl = toolbarBtn;
          this._openPopoverFor(messageEl);
          return;
        }
        if (!this.popoverEl.contains(target)) {
          this._closePopover();
        }
      });
      this.popoverEl.addEventListener("click", (event) => {
        const target = (
          /** @type {Element} */
          event.target
        );
        const fetchBtn = target.closest(".rb-fetch-btn");
        if (fetchBtn) {
          event.stopPropagation();
          this._handleAutoFetchClick(
            /** @type {HTMLButtonElement} */
            fetchBtn
          );
          return;
        }
        const copyBtn = target.closest(".rb-copy-btn");
        if (copyBtn) {
          event.stopPropagation();
          this._handleCopyClick(
            /** @type {HTMLButtonElement} */
            copyBtn
          );
          return;
        }
        const pageBtn = target.closest(".rb-page-btn");
        if (pageBtn && !pageBtn.disabled && this.activeMessageEl) {
          event.stopPropagation();
          this._currentPage += pageBtn.getAttribute("data-dir") === "next" ? 1 : -1;
          this._openPopoverFor(this.activeMessageEl);
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") this._closePopover();
      });
    }
    _closePopover() {
      this.popoverEl.style.display = "none";
      this._teardownAutoRefresh();
    }
    /**
     * @param {HTMLButtonElement} btnEl
     */
    async _handleCopyClick(btnEl) {
      const kind = (
        /** @type {'mention' | 'names' | 'handles'} */
        btnEl.dataset.kind || "mention"
      );
      const emojiName = btnEl.dataset.emoji || "";
      const uidsCsv = btnEl.dataset.uids || "";
      const text = this.copyTextBuilder.build(kind, uidsCsv, emojiName);
      if (!text) return;
      const ok = await copyToClipboard(text);
      const originalLabel = btnEl.textContent;
      btnEl.textContent = ok ? "\u2705 Copied" : "\u26A0\uFE0F Copy failed";
      btnEl.classList.toggle("is-copied", ok);
      window.clearTimeout(btnEl._rbCopyResetTimer);
      btnEl._rbCopyResetTimer = window.setTimeout(() => {
        btnEl.textContent = originalLabel;
        btnEl.classList.remove("is-copied");
      }, 1200);
    }
    /**
     * @param {HTMLButtonElement} btnEl
     */
    async _handleAutoFetchClick(btnEl) {
      if (!this.activeMessageEl) return;
      const channelId = this.popoverEl.dataset.channel;
      const ts = this.popoverEl.dataset.ts;
      if (!channelId || !ts) return;
      const originalLabel = btnEl.textContent;
      btnEl.disabled = true;
      btnEl.classList.remove("is-error");
      btnEl.textContent = "\u23F3 Fetching...";
      const result = await this.activeResolver.fetchReactionsFor(channelId, ts);
      if (result.ok) {
        if (this.activeMessageEl) this._openPopoverFor(this.activeMessageEl);
        return;
      }
      btnEl.textContent = "\u26A0\uFE0F Fetch failed";
      btnEl.classList.add("is-error");
      window.clearTimeout(btnEl._rbFetchResetTimer);
      btnEl._rbFetchResetTimer = window.setTimeout(() => {
        btnEl.textContent = originalLabel;
        btnEl.classList.remove("is-error");
        btnEl.disabled = false;
      }, 1500);
    }
    /**
     * @param {string} channelId
     * @param {string} ts
     * @param {import('../types.js').ReactionEntry[]} reactions
     */
    _paginateReactions(channelId, ts, reactions) {
      const key = `${channelId}:${ts}`;
      if (key !== this._pageKey) {
        this._pageKey = key;
        this._currentPage = 0;
      }
      const perPage = this.config.ui.maxRowsPerPage;
      const totalPages = Math.max(1, Math.ceil(reactions.length / perPage));
      this._currentPage = Math.min(this._currentPage, totalPages - 1);
      const start = this._currentPage * perPage;
      return {
        pageReactions: reactions.slice(start, start + perPage),
        page: this._currentPage,
        totalPages
      };
    }
    /**
     * @param {Element} messageEl
     */
    _openPopoverFor(messageEl) {
      const channelId = this.slackDom.getActiveChannelId();
      const ts = this.slackDom.getMessageTs(messageEl);
      if (!ts) return;
      this._teardownAutoRefresh();
      const memberCount = this.store.getChannelMemberCount(channelId ?? "");
      const cached = this.store.getMessageReactions(channelId ?? "", ts);
      const uniqueReactors = cached ? new Set(cached.reactions.flatMap((reaction) => reaction.users)).size : 0;
      const badgeHtml = memberCount ? `<span class="rb-badge">${uniqueReactors}/${memberCount} members reacted</span>` : "";
      const pendingUids = /* @__PURE__ */ new Set();
      let bodyHtml = '<div class="rb-empty">No reaction data yet for this message (try scrolling to let Slack load it).</div>';
      let paginationHtml = "";
      if (cached && cached.reactions.length > 0) {
        const { pageReactions, page, totalPages } = this._paginateReactions(
          channelId ?? "",
          ts,
          cached.reactions
        );
        bodyHtml = this.rowRenderer.buildRowsHtml(pageReactions, pendingUids);
        paginationHtml = this.rowRenderer.buildPaginationHtml(page, totalPages);
      }
      this.popoverEl.innerHTML = `
      <div class="rb-header">
        <span>Reaction details</span>
        <div class="rb-header-actions">
          ${badgeHtml}
          <button type="button" class="rb-fetch-btn" data-qa="rb-fetch-btn" title="Fetch the complete, authoritative reactor list directly from Slack (reactions.get) instead of relying on cached/passive data">\u{1F504} Fetch data</button>
        </div>
      </div>
      <div class="rb-body">${bodyHtml}</div>
      ${paginationHtml}
    `;
      this.popoverEl.dataset.channel = channelId ?? "";
      this.popoverEl.dataset.ts = ts;
      const anchorRect = (this._activeAnchorEl || messageEl).getBoundingClientRect();
      this.popoverEl.style.display = "flex";
      this.popoverEl.style.top = `${window.scrollY + anchorRect.bottom + 6}px`;
      const desiredLeft = window.scrollX + anchorRect.right - 300;
      this.popoverEl.style.left = `${Math.max(window.scrollX + 8, desiredLeft)}px`;
      this._setupAutoRefresh(pendingUids, messageEl);
    }
    /**
     * @param {Set<string>} pendingUids
     * @param {Element} messageEl
     */
    _setupAutoRefresh(pendingUids, messageEl) {
      if (pendingUids.size === 0) return;
      pendingUids.forEach((uid) => this.activeResolver.requestResolve(uid));
      this._unsubscribeUserResolved = this.store.onUserResolved((resolvedUid) => {
        if (!pendingUids.has(resolvedUid)) return;
        if (this.popoverEl.style.display !== "flex") return;
        if (this.activeMessageEl !== messageEl) return;
        this._openPopoverFor(messageEl);
      });
    }
    _teardownAutoRefresh() {
      if (this._unsubscribeUserResolved) {
        this._unsubscribeUserResolved();
        this._unsubscribeUserResolved = null;
      }
    }
    /**
     * @param {string} channelId
     * @param {string} ts
     */
    refreshIfOpen(channelId, ts) {
      if (this.popoverEl.style.display === "flex" && this.popoverEl.dataset.channel === channelId && this.popoverEl.dataset.ts === ts && this.activeMessageEl) {
        this._openPopoverFor(this.activeMessageEl);
      }
    }
  };

  // src/bootstrap.js
  function bootstrap() {
    "use strict";
    const events = new EventBus();
    const store = new ReactionUserStore(events);
    const slackDom = createSlackDom(CONFIG);
    const tokenProvider = new SlackTokenProvider(SlackContext.getActiveTeamId);
    const activeResolver = new ActiveUserResolver(store, tokenProvider, CONFIG.activeFallback);
    new NetworkInterceptor({
      store,
      tokenProvider,
      config: CONFIG,
      slackDom,
      onReactionEvent: (channelId, ts) => {
        ReactionPanelUI.instance?.refreshIfOpen(channelId, ts);
      }
    });
    onDomReady(() => {
      new ReactionPanelUI({
        store,
        activeResolver,
        slackDom,
        config: CONFIG
      });
    });
  }

  // src/index.js
  bootstrap();
})();
