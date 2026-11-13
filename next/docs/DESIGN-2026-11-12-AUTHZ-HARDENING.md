# 权限加固：行为变化与回滚（升级说明）

> 日期：2026-11-12。分支：`feat/authz-hardening`。每个产生行为变化或产品性收紧的提交在这里追加一条：影响对象、回滚方式。路径省略前缀 `next/`；Go 文件省略 `server/internal/`。

---

## T01 H1：授予超管角色比较超管标志

- 改动：授予与作用对象的比较统一用 `core.PermissionSet.Missing`，同时比较超管标志和权限 key。`SetUserRoles` 判断操作者是否超管改用有效权限集（受访问密钥收窄），不再直接查库；`createUserTx` 删掉事务外的重复预检，只保留同一事务里的 `SetUserRoles`。
- 影响对象：超管名下的访问密钥（即使带 `role:manage`、`user:create`）不能再通过 PUT `/users/:id/roles` 或 POST `/users {role_keys}` 授予 `super_admin`，返回 403。超管本人用会话登录照旧可以（多超管语义暂不变）。
- 接口细节：`CanActOn`/`CanActOnUser` 拒绝时的 `details.missing_permissions` 改为 `details.missing`；`CanGrant` 与它们的 403 都多一个 `details.superuser`（缺超管标志时为 true）。前端没有读取 `missing_permissions`。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T06 M8：会话失效立即生效（iam:user:changed）

- 改动：新增 `iam.invalidateSessions`（`token_version + 1` 并按场景吊销 refresh token 家族、删除登录会话行）与 `changeSessions`/`sessionsChanged`。改密码、撤销会话、登出、管理员重置密码、禁用、删除都走它。iam 提交后在 `iam:user:changed` 上按用户 id 广播，各节点清掉该用户的状态缓存；总线重连时整表清空；30 秒缓存过期兜底。不推进权限版本。
- 影响对象：
  - 本人改密码：其他会话立即下线；当前会话保留（多一次 `/auth/refresh`），不再“改完 2 小时后被踢”。没有 `fam` 声明的旧 token 改密码时照旧结束全部会话。
  - 撤销会话、登出：被撤销或登出的会话（整个 refresh token 家族）的 access token 立即 401；同一用户的其他会话多一次 `/auth/refresh`。登出原先只吊销提交的那一个 refresh token，现在结束它所在的家族。
  - 管理员重置密码、禁用：其他节点立即生效（原先只重置密码不会通知其他节点，最长 30 秒）。
  - 用 JWT（不是访问密钥）且不会续期的第三方脚本，在用户改密码、登出、撤销会话后失效；访问密钥不受影响（CONTRACTS §80）。
- 回滚：revert 这个提交即可，无迁移、无数据变化。新旧节点混跑时旧节点不订阅 `iam:user:changed`，靠 30 秒缓存过期兜底。

## T07 M6、C-L4：授予视角与事务内授予检查

- 改动：`authz.RolesPermissions` 改为授予视角（`status <> 'removed'`，disabled 插件权限计入）；有效权限（`loadPermissionSet`）不变。新增 `grantSet`（操作者角色的授予视角，经访问密钥收窄，用调用方的连接或事务读库）与 `covers`，`CanGrant`、`CanActOn`、`CanActOnUser` 与 `SetUserRoles` 的三处检查（作用对象、超管角色、新增角色）都改走 `covers`，`SetUserRoles` 在自己的事务里读，不再读本节点的权限缓存。新增 `CanActOnUsers`（批量、一条 SQL，`CanActOnUser` 是它的包装）与 `core.UserGuard`/`ActOnOthers`/`ErrSelfTarget`/`GuardOrDeny`、`authz.audit`，本提交没有新的调用方（billing/segment 在 T33 接入）。
- 影响对象：
  - 插件被禁用期间：角色上挂着该插件权限的操作者（如 admin）可以继续授出它；没有该权限的操作者不能再授出带它的角色，也不能作用于持有它的用户（原先禁用的权限在比较时被忽略）。
  - 授予与作用对象检查改为每次查库：另一节点刚改的权限立即生效，不再等广播；每次检查多一到两次查询。
  - 操作者的授予范围按角色计算、不看操作者自身的 active 状态（已认证的请求本来就要求 active）。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T19 设计3.1.7：超管登录审计

- 改动：`issueTokens` 在新登录（新建 refresh token 家族；密码、2FA、passkey 三条路径都经过）且用户是超管时，同一事务写审计 `auth.superadmin_login`（目标 `user`/本人 id，`detail {method, ip}`，`ip` 列同样填登录 IP），并打一条 WARN 日志 `iam: super admin login`。refresh 与普通用户登录不写。通知（告警发给谁）延后（决策 D12）。
- 影响对象：超管每次登录在审计日志里多一行、在服务日志里多一条 WARN；登录响应与行为不变。审计写入失败时登录随事务失败（与其他同事务审计一致）。
- 回滚：revert 这个提交即可，无迁移；已写入的 `auth.superadmin_login` 行可保留或按 action 删除。

## T21 M1 声明面与 W5-C6：manifest.RouteAccounts 与打包校验

- 改动：`sdk/manifest` 的 `Route` 新增可选 `accounts {action, from}`（`RouteAccounts`，`from` 只接受 `path:`/`query:`/`body:` 三种前缀）与 `EffectiveRouteAccounts`（被 `ui.accountActions` 指向的路由推断为 `{update 或 read, [body:account_ids]}`）。`ParseRouteRef`、`NormalizeRoutePath` 移到 `manifest`（`check` 里保留同名转调）。校验：`accounts` 只允许 admin/user 路由，action、from 格式合法，`path:` 必须是路由参数；accountAction 指向的路由显式声明 `accounts` 时必须含 `body:account_ids`；public/webhook 路由声明 `permission` 或 `accounts` 报 `unsupported`。本提交只做声明与校验，核心代理尚未据此拦截（T24）。
- 影响对象：public/webhook 路由上带 `permission` 的插件包从此上传安装、打包时校验失败（该权限本来就不生效）；已安装的包不重新校验，照常加载。仓库 15 个插件都不受影响（payment 的 webhook 没有 permission）。第三方插件需删掉 public/webhook 路由上的 `permission`。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T26 G2 声明面：AccountType.UpstreamFields 与 custom_upstream

- 改动：`sdk/manifest` 的 `AccountType` 新增可选 `upstreamFields`（`omitzero`，`[]` 与未声明区分）与 `AddressFields()`、`CustomUpstream()`；manifest 校验 `upstreamFields` 非空串、不重复；`check.Warnings` 对 schema 表单里有 `base_url`/`*_endpoint` 却未声明也推不出的类型给警告（只由打包工具打印，不阻止安装）。ccgateway、claude-oauth、codex、volcengine 的 manifest 声明 `upstreamFields`（未升插件版本，T84 统一升）。`GET /account-types` 每项多一个 `custom_upstream`。
- 影响对象：无运行时行为变化，授权判断仍按旧规则（T29 才改用 `CustomUpstream`）。`upstreamFields` 写错（空串、重复）的第三方插件包上传、打包时校验失败。已安装的旧版本插件 manifest 里没有该字段，在 T84 发版前 `custom_upstream` 仍按旧规则计算（如 claude-oauth、ccgateway managed 显示为 true）。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T27 U3/G3：segment.UsableGroupSQL 与分组查找接受 account:group:bind

- 改动：`segment.UsableGroupSQL`（`status = 'active'` 且 `OpenToUserSQL`）成为“用户可用分组”的唯一写法，`lookup` 的 groups 范围、`GET /me/groups`、`GET /me/prices` 的分组范围、API Key 绑定分组的校验都改为调用它（SQL 与原来逐字等价）。`GET /lookup/groups` 除 `group:read` 外也接受 `account:group:bind`：只持有后者时按 `mine=true` 的范围收窄（调用者自己可用的分组，只返回 id、name、status）。前端分组选择器的权限同步加上 `account:group:bind`。决策 D19：own 级可绑定分组的范围 = 调用者自己可用的分组（不建新表）；T29 的绑定校验用同一函数。
- 影响对象：持有 `account:group:bind` 而没有 `group:read` 的角色（如供应商）在账号表单里能打开分组选择器，看到自己可用的分组；`group:read` 持有者、`/me/groups` 不变。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T71 前端 P0a：刷新余额接口、角色 key 正则、removed 权限只能取消

- 改动：账号页“刷新余额”从不存在的 `POST /accounts/:id/refresh-balance` 改为 `GET /accounts/:id/balance?force=true`（W2-G6）。新建角色的 key 前端校验从 `{1,63}` 收紧为 `^[a-z][a-z0-9_]{1,49}$`，与后端 `roleKeyRe` 一致，提示文案改为 2-50 位（U4）。角色权限树里状态为 removed 的权限只能取消、不能勾选，模块“全选”跳过未勾选的 removed 权限（全选状态也只按可选条目计算），单条 removed 权限显示灰色“已移除”徽标；插件禁用的权限仍可勾选（U5）。
- 影响对象：账号页刷新余额按钮恢复可用。51–64 位的角色 key 改为在前端直接报错（后端原本就拒绝）。角色编辑者不能再把已移除的权限加回角色；已持有的 removed 权限保留，可以取消。无后端变化。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T72 前端 P0b：ccgateway 运行时按钮按行级 update 判断、路由守卫网络失败不误判

- 改动：CCGateway 账号运行时列表的“启动”“刷新授权”改用行级 `canUpdateRow(r) = settings:manage || own.can(r, ACCOUNT_KEYS.update)`（与日志开关同一判断），原来“启动”只看是否持有任一 update key、“刷新授权”只看是否持有任一 read key；“去编辑”链接仍按 read 口径显示（W5-B2）。路由守卫里 `loadMe` 失败而会话仍在时，跳转 `/forbidden?reason=load_failed&redirect=<原地址>`，页面显示“加载失败”和“重试”按钮（重新进入原地址），不再显示缺少的权限；插件设置页与插件页面不加 `meta.perm`（由页面自身处理 403 与不可见，只加注释）（W5-B5）。
- 影响对象：只持有 own 级账号权限的用户在他人账号的运行时行上不再看到“启动”“刷新授权”（后端原本就拒绝）；只有 read 权限的用户不再看到“刷新授权”。网络或服务端故障导致加载账号信息失败时，用户看到可重试的加载失败页，而不是“没有权限”。无后端变化。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T73 U2 快速修复：账号/代理菜单与列表接口口径一致

- 改动：决策 D23 方案 a。核心侧边栏的账号菜单只认 `account:read | account:own:read`（去掉 `account:own:create`），代理菜单只认 `proxy:read | proxy:own:read`（去掉 `proxy:own:manage`），与 `GET /accounts`、`GET /proxies` 的权限一致。前端 `ACCOUNT_PAGE_PERMS = ACCOUNT_KEYS.read`、`PROXY_PAGE_PERMS = PROXY_KEYS.read`，`/accounts`、`/proxies` 的路由守卫与用量详情里加载账号类型的判断随之同步。结构化（菜单引用页面主接口）在 T68；角色编辑器按 requires 自动勾选在 T76。
- 影响对象：只有 `account:own:create` 而没有 `account:own:read`（或 `account:read`）的角色不再显示账号菜单，直接打开 `/accounts` 进入无权限页；代理同理（只有 `proxy:own:manage`）。这些角色原先点进去列表接口就返回 403，实际能力不变。需要该页面的角色补授对应 read 权限。无后端接口变化。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T11 M13、W1-F18：明文回显只认会话，/system/version 接受访问密钥

