# .71 五 Read 与地域事实持久化核对

只读关联根代理 `evidence/local-parallel-read-0.1.71.json`，不重复模型调用，不输出 fixture 正文或凭据。

- 首请求 core `4717dcf32f764256dc087298`，09:14:48.979114 UTC，account22，200/success/attempts1；2 input、483 output、4042 cache creation、0 cache read，cost 0.02987800。
- 续请求 core `cb0f9ad229d0efbf070069fd`，09:15:02.302226 UTC，account22，200/success/attempts1；2 input、359 output、2250 cache creation、2674 cache read，cost 0.01897280。

两条数据库 metrics 均持久保留 `inference_geo: not_available`、service_tier:standard，状态 billed。每 request_id 恰好1条 usage_logs、1条 balance_ledger usage 扣款，delta 分别 -0.02987800/-0.01897280，无重复计费记录。

Worker 记录 `7ebc7cec-ce8c-4f6c-8b0b-d2c17cbb3282` 与 `8b3205c8-d7cb-4a3e-bb38-46872364ec66`：仅检查专用 fixture 前缀存在布尔、tool ID SHA 和用量结构。首响应5个工具调用ID hash、续请求5个result ID hash与根代理证据逐项完全一致；两次token相加为4 input/842 output/6292 cache creation/2674 cache read，等于 CLI汇总。这是账户、顺序、工具身份和完整用量复合关联，不声称 Worker 提供了不存在的 core RID 直连头。

核心 docker stdout 中未找到这些 RID 对应行，因此不能单凭该输出声称所有日志文件绝无旧枚举 WARN；明确正证据是两条实际 metrics 已入库保留 not_available。首次使用 usage_log id 对 ledger.ref_id 关联没有匹配；按源码真实 request_id 键重查后得到上述各一笔，不将错误关联结果解释为没有扣款。
