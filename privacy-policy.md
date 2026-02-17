# Privacy Policy

**Effective date:** 17 February 2026
**Extension name:** Sidely - ChatGPT Sidebar

Sidely is designed with a privacy-first approach.
The extension loads the official ChatGPT interface from [chatgpt.com](https://chatgpt.com) directly in Chrome's side panel and does not run any analytics, tracking scripts, or third-party data collection services.

Sidely does **not** collect, store, or share:
- your prompts,
- your responses,
- your credentials,
- your browsing history.

Authentication remains between you and OpenAI.

## Data handling summary

- ❌ **No conversation logging** by the extension.
- ❌ **No third-party analytics**.
- ❌ **No remote backend controlled by Sidely** for chat data.
- ⚙️ **Local/Sync settings only:** language, theme, and sidebar layout preferences (Projects, Your chats, Group chats).

These settings are saved via Chrome extension storage APIs and may sync between your devices when Chrome Sync is enabled.

## Permissions explanation

Sidely requests only the permissions required to run inside the side panel:

- `sidePanel` - display ChatGPT in Chrome sidebar.
- `declarativeNetRequestWithHostAccess` - adjust restrictive headers (like CSP / X-Frame-Options) so the official ChatGPT page can load in the embedded panel.
- `clipboardWrite` - provide reliable local copy behavior for code blocks.
- `storage` - save extension settings.
- `host_permissions` - access official ChatGPT domains needed for embedding.

These permissions do not grant Sidely access to unrelated websites or private account data outside the extension context.

## Contact

If you have questions about this policy, contact:
**Artem Parasochka** - via [GitHub](https://github.com/parasochka/chatgpt-chrome-sidebar) or email [parasochkaartem@gmail.com](mailto:parasochkaartem@gmail.com).

---

© 2025 Artem Parasochka. All rights reserved.
This project is distributed under the Sidely - ChatGPT Sidebar for Chrome Commercial License. See the `LICENSE` file for full terms.
