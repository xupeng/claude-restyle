# Claude Restyle

仅用于 `https://claude.ai/*` 的 ScriptCat 字体自定义脚本，参考相邻
`notion-restyle` 项目的浏览器构建方式与字体搭配。支持普通 Chat、网页 Code 的
消息正文、输入框、标题、内联代码和代码块，以及侧栏英文／数字。

项目不包含 Claude 桌面版的探测、启动、注入或修改逻辑，不需要 CDP、后台服务
或本地应用。仅在 HTTPS 的 `claude.ai` 顶层页面运行，不进入 Artifacts 等 iframe。

## 安装到 ScriptCat

**[安装 Claude Restyle 用户脚本（ScriptCat）](https://raw.githubusercontent.com/xupeng/claude-restyle/master/userscripts/claude-restyle.user.js)**

仓库：[xupeng/claude-restyle](https://github.com/xupeng/claude-restyle)，默认分支 `master`。
脚本内置上述稳定 Raw 地址的 `@updateURL` 和 `@downloadURL`，由 ScriptCat
按设置检查更高版本；安装完成后刷新 Claude。

仓库为公开仓库，安装和自动更新无需 GitHub 登录或访问令牌。启用 ScriptCat 后
点击上述 Raw 链接，在扩展安装页确认安装。若浏览器未弹出安装页，可从
[源码页面](https://github.com/xupeng/claude-restyle/blob/master/userscripts/claude-restyle.user.js)
复制文件全部内容，按下面的方法安装。

### 手动安装

1. 在浏览器中打开 ScriptCat 的管理界面，选择 **Create Script / 新建脚本**，
   使用普通用户脚本模板。
2. 将 [`userscripts/claude-restyle.user.js`](userscripts/claude-restyle.user.js)
   的**全部内容**替换默认模板，保存并启用。
3. 刷新 `claude.ai` 页面。

脚本仅申请 `GM_registerMenuCommand` 权限，用于菜单中的
“Claude Restyle：暂时停用当前页（刷新恢复）”。长期停用请在 ScriptCat 中禁用
脚本并刷新页面。安装后无需运行 Node.js 或本地服务。

手动安装的脚本同样带有上述更新地址，无需手动配置。后续发布更高版本后，
ScriptCat 可检查更新并下载新脚本；更新检查频率及是否静默安装由扩展自身设置决定。

## 默认字体与自定义

编辑 [`assets/claude-custom.css`](assets/claude-custom.css) 中的四个 CSS 变量：

| 配置 | 默认效果 |
| --- | --- |
| `--claude-restyle-body-font` | 英文 Oxanium → Pridi；中文霞鹜文楷，粗体使用霞鹜臻楷 |
| `--claude-restyle-heading-font` | 英文 Signika；中文仓耳云黑 W04–W07，随标题字重选择 |
| `--claude-restyle-code-font` | Cascadia Code NF，启用连字；中文沿用正文映射 |
| `--claude-restyle-ui-font` | UI／侧栏英文 Oxanium → Pridi；中文使用系统字体 |

正文默认 `500` 字重，段落行高 `1.8`；保留加粗、斜体和标题字号层级。

### 文字缩放快捷键

沿用 notion-restyle 的快捷键（macOS 也使用 Control，不是 Command）：

| 快捷键 | 操作 |
| --- | --- |
| `Ctrl + Shift + =` / 小键盘 `+` | 放大 5% |
| `Ctrl + Shift + -` / 小键盘 `-` | 缩小 5% |
| `Ctrl + Shift + 0` | 恢复 100% |

小键盘同样需要按住 `Ctrl + Shift`。范围 60%–160%，在输入框内也可操作，
输入法组合输入期间不拦截。屏幕右下角短暂显示当前比例。

只调整消息正文、标题、代码和输入框的文字字号，不使用页面 `zoom` 或 `transform`，
不修改栏宽、侧栏、工具栏、图标或公式尺寸。文字会按新字号自然换行，内容高度可能变化。
设置保存在当前浏览器配置的 Claude 网站 `localStorage`，刷新、页面切换及脚本更新后保留，
同源标签页同步；清理网站数据会重置。存储不可用时仍可在当前页缩放。
停用菜单会恢复原字号，保留已记住的比例供下次加载使用。

Google Fonts 加载 Oxanium、Pridi、Signika 和 Noto Sans SC，需要网络连接；
若希望完全离线使用，删除顶部 `@import` 并将变量改为本机字体。
中文／代码字体使用 `local()`，需要本机已安装对应字体：

- `LXGWWenKai-Light`、`LXGWWenKai-Medium`
- `LXGW ZhenKai GB` / `LXGWZhenKaiGB`（兼容 `LXGW ZhenKai` / `LXGWZhenKai-Regular`）
- `TsangerYunHei-W04` 至 `TsangerYunHei-W07`
- `Cascadia Code NF` 或 `Cascadia Code`

缺少字体或字体请求被浏览器限制时，按字体栈回退。公式保留自身排版字体，SVG
图标保持原样。源码内嵌进用户脚本，不在运行时下载 JS 或 CSS 源文件；字体样式表
与字体文件是上述 Google Fonts 网络请求的例外。

CSS 会自动作用于流式回复和 SPA 切换后的新内容，不读取会话数据，不使用页面内部
对象或轮询。字号缩放使用 MutationObserver 合并处理动态内容，避免嵌套文字重复缩放。
Claude 更改 DOM 锚点后，可能需要更新选择器。

## 构建与验证

需要 Node.js 22+，无第三方 npm 依赖：

```bash
npm run build:userscript
npm test
```

已配置 `.pre-commit-config.yaml`。克隆仓库后运行 `pre-commit install`
安装提交检查。

只编辑 `assets/` 与构建脚本，生成的 `userscripts/claude-restyle.user.js` 应随源码
一同版本管理。`npm test` 先只读检查产物与源码、版本一致，再验证域名／iframe
限制、重复注入清理、停用菜单、元信息校验和构建一致性。

本地排版测试页包含正文、标题、代码、公式、输入框、侧栏及动态添加内容：

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8765/tests/fixtures/typography.html`。测试页直接加载 CSS，
用于浏览器排版验证；用户脚本本身不会在 localhost 执行。真实 ScriptCat 安装与
`claude.ai` 页面上的最终效果仍需浏览器验证。

本次验证：在已登录 Vivaldi 的普通 Chat 与网页 Code 中只读确认 DOM 锚点；
内置浏览器的本地测试页通过 18 项排版检查。当前 `npm test` 另包含安装链接、
默认更新地址与版本一致性检查。
自动安装因浏览器工具禁止访问 `chrome-extension://` 管理页而未完成；
需按上述步骤手动安装后刷新 Claude，检查实际字体加载和页面效果。

### 缩放回归测试

先生成仅供本地测试使用的运行脚本，再启动上面的 HTTP 服务：

```bash
mkdir -p artifacts
node --input-type=module -e 'import {readBrowserPayload} from "./scripts/build-userscript.mjs"; import {writeFile} from "node:fs/promises"; await writeFile("artifacts/zoom-fixture.js", await readBrowserPayload("fixture"));'
```

打开 `http://127.0.0.1:8765/tests/fixtures/zoom.html`，应显示 `16/16 passed`。
覆盖字号比例、图标与侧栏尺寸、持久化、重新注入、动态内容、重置及清理。
该测试只在 localhost 的通用样例页面运行，不访问 Claude 会话。

### 发布更新

1. 修改源码，递增 `package.json` 的三段数字版本。
2. 运行 `npm run prepare:pr`，构建安装文件并运行测试。
3. 审查差异，将源码、版本和生成的 `userscripts/claude-restyle.user.js` 一起提交，
   推送或合并到 `master`。
4. 在 ScriptCat 中检查更新并刷新 Claude；定时检查按扩展自身设置执行。

构建与测试命令本身不会提交或推送文件。
发布到 fork 或其他实际 HTTPS 地址时，可覆盖参数：

```bash
npm run build:userscript -- --version 0.1.1 --update-url https://example.com/claude-restyle.user.js
```

示例 URL 必须替换为真实发布地址。带覆盖参数的发布产物须用相同参数执行
`node scripts/build-userscript.mjs --check ...`；默认 `npm test` 检查本地默认构建。
