# 公网 Web 工具验收：Worker 0.1.68

日期：2026-10-08。本次为既有两次真实提供商调用的独立只读核对；没有重新调用模型、调整价格、修改配置或部署。核心为 0.1.67，Worker 为 0.1.68。

根代理执行 `evidence/public_web_smoke.py` 的原始脱敏证据位于 `implementation/evidence/public-web-0.1.68.json`。独立审查读取对应核心 usage_logs 和 Worker 已有请求诊断，只输出计数、配对布尔值、用量及摘要，不输出消息、网页正文、凭据或引用原文。

## Web search

- 公网 request ID：`7cb0e00d4b2517d8ef3113e4`；核心记录时间 `2026-10-08T06:44:11.027432Z`，账号 22，HTTP 200、success=true、attempts=1。
- Worker request ID：`65765c86-2dbc-4b05-a034-06435217b942`；诊断完成时间 `06:44:18.719861068Z`，HTTP 200、log_status=complete，1 个上游 response。
- 1 个 web_search server_tool_use、1 个成功 web_search_tool_result；调用 ID 非空且唯一配对。结果数组含 10 条 web_search_result。
- 4 个非空文本块、2 条 web_search_result_location 引用，两个引用 URL 都存在于实际搜索结果中；终态 end_turn，无客户端 tool_use，无顶层 error block。
- 工具结果 SHA-256：`4eaa2acc433e54eaeb6481b4c496473c607556a5904ae9eb9651cf937be0195f`，与公网证据一致。这建立了公网结果与所查 Worker 诊断的对应，不仅依赖时间邻近。

## Web fetch

- 公网 request ID：`4bc917c85320d0277b5fbfee`；核心记录时间 `2026-10-08T06:44:19.661113Z`，账号 22，HTTP 200、success=true、attempts=1。
- Worker request ID：`e30c32ab-1614-4c87-ac6a-cb1ca027826d`；诊断完成时间 `06:44:26.285225308Z`，HTTP 200、log_status=complete，1 个上游 response。
- 1 个 web_fetch server_tool_use、1 个成功 web_fetch_tool_result；调用 ID 非空且唯一配对。结果为 web_fetch_result，内含 source.type=text 的 document。
- 2 个非空文本块、1 条 char_location 引用；document_index=0、标题相同、字符范围有效，引用文本与对应文档切片精确一致（仅输出验证布尔值，没有输出正文）。终态 end_turn，无客户端 tool_use，无顶层 error block。
- 工具结果 SHA-256：`1af5549c18ce665d14791eb3eeb55f880710787860f845b1e7bc2ad868e15fdb`，与公网证据一致。

## 用量与费用核对

两条记录的模型及上游模型均为 claude-opus-5-5，price_id=121、billing_mode=per_token、billing_status=billed、倍率 1、anomalies={}。数据库 metrics 分别记录 web_search_requests=1/web_fetch_requests=0，以及 web_fetch_requests=1/web_search_requests=0，与 Worker 原始 usage 完全一致。

搜索：input=4、output=257、cache_read=3302；provider cache_creation=19846 被核心按 exclusive 口径拆为普通创建 16544 加 1h 创建 3302，未重复相加。实际费用 `0.11495240`，账本 ID 1187。

抓取：input=4、output=149、cache_read=2369；provider cache_creation=8706 拆为普通创建 6337 加 1h 创建 2369。实际费用 `0.05410680`，账本 ID 1190。

两次当前价格公式均仅含 token 项：p×4、c×20、cr×0.2、cc×5、cc1h×8，再按每百万单位计算。代入各自计数与实际账单相等；未发现重试、重复摘要计费或 TTL 双算。

**定价边界：**当前公式未单独使用 web_search_requests/web_fetch_requests 加收工具费，虽然两个计量字段已完整入账。这是当前管理员定价事实，不能声称账单等于提供商全部收费；本次没有擅自修改价格。

## 验收范围

确认 direct web_search_20250305 与 web_fetch_20250910 两个既有公网调用，结果与引用到达客户端且费用按当前公式一致。没有验证动态过滤版本、更多循环或其他模型资格；加严后的脚本没有重新运行模型，本记录以保存的真实 Worker 响应独立检查其新增条件。搜索引用验证到结果 URL 和字段结构，不宣称解密验证 encrypted_index。
