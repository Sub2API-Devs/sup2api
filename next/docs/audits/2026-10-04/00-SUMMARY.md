# 2026-10-04 全面审计总报告

8 人 agent team 只读审计 next/ 全栈。本文是汇总，细节、文件:行号与改法见各分报告：

| # | 报告 | 范围 | 问题数 |
|---|---|---|---|
| 01 | [frontend-ui-ux](01-frontend-ui-ux.md) | 视觉、交互、设计系统 | P0 7 / P1 22 / P2 15 |
| 02 | [frontend-code](02-frontend-code.md) | 前端分层、复用、工程化 | P0 4 / P1 19 / P2 12 |
| 03 | [feature-gap](03-feature-gap.md) | sub2api / new-api / next 功能对比 | 丢失 A1–A24，引入 B1–B18 |
| 04 | [backend-core](04-backend-core.md) | next/server 核心代码 | P0 2 / P1 16 / P2 13 |
| 05 | [plugins-sdk](05-plugins-sdk.md) | 插件运行时、SDK、8 个插件 | P0 6 / P1 12 / P2 11 |
| 06 | [architecture-multinode](06-architecture-multinode.md) | 架构、多节点、升级、部署 | P0 2 / P1 7 / P2 16，文档不一致 12 处 |
| 07 | [relay-path](07-relay-path.md) | 请求转发链路（数据面） | P0 1 / P1 10 / P2 21 |
| 08 | [security-authz](08-security-authz.md) | 权限模型、越权、Web 安全 | 严重 1 / 高 5 / 中 11 / 低 13 |

验证情况：
- Go 侧已执行 `go build`、`go vet`、`go test -short`，全部通过。前端 `npm run typecheck` 0 错误，i18n 中英文 1629 个 key 对齐。
- 本机没有 PG/Redis，依赖数据库的用例（约 100+）全部跳过；`-race` 需要 cgo，没有跑。
- 因此资金路径、H1–H3 越权、"PG 抖动排空"这几条结论来自静态分析，还没有动态验证。
- 主控抽查 4 条 P0 证据，均与代码一致：`grpcruntime/runtime.go:90` 默认 64 且 `execute.go:193` 整个流期间持槽；`iam/users.go:212` `guardTarget` 只保护超管；`app/managed.go:260` 每秒校验准入，1s 超时，任一错误即排空；`egress.go:129` 默认 allow_all；`store/db.go` 未设 MaxConns。

---

## 一、总体判断

**底座强，上层薄，热路径有硬伤。**

- **做得好，重构时要保留的部分**
  - 插件签名与吊销链；"插件执行、核心记录"；usage 与扣费的幂等键。
  - 金额全程精确小数，流开始后不重试。
  - primary-first 升级状态落 PG、可续跑，迁移只执行一次。
  - 真正的 RBAC，控制台路由 100% 有认证，基本无 IDOR 和 mass assignment。
  - 统一错误模型 `core.Error` + `httpapi.Fail`；前端 host 包（refresh/step-up）与 SchemaForm 抽象。
- **最大风险集中在三处**
  1. **容量与可用性**：插件并发上限 64、热路径数据库访问过重、PG 抖动导致全集群排空。
  2. **授权规则缺口与插件信任边界**：可提权，可越过插件边界，存在 SSRF。
  3. **页面层没有抽象**：前端每页重复手写，UI 缺少页面级组件，后端 44 个 handler 直接写 SQL。
- **功能上**：运营与商业层几乎为空，包括注册、邮件、支付、兑换、公告、模型广场、Key 额度限速；面向客户端的 `/v1/models` 缺失。

## 二、多位成员独立交叉确认的发现（可信度最高）

| 发现 | 来源 | 级别 |
|---|---|---|
| Execute 整个流期间占插件信号量（默认 64），第 65 个请求 failover 后 503；预扣估算也排同一信号量 | 05 P0-1、07 P0-1 | P0 |
| 插件 egress 默认 allow_all，不拦内网/回环，不看 `net` 权限；Redis 无密码 | 05 P0-3、08 C1 | 严重 |
| `user:update`（非敏感）可重置管理员密码 → 接管 | 04 P0-1、08 H1 | 高 |
| 价格同步源 SSRF，并回显内网响应 | 04 P0-2、08 H4 | 高 |
| 两份内网黑名单（netguard / proxy dialguard）已漂移 | 04 P1、08 | 中 |
| 热路径 PG 压力：转发约 25 条语句/3 事务；网关就绪检查每请求约 17 条查询；连接池无上限（384 核 vs max_connections 100） | 06 P0-2/P1、07 | P0/P1 |
| Dashboard"可用账号"只算前 200；前端 16 处"取全部"被截断在 200 | 01 P0、02 P0 | P0 |
| 核心与前端写死 `ccgateway` | 02、05 | P1 |

