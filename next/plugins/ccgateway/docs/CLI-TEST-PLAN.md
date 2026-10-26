# CCGateway 定制 Claude Code CLI 测试方案

本文是定制 CLI（`companions/cli-mods`）的完整测试体系：有哪些层、每层测什么、怎么跑、在哪里跑、怎样算通过、失败了先查什么，以及**换 Claude Code 版本时怎样证明“逻辑一样”**。换版本的操作步骤在 [CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md)，本文只写验证与判定。行为本身以代码与设计文档为准：

| 主题 | 事实源 |
|---|---|
| build 组件、内容改写、计费头、身份行、身份 | [BUILD-REQUEST-COMPONENTS-DESIGN](BUILD-REQUEST-COMPONENTS-DESIGN.md) |
| 两种模式、策略头、能力门、错误来源 | [REQUEST-MODES](REQUEST-MODES.md) |
| 请求头去向、请求入口与 UA | [REQUEST-HEADERS](../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md) |
| 注入等级（0/微/低/高）与各层 | [CC-INJECTION-LEVELS-DESIGN](../../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md) |
| 请求类别、prompt ID、子代理 | [SUBAGENT-REQUEST-CONTEXT-DESIGN](SUBAGENT-REQUEST-CONTEXT-DESIGN.md) |
| 上游请求记录、日志级别、异步日志 | `REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md`、`REQUEST-LOG-POLICY-DESIGN.md`、`REQUEST-LOG-ASYNC-DESIGN.md`（`next/docs/ccgateway-feature-support/`） |
| 补丁结构、打包、版本记录 | [`cli-mods/README.md`](../companions/cli-mods/README.md) |
| 换版本的操作手册 | [CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md) |
| 离线端到端套件 | [`cli-mods/test/e2e/README.md`](../companions/cli-mods/test/e2e/README.md) |

当前版本是 Claude Code 2.1.310 / CLI v32（`ccgateway-v32-cc-2-1-310`）；2.1.304（v31）的 profile 与锚点仍在仓库里，测试照常覆盖。补丁器版本无关：`patch-cli.cjs` + 每版一份 `patches/<版本>.cjs`（锚点）与 `profiles/linux-x64-<版本>.json`（原生名字表），环境代码 `native-environment.inc.js` 各版共用，支持模块只从生成的 `native-<组>.js` 按逻辑名导入原生（见 cli-mods README“版本无关的结构”）。文中源码位置写到“文件 + 函数名”，不写行号；第 3 节的原生符号写 2.1.304 的名字（审查与分析都以它为基准），2.1.310 的对应名见第 4.5 节与 `profiles/linux-x64-2.1.310.json`。

---

## 1. 测试体系总览

| 层 | 测什么 | 位置 | 运行环境 | 何时必跑 | 通过标准 |
|---|---|---|---|---|---|
| L1 单元 | 每个支持模块的提取、解析、替换、重组规则；不跑原生构造器（原生函数用 `stub-*.js` 桩） | `cli-mods/test/*.test.mjs` | 任意系统，node（本机 Windows 可以） | 每次改 `cli-mods` | `npm test` 全部通过 |
| L2 原生对账 | 支持模块依赖的原生文字、原生字段、原生选择器与还原源码一致；补丁锚点能落在哈希绑定的模块上 | `test/native/<版本>/*.test.mjs` | 同上，另需 `artifacts/claude-<版本>/linux-restored`（不进 Git） | 每次改补丁、支持模块的原生绑定，换版本 | 全部通过且**没有** `CCG_NATIVE_TEST_SKIPPED`（CI 设 `CCG_REQUIRE_ARTIFACTS=1`） |
| L3 跨层契约夹具 | 前端 → 核心 → Worker → CLI 每一跳的实际线形，生产方与消费方用同一份夹具 | `contracts/testdata/*.json`；`engine/contract_fixture_test.go`、`core_policy_fixture_test.go`、`server/internal/ccgateway/contract_fixture_test.go`、`web/src/views/ccgateway/contractFixtures.spec.ts`、`cli-mods/test/contract-fixtures.test.mjs` | Go 测试需 Linux（engine 有 Linux 专属代码）；JS 任意 | 改任一层线形 | 各层测试通过；夹具变化须同时过消费方 |
| L4 组装对账 | 真实 Worker + 补丁 CLI + 回环 mock，按合同断言最终 body | `test/assembly-replay.cjs`（+ `assembly-runtime.cjs`、`assembly-merge.cjs`、`replay-helpers.cjs`、`fixtures/assembly-cases-<版本>.json`） | Linux 一次性容器，`--network none` | 改组装、参数、工具、计费 | 无 `fail`/`unknown`，退出码 0 |
| L5 组件组合 | 十个环境字段 × 来源 × 载体的组合，单元级穷举与真实 CLI 组合 | `test/analysis/client-combination-unit.mjs`（236196 组合）、`test/component-combination-replay.cjs`（216 项） | 前者任意；后者同 L4 | 改内容策略 | 全部通过 |
| L6 官方客户端回放 / 实时转发 | 未改的官方 CLI 真实生成请求，经 Worker + 补丁 CLI | `test/official-client-replay.cjs`、`test/live-official-client.cjs` | 同 L4 | 改出口形状 | 无 `fail`；README 的结论已过时（**第 9 节**） |
| L7 Worker 策略矩阵 | 核心真实生成的策略逐项发给真实 Worker，看目标字段与非目标字段 | `test/worker-policy-matrix.cjs` | 同 L4 | 改策略或环境来源 | 同上 |
| L8 单请求探针 | 回环桩上观察一个请求的形状 | `test/request-probe.cjs`、`request-modes-probe.cjs`、`websearch-probe.cjs` | 同 L4 | 排查 | 人工判读 |
| L9 离线端到端回归 | 官方客户端 → 扮演核心的代理 → Worker → 补丁 CLI → 假上游，69 场景 122 请求；两次运行逐字节比较；A/B 保真；日志核对 | `test/e2e/` | ovh（Linux + Docker），`--network none` | **每次发布 CLI 或 Worker**；换版本 | e2e README“判定通过” |
| L10 跨版本兼容 | 新 CC 版本与旧版本“逻辑一样” | `cli-mods/tools/upgrade/`（静态）+ L2 + `test/e2e/capture-official.sh`、`official-diff.cjs` + L9（动态） | 静态：本机 node；动态：ovh | 换版本 | 第 4 节 |
| L11 生产冒烟 | 发布后真实账号、真实上游 | 管理接口、账号容器日志 | ovh 生产 | 每次发布后 | 第 2.11 节 |

---

## 2. 各层说明

### 2.1 L1 单元测试（`npm test`）

```sh
cd next/plugins/ccgateway/companions/cli-mods
npm install --ignore-scripts      # devDependencies：@babel/parser、espree、eslint-scope、esbuild
npm test                          # = node test/run.mjs
```

**布局**。`test/run.mjs` 跑 `test/*.test.mjs`（版本无关）加 `test/native/<版本>/*.test.mjs`（该版本的原生对账），版本取 `CCG_CLI_VERSION`，否则取 `profiles/` 里最新的 profile（现为 2.1.310）；开头打印一行 `CCG_CLI_TEST_VERSION <版本>: <N> test files`，其余参数传给 `node --test`。`test/artifacts.mjs` 的 `pinned(version)` 给出该版本的 profile、还原源码路径 `artifacts/claude-<版本>/linux-restored`、夹具 `fixtures/<名>-<版本>.json`、跳过规则与按该版 profile 换好原生名的环境代码（`environmentSource()`）；`test/native/<版本>/` 里的测试各自 `pinned('<版本>')`。2026-10-27：两个版本都是 28 个文件、184 项全过，`CCG_REQUIRE_ARTIFACTS=1` 下 0 跳过。

支持模块与对应单元测试（规则细节见第 3 节组件目录）：

| 支持模块 | 规则 | 测试文件 |
|---|---|---|
| `request-input.js` | 组件信封 → CC 记录；system 消息 → `api_system`（原生 `ile`）；`tool_addition`/`tool_removal`；附件引用恰好用一次；原生渲染 `aBe` 必须与原文逐字节相等；工具配对；首条提示（指纹用） | `request-input.test.mjs`、`request-policy.test.mjs`（“304 input preserves string system…”） |
| `request-options.js` | 参数解析；beta 规范化；**数字保真**（`parseBuildJSON` 占位、`numberValue`） | `request-options.test.mjs` |
| `request-parameters.js` | 生成参数归属（`nativeFields`）、`generationControls`、`thinkingConfig`、`mergeAdditionalParameters`、`wireToolDefinitions`、`diagnostics` 只随客户端 | `request-parameters.test.mjs`；原生 body 字面量对账 → `native/<版本>/body-fields.test.mjs` |
| `request-policy.js` | `validateRequestPolicy`（`contract_version: 2`、键白名单）、`validateDirectPolicy`、`runtimeContext`（启动目录一致）、`identityLineFor`、`injectionChoices`、`contentDiagnostic` 白名单 | `request-policy.test.mjs`、`cli-prefix.test.mjs`、`request-injection.test.mjs` |
| `content-policy.js` | 环境段识别（围栏、标题、引导语、十个字段、update 段、基线）、`erase` 与清理、计费头识别与合并、请求入口 | `content-policy.test.mjs`（含 150、1620、6 项三个矩阵） |
| `direct-billing.js` + `raw-json.js` | direct 只改计费头，在原始 JSON 上拼接 | `direct-billing.test.mjs` |
| `request-identity.js` | `CCG_REQUEST_IDENTITY` 校验、`applyBuildMetadata`（三种载体、`rewrite`、无身份补账号身份）、`requestSessionID` | `request-identity.test.mjs`、`contract-fixtures.test.mjs` |
| `request-agent.js` | `CCG_REQUEST_AGENT` 校验、`resolveAgentContext`（只对 CC 请求读客户端上下文、HMAC 映射、loop 头原值）、`setClientUserAgent` | `request-agent.test.mjs`、`request-command-agent.test.mjs` |
| `request-headers.js` + `request-betas.js` | `normalizeBetas`、`finalBetas`（客户端顺序 + 新增按原生顺序插入）、OAuth/API Key 头策略、`betaOrder`（`S8n` + `uXn` 的 push 顺序） | `request-options.test.mjs`（“the login and cache betas go where Claude Code writes them”等） |
| `request-build.js` | 注入层（探针构建、已有层不重复）、身份行放置、缓存断点上限、计费合并、beta 两组、stream 位置 | `request-injection.test.mjs`、`cli-prefix.test.mjs` |
| `request-command.js` | 读输入、direct/build 分流、agent、beta 一次放置、错误帧 | `cli-prefix.test.mjs`（“the command sends build as it returned it…”）、`request-command-agent.test.mjs`、`request-command-errors.test.mjs`、`request-capture.test.mjs` |
| `model-request.js` | build 走原生 `client.beta.messages.create`、direct 走 `client.post(messagesPath)`；超时；数字在 fetch 边界还原；`--capture-request` 记录 | `model-request.test.mjs`、`request-capture.test.mjs` |
| `request-error.js` | HTTP 错误帧、本地错误帧、策略拒绝 403 | `request-error.test.mjs`、`request-command-errors.test.mjs` |
| `request-entry.js` | 原生 fast-path 策略先判，拒绝时 403 帧 | `request-entry.test.mjs` |
| `native-tools.js` | 客户端工具做成 CC 工具对象、不执行 | `native-tools.test.mjs` |
| `container-resources.js` | 按 cgroup 报告容器资源，不读宿主机 | `container-resources.test.mjs` |
| `native-environment.inc.js` | 按需读取原生环境字段 | `native-environment.test.mjs`；原生快照字段 → `native/<版本>/environment-collector.test.mjs` |
| 组装验收逻辑 | 有限清单验收不能被 HTTP 成功掩盖 | `assembly-coverage.test.mjs` |

