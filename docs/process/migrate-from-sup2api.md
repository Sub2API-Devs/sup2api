# 从 sup2api 迁入研究资料（2026-11-04）

2026-11-04，用户要求把 cc 作为一个完整的独立项目，把 sup2api 里该迁过来的内容迁过来，sup2api 本身不动。lead 用一个会话完成了这件事：只读 sup2api，向 cc 复制。迁移前后 sup2api 的 `git status` 没有变化。来源提交是 sup2api `9b4e71ec4`。

## 判断标准

迁入的内容必须同时满足两条：

1. 研究对象是**官方 Claude Code CLI 本身**，包括它的机制、请求、版本差异、实抓证据，或者是分析它的通用工具。
2. 不依赖 sup2api 的产品代码，包括补丁框架、Worker、网关、控制器。

sup2api 的产品内容一律不迁，包括：定制 CLI 补丁、发布产物、CCGateway 设计文档，以及依赖补丁 profile 的工具和测试。

## 迁入了什么

| cc 位置 | 内容 | 来源（sup2api） |
|---|---|---|
| `research/official-cli/` | 9 篇官方 CLI 行为分析（2.1.296–2.1.304，部分补到 2.1.312） | `next/plugins/ccgateway/docs/CLAUDE-CODE-*.md`、`CLAUDE-REQUEST-AND-WEBSEARCH.md`、`next/docs/CLAUDE-CODE-2.1.304-IMPLEMENTATION.md` |
| `research/versions/` | 2.1.310、2.1.312、2.1.316 的升级记录（官方变化清单）和升级手册；变化函数的新旧代码与差异；296/302 两次分析的取证 JSON | `next/plugins/ccgateway/docs/`、`artifacts/claude-<版本>/diffs/`、`docs/cli-research/` |
| `research/captures/` | 官方客户端在离线环境里实抓的请求（310/312/316 三次升级） | `artifacts/claude-<版本>/captures/` |
| `research/third-party-shape/` | 第一方/第三方形状对比：报告、代码路径、138 个门函数调用点、抓包、差异、脚本 | `artifacts/cc-thirdparty/`（`live82/` 除外） |
| `tools/versions/` | `equiv`、`lookup`、`unitdiff`、`inspect`、`tokcmp`、`supcmp` | `next/plugins/ccgateway/companions/cli-mods/tools/upgrade/` |
| `tools/extract/acquire.mjs` | 新写的通用下载脚本，按版本号下载官方二进制并校验 sha256 | 替代各版本目录里写死版本号的 `acquire.py` |
| `artifacts/official/2.1.304`、`2.1.310`、`2.1.312` | 官方 ELF（不入库）和 manifest（入库） | `artifacts/claude-<版本>/` |
| `artifacts/versions/` | sup2api 已算好的版本配对 `equiv-*.json`（不入库） | `artifacts/claude-<版本>/` |
| Claude 项目记忆 `D--projects-js-cc/memory/` | 项目概况、Bun 版本规则、官方 CLI 运行时事实、派子代理的做法、Windows Shell 转义坑 | sup2api 会话记忆里与 cc 相关的条目，按 cc 的情况改写 |

`restore-bun.cjs` 和 `elf-facts.cjs` 在第一阶段已经从 sup2api 复制过，这次逐字节比对，两边相同。

## 迁入前的检查

- **隐私**：迁入的抓包和文档都扫描过真实令牌（`sk-ant-api/oat/ort` 加真实长度）、邮箱、账号 UUID。令牌都是 `…-fake`、`…-client-login` 之类的占位值；账号 UUID 都是 `00000000-…-0001` 这类占位；邮箱只有 `noreply@anthropic.com`。`cc-thirdparty/live82/` 是生产账号 82 的实测数据，没有迁入。
- **工具能独立运行**：
  - `acquire.mjs` 校验了 2.1.304、2.1.310、2.1.312、2.1.316 四个 ELF，sha256 都与官方 manifest 一致。
  - `restore-bun.cjs` 在 cc 里还原了 2.1.312，得到 2,813 个模块，内嵌 Bun 1.4.4，修订 0ae49f8b6。
  - `equiv.cjs` 把 2.1.312 与 `original/`（2.1.316）配对，种子为空，用时约 9 分钟：98,638 个旧单元里配上 95,302 个，冲突 1,131 处。
  - 为此在根目录 `package.json` 加了依赖 `espree@10.4.0`、`eslint-scope@8.4.0`，版本与 sup2api 相同。
- **文档**：迁入的文档按原样保留，不改写。文中的相对路径指向 sup2api，这一点写在 `research/README.md` 的"来源与约定"一节里。

## 其他改动

- `AGENTS.md` 改写为独立项目的指令文件，写明：用中文；硬规则；Bun 版本规则；子代理做法；本机环境（heredoc 坑、代理）；与 sup2api 的关系（本仓库不修改 sup2api）；没有远端，推送前要问。
- `README.md` 增加了 `research/`、`tools/versions/`、`artifacts/versions/` 的入口。"已知限制"里补了一条：和官方原生二进制相比，`cch` 改写和运行时版本头这两处运行时行为不同。
- `.gitignore` 增加了三条：其他版本的 ELF、`artifacts/versions/`，以及 `research/**/*.log` 例外（抓取日志是证据，要入库）。
