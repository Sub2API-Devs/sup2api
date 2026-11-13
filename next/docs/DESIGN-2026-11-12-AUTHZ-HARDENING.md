# 权限加固：行为变化与回滚（升级说明）

> 日期：2026-11-12。分支：`feat/authz-hardening`。每个产生行为变化或产品性收紧的提交在这里追加一条：影响对象、回滚方式。路径省略前缀 `next/`；Go 文件省略 `server/internal/`。

---

## 发布说明（T85 汇总，2026-11-13）

本节是期 1–4 的总览：发布约束、迁移与回滚、行为变化（相对 develop 的最终效果，被后续任务改写的只记最终口径）、运维清单、wontfix 与待决定。下文各任务条目提到的迁移 0097–0103 已合并为 `0097_authz_hardening.sql`，其中的滚动升级、混跑、R2b 与逐条回滚说明以本节为准。各任务的细节、测试与逐条回滚见下文各条目（期 1 T01 起，期 4 见“# 期 4”）。提交号是该任务的主提交，review fixes 紧随其后。

### 1. 发布约束

本版本是核心 **0.1.285**，**maintenance 停服发布**（primary-first：所有节点先停核心，主节点跑迁移，再依次启动），不支持新旧核心混跑、两步发布，也不支持旧核心在新库上直接运行。2026-11-13 发布前去掉了为这些场景准备的兼容层（见文末“发布前去兼容层”），下文各任务条目里关于滚动升级、混跑、R2b 的说明都以本节为准。

1. **一个迁移 `0097_authz_hardening.sql`**：期 1–4 的全部库改动合成一个单事务迁移，直接写出最终状态（清单见第 2 节）。托管核心要求库里的迁移是本核心清单的连续前缀（`app/managed_checks.go` `appliedPrefix`）；发布前若 develop 已新增 0097 及以后的迁移，本迁移要后移重新编号（生产未跑过，测试库重建即可）。
2. **超管必须恰好一个**：库里有用户（即升级而非新装）时，迁移先删除软删除用户的超管行，再要求未删除的超管持有者正好一个（不论启用、禁用），否则整个迁移回滚、核心停止启动，错误只列 user id 并给出处理办法：`sub2api admin recover-superadmin --email <要保留或要指定的那个>`（运维清单第 1 条）。CLI 不跑迁移，在 0.1.284 形态的库上也能用。
3. **S1–S4、S5、R0、整合审查的 2FA 开启与期 4 收尾 F3、F4 同版本发布**：后端改为 proof 之后，旧控制台的改密码、关 2FA、重新生成备用码、添加通行密钥、开启 2FA、超管移交、ccgateway 远程设置等都会 403 `verification_required`。只回滚其中一部分也会出同样的问题，要一起回滚。
4. **插件与核心同发**（T84）：十个插件的 `hostCompat` 下限是 `>=0.1.285`，`sdk/manifest/check/ui.go` 记 UI 3.15 从核心 0.1.285 开始（0.1.284 是最后一个带 UI 3.14 的核心；moderation `hostUICompat ^3.15`）。dynweight 取 0.5.9（develop 已发布 0.5.8）。
5. **正式打包用 `REQUIRE_UI=1`**：`deploy/docker/build-go.sh` 调用的 `tools/sub2api-plugin/scripts/build-demo.sh` 在原生 UI 未构建时加 `--allow-missing-ui`，设 `REQUIRE_UI=1` 时改为报错退出；`build-go.sh` 自己的通用回退分支（没有 build-demo.sh 时）不认这个变量，正式包不要走它。五个插件的原生 UI 需各自 `npm ci && npm run build`。
6. **claude-oauth 发布者名**由 `sup2api` 改为 `sub2api`（T84）。已经装过 claude-oauth 的库，若 `plugins.publisher_id` 为空或指向另一个发布者，上传签名的 0.2.3 会 409“owned by another publisher”（`install/upload.go` `sameID`）。2026-11-14 已按用户授权只读核查生产：生产从未安装 claude-oauth（plugins、plugin_versions 均无记录），publishers 仅 id 1 `sub2api`，现有 10 个插件都归它，首次安装 0.2.3 直接归 `sub2api`，**不需要处理**（其他部署仍按运维清单第 8 条核对）。
7. **mailer 升到 0.1.2**：本分支改了 next/sdk（host.proto 等），mailer 0.1.1 重新打包内容会与生产已存的 0.1.1 不同，EnsureBuiltin 会保留旧包、拿不到新 SDK；因此 mailer 升一个 patch 版本（功能不变）。
8. **跨域部署**：核心自己不发 CORS 头，由前置代理配置：`Access-Control-Expose-Headers` 要含 `X-Authz-Version`，否则控制台只能靠 403 触发重新取权限（T74）；`Access-Control-Allow-Headers` 要含 `X-Verify-Proof`，否则控制台带 proof 的重放过不了预检，所有要二次验证的操作（改密码、插件同意、镜像上传等，CONTRACTS §80.2）都会以网络错误失败。
9. **旧写法不再接受**：8 个旧 own key（`account:own:<x>`、`proxy:own:<x>`）与 `role:manage` 由迁移改写后删除，服务端与控制台都只认规范写法（`account:read:own` 等、`role:define` + `role:assign`）。仍用旧写法调用 `PUT /roles/:id/permissions` 或新建访问密钥的脚本会得到 400 `unknown` 或 403 `missing`，要改成规范写法；`/me` 不再输出旧别名。
10. **gateway 外壳不再有 tokenless 管理开关**：所有核心（含线上 0.1.284）都带管理令牌，本版本不换网关；以后换网关时旧配置里的 `allow_tokenless_management` / `SUB2API_ALLOW_TOKENLESS_MANAGEMENT` 被忽略，不影响启动。

### 2. 迁移与回滚

`0097_authz_hardening.sql`（一个事务，`SET LOCAL lock_timeout = '10s'`，先锁 `authz_meta`；每处写入都以系统身份写审计，`detail.via = "migration 0097"`；本次有写入才推进 authz 版本）：

| 步骤 | 内容 | 来源任务 | 审计 |
|---|---|---|---|
| 1 | 删除软删除用户的超管行；有用户时超管必须恰好一个（发布约束 2）；`roles_one_superuser` 唯一索引 + `user_roles_one_superuser` 延迟约束触发器 | T18、P4F2 | `user.roles`（`deleted_user`） |
| 2 | `role_assignable_roles`、`roles.assign_custom` | T13 | — |
| 3 | `accounts.admin_locked`（存量不加锁） | T63 | — |
| 4 | `permissions.scope_type`（由启动同步填写）、`role_permission_scopes` 与 scope 索引 | R2a | — |
| 5 | 收回内置 admin、operator 上的超管专属权限（只在 `role:manage` 仍存在、即库还没被本迁移改写过时执行） | T54 | `authz.reclaim.super_only` |
| 6 | 旧键改写：角色的 `account:own:<x>`、`proxy:own:<x>` 授予改为 `<action>:own`（角色已有全量键时只记审计、标 `redundant`）；`role:manage` 改为 `role:define` + `role:assign`，内置 operator 只得 `role:assign`（D3）；`role:manage` 的持有者得到可分配清单（内置 operator 为 supplier、user，`assign_custom = false`；其余为全部内置角色中除超管与 admin 外的 + `assign_custom = true`）；访问密钥里的旧写法换成新写法；删除 9 个旧 permission 行 | R2a/R2b、T09、T13、T55、P4F1 | `authz.grant.migrate`、`role.assignable`、`user.access_key.migrate` |

- **可重复执行**：表结构都是 `IF NOT EXISTS`；旧键删除后改写找不到可改的行；超管专属权限的收回以 `role:manage` 仍存在为前提，所以重跑不会再次收回超管事后设回的授权。重跑不写审计、不推进版本（`TestAuthzHardeningMigration`）。
- **启动同步之后**：0.1.285 的 SyncCore 新建 supplier 角色（带 8 个 own 范围默认值）并加进 admin、operator 的可分配清单；不会再给出 `role:manage`、旧 own key，也不会给 operator `role:define`（`inherits` / `builtinsWithout` 已删除）。
- **回滚**：`deploy/rollback/0.1.285-authz-down.sql` 与说明 `deploy/rollback/0.1.285-authz-down.md`。步骤：停掉所有 0.1.285 核心 → 跑反向脚本（单事务：范围授予改回旧 own 键，迁移审计里标 `redundant` 的按审计补回，`role:define`/`role:assign` 改回 `role:manage`，按审计恢复收回的超管专属权限，密钥同样改回，分组与 id 范围删除并写审计，删新表、新列、索引、触发器与函数，删 `schema_migrations` 记录）→ 启动 0.1.284 → 插件切回发布前的版本。`TestAuthzHardeningRollback` 验证表结构与只迁移到 0096 的库一致、旧键授予与升级前一致、再次升级结果相同；生产快照（av_prod）上实测：0.1.285 迁移并同步 → 反向脚本 → 非托管 0.1.284 启动，表结构与升级前逐字一致，角色授予只多出 supplier 的 8 个旧 own 键，再升级结果与第一次相同。**这些步骤只适用于非托管部署**：托管部署（线上网关）在迁移提交后不能经升级计划回到 0.1.284——网关要求目标清单的 `schema_before` 等于当前基线的 `schema_after`（`control.Compatibility`），0.1.284 核心也不接受以 0.1.285 的 schema 为源的迁移许可（`validateMigrationPermit`），`sub2api-gateway rollback` 跨 schema 一律拒绝（`rollbackCompatibility`）。线上出问题时修复前进（下一个核心版本接在 0097 之后），确实要回 0.1.284 只能按网关 README 从数据库备份恢复或先改网关；详见回滚说明。
- **迁移失败时**（例如超管数量检查报错）：事务整体回滚，库仍是 0.1.284 的形态，不要跑反向脚本；处理后 `resume` 恢复同一计划（`sub2api-gateway rollback` 比较签名清单的 schema，对本版本一律拒绝）。
- **插件要一起切回**：十个插件的新版本 `hostCompat` 都是 `>=0.1.285`，在 0.1.284 上启动失败（`incompatible with host 0.1.284`），`/healthz` 一直 503，旧核心的内置安装器约每 20 秒重试一次上传（每分钟约 24 条 `plugin.upload` 审计）。发布前记下 `SELECT key, active_version FROM plugins ORDER BY key;`，回滚后用 0.1.284 的 `POST /api/v1/plugins/:key/upgrade {"version": "<发布前的版本>"}` 逐个切回（超管会话）。生产备份验证（av_prod 快照）时需要切回的是 6 个：anthropic 0.3.1、ccgateway 0.1.132、codex 0.1.3、dynweight 0.5.8、moderation 0.11.x、volcengine 0.12.6，以发布当天的记录为准。
- **回滚后 operator 重新能定义角色**：0.1.284 只有 `role:manage`，内置 operator 持有 `role:assign` 就会拿回 `role:manage`。回滚窗口要保持 D3 的效果，由超管在旧版本角色页取消 operator 的 `role:manage`。
- **回滚再升级后，本版本新增的插件权限不会再自动授予**：回滚插件时旧核心删除新版本才有的插件权限行，授予随外键一起删除（例如 moderation 0.12.0 的 `plugin.moderation:moderation:exempt`，升级时按 `inheritFrom` 自动授予 admin）。再次升级时权限行重新登记，但激活时不按 `defaultRoles`/`inheritFrom` 授予（P4C：激活不授予，只有同意时登记的新权限才授予），admin 因此不再持有。再次升级后由超管在角色页重新授予本版本新增的插件权限，并用运维清单第 6 条核对 manifest 默认角色的差异。

### 3. 行为变化（最终口径）

| # | 变化 | 影响对象 | 任务（提交） |
|---|---|---|---|
| 1 | 授予超管角色比较超管标志，访问密钥不能借 super_admin 提权 | 访问密钥 | T01（46f2f183d2） |
| 2 | 改密码、撤销会话、登出立即生效；用 JWT 且不续期的脚本在改密码后失效 | 会话、第三方脚本 | T06（3e78510840） |
| 3 | 授予检查在事务内读库、计入 disabled 插件权限 | 角色写入 | T07（e9946e2b21） |
| 4 | `role:manage` 拆为 `role:define` + `role:assign`（迁移改写存量授予后删除 `role:manage`）；内置 operator 只有 `role:assign` | 角色管理者 | T09（934b1c5b23）、P4F1（f9632c2896）、发布前去兼容层 |
| 5 | 超管全局唯一、角色冻结、只能本人移交（密码 + 第二因素）；服务器 CLI 恢复超管 | 超管 | T12、T16、T17、T18（2e03d308fb） |
| 6 | 分配角色受“可管理角色”清单约束，撤销同样；作用于用户 = 操作权限 + 目标的非默认角色都在清单内且权限 ⊆ 操作者（含本人；不能禁用、删除自己，不能撤销自己的超管） | 用户管理者 | T13–T15、T56、FU6（fec1698e1b）、期 3 整合审查（ec3b6de722） |
| 7 | 内置角色（含新增的 supplier）声明化，名称、权限、清单只允许超管改；admin 默认不含超管专属权限（存量收回）；operator 按白名单 | admin、operator | T50–T55 |
| 8 | 访问密钥 = 用户实时权限 ∩ 密钥权限，可勾任何权限（含插件权限、`self:*`）；只有管理访问密钥本身与登录会话只允许会话 | 访问密钥 | S2（826eab1049）、S3（9bde44b7f2）、S4（5835a65248） |
| 9 | 高危操作每次二次验证（通行密钥 / 2FA / 无强方式时密码，proof 5 分钟一次性，绑定用户、会话或密钥、scope、`METHOD path`）：明文回显、超管移交、本人改密码/邮箱/2FA/通行密钥（含开启 2FA）、改他人密码、清他人 2FA、删用户、插件上传/安装/同意/确认暂缓授予、发布者、核心升级与更新源、ccgateway 装码与拨号、ccgateway 镜像上传（创建时验证一次，同一上传的分片、续传、取消与装载凭上传 id 延续）；改密码等接口不再收当前密码字段 | 控制台用户、脚本 | S1（dd8f66cbb9）、S3、S5（5626d84d91）、R0（8927849f66）、p4-review、发布前待定项 |
| 10 | 插件代理：访问密钥按插件权限放行；空权限路由拒绝；按账号操作的插件路由要求调用者对这些账号有范围（只有插件权限的角色由 200 变 403） | 插件路由调用者 | T22、T24、T25、S4 |
| 11 | own（受限档）规则：只在变化时校验分组、解绑也要权限、掩码回填改地址须重新输入、不能恢复被管理员禁用的账号、草稿与预备容器每人 3 个 | 供应商 | T28、T29、T63、T64 |
| 12 | 代理拨号守卫（内网地址在拨号时拒绝）；他人账号在用的 own 代理不能改连接字段 | 代理属主 | T30、T31、FU1 |
| 13 | WebSocket 每轮重新鉴权（撤销 1008、分组变化 1012） | API Key 客户端 | T32 |
| 14 | 调余额、用户组成员、个人专属价走“作用于用户”口径；segment:manage 不能改自己所在组的定价与授权 | 财务、定价管理者 | T33、FU2、FU6 |
| 15 | 用量详情对本人视图与无 `account:read` 的视图不返回账号字段；ccgateway 请求日志按白名单投影 | 只读者 | T34、T43、FU3 |
| 16 | payment webhook 未接验签器时 501 | payment | T35 |
| 17 | 账号运行时只认 `account:*`；`/system/ccgateway/connect` 删除；请求日志设置不接受受限档 | settings 管理者、供应商 | T36–T39 |
| 18 | 插件 AuthzCheck 查非本插件 key 需 `authz.read`；设置密钥打码；OAuth 会话绑定发起人（升级时进行中的授权需重来） | 插件 | T40–T42 |
| 19 | 清他人 2FA 需要 `user:password:reset` | 只有 `user:update` 的角色 | T48 |
| 20 | 插件权限按 manifest `defaultRoles`/`inheritFrom` 授予；升级新增的敏感授予或给 user、自定义角色的授予需同意，内置插件的这类授予暂缓到插件页确认 | 插件管理者 | T58–T61、P4C（b2ce05e5dc、9954105816） |
| 21 | 手动运行插件任务需 `task:run` | 插件管理者 | T62 |
| 22 | 资源范围：账号与代理的权限 key 可带范围（own、分组、分组内账号、指定账号或代理），多个取并集，授出不超过自己；受限档沿用 own 级限制；`created_by=<他人>` 对受限档返回空；新建与修改后的范围后置条件（`not_in_scope`、`would_leave_scope`）；8 个旧 own key 由迁移改写为 `<action>:own` 后删除，不再作为别名接受，`/me` 只输出规范 key | 角色管理者、供应商、脚本 | R1–R8、发布前去兼容层 |
| 23 | 启动时自检路由表与菜单（不一致拒绝启动）；控制台权限目录由服务端生成 | 运维、开发 | T68（7698df4d65）、T69（bb27dc839f） |
| 24 | 控制台：X-Authz-Version 与 403 触发重新取权限；用户页、角色页、同意页只给可管理的对象；仪表盘账号状态卡片；财务区“余额流水”菜单；iframe 插件可查本插件权限 | 控制台用户 | T74–T83 |
| 25 | 插件升级在同意页批准需要同意的角色授予（敏感，或给 admin/operator/supplier 以外的角色），与确认内置插件暂缓授予同一规则：`role:define` + 能修改每个目标角色（内置角色只有超管）；非超管 admin 不能再批这类升级。已授予且范围覆盖的宿主权限沿用，不按风险要 `plugin:grant:*`（非超管 admin 不再被已有的 `ui.native` 等挡住） | 插件管理者 | 期 4 收尾 F1、发布前待定项 |
| 26 | 目录 `apikey:self:manage` 带 `stepUp`、`sensitive` 标记（明文回显本来就每次二次验证，访问密钥选择器现在会提示）；启动自检要求挂 StepUp 的路由引用带 stepUp 标记的权限或在豁免表中 | 访问密钥、开发 | 期 4 收尾 F2 |
| 27 | 新建、修改访问密钥每次二次验证 `self.access_key.write`（取代只要密码），删除不要 | 控制台用户、脚本 | 期 4 收尾 F3 |
| 28 | 超管去掉自己最后一个强因素（清自己的安全设置、无通行密钥时关 2FA、无 2FA 时删唯一通行密钥）要密码 + 第二因素 | 超管 | 期 4 收尾 F4 |

被后续任务取代、不再成立的中间口径：T10/T57 的 sessionOnly（S3 删除，改为二次验证）；T11 的明文回显拒绝访问密钥（S3 改为二次验证）；T33/FU5 的“不能作用于自己 / 超管自作用豁免”（FU6 改为可管理角色口径）；T41 的带密钥 schema 一律拒绝 `$ref`（FU4 支持本地引用）；own/all 成对 key（R1–R7 改为范围）。

### 4. 运维清单（只读 SQL，执行需用户授权登录生产）

```sql
-- 1. 超管（迁移要求恰好一个，否则停止启动；软删除用户的超管行会被迁移删除）
SELECT u.id, u.status, u.deleted_at IS NOT NULL AS deleted
FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
WHERE r.superuser ORDER BY u.id;

-- 2. 与内置角色同 key 的自定义角色（T50：存在时 SyncCore 停止启动）
SELECT id, key, builtin, superuser FROM roles
WHERE key IN ('super_admin', 'admin', 'operator', 'supplier', 'user') AND NOT builtin;

-- 3. codex / dynweight / volcengine 的插件权限授给了哪些角色、各有多少用户（M1；受限档角色有则先撤）
SELECT p.plugin_key, p.key AS permission, r.key AS role, r.builtin,
       (SELECT count(*) FROM user_roles ur WHERE ur.role_id = r.id) AS users
FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id JOIN roles r ON r.id = rp.role_id
WHERE p.source = 'plugin' AND p.plugin_key IN ('codex', 'dynweight', 'volcengine')
ORDER BY p.plugin_key, p.key, r.key;

-- 4. 存量内置 operator 的角色管理权限（迁移前是 role:manage，迁移后只有 role:assign）
SELECT r.key AS role, p.key, p.status
FROM role_permissions rp JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
WHERE r.builtin AND r.key = 'operator' AND p.key IN ('role:manage', 'role:define', 'role:assign');

-- 5. C-M5：非官方发布者，与已授予关键宿主权限 / db.schema 的插件
SELECT id, name, trust_level, status, created_at FROM publishers WHERE trust_level <> 'official';
SELECT g.plugin_key, g.permission, g.plugin_version, g.status
FROM plugin_permission_grants g
WHERE g.status = 'granted'
  AND g.permission IN ('ui.native', 'accounts.credentials', 'ledger.credit', 'ledger.debit', 'users.write', 'db.core_views', 'db.schema')
ORDER BY g.plugin_key, g.permission;

-- 6. 插件 defaultRoles 存量对照（D9 默认不回填）：manifest 声明的默认角色里，当前没有该权限的
WITH d AS (
    SELECT pl.key AS plugin_key, up->>'key' AS local, role
    FROM plugins pl
    JOIN plugin_versions pv ON pv.plugin_key = pl.key AND pv.version = pl.active_version,
         jsonb_array_elements(pv.manifest->'userPermissions') up,
         jsonb_array_elements_text(COALESCE(up->'defaultRoles', '["admin"]'::jsonb)) role
)
SELECT d.plugin_key, p.key AS permission, d.role
FROM d
JOIN permissions p ON p.key = 'plugin.' || d.plugin_key || ':' || regexp_replace(d.local, '^plugin\.[^:]+:', '')
JOIN roles r ON r.key = d.role
WHERE NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id)
ORDER BY 1, 2, 3;

-- 8. claude-oauth 的发布者（见发布约束 6）
SELECT pl.key, pl.publisher_id, pub.name, pub.trust_level, pl.active_version
FROM plugins pl LEFT JOIN publishers pub ON pub.id = pl.publisher_id WHERE pl.key = 'claude_oauth';
```

- 第 6 条只列差异。决定回填时（用户授权、写库），在一个事务里按结果逐行授予并推进版本：`INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.key = '<role>' AND p.key = '<permission>' ON CONFLICT DO NOTHING;`，每行另写一条 `audit_logs`（`action = 'authz.sync.grant'`，`detail = {"via": "manual backfill", "role", "key"}`），最后 `UPDATE authz_meta SET version = version + 1 WHERE id = 1;`。内置角色的授予只应由超管决定。
- 第 7 条（gateway tokenless 开关）已删除：开关随 0.1.285 删除（发布约束 10）。
- 只读核查的已知结果（2026-11-12，DECISIONS）：超管 1 个；无 supplier 同名角色、无自定义角色；codex/dynweight/volcengine 的 6 个插件权限只授给内置 admin（0 用户）；operator 0 人；发布者只有 official 的 sub2api。发布前按当日数据重跑。

### 5. wontfix 与延后（含期 3、期 4 的取舍）

| 项 | 结论 | 理由 |
|---|---|---|
| W1-F17 `usage:all:read` / lookup api-keys 含用户邮箱 | wontfix | 与 `/usage` 的 `user_email` 同口径；目录描述写明（T67） |
| W1-F7 GET 接口写副作用 | wontfix | 运行时观测事实，幂等；注释说明 |
| W4-P10 插件本地 key 命名不统一 | wontfix | 改名会丢授权（改名只能经 `inheritFrom`） |
| W5-A2 插件设置路由权限来自 manifest | wontfix | 静态路由写不出动态 key：路由 `self:plugin_ui`（S4）+ 处理函数按 manifest 判断，`UsesPluginKeys()` 登记 |
| C-T1 AuthedRead 接受访问密钥 | wontfix | 结果都按密钥收窄后的权限计算 |
| `/ui/plugins` 返回插件版本 | wontfix | `asset_base` 本身含版本哈希，去掉 version 无意义 |
| remote-fingerprint 不接 netguard | wontfix | 连内网主机是正当用途；期 4 R0 起每次二次验证 `host.install` |
| PUT `/segments/:id/groups` 与分组价格不做目标检查 | wontfix | 作用对象是整个用户组（职责分离问题）；FU2 只禁止改自己所在组 |
| 插件代理 `/p/:key/*` 不进 RouteSpec | 记录 | 直接挂 gin group，权限来自 manifest 路由声明，由插件路由表与 T22/T24 检查 |
| 只持有 `group/G/account/X` 范围的操作者在编辑器里没有候选 | 记录 | 候选按自己的范围裁剪（`offerOf`），这种组合要经 API 授出；后端照常按 Missing 判断 |
| 升级页 preflight warnings 为网关英文原文 | 记录 | 文本来自外壳，控制台不翻译 |
| T78 批量“移入用户组”与“用户组与定价”抽屉未按可管理过滤 | 记录 | 服务端 403 兜底 |
| `/accounts/summary` 计入已停用插件的账号 | 记录 | 与概览口径一致（产品决定） |
| TS 中大于 2^53 的 id 丢精度 | 记录 | 实际 id 远小于此 |
| sdk corefloor 未加 `hostCompat` 下限校验 | 延后 | 会碰大量 pkgtest 夹具；发布约束 4 人工核对 |
| proof 绑定 URL 不含请求体；路由级 proof 在处理函数前消费（校验失败也已用掉） | 接受 | 同主体、一次性、5 分钟；`PUT /me/password` 先校验再消费 |
| 插件 `AuthzCheck`/`AccountScopeCheck` 按在途请求的密钥收窄，精确字符串求交，会话请求同时在途时也被收窄 | 接受 | 失败收紧 |
| 超管密钥里已禁用的插件权限 `Restrict` 仍保留 | 接受 | 此前就有，与已删除的核心权限相同 |
| `LEGACY_OWN` 与旧别名 | 已删除 | 发布前去兼容层：迁移改写存量写法，服务端、共享向量与生成的 `permissions.ts` 不再有别名 |
| 插件 defaultRoles 存量回填 | 不做（D9） | 运维清单第 6 条给出差异与 SQL |
| 期 1 PLAN §6 其余延后项（超管登录通知、raw_cost、volcengine own 化、payment 真实验签、/plugin-ui 验签缓存、refund ActOnOthers、usage:settle 界面、WebSocket 空闲复检） | 延后 | 见 PLAN §6 |

### 6. 待用户决定（期 4 整合审查提出，未改）

1. **已定（期 4 收尾 F1，统一为严的）**：插件升级授权的两条路径规则不同：第三方插件升级的同意页里，来自 `defaultRoles`/`inheritFrom` 的需同意授予（敏感、或给 user、自定义角色）只要 `plugin:install` + 二次验证就能批准；内置插件同一授予在插件页确认要 `role:define` + 能修改每个角色（内置角色只有超管）。可以统一为严的（同意页对需同意的计划授予也跑 `checkRolesGrantable`，admin 不能再批这类升级）或宽的（确认只要 `plugin:install`）。→ 同意页对需同意的计划授予也跑 `checkRolesGrantable`，见“期 4 收尾”。
2. **已定（期 4 收尾 F2，本期就改）**：`apikey:self:manage` 没有 step-up 标记，而 `POST /me/api-keys/:id/reveal` 要 `apikey.reveal` proof，访问密钥选择器因此不提示。加标记按不变式还要 `sensitive=true`；同时可把“step-up 路由必须引用带标记的 key”加进启动自检（本次试加后正是这一处报错，已撤回）。→ 本期加标记与自检（本版本停服发布，没有新旧节点来回改写目录行的问题）。
3. **claude-oauth 发布者改名**是否需要一次性迁移 `publisher_id`（发布约束 6）。（已定：生产核查无安装记录，不需处理）
4. **已定（期 4 收尾 F3，改为二次验证）**：访问密钥的新建与修改仍只要密码，开了 2FA 的用户也可只凭密码签出宽权限的密钥；是否改为二次验证。
5. **已定（期 4 收尾 F4，要密码 + 第二因素）**：超管只用一个因素就能清掉自己的全部因素（`user.security.reset` 或 `self.2fa.disable` 只要一种方式），此前要密码加验证码；是否让这两个 scope 对超管本人也要求密码。
6. **已定（发布前待定项，按协调者推荐）**：ccgateway 运行时镜像上传（`runtime/uploads*` 创建与分片）此前不要二次验证，只有 `load` 要；DECISIONS 原文是“安装与上传”。→ 创建时验证一次，同一上传的其余请求凭上传 id 延续（二次验证会话），见文末“发布前待定项”。
7. **已定（发布前待定项）**：插件升级同意页把已授予的宿主权限当新授予提交，缺 `plugin:grant:critical` 的非超管 admin 被已有的 `ui.native` 挡住。→ 已授予且范围覆盖的沿用，只有新增、扩大的需要同意，见文末。

