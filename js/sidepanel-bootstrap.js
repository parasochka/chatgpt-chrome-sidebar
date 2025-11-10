// js/sidepanel-bootstrap.js

const FALLBACK_MESSAGES = {
  appTitle: 'Sidely - ChatGPT Sidebar',
  refreshButtonDefault: 'Update Chats',
  refreshButtonLoading: 'Updating...',
  refreshButtonAriaLabel: 'Refresh chats',
  refreshButtonTooltip: 'Reload sidebar to show new chats.',
  noticeCloudflare: 'You need to complete the Cloudflare check. Open __PORTAL__ in a tab, sign in, then return.',
  noticeUnauthorized: 'You need to sign in to your ChatGPT account. Open __PORTAL__ in a tab, sign in, then return.',
  noticeError: 'Session verification failed. Try refreshing the page or sign in at __PORTAL__.'
};

function getLocalizedString(key, fallback, substitutions) {
  let message = null;

  if (typeof chrome !== 'undefined' && chrome?.i18n?.getMessage) {
    try {
      message = chrome.i18n.getMessage(key, substitutions);
    } catch (err) {
      message = null;
    }
  }

  let base = typeof message === 'string' && message.length ? message : fallback;
  if (typeof base !== 'string') {
    return fallback;
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

const APP_TITLE = getLocalizedString('appTitle', FALLBACK_MESSAGES.appTitle);
const REFRESH_LABEL_DEFAULT = getLocalizedString('refreshButtonDefaultLabel', FALLBACK_MESSAGES.refreshButtonDefault);
const REFRESH_LABEL_LOADING = getLocalizedString('refreshButtonLoadingLabel', FALLBACK_MESSAGES.refreshButtonLoading);
const REFRESH_BUTTON_ARIA_LABEL = getLocalizedString('refreshButtonAriaLabel', FALLBACK_MESSAGES.refreshButtonAriaLabel);
const REFRESH_BUTTON_TOOLTIP = getLocalizedString('refreshButtonTooltip', FALLBACK_MESSAGES.refreshButtonTooltip);

const CHATGPT_PORTALS = [
  'https://chat.openai.com',
  'https://chatgpt.com'
];

let lastRequestedIframeSrc = '';
let toolbarInitialized = false;
const REFRESH_BUTTON_TIMEOUT_MS = 15000;
let refreshButtonResetTimeoutId = null;

function getChatIframe() {
  return document.getElementById('gpt-frame');
}

function getRefreshButton() {
  return document.getElementById('refresh-chat-button');
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

function getUILanguageTag() {
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

function applyLocalization() {
  const languageTag = getUILanguageTag();
  if (languageTag && document?.documentElement) {
    document.documentElement.setAttribute('lang', languageTag.replace('_', '-'));
  }

  if (typeof APP_TITLE === 'string' && APP_TITLE.length) {
    document.title = APP_TITLE;
  }

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

  setRefreshButtonLoading(false);
}

async function fetchPortalAuthState(base) {
  try {
    const res = await fetch(`${base}/api/auth/session`, {
      credentials: 'include', // important: include the session cookies
      headers: { 'accept': 'application/json' }
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
    console.error('Session check failed for', base, e);
    return { state: 'error', base, error: e };
  }
}

function selectBestPortalCandidate(states) {
  // 1) look for an authorized session
  const ok = states.find(s => s.state === 'authorized');
  if (ok) return ok;
  // 2) if not found, take the first Cloudflare entry (the user must pass the check)
  const cf = states.find(s => s.state === 'cloudflare');
  if (cf) return cf;
  // 3) otherwise pick the first unauthorized/error entry
  return states[0] || { state: 'error', base: CHATGPT_PORTALS[0] };
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
  const existingNotice = document.querySelector('[data-portal-notice]');
  if (existingNotice) {
    existingNotice.remove();
  }

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

async function bootstrapSidepanel() {
  applyLocalization();
  setupToolbarInteractions();

  // Check both bases in parallel
  const checks = await Promise.all(CHATGPT_PORTALS.map(fetchPortalAuthState));
  const chosen = selectBestPortalCandidate(checks);

  // Always set the src so the user can sign in directly inside the iframe
  mountPortalIntoIframe(chosen.base);

  // If not authorized, show a hint
  if (chosen.state !== 'authorized') {
    renderPortalNotice(chosen);
  }
}

document.addEventListener('DOMContentLoaded', bootstrapSidepanel);
