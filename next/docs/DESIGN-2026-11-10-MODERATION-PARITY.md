# 提示词审核 0.8.0：与 new-api 内容审核对齐（设计文档）

> 日期：2026-11-10。状态：已实现（T1–T6），并按代码审核的结果修改；本文已改为与代码一致，审核后的改动汇总在第 14 节。尚未发布。
> 分支：`feat/moderation-newapi-parity`（从 0.7.2 的提交 `c31b3c4cb` 起；插件版本 0.8.0）。
> 发布与回滚步骤见 `docs/RELEASE-MODERATION-0.8.0.md`。
> 参照实现：new-api 提交 `207797b76`（cp.294），只读。
> 本文是实现依据，也是实现后的说明：正文与代码不一致时以代码为准，并应改正本文。各节里的"P 现在的行为"指 0.7.2。第 13 节的未决问题都已按推荐做法实现。
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
- 发布（构建、上线、线上核对）不在本文和本分支的范围内，步骤见发布说明。

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

trace（`events.trace`）多出的键：`stages[].stage`、`stages[].failed`、`stages[].fallback`，都是 `omitempty`。

- `stages[].stage` 是这一级在 spec 里的序号（从 1 起）。trace 的 `stages` 只收录实际运行过的级：普通级链提前结束后运行的补审级，它在 `stages` 里的位置不等于它在 spec 里的序号。0.8.0 之前的记录没有这个键，读的时候按位置算（`Trace.stageNo`）。
- `decider` 的含义不变，但要写明：它是 `stages` 数组的下标（最后一个判定命中的级；没有则为 -1），不是 spec 的级序号。命中类别里的 `stage`、统计表的级行、漏斗、AI 分析工具返回的级号都用 spec 的级序号。

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
    Stage    int       `json:"stage,omitempty"`    // spec 里的级序号（从 1 起）；旧记录没有
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
func (t *Trace) stageNo(i int) int   // Stages[i] 在 spec 里的级序号；旧记录按位置
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

  命中的级把 `Decider` 设为 `len(tr.Stages) - 1`（它在 trace 里的下标），并给该级写上 `Stage = i + 1`；`runFallback` 里同样用 trace 的下标，`Stage = base + j + 1`。`decidingStage()` 忽略越界的 `Decider`（损坏的或外来的 trace）。
- `runFlow` 带 `recover`：运行中出现 panic 时这次运行按"没有任何一级判定"处理（`Final = Pass`、`Decider = -1`、`Errored = true`）。单个审核器调用另有 `auditSafely`。

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

**`stats.go`** `countRun`：去掉 `case ResultError: fc.errors++`，改为在 switch 之后 `if tr.Errored { fc.errors++ }`。级行、审核器行的键用 `run.stageNo(i)`（spec 的级序号），所以补审级的统计和漏斗落在它自己的级号上，不会记到普通级的行里。

**`plugin.go`** `runPostSafely`：post 工作协程对每个任务加 `recover`。pre 路径由 SDK 在钩子外层兜住，工作协程没有；任务运行或写记录时 panic，这个任务记为一次出错的运行（没有计过数的补计一次），进程和其他任务不受影响。

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
- 代码审核后补的测试（按功能放在各自的测试文件里，没有单独的"审核修复"文件）：`unit_test.go` 的 `TestFallbackDeciderIndexesTheTrace`；`hook_test.go` 的 `TestFallbackStageHitEndToEnd`（补审级命中时请求被拒绝，记录和统计显示 spec 的级号）、`TestPostWorkerSurvivesPanic`、`TestPostPanicIsCountedOnce`（后审任务在计数之后 panic 时不重复计数）、`TestPreRunSurvivesPanic`（先审的共享运行 panic 时进程不退出，请求按出错放行）。
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
4. **图片**（负责人 2026-11-10 的决定，第 15 节）。N 只审文字（4.1 最后一条）；P 的 `llm_questions` 和 `llm_verdict` 默认把图片和文字一起发给模型。审核器的 `review_images` 关掉后与 N 相同：图片全部计为 `skipped_images`，没有文字时跳过。

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
- 常量 `judgingVersion`（`snapshot.go`，现为 1）：代表"决定判定结果、但写在代码里而不在已存配置里"的东西，包括 OpenAI 各类别的默认阈值和类别表、`llm_verdict` 的默认类别和提示词模板、`llm_questions` 的提示词模板和答案读法、内置 Jev 题集及其发送和计分方式、片段的切分和渲染方式。以后的版本改了其中任何一项，就把这个常量加一，旧版本代码下缓存的结论不会被新代码沿用（`TestFingerprintJudgingVersion`）。

不进指纹的：流程名、`model_filter`、`sample_rate`、`total_timeout_ms`、渠道的名称、密钥、代理、超时、计费模型。

#### 5.3.3 存储

仍然是内存 LRU 加宿主 KV。KV 换用新的命名空间 **`verdict`**；旧命名空间 `pass` 里 0.7.x 的缓存键不再读写，到期自动消失。流程异常率告警的状态（`notify.go`）仍放在 `pass` 命名空间（常量 `alertNamespace`）：滚动升级期间新旧节点共用同一份告警状态，一段正在持续的告警不会因为升级再发一次。

| 键 | 值 | 说明 |
|---|---|---|
| `s:{scope}:{片段哈希 hex}` | 以空格分隔的若干项：`p<unix 秒>`、`h<命中 id hex>@<unix 秒>` | 片段键。`p…` 表示这个片段干净通过，数字是写入时间；每个 `h…` 是一个指针，指向这个片段所属的一个命中集合，数字是该命中的写入时间 |
| `h:{scope}:{命中 id hex}` | `storedHit` 的 JSON | 命中条目 |

片段键的值举例：

```
p1762770000 h9f2c…@1762770000 h41aa…@1762683600
```

命中 id = `sha256(K 的片段哈希按字节序排序后拼接)`。

```go
// storedHit is a cached hit of one chunk: the segments it sent, the run that
// decided it and the request it came from.
type storedHit struct {
    RequestID string   `json:"r"`
    Keys      []string `json:"k"` // 这一块实际送审的片段的哈希 hex，按请求顺序
    Trace     Trace    `json:"t"` // 这一块自己的运行；Chunk、Chunks、Input、Cache、InputMessageDropped 清空
    At        int64    `json:"at"`
}
```

规则（`cache.go` `segValue`）：

- **通过不抹掉指针**。一个片段键同时保存"通过"和指针。命中集合 K 的各个片段在别的请求里可能各自单独通过（例如 K 里的系统提示词片段）；如果通过把指针覆盖掉，K 的命中就会被逐个片段的通过"洗"成放行。所以写通过时保留已有指针，查的时候先看有没有完整的命中集合，再看通过（5.3.4）。
- **每个片段最多 8 个指针**（`maxSegHits`），保留写入时间最新的 8 个。被很多命中集合共用的片段（系统提示词）会丢掉较旧的指针，那些集合仍能通过它们别的片段找到；一个命中只有在它的每个片段此后都进了 8 个以上更新的命中集合时才找不到。
- **值里带写入时间，不续期**。片段键里的每一项、命中条目的 `at` 都是各自的写入时间；读到的任何一项，只要距写入超过 `verdict_cache_days` 就不用（`liveAt`），不论是从内存还是从 KV 读到的。从 KV 读进内存的值按原来的写入时间算到期，不重新计时。KV 键的 TTL 取值里最新一项的到期时间。
- 读不懂的项忽略，对应的片段按未知处理、重新送审。
- KV 的值上限是 64 KiB。`storedHit` 序列化后超过 60 KiB（`maxHitBytes`）就不存这个命中（照常写记录）。
- KV 没有比较并交换：改片段键是"读出、修改、写回"。同一节点内按键串行（`kvLock`，64 把锁，`kvLockStripes`）；不同节点在几毫秒内同时改同一个键时可能丢掉其中一方的修改。丢一个通过的后果是多审一次；丢一个指针的后果是少一次重放，命中仍能通过集合里别的片段找到。
- **内存是 KV 的前端，别的节点新写的指针要能传到**。节点 X 的内存里可能只有片段 A、B 各自的"通过"，而节点 Y 刚把 {A, B} 合在一起审出命中并写进了 KV；X 只看内存就会把 {A, B} 答成 `pass (cached)`。两条措施限定这种状态持续的时间：
  1. **广播**。一次运行把命中写进 KV 之后，把它写了指针的那些片段键用 `verdict.changed` 广播出去（负载带 `"stored": true`）；收到的节点把这些键从内存里删掉，下一次查询从 KV 读（只删不立墓碑：立墓碑会让本节点正在进行的运行写不进被很多命中共用的片段，例如系统提示词）。这是正常路径：从广播送达起，这个命中在其他节点上就生效。
  2. **到期重读**。广播可能丢。内存里的片段值自上次从 KV 读出（或在本节点写入）起只用 5 分钟（`verdictRecheck`）；到期后，下一次查询把它重新读一遍，**用 KV 里的值替换内存里的值**（`resyncSeg`；不是并入：并入会让别的节点上人工处理删掉的指针或"通过"一直留到过期），每次查询最多重读 64 个这样的键，最久没读的在前。替换时有两点：旧值里写入不到 4 秒（`tombstoneTTL`）的项保留——那是本节点某次运行刚写的，它的后台 KV 写可能还没落地（运行改内存里的值时不更新"上次读 KV"的时间，所以到期的值里可能有这样的新项），下一次重读时再由 KV 决定；旧值指向的命中条目（上述新项除外）同时从内存里删掉，之后还有指针指向它时从 KV 重读，所以 KV 里已被删掉的命中不会继续从内存重放。带 KV 的查询（pre 时机下的钩子、post 的工作协程）先读再判断；只看内存的查询（post 时机下的钩子，它从不等 KV）在后台读（`recheckSoon`，连同这些值指向的命中条目一起读进内存；一个节点同时只有一批）：发现到期的那个请求仍按内存里的值回答，下一个请求就用上读回来的值。
  
  所以**广播丢失时，一个节点写入的命中、一个节点上做的人工处理（误报、确认、待处理），最迟在别的节点上次从 KV 读这些片段键的 5 分钟后在那个节点上生效**（它从没读过的值：从它写入时算；前提是 KV 可读；post 时机下再晚一个请求）。三种情况不受这个时限约束，都在读到该键的那次查询结束：一个请求里到期的值超过 64 个（多出来的本次照旧使用，下次查询排在最前）；KV 读失败或超出查询预算（用内存里的值）；本节点自己写入、当时没能从 KV 读到的片段（5 分钟从写入时算）。替换的另一面：本节点写进了内存、却没能写进 KV 的"通过"（后台写失败，或一次运行超过 64 个新片段时多出来的），在第一次读到该键的重读时消失——以 KV 为准，这些片段再审一次。命中不这样处理：没落到 KV 的命中留在内存里并重写 KV（5.3.5"没落到 KV 的命中"一条，第四轮）。

  **`stored` 广播的一个窗口（写明不改）**：收到广播时删键，挡不住当时正在进行的两件事——一次在指针写入之前就读了 KV 的查询，会在删键之后把旧值放回内存；一次刚好在删键之后结束的运行，会只凭自己的"通过"新建一个值。两者都标成"刚读过"，于是这个值等同于没收到广播：最迟到它的下一次重读（5 分钟）为止。要关掉这个窗口，得像人工处理的墓碑那样给每个被删的键留一个比进行中的读更久的标记，而墓碑会让本节点的运行写不进被很多命中共用的片段（上面第 1 条），所以不做。
- **内存 LRU**：条数上限 `cache_entries`，另有字节上限 64 MiB（`cacheMaxBytes`，按键长加值长加每条约 128 字节的开销估算）。任一上限超出时从最久未用的开始丢。片段条目约 250 字节，64 MiB 约 25 万条：`cache_entries` 设得更大时实际由字节上限约束。命中条目在内存里保存解码后的结构（不在每次查询时重新解析 JSON），占用按 JSON 长度的两倍估算。墓碑（5.3.8）也计入字节数（键长加约 64 字节），到期后在下一次查看墓碑时清掉，不用等下一次人工处理。64 MiB 的由来：插件内存上限 512 MB，处理中的请求默认占 128 MB（`max_inflight_mb`），图片解码占 112 MB（7.3），其余留给队列和垃圾回收。`GET /status` 的 `runtime.cache_entries`、`runtime.cache_bytes` 给出当前条数和估算字节数。

#### 5.3.4 查

`admit` 里取代 `cachedSegments` 的调用，函数是 `lookupVerdicts(scope, keys, useKV)`。对请求的全部片段：

1. 取每个片段键的值：先内存；`useKV` 时未命中的再查 KV（沿用原来的上限：最多 64 个、取请求里最靠后的 64 个，8 路并发，总共 200 ms），内存里已满 5 分钟没从 KV 读过的值也在这一步重读（另计最多 64 个，最久没读的在前；只用 200 ms 的前一半，见下；见 5.3.3 的"到期重读"）。未命中的片段从 KV 读到的值并入内存，到期重读读到的值替换内存里的值（都保留各项的写入时间；这个键刚被人工处理改过、还在墓碑期内时不动内存，见 5.3.8）。不带 KV 的查询照用内存里的值，到期的那些在后台重读。
2. 收集各片段的指针（按请求顺序，每个片段内新的在前），取对应的命中条目（内存，没有再查 KV，最多 64 个，计入同一个 200 ms）。读的结果分三种：读到了；KV 明确回答"没有"（或内容读不懂、已过期）——指针失效；**没能读**——KV 出错、预算用完、超出 64 个，或只看内存的查询里条目不在内存。
   - 预算：一次查询最多读 64 个未命中的片段、64 个到期的值、64 个命中条目，8 路并发，合计 200 ms。未命中的片段和命中条目决定内容是否已知，到期的值可以等下一次查询，所以到期重读只能用前 100 ms，不会把命中条目的时间挤掉。
