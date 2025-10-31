(function fixSidebarCloseCursor() {
  const SELECTORS = [
    'button[aria-label="Close sidebar"]',
    'button[data-testid="close-sidebar-button"]'
  ];

  const CURSOR_CLASSES = ['cursor-w-resize', 'rtl:cursor-e-resize'];

  const applyCursor = (button) => {
    if (!button) {
      return;
    }

    button.style.setProperty('cursor', 'pointer', 'important');

    CURSOR_CLASSES.forEach((className) => {
      if (button.classList.contains(className)) {
        button.classList.remove(className);
      }
    });
  };

  const scanForButtons = (root = document) => {
    SELECTORS.forEach((selector) => {
      root.querySelectorAll(selector).forEach(applyCursor);
    });
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
        scanForButtons(mutation.target);
      }

      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) {
          return;
        }

        if (SELECTORS.some((selector) => node.matches(selector))) {
          applyCursor(node);
        }

        scanForButtons(node);
      });
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scanForButtons();
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    });
  } else {
    scanForButtons();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
})();
