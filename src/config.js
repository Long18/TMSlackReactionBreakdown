/** @typedef {import('./types.js').AppConfig} AppConfig */

/** @type {AppConfig} */
export const CONFIG = {
  activeFallback: {
    enabled: true,
    batchDelayMs: 250,
    maxBatchSize: 8,
    retryCooldownMs: 60_000,
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
    /edgeapi\.slack\.com\/cache\//,
  ],
  selectors: {
    messageContainer: '[data-qa="message_container"], [data-qa="virtual-list-item"]',
    messageList: '[data-qa="slack_kit_list"], [data-qa="message_pane"]',
    reactionPill: '[data-qa="reaction"]',
    reactionEmoji:
      '[data-qa="emoji"], img.c-emoji, span.c-emoji, img[data-stringify-type="emoji"], [data-stringify-emoji]',
    timestampAttr: 'data-ts',
  },
  toolbar: {
    messageActions: '[data-qa="message-actions"]',
    messageActionsGroup: '.c-message_actions__group',
  },
  ui: {
    avatarSize: 18,
    maxRowsPerPage: 3,
    maxUsersHeight: 110,
  },
};
