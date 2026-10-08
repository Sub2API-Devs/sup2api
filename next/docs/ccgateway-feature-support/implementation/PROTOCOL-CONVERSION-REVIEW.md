# 第三批独立复核

2026-10-08，复核方不是抽取与严格 codec 作者。机械迁移、PreparedConverter 和首轮 strict JSON/SSE 复核均已完成。审查没有暂存、提交或部署；独立的真实账号只读基线见 REAL-ACCOUNT-BASELINE.md，不计作本轮新 codec 上线验证。

## 机械迁移

- 独立将 HEAD 中 legacy apicompat 的 54 个文件（生产、测试及 testdata）与共享模块比较。统一换行并替换预期四处 modelpolicy import 后，零缺失、零其它内容差异。
- legacy 公共 DTO 为真正 Go type alias，accumulator 方法属于共享类型，没有复制平行类型。父 agent 另以 AST 核对 104 个公开符号签名；本次独立运行 facade 类型赋值、方法及 variadic 行为测试。
- `ModelIDReverseOverrides` 当前共享同一 map 对象，元素修改语义保留；若宿主以后把 legacy 整个变量重新绑定，共享 package 不会跟随。当前仓库检索仅初始化与读取，没有重绑定或元素写入，因此没有把假设的外部重绑定称为当前代码回归。此变量在 legacy internal 包内，不是跨模块任意消费者可访问的 API。
- root 与 deploy Dockerfile 在 backend module download 前复制 `/app/next/protocol-codec`，匹配 `../next/protocol-codec` replace。backend/Dockerfile 已改为仓库根 context 并注明命令；现有 dev compose 本来使用仓库根 context。next Dockerfile 以 next/ 为 context 且 COPY 全体源码，包含新增 workspace module。根 dockerignore 不排除该生产目录。没有实际执行 Docker build，不把静态边界正确当镜像构建成功。

## PreparedConverter

route 在每个 call 内新建；共享 registry converter 的 Prepare 返回请求独立的 bound converter，route 在重试中只绑定一次。当前 32 并发请求测试通过，不同请求选项没有串用。该测试不等于 Linux race。

独立新增 `convert/prepared_review_test.go`：失败不泄漏出站 body，保留原错误身份；nil bound、修改 From/To 的 bound 均拒绝；原 stateless Converter 仍可调用。新增 `prepared_failure_review_test.go`：首次 Prepare 失败后，同 route 再试不重新准备或使用新的 carrier，保留 bodyErr 供调度识别。

接线审查发现需要在严格入口处理的现有边界，已交主 agent：request conversion 错误原本统一 attemptFailover；strict 的 unsupported_conversion 应是终止错误，不换账号尝试。主 agent 采用专用 RequestError 保留旧转换器兼容行为。Prepare 当前发生在账号模型 remap 前；初版 strict 必须保持 model-agnostic，不能擅按客户端别名注入 max/thinking/effort。签名模型绑定需要单独明确设计。

## 已执行验证

- 新模块 `GOWORK=off go test . ./modelpolicy -count=1` PASS；`go vet . ./modelpolicy` PASS。
- backend `GOWORK=off go test ./internal/pkg/apicompat ./internal/pkg/claude ./internal/pkg/openai -count=1` PASS。
- next/server `go test ./internal/gateway/convert ./internal/gateway -run 'TestPrepared' -count=1` PASS；不依赖数据库。
- 未执行 Docker build、Linux race、完整 legacy service/DB 测试。

## strict 独立复核与整改

新增 `strict/independent_review_test.go`，未直接改作者业务文件。发现并交作者修复：

1. JSON 工具参数经过共享 DTO 的 map[string]any 解码会损失大整数。作者改为以原 UseNumber map 精确生成 arguments；独立验证 Chat/Responses JSON，以及 Responses SSE 的 output_item.done、response.completed 都保持 9007199254740993。
2. message_stop 的额外 id 可覆盖已发 response.created 的身份。作者的事实合并明确禁止覆盖 id/model/role/type/content/usage；独立红灯转绿。
3. SSE error=false/string/array 或缺 message 的对象曾被当作合法错误透传。现在校验对象及非空 type/message，不能产生畸形客户端协议。
4. tool_choice:none 加 parallel_tool_calls:false 曾生成 Anthropic 不支持的 none+disable_parallel_tool_use。现在保持 none；既然禁止全部调用，并行限制已自然满足。
5. json_schema.description 会影响模型输出，不能接受后丢弃。作者明确拒绝不可等价的非空 description，并要求显式 strict=true，避免把未声明严格约束的源请求静默加强。独立拒绝测试通过。

还独立验证了嵌套未知请求字段、重复调用 ID、重复结果拒绝。签名思考使用带 provider/version 的不透明传输格式，不把 OpenAI 原生 encrypted_content 冒充 Anthropic signature；编码本身不承担身份认证，上游继续验证实际模型与历史前缀。没有真实签名密码学成功验证。

请求未知语义字段仍明确拒绝。响应新增 envelope/usage 事实按已确定方案保留在 provider_details.anthropic，不能与请求的未知字段策略混淆。末尾才确定 refusal，作者按主 agent 决定在转换路径暂存事件、终态再发匹配的标准 refusal；入站与待发事件累计限制 32 MiB。原生 Messages 路径不使用这个转换缓冲。

最新 `go test ./... -count=1` 全 module PASS（共享 codec 1.646s，strict 1.164s），`go vet ./...` PASS。这是 codec 单元与边界验证；core→Worker→真实 CLI 的 OpenAI 转换全链、真实账号新 codec、Linux race 和计费等仍由集成阶段单独验证，不由本复核报告替代。
