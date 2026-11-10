# 提示词审核 0.8.0：与 new-api 内容审核对齐（设计文档）

> 日期：2026-11-10。状态：待评审，尚未实现。
> 分支：`feat/moderation-newapi-parity`（插件现为 0.7.2，提交 `c31b3c4cb`）。
> 参照实现：new-api 提交 `207797b76`（cp.294），只读。
> 本文是实现依据。按第 12 节的任务顺序改，按各节"测试"补用例。第 13 节的未决问题需要负责人先确认，括号里是推荐的默认做法；没有答复时按推荐做法实现。
>
> 路径缩写：
> - `N:` = `/home/cvp/rc/new-api`（如 `N:service/moderation/flow.go:160`）
> - `P:` = `next/plugins/moderation`（如 `P:internal/moderation/flow.go:286`）
> - Go 文件不写目录时：N 指 `service/moderation/`，P 指 `internal/moderation/`。
> - 界面文件不写目录时指 `P:ui/native/src/`。

---

## 1. 背景、目标、范围

### 1.1 背景

插件 `moderation`（下称 P）在 2026-10-31 按 new-api 的内容审核（下称 N）迁移完成（CONTRACTS §72）。N 在 2026-11-01 至 11-08 之间改了几处核心行为，P 没有跟进：

- 流程里某一级出错时，N 现在跳过这一级、保留前面的命中；P 仍然按"出错即放行"。
- N 新增了补审级、把初审命中传给复审、题表式 LLM 审核器。
- N 的缓存从"只存放行"改为"存放行和命中，命中直接重放"。
- N 的审核时机改由默认级别、白名单、黑名单决定。
- N 的 Jev 引擎开了长上下文，并能把不合规格的图片重画后送审。

### 1.2 目标

对第 1.3 节列出的功能，P 的行为与 N 一比一相同。做不到或不该相同的地方，在第 10 节逐条写明原因。

### 1.3 范围

| 编号 | 功能 | 章节 |
|---|---|---|
| 1 | 流程引擎：失败级跳过、超时保留命中、分母扣除出错、补审级、初审命中传给后级、结果映射 | 第 3 节 |
| 2 | 题表式 LLM 审核器（新类型 `llm_questions`） | 第 4 节 |
| 3 | 判定缓存：缓存命中并重放、清空接口、人工处理同步缓存 | 第 5 节 |
| 4 | 时机与名单：默认级别、白名单、黑名单 | 第 6 节 |
| 5 | Jev 引擎：长上下文、图片重画、旧题集版本号 | 第 7 节 |
| 6 | `record_pass_input_message` | 第 8 节 |
| 7 | 绑定回落 | 第 9 节 |
| 8 | 上面各项需要的接口与界面 | 各节的"接口""界面"小节，汇总在第 11 节 |

### 1.4 不做的事

- 不改抽取：P 仍然审整个请求，拆成片段、装进块（§72.4）。N 是一个内容块跑一次流程，这个差别保留，第 5 节说明缓存怎样适配它。
- 不改 `blocks` 表的封禁功能（N 没有，P 保留）。
- 不改核心，不新增宿主权限，不改钩子的 scope。升级到 0.8.0 **不需要管理员重新批准**（第 11.2 节）。
- 附录 A 列出的差异这次不处理。
- 本文只做设计：不改代码、不提交、不动服务器。

---

## 2. 两边的审核单位（读后面各节的前提）

| | N | P |
|---|---|---|
| 送审内容 | system 和 user 的每个内容块 | 请求里客户端可控的全部内容（各角色消息、工具调用与结果、文档、工具定义、图片） |
| 一次流程运行审什么 | 一个内容块的全文（`N:gate.go:276-287`） | 一个块（chunk）：若干片段拼成，最多 `input_max_chars` 字（`P:extract.go:639-706`） |
| 缓存单位 | 内容块 | 片段（segment） |
| 一个请求的 trace | 判定块那一次运行 | 判定块（chunk）那一次运行，其余在 `trace.chunks`（`P:flow.go:222-255`） |

后文说"运行"都指一次 `runFlow`（N 的 `Run`）。

---

## 3. 功能 1：流程引擎

### 3.1 N 的行为

1. **失败级跳过**（`N:flow.go:160`）。一级没有得出结论时标 `Failed`，`Result = Skip`，流程继续下一级，前面的命中保留：

   ```go
   case stage.Skipped || stage.Failed:
       continue
   ```

   "没有结论"在 `runStage`（`N:flow.go:217-268`）里有三种来源：
   - 所有审核器都返回了，但凑不出结论，且不是全部跳过（263-268 行）；
   - 等结果时上层 ctx 结束（231-233 行）；
   - 收到的结果是 `context.Canceled` 且上层 ctx 已结束（236-242 行）。

   全部审核器都跳过时不算失败，是 `Skipped`（263-266 行）。

2. **总超时或客户端断开**（`N:flow.go:147-152`）。每一级开始前检查 ctx，已结束就不再跑后面的级，前面的命中保留：

   ```go
   if ctx.Err() != nil {
       tr.Errored = true
       break
   }
   ```

   循环结束后 `tr.Decider >= 0` 就是 Hit（171-174 行）。

3. **分母扣除出错的审核器**（`N:flow.go:258`）：

   ```go
   decide(hits, passes, pending-1, st.need(len(st.Auditors)-skipped-errored))
   ```

4. **补审级**（`N:spec.go:27-32`、`112-119`、`164-171`，`N:flow.go:184-199`）。
   - spec 里 `stages[].fallback = true` 的级是补审级。第一级不能是补审级；补审级必须排在所有普通级后面。
   - 补审级在两种情况下运行：普通级链以"通过"结束且不是推翻（`N:flow.go:163-166`）；或普通级全部失败或跳过，没有任何一级判定（175-176 行）。
   - 补审级依次运行，失败的跳过，**第一个命中的就是最终命中**（`Final = Hit`，`Decider` = 它的下标），之后的不再运行。都不命中时流程通过。
   - 第一级全部跳过时流程直接以"跳过"通过，不跑补审（157-159 行）。
   - 被推翻的通过不跑补审。

5. **初审命中传给后级**（`N:flow.go:41`、`153`，`N:auditor.go:48-58`，`N:engine.go:99`）。`Run` 把当前判定级的命中（`tr.HitCategories()`）作为 `prior` 传给下一级的每个审核器；第一级和补审级拿到 nil。只有题表式 LLM 引擎读它（`N:engine_llm.go:50-59`）。

6. **记录结果映射**（`N:result.go:73-83`）：

   ```go
   switch {
   case t.Final == Hit:           return ResultHit
   case t.Overturned:             return ResultOverturned
   case t.Errored && !t.judged(): return ResultError
   }
   return ResultPass
   ```

   `judged()` = 有任何一级的结果是 hit 或 pass（`N:flow.go:309-311`）。所以：有失败级但别的级判过，结果是 pass 或 overturned，不是 error；只有没有任何一级判定时才是 error。

7. **trace 标记**：`StageTrace.Failed`、`StageTrace.Fallback`（`N:flow.go:75-78`）。
8. **保存原文的条件**（`N:flow.go:317-319`）：最终命中，或任何一级判过命中。
9. **统计**（`N:stats.go:302-304`）：流程行的 `errors` 按 `Trace.Errored` 计，与结果无关。这样复核级坏了但初审命中仍然成立时，异常率告警还能看到。

### 3.2 P 现在的行为

- 没有结论的级按通过处理并结束流程（`P:flow.go:286-289`：`runStage` 返回 `Result: Pass, Errored: true`，`runFlow` 走 `case stage.Result == Pass` 返回）。
- 等结果时 ctx 结束：该级 `Errored`、`Result = Pass`（`P:flow.go:313-315`），流程通过。
- 分母只扣跳过的（`P:flow.go:333`）。
- 没有补审级；`ParseSpec` 用 `DisallowUnknownFields`（`P:flow.go:55-56`），带 `fallback` 的 spec 被拒绝。
- `auditFunc` 没有 `prior` 参数（`P:flow.go:258`）。
- 结果映射里 error 排在 overturned 前面，且只要 `Errored` 就是 error（`P:store.go:51-63`）。
- 只有第一级命中才保存原文（`P:flow.go:375`、`P:hook.go:484`）。
- 流程行的 `errors` 只在结果是 error 时加一（`P:stats.go:370-371`）。

### 3.3 P 的目标行为

与 3.1 的 1–9 条相同。P 特有的两点：

- **pre 运行与客户端断开**：P 的 pre 运行在 singleflight 里用独立的 ctx（`P:hook.go:294-300`，`context.WithoutCancel`），客户端断开不会取消运行。所以 3.1 第 2 条在 P 里只由两种情况触发：流程总超时（pre 是 min(总超时, 29 秒)），以及 Shutdown。Shutdown 打断的运行本来就不计数、不记录（`P:hook.go:334`、`355`），不变。
- **多块请求的代表块**：改成 N 的顺序（`N:gate.go:323-332`）：第一个命中的块 → 第一个出错的块 → 第一个被推翻的块 → **最后一块**。P 现在是命中 → 推翻 → 出错 → 第一块（`P:flow.go:222-238`）。结果映射用代表块自己的各级判断 `judged()`；顶层 `errored` 仍是所有块的"或"。

### 3.4 数据模型与迁移

没有表结构变化。spec 是 jsonb，多一个可选字段：

```json
{"stages":[
  {"auditors":[1],"combine":"any"},
  {"auditors":[2],"combine":"any"},
  {"auditors":[3],"combine":"any","fallback":true}
]}
```

`fallback` 用 `omitempty`：不是补审级的不写这个键，所以没用到补审的流程，草稿和已发布的 JSON 与 0.7.2 逐字节相同。

trace（`events.trace`）多出的键：`stages[].failed`、`stages[].fallback`，都是 `omitempty`。

### 3.5 Go 改动

**`flow.go`**

```go
type Stage struct {
    Auditors []int64 `json:"auditors"`
    Combine  string  `json:"combine"`
    N        int     `json:"n,omitempty"`
    Fallback bool    `json:"fallback,omitempty"`
}

type StageTrace struct {
    Outcomes []Outcome `json:"outcomes"`
    Result   string    `json:"result"`
    Errored  bool      `json:"errored,omitempty"`
    Skipped  bool      `json:"skipped,omitempty"`
    Failed   bool      `json:"failed,omitempty"`   // 无结论：出错、超时、被取消；Result = Skip，Errored = true
    Fallback bool      `json:"fallback,omitempty"` // 补审级
}

type auditFunc func(ctx context.Context, auditorID int64, prior []HitCategory) Outcome

func (s *Spec) chainLength() int                                   // 第一个补审级之前的级数
func runFlow(ctx context.Context, spec *Spec, timeout time.Duration, audit auditFunc) Trace
func runFallback(ctx context.Context, stages []Stage, base int, audit auditFunc, tr *Trace)
func runStage(ctx context.Context, st Stage, audit auditFunc, prior []HitCategory) StageTrace
func (t *Trace) judged() bool        // 有任何一级 Result 是 Hit 或 Pass
func (t *Trace) keepsMessage() bool  // Final == Hit，或任何一级 Result == Hit
func (t *Trace) stageSkipped() bool  // 有任何一级整级跳过（第 5 节用）
func (t *Trace) verdict() string     // ResultHit | ResultOverturned | ResultError | ResultPass，照 N:result.go:73-83
```

- `Spec.Validate`：加两条规则，报错文字照 N（`N:spec.go:112-119`）：第一级是补审级 → `the first stage cannot be a fallback stage`；补审级后面出现普通级 → `stage %d: fallback stages must come after every review stage`。`maxStages = 8` 把补审级算在内。
- `runFlow`：按 `N:flow.go:135-178` 重写。P 保留自己的两个细节：`timeout` 由调用方传入；通过时仍把 `Decider` 置为 -1（`P:flow.go:288`），界面和 `decidingStage()` 依赖它。写成：

  ```go
  case stage.Result == Pass:
      tr.Overturned = tr.Decider >= 0
      tr.Decider = -1
      if !tr.Overturned {
          runFallback(ctx, spec.Stages[chain:], chain, audit, &tr)
      }
      return tr
  ```

  每一级开始前调用 `runStage(ctx, st, audit, tr.HitCategories())`：`Decider < 0` 且没有命中过的级时 `HitCategories()` 返回 nil，与 N 的"第一级拿到 nil"一致。
- `runStage`：按 `N:flow.go:217-268` 重写（`failed` 变量、ctx 结束时返回 failed、`need(len-skipped-errored)`、结尾"全部跳过才是 Skipped，否则 Failed"）。
- `combineTraces`：挑选顺序改为 命中 → 出错 → 推翻 → 最后一块。
- 删除 `firstStageHit()`；`anySkipped()` 在第 5 节被 `stageSkipped()` 取代后一并删除。

**`store.go`**：`fillFromTrace` 改用 `tr.verdict()`：

```go
switch v := tr.verdict(); {
case v == ResultHit && refused: r.Result = ResultBlock
default:                        r.Result = v
}
```

**`stats.go`** `countRun`：去掉 `case ResultError: fc.errors++`，改为在 switch 之后 `if tr.Errored { fc.errors++ }`。级行、审核器行不变。

**`hook.go`**
- `runChunk` 的闭包加 `prior` 参数，传给 `p.audit`。
- `traceNote`：结果词改用 `tr.verdict()`。
- 保存原文的条件见第 8 节。

**`engine.go`** `audit` 的签名改为：

```go
func (p *Plugin) audit(ctx context.Context, a *liveAuditor, in *Input, prior []HitCategory, pre bool, source string) Outcome
```

`prior` 只传给题表式 LLM 引擎（第 4 节）。调用点：`hook.go` `runChunk`、`routes_config.go` `tryWith`（传 nil）。

**`analysis_prompt.go`**：`StageView` 加 `Fallback bool json:"fallback,omitempty"`；加常量 `RoleFallback = "fallback"`，`stageRoleNames` 加 `"补审"`；`stageRole(index, hasJev)` 改为 `stageRole(index int, fallback, hasJev bool)`，补审级优先（`N:flow.go:427-437`）。

**`analysis_tools.go`**：记录里各级各审核器的条目加 `stage_failed`（`N:flow.go:377-379`）。

### 3.6 界面

- `types.ts`：`Stage.fallback?: boolean`；`StageTrace.failed?`、`fallback?`。
- `flowOps.ts`（照 `N:web/shared/src/content-moderation/ops.ts`、`validate.ts`）：
  - `STAGE_KEYS` 加 `'fallback'`；`SpecIssueCode` 加 `'fallback_first'`、`'fallback_order'`；`validateSpec` 加这两条检查（`validate.ts:137-141`）和 `fallback` 类型检查（188-189 行）。
  - 新增 `setFallback(spec, stageIndex, fallback)`：改成补审级时移到所有普通级后面，改回普通级时移到所有补审级前面（`ops.ts:194-209`）。
  - `addStage`：插入位置不超过第一个补审级（`ops.ts:66-79`）。
  - `moveStage`：目标位置越过普通级与补审级的分界时不动。
  - `setCombine`：保留该级的 `fallback`（`ops.ts:181-186`）。
  - `canonicalSpec`：只在为真时保留 `fallback`。
  - `StageRole` 加 `'fallback'`；`stageRole` 的参数改为 `Pick<Stage, 'auditors' | 'fallback'>`，补审级返回 `fallback`。
