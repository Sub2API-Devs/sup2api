# Checkpoint 2：none 与 refusal 专项复核

2026-10-08；仅修复旧测试合同，没有修改业务实现、生产配置或容器，没有暂存或提交代码。

## none 失败原因与整改

完整 CLI 测试此前在 `TestRealCLI` 旧断言失败：它要求 `tool_choice:none` 的出站 tools 必须为空。当前实现正确保留客户端显式目录及其缓存前缀，使用独立的 `tool_choice:none` 禁止调用。因此这是旧断言冲突，不应通过删除工具定义修业务。

现在在该请求完成后立即断言：目录严格等于客户端 Read 的名称、描述和 input_schema，不混入额外工具；tool_choice 严格为 none。删除较晚依赖 `requests[6]` 的空目录断言。SDK 执行端仍不注册 none 请求的工具服务器，相关单测保留；缓存 none 实测继续验证目录上的 1h 断点保留。

继续运行该大用例发现后面的旧 Fast fixture 也未跟随已实现合同：显式 fast 缺少要求的 beta、管理员禁用时仍期待静默降级。只修 fixture：合法请求携带 fast beta，管理员禁用时期待明确 400 且上游调用数不增加；未放松策略。

## refusal 独立审查

审查 root 最新 `api_output_completion.go` 的一行变更及 `refusal_terminal_review_test.go`，未发现阻断缺陷：

- observer 只安装在已归属的主模型请求上；不会将任意辅助请求作为客户端最终响应。
- 只有读到完整 message_stop、且此前 stop_reason=refusal 才标记 relay stopped；单独 message_delta 不提前关闭。
- 只阻止 CLI 的隐式再次调用，不写 relay.failure、不改变 HTTP 200，也不插入 error 事件。
- 既有内部 ToolSearch 的 tool_use 特例保留；schema 完成检查仍只属于显式输出约束，未把普通拒绝改成 schema 错误。
- 新测试同时覆盖空/有文本与 JSON/SSE 四种组合，断言上游只有一次调用、拒绝原因原样、SSE 只一个 message_stop。

## 验证记录

- `TestRealCLINoneChoiceRetainsCachedCatalog` 通过。
- `TestRealCLIOrdinaryRefusalIsSingleNormalResponse` 四个场景通过（3.12s）。
- `go test ./engine -run '^TestRealCLI$' -count=1 -v` 通过（50.697s）；真实本地 CLI 2.1.292，67 次隔离假上游请求，零云端模型调用。
- `go test ./engine -run 'None|SDKMCPRequestScopedDefinitions|Terminal|Refusal' -count=1` 通过（该次未设真实 CLI 环境，因此真实 CLI 测试跳过；上述专项真实 CLI 另行执行）。
- 一次中间复跑因 proxy.golang.org 拉取 gjson 模块超时而 setup failed；随后依赖可用后重新执行通过，不计为业务测试失败或成功。
- 完整 `go test ./engine -run '^TestRealCLI' -count=1 -v` 集合全部通过（376.624s，退出码 0，无 FAIL）。日志位于本机 TEMP 下 `ccgateway-checkpoint2-cli-review-20261008.log`，不提交运行日志或其中的原始请求内容。
- `go vet ./engine` 通过。

以上为本地真实 CLI 配合隔离假上游的协议验证，不代表真实提供商模型行为、缓存账单或生产部署验证。Windows 未执行 race。