3. **先找命中**：按上面的顺序，第一个"条目存在、未过期、且 `Keys` 全部在本请求的片段集合里"的命中决定这个请求，走重放（5.3.6），不再分块。这一步在看任何"通过"之前。
4. 没有可重放的命中 → 带有未过期 `p…` 的片段算已放行，其余（包括指针失效、集合不完整的）送审。**例外：片段有一个未过期的指针，而它指向的命中条目没能读**，这个片段本次按未知处理，不管它有没有"通过"——那个命中可能正好覆盖本请求；pre 时重新送审，post 的钩子里入队、由工作协程带 KV 再查（`TestUnreadableHitEntryIsUnknown`）。在此之前这种片段按"通过"回答：KV 只在读命中条目时出错，或命中条目被内存 LRU 淘汰后，一个完整的命中集合会被答成 `pass (cached)`。之后与以前相同：`makePlan`，全部已放行则计 `cache_skipped`，note 为 `moderation: pass (cached)`。一处不同（第五轮，5.3.5"没缓存的图片总是和本请求的文字一起审"）：**混合流程**（有的审核器收图片、有的不收）的请求里有没缓存成"通过"、这次要送审的图片时，`makePlan` 不把已放行的文字片段拿掉。

KV 出错或超时：没读到的片段、指向没读到的命中条目的片段按未知处理（到期重读没读到的沿用内存里的值），照常送审，计数器 `kvErrors` 加一。这个计数器在 `GET /status` 的 `runtime.kv_errors` 和健康指标 `kv_errors` 里输出（本节点启动以来的累计值）：一批 KV 调用里有失败或被预算截断算一次，告警状态的读写失败各算一次。

post 的请求在 `admit` 里只看内存（`useKV = false`）；出队执行前（`runPost`）再带 KV 查一次：可重放 → 重放；送审的片段全部已放行 → 计 `cache_skipped`；否则按入队时的分块运行。**入队之后缓存被清空过的任务**（当前快照的 `cache_epoch` 与入队时不同）跳过这次查询直接运行：它的范围是已被清空的那个，不能用里面的结论回答（`TestQueuedJobAfterClear`）。

试跑、测试、模拟不读也不写缓存（这些路径的 `m.plan` 为 nil）。

#### 5.3.5 写

`settleVerdicts` 取代 `cachePasses`。对这次运行的每个块，按它自己那次运行：

| 该块的运行 | 写入 |
|---|---|
| 块里有 URL 图片，或 `Errored` | 不写 |
| `Final == Hit` | 写命中条目，并在该块**实际送审的**每个片段的键里加上指向它的指针 |
| 通过（含被推翻），块里有图片被某个审核器收到、却没有被任何通过的审核器收到（`judgedUnpassedImage()`） | 不写：整块（含文字）下次重新审（见下，第四轮） |
| 通过（含被推翻），且没有任何一级整级跳过（`stageSkipped()`） | 这个块给它的每个片段记一次"通过"；**图片只有被"自己判了通过的审核器"收到过才记**（见下） |
| 其他 | 不写 |

片段写 `p…` 的条件不变：包含它的每一块（含抽样没跑的块，`plan.pieces`）都记了"通过"。

与 0.7.2 的差别：
- 命中会写入。
- "有审核器跳过"从"任何一个审核器跳过"（`anySkipped`）放宽为"有一整级跳过"（`stageSkipped`），照 N。例：一级里 Jev 判了、只读文字的 LLM 因为块里只有图片而跳过，这一级算判过。

实现后定下的几点：

- **命中集合只列实际送审的片段**（`sentKeys`）。流程里没有收图片的审核器时，块里的图片在送审前被丢掉（`dropImages`）；这些图片的片段不进命中集合，否则集合里会有"没人看过"的内容。它们仍随块一起记"通过"：这个流程对图片没有意见，流程里加进收图片的审核器时指纹会变。
- **没有审核器实际收到的图片不记"通过"，也不进命中集合**（`unreceived`）。流程里有收图片的审核器，但这张图这次没有发给任何一个做出了判断的审核器——没等到重画名额或重画时间预算、解码内存预算不够、图片太大或解不了、超出一次请求的 token 或体积预算、请求过大重试时只带第一张——那么这次运行对它没有结论。OpenAI 审核器例外：它每次调用只随机带一张图，这一张是抽样，代表这次输入里全部可用的图片，调用成功时这些图片都算收到、一起记"通过"，不为没抽中的图片再调用（负责人 2026-11-10 的决定：不浪费调用；代价是一次请求里多张图只有一张真正被看过，与 0.7.2 相同）。带图请求被 400 拒绝、改为只发文字重试时（OpenAI 审核器和两种 LLM 审核器，第 15 节），图片都不算收到。每次引擎调用在结果里记下上游实际收到的是输入里的第几张图（`EngineResult.received`，不进存下来的 trace；内容相同的重复图片算收到），`settleVerdicts` 只给收到过的图片记"通过"。同一块里的文字照常记"通过"；带这张图的下一个请求再送它——混合流程里连同该请求的文字一起（见下"没缓存的图片总是和本请求的文字一起审"），其他流程里通常只送这张图。没收到的原因一直存在时（例如图片解不了），这张图永远不会被缓存，每次请求都会为它走一次运行：混合流程里把请求的文字再送一遍，其他流程里这样的运行没有可发的内容，不产生上游调用。在此之前，这样的图片随块一起被记成"通过"并写进 KV：占满两个重画名额后发"无害文字加违规图片"，图片被跳过、文字通过，图片片段在所有节点上被当作已放行 `verdict_cache_days` 天（`TestSkippedImageIsNotCachedAsPassed`）。
- **图片记"通过"的规则**（`Trace.passedImages`）：一张图片记"通过"，当且仅当它被某个审核器收到（`received`），这个审核器**自己的结果是通过**（判了、没命中），并且它所在的级的结果是通过。命中的审核器不能为它收到的图片作保，没收到图片就通过的审核器对图片什么也没说。最终通过的运行里，结果为通过的级正好是这次通过所依据的级：单级 `any`——判了的审核器都通过，各自算数；单级 `all` / `at_least`——这一级通过但可以有审核器命中，只有通过的那些算数；被推翻的运行（命中、…、通过）——只有推翻它的那一级算数，前面命中的级不算；第一个做出判断的级就通过、之后跑补审级——补审级都通过（命中就是最终命中），每一级都算数，图片在其中任何一级被通过的审核器收到即可；失败或被跳过的级没有"通过"的结果，不算数（这样的运行本来就整个不写）。命中集合仍然用"任何做出判断的审核器收到过"（`receivedImages`）。在此之前记"通过"也用后者：第 1 级 OpenAI 收到图片并命中，第 2 级 Jev 没等到重画名额、只审了文字并通过，运行被推翻，图片片段被记成"通过"，之后同一请求直接 `pass (cached)`，而 Jev 从没见过这张图；同一级里 `all` / `at_least` 也一样。f08396607 之后 OpenAI 一次调用代表全部可用图片，所以任何 OpenAI + Jev 的流程里 Jev 跳过的图片都会这样（`TestImagePassNeedsAPassingAuditor`）。
- **只被命中的审核器收到的图片：整块不记"通过"**（第四轮，负责人 2026-11-10 的决定；`Trace.judgedUnpassedImage`）。规则：一个块的运行最终通过，但块里有一张图片**被某个做出判断的审核器收到过（在 `receivedImages` 里）、却没有被任何通过的审核器收到（不在 `passedImages` 里）**，这个块的**所有片段都不记"通过"，文字也不记**。没有这种图片的块不受影响；"文字加一张谁也没收到的图片"仍按上一条：文字缓存，图片不缓存。原因：只按上一条处理时，同一个请求第一次放行、第二次被拒绝——第 1 级 OpenAI（或 Jev）收到图片并命中，第 2 级是收不到图片的复核（关了图片的 LLM 审核器或 Jev，或这一次没收到这张图的审核器——没等到重画名额的 Jev、上游以 400 拒绝了图片的 LLM 审核器）只审文字并通过，运行被推翻，请求放行，文字记"通过"、图片不记；第二个相同的请求里文字已缓存，图片单独成块，第 1 级再次命中，第 2 级没有可审的文字、整级跳过，命中成立（3.1），请求被拒绝、计一次违规，命中集合 {图片} 进缓存，此后一直重放。同一级 `all` / `at_least` 里另一个审核器没收到图片也一样。负责人的决定：这种情况按"没有得出结论的审核"处理，放行，而且**每次都一样**——所以这样的内容每次都整块重新审，每次得到同一个结果（`TestImageOnlyAHittingAuditorSawGetsTheSameVerdict`：同一请求三次，每次都调用审核器、都放行，没有命中记录，不计违规）。只凭这一条，"每次都一样"还取决于别的请求：另一个请求把同样的文字审过并缓存后，图片仍会单独成块；第五轮的规则（下一条）补上了这一点：混合流程里，同一个请求的结果不随别的请求缓存了什么而变（非混合流程里剩下的情形见下一条"只用于混合流程"）。**代价：这类请求永远不走缓存，每个请求都重新调用审核器。** **保留的例外**：这张图片在某个请求里**单独**出现（请求里只有它，没有文字）时，第 1 级命中、后面没有可供复核的内容，命中集合 {图片} 进缓存，此后所有含这张图的请求都按重放处理（先审的被拒绝），包括之前放行过的；那是另一个请求确立的命中，不改。与 N 不同：被后面只读文字的复核推翻的图片命中，P 每次都放行；N 会拒绝，因为 N 里一张图片自成一个内容块，只读文字的审核器推翻不了它（第 10 节第 26 条）。
- **没缓存的图片总是和本请求的文字一起审**（第五轮；负责人 2026-11-10 的决定之后**只用于混合流程**，见本条第二点；`makePlan`、`request.sendsImage`、`planLimits.mixed`、`snapshot.mixedImages`）。上一条让这样的块自己不记"通过"，但文字可以被**别的请求**缓存，而 `makePlan` 把已放行的片段从块里拿掉：请求 X = [文字 T, 图片 I] 放行、什么都不缓存；另一个只有 T 的请求通过，T 记"通过"；再发 X，T 已缓存，I 单独成块，收图片的审核器命中，复核整级跳过，X 被拒绝、计违规，{I} 进缓存并从此重放。"系统提示词加一条只有图片的 user 消息"就是这样：缓存为空时放行，系统提示词已缓存时被拒绝。
  - **规则**：流程是混合流程、请求里至少有一张图片没缓存成"通过"、并且这次会放进块里时（`input_max_images` 大于 0；图片没超过大小上限），`makePlan` **不拿掉已放行的文字片段**；已放行的图片照旧拿掉。于是一张图片总是和它所在请求的文字一起审，结果不取决于别的请求缓存了什么。没有这种图片的请求（没有图片；图片都已放行；`input_max_images` 为 0；图片过大）和非混合流程的所有请求与第五轮之前完全相同：已放行的片段都不送，全部已放行即 `pass (cached)`。可重放的命中在分块之前就决定了请求（5.3.4 第 3 步），不受影响。
  - **只用于混合流程**（负责人 2026-11-10 的决定，在第五轮之后）。混合流程 = 流程的各级合计，至少有一个收图片的审核器、又至少有一个不收图片的审核器（`snapshot.mixedImages`，每个流程算一次，与 `sendsImages` 并列；OpenAI 审核器总是收，Jev 和两种 LLM 审核器看各自的 `review_images`）。
    - 原因：这条规则的代价比第五轮时估计的高。请求里只要有一张进不了缓存的图片（最常见的是 URL 图片），带它的每个请求都把整段文字重审，`input_overflow = block` 时还可能被拒绝。而它要防的不一致，是不收图片的审核器**每次**都只看文字、可以让收图片的审核器命中的内容通过——这只在混合流程里是常态。
    - 全部审核器都收图片的流程（生产上的 Jev + 开着图片的 LLM 复核，第 15 节）：复核也收到图片，它通过时图片记"通过"、可以缓存，同一请求之后直接 `pass (cached)`；它命中时命中成立。这类流程不再留下文字，分块与第五轮之前相同（`TestLLMReviewerSeesTheImage`）。没有收图片的审核器的流程本来就不受这条规则影响。
    - **非混合流程里剩下的情形（已知，接受）**：收图片的审核器这一次没收到某张图片——URL 图片（只有 OpenAI 审核器收）；超出该审核器上限的图片（LLM 审核器不重画，15.2；Jev 会重画）或它的上游不收的图片；Jev 没等到重画名额或重画时间；LLM 的上游以 400 拒绝了图片、只审了文字（15.4）——而另一个审核器收到了这张图并命中。这次运行仍按上一条处理（放行，整块不缓存）。但文字被别的请求缓存之后，图片单独成块，没收到图片的审核器没有可审的内容、被跳过，命中成立：**同一个请求缓存为空时放行、文字已缓存时被拒绝**，计一次违规，{图片} 进缓存并重放（块里是 URL 图片时不进缓存，但每次都被拒绝）。这正是第五轮修掉的那种不一致，收窄后在非混合流程里留下；它需要"一个审核器收到图片并命中、另一个本来收图片的审核器这次没收到、文字又被别的请求缓存"三件事同时成立。第五轮的测试原来用的就是这种流程（OpenAI + 开着图片但占满重画名额的 Jev），收窄后那个序列在该流程上被拒绝，测试改用真正的混合流程（OpenAI + 关掉图片的 Jev）。
  - **切开的片段**：留下的文字和没缓存的文字一样分块，比一块长的片段照样切成若干块，`plan.pieces` 照常计数。
  - **块数上限与抽样**：块的划分只由文字决定（图片跟着当时正在装的块），所以留下文字后的块就是缓存为空时的块，只在所带的图片上不同（已放行的图片不在块里，`input_max_images` 只数没缓存的）。抽到哪些块（`spread`）只取决于请求本身，同一个请求每次相同；`input_overflow = block` 时先审的请求按整个请求的文字判超长，每次相同。没抽到的块不审，里面的图片仍是未缓存，下一次照同样的分块。与没有这种图片的请求不同：后者只算没缓存的部分。
  - **`pass (cached)` 与 `allPassed`**：有这种图片时总有至少一个块，不会走 `pass (cached)`——图片的结论未知，本来也不该走。post 出队时 `allPassed` 看的是块里的全部片段，留下的文字（已放行）和图片都在内：图片在入队后被别的请求审过并通过时，任务不运行。
  - **post 的入队与出队**：入队时（`planUncached`，只看内存）按上面的规则分块，只在 KV 里记了"通过"的图片当作未缓存、文字留下；出队时不重新分块，带 KV 查一次，全部已放行则不审，否则按入队时的块运行——图片和它的文字在一起。
  - **写**：`settleVerdicts` 不用改。块正常通过时，留下的文字和别的片段一样重新记一次"通过"（写入时间更新为这次审核的时间）；块落在上一条时什么都不记，文字在别的请求里得到的"通过"也不再能绕开上一条，因为它不会把文字从块里拿掉。块命中时命中集合是文字加图片（之前文字已缓存时是 {图片}）。`trace.input.cached_segments` 不把留下的文字算作命中缓存。
  - **代价**：带着没缓存成"通过"的图片的请求把已放行的文字再审一遍。图片随后通过并缓存的，只多这一次；图片一直进不了缓存的（URL 图片；审核器收不了的图片，例如解不了的；上一条说的只被命中的审核器收到的图片；一直落在没抽到的块里的图片），带它的**每个**请求都如此——一个对话里有这样一张图片后，之后每一轮都把整段对话的文字重审（最多 `input_max_chunks` 块），而不是只审新增内容。
  - 测试：`TestImageVerdictDoesNotDependOnCachedText`（上面的序列，混合流程——OpenAI 加关掉图片的 Jev，两级推翻和单级 `all`：X 放行，只有 T 的请求通过并缓存，X 再发两次都放行、两个审核器都收到文字、图片随文字送一次，没有命中条目、可疑记录、重放和违规）、`TestHookSendsCachedTextWithANewImage`（没有图片的请求不送已缓存的文字；混合流程里新图片连同已缓存的文字在一次调用里送出，非混合流程里新图片单独送出；通过后同一请求 `pass (cached)`；图片已缓存时只送新文字）、`TestPlanKeepsCachedTextWithAnUncachedImage`（混合流程：分块与缓存为空时逐块相同，含切开的片段和抽样；非混合流程、`input_max_images` 为 0、图片已缓存时照旧）、`TestLLMReviewerSeesTheImage`（非混合流程上的同一序列：文字先被缓存，图片单独送给两个审核器，复核看图后通过，图片进缓存）。去掉这条规则，前三个测试都失败（第一个：只有 T 的请求之后 X 被拒绝，{I} 进缓存）；把规则用回所有流程，第二、三个测试的非混合部分和第四个测试失败。
