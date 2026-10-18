# CCGateway 账号运行环境生命周期

2026-10-19。适用于定制 CLI 2.1.302 所在的 ccgateway 架构；本次修改 Core、Controller 和控制台，不修改 CLI 补丁或 Worker 的授权协议。此文替代旧版“重新授权创建新容器、迁移并清空历史”的行为说明。

## 删除账号

删除账号时完整释放该运行环境的专属资源：app/egress 容器、net/uplink 网络、data 数据卷、Controller 账号状态目录及恢复备份。数据卷中的授权、历史会话和日志一起删除。共享出口只解除该账号的绑定，不删除共享网关、共享网络、镜像或 Controller。

Core 在账号软删除事务中调用可选接口 `AccountDeletionResource.MarkAccountDeleted`，将 `ccgateway_runtimes.retired_at` 设为当前时间，并保留 `account_id`。旧式数字 key 没有映射行时补建。这是持久化清理标记：标记写入失败，账号删除也回滚。无需数据库迁移。

账号删除事件及定期 reconcile 驱动清理。`deleted_at != NULL` 且关联运行环境带 `retired_at` 时，Core 检查 Controller 的 `runtime-cleanup-v1` 能力，再发送：

```http
DELETE /accounts/<runtime-key>
X-CCG-Delete-Account: <runtime-key>
X-CCG-Delete-Data: 1
```

Controller 验证精确资源名称及 `io.sup2api.ccgateway.account` 标签后删除。操作幂等；资源已不存在也成功。中途失败时保留剩余资源与 Core 标记，下轮重试。账号删除接口成功表示数据库删除及清理标记已提交，不代表 Docker 资源已经同步删除完毕。Controller 离线时需要等待恢复。

停用账号只阻断运行，不删除卷。升级前已删除、没有上述清理标记的历史账号，不会因新版 Core 启动而立即清空数据；由管理员执行下述孤立资源清理。旧重新授权产生的 `account_id = NULL` 退役行继续沿用历史清理规则。

## 原地重新授权

`POST /system/ccgateway/accounts/:id/reauthorize` 校验账号权限、类型、启用状态和原运行环境的 ready/revision，返回 `200 {key,in_place:true}`。兼容原 `authorization_mode` 请求字段，但不再创建草稿或迁移凭据。

控制台通过该账号的 `/session`、`/start`、`/complete`、`/cancel` 接口调用 Worker 现有 OAuth 流程。旧凭据显示已登录不等于本次授权完成；只有新的 callback 成功后，控制台才提交 `/reauthorize/:key/commit`。提交再次校验 key 仍为账号当前运行环境、实际登录状态及权限，然后复用已有账号状态重置逻辑清除错误、冷却、额度快照、最近测试和凭据刷新状态。

整个流程不更换 runtime key、容器或数据卷，保留历史会话。取消/关闭编辑器仅取消登录会话；若 `/start` 在窗口关闭后才返回，也取消该 session。手动停用的账号需先启用。原运行环境未就绪时返回 `runtime_not_ready`，先恢复或同步运行环境再授权。

## 清理孤立资源

设置页的“清理孤立资源”按钮需要 `settings:manage`，确认后调用 `POST /system/ccgateway/runtime/cleanup {}`。浏览器不提供账号名单，防止分页、权限可见范围或局部列表造成误删。

1. Core 向 Controller 请求 `GET /runtime/cleanup`，获得当前资源 key 和 identity。
2. Core 从数据库读取完整保留名单：所有未删除的 ccgateway 账号（包括停用账号）的当前 key、仍登记的未认领授权草稿，以及 70 分钟保护期内的历史退役运行环境。草稿即使超时也先保留，由已有带锁过期清理任务处理，避免与授权心跳竞争。
3. Core 发送 `POST /runtime/cleanup {keep_keys,candidates}`。Controller 先验证整个请求，再逐个加账号锁、重新计算 identity。名单内返回 `kept`；资源消失返回 `absent`；身份变化返回 `changed`，本轮跳过；孤立且未变更才完整删除。
4. 返回 `{results:[{key,status,reason?}],deleted,failed}`，失败项目不阻止其余项目，Core 记录审计。重新点击会重新扫描并重试。

identity 包括 Docker 资源 ID/创建或启动时间、账号目录、状态文件、备份和共享出口绑定。只剩专属卷、日志目录、备份或共享绑定也能发现。快照之后新建的运行环境不在本轮候选中；全量名单之后发生的资源变化由 identity 检查拦住。名称匹配但归属标签不匹配时拒绝删除。共享容器、其他应用资源和镜像不在候选范围。

Controller 端每个列表上限 20,000 项，此接口 body/response 上限 8 MiB，普通管理接口限额保持不变。Core 总时限 5 分钟；超时后重新执行可恢复。UI 显示删除及失败数量，明细由接口返回。

## 代码入口

- Core：`internal/account/handlers.go` 删除事务；`internal/ccgateway/cleanup.go` 清理标记、名单和 API；`accounts.go` reconcile；`reauth.go` 原地授权。
- Controller：`companions/controller/cleanup.py` 快照与批量清理；`manager.py` HTTP 路由及资源删除；`shared_egress.py` 解绑。
- 控制台：`AccountRuntimes.vue` 清理按钮；`CCGatewayAccountReauth.vue` 与 `CCGatewayAccountAuth.vue` 原地授权和会话取消。

## 发布与验证

本次源码实现尚未部署到生产。发布需更新 Controller、Core 和控制台；先更新支持 `runtime-cleanup-v1` 的 Controller，再更新全部 Core/控制台。旧 Controller 会明确报 `controller_outdated`，不会把仅删除容器误报成完整删除。Worker、CLI 不需要因本次生命周期功能另改协议。

验证包括 Controller 全套 133 项测试、控制台 ccgateway 目录 210 项测试、Core `internal/ccgateway` 与 `internal/account` 全包测试（OVH 独立测试 PostgreSQL），覆盖完整释放、保留名单超过 200 个账号、停用/草稿保护、资源身份变化、归属冲突、失败重试和原地授权。不使用生产数据库验证删除行为。

另在 OVH 以随机独立 `ccg-clean-*` 前缀创建临时 Docker 容器、网络及写有测试历史文件的数据卷，调用真实 Controller HTTP 删除/批量清理接口，确认完整删除、重复请求成功、保留名单及非归属资源不受影响。测试结束删除该前缀的所有测试资源；未对生产账号执行清理。最后补充的“只剩日志目录”用例另经清理模块回归验证。
