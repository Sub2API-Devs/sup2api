# 交接：提示词审核从 new-api 完整迁移到 moderation 插件（2026-10-31）

给接手的人或 AI。先读本文，再读 `next/docs/CONTRACTS.md` 的 §72（设计真相源），再动手。仓库规则见根目录 `AGENTS.md`：只改 `next/`；回复用中文；提交时写明路径，不要整目录提交；数据库变更一律走幂等迁移。

## 1. 背景

- **来源**：new-api 的"内容审核"，路径 `D:\projects\golang\new-api`，分支 `feat/content-moderation`，线上容器 `newapi-codingplus`（cp.270，在 ovh 上）。
  - 后端代码：`service/moderation/`、`model/moderation*.go`、`controller/content_moderation*.go`、`setting/content_moderation_setting/`。
  - 前端代码：`web/default/src/features/content-moderation/`（React，约 3 万行，含测试和 7 种语言）；校验逻辑在 `web/shared/src/content-moderation/`。
- **目标**：sup2api 的内置插件 `next/plugins/moderation`。并入这个插件，不新建插件。
  - 后端：Go，`internal/moderation/`。
  - 界面：Vue，`ui/native/src/`，只能用 `@sub2api/ui` 和 `@sub2api/host`。
  - 迁移脚本：`migrations/`，数据库模式 `plg_moderation`。
- **用户已定的取舍**（§72 开头）：
  - 只迁配置，不迁记录和名单。
  - 原来的单模型审核保留，作为 `llm_verdict` 审核器。
  - 名单级别叫 observe / enforce（new-api 的 block 级就是这里的 enforce）。
  - 原有的封禁表保留。
  - 分组用数字 id。

## 2. 已上线（2026-10-31 北京时间 03:20，ovh + clicodeplus 两节点）

| 组件 | 版本 | 源码 | 说明 |
|---|---|---|---|
| Core | 0.1.221 | `3aa066097` | 宿主调用 `PriceUsage`（权限 `prices`，low，只读按模型价格试算）。schema 无变化 |
| moderation | 0.3.1 | `d5ba40fce` | P1 + P2：多级流程、观察名单、AI 分析、三种 LLM 协议、费用、流程版本/回滚/模拟、AI 结论过滤 |

- **线上数据**：
  - 模型价格新增 `deepseek-v4.1-flash-abliterated`（id 324）、`jev-latest`（id 325）。
  - new-api 配置已迁入：渠道 3、4，审核器 2，流程 2（未绑定分组），以及分析等设置。
  - **mode 仍为 off**：线上不审核任何请求。
- **部署记录**：`next/deploy/gateway/ovh/README.md` 顶部。
- **服务器上的脚本**：`~/sup2api-managed/stage/{0.1.221, moderation-0.3.0, moderation-0.3.1}`，其中迁移脚本是 `moderation-0.3.0/migrate_newapi.py`。

## 3. 当前任务（用户 2026-10-31 设的目标，尚未完成）

用户原话：

> 拖拽画图功能也要完整迁移过来；将内容审核功能完整迁移过来；确保代码规范：抽象 复用 解耦 简洁 低侵入；然后启动 agent team 检查代码，并且要求插件相关代码符合插件规范；然后帮我完成更新

拆成下面几项：

1. **拖拽画布流程编辑器**：照 new-api 的 `components/flows/` 用 Vue 重写。new-api 用的是自己写的 HTML5 拖拽（`canvas-drag.ts`），没有第三方库。插件现在只有"按级排列的表单"。
2. **补齐其余功能**（P3 和遗漏项）：统计（小时表、趋势、性能、类别、健康度、漏斗）、告警和通知、用户名显示、管理员识别、渠道代理、独立设置页、记录和名单页与 new-api 对齐。
3. 代码规范：抽象、复用、解耦、简洁、低侵入。
4. 用 agent team 审查，并核对插件规范（manifest、权限、宿主调用、迁移幂等等）。
5. 发布。

## 4. 进度

### 4.1 已提交、已上线

见第 2 节。

### 4.2 本次提交（WIP，能编译，插件测试全过，**尚未接线到接口**）

**统计后端的第一部分**：
- `migrations/0005_stats.sql`：
  - 新表 `stats_hourly`：主键（hour, group_id, flow_id, stage, auditor_id, timing），9 档延迟桶存为 `lat bigint[]`，带 cost。
  - 新表 `user_daily`：主键（day, user_id）。
  - `costs` 表加 `errors`、`latency_ms_sum`、`lat`，渠道健康和费用放同一行。
  - `watchlist` 加 `hits_since_seen`，**尚未使用**，对应 new-api 的 hits_since_mark 和"标记已看"。
