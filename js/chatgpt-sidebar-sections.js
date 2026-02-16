(() => {
  const DEBUG = false;
  const log = (...args) => {
    if (DEBUG) {
      console.log('[Sidely sidebar sections]', ...args);
    }
  };

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

  const LABEL_KEYWORD_MAP = {
    projects: [
      'projects',
      'proyectos',
      'projets',
      'परियोजना',
      'projetos',
      'проекты',
      '项目',
      'projekte',
      'progetti',
      'プロジェクト'
    ],
    groupChats: [
      'group chats',
      'chats de grupo',
      'chats grupales',
      'discussions de groupe',
      'गुरुप चैट',
      'conversas em grupo',
      'групповые чаты',
      '组聊天',
      'gruppenchats',
      'chat di gruppo',
      'グループチャット'
    ],
    yourChats: [
      'your chats',
      'tus chats',
      'vos discussions',
      'आपके चैट',
      'seus chats',
      'ваши чаты',
      '聊天记录',
      'deine chats',
      'le tue chat',
      'あなたのチャット',
      'история чатов',
      'chat history'
    ]
  };

  const COOLDOWN_MS = 800;
  const lastApplied = new Map();
  const userTouched = new Set();
  let desiredState = { ...DEFAULTS };
  let observer = null;
  let applyDebounceTimer = null;

  function normalizeBoolean(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  }

  function getStorageAreasByPriority() {
    const areas = [];
    if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
      areas.push(chrome.storage.sync);
    }
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      areas.push(chrome.storage.local);
    }
    return areas;
  }

  function storageGetWithFallback(keys) {
    return new Promise(resolve => {
      const areas = getStorageAreasByPriority();
      if (!areas.length) {
        resolve({});
        return;
      }

      const readArea = index => {
        if (index >= areas.length) {
          resolve({});
          return;
        }

        areas[index].get(keys, items => {
          if (chrome?.runtime?.lastError) {
            readArea(index + 1);
            return;
          }
          resolve(items || {});
        });
      };

      readArea(0);
    });
  }

  async function getSettingValues() {
    const stored = await storageGetWithFallback(Object.values(STORAGE_KEYS));
    return {
      projects: normalizeBoolean(stored[STORAGE_KEYS.projects], DEFAULTS.projects),
      yourChats: normalizeBoolean(stored[STORAGE_KEYS.yourChats], DEFAULTS.yourChats),
      groupChats: normalizeBoolean(stored[STORAGE_KEYS.groupChats], DEFAULTS.groupChats)
    };
  }

  function getSidebarRoot() {
    const staged = document.querySelector('#stage-slideover-sidebar nav[aria-label="Chat history"]');
    if (staged) return staged;

    const stageSidebar = document.getElementById('stage-slideover-sidebar');
    if (stageSidebar) {
      const nav = stageSidebar.querySelector('nav[aria-label="Chat history"]');
      if (nav) return nav;
    }

    return document.querySelector('nav[aria-label="Chat history"]');
  }

  function getExpandoButtons(root) {
    if (!root) return [];
    return Array.from(root.querySelectorAll('div[class*="group/sidebar-expando-section"] > button[aria-expanded]'));
  }

  function normalizeLabel(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\s\p{P}\p{S}]+/gu, ' ')
      .trim();
  }

  function detectSectionKeyFromLabel(label) {
    const normalizedLabel = normalizeLabel(label);
    if (!normalizedLabel) return null;

    for (const [key, keywords] of Object.entries(LABEL_KEYWORD_MAP)) {
      if (
        keywords.some(keyword => {
          const normalizedKeyword = normalizeLabel(keyword);
          return (
            normalizedLabel === normalizedKeyword ||
            normalizedLabel.includes(normalizedKeyword) ||
            normalizedKeyword.includes(normalizedLabel)
          );
        })
      ) {
        return key;
      }
    }

    return null;
  }

  function scheduleApply(delay = 0) {
    window.setTimeout(() => {
      if (applyDebounceTimer) {
        window.clearTimeout(applyDebounceTimer);
      }
      applyDebounceTimer = window.setTimeout(() => {
        applyDesiredStates(desiredState);
      }, 300);
    }, delay);
  }

  function applyDesiredStates(desired) {
    const root = getSidebarRoot();
    if (!root) {
      return;
    }

    const buttons = getExpandoButtons(root);
    if (!buttons.length) {
      return;
    }

    const now = Date.now();

    buttons.forEach(button => {
      const label = button.querySelector('h2.__menu-label')?.textContent?.trim() || '';
      const sectionKey = detectSectionKeyFromLabel(label);
      if (!sectionKey || userTouched.has(sectionKey)) {
        return;
      }

      const desiredExpanded = !!desired[sectionKey];
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      if (isExpanded === desiredExpanded) {
        lastApplied.delete(sectionKey);
        return;
      }

      const previous = lastApplied.get(sectionKey);
      if (previous && previous.desired === desiredExpanded && now - previous.at < COOLDOWN_MS) {
        return;
      }

      lastApplied.set(sectionKey, { desired: desiredExpanded, at: now });
      log('Toggling section', sectionKey, 'to', desiredExpanded ? 'expanded' : 'collapsed');
      button.click();
    });
  }

  function armGlobalObserver() {
    if (observer) return;
    const root = document.documentElement || document.body;
    if (!root) return;

    observer = new MutationObserver(() => {
      scheduleApply();
    });

    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-expanded']
    });
  }

  function attachSidebarOpenClickHook() {
    document.addEventListener(
      'click',
      event => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const button = target.closest(
          'button[aria-label="Open sidebar"][aria-controls="stage-slideover-sidebar"], button[data-testid="close-sidebar-button"]'
        );

        if (!button) {
          return;
        }

        scheduleApply(0);
        scheduleApply(350);
      },
      true
    );

    document.addEventListener(
      'click',
      event => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }

        const sectionButton = target.closest('div[class*="group/sidebar-expando-section"] > button[aria-expanded]');
        if (!sectionButton) {
          return;
        }

        const label = sectionButton.querySelector('h2.__menu-label')?.textContent?.trim() || '';
        const sectionKey = detectSectionKeyFromLabel(label);
        if (sectionKey) {
          userTouched.add(sectionKey);
        }
      },
      true
    );
  }

  function attachStorageListener() {
    if (typeof chrome === 'undefined' || !chrome?.storage?.onChanged) {
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync' && areaName !== 'local') {
        return;
      }

      let changed = false;

      if (changes[STORAGE_KEYS.projects]) {
        desiredState.projects = normalizeBoolean(changes[STORAGE_KEYS.projects].newValue, DEFAULTS.projects);
        userTouched.delete('projects');
        changed = true;
      }

      if (changes[STORAGE_KEYS.yourChats]) {
        desiredState.yourChats = normalizeBoolean(changes[STORAGE_KEYS.yourChats].newValue, DEFAULTS.yourChats);
        userTouched.delete('yourChats');
        changed = true;
      }

      if (changes[STORAGE_KEYS.groupChats]) {
        desiredState.groupChats = normalizeBoolean(changes[STORAGE_KEYS.groupChats].newValue, DEFAULTS.groupChats);
        userTouched.delete('groupChats');
        changed = true;
      }

      if (changed) {
        scheduleApply(0);
      }
    });
  }

  async function init() {
    desiredState = await getSettingValues();
    armGlobalObserver();
    attachSidebarOpenClickHook();
    attachStorageListener();
    scheduleApply(0);
    scheduleApply(450);
    scheduleApply(1200);
  }

  init();
})();
