import { SlackApiClient } from './SlackApiClient.js';

/** @typedef {import('../types.js').ActiveFallbackConfig} ActiveFallbackConfig */
/** @typedef {import('../types.js').ApiResult} ApiResult */
/** @typedef {import('../store/ReactionUserStore.js').ReactionUserStore} ReactionUserStore */
/** @typedef {import('../auth/SlackTokenProvider.js').SlackTokenProvider} SlackTokenProvider */

/** Batches users.info / emoji.list / reactions.get on demand. */
export class ActiveUserResolver {
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
    /** @type {Set<string>} */
    this.pending = new Set();
    /** @type {Map<string, number>} */
    this.attempted = new Map();
    /** @type {string[]} */
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
    if (json?.ok && json.emoji && typeof json.emoji === 'object') {
      this.store.upsertEmojiMap(/** @type {Record<string, string>} */ (json.emoji));
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
        this.store.upsertUsers([/** @type {object} */ (json.user)]);
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
    if (!this.config.enabled) return { ok: false, error: 'disabled' };
    if (!channelId || !ts) return { ok: false, error: 'missing-channel-or-ts' };

    const token = this.tokenProvider.getToken();
    if (!token) return { ok: false, error: 'no-token' };

    const json = await this.api.fetchReactions(token, channelId, ts);
    if (json?.ok && json.message && typeof json.message === 'object') {
      const message = /** @type {{ ts?: string; reactions?: import('../types.js').ReactionEntry[] }} */ (
        json.message
      );
      this.store.upsertMessageReactions(channelId, message.ts || ts, message.reactions || []);
      return { ok: true };
    }

    return { ok: false, error: (json?.error && String(json.error)) || 'unknown' };
  }
}