- `StageCard.vue`：标题显示角色"补审"；工具栏加开关"补审级"（`SSwitch`，emit `fallback`）；第一级不显示该开关。结果行改为：普通级照旧；补审级显示"命中 → 最终命中"和"通过或失败 → 看下一个补审级，都没有命中则放行"。`flows.errorNote` 的文字见下。
- `FlowCanvas.vue`：处理 `@fallback`（`change(setFallback(...))`）；普通级与第一个补审级之间的箭头标注"通过或无结论 → 补审"。
- `TraceView.vue`、`StagePath.vue`、`trace.ts`：级状态的取值改为 `st.failed ? 'failed' : st.skipped ? 'skipped' : st.result`；`failed` 显示徽标"本级失败，已跳过"；补审级的级名显示"补审"。`TraceView` 顶部的 `trace.errored` 徽标文字改为"有审核器出错或有级失败"。
- `messages.ts` 要改的旧文案（中英两处都改）：

  | 位置 | 现在 | 改为 |
  |---|---|---|
  | `trace.errored`（361、1479 行） | 有审核出错（按通过处理） | 有审核器出错或有级失败 |
  | `flows.stagesDesc`（635 行） | ……出错一律放行。 | ……某一级出错或超时时跳过这一级，前面的命中保留；所有级都没有结论时放行，记为出错。 |
  | `flows.timingDesc`（662 行） | ……命中即拒绝，出错放行…… | ……命中即拒绝；某一级出错时保留前面的命中，没有任何一级判定时放行…… |
  | `flows.timeoutTruncate`（675 行） | ……最后一级可能被截断，按审核出错放行。 | ……后面的级可能来不及运行，这时保留前面的命中。 |
  | `flows.errorNote` | （现有文字） | 本级出错或超时：跳过本级，前面的命中保留。 |
- `forms/settings.ui.json` 98–99 行（`mode` 的 `ui:details`）："审核出错一律放行"改为"某一级审核出错时跳过这一级、保留前面的命中；所有级都没有结论时放行"。742–743 行是已隐藏的旧字段 `on_error` 的说明，同样改掉。

### 3.7 升级、回滚、混跑

- 已存的流程、版本、草稿：不用改，不含 `fallback` 的 spec 两个版本解析结果相同。
- **发布了带补审级的流程之后**：0.7.2 的节点解析这个 spec 会失败（未知字段），`loadSnapshot` 记一条警告并跳过该流程（`P:snapshot.go:272-276`），绑定它的分组在这些节点上**不审核**。所以：滚动升级期间不要发布带补审级的流程；回滚到 0.7.2 之前先把补审级去掉并重新发布。写进发布说明。
- 已有记录的 trace 没有 `failed`、`fallback`，界面按没有处理。
- 混跑期间新旧节点对同一流程的判断不同（见 3.9），持续到滚动结束。

### 3.8 对现有配置的行为变化（重要）

以下几条在线上现有配置下就会生效，不需要任何人改设置：

1. **复核级出错不再放行**。例：初审命中、复核超时。现在：通过，记 error。以后：命中，pre 时请求被拒绝，用户按违规处理。
2. **总超时不再放行已命中的请求**。pre 的预算是 min(流程总超时, 29 秒)，初审命中后预算用完：现在放行，以后拒绝。
3. **`all` / `at_least` 级里部分审核器出错**。例：两个审核器 `all`，一个出错、一个命中。现在：无结论 → 通过。以后：分母为 1 → 命中。
4. **记录结果**：有失败级但其他级判过的运行，从 error 变为 pass、overturned 或 hit。error 记录会变少，`record_errors`、`error_retention_days` 管到的记录相应减少。
5. **流程异常率**（告警、趋势）的分子从"结果为 error 的运行"变为"有任何一级失败的运行"，数值会变大或持平。
6. **多块请求全部通过时**，记录显示的是最后一块（以前是第一块）。

### 3.9 测试

Go（`unit_test.go` 扩充 `TestRunFlow`，表驱动，每条写明输入的各级结果和期望的 `Final / Decider / Overturned / Errored / 各级 Failed`）：

| 用例名 | 断言 |
|---|---|
| `failed stage is passed over, earlier hit stands` | 级 1 命中、级 2 全部出错 → Final=hit，Decider=0，级 2 `failed`，verdict=hit |
| `failed first stage, second reviews as first` | 级 1 出错、级 2 通过 → Final=pass，Overturned=false，verdict=pass（不是 error） |
| `every stage failed is an error` | 两级都出错 → verdict=error |
| `total timeout keeps the hit` | 级 1 命中后 ctx 超时 → 级 2 不运行（audit 调用次数为 1），Final=hit |
| `errored auditor leaves the denominator` | `all` 两个审核器，一错一中 → 该级 hit |
| `at_least 2 of 3, one errors one hits one passes` | 该级 pass（`hits+pending < need`） |
| `fallback runs after a pass` | 级 1 通过、补审命中 → Final=hit，Decider=补审级下标，该级 `fallback` |
| `fallback does not run after an overturn` | 级 1 命中、级 2 通过 → 补审级的 audit 没被调用 |
| `fallback runs when nothing judged` | 级 1 出错、补审命中 → Final=hit |
| `first fallback hit ends the run` | 两个补审级，第一个命中 → 第二个没被调用 |
| `skipped first stage skips the fallback too` | 级 1 全部跳过 → Skipped，补审没被调用 |
| `prior hits reach later stages only` | 级 1 的 audit 收到 nil；级 2 收到级 1 的命中（类别、分数、`stage=1`）；补审级收到 nil |

- `TestSpecValidate` 加：第一级补审被拒绝；补审后接普通级被拒绝；合法顺序通过；`ParseSpec` 接受 `fallback`。
- `TestCombineTraces` 改期望：命中 → 出错 → 推翻 → 最后一块。
- 新增 `TestRecordResultOfTrace`：对 `fillFromTrace` 断言 3.1 第 6 条的四种映射，外加 pre 命中 → block。
- `hook_test.go` `TestTwoStageFlowCacheAndFailOpen`：现有"复核出错 → 放行"的断言改为"命中并拒绝"；保留"所有级出错 → 放行，记 error"。
- `stats_api_test.go` `TestStatsAPIs` 加：一次"初审命中、复核失败"的运行，流程行 `hit=1` 且 `errors=1`。

界面（vitest，新增 `flowOps.spec.ts`）：`setFallback` 的移动规则；`validateSpec` 报 `fallback_first`、`fallback_order`；`addStage` 不会插到补审级后面；`canonicalSpec` 不输出 `fallback: false`。

---

## 4. 功能 2：题表式 LLM 审核器

### 4.1 N 的行为

N 的 `llm` 审核器（`N:engine_llm.go`）：

- 配置是一张题表，结构与 Jev 的相同（`JevQuestions`：`preamble` 加若干行 `category / label / question / answer_yes / answer_no / threshold`）。阈值不参与判定。没有图片开关（`N:auditor.go:215-225`）。
- **一次流式调用**，只提供工具 `submit_verdict`，`tool_choice` 是 auto，不重试、不多轮（`N:engine_llm.go:62-68`）。`max_tokens` 4096。**请求体里没有 `temperature`**（`N:llm_client.go` 三个 body 函数都不写）。
- 工具的参数：每题一个必填布尔 `q1…qN`，加一个必填字符串 `reason`（`N:engine_llm.go:107-122`）。用题号而不是类别码，是因为类别码可以含 `/`，Anthropic 不接受。
- 系统提示词：`preamble`、固定的审核员说明、逐题一行"`- q1（类别）：问题（「是」的标准：…）（「否」的标准：…）`"（`N:engine_llm.go:82-100`）。
- 用户消息（`N:engine_llm.go:49-61`）：
  - 有 `prior` 时先写一行：`初审命中：<标签或类别> 0.97；…（仅供参考，以你的判断为准）`；
  - 然后：`待审文本在两行 <边界> 之间：\n<边界>\n<文本>\n<边界>\n逐题判断后调用 submit_verdict 提交结论。`
  - 边界每次调用随机生成：`=====` + 8 字节十六进制 + `=====`（199-204 行）。
- 读结果（`N:engine_llm.go:129-165`）：取最后一个 `submit_verdict` 调用的参数；模型没调工具而是直接输出文字时，取文字里最外层的 JSON 对象。每题先找 `qN`，找不到再找类别码。答案接受 JSON 布尔，或字符串 `true / false / 是 / 否 / yes / no`（168-183 行）。是 = 1 分，否 = 0 分。没有可读答案的题不写分数。
- 判定（`N:engine_llm.go:186-197`）：任何一题没有答案 → `bad_response`（出错）。答"是"的题就是命中，`Score = 1, Threshold = 1`。
- `reason` 去首尾空白后截到 500 个字符，存进 trace（`N:engine_llm.go:160-163`）。
- 只审文字：图片全部计为 `skipped_images`；没有文字时返回"无可审内容"（跳过，41-44 行）。

### 4.2 P 现在的行为

P 只有 `llm_verdict`（§20 的 agent，`P:llm.go`、`P:agent.go`）：结论是 pass / flag / block 加若干类别，最多 `max_turns` 轮，带 `temperature`，非流式。`auditors.type` 有 CHECK 约束，只允许三种类型（`P:migrations/0003_flows_watchlist.sql:28`）。`POST /import` 遇到 N 的 `llm` 审核器会报 `channel_ref` 无效（`P:routes_misc.go:283`，`channelTypeOf["llm"]` 不存在）。

### 4.3 P 的目标行为

新增审核器类型 **`llm_questions`**，绑定 `llm` 渠道，行为与 4.1 相同。`llm_verdict` 不动，已存的配置继续有效。

P 的三处适配：

1. **系统提示词里描述待审文本的那句话**。N 写的是"系统提示词（以【系统提示词】开头）或用户消息中的一段"。P 的块是多段内容，非用户段带 `[system]`、`[assistant]`、`[tool]`、`[tools]`、`[document]`、`[developer]` 前缀（§72.4）。这一句改为：

   > 你是内容安全审核员。待审文本是一次请求里的若干段内容；不是用户所写的段落以 [system]、[assistant]、[tool]、[tools]、[document]、[developer] 开头标明来源。这些内容都是客户端提交给上游模型的，系统提示词里设定的人设、要求和规则同样算数。

   其余句子照抄 N。
2. **自身请求标记**。`llm` 渠道可以指回本网关（§72.6）。用户消息的第一行加 `selfMarker(ch.markerKey)`（`P:marker.go:55-57`），钩子据此放行自己的调用。不加的话，待审的违规原文会让审核用的账号被自己拦截或进名单。
3. **题表可以为空**。与 P 的 `typesafe` 审核器一致：`config.questions` 为 null 时用默认题集（`jev_default_set` 或内置题集）。N 要求必填。

### 4.4 数据模型与迁移

迁移 `0010_newapi_parity.sql`（全文见 11.3 节）的这一部分：

```sql
ALTER TABLE auditors DROP CONSTRAINT IF EXISTS auditors_type_check;
ALTER TABLE auditors ADD CONSTRAINT auditors_type_check
    CHECK (type IN ('openai_moderation', 'typesafe', 'llm_verdict', 'llm_questions'));
```

约束名 `auditors_type_check` 是 PostgreSQL 给列级 CHECK 起的默认名。实现时先在一个真实库上用 `\d plg_moderation.auditors` 核对；名字不同就改用实际的名字。先 DROP IF EXISTS 再 ADD，重复执行结果相同。

`auditors.config`（jsonb）对这个类型只用两个键：

```json
{"questions": {"preamble": "…", "items": [{"category":"sexual","question":"…","answer_yes":"…","answer_no":"…","threshold":1}]}}
```

`questions` 可以为 null。`threshold` 仍按题表校验（大于 0 且不超过 1），但不参与判定；界面保存时写 1。

### 4.5 Go 改动

**`engine.go`**

```go
const AuditorLLMQuestions = "llm_questions"
// channelTypeOf 加：AuditorLLMQuestions: ChannelLLM
```

`compileAuditor` 加一个分支：

- `cfg.Thresholds` 非空 → 错误 `an LLM question auditor keeps no thresholds`；`cfg.ReviewImages != nil` → 错误 `an LLM question auditor has no image switch`。
- 题表为 null 用 `defaultSet`，校验 `Validate()`，算 `RulesVersion`。
- `a.order` = 各题类别；`a.thresholds[c] = 1`；`a.labels` 照 typesafe；`a.images = false`。
- 判定走现有的通用 `judge`（`P:engine.go:279-296`）：它已经要求每个类别都有分数，再与阈值 1 比较，结果与 N 的 `judgeVerdict` 相同。

`audit` 的 switch 加：

```go
case AuditorLLMQuestions:
    out.EngineResult, out.Err = llmQuestionsAudit(cctx, ch, a.questions, in, prior)
```

**新文件 `engine_llmq.go`**

```go
const (
    llmqMaxTokens  = 4096
    llmqTool       = "submit_verdict"
    llmReasonRunes = 500
)

var errLLMNoVerdict = errors.New("llm auditor did not submit a verdict")

func llmQuestionsAudit(ctx context.Context, ch *liveChannel, qs *JevQuestions, in *Input, prior []HitCategory) (EngineResult, error)
func llmqSystem(qs *JevQuestions) string
func llmqKey(i int) string                         // "q1", "q2", …
func llmqToolDef(qs *JevQuestions) LLMTool
func llmqVerdict(t llmTurn, qs *JevQuestions) (scores map[string]float64, reason string, err error)
func llmYesNo(v gjson.Result) (yes, ok bool)
func llmBoundary() string
```

`llmQuestionsAudit` 的步骤：

1. `res := EngineResult{RulesVersion: qs.RulesVersion, SkippedImages: len(in.Images)}`；`in.Text == ""` → `ErrNoInput`。
2. 拼用户消息：自身请求标记一行、`prior` 一行（有的话）、边界与文本。
3. `protocolOf(ch).call(ctx, ch, llmRequest{System: llmqSystem(qs), Messages: []any{llmUserMessage(user)}, Tools: []LLMTool{llmqToolDef(qs)}, MaxTokens: llmqMaxTokens, Stream: true})`。`Temperature` 留 nil，`ToolChoice` 留空（auto）。流式调用自动带首字超时（`P:llmproto.go:182-186`）。
4. `res.Calls = 1`；`res.Usage = engineUsage(turn.Usage)`；`res.Model` 为空时用 `ch.Model`。出错时返回 `ctxErr(ctx, err)`。
5. `res.Scores, res.Reason, err = llmqVerdict(turn, qs)`。

**`routes_config.go`** `validateAuditor`：类型枚举的错误文字加上 `llm_questions`。

**`routes_misc.go`** `importConfig`：审核器 `type == "llm"` 映射为 `AuditorLLMQuestions`，带上 `questions`；带 `review_images` 或 `thresholds` 时由 `compileAuditor` 报错。渠道的 `type: "llm"` 两边同名，不用映射。

