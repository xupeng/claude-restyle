// ==UserScript==
// @name         Claude Restyle
// @namespace    https://github.com/xupeng/claude-restyle
// @version      0.1.1
// @description  Custom fonts for Claude web messages, headings, code and sidebar
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

  const state = {
    version,
    cleanup() {
      style.remove();
      if (window[STATE_KEY] === state) delete window[STATE_KEY];
    },
  };
  window[STATE_KEY] = state;
})("/* 字体搭配沿用 notion-restyle；修改下方四个变量后重新构建用户脚本。 */\n@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@100..900&family=Oxanium:wght@200..800&family=Pridi:wght@200;300;400;500;600;700&family=Signika:wght@300..700&display=swap');\n\n@font-face {\n  font-family: \"ClaudeRestyleBodyCJK\";\n  src: local(\"LXGWWenKai-Light\");\n  font-weight: 100 300;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleBodyCJK\";\n  src: local(\"LXGWWenKai-Medium\");\n  font-weight: 301 500;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleBodyCJK\";\n  src: local(\"LXGW ZhenKai GB\"), local(\"LXGWZhenKaiGB\"), local(\"LXGW ZhenKai\"), local(\"LXGWZhenKai-Regular\");\n  font-weight: 501 900;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleHeadingCJK\";\n  src: local(\"TsangerYunHei-W04\");\n  font-weight: 100 400;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleHeadingCJK\";\n  src: local(\"TsangerYunHei-W05\");\n  font-weight: 401 500;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleHeadingCJK\";\n  src: local(\"TsangerYunHei-W06\");\n  font-weight: 501 600;\n  font-display: swap;\n}\n\n@font-face {\n  font-family: \"ClaudeRestyleHeadingCJK\";\n  src: local(\"TsangerYunHei-W07\");\n  font-weight: 601 900;\n  font-display: swap;\n}\n\n:root {\n  --claude-restyle-body-font: \"Oxanium\", \"Pridi\", \"ClaudeRestyleBodyCJK\", \"Noto Sans SC\", STKaiti, system-ui, sans-serif;\n  --claude-restyle-heading-font: \"Signika\", \"ClaudeRestyleHeadingCJK\", \"Noto Sans SC\", \"PingFang SC\", sans-serif;\n  --claude-restyle-code-font: \"Cascadia Code NF\", \"Cascadia Code\", Consolas, \"ClaudeRestyleBodyCJK\", \"Noto Sans SC\", monospace;\n  /* UI / 侧栏不引入自定义中文字体，保留系统中文。 */\n  --claude-restyle-ui-font: \"Oxanium\", \"Pridi\", ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", sans-serif;\n}\n\n/* UI 只换字体，不修改字号、行高、尺寸或主题颜色。 */\nbody,\n:where(.font-sans, .font-control, .font-voice),\n:where(aside[aria-label=\"Sidebar\"], [data-testid=\"sidebar\"]),\n:where(aside[aria-label=\"Sidebar\"], [data-testid=\"sidebar\"]) :where(a, button, span, div, p, input) {\n  font-family: var(--claude-restyle-ui-font) !important;\n}\n\n/* 普通 Chat 与网页 Code 共用消息锚点；旧版字体类名作为兼容入口。\n   不使用哈希类名，也不改变 Artifacts iframe 中的内容。 */\n:where(.prose, .standard-markdown, .font-claude-response, .font-claude-message,\n  [data-testid=\"user-message\"], [contenteditable=\"true\"], #static-composer-input),\n:where(.prose, .standard-markdown, .font-claude-response, .font-claude-message,\n  [data-testid=\"user-message\"], [contenteditable=\"true\"])\n  :where(p, span, div, a, li, ul, ol, blockquote, td, th, strong, b, em, i, del, summary, label):not(\n    :where(pre *, code *, kbd *, samp *, .katex, .katex *, .MathJax, .MathJax *, mjx-container, mjx-container *)\n  ) {\n  font-family: var(--claude-restyle-body-font) !important;\n}\n\n:where(.prose, .standard-markdown, .font-claude-response, .font-claude-message,\n  [data-testid=\"user-message\"], [contenteditable=\"true\"], #static-composer-input) {\n  font-weight: 500;\n}\n\n/* 行高只作用于文字段落，避免撑开按钮、工具栏和代码行号。 */\n:where(.prose, .standard-markdown, [data-testid=\"user-message\"], [contenteditable=\"true\"])\n  :where(p, li, blockquote):not(:where(pre *, .katex *, .MathJax *, mjx-container *)),\n#static-composer-input {\n  line-height: 1.8 !important;\n}\n\n:where(.prose, .standard-markdown, [data-testid=\"user-message\"], [contenteditable=\"true\"])\n  :where(strong, b):not(:where(pre *, code *, .katex *, .MathJax *, mjx-container *)) {\n  font-weight: 700 !important;\n}\n\n/* 标题后置，覆盖标题内嵌的链接、强调等元素；内嵌 code 仍用等宽字体。 */\n:where(.prose, .standard-markdown) :where(h1, h2, h3, h4, h5, h6),\n:where(.prose, .standard-markdown) :where(h1, h2, h3, h4, h5, h6)\n  :where(span, a, strong, b, em, i),\nmain > :where(h1, h2),\n[role=\"toolbar\"] :where(h1, h2),\n[role=\"toolbar\"] :where(h1, h2) :where(button, span) {\n  font-family: var(--claude-restyle-heading-font) !important;\n}\n\n/* 内联代码、代码块及网页代码编辑器。公式和 SVG 图标不应用通配字体。 */\n:where(pre, code, kbd, samp, .font-mono, .cm-editor, .monaco-editor),\n:where(pre, code, kbd, samp, .font-mono, .cm-editor, .monaco-editor)\n  :where(span, div, code, p, textarea):not(:where(.katex *, .MathJax *, mjx-container *)) {\n  font-family: var(--claude-restyle-code-font) !important;\n  font-feature-settings: \"liga\" 1, \"calt\" 1;\n}\n", "0.1.1")
;

  if (!window.__CLAUDE_RESTYLE_MENU_REGISTERED__) {
    GM_registerMenuCommand("Claude Restyle：暂时停用当前页（刷新恢复）", () => {
      window.__CLAUDE_RESTYLE_STATE__?.cleanup?.();
    });
    window.__CLAUDE_RESTYLE_MENU_REGISTERED__ = true;
  }
})();
