# CCGateway 审核 01：账号生命周期（前端 → 核心管理 API → 控制器 → 容器）

审核日期 2026-10-21，分支 `feat/next-platform`，HEAD `43d576838`。只读审核，未修改源码。

## 1. 范围与方法

范围：

- 前端：`next/web/src/views/ccgateway/`（CCGatewayAccountAuth.vue、CCGatewayAccountReauth.vue、ccgAuthFlow.ts、ccgReauth.ts、credentialStatus.ts、CredentialStatusNotice.vue、AccountRuntimes.vue、validation.ts、ccgApi.ts、ccgError.ts），通用账号编辑器 `next/web/src/views/accounts/AccountEditor.vue`、AccountsView.vue；插件表单 `next/plugins/ccgateway/forms/*.json`、manifest.json。
- 核心：`next/server/internal/ccgateway/`（accounts.go、drafts.go、lifecycle.go、reauth.go、auth_status.go、token_refresh.go、cleanup.go、sweep.go、workers.go、http.go、errors.go、result.go、client.go 中请求路径与 not_synchronized 部分）；通用账号服务 `next/server/internal/account/`（handlers.go 创建/更新/删除、preparations.go、preparation_cleanup.go、lifecycle_events.go、lifecycle_status.go、ccgateway.go、actions.go、purge.go、quota_refresh.go 中与生命周期状态相关部分）；事件投递 `next/server/internal/event/delivery/`；插件侧 `next/plugins/ccgateway/internal/ccgateway/{lifecycle,ccgateway,models}.go`。
- 控制器：`next/plugins/ccgateway/companions/controller/manager.py`（apply/provision/block/delete/migrate_auth/public/runtimes/update_worker/HTTP 路由）、cleanup.py；Worker 授权 `companions/engine/auth.go`。

方法：

- 按"创建（准备 → 授权 → 保存）、编辑、停用/启用、删除、重新授权、刷新令牌、清理"逐条走读代码链路，对照 CONTRACTS 与 README 描述。
- 用 Grep / WarpGrep / CodeGraph 交叉定位调用点（所有 `MarkAccountDeleted`、`putConfig`、`saveLifecycleStatus`、`account_lifecycle_sync` 写入点）。
- 用一个临时前端测试（`zz-audit-lifecycle.spec.ts`，已删除）验证了 F2：编辑一个 ccgateway managed 账号、不改凭据直接保存时，PATCH 请求体包含 `credentials`、`settings`、`proxy_id`。
- 按要求没有运行需要 PostgreSQL 的 next/server 测试。需要 PG 的复现步骤写在各条发现里。

## 2. 链路说明（简短）

**新建 OAuth（managed）账号**（manifest `lifecycle.preparation=true, required=true`）：

1. 编辑器 `CCGatewayAccountAuth`（draft 模式）`POST /account-types/ccgateway/managed/preparations {proxy_id, settings, idempotency_key}`。
2. 核心 `createPreparation`：写 `account_preparations`，调插件 `prepare` 回调，然后 `ccgateway.PrepareAccount`：写 `ccgateway_runtimes(key=d…, initial_settings)` 并 `Kick`。
3. `reconcileKicked` → `Reconcile` → 控制器 `PUT /accounts/<key>/config`。`apply` 同步完成以下步骤后才返回 200：provision → egress → nft helper → 代理探测 → ready。
4. 前端每 2 s 轮询 `GET /account-preparations/:key/status|health`（`AccountPreparationAction`），容器 ready 后自动 `start` 拿登录链接，用户粘贴 `code#state` 后 `complete`，再轮询 `health.logged_in`。
5. 保存时 `POST /accounts {preparation_key}`，依次执行：`checkPreparationForCreate`（代理与设置必须一致）→ `CheckAccountPreparation`（runtime 已登录）→ 在插入事务里 `adoptPreparation` + `AdoptDraft`（`ccgateway_runtimes.account_id = id`）→ `markLifecyclePending` → 发 `account.created` 事件。
6. 事件投递（`lifecycleEvents.OnEvents`，单节点持锁、BatchSize 1、20 s 超时）→ `deliverAccountLifecycle` → `ReconcileAccount` + `AccountSynchronization` → 写 `account_lifecycle_sync`。另外 `Run` 每 60 s 对全部 runtime key 做一遍 `Reconcile`。

**API Key 账号**：没有准备阶段，`POST /accounts` 后只靠 `account.created` 事件和 60 s 对账来创建容器。

**编辑**：`PATCH /accounts/:id` → 发 `before_update` → 写库 → `markLifecyclePending` → 发 `account.updated` 事件 → 同上的投递链路。`kickCCGateway` 对有 lifecycle 的类型直接返回（`account/ccgateway.go:86-88`），所以账号变更不走 Kick 重试路径。

**停用**：自 50da2ceac 起，desired 的 `enabled = !deleted`。账号状态、代理状态都不进 revision，runtime 照常运行（`accounts.go:131-146`）。

