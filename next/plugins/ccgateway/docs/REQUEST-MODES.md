# CCGateway 请求模式

第 1 节是当前契约（以代码为准，CLI 2.1.304；版本见 [`cli-mods/README.md`](../companions/cli-mods/README.md) 的版本表）；第 2 节是按发布顺序保留的历史记录，其中的版本、默认值和规则只代表当时。

## 1. 当前契约

### 1.1 两种模式

每个 `/v1/messages` 请求在账号 Worker 里运行一次打包 CLI 的 `claude request --build` 或 `--direct`（engine `serveRequestCommand`），没有第三种执行方式；Worker 没有请求模式时回 500 `Worker has no request mode`（CONTRACTS §53.21）。两种模式都把工具调用交回调用方执行，网关不运行 Agent 工具循环；CLI 以 `maxRetries: 0` 发送，一次客户端请求只触发一次模型生成。两种模式的请求行都是 `POST /v1/messages?beta=true`，与官方客户端相同（插件 0.1.88 起）：build 经原生 SDK 的 `client.beta.messages.create` 发送（路径、`?beta=true`、betas 转头都由 SDK 决定，插件 0.1.90 起）；direct 要发原始字节，用 `client.post`，路径在打补丁时从原生 SDK 的 create 里按 AST 取出（`cli-mods/model-request.js` `messagesPath`），不写字面量。

| 模式 | 注入等级 | 做什么 |
|---|---|---|
| `direct` | 0 | body 原样转发，只处理开头的计费头：缺头或缺字段补原生值，按计费来源换字段；字符串 system 改成块数组；**不补身份行**（[build 设计](BUILD-REQUEST-COMPONENTS-DESIGN.md) §6.3） |
| `build` | 微、低、高 | Worker 把客户端的块原样装进组件信封，CLI 用 CC 原生构造器重新组装后发送：总带计费头；没有计费头的请求按等级补身份行（OAuth）、环境附件、内置提示词与工具；环境字段按来源转换；身份按账号映射（[build 设计](BUILD-REQUEST-COMPONENTS-DESIGN.md)、[注入等级设计](../../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md)） |

模式不单独配置：核心按全局→分组→账号解析出的注入等级决定（none → direct，其余 → build），随每个请求的策略头下发。新安装的默认等级是「低」（build，平台与系统版本用服务端的值）；固定 CLI 版本是 2.1.304。Worker 容器的 `CCG_REQUEST_MODE`（缺省 build）只在请求没有策略头（手动调用）时生效。

**build 的生成参数**：`max_tokens`、`thinking`、`tool_choice`、`temperature`、`output_config.effort`/`format` 交给 CC 原生构建接口，最终值由原生模型规则决定；`metadata` 由身份逻辑决定（build 设计第 7 节）。其余参数——如 `top_p`、`top_k`、`stop_sequences`、`service_tier`，以及 `output_config` 的其他子键——由 `mergeAdditionalParameters`（`cli-mods/request-parameters.js`）原样并回最终 body；`diagnostics` 只在客户端自己发了时才发。构建器不能如实表达的生成值（未知 thinking 类型或字段、预算或 max_tokens 不是正整数、非布尔 stream、非对象 output_config）不预检、不拒绝，原样发给上游判断；数字保持客户端原文（`1.0`、超过 2^53 的整数等，CLI v29 起；此前 build 对这些都回 400）。build 下读不出的 `metadata.user_id` 当作没带，补账号身份。客户端没发 `stream` 时出口 body 也没有 `stream` 键（build 与 direct 相同，审核 C10 已修；2026-10-25 离线与 31 号生产出口均证实）。

### 1.2 策略头

核心每个请求带 `X-CCGateway-Request-Policy`，线形是 `contracts/features.WorkerPolicy`（CONTRACTS §53.18）：`schema_version`、`relay_mode`、`cli_version`、`build_billing_sources`、`build_billing_entrypoint`、`build_attachment_sources`、`build_injection`。Worker 对它的处理：

- 头无效 → 400 `invalid_request_error`（`Invalid gateway request policy`）；未知键忽略（先发插件后发核心）。
- `cli_version` 与 Worker 的 CLI 不同 → 409 `configuration_error`。
- `relay_mode` 与容器模式不同时，要求 CLI 声明 `request_<mode>`，否则 409。
- 身份行与 `metadata.user_id` 的映射不在策略里：前者由 CLI 按计费头入口自适应，后者固定 `replace`（build 设计第 6.1、7 节）。

