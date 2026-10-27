# Claude Code 2.1.304 → 2.1.310 迁移记录（CLI v31 → v32）

2026-10-27。把账号 Worker 里的定制 CLI 从官方 2.1.304（`ccgateway-v31-request-capture`）移到官方 2.1.310（2026-10-23 构建，commit `0d2056ec`），要求 `claude request --build|--direct` 的逻辑与 v31 完全一样，只允许出现官方自己的变化。本文是这次迁移的分析、改动与验证记录；通用做法见 [CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md)，测试体系见 [CLI-TEST-PLAN](CLI-TEST-PLAN.md)。

| 项 | 2.1.304 / v31 | 2.1.310 / v32 |
|---|---|---|
| 官方 linux-x64 ELF SHA-256 | `ea0f1357…f27912` | `b7367643…7df56`（291638640 字节，与官方 manifest 一致） |
| 内嵌 Bun | 1.4.4 | 1.4.4（我们仍用 1.4.3 编译） |
| 还原 | 2710 模块 / 2461 JS | 2801 模块 / 2551 JS，`unresolved` 为空 |
| 补丁标签 | `ccgateway-v31-request-capture` | `ccgateway-v32-cc-2-1-310` |
| 定制 ELF SHA-256 | `b7a1df0e…3393d` | `7fa09728311a115da978a34064c836f9644ea3dbe0e0a08ccc3e6c14a0ff4486` |
| 能力 | 18 项 | 相同 18 项 |

分析中间产物在 `artifacts/claude-2.1.310/`（不进 Git）：`equiv-304-310.json`（配对）、`diffs/`（规范化 diff）、`review/`（五份审查报告）、`captures/`（官方抓包）。

## 1. 方法

1. **下载与还原**：官方 `latest` 通道为 2.1.310（`stable` 为 2.1.308），按 manifest 校验 ELF 后用 `tools/upgrade/restore-bun.cjs` 还原。
2. **结构对比**（`tools/upgrade/equiv.cjs`）：两边各约 9.5 万个模块级绑定，按 AST + 作用域分析规范化后配对。补丁依赖的约 110 个原生名字（profile 的全部 natives/coreScope/coreImports/locate 与锚点改写的函数）中，绝大多数结构相同；有变化的是 `qmn FH jA HTe`（核心）、`sF mle cy`（传输）、`dN Mn`、`m4t`（工具池）与入口 `Ve`；需要手工找的是 `uXn`（主查询内的局部函数）与入口。
3. **分组审查**（agent 并行，报告在 `review/`）：主查询与请求构建器（`rev-query.md`）、核心其余补丁点与环境代码名字（`rev-core.md`）、传输/认证/请求头（`rev-transport.md`）、入口/会话/资源/计费/身份/工具池与测试清单（`rev-entry.md`）。每份报告先给锚点对照表（旧文本、新文本、唯一性已验证、语义是否等价），再逐条列变化并分类：影响锚点 / 影响出口 / 与 `claude request` 无关（附理由）。
4. **REA 交叉验证**（`rea-check.md`）：12 个 changed 种子 12/12 一致；抽样的 same 依赖全部一致；按函数指纹唯一配对的 703 个函数与 equiv 无冲突，只发现 equiv 的 1 处配错（`38xgev2z:Da`）和一类漏检（一个新单元被两个旧单元同时占用）。据此给 equiv 加了一对一检查与 `similarity`。REA 分析不了 5 MB 的核心模块，函数级结论由 REA 指纹与 equiv 配对对照得出。
5. **官方请求对比**：`test/e2e/capture-official.sh` 用两版官方 CLI 在同样的全新环境里各抓一个请求，`test/e2e/official-diff.cjs` 按组件比较。

## 2. 官方 2.1.310 的变化（对我们可见的部分）

| 变化 | 出现在哪 | 结论 |
|---|---|---|
| 版本号：计费头 `cc_version=2.1.310.<指纹>`，指纹算法不变（salt `59cf53e54c78`、UTF-16 位置 4/7/20、sha256 前 3 位），因版本参与哈希而值不同；UA `claude-cli/2.1.310` | 原生生成计费头的请求、UA | 官方必要变化 |
| Bash 工具描述多一句 Monitor 说明（官方客户端里是 “Use the Monitor tool to stream events…”；`claude request` 注入的 Bash 是 “Foreground `sleep` is blocked; use Monitor…”） | 官方请求；我们只有“高”注入等级（注入 Bash 工具）会带出 | 官方变化，按原生原样 |
| 延迟工具列表多 `Monitor` | 官方客户端自己的请求 | 不经我们生成 |
| `cc_project` / `cc_project_src` 计费字段：只在 OAuth 订阅且配置了 `CLAUDE_CODE_ATTRIBUTION_PROJECT` 或设置 `attributionProject` 时出现 | 原生计费头 | Worker 容器不设这些（CLI 环境继承 Worker 环境，控制器不注入），不会出现；见第 6 节核对 |
| `total_tokens` 提醒的上下文窗口计算重写（1M、模型配置窗口、`tengu_kind_dewdrop`） | 低/高注入的 `total_tokens` 层 | 离线回归里所测模型数值与 2.1.304 相同 |
| 传输层：`mle→ece` 新增 `Nc.of(host).route` 钩子（全树无人赋值，空操作）；gzip 选择与末尾随机空白规则不变（阈值 4096，填充 0–256 个空格/制表符），所以 Worker 的 `content_sha256` 判定仍成立；TLS 新增按 URL 选 CA 列表 | 传输 | 对 `api.anthropic.com` 的会话与 CA 列表与旧版相同 |
| launcher 托管认证、`ccsSender`、`noResponseRetryLedger`、重试看门狗 scope、工具搜索拒绝重试、新附件类型（`goals` 等）、`nested_memory` 包装等 | 交互会话、宿主托管、重试路径 | 与 `claude request` 无关（build 在发送前返回，direct 不经过重试包装；Worker 不设相应环境变量），理由见各报告 |

