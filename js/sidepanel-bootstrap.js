// js/sidepanel-bootstrap.js

const FALLBACK_MESSAGES = {
  appTitle: 'Sidely - ChatGPT Sidebar',
  refreshButtonAriaLabel: 'Refresh chats',
  refreshButtonDefaultLabel: 'Update Chats',
  refreshButtonLoadingLabel: 'Updating...',
  refreshButtonTooltip: 'Reload sidebar to show new chats.',
  settingsCloseLabel: 'Close sidebar',
  settingsTitle: 'Settings',
  homeButtonAriaLabel: 'Home',
  settingsButtonAriaLabel: 'Settings',
  settingsExtensionLanguageTitle: 'Extension language',
  settingsExtensionLanguageHint: 'Switch the Sidely interface language instantly.',
  settingsLanguageEnglish: 'English',
  settingsLanguageChineseChina: '中文',
  settingsLanguageFrench: 'Français',
  settingsLanguageHindi: 'हिन्दी',
  settingsLanguagePortugueseBrazil: 'Português',
  settingsLanguageRussian: 'Русский',
  settingsLanguageSpanish: 'Español',
  settingsLanguageGerman: 'Deutsch',
  settingsLanguageItalian: 'Italiano',
  settingsLanguageJapanese: '日本語',
  settingsThemeTitle: 'Theme',
  settingsThemeHint: 'Choose a light, dark, or auto theme for the sidebar.',
  settingsThemeAuto: 'Auto (match system)',
  settingsThemeLight: 'Light',
  settingsThemeDark: 'Dark',
  settingsSidebarDefaultsTitle: 'Sidebar defaults',
  settingsSidebarDefaultsHint: 'Control which sections start expanded in the ChatGPT sidebar.',
  settingsExpandProjectsLabel: 'Projects expanded by default',
  settingsExpandChartsLabel: 'Your chats expanded by default',
  settingsExpandChatsLabel: 'Group chats expanded by default',
  noticeCloudflare: 'You need to complete the Cloudflare check. Open __PORTAL__ in a tab, sign in, then return.',
  noticeUnauthorized: 'You need to sign in to your ChatGPT account. Open __PORTAL__ in a tab, sign in, then return.',
  noticeError: 'Session verification failed. Try refreshing the page or sign in at __PORTAL__.'
};

const DEFAULT_LANGUAGE = 'en';

const LOCALE_FOLDER_BY_LANGUAGE = {
  en: 'en',
  es: 'es',
  fr: 'fr',
  hi: 'hi',
  'pt-BR': 'pt_BR',
  ru: 'ru',
  'zh-CN': 'zh_CN',
  de: 'de',
  it: 'it',
  ja: 'ja'
};

let activeLocaleId = null;
let activeLocaleMessages = null;

let APP_TITLE = FALLBACK_MESSAGES.appTitle;
let REFRESH_LABEL_DEFAULT = FALLBACK_MESSAGES.refreshButtonDefaultLabel;
let REFRESH_LABEL_LOADING = FALLBACK_MESSAGES.refreshButtonLoadingLabel;
let REFRESH_BUTTON_ARIA_LABEL = FALLBACK_MESSAGES.refreshButtonAriaLabel;
let REFRESH_BUTTON_TOOLTIP = FALLBACK_MESSAGES.refreshButtonTooltip;
let SETTINGS_CLOSE_LABEL = FALLBACK_MESSAGES.settingsCloseLabel;
let SETTINGS_TITLE = FALLBACK_MESSAGES.settingsTitle;
let HOME_BUTTON_ARIA_LABEL = FALLBACK_MESSAGES.homeButtonAriaLabel;
let SETTINGS_BUTTON_ARIA_LABEL = FALLBACK_MESSAGES.settingsButtonAriaLabel;

function getRuntimeAssetURL(path) {
  if (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) {
    return chrome.runtime.getURL(path);
  }
  return path;
}

