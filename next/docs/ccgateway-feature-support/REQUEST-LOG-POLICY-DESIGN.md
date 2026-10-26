# CCGateway 请求日志级别：默认规则 + 账号设置，随请求下发

2026-10-26 用户决定：CCGateway 配置里只放一条**默认日志规则**（普通配置项，不另存全局状态）；**账号可单独设置**；之后每次调度到某个账号，核心把该账号的生效级别随请求发给 Worker，Worker 照做。**核心不记录任何日志**，只决定级别。前置：[REQUEST-LOG-LEVELS-DESIGN.md](REQUEST-LOG-LEVELS-DESIGN.md)、[REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md](REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md)。

## 1. 规则

| 层 | 存在哪 | 可选值 |
|---|---|---|
| 默认规则 | CCGateway 配置（`Config.RequestLogs`，与镜像、请求策略同一份配置，“部署与运行”编辑） | `off`、`summary`、`full`（缺省 `off`，2026-10-27 起；full 于 2026-10-27 放开，见 REQUEST-LOG-ASYNC-DESIGN §6） |
| 账号设置 | 新表 `ccgateway_account_request_logs`（迁移 0061） | 不设置 = 跟随默认；`off`、`summary`；`full` 必须带时长 1/4/24 小时（存 `full_until`） |

生效级别 = 账号设置（`full` 且已过 `full_until` 视为没设置）否则默认规则。**`off` 只停止记录，不删除已有日志**；删除是单独的动作（第 4 节）。不做分组层。

## 2. 线上形状（`contracts/features.WorkerPolicy`，已加）

- 新字段 `request_log`：`off|summary|full`，空 = Worker 用自己本地的级别（手动调用、旧核心）。
- 新能力 `request_log_policy_v1`（Worker 在 `/healthz` 的能力里报告）。核心不把它列为必需能力：旧 Worker 忽略未知键，照本地级别记录。

## 3. Worker（`engine`）

- 请求带策略头且 `request_log` 非空时，本请求的日志级别就是它：`off` 不建日志目录；`summary` 只写摘要文件；`full` 写正文（仍受凭据安全模式、预算约束）。不读、不改本地 `request-logs.json` 的级别。
- 没有 `request_log`（无策略头或旧核心）时按本地级别，行为不变。
- 本地级别为 `off` 时不再阻止按策略记录，也不让查看接口回 409：查看（query/detail/read）只要有日志就能用。本地 `off` 的旧语义（立即删除）保留给旧核心的 `PUT {"level":"off"}` / `{"enabled":false}`。
- `PUT /admin/request-logs` 新增 `{"clear_all":true}`：删除该账号全部日志（摘要与正文），不改任何级别。原有 `{"clear_full":true}` 不变。
- `metadata.json` 新增 `log_level_source`：`policy`（来自核心）或 `local`。
- 日志开始的时机：现在 `capture` 在鉴权后、解析策略头之前；需要在 capture 前读出策略头的 `request_log`（只解析这一项也可以，非法策略头按本地级别记录并照常 400）。

## 4. 核心（`server/internal/ccgateway`）

- **迁移 0061** `ccgateway_account_request_logs(account_id bigint PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, level text NOT NULL CHECK (level IN ('off','summary','full')), full_until timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), updated_by bigint)`，`CHECK ((level='full') = (full_until IS NOT NULL))`。迁移须可重跑（CONTRACTS §43.7）。
- **配置**：`Config.RequestLogs *RequestLogDefault {Level string}`，保存时只接受 `off|summary`；缺省视为 `summary`。改动走现有配置保存与缓存失效。
- **下发**：`attachPolicy` 组装策略头时填 `request_log` = 生效级别（第 1 节）。账号设置走请求路径缓存（同 `requestAccountFeatures` 的 readThrough + 失效），保存后立刻失效；`full_until` 到期在组装时判断，不依赖缓存刷新。账号测试（probe）同样下发。
- **接口** `GET/PUT /system/ccgateway/accounts/:id/request-logs`（权限不变：`settings:manage` 或该账号编辑权限，`settings:read`/`account:read` 可读）：
  - GET 返回 `{"setting":{"level":"follow|off|summary|full","full_until":…},"default":"summary","effective":"summary","worker":{…Worker 状态原样：limits、usage、viewer、viewer_search…}}`；Worker 不可达时 `worker` 为 null，其余照常返回。
  - PUT `{"level":"follow"}`（删行）、`{"level":"off"|"summary"}`、`{"level":"full","full_for_hours":1|4|24}` 只写核心表，**不再转发给 Worker**；`{"clear_full":true}`、`{"clear_all":true}` 转发给 Worker。每次修改记审计（级别与到期时间）。
- **默认规则接口**：随 CCGateway 配置读写（`request_logs.level`），`settings:manage`。

## 5. 界面

- “部署与运行 → 账号容器”表格上方：**默认请求日志级别** `关闭 | 摘要`，旁注“N 个账号单独设置”。
- 账号行“请求调试日志”列：`跟随默认 | 关闭 | 摘要 | 完整`；跟随时显示当前生效值（如“跟随默认（摘要）”）；完整显示剩余时间，到期回到跟随默认。按钮：查看日志（n）、删除完整内容、**清空日志**（二次确认）。
- 说明文字改为：级别由核心随请求下发，关闭只停止记录、不删除已有日志。

## 6. 迁移与兼容

- 线上账号现在都是摘要：升级后表为空（全部跟随默认 = 摘要），行为不变。
- 新插件 + 旧核心：没有 `request_log`，按本地级别，行为不变。新核心 + 旧 Worker：旧 Worker 忽略 `request_log`，按升级前的本地级别，账号设置对它不起作用——所以**必须先发插件后发核心**。
- 发布：先插件后核心；核心带 schema 变化（0061），按带 schema 变化的流程签名（schema-before）。

## 7. 实现中确定的细节（2026-10-26）

- **资源请求也下发**：核心对资源请求（OAuth 资源身份路径）原来不带策略头，现在带只含 `{"request_log":"…"}` 的策略头（不能直接序列化 `WorkerPolicy`：它总会写出 `schema_version:0`，Worker 会拒绝）。Worker 的资源路径不解析策略头，只有日志入口读 `request_log`。
- **Worker 本地 off 的新语义**：启动时不再因本地 off 删除日志（否则按策略写的日志一重启就没了）；只有旧 Worker 留下的 `request-logs.disabled`（没有 json）删一次并改写成 json。查看接口不再因本地 off 回 409。旧核心的 `PUT {"level":"off"}`/`{"enabled":false}` 仍立即删除全部日志。
- **Worker 状态**多 `"clear_all": true`，表示支持清空日志；界面没有它（旧 Worker）时隐藏“清空日志”。Worker 状态里的 `level`/`enabled` 只是本地回退级别，核心把它放在 `worker` 子对象里，界面只按 `setting`/`effective` 显示级别。
- **完整到期**：核心 GET 在到期后仍返回 `setting.level=full` 与过去的 `full_until`，`effective` 已按默认算；界面按当前时间显示为跟随默认。Worker 对 full 不判断时长，到期完全由核心在组装策略头时判断。
- **默认规则保存**：随 `PUT /system/ccgateway/remote-config` 整份配置一起保存（`request_logs.level`），不触发运行环境同步，只让配置缓存失效。
- **账号软删除**：表行不随软删除消失，但已删除账号不再调度、PUT 回 400，行不再生效。
- `metadata.json` 的 `log_level_source` 为 `policy` 或 `local`；核心旧开关 `{"enabled":bool}` 回 400（界面随核心一起发布）。
