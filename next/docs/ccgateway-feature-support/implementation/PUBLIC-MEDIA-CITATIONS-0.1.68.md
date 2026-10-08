# 真实媒体与引用验收：Worker .68 / core .67

2026-10-08。root通过进程环境Key执行public_media_citations.py，最多3次、无重试；本代理只读排查Worker日志，未发真实provider请求。原evidence/public-media-citations-0.1.68.json保持不变。

## 真实结果

1. 标准库生成16×16纯红PNG，base64图像请求HTTP200/end_turn，准确回答颜色。PNG SHA256为6827568a4be792349d4f76908a4756b48bebe45b9354f7934c61a9c502a4259d。
2. 无敏感合成text document启用citations，HTTP200/end_turn，事实回答正确并有1条char_location。文档SHA256为43c11b05148a2ee9e50f78baa9384763c1965920fc5fafed25ffdc880473f375，citation数组SHA256为2104c0b2e194d9e5a9c42da0ae8cb0d3af3bebd0a18b5d789db1311d13ca14f5。
3. 原始完整assistant含citations续聊，HTTP502/api_error，3.25s，失败。公开request ID SHA256为db66993e828757693222faffc6fbad68b705e08e14c197b282618865b1f690c7。不是refusal，不写成功，不重试。

## 原始错误定位

账号22日志目录9e5bd9cd-476d-4094-85d3-a558af2083bf，history mode=prefix-hit。response.body报`cannot prepare the upstream request: citation data conflicts at assistant turn 0 block 0`。客户端和CLI原wire对应assistant文本SHA256同为44b6f27f48d2cc8df6373210417763b4bc4e0a2f0b68a0e4ea9141d80d446900；客户端1条char_location，CLI原wire及拒绝快照为citations空数组。此关联基于独特合成文档/内容与最新日志，核心RID精确关联由另一代理补核，未仅凭时间假称RID已核。

原因：CLI保留content_block_start中的citations:[]，却遗漏citations_delta的最终引用。已有恢复允许字段缺失/null，但将空array也当非空冲突。完整assistant、前置user与文档corpus对齐通过后，仅引用数组冲突分支阻断，未发本次提供商主请求。

## 未部署的窄修

业务仅citation_restore.go：在既有完整身份/位置/文档对齐之后，接受真正空array作为CLI遗漏，按客户端原数组恢复。非空冲突、非法map/string、文档/文本/turn改变仍拒；不是全局删除空数组或按相同文字猜引用。

新citation_empty_history_test先红，准确复现原错误后绿；覆盖显式null、空array、非空冲突、非法类型、文档/user/text改变与同text额外turn。旧恢复测试继续覆盖absent、不同文档/位置和非空冲突。

新citation_empty_history_cli_test注入真实provider形态content_block_start.citations=[]随后citations_delta，实际CLI2.1.292接隔离假上游。JSON/SSE各新建、续聊、cold、分支共8请求PASS7.325s，最终wire引用精确回传；全enginePASS5.498s、vet通过，最后explicit-null测试补正目标PASS2.177s。测试第一次命令cwd错误未运行，已改正确模块目录重跑，不计假绿。

已交research_api独立复核；尚未提交部署、未真实复验。不能把隔离通过改写上述第三次真实失败，也不能将本轮PNG/text证据扩大为所有PDF、URL或file_id媒体验收。
