# CCGateway 审核 · 汇总（2026-10-23，HEAD f546fa31a，core 0.1.181 / ccgateway 0.1.82 / CLI v21）

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](../../../plugins/ccgateway/docs/CLI-TEST-PLAN.md)。

> 五人审核团队：A 核心侧+插件进程（01）、B 控制器（02）、C Worker+engine（03）、D 定制版 CLI（04）、核验员对 12 组关键发现做对抗式复核（10）。全部只读；本目录是唯一产物。级别以 10-verify 裁定为准。

## 0. 对用户三个问题的回答

**1. 定制版逻辑是否完全复用原生功能组装请求？——主体是，边缘不是。**
最终 body 由原生 `qmn`（经 `Kvt`）生成，system/messages/tools 走原生管线，计费头 `PAs/kLo`、身份行 `n1n/t1n`、请求头 `sF/nl/dN`、内置提示词 `r1e/wx/pr`、首轮附件 `Wkt/eSt/JDr/POo`、turn `iws/h0n`、权限上下文 `gd`、工具排序 `assembleToolPool` 都是原生函数（04 §3、§4）。不是「直接调用」的有两类：
- 按原生代码重组（04 分类 c）：`ccgatewayDefaultPrompt` 复刻 `xh` 的组装顺序（`xh` 需要 session/credentials/mcpClients，不可直接调）、`ccgatewayLayerAttachments` 复刻首轮附件列表、`ccgatewayEnvironment` 复刻 `Wkt` 只读所选字段、`fingerprintMessages` 复刻 `RIs` 的记录选取、`identityLineFor` 把 `n1n` 的规则再写一遍。04 已逐项核对等价，且有版本哈希绑定保护，但它们是「和原生一样」而不是「就是原生」。
- 原生没有的新行为（分类 d）：内容策略识别/改写（464 行）、direct 的 JSON 原文拼接、身份/agent ID 映射、断点上限裁剪、注入层放置。设计文档都有依据。
- Worker 层自己拼装的内容（03 §4 末表）：`metadata.user_id` 的 HMAC 映射值、agent 会话级密钥（设计要求密钥不出 Worker，合理）；`CLAUDE_CODE_ENTRYPOINT=sdk-cli` 默认、`stream:false`/`system:[]` 缺省填充、自造错误体——这三项未写进文档，且第一项是 P1（见 §1）。

**2. 组装后是否与客户端一致（除请求头拆分）？——对 Claude Code 客户端发出的请求：body 一致，请求头有一处线上偏差。**
核验员独立复现（10 §2 第 12 条）：cap21 的 15 个 CC 请求（主线程/子代理/压缩/多轮/工具往返）在 build 与 direct 下，上游收到的 body 与 Worker 收到的客户端 body **逐字节（含键序）相同**；请求头集合与值相同，唯一差异是 SDK 每次随机的 `x-client-request-id`；头顺序与官方直连参考一致。OAuth build 另有设计内的 session/prompt/`metadata.user_id` 映射。
但有两条未记录的偏差：
- **D1（P1）**：Worker 把 `CLAUDE_CODE_ENTRYPOINT` 钉成 `sdk-cli`，原生 `dN()` 据此生成 UA `claude-cli/2.1.304 (external, sdk-cli)`，而计费头 `cc_entrypoint` 保留客户端值。官方两者同源永远相等；经网关后交互式 CC 每个请求都发出 UA `sdk-cli` + `cc_entrypoint=cli` 的官方不可能组合，SDK 客户端的 `, agent-sdk/x.y` 段也丢失。cap21 客户端恰好是 `-p` 所以没暴露。
- **D2（P2）**：官方 ELF 内嵌 Bun 1.4.4（288 MB），我们用 Bun 1.4.3 重编（157 MB）。TLS/HTTP 层指纹与 `cch=00000` 由此无法声称一致（与 memory「中继 TLS 指纹」同类，属已知边界但文档未写）。
对**非 CC 客户端**的请求（无计费头），生成参数按原生派生、字符串 system 变数组、按等级注入层——设计上就不打算一致（README、INJECTION-LEVELS §8）。
**样本局限**：cap21 是 CLI v18 抓的；v19–v21 对带计费头请求「无形状改变」是源码核对结论；非 CC 请求在 v18 出口被标为子代理而现行代码给 `main`，所以 v21 的非 CC 形状**没有任何抓包证据**（10 §5.1）。

**3. 「请求头拆分」实际是什么？——客户端请求头没有任何一个原样转发，被拆成四路（04 §2.3）：**
`anthropic-version/anthropic-beta` → CLI 参数再由补丁覆盖 SDK 同名头；5 个 `x-claude-code-{request-class,agent-id,parent-agent-id,agent-type,prompt-id}` → `CCG_REQUEST_AGENT` → 由原生 `sF` 重新写出；`prev-tool-durations` 与 4 个压缩头 → 同变量 → 原值放回；`x-claude-code-session-id` → 从 `metadata.user_id` 解析 → `CCG_REQUEST_IDENTITY` → 原生 `nl()` 写出；UA/x-app/x-stainless-*/accept/authorization 等全部丢弃由 Worker 内原生 SDK 重生成。这个边界此前没有任何文档成文，D1/D2 两条正好落在「重生成」这一路。