**删除**：`DELETE /accounts/:id` 先软删，再 `MarkAccountDeleted`（把附着行的 `retired_at` 设成 now，表示请求清除）→ 事件 / 60 s 对账 → `Reconcile` → `purgeRuntime` → 控制器 `DELETE /accounts/<key>`（带 `X-CCG-Delete-Account` + `X-CCG-Delete-Data: 1`），删除容器、网络、卷、状态目录和备份。

**重新授权**（原地）：`POST /system/ccgateway/accounts/:id/reauthorize` 只检查现有 runtime 是否 ready 并返回 key。前端在同一个容器里 start/complete（Worker 在 complete 时才替换凭据），然后 `POST …/reauthorize/:key/commit`（`CommitReauth`：确认已登录、重置错误/冷却/额度状态）。

**清理**：`POST /system/ccgateway/runtime/cleanup`：控制器先给出 inventory，核心再给出权威 keep 列表（未删除账号 + 未收养草稿 + 宽限期内的 retired 行），控制器按 identity 快照比对后删除其余资源。

## 3. 发现表（按严重度）

| # | 严重度 | 标题 | 置信度 |
|---|---|---|---|
| F1 | P1 | `account_lifecycle_sync` 只在事件投递时写入、没有自愈路径。锁竞争、超时、`updated_at` 漂移、死信之后会永久停在 pending/failed，额度自动刷新被跳过、手动刷新返回 409 | 很可能 |
| F2 | P1 | 编辑器每次保存都带 `credentials`，核心用随机 nonce 重新加密，`credentials_enc` 变化 → revision 变化 → 每次保存都触发 runtime 重新激活，期间新请求得到 409 not_synchronized | 确认 |
| F3 | P2 | 删除后 purge 失败（控制器过旧 / 不可达 / 清理失败）时不会退回到"停止"：已删除账号的容器一直运行；purge 成功后也没有终态，每个节点会反复 purge | 确认 |
| F4 | P2 | 插件卸载时批量删除（`PurgePluginAccounts`）不写删除意图：容器只被停止，数据卷和 OAuth 凭据留在宿主机上，与单个删除的语义不一致 | 确认 |
| F5 | P2 | 生命周期事件调用超时只有 20 s，比控制器 apply 的正常耗时短；单个账号失败会队头阻塞同插件的所有账号事件（退避最长约 13.5 min 后才死信） | 很可能 |
| F6 | P2 | 自动模型模式下，存量 `auto_models IS NULL` 的账号在任意 PATCH（含仅改状态）或 GET health 触发订阅变化时，手工模型列表被覆盖 | 存疑（契约如此，需确认是否接受） |
| F7 | P3 | 草稿（准备）的代理被删除或不可用时，状态永远显示"creating"，前端无原因、无出口 | 确认 |
| F8 | P3 | `Reconcile` 先检查 `ProxyUnusable` 再检查删除：已删除且代理不可用的账号永远不会被停止或清除 | 确认（触发条件理论化） |
| F9 | P3 | 前端原因白名单缺 `runtime_not_ready` / `runtime_cleanup_failed`（译文已存在却用不上）；核心 `reasonMessages` 也缺 `runtime_not_ready` | 确认 |
| F10 | P3 | AccountRuntimes：最多只显示 200 个账号；卸载后不取消请求；"刷新授权"按钮对只读用户可见；该动作实际上什么都没启动，toast 却提示"已启动"，失败原因被吞 | 确认 |
| F11 | P3 | 准备流程：`updatePreparation` 不 Kick；`sweepPreparations` 遇到第一个错误就返回，存在队头阻塞；cancelled/adopted 行永不删除 | 确认 |
| F12 | P3 | 旧接口 `ccgateway_runtime` + `/system/ccgateway/drafts` 仍可绕过准备流程的代理/设置一致性校验 | 确认 |
| F13 | P3 | GET 有副作用 / 读权限过宽：`GET …/health` 会写 subscription_type 并可能触发自动模型改写；`settings:read` 能读到他人进行中的 OAuth 链接 | 存疑 |
| F14 | P3 | 文档、注释、文案与 50da2ceac 之后的行为不一致（停用会阻断、必须绑定代理、草稿换 runtime 等） | 确认 |
| F15 | P3 | 删除确认框是通用文案，没有提示会不可逆地清除容器数据和 OAuth 凭据；`adopt()` 在 POST 返回后才调用 | 确认 |
| F16 | P3 | `CommitReauth` 持有账号行 `FOR UPDATE` 和 advisory 锁期间做 runtime HTTP 调用 | 确认 |

## 4. 发现详述

### F1（P1，很可能）生命周期同步状态没有自愈，额度刷新可能被永久阻塞

**证据**