### 4.6 界面

- `types.ts`：`AuditorType` 加 `'llm_questions'`。
- `flowOps.ts`：`AUDITOR_TYPES` 加上；`DEFAULT_CHANNEL_TIMEOUT_MS.llm_questions = 15000`。
- `AuditorEditModal.vue`：
  - `CHANNEL_TYPE.llm_questions = 'llm'`；类型选项加"LLM 题表"。
  - 选这个类型时显示题表部分，复用 `JevQuestionsEditor.vue`："使用默认题集 / 自定义"的切换、"填充默认"都照 typesafe；不显示图片开关。
  - 说明文字："只审文字。模型对每道题回答是或否，答「是」即命中；阈值不使用。一次调用，不带 temperature。"
  - `config()`：`{ questions: form.ownQuestions ? jevPayload(form.questions) : null }`，每行 `threshold` 写 1。
- `JevQuestionsEditor.vue`：加 prop `hideThreshold`，为真时不显示阈值列。
- `AuditorsTab.vue`：列表摘要行对 `llm_questions` 显示题集版本和题数（与 typesafe 那一行相同的写法）。
- `TraceView.vue` 已经显示 `row.reason`，不用改。
- `messages.ts`：`auditorType.llm_questions`（"LLM 题表" / "LLM questions"）和上面的说明文字。

### 4.7 升级、回滚、混跑

- 已存的三种审核器不受影响。
- 新建了 `llm_questions` 审核器之后：0.7.2 的节点编译它时报 `unknown auditor type`，跳过（`P:snapshot.go:250-254`）；引用它的流程在这些节点上，那一级按"审核器不存在"出错，0.7.2 的流程因此放行。所以滚动升级期间不要创建这类审核器；回滚前把流程里的换掉。
- 回滚后迁移留下的约束允许四种类型，对 0.7.2 没有影响。

### 4.8 测试

新增 `engine_llmq_test.go`，用 `httptest` 假上游：

| 测试 | 断言 |
|---|---|
| `TestLLMQuestionsRequest` | 三种协议各一次：请求体没有 `temperature`；`stream` 为真；工具名 `submit_verdict`，参数是 `q1…qN` 布尔加 `reason`，全部必填；`max_tokens` 类字段为 4096；系统提示词含 preamble 和逐题行 |
| `TestLLMQuestionsBoundary` | 用户消息里文本被同一个边界包住两次；两次调用的边界不同；文本里自带旧边界串不影响解析 |
| `TestLLMQuestionsPriorHint` | 有 prior 时消息含"初审命中：<标签> 0.97"，且在边界之外；prior 为 nil 时没有这一行 |
| `TestLLMQuestionsSelfMarker` | 用户消息通过 `snapshot.isSelf` |
| `TestLLMQuestionsVerdict` | 表驱动：工具调用；文字里的 JSON；`是 / 否 / yes / no` 字符串；按类别码作键；缺一题 → `bad_response`；没有任何结论 → `errLLMNoVerdict`（`bad_response`）；reason 超过 500 字被截断，非字符串时为空 |
| `TestLLMQuestionsTextOnly` | 只有图片的输入 → 跳过；有文字加图片 → `skipped_images` 等于图片数 |

- `unit_test.go` `TestAuditorJudge` 加：`llm_questions` 一题为 1 → 命中，`Score = 1, Threshold = 1`。
- `hook_test.go` `TestCleanupAndImport` 加：导入含 N `llm` 审核器的文档，预览和实际导入都成功，库里的类型是 `llm_questions`；带 `review_images` 时返回字段错误。
- `hook_test.go` `TestConfigValidation` 加：创建 `llm_questions` 审核器绑到非 `llm` 渠道被拒绝。
- 迁移测试：对一个 0.7.2 的库执行 `0010` 两次都成功，之后能插入 `llm_questions`。

---

## 5. 功能 3：判定缓存

### 5.1 N 的行为

设计见 `N:docs/content-moderation/message-verdict-cache.md`，代码在 `N:verdict_cache.go`、`N:gate.go`。

- **键**：`sha256(类型前缀 + 块内容)`，只按内容，不区分流程、分组（文档第 2 节："不加流程盐"）。改了流程或阈值后靠管理员清空。
- **值**（`N:verdict_cache.go:76-104`）：放行存 `p`；命中存 `h` 加 `storedHit{RequestID, Trace}`。
- **查**（`N:gate.go:231-270`）：一个请求的所有块一次查完。按请求顺序第一个缓存为命中的块决定请求（重放），其余块这次不审。缓存出错时全部按未知处理，照常审。
- **写**（`N:gate.go:299-322`），每个块按自己那次运行：

  | 该块的运行 | 写入 |
  |---|---|
  | 是 URL 图片，或 `Errored`（不论最终结果） | 不写 |
  | `Final == Hit` | 命中，带 trace |
  | 通过（含被推翻），且没有任何一级整级跳过 | 放行 |
  | 通过，但有整级跳过 | 不写 |

  出错的命中不写，是因为那个命中可能只是复核失败后沿用的初审结果，下次应当重审。
- **重放**（`N:gate.go:346-363`）：不调用上游；把存下的 trace 当作这次请求的 trace，`latency_ms = 0`，`trace.cache = {hit: true, source_request_id, block, hits: 1}`；照常写记录；pre 的请求被拒绝，post 的记为 hit。
- **重放不是新的违规**：
  - `onSuspicious` 对重放直接返回（`N:escalate.go:84-87`）：不进观察名单、不延期、不计违规、不触发 AI 分析。
  - `conclude` 不调 `stats.User`（`N:gate.go:393-395`）：用户日计数不变。
  - 流程行除 `hit`（pre 还有 `blocked`）外另计 `replayed`（`N:stats.go:307-309`）；pre 的请求行计一次请求和一次拒绝，不记耗时（`N:gate.go:353-355`）。
  - AI 分析工具返回的记录带 `replayed`，工具说明写明它不是新的违规（`N:analysis_tools.go:38-50`、`366-393`）。
- **TTL**：`verdict_cache_days`，1–30，默认 7（`N:config.go:89`、`168`、`201`）。写入时定，不续期。
- **清空**：`POST /verdict-cache/clear`（`N:controller/content_moderation.go:270-279`）。
- **人工处理同步缓存**（`N:verdict_cache.go:123-164`，由 `ReviewModerationRecords` 调用，`N:controller/content_moderation.go:2126`）。对被处理记录的判定块：

  | 处理结果 | 缓存 |
  |---|---|
  | 误报 | 写放行 |
  | 确认 | 重新写命中（用记录的 trace 重建；可以盖掉之前误报写下的放行） |
  | 改回待处理 | 删除这个键，下次重新审 |

  没有判定块信息的记录（缓存功能之前写的）跳过。

### 5.2 P 现在的行为

- 只缓存干净通过的片段（`P:cache.go:12-18`、`P:hook.go:426-451`）。
- 键是 `config_version:flow_id:flow_version:片段哈希`（`P:cache.go:88-90`）。任何配置写入都让 `config_version` 加一，于是整个缓存失效。
- 存储：本节点内存 LRU 加宿主 KV（命名空间 `pass`，值是一个字节）。TTL 是 `cache_ttl_seconds`（0–604800，默认 86400，0 表示不缓存）。
- 有任何审核器跳过的运行不写缓存（`P:hook.go:437`，`anySkipped()`）。
- 没有清空接口；人工处理不碰缓存。

### 5.3 P 的目标行为

#### 5.3.1 命中怎样落到片段上

P 的一次运行审的是一个块，块里有多个片段。块命中时不知道是哪个片段造成的，所以不能把块里每个片段都单独记成"命中"：Claude Code 的系统提示词片段如果和一条违规消息装在同一块，就会让所有带这段系统提示词的请求被重放拦截。

做法：**命中记在"这一块包含的片段集合"上**。

- 一个命中条目记录：这一块的片段哈希集合 K、这次运行的 trace、来源请求。
- **重放条件**：之后某个请求的片段集合包含 K 的全部成员（K ⊆ 请求的片段），就重放这个命中。

依据：当初被判命中的内容就是 K 这些片段拼成的文本；一个请求只要含有 K 的全部片段，就含有那份内容。真实的多轮对话里，违规的那条消息和它旁边的片段会原样出现在后面每一轮的历史里，所以每一轮都会重放。只含 K 的一部分（例如只有那段系统提示词）的请求不重放，这些片段按"未知"重新送审。

#### 5.3.2 键的范围（决定）

**P 不采用 N 的"只按内容"，键里保留流程，并带流程的判定指纹和清空纪元：**

```
范围 scope = e{cache_epoch}:{flow_id}:{fp}
```

- `flow_id` 必须保留。P 的一个请求换账号后可能改用另一个流程重审（§72.17："是另一个流程才再审一次；片段放行缓存照常命中"）。键里没有流程的话，第二个流程会发现所有片段都已"放行"，账号绑定的流程形同虚设。不同分组绑定宽严不同的流程也是同理。
- `fp`（判定指纹，16 位十六进制）取代现在的 `config_version` 和 `flow_version`。它只由"会改变这个流程判定结果的配置"算出（见下）。这样改了与该流程无关的配置（别的流程、绑定、渠道的超时或密钥、流程的模型过滤或抽样比例）不再清空它的缓存；改了它的审核器、题集、阈值、渠道模型或级结构则自动失效，不用像 N 那样靠人清空。N 的缓存最长保留 30 天，靠人清空容易忘，旧命中会一直拦截。
- `cache_epoch` 是"清空"用的计数器，存在 `config_state`。清空就是把它加一，旧键不再被读到，等 TTL 自然过期。

`fp` 的输入（`loadSnapshot` 里对每个流程算一次，`sha256` 后取前 8 字节）：

- 每一级：`combine`、`n`、`fallback`、审核器 id 列表（按 spec 顺序）。
- 每个被引用的审核器：id、类型、`channel_id`、`config` 的原始 JSON 文本（库里读出的 jsonb 文本，各节点一致）；审核器不存在时写 `missing`。
- 该审核器的渠道：类型、协议、`base_url`、`model`；渠道不可用时写 `-`。
- `typesafe` 或 `llm_questions` 审核器没有自己的题表时：当前默认题集的 JSON（`preamble` 和各行，含阈值）。

不进指纹的：流程名、`model_filter`、`sample_rate`、`total_timeout_ms`、渠道的名称、密钥、代理、超时、计费模型。

#### 5.3.3 存储

仍然是内存 LRU 加宿主 KV。KV 换用新的命名空间 **`verdict`**；旧命名空间 `pass` 不再读写，里面的键到期自动消失。

| 键 | 值 | 说明 |
|---|---|---|
| `s:{scope}:{片段哈希 hex}` | `p` | 这个片段干净通过 |
| | `h{命中 id hex}` | 这个片段属于一个命中集合，指向命中条目 |
| `h:{scope}:{命中 id hex}` | `storedHit` 的 JSON | 命中条目 |

命中 id = `sha256(K 的片段哈希按字节序排序后拼接)`。

```go
// storedHit is a cached hit of one chunk: the segments it held, the run that
// decided it and the request it came from.
type storedHit struct {
    RequestID string   `json:"r"`
    Keys      []string `json:"k"` // 片段哈希 hex，按请求顺序
    Trace     Trace    `json:"t"` // 这一块自己的运行；Chunk、Chunks、Input、Cache、InputMessageDropped 清空
    At        int64    `json:"at"`
}
```

- 一个片段键只有一个值，后写覆盖。一个片段先后属于两个命中集合时，指针指向后一个；前一个集合仍能通过它其他成员的指针找到。指针丢失的后果只是少一次重放、多审一次。
- KV 的值上限是 64 KiB。`storedHit` 序列化后超过 60 KiB 就不存这个命中（照常写记录）。
- TTL：`verdict_cache_days` 天，写入时定，不续期。内存里的条目用同一个到期时间。
- 内存 LRU 的值从"存在与否"改为字节串（`p`、`h…` 或命中条目的 JSON），容量仍是 `cache_entries`。

#### 5.3.4 查

`admit` 里取代 `cachedSegments` 的调用（`P:hook.go:217`）。对请求的全部片段：

1. 取每个片段键的值：先内存；pre 时未命中的再查 KV（沿用现在的上限：最多 64 个、8 路并发、总共 200 ms，`P:cache.go:25-29`）。
2. 值为 `h…` 的片段：取对应的命中条目（内存，没有再查 KV，计入同一个 200 ms）。条目存在、且它的 `Keys` 全部在本请求的片段集合里 → 这是一个可重放的命中。按请求顺序取第一个。
3. 有可重放的命中 → 走重放（5.3.6），不再分块。
4. 没有 → 值为 `p` 的片段算已放行，其余（包括指针失效、集合不完整的）送审。之后与现在相同：`makePlan`，全部已放行则计 `cache_skipped`。

KV 出错或超时：相关片段按未知处理，照常送审，`kv_errors` 加一。

post 的请求在 `admit` 里只看内存（与现在相同，`useKV = false`）；出队执行前（`runPost`，取代 `allCached`）再带 KV 查一次：可重放 → 重放；全部已放行 → 计 `cache_skipped`；否则按入队时的分块运行。

试跑、测试、模拟不读也不写缓存（与现在相同，这些路径的 `m.plan` 为 nil）。

#### 5.3.5 写

`finish` 里取代 `cachePasses`。对这次请求的每个块，按它自己那次运行：

| 该块的运行 | 写入 |
|---|---|
| 块里有 URL 图片，或 `Errored` | 不写 |
| `Final == Hit` | 写命中条目，并把块里每个片段的键写成指向它的指针 |
| 通过（含被推翻），且没有任何一级整级跳过（`stageSkipped()`） | 这个块给它的每个片段记一次"通过" |
| 其他 | 不写 |

片段写 `p` 的条件不变：包含它的每一块（含抽样没跑的块，`plan.pieces`）都记了"通过"（`P:hook.go:444-449`）。

与现在的差别：
- 命中会写入。
- "有审核器跳过"从"任何一个审核器跳过"（`anySkipped`）放宽为"有一整级跳过"（`stageSkipped`），照 N。例：一级里 Jev 判了、只读文字的 LLM 因为块里只有图片而跳过，这一级算判过。

写入时机：内存立即写；KV 在后台协程里写（与现在相同，钩子不等 KV）。N 是同步写。差别只在别的节点可能晚几十毫秒看到（第 10 节第 6 条）。

记录的 trace 上，判定块为命中且不含 URL 图片时写：

```json
"cache": {"key": "<命中 id hex>", "segs": ["<片段哈希 hex>", …], "fp": "<指纹>"}
```

即使这次因为 `Errored` 没写缓存也写这段，供"确认"时重建（与 N 相同：N 的 `settleBlocks` 总是写 `cache.block`）。

#### 5.3.6 重放

```go
func (p *Plugin) replay(m *moderation, req *request, hit *storedHit, hitID string) *pluginv1.GatewayRequestHookResponse
```

