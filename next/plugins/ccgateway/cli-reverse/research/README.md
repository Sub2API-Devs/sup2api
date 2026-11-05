# research：官方 Claude Code CLI 的行为研究资料

本目录收集 sup2api 项目在 2026-10 到 2026-11 期间对官方 Claude Code CLI 做的研究。这些研究都是为了让 sup2api 的定制 CLI（ccgateway）发出和官方一样的请求而做的。研究对象和本项目相同，都是官方 CLI，所以把它们迁到这里，作为逆向工程的一部分继续维护。

## 来源与约定

- 复制自 sup2api，复制时的提交是 `9b4e71ec4`（2026-11-04）。原件保留在原处，由 ccgateway 继续维护：文档在 `next/plugins/ccgateway/docs/` 和 `next/docs/`，数据在 sup2api 本机的 `artifacts/`（不入库）。本目录现在也在 sup2api 里，位置是 `next/plugins/ccgateway/cli-reverse/`。
- 文档按原样复制，没有改写。所以文中的相对链接和路径（如 `../companions/cli-mods/…`、`artifacts/claude-2.1.312/…`、`CONTRACTS §53`）**都是相对原件所在位置写的**，从本目录点不开。要看原文的上下文，请打开 `next/plugins/ccgateway/docs/` 里的原件。
- 文中的函数名都是**当时那个版本**的压缩名，比如 2.1.304 的 `kLo`、2.1.316 的 `Oi()`。它们和本目录阅读树里的名字不是一回事。要在阅读树里找 2.1.316 的同一个函数，用 `node tools/q.mjs find <压缩名>`，或者查 `naming/final/top.json` 里 `min` 字段等于这个压缩名的条目，并按文中写的 chunk 文件区分同名。其他版本先用 [`tools/versions/`](../tools/versions/) 配对到 2.1.316，再查名字。
- 很多文档带有"改造 / 补丁 / Worker / 网关"相关的内容，那是 sup2api 的产品设计，只作背景。本目录关心的是其中关于官方 CLI 本身行为的结论。

## 目录

| 路径 | 内容 | 原位置（sup2api） |
|---|---|---|
| [`official-cli/`](official-cli/) | 官方 CLI 机制与行为分析 | `next/plugins/ccgateway/docs/`、`next/docs/` |
| [`versions/`](versions/) | 版本之间的变化：升级记录、方法手册、函数级差异、取证数据 | `next/plugins/ccgateway/docs/`、`artifacts/claude-<版本>/diffs/` |
| [`captures/`](captures/) | 官方客户端在离线环境里实抓的请求 | `artifacts/claude-<版本>/captures/` |
| [`third-party-shape/`](third-party-shape/) | 改 base URL 接入时（第三方形状）和直连官方（第一方形状）的请求差异 | `artifacts/cc-thirdparty/` |

### official-cli/

| 文档 | 基线版本 | 主题 |
|---|---|---|
| `CLAUDE-CODE-CLI-MECHANISMS.md` | 2.1.296 | 发行结构、SDK 与 VS Code 接入、mods 事件机制、工具定义与执行路径 |
| `CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES.md` | 2.1.296 | 首次全面分析：请求组装、附件、历史记录识别 |
| `CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md` | 2.1.302 | 附件清单、搜索与思考、取消与错误元数据 |
| `CLAUDE-CODE-2.1.304-IMPLEMENTATION.md` | 2.1.304 | 请求从组装到发出的完整实现 |
| `CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md` | 2.1.304，第 12 节补 2.1.312 实抓 | 主代理与子代理的 system 怎么组装：计费头、身份行、静态段、动态段，缓存范围 |
| `CLAUDE-CODE-2.1.304-HARDWARE-PRIVACY-AUDIT.md` | 2.1.304 | CLI 读取和上报哪些硬件、环境信息 |
| `CLAUDE-CODE-ATTACHMENTS.md` | 2.1.296 起 | 附件类型与渲染 |
| `CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION.md` | 2.1.30x | 计费头（`cc_version`、`cch` 等）与提示词注入 |
| `CLAUDE-REQUEST-AND-WEBSEARCH.md` | 2.1.30x | 请求体结构与 web search |

