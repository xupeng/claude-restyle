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
})(__CLAUDE_RESTYLE_CSS_JSON__, __CLAUDE_RESTYLE_VERSION_JSON__)
