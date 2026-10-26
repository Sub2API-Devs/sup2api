# CCGateway 请求日志 · 记录最终上游请求

2026-10-26 用户提出：要对比“进入网关的请求”和“最终发给 Anthropic 的请求”，日志结构要方便搜索。**核心不记录任何日志**，记录只发生在账号容器里（Worker 与 CLI）。前置：[REQUEST-LOG-LEVELS-DESIGN.md](REQUEST-LOG-LEVELS-DESIGN.md)、[REQUEST-LOG-VIEWER-DESIGN.md](REQUEST-LOG-VIEWER-DESIGN.md)。

## 1. 现状与目标

- 现在 Worker 日志只有核心转来的 `request.body`（完整级别）。最终上游请求由 CLI 在子进程里组装发出（direct、build 都是），不落盘；核心也不留客户原始 body。
- 目标：每个请求多一份“CLI 实际发出的请求”记录——**事实与请求头在摘要级别就有（不含正文）**，**正文字节只在完整级别**；并让这些事实进入日志索引，界面和磁盘上都能按会话、模式、哈希、是否改动搜索。
- 不做：核心侧任何记录；网关进入前（核心模型映射、协议转换、钩子、资源引用）的原值；正文全文搜索。

## 2. CLI 契约（`cli-mods`，能力 `request_capture_v1`）

参数（`claude request` 新增，旧 CLI 不认识会报错，Worker 必须先查能力）：

| 参数 | 含义 |
|---|---|
| `--capture-request <前缀>` | 写 `<前缀>.json`（事实，不含正文） |
| `--capture-body` | 同时写 `<前缀>.body`（发出的正文字节）。没有 `--capture-request` 时报错 |

记录点：`model-request.js` 的 `fetchOverride` 在认证头、beta、build 数字还原都处理完之后、调用 `transportFetch` 之前，用最终的 `url` 与 `init`。

`<前缀>.json`（UTF-8，`JSON.stringify(…, null, 2)`，键顺序固定如下）：

```json
{
  "schema": 1,
  "mode": "direct|build",
  "attempts": 1,
  "sent_at": "RFC3339Nano（最后一次发送）",
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages?beta=true",
  "headers": { "小写名": "值", "…": "按名字排序；authorization/proxy-authorization/x-api-key/cookie 的值为 [REDACTED]" },
  "body_encoding": "identity|<content-encoding 值>|binary",
  "body_bytes": 12345,
  "body_sha256": "64 位小写十六进制（发出的字节）",
  "content_sha256": "去掉末尾空白（空格、制表、换行、回车）后的哈希；正文是编码过或读不出的字节时为空串",
  "model": "body 里的 model（读不出为空串）",
  "stream": true
}
```

**记录点之后还有两处变化，记录里没有**（读原生 `chunk-38xgev2z.js` 的 `cy`/`mle` 得到）：发给 api.anthropic.com、正文不少于 4096 字符、不经代理/unix socket/mTLS 时，原生 `cy` 在记录点**之前**给正文末尾加 `\n` 和 0–256 个随机空白（所以记录里有这段尾巴）；之后运行时可能 gzip 压缩并加 `Content-Encoding`（记录点**之后**，所以记录里没有）。因此“是否改动”比较的是 `content_sha256`，不是 `body_sha256`。

- 请求头取最终 `init.headers`（`Headers` 或对象都要支持），名字一律小写；重复值按 fetch 的合并结果（逗号连接）。
- body 是字符串：按 UTF-8 编码后的字节计算与写入。不是字符串（`Uint8Array`/`ArrayBuffer`）：按原字节；有 `content-encoding` 头就 `body_encoding` 取其值且 `model`/`stream` 留空。其他类型（流）：`body_encoding: "binary"`、`body_bytes: -1`、不写 `.body`。
- 同一次命令里 `fetchOverride` 被调用多次（如 SDK 内部重发），每次覆盖文件，`attempts` 递增。
- 不阻塞发送：写文件的 Promise 与 `transportFetch` 并行，命令退出前（`runRequestCommand` 的 `finally`）等待全部写完。写失败吞掉，不影响请求、不改退出码。
- 文件权限 0600，用 `wx` 以外的覆盖写（同名多次）。

## 3. Worker 契约（`engine`）

**传参**：CLI 有 `request_capture_v1` 且本请求日志不是关闭（`d.directory != ""`）时传 `--capture-request <请求临时目录>/sent`；再满足“完整级别（`!d.summaryOnly`）且非凭据安全模式（`!d.secretCapture`）”才加 `--capture-body`。

**落盘**（CLI 结束后、删除临时目录前；读取有上限：`.json` 256 KiB，`.body` 不超过单请求剩余预算）：

| 日志文件 | 来源 | 级别 |
|---|---|---|
| `upstream-request.json` | `sent.json` 原文 | 摘要文件（加入 `summaryFiles`） |
| `upstream-request.body` | `sent.body` 原字节 | 正文（完整） |

应抓却没有 `sent.json`（CLI 在发送前失败的除外：没到发送阶段的请求本来就没有）时记事件 `upstream_capture_missing`。

**metadata.json 新增扁平字段**（摘要级别也有；全部是标识或摘要，不含正文；方便 `grep`）：

