# CCGateway 单轮映射与增量输出

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](../plugins/ccgateway/docs/CLI-TEST-PLAN.md)。

## 2026-10-16：账号 #21 已更新并完成真实客户端验证

此前测试后恢复旧程序的阶段已经结束。按用户“更新上去，然后启动 CC 客户端测试 21 账号”的要求，已提交并推送实现，在服务器从精确提交构建，并通过 Controller `POST /accounts/21/worker` 正式原地更新 #21。新程序保持运行，没有在验收后回滚。

- Worker 版本：`0.1.58-singleturn.2`。
- 实现提交：单轮与流式 `494af0bed19109276f67540eb8c8d2913de08903`，实际客户端补测后的目录修复 `6f0253b01472dabcdbd0c8b1e3a498aef12c8904`；运行程序对应后者。
- 构建：Go 1.27.1，干净 detached worktree；服务报告 `modified=false`。
- 制品镜像：`ccgateway-app:0.1.58-singleturn.2`。更新的是既有容器内程序，容器原镜像标签不是实际程序版本。
- 当前程序 SHA-256：`0ac219472663c24746addd7465835e13461379f23a4aef1e27a6a52c82a7a9bb`。
- Controller 更新结果：`updated`、`online=true`；Worker health 为 healthy，内部 CLI 保持 2.1.292。
- 容器 ID、Config/HostConfig/Mounts 摘要保留，另外 7 个账号运行容器的身份、状态和启动时间未变化。

初版先通过了 Haiku 的文本和 Read 测试；补测发现默认动态目录没有开启搜索探测，因而漏掉原生 ToolSearch。修正版增加真实 `ENABLE_TOOL_SEARCH=true` 目录探测场景，仍严格核对实际 schema；`DeferredToolPlaceholder` 不是可执行原生工具，保留其延迟 MCP 占位项身份。目录/配置探测使用本机假上游，不增加真实上游推理请求。该修复的动态目录与配置验证在 CLI 2.1.292 和 2.1.296 均通过。

修正版发布后，启动本机真实 Claude Code **2.1.296** 客户端，以隔离配置和只读测试目录，在 **`claude-opus-5-5`** 下完成三项测试：

| 用例 | 客户端模型轮次 | 发给 #21 的 Messages 请求 | 结果 |
|---|---:|---:|---|
| 输出 1–60 的文本流 | 1 | 1 | 16 个文本增量，客户端首段到末段约 934 ms，CLI 正常成功结束 |
| Read 本地随机标记文件，再提交工具结果 | 2 | 2 | 客户端执行一次 Read，工具结果成对，最终准确返回文件中的随机标记 |
| ToolSearch 发现本地 MCP 工具，再执行工具 | 3 | 3 | 客户端执行 ToolSearch 和 `mcp__single_turn_fixture__lookup_probe`，两个工具结果成对，最终准确返回随机标记 |

六次 Messages 请求均为 HTTP 200。#21 的独立请求日志均记录 `--max-turns 1`、`CCGATEWAY_TOOL_SEARCH=0`、一个主模型 `message_start`；ToolSearch 链路的三个请求均确认客户端 ToolSearch 保持原生身份。三个客户端进程均退出 0，终态为 success。

测试通过 SSH 私有桥接固定转发到 Controller `/accounts/21/v1/messages`，不会随机选择其他账号。验证覆盖真实客户端、Controller 转发和 #21 Worker，不将其描述为平台用户 API Key 的分组调度或计费验收。临时桥接和客户端配置已清理，没有改动用户全局 CC 配置。

最终部署记录、构建来源和真实客户端结果位于服务器 `/home/debian/sup2api/checks/single-turn-release-20261016-v2/` 与本地 `artifacts/ccg-single-turn-release-20261016-v2/`。不带 `-v2` 的目录保留初版记录和测试脚本。下文中的旧程序恢复和测试版哈希是此前验证阶段的历史记录。

## 目标与边界

每次客户端请求独立完成参数、工具和历史映射。模型请求客户端工具时，将调用交还客户端；只有客户端提交新的请求和 tool_result 后才继续生成。Worker 不再执行内部 ToolSearch、结构化结果修复或搜索辅助轮次。

**单轮生成不等于任何情况下严格只有一次 HTTP 尝试。** 使用账号 #21 的实际 CLI 2.1.292 已复现：特定 `400 output_config.effort` 拒绝会触发 CLI 同一轮内部的兼容重发，不受 `MAX_RETRIES=0` 或 Mod `turn.step` 边界控制。本文不把这项限制描述为已解决。

若要求所有错误路径也严格只有一次上游 HTTP 请求，需要在实际传输层、转发请求前按本次执行 ID 限制 Messages 请求次数。不能靠收到 stdout 后异步终止进程保证无竞争，也不能伪造参数或修改 CLI 二进制。这适合与 TLS relay 的请求转发入口结合，现有 native Mod 层没有该拦截能力。

平台核心原有的跨账号失败重试属于另一层策略，本次没有修改全局调度。

## 实现