- `account_lifecycle_sync` 的全部写入点只有三处：`markLifecyclePending`（`next/server/internal/account/lifecycle_status.go:11-17`）、`saveLifecycleStatus`（同文件 `:19-22`，只被 `lifecycle_events.go:115/121/135` 调用）、代理变更（`next/server/internal/proxy/proxy.go:781`，也是置 pending）。60 s 对账（`ccgateway/accounts.go:523-558`）和 Kick 重试（`:461-486`）都不更新它。
- `deliverAccountLifecycle`（`next/server/internal/account/lifecycle_events.go:90-139`）调用 `ReconcileAccount` 后立刻读 `AccountSynchronization`，结果原样保存。
- `Reconcile` 用 `pg_try_advisory_xact_lock`，拿不到锁时**返回 nil**（`ccgateway/accounts.go:328-334`）。持锁方可能是别的节点的 60 s 对账、请求路径 `notSynchronized()` 触发的 Kick（`client.go:180-188`），或正在 apply 旧 desired 的一方。这种情况下 `AccountSynchronization` 读到的是旧 revision，于是保存 `pending/runtime_pending`，事件也被确认（ack）。
- `saveLifecycleStatus` 带条件 `accounts.updated_at=$4 AND generation=$5`（`lifecycle_status.go:20`）。`automatic_state.go:124/177`（自动禁用/恢复）、`account_patch.go:110` 等会改 `updated_at`。如果在 `scanRow` 和保存之间发生这类写入，本次保存静默落空，表里保留 `markLifecyclePending` 写的 pending。
- 事件调用超时默认 20 s（`event/delivery/delivery.go:61`），见 F5。失败会保存 `failed/runtime_sync_failed`；连续 10 次失败后事件进死信（`worker.go:273-294`），状态就永久停在 failed。
- 影响面：`lifecycleQuotaReady`（`account/quota_refresh.go:43`）要求 `applied`。自动刷新的 SQL 用 `NOT EXISTS(... NOT lifecycleQuotaReady)` 排除这些账号（`:265`），手动刷新返回 409 `runtime_not_ready`（`:48-62`）。编辑器会显示"同步中/失败"（`AccountEditor.vue:675-677`）。

**触发场景**

1. 多节点（线上 4 节点），用户在编辑器里改了账号的代理。事件投递节点 A 执行 `Reconcile` 时，节点 B 恰好在 60 s 对账里持有该 key 的锁，或者请求路径因为 revision 不一致刚 Kick 了 B。A 拿不到锁，返回 nil，读到旧 revision，保存 pending。B 随后把 runtime 配好，但没有人回写 `applied`。
2. API Key 账号首次创建时 apply 超过 20 s，或者代理探测失败：状态变成 failed，最终死信。

**影响**：账号的 runtime 实际已经正常服务，但额度一直不刷新、手动刷新被拒，状态展示也错误。只有下一次修改账号、或者有任意 `account.*` 事件（例如状态变更）恰好成功投递，才会恢复。

**修复建议**

- 在 `Run` 的 60 s 对账里，对 `account_lifecycle_sync.status <> 'applied'` 的账号重新执行 `AccountSynchronization` 并回写。回写时带 generation 条件，但不要用 `updated_at` 条件，或者改成只比较 generation。
- 或者在生命周期路径里用阻塞锁（`lockSQL`）加有界上下文，而不是 try-lock。
- `saveLifecycleStatus` 落空时（RowsAffected=0 且 generation 未变）应重读后重试，而不是静默放弃。

**复现（需 PG）**：在 `account` 包测试里，先另开事务持有 `pg_advisory_xact_lock(hashtextextended('ccg-account:'||id,0))`；让 fake controller 的 status 返回旧 revision；调用 `deliverAccountLifecycle`；断言 `account_lifecycle_sync.status='pending'`；释放锁并调用 `Reconcile` 后状态仍为 pending。

### F2（P1，确认）编辑器每次保存都会重新加密凭据，导致 runtime 重新激活

**证据**

- 编辑时请求体总是带 `credentials`：`next/web/src/views/accounts/AccountEditor.vue:549`（`if (props.accountType && !props.account?.orphaned) body.credentials = creds`）。managed 账号的 creds 是 `{}`，apikey 是掩码后的对象。临时 vitest 已验证：不改任何字段直接保存，PATCH 体就包含 `credentials`、`settings`、`proxy_id`。
- 核心只要 `hasCredentials()` 为真就走 `prepare`，重新加密（`next/server/internal/account/handlers.go:1137-1159`），并写入 `credentials_enc = COALESCE($10, credentials_enc)`（`:1264`）。
- `Cipher.Encrypt` 每次使用随机 nonce（`next/server/internal/secret/secret.go:37-45`），同一明文每次得到不同的密文。
- revision 的输入包含 `encode(a.credentials_enc,'hex')`（`next/server/internal/ccgateway/accounts.go:135`）。
- 控制器收到新 revision 后：fingerprint 不变，所以不重建 app 容器。但会 `online.pop`、置 `syncing`、跑 sing-box check 一次性容器、跑 nft helper 一次性容器、等待 egress 端口最多约 6 s、走代理探测最多 10 s（`manager.py:791-834, 837-868`）。期间 `connection()` 返回 None。
- 这段时间里新请求在 `forwardAttempt` 得到 409 `not_synchronized` 并触发 Kick（`ccgateway/client.go:180-188, 203-206`）。

**触发**：在账号编辑器里改名称、优先级、分组、模型等任意字段后保存，ccgateway managed 和 apikey 两种账号都会触发。只调用 `PATCH {status}` 的列表开关不带 credentials，不受影响。

**影响**

