# 附录：new-api 内容审核与 moderation 插件的功能差异清单（2026-10-31）

> **进度（2026-10-30 更新）**：
> - 本清单的缺口已在插件 0.4.0 补齐（`feat/next-platform`，提交 952a65803 至 afac307a6），并做过两轮 agent 审核（代码规范、迁移完整度）及修复。
> - 实现情况、有意保留的差异、仍缺的核心接口，见 CONTRACTS §72.14；界面见 §72.15。
> - 2026-10-31 合并动态权重后，核心有了通知（§73.4 `Notify`，按渠道 + 接收人发送）。moderation 仍发自己的签名 webhook，是否迁到核心通知等用户决定；剩下的缺口只是"按权限通知管理员、各管理员自己订阅"。
> - 仍未做（需要核心支持）：`users.read`、按权限通知管理员（及各管理员自己的订阅）、插件审计日志、按 endpoint 或会话筛选记录、设置页权限。

> 本清单由只读 agent 对照两边源码生成，主控没有逐条核实，只作待办来源用，动手前请对照源码确认。
>
> 路径缩写：
> - `N:` = `D:\projects\golang\new-api`
> - `P:` = `next/plugins/moderation`
> - `FE:` = `N:web/default/src/features/content-moderation`
>
> CONTRACTS §72 里写明的取舍不算缺口：放行缓存、名单两级 observe/enforce、保留封禁表、设置用 schema 表单、分组用数字 id、`llm_verdict` 可以进流程、flows.enabled 单独一列、费用以美元计、P1 不做渠道代理。
>
> 主控补充两点：
> 1. 管理员识别已改用 `AuthzCheck(uid, "moderation:read")`（`staff.go`），不必再等 `users.read`。
> 2. 用户名和分组名由界面用 `host.api` 调核心的 `/users/:id`、`/groups` 查询，核心不用改。

## 总结

- **完全没做的**：统计体系（小时统计表、延迟分桶、漏斗、健康度、性能）和通知告警。
- **流程画布**：插件现在是弹窗表单（`P:ui/native/src/FlowsTab.vue`）。画布的完整规格见第 2 节。
- **记录详情和观察名单详情**：后端给的数据偏少，缺"同请求的其他记录"、"流程快照"、"用户摘要"、"上下文条"；名单列表也缺筛选和排序。
- **已知 bug**：发布流程时，`P:internal/moderation/routes_flows.go` 的 publishFlow 把自动算出的总超时写回了草稿。new-api 的做法是草稿保持 0（表示自动）。

## 1. 各区域对照

### 概览与统计

| new-api 功能 | 插件现状 | new-api 实现位置 |
|---|---|---|
| 运行状态条：总开关、运行中、启用流程数、已绑分组数、未审核分组、停用渠道数、是否配了分析渠道 | 部分：有 `runtime.configured` 等，没有未审核分组 | `FE:overview/status-line.tsx`；`N:controller/content_moderation.go:1189-1204`（unbound_groups / stale_groups） |
| 今日 KPI：审核数、可疑、观察中（其中有新记录的人数）、拦截级人数、前置拒绝 | 部分：按 events 现算；缺"有新记录"，缺 hits_since_mark | `FE:overview/kpi-cards.tsx`；`N:service/moderation/stats.go:598` 的 Status |
| 最需关注的人：名单前 6 名，按新增命中排序 | 部分：插件的 top_users 是按命中数排 | `FE:overview/attention-users-card.tsx` |
| AI 复核卡：违规、误报、不确定，误报率，分析次数和 token | 缺失 | `FE:overview/ai-review-card.tsx`；`stats.go:715` 的 addAnalysisCounts |
| 费用卡：今日费用，按来源、按渠道、按审核器 | 部分：插件有 /costs（24h、7d、30d），缺按审核器 | `FE:overview/cost-card.tsx`；`stats.go:647-661` |
| 性能影响：前置附加延迟的平均值和 P50/P95/P99、受影响请求数；可按分组、流程筛选；各审核器调用耗时 | 缺失 | `FE:overview/performance-*.tsx`；`stats.go:820` 的 Performance |
| 今日类别分布：按 request_id 去重，最多 5 万条，缓存 60 秒 | 部分：插件取前 10 个类别，按记录计数，不去重 | `FE:overview/categories-card.tsx`；`stats.go:866` |
| 漏斗：每级的进入、命中、通过（推翻）数，以及流程结果 | 缺失 | `FE:overview/funnel-card.tsx`；`stats.go:674-680` |
| 趋势：各流程可疑率；审核器节点的命中率、错误率（超阈值标红）；可切换小时/天 | 部分：插件只有按结果分类的计数趋势 | `FE:overview/trend-card.tsx`；`stats.go:753` 的 TrendStats |
| 健康度：审核器和渠道近 1 小时的调用数、命中率、错误率，flagged 标记；队列状态 | 缺失：插件只有本节点内存里的计数 | `FE:overview/health-card.tsx`、`queue-status.tsx` |
| 每分钟自动刷新 | 部分 | `FE:overview/overview-page.tsx` |

