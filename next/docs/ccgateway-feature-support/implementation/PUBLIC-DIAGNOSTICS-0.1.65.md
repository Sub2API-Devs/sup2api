# 0.1.65 公网 diagnostics 两次真实调用

2026-10-08，既有用户 API key 仅放进程内存，由 root 执行 `evidence/public_diagnostics.py`。模型 `claude-opus-5-5`，JSON、低 effort、小提示词，无自动重试、无账号强制、无缓存命中预期；仅两次模型请求。结果在 `evidence/public-diagnostics-0.1.65.json`。

首次 `diagnostics:{}`：HTTP 200 / end_turn，11.767 秒，RID `86e9438a886ebc5c44cd423f`，真实响应包含 `diagnostics:null`，返回消息 ID 在内存传给第二请求。

第二次携完整 assistant 内容和新增 user 消息、`diagnostics.previous_message_id`：HTTP 200 / refusal，13.231 秒，RID `246d3a01fdf6e7cdc405e050`。content 空、output_tokens=0，提供商明确返回：

```json
{"cache_miss_reason":{"cache_missed_input_tokens":538,"type":"messages_changed"}}
```

两次 `cache_read_input_tokens` 都为 0。此结果证明真实 previous ID 诊断链得到提供商事实；不证明缓存命中，也不证明第二次内容任务完成。refusal 保持正常 HTTP 200，脚本 passed 只判断消息 ID/协议通路，没有把它改为错误。

独立只读数据库核验：两条 usage 均为账号 22、200、success=true、error_type 为空。按证据中的 message ID SHA256 查询持久 `provider_diagnostic_messages`，正好两条记录，同 user+group、同账号 22、同 principal+generation，均未过期。只输出一致性布尔，不输出 owner/issuer 原值或凭据；没有新增模型调用。

边界：本次没有强制跨 Worker/冷启动、权限否定例或长期过期测试；相关保证仍来自独立隔离测试，不能以这两次公网调用扩大声称。

## 脚本独立复核补充

原记录的两次真实调用与refusal事实保持不变。脚本后续增加Message外壳、diagnostics字段存在性/对象或null校验和失败退出码；显式protocol_only区分协议通路与内容完成，不把正常200refusal改成平台错误。记录新增protocol_passed，content_completed为null表示本probe没有验收内容任务。第二次真实diagnostics对象与仅ID检查的旧passed意义已在上文披露；未修改旧证据JSON，未为此次审查新增模型调用。统一证据脱敏覆盖打印和保存，不保留原始响应正文或凭据。
