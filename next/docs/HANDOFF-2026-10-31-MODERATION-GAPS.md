# 附录：new-api 内容审核与 moderation 插件的功能差异清单（2026-10-31）

> **进度（2026-10-31 按代码核对后更新）**：
> - 第 1 节的状态已按插件现有代码（0.4.0 及之后的修补）逐条核对：原先标"缺失""部分"的大多已经实现，表里写的是现在的状态。
> - 实现情况、有意保留的差异、仍缺的核心接口，见 CONTRACTS §72.14；界面见 §72.15。
> - 2026-10-31 补上的几项：记录保存 endpoint 和会话指纹并可筛选（核心 `RequestMeta` 新增字段，迁移 0007），AI 分析工具恢复 `session_fp`；缩短保留期立即生效（按当前保留期删除已有记录，保存后马上清理一次）；试跑、测试、模拟可上传或粘贴图片；`/costs` 的按天分桶改按浏览器时区；分析渠道不是大模型渠道时在 `/status` 和设置页提示。
> - 核心 §75 补上后已接入（插件 0.5.0，管理员需重新批准）：`ui.settings.permission = moderation:manage`；`GetUsers`（可选权限 `users.read`）用于手动加入名单和封禁时校验用户存在、界面批量显示用户名、通知带用户名；管理接口的写操作由核心自动审计（`plugin.route.write`）。
> - 2026-10-31 评审后修补：保留期清理只在取到 advisory lock 的一个节点上执行，并分批删除（每批 5000 行、批间停 50 ms，照 new-api `deleteRecordBatches`）；插件 `GET /users` 只返回 id、显示名、状态，只回答插件自己的表里出现过的用户，通知不再用邮箱代替用户名；界面只在 503 `users_unavailable` 时改走核心 `/users/:id`，其他错误 30 秒后重查；设置页对停用的分析渠道也提示（同 `channel_problem` 的 `unusable`）。
> - 仍要等核心：按权限通知管理员（及各管理员自己的订阅）。

> 本清单最初由只读 agent 对照两边源码生成；第 1 节的状态列已按代码核对，第 2–4 节是当时整理的 new-api 规格，留作参照。
>
> 路径缩写：
> - `N:` = `D:\projects\golang\new-api`
> - `P:` = `next/plugins/moderation`
> - `FE:` = `N:web/default/src/features/content-moderation`
>
> CONTRACTS §72 里写明的取舍不算缺口：放行缓存、名单两级 observe/enforce、保留封禁表、设置用 schema 表单、分组用数字 id、`llm_verdict` 可以进流程、flows.enabled 单独一列、费用以美元计。
>
> 状态列：**已有** = 已实现；**有意不同** = §72 写明的取舍；**等核心** = 需要核心先提供接口。

## 总结

- 统计（小时统计表、延迟分桶、漏斗、健康度、性能）、通知告警、流程画布、记录详情、观察名单详情和筛选排序都已实现。
- 原"已知 bug"（发布流程时把自动算出的总超时写回草稿）已修：草稿保持 0，发布的版本存算出的值（`stats_api_test.go` TestFlowDraftTimeoutAndDelete）。
- 剩下要等核心的只有按权限通知管理员；用户校验、管理审计、设置页权限已由核心 §75 补上。
- 有意不同：统计里用户每日计数（`user_daily`）按 UTC 日期；结尾 user 消息最多取 16 条（§72.4）；手动分析排队、不返回 503。

## 1. 各区域对照

### 概览与统计