## 三、分阶段路线图

原则：先止血（会出事故的），再补护栏，后重构，最后补功能。每批可独立合入、独立发版。

### 阶段 0　重构护栏（0.5–1 天）
- 前端：接入 ESLint、Prettier、vitest，把 `scripts/*-test.mjs` 接进 npm scripts；`server/web/dist` 改为 `.keep` + ignore，构建不再弄脏工作区（02 B0、P1-19）。
- 后端：本机准备 PG/Redis，设置 `TEST_DATABASE_URL`，让被跳过的 100+ 用例真正跑起来；资金与越权修复必须在 PG 上验证。

### 阶段 1　稳定性止血（2–3 天，排在下次核心发版前）
- Execute 使用独立信号量，上限可配；预扣估算不再排在执行信号量上（05/07）。
- 准入检查容错：连续失败达到阈值或累计 15s 才排空，与 ARCHITECTURE §2.3 对齐（06 P0-1）。
- 网关就绪检查改为核心推送或带 TTL 的缓存，不再每请求查 PG（06 P0-2）。
- pgxpool 设置 MaxConns；节点间转发复用连接（06 P1）。
- 流与 WS 增加空闲超时和 ping 保活；槽位续租容忍 Redis 短抖动（07 P1）。
- 预扣挪到用户并发槽之后；修正 `stick` 规则：绑定账号忙时返回 429，不改写绑定（CONTRACTS §18.1）；SSE 内的 error 事件触发冷却（07）。
- 插件实例进入 failed 后能自动恢复（05 P1）。

### 阶段 2　安全（3–4 天）
- 新增 `authz.CanGrant`（只能授予自己持有的权限）与 `authz.CanActOn`（只能操作等级不高于自己的对象），所有用户/角色/consent 入口统一调用（H1、H2）。
- `own` 级账号：后端校验分组可见性，禁止自设调度参数，relay 上游走 netguard（H3）。
- netguard 合并为一份，供 egress、价格同步、代理测试、relay、webhook 共用（C1、H4、M7）。
- 插件：可选权限在运行时真正生效（05 P0）；沙箱使用独立用户，看不到核心的 environ；`db.schema` 不再回退为核心连接串（05 P0）。
- 重新划分敏感权限并加 step-up：重置密码、`price:manage`、`settings:manage`、`role:manage`、`plugin:install`。敏感写操作补审计日志。
- 会话：token 版本号，改密码/登出立即失效；refresh token 迁到 HttpOnly cookie。登录限速改为 fail-closed；step-up 与改密码接口加限速。
- **ovh 部署配置**（需用户确认后执行，涉及生产）：配置可信代理（当前所有客户端 IP 都是 127.0.0.1，登录限流退化为全局一个桶）；开启插件签名校验；节点端口不再以 HTTP 直接暴露公网；Redis 设密码（06、08）。

### 阶段 3　资金正确性（2 天）
- 账本幂等去重同时核对 user/金额/类型；预扣与结算统一走 `usage.priceOf`；两处余额门槛统一 `>` / `>=`；释放过期预扣时跳过坏数据，不再整体卡住（04 P1）。
- 客户端提前断开时继续读完上游拿真实 usage，或按已收文本估算补齐，避免少计费、OpenAI 可能完全免费（07 P1）。
- 并发透支控制；WS 会话期间定期重新校验 API Key（08）。
- 补索引：`usage_logs.client_request_id`、`api_keys.group_id`、`audit_logs.action`；列表 count 与 page 加上限；账号列表 Redis N+1（04）。