## 1. 唯一 P1

| # | 位置 | 问题 | 修法 |
|---|---|---|---|
| D1 | `engine/request_command.go:463-470` | UA 入口段恒为 `sdk-cli`，与客户端计费头 `cc_entrypoint` 不一致；SDK 的 `agent-sdk/x` 段丢失 | Worker 按请求设 `CLAUDE_CODE_ENTRYPOINT`：取首块计费头的 `cc_entrypoint`（`requestBilling` 口径），无头时取策略 `build_billing_entrypoint`；评估透传 `CLAUDE_AGENT_SDK_VERSION`。随后在 31 号用 `cli` 入口的真实 CC 抓一次 UA 核对。 |

无 P0。

## 2. P2（按链路顺序）

| # | 层 | 位置 | 问题 | 状态 |
|---|---|---|---|---|
| A1/C4 | 核心→Worker 契约 | `request_policy.go:12-54`、`feature_policy.go:369-409`、`client.go:243`；`engine/request_command.go:39-49` | 核心每请求下发 **9 个** Worker 不读的字段（`unknown_field, allow_fast, allow_effort, custom_tool_prefix, betas(34 条≈1.7 KB), tool_search, thinking_disabled_compat, erase_client_attachments, replace_client_attachments`）；反向 `build_identity_lines`/`request_identity_sources` 核心不发、Worker 仍解析并以它开 `build_identity_line_v1` 门、CLI 收到即丢。CONTRACTS §53.11/15/16 仍把失效字段写成有效（线上曾开的 `thinking_disabled_compat=omit` 就是这样失效的） | 上一轮 P2 未修，范围扩大 |
| A3 | 核心 | `feature_policy.go:40-62` → `config.go:281` | 词表收窄时核心对已存配置零容忍：**已实证**一个含未知工具名的分组覆盖让整份 `Config` 解码失败 → `Load`/`desiredNetwork`/reconcile 全部失败；全局策略变体：解码成功但 high 级别每请求 `validateRequestPolicy` 失败→502。当前无线上存量，潜伏 | 新 |
| A2 | 插件进程 | `plugins/.../classify.go:95-139`；`engine/request_error.go:117-121,169-201` | 分类器依赖的 `x-ccgateway-error-scope`、`error-source: cli`、`cli-quota-*` 头只有不可达的 native 路径设置；作用域 429「只切换不禁用」分支死代码，任何上游 429 都整账号 DISABLE 到 reset（后果取决于上游 429 头形状，怀疑） | 新 |
| A4 | 核心 | `request_cache.go:78-85,145-151` | 路由缓存无 TTL，漏总线消息的节点永远连旧控制器 | 上一轮未修 |
| A5 | 核心 | `config.go:555-589` | `save()` 吞掉全部具体校验文案；孤立分组键无清理 | 上一轮未修 |
| B1 | 控制器+核心 | `manager.py:1300,1549-1551,1659-1662`；`accounts.go:437-440` | 控制器零日志、`except Exception` 全吞成 `runtime_unavailable`；核心 `putConfig` 不读控制器 `{"error":code}`（同包已有 `runtimeError` 可用）。账号卡 pending 时两层都查不到原因 | 新 |
| B2 | 控制器 | `shared_egress.py` | 共享 Xray 出口是生产路径（8 个账号）却只有 3 个纯函数测试；`migrate` 104 行 6 层嵌套状态机零覆盖 | 新 |
| B3 | 控制器+核心 | `manager.py:648-670`；`workers.go:73`；`request_policy.go:225` | 经 API 把 `cli_version` 改成非 2.1.304 → 每账号 revision 变 → `_provision` 一律 409 → 全体 pending；配对更新出路被核心 `workers.go:73` 钉死。UI 改不了、API 能改 | 新 |
| C1 | Worker | `runtime.go:205-227,280-291`；`cli_catalog_capture.go:224-280` | 请求模式的就绪与每个 `/v1/messages` 被 native 工具目录探针门控：启动 7 次 `claude -p`（各 30 s），任一失败全部 503；快照只用 `version` | 新 |
| C2 | Worker+插件 | `request_command.go:198-201`；`classify.go:121` | Worker 本地 401/409/413/429/400 不带 `X-CCGateway-Error-Source`；插件按字面量 `"Gateway concurrency limit reached"` 判本地失败；上一轮 F4/F10/F11 根因 | 上一轮未修 |
| C3 | Worker | `request_command.go:238,406-413` | 槽位在读完 32 MiB 并做完变换之后才占；`Slots=4` 写死 | 上一轮未修 |
| C5 | Worker | `engine/main.go:103-141,574-733`、`catalog/`、2.1.288/292 嵌入目录 | native 执行链、`Serve()` 旧入口全在，生产不可达；长函数前 30 名里 19 个在死路径；`serveRequestCommand` 364 行 | 上一轮未修 |
| D2 | CLI | `build.sh:3`；两个 ELF | Bun 1.4.3 vs 官方 1.4.4，130 MB 体积差未解释 | 新 |
| D3 | CLI | `profiles/linux-x64-2.1.304.json`；`patch-cli-2.1.304.cjs:54-60,160`；`request-build-2.1.304.js:2-5` | 从 5 个未做哈希绑定的模块导入（`chunk-7y2kvacy/jkcb7qdd/m5q1b1c4/eanw7pgv/t2p0d04m`）；动态导入名补丁期不校验（本次人工核过均存在） | 新 |
| D5 | 文档 | `BUILD-REQUEST-COMPONENTS-DESIGN.md` 结论/§6.3/§7 | 仍写 direct 补身份行、身份不可配置；与 v20/v21 代码冲突，已不是事实源 | 新 |

