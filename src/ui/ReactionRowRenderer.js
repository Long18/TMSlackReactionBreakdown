import { escapeHtml } from '../utils/html.js';

/** @typedef {import('../types.js').ReactionEntry} ReactionEntry */
/** @typedef {import('../store/ReactionUserStore.js').ReactionUserStore} ReactionUserStore */
/** @typedef {import('../slack/SlackDom.js').SlackDom} SlackDom */
/** @typedef {import('../api/ActiveUserResolver.js').ActiveUserResolver} ActiveUserResolver */

/**
 * @param {string} name
 */
export function formatFallbackEmojiName(name) {
  const base = String(name || '')
    .split('::')[0]
    .replace(/_/g, ' ')
    .trim();
  return base || name;
}

/** Renders reaction rows (emoji, copy buttons, user chips). */
export class ReactionRowRenderer {
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
      (label.replace(/[()]/g, '').trim().charAt(0) || '?').toUpperCase(),
    );
    const avatarHtml =
      user?.image
        ? `<img class="rb-avatar" src="${user.image}" alt="" />`
        : `<span class="rb-avatar rb-avatar-placeholder">${initial}</span>`;

    return `<span class="rb-user-chip" data-uid="${uid}">${avatarHtml}<span class="rb-username">${safeLabel}</span></span>`;
  }

  /**
   * @param {ReactionEntry[]} reactions
   * @param {Set<string>} [pendingUidsOut]
   */
  buildRowsHtml(reactions, pendingUidsOut) {
    this.prewarmEmojiCache();

    return reactions
      .map((reaction) => {
        const rawEmojiName = String(reaction.name || '').split('::')[0];
        const emojiAttr = escapeHtml(rawEmojiName);
        const emojiUrl = this.store.getEmojiUrl(rawEmojiName);
        const cachedHtml = this.store.getEmojiHtml(reaction.name);
        const emojiHtml = emojiUrl
          ? `<img class="rb-emoji" src="${escapeHtml(emojiUrl)}" alt=":${emojiAttr}:" title=":${emojiAttr}:" />`
          : cachedHtml ||
            `<span class="rb-emoji-fallback">:${escapeHtml(formatFallbackEmojiName(reaction.name))}:</span>`;

        const uidsForCopy = reaction.users.join(',');

        const chipsHtml = reaction.users
          .map((uid) => {
            if (!this.store.userDirectory.has(uid) && pendingUidsOut) {
              pendingUidsOut.add(uid);
            }
            return this.renderUserChip(uid);
          })
          .join('');

        const peopleLabel = reaction.count === 1 ? 'person' : 'people';

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
      })
      .join('');
  }

  /**
   * @param {number} page
   * @param {number} totalPages
   */
  buildPaginationHtml(page, totalPages) {
    if (totalPages <= 1) return '';

    return `
      <div class="rb-pagination">
        <button type="button" class="rb-page-btn" data-dir="prev" ${page === 0 ? 'disabled' : ''}>&larr; Prev</button>
        <span class="rb-page-info">Page ${page + 1}/${totalPages}</span>
        <button type="button" class="rb-page-btn" data-dir="next" ${page >= totalPages - 1 ? 'disabled' : ''}>Next &rarr;</button>
      </div>`;
  }
}
