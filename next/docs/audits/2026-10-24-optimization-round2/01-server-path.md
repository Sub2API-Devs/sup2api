# 服务端核心请求路径优化计划
## 范围：next/server/internal/{gateway,usage,usagerules,billing,providerresources,updater}

---

## 1. 热点函数一览

以下函数超过 80 行或嵌套深度 ≥ 5，按行数降序排列，附一行诊断。

| 文件:起始行 | 函数 | 行数 | 最深嵌套 | 诊断 |
|---|---|---|---|---|
| gateway/dispatch.go:437 | `forwardBuilt` | 207 | 3 | 顺序验证流水线之后接转发，线性但过长；4 个补丁验证守卫可提取 |
| usage/settler.go:377 | `insertAtomic` | 152 | 5 | 单事务内三个阶段（free/reserved/settleNow），嵌套来自事务回调；**不可拆分事务** |
| gateway/resource_upload.go:181 | `upload` | 151 | 4 | 线性上传流水线；长度来自 reserve→upload→finalize 三步顺序，可读性尚可 |
| gateway/dispatch.go:43 | `dispatch` | 150 | 4 | 调度 + failover 循环；核心算法，线性可读 |
| gateway/forward.go:267 | `forwardSSE` | 150 | 4 | SSE 流式状态机；长度是固有的，禁止拆分 |
| gateway/helper_history_request.go:126 | `wrapHelperHistoryRequest` | 124 | 2 | 顺序守卫链；深度低，长度来自多个独立决策步骤 |
| gateway/resource_skills_upload.go:193 | `skillUpload` | 124 | 3 | 线性技能上传流水线；与 `upload` 结构平行，可提取公共辅助 |
| gateway/websocket.go:144 | `run` | 119 | 4 | WebSocket 事件循环 select；**不可拆分**，多路复用必须在同一 select |
| gateway/resource_http.go:376 | `existing` | 112 | 3 | 同一函数处理 GET 和 DELETE，两条独立逻辑路径 |
| gateway/precharge.go:19 | `precharge` | 111 | 4 | 两处几乎相同的本地分词器回退路径重复 |
| gateway/rank.go:72 | `rankOverrides` | 108 | 3 | 多插件循环；线性可读，无需提取 |
| usagerules/anthropic_attempts.go:34 | `anthropicFallback` | 108 | 4 | 嵌套过深，内层 for + switch + if 可用早返回打平 |
| gateway/resource_http.go:46 | `serveResourceHTTP` | 107 | 3 | 路由+鉴权，线性，长度来自检查步骤多 |
| gateway/resource_upload.go:44 | `spoolResourceUpload` | 105 | 3 | multipart 解析循环；顺序合理 |
| usage/reconcile.go:365 | `askPlugin` | 104 | 5 | 三个协议分支（monitor/poll/build）混在一个函数，嵌套来自分支嵌套 |
| billing/expr/generate.go:281 | `ruleExpr` | 102 | 3 | 规则 AST 生成；长度来自 case 数量 |
| usagerules/attempts.go:60 | `applyAttempts` | 102 | 3 | 两个阶段可分离 |
| usage/api.go:174 | `parseFilter` | 102 | 4 | 多个查询参数分组解析，各段可独立 |
| gateway/websocket.go:512 | `dial` | 101 | 3 | 顺序连接建立，线性 |
| gateway/hooks.go:408 | `runHook` | 99 | 3 | 钩子分发；线性 |
| updater/http.go:35 | `registerRoutes` | 98 | 3 | 路由注册；长但极简单 |
| gateway/resource_skills_existing.go:12 | `existingSkill` | 95 | 2 | 顺序查找+权限，线性 |
| providerresources/skills_upload.go:106 | `CompleteSkillUpload` | 94 | 3 | DB 操作序列 |
| gateway/resource_http.go:283 | `list` | 92 | 3 | 查询参数解析+分页；尚可接受 |
| usage/reconcile.go:599 | `settleReconciled` | 91 | 3 | billing_status FOR UPDATE 重复第 4 次 |
| gateway/dispatch.go:345 | `attempt` | 91 | 3 | 顺序上游请求准备 |
| gateway/websocket.go:418 | `connect` | 91 | 4 | 账号选择+连接，嵌套来自 sticky |
| gateway/execute.go:71 | `executeAttempt` | 90 | 3 | 执行回调状态机；观测/记录/提交三态，不可化简 |
| gateway/websocket.go:324 | `begin` | 90 | 4 | 每轮请求准备；嵌套来自 defer 闭包 |
| providerresources/skills_upload.go:15 | `ReserveSkillUpload` | 90 | 5 | DB 事务嵌套 if 过深 |
| gateway/fallback_credit.go:149 | `observeFallbackCredit` | 59 | 5 | 嵌套来自两层 event 循环 + 类型判断 |
| gateway/dispatch.go:209 | `pick` | 71 | 5 | sticky 探测 + 候选池遍历，可提取 sticky 段 |
| billing/sync.go:743 | `scalePrice` | 64 | 5 | 嵌套来自嵌套 if 价格缩放模式判断 |
| billing/expr/analyze.go:238 | `Visit` | 23 | 5 | 嵌套来自类型断言链 |

