# Core → Worker → CLI 协议验证与精确工具数值

2026-10-08，本地 Windows，CLI 2.1.292。没有生产更新、提交、推送或真实云模型调用。

## 隔离方式

`next/server/internal/gateway/openai_worker_cli_test.go` 只通过 `CCG_TEST_WORKER_BINARY` 启动独立 Worker 二进制，server go.mod 未引入 engine。二进制由 companions/worker/cmd/worker 单独构建；`CCG_REAL_CLI` 指向本机真实 CLI 可执行文件。

Worker 使用随机合成 API/admin key、临时 HOME/USERPROFILE/APPDATA、独立 CLAUDE_CONFIG_DIR 与缓存目录。进程环境只继承 PATH/系统启动必需项，未继承真实 Anthropic key、OAuth、代理或 Claude 设置。假上游与 Worker 都监听 loopback；健康就绪后，核心测试环境仍走真实鉴权、账号选择、模型映射、转换和 usage 记录。平台 fixture 只将合成 Worker key 放入上游请求头。结束时回收 Worker 进程树与临时文件。

为了让独立 binary 真正只绑定 loopback，修复了旧 CCG_BIND 只取端口、忽略 host 的问题：Config.BindHost 保留显式 IP/localhost；WORKER_PORT 只覆盖端口；非法 host/port 拒绝。默认空 host 维持 wildcard 容器监听。Server 使用 net.JoinHostPort 支持 IPv6；内部 relay URL 使用显式监听地址，wildcard/localhost 保持 127.0.0.1。此配置未部署到现有账号容器。

## 已通过矩阵

`TestOpenAIWorkerRealCLIProtocolChain`：Chat 与 Responses 各 13 次，共 26 次真实 Worker/CLI 请求。

- JSON/SSE 文本、function 工具与工具结果、结构化输出。
- 正常 refusal 保持 HTTP 200，两种响应格式都保留拒绝内容。
- 30 轮历史完整导入，逐一断言每轮用户和 assistant 文本只出现一次；回退不泄漏未来消息；新 Worker/缓存冷导入。
- 客户端 system、核心模型 remap、显式 max_tokens、sampling 到真实 wire。
- usage 按上游 Messages 的 input/output/cache_read/cache_creation 记账，未按转换后的 OpenAI usage 重复计量。
- 未知请求字段在核心得到 unsupported_conversion，假上游调用数不增加。

`TestOpenAIWorkerRealCLIExactToolNumbers`：两协议 × 初始 input / input_json_delta 两种形态 × 6 次，共 24 次。

每种覆盖 JSON、SSE、工具结果续聊、新 Worker 冷导入、更深续聊、回退。正负 9007199254740993、小数 0.100000000000000000001、工具 schema minimum 原值保留。两组共 50 次，最新完整执行 PASS 48.269s（普通链 22.29s，精度链 23.21s）。这不是 50 次云端模型推理。

## 真实发现与修复

初始红灯并非 strict codec：单元转换 UseNumber 已正确。CLI 的 JavaScript JSON 解析把工具 input 的 9007199254740993 变为 9007199254740992；普通 delta 字符串的即时客户端返回可以保真，但 native transcript 续聊及冷导入仍会损数。content_block_start 直接携带非空 input 时，CLI 还可能让 native assistant 的 input 与实际返回不一致。

新增 `engine/exact_tool_inputs.go`：

- 原始且已归属主请求的 SSE 在 CLI 读取之前记录工具 start block；通过 message ID、block index、tool ID/name 和整块内容比对绑定。只允许 input 中已知的 JS 数字表示变化，随后恢复原 UseNumber 对象；不从已舍入的数字猜原值。
- 历史以本次客户端完整输入为权威，按工具 ID/name 进行候选恢复；非数值变化拒绝。所有已知历史修复之后，再用共享完整 history alignment 校验角色、顺序、块位置与文字，才允许出站，不放宽 citations 或 inline timeline。
- fingerprint 保留原数值，两个落到相同 double 的不同整数仍产生不同缓存键。
- 精度敏感的工具 schema 复用已有客户端工具目录恢复逻辑，不让 SDK 的浮点解析重写约束。
- 非空 initial tool input 启用既有 native checkpoint 内容校验；native 内容不同则 response-only，下轮从客户端历史重建。正常 delta 路径保留原有缓存机制。

补充单测覆盖负数、小数、负零、1e309 的 JS JSON 投影视图、不可变文本/ID/name、非数值篡改拒绝及缓存指纹碰撞。该视图仅用于工具 JSON 输入比较，绝不应用于用户文本、签名或缓存 fingerprint。

测试 fixture 的普通文本统一使用真实 API 常见的空 start + text_delta，message ID 每轮唯一。早期非标准 fixture 的“非空 text start、无 text_delta”使 CLI native 写成 No response requested.，完整历史校验正确拒绝；没有为使测试通过而接受错误文字。初始非空 tool input 的专项红灯仍保留并已转绿。更广的非空 text start 原生历史兼容性不在本次精度修复成功范围内。

## 验证命令与边界

- companions：`go test ./engine -count=1` PASS 3.951s；`go vet ./engine` PASS。
- worker：`go test ./internal/config ./internal/server ./internal/worker -count=1` PASS。
- server：设置两个测试环境变量后，`go test ./internal/gateway -run '^TestOpenAIWorkerRealCLI' -count=1 -v` PASS 48.269s。
- 没有 Docker build、Linux race、生产 CCGateway 插件网络或真实模型 beta 资格验证。之前的真实账号短答/Files GET 单独记在 REAL-ACCOUNT-BASELINE.md，不能与本轮新代码的假上游验证混同。

## 独立复核补充（2026-10-08）

- API agent 的真实 CLI 红灯证明 MCP `mcp_tool_use` 的 initial input 同样会损失数字精度。精确恢复注册范围扩展为 `tool_use`、`server_tool_use`、`mcp_tool_use`，并在历史候选匹配中额外要求类型一致。原 message/index/整块绑定以及最终 history alignment 均保留。`TestRealCLIReviewExactMCPInitialInput`、非数值篡改拒绝与原 Exact tests PASS 2.932s。工具 listing schema、任意 server result JSON 不属于该 input 专项的已验证范围。
- 监听地址进一步限制为 loopback 或 unspecified；拒绝仅监听某个非 loopback IP 的配置，避免 health 正常但受 loopback 来源保护的内部 relay 不可用。`localhost` 在加载时归一为 `127.0.0.1`；默认 wildcard 保持容器兼容；没有放宽 relay 来源验证。配置/HTTP server/Worker 三包测试均通过。
- 独立阅读 fallback JSON carrier、runner 终态、core model references 与 replacement usage：真实 JSON 被校验后通过内部 SSE 承载，客户端 JSON 取保存的完整原 envelope 和受控工具映射；终态提前停止内层 CLI，模型权限及 override 价格输入在上游调用前冻结，未知 attempt 模型/缺失计价事实记录 BillingError。当前读到的范围未发现新增阻断问题。
- 复核命令：engine `go test ./engine -run 'Test.*Fallback|Test.*JSONGeneration|TestExact|TestReviewExact' -count=1`（配置隔离真实 CLI）PASS 14.757s；core `go test ./internal/gateway -run 'Test.*(Fallback|Attempt|ReferencedModel)' -count=1` PASS 1.070s。此为目标测试及源码复核，不替代完整回归/真实 provider fallback 资格验证。
