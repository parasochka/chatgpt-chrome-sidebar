# Privacy Policy

**Effective date:** October 2025  
**Extension name:** Sidely - ChatGPT Sidebar

Sidely does not collect, store, or share any personal information.
All interactions take place directly between your browser and the official ChatGPT website
[chatgpt.com](https://chatgpt.com).
The extension does not track browsing activity, record usage data, or communicate with any external servers. It makes a single authenticated request to chatgpt.com using your existing session cookies to confirm whether you are signed in. Localization strings for the bundled languages are stored offline with the extension and never transmitted.

The only data Sidely keeps is two UI preferences (language and theme). They remain inside Chrome's extension storage and are never uploaded.

## Data collection
- ❌ No user data is collected.
- ⚠️ Session cookies are sent to ChatGPT once to check whether you are already signed in. They are never stored or transmitted anywhere else.
- 🗂️ UI preferences (language and theme) stay on your device only.
- 🌐 Localization selections only reference the translated strings packaged with Sidely; no translation service is contacted.
- ❌ No analytics or third-party services are used.

## Permissions explanation
The extension requests limited permissions only to enable ChatGPT to load in Chrome's side panel:
- `sidePanel` - displays ChatGPT in the sidebar.
- `declarativeNetRequestWithHostAccess` - temporarily removes restrictive headers (CSP / X-Frame-Options) so ChatGPT can be embedded.
- `clipboardWrite` - allows a local clipboard fallback so ChatGPT code blocks can be copied reliably.
- `host_permissions` - allows connection to official ChatGPT domains only.

These permissions do **not** provide access to user data, browsing history, or any other websites.

The clipboard fallback runs entirely in the context of ChatGPT pages and never uploads, transmits, or stores any copied text.

## Contact
If you have questions about privacy or data usage, please contact the developer:  
**Artem Parasochka** - via [GitHub](https://github.com/parasochka/chatgpt-chrome-sidebar) or email [parasochkaartem@gmail.com](mailto:parasochkaartem@gmail.com).

---

© 2025 Artem Parasochka. All rights reserved.
This project is distributed under the Sidely - ChatGPT Sidebar for Chrome Commercial License. See the `LICENSE` file for terms.
