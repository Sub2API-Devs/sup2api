# Helper 尾部预算 system 独立审查

2026-10-08。审查当前候选实现，未修改 CC 作者的生产文件。首轮源码审查和独立单测未发现阻断问题；此结论不等于真实 Core/CLI/PostgreSQL 链路或 Linux race 验证通过。

## 审查文件与结论

- `next/plugins/ccgateway/companions/engine/helper_history_tail_system.go`：ACK 仅接受 text 字段，绑定当前已观察的隐藏轮数；同轮不同文本拒绝。验证用 flat 移除尾部 system 仅用于整轮证据校验，实际消息对象用于有序分段持久化，没有将 flat 当作最终发送/持久历史。
- `engine/mod_control.go`：沿用 loopback、随机控制路径及 Bearer token 鉴权；外层 JSON 拒绝未知字段及额外 JSON，helper ACK 要求 ready 与 active main lease。
- `engine/helper_history_runtime.go`：同一 public anchor 的各段先按顺序组成完整组，只对组前置 systems 做重放匹配；相同文本的尾部 system 不被当作前置重复删除。v1 仍拒绝隐藏轮后的 system，v2 才接受经归因的尾部提醒。
- `engine/runner_config.go`、`mod/hooks/register.js`：helper 请求启用 ACK；Mod 仅对 policy 保留的 engine `total_tokens_reminder` 的实际返回文本发送 ACK，失败拒绝继续。
- 相关源码 `request_attribution.go`、`internal_cache_rounds.go`、`helper_history.go`、`helper_history_system.go`：用于核对 lease、原始 provider 完整轮次、隐藏消息确认和 system 对象比较边界。

以上 `engine/`、`mod/` 相对路径均位于 `next/plugins/ccgateway/companions/`。

## 锁与取消边界

ACK 在 c.mu 内依次检查 scope/cache，各自释放锁后才获取 helper execution 的 x.mu。applyHelperHistory 持有 x.mu 后可能检查 cache，但 ACK 不同时持有 cache 与 x，因此本次只读检查未发现二者的锁顺序反转。HTTP main_request_end 也通过 c.mu 串行进入。

记录 ACK 不等于成功返回；取消后的 run 仍走原有错误退出。control 销毁后路由移除，未处于 active lease 时 ACK 拒绝。本轮未执行真实取消竞态、并发压力或 race detector，不能据静态锁序推导这些测试已经通过。

## 独立测试

新增文件：`next/plugins/ccgateway/companions/engine/helper_history_tail_system_independent_review_test.go`。

- `TestIndependentHelperReminderACKAuthority`：wrong token、非 loopback、未 ready、未开始 lease、未知外层/detail 字段、同轮文本替换、已结束 lease 拒绝；被拒 ACK 不污染 reminders；有效 ACK 绑定已观察轮次。
- `TestIndependentHelperTailValidationViewRetainsPositionsAndObjects`：相同文本的 leading/tail 保留不同位置；flat 构造不修改原始消息对象及 cache_control；已观察 tail 消失拒绝；v1 拒绝；未知 block 字段拒绝。

首次测试因独立 fixture 未调用 recordApplied 就结束 lease 被正确拒绝；补齐 fixture 的有效 lease 生命周期后通过，未因此修改生产逻辑。

执行目录：`D:/projects/golang/sup2api/next/plugins/ccgateway/companions`。

```powershell
$env:CCG_REAL_CLI=''
$env:SUB2API_TESTPG='off'
go test ./engine -run 'Test(IndependentHelper(Reminder|Tail)|HelperHistoryCapturesAttributedTrailingReminder|HelperHistoryReplayTrailingSystemPreservesPosition)' -count=1 -v
```

结果 PASS，包耗时 1.257s。包含独立两个测试与作者当时已经加强的 valid/no-ack/wrong-round/changed/v1/unconfirmed/incomplete/unknown-field 矩阵及同文本重放测试。ACK HTTP 使用 httptest 直接调用内存控制 handler，没有真实外部网络请求，没有启动 CLI，没有 PostgreSQL 操作。

## 未执行与外部证据

本审查者未运行真实 Core/CLI/PostgreSQL 集成、真实模型或服务器操作，也未运行 Linux race/build。主任务报告其另行定向复核通过（0.333s），本文件仅记录为主任务提供的信息。写本文时，真实 Core/CLI/PG 验证仍由 API 执行会话 6486 负责，后续 Linux race 构建须以各自最终输出为证据；本报告不预判其结果。

## 独立 ABC 捕获新账务阻断

JSON真实PG子组终态 RED 129.149s（fixture128.03/子117.88）。6次provider调用、累计input124/output131正确，尾system完整对象hash/原位及冷恢复/回退全部先通过；最终1小时cache计数与1647不符，未改弱预期。初始错误输出只打印input/output，后已补cache1h与expected完整诊断（不把新诊断称已在首轮执行）。6486句柄终态、隔离隧道关闭。

源码独立确认tool_search.go仅聚合顶层四个token counter，不累计usage.cache_creation下5m/1h分类。新增TestReviewHelperSearchPreservesCacheCreationDurations红例：首hidden1h1647+末call5m11，总cache1658仍正确，但结果完全无cache_creation对象，精确RED1.332s。已交CC作者窄修，未自行改业务；必须保留cache分类计费语义，不将unknown字段任意相加。当前候选尚不可称全链路GREEN。

TTL窄修后独立同anchor/ACK/桶累计目标 PASS1.350s，新增缺省不推断、delta覆盖start不双算、最终未知扩展保持否例。但root随后发现另有多message_delta重复累加及跨轮service_tier/geo分类问题，故尚不放行。新ABC1936刚启动即收到暂停：主动仅终止精确该test子进程和临时路径fixture-worker树，30.169s终止FAIL不属于产品结论；外层finally关闭隔离隧道。待聚合语义再次freeze后才重新跑，不用这次中断或TTL单绿替代完整门禁。

## 最终冻结后 JSON ABC 红转绿

作者补完整usage必填、nullable/multiple-delta raw当前轮快照、分类冲突严格处理后，独审正常TTL fixture补明确input/output=0（保留全部桶/否例断言），目标PASS1.201s。没有把非法缺字段fixture改成产品宽松。

再次冻结后单次 `TestHelperHistoryABCTailReminderRealDBCLI/false` 真隔离PG+实际CoreHTTP/Worker/CLI，PASS132.041s（fixture131.02s/子119.59s）。6provider/5公开、5usage/5receipt唯一、累计124input/131output/CacheCreation1h1647全部原预期通过；普通夹轮、冷Worker/nativecache/store恢复、历史回退、尾system完整对象hash与原位均通过。原129.149s真实TTL红与30.169s主动中断记录保留。53762终态，45439隧道已关闭。尚未另跑该Core场景SSE，不把作者SSE12call当本代理CorePG证据；当前无发布。

最终Core SSE子组 `TestHelperHistoryABCTailReminderRealDBCLI/true` PASS128.800s（fixture127.78/子118.02），实际CoreHTTP→Worker→CLI→隔离PG，原124input/131output/1h1647、6provider/5公开/5usage5receipt、cold/rollback/尾systemhash保持。20327终态，45439已关闭。该ABC emitter只有最终单个message_delta；多delta不双累加的证据来自CC最终真实CLI和独立engine测试，不冒称此CorePG夹具覆盖多delta。测试源码保持冻结。