### 7. 契约索引

- CONTRACTS §4：核心权限目录（`scope_type`、`step_up`、`sensitive`、`description`、`requires`，`GET /permissions`）与内置角色默认。
- CONTRACTS §21：资源范围（§21.0 key 语法与蕴含、§21.5 控制台判断、§21.6 共享向量）。
- CONTRACTS §43.6：授予与作用于用户（可管理角色、防提权 `Missing`，范围按蕴含比较）。
- CONTRACTS §80：访问密钥（用户权限 ∩ 密钥权限、self 虚拟权限）与二次验证（§80.2 scope 表）。

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
  - 持 `role:define` 的操作者不能再改、删、重置权限比自己大的角色（包括带有自己没有的插件权限的内置角色），返回 403（T51 起非超管改内置角色一律 403）。原先只检查授出的权限，可以先削弱上级角色再对其持有者改密码或禁用。
  - 原样保存带已移除权限的角色不再报 unknown；保存时操作者已不需要持有角色上原有的权限（原有部分已由入口检查保证在操作者之内）。POST `/roles` 带已移除的权限 key 时忽略而不再报错。
  - 审计日志多出角色写入的记录。
- 回滚：revert 这个提交即可，无迁移、无数据变化（已写入的 `role.*` 审计行可保留）。

## T13 决策 3–5：可分配角色白名单数据层

- 改动：迁移 `0097_role_assignable.sql` 新增 `roles.assign_custom`（“以及全部自定义角色”）与 `role_assignable_roles(role_id, assignable_role_id)`。存量等价：持有 `role:manage`（不看状态，拆分后已 removed）或 `role:assign` 的非超管角色得到 `assign_custom = true`，并可分配除 `super_admin`、`admin` 外的全部内置角色；全新库不动。内置默认清单（决策 5）：admin = operator、user + 全部自定义角色；operator = user（supplier 随 T52 建出后由 SyncCore 追加到 admin、operator）。SyncCore 新建内置角色时播种清单（不审计，与权限播种一致）；以后新建的内置角色追加到默认清单含它的已有内置角色上，写 `authz.sync.grant` 审计（via=`assignable`，`key` 为被追加的角色）。`core.PermissionSet` 增加 `Assignable`、`AssignCustom` 与 `CanAssign`；`RolesPermissions`（授予视角）加载它们（显式清单永不含超管角色，`assign_custom` 展开为全部非内置角色；期 3 审查 R1 起不含持有者自己的角色）；`Missing` 增加 `Assign`、`AssignCustom`，403 的 details 多 `missing_assignable`、`missing_assign_custom` 两个字段。访问密钥收窄后没有可分配角色。本提交不改 `SetUserRoles` 的分配规则（T14），不加接口（T15）。
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
- 影响对象：重置内置角色会丢掉手工加到其可分配清单上的角色（含 `assign_custom` 变化），重置者若不能分配默认清单（如非超管重置 admin 而自己没有 `assign_custom`）改为 403（T51 起非超管重置内置角色一律 403）；角色对象多两个字段，旧前端忽略即可。
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

- 改动：迁移 `0098_one_super_admin.sql`：删除软删除用户的超管行；未删除的超管持有者（不论启用、禁用）多于一个时 `RAISE EXCEPTION`，信息列出 user id（期 4 P4F2 起不含邮箱）和处理命令 `sub2api admin recover-superadmin --email <要保留的人>`；`roles_one_superuser` 部分唯一索引（最多一个超管角色）；`user_roles` 上的延迟约束触发器 `user_roles_one_superuser`（提交时检查最多一个持有者，advisory 锁串行化并发，违反时 23505），移交的先删后插不受影响。不种角色、不依赖运行时 id，CLI 在迁移前后的库上都能用。iam 删除 `guardTarget`、`errProtectedTarget` 与别名 `assertTargetPermissionsWithinActor`：UpdateUser、DeleteUser、ResetSecurity 只经 `CanActOnUser` 判断目标（改他人密码时不再重复检查；改状态时仍在 `Bump` 之后复查一次）。CONTRACTS §43.6 同步。
- 影响对象：
  - 存量多个未删除超管的部署升级时迁移失败、服务不启动，须先按 T17 的运维步骤用 CLI 保留一个（生产核查只有 1 个超管，不受影响）。软删除用户残留的超管行被删除。
  - 非超管（含超管的访问密钥）修改、删除超管或重置其安全设置仍是 403，错误文案由 `only a super admin can modify a super admin` 变为 `you cannot modify a superuser`，并带 `details.superuser = true`；依赖旧文案的脚本需调整。
  - 直接改库再加一个超管持有者会在提交时失败（23505 `user_roles_one_superuser`）。
- 回滚：revert 这个提交，并手工 `DROP TRIGGER user_roles_one_superuser ON user_roles; DROP FUNCTION user_roles_one_superuser(); DROP INDEX roles_one_superuser; DELETE FROM schema_migrations WHERE id = '0098_one_super_admin.sql';`（不删也可，旧代码不会写第二个超管）。已删除的软删除用户超管行无需恢复。

## 期 1 生产备份验证修复（第 2 轮）

- 改动：
  - 决策 1：`authz.CanActOnUsers` 只对本人的登录会话免检“作用于自己”；经访问密钥时（`core.ByAccessKey`）密钥主人和其他目标一样比较（密钥收窄后不是超管，也小于主人的角色）。超管自己带 `user:update` 的访问密钥 `PATCH /users/<超管>` 改显示名、带当前密码 `DELETE /users/<超管>/security` 清两步验证与通行密钥，由 200/204 变为 403 `you cannot modify a superuser`（后者在核对密码之前拒绝；T48 起 `DELETE /users/:id/security` 改用只限登录会话的 `user:password:reset`，访问密钥在权限阶段即 403 `details.permission = user:password:reset`，到不了这一步）；非超管的访问密钥经 `/users/:id` 改自己的资料，密钥权限不覆盖主人角色时同样 403（改自己的资料走 `/me` 或登录会话）。
  - dynweight 原生界面：没有 `group:read` 时不再请求 `GET /groups`（分组名显示 `#id`），没有全量级 `account:read` 时账号列表工具栏的降级标记不再请求 `GET /p/dynweight/degraded`、不显示。own 级用户打开账号页不再出现这两个 403。随 dynweight 重新打包（T84 升版本）生效。
- 发布前提（T84，按 PLAN 裁决 24 各插件任务都不升版本）：本分支改了这些插件而没有升版本：ccgateway 0.1.132（T26 `upstreamFields`）、codex 0.1.3（T25 路由 `accounts`、T26、T42 代码）、dynweight 0.5.7（T25 路由 `accounts`、原生界面）、volcengine 0.12.6（T25、T26）、payment 0.1.0（T35 代码）、claude-oauth 0.2.2（T26、T42 代码，非内置）。生产库已按这些版本存了旧 manifest，内置安装器遇到同版本不同内容会保留已存的行（`install/builtin.go` 日志 `version already stored with other content, keeping the stored one`），registry 从库里的 manifest 读路由与账号类型，节点也可能继续用旧包，所以不升版本上线时插件路由的账号归属检查、`upstreamFields` 与上述代码修复都不生效（期 2 生产备份验证确认：`builtin-relink.sh` 只改写包摘要，库里仍是生产的 manifest）。任何一期单独上线前都必须先做 T84：升这些插件的 manifest 版本（`deploy/docker/build-go.sh` 从 manifest 读版本，不另维护清单）。T84 已完成，见文末“期 4 T84”。
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
  - `AllowPrivateUpstream` 关闭（生产默认）时，`allow_private = false` 的代理（own 级建的，或 0027 之后经 `proxy_url` 自动建的）如果域名解析到非公网地址，测试与实际请求由成功变为失败。非公网按 `netguard.BlockedAddr`：除私网、回环、链路本地外，还包括 100.64.0.0/10（CGNAT、Tailscale）、198.18.0.0/15（Clash/Surge 类 fake-IP DNS）、NAT64、6to4 等；服务器使用 fake-IP DNS 时，所有按域名填写的 `allow_private = false` 代理都会失败。升级前可查 `SELECT id, name, host FROM proxies WHERE NOT allow_private` 并在服务器上逐个确认解析结果；确需保留的由持 `proxy:manage` 的人把地址改动一次再改回（如先改端口再改回，两次 PATCH），存为 `allow_private = true`（FU1 起只改端口、协议不再置 `true`，须改动 host 再改回）。
  - `PATCH /proxies/:id` 只在地址（protocol、host、port）与现值不同时重新判断：只持 `proxy:own:manage` 把自己的代理改到私网地址，或改动管理员放在私网地址上的代理的端口、协议，由成功变为 403；own 级改地址会把 `allow_private` 置回 `false`，`proxy:manage` 改地址置为 `true`（FU1 起只在 host 变化时置 `true`，见 FU1）。原样带回地址的编辑（控制台每次都带全部字段）不改 `allow_private`。
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

> FU6 已改写本条：`core.ActOnOthers` 与“作用于自己 409”删除，目标统一按可管理目标判断（本人同样），见 FU6。

- 改动：`billing.Service` 增加 `Users core.UserGuard`，`adjustBalance` 在 `Apply` 之前 `core.ActOnOthers(ctx, core.GuardOrDeny(s.Users), operator, id)`；`segment.Deps` 增加 `Users`（`New` 里 `core.GuardOrDeny`），`addMembers`（整批 `user_ids`，事务之前，一条 SQL）、`makePersonal`、`removePersonal`（路径上的用户）经 `Service.actOnOthers` 做同一检查；`app/phases.go` 把 authz 注入两处。未注入时一律拒绝（500），不会 panic 或放行。CONTRACTS §5.2、§5.5、§97.6 同步（含 wontfix：`PATCH/DELETE /segments/:id`、`PUT /segments/:id/groups`、`PUT /groups/:id/segments`、分组专属价作用于用户组本身，不做目标用户检查，个人专属（只有一个成员）也按用户组处理；`POST /usage/:id/refund` 延后）。
- 影响对象：
  - 持有 `balance:adjust` 的非超管给自己调余额：由 200 变为 409 `you cannot do this to yourself`。（原文“包括超管，决策 D6”已由 FU5 推翻：超管可以给自己调余额、选自己的用户组，见 FU5。）
  - 持有 `balance:adjust` / `segment:manage` 的非超管给超管、或给角色权限超出自己可授予范围的用户调余额、移用户组、设/取消个人专属：由成功变为 403（`you cannot modify a superuser` / `you cannot modify a user with higher privileges`）。
  - 持有 `segment:manage` 的人把自己移入用户组、给自己设/取消个人专属：由成功变为 409；批量移入的 `user_ids` 里含本人或不可操作的用户时整批拒绝。经访问密钥调用同样适用（非超管的密钥主人不能给自己调；超管见 FU5）。
  - 前端未改：用户列表里对本人、对超管的“调整余额”“设为个人专属”等按钮仍显示，点击后得到上述 409/403 提示（按钮按目标隐藏可在前端任务里跟进）。
  - 修改自己所在用户组（含自己的个人专属）的折扣、授权、专属倍率与专属价：已由 FU2 收紧（默认用户组除外）。
  - 已知未覆盖：软删除但仍留有角色行的高权限用户作为目标时回 403 而不是 404/400。
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
- 未覆盖（已知缺口）：详情的 `events`、`upstream_request` 与请求、响应头当时没有投影，已由 FU3 补齐；仍保留的是白名单里的 `error_type`、`error_code`（及 FU3 事件 detail 的 `code`）在来源为上游时取自上游响应体（各 ≤512 字符），`path`、`model`、`anthropic_beta` 等是客户端或 CLI 给出的短字符串，未做字符集检查。
- 回滚：revert T43 的两个提交（实现与 review fixes）即可，无迁移、无数据变化；只想恢复列表的错误原文时 revert review fixes 这一个。

## T44：/plugin-ui 非当前版本的资源，先按路径拒绝再加载包

- 改动：`GET|HEAD /plugin-ui/:key/:vh/*path` 请求的不是本节点当前版本时，原先一律先 `ReadVersionAsset`（加载该版本的包）再用 `assetAllowed` 判断；现在路径既不在公开目录（`ui/`、`forms/`、`i18n/`，`prefixAllowed`）下、扩展名也不像图标（核心能当图片返回的类型：`.svg`、`.png`、`.webp`、`.ico`、`.jpg`、`.jpeg`、`.gif`，不分大小写，`looksLikeIcon`；任务说明只列了前四种，后三种是审查后补的，避免旧版本的 jpg/gif 图标取不到）时直接 404，不加载包。通过预检的请求在读到包后仍按完整的 `assetAllowed`（公开目录或 manifest 声明的图标，`iconAllowed`）判定。当前版本的路径不变。不加缓存（LRU、singleflight 延后）。
- 影响对象：这个接口不需要登录，原先任何人都能用任意路径让节点反复加载旧版本的包；现在只有公开目录和图标样式的路径才会触发加载。正常页面不受影响。可见的变化：被预检拒绝的路径一律是空 body 的 404，不再出现版本不存在时的 JSON 404 或加载包失败时的 5xx；旧版本（非当前版本）的 manifest 图标放在公开目录之外且扩展名不在上述列表里（如 `.bmp`、无扩展名）时，按旧版本地址取它会 404，当前版本不受影响，仓库插件的图标都是 `.svg`。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T45：外壳 tokenless 管理开关的指标与 preflight 警告

> 2026-11-13 发布前去兼容层：开关本身连同这里的指标、preflight `warnings` 一并删除（发布约束 10），本条只作历史记录。

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

> 以下为期 3（T50 起），各节按任务编号排列：T50–T65，然后 FU1–FU6，最后是合并后的期 3 审查。三组分别开发：a 组 T50–T57（迁移 0099、0101），b 组 T61–T65 与 FU1、FU2、FU3、FU5、FU6（迁移 0100），c 组 T58–T60 与 FU4。


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
  - 不经 `editableRole` 的写入不变：安装插件时把新插件权限授给内置角色（consent，`SyncPlugin`）仍按原规则（`role:define` + 持有该权限），由 T59 收紧。
  - 控制台角色页对非超管仍显示内置角色的编辑入口，保存时收到 403（前端按钮收敛不在本任务范围）。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T52 J1、决策 5、7：内置角色声明化，新增内置 supplier 角色

- 改动：`authz.builtinRole.grants` 改为 `func(p corePerm) bool`（按权限本身声明，`oneOf(keys)` 表示固定白名单）；admin、operator、user 的默认集合不变。新增内置角色 `supplier`（`authz.RoleSupplier`，供应商）：默认权限是显式白名单 `account:own:read`、`account:own:create`、`account:own:update`、`account:own:delete`、`account:own:test`、`account:own:credential:view`、`proxy:own:read`、`proxy:own:manage`；没有插件权限，暂不含 `account:group:bind`（D27）；没有可分配清单。默认可分配清单按决策 5：admin = operator、supplier、user + 全部自定义角色；operator = supplier、user。升级后第一次 `SyncCore` 建出 supplier（播种不审计），并把它追加到已有 admin、operator 的可分配清单（各一条审计 `authz.sync.grant`，via=`assignable`，key=`supplier`），清单上已有的项不动。`reservedRoleKey` 改为只看内置角色表。前端新建用户对话框勾选 supplier 时自动勾上 user（附加型，D1：供应商用户同时持有 `user` 与 `supplier`；只有新建对话框这样做，用户页的“分配角色”对话框不自动补，自动勾上的 user 也可以再取消）。CONTRACTS §4、§15.7、§21、§43.6 同步。无迁移。
- 影响对象：
  - 角色列表多一个内置角色“供应商”，只有超管能改（T51）；admin、operator 可以把它分配给用户（operator 能授出它的前提是自己持有这 8 个 own 级权限，默认集合里有；T55 的 operator 白名单见该条）。
  - 持有 supplier 的用户：能建声明了 `upstreamFields: []` 的 OAuth、managed 类账号（如 claude_oauth），建可自定义上游的账号 403（需 `account:relay`），绑定分组 403（需 `account:group:bind` 或 `group:manage`），看不到别人创建的账号与代理。supplier 本身不含 `gateway:use`、`apikey:self:manage` 等，单独持有时不能调用网关，所以按附加型与 `user` 一起分配；经 API 只给 `supplier` 不会自动补 `user`。
  - 已有自定义角色 key 为 `supplier` 的部署启动失败，见 T50。生产库没有这样的角色。
  - 生产 operator 的存量清单（0097：{operator, user} + 全部自定义角色）追加 supplier 后为 {operator, supplier, user} + 全部自定义角色，在 T55 的迁移 0101 纠正为 {supplier, user}、不含自定义角色。
  - 与同级保护（T56）的关系：用户一旦持有 supplier，只有可分配清单含 supplier 的操作者（超管、admin、operator）能作用于他（改资料、禁用、余额、用户组、角色）；没有清单的自定义角色和所有访问密钥（如用访问密钥调余额的自动化脚本）对这些用户由成功变为 403 `details.role = supplier`。
  - 角色列表与可分配角色列表按“内置在前、id 升序”排列：新库里 supplier 排在 user 之前，升级的库里排在 user 之后（仅顺序不同）。
  - 滚动升级：混跑期间旧节点上重置 admin 或 operator 会按旧默认清单去掉 supplier，之后不会自动补回（supplier 已不是新建角色），需要超管在新节点上再重置一次或手工加回。
- 回滚：revert 这个提交即可，无迁移。回滚后 `supplier` 角色行仍在且保持 `builtin = true`（旧代码不认识它，不同步、不能删除、不能重置，仍可分配与编辑）；不需要时手工处理：`DELETE FROM roles WHERE key = 'supplier'; UPDATE authz_meta SET version = version + 1 WHERE id = 1;`（持有关系与清单项随之级联删除；推进版本让各节点在 30 秒内丢掉缓存的权限，否则持有者的 own 级权限要到下一次授权变更或重启才消失），或 `UPDATE roles SET builtin = false WHERE key = 'supplier';` 把它留作自定义角色（再次升级前须改名，见 T50）。

## T53 J2、M9、决策 D2、D14：超管专属权限（superOnly），admin 默认不含（产品性收紧）

- 改动：目录把 `plugin:grant:critical`、`plugin:grant:db_schema_unconfined`、`publisher:manage`、`system:update:execute`、`system:update:recover` 标为 superOnly。`builtinRole.accepts`（默认集合的唯一判断，`defaultPermissions` 与新增权限的自动授予都经它）先排除 superOnly，再看角色的 `grants`，所以从构造上任何内置角色的默认集合都不含它们，不需要每个角色的 `grants` 各自排除（与任务说明里“admin grants = !p.superOnly”等价，放在一处）；拆分继承（`inherits`）不经 `accepts`，由测试约束 superOnly 权限只能继承自 superOnly 权限。超管是 superuser，照旧拥有，可以把它们显式授给任何角色（含内置角色）；授予检查只要求操作者自己持有（`covers`），默认没有别人持有，所以委派总是从超管开始。本提交不回收存量（`SyncCore` 只加不减），存量回收在 T54 的迁移 0099。CONTRACTS §4 同步（👑）。无迁移。
- 影响对象：
  - 新库：admin 没有这 5 个权限；operator 原默认集合里的 `system:update:execute`、`system:update:recover` 也不再默认授予。所以新库的 admin 不能审批需要 critical 级宿主权限的插件（如 `ui.native`、无角色隔离的 `db.schema`；consent 403，缺 `plugin:grant:critical`），不能管理发布者与公钥，admin、operator 不能执行核心升级、导入发行包（POST `/system/upgrades`、`/system/releases/import`，`system:update:execute`），不能暂停、恢复、取消、回滚升级计划，也不能启用、停用集群节点（POST `/system/upgrades/:id/*`、`/system/nodes/:id/enable|disable`，`system:update:recover`；停用节点是运维日常动作，operator 默认不再能做）；这些由超管做，或由超管把权限显式授给某个角色。
  - 存量库：升级本身不改任何角色的权限（T54 之前 admin、operator 照旧持有）；但超管对内置角色点“恢复默认”（POST `/roles/:id/reset`）后，该角色失去这 5 个权限。
  - 委派（D14）：`role:define` 不是 superOnly。admin 仍可新建与自己同权（不含这 5 个）的自定义角色并分配，全程有 `role.create`、`role.permissions`、`user.roles` 审计；持有 superOnly 权限的角色默认只有超管能建、能改、能分配给人（非超管缺该权限，授予与作用对象检查都 403）；超管把 superOnly 权限连同 `role:define`、`role:assign` 授给某个角色后，其持有者也能继续授出该权限。
  - 存量库里内置角色的名称与描述不随升级改写（`SyncCore` 只在新建时写入）：admin 的描述仍是“默认拥有全部核心权限”，T54 回收后与实际不符，超管点“恢复默认”或手工改描述后更新。控制台的 mock 数据（`web/mock`）未同步这些默认值。
  - 超管把 superOnly 权限授给某个角色后，其持有者比默认 admin 权限大：默认 admin 不能再修改这些用户或该角色（`details.missing`）。
- 回滚：revert 这个提交即可，无迁移。回滚后的 `SyncCore` 不会把这 5 个权限补回给期间被重置过或新建库的 admin、operator（它们不是新建的权限），需要超管重新勾选或再点一次“恢复默认”。

## T54 J3、决策 D2：迁移 0099 回收内置 admin、operator 上的超管专属权限（产品性收紧）

- 改动：迁移 `0099_reclaim_super_only.sql`：删除内置（`builtin`）`admin`、`operator` 角色上 `plugin:grant:critical`、`plugin:grant:db_schema_unconfined`、`publisher:manage`、`system:update:execute`、`system:update:recover` 的 `role_permissions` 行；每删一行写一条审计（`user_id` 为空即系统，action `authz.reclaim.super_only`，target `role`/角色 id，`detail {role, key}`）；有回收时 `authz_meta.version + 1`，滚动升级中仍在运行的节点在 30 秒内丢掉缓存的权限集。先取授权锁（`authz_meta` 行 `FOR UPDATE`，与运行时所有授权写入同一把锁、同一顺序：旧节点上正在进行的角色修改先提交，迁移再读），然后一条语句（数据修改 CTE）完成，`SET LOCAL lock_timeout = '10s'`，只涉及几行。自定义角色、其他内置角色、其他权限不动；没有可回收的行时不写任何东西。CONTRACTS §4 同步。
- 影响对象：
  - 存量库的内置 admin 失去这 5 个权限、operator 失去 `system:update:execute`、`system:update:recover`（它原默认集合里只有这两个）：其持有者不能再审批需要 critical 级宿主权限的插件（`ui.native`、无角色隔离的 `db.schema`）、管理发布者与公钥、执行或暂停、恢复、取消核心升级，相应接口由成功变为 403。这些操作改由超管做；确需委派时，超管在角色页把权限显式授给某个角色（内置或自定义均可，T51、T53），迁移不会再次回收（除非按下面的回滚步骤删掉了迁移记录后再次升级：迁移重新执行，超管授回给内置 admin、operator 的也会再被回收）。
  - 按旧默认集合，存量 admin 持有全部 5 个、operator 持有 2 个（未被手工改过时），迁移后各写 5 条与 2 条审计；生产 operator 目前 0 个持有者。
  - 升级依赖：只靠 admin 账号（非超管）执行核心升级或安装带 `ui.native` 插件的部署，升级后要改用超管账号，或先让超管把权限授给一个自定义角色。
  - 滚动升级：迁移在第一个新节点启动时执行（托管部署在取得迁移许可时执行，其后重启的旧节点因库里有它不认识的迁移而不能启动）；非托管部署里旧节点重启不会把这些权限补回（对旧代码它们不是新建的权限）。但旧节点上对 admin、operator 点“恢复默认”会按旧默认集合把它们加回，混跑期间不要在旧节点上重置内置角色。
- 回滚：revert 这个提交并 `DELETE FROM schema_migrations WHERE id = '0099_reclaim_super_only.sql';`（托管部署必须删：托管核心启动时核对迁移清单，库里有本版本不认识的迁移就拒绝启动；非托管部署不删也可）。被回收的授权不会自动恢复：由超管在角色页对 admin、operator 点“恢复默认”（旧代码的默认集合含这些权限），或按审计行手工补回：`INSERT INTO role_permissions (role_id, permission_id) SELECT a.target_id::bigint, p.id FROM audit_logs a JOIN permissions p ON p.key = a.detail->>'key' WHERE a.action = 'authz.reclaim.super_only' AND a.target_type = 'role' ON CONFLICT DO NOTHING; UPDATE authz_meta SET version = version + 1 WHERE id = 1;`（手工补回不写审计，各节点在 30 秒内生效）。

## T55 J4、R1、U8、决策 D3、5：operator 显式白名单，audit 独立模块，纠正 operator 的可分配清单（产品性收紧）

- 改动：
  - 白名单（R1、D3）：内置 operator 的默认权限由“除若干模块外的全部”改为显式清单 `authz.operatorPermissions`：`user:read`、`user:create`、`user:update`、`role:read`、`role:assign`、`group:read`、`group:manage`、`segment:read`、`segment:manage`、`account:read`、`account:create`、`account:update`、`account:delete`、`account:test`、`proxy:read`、`proxy:manage`、`price:read`、`balance:all:read`、`usage:all:read`、`node:read`、`audit:read`、`task:read`、`task:run`，加上 supplier 的 8 项（`account:own:*` 六项、`proxy:own:read`、`proxy:own:manage`）与 user 的 4 项。own 级与全量级同时持有是冗余的，保留是为了与角色编辑器“全部 = {all, own}”的数据形态一致。取舍（主节点裁决）：D3 排除的是全量级 `account:credential:view`；own 级 `account:own:credential:view` 保留，它只能看 operator 自己创建的账号的凭证，没有它 operator 授不出 supplier、也不能作用于 supplier 用户（与决策 5“operator 可分配 supplier”矛盾）。相对旧默认集合去掉：`role:define`、`user:delete`、`user:password:reset`、`balance:adjust`、`usage:settle`、`account:credential:view`、`account:settings:custom`、`account:group:bind`、`account:relay`、`price:manage`、`task:manage`、`system:update:read`（execute、recover 已在 T53 去掉）。以后新增的核心权限不再自动授给 operator，须写进白名单。
  - U8：目录新增模块 `audit`（审计），`audit:read` 从 `node` 模块移入，key 不变；`SyncCore` 更新 `permissions.module` 与排序，授权行不动。
  - 可分配清单：迁移 `0101_operator_assignable.sql` 把内置（`builtin`）operator 的清单纠正为决策 5：删除 supplier、user 以外的清单项，补上已存在的 supplier、user，`assign_custom = false`；有变化时写一条审计（系统，action `role.assignable`，`detail {via: "migration 0101", role_keys, assign_custom, added, removed, removed_assign_custom}`）并 `authz_meta.version + 1`。迁移时 supplier 角色可能还不存在（T52 的角色由随后的 `SyncCore` 建出并追加到 operator 的清单）。只动这一个角色的清单，不动它的权限，不动 admin 与自定义角色。新库由 `SyncCore` 的默认清单给出。CONTRACTS §4、§43.6 同步。
