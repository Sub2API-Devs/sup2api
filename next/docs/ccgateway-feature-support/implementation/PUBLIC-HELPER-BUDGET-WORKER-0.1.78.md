# Worker .78 普通预算公网失败证据

2026-10-09北京时间，Core .73 / Worker .78。root执行单轮公开验收，第三请求失败后立即停止；没有rollback、inline或自动重试。本文件不修改验收脚本的未知/未验证标志。

首请求 `ca94d197da9250a4d33937a4`（SHA4ea8a345...）200/tool_use；结果续聊 `da88efe85e42e8446d0e9405`（SHAb8fd8965...）200/end_turn。两次均账号22/attempt1，helper committed，第二parent精确为第一receipt。每次1条history record、1条usage receipt、0 outbox。

第三普通SSE省略task_budget但携完整历史，RID `b7f8fa4e34e4238987b723f3`（SHAd5917fd4...）公开503。Worker `a3033c97-7e35-44af-a2cb-cc9691dff7bc` 实际完成1次provider200/end_turn、完整message_stop，原13事件包括空thinking的estimated_tokens=50/null。Core重组器旧len(delta)==2检查拒绝第三字段，转成gateway_helper_history_storage。不是调度无账号或上游overload；当时#22active/schedulable且无cooldown。

第三helper attempt `5e61ffb8d0f6ca6b86cf904bb6f6ec3cdc52f5b00c0589b0` uncertain，parent精确为第二 `1fa5403ce5182e3bb46d75bcbdd63226e197e52caf71c81d`；0 history record、1 usage receipt、0 outbox。已知实际用量input2/output66/cacheRead883/cacheCreation1h1585、billed0.0141846；进度估计50未被当计费token，没有重复收费。

首用量48/154/read2524/1h1033、billed0.0120408；次用量2/20/read883/1h1568、billed0.0131286。失败与成功账务都保留，不能把第三0history record解释为无provider派发或无用量。

后续修复/独审/精确Git门禁见 THINKING-ESTIMATE-CUSTODY-REPAIR.md 和 CORE-0.1.74-VALIDATION-PREPARATION.md。本文件只记录.78实际失败，不用后续修复覆盖历史证据。
