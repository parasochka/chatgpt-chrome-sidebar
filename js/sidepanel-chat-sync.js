// js/sidepanel-chat-sync.js

(function () {
  if (window.top === window) {
    // Run only when ChatGPT is embedded inside the extension side panel.
    return;
  }

  const STORAGE_KEY = 'chatgptSidebarLastSyncedConversation';
  const knownConversationIds = new Set();

  let lastSyncedConversationId = null;
  try {
    lastSyncedConversationId = sessionStorage.getItem(STORAGE_KEY);
  } catch (e) {
    // Access to sessionStorage can fail in some hardened contexts; ignore.
  }

  const CONVERSATION_PATH_REGEX = /\/c\/([a-z0-9-]+)/i;

  function extractConversationId(urlLike) {
    if (!urlLike) return null;
    try {
      const url = new URL(urlLike, window.location.href);
      const match = url.pathname.match(CONVERSATION_PATH_REGEX);
      return match ? match[1] : null;
    } catch (e) {
      return null;
    }
  }

  function refreshKnownConversationIds() {
    const anchors = document.querySelectorAll('a[href^="/c/"]');
    if (!anchors.length) {
      return;
    }
    anchors.forEach((anchor) => {
      const id = extractConversationId(anchor.getAttribute('href') || anchor.href);
      if (id) {
        knownConversationIds.add(id);
      }
    });
  }

  const knownIdsObserver = new MutationObserver(() => {
    refreshKnownConversationIds();
  });

  knownIdsObserver.observe(document.documentElement, {
    subtree: true,
    childList: true
  });

  refreshKnownConversationIds();

  function rememberConversationId(id) {
    if (!id) return;
    knownConversationIds.add(id);
    lastSyncedConversationId = id;
    try {
      sessionStorage.setItem(STORAGE_KEY, id);
    } catch (e) {
      // Ignore quota or access errors.
    }
  }

  function hasStopGeneratingButton() {
    return Boolean(
      document.querySelector('button[aria-label="Stop generating"]') ||
        document.querySelector('[data-testid="stop-generating-button"]')
    );
  }

  function waitForGenerationIdle(timeoutMs = 20000) {
    return new Promise((resolve) => {
      const start = Date.now();

      function tick() {
        if (!hasStopGeneratingButton()) {
          resolve(true);
          return;
        }

        if (Date.now() - start > timeoutMs) {
          resolve(false);
          return;
        }

        setTimeout(tick, 250);
      }

      tick();
    });
  }

  let pendingSync = null;

  async function scheduleHistorySync(id) {
    if (!id) return;
    if (id === pendingSync || id === lastSyncedConversationId) {
      return;
    }

    if (knownConversationIds.has(id)) {
      rememberConversationId(id);
      return;
    }

    pendingSync = id;

    await waitForGenerationIdle();

    pendingSync = null;
    rememberConversationId(id);

    window.parent.postMessage(
      {
        source: 'chatgpt-sidebar',
        type: 'conversation-created',
        conversationId: id
      },
      '*'
    );
  }

  function handleUrlChange(urlLike) {
    const id = extractConversationId(urlLike);
    if (!id) return;
    scheduleHistorySync(id);
  }

  function wrapHistoryMethod(methodName) {
    const original = history[methodName];
    history[methodName] = function (...args) {
      const urlLike = args[2];
      if (urlLike != null) {
        handleUrlChange(urlLike);
      }
      return original.apply(this, args);
    };
  }

  wrapHistoryMethod('pushState');
  wrapHistoryMethod('replaceState');
  window.addEventListener('popstate', () => handleUrlChange(window.location.href));

  // Handle the initial location after hydration.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => handleUrlChange(window.location.href));
  } else {
    handleUrlChange(window.location.href);
  }
})();
