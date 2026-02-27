const SIDELY_THEME_MESSAGE = 'sidely-theme-change';
const SIDELY_FRAME_NAME = 'sidely-frame';

// Detect whether we are inside the extension's sidebar iframe.
// Primary strategy: the sidebar sets <iframe name="sidely-frame"> before
// loading the src, so window.name is available immediately at document_start,
// works cross-origin, and cannot be spoofed by the page.
var isSidelyFrame = (window.name === SIDELY_FRAME_NAME);

if (isSidelyFrame) {
  document.documentElement.setAttribute('data-sidely-frame', '');
}

// ---------------------------------------------------------------------------
// Sidebar-only: hide buttons that don't work or make no sense in the sidebar
// (Google Drive menu item, voice/dictate buttons, disabled send button).
//
// Instead of fragile CSS selectors tied to SVG path `d` values or class names
// that ChatGPT can change at any time, we use a MutationObserver that
// identifies elements by stable attributes (data-testid, aria-label) and
// heuristic text/icon matching.
// ---------------------------------------------------------------------------
if (isSidelyFrame) {
  (function hideSidebarOnlyElements() {
    var STYLE_ID = 'sidely-hidden';

    // Inject a style tag for elements we can target with stable selectors
    function injectSidebarCSS() {
      if (document.getElementById(STYLE_ID)) return;
      var style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = [
        // Hide voice/speech buttons by data-testid (stable)
        '[data-testid="composer-speech-button"] { display: none !important; }',
        '[data-testid="composer-speech-button-container"] { display: none !important; }',
        // Hide disabled send button so it only shows when active
        'button[data-testid="send-button"][aria-disabled="true"] { opacity: 0 !important; pointer-events: none !important; }',
        'button[data-testid="send-button"][disabled] { opacity: 0 !important; pointer-events: none !important; }',
      ].join('\n');
      (document.head || document.documentElement).appendChild(style);
    }

    // Try to inject immediately (document_start — head may not exist yet)
    injectSidebarCSS();
    // Re-inject once DOM is ready in case head wasn't available
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectSidebarCSS);
    }

    // For elements that can only be found by inspecting their content
    // (e.g. Google Drive menu item, voice button without data-testid),
    // use a MutationObserver to hide them as they appear.
    function hideElement(el) {
      if (el && el.style.display !== 'none') {
        el.style.setProperty('display', 'none', 'important');
      }
    }

    function isGoogleDriveMenuItem(el) {
      // Menu items that mention "Google Drive" or "Drive"
      var text = (el.textContent || '').trim();
      if (/google\s*drive/i.test(text)) return true;
      // Check for the Google Drive SVG icon (triangle-based path)
      var svgs = el.querySelectorAll('svg');
      for (var i = 0; i < svgs.length; i++) {
        var paths = svgs[i].querySelectorAll('path');
        for (var j = 0; j < paths.length; j++) {
          var d = paths[j].getAttribute('d') || '';
          // Google Drive icon has characteristic path starting points
          if (d.indexOf('M3.511') === 0 || d.indexOf('M3.51105') === 0) return true;
        }
      }
      return false;
    }

    // Multilingual keywords for voice/dictation buttons.
    // Covers the same languages as SECTION_LABEL_KEYWORDS in chatgpt-sidebar-sections.js.
    var VOICE_BUTTON_KEYWORDS = [
      // English
      'voice', 'dictate', 'dictation', 'speech', 'microphone', 'speak', 'record',
      // French
      'dicter', 'dictée', 'voix', 'parler', 'enregistrer', 'micro',
      'saisie vocale', 'dictée vocale',
      // Spanish
      'voz', 'dictar', 'dictado', 'micrófono', 'hablar', 'grabar',
      // German
      'sprache', 'spracheingabe', 'mikrofon', 'diktieren', 'diktat', 'sprechen', 'aufnahme',
      // Italian
      'voce', 'dettare', 'dettatura', 'microfono', 'parlare', 'registrare',
      // Portuguese
      'ditar', 'ditado', 'microfone', 'falar', 'gravar',
      // Dutch
      'stem', 'dicteren', 'dicteer', 'microfoon', 'spreken', 'opnemen',
      // Polish
      'głos', 'dyktować', 'dyktowanie', 'mikrofon', 'mówić', 'nagrywać',
      // Russian
      'голос', 'диктовать', 'диктовка', 'микрофон', 'говорить', 'запись',
      // Ukrainian
      'голос', 'диктувати', 'диктування', 'мікрофон', 'говорити', 'запис',
      // Turkish
      'ses', 'dikte', 'mikrofon', 'konuşma', 'konuşmak', 'kayıt',
      // Arabic
      'صوت', 'إملاء', 'ميكروفون', 'نطق', 'تسجيل',
      // Hebrew
      'קול', 'הכתבה', 'מיקרופון', 'דיבור', 'הקלטה',
      // Japanese
      '音声', 'マイク', '録音', '話す', '音声入力',
      // Korean
      '음성', '마이크', '녹음', '말하기',
      // Chinese (Simplified & Traditional)
      '语音', '麦克风', '录音', '说话', '語音', '麥克風', '錄音',
      // Hindi
      'आवाज', 'माइक्रोफोन', 'बोलना', 'रिकॉर्ड',
      // Thai
      'เสียง', 'ไมค์', 'บันทึก', 'พูด',
    ];

    function isVoiceButton(el) {
      if (el.tagName !== 'BUTTON') return false;
      var aria = (el.getAttribute('aria-label') || '').toLowerCase();
      var title = (el.getAttribute('title') || '').toLowerCase();
      var combined = aria + ' ' + title;
      // Match against multilingual voice/dictate/speech/microphone keywords
      for (var k = 0; k < VOICE_BUTTON_KEYWORDS.length; k++) {
        if (combined.indexOf(VOICE_BUTTON_KEYWORDS[k]) !== -1) {
          return true;
        }
      }
      // Check for microphone SVG icon
      var svgs = el.querySelectorAll('svg');
      for (var i = 0; i < svgs.length; i++) {
        var paths = svgs[i].querySelectorAll('path');
        for (var j = 0; j < paths.length; j++) {
          var d = paths[j].getAttribute('d') || '';
          if (d.indexOf('M7.91667 3.333') === 0 || d.indexOf('M15.7806 10.1963') === 0) return true;
          // Generic microphone icon path patterns
          if (d.indexOf('M12 1a3') >= 0 || d.indexOf('M12 1.5') >= 0 || d.indexOf('M8 1') >= 0) return true;
        }
      }
      return false;
    }

    function scanAndHide(root) {
      if (!root || !root.querySelectorAll) return;

      // Hide Google Drive menu items
      var menuItems = root.querySelectorAll('[role="menuitem"], [role="option"], [class*="menu-item"], [class*="menuitem"]');
      for (var i = 0; i < menuItems.length; i++) {
        if (isGoogleDriveMenuItem(menuItems[i])) {
          hideElement(menuItems[i]);
        }
      }

      // Hide voice/dictate buttons not caught by data-testid CSS
      var buttons = root.querySelectorAll('button');
      for (var j = 0; j < buttons.length; j++) {
        if (isVoiceButton(buttons[j])) {
          hideElement(buttons[j]);
        }
      }
    }

    // Initial scan once body is available
    function initialScan() {
      scanAndHide(document.body);
    }

    if (document.body) {
      initialScan();
    } else {
      document.addEventListener('DOMContentLoaded', initialScan);
    }

    // Watch for new elements being added to the DOM
    var observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType === 1) {
            // Check the node itself
            if (node.matches && node.matches('[role="menuitem"], [role="option"], [class*="menu-item"], [class*="menuitem"]')) {
              if (isGoogleDriveMenuItem(node)) hideElement(node);
            }
            if (node.tagName === 'BUTTON' && isVoiceButton(node)) {
              hideElement(node);
            }
            // Check descendants
            scanAndHide(node);
          }
        }
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, { childList: true, subtree: true });
      });
    }
  }());
}