### 记录

| new-api 功能 | 插件现状 | new-api 实现位置 |
|---|---|---|
| 筛选 result、severity、review、ai_verdict、verdict、timing、watch、flow、时间 | 已有 | — |
| 筛选 group、endpoint、token_id、session_fp；按用户名精确搜索，或按 request id 搜索 | 部分：插件界面没有 group 筛选；没有 endpoint、session_fp；q 搜的是原文 | `N:controller/content_moderation.go:1717-1800`；`FE:records/records-filters.tsx` |
| 列表列：流程名@版本（旧版本提示"现为 vN"）、各级路径（stage-path）、接近阈值的分数、后台排队耗时 | 部分 | `FE:records/records-columns.tsx`、`shared/stage-path.tsx`、`shared/score-chips.tsx` |
| 详情：同一请求的其他记录、当时的流程快照（阈值、题集、渠道）、用户的名单状态、是否在白名单、是否管理员、AI 复核结论及分析时间 | 部分：插件只有 trace 和 AI 字段 | `N:controller/content_moderation.go:1843-1914`；`FE:shared/flow-snapshot-card.tsx`、`records/record-user-section.tsx` |
| 原文结构化展示：文字分段、图片缩略图、可切换 raw JSON、`input_text` 全文、`input_message_dropped` 原因 | 部分：插件只显示 JSON 文本 | `N:service/moderation/record_message.go`（MessageParts、MessageText）、`controller:1919-1941`；`FE:records/record-input-message-section.tsx` |
| 在记录详情里直接操作名单 | 缺失 | `FE:watchlist/watch-level-actions.tsx`（WatchUserActions） |
| 批量人工处理 | 已有 | — |

### 观察名单与 AI 分析

| new-api 功能 | 插件现状 | new-api 实现位置 |
|---|---|---|
| 列表筛选：level、只看有新记录、AI 趋势（含"未分析"）、类别、用户名或 ID 片段。排序：new、last_hit、severity、total | 部分：插件只能按 level 和 user_id 筛，排序固定 | `N:model/moderation_watch.go:894-951`；`FE:watchlist/watchlist-filters.tsx` |
| 每行聚合信息：用户名、分组、当前流程@版本、可疑总数、各严重度计数、主要类别前几名及"其他 N"、其他分组、最近一次分析的 ai_counts、已过期标记 | 缺失 | `model/moderation_watch.go:881-890`、`controller:1992-2024` |
| 表头计数：watching、with_new、blocking，以及 analysis_every_violations | 缺失 | `controller:2072-2075`、`moderation_watch.go:832` |
| 手动加入时校验：用户存在、不是管理员、不在白名单 | 部分：插件只查豁免名单 | `controller:2147-2178` |
| 手动修改：可填 reason 和 analysis_id（按 AI 建议执行时关联）；有效期用绝对时间 | 部分：插件用 days 表示有效期，没有 reason | `controller:2078-2123` |
| 详情抽屉：用户卡；摘要（各处理状态、严重度、AI 结论的分布）；上下文条（近 30 天的"分组→流程@版本"来源，可只看某个来源）；时间线 50 条，可批量处理；历史里显示操作人姓名；距下次分析的进度 | 部分 | `controller:2345-2451`；`service/moderation/watchlist.go:171`（UserModerationContext）；`FE:watchlist/user-detail-*.tsx`、`audit-context-bar.tsx`、`suspicious-timeline.tsx` |
| 分析卡：逐条结论按违规的高/中/低分组；所用流程是否当前版本；可一键执行 AI 建议 | 部分 | `FE:watchlist/analysis-card.tsx`、`analysis-verdicts.tsx`、`analysis-history.tsx` |
| 手动分析时，并发已满返回 503 | 部分：插件只排队 | `controller:2236-2259` |