其余补丁依赖（环境段渲染器、身份行、计费头识别、reminder 标签、query source、主代理上下文、登录 beta、日期、system 记录工厂、追加提示词拼接、请求构建器的请求体字段与 12 个 beta 顺序、SDK 的 beta Messages 端点与 `create`/`post`/`asResponse`、`x-stainless-*` 头）语义不变，只是名字与所在模块变了。原生夹具重生成后：词表、层词表、环境段完整模板三份与 2.1.304 逐字相同。

## 3. 补丁的迁移

同时把补丁器改成版本无关（cli-mods README“版本无关的结构”）：通用 `patch-cli.cjs` + 每版 `patches/<版本>.cjs` 与 `profiles/linux-x64-<版本>.json`；支持模块只按逻辑名从生成的 `native-<组>.js` 导入；`native-environment.inc.js` 用 `native_<逻辑名>`。先用新补丁器重新生成 2.1.304：与线上 v31 的补丁产物逐 token 等价（核心与入口模块 token 相同；5 个支持模块代码 token 相同、每个本地名背后的原生绑定相同、无旧名残留，`tools/upgrade/supcmp.cjs`），再做 2.1.310。

2.1.310 的 13 个被改写函数：入口 `cli.js:Ye`（锚点 `if(r!==void 0){`，参数 `e`、设置 `s`）、会话 `chunk-wrtp8qz8.js:Fr`、容器资源 `chunk-c6dz8eqs.js:nki` 与 `chunk-c57c64b0.js:X`、核心 `chunk-j0tbz6ra.js` 的 `rH`/`rSn`（请求构建器 `Ceo`、beta 列表 `Jr`）/`tSn`/`UC`/`Tkr`/`yao`、客户端 `chunk-bbw420pv.js:m$`/`ml`、计费 `chunk-f7aya6cs.js:EFs`。需要注意的改写：`m$` 把参数解构挪进函数体，API-key 检查插在解构之后（`apiKey` 由 `e` 变为 `n`）；核心里导入 `a`/`i` 的含义与旧版互换（环境对象变为 `i`）；`UC` 的插入代码改用 `Pr()`/`ls()`/`jn.push(dr)`。锚点文件由 `tools/upgrade/examples/derive-anchors-2.1.310.cjs` 从 2.1.304 逐条替换生成，`tools/upgrade/anchor-hazards.cjs` 确认 25 处替换文本逐字出现在产物里。

迁移中发现并修好的问题：

- 补丁器 `once()` 用 `String.replace` 的字符串替换，替换文本里的 `` $` ``、`$'` 等会被当作模式；2.1.310 的名字含 `$`（`m$`），已改为按原文插入（两版产物不变）。
- 补丁标签初版 `ccgateway-v32-cc-2.1.310` 含点号，Worker 与控制器只接受 `^ccgateway-[a-z0-9-]+$`：组装对账探针启动 Worker 时被拒，改为 `ccgateway-v32-cc-2-1-310`，补丁器现在按同一正则检查。
- 离线回归 `run.sh` 的 Worker 靠 `/usr/local/bin/claude`（指向镜像自带版本）找 CLI，挂载其他版本的候选 release 时启动失败；改为 `WORKER_CLI_PATH=/opt/ccgateway/cli/$CC_VERSION/claude`。

版本常量：`worker/Dockerfile` 的 `ARG CLAUDE_VERSION`、`controller/Dockerfile` 的 `CCG_DEFAULT_CLI_VERSION`、核心 `PinnedCLIVersion`、控制台默认 `cli_version` 改为 2.1.310，契约夹具 `core-worker-policies.json`、`web-policy-payloads.json` 重生成（只有 `cli_version` 变化）。

## 4. 验证