### 阶段 4　前端设计系统与数据层（约 2 周，分批）
- **4a　P0 体验热修（1–2 天）**
  - 高影响操作加确认和成功提示：升级/回滚、停用节点/分组、扣余额。
  - 轮询刷新不再整表闪烁，错误不重复弹出。
  - 区分错误态与空态。
  - 修正 badge-info 与 badge-primary 同色、按钮与输入框不等高。
  - 表单关闭前提示未保存修改。
  - `fetchAll` 按 total 翻页，配合 lookup 缓存。
- **4b　token 与基础组件**：语义色 CSS 变量，控件统一高度；约 25 个组件，包括 DataTable（排序/勾选/固定列/骨架/移动卡片）、FilterBar、BulkBar、Drawer、Confirm v2、Alert、ErrorState、StatusBadge、可搜索 Select、PageHeader、StatCard（01）。
- **4c　数据层与 composables**：每个 feature 一个 `api.ts`；`useAsyncAction`、`useFormDialog`、`useRowActions`、`usePolling`、`useQuery`（带请求取消）、`useSchemaForm`（核心设置页复用 SchemaForm）；状态→色调/文案映射统一为一份（02）。
- **4d　页面模式与拆分**：列表页、详情抽屉、编辑页、设置页、仪表盘 5 种模式。AccountEditor（981 行）、AccountsView、UsersView 拆分到单组件 ≤300 行。布局与导航：侧栏分组折叠、Logo、移动端（01/02）。
- **4e　ccgateway 前端迁出核心**，放到 `plugins/ccgateway/ui/native`（02/05）。
- **4f　"我的 API Key"补齐**：编辑、停用、复制、使用示例（01）。

> 涉及 CONTRACTS §23.3（组件 API 是契约）的组件改动只做扩展，同步更新文档。

### 阶段 5　后端与插件抽象（约 2 周，分批）
- **核心**
  - 补 service 层，handler 不写 SQL。
  - 公共 helper：筛选条件构造、分页列表、设置读写缓存、带版本号的缓存、"提交后刷新缓存"统一一种写法。
  - 删除死代码，如不再写入的 API Key Redis 缓存。
  - 拆分 `app.run`。
  - 模块间只依赖 core 接口（04 9 批计划）。
- **转发链路**：40 字段的 `call` 拆成 pipeline 中间件；收敛新旧两条执行路径；WS 复用 HTTP 的调度与尝试逻辑；错误映射集中一处（07 §4）。
- **SDK 下沉**：厂商常识包、声明式错误分类、apikey 扩展、请求构造小件、SDK 自动 Execute、批量写入器，插件约删 1500 行。契约收敛：执行 2 套、提交 2 套、轮询 3 套各收为 1 套。合并两套 token 状态机；HostService 调用加缓存（05）。
- **多节点**：主节点切换/移除节点命令（补上文档中"恢复 CLI"）；网关与核心之间的表访问改为显式契约；引擎错误进入指标并在界面展示（06）。
- **账号惩罚细化**：401/403 先冷却并计数，之后才禁用；按"账号×模型"冷却（07）。

### 阶段 6　功能补齐（按 03 排序，逐项立 CONTRACTS 章节）
1. API Key 增强：额度、5h/1d/7d 限速、IP 黑白名单、模型限制（核心）。
2. 客户端 `/v1/models`，加模型广场与公开定价页（核心）。
3. 邮件服务、自助注册、找回密码（核心），并向插件开放发信能力。
4. 账号健康巡检：定时测试、自动恢复、管理员可配错误策略（核心）。
5. 充值支付与兑换码（插件）。核心需小改：插件权限可默认授予用户角色。
6. 之后：公告/首页、2FA/OAuth 登录、订阅/返利、usage 保留期与导出、状态页等。

## 四、需要用户决定的事项

1. **从哪个阶段开始。** 建议顺序：阶段 0 → 1 → 2 → 3，之后阶段 4 与 5 可以并行（前端和后端是不同模块，各配一个写者）。
2. **ovh 生产配置的 4 项修改**：可信代理、插件签名、端口暴露、Redis 密码。都要改生产，需要你确认后再动。
3. **契约改动**：CONTRACTS §5.2（重置密码权限）、§18.1（`stick` 行为对齐）、新增 CanGrant/CanActOn 规则、敏感权限清单。按惯例先改文档再实现。
4. **前端视觉方向**：01 的提案是沿用 sub2api 配色与字体，补齐页面级组件。如果想在视觉上有更大变化，比如重新选品牌色或改信息密度，需要在 4b 之前定下来。