测试用的支持模块按生产方式安装（`test/support.mjs` 的 `installSupport`：profile 的 `supportModules` 每个装成 `ccgateway-<名>.js`，互相引用与对 `./native-<组>.js` 的引用都改成安装后的名字）；版本无关测试里的原生函数由测试自己写的 `stub-*.js` 桩按逻辑名导出，`linkNatives` 按 profile 的 `natives` 分组生成同名的 `ccgateway-native-<组>.js` 再导出它们（桩没导出的逻辑名不生成，需要它的支持模块加载即失败）。词表与层词表读提交的夹具（`test/vocabulary.mjs`）。

### 2.2 L2 原生对账

**为什么要有**：支持模块不写 CC 的措辞与规则，全部在运行时从原生取（词表、身份行、计费头、beta 顺序、请求路径、原生 body 字段）。单元测试用提交的夹具与桩代替原生；对账测试在**还原源码**上执行原生函数或读原生 AST，证明夹具就是原生输出。每个版本一份，在 `test/native/<版本>/`：

| 对账项 | 怎么做 | 测试 |
|---|---|---|
| 环境词表 | 在 `vm` 上下文里加载还原源码的环境模块与按该版 profile 换好名字的 `native-environment.inc.js`，执行 `ccgatewayEnvironmentVocabulary()`（原生 `_oo`/`Kkt`/`Gkt`/`iys`/`ANe`/`aoo`/`xNe` 渲染带标记的快照再切出标签），与 `fixtures/native-vocabulary-<版本>.json` 比 | `native/<版本>/vocabulary.test.mjs` |
| 层词表 | 同上，`ccgatewayLayerVocabulary()`（附件开头、安全段 `p4n`、loop 头名），与 `fixtures/native-layers-<版本>.json` 比 | 同上 |
| 主线程 turn | 原生 `iws`/`h0n` 经 `ccgatewayMarkTurns` | 同上（“main-thread prompts get the native turn”） |
| 身份行 | 三组输入经原生 `n1n` 渲染，`t1n` 认得每一句 | `native/<版本>/identity-line.test.mjs` |
| 计费指纹 | 原生 `RIs` 的盐、下标 4/7/20（UTF-16）与 sha256 前三位；用该版官方抓包 `fixtures/official-request-<版本>.json` 复现其 `cc_version`（2.1.304：`2.1.304.b17`；2.1.310：`2.1.310.661`） | `native/<版本>/billing-fingerprint.test.mjs`（oracle 同目录 `billing-fingerprint-oracle.cjs`） |
| 原生 body 字段 | 用 AST 读哈希绑定的构造器 body 字面量，必须等于 `nativeParameterFields` 加上文档写明的客户端扩展；原生多写或少写一个字段就失败 | `native/<版本>/body-fields.test.mjs` |
| 环境快照字段 | 按需读取覆盖的键 = 原生收集器 `Wkt` 的键；原生新增字段就失败 | `native/<版本>/environment-collector.test.mjs` |
| 补丁导入 | 给补丁加一个目标模块不导出的名字或 profile 不绑定的模块，补丁器必须拒绝 | `native/<版本>/patch-imports.test.mjs` |
| 补丁集成 | 补丁绑定的基线哈希、改后哈希一致；外部请求的最终对象保留 ToolSearch、顺序、缺 description 与未知字段；工具缺省与空数组可区分；`CLAUDE_CODE_EXTRA_BODY` 不能覆盖；普通 CLI 行为不变；容器资源补丁不读宿主机；根会话用 Worker 身份 | `native/<版本>/patch-wire-preservation.test.mjs`（**缺还原源码时直接失败**，不跳过） |

**夹具怎么来**：词表与层词表夹具由上面的测试在还原源码上生成，设 `CCG_UPDATE_CONTRACT_FIXTURES=1` 时写回 `fixtures/`（不设时只比较，不同就失败并提示重生成）。`official-request-<版本>.json` 是未改官方 CLI 自己发出的请求：2.1.310 的由 `test/e2e/capture-official.sh` 抓取（一次性断网容器、全新 HOME、全新非 Git 项目、合成 API key、假上游）；2.1.304 的（与 `official-tools-2.1.304.json`）是 10-20 时期按另一套条件抓的，与 `capture-official.sh` 的结果不可直接比较（第 4.5 节）。`native-environment-2.1.304.json` 是原生渲染器在确定输入下的完整模板（2.1.310 还没有，见第 10 节）；`assembly-cases-<版本>.json`、`client-content-cases-<版本>.json`、组件组合清单由 `fixtures/build-*.cjs` 按 `CC_VERSION` 生成。

**跳过规则**（`test/artifacts.mjs`）：还原源码目录存在时对账测试必须真跑，目录里缺文件就失败；目录不存在时跳过并在 stderr 打印 `CCG_NATIVE_TEST_SKIPPED <原因>`；设 `CCG_REQUIRE_ARTIFACTS=1` 时缺目录也失败。**判定**：输出里不能有 `CCG_NATIVE_TEST_SKIPPED`，否则原生对账没有跑，不能算通过。

**改夹具的纪律**：重生成后必须看 `git diff test/fixtures/`，每处变化都要能对应到官方文字或原生规则的变化（换版本时这本身就是“官方改了什么”的证据，见第 4 节）；不能为了让测试通过而重生成。

### 2.3 L3 跨层契约夹具

| 夹具（`companions/contracts/testdata/`） | 生产方 | 消费方 |
|---|---|---|
| `web-policy-payloads.json` | 前端编辑器实际发送的策略（`web/src/views/ccgateway/contractFixtures.spec.ts`） | 核心的合并与校验（`server/internal/ccgateway/contract_fixture_test.go`） |
| `core-worker-policies.json` | 核心实际下发的 `WorkerPolicy` 线形 | Worker 解析成 CLI 信封（`engine/core_policy_fixture_test.go`） |
| `worker-cli-requests.json` | Worker 实际写给 CLI 的 stdin 与身份上下文（`engine/contract_fixture_test.go`，`CCG_UPDATE_CONTRACT_FIXTURES=1` 重生成） | CLI 的解析、策略、参数、输入、内容策略与身份函数（`cli-mods/test/contract-fixtures.test.mjs`，覆盖两种模式与 replace/client/worker 三种身份） |

生产方输出变化时生产方测试失败，重生成后必须让消费方也通过。契约夹具在 CLI 侧**不运行原生构造器**（`jOt`、`aBe` 要编译后的 CLI），这部分靠 L4/L9。

Go：`cd next/plugins/ccgateway/companions && go test ./engine/ ./contracts/...`。engine 含 Linux 专属代码，本机 Windows 跑不全；按项目惯例把源码 `git archive` 到 ovh，在 `golang:1.27-bookworm` 一次性容器里跑（容器写出的 root 文件用容器删）。

### 2.4 L4 组装对账（assembly-replay）

合同是 `fixtures/assembly-cases-<版本>.json`：可审阅的静态清单，带稳定 ID、分组、完整输入、策略、运行环境、预期、源码符号与夹具来源，由 `CC_VERSION=<版本> node fixtures/build-assembly-manifest.cjs` 从该版官方抓包等夹具生成（缺夹具就失败，不拿别的版本代替）。分组：`INPUT`（Worker/standalone 校验、空值、不安全数字、角色、工具回合、保留组件）、`SYS`（字符串/数组 system）、`MSG`（原消息角色与块、媒体、系统生命周期、官方完整请求）、`TOOLS`（自定义工具、ToolSearch/deferred、typed server 工具、顺序、未知属性）、`PARAM`（模型、令牌、thinking、工具选择、output_config、采样参数、未知字段）、`SEND`（逐字节 direct、beta/auth、一次上游、HTTP 错误、SSE）、`BILL_ENV`（无匹配/重复保留、精确字段替换、混合来源、独立计费指纹）。各组项数以清单为准。

运行（Linux 一次性容器）：`-e CCG_ASSEMBLY_DISPOSABLE=1`、只读挂载输入与 `test/`、`--entrypoint node <镜像> /tests/assembly-replay.cjs > report.json`。`CC_VERSION` 选清单（清单里的 `cc_version` 必须一致）；`PROBE_CLI`/`PROBE_WORKER` 指定制品，SHA 见下面的共同约定，另可 `PROBE_EXPECT_CLI_PATCH` 核对补丁标签；`PROBE_MANIFEST` 换清单，`PROBE_CASE_FILTER`/`PROBE_CASE_IDS` 跑子集。有任何 `fail`/`unknown` 退出码为 1。`assembly-merge.cjs` 校验批次 manifest 哈希、定义哈希、实际 CLI SHA 后合并；旧定义的结果不能满足新合同。

**L4–L7 共同约定**（`replay-helpers.cjs`，2026-10-27 起）：`CC_VERSION`（缺省 2.1.304）同时决定读哪一版的夹具（`fixtures/<名>-<版本>.json`，缺了就失败，不拿别的版本代替）、计费指纹与策略里的 `cli_version`，补丁 CLI 报告的版本必须一致；制品 SHA 一律由调用方给（官方 `PROBE_OFFICIAL_SHA`、补丁 CLI `PROBE_EXPECT_CLI_SHA`、Worker `PROBE_EXPECT_WORKER_SHA`），不给时只报告并标 `sha_unpinned`，这种结果不能作为验收；上游请求行按 `/v1/messages?beta=true` 断言。

### 2.5 L5 组件组合

- `test/analysis/client-combination-unit.mjs`：在该版原生完整模板（`native-environment-<版本>.json`）与词表上穷举 `3^10 × 2^2 = 236196` 个来源组合，逐项比独立的 golden 预期、输入不变、二次应用幂等、collector 只收到所需字段。collector 与计费生成是明确的替身，不算真实 CLI 执行。慢，不进 `npm test`：`[CC_VERSION=<版本>] node test/analysis/client-combination-unit.mjs`。目前只有 2.1.304 的模板（第 10 节）。
- `test/component-combination-replay.cjs`：先在隔离容器里按该容器的 `os.type/release` 与受控工作目录生成 `PROBE_MANIFEST`（必须挂一个可写输出目录保留它；生成器 `fixtures/build-component-combination-manifest.cjs` 按 `CC_VERSION` 选该版的组装清单与官方抓包），再调 `assembly-replay.cjs` 跑 216 项（CC、非 CC 各 108：12 单字段 worker、10 单字段 erase、66 对字段、5 组多字段、6 组混合、6 次连续切换、all-client、重复应用、direct）。

### 2.6 L6 官方客户端回放与实时转发

- `official-client-replay.cjs`：全新 HOME 启动未改官方 CLI 生成一轮请求，再把正文与 `anthropic-version`/`anthropic-beta` 头交给真实 Worker 回放；另有平台/OS 选择、派生样本、缺计费块补齐，以及四类普通 Messages（无 system、字符串 system、多模态与工具回合、reminder 引用）的 build/direct。报告字段：`system_equal`、`messages_equal`、`tools_equal`、`content_differences`、`full_body_equal`、`generation_parameter_differences`、`observed_tool_normalization`。
- `live-official-client.cjs`：不读历史夹具，官方 CLI 自己生成请求，经只记录原始请求、注入测试策略的入口转发给真实 Worker，补丁 CLI 请求回环 SSE 上游，响应一路回到官方 CLI；10 项（默认、单字段、多字段、混合来源、direct、动态 system 排除参数、自定义 system、会话首轮/恢复轮）。

两者都在 `--network none` 一次性容器里跑（`CCG_REPLAY_DISPOSABLE=1` / `CCG_ASSEMBLY_DISPOSABLE=1`），按 2.4 节的共同约定参数化（官方客户端缺省 `/input/claude-official-<版本>`）。它们的大部分职责已由 L9 的 A/B 对照接替；参数化之后按现行规则重跑的结果还没有（第 9 节）。官方请求本身的跨版本比较用 `capture-official.sh` + `official-diff.cjs`（第 4.2 节）。

### 2.7 L7 Worker 策略矩阵