- 改动：`POST /me/api-keys/:id/reveal`、`POST /proxies/:id/reveal-url`、`POST /accounts/:id/credentials/reveal` 改用 `Router.SessionOnly()` 视图注册（权限键不变）；`GET /system/version` 由 `Authed` 改为 `AuthedRead`。CONTRACTS §80 写明这三条与 `remote-fingerprint` 不接 netguard 的取舍。
- 影响对象：用访问密钥调用这三个回显接口的脚本改为 403 `access keys cannot use this endpoint`，需改用登录会话；API Key 的创建与轮换、代理与账号的其他接口不受影响。访问密钥调用 `/system/version` 由 403 变为 200。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T22 W5-A1、W1-F15：插件代理复用 Authenticate/RejectAccessKey/CanAny，空权限拒绝

- 改动：`/api/v1/p/:key/*path` 的 admin/user 路由改为 `httpapi.Authenticate → httpapi.RejectAccessKey → httpapi.CanAny(manifest.PermissionKey(key, permission))`，不再自己解析 Bearer、单独调 `Can`；请求上下文带 `WithGranted`。决策 D8 默认 A：访问密钥不能调用插件路由（`access_key.go` 仍不允许选 `plugin.*`）。
- 影响对象：用访问密钥调用插件 admin/user 路由由隐式 401 变为明确 403 `access keys cannot use this endpoint`。没有声明 `permission` 的 admin/user 路由（manifest 校验本来就拦截，只有绕过校验的包会到这里）由“任意登录用户可用”变为对所有人 403。正常安装的插件与登录会话不受影响。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T28 M2：掩码回填且改上游地址时须能查看凭证或重新输入

- 改动：`unmask` 返回被回填的字段；`PATCH /accounts/:id` 与 `POST /accounts/:id/models/fetch` 共用 `credBase`（解密旧凭证，并按 `account:credential:view | account:own:credential:view` 的范围与账号创建者判断能否查看）。`prepare` 在回填之后、schema 与插件校验之前比较上游地址字段（`AccountType.AddressFields()`，未声明时退回 `base_url` 与 guardedSettings 字段，按 guardNorm 比较）：有字段被回填、地址变了、调用者又不能查看凭证时，对每个回填字段返回 400 `invalid_argument`，`fields[{credentials.<f>, reenter_required}]`，不调用插件、不发任何请求。`prepare` 不再接收 custom 参数（内部判断 `account:settings:custom`），`prepared.addressChanged` 供 T29 使用。
- 影响对象：没有凭证查看权限（或只有 own 级查看权限、改的是别人创建的账号）的用户，在编辑表单里改了上游地址却保留掩码密钥时，保存与拉取模型都会报“修改上游地址时需要重新输入该密钥”，重新输入密钥即可；地址不变时照旧可以保留掩码。有 `account:credential:view` 的用户不受影响。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T08 目录字段 superOnly/sessionOnly/inherits、KeyAllowed、自动授予审计

- 改动：`corePerm` 增加 `superOnly`、`sessionOnly`、`inherits`（本提交不标任何数据）。`authz.KeyAllowed` 是访问密钥能否携带某权限的唯一判断（排除 `plugin.*` 与 sessionOnly），iam 的 grantablePermissions、AccessKeyPermissions、VerifyAccessKey（运行时丢弃）、lostPermissions 共用。SyncCore 新增 `grantInherited`：带 `inherits` 的核心权限首次创建时授给持有旧 key 的全部角色；它与“新核心权限按默认授给已有内置角色”都写 `authz.sync.grant` 审计（actor 为系统，detail 含 `key`、`via`=`inherit`/`default`、`from`）。新建的内置角色首次播种不写审计。`GET /permissions` 每项增加 `session_only`。
- 影响对象：只多审计行与一个响应字段；在 T10 标记数据之前访问密钥行为不变（`plugin.*` 原本就不能选，存量密钥里若有 `plugin.*` 现在显示为 lost 并在运行时丢弃，原本也用不上）。
- 回滚：revert 这个提交即可，无迁移、无数据变化（已写的审计行保留无害）。

## T24 M1、W1-F2、W2-F1、W2-F2：插件核心代理强制路由的账号归属

- 改动：注册插件路由时 `rt.Accounts = manifest.EffectiveRouteAccounts(...)`：显式声明了 `accounts` 的路由，以及被 accountActions 指向的路由（推断为 `{update（visibleFor 全为 all 时 read）, [body:account_ids]}`），在转发前由核心调用 `core.AuthorizeAccounts` 检查：持有 `account:<action>` 放行；只有 `account:own:<action>` 时请求里必须带账号 id 且全部是自己创建的（否则 404，不带 id 时 403）；两者都没有 403。id 取自 path 参数、query 参数（全部取值）或 JSON 顶层字段（字段名大小写不敏感，与插件端 encoding/json 一致），接受数字、数字数组或逗号分隔字符串；格式不对 400，去重后超过 `MaxAccountBatch`（500）400。路由处理器未注入 `core.AccountAccess` 时，这些路由一律 503。已安装的旧包下次加载即生效，不需要改插件。
- 影响对象：目前受影响的是 codex `POST /reset-credits/consume`（`codex:reset`）与 dynweight `POST /reset`（`dynweight:manage`）。持有这些插件权限、但没有 `account:update`/`account:own:update` 的角色调用时由 200 变为 403；只有 own 级的角色操作他人账号变为 404，dynweight 只传 `group_id` 的整组重置只有全量级能做。推断只检查 `account_ids`：dynweight `/reset` 还接受单个 `account_id`，要等 T25 显式声明 `{update, [body:account_ids, body:account_id]}` 后才一并检查，在此之前不要把 `dynweight:manage` 授给只有 own 级账号权限的角色。内置 admin、operator 持有 `account:update`，不受影响；生产核查这些插件权限只授给内置 admin。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T29 G1、G2、M10、W2-G4：own 级判定只看变化（checkOwnChange）

- 改动：`checkOwnLevelRestrictions` 换成 `checkOwnChange`，新建与编辑共用，只对 own 范围生效。分组：`loadGroupDiff` 一条 SQL 算出新增、移除与不可绑定的分组（编辑时在锁住账号行的同一事务里，与写分组一起），分组列表没变时放行；有变化（含 `[]` 全部解绑）要求 `group:manage` 或 `account:group:bind`；只有 bind 权限时，新增的分组必须是自己可用的分组（`segment.UsableGroupSQL`，与 `/lookup/groups` 同一范围），否则 400 `fields[{group_ids, not_bindable}]`。不存在的分组照旧 `group_ids not_found`。封顶字段（priority、weight、max_concurrency）与账号现值相同时放行。`account:relay` 只在新建可自定义上游的类型（`AccountType.CustomUpstream()`），或编辑时改了上游地址字段时要求；`POST /account-types/:plugin_key/:type/models/fetch` 与 `POST /account-types/:plugin_key/:type/preparations` 在 own 范围用同一个 `checkCustomUpstream`；`POST /accounts/:id/models/fetch` 带改了上游地址的凭证时也一样（审查补充，否则可绕过保存时的限制向任意地址发请求）。编辑时这些判断移到事务内（插件 before_update 生命周期回调之后）。
- 影响对象：供应商（own 级）原样保存管理员调整过分组或把优先级设到上限以上的账号，由 403/400 变为成功；改名、启停、改模型不再要求 `account:relay`；声明 `upstreamFields: []` 的 OAuth、managed 类型可由供应商新建。收紧部分：没有 bind 权限的供应商提交 `group_ids: []` 解绑由成功变为 403；只有 `account:group:bind` 的用户不能再绑定自己不可用的私有或停用分组；没有 `account:relay` 的 own 级用户对可自定义上游的类型拉取模型、创建预备容器，以及在已有账号上用改过的上游地址拉取模型，由成功变为 403。全量级用户不受影响。
- 回滚：revert T29 的两个提交（实现与 review fixes）即可，无迁移、无数据变化。

## T09 决策 3、W5-A3：role:manage 拆为 role:define + role:assign

- 改动：目录删除 `role:manage`，新增 `role:define`（定义角色）与 `role:assign`（给用户分配角色），都是 sensitive，`inherits: ["role:manage"]`。升级后第一次 SyncCore：持有 `role:manage` 的角色（含自定义角色）同时得到两者（`grantInherited`，审计 `authz.sync.grant` via=`inherit`；内置 admin、operator 的默认集合本就接受这两个 key，先由默认授予写入，审计为 via=`default`，生产备份上即是这 4 行），`role:manage` 标为 removed（授权行保留但不生效）。POST/PATCH/DELETE `/roles*`、PUT `/roles/:id/permissions`、POST `/roles/:id/reset` 改为 `role:define`；PUT `/users/:id/roles` 与 POST `/users` 带非默认角色改为 `role:assign`（后者改用 `httpapi.CanAny`，403 的 `details.permission` 为 `role:assign`）；插件 consent 把新插件权限授给角色改为要求 `role:define`。前端角色页、用户页分配角色、新建用户选非 user 角色按新 key 判断。
- 影响对象：角色的实际权限不变（存量持有者等价获得两者）。角色编辑器里 `role:manage` 仍勾选并显示为已移除，T12（removed 权限原样提交）合入前，保存这类角色要先取消勾选，否则非超管 403（`details.missing`）、超管 422（`permission_keys unknown`）。带 `role:manage` 的访问密钥失去角色管理能力（密钥的权限是创建时选定的 key，`role:manage` 已 removed），调用上述接口改为 403，需新建带 `role:define`/`role:assign` 的密钥；访问密钥管理页会把 `role:manage` 显示为失效。以 `role:manage` 判断权限的外部脚本需改用新 key。
- 回滚：revert 这个提交即可，无迁移。回滚后 SyncCore 把 `role:manage` 恢复为 active（存量授权行仍在），`role:define`/`role:assign` 标为 removed；升级期间新建或修改的角色若只勾了新 key，需要重新勾选 `role:manage`。

## T25 M1、W2-F1、W2-F2：codex/dynweight/volcengine 声明路由的账号范围

