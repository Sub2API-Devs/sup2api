# thinking_delta 显示估计字段与托管历史修复

日期：2026-10-09（北京时间）。候选未部署，无额外生产模型请求。

## 真实故障与合同

Worker .78 公网普通预算前两次 JSON 成功；第三次 ordinary SSE 的 provider 已正常 200/end_turn，Core 返回503。RID `b7f8fa4e34e4238987b723f3`，Worker `a3033c97-7e35-44af-a2cb-cc9691dff7bc`。两帧 thinking_delta 分别带 estimated_tokens=50/null，thinking为空，签名为真实不透明值。Core helperDeliveredPrefix 调用共享 credits.MessageFromEvents，旧固定字段数量检查拒绝合法第三字段。不是 provider overload，也不是已证实的数据库故障。

2026-10-09核对[官方 SDK BetaThinkingDelta 源码](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_thinking_delta.py)：estimated_tokens 为可选 nullable integer，每帧粗略增量用于显示，`usage.output_tokens` 才是实际计量来源。不猜量子大小或将进度值换算费用。

## 窄修

- 仅 thinking_delta 允许额外 estimated_tokens；省略/null/非负整数通过，任意精度整数不经float截断。负数、小数、字符串、布尔、对象/数组和其他未知字段保持拒绝。其他delta类型没有扩大字段范围。
- 重组只拼接thinking文本，signature_delta继续替换已有签名；估计值不进入assistant内容、历史prefix或usage。原SSE输入bytes不修改。
- Core finalization在public_prefix、commit、persist_uncertain_usage分别记录request_id/account/固定stage/error_kind。任意parser/DB错误文本、body/profile/token不写日志；未更改公共错误/拒绝语义。
- 第三次真实请求已知用量2 input/66 output/read883/1h1585已记账且仅1条receipt。此修复不补发模型、不修改已有账务。

## 作者验证

- 新共享正常多delta测试先RED1.300s，修复后GREEN1.175s；省略/null/0/正整数/>2^53、signature替换、输入字节不变和非法字段负例覆盖。
- Core真实HTTP私有envelope夹具测试原SSE对外字节完全相同、完整历史prefix与无估计字段JSON相同、唯一committed receipt、真实2/66/read883/1h1585不被4096显示值污染；该层使用内存store，不冒充真实PG。
- 安全日志测试：prefix未知字段失败与Commit冲突各正确分阶段，失败仍保存已知用量；带秘密文本的error/cause与未知stage不泄漏。
- Core相关HTTP/日志测试PASS2.971s，vet通过；全credits测试PASS0.252s，vet通过。独立review代理和Worker原始ledger审查另外记录，不混称作者测试。

## 发布依赖

Core helperDeliveredPrefix与Worker internal_cache_rounds的原始完成事件账本均实际调用共享MessageFromEvents，因此两者需要重新构建。插件模块 `go list -deps ./...` 不含 contracts/credits，本修复没有插件源码/依赖变化，无需仅为该解析器改动更换Plugin .13。尚未执行构建发布；最终签名制品仍须核immutable包hash。

补充最终门禁：新增合法 provider refusal SSE 保持 HTTP200/原bytes/唯一receipt/66 output 回归；Core同组最新 PASS3.230s、vet通过。没有改变拒绝响应语义。

## 真实 ABC SSE 与最终依赖复核

新增 `TestHelperHistoryABCThinkingEstimateRealDBCLI/true` 于2026-10-09北京时间通过133.786s。实际 Core HTTP→源码编译 Worker→真实 CLI2.1.292→隔离假 OAuth/profile/provider→真实 PostgreSQL，不是只mock私有envelope。5公开请求/6假provider调用，首工具交接、结果续聊、第三无task_budget普通SSE、冷Worker/cache、回退全部覆盖；后四响应带空thinking的estimated_tokens 50→null与signature/text，最后回退返回refusal且公开必须保持HTTP200/refusal。隐藏原文/hash、真实session_context/TAB、严格工具引用目录、124input/131output/1h1647及唯一5receipts/幂等结算原断言不变。

此ABC验证显示字段实际经过CLI且不进入最终公开history；原provider与CLI整条SSE不声称逐字相等。Core不修改公开SSEbytes的逐字断言由前述独立HTTP测试提供。session42555已终态，45439隧道finally关闭、无监听。没有生产模型调用。

Root另修strict codec同类字段后重新执行插件 `go list -deps ./...`：409包，credits依赖0，protocol-codec/strict依赖0，任何protocol-codec依赖0；排除companions的插件源码也无对应导入。因此Plugin .13无需仅因这些解析器修复改版，最终制品仍需照常校验不可变hash。Core/Worker须重新构建，尚未部署。

## 独审补强后的证据分层

独审指出133.786s版本仅验证重组content无estimate，尚不能证明CLI实际保留raw进度帧。新增在公开r.body重组前解析SSE，thinking块对应50/null两种原始estimated_tokens都必须存在；相同真实ABC SSE重新执行PASS132.761s（session69985），具名abcResponseOptions替代位置bool数组，emitABCBlockDelta拆为小函数。原普通续聊/cold/rollback/refusal200与强账务断言保持。此测试与前一缺断言证据分开记录。

该次终态后再次收紧：根据明确的公开请求序号要求首toolhandoff thinking块为0、后四响应恰为1，不允许整个thinking块消失后因为输出自判而假绿。新增移除全部thinking/额外thinking否例及Emitter目标PASS3.042s、vet通过。**132.761s运行在这个最终expected-count断言加入前，不能当最终count的真实ABC证据**；需精确冻结Git候选门禁补跑最新ABC。此次只增加验证强度，未更改产品实现或假provider返回语义。
