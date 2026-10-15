# CCGateway 流式响应修复方案

状态：本方案是早期“收窄缓冲条件”设计，已被用户后续要求的单轮映射方案取代。当前实现、验证与限制见 [CCGATEWAY-SINGLE-TURN.md](CCGATEWAY-SINGLE-TURN.md)。以下保留排查依据，不代表当前实施范围。

目标代码：`next/plugins/ccgateway/companions/engine`。

## 1. 结论与实施选择

首版采用“按内部工具的实际执行归属决定是否缓冲”。

不关闭客户端的 ToolSearch，不删除 beta，不改变上游工具目录、提示词或模型调用次数，不引入新的公开配置。复用现有 SSE 发送、事件校验和终止处理。

首版解决两个已由代码证明不需要因为 ToolSearch 而缓冲的场景：

1. 客户端声明的工具成功映射到原生 `ToolSearch`，工具调用必须交还客户端。
2. `forcedLoadedClientCatalog()` 成立：现有执行边界已经排除内部工具搜索。

真正允许执行隐藏 ToolSearch 的请求继续缓冲。不能承诺在保留现有隐藏轮次语义的同时，让此类请求的所有文本都提前流出。

截图请求的部署版本、工具映射及有效策略尚未取得，不能仅凭截图认定它属于上述哪一种情况。

## 2. 已确认的代码事实

### 2.1 CLI 与 HTTP 层已具备流式能力

- `runner_config.go:cliArgs` 已传入 `--output-format stream-json` 和 `--include-partial-messages`。
- `runner_session.go:run` 逐行读取 CLI 输出，逐事件调用 `onStreamEvent`。
- `main.go:exchange.send` 每个 SSE 事件写入后调用 `ResponseController.Flush()`。
- 核心 `server/internal/gateway/forward.go:forwardSSE` 按事件边界转发和 Flush。

阻塞点是 `onStreamEvent` 在调用 `emit` 之前，把事件加入 `s.buffered`。

### 2.2 缓冲判定与内部执行判定不一致

`bufferedResponse()` 把所有 `toolSearchEnabled()` 请求都视为需要缓冲。

但 `history_alignment.go:internalHistoryAssistant` 已经明确：

- 强制选择已加载客户端工具时，不存在隐藏搜索轮次。
- 客户端工具的实际 wire name 为 `ToolSearch` 时，该工具归客户端，不属于内部搜索。

Mod 的 `tool.call` 也先查询 `configuration.tools[e.tool]`。有客户端 route 时，不执行内部搜索，而是交还客户端。

因此，已有代码明确禁止内部执行的场景，仍被流式输出层整轮缓冲。

### 2.3 不能仅按工具显示名称判断归属

客户端名为 `ToolSearch` 的工具，可能因为 schema 不匹配或原生兼容探测失败，被映射为 `mcp__<prefix>__ToolSearch`。

此时客户端工具与 CLI 内部的原生 `ToolSearch` 是两个不同工具。必须通过最终的 `r.wireName(tool.Name)` 判断，不能使用 `tool.Name == "ToolSearch"`。

判定发生在 `prepareNativeTools` 完成之后，不能缓存请求刚解析时的 Native 映射结果。

## 3. 首版具体改动

### 3.1 提取共享判断

在 `runner_config.go` 增加请求方法，提取 `internalHistoryAssistant` 已有的前置条件：

```go
// internalToolSearchEnabled reports whether ToolSearch may execute as a
// hidden gateway helper, rather than a client-owned tool.
func (r *Request) internalToolSearchEnabled() bool {
    if !r.toolSearchEnabled() || r.forcedLoadedClientCatalog() {
        return false
    }
    for _, tool := range r.Tools {
        if r.wireName(tool.Name) == "ToolSearch" {
            return false
        }
    }
    return true
}
```

这是现有执行语义的统一表达，不改变 `toolSearchEnabled()` 的含义。后者仍用于 CLI 的工具发现配置。

### 3.2 缩小缓冲条件

将 `bufferedResponse()` 中的 `r.toolSearchEnabled()` 替换为 `r.internalToolSearchEnabled()`：

```go
func (r *Request) bufferedResponse() bool {
    return r.structuredOutput() ||
        r.APIOutputFormat ||
        r.internalToolSearchEnabled() ||
        r.webSearch != nil
}
```

