const SIDELY_THEME_MESSAGE = 'sidely-theme-change';
const SIDELY_TOGGLE_KEYS = {
  expandProjects: 'sidelyExpandProjects',
  expandCharts: 'sidelyExpandCharts',
  expandChats: 'sidelyExpandChats'
};

const SIDELY_TOGGLE_DEFAULTS = {
  expandProjects: true,
  expandCharts: true,
  expandChats: true
};

const SIDELY_SECTION_LABELS = {
  expandProjects: [
    'projects',
    'project',
    'проекты',
    'projets',
    'proyecto',
    'projetos',
    'プロジェクト',
    '프로젝트',
    '项目'
  ],
  expandCharts: [
    'your chats',
    'ваши чаты',
    'vos discussions',
    'tus conversaciones',
    'suas conversas',
    'deine chats',
    'le tue chat',
    'あなたのチャット',
    '내 채팅',
    '你的聊天'
  ],
  expandChats: [
    'group chats',
    'gruppenchats',
    'chats de groupe',
    'chats de grupo',
    'chat di gruppo',
    'chats em grupo',
    'групповые чаты',
    'グループチャット',
    '그룹 채팅',
    '群聊'
  ]
};

function getSidelyStorageArea() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
    return chrome.storage.sync;
  }
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return chrome.storage.local;
  }
  return null;
}

function sidelyStorageGet(keys) {
  return new Promise(resolve => {
    const storageArea = getSidelyStorageArea();
    if (!storageArea) {
      const results = {};
      if (Array.isArray(keys) && typeof window !== 'undefined' && window?.localStorage) {
        keys.forEach(key => {
          const value = window.localStorage.getItem(key);
          if (value !== null) {
            results[key] = value;
          }
        });
      }
      resolve(results);
      return;
    }

    try {
      storageArea.get(keys, items => resolve(items || {}));
    } catch (_) {
      resolve({});
    }
  });
}

function normalizeToggleValue(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

let sidelyToggleState = { ...SIDELY_TOGGLE_DEFAULTS };
let sidelySidebarObserver = null;

function normalizeLabelText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function getCandidateToggleButtons() {
  return Array.from(document.querySelectorAll('[aria-expanded]')).filter(el => {
    if (!(el instanceof Element)) return false;
    return el.matches('button,[role="button"],[data-testid]');
  });
}

function getLabelCandidates(element) {
  if (!element) return [];
  const container = element.closest?.('li, [role="treeitem"], [data-testid], nav, aside');
  return [
    element.textContent,
    element.getAttribute?.('aria-label'),
    element.getAttribute?.('title'),
    container?.textContent,
    container?.getAttribute?.('aria-label'),
    container?.getAttribute?.('title')
  ].filter(Boolean);
}

function triggerClick(element) {
  if (!element) return;
  try {
    element.click();
    return;
  } catch (_) {}
  try {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    element.dispatchEvent(event);
  } catch (_) {}
}

function matchesSectionLabel(element, labels) {
  const candidates = getLabelCandidates(element)
    .map(text => normalizeLabelText(text))
    .filter(Boolean);
  if (candidates.length === 0) return false;
  return labels.some(label => {
    const normalized = normalizeLabelText(label);
    return candidates.some(text => text.includes(normalized));
  });
}

function applySectionToggle(key) {
  const shouldExpand = Boolean(sidelyToggleState[key]);
  const labels = SIDELY_SECTION_LABELS[key] || [];
  const buttons = getCandidateToggleButtons().filter(btn => matchesSectionLabel(btn, labels));
  const desiredState = shouldExpand ? 'true' : 'false';

  buttons.forEach(button => {
    const expanded = button.getAttribute('aria-expanded');
    if (expanded === null) return;
    if (expanded !== desiredState) {
      triggerClick(button);
    }
    if (button.getAttribute('aria-expanded') === desiredState) {
      button.dataset.sidelyDefaultApplied = desiredState;
    } else {
      delete button.dataset.sidelyDefaultApplied;
      setTimeout(() => {
        if (button.getAttribute('aria-expanded') === desiredState) {
          button.dataset.sidelyDefaultApplied = desiredState;
        }
      }, 150);
    }
  });
}

function applySidelySidebarDefaults() {
  Object.keys(SIDELY_SECTION_LABELS).forEach(key => applySectionToggle(key));
}

async function loadSidelySidebarDefaults() {
  const keys = Object.values(SIDELY_TOGGLE_KEYS);
  const stored = await sidelyStorageGet(keys);
  sidelyToggleState = {
    expandProjects: normalizeToggleValue(stored[SIDELY_TOGGLE_KEYS.expandProjects], SIDELY_TOGGLE_DEFAULTS.expandProjects),
    expandCharts: normalizeToggleValue(stored[SIDELY_TOGGLE_KEYS.expandCharts], SIDELY_TOGGLE_DEFAULTS.expandCharts),
    expandChats: normalizeToggleValue(stored[SIDELY_TOGGLE_KEYS.expandChats], SIDELY_TOGGLE_DEFAULTS.expandChats)
  };
  applySidelySidebarDefaults();
  if (!sidelySidebarObserver && typeof MutationObserver !== 'undefined') {
    sidelySidebarObserver = new MutationObserver(() => applySidelySidebarDefaults());
    sidelySidebarObserver.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true
    });
  }
}

