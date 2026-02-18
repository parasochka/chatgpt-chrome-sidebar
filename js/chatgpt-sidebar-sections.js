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

  const COOLDOWN_MS = 800;
  const SECTION_TOGGLE_BUTTON_SELECTOR = 'div[class*="group/sidebar-expando-section"] > button[aria-expanded]';
  const SECTION_TOGGLE_ICON_SUFFIX = '#d3876b';
  const SECTION_ORDER = ['projects', 'groupChats', 'yourChats'];
  const SECTION_LABEL_KEYWORDS = {
    projects: [
      'project',
      'projects',
      'proyecto',
      'proyectos',
      'projet',
      'projets',
      'projekt',
      'projekte',
      'projekty',
      'projecten',
      'progetto',
      'progetti',
      'projeto',
      'projetos',
      'projekter',
      'prosjekt',
      'prosjekter',
      'projekti',
      'projektit',
      'proje',
      'projeler',
      'έργο',
      'έργα',
      'проект',
      'проекты',
      'проєкт',
      'проєкти',
      'مشروع',
      'مشاريع',
      'פרויקט',
      'פרויקטים',
      'परियोजना',
      'परियोजनाएं',
      'প্রকল্প',
      'প্রকল্পসমূহ',
      'โครงการ',
      'โครงการต่างๆ',
      'dựán',
      'duan',
      'proyek',
      'projek',
      'プロジェクト',
      '프로젝트',
      '项目',
      '項目'
    ],
    groupChats: [
      'group',
      'groups',
      'grupo',
      'grupos',
      'groupe',
      'groupes',
      'gruppe',
      'gruppen',
      'groep',
      'groepen',
      'gruppo',
      'gruppi',
      'grupa',
      'grupy',
      'skupina',
      'skupiny',
      'grupp',
      'grupper',
      'ryhmä',
      'ryhmät',
      'grup',
      'gruplar',
      'ομάδα',
      'ομάδες',
      'группа',
      'группы',
      'групповой',
      'групповые',
      'група',
      'групи',
      'груповий',
      'групові',
      'مجموعة',
      'مجموعات',
      'קבוצה',
      'קבוצות',
      'קבוצתי',
      'קבוצתיות',
      'समूह',
      'समूहों',
      'ग्रुप',
      'ग्रुप्स',
      'গ্রুপ',
      'গ্রুপসমূহ',
      'กลุ่ม',
      'nhóm',
      'kelompok',
      'kumpulan',
      'グループ',
      '그룹',
      '组',
      '群组',
      '群組'
    ],
    yourChats: [
      'chat',
      'chats',
      'conversación',
      'conversaciones',
      'discussion',
      'discussions',
      'unterhaltung',
      'unterhaltungen',
      'conversazione',
      'conversazioni',
      'conversa',
      'conversas',
      'gesprek',
      'gesprekken',
      'czat',
      'czaty',
      'konverzace',
      'konverzací',
      'chatt',
      'chattar',
      'chatte',
      'chatter',
      'keskustelu',
      'keskustelut',
      'sohbet',
      'sohbetler',
      'συνομιλία',
      'συνομιλίες',
      'чат',
      'чаты',
      'чати',
      'دردشة',
      'دردشات',
      'צ׳אט',
      'צ׳אטים',
      'שיחה',
      'שיחות',
      'चैट',
      'चैट्स',
      'চ্যাট',
      'চ্যাটসমূহ',
      'แชท',
      'tròchuyện',
      'trochuyen',
      'obrolan',
      'sembang',
      'チャット',
      '채팅',
      '대화',
      '聊天',
      '對話'
    ]
  };

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
    const hasSectionToggleButtons = node => !!node?.querySelector(SECTION_TOGGLE_BUTTON_SELECTOR);

    const stageSidebar = document.getElementById('stage-slideover-sidebar');
    if (stageSidebar) {
      const stagedNavs = Array.from(stageSidebar.querySelectorAll('nav'));
      const stagedMatch = stagedNavs.find(hasSectionToggleButtons);
      if (stagedMatch) {
        return stagedMatch;
      }
    }

    const allNavs = Array.from(document.querySelectorAll('nav'));
    return allNavs.find(hasSectionToggleButtons) || null;
  }

  function buttonHasSectionToggleIcon(button) {
    if (!button) return false;
    const iconUse = button.querySelector('use[href], use[xlink\\:href]');
    if (!iconUse) return false;

    const href = iconUse.getAttribute('href') || iconUse.getAttribute('xlink:href') || '';
    return href.endsWith(SECTION_TOGGLE_ICON_SUFFIX);
  }

  function isLikelySectionToggleButton(button) {
    return !!detectSectionKeyFromButton(button);
  }

  function getSectionToggleButtons(root) {
    if (!root) return [];

    const allCandidates = Array.from(root.querySelectorAll(SECTION_TOGGLE_BUTTON_SELECTOR));
    if (!allCandidates.length) {
      return [];
    }

    const localizedMatchedButtons = allCandidates.filter(isLikelySectionToggleButton);
    const iconAndLocalizedMatchedButtons = localizedMatchedButtons.filter(buttonHasSectionToggleIcon);
    if (iconAndLocalizedMatchedButtons.length) {
      return iconAndLocalizedMatchedButtons;
    }

    if (localizedMatchedButtons.length) {
      return localizedMatchedButtons;
    }

    const iconMatchedButtons = allCandidates.filter(buttonHasSectionToggleIcon);
    return iconMatchedButtons.length ? iconMatchedButtons : allCandidates;
  }

  function getSectionButtons(root) {
    const buttons = getSectionToggleButtons(root);
    if (!buttons.length) {
      return new Map();
    }

    const byKey = new Map();
    const usedButtons = new Set();

    buttons.forEach(button => {
      const sectionKey = detectSectionKeyFromButton(button);
      if (!sectionKey || byKey.has(sectionKey)) {
        return;
      }

      byKey.set(sectionKey, button);
      usedButtons.add(button);
    });

    if (byKey.size === SECTION_ORDER.length) {
      return byKey;
    }

    const canUsePositionalFallback = byKey.size === 0 || buttons.length === SECTION_ORDER.length;
    if (!canUsePositionalFallback) {
      return byKey;
    }

    SECTION_ORDER.forEach((key, index) => {
      if (byKey.has(key)) {
        return;
      }

      const button = buttons[index];
      if (button && !usedButtons.has(button)) {
        byKey.set(key, button);
        usedButtons.add(button);
      }
    });

    return byKey;
  }

  function normalizeLabel(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFKC')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function detectSectionKeyFromText(text) {
    const normalizedText = normalizeLabel(text);
    if (!normalizedText) {
      return null;
    }

    for (const [key, keywords] of Object.entries(SECTION_LABEL_KEYWORDS)) {
      const matched = keywords.some(keyword => {
        const normalizedKeyword = normalizeLabel(keyword);
        return (
          normalizedText === normalizedKeyword ||
          normalizedText.includes(normalizedKeyword) ||
          normalizedKeyword.includes(normalizedText)
        );
      });

      if (matched) {
        return key;
      }
    }

    return null;
  }

  function detectSectionKeyFromButton(button) {
    if (!button) {
      return null;
    }

    const labelCandidates = [
      button.querySelector('h2.__menu-label')?.textContent,
      button.querySelector('h2, h3, h4, [role="heading"]')?.textContent,
      button.getAttribute('aria-label'),
      button.getAttribute('aria-labelledby')
        ? document.getElementById(button.getAttribute('aria-labelledby'))?.textContent
        : null,
      button.getAttribute('data-testid'),
      button.textContent
    ];

    for (const candidate of labelCandidates) {
      const sectionKey = detectSectionKeyFromText(candidate || '');
      if (sectionKey) {
        return sectionKey;
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

    const sectionButtons = getSectionButtons(root);
    if (!sectionButtons.size) {
      return;
    }

    const now = Date.now();

    SECTION_ORDER.forEach(sectionKey => {
      const button = sectionButtons.get(sectionKey);
      if (!button || userTouched.has(sectionKey)) {
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
          'button[aria-controls="stage-slideover-sidebar"], button[data-testid="close-sidebar-button"]'
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

        const sectionButton = target.closest(SECTION_TOGGLE_BUTTON_SELECTOR);
        if (!sectionButton) {
          return;
        }

        const root = sectionButton.closest('nav') || getSidebarRoot();
        if (!root) {
          return;
        }

        const sectionButtons = getSectionButtons(root);
        const sectionKey = SECTION_ORDER.find(key => sectionButtons.get(key) === sectionButton) || null;
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