`worker-policy-matrix.cjs`：Go 核心 `ResolveFeaturePolicy`/`resolvedWorkerPolicy` 生成的矩阵（`config-matrix-policies.json`）逐项发给真实 Worker，固定 CLI 向容器内 HTTP mock 发送。每项断言：一次上游 POST；目标字段按 client/worker/erase 生效；所有非目标 system/messages 文本、角色、顺序、缓存属性与工具定义相等；逐请求切换来源不残留。必须 `CCG_MATRIX_DISPOSABLE=1`、`--network none`、无 Docker socket；版本与 SHA 按 2.4 节的共同约定（不固定 SHA 就可能验收旧制品）。预期由 `native-environment-<版本>.json` 的原生字段片段拼出，目前只有 2.1.304 的（第 10 节）。

### 2.8 L8 单请求探针

`request-probe.cjs`、`request-modes-probe.cjs`、`websearch-probe.cjs`：本地回环模型桩，看一个请求在某模式下的形状、头、WebSearch 包装。只用于排查，不作为验收。

### 2.9 L9 离线端到端回归（e2e）

全部细节在 [`test/e2e/README.md`](../companions/cli-mods/test/e2e/README.md)：拓扑、69 个场景、17 组断言、环境变量、ovh 上的命令、输出位置、判定标准与已知差异。要点：

- 每次发布 CLI 或 Worker 前：基线镜像与候选（`NEW=1` 挂载候选 Worker 与 `CLI_NEW` 里的 CLI release）各跑 `all` + `values`（必要时 `conc`、`classify`），`regress-compare` 0 差异、`verify.cjs` 全过、`values 12/12`、`beta-check` 只有已知的 1 条。
- `run.sh` 启动 Worker 时用 `WORKER_CLI_PATH=/opt/ccgateway/cli/$CC_VERSION/claude` 指向被测 release 里该版本的 CLI，而不是镜像的 `/usr/local/bin/claude` 链接（它指向镜像自带的版本）；所以把另一版本的候选 CLI 挂进旧镜像也能启动，`CC_VERSION` 必须等于候选 manifest 里的版本。
- 动到请求日志时加 `REQUEST_LOG=full`，跑 `capcheck`（上游记录完整、逐字节一致、密钥未泄漏）与 `respmatch`（`response.json` 与客户端收到的流组装结果一致）。
- 先用同一镜像跑两遍确认 0 差异（排除环境噪声），再比新旧。

### 2.10 L10 跨版本兼容

见第 4 节。

### 2.11 L11 生产冒烟

发布顺序与原地更新见 [CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md) 第 7 节与 REQUEST-MODES §1.7。发布后：

1. **身份**：账号容器 Worker 的 `/healthz` 报告的 `claude_version`、`cli_patch`、`cli_sha256`、`capabilities` 与发布的 manifest/profile 一致（核心在发送前也会核对，不一致时核心回 503 `configuration_error`）；容器内 `/opt/ccgateway/cli/active-runtime.json` 指向新版本。
2. **账号测试**：管理接口 `POST /api/v1/accounts/:id/test`（选一个模型），走 Worker `/v1/ccgateway/probe`，固定 build、原生主线程；结果带 `test_mode: native_build`。它只证明账号可用，不代表业务请求的形状。
3. **真实客户端**：用真实 Claude Code 指向网关跑几轮（含工具、子代理），然后在该账号容器的 `/work/data/request-logs/<uuid>/` 看 `metadata.json`（`mode`、`log_level`、`log_level_source`、`upstream_captured`、`body_changed`）、`request-headers.json` 与 `upstream-request.json`：先看客户端发来的是什么，再看上游收到的是什么。线上直连上游时原生会给 ≥ 4096 字符的正文加随机空白再压缩，比较用 `content_sha256`。
4. **日志策略**：按 `artifacts/claude-2.1.304/e2e/release-0202/verify-logpolicy.py` 的做法（不在仓库，只是示例）：分别把一个测试账号设成 off/full/follow，各跑一次账号测试，看新日志目录的有无与级别来源，最后恢复 follow。
5. 上游 429 时先看是不是该账号被限速（换另一个可用的测试账号），再判断是不是请求形状问题。

---

## 3. 组件目录

每个组件：**格式**（上游看到的样子）、**提取**（CLI 从客户端请求里怎么认出它）、**替换/重装**（CLI 怎么改、怎么放回）、**源码**、**测试**。build 的总流程是：Worker 把客户端 body 装进组件信封（字段值字节不变，`system` → `systemPrompt`，其余顶层键进 `parameters`，custom 工具 `input_schema` 原位改名 `inputSchema`，另加 `attachments: []`、`requestPolicy`、`runtimeContext`）→ CLI `prepareBuildInput` 还原成 CC 记录（原文留在 `ccgatewayWireMessage`/`ccgatewayWireSystem`）→ `applyContentPolicy` 改写 → 非 CC 请求注入各层 → 原生 `jOt`（`qmn` → `PAs`）产出 body → 参数并回、计费合并、身份行、beta、身份 metadata → 原生 SDK 发送。direct 只动计费头。

### 3.1 总表

| # | 组件 | build | direct | 主要源码 | 单元/对账测试 | e2e |
|---|---|---|---|---|---|---|
| C1 | 请求行与传输 | `POST /v1/messages?beta=true`，原生 `client.beta.messages.create` | 同一路径（补丁期 AST 取出），`client.post` 发原始字节 | `model-request.js` `sendOnce`、`messagesPath` | `model-request.test.mjs` | verify #1 |
| C2 | system 计费头 | 总带：缺头补原生整行，缺字段补原生值，按来源换值 | 只处理首块开头的头 | `content-policy.js` `mergeBillingAttribution`；`direct-billing.js` | `content-policy.test.mjs` 计费各项、`direct-billing.test.mjs`、计费指纹对账 | `main-build-billing`、`s4`、`noncc-context2`、`noncc-classify` |
| C3 | 身份行 | OAuth 且非 CC 请求、缺身份行时按入口自适应补一句 | 不补 | `request-build.js` `identityRequest`/`applyIdentityLine`；`request-policy.js` `identityLineFor` | `cli-prefix.test.mjs`、`request-injection.test.mjs`、身份行对账 | verify #5 |
| C4 | system 文本块 | 字节原样，统一为块数组 | 字符串 system 拆成块 | `request-input.js` `parseComponents`；`direct-billing.js` `systemAsBlocks` | `request-input.test.mjs`、`request-policy.test.mjs`、`direct-billing.test.mjs` | `plain-*`、`plain-nosystem-*` |
| C5 | 环境段（十个字段） | 低/高等级按来源 client/worker/erase 改写识别出的行 | 不改 | `content-policy.js` `environmentRegions` 等；`native-environment.inc.js` `ccgatewayEnvironment` | `content-policy.test.mjs`、`native-environment.test.mjs`、词表对账、L5、L7 | `main-build-erase`、`attach-worker`、`main-build-low` |
| C6 | 首轮附件 reminder（注入） | 非 CC 请求按等级补 environment/model/total_tokens/date，已有不补 | 不补 | `request-build.js` `injectLayers`/`placeLayers`；原生 `ccgatewayLayerAttachments` | `request-injection.test.mjs`、层词表对账 | `plain-build-low/high`、`noncc-*` |
| C7 | 内置提示词（注入） | 高等级、非 CC、system 里没有安全段时补；客户端 system 成为追加提示词 | 不补 | `injectLayers`、`ccgatewayDefaultPrompt`、`limitBreakpoints` | `request-injection.test.mjs` | `plain-build-high`、`plain-tools-high`、`apikey-account-noncc-high` |
| C8 | 工具定义 | 客户端工具逐字节原样；高等级按名补 CC 工具，放在前面 | 原样 | `request-parameters.js` `wireToolDefinitions`；`native-tools.js`；补丁 `FH`；`injectLayers` | `request-parameters.test.mjs`、`native-tools.test.mjs`、`patch-wire-preservation`、`request-injection.test.mjs` | `plain-tools-*`、verify #4 |
| C9 | 消息与工具回合 | 原样；工具配对不全拒绝；原生修复/折叠跳过 | 原样 | `request-input.js`；补丁 `Gmn`/`jA`/`Xfr` | `request-input.test.mjs` | `tool-*`、`s1-*`、`turn2`、`compact`、`sub*` |
| C10 | 生成参数 | 构建器拥有的交给原生，其余原样并回；构建器表达不了的原样发 | 原样 | `request-parameters.js` | `request-parameters.test.mjs`、body 字段对账 | `values` |
| C11 | stream | 客户端发了才有，放在最后 | 原样 | `request-build.js` `finishBuilt` | `request-parameters.test.mjs`（“304 adapter sends stream only when the client did”） | `main-build-low-stream`、`credit-issued-stream-build` |
| C12 | beta 头 | 客户端 ∪ 构造器 ∪ 注入层；客户端顺序 + 新增按原生顺序插入；登录 beta 只随 OAuth | 客户端的 + 登录 beta | `request-headers.js`、`request-betas.js`、`request-command.js` `requestBetas` | `request-options.test.mjs` | `beta-check`、verify #6、`s5*`、`apikey-shape-*` |
| C13 | 请求入口与 UA | 入口按请求设置（原生 `setEntrypointOnRequests`）；CC 请求保留客户端计费字段时保留客户端 UA | 同 | `content-policy.js` `requestEntrypoint`；`request-agent.js` `setClientUserAgent`；补丁 `nl` | `content-policy.test.mjs`、`request-agent.test.mjs`、`request-injection.test.mjs` | `ua-*` |
| C14 | 请求类别与 agent 上下文头 | 只对 CC 请求采用客户端的；prompt-id 映射；agent-id 用客户端的 | 同（不映射） | `request-agent.js` | `request-agent.test.mjs`、`request-command-agent.test.mjs` | `subagent-*`、`sub[123]-*`、`noncc-context*`、`noncc-classify` |
| C15 | `metadata.user_id` 身份与会话头 | 按 Worker 的 `rewrite` 映射；没有时 OAuth 补账号身份 | 原样；会话头与 body 一致 | `request-identity.js`；补丁 `Yi` | `request-identity.test.mjs`、`contract-fixtures.test.mjs` | `noncc-identity*`、`s3`、`values user-id-*`、verify #3 |
| C16 | 数字保真 | 占位 → fetch 边界换回原文 | 原始字节 | `request-options.js`、`model-request.js` | `request-options.test.mjs`、`model-request.test.mjs`、`request-parameters.test.mjs` | `s2-*`、`values numbers*` |
| C17 | 上游请求记录 | `--capture-request`/`--capture-body` | 同 | `model-request.js` `requestCapture` | `request-capture.test.mjs`、`model-request.test.mjs` | `capcheck` |
| C18 | 错误帧 | HTTP 错误原样、本地错误帧 | 同 | `request-error.js`、`request-command.js` | `request-error.test.mjs`、`request-command-errors.test.mjs` | `err400-*` |
| C19 | 容器资源报告 | 不涉及请求 | — | `container-resources.js`；补丁 `Ali`/`V` | `container-resources.test.mjs`、`patch-wire-preservation` | — |

### 3.2 各组件细节

**C1 请求行与传输**。build 经原生 SDK 的 beta Messages create，路径、`?beta=true`、betas 转头都归 SDK；direct 要发原始字节，用 `client.post`，路径由补丁器用 AST 在 SDK 模块（profile `locate.betaMessagesModule`）里找唯一一条 POST `/v1/messages?beta=true` 并填进 `model-request.js` 的标记位（不写字面量）。`maxRetries: 0`；超时显式传 `min(timeoutMs, 600000)`，所以 `x-stainless-timeout` 是 600，原生按 `max_tokens` 的非流式超时规则不会触发。认证头由原生 `sF` 生成，`authenticatedRequestHeaders` 只覆盖版本与 beta（OAuth 要求 `Bearer`、不能有 `x-api-key`；API Key 路线要求 `x-api-key` 等于配置值、不能有 `authorization`）。

