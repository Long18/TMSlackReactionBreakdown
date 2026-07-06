import { getUnsafeWindow } from '../platform/window.js';

/** Reads the Slack session token from globals, storage, or intercepted requests. */
export class SlackTokenProvider {
  /**
   * @param {() => string | null} getActiveTeamId
   */
  constructor(getActiveTeamId) {
    this.getActiveTeamId = getActiveTeamId;
    this.win = getUnsafeWindow();
    /** @type {string | null} */
    this.token = null;
  }

  /** @returns {string | null} */
  _extractFromGlobals() {
    try {
      const { win } = this;
      if (win.boot_data?.api_token) return win.boot_data.api_token;
      if (win.TS?.boot_data?.api_token) return win.TS.boot_data.api_token;
    } catch {
      // cross-origin or restricted access
    }
    return null;
  }

  /** @returns {string | null} */
  _extractFromLocalStorage() {
    try {
      const raw = this.win.localStorage.getItem('localConfig_v2');
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const teams = parsed?.teams ?? {};
      const activeTeamId = this.getActiveTeamId();
      if (activeTeamId && teams[activeTeamId]?.token) {
        return teams[activeTeamId].token;
      }

      const firstWithToken = Object.values(teams).find(
        (team) => team && typeof team === 'object' && 'token' in team && team.token,
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

      if (typeof body === 'string' && body.includes('token=')) {
        const match = body.match(/token=(xoxc-[^&]+)/);
        if (match) return decodeURIComponent(match[1]);
      }

      if (typeof FormData !== 'undefined' && body instanceof FormData && body.has('token')) {
        return String(body.get('token'));
      }

      if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams && body.has('token')) {
        return body.get('token');
      }
    } catch {
      // ignore malformed bodies
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
}