### 流程

| new-api 功能 | 插件现状 | new-api 实现位置 |
|---|---|---|
| 拖拽画布编辑器（规格见第 2 节） | 缺失：插件是带勾选框的表单 | `FE:flows/*` |
| 列表：按名称搜索、按分组筛选、近 24 小时审核数、可疑率、前置平均延迟、"N 个分组，M 个已绑"、提示停用流程的分组和已不存在的分组 | 部分 | `FE:flows/flows-table.tsx`；`stats.go:1001`（FlowStats24h） |
| 在列表行内编辑分组：多选弹层，每项标"已绑某流程"或"未审核"；遇到 409 时确认后改绑 | 部分：插件在编辑弹窗里勾选，409 时弹确认 | `FE:flows/flow-groups-cell.tsx` |
| 启用且已绑分组的流程不能删除 | 缺失 | `flows-table.tsx:200-223` |
| 总超时为 0 表示自动，草稿保持 0 | 有 bug（见上方总结） | `controller:1108-1123`、`1443-1445` |
| 详情返回 `stage_timeout_sum_ms` | 缺失 | `controller:1248-1250` |
| 模拟时可选用户状态：未标记（后置）、观察级（后置）、拦截级（前置） | 部分 | `FE:flows/simulate-panel.tsx` |

### 审核器

| new-api 功能 | 插件现状 | new-api 实现位置 |
|---|---|---|
| 列表列：渠道名和状态、今日调用数、今日费用 | 部分：插件只显示是否可用 | `controller:575-630`；`stats.go:974` |
| OpenAI 阈值预设：宽松（×1.1）、默认、严格（×0.75），能识别当前用的是哪一档 | 缺失 | `FE:auditors/threshold-presets.ts`、`openai-thresholds-editor.tsx` |
| Jev 题目的 label 和判定标准（answer_yes / answer_no），显示 rules_version | 部分 | `FE:auditors/jev-question-row.tsx` |
| 试跑未保存的修改：`:id=0`，或在已有配置上叠加草稿字段；可带单张图片 | 部分：插件只能试跑已保存的审核器 | `controller:863-969` |

### 渠道

| new-api 功能 | 插件现状 | new-api 实现位置 |
|---|---|---|
| 列表列：被哪些审核器使用、是否分析渠道、近 1 小时调用数/错误率/费用、今日费用和 token（按来源拆分） | 部分：插件有 price_state 和 cost_30d | `controller:382-416`；`stats.go:925` |
| 在行内启用或停用（带确认）；测试结果显示 URL、HTTP 状态码和上游返回的信息 | 部分 | `FE:channels/channel-row-actions.tsx` |
| 删除时：是分析渠道返回 409；被审核器使用返回 409，并列出这些审核器 | 部分：插件不检查分析渠道，也不列出审核器名单 | `controller:523-557` |
| 渠道代理 | 用户 2026-10-31 要求完整迁移，需要补 | `N:service/moderation/channel.go` |

### 设置

| new-api 设置项 | 插件现状 | 说明 |
|---|---|---|
| `error_rate_alert_percent`（默认 5） | 缺失 | 告警和 flagged 都依赖它 |
| `ttft_timeout_ms`（首字节超时，1–60 秒） | 缺失 | `N:service/moderation/upstream.go:22-55` |
| `stats_retention_days`（默认 90） | 缺失 | 清理统计表用，`cleanup.go:96-102` |
| `record_input_message` | 部分：插件并入了 store_text | — |
| `worker_count`、`post_concurrency` | 部分：插件统一用 max_concurrency | — |
| 缩短保留期后立刻清理一次 | 缺失 | `controller:250-257` |
| 拦截响应预览（OpenAI、Claude、Gemini 三种格式和流式错误） | 缺失 | `FE:settings/block-response-preview.tsx` |
| 分析渠道用下拉选择，只列 llm 渠道，并做校验 | 部分：插件的 schema 里是填数字 | `controller:229-239` |
| Jev 默认题集编辑器，可恢复内置 | 部分：插件是 schema 里的 JSON | `FE:settings/jev-default-questions-section.tsx` |
| 分析准则显示内置默认文本、提示词预览、工具表、类别字典 | 已有 | — |