- 改动：三个插件的 manifest 路由声明 `accounts`（只改 manifest，未升插件版本，T84 统一升）。codex：`POST /reset-credits/list` `{update, [body:account_id]}`、`/reset-credits/summary` `{read, [body:account_ids]}`，`/consume` 仍靠 accountActions 推断。dynweight：`POST /reset` `{update, [body:account_ids, body:account_id]}`；`GET /weights` `{read, [query:account_ids]}`；`GET /status`、`/events` `{read, [query:account_id]}`；`GET /degraded`、`/stats` `{read}`；`/config`、`/defaults`、`/channels`、`/config/validate` 不声明。volcengine：`GET /accounts/:account_id/upstream/*` `{read, [path:account_id]}`、`POST /asset-groups` `{update, [body:account_id]}`，其余 10 条（含 `GET /accounts`）读为 `{read}`、写为 `{update}`，不写 `from`。
- 影响对象：装上带这些 manifest 的插件包后生效（插件版本号在 T84 统一升）。持有插件权限、但没有对应 `account:read`/`account:update`（全量级或 own 级）的角色调用这些路由由 200 变为 403；只有 own 级的角色只能对自己创建的账号调用带 id 的路由（他人账号 404），不带 id 的请求（dynweight 不带 `account_id` 的 `/status`、`/events`，只按 `group_id` 的 `/reset`，`/degraded`、`/stats`）以及 volcengine 除上述 3 条外的素材库路由都需要全量级（403）。dynweight 账号列表工具栏的降级标记对 own 级用户收到 403 时静默不显示（前端原本就吞掉错误，未改）。内置 admin、operator 持有 `account:read`/`account:update`，不受影响；生产核查这些插件权限只授给内置 admin。
- 回滚：revert 这个提交即可（插件需重新打包安装旧 manifest），无迁移、无数据变化。

## T12 M5、C-L1、C-L2、P2：角色写入口 editableRole 与超管角色冻结

- 改动：`authz.editableRole`（同一事务、`Bump` 之后锁住角色行）成为改名称描述、改权限、重置、删除角色的唯一入口：超级管理员角色一律 409；其余角色（内置与自定义同口径）当前授予的权限必须在操作者的授予范围内（`covers`），否则 403。`UpdateRole`、`DeleteRole` 增加 `actorID`。`SetRolePermissions` 只检查新增的权限；已移除（`status=removed`）的 key 忽略、授权行保留，完全不存在的 key 仍报 unknown。`CreateRole`、`ResetRole` 的授予检查挪进事务改用 `covers`。五个写操作各写一条审计（`role.create`、`role.update`、`role.delete`、`role.permissions`、`role.reset`）。CONTRACTS §4、§15.7、§43.6 同步。
- 影响对象：
  - 超级管理员角色不能再改名称、描述，也不能重置（原先可以；超管本人和系统也不行），返回 409。前端本来就把超管角色设为只读。
  - 持 `role:define` 的操作者不能再改、删、重置权限比自己大的角色（包括带有自己没有的插件权限的内置角色），返回 403。原先只检查授出的权限，可以先削弱上级角色再对其持有者改密码或禁用。
  - 原样保存带已移除权限的角色不再报 unknown；保存时操作者已不需要持有角色上原有的权限（原有部分已由入口检查保证在操作者之内）。POST `/roles` 带已移除的权限 key 时忽略而不再报错。
  - 审计日志多出角色写入的记录。
- 回滚：revert 这个提交即可，无迁移、无数据变化（已写入的 `role.*` 审计行可保留）。

## T13 决策 3–5：可分配角色白名单数据层

- 改动：迁移 `0097_role_assignable.sql` 新增 `roles.assign_custom`（“以及全部自定义角色”）与 `role_assignable_roles(role_id, assignable_role_id)`。存量等价：持有 `role:manage`（不看状态，拆分后已 removed）或 `role:assign` 的非超管角色得到 `assign_custom = true`，并可分配除 `super_admin`、`admin` 外的全部内置角色；全新库不动。内置默认清单（决策 5）：admin = operator、user + 全部自定义角色；operator = user（supplier 随 T52 建出后由 SyncCore 追加到 admin、operator）。SyncCore 新建内置角色时播种清单（不审计，与权限播种一致）；以后新建的内置角色追加到默认清单含它的已有内置角色上，写 `authz.sync.grant` 审计（via=`assignable`，`key` 为被追加的角色）。`core.PermissionSet` 增加 `Assignable`、`AssignCustom` 与 `CanAssign`；`RolesPermissions`（授予视角）加载它们（显式清单永不含超管角色，`assign_custom` 展开为全部非内置角色）；`Missing` 增加 `Assign`、`AssignCustom`，403 的 details 多 `missing_assignable`、`missing_assign_custom` 两个字段。访问密钥收窄后没有可分配角色。本提交不改 `SetUserRoles` 的分配规则（T14），不加接口（T15）。
- 影响对象：作用于用户（`CanActOnUsers`/`CanActOnUser`：改资料、禁用、重置密码、分配角色时的目标检查）、授出角色（`SetUserRoles` 比较新增角色）与修改角色（`editableRole`：改名称描述、改权限、重置、删除）时，目标、新角色或被改角色能分配的角色也要在操作者的可分配范围内。因此：没有可分配清单的自定义角色持有者，即使权限覆盖 operator，也不能再作用于 operator 用户、授出 operator 角色或修改 operator 角色（operator 可分配 user）；admin 不能作用于持有“可分配 admin”的自定义角色的用户。内置 admin 之间、admin 对 operator/user 不受影响；超管不受影响。访问密钥（收窄后没有可分配角色）不能再作用于 operator、admin 等带清单的用户或授出这些角色。生产库只有 super_admin/admin/user/operator 且无自定义角色，迁移后 admin、operator 都得到 assign_custom 与 {operator, user}（operator 的清单在 T55 收紧）。
- 回滚：revert 这个提交；表与列可保留（旧代码不读），或手工 `DROP TABLE role_assignable_roles; ALTER TABLE roles DROP COLUMN assign_custom; DELETE FROM schema_migrations WHERE id = '0097_role_assignable.sql';`。

## T10 M13、W1-F16、C-L3、U7：只认会话的权限与敏感标记口径

- 改动：目录把 `user:password:reset`、`role:define`、`role:assign`、`settings:manage` 标为 sessionOnly，经 T08 的 `authz.KeyAllowed` 自动生效：访问密钥的可选列表不再显示（超管也一样），创建或修改密钥时选它们 403（`details.missing`），已存密钥在校验时丢掉它们并在 `GET /me/access-keys` 的 `lost` 里列出；以它们注册的路由（`settings:manage` 下 30 条 `Perm`、`/roles` 写操作、`PUT /users/:id/roles`、带非默认角色的 `POST /users`、改他人密码等）对访问密钥一律 403，`PermAny` 组合路由仍按其他 key 放行。`sensitive` 口径定为凭证、资金、信任根、代码执行、身份与授权，补标 `account:own:delete`、`account:relay`、`group:manage`、`proxy:manage`、`price:manage`、`plugin:manage`、`plugin:grant:high`、`settings:manage`；它只用于展示，与访问密钥无关。不改路由、无迁移。
- 影响对象：存量带上述 4 个权限的访问密钥失去这些能力（其余权限照常），调用相应接口改为 403；用访问密钥改设置、管理角色、分配角色、重置他人密码的脚本需改用登录会话。`remote-fingerprint` 拨号任意 host:port 不接 netguard（wontfix，CONTRACTS §80），它属于 `settings:manage`，泄露的密钥不再能利用。角色编辑器里 8 个补标的权限多显示敏感标记；SyncCore 首次运行时更新 `permissions.sensitive`。
- 回滚：revert 这个提交即可，无迁移。回滚后存量密钥里仍保存着这些权限，会立即恢复生效；SyncCore 把 `sensitive` 改回原值。

## T14 设计 3.3、H1 第二道防线、决策 1、4：分配角色走可分配清单，super_admin 只能移交

- 改动：`authz.SetUserRoles` 改为只判断差集（新增、撤销的角色）：无变化直接成功、不写库；`super_admin` 任何人（含超管本人、超管的访问密钥）都不能经分配接口授予或撤销（403 `permission_denied`，提示走移交），系统（actor 0）只能授予初始超管（引导），不能撤销；每个新增或撤销的角色必须在操作者的可分配清单内（超管全部可分配），否则 403 `details.role`；唯一例外是给没有任何角色的用户授予默认角色 `user`；其后检查能作用于目标（给自己分配除外），以及新增角色的权限与可分配角色都在操作者之内（`details.missing` / `missing_assignable`）。有变化时写一条 `user.roles` 审计 `{added, removed}`。删除仍有持有者的自定义角色时，该角色须在操作者的可分配清单内（删除等于撤销）。删除 `errOwnSuperAdmin`、`errSuperuserGrantor`、`superChanged` 分支与未再使用的 `UserRoleKeys`；`EnsureNotLastSuperAdmin` 保留（禁用、删除用户）。
- 影响对象：
  - 超管不能再在用户页授予或撤销 `super_admin`（原先可以；撤销自己的原为 409，现为 403），也不能在创建用户时指定 `super_admin`；在超管移交（T16）合入前，换超管只能直接改库。
  - 持 `role:assign` 的非超管只能分配和撤销自己清单内的角色：存量 admin、operator（T13 迁移后为 operator、user + 全部自定义角色）不能再授予或撤销 admin；没有清单的自定义角色持有者（新建的自定义角色在 T15 接口前没有清单）不能再分配任何角色，只能建默认用户。访问密钥不能分配任何角色（`role:assign` 已是 sessionOnly，此项为纵深防御）。
  - 对权限比自己大的用户原样保存角色（无变化）不再 403。
  - 审计日志多出 `user.roles` 记录（引导与创建用户也会写一条）。
- 回滚：revert 这个提交即可，无迁移、无数据变化（已写入的 `user.roles` 审计行可保留）。

## T15 设计 3.4 后端、C-T1：可分配清单接口

- 改动：角色对象增加 `assignable_role_keys`（显式清单）与 `assign_custom`；新增 `PUT /roles/:id/assignable {role_keys, assign_custom}`（`role:define`，经 `editableRole`：超管角色 409；未知角色或含 `super_admin` 400；新增部分须在操作者可分配范围内，否则 403 `details.missing_assignable` / `missing_assign_custom`；整体替换；审计 `role.assignable`）；`POST /roles` 可带 `assignable_role_keys`、`assign_custom`，同样校验；`POST /roles/:id/reset` 同时恢复默认可分配清单（admin = operator、user + 全部自定义角色；operator = user；user 清空），操作者须能分配默认清单；新增 `GET /me/assignable-roles`（`AuthedRead`）列出调用者可分配的角色及能否授出（访问密钥下为 `[]`）。CONTRACTS §80 写明 AuthedRead 自身只读接口按访问密钥收窄计算（C-T1，仅文档）。无迁移。
- 影响对象：重置内置角色会丢掉手工加到其可分配清单上的角色（含 `assign_custom` 变化），重置者若不能分配默认清单（如非超管重置 admin 而自己没有 `assign_custom`）改为 403；角色对象多两个字段，旧前端忽略即可。
- 回滚：revert 这个提交即可，无迁移；经新接口写入的可分配清单保留在 `role_assignable_roles` / `roles.assign_custom` 中，回滚后仍按 T13 的规则生效。

## T16 设计 3.1.2、决策 1：超管移交

