// Rule IDs so they can be reused and removed easily
const SIDEPANEL_RULE_IDS = [1, 2];

// Rule set for both domains
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
  },
  {
    id: 2,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "content-security-policy", operation: "remove" },
        { header: "x-frame-options", operation: "remove" }
      ]
    },
    condition: {
      urlFilter: "||chat.openai.com/*",
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

// Apply the rules on install/update and when the browser starts
chrome.runtime.onInstalled.addListener(registerSidepanelDnrRules);
chrome.runtime.onStartup.addListener(registerSidepanelDnrRules);

// Make the action icon click open the side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

function notifySidepanelOpened(details) {
  try {
    const maybePromise = chrome.runtime.sendMessage({
      type: "chatgpt-sidebar-opened",
      windowId: details && typeof details.windowId === "number" ? details.windowId : null
    });
    if (maybePromise && typeof maybePromise.catch === "function") {
      maybePromise.catch((error) => {
        if (error && !/receiving end does not exist/i.test(String(error))) {
          console.warn("Failed to notify sidepanel about open event", error);
        }
      });
    }
  } catch (error) {
    // Ignore missing listeners but log unexpected errors for diagnostics
    if (error && !/receiving end does not exist/i.test(String(error))) {
      console.warn("Failed to notify sidepanel about open event", error);
    }
  }
}

if (chrome.sidePanel && chrome.sidePanel.onShown) {
  chrome.sidePanel.onShown.addListener((details) => {
    notifySidepanelOpened(details);
  });
}