- 每次保存都有一段数秒到十几秒的服务间隙；只要代理略慢就更长。
- 每次保存都额外起 2 个一次性容器，并走一次外网探测。
- 放大了 F1 的竞争窗口：请求路径的 Kick 与事件投递争抢同一把锁。
- `apikey.ui.json` 的中文帮助说"修改凭证会重建此账号容器"，用户不会预期"改名称"也会打断服务。

**修复建议**

- 前端：编辑时只在凭据表单脏了的时候才发送 `credentials`；managed 账号永不发送。
- 核心：在 `prepare` 之后比较新旧明文，相同就保留原 `credentials_enc`（`p = nil`）。
- 或者 revision 改为基于明文哈希（带 salt 的 HMAC），不再依赖密文。

**复现（需 PG）**：创建 ccgateway managed 账号并 `Reconcile`，记录 PUT 的 revision；`PATCH /accounts/:id {"name":"x","credentials":{}}`；再 `Reconcile`；断言第二次 PUT 的 revision 与第一次不同（当前实现会不同）。

### F3（P2，确认）删除清理失败时不退回到停止；清理成功后也没有终态

**证据**

- `Reconcile` 在 `d.Deleted && d.PurgeRequested` 时只调用 `purgeRuntime`，失败就直接 `return e`，不会走 `putConfig(enabled=false)`（`ccgateway/accounts.go:345-350`）。
- `purgeRuntime` 需要 `cleanupConfig`：控制器必须健康，且声明 `runtime-cleanup-v1`（`ccgateway/cleanup.go:52-68`）。否则持续返回 `controller_outdated` 或不可达错误。
- `purge` 成功后行仍然保留：`sweepRetired` 只处理 `account_id IS NULL`（`sweep.go:131`），`runtimeKeys` 永远包含所有已删除账号（`accounts.go:497-502`）。`blockedFor=10min`，而 `forgetBlocked()` 在**每次** Kick 时清空整个 map（`accounts.go:393-397, 449-451`）。Kick 来自草稿操作、请求路径的 not_synchronized、`reconcileKicked` 的失败重试（每 5 s 一次）。
- 测试 `cleanup_test.go:14-72` 只覆盖"清除失败时报错、之后重试成功"，没有覆盖"失败期间容器是否被停止"。

**影响**

- 控制器较旧，或清理接口持续失败时（例如 `resource ownership mismatch` 会在 `manager.py:946-947` 抛错），已删除账号的 app/egress 容器会一直运行，数据卷里的 OAuth 凭据也一直在线。50da2ceac 之前，删除至少会把容器停掉。
- 已删除账号会无限累积。每个节点大约每 10 分钟（有 Kick 时每 60 s）对每个已删除账号做一次 `/health` 加一次 `DELETE`；4 节点乘以历史删除数，开销持续增长。

**修复建议**

- purge 失败时先 `putConfig(enabled=false)` 停止，再返回错误。
- purge 成功后给行写一个终态（例如 `purged_at`），让 `runtimeKeys` 和 `Reconcile` 跳过。
- `forgetBlocked` 只清除被 Kick 的那个 key。

### F4（P2，确认）插件卸载时的批量删除不写删除意图

**证据**

- 单个删除会调用 `MarkAccountDeleted`（`account/handlers.go:1437-1445`）。
- `PurgePluginAccounts` 只做软删、删分组、发事件（`account/purge.go:25-54`），没有调用 `AccountDeletionResource`。
- 结果 `PurgeRequested=false`，`Reconcile` 只会 PUT `enabled=false` 让控制器 `block()` 停止容器（`accounts.go:365`、`manager.py:915-926`），卷和状态保留。
- `cleanup.go:20-23` 的注释与测试 `cleanup_test.go:47-55`（"historical deletion purged without an explicit cleanup job"）说明这类删除只能靠手动清理。

**影响**：卸载 ccgateway 插件并清除账号后，所有 Claude OAuth 凭据卷仍留在 Docker 宿主机上。而且插件卸载后，"清理孤儿资源"的按钮还在不在 UI 上取决于插件页是否可用，这一点未验证。

**修复建议**：`PurgePluginAccounts` 在同一事务里对每个账号调用对应插件的 `AccountDeletionResource.MarkAccountDeleted`（ccgateway 走内建 `s.d.CCGateway`）。如果确实想保留数据，应在卸载确认框里明确告知。

### F5（P2，很可能）生命周期事件超时 20 s，并且会队头阻塞

**证据**

- 投递 Options 没有覆盖默认值（`app/app.go:366`），`CallTimeout=20s`（`event/delivery/delivery.go:61`）。`ReconcileAccount` 和控制器 PUT 都在这个上下文里执行（`lifecycle_events.go:128`）。
- 控制器 apply 是同步的。新容器路径包括 ensure_image（可能拉取镜像）、check_business_image、resolve_profile、verify_disk_quota、多个一次性容器、egress 等待、10 s 探测（`manager.py:595-747, 749-868`）。正常情况下很容易超过 20 s。
- 单插件单游标、BatchSize 1，失败按 1 s、2 s … 5 min 退避，第 10 次进死信（`worker.go:265-305`、`delivery.go:72-76`）。合计约 1+2+4+…+256+300 ≈ 811 s。
- 对有 lifecycle 的类型，`kickCCGateway` 直接返回（`account/ccgateway.go:86-88`），带 12 次重试的 Kick 路径不参与账号变更。