**C2 计费头**。格式：system 某个 text 块里以 `x-anthropic-billing-header:` 开头、不在代码围栏内的行；字段 `cc_version=<版本>.<三位指纹>; cc_entrypoint=<入口>;`，OAuth 另有 `cch=`，主线程另有 `cc_prompt_id`、`cc_turn_origin`、`cc_prompt_index`、`cc_turn_index`，子代理 `cc_is_subagent=true`，压缩请求有 `cc_prev_req=`。前缀取原生 `oJe`，首块是否计费头用原生 `B1s`。原生值是本次构建原生 `PAs` 写出的整行（补丁在 `PAs` 里经 `ccgatewayCaptureBilling` 取回）。合并规则（`mergeBillingAttribution`）：没有计费头或不在首块开头 → 在 system 首部插原生整行（不在首块的客户端头原样留下）；恰好一个合法头 → `worker` 字段换原生值、缺的追加、未知字段与 `client` 字段保留；多个头/重复字段/格式不对 → 有 `worker` 字段时 400，全 `client` 原样放行并记 `ambiguous`；原生值不可用 → 有 `worker` 时 503，否则放行记 `source_unavailable`。客户端头带 `cc_prompt_id` 且映射了 prompt ID 时改成映射值（`setLeadingBillingField`）。指纹：原生 `RIs` 取第一条非 meta 用户记录文本的第 4、7、20 个 UTF-16 单元加盐与版本求 sha256 前三位；build 下补丁让 `qmn` 对 `fingerprintMessages`（第一条用户消息里第一个不以 reminder 标签开头的 text 块）求值，direct 用同一取法喂给 `PAs`（`request-natives.js directBuild`）。direct（`applyDirectBilling`）：首块开头是头就按来源换值、补缺字段；没有就在最前插原生整行；字符串 system 拆成块数组（开头的计费行单独一块）；没有 system 时插在 `messages` 之后（官方键序）；只在原始 JSON 文本上拼接。`cch`：我们的 CLI 不算，非 CC 请求发 `00000`，CC 请求保留客户端算好的值（REQUEST-HEADERS“已知边界”）。

**C3 身份行**。三句由原生 `n1n` 按（是否非交互、是否有追加提示）渲染：`official_cli`、`official_cli_sdk`、`agent_sdk`，CLI 不存副本（`identityLineText`），判断用原生 `t1n`。选择（`identityLineFor`）：入口 `cli` → `official_cli`；`sdk-cli`/`sdk-ts`/`sdk-py` → `agent_sdk`，注入了内置提示词且客户端 system 非空时 `official_cli_sdk`；`claude-desktop`/`claude-vscode`（`claude-desktop-3p` 按前者）→ `official_cli_sdk`；表外入口按下发的服务端入口（默认 `sdk-cli`）。放置（`identityRequest` + 原生 `recordedCliPrefix` → `n1n` → `PAs` 放在 `[计费头, 身份行, ...提示]`，补丁 `ccgatewayCapturePrefix` 取回）：API Key 账号、带计费头的 CC 请求、system 已有三句之一 → 不补；CC 请求但首块既非计费头也非身份行（只在拿不到原生计费头且全 `client` 时）→ 最前插该入口的句子。

**C4 system 文本块**。Worker 只接受字符串或 `text` 块（块内只允许 `type`/`text`/`cache_control`，否则 400；`system: null` 400；缺省不写键）。CLI `parseComponents` 把字符串变成一个 text 块，`ccgatewaySystemBlocks` 原样进最终 body（补丁 `qmn` 的 `system:`），客户端块的 `cache_control` 保留；注入提示词时按上游 4 个缓存断点上限先去掉注入块上的原生标记（`limitBreakpoints`）。

**C5 环境段**。格式：原生 `zkt` 渲染的 `# Environment` + 引导语 `You have been invoked in the following environment:` 下的行，以及 `# Environment update` 增量段。识别（`environmentRegions`）：逐行跟踪围栏（围栏内不识别）；普通段要求标题下一行是原生引导语；段落到下一个标题或 reminder 标签（原生 `KF`/`lKe`）为止；十个字段（`platform_name`、`os_version`、`shell`、`primary_directory`、`additional_directories`、`git_repository`、`worktree`、`scratchpad_directory`、`github_cli`、`agent_proxy`）按原生渲染出的精确前缀匹配，`github_cli` 与 `agent_proxy` 整段正则全匹配；格式不符 `unsupported_format`、重复/围栏内 `ambiguous`、update 无基线 `missing_baseline`，都跳过不改。来源：`client` 原样；`worker` = CLI 用原生 `zkt` 渲染完整环境再解析回字段（恰好一段、非 update、无 blocked、含 `platform_name`，否则 503），Worker 不传值；`erase` 只删识别出的条目。写回（`splice`）按起点降序、跟随原文换行风格；整段受管行删光连标题删、reminder 内文删光连包装删、文本槽变空删槽、消息 content 空了删消息（有其他生命周期字段则报错）。`runtimeContext.workingDirectory` 必须等于 CLI 启动目录。只在等级低、高下发（核心稀疏下发，`client` 项不发）。诊断 `CCG_CONTENT_DIAGNOSTIC` 只含字段名、状态、载体。

**C6 首轮附件（注入）**。只对**没有计费头**的请求（`hasBilling` 为假）。选择：`build_injection.attachments` 里为 true 的 `environment`/`model`/`total_tokens`/`date`（按这个顺序）。已有判断：在载体（system 轮的文本、以 reminder 标签开头的 user 块）里按原生开头文字（层词表 `attachments[kind]`）找，有就不补。生成：一次原生探针构建（一条标记提示 `CCGATEWAY_FIRST_PROMPT_7d3c1a` + 原生附件记录，`ccgatewayNativeProbe: true`，不发送），附件的载体与位置由原生按模型决定（Opus 是第一条 user 之后的 system 轮、Sonnet 是 reminder 块，见注入等级设计 §2），再按探针结果放到客户端第一条 user 消息周围（`placeLayers`）；探针把附件并进提示时报错。

**C7 内置提示词（注入）**。高等级、非 CC、system 里没有安全段 `p4n` 全文时，用原生 `ccgatewayDefaultPrompt`（`wx` 按最终工具与模型渲染）生成，客户端 system 里的身份行留在最前，其余客户端文字成为追加提示词（按原生 `pr` 的拼接方式，补丁里复制改名为 `ccgatewayJoinAppend`）。只查 `p4n`，不认子代理段（审核 D12）。

**C8 工具定义**。客户端 custom 工具：Worker 只把 `input_schema` 原位改名 `inputSchema`，CLI `wireToolDefinitions` 原位改回，键序与字段是客户端的（缺 description 不补、`strict`/`cache_control` 原样）；非 custom（typed server 工具）原样进 `extraToolSchemas`。每个客户端工具另做一个 CC 工具对象（`requestTool`，带 `ccgatewayRequestDefinition`）供原生权限、延迟加载、工具搜索策略使用；补丁 `FH` 对这些对象直接返回客户端定义（v26 起；原生 `FH` 会加 `strict`/`eager_input_streaming`、走描述钩子、改键序）。`tools` 缺省与空数组不同（缺省不发）。注入工具（高等级）：按名补 CC 自己的工具，客户端有同名的保留客户端的；按原生 `m4t` 的工具池顺序（按名排序），放在客户端工具前面；CLI 没有的工具名 400 并列出可用的。

**C9 消息与工具回合**。`prepareBuildInput` 每条消息变成 CC 记录：`user`/`assistant`（补 `id`/`type`/`usage` 骨架），`role: system` 变 `api_system`（原生 `ile`，`tool_addition`/`tool_removal` 用原生字段名，其他 system 块类型要求用 direct）；`tool_use` 必须在下一个 user 轮被 `tool_result` 回应、id 唯一，否则拒绝（e2e `s1-missing-result-build` 因此没有上游请求）。补丁让原生对外部历史跳过修复、reminder 折叠与媒体裁剪（`Gmn`），`jA` 保留 `api_system`，`Xfr` 用 `ccgatewayWireSystem` 原文；最终 `messages` 用 `ccgatewayWireMessages`（`qmn`）。

**C10 生成参数**。原生拥有：`max_tokens`、`thinking`、`tool_choice`、`metadata`、`temperature`、`betas`、`output_config` 的 `effort`/`format`（`nativeFields`，`nativeParameterFields` 供对账）。`generationControls`：`max_tokens` 正安全整数、`temperature` 有限数、`thinking` 是原生认识的类型与字段（`enabled` 带正整数预算、`adaptive`、`disabled`）、`output_config` 是对象时交给构建器；否则构建器当作未传，最终 body 写回客户端原值（`controls.raw`，v29）。数字按“值完全相等才交给构建器”（`numberValue`：`10.0` 是 10，`1.00000000000000001` 不是）。`mergeAdditionalParameters`：`nativeFields` 以外的客户端参数（`top_p`、`top_k`、`stop_sequences`、`service_tier`、`context_management`、未知字段等）原样并回；`output_config` 只并回 `effort`/`format` 以外的子键；`diagnostics` 只在客户端发了时才有。`parameters` 里出现组件键、`requestPolicy`/`runtimeContext` 或 `ccgateway*` 前缀拒绝。补丁让外部请求不读 `CLAUDE_CODE_EXTRA_BODY`。

**C11 stream**。原生 body 不带 stream；客户端发了就放在最后（官方位置），没发就没有。非布尔值原样发。

**C12 beta 头**。`normalizeBetas` 去重、校验 token。最终列表 = 客户端的（客户端顺序）+ 本次新增的（构造器的、注入层的、OAuth 登录 beta `gTe.header`），新增的插在原生顺序里的位置：顺序 = 原生模型表 `S8n(model, {isAgenticQuery: true})` 再接构造器 `uXn` 逐个 push 的 beta（补丁期 AST 读出，填进 `request-betas.js`）；模型表认不出时追加并写 `CCG_BETA_ORDER_UNAVAILABLE`。API Key 账号不带登录 beta。实验 beta 被原生策略 `mBr` 禁用时报错。

**C13 请求入口与 UA**。入口 E = 首块计费头的 `cc_entrypoint`（存在且该字段不是 `worker` 来源时），否则服务端入口，否则 `sdk-cli`；CLI 在构建前调原生 `setEntrypointOnRequests(E)`，原生计费头（`kLo`）与 UA（`dN`）读同一个值。客户端 UA 是 CC 形状（`claude-cli/x.y.z (external, <入口>[, …])`）、且发出的首块计费头 `cc_version`/`cc_entrypoint` 仍是客户端的时，用客户端 UA（补丁 `nl` 先读 `clientUserAgent()`），否则原生 `dN()`。Worker 给 CLI 进程的默认 `CLAUDE_CODE_ENTRYPOINT=sdk-cli` 与策略默认入口是两处独立的默认。

**C14 请求类别与 agent 上下文头**。Worker 把客户端的 5 个上下文头、loop 头、CC 形状 UA 放进 `CCG_REQUEST_AGENT`（`{version:1, map, key?, client}`，字段逐个正则校验）。只有 system 带计费头的 CC 请求采用：类别取 request-class 头，否则计费头 `cc_is_subagent=true` → 子代理，否则主线程；prompt ID 映射（`map` 时 HMAC 派生 UUIDv4）；agent-id 用客户端原值（父线程的消息里引用它），没有才派生；`custom` agent 类型不发。非 CC 请求一律主线程、客户端上下文头全不用（v28）。loop 头（prev-tool-durations、4 个压缩头）原值放回。头本身由原生 `sF` 按 `querySource`/`requestClass`/`agentContext`/`promptId` 写出。

**C15 身份与会话**。`CCG_REQUEST_IDENTITY`（`{version:2, mode, rewrite, session_id?, device_id?, parent_session_id?, carrier?}`）只经环境变量。`applyBuildMetadata`：没有上下文时原生 metadata 不动；`rewrite` 且客户端有 `user_id` → 换成原生身份（`yBe`）叠加映射字段，载体沿用客户端的（JSON 字符串/对象/扁平 `user_<device>_account_<uuid>_session_<sid>`）；`rewrite` 且 `replace` 但客户端没有 → 补账号自己的身份（JSON 字符串），其他 metadata 键保留；否则客户端原值（没有就删掉 metadata）。会话头：补丁 `Yi` 让根会话 = `requestSessionID()`，与 metadata 一致。direct 原样转发 body。

