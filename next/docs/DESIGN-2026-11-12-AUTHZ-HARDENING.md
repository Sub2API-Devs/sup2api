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