| new-api 功能 | 插件现状 | 插件实现位置 |
|---|---|---|
| 运行状态条：总开关、运行中、启用流程数、已绑分组数、未审核分组、停用渠道数、是否配了分析渠道 | 已有；分析渠道不存在或不是大模型渠道时写明原因 | `P:ui/native/src/overview/StatusLine.vue`；`/status` 的 `runtime.analysis.channel_problem` |
| 今日 KPI：审核数、可疑、观察中（其中有新记录的人数）、拦截级人数、前置拒绝 | 已有（`hits_since_seen` 对应 hits_since_mark） | `GET /status` 的 today、watch |
| 最需关注的人：名单前 6 名，按新增命中排序 | 已有 | `overview/AttentionUsers.vue`（`sort=new`） |
| AI 复核卡：违规、误报、不确定，误报率，分析次数和 token | 已有 | `overview/AiReviewCard.vue`；`stats_api.go` addAnalysisCounts |
| 费用卡：今日费用，按来源、按渠道、按审核器 | 已有；`/costs` 的按天分桶按浏览器时区 | `overview/TodayCostCard.vue`、`CostCard.vue`；`costs.go` |
| 性能影响：前置附加延迟的平均值和 P50/P95/P99、受影响请求数；按分组、流程筛选；各审核器耗时 | 已有 | `overview/PerformanceCard.vue`；`GET /stats/performance` |
| 今日类别分布：按 request_id 去重，最多 5 万条，缓存 60 秒 | 已有 | `overview/CategoriesCard.vue`；`GET /stats/categories` |
| 漏斗：每级的进入、命中、通过数，以及流程结果 | 已有 | `overview/FunnelCard.vue` |
| 趋势：各流程可疑率；审核器命中率、错误率（超阈值标红）；小时/天 | 已有；天按浏览器时区（整点对齐） | `overview/TrendCard.vue`；`GET /stats/trend` |
| 健康度：审核器和渠道近 1 小时的调用数、命中率、错误率、flagged；队列状态 | 已有 | `overview/HealthCard.vue`、`QueueCard.vue` |
| 每分钟自动刷新 | 已有 | `overview/tick.ts` |

### 记录

| new-api 功能 | 插件现状 | 插件实现位置 |
|---|---|---|
| 筛选 result、severity、review、ai_verdict、verdict、timing、watch、flow、时间 | 已有 | `routes.go` eventFilter |
| 筛选 group、token、用户名、request id | 已有（用户名经核心 `/users?q=` 换成 id；q 搜 request id、原因和原文） | `EventsTab.vue`、`users.ts` |
| 筛选 endpoint、session_fp；详情显示端点和粘性会话，可点击只看同一会话 | 已有（`RequestMeta.endpoint`、`session_fingerprint`，迁移 `0007_endpoint_session.sql`）；new-api 的会话规则名 `session_rule` 没有（核心只给指纹） | `routes.go` eventFilter；`EventsTab.vue`、`EventDetail.vue` |
| 列表列：流程名@版本（旧版本提示"现为 vN"）、各级路径、接近阈值的分数、后台排队耗时 | 已有 | `FlowRef.vue`、`StagePath.vue`、`ScoreChips.vue` |
| 详情：同一请求的其他记录、流程快照、名单状态、豁免、是否管理员、AI 结论及分析时间 | 已有 | `GET /events/:id`（related、flow_snapshot、user_state、ai_analyzed_at）；`EventDetail.vue` |
| 原文结构化展示：文字分段、图片缩略图、raw JSON、`input_text` 全文、`input_message_dropped` 原因 | 已有 | `InputMessage.vue`、`TraceView.vue` |
| 在记录详情里直接操作名单 | 已有 | `UserStateSection.vue`、`WatchActions.vue` |
| 批量人工处理 | 已有 | `useBulkReview.ts` |

### 观察名单与 AI 分析

| new-api 功能 | 插件现状 | 插件实现位置 |
|---|---|---|
| 列表筛选：level、只看有新记录、AI 趋势（含"未分析"）、类别、用户；排序 new、last_hit、severity、total | 已有 | `watch_list.go` watchFilter |
| 每行聚合：分组、当前流程@版本、可疑总数、各严重度、前 3 类别及"其他 N"、其他分组、最近分析的 ai_counts、过期标记 | 已有（用户显示名由界面经插件 `GET /users` 批量查询；邮箱只在有 `user:read` 时从核心取） | `watch_list.go` WatchItem；`users.go` |
| 表头计数：watching、with_new、blocking，以及 analysis_every_violations | 已有 | `GET /watchlist` 的 meta |
| 手动加入时校验：不是管理员、不在白名单 | 已有 | `watch.go`（isStaff、exempt） |
| 手动加入时校验用户存在 | 已有：不存在返回 404 `user_not_found`（封禁同样）；未授予 `users.read` 时跳过校验 | `users.go` missingUser；`watch.go`、`routes.go` createBlock |
| 手动修改：reason、analysis_id、绝对时间 expires_at | 已有 | `watch.go` watchInput |
| 详情抽屉：用户卡、摘要、上下文条（可只看某来源）、时间线批量处理、历史里的操作人、分析进度 | 已有 | `WatchDetail.vue`、`WatchSummary.vue`、`UserTimeline.vue`、`WatchHistory.vue`、`UserAnalysisBar.vue` |
| 分析卡：结论按高/中/低排序；流程是否当前版本；一键执行 AI 建议 | 已有 | `AnalysisCard.vue` |
| 分析工具的记录带 session_rule / session_fp | 已有 `session_fp`；`session_rule` 没有（核心只给指纹） | `analysis_tools.go` toolRecord |
| 手动分析时并发已满返回 503 | 有意不同：排队（§72.14） | — |