**影响**

- 一个代理坏掉的账号（探测失败 → 503 `runtime_unavailable`）每次被编辑，都会让同插件后续所有账号的 created/updated/deleted 事件等待约 13.5 分钟。这段时间里新账号的 runtime 只能靠 60 s 对账建出来，但它们的生命周期状态一直是 pending（叠加 F1）。
- 首次创建的 API Key 账号常常先显示 failed，退避重试几次后才变成 applied。

**修复建议**：事件处理里只做"标记 + 入队"，让后台带 90 s 超时的 Kick 执行 Reconcile，完成后回写状态。或者给生命周期订阅单独配置更长的 CallTimeout；对单个账号的永久性失败尽快写 failed 并 ack，不要阻塞后续事件。

### F6（P2，存疑）存量 `auto_models IS NULL` 账号的手工模型列表会被覆盖

**证据**

- 迁移 0055 新增的列默认为 NULL。插件 `subscriptionModels` 规定只要不是显式 false 就返回内置列表补丁（`plugins/ccgateway/internal/ccgateway/models.go:31-45`）。
- `before_update` 对**任何** PATCH 都会调用（`account/handlers.go:1188-1209`），包括列表页只改状态的 PATCH。
- 前端 `autoModels.value = a?.auto_models ?? true`，保存时 `setModels(defaultModels)`（`AccountEditor.vue:417, 530`）。
- `GET …/health` 观察到订阅变化时会触发 `SubscriptionChanged` 重新算模型（CONTRACTS 4089 行，`ccgateway/accounts.go:741-749`）。

**说明**：CONTRACTS 4088/4102 明确写了"NULL = 自动，用户列表被覆盖"，所以这是设计决定，不是实现偏差。但对 0055 之前就手工维护了模型列表的账号，任何一次无关编辑都会丢失列表，而且没有提示。建议确认这一点是否被接受。如果不接受，可以在迁移里把"模型列表与当时默认值不同"的存量账号标成 `auto_models=false`。

### F7（P3，确认）草稿代理不可用时状态永远是"creating"

**证据**

- 删除代理时只检查仍在使用的账号（`proxy/proxy.go:666`），不检查草稿和准备记录。`account_preparations.proxy_id` 是 `ON DELETE SET NULL`（迁移 0051），`ccgateway_runtimes.proxy_id` 没有外键。
- 草稿变成 `ProxyUnusable` 后，`Reconcile` 直接返回（`accounts.go:342-344`）。`AccountPreparationAction` 的 status 分支和 `serveStatus` 的草稿分支都不检查 `unavailable()`，只回 `creating`（`ccgateway/lifecycle.go:82-96`、`accounts.go:837-843`）。

**影响**：用户看到"容器准备中"一直转圈，看不到原因。重新选择代理可以恢复。

**建议**：草稿的 status 在 `ProxyUnusable` 时返回 `blocked` 并带 `reason: proxy_unavailable`，前端已支持 `isProxyReason`。

### F8（P3，确认）检查顺序：`ProxyUnusable` 先于"已删除"

`accounts.go:339-350`：`if d.ProxyUnusable { return nil }` 位于 `if d.Deleted && d.PurgeRequested` 之前，所以已删除且代理不可用的账号永远不会被清除或停止。对账号而言，这要求代理协议被改成不支持的值（API 只允许 http/https/socks5，`proxy.go:456`），目前基本只能通过直接改库触发。建议把删除分支放到最前面，因为删除不需要代理。

### F9（P3，确认）原因码白名单与译文不同步

- `CCG_REASONS`（`next/web/src/views/ccgateway/ccgAuthFlow.ts:40-108`）没有 `runtime_not_ready` 和 `runtime_cleanup_failed`，但 `zh/en ccgateway.ts:335-336` 有对应译文。比对脚本结果："i18n 有、白名单无"的只有这两个。
- `ReauthDraft` 返回 `runtime_not_ready`（`ccgateway/reauth.go:46`），核心的 `reasonMessages` 里也没有这一项，消息退化为 `ErrUnavailable` 的通用文案。前端 `reasonDisplay` 因此显示通用英文文案，而不是"原账号容器尚未就绪，请先同步运行环境再重新授权"。
- Worker 和 `RefreshToken` 的 `not_logged_in`、`token_revoked`、`auth_in_progress`、`refresh_failed`，控制器的 `cli_maintenance_busy`、`cli_profile_unavailable`、`container_changed` 也不在白名单里。

**建议**：白名单由 i18n 键生成，或在 `ccgAuthFlow.spec.ts` 里加反向断言（i18n 的 reason 键必须都在白名单中）；同时补上核心的 `reasonMessages`。

### F10（P3，确认）AccountRuntimes 页的问题

