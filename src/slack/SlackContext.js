/** URL-derived Slack workspace/channel context (no DOM dependency). */
export class SlackContext {
  /** @returns {string | null} */
  static getActiveChannelId() {
    const match = location.pathname.match(/\/client\/[A-Z0-9]+\/([A-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /** @returns {string | null} */
  static getActiveTeamId() {
    const match = location.pathname.match(/\/client\/([A-Z0-9]+)/);
    return match ? match[1] : null;
  }
}