保留其他缓冲条件，避免把独立的结构化输出或 WebSearch 改造成未经验证的增量协议。

### 3.3 内部轮次识别复用共享判断

`history_alignment.go:internalHistoryAssistant` 的前置检查改为：

```go
if !r.internalToolSearchEnabled() {
    return false
}
```

后续检查整个 message 的工具调用归属保持不变。这样输出层和历史层不会各自维护不同的“内部搜索”定义。

### 3.4 复用现有事件路径

无需为首版增加流式状态机：

1. 仍先调用 `Accumulator.push` 校验和组装事件。
2. 不需要缓冲时，直接走已有 `s.emit(event)`。
3. `message_stop` 继续由现有终止路径处理，避免重复或过早结束。
4. `flush()` 对已直通的请求不再重复发送。
5. 非流式请求仍由 Accumulator 收集完整 answer，并由 HTTP 层返回 JSON。

Accumulator 保留完整消息用于历史与结果处理，不代表必须扣住已经验证的增量事件。

首版不修改 `ENABLE_TOOL_SEARCH`、`CCGATEWAY_TOOL_SEARCH`、`maxTurns`、工具目录和 Mod 的工具执行规则。实际归属已经由这些规则保证；这里只修正输出判定。

## 4. 处理矩阵

以下各行均假设不存在独立的结构化输出、WebSearch 或外层托管缓冲条件。

| 场景 | 首版行为 | 判定依据 |
|---|---|---|
| ToolSearch 关闭 | 立即转发 | 原有行为 |
| 客户端拥有原生 ToolSearch | 立即转发文本及客户端工具参数增量 | Mod 不执行此客户端工具 |
| 强制选择已加载的客户端工具，符合现有完整检查 | 立即转发 | 内部 helper 已被排除 |
| 自定义工具同名，但映射为 MCP wire name | 保留缓冲 | 不能据此排除独立的内部 ToolSearch |
| 真正启用内部 ToolSearch | 保留缓冲 | 仍可能产生需要完全隐藏的轮次 |
| auto 模式但本轮最终没有搜索 | 无额外执行证据时仍缓冲 | 最终没有调用不等于提前能证明不会调用 |

不要把“请求带 beta”“所有客户端工具看似已加载”或“第一个 block 是文本”单独作为直通依据。

## 5. 为什么不采用按首个内容块动态放行

以下合法序列在现有语义中属于隐藏轮次：

```text
message_start
text: "Let me check."
tool_use: ToolSearch
message_delta: stop_reason=tool_use
message_stop
```

收到 text 时还不能知道后面是否出现 ToolSearch。提前发送后，无法在看到内部工具调用时撤回已经发给客户端的文字。

`internalHistoryAssistant` 根据完整内容判断轮次；`helper_history.go` 还明确要求被登记为隐藏轮次的原始消息完全未公开。简单的“过滤 ToolSearch block，保留其他文本”会改变这个约定，并影响后续历史恢复。

同样不能在一次搜索完成后就假定下一轮一定公开，后续仍可能再次搜索。

## 6. 真正内部搜索场景的后续边界

如果未来要求这些请求也全面实时输出，需要另立多轮输出协议设计，不能混入首版修复。

可选方向及代价：

1. **保留完整隐藏语义**：只在当前执行能够证明本轮无法调用内部 helper 时直通，否则继续缓冲。若依赖最终上游工具目录，这个证据必须来自当前实际请求，并在输出开始前与对应轮次绑定；另一个探测进程的目录不能作为证明。
2. **公开搜索过程中的文字**：隐藏内部工具调用，但保留各轮文本。这会改变公开回答内容，需要同步设计消息 ID、content index、thinking/signature、usage、非流式结果和历史回放映射。
3. **强制拆成搜索与回答两个阶段**：回答阶段移除内部 helper，从而可以实时输出。但会改变模型执行策略、工具目录、延迟与费用，不能作为透明修复。

推荐先完成首版，不通过制造空 `message_start`、ping 或提前记录首 token 来掩盖正文延迟。

## 7. 验收与回归测试

优先在现有 `single_turn_client_tools_test.go`、`forced_loaded_tool_test.go`、`tool_search_native_cli_test.go`、`runner_lifecycle_test.go` 和 `response_stop_test.go` 中扩展相关用例，避免独立铺设大量测试文件。