- `page_size: 200` 是硬上限，超过 200 个账号时后面的不显示（`AccountRuntimes.vue:108`）。
- 组件卸载后 `runPool` 继续对每一行发 3 到 4 个请求，没有中止或卸载检查（`:104-118`）。
- `canAccounts` 包含 `account:read`（`:61`），所以只读用户也能看到"刷新授权"按钮（`:239`），点了会得到 403。
- `refresh_auth` 在 lifecycle 路径上只做就绪检查（`ccgateway/lifecycle.go:134-147` → `reauth.go:18-49`），没有启动任何东西；跳转到编辑器后用户还要再点一次"重新授权"，而 toast 提示的是"已启动重新授权"（`zh ccgateway.ts:396`）。`catch` 吞掉了 `runtime_not_ready` 等原因（`:184-190`）。
- `actions.go:90-132` 里的旧 `handleCCGatewayRefreshAuth` 对 lifecycle 类型永远走不到，是死代码。

### F11（P3，确认）准备流程的健壮性

- `updatePreparation` 改完代理后用 `AccountPreparationAction("sync")` 做同步对账（`account/preparations.go:251-253`）。对账用 try-lock，锁忙时直接成功返回，也没有 `Kick`，新代理要等到下一轮 60 s 对账才生效。旧接口 `draftUpdate` 会 Kick（`ccgateway/drafts.go:207`）。
- `sweepPreparations` 按 `ORDER BY created_at LIMIT 20` 取，遇到第一个错误就 `return err`（`account/preparation_cleanup.go:40-64`）。插件被移除后，`preparationResource` 永远报错，最早的那批行会永久挡住其它过期准备的清理。
- 状态为 `cancelled` / `adopted` 的 `account_preparations` 行从不删除，表只增不减。

### F12（P3，确认）旧草稿接口可以绕过准备流程的一致性校验

`checkPreparationForCreate` 允许用 `ccgateway_runtime` 代替 `preparation_key`（`account/preparations.go:333`）。`checkCCGatewayRuntime` 只检查已登录（`account/ccgateway.go:99-111`），不比对草稿代理与账号代理，也不比对 locale/timezone。直接调 API 的人可以用代理 A 授权、用代理 B 保存，登录 IP 和使用 IP 就不一致。UI 现在走准备流程，这只影响 API 调用者。建议在 manifest 声明 `preparation` 后拒绝 `ccgateway_runtime`，或者至少比对代理。

### F13（P3，存疑）GET 有副作用，读权限过宽

- `GET /system/ccgateway/accounts/:id/health` 会写 `accounts.subscription_type`，并调用 `SubscriptionChanged`，可能改写模型列表（`ccgateway/accounts.go:736-751`）。持有 `settings:read` 的只读用户也能触发（`http.go:24`）。
- 同一权限下的 `GET …/session` 会返回他人进行中的 OAuth 链接（含 state 和 PKCE challenge）。只读用户不能提交 complete，所以直接风险低，但链接不应该对只读用户可见。

建议把订阅采样移到有写权限的路径或后台任务；session 只对 `settings:manage` / `account:update` 返回 URL。

### F14（P3，确认）文档、注释、文案与当前行为不一致

- `companions/controller/README.md:100-101` 写"Missing/disabled proxies block the account; there is no direct fallback"。现在停用的代理照常使用，不绑代理就是直连（`ccgateway/accounts.go:97-100`）。
- `ccgAuthFlow.ts:8-10` 写"reauth … the account swaps to the new runtime"，`:167` 写"proxy or account disabled"会被阻断；`CCGatewayAccountAuth.vue:7-14` 说用 `POST /system/ccgateway/drafts` 和 `ccgateway_runtime`；`AccountEditor.vue:7-11, 229-231` 说"only reach the internet through a proxy (no direct fallback)"。这些都已过时。
- `zh ccgateway.ts:125` 的 `draftProxyHint`（"授权前启动容器需要一个已保存的代理"）、`:141` 的 `proxyRequired`（"必须绑定代理"），与同一行的 `proxyRequiredHint`（"不选代理时容器直连出网"）互相矛盾。
- `ccgateway/accounts.go:444-446` 的 Kick 注释写"account create/update"，实际上账号变更已经不走 Kick。
- `AccountEditor.vue:228` 的 `ccgSyncKey` 含 `status`：账号状态变化会触发 `sync()`，但 50da2ceac 之后状态已不影响 runtime，这次 sync 是多余的。
- `forms/apikey.ui.json` 的 `api_key` 帮助文案中英文含义不同："restarts only this account container" 与"会重建此账号容器…正在处理的请求可能中断"。

### F15（P3，确认）删除确认与收养时序

- 删除用通用的 `common.confirmDelete`（`AccountsView.vue:456`）。ccgateway 账号删除会不可逆地清除容器、数据卷和 OAuth 凭据（F3 链路），确认框应单独提示。
- `submit()` 在 `await api.post('/accounts')` 返回之后才调用 `ccgAuth.adopt()`（`AccountEditor.vue:561-562`）。如果保存期间编辑器被关闭，`onBeforeUnmount` 会并发发出 `DELETE /account-preparations/:key`。服务端的状态机能保证一致：一方 409，不会留下孤儿。但结果是"保存失败且草稿被删"。建议发 POST 之前就标记 adopted。

### F16（P3，确认）事务内做网络 I/O

