// js/history-visibility-tracker.js
// Watches for visibility changes of the ChatGPT history sidebar and reports
// them to the extension side panel via window.postMessage. This file executes
// as a content script on chatgpt.com and chat.openai.com.

(() => {
  if (window.__chatgptSidebarTrackerInitialized) {
    return;
  }
  window.__chatgptSidebarTrackerInitialized = true;

  const HISTORY_PANEL_SELECTORS = [
    'div[data-testid="left-sidebar"]',
    'aside[data-testid="left-sidebar"]',
    'nav[aria-label="Chat history"]',
    'aside[aria-label="Chat history"]'
  ];

  let lastVisibility = null;
  let observedPanel = null;
  const observer = new MutationObserver(() => {
    ensurePanelObserver();
    checkHistoryVisibility();
  });

  function getHistoryPanel() {
    for (const selector of HISTORY_PANEL_SELECTORS) {
      const el = document.querySelector(selector);
      if (el) {
        return el;
      }
    }
    return null;
  }

  function isElementVisible(el) {
    if (!el) {
      return false;
    }

    const computed = window.getComputedStyle(el);
    if (computed.display === 'none' || computed.visibility === 'hidden' || computed.opacity === '0') {
      return false;
    }

    if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') {
      return false;
    }

    const rect = el.getBoundingClientRect();
    return rect.width > 160 && rect.height > 0;
  }

  function notifyVisibilityChange(visible) {
    if (visible === lastVisibility) {
      return;
    }
    lastVisibility = visible;

    if (window.parent === window) {
      return;
    }

    try {
      window.parent.postMessage(
        {
          source: 'chatgpt-sidebar',
          type: 'chat-history-visibility',
          visible
        },
        '*'
      );
    } catch (error) {
      console.warn('Failed to post history visibility message', error);
    }
  }

  function checkHistoryVisibility() {
    const panel = getHistoryPanel();
    const isVisible = isElementVisible(panel);
    notifyVisibilityChange(isVisible);
  }

  function ensurePanelObserver() {
    const panel = getHistoryPanel();
    if (!panel || panel === observedPanel) {
      return;
    }
    observedPanel = panel;
    observer.observe(panel, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-state', 'aria-hidden', 'hidden']
    });
  }

  const startObserving = () => {
    observer.observe(document.body, { childList: true, subtree: true });
    ensurePanelObserver();
    checkHistoryVisibility();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserving, { once: true });
  } else {
    startObserving();
  }

  window.addEventListener('resize', checkHistoryVisibility);
})();