function getMessageFromActiveLocale(key) {
  if (!activeLocaleMessages || typeof key !== 'string') {
    return null;
  }
  const entry = activeLocaleMessages[key];
  if (!entry || typeof entry.message !== 'string') {
    return null;
  }
  return entry.message;
}

function applyMessageSubstitutions(base, substitutions) {
  if (typeof base !== 'string') {
    return base;
  }
  if (typeof substitutions === 'undefined') {
    return base;
  }

  const values = Array.isArray(substitutions) ? substitutions : [substitutions];

  return values.reduce((result, value, index) => {
    if (typeof value !== 'string') {
      return result;
    }

    const placeholderIndex = index + 1;
    const placeholderPattern = new RegExp(`\\$${placeholderIndex}`, 'g');

    return result
      .replace(/__PORTAL__/g, value)
      .replace(placeholderPattern, value);
  }, base);
}

function getLocalizedString(key, fallback, substitutions) {
  const localeMessage = getMessageFromActiveLocale(key);
  if (typeof localeMessage === 'string' && localeMessage.length) {
    return applyMessageSubstitutions(localeMessage, substitutions);
  }

  if (typeof chrome !== 'undefined' && chrome?.i18n?.getMessage) {
    try {
      const chromeMessage = chrome.i18n.getMessage(key, substitutions);
      if (typeof chromeMessage === 'string' && chromeMessage.length) {
        return chromeMessage;
      }
    } catch (err) {
      // ignore and fall back
    }
  }

  if (typeof fallback !== 'string') {
    return fallback;
  }
  return applyMessageSubstitutions(fallback, substitutions);
}

function refreshCachedLocaleStrings() {
  APP_TITLE = getLocalizedString('appTitle', FALLBACK_MESSAGES.appTitle);
  REFRESH_LABEL_DEFAULT = getLocalizedString('refreshButtonDefaultLabel', FALLBACK_MESSAGES.refreshButtonDefaultLabel);
  REFRESH_LABEL_LOADING = getLocalizedString('refreshButtonLoadingLabel', FALLBACK_MESSAGES.refreshButtonLoadingLabel);
  REFRESH_BUTTON_ARIA_LABEL = getLocalizedString('refreshButtonAriaLabel', FALLBACK_MESSAGES.refreshButtonAriaLabel);
  REFRESH_BUTTON_TOOLTIP = getLocalizedString('refreshButtonTooltip', FALLBACK_MESSAGES.refreshButtonTooltip);
  SETTINGS_CLOSE_LABEL = getLocalizedString('settingsCloseLabel', FALLBACK_MESSAGES.settingsCloseLabel);
  SETTINGS_TITLE = getLocalizedString('settingsTitle', FALLBACK_MESSAGES.settingsTitle);
  HOME_BUTTON_ARIA_LABEL = getLocalizedString('homeButtonAriaLabel', FALLBACK_MESSAGES.homeButtonAriaLabel);
  SETTINGS_BUTTON_ARIA_LABEL = getLocalizedString('settingsButtonAriaLabel', FALLBACK_MESSAGES.settingsButtonAriaLabel);
}

function getLocaleFolderFromLanguage(language) {
  if (typeof language !== 'string') {
    return null;
  }
  const normalized = language in LOCALE_FOLDER_BY_LANGUAGE ? language : normalizeLanguage(language);
  return LOCALE_FOLDER_BY_LANGUAGE[normalized] || null;
}

