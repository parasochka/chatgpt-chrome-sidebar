const isChromeSidePanelAvailable =
  typeof chrome !== "undefined" &&
  typeof chrome.sidePanel?.setPanelBehavior === "function";

if (isChromeSidePanelAvailable) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
}

const firefoxWebRequest =
  typeof browser !== "undefined" &&
  browser?.webRequest?.onHeadersReceived?.addListener
    ? browser.webRequest
    : null;

if (firefoxWebRequest) {
  const TARGET_URLS = [
    "https://chat.openai.com/*",
    "https://chatgpt.com/*"
  ];

  const EXTRA_INFO_SPEC = ["blocking", "responseHeaders", "extraHeaders"];
  const textDecoder = typeof TextDecoder === "function" ? new TextDecoder() : null;

  const removeDisallowedHeaders = (details) => {
    if (!details || details.type !== "sub_frame" || !details.responseHeaders) {
      return {};
    }

    let modified = false;

    const filteredHeaders = details.responseHeaders.reduce((acc, header) => {
      if (!header || !header.name) {
        return acc;
      }

      const name = header.name.toLowerCase();

      if (name === "x-frame-options" || name === "frame-options") {
        modified = true;
        return acc;
      }

      if (name === "content-security-policy") {
        const originalValue = (() => {
          if (typeof header.value === "string") {
            return header.value;
          }
          if (textDecoder && header.binaryValue) {
            try {
              const buffer =
                header.binaryValue instanceof ArrayBuffer
                  ? new Uint8Array(header.binaryValue)
                  : new Uint8Array(header.binaryValue);
              return textDecoder.decode(buffer);
            } catch (err) {
              console.error("Failed to decode CSP header", err);
              return "";
            }
          }
          return "";
        })();

        if (!originalValue) {
          modified = true;
          return acc;
        }

        const filteredDirectives = originalValue
          .split(";")
          .map((directive) => directive.trim())
          .filter((directive) => directive.length > 0)
          .filter((directive) => !directive.toLowerCase().startsWith("frame-ancestors"));

        if (!filteredDirectives.length) {
          modified = true;
          return acc;
        }

        const nextValue = filteredDirectives.join("; ");

        if (nextValue !== originalValue) {
          modified = true;
        }

        acc.push({ name: header.name, value: nextValue });
        return acc;
      }

      acc.push(header);
      return acc;
    }, []);

    if (!modified) {
      return {};
    }

    return { responseHeaders: filteredHeaders };
  };

  firefoxWebRequest.onHeadersReceived.addListener(
    removeDisallowedHeaders,
    {
      urls: TARGET_URLS,
      types: ["sub_frame"]
    },
    EXTRA_INFO_SPEC
  );
}
