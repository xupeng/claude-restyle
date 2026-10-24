// ==UserScript==
// @name         Claude Restyle
// @namespace    https://github.com/xupeng/claude-restyle
// @version      0.2.1
// @description  Custom fonts and persistent text-only zoom for Claude web
// @homepageURL  https://github.com/xupeng/claude-restyle
// @match        https://claude.ai/*
// @run-at       document-end
// @inject-into  content
// @noframes
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/xupeng/claude-restyle/master/userscripts/claude-restyle.user.js
// @downloadURL  https://raw.githubusercontent.com/xupeng/claude-restyle/master/userscripts/claude-restyle.user.js
// ==/UserScript==

// Generated from assets/claude-custom.css and assets/browser-inject.js. Do not edit.
(() => {
  "use strict";
  if (
    window.top !== window.self
    || location.protocol !== "https:"
    || !["claude.ai"].includes(location.hostname)
    || (location.port && location.port !== "443")
  ) return;

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
    subtree: true, childList: true,

  });
  const apply = () => {
    if (!active) return;
    observer.disconnect();
    // Restoring baseline sizes can temporarily shrink the document and clamp scrollTop.
    // Preserve scroll containers across this synchronous measurement pass.
    const scrollPositions = new Map();
    for (const root of document.querySelectorAll(ROOTS)) {
      for (let node = root; node; node = node.parentElement) {
        if (node.scrollTop || node.scrollLeft) scrollPositions.set(node, [node.scrollTop, node.scrollLeft]);
      }
    }
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
        measurements.push([element, size, !excluded && Boolean(isText)]);
      }
      for (const [element, size, scaledText] of measurements) {
        const original = { value: element.style.getPropertyValue("font-size"), priority: element.style.getPropertyPriority("font-size") };
        element.style.setProperty("font-size", `${size}px`, "important");
        original.applied = element.style.getPropertyValue("font-size");
        original.scaledText = scaledText;
        originals.set(element, original);
      }
    }
    for (const [node, [top, left]] of scrollPositions) {
      node.scrollTop = top;
      node.scrollLeft = left;
    }
    observe();
  };
  const observer = new MutationObserver(records => {
    // Scroll controls, sticky headers and virtualizer style/class updates must not
    // trigger font restoration: doing so can create a resize/scroll feedback loop.
    // Existing text nodes already have the correct size while tokens stream in.
    if (percent === 100) return;
    const needsSizing = records.some(record => [...record.addedNodes].some(node => {
      if (node.nodeType === 1) {
        return node.matches(ROOTS) || node.closest(ROOTS) || node.querySelector(ROOTS);
      }
      return node.nodeType === 3 && record.target.closest?.(ROOTS)
        && !originals.get(record.target)?.scaledText;
    }));
    if (needsSizing && timer === undefined) {
      timer = setTimeout(() => { timer = undefined; apply(); }, 80);
    }
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
})("/* 字体搭配沿用 notion-restyle；修改下方四个变量后重新构建用户脚本。 */\n@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&family=Oxanium:wght@200..800&family=Pridi:wght@200;300;400;500;600;700&family=Signika:wght@300..700&display=swap');\n\n@font-face {\n  font-family: \"ClaudeRestyleBodyCJK\";\n  src: local(\"LXGWWenKai-Light\");\n  font-weight: 100 300;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleBodyCJK\";\n  src: local(\"LXGWWenKai-Medium\");\n  font-weight: 301 500;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleBodyCJK\";\n  src: local(\"LXGW ZhenKai GB\"), local(\"LXGWZhenKaiGB\"), local(\"LXGW ZhenKai\"), local(\"LXGWZhenKai-Regular\");\n  font-weight: 501 900;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleHeadingCJK\";\n  src: local(\"TsangerYunHei-W04\");\n  font-weight: 100 400;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleHeadingCJK\";\n  src: local(\"TsangerYunHei-W05\");\n  font-weight: 401 500;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleHeadingCJK\";\n  src: local(\"TsangerYunHei-W06\");\n  font-weight: 501 600;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleHeadingCJK\";\n  src: local(\"TsangerYunHei-W07\");\n  font-weight: 601 900;\n  font-display: swap;\n}\n\n:root {\n  --claude-restyle-body-font: \"Oxanium\", \"Pridi\", \"ClaudeRestyleBodyCJK\", \"Noto Sans SC\", STKaiti, system-ui, sans-serif;\n  --claude-restyle-heading-font: \"Signika\", \"ClaudeRestyleHeadingCJK\", \"Noto Sans SC\", \"PingFang SC\", sans-serif;\n  --claude-restyle-code-font: \"Cascadia Code NF\", \"Cascadia Code\", Consolas, \"ClaudeRestyleBodyCJK\", \"Noto Sans SC\", monospace;\n  /* UI / 侧栏不引入自定义中文字体，保留系统中文。 */\n  --claude-restyle-ui-font: \"Oxanium\", \"Pridi\", ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif;\n}\n\n/* UI 字体从容器继承。不要覆盖后代 span/div 的 font-family：\n   Claude 的字体图标需要保留自身字体，否则会显示为缺字条纹。 */\nbody,\n:where(.font-sans, .font-control, .font-voice),\n:where(aside[aria-label=\"Sidebar\"], [data-testid=\"sidebar\"]) {\n  font-family: var(--claude-restyle-ui-font) !important;\n}\n\n/* 普通 Chat 与网页 Code 共用消息锚点；旧版字体类名作为兼容入口。\n   不使用哈希类名，也不改变 Artifacts iframe 中的内容。 */\n:where(.prose, .standard-markdown, .font-claude-response, .font-claude-message,\n  [data-testid=\"user-message\"], [contenteditable=\"true\"], #static-composer-input),\n:where(.prose, .standard-markdown, .font-claude-response, .font-claude-message,\n  [data-testid=\"user-message\"], [contenteditable=\"true\"])\n  :where(p, span, div, a, li, ul, ol, blockquote, td, th, strong, b, em, i, del, summary, label):not(\n    :where(pre *, code *, kbd *, samp *, .katex, .katex *, .MathJax, .MathJax *, mjx-container, mjx-container *)\n  ) {\n  font-family: var(--claude-restyle-body-font) !important;\n}\n\n:where(.prose, .standard-markdown, .font-claude-response, .font-claude-message,\n  [data-testid=\"user-message\"], [contenteditable=\"true\"], #static-composer-input) {\n  font-weight: 500;\n}\n\n/* 行高只作用于文字段落，避免撑开按钮、工具栏和代码行号。 */\n:where(.prose, .standard-markdown, [data-testid=\"user-message\"], [contenteditable=\"true\"])\n  :where(p, li, blockquote):not(:where(pre *, .katex *, .MathJax *, mjx-container *)),\n#static-composer-input {\n  line-height: 1.8 !important;\n}\n\n:where(.prose, .standard-markdown, [data-testid=\"user-message\"], [contenteditable=\"true\"])\n  :where(strong, b):not(:where(pre *, code *, .katex *, .MathJax *, mjx-container *)) {\n  font-weight: 700 !important;\n}\n\n/* 标题后置，覆盖标题内嵌的链接、强调等元素；内嵌 code 仍用等宽字体。 */\n:where(.prose, .standard-markdown) :where(h1, h2, h3, h4, h5, h6),\n:where(.prose, .standard-markdown) :where(h1, h2, h3, h4, h5, h6)\n  :where(span, a, strong, b, em, i),\nmain > :where(h1, h2),\n[role=\"toolbar\"] :where(h1, h2),\n[role=\"toolbar\"] :where(h1, h2) :where(button, span) {\n  font-family: var(--claude-restyle-heading-font) !important;\n}\n\n/* 内联代码、代码块及网页代码编辑器。公式和 SVG 图标不应用通配字体。 */\n:where(pre, code, kbd, samp, .font-mono, .cm-editor, .monaco-editor),\n:where(pre, code, kbd, samp, .font-mono, .cm-editor, .monaco-editor)\n  :where(span, div, code, p, textarea):not(:where(.katex *, .MathJax *, mjx-container *)) {\n  font-family: var(--claude-restyle-code-font) !important;\n  font-feature-settings: \"liga\" 1, \"calt\" 1;\n}\n", "0.2.1")
;

  if (!window.__CLAUDE_RESTYLE_MENU_REGISTERED__) {
    GM_registerMenuCommand("Claude Restyle：暂时停用当前页（刷新恢复）", () => {
      window.__CLAUDE_RESTYLE_STATE__?.cleanup?.();
    });
    window.__CLAUDE_RESTYLE_MENU_REGISTERED__ = true;
  }
})();
