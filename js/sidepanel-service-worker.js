// Rule IDs so they can be reused and removed easily
const SIDEPANEL_RULE_IDS = [1];

// Rule set for the active ChatGPT domain
const SIDEPANEL_DNR_RULES = [
  {
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "content-security-policy", operation: "remove" },
        { header: "x-frame-options", operation: "remove" }
      ]
    },
    condition: {
      urlFilter: "||chatgpt.com/*",
      resourceTypes: ["sub_frame"]
    }
  }
];

async function registerSidepanelDnrRules() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: SIDEPANEL_RULE_IDS,
      addRules: SIDEPANEL_DNR_RULES
    });
    // console.log("DNR rules applied");
  } catch (e) {
    console.error("Failed to apply DNR rules:", e);
  }
}

// ---------------------------------------------------------------------------
// "Ask ChatGPT" context menu: plain selection hand-off, quick actions
// (translate / summarize / explain / fix grammar), and "ask about this page".
// ---------------------------------------------------------------------------
const ASK_SELECTION_MENU_ID = 'sidely-ask-selection';
const ASK_PAGE_MENU_ID = 'sidely-ask-page';
const SELECTION_STORAGE_KEY = 'sidelyPendingSelection';
const SELECTION_MAX_LENGTH = 4000;
const LANGUAGE_STORAGE_KEY = 'sidelyExtensionLanguage';
const AUTO_SEND_STORAGE_KEY = 'sidelyAutoSendQuickActions';

// English names of the extension UI languages, used inside the prompt
// instructions so ChatGPT answers in the user's language.
const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  hi: 'Hindi',
  'pt-BR': 'Brazilian Portuguese',
  ru: 'Russian',
  'zh-CN': 'Chinese',
  de: 'German',
  it: 'Italian',
  ja: 'Japanese'
};

const QUICK_ACTION_MENU_ITEMS = [
  {
    id: 'sidely-selection-translate',
    messageKey: 'contextMenuTranslateSelection',
    fallbackTitle: 'Translate selection',
    buildPrompt: (text, languageName) =>
      `Translate the following text into ${languageName}:\n\n${text}`
  },
  {
    id: 'sidely-selection-summarize',
    messageKey: 'contextMenuSummarizeSelection',
    fallbackTitle: 'Summarize selection',
    buildPrompt: (text, languageName) =>
      `Summarize the following text concisely. Respond in ${languageName}:\n\n${text}`
  },
  {
    id: 'sidely-selection-explain',
    messageKey: 'contextMenuExplainSelection',
    fallbackTitle: 'Explain in simple terms',
    buildPrompt: (text, languageName) =>
      `Explain the following text in simple terms. Respond in ${languageName}:\n\n${text}`
  },
  {
    id: 'sidely-selection-grammar',
    messageKey: 'contextMenuGrammarSelection',
    fallbackTitle: 'Fix grammar & spelling',
    buildPrompt: (text) =>
      `Fix the grammar and spelling in the following text. Keep the original language and reply only with the corrected text:\n\n${text}`
  }
];

function getSelectionStorageArea() {
  return chrome.storage?.session || chrome.storage?.local || null;
}

function readStorageArea(area, keys) {
  return new Promise((resolve) => {
    if (!area) {
      resolve(null);
      return;
    }
    try {
      area.get(keys, (items) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(items || {});
      });
    } catch (_) {
      resolve(null);
    }
  });
}

// Settings are written to chrome.storage.sync first (with a local fallback),
// so read both and let sync win.
async function readQuickActionSettings() {
  const keys = [LANGUAGE_STORAGE_KEY, AUTO_SEND_STORAGE_KEY];
  const [syncItems, localItems] = await Promise.all([
    readStorageArea(chrome.storage?.sync, keys),
    readStorageArea(chrome.storage?.local, keys)
  ]);
  const merged = { ...(localItems || {}), ...(syncItems || {}) };

  const storedLanguage = merged[LANGUAGE_STORAGE_KEY];
  let language = 'en';
  if (typeof storedLanguage === 'string') {
    const canonical = storedLanguage.replace('_', '-');
    if (LANGUAGE_NAMES[canonical]) {
      language = canonical;
    } else if (LANGUAGE_NAMES[canonical.split('-')[0]]) {
      language = canonical.split('-')[0];
    }
  }

  const storedAutoSend = merged[AUTO_SEND_STORAGE_KEY];
  const autoSend = storedAutoSend === true || storedAutoSend === 'true';

  return { language, autoSend };
}

function createContextMenuItem(properties) {
  chrome.contextMenus.create(properties, () => {
    if (chrome.runtime.lastError) {
      console.error('Failed to create context menu:', chrome.runtime.lastError);
    }
  });
}

function registerSelectionContextMenu() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    createContextMenuItem({
      id: ASK_SELECTION_MENU_ID,
      title: chrome.i18n.getMessage('contextMenuAskSelection') || 'Ask ChatGPT about "%s"',
      contexts: ['selection']
    });
    QUICK_ACTION_MENU_ITEMS.forEach((item) => {
      createContextMenuItem({
        id: item.id,
        title: chrome.i18n.getMessage(item.messageKey) || item.fallbackTitle,
        contexts: ['selection']
      });
    });
    createContextMenuItem({
      id: ASK_PAGE_MENU_ID,
      title: chrome.i18n.getMessage('contextMenuAskPage') || 'Ask ChatGPT about this page',
      contexts: ['page']
    });
  });
}

function buildPendingSelectionPayload(info, tab) {
  if (info.menuItemId === ASK_PAGE_MENU_ID) {
    const title = (tab?.title || '').trim();
    const url = (info.pageUrl || tab?.url || '').trim();
    if (!url) return null;
    const text = [title, url].filter(Boolean).join('\n').slice(0, SELECTION_MAX_LENGTH);
    return Promise.resolve({ text, autoSend: false });
  }

  const text = (info.selectionText || '').trim().slice(0, SELECTION_MAX_LENGTH);
  if (!text) return null;

  if (info.menuItemId === ASK_SELECTION_MENU_ID) {
    return Promise.resolve({ text, autoSend: false });
  }

  const action = QUICK_ACTION_MENU_ITEMS.find((item) => item.id === info.menuItemId);
  if (!action) return null;

  return readQuickActionSettings().then(({ language, autoSend }) => ({
    text: action.buildPrompt(text, LANGUAGE_NAMES[language] || 'English'),
    autoSend
  }));
}

if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const payloadPromise = buildPendingSelectionPayload(info, tab);
    if (!payloadPromise) return;

    // Open the side panel first: it must happen inside the user gesture.
    if (tab && typeof tab.windowId === 'number') {
      chrome.sidePanel
        .open({ windowId: tab.windowId })
        .catch((error) => console.error('Failed to open side panel:', error));
    }

    payloadPromise.then((payload) => {
      if (!payload || !payload.text) return;
      const storageArea = getSelectionStorageArea();
      if (storageArea) {
        storageArea.set({ [SELECTION_STORAGE_KEY]: { ...payload, createdAt: Date.now() } });
      }
    });
  });
}

function initializeSidepanelExtension() {
  registerSidepanelDnrRules();
  registerSelectionContextMenu();
}

// Apply the rules on install/update and when the browser starts
chrome.runtime.onInstalled.addListener(initializeSidepanelExtension);
chrome.runtime.onStartup.addListener(initializeSidepanelExtension);

// Make the action icon click open the side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
