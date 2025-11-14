// Selectors for dictation-related buttons
const DICTATE_SELECTORS = [
  '[data-testid*="dictate" i]',
  '[data-testid*="dictation" i]',
  '[data-testid*="voice-typing" i]',
  '[data-testid*="voice_input" i]',
  '[aria-label*="dictate" i]',
  '[aria-label*="dictation" i]',
  '[aria-label*="voice typing" i]',
  '[aria-label*="voice input" i]'
];

// Exact text of the Google Drive menu item
const DRIVE_TEXT = 'Add from Google Drive';

function cleanUI(root = document.documentElement) {
  // 1. Remove Dictate / Voice typing but keep "send"
  const dictateNodes = root.querySelectorAll(DICTATE_SELECTORS.join(','));
  dictateNodes.forEach(el => {
    const label = (el.getAttribute('aria-label') || '').toLowerCase();
    const testid = (el.getAttribute('data-testid') || '').toLowerCase();

    // Do NOT remove the send button
    if (label.includes('send') || testid.includes('send')) return;

    el.remove();
  });

  // 2. Remove "Add from Google Drive" menu item by text
  const menuItems = root.querySelectorAll('div[role="menuitem"].group.__menu-item');
  menuItems.forEach(item => {
    const text = item.textContent.trim();
    if (text === DRIVE_TEXT) {
      item.remove();
    }
  });
}

// Initial cleanup
cleanUI();

// Observe DOM for changes
const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    if (m.addedNodes && m.addedNodes.length > 0) {
      m.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          cleanUI(node);
        }
      });
    }
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