- **每次运行只结算一次，不是每个请求一次**。pre 的共享运行在结算（或合并各块的运行）时 panic，不改变审核器已经做出的结论：结果仍是各块运行合并后的 trace，命中照样拒绝并记录，丢掉的只是这次缓存写入（`afterPanic`；`TestPreRunSurvivesPanic`）。合并本身再次 panic 时（第四轮）：第一个命中的块的运行单独作为结果——带上它的块号（多块时），不带其他块的运行和请求的输入信息，记录的 `trace.cache` 指的是这个块的命中集合；各块都没有命中时按"出错"的运行处理。运行结束之后，钩子协程上计数、交记录的一步（`concludePre` / `finish`，以及重放的记录）panic 时也不改变回答（`concludeSafely`、`replaySafely`，第四轮）：记日志，命中照样拒绝，其余照样放行，丢的是这条记录——否则 panic 交给 SDK 的 recover，钩子算失败，核心按 `failure: open` 放行一个审核器已判命中的请求（`TestHitStandsWhenRecordingPanics`）。只有在各块的运行返回之前的 panic 才得到"出错"的运行。pre 的共享运行（singleflight）在运行函数里结算：不论有几个请求在等它、也不论等的请求是否都已离开，都只写一次（`TestPreRunStoresVerdictsOnce`）；post 由工作协程结算。
- **范围用结算时的清空纪元**，不是运行开始时快照里的：缓存在运行期间被清空时，结论写到现在会被读到的范围里，已清空的范围不再写入。
- 写入时机：内存立即写；KV 在后台协程里写，预算 2 秒（钩子不等 KV）。N 是同步写。别的节点什么时候看到：内存里没有这些片段的节点，在 KV 写完后的下一次查询就读到；内存里已有这些片段（只有"通过"）的节点，在收到写入节点的 `verdict.changed` 广播后读到，广播丢失时最迟在它上次从 KV 读这些键的 5 分钟后读到（5.3.3"内存是 KV 的前端"一条；第 10 节第 6 条）。每次运行写进 KV 的通过最多 64 个（最靠后的），每个命中最多写 64 个片段的指针；命中条目没写成功时不写指向它的指针。
- **没落到 KV 的命中留在判出它的节点上，到期重读时重写**（第四轮；`cacheEntry.unlanded`、`lru.landed`、`lookup.rewrite`）。后台写不重试。本节点某次运行存进内存的命中条目带一个"未落地"标记，只有这次写的命中条目**和**它的全部指针都写成功（`writeVerdicts`）才去掉；从 KV 读进内存的命中条目没有这个标记。到期重读替换片段值时（5.3.3），指向"未落地"条目的指针和这个条目本身都保留（不管 KV 里有什么），并在后台把命中条目和指针再写一次 KV——条目的 TTL 从命中最初的写入时间算起，不续期；被人工处理立了墓碑的键照旧不写；再失败就等下一次重读。写成功之前，其他节点不知道这个命中，各自重新审这段内容。在此之前：命中的后台写失败后，它的各片段在别的节点上分别通过（KV 里只有"通过"），本节点下一次到期重读把指针和命中条目一起丢掉，完整的命中集合被答成 `pass (cached)`（`TestUnlandedHitIsWrittenAgain`）。**不会把人工处理删掉的命中写回去**：写确认过或从 KV 读来的条目没有标记，KV 里没有它就说明它被删了，照旧丢弃（同一测试的后半段、`TestReviewReachesNodeWithoutBroadcast`）。剩下的窗口：写从未成功的命中，它的记录又在别的节点上被人工处理、那次广播也丢了——本节点下次重读时会把它写进 KV；三件事同时发生才出现，清空缓存可以兜底。**未落地的命中仍会丢的三种情况**（不改代码）：(1) 未落地的命中条目被内存 LRU 淘汰（条数或 64 MiB 上限）；(2) 它的片段键从内存里消失——别的节点的 `stored` 广播、人工处理的广播（都是删键）或 LRU 淘汰——片段之后从 KV 重读回来，值里没有指向它的指针，条目留在内存里成了孤儿，到期重读不再碰到它，也就不再重写；(3) 进程重启，或改了 `cache_entries`（内存缓存整个换新）。这三种情况的结果与这条修复之前相同：这段内容按各片段的"通过"回答，或重新送审。
- **只在内存里的"通过"在第一次到期重读时丢掉**（已知代价，不改）：一次运行里超过 64 个新片段时多出来的"通过"、以及 KV 写不进去时的"通过"，只存在于本节点内存；到期重读以 KV 为准，把它们丢掉，这些片段再审一次。
- 被人工处理改过、还在墓碑期内的键不写（5.3.8）。

记录的 trace 上，判定块为命中、不含 URL 图片、且有送审的片段时写：

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

`config_version` 一起加一，是为了复用现有的"广播加每 5 秒轮询版本号"来传播，不用新增轮询。新键不含 `config_version`，所以这不会产生别的影响。正在进行的运行和排队的任务在读写缓存时看到新的纪元（5.3.4、5.3.5）。KV 里的旧键不逐个删除（一次清空可能有几十万个键，逐个走 gRPC 太慢），等 TTL 过期。

#### 5.3.8 人工处理同步缓存

`POST /events/review` 成功后，对本次处理的、`trace.cache` 里 `key` 和 `segs` 都是合法哈希的可疑记录执行（`syncReviewed`）。范围用记录的 `flow_id` 在**当前快照**里的流程算；该流程现在不存在、已停用或未发布 → 跳过这条记录。

| 处理结果 | 动作 |
|---|---|
| 误报 | 删除命中条目，去掉 `segs` 里每个片段指向它的指针。记录的 `fp` 等于流程当前的指纹时，再把每个片段写成通过；指纹不同时**只删命中，不写通过** |
| 确认 | 仅当记录的 `fp` 等于流程当前的指纹：用记录的 trace 重建命中条目（来源请求取 `cache.source_request_id`，没有则取记录自己的 `request_id`；去掉 `cache`、`chunks`、`input`、`input_message_dropped`），给每个片段加上指针，并去掉这些片段的"通过"。指纹不同的记录跳过，不计入 `cache_synced` |
| 待处理 | 删除命中条目，去掉每个片段指向它的指针和"通过"，下次重新审 |

- 误报时把每个片段都写成放行：管理员认定这些片段合起来没问题，那么其中每一个单独出现也没问题。但只在指纹没变时写：当前配置从没审过这段内容，而且 `segs` 是当时那次运行送审的片段，换了配置后未必是同一批（例如当时没有审核器收的图片）。
- "确认"要求指纹相同：配置变了之后，不能把旧配置下的命中写成新配置的结论。
- **去重**：一次处理里指向同一个命中的多条记录（一次命中和它的若干次重放）只改一次缓存，按 id 顺序最后一条决定内容；每个键只读写一次。
- **以 KV 为准**。KV 是各节点共用的，所以先同步写 KV：每 64 个键 1 秒预算，最多 10 秒。先写命中条目，再改片段键；命中条目没写成功的，不写指向它的指针，也不在删不掉的命中旁边写通过。
- **内存不写新值，只立墓碑**。本节点在写 KV 之前把涉及的键从内存里删掉并立墓碑（期限 = 写预算加 4 秒），写完后再立一次（4 秒，`tombstoneTTL` = 后台写预算的两倍）；其他节点收到广播 `verdict.changed`（负载 `{"keys": [...]}`，每条消息的键合计不超过 48 KiB，多了分几条发；负载里带 `"stored": true` 的是运行写入命中后的广播，只删键不立墓碑，见 5.3.3）后同样删键并立 4 秒墓碑。墓碑期内这个键不从 KV 并入内存、也不被运行结果写入（内存和本节点的 KV 写都跳过）。这样处理之前读到旧值的查询、处理前后刚结束的运行，都不会把旧结论写回来。墓碑过后各节点从 KV 重新读，KV 里是什么就是什么：某次写失败时，所有节点一致地沿用旧结论，而不是处理的那个节点用新的、其他节点用旧的。
- 响应的 `cache_synced`：缓存改动**全部写成功**的记录数。部分失败的记录不计入；对它再处理一次会重做这些写入。失败计入同一个 `kvErrors` 计数器（`runtime.kv_errors`；一次同步里有写失败或超出预算算一次），不影响处理结果本身。同步在预算用完时停下：还在等同一个键的锁的写入不再发出（`kvChange` 拿到锁后先看预算），对应的记录不计入 `cache_synced`。
- 广播是尽力而为的。漏收的节点上，内存里的旧值最多用到它的下一次到期重读：重读用 KV 里的值替换内存里的值，所以**最迟在该节点上次从 KV 读这些键的 5 分钟后跟上人工处理**（5.3.3；KV 可读的前提下，post 时机下再晚一个请求；`TestReviewReachesNodeWithoutBroadcast`）。在此之前重读只并入不删除，漏收广播的节点会一直重放到条目过期。另外，本节点某次运行的后台写如果恰好落在"别的节点处理完、而它的广播还没到本节点"之间，会把命中写回 KV，直到到期。两种情况管理员都可以用清空缓存兜底，界面提示里写了这一点。

#### 5.3.9 如实写明的限制

1. **重放不分用户**（与 N 相同）。A 用户的违规内容进了缓存后，B 用户第一次发同样的内容也是重放：会被记录，pre 时会被拒绝，但不进名单、不计违规。广为流传的越狱提示词在缓存期内不会让后来的用户进名单。见 Q7。
2. 重放只对"包含整个命中集合"的请求生效。客户端改动集合里任何一个片段（哪怕一个字），就不重放，这段内容会重新送审，结果由审核器决定。
3. **重放决定整个请求，请求里命中集合之外的内容这次不审**（与 N 相同，`N:gate.go` `planAudit`：缓存命中即结束计划；有意保留）。后果在 post 时机下才有：一个对话的历史里有一条已缓存的命中时，之后每一轮都被记为一次重放（不算新的违规），**这一轮新增的内容不会送审**，直到命中条目过期、被标为误报或缓存被清空。pre 时机下请求反正被拒绝，没有这个问题。也就是说，后审的用户在一个已经命中过的对话里继续发新的违规内容，不会产生新的命中记录和违规计数；要让这类用户被拦下，靠的是名单升级为拦截级（那时每一轮都被拒绝）。
4. 清空、人工处理的同步和新命中的传播在多节点下有延迟：清空最多 5 秒；人工处理和一个节点新写入的命中，对内存里已有这些片段的其他节点，广播送达即生效，广播丢失时最迟在该节点上次从 KV 读这些键的 5 分钟后生效（5.3.3、5.3.8 末条）。
5. 片段键的并发修改可能丢一方的改动（5.3.3），后果限于多审一次或少重放一次。
6. **没有被通过的审核器实际收到的图片不缓存成"通过"**（5.3.5）。后果是多审：Jev 解不了或放不进预算的图每次请求都会再走一次运行，并且混合流程里（第五轮起；2026-11-10 收窄）带着没缓存成"通过"的图片的请求把已放行的文字也再送一遍（5.3.5）；OpenAI 命中、Jev 没收到图片而通过的运行，图片下次再送——**连同同一块的文字一起**：图片只被命中的审核器收到、运行却通过的块，整块不缓存，每个这样的请求都重新审，每次都放行（5.3.5，第四轮；N 会拒绝这种请求，第 10 节第 26 条）。（OpenAI 审核器一次调用代表输入里全部可用的图片，不逐张补审。）非混合流程里"同一请求先放行、后拒绝"的残留情形见 5.3.5"只用于混合流程"。
7. **指向读不到的命中条目的片段按未知处理**（5.3.4）。后果是多审或多入队：KV 读命中条目失败期间，这些片段每次都重新送审；post 的钩子里，命中条目被内存淘汰的片段入队，由工作协程带 KV 查一次再决定（条目读回内存后不再入队）。指针已失效的片段只入队一次（第四轮）：带 KV 的查询得到"没有这个条目"时，把这个指针从本次查询各片段在内存里的值中删掉（只改内存，请求路径上不多写 KV；写入不到 4 秒的指针不删），之后只看内存的查询直接按"通过"回答（`TestStalePointerLeavesMemory`）。在此之前这样的请求每次都入队，直到指针过期。
8. **只在内存里的"通过"和没落到 KV 的命中**（5.3.5）。前者在第一次到期重读时丢掉、再审一次；后者留在判出它的节点上并重写 KV，写成功之前其他节点各自重新审；条目或它的片段键被淘汰、片段键被广播删掉、进程重启或改了 `cache_entries` 时仍会丢（5.3.5 列的三种情况）。

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
| `GET /status` | read | `today.replayed`（已包含在 `today.suspicious` 里）；`runtime.cache_epoch`；`runtime.cache_bytes`（内存缓存的估算字节数，含墓碑）；`runtime.kv_errors`（本节点启动以来 KV 调用失败的累计次数，5.3.4）；`runtime.redraw_panics`（本节点启动以来因解码器 panic 而跳过的图片数，7.3） |
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