- 影响对象：
  - 新库，以及超管对 operator 点“恢复默认”之后：operator 等于白名单，不能再定义角色、删除用户、重置他人密码与两步验证、调整余额、结算退款、查看他人账号凭证、管理全局模型价格与价格源（`price:manage`；分组价、用户组价仍随 `group:manage`、`segment:manage`，operator 照旧能改）、启停插件定时任务、查看核心升级（完整列表见上面“去掉”清单）；能做的是日常的用户、分组、用户组、账号、代理管理与只读的价格、余额、用量、节点、审计、定时任务（可手动运行）。注意 operator 对账号是全量级，新建可自定义上游的账号、绑定分组不受 own 级限制（`account:relay`、`account:group:bind` 只约束 own 级调用者）；但改受限设置（如自定义 Base URL）需要的 `account:settings:custom` 不在白名单里。
  - 存量库：operator 的权限不自动改动（`SyncCore` 只加不减；生产 operator 仍是旧默认集合减去 T54 回收的 2 项），要按白名单收紧由超管点“恢复默认”。生产 operator 目前 0 个持有者。
  - 存量库 operator 的可分配清单由 {operator, user} + 全部自定义角色变为 {supplier, user}：operator 不能再分配或撤销 operator 与自定义角色，并且按同级保护（T56）不能再作用于其他 operator 和自定义角色的持有者。0097 之后有人手工调整过 operator 清单的部署，调整会被这次迁移覆盖（迁移不区分来源），升级后由超管重新设置。
  - 角色编辑器里“查看审计日志”从“集群”分组移到新的“审计”分组；按模块名处理权限目录的外部脚本需要认识 `audit`。
  - 发布顺序：本分支的迁移编号是 0099、0101，0100 在并行的另一组（p3b）。托管核心要求已执行的迁移是清单的连续前缀（`app/managed_checks.go` `appliedPrefix`）：只带 0099、0101 的版本一旦在托管部署上执行过，之后带 0100 的版本会因“migration history has a gap before 0101_operator_assignable.sql”拒绝启动。两组必须合并后在同一个版本里发布（或 0100 先发布），不要单独发布本组。
  - 控制台的 mock 数据（`web/mock/resources.ts`）仍是旧的 operator 默认集合，也没有 `audit` 模块，未同步（只影响本地 mock）。
  - 滚动升级：新旧节点混跑时最后启动的节点决定目录，旧节点启动会把 `audit:read` 的模块改回 `node`（仅展示分组），到某个新节点重启为止。
- 回滚：revert 这个提交并 `DELETE FROM schema_migrations WHERE id = '0101_operator_assignable.sql';`（托管部署必须删：托管核心启动时核对迁移清单，库里有本版本不认识的迁移就拒绝启动；非托管部署不删也可。删掉后再次升级会重新执行该迁移，把超管期间经 PUT 设回的清单再次收窄）。可分配清单不会自动恢复：需要时由超管经 PUT `/roles/<operator id>/assignable` 设回（审计行的 `removed`、`removed_assign_custom` 记录了原值）。回滚后的 `SyncCore` 把 `audit:read` 的模块改回 `node`；期间被重置过的 operator 权限按旧代码再点一次“恢复默认”即回到旧默认集合。

## T56 决策 D17：同级保护，作用于用户时目标的非默认角色须在操作者的可分配清单内（产品性收紧）

> FU6 在此基础上合并为“可管理目标”：本人也按同一规则判断，操作者一侧按其角色而不被访问密钥收窄（下文“访问密钥没有可分配角色”一条不再成立），见 FU6。

- 改动：`authz.CanActOnUsers` 在“目标角色授予的权限在操作者之内”之后追加：操作者不是超管时，目标们持有的每个角色（默认角色 `user` 除外）都必须 `grantSet(actor).CanAssign(role)`，否则 403 `you cannot modify a user holding a role you cannot assign`，`details.role` 为第一个不可分配的角色（按 key 排序）。`usersRoles` 一条查询同时给出目标的角色 key 与授予集合（不增加查询）。分配角色（`SetUserRoles` 的 `checkAssignment`）对目标的判断改为调用同一个 `targetsWithin`（`canActOnUsers` 的判断部分，复用已读出的操作者授予集合；原先内联只比较权限），所以 PUT `/users/:id/roles` 同样生效。系统（actor 0）、作用于自己（登录会话）、超管不受影响。CONTRACTS §43.6 同步。无迁移。
- 影响对象（所有作用于用户的入口：PATCH/DELETE `/users/:id`、DELETE `/users/:id/security`、PUT `/users/:id/roles`、余额调整、用户组成员变更）：
  - admin 不能再修改、禁用、删除其他 admin，不能重置其密码与两步验证，不能调整其余额、用户组、角色（默认清单里 admin 不可分配 admin），由成功变为 403；需要时由超管操作。admin 对 operator、supplier（T52 建出并加入 admin 的清单后）、自定义角色持有者、普通用户不变。
  - operator 不能再作用于其他 operator 以及任何自定义角色的持有者（决策 5 的清单为 supplier、user）；生产库 operator 的存量清单是 {operator, user} + 全部自定义角色（迁移 0097），在 T55 的迁移 0101 纠正之前，生产上 operator 之间仍可互相操作。
  - 没有可分配清单的自定义角色（如只有 `user:read`、`user:update` 的客服角色）只能作用于只有 `user` 角色或没有角色的用户；原先只要权限覆盖目标就可以（例如作用于另一个同角色的客服）。需要管理某类角色的持有者时，由超管把该角色加入其可分配清单。
  - 访问密钥没有可分配角色：只能作用于只有 `user` 角色或没有角色的用户（原先权限覆盖即可）；密钥主人也一样，主人持有任何非默认角色时其密钥不能再经 `/users/:id` 改主人。
  - 批量接口（用户组成员）里只要有一个目标不满足，整批 403。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T57 决策 D4：只认会话的权限扩展（代码执行、信任根、明文凭证）（产品性收紧）

- 改动：目录把 `plugin:install`、`plugin:uninstall`、`plugin:grant:high`、`plugin:grant:critical`、`plugin:grant:db_schema_unconfined`、`publisher:manage`、`system:update:execute`、`system:update:recover`、`account:credential:view`、`account:own:credential:view` 标为 sessionOnly（它们都已是 sensitive）。只改数据，经已有的 `authz.KeyAllowed` 生效，规则与 T10 相同。CONTRACTS §4、§80 同步。无迁移。
- 影响对象：
  - 访问密钥的可选权限列表不再显示这 10 项（超管也一样）；创建、修改密钥时选它们 403（`details.session_only`）；存量密钥里的这些权限在校验时丢弃，`GET /me/access-keys` 的 `lost` 列出，其余权限照常。
  - 用访问密钥调用下列接口由成功变为 403，需改用登录会话：POST `/plugins/upload`、`/plugins/install-from-market`、`/plugins/:key/versions/:version/consent`、`/reject`；DELETE `/plugins/:key`、`/plugins/retired-keys/:key/release`、`/plugins/:key/uninstall/confirm-stopped`；发布者与公钥的写接口（`publisher:manage`）；POST `/system/upgrades`、`/system/releases/import`（`system:update:execute`）与 `/system/upgrades/:id/*`、`/system/nodes/:id/*` 的恢复动作（`system:update:recover`）。用访问密钥做自动升级或自动装插件的外部脚本受影响；仓库内的部署脚本（`deploy/gateway/ovh/upgrade_observe.py`）用登录会话，网关（`gateway/internal/control`）不用访问密钥，均不受影响。
  - `POST /accounts/:id/credentials/reveal` 自 T11 起就只认会话，不变。访问密钥在 `PATCH /accounts/:id` 与 `POST /accounts/:id/models/fetch` 上一律按“不能查看凭证”处理：保留掩码密钥的同时改上游地址，由成功变为 400 `reenter_required`（T28），重新输入密钥即可。
  - 访问密钥管理页把这些权限显示在“已失效”里，现有文案是“你已经没有这些权限”（T10 起如此）；对只认会话的权限并不准确（用户仍持有，只是密钥不能带），文案未改。
  - 滚动升级：判断在各节点进程内，新旧节点混跑时旧节点仍接受带这些权限的密钥、仍允许选择它们，全部节点升级后才完全生效。
- 回滚：revert 这个提交即可，无迁移。回滚后存量密钥里保存的这些权限立即恢复生效；升级期间在访问密钥页保存过的密钥除外（保存时已失效的权限被去掉），需要重新勾选。

## T58 P3：插件权限的默认角色与继承（manifest defaultRoles / inheritFrom）

- 改动：
  - SDK：`manifest.UserPermission` 增加 `defaultRoles`（首次登记时授予的内置角色，省略为 `admin`，`UserPermission.Roles()`）与 `inheritFrom`（首次登记时授予持有本插件这些旧本地 key 的角色）。`manifest.BuiltinRoleKeys = admin, operator, supplier, user`，与 `authz` 的内置角色（去掉超管）由 `TestManifestBuiltinRoleKeysMatchBuiltinRoles` 双向对照。校验：`defaultRoles` 只能取这四个（`invalid_value`，所以永远不含 `super_admin`）；`inheritFrom` 须是合法的本地 key 且不是自己（`invalid_value`；旧 key 通常已不再声明，所以不要求声明）。
  - 核心：`core.PermissionDef` 增加 `GrantRoles`、`InheritFrom`；`SyncPlugin(ctx, tx, pluginKey, defs)` 去掉 `grantNewToRoleKeys` 参数：新插入的 key 授予 `GrantRoles`（照旧排除超管角色），再调用核心同步已有的 `grantInherited` 授予持有 `InheritFrom` 的角色，两种都写 `authz.sync.grant` 审计（`via` 为 `default` / `inherit`，后者带 `from`），全部在删除不再声明的旧 key 之前执行（`TestSyncPluginGrantRolesAndInheritFrom` 用改名锁定顺序）。此前插件新权限的角色授予不写审计。
  - 安装：`roleGrants(m, req)` 按本地 key 给出新权限的角色：`ConsentRequest.new_permission_roles`（新字段，按 key 覆盖，空数组表示不授予）> 旧字段 `role_keys_for_new_permissions`（非空时作用于其余新权限）> manifest `defaultRoles`。`PermissionDefs(m, grants)` 与 `ApplyDefaults(ctx, tx, m, grants)` 共用它；`new_permission_roles` 指向未声明的权限时 400（`new_permission_roles.<key>` `unknown`）。内置插件启动时发空请求，按 manifest 默认授予，删除硬编码的 `admin`；协调器激活仍传 nil（新 key 在同意时已登记）。审核视图 `user_permissions[]` 增加 `default_roles`、`inherit_from`。`checkRoleGrantRights` 只检查请求显式指定的角色（manifest 默认属于系统目录默认，T59 再细化）。
  - 控制台同意页：不再默认勾选 `admin`，每个新权限旁显示“默认授予：…”；勾选角色即覆盖默认（仍发旧字段 `role_keys_for_new_permissions`）。
  - 插件 manifest（不升版本）：payment `recharge:use` → user/supplier/operator/admin，`config:manage` → admin；codex `codex:manage`、`codex:reset` 与 claude-oauth `claude_oauth:manage` → admin/operator。其余插件在 T60。
- 影响对象：只影响此后首次登记的插件权限：
  - 新装插件或升级新增的权限按 manifest 默认授予，可能不止 admin（例如 payment 的 `recharge:use` 直接给到 user，普通用户首次安装后即可充值，此前需要管理员手工给 user 角色勾选）；控制台默认不再把一切新权限交给 admin。
  - 已存在的权限、角色授予不变，不做回填。需要让存量环境与新默认一致的，按需执行（示例，先确认插件已安装）：
    ```sql
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.key IN ('user','supplier','operator','admin') AND p.key = 'plugin.payment:recharge:use'
    ON CONFLICT DO NOTHING;
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r, permissions p
    WHERE r.key = 'operator' AND p.key IN ('plugin.codex:codex:manage','plugin.codex:codex:reset','plugin.claude_oauth:claude_oauth:manage')
    ON CONFLICT DO NOTHING;
    ```
    手工 SQL 不写审计，也不会递增 `authz_meta.version`，各节点的权限缓存要到下一次权限变更或重启才刷新；更推荐在角色页勾选（立即生效并带审计）。
  - 旧控制台（仍发 `role_keys_for_new_permissions: ["admin"]`）照旧只给 admin。
  - 上传时自动沿用同意（`carryOverConsent`，升级没有新增宿主权限时）发的是空请求：新增的用户权限按 manifest 默认授予（改名的除外，只继承，见 T60 追加），无人审核；此前不授予任何角色（审查发现，接受：defaultRoles 本来就是系统目录默认，与核心升级自动授予一致）。
  - 已知边界：`inheritFrom` 只看本次同步前已有的授予，同一次同步里新建的两个 key 之间不传递（期 3 审查补：原实现先写全部默认授予再按继承授予，继承会读到本次刚写的默认授予，例如全新安装 moderation 时 admin 经 `moderation:read` 的默认授予得到 `moderation:exempt`，与这里和 manifest 注释不符；现在 `SyncPlugin` 的继承来源去掉本次新建的 key，`TestSyncPluginInheritsOnlyEarlierGrants` 覆盖）；协调器激活传 nil，激活时才重新建出的 key（例如升级失败后激活旧版本，旧版本里被新版本删掉的 key）只按 `inheritFrom` 继承、不按 `defaultRoles` 授予，此前同样不授予。
- 回滚：revert 这个提交即可，无迁移；已按新默认授出的角色权限保留，需要时在角色页取消。

## T59 P1：新插件权限的授予资格（manifest 默认按系统目录默认，显式覆盖走 editableRole，产品性收紧）

- 改动：`install.checkRoleGrantRights` 只看同意请求显式指定的角色（`new_permission_roles` 或旧字段 `role_keys_for_new_permissions`，只算本次目录里还不存在的权限）：要求 `role:define`（403 `details.permission = role:define`），再调用新的 `core.PermissionCatalog.CanGrantToRoles(ctx, tx, actor, roleKeys)`。authz 的实现对每个角色走核心 `editableRole`（内置角色只有超管能改，决策 6；自定义角色当前权限须 ⊆ 操作者，M5），且须在操作者的可分配清单内、不是操作者持有的角色（见下面“已定”），超管角色 403，未知角色 400 `role_keys` `unknown`；与其他角色写入一样先 `Bump` 并锁住角色行。去掉了此前“操作者必须持有被授予的新权限”（`CanGrant`）的要求：新 key 本身不要求操作者持有。manifest `defaultRoles` 不检查任何权限，在同一事务里由 `SyncPlugin` 以系统身份（actor 0）授予并写 `authz.sync.grant` 审计，与 `SyncCore` 自动授予一致。插件域不另写角色判断。
- 测试：`authz.TestCanGrantToRoles`（真实库：operator 对权限 ⊆ 自己的自定义角色通过，对更大的自定义角色、内置角色、超管角色 403，未知 400；超管对内置与自定义通过、对超管角色 403），`install.TestConsentRoleGrantRights`（没有 `role:define` 带显式角色 403；目录拒绝时 403 且检查的是去重后的角色；不带显式角色时没有 `role:define` 也按 manifest 默认授予；升级不新增权限时带角色不需要 `role:define`）。
- 影响对象：
  - 非超管（含内置 admin）在同意页勾选内置角色（admin、operator、supplier、user）或权限比自己大的自定义角色：由成功（期 3a 遗留路径，等于绕过决策 6 改内置角色）变为 403。不勾选时按 manifest 默认授予，不受影响。控制台列出全部角色，勾了不能改的角色会在提交时报错。
  - 旧控制台默认发 `role_keys_for_new_permissions: ["admin"]`：非超管用旧控制台安装带新权限的插件会 403，需要升级控制台或不勾选（发空数组）。
  - 只有 `role:define` 而不持有插件新权限的人，现在可以把新权限交给自己能改、且在自己可分配清单内的自定义角色（新 key 不要求持有；自己持有的角色不行）。
  - 用访问密钥调用时可分配清单为空（`RestrictToAccessKey` 去掉可分配集合，与 PUT `/users/:id/roles` 一致），所以访问密钥不能显式指定任何角色（403 `details.role`），只能按 manifest 默认。
  - 已定（期 3 审查发现 A，已改代码）：显式指定的每个角色除了 `editableRole`，还须在操作者的可分配清单内（`CanGrantToRoles` → `pluginGrantee`，对操作者 `grantSet` 调 `CanAssign`，不在清单内 403 `details.role`），且非超管不能指定自己持有的角色（403 `details.role`）。期 3 审查 R1 之后 `assign_custom`（“全部自定义角色”）已不含操作者自己持有的角色，但可分配清单按名字列出的角色照旧可分配（例如角色清单列出自己，或操作者同时持有 A 与 A 清单里的 B），所以另外排除持有的角色（独立审查发现）。结果：操作者不能把新插件权限（含 sensitive 的，如 payment `config:manage`）授给自己的角色，与 PUT `/roles/:id/permissions` 拒绝同样改动一致；能指定的只有清单内、权限 ⊆ 自己、自己不持有的其他自定义角色。内置角色照旧只有超管能指定（超管 `CanAssign` 全部，也可以指定自己同时持有的角色），超管角色照旧 403；系统（actor 0）照旧通过。manifest `defaultRoles`（系统目录默认）与升级不新增权限的情况不受影响。测试：`authz.TestCanGrantToRoles` 增加持有 `role:define` + `plugin:install` 的自定义角色：清单内的其他自定义角色通过；不在清单内、经通配指向自己、清单按名字列出自己、持有的另一个清单内角色、内置角色都 403；超管指定自己同时持有的自定义角色通过。
- 已知边界（审查发现，接受）：`role:define` 用权限缓存判断（与其他接口一致），角色本身的判断在事务里加锁进行；两者之间撤销 `role:define` 的极短窗口不处理。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T60：growth、moderation 权限语义拆分（inheritFrom 保留授权），moderation 工作人员缓存 60 秒，各插件写入 defaultRoles

- 改动（插件只改代码与 manifest，不升版本）：
  - growth：新增 `growth:use`（`inheritFrom: [growth:read]`，`defaultRoles: [user, supplier, operator, admin]`），守 4 条 `/me/*` 路由与“我的邀请”“每日签到”两个菜单；manifest 删除 `growth:read`；`growth:manage` 改名 `growth:stats:read`（`inheritFrom: [growth:manage]`，标签“查看增长后台”，保留 `sensitive`，`defaultRoles: [admin]`），守 5 条 `/admin/*` 路由与“增长管理”菜单。插件测试（testdata 副本同步）锁定路由与菜单的权限。
  - moderation：新增 `moderation:exempt`（免于审核观察与封禁，`defaultRoles: []`、`inheritFrom: [moderation:read]`，只靠继承）；工作人员判定（`staff.go`，常量 `PermRead` 改为 `PermExempt`）由 read 改为 exempt；缓存 TTL 由 5 分钟降为 60 秒。`moderation:read`、`moderation:manage` 写 `defaultRoles: [admin]`。
  - 其余插件按 T58 的表写 `defaultRoles: [admin]`：dynweight（`dynweight:read`、`dynweight:manage`）、volcengine（`assets:read`、`assets:manage`）、guard（三个）、anthropic（`model_catalog:read`）。与省略时的效果相同，只是写明。
  - 测试：`authz.TestSyncPluginSplitsGrowthAndModeration` 读取仓库里的真实 growth、moderation manifest，在旧 key 上同步：持有 `growth:read` 的角色获得 `growth:use`、持有 `growth:manage` 的获得 `growth:stats:read`、持有 `moderation:read` 的（含自定义角色）获得 `moderation:exempt`，旧 growth key 删除。`moderation.TestStaffIsExemptHolderCachedAMinute`。
- 影响对象：
  - 生效时机：插件不升版本，已装这个版本的环境不会重新同步权限目录，以上变化要到下一次升版本（期 4 统一升）或重装时才生效。
  - 升级 growth 后：存量授权按继承保留，`growth:use`、`growth:stats:read` 只给原来持有 `growth:read`、`growth:manage` 的角色（改名规则见下面的追加修改），用户无感；全新安装时 `growth:use` 按 `defaultRoles` 直接给 user、supplier、operator、admin（此前需要管理员手工授予）。角色页里 growth 的两个权限换了 key 与标签；直接写死旧 key 的外部脚本或自定义前端要改用新 key。旧 key 在激活新版本时删除，回到旧版本时旧 key 重新登记但不带授权（需要重新勾选）。
  - 升级 moderation 后：持有 `moderation:read` 的角色同时获得 `moderation:exempt`，工作人员范围不变，不另外授予任何角色（`defaultRoles: []`）。此后两者可以分开：只读审核员可以取消 exempt 而照常被观察，被豁免者也不必能看审核页。取消豁免（或用户失去该权限）在 60 秒内生效（此前 5 分钟），每个用户每分钟最多问一次宿主。
  - 命名一致性（`growth:stats:read` 与 `moderation:exempt` 的命名风格、`assets:*` 不带插件前缀等）：wontfix，key 改名会让存量授权依赖 `inheritFrom`，收益不足。
- 回滚：revert 这个提交即可。已经同步过新 manifest 的环境回滚到旧代码后，旧 key 重新登记时没有授权（新 key 被删除），需要在角色页重新勾选 `growth:read`、`growth:manage`；moderation 回滚后 `moderation:exempt` 被删除、判定回到 read，无需处理。

## T60 追加：改名只按继承授予；manifest `defaultRoles: []` 表示不授予（决策，审查后追加）

- 改动：
  - 改名规则（`install.roleGrants`）：新 key 声明了 `inheritFrom`，且同意时目录里已有其中某个旧 key（`catalogKeys` 一次查出本插件声明的 key 与它们的 `inheritFrom` key），视为改名或拆分，`GrantRoles` 为空，只靠 `SyncPlugin` 的继承；目录里没有旧 key（全新安装）才按 `defaultRoles`。没声明 `inheritFrom` 的新 key 照旧按 `defaultRoles`。同意请求的显式覆盖（`new_permission_roles`、旧字段）仍然优先。`checkRoleGrantRights` 复用同一份 `catalogKeys` 判断哪些 key 是新建的。
  - “不授予任何角色”的写法：`UserPermission.DefaultRoles` 区分省略（nil，`null` 同）与显式空数组：前者为 admin，后者不授予。字段去掉 `omitempty`，序列化往返不丢 `[]`（核心存的是包里的原始 manifest，不受影响；测试辅助会重新序列化）。校验不变。`moderation:exempt` 写 `"defaultRoles": []`。
  - 同意页（审查发现）：审核视图的 `user_permissions[].default_roles` 改为按当前目录算出的结果（`Review.resolveDefaultRoles` 复用 `catalogKeys` 与 `roleGrants`，上传与 `GET .../review` 都用），改名的 key 显示为空；控制台另显示“原 X 的持有者继承”（`inherit_from`）。
  - 测试：`TestRoleGrantsPriority` 增加改名、显式覆盖优先于改名与 `[]` 几种情形，`TestConsentRenameInheritsOnly` 走同意流程对比有无旧 key，`TestUserPermissionRoles` 覆盖省略、`null`、`[]` 与序列化往返。
- 影响对象：升级 growth 时 `growth:use` 只给原 `growth:read` 的持有者（不再让所有用户突然能签到领奖）；`moderation:exempt` 不按任何默认授予，只靠继承（安装者在同意页显式勾选角色时除外：旧字段 `role_keys_for_new_permissions` 作用于全部新权限，含改名的 key 与 exempt）。其他插件此后改名权限时同样只继承。显式写 `"defaultRoles": []` 的插件在旧核心上会被当成省略（给 admin）。
- 回滚：revert 这个提交即可；回滚后升级同意时改名的新 key 又会叠加 `defaultRoles`，`[]` 回到等同省略。

## T61 W4-P8、W4-P9：新插件权限的状态跟随插件运行状态

- 改动：`authz.SyncPlugin` 新登记的插件权限不再一律 `active`：插件此刻在运行（`plugins.status` 为 `enabled` 或 `upgrading`，与 `plugin/install` 的常量一致，`TestSyncPluginNewPermissionFollowsPluginStatus` 逐个状态验证，防漂移）时为 `active`，否则为 `disabled`；已存在的行不动。禁用时的 `SetPluginActive(false)` 不变；`rollout` 的 `commit` 现在每次激活都调用 `SetPluginActive(true)`（此前只在启用时），见下面的偏离说明。W4-P9 不改行为：`rollout.finishFailed` 的升级分支加注释说明“同意新版本时登记的新 key 保留到激活另一个版本”，`TestPermissionCatalogFollowsRollouts` 用真实的目录与 `DefaultsApplier` 锁定整个生命周期。无迁移。CONTRACTS §4 同步。
- 偏离任务说明（审查发现）：启用的 rollout 提交之后、完成之前，节点已经在服务，但 `plugins.status` 仍是 `enabling`；这段时间同意新版本（内置插件在滚动部署时会自动发生）登记的新 key 是 `disabled`，而升级提交原来不调用 `SetPluginActive`，这些 key 会一直停在 `disabled`，直到手工禁用再启用。因此升级提交也置 `active`（`plugin/rollout/coordinator.go`，超出任务列出的文件范围）。
- 影响对象：首次安装（尚未启用）和禁用期间同意新版本时登记的权限，此前立即 `active`（持有它的角色在插件没运行时就“有”这个权限，`/me` 的权限列表与 `Can` 会把它算进去），现在到启用那一刻才生效；角色授予照常写入，启用后无需重新勾选。授予视角（角色的权限清单、能否授予与分配的判断）本来就包含 `disabled` 的插件权限，不变。运行中升级登记的新权限仍立即 `active`。存量行不追溯：已经是 `active` 的未运行插件的权限保持原状，直到该插件下一次禁用或启用。升级失败后残留的新 key 没有任何路由检查，激活另一个版本时按那个版本的 manifest 清理；只是禁用再启用同一版本不会清理。
- 回滚：revert 这两个提交即可，无迁移；回滚后已登记为 `disabled` 的权限在插件下次启用时变为 `active`。

## T62 W4-A4：插件任务手动运行统一要求 task:run（产品性收紧）

- 改动：`POST /plugins/:key/jobs/:job_id/run` 的权限由 `plugin:manage` 改为 `task:run`（`plugin/api/api.go`，用 `task.PermRun`），与 `POST /system/tasks/:name/run` 同口径：同一个任务不再有两个权限不同的手动运行入口。审计动作仍是 `plugin.job.run`。插件详情“任务”页的“立即运行”按钮改按 `task:run` 显示（`JobsTab.vue`）。无迁移。CONTRACTS §5.7 路由表同步。
- 影响对象：只有 `plugin:manage`、没有 `task:run` 的角色：调用由 204 变为 403 `details.permission = task:run`，按钮不再显示；内置 `admin` 两个权限都有，不受影响。反过来，只有 `task:run` 的人（内置 `operator` 默认有 `task:run`、没有 `plugin:*`）现在可以从这个接口运行插件任务，他此前已经能在定时任务页运行同一个任务（看插件的任务列表仍需 `plugin:read`，所以 `operator` 看不到这个页面）。访问密钥无变化：`task:run` 与 `plugin:manage` 一样不是只认会话的权限，密钥带上它即可调用。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## T63 W1-F10：管理员禁用锁 accounts.admin_locked（迁移 0100，产品性收紧）