**C16 数字保真**。build 解析前把 `JSON.stringify(Number(x)) !== x` 的数字换成 `"ccgnum_<本次随机 nonce>_<序号>"`，组装全程带着；fetch 边界（`captureErrorResponse` 的 `fetchOverride`）把最终 body 文本里的占位换回原文；占位被拷进别的文本、还原后仍有残留就报错不发。direct 发原始字节。

**C17 上游请求记录**。`--capture-request <前缀>` 写 `<前缀>.json`（方法、URL、按名排序的小写请求头，`authorization`/`proxy-authorization`/`x-api-key`/`cookie` 为 `[REDACTED]`，正文编码/字节数/`body_sha256`/`content_sha256`、model、stream、`attempts`）；`--capture-body` 另写 `.body`。记录点在数字还原与认证头之后、交给原生传输 `mle` 之前；不延迟、不影响请求，命令退出前等写完。

**C18 错误**。上游 HTTP 错误：状态、`Content-Type`、正文原字节（有 `--response-meta` 时写 `<file>.error-body`，否则 stderr 帧里 base64）；本地失败：结构化 stderr 帧，来源 `input`/`transport`/`timeout`/`interrupted`/`internal`；退出码 0/1/2/130。

---

## 4. 跨版本兼容测试

目标：证明新版本上**我们依赖的每一段原生逻辑与旧版本相同**，或者每一处不同都已被理解、并在出口上表现为可解释的官方变化。三条证据缺一不可：静态（代码结构）、动态（出口字节）、白名单（把预期的差异写成可审查的规则）。工具在 `cli-mods/tools/upgrade/`，依赖是 cli-mods 自己的 devDependencies（在 cli-mods 下 `npm install --ignore-scripts` 一次即可，任何机器都能跑）；下面的命令都在 cli-mods 目录下运行，`<旧>`/`<新>` 是版本号。每个工具的完整说明在其头注释与 [CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md) 第 2–4 节，本节只写验证要求。

### 4.1 静态：AST 结构对比 + REA 交叉验证 + 锚点审查

**① 还原源码**。官方 ELF 的 SHA-256 与官方 manifest 一致后：

```sh
node tools/upgrade/restore-bun.cjs <官方 ELF> /abs/artifacts/claude-<新>/linux-restored <新>
```

输出目录必须不存在；`reconstruction.json` 的 `binarySha256` 等于清单 checksum、`unresolved` 为空、`entry` 是 `cli.js`。目录名固定，原生对账测试按它找还原源码。

**② 结构等价（`seeds.cjs` + `equiv.cjs`）**。

```sh
node tools/upgrade/seeds.cjs . <旧> > /abs/artifacts/claude-<新>/seeds.json
node --max-old-space-size=14000 tools/upgrade/equiv.cjs <旧还原目录> <新还原目录> \
  /abs/artifacts/claude-<新>/seeds.json /abs/artifacts/claude-<新>/equiv-<旧>-<新>.json
```

- 种子由 `seeds.cjs` 从旧版 profile（`natives`、`coreScope`、`coreImports`、`locate`）与旧版锚点文件里每个 `edit(<文件>, '<名字>')` 自动生成，不再手写；需要时可在种子上加 `newKey` 强制配对、`depth` 改闭包深度（默认 3）。
- 单元 = 每个模块的每个模块级绑定。规范形式 = AST，标识符按作用域分析（eslint-scope）归类：局部变量按首次出现编号 `L<n>`，模块绑定记为 `M` 并按顺序记下它解析到的绑定（经 import/export），全局保留名字，属性名保留字面。规范形式相同、引用逐个对应的两个单元视为同一逻辑。
- 构建元数据（版本、构建时间、commit）自动从两边 `cli.js` 的 `VERSION`、`BUILD_TIME`、`GIT_SHA` 读出并归一成同一占位；`EQUIV_NORMALIZE='[["旧值","新值"],…]'` 可覆盖。索引缓存写在输出旁边 `equiv-index-<哈希>.json`。
- 配对是一对一的：同一旧单元被配到两个新单元记为冲突 `old-reached-twice`，一个新单元被第二个旧单元占用记为 `new-claimed-twice`，都不配对。`changed` 的一对带 `similarity`（对齐后相同 token 的比例）与 `how`（怎么配上的）；**`similarity` 低于约 0.3 的多半是配错了**，先确认配对再看 diff。
- 标准输出一行汇总：`seeds` 每项 `[旧键, 新键, 状态, 闭包总数, same, changed, unmapped]`；输出 JSON 有 `map`、`conflicts` 与每个种子的 `report`。

**③ 读懂变化与带名字过版**。

```sh
node tools/upgrade/lookup.cjs <equiv.json> chunk-rncrmfyt.js:qmn uXn new:chunk-j0tbz6ra.js:rSn   # 旧→新（或 new: 反查）、状态、冲突
node tools/upgrade/unitdiff.cjs <旧还原> <新还原> <equiv.json> <输出目录> chunk-rncrmfyt.js:qmn ...  # 两侧统一命名后 esbuild 重排版再 diff
node tools/upgrade/inspect.cjs <还原目录> <文件> <名字|-> [搜索词...]                              # 打印一个绑定或整个模块，或只看搜索词上下文
node tools/upgrade/carry-profile.cjs <equiv.json> <旧 equiv-index> <新 equiv-index> profiles/linux-x64-<旧>.json <新核心模块> > carry.json
```

`carry-profile` 按配对把旧 profile 的原生名字带到新版，配不上或配到 changed 单元的写进 `problems`，逐个人工确认。

**④ 判定规则**。每个种子（及其闭包）必须落入下面一类，并写进移植记录（迁移文档或分组审查报告）：

| 结论 | 条件 | 后续 |
|---|---|---|
| 逻辑相同 | `same`，闭包全 `same` | 无 |
| 改名/重排 | `changed` 但 `unitdiff` 只剩命名、顺序、等价改写 | 记一句理由 |
| 与我们无关的变化 | 变化在我们不读、不改的分支 | 写明是哪个分支、为什么不经过 |
| 官方行为变化 | 影响出口（新 beta、新 body 字段、新提示词文字、UA 格式等） | 预期出口差异 → 第 4.3 节白名单，附 `unitdiff` 片段；相关原生对账夹具重生成并审查 diff |
| 影响锚点 | 锚点文本或周围语义变了 | 在 `patches/<新>.cjs` 重新推导锚点并审查（⑥） |
| `unmapped` / 冲突 / 低 `similarity` | 没有可靠配对 | 必须人工定位（按字符串、调用关系、`inspect`），并用 REA 独立确认后才能归入上面几类 |

**⑤ REA 交叉验证**。`equiv` 是我们自己写的工具，结论要有独立来源。做法见 RUNBOOK 第 3.3 节：用 REA 的 `analyze_javascript_application` 分别分析新旧还原目录里的相关模块、`compare_application_versions` 看版本差异，把两边各自唯一的函数指纹配对后与 equiv 的 `map` 逐模块对照（same/changed 一致记为确认，分歧单独审查）；模块私有绑定的读写点用 `trace_javascript_semantics` 配合全树文本搜索确认；锚点用到的字面量（如 `/v1/messages?beta=true`、beta 头名、`x-anthropic-billing-header`）在新版本里是否仍唯一且在同一函数。已知限制（[`rea-check.md`](../../../../artifacts/claude-2.1.310/review/rea-check.md) 第 4 节）：5 MB 的核心模块超出 REA 的分析预算、只能切块；指纹只覆盖函数；函数跨模块搬家会误报；`compare_functions` 只适用于原生代码。两边不一致时以人工阅读源码为准，并记录分歧。

**⑥ 锚点逐个审查**。补丁的修改点在 `patches/<版本>.cjs`，每一处都是 `edit(模块, 函数, once(原文, 改后))`，`once` 要求原文在该函数里恰好出现一次。2.1.304 的修改点：`cli.js Ve`（请求命令入口）、`chunk-dxktn51d Yi`（根会话）、`chunk-yqea5hk4 Ali` 与 `chunk-sx3g9k86 V`（容器资源）、核心模块 `FH`（客户端工具定义）、`qmn`（外部请求的 tools/system/messages/betas/指纹/计费与身份行捕获、只构建不发送）、`Gmn`（跳过修复）、`jA`（保留 `api_system`）、`Xfr`（system 原文）、`_oo`（代理说明）、`chunk-38xgev2z sF`（API Key 专用路线）与 `nl`（UA）、`chunk-t61vswm2 PAs`（捕获计费行与身份行）；补丁期 AST 定位（profile `locate`）：`uXn` 的 beta push 顺序、SDK 模块里唯一的 POST `/v1/messages?beta=true`、`chunk-wt08cjq1 pr`（追加提示拼接）、`ile`（system 记录工厂）。profile 把这些与支持模块用到的原生绑定集中成 `locate`、`natives`、`coreScope`、`coreImports`、`modules`（哈希）。每一处都要回答：新函数是不是旧函数的对应（④）；原文仍唯一吗；被替换的变量在新版本里扮演的角色是否相同（读 `unitdiff`，不只看能否匹配）；改后的代码在新版本里引用的名字是否都存在（`checkImports` 只查导入，局部变量要人工看）。补丁器本身拒绝任何哈希不符的模块与不唯一的锚点。辅助：

- `tools/upgrade/examples/derive-anchors-2.1.310.cjs`：2.1.310 的锚点由它从 2.1.304 的锚点逐条替换生成，每条替换必须恰好命中预期次数，可作下一次的样板。
- `node tools/upgrade/anchor-hazards.cjs . <版本> <补丁输出目录>`：列出 `patches/<版本>.cjs` 替换文本里含 `$` 替换模式（`$$`、`$&` 等）的锚点，并确认补丁产物逐字包含每段替换文本。
- 同版本重构补丁器或支持模块时，用 `tokcmp.cjs`（两份文件按 token 比较，可给改名表）与 `supcmp.cjs`（重构前后的支持模块：代码 token 相同、每个本地名背后的原生绑定相同）证明产物等价。

**⑦ 原生对账测试在新版本上全过**：`CCG_CLI_VERSION=<新> CCG_REQUIRE_ARTIFACTS=1 npm test`。新版本的 `test/native/<新>/` 是旧版本那份的副本加上新的预期（文件里 `pinned('<新>')`）；夹具重生成（`CCG_UPDATE_CONTRACT_FIXTURES=1`）后的 `git diff` 就是官方文字/规则变化的清单，逐条对应到 ④ 的“官方行为变化”。旧版本也要再跑一遍（`CCG_CLI_VERSION=<旧>`），证明版本无关部分的改动没有破坏它。

### 4.2 动态：官方请求对比与出口字节对照

**D0 官方客户端自身的变化**（本机之外只需一个能跑 Docker 的 Linux 主机；容器 `--network none`）：

```sh
IMG=ccgateway-app:<插件版本> OFFICIAL_CLI=<新官方 ELF> \
  sh test/e2e/capture-official.sh test/fixtures/official-request-<新>.json [模型]
IMG=… OFFICIAL_CLI=<旧官方 ELF> sh test/e2e/capture-official.sh <旧版重抓>.json   # 旧版用同一脚本重抓，不能用条件不同的旧夹具
node test/e2e/official-diff.cjs <旧版重抓>.json test/fixtures/official-request-<新>.json [--full]
```

`official-diff` 按组件（顶层键与顺序、各 system 块、首轮各 reminder、每个工具的名字/描述/schema/其他字段、生成参数）比较，版本号、`cc_version` 指纹、`cch`、prompt id、日期先规范化；末行 `{"differences":N,"labels":[…]}`。这份差异就是“官方自己改了什么”的完整清单，D1/D2 的判读与第 4.3 节白名单以它为准。

然后用 e2e 套件（`test/e2e/`）在 ovh 跑两组。每组都先确认各自的运行在同一配置下重复一次是 0 差异。