- `internal/moderation/stats.go`：取代原来 `costs.go` 里的计费累加器（meter）。
  - `statsAcc`：内存累加，每 10 秒 upsert 一次（`flushStats`）；写失败的计数放回去，下一轮再写。
  - 记录点：
    - `countRun`：在 `hook.go` 的 `run()` 里，只算钩子来源，写流程、级、审核器三类行和用户当天的行，并把计价排进后台队列。
    - `countRequest`：同步审核给请求增加的延迟。
    - `countCacheHit`：命中放行缓存。
    - `countCall`：渠道调用的健康度，来源是审核或分析。
    - `priceNow` / `priceLater`：计价。
  - 延迟分桶和分位数照抄 new-api 的 `latency.go`。
  - 时间一律按 **UTC**（new-api 用服务器本地时区）。
- `internal/moderation/staff.go`：用 `isStaff` 识别管理员，规则是有 `moderation:read` 权限的用户（超级用户也算）。
  - 走现有宿主调用 `AuthzCheck`，不需要授权，核心不用改；结果缓存 5 分钟，只在后台调用。
  - 行为照 new-api：管理员照常审核和记录，但不进名单、不封禁、不算进用户统计。
  - 已接入 `store.go` 的 `afterWrite` 和 `flushStats`。
- 测试辅助 `startDB` 让 FakeHost 默认对所有权限回答否：FakeHost 默认允许一切，不改的话所有人都会被当成管理员。

### 4.3 未完成（按建议顺序）

**A. 统计接口**：新建 `stats_api.go`，形状照 new-api `service/moderation/stats.go`，字段名尽量一致，id 用 int64，时间用 RFC3339。
- `GET /status`：今日计数、AI 复核计数、名单计数、近 1 小时审核器和渠道健康度（错误率超过 `error_rate_alert_percent` 且样本 ≥20 时标 flagged）、今日漏斗、本节点队列、今日费用（按来源、按渠道、按审核器）。
- `GET /stats/trend?granularity=hour|day&from&to&flow_id&group_id`：按流程和审核器出趋势。
- `GET /stats/performance`：请求行或流程的 pre 行，算延迟分位数，并按审核器给出延迟。
- `GET /stats/categories`：今日可疑请求按类别计数，缓存 60 秒，最多扫 5 万条。
- 列表补字段：
  - 流程：近 24 小时审核数、可疑率、pre 平均延迟。
  - 审核器：今日调用数和费用。
  - 渠道：近 1 小时调用数和错误率。
- manifest 补路由，`manifest_test` 里的路由数跟着改。
- `cleanup` 任务按新设置 `stats_retention_days`（默认 90）删 `stats_hourly`、`user_daily`。
- AI 分析的 `get_user_summary` 改为读 `user_daily`（现在直接扫 events；关掉 `record_pass` 时，审核数会少）。

**B. 告警和通知**：照 guard 插件的 webhook 写法，见 `next/plugins/guard/internal/guard/hook.go` 里的 `alertSender`。
- 新设置 `notify_webhook_url`、`error_rate_alert_percent`（默认 5，0–100）。
- 事件一：流程近 1 小时错误率越过阈值，只在越过的那一刻发一次。状态存 KV，因为 `jobs` 每个触发点只在一个节点执行。
- 事件二：AI 自动调整名单，即 `analysis_queue.go` 的 `applyAnalysis`，动作为 auto_upgrade、auto_downgrade、auto_remove 时发。内容不能带用户原文。
- 新任务 `alerts`（`@every 1m`），或者并入 `analysis` 任务。

**C. 渠道代理**：
- 表里已有 `channels.proxy_enc` 列；用 `SecretSeal` 加密，context 为 `channel:<id>:proxy`。
- 代理请求的 Transport 必须从 Init 之后的 `http.DefaultTransport` Clone 出来，这样严格网络模式下仍走 SDK 的出口隧道。
- 改了代理就必须重新填 key（照 new-api `channel.go`）。
- 迁移脚本这次没迁代理：ARK 分析渠道在 new-api 那边用了代理，迁过来以后可能不通。

**D. 界面**（插件 `ui/native`，建议交给一个 agent，只写这个目录和 `next/web/mock/moderation.ts`）：
- 拖拽画布编辑器，取代 `FlowsTab` 的表单。
  - 左侧审核器库，可以拖进某一级，也可以拖到两级之间新建一级。
  - 级与级之间、级内的审核器都能拖动排序。
  - 每级选组合方式和 n；能删除；右侧放配置卡片（模型过滤、抽样、超时、分组）。
  - 保存草稿、发布确认、放弃草稿；离开前提示有未保存的修改。
  - 发布前校验照 new-api `web/shared` 的 validateSpec。
