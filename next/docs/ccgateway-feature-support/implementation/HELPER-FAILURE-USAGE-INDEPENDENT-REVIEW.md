# Helper 失败用量与公开错误独立审查

2026-10-08。本轮由独立审查者只读追踪 Worker/Core/账务路径；没有访问线上、运行 CLI 或发送模型请求。现场事实由主任务/API 调查者提供，不冒称本审查者独立查询过数据库。

## 现场事实与结论

主任务报告 Core .72 / Worker .75 请求 `890a39010a218c9e7fbc1dbc` 返回 502，helper attempt=uncertain、records=0、outbox=0、usage_receipts=1。后续 API 调查确认账务由 pending 转 failed，billing_error 为 `helper response usage is incomplete`；已知分轮用量在 replacement 中保留 Input=24、Output=91、CacheCreation1h=1647。顶层公开 token 为 0、cost=0，不能据此判为 provider 用量丢失或免费成功。

## 代码证据

- Worker `api_output_completion.go` 的 observer 在每个 provider SSE 事件上调用 `observeProviderAccounting`。`helper_history_accounting.go` 保留 message_start/message_delta 的原始 usage JSON 和调用边界；失败时优先使用完整公开聚合，否则保留 provider calls 并标记整体 Complete=false，不估算未收到的用量。
- Worker `helper_history_transport.go` 对 capture failure 或 HTTP>=400 附加 accounting；公开响应 body 与 accounting 分开承载。Core `helper_history_response.go:applyHelperAccounting` 将 provider calls 写入 `rec.Replacement`，而不是顶层 `rec.Tokens`，故顶层零值与分轮非零值可以同时成立。
- `usage/settler.go` 将 Replacement 和 BillingError 保存进 `billing_detail.inputs`。`usage/additional.go:priceComponents` 遇 BillingError 拒绝结算；`markFailed` 合并回原 inputs，因此失败状态不会清空分轮计数。
- `helperhistory/outbox.go:PersistUncertainUsage` 冻结 usage 并标记 uncertain。成功持久化 receipt 后 `AckUsage` 删除 outbox，所以 receipt=1/outbox=0 不构成遗失证据。records=0 表示未承诺可恢复的隐藏历史，与部分计费证据持久化是不同事实。
- Core `dispatch.go` 在 helper 已派发时禁止自身 failover。公开错误目前不附加 outcome-unknown 事实：Worker 通常沿 `main.go:runFailed` 返回 502 和原错误；若 envelope Failure 非空，Core 转为统一验证失败 503。这不足以向客户端说明是否已有消耗，但本轮不修改 SDK 重试语义，也不据此推断现场走了哪一条错误分支。

## 已有测试与边界

只读确认已有 `helper_history_partial_accounting_test.go` 覆盖完整首轮和未完成次轮的原始 usage 保留；Core `helper_history_test.go` 的 partial 场景断言 Replacement=[20/8,17/0]；`helper_history_partial_cli_test.go` 覆盖 EOF、两轮计数和不重试。本轮未重新执行这些后端或真实 CLI 测试，未做 DB 动态验证。

仍缺面向用户的 unknown/incomplete 错误表达及客户端重试风险断言；后续单独评估。丢失完整 Worker envelope 的传输故障只能落 unknown，不能从已冻结零值凭空重建 provider 用量。

## 限定 UI 修复

现有 UsageDetail 未展示 `inputs.replacement`。新增失败且顶层五种 token 均无非零计数时的已知分轮详情，复用抽取的 token 明细组件，包含一小时缓存计数。每轮只显示实际提供的非负数值，缺字段为“—”，不跨轮求和，不估计。提示整体未确认、不能作为请求总计；不更改计费数据、列表总计或 SDK 重试协议。

UI 验证：`npm test -- src/views/usage/UsageDetail.spec.ts src/views/usage/UsageTable.spec.ts`，2 文件 8 测试 PASS；`npm run typecheck` PASS；定向 `git diff --check` PASS。新增组件测试覆盖实际大写 Tokens 字段映射、分轮/1h 缓存、缺失值不造零、不求和、详情异步加载、普通成功/顶层非零不启用分轮替代展示、非法结构不造数据；同时断言输入账务对象未被修改。测试全部使用模拟接口，无线上/真实 API 请求。

定向 ESLint 退出 0：0 errors、120 条模板格式 warnings（包括原有 UsageDetail 多处单行模板及新增模板同类警告）；没有执行全文件自动格式修复。

复核修订：主 fixture 调整为现场一致的 CacheCreation=0、CacheCreation1h=1647，不把一小时桶重复放入普通缓存写桶；新增模板区域已整理，未格式化旧区域。非法数据用例覆盖未知字段、NaN、负值、数组和缺失值。再次定向测试 2 文件 8 测试 PASS（2.87s）；计数由新增 UsageDetail.spec.ts 的 4 个 `it` 加原有 UsageTable.spec.ts 的 4 个 `it` 构成，循环反例不是额外的独立测试。新文件 UsageTokenFacts.vue/UsageDetail.spec.ts 定向 ESLint PASS（0 errors、0 warnings），diff check PASS。