---

## 2. 优先计划（S1–S21）

### 死代码删除（零风险）

**S1** — `gateway/forward.go:457` — 函数 `readPrefix`
- **做什么**：直接删除函数体及注释（6 行）。
- **验证死代码**：staticcheck U1000 + deadcode 双重确认；全库 grep `readPrefix` 仅此定义，无调用者。
- **行为变化**：无。
- **测试覆盖**：无测试引用，删除后运行 `go build ./...` 即验证。
- **风险**：无。

**S2** — `gateway/ssrf.go:15-16` — 变量 `errBadUpstreamURL`、`errPrivateUpstream`
- **做什么**：删除两行 var 声明。`checkUpstreamURL` 直接调用 `netguard.CheckURL`，不通过这两个变量；全库 grep 无其他引用。
- **行为变化**：无。
- **测试覆盖**：`gateway/ssrf_test.go`（如有）验证 checkUpstreamURL 行为不变即可。
- **风险**：无。

**S3** — `usagerules/attempt_facts.go:10` — 函数 `cloneAttemptFacts`
- **做什么**：删除函数体（13 行）及文件顶部 import（如变空则删文件）。
- **验证死代码**：staticcheck U1000 + deadcode；grep `cloneAttemptFacts` 全库无调用者（测试包含）。
- **行为变化**：无。
- **测试覆盖**：无。
- **风险**：无。

**S4** — `billing/billing.go:102` — 方法 `(*Service).changedAfterCommit`
- **做什么**：删除方法（12 行）。
- **验证死代码**：staticcheck U1000 + deadcode；grep `changedAfterCommit` 全库仅此定义。`billing_test.go` 中的 `(*env).plugin` 同为 U1000（测试 helper，false positive，不删）。
- **行为变化**：无。`changed` 方法保留（仍有调用者）。
- **测试覆盖**：无测试直接调用此方法。
- **风险**：无。

**S5** — `billing/expr/expr.go:73` — 包级函数 `Version(src string) (int, error)`
- **做什么**：删除 4 行函数。
- **验证死代码**：deadcode 确认此包级函数不可达；`prog.Version()` 方法（expr.go:154）和 `prog.Hash()` 仍在大量使用，与此函数无关。grep `expr\.Version(` 全 server 模块无调用。
- **行为变化**：无。
- **测试覆盖**：grep `billing/expr/*_test.go` 无调用。
- **风险**：无。

---

### 小型提取（安全，单文件改动）

**S6** — `usage/reconcile.go` + `usage/monitor.go` — 提取 `lockUsageRow`
- **做什么**：将以下重复出现 5 次的模式提取为包私有帮助函数：
  ```go
  // lockUsageRow 在调用方事务内锁定并读取 billing_status。
  func lockUsageRow(ctx context.Context, tx pgx.Tx, id int64) (status string, err error) {
      err = tx.QueryRow(ctx, `SELECT billing_status FROM usage_logs WHERE id=$1 FOR UPDATE`, id).Scan(&status)
      return
  }
  ```
  调用处从 5 个 `QueryRow(...).Scan(&status)` 内联块替换为 `lockUsageRow(ctx, tx, e.usageLogID)`。
- **行为变化**：无。SQL 语句一字不差（注意 reconcile.go 中有一处用空格隔开 `id = $1`，统一为 `id=$1` 无语义差异）。
- **测试覆盖**：`usage/reconcile_test.go`、`usage/task_reconcile_test.go` 覆盖全部分支；无需新增测试。
- **风险**：极低，纯机械替换。