- 改动：新增 `authz.TransferSuperAdmin(ctx, tx, actor, target)`（`authz/superadmin.go`），是 `super_admin` 换人的唯一路径：`Bump` 后锁住超管持有行，操作者须是当前持有者（actor 0 = 服务器 CLI，T17 复用，同时可修复无超管或多超管），目标须未删除、启用中且不是本人；其余持有者先删超管行再补 `admin`，然后给目标加超管行；审计 `superadmin.transfer {from, to, via}`。新增 `POST /system/super-admin/transfer {target_user_id, current_password, code}`（`iam/superadmin.go`，`Authed`，访问密钥 403）：先判断调用者是超管（否则 403，不消耗登录限流），再确认本人（密码 + 两步验证），同一事务里移交并让降级者与目标的全部会话失效，提交后 `Committed` 与 `iam:user:changed` 广播。不强制目标已开启两步验证（D13 推荐默认，前端提示）。无迁移，不建唯一约束（T18）。CONTRACTS §5.2、§43.6 同步。
- 影响对象：只新增接口，已有接口行为不变。移交成功后原超管变为 `admin`（保留其他角色），原超管与新超管的所有登录会话立即失效、需重新登录；访问密钥不受影响（原超管的密钥随即按 `admin` 的权限收窄）。
- 回滚：revert 这个提交即可，无迁移；已完成的移交不会回退（如需恢复，按 T14 前的方式直接改 `user_roles`，或等 T17 的 CLI）。

## T17 设计 3.1.6、决策 2：服务器 CLI 恢复超管

- 改动：新增 `sub2api admin recover-superadmin --email <已有用户> [--reset-password] [--reset-2fa]`（`cmd/sub2api/admin.go`）与 `iam.RecoverSuperAdmin`：按邮箱找未删除用户，被禁用则先启用，再经 `authz.TransferSuperAdmin(actor 0)` 成为唯一超管（其余未删除的持有者降为 `admin`，已软删除的只去掉超管角色、不补 `admin`，以免恢复该用户时带回管理权限；双方全部会话失效）；`--reset-password` 设 24 位随机密码并只在 stdout 打印一次；`--reset-2fa` 清除两步验证与通行密钥。审计 actor 为 0（`superadmin.transfer` 的 `via` 为 `cli`）。命令读与服务相同的环境变量（`DATABASE_URL` 等），不跑迁移、不连 Redis、不广播，运行中的节点最长 30 秒后生效；重新登录立即可用（令牌的 `token_version` 比节点状态缓存新时该缓存项当场重读，生产备份验证发现过“登录成功、下一请求 401”的 30 秒窗口）。不新增 HTTP 恢复入口。`UpdateUser` 改他人密码时对系统（actor 0）不再检查 `user:password:reset`（系统没有角色，此前会被拒；HTTP 入口的 actor 永远不是 0）。CONTRACTS §43.6 同步。
- 影响对象：只新增命令，已有接口行为不变。
- 运维：多超管人工处理（T18 的超管唯一迁移检测到多个未删除的超管持有者时报错，服务不启动）：
  1. 从报错信息里的 user id 与邮箱中选出要保留的超管；
  2. 在服务器上以与服务相同的环境变量（配置校验需要 `DATABASE_URL`、`REDIS_URL`、`SUB2API_MASTER_KEY`、`SUB2API_JWT_SECRET`，Redis 并不连接）执行 `sub2api admin recover-superadmin --email <要保留的人>`；容器部署可用同一镜像起一次性容器，如 `docker compose run --rm <core 服务> sub2api admin recover-superadmin --email ...`。其余持有者降为 `admin`，相关会话全部失效；
  3. 重新启动服务，迁移即可通过。
  丢失超管密码或两步验证时同样用此命令，加 `--reset-password`、`--reset-2fa`，新密码只打印一次，登录后请立即修改。
- 回滚：revert 这个提交即可，无迁移；已执行的恢复不会回退。

## T18 设计 3.1.1、3.1.3、决策 1、2、W4-A4：超管全局唯一，删除 guardTarget

- 改动：迁移 `0098_one_super_admin.sql`：删除软删除用户的超管行；未删除的超管持有者（不论启用、禁用）多于一个时 `RAISE EXCEPTION`，信息列出 user id 与邮箱和处理命令 `sub2api admin recover-superadmin --email <要保留的人>`；`roles_one_superuser` 部分唯一索引（最多一个超管角色）；`user_roles` 上的延迟约束触发器 `user_roles_one_superuser`（提交时检查最多一个持有者，advisory 锁串行化并发，违反时 23505），移交的先删后插不受影响。不种角色、不依赖运行时 id，CLI 在迁移前后的库上都能用。iam 删除 `guardTarget`、`errProtectedTarget` 与别名 `assertTargetPermissionsWithinActor`：UpdateUser、DeleteUser、ResetSecurity 只经 `CanActOnUser` 判断目标（改他人密码时不再重复检查；改状态时仍在 `Bump` 之后复查一次）。CONTRACTS §43.6 同步。
- 影响对象：
  - 存量多个未删除超管的部署升级时迁移失败、服务不启动，须先按 T17 的运维步骤用 CLI 保留一个（生产核查只有 1 个超管，不受影响）。软删除用户残留的超管行被删除。
  - 非超管（含超管的访问密钥）修改、删除超管或重置其安全设置仍是 403，错误文案由 `only a super admin can modify a super admin` 变为 `you cannot modify a superuser`，并带 `details.superuser = true`；依赖旧文案的脚本需调整。
  - 直接改库再加一个超管持有者会在提交时失败（23505 `user_roles_one_superuser`）。
- 回滚：revert 这个提交，并手工 `DROP TRIGGER user_roles_one_superuser ON user_roles; DROP FUNCTION user_roles_one_superuser(); DROP INDEX roles_one_superuser; DELETE FROM schema_migrations WHERE id = '0098_one_super_admin.sql';`（不删也可，旧代码不会写第二个超管）。已删除的软删除用户超管行无需恢复。

## 期 1 生产备份验证修复（第 2 轮）

- 改动：
  - 决策 1：`authz.CanActOnUsers` 只对本人的登录会话免检“作用于自己”；经访问密钥时（`core.ByAccessKey`）密钥主人和其他目标一样比较（密钥收窄后不是超管，也小于主人的角色）。超管自己带 `user:update` 的访问密钥 `PATCH /users/<超管>` 改显示名、带当前密码 `DELETE /users/<超管>/security` 清两步验证与通行密钥，由 200/204 变为 403 `you cannot modify a superuser`（后者在核对密码之前拒绝；T48 起 `DELETE /users/:id/security` 改用只限登录会话的 `user:password:reset`，访问密钥在权限阶段即 403 `details.permission = user:password:reset`，到不了这一步）；非超管的访问密钥经 `/users/:id` 改自己的资料，密钥权限不覆盖主人角色时同样 403（改自己的资料走 `/me` 或登录会话）。
  - dynweight 原生界面：没有 `group:read` 时不再请求 `GET /groups`（分组名显示 `#id`），没有全量级 `account:read` 时账号列表工具栏的降级标记不再请求 `GET /p/dynweight/degraded`、不显示。own 级用户打开账号页不再出现这两个 403。随 dynweight 重新打包（T84 升版本）生效。
- 发布前提（T84，按 PLAN 裁决 24 各插件任务都不升版本）：本分支改了这些插件而没有升版本：ccgateway 0.1.132（T26 `upstreamFields`）、codex 0.1.3（T25 路由 `accounts`、T26、T42 代码）、dynweight 0.5.7（T25 路由 `accounts`、原生界面）、volcengine 0.12.6（T25、T26）、payment 0.1.0（T35 代码）、claude-oauth 0.2.2（T26、T42 代码，非内置）。生产库已按这些版本存了旧 manifest，内置安装器遇到同版本不同内容会保留已存的行（`install/builtin.go` 日志 `version already stored with other content, keeping the stored one`），registry 从库里的 manifest 读路由与账号类型，节点也可能继续用旧包，所以不升版本上线时插件路由的账号归属检查、`upstreamFields` 与上述代码修复都不生效（期 2 生产备份验证确认：`builtin-relink.sh` 只改写包摘要，库里仍是生产的 manifest）。任何一期单独上线前都必须先做 T84：升这些插件的 manifest 版本（`deploy/docker/build-go.sh` 从 manifest 读版本，不另维护清单）。
- 滚动升级与回滚（无代码改动，按此操作）：
  - 新旧节点混跑时，最后启动的节点决定权限目录：旧节点启动会把 `role:define`、`role:assign` 标为 removed、把 `role:manage` 恢复为 active、把 T10 补标的 8 个 sensitive 改回，新节点上 admin、operator 和自定义角色的持有者因此暂时失去角色管理，直到某个新节点重启。回滚时一次换掉全部节点；回滚后再升级时，保证最后启动的是新节点。超管不受影响；生产 admin、operator 无持有者、无自定义角色，实际影响近于零。
  - 回滚窗口里在旧版本上新建或修改、只勾了 `role:manage` 的角色，再次升级后不会自动得到 `role:define`、`role:assign`（`grantInherited` 只在新 key 首次插入时运行），也没有可分配清单（0097 的存量回填只在迁移时运行一次）。需要超管在角色页重新勾选并设置可分配清单。
  - 回滚到旧版本后，用旧版本给第二个用户授予 `super_admin` 会被 0098 的触发器拒绝，旧版本返回 500（日志 23505 `only one user may hold the super admin role`），数据不变式成立。
- 待确认（不改代码）：0097 按决策 3、T13 做存量等价迁移，生产 operator 得到 `assign_custom = true` 与 {operator, user}，宽于决策 5 的新库默认（operator = supplier、user）。生产 operator 目前 0 个持有者。若上线即按决策 5，超管执行 `POST /roles/<operator id>/reset`（同时恢复默认权限与默认可分配清单），或在 T55 一并收紧。
- 回滚：revert 对应提交即可，无迁移、无数据变化。

> 以下为期 2（T30–T49，三组分别开发后合并，按任务编号排列；整合审查的补充写在各条内，标“期 2 整合审查”）。

## T30 M3、W1-F4、W1-F8、W1-F9：代理拨号守卫与代理写范围收敛