## 3. P3 摘要（详情见各分报告）

- 核心：配置类失败以 error 返回→当传输错误→10 s 冷却+502（A6）；每请求 1 次账号策略查库 + 1 次 Worker `/healthz`（A7）；跨层夹具少核心→Worker 一跳（A8）；身份行退役后的死分支（A9）；账号「测试」不含分组策略（A10）；`cli.request_mode` 永远 build 摆设（A11）；同一事实多份（A12）。
- 控制器：app 启动到 nft helper 之间无规则窗口（B4）；`v1/messages` 中继、`migrate-auth`、官方 CLI 下载路径均无调用方可删（B5–B7）；锁内 `public()` 做 docker inspect（B8，上一轮未修）；代理主机名只在宿主机解析一次（B9）；测试依赖 `CCG_DEFAULT_CLI_VERSION`（B10，未修）；`locale/timezone` 不校验（B11）；宿主机公网 IP 未 drop（B12，已知）。
- Worker：session UUID Go 宽松/CLI 严格（C6）；请求日志 capture 在鉴权前、文件写入在账号锁内、启动同步建索引（C7）；策略头解析两次、鉴权比较三次（C8）；direct 不是纯透传（解析 body、非官方 400 文案）（C9）；`stream:false`/`system:[]` 缺省未写文档（C10）；build 不查 `request_levels_v1`（C11）；ELF 校验两次（C12）；双套健康端点、coverage 产物入库（C13）；超时默认值四处（C15）；CLI 子进程继承 Worker 全部环境变量、黑名单剔除（C16）。
- CLI：build 的 beta 经原生门控可能多出客户端没发的（D4）；296/302 补丁器、`relay_mode` 分支、`transformBody` 死代码（D6）；标签/能力三处各写一份、1 KB 单行注入（D7）；4 个原生对账测试缺 artifacts 时 skip（D8）；没有把「入站→出口全等」固化为测试、cap21 是 v18（D9）；`total_tokens` 只补首轮（D10）；本地校验文字非官方原文（D11，未修）；子代理段 `T7t` 未实现（D12）。

## 4. 代码规范（抽象 / 复用 / 解耦 / 简洁 / 低嵌套）

**跨层共性**
1. **同一事实多处定义**：`RequestPolicy` 一个结构体兼存储形/界面形/线形/校验入口（01 §4）；默认值 4 处、校验 3 份（核心 Go / engine Go / 前端 TS）、`"2.1.304"` 字面量 6+ 处、超时默认值 4 处、`VERSION`/`SHA256` 正则在控制器 3–4 份、能力列表在补丁器 3 份、策略字段表在 cli-mods 2 份。**根治**：在 `contracts/features` 定义唯一的 `WorkerPolicy` 线形（只含 Worker 读的键）供核心 marshal、Worker unmarshal、夹具固化；默认值与词表只在 contracts。
2. **死路径占据热代码**：engine native 链（≈7k 行源码 + 2 万行测试，19 个长函数）、核心 `forwardAttempt` 的 legacy 分支、控制器 `v1/messages` 中继与官方下载、cli-mods 296/302 补丁器。
3. **错误被吞或被改写**：控制器零日志；核心 `save()`/`putConfig` 丢具体原因；Worker 本地错误无机器可读来源；核心配置失败被当传输错误。
4. **超长函数**：`serveRequestCommand` 364 行、`controllerInstall` 229、`NewRuntime` 188、`handle_request` 181（6 层）、`prepareBuildInput` 162、`_provision` 158、`mergeConfig` 155、`serveRuntime` 153、`runRequestCommand` 147、`RuntimeUpdates.update` 137、`forwardAttempt` 127、`SharedEgress.migrate` 104。
5. **深嵌套（≥5）**：核心 `save`、`keepLegacyInjection`；控制器 `handle_request`/`handle_tunnel`/`update`/`migrate`（6 层）；engine `messagesBuildComponentsPolicy`、`validateBuildContent`、`request()` 摘要；cli-mods 工具配对循环。

