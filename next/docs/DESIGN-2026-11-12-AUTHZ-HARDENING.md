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