- 改动：
  - 迁移 `0100_account_admin_locked.sql`：`accounts.admin_locked boolean NOT NULL DEFAULT false`（常量默认值，不重写表；`lock_timeout` 10 秒；存量为 false，不追溯）。
  - `PATCH /accounts/:id`（`account/handlers.go`）：全量范围（`account:update`）把别人创建的账号（含没有创建人的历史账号）设为 `disabled` 时置 `admin_locked = true`，`status_reason` 仍是 `disabled by administrator`；own 范围（`account:own:update`）禁用写 `disabled by owner`，不动锁；全量范围设为 `active` 时清锁（`adminLockAfter`、`disabledReason`）。账号已被属主禁用时管理员再发一次 `disabled` 也上锁并把原因改成管理员的（按请求的状态判断，不要求状态发生变化）。
  - `checkAdminLock` 是 `checkOwnChange` 的最后一步：own 范围、账号已上锁且请求把 `status` 改为 `active` → 403 `account_locked_by_admin`；`POST /accounts/:id/reset-status` 在 own 范围遇到上锁账号返回同一错误，全量范围的重置清锁。
  - 账号视图增加 `admin_locked`。控制台账号页：只有 own 级更新权限的人在上锁账号上“启用”按钮禁用并提示“已被管理员禁用，只有管理员可以重新启用”，“重置状态”入口与批量启用跳过这些账号（`AccountsView.vue` 的 `lockedByAdmin`）。CONTRACTS §15.9 账号字段表、§21.3.1、§43.5 与 reset-status 一节同步；控制台 mock（`web/mock/accounts.ts`）同样处理。
- 影响对象：
  - 只有 own 级权限的账号创建人（供应商）：账号被管理员禁用后不能再自行启用或重置状态，需要管理员启用；此前可以立刻自己改回 `active`。修改其它字段（名称、凭证、用量上限等）不受影响，供应商调高用量上限仍然允许（已评估，不修）。自己禁用的账号照旧可以自己恢复。
  - `status_reason` 文案：own 范围手动禁用由 `disabled by administrator` 变为 `disabled by owner`（依赖这个字符串的外部脚本需要注意；仓库内没有按它判断的代码）。
  - 持有 `account:update` 的人（admin、operator）之间不互锁：任何全量范围的调用者都能启用。全量范围禁用自己创建的账号不上锁。
  - 存量：迁移前已被管理员禁用的账号不上锁，需要锁住的由管理员重新禁用一次（对已禁用的账号再发一次 `status: disabled` 即可，控制台的按钮不会对已禁用账号发请求，需直接调接口或先启用再禁用）。
  - 自动禁用（`auto_disabled`、`error`）与重新授权的恢复逻辑不变，它们不写也不读这个锁；上锁账号的状态是 `disabled`，重新授权本来就不恢复手动禁用。
  - 期 3 审查补（服务端部分已在发布前去兼容层删除：停服发布没有旧节点，上锁的账号总是 `disabled`）：锁只在账号仍是 `disabled` 时拦截。旧节点启用过的上锁账号若随后被网关自动禁用（`auto_disabled`、`error`），此前属主启用与重置状态都会 403；现在放行并清掉残留的锁（服务端 `checkAdminLock` 与控制台 `lockedByAdmin` 同步）。
- 回滚：revert 这个提交并 `DELETE FROM schema_migrations WHERE id = '0100_account_admin_locked.sql';`（托管部署必须删：托管核心启动时核对迁移清单，库里有本版本不认识的迁移就拒绝启动；非托管部署不删也可，同 0099、0101）；`admin_locked` 列留在库里无害（旧版本不读），需要时 `ALTER TABLE accounts DROP COLUMN admin_locked`（删列后必须同时删掉上面的 `schema_migrations` 行，否则再次升级不会重建该列）。回滚后被锁的账号其创建人又可以自行启用。混跑时旧节点不认识这个锁：经旧节点处理的请求既不上锁也不拦截；旧节点启用过的上锁账号会留下一个“运行中但带锁”的残留，属主下次自己禁用时清掉（不会因此被锁住），全量范围的任何启用、重置也会清掉。
- 已知边界（未处理，需要时另行决定）：锁只管启用与重置状态。有 `account:own:delete` 与 `account:own:create` 的属主可以删除被锁的账号再用同一凭证新建一个；审计里 `account.update` / `account.reset_status` 不单独记录上锁、解锁（可由操作者范围与状态变化推出）。

## T64 W1-F13：草稿与预备容器的单用户数量上限

- 改动：`POST /system/ccgateway/drafts`（`ccgateway/drafts.go` `draftCreate`）与 `POST /account-types/:plugin_key/:type/preparations`（`account/preparations.go` `createPreparation`）的 INSERT 改为带计数条件的单条 `INSERT ... SELECT ... WHERE`，在事务里先取该用户的 advisory 事务锁（`core.LockOpenDrafts`，期 3 审查补）：该用户未完成的数量达到上限（`core.MaxOpenDrafts = 3`，两处共用）时插入 0 行，返回 429 `too_many_drafts`（`core.ErrTooManyDrafts`）。草稿计 `created_by = 本人 AND account_id IS NULL AND retired_at IS NULL`；预备容器计 `created_by = 本人 AND account_id IS NULL AND state IN ('pending','ready') AND expires_at > now()`，同一个 `idempotency_key` 的重试不算新的。持有 `settings:manage`（草稿）或全量 `account:create`（预备容器）不受限。首次准备就失败的预备容器（控制器未配置、代理被拒、插件不可用等）不占名额：它的 key 从未返回给调用方，没人能取消，所以核心随即撤销并删行（`abandonPreparation`；撤销失败时留在 `cancelling`，不计数，由清理任务重试）。控制台为 `too_many_drafts` 增加中英文提示，且不再为它探测运行环境配置。无迁移。CONTRACTS §3.1 错误码、§49.9 路由表同步。
- 影响对象：
  - 控制台新建 Claude Code 账号走的是预备容器接口，所以实际受限的是 own 级用户（`account:own:create`）：同时未完成的不能超过 3 个；全量 `account:create`（admin、operator）在这条路径上不受限。草稿接口（旧路径）上，没有 `settings:manage` 的人（含只有 `account:create` 的）同样限 3 个。
  - 两个上限各算各的，不合并：ccgateway 的预备容器在 `ccgateway_runtimes` 里也有一行（`lifecycle.go`），会占草稿名额；草稿不占预备容器名额。own 级用户先建 3 个草稿再建 3 个预备容器，最多可以占 6 个运行环境容器；此前不限。
  - 正常使用一次只有一个：关闭编辑器（组件卸载）时控制台会删除。刷新页面、直接关标签页、请求超时或多个标签页会留下没删的，闲置 15 分钟（或创建满 2 小时）后由清理任务回收；15 分钟内这样攒到 3 个后，第 4 次会看到上面的提示。控制器不可达时删不掉的草稿在清理成功之前一直占名额（此时任何草稿都用不了）。
  - 并发：原实现不加锁，“可能多出 1 个”的估计不对。READ COMMITTED 下每条语句只看到已提交的行，k 个并发请求在计数为 2 时都会插入（期 3 审查实测 12 个并发得到 5 个），上限可被并行请求任意突破。期 3 审查改为在计数插入前取按用户的 advisory 事务锁（`core.LockOpenDrafts`，草稿与预备容器共用同一把锁，只在有上限时取），`TestDraftCreateLimitConcurrent` 覆盖。
- 回滚：revert 这两个提交即可，无迁移、无数据变化。

## T65 W4-A3、W4-P5：插件 UI 可见性过滤收敛为 manifest.FilterUI，插件权限排序修正

- 改动：
  - W4-A3（纯重构）：新增 `next/sdk/manifest/visible_ui.go`：`FilterUI(ui, allowed, allowedCore) VisibleUI`（`Menus`、`Pages`、`Slots`、`AccountActions`），逻辑原样搬自 `plugin/api/ui.go` 的 `visibleMenusAndPages`、`visibleNav` 与槽位、账号动作两段循环（含页面侧边导航 `nav` 的 `permission`/`corePermission` 规则）。`GET /ui/plugins`（`uiPlugins`）取全部，侧栏 `GET /me/menus`（`authz.pluginMenus`）只取 `.Menus`；两处的 `allowed` 都写成 `p == "" || set.Has(manifest.PermissionKey(key, p))`，核心权限用 `set.Has`。未声明权限的元素不询问回调直接可见。原 `plugin/api` 的四个用例搬到 `sdk/manifest/visible_ui_test.go`，`TestMenus` 断言侧栏的插件菜单与 `FilterUI` 结果一致。
  - W4-P5：`install.PermissionDefs` 的 `Sort` 由 `i` 改为 `(i+1)*10`，`authz.SyncPlugin` 删除 `sort == 0` 时按位置补 `(i+1)*10` 的兜底，直接写入给定值。此前第一个权限的 0 被当成“未设置”补成 10，其余是 1、2、3…，于是 manifest 里排第一的权限在角色页排到后面（不超过 10 个权限的插件里排到最后）。
- 影响对象：W4-A3 无行为变化。W4-P5 只影响角色页里插件权限的显示顺序：每个插件下一次同步权限目录（同意新版本，或激活另一个版本）时，`ON CONFLICT` 把存量行的 `sort` 改成 10、20、30…，顺序变为 manifest 声明的顺序；在那之前保持旧顺序，只是禁用再启用同一版本不会同步，一直不升级的插件保持旧顺序（不做一次性重排）。同意新版本到它激活之间，目录里是新旧两份 manifest 的并集，各自从 10 编号，同号的按 key 排。无迁移，权限判断不受影响。
- 回滚：revert 这个提交即可；回滚后下一次同步把 `sort` 写回旧编号。

## FU1 T30 跟进：管理员只改端口、协议时不再置 allow_private

- 改动：`PATCH /proxies/:id`（`proxy/proxy.go` `update`）在地址变化时照旧经 `checkPrivate` 判断（own 范围改到私网地址或改管理员放在私网地址上的代理的端口、协议仍 403），但写入 `allow_private` 的条件收窄为“host 变化（不分大小写与现值比较），或调用者只有 own 范围”。持 `proxy:manage` 只改 `port` / `protocol` 时保留原值。`private_test.go` `TestUpdateHostPrivate` 改断言：管理员对 `allow_private = false` 的 own 代理改端口、改协议后仍为 `false`；改 host 置 `true`，此后改端口保持 `true`；own 改端口照旧置回 `false`。CONTRACTS §43.3 同步。无迁移。
- 影响对象：持 `proxy:manage` 的人（admin）编辑他人或自己的代理只动端口、协议时，`allow_private` 不再变成 `true`。此前这样编辑后，own 属主能把域名指向内网、经该代理连到私网地址。T30 升级说明里“改端口再改回以保留私网可达”的做法不再生效，需改动 host 再改回。own 级用户的行为不变。
- 回滚：revert 这个提交即可，无迁移；期间写下的 `allow_private` 保留。

## FU2 segment:manage 不能改自己所在用户组的定价与授权（产品性收紧，单独提交）

> FU6 改写了判断方式：`GuardOwnSegments` 不再经 `core.ActOnOthers`，改为问 `UserGuard` 调用者能否管理自己，被拒时 409 `you cannot change the terms of a user group you are in`（原为 `you cannot do this to yourself`），见 FU6。

- 改动：新增 `segment.GuardOwnSegments(ctx, q, users, segmentIDs)`：调用者是其中任一用户组（默认用户组除外）的成员时经 `core.ActOnOthers(ctx, users, actor, actor)` 判断，非超管 409 `you cannot do this to yourself`，超管放行并由 `authz.ActOnSelf` 记 `user.act_on_self` 审计（FU5）。所有改变用户组定价或授权的入口只调这一个函数：`PATCH /segments/:id` 带 `discount` 时（只改名称、描述不检查）、`DELETE /segments/:id`（事务里，加锁之后）、`savePairs`（`PUT /segments/:id/groups` 与 `PUT /groups/:id/segments` 共用，事务里 `lockPairs` 之后，按 `items` 涉及的全部用户组）、billing `saveGroupPrices`（`PUT /groups/:id/model-prices`，事务里按 `segment_id` 非空的项，`segmentsOf`）。个人专属的设置走的就是这几个接口，设/取消个人专属已由 T33 检查。访问密钥照常先过路由权限（`segment:manage` / `group:manage`）。CONTRACTS §97.6 原“作用于用户组本身的写入不做目标用户检查（wontfix）”一段改写。无迁移。
- 默认用户组豁免（主节点决定）：所有用户默认都在默认用户组，改它等同于改全平台定价，与 `price:manage`、`group:manage` 改全局价格同一性质，不算给自己定价；FU2 堵的是命名组与个人专属组里的自我定价。如需收紧，只要去掉 `GuardOwnSegments` SQL 里的 `NOT s.is_default`。
- 测试：`segment` `TestSettingsOfOwnSegment`（自己所在命名组的折扣、`PUT /segments/:id/groups`、`PUT /groups/:id/segments`、删除均 409 且不写；改名与读取不受影响；不含自己的组与默认组成功；自己的个人专属同样 409；超管改自己所在组成功并有审计）；`billing` `TestGroupModelPricesOfOwnSegment`（自己所在命名组、个人专属的专属价 409，他人的组、分组自身价格、默认组 200）。
- 影响对象：持 `segment:manage` / `group:manage` 的非超管（admin、operator 等）不能再修改自己所在命名用户组或自己个人专属的折扣、授权、专属倍率、专属价，也不能删除自己所在的命名组：由成功变为 409，需由超管或不在该组的人修改。默认用户组、只改名称或描述、他人所在的组不受影响。超管不受影响（每次多一条审计）。批量写入里只要有一个用户组含调用者，整批拒绝。分组自身的倍率与分组价格（`segment_id` 为 `null`）仍可由 `group:manage` 修改，和默认组一样按平台级处理。
- 已知：超管的豁免审计经连接池写，先于写事务提交；写事务随后回滚（如专属价的外键冲突转 409）时审计行留下（只涉及超管、罕见，改为随事务写需要让 `ActOnSelf` 接收事务）。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## FU3 D22 补齐：ccgateway 请求日志详情的 events、upstream_request 与请求、响应头按白名单投影

- 改动：`ccgateway/request_log_viewer.go` 把 T43 的 `projectMetadata` 推广为一个泛型投影 `keepSummary(m, keep fieldSet)`（只留白名单里、值为标量或字符串数组的字段，名字按小写比较，默认拒绝），详情经 `requestLogDetail.project(content)` 一处处理：未命中 `settings:manage` 时 `metadata`（`requestLogSummaryKeys`，不变）、`events`（每条 `time`/`event` + `detail` 按 `requestLogEventDetailKeys`）、`upstream_request`（`requestLogUpstreamKeys`，`url` 换成 `host`，`headers` 按 `requestLogSummaryHeaders`）、请求/响应头（`requestLogSummaryHeaders`）都经它投影；随后两种调用者都照旧遮蔽密钥头。事件白名单按 Worker（`plugins/ccgateway/companions/engine` 的 `trace`/`traceNow` 调用）实际写出的 detail 字段逐个确定，只收状态、码、计数、耗时、摘要值、布尔等非敏感字段。不改 Worker。控制台 `upstreamFacts` 在没有 `url` 时显示 `host`。CONTRACTS §64.2 同步。审查补充：响应头白名单加 `x-ccgateway-error-source` / `x-ccgateway-error-reason`（只带码）；控制台事件页与上游请求页对没有 `settings:manage` 的读者改为提示“只显示摘要字段”（`eventsBounded`、`upstream.hintSummary`）。无迁移。
- 测试：`TestRequestLogDetailProjectsEventsWithoutContent`（`account:read` 读不到 `principal_id`、错误原文、路径与查询、上传文件名、`url`、`User-Agent`、未知字段、非对象事件；保留的事件、`upstream_request`、头与期望逐项相等；`settings:manage` 原样、密钥头遮蔽）；`TestRequestLogDetailContentFollowsPermission` 改为：只读者的密钥头直接不出现，管理者仍为 `[REDACTED]`。web：`requestLogViewer.spec.ts` 增加 host 回退用例；`npm run typecheck`、ccgateway 视图测试、`npm run lint`（0 error）。
- 影响对象：只有 `account:read` 或 `settings:read` 的请求日志查看者，详情“事件”里只剩事件名、时间与摘要字段（错误文本、路径、文件名、身份字段不再出现；资源身份事件的 detail 变为空对象）；“上游请求”的 URL 只显示 host，头只剩白名单头（`user-agent`、`x-app`、`x-stainless-*` 等不再显示）；请求、响应头同理。`settings:manage` 不受影响。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## FU4：带密钥的插件设置 schema 支持本地 $ref（替代 T41 的一律拒绝）

- 改动：`manifest.SettingsSecrets`（打包校验与核心掩码共用的同一个函数）跟随同文档的本地引用 `"#/$defs/<name>"`、`"#/definitions/<name>"`：名字须是一个 RFC 6901 记号（`~0` `~1` 解码，`~` 后必须是 0/1，含 `/` 或 `%` 的不认），目标须是根上 `$defs`/`definitions` 里的对象。目标按“写在引用处”处理：沿 `$ref` 链（最多 32 步，成环即止）看到的标记使引用处的属性成为字段，目标的 `properties` 接在引用处的值路径下继续走（深度 8 的限制不变）。根上的 `$defs`/`definitions` 不再直接扫描，只经引用读取。展开有界：同一值路径同一目标只展开一次；正在展开的目标再次被引用（环）、嵌套超过 `MaxSecretRefDepth = 32`、所有展开累计访问超过 `MaxSecretRefNodes = 10000` 个节点时，该引用记为不可达。不含任何标记的定义（直接或经引用都到不了标记，`markingDefs` 从“自身有标记或含不跟随的引用”的定义沿反向引用图一次求出）不展开，也不报错。从值路径到不了的位置（`items` 等）引用带标记的定义、`$dynamicRef`、`$recursiveRef`、外部引用、锚点、其他指针、嵌套 `$id`（改变基准 URI）之下的引用，在含标记的 schema 里仍是不可达。经引用发现的不可达标记写在引用下（`/properties/a/$ref/items`），`UnmaskableFields` 据此把整个顶层设置按凭据掩码；它不再特殊处理 `$defs` 开头的位置（根上的定义不再单独报告）。同一字段直接声明又经引用得到时只算一个，任一处是凭据即为凭据。打包校验的错误说明同步。
- 与校验器的关系：核心用 `santhosh-tekuri/jsonschema/v6` 校验设置值，默认 2020-12 语义，`$ref` 与同级关键字同时生效，也认这两种指针；本实现更严（不认百分号编码、多段指针、锚点），只会多拒绝、多掩码，不会少掩码。`$schema` 声明 draft-07 时校验器忽略 `$ref` 的同级关键字，这里仍把同级的标记和属性算上，同样只会多掩码。`TestMaskValuesThroughLocalRef` 同时确认校验器沿同一引用校验。
- 测试：沿用 T41 的测试表，旧的“有引用就报错”用例按新规则改写，补充：本地 `$defs` 对象里的 `writeOnly`/`x-sensitive` 字段被识别（两个属性引用同一定义各得一份）、`definitions` 与转义名、引用链、直接与引用重叠、无标记的递归定义、带标记的互相递归（环）、根上引用被标记的定义、到不了的位置引用、各种非本地或非法形式、嵌套 `$id`、嵌套 32 层以上与 10000 节点上限（3 万个引用线性完成）；核心 `plugin/api` 掩码测试；SDK 打包校验正反例。
- 影响对象：此前因为用了 `$ref` 被打包拒绝的设置 schema，现在只要引用的是根上的本地定义、位置可达即可通过；已安装的旧包里这类 schema 此前整块按凭据掩码（顶层设置或全部），升级核心后改为逐字段掩码（被引用对象里未标记的字段，如 `label`，回显原值）。行为只会在“能精确定位到的字段”上放开，其余情况仍按不可达处理。
- 审查修复：去重键由拼接字符串改为（值路径，目标）二元组。拼接时属性名与定义名里的 `\u0000` 可以构造出两个不同引用撞键，第二个被跳过，其中的密钥字段既不列出也不报告（有反例，已加为测试）。遍历改按键名排序：节点预算用尽后哪些引用不可达不再随 map 顺序变化，已安装包的 GET 与随后的 PUT 掩码一致。
- 回滚：revert 这个提交即可；回滚后带本地引用的设置 schema 重新被打包拒绝，已安装的包回到整块掩码。

## FU5 超管自作用豁免（T33 收紧的放宽，单独提交）

> 已由 FU6 取代：`ActOnSelf`、`ErrSelfTarget`、`core.ActOnOthers` 删除；超管作用于自己由可管理目标规则直接放行，审计改为 `detail.self = true`。

- 改动：`core.UserGuard` 增加 `ActOnSelf(ctx, actorID) error`；`core.ActOnOthers` 在目标含调用者本人时把本人从目标中去掉，其余目标先照常 `CanActOnUsers`，通过后再问 `ActOnSelf`（所以豁免审计只写给通过了其余检查的请求；非超管本人与不能操作的用户同在时由 409 变为 403）。调余额把 `Idempotency-Key` 长度校验移到守卫之前，校验失败的请求不留豁免审计。`authz.Service.ActOnSelf` 用 `usersRoleSet`（用户角色的授予集，不经访问密钥收窄）判断是否超管：不是 → `core.ErrSelfTarget`（409）；是 → 写一条审计 `user.act_on_self`（`detail = {reason: "self_by_superuser", via: "session" | "access_key", access_key_id?, request_id}`）后放行。审计只在这一处写，billing、segment 不做特判；`core.GuardOrDeny` 的未注入守卫对 `ActOnSelf` 同样回 500。路由的权限检查不变：访问密钥按“用户权限 ∩ 密钥权限”，超管的密钥只有显式带 `balance:adjust` / `segment:manage` 才能走到 `ActOnOthers`。
- 测试：`core` `TestActOnOthers`（超管自作用放行且只把其余目标交给守卫、不改调用方切片；守卫拒绝仍生效）；`billing` `TestAdjustBalanceActsOnOthers` 超管自调改为 200，新增 `TestAdjustBalanceSuperuserSelf`（超管会话 200、超管带 `balance:adjust` 的密钥 200、超管不带该权限的密钥 403、非超管会话与密钥 409，两条审计分别为 session 与 `access_key_id`）；`segment` 新增 `TestSuperuserChoosesOwnSegment`（超管把自己移入用户组、设/取消自己的个人专属均成功，各有审计）。CONTRACTS 调余额一行、§97.6“目标用户检查”同步。无迁移。
- 影响对象：超管（会话，或带相应权限的访问密钥）给自己调余额、把自己移入用户组、给自己设/取消个人专属由 409 变为成功，每次多一条 `user.act_on_self` 审计。非超管不变（仍 409，会话与密钥一样）。超管的访问密钥此前作用于本人时还会被 `CanActOnUsers` 以 `you cannot modify a superuser` 拒绝（决策 1），现在带了该接口权限即可作用于本人；作用于其他超管的规则不变（全局只有一个超管）。
- 回滚：revert 这个提交即可，无迁移；已写的审计行保留。

## FU6 可管理目标：作用于用户统一为“能不能做 + 能对谁做”（产品性收紧，改写 T33、FU5）

- 合并：先合并 `worker/authz-p3a`（T50–T57，提交 `authz(FU6): merge worker/authz-p3a`），FU6 依赖其中的 T52（supplier）、T55（operator 白名单与清单）、T56（同级保护）。
- 改动：
  - `core.UserGuard` 只剩一个方法 `CanActOnUsers(ctx, actorID, action core.UserAction, targetIDs...)`；删除 `core.ActOnOthers`、`core.ErrSelfTarget` 与 FU5 的 `ActOnSelf`。`UserAction` 分 `ActOnData`（余额、用户组）与 `ActOnIdentity`（资料、邮箱、密码、两步验证与通行密钥、状态、删除、角色）。
  - `authz.CanActOnUsers`（`canActOnUsers`，唯一一处）：去掉“作用于自己直接放行”，本人与其他目标同一规则——操作者的可分配清单即可管理的角色，目标的每个非默认角色都要在清单里（T56），目标角色授予的权限、可分配角色、超管标志都在操作者之内（SEC-H2），超管管理所有人。操作者一侧改为 `usersRoleSet`（操作者这个用户的角色），不再经访问密钥收窄：密钥只决定“能不能做”（路由权限，用户权限 ∩ 密钥权限）。保留决策 1：`ActOnIdentity` 且目标是超管时，访问密钥 403 `session_only`（期 3 过渡；期 4 计划改为“密钥勾了权限可操作但须当场二次验证”，`UserAction` 参数正为此保留，届时在同一处接入二次验证）。作用于自己且通过时，在这里记一条 `user.act_on_self`（`detail.self = true`、`via`、`access_key_id`、`request_id`）；在事务里调用时（分配角色）随事务写，其余经连接池。拒绝的 `details` 增加 `reason: "not_manageable"`（`session_only` 用于上面的保留）。
  - 入口：iam 的 PATCH/DELETE `/users/:id`、启用/禁用、DELETE `/users/:id/security` 传 `ActOnIdentity`；`checkAssignment`（PUT `/users/:id/roles`、POST `/users` 带角色）改为调用同一个 `canActOnUsers(..., ActOnIdentity, userID)`（不再排除本人）；billing 调余额、segment 成员变更与个人专属传 `ActOnData`，直接调用 `UserGuard`。
  - FU2（用户组定价）保持原样（默认组豁免、409），`GuardOwnSegments` 不再用 `ActOnOthers`：自己判断“调用者是否该组成员”，是成员时问 `UserGuard` 能否管理自己（按默认清单只有超管能，会话或带权限的密钥均可，审计在 `UserGuard` 一处），被拒时转成 409 `you cannot change the terms of a user group you are in`。
  - 安全约束不并入、保持原样：不能禁用或删除自己（`errSelfDisable`，含超管），超管角色不能撤销只能移交。CONTRACTS §43.6 写明这两条是安全约束而不是权限规则。
- 测试：
  - billing `TestAdjustBalanceManagedUsers` 取代 T33/FU5 的两个用例：超管给自己与 admin、operator 调 200（会话与带 `balance:adjust` 的密钥），超管不带该权限的密钥 403 `details.permission`；admin 给 user、supplier、operator 调 200，给另一个 admin、超管、自己调 403 `not_manageable`（会话与密钥一样）；admin 不带权限的密钥 403；operator 默认没有 `balance:adjust` 403，加一个只含 `balance:adjust` 的自定义角色后只能给 supplier、user 调，给其他 operator、admin、自己 403；普通用户 403；两条 `user.act_on_self` 审计（会话、密钥 11）。
  - authz `TestCanActOnUsers` 密钥用例按新口径改写（超管密钥对更宽的用户、owner 的数据放行；对 owner 与其他超管的身份类操作 `session_only`；收窄的密钥作用于主人放行），`TestRoleGrantEscalation` 的 operator 给自己分配 readers 改为 403（role=operator）。
  - T56 的 `TestCanActOnUsersPeerProtection` 按主节点确认改写三处：签名加 `UserAction`；`itself`（admin 对自己）改为 403 role=admin，并补超管对自己与 admin 放行；admin 密钥对 viewer 持有者改为放行，补 admin 密钥对另一个 admin 403、超管密钥对自己数据类放行、对自己身份类 `session_only`、对 admin 身份类放行。其余断言不动；iam `TestPeersCannotActOnEachOther` 原样通过。
  - iam 新增 `TestManagedUsersIncludeOneself`：admin、operator 经 `/users/:id` 改自己的名字和密码、重置自己的安全设置、给自己分配角色均 403；operator 可改 supplier；超管可改自己；超管也不能禁用、删除自己（`errSelfDisable`）。
  - segment `TestMembershipActsOnOthers` 把自己移入用户组与设/取消自己的个人专属由 409 改为 403，补 operator 对其他 operator 403、对 supplier 放行；`TestSuperuserChoosesOwnSegment` 审计条件改为 `detail.self`。
