// js/chatgpt-copy-fix.js
// Injected into chat.openai.com/chatgpt.com pages to provide a resilient clipboard fallback

(function initCopyFixContentScript() {
  function inject(fn) {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = `(${fn})();`;
    document.documentElement.appendChild(script);
    script.remove();
  }

  function pageScript() {
    const clipboard = navigator.clipboard;
    if (!clipboard) {
      return;
    }

    const clipboardProto = Object.getPrototypeOf(clipboard);
    if (!clipboardProto) {
      return;
    }

    const nativeWriteText = clipboardProto.writeText;
    if (typeof nativeWriteText !== 'function') {
      return;
    }

    const nativeWrite = typeof clipboardProto.write === 'function'
      ? clipboardProto.write
      : null;

    async function copyTextSafe(text) {
      const normalizedText = text == null ? '' : String(text);

      try {
        return await nativeWriteText.call(clipboard, normalizedText);
      } catch (err) {
        try {
          if (!document.body) {
            throw err;
          }

          const textarea = document.createElement('textarea');
          textarea.value = normalizedText;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'fixed';
          textarea.style.top = '-1000px';
          textarea.style.left = '-1000px';
          textarea.style.width = '0';
          textarea.style.height = '0';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          textarea.setSelectionRange(0, textarea.value.length);
          const success = document.execCommand('copy');
          textarea.remove();

          if (!success) {
            throw err;
          }
          return;
        } catch (fallbackError) {
          console.debug('Sidely fallback clipboard copy failed', fallbackError);
          throw err;
        }
      }
    }

    async function copyItemsSafe(items) {
      if (!Array.isArray(items) || items.length === 0) {
        return nativeWrite ? nativeWrite.call(clipboard, items) : copyTextSafe('');
      }

      if (nativeWrite) {
        try {
          return await nativeWrite.call(clipboard, items);
        } catch (err) {
          if (items.length === 1) {
            const item = items[0];
            if (item && typeof item.getType === 'function') {
              try {
                const textBlob = await item.getType('text/plain');
                const text = await textBlob.text();
                return copyTextSafe(text);
              } catch (fallbackError) {
                console.debug('Sidely clipboard item fallback failed', fallbackError);
              }
            }
          }
          throw err;
        }
      }

      const plainItem = items.find((item) => item && typeof item.getType === 'function');
      if (!plainItem) {
        return copyTextSafe('');
      }

      const textBlob = await plainItem.getType('text/plain');
      const text = await textBlob.text();
      return copyTextSafe(text);
    }

    Object.defineProperty(clipboardProto, 'writeText', {
      value(text) {
        return copyTextSafe(text);
      },
      configurable: true,
      writable: true
    });

    if (nativeWrite) {
      Object.defineProperty(clipboardProto, 'write', {
        value(items) {
          return copyItemsSafe(items);
        },
        configurable: true,
        writable: true
      });
    }
  }

  inject(pageScript);
})();