### 1.3 能力门

两道检查，都按 CLI 的 `--ccgateway-info` 能力，不按版本号推断：

- **核心预检**：发送 `/v1/messages` 或 `/v1/ccgateway/probe` 前，经同一账号路由读 Worker `/healthz`，核对 CLI 版本与线形要求的能力（`requestPolicyCapabilities`：总是 `request_policy_mode_v1`、`request_levels_v1`，其余按线形内容）。不满足时核心自己回 503，`X-CCGateway-Error-Source: core`、原因 `configuration_error`，消息写明缺的能力或版本不符。
- **Worker**：读 body 之前按同一张表检查（`requestCapabilityGates`）：带核心策略头的请求要求 `request_levels_v1`；build 必须有 `build_content_preservation_v1`，并按下发的来源、入口、注入要求对应能力；direct 下发了入口或计费来源要求 `direct_billing_v1`。不满足 409 `configuration_error`。

能力表见 [build 设计](BUILD-REQUEST-COMPONENTS-DESIGN.md) §2.1、§10。核心读到的 `/healthz` 按路由缓存 30 秒，Worker 原地更新后该路由被丢弃。Worker 就绪只取决于启动时的 `--version`、`--ccgateway-info` 与固定版本/补丁/哈希校验（CONTRACTS §53.21）。

### 1.4 账号测试（probe）

账号测试走 Worker 的 `/v1/ccgateway/probe`：传入所选模型、字符串 system 和一个简短问题，**固定走 build**（即使业务等级是 0），不带客户端请求上下文（CC 原生主线程），响应头 `X-CCGateway-Test-Mode: native_build`，测试结果标 `test_mode: native_build`。核心对 probe 同样做能力预检。它测账号连通性，不代表业务请求按 direct 发出的样子。

### 1.5 Worker 的其他准入

- 只接受 `POST /v1/messages` 与 `/v1/ccgateway/probe`；其他路径 404 `not_found_error`（`count_tokens` 插件不声明，核心不调度到 CCGateway）。
- `anthropic-version` 只接受 `2023-06-01`；body 上限 32 MiB（413）；Worker 密钥不对 401。
- 并发上限每 Worker 4 个请求（`Slots`），超出 429 并带 `Retry-After: 1`；槽位在只凭请求头就能做的检查（路径、模式、能力、方法、版本）之后、读 body 之前占用（审核 C3）。被跟踪 fallback credit 的请求在占槽之前另用一个槽核验发放方（见下条）。
- direct 也解析 body：必须是 JSON 对象且 `model` 非空；有请求上下文能力时还解析 `metadata.user_id` 与 agent 请求头，解析失败 400（审核 C9）。
- 核心跟踪 fallback credit 的请求（带 `fallback-credit-2026-06-01`/`-07-01` 或 `server-side-fallback-2026-07-01`，核心加 `X-CCGateway-Fallback-Credit-Track`）：Worker 先核验发放方（资源身份），把 `Principal`/`Generation` 写在答复头上；答复照常流式转发，Worker 留一份副本，结束后用 trailer `X-CCGateway-Fallback-Credit-Ready` 回报 claim 的 token 哈希（插件 0.1.91 起；0.1.88–0.1.90 是整段缓冲后写在头上）。核心照常转发事件，只扣住从第一个真正带 token 的事件（`message_delta` 的 `delta` 或 `message_start` 的 `message` 里非 null 的 `stop_details.fallback_credit_token`，`credits.EventCarriesToken`）起的尾部，核对回执并记下 credit 后放出；回答里只是提到这个词不会扣住。核对或记录失败时以一个 `error` 事件结束流，客户端拿不到网关不认识的 token，流随后正常结束、不中断连接（中断会被客户端当成断线重试）；超过 32 MiB 时扣住的部分直接丢弃（反正无法确认）。核心与 Worker 用同一个函数（`credits.EventPayloads`）读流算 claim，CRLF、注释行、末事件没有结尾空行都一样处理。冷缓存下的资源身份核验同一时刻只跑一次，等候的请求直接用刚核验出的身份（以上为 2026-10-25 第三轮审核 P2-1–P2-4）。JSON 答复仍由核心整段读完（核心 0.1.187 起两种位置的回执都认）。账号授权锁：重新授权与资源操作独占；被跟踪的请求从核验发放方到上游开始答复期间共享，核心为它做的资源身份探测也共享，彼此不排队（审核 2026-10-25 P2-1/P2-2）。资源操作等不到锁或槽位时答 503，不再是空的 200。
- 上游收到的请求头都由 Worker 里的原生 CLI 生成；客户端的头只作为输入（有的值原样写回，如 agent-id、压缩头、符合条件的 UA），去向见 [REQUEST-HEADERS](../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md)。

