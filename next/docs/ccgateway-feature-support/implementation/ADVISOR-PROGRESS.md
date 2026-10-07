# Advisor 服务端协议与平台计费

2026-10-08。当前为本地实现和真实 CLI 2.1.292 对隔离假上游证据；尚未上线、没有真实提供商模型配对或收费验证。

- `advisor_20260301` 定义、beta、模型、max_tokens/max_uses、defer_loading、独立顾问 caching 原样进入已归属主请求；不注册成客户端 MCP，不在 Worker 执行顾问调用。
- 明文结果、加密结果和正常工具错误各4条真实 CLI 流程（新建、prefix-hit、移除已完成工具定义、空缓存导入）通过。加密字符串保持原值，HTTP200工具错误不是网关502。
- CLI 在自己的 Advisor 未启用时省略 API Advisor 历史，恢复仅限登记的块与已验证的完整非 system 消息序列。独立审查进一步复现纯 Advisor 历史的 `[Advisor response]`、与 fallback 混合时的 `(no content)` 精确占位；只有完整配对的已注册块可恢复，普通正文差异拒绝。
- 已补纯 Advisor、inline system、fallback 边界组合的回退/冷导入回归；详见 FAST-DIAGNOSTICS-PROGRESS。服务端调用 pending、客户端工具 handoff 和 pause_turn 使用同一个服务端调用账本。
- 显式缓存组合四次实际 CLI 流程通过；顾问自身 `caching` 与 executor cache_control 是两层，不混为本地 JSONL TTL。

## 账务审查后的纠正

官方说明：顶层 usage 只含 executor，顾问 tokens 位于 `advisor_message` iterations，需独立按顾问模型收费。最初仅保证 usage JSON 不丢，不足以保证平台实际计费；因此同时修改了核心。

- SDK manifest 声明关联模型引用及附加 usage 规则；核心先核验分组权限、模型价格、账号模型列表，再映射已授权的 tools.model。插件修改请求体后重验引用，不能新增/替换顾问模型绕过前置检查。
- JSON/SSE 提取最后的 iterations 快照，按实际模型匹配已冻结的客户端价格；不将顾问 token 加入 executor 再重复计价。未知模型/非法 token 保持真实 API 响应，并记录结算阻断，不能猜价扣费。
- 附加模型价格、参数、倍率进入持久结算输入；预扣和结算采用现有单一 ledger 事务。主模型免费时仍可收取顾问费用。具体独立审查见 GATEWAY-MULTIMODEL-INDEPENDENT-REVIEW 与 ADDITIONAL-USAGE-PROGRESS。
- Compaction 也有不包含在顶层 usage 的附加迭代，使用同一抽象按受信任主模型计价；账号 override 不可在显式压缩请求中遗漏相应规则。数据库结算重试仍待服务器隔离 PostgreSQL 验证。
- 实际 speed/service_tier/inference_geo、Web搜索和抓取次数已可作为价格表达式的 usage facts；这些是观察字段，不会自动改变管理员配置的模型价格。

## 仍明确限制

- API模型及认证资格只能通过真实账号验证，不能从 fake fixture 或 CLI 字段存在推断。
- Inline tool changes 与 server tool 定义组合当前拒绝，避免未完成的时间线和关联模型授权绕行。
- fallback 请求、credit兑换、代码容器/PTC 与文件资源仍有独立边界；已恢复历史 fallback 块不代表这些请求功能已开放。

官方依据：[Advisor 协议和计费](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool)、[SDK usage schema](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_usage.py)。