- 改动：`proxy.newTransport(proxyURL, allowPrivate)` 改用 `netguard.Dialer`，连接代理时按解析后的 IP 拒绝私网、回环、链路本地地址（socks5 同样经过）；已存代理用 `allow_private || AllowPrivateUpstream`，`proxy_url` 的临时客户端只看 `AllowPrivateUpstream`，探测按调用者的写范围。`proxy.checkPrivate` / `privateScope` 成为“能否写私网代理、是否存 `allow_private`”的唯一判断（新建、修改、探测、`FindOrCreate` 共用），写路由用同一个 `writeScope`（`proxy:manage` / `proxy:own:manage`）注册。`PATCH /proxies/:id` 的地址（protocol、host、port）与现值不同时按新建判断并同步 `allow_private`（行先加锁读出现值）。探测保存改用写范围（此前按 `proxy:read` 判断，而这条路由不会匹配它，管理员被当成 own）。账号的 `proxy_url` 用 `core.ScopeOf` 一次得到“是否允许 + 写范围”；`POST /account-types/:p/:t/models/fetch` 的 `proxy_url` 走同一个 `parseProxyURL`。CONTRACTS §21.4、§43.3 同步。无迁移。
- 影响对象：
  - `AllowPrivateUpstream` 关闭（生产默认）时，`allow_private = false` 的代理（own 级建的，或 0027 之后经 `proxy_url` 自动建的）如果域名解析到非公网地址，测试与实际请求由成功变为失败。非公网按 `netguard.BlockedAddr`：除私网、回环、链路本地外，还包括 100.64.0.0/10（CGNAT、Tailscale）、198.18.0.0/15（Clash/Surge 类 fake-IP DNS）、NAT64、6to4 等；服务器使用 fake-IP DNS 时，所有按域名填写的 `allow_private = false` 代理都会失败。升级前可查 `SELECT id, name, host FROM proxies WHERE NOT allow_private` 并在服务器上逐个确认解析结果；确需保留的由持 `proxy:manage` 的人把地址改动一次再改回（如先改端口再改回，两次 PATCH），存为 `allow_private = true`。
  - `PATCH /proxies/:id` 只在地址（protocol、host、port）与现值不同时重新判断：只持 `proxy:own:manage` 把自己的代理改到私网地址，或改动管理员放在私网地址上的代理的端口、协议，由成功变为 403；own 级改地址会把 `allow_private` 置回 `false`，`proxy:manage` 改地址置为 `true`。原样带回地址的编辑（控制台每次都带全部字段）不改 `allow_private`。
  - `AllowPrivateUpstream` 开启的部署（测试环境）：own 级新建或经 `proxy_url` 自动建的代理此前存 `allow_private = true`，现在存 `false`（只反映写入者的权限，使用时仍由部署开关放行）；以后关掉开关时这些行不再默认可达私网。
  - 探测与测试结果里，被拨号守卫拒绝时的 `message` 为固定文案，不再带出域名解析到的内部地址。
  - 探测保存：`proxy:manage` 现在能复用他人的代理并存为 `allow_private = true`（此前会另建一行、`allow_private = false`）。
  - 账号 `proxy_url`：有 `proxy:read` 但只有 `proxy:own:manage` 的用户不再匹配他人的代理（另建自己的行），建出的行 `allow_private = false`；有 `proxy:manage` 而没有 `proxy:read` 的用户反过来能匹配全部。
  - 没有任何代理写权限的用户在 `models/fetch` 带 `proxy_url` 由成功变为 403（`details.permission = "proxy:own:manage"`）；`proxy_id` 不受影响。
- 回滚：revert 这个提交（与 review fixes）即可，无迁移；期间由 PATCH 改写的 `allow_private` 保留，旧代码按其现值使用。

## T31 W1-F12：他人账号在用的 own 代理，属主不能改连接字段

- 改动：`PATCH /proxies/:id` 在 own 范围、且连接字段（protocol、host、port、username、password）与现值不同时，统计该代理上不是调用者创建的未删除账号（`proxy.inUseByOthers`，与修改在同一事务、代理行已加锁），大于 0 返回 409 `proxy_in_use`（`details.account_count`）。删除的占用计数改用同一函数（统计全部账号，行为不变）。CONTRACTS §21.2 同步。无迁移。
- 影响对象：供应商（只持 `proxy:own:manage`）的代理被管理员挂到别人的账号上之后，供应商改地址、用户名、密码由成功变为 409，需由持 `proxy:manage` 的人修改，或先把那些账号换到别的代理；改名称、启停不受影响（停用仍会让这些账号不可用，未改）。`proxy:manage` 不受影响。只统计账号：他人尚未建成账号的预备容器与 ccgateway 草稿运行环境（`account_preparations.proxy_id`、`ccgateway_runtimes.proxy_id`，短期存在）引用该代理时不拦（已知缺口，删除代理的占用计数同样不含它们）。host 只有大小写不同视为未改，也不写入。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T32 M4：WebSocket 每轮重新鉴权

- 改动：`gateway/websocket.go` 的会话记住握手时的 API key 与客户端地址；每条客户端消息在开始一轮之前先 `wsSession.refresh`（`Auth.Authenticate`，与握手同一路径），成功后这一轮用新的 principal（限速、额度、分组信息、倍率）。401/403（密钥被撤销、禁用、过期，用户被禁用，IP 不在白名单等）→ 发 error 事件并以 1008 关闭会话；其他鉴权错误（如存储暂不可用）→ 只这一轮失败，会话保留；首轮之后密钥换了分组 → 409 `api_key_group_changed` 并以 1012 关闭（上游连接属于旧分组的账号，客户端重连后按新分组调度）。在这一步被拒的轮次不写用量记录（与 HTTP 鉴权失败一致）。进行中的那一轮不打断；空闲会话的定时复检延后。 期 2 整合审查补充：消息的格式检查（JSON 对象、形状限制、`type=response.create`）移到 `refresh` 之前（`wsMessageError`），垃圾消息不再各触发一次查库；`refresh` 加 10 s 期限（`wsLimits.auth`），会话上下文本身没有期限，存储挂起时不能卡住会话循环（ping、排空、客户端关闭）。
- 影响对象：此前 WebSocket 会话整个生命周期使用握手时的 principal，密钥撤销、额度用尽、限速修改要等客户端重连才生效；现在在下一轮生效。长连接客户端在密钥失效后会收到 1008（不应重连），换分组后收到 1012（应重连）。每轮多一次 `Authenticate`（与一次 HTTP 请求相同的开销）。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T33 M7、C-L7：调余额与用户组成员、个人专属接入 core.ActOnOthers（产品性收紧）

- 改动：`billing.Service` 增加 `Users core.UserGuard`，`adjustBalance` 在 `Apply` 之前 `core.ActOnOthers(ctx, core.GuardOrDeny(s.Users), operator, id)`；`segment.Deps` 增加 `Users`（`New` 里 `core.GuardOrDeny`），`addMembers`（整批 `user_ids`，事务之前，一条 SQL）、`makePersonal`、`removePersonal`（路径上的用户）经 `Service.actOnOthers` 做同一检查；`app/phases.go` 把 authz 注入两处。未注入时一律拒绝（500），不会 panic 或放行。CONTRACTS §5.2、§5.5、§97.6 同步（含 wontfix：`PATCH/DELETE /segments/:id`、`PUT /segments/:id/groups`、`PUT /groups/:id/segments`、分组专属价作用于用户组本身，不做目标用户检查，个人专属（只有一个成员）也按用户组处理；`POST /usage/:id/refund` 延后）。
- 影响对象：
  - 持有 `balance:adjust` 的任何人（包括超管，决策 D6）给自己调余额：由 200 变为 409 `you cannot do this to yourself`。超管全局唯一（T18）且只有超管能操作超管，所以超管的余额不能再由任何人经这个接口调整；核心里没有别的人工入账途径（账本只有用量、`admin_adjust`、插件入账/扣款、退款），需要时由支付类插件入账，或用另一个账号调用网关。
  - 持有 `balance:adjust` / `segment:manage` 的非超管给超管、或给角色权限超出自己可授予范围的用户调余额、移用户组、设/取消个人专属：由成功变为 403（`you cannot modify a superuser` / `you cannot modify a user with higher privileges`）。
  - 持有 `segment:manage` 的人把自己移入用户组、给自己设/取消个人专属：由成功变为 409；批量移入的 `user_ids` 里含本人或不可操作的用户时整批拒绝。经访问密钥调用同样适用（密钥主人不能给自己调）。
  - 前端未改：用户列表里对本人、对超管的“调整余额”“设为个人专属”等按钮仍显示，点击后得到上述 409/403 提示（按钮按目标隐藏可在前端任务里跟进）。
  - 已知未覆盖：持有 `segment:manage` 的人不能把自己移入别的用户组，但仍能修改自己所在用户组（含自己的个人专属）的折扣、授权、专属倍率与专属价（wontfix，见 CONTRACTS §97.6“目标用户检查”）；软删除但仍留有角色行的高权限用户作为目标时回 403 而不是 404/400。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T34 M11：用量详情的账号与本人视图字段（Detail.hideAccounts / redactForSelf）

- 改动：`usage/api.go` 新增 `Detail.hideAccounts`（记录的账号 + `hook_decisions` 各项的 `account_id` + `settlement.account_id`；`hook_decisions` 不是数组时整个不返回）与 `Detail.redactForSelf`（`hideUpstream`、`hideAccounts`，并清空 `plugin_version`、`sticky_rule`、`expr_hash`、`node_id`、`plugin_detail`、`anomalies`、`settlement`、`request_log_account_id`）。`GET /usage/:id` 没有 `account:read` 的分支改调前者，`GET /me/usage/:id` 只调后者。CONTRACTS §5.5、§15.2 同步。
- 影响对象：
  - `GET /me/usage/:id` 与没有 `account:read` 的 `GET /usage/:id`：`gateway.attempt` 钩子决定里的 `account_id` 不再返回（此前泄露了尝试的账号 id）。
  - `GET /me/usage/:id`：`plugin_version`、`sticky_rule`、`expr_hash` 由原值变为空串。用户自己的用量详情页因此不再显示“粘性规则”卡片和计价表达式的哈希行（两处都是有值才渲染，前端无需改动；`sticky_hit` 仍在）。`metrics` 没有动：前端把其中每一项都展示给用户（缓存写入依据与 `u("key")` 用量事实），也是计价的输入，没有可判定为内部的子集。
  - `GET /me/usage/:id` 的 `billing_detail` 不再带计价表达式与哈希（`withoutExpressions`：`inputs.pricing.base.{expression,expr_hash}`、各附加/替换组件的 `expression_hash` 与 `inputs` 里的整条 `Price`）；前端只用 `base` 是否存在与组件的 `Tokens`/`Metrics`，不受影响。
  - 已知未处理（不在本任务范围，改的是网关的计费记录）：ccgateway helper 轮次的替换组件用上游模型名记账（`gateway/helper_history_response.go`），`billing_detail.replacement[].model` 因此对本人视图仍可见上游模型；`hook_decisions[].note` 是插件的自由文本，原样返回。
  - 有 `account:read` 的 `GET /usage/:id` 不变。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T35 M12：payment webhook 删除 mock，未注册验签器时 501

- 改动：`HandlePaymentNotification` 不再用写死的 `mock_out_trade_no` 当作已验证通知。按 `:provider` 查 `payment_provider_instances` 里启用的实例：没有则 404；渠道没有注册 `NotificationVerifier`（`notification.go`，以后接入真实验签的接口，`OrderService.RegisterVerifier`）则 501；验签器对所有实例都不接受则 400；只有验证通过且状态为成功的通知才会改订单并入账，金额不符 400，其他内部错误 500（原先一律 400 并回显错误文本）。任何失败都不改订单状态。本次不实现任何具体渠道的验签。
- 影响对象：payment 插件的 webhook 现在对所有渠道回 404 或 501（仓库里没有任何验签器），在真实验签接入前不会有订单经 webhook 入账。原实现只会查找 `mock_out_trade_no` 这一个不存在的订单并回 200，从未入账，所以没有可用功能被关掉；对接方会从 200 变为收到 404/501。错误响应不再带内部错误文本。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T36 W1-F5：ccgateway 请求日志设置不再接受 own 级（产品性收紧，单独提交）