// 片段键的值
type segValue struct { pass int64; hits []hitRef } // parseSeg / encode / addHit / dropHit / merge / prune
type segEdit func(*segValue)                       // passAt、dropPass、pointTo、unpoint

// 内存 LRU：条数和字节两个上限；命中条目保存解码后的结构；墓碑
func (c *lru) get(key string, now time.Time) ([]byte, bool)
func (c *lru) getHit(key string, now time.Time) *storedHit
func (c *lru) putHit(key string, hit *storedHit, bodyLen int, expires, now time.Time) bool
func (c *lru) editSeg(key string, now time.Time, ttl time.Duration, edit segEdit)
func (c *lru) kill(keys []string, until, now time.Time)
func (c *lru) size() int64

func cacheScope(epoch int64, f *liveFlow) string           // "e3:7:9f2c…"
func (s *snapshot) scopeOf(f *liveFlow) string
func segKeyOf(scope string, h [32]byte) string             // "s:" + scope + ":" + hex
func hitKeyOf(scope, id string) string                     // "h:" + scope + ":" + id
func hitID(keys [][32]byte) string

// verdicts is what the cache knows about a request's segments.
type verdicts struct {
    passed map[[32]byte]bool
    hit    *storedHit // a cached hit whose segments are all in the request
    hitID  string
}

func (p *Plugin) lookupVerdicts(scope string, keys [][32]byte, useKV bool) verdicts
func (p *Plugin) storeVerdicts(c *config, scope string, passes [][32]byte, hits []storedHit)
// One change of a key at a time on a node; not made when ctx ended while it waited.
func (p *Plugin) kvChange(ctx context.Context, key string, change func() error) error
// A review writes unconditionally ...
func (p *Plugin) kvSetHit(ctx context.Context, key string, body []byte, ttl time.Duration) error
func (p *Plugin) kvDeleteHit(ctx context.Context, key string) error
func (p *Plugin) kvEditSeg(ctx context.Context, key string, edits []segEdit, ttl time.Duration) error
// ... a run does not write a key a review changed a moment ago (tombstone).
func (p *Plugin) kvSetRunHit(ctx context.Context, key string, body []byte, ttl time.Duration) (stored bool, err error)
func (p *Plugin) kvEditRunSeg(ctx context.Context, key string, edits []segEdit, ttl time.Duration) error
func (p *Plugin) clearVerdictCache(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error)
func (p *Plugin) syncReviewed(ctx context.Context, ids []int64, status string) int
func (p *Plugin) onVerdictChanged(ctx context.Context, b pluginsdk.Broadcast) error
```

删除 `segKey`、`cachedSegments`、`putSegments`。

**`snapshot.go`**：`snapshot` 加 `cacheEpoch int64`（和 `config_version` 同一条查询读出）；`liveFlow` 加 `fp string`；`loadSnapshot` 在审核器和流程都读完后算指纹（审核器的 `config` 原文要留到这一步；`fingerprint` 的输入含常量 `judgingVersion`）；新主题常量 `TopicVerdictChanged = "verdict.changed"`。

**`hook.go`**
- `admit`：`cachedSegments` 换成 `lookupVerdicts`；有可重放的命中时返回 `p.replay(m, req, …)`。`replay` 的 `req` 参数是请求的片段；post 任务出队时重放传 nil（入队时只保留了片段的哈希和各块的内容）。
- `runKey`：改用 `scopeOf` 拼键。
- `runPost`：`allCached` 换成一次带 KV 的 `lookupVerdicts(m.snap.scopeOf(m.flow), m.plan.keys, true)`（入队后缓存被清空过则跳过，5.3.4）。重放需要片段文字：post 任务在入队时已经复制了各块的文字，但 K 里可能有当时已放行、没进块的片段；这时记录的 `text` 和 `input_message` 只含块里有的那部分，trace 里的 `segs` 仍是完整的。
- `cachePasses` 改名 `settleVerdicts`，按 5.3.5；由 `runPre` 的共享运行函数和 `runPost` 调用，不再由 `finish` 调用。
- `finish`：先给 trace 填 `cache`，再 `fillFromTrace`；原始消息只在确定要写记录之后才拼（带图片时有几兆字节，而大多数请求通过后不写记录）。

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
**`routes.go`**：注册路由；`Event` 加 `replayed`，`eventColumns` 加列；`eventFilter` 加 `replayed`；`reviewEvents` 末尾调 `syncReviewed`；`Runtime` 加 `CacheEpoch`、`CacheBytes`。
**`plugin.go`**：`OnTopic(TopicVerdictChanged, p.onVerdictChanged)`；`Configure` 里缓存容量变化时照旧重建 LRU（墓碑随之清掉）；`kvMu [64]sync.Mutex`。
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
| `TestVerdictCacheTTLSettings`（在 `unit_test.go`） | `DecodeSettings`：只有 `cache_ttl_seconds = 0` → 关闭；`= 86400` → 1 天；`= 200000` → 3 天；两个键都没有 → 7 天；`verdict_cache_days = 40` → 30 |
| `TestKVFailureAuditsAgain` | KV 报错时照常送审，不放行、不重放 |

- 代码审核后补的测试（按功能归位，没有单独的"审核修复"文件）：
  - `verdict_cache_test.go`：`TestHitSurvivesPassesOfItsSegments`、`TestReviewSyncWritesEachKeyOnce`、`TestReviewSyncKVFailure`、`TestKVRunStopsWithItsContext`、`TestFalsePositiveUnderAnotherFingerprint`、`TestKVValueKeepsItsWriteTime`、`TestQueuedJobAfterClear`、`TestHitKeptDecoded`、`TestFingerprintJudgingVersion`（固定配置的指纹是固定值）、`TestReviewIsNotUndoneByLateWrites`（用可阻塞的假 KV 造出真实的交错：运行的后台写已经拿着值、人工处理完成、后台写再放行）、`TestSkippedImageIsNotCachedAsPassed`（没等到重画名额、解不了、OpenAI 没选中的图片都不记"通过"）、`TestStoredHitReachesOtherNodes`（三个实例共用库和 KV：收到广播的节点立即重放，没收到的节点 5 分钟后重放；只看内存的查询在后台重读）、`TestKVChangesOfAKeyTakeTurns`（同一个键的两次修改串行；等锁期间预算用完的修改不发出）、`TestReviewSyncOrderAndBudget`（先立墓碑再写 KV；同步到预算即停）；另有 `TestFingerprint`、`TestStoredHitLimits`。
  - `unit_test.go`（`TestLRU` 旁边）：`TestSegValue`、`TestLRUByteBudget`、`TestLRUTombstone`（墓碑计入字节数、到期即清）；`TestEnginesNameReceivedImages`（两个引擎在结果里列出上游实际收到的图：OpenAI 选中的那一张，400 重试后没有；Jev 的各个资产，413 重试后只有第一个）。
  - `hook_test.go`：`TestPreRunStoresVerdictsOnce`（上游被挂住，等 5 个请求都在等同一次运行后再放行）。
  - 第三轮补的：`TestImagePassNeedsAPassingAuditor`（OpenAI 收图命中、Jev 没收到图而通过：两级推翻和单级 `all` 两种，图片都不记"通过"；Jev 收到并通过后才缓存）、`TestReviewReachesNodeWithoutBroadcast`（两个节点、广播不送达：误报、待处理、KV 里命中条目已删三种情况，第二个节点在 5 分钟重读后跟上，只看内存的查询晚一个请求）、`TestUnreadableHitEntryIsUnknown`（只有 `h:` 键读失败的假 KV；只看内存且命中条目被淘汰；KV 回答"没有"时仍按通过）；`TestPreRunSurvivesPanic` 的"结算时 panic"一例改为断言拒绝并记为 `block`；`TestStoredHitReachesOtherNodes` 的节点时钟改为完全由测试控制（`withClock`）。
  - 第四轮补的：`TestImageOnlyAHittingAuditorSawGetsTheSameVerdict`（Jev 的重画名额一直占满；两级推翻和单级 `all` 两种，同一请求发三次：每次两个审核器都被调用、都放行、note 相同，KV 里没有这个流程的片段键和命中条目，没有可疑记录，不计违规）；`TestImagePassNeedsAPassingAuditor` 里"文字是缓存的通过"的断言随规则改为"整块都没缓存"；`TestUnlandedHitIsWrittenAgain`（假 KV 拒绝写入时判出 {A, B} 命中；A、B 在第二个节点上各自通过；第一次重读仍重放、写再次失败；第二次重读写成功，TTL 是命中剩余的有效期，第三个节点重放；第三次重读不再写；之后在第二个节点上标为误报、不送广播：判出命中的节点重读后跟上，KV 里没有被写回的命中）；`TestStalePointerLeavesMemory`（post 时机，三次请求：第一次入队，第二、三次从内存回答，KV 没有被改写）；`TestHitStandsWhenRecordingPanics`（事件写入器置空使写记录 panic：命中被拒绝、重放被拒绝、通过仍放行）；`TestPreRunSurvivesPanic` 用一个真的 panic 的合并函数走"合并也 panic"的分支并断言块号。每个测试都在去掉对应修复后确认失败。
  - 第五轮补的：`TestImageVerdictDoesNotDependOnCachedText`（`verdict_cache_test.go`）、`TestHookSendsCachedTextWithANewImage`（`hook06_test.go`）、`TestPlanKeepsCachedTextWithAnUncachedImage`（`extract_test.go`），断言见 5.3.5。`TestSkippedImageIsNotCachedAsPassed` 改了两处断言，都是这条规则的直接后果：没等到重画名额的图片下一次连同文字一起送，命中集合是 {文字, 图片}（之前文字算命中缓存、集合是 {图片}）；解不了的图片的请求每次都把文字再送一遍（之前没有上游调用）。
  - 测试用的假件各只有一份：假 KV `kvFake`（计写入次数、可设失败、可只让写入失败、记每个键最后一次写的 TTL、可挂住写入），启动实例 `startNode` / `startDB` / `secondNode`，建流程 `publishFlow` / `setupFlow`。
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

   转换（新文件 `parity.go`，`convertParityOnce`；在 `refreshLoop` 里、`Configure` 收到真实设置之后调用，每 5 秒一轮）：

   - **第一次运行**（`config_state.parity_converted` 为假）：当前 `mode = enforce` 时，转换所有未过期的、`source = 'auto'` 的观察级条目；`mode` 不是 `enforce` 时不改条目。然后把 `parity_converted` 置为真，并在新列 `parity_converted_at` 记下时间（两个节点同时做时以先写入的为准）。
   - **之后的 24 小时内**（`parityWindow`，从 `parity_converted_at` 算起）每一轮都再查一次：`since_at >= parity_converted_at` 的、未过期的自动观察级条目也转换，按当时的 `mode` 判断。原因：滚动升级期间仍在跑 0.7.x 的节点会继续以观察级自动加入条目（之后每次命中还会延期），只转一次会漏掉它们。第一次运行之前就存在的条目不再回头看：第一次运行时 `mode = observe` 的部署，那些条目保持观察级。
   - 24 小时过后，或 `parity_converted` 为真但没有 `parity_converted_at`（由不记时间的早期构建转换过）时，不再做任何事。
   - **每个条目一个事务**，锁的顺序与其他名单改动相同（用户锁 `lockBlockSubject` → 名单行 → `config_state` 的 `bumpWatch`），不会和并发的名单操作死锁；`UPDATE` 重复写出条件（仍是未过期的自动观察级），两个节点同时转换时每个条目只改一次：

     ```sql
     UPDATE watchlist SET level = 'enforce', updated_at = $1
     WHERE user_id = $2 AND level = 'observe' AND source = 'auto' AND (expires_at IS NULL OR expires_at > $1)
     ```

     改到的条目各写一条 `watch_events`：`action = 'set_level'`，`from_level = 'observe'`，`to_level = 'enforce'`，`reason = '0.8.0 升级：默认级别为拦截，自动加入的条目改为拦截级 / upgrade to 0.8.0: the default level is enforce, automatic entries become enforce'`，没有操作人。`expires_at`、`violation_count`、`violation_epoch` 不动。有改动时 `watchChanged`。
   - 某一步失败时记警告，下一轮重试；已经转换的条目不受影响。
   - 日志（第一次运行，以及之后每次有条目被转换时）：`moderation: 0.8.0 watch list conversion`，带 `mode`、`converted`、`first_run`。

   只转 `source = 'auto'` 的条目：管理员手动设成观察级的（`source = 'manual'`）和 AI 降到观察级的（`source = 'analysis'`）是有意的选择，保持观察级；这些用户升级后变为只后审，这正是 N 的规则。发布前用一条查询数出这类条目有多少，写进发布记录：

   ```sql
   SELECT source, count(*) FROM plg_moderation.watchlist
   WHERE level = 'observe' AND (expires_at IS NULL OR expires_at > now()) GROUP BY source;
   ```

3. `exempt_user_ids` 为空，白名单为空，无事发生。别的部署里已有豁免用户的，升级后变成白名单（后审）。

### 6.5 数据模型与迁移

```sql
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS parity_converted boolean NOT NULL DEFAULT false;
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS parity_converted_at timestamptz;
```

`watchlist.level` 的 CHECK 约束不变（`observe`、`enforce`）。

### 6.6 设置的 schema 与 ui

`settings.schema.json`：

```json
"allowlist_user_ids": {"type": "array", "default": [], "maxItems": 1000, "items": {"type": "string", "pattern": "^[0-9]{1,18}$"}},
"blocklist_user_ids": {"type": "array", "default": [], "maxItems": 1000, "items": {"type": "string", "pattern": "^[0-9]{1,18}$"}}
```

三个名单键（含旧键 `exempt_user_ids`）的 `items` 都是 1–18 位数字，`maxItems` 1000。`mode` 的定义不变（三个枚举值、默认 `off`）。

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
| `GET /status` | 加 `default_level`（`observe` \| `enforce`，`mode = off` 时为 `observe`）；`watch` 加 `blocking_with_new`（拦截级条目里有新命中的个数；默认拦截时新条目以拦截级加入，有新命中的用户出现在这里，N 没有这个数） |
| `GET /events/:id`、`GET /users/:user_id` | `user_state` 去掉 `exempt`，加 `allowlisted`、`blocklisted` |
| `GET /watchlist` | 每行加 `allowlisted`、`blocklisted` |
| `POST /watchlist`、`PATCH /watchlist/:user_id` | 白名单用户设为 `enforce` → 400；豁免用户不再被拒绝（可以以观察级加入） |
| `POST /blocks` | 字段错误码 `exempt` 改为 `allowlisted` |
| `POST /flows/:id/simulate` | `user_state = none` 时按默认级别决定时机（以前固定为后审） |

### 6.8 Go 改动

**`settings.go`**：`Settings` 加 `AllowlistUserIDs`、`BlocklistUserIDs`；`config` 把 `exempt` 换成 `allow`、`block`，加 `defaultLevel`；新方法 `(d decoder) userList(key)`（返回 id 列表、键是否存在、是否被截到 1000 项、丢掉了几项不是用户 id 的条目；`Configure` 对截断和丢弃各记一条警告，因为被丢掉的条目意味着名单没有覆盖到那个用户）；`compile` 里 `defaultLevel = LevelEnforce` 当且仅当 `Mode == ModeEnforce`。

**`hook.go`**
- `precheck`：删掉豁免放行那一段（白名单用户继续往下，按后审处理）。
- `moderate`：先看不用读请求体就能知道的两件事——这个请求没有流程（分组没有绑定，或绑定为免审），或流程的模型过滤把请求的模型排除在外——这两种请求直接放行，不占 `max_inflight_mb`，繁忙时也不会被回 503。之后才按字节数准入；超出时用 `p.preModerated(c, uid)` 决定：本应先审的用户返回 503 `moderation_busy`，其余放行（note `moderation: busy`）。默认拦截下，"本应先审的用户"是白名单和观察级名单之外的所有人，所以繁忙时 503 的范围比 0.7.2（只有名单上拦截级的用户）大得多，发布说明里写明。
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

**`routes.go`**：`UserState` 改字段；`userState` 填两个名单标记。**`watch_list.go`**：`WatchItem` 加两个标记。**`stats_api.go`**：`Status.DefaultLevel`。**`flow_versions.go`** `simulateFlow`：`none` 按 `c.defaultLevel`。**`notify.go`**：不变。**新文件 `parity.go`**：`convertParityOnce`。**`plugin.go`**：加 `parityDone atomic.Bool`、`parityEnd atomic.Int64`（转换窗口结束的时间）。**`store.go` `refreshLoop`**：调用 `convertParityOnce`。

### 6.9 界面

- `SettingsTab.vue`：第一组显示 `mode`（按新选项名）、白名单、黑名单。白名单的初始值：已存的 `allowlist_user_ids`，没有这个键时取已存的 `exempt_user_ids`（与后端的读法一致）；保存时写 `allowlist_user_ids`，并把**"白名单减去黑名单"**镜像写进旧键 `exempt_user_ids`（`settingsForm.ts` 的 `withRetiredMirrored`；这次保存改了白名单**或黑名单**时写）：仍在跑 0.7.2 的节点（滚动升级、回滚）只读旧键、对里面的用户完全不审，这样它们豁免的正好是白名单里且不在黑名单里的用户——从白名单移出的用户在旧节点上不再豁免，同时在两个名单上的用户（0.8.0 下先审）在旧节点上也不豁免；只改黑名单、没碰白名单的保存同样重写旧键。把白名单清空时旧键写成空数组。只保存黑名单而 `allowlist_user_ids` 还从没存过时，白名单就是旧键本身：其中有用户被加进黑名单的话，把旧键原样存成 `allowlist_user_ids`（0.8.0 读到的白名单不变），旧键去掉这些用户；没有重叠就什么都不多写。`settingsForm.ts` 的键表相应调整。
- `overview/StatusLine.vue`：模式徽标改为"默认观察 / 默认拦截 / 关闭"。
- `WatchTab.vue`、`WatchDetail.vue`、`UserStateSection.vue`、`EventDetail.vue`：用户旁显示"白名单"或"黑名单"徽标（悬停说明：白名单"只后审，永不拦截"；黑名单"总是先审"）。原来的"豁免"徽标删除。
- `WatchEditModal.vue`、`WatchActions.vue`：白名单用户的"拦截级"选项不可选，旁边提示"白名单用户只能设为观察"；黑名单用户显示提示"黑名单用户总是先审，名单级别不影响时机"。
- `BlocksTab.vue`：封禁白名单用户时显示后端的字段错误。
- `FlowSimulate.vue`：用户状态的选项说明"未标记（按默认级别）"。
- `messages.ts`：`mode.*` 的名字、上述文案；`flows.timingDesc` 改写为按默认级别、名单级别、白名单、黑名单四条规则说明。

### 6.10 回滚与混跑

- 混跑期间旧节点按旧规则：`mode = enforce` 时所有人先审；`exempt_user_ids` 里的用户不审。新节点按新规则。同一用户的请求落到不同节点时结果可能不同，持续到滚动结束。
- 转换可能在旧节点还在运行时执行：转换成拦截级的条目在旧节点上同样是先审，无影响。旧节点在此之后自动加入的观察级条目由 24 小时窗口内的后续几轮转换（6.4）。
- 回滚到 0.7.2：
  - `allowlist_user_ids`、`blocklist_user_ids` 被忽略。黑名单用户按普通用户处理；白名单用户按普通用户处理（`mode = enforce` 时会被先审）。0.8.0 的设置页每次保存白名单或黑名单都已把"白名单减去黑名单"镜像写进 `exempt_user_ids`（6.9），所以白名单用户（不在黑名单里的）回滚后在 0.7.2 下仍是豁免用户（0.7.2 下是完全不审），不用再做什么；只有绕过设置页、直接调设置接口写的白名单没有镜像，那种情况回滚前要把这些 id 写回 `exempt_user_ids`。
  - 转换过的名单条目保持拦截级；0.7.2 不给拦截级计违规、不延期，它们到 `expires_at` 后过期。
  - `parity_converted`、`parity_converted_at` 两列被忽略；再次升级时，如果距第一次转换不到 24 小时，回滚期间 0.7.2 自动加入的观察级条目会被转换，超过 24 小时则不再转换。
  - 设置文档里存着四个新键时，0.7.2 的设置页无法保存（它的 schema 是 `additionalProperties: false`，核心按当前安装版本的 schema 校验整份文档）。回滚前要先通过核心设置接口去掉这四个键，步骤见发布说明。

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
| `TestBusyUsesPreModerated` | 超出 `max_inflight_mb` 时：黑名单用户 503；默认拦截下的普通用户 503；白名单用户放行；没有流程或被模型过滤排除的请求不回 503 |
| `TestExemptBecomesAllowlist` | `DecodeSettings`：只有 `exempt_user_ids` → 白名单等于它；两个键都有 → 用 `allowlist_user_ids`；超过 1000 项截断 |
| `TestParityConversionWindow`、`TestParityConversionLockOrder`、`TestParityConversionOnce`（`parity_test.go`；这些测试关掉了 5 秒一次的定时刷新，转换只由测试自己触发） | 第一次转换后 24 小时内新加入的自动观察级条目被转换，之后不再转换；转换与并发的名单改动按同一顺序取锁，等待而不死锁 |
| `TestUserIDListsPatternAndDrops`、`TestStatusBlockingWithNew`、`TestSimulateNoneFollowsDefaultLevel` | 名单项 1–18 位数字，丢弃的项有计数；`watch.blocking_with_new`；模拟时 `user_state = none` 按默认级别 |
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

与 7.1 相同，但图片重画这一部分按 P 的内存上限和时间预算另外加了限制（插件进程内存上限 512 MB，§72.2 第 3 条）：

| 项 | N | P | 原因 |
|---|---|---|---|
| 像素上限 `jevImageMaxSourcePixels` | 50,000,000 | **12,000,000** | 文件头声称超过的不解码，跳过。1200 万像素覆盖手机照片和 4K 截图 |
| 解码内存预算 `jevNormalizeMemory` | 没有 | **112 MiB**，所有正在重画的图片共用 | 像素数管不住内存：同样 1200 万像素，灰度 PNG 解码约 12 MB，16 位 RGBA PNG 约 96 MB，不做色度抽样的渐进式 JPEG 约 180 MB（解码器要保留全部系数，每个采样 4 字节），而这样一张 JPEG 文件本身可以只有 70 KB |
| 同时重画的张数 `jevNormalizeSlots` | 2 | 2 | 相同 |
| 重画的时间预算 | 没有（等名额时只看 ctx） | 一次调用剩余时间的一半，最多 5 秒 | 图片不能耗掉文字的审核时间 |

**解码内存预算**（`jevDecodeCost`，只读文件头估算，拿不准时往高估）：

- PNG：像素数 × 每像素字节数（灰度或调色板 1、16 位灰度 2、8 位彩色 4、16 位彩色 8），隔行扫描的再加一半。
- JPEG：读帧头，各分量的采样数合计（按抽样因子），每个采样 1 字节；渐进式（SOF2 等非基线帧）每个采样再加 4 字节；四分量（CMYK）再加每像素 4 字节。帧头读不出来时按最坏情况（每像素 24 字节）。
- GIF：每像素 1 字节（第一帧）。WebP：有损 3–4 字节，无损 8 字节。
- 估算超过 112 MiB 的图**单独也不解码**，跳过；其余的图等到预算里放得下才开始解码。结果：1200 万像素的 16 位 PNG 只能单独重画；不抽样的渐进式 JPEG 约 780 万像素以上就被跳过。
- 缩放分带进行（每 64 行目标行一带，`jevScaleBandRows`）：`draw.BiLinear.Scale` 一次调用要为每个目标列和源行分配缓冲，1200 万像素的方图要约 174 MB。

**重画的时间预算**（`jevNormalizeBudget`）：一次 Jev 调用里，重画图片最多用这次调用剩余时间（渠道超时）的一半，且不超过 5 秒。到点时还没画好的那张图跳过，它后面需要重画的图也都跳过；**文字总是送审**，已经准备好的图片和不需要重画的图片照常随文字发出。解码器停不下来，所以被放弃的重画在后台自己跑完，结束时才归还名额和内存预算。

被跳过的图片计入 `skipped_images`。超过上面任何一项限制的图在 P 里跳过，在 N 里会被重画送审（第 10 节第 9 条）。**被跳过的图片不进判定缓存**：这次运行没有审核器收到它，它既不记"通过"也不进命中集合，带它的下一个请求会再送一次（5.3.5）。每个资产记着它代表输入里的哪几张图（`typesafeAsset.from`，内容相同的重复图片算在同一个资产上），请求过大重试只带第一张时，其余的图也算没收到。

解码器在某张图上 panic 时只跳过这张图：归还名额和内存预算，`redraw_panics` 加一（`GET /status` 的 `runtime.redraw_panics` 和健康指标），并记一条 error 日志（只有图片的 base64 长度和估算的解码内存，不含图片内容）。

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
func jevNormalizeBudget(ctx context.Context) time.Duration      // 剩余时间的一半，最多 5 秒
func jevAsset(ctx context.Context, raw string) *typesafeAsset
func jevDecodeCost(format string, cfg image.Config, r io.Reader) int64
func jevRedraw(ctx context.Context, raw string, cost int64) *typesafeAsset
func jevNormalizeImage(data []byte) *typesafeAsset
var jevNormalizeSlots = make(chan struct{}, 2)
var jevNormalizeBytes = semaphore.NewWeighted(jevNormalizeMemory) // golang.org/x/sync
var jevImageFormats = []string{"png", "jpeg", "gif", "webp"}
```