- 不调用上游，不占并发名额，不进 singleflight。
- 记录：
  - `trace` = 存下的 trace，加 `cache = {hit: true, source_request_id, key, segs, fp}`，`latency_ms = 0`；`input = {segments: 本请求片段数}`。
  - `result`：pre 为 `block`，post 为 `hit`；类别、最高分、严重度从 trace 得出（与普通记录同一个 `fillFromTrace`）。
  - `flow_id`、`flow_version`：当前流程（指纹相同，判定等价）。
  - `text`（`store_text` 开）：K 的各片段文字，按请求顺序换行拼接；`input_message`：这些片段渲染成的 chat 消息（用一个只含 K 的临时块调 `chunk.messages()`）。
  - 新列 `replayed = true`。
  - 留存期按命中类。
- 统计（新函数 `countReplay`）：流程行 `audited`、`hit`、`replayed` 各加一，pre 再加 `blocked`，不记耗时；pre 的请求行 `audited` 和 `blocked` 各加一，不记耗时。不计级行、审核器行、费用。**不调 `countUser`**。
- 写入后（`afterWrite`）：`replayed` 的记录不更新观察名单、不计违规、不触发分析、**不计入自动封禁**。封禁是 P 独有的功能，N 没有对应规定；按"重放不是新的违规"同样排除（`countViolations` 加条件 `AND NOT replayed`）。
- pre：返回拒绝（`block_status`、`moderation_blocked`、`block_message`），note 在普通格式后加 ` replay`，例如 `moderation: hit flow=3 v5 [sexual] 0.97 replay`。post：返回放行，note `moderation: hit (replay)`。
- 写记录失败时与普通可疑记录一样进后台重试（`storeSuspicious`）。

#### 5.3.7 清空

`POST /verdict-cache/clear`（权限 `moderation:manage`）：

1. 一个事务里：`UPDATE config_state SET cache_epoch = cache_epoch + 1, config_version = config_version + 1 WHERE id = 1 RETURNING cache_epoch`。
2. 本节点换一个空的内存 LRU，调 `configChanged`（重新加载快照，读到新的 `cache_epoch`，并广播 `config.changed`）。
3. 返回 `{"epoch": <新值>}`。

`config_version` 一起加一，是为了复用现有的"广播加每 5 秒轮询版本号"来传播，不用新增轮询。新键不含 `config_version`，所以这不会产生别的影响。KV 里的旧键不逐个删除（一次清空可能有几十万个键，逐个走 gRPC 太慢），等 TTL 过期。

#### 5.3.8 人工处理同步缓存

`POST /events/review` 成功后，对本次处理的、`trace.cache.key` 非空的可疑记录执行（新函数 `syncReviewed`）。范围用记录的 `flow_id` 在**当前快照**里的流程算；该流程现在不存在或已停用 → 跳过这条记录。

| 处理结果 | 动作 |
|---|---|
| 误报 | 删除命中条目；把 `segs` 里每个片段的键写成 `p` |
| 确认 | 仅当记录的 `fp` 等于流程当前的指纹：用记录的 trace 重建命中条目（来源请求取 `cache.source_request_id`，没有则取记录自己的 `request_id`；去掉 `cache`、`chunks`、`input`、`input_message_dropped`），并把每个片段的键写成指针 |
| 待处理 | 删除命中条目和 `segs` 里每个片段的键 |

- 误报时把每个片段都写成放行：管理员认定这些片段合起来没问题，那么其中每一个单独出现也没问题。
- "确认"要求指纹相同：配置变了之后，不能把旧配置下的命中写成新配置的结论。指纹不同的记录跳过。
- 写 KV 是同步的，总共最多 1 秒；失败只计 `kv_errors`，不影响处理结果。
- 其他节点的内存里可能还留着旧值：处理后广播新主题 `verdict.changed`，负载是 `{"keys": [...]}`（受影响的片段键和命中键，每条消息不超过 64 KiB，多了分几条发），收到的节点从内存里删掉这些键，下次读就落到 KV。广播是尽力而为的；漏收的节点上旧值最多保留到该条目到期，管理员可以清空缓存来兜底。写进界面的提示。
- 响应加 `cache_synced`：同步了缓存的记录数。

#### 5.3.9 如实写明的限制

1. **重放不分用户**（与 N 相同）。A 用户的违规内容进了缓存后，B 用户第一次发同样的内容也是重放：会被记录，pre 时会被拒绝，但不进名单、不计违规。广为流传的越狱提示词在缓存期内不会让后来的用户进名单。见未决问题 Q7。
2. 重放只对"包含整个命中集合"的请求生效。客户端改动集合里任何一个片段（哪怕一个字），就不重放，这段内容会重新送审，结果由审核器决定。
3. 清空和人工处理的同步在多节点下有短暂延迟（清空最多 5 秒；人工处理依赖广播）。

### 5.4 数据模型与迁移

```sql
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS cache_epoch bigint NOT NULL DEFAULT 0;
ALTER TABLE events       ADD COLUMN IF NOT EXISTS replayed    boolean NOT NULL DEFAULT false;
ALTER TABLE stats_hourly ADD COLUMN IF NOT EXISTS replayed    bigint  NOT NULL DEFAULT 0;
```

三列都带常量默认值，PostgreSQL 11 及以上不重写表，`events` 上只短暂持锁。不加索引：`replayed` 只和别的条件一起过滤。

### 5.5 设置

| 键 | 类型 | 默认 | 范围 | 说明 |
|---|---|---|---|---|
| `verdict_cache_days` | integer | 7 | 1–30 | 判定缓存保留天数（新增） |
| `cache_ttl_seconds` | integer | 86400 | 0–604800 | 旧键，保留在 schema 里并隐藏（`ui:widget: hidden`），只用于升级 |
| `cache_entries` | integer | 100000 | 1000–1000000 | 不变 |

`DecodeSettings` 的取值规则：

- 文档里有 `verdict_cache_days` → 用它。
- 没有，但有 `cache_ttl_seconds` → 值为 0 时缓存关闭（保留这个旧行为，直到保存了新键）；否则天数 = `clamp(ceil(秒 / 86400), 1, 30)`。
- 两个都没有 → 7 天。

`settings.schema.json` 加：

```json
"verdict_cache_days": {"type": "integer", "default": 7, "minimum": 1, "maximum": 30}
```

`settings.ui.json`：`ui:order` 里用 `verdict_cache_days` 取代 `cache_ttl_seconds` 的位置（"性能与缓存"组）；`cache_ttl_seconds` 改为隐藏并移到旧字段那一段。新键的文案：

- 标题：判定缓存天数 / Verdict cache
- 说明：同一流程下已经审过的内容，结论保留这么多天：放行的不再送审，命中的直接按原结论处理（先审的请求被拒绝），不再调用审核渠道。
- 详情：出错的运行、整级被跳过的放行、URL 图片不缓存。修改流程的级、审核器、题集、阈值或渠道模型后，该流程的缓存自动失效。缓存命中的重放照常写记录，但不算新的违规。
- 单位：天。

### 5.6 接口

| 方法 路径 | 权限 | 变化 |
|---|---|---|
| `POST /verdict-cache/clear` | manage | 新增。无请求体。返回 `{"epoch": 3}` |
| `POST /events/review` | manage | 响应加 `cache_synced` |
| `GET /events` | read | 每行加 `replayed`；新过滤参数 `replayed=true\|false` |
| `GET /events/:id` | read | `replayed`；`trace.cache` 原样返回 |
| `GET /status` | read | `today.replayed`（已包含在 `today.suspicious` 里）；`runtime.cache_epoch` |
| `GET /stats/trend` | read | `flows[].points[].replayed`（已包含在 `hit` 里） |
| AI 分析工具 `list_suspicious_records`、`get_record` | — | 记录加 `replayed`；三个工具的说明加 N 的那句话（`N:analysis_tools.go:38-50`） |

`manifest.json` `routes` 加一项：

```json
{"method": "POST", "path": "/verdict-cache/clear", "scope": "admin", "permission": "moderation:manage"}
```

### 5.7 Go 改动

**`cache.go`**（重写大半）

```go
const kvNamespace = "verdict"

func (c *lru) get(key string, now time.Time) ([]byte, bool)
func (c *lru) put(key string, val []byte, expires time.Time)
func (c *lru) del(key string)

func (s *snapshot) scopeOf(f *liveFlow) string             // "e3:7:9f2c…"
func segKeyOf(scope string, h [32]byte) string             // "s:" + scope + ":" + hex
func hitKeyOf(scope, id string) string                     // "h:" + scope + ":" + id
func hitID(keys [][32]byte) string

// verdicts is what the cache knows about a request's segments.
type verdicts struct {
    passed map[[32]byte]bool
    hit    *storedHit // a cached hit whose segments are all in the request
    hitID  string
}

func (p *Plugin) lookupVerdicts(s *snapshot, f *liveFlow, keys [][32]byte, useKV bool) verdicts
func (p *Plugin) storeVerdicts(c *config, s *snapshot, f *liveFlow, passes [][32]byte, hits []storedHit)
func (p *Plugin) clearVerdictCache(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error)
func (p *Plugin) syncReviewed(ctx context.Context, ids []int64, status string) int
func (p *Plugin) onVerdictChanged(ctx context.Context, b pluginsdk.Broadcast) error
```

删除 `segKey`、`cachedSegments`、`putSegments`。

**`snapshot.go`**：`snapshot` 加 `cacheEpoch int64`（和 `config_version` 同一条查询读出）；`liveFlow` 加 `fp string`；`loadSnapshot` 在审核器和流程都读完后算指纹（审核器的 `config` 原文要留到这一步）；新主题常量 `TopicVerdictChanged = "verdict.changed"`。

**`hook.go`**
- `moderation` 结构加 `req *request`（重放要用片段），post 入队时只保留片段的哈希（`m.plan.keys` 已有），不保留 `req`。
- `admit`：`cachedSegments` 换成 `lookupVerdicts`；有可重放的命中时返回 `p.replay(...)`。
- `runKey`：改用 `scopeOf` 拼键。
- `runPost`：`allCached` 换成一次带 KV 的 `lookupVerdicts(m.snap, m.flow, m.plan.keys, true)`。重放需要片段文字：post 任务在入队时已经复制了各块的文字，但 K 里可能有当时已放行、没进块的片段；这时记录的 `text` 和 `input_message` 只含块里有的那部分，trace 里的 `segs` 仍是完整的。
- `cachePasses` 改名 `settleVerdicts`，按 5.3.5。
- `finish`：先给 trace 填 `cache`，再 `fillFromTrace`。

**`store.go`**：`eventRec` 加 `Replayed bool`；`writeEvents` 的 INSERT 加这一列；`afterWrite` 跳过 `e.Replayed`；`countViolations` 加 `AND NOT replayed`。

**`flow.go`**：`Trace` 加 `Cache *CacheInfo json:"cache,omitempty"`：

```go
type CacheInfo struct {
    Hit             bool     `json:"hit,omitempty"`
    SourceRequestID string   `json:"source_request_id,omitempty"`
    Key             string   `json:"key,omitempty"`
    Segs            []string `json:"segs,omitempty"`
    FP              string   `json:"fp,omitempty"`
}
```

**`stats.go`**：`counters` 加 `replayed`（`merge`、`writeStats` 的 INSERT 和 ON CONFLICT 都带上）；新增 `countReplay(m *moderation)`。
**`stats_api.go`**：`loadStats` 读这一列；`TodayCounts.Replayed`、`FlowPoint.Replayed`。
**`routes.go`**：注册路由；`Event` 加 `replayed`，`eventColumns` 加列；`eventFilter` 加 `replayed`；`reviewEvents` 末尾调 `syncReviewed`；`Runtime` 加 `CacheEpoch`。
**`plugin.go`**：`OnTopic(TopicVerdictChanged, p.onVerdictChanged)`；`Configure` 里缓存容量变化时照旧重建 LRU。
**`settings.go`**：`VerdictCacheDays`，`cacheTTL` 按 5.5 的规则算。
**`analysis_tools.go`**：`toolRecord.Replayed`（取自 `events.replayed`）；工具说明。

### 5.8 界面

- `host.ts`：`clearVerdictCache()`；`types.ts`：`Trace.cache`、`Event.replayed`、`Status.today.replayed`、`FlowPoint.replayed`。
- `SettingsTab.vue`：`verdict_cache_days` 一行；它下面一个按钮"清空判定缓存"（只对 `moderation:manage` 显示；点击后确认："清空后所有内容会按当前配置重新审核，一段时间内审核调用和费用会上升。"；成功后提示"已清空"）。不再显示 `cache_ttl_seconds`。
- `EventsTab.vue`：结果徽标旁对 `replayed` 的记录显示"重放"小徽标；筛选里加"缓存重放：全部 / 只看重放 / 不含重放"。
- `EventDetail.vue`、`TraceView.vue`：`trace.cache.hit` 时在 trace 顶部显示"缓存重放：沿用请求 <id> 的审核结果，本次没有调用审核渠道。重放不计为新的违规。"请求 id 可点击，按 `request_id` 筛选记录。
- `ReviewActions.vue` / `useBulkReview.ts`：处理成功的提示里，`cache_synced > 0` 时加"已同步判定缓存 N 条"。
- `overview/`：今日"可疑"的数字下加一行"其中缓存重放 N"（N 大于 0 时）；`TrendCard.vue` 的提示框里加"重放"。
- `messages.ts`：上述文案。

### 5.9 升级、回滚、混跑

- 升级后旧缓存（命名空间 `pass`、内存）全部作废，**所有内容重新审一遍**：升级后的第一天审核调用量和费用会明显上升（Claude Code 的系统提示词和工具定义要重审）。写进发布说明。
- 混跑：新旧节点各用各的命名空间，互不读取；同一内容可能两边各审一次。旧节点不写 `replayed` 列，取默认值。新节点清空缓存时 `config_version` 加一，旧节点的缓存也随之失效（旧键里有 `config_version`）。
- 回滚：0.7.2 读不到 `verdict` 命名空间，从空缓存开始；新增的三列被忽略；`replayed` 的记录在 0.7.2 的封禁计数里会被算上（0.7.2 的 `countViolations` 没有这个条件）。回滚后如果开着自动封禁（`ban_threshold > 0`），先看一下有没有用户因此接近阈值。线上现在 `ban_threshold` 为默认值 0（关闭）时没有影响；实现任务里核对线上的实际值。

### 5.10 测试

新增 `verdict_cache_test.go`（用 `pluginsdktest.FakeHost` 的 KV）：