`CommitReauth` 在 `lockedTx` 里先 `FOR UPDATE OF a`，然后调 runtime 的 `admin/status`（`ccgateway/reauth.go:61-103`）。Worker 的 `/admin/status` 与 start/complete 共用 `a.mu`，最长可能等 45 s（`engine/auth.go:296-298`）。这段时间里同一账号的 PATCH、自动禁用写入都会被行锁阻塞。`removeDraft` 也是在 DELETE 行锁内调控制器（`ccgateway/drafts.go:277-287`），注释里说明是有意为之。建议先在事务外确认登录，事务内只做写入。

### 已核对、无问题的点（供主控参考）

- 停用 / 启用：desired 与 revision 不含账号状态和代理状态（50da2ceac），有 `TestDisabledAccountAndProxyKeepCCGatewayRuntime` 覆盖。控制器 `update_worker` 对未运行的容器返回 `not_running`，不会把被停止的已删除账号容器拉起来（`manager.py:1219-1220`）。
- 删除不会误删：单个删除用 `X-CCG-Delete-Account` 二次确认；清理用权威 keep 列表加 identity 快照，并且先校验所有资源归属（`manager.py:928-982`、`cleanup.py:81-121`），有 `test_cleanup.py` 的 12 条用例覆盖。
- 创建并发：准备记录用 `account_preparations` 状态加 `account_id IS NULL` 条件，`AdoptDraft` 依赖行锁，cancel 与 adopt 互斥；浏览器关闭后由草稿空闲 15 min 清扫、准备记录过期清扫、控制器孤儿清扫三层兜底。
- 原地重新授权的 start 不会清除现有凭据，只有 complete 才替换（`engine/auth.go:146-258`），取消是安全的。
- 敏感信息：安全过滤（`safeResult` / `safeAuthStatus`）只放行白名单字段；apikey 的 `api_key` 是 `sensitiveFields` + `writeOnly`，编辑时通过 `unmask` 回填；日志不打印 desired body。

## 5. 测试覆盖评估

| 功能 / 选项 | 现有测试 | 缺失的边界用例 |
|---|---|---|
| 准备创建 / 幂等 / 归属 / 收养 | `account/preparations_test.go`：`TestAccountPreparationOwnershipReadinessAndAdoption`、`TestAccountPreparationRejectsConfigurationMismatch`、`TestAccountPreparationCleanupHonorsRenewal`；`ccgateway/lifecycle_test.go`（仅环境） | 同一 idempotency_key 改代理后重试（409）；`PrepareAccount` 在 runtimes 关闭时失败后的残留；cancel 与 create 并发；`AccountPreparationAction` 在 `ProxyUnusable` 下的返回（F7） |
| 旧草稿接口 | `ccgateway/drafts_test.go` 5 条（含控制器失败保留行、清扫） | 旧接口代理与账号代理不一致（F12） |
| 生命周期同步状态 | `TestLifecycleSynchronizationCannotOverwriteNewerGeneration`、`TestLifecycleEventsUseCurrentOwnedAccount` | 锁竞争、超时、`updated_at` 漂移、死信后的自愈（F1/F5），目前全部没有 |
| 编辑（字段不变时 revision 不变） | 无；`TestAPIKeyDesiredRotation` 只测改 key 时 revision 变化 | PATCH 不改凭据时 revision 不应变化（F2，按现状会失败） |
| 停用不影响 runtime | `TestDisabledAccountAndProxyKeepCCGatewayRuntime`、`TestAutomaticDisableKeepsCCGatewayRuntimeAvailable` | — |
| 代理失效不回落直连 | `TestMissingOrInvalidBoundProxyNeverBecomesDirect` | 草稿状态显示 / 原因（F7）；已删除且代理不可用（F8） |
| 删除 / 清除 | `TestDeletedRuntimePurgesDataAndRetriesFailure`、`test_manager.py` 中的 delete 系列、`test_cleanup.py` 12 条 | 控制器过旧或清理失败时应退回停止（F3）；`PurgePluginAccounts` 后应请求清除（F4）；清除成功后不再重复调用 |
| 清理孤儿资源 | `TestCleanupUsesCompleteAuthoritativeKeepList`、`test_cleanup.py`、`AccountRuntimes.spec.ts`（不传分页行） | 清理期间新建草稿或收养（keep 列表的时间窗） |
| 原地重新授权 | `account/ccgateway_reauth_test.go:TestCCGatewayReauthorize`、`CCGatewayAccountReauth.spec.ts` 3 条、`ccgReauth.spec.ts` 15 条、`LocalCredentialFlow.independent.spec.ts` 3 条 | commit 时未登录（`draft_not_authorized`）；commit 时 key 不再是当前 runtime；`runtime_not_ready` 的提示文案（F9） |
| 刷新令牌 | `TestRefreshTokenAction` | 前端 AccountsView 有部分覆盖；apikey 账号返回 `api_key_account` |
| 授权状态过滤 | `auth_status_test.go` 3 条、`auth_status_independent_test.go` | — |
| 权限 / 归属 | `TestAccountRuntimeOwnership`、`TestManagementRequiresAuthorizationWithoutConfirmation` | 只读用户读取 session（F13）；只读用户触发 refresh_auth（F10） |
| 前端授权组件 `CCGatewayAccountAuth.vue` | 没有独立 spec，只有 `AccountEditor.spec.ts` 的浅挂载和 `LocalCredentialFlow` 3 条；纯函数 `ccgAuthFlow.spec.ts` 14 条覆盖较好 | `updateProxy`、`restartDraft` 重置 idempotency、卸载时 discard、`completeRefused` 三个分支、心跳、`waitForLogin` 失败 |
| 前端编辑器 | `AccountEditor.spec.ts`（环境、准备 URL、冻结） | 编辑时不应发送未改的 credentials（F2）；关闭编辑器与保存并发（F15） |
| `validation.ts` | `validation.spec.ts` 2 条 | 过期边界、非 https、带用户名的 URL |
| `AccountRuntimes.vue` | `AccountRuntimes.spec.ts` 10 条 | 超过 200 个账号、refreshAuth、卸载 |
| 控制器 apply / block / direct | `test_direct_runtime_without_proxy`、`test_first_provision_records_created_at_and_image` 等 | 仅 revision 变化（fingerprint 不变）时是否复用 egress 及其耗时（F2 的控制器侧） |