### 通知、告警、审计

| 功能 | 插件现状 | new-api 实现位置 |
|---|---|---|
| AI 自动升级、降级、移出名单后通知管理员 | 缺失 | `escalate.go:139`（notifyAutoChange） |
| 流程异常率越过阈值时告警 | 缺失 | `stats.go:1034`（alertErrorRate） |
| 管理操作写审计 | 缺失（§72.11 已放到 P3） | `controller/audit_content_moderation.go` |

## 2. 拖拽画布编辑器（用 Vue 重写所需的规格）

### 拖拽数据

文件：`canvas-drag.ts`。

- MIME 类型为 `application/x-content-moderation-flow`，同时写一份 `text/plain`，内容是 JSON。`effectAllowed=move`，开始拖动时调用 stopPropagation。
- 拖动源有三种：
  - `{kind:'library', auditor}`：从审核器库拖出
  - `{kind:'node', stage, index}`：拖动某一级里的审核器
  - `{kind:'stage', stage}`：拖动级标题的把手
- 落点有三种：`{kind:'stage', stage}`（某一级）、`{kind:'new'}`（新建一级）、`{kind:'trash'}`（拖回审核器库）。
- 落点在 dragover 时调用 preventDefault，并高亮；只读模式下不接受拖放。

### 落点处理

函数：`flow-canvas.tsx` 的 applyDrop。

| 拖动源 \ 落点 | 某一级 | 新建一级 | 审核器库（删除） |
|---|---|---|---|
| library | addAuditor：并行追加 | addStage(auditor) | 不处理 |
| node | 目标是另一级时 moveAuditor 到末尾；同一级不处理 | moveAuditor 到 stage=len（新建最后一级） | removeAuditor |
| stage | moveStage(from, to) | 不处理 | 不处理 |

结果没有变化，且拖动源不是 stage、落点是 stage 时（通常是目标级已有这个审核器），弹 toast：「这一级已经有这个审核器了」。

### 纯函数

文件：`N:web/shared/src/content-moderation/ops.ts`。所有函数都不修改传入的对象。

- `newSpec`：`{enabled:true, model_filter:{type:'all', models:[]}, sample_rate:100, total_timeout_ms:0, stages:[]}`
- `addStage(spec, id, typeOf, at=len)`：在 at 处插入 `{auditors:[id], combine:'any'}`
- `addAuditor`：这一级已有该审核器，或类型不允许时，原样返回
- `removeAuditor`：某一级删空后，连这一级一起删掉
- `moveAuditor`：目标级已有该审核器时不动；源级删空后删掉；`to.stage === len` 时新建一级
- `moveStage`：越界时不动
- `normalizeCombine`：any 和 all 去掉 n；at_least 时 `n = max(1, floor(n) || 1)`
- 模板：
  - `first_behavior`：两级，第一级 openai，第二级 typesafe
  - `single`：一级 openai
  - 某类型的审核器只有一个时自动选上，否则留空
- 级的角色名：第 1 级叫「初审」；后面某一级含 typesafe 叫「行为审查」，否则叫「复核」

插件里可放进流程的审核器类型是三种：`openai_moderation`、`typesafe`、`llm_verdict`。

### 布局

- **顶部**：「模板：」加两个按钮。已有级时先确认，文案为「替换当前的编排？」「套用模板「X」会替换草稿里的全部级。发布前不会生效。」
- **左侧审核器库**：
  - 标题「审核器（拖到右侧的级）」，带「管理 →」链接。
  - 每张卡显示名称、"类型 · 渠道名"，以及「用在第 1, 2 级」或「未使用」。
  - 拖到库上时显示「拖到这里从审核流程移除」。
  - 没有审核器时显示空状态提示。