| 测试 | 断言 |
|---|---|
| `TestVerdictCacheStoresHitAndReplays` | pre：一次命中后原样重发 → 上游调用数不变；第二次被拒绝；第二条记录 `replayed = true`、`trace.cache.hit`、`source_request_id` 是第一次的请求、`latency_ms = 0`、`result = block` |
| `TestReplayNeedsWholeHitSet` | 命中块含片段 {S1, S4}；只含 S1 的请求不重放，S1 重新送审；含 S1、S4 和新片段 S6 的请求重放 |
| `TestReplayIsNotAViolation` | 重放后：`watchlist` 的 `hit_count`、`violation_count`、`expires_at` 不变；`user_daily` 不变；流程行 `hit`、`replayed` 各加一；开着封禁时 `countViolations` 不增加；不在名单上的用户重放后仍不在名单上 |
| `TestReplayPostTiming` | post 的用户：记录 `result = hit`、`replayed`，请求放行，上游没被调用 |
| `TestVerdictCacheSkipsErrorsSkippedStagesURLImages` | 出错的命中不写；有整级跳过的放行不写；含 URL 图片的块不写；一级里个别审核器跳过、其他判了的放行**会**写 |
| `TestVerdictCacheScope` | 同一内容在流程 A 命中后，绑定流程 B 的分组不重放、照常送审；改审核器阈值后指纹变化、不重放；只改流程的 `sample_rate` 或渠道超时后指纹不变、仍重放 |
| `TestClearVerdictCache` | 清空后同一内容重新送审；`cache_epoch` 加一；第二个插件实例（同一库和 KV）在一次 `pollVersions` 后也重新送审 |
| `TestReviewSyncsVerdictCache` | 误报 → 同一内容下次不送审、直接放行；改为确认 → 重放；改为待处理 → 重新送审；流程指纹已变时"确认"不写缓存，`cache_synced = 0` |
| `TestVerdictChangedBroadcastDropsMemory` | 收到 `verdict.changed` 的实例删掉内存里的对应键 |
| `TestVerdictCacheTTLSettings` | `DecodeSettings`：只有 `cache_ttl_seconds = 0` → 关闭；`= 86400` → 1 天；`= 200000` → 3 天；两个键都没有 → 7 天；`verdict_cache_days = 40` → 30 |
| `TestKVFailureAuditsAgain` | KV 报错时照常送审，不放行、不重放 |

- 现有 `hook06_test.go` `TestHookModeratesWholeRequestWithSegmentCache`、`extract_test.go` `TestPlanSkipsCachedSegments`：按新接口改写，断言不变。
- `stats_api_test.go`：`/status` 的 `today.replayed`、趋势点的 `replayed`。
- `manifest_test.go`：新路由在 manifest 里且权限是 manage（现有的路由对照测试会自动覆盖）。
- 迁移测试：`0010` 在 0.7.2 的库上执行两次。

---

## 6. 功能 4：时机与名单

### 6.1 N 的行为

设置（`N:config.go:28-37`）：`enabled`、`default_level`（`observe` | `block`，默认 `observe`）、`allowlist_user_ids`、`blocklist_user_ids`（各最多 1000 个，`N:config.go:116`、`245-255`）。同时在两个名单上的用户算黑名单（`N:config.go:428-431`）。

时机（`N:gate.go:152-177`）：

```go
switch {
case set.Blocklisted(userID): return true   // 先审
case set.Allowlisted(userID): return false  // 只后审
}
return effectiveLevel(set, userID, now) == LevelBlock
```

`effectiveLevel`：用户有未过期的名单条目时用条目的级别，否则用 `default_level`。**条目自己的级别优先**：默认是 block 时，观察级条目的用户仍然只后审。

名单（`N:escalate.go:84-112`，`N:model/moderation_watch.go:208-297`）：

- 自动加入的条目，级别是 `default_level`，有效期 `watch_days`（两种级别都有）。
- 违规计数：观察级总是计；**默认是 block 时，拦截级条目也计**（`moderation_watch.go:245`）。有效期只有观察级命中时延长（240 行）。
- 白名单用户照常后审、照常自动进名单（`onSuspicious` 只排除管理员和重放）。
- 白名单用户不能手动设为拦截级：400 `Allowlisted users can only be observed`（`N:controller/content_moderation.go:2271-2272`）。
- AI 结论（`N:escalate.go:125-130`）：白名单用户不升级；黑名单用户不降级、不移出。被挡下的结论记为 `auto_not_allowed`。
- 记录详情、名单列表、用户详情都返回 `allowlisted`、`blocklisted`（`N:controller/content_moderation.go:1975-1976`、`2153-2155`、`2599-2600`）。

### 6.2 P 现在的行为

- `mode`：`off` | `observe` | `enforce`。`enforce` 时**所有人**先审，不看名单条目的级别（`P:hook.go:205-209`）。
- `exempt_user_ids`：这些用户**完全不审核**（`P:hook.go:140-150`），不进名单（`P:store.go:219`），不能手动加入名单或封禁（`P:watch.go:221-229`）。
- 自动加入的条目总是观察级（`P:store.go:298`）；只有观察级计违规（`P:store.go:312-316`）。
- AI 结论只受三个开关控制（`P:analysis_queue.go:254-270`）。
- 繁忙时只对名单上拦截级的用户返回 503（`P:hook.go:114`）。

### 6.3 P 的目标行为与设置映射

P 的级别名保持 `observe` / `enforce`（N 的 `block` = P 的 `enforce`）。

**决定 1：不新增 `default_level` 键，`mode` 就是"总开关加默认级别"。**

| `mode` | 含义（0.8.0） | N 的等价设置 |
|---|---|---|
| `off` | 关闭 | `enabled = false` |
| `observe` | 开启，默认级别为观察 | `enabled = true, default_level = observe` |
| `enforce` | 开启，默认级别为拦截 | `enabled = true, default_level = block` |

N 的两个设置合起来只有这三种有效状态（关闭时默认级别不起作用），与 `mode` 的三个值一一对应。这样已存的设置不用改，旧版本读到的键和取值也都认识。代价是关闭时记不住之前的默认级别，重新开启时要再选一次。接口另外返回派生出的 `default_level`，界面按"默认级别"展示。

`mode = enforce` 的含义有一处变化：以前是"所有人先审"；以后是"没有名单条目的人先审，有条目的按条目的级别，白名单只后审"。

**决定 2：新增 `allowlist_user_ids` 和 `blocklist_user_ids`；`exempt_user_ids` 退役，作为白名单的旧名读取。**

| 键 | 类型 | 默认 | 范围 | 说明 |
|---|---|---|---|---|
| `allowlist_user_ids` | array of string（十进制用户 id） | `[]` | 最多 1000 项 | 白名单：只后审，永不先审 |
| `blocklist_user_ids` | array of string | `[]` | 最多 1000 项 | 黑名单：总是先审 |
| `exempt_user_ids` | array of string | `[]` | — | 旧键，保留在 schema 里并隐藏 |

取值规则（`DecodeSettings`）：文档里有 `allowlist_user_ids` 键就用它；没有就用 `exempt_user_ids` 的值。项的写法和校验照现在的 `exempt_user_ids`（`P:settings.go:267-273`）；超过 1000 项时只取前 1000 项并记一条警告（核心在保存时已按 schema 的 `maxItems` 拒绝）。

"完全不审核"这个语义不再存在（N 没有）。原来豁免的用户升级后变成：后台审核、会有记录、可能自动进名单（观察级）、永不被拦截。

时机函数（新增，`hook.go`）：

```go
func (c *config) blocklisted(uid int64) bool { return c.block[uid] }
func (c *config) allowlisted(uid int64) bool { return c.allow[uid] && !c.block[uid] }

// effectiveLevel is the user's watch level, or the default level without a live entry.
func (p *Plugin) effectiveLevel(c *config, uid int64) string

// preModerated: blocklisted users always, allowlisted users never, everyone
// else at the enforce level (new-api gate.go preModerated).
func (p *Plugin) preModerated(c *config, uid int64) bool
```

名单规则照 6.1：自动条目的级别 = 默认级别；默认是拦截时拦截级条目也计违规；白名单用户手动设拦截级返回 400（字段 `level`，码 `allowlisted`，"allowlisted users can only be observed / 白名单用户只能设为观察"）；AI 结论受两个名单限制。

P 独有的封禁与两个名单的关系（决定）：
- 白名单用户**不会被自动封禁**，也不能被手动封禁（400，字段 `user_id`，码 `allowlisted`，取代现在的 `exempt`）。理由：白名单的含义是"永不被拦截"，封禁比拦截更重。
- 黑名单用户照常计入自动封禁。
- 已经在 `blocks` 表里的用户不受名单影响，封禁检查仍在最前面。

`blocks` 表、`ban_*` 设置、封禁钩子都不变。

### 6.4 升级路径（已存的设置和名单）

线上现在是 `mode = enforce`、`exempt_user_ids = []`。

1. **设置不用改**。`mode = enforce` 直接读成"默认级别为拦截"。
2. **名单里自动加入的观察级条目要转成拦截级**，否则这些用户升级后从先审变成后审。原因：线上 `mode = enforce` 期间自动加入的条目都是观察级（0.7.2 总是观察级），在 N 的规则下它们本该以默认级别（拦截）加入。

   一次性转换（新文件 `parity.go`，`convertParityOnce`，写法照 `legacy.go` 的 `convertLegacyOnce`：在 `refreshLoop` 里、`Configure` 收到真实设置之后调用；用 `config_state` 的行锁保证只有一个节点执行）：

   - 读 `config_state.parity_converted`（新列）；已为真则返回。
   - 当前 `mode = enforce` 时：

     ```sql
     UPDATE watchlist SET level = 'enforce', updated_at = $1
     WHERE level = 'observe' AND source = 'auto' AND (expires_at IS NULL OR expires_at > $1)
     RETURNING user_id
     ```

     每个用户写一条 `watch_events`：`action = 'set_level'`，`from_level = 'observe'`，`to_level = 'enforce'`，`reason = '0.8.0 升级：默认级别为拦截，自动加入的条目改为拦截级 / upgrade to 0.8.0'`，没有操作人。`expires_at`、`violation_count`、`violation_epoch` 不动。然后 `bumpWatch`，事务提交后 `watchChanged`。
   - 不论 `mode` 是什么，都把 `parity_converted` 置为真（只在升级那一刻判断一次）。
   - 日志记一条：转换了多少条。

   只转 `source = 'auto'` 的条目：管理员手动设成观察级的（`source = 'manual'`）和 AI 降到观察级的（`source = 'analysis'`）是有意的选择，保持观察级；这些用户升级后变为只后审，这正是 N 的规则。发布前用一条查询数出这类条目有多少，写进发布记录：

   ```sql
   SELECT source, count(*) FROM plg_moderation.watchlist
   WHERE level = 'observe' AND (expires_at IS NULL OR expires_at > now()) GROUP BY source;
   ```

3. `exempt_user_ids` 为空，白名单为空，无事发生。别的部署里已有豁免用户的，升级后变成白名单（后审）。

### 6.5 数据模型与迁移

```sql
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS parity_converted boolean NOT NULL DEFAULT false;
```

`watchlist.level` 的 CHECK 约束不变（`observe`、`enforce`）。

### 6.6 设置的 schema 与 ui

`settings.schema.json`：

```json
"allowlist_user_ids": {"type": "array", "default": [], "maxItems": 1000, "items": {"type": "string", "pattern": "^[0-9]{1,18}$"}},
"blocklist_user_ids": {"type": "array", "default": [], "maxItems": 1000, "items": {"type": "string", "pattern": "^[0-9]{1,18}$"}}
```

`items` 的写法以现有 `exempt_user_ids` 的定义为准（实现时照抄它，再加 `maxItems`）。`mode` 的定义不变（三个枚举值、默认 `off`）。

`settings.ui.json`：

- 第一组标题改为"运行模式与用户名单 / Mode and user lists"。
- `mode`：标题"审核与默认级别"；选项名改为"关闭 / 开启 · 默认观察 / 开启 · 默认拦截"；说明："默认观察：请求直接放行、后台审核；只有观察名单里拦截级的用户和黑名单用户先审后发。默认拦截：没有名单条目的用户也先审后发；名单条目自己的级别优先，观察级的用户只后台审核。"详情见 3.6 的改法，再加一句："自动加入观察名单的用户以默认级别加入。"
- `allowlist_user_ids`（`tags` 控件）：标题"白名单（只观察）"；说明："这些用户只在请求放行后审核，永不被拦截；仍会留下记录、可能进入观察名单。不能手动设为拦截级，AI 也不会把他们升级。同时在黑名单里的用户按黑名单处理。"
- `blocklist_user_ids`：标题"黑名单（总是先审）"；说明："这些用户的每个请求都先审后发，命中即拒绝。AI 不会把他们降级或移出名单。这不是封禁：封禁在“封禁”页。"
- `exempt_user_ids`：`ui:widget: hidden`，移到旧字段那一段。
- `ui:order`：`mode`、`allowlist_user_ids`、`blocklist_user_ids` 在最前；`exempt_user_ids` 移到末尾的旧字段里。

### 6.7 接口

| 方法 路径 | 变化 |
|---|---|
| `GET /status` | 加 `default_level`（`observe` \| `enforce`，`mode = off` 时为 `observe`） |
| `GET /events/:id`、`GET /users/:user_id` | `user_state` 去掉 `exempt`，加 `allowlisted`、`blocklisted` |
| `GET /watchlist` | 每行加 `allowlisted`、`blocklisted` |
| `POST /watchlist`、`PATCH /watchlist/:user_id` | 白名单用户设为 `enforce` → 400；豁免用户不再被拒绝（可以以观察级加入） |
| `POST /blocks` | 字段错误码 `exempt` 改为 `allowlisted` |
| `POST /flows/:id/simulate` | `user_state = none` 时按默认级别决定时机（以前固定为后审） |

### 6.8 Go 改动

**`settings.go`**：`Settings` 加 `AllowlistUserIDs`、`BlocklistUserIDs`；`config` 把 `exempt` 换成 `allow`、`block`，加 `defaultLevel`；新方法 `(d decoder) userList(key string) []string`；`compile` 里 `defaultLevel = LevelEnforce` 当且仅当 `Mode == ModeEnforce`。

**`hook.go`**
- `precheck`：删掉豁免放行那一段（白名单用户继续往下，按后审处理）。
- `moderate`：繁忙时改用 `p.preModerated(c, uid)` 决定返回 503 还是放行。
- `admit`：`if p.preModerated(c, uid) { m.timing = TimingPre }`。`rec.WatchLevel` 仍是名单条目的级别。

**`store.go`**
- `afterWrite`：去掉 `c.exempt[e.UserID]` 的跳过；`banned[e.UserID] = true` 只对非白名单用户。
- `liveWatchEntry`：自动条目的级别用 `c.defaultLevel`，历史的 `to_level` 同步。
- `countWatchHit`：计违规的条件改为

  ```go
  counts := w.Level == LevelObserve || (c.defaultLevel == LevelEnforce && w.Level == LevelEnforce)
  ```

  有效期只在观察级延长（现有逻辑）。`counts` 为假时走现在的非观察级分支。

**`watch.go`**：`protectedUser` 拆成两个：名单操作只拒绝版主（staff）；`createWatch` / `updateWatch` 在目标级别为 `enforce` 且用户在白名单时返回字段错误。封禁（`routes.go` `createBlock`）拒绝白名单用户和版主。

**`analysis_queue.go`**：`decideEscalation` 加参数 `uid int64`：

```go
case ActionAutoUpgrade:   allowed = c.AnalysisAllowUpgrade && !c.allowlisted(uid)
case ActionAutoDowngrade: allowed = c.AnalysisAllowDowngrade && !c.blocklisted(uid)
case ActionAutoRemove:    allowed = c.AnalysisAllowRemove && !c.blocklisted(uid)
```

`escalationOf` 不动（P 在拦截级只降级不移出的规则保留，§72.13.4）。