- 影响对象：
  - admin、operator 等（按默认清单不在自己清单里的角色）经管理接口作用于自己：调余额、把自己移入用户组、设/取消自己的个人专属由 409 变为 403；经 PATCH `/users/:id` 改自己的资料、密码、邮箱，经 DELETE `/users/:id/security` 重置自己的两步验证，经 PUT `/users/:id/roles` 改自己的角色，由成功变为 403——改自己的资料、密码、两步验证请走 `/me/*`（期 1 SEC-H3 的 `PATCH /users/:id` 自改 + 二次验证路径对非超管不再可用，超管仍可用）。控制台用户列表里对本人的这些按钮仍显示，点击后得到 403 提示。
  - 访问密钥：“能对谁做”不再被密钥收窄。admin 带 `user:update` / `balance:adjust` 的密钥现在能作用于 supplier、operator 与自定义角色的持有者（此前只能动只有 `user` 角色的人）；超管带 `balance:adjust` / `segment:manage` 的密钥能作用于任何人（含自己）的数据。超管账号本身的身份类修改仍只接受超管本人的会话。
  - 审计：作用于自己的成功检查记 `user.act_on_self`（`detail.self = true`，取代 FU5 的 `reason: self_by_superuser`）。
  - 已知：检查先于操作写审计，操作随后失败时审计行留下（同 FU5）。
- 审查补充：`session_only` 的判断移到可管理检查之后，所以只有真能管理超管的操作者（超管本人）会看到它，admin 的密钥对超管仍是 `not_manageable`；FU2 的 409 文案本地化；注释更新。
- 已定（期 3 审查 R1 改）：`assign_custom` 不含操作者自己持有的角色，带它的自定义角色不再管理自己与同角色的持有者，见“期 3 审查 R1”。
- 回滚：revert FU6 的提交（与 review fixes）即可，回到 FU5 的行为；无迁移、无数据变化。合并提交无需回滚。

## 期 3 审查 R1：`assign_custom` 不含操作者自己持有的角色（产品性收紧，改 FU6 的待确认项）

- 背景：FU6 审查发现，带 `assign_custom`（“全部自定义角色”）的自定义角色按字面规则管理自己及同角色的其他持有者（例如带 `balance:adjust` + `assign_custom` 的角色能给自己调余额、经 FU2 改自己用户组的定价）。已定：通配不含操作者自己持有的角色，显式列在清单里的角色照旧按清单，超管不受影响。
- 改动：只改 authz 的授予视角一处。`RolesPermissions` 把 `assign_custom` 展开为“除这组角色本身以外的全部自定义角色”（SQL 多一个 `c.key <> ALL($1)`），显式清单不变。它同时作用于：
  - 可管理目标（`canActOnUsers`）：操作者一侧不再覆盖自己的角色，带 `assign_custom` 的 lead 对自己和其他 lead 403 `details.role = lead`；对其他自定义角色的持有者照旧。
  - 分配角色（`checkAssignment`）：不能分配自己的角色（`notAssignable`）。
  - 交出通配：`grantOf`（POST `/roles`、PUT `/roles/:id/assignable` 新开 `assign_custom`、POST `/roles/:id/reset`）把交出的 `assign_custom` 展开为除被写角色外的现有全部自定义角色，操作者须能逐个分配，否则 403 `details.missing_assignable`。否则 lead 可以建一个带 `assign_custom` 的 deputy 角色交给别人，由 deputy 管理 lead 的持有者，绕过同级保护。
  - 目标一侧同样展开：持有另一个带 `assign_custom` 角色（能分配 lead）的用户，lead 不能作用于他（缺 lead，`missing_assignable`），也不能修改该角色（`editableRole`）。这是 SEC-H2 的同一比较，不是新规则。
  - 多个目标或多个新增角色合并展开时排除的是并集；被排除的都是目标持有或新增的角色，各自另经 `CanAssign` 检查，所以不会少拒。
- 测试：authz `TestAssignCustomExcludesOwnRole`（lead 对自己与其他 lead 403、对 staff 持有者与普通用户放行、不能分配 lead、不能建带 `assign_custom` 的角色、不能把自己列进清单、对另一个通配角色的持有者 403；超管照常；超管把 lead 按名字列进 lead 的清单后，lead 管理自己与其他 lead 并可分配 lead）；`TestSetRoleAssignable` 的展开结果不再含角色自己。
- 影响对象：带 `assign_custom` 的自定义角色的持有者，经管理接口作用于自己或同角色的其他持有者、分配该角色、交出 `assign_custom` 由成功变为 403。内置 admin（`assign_custom`，不持有自定义角色）不受影响；admin 同时持有自定义角色时，该角色同样不被它的通配覆盖。生产库没有自定义角色，无影响。前端 `GET /me/assignable-roles` 随之不再列出自己的角色。无迁移。CONTRACTS §43.6、§15.7 角色对象、FU2 段同步。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

# 期 4

> 按任务组排列：访问密钥与二次验证（S1–S5、R0）→ 插件升级授权（P4C、P4CFIX、P4C 前端、T82）→ 期 3 遗留（P4F1–P4F5、T81）→ 前端（T74–T83、前端遗留）→ 资源范围（R1–R8 与发布说明）→ 目录与路由表（T67–T69）→ 插件统一升版本（T84）→ 整合审查。后面的任务改写了前面条目的，在前面条目里用“后续：”注明。发布约束与运维清单见文首“发布说明”。

## S1–S4 访问密钥按权限可配置 + 高危操作二次验证（产品性改动，设计：DESIGN-access-key-stepup.md 第 8 节定稿）

- 改动：
  - **S1 二次验证**（`core/stepup.go`、`iam/stepup.go`、`httpapi.Router.StepUp`）。`core.StepUpVerifier` 只在 iam 实现一处。三个接口，会话与访问密钥都能调用：
    - `GET /me/verify/methods?scope=`
    - `POST /me/verify/begin {scope}`：通行密钥断言挑战，复用登录的 WebAuthn 与 auth_flows。
    - `POST /me/verify {scope, context, method, password?, code?, flow_token?, credential?}`：签发 proof。

    proof 的属性：
    - 5 分钟有效，只能用一次。
    - 绑定用户、本会话（JWT `fam`）或访问密钥 id、scope、操作上下文（请求的 `METHOD path`）。
    - 存在 `auth_flows`（purpose `step_up_proof`），用 `DELETE … RETURNING` 原子消费。各节点共用，不依赖 Redis（同 §79.1）。
    - 出示给不匹配的 scope、操作或主体时也一并作废。

    策略（§8.1）：配了通行密钥或 2FA 时只接受这两种；都没配才接受密码。超管移交（`superadmin.transfer`）和改自己的登录密码（`self.password.change`）要密码加一种第二因素。访问密钥不能用通行密钥。失败沿用登录限流与 2FA 锁定。审计 `user.security_verify`。`Router.StepUp(scope)` 在权限检查之后从 `X-Verify-Proof` 消费 proof，失败返回 403 `verification_required`，`details` 含 `scope`、`context`、`methods`、`password_required`。

    `SelfConfirmation`/`confirmSelf`、`withConfirmedFactors` 删除，下列接口改为消费 proof：
    - `PUT /me/password`：不再收 `old_password`。处理函数先校验新密码，再消费 proof。
    - `/me/two-factor/disable`、`/me/two-factor/backup-codes`：不再收 password/code。
    - `/me/passkeys/begin`：不再收 password。
    - `DELETE /me/passkeys/:id`、`DELETE /users/:id/security`（含本人）、`DELETE /users/:id`、`POST /system/super-admin/transfer`：不再收 current_password/code。
    - `PATCH /users/:id`：改自己的密码或邮箱时分别要 `self.password.change`、`self.email.change`；改他人密码要 `user.password.reset`。

    新增 `PATCH /me/passkeys/:id {name}` 改名。
  - **S2 self 虚拟权限**（`authz/self.go`）：`self:profile`、`self:security`、`self:plugin_ui`。每个有效用户在 `loadPermissionSet` 里隐式持有，并入只在这一处；没有角色的有效用户也持有。它们不进 permissions 表、`role_permissions` 和角色编辑器，在访问密钥选择器里排在最前。`Router.Self(m, p, perm)` 就是 `Perm`。`Router.Authed` 删除，只允许会话的路由写成 `SessionOnly().Handle`，只剩 `/me/access-keys*`、`/me/sessions*`、`/auth/logout`。
  - **S3 删除 sessionOnly 与 KeyAllowed**：访问密钥可以选用户持有的任何权限，仍是“用户实时权限 ∩ 密钥权限”。目录新增 `stepUp` 展示标记（`GET /permissions` 返回 `step_up`，取代 `session_only`），不变式为 stepUp ⇒ sensitive。下列高危路由挂 StepUp：
    - 明文回显 3 个，不再只允许会话。
    - `/plugins/upload`、`/plugins/install-from-market`（`plugin.install`）。
    - 同意页 consent（`plugin.grant`）。
    - 发布者写操作（`publisher.manage`）。
    - 核心升级的 execute/recover/import（`system.update`）。

    UserGuard 的 `ActOnIdentity` 遇到超管目标且经访问密钥时，不再 403 `session_only`，改为需要 proof：本请求已消费的 proof，或 scope 为 `superadmin.identity` 的 proof。authz 经 `UseStepUp` 取得 iam 的验证器，没有时拒绝。
  - **S4 插件权限进入访问密钥**：选择器列出用户持有且 active 的插件模块。插件代理接受访问密钥，复用 `Authenticate` 和按密钥收窄的 `CanAny`；不向插件传“经由访问密钥”。`/plugins/:key/settings` 改为 Self（`self:plugin_ui`），处理函数里的 CanAny 不变。
- 测试：
  - iam：
    - `TestStepUpMethodsPolicy`、`TestVerifyStepUpRefusesThePasswordWithTwoFactor`：配了 2FA 后密码被拒；错码计入锁定；超管移交与改密码类 scope 缺密码被拒。
    - `TestConsumeStepUpBindings`：重放、过期、跨 scope、跨操作、跨会话、跨密钥、跨用户都被拒。
    - `TestStepUpWithPasskey`、`TestRenamePasskey`。
    - `TestStepUpMatrix`：会话、带权限密钥、不带权限密钥，各分有无 proof。
    - `TestSuperAdminKeyOnItsOwnAccountNeedsAProof`、`TestSelfPermissions`（密钥不能管理密钥、会话或登出）。
    - `TestFormerSessionOnlyPermissionsInAccessKeys`、`TestTransferSuperAdminHTTP`（密码加第二因素）。
  - httpapi：`TestStepUp`、`TestSelf`。
  - authz：flag invariants。
  - plugin/routes、plugin/api：密钥经代理访问、经 settings 访问。
  - 其他模块测试嵌 `testutil.StepUpPassed`。
- 影响对象：
  - 控制台（S5 已接入，见下节）：上面改为 proof 的接口在前端接入 StepUpDialog 之前一律 403 `verification_required`，不能和 S5 分开发布。会话调用这些接口，每次都要先完成二次验证。
  - 访问密钥：勾了对应权限后，可以调用原先只允许会话的权限与路由，高危的每次还要 proof（只能用 2FA 或密码）。只有 `self:*` 也勾上，访问密钥才能调用自助接口。插件路由按插件权限放行。
  - 插件：经访问密钥调用时插件拿到的仍是用户 id。插件处理请求期间问宿主的 `AuthzCheck`、`AccountScopeCheck` 按该用户在途请求的密钥收窄（`grpcruntime.callerSet.narrow`；同一用户多个密钥请求在途时取交集，失败收紧；同时有会话请求在途时会话的回调也被收窄，属可接受的偏严）。admin 写操作审计（`audit.PluginWrites`）记 `via`、`access_key_id`。代理不再把 `X-Verify-Proof` 转发给插件。
- 已知与接受：
  - proof 绑定的是 URL，不含请求体：超管移交的 `target_user_id` 不在绑定内（同主体、一次性、5 分钟）。
  - 路由级 proof 在处理函数之前消费，处理函数随后因请求体校验失败时 proof 也已用掉；`PUT /me/password` 已改为先校验。
  - 超管密钥里已被禁用的插件权限，`Restrict` 仍然保留（超管 `Has` 恒真），与核心已删除的权限相同，属于此前就有的行为。
- 回滚：revert S1–S4 及其 review fixes 的提交即可。无迁移；`auth_flows` 里残留的 `step_up_*` 行 5 分钟后过期，下次建流程时清除。已存的访问密钥里含原 sessionOnly 权限或插件权限的，回滚后重新按 KeyAllowed 丢弃。

## 期 4 S5：控制台统一二次验证（StepUpDialog）+ 修复失效流程 + 超管行与移交（T79）

- 改动：
  - **HTTP 层一处拦截**（`@sub2api/host` `http.ts`）：`HttpConfig.onVerificationRequired(challenge)`。响应是 403 `verification_required` 时取 `details.scope`、`details.context` 交给它，拿到 proof 后带 `X-Verify-Proof` 把原请求（同一 body，含 FormData）重放一次；重放仍被拒就是请求的错误，不再问。用户取消时请求以 `verification_cancelled`（`VERIFICATION_CANCELLED`）失败，`notifyError` 不提示。匿名请求、未设置钩子时行为不变。插件经宿主 `api` 发的请求同样走这里，不需要声明新的 `hostUICompat`（`HOST_UI_VERSION` 不变）。
  - **StepUpDialog**（`components/stepUp/`）：`App.vue` 挂一个 `StepUpHost`，`host.ts` 把 `requestStepUp` 设为钩子；同时有几个请求要验证时排队逐个弹。弹窗调 `GET /me/verify/methods?scope=`，只列可用的方式，默认通行密钥（浏览器支持时），可切到验证码；`password_required` 时同时收密码；只有都没配时才是密码。通行密钥走 `POST /me/verify/begin` + WebAuthn 断言，然后 `POST /me/verify` 换 proof。只配了通行密钥而当前浏览器不能用时提示换浏览器或开 2FA。各页面不再自己收确认信息。
  - **修复 S1 后失效的流程**（按新请求体）：改密码（`ChangePasswordDialog` 只发 `{new_password}`，去掉“当前密码”栏）；关 2FA（确认框后无 body）、重新生成备用码（无 body）；添加通行密钥（begin 无 body，表单只填名称）、删除通行密钥；新增通行密钥改名（`PATCH /me/passkeys/:id {name}`）。凭证、API Key、代理明文回显、插件上传/市场安装/同意、核心升级、清他人安全设置、删除用户本来就不带确认字段，由拦截统一处理。
  - **T79 用户页**：超管行在邮箱旁显示“超级管理员”徽标；别人看超管行没有任何操作，超管本人那一行只有“移交超管”（`TransferSuperAdminDialog`：选目标、危险确认，`POST /system/super-admin/transfer {target_user_id}`，二次验证由拦截弹出，成功后提示并登出到登录页）。新增“重置密码”（`ResetPasswordDialog`，`PATCH /users/:id {password}`，`user.password.reset`），条件：`user:password:reset`、不是本人、不是超管行。原计划的 `SelfConfirmFields` 不再需要（被 StepUpDialog 取代）。D13（目标未开 2FA 的提示）：用户列表不返回 2FA 状态，改为在目标选择处常驻提示建议对方先开启。
  - **权限树**（角色页与访问密钥选择器共用 `PermissionTree`）：`step_up` 的权限旁显示盾牌图标“使用时需二次验证”，有这类权限时在图例里说明。访问密钥选择器按接口顺序展示 self 模块、核心模块与插件模块。
  - mock 服务（`npm run dev`）补 `/me/verify*`、`X-Verify-Proof` 校验与通行密钥改名。
  - 后端一处（审查发现）：二次验证的通行密钥断言失败由 401 改为 400 `credential/failed`（`iam.errStepUpPasskeyFailed`；登录仍是 401）。之前控制台把这个 401 当会话过期，刷新令牌后重发已用掉的 flow_token，用户看到的是“步骤已过期”。`TestStepUpWithPasskey` 覆盖。
  - 审查修复：重放同样经过 401 续期；请求中止时不再弹或作废验证；登出/会话结束时取消排队的验证；每个请求一个新弹窗（同 scope 连续两次不复用旧输入）；“重置密码”还要求 `user:update`（PATCH 路由权限）；移交前先查目标是否启用，免得白白耗掉一次验证；移交成功后只清本地会话（服务端已结束），不再调 /auth/logout；关 2FA、重新生成备用码防重复点击。
- 测试：`http.spec`（重放一次、FormData 与 JSON body 原样、取消、不重复询问、其他 403 不拦截）；`StepUpDialog.spec`、`stepUp.spec`（默认通行密钥、切换验证码、密码 + 第二因素、仅密码、错码字段、只有通行密钥而浏览器不支持、取消通行密钥提示）；`ChangePasswordDialog.spec`、`TwoFactorCard.spec`、`PasskeysCard.spec`（新请求体、改名）；`TransferSuperAdminDialog.spec`、`ResetPasswordDialog.spec`、`UsersView.superAdmin.spec`（超管行操作、重置密码条件）；`PermissionTree.spec`、`AccessKeysCard.spec`（step_up 标记、模块顺序）。
- 影响对象：控制台用户。高危操作每次弹出验证；改密码不再在表单里填当前密码（在验证弹窗里填）。必须与 S1–S4 同版本发布。
- 回滚：revert S5 及其 review fixes 的提交（含上面那处后端错误码，回滚后通行密钥验证失败恢复 401）。单独回滚 S5 而保留 S1–S4 会让上述流程重新 403，应一起回滚。

## 期 4 R0：settings:manage 守护的装码与拨号接口挂二次验证（决策“插件升级授权”p4s 交回后补充）

- 改动：泄露的会话或带 `settings:manage` 的访问密钥原本可以把核心指向另一台主机、装另一份运行时或换更新源。新增 scope `host.install`（`core.StepUpHostInstall`，iam `stepUpScopes` 登记，不要求密码）。挂 `Router.StepUp`：
  - ccgateway（`host.install`）：PUT `remote-config`（SSH 目标与凭据）、POST `remote-fingerprint`、`remote-test`（拨号）、`controller/install`、`runtime/install`、`runtime/uploads/:id/load`、`runtime/bundled`、`runtime/workers`、`runtimes/:key/worker`（装载或运行代码）。上传会话的创建与分片 PUT 不挂（只传字节、分片很多，装载那一步才要 proof），读取、`cleanup`、`purge`、`cli` 不挂。
  - PUT `/system/update-source`：复用 `system.update`（与执行升级同一类：决定下一次升级运行的代码）。
  - 目录 `settings:manage` 加 `stepUp` 展示标记（访问密钥选择器提示“使用时需二次验证”）。
- 测试：ccgateway `TestHostInstallRoutesStepUp`（`testutil.StepUpRefused`，逐条断言哪些要、哪些不要）；updater `TestCoreUpdateRoutesStepUp` 增加 update-source；iam `TestFormerSessionOnlyPermissionsInAccessKeys`（带 `settings:manage` 的密钥改 remote-config：无 proof 403，带 `host.install` proof 200）；authz `TestCatalogFlaggedSets`。
- 影响对象：控制台在 ccgateway 设置页、运行时安装与更新源设置时会弹出二次验证（S5 的 StepUpDialog 按 403 `verification_required` 自动处理）；脚本化调用需先 `POST /me/verify` 取 `host.install`/`system.update` proof。须与 S5 同版本发布。
- 回滚：revert 这个提交。

## 期 4 P4C：插件升级新增的角色授予需同意（决策“插件升级授权”C，产品性收紧）

- 改动：`plugin/install/rolegrants.go`。`planRoleGrants` 复用 `catalogKeys` + `roleGrants`，列出一次不覆盖角色的同意会做的授予（目录里还没有的权限的 `defaultRoles`，以及当下持有其 `inheritFrom` 旧 key 的角色；超管角色不计），`sensitive` 或授予对象不是内置 `admin`/`operator`/`supplier` 的标为需要同意。`Review.resolveDefaultRoles` 一并填 `new_role_grants`、`role_grants_need_consent`。
  - 上传或市场升级：`carryOverConsent` 在需要同意时不沿用；同意事务里（`autoRoleGrants`，与写入同一快照）再判断一次，需要同意就回滚、版本留在 `awaiting_consent`。沿用时写 `plugin.consent.auto`。
  - 内置插件（系统同意）：版本照常 `approved`（`BuiltinsReady`/`BuiltinsCommitted` 需要，否则节点不就绪、托管升级无法提交），需要同意的授予不写入：涉及的权限改为按名字授予其余不需同意的角色、不再走 `inheritFrom`（持有者已在同一事务里解析），暂缓的授予写进 `plugin.consent.auto` 的 `pending`。插件列表与详情 `role_grants_to_review` 从这些审计算出；`POST …/role-grants/confirm` 需要同意页显式指定角色的同样资格（`checkRolesGrantable`：`role:define` + `CanGrantToRoles`），经新增的 `core.PermissionCatalog.GrantPluginPermission` 写入（`authz.sync.grant`，`via: review`，移动 authz 版本）；`…/reject` 不写入，只清除提示（后续：P4CFIX 起拒绝对所有版本的同一授予生效）。均写审计（`plugin.role_grants.confirm`/`reject`）。不加迁移。
  - 首次安装与操作者自己点同意不变。
  - 审查后（P4C review fixes）：自动同意（沿用或系统）时，本次新建的每个权限都按计划**按名字**授予不需同意的角色、不再走 `inheritFrom`（`withholdGrants`），执行的授予就是计划的授予，避免计划之后才加入的旧 key 持有者被继承；这些授予的 `authz.sync.grant` 因此是 `via: default`，来源（default/inherit）见 `plugin.consent.auto` 的 `granted`。激活时（rollout 的 `ApplyDefaults(…, nil)`）新建的权限不再继承（`PermissionDefs` 对 nil grants 不带 `inheritFrom`）：那时才建出的只可能是同意后被删掉的权限，没有人审查过它的授予。reject 与 confirm 要求相同资格。待确认清单只看插件本次安装（`plugins.installed_at`）之后的审计。
- 测试：install `TestUpgradeRoleGrantsNeedConsent`（新增 sensitive 授予、新增授予给 user、经 inheritFrom 授予自定义角色 → 不沿用，版本 `awaiting_consent`；只给 admin/operator/supplier 的非敏感授予 → 沿用并有审计；之后操作者同意照常授予）、`TestBuiltinUpgradeWithholdsRoleGrants`（EnsureBuiltin 升级批准版本，只写不需同意的授予，暂缓项列出；无 `role:define` 或角色不可改时 confirm 403；confirm 写入并清空；下一次升级再暂缓，reject 清空且不写入）；authz `TestGrantPluginPermission`；plugin/api `TestAPIRoleGrantsToReview`。
- 影响对象：升级时 manifest 新增敏感权限或把新权限给 user、自定义角色的插件——上传不再自动批准，要有人在同意页确认；内置插件这类授予要在插件页确认后才生效（之前随升级直接生效）。前端（插件页提示与确认按钮、同意页展示 `new_role_grants`）已由“P4C 前端”与 T82 完成。后续：期 4 整合审查起 confirm 每次二次验证 `plugin.grant`，控制台只对能指定全部所列角色的人显示按钮。
- 回滚：revert 这个提交即可；回滚后暂缓的授予不会被自动补上（审计里有清单，需要时手工授予）。

## 期 4 P4CFIX：拒绝暂缓授予对所有版本生效

- 问题：待确认清单（`PendingRoleGrants(key, "")`）按 (permission, role) 跨版本去重，只显示最早版本；前端按清单里的版本逐个 POST `…/role-grants/reject`，后来版本也暂缓的同一授予在重新加载后又出现。
- 改动：`reject` 记下的每个 (permission, role) 同时清除该插件在这次拒绝之前（按审计先后，不论版本高低：直接 API 只拒后一版本也会清掉前一版本的同一项）所有版本里暂缓的同一授予（`PendingRoleGrants` 的 NOT EXISTS 增加按 `grants` 包含匹配的条件）；版本自身的清单照旧整体清除。之后的升级再次暂缓同一授予时重新列出。confirm 行为不变：只清本版本，其他版本的同一项因角色已持有而不再列出（若之后从角色收回该权限，会在其他版本下重新出现，与修复前相同）。前端不改。
- 测试：install `TestRejectWithheldGrantAcrossVersions`（两个版本暂缓同一授予只列一次；拒一次后只剩后一版本独有的项；全部拒绝后为空且无写入；之后的升级再暂缓时重新列出）。
- 回滚：revert 提交即可；无迁移。规则按查询计算，库里已有的 reject 审计上线后同样生效（清除之前跨版本残留的同一授予，即本次要修的情况）；回滚后这些残留重新列出。

## P4C 前端：插件列表与详情的“有待确认的新授权”

- 改动：`PluginSummary`/`PluginDetail` 类型补 `role_grants_to_review`。插件列表状态列在非空时提示“N 项授权待确认”；详情页顶部 `parts/RoleGrantsReview.vue`（复用同意页的 `NewRoleGrants` 列表，需要确认的高亮）：持有 `plugin:install` 与 `role:define` 时显示“确认”“全部拒绝”，按版本依次 POST `…/versions/:version/role-grants/confirm|reject`，完成后重新加载详情；没有资格的只显示提示与所需权限（角色级资格 `CanGrantToRoles` 由服务端裁决，403 照常提示）。
- 测试：`RoleGrantsReview.spec`（列表与高亮、按版本确认、全部拒绝、缺任一权限不显示按钮）。
- 回滚：revert 提交即可，纯前端。

## T82 同意页：逐权限授予角色（P4-B）、按权限预填默认角色、无 role:define 不显示、预判 db_schema_unconfined、展示新授予（P4C 前端）

- 后端（只加只读字段）：`Review.needs_db_schema_unconfined` = manifest 申请 db.schema 且 `dbSchemaUnconfined(trust == official)`；`dbSchemaUnconfined`（有 schema 管理、未启用角色隔离、不是官方发布者）是同意检查 `checkGrantRights` 与评审共用的唯一判断。同意时前端把勾选的宿主权限都作为显式授予发送，所以以前授予过的 db.schema 同样会被检查，字段不区分沿用。`ReviewUserPerm.new` = 目录里还没有该权限（`catalogKeys`）。上传与评审两处返回都填。
- 前端：`consent/newPermissionRoles.ts`（`useNewPermissionRoles`）是逐权限角色的唯一状态：只有 `role:define` 才有选项；超管可选全部（`/me/assignable-roles`，不含超管角色），其他人只可选清单内、可授予、自己不持有的自定义角色（与服务端规则一致）。每个 `new` 权限从 manifest 默认角色起步，只发送改动过的权限（`new_permission_roles`，逐 key），未改动的保持 manifest 默认（含操作者不能指定的内置角色）；改动后操作者不能指定的默认角色会被去掉，界面提示。不再发送全局字段 `role_keys_for_new_permissions`。已存在的权限标注“其授予不变”。db.schema 行在 `needs_db_schema_unconfined` 且缺 `plugin:grant:db_schema_unconfined` 时与其他缺权限的行一样置灰并禁用同意按钮。新增 `consent/NewRoleGrants.vue` 列出 `new_role_grants`（需要确认的高亮）并在 `role_grants_need_consent` 时提示不会自动通过（插件页的待确认授予复用它）。
- 影响对象：插件同意页的操作者。非超管不再看到内置角色（原来勾了 403）；勾一个角色不再替换全部新权限的默认授予。
- 测试：install `TestReviewConsentFlags`（官方不标记、new 只标目录里没有的、verified 无隔离标记且同意 403、开启隔离后两者都放行）；web `ConsentView.spec`（逐权限预填与只发改动、无 role:define 无选择、非超管只列可指定的自定义角色并提示去掉默认、db_schema_unconfined 预判、新授予列表）。CONTRACTS 同步。
- 回滚：revert 提交即可；新增字段只读，旧控制台忽略。

## 期 4 P4F1 决策 D3：内置 operator 不再持有 role:define（启动同步 + 迁移 0102，产品性收紧）

> 2026-11-13 发布前去兼容层：`role:manage` 的拆分改由迁移直接写出（内置 operator 只得 `role:assign`），启动同步的 `inherits`/`builtinsWithout` 与迁移 0102 已删除。