### versions/

| 内容 | 说明 |
|---|---|
| `CLAUDE-CODE-2.1.310-MIGRATION.md`、`-2.1.312-`、`-2.1.316-` | 每次升级时整理的官方变化清单：哪些函数改了、改了什么、名字怎么对应 |
| `CLI-UPGRADE-RUNBOOK.md` | sup2api 升级定制 CLI 的手册。前半部分"分析新旧版本差异"的方法适用于任何版本对比 |
| `diffs/2.1.310`、`diffs/2.1.312`、`diffs/2.1.316/g1…g4` | 升级到该版本时，变化函数的新旧代码和差异（`<chunk>_<名字>.old.js / .new.js / .diff`），由 [`tools/versions/unitdiff.cjs`](../tools/versions/unitdiff.cjs) 生成 |
| `cli-research/2.1.296`、`cli-research/2.1.302` | 两次分析的取证与验证数据（JSON） |

版本之间的结构配对结果（`equiv-*.json`，每份 5–38 MB）没有放进来，放在 `artifacts/versions/`（不入库），可以用 `tools/versions/equiv.cjs` 重新生成。

### captures/

按"哪次升级时抓的"分目录。例如 `captures/2.1.310/` 是升级到 2.1.310 时抓的，里面有用来对照的 2.1.304 重抓。抓取方式是在一次性容器里让官方客户端连本地假上游，用占位令牌，不登录真账号，记录完整请求体和请求头。详见 `official-cli/CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md` 第 12 节。

注意：自定义 base URL 时，必须设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`，客户端才会按第一方形状发请求。

### third-party-shape/

- `REPORT.md`：结论。
- `code-and-prod.md`：代码路径。
- `gates-316.txt`：2.1.316 里第一方/第三方判断函数的 138 个调用点。
- `caps/`：抓包。
- `diffs/`：差异。
- `scripts/`：抓取和比对脚本。

抓包里的令牌和账号 ID 都是占位值。sup2api 原目录里还有一份 `live82/`，是生产账号的实测数据，**没有迁入**。

## 没有迁入的

| 内容 | 原因 |
|---|---|
| sup2api 的补丁、定制 CLI 构建与发布（`cli-mods/`、`release-v*`、`patched-v*`） | 属于 sup2api 产品 |
| 补丁专用的版本工具（`seeds.cjs`、`carry-profile.cjs`、`anchor-hazards.cjs`） | 依赖补丁 profile，见 [`tools/versions/README.md`](../tools/versions/README.md) |
| `cli-mods/test/analysis/` 下的组装覆盖、参数分析脚本 | 依赖补丁框架和 sup2api 的测试夹具 |
| 各版本的 `linux-restored/` 还原树 | 可以用 `tools/extract/restore-bun.cjs` 从 ELF 重新生成 |
| 2.1.304 的 `prompt-ast/` 查询脚本 | sup2api 里已经删除；本仓库的 `tools/q.mjs` 功能更完整 |
| `cc-thirdparty/live82/` | 含生产账号数据 |
| CCGateway 的设计文档（Worker、请求模式、注入等级等） | 属于 sup2api 产品 |

官方各版本的二进制（2.1.304、2.1.310、2.1.312）复制到了 `artifacts/official/<版本>/`。二进制本身不入库，`official-manifest.json` 入库。缺失时用 `node tools/extract/acquire.mjs <版本>` 下载并校验。

## 补充（2026-11-05）

- [`versions/CLAUDE-CODE-2.1.318-CHANGES.md`](versions/CLAUDE-CODE-2.1.318-CHANGES.md)：2.1.316 → 2.1.318 的官方变化清单，cli-reverse 升级到 318 时整理，不是从 sup2api 复制来的。文中的名字是 2.1.318 阅读树名，或 318 构建里的压缩名。sup2api 的定制 CLI 迁移记录在 sup2api 的 `next/plugins/ccgateway/docs/CLAUDE-CODE-2.1.318-MIGRATION.md`。
