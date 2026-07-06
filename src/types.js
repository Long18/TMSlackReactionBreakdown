/**
 * @typedef {Object} ActiveFallbackConfig
 * @property {boolean} enabled
 * @property {number} batchDelayMs
 * @property {number} maxBatchSize
 * @property {number} retryCooldownMs
 */

/**
 * @typedef {Object} SelectorsConfig
 * @property {string} messageContainer
 * @property {string} messageList
 * @property {string} reactionPill
 * @property {string} reactionEmoji
 * @property {string} timestampAttr
 */

/**
 * @typedef {Object} ToolbarConfig
 * @property {string} messageActions
 * @property {string} messageActionsGroup
 */

/**
 * @typedef {Object} UiConfig
 * @property {number} avatarSize
 * @property {number} maxRowsPerPage
 * @property {number} maxUsersHeight
 */

/**
 * @typedef {Object} AppConfig
 * @property {ActiveFallbackConfig} activeFallback
 * @property {RegExp[]} watchedRestPatterns
 * @property {SelectorsConfig} selectors
 * @property {ToolbarConfig} toolbar
 * @property {UiConfig} ui
 */

/**
 * @typedef {Object} SlackUser
 * @property {string} id
 * @property {string} name
 * @property {string} real_name
 * @property {string | null} image
 */

/**
 * @typedef {Object} ReactionEntry
 * @property {string} name
 * @property {number} count
 * @property {string[]} users
 */

/**
 * @typedef {Object} MessageReactionsSnapshot
 * @property {ReactionEntry[]} reactions
 * @property {number} updatedAt
 */

/**
 * @typedef {Object} ApiResult
 * @property {boolean} ok
 * @property {string} [error]
 */

export {};