| 组 | 客户端（`OFFICIAL_CLI`） | 网关 CLI | 比较 | 期望 |
|---|---|---|---|---|
| D1 新旧 CLI | 旧官方，两次相同；`CLIENT_CC_VERSION` 两次相同 | 基线：`CC_VERSION=<旧>`，镜像自带的旧 CLI；候选：`NEW=1 CLI_NEW=<新 release 目录> CC_VERSION=<新>`（`TAG` 不同） | `node regress-compare.cjs $B/work-<基线>/cap $B/work-<候选>/cap rules.json` | 只剩白名单里的官方变化；`verify.cjs`、`values-verify`、`beta-check` 在两边结论相同 |
| D2 新版保真 | 新官方，`CLIENT_CC_VERSION=<新>` | 新 CLI | 同一运行内 `compare.cjs`（A/B）、`verify.cjs`、`beta-check`、`msgs-diff` | A/B 差异只在 e2e README“允许的差异”表内；断言全过 |

说明：

- D1 用同一个旧官方客户端，所以 CC 请求里客户端自己的部分（客户端计费头、UA、消息、工具）两边相同；差异只能来自网关 CLI 的原生部分（原生补的计费头与 UA、构造器加的 beta 与 body 字段、注入的提示词/工具/附件文字、SDK 头）。
- D1 的候选 CLI 版本与镜像不同也能跑：`run.sh` 让 Worker 用 `WORKER_CLI_PATH=/opt/ccgateway/cli/$CC_VERSION/claude`，挂载的候选 release 里必须有该版本，`CC_VERSION` 必须与候选 manifest 一致，否则 `docker.sh` 失败、Worker 起不来或回 409。
- D2 证明新 CLI 对新客户端仍然“像官方”：新官方客户端直连（A）就是新版真实发给上游的样子。需要两次运行的 A 侧逐文件对照时，用 `export-baseline.cjs <cap> <out>` 各导出一份再 diff（`OFFICIAL_LABEL` 写明客户端）。

### 4.3 必然差异的白名单

白名单是 `regress-compare.cjs` 的规则文件（格式见 e2e README）。只允许下面几类，每一条都要附证据；脚本忽略未知键，所以把证据写在同一个文件里：

```json
{
  "replace": [["claude-cli/2.1.310", "claude-cli/2.1.304"], ["cc_version=2.1.310", "cc_version=2.1.304"]],
  "ignoreHeaders": [],
  "mask": [],
  "evidence": {
    "replace claude-cli/2.1.310": "UA 版本段来自原生 dN（2.1.310 M$），unitdiff 只有版本常量",
    "replace cc_version=2.1.310": "原生计费头 PAs（2.1.310 EFs）的版本常量；指纹末三位由内置掩码处理"
  }
}
```

| 允许 | 条件 |
|---|---|
| 版本串：UA 的 `claude-cli/<版本>`、计费头的 `cc_version=<版本>` | 只用 `replace`，只换版本号本身；指纹已被内置掩码处理 |
| SDK/运行时头（如 `x-stainless-package-version`） | `unitdiff` 证明是常量变化；用 `ignoreHeaders`，名字与顺序仍比较 |
| 构建元数据 | 静态侧由 `equiv` 自动归一；正常不会出现在出口，出现了先查为什么 |
| 原生新增/删除的 beta、body 字段、提示词或工具文字 | 只在原生补的部分（非 CC 请求、`worker` 来源、注入层）；有 ④ 的“官方行为变化”记录、D0 的 `official-diff` 条目与对账夹具 diff；用最窄的 `mask` 或 `cases` 限定场景 |

禁止：屏蔽整个头或整个正文；屏蔽客户端拥有的值（客户端的消息、工具定义、客户端 beta 及其顺序、客户端计费头字段、metadata 的客户端键）；用白名单掩盖 D2 里 A/B 的新差异。`regress-compare` 末尾的 `hidden by rules:` 行列出每条规则实际隐藏的次数，审查时要看次数是否与预期场景数相符。

### 4.4 换版本的验证关口

操作步骤见 RUNBOOK；每一步对应的验证：

1. 新官方 ELF 核对官方 manifest 校验和；`restore-bun.cjs` 还原，`reconstruction.json` 检查通过（4.1 ①）。
2. `seeds.cjs` → `equiv.cjs` → `lookup`/`unitdiff`/`inspect`/`carry-profile` → 按 4.1 ④ 归类；REA 复核 changed/unmapped/冲突/低相似度（4.1 ⑤）。结论写进分组审查报告。
3. 新 profile 与 `patches/<新>.cjs`，逐个审查锚点（4.1 ⑥）；补丁器成功，`anchor-hazards` 通过。
4. `CCG_CLI_VERSION=<新> CCG_REQUIRE_ARTIFACTS=1 npm test` 与 `CCG_CLI_VERSION=<旧> …` 都全过；重生成的夹具 diff 逐条审查。
5. D0：`capture-official.sh` 抓新版官方请求作为夹具，`official-diff.cjs` 与同法重抓的旧版比较。
6. 编译（Bun）、打包；L3 契约夹具与 Go 测试。
7. e2e D1（旧客户端，新旧 CLI）+ 白名单；D2（新客户端，新 CLI）。
8. 按需以 `CC_VERSION=<新>` 重跑 L4–L7（新版缺的夹具先补，第 10 节）。
9. 发布后 L11。

### 4.5 样例：2.1.304 → 2.1.310 迁移时实际跑过的验证

只列能从仓库与 `artifacts/claude-2.1.310/` 核实的部分；端到端回归与发布的结果见 [CLAUDE-CODE-2.1.310-MIGRATION](CLAUDE-CODE-2.1.310-MIGRATION.md)。

- **还原**：`linux-restored/reconstruction.json` 的 `binarySha256` 为 `b7367643…7df56`（等于 `official-manifest.json` 的 linux-x64 checksum），2801 个模块、2551 个 JS，`unresolved` 为空，入口 `cli.js`。
- **equiv**（`equiv-304-310.json`，一对一配对修正之后的结果）：旧 94222 个单元、新 97364 个，配对 90456（same 88265、changed 2191），冲突 962（`old-reached-twice` 889、`new-claimed-twice` 73）；110 个种子里 changed 12 项（`Ve`→`Ye`、`FH`→`rH`、`qmn`→`rSn`、`jA`→`UC`、`HTe`→`hRe`、`sF`→`m$`（核心与传输模块各一项）、`dN`→`M$`、`Mn`→`Ln`、`mle`→`ece`、`cy`→`My`、`m4t`→`F9t`），unmapped 2 项（`uXn`，新版是主查询里的局部函数 `Ceo`；`Ure`，即 `crypto.randomUUID`，新版 `uie`），其余 same。`unitdiff` 输出在 `diffs/`。
- **四组审查 + REA**（`review/`）：`rev-query.md`（`qmn`/`uXn`：10 个锚点都有语义等价、唯一、无遮蔽的新文本，模拟替换后可解析；beta 推入顺序与头不变）、`rev-core.md`（核心其余补丁点与环境代码的名字：锚点在新函数里都恰好出现一次）、`rev-transport.md`（传输、认证、请求头：逻辑等价，`sF` 的两处锚点因参数解构移进函数体而改写；出口差异只有版本号）、`rev-entry.md`（入口、会话、容器资源、计费头、身份、工具池：锚点在函数内与全文件内都唯一）；`rea-check.md`：12 个 changed 种子 REA 全部确认有变化、配对也对，抽样的 same 依赖指纹全同，703 个唯一指纹配对与 equiv 0 冲突、1 处 equiv 错配（`38xgev2z:Da`）；它发现的 equiv 问题（多对一配对、低相似度的对齐传播）促成了上面的一对一冲突与 `similarity`/`how`。各报告末尾的“未确认事项”（如 Worker 下 `firstParty` 的假设只做了静态推断、Bun 修订号对 TLS 指纹的影响未抓包）未在报告里关闭。
- **单元与原生对账**：2026-10-27 `CCG_CLI_VERSION=2.1.304` 与 `2.1.310` 各跑 `CCG_REQUIRE_ARTIFACTS=1 npm test`：各 28 个文件、184 项全过、0 跳过。新版的原生夹具 `native-vocabulary-2.1.310.json`、`native-layers-2.1.310.json` 与官方抓包 `official-request-2.1.310.json`（计费头 `cc_version=2.1.310.661`）已提交。
- **官方请求对比（D0）**：`official-diff.cjs artifacts/claude-2.1.310/captures/official-request-2.1.304-recapture.json test/fixtures/official-request-2.1.310.json` 输出 2 处差异：`messages[0].content[2]`（延迟工具列表多 `Monitor`）与 `tool Bash description`（多一句 Monitor 的说明）；其余组件规范化后相同。注意要用同一脚本重抓的 2.1.304（该文件只在 `artifacts/`），拿仓库里条件不同的 `official-request-2.1.304.json` 比会出现大量无关差异。

被改写函数与定位点在两版的名字（来自 review 报告与 profile）：

| 2.1.304 | 2.1.310 | 2.1.304 | 2.1.310 |
|---|---|---|---|
| `cli.js:Ve` | `cli.js:Ye` | 核心 `chunk-rncrmfyt.js` | `chunk-j0tbz6ra.js` |
| `chunk-dxktn51d.js:Yi` | `chunk-wrtp8qz8.js:Fr` | `qmn` / `uXn`（`zr`） | `rSn` / `Ceo`（`Jr`） |
| `chunk-yqea5hk4.js:Ali` | `chunk-c6dz8eqs.js:nki` | `FH` / `Gmn` / `jA` / `Xfr` / `_oo` / `ile` | `rH` / `tSn` / `UC` / `Tkr` / `yao` / `Qle` |
| `chunk-sx3g9k86.js:V` | `chunk-c57c64b0.js:X` | `jOt` / `aBe` | `NNt` / `NWe` |
| `chunk-38xgev2z.js:sF` / `nl` | `chunk-bbw420pv.js:m$` / `ml` | `chunk-wt08cjq1.js:pr` | `chunk-6d8swme1.js:kr` |
| `chunk-t61vswm2.js:PAs` | `chunk-f7aya6cs.js:EFs` | `RIs` / `S8n` / `dN` / `mle` / `cy` / `m4t` | `fWs` / `hnr` / `M$` / `ece` / `My` / `F9t` |

---

## 5. 运行命令与环境要求

| 测试 | 命令 | 环境 |
|---|---|---|
| L1+L2 | `cd next/plugins/ccgateway/companions/cli-mods && npm test`（指定版本：`CCG_CLI_VERSION=<v>`；CI：`CCG_REQUIRE_ARTIFACTS=1`）；重生成原生夹具：`CCG_UPDATE_CONTRACT_FIXTURES=1 npm test` | node（本机 v24 可用）；L2 需 `artifacts/claude-<v>/linux-restored`；只是读 JS 源码，Windows 可跑 |
| L3 JS | 同上（`contract-fixtures.test.mjs`）；前端 `contractFixtures.spec.ts` 随前端测试 | 同上 |
| L3 Go | `go test ./engine/ ./contracts/...`（companions）、`go test ./internal/ccgateway/`（server）；重生成：`CCG_UPDATE_CONTRACT_FIXTURES=1` | engine 需 Linux：ovh `golang:1.27-bookworm` 一次性容器 |
| L5 单元组合 | `node test/analysis/client-combination-unit.mjs` | 任意 |
| L4–L8 | 见各 README 与脚本头注释的 `docker run --rm --network none … --entrypoint node <镜像> /tests/<脚本>.cjs`；L4 加 `CC_VERSION=<v>` | Linux 一次性容器，无 Docker socket，`CCG_*_DISPOSABLE=1` |
| L9 | `sh test/e2e/docker.sh <模式>` + 核对脚本（e2e README） | ovh：Linux + Docker，`--network none` |
| L10 静态 | `node tools/upgrade/{restore-bun,seeds,equiv,lookup,unitdiff,inspect,carry-profile,anchor-hazards,tokcmp,supcmp}.cjs …`（第 4.1 节） | 任意装了 cli-mods devDependencies 的 node；`equiv` 需 `--max-old-space-size=14000`，首次约 8 分钟 |
| L10 官方抓包 | `sh test/e2e/capture-official.sh <out.json>`（`IMG`、`OFFICIAL_CLI`）；`node test/e2e/official-diff.cjs <a> <b>` | 前者 Linux + Docker，`--network none`；后者任意 node |
| L11 | 管理接口、账号容器内 `docker exec` 读日志 | 生产，按运维规则 |

