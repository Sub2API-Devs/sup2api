# CCGateway 请求模式

2026-10-19 最新：Core **0.1.165** / ccgateway **0.1.65** 已区分调用方取消与 Worker 超时。未发响应时取消只记诊断 499；已发响应时保留 HTTP 状态并记录 client_canceled。21/30 Worker 已原地更新，CLI 2.1.302/v9 及固定 SHA 保持。[发布验收](cli-research/2.1.302/cancellation-deployment-0.1.165.json)。

2026-10-19 0.1.164 发布：Core **0.1.164** / ccgateway **0.1.64** 已发布重新编译的 **2.1.302/v9** 原生 CLI，修复字符串错误消息提取和中断类型，21/30 号固定新 ELF SHA。两账号 Opus 测试、公网错误透传和正常 SSE 均通过；业务默认 build。[修订与发布验收](cli-research/2.1.302/error-metadata-deployment-0.1.164.json)。

2026-10-19 0.1.163 发布：Core **0.1.163** / ccgateway **0.1.63** 已修复账号测试请求构建，并按上游原始状态、错误码和正文展示 HTTP 错误。21/30 号通过真实账号测试接口调用 `claude-opus-5-5`，均 HTTP 200、回答 Paris。CLI 继续使用 2.1.302/v9，业务默认 build；[发布验收](cli-research/2.1.302/account-probe-deployment-0.1.163.json)。

2026-10-19 0.1.162 发布：Core **0.1.162** / ccgateway **0.1.62** 已发布 CLI v9 结构化 stderr 错误通道，21/30 号更新并保留授权；公网 HTTP 错误和正常 SSE、OAuth 普通问答验收通过。模式仍为默认 build。

2026-10-19：请求模式只保留 `build` 和 `direct`，默认 `build`。定制 CLI 仍为 2.1.302。

- `build`：Worker 提取消息组件，调用 `claude request --build` 构建并发送一次模型请求。
- `direct`：完整 Messages body 交给 `claude request --direct` 转发。