**S7** — `usage/settler.go` + `usage/reconcile.go` — 提取 `cacheBalance`
- **做什么**：将以下在 6 处重复的模式：
  ```go
  if ledgerRes != nil && !ledgerRes.Duplicate {
      s.ledger.CacheBalance(ctx, ..., ledgerRes.LedgerID, ledgerRes.BalanceAfter)
  }
  ```
  提取为：
  ```go
  func (s *Service) cacheBalance(ctx context.Context, userID int64, res *core.LedgerResult) {
      if res != nil && !res.Duplicate {
          s.ledger.CacheBalance(ctx, userID, res.LedgerID, res.BalanceAfter)
      }
  }
  ```
- **行为变化**：无。
- **测试覆盖**：现有 usage_test.go、reconcile_test.go 覆盖。
- **风险**：极低。注意 `billing/ledger.go:82` 同模式但在不同包，不合并（不同类型）。

**S8** — `usage/settler.go:369-374` — 内联 `insertWith`
- **做什么**：`insertWith` 只有一个调用者（`insert`，传 `nil` before），`insert` 只是 `insertWith(ctx, batch, nil)` 的别名。将 `insert` 改为直接调用 `insertAtomic(ctx, batch, nil, nil, false)`，删除 `insertWith`。
- **行为变化**：无。
- **测试覆盖**：`usage/usage_test.go` 中 `f.svc.insert(...)` 直接覆盖。
- **风险**：无。

**S9** — `gateway/precharge.go:19` — 提取 `localTokenizerEstimate`
- **做什么**：将 precharge 中两段几乎相同的本地分词器路径（lines 51-62 和 lines 67-72）提取为：
  ```go
  func localTokenizerEstimate(ctx context.Context, prompt string, floor int64) (*pluginv1.UsageReport, error) {
      n, _, err := tokenizer.Count(ctx, prompt, "")
      if err != nil {
          return nil, err
      }
      return &pluginv1.UsageReport{Tokens: &pluginv1.UsageTokens{InputTokens: max(n, floor)}}, nil
  }
  ```
  两处调用点替换，precharge 从 111 行降至约 85 行，深度降至 3。
- **行为变化**：无。逻辑完全相同。
- **测试覆盖**：`gateway/precharge_test.go` 覆盖两条路径。
- **风险**：低。注意第一处在 `codes.Unimplemented` 分支内，需确认 return 路径不变。

**S10** — `gateway/dispatch.go:437` — 提取 `validatePatches`
- **做什么**：将 forwardBuilt 内 4 个顺序守卫（lines 463-476）：validateResourceReferencePatches、validatePatchedModelReferences、validateModelReferencePatches、两个 billing 检查，提取为：
  ```go
  func (c *call) validatePatches(rt *typeRoute, upBody, body []byte) *gwError {
      if err := c.validateResourceReferencePatches(rt.upstream, upBody, body); err != nil {
          return invalidModelReference(err.Error())
      }
      if err := c.validatePatchedModelReferences(upBody, body); err != nil {
          return invalidModelReference(err.Error())
      }
      if err := validateModelReferencePatches(upBody, body, rt.modelReferences); err != nil {
          return invalidModelReference(err.Error())
      }
      if c.ep.Billing != "free" && !c.routeHasRequiredPrimaryUsageFor(rt, body) {
          return invalidModelReference("account usage rules cannot meter the requested operation")
      }
      if c.ep.Billing != "free" && !c.routeHasRequiredAttempts(rt, body) {
          return invalidModelReference("account usage rules cannot meter the requested attempts")
      }
      return nil
  }
  ```
  forwardBuilt 从 207 行降至约 190 行；守卫可独立测试。
- **行为变化**：无。
- **测试覆盖**：现有 gateway 的 `resource_references_test.go`、`model_references_test.go` 覆盖各守卫。
- **风险**：低。注意 `invalidModelReference` 的 `attemptResult.kind` 分别是 `attemptReturn` 和 `attemptFailover`；提取后必须保留原来的 kind 差异——可在返回 `*gwError` 时同时返回 kind，或让调用者依原始规则决定 kind。推荐返回 `(kind attemptKind, err *gwError)` 以保持语义。