- **右侧画布**（横向滚动），从左到右依次是：
  1. 「请求输入」块；
  2. 每一级前有一个「→」，从第二级开始箭头下方写「命中 → 下一级复核」；
  3. 各级卡片；
  4. 「+ 新的一级」虚线区域，内写「把审核器拖到这里」，下面还有一个「或选择一个审核器」下拉框；
  5. 「审核流程结果」块，写「前置：可疑即拒绝 · 后置：只记录」。

### 级卡片

文件：`stage-card.tsx`。

- **标题行**：拖动把手（提示「拖动调整顺序」）、「第 N 级 · 角色」、徽标「N 个并行」或「单个」、前移和后移按钮（到头时禁用）、删除本级。
- **审核器项**：
  - 可以用 Tab 聚焦，也可以拖动。
  - 键盘操作：Delete 或 Backspace 移除；← 移到上一级；→ 移到下一级，已在最后一级时新建一级。
  - 显示名称和"类型 · 渠道名"。审核器已被删除时显示「审核器已不存在」；渠道不可用时显示「渠道已停用或不存在：调用会异常，本级放行」。
  - 右侧有 X 按钮。
- **「+ 添加审核器（并行）」下拉**：只列出这一级还没有的审核器。
- **合并方式**：这一级多于一个审核器时显示下拉，选项为「任一命中即命中」「全部命中才命中」「至少 N 个命中」。选至少 N 个时出现 N 输入框，范围 1 到本级审核器数。合并方式为全部命中、且有审核器的渠道不可用时，警告「这一级永远不会命中」。
- **固定说明**：「审核器异常 / 超时导致凑不出定论 → 本级按通过」。
- **底部**：「通过 → 放行」；命中时，最后一级写「可疑（前置：拒绝）」，其余级写「交给第 N+1 级」。

### 画布警告（不阻止发布）

1. 有审核器的渠道不可用；
2. 第 1 级用了 Jev：每个请求都会经过 Jev，按 token 计费，成本较高；
3. 相邻两级用了同一个审核器。

画布下方固定显示键盘操作说明。

### 发布前校验

文件：`validate.ts`。错误阻止发布，用红色列表显示；属于某一级的错误前加「第 N 级：」。

| 错误码 | 提示文案 |
|---|---|
| unknown_field | 流程里有未知字段 |
| invalid_field | 流程里有不合法的字段 |
| invalid_model_filter | 模型范围不合法 |
| models_required | 这个模型范围至少要选一个模型 |
| invalid_sample_rate | 采样率必须在 0–100 之间 |
| invalid_total_timeout | 总超时必须为 0（自动）或 1–120 秒 |
| no_stages | 至少添加一级 |
| empty_stage | 为这一级选择审核器 |
| duplicate_auditor | 同一级里重复放了同一个审核器 |
| unknown_auditor | 审核器已不存在 |
| unsupported_auditor_type | 不支持的审核器类型（插件允许三种类型） |
| invalid_combine | 合并方式不合法 |
| invalid_n | N 必须是不小于 1 的整数 |

插件另外限制最多 8 级、每级最多 8 个审核器（`P:internal/moderation/flow.go`）。

### 配置卡

文件：`flow-config-card.tsx`。

- 名称，最多 64 字。
- 启用开关。插件里启用是单独一列，不进 spec。
- 已绑定的分组只读显示，带「到流程列表编辑 →」链接。没有分组时提示「没有分组时这条流程不会审核任何请求」。
- 采样率，0–100。
- 模型范围：全部、只审这些、除这些外；后两种用标签输入。
- 总超时。

### 总超时

文件：`flow-timeout-field.tsx`。

- 自动值 = 各级取 max（该级审核器所在渠道的 timeout_ms），再求和。
- 插件里渠道 timeout 为 0 时按类型取默认值：openai 3000、typesafe 8000、llm 15000（毫秒）。
- 两个单选项：
  - 「自动：各级最大单次超时之和 = X ms」，保存为 0；
  - 「手动」，以秒为单位输入，范围 1–120、步长 0.5，保存为毫秒。从自动切到手动时，初始值取自动值，夹在 1000–120000 之间。