两种模式都将工具调用返回调用方执行，不由网关运行 Agent 工具循环。原 native 选项和仅适用于 Agent 的设置控件移除。2026-10-19 的 0.1.61 / CLI v8 更新已移除 request 的 API Key-only 限制：显式 API Key 保留原隔离路线，没有 API Key 时复用 CC 原生 OAuth 读取、发送前刷新及 Bearer 认证。详见 [302 OAuth 实现与验证](CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md#10-request-oauth-支持2026-10-19)。

认证支持不意味着上游接受任意 Messages 形状。30 号完整 CC 客户端经 build、其完整请求经 direct，均成功调用 `claude-opus-5-5`；简化空 system 的 OAuth 请求实测返回上游 429。request 不伪造成功、不自动换模型，也不在 direct 中补写提示。

0.1.63 的账号测试使用内部 `/v1/ccgateway/probe`，传入所选模型、普通字符串 system 和一个简短问题，由 CC 的 `request --build` 内建函数构建并发送一次请求。该测试测账号连通性，结果明确标注 `test_mode: native_build`；即使业务配置为 direct，测试也走此构建路径。正常 `/v1/messages` 仍严格使用配置的 build/direct 模式。

测试错误只展示实际 HTTP 状态、上游错误码和响应正文；上游没有错误码时只保留 HTTP 状态，不生成额外错误码。实际响应头按既有白名单返回。HTTP 失败不显示或持久化 ClassifyError 推导的原因、禁用/冷却建议，也不根据配额读数补充原因。业务转发的分类和调度规则保持原样。

CLI v9 的错误通道使用结构化 stderr，由 Worker 按错误帧封装 HTTP 状态和错误正文；正常 JSON/SSE 继续从 stdout 返回。流中途断开会向客户端传播为中断，不作为正常完成；详细契约见 [stderr 错误协议](CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md#11-stderr-错误协议v9)。

## 配置和迁移

Core 缺省配置为 build / CLI 2.1.302。历史 native、legacy、passthrough 和空模式在读取时归一为 build；保存新配置只接受 build/direct，不再接受显式 native。

Worker 的环境变量 `CCG_REQUEST_MODE` 缺省或空值均按 build；显式 native 会启动失败。独立 engine 命令及 `NewRuntime` 同样默认 build；生产构造入口始终选择单次 request 传输。旧 runner/协议辅助代码仍供授权管理和既有离线回归使用，不再作为可配置业务模式。

Controller 新建容器默认 build。迁移已存在的 Agent 容器时，使用当前配置的目标 Worker 镜像，验证固定 CLI 的哈希与 build 能力后才替换容器。账号专属数据卷、认证配置、网络策略保持；build/direct 之间切换仍保持原有镜像选择规则。

## 发布顺序

先构建并加载新 Worker/Controller 镜像，再更新 Controller 及其未来镜像配置，最后通过正常发布流程升级 Core。新版 Core 会归一旧配置并同步已有账号，因此原 native 容器可能在此时重建；应先保存容器基线和数据卷备份，在账号空闲时切换。不要先对旧 Core 管理下的 native 容器单独更新 Worker，以免旧 native 请求头与新 build 默认值产生冲突。

发布后核对四节点设置回读为 build、Controller 状态中的 CLI profile、Worker features 的 `request_build`、CLI 哈希及禁更状态；以真实 Messages 请求和本地 CC 工具回合验证。

## OVH 正式发布（2026-10-19，北京时间）

- 源码 `1ab76a3a5f91582d2c96aa558b8aa5763a094b67`；Core 四节点 **0.1.160**，ccgateway 插件/Controller/Worker **0.1.60**。release `v0.1.160`，升级计划 `22d4715a46d5e171a3b2d8cd0f3e6f87` 完成 27 步。
- Controller 先升级并设置未来镜像为 0.1.60，再升级 Core。经正常管理 API 将归一后的 build 配置写回，21 号同步为 `ccgateway-app:0.1.60`、`CCG_REQUEST_MODE=build`，features 返回 `execution_modes:["request_build"]`。
- 21 号容器因模式迁移重建，原 `ccg-21-data` 卷、挂载与 API Key 配置保留；CLI 仍为 **2.1.302 / ccgateway-v7-request-modes**，哈希 `b14a537bbaa1218f23ba7347151f52fb29654af1101ed4b935507b6beb2dc9d8`，自动更新关闭。停止的历史账号未启动，共享出口的容器身份和启动时间未变。
- 四节点 ready HTTP 200，配置回读均为 build，实际前端 `CCGatewayView-BySpskJP.js` 与构建产物一致。Core SHA-256 为 `1b98651cdda558ca752d0639ed4785feb2a093d22e5036a785a11b642f8bbd9a`。签名配置沿用此前发布，其他 builtin 包字节与 trust 未改变。
- 真实公网 Messages 请求：`claude-opus-5-5` HTTP 200，4.38 秒，回答 `BUILD_21_OK`。用量日志确认 account_id=21、plugin_version=0.1.60。
- 本地官方 Windows CC **2.1.302** 经同一公网入口调用 `claude-opus-5-5`，9 秒完成一次 Read、两轮模型请求，正确读出本次插件版本 0.1.60 / grpc 并回答 `BUILD_TOOL_OK`。工具错误为 0，Git 状态和源码 diff 未变化；两次模型调用均由 21 号成功处理。
- 验证：控制台 ccgateway 198 项测试及类型检查、Controller 135 项、Core ccgateway/account、Linux Engine/Worker 全包回归通过。旧 native 模式的测试预期及模拟 CLI 已改为 build/request；定制 CLI 二进制未在本次重新修改。
- 私有备份：`~/sup2api-managed/backups/ccgateway-build-default-0.1.160/`，包括数据库 dump、21 号数据卷 tar、Controller 环境及容器基线；数据库恢复列表和卷归档可读取性已验证。构建记录位于 `~/sup2api-managed/stage/0.1.160/`。未对生产孤立资源执行清理。

脱敏证据见 [build 默认模式发布验证](build-default-deployment-0.1.160.json)。
