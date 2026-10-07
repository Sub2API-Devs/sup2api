# Worker 能力与策略版本实施进度（2026-10-08）

## 三类证据

1. 核心 `/system/ccgateway/features` 仍只是核心打包的源码目录，`runtime_verified=false`。
2. Worker 的 `GET /admin/features` 返回当前运行二进制编译信息、其自身源码目录和本地观测。`cli_version` 来自 Runtime 启动时实际 `claude --version` 的结果（通过 Health 读取已有值），不使用配置里的 CLI version 或镜像 tag。健康不代表所有特性 ready。
3. 账号／模型／Provider 的真实调用是独立证据。本接口不发模型请求，`model_provider_verification=not_run`，不编造通用 verified 状态。

返回契约在 `companions/contracts/features/runtime.go`：protocol_version=1、build、code_catalog、policy_schema_versions、runtime_probes、model_provider_verification。显式拒绝未来未知协议、缺少证据边界字段或未经作用域限定的 verified 声明；未知 JSON 字段不透传给管理端。

## 实施链路

- Worker 端点要求独立 admin Bearer key，空 key、模型调用 key、无 Bearer 前缀均拒绝；GET-only、no-store。版本默认 dev / unknown，不从镜像推断。Git buildinfo 有实际 revision 时采用；发布可用 Docker WORKER_VERSION / SOURCE_REVISION build args 或对应 `-X ccgateway/worker/internal/server.Version=...`、`.Revision=...` 注入。
- 控制器仅为 `/accounts/<key>/admin/features` 增加 GET 白名单；沿用管理密钥、revision 匹配与现存容器路由，不创建／更新容器。
- 核心 `/system/ccgateway/accounts/:id/features` 沿用账号权限与 ownership 限制，限时 5 秒、限制响应 128 KiB、投影已知契约。失败返回 unavailable，不 reconcile、不 ensure、不改 ready、不冷却、不自动升级。
- 前端每个功能展开详情中增加按账号查询，先点击再加载可访问账号；显示该 Worker 自身的功能声明和限制，而非套用核心源码目录。切换账号清空旧证据，晚到响应不串台。旧 Worker／控制器 404、无权限、网络失败只显示不可探测，不推定不支持或已支持。
- UI 账号选择使用已有授权账号列表接口的 q 搜索与每页20条分页。搜索回第一页，只保留当前页和已选账号，不全量拉取；翻页/搜索保留选择，旧请求响应丢弃。新增分页/搜索/选择保留测试通过。

## 策略版本

当前 schema_version=1，没有无故提高版本。旧 JSON 缺省兼容 v1，显式 null、0、字符串、非整数及未来版本拒绝。Worker 验证内部策略 header；core 保存反序列化及发送前均验证，UI 接受缺省或1。

核心本阶段只会发送已知的 v1 基础契约，不利用一次健康探测发送新版本。将来新增必须升版本的策略时，需要以目标 Worker 的 policy_schema_versions 为门槛再扩展发送器；当前未知版本会在 core 本地拒绝，因此不会静默发送给旧 Worker。此实现不是“任何新策略自动兼容旧 Worker”。旧 Worker 对新版功能实现的差异仍需读取其能力目录并明确展示。

## 验证

通过：

- contracts `go test ./features`：协议边界、缺省/无效策略版本、未知字段投影、禁止未限定 verified 声明。
- Worker `go test ./internal/server`：鉴权、GET-only、未探测不报告、实际版本与配置字段分离。
- engine `go test ./engine -run 'TestPolicySchema|TestRequestPolicyAdmission' -count=1`。
- core `go test ./internal/ccgateway -run 'TestRuntimeFeaturesRoutesRequirePermission|TestCoreRequestPolicySchema|TestFeatureCatalog' -count=1`（无需数据库）。
- Worker `GOWORK=off go list -mod=readonly -deps ./cmd/worker`：独立模块依赖可解析。
- web WorkerCapabilities / FeatureSupport / RequestPolicySettings / requestPolicy 四文件共24项测试，`npm run typecheck`。
- `git diff --check` 通过，仅已有 CRLF 提示。

新增待 Linux 环境运行：

- `TestAccountRuntimeOwnership` 增加 features：自有账号200、别人的账号404、全量 reader/admin 200、无权限403。
- controller `test_features_read_only_pass_through`：revision 检查、admin key、GET-only 与禁止 mutation 转发。本地 Windows Python 3.14 缺少 docker 模块，未通过导入；没有把此项记成通过。

未部署、未重启 #21/#22，未做浏览器视觉验收或真实模型验证。父 agent 负责后续集成和服务发布。

补充验证：WorkerCapabilities 三项测试（含服务端搜索、分页、保留选择）及 vue-tsc 通过。
