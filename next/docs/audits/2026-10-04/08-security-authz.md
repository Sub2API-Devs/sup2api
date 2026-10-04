# 08 安全架构与权限审计（2026-10-04）

> 子代理完成了审计，但写报告文件时被拦截。本文由主控根据它的回报整理，只记录结论和修复方向，不写利用细节。
> 复现测试放在仓库外：`C:/Users/16790/AppData/Local/Temp/secaudit/`，包括 `egress_audit_test.go`、`proxy_audit_test.go`、`sync_audit_test.go`，用 `go test -overlay` 运行。
> 依赖数据库的条目（H1–H3、M4）没有在 PostgreSQL 上跑过，还需要验证。

## 总评

风险评级为**高**。在开放第三方插件、开放"供应商"等受限角色之前，必须先修完 1 条严重和 5 条高危。另有中危 10 条、低危 13 条。完整清单（含 H5、M1–M10、L1–L13）见 [99-ISSUES.md](99-ISSUES.md) 第十二节。

做得好的地方：
- 权限模型是真正的 RBAC。权限点集中定义，插件权限会自动加上命名空间，`own` 级授权落在 SQL 条件上。
- 控制台约 140 条路由全部有认证，没有发现漏挂中间件的管理接口。
- 基本没有水平越权（IDOR）。`/me/*` 和 `own` 级查询都绑定调用者身份。
- 没有批量赋值（mass assignment）问题。更新接口都绑定显式的 DTO。
- 上一轮审计的 F01（任务归属）、F08（refresh 令牌家族）、F09（用户分组）、F10（API Key 缓存）已核实修复。

问题集中在三个方面：
1. 缺两条授权规则：授权者只能授予自己持有的权限；只能操作等级不高于自己的对象。
2. 敏感权限分级不准，审计日志覆盖不全。
3. 插件出口和 SSRF 的边界没有闭合。

## 严重 / 高危

| 编号 | 级别 | 位置 | 问题 | 修复方向 |
|---|---|---|---|---|
| C1 | 严重 | `plugin/egress/egress.go`、`plugin/grpcruntime/instance.go:374-384` | 插件出口隧道默认 `allow_all`，不拦内网和回环地址，也不检查插件有没有被授予 `net` 权限。部署里的 Redis 没设密码，插件因此可以越过和核心之间的信任边界。05 报告 P0-3 也发现了这一条。 | egress 复用 netguard；没有 `net` 权限的插件默认拒绝；Redis 设密码 |
| H1 | 高 | `iam/users.go:212-234` | `user:update` 不是敏感权限，却可以重置任何非超管用户（包括其他管理员）的密码。原因是 `guardTarget` 只保护超管。04 报告 P0 也发现了这一条。 | 加"只能操作等级不高于自己的对象"规则；重置密码单独作为一个敏感权限；同步修改 CONTRACTS §5.2 |
| H2 | 高 | `authz/roles.go:191-254`、`plugin/install/consent.go` | `role:manage` 可以授予持有者自己没有的权限。`plugin:install` 通过 consent 接口的 `role_keys_for_new_permissions` 也能修改角色权限，而且不需要 `role:manage`。 | 加"授权者必须持有被授予的权限"规则；consent 写角色时要求 `role:manage` |
| H3 | 高 | `account/handlers.go:605-630` | `own` 级账号可以绑定任意分组，并自行设置优先级、权重和模型映射，relay 类型的上游地址也不受限。供应商可以借此把别人的流量引到自己的上游。前端只是把分组选择器显示为空，后端没有校验。 | 后端校验分组可见性；`own` 级不能设置调度参数；relay 上游走 netguard |
| H4 | 高 | `billing/sync.go:388,849` | 价格同步源 URL 不经过 netguard，请求内网得到的响应体会出现在报错和 `last_error` 里。所需权限 `price:manage` 不是敏感权限。已复现，04 报告 P0 也发现了这一条。 | 使用带 netguard 的 HTTP 客户端；报错不回显响应体 |
| M7 | 中（与 H4 同类） | `proxy/proxy.go` | 代理测试可以连接回环和内网地址，`own` 级用户就能触发。已复现。 | 代理 host 和测试目标都走 netguard |

## 中 / 低危要点

- 改密码、登出之后，access token 最多仍有效 2 小时；refresh token（30 天）存在 localStorage，而 native 插件的 UI 和控制台同源。
- step-up 和改密码接口没有限速；登录限速在 Redis 出错时直接放行（fail-open）。
- `settings:manage` 能控制计费策略和远程 docker 命令，却不是敏感权限。
- 用户、角色、余额、价格的变更都没有写审计日志。
- 并发请求可以透支余额；WebSocket 会话期间不会重新校验 API Key。
- 两份内网黑名单（`netguard/netguard.go:89`、`proxy/dialguard.go:22`）内容已经不一致（见 04 报告）。
- 依赖：`npm audit --omit=dev` 报出 echarts 一个中危，当前用法不可利用。没有安装 `govulncheck`，未跑。

## 目标权限架构

1. **统一的路由策略表，默认拒绝**。每条路由都声明认证方式、权限点和对象级规则，启动时校验覆盖是否完整。
2. **两个规则函数**，由所有授予权限、修改用户的入口统一调用：
   - `authz.CanGrant(actor, perms)`：被授予的权限必须是 actor 持有权限的子集。
   - `authz.CanActOn(actor, target)`：target 的等级（权限集合）不能高于 actor。
3. **重新划分敏感权限**。`user:update` 中的重置密码、`price:manage`、`settings:manage`、`role:manage`、`plugin:install` 都要求 step-up。
4. **会话**：改为 HttpOnly cookie，并加 token 版本号；改密码、登出时让版本号递增，立即作废旧 token。
5. **出口统一**：只保留一份 netguard。egress、价格同步、代理、relay 上游、webhook 全部复用它。
6. **审计**：所有敏感权限的写操作都写入审计日志。

## 分批修复

- **第 1 批（严重 + 高）**：C1、H1、H2、H3、H4、M7，同时合并两份 netguard。
- **第 2 批**：会话作废、step-up 和改密码限速、登录限速改为 fail-closed、重新划分敏感权限、补审计日志。
- **第 3 批**：余额透支的并发控制、WebSocket 会话重新校验 API Key、路由策略表。