## 6. 报告字段怎么读

| 报告 | 字段 | 含义 |
|---|---|---|
| `npm test` | `CCG_CLI_TEST_VERSION <v>: N test files` | 实际跑的版本与文件数 |
| | `CCG_NATIVE_TEST_SKIPPED …` | 原生对账没跑；出现就不算通过 |
| | `CCG_BETA_ORDER_UNAVAILABLE`（运行时 stderr） | 原生模型表认不出模型，beta 被追加到末尾 |
| e2e 日志 | `client exit=… result=…`、`stderr: …` | 官方客户端是否正常结束；`result` 应为 `"OK"`/`"DONE"` |
| | `WORKER <名> DID NOT START` | Worker 启动失败（常见：`CC_VERSION` 与 manifest 不符、候选 release 里没有该版本） |
| | `== captures` 每行 `a= b= in=` | 每个场景 A 侧、B 侧上游请求数、代理入站数 |
| `regress-compare` | `SAME 名 (n)` / `DIFF 名` + `#i line/headers/body differs at k` / `ONLY-RIGHT` | 逐请求比较；body 给出首个不同位置前后的掩码文本；末行差异场景数与请求数；`hidden by rules:` 规则隐藏的项与次数 |
| `compare.cjs` | `-- <类别>: N 处差异`、`头 … 只有 A/B`、`头顺序`、`system[i] 文字不同`、`body 键`、`tools 名单`、`B 侧多出` | A/B 按请求类别（主线程/LEVEL1/LEVEL2 子代理/非 CC × 第 1 轮/第 2 轮+）配对后的差异 |
| `verify.cjs` | `ok`/`FAIL 断言 — 细节`、末行 `x/y assertions passed, z failed` | 见 e2e README 断言表 |
| `beta-check` | `MISSING 场景 #i: beta`、`client_betas_missing_at_egress`、`added by the gateway`、`only the A side has` | 客户端 beta 是否丢失；网关新增；首方路径独有 |
| `capcheck` | `received`、`logged`、`fullLevelLogs`、`missing`、`bodyChecked`、`bodyMismatch`、`metaBad`、`headerChecked`、`headerDiff`、`modes`、`changed`、`secretsLeaked` | 上游收到的请求数、Worker 记录数；漏记、正文不符、metadata 不符；记录的头与收到的头不同的计数（按头名）；模式分布；`body_changed` 分布；假凭据是否出现在记录里 |
| `respmatch` | `clientAnswers`、`fullLogs`、`responseJson`、`matchedClientAnswer`、`rawBodyOnly`、`noResponseFile`、`miss` | 代理记录的答复数、完整级别日志数、有 `response.json` 的数、能配上的数、只有原始字节的、没有响应文件的、配不上的样本 |
| `official-diff` | `== <组件标签>` 与 `a:`/`b:` 片段；末行 `{"differences":N,"labels":[…]}` | 规范化后仍不同的组件 |
| `equiv.cjs` | stdout：`oldUnits`、`newUnits`、`mapped`、`conflicts`、`seeds[[旧,新,状态,总,same,changed,unmapped]]`；输出 JSON：`same`、`changed`、`map`、`conflicts[]`（`kind`、`how`）、`report[].closure.changed[]`（`similarity`、`how`、`diffTokens`、`removed`/`added` token 摘要） | 第 4.1 节 |
| assembly-replay | `cc_version`、`manifest_sha256`、每项 `definition_sha256`、实际 CLI/Worker SHA 与 `sha_unpinned`、每个断言、内容与参数差异、上游次数、`pass`/`fail`/`unknown` | 定义哈希变了，旧结果作废；`sha_unpinned` 的结果不能作为验收 |
| official-client-replay | `system_equal`、`messages_equal`、`tools_equal`、`content_differences`、`full_body_equal`、`generation_parameter_differences`、`observed_tool_normalization` | 内容保真与参数规范化分开报告 |

## 7. 失败时的排查顺序

1. **制品身份**：镜像标签、manifest 的版本/SHA/补丁标签、官方客户端 SHA、`CC_VERSION` 与 manifest 是否一致；Worker `/healthz`；策略头 `cli_version` 不符是 409。
2. **单元与对账**（最快、确定）：`npm test`，看 `CCG_CLI_TEST_VERSION` 是不是想测的版本、有没有 `CCG_NATIVE_TEST_SKIPPED`；补丁器报错（模块哈希不符、锚点不唯一、导入名不存在、`Unsupported Claude Code baseline`）。
3. **e2e 运行本身**：`$B/<模式>-<标签>.log` 里 Worker 是否启动、客户端退出码与 stderr、抓包计数；`logs/worker-*.log`、`logs/proxy-*.log`。
4. **定向断言失败**：按断言对应到第 3 节的组件 → 读该组件的源码与单元测试 → 先补一个能复现的单元用例，再修。
5. **回归差异**：先看 A 侧（客户端发的变没变）→ 再看入站 `in-NN.json`（代理交给 Worker 的）→ 再看 B 侧；对照“已知差异”表；跨版本时查 D0 的 `official-diff` 与对应原生函数的 `unitdiff`。
6. **日志核对失败**（`capcheck`/`respmatch`）：`upstream-request.json` 缺失是 CLI 记录（C17）的问题；其余多半在 Worker 的日志写入器，与 CLI 无关。
7. **生产**：先看账号状态与限速（429 先查冷却），再看请求日志里客户端发来的与上游收到的。

---

## 8. 用例清单

单元测试的逐项用例以测试名为准（`node --test` 输出）；这里按“一组规则一行”。e2e 每个场景的输入见 e2e README 场景表。`native/<v>/` 指 `test/native/<版本>/`。

| 编号 | 目的 | 输入 | 预期 | 所在脚本 |
|---|---|---|---|---|
| U-01 | 组件 → 记录，媒体、工具结果、system 顺序保留 | 显式组件 | 记录顺序与原文一致 | `request-input.test.mjs` |
| U-02 | 普通文字不被猜成附件 | 含 reminder 样文字的消息 | 不生成附件记录 | 同上 |
| U-03 | system 工具变更用原生字段名 | `tool_addition`/`tool_removal` | 记录带 `toolAdditions`/`toolRemovals`/`toolDefinitions` | 同上 |
| U-04 | 组件覆盖与 HTTP body 字段被拒 | `parameters` 里放 `model`/`ccgateway*` | 400 | 同上、`request-parameters.test.mjs` |
| U-05 | 策略信封校验 | 未知键、`contract_version≠2`、手写计费值 | 拒绝 | `request-policy.test.mjs` |
| U-06 | 启动目录一致 | `runtimeContext.workingDirectory` ≠ cwd | 拒绝 | 同上 |
| U-07 | 环境字段按来源改写，非目标字节不变 | 10 字段 × 3 来源 × 5 载体 | 只有目标片段变化（150 项） | `content-policy.test.mjs` |
| U-08 | 字段对 × 来源对 × 计费策略 | 1620 组合 | 同上 | 同上 |
| U-09 | 不进入 assistant、工具结果、围栏、嵌套 reminder、引用 | 各类干扰 | 不改 | 同上 |
| U-10 | 重复字段、update 无基线、未知格式 | 歧义输入 | 跳过并诊断，不改 | 同上 |
| U-11 | erase 与清理 | 全删 / 部分删 | 标题、包装、空槽按规则删除；原有空 reminder 保留 | 同上 |
| U-12 | 计费头合并 | 缺头、缺字段、多头、重复字段、围栏/引用里的头、原生不可用 | 补齐 / 400 / 503 / 放行 | 同上 |
| U-13 | 请求入口 | 首块头的入口、`worker` 来源 | 入口 = 客户端的或服务端的 | 同上 |
| U-14 | direct 只动计费头 | 完整头、缺头、缺字段、字符串 system、无 system | 逐字节不变 / 只插入或改一处 / system 在 messages 后 | `direct-billing.test.mjs` |
| U-15 | 身份 metadata | 三种载体 × rewrite × 有无 user_id | 按 Worker 决定 | `request-identity.test.mjs` |
| U-16 | 请求类别与映射 | CC 子代理、非 CC 伪造头、direct、API Key | CC 采用客户端的；非 CC 主线程；映射相等关系保持 | `request-agent.test.mjs` |
| U-17 | loop 头与 UA | prev-tool-durations、压缩头、CC 形状 UA | 原值放回；UA 随客户端计费字段保留 | 同上 |
| U-18 | beta 放置 | 客户端 beta + 登录/缓存 beta | 客户端顺序不变，新增插在原生位置；API Key 不带登录 beta | `request-options.test.mjs` |
| U-19 | 数字保真 | 大整数、`1.0`、`1e2`、`-0`、长小数 | build 发原文；direct 原字节 | `request-options.test.mjs`、`model-request.test.mjs`、`request-parameters.test.mjs` |
| U-20 | 生成参数归属 | `top_p`、`top_k`、`stop_sequences`、未知字段、`output_config` 子键、`diagnostics` | 并回；原生字段不被覆盖；`diagnostics` 只随客户端 | `request-parameters.test.mjs` |
| U-21 | 构建器表达不了的值 | 未知 thinking、非正整数 max_tokens、非布尔 stream | 原样发 | 同上 |
| U-22 | 工具定义原样 | 顺序、缺 description、未知属性、缺省 vs 空数组 | 逐字节；缺省不发 | 同上、`native/<v>/patch-wire-preservation` |
| U-23 | 注入层 | 无计费头 + 各等级；已有层；客户端同名工具 | 只补缺的；客户端身份行在前；工具在前 | `request-injection.test.mjs` |
| U-24 | 身份行选择与放置 | 各入口、追加提示、API Key、已有身份行 | 第 3.2 节 C3 | `cli-prefix.test.mjs`、`request-injection.test.mjs` |
| U-25 | 传输 | build/direct | create vs post；超时；认证归 CC | `model-request.test.mjs` |
| U-26 | 上游请求记录 | direct/build、二进制正文、写失败 | 记录最终头与正文，密钥遮蔽；写失败不影响请求 | `request-capture.test.mjs`、`model-request.test.mjs` |
| U-27 | 错误帧 | HTTP 错误各类正文、本地异常、中断、策略拒绝 | 状态/正文原样；帧字段 | `request-error.test.mjs`、`request-command-errors.test.mjs` |
| U-28 | 入口与策略拒绝 | fast-path 拒绝 | 403 帧，命令不运行 | `request-entry.test.mjs` |
| U-29 | 容器资源 | 各种 cgroup | 只报分配的 CPU/RAM | `container-resources.test.mjs` |
| U-30 | 验收逻辑不能被 HTTP 成功掩盖 | 缺失、多余、旧定义的结果 | 验收失败 | `assembly-coverage.test.mjs` |
| N-01 | 环境词表 = 原生渲染 | 还原源码 | 与夹具相等 | `native/<v>/vocabulary` |
| N-02 | 层词表、主线程 turn | 同上 | 同上 | 同上 |
| N-03 | 身份行三句 | `n1n` 三组输入 | `t1n` 认得每一句 | `native/<v>/identity-line` |
| N-04 | 计费指纹 | 该版官方抓包 | 复现其 `cc_version`（`2.1.304.b17`、`2.1.310.661`） | `native/<v>/billing-fingerprint` |
| N-05 | 原生 body 字段 | 构造器 body 字面量 | = 归属表 + 文档扩展 | `native/<v>/body-fields` |
| N-06 | 环境快照字段 | 原生 `Wkt` | = 按需读取的键 | `native/<v>/environment-collector` |
| N-07 | 补丁导入固定 | 加一个不存在的导入 | 补丁器拒绝 | `native/<v>/patch-imports` |
| N-08 | 补丁集成 | 还原源码打补丁并执行最终对象 | 哈希一致、外部工具/参数保真、普通 CLI 不变 | `native/<v>/patch-wire-preservation` |
| K-01 | Worker → CLI 线形 | Worker 实际 stdin + 身份上下文 | CLI 全部接受且结果符合 | `contract-fixtures.test.mjs` ← `engine/contract_fixture_test.go` |
| K-02 | 核心 → Worker、前端 → 核心 | 实际线形 | 各消费方接受 | `core_policy_fixture_test.go`、server/web 夹具测试 |
| A-01 | 组装合同 | `assembly-cases-<版本>.json` | 全 pass，SHA 已固定 | `assembly-replay.cjs` |
| A-02 | 组件组合 236196 / 216 | 来源组合 | 全过 | `client-combination-unit.mjs` / `component-combination-replay.cjs` |
| A-03 | 策略矩阵 | 核心生成的策略 | 目标字段生效、非目标相等 | `worker-policy-matrix.cjs` |
| A-04 | 官方客户端回放 / 实时转发 | 官方 CLI 真实请求 | 见各 README（需先更新，第 9 节） | `official-client-replay.cjs` / `live-official-client.cjs` |
| E-01 | 官方客户端 build/direct 出口 | 第 1 阶段 24 场景（main/tool/subagent/turn2/compact/attach/aux/ua/apikey-shape/login） | A/B 差异只在允许表；verify #1–#6 | e2e `run.sh` |
| E-02 | 非 CC 微/低/高注入 | `plain-*`、`plain-tools-*`、`plain-nosystem-*` | 身份行按等级；客户端工具逐字节；注入层只补缺的 | e2e `run.sh`、verify #4/#5 |
| E-03 | 边界输入 | `s1`–`s5b` | 工具配对不全 build 拒绝；大数原样；beta 多行合并 | e2e `run.sh` |
| E-04 | 上游错误透传 | `err400-*` | 400、正文原样、白名单外头被挡 | verify #8 |
| E-05 | credit beta 与回执 | 第 4 阶段 9 场景 + `credit-*-trailer-build` + `credit-plain-vs-tracked` | 回执 = sha256(token)，在 trailer；流不被整段缓冲；`ssf-0601` 不进 credit 路径 | verify #7/#12/#16 |
| E-06 | API Key 账号 | `apikey-account-client`、`apikey-account-noncc-high` | 不新增/不挪动身份行；不补身份行；不带登录 beta | verify #5、beta-check |
| E-07 | 非 CC 身份 | `noncc-identity`、`noncc-identity2` | 补账号身份、会话规则 | verify #9/#13 |
| E-08 | 非 CC 不能自称 CC | `noncc-context`、`noncc-context2`、`noncc-classify` | 伪造头与不带头逐字节相同；首块计费头才算 CC | verify #10/#14、`classify` |
| E-09 | 嵌套子代理 1–3 层 | `sub[123]-build-low/direct` | 层数、parent 链、上下文头原值、`cc_is_subagent`、无 extended-cache-ttl | verify #11 |
| E-10 | 客户端值保真 | `values` 12 项 | 12/12 | `values-verify.cjs` |
| E-11 | 并发 credit | `credit-concurrent` | 两个都有回执、不排队 | verify #17 |
| E-12 | Worker probe | `probe-build` | 200 | verify #15 |
| E-13 | 同版本回归 | 基线 vs 候选 | 0 of 69 differ | `regress-compare.cjs` |
| E-14 | 上游记录与响应组装 | `REQUEST_LOG=full` | capcheck 无漏/无不符/无泄漏；respmatch 全配上 | `capcheck.cjs`、`respmatch.cjs` |
| X-01 | 原生逻辑等价 | 新旧还原源码 + `seeds.cjs` 种子 | 每个种子归类有记录 | `equiv.cjs` + `unitdiff.cjs` + REA |
| X-02 | 锚点 | `patches/<新>.cjs` | 每处审查通过，补丁器成功，`anchor-hazards` 通过 | `patch-cli.cjs` + 人工 |
| X-03 | 新版本原生对账 | `CCG_CLI_VERSION=<新>`（及 `<旧>`） | 全过、无跳过、夹具 diff 已审查 | `npm test` |
| X-04 | 官方自身变化（D0） | 同法抓的新旧官方请求 | 差异清单全部解释 | `capture-official.sh` + `official-diff.cjs` |
| X-05 | 新旧 CLI 出口（D1） | 同一旧官方客户端 | 只剩白名单 | e2e + `regress-compare` + rules |
| X-06 | 新版保真（D2） | 新官方客户端 | A/B 只在允许表 | e2e `compare.cjs`、`verify.cjs` |
| P-01 | 发布身份 | `/healthz` | 版本/补丁/哈希/能力一致 | 生产 |
| P-02 | 账号测试 | 测试接口 | 200、`test_mode: native_build` | 生产 |
| P-03 | 真实客户端 | 真实 CC 经网关 | 请求日志里上游请求符合预期 | 生产 |

