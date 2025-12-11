# Sidely - ChatGPT Sidebar for Chrome

Use ChatGPT inside Chrome's sidebar with Sidely – a lightweight, secure sidebar that opens the official ChatGPT UI using your own account.

---

## Features

- 🧠 Quick access to ChatGPT in Chrome's native sidebar
- 🔐 Uses your existing ChatGPT session (no login inside the extension)
- ⚙️ Always loads `chatgpt.com` for the fastest possible startup
- 🌍 Localized interface: en, zh, es, hi, fr, pt, ru, de, it, ja
- 🎛️ Quick settings menu for picking your preferred theme and UI language
- 🎨 Light, dark, or auto theme selector that stays in sync with ChatGPT inside the iframe
- 📋 Reliable copy buttons for code blocks thanks to a clipboard fallback helper
- 🔄 Refresh the chat history to pull in your latest conversations
- 💾 Language and theme preferences are stored locally in Chrome storage

### Localization coverage

Sidely ships with native translations for:

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

## Installation

### From Chrome Web Store
Install from the [Chrome Web Store](https://chromewebstore.google.com/detail/chatgpt-sidebar/ibgipmeolfponfpmjhflfgkbcecpmcoo).

### Manual Installation
1. Download the project.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the folder with extension files.

---

## Permissions

| Permission | Purpose |
|-------------|----------|
| `sidePanel` | Enables display inside Chrome's side panel |
| `declarativeNetRequestWithHostAccess` | Adjusts headers to allow ChatGPT to load in iframe |
| `clipboardWrite` | Provides a safe fallback when copying code snippets from ChatGPT |
| `host_permissions` | Allows access to chatgpt.com |

---

## Privacy

This extension does **not** collect or share any personal data.
All communication happens directly between your browser and ChatGPT. Only the two UI preferences noted above stay on your device via Chrome storage.

---

## License

Released under the [Sidely - ChatGPT Sidebar for Chrome Commercial License](LICENSE).
© 2025 Artem Parasochka
