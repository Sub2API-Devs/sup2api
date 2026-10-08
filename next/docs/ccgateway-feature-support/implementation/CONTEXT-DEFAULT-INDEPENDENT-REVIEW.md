# CLI 默认 context_management 独审

2026-10-08，候选 GREEN，未部署。线上 .71 附件恢复已经成功，但 CLI 自带 adaptive thinking 与 clear_thinking；主计划删除缺省 thinking 时漏删 context_management，真实提供商因此400。该错误不是附件再次丢失。

唯一业务改动是 feature_plan.go 的 apiGeneration 缺省字段删除列表加入 context_management。显式 null/对象继续按原值覆盖；没有自动补 thinking、移除客户端 edits 或修改请求地域/辅助请求策略。

独立新增 `context_defaults_review_test.go`：auxiliary 非主请求字节不变；count_tokens 的缺省/null/显式三态均返回客户端原始计数请求，不引入 CLI 默认；真实 CLI 隔离 fake provider 对客户端显式 clear_thinking 无 thinking 返回400时，原错误保留、只有一次提供商调用，不修补非法客户端组合。

独立结果：作者完整24 CLI fake calls（缺省/null/显式 × JSON/SSE × 新/暖/冷/回退）PASS16.890s，vet 通过；独立辅助/count 与作者主计划单测1.416s；显式400真实CLI隔离负例2.044s。未发真实模型调用，未修改线上状态。