**`routes.go`**：`UserState` 改字段；`userState` 填两个名单标记。**`watch_list.go`**：`WatchItem` 加两个标记。**`stats_api.go`**：`Status.DefaultLevel`。**`flow_versions.go`** `simulateFlow`：`none` 按 `c.defaultLevel`。**`notify.go`**：不变。**新文件 `parity.go`**：`convertParityOnce`。**`plugin.go`**：加 `parityDone atomic.Bool`。**`store.go` `refreshLoop`**：调用 `convertParityOnce`。

### 6.9 界面

- `SettingsTab.vue`：第一组显示 `mode`（按新选项名）、白名单、黑名单。白名单的初始值：已存的 `allowlist_user_ids`，没有这个键时取已存的 `exempt_user_ids`（与后端的读法一致）；保存时只写 `allowlist_user_ids`。`settingsForm.ts` 的键表相应调整。
- `overview/StatusLine.vue`：模式徽标改为"默认观察 / 默认拦截 / 关闭"。
- `WatchTab.vue`、`WatchDetail.vue`、`UserStateSection.vue`、`EventDetail.vue`：用户旁显示"白名单"或"黑名单"徽标（悬停说明：白名单"只后审，永不拦截"；黑名单"总是先审"）。原来的"豁免"徽标删除。
- `WatchEditModal.vue`、`WatchActions.vue`：白名单用户的"拦截级"选项不可选，旁边提示"白名单用户只能设为观察"；黑名单用户显示提示"黑名单用户总是先审，名单级别不影响时机"。
- `BlocksTab.vue`：封禁白名单用户时显示后端的字段错误。
- `FlowSimulate.vue`：用户状态的选项说明"未标记（按默认级别）"。
- `messages.ts`：`mode.*` 的名字、上述文案；`flows.timingDesc` 改写为按默认级别、名单级别、白名单、黑名单四条规则说明。

### 6.10 回滚与混跑

- 混跑期间旧节点按旧规则：`mode = enforce` 时所有人先审；`exempt_user_ids` 里的用户不审。新节点按新规则。同一用户的请求落到不同节点时结果可能不同，持续到滚动结束。
- 一次性转换可能在旧节点还在运行时执行：转换成拦截级的条目在旧节点上同样是先审，无影响。
- 回滚到 0.7.2：
  - `allowlist_user_ids`、`blocklist_user_ids` 被忽略。黑名单用户按普通用户处理；白名单用户按普通用户处理（`mode = enforce` 时会被先审）。需要保持免拦截的，回滚前把这些 id 写回 `exempt_user_ids`（0.7.2 下是完全不审）。
  - 转换过的名单条目保持拦截级；0.7.2 不给拦截级计违规、不延期，它们到 `expires_at` 后过期。
  - `parity_converted` 列被忽略；再次升级时不会重复转换。

### 6.11 测试

新增 `lists_test.go`：

| 测试 | 断言 |
|---|---|
| `TestPreModerated` | 表驱动，覆盖：默认观察 / 默认拦截 × 无条目 / 观察级条目 / 拦截级条目 / 已过期条目 × 不在名单 / 白名单 / 黑名单 / 两个名单都在。关键行：默认拦截加观察级条目 → 后审；白名单加拦截级条目 → 后审；黑名单加观察级条目 → 先审；两个名单都在 → 先审 |
| `TestAllowlistIsObservedNotExempt` | 白名单用户的违规请求：放行；有 `hit` 记录；自动进名单，级别是默认级别；默认为拦截时条目是拦截级，但之后的请求仍然后审；不会被自动封禁 |
| `TestAutoWatchUsesDefaultLevel` | 默认拦截时首次可疑的用户以拦截级加入，`expires_at` = 现在加 `watch_days`；之后的命中计违规、不延期；计数到 `analysis_every_violations` 时排队分析 |
| `TestEnforceEntriesCountOnlyUnderDefaultEnforce` | 默认观察时拦截级条目的命中只加 `hit_count`，不计违规 |
| `TestAllowlistedCannotBeEnforcedByHand` | `POST /watchlist` 和 `PATCH` 把白名单用户设为 `enforce` → 400 `level/allowlisted`；设为 `observe` 成功 |
| `TestAnalysisRespectsLists` | `decideEscalation`：白名单用户的升级 → `auto_not_allowed`；黑名单用户的降级、移出 → `auto_not_allowed`；不在名单的照开关 |
| `TestBusyUsesPreModerated` | 超出 `max_inflight_mb` 时：黑名单用户 503；默认拦截下的普通用户 503；白名单用户放行 |
| `TestExemptBecomesAllowlist` | `DecodeSettings`：只有 `exempt_user_ids` → 白名单等于它；两个键都有 → 用 `allowlist_user_ids`；超过 1000 项截断 |
| `TestParityConversionOnce` | `mode = enforce` 的库：自动的观察级条目变拦截级并各有一条历史；手动和 AI 的观察级条目不变；已过期的不变；再跑一次不再改动；`mode = observe` 的库不改条目但标记置真；两个实例并发只转换一次 |

说明：照 N，自动条目一律以默认级别加入，白名单用户也一样（N 的 `ApplyWatchHit` 不看名单）；白名单用户即使有拦截级条目，`preModerated` 仍返回假。

改现有测试：
- `hook_test.go` `TestObserveWatchListAndEnforceLevel`：加"默认拦截下观察级条目的用户后审"。
- `hook_test.go` `TestBansExemptAndModeOff`：豁免用户"不审核"的断言改为"后审、有记录、不封禁"。
- `llmproto_test.go` `TestEscalationOf`：`decideEscalation` 的新参数。
- `stats_api_test.go`：`/status` 的 `default_level`；名单行的两个标记。

界面：`settingsForm.spec.ts` 加白名单初始值取自 `exempt_user_ids` 的用例。

---

## 7. 功能 5：Jev（TypeSafe）引擎

### 7.1 N 的行为

- **长上下文**：每次调用都带请求头 `TypeSafe-Danger-Zone-Long-Context: true`（`N:engine_typesafe.go:52-54`、`138-141`），每题和每请求的上下文都升到 262k token。N 的文档写明代价：更慢，准确度略低，单价不变。
- **请求预算**：文字（一个字算一个 token）加图片合计 200000 token、base64 合计 24 MiB（`N:engine_typesafe.go:48-49`、`189`）。
- **图片规格化**（`N:engine_typesafe.go:205-282`）：
  - 内联的 PNG 或 JPEG，尺寸在 System One 的限制内（每边 280–1568 px，总像素 78,400–2,458,624）→ 原样发送，不解码像素。
  - 其他内联的 PNG、JPEG、GIF（取第一帧）、WebP → 重画：等比缩小到长边不超过 1568 px（从不放大）；居中放到白色画布上，画布每边至少 280 px；透明部分铺成白色；缩放用 `draw.BiLinear`。结果编码成 PNG（`BestSpeed`）；PNG 超过 2 MiB 时改用 JPEG（质量 85）。
  - 文件头声称超过 5000 万像素的不解码，跳过。
  - 同时最多 2 张图在解码重画（`jevNormalizeSlots`），等不到名额且 ctx 结束时跳过。
  - URL 图片、解码后超过 16 MiB 的、无法识别的格式 → 跳过。
- **同内容图片只发一次**（`N:engine_typesafe.go:178-188`）：按规格化后 base64 的 sha256 去重。
- **旧题集版本号**（`N:jev_questions.go:52-58`、`229-233`）：题表的线上内容哈希等于两套已删除的内置题集之一时，版本号分别报 `content-audit-13-en-v1`、`content-audit-13-zh-v1`，而不是 `custom-xxxxxxxx`。

### 7.2 P 现在的行为

- 不带长上下文请求头（`P:engine.go:464-486`，只在有图片时带 `TypeSafe-Danger-Zone-Images`）。
- 预算 24000 token（`P:engine.go:401`）。
- 只发规格内的内联 PNG / JPEG，只读文件头；其他一律跳过（`P:engine.go:519-537`）。
- `jevAssets` 不去重（请求级的片段去重已经去掉了原始数据相同的图片，`P:extract.go:558-561`）。
- 只认当前内置题集的版本号（`P:engine.go:635-641`）。

### 7.3 P 的目标行为

与 7.1 相同，两个数值按 P 的内存上限收紧（决定）：

| 常量 | N | P | 原因 |
|---|---|---|---|
| `jevImageMaxSourcePixels` | 50,000,000 | **12,000,000** | 插件进程内存上限 512 MB（§72.2 第 3 条）。5000 万像素的图解码成 RGBA 要 200 MB，16 位 PNG 要 400 MB；两张同时解码就会让插件被杀。1200 万像素覆盖手机照片和 4K 截图，最坏情况每张约 48–96 MB |
| `jevNormalizeSlots` | 2 | 2 | 相同 |

超过 1200 万像素的图在 P 里跳过（计入 `skipped_images`），在 N 里会被重画送审。

其他常量照抄：`jevImagePNGMax = 2 << 20`、`jevImageJPEGQuality = 85`、`jevRequestTokenLimit = 200_000`、`jevLongContextHeader`。

P 的块最多 `input_max_chars`（上限 100000）字，文字本身不会超过 200k 的预算；预算提高的实际效果是一次调用能带更多图片。

### 7.4 Go 改动

**`engine.go`**
- `jevRequestTokenLimit = 200_000`；加 `jevLongContextHeader = "TypeSafe-Danger-Zone-Long-Context"`。
- `callSystemOne`：`header` 总是 `map[string]string{jevLongContextHeader: "true"}`，有图片时再加 `jevImagesHeader`。
- `typesafeAudit`：`jevAssets(ctx, in)`。
- 旧版本号：

  ```go
  const (
      RulesVersionEN   = "content-audit-13-en-v1"
      RulesVersionZH13 = "content-audit-13-zh-v1"
      legacyWireHashEN = "e2ca199d2bb8208d2ebdc47dbf079b49f9f41794c9a4a25527fb1ec609451add"
      legacyWireHashZH = "b01b9f2d0e8df50000f90eed1681717e197afc2f73698f108bbb045eada6d3dd"
  )
  var builtinVersions = map[string]string{builtinWireHash: RulesVersionZH, legacyWireHashEN: RulesVersionEN, legacyWireHashZH: RulesVersionZH13}
  ```

  `RulesVersionOf` 改为查这张表。两边都用 `encoding/json` 序列化同一个结构（N 的 `common.Marshal` 最终是 `encoding/json`，`N:relaykit/relayconvert/kitutil/json.go:24-44`），哈希可以直接照抄。

**新文件 `jev_image.go`**（从 `engine.go` 移出 `jevAssets`、`jevAsset`，新增重画）：

```go
func jevAssets(ctx context.Context, in *Input) []typesafeAsset
func jevAsset(ctx context.Context, raw string) *typesafeAsset
func jevNormalizeImage(data []byte) *typesafeAsset
var jevNormalizeSlots = make(chan struct{}, 2)
var jevImageFormats = []string{"png", "jpeg", "gif", "webp"}
```

`jevAsset` 保留 P 现在"先用流式解码只读文件头"的做法（规格内的图不分配整张图的内存）；只有需要重画时才把 base64 整体解码。

**`go.mod`**：新增依赖 `golang.org/x/image`（`draw`、`webp`）。整个 `next/` 工作区目前没有这个模块；`go.sum` 和 `go.work.sum` 要一并更新，构建机要能拉到它（见 Q9）。标准库另加 `image/gif`（只注册解码器）。

### 7.5 界面

- `AuditorEditModal.vue`：Jev 图片开关的说明改为"内联的 PNG、JPEG、GIF（第一帧）、WebP 会送审；尺寸不合规格的自动缩放或补白后发送。URL 图片、超过 16 MiB 或 1200 万像素的图片不送审。"
- 设置里 `input_max_images` 等说明不变。

### 7.6 对现有配置的行为变化

1. **每次 Jev 调用都带长上下文请求头**。按 N 文档的说法会变慢、准确度略低。线上 Jev 渠道的超时（默认 8000 ms）是否够用，上线后看渠道健康度的延迟分布。
2. 以前被跳过的图片（GIF、WebP、过大或过小的 PNG / JPEG）现在会被送审：`sent_images` 增加，Jev 的 token 用量和费用增加，可能出现新的命中。
3. 一次调用能带的图片从约 4 张（1024² 的图，文字占满一块时）增加到 `input_max_images` 允许的全部。
4. 已存的、内容等于旧内置题集的 Jev 审核器，`rules_version` 的显示从 `custom-…` 变为 `content-audit-13-zh-v1` 或 `-en-v1`。判定不变；因为版本号不进缓存指纹（指纹用配置原文），缓存也不受影响。

### 7.7 回滚与混跑

没有持久化的变化。混跑期间新旧节点对同一张图可能一个送审、一个跳过。

### 7.8 测试

`unit_test.go` `TestJevAssetsAndOpenAIImages` 扩充，另新增 `jev_image_test.go`（图片在测试里用 `image` 包现场生成，不放二进制夹具）：

| 测试 | 断言 |
|---|---|
| `TestJevLongContextHeader` | 无图和有图的调用都带 `TypeSafe-Danger-Zone-Long-Context: true`；有图时另带图片头 |
| `TestJevAssetInLimitsSentAsIs` | 1000×1000 的 PNG：返回的 base64 与输入逐字节相同 |
| `TestJevNormalizeOversized` | 4000×2000 的 JPEG → 结果长边 1568、比例不变 |
| `TestJevNormalizeTooSmall` | 100×50 的 PNG → 画布 280×280，四角是白色，中心区域是原图颜色 |
| `TestJevNormalizeTransparency` | 透明 PNG → 透明处变白 |
| `TestJevNormalizeGIFAndWebP` | 两种格式都能得到 PNG 或 JPEG 资产（GIF 取第一帧）。WebP 用测试里内嵌的一小段合法字节 |
| `TestJevNormalizeFallsBackToJPEG` | 噪点图的 PNG 超过 2 MiB → 格式为 `jpeg` |
| `TestJevAssetSkips` | URL、损坏的 base64、解码后超过 16 MiB、文件头声称超过 1200 万像素、未知格式 → nil |
| `TestJevAssetsDedupeAndBudget` | 两张规格化后相同的图只发一次；预算 200000：文字 12000 字加 8 张 1024² 的图全部入选 |
| `TestJevNormalizeSlotsHonourContext` | 名额占满且 ctx 已取消 → nil，不阻塞 |
| `TestRulesVersionLegacyHashes` | `builtinVersions` 含两条旧哈希；`RulesVersionOf(内置题集)` 仍是 `content-audit-v2-zh` |

---

## 8. 功能 6：`record_pass_input_message`

### 8.1 N 的行为

`N:worker.go:356-358`：

```go
return set.RecordInputMessage && (t.keepsMessage() || set.RecordPassInputMessage)
```

`record_input_message`（默认开）控制是否保存原始消息；开着时，命中过的记录总是保存；`record_pass_input_message`（默认开，`N:config.go:79`、`158`）再让其余记录（通过、出错、被推翻但没有级命中过的）也保存。

### 8.2 P 现在的行为

