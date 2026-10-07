# F-THINKING / F-OUTPUT 设计与探针

2026-10-08；仅新探针与本设计，尚未改业务解析/执行。目标项目 `D:/projects/golang/sup2api`。CodeGraph 查询确认 `finishStructured` 位于本项目 `engine/structured.go:64`；索引提示其他修改文件待同步，后续使用实际文件读取，不把索引当最新代码。

## 官方语义基线

[Thinking 文档](https://platform.claude.com/docs/en/build-with-claude/thinking)：缺省行为按模型决定，不能等同 disabled；updates 需要对应 beta；Sonnet 5.5 的 between_tools 只允许 high 以下且不带其他 thinking 子字段。绑定签名涉及模型、前缀，部分模型还绑定账户；不能剥离签名作为兼容措施。

[Structured outputs 文档](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)：`output_config.format` 是 API constrained decoding，返回 text JSON；refusal 为正常 HTTP 200，max_tokens 可返回不完整 JSON。旧 output_format 需要旧 beta，不能把两种形状静默混用；与 citations/prefill 的限制由明确校验或上游错误体现。

## CLI 2.1.292 本机隔离探针

文件 `engine/thinking_output_probe_test.go`，`TestRealCLIThinkingAndAPIOutputSurface` 九组 PASS 4.11s。PASS 表示捕获行为符合探针断言，不表示所有特性已支持。上游是回环假服务、dummy key、独立 HOME/配置，不调用线上账号。

- 不传 thinking CLI 参数：wire 为 adaptive + display updates，output_config.effort 为 medium。
- `--thinking disabled`：wire **没有 thinking 字段**，不是 `{type:disabled}`。
- `--thinking adaptive`：wire 为 adaptive + display updates。
- `--thinking-display updates`：CLI 参数直接拒绝，CLI 允许 summarized/omitted/highlights。
- `--thinking between_tools`：CLI 参数直接拒绝，CLI 允许 enabled/adaptive/disabled。
- 隔离实验通过 EXTRA_BODY 放入 adaptive + updates + block_binding:error：实际 wire 保留；只证明传输路径可行，未检验 API 权限与真实签名。
- 不传 `--json-schema`，实验把 API format 放入真实出站 body：无 StructuredOutput 工具；假上游 JSON 文本正常流式完成、native JSONL 有同 ID、一次请求。
- 同一路径返回 refusal：CLI 自己发两次请求、最终 exit 1；返回 max_tokens 截断 JSON：CLI 发四次、最终 exit 1。都有原始 stream stop 和 native assistant。因此 Worker 必须主动在 API 完整终止时结束，不能等待 CLI 自己重提示。

EXTRA_BODY **仅探针实验**；生产仍采用已归属主请求 relay。模型用 claude-opus-5-5，不能推导全部模型/账号授权可用。

## 当前代码与问题

`runner_config.go` 将 JSONSchema 等同 CLI synthetic structured mode：加入 `--json-schema`、开启 Mod StructuredOutput，增加内部轮次且缓冲。`structured.go` 把 synthetic tool 转为 text 并读取 CLI result.structured_output；`history.go` 禁该模式 prefix 恢复/commit。API JSONSchema 请求因此被替换了实现机制。

thinking 默认分支同时传 `--thinking disabled` 与 MAX_THINKING_TOKENS=0；探针证明该 CLI 模式并不保证 wire disabled。原 `thinking.display` 局部覆盖还不足以保证完整对象及缺省语义。CLI 的默认 effort medium 也不能代表客户端未指定 effort。

## 提议第一阶段：API output_config.format 独立路径

1. RequestPlan 保存 format 原 JSON，对已确认主请求合并 `output_config.format`；effort 是独立字段，不能覆盖 format 或让 CLI 的 medium 悄悄成为客户端默认。辅助请求不修改。
2. 明确区分 API format 与旧 synthetic mode。客户端 API format 不传 `--json-schema`，不注册 StructuredOutput，不加结构化重试提示、不合成 stop_reason/usage。如不保留内部旧模式，需同时删除依赖它的分支并迁移测试。
3. CLI 仍负责发请求及 native 记录。响应正常 text/工具调用保留；只有正常最终文本的 end_turn 才做可选独立 schema 校验。refusal/max_tokens/model_context_window_exceeded/stop_sequence 等合法结束必须原样返回，不能因为 JSON 不完整报502或内部重试。
4. `runner_session.go` 对受此模式控制的完整最终 stop 做终止，不等待 CLI 补偿；relay 在已归属完整响应之后阻止第二次实际上游。不能截断 tool_use 客户端交接、内部搜索仍须正确判定。
5. 保留原生 checkpoint 前需等实际 JSONL flush，不能像 refusal 一律跳过所有正常结构化历史。可让同一 native读取逻辑以完成 message ID 等待稳定记录，不依赖错误的 CLI result.structured_output。若不得已提前 kill，要有明确的原始 response/history sidecar，不伪造 native assistant。
6. 重写现有 fake structured fixtures：给真实 API text JSON，而不是只向 StructuredOutput synthetic tool 发输入。原 synthetic fixture仅用于明确旧模式。增加 JSON/SSE、refusal、截断、客户端 tool_use、续聊/cache、无重复请求测试。

需协调 owner：request_policy.go 的 format提取、RequestPlan、runner_config、structured.go/response.go、runner_session/history、Mod structured注册、relay完成控制；不要只改最后一处 wire。

## 提议第二阶段：thinking 完整主请求计划

- 区分字段不存在与显式对象；不存在应移除 CLI 自行添加的 thinking，只在主请求保留 API 模型默认。显式 disabled 要原样对象到 wire，不能靠 CLI disabled 的省略行为。
- adaptive/manual enabled 保留完整子字段；budget 不被环境默认/CLI 裁剪改变；display updates/between_tools 不能直接用不受支持的 CLI flag。通过已验证主请求计划传入，CLI启动只用它实际认识的辅助开关。
- 按字段结构校验；已知模型冲突有文档证据则明确400，未知模型不猜能力，保留上游判定。beta updates/binding 要与实际字段联合能力登记，不只加字符串白名单。
- 未指定 effort 要保留 API 缺省（删除 CLI medium）；显式 effort 与 output.format 合并。thinking模式/effort参与缓存一致性，不能把任何不同配置当作同一绑定前缀。
- thinking和redacted_thinking块的顺序、空文本、signature全部原样；使用签名假的fixture只能验证字节保真，不能证明服务端签名有效。

## 绑定控制的独立门槛

`thinking.block_binding.prefix_mismatch_behavior` 的 error/drop_block 是上游语义，不是网关自行删除 thinking 的授权。绑定正确性依赖完整出站 system/tools/messages 前缀；工具名称映射、容器附件、重建历史、模型或账号调度都会改变它。方案需要保存对应 prefix证据并比较：同一缓存会话保持既有 mapping/environment，跨worker新历史有客户端原始签名但无对应出站证据时明确识别风险并透传错误，不能假装所有签名有效。未来账户调度需使用必要的粘性信息，不能从本机假上游结果宣称已解决。

## 尚未验证

本阶段没有业务改动、没有真实账号 inference、没有部署。签名跨轮/跨账户验证、updates实际返回、between_tools真实模型限制、schema constrained decoding产生的约束效果仍需后续真实上游证据。探针只证明 CLI 传输形状、输出与 native记录路径。
