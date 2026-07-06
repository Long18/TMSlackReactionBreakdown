/** Simple pub/sub for decoupled notifications (store → UI). */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<(payload: unknown) => void>>} */
    this._listeners = new Map();
  }

  /**
   * @param {string} event
   * @param {(payload: unknown) => void} listener
   * @returns {() => void}
   */
  on(event, listener) {
    const set = this._listeners.get(event) ?? new Set();
    set.add(listener);
    this._listeners.set(event, set);
    return () => set.delete(listener);
  }

  /**
   * @param {string} event
   * @param {unknown} [payload]
   */
  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set) return;
    set.forEach((listener) => {
      try {
        listener(payload);
      } catch {
        // listener errors must not break publishers
      }
    });
  }
}

export const StoreEvents = {
  USER_RESOLVED: 'user:resolved',
  EMOJI_LIST_LOADED: 'emoji:list-loaded',
};
