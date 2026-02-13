(() => {
  const DEBUG = false;
  const STORAGE_KEYS = {
    projects: 'sidelySidebarProjectsExpanded',
    yourChats: 'sidelySidebarYourChatsExpanded',
    groupChats: 'sidelySidebarGroupChatsExpanded'
  };

  const DEFAULTS = {
    projects: true,
    yourChats: true,
    groupChats: true
  };

  const SECTION_LABELS = {
    projects: ['projects', 'проекты'],
    groupChats: ['group chats', 'групповые чаты', 'группы'],
    yourChats: ['your chats', 'ваши чаты', 'чаты', 'история', 'история чатов']
  };

  const lastApplied = new Map();
  const cooldownUntil = new Map();
  const userTouched = new Set();

  let desiredState = { ...DEFAULTS };
  let observer = null;
  let applyTimeout = null;

  function debugLog(...args) {
    if (DEBUG) {
      console.log('[Sidely sidebar sections]', ...args);
    }
  }

  function normalizeBoolean(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (value === 'true') return true;
      if (value === 'false') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return Boolean(fallback);
  }

  function getStorage() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      return { primary: null, fallback: null };
    }
    if (chrome.storage.sync && chrome.storage.local) {
      return { primary: chrome.storage.sync, fallback: chrome.storage.local };
    }
    if (chrome.storage.sync) {
      return { primary: chrome.storage.sync, fallback: null };
    }
    if (chrome.storage.local) {
      return { primary: chrome.storage.local, fallback: null };
    }
    return { primary: null, fallback: null };
  }

  function storageGetFromArea(area, keys) {
    return new Promise((resolve, reject) => {
      if (!area) {
        resolve({});
        return;
      }
      try {
        area.get(keys, items => {
          if (chrome?.runtime?.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(items || {});
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function getSettingValues() {
    const keys = [STORAGE_KEYS.projects, STORAGE_KEYS.yourChats, STORAGE_KEYS.groupChats];
    const storage = getStorage();

    let stored = {};
    try {
      stored = await storageGetFromArea(storage.primary, keys);
    } catch (_) {
      try {
        stored = await storageGetFromArea(storage.fallback, keys);
      } catch (_) {
        stored = {};
      }
    }

    return {
      projects: normalizeBoolean(stored[STORAGE_KEYS.projects], DEFAULTS.projects),
      yourChats: normalizeBoolean(stored[STORAGE_KEYS.yourChats], DEFAULTS.yourChats),
      groupChats: normalizeBoolean(stored[STORAGE_KEYS.groupChats], DEFAULTS.groupChats)
    };
  }

  function getSidebarRoot() {
    const stageSidebar = document.querySelector('#stage-slideover-sidebar');
    if (!stageSidebar) return null;
    return stageSidebar.querySelector('nav[aria-label="Chat history"]') || stageSidebar;
  }

  function getExpandoButtons(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('div[class*="group/sidebar-expando-section"] > button[aria-expanded]'));
  }

  function normalizeLabel(label) {
    if (typeof label !== 'string') return '';
    return label.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  function detectSectionKeyFromLabel(label) {
    const normalized = normalizeLabel(label);
    if (!normalized) return null;

    if (SECTION_LABELS.projects.includes(normalized)) return 'projects';
    if (SECTION_LABELS.groupChats.includes(normalized)) return 'groupChats';
    if (SECTION_LABELS.yourChats.includes(normalized)) return 'yourChats';
    return null;
  }

  function getSectionKeyFromButton(button) {
    const label = button.querySelector('h2.__menu-label')?.textContent?.trim() || '';
    return detectSectionKeyFromLabel(label);
  }

  function scheduleApply(delay = 250) {
    if (applyTimeout) {
      window.clearTimeout(applyTimeout);
    }
    applyTimeout = window.setTimeout(() => {
      applyTimeout = null;
      applyDesiredStates(desiredState);
    }, delay);
  }

  function applyDesiredStates(desired) {
    const root = getSidebarRoot();
    if (!root) return;

    const buttons = getExpandoButtons(root);
    if (!buttons.length) return;

    const now = Date.now();

    buttons.forEach(button => {
      const sectionKey = getSectionKeyFromButton(button);
      if (!sectionKey || userTouched.has(sectionKey)) {
        return;
      }

      const shouldExpand = Boolean(desired[sectionKey]);
      const currentExpanded = button.getAttribute('aria-expanded') === 'true';

      if (currentExpanded === shouldExpand) {
        lastApplied.set(sectionKey, currentExpanded);
        return;
      }

      const cooldown = cooldownUntil.get(sectionKey) || 0;
      if (now < cooldown) {
        return;
      }

      const last = lastApplied.get(sectionKey);
      if (last === shouldExpand && now - cooldown < 900) {
        return;
      }

      cooldownUntil.set(sectionKey, now + 700);
      lastApplied.set(sectionKey, shouldExpand);
      button.click();
      debugLog('Applied section state', sectionKey, shouldExpand);
    });
  }

  function setupMutationObserver() {
    if (observer) return;

    observer = new MutationObserver(() => {
      scheduleApply(300);
    });

    const root = document.documentElement || document.body;
    if (!root) return;

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-expanded']
    });
  }

  function setupManualOverrideTracking() {
    document.addEventListener('click', event => {
      if (!event.isTrusted) {
        return;
      }
      const button = event.target instanceof Element
        ? event.target.closest('div[class*="group/sidebar-expando-section"] > button[aria-expanded]')
        : null;

      if (!button) {
        return;
      }

      const sidebarRoot = getSidebarRoot();
      if (!sidebarRoot || !sidebarRoot.contains(button)) {
        return;
      }

      const sectionKey = getSectionKeyFromButton(button);
      if (!sectionKey) {
        return;
      }

      userTouched.add(sectionKey);
      debugLog('User touched section, stop auto for session:', sectionKey);
    }, true);
  }

  function handleStorageChange(changes, areaName) {
    const relevantArea = areaName === 'sync' || areaName === 'local';
    if (!relevantArea) return;

    let hasRelevantChange = false;

    if (changes[STORAGE_KEYS.projects]) {
      desiredState.projects = normalizeBoolean(changes[STORAGE_KEYS.projects].newValue, DEFAULTS.projects);
      hasRelevantChange = true;
    }
    if (changes[STORAGE_KEYS.yourChats]) {
      desiredState.yourChats = normalizeBoolean(changes[STORAGE_KEYS.yourChats].newValue, DEFAULTS.yourChats);
      hasRelevantChange = true;
    }
    if (changes[STORAGE_KEYS.groupChats]) {
      desiredState.groupChats = normalizeBoolean(changes[STORAGE_KEYS.groupChats].newValue, DEFAULTS.groupChats);
      hasRelevantChange = true;
    }

    if (hasRelevantChange) {
      scheduleApply(100);
    }
  }

  async function init() {
    desiredState = await getSettingValues();
    setupMutationObserver();
    setupManualOverrideTracking();
    scheduleApply(50);

    if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }
  }

  init();
})();
