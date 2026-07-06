import { addStyle } from '../utils/styles.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { CopyTextBuilder } from './CopyTextBuilder.js';
import { ReactionRowRenderer } from './ReactionRowRenderer.js';
import { ToolbarInjector, buildPopoverStyles } from './styles.js';

/** @typedef {import('../types.js').AppConfig} AppConfig */
/** @typedef {import('../store/ReactionUserStore.js').ReactionUserStore} ReactionUserStore */
/** @typedef {import('../api/ActiveUserResolver.js').ActiveUserResolver} ActiveUserResolver */
/** @typedef {import('../slack/SlackDom.js').SlackDom} SlackDom */

export class ReactionPanelUI {
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

    /** @type {Element | null} */
    this.activeMessageEl = null;
    /** @type {Element | null} */
    this._activeAnchorEl = null;
    /** @type {(() => void) | null} */
    this._unsubscribeUserResolved = null;
    /** @type {string | null} */
    this._pageKey = null;
    this._currentPage = 0;

    addStyle(buildPopoverStyles(config.ui));
    this.toolbarInjector.start();
    this._createPopover();
    this._bindEvents();

    this.store.onEmojiListLoaded(() => {
      if (this.activeMessageEl && this.popoverEl.style.display === 'flex') {
        this._openPopoverFor(this.activeMessageEl);
      }
    });

    this.activeResolver.ensureEmojiListLoaded();
    ReactionPanelUI.instance = this;
  }

  _createPopover() {
    this.popoverEl = document.createElement('div');
    this.popoverEl.id = 'rb-popover';
    document.body.appendChild(this.popoverEl);
  }

  _bindEvents() {
    document.body.addEventListener('click', (event) => {
      const target = /** @type {Element} */ (event.target);
      const toolbarBtn = target.closest('.rb-toolbar-btn');
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

    this.popoverEl.addEventListener('click', (event) => {
      const target = /** @type {Element} */ (event.target);

      const fetchBtn = target.closest('.rb-fetch-btn');
      if (fetchBtn) {
        event.stopPropagation();
        this._handleAutoFetchClick(/** @type {HTMLButtonElement} */ (fetchBtn));
        return;
      }

      const copyBtn = target.closest('.rb-copy-btn');
      if (copyBtn) {
        event.stopPropagation();
        this._handleCopyClick(/** @type {HTMLButtonElement} */ (copyBtn));
        return;
      }

      const pageBtn = target.closest('.rb-page-btn');
      if (pageBtn && !pageBtn.disabled && this.activeMessageEl) {
        event.stopPropagation();
        this._currentPage += pageBtn.getAttribute('data-dir') === 'next' ? 1 : -1;
        this._openPopoverFor(this.activeMessageEl);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') this._closePopover();
    });
  }

  _closePopover() {
    this.popoverEl.style.display = 'none';
    this._teardownAutoRefresh();
  }

  /**
   * @param {HTMLButtonElement} btnEl
   */
  async _handleCopyClick(btnEl) {
    const kind = /** @type {'mention' | 'names' | 'handles'} */ (btnEl.dataset.kind || 'mention');
    const emojiName = btnEl.dataset.emoji || '';
    const uidsCsv = btnEl.dataset.uids || '';

    const text = this.copyTextBuilder.build(kind, uidsCsv, emojiName);
    if (!text) return;

    const ok = await copyToClipboard(text);
    const originalLabel = btnEl.textContent;
    btnEl.textContent = ok ? '\u2705 Copied' : '\u26A0\uFE0F Copy failed';
    btnEl.classList.toggle('is-copied', ok);

    window.clearTimeout(btnEl._rbCopyResetTimer);
    btnEl._rbCopyResetTimer = window.setTimeout(() => {
      btnEl.textContent = originalLabel;
      btnEl.classList.remove('is-copied');
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
    btnEl.classList.remove('is-error');
    btnEl.textContent = '\u23F3 Fetching...';

    const result = await this.activeResolver.fetchReactionsFor(channelId, ts);

    if (result.ok) {
      if (this.activeMessageEl) this._openPopoverFor(this.activeMessageEl);
      return;
    }

    btnEl.textContent = '\u26A0\uFE0F Fetch failed';
    btnEl.classList.add('is-error');
    window.clearTimeout(btnEl._rbFetchResetTimer);
    btnEl._rbFetchResetTimer = window.setTimeout(() => {
      btnEl.textContent = originalLabel;
      btnEl.classList.remove('is-error');
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
      totalPages,
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

    const memberCount = this.store.getChannelMemberCount(channelId ?? '');
    const cached = this.store.getMessageReactions(channelId ?? '', ts);
    const uniqueReactors = cached
      ? new Set(cached.reactions.flatMap((reaction) => reaction.users)).size
      : 0;

    const badgeHtml = memberCount
      ? `<span class="rb-badge">${uniqueReactors}/${memberCount} members reacted</span>`
      : '';

    const pendingUids = new Set();
    let bodyHtml =
      '<div class="rb-empty">No reaction data yet for this message (try scrolling to let Slack load it).</div>';
    let paginationHtml = '';

    if (cached && cached.reactions.length > 0) {
      const { pageReactions, page, totalPages } = this._paginateReactions(
        channelId ?? '',
        ts,
        cached.reactions,
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

    this.popoverEl.dataset.channel = channelId ?? '';
    this.popoverEl.dataset.ts = ts;

    const anchorRect = (this._activeAnchorEl || messageEl).getBoundingClientRect();
    this.popoverEl.style.display = 'flex';
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
      if (this.popoverEl.style.display !== 'flex') return;
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
    if (
      this.popoverEl.style.display === 'flex' &&
      this.popoverEl.dataset.channel === channelId &&
      this.popoverEl.dataset.ts === ts &&
      this.activeMessageEl
    ) {
      this._openPopoverFor(this.activeMessageEl);
    }
  }
}