- 来源：`role:manage` 的拆分由启动同步完成（catalog `role:define`/`role:assign` 的 `inherits`，`grantInherited` 在新 key 首次创建时授予所有持有 `role:manage` 的角色），不是迁移 0097。生产从 develop 升级时，迁移先跑、同步后跑，所以只靠迁移收不回来。
- 改动：
  1. `authz/sync.go`：核心权限拆分继承时跳过默认集合不含该 key 的内置角色（`builtinsWithout`）。内置角色的核心权限就是其默认集合，旧 key 上的授予来自旧默认、不是管理员选择，所以拆分不带过去；自定义角色照常继承。目前只影响 `role:define` 在内置 operator 上（admin 默认含两半，operator 默认含 `role:assign`；user、supplier 没有 `role:manage`）。插件权限的继承不受影响。
  2. `0102_operator_reclaim_role_define.sql`：收回本版本更早启动已经给出的那条授予（测试库、预发、做过生产备份验证的库）。只删除内置（`builtin AND NOT superuser`）`operator` 上的核心权限 `role:define`，每条写 `authz.reclaim` 审计（actor 为系统，`detail.via = "migration 0102"`、`role`、`key`），有收回才移动 `authz_meta.version`。写法同 0099/0101：`SET LOCAL lock_timeout = '10s'`，先 `SELECT … FROM authz_meta FOR UPDATE`。自定义角色与 operator 的其他权限不动；超管之后仍可再授予。
- 测试：authz `TestSyncCoreSplitsRoleManage`（持有 `role:manage` 的内置 admin、operator 与自定义角色首次同步后：operator 只有 `role:assign`，admin 两半都有，自定义角色两半都有并有继承审计）；migrations `TestOperatorReclaimRoleDefineMigration`（新库不写不移版本；收回 operator 的、保留 admin 与自定义角色的、一条审计、版本 +1；再跑无变化）。
- 影响对象：内置 operator 的持有者不能再定义角色（新建、改权限、删除角色）（生产 operator 0 人）。回滚时：新旧混跑且最后启动的是新节点时，旧节点上 admin 与 operator 都不能管理角色；整体回滚、旧节点最后启动时旧核心把 `role:manage` 改回 active，两者存量的 `role:manage` 授予让它们重新能管理角色（operator 也包括角色定义），见发布说明第 1 节第 4 条与第 2 节。
- 回滚：revert 同步改动即恢复拆分时的继承（只对之后首次创建的 key 生效）；迁移不可逆向执行，需要时由超管在角色页给 operator 重新勾选 `role:define`，或按 `authz.reclaim`（`via = migration 0102`）审计手工补回。

## 期 4 P4F2：0098 多超管报错不再含用户邮箱

- 改动：`0098_one_super_admin.sql` 的 `RAISE EXCEPTION` 只列 user id（`several super admins: user ids 3, 7; keep one with "sub2api admin recover-superadmin --email <the email of the one to keep>" …`）。迁移失败的信息原样成为启动失败的错误与日志，是唯一出处（启动代码不另行拼接用户信息）。处理时按 id 查邮箱：`SELECT id, email FROM users WHERE id IN (…)`。
- 0098 尚未发布（只在 feat/authz-hardening），改文本会改变它的 checksum：已用旧 0098 跑过的测试库需重建；托管核心的迁移前缀校验（`managed_checks`）只在已发布版本之间比较，不受影响。
- 测试：migrations `TestOneSuperAdminMigration` 断言错误列出两个 id、且不含 `@`。
- 影响对象：无行为变化，仅错误信息。回滚：revert 这个提交（同样会改回 checksum，适用同一说明）。

## 期 4 P4F3：SyncCore 新建内置角色的默认授予写审计

- 改动：`authz/sync.go` `grantDefaults`（唯一一处）：新建的内置角色（新库的全部内置角色、升级带来的 supplier）得到的默认权限与可分配清单每一项都写 `authz.sync.grant`（actor 为系统，`detail.via` 为 `default` 或 `assignable`，另带 `role_created: true`）；已有角色只授予本次新建的默认，与之前相同。此前新建角色的授予不审计，生产验证时 supplier 的 8 项默认授权没有审计行。
- 测试：authz `TestBuiltinAssignableDefaults`（新库可分配清单 5 项各一条、均标 `role_created`）、`TestSyncCoreAddsSupplierToExistingRoles`（supplier 的 8 项默认权限各一条）。
- 影响对象：仅审计；新库首次启动多出一批 `authz.sync.grant` 行。回滚：revert 这个提交。

## 期 4 P4F4：小清理（期 3 审查小问题）

- 预备容器：`abandonPreparation` 并入 `disposePreparation(ctx, p, reason)`（`account/preparations.go`，唯一一处）。`reason` 为 `cancelled`（本人取消，插件 cancel 回调拒绝时中止，同前）、`abandoned`（首次准备失败，调用方已持锁；只处理 `pending`，成功后删行，归还名额与幂等键，同前）、`expired`（清理任务，筛选同前）。三者都回调插件 cancel 阶段：本人取消在改状态前回调（插件拒绝即中止，同前），放弃与清理在该行真正开始撤销（由非 `cancelling` 改为 `cancelling`）后回调一次，失败只记日志、不阻止清理，被续期而未清理的、重试中的不再回调（此前放弃与清理不回调；审查后修正回调时机），撤销资源后写 `account.preparation.cancel` 审计（`detail.reason`；actor 为创建者，清理任务为系统；此前放弃不写审计，取消在撤销前写）。
- 插件同意：`new_permission_roles`、`role_keys_for_new_permissions` 里的未知角色由 install 先校验（`checkNamedRolesExist`），400 的字段名与请求一致，目录已有的权限写的未知角色也 400（此前静默忽略；authz `CanGrantToRoles` 的 `role_keys` 字段只作兜底）。
- 删除：`buildReview` 里随即被 `resolveDefaultRoles` 覆盖的 `DefaultRoles` 赋值；无生产调用方的 `core.Authorizer.CanActOn` 与 `authz.Service.CanActOn`（以及各测试替身）；`authz/menus.go`、`plugin/api/ui.go` 传给 `manifest.FilterUI` 的判断里重复的 `perm == ""`（`FilterUI` 自己处理）。
- 测试：account `TestAccountPreparationLimit`（放弃各有审计与插件 cancel 回调）；install `TestConsentRoleGrantRights`（未知角色的字段名，含已有权限）；其余为现有测试。
- 影响对象：仅错误信息、审计与插件回调；回滚：revert 这个提交。

## 期 4 P4F5 T81 后端：GET /accounts/summary（供应商仪表盘账号状态卡片）

- 改动：`account/summary.go` 新增 `account.Counts` 与 `CountAccounts(ctx, q, scope)`（范围条件复用 `scoped`，`scope` 由 `core.OwnerScope(ctx, "account:read")` 决定：全量权限为全部，own 级为自己创建的；后续：R2a 起路由为 `PermScoped(account:read)`，R3 起按 `DataScope` 计数，分组与 id 范围同样计入），`GET /accounts/summary` 以 `PermAny(account:read, account:own:read)` 注册，返回 `{total, available, auto_disabled, disabled}`。`usage` 概览的 `accounts` 改为调用同一个函数（scope=nil），JSON 形状不变。前端卡片由期 4 前端任务做（决策 D25：只做账号状态，不显示用量与成本）。
- 测试：account `TestAccountSummaryFollowsOwnerScope`（own 范围只计自己的、全量范围计全部、已删除不计、无账号读权限 403）。
- 影响对象：新增只读接口；回滚：revert 这个提交。

## T81 W2-G5 前端：仪表盘账号状态卡片

- 改动：新增 `dashboard/AccountStatusCard.vue`（可用/总数、自动停用与手动禁用、无可用为红、有自动停用为琥珀），管理员仪表盘改用它（原内联卡片与 tone 计算移入）。非管理员仪表盘：持有 `account:read` 或 `account:own:read`（后续：R8 起为任意范围的 `account:read`，`hasAction`）时取 `GET /accounts/summary` 显示该卡片，不依赖 `usage:self:read`（供应商只有 own 级账号权限也能看到自己的账号状态）；刷新按钮一并重取。`AccountCounts` 类型共用；web mock 增加 `/accounts/summary`。
- 审查补充：mock 的 `/accounts/summary` 同样计入孤立账号（随 followups 提交）。已知：同时有 `usage:all:read` 与只有 `account:own:read`（没有 `account:read`）的少见组合走管理员仪表盘，其账号卡片来自 `/usage/overview`，不显示；加载失败时卡片显示“—”不弹提示（次要卡片）。
- 测试：新增 `UserDashboard.spec`（own 级账号权限显示卡片与计数、无账号读权限不请求不显示）；`AdminDashboard.spec` 照常通过。
- 回滚：revert 提交即可，纯前端。

## T74 B1 前端：X-Authz-Version 与 403 触发重新取权限

- 改动：`@sub2api/host` 的 `configureHttp` 增加 `onAuthzVersion(v)`（每个带 `X-Authz-Version` 的响应，含错误响应）与 `onForbidden(e)`（每个 403）。控制台 `stores/authzWatch.ts` 是唯一的判断处：头值大于 `max(me.authz_version, 已触发过的头值)` 时防抖 1 秒重取一次（多节点下同一版本至多一次，版本变小或相等不取）；`permission_denied` 的 403 节流 10 秒取一次（二次验证等其他 403 不算）；还没有 `/me` 时都不取。`auth.refreshPermissions()` = `loadMe()` + `refreshShell()`（插件模块与菜单），并发调用共用一次；完成后 `permissionsEpoch` 加一，当前路由按 `router/guard.ts` 的 `deniedRoute`（与导航守卫同一判断）不再允许时跳走（/forbidden 或该页的 deniedRedirect）。角色页改自己的角色后调 `refreshPermissions`（原来只 `loadMe`）。
- 影响对象：控制台用户。权限被他人改动后，下一个带更大版本头的响应约 1 秒后刷新菜单与按钮；失去当前页权限时离开该页。跨域部署需服务端 `Access-Control-Expose-Headers: X-Authz-Version`，否则头读不到、只剩 403 触发。
- 测试：`http.spec`（头与 403 钩子）、`authzWatch.spec`（版本变大只刷新一次、变小不刷新、403 节流、降权后当前页跳到 /forbidden）。
- 回滚：revert 提交即可，纯前端。

## T75 账号表单字段级权限 useAccountCaps（G1、G2、W5-B3、W5-B4 前端）

- 改动：新增 `composables/useAccountCaps(editing)`，`ACCOUNT_FIELD_KEYS`（relay、groupBind、groupManage、settingsCustom）放在 `useOwnership.ts`。scope 取 `account:update`（编辑）或 `account:create`（新建）的 all/own 级；`bindGroups = all || group:manage || account:group:bind`、`relay = all || account:relay`（与后端 `checkOwnChange` 只对 own 级检查一致）、`proxyByURL = proxy:manage || proxy:own:manage`、`customSettings = account:settings:custom`；`creatable(t) = !t.custom_upstream || relay` 只在这里计算。账号编辑器：无 bindGroups 时分组只读并提示所需权限；保存（新建与编辑）只在 `group_ids` 与原值（新建为空）不同时带上；无 proxyByURL 时不出现“粘贴代理串”；认证方式里不可建的类型置灰；类型有 `guarded_settings` 且无 customSettings 时提示只能用官方值；新建时拉取模型同样要求 creatable。批量编辑：无 bindGroups 时分组项禁用并提示。类型选择器：不可建的类型置灰、不可选并提示需要 `account:relay`。`AccountType` 类型补 `guarded_settings`、`custom_upstream`。
- 后续：R8 起 `useOwnership` 改为 `useScope()`，all/own 两档改为“全部 / 受限档”（own、分组、id 范围都按受限档），`proxy:own:manage` 写作 `proxy:manage:own`；字段口径不变。
- 偏离：spec 写的 `useAccountCaps(account?)` 改为 `useAccountCaps(editing)`（只需要“新建还是编辑”，批量编辑没有单个账号）；另加 `customSettings` 只用于提示，受限设置的表单改写仍由服务端完成。
- 影响对象：own 级账号用户（供应商）。原来提交后才 403 的分组、粘贴代理、relay 类型，现在在表单上直接不可操作。编辑账号不再总是带 `group_ids`：没改分组的保存不再触发分组权限检查。
- 测试：`useAccountCaps.spec`、`AccountEditor.spec`（无 bind 权限分组只读不提交、group_ids 没变不带、无代理管理权限无粘贴 URL、own 且无 relay 时 custom 认证方式置灰、受限设置提示）、`AccountTypePicker.spec`、`AccountBulkDialogs.spec`。
- 回滚：revert 提交即可，纯前端。

## T77 角色页：role:define、可管理角色编辑、内置角色对非超管只读

- 改动：`Role` 类型补 `assignable_role_keys`、`assign_custom`。角色页 `canDefine = role:define`；`readOnly = !canDefine || 超管角色 || (内置角色 && 非超管)`，只读时不显示保存、重置与“恢复默认/删除”菜单（原来对非超管的内置角色仍显示，点击 403）；有 role:define 的非超管查看内置角色时提示“只有超级管理员能修改”。权限树下新增“可管理角色”（`RoleAssignable.vue`，原“可分配角色”，界面统一称“可管理角色”）：多选全部非超管角色 +“全部自定义角色”开关（提示不含持有者自己持有的角色），说明它同时决定能分配哪些角色、能管理哪些用户，以及分配时被分配角色的权限须在操作者之内。保存时变化部分按需调用 PATCH、PUT permissions、PUT `/roles/:id/assignable {role_keys, assign_custom}`；403 的 `details.missing` / `missing_assignable` / `missing_assign_custom` 在编辑器内列出。新建按钮改为 `v-if="canDefine"`。
- 审查补充：保存的三步依次执行、遇到拒绝即停；只要有一步写入（全部或拒绝前的部分），就重新加载角色并显示它现在的样子（未保存的其余改动丢弃，编辑器内列出缺项）。列表没有返回 `assignable_role_keys` 时不显示可管理角色编辑，避免整体替换未知清单。
- 偏离：spec 中的快捷按钮“仅本角色”未做（含义不明确，清单可直接勾选本角色）；新建角色时不带可分配清单（建好后在编辑器里设置）。
- 影响对象：有 role:define 的非超管（内置角色不再出现编辑入口）；超管与可编辑自定义角色的人多了可管理角色编辑。
- 测试：`RolesView.spec`（非超管查看内置角色只读、超管可编辑、保存发出 PUT assignable 含 assign_custom 且不列超管角色、403 缺项回显、无 role:define 不显示新建与保存）。
- 回滚：revert 提交即可，纯前端。

## T78 用户页与新建用户：只列可管理角色，不可管理的角色锁定原样提交，不可管理的用户不显示改动类操作

- 改动：新增 `composables/useAssignableRoles`：`GET /me/assignable-roles`，按“用户 id + `auth.permissionsEpoch`”缓存（T74 的 refreshPermissions 后失效）；`assignable(key)` = 在清单内且 `grantable`；`manageable(roles)` = 超管，或目标除默认 `user` 外的每个角色都 `assignable`（与后端 `CanActOnUsers` 同一口径，清单未加载时视为可以，由服务端裁决）；`withSupplierUser` 是“选 supplier 自动补 user”的唯一实现。
  - 用户页“分配角色”对话框：选项 = 可管理角色（`grantable=false` 的不能新加，提示缺的权限）+ 目标已持有但不在清单内的角色（勾选、锁定，原样提交）；选 supplier 自动补 user（与新建对话框一致）。行操作：编辑（含禁用）、分配角色、清两步验证、调余额、删除只对可管理的用户显示（原来对本人与超管仍显示，点击 403）；删除对本人仍隐藏（防锁死约束）。查看类操作（用户组与定价、余额流水）不变。
  - 新建用户对话框：只列默认角色 `user` 与可管理角色；`user` 总可选（D26），其余需要 `role:assign` 且可授予。
- 审查补充：清两步验证对本人仍隐藏（本人走 `/me/*`，需当前密码与验证码）；默认角色 `user` 在清单里标为不可授予时，其持有者也视为不可管理（服务端比较目标全部角色的权限）；缓存在换用户、权限重载、登出时先清空，不再短暂给出上一份清单。未做：批量“移入用户组”与“用户组与定价”抽屉不按可管理过滤（仍由服务端 403），留待后续。
- 影响对象：用户页的所有操作者。admin 不再看到对其他 admin、对自己的改动类按钮；operator 只对 supplier、user 显示。访问密钥下 `/me/assignable-roles` 为 `[]`，控制台按会话使用，不受影响。
- 测试：新增 `UsersView.spec`（可管理才显示改动类操作、不可授予角色的持有者不可管理、超管管理所有人含自己但不删除自己、锁定角色原样提交、选 supplier 补 user、不可授予角色不能新加）；`UserCreateDialog.spec` 补可管理角色与 user 可选、无 role:assign 只能选 user。
- 回滚：revert 提交即可，纯前端。

## T80：财务区“余额流水”菜单

- 改动：`authz/menus.go` 的 finance 区加核心项 `{ledger, /ledger, anyOf: balance:all:read}`（图标 balance），删除“从用户列表打开”的注释；控制台 `/ledger` 路由去掉 `parent: '/users'`（有了自己的菜单项，面包屑与高亮跟随它）；web mock 菜单同步。用户列表行操作“余额流水”保留。
- 影响对象：持有 `balance:all:read` 的角色（admin、operator 与自定义角色）侧栏多出财务区的“余额流水”；只有 `balance:all:read` 没有 `user:read` 的角色此前只能凭地址打开，现在有入口。
- 测试：authz `TestMenus`（admin 区序含 finance；只有 balance:all:read 的角色 finance 区为 /ledger；普通用户没有）、iam `TestHTTP` 超管区序；web `routes.spec`。CONTRACTS §22.1 区表、§90 同步。
- 回滚：revert 提交即可，无迁移。

## T83 W5-C2：iframe 插件桥 permissions.check

- 改动：`bridge-protocol.ts` 协议注释增加 `permissions.check` 并导出 `BRIDGE_MAX_PERMISSION_KEYS = 50`；`PluginIframe.vue` 处理该请求：`keys` 不是数组或超过 50 个回 `invalid_argument`；每个 key 只有是本插件本地 key（非空字符串、不带 `plugin.` 前缀）时才按 `pluginPermissionKey(本插件, key)` + `auth.has` 判断（与原生 `host.can` 同源），否则 false。核心 key（如 `user:read`）按本插件的本地 key 理解，iframe 因此探测不到核心或其他插件的权限。
- 审查补充：改用 `auth.holds`（`/me` 列表成员，无超管捷径），否则超管对未声明的 key 也得到 true，泄露“是否超管”；非字符串 key 整体 `invalid_argument`。
- 影响对象：iframe 插件可以按权限隐藏自己的按钮；老核心对该方法回 `not_found`，插件应按“无此能力”处理。
- 测试：新增 `PluginIframe.spec`（本地 key 判断、核心 key 与带前缀 key 为 false、超过 50 个或非数组 invalid_argument）。CONTRACTS §23 同步。
- 回滚：revert 提交即可，纯前端。

## 期 4 前端遗留（FOLLOWUPS）

- 新建角色用了内置角色保留的 key：`fields[{field:"key", code:"reserved"}]` 按控制台语言显示（`roles.keyReserved`），不再只显示服务端英文。
- web mock 默认角色集合按服务端更新：admin = 全部核心权限去掉超管专属（`plugin:grant:critical`、`plugin:grant:db_schema_unconfined`、`publisher:manage`、`system:update:execute`、`system:update:recover`）；operator 为 D3 显式白名单；新增内置 supplier；内置角色带默认可管理清单（D5），`PUT /roles/:id/assignable` 与 `GET /me/assignable-roles` 有 mock；权限目录补 `audit`、`system` 模块与 `user:password:reset`、`account:group:bind`、`account:relay`、`usage:settle`、`task:manage`、`plugin:grant:db_schema_unconfined`；保留 key 回 `reserved`。
- 升级页（T45 跟进）：预检结果的 `warnings`（如 tokenless 管理开关仍开着）以“提醒（不阻断升级）”显示，不影响开始升级。（2026-11-13 随 tokenless 开关一并删除：外壳不再给出 `warnings`。）
- 用词：两步验证（TOTP）在中文界面统一为“两步验证”，“二次验证”留给高危操作前的再次确认（step-up）。
- UsersView spec 已在 T78 补齐。
- 访问密钥页（合并期 4 前端分支时补做）：`lost` 按新语义显示为“暂不可用”，说明原因（被收回或所属插件停用）、重新获得后自动恢复、保存修改会移除；选中带 `step_up` 的权限时提示用密钥调用要先 `POST /me/verify` 取 proof（`X-Verify-Proof`），密钥只能用两步验证或密码。不再有“你已经没有这些权限”的旧 sessionOnly 口径。中文合并时把 S5 新增文案里指 TOTP 的“二次验证”改为“两步验证”。
- 测试：`RolesView.spec`（reserved 中文提示）、新增 `UpgradesView.spec`（warnings 显示且不阻断）；`AccessKeysCard.spec`（lost 恢复说明、选中 step_up 权限才显示 proof 提示）。
- 回滚：revert 提交即可，纯前端与 mock。

## 期 4 R1：带范围的权限 key 原语 + T66 常量化（设计：DESIGN-scoped-bindings.md §1、§3）

- 改动：
  - `perm`：`Parse`、`Canonical`、`Implies`、`Pattern`、`Scope`、`ScopeType`、`LegacyOwnKeys`、`CanonicalSet`。语法、规范化与蕴含都只在这里实现（CONTRACTS §21.0）。
  - `perm/keys.go`：每个核心 key（含 self 模块）对应一个常量。目录 `corePerm.key` 改为引用常量，`Router.Perm/PermAny/Self` 的参数类型改为 `perm.Key`。
  - `core/datascope.go`：`DataScope`、`Compile`、`AllowsRow`、`ScopeTable.Cond/SQL/Args`。谓词不会返回 NULL（创建者为 NULL 视为不匹配），放进 NOT 里或作为布尔列使用时结果也正确。
  - 共享测试向量放在 `next/sdk/permvectors/vectors.json`，Go 测试与之后的 TS 实现读取同一份。
- 测试：
  - perm：向量（规范形式、非法 key、蕴含表），以及蕴含的自反性与传递性。
  - core：`TestCompile`、`TestAllowsRow`，谓词文本快照。
  - authz：`TestKeyConstantsMatchCatalog`（用 go/parser 核对常量与目录一一对应）。
- 审查后：结尾的 `/*` 只在跟随本资源的行类型或单独出现时才去掉。此前 `foo/*`、`proxy/*` 会被当成全部。
- 影响对象：无行为变化。回滚：revert。

## 期 4 R2a：带范围授予的存储、迁移 0103 与蕴含匹配（两步走的第一步）

> 2026-11-13 发布前去兼容层：不再两步走。0103 并入 `0097_authz_hardening.sql` 并直接做完 R2b（旧 own 授予改写为 `:own` 后删除旧 key、密钥只存规范写法）；`mirrorLegacyOwn`、`ownShadowed`、`perm.WithLegacyOwn`、`LegacyOwnKey(s)`、目录 `deprecated`、`Parse` 的别名表、`/me` 别名输出均已删除。下文的混跑、R2b 与“两步走”发布说明只作历史记录。

- 改动：
  - **匹配**（core）：
    - `PermissionSet` 增加 `Scoped`，`Add` 先规范化再写入（旧 own key 读作 `:own`）。
    - `Has` 改为蕴含判断。新增 `HasAction`、`DataScope(uid, action)`、`KeyList`。
    - `Missing` 按“是否被蕴含”判断，所以 `CanGrant`、`editableRole`、`checkAssignment`、`canActOnUsers` 都自动比较范围。
    - `Restrict` 按模式求交集，见下方 Restrict 一项。
    - `core.Scope(ctx, az, action)`、`core.WithScope`。
  - **路由**：`Router.PermScoped(method, path, h, actions...)` 取代全部 `PermAny(all, own)`，涉及 account、proxy、预备容器、ccgateway 运行时与草稿、ccgateway 重新授权、`/environment/variables`。
    - 中间件为每个动作写入 `DataScope`（未持有的动作写空范围）。
    - 菜单 anyOf 改用 `HasAction`，菜单项只列动作。
    - `/platforms`、`/account-types` 改为 `PermScoped(account:read, account:create)`。此前全量 `account:create` 不在列表中，现在任何范围的 read 或 create 都可浏览，这是轻微放宽。
  - **过渡适配**：`core.OwnerScope` / `OwnerScopeOf` 先读路由写入的范围。全部 → nil；own → 调用者 id；只有分组或 id 成分 → id 0，即任何行都不匹配（fail-closed），直到 R3/R4 改用 DataScope。草稿范围改用 `HasGranted(settings:manage)`。
  - **存储**（迁移 `0103_scoped_permissions.sql`）：
    - `permissions.scope_type`，新表 `role_permission_scopes`。
    - 旧 own 授予逐字转换为 `(动作, 'own')`；角色已持有全量 key 时不转换，只写一次审计。
    - 访问密钥在旧写法旁补上新写法。
    - 写审计；有写入才推进 authz 版本；可重复执行；`role_permissions` 不动。
  - **authz**：
    - `resolvePermissions` 规范化后去掉被蕴含的 key（非法 key 400 `invalid`）。
    - `writeGrants` 分两张表写入，并镜像旧 own 行（`mirrorLegacyOwn`）。
    - `loadPermissionSet`、`RolesPermissions`、`roleSelect` 合并两张表读取（`roleGrantsJoin`）。
    - `Role.permission_keys` 只列规范形式中不被其他 key 蕴含的部分。
    - `SetRolePermissions` 的“新增”按“未被原有授予蕴含”计算，收窄不再要求操作者持有。
    - `ResetRole` 同样走 `writeGrants`。
    - `GET /permissions` 不再列出旧 own key，每项新增 `scope_type`。
    - SyncCore 写入 `scope_type`；内置角色新建时授予带范围的默认值（`grantScopedDefaults`）。
  - **目录与默认**：
    - 8 个旧 own key 改由 `legacyOwnPerms` 生成，标签、标记、排序与旧版完全一致，新旧节点交替同步时目录行不会来回改动。它们标为 deprecated：不进入任何内置默认，也不在编辑器里列出。
    - supplier 默认为 8 个 `…:own`。operator 去掉冗余的 own key，加上 `account:credential:view:own`。
  - **iam**：
    - 访问密钥创建/修改时规范化 key，并要求每个 key 被用户蕴含，存储时附带旧写法（`perm.WithLegacyOwn`），列表显示规范形式。
    - 选择器按 `HasAction` 列出动作。
    - `/me` 输出 `KeyList` 加旧 own 别名。
- 测试：
  - authz `TestScopedPermissionsMigrationIsVerbatim`，验收用：
    - 在含内置与自定义角色旧 own 授予（含冗余的）、访问密钥的库上，迁移前（只有别名）与迁移后再把别名标 removed（模拟 R2b）相比，每个用户、每把密钥在 8 个动作上可达的账号、代理 id 集合逐一相等。
    - 迁移不改动 `role_permissions`。
    - 审计条数、版本、重跑无变化都已核对。
  - `TestNewAndMigratedBuiltinRolesAgree`：新库与“旧库 + 0103”的内置角色授予一致。
  - `TestScopedRoleGrants`：两张表、镜像、收窄、非法 key、目录 `scope_type`；只有 `account:read:own` 时 `Has("account:read")` 为 false。
  - core `TestPermissionSetScoped`、`TestRestrictScoped`；httpapi `TestPermScoped`。
  - 现有 account、proxy、ccgateway、iam 测试的测试替身改为 `Can = PermissionSet().Has`，与真实实现一致。