---

## 9. 现有测试 README 中已过时的结论（现状）

三个 README（`test/official-client-replay.README.md`、`assembly-replay.README.md`、`worker-policy-matrix.README.md`）写于 2026-10-20（CLI 2.1.304 第一版补丁时期），`artifacts/claude-2.1.304/` 里对应的报告也都是 10-20 的。2026-10-27 脚本本身已按现行规则与 2.4 节的共同约定改过（头注释写明“Expectations follow the current request rules”），README 与报告还没有跟上，也没有找到改后重跑的结果。README 里以下结论已不成立：

| README 里的结论 | 现状 | 依据 |
|---|---|---|
| official-client-replay：build 回放时 `ToolSearch` 被去除，12 项工具变 11 项 | 不成立。build 的 `tools` 是客户端原定义（补丁 `qmn` 用 `ccgatewayWireTools`，`wireToolDefinitions` 只原位改名）；v26 起 `FH` 对客户端工具直接返回客户端定义 | `request-parameters.js`、补丁 `FH`/`qmn`；`native/<v>/patch-wire-preservation` “external native final object preserves ToolSearch, mixed order, missing description and opaque fields”；e2e verify #4 |
| official-client-replay：省略 `description` 时 build 补 `description: ""` | 不成立。`description ?? ''` 只给 CC 内部工具对象（`requestTool`），发出的定义不补 | `request-build.js clientTools`；`request-parameters.test.mjs` “304 wire tools retain order, missing description…” |
| official-client-replay：`top_p`、`stop_sequences`、自定义 `context_management` 在 build 中消失 | 不成立。`nativeFields` 以外的客户端参数由 `mergeAdditionalParameters` 原样并回（`context_management` 不是原生字段，客户端的覆盖原生的） | `request-parameters.js`；REQUEST-MODES §1.1；e2e `values top-k-extra` |
| official-client-replay：出现原生生成的 metadata、thinking、temperature、output_config | 部分成立。`metadata` 由身份逻辑决定（客户端的映射、或账号身份、或没有，C15）；构建器能表达的 thinking/temperature/output_config 仍由原生模型规则决定，表达不了的原样发（v29） | `request-identity.js`、`generationControls` |
| official-client-replay、worker-policy-matrix：direct 整包相等 | 只对首块开头已有完整计费头的请求成立。v17 起 direct 补缺的计费头与缺的字段、按计费来源换值（v16 是纯透传），v20 起字符串 system 改成块数组 | `direct-billing.js`；build 设计 §6.3 |
| assembly-replay、live-official-client：上游请求必须是 `POST /v1/messages` | 不成立。v24 起两种模式都是 `/v1/messages?beta=true`；四个脚本现在都按它断言 | `model-request.js messagesPath`；REQUEST-HEADERS“请求行” |
| assembly-replay：metadata 只做 JSON 结构与 device/session 格式的原生规范化 | 已变。v14 起按账号映射，v27 起没有身份的 OAuth build 补账号身份 | build 设计 §7 |
| 三个 README：固定的制品身份 | 官方 `ea0f1357…`、补丁 CLI `08aa7c7d…`、`138da88e…`、Worker `98f2746f…`、镜像 `ccgateway-app:0.1.69` 都是 2.1.304 第一版时期的；脚本已不再写死，改由调用方经环境变量给出（2.4 节） | 脚本源码 |
| assembly-replay：`fixtures/assembly-cases.json` 75 项，“修复后当前 75 项已全部通过” | 清单现按版本生成（`assembly-cases-2.1.304.json`、`assembly-cases-2.1.310.json`，2026-10-27 各 76 项）；“全部通过”只对当时的制品成立，v16（build 总带计费头）、v17/v20（身份行、direct 计费）、v24（路径）、v26（原生身份行与 SDK create）、v27（账号身份）、v29（客户端值）之后没有找到重跑结果 | 版本记录、`fixtures/` |

## 10. 仍缺的测试

1. **L4–L7 已按两个版本重跑**（2026-10-27，ovh 一次性 `--network none` 容器，SHA 由调用方固定）：组装对账 76/76、客户端来源 14/14、官方客户端实时转发 10/10、官方抓包回放 verified（14 项）、组件组合 216/216，2.1.304（v31）与 2.1.310（v32）结果相同；命令见 `test/assembly-replay.README.md`。Worker 策略矩阵（L7 的 `worker-policy-matrix.cjs`）依赖核心生成的 `config-matrix-policies.json`，这次没有重新生成、没有跑。
2. **夹具**：`native-environment-2.1.310.json` 已由原生渲染器执行生成（`test/native/<版本>/environment-template.test.mjs`，两版三段文本逐字相同）。仓库里的 `official-request-2.1.304.json` 是 2.1.304 第一版时期的抓包（比 `capture-official.sh` 少 `diagnostics` 等字段），版本无关测试与 2.1.304 组装清单仍读它；跨版本比较官方请求时用同条件重抓的那份（`artifacts/claude-2.1.310/captures/official-request-2.1.304-recapture.json`）。
3. **`official-diff.cjs`**：两边组件数不同时的 `TypeError` 已修（缺的一侧记为 `(absent)`）。
4. **e2e 场景缺口**：假上游支持 `bg`（后台子代理）、`fork`，`run.sh` 没有场景；没有 WebSearch/服务端工具、图片与文档、thinking 签名回传、`tool_choice`、`count_tokens`（应 404）、超时与中断、上游 5xx/429、超大正文（32 MiB）、并发槽满（429）的端到端场景；`all` 不含 `values`/`conc`/`classify`，容易漏跑。e2e 各变量的缺省值仍是 2.1.304 时期的，跑 2.1.310 要显式设 `CC_VERSION`/`CLIENT_CC_VERSION`/`OFFICIAL_CLI`。
5. **A/B 白名单没有自动化**：`compare.cjs` 只列差异，允许表靠人工对照；应把允许表写成规则并让脚本给出通过/失败。
6. **跨版本静态检查的剩余缺口**：“每个种子必须有归类记录”没有检查；`equiv` 对低 `similarity` 的对齐配对只报告不拦截；REA 交叉验证的脚本（`artifacts/claude-2.1.310/scratch-rea/`）是一次性草稿，不在仓库。
7. **生产冒烟没有脚本**：账号测试、日志级别、真实客户端核对都靠手工（`verify-logpolicy.py` 不在仓库且写死账号与容器名）。
8. **传输层**：TLS ClientHello、HTTP 版本、头序列化与官方不同（Bun 1.4.3 重编，官方内嵌 1.4.4），没有测试，也不在 e2e 范围内；2.1.310 审查（`rev-transport.md`）列为未确认。
9. **`cch`**：非 CC 请求发 `00000`，上游接受与否只是观察，没有监测。
10. **核心与控制器隧道**：e2e 用代理模拟核心，只覆盖策略头与 credit 跟踪头；核心的能力预检、响应头白名单、credit 扣留在真实核心上的端到端组合只有 Go 单元测试。