function canUseAsyncClipboard() {
  try {
    const policy = document.permissionsPolicy || document.featurePolicy;
    if (policy && typeof policy.allowsFeature === 'function') {
      if (!policy.allowsFeature('clipboard-write')) return false;
    }
  } catch (_) {
    return false;
  }
  return !!(navigator.clipboard && navigator.clipboard.writeText);
}

async function copyTextSafe(text) {
  if (canUseAsyncClipboard()) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {}
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly','');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    const activeElement = document.activeElement;
    const selection = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
    const storedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (storedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(storedRange);
    }
    if (activeElement && typeof activeElement.focus === 'function') {
      activeElement.focus();
    }
    if (ok) return true;
  } catch (__){}

  return false;
}

function getCodeTextFromButton(btn) {
  const scope =
    btn.closest('[data-testid="code"]') ||
    btn.closest('pre, code, article, section') ||
    document;

  let codeEl =
    scope.querySelector('pre code') ||
    scope.querySelector('code') ||
    null;

  if (!codeEl) {
    const prev = btn.previousElementSibling?.querySelector?.('code') || btn.previousElementSibling;
    const next = btn.nextElementSibling?.querySelector?.('code') || btn.nextElementSibling;
    if (prev && prev.tagName === 'CODE') codeEl = prev;
    else if (next && next.tagName === 'CODE') codeEl = next;
  }
  return (codeEl?.textContent || '').trim();
}

let lastHandledAt = 0;
document.addEventListener('click', async (e) => {
  const t = e.target;
  const btn = t && (t.closest('button,[role="button"],[data-testid]') || null);
  if (!btn) return;

  const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
  const title = (btn.getAttribute('title') || '').toLowerCase();
  const txt = (btn.textContent || '').toLowerCase();

  const looksLikeCopy =
    aria.includes('copy') ||
    title.includes('copy') ||
    /copy|clipboard/.test(txt) ||
    btn.matches('[data-testid="copy"],[data-testid="code-copy"],[data-testid="clipboard"]');

  const inCode = !!btn.closest('[data-testid="code"], pre, code');
  if (!looksLikeCopy || !inCode) return;

  if (Date.now() - lastHandledAt < 500) return; // prevent double-processing

  const text = getCodeTextFromButton(btn);
  if (!text) return;

  const ok = await copyTextSafe(text);
  if (ok) {
    lastHandledAt = Date.now();
    e.stopImmediatePropagation();
    e.preventDefault();

    const original = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = original; }, 1000);
  }
}, true);

function applySidelyInjectedTheme(theme) {
  const root = document.documentElement;
  if (!root) return;
  const next = theme === 'dark' ? 'dark' : 'light';
  root.setAttribute('data-theme', next);
  root.dataset.sidelyTheme = next;
  root.style.setProperty('color-scheme', next);
  if (root.classList) {
    root.classList.toggle('dark', next === 'dark');
    root.classList.toggle('light', next === 'light');
  }
  try {
    window.localStorage.setItem('theme', next);
    window.localStorage.setItem('preferred-theme', next);
  } catch (_) {}
  try {
    document.cookie = `oai/apps/theme=${next}; path=/; max-age=31536000`;
  } catch (_) {}
}

window.addEventListener('message', event => {
  if (!event || !event.data || event.data.type !== SIDELY_THEME_MESSAGE) {
    return;
  }
  if (!event.origin || !event.origin.startsWith('chrome-extension://')) {
    return;
  }
  applySidelyInjectedTheme(event.data.theme);
});

if (typeof chrome !== 'undefined' && chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' && areaName !== 'local') {
      return;
    }
    const relevant = Object.values(SIDELY_TOGGLE_KEYS).some(key => key in changes);
    if (relevant) {
      loadSidelySidebarDefaults();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSidelySidebarDefaults, { once: true });
} else {
  loadSidelySidebarDefaults();
}