**各层重构方向（都不改行为）**
- 核心：`forwardAttempt` 拆 `resolveRoute/attachPolicy/send`，删 legacy；`applyFeatureOverrides`+`ResolveFeaturePolicy` 的 11 段同形循环改成一张 `layerField` 表；`readBounded`（29 处）、`newNoRedirectClient`（7 处）、`loadIn`（3 处）收口（01 §4）。
- 控制器：`manager.py` 拆 7 模块（`common/dockerfs/lifecycle/worker_update/runtime_admin/http_api/main`），消除 13 处 `from manager import` 循环依赖；10 组重复片段各收成一个函数（02 §4.2）；异常→(status, code) 表 + 一个 `error_response`。
- Worker：先删 native（C5），再按前缀拆子包 `requestcmd/requestlog/cli/resource/auth`，根包只留 `Runtime/Gateway`；`serveRequestCommand` 拆 `parseRequestPolicy→admitRequest→requestContext.resolve→prepareInput→cliRun.run→writeOutcome`，能力门做成 build/direct 共用的表（03 §5）。
- CLI：抽 `shared.js`（`object/toBlocks/systemTexts/uuid/splice/collectBuilt`）；`prepareBuildInput` 拆 4 段、`runRequestCommand` 拆 4 段；标签/能力从 profile 读、注入代码移到 `.inc.js`；删 296/302（04 §7）。

## 5. 设计文档必须改的（各报告 §5/§6/§8 合并，去重）

1. `BUILD-REQUEST-COMPONENTS-DESIGN.md` 结论/§6.3/§7/§10：direct 补身份行、不设 `CCG_REQUEST_IDENTITY`、身份不可配置——三条与代码相反；以 INJECTION-LEVELS §7/§12 为准重写。
2. `REQUEST-MODES.md`：整篇停留在 v17/2.1.302，三段互相矛盾、无一段是现状；拆「当前契约」与「历史」。`PASSTHROUGH-DESIGN.md` 描述不可达的 native 模式，应标归档。
3. `CC-INJECTION-LEVELS-DESIGN.md` §6 表「micro 再加身份行」是下发项的误导（身份行由 CLI 自适应，核心不发）；§5「读取时丢弃」核心未实现（A3）；§2 子代理段 `T7t` 未实现；§13「逐字节相同」应改「缓存命中量一致」。
4. `CC-REQUEST-LEVELS-DESIGN.md` §7.1 候选 20 个、「什么都不补时不下发」已被取代。
5. CONTRACTS §53.11/§53.15/§53.16 把失效字段写成有效；§53.17 键集合过期；§53.5「旧的模型转发路径保留」不成立；§49.18 漏写账号策略每请求查库与路由无 TTL；§53.7 未写 CLI 版本变化 409。
6. 「请求头拆分」从未定义：把 04 §2.3 的四路表、UA 入口段与 Bun 版本两条边界写进设计文档。
7. `controller/VALIDATION.md` 是 10-03 的历史拓扑，应移出生产目录；`manager.py` docstring 的 SSH 隧道描述过期；README 累积流水账（v14「身份可配置」与 BUILD §7「不可配置」并存）。

## 6. 建议修复顺序

1. **D1**（P1，改一处 Worker + 31 号抓包核对）。
2. **A1/C4 契约收口**：`contracts/features.WorkerPolicy` 唯一线形 + 核心→Worker 夹具（A8）；同时清掉 Worker 对 `build_identity_lines`/`request_identity_sources` 的解析与门；CONTRACTS 三节改写。
3. **A3**：解码与校验分离，未知项丢弃并 warn，加「含未知工具名的分组覆盖能 Load」测试。
4. **错误可见性一组**：B1（控制器 logging + 核心 `putConfig` 用 `runtimeError`）、C2（`fail()` 统一带 source，插件用 `requestfailure.Source()`）、A5、A6。
5. **C1 + C5**：请求模式去掉工具目录探针门控，然后按 deadcode 清单删 native（engine 预计 −7k 行源码）。
6. **B3**：控制器允许走配对更新而非 409；核心 `workers.go` 去掉 `"2.1.304"` 硬编码（与「按能力判断」一起）。
7. **D3/D2**：5 个模块入 profile + 导出名校验；用 Bun 1.4.4 重编并比对体积，或在文档写明边界。
8. **D9**：用 v21 重抓 cap（含 `cli` 入口的真实 CC 与非 CC 请求），把「入站→出口全等」固化成测试。
9. 文档（§5）与各层重构（§4）随上述一起分批进行。

## 7. 测试实跑汇总

| 范围 | 结果 |
|---|---|
| 核心 `internal/ccgateway` | `go vet` 通过；6 个不依赖 PG 的顶层测试通过；需 PG 的全量未跑 |
| 插件 `plugins/ccgateway` | `go vet`/`go test` 通过（2 包） |
| companions `engine` | 1,516 通过 / 299 跳过（`CCG_REAL_CLI` 290、Linux 进程级 4、其他 5）/ 0 失败；`GOOS=linux go vet` 无输出 |
| companions `worker` / `contracts` | 43 过 1 跳过 / 123 全过 |
| 控制器 13 个模块（Windows 桩） | 168/168 通过，0 跳过 |
| cli-mods `node --test` | 169/169 通过，0 跳过 |
| 核验员临时 Go 测试（`-overlay`，不入库） | A3 复现 PASS |
| cap21 入站/出口比对（自写脚本） | build 15/16、direct 15/16 逐字节相同（第 16 条为非 CC 请求，按设计不同） |

## 8. 未能验证