async function ensureActiveLocaleMessages(language) {
  const desiredFolder = getLocaleFolderFromLanguage(language) || LOCALE_FOLDER_BY_LANGUAGE[DEFAULT_LANGUAGE];
  if (!desiredFolder) {
    activeLocaleMessages = null;
    activeLocaleId = null;
    return;
  }

  if (activeLocaleId === desiredFolder && activeLocaleMessages) {
    return;
  }

  const localeUrl = getRuntimeAssetURL(`_locales/${desiredFolder}/messages.json`);
  try {
    const response = await fetch(localeUrl, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load locale ${desiredFolder}`);
    }
    const messages = await response.json();
    activeLocaleId = desiredFolder;
    activeLocaleMessages = messages;
  } catch (error) {
    console.warn('Unable to load locale file', desiredFolder, error);
    if (desiredFolder !== LOCALE_FOLDER_BY_LANGUAGE[DEFAULT_LANGUAGE]) {
      await ensureActiveLocaleMessages(DEFAULT_LANGUAGE);
    } else {
      activeLocaleMessages = null;
      activeLocaleId = null;
    }
  }
}

const CHATGPT_PORTAL = 'https://chatgpt.com';
const PORTAL_PROBE_TIMEOUT_MS = 8000;

let lastRequestedIframeSrc = '';
let toolbarInitialized = false;
const REFRESH_BUTTON_TIMEOUT_MS = 15000;
let refreshButtonResetTimeoutId = null;
const STORAGE_KEYS = {
  language: 'sidelyExtensionLanguage',
  themeMode: 'sidelyThemeMode',
  expandProjects: 'sidelyExpandProjects',
  expandCharts: 'sidelyExpandCharts',
  expandChats: 'sidelyExpandChats'
};

const ALLOWED_LANGUAGES = Object.keys(LOCALE_FOLDER_BY_LANGUAGE);
const THEME_MODES = ['auto', 'light', 'dark'];
const THEME_MESSAGE_TYPE = 'sidely-theme-change';

const SETTINGS_DEFAULTS = {
  language: DEFAULT_LANGUAGE,
  themeMode: 'auto',
  expandProjects: true,
  expandCharts: true,
  expandChats: true
};

let settingsState = { ...SETTINGS_DEFAULTS };
let portalLoadRunId = 0;
let languageSelectionRunId = 0;
let settingsControlsInitialized = false;
let systemColorSchemeMediaQuery = null;
let lastSyncedIframeTheme = null;

function getChatIframe() {
  return document.getElementById('gpt-frame');
}

function getRefreshButton() {
  return document.getElementById('refresh-button');
}

function getSettingsPanel() {
  return document.getElementById('settings-panel');
}

function getPortalContainer() {
  return document.getElementById('portal-container');
}

function getBodyElement() {
  return document.body || document.querySelector('body');
}

function initializeSystemThemeWatcher() {
  if (systemColorSchemeMediaQuery || typeof window === 'undefined' || !window.matchMedia) {
    return;
  }
  systemColorSchemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (settingsState.themeMode === 'auto') {
      applyThemeMode('auto');
    }
  };
  if (typeof systemColorSchemeMediaQuery.addEventListener === 'function') {
    systemColorSchemeMediaQuery.addEventListener('change', handler);
  } else if (typeof systemColorSchemeMediaQuery.addListener === 'function') {
    systemColorSchemeMediaQuery.addListener(handler);
  }
}

function getSystemPrefersDark() {
  if (systemColorSchemeMediaQuery) {
    return systemColorSchemeMediaQuery.matches;
  }
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getEffectiveTheme(mode) {
  const normalized = normalizeThemeMode(mode);
  if (normalized === 'dark' || normalized === 'light') {
    return normalized;
  }
  return getSystemPrefersDark() ? 'dark' : 'light';
}

function syncDocumentColorScheme(theme) {
  const root = document.documentElement;
  if (!root) return;
  root.style.setProperty('color-scheme', theme === 'dark' ? 'dark' : 'light');
}

function syncChatIframeTheme(theme, force = false) {
  const iframe = getChatIframe();
  if (!iframe || !iframe.contentWindow) {
    if (force) {
      lastSyncedIframeTheme = null;
    }
    return;
  }
  const resolved = theme === 'dark' ? 'dark' : 'light';
  if (!force && lastSyncedIframeTheme === resolved) {
    return;
  }
  lastSyncedIframeTheme = resolved;
  try {
    iframe.contentWindow.postMessage({ type: THEME_MESSAGE_TYPE, theme: resolved }, '*');
  } catch (err) {
    // Cross-origin iframe might block direct messaging; ignore silently.
  }
}

function setRefreshButtonLoading(isLoading) {
  const button = getRefreshButton();
  if (!button) return;

  if (refreshButtonResetTimeoutId !== null) {
    clearTimeout(refreshButtonResetTimeoutId);
    refreshButtonResetTimeoutId = null;
  }

  if (isLoading) {
    refreshButtonResetTimeoutId = window.setTimeout(() => {
      refreshButtonResetTimeoutId = null;
      setRefreshButtonLoading(false);
    }, REFRESH_BUTTON_TIMEOUT_MS);
  }

  button.classList.toggle('is-loading', isLoading);
  button.dataset.loading = isLoading ? 'true' : 'false';
  button.setAttribute('aria-disabled', isLoading ? 'true' : 'false');
  button.disabled = Boolean(isLoading);
  button.tabIndex = isLoading ? -1 : 0;

  const label = button.querySelector('.toolbar-btn__label-content') || button.querySelector('.toolbar-btn__label');
  if (label) {
    label.textContent = isLoading ? REFRESH_LABEL_LOADING : REFRESH_LABEL_DEFAULT;
  }
}

function setElementTextWithLink(target, message, link, linkText) {
  if (!target) return;

  target.textContent = '';

  if (!message) {
    return;
  }

  const resolvedLinkText = linkText || link?.textContent || '';

  if (!link || !resolvedLinkText) {
    target.append(message);
    return;
  }

  const index = message.indexOf(resolvedLinkText);
  link.textContent = resolvedLinkText;

  if (index === -1) {
    target.append(message);
    if (message && !/\s$/.test(message)) {
      target.append(' ');
    }
    target.append(link);
    return;
  }

  if (index > 0) {
    target.append(message.slice(0, index));
  }

  target.append(link);

  const after = message.slice(index + resolvedLinkText.length);
  if (after) {
    target.append(after);
  }
}

function detectBrowserUILanguage() {
  if (typeof chrome === 'undefined' || !chrome?.i18n) {
    return null;
  }

  if (typeof chrome.i18n.getUILanguage === 'function') {
    const tag = chrome.i18n.getUILanguage();
    if (tag) {
      return tag;
    }
  }

  if (typeof chrome.i18n.getMessage === 'function') {
    const tag = chrome.i18n.getMessage('@@ui_locale');
    if (tag) {
      return tag;
    }
  }

  return null;
}

function getDocumentLanguageTag() {
  if (settingsState?.language) {
    return settingsState.language;
  }
  const detected = detectBrowserUILanguage();
  if (typeof detected === 'string' && detected.length) {
    return detected.replace('_', '-');
  }
  return DEFAULT_LANGUAGE;
}

function applyLocalization() {
  refreshCachedLocaleStrings();
  const languageTag = getDocumentLanguageTag();
  if (languageTag && document?.documentElement) {
    document.documentElement.setAttribute('lang', languageTag.replace('_', '-'));
  }

  document.title = APP_TITLE;

  const refreshButton = getRefreshButton();
  if (refreshButton) {
    refreshButton.setAttribute('aria-label', REFRESH_BUTTON_ARIA_LABEL);

    const labelWrapper = refreshButton.querySelector('.toolbar-btn__label');
    if (labelWrapper) {
      labelWrapper.dataset.labelDefault = REFRESH_LABEL_DEFAULT;
      labelWrapper.dataset.labelLoading = REFRESH_LABEL_LOADING;
    }

    const labelContent = refreshButton.querySelector('.toolbar-btn__label-content');
    if (labelContent) {
      labelContent.textContent = REFRESH_LABEL_DEFAULT;
    }
  }

  const tooltip = document.getElementById('refresh-chat-tooltip');
  if (tooltip) {
    tooltip.textContent = REFRESH_BUTTON_TOOLTIP;
  }

  const settingsCloseButton = document.getElementById('settings-close-button');
  if (settingsCloseButton) {
    settingsCloseButton.setAttribute('aria-label', SETTINGS_CLOSE_LABEL);
  }

  const settingsTitle = document.querySelector('.settings-panel__title');
  if (settingsTitle) {
    settingsTitle.textContent = SETTINGS_TITLE;
  }

  const homeButton = document.getElementById('home-button');
  if (homeButton) {
    homeButton.setAttribute('aria-label', HOME_BUTTON_ARIA_LABEL);
  }

  const settingsButton = document.getElementById('settings-button');
  if (settingsButton) {
    settingsButton.setAttribute('aria-label', SETTINGS_BUTTON_ARIA_LABEL);
  }

  document.querySelectorAll('[data-i18n-key]').forEach(node => {
    const key = node.getAttribute('data-i18n-key');
    if (!key) return;
    const fallback = FALLBACK_MESSAGES[key] || node.textContent?.trim() || '';
    const message = getLocalizedString(key, fallback);
    if (typeof message === 'string' && message.length) {
      node.textContent = message;
    }
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(node => {
    const key = node.getAttribute('data-i18n-aria');
    if (!key) return;
    const fallback = FALLBACK_MESSAGES[key] || node.getAttribute('aria-label') || '';
    const message = getLocalizedString(key, fallback);
    if (typeof message === 'string' && message.length) {
      node.setAttribute('aria-label', message);
    }
  });
}

function reloadChatIframe() {
  const iframe = getChatIframe();
  if (!iframe) return;

  const nextSrc = iframe.dataset.currentSrc || iframe.src || lastRequestedIframeSrc;
  if (!nextSrc) return;

  lastRequestedIframeSrc = nextSrc;
  setRefreshButtonLoading(true);

  try {
    if (iframe.contentWindow && iframe.contentWindow.location && typeof iframe.contentWindow.location.reload === 'function') {
      iframe.contentWindow.location.reload();
      return;
    }
  } catch (err) {
    // Cross-origin navigation prevents direct reload; fall back to resetting the src attribute.
  }

  iframe.src = nextSrc;
}

function setupToolbarInteractions() {
  if (toolbarInitialized) return;
  toolbarInitialized = true;

  const iframe = getChatIframe();
  if (iframe) {
    iframe.addEventListener('load', () => {
      // Persist the last successfully loaded src so we can replay it later.
      iframe.dataset.currentSrc = iframe.src;
      setRefreshButtonLoading(false);
      syncChatIframeTheme(getEffectiveTheme(settingsState.themeMode), true);
    });
  }

  const refreshButton = getRefreshButton();
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      if (refreshButton.getAttribute('aria-disabled') === 'true') {
        return;
      }
      reloadChatIframe();
    });
  }

  const homeButton = document.getElementById('home-button');
  if (homeButton) {
    homeButton.addEventListener('click', () => {
      hideSettingsPanel();
      loadChatPortal();
    });
  }

  const settingsButton = document.getElementById('settings-button');
  const closeButton = document.getElementById('settings-close-button');

  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      if (isSettingsPanelVisible()) {
        hideSettingsPanel();
      } else {
        showSettingsPanel();
      }
    });
  }

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      hideSettingsPanel();
    });
  }

  setRefreshButtonLoading(false);
}

async function fetchPortalAuthState(base) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), PORTAL_PROBE_TIMEOUT_MS) : null;
  try {
    const res = await fetch(`${base}/api/auth/session`, {
      credentials: 'include', // important: include the session cookies
      headers: { 'accept': 'application/json' },
      ...(controller ? { signal: controller.signal } : {})
    });

    if (res.status === 403) {
      return { state: 'cloudflare', base };
    }

    if (!res.ok) {
      return { state: 'unauthorized', base };
    }

    const data = await res.json().catch(() => ({}));
    if (data && data.accessToken) {
      return { state: 'authorized', base };
    }
    return { state: 'unauthorized', base };
  } catch (e) {
    const timedOut = e?.name === 'AbortError';
    const label = timedOut ? 'timed out' : 'failed';
    console.warn(`Session check ${label} for`, base, e);
    return { state: 'error', base, error: e, timedOut };
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function mountPortalIntoIframe(base) {
  const iframe = getChatIframe();
  if (!iframe) return;
  // Load the root page; ChatGPT decides where to redirect
  const targetSrc = `${base}/`;
  lastRequestedIframeSrc = targetSrc;
  iframe.dataset.currentSrc = targetSrc;
  setRefreshButtonLoading(true);
  iframe.src = targetSrc;
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write; autoplay; microphone; camera');
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
}

function renderPortalNotice(state) {
  clearPortalNotice();

  // Simple overlay banner without external dependencies
  const root = document.createElement('div');
  root.setAttribute('data-portal-notice', '');
  root.style.position = 'absolute';
  root.style.top = '12px';
  root.style.left = '50%';
  root.style.transform = 'translateX(-50%)';
  root.style.display = 'flex';
  root.style.justifyContent = 'center';
  root.style.width = 'min(520px, calc(100% - 24px))';
  root.style.margin = '0 auto';
  root.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  root.style.textAlign = 'center';
  root.style.zIndex = '10';

  const box = document.createElement('div');
  box.style.width = '100%';
  box.style.lineHeight = '1.45';
  box.style.fontSize = '14px';
  box.style.background = 'rgba(255,255,255,0.95)';
  box.style.borderRadius = '12px';
  box.style.boxShadow = '0 6px 24px rgba(0,0,0,0.12)';
  box.style.padding = '16px 20px';

  const p = document.createElement('p');
  p.style.margin = '0 0 8px 0';

  const link = document.createElement('a');
  link.href = state.base;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const host = new URL(state.base).host;
  link.textContent = host;

  let messageKey = 'noticeError';
  let fallback = FALLBACK_MESSAGES.noticeError;

  if (state.state === 'cloudflare') {
    messageKey = 'noticeCloudflare';
    fallback = FALLBACK_MESSAGES.noticeCloudflare;
  } else if (state.state === 'unauthorized') {
    messageKey = 'noticeUnauthorized';
    fallback = FALLBACK_MESSAGES.noticeUnauthorized;
  }

  const message = getLocalizedString(messageKey, fallback, [host]);
  setElementTextWithLink(p, message, link, host);

  box.appendChild(p);
  root.appendChild(box);
  document.body.appendChild(root);
}

function clearPortalNotice() {
  const existingNotice = document.querySelector('[data-portal-notice]');
  if (existingNotice) {
    existingNotice.remove();
  }
}

function getStorageArea() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.sync) {
    return chrome.storage.sync;
  }
  if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
    return chrome.storage.local;
  }
  return null;
}

function storageGet(keys) {
  return new Promise(resolve => {
    const storageArea = getStorageArea();
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
      storageArea.get(keys, items => {
        if (chrome?.runtime?.lastError) {
          console.warn('storage.get failed', chrome.runtime.lastError);
        }
        resolve(items || {});
      });
    } catch (err) {
      console.warn('storage.get error', err);
      resolve({});
    }
  });
}

function storageSet(items) {
  return new Promise(resolve => {
    const storageArea = getStorageArea();
    if (!storageArea) {
      if (items && typeof window !== 'undefined' && window?.localStorage) {
        Object.entries(items).forEach(([key, value]) => {
          try {
            window.localStorage.setItem(key, value);
          } catch (err) {
            console.warn('localStorage.setItem failed', err);
          }
        });
      }
      resolve();
      return;
    }

    try {
      storageArea.set(items, () => {
        if (chrome?.runtime?.lastError) {
          console.warn('storage.set failed', chrome.runtime.lastError);
        }
        resolve();
      });
    } catch (err) {
      console.warn('storage.set error', err);
      resolve();
    }
  });
}

function normalizeLanguage(value) {
  if (typeof value !== 'string') {
    return SETTINGS_DEFAULTS.language;
  }
  const canonical = value.replace('_', '-');
  if (ALLOWED_LANGUAGES.includes(canonical)) {
    return canonical;
  }
  const base = canonical.split('-')[0];
  if (ALLOWED_LANGUAGES.includes(base)) {
    return base;
  }
  return SETTINGS_DEFAULTS.language;
}

function normalizeThemeMode(value) {
  if (typeof value !== 'string') {
    return SETTINGS_DEFAULTS.themeMode;
  }
  const normalized = value.toLowerCase();
  return THEME_MODES.includes(normalized) ? normalized : SETTINGS_DEFAULTS.themeMode;
}

function normalizeToggleValue(value, fallback) {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
}

function applyThemeMode(mode) {
  const body = getBodyElement();
  if (!body) return;
  initializeSystemThemeWatcher();
  const resolved = normalizeThemeMode(mode);
  body.classList.remove('theme-auto', 'theme-light', 'theme-dark');
  body.classList.add(`theme-${resolved}`);
  const effectiveTheme = getEffectiveTheme(resolved);
  if (body.dataset) {
    body.dataset.themeResolved = effectiveTheme;
  }
  syncDocumentColorScheme(effectiveTheme);
  syncChatIframeTheme(effectiveTheme);
}

async function loadSettingsFromStorage() {
  const stored = await storageGet(Object.values(STORAGE_KEYS));
  const nextState = { ...SETTINGS_DEFAULTS };

  if (typeof stored[STORAGE_KEYS.language] === 'string') {
    nextState.language = normalizeLanguage(stored[STORAGE_KEYS.language]);
  } else {
    const detected = detectBrowserUILanguage();
    if (detected) {
      nextState.language = normalizeLanguage(detected);
    }
  }

  if (typeof stored[STORAGE_KEYS.themeMode] === 'string') {
    nextState.themeMode = normalizeThemeMode(stored[STORAGE_KEYS.themeMode]);
  }

  nextState.expandProjects = normalizeToggleValue(
    stored[STORAGE_KEYS.expandProjects],
    SETTINGS_DEFAULTS.expandProjects
  );
  nextState.expandCharts = normalizeToggleValue(
    stored[STORAGE_KEYS.expandCharts],
    SETTINGS_DEFAULTS.expandCharts
  );
  nextState.expandChats = normalizeToggleValue(
    stored[STORAGE_KEYS.expandChats],
    SETTINGS_DEFAULTS.expandChats
  );

  settingsState = nextState;
  applyThemeMode(settingsState.themeMode);
}

function syncSettingsUI() {
  const languageSelect = document.getElementById('extension-language-select');
  if (languageSelect && settingsState.language) {
    languageSelect.value = settingsState.language;
  }

  const themeInputs = document.querySelectorAll('input[name="theme-mode"]');
  themeInputs.forEach(input => {
    input.checked = input.value === settingsState.themeMode;
  });

  const projectsToggle = document.getElementById('toggle-expand-projects');
  if (projectsToggle) {
    projectsToggle.checked = Boolean(settingsState.expandProjects);
  }
  const chartsToggle = document.getElementById('toggle-expand-charts');
  if (chartsToggle) {
    chartsToggle.checked = Boolean(settingsState.expandCharts);
  }
  const chatsToggle = document.getElementById('toggle-expand-chats');
  if (chatsToggle) {
    chatsToggle.checked = Boolean(settingsState.expandChats);
  }
}

async function setExtensionLanguage(value) {
  const normalized = normalizeLanguage(value);
  const runId = ++languageSelectionRunId;
  settingsState.language = normalized;
  await storageSet({ [STORAGE_KEYS.language]: normalized });
  await ensureActiveLocaleMessages(normalized);
  if (runId !== languageSelectionRunId) {
    return;
  }
  applyLocalization();
  syncSettingsUI();
}

function setupSettingsControls() {
  if (settingsControlsInitialized) return;
  settingsControlsInitialized = true;

  const languageSelect = document.getElementById('extension-language-select');
  if (languageSelect) {
    languageSelect.addEventListener('change', async event => {
      if (!(event.target instanceof HTMLSelectElement)) {
        return;
      }
      const value = normalizeLanguage(event.target.value);
      await setExtensionLanguage(value);
    });
  }

  const themeInputs = document.querySelectorAll('input[name="theme-mode"]');
  themeInputs.forEach(input => {
    input.addEventListener('change', event => {
      if (!event.target.checked) {
        return;
      }
      const value = normalizeThemeMode(event.target.value);
      settingsState.themeMode = value;
      applyThemeMode(value);
      storageSet({ [STORAGE_KEYS.themeMode]: value });
      if (value === 'light' || value === 'dark') {
        reloadChatIframe();
      }
    });
  });

  const expandProjectsToggle = document.getElementById('toggle-expand-projects');
  if (expandProjectsToggle) {
    expandProjectsToggle.addEventListener('change', event => {
      settingsState.expandProjects = Boolean(event.target.checked);
      storageSet({ [STORAGE_KEYS.expandProjects]: settingsState.expandProjects });
    });
  }

  const expandChartsToggle = document.getElementById('toggle-expand-charts');
  if (expandChartsToggle) {
    expandChartsToggle.addEventListener('change', event => {
      settingsState.expandCharts = Boolean(event.target.checked);
      storageSet({ [STORAGE_KEYS.expandCharts]: settingsState.expandCharts });
    });
  }

  const expandChatsToggle = document.getElementById('toggle-expand-chats');
  if (expandChatsToggle) {
    expandChatsToggle.addEventListener('change', event => {
      settingsState.expandChats = Boolean(event.target.checked);
      storageSet({ [STORAGE_KEYS.expandChats]: settingsState.expandChats });
    });
  }
}

function showSettingsPanel() {
  const portal = getPortalContainer();
  const panel = getSettingsPanel();
  const settingsButton = document.getElementById('settings-button');
  if (portal) {
    portal.hidden = true;
  }
  if (panel) {
    panel.hidden = false;
  }
  if (settingsButton) {
    settingsButton.setAttribute('aria-expanded', 'true');
  }
  syncSettingsUI();
}

function hideSettingsPanel() {
  const portal = getPortalContainer();
  const panel = getSettingsPanel();
  const settingsButton = document.getElementById('settings-button');
  if (portal) {
    portal.hidden = false;
  }
  if (panel) {
    panel.hidden = true;
  }
  if (settingsButton) {
    settingsButton.setAttribute('aria-expanded', 'false');
  }
}

function isSettingsPanelVisible() {
  const panel = getSettingsPanel();
  return Boolean(panel && panel.hidden === false);
}

async function loadChatPortal() {
  const runId = ++portalLoadRunId;
  setRefreshButtonLoading(true);

  let state;
  try {
    state = await fetchPortalAuthState(CHATGPT_PORTAL);
  } catch (err) {
    console.warn('Failed to check ChatGPT session', err);
  }

  const chosen = state || { state: 'error', base: CHATGPT_PORTAL };

  if (runId !== portalLoadRunId) {
    return;
  }

  mountPortalIntoIframe(chosen.base);

  if (chosen.state !== 'authorized') {
    renderPortalNotice(chosen);
  } else {
    clearPortalNotice();
  }
}

async function bootstrapSidepanel() {
  await loadSettingsFromStorage();
  await ensureActiveLocaleMessages(settingsState.language);
  applyLocalization();
  syncSettingsUI();
  setupSettingsControls();
  hideSettingsPanel();
  setupToolbarInteractions();
  await loadChatPortal();
}

document.addEventListener('DOMContentLoaded', bootstrapSidepanel);
