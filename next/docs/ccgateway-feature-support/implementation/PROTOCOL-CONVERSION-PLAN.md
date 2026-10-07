# OpenAI → Messages 共享转换实施方案

状态：2026-10-08 源码设计；本文件不表示转换已经注册或上线。第二批检查点只增加此设计，第三批实施。

## 决策

采用 `next/protocol-codec` 独立 Go module，包含 DTO、无网络转换与按请求创建的 SSE 状态机。现有 `backend/internal/pkg/apicompat` 改为兼容门面（类型别名、函数薄包装），legacy 与 next 调用同一份实现。next 的严格准入策略与 legacy 兼容策略分开，但不复制转换器。

不采用复制 apicompat 到 next：后续修复会分叉。不采用 next 导入 backend internal：Go 边界不允许，且会拖入旧服务依赖。不把文件、会话存储、鉴权、账户路由或计费塞进 codec。

模块位于 next 内，现有 `docker build -f next/Dockerfile next/` 可以直接包含。backend 单目录 Docker 上下文需改为仓库根上下文，或明确命名构建上下文复制该模块；不能仅加本地 replace 而让 CI/Docker 缺源码。

## 迁移文件及依赖

先完整迁移 apicompat 的 16 个生产文件，避免人为裁剪出互相依赖的半套 DTO/助手；不是一次启用全部协议方向：

- DTO：`types.go`。
- Chat/Responses：`chatcompletions_to_responses.go`、`chatcompletions_responses_bridge.go`、`responses_to_chatcompletions.go`、`response_format.go`。
- Anthropic/Responses：`anthropic_to_responses.go`、`anthropic_to_responses_response.go`、`responses_to_anthropic.go`、`responses_to_anthropic_request.go`、`responses_to_anthropic_tool_schema.go`。
- 其它共享转换：`chatcompletions_anthropic_bridge.go`、`responses_client_tools.go`、`responses_namespace.go`、`responses_stream_event_wire.go`、`responses_tool_output_media.go`、`responses_tool_search_discoveries.go`。

包内测试（包含未导出 helper 测试）与实现一起迁移；backend 门面新增公开 API 兼容编译/行为测试，服务层既有测试仍保留。公共类型使用 Go type alias，保持字段、方法及指针类型身份；所有现有公开函数签名维持兼容。不要为每个测试暴露原本私有 helper。

生产外部依赖仅 4 个文件、2 个 internal 包，其余生产 imports 均标准库：

- `anthropic_to_responses.go` 与 `chatcompletions_to_responses.go` 调用 `openai.IsGPT6SolOrLunaModelSpelling`。
- `responses_to_anthropic_request.go` 与 `anthropic_to_responses_response.go` 调用 `claude.IsOpus55`。
- Claude predicate 进一步依赖 `normalizeEffortModelID` 和 `ModelIDReverseOverrides`；OpenAI predicate 进一步依赖 `CanonicalizeOpenAIModelAliasSpelling`。不要迁移整个 claude/openai constants 包，它们混有提示词、账户/厂商策略。
- 测试依赖 `github.com/stretchr/testify/{assert,require}`；新模块 go.mod 只需这个测试依赖及标准库。

将这两个 predicate 的最小规范化逻辑/别名数据抽成 codec 内的 legacy policy helper，原 claude/openai 包函数薄包装调用它，保留旧测试。若旧变量允许修改映射，先检索写入调用并确定快照/参数化办法，不能暗改动态行为。更优长期接口是不可变 `ModelPolicy` 参数，由 host 提供目标模型能力；禁止包级可变 callback。旧公开函数调用 legacy 默认 policy，新严格入口显式指定策略。模式差异集中在 policy，不把 `strict` 判断散落每个字段处理处。

## 为什么不能直接把旧函数注册

实际旧逻辑包含这些兼容策略：

- Chat 转 Responses 强制 stream=true/store=false/include encrypted reasoning，max token 有下限调整，按模型省略 sampling。
- Responses 转 Messages 缺 max 默认 8192；Opus 5.5 自动 adaptive/medium；其它 effort 自动预算。
- `convertResponsesInputToAnthropic` 将 instructions 和散落 system/developer 汇总为 top system，改变位置。
- `normalizeAnthropicToolPairing` 会丢孤立结果/未配对调用；工具 schema 还有规范化修复。
- 响应和流终止 helper 可补结束事件；next 必须区分上游正常结束与断线，不能用 Flush 在异常 EOF 合成成功。

上述 legacy 行为保留给旧入口；next strict 不接受静默改写。必须先按 RawJSON 校验顶层、嵌套对象与每个 content/tool variant，再复用受控低层转换。解码进现有 DTO 之后才检查已太晚，未知字段已被丢弃。

## next 接入契约

新增 `convert/openai_anthropic.go`，仅注册 `openai.chat → anthropic.messages`、`openai.responses → anthropic.messages`。不重复创建调度/插件层转换。