- 改动：`PUT /system/ccgateway/accounts/:id/request-logs` 只接受 `settings:manage`、`account:update`，去掉 `account:own:update`（T38 起连 `settings:manage` 也不再接受，只剩 `account:update`，以 T38 与 CONTRACTS §65 为准）；控制台运行环境页的日志级别、开关、清除按钮按同一口径判断（`canLogs`）。GET 不变。CONTRACTS §65 同步。无迁移。
- 影响对象：只有 `account:own:update` 的用户（供应商）不能再修改自己账号的请求日志级别、开启完整记录或清除日志，接口由 200 变为 403，控制台里对应控件置灰或隐藏；仍可查看当前设置。已保存的账号级别设置保持生效。持有 `account:update` 或 `settings:manage` 的角色（内置 admin、operator 的默认权限）不受影响。未覆盖的间接途径：own 级仍可重新授权、删除自己的账号，运行环境被替换或清理时其中的日志随之消失（接受，不在本项范围）。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T37 W1-F14：草稿路由去掉 update 残留权限

- 改动：删除 `draftUseKeys`，五条 `/system/ccgateway/drafts*` 路由都只接受 `settings:manage`、`account:create`、`account:own:create`。`ccgateway.ReauthDraft`、`CommitReauth` 去掉不再使用的调用者与范围参数（重新授权在账号现有运行环境上原地进行，归属由账号接口先行检查）。CONTRACTS §49.9、§49.17 同步。无迁移。
- 影响对象：只有 `account:update` / `account:own:update`、没有任何 create key 的用户访问按 key 的草稿接口由 404（看不到别人的草稿）或 200（自己建的草稿，但没有 create key 本就建不了）变为 403。重新授权流程不经过草稿接口，不受影响。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T38 W1-F6、W5-A7、D15：按账号的运行环境只认 account:*（产品性收紧，单独提交）

- 改动：新增共享原语 `core.AccountScope(action)`（`account:<action>` / `account:own:<action>`，`AccountsInScope` 与路由注册共用）。`ccgateway.RuntimeScope(method)`（读 = `account:read` / `account:own:read`，其余 = `account:update` / `account:own:update`）成为 `/system/ccgateway/accounts/:id/:action`、`cc-features`、`cc-features/preview` 与 `reauthorize`、`reauthorize/:key/commit` 的唯一 key 来源，不再包含 `settings:read` / `settings:manage`；`PUT request-logs` 只认 `account:update`。归属判断删除 `callerScope` 与两份手写 EXISTS，改调 `core.AccountAccess`（`ccgateway.Service.Accounts`，由 app 注入账号模块；未注入时 503），账号类型等附加条件仍在 ccgateway 自己的查询里。控制台：运行环境页的行操作（启动、重新授权）只按该行的 update 判断，请求日志控件只按 `account:update`；账号编辑里的重新授权面板不再把 `settings:*` 当作可读可写。CONTRACTS §49.5、§49.17、§65 同步。无迁移。
- 影响对象：只有 `settings:read` / `settings:manage`、没有账号权限的角色，访问某个账号的运行环境状态、会话、健康、特性预览、请求日志设置，或对其同步、启动、授权、登出、重新授权，由 200 变为 403；控制台里对应按钮隐藏或置灰。需要这些操作的角色要另外授予 `account:read` / `account:update`（或 own 级）。settings 管理员仍可管理控制器、镜像、Worker 升级、清理、保留的运行环境、CLI 管理与默认规则，请求日志查看接口（列表、详情、文件）仍接受 `settings:read` / `settings:manage`；但查看器的搜索能力取自 `GET accounts/:id/request-logs`，只有 settings 权限、没有账号读权限的人从使用记录打开查看器时搜索筛选不显示（列表与详情照常）。`/system/ccgateway/cli/:id`（按账号 id 寻址的 CLI 管理）按镜像与控制器管理保留在 `settings:*`，不做归属检查（待确认是否随 T70 调整）。内置 admin、operator 默认同时持有 `account:read`、`account:update`，不受影响。后续任务（T70）不得把 `settings:*` 加回这些路由。
- 期 2 生产备份验证修复：控制台 `/system/ccgateway` 页的路由守卫原只认 `settings:read`，与上面的后端口径不符（只有 own 级账号权限的人被挡在页外，只有 settings 权限的人进来后运行环境列表全部 403）。现在页面接受 `settings:read` 或账号列表的 key（`account:read` / `account:own:read`）：设置部分只给 `settings:read`；运行环境卡片里的账号列表只给有账号读权限的人（不再请求 `GET /accounts` 与各行状态），清理与保留的运行环境仍按 `settings:*` 显示，所以只有 settings 权限的人仍能清理、管理保留的运行环境；只有账号权限时页面只显示运行环境卡片；账号授权面板里“打开设置”按钮只给 `settings:read`。回滚：revert 该提交。
- 不改（wontfix）：own 级调用者在特性预览里能看到继承值及其来源（分组与全局策略）；`GET health` 会记录运行环境上报的订阅类型、草稿的 `GET status` 会更新 `last_seen_at`（W1-F7）。代码里有注释。
- 回滚：revert 这个提交（与 review fixes）即可，无迁移、无数据变化。

## T39 W5-A6、D7：删除 /system/ccgateway/connect

- 改动：删除 `POST /system/ccgateway/connect` 的路由与处理函数（连同只为它服务的 `ccgateway.Service.Ready`、请求体上限与 503 文案）。它以 `settings:manage` 注册，再用 `core.WithGranted` 给请求补上 `account:create` 走创建流程，是代码里唯一伪造路由命中权限的地方。控制台不调用它（已 grep 确认，`next/web/src` 无引用；开发 mock 里残留的处理器一并删除）。它创建时既不带 `ccgateway_runtime` 也不带 `preparation_key`，而真实的 `managed` 类型要求先准备运行环境，所以这条接口在生产上本就只会返回 400。原测试改用 `POST /accounts`。CONTRACTS §41.5、§49.6 同步。无迁移。
- 影响对象：仍调用这条接口的外部脚本收到 404，改用草稿流程（CONTRACTS §49.9、§49.10：`POST /system/ccgateway/drafts` → 授权 → `POST /accounts` 带 `ccgateway_runtime`；需要 `account:create` 或 `account:own:create`）。控制台不受影响。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T40 C-T2、W5-C3：AuthzCheck 只免授权查询本插件的权限

- 改动：宿主 `AuthzCheck` 只对本插件的权限 key 免授权：manifest `userPermissions` 里声明的本地 key，或 `plugin.<本插件>:` 开头的完整 key（`hostServer.qualify` 返回 `(key, own)`，用 `manifest.LocalPermission` / `PermissionKey` 判断）。查询核心 key（如 `user:read`，包括未在 manifest 声明的本地写法）或其他插件的 key 需要新的宿主权限 `authz.read`（风险 medium，需管理员批准），没有时返回 `PermissionDenied`，不调用鉴权器。`HostPermissionRisk`、控制台风险表与中英文标签同步增加 `authz.read`。
- 影响对象：仓库 15 个插件都不受影响（只有 moderation 调 `AuthzCheck`，查的是自己的 `moderation:read`）。第三方插件若用 `AuthzCheck` 查核心或其他插件的权限，升级核心后调用失败，需在 manifest `hostPermissions` 申请 `authz.read` 并由管理员批准。用未声明的本地 key 调用（原先按核心 key 原样查询，除超管外结果为 false）现在同样需要该授权。保留的已知情况：超管对任何 key 都返回 true，所以插件凭自己的 key 仍能判断某个用户是不是超管（“本插件 key 免授权”的固有结果，改动前同样如此）。`pluginsdktest.FakeHost.AuthzCheck` 不模拟这条规则，插件作者的单测查核心 key 仍会通过，以真实宿主为准。
- 回滚：revert 这个提交即可，无迁移。已批准的 `authz.read` 授权行留在 `plugin_permission_grants`，旧代码不读它。回滚后 `authz.read` 不在 `HostPermissionRisk` 里，声明了它的第三方 manifest 会在安装、升级的校验中被判为未知宿主权限，需去掉该声明；这类插件应把 `hostCompat` 设为包含本提交的核心版本。

## T41 W2-F9a：插件设置的密钥掩码，打包校验与运行时共用一份读法

- 改动：新增 `manifest.SettingsSecrets(schema) (fields, unreachable)`（`sdk/manifest/settings_secrets.go`），是设置 schema 里 `writeOnly`、`format: password`、`x-sensitive` 标记的唯一读法；核心原来的 `secretFields` 删除，改为调用它。`fields` 是沿 `properties` 嵌套对象能到达的标记（最多 8 层，被标记的属性整体掩码、其下不再列出）；`unreachable` 是到达不了、因而无法单独掩码的标记位置：`items`、`additionalProperties`、`patternProperties`、`allOf`/`anyOf`/`oneOf`、`if`/`then`/`else`、`$defs`、`dependencies` 等任何其他关键字之下的、超过 8 层的；schema 里只要有任何标记，其中每个引用（`$ref`、`$dynamicRef`、`$recursiveRef`）都算不可达（不解析引用的去向：百分号编码、内嵌 `$id`、锚点等都会让解析结果与校验器不一致，所以带密钥的设置 schema 不能用引用）；根节点本身带标记、或 schema 文件不是 JSON 对象时，根（`""`）不可达。读取代价与 schema 大小成线性。
  - 打包（`manifest/check`）：`ui.settings` 的 schema 有 `unreachable` 时报 `ui.settings.schema` `unmaskable_secret`，列出位置。
  - 运行时（`GET|PUT /plugins/:key/settings`）：已安装的旧包若有 `unreachable`，含这些标记的顶层设置整块按凭据掩码（`manifest.UnmaskableFields`）；标记不属于某一个顶层设置时（含 schema 文件不是 JSON 对象）全部顶层设置掩码。没有 schema 却存了值的插件，每个顶层键都按凭据掩码。回传掩码沿用原值、只凭插件权限修改时须重填沿用的凭据，这两条规则对整块掩码的设置同样生效。
- 影响对象：
  - 仓库 4 个带设置 schema 的插件（growth、guard、mailer、moderation）没有不可达标记，行为不变。
  - 第三方插件：schema 在数组项等位置标记密钥的、带标记又用了 `$ref` 的（即使引用的是不含密钥的定义）、或 schema 文件不是 JSON 对象的，重新打包、上传安装时校验失败，需把密钥改成对象属性并去掉引用；已安装的照常运行，但对应的顶层设置在设置页显示为 `******`，schema 表单无法逐项编辑它（需整块重填，或升级到改过 schema 的版本）。此前这些值在 `GET` 里是明文返回的。
  - 没有设置 schema 的插件：`GET /plugins/:key/settings` 的 `values` 由明文变为全部 `******`（空串与 null 除外），`secret_fields` 列出各顶层键。仓库里这类插件都没有存设置值，不受影响；经 API 直接读写这类设置的脚本读不到原值，写入时未改的键回传 `******` 即可（不回传的键照旧被删除；只凭插件权限、没有 `plugin:manage` 的人要改动任何一项，须把保留的每个键都重填）。
  - 被标记的对象属性之下的嵌套标记不再单独出现在 `secret_fields`（整个对象已是一个掩码字段）。