| 字段 | 值 |
|---|---|
| `mode` | `direct` / `build`（每个请求都写，与是否抓取无关） |
| `client_session_id` | 客户端 `metadata.user_id` 里的 session_id，没有则取 `x-claude-code-session-id` 请求头；都没有不写 |
| `upstream_captured` | 是否有 `upstream-request.json` |
| `upstream_attempts` | 同名事实 |
| `upstream_model`、`upstream_stream` | 同名事实 |
| `upstream_body_bytes`、`upstream_body_sha256` | 发出正文的大小与哈希 |
| `upstream_content_sha256` | 发出正文去掉末尾空白后的哈希 |
| `upstream_session_id` | 发出的 `x-claude-code-session-id` |
| `upstream_request_class` | 发出的 `x-claude-code-request-class` |
| `upstream_betas` | 发出的 `anthropic-beta` 拆成数组（最多 64 项） |
| `body_changed` | 收到的正文与发出的正文**内容**是否不同：两边都去掉末尾空白再比哈希（Worker 在算 `body_sha256` 的同一遍里算出收到正文的内容哈希）；CLI 没给内容哈希时按字节比。build 会重新组装，几乎总是 true，所以界面只在 direct 显示“已改写” |

`upstream_captured`：CLI 不支持或确实发出了却没记录到时为 `false`；发送前就失败（输入错误、登录被拒）的请求不写这个字段，界面不把它当成漏记。`mode` 在策略头校验之后写，策略头非法被拒的请求没有。凭据安全模式下 `upstream-request.json` 是脱敏后重新序列化的副本，不再逐字节等于 `sent.json`。上游正文在响应正文之后存，大请求配大响应时可能因 64 MiB 单请求预算被截。

字符串一律经 `logValue`（256 字节）截断；会话 ID 只接受 `[A-Za-z0-9_-]{1,128}` 形状，否则不写。

**索引与查询**（`/admin/request-logs/query`）：

- `logEntry` 增加 `mode`、`client_session_id`、`upstream_session_id`、`body_sha256`、`upstream_body_sha256`、`body_changed`（`*bool`）、`upstream_captured`。
- 查询体增加：`mode`（`direct|build`）、`session_id`（等于 client 或 upstream 任一）、`sha256`（64 位十六进制，转小写；等于收到正文、发出正文或发出内容三个哈希中任一）、`changed`（JSON 布尔，只匹配有 `body_changed` 的条目）。
- 列表项把上面这些字段带回去。
- detail 无论是否带正文都返回 `upstream_request`（`upstream-request.json` 解析成的对象；其 `headers` 是“名字 → 字符串”，与 `request_headers` 的“名字 → 字符串数组”不同）。
- GET 状态多一个 `"viewer_search": true`：核心和界面据此决定是否提供新筛选（旧 Worker 的查询解码 `DisallowUnknownFields`，收到新键回 400）。
- `logFileKind`：`upstream-` 开头归 `upstream`。

## 4. 核心（只转发，不记录）

`server/internal/ccgateway/request_log_viewer.go`：

- 列表查询参数增加 `mode`、`session_id`、`sha256`、`changed`，校验规则同 Worker；只在给出时转发。核心不预先查 Worker 状态：旧 Worker 收到新键回 400 时，核心答 503 `request_log_search_unsupported`（界面本来只在 `viewer_search` 时显示新筛选）。
- 读取正文仍记原有的访问审计（谁读了哪个文件），这是查看权限的一部分，不是请求日志。
- 列表项增加第 3 节的字段（校验形状，不认识的值丢弃）。
- 详情：`upstream-request.json` 是摘要文件，不出现在正文文件列表；Worker 在 detail 里返回 `upstream_request`（对象），核心对其中 `headers` 的密钥字段再遮蔽一次后透传。
- 状态接口透传 `viewer_search`。

## 5. 界面

- 筛选栏：模式（全部/direct/build）、会话 ID、SHA-256、是否改动（全部/改动/未改动）。只在状态有 `viewer_search` 时显示。
- 列表：增加“模式”列；`body_changed` 为真时在模式旁显示“已改写”徽标，未抓到时显示“未记录上游”。
- 详情：新增“上游请求”标签：方法、URL、发送次数、正文大小与 SHA-256（可一键复制、一键按此筛选）、上游请求头（遮蔽值灰显）、模型/流式/betas/会话/请求类别。会话 ID 与 SHA-256 旁有“按此筛选”。
- 正文：`upstream-request.body` 归入“上游”组。

## 6. 磁盘上的搜索

```sh
# 某个客户会话的全部请求（客户端或上游会话都行）
grep -l '"client_session_id": "SESSION"' /work/data/request-logs/*/metadata.json
# 正文被改写过的请求
grep -l '"body_changed": true' /work/data/request-logs/*/metadata.json
# 按发出正文的哈希找
grep -l 'SHA256' /work/data/request-logs/*/upstream-request.json
```

## 7. 发布

CLI v31（2.1.304 / ccgateway-v31-request-capture）+ 插件（Worker、控制器）先发；核心后发（新旧组合都能工作，只是旧 Worker 不支持新筛选）。
