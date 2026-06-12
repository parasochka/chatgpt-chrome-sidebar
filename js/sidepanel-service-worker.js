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

// Locale folder for each extension UI language (matches _locales/*).
const LOCALE_FOLDER_BY_LANGUAGE = {
  en: 'en',
  de: 'de',
  es: 'es',
  fr: 'fr',
  hi: 'hi',
  it: 'it',
  ja: 'ja',
  'pt-BR': 'pt_BR',
  ru: 'ru',
  'zh-CN': 'zh_CN'
};

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

// Context-menu titles must follow the extension-language setting, not the
// browser UI locale, so load the chosen locale file directly (like the
// side-panel page does).
async function loadContextMenuMessages(language) {
  const folder = LOCALE_FOLDER_BY_LANGUAGE[language] || LOCALE_FOLDER_BY_LANGUAGE.en;
  try {
    const response = await fetch(chrome.runtime.getURL(`_locales/${folder}/messages.json`));
    if (!response.ok) {
      throw new Error(`Failed to load locale ${folder}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('Unable to load locale file for context menus:', error);
    return null;
  }
}

// Chrome treats "&" in context-menu titles as a mnemonic marker on
// Windows/Linux ("Fix grammar & spelling" would render as "Fix grammar
// spelling"); a literal ampersand has to be doubled.
function escapeContextMenuTitle(title) {
  return title.replace(/&/g, '&&');
}

function resolveContextMenuTitle(messages, messageKey, fallbackTitle) {
  const localized = messages?.[messageKey]?.message;
  const title = (typeof localized === 'string' && localized) ||
    chrome.i18n.getMessage(messageKey) ||
    fallbackTitle;
  return escapeContextMenuTitle(title);
}

// Registrations (install, startup, language change) are serialized so the
// removeAll of one run can never interleave with the creates of another —
// rapid language switching used to produce "duplicate id" errors and could
// leave the menu partially built.
let contextMenuRegistrationQueue = Promise.resolve();

function registerSelectionContextMenu() {
  contextMenuRegistrationQueue = contextMenuRegistrationQueue
    .then(() => registerSelectionContextMenuNow())
    .catch((error) => console.error('Failed to register context menu:', error));
  return contextMenuRegistrationQueue;
}

async function registerSelectionContextMenuNow() {
  if (!chrome.contextMenus) return;
  const { language } = await readQuickActionSettings();
  const messages = await loadContextMenuMessages(language);
  await new Promise((resolve) => chrome.contextMenus.removeAll(resolve));
  createContextMenuItem({
    id: ASK_SELECTION_MENU_ID,
    title: resolveContextMenuTitle(messages, 'contextMenuAskSelection', 'Ask ChatGPT about "%s"'),
    contexts: ['selection']
  });
  QUICK_ACTION_MENU_ITEMS.forEach((item) => {
    createContextMenuItem({
      id: item.id,
      title: resolveContextMenuTitle(messages, item.messageKey, item.fallbackTitle),
      contexts: ['selection']
    });
  });
  createContextMenuItem({
    id: ASK_PAGE_MENU_ID,
    title: resolveContextMenuTitle(messages, 'contextMenuAskPage', 'Ask ChatGPT about this page'),
    contexts: ['page']
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
        const pending = { ...payload, createdAt: Date.now() };
        // Address the payload to the window the click came from, so that with
        // side panels open in several windows only one panel consumes it.
        if (tab && typeof tab.windowId === 'number' && tab.windowId >= 0) {
          pending.windowId = tab.windowId;
        }
        storageArea.set({ [SELECTION_STORAGE_KEY]: pending });
      }
    });
  });
}

function initializeSidepanelExtension() {
  registerSidepanelDnrRules();
  registerSelectionContextMenu();
}

// Re-localize the context menu when the extension language changes.
if (chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if ((areaName === 'sync' || areaName === 'local') && changes[LANGUAGE_STORAGE_KEY]) {
      registerSelectionContextMenu();
    }
  });
}

// Apply the rules on install/update and when the browser starts
chrome.runtime.onInstalled.addListener(initializeSidepanelExtension);
chrome.runtime.onStartup.addListener(initializeSidepanelExtension);

// Make the action icon click open the side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