- 手动值小于自动值时警告「最后一级可能被截断」。

### 草稿、发布、放弃

文件：`flow-editor-form.tsx`、`use-flow-draft-actions.ts`。

- 新建流程时默认套用 first_behavior 模板。
- **状态**：
  - dirty = 新建，或名称、草稿与已保存的 JSON 不一致；
  - unpublished = 从未发布，或 has_draft_changes。
- **徽标**：「未发布」或「v{n} · 已发布」；dirty 或 unpublished 时加「有未发布修改」。
- **按钮**：
  - 版本历史。
  - 放弃修改：有已发布版本且 dirty 或 unpublished 时可用。确认文案「草稿将恢复到已发布的 vN」，确认后用已发布的 spec 覆盖草稿。
  - 保存草稿：dirty 且名称不为空时可用。新建流程保存后跳转到 `?id=`。
  - 发布 v{n+1}：校验无错误且名称不为空时可用。
- **发布**：dirty 时先保存草稿，再带 expected_version 发布。返回 409 时提示「已有人发布了新版本，请刷新后再试」。
- **发布确认框**列出：
  - 状态；
  - 分组，未绑定时写「（未绑定，不审核任何请求）」；
  - 时机说明；
  - 每一级一行：「第 N 级 · 角色：A ∥ B · 合并方式 · 通过 → 放行 · 命中 → …」。
- **离开前提示**：可编辑、dirty、且不是新建流程时，拦截路由跳转和 beforeunload，提示有未保存的修改，按钮为离开或留下。

### 分组编辑

文件：`flow-groups-cell.tsx`。

- 在列表行上点铅笔打开弹层，多选全部分组。每项标「未审核」或「已绑「X」」。
- 保存时先发 `move:false`（插件里叫 `force`）。返回 409 时，确认框逐条列出「{group}（现在绑的是「X」）」，确认后带 `move:true` 重发。
- 分组的改动保存即生效，不产生新版本。

## 3. 统计表结构和写入点（new-api）

### `moderation_stats_hourly`

定义：`N:model/moderation_stats.go:39-64`。

- 主键：hour_ts、group_name、flow_id、stage、auditor_id、channel_id、timing。
- 计数列：audited、hit、blocked、overturned、errors、cache_skipped、calls、latency_ms_sum、tokens_in、tokens_out。
- 延迟分桶 9 列：lat_le50 … lat_gt10000。
- 费用列：quota、priced_calls、unpriced_calls、unpriced_tokens、free_calls。
- 写入方式：逐行 upsert，各列累加。
- 行的种类：
  - request 行：只有 group，timing=pre；
  - flow 行、stage 行、auditor 行；
  - channel 行：timing 记的是费用来源（空、analysis、test、try、simulate）。

### 写入点

| 调用 | 位置 | 记了什么 |
|---|---|---|
| `stats.Add(job)` | `gate.go:210` | flow、stage、auditor 行，以及调用了上游的渠道的 channel 行；审核器被跳过记为 cache_skipped |
| `stats.Request` | `gate.go:193` | 前置请求的 audited、blocked 和附加延迟 |
| `RequestSkipped`、`CacheSkipped` | `gate.go:163-165` | 放行缓存命中 |
| `stats.Call` | `analysis.go:373` | AI 分析调用（channel 行） |
| `recordManualCosts` | `cost.go:150` | 渠道测试、审核器试跑、流程模拟的费用 |

数据先在内存里累加，每 60 秒写库一次。

### `moderation_user_daily`

- 主键：day、user_id。
- 列：group_name、audited、suspicious、high、errors、last_hit_at。
- 只计非管理员。
- 只有 `GET /watchlist/:id` 的 daily 字段读它（30 天）。

### 清理

`stats_retention_days` 到期后删除这两张表的旧数据。

### 接口字段

**`GET /status`**：

