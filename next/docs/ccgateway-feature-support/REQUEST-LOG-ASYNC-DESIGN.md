# CCGateway 请求日志：默认可完整、写入不阻塞业务、响应旁路组装

2026-10-26 用户要求：① 默认规则支持“完整”（全局可长期完整保留账号日志）；② 查看日志按 **请求头、请求体、响应头、响应体** 展示；③ 响应体的保留做成**监控模式**：只把响应抄一份，在后台**组装成完整响应后再记录**，不阻塞正常业务；④ **日志不应影响正常业务**。前置：[REQUEST-LOG-POLICY-DESIGN.md](REQUEST-LOG-POLICY-DESIGN.md)、[REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md](REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md)。

## 1. 现状里会阻塞业务的地方（Worker `engine`）

| 位置 | 现在 | 影响 |
|---|---|---|
| `requestDiagnostic.request` → `d.save("request.body")` | 请求开始时同步写盘（最多 32 MiB） | 写完才启动 CLI，首 token 变慢 |
| `d.save("build-components.json")` | 启动 CLI 前同步写 | 同上 |
| `diagnosticWriter.Write` | 每块响应先在请求锁下写 `response.body`，再写给客户端 | 磁盘慢 = 客户端慢 |
| `keepUpstreamRequest`（defer） | 响应写完后同步复制 `sent.body` | 请求结束被推迟 |
| `finish` → `writeMetadata` | 同步写 `metadata.json`、`response-headers.json`、更新索引 | 同上 |
| `appendTrace("events.jsonl")` | 每个事件同步追加 | 散在整条请求路径上 |

## 2. 原则

- **解耦、低嵌入**（用户要求）：日志是独立组件，业务代码只在少数固定点通过一个窄接口通知它（请求开始、交给 CLI 的输入、响应开始、响应字节块、CLI 结束、请求结束）；业务代码里不出现日志级别判断、文件名、预算、锁或组装逻辑，优先用包装器/观察者（nil 即 no-op）。日志与业务互不持有、互不等待对方的锁；日志后台 recover 自己的 panic，任何日志错误都不改变业务的返回值、状态码、响应头和耗时；日志组件为 nil 时业务行为与没有日志完全一致。核心同样：只决定级别、转发查看请求，不在请求处理流程里嵌日志逻辑。
- **请求路径上不做任何日志磁盘 I/O**。请求路径只做两件事：把要记的内容（已在内存的字节、或一份拷贝）放进后台队列；判断级别。
- **队列满了就丢，不等**。被丢的内容在 metadata 记 `log_status: "partial"` 与 `log_dropped_bytes`，并记一条事件（事件本身也可能被丢，丢事件只计数）。业务永远不因日志等待、失败或变慢。
- 日志写盘、组装、索引、清理全部在后台 goroutine 里做；后台出错只影响日志。

## 3. Worker：后台日志写入器（`logSink`）

- 每个 `requestLogStore` 一个写入器：一个有界任务队列 + 一个后台 goroutine（按入队顺序执行，所以同一请求的文件先于它的 metadata 落盘）。
- **内存上限**：在途字节总量上限 128 MiB（原子计数）；入队时超限或队列满 → 丢弃并标记，不阻塞。单请求仍受原有的单请求预算（摘要 256 KiB / 完整 64 MiB）。
- 任务执行时重新检查该请求的日志是否仍有效（`d.directory` 非空、未被关闭/清空/清理），无效就跳过。
- `request.body`：入队的是 `body.raw` 本身（请求已持有、只读，不复制）。`build-components.json` 同理。
- `events.jsonl`：事件序列化后入队追加。
- `finish`：入队一个“收尾”任务（写 `response-headers.json`、组装响应、写 `metadata.json`、更新索引、从 active 移除）；`finish` 本身立即返回。
- 上游请求（`sent.json`/`sent.body`）：`sent.json` 很小（≤ 256 KiB），在请求路径上读进内存后入队写；`sent.body` 在删除临时目录前**打开文件句柄**，把句柄交给后台任务复制后关闭（Linux 上文件被删后句柄仍可读）；Windows 上打不开/删不掉时退化为丢弃该文件并标记（不阻塞）。
- 关闭进程（Runtime 停止）时给后台队列一个有限的排空时间（例如 5 秒），超时丢弃。

## 4. 响应体：旁路监控 + 组装

- `diagnosticWriter.Write`：先把字节写给客户端；然后（不持锁写盘）把这一块**复制一份**入队给该请求的“响应组装器”。入队失败（满/超限）→ 停止该请求的响应采集，标记 `response_capture: "dropped"`。
- 组装器（后台）按 `Content-Type`：
  - `text/event-stream`：解析 SSE，按 Anthropic 事件还原成**一条完整的 Messages 响应 JSON**：`message_start` 的 message 为底，`content_block_start/delta/stop` 依次拼出每个块（`text_delta` 拼文本，`input_json_delta` 拼 `partial_json` 后解析为 `input`，`thinking_delta`/`signature_delta` 拼 thinking 与 signature，`citations_delta` 追加引用，未知块与未知 delta 原样保存在 `ccgateway_unparsed`），`message_delta` 合入 `stop_reason`/`stop_sequence`/`usage`；`error` 事件记为 `error`；`ping` 忽略。
  - `application/json`：原样就是完整响应。
  - 其他（或解析失败）：保留原始字节。
- 收尾时写 **`response.json`**（组装后的完整响应，JSON）；只有无法组装时才写 `response.body`（原始字节，受预算）。**不再保存原始 SSE 流**。另在 metadata 记 `response_assembled: true|false`、`response_events`（事件个数）。
- 组装器内存受单请求预算约束，超出即停止并标记截断。
- 凭据安全模式（fallback-credit、含令牌的请求）仍不保存响应正文。

## 5. 查看日志：四部分

详情改为按内容分区（文件名不变，界面按类别展示）：

| 区 | 内容 | 来源文件 |
|---|---|---|
| 请求头 | 进入 Worker 的请求头（遮蔽） | `request-headers.json`（摘要文件） |
| 请求体 | 核心转来的请求正文 | `request.body`（完整） |
| 上游请求 | CLI 发出的请求头与正文 | `upstream-request.json`（摘要）/`upstream-request.body`（完整） |
| 响应头 | Worker 回给核心的响应头 | `response-headers.json`（摘要文件） |
| 响应体 | 组装后的完整响应 | `response.json`（完整；旧日志是 `response.body`） |

Worker `logFileKind`：`response.json` 归 `response`。

## 6. 默认规则支持“完整”

- `Config.RequestLogs.level` 接受 `off|summary|full`；默认为 `full` 时长期有效（不需要时长），仍受 Worker 的保留期（完整 24 小时）与预算（512 MiB）约束，超出按最旧清理。
- 账号设置不变：跟随 / 关闭 / 摘要 / 完整（1/4/24 小时）。
- 界面默认规则改为 关闭 / 摘要 / 完整，选完整时提示“所有跟随默认的账号都会保存请求与响应正文”。

## 7. 验收

- 单测：入队永不阻塞（队列满、超限、后台卡住时请求照常完成且耗时不变）；SSE 组装（文本、工具调用、thinking+signature、citations、错误事件、截断、未知事件）与非流式；收尾顺序（metadata 最后）；清空/关闭/清理与后台任务竞争；凭据安全模式不存响应。
- 离线回归：出口 0 差异；上游记录完整；`response.json` 与客户端收到的流组装结果一致（核对脚本对比）。
- 性能：同一请求在完整级别与关闭级别下，Worker 处理耗时（`duration_ms`、首字节时间）无可测差异。