`P:hook.go:484`：只有第一级命中、`store_text` 开、且结果不是 error 时保存 `input_message`。P 没有单独的 `record_input_message`，由 `store_text` 一并控制（§72.14，保留）。

### 8.3 P 的目标行为

新增设置：

| 键 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `record_pass_input_message` | boolean | true | `store_text` 开着时，通过和被推翻的记录也保存原始消息 |

保存 `input_message` 的条件改为：

```go
keep := m.cfg.StoreText && rec.Result != ResultError &&
    (tr.keepsMessage() || m.cfg.RecordPassInputMessage)
```

- `tr.keepsMessage()` 取代"第一级命中"：最终命中，或任何一级判过命中（含补审级命中；含第一级失败、第二级命中的情况）。
- 保存的仍是判定块（§72.9），多块全部通过时是最后一块（3.3）。
- **出错记录不保存原始消息**，这一点与 N 不同（第 10 节第 8 条）：P 在 0.6.0 的团队审核后规定出错记录只留前 `error_text_max_chars` 字、不留 `input_message`（§72.9），因为渠道故障期间每个请求都出错，原始消息里可能有 base64 图片。3.1 第 6 条之后 error 只剩"没有任何一级判定"的情况，正是渠道整体故障的时候。

通过的记录本身受 `record_pass`（默认关）控制，被推翻的受 `record_overturned`（默认开）控制；这个设置只决定写下的记录带不带原始消息。

### 8.4 设置的 schema 与 ui

```json
"record_pass_input_message": {"type": "boolean", "default": true}
```

`ui:order` 里放在 `store_text` 之后。标题："通过的记录也保存原始消息"。说明："保存原文开着时，通过和被推翻的记录也保存判定那一块的原始消息（含图片），便于事后复核；关闭后只有命中过的记录保存。出错的记录不保存原始消息。"

### 8.5 Go 改动

`settings.go`：`RecordPassInputMessage bool`，默认 true，`d.boolean`。`hook.go` `finish`：按 8.3 改条件。

### 8.6 对现有配置的行为变化

键不存在时取默认值 true。所以升级后，在 `store_text` 开着的部署里：

- 被推翻的记录（默认会写）开始带原始消息，包括其中的图片（data URL）。`events` 表会变大，留存期是 `overturned_retention_days`（默认 30 天）。
- 开了 `record_pass` 的部署，通过的记录也带原始消息，量可能很大。

发布说明里提示：不想要的话升级后把这个开关关掉。

### 8.7 测试

`hook06_test.go` 新增 `TestInputMessageKeptPerSetting`，表驱动：

| 场景 | 设置 | 期望 `input_message` |
|---|---|---|
| 命中 | 开关关 | 有 |
| 第一级失败、第二级命中 | 开关关 | 有（以前没有） |
| 第一级命中、第二级通过（推翻） | 开关关 | 有 |
| 通过（`record_pass` 开） | 开关开 | 有 |
| 通过（`record_pass` 开） | 开关关 | 无 |
| 补审级命中 | 开关关 | 有 |
| 出错 | 开关开 | 无，`text` 被截到 `error_text_max_chars` |
| 任意 | `store_text` 关 | 无 |

`unit_test.go` `TestDecodeSettings`：缺键时为 true。现有 `TestErrorRecordsKeepShortText` 不变。

---

## 9. 功能 7：绑定回落

### 9.1 N 的行为

`N:runtime.go:40-53`：依次找"分组内的渠道""任意分组的渠道""整个分组"，取第一条**有效**的。快照只收录指向"已发布且启用"的流程的绑定（`N:runtime.go:247-257`）：

```go
if flow := snap.flows[b.FlowId]; flow != nil && flow.Spec.Enabled {
    snap.groups[b.GroupName] = flow
}
```

所以指向停用或未发布流程的绑定等于不存在，更宽的绑定接着生效；一条都没有才不审核。

### 9.2 P 现在的行为

`P:snapshot.go:73-92`、`293`、`307`：绑定指向停用或未发布的流程时，快照里记为 nil，匹配到它就**不审核，也不回落**（§72.17 明文规定）。显式绑定到 `flow_id = 0`（免审）同样记为 nil，两者无法区分。

### 9.3 P 的目标行为

优先级不变：`(分组, 账号)` → `(任意分组, 账号)` → 分组 → 默认分组 0。

- 绑定到 `flow_id = 0`：仍然是"不审核"，匹配到就停，不回落。
- 绑定到停用或未发布的流程：**这条绑定视为不存在**，继续找更宽的绑定。
- 绑定到已删除的流程（正常情况下删除流程会删掉它的绑定）：同样视为不存在。

### 9.4 Go 改动

`snapshot.go` `loadSnapshot`：

```go
// 分组绑定
switch f := s.flows[fid]; {
case fid == 0:
    s.byGroup[gid] = nil // 免审
case f != nil:
    s.byGroup[gid] = f
}                        // 停用或未发布：不登记，回落
if fid != 0 {
    s.groups[fid] = append(s.groups[fid], gid) // 界面仍要列出
}

// 账号绑定
if fid != 0 && s.flows[fid] == nil {
    return nil // 不登记：不影响 perAccount，回落
}
s.addAccountBinding(accountKey{gid, acct}, s.flows[fid])
```

一个附带结果：某分组的账号绑定全部指向停用流程时，`perAccount(分组)` 为假，这个分组回到在请求钩子里按分组审核，不再推迟到 `gateway.attempt`。

`flowFor`、`flowForAccount` 的代码不用改，注释改写。`routes_bindings.go`：`GET /bindings` 的每行加 `inactive: true`（绑定的流程不为 0，且停用、未发布或不存在），供界面显示。

### 9.5 界面

- `bindingOps.ts` `resolveBinding`：跳过 `inactive` 的绑定。它与 `TestFlowForAccount` 共用一组用例（`bindingOps.spec.ts`），两边一起加用例。
- `BindingsTab.vue`：`inactive` 的行显示灰色徽标"流程已停用，这条绑定不生效"，并用命中预览的同一逻辑写出"现在按 <回落到的绑定> 审核"或"现在不审核"。
- `BindingEditModal.vue`：选了停用或未发布的流程时提示"该流程未启用：保存后这条绑定暂不生效，请求按更宽的绑定审核。要让这些请求不审核，请选“不审核（免审）”。"
- `FlowsTab.vue`、`FlowGroupsCell.vue`：停用流程的分组列提示同一句话。停用一个有绑定的流程时（`PUT /flows/:id/enabled`），确认框里写明"它的分组和账号将回落到更宽的绑定（通常是默认流程）"。

### 9.6 对现有配置的行为变化（重要）

**现在绑定到停用或未发布流程的分组和账号，升级后会回落到更宽的绑定，通常是默认分组 0 的流程，从"不审核"变成"审核"。** 有人可能就是用"绑一个停用的流程"来让某个分组不审核。

发布前执行，列出受影响的绑定：

```sql
SELECT 'group' AS kind, g.group_id, 0 AS account_id, g.flow_id, f.name, f.enabled, f.published IS NOT NULL AS published
FROM plg_moderation.flow_groups g LEFT JOIN plg_moderation.flows f ON f.id = g.flow_id AND f.deleted_at IS NULL
WHERE g.flow_id <> 0 AND (f.id IS NULL OR NOT f.enabled OR f.published IS NULL)
UNION ALL
SELECT 'account', a.group_id, a.account_id, a.flow_id, f.name, f.enabled, f.published IS NOT NULL
FROM plg_moderation.flow_accounts a LEFT JOIN plg_moderation.flows f ON f.id = a.flow_id AND f.deleted_at IS NULL
WHERE a.flow_id <> 0 AND (f.id IS NULL OR NOT f.enabled OR f.published IS NULL);
```

结果不为空时，由管理员逐条决定：要继续不审核的，升级前在绑定页改成"不审核（免审）"（0.7.2 已支持 `flow_id = 0`）。迁移脚本**不自动改**这些绑定：脚本分不清"有意不审"和"流程临时停用"，改成免审会让流程重新启用后绑定丢失。见 Q4。

### 9.7 回滚与混跑

没有持久化的变化。混跑期间新旧节点对这类绑定的处理不同。回滚后恢复"不回落"。

### 9.8 测试

- `account_binding_test.go` `TestFlowForAccount`（与 `bindingOps.spec.ts` 共用用例表）加：
  - 分组绑定停用流程、默认分组有流程 → 默认流程；
  - `(G, A)` 绑定停用流程、`(0, A)` 有流程 → `(0, A)` 的流程；
  - `(G, A)` 和 `(0, A)` 都停用、分组 G 有流程 → G 的流程；
  - 各级都停用或没有 → 不审核；
  - `(G, A)` 绑定 flow 0、其他级都有流程 → 不审核（不回落）；
  - 分组绑定未发布的流程 → 回落。
- `TestUpgradeKeepsGroupBindings`：其中"绑定到停用流程的分组不审核"的断言改为"回落到默认流程"；免审分组（flow 0）仍不审核。
- 新增 `TestInactiveAccountBindingDoesNotDeferToAttempt`：分组的账号绑定全部指向停用流程时 `perAccount` 为假，请求钩子直接审核并回答 `skip_attempt_hooks`。
- `routes_bindings` 的测试：`GET /bindings` 的 `inactive`。

---

## 10. 移植后仍与 N 不同的地方（有意为之）

| # | 方面 | N | P | 原因 |
|---|---|---|---|---|
| 1 | 审核单位 | 一个内容块一次运行 | 片段装块，一块一次运行 | 任务规定抽取不变（§72.4）。P 审的范围更大（各角色、工具、文档），按块可以把大量小片段合并成少数几次调用 |
| 2 | 缓存键 | 只按内容 | 清空纪元、流程、判定指纹、片段 | 5.3.2：P 有按账号换流程重审；指纹让改配置后自动失效，N 靠人清空 |
| 3 | 命中的缓存单位 | 内容块 | 块里的片段集合，整个集合都在才重放 | 5.3.1：块命中时分不出是哪个片段 |
| 4 | 误报写放行 | 判定块 | 命中集合里的每个片段 | 同上；整体没问题则各部分没问题 |
| 5 | "确认"重写命中 | 无条件 | 仅当流程的判定指纹没变 | 不把旧配置的结论写到新配置下 |
| 6 | 缓存写入 | 同步 | 内存同步、KV 后台 | P 的钩子不等外部存储（§72.5 第 10 条）；别的节点最多晚几十毫秒 |
| 7 | 设置键 | `enabled` + `default_level`、`allowlist_user_ids` | `mode`（三值）；白名单新键并兼容旧键 `exempt_user_ids` | 6.3：已存设置不用迁移，可回滚 |
| 8 | 出错记录的原始消息 | `record_pass_input_message` 开着时保存 | 不保存，原文截到 `error_text_max_chars` | §72.9，渠道故障时的存储保护 |
| 9 | Jev 图片解码上限 | 5000 万像素 | 1200 万像素 | 插件内存上限 512 MB |
| 10 | 题表式 LLM 的提示词 | "系统提示词或用户消息中的一段" | 改为说明各段的角色前缀；用户消息带自身请求标记 | P 的块含多种角色；`llm` 渠道可以指回本网关 |
| 11 | 题表式 LLM 的题表 | 必填 | 可为空（用默认题集） | 与 P 的 Jev 审核器一致 |
| 12 | 审核器类型名 | `llm` | `llm_questions`（`llm_verdict` 保留） | 任务规定保留 `llm_verdict` |
| 13 | 多块请求的流程行 `errors` | 按代表块的 `Errored` | 按所有块的"或" | P 的一条流程行对应一个请求的多次运行 |
| 14 | 客户端断开 | 取消运行，前面的命中保留 | pre 运行不被客户端取消（singleflight） | P 既有设计（`P:hook.go:294-300`） |
| 15 | 封禁（`blocks`） | 没有 | 保留；重放不计入封禁；白名单用户不封禁 | P 独有的功能，规则按 N 的两条原则延伸 |
| 16 | AI 在拦截级的"移出"建议 | 直接移出 | 只降级（§72.13.4） | P 既有决定，不在本次范围 |
| 17 | 默认分组 | 没有 | `group_id = 0` 是回落的最后一级 | P 既有设计（§72.5） |
| 18 | 清空缓存 | Redis 模式下立即删除 | 换纪元，旧键等 TTL 过期 | 宿主 KV 只能逐键删除 |

---

## 11. 横切事项

### 11.1 版本

插件版本 **0.8.0**（`manifest.json` 的 `version`，以及代码里出现版本号的地方）。`hostCompat` 不变（`>=0.1.258 <0.2.0`）：没有用到新的宿主接口。KV 的 `Get / Set / Delete`、`Publish` 都是现有授权下已有的调用。

### 11.2 manifest 与权限

- `routes` 加 `POST /verdict-cache/clear`（5.6）。
- **不新增宿主权限，不改 `gateway.hook` 的 scope（`points`、`fields` 都不变），不新增用户权限。升级不需要管理员重新批准。** 逐项核对：
  - 题表式 LLM、Jev 长上下文：走现有的 `net` 出口。
  - 判定缓存：现有的 `kv`。`kv` 权限的说明文字建议从"共享审核通过缓存"改为"共享审核判定缓存"；只改 `reason` 文案。实现时先确认核心是否把 `reason` 变化当作需要重新批准（按 §72.3 的先例只有 scope 变化才需要）；如果会触发，就不改这段文案。
  - 广播 `verdict.changed`：现有的 `broadcast`。
  - 一次性转换、迁移：现有的 `db.schema`。
- 钩子、任务（`cleanup`、`analysis`、`alerts`）不变。

### 11.3 迁移 `0010_newapi_parity.sql`（全文）

```sql
-- plg_moderation 0010: moderation 0.8.0 (new-api parity, DESIGN-2026-11-10).
-- Idempotent. New columns have defaults, so 0.7.x keeps working after a rollback.

-- The question-table LLM auditor.
ALTER TABLE auditors DROP CONSTRAINT IF EXISTS auditors_type_check;
ALTER TABLE auditors ADD CONSTRAINT auditors_type_check
    CHECK (type IN ('openai_moderation', 'typesafe', 'llm_verdict', 'llm_questions'));

-- Verdict cache: the clear counter, replayed records and their hourly count.
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS cache_epoch bigint NOT NULL DEFAULT 0;
ALTER TABLE events       ADD COLUMN IF NOT EXISTS replayed    boolean NOT NULL DEFAULT false;
ALTER TABLE stats_hourly ADD COLUMN IF NOT EXISTS replayed    bigint  NOT NULL DEFAULT 0;

-- One-time conversion of auto-added watch entries (parity.go).
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS parity_converted boolean NOT NULL DEFAULT false;
```

核心在事务里执行插件迁移（§72.10）。四条 `ADD COLUMN` 都是常量默认值，不重写表；`ADD CONSTRAINT … CHECK` 会全表扫描 `auditors`（几十行）。`events` 上只需要很短的排他锁。

### 11.4 CONTRACTS §72 要改写的段落