## 6. 代码规范观察

- **重复的两套接口**：草稿有 `/system/ccgateway/drafts`（`ccgateway/drafts.go`）和 `/account-preparations`（`account/preparations.go` + `ccgateway/lifecycle.go`）两套；重新授权有 `/system/ccgateway/accounts/:id/reauthorize`、actions 里的 `refresh_auth` lifecycle 分支、以及旧的 `handleCCGatewayRefreshAuth`（`actions.go:90-132`）三个入口。`AccountPreparationAction`（`lifecycle.go:43-101`）复制了 `serveRuntime`（`accounts.go:622-774`）的路径表、状态映射和 64 KiB 限制，两边已经出现分歧（`unavailable()` 检查、审计）。建议抽出共用的 `runtimeAction(ctx, d, method, action, body)`。
- **兼容名和死参数**：`ReauthDraft` 保留兼容名，但第 2、3 个参数未使用，返回值 `created` 恒为 false（`reauth.go:15-18`）；`CommitReauth` 的回调 `retired` 恒为空字符串。
- **锁模板重复**：`Reconcile` 手写了 acquire/begin/try-lock/rollback（`accounts.go:314-334`），与 `lockedTx`（`drafts.go:293-323`）重复，可以复用后者（再加一个"只读不提交"的变体）。
- **校验不一致**：账号 desired 用 `map[string]any` 手工解析 locale/timezone，非法值被静默忽略（`accounts.go:148-159`）；草稿 desired 用 `environment.Normalize`，非法值报错（`:206-210`）。
- **列语义重载**：`retired_at` 在"附着 + retired"时表示请求清除，在"脱离 + retired"时表示重新授权的历史（`cleanup.go:20-23`）。这依赖读者记住约定，`sweepRetired`、`cleanupKeepKeys`、`desiredIn` 三处查询都要正确区分。建议改用显式的 `purge_requested_at` / `purged_at`。
- **长函数**：`serveRuntime` 约 150 行、两层 switch，并特殊处理 features、request-logs、cc-features（`accountManage` 里又转一次）。
- **前端状态管理**：`CCGatewayAccountAuth.vue`（674 行）把状态分散在 8 个模块级 `let` 标志（autoStarted、sessionChecked、adopted、alive、serial、lastCall、preparationAttempt、timers）和多个 ref 中；纯函数状态机只覆盖了一部分。建议抽成 composable，让 tick / heartbeat / serial 可以单测。
- **审计动作名**：动作名里拼了标识符，如 `"ccgateway.draft."+key+"."+action`、`"account."+id+"."+action`（`accounts.go:766-771`、`drafts.go:176`），导致审计动作名的基数无界，按动作筛选困难。标识符应放进 target 字段。
- **import 分组**：`http.go:3-13`、`reauth.go:3-11` 把标准库与第三方包混在一起，不符合 goimports 分组习惯。

## 7. 未覆盖 / 未能验证的范围

- 没有运行 next/server 的 PG 测试，F1、F2、F3、F4 的服务端复现步骤只给出了写法，需要主控在 PG 环境里跑。F2 的前端部分已经用临时 vitest 验证，测试文件已删除。
- 没有在 4 节点环境实测 F1 的锁竞争频率和 F5 的超时比例。控制器 apply 的实际耗时只来自代码推断，没有线上数据。
- 没有深入审核 shared_xray egress 路径（`shared_egress.py`、`manager.py:774-783`），也没有审核 migrate-auth 在当前原地重新授权方案下是否还有调用方（仅确认控制器侧有隔离测试）。
- 没有审核 `controller_api.go` / `controller_conn.go` 的连接层，以及 `config.go` 保存远程配置后的 `onConfigChanged` 对生命周期的影响。
- 插件卸载后"清理孤儿资源"入口是否仍然可用（F4 的补救路径）没有验证。
- `mergeExtensions` 与 `environment.Normalize` 对空值的处理，是否会让 `checkPreparationForCreate` 的设置比对误判，没有逐值推演；现有测试通过，暂视为正常。