### 1.6 错误与来源

| 来源（`X-CCGateway-Error-Source`） | 谁写 | 答复 |
|---|---|---|
| `http` | CLI 帧 | 上游 HTTP 错误：状态、`Content-Type` 与正文原字节透传（正文经请求目录的 sidecar 文件交给 Worker，不受 stderr 行长限制） |
| `input` / `transport` / `internal` | CLI 帧 | CLI 在到达上游前或途中失败，按帧里的状态与官方错误类型答复 |
| `timeout` | Worker | 超过 Worker 时限（`REQUEST_TIMEOUT`/`CCG_TIMEOUT` 与 `CLI_TIMEOUT` 中较小者，缺省 1 小时）：未开始响应时 504 `timeout_error` |
| `interrupted` | CLI 帧 | CLI 被中断 |
| `gateway` | Worker 自己 | 运行 CLI 前的拒绝（401/400/404/405/413/429/409/500，以及 CLI 版本检查失败、维护中、关闭中的 503），另带 `X-CCGateway-Error-Reason` |
| `core` | 核心自己 | 问 Worker 之前的拒绝（账号状态、未配置、策略无效、能力不足、`not_synchronized`），503 |

上游答复永远带不上这两个头（`httpfacts.Apply`）。插件按来源分类：本地来源只短冷却并切换，不因 Worker 401 停用账号（CONTRACTS §53.20）。响应已开始后出错（流中断、超时）以中断连接告终，不追加 JSON。调用方先断开时 Worker 不伪造响应；未开始响应的记 499 诊断，已开始的保留原状态并记 `client_canceled`。CLI 帧报告上游 401 时，Worker 记下存储的访问令牌不可用，用量查询据此报告。

### 1.7 发布顺序

先发插件（Controller、Worker 镜像与随镜像打包的 CLI；账号容器经原地更新换上新 Worker 与 CLI，CONTRACTS §53.7），再发核心：Worker 接受旧核心的多余键，而新核心的能力预检会拒绝旧 Worker。

例外：核心 0.1.187 / 插件 0.1.91（fallback credit 回执改为 trailer）要**先发核心**。旧核心只读头上的回执，新 Worker 的回执在 trailer 里，真的发放 credit 的那次答复会被旧核心判为未确认（502）；新核心两种位置都认，可以先和旧 Worker 配合。

## 2. 历史

以下为 2026-10-19 起的发布记录原文，不描述当前行为。

2026-10-19 最新：ccgateway **0.1.67 / CLI v11** 已部署到 21/30/31/32，Core 保持 **0.1.168**。build 已去掉客户端 parameters 经 extraBody 覆盖原生结果的路径。max_tokens、thinking、tool_choice、temperature、output_config.effort/format 映射到 CC 原生构建接口，最终值由模型规则决定；不再承诺任意 parameters 字段直接进入 HTTP body。top_p、stop_sequences、调用方 metadata 等没有映射的字段不会自动补传，需原样请求时使用 direct。21 号真实 WebSearch 和页面摘要请求均 HTTP 200。详见 [302 文档第 19/20 节](CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md)。

2026-10-19 历史发布：Core **0.1.168** / ccgateway **0.1.66** / CLI **2.1.302/v10** 上线。direct/build 均将上游 HTTP 错误状态和正文原样返回，包括空正文、非 JSON、非 UTF-8 和超过 64 KiB 的内容；只在本地转发失败时生成错误。21/30/31/32 当时固定新原生 ELF，日志保存上游实际消息。[发布验收](cli-research/2.1.302/raw-http-errors-deployment-0.1.168.json)。

2026-10-19 0.1.165 发布：Core **0.1.165** / ccgateway **0.1.65** 已区分调用方取消与 Worker 超时。未发响应时取消只记诊断 499；已发响应时保留 HTTP 状态并记录 client_canceled。21/30 Worker 已原地更新，CLI 2.1.302/v9 及固定 SHA 保持。[发布验收](cli-research/2.1.302/cancellation-deployment-0.1.165.json)。