- 回滚：revert 这个提交即可，无迁移、无数据变化（存储的设置值从不含掩码）。

## T42 W2-F9b：OAuth 授权会话绑定发起人，claude-oauth 核对 state

- 改动：SDK 新增 `pluginsdk.SaveCallerSession` / `LoadCallerSession` / `UpdateCallerSession`（`sdk/pluginsdk/session.go`）：把多次请求的流程状态存进插件 KV，存储形式 `{"uid": 发起人, "v": 内容}`，会话 id 由 SDK 生成（192 位随机）；读取时比对调用者，会话不存在、已过期、属于他人、或不是这种格式，一律返回 `ok=false`，无法区分；没有登录调用者的请求不能创建会话（`ErrNoCaller`）。`UpdateCallerSession` 是任务说明之外补的第三个函数：codex 设备码轮询要原地改写已有会话（记录上次轮询时间、放慢间隔），它只能用于刚由 `LoadCallerSession` 读到的会话。测试工具 `pluginsdktest.Harness` 增加 `DoAs(userID, ...)`。
  - claude-oauth：`/auth/start`、`/auth/exchange` 的会话改用上述助手；`exchange` 时 code 里带的 state（`code#state`）非空且与会话的 state 不一致（常量时间比较）回 400 `state_mismatch` 并删除会话，不向上游发请求。
  - codex：设备码与 Sign in with ChatGPT 两种会话改用上述助手；重置次数缓存不是会话，改名为 `loadCached` / `saveCached`，行为不变。 期 2 整合审查补充：`UpdateCallerSession` 原先不检查 id 之前属于谁（注释要求调用方先 `LoadCallerSession`），现在自己先按调用者读一次，不是调用者的会话（不存在、过期、别人的）返回 `ErrNoSession` 且不写入，避免以后有插件拿请求里的 id 直接调用时变成会话固定/覆盖原语。
- 影响对象：
  - 他人拿到 `session_id` 也无法继续别人的授权：claude-oauth `exchange` 回 404 `not_found`，codex 设备码轮询回 `expired`（与会话不存在时的回答相同，仍是 200 的轮询结果，不是 HTTP 404），codex SIWC `exchange` 回 404 `session_expired`；会话保留给发起人。
  - 升级时尚未完成的授权会话（旧格式，没有 `uid`）一律按不存在处理，需重新发起授权（claude-oauth 会话最长 30 分钟，codex 设备码 15 分钟，SIWC 以其会话有效期为准）。回滚时同理：新格式的会话旧代码读不出内容，需重新发起。
  - 授权的发起与完成必须是同一个登录用户（同一用户的不同浏览器仍可；这些路由本来就不接受访问密钥）。
  - claude-oauth 粘贴的 code 若带着另一次授权的 state，原先会原样转给上游，现在 400 且该会话作废（首尾空白不算不一致）。这只是防粘错：不带 state 的 code 照旧转给上游，由 PKCE verifier 保证它属于本会话。没有登录用户时发起授权回 401。
  - 随插件重新打包生效（版本在期 4 统一升）。
- 回滚：revert 这个提交即可，无迁移；进行中的会话需重新发起。

## T43 D22：ccgateway 请求日志的 metadata 按白名单投影，错误原文只给 settings:manage

- 改动：`GET /system/ccgateway/accounts/:id/request-logs/requests/:log` 的 `metadata` 经 `projectMetadata`：命中 `settings:manage` 原样返回，否则只保留 `requestLogSummaryKeys` 列出的摘要字段，且值必须是标量或字符串数组；默认拒绝（Worker 新增字段默认只给 `settings:manage`）。审查补充（超出任务原定的“详情”范围，D22 要求）：列表每行的 `error` 是同一段上游错误原文，控制台详情概览里的“错误”一行也取自列表行，所以列表路由增加 `settings:manage` 这个 key，未命中它的调用者 `error` 置空。CONTRACTS §64.2 同步。无迁移，不改 Worker。
- 影响对象：只有 `account:read` 或 `settings:read` 的查看者不再看到上游错误原文（列表悬浮提示、详情概览的错误行只剩 `error_type`），详情概览“全部字段”里的 JSON 只剩摘要字段（`messages`、`log_directory` 以及可能出现的身份字段等不再出现）；`error_type` / `error_code` / `error_source`、状态、模型、耗时、会话标识、摘要值等仍可见。`settings:manage` 不受影响；只有 `settings:manage`（没有 `settings:read`、`account:read`）的调用者现在也能读列表（此前只能读详情）。
- 未覆盖（已知缺口，待确认是否另立任务）：详情的 `events` 没有投影，`content:false` 只让 Worker 把每个字符串截到 256 字节，资源类事件的 detail 仍可能带错误文本、`principal_id`、路径与查询串、上传文件名；`upstream_request` 与请求、响应头只按名字遮蔽密钥头，其余键与头原样透传（含会话标识、`anthropic-beta`）；白名单里的 `error_type`、`error_code` 在来源为上游时取自上游响应体（各 ≤512 字符），`path`、`model`、`anthropic_beta` 等是客户端或 CLI 给出的短字符串，未做字符集检查。
- 回滚：revert T43 的两个提交（实现与 review fixes）即可，无迁移、无数据变化；只想恢复列表的错误原文时 revert review fixes 这一个。

## T44：/plugin-ui 非当前版本的资源，先按路径拒绝再加载包

- 改动：`GET|HEAD /plugin-ui/:key/:vh/*path` 请求的不是本节点当前版本时，原先一律先 `ReadVersionAsset`（加载该版本的包）再用 `assetAllowed` 判断；现在路径既不在公开目录（`ui/`、`forms/`、`i18n/`，`prefixAllowed`）下、扩展名也不像图标（核心能当图片返回的类型：`.svg`、`.png`、`.webp`、`.ico`、`.jpg`、`.jpeg`、`.gif`，不分大小写，`looksLikeIcon`；任务说明只列了前四种，后三种是审查后补的，避免旧版本的 jpg/gif 图标取不到）时直接 404，不加载包。通过预检的请求在读到包后仍按完整的 `assetAllowed`（公开目录或 manifest 声明的图标，`iconAllowed`）判定。当前版本的路径不变。不加缓存（LRU、singleflight 延后）。
- 影响对象：这个接口不需要登录，原先任何人都能用任意路径让节点反复加载旧版本的包；现在只有公开目录和图标样式的路径才会触发加载。正常页面不受影响。可见的变化：被预检拒绝的路径一律是空 body 的 404，不再出现版本不存在时的 JSON 404 或加载包失败时的 5xx；旧版本（非当前版本）的 manifest 图标放在公开目录之外且扩展名不在上述列表里（如 `.bmp`、无扩展名）时，按旧版本地址取它会 404，当前版本不受影响，仓库插件的图标都是 `.svg`。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T45：外壳 tokenless 管理开关的指标与 preflight 警告

- 改动（`next/gateway/internal/control`）：包级 `tokenlessStats{enabled, accepted}` 由 `RequireManagementToken` 写入（构造时记下开关，每放行一个无令牌请求加一）；管理 socket 的 `/metrics` 追加 `gateway_management_tokenless_enabled` 与 `gateway_management_tokenless_accepted_total`；开关打开时 `POST /system/upgrades/preflight` 的结果附 `warnings`（`Preflight.Warnings`，`omitempty`）。鉴权行为与函数签名不变，开关的删除延后。CONTRACTS §（外壳管理 socket 令牌）同步。
- 影响对象：只新增输出。开关打开的部署在 preflight 响应里多一个 `warnings` 字段（核心原样转发；升级页目前不展示它，不影响“可以创建”的判断）；抓取 `/metrics` 的监控多两个序列。计数是进程内的，外壳重启归零。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T46 B1 后端：X-Authz-Version 响应头与 Me.authz_version

- 改动：`authz.Service.Version()`（读锁返回 `minVersion`，不查库）实现新的可选接口 `core.AuthzVersioner`；`httpapi.Router` 的认证中间件在认证成功后写响应头 `X-Authz-Version`（`httpapi.HeaderAuthzVersion`，authorizer 没有实现该接口时不写）；`iam.Me` 增加 `authz_version`（取 `PermissionSet.Version`）。`authz.Start` 在 `SyncCore` 之后读一次版本，节点从第一个请求起就报告库里的版本，而不是等到第一次变更或 30 秒轮询。`TokenPair` 不变。CONTRACTS §5.2 同步。 期 2 整合审查补充：插件路由代理自己调用 `httpapi.Authenticate`、不经过 `Router.auth()`，原来不带这个头；改为导出 `httpapi.StampAuthzVersion`，插件 admin/user 路由认证通过后同样写入。
- 影响对象：只新增输出。控制台 API 所有通过认证的响应多一个头；`GET /me` 多一个字段。登出、撤销会话、改密码走 iam 自己的 `iam:user:changed`，不推进这个版本，前端不会因他人登出而刷新权限（创建、删除、启用/禁用用户与角色、授权、目录变更一样会推进）。头是本节点在认证那一刻已知的版本：变更请求自身的响应不反映该变更，多节点下可能短暂落后或领先于取 `/me` 的节点，前端按“头大于 `max(/me 的 authz_version, 上次触发重取的头值)` 才重新取”判断，同一个头值至多重取一次；跨域部署读取这个头需要 `Access-Control-Expose-Headers`（核心目前不发 CORS 头，同源部署不受影响）。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T47 M1-b：宿主 AccountScopeCheck 与 SDK 的账号范围、权限助手

