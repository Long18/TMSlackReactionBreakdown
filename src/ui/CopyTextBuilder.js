/** @typedef {import('../store/ReactionUserStore.js').ReactionUserStore} ReactionUserStore */

/** Builds copy-to-clipboard text for mentions, names, and handles. */
export class CopyTextBuilder {
  /**
   * @param {ReactionUserStore} store
   */
  constructor(store) {
    this.store = store;
  }

  /**
   * @param {string} uidsCsv
   * @param {string} emojiName
   */
  buildMentionText(uidsCsv, emojiName) {
    const mentions = (uidsCsv || '')
      .split(',')
      .filter(Boolean)
      .map((uid) => `<@${uid}>`)
      .join(' ');

    if (!mentions) return '';
    return emojiName ? `:${emojiName}: ${mentions}` : mentions;
  }

  /**
   * @param {string} uidsCsv
   * @param {string} emojiName
   */
  buildNamesText(uidsCsv, emojiName) {
    const names = (uidsCsv || '')
      .split(',')
      .filter(Boolean)
      .map((uid) => this.store.resolveUserLabel(uid) || `(loading: ${uid})`);

    if (names.length === 0) return '';
    const prefix = emojiName ? `:${emojiName}: ` : '';
    return `${prefix}${names.join(', ')}`;
  }

  /**
   * @param {string} uidsCsv
   * @param {string} emojiName
   */
  buildHandlesText(uidsCsv, emojiName) {
    const handles = (uidsCsv || '')
      .split(',')
      .filter(Boolean)
      .map((uid) => {
        const user = this.store.userDirectory.get(uid);
        const handle = user?.name || this.store.resolveUserLabel(uid) || uid;
        return `@${handle}`;
      });

    if (handles.length === 0) return '';
    const prefix = emojiName ? `:${emojiName}: ` : '';
    return `${prefix}${handles.join(', ')}`;
  }

  /**
   * @param {'mention' | 'names' | 'handles'} kind
   * @param {string} uidsCsv
   * @param {string} emojiName
   */
  build(kind, uidsCsv, emojiName) {
    switch (kind) {
      case 'names':
        return this.buildNamesText(uidsCsv, emojiName);
      case 'handles':
        return this.buildHandlesText(uidsCsv, emojiName);
      case 'mention':
        return this.buildMentionText(uidsCsv, emojiName);
      default: {
        const _exhaustive = kind;
        void _exhaustive;
        return '';
      }
    }
  }
}