- 混跑（新旧节点同库）：
  - 旧节点读不到新表：分组或 id 范围的授予在旧节点上不生效（fail-closed，不会变成全量）。
  - 旧 own key 及其授予行保持有效，supplier 不中断。
  - 新节点写 own 范围时同时写旧行。
  - 已知：滚动期间在旧节点上撤销某个 own 授予，不会删除新表里的对应行，新节点仍然认为它有效。发布说明要求升级期间不改角色权限，全部节点升级后再改。
- 审查后（R2 review fixes）：
  - `writeGrants` 的 id 数组不再是 nil。nil 时 `<> ALL(NULL)` 什么都不删，角色只剩带范围授予或被清空时，原有的全量授予不会被移除。
  - 旧 own key 仍是 active 时，以旧 key 的授予行为准（`ownShadowed`）：新表里同一动作的 own 行不读。这样旧节点撤销 own 授予（只删旧行）后，新节点同样不再授予，新编辑器也不会再显示并写回。
  - `KeyList` 不列出已被全量 key 覆盖的范围，`Missing` 不会报冗余的 own。
  - 菜单的 anyOf 也接受旧别名。
  - 已知问题与对策：
    - 新节点保存一个同时持有全量与 own 的角色时，不再保留冗余的旧 own 行，旧节点上的字面比较（例如 operator 分配 supplier）会失败。发布说明要求升级期间不改角色权限。
    - 范围只有分组或 id 的 create 类路由（POST /accounts、预备容器、草稿、`/account-types/…/models/fetch`、POST /proxies、`/proxies/probe`）在本步骤里还按 own 处理（创建者为调用者），由 R3/R4 的创建后置条件收紧。在此之前不要授出这类范围。
    - `/environment/variables`、`/platforms`、`/account-types` 现在也对只有全量 `account:create`、没有 read 的人开放，属轻微放宽。
- R2b（下一版本，本期不做）：
  - 先按旧 own 行重新同步新表：补上缺的 own 行，删除没有对应旧行的 own 行，写审计。然后再把旧 key 标 removed。标 removed 之后 `ownShadowed` 自动不再遮蔽，新表成为唯一记录。
  - 确认全部节点都已升级后执行上一步。
  - 删除 `mirrorLegacyOwn` 与 `perm.WithLegacyOwn`，清理冗余的旧 own 行与密钥中的旧写法（写审计）。
  - `/me` 不再输出别名。
  - `Parse` 里的别名表保留，用于读取旧请求。
- 发布说明（两步走）：
  - 本版本可以滚动发布，不需要停机。0103 只做新增。
  - 前端（R8）上线前，旧控制台角色页的权限树里没有 `…:own` 这类规范 key，own 授予可能显示不出来。后端照常接受 `account:own:*` 与新写法。
- 回滚：
  - revert 代码即可，新表与新列旧代码都不读。托管部署（托管核心启动时核对迁移清单）回滚核心前还要按文首“发布说明”第 2 节“迁移与回滚”删除 `schema_migrations` 里 0097–0103 的记录，否则旧核心拒绝启动。
  - 访问密钥里的新写法在旧代码下被忽略，旧写法仍在，按审计 before 可还原。
  - 回滚期间写入的分组或 id 范围授予不生效（fail-closed）。

## 期 4 R3：account 包收敛到 DataScope

- 改动：
  - `account`：`scopeOf(ctx, action)`（`core.Scope`）取代全部 `core.OwnerScope("account:x")`。`loadRow`、`fullView`、列表、删除、改写语句、统计、`CountAccounts`、`AccountsInScope` 一律使用 `core.AccountRows.SQL/Cond/Args`，旧的 `scoped()` 已删除。
  - 受限档：`defaultConcurrency`、`checkOwnChange`、`adminLockAfter`、`disabledReason`、`checkCustomUpstream` 与 common controls 的签名从 `*int64` 改为 `core.DataScope`，判断改为 `Restricted()`，函数体不变（待定点 1：分组或指定账号范围的管理员同样受这些限制）。
  - 单条判断（是否可执行账号动作、能否回显凭证）：列表用 `DataScope.AllowsRow`，配合视图里已有的 `group_ids`；单条记录用 `inScope`（一条 EXISTS）。
  - 后置条件：
    - 新建要求账号落在 create 范围内（`createInScope`，400 `not_in_scope`）。
    - 改分组时，范围内的分组免 `account:group:bind`（`groupDiff.outside`，待定点 2）。
    - 写入后在同一事务里复查账号仍在调用者的 update 范围内（`stillInScope`，403 `would_leave_scope`）。
  - 列表的 `created_by` 筛选改为在范围内收窄。
  - 删除账号（含插件清理）与删除分组时调用 `core.ClearScopeGrants`。
  - `core.DataScope.HasGroup`。
- 谓词性能（EXPLAIN，Postgres 17，2 万账号、100 个分组、约 2.65 万条 account_groups）：
  - 初版“分组” EXISTS 用 `unnest(groups) ON g = 0 OR g = ag.group_id`，用不上 `account_groups_group_idx`，只能整表扫描：列表页 15 ms，计数 205 ms。
  - 改为 `(<group/*>::boolean OR ag.group_id = ANY(<groups>))`，`group/*` 单独作为一个参数（参数共 7 个）后：
    - 列表页（group/12 + group/40 + own，LIMIT 20）：组 id 走 `account_groups_group_idx` 的 hashed subplan，1.3 ms。
    - 单条（分组 + 指定账号）：走 PK，0.6 ms。
    - 汇总计数（group/12）：顺序扫描 accounts 并探测哈希，约 90 ms，与全量计数（约 53 ms）同一量级。
  - 分组 + 指定账号这一支只有一个 `unnest` 并按 `account_id` 走 PK，单条或在列表里都只在命中前缀时执行。
- 测试：
  - account `TestGroupScopedAccounts`：
    - 分组范围管理员只能列出、读取、改、删自己分组里的账号，其余 404。
    - 新建必须落在自己的分组内；绑定自己范围内的分组不需要 bind 权限，范围外的分组 403。
    - 解绑最后一个范围内分组时 `would_leave_scope`，并回滚。
    - `group/*`、`group/*/account/X`、`account/X` 的列表；`AccountsInScope`。
    - 他人绑定分组后立即生效；受限档的默认并发。
  - `TestDeleteClearsScopedGrants`：删除账号、分组后，指向它们的授予被清除，前缀相同的其他 id 保留，写审计、推进版本。
  - `TestOwnership`：`created_by` 在范围内筛选。
  - core 谓词快照更新。
- 影响对象：own 级用户的 `created_by=<他人>` 现在返回空列表（此前忽略该参数）。其余对 own 与全部范围的行为不变。
- 回滚：revert（无迁移）。

## 期 4 R4：proxy 与 ccgateway 收敛

- 改动：
  - `proxy`：
    - `scopeOf` 取路由写入的范围。`load`、列表、改、删、测试、回显、`FindOrCreate` 一律使用 `core.ProxyRows`。`writeScope` 与 `scoped()` 已删除。
    - `checkPrivate` 与 `inUseByOthers` 改按 `Restricted()` 判断，后者使用调用者 id。
    - `canCreate`：只有全部或 own 范围才能新建代理（POST `/proxies`、`/proxies/probe`、`FindOrCreate` 新建时）。
    - 删除代理时调用 `ClearScopeGrants(proxy)`。
    - `core.ProxyResolver.FindOrCreate` 的 scope 参数改为 `core.DataScope`。
  - `core`：新增 `ProxyRefScope(ctx, az, accountAction)` 与 `DataScope.Union`。
  - `account`：`proxyRange`、`proxyRangeOf`、`proxyRangeFor` 已删除，`checkRefs` 与 `resolveWriteRefs` 改用 `ProxyRefScope`；`parseProxyURL` 改用 `proxy:manage` 的范围。
  - `ccgateway`：
    - 删除手抄的 `canProxies`，`checkProxy` 改用 `ProxyRefScope(account:create)`。
    - 删除 `RuntimeScope`，PUT 运行时（请求日志）路由改为 `Perm(account:update)`。
    - 预备容器上限判断改用 `Scope(account:create).All`。
- 测试：
  - proxy `TestProxyIDScope`：只持有 `proxy/X` 时只能管理 X，其他代理 404；不能新建，不能 probe；受限档不能改为私网地址；删除后授予被清除。
  - core `TestProxyRefScope`。
  - `TestOwnership`（created_by 在范围内收窄）、`TestFindOrCreate`、account `TestProxyURL`（权限名变化）。
- 影响对象：
  - own 级用户的代理列表 `created_by=<他人>` 现在返回空。
  - `proxy_url` 被拒时 `details.permission` 变为 `proxy:manage:own`。
  - 其余对 own 与全部范围的行为不变。
- 回滚：revert。

## 期 4 R5：插件与 lookup 跟随范围

- 改动：
  - `lookup`：`Entity.Table`。账号、代理两类的 `Read` 作为可带范围的动作：先按调用者的范围（`core.Scope` 加 `Table.Cond`）过滤，范围为空时 403。`mine` 只再加创建者条件，`OwnRead` 只用于分组（`account:group:bind`）。
  - SDK：
    - `host.proto` 的 `AccountScopeCheck` 注释、生成代码中对应的注释行（只改注释，描述符不变）、`manifest.RouteAccounts`、`pluginsdk/accounts_scope.go` 的注释改为“范围”口径。
    - manifest 校验：插件权限 key 的最后一段不能是 `own`（`validUserPermKey`）。现有插件没有这样的 key。
  - `core.AccountAccess` 注释改为“范围”口径。
  - `/me` 输出旧 own 别名已在 R2a 实现（`perm.WithLegacyOwn`）。
- 测试：
  - lookup `TestLookup` 新增分组范围用例，测试替身改为规范化的 `PermissionSetOf`。
  - sdk `TestUserPermissionKeyNotAScope`。
  - account `TestGroupScopedAccounts` 新增 `core.AuthorizeAccounts` 用例，插件账号路由与宿主 RPC 都走这条路径：范围内放行，范围外或未指定 id 时拒绝。
- 未做，交给 R8 / 插件：插件 UI 宿主的 `hasAction` / `scope` API 与 moderation `host.ts` 的检查属于前端代码，兼容期内旧别名仍然有效。后续：R8 已完成，宿主 UI 3.15。
- 回滚：revert。

## 期 4 R6：防提权与访问密钥的范围回归测试

