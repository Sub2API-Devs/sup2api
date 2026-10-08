# Sonnet pause cold bootstrap：独立复核

2026-10-08。产品候选实现独审，不是此前 bootstrap 探针的通过结论。未部署、未调用真实提供商。

## 复核范围与结论

`continuation_bootstrap.go`、Runner.run 窄入口、relay 全路由封闭 hook，以及 `restoreMixedPendingContinuation`。没有发现阻断当前限定范围的实现问题；未修改作者实现。

资格仍限定精确 `claude-sonnet-4-6`、rebuild、真实第一 user 为纯文本、尾部存在经正常 server ledger 校验的未完成 server call。允许普通无签名多轮及已完成 server pairs；resource/credit/MCP/inline/schema/context/compaction/fallback/internal search/safeguards 等复杂组合不采用 bootstrap，原 guard 保持。

## 关键不变量

- bootstrap hook 位于 relay 专属路径校验之后、所有分类/适配/forward 之前。主请求、辅助、count、files、profile 等均无 provider forward。
- 主请求采纳必须通过 Mod 就绪与随机 marker/活跃 lease；缺 marker、未加载 Mod、无活跃 lease 均失败。合法主请求也不会获得伪造模型响应，而等待本地取消结束。
- bootstrap 使用真实第一 user，不伪造 assistant；原 Request 不改。其 native 前缀不调用要求 completed assistant 的 captureNative，不提交 HistoryCache。
- 本地前缀读取有 4MiB/128row 上限、非普通文件拒绝，校验 session/input UUID、CWD、CLI版本、第一 user、附件 parent 关系；取消后等待进程退出，再读最终 flush 内容并重新校验。
- 安全附件原始 native 行原样保留，通过 CLI 原生 resume 恢复。没有删除或把冷启动末尾 AutoMode 块人工搬到旧 user。
- 临时目录和本次随机 session transcript 有退出清理。资源/credit 禁持久化请求没有被此路径擅自改成可持久化。
- 混合 assistant tail 恢复只允许缺失 ledger 中仍 pending 的 server_tool_use，已有文字/已完成结果和完整前缀必须匹配。缺失完成块、改写文字、未知额外块或错 ID 均不能借此补回；失败不产生部分出站。

## 独立测试

新增 `continuation_bootstrap_review_test.go`：已鉴权主请求确认仍零forward；GET/POST/DELETE 的 count/files/profile/complete/unknown 路由全部本地；缺 lease/Mod/marker 无法采纳。

- 独立新增、作者 bootstrap 身份/容量/取消及 mixed-tail 否例：PASS 1.563s。
- 独立复跑 `TestRealCLISonnetPauseLongHistory`：真实 CLI 2.1.292，隔离假上游；pure/text/completed tail pairs/completed prefix pairs × JSON/SSE × new/repeat/cold/rollback，共32次实际上游 fixture 请求，PASS 46.801s。bootstrap 自身不增加上游请求。
- 矩阵逐次检查完整客户端前缀、最终真实 assistant tail、AutoMode 唯一位置/内容摘要一致、transport marker 不外发。
- `go vet ./engine` 通过。

这不是泛化任意模型或签名冷导入的支持结论，也不是真实 Sonnet 提供商验收。可进入根代理整合及发布门禁；线上仍需在发布后按原 pause/冷导入用例受控复验。
