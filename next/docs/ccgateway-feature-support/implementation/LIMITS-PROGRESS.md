# F-LIMITS 实施记录

## 正整数 max_tokens

原来只有 `CLAUDE_CODE_MAX_OUTPUT_TOKENS` 环境映射。隔离 CLI 2.1.292 实测：传 1 时实际出站 1；传 1000000 时实际出站 128000。因此不能把环境映射等同于 API 保真。

`feature_plan.go` 现在保存客户端 `max_tokens`，仍由原入口验证正整数，在已归属主请求的 outbound relay 应用原值。不会改辅助模型请求或 count_tokens。超出模型限额由实际上游明确拒绝，不能静默裁剪成另一个成功请求。每个 HTTP Messages 请求现在都需要主请求归属，因此自动启用 nonce lease 与关闭 CLI prompt snapshot。

测试：`TestRealCLIHTTPMaxTokensIsExact` 经 Worker HTTP → 真实 CLI → 隔离假上游核对 1 与 1000000；不代表实际账户允许百万输出。常规 HTTP refusal 假 CLI 已补真实 loopback relay 请求和 begin/end，避免以前不发任何主请求的夹具误导。纯 argv/env 测试显式移除 Plan，只验证其原本的进程环境职责。

## max_tokens: 0 预热：已实现并隔离验证，未部署

`TestRealCLITokenLimitSurface` 隔离探针发现：环境变量 0 被 CLI 当成默认 128000；实验 EXTRA_BODY 能让 wire 变为 0，但 CLI 面对 content=[]、stop_reason=max_tokens、output_tokens=0 会连续请求四次，并最终 exit 1，没有 native assistant。EXTRA_BODY 只用于研究，生产不采用。

[官方 prompt caching 预热说明](https://platform.claude.com/docs/en/build-with-claude/prompt-caching#pre-warming-the-cache) 要求非流式；0 与 stream:true、manual thinking enabled、output_config.format、forced tool_choice any/tool 不兼容。保持 thinking/effort 一致及明确 cache breakpoint 才有预热价值。

实现：入口校验组合；已归属主请求改为 stream:false；转接真实 JSON 完成响应，保留 ID/usage/错误；首次完整零输出即终止 CLI，避免重复预热；不写空 assistant checkpoint；prefix-hit 使用隔离 native transcript，不能污染已有可复用历史。桥接只拆实际 JSON 成 CLI SSE，返回给 API 调用方的仍是原响应对象。无非预期空内容、输出 token 非零、非 max_tokens 终止等响应不得视为预热成功。

独立审查修复：归属结果由 `adaptAttributed` 明确返回，不能用 raw JSON 查 nonce（转义后可能查不到）；预热主请求让 transport 自动协商并解压，桥接后清理 Content-Encoding 与 Transfer-Encoding。

新增隔离测试：CLI 2.1.292 经 Worker HTTP → 假上游 gzip JSON → CLI SSE → HTTP JSON，核对 ID 与 usage 保真、只一次模型调用、无空 checkpoint；先正常创建历史再预热，原 native 文件逐字节不变，下一普通请求仍 prefix-hit。`TestRealCLIHTTPMaxTokensIsExact` 三组 0/1/1000000 及上述续聊共 PASS 4.16s；五项 warm-up admission/归属/转义/错误/历史单测通过。最新常规 engine PASS 4.683s。正数阶段完整 `TestRealCLI` 与限额 HTTP 测试合跑 PASS 48.223s；预热实现后不重复声称整套完整真实 CLI 已再跑。没有实际上游账号缓存计费或预热收益验证。

## 后续范围

thinking 缺省与 disabled、updates/between_tools、绑定控制，以及 API constrained decoding 与 CLI StructuredOutput 的差异仍需各自出站证据与实现，不随本阶段宣称完成。没有部署或提交；主 agent 负责整合发布。
