# CCGateway 账号运行环境生命周期

2026-10-19。适用于定制 CLI 2.1.302 所在的 ccgateway 架构；本次修改 Core、Controller 和控制台，不修改 CLI 补丁或 Worker 的授权协议。此文替代旧版“重新授权创建新容器、迁移并清空历史”的行为说明。

## 删除账号

> 2026-10-24 修订（未提交的工作树，ccgateway 0.1.87；契约见 CONTRACTS §49.14、§49.23）：删除时可选择立即清除或保留若干天后清除；控制器删除改为不留残留。

删除账号时完整释放该运行环境的专属资源：全部账号容器（app、egress，以及人工迁移留下的 `-app-rollback-*` 副本）、net/uplink 网络（连同子网和地址分配）、data 数据卷、Controller 账号状态目录及恢复备份。数据卷中的授权、历史会话和日志一起删除。共享出口只解除该账号的绑定，不删除共享网关、共享网络、镜像或 Controller。

**立即清除或保留。** 账号类型在 manifest 声明 `lifecycle.deletion.retentionDays`（1–30 天）时，删除可以选择保留：`DELETE /accounts/:id?retain_resources=1`。ccgateway 对 `managed` 与 `apikey` 都声明 3 天。不带参数为立即清除（默认）；其他取值，或类型没有声明保留，都回 400 `invalid_argument`，账号不被删除。保留期内运行环境被阻断：app 和 egress 容器停止但不删除，网络、数据卷、状态目录都保留，账号已删除、不接收请求。保留期内不能恢复账号（没有接口）。

Core 在账号软删除事务中调用 `AccountDeletionResource.MarkAccountDeleted(ctx, tx, id, options)`，将 `ccgateway_runtimes.retired_at` 设为当前时间、`purge_after` 设为当前时间（立即清除）或保留截止时间，并保留 `account_id`。旧式数字 key 没有映射行时补建。这是持久化清理标记：标记写入失败，账号删除也回滚。迁移 `0057_ccgateway_runtime_retention.sql` 增加可空列 `purge_after` 与 `purged_at`。卸载插件时也为其账号写清理标记，一律立即清除。

账号删除事件及每 60 秒一轮的 reconcile 驱动清理。`deleted_at != NULL`、关联运行环境带 `retired_at`、`purged_at` 为空且 `purge_after` 已到（或为空，旧版 Core 写的行）时，Core 检查 Controller 的 `runtime-cleanup-v1` 能力，再发送：

```http
DELETE /accounts/<runtime-key>
X-CCG-Delete-Account: <runtime-key>
X-CCG-Delete-Data: 1
```

成功后 Core 在同一事务写 `purged_at`，之后任何节点都不再处理它。保留期内的运行环境只会被阻断。

Controller 按 `io.sup2api.ccgateway.account` 标签加 `<前缀>-<key>-app|egress[-后缀]` 名字找出全部账号容器（不同前缀的另一个 Controller 实例的同 key 容器不算），网络和卷按精确名字并核对标签。删除前先检查：运行环境之外的容器仍连在它的网络上或挂着它的卷时回 409 `resource_in_use`，什么都不删（外来容器名写在 Controller 日志里）；同名资源标签不符时也不删。然后依次解除共享出口绑定、删容器、网络、卷、状态目录和备份，应答 `{"deleted":true,"removed":{containers,networks,volume}}`。操作幂等；资源已不存在也成功。失败时保留剩余资源与 Core 标记，下轮重试，节点记 WARN；删除事件投递不因此失败，账号生命周期同步状态记为 `failed`、`code` 为原因（如 `resource_in_use`）。账号删除接口成功表示数据库删除及清理标记已提交，不代表 Docker 资源已经同步删除完毕。Controller 离线时需要等待恢复。新 Controller 在 features 中报告 `runtime-purge-v2`，Core 不据此门控。

**保留列表。** `GET /system/ccgateway/runtimes/retained`（`settings:read`）列出还没清除的已删除账号运行环境 `{runtimes:[{key,account_id,account_name,account_type,deleted_at,purge_after,due}]}`（`due`：已到期、正在清除或清除一直失败）；`POST /system/ccgateway/runtimes/:key/purge`（`settings:manage`）把还在保留期的截止时间改为当前时间并立即 reconcile，对 `due` 的就是重试：202 已接受（清除在后台进行），404 没有这条运行环境，409 `runtime_not_retained`（账号未删除或已清除）。控制台在账号容器列表下方显示“待清理（已删除账号）”，保留中的行可“立即清理”，清理中的行可“重试清理”；账号删除对话框在类型声明了保留天数时提供“立即删除全部运行资源 / 保留 N 天后自动清理”两个选项。

