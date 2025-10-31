# ChatGPT Sidebar

A minimal Chrome extension that embeds ChatGPT directly into the browser’s side panel — fast, private, and always one click away.

---

## Features

- 🧠 Quick access to ChatGPT in Chrome’s native sidebar  
- 🔐 Uses your existing ChatGPT session (no login inside the extension)  
- ⚙️ Works with both `chat.openai.com` and `chatgpt.com`  
- 🚫 No data collection, no analytics, no ads
- 🔄 Refresh the chat history to pull in your latest conversations

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
| `sidePanel` | Enables display inside Chrome’s side panel |
| `declarativeNetRequestWithHostAccess` | Adjusts headers to allow ChatGPT to load in iframe |
| `host_permissions` | Allows access to chat.openai.com and chatgpt.com |

---

## Privacy

This extension does **not** collect or share any personal data.  
All communication happens directly between your browser and ChatGPT.

---

## License

Released under the [ChatGPT Chrome Sidebar Commercial License](LICENSE).
© 2025 Artem Parasochka