---

### 嵌套打平（中等风险，需仔细验证）

**S11** — `usagerules/anthropic_attempts.go:34` — 打平 `anthropicFallback` 嵌套
- **做什么**：内层 `for model := range models { for _, attempt := range ... { switch ... { ... }}}` 可用早返回 + 命名辅助 `matchAttemptRule(rules, attempt) (matched bool, rule X)` 降至嵌套 ≤ 3。
- **行为变化**：无，纯结构重组。
- **测试覆盖**：`usagerules/attempts_test.go`；若无专项测试则先补一个输入为空 rules / 单 rule 命中 / 无命中的表格测试。
- **风险**：中。usagerules 逻辑细节多，重组后必须跑完整测试套。

**S12** — `gateway/fallback_credit.go:149` — 打平 `observeFallbackCredit` 嵌套 5→≤3
- **做什么**：最深嵌套来自双层事件循环 + 类型判断。将内层事件匹配逻辑提取为 `creditEventAmount(ev resourceResponseEvent) (decimal.Decimal, bool)`，外层改用 guard clause 早返回。
- **行为变化**：无。
- **测试覆盖**：`gateway/fallback_credit_test.go`、`fallback_credit_independent_review_test.go` 覆盖；无需新增。
- **风险**：中。涉及账单金额逻辑，必须对比前后的 decimal 结果完全一致。

**S13** — `gateway/dispatch.go:209` — 提取 `tryStickyBinding`
- **做什么**：pick 前 30 行的 sticky 探测代码（lines 211-236）提取为：
  ```go
  func (c *call) tryStickyBinding(ctx context.Context, cands []core.AccountRef, exhausted map[int64]bool) (*core.AccountRef, func(), bool) // (ref, release, tried)
  ```
  pick 深度从 5 降至 3，sticky 逻辑可独立阅读和测试。
- **行为变化**：无。注意 `c.dropBinding(ctx, s)` 的副作用必须保留在同一条件分支中。
- **测试覆盖**：`gateway/rank_test.go`；需检查 sticky 路径覆盖，必要时补充。
- **风险**：中。sticky failover 语义敏感，提取后对比测试结果。

**S14** — `billing/expr/analyze.go:238` — 打平 `Visit` 嵌套 5→3
- **做什么**：当前是 `switch node.(type) { case *X: switch node.(*X).Field.(type) { ... }}` 的两层类型断言。改用带 ok 的类型断言 + 早返回：
  ```go
  func (v *visitor) Visit(node ast.Node) ast.Visitor {
      call, ok := node.(*ast.CallExpr)
      if !ok { return v }
      ident, ok := call.Fun.(*ast.Ident)
      if !ok { return v }
      // ...
  }
  ```
- **行为变化**：无。
- **测试覆盖**：`billing/expr` 包内测试；AST visitor 行为测试需完整覆盖。
- **风险**：低，纯控制流重组。

**S15** — `billing/sync.go:743` — 打平 `scalePrice` 嵌套 5→≤3
- **做什么**：嵌套来自多层 `if mode == X { if field != nil { if value > 0 { ... }}}` 的价格缩放模式判断。改用早返回守卫 + 命名辅助 `scaleFactor(mode string, price *Price) (decimal.Decimal, bool)` 剥离决策逻辑。
- **行为变化**：无，价格缩放的数值结果必须逐 mode 验证一致。
- **测试覆盖**：`billing/sync_test.go`；检查是否覆盖每种 mode，不足时补充表格测试。
- **风险**：中。价格计算逻辑，改后必须数值级别回归测试。

---

### 函数拆分（较大改动）

**S16** — `gateway/resource_http.go:376` — 拆分 `existing`
- **做什么**：将 `existing` 拆为 `existingGet(id string, content bool)` 和 `existingDelete(id string)`。两条路径（DELETE vs GET/GET-content）共用 12 行准备代码（资源查找、账号检查、binding 验证、lease），提取为 `prepareExisting(id string) (*core.ProviderResource, core.AccountRef, core.ResourceBinding, context.Context, func(), error)`，两个新函数各自调用。
- **行为变化**：无。
- **测试覆盖**：`gateway/resource_http_test.go`、`resource_http_review_test.go` 覆盖。
- **风险**：中。注意 `operation` 变量在 DELETE 路径有额外赋值，确保 `existingDelete` 中的 `FinishDelete` 调用仍使用 reservation 的 OperationID 而非原始 r.OperationID。