`jevAsset` 保留 P 现在"先用流式解码只读文件头"的做法（规格内的图不分配整张图的内存）；只有需要重画时才把 base64 整体解码。

**`go.mod`**：新增依赖 `golang.org/x/image`（`draw`、`webp`，v0.41.0）和 `golang.org/x/sync`（`semaphore`）。构建机要能拉到这两个模块（见 Q9）。标准库另加 `image/gif`（只注册解码器）。

### 7.5 界面

- `AuditorEditModal.vue`：Jev 图片开关的说明改为"内联的 PNG、JPEG、GIF（第一帧）、WebP 会送审；尺寸不合规格的自动缩放或补白后发送。URL 图片、超过 16 MiB 或 1200 万像素的图片不送审。"（解码内存和重画时间两项限制没有写进这句说明。）
- 设置里 `input_max_images` 等说明不变。

### 7.6 对现有配置的行为变化

1. **每次 Jev 调用都带长上下文请求头**。按 N 文档的说法会变慢、准确度略低。线上 Jev 渠道的超时（默认 8000 ms）是否够用，上线后看渠道健康度的延迟分布。
2. 以前被跳过的图片（GIF、WebP、过大或过小的 PNG / JPEG）现在会被送审：`sent_images` 增加，Jev 的 token 用量和费用增加，可能出现新的命中。重画占用请求路径上的 CPU 和时间（每次调用最多 5 秒，7.3），pre 请求的延迟会相应增加。
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
| `TestJevNormalizeMemory`、`TestJevDecodeCost` | 解码内存预算：估算值、单张超预算的跳过、合计超预算的等待 |
| `TestJevRedrawDoesNotStarveText`、`TestJevRedrawStopsWithContext` | 重画很慢的图片不占用文字的审核时间：到预算时跳过，文字和已就绪的图片照发，结果里只列上游收到的图；ctx 结束后不再重画并立即返回。重画由测试挂住和放行，不靠计时 |
| `TestJevRedrawGivesUpWaiting` | 等重画名额、等解码内存时 ctx 结束：跳过这张图，不解码，名额和内存不泄漏 |
| `TestJevRedrawDecoderPanic` | 解码器 panic：这张图跳过并计数、记日志（不含图片内容），其余的图照发 |

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

