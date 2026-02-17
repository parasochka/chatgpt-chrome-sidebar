# Sidely - ChatGPT Sidebar for Chrome

Sidely is your personal AI assistant inside Chrome. Stop switching tabs or losing focus.
This lightweight ChatGPT sidebar extension brings the official ChatGPT interface directly into Chrome's side panel - always one click away.

---

## 🧩 What it does

Sidely embeds the official ChatGPT interface ([chatgpt.com](https://chatgpt.com)) into the Chrome sidebar (side panel).
You can chat, brainstorm, summarize text, translate, or generate ideas without leaving the page you are on.
It works with your existing ChatGPT session, so you do not need extra accounts or third-party logins.

---

## ⚙️ Key features

- Instant access to ChatGPT from any tab via Chrome side panel
- Uses the official ChatGPT UI inside the sidebar
- Works with your current ChatGPT session - no extra registration and no third-party logins
- Fast and lightweight - built for speed and minimal resource use
- Theme control: light, dark, or auto
- Extension UI languages: en, zh, es, hi, fr, pt, ru, de, it, ja
- Sidebar layout control for ChatGPT navigation:
  - Projects (default collapsed/expanded)
  - Your chats (default collapsed/expanded)
  - Group chats (default collapsed/expanded)
- "Update chats" button to refresh the sidebar and load latest conversations
- Reliable code copying for code blocks
- Settings sync across devices via `chrome.storage.sync`

### Localization coverage

| Language | Locale folder |
| --- | --- |
| English | `_locales/en` |
| 中文 (简体) | `_locales/zh_CN` |
| Español | `_locales/es` |
| हिन्दी | `_locales/hi` |
| Français | `_locales/fr` |
| Português (Brasil) | `_locales/pt_BR` |
| Русский | `_locales/ru` |
| Deutsch | `_locales/de` |
| Italiano | `_locales/it` |
| 日本語 | `_locales/ja` |

---

## 💡 Why use Sidely?

Whether you are writing emails, coding, researching, or learning something new, Sidely saves you time.
You do not need to keep chatgpt.com in a separate tab or constantly copy-paste context between tabs.
Sidely is built as a focused, low-friction productivity tool for people who use ChatGPT regularly.

---

## Installation

### From Chrome Web Store
Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/chatgpt-sidebar/ibgipmeolfponfpmjhflfgkbcecpmcoo).

### Manual installation
1. Download this project.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the extension folder.

---

## Permissions

| Permission | Purpose |
|-------------|----------|
| `sidePanel` | Opens ChatGPT inside Chrome's side panel |
| `declarativeNetRequestWithHostAccess` | Adjusts page headers so the official UI can be embedded |
| `clipboardWrite` | Provides a local fallback for reliable code copying |
| `storage` | Saves and syncs extension settings |
| `host_permissions` | Allows access to official ChatGPT domains |

---

## 🔒 Privacy-first design

Sidely does **not** collect, store, or transmit your conversations or credentials.
Authentication stays between you and OpenAI.
Settings (language, theme, and sidebar layout behavior) are stored in Chrome extension storage and can sync through Chrome Sync.

For full details, see [privacy-policy.md](privacy-policy.md).

---

## 🚀 Coming soon

- Pin and unpin chats (favorites)
- Sync pinned chats across devices
- Custom shortcuts and prompt templates
- Optional hotkey activation

---

## License

Released under the [Sidely - ChatGPT Sidebar for Chrome Commercial License](LICENSE).
© 2025 Artem Parasochka
