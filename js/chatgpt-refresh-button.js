(function () {
  const BUTTON_ID = 'chatgpt-sidebar-refresh-button';
  const LABEL_SELECTOR = 'h2.__menu-label[data-no-spacing="true"]';

  function createButton() {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.setAttribute('aria-label', 'Refresh chat list');
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⟳';
    const text = document.createElement('span');
    text.textContent = 'Refresh';
    button.append(icon, text);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      window.location.reload();
    });
    return button;
  }

  function ensureButton() {
    const label = document.querySelector(LABEL_SELECTOR);
    if (!label) {
      return;
    }

    const container = label.parentElement;
    if (!container || container.querySelector(`#${BUTTON_ID}`)) {
      return;
    }

    const button = createButton();
    container.appendChild(button);
  }

  function startObserver() {
    const target = document.body || document.documentElement;
    if (!target) {
      requestAnimationFrame(startObserver);
      return;
    }

    ensureButton();

    const observer = new MutationObserver(() => {
      ensureButton();
    });

    observer.observe(target, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver);
  } else {
    startObserver();
  }
})();