`flowFor`、`flowForAccount` 的代码不用改，注释改写。`routes_bindings.go`：`GET /bindings` 的每行加 `inactive: true`，供界面显示。它按**本节点当前的快照**判断：绑定的流程不为 0，且快照里没有这个流程（停用、未发布、已删除，或已发布并启用但本节点读不了它的 spec）。这样界面显示的与本节点实际执行的一致（`TestBindingInactiveFollowsSnapshot`）。上面的片段在代码里是 `snapshot.bindGroup`、`snapshot.bindAccount` 两个方法。

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
| 4 | 误报写放行 | 判定块，无条件 | 命中集合里的每个片段，且仅当流程的判定指纹没变；指纹变了只删命中 | 同上；整体没问题则各部分没问题。当前配置没审过的内容不写成放行 |
| 5 | "确认"重写命中 | 无条件 | 仅当流程的判定指纹没变 | 不把旧配置的结论写到新配置下 |
| 6 | 缓存写入 | 同步 | 运行结果：内存同步、KV 后台。人工处理：KV 同步，内存只立墓碑、之后从 KV 重读 | P 的钩子不等外部存储（§72.5 第 10 条）。别的节点：内存里没有这些片段的，KV 写完即可读到；内存里已有其"通过"的，广播送达后读到，广播丢失时最迟 5 分钟（5.3.3）。人工处理以各节点共用的 KV 为准 |
| 7 | 设置键 | `enabled` + `default_level`、`allowlist_user_ids` | `mode`（三值）；白名单新键并兼容旧键 `exempt_user_ids` | 6.3：已存设置不用迁移，可回滚 |
| 8 | 出错记录的原始消息 | `record_pass_input_message` 开着时保存 | 不保存，原文截到 `error_text_max_chars` | §72.9，渠道故障时的存储保护 |
| 9 | Jev 图片重画的限制 | 5000 万像素 | 1200 万像素；解码内存按文件头估算，合计 112 MiB，单张超出的跳过（大的渐进式 JPEG、16 位 PNG）；重画最多用一次调用剩余时间的一半且不超过 5 秒，超时的图跳过、文字照审 | 插件内存上限 512 MB；图片不能耗掉文字的审核时间（7.3） |
| 10 | 题表式 LLM 的提示词 | "系统提示词或用户消息中的一段" | 改为说明各段的角色前缀；用户消息带自身请求标记 | P 的块含多种角色；`llm` 渠道可以指回本网关 |
| 11 | 题表式 LLM 的题表 | 必填 | 可为空（用默认题集） | 与 P 的 Jev 审核器一致 |
| 12 | 审核器类型名 | `llm` | `llm_questions`（`llm_verdict` 保留） | 任务规定保留 `llm_verdict` |
| 13 | 多块请求的流程行 `errors` | 按代表块的 `Errored` | 按所有块的"或" | P 的一条流程行对应一个请求的多次运行 |
| 14 | 客户端断开 | 取消运行，前面的命中保留 | pre 运行不被客户端取消（singleflight） | P 既有设计（`P:hook.go:294-300`） |
| 15 | 封禁（`blocks`） | 没有 | 保留；重放不计入封禁；白名单用户不封禁 | P 独有的功能，规则按 N 的两条原则延伸 |
| 16 | AI 在拦截级的"移出"建议 | 直接移出 | 只降级（§72.13.4） | P 既有决定，不在本次范围 |
| 17 | 默认分组 | 没有 | `group_id = 0` 是回落的最后一级 | P 既有设计（§72.5） |
| 18 | 清空缓存 | Redis 模式下立即删除 | 换纪元，旧键等 TTL 过期 | 宿主 KV 只能逐键删除 |
| 19 | 片段键的内容 | 一个块一个值（放行或命中） | 一个片段键同时存放行时间和最多 8 个命中指针，查的时候命中优先 | 5.3.3：P 的命中记在片段集合上，集合的成员可以各自在别处通过 |
| 20 | 缓存条目的有效期 | Redis TTL | 值里带写入时间，读时按当前的 `verdict_cache_days` 判断，读进内存不续期 | 内存和 KV 两层，条目不能因为被读到而延寿；缩短天数立即生效 |
| 21 | 代码里的判定默认值变了 | 靠人清空 | 指纹里有 `judgingVersion`，发版时加一即失效 | 5.3.2 |
| 22 | 繁忙（`max_inflight_mb`） | 没有这个准入 | 本应先审的用户 503，其余放行；没有流程或被模型过滤排除的请求不受影响 | P 既有的内存保护（§72.2 第 3 条），按新的时机规则决定谁失败关闭 |
| 23 | 流程异常率告警的状态 | — | 仍在 KV 命名空间 `pass` | 滚动升级时新旧节点共用，正在持续的告警不重复发 |
| 24 | 升级时的名单转换 | 没有（N 一开始就是这套规则） | 默认拦截下把自动加入的观察级条目转成拦截级，首次之后再持续 24 小时 | 6.4 |
| 25 | `watch.blocking_with_new` | 没有 | 拦截级条目里有新命中的个数 | 默认拦截下新条目是拦截级，N 的 `watching_with_new` 看不到它们 |
| 26 | 被后面只读文字的复核推翻的图片命中 | 拒绝：图片自成一个内容块，只读文字的审核器在这个块上没有可审的内容，推翻不了 | 每次都放行；这样的块整块不进缓存，每个请求都重新审；混合流程里没缓存的图片总是和本请求的文字一起送审（已缓存的文字也送；非混合流程不留文字，残留情形见 5.3.5）。例外：这张图片在某个请求里单独被判命中后，含它的请求都按重放拒绝 | 负责人 2026-11-10 的决定（5.3.5）：P 的块里图片和文字在一起，复核只看得到文字；按"没有得出结论的审核"处理，并且同一请求每次得到同一结果，不管别的请求缓存了什么，而不是第一次放行、之后拒绝。图片单独成请求时没有文字可供复核，命中成立，这是另一个请求确立的命中 |
| 27 | LLM 审核器收图片 | 只发文字，图片计为跳过 | 默认把图片和文字一起发（`llm_questions`、`llm_verdict`）；审核器的 `review_images` 关掉后只发文字。只发内联图片，单张解码后不超过 5 MiB、每边不超过 8000 px、一次调用最多 20 张、base64 合计不超过 20 MiB，超出的跳过；带图调用被 400 拒绝时只发文字重试一次 | 负责人 2026-11-10 的决定（第 15 节）：复核必须看得到第 1 级命中的图片，否则它只能凭文字推翻图片命中 |

与 N **相同**、但值得在这里再写一遍的两点：重放不分用户（5.3.9 第 1 条）；post 时机下重放决定整个请求，新增内容不审（5.3.9 第 3 条）。

---

## 11. 横切事项

### 11.1 版本

插件版本 **0.8.0**（`manifest.json` 的 `version`，以及代码里出现版本号的地方）。`hostCompat` 不变（`>=0.1.258 <0.2.0`）：没有用到新的宿主接口。KV 的 `Get / Set / Delete`、`Publish` 都是现有授权下已有的调用。

### 11.2 manifest 与权限