2026-10-19 0.1.164 发布：Core **0.1.164** / ccgateway **0.1.64** 已发布重新编译的 **2.1.302/v9** 原生 CLI，修复字符串错误消息提取和中断类型，21/30 号固定新 ELF SHA。两账号 Opus 测试、公网错误透传和正常 SSE 均通过；业务默认 build。[修订与发布验收](cli-research/2.1.302/error-metadata-deployment-0.1.164.json)。

2026-10-19 0.1.163 发布：Core **0.1.163** / ccgateway **0.1.63** 已修复账号测试请求构建，并按上游原始状态、错误码和正文展示 HTTP 错误。21/30 号通过真实账号测试接口调用 `claude-opus-5-5`，均 HTTP 200、回答 Paris。CLI 继续使用 2.1.302/v9，业务默认 build；[发布验收](cli-research/2.1.302/account-probe-deployment-0.1.163.json)。

2026-10-19 0.1.162 发布：Core **0.1.162** / ccgateway **0.1.62** 已发布 CLI v9 结构化 stderr 错误通道，21/30 号更新并保留授权；公网 HTTP 错误和正常 SSE、OAuth 普通问答验收通过。模式仍为默认 build。

2026-10-19：请求模式只保留 `build` 和 `direct`，默认 `build`。定制 CLI 仍为 2.1.302。

- `build`：Worker 提取消息组件，调用 `claude request --build` 构建并发送一次模型请求。
- `direct`：完整 Messages body 交给 `claude request --direct` 原样转发；v17 起只补缺的计费头（或缺的字段）和按入口配置的身份行，其余字节不变（[build 设计](BUILD-REQUEST-COMPONENTS-DESIGN.md) §6.3）。