| 层 | 内容 | 2.1.304 / v31 | 2.1.310 / v32 |
|---|---|---|---|
| 单测 + 原生对账 | `npm test`（`CCG_REQUIRE_ARTIFACTS=1`，0 跳过） | 185/185 | 185/185 |
| 组装对账（自造复杂请求体：INPUT/SYS/MSG/TOOLS/PARAM/SEND/BILL_ENV） | `assembly-replay.cjs`，真实 Worker + 定制 CLI + 回环假上游 | 76/76，上游 64 | 76/76，上游 64 |
| 客户端来源 × 内容策略 | `assembly-replay.cjs` + `client-content-cases` | 14/14 | 14/14 |
| 官方客户端实时转发 | `live-official-client.cjs`（未改官方 CLI → Worker → 定制 CLI → 假上游，含会话恢复轮） | 10/10 | 10/10 |
| 官方抓包回放 | `official-client-replay.cjs` | verified，14 项 0 失败 | verified，14 项 0 失败 |
| 离线端到端回归（官方 2.1.304 客户端） | 0.1.103 镜像自带 Worker；基线 v31，候选 v32；`regress-compare` 把 `2.1.310` 规范成 `2.1.304` | — | 71 个场景 137 个上游请求：69 个逐字节相同，2 个（`plain-build-high`、`apikey-account-noncc-high`，即高注入等级）只差注入的 Bash 工具描述（`official-diff`：1 处差异）；`verify` 1595/1595；客户端值保真 12/12；分类 3 项通过；唯一失败的 `login-account` 两边相同（既有问题） |
| 离线端到端回归（官方 2.1.310 客户端） | 同上，客户端换成官方 2.1.310；`test/e2e/crossversion.cjs` 把每个请求与基线（v31 + 官方 2.1.304 客户端）的差异按组件归因：A 侧（官方客户端直连）也有的差异来自客户端，只在 B 侧（经网关）出现的来自网关 | — | `verify` 1595/1595；客户端值保真 12/12；分类 3 项通过；61 个客户端调用成功（`login-account` 同基线失败）；137 个请求里网关独有的差异只有高注入等级注入的 Bash 描述（2 个请求，即上一行的官方变化），其余差异（Agent/Bash 描述、延迟工具列表、子代理消息等）A 侧同样出现，来自客户端本身 |
| 组件组合（自造 CC 与非 CC 请求，12 单字段 worker、10 单字段 erase、66 对字段、5 组多字段、6 组混合来源、6 次连续切换、all-client、重复应用、direct） | `component-combination-replay.cjs`，夹具 `native-environment-<版本>.json` 由原生渲染器执行生成（两版三段文本逐字相同） | 216/216 | 216/216 |
| Worker 策略矩阵（核心 `ResolveFeaturePolicy` 导出的 67 组策略 + 32 组补充：历史块与更新、工具结果不扫描、缺块、CRLF、围栏、计费歧义、相邻切换） | `worker-policy-matrix.cjs`，0.1.104 Worker | 99/99，上游 98 | 99/99，上游 98 |
| 来源组合单元套件 | `analysis/client-combination-unit.mjs`，3^10 × 2^2 种来源组合 | 236196/236196 | 236196/236196 |
| Go / 前端 | 核心 `internal/ccgateway`、engine、contracts（本机）；控制台 ccgateway 页面 368 项 | — | 全过 |
| 生产（发布后） | 账号测试；35 号开完整日志 1 小时测一次再恢复跟随默认 | — | 21、35、36 Haiku 200（34 号上游 429 速率限制，与发布无关）；35 号日志 `upstream-request.json`：`/v1/messages?beta=true`、UA `claude-cli/2.1.310 (external, sdk-cli)`、计费头 `cc_version=2.1.310.e58`、无 `cc_project`、授权头 `[REDACTED]`，`response.json` 已组装 |

## 5. 发布

插件 0.1.104（Worker 镜像带 v32）+ 核心 0.1.207（`PinnedCLIVersion` 与控制台默认值），先插件后核心。切换步骤：配对原地更新把运行中的账号切到 2.1.310 后，立刻把 CCGateway 设置的 `cli_version` 保存为 2.1.310（核心只接受所有就绪运行环境都已报告的版本）；中间的窗口里已切换的账号会被核心预检拒绝、由同组其他账号承接。发布记录见 [ovh README](../../../deploy/gateway/ovh/README.md)。

## 6. 发布后核对项

- 每个账号 `/healthz`：`claude_version` 2.1.310、`cli_patch` `ccgateway-v32-cc-2-1-310`、`cli_sha256` `7fa09728…4486`。
- 账号容器里 Worker 进程环境没有 `CLAUDE_CODE_ATTRIBUTION_PROJECT`，`CLAUDE_CONFIG_DIR` 的设置里没有 `attributionProject`（`cc_project` 不会出现）。
- 控制台账号测试 200；开完整日志的账号，上游请求记录里计费头为 `cc_version=2.1.310.…`。
