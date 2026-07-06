/** @typedef {import('../types.js').UiConfig} UiConfig */

/**
 * @param {UiConfig} ui
 * @returns {string}
 */
export function buildPopoverStyles(ui) {
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

const TOOLBAR_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" data-p4o="true" data-qa="reaction-people" aria-hidden="true">' +
  '<path fill="currentColor" d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z"></path>' +
  '</svg>';

/** @typedef {import('../types.js').ToolbarConfig} ToolbarConfig */

/** Injects the reaction-details button into Slack's native message toolbar. */
export class ToolbarInjector {
  /**
   * @param {ToolbarConfig} toolbarConfig
   */
  constructor(toolbarConfig) {
    this.toolbarConfig = toolbarConfig;
    /** @type {MutationObserver | null} */
    this._observer = null;
  }

  start() {
    const injectAll = () => {
      document.querySelectorAll(this.toolbarConfig.messageActions).forEach((container) => {
        if (container.querySelector('.rb-toolbar-btn')) return;

        const group =
          container.querySelector(this.toolbarConfig.messageActionsGroup) || container;
        const button = document.createElement('button');
        button.type = 'button';
        button.className =
          'c-button-unstyled c-icon_button c-icon_button--size_smedium c-icon_button--default c-message_actions__button rb-toolbar-btn';
        button.setAttribute('aria-label', 'Reaction details');
        button.setAttribute('data-qa', 'rb-toolbar-btn');
        button.title = 'Reaction details';
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
}

export { TOOLBAR_ICON_SVG };