两种模式都将工具调用返回调用方执行，不由网关运行 Agent 工具循环。原 native 选项和仅适用于 Agent 的设置控件移除。2026-10-19 的 0.1.61 / CLI v8 更新已移除 request 的 API Key-only 限制：显式 API Key 保留原隔离路线，没有 API Key 时复用 CC 原生 OAuth 读取、发送前刷新及 Bearer 认证。详见 [302 OAuth 实现与验证](CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md#10-request-oauth-支持2026-10-19)。

认证支持不意味着上游接受任意 Messages 形状。30 号完整 CC 客户端经 build、其完整请求经 direct，均成功调用 `claude-opus-5-5`；简化空 system 的 OAuth 请求实测返回上游 429。2026-10-21 查明原因：OAuth 请求的第一个 system 块必须是计费头或 Claude Code 开头行，否则 Sonnet/Opus 返回 429。真实 CC 客户端自带二者，所以 direct 一直可用，只有账号测试这类简化请求触发 429。CLI v16 起 direct 为纯透传：不补计费头、不补开头行、不改 metadata.user_id；build 在缺少时补计费头和开头行（规则见 [build 组件设计第 6.1 节](BUILD-REQUEST-COMPONENTS-DESIGN.md#61-claude-code-开头行oauthbuild)）。账号测试固定走 build，因此也能通过。request 不伪造成功、不自动换模型。

0.1.63 的账号测试使用内部 `/v1/ccgateway/probe`，传入所选模型、普通字符串 system 和一个简短问题，由 CC 的 `request --build` 内建函数构建并发送一次请求。该测试测账号连通性，结果明确标注 `test_mode: native_build`；即使业务配置为 direct，测试也走此构建路径。正常 `/v1/messages` 仍严格使用配置的 build/direct 模式。

测试错误只展示实际 HTTP 状态、上游错误码和响应正文；上游没有错误码时只保留 HTTP 状态，不生成额外错误码。实际响应头按既有白名单返回。HTTP 失败不显示或持久化 ClassifyError 推导的原因、禁用/冷却建议，也不根据配额读数补充原因。业务转发的分类和调度规则保持原样。

CLI v10 保留结构化 stderr 状态/诊断通道，完整 HTTP 错误正文通过 Worker 请求目录中的 sidecar 文件传递，不受 stderr 行长度限制；Worker/Core 原样发送上游状态、Content-Type 和正文。正常 JSON/SSE 继续从 stdout 返回。流中途断开会向客户端传播为中断，不作为正常完成；v9 的非 JSON/超长错误封装行为已被替代，详细契约见 [302 文档第 15 节](CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md)。

### 配置和迁移（2026-10-19）

Core 缺省配置为 build / CLI 2.1.302。历史 native、legacy、passthrough 和空模式在读取时归一为 build；保存新配置只接受 build/direct，不再接受显式 native。

Worker 的环境变量 `CCG_REQUEST_MODE` 缺省或空值均按 build；显式 native 会启动失败。独立 engine 命令及 `NewRuntime` 同样默认 build；生产构造入口始终选择单次 request 传输。旧 runner/协议辅助代码仍供授权管理和既有离线回归使用，不再作为可配置业务模式。

Controller 新建容器默认 build。迁移已存在的 Agent 容器时，使用当前配置的目标 Worker 镜像，验证固定 CLI 的哈希与 build 能力后才替换容器。账号专属数据卷、认证配置、网络策略保持；build/direct 之间切换仍保持原有镜像选择规则。

### 发布顺序（2026-10-19）

先构建并加载新 Worker/Controller 镜像，再更新 Controller 及其未来镜像配置，最后通过正常发布流程升级 Core。新版 Core 会归一旧配置并同步已有账号，因此原 native 容器可能在此时重建；应先保存容器基线和数据卷备份，在账号空闲时切换。不要先对旧 Core 管理下的 native 容器单独更新 Worker，以免旧 native 请求头与新 build 默认值产生冲突。

发布后核对四节点设置回读为 build、Controller 状态中的 CLI profile、Worker features 的 `request_build`、CLI 哈希及禁更状态；以真实 Messages 请求和本地 CC 工具回合验证。

### OVH 正式发布（2026-10-19，北京时间）

- 源码 `1ab76a3a5f91582d2c96aa558b8aa5763a094b67`；Core 四节点 **0.1.160**，ccgateway 插件/Controller/Worker **0.1.60**。release `v0.1.160`，升级计划 `22d4715a46d5e171a3b2d8cd0f3e6f87` 完成 27 步。
- Controller 先升级并设置未来镜像为 0.1.60，再升级 Core。经正常管理 API 将归一后的 build 配置写回，21 号同步为 `ccgateway-app:0.1.60`、`CCG_REQUEST_MODE=build`，features 返回 `execution_modes:["request_build"]`。
- 21 号容器因模式迁移重建，原 `ccg-21-data` 卷、挂载与 API Key 配置保留；CLI 仍为 **2.1.302 / ccgateway-v7-request-modes**，哈希 `b14a537bbaa1218f23ba7347151f52fb29654af1101ed4b935507b6beb2dc9d8`，自动更新关闭。停止的历史账号未启动，共享出口的容器身份和启动时间未变。
- 四节点 ready HTTP 200，配置回读均为 build，实际前端 `CCGatewayView-BySpskJP.js` 与构建产物一致。Core SHA-256 为 `1b98651cdda558ca752d0639ed4785feb2a093d22e5036a785a11b642f8bbd9a`。签名配置沿用此前发布，其他 builtin 包字节与 trust 未改变。
- 真实公网 Messages 请求：`claude-opus-5-5` HTTP 200，4.38 秒，回答 `BUILD_21_OK`。用量日志确认 account_id=21、plugin_version=0.1.60。
- 本地官方 Windows CC **2.1.302** 经同一公网入口调用 `claude-opus-5-5`，9 秒完成一次 Read、两轮模型请求，正确读出本次插件版本 0.1.60 / grpc 并回答 `BUILD_TOOL_OK`。工具错误为 0，Git 状态和源码 diff 未变化；两次模型调用均由 21 号成功处理。
- 验证：控制台 ccgateway 198 项测试及类型检查、Controller 135 项、Core ccgateway/account、Linux Engine/Worker 全包回归通过。旧 native 模式的测试预期及模拟 CLI 已改为 build/request；定制 CLI 二进制未在本次重新修改。
- 私有备份：`~/sup2api-managed/backups/ccgateway-build-default-0.1.160/`，包括数据库 dump、21 号数据卷 tar、Controller 环境及容器基线；数据库恢复列表和卷归档可读取性已验证。构建记录位于 `~/sup2api-managed/stage/0.1.160/`。未对生产孤立资源执行清理。

脱敏证据见 [build 默认模式发布验证](build-default-deployment-0.1.160.json)。
