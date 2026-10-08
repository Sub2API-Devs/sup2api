# 公开 API inline + 内部搜索验收计划

脚本：`../evidence/public_inline_search.py`。本次只准备和合成测试，未发送真实模型请求。由 root 在 .68 上线后执行。

```powershell
py -3 next/docs/ccgateway-feature-support/evidence/public_inline_search.py --base https://YOUR_API --output artifacts/public-inline-search.json
```

凭据只读取进程环境 SUP2API_API_KEY；默认 claude-opus-5-5 可用 --model 指定。无内部权限头、账号指定或配置修改，无错误重试，最多两次公开 JSON 请求。第一轮 base lookup_fixture defer_loading:true，inline 添加再撤销另一个临时 custom；收到唯一合法 lookup_fixture(key=fixture) 外部调用才发第二轮，完整保留 assistant blocks/signature，在对应 tool_result 里返回固定 marker。

源码核对：request_policy.go toolSearch 在管理员策略 request 时由任一 defer_loading:true 启用；advanced-tool-use-2025-11-20 映射 tool_search，但不会覆盖管理员 false。脚本发送该 beta 和 inline-tools-2026-09-15，不伪造 X-CCGateway policy。若保存策略关闭搜索，不能从外部成功猜测内部已发现，也不能改配置强行完成。

证据仅保留结构、usage、状态、耗时和 ID 哈希，不保存请求/响应内容、工具参数、signature、密钥或提供商错误原文。正常 HTTP200 refusal 记录 protocol success，内容未完成，停止；不伪装成平台错误。

成功 exit0 仅代表公开工具往返完成。`internal_search_verified` 固定 false，须人工关联现有 Worker 请求日志核对实际 ToolSearch 调用及 lookup_fixture 引用，才能另加审查结论；公开 API 隐藏 helper，因此不能仅凭工具调用推断内部发生搜索。既有日志开关关闭时保持此未验证边界，不自行开启。

本地合成 success/refusal 两路径、最多两调用、ID对应与证据过滤 PASS；无网络。没有全产品测试需求，未改业务源码。