**滚动升级。** 旧版 Core 不认 `purge_after` 和 `purged_at`：会立即清除保留中的运行环境，清除后每轮重复发送 DELETE，孤立资源清理也不保留它们。全部 Core 节点升级后再使用保留。

停用账号只阻断调度，不停止运行环境、不删除卷。升级前已删除、没有上述清理标记的历史账号，不会因新版 Core 启动而立即清空数据；由管理员执行下述孤立资源清理。旧重新授权产生的 `account_id = NULL` 退役行继续沿用历史清理规则（退役 70 分钟后删除）。

## 原地重新授权

`POST /system/ccgateway/accounts/:id/reauthorize` 校验账号权限、类型、启用状态和原运行环境的 ready/revision，返回 `200 {key,in_place:true}`。兼容原 `authorization_mode` 请求字段，但不再创建草稿或迁移凭据。

控制台通过该账号的 `/session`、`/start`、`/complete`、`/cancel` 接口调用 Worker 现有 OAuth 流程。旧凭据显示已登录不等于本次授权完成；只有新的 callback 成功后，控制台才提交 `/reauthorize/:key/commit`。提交再次校验 key 仍为账号当前运行环境、实际登录状态及权限，然后复用已有账号状态重置逻辑清除错误、冷却、额度快照、最近测试和凭据刷新状态。

整个流程不更换 runtime key、容器或数据卷，保留历史会话。取消/关闭编辑器仅取消登录会话；若 `/start` 在窗口关闭后才返回，也取消该 session。手动停用的账号需先启用。原运行环境未就绪时返回 `runtime_not_ready`，先恢复或同步运行环境再授权。

## 清理孤立资源

设置页的“清理孤立资源”按钮需要 `settings:manage`，确认后调用 `POST /system/ccgateway/runtime/cleanup {}`。浏览器不提供账号名单，防止分页、权限可见范围或局部列表造成误删。

1. Core 向 Controller 请求 `GET /runtime/cleanup`，获得当前资源 key 和 identity。
2. Core 从数据库读取完整保留名单：所有未删除的 ccgateway 账号（包括停用账号）的当前 key、仍登记的未认领授权草稿、70 分钟保护期内的历史退役运行环境，以及保留期内（尚未清除）的已删除账号运行环境。草稿即使超时也先保留，由已有带锁过期清理任务处理，避免与授权心跳竞争。
3. Core 发送 `POST /runtime/cleanup {keep_keys,candidates}`。Controller 先验证整个请求，再逐个加账号锁、重新计算 identity。名单内返回 `kept`；资源消失返回 `absent`；身份变化返回 `changed`，本轮跳过；孤立且未变更才完整删除。
4. 返回 `{results:[{key,status,reason?}],deleted,failed}`，失败项目不阻止其余项目，Core 记录审计。重新点击会重新扫描并重试。

identity 包括 Docker 资源 ID/创建或启动时间、账号目录、状态文件、备份和共享出口绑定，也包括人工迁移留下的回滚副本容器。只剩专属卷、日志目录、备份、共享绑定或回滚副本容器也能发现。快照之后新建的运行环境不在本轮候选中；全量名单之后发生的资源变化由 identity 检查拦住。名称匹配但归属标签不匹配时拒绝删除；有外来容器占用网络或卷的项目返回 `failed`、`reason: resource_in_use`。共享容器、其他应用资源和镜像不在候选范围。

Controller 端每个列表上限 20,000 项，此接口 body/response 上限 8 MiB，普通管理接口限额保持不变。Core 总时限 5 分钟；超时后重新执行可恢复。UI 显示删除及失败数量，明细由接口返回。

## 代码入口

- Core：`internal/account/handlers.go` 删除事务与 `retain_resources`；`internal/account/purge.go` 保留天数与卸载插件时的清理标记；`internal/ccgateway/cleanup.go` 清理标记、清除、名单、保留列表与提前清除 API；`accounts.go` reconcile；`reauth.go` 原地授权；迁移 `0057_ccgateway_runtime_retention.sql`。
- Controller：`companions/controller/cleanup.py` 快照与批量清理；`manager.py` 资源删除；`http_api.py` HTTP 路由；`shared_egress.py` 解绑。
- 控制台：`AccountRuntimes.vue` 清理按钮；`RetainedRuntimes.vue` 保留列表；`accounts/AccountDeleteDialog.vue` 删除选项；`CCGatewayAccountReauth.vue` 与 `CCGatewayAccountAuth.vue` 原地授权和会话取消。

