import { CONFIG } from './config.js';
import { EventBus } from './utils/event-bus.js';
import { onDomReady } from './utils/dom.js';
import { ReactionUserStore } from './store/ReactionUserStore.js';
import { SlackTokenProvider } from './auth/SlackTokenProvider.js';
import { SlackContext } from './slack/SlackContext.js';
import { createSlackDom } from './slack/SlackDom.js';
import { NetworkInterceptor } from './network/NetworkInterceptor.js';
import { ActiveUserResolver } from './api/ActiveUserResolver.js';
import { ReactionPanelUI } from './ui/ReactionPanelUI.js';

/** Wires dependencies and starts passive + active subsystems. */
export function bootstrap() {
  'use strict';

  const events = new EventBus();
  const store = new ReactionUserStore(events);
  const slackDom = createSlackDom(CONFIG);
  const tokenProvider = new SlackTokenProvider(SlackContext.getActiveTeamId);
  const activeResolver = new ActiveUserResolver(store, tokenProvider, CONFIG.activeFallback);

  new NetworkInterceptor({
    store,
    tokenProvider,
    config: CONFIG,
    slackDom,
    onReactionEvent: (channelId, ts) => {
      ReactionPanelUI.instance?.refreshIfOpen(channelId, ts);
    },
  });

  onDomReady(() => {
    new ReactionPanelUI({
      store,
      activeResolver,
      slackDom,
      config: CONFIG,
    });
  });
}