### 7.1 增量时序必须验证

模拟上游发送一个非空 `text_delta` 后等待测试端释放信号：

1. 上游保持未完成，不发送后续 block_stop 或 message_stop。
2. 客户端必须在释放信号之前读到该非空 text_delta。
3. 测试端确认收到后，再允许上游继续。
4. 设置有界超时与取消，失败时释放所有阻塞端。

同样覆盖客户端 `input_json_delta`。不能仅检查最终输出相等、HTTP Header 已返回或 Recorder.Flushed。

### 7.2 必测用例

- 原生客户端 ToolSearch + beta/延迟加载工具，输出普通文本时提前送达。
- 原生客户端 ToolSearch 的工具调用交还客户端，参数逐段送达，不在 Worker 执行。
- 原生探测失败、降级为 MCP 同名工具后，不能误用原生客户端归属判断。
- forced loaded 场景直通；deferred/implicit/safeguards 等已有排除场景仍不放行。
- 真正的内部搜索：搜索前的 text/thinking 和内部 tool_use 都不公开。
- 内部搜索多轮与 usage 汇总行为保持。
- 仅有文本前缀时，不能宣告本轮一定公开。
- `message_stop` 恰好一次；正常、tool_use、max_tokens、refusal 等已有终止行为保持。
- 首次输出后发生 CLI 错误：按已有流式错误路径处理，不重试并拼接第二条回答。
- 客户端取消及时停止读取与进程。
- 流式组装结果与非流式结果一致，后续携带 tool_result 的历史恢复仍正确。

### 7.3 真实 CLI 与发布核验

首版单元测试通过后，使用仓库支持的真实 CLI 和本地延迟 SSE fixture 验证，不依赖付费模型请求。

部署测试 Worker 后，通过完整网关链路重复增量时序验证；核对实际 Worker 镜像/CLI 版本和有效工具映射。上线前不能用本地通过代替部署链路证据。

## 8. 观测与作用范围

若需要诊断字段，复用已有 requestDiagnostic，记录一次最终原生映射后的发送模式与缓冲原因即可；不新增数据库迁移或按 token 刷屏的日志。

排查请求时分别确认：

- Worker 是否在收到 CLI 增量后立即写出。
- 核心是否在收到 Worker 增量后立即转发。
- 客户端是否在上游完成前收到非空内容。

此前报告提及的 helper history、资源/credit 等代码不能直接当作当前请求的触发原因。当前 native admission 对 helper history 以及部分资源/credit 功能有明确拒绝路径；需先确认可达性。若实际部署启用了外层整包缓冲，单改引擎不会绕过它。

当前 `FirstTokenMs` 是首个带数据 SSE 事件的计时。首版不改这个指标定义，验收以真实非空内容送达为准。

## 9. 预期改动范围

- 业务代码主要涉及 `runner_config.go` 与 `history_alignment.go`。
- 复用 `runner_session.go` 和 `main.go` 已有事件发送、完成与错误路径。
- 在相关现有测试文件增加时序与工具归属回归。
- 不引入依赖、公开请求参数、数据库表或新的 SSE 消息格式。

## 10. 本次设计验证结果

已运行现有的客户端原生 ToolSearch 归属测试、forced loaded 准入和执行边界测试，以及日志包装层 Flush 测试，全部通过。

另用临时离线探针核实了当前实现：

| 请求 | 完整 ToolSearch 调用被判为内部轮次 | 当前整轮缓冲 |
|---|---|---|
| 客户端拥有原生 ToolSearch | 否 | 是 |
| 客户端工具同名但走 MCP 映射 | 是，指独立的原生 ToolSearch 调用 | 是 |
| forced loaded 客户端目录 | 否 | 是 |
| 真正的内部工具搜索 | 是 | 是 |

探针还确认：同一个文本前缀，在追加原生内部 ToolSearch 调用后会被判定为隐藏轮次。这验证了不能依靠文本前缀提前放行。

临时探针测试已清理。以上测试证明当前判断不一致和方案边界，不代表拟议修复已经通过真实 CLI 或端到端时序验收。

本方案验证的是修复边界与可实施性，尚未声称完成业务修复或线上验证。
