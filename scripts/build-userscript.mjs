#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

export async function readBrowserPayload(version) {
  const [css, template] = await Promise.all([
    fs.readFile(new URL("../assets/claude-custom.css", import.meta.url), "utf8"),
    fs.readFile(new URL("../assets/browser-inject.js", import.meta.url), "utf8"),
  ]);
  const replacements = {
    __CLAUDE_RESTYLE_CSS_JSON__: JSON.stringify(css),
    __CLAUDE_RESTYLE_VERSION_JSON__: JSON.stringify(version),
  };
  for (const token of Object.keys(replacements)) {
    if (template.split(token).length !== 2) {
      throw new Error(`Browser template must contain exactly one ${token}`);
    }
  }
  // A callback preserves literal dollar sequences and token-like text in CSS.
  return template.replace(/__CLAUDE_RESTYLE_(?:CSS|VERSION)_JSON__/g, token => replacements[token]);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DEFAULT_OUTPUT_DIRECTORY = path.join(root, "userscripts");
export const DEFAULT_UPDATE_URL = "https://raw.githubusercontent.com/xupeng/claude-restyle/master/userscripts/claude-restyle.user.js";
export const CLAUDE_BROWSER_HOSTS = Object.freeze([
  "claude.ai",
]);

function validateOptions({ version, updateUrl }) {
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("Userscript version must use three numeric components, e.g. 0.1.1");
  }
  if (updateUrl !== undefined) {
    if (typeof updateUrl !== "string" || /\s/.test(updateUrl)) {
      throw new Error("Update URL must be an HTTPS URL without whitespace or credentials");
    }
    let url;
    try { url = new URL(updateUrl); } catch {
      throw new Error("Update URL must be an HTTPS URL without whitespace or credentials");
    }
    if (url.protocol !== "https:" || url.username || url.password || url.hash) {
      throw new Error("Update URL must be an HTTPS URL without whitespace, credentials, or a fragment");
    }
  }
}

export function parseArgs(argv) {
  const options = {};
  const flags = new Map([
    ["--version", "version"],
    ["--update-url", "updateUrl"],
    ["--check", "check"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const key = flags.get(flag);
    if (!key) throw new Error(`Unknown argument: ${flag}`);
    if (key in options) throw new Error(`Duplicate argument: ${flag}`);
    if (key === "check") {
      options.check = true;
      continue;
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    options[key] = value;
  }
  return options;
}

export function renderUserscript({ payload, version, updateUrl = DEFAULT_UPDATE_URL }) {
  validateOptions({ version, updateUrl });
  const metadata = [
    "// ==UserScript==",
    "// @name         Claude Restyle",
    "// @namespace    https://github.com/xupeng/claude-restyle",
    `// @version      ${version}`,
    "// @description  Custom fonts for Claude web messages, headings, code and sidebar",
    "// @homepageURL  https://github.com/xupeng/claude-restyle",
    ...CLAUDE_BROWSER_HOSTS.map((host) => `// @match        https://${host}/*`),
    "// @run-at       document-end",
    "// @inject-into  content",
    "// @noframes",
    "// @grant        GM_registerMenuCommand",
    ...(updateUrl ? [`// @updateURL    ${updateUrl}`, `// @downloadURL  ${updateUrl}`] : []),
    "// ==/UserScript==",
  ].join("\n");

  const script = `${metadata}

// Generated from assets/claude-custom.css and assets/browser-inject.js. Do not edit.
(() => {
  "use strict";
  if (
    window.top !== window.self
    || location.protocol !== "https:"
    || !${JSON.stringify(CLAUDE_BROWSER_HOSTS)}.includes(location.hostname)
    || (location.port && location.port !== "443")
  ) return;

  ${payload};

  if (!window.__CLAUDE_RESTYLE_MENU_REGISTERED__) {
    GM_registerMenuCommand("Claude Restyle：暂时停用当前页（刷新恢复）", () => {
      window.__CLAUDE_RESTYLE_STATE__?.cleanup?.();
    });
    window.__CLAUDE_RESTYLE_MENU_REGISTERED__ = true;
  }
})();
`;
  // Validate generated code before writing an installable artifact.
  new vm.Script(script, { filename: "claude-restyle.user.js" });
  return script;
}

export async function buildUserscript({
  version,
  updateUrl = DEFAULT_UPDATE_URL,
  outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
  check = false,
} = {}) {
  if (version === undefined) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
    version = manifest.version;
  }
  const payload = await readBrowserPayload(version);
  const script = renderUserscript({ payload, version, updateUrl });
  const outputPath = path.join(outputDirectory, "claude-restyle.user.js");
  if (check) {
    let existing;
    try {
      existing = await fs.readFile(outputPath, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      throw new Error(`Missing userscript: ${outputPath}. Run npm run build:userscript.`);
    }
    if (existing !== script) {
      throw new Error(`Outdated userscript: ${outputPath}. Run npm run build:userscript.`);
    }
  } else {
    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.writeFile(outputPath, script, "utf8");
  }
  return { outputPath, version, checked: check };
}

async function main() {
  const { outputPath, version, checked } = await buildUserscript(parseArgs(process.argv.slice(2)));
  console.log(`${checked ? "Checked" : "Built"} ${outputPath} (version ${version})`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(`claude-restyle: ${error.message}`);
    process.exitCode = 1;
  });
}