- `routes` 加 `POST /verdict-cache/clear`（5.6）。
- **不新增宿主权限，不改 `gateway.hook` 的 scope（`points`、`fields` 都不变），不新增用户权限。升级不需要管理员重新批准。** 逐项核对：
  - 题表式 LLM、Jev 长上下文：走现有的 `net` 出口。
  - 判定缓存：现有的 `kv`。`kv` 权限的说明文字已从"在节点之间共享审核通过缓存"改为"在节点之间共享审核判定缓存"（英文 `Share the verdict cache between nodes`）；只改了 `reason` 文案。已按核心代码确认 `reason` 的变化不触发重新批准：授权记录（`install.Grant`，`server/internal/plugin/install/review.go`）只有权限 id、scope 和状态，不存 `reason`；升级时的比较（同文件 `diffGrants`）只看"是否已授予"和 `pkg.ScopeWithin(请求的 scope, 已授予的 scope)`；`Added`、`Widened` 都为空时 `carryOverConsent`（`upload.go`）自动沿用全部授权。`reason` 只用于在审批页上展示。
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
-- When it first ran: entries added by 0.7.x nodes in the day after it are converted too.
ALTER TABLE config_state ADD COLUMN IF NOT EXISTS parity_converted_at timestamptz;
```

核心在事务里执行插件迁移（§72.10）。前四条 `ADD COLUMN` 都是常量默认值，第五条是可空列，都不重写表；`ADD CONSTRAINT … CHECK` 会全表扫描 `auditors`（几十行）。`events` 上只需要很短的排他锁。

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

发布说明已成文：`docs/RELEASE-MODERATION-0.8.0.md`。它覆盖：

1. 升级前：跑 9.6 的查询处理"绑定到停用流程"的绑定；跑 6.4 的查询记下观察级条目的来源分布；核对线上 `ban_threshold`。
2. 行为变化：3.8（复核出错不再放行等六条）、6.3（`mode = enforce` 的新含义、豁免变白名单）、6.8（繁忙时 503 的范围）、7.6（Jev 长上下文和更多图片）、8.6（更多记录带原始消息）、9.6（绑定回落）、15.8（LLM 审核器开始收到图片，怎么按审核器关掉）。
3. 升级后第一天缓存全部重建，审核调用量和费用上升（5.9）。
4. 滚动升级期间不要发布带补审级的流程、不要创建 `llm_questions` 审核器；回滚前先撤掉它们（3.7、4.7）。
5. 不需要管理员重新批准权限（11.2）。
6. 升级后的核对：迁移、名单转换的日志、`/status` 的新字段、模拟一次流程。
7. 回滚到 0.7.2 的步骤，包括先通过核心设置接口去掉四个新设置键（6.10）。
8. 已知限制（5.3.9）。

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

全部已按推荐做法实现，状态如下。

| # | 问题 | 结论 |
|---|---|---|
| Q1 | 默认级别用现有的 `mode` 三个值表达（6.3 决定 1），还是新增独立的 `default_level` 键加一个开关 | **已定**：沿用 `mode`；`GET /status` 返回派生的 `default_level` |
| Q2 | `exempt_user_ids` 直接读成白名单，还是保留"完全不审核"作为第三种名单 | **已定**：读成白名单，不保留"完全不审核"。界面保存白名单或黑名单时把旧键写成"白名单减去黑名单"（镜像，第 14 节） |
| Q3 | 升级时把 `mode = enforce` 下自动加入的观察级条目转成拦截级 | **已定**：转换，手动和 AI 设的观察级不动；审核后加了 24 小时窗口（6.4） |
| Q4 | 绑定到停用流程的绑定：迁移时自动改成免审，还是只给查询、由管理员决定 | **已定**：不自动改；发布说明给出查询 |
| Q5 | 缓存键用判定指纹，还是保持 `config_version + flow_version` | **已定**：判定指纹，另加 `judgingVersion`（5.3.2） |
| Q6 | 出错记录是否也按 `record_pass_input_message` 保存原始消息 | **已定**：不存 |
| Q7 | 重放不分用户 | **已定**：与 N 相同，不记来源用户。负责人要更严时再加 |
| Q8 | Jev 每次调用都开长上下文 | **已定**：一律开。上线后看 Jev 渠道的延迟和命中率（发布说明的升级后核对），这一项要到上线后才有数据 |
| Q9 | 新增依赖 `golang.org/x/image` | **代码已加**（`go.mod`：`golang.org/x/image v0.41.0`，另有 `golang.org/x/sync`）。**构建机能否拉到这两个模块还没有在构建机上验证**，发布前要先确认（发布说明"升级前"） |
| Q10 | 图片解码上限 1200 万像素是按 512 MB 估的，没有实测 | **已解决，做法有变**：保留 1200 万像素，另加按文件头估算的解码内存预算（合计 112 MiB）和分带缩放（7.3），不再只靠像素数；`TestJevNormalizeMemory`、`TestJevDecodeCost` 覆盖估算和排队。没有做真实进程内存峰值的基准测试 |
| Q11 | 新审核器类型的名字 `llm_questions` 和界面名称"LLM 题表" | **已定**：采用 |
| Q12 | `kv` 权限的说明文字要不要改 | **已解决**：改了；核心不比较 `reason`（11.2） |
| Q13 | 白名单用户不被自动封禁、不能手动封禁 | **已定**：采用 |
| Q14 | `auditors` 的 CHECK 约束名 | 已核对（2026-11-10 线上库）：约束名是 `auditors_type_check`，迁移照 11.3 写 |
| Q15 | 清空缓存后 KV 里的旧键不删除，最多占用到 TTL（30 天）到期 | **已定**：接受；真有压力时再加一个后台按前缀删除的任务 |

T6 完成标准里的"在一个 0.7.2 数据的副本上实际升级一次并记录结果"**没有做**：本分支的工作不接触服务器和线上数据。迁移由 Go 测试在测试库上执行；真实数据上的演练留给发布时按发布说明执行并记录。

---

## 14. 代码审核后的修改（2026-11-10）

T1–T5 完成后做了一轮代码审核，问题在三个提交里修掉：`cb5a1c2c5`（界面）、`25a383f17`（后端）、`6c032357a`（判定缓存）。本文前面各节已按修改后的代码改写；这里列出审核发现了什么、怎么处理的。

**流程引擎与统计**

| 发现 | 处理 |
|---|---|
| 补审级命中时 `Decider` 写的是 spec 的级下标，而 trace 的 `stages` 只有实际运行过的级；普通级链提前结束时下标越界，取命中类别时 panic | `Decider` 定为 trace `stages` 的下标；每一级带 `stage`（spec 级序号）；`decidingStage()` 忽略越界值（3.4、3.5） |
| 统计的级行、漏斗、分析工具按 trace 里的位置记级号，补审级的数字记到了别的级上 | 都改用 spec 级序号（`stageNo`）；旧记录没有 `stage` 时按位置 |
| post 工作协程里的 panic 会结束插件进程 | `runPostSafely`：记为一次出错的运行，进程继续（3.5） |

**Jev 图片**

| 发现 | 处理 |
|---|---|
| 图片重画没有时间上限，几张慢图可以把渠道超时耗光，文字也审不成 | 重画有独立预算（剩余时间的一半，最多 5 秒），超时的图跳过，文字总是送审（7.3） |
| 1200 万像素的上限管不住内存：渐进式 JPEG、16 位 PNG 的解码内存是像素数的十几倍；`Scale` 一次调用另要上百 MB | 按文件头估算解码内存，合计 112 MiB，单张超出的跳过；缩放分带进行（7.3） |

**名单、时机、设置**

| 发现 | 处理 |
|---|---|
| 名单转换只做一次，滚动升级期间旧节点之后自动加入的观察级条目被漏掉 | 首次转换后 24 小时内每轮再查（`parity_converted_at`，6.4） |
| 转换在一个事务里先锁 `config_state` 再改名单行，与其他名单操作的取锁顺序相反，可能死锁 | 每个条目一个事务，按通用顺序取锁（6.4） |
| 繁忙准入发生在模型过滤之前：流程不审的模型的请求也会被回 503 | 先看流程和模型过滤，再准入（6.8） |
| 默认拦截下，繁忙时所有本应先审的用户都得到 503，范围比 0.7.2 大得多，设置说明没写 | 行为不变（失败关闭是有意的），在 `max_inflight_mb` 的说明、§72 和发布说明里写明 |
| 默认拦截下新条目是拦截级，概览的"有新命中"只数观察级，看不到它们 | `GET /status` 的 `watch.blocking_with_new`，概览显示 |
| `GET /bindings` 的 `inactive` 按数据库里的流程状态算，与本节点实际加载的快照可能不一致（已发布、已启用但 spec 读不了的流程） | 按当前快照算（9.4） |
| 判定缓存换了 KV 命名空间后，告警状态如果跟着换，升级期间正在持续的告警会重发 | 告警状态留在原命名空间 `pass`（5.3.3） |
| 每个请求都拼原始消息（带图片时几兆字节），而多数请求不写记录 | 只在确定写记录后才拼（5.7） |
| 名单里不是用户 id 的条目被静默丢弃 | 丢弃和截断各记一条警告；schema 的 `pattern` 放宽为 1–18 位数字（6.6） |

**判定缓存**

| 发现 | 处理 |
|---|---|
| 片段键只存一个值：命中集合的片段在别的请求里单独通过后，"通过"覆盖了指针，命中被洗成放行 | 片段键同时存通过时间和最多 8 个指针；查询时完整的命中集合优先于通过（5.3.3、5.3.4） |
| 命中集合包含了没有送审的片段（流程没有收图片的审核器时被丢掉的图片） | 命中集合只列实际送审的片段（5.3.5） |
| 人工处理：同一命中的多条记录重复写缓存；`cache_synced` 把写失败的也算进去；处理的节点用内存里的新值、其他节点用 KV 里的旧值；处理前后结束的运行会把旧结论写回 | 按键去重；`cache_synced` 只数全部写成功的记录；KV 同步写，内存只立墓碑（4 秒），各节点之后从 KV 重读（5.3.8） |
| 指纹已变的记录标为误报时，把片段写成了当前配置下的"通过"，而当前配置没审过它 | 只删命中，不写通过（5.3.8） |
| 从 KV 读进内存的值得到一个全新的 TTL，热点条目永不过期 | 值里带写入时间，按写入时间判断是否过期（5.3.3） |
| 清空缓存前入队的 post 任务，出队时用旧范围查缓存、把结论写进已清空的范围 | 查询跳过，结论写到当前纪元（5.3.4、5.3.5） |
| 内存 LRU 只限条数；命中条目最大 60 KiB，按条数上限算可以远超进程的内存上限；每次查询都重新解析命中的 JSON | 加 64 MiB 字节上限；命中条目保存解码后的结构；`runtime.cache_bytes`（5.3.3） |
| pre 的共享运行由每个等待的请求各结算一次；等待的请求都离开时不结算 | 在共享运行里结算一次（5.3.5） |
| 代码里的判定默认值（内置题集、默认阈值、提示词模板）变了，指纹不变，旧结论继续被沿用 | 指纹加 `judgingVersion`（5.3.2） |

**第二轮代码审核（Go）**

| 发现 | 处理 |
|---|---|
| 因重画时间预算、名额或解码内存而没发出去的图片，随块一起被记成"通过"并写进 KV；其他没发出去的原因（太大、解不了、超出请求预算、重试只带第一张、OpenAI 每次只带一张）同样如此 | 引擎结果记下上游实际收到的图（`received`）；没有审核器收到的图片不记"通过"、不进命中集合，文字照常缓存（5.3.5、7.3） |
| 查询直接用内存里的片段值：只持有 A、B 各自"通过"的节点看不到别的节点为 {A, B} 写进 KV 的指针，第一轮修掉的"洗成放行"在节点之间仍然存在 | 写入命中后广播片段键（`verdict.changed`，`stored`），收到的节点删键重读；内存里的片段值满 5 分钟重读一次作为兜底（5.3.3、5.3.4） |
| pre 的共享运行在 singleflight 里执行，其中的 panic 被它用新协程重新抛出，SDK 的 recover 接不住，进程退出 | 共享运行自己 recover，记日志，等待者拿到一次"出错"的运行，请求走出错路径放行（`runPre`） |
| 后审任务在 `finish` 计完用户的当日统计之后 panic 时，善后又调一次 `finish`：用户多计一次，命中记录变成出错；善后里的第二次 panic 被吞掉 | 已计过用户时只记日志；善后里的 panic 也记日志（`postPanicked`） |
| 重画协程里解码器的 panic 被吞掉，没有日志也没有计数 | error 日志（不含图片内容）加 `redraw_panics` 计数（7.3） |
| 墓碑只在下一次人工处理时清理，一次批量处理后一直留在内存里 | 到期后下一次查看时清掉，并计入内存缓存的字节数（5.3.3） |
| 人工处理的同步拿到键的锁之后不看预算，预算用完后还会发出 KV 调用 | 拿到锁后先看 ctx（5.3.8） |
| KV 失败的计数器没有任何输出 | `runtime.kv_errors` 和健康指标 `kv_errors`（5.3.4） |
| 第一轮的若干修复没有有效的测试；若干测试靠墙上时钟的窗口判断，容易在 CI 上偶发失败 | 补测试（5.10、7.8、3.9）；计时窗口改成由测试挂住和放行的假上游、假 KV、假重画，或直接看数据库的锁 |
| 代码规范：按"审核修复"命名的测试文件；`syncReviewed`、`admit`、`lookupVerdicts`、`convertParityOnce` 过长；清理 trace 的代码写了两遍；处理状态是裸字符串；布尔参数 `guarded`；魔法数字 | 测试按功能归位；这几个函数拆开（`reviewedHits` / `reviewOps` / `writeReviewed`，`planUncached`，`lookup.segments` / `hits` / `decide`，`convertParityEntries` / `convertParityEntry`）；`newStoredHit` / `Trace.ownRun`；`ReviewPending` 等常量；`kvSetRunHit` / `kvEditRunSeg` / `kvDeleteHit`；常量命名。行为不变 |

**界面**

| 发现 | 处理 |
|---|---|
| 保存白名单后旧键 `exempt_user_ids` 还留着原值；仍在跑 0.7.2 的节点（滚动升级、回滚）继续完全不审已从白名单移出的用户 | 白名单有改动的保存同时把 `exempt_user_ids` 写成与新白名单相同的内容（`withRetiredMirrored`）。第一轮修复曾改为写成空数组，第二轮审核指出那样会让仍在白名单里的用户在旧节点上失去豁免，改为镜像；第三轮再改为"白名单减去黑名单"，保存任一名单时重写（见"第三轮代码审核"） |
| 清空"判定缓存天数"会把新键删掉；库里还存着旧键 `cache_ttl_seconds` 时，后端又按旧键取值 | 旧键还在时，清空改为写入默认值 7（`sentSetting`） |
| 把第一级之外的级都删掉或移动后，补审级可能成为第一级，流程无法发布也没有入口改回 | 成为第一级的级自动变回普通级；拖放和移动保持普通级在前 |
| 级路径和 trace 视图按位置显示级号；0.8.0 之前"出错即放行"的旧记录被显示成通过 | 按 `stage` 显示级号；旧记录里没有审核器判过的出错级仍显示为出错 |
| 概览的"有新命中"没有包括拦截级条目 | 加上 `blocking_with_new` |

**第三轮代码审核**

| 发现 | 处理 |
|---|---|
| 图片记"通过"用的是"任何做出判断的审核器收到过"：只被判了命中的审核器收到的图片，在运行最终通过（被没收到图片的后一级推翻，或同一级 `all` / `at_least` 里另一个没收到图片的审核器通过）时仍被记成"通过" | 记"通过"只认"自己判了通过、且所在的级结果为通过"的审核器收到的图片（`Trace.passedImages`）；命中集合仍用并集（5.3.5） |
| 5 分钟重读只并入不删除：别的节点上的人工处理（误报、待处理）在广播丢失的节点上一直不生效，直到条目过期 | 到期重读改为用 KV 的值替换内存的值（保留本节点 4 秒内刚写、可能还没落到 KV 的项），旧值指向的命中条目同时出内存、需要时从 KV 重读；KV 读失败时保留内存的值。时限：最迟在该节点上次从 KV 读这些键的 5 分钟后生效（5.3.3、5.3.8） |
| pre 的共享运行在审核器已判出命中之后、结算缓存或合并运行时 panic，整个结果被换成"出错的通过"，请求被放行 | 各块的运行留在 recover 之外：有运行结果时结果就是它们合并后的 trace，命中照样拒绝，只丢缓存写入；运行返回之前的 panic 才是出错（`afterPanic`，5.3.5） |
| 片段的指针有效、但它指向的命中条目读不到（KV 出错、预算用完；或只看内存的查询里条目不在内存）时，查询退回去按片段的"通过"回答 `pass (cached)`，没有任何上游调用 | 这种片段本次按未知处理：重新送审，或入队后由工作协程带 KV 查；KV 明确回答"没有"时仍按指针失效处理。到期重读只用查询预算的前一半，不挤掉命中条目的读取（5.3.4） |
| 旧键 `exempt_user_ids` 的镜像等于白名单：同时在黑名单上的用户在 0.7.2 节点上完全不审；只改黑名单的保存不重写旧键 | 镜像改为"白名单减去黑名单"，保存任一名单时重写（6.9） |
| CONTRACTS 两处仍写"旧键写成空数组" | 改为镜像规则 |
| `stored` 广播的删键可以被当时正在进行的查询或刚结束的运行撤销 | 没有便宜且明显正确的改法（要给每个键留标记，等同墓碑，而墓碑会挡住共用片段的写入）：在代码注释和 5.3.3 写明这个窗口，它以该值的下一次 5 分钟重读为界 |
| `TestStoredHitReachesOtherNodes` 的节点时钟随墙上时钟走，慢的 CI 上"还没到期"的断言会失败 | 节点时钟完全由测试控制（`withClock`） |
| `recheckSoon` 和 `storeVerdicts` 的后台协程没有 recover，panic 会结束进程 | 各加带日志的 recover（`recoverTracked`） |

**第四轮代码审核**

| # | 发现 | 处理 |
|---|---|---|
| F1 | 同一个请求第一次放行、第二次被拒绝：图片只被命中的审核器收到，后一级（或同一级 `all` / `at_least` 里的另一个审核器）没收到图片、只审文字并通过；文字被记成"通过"，第二次图片单独成块，命中没人推翻，请求被拒绝、计违规，之后一直重放 | 负责人的决定：这种情况每次都放行。运行通过、块里有图片被审核器收到却没有被通过的审核器收到时，整块（含文字）不记"通过"，每次整块重审、结果相同；代价是这类请求不走缓存。与 N 的差别列入第 10 节第 26 条（5.3.5） |
| F2 | 第三轮的回退：命中的后台 KV 写失败后只在本节点内存里；各片段在别处分别通过后，本节点的到期重读把指针和命中条目丢掉，完整的命中集合被答成 `pass (cached)` | 命中条目带"未落地"标记，条目和全部指针写成功才去掉；到期重读保留指向未落地条目的指针和条目，并重写 KV（TTL 从最初写入算，尊重墓碑）。写确认过或从 KV 读来的条目不重写，所以人工处理删掉的命中不会被写回（5.3.5） |
| F3 | post 的钩子（只看内存）遇到指针有效、命中条目已不存在的片段每次都入队；工作协程带 KV 查到"没有"后按通过处理，却把指针留在内存里，下一个请求照样入队，直到指针过期 | KV 回答"没有这个条目"时，从本次查询各片段的内存值里删掉这个指针（只改内存）（5.3.9 第 7 条） |
| F4 | pre 的运行判出命中之后，钩子协程上写记录的一步 panic，落到 SDK 的 recover，钩子失败，核心按 `failure: open` 放行 | 这一步（以及 pre 重放的记录）包在 recover 里：记日志，命中照样拒绝，其余照样放行（5.3.5） |
| F5 | `afterPanic` 在"合并本身也 panic"的分支里没设块号，记录的 `trace.cache` 会指向第 1 块的片段；原来的测试没有走到这个分支 | 多块时设块号；测试用一个真的会 panic 的合并函数走这个分支（5.3.5） |

**第五轮代码审核**

| 发现 | 处理 |
|---|---|
| F1 的修复只管住了请求自己：整块不记"通过"之后，文字仍可以被别的请求缓存，而 `makePlan` 把已放行的片段从块里拿掉。X = [文字 T, 图片 I] 放行、什么都不缓存；只有 T 的另一个请求通过，T 记"通过"；再发 X，I 单独成块，收图片的审核器命中，复核整级跳过，X 被拒绝、计违规，{I} 进缓存并从此重放——同一个请求先放行、后拒绝（"系统提示词加一条只有图片的 user 消息"：缓存为空时放行，有缓存时拒绝） | 请求里有没缓存成"通过"、这次要送审的图片时，`makePlan` 不拿掉已放行的文字片段：图片总是和本请求的文字一起审，结果不取决于别的请求缓存了什么。没有这种图片的请求（含图片都已放行、流程不收图片的）不变。代价：这样的请求把已放行的文字再审一遍，图片一直进不了缓存时每个请求都如此，块数上限按整个请求的文字算。保留的例外：只含这张图片的请求判出的命中 {I} 照常进缓存并重放（5.3.5） |

**LLM 审核器看图，第五轮的规则收窄（负责人 2026-11-10 的决定）**

| 决定 | 处理 |
|---|---|
| LLM 审核器必须看到图片；审核器上有开关表示模型是否支持图片，默认支持 | `review_images` 对 `llm_questions`、`llm_verdict` 生效（缺省 = 开）；三种协议各用自己的图片 part；上限、去重、400 回退、只有图片的输入；默认提示词各加一句；`judgingVersion` 1 → 2（第 15 节） |
| 第五轮的"留下已缓存的文字"代价太高（带一张进不了缓存的图片的请求每轮重审全部文字，`input_overflow = block` 时会被拒绝） | 只用于混合流程（`snapshot.mixedImages`）；非混合流程里剩下的情形写在 5.3.5，未改 |

**已知、未改**（第四轮修复的门禁审核里的四个低级别发现）

1. 指针的写入因为墓碑被跳过的命中，也被标成"已落地"（`cache.go` 1320–1337，`writeVerdicts`）。
2. `unpoint` 按命中 id 删指针，不核对删的是不是那个失效的指针，所以同一时刻刚写进来的同 id 指针可能被一起删掉，到下一次到期重读才回来（`cache.go` 1026–1031）。
3. pre 路径上写记录时被 recover 的 panic 只记日志，没有计数器，那条可疑记录也就丢了（`hook.go` 425–449，`concludeSafely`、`replaySafely`）。
4. KV 可读不可写时，并发的查询可以各自为同一个未落地的命中启动一次后台重写（`cache.go` 831–859、917–929）。

**写明但不改的两项**

1. **post 时机下，历史里带着已缓存命中的请求被重放，新增内容不审**（5.3.9 第 3 条）。这与 N 的行为相同（缓存命中即结束这个请求的审核计划），本次移植的目标是一比一，所以保留，并在代码注释（`hook.go` `admit`）、§72.5 和发布说明里写明。要改的话方向是：post 重放之后继续把命中集合之外的未知片段送审。
2. **设置的回滚**。0.8.0 保存过设置后，文档里有四个 0.7.2 的 schema 不认识的键（`allowlist_user_ids`、`blocklist_user_ids`、`verdict_cache_days`、`record_pass_input_message`）。0.7.2 读设置时忽略它们，但它的设置页保存时会被核心按 `additionalProperties: false` 拒绝。没有改代码去规避（要么放宽 0.7.2 的 schema，那是改已发布的版本；要么 0.8.0 不存新键，那就没有新功能）；回滚步骤写在发布说明里：回滚前在 0.8.0 下通过核心设置接口去掉这四个键，需要保持免拦截的用户写回 `exempt_user_ids`。

---

## 15. LLM 审核器看图（负责人 2026-11-10 决定）

负责人的决定：LLM 审核器必须看到图片。配置 LLM 审核器时有一个开关，表示它的模型是否支持图片，默认"支持"；关掉后不发图片，只发文字（与此前相同）。这一点有意超出 N：N 的 `llm` 审核器只发文字（4.1，第 10 节第 27 条）。

### 15.1 开关与默认值

- `auditors.config.review_images`（布尔，缺省 = 开）。原来只有 `typesafe` 接受，现在 `llm_questions`、`llm_verdict` 也接受；`openai_moderation` 仍不接受（它总是收图片）。
- 缺省即开：已存的 LLM 审核器、从 N 导入的 `llm` 审核器（`POST /import` 带不带 `review_images` 都接受，原值照存）升级后开始发图片。
- 开着图片的 LLM 审核器 `liveAuditor.images` 为真：`sendsImages(flow)`、`dropImages`、缓存规则都把它当作收图片的审核器；关掉的不算，流程是否混合（5.3.5）也按这个算。
- 指纹：开关在审核器已存的 `config` 里，`config` 原文是指纹的一部分，改开关就换指纹（`TestLLMReviewerSeesTheImage`）。缺省值的含义变了（原来 LLM 审核器不发图片），所以 `judgingVersion` 从 1 加到 2。

### 15.2 发什么

- 图片放在带待审文字的那条 user 消息里，文字在前、图片在后。`llm_verdict` 的多轮对话里只有第一条 user 消息带图片（后面的轮次重发历史，图片仍在第一条里，后续的提示消息是纯文字）。
- 三种协议各用自己的形状（`llmProtocol.textPart` / `imagePart`，`llmProtocol.user`）：

  | 协议 | 文字 part | 图片 part |
  |---|---|---|
  | `openai_chat` | `{"type":"text","text":…}` | `{"type":"image_url","image_url":{"url":"data:image/png;base64,…"}}` |
  | `openai_responses` | `{"type":"input_text","text":…}` | `{"type":"input_image","image_url":"data:image/png;base64,…"}` |
  | `anthropic` | `{"type":"text","text":…}` | `{"type":"image","source":{"type":"base64","media_type":"image/png","data":"…"}}` |

- 没有要发的图片时（开关关着、请求里没有图片、图片都被跳过），user 消息仍是原来的纯字符串。
- 只发内联 base64 图片。URL 图片不发、不下载，计为跳过（与 Jev 相同）。
- 格式：PNG、JPEG、GIF、WebP。媒体类型取自文件头（`imageHeader`，与 Jev 读尺寸用的是同一段代码，只读头、不解码像素），不用客户端声明的：声明的类型与内容不符时 Anthropic 会以 400 拒绝。
- 上限（`llmproto.go` 的常量；超出的图片跳过，**不重画**）：

  | 常量 | 值 | 原因 |
  |---|---|---|
  | `llmImageMaxBytes` | 单张解码后 5 MiB（base64 约 7 MiB） | 负责人定的上限。只看 base64 的长度算出解码后的大小（`decodedLen`），不解码。Anthropic 按 base64 文本计：自家 API 每张 10 MB，这个上限在其内，OpenAI 的两个接口也收；Anthropic 在 Amazon Bedrock 和 Google Cloud 上是 5 MB 的 base64（约 3.75 MiB 的图片），渠道指向那里时 3.75–5 MiB 的图片会被 400 拒绝，按 15.4 只审文字 |
  | `llmImageMaxSide` | 每边 8000 px | Anthropic 拒绝更大的图片 |
  | `llmMaxImages` | 一次调用 20 张 | 一个请求超过 20 张图片时 Anthropic 对每张图的边长用更低的上限。`input_max_images` 默认 8，上限 32 |
  | `llmImagesMaxBase64` | 一次调用合计 20 MiB base64 | 限制请求体（各上游的请求上限是几十 MB）和一次调用占用的内存；放不下的那张跳过，后面更小的仍可以发 |

- 内容相同的图片只发一次，重复的算收到（与 `jevAssets` 相同）。

### 15.3 只有图片的输入

开着图片时，只有图片、没有文字也是有效输入：消息里是自身请求标记（以及 `llm_questions` 的边界、`llm_verdict` 的标签）加图片。之前 `in.Text == ""` 直接是"无可审内容"、这一级被跳过——所以第 1 级命中的图片单独成块时没人能复核。关着图片时仍是"无可审内容"；开着但没有一张图片发得出去（都是 URL 图片或超出上限）时也是。

### 15.4 上游拒绝图片（400）

带图片的调用被上游以 400 回答时，只发文字重试一次（与 OpenAI 审核器相同），结论来自这次重试，**没有图片算收到**；没有文字时按"无可审内容"跳过。其他状态码不重试；不带图片的调用收到 400 也不重试。

`llm_verdict` 原有的"上游拒绝 `temperature`"重试与它并存（`agent.run`）：一轮里先发一次，之后每种原因最多再发一次，先后顺序随上游先报哪一个。`temperature` 被拒后这个审核器不再带它（原有行为）；图片被拒后这次运行后面的轮次不再带图片，下一次运行重新带。所以一次运行最多 `max_turns + 2` 次调用。`calls`：`llm_questions` 重试时为 2；`llm_verdict` 是轮数，图片被拒并重试时加一（`temperature` 的重试不计，原有行为）。

### 15.5 结果字段与缓存

- `sent_images` 是发出的图片 part 数；`skipped_images` 是输入的图片数减去它（重复的图片计在这里，与 Jev 相同）；`received`（不进 trace）是发出的图片及其重复图片在输入里的下标，400 回退之后为空。关着图片时与此前相同：全部跳过，没有收到的。
- 缓存规则（5.3.5）不用改就适用：复核的 LLM 审核器收到图片并通过，图片在推翻它的那一级里被通过的审核器收到，记"通过"，被推翻的运行可以整块缓存，同一请求之后是 `pass (cached)`；它命中，命中集合包含图片。它没收到的图片（跳过的、400 回退的）按"只被命中的审核器收到的图片"处理。
- 第五轮的"留下已缓存的文字"收窄为只用于混合流程，见 5.3.5。

### 15.6 提示词

两处固定文字各加一句，说明图片也是待审内容：`llm_questions` 的系统提示词（`llmqSystem`）加"消息里附带的图片同样是待审内容，与文本一并判断。"；`llm_verdict` 的默认系统提示词（`DefaultSystemPrompt`）加"消息里附带的图片同样是待审核的输入，与文字一并判断。"。这两处是写在代码里的判定默认值，所以 `judgingVersion` 加一（15.1）。**自己写了 `system_prompt` 的 `llm_verdict` 审核器不会自动得到这句话**：图片照发，提示词里是否提到图片由管理员决定。

### 15.7 试跑、测试、模拟

`POST /auditors/:id/try`、`POST /auditors/try`、流程的模拟和 `POST /test` 走同一条 `audit` 路径，本来就把请求体里的 `images` 交给审核器：LLM 审核器现在收到它们，结果（试跑的返回、trace 里各审核器的结果）带 `sent_images` / `skipped_images`。试跑的草稿里改了开关就按草稿试。

### 15.8 费用，以及升级后的行为变化

- **费用**：每次带图片的审核调用都按图片计 token（Anthropic 每 28×28 像素一个 token，超过模型上限的图片由上游缩小；OpenAI 另有算法），`llm_verdict` 多轮时每一轮都重发。LLM 审核器做复核时，只在前一级命中后才调用；放在第 1 级时每个带新图片的请求都付这笔钱。
- **现有配置升级后**：
  - 现有的 LLM 审核器开始收到图片。以前"第 1 级因图片命中、只读文字的 LLM 复核推翻"的请求每次都放行（5.3.5 第四轮）；现在复核看得到图片，可能确认命中——**以前放行的请求可能被拒绝**。反过来，复核看图后通过的，图片进缓存，这类请求不再每次重审。
  - 只有图片的块以前让 LLM 审核器跳过，现在会调用它。
  - 判定缓存因为 `judgingVersion` 变化全部重建一次（从 0.7.2 升级本来就全部重建；已经在跑 0.8.0 预发布构建的部署会再重建一次）。
- **模型不支持图片时要关掉开关**。上游对图片报 400 的，每次调用多一次往返再只审文字（15.4），关掉开关可省掉。更要紧的是不报错、直接忽略图片的上游（一些兼容 OpenAI 的网关接纯文字模型时如此）：审核器"收到"了图片并通过，图片被缓存成"通过"，而模型其实没看过。开关就是为这种模型准备的。

### 15.9 限制

1. 上游以 400 拒绝的图片只按文字审；同一次调用里的全部图片一起回退，分不出是哪一张被拒。
2. 不重画：解码后超过 5 MiB 或某一边超过 8000 px 的图片 LLM 审核器看不到（Jev 会缩小后送审）。这样的图片被别的审核器命中时，LLM 复核只凭文字判断（5.3.5 第四轮的规则适用）。
3. 非混合流程里"同一请求先放行、后拒绝"的残留情形（5.3.5"只用于混合流程"）。
4. `llm_verdict` 多轮时每一轮重发图片。

### 15.10 测试

`llm_image_test.go`：

- `TestLLMAuditorsSendImages`：三种协议、两种审核器类型的请求体——文字 part 在前，PNG 和 JPEG 各一个 part、形状和媒体类型正确（JPEG 没有声明类型），重复的 PNG 只发一次；URL 图片、超大图片、8001 px 的图片、无法识别的格式被跳过；`sent_images = 2`、`skipped_images = 5`、`received = [0,1,2]`；文字 part 带自身请求标记。
- `TestLLMImageLimits`：四种格式按文件头识别（声明错的类型被纠正）；解码后恰好 5 MiB 发、多 1 字节不发（大小由 base64 的长度算出，三种填充情况）；8000 px 发、8001 px 不发（两个方向）；重复图片；合计上限（放不下的跳过，后面小的仍发）；20 张上限。
- `TestLLMAuditorsImagesOff`：`review_images: false`，两种类型、三种协议——没有图片 part，user 消息是纯字符串，计数与此前相同，只有图片时跳过。
- `TestLLMAuditorsImageOnlyInput`：只有图片，开着时被审；没有可发的图片时跳过。
- `TestLLMAuditorsImagesRefused`：带图调用 400 → 只发文字重试一次，结论来自重试，`received` 为空，`calls = 2`；只有图片时跳过；413 / 429 / 500 不重试；不带图片的 400 不重试。
- `TestAgentImagesAndRetries`：`llm_verdict` 三轮里图片只在第一条 user 消息；`temperature` 和图片先后被拒（两种顺序）恰好 `max_turns + 2` 次调用；一直 400 的上游两次调用后报错。
- `TestLLMPromptsNameTheImages`：两处提示词。
- `TestLLMReviewerSeesTheImage`（流程级，OpenAI 第 1 级对图片命中，第 2 级 `llm_questions` 开着图片）：复核收到文字和图片并通过 → 被推翻，图片记"通过"，同一请求再发是 `pass (cached)`；复核确认 → 拒绝，命中集合含图片，再发是重放；文字已被别的请求缓存时图片单独送给两个审核器、不带已缓存的文字（非混合流程）；试跑和 `/test` 报告 `sent_images` / `skipped_images`，草稿关掉开关后不发图片；保存 `review_images: false` 后指纹变化、流程成为混合流程、复核不再收到图片。

改动的已有测试：`TestAuditorJudge`（LLM 类型接受开关）、`TestCleanupAndImport`（导入带不带 `review_images` 的 `llm` 审核器，原值保留）、`TestLLMQuestionsTextOnly`（改为关着开关）、`TestFingerprintJudgingVersion`（版本 2 的指纹）、第五轮的三个测试和 `TestSkippedImageIsNotCachedAsPassed`（5.3.5"只用于混合流程"）。

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