- `runner_config.go`：当前 native API 请求由已有 `nativePolicy` 标记识别，固定 `maxTurns=1`；增量事件不再因为工具搜索策略而整轮缓冲。
- 不再向当前请求的工具目录或响应白名单注入客户端没有声明的 ToolSearch。
- 客户端拥有原生 ToolSearch 时保留其工具发现配置，但不授予 Worker 内部执行权限。
- 客户端没有原生 ToolSearch 时关闭 CLI 自动工具发现。显式延迟加载需要客户端拥有可执行的原生搜索工具；无法满足时拒绝，不静默改成全部预加载。既有 forced-loaded 安全条件仍适用。
- 工具归属依据原生兼容验证后的实际 wire name，原生探测降级为 MCP 后重新验证。自定义同名工具不冒充原生 ToolSearch。
- `mod_control.go` 将内部 `single_turn` 约束传给 Mod；它不是客户端可设置的开关。
- Mod 同时禁止内部工具执行及第二次 `turn.step`，包括原先允许的搜索和格式修复续轮。
- stdio 权限回复同样不允许内部搜索/格式工具执行。
- 明确关闭 CLI 已提供的模型访问回退、模型回退、refusal 重试与 refusal 回退开关。
- 仍使用现有 Accumulator 校验/保留完整消息，但校验后的 SSE 增量立即发送；终止、错误和历史提交沿用原有路径。

历史协议处理函数仍供已有历史解析和隔离测试使用；所有当前公开 native API 请求都应用单轮约束。

## 兼容性变化

以下组合不能透明映射为一次模型生成，当前请求执行前返回 400：

1. 显式 `fallbacks`，由客户端决定是否提交另一请求。
2. 需要 Worker 运行搜索并继续主模型的通用 server web_search 请求。
3. 启用延迟工具发现、显式 `defer_loading: true`，但没有经过验证的客户端原生 ToolSearch，且不符合既有 forced-loaded 条件。

Claude Code 客户端专门发起的独立 WebSearch 查询仍保留：它直接对应一次搜索模型请求，不先调用主模型再做搜索。这条既有结果组装路径仍在完成后返回搜索记录，不宣称已经改为逐 token 输出。

普通客户端 WebSearch 工具仍按客户端工具处理，不在 Worker 执行。

## 验证方式

### 单元与 Mod 测试

在原有单轮工具测试中覆盖实际工具归属、MCP 降级、未声明工具的响应白名单、HTTP 400 准入及配置边界。新增 Mod 测试在旧 helper 环境变量仍存在时验证：本地工具执行次数为零、第二次模型 step 被阻止。

### 真实 CLI 时序测试

使用账号 #21 容器中的实际 CLI 2.1.292 二进制及同一基础镜像，在 `--network none` 的临时容器运行。该容器只访问自己的本地假上游，无生产凭据。

账号原容器禁止随机回环端口，直接在其中使用 httptest 随机端口会超时。本次保持其网络规则不变。

测试上游先发 text_delta 后等待，客户端收到后才允许它继续；随后发送不完整 input_json_delta 并再次等待客户端确认。原生 ToolSearch、自定义 MCP 工具均通过：

- 正文和工具参数在上游完成前送达。
- 一次响应只有一个 message_start 和 message_stop。
- 首次客户端请求只产生一个上游请求，返回 tool_use。
- 客户端自行提交 tool_result 后才出现第二个上游请求。
- 两次客户端请求合计两个上游请求，工具名称和输入保持正确。

503 和 429 拒绝测试没有重发。effort 400 测试记录 CLI 兼容恢复边界：该版本实测两次 HTTP 请求，均被假上游拒绝，没有产生模型结果；这不是严格 HTTP 一次的成功验收。

### 账号 #21 真实调用

原程序基线：Haiku 文本请求携带工具和 advanced-tool-use beta，20 个文本增量在约 1 ms 内集中到达；首内容约 2056 ms，总耗时约 2072 ms。

测试版在相同 Haiku 请求形状下返回 HTTP 200：20 个文本增量分布在约 356 ms 内到达，首内容约 1519 ms、末段约 1875 ms、总耗时约 2001 ms。这是增量送达证据，不是稳定性能基准。

另外两次真实客户端请求完成 `echo_probe` 工具往返：第一次返回 `tool_use`；测试客户端提交工具结果后，第二次返回 `end_turn` 和预期文本。首次临时切换后的模型连接曾返回 ECONNREFUSED；恢复原程序后已重新验证原链路成功，再次切换时增加上游连通性就绪检查，随后上述测试通过。

测试结束已恢复原程序，核对了原程序 SHA-256、容器 ID、规范化后的 Config/HostConfig/Mounts 摘要和 health。没有更新其他账号或发布正式版本。

## 验证结果与制品

- 本地 engine 全量测试通过；Worker 各包测试通过；Mod 单轮和附件处理测试共 4 项通过。
- 新增真实 CLI 时序/工具往返测试通过；503、429 与已知 effort 400 恢复边界测试通过。
- 既有 API 格式测试的 end_turn、max_tokens 分支通过。refusal 两个分支仍存在检查点数量断言失败；在未修改的 `21c98eb68` 基线上重复得到相同失败，本次未修改这一独立问题。
- 测试 Worker SHA-256：`bea195d674aa156414c3d474e4a9eb6ae6e060855934ed9c817ffa19144a3011`。
- 已恢复 Worker SHA-256：`be332d683fcaf8cbc0b1b966a65475641f48c9c11e1231b451d662aa785381c8`。
- 测试所用实际 CLI SHA-256：`a967e7b1d8b4e47ee421d5433027880347952b0c0857abf880e2c942a4ec93b3`，版本 2.1.292。
- 服务器测试记录和原程序备份：`/home/debian/sup2api/checks/single-turn-20261016/`。本地验证脚本和制品：`artifacts/ccg-single-turn-20261016/`。

测试制品从当前工作区构建，仅用于本次验证，不是正式签名发布。模型凭据只在账号容器内使用，报告和脚本不包含凭据值。