- 改动：
  - proto：`HostService.AccountScopeCheck(AccountScopeCheckRequest{user_id, action, account_ids}) → AccountScopeCheckResponse{all, allowed_ids}`，需要宿主授权 `accounts.read`（风险表里已有的中风险权限，`ListAccounts` 用的同一个，不新增概念），生成代码已重新生成。
  - 宿主（`grpcruntime/host.go`）：先 `h.require("accounts.read")`；再校验参数（`user_id > 0`、`action` 非空、id 为正且不超过 `manifest.MaxAccountBatch` = 500）；再要求 `user_id` 是本实例正在处理的 `HandleHTTP` 请求的调用者（`grpcruntime/callers.go` 的 `callerSet`：`httpAdapter.HandleHTTP` 在转发期间按 `Caller.user_id` 计数，返回即减；不在其中 → `PERMISSION_DENIED`）；然后把 `Accounts` 断言为 `core.AccountAccess` 转调 `AccountsInScope`，即核心代理检查插件路由账号归属用的同一个实现；错误经 `toStatus` 映射（两种 account key 都没有 → `PERMISSION_DENIED`，未知 action → `INVALID_ARGUMENT`），没有接入时 `UNAVAILABLE`。
  - SDK（`pluginsdk/accounts_scope.go`）：`AccountScope{All}` 及 `Allows`、`Filter`；`ResolveAccountScope(ctx, host, req, action, ids...)`（去重、按 500 分批，调用者取自 `req.Caller`）；`RequireAccounts(...) *HTTPResponse`，nil 表示全部可操作，否则给出与核心 `core.AuthorizeAccounts` 相同的回答：无登录 401、两种 key 都没有 403、own 范围不带 id 403、含不在自己范围内的账号 404、宿主答不了 503；未知 action 或非正数 id 是插件自己的错误，一律 400（核心代理对非正数 id 是按不存在处理，这是两者唯一的差别）。鉴权器自身出错时共享原语按“没有权限”处理，所以表现为 403 而不是 503，与核心代理一致。这部分判定在 SDK 里是照 `AuthorizeAccounts` 的语义写的（SDK 不能依赖 server 包），范围计算本身只在核心。
  - SDK（`pluginsdk/http.go`）：`RequirePermission(host, perm, next)`：没有登录用户 401，没有权限统一 403（不说明缺哪个权限），宿主答不了 503；`Forbidden()`、`Unauthenticated()` 两个信封助手。
  - `pluginsdktest.FakeHost.AccountScope` 回调（不设时回答“全部账号”），参数校验与宿主一致；`FakeHost.Serve(userID)` 标记“正在处理该用户的请求”，`Harness.Do`/`DoAs` 自动调用，不在其中的 `user_id` 与宿主一样 `PERMISSION_DENIED`（fake 不模拟授权，`accounts.read` 不检查）。
- 影响对象：只新增接口，已有行为不变；本次没有插件改用它们（期 3 接入）。旧核心对 `AccountScopeCheck` 回 `UNIMPLEMENTED`，`RequireAccounts` 因此回 503（失败收紧），依赖它的插件需把 `hostCompat` 设为包含本提交的核心版本；Host API 版本号不升（与 `SendAccountRequest` 的做法一致，避免滚动升级时被拒）。`AccountScopeCheck` 按用户的角色权限计算，不带访问密钥的收窄：插件的 admin/user 路由本来就不接受访问密钥。调用边界（期 2 整合审查后收紧，原方案“总是授予”作废）：最初任何已启用的插件不需要授权就能问任意 `user_id`，等于绕过 `authz.read` 读到 6 个核心 account key，并能按 500 一批扫描某用户创建了哪些账号，无限速、无审计。现在 (1) 插件必须持有 `accounts.read`（管理员在安装时批准，中风险）；(2) 只能问自己正在处理的请求的调用者，该用户此刻本来就在用这个插件，所以插件得不到别的用户的信息，也无法在后台批量扫描。`user_id` 仍由插件传入（Host 调用与请求走的是两条独立的 gRPC 通道，没有可靠的请求上下文可取），由宿主校验它与在途请求的调用者一致；同一用户并发多个请求时任一在途即可。使用这两个助手的插件必须在 manifest 的 `hostPermissions` 里声明 `accounts.read`，并且只在 HTTP 处理函数内调用；缺授权或请求已结束时 `RequireAccounts` 回 403。`FakeHost` 不设回调时回答“全部账号”，测试账号路由时应设置回调覆盖 own 范围；未知 action 在 fake 里同样 400。
- 回滚：revert 这个提交即可，无迁移；回滚后已改用这些助手的插件会收到 `UNIMPLEMENTED` 并回 503。

## T48 W2-F8、决策 D16：清除他人两步验证改需 user:password:reset（产品性收紧）

- 改动：`DELETE /users/:id/security` 的权限由 `user:update` 改为 `user:password:reset`（`iam/security_http.go`）；权限目录里该权限的标签改为“重置他人密码与两步验证 / Reset user passwords and two-factor”（SyncCore 启动时更新 `permissions.label`）；用户列表“重置二次验证和通行密钥”按钮的判断键同步改（`UsersView.vue`）。不新增权限，无迁移。目标检查（`CanActOnUser`）与重置自己时的二次确认不变。CONTRACTS §14.2、§79.2、§80 同步。
- 影响对象：
  - 只有 `user:update`、没有 `user:password:reset` 的角色：调用由成功变为 403 `details.permission = user:password:reset`，按钮不再显示。内置的 `admin`、`operator` 默认两个权限都有，不受影响（被人手工去掉 `user:password:reset` 的除外）；只勾了 `user:update` 的自定义角色需要补勾。
  - 访问密钥：`user:password:reset` 只认会话（T10），带 `user:update` 的密钥此前能清他人的两步验证，现在一律 403，需改用登录会话。
  - 经 `DELETE /users/<自己>/security` 重置自己因子的人同样需要这个权限；没有的人用 `/me/two-factor/disable`。
- 回滚：revert 这个提交即可；标签在旧版本下次启动时由 SyncCore 改回，无数据变化。

## T49 W5-A9：账号动作可见性按行归属判断

- 改动：`account.visibleActions(ctx, row)` 取代列表（`fillActions`）与 `GET /accounts/:id/actions` 里两份相同的过滤：调用者能修改这一行（`core.ScopeOf(core.AccountScope("update"))` 与 `core.Allows(scope, created_by)`）时返回该账号类型的全部动作（声明的动作都要求 `account:update`），否则只返回不要求权限的动作。此前只要持有 `account:own:update`，就对看得到的每个账号都列出动作。无迁移。
- 影响对象：读全量、改 own 级的用户（`account:read` + `account:own:update`）在别人创建的账号（含 `created_by` 为空的历史账号）上，列表的 `actions` 字段与 `GET /accounts/:id/actions` 不再返回动作（重新授权、刷新令牌等）；这些动作此前调用也是 404。控制台此前已按行归属隐藏这些菜单项（`accountRowActions.ts` 的 `canUpdate`），界面无变化，变化只对直接调接口或用访问密钥的调用方可见。自己创建的账号、持有 `account:update` 的用户（admin、operator）不变。`GET /accounts/:id/actions` 的 `actions` 在没有可见动作时仍是 `[]`。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## 期 2 生产备份验证修复（第 2 轮）

- 改动：
  - M3：`POST /account-types/:p/:t/models/fetch`（及 `/accounts/:id/models/fetch`）发请求失败时改用账号包共用的 `transportError` 渲染：拨号守卫拒绝的连接显示为 `netguard.ErrPrivate`（`upstream address is private, loopback or link-local`），不再回显代理名解析出的内网 `ip:port`；请求 URL 也换成去掉查询串的地址（查询串可能带密钥）。账号测试与额度探测本来就走 `transportError`，同样不再回显。
  - 服务器 CLI 恢复超管后，运行中的节点上重新登录立即可用（见上文 T17 条）：`iam.isActiveWithVersion` 在令牌的 `token_version` 比状态缓存新时重读；已删除用户以最大版本缓存，残留令牌不会每个请求都读库。旧会话仍在状态缓存 TTL（30 秒）内结束。
- 影响对象：models fetch 失败时的 503 文案变化（传输错误前缀由 `Get "<完整 URL>"` 变为 `Get <不含查询串的地址>`）；其余无变化。混跑时旧节点没有 `GET /me/assignable-roles`（404），控制台不调用该接口，无界面影响。
- 回滚：revert 对应提交即可，无迁移、无数据变化。

> 以下为期 3（T50 起）。第 a 组：内置角色与目录主线（T50–T57）。

## T50 K、决策 D5：内置角色 key 被自定义角色占用时停止启动，新建角色不能用保留 key

- 改动：`SyncCore` 在写入内置角色之前查询 `roles WHERE key = ANY(<内置 key>) AND NOT builtin`（`authz.builtinKeyConflict`），有结果就返回错误，服务不启动；错误信息逐行列出角色 id、key 和改名 SQL（`UPDATE roles SET key = '<key>_custom' WHERE id = <id>;`，`<key>_custom` 已被占用时换成任何未用的 key）。内置角色的 upsert 不再把同 key 的自定义角色改成内置角色（`ON CONFLICT` 只修正 `superuser`）。`CreateRole` 拒绝保留 key（`authz.reservedRoleKey`：`super_admin`、`admin`、`operator`、`user`、`supplier`，其中 `supplier` 在 T52 建出）：400 `invalid_argument`，`details.fields[{field:"key", code:"reserved"}]`。CONTRACTS §15.7、§43.6 同步。无迁移。
- 影响对象：
  - 已有自定义角色的 key 等于某个内置角色 key 的部署（今后新增内置角色时才会出现，本期是 `supplier`）：升级后服务不启动，直到按错误信息里的 SQL 把该自定义角色改名（改 key 不影响它的权限、持有者和可分配清单；按 key 引用它的外部脚本需同步）。此前这种角色会被静默改成内置角色，其持有者因此得到内置角色的默认权限。生产库没有自定义角色，不受影响。
  - `POST /roles` 用上述 5 个 key 由 409（已存在）或 201（`supplier`）变为 400 `reserved`。
  - 滚动升级：旧节点仍接受 `POST /roles` 用 `supplier` 建自定义角色；混跑期间建出的这种角色会让之后带内置 `supplier`（T52）的节点启动失败，按上面的 SQL 改名即可。
- 回滚：revert 这个提交即可，无迁移、无数据变化（按提示改过的角色 key 保留）。

## T51 决策 6：内置角色的名称、权限、可分配清单只允许超管修改（产品性收紧）

- 改动：`authz.editableRole` 在超管角色冻结、系统（actor 0）放行之后加内置角色分支：角色是内置的，操作者就必须是超管（`covers` 比较超管标志），否则 403 `only the super admin can change built-in roles`，`details.superuser = true`。经它的五个写操作一起生效：PATCH `/roles/:id`、PUT `/roles/:id/permissions`、PUT `/roles/:id/assignable`、POST `/roles/:id/reset`、DELETE `/roles/:id`（内置角色对超管仍是 409）。自定义角色照旧按“角色在操作者之内”判断。CONTRACTS §4、§15.7、§43.6 同步。无迁移。
- 影响对象：
  - 持 `role:define` 的非超管（内置 admin、operator 默认都有）不能再改内置角色 `admin`、`operator`、`user`（以及 T52 的 `supplier`）的名称描述、权限、可分配清单，也不能重置它们，由 200 变为 403；此前只要角色在自己权限之内就可以（如 admin 给 `user` 角色加权限、改 operator 的权限）。需要调整内置角色时由超管操作，或另建自定义角色。
  - 超管的访问密钥同样 403（密钥不是超管；这些接口本来就因 `role:define` 是 sessionOnly 而拒绝密钥）。
  - 不经 `editableRole` 的写入不变：安装插件时把新插件权限授给内置角色（consent，`SyncPlugin`）仍按原规则（`role:define` + 持有该权限）。
  - 控制台角色页对非超管仍显示内置角色的编辑入口，保存时收到 403（前端按钮收敛不在本任务范围）。
- 回滚：revert 这个提交即可，无迁移、无数据变化。
