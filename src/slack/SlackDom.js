import { SlackContext } from './SlackContext.js';

/** @typedef {import('../types.js').AppConfig} AppConfig */

/**
 * @param {AppConfig} config
 */
export function createSlackDom(config) {
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

      const raw =
        emojiNode.getAttribute('data-stringify-emoji') ||
        emojiNode.getAttribute('alt') ||
        emojiNode.getAttribute('aria-label') ||
        emojiNode.getAttribute('title') ||
        '';

      const stripped = raw.trim().replace(/^:/, '').replace(/:$/, '');
      if (!stripped || /\s/.test(stripped)) return null;
      return stripped;
    },
  };
}

/** @typedef {ReturnType<typeof createSlackDom>} SlackDom */
