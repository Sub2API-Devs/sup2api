# 协议共享抽取进度

2026-10-08，第三批，第 1 步。未暂存、未提交、未部署；next converter 严格准入/注册尚未实施。

## 已完成

- 新增 `next/protocol-codec` 独立 module，包名保持 apicompat。16 个原生产文件迁移，不复制双份业务；逐文件对 HEAD 归一比较，除 4 个文件的 internal model imports 外 0 非预期源码差异。
- 原包内全部 Go tests 与 testdata 一起迁移，保留私有 helper 测试，不为测试扩大 API。
- `backend/internal/pkg/apicompat/compat.go` 为公开类型 alias 和公开函数薄包装，保留 variadic 传递与类型方法。新增外部包 facade 测试验证类型身份、共享 accumulator 方法、Opus 默认值及 variadic 工具映射。
- 共享 `modelpolicy` 抽最小 Claude/OpenAI spelling helpers；旧包对应函数调用共享实现。Claude reverse override map 旧变量引用同一对象；仓库调用检索仅查到读取，未发现重赋值。外部调用方如将整个旧 map 变量重新赋值而非修改元素，属于独立审查需注意的兼容边界，尚不声称动态重绑定兼容。
- backend go.mod 添加共享模块 require/replace；next/go.work 添加模块（Go 工具将 go 1.27 规范为 1.27.0）。next/server 尚不依赖 codec，等待严格转换接线。
- 根 Dockerfile、deploy/Dockerfile 添加共享源码路径。backend/Dockerfile 改为显式仓库根 context（`docker build -f backend/Dockerfile .`），不再隐含 backend 单目录含全依赖。
- 生产代码仅标准库。测试依赖 testify 与 gjson 均使用原 backend 已锁版本；初次 tidy 外网 checksum 不可达，改复用原 go.sum 的已有校验和后 tidy 成功，没有关闭校验。

## 验证

- 新 module `GOWORK=off go test ./...` PASS（1.544s），`go vet ./...` PASS。
- backend 原 claude/openai 测试 PASS；新 facade 测试 PASS（3.341s）。
- 本阶段服务层相关测试编译/执行进行中，结果追加下面。
- 迁移路径 `git diff --check` PASS；仅 Git CRLF 提示，无空白错误。
- 尚未执行 Docker build 或 Linux race；主 agent 安排统一验证。没有真实上游推理。

## 后续

主 agent 已实现可选 PreparedConverter 契约。机械抽取经独立复核后，实现 RawJSON 严格准入及按请求的 immutable plan，不能直接注册 legacy 的 system 汇总/工具修复/默认参数策略。保留旧行为并不表示 next 接受这些宽松策略。

服务层结果：`backend go test ./internal/pkg/apicompat ./internal/service -run 'TestLegacyFacade|Test.*(ResponsesToAnthropic|ChatCompletions|AnthropicToResponses)' -count=1` PASS，service 4.294s。该命令编译整个 service 包并运行相关名称测试；不等于全部 legacy service/数据库测试已跑。

## 第 2 步：strict codec（2026-10-08）

新增纯协议子包 `strict`，不改 legacy 转换策略：

- `Prepare(protocol, raw) (*Plan, []byte, error)`；支持标识 openai.chat/openai.responses；Plan 不可变，`JSON` 和每次 `NewStream` 独立。Stream 暴露 `Event(Event{Name,Data})`、`Flush`。
- RawJSON 用 Number 保留整数精度、递归拒绝重复键/未知请求字段；顶层/嵌套工具/内容分别校验，schema 内部原样保留，不扁平化。
- 支持显式正 max token 上限（无 8192 隐式默认）、temperature/top_p 可表示区间、stop、单响应 n=1、stream/include_usage、客户端函数 tools/choice/parallel、严格 JSONschema、文本与有限 image URL/base64。
- 保留一个首部 system；mid-system、developer 优先级、文件/资源引用、未实施参数明确拒绝。tool ID/名称/description/schema/大整数原样，缺失结果/重复/孤立结果不删除修复；工具结果必须在普通 user 内容之前。
- Structured format 要求显式 strict:true；format 级非空 description 没有目标字段，明确拒绝，不偷丢指令或覆盖 schema.description。schema.name 是源协议格式标签，非 target 模型指令，不写入 Messages。
- Responses reasoning 使用 `sup2api-anthropic-thinking-v1:` envelope 保存完整 thinking/redacted block + provider/model。该前缀仅传输编码，绝不是防伪或账户授权。Prepare 不把 client alias 当实际模型；上游仍负责实际映射模型与 prefix 的签名校验。摘要与 opaque 明文不一致拒绝。Chat 尚无协商的无损签名历史扩展，遇该组合明确报转换错误，不静默禁用 thinking 或剥离签名。
- 复用共享 DTO/usage 与按单块调用的可保真低层响应转换；额外覆盖原始 input 序列化，防将 JSON 大整数经过 float64 路径。原始工具 ID 不做前缀规范化。

### JSON/SSE 和拒绝语义

Anthropic 在文本之后的 message_delta 才给 refusal 终态。按主 agent 决策，此跨协议路径缓冲全部待输出事件，确认终态后再发 OpenAI text/refusal 标准事件。入站事件与待输出事件合计上限 32 MiB；超限、取消、EOF、上游错误均不得补成功终态。文本增量会延迟，原生 Anthropic 流不受影响。

refusal 在 JSON/SSE 都是正常完成，使用 refusal 字段/part，非 502。max_tokens 映射 incomplete/length。工具 arguments、思考摘要/opaque 以各自 item 顺序保留。完整原 usage/stop 及新增响应元数据进入加性 `provider_details.anthropic` 扩展；不把 Anthropic service_tier 强行解释成 OpenAI 同名枚举。Chat 终止 chunk 和 Responses 完整终态 response 均携带此扩展。核心计费继续读取未转换的实际上游 usage。

响应 metadata 与请求操作参数不同：未知响应 envelope/usage facts 保留，不因此报错；未知执行型 content block 仍须另行适配，不能删块伪装完成。stream stop/delta 不得覆写消息 id/model/role/type/content/usage 身份字段。

### 验证与独立复核整改

- 全 module `go test ./...` + `go vet ./...` PASS；最新 strict 1.212s。
- 32 并发 stream、40 轮历史、首部 system 空白/换行、大整数、工具多结果配对/ID、schema、JSON/SSE refusal、opaque 回放/摘要篡改、未知/重复字段、正常 usage 数值、provider facts、EOF/error/32 MiB 上限均有测试。
- research_cc 独立 review tests 发现并推动整改：stop 身份覆盖、非法 error envelope、none+parallel 非法组合，以及工具 arguments 精度保障与 format description/strict 缺省语义。独立文件 `strict/independent_review_test.go` 由 reviewer 编写；不把作者测试称为独立审查。
- root 正在 next gateway registry/HTTP 接线，真实 CLI fake 全链与 Linux race 由根整合。本文截至此处只证明 codec 单元与共享 legacy 回归，不代表真账号或生产部署完成。