**S17** — `usage/reconcile.go:365` — 拆分 `askPlugin` 三条协议路径
- **做什么**：当前 `askPlugin` 用 `if monitor { ... } / if poll { ... } / else { ... }` 三个分支，嵌套深度 5。提取为：
  ```go
  func (s *Service) askPlugin(ctx, e, row) (*pluginv1.ReconcileResult, error) {
      // capability 探测 + account 获取（公共）
      switch {
      case monitor: return s.askMonitor(...)   // 已有
      case poll:    return s.pollPlugin(ctx, e, row, client, entry, acct, proxyID)  // 新
      default:      return s.buildReconcile(ctx, e, row, client, entry, acct, proxyID) // 新
      }
  }
  ```
  poll 和 build 分支各 30-40 行，目前混在 askPlugin 中。
- **行为变化**：无。公共逻辑（capability 探测、account 获取、entry 构建）保留在 `askPlugin`。
- **测试覆盖**：`usage/reconcile_test.go`、`usage/poll_test.go`、`usage/task_reconcile_test.go` 覆盖三条路径。
- **风险**：中。deferred.Load() 检查必须在 poll 分支内保留，不能遗漏。

**S18** — `usage/api.go:174` — 拆分 `parseFilter`
- **做什么**：将 102 行的过滤器解析按关注点拆分为 3 个包私有函数，parseFilter 调用它们：
  - `parseTimeRange(q url.Values) (from, to *time.Time, err error)`
  - `parseTokenPagination(q url.Values) (page int, limit int, err error)`
  - `parseModelScope(q url.Values) (model, protocol string, err error)`
  parseFilter 保留参数白名单检查和最终组装，降至约 30 行。
- **行为变化**：无。
- **测试覆盖**：`usage/api_filter_test.go` 覆盖；子函数可单独表格测试。
- **风险**：低。

**S19** — `usagerules/attempts.go:60` — 拆分 `applyAttempts` 两阶段
- **做什么**：当前函数混合了"加载 attempt 规则"和"将规则应用到 acc"两个阶段。提取 `loadAttemptRules(rules manifest.UsageRules, body []byte) ([]attemptRule, error)` 作为纯函数，`applyAttempts` 调用它再应用结果。
- **行为变化**：无。
- **测试覆盖**：`usagerules/attempts_test.go`；加载阶段可独立表格测试。
- **风险**：低。

---

### 设计层备注（不立即改代码）

**S20** — `usage/settler.go` — 双重估值备注
- `(s *Service).priceOne` 先调用 `s.quoter.Quote`（经过 billing.Service，内部 compile+normalize+eval），再直接 `prog.Eval` 取 breakdown 用于 BillingDetail。两次 compile+eval 是有意为之：quoter 接口只返回最终成本，breakdown 需要原始 res。如果后续想优化，可在 `core.Quoter` 接口上增加 `QuoteWithDetail(ctx, in) (decimal.Decimal, BillingDetail, error)`，让 billing.Service 一次 eval 同时返回两者，消除第二次 eval。**现在不改**，仅在 priceOne 处加注释说明原因，避免将来被人认为是 bug 而删掉第一次调用。

**S21** — SSE 行解析共享
- `forwardSSE` 和 `resourceResponseEvents` 都解析 `event:` / `data:` 前缀。前者是流式（bufio），后者是缓冲区扫描，**不能共享 reader**。但字段提取本身（`bytes.HasPrefix(t, []byte("event:"))` / `bytes.TrimSpace(string(t[6:]))` 等 4 行）可提取为 `parseSSEField(line []byte) (field, value string)`。改动极小，暂列为低优先级后续清理，不在本轮执行。

---

## 3. 不动项及理由

