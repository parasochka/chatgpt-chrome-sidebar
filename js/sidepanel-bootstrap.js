// js/sidepanel-bootstrap.js

const CHATGPT_PORTALS = [
  'https://chat.openai.com',
  'https://chatgpt.com'
];

let lastRequestedIframeSrc = '';
let toolbarInitialized = false;

function getChatIframe() {
  return document.getElementById('gpt-frame');
}

function getRefreshButton() {
  return document.getElementById('refresh-chat-button');
}

function setRefreshButtonLoading(isLoading) {
  const button = getRefreshButton();
  if (!button) return;

  button.disabled = isLoading;
  button.classList.toggle('is-loading', isLoading);

  const label = button.querySelector('.toolbar-btn__label');
  if (label) {
    label.textContent = isLoading ? 'Updating...' : 'Update Chats';
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
  // Simple overlay banner without external dependencies
  const root = document.createElement('div');
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
  link.rel = 'noreferrer';
  link.textContent = new URL(state.base).host;

  if (state.state === 'cloudflare') {
    p.textContent = 'You need to complete the Cloudflare check. Open ';
    p.appendChild(link);
    p.append(' in a tab, sign in, then return.');
  } else if (state.state === 'unauthorized') {
    p.textContent = 'You need to sign in to your ChatGPT account. Open ';
    p.appendChild(link);
    p.append(' in a tab, sign in, then return.');
  } else {
    p.textContent = 'Session verification failed. Try refreshing the page or sign in at ';
    p.appendChild(link);
    p.append('.');
  }

  box.appendChild(p);
  root.appendChild(box);
  document.body.appendChild(root);
}

async function bootstrapSidepanel() {
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
