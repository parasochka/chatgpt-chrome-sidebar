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
// "Ask ChatGPT about selection" context menu
// ---------------------------------------------------------------------------
const ASK_SELECTION_MENU_ID = 'sidely-ask-selection';
const SELECTION_STORAGE_KEY = 'sidelyPendingSelection';
const SELECTION_MAX_LENGTH = 4000;

function getSelectionStorageArea() {
  return chrome.storage?.session || chrome.storage?.local || null;
}

function registerSelectionContextMenu() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: ASK_SELECTION_MENU_ID,
        title: chrome.i18n.getMessage('contextMenuAskSelection') || 'Ask ChatGPT about "%s"',
        contexts: ['selection']
      },
      () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to create context menu:', chrome.runtime.lastError);
        }
      }
    );
  });
}

if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId !== ASK_SELECTION_MENU_ID) return;

    const text = (info.selectionText || '').trim().slice(0, SELECTION_MAX_LENGTH);
    if (!text) return;

    // Open the side panel first: it must happen inside the user gesture.
    if (tab && typeof tab.windowId === 'number') {
      chrome.sidePanel
        .open({ windowId: tab.windowId })
        .catch((error) => console.error('Failed to open side panel:', error));
    }

    const storageArea = getSelectionStorageArea();
    if (storageArea) {
      storageArea.set({ [SELECTION_STORAGE_KEY]: { text, createdAt: Date.now() } });
    }
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