| 函数 | 理由 |
|---|---|
| `forwardSSE` (forward.go:267, 150行) | 流式传输状态机，length 固有；拆分会引入闭包/回调，反而增加认知负担 |
| `dispatch` (dispatch.go:43, 150行) | failover 循环是核心调度算法，所有路径（done/failover/return/canceled）必须在同一 for 内可读 |
| `insertAtomic` (settler.go:377, 152行) | **计费原子性约束**：free 释放预扣、reserved 定价+分类账、settleNow 三阶段必须在同一 pgx.Tx 回调内；深度5 来自事务回调的嵌套，不是逻辑复杂度 |
| `run` (websocket.go:144, 119行) | WebSocket 事件循环 select；多路定时器（idle/poll/lease）必须在同一 select 中才能原子切换，拆分会引入 goroutine 和竞态 |
| `executeAttempt` (execute.go:71, 90行) | 观测/提交三态持久化状态机（observed/recorded/sent）；状态间转换有精确的崩溃恢复语义，重组风险高 |
| `wrapHelperHistoryRequest` (helper_history_request.go:126, 124行) | 深度仅 2，长度来自大量顺序守卫；改动 helper history 语义的风险超过收益 |
| `upload` / `spoolResourceUpload` (resource_upload.go, 151/105行) | 顺序文件上传流水线，深度 3-4；保持不变有利于故障排查 |
| `settleReconciled` / `refundFailed` / `abandon` / `keepEstimate` | 计费结算路径；**不在本轮改动**，等 S6/S7 小提取稳定后再考虑 |
| `forwardBuilt` 的 proxy/client 选择逻辑（lines ~479-530） | managedCCG 分支的 TLS 客户端选择涉及 relay-passthrough 约定；不动 |
| `billing/prices.go:previewPrice` / `updatePrice` | CRUD 流水，长度来自 JSON binding + SQL；不是复杂度问题 |
| `updater/http.go:registerRoutes` | 路由注册，98行全是 `r.GET/POST`；不动 |
| `gateway/convert.NewRegistry` | deadcode 报告为 false positive（测试和生产都有调用） |
| `usage/priceOf` / `usage/priceOne`（包级） | deadcode false positive：两者均是测试辅助函数，被 `additional_test.go`、`price_rules_test.go`、`replacement_test.go` 大量使用 |
| `gateway/resource_scan_cache.scan` | deadcode false positive：被 `resource_scan_cache_test.go`、`resource_scan_review_test.go` 使用 |
| `gateway/resource_references.go:151` `validateResourceReferencePatches`（包级函数） | deadcode false positive：被 `resource_references_test.go:78` 使用作测试入口 |

---

## 4. 执行顺序（单一写者建议）

```
第一轮（无风险，可快速提交）：S1 → S2 → S3 → S4 → S5
第二轮（小提取，每项独立提交）：S8 → S6 → S7 → S9 → S10
第三轮（嵌套打平）：S14 → S15 → S12 → S11 → S13
第四轮（函数拆分）：S18 → S19 → S16 → S17
后续（可选）：S20 注释 → S21 parseSSEField
```

每轮之间跑 `go test ./internal/gateway/... ./internal/usage/... ./internal/usagerules/... ./internal/billing/...`，确认无回归后再进入下一轮。第三、四轮中凡涉及计费逻辑的项（S12、S13、S16、S17）需特别确认对应 DB 测试（PG 测试）真实运行，不可被跳过。

---

## 6 行摘要

在分析的 859 个非测试函数中，此区域有 34 个热点（>80 行或嵌套≥5）。真正需要清理的死代码 5 项（S1-S5），全部可无风险删除。主要重复模式是计费 `billing_status FOR UPDATE` 锁定（5 处）和 `cacheBalance` 后处理（6 处），各提取一个辅助函数解决（S6-S7）。嵌套最深的问题集中在 `anthropicFallback`、`observeFallbackCredit`、`pick` 和 `scalePrice`（深度 5），用早返回和辅助函数打平（S11-S15）。大多数超长函数（`forwardSSE`、`dispatch`、`insertAtomic`、`run`）长度是固有的，不应拆分。整轮改动 21 项，全部不触及行为语义，无协议变更，无接口变更。

---

## 7. 处理结果（2026-10-24，写者：核心 `next/server` 请求路径）

范围：`next/server/internal/{gateway,usage,usagerules,billing}`（S1–S21）。未提交、未推送。
逐项核对过代码；与计划不符的地方在「说明」里写明。

### 7.1 已完成

