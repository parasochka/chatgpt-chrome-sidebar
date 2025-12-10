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

// Apply the rules on install/update and when the browser starts
chrome.runtime.onInstalled.addListener(registerSidepanelDnrRules);
chrome.runtime.onStartup.addListener(registerSidepanelDnrRules);

// Make the action icon click open the side panel
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
