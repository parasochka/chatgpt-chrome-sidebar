# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this project is

**Sidely — ChatGPT Sidebar** is a Chrome MV3 extension (no build step, plain JS/CSS/HTML)
that loads chatgpt.com inside Chrome's side panel. Current version: **1.6.0**
(`manifest.json`, `package.json`, and the feature-notice target version must stay in sync — see below).

There is no bundler, linter, or test suite. Verify changes with `node --check js/*.js`
and by loading the unpacked extension in Chrome.

## File map

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest. Permissions: `sidePanel`, `declarativeNetRequestWithHostAccess`, `clipboardWrite`, `storage`, `contextMenus`. Host permissions: `chatgpt.com`, `*.openai.com`. |
| `js/sidepanel-service-worker.js` | Background worker: DNR rules that strip `content-security-policy` / `x-frame-options` so chatgpt.com can be iframed; registers all context-menu items and handles clicks. |
| `js/sidepanel-bootstrap.js` | Logic of the side-panel page: toolbar, settings panel, theme, localization, feature-update notice, auth-state probe, and delivery of pending prompts into the iframe. |
| `js/chatgpt-overrides.js` | Content script injected into chatgpt.com (`all_frames`, `document_start`): hides sidebar-only UI inside the iframe, copy-code fixes, theme sync, prompt insertion into the composer, auto-submit. |
| `sidebar-panel.html` | Side-panel markup: toolbar, feature notice, settings sections, `#gpt-frame` iframe. Inline `<style>` is a fallback for `css/sidepanel-layout.css`. |
| `_locales/<locale>/messages.json` | 10 locales: en, de, es, fr, hi, it, ja, pt_BR, ru, zh_CN. **Every key must exist in all 10 files.** |
| `CHANGELOG.md` | User-facing changelog, newest version on top. |

## Current feature set (as of 1.6.0)

- **Side panel with ChatGPT**: iframe of chatgpt.com; auth-state probe (`/api/auth/session`) shows
  a localized sign-in / Cloudflare notice when not authorized.
- **Settings panel** (gear icon): extension language (10 options), theme (auto/light/dark),
  auto-send quick actions (checkbox), temporary chat (checkbox).
- **Context menu** (registered in the service worker, titles localized via `chrome.i18n`):
  - `sidely-ask-selection` — Ask ChatGPT about "%s" (selection; inserts the raw selection + blank line, never auto-sends).
  - `sidely-selection-translate` / `-summarize` / `-explain` / `-grammar` — quick actions (selection);
    prompts are built in English in `QUICK_ACTION_MENU_ITEMS`, the answer/translation language follows the
    extension-language setting via the `LANGUAGE_NAMES` map. These honor the auto-send setting.
  - `sidely-ask-page` — Ask ChatGPT about this page (page context; inserts page title + URL, never auto-sends).
- **Prompt hand-off pipeline**: context-menu click → worker opens side panel (must stay inside the
  user gesture, synchronously) → payload `{ text, autoSend, createdAt }` written to
  `chrome.storage.session` under `sidelyPendingSelection` → bootstrap picks it up via
  `storage.onChanged` (or `consumeStoredSelection()` on startup; entries older than 60 s are dropped)
  → posts `sidely-insert-prompt` messages into the iframe every 700 ms until the content script
  acks with `sidely-insert-prompt-ack` (45 s timeout) → content script inserts into the composer
  (`#prompt-textarea`, ProseMirror contenteditable; textarea fallback) and, when `autoSend` is true,
  clicks the send button (`findComposerSendButton()`: `data-testid="send-button"` →
  `#composer-submit-button` → fallbacks scoped to the composer form only; retried up to 20 × 150 ms
  because the button mounts/enables only after text appears).
- **Temporary chat**: when enabled, the iframe loads `https://chatgpt.com/?temporary-chat=true`;
  toggling remounts the portal immediately.
- **Theme sync**: sidebar posts `sidely-theme-change` into the iframe; the content script applies it.
  Both message handlers in the content script verify `event.origin` against the extension's own origin.

## Versioning & release checklist

When shipping a new version, update **all** of these together:

1. `manifest.json` → `"version"`.
2. `package.json` → `"version"`.
3. `js/sidepanel-bootstrap.js` → `FEATURE_NOTICE_TARGET_VERSION` (if the release should show a notice).
4. `CHANGELOG.md` → new section on top.

## Feature-update notice ("popup")

A one-time dismissible banner under the toolbar that announces the latest release. How it works:

- Shown only while `chrome.runtime.getManifest().version === FEATURE_NOTICE_TARGET_VERSION`
  (`js/sidepanel-bootstrap.js`) **and** the user hasn't dismissed it.
- The dismissed flag is stored under a **version-suffixed key** — currently
  `sidelyFeatureNoticeDismissedV160` — so each release gets a fresh notice even for users who
  dismissed the previous one. For a new release: bump the suffix (e.g. `...V170`), set
  `FEATURE_NOTICE_TARGET_VERSION` to the new version, add a new message key (pattern:
  `featureNotice<FeatureName>`) to `FALLBACK_MESSAGES` and to **all 10 locale files**, and point the
  `data-i18n-key` / `__MSG_...__` of `#feature-update-notice` in `sidebar-panel.html` at it.
- History: 1.4 used `featureNoticeChatState`, 1.5.0 `featureNoticeAskSelection` (key
  `...V150`), 1.6.0 `featureNoticeQuickActions` (key `...V160`).
- Old notice message keys stay in the locale files; only the HTML reference moves forward.

## Storage keys

Settings are written by `storageSet()` to `chrome.storage.sync` first, falling back to `local`
(the service worker reads both and lets sync win — keep that precedence consistent).

| Key | Type | Default | Meaning |
|---|---|---|---|
| `sidelyExtensionLanguage` | string | browser UI language → `en` | Extension UI language; also drives quick-action answer language. |
| `sidelyThemeMode` | `auto`/`light`/`dark` | `auto` | Sidebar + iframe theme. |
| `sidelyAutoSendQuickActions` | bool | `false` | Auto-submit quick-action prompts. |
| `sidelyTemporaryChat` | bool | `false` | Load ChatGPT with `?temporary-chat=true`. |
| `sidelyFeatureNoticeDismissedV160` | bool | `false` | Current notice dismissed (key is version-suffixed). |
| `sidelyPendingSelection` | object | — | Transient hand-off payload in `storage.session` (`{ text, autoSend, createdAt }`, max 4000 chars, 60 s TTL). |

Storage key constants are duplicated between the service worker and the bootstrap — change them in both.

## Localization rules

- Add every new user-visible string to **all 10** `_locales/*/messages.json` files and, for strings
  used by the side-panel page, to `FALLBACK_MESSAGES` in `js/sidepanel-bootstrap.js`.
- The side panel localizes at runtime from the chosen extension language (fetches the locale file
  directly); `__MSG_...__` placeholders and context-menu titles use the **browser** UI locale via
  `chrome.i18n` — both paths must have the key.
- Elements with `data-i18n-key` are re-localized automatically on language change.

## Fragile spots (check on ChatGPT UI changes)

ChatGPT's DOM changes without notice. The selectors most likely to break, all in
`js/chatgpt-overrides.js`: `findPromptComposer()` (`#prompt-textarea`), `findComposerSendButton()`,
and the copy-code / sidebar-hiding heuristics. The `?temporary-chat=true` URL param and the
`/api/auth/session` probe in the bootstrap are also OpenAI-controlled. If auto-send stops working,
text still lands in the composer — degradation is graceful by design; keep it that way.
