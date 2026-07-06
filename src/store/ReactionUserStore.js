import { EventBus, StoreEvents } from '../utils/event-bus.js';

/** @typedef {import('../types.js').ReactionEntry} ReactionEntry */
/** @typedef {import('../types.js').MessageReactionsSnapshot} MessageReactionsSnapshot */
/** @typedef {import('../types.js').SlackUser} SlackUser */

export class ReactionUserStore {
  /**
   * @param {EventBus} [events]
   */
  constructor(events = new EventBus()) {
    this.events = events;
    /** @type {Map<string, MessageReactionsSnapshot>} */
    this.messageReactions = new Map();
    /** @type {Map<string, SlackUser>} */
    this.userDirectory = new Map();
    /** @type {Map<string, Set<string>>} */
    this.channelMembers = new Map();
    /** @type {Map<string, string>} */
    this.emojiIconCache = new Map();
    /** @type {Map<string, string>} */
    this.emojiUrlMap = new Map();
  }

  /**
   * @param {string} channelId
   * @param {string} ts
   * @returns {string}
   */
  static keyFor(channelId, ts) {
    return `${channelId}::${ts}`;
  }

  /**
   * @param {string} channelId
   * @param {string} ts
   * @param {ReactionEntry[]} reactions
   */
  upsertMessageReactions(channelId, ts, reactions) {
    if (!ts) return;
    const key = ReactionUserStore.keyFor(channelId, ts);
    this.messageReactions.set(key, {
      reactions: (reactions || []).map((reaction) => ({
        name: reaction.name,
        count: reaction.count,
        users: reaction.users || [],
      })),
      updatedAt: Date.now(),
    });
  }

  /**
   * @param {string} channelId
   * @param {string} ts
   * @returns {MessageReactionsSnapshot | undefined}
   */
  getMessageReactions(channelId, ts) {
    return this.messageReactions.get(ReactionUserStore.keyFor(channelId, ts));
  }

  /**
   * @param {Array<{ id?: string; name?: string; real_name?: string; profile?: { real_name?: string; image_24?: string; image_original?: string; image_32?: string } }>} users
   */
  upsertUsers(users) {
    (users || []).forEach((user) => {
      if (!user?.id) return;
      const isNewOrChanged = !this.userDirectory.has(user.id);
      this.userDirectory.set(user.id, {
        id: user.id,
        name: user.name ?? user.id,
        real_name: user.profile?.real_name || user.real_name || user.name || user.id,
        image:
          user.profile?.image_24 ||
          user.profile?.image_original ||
          user.profile?.image_32 ||
          null,
      });
      if (isNewOrChanged) {
        this.events.emit(StoreEvents.USER_RESOLVED, user.id);
      }
    });
  }

  /**
   * @param {string} channelId
   * @param {string[]} memberIds
   */
  upsertChannelMembers(channelId, memberIds) {
    if (!channelId) return;
    const members = this.channelMembers.get(channelId) ?? new Set();
    (memberIds || []).forEach((id) => members.add(id));
    this.channelMembers.set(channelId, members);
  }

  /**
   * @param {string} userId
   * @returns {string | null}
   */
  resolveUserLabel(userId) {
    const user = this.userDirectory.get(userId);
    if (!user) return null;
    return user.real_name || user.name || userId;
  }

  /**
   * @param {string} channelId
   * @returns {number | null}
   */
  getChannelMemberCount(channelId) {
    const members = this.channelMembers.get(channelId);
    return members ? members.size : null;
  }

  /**
   * @param {string} name
   * @param {string} html
   */
  cacheEmojiHtml(name, html) {
    if (!name || !html) return;
    if (!this.emojiIconCache.has(name)) {
      this.emojiIconCache.set(name, html);
    }
  }

  /**
   * @param {string} name
   * @returns {string | null}
   */
  getEmojiHtml(name) {
    return this.emojiIconCache.get(name) ?? null;
  }

  /**
   * @param {Record<string, string>} emojiObj
   */
  upsertEmojiMap(emojiObj) {
    if (!emojiObj || typeof emojiObj !== 'object') return;
    let added = false;
    Object.keys(emojiObj).forEach((name) => {
      if (!this.emojiUrlMap.has(name)) added = true;
      this.emojiUrlMap.set(name, emojiObj[name]);
    });
    if (added) {
      this.events.emit(StoreEvents.EMOJI_LIST_LOADED);
    }
  }

  /**
   * @param {string} name
   * @returns {string | null}
   */
  getEmojiUrl(name) {
    let value = this.emojiUrlMap.get(name);
    let depth = 0;
    while (value?.startsWith('alias:') && depth < 5) {
      value = this.emojiUrlMap.get(value.slice('alias:'.length));
      depth += 1;
    }
    return value && !value.startsWith('alias:') ? value : null;
  }

  /**
   * @param {(userId: string) => void} listener
   * @returns {() => void}
   */
  onUserResolved(listener) {
    return this.events.on(StoreEvents.USER_RESOLVED, (payload) => {
      listener(/** @type {string} */ (payload));
    });
  }

  /**
   * @param {() => void} listener
   * @returns {() => void}
   */
  onEmojiListLoaded(listener) {
    return this.events.on(StoreEvents.EMOJI_LIST_LOADED, () => listener());
  }

  /**
   * @param {{ type?: string; reaction?: string; user?: string; item?: { channel?: string; ts?: string } }} event
   */
  applyReactionEvent(event) {
    const channelId = event.item?.channel;
    const ts = event.item?.ts;
    if (!channelId || !ts) return;

    const key = ReactionUserStore.keyFor(channelId, ts);
    const current = this.messageReactions.get(key) ?? { reactions: [], updatedAt: 0 };
    const index = current.reactions.findIndex((reaction) => reaction.name === event.reaction);

    if (event.type === 'reaction_added') {
      if (index === -1) {
        current.reactions.push({
          name: event.reaction ?? '',
          count: 1,
          users: [event.user ?? ''],
        });
      } else {
        const reaction = current.reactions[index];
        if (event.user && !reaction.users.includes(event.user)) {
          reaction.users.push(event.user);
        }
        reaction.count = reaction.users.length;
      }
    } else if (event.type === 'reaction_removed' && index !== -1) {
      const reaction = current.reactions[index];
      reaction.users = reaction.users.filter((uid) => uid !== event.user);
      reaction.count = reaction.users.length;
      if (reaction.count <= 0) {
        current.reactions.splice(index, 1);
      }
    }

    current.updatedAt = Date.now();
    this.messageReactions.set(key, current);
  }
}
