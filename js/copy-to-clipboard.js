// js/copy-to-clipboard.js
// Provides a resilient clipboard helper that works within Chrome extension side panels and iframes.

(function () {
  const COPY_ATTR_TEXT = 'data-copy-text';
  const COPY_ATTR_TARGET = 'data-copy-target';
  const COPY_STATE_ATTR = 'data-copy-state';
  const COPY_STATE_SUCCESS = 'copied';
  const COPY_STATE_ERROR = 'error';
  const COPY_RESET_DELAY = 2000;

  function isElement(node) {
    return node && typeof node === 'object' && 'nodeType' in node && node.nodeType === Node.ELEMENT_NODE;
  }

  function getTextFromTarget(button) {
    if (!isElement(button)) return '';

    const directText = button.getAttribute(COPY_ATTR_TEXT);
    if (typeof directText === 'string' && directText.length > 0) {
      return directText;
    }

    const targetSelector = button.getAttribute(COPY_ATTR_TARGET);
    if (targetSelector) {
      try {
        const target = document.querySelector(targetSelector);
        if (target) {
          // innerText preserves visual formatting while textContent keeps whitespace for code blocks.
          // Prefer textContent but fall back to innerText if it's empty.
          const text = target.textContent || target.innerText || '';
          return text.trimEnd();
        }
      } catch (err) {
        console.warn('Copy helper: invalid selector', targetSelector, err);
      }
    }

    return '';
  }

  async function writeToNavigatorClipboard(text) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Copy helper: navigator.clipboard.writeText failed', err);
      return false;
    }
  }

  function writeWithExecCommand(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.width = '0';
    textarea.style.height = '0';
    textarea.style.zIndex = '-1';

    document.body.appendChild(textarea);

    const selection = window.getSelection ? window.getSelection() : null;
    let previousRange = null;
    if (selection && selection.rangeCount > 0) {
      previousRange = selection.getRangeAt(0);
    }

    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (err) {
      console.warn('Copy helper: document.execCommand("copy") threw', err);
      success = false;
    }

    if (selection) {
      selection.removeAllRanges();
      if (previousRange) {
        selection.addRange(previousRange);
      }
    }

    textarea.remove();

    return success;
  }

  function fallbackPrompt(text) {
    const message = 'Copy the following text:';
    // prompt returns null if cancelled; we don't care about the result, we only want to show the text.
    window.prompt(message, text);
  }

  async function safeCopyText(text) {
    if (!text) {
      return { success: false, mechanism: 'empty' };
    }

    if (await writeToNavigatorClipboard(text)) {
      return { success: true, mechanism: 'navigator' };
    }

    if (writeWithExecCommand(text)) {
      return { success: true, mechanism: 'execCommand' };
    }

    fallbackPrompt(text);
    return { success: false, mechanism: 'prompt' };
  }

  function setCopyState(button, state) {
    if (!isElement(button)) return;

    if (state) {
      button.setAttribute(COPY_STATE_ATTR, state);
    } else {
      button.removeAttribute(COPY_STATE_ATTR);
    }
  }

  function resetCopyStateLater(button) {
    if (!isElement(button)) return;
    window.setTimeout(() => {
      // Only clear the state if the button hasn't been updated since the timeout.
      if (button.getAttribute(COPY_STATE_ATTR) === COPY_STATE_SUCCESS) {
        setCopyState(button, '');
      }
    }, COPY_RESET_DELAY);
  }

  function handleCopyClick(event) {
    const button = event.currentTarget;
    if (!isElement(button)) {
      return;
    }

    const text = getTextFromTarget(button);
    if (!text) {
      setCopyState(button, COPY_STATE_ERROR);
      return;
    }

    button.disabled = true;
    setCopyState(button, 'working');

    safeCopyText(text).then((result) => {
      if (result.success) {
        setCopyState(button, COPY_STATE_SUCCESS);
        resetCopyStateLater(button);
      } else {
        setCopyState(button, COPY_STATE_ERROR);
      }
    }).catch((err) => {
      console.error('Copy helper: unexpected failure', err);
      setCopyState(button, COPY_STATE_ERROR);
    }).finally(() => {
      button.disabled = false;
    });
  }

  function initCopyButtons(root) {
    const scope = root || document;
    const buttons = scope.querySelectorAll(`[${COPY_ATTR_TEXT}], [${COPY_ATTR_TARGET}]`);
    buttons.forEach((button) => {
      if (button.dataset.copyInitialized === 'true') {
        return;
      }
      button.dataset.copyInitialized = 'true';
      button.addEventListener('click', handleCopyClick);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCopyButtons(document));
  } else {
    initCopyButtons(document);
  }

  // Expose manual initializer for dynamically added content.
  window.SafeClipboard = {
    copyText: safeCopyText,
    refresh: initCopyButtons
  };
})();