严格 codec API 返回转换计划，至少记录 source/target 协议、已验证字段与降级禁令；每次转换自己的 stream state，不允许 registry singleton 存请求状态。现有 Converter.Request/Response/NewStream 没有关联请求计划，第一批限定无需请求状态的响应转换；需要 include_usage、原模型别名、响应 ID 映射等请求选项时，新增可选 PreparedConverter 接口，由 gateway 一次 Prepare 产出不可变 request plan + JSON/stream adapter，保留旧 Converter 兼容。不能通过 mutable receiver 或 goroutine-local 传递选项。

解析/校验在账户目标协议及模型已确定后、插件 Build 前完成。拒绝返回带字段路径的 400 unsupported_conversion，不伪装 no_account，也不重试其它账户逃避语义校验。现有 gateway model references、插件 patch 校验与 usage extraction 仍按真实上游 Messages 数据工作；不能用转换后的 OpenAI usage 再结算一次。

## 首轮支持边界

严格保真子集逐项测试后启用，不将下面列表当已实现：

- model、stream；显式正 max_tokens/max_completion_tokens/max_output_tokens 原值映射，两个 Chat 上限同时存在且冲突则拒绝。缺上限需要显式 host 默认配置及诊断；不能继承旧 8192 暗默认。
- 文本 user/assistant、顺序与内容原样；首部唯一 system（或 Responses instructions）映射 top system。散落 system/developer、两者混用或 developer 优先级无法等价的输入，第一轮拒绝，而非平铺；后续仅在目标能力明确支持原位置/角色时扩展。
- function tools 完整名称、description、JSON Schema 原文；function_call/function_call_output 与 Chat tool_calls/tool 仅在 ID 配对有效时映射。孤立/重复/缺结果不能靠删除修复。strict 工具语义若目标无等价约束则明确拒绝该组合。
- sampling temperature/top_p 合法组合精确映射；stop 字符串/数组到 stop_sequences；unsupported 模型限制交目标 API 原错，不静默删除。
- tool_choice auto/none/required/单函数按目标受支持组合映射；parallel_tool_calls false 有可证明的目标字段时映射，true 不能被当成强制并行。
- response_format/text.format JSON Schema 走已实现真实上游 output_config.format；json_object 不能偷偷改成宽松提示词，独立验证后开放。
- image base64/URL 在源/目标 detail 与 media 语义均可表达的子集；file_id 和音视频第一轮明确拒绝。
- JSON/SSE 文本、函数调用 ID/参数增量、工具停止、max_tokens 截断、refusal 正常200、最终 usage。异常上游 status/error 原错转成协议合法错误；SSE 中途错误不补成功 finish/completed。

首轮明确拒绝：n>1、logprobs/top_logprobs、logit_bias、seed、frequency/presence_penalty、modalities/audio、prediction、后台/存储/previous_response_id/conversation、include 不可表达项目、资源 ID/内置云工具、未知有语义字段。store=false 可作为明确无存储约束接受，但 store=true 不可声称实现。metadata/user/service_tier/reasoning/verbosity/cache options 逐字段核对语义，不因同名就透传。

签名/思考：不把 OpenAI encrypted_content 当任意 Anthropic signature，不把签名思考块转成普通文字。现有 legacy 编码需独立确认具备带来源/版本的无损 envelope，且只允许本转换器发行的 opaque roundtrip；否则拒绝输入。输出遇无法表示的 signed/redacted thinking 应有正式可回放 envelope 方案后开放，不能悄悄剥离。首轮默认 thinking disabled 也必须来自明确转换能力策略，不能擅改客户端指定思考。API 省略默认值与账号/管理员策略分开。

## 实施分步与验收

1. 机械迁移 16 文件和包内 tests，legacy alias/wrapper、model helper、模块 replace/go.work/Docker；先确保 legacy 全部原测试不变通过，抽取本身不改变行为。
2. 新增 RawJSON strict admission + 计划契约，验证拒绝路径不发上游请求；表驱动覆盖每个已知字段和嵌套未知字段。
3. 接 next 两个 registry pair，JSON 全链 fake HTTP；stream 状态按 terminal ledger 驱动，只正常 message_stop 才成功收尾；取消/EOF/error 不可补 completed。并发串流无共享状态。
4. CLI2.1.292 假上游端到端：外部 OpenAI 请求 → core → CCGateway → Worker → CLI → wire，长历史/工具往返/模型 remap/system 原位置/签名边界/structured/refusal/usage 双协议×JSON/SSE；准确记录未支持组合。
5. Linux race/隔离 DB 验证转换不绕组模型权限、多模型 usage 仍按上游提取、precharge/refund/失败重试不重复收费；现有纯 Messages 行为回归。
6. 主 agent 安排真实账号最小推理与工具往返后，才提升 evidence 等级。假上游成功不代表上游账户允许所有字段。

本方案未修改生产转换代码；未运行新的迁移测试，因为迁移尚未实施。上一批资源传输 probe 和空 registry 拒绝测试仅证明既有边界，不作为本方案上线验证。
