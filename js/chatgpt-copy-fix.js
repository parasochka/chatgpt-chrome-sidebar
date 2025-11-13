const SIDELY_THEME_MESSAGE = 'sidely-theme-change';

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
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
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
