# Privacy Policy

**Effective date:** October 2025  
**Extension name:** ChatGPT Sidebar  

This Chrome extension does not collect, store, or share any personal information.

All interactions take place directly between your browser and the official ChatGPT websites
([chat.openai.com](https://chat.openai.com) and [chatgpt.com](https://chatgpt.com)).
The extension does not track browsing activity, record usage data, or communicate with any external servers. To decide which site to load, it makes a single authenticated request to ChatGPT using your existing session cookies.

## Data collection
- ❌ No user data is collected.  
- ⚠️ Session cookies are sent to ChatGPT once to check whether you are already signed in. They are never stored or transmitted anywhere else.
- ❌ No analytics or third-party services are used.

## Permissions explanation
The extension requests limited permissions only to enable ChatGPT to load in Chrome’s side panel:
- `sidePanel` — displays ChatGPT in the sidebar.
- `declarativeNetRequestWithHostAccess` — temporarily removes restrictive headers (CSP / X-Frame-Options) so ChatGPT can be embedded.
- `host_permissions` — allows connection to official ChatGPT domains only.

These permissions do **not** provide access to user data, browsing history, or any other websites.

## Contact
If you have questions about privacy or data usage, please contact the developer:  
**Artem Parasochka** — via the project repository on [GitHub](https://github.com/parasochka/chatgpt-chrome-sidebar).

---

© 2025 Artem Parasochka. All rights reserved.
This project is distributed under the ChatGPT Chrome Sidebar Commercial License. See the `LICENSE` file for terms.