| 字段 | 内容 |
|---|---|
| enabled、running、error_rate_alert_percent | 运行状态和告警阈值 |
| today | audited、suspicious、blocked、overturned、errors、cache_skipped、auditor_calls、tokens_in、tokens_out、analyses、analyses_failed、analysis_tokens_in、analysis_tokens_out |
| ai_review | reviewed、violation、false_positive、unsure |
| watch | watching、watching_with_new、blocking |
| auditors[]、channels[] | HealthRow：id、audited、calls、hits、errors、error_rate、hit_rate、flagged（样本 ≥20 且错误率超过阈值）、skipped_no_text |
| funnels[] | flow_id、name、stages[{stage, received, hit, passed}]、suspicious、blocked |
| queue | 各队列的长度、容量和丢弃数 |
| costs | total、audit、analysis、manual、channels[]、auditors[] |

**`GET /stats/trend?granularity&from&to&flow_id&group`**：
- flows[].points：ts、audited、cache_skipped、hit、blocked、overturned、errors、suspicious_rate、pre_avg、pre_p95、post_avg、post_p95；
- auditors[]：flow_id、stage、auditor_id、points（hit_rate、error_rate）。

**`GET /stats/performance`**：
- summary、points[]、auditors[]，每项为 {count, avg_ms, p50_ms, p95_ms, p99_ms, buckets}；
- 不选流程时取 request 行；选了流程时取该流程的 pre 行。

**`GET /stats/categories`**：suspicious_requests、category_hits、truncated、items[{category, label, count}]。

**前端时间范围**：按小时看时是今天 0 点到现在，按天看时是 13 天前到现在。趋势默认按天，性能默认按小时。

## 4. 通知

**收件人**：启用中、角色为管理员及以上、订阅了渠道通知、并且有内容审核读或写权限的人。通过 `service.NotifyUser` 发邮件或 webhook，用收件人设置的语言。核心通知（§73.4）只按渠道 + 接收人发送，不能按权限找收件人，所以插件仍自己发签名 webhook（是否迁到核心通知等用户决定），做法参照 `next/plugins/guard/internal/guard/hook.go` 的 alertSender。

**名单自动变更**（auto_block、auto_downgrade、auto_remove 各发一条）：
- 内容：用户名、原级别、新级别、趋势、建议和跳转链接。
- 不带分析摘要，因为摘要可能引用用户原文。
- 通知类型按用户区分。

**流程异常率告警**：
- 只在主节点上执行，每 60 秒检查一次。
- 某个流程近 1 小时样本 ≥20、且 errors×100 > 阈值×样本数时，只在从"未超"变为"超过"的那一刻发一次。
- 内容：流程名、id、异常率、errors/audited、阈值，并说明「审核异常时请求会直接放行」。

## 5. 宿主（sup2api 核心）缺的能力

| 需要 | new-api 用在哪里 | 现状和建议 |
|---|---|---|
| 按 id 批量取用户名、分组、角色、状态 | 名单、记录详情、通知、历史里的操作人 | 界面用 `host.api` 调 `/users/:id`；没有 `user:read` 权限的人只能看到 id |
| 按用户名查用户 | 记录和名单的搜索 | 界面先用 `/users?q=` 查到 id，再用 id 搜 |
| 识别管理员 | 名单、统计 | 已用 `AuthzCheck(moderation:read)` 实现（`staff.go`） |
| 用户当前所在的分组 | 上下文条 | 取该用户最近一条记录的分组 |
| 全部分组列表 | 找出未绑定流程的分组、已失效的分组 | 界面调 `/groups`（需要 group:read 权限） |
| 按权限给管理员发通知 | 第 4 节 | 核心已有 `Notify`（§73.4），但只按渠道 + 接收人发送；按权限找收件人、各管理员订阅仍缺。插件继续发自己的 webhook |
| 管理操作审计 | recordManageAudit | 核心没有给插件写审计的接口 |
| 请求端点路径、粘性会话指纹 | 记录的 endpoint 和 session_fp 筛选 | RequestMeta 里没有这两个字段 |
| 渠道代理 | 渠道 proxy 字段 | 自定义的 Transport 要从 SDK 装好之后的 `http.DefaultTransport` Clone 出来，才会继续走出口隧道 |
| 设置页的权限 | new-api 的设置页只要有写权限就能改 | 插件设置需要宿主的 plugin:manage 权限 |