### 流程

| new-api 功能 | 插件现状 | 插件实现位置 |
|---|---|---|
| 拖拽画布编辑器（规格见第 2 节） | 已有 | `FlowEditor.vue`、`FlowCanvas.vue`、`StageCard.vue`、`flowOps.ts` |
| 列表：按名称搜索、按分组筛选、24 小时审核数、可疑率、前置平均延迟、分组覆盖、停用流程的分组和已不存在的分组 | 已有 | `FlowsTab.vue` |
| 行内编辑分组，409 时确认后改绑 | 已有 | `FlowGroupsCell.vue` |
| 启用且已绑分组的流程不能删除 | 已有（409 `flow_in_use`） | `routes_flows.go` deleteFlow |
| 总超时 0 表示自动，草稿保持 0 | 已有（原 bug 已修） | `routes_flows.go` publishFlow |
| 详情返回 `stage_timeout_sum_ms` | 已有 | `routes_flows.go` FlowView |
| 模拟时可选用户状态 | 已有；可上传、粘贴图片 | `FlowSimulate.vue`、`ImageInput.vue` |

### 审核器

| new-api 功能 | 插件现状 | 插件实现位置 |
|---|---|---|
| 列表列：渠道名和状态、今日调用数、今日费用 | 已有 | `AuditorsTab.vue`；AuditorView.today |
| OpenAI 阈值预设：宽松、默认、严格，识别当前档位 | 已有 | `thresholdPresets.ts` |
| Jev 题目的 label 和判定标准（answer_yes / answer_no），显示 rules_version | 已有 | `JevQuestionsEditor.vue`、`AuditorEditModal.vue` |
| 试跑未保存的修改，可带图片（上传或粘贴） | 已有；图片合计约 675 KB（核心转发插件请求最多 1 MiB） | `AuditorTryModal.vue`、`ImageInput.vue`；`POST /auditors/try` |

### 渠道

| new-api 功能 | 插件现状 | 插件实现位置 |
|---|---|---|
| 列表列：被哪些审核器使用、是否分析渠道、近 1 小时调用数/错误率、今日费用和 token（按来源） | 已有 | `ChannelsTab.vue`；ChannelView |
| 行内启用或停用（带确认）；测试结果显示 URL、HTTP 状态码和上游信息 | 已有 | `ChannelsTab.vue` |
| 删除时：是分析渠道 409；被审核器使用 409 并列出审核器 | 已有 | `routes_config.go` deleteChannel |
| 渠道代理 | 已有 | `proxy.go` |

### 设置