- 机制已在 R2a 生效：`Missing` 改为蕴含判断，`CanGrant`、`editableRole`、`checkAssignment`、`canActOnUsers` 自动比较范围；访问密钥沿用 S 组的 `grantablePermissions`，同时要求被用户蕴含；`Restrict` 按模式求交集。本项只补测试与契约。
- 测试：
  - authz `TestScopedGrantsAndManagement`（表驱动）：
    - A 管 group/12，可以授出它的子集，但不能授出 group/13、account/X、group/*、own、全量 key、其他动作。`details.missing` 为规范 key。
    - 定义角色时同一规则。
    - A 可以分配子集角色，不能分配 B 的角色；不能操作 B 的持有者，可以操作子集的持有者。
    - own 的相对语义；own 持有者不能操作分组管理员。
    - 审计里是规范 key。
  - iam `TestAccessKeyScopes`：
    - 宽于用户范围的密钥被拒，`missing` 正确；不合法 key 400。
    - 存储规范 key 并附带旧写法，列表只显示规范 key。
    - 存量全量 key 收窄为用户的 own。
  - 不可比组合被丢弃，已由 core `TestRestrictScoped` 覆盖。
- 影响对象：无新增行为。回滚：revert。

## 期 4 R7：清理旧范围原语，CONTRACTS §21 改写

- 删除：
  - `core.OwnerScope`、`OwnerScopeOf`、`ScopeOf`、`Allows`、`AccountScope`。
  - `perm.Scoped`、`Pair`、`OrAll`、`Keys`（`perm/scoped.go` 已删除，`Key` 与 `Strings` 移到 `perm/key.go`）。
  - R2a 的过渡适配。
  - ccgateway 测试替身与 lookup 的最后两处调用改用 `core.Scope` 与 `HasGranted`。
- 保留：`Router.PermAny`（多个无范围 key 的路由，例如请求日志查看）、`core.Granted` / `HasGranted`。
- 守护测试：perm `TestNoLegacyOwnLiterals`。生产 Go 代码里，除别名表 `perm/pattern.go` 外，不得出现含 `:own:` 的字符串字面量。
- CONTRACTS：
  - §21.0 汇总资源范围的口径。
  - §21.1 的 key 表与路由绑定段落改写为范围写法。
  - §4 的权限表、operator 与 supplier 默认、代理与账号的路由表改为范围写法。
  - §21 开头注明：全文其他位置的 `account:own:<x>` 读作 `account:<x>:own`，“自己级”读作“受限范围”。
- 测试：httpapi `TestPermAny` 改为无范围 key；全量 server 测试见期 4 R 组汇总。
- 回滚：revert（纯代码）。

## 期 4 资源范围（R0–R7）发布说明

> 2026-11-13 发布前去兼容层：本节的两步走、滚动发布与混跑说明已作废：本版本停服发布，迁移一次改写到最终状态，回滚用 `deploy/rollback/0.1.285-authz-down.sql`（见文首发布说明第 1、2 节）。以下保留原文作历史记录。

- 两步走，滚动发布：
  - **本版本（R2a）**：迁移 0103 只做新增；8 个旧 own key 保持 active，作为别名使用。
    - 新节点写入时同时写新表与旧行；旧 own key 仍为 active 时，以旧行为准。
    - 访问密钥两种写法都保存。
    - 新旧节点混跑时 supplier 不中断；分组或 id 范围在旧节点上不生效（fail-closed）。
    - 升级期间不要修改角色权限，全部节点升级后再改。
  - **下一版本（R2b，确认全部节点已升级后）**：
    1. 按旧 own 行重新同步新表的 own 行（补齐缺的，删除没有对应旧行的），写审计。
    2. 目录把 8 个旧 key 标 removed（`ownShadowed` 随即不再遮蔽，新表成为唯一记录）。
    3. 删除 `mirrorLegacyOwn`、`perm.WithLegacyOwn` 与 `/me` 的别名输出，清理密钥里的旧写法与冗余旧行（写审计）。
    4. `Parse` 的别名表保留，用于读取旧请求。
- 同版本：R0 的二次验证依赖 S5 前端（StepUpDialog）。
- 前端（R8）上线前：
  - 分组或 id 范围暂时只能经 API 使用：控制台路由守卫、账号运行时、分组编辑与插件 UI（moderation、dynweight `host.ts`）按 key 原文精确比较，持有这类范围的人能看到菜单却进不了页面（fail-closed）。
  - 旧控制台的角色页不认识 `…:own` 等规范 key，own 授予可能显示不出来，但后端照常接受新旧两种写法。
  - 账号页、代理页的“自己的”判断仍按旧别名（`/me` 仍输出旧别名），可以继续工作。
- 回滚：revert 代码即可（新表、新列旧代码不读；访问密钥中的旧写法仍在）。回滚期间写入的分组或 id 范围授予不生效。托管部署（托管核心启动时核对迁移清单）回滚核心前还要按文首“发布说明”第 2 节“迁移与回滚”删除 `schema_migrations` 里 0097–0103 的记录，否则旧核心拒绝启动。
- 混跑分析只适用于非托管的多节点部署：托管升级先停副本再迁移，没有新旧节点同库的阶段。

## 期 4 R8：控制台的资源范围（判断、路由、范围选择、密钥、摘要、mock）

- 影响对象：控制台（next/web）、moderation 插件 UI（只改代码，不升版本），没有后端改动。
- 判断：
  - `web/src/authz/implies.ts` 是 `perm.Parse/Canonical/Implies` 与 `DataScope.AllowsRow` 的 TS 版本（纯函数），与 Go 共用 `sdk/permvectors/vectors.json`（`implies.spec.ts`）。
  - `auth.has(k)` 改为“持有的某个模式蕴含 k”：`has('account:read')` 仍然只对全量为真；`has('account:own:read')` 被 `account:read:own` 蕴含。
  - 新增 `auth.hasAction(a)`（任意范围持有该动作）与 `auth.scopes(a)`（持有的范围，超管为全部）。
  - `useOwnership` 改为 `useScope()`：`level(a)` 为 `'all' | 'own' | null`（`'own'` 即受限档，包括 own、分组、id 范围，沿用 own 级限制）；`can(row, a)` 按全部持有范围判断行（own 比 `created_by`，`account/X` 比 id，分组比 `row.group_ids`）。
- 路由：`meta.action`（任意范围）与 `meta.perm` 二者满足其一即可进入（`mayOpen`，面包屑同样使用）。账号页、代理页与 CCGateway 改用 `action`，分组或 id 范围的用户不再“看得到菜单却进不了页面”。
- 页面：
  - 账号页、代理页、分组编辑、模型测试、账号编辑器的行按钮按 `useScope().can` 判断。
  - 新建按钮：账号用 `hasAction('account:create')`；代理用 `has('proxy:manage:own')`，因为 `proxy/<id>` 范围不能新建代理。代理页的操作列按 `hasAction('proxy:manage')`。
  - 分组范围的新建者或编辑者可以改分组（服务端对范围内的分组免 `account:group:bind`）。
  - 实体查找（账号、代理）、仪表盘、用量详情、CCGateway 授权页改用 `hasAction`。
  - 全量语义保持不变的判断：请求日志、用量的账号列、`/system/ccgateway/accounts` 动作。
- 角色编辑器（`PermissionTree` + `ScopePicker`，取代原 T76 的 own/all 三态）：
  - 每个动作一行。`scope_type` 非空的动作勾选后展开范围选择：全部 / 自己创建的 / 指定分组 / 指定账号（或指定代理）/ 分组内的指定账号（先选分组，再选账号，账号查找优先列出该分组），可以叠加。`account:create` 不能指定账号，只提供全部 / 自己创建的 / 指定分组。
  - 选“全部”后只保留全部，其余选项置灰。
  - 不提供的范围（`group/*` 等）显示为可删除的标签。
  - id 经 `/lookup/*` 显示名称；查找已回答但没有该 id 时显示“#12（已删除）”（`useEntityNames().gone`）。
  - 提交规范 key。候选按操作者自己的范围裁剪（`offerOf`）：操作者没有全部范围时，分组和 id 只能在自己持有的范围里勾选；后端仍然用 Missing 拒绝。
- 访问密钥：复用同一个权限树，`scope-limit` 为用户自己的范围；打开已有密钥时，权限先做规范化（旧别名与规范写法合并为同一个选择）；二次验证提示按动作判断。
- 用户页：角色徽章的提示显示该角色的范围摘要（`useScopeLabels().summary`）。
- 错误提示：
  - `would_leave_scope` 与 `permission_denied{permission: proxy:manage:own}`（不能新建代理）在控制台按当前语言显示（`errorMessage` 的 `KNOWN_ERRORS`）。
  - `group_ids` 字段的 `not_in_scope` 由账号保存的字段码表翻译。
- 插件宿主：`HostPermissions` 增加可选的 `hasAction(a)` 与 `scope(a)`（返回规范 key）。旧控制台没有这两个方法，插件应先检测再用。moderation 改为 `hasAction?.('account:read')`，没有时回落到旧别名（发布前去兼容层时删掉了这个回落：moderation 0.12.0 只跑在 UI 3.15 的控制台上）。`HOST_UI_VERSION` 升到 3.15.0（期 4 整合审查），moderation 0.12.0 的 `hostUICompat` 改为 `^3.15`（版本号不再升）；`sdk/manifest` 记 UI 3.15 → 核心 0.1.286 的下限。
- mock：`hasPerm` 按蕴含判断，`ownerScope(who, action)` 返回范围，行过滤复用 `scopeAllowsRow`。
  - `/permissions` 带 `scope_type`，不再列 8 个 own key。
  - 内置 supplier 与 vendor 使用规范 key，vendor 的 `/me` 附带旧别名。
  - 新增示例角色 group_ops。
  - 新建账号校验 `not_in_scope`，修改账号校验 `would_leave_scope`（在关联代理之前）；新建代理要求 `proxy:manage:own`，按代理串关联已有代理只要求任意范围的 `proxy:manage`。
  - 角色写入接受任意写法，存成规范 key，未被蕴含的 key 返回 403 `missing`。
- 已知限制：大于 2^53 的 id 在 TS 中会丢精度（Go 允许到 int64，实际 id 远小于此）。`scopeAllowsRow` 与 Go `DataScope.AllowsRow` 的共享向量在期 4 整合审查补上（`sdk/permvectors/vectors.json` 的 `allows` 段）。
- 测试：web vitest 全量（含共享向量 148 项、`scopeChoice`、`ScopePicker`、`PermissionTree` 范围、`useScope`、`mayOpen`、`AccessKeysCard` 范围、`lookup.gone`、`errors`）、vue-tsc、eslint；moderation UI vitest、vue-tsc。供应商相关 spec 的断言不变，只是 mock 增加了 `hasAction`/`scopes`。
- 回滚：revert（纯前端）。旧控制台见 R0–R7 发布说明中的“前端（R8）上线前”。

## 期 4 T67：权限目录描述化（description、requires）

- 改动：
  - `authz/catalog.go` 的 `corePerm` 新增 `desc`（中英说明）与 `requires`（软依赖）；全部核心权限与 `self` 模块补齐说明。
  - `requires` 只用于编辑器提示，不参与授权。带范围的动作只依赖同资源的 key，前端按同一范围提示。例如 `account:update` 依赖 `account:read`，`role:assign` 依赖 `role:read` 与 `user:read`。
  - 说明里写明的口径：`account:group:bind` 只对账号范围受限且没有 `group:manage` 的人生效；`account:relay`（新建或改动自定义上游）只对账号范围受限（仅自己、某分组或单个账号）的人生效；`usage:all:read` 包含用户邮箱（W1-F17）。
  - `SyncCore` 的 upsert 写入并比较 `description` 列。旧节点的 upsert 不写这一列，所以新旧节点混跑时不会来回改写。
  - `GET /permissions` 每项返回 `description`、`requires`（无则省略）、`scope_type`、`step_up`、`sensitive`。原规划里的 `pair` 已由 `scope_type` 取代，不再提供。
  - 前端：`PermissionItem` 类型补字段；权限树（角色编辑器与访问密钥选择器）悬浮提示显示 key 与说明，交互不变（交互归 R8）。
- 影响对象：角色编辑器与访问密钥选择器（只多了悬浮说明）；数据库里核心权限的 `description` 列（原来全是 `{}`）。
- 测试：authz `TestCatalogDescriptionsAndRequires`、`TestSyncCoreWritesDescriptions`；web `PermissionTree.spec` 的悬浮说明用例。
- 回滚：revert（纯代码）。回滚后 `description` 列保留已写入的说明，旧代码只读不写，无害。

## 期 4 T68：路由表 RouteSpec、启动自检 CheckRoutes、菜单引用主接口

- 改动：
  - `httpapi.Router` 的每个注册方法（`Public`、`Handle`、`AuthedRead`、`Perm`、`PermAny`、`PermScoped`、`Self`，以及 `SessionOnly`、`StepUp` 视图）都记录并返回 `*RouteSpec{Method, Path, Mode, Keys, Extra, PluginKeys, StepUp, NoAccessKey}`。原来忽略返回值的调用点不用改。
  - `Router.Routes()` 列出全部路由。handler 内部额外检查的 key 用 `.Uses(...)` 登记，目前登记了：
    - `POST /accounts`、`PATCH /accounts/:id`：`group:manage`、`account:group:bind`、`account:relay`、`account:settings:custom`。
    - `POST /users`：`role:assign`、`segment:manage`。
    - `PATCH /users/:id`：`user:password:reset`。
    - `GET /segments/:id/members`：`user:read`。
    - `POST /pricing/quote`：`group:read`、`user:read`、`segment:read`。
    - 插件同意页 `POST /plugins/:key/versions/:version/consent`：`plugin:grant:*`、`role:define`。
    - 插件设置的 GET 与 PUT：`plugin:read` / `plugin:manage`，并用 `.UsesPluginKeys()` 标记还检查插件声明的动态 key。
    - 审查后补登：插件 `role-grants/confirm`、`reject`：`role:define`；两个 `models/fetch` 与 `preparations`：`account:relay`；`GET /account-types/:plugin_key/:type/form`：`account:settings:custom`；`POST /accounts`：`settings:manage`（Claude Code 运行环境）。
    - 只登记放行检查；只为脱敏或补充展示做的检查（`redactBalance`、usage 统计、lookup 实体等）不登记。
  - `httpapi.CheckRoutes`（`httpapi/check.go`）在启动时检查，失败就拒绝启动（`app/routecheck.go`，在 `registerRoutes` 之后执行）：
    - `Keys` 与 `Extra` 都是核心目录或 `self` 里的 key（`authz.KnownKey`，旧 own 别名不算）。
    - `StepUp` scope 是已知 scope（`iam.KnownStepUpScope`）。
    - 不需要权限的路由与白名单 `permissionlessRoutes` 完全一致，多了或少了都报错；白名单还写明访问方式（`public`、`authed`、`session`），路由丢了认证或 `SessionOnly` 视图也报错。
    - `Public` 在 `SessionOnly`、`StepUp` 视图上注册直接 panic，因为这两种限制它都不会执行。
  - 菜单：`coreMenuItem.anyOf` 改为 `apis`，即页面主接口的 `RouteSpec.ID`。启动时 `authz.BindMenuRoutes(httpapi.RouteKeys(specs))` 取这些路由的 `Keys` 作为 anyOf，主接口不存在就拒绝启动；没有绑定之前，带 `apis` 的菜单项不显示（fail-closed）。现在每个菜单绑定的 key 与之前手写的完全一样，可见性不变。
- 与 plan.json 原 spec 的出入：
  - 记录 Extra 的方法叫 `Uses`，因为 Go 里字段和方法不能同名 `Extra`。
  - 菜单不再保留手写 anyOf 再去比对，而是直接从路由表取。
  - 白名单在 app 层。
  - 插件路由代理 `/p/:key/*path` 直接挂在 gin group 上，不进路由表。
- 影响对象：启动流程（路由表或菜单不一致时拒绝启动）。新增不需要权限的接口时，必须同时加进 `permissionlessRoutes`。
- 测试：
  - httpapi：`TestRoutesRecordSpecs`、`TestCheckRoutes`（未知 key、未知 Extra、未知 scope、不在白名单、白名单过期、丢了认证、丢了只允许会话）、`TestPublicOnAViewPanics`。
  - authz：`TestBindMenuRoutes`（主接口换 key 时菜单跟着变；缺接口报错；未绑定时隐藏）。
  - app：`TestManagedRuntime*` 走真实 `app.Run`，真实路由表自检通过。故意往白名单加一条不存在的路由，核心以 `route check: …` 失败。
- 回滚：revert（纯代码）。

## 期 4 T69：生成前端权限目录 permissions.ts 与 auth.has 类型化

- 改动：
  - `authz/tsgen.go` 的 `PermissionsTS()` 生成 `next/web/src/generated/permissions.ts`，内容见 CONTRACTS §3。生成物已是控制台的 prettier 风格。
  - `cmd/sub2api` 新增子命令 `permissions-ts`，与 `schema-contract` 同一模式。
  - golden 测试 `TestGeneratedPermissionsTS` 要求生成物与目录一致；`UPDATE_GOLDEN=1` 时重写文件。
  - 前端：
    - `auth.has(perm: PermRef | readonly PermRef[])` 与 `v-permission` 改为类型化，实现不变。
    - 新增 `auth.hasDynamic(string | readonly string[])`，给服务端或插件提供的 key 用：插件桥 `permissions.has/any`、同意页里服务端给出的必需权限、插件 manifest 声明的设置权限。代码里写死的 key 一律走类型化的 `has`（含 `pluginUtil` 的回调与同意页的 `P.PluginGrant*`）。
    - 路由 meta `perm`、设置页 `Page.perm`、实体查找的 `permissions` 改为 `PermRef`。
    - `useOwnership` 的 `ACCOUNT_KEYS`、`PROXY_KEYS`、`ACCOUNT_FIELD_KEYS` 与 `entities.ts` 的 `OWN_OR_ALL` 改为引用生成常量（`P` 与 `LEGACY_OWN`），导出名与取值不变。
    - `quoteSubjects` 改用 `P`；`RolesView` 的角色 key 正则改用 `ROLE_KEY_PATTERN`。
  - 类型化后 vue-tsc 没有报出拼写错误。
- 与 plan.json 原 spec 的出入：
  - 没有生成 `PAIRS`：own/all 已由范围取代，改为 `SCOPE_TYPE` + `LEGACY_OWN`。
  - 没有生成 `PAGE_PERMS`：菜单可见性现在在启动时从路由表绑定（T68），生成器拿不到路由表，前端菜单本来就来自 `/me/menus`。
  - 没有生成 TS 版 Implies：`auth.has` 的实现归 R8。
  - 旧 own 别名保留为 `LEGACY_OWN` 与 `LegacyOwnKey`：`/me` 在 R2b 之前仍输出这些别名，现有前端靠它们判断“自己的”。R8 的 useScope 会改用规范 key。后续：R8 已改用规范 key，但 `LEGACY_OWN` 与 `implies.ts` 的别名表保留：R2b 之前服务端仍接受并在 `/me` 输出旧别名，共享向量含别名用例；随 R2b 一起删除。
- 影响对象：无运行时行为变化；前端写错权限 key 会在类型检查阶段失败；核心目录变化后必须重新生成前端文件，否则 Go 测试失败。
- 测试：authz `TestGeneratedPermissionsTS`、`TestPermissionsTSNames`；web `src/generated/permissions.spec.ts`；ConsentView spec 的 auth mock 补了 `hasDynamic`。
- 回滚：revert（纯代码）。

## 期 4 T84：本轮改动过的插件统一升版本

- 改动（只改版本、hostCompat 与 claude-oauth 发布者名，不改功能）：ccgateway 0.1.132→0.1.133、claude-oauth 0.2.2→0.2.3、codex 0.1.3→0.1.4、dynweight 0.5.7→0.5.9（develop 已发布 0.5.8，合并后取 0.5.9 以免同版本不同内容）、volcengine 0.12.6→0.12.7、growth 0.1.6→0.2.0、moderation 0.11.2→0.12.0（growth、moderation 权限语义拆分，用 minor）、payment 0.1.0→0.1.1、guard 0.2.8→0.2.9、anthropic 0.3.1→0.3.2。这些就是本分支相对 develop 改了 manifest 的全部插件。
- hostCompat 下限统一提到 `>=0.1.286 <0.2.0`：十个插件都用了本轮新增的 manifest 字段（`defaultRoles`、`inheritFrom`、路由 `accounts`、`upstreamFields`），旧核心忽略它们（`"defaultRoles": []` 被当作省略 = admin，路由不做账号归属检查）。develop 当前核心已是 0.1.285，不认识这些语义，本分支随之后的核心发布，所以下限取 0.1.286。插件 hostCompat 下限 = 本轮核心发布版本，发布时核对；发布号不同时，把这十个 manifest 与 ccgateway/volcengine/moderation 的 manifest 测试里的 0.1.286 一并改掉（`grep -rn 0.1.286 next/plugins`）。
- claude-oauth `publisher` 由 `sup2api` 改为 `sub2api`（与其他插件和签名者一致，否则签名包上传 400）。
- 包内版本：codex `internal/codex/plugin.go` 的 `Version`；guard 测试包 overlay `0.2.9-test`；anthropic 升级测试包 overlay 由 `0.3.2-test` 改为 `0.3.3-test`（须新于发布版 0.3.2，同步 build-demo.sh、tools 测试、deploy/ci/check.sh、e2e AC05）。`deploy/docker/build-go.sh` 从 manifest 读版本，没有单独的内置包清单要改。
- 回滚：revert 提交即可。已按这些新版本安装到库里的插件回滚核心时需同时回滚插件版本。

## 期 4 整合审查（p4-review）

- **两步验证的开启改为二次验证**（产品性收紧）：`POST /me/two-factor/setup` 原来只要密码。只有通行密钥的账号，拿到会话（或带 `self:security` 的访问密钥）再加上密码，就能给它添加 TOTP，此后这个 TOTP 能通过它的每一次二次验证（改密码、删通行密钥、明文回显……），绕开“配了通行密钥或 2FA 时只接受这两种”。现在挂 `StepUp(self.2fa.enable)`，与 `/me/passkeys/begin` 一致，不再收 `{password}`；还没有任何因素的用户仍用密码取得 proof，体验不变。控制台“开启两步验证”直接发请求，由二次验证弹窗询问；mock 与文案同步。
  - 影响对象：只有通行密钥的用户开启 2FA 时要先用通行密钥验证；脚本化调用需先 `POST /me/verify` 取 `self.2fa.enable` proof。
  - 测试：iam `TestTwoFactorSetupNeedsAProof`、`TestTwoFactorEnrolmentNeedsACode`；web `TwoFactorCard.spec`。
  - 回滚：revert 提交（前后端同一提交，一起回滚）。
- **确认暂缓的角色授予挂二次验证**：`POST …/role-grants/confirm` 把权限写进角色，与同意页同一类决定，改为 `StepUp(plugin.grant)`；reject 不写入，不挂。插件页的“确认 / 全部拒绝”只对能指定全部所列角色的人显示（与同意页同一规则 `useNameableRoles`：超管任意角色，其他人只有可管理、可授予、自己不持有的自定义角色），原来 admin 看到按钮、点击后 403。测试：plugin/api `TestPluginRoutesStepUp`；web `RoleGrantsReview.spec`。回滚：revert。
- **宿主 UI 3.15**：`HOST_UI_VERSION` 与 host/ui/vite-preset 包 3.15.0；`sdk/manifest` 记 UI 3.15 → 核心 0.1.286；moderation 0.12.0 `hostUICompat ^3.15`（不再升版本）。见 R8 与 `web/packages/ui/README.md`。
- **共享向量 `allows`**：`sdk/permvectors/vectors.json` 新增行判断用例，Go `DataScope.AllowsRow` 与 TS `scopeAllowsRow` 各跑一遍（CONTRACTS §21.6）。
- **其他**：e2e `guardTestVersion` 改为 0.2.9-test（与 guard overlay 一致）；`PLUGIN-CODEX.md` 补 0.1.4；mock 的明文回显、删除用户、插件上传/市场安装/同意也走二次验证；二次验证弹窗补 `host.install` 文案（R0 新增的 scope 原来显示原文）；期 4 条目按任务组重排并标注被后续任务改写的地方；R2a 与资源范围发布说明补托管部署的回滚步骤。
- 审查确认无问题的：proof 绑定（用户、会话或密钥、scope、`METHOD path`）与一次性消费；无验证器时失败收紧；`X-Verify-Proof` 不转发给插件；`Restrict`/`Implies` 不会让密钥宽于用户；`Router.Self` 与 `withSelf` 只给有效用户；`KeyAllowed`、`sessionOnly`、`SelfConfirmation` 已删干净；0102/0103 在生产形态数据上可执行且可重跑；T84 版本与测试包版本一致。
- 留给用户决定（未改）：见文首“发布说明”第 6 节“待用户决定”。

## 期 4 生产备份验证修复（第 1 轮）

- 分组查找（UX）：只持有分组范围账号权限、没有 `group:read` 与 `account:group:bind` 的用户（例如 `account:read:group/19`），在访问密钥选择器和角色编辑器里看到的分组只有“#19”，`GET /lookup/groups?ids=19` 返回 403。改为：`lookup.Entity` 新增 `Named`，groups 设为 `core.PermissionSet.ScopeGroups`（权限集合里任一动作的 `group/G`、`group/G/account/X` 点名的分组，访问密钥按密钥自己的权限），两个权限都没有时只查这些分组，一个都没有仍 403。持有 `account:group:bind` 的口径不变（可用分组，不并上点名的分组）。CONTRACTS §96.3。
- dynweight 插件页（UX）：分组、账号或 own 范围的 `account:read` 持有者打开插件页时，“有效权重”默认查询 `GET /status?degraded=1` 不带账号，核心按 `RouteAccounts` 要求全量 `account:read`，页面显示原始的 “permission denied”。改为：`host.ts` 的 `seesAllAccounts`（原 `canSeeDegraded`，全量 `account:read`）与 `keyListApi`：不能看全部账号时，“有效权重”“权重事件”在选定账号前把查询在本地答成空表并提示先选账号，本节点计数（`/stats`）不显示；工具栏降权徽标沿用同一判断。dynweight 0.5.9 未发布，不另升版本。CONTRACTS §74.5。
- 发布说明（文档）：第 1 节第 4 条与第 2 节补充整体回滚时 `role:manage` 恢复、operator 重新得到角色管理及处理方式；只回滚核心不可行、插件逐个经旧核心 `POST /plugins/:key/upgrade` 切回上一版本（版本取发布前记录）；回滚再升级后本版本新增的插件权限（如 moderation `exempt`）不再自动授予、需超管重新授予。P4F1 条目的“发布说明草稿”同步改写。
- 未改：旧核心给第二个用户授予 `super_admin` 时被 0098 触发器拒绝并返回 500，是旧代码的行为，已记在“期 1 生产备份验证修复（第 2 轮）”。
- 测试：core `TestScopeGroups`；lookup `TestLookup`（只有范围授予的 dave：列出点名的分组、`ids` 与 `q` 查不到范围外的分组、响应形状）、`TestLookupAccessKey`（密钥带分组范围可查、用户有而密钥没有时 403）；dynweight UI `permissions.spec.ts` `keyListApi`（范围查看者不带账号不请求、带账号照常请求；全量时就是插件 API）。
- 回滚：revert 这个提交即可，无迁移、无数据变化。

## 期 4 收尾（发布说明第 6 节待决定项 1、2、4、5）

### F1 插件升级授权统一为严的规则（产品性收紧，待决定 1）

- 改动：`plugin/install/consent.go` `upgradeRoleGrants`（原 `autoRoleGrants`）。操作者在同意页批准升级时，按 `planRoleGrants` 算出本次同意会做的授予，其中需要同意的（`needs_consent`：敏感，或授予对象不是内置 `admin`/`operator`/`supplier`）的每个目标角色都要过 `checkRolesGrantable`（`role:define` + `PermissionCatalog.CanGrantToRoles`：内置角色只有超管能改，自定义角色须在可分配清单内且不是自己持有的），与 `role-grants/confirm` 同一函数；请求里显式指定、已由 `checkRoleGrantRights` 查过的角色不再重复查。不需要同意的授予、首次安装、自动沿用与系统同意不变。失败 403，事务回滚，版本仍为 `awaiting_consent`。
- 控制台：同意页（`ConsentView`）在升级时，若列出的需同意授予里有调用者不能指定的角色（`useNameableRoles`，与插件页确认按钮同一规则），禁用“确认升级”，在授予列表里标出这些角色；在上面把该权限改授给自己能指定的角色或不授予（与 manifest 默认不同就发送，空列表也发送）后，默认授予退出列表即可提交；继承来的授予不能这样去掉。
- 测试：install `TestUpgradeConsentNeedsRightsOverTheRoles`（真实 authz `CanGrantToRoles`：非超管 admin 批准带敏感权限给内置 admin 的升级 → 403 且版本仍待同意；超管成功并授予）、`TestUpgradeRoleGrantsNeedConsent`（无 `role:define` 403、角色不可改 403、只查需同意的角色）；web `ConsentView.spec`（升级时非超管被拦、改授角色后放行、首次安装不受限、超管放行）。
- 影响对象：只有 `plugin:install`（及 `role:define`）的非超管管理员，不能再批准把需同意授予给内置角色的第三方插件升级，由超管批准，或改授给自己可管理的自定义角色。
- 回滚：revert 该提交（前后端同一提交）。无迁移。

### F2 `apikey:self:manage` 标 stepUp，启动自检要求 step-up 路由引用带标记的权限（待决定 2）

- 改动：目录 `apikey:self:manage` 加 `stepUp`（按不变式 stepUp ⇒ sensitive 一并加 `sensitive`），描述写明查看明文每次需要二次验证；`POST /me/api-keys/:id/reveal` 原本就挂 `StepUp(apikey.reveal)`，授权不变。`httpapi.RouteRules` 新增 `StepUpKey`（`authz.StepUpKey`）与 `StepUpExempt`（`app/routecheck.go` `stepUpExemptRoutes`，路由 ID → 理由）：`CheckRoutes` 要求挂 StepUp 的路由的 `Keys` 至少有一个带 stepUp 标记（只在 `Extra` 里不算），否则须在豁免表中；豁免表里不是这种路由的条目、理由为空的条目也报错（review fixes）。本提交时豁免表为空（F3 登记了访问密钥的两条路由）。前端 `generated/permissions.ts` 重新生成。
- 测试：httpapi `TestCheckRoutes`（未标记、只在 Extra 里标记、豁免表过期）；authz `TestCatalogFlaggedSets`、`TestGeneratedPermissionsTS`；app `TestManagedRuntime*` 启动真实路由表（去掉这个标记时以 `route POST /me/api-keys/:id/reveal: step-up route without a permission flagged stepUp` 拒绝启动，已验证）。
- 影响对象：访问密钥选择器与角色编辑器里 `apikey:self:manage` 显示“使用时需二次验证”与敏感标记；开发者新增 StepUp 路由时须引用带标记的权限或登记豁免理由。
- 发布：停服发布（发布约束），启动同步写一次 `sensitive`、`description` 列并推进一次 authz 版本；纯展示，不影响授权（核心 `sensitive` 只进目录展示，插件同意判断用的是 manifest 的 `sensitive`）。
- 回滚：revert 该提交。无迁移；回滚后下一次启动 SyncCore 把 `sensitive` 改回 false。

### F3 新建与修改访问密钥改为二次验证（产品性收紧，待决定 4）

- 改动：新增 scope `self.access_key.write`（`core.StepUpAccessKeyWrite`，iam `stepUpScopes` 登记、不要求密码，`KnownStepUpScope` 随之认得）。`POST /me/access-keys`、`PATCH /me/access-keys/:id` 改由 `SessionOnly().StepUp(self.access_key.write)` 注册，仍只允许登录会话；`CreateAccessKeyInput`/`UpdateAccessKeyInput` 删除 `password`，`CreateAccessKey`/`UpdateAccessKey` 不再调 `confirmPassword`（也不再接收 ip）。PATCH 只改名也要 proof（路由级，与“修改”一致）。`DELETE /me/access-keys/:id` 不要 proof（只收回权限）。这两条路由没有权限 key，登记进 F2 的 `stepUpExemptRoutes`（理由：只允许会话、无权限可标）。
- 控制台：访问密钥表单去掉“确认密码”，保存时由 StepUpDialog（HTTP 层拦截 403 `verification_required`）询问；用户取消验证时表单保持打开、不报错。弹窗文案补 `self_access_key_write`。mock 的新建与修改改走 `stepUp('self.access_key.write')`。
- 测试：iam `TestAccessKeyWriteNeedsAProof`（无 proof 403 且挑战 scope 正确、`password_required=false`；有 proof 201；proof 一次性；改名与改权限各自要 proof；访问密钥带 proof 仍 403；删除无 proof 204），其余 iam 测试去掉密码字段；web `AccessKeysCard.spec`（请求体无 password、无密码栏、取消验证不报错）。
- 影响对象：开了 2FA 或通行密钥的用户新建、修改访问密钥时要用第二因素验证（只凭密码不再能签出密钥）；都没配的仍用密码（在验证弹窗里）。脚本化调用需先 `POST /me/verify` 取 proof；旧控制台带 `password` 的请求 403 `verification_required`（发布约束 2）。
- 回滚：revert 该提交（前后端同一提交）。无迁移。

### F4 超管清掉自己的全部验证因素要密码 + 第二因素（产品性收紧，待决定 5）

- 改动：`iam.StepUpMethods` 增加操作参数，`lastSuperFactor` 一处判断：超管本人 `user.security.reset` 作用于自己（操作 `DELETE /api/v1/users/<自己>/security`）、`self.2fa.disable` 而没有通行密钥、`self.passkey.delete` 删唯一的通行密钥而没有 2FA 时，`password_required = true`，与超管移交、改自己密码同一策略机制（`VerifyStepUp` 先验密码再验因素）。`GET /me/verify/methods` 接受可选 `context`，`POST /me/verify` 用请求的 `context`，403 `verification_required` 用本请求的操作，三处同一函数；`/me/verify/begin` 只看方式是否可用，不受影响。非超管、仍留有另一个强因素的操作不变。
- 审查修复：自己的判断按路由读 id 的方式解析操作（`resetTarget`，与 `httpapi.PathID` 一致，`/users/01/security`、`/users/+1/security` 同样算本人；原来按字符串比较可被绕过）；proof 记下签发时是否验过密码（`proofPayload.password`），消费时按当时的因素再算一次策略（`proofStillEnough`），没验密码而现在要密码时不放行（原来可以先在还有通行密钥时只用 2FA 取关 2FA 的 proof，再删掉通行密钥，然后用这个 proof 关 2FA）。`superadmin.transfer`、`self.password.change` 的 proof 一律视为验过密码（签发时本来就要），滚动发布期间旧节点签发的 proof 不受影响。复审修复：两个移除同时提交（各自的 proof 消费时都还留着对方的因素）仍能清空，所以关 2FA、删通行密钥在自己的事务里先锁用户行，再按当时的因素用 `lastSuperFactor` 判断一次（`keepLastFactor`；proof 验过密码的放行，`core.MarkStepUpSpent` 记下这一点；不在控制台请求里的内部调用不受影响）。mock 的二次验证按同一口径（超管关 2FA、清自己的安全设置要密码）。
- 偏离说明：待决定 5 原文只列了 `user.security.reset` 与 `self.2fa.disable`；删唯一的通行密钥（且无 2FA）同样会清掉超管的全部强因素，一并纳入同一判断，否则是同一缺口的第三个入口。
- 控制台：StepUpDialog 取方式时带上 `context`（即 403 的 `details.context`），超管清自己的因素时弹窗同时要密码。
- 测试：iam `TestSuperAdminLastFactorTakesThePassword`（非规范写法的本人 id 同样要密码；有通行密钥时签发的不带密码的关 2FA proof，在通行密钥删除后消费被拒；`TestSuperAdminConcurrentFactorRemovals`（另一移除已提交后，未验密码的关 2FA、删最后一个通行密钥在事务里被拒，验过密码的放行；验过密码签发的 proof 照常消费）；超管只有 2FA 时关 2FA、清自己安全设置要密码，清他人不要；只给验证码被拒、加密码签发；有 2FA 与通行密钥时关 2FA、删通行密钥不要，清自己仍要；只剩一个通行密钥时删它要；不带操作时按旧口径；普通用户都不要）、`TestVerifyMethodsTakeTheOperation`（HTTP：methods 带 context 与 403 的 `details.password_required`）；web `StepUpDialog.spec`。
- 影响对象：超管本人。脚本化调用这几类操作取 proof 时要同时给密码。旧控制台不带 `context` 取方式时不显示密码栏，提交后得到密码字段错误（发布约束 2：与 S5 同版本发布）。
- 回滚：revert 该提交（前后端同一提交）。无迁移。

## 发布前去兼容层（2026-11-13，核心 0.1.285）

用户要求“不要考虑兼容性，做好迁移脚本”：本版本停服发布，不再支持新旧核心混跑、两步发布和旧核心在新库上运行。删除或改动的兼容层：

| 兼容层 | 处理 |
|---|---|
| 迁移 0097–0103（先加后收：0097 等价授予、0101 纠正 operator 清单、0102 收回 operator 的 `role:define`、0103 只复制旧 own 授予） | 合并为 `0097_authz_hardening.sql`，直接写最终状态；加超管恰好一个的前置检查与审计 |
| 8 个旧 own key：`perm.legacyOwn`/`LegacyOwnKeys`/`LegacyOwnKey`/`WithLegacyOwn`、`Parse` 别名、目录 `deprecated` 与 `legacyOwnPerms`、`mirrorLegacyOwn`、`ownShadowed`、`ListPermissions` 过滤、`/me` 与访问密钥的旧写法 | 删除；迁移改写库里的存量写法；守护测试 `TestNoLegacyOwnLiterals` 不再有例外文件 |
| `role:manage`：目录 `inherits`、`builtinsWithout`、启动同步的继承授予 | 删除（`grantInherited` 只留给插件 manifest 的 `inheritFrom`）；迁移改写后删除 `role:manage` 行 |
| 访问密钥列表读出时规范化（为旧写法） | 删除：库里只有规范写法 |
| 共享向量 `sdk/permvectors/vectors.json` 的别名用例 | 删除或改为规范写法；生成的 `web/src/generated/permissions.ts` 去掉 `LEGACY_OWN`、`LegacyOwnKey` |
| 控制台 `implies.ts` 的别名表与 mock、单测里的旧写法 | 删除、改为规范写法（`vue-tsc -b` 与全部 vitest 通过） |
| gateway 外壳 tokenless 管理开关（含 T45 指标与 preflight `warnings`，控制台升级页的提醒展示） | 删除：线上核心 0.1.284 已带令牌，本版本不换网关，以后的网关忽略旧配置键与环境变量 |
| 管理员禁用锁的“残留锁”处理（旧节点启用过的上锁账号：`checkAdminLock` 只拦 disabled、受限档禁用时清锁、重置时清锁的特例） | 删除：上锁的账号总是 disabled；受限档从不改锁 |
| 插件 `hostCompat`/UI 3.15 下限 0.1.286 | 改为 0.1.285 |
| moderation 原生 UI 在没有 `hasAction` 时回落到 `account:own:read` | 删除：0.12.0 的 `hostCompat` 是 `>=0.1.285`，宿主都有 `hasAction` |

保留：核心在 `SUB2API_UPDATER_TOKEN_FILE` 未设置时不带令牌（develop 既有，线上网关会设置）。`web/packages/ui/README.md` 与 `@sub2api/host` 注释里给插件作者的 `hasAction?.() ?? has('account:own:read')` 回退建议已删除（发布前待定项一并清理），用到 `hasAction`/`scope` 的插件声明 `hostUICompat ^3.15`。

测试：`migrations` `TestAuthzHardeningMigration`（从 0096 形态的库：旧 own 授予（角色与密钥、冗余与非冗余）、`role:manage`（admin、operator、自定义角色）、超管专属权限的改写，审计条数、版本只推进一次，重跑不变，启动同步后不回退）、`TestAuthzHardeningNeedsOneSuperAdmin`（0 个、2 个超管报错且库不变）、`TestAuthzHardeningRollback`（反向脚本后表结构与 0096 一致、旧键授予恢复、再升级结果相同）；authz `TestRetiredOwnKeysReachTheSameRows`（每个用户、每把密钥在 8 个动作上可达的账号、代理与 0.1.284 的 own 语义一致）。

## 发布前待定项（2026-11-13，发布说明第 6 节第 6、7 项）

### ccgateway 镜像上传：一次验证覆盖一次上传

- 设计：上传由创建、多个分片（16 MiB 一片，最多 4 GiB）、续传查询、取消与装载组成，每片验证不可用。改为**二次验证会话**：创建（`POST runtime/uploads`，挂 `StepUp(host.install)`）消耗 proof 后，处理函数用控制器返回的上传 id 打开会话 `ccgateway.upload/<id>`（`httpapi.OpenStepUpSession`）；`PUT`/`GET`/`DELETE runtime/uploads/:id` 与 `POST runtime/uploads/:id/load` 用 `Router.StepUpSession(host.install, …)` 注册，在权限检查之后凭上传 id 延续会话，不再各自要 proof。会话绑定用户 + 登录会话（JWT `fam`）或访问密钥 id + scope + 名字，存在 `auth_flows`（`purpose = step_up_session`，token 为这几项拼起来的哈希，别人的请求算出的行不存在），每次延续顺延 1 小时（`core.StepUpSessionIdle`，控制器清理一小时未动的上传），最长不超过打开后 24 小时（`core.StepUpSessionMax`）；过期、不存在或换了用户、会话、密钥 403 `verification_expired`。
- 为什么这样最简且不弱于此前：每次装载仍对应一次验证（创建时，而不是装载时）；此前任何有 `settings:manage` 的调用者都能不经验证创建上传、往别人的上传里写分片，现在只有打开会话的那个会话或密钥能写；不改控制器、不加表、不要前端额外传令牌（上传 id 本身就是会话名，跨节点由 `auth_flows` 共享）。会话打开失败时控制器上的空上传由它自己一小时后清理。
- 核心：`core.StepUpSessions`（iam 实现，`OpenStepUpSession` 要求本请求已在该 scope 上消耗 proof）、`core.ErrVerificationExpired`；`httpapi.Router.StepUpSession`、`httpapi.OpenStepUpSession`、`RouteSpec.StepUpSession`；`testutil.StepUpPassed`/`StepUpRefused` 同时实现会话接口。
- 控制台：`views/ccgateway/imageUpload.ts` 的创建请求经 HTTP 层弹出 StepUpDialog，去掉它自己的 60 秒超时（验证要等用户，核心对控制器调用另有 30 秒上限）；分片仍用 fetch，403 `verification_expired` 不重试，放弃这次上传；装载不再弹验证。`auth.errors.verification_expired` 文案。
- 测试：httpapi `TestStepUpSession`（打开前 403、非 StepUp 路由打开 500、打开后延续、别的会话名 403、无权限 403、没有会话实现 500、RouteSpec 记录）；iam `TestStepUpSessions`（真实 `auth_flows`：无 proof 不能打开；打开后同一密钥可多次延续、有效期顺延到一小时后但不超过打开后一天；别的上传、别的密钥、登录会话 403；过期 403）；ccgateway `TestHostInstallRoutesStepUp`（创建要 proof，分片、查询、取消、装载要会话）、`TestControllerUploadSession`（创建按控制器返回的 id 打开会话，别的上传 id 装载 403）；web `imageUpload.spec`（创建只带调用方的 signal、过期会话的分片不重试）。
- 影响对象：用控制台上传镜像的人在开始上传时验证一次，装载时不再验证；脚本要在创建时带 `host.install` 的 proof，并用同一个会话或密钥完成整次上传。
- 回滚：revert 该提交。无迁移（`auth_flows` 里的会话行到期由 `createFlow` 顺带清理）。

### 插件升级沿用已授予的宿主权限

- 改动：`plugin/install/consent.go` `decide`：升级时当前授予已覆盖本次范围（`status = granted` 且 `ScopeWithin`）的宿主权限一律标 `carried`，请求里显式列出（同意页以前总是列出）也一样，`checkGrantRights` 因此不再按风险要 `plugin:grant:high`/`plugin:grant:critical`；新增、扩大（diff 的 added/widened）的仍按新授予检查。审计 `plugin.consent` 的 `decisions[].carried` 如实记录。
- 控制台：`ConsentView` 用 review 的 `current_status` 与 diff 判断沿用（`HPRow.carried`）：默认勾选、不因缺少授予权限而禁用、标“已授予，沿用”，提交时不放进 `grants`（服务端沿用）；可选的取消勾选即拒绝。
- 测试：install `TestDecideCarriesCoveredGrants`（列出或不列都沿用、扩大的不沿用、首次安装不沿用）、`TestInstallConsentUpgradeUninstall`（只有 `plugin:grant:high` 的操作者在升级同意里显式列出已授予的 `ui.native` 通过）；web `ConsentView.spec`（缺 `plugin:grant:critical` 时沿用 `ui.native` 可提交，只提交扩大的 `http.client`，拒绝未授予的可选项）。
- 影响对象：只有 `plugin:install`（+ `plugin:grant:high`）的非超管管理员可以批准不新增关键宿主权限的升级。
- 回滚：revert 该提交（前后端同一提交）。无迁移。