| 项 | 状态 | 实际改动与说明 |
|---|---|---|
| **S1** `readPrefix` | 完成 | 删除 `gateway/forward.go` 的函数与注释；全库 grep 只此定义。`io` 仍被文件其它部分使用。 |
| **S2** `errBadUpstreamURL/errPrivateUpstream` | 完成 | 删除 `gateway/ssrf.go` 的两个包级 var；`checkUpstreamURL` 直接调 `netguard.CheckURL`，无引用。 |
| **S3** `cloneAttemptFacts` | 完成 | 删除 `usagerules/attempt_facts.go` 的函数（13 行）；文件保留（`extractAttemptFacts`/`attemptFactSum` 仍在用 gjson）。 |
| **S4** `(*Service).changedAfterCommit` | 完成 | 删除 `billing/billing.go` 的方法；`changed` 保留（仍有调用者）。`billing` 的 `time` import 仍被他处使用。 |
| **S5** `expr.Version` | 完成 | 删除包级函数；`Program.Version()` 方法不动。`billing/expr` 测试无引用。 |
| **S6** `lockUsageRow` | 完成 | 新增包私有函数（`usage/settler.go`）。替换 5 处：`reconcile.go` 4 处、`monitor.go` 1 处。SQL 统一为 `id=$1`（原两处是 `id = $1`，语义相同）。三个 `settleReconciled`/`refundFailed`/`abandon` 回调内的局部 `err` 作用域已核对：`ledgerRes, err = ...` 的赋值目标仍是同一闭包返回值，测试（含 PG）全绿。 |
| **S7** `cacheBalance` | 完成 | 新增 `(*Service).cacheBalance(ctx, userID, res)`，替换 4 处直调：`reconcile.go`×2、`settlements_api.go`、`settler.go`（`settleOne` 尾）。计划说的「6 处」里另外 3 处（`settler.go:481/495/506` 的 `insertAtomic` 内）是**收集到 `cached []balanceUpdate` 后统一刷**，并非直调，形态不同，未合并。 |
| **S8** 内联 `insertWith` | 完成 | `insert` 直接调 `insertAtomic(ctx, batch, nil, nil, false)`，`insertWith` 删除。 |
| **S9** `localTokenizerEstimate` | 完成 | 两段本地分词器回退（Unimplemented 分支与非 adapter 分支）共用该函数；两处原本对 `tokenizer.Count` 的错误处理一个立即返回、一个落到尾部统一返回，合并后行为一致（都是返回该 err）。 |
| **S10** `validatePatches` | 完成 | 5 个守卫提为一个方法，返回 `(attemptKind, *gwError)` 以保留首个守卫 `attemptReturn`、其余 `attemptFailover` 的差异。`forwardBuilt` 少 15 行。 |
| **S11** `anthropicFallback` 打平 | 完成 | 新增 `attemptEntryModel`（模型身份）与 `attemptChain`（连续分组 + 模型重现 + fallback 终态），采样迭代循环降到 2 层。错误文案与判定顺序逐条核对未变。 |
| **S12** `observeFallbackCredit` 打平 | 完成 | 提 `creditPayloads(events)` 与 `sseProviderError(payloads)`；SSE payload 收集与「Ready 为空时把 provider error 当正常转发」的条件顺序不变。 |
| **S13** `tryStickyBinding` | 完成 | `pick` 的 sticky 段提为该函数，返回 `(ref, release, handled)`；`s.tried` 的置位、`dropBinding` 的副作用、`hit` 的赋值都在原分支内。命中时 `pick` 返回 `false`（不 busy），未命中继续原候选池流程。 |
| **S14** `refCollector.Visit` 打平 | 完成 | 拆为 `visitCall`/`addFact`。说明：计划描述的「两层 `switch node.(*X).Field.(type)`」与实际代码（单个类型 switch + 内层 `switch id.Value`）不符；按目标行（`analyze.go:238` 的 `refCollector.Visit`）处理。 |
| **S15** `scalePrice` 打平 | 完成 | 提 `scaleVideoConfig`（返回是否命中 video 块）与 `scaleAsExpression`；`billing` 测试（含价格缩放对拍）全绿。 |
| **S16** `existing` 拆分 | 完成 | 提 `prepareExisting`（Get/有效期/账号/身份/binding/lease）、`existingDelete`、`existingGet`。DELETE 仍用 reservation 的 `OperationID` 调 `FinishDelete`；GET 的 content/metadata 两路未变。 |
| **S17** `askPlugin` 拆分 | 完成 | 提 `pluginObservationContract`、`askPoll`、`buildAndAsk`；`deferred.Load()` 检查仍在 poll 分支内。 |
| **S18** `parseFilter` 拆分 | 完成（按实际代码） | 提 `addContainsFilters`、`addTimeRange`。说明：计划列的 `parseTokenPagination`/`parseModelScope` 在 `parseFilter` 里不存在（分页在 `httpapi.Pagination`，model/protocol 是普通等值过滤），未生造函数。 |
| **S19** `applyAttempts` 拆分 | 完成（按实际代码） | 拆为 `applyAttemptsMessage`（非流式消息）与 `applyAttemptEvent`（流式事件状态机）。说明：计划说的「加载规则 / 应用到 acc」两阶段与代码结构不符（规则加载是 `extractAttemptFacts`，早已独立），实际可分离的是协议两路。 |
| **S20** 双重估值备注 | 完成 | 在 `usage/settler.go` 的第二次 `prog.Eval` 前加注释，说明 `Quote` 只返回金额、`billing_detail` 需要 tier/rules/breakdown，且 `amount` 已含倍率与舍入，不可互替。 |

