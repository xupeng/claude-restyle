((cssText, version) => {
  "use strict";
  const STATE_KEY = "__CLAUDE_RESTYLE_STATE__";
  const STYLE_ID = "claude-restyle-style";

  // Reinstalling in the same content-script world replaces the previous style.
  window[STATE_KEY]?.cleanup?.();
  document.getElementById(STYLE_ID)?.remove();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.dataset.claudeRestyleVersion = version;
  style.textContent = cssText;
  (document.head || document.documentElement).appendChild(style);

  const STORAGE_KEY = "claude-restyle.textZoomPercent.v1";
  const ROOTS = '.prose, .standard-markdown, .font-claude-response, .font-claude-message, [data-testid="user-message"], [contenteditable="true"], #static-composer-input';
  const EXCLUDED = 'svg, svg *, math, math *, .katex, .katex *, .MathJax, .MathJax *, mjx-container, mjx-container *, button, [role="button"], [role="img"], [aria-hidden="true"], img, canvas, iframe';
  const originals = new Map();
  const parsePercent = value => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 60 && number <= 160 ? Math.round(number) : 100;
  };
  let percent = 100;
  try { percent = parsePercent(window.localStorage.getItem(STORAGE_KEY)); } catch {}
  let timer;
  let toastTimer;
  let toast;
  let active = true;
  const restore = () => {
    for (const [element, original] of originals) {
      if (element.style.getPropertyValue("font-size") !== original.applied) continue;
      if (original.value) element.style.setProperty("font-size", original.value, original.priority);
      else element.style.removeProperty("font-size");
    }
    originals.clear();
  };
  const observe = () => observer.observe(document.body, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ["class", "style", "contenteditable"],
  });
  const apply = () => {
    if (!active) return;
    observer.disconnect();
    restore();
    if (percent !== 100) {
      const elements = new Set();
      for (const root of document.querySelectorAll(ROOTS)) {
        elements.add(root);
        for (const child of root.querySelectorAll("*")) elements.add(child);
      }
      // Measure all original sizes before writing, so nested text never compounds.
      // Pin non-text descendants to their native size to preserve inherited icon sizes.
      const measurements = [];
      for (const element of elements) {
        if (!element.style) continue;
        const computed = getComputedStyle(element);
        const base = parseFloat(computed.fontSize);
        if (!Number.isFinite(base)) continue;
        const directText = [...element.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join("");
        const iconText = /[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/u.test(directText);
        const excluded = element.closest(EXCLUDED) || /icon|symbol/i.test(computed.fontFamily) || iconText;
        const isText = directText.trim() || element.matches('[contenteditable="true"], textarea, input');
        const size = base * (!excluded && isText ? percent / 100 : 1);
        measurements.push([element, size]);
      }
      for (const [element, size] of measurements) {
        const original = { value: element.style.getPropertyValue("font-size"), priority: element.style.getPropertyPriority("font-size") };
        element.style.setProperty("font-size", `${size}px`, "important");
        original.applied = element.style.getPropertyValue("font-size");
        originals.set(element, original);
      }
    }
    observe();
  };
  const observer = new MutationObserver(() => {
    // Batch streaming updates; never observe our own style writes.
    if (timer === undefined) timer = setTimeout(() => { timer = undefined; apply(); }, 80);
  });
  const announce = () => {
    if (!toast) {
      toast = document.createElement("div");
      toast.setAttribute("role", "status");
      toast.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:2147483647;padding:8px 12px;border-radius:8px;background:#222;color:white;font:14px/1.5 system-ui;pointer-events:none";
      document.body.appendChild(toast);
    }
    toast.textContent = `文字缩放 ${percent}%`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast?.remove(); toast = undefined; }, 1200);
  };
  const onKeyDown = event => {
    if (event.isComposing || !event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) return;
    let next;
    if (["Equal", "NumpadAdd"].includes(event.code)) next = percent + 5;
    else if (["Minus", "NumpadSubtract"].includes(event.code)) next = percent - 5;
    else if (["Digit0", "Numpad0"].includes(event.code)) next = 100;
    else return;
    event.preventDefault();
    event.stopImmediatePropagation();
    percent = Math.max(60, Math.min(160, next));
    try { window.localStorage.setItem(STORAGE_KEY, String(percent)); } catch {}
    apply();
    announce();
  };
  const onStorage = event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    percent = parsePercent(event.newValue);
    apply();
  };
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("storage", onStorage);
  apply();

  const state = {
    version,
    get zoomPercent() { return percent; },
    cleanup() {
      active = false;
      observer.disconnect();
      clearTimeout(timer);
      clearTimeout(toastTimer);
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("storage", onStorage);
      toast?.remove();
      restore();
      style.remove();
      if (window[STATE_KEY] === state) delete window[STATE_KEY];
    },
  };
  window[STATE_KEY] = state;
})(__CLAUDE_RESTYLE_CSS_JSON__, __CLAUDE_RESTYLE_VERSION_JSON__)
