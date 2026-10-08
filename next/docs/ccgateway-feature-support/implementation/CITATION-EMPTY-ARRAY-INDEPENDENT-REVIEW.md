# 引用历史空数组修复：独立复核

2026-10-08。未重试真实请求、未部署；以下区分线上失败与本地修复证据。

## 实际失败关联

- 公网失败 request ID：`5a121a86e83596c7d702e035`。其 SHA-256 等于既有 `public-media-citations-0.1.68.json` 的 `db66993e828757693222faffc6fbad68b705e08e14c197b282618865b1f690c7`。
- 核心时间 `2026-10-08T06:50:51.720817Z`，账号 22、HTTP 502、attempts=1、upstream_error；核心通用错误为 upstream server error (502)。准确时间是 06:50，并非最初估计的 06:40。
- Worker request ID：`9e5bd9cd-476d-4094-85d3-a558af2083bf`，完成时间 `06:50:54.427511339Z`，prefix-hit、HTTP 502、诊断 complete。
- Worker 实际错误：`cannot prepare the upstream request: citation data conflicts at assistant turn 0 block 0`。
- Worker 中有 1 个 upstream-refused 请求文件、0 个 upstream response 记录；错误发生在最终上游请求准备阶段，未观察到该请求发给提供商的证据。不能将核心 attempts=1 误读成实际提供商推理过一次。
- Worker 请求的文档 hash `43c11b05148a2ee9e50f78baa9384763c1965920fc5fafed25ffdc880473f375`、assistant 引用列表 hash `2104c0b2e194d9e5a9c42da0ae8cb0d3af3bebd0a18b5d789db1311d13ca14f5`（1 条）均与公网证据一致。
- Worker request headers 没有 core request ID；上述关联由账号、紧邻时序、错误特征以及文档/引用精确 hash 共同建立，不宣称存在未记录的直接 trace ID。没有输出正文或凭据。

## 修复独审

唯一业务变化位于 `citation_restore.go`：在既有完整 assistant 顺序/块内容、前置 user 和文档语料对齐后，将 `[]any{}` 或 `[]Object{}` 视为 CLI 未保留引用内容的情况，使用原客户端完整历史中的 citations 恢复。

非空冲突仍拒绝；map/string 等非法值不是空数组；文档变化、用户变化、文本变化、额外同文 assistant 均仍由原有对齐拒绝。没有按文字搜索随意绑定引用，也没有放开任意引用结构。

已有 absent/null 的恢复行为保持；新增 empty array 对应 CLI 保留 content_block_start 初始空数组、没有保留后续 citations_delta 的实测形态。作者使用两种原生 Go 数组形态，实际 JSON 经解析为 []any；未使用宽松 reflect/字符串转换。

## 独立执行结果

- `TestCitationEmpty*` 的正反例独立复跑通过，0.300s。
- 使用本地 CLI 2.1.292，`TestRealCLIEmptyCitationArrayHistory` 独立复跑：JSON/SSE × new/continue/cold/branch，共 8 次隔离假上游请求，包 PASS 6.180s。不是线上模型复验。
- 阅读作者完整 diff 后未发现阻断问题，未修改其实现。

结论：候选修复可进入根代理集成与发布门禁；线上故障尚需发布后原始媒体/引用续聊验收才能标为真实恢复。