## 发布与验证

2026-10-19 已部署到 OVH：先更新支持 `runtime-cleanup-v1` 的 Controller，再通过正常升级流程更新全部 Core/控制台。旧 Controller 会明确报 `controller_outdated`，不会把仅删除容器误报成完整删除。Worker、CLI 不需要因本次生命周期功能另改协议。

验证包括 Controller 全套 133 项测试、控制台 ccgateway 目录 210 项测试、Core `internal/ccgateway` 与 `internal/account` 全包测试（OVH 独立测试 PostgreSQL），覆盖完整释放、保留名单超过 200 个账号、停用/草稿保护、资源身份变化、归属冲突、失败重试和原地授权。不使用生产数据库验证删除行为。

另在 OVH 以随机独立 `ccg-clean-*` 前缀创建临时 Docker 容器、网络及写有测试历史文件的数据卷，调用真实 Controller HTTP 删除/批量清理接口，确认完整删除、重复请求成功、保留名单及非归属资源不受影响。测试结束删除该前缀的所有测试资源；未对生产账号执行清理。最后补充的“只剩日志目录”用例另经清理模块回归验证。

### OVH 正式发布与模型验收（2026-10-19，北京时间）

- 源码 `f8d0dbab3de653ef68d69504bf048b79d515e5de`，Core 四节点 **0.1.159**，ccgateway 插件、Controller 和当前 21 号 Worker 程序 **0.1.59**。CLI 仍固定 **2.1.302 / ccgateway-v7-request-modes**，保持 native 模式、禁用自动更新。
- 签名发布 `v0.1.159`，升级计划 `37248494a71c9aa2c303e82b5af5d438` 完成全部 27 步。四节点 Core SHA-256 均为 `cdd6af1b24d698cff6a042584edaee9fa992263c2167bc56df921e9a86f30f48`；ready HTTP 200，实际前端 `CCGatewayView-CXaa6FTx.js` 与构建产物匹配。
- Controller 使用新镜像，管理接口已报告 `runtime-cleanup-v1`。Core 新清理接口实测拒绝浏览器提供的局部保留名单（HTTP 400），没有执行生产孤立资源清理。插件验签继续沿用既有关闭配置；Core 发布签名仍正常验证，其他 builtin 包及 trust 文件字节未改。
- 21 号通过正式接口原地更新 Worker 程序到 0.1.59，容器 ID、挂载及授权数据保留；Docker 原创建镜像标签仍为 `ccgateway-app:0.1.58`，不能用该标签判断容器内程序版本。Worker SHA-256 为 `c0db81dff78a67c3587c9b7380192192b7f4891c7fbc2c84b189eeb84e285afc`，features 显示新源码 revision、`modified:false`。未来新容器默认 app/egress/Controller 镜像均为 0.1.59。
- 批量 Worker 更新时，20 号及已删除的 23 号没有容器，结果为 `not_found`；其余停止的历史账号返回 `not_running`，未启动或重建。共享出口身份和启动时间未变。
- 使用用户提供的公网入口 `http://15.204.107.38:3130/v1/messages` 和 Key 调用 `claude-opus-5-5`：HTTP 200，约 6 秒，响应 `CCGATEWAY_21_OK`，57 input tokens / 15 output tokens。用量日志确认 account_id=21、plugin_version=0.1.59、upstream_model=claude-opus-5-5、success=true；request_id 为 `8f60a4502793eebab84f397a`。不保存 Key。
- 私有恢复材料：`~/sup2api-managed/backups/ccgateway-lifecycle-0.1.159/`，包含 PostgreSQL dump（恢复列表验证通过）、容器基线、Controller 配置/环境、Worker 更新报告。全量 Controller tar 可读取，但打包时目录存在并发变化，因此另存原子配置文件快照，不把该 tar 宣称为停机一致性快照。构建日志在 `~/sup2api-managed/stage/0.1.159/`。

脱敏机器记录见 [正式发布验证](lifecycle-deployment-0.1.159.json)。
