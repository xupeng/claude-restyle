import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

import { buildUserscript, DEFAULT_UPDATE_URL, parseArgs, readBrowserPayload, renderUserscript } from "../scripts/build-userscript.mjs";

function browserContext(location = { protocol: "https:", hostname: "claude.ai", port: "" }) {
  const nodes = [];
  const menus = [];
  const window = {};
  window.top = window.self = window;
  const document = {
    head: { appendChild(node) { nodes.push(node); } },
    getElementById(id) { return nodes.find(node => node.id === id) ?? null; },
    createElement() {
      return {
        dataset: {},
        remove() {
          const index = nodes.indexOf(this);
          if (index !== -1) nodes.splice(index, 1);
        },
      };
    },
  };
  return { window, document, location, nodes, menus, GM_registerMenuCommand: (label, callback) => menus.push({ label, callback }) };
}

test("standalone userscript embeds CSS literally and requests only its menu privilege", async () => {
  const css = await fs.readFile(new URL("../assets/claude-custom.css", import.meta.url), "utf8");
  const script = renderUserscript({ payload: await readBrowserPayload("0.1.0"), version: "0.1.0" });
  const context = browserContext();
  vm.runInNewContext(script, context);
  assert.equal(context.nodes[0].textContent, css);
  assert.deepEqual([...script.matchAll(/^\/\/ @match\s+(\S+)$/gm)].map(m => m[1]), ["https://claude.ai/*"]);
  assert.deepEqual([...script.matchAll(/^\/\/ @grant\s+(\S+)$/gm)].map(m => m[1]), ["GM_registerMenuCommand"]);
  assert.doesNotMatch(script, /^\/\/ @(?:require|resource|connect)\b/m);
  for (const key of ["updateURL", "downloadURL"]) {
    assert.equal(script.match(new RegExp(`^// @${key}\\s+(\\S+)$`, "m"))?.[1], DEFAULT_UPDATE_URL);
  }
  assert.doesNotMatch(script, /\b(?:eval|fetch|MutationObserver|WebSocket)\(/);
});

test("installation link and generated artifact use the repository's stable update URL and package version", async () => {
  assert.equal(DEFAULT_UPDATE_URL, "https://raw.githubusercontent.com/xupeng/claude-restyle/master/userscripts/claude-restyle.user.js");
  const manifest = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));
  const script = await fs.readFile(new URL("../userscripts/claude-restyle.user.js", import.meta.url), "utf8");
  const readme = await fs.readFile(new URL("../README.md", import.meta.url), "utf8");
  assert.ok(script.includes(`// @version      ${manifest.version}\n`));
  assert.ok(readme.includes(`](${DEFAULT_UPDATE_URL})`));
  assert.ok(readme.includes("私有"));
  await buildUserscript({ check: true });
});

test("runtime rejects other origins, ports, HTTP and frames even if metadata is bypassed", () => {
  const script = renderUserscript({ payload: "window.installed = true", version: "0.1.0" });
  for (const location of [
    { protocol: "http:", hostname: "claude.ai", port: "" },
    { protocol: "https:", hostname: "claude.ai.example.com", port: "" },
    { protocol: "https:", hostname: "www.claude.ai", port: "" },
    { protocol: "https:", hostname: "localhost", port: "" },
    { protocol: "https:", hostname: "claude.ai", port: "8443" },
    { protocol: "file:", hostname: "", port: "" },
  ]) {
    const context = browserContext(location);
    vm.runInNewContext(script, context);
    assert.equal(context.window.installed, undefined);
    assert.equal(context.menus.length, 0);
  }
  const frame = browserContext();
  frame.window.top = {};
  vm.runInNewContext(script, frame);
  assert.equal(frame.window.installed, undefined);
});

test("reinjection and menu cleanup remove only this script's styles", async () => {
  const context = browserContext();
  const nativeStyle = context.document.createElement("style");
  nativeStyle.id = "claude-native-style";
  context.document.head.appendChild(nativeStyle);
  const script = renderUserscript({ payload: await readBrowserPayload("0.1.0"), version: "0.1.0" });
  vm.runInNewContext(script, context);
  const oldState = context.window.__CLAUDE_RESTYLE_STATE__;
  vm.runInNewContext(script, context);
  assert.equal(context.nodes.length, 2);
  assert.equal(context.menus.length, 1);
  assert.equal(context.nodes[1].dataset.claudeRestyleVersion, "0.1.0");
  oldState.cleanup();
  assert.equal(context.window.__CLAUDE_RESTYLE_STATE__.version, "0.1.0");
  context.menus[0].callback();
  context.menus[0].callback();
  assert.deepEqual(context.nodes, [nativeStyle]);
  assert.equal(context.window.__CLAUDE_RESTYLE_STATE__, undefined);
});

test("check detects stale and missing artifacts without writing, default build is deterministic", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "claude-restyle-test-"));
  const outputDirectory = path.join(temp, "userscripts");
  try {
    await assert.rejects(buildUserscript({ outputDirectory, check: true }), /Missing userscript/);
    await assert.rejects(fs.access(outputDirectory), { code: "ENOENT" });
    const result = await buildUserscript({ outputDirectory });
    const original = await fs.readFile(result.outputPath, "utf8");
    await buildUserscript({ outputDirectory });
    assert.equal(await fs.readFile(result.outputPath, "utf8"), original);
    await buildUserscript({ outputDirectory, check: true });
    await assert.rejects(buildUserscript({ outputDirectory, check: true, version: "9.0.0" }), /Outdated userscript/);
    assert.equal(await fs.readFile(result.outputPath, "utf8"), original);
    await fs.writeFile(result.outputPath, original + "\n// stale\n");
    await assert.rejects(buildUserscript({ outputDirectory, check: true }), /Outdated userscript/);
    assert.equal(await fs.readFile(result.outputPath, "utf8"), original + "\n// stale\n");
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
  await buildUserscript({ check: true });
});

test("publishing metadata and CLI reject malformed input", () => {
  const options = { payload: "void 0", version: "0.1.0" };
  const published = renderUserscript({ ...options, updateUrl: "https://example.com/claude-restyle.user.js" });
  assert.match(published, /@updateURL\s+https:\/\/example.com\/claude-restyle.user.js/);
  assert.match(published, /@downloadURL\s+https:\/\/example.com\/claude-restyle.user.js/);
  for (const version of ["", "1.0", "latest", "1.0.0\n// @match *://*/*"]) {
    assert.throws(() => renderUserscript({ ...options, version }), /version/);
  }
  for (const updateUrl of ["", "http://example.com/a", "https://a:b@example.com/a", "https://example.com/a#b", "https://example.com/a\n// @grant unsafeWindow"]) {
    assert.throws(() => renderUserscript({ ...options, updateUrl }), /Update URL/);
  }
  assert.throws(() => renderUserscript({ ...options, payload: "(() => {" }), SyntaxError);
  assert.deepEqual(parseArgs(["--check", "--version", "0.2.0"]), { check: true, version: "0.2.0" });
  for (const args of [["--unknown"], ["--version"], ["--check", "--check"], ["--version", "--check"]]) {
    assert.throws(() => parseArgs(args));
  }
});