| new-api 设置项 | 插件现状 | 说明 |
|---|---|---|
| `error_rate_alert_percent`、`ttft_timeout_ms`、`stats_retention_days` | 已有 | §72.14 |
| `record_input_message` | 有意不同：并入 `store_text` | §72.14 |
| `worker_count`、`post_concurrency` | 有意不同：合并为 `max_concurrency` | §72.14 |
| 缩短保留期后立刻清理一次 | 已有：清理按当前保留期删除已有记录；保留期缩短时各节点在应用设置后尝试清理，只有取到 advisory lock 的节点执行，分批删除（每天的 `cleanup` 任务走同一条路径） | `routes_misc.go` purgeRetention、deleteBatches；`plugin.go` Configure；§72.10 |
| 拦截响应预览（OpenAI、Claude、Gemini 和流式错误） | 已有 | `SettingsTab.vue`、`blockPreview.ts` |
| 分析渠道下拉，只列 llm 渠道，并做校验 | 已有下拉；校验见说明 | 设置由核心保存，不经插件（核心没有保存前的校验钩子，Configure 失败只记日志，启动时失败会让插件起不来）。插件在应用时把不存在、非 llm 或停用的渠道当作未配置，`/status` 返回 `channel_problem`，概览状态条写明原因；设置页按渠道列表对所选渠道同样提示（停用时用 `unusable` 的文案） |
| Jev 默认题集编辑器，可恢复内置 | 已有 | `SettingsTab.vue`、`JevQuestionsEditor.vue` |
| 分析准则默认文本、提示词预览、工具表、类别字典 | 已有 | `AnalysisPromptModal.vue` |
| 设置页的权限：有写权限就能改 | 已有：manifest `ui.settings.permission = moderation:manage`（核心 §75.1）；没有 `plugin:read` 的人走 `/plugins/moderation/settings` | `manifest.json`；`ui/native/src/host.ts` canManageSettings、settingsPath |

### 通知、告警、审计

| 功能 | 插件现状 | 插件实现位置 |
|---|---|---|
| AI 自动升级、降级、移出名单后通知管理员 | 已有：发到设置的签名 webhook；按权限发给管理员等核心 | `notify.go` |
| 流程异常率越过阈值时告警 | 已有（`alerts` 任务，KV 去重） | `notify.go`、`stats_api.go` |
| 管理操作写审计 | 已有：核心自动审计插件管理接口的写操作（§75.2 `plugin.route.write`） | 名单操作另记在 `watch_events` |

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

**收件人**：启用中、角色为管理员及以上、订阅了渠道通知、并且有内容审核读或写权限的人。通过 `service.NotifyUser` 发邮件或 webhook，用收件人设置的语言。核心通知（§74.4）只按渠道 + 接收人发送，不能按权限找收件人，所以插件仍自己发签名 webhook（是否迁到核心通知等用户决定），做法参照 `next/plugins/guard/internal/guard/hook.go` 的 alertSender。

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
| 按 id 批量取用户名、分组、角色、状态 | 名单、记录详情、通知、历史里的操作人 | 已有：`GetUsers`（Host API 8，`users.read`）；插件 `GET /users?ids=` 每次最多 500 个，只返回 id、显示名、状态，只回答插件表里出现过的用户；界面按页合并请求；未授予（503 `users_unavailable`）时界面退回逐个调核心 `/users/:id`（邮箱、角色只从这里来） |
| 按用户名查用户 | 记录和名单的搜索 | 界面先用 `/users?q=` 查到 id，再用 id 搜 |
| 识别管理员 | 名单、统计 | 已用 `AuthzCheck(moderation:read)` 实现（`staff.go`） |
| 用户当前所在的分组 | 上下文条 | 取该用户最近一条记录的分组 |
| 全部分组列表 | 找出未绑定流程的分组、已失效的分组 | 界面调 `/groups`（需要 group:read 权限） |
| 按权限给管理员发通知 | 第 4 节 | 核心已有 `Notify`（§74.4），但只按渠道 + 接收人发送；按权限找收件人、各管理员订阅仍缺。插件继续发自己的 webhook |
| 管理操作审计 | recordManageAudit | 已有：核心自动审计插件管理接口的写操作（§75.2 `plugin.route.write`），插件不用改 |
| 请求端点路径、粘性会话指纹 | 记录的 endpoint 和 session_fp 筛选 | 已有：`RequestMeta.endpoint`、`session_fingerprint`（§25.1，2026-10-31），插件已接上 |
| 渠道代理 | 渠道 proxy 字段 | 已实现（`proxy.go`）：Transport 从 SDK 装好之后的 `http.DefaultTransport` Clone 出来，继续走出口隧道 |
| 设置页的权限 | new-api 的设置页只要有写权限就能改 | 已有：manifest `ui.settings.permission`（§75.1），插件设为 `moderation:manage` |
| 保存设置前让插件校验 | 分析渠道必须是已有的 llm 渠道（`controller:229-239`） | 核心保存设置不问插件；Configure 拒绝只记日志（启动时拒绝会让插件起不来），所以插件只能在应用时把错误的渠道当作未配置，并在 `/status` 和设置页提示 |