// ---------------------------------------------------------------------------
// Clipboard helpers (all frames)
// ---------------------------------------------------------------------------
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

  // Multilingual "copy" button keywords (aria-label / title / text).
  // "copy" is a substring of Spanish "copiar", French "copier" starts with
  // "copi" not "copy", so we list localisations explicitly.
  const COPY_KEYWORDS = [
    'copy', 'clipboard',          // English
    'copier', 'copié',            // French
    'copiar',                     // Spanish / Portuguese
    'kopieren', 'kopiert',        // German
    'copiare', 'copiato',         // Italian
    'kopiëren', 'gekopieerd',     // Dutch
    'kopiować', 'skopiować',      // Polish
    'копировать', 'скопировать',  // Russian
    'копіювати', 'скопіювати',    // Ukrainian
    'kopyala', 'kopyalandı',      // Turkish
    'نسخ',                        // Arabic
    'העתק', 'העתקה',              // Hebrew
    'कॉपी',                       // Hindi
    'คัดลอก',                     // Thai
    'コピー',                     // Japanese
    '복사',                       // Korean
    '复制', '複製',               // Chinese
  ];
  const looksLikeCopy =
    COPY_KEYWORDS.some(kw => aria.includes(kw) || title.includes(kw) || txt.includes(kw)) ||
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

// ---------------------------------------------------------------------------
// Theme synchronisation
// ---------------------------------------------------------------------------
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
  // Async fallback: receiving a theme message from a chrome-extension://
  // origin proves we are inside the sidebar iframe.
  if (!isSidelyFrame) {
    isSidelyFrame = true;
    document.documentElement.setAttribute('data-sidely-frame', '');
  }
  applySidelyInjectedTheme(event.data.theme);
});
