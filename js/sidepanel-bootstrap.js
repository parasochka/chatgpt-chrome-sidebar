// js/sidepanel-bootstrap.js

const CHATGPT_PORTALS = [
  'https://chat.openai.com',
  'https://chatgpt.com'
];

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

function normalizeBase(base) {
  try {
    const url = new URL(base);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch (e) {
    return base.replace(/\/$/, '');
  }
}

function mountPortalIntoIframe(base, { forceReload = false } = {}) {
  const iframe = document.getElementById('gpt-frame');
  if (!iframe) return;

  const normalized = normalizeBase(base);
  const targetSrc = `${normalized}/`;
  const previousBase = iframe.dataset.portalBase;
  const shouldReload = forceReload || previousBase !== normalized;

  if (!shouldReload) {
    return;
  }

  const srcWithBuster = forceReload ? `${targetSrc}?sidepanel=${Date.now()}` : targetSrc;

  iframe.dataset.portalBase = normalized;
  iframe.src = srcWithBuster;
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

let cachedPortalState = null;
let refreshButtonEl = null;

const FORCE_RELOAD_INTERVAL_MS = 2000;
let lastForcedReload = 0;

function forceReloadCurrentPortal({ bypassThrottle = false } = {}) {
  if (!cachedPortalState) return;

  const now = Date.now();
  if (!bypassThrottle && now - lastForcedReload < FORCE_RELOAD_INTERVAL_MS) {
    return;
  }

  lastForcedReload = now;
  mountPortalIntoIframe(cachedPortalState.base, { forceReload: true });
}

function ensureRefreshButton() {
  if (refreshButtonEl) return refreshButtonEl;

  const wrap = document.querySelector('.frame-wrap');
  if (!wrap) return null;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'refresh-button';
  button.setAttribute('aria-label', 'Refresh ChatGPT view');
  button.title = 'Refresh ChatGPT view';
  button.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5a7 7 0 0 1 5.61 2.87l1.32-1.5A1 1 0 0 1 20.92 7l.08 4a1 1 0 0 1-1 1h-4a1 1 0 1 1 0-2h1.64A5 5 0 0 0 12 7a5 5 0 0 0-4.9 6.06 1 1 0 0 1-1.95.44A7 7 0 0 1 12 5Zm6.85 7.5a1 1 0 0 1 1.28.58A7 7 0 0 1 12 19a7 7 0 0 1-5.6-2.86l-1.33 1.5A1 1 0 0 1 3.09 17L3 13a1 1 0 0 1 1-1h4a1 1 0 0 1 0 2H6.36A5 5 0 0 0 12 17a5 5 0 0 0 4.9-6.06 1 1 0 0 1 1.95-.44Z" />
    </svg>
  `;

  button.addEventListener('click', () => {
    button.disabled = true;
    forceReloadCurrentPortal({ bypassThrottle: true });
    window.setTimeout(() => {
      button.disabled = false;
    }, FORCE_RELOAD_INTERVAL_MS);
  });

  wrap.appendChild(button);
  refreshButtonEl = button;
  return button;
}

async function bootstrapSidepanel() {
  // Check both bases in parallel
  const checks = await Promise.all(CHATGPT_PORTALS.map(fetchPortalAuthState));
  const chosen = selectBestPortalCandidate(checks);

  cachedPortalState = chosen;

  ensureRefreshButton();

  // Always set the src so the user can sign in directly inside the iframe
  mountPortalIntoIframe(chosen.base);

  // If not authorized, show a hint
  if (chosen.state !== 'authorized') {
    renderPortalNotice(chosen);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  ensureRefreshButton();
  bootstrapSidepanel();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    forceReloadCurrentPortal();
  }
});

window.addEventListener('focus', () => {
  forceReloadCurrentPortal();
});