- 概览照 new-api 的 `components/overview/` 重做：KPI、漏斗、健康度、性能、类别、趋势、粒度切换、队列、AI 复核、需关注用户、费用。
- 独立设置页：
  - 用 `host.api` 直接调核心的 `GET/PUT /plugins/moderation/settings`，只改对应分组的键，其余原样合并回去。
  - 内容：Jev 默认题集编辑、分析准则加提示词预览、拦截响应预览、类别字典表、工具表。
- 用户名：`host.api` 调核心 `GET /users/:id`，前端缓存；没有 `user:read` 权限时只显示 id。
- 分组名：调核心 `GET /groups`。
- 记录和名单页：筛选项与 new-api 对齐，包括名单的"新命中"（`hits_since_seen`）。

**E. 差异清单**：
- 本次中断前派了一个只读 agent（Explore）逐项对比 new-api 和插件，结果**还没拿到**。
- 接手时请重新派一次。提示词要点：
  - 读 §72，不把 §72 里写明的有意差异算作缺口；
  - 每个领域列出已有、部分、缺失三类，并给出 new-api 的文件和行号；
  - 把画布的交互逐条写清楚。

**F. 审查和发布**：
- 审查用 agent team：后端正确性、界面、插件规范、代码质量，各派一个只读 agent。
- 发布顺序：
  - 只改插件时：build.sh → rollout.py。版本没有新权限时会自动批准，`rollout.py consent` 会报 409，直接跑 upgrade。
  - 如果核心也要改：先发核心，再发插件。
- 下次核心发布时，`builtin/` 要从 0.1.13 换成最新的 moderation 包，同时保证两个节点的核心都已兼容。

## 5. 代码地图（插件 `internal/moderation/`）

| 文件 | 内容 |
|---|---|
| `plugin.go` | 生命周期、并发控制、后台 post 队列；字段 `hourly`（统计累加器）、`staff`（管理员缓存） |
| `hook.go` | 钩子 admit、pre 和 post 两条路径、`run()`、`finish()` 写记录 |
| `extract.go` | 抽取结尾连续的 user 消息、图片和输入哈希 |
| `flow.go` | Spec 解析与校验，`runFlow` 多级执行，Trace |
| `engine.go` | 审核器编译，`audit()` 调用一次引擎（OpenAI、TypeSafe、LLM） |
| `llm.go`、`agent.go`、`prompt.go` | `llm_verdict` 的 submit_verdict agent |
| `llmproto.go` | 三种 LLM 协议的请求体、SSE 和非流式解析 |
| `analysis*.go` | AI 分析：agent、工具、提示词和类别字典、队列和结论应用 |
| `costs.go` | 计价（`quote`、`CallCost`、价格状态、`GET /costs`） |
| `stats.go` | 小时统计累加和写入（新增，见 4.2） |
| `staff.go` | 管理员识别（新增） |
| `watch.go`、`store.go` | 名单、写记录、违规计数、自动封禁 |
| `snapshot.go` | 配置快照、多节点重新加载和版本号轮询 |
| `routes*.go`、`flow_versions.go` | 管理接口 |
| `settings.go` | 设置解码，宽松：值越界就夹到范围内 |

其他：`manifest.json`（当前 0.3.1）、`forms/settings.{schema,ui}.json`、`migrations/0001–0005`、`ui/native/src/*.vue`。界面 dist 不入库，发布时在本机构建，在 build.sh 里核对 sha256。

## 6. 验证方法

- 插件测试：`cd next/plugins/moderation && go test ./... -count=1`。
  - 会用到本机的嵌入式 PG，见 memory `sqlite-dual-backend`。
  - 用 `-v` 确认没有 SKIP。
- Linux 编译检查：`GOOS=linux go vet ./...`。
- 界面：
  - `npm --prefix next/plugins/moderation/ui/native run build`；
  - 预览用 `.claude/launch.json` 里的 `console-mock`，页面 `/p/moderation/dashboard?tab=…`。
- 全工作区：对 `next/go.work` 里每个模块跑 `go vet ./...`（SDK 接口加方法时必须做）。

## 7. 坑

- **Bash 里拼代码**：用 `node -e '…'` 包含 SQL 单引号的代码时，单引号会被 bash 吃掉。这次 `routes.go` 的过滤 SQL 就因此坏过一次。含引号的改动用 Edit 或 Write 工具。
- **python**：本机 `python` 是 WindowsApps 占位程序，不能用；脚本在 ovh 上用 `python3` 跑。
- **ovh 上建 worktree**：`git -C src worktree add` 的路径相对于 `src/`，要写 `../release-xxx`。
- **线上配置迁移不能泄露 key**：脚本在服务器上从数据库读 key，直接经插件接口加密保存，不打印。
