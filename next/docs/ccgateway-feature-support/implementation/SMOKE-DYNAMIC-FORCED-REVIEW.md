# Dynamic / forced 公网 smoke 脚本独审

2026-10-09。只读审 public_dynamic_mcp.py、public_forced_mixed.py 及其导入的 Probe/观测 helpers；仅新增 test_public_dynamic_forced_review.py。没有发公网请求、模型调用或目录查询。

结论：当前正常协议路径未发现阻断问题，可纳入候选；脚本运行仍需由 root 单独授权执行。

- 两脚本控制流最多三次 Probe.call；Probe 每次仅一次 opener.open，无 retry，NoRedirect 禁止跟随跳转。首失败/不符停止，第二失败不发第三次。
- dynamic 复用 initial_body 后删除 toolset.tools，没有调用 fetch_catalog。唯一匿名服务器只有 type/name/url，无 authorization_token；仅启用指定公开只读工具。listing 必须来自实际响应，严格检查 server、条目字段、名称唯一与 schema 类型；后续目录摘要必须一致。引用精确匹配 server/name 组成键，搜索与 MCP 配对、先后、唯一 ID 和公开参数均验证。
- continuation/rollback 都从第一次完整 assistant content 建分支，包含原 listing/search/工具结果等所有块。回退不把第二响应塞入历史。不声称生产 cold 或跨账号迁移。
- forced 首轮保留 named choice/disable_parallel 与完整 eager+deferred 目录；结果续聊和回退明确改 auto，不能把这两轮当 forced 证明。工具定义三轮不变，不声称公开输出证明实际 provider wire 或零隐藏轮，仍要求独立 Worker 日志。
- 正常 HTTP200 refusal 是 protocol_passed/normal_provider_refusal，同时 fixture passed=false 并停止，不冒充成功或 API 故障。
- 持久输出排除 error_summary 和正文，request ID 转 hash，工具结果/listing/catalog 只留 hash 和计数、布尔事实；保留 usage 与状态。Probe 先清除实际 key/Bearer 形式，main 捕获其 stdout，仅打印经过 evidence_rows 筛选的最终报告。原 content 仅为完整续聊保存在内存。未将 auth 字段写到远端 MCP 声明。

## 独立离线验证

`py -3 -m unittest test_public_dynamic_forced test_public_dynamic_forced_review -v`：7 tests，0.040s，全部通过。python.exe 为 WindowsApps 占位入口未执行成功；改用已安装 py 后实际运行通过，没有将第一次无输出当测试成功。

新增四项测试除 FakeProbe 外还调用真实 Probe，mock 其 opener 并为所有其他网络安装抛错保护：

1. 第二轮目录 schema 变化、复用旧 ID、外来 server、pause 均立即停止，完整首次历史保留且无 pinned/auth 伪装。
2. forced 第二轮 refusal 停止、原目录与首 assistant 保留，输出无正文哨兵。
3. 真实 Probe HTTP429 每脚本仅一次 opener，保留失败状态；输出不含 API key、原错误正文或原 request ID。
4. 真实 Probe HTTP200 refusal 保留 protocol success 与正常拒绝分类，同时 fixture 失败，且只调用一次、不输出拒绝正文。

证据边界：离线验证控制流与证据脱敏，不证明真实提供商支持 dynamic MCP/forced 模型选择，不证明上线状态，不替代 Worker 原始出站及账务核验。
