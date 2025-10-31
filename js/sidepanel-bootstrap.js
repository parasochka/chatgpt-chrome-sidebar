// js/sidepanel-bootstrap.js

const CHATGPT_PORTALS = [
  'https://chat.openai.com',
  'https://chatgpt.com'
];

let portalNoticeRoot = null;

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

function clearPortalNotice() {
  if (portalNoticeRoot) {
    portalNoticeRoot.remove();
    portalNoticeRoot = null;
  }
}

function mountPortalIntoIframe(base, { forceRefresh = false } = {}) {
  const iframe = document.getElementById('gpt-frame');
  if (!iframe) return;

  const normalizedBase = `${base.replace(/\/+$, '')}/`;
  const previousBase = iframe.dataset.currentBase;
  const sameBase = previousBase === normalizedBase;

  const assignSrc = () => {
    iframe.dataset.currentBase = normalizedBase;
    iframe.src = normalizedBase;
  };

  iframe.setAttribute('allow', 'clipboard-read; clipboard-write; autoplay; microphone; camera');
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

  if (!sameBase) {
    assignSrc();
    return;
  }

  if (forceRefresh) {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.location.reload();
        return;
      }
    } catch (err) {
      // Accessing cross-origin location can throw; fall back to resetting the src below
    }

    iframe.src = 'about:blank';
    requestAnimationFrame(assignSrc);
  }

  // When the base is unchanged and no refresh was requested we leave the iframe as-is
}

function renderPortalNotice(state) {
  clearPortalNotice();
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
  portalNoticeRoot = root;
}

async function bootstrapSidepanel(options = {}) {
  const { forceRefresh = false } = options;
  // Check both bases in parallel
  const checks = await Promise.all(CHATGPT_PORTALS.map(fetchPortalAuthState));
  const chosen = selectBestPortalCandidate(checks);

  // Always set the src so the user can sign in directly inside the iframe
  mountPortalIntoIframe(chosen.base, { forceRefresh });

  // If not authorized, show a hint
  if (chosen.state !== 'authorized') {
    renderPortalNotice(chosen);
  } else {
    clearPortalNotice();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  bootstrapSidepanel();

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      bootstrapSidepanel({ forceRefresh: true });
    }
  });
});
