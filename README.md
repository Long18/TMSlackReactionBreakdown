# Slack Reaction Breakdown (Tampermonkey)

Tampermonkey userscript for [Slack web](https://app.slack.com/client): a **Reaction details** button in Slack's native per-message hover toolbar. Shows who reacted (with avatars and emoji icons), plus one-click copy for **Mentions**, **Names**, and **Handles**.

## Features

- Injects into Slack's message-actions toolbar (next to reply, share, bookmark, …)
- Reaction breakdown by emoji, with real icons from Slack's `emoji.list` API
- Copy buttons per reaction row: `<@uid>` mentions, display names, or `@handles`
- Passive data from Slack network traffic + on-demand **Fetch data** via `reactions.get`
- Auto-updates when you push to the `dev` branch (`@updateURL` / `@downloadURL`)

## Install

Install guide adapted from [jesterjunk's Tampermonkey gist](https://gist.github.com/jesterjunk/0344f1a7c1f67f52ffc716b17ee7f240).

### Step 1: Install Tampermonkey

[Tampermonkey](https://www.tampermonkey.net/) is a browser extension that runs userscripts — small programs that customize websites.

| Browser | Install |
|---------|---------|
| Chrome | [tampermonkey.net → Chrome](https://www.tampermonkey.net/index.php?browser=chrome) |
| Firefox | [tampermonkey.net → Firefox](https://www.tampermonkey.net/index.php?browser=firefox) |
| Edge | [tampermonkey.net → Edge](https://www.tampermonkey.net/index.php?browser=edge) |
| Safari | [tampermonkey.net → Safari](https://www.tampermonkey.net/index.php?browser=safari) |
| Opera | [tampermonkey.net → Opera](https://www.tampermonkey.net/index.php?browser=opera) |

### Step 2: Pin Tampermonkey on the extension bar

Pin the Tampermonkey icon so you can see when a script is active on a page (red badge with a count).

![Chrome extension bar](https://gist.github.com/jesterjunk/0344f1a7c1f67f52ffc716b17ee7f240/raw/8b0dfd90b9e784efc774b2d94911ceed57e0901a/02_Chrome_extension_bar_2024-04-05_182303.png)

### Step 3: Open Dashboard

Click the Tampermonkey icon → **Dashboard**.

![Tampermonkey context menu](https://gist.github.com/jesterjunk/0344f1a7c1f67f52ffc716b17ee7f240/raw/13221d49a0d379bdc356f1857cd43ab2b01f3905/04_Tampermonkey_context_menu_2024-04-05_182740.png)

### Step 4: Open Utilities

In the Dashboard, open the **Utilities** tab.

![Utilities tab](https://gist.github.com/jesterjunk/0344f1a7c1f67f52ffc716b17ee7f240/raw/4058dce72a470bd661b512d0ce04de9a51fec0bd/07_Tampermonkey_tab_bar_utilities_selected_2024-04-05_185245_640x70.png)

### Step 5: Import from URL

At the bottom, under **Import from URL**, paste this URL exactly:

```
https://raw.githubusercontent.com/Long18/TMSlackReactionBreakdown/dev/slack-reaction-breakdown.user.js
```

Click **Install**. On the next page, click **Install** again to confirm.

![Import from URL](https://gist.github.com/jesterjunk/0344f1a7c1f67f52ffc716b17ee7f240/raw/152f5c8ad8a691c327fd2bedd7830ad02a2ca440/05_Tampermonkey_utilities_2024-04-06_055643_640x539.png)

![Install confirmation](https://gist.github.com/jesterjunk/0344f1a7c1f67f52ffc716b17ee7f240/raw/e577a7de8d42b8c1e7df037ff2ae57f0cafa6e31/06_Tampermonkey_install_userscript_confirmation_2024-04-05_184504_640x529.png)

### Step 6: Confirm and use on Slack

Open the **Installed userscripts** tab. You should see **Slack Reaction Breakdown + Copy Names/Handles (Hover Panel)** with **Enabled** on (green).

![Installed userscripts](https://gist.github.com/jesterjunk/0344f1a7c1f67f52ffc716b17ee7f240/raw/f6c9e3cd56d66d89fc6d2c6c9f59f6a8242d101b/08_Tampermonkey_installed_userscripts_2024-04-05_200123_640x154.png)

Open [Slack web](https://app.slack.com/client) (or refresh with **F5** if already open). Hover a message → click the **people** icon in the toolbar → the reaction panel opens.

### Quick install (alternative)

Open the installer file on GitHub — Tampermonkey may prompt to install directly:

[slack-reaction-breakdown.user.js](https://github.com/Long18/TMSlackReactionBreakdown/blob/dev/slack-reaction-breakdown.user.js)

## How it works

The thin installer (`slack-reaction-breakdown.user.js`) loads the bundled app from GitHub via `@require`:

```
https://raw.githubusercontent.com/Long18/TMSlackReactionBreakdown/dev/dist/slack-reaction-breakdown.js
```

Tampermonkey checks `@updateURL` on the installer file and updates automatically when you push new versions to `dev`.

## Development

```bash
npm install
npm run build
```

Source is in `src/` (ES modules). [esbuild](https://esbuild.github.io/) bundles to `dist/slack-reaction-breakdown.js`.

```bash
npm run watch   # rebuild on file changes
```

After changes, commit and push **both** `src/` (and rebuilt `dist/`) plus `slack-reaction-breakdown.user.js` if metadata changed.

### Architecture

| Module | Responsibility |
|--------|----------------|
| `config.js` | Constants and selectors |
| `store/ReactionUserStore.js` | Reaction/user/emoji state |
| `auth/SlackTokenProvider.js` | Session token extraction |
| `api/SlackApiClient.js` | Slack REST calls |
| `api/ActiveUserResolver.js` | Batched user resolution + on-demand fetch |
| `network/RestPayloadHandler.js` | Map intercepted JSON → store |
| `network/NetworkInterceptor.js` | fetch/XHR/WebSocket patches |
| `slack/SlackDom.js` | DOM helpers |
| `ui/ReactionPanelUI.js` | Popover orchestration |
| `ui/ReactionRowRenderer.js` | Row HTML rendering |
| `ui/CopyTextBuilder.js` | Clipboard text formats |
| `ui/styles.js` | CSS + toolbar button injector |

## Credits

- Author: Long18 (us.thanhlong18@gmail.com) — [github.com/Long18](https://github.com/Long18)
- Install walkthrough screenshots: [jesterjunk](https://gist.github.com/jesterjunk/0344f1a7c1f67f52ffc716b17ee7f240)

## License

Personal use.
