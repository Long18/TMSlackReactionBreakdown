import { getUnsafeWindow } from '../platform/window.js';

/** Low-level Slack REST calls using the current web session. */
export class SlackApiClient {
  constructor() {
    this.win = getUnsafeWindow();
  }

  /**
   * @param {string} token
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async fetchEmojiList(token) {
    return this._post('/api/emoji.list', { token });
  }

  /**
   * @param {string} token
   * @param {string} userId
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async fetchUserInfo(token, userId) {
    return this._post('/api/users.info', { token, user: userId });
  }

  /**
   * @param {string} token
   * @param {string} channelId
   * @param {string} ts
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async fetchReactions(token, channelId, ts) {
    return this._post('/api/reactions.get', {
      token,
      channel: channelId,
      timestamp: ts,
      full: 'true',
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
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return await response.json();
    } catch {
      return null;
    }
  }
}