### 7.2 未做（附理由）

| 项 | 理由 |
|---|---|
| **S21** `parseSSEField` | 计划本身列为「低优先级后续清理，不在本轮执行」；本轮未做。 |

### 7.3 验证

- `go build ./...`、`GOOS=linux go vet ./...`：通过。
- `gofmt -l`（全部改动文件）：无输出；`goimports` 已跑。
- `go test -count=1 ./internal/gateway/... ./internal/usage/... ./internal/usagerules/... ./internal/billing/...`：全绿（gateway 52.9s、usage 95.5s、usagerules、billing 44.1s、billing/expr）。
- PG 用例真跑：`TestPurgePluginAccountsMarksRuntimeCleanup` 等在本机 PostgreSQL 上 1.1–1.5s 完成（无 SKIP）；`usage` 的 DB 用例随包一起跑（95s）。
- `staticcheck -checks 'all,-ST1000,-ST1003,-ST1005,-ST1020,-ST1021,-ST1022,-SA1019'`：本区改动无新增告警（`billing/prices.go:493` 的 SA4006 与 `usagerules` 无关，改动前已存在）。
- `deadcode ./cmd/...`：见 02 文档 7.3 的同类列表（本区无新增不可达函数）。

### 7.4 行为变化

无。SQL 文本、错误文案、事件、HTTP 响应均未变（S6 的两处 `id = $1` 空格差异无语义；`cacheBalance` 只合并了同一条件）。

### 7.5 复验（第二轮，2026-10-24）

位置说明：S1–S21 与 7.1–7.4 是同一写者先前写好的；本条只是交接后的最终复验，未新增 S 项。S21（`parseSSEField`）按 7.2 保持未做。

按顺序、每条命令各跑一次：

1. `go build ./...`：通过。
2. `GOOS=linux go vet ./...`：通过。
3. `gofmt -l`（`git diff HEAD` 中 `next/server` 的全部改动 `.go`）：无输出。
4. `staticcheck -checks 'all,-ST1000,-ST1003,-ST1005,-ST1020,-ST1021,-ST1022,-SA1019' ./...`：24 条，全部落在本轮未触碰的文件（清单见 02 文档 7.5）；本区（gateway / usage / usagerules / billing）无新增，7.3 提到的 `billing/prices.go:493` SA4006 仍未修（改动前既有，不属本区）。
5. `go test -count=1 ./...`（整个模块）：**49 个包 ok，0 FAIL**（gateway 80.8s、usage 83.5s、billing 73.8s、usagerules 3.4s、billing/expr 3.9s、account 181.7s、ccgateway 194.7s，其余 1–68s；7 个包 `no test files`）。

PG 用例真跑（`-v` 抽查，0 SKIP）：`TestPurgePluginAccounts` 系列、`TestRetainedDeletedRuntimeBlocksThenPurgesOnce`、`TestRuntimePurgeEndsRetention`、`TestDeleteRetainResources`、`TestQuotaSweepBoundedAcrossNodes`、`TestKickReconcilesWithoutWaitingForTheSweep` 全 `--- PASS`；`usage` 与 `account` 的 DB 用例随包一起跑完（83.5s / 181.7s，说明确实连库）。
