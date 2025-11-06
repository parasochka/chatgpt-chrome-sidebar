function requestCopy(textToCopy) {
  if (!textToCopy) {
    return;
  }

  try {
    if (window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
      window.parent.postMessage({ type: 'COPY_REQUEST', text: textToCopy }, '*');
    }
  } catch (err) {
    console.error('Failed to dispatch copy request:', err);
  }
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
document.addEventListener('click', (e) => {
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

  requestCopy(text);
  lastHandledAt = Date.now();
  e.stopImmediatePropagation();
  e.preventDefault();

  const original = btn.textContent;
  btn.textContent = 'Copied!';
  setTimeout(() => { btn.textContent = original; }, 1000);
}, true);