| 小节 | 要改的内容 |
|---|---|
| 72.1 | 对照表的"怎么判"（四种审核器）、"何时拦截"（默认级别、白名单、黑名单）、"组合"（补审级、失败级跳过）三行 |
| 72.3 | 加 0.8.0 一条：版本、无权限变化、新路由 |
| 72.4 | "片段放行缓存"改为"片段判定缓存"（命中集合、重放）；"剩余限制"第 1 条的 TTL；时间预算一条里"按出错放行" |
| 72.5 | 第 1 步（豁免 → 白名单不在这里放行）；准入（`preModerated`）；第 3 步（绑定回落）；第 6 步（时机规则）；第 8 步（整段重写）；第 10 步"通过或出错 → 放行""审核出错一律放行"；第 11 步 note 的 `replay`；末段"超时按出错放行" |
| 72.6 | 审核器加 `llm_questions`；`typesafe` 的图片规则、24k、长上下文；"通用规则"不变 |
| 72.7 | spec 加 `fallback`；"执行"五条按 3.1 重写；"绑定"一段 |
| 72.8 | "进入名单"（默认级别、拦截级计数、白名单照常进名单、重放不算）；"管理员"一段删掉过时的 `exempt_user_ids` 建议；"手动操作"加白名单限制；"封禁"加白名单和重放的规则 |
| 72.9 | `trace` 行加 `failed`、`fallback`、`cache`；`input_message` 行的条件；新列 `replayed`；"写哪些记录"里结果的定义（error 的新含义） |
| 72.10 | 新增 `allowlist_user_ids`、`blocklist_user_ids`、`record_pass_input_message`、`verdict_cache_days`；退役 `exempt_user_ids`、`cache_ttl_seconds`；`mode` 的新含义；迁移说明加 `0010` |
| 72.11 | 路由表加清空；`/events/review` 的响应；`/events` 的过滤；`/import` 的说明；`/flows/:id/simulate` 的 `user_state` |
| 72.12 | 导入格式：审核器 `type: llm` 映射为 `llm_questions` |
| 72.13.4 | AI 结论受白名单、黑名单限制；工具返回 `replayed`、`stage_failed` |
| 72.14 | 统计表加 `replayed`；流程行 `errors` 的定义；"被推翻的放行也进放行缓存"并入新缓存规则；"与 new-api 不同"里更新 `record_input_message` 一条，加第 10 节的各条 |
| 72.15 | 设置分组；流程画布的补审级；trace 的失败级、补审、重放；审核器的新类型；名单徽标；绑定页的 `inactive` |
| 72.16 | 测试清单加本文各节的测试 |
| 72.17 | "不审核，也不回落"改为 9.3 的规则；界面的命中预览；升级兼容一段和 `TestUpgradeKeepsGroupBindings` 的说明 |

另外更新 `docs/HANDOFF-2026-10-31-MODERATION-GAPS.md`：顶部进度加 0.8.0 一条；"有意不同"里删掉已经对齐的项，加上第 10 节。`docs/PROGRESS.md` 按仓库惯例记一条。

### 11.5 发布说明要写的事（汇总各节）

1. 升级前：跑 9.6 的查询处理"绑定到停用流程"的绑定；跑 6.4 的查询记下观察级条目的来源分布；核对线上 `ban_threshold`。
2. 行为变化：3.8（复核出错不再放行等六条）、6.3（`mode = enforce` 的新含义、豁免变白名单）、7.6（Jev 长上下文和更多图片）、8.6（更多记录带原始消息）、9.6（绑定回落）。
3. 升级后第一天缓存全部重建，审核调用量和费用上升（5.9）。
4. 滚动升级期间不要发布带补审级的流程、不要创建 `llm_questions` 审核器；回滚前先撤掉它们（3.7、4.7）。
5. 不需要管理员重新批准权限。

---

## 12. 任务拆分

六个任务在同一分支上依次执行，每个任务结束时 `go test ./...`（`P:` 目录）和界面的 `vitest`、类型检查都通过，各提交一次。文件后面标"（续）"的表示前面的任务改过同一个文件，本任务在其基础上继续改；没有两个任务同时改一个文件。

### T1 流程引擎、结果映射、绑定回落（功能 1、7 的后端）

- **文件**：`migrations/0010_newapi_parity.sql`（一次写全，11.3）；`internal/moderation/flow.go`；`store.go`（只改 `fillFromTrace`）；`stats.go`（只改 `countRun` 的 `errors`）；`engine.go`（只改 `audit` 的签名，`prior` 先不使用）；`hook.go`（`runChunk`、`traceNote`）；`routes_config.go`（`tryWith` 的调用）；`snapshot.go`（绑定回落）；`routes_bindings.go`（`inactive`）；`analysis_prompt.go`；`analysis_tools.go`（`stage_failed`）；测试 `unit_test.go`、`extract_test.go`、`hook_test.go`、`account_binding_test.go`、`stats_api_test.go`。
- **完成标准**：3.1 的九条和 9.3 的规则都实现；迁移在 0.7.2 的库上执行两次都成功。
- **证明**：3.9 和 9.8 列出的全部 Go 测试。

### T2 审核器：题表式 LLM 与 Jev 引擎（功能 2、5 的后端，1e 的引擎一侧）

- **文件**：`engine.go`（续：新类型、`compileAuditor`、`audit` 分支、Jev 常量与请求头、版本号表）；新文件 `engine_llmq.go`、`jev_image.go`；`routes_config.go`（续：`validateAuditor` 的文案）；`routes_misc.go`（`importConfig` 的类型映射）；`go.mod`、`go.sum`、`next/go.work.sum`；测试 `engine_llmq_test.go`、`jev_image_test.go`、`unit_test.go`（续）、`hook_test.go`（续）。
- **完成标准**：`llm_questions` 审核器能创建、试跑、进流程并收到初审命中；导入 N 的 `llm` 审核器成功；Jev 按 7.3 发送。
- **证明**：4.8、7.8 的全部测试。

### T3 设置、时机与名单、原始消息（功能 4、6 的后端，以及全部新设置键）

- **文件**：`settings.go`（四个新键、两个旧键的兼容读取、`defaultLevel`）；`forms/settings.schema.json`、`forms/settings.ui.json`（5.5、6.6、8.4，以及 3.6 提到的两处旧文案）；`hook.go`（续：`precheck`、`moderate`、`admit` 的时机、`finish` 的原始消息条件）；`store.go`（续：`afterWrite`、`liveWatchEntry`、`countWatchHit`、`refreshLoop`）；`watch.go`；`analysis_queue.go`；`routes.go`（`UserState`、`createBlock`）；`watch_list.go`；`stats_api.go`（`Status.DefaultLevel`）；`flow_versions.go`（`simulateFlow`）；`plugin.go`（`parityDone`）；新文件 `parity.go`；测试 `lists_test.go`、`hook06_test.go`、`hook_test.go`（续）、`llmproto_test.go`、`unit_test.go`（续）、`stats_api_test.go`（续）。
- **完成标准**：6.3 的时机和名单规则、6.4 的一次性转换、8.3 的保存条件都实现；`verdict_cache_days` 已能解析并算出 `cacheTTL`（缓存逻辑本身留给 T4）。
- **证明**：6.11、8.7 的全部测试；`TestVerdictCacheTTLSettings`（放在本任务的 `unit_test.go` 里）。

### T4 判定缓存（功能 3 的后端）

- **文件**：`cache.go`；`snapshot.go`（续：`cacheEpoch`、`fp`、新主题）；`flow.go`（续：`Trace.Cache`、`CacheInfo`；删除 `anySkipped`）；`hook.go`（续：`admit` 的查询与重放、`runKey`、`runPost`、`settleVerdicts`、`finish`、新函数 `replay`）；`store.go`（续：`Replayed`、INSERT、`afterWrite`、`countViolations`）；`stats.go`（续：`replayed`、`countReplay`、`writeStats`）；`stats_api.go`（续：`loadStats`、`TodayCounts`、`FlowPoint`）；`routes.go`（续：路由、`Event`、过滤、`reviewEvents`、`Runtime`）；`plugin.go`（续：主题订阅）；`analysis_tools.go`（续：`replayed`、工具说明）；`manifest.json`（只加路由）；测试 `verdict_cache_test.go`、`hook06_test.go`（续）、`extract_test.go`（续）、`stats_api_test.go`（续）、`unit_test.go`（续，`TestLRU`）。
- **完成标准**：5.3 的全部规则实现；旧命名空间不再读写。
- **证明**：5.10 的全部测试；`manifest_test.go` 通过。

### T5 界面（功能 8）

- **文件**：`ui/native/src/` 下 `types.ts`、`host.ts`、`messages.ts`、`flowOps.ts`、`trace.ts`、`bindingOps.ts`、`settingsForm.ts`、`StageCard.vue`、`FlowCanvas.vue`、`StagePath.vue`、`TraceView.vue`、`FlowSimulate.vue`、`FlowsTab.vue`、`FlowGroupsCell.vue`、`AuditorEditModal.vue`、`AuditorsTab.vue`、`JevQuestionsEditor.vue`、`SettingsTab.vue`、`EventsTab.vue`、`EventDetail.vue`、`ReviewActions.vue`、`useBulkReview.ts`、`WatchTab.vue`、`WatchDetail.vue`、`WatchEditModal.vue`、`WatchActions.vue`、`UserStateSection.vue`、`BlocksTab.vue`、`BindingsTab.vue`、`BindingEditModal.vue`、`OverviewTab.vue`、`overview/StatusLine.vue`、`overview/TrendCard.vue`、`moderation.css`；测试 `flowOps.spec.ts`（新）、`bindingOps.spec.ts`、`settingsForm.spec.ts`、`messages.spec.ts`。
- **约束**：只用 `@sub2api/ui` 和 `@sub2api/host`；中英文案成对添加（`messages.spec.ts` 会检查两种语言的键一致）。
- **完成标准**：3.6、4.6、5.8、6.9、7.5、9.5 列出的每一项都能在页面上操作或看到；`vue-tsc` 和构建通过。
- **证明**：3.9、6.11、9.8 里的界面测试；手工走查清单（写进提交说明）：建一个带补审级的流程并发布；建 `llm_questions` 审核器并试跑；看一条重放记录的详情；清空缓存；白名单用户的名单操作；停用流程的绑定提示。

### T6 文档、版本、发布核对

- **文件**：`manifest.json`（续：`version` 0.8.0，按 11.2 决定是否改 `kv` 的 `reason`）；`manifest_test.go`（如有版本断言）；`docs/CONTRACTS.md`（11.4 的各小节）；`docs/HANDOFF-2026-10-31-MODERATION-GAPS.md`；`docs/PROGRESS.md`。
- **完成标准**：§72 与代码一致，不再有"出错一律放行""不回落""豁免""只缓存通过"这类过时的说法；11.5 的发布说明成文；在一个 0.7.2 数据的副本上实际升级一次并记录结果（迁移、一次性转换的条数、9.6 查询的结果）。
- **证明**：全部 Go 与界面测试再跑一遍；升级演练的记录。

---

## 13. 未决问题

每条后面是推荐的默认做法；本文正文已按推荐做法写。

| # | 问题 | 推荐 |
|---|---|---|
| Q1 | 默认级别用现有的 `mode` 三个值表达（6.3 决定 1），还是新增独立的 `default_level` 键加一个开关？后者与 N 的键名一致，但要处理已存设置的转换，回滚后旧版本读不到新键 | 沿用 `mode` |
| Q2 | `exempt_user_ids` 直接读成白名单（升级后这些用户开始被后审、有记录），还是保留"完全不审核"作为 P 独有的第三种名单？线上为空，两种做法对线上都没有影响 | 读成白名单，不保留"完全不审核"（一比一） |
| Q3 | 升级时把 `mode = enforce` 下自动加入的观察级条目转成拦截级（6.4）。不转的话这些用户升级后只后审 | 转换；手动和 AI 设的观察级不动 |
| Q4 | 绑定到停用流程的绑定（9.6）：迁移时自动改成免审，还是只给查询、由管理员决定？ | 不自动改；发布前跑查询并人工处理 |
| Q5 | 缓存键用判定指纹（5.3.2），还是保持现在的 `config_version + flow_version`（实现更少，但任何配置写入都清空缓存，长 TTL 实际用不上）？ | 判定指纹 |
| Q6 | 出错记录是否也按 `record_pass_input_message` 保存原始消息（N 会存）？ | 不存，保留 §72.9 的保护 |
| Q7 | 重放不分用户（5.3.9 第 1 条）：B 用户第一次发 A 用户已被缓存的违规内容，不进名单、不计违规。可以在 `storedHit` 里记来源用户，来源用户不同时按新的违规处理（约十行代码），但这与 N 不同 | 先与 N 相同；负责人要更严时再加 |
| Q8 | Jev 每次调用都开长上下文（N 文档写明更慢、准确度略低）。P 的块最多 100000 字，本来就不需要长上下文来放文字，只是为了多放图片 | 照 N 一律开；上线后看 Jev 渠道的延迟和命中率，有问题再改成"只在超过默认上下文时开" |
| Q9 | 新增依赖 `golang.org/x/image`（7.4）。构建在 ovh 上进行，需要确认构建环境能拉到这个模块，或需要预先放进模块缓存 | 加依赖；T2 开始前先在构建机上验证 |
| Q10 | 图片解码上限 1200 万像素（7.3）是按 512 MB 内存上限估的，没有实测 | 先用 1200 万；T2 里加一个内存基准测试（两张 1200 万像素的 16 位 PNG 同时重画）确认峰值 |
| Q11 | 新审核器类型的名字 `llm_questions` 和界面名称"LLM 题表" | 采用 |
| Q12 | `kv` 权限的说明文字要不要改（11.2） | 核心不因 `reason` 变化要求重新批准时才改 |
| Q13 | 白名单用户不被自动封禁、不能手动封禁（6.3）。N 没有封禁，无从对照 | 采用（白名单 = 永不被拦截） |
| Q14 | `auditors` 的 CHECK 约束名（4.4） | 已核对（2026-11-10 线上库）：约束名是 `auditors_type_check`，迁移照 11.3 写 |
| Q15 | 清空缓存后 KV 里的旧键不删除，最多占用到 TTL（30 天）到期（5.3.7）。按 N 的估算一周约 25–45 MB | 接受；真有压力时再加一个后台按前缀删除的任务 |

---

## 附录 A：本次不处理的已知差异

以下差异已核实存在，这次不设计、不实现：

1. 记录列表接口返回的字段（N 的 `Top`、`Thresholds`、`Labels`、各级分数等）。
2. `review_status` 的默认值。
3. 人工处理撤销后的计数规则（N 和 P 都只在观察级的当前窗口里退回计数；默认拦截下拦截级计的违规两边都不退）。
4. 流程启用开关是否产生版本（N 的 `enabled` 在 spec 里，P 是单独一列）。
5. 只读权限的规则。
6. 统计口径的其他定义（例如全部命中缓存时 N 只在先审或请求以 user 消息结尾时计数；"今日审核数"的组成）。本文只改了与功能 1、3 直接相关的两处：流程行 `errors` 和 `replayed`。
7. 告警阈值为 0 的含义。
8. 拦截响应的格式和错误码。
9. 队列设置（N 的 `worker_count`、`post_concurrency`、`queue_size`；P 的 `max_concurrency`、`queue_size`）。
10. 渠道字段的校验。