- v21 真实抓包不存在；非 CC 请求的现行形状无实证。
- 上游作用域 429 的头形状（A2b）；生产 Worker 探针失败频率（C1）；`cli_version` 改动的真实 reconcile（B3）均为代码推断。
- 官方 ELF 多出的 ~130 MB 与 `cch` 的 1.4.4 运行时实现未分析。
- 核心需 PG 的测试、engine 290 个 `CCG_REAL_CLI` 用例、所有 Linux/Docker/nft 真实行为未跑。生产环境按要求未接触。

## 9. 修复状态

| # | 状态 | 做法 |
|---|---|---|
| D1 | 已修（插件 0.1.83 / CLI v22 `ccgateway-v22-client-entrypoint`，ELF sha `e1ee3b68…eb9e`，Bun 1.4.3） | 决定点放在 CLI 而不是 Worker：`requestEntrypoint`（content-policy.js）算出请求头将携带的 `cc_entrypoint`，构建前调原生 `setEntrypointOnRequests`（`H2r`），原生 `kLo` 与 `dN` 读同一值；客户端 CC 形状的 UA 经插件 `passHeaders` → Worker `CCG_REQUEST_AGENT.client.user_agent` 到 CLI，请求仍带客户端自己的 `cc_version`/`cc_entrypoint` 时 UA 原样保留（补丁 `nl()` 先读 `clientUserAgent()`）。新能力 `client_user_agent_v1`，Worker 只对声明它的 CLI 转发。顺手收口 D7 的能力列表/标签三处为一处。事实源 `next/docs/ccgateway-feature-support/REQUEST-HEADERS.md`。测试：engine/worker/contracts/插件 Go 全过，cli-mods 172/172。离线端到端（ovh 一次性容器，官方 2.1.304 客户端→Worker(v22)→假上游，脚本 `artifacts/claude-2.1.304/e2e/ua/`，抓包在其 `cap/`）：`-p` 客户端与 Agent SDK 方式（`CLAUDE_CODE_ENTRYPOINT=sdk-ts CLAUDE_AGENT_SDK_VERSION=0.2.71`）各一，build/direct 出口的 UA 与官方参考逐字相同（`claude-cli/2.1.304 (external, sdk-ts, agent-sdk/0.2.71)`），请求头集合与顺序相同、body 除 ID 外相同，唯一差异仍是客户端自定义地址时少发的 `mid-conversation-system-clear-at-2026-08-21` beta（已知，客户端侧）；非 CC 的 plain 请求 UA 为原生 `(external, sdk-cli)` 与其 `cc_entrypoint=sdk-cli` 一致。待发布后在 31 号用 `cli` 入口的真实 CC 再核对一次。 |
| A1/C4 | 已修（core 0.1.182 / 插件 0.1.84，CLI 仍 v22） | 新线形 `contracts/features.WorkerPolicy`（`wire.go`）：7 个键，核心 `workerPolicy()` 白名单构造，Worker `ParseWorkerPolicy` 读（未知键宽容，因为先发插件后发核心）；Worker 不再解析 `build_identity_lines`/`request_identity_sources`、不再据此 409，身份固定 replace（CLI 不支持时 client）；CLI 信封改为 `features.CLIPolicy`（不再带 `build_identity_lines`）。存储形 `RequestPolicy` 的 11 个 native 字段标 "stored only"，旧配置照常解码（避免 A3 式解码失败），设置页本就不再编辑。新夹具 `contracts/testdata/core-worker-policies.json`（核心 16 例线形 → engine 消费，A8）；Worker→CLI 夹具补 API Key / 无邮箱账号，覆盖 replace/client/worker 三种身份模式。CONTRACTS 新增 §53.18，§53.11/15/16/17 加下线/更新说明；INJECTION-LEVELS §6 表修正。测试：server 全模块（含 PG）通过，companions/contracts/worker/插件通过，cli-mods 契约测试通过。 |
| A3 | 已修（core 0.1.183） | `FeatureOverrides.UnmarshalJSON` 不再在解码时校验词表（结构检查保留）；`ResolveFeaturePolicy` 对全局/分组/账号三层各做 `sanitizePolicy`/`sanitizeOverrides`（`feature_policy_sanitize.go`）丢弃当前词表不认的条目、复制不改存储值、每个条目进程内只告警一次；保存路径（mergeConfig、SaveAccountFeaturePolicyTx、预览）仍严格。核验员实证的场景改成了回归测试 `TestStalePolicyVocabularyStillLoads`（含全局策略 high 级别下未知工具上线形的变体）。CONTRACTS §53.19，INJECTION-LEVELS §5 补注。 |
| B1 / C2 / A5 / A6 | 已修（core 0.1.185 / 插件 0.1.86，CLI 仍 v22） | 契约 `requestfailure` 新增来源 `gateway`/`core` 与 `X-CCGateway-Error-Reason`（CONTRACTS §53.20）。C2：Worker `apiError` 一律带来源与原因；插件 `classify.go` 按 `requestfailure.Local` 分类，不再比对文案、Worker 401 不再停用账号。A6：核心 `forwardAttempt` 的账号/配置/策略/能力失败改为 `coreRefusal`（带来源的 503）而不是 error；`requireCapabilities` 消息写明缺的能力或版本不符。A5：`save` 返回 `mergeConfig` 的具体文案；`pruneFeatureGroups` 在下一次保存时清掉孤立分组键。B1：控制器 `logging` 到 stderr（每个失败请求一行，未命名异常带堆栈；`_reactivate`、共享出口 recover 也记）；核心 `putConfig` 用 `syncError` 把控制器错误码变成 `details.reason`，`sync` 接口与对账日志原样带出；界面补 `cli_profile_unavailable`、来源 `core` 的文案。控制器激活失败另分 `proxy_check_failed`/`egress_not_ready`（0.1.86）。上线后新日志立刻解释了两件旧事：30 号（已删除）每 5 秒的 DELETE 被三个旧 rollback 容器占着数据卷而 409；20 号 PUT config 一直是代理连通性检查失败——都不是本次改动引入的。 |
| C1 / C5 | 已修（插件 0.1.87，核心与 CLI v22 不变） | 先由两个分析 agent 分别确认 C1 的门控关系与 C5 的删除边界，再以编译器为准执行：`Gateway.ServeHTTP` 断开 native 分支（空模式 500）后，从 Worker 入口跑 `deadcode` 删不可达函数，`staticcheck U1000` 删未用声明，导出类型在 main 包副本里"去导出"后同样用 U1000 判定，三者循环到不动点。engine 生产代码 28,300 → 约 7,100 行（−75%），文件 140+ → 49；`companions/mod`、`companions/catalog`、旧入口 `main.go` 与根 Dockerfile 删除。C1：工具目录（7 次 `claude -p` 探针）换成 `cliCheck`（启动时版本 + `sync` 时重读），`/admin/cli` 视图字段形状不变。连带收口：build 的 v1 路径（Worker 抽取 reminder、本机事实改写环境段）删除，CLI 未声明 `build_content_preservation_v1` 即 409；策略头只解析一次（C8 的一半）；旧 CLI 的 exit-2 HTTP 错误契约删除；托管安装官方 CLI 在 Worker 侧 409（官方 CLI 没有 `request` 命令）；`worker/pkg/types` 只留 `HealthStatus`、跟踪的 coverage 产物删除（C13 的一部分）；能力目录文案改为当前行为（审计异议 6/7）；`PASSTHROUGH-DESIGN.md` 标注归档，companions README 重写、旧文归档到 `docs/archive/`。删除过程中发现并修复一个请求模式缺口：上游 401 后标记存储令牌（用量查询据此报告失效）只在 native 路径写入，请求模式自 10-19 起一直缺失，现在由请求命令在 HTTP 401 帧时写入。测试按"测存活功能就修、测已删功能才删"处理：从 HEAD 恢复被连带删掉的请求模式测试（共享辅助函数被删所致）逐一修正；Worker→CLI 契约夹具重新生成零差异。CONTRACTS §53.21。测试：engine/worker/contracts/插件进程/核心 ccgateway 全过，`GOOS=linux go vet` 干净。 |
| A2 | 已修（插件 0.1.87） | 分类器依赖的 `x-ccgateway-error-scope`、来源 `cli`、`x-ccgateway-cli-error/-quota-*/-status` 只由已删的 native 路径写入，请求模式下全部失效：模型限定的周额度（Fable/Sonnet）429 也会整账号停用到重置。改为读上游自己的头——Claude Code 2.1.304 正是从 `anthropic-ratelimit-unified-representative-claim` 取 `rateLimitType`（`five_hour/seven_day/seven_day_sonnet/seven_day_overage_included`），重置取 `anthropic-ratelimit-unified-reset`；Worker 经 httpfacts 原样转发 `anthropic-ratelimit-*`。只认标记为上游 HTTP 答复（`X-CCGateway-Error-Source: http`，httpfacts 保证上游带不进这个头）的托管账号 429：`7d_fable/7d_sonnet` 只切换并记额度窗口，`5h/7d` 停用到重置。计费 400 只认上游正文（CLI 分类头已无人写）；请求作用域分支与旧 Worker 的文案判断删除。测试改写为上游头的同名用例（伪造来源、未知 claim、非法 reset、API Key 账号、正文不能声明作用域）。 |
| D6 / D3 / D7 / D8 | 已修（CLI v23 `ccgateway-v23-bound-imports`，ELF sha `558d7b31…5b5c`（2026-10-24 第二轮优化重编；前一版 `df6e562b…94ea`），Bun 1.4.3，待发布） | D6：删 2.1.296/2.1.302 补丁器、302 profile、302 版 `request-build.js`、`relay_mode` 分支与 `transformBody`；支持模块直接用 304 的名字与 chunk。D3：5 个导入模块入 profile 哈希绑定；补丁器写盘前 `checkImports()` 校验每个新增静态/动态导入的模块在 profile 内且导出该名字，否则失败（注入 core 作用域的 `.inc.js` 直接引用的原生标识符不是 import，仍靠 core 模块哈希与原生对账测试兜底）。D7：能力列表只在 profile 一处，`--ccgateway-info` 与 manifest 都读它；三段单行注入并为 `request-entry.inc.js`。重构：`shared.js`、`collectBuilt`、`prepareBuildInput`/`runRequestCommand` 各拆 4–7 段，嵌套 ≤3 层。D8：恢复源码存在时原生对账测试必须真跑，不存在时 stderr 打印 `CCG_NATIVE_TEST_SKIPPED <原因>`，`CCG_REQUIRE_ARTIFACTS=1` 时失败。出口字节不变：补丁后原生 chunk 与 v22 逐字节相同，`cli.js` 词法记号相同；v22 快照与新代码在 92 个夹具请求体上差分 21,541 次全同；契约夹具 11/11。2026-10-24 代码质量审核（`../2026-10-24-code-quality/04-cli-mods.md`，J1–J21）在同一个 v23 标签下原地重编：删除 `claude request` 走不到的 Mod 工具执行链（十处补丁改写、`tool-dispatch.inc.js`、运行探针与 Dockerfile）与能力 `native_tools`、`mods_dispatch`，`request-build-2.1.304.js` 改名为 `request-build.js`；出口只有两处有意变化（direct 补的 system 按官方键序放在 `messages` 之后，J2；注入提示词让出缓存断点时保留客户端身份行的标记，J19），17 种请求新旧对拍其余逐字节相同。现在 cli-mods 171/171（0 跳过，含真跑的 `patch-wire-preservation-304`），ELF 为上面的 sha。 |
| D2 | 查清边界，不改运行时 | 官方 2.1.304 ELF 内嵌 Bun 1.4.4 **构建 de4bc695b**，npm 发布的 1.4.4 是 **38afee6c8**，同号不同构建，无法取得官方那一份。用 npm 1.4.4 编出的 v23 为 175 MB（1.4.3 为 157 MB），官方 288 MB 仍多约 113 MB：官方 `$bunfs` 有约 3,800 个内嵌文件（2,463 个 JS 块、136 个 zst 压缩的 README/SKILL 等资源、`audio-capture.node`、`clipboard-napi.node`），体积差来自内嵌资源而非运行时。`cch=00000` 在官方 JS 里同样是字面占位（`P=… " cch=00000;"`），ELF 中未找到替换它的其他代码；"官方在运行时替换"仍是抓包观察，机制未定位。结论：传输层指纹与官方一致无法保证，已写进 REQUEST-HEADERS 的边界；生产继续用 Bun 1.4.3，换运行时要单独验证。 |
| C3 / C6–C16 / C11 | 已修（插件 0.1.87，Worker） | `serveRequestCommand` 拆为 `admitRequest`（`parseRequestPolicy`、`checkCapabilities`）→ 占槽 → `prepareRequest`（`readRequestBody`、`resolveRequestContext`、`prepareInput`）→ `runCLI` → `writeOutcome`；能力门一张表 build/direct 共用。C11：带核心策略头时 build 也要求 `request_levels_v1`（与核心预检一致）。C3：槽位在只看请求头的检查之后、读请求体之前占（满载不再读完 32 MiB 才 429），`CCG_REQUEST_SLOTS`/`Options.Slots`，`/healthz` 报 `slots`。C7：鉴权后才建请求日志；`store.mu` 只保护级别/活动/索引，文件写在请求锁内；启动索引后台构建。C8：鉴权比较一次随 ctx 传递。C6：只把小写 v4 会话 ID 交给 CLI。C9：direct 下读不懂的身份不再 400。C10：信封与上游都只在客户端发了 `stream` 时才带它（CLI 侧 `request-input.js`/`request-build-2.1.304.js`，原生键位置不变），信封不再补 `systemPrompt:[]`；契约夹具 6 例随之变化。C12：`--ccgateway-info` 一次、ELF 哈希一次。C13：`engine.AdminAuthorized` 是唯一的管理鉴权（`/admin/status` 等现在必须带 `Bearer`，核心与控制器本就如此）。C15：`features.RequestTimeout`。C16：Worker 的两个密钥对所有 CLI 子进程无条件剔除（不改白名单：CLI 读几百个变量，列不全）。删 `httpfacts/quota.go`、`RequestIdentitySources.Explicit`、`DefaultIdentityLine`。不拆子包：会导出十几个内部符号而耦合不降。 |
| 删账号残留 / B2 / B4–B11 | 已修（控制器，随插件 0.1.87） | **删除不残留**：账号容器 = 带账号 label 且名字以本控制器前缀+key 开头（含人工回滚留下的 `-app-rollback-*`，跨前缀同 key 不误删）；先检查挂卷/连网的外来容器，有则 409 `resource_in_use`（外来容器名只写控制器日志）、什么都不删（不再 503 循环）；顺序 解绑共享出口→容器→网络→卷（purge/草稿）→状态目录→备份→内存表，每步幂等、失败不吞；返回 `removed` 明细；`cleanup.py` 能发现只剩回滚容器的运行环境；features 加 `runtime-purge-v2`。**退役托管安装**：删 `cli_updates.py`、catalog 路由与忙锁，`admin/cli` 纯透传。B4 重启后立即重装 nft 规则（首次启动的一两秒窗口仍在，需改 Worker 入口）；B5/B6 删 `v1/messages` 中继与 `migrate-auth`；B8 请求路径不查镜像、等锁上限 20 秒；B9 每 300 秒重解析代理主机名；B10 测试清环境；B11 locale/timezone 校验；B2 `migrate` 状态机 6 条测试。B12（直连模式可访问宿主公网 IP）只分析，待用户决定。重构：拆出 `common/dockerfs/http_api/worker_update/runtime_admin`，生产代码无 `from manager import`，`manager.py` 1733→约 1070 行，生产函数 ≤60 行、嵌套 ≤4。测试 184/184（Windows 桩；真实 Docker/nft 未跑）。 |
| B3 / A4 / A7 / A9–A12 / 核心重构 | 已修（核心，待发布） | B3：核心唯一的版本字面量 `PinnedCLIVersion`；保存 `cli_version` 变化时并发问各运行环境 Worker 实际版本，有在跑别的版本的回 400 `cli_version_unavailable`（列出 key），无人能确认时只接受固定版本；校验在事务外，锁内版本被并发改动回 409 `config_changed`；不带 `cli_version` 时保留已存值（之前会被重置）；配对更新接受任意 x.y.z，由控制器按镜像 manifest 判断。控制器不上报打包版本列表，故用"Worker 实际在跑"判断（分报告"按镜像 manifest 校验"做不到）。退役：删 `cli/:id/catalog` 路由，POST `update` 回 400。A4：路由记控制器端点指纹，端点变化即重新要连接，用满 5 分钟向控制器核对一次。A7：账号策略与 Worker health 缓存 30 秒，`account:changed` 与本节点 `AccountChanged` 立即失效。A9：预览与解析不再含 `build_identity_lines`/`request_identity_sources`。A10：账号测试结果带 `policy_scope: "global"`，界面已提示。A11：控制器 profile 的 `request_mode` 核心不能先删（会改 revision 触发 B3 式 409），收为常量并注明。A12：`desiredIn` 改用 `environment.Normalize` 不可行（拒绝旧键会使账号无法对账）。重构：`forwardAttempt` 拆 `resolveRoute/attachPolicy/send`（legacy ssh/local 分支隔离为 `resolveShared`，按 §53.9 暂留，删除需用户决定）；`layerFields` 表；`httpio.go` 收口 `readBounded`/`newNoRedirectClient`；`mergeConfig` 拆 8 段；嵌套 ≤4。控制台随之修正：`normalizeRequestPolicy` 保留已存版本、配对更新发已存版本（之前写死 2.1.304，会让非 2.1.304 的配置每次保存被拒）。 |
| 删账号可选保留运行资源 | 已修（SDK + 核心 + 插件 0.1.87 + 控制台，待发布；用户 2026-10-24 要求） | manifest `lifecycle.deletion.retentionDays`（1–30，`MaxRetentionDays`，校验器拒绝越界），ccgateway `managed`/`apikey` 声明 3 天。`DELETE /accounts/:id?retain_resources=1` 保留到 `now()+N 天`（其他取值或未声明 → 400 `invalid_argument`，账号不删），审计带 `retain_until`；不带参数立即清除。迁移 0057 加 `purge_after`/`purged_at`；`Reconcile` 先处理已删除账号（阻断标记与坏代理不再挡住清除），到期清除后同事务写 `purged_at`，不再重复删除；卸载插件也写清理意图（立即）。删除事件投递不再因清除失败卡住插件全部生命周期事件，只记 `code`（如 `resource_in_use`）。新接口 `GET /system/ccgateway/runtimes/retained`（`settings:read`）（含到期未清除的，`due`）与 `POST /system/ccgateway/runtimes/:key/purge`（`settings:manage`，提前清除或重试，202/404/409 `runtime_not_retained`）；孤立资源清理保留名单含保留期内的 key；退役运行环境删除也带 `X-CCG-Delete-Data`。控制台删除对话框二选一、账号容器页"待清理（已删除账号）"可立即清理或重试。保留期内容器停止，网络/卷/状态目录保留，不支持恢复账号。限制：旧核心节点无视 `purge_after` 立即清除并每轮重删，须全部节点升级后再用；清除持续失败时列表只显示"清理中"，原因在节点日志；控制器 409 应答体不含外来容器名（只在控制器日志）。契约 CONTRACTS §49.12–§49.14、§49.22、§49.23，`ACCOUNT-RUNTIME-LIFECYCLE.md`。 |
| 2026-10-24 代码质量审核 | 已改（工作树，未提交，待发布） | 对 `f546fa31a..839d1c22e`（本表各项修复）按复用、解耦、简洁、低嵌套再审一遍，核心、Worker、控制器、cli-mods、控制台与 SDK 五份报告共 99 条：已修 86、部分 6、跳过 7。顺带修了约 20 个真问题（保存配置的错误码、清除后本节点缓存未失效、日志删除卡住请求、控制器同名资源 503 循环与助手残留、成对激活的备份轮换、direct 补 system 的键序等）；线上变化有 J2、J19、控制器 DELETE 的 409、Worker install 动作 400、核心保存 500，契约已同步。待用户决定或需核心与 Worker 一起发布的：K8、W8、W15、V2、V3/V17、P20、旧共享运行时分支、B12。见 `../2026-10-24-code-quality/99-SUMMARY.md`。 |
