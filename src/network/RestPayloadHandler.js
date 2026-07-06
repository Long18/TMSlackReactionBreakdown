/** @typedef {import('../store/ReactionUserStore.js').ReactionUserStore} ReactionUserStore */
/** @typedef {import('../slack/SlackDom.js').SlackDom} SlackDom */

/**
 * Parses intercepted Slack REST payloads and updates the store.
 * Single responsibility: map API JSON shapes → store mutations.
 */
export class RestPayloadHandler {
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
        const msg = /** @type {{ ts?: string; reactions?: import('../types.js').ReactionEntry[] }} */ (
          message
        );
        if (msg.reactions) {
          this.store.upsertMessageReactions(channelId, msg.ts ?? '', msg.reactions);
        }
      });
    }

    if (json.message && typeof json.message === 'object') {
      const message = /** @type {{ ts?: string; reactions?: import('../types.js').ReactionEntry[] }} */ (
        json.message
      );
      if (message.reactions) {
        this.store.upsertMessageReactions(channelId, message.ts ?? '', message.reactions);
      }
    }

    if (Array.isArray(json.items)) {
      json.items.forEach((item) => {
        const entry = /** @type {{ channel?: string; message?: { ts?: string; reactions?: import('../types.js').ReactionEntry[] } }} */ (
          item
        );
        if (entry.message?.reactions) {
          this.store.upsertMessageReactions(
            entry.channel || channelId,
            entry.message.ts ?? '',
            entry.message.reactions,
          );
        }
      });
    }

    if (json.messages && typeof json.messages === 'object') {
      const messages = /** @type {{ matches?: Array<{ ts?: string; reactions?: import('../types.js').ReactionEntry[]; channel?: { id?: string } }> }} */ (
        json.messages
      );
      messages.matches?.forEach((match) => {
        if (match.reactions) {
          this.store.upsertMessageReactions(match.channel?.id || channelId, match.ts ?? '', match.reactions);
        }
      });
    }

    if (json.emoji && typeof json.emoji === 'object') {
      this.store.upsertEmojiMap(/** @type {Record<string, string>} */ (json.emoji));
    }

    if (json.user) {
      this.store.upsertUsers([/** @type {object} */ (json.user)]);
    }

    if (Array.isArray(json.users)) {
      this.store.upsertUsers(/** @type {object[]} */ (json.users));
    }

    if (Array.isArray(json.members)) {
      if (json.members[0] && typeof json.members[0] === 'object') {
        this.store.upsertUsers(/** @type {object[]} */ (json.members));
      } else {
        this.store.upsertChannelMembers(channelId, /** @type {string[]} */ (json.members));
      }
    }
  }

  /**
   * @param {string} url
   * @param {Record<string, unknown>} json
   * @returns {string}
   */
  _extractChannelId(url, json) {
    if (typeof json.channel === 'string') return json.channel;
    if (json.channel && typeof json.channel === 'object' && 'id' in json.channel) {
      return String(/** @type {{ id?: string }} */ (json.channel).id);
    }

    const match = url.match(/channel=([A-Z0-9]+)/);
    return match ? match[1] : this.slackDom.getActiveChannelId() ?? '';
  }
}
