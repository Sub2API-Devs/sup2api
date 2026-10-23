# CCGateway 请求日志 · 界面查看

2026-10-23。第 11 节的建议已全部确认（“按你的建议来”），实施记录见第 12 节。前置：[REQUEST-LOG-LEVELS-DESIGN.md](REQUEST-LOG-LEVELS-DESIGN.md)（core 0.1.180 / ccgateway 0.1.81 已上线）。

界面原型：[REQUEST-LOG-VIEWER-UI.html](REQUEST-LOG-VIEWER-UI.html)。

## 1. 现状

- 日志只在 Worker 容器的 `/work/data/request-logs/<随机 uuid>/` 里，查看要 `docker exec`。
- 核心只能拿到开关状态和占用（`request_logs.go`："日志内容不经过核心"），这是之前有意的决定。这次要改的就是这一条。
- 用量记录里的 `request_id` 与 Worker 日志对不上：
  - 核心有自己的 `rid`（`pipeline.go`，24 位十六进制），通过 `RequestMeta.request_id` 交给插件；
  - 插件 `BuildUpstreamRequest` 只转发 `anthropic-*` 和 `x-claude-code-*`，没有带 `rid`；
  - Worker 收不到 `X-Request-ID`，就自己生成一个 uuid。31 号线上最新一条日志可以证实这一点。
- 控制器的路由是整串匹配（`ROUTE.fullmatch(self.path)`），带查询串的路径会被拒绝；`admin/request-logs` 只放行 GET 和 PUT。
- 核心转发账号接口时，响应最多读 64 KiB（`accounts.go`）。日志内容需要另设上限。

## 2. 目标与边界

- 在「部署与运行 → 账号容器」里按账号查看日志：先看列表，再看单条详情。
- 摘要级别能看到的：元数据、事件时间线、遮蔽后的请求头和响应头。
- 完整级别另外能看正文：请求体、组装结果、CLI 输出、响应和 SSE。正文要单独授权，每次查看都记审计。
- 从用量记录直接跳到对应的日志。
- **不做**：
  - 跨账号的全局搜索；
  - 正文全文搜索；
  - 在界面上修改或删除单条日志（只保留现有的“删除完整内容”）；
  - 把日志复制到核心数据库。日志仍然只存在 Worker 上，过期规则不变。

## 3. 关联请求 ID

- 插件在 `BuildUpstreamRequest` 里加一个头：`x-request-id: <meta.request_id>`。核心的 `rid` 满足 Worker 的 `sessionName` 格式，Worker 直接用它作为 `request_id`，响应头 `request-id` 也会变成同一个值。
- 同一请求在同一账号上重试，会产生多条日志，`request_id` 相同、目录不同。列表里按时间排列，标注“第 n 次”。
- 换账号重试时，日志分别在各自账号的 Worker 上，互不影响。
- 升级前的日志用的是随机 ID，按 `request_id` 找不到。界面上提示“未找到：可能是升级前的记录，或已过期”。
- 测试请求（`BuildTestRequest`）没有 `RequestMeta`，仍用 Worker 自己生成的 ID。列表里标“测试”。

## 4. Worker 接口

控制器不接受查询串，所以列表和读取都用 POST，过滤条件放在 JSON 请求体里。读取正文用 POST 还有一个好处：不会被中间层缓存。

```text
POST /admin/request-logs/query
  ← {"limit":50, "before":"<游标>", "request_id":"…", "status":"error|ok|active",
     "model":"…", "level":"summary|full", "since":"RFC3339", "until":"RFC3339"}
  → {"items":[{"id":"<目录 uuid>","request_id":"…","time":"…","duration_ms":…,
               "status":200,"stage":"…","model":"…","stream":true,"log_level":"full",
               "error_type":"…","log_status":"complete|truncated","test":false,
               "has_content":true,"bytes":…}],
     "next":"<游标>|null", "active":[{"request_id":"…","started":"…","stage":"…"}]}

POST /admin/request-logs/detail
  ← {"id":"<目录 uuid>"}
  → {"metadata":{…}, "events":[…最多 2000 条…], "events_truncated":false,
     "request_headers":{…}, "response_headers":{…},
     "files":[{"name":"request.body","bytes":…,"kind":"request|build|cli|upstream|response|other"}]}

POST /admin/request-logs/read
  ← {"id":"…", "name":"request.body", "offset":0, "length":1048576, "download":false}
  → 原始字节（application/octet-stream）
    头：X-Log-File-Size、X-Log-Offset、X-Log-Length
```

- **索引**：
  - Worker 启动时扫描一次所有目录的 `metadata.json`，在内存里建索引。每条约 300 字节，一周几万条也就几 MB。
  - `finish()`、清理和“删除完整内容”时同步更新索引。
  - 查询不再逐个读文件；按时间倒序分页，游标是“时间 + 目录 id”。
- **进行中的请求**：从 `store.active` 读，只给 `request_id`、开始时间和阶段。
- **文件名校验**：`name` 必须匹配 `^[a-z0-9][a-z0-9._-]{0,127}$`，而且确实是该目录下的普通文件（用 `os.Root` 打开，不跟随符号链接）。`id` 必须是 uuid，并且在索引里存在。
- **摘要级别的文件**：`detail` 里只列出 `summaryFiles` 中的文件。`read` 也只能读正文文件，摘要文件已经在 `detail` 里解析好了，不需要单独读。
- **上限**：
  - `read` 每次最多 1 MiB；
  - `download:true` 时一次流式返回整个文件（单条请求本身就不超过 64 MiB）；
  - `detail` 的事件最多 2000 条，超过的部分截断并标注。
- **级别为关闭时**：三个接口都返回 409 `request_logs_off`（关闭时日志已经删除）。
- 内容都是写入时已经遮蔽过的（`safeHeaders`、`redactCaptureLocked`），读取时不再加工，原样返回。

## 5. 控制器

`ROUTE` 增加三个子路径，只放行 POST：

```text
admin/request-logs/(query|detail|read)
methods: {'admin/request-logs': ('GET','PUT'),
          'admin/request-logs/query': ('POST',), 'admin/request-logs/detail': ('POST',),
          'admin/request-logs/read': ('POST',)}
```

- 请求体沿用现有的大小上限。
- `read` 的响应体按流转发，不在控制器里缓存。
- 与其他管理接口一样，只在读取账号状态的那一刻持有 `guard`，转发和流式返回都不持有。

## 6. 核心

界面使用 REST 风格的 GET 接口，由核心翻译成 Worker 的 POST：

```text
GET /system/ccgateway/accounts/:id/request-logs/requests?limit&before&request_id&status&model&level&since&until
GET /system/ccgateway/accounts/:id/request-logs/requests/:log
GET /system/ccgateway/accounts/:id/request-logs/requests/:log/files/:name?offset=0          （1 MiB 一段）
GET /system/ccgateway/accounts/:id/request-logs/requests/:log/files/:name?download=1        （附件下载）
```

- **参数校验**：在核心先校验一遍（与 Worker 相同的规则），不合格直接返回 400，不转发。
- **响应上限**：
  - 列表 512 KiB，详情 2 MiB；
  - 文件分段 1 MiB + 少量余量；
  - 下载按流转发，不经过内存缓存，最多 64 MiB。
- **响应头**：
  - 所有响应都加 `Cache-Control: no-store`；
  - 文件响应加 `Content-Type: application/octet-stream`、`X-Content-Type-Options: nosniff`；
  - 下载加 `Content-Disposition: attachment; filename="<账号>-<request_id>-<name>"`。
- **权限**：见第 7 节。
- **审计**：读取正文（分段读取和下载）记一条 `ccgateway.account.<id>.request-logs.read`（与级别修改的 `ccgateway.account.<id>.request-logs` 同一命名方式），内容包括日志 id、文件名、偏移、长度和是否下载，不记录正文本身。同一个人对同一个文件连续翻页，10 分钟内只记一次。列表和详情不记审计。

## 7. 权限

日志正文是平台用户的对话内容，不是账号创建者的数据，所以权限按内容的敏感程度来分：

| 能看什么 | 需要的权限 | 说明 |
|---|---|---|
| 列表、详情（元数据、事件、遮蔽后的头） | `settings:read` 或 `account:read` | 与现在读取开关状态的权限一致，但**不包括** `account:own:read`（见第 11 节问题 2） |
| 正文分段读取与下载 | 只有 `settings:manage` | 账号编辑权限不够 |

界面按权限隐藏对应的入口。后端以核心的校验为准。

## 8. 界面

### 8.1 入口

- **账号容器**：在每一行的“请求调试日志”列里，级别控件旁边加一个按钮“查看日志（n）”。n 是 GET 状态里的 `usage.requests`。点击后打开右侧抽屉 `SDrawer`，宽度 960px。
- **用量记录**：`UsageDetail.vue` 的请求 ID 后面加一个链接“请求日志”。只有该记录的账号是 CCGateway 平台时才显示。点击后打开同一个抽屉，带上 `request_id` 过滤，并直接进入详情；如果有多条重试，显示列表。

### 8.2 列表

```text
账号 #31 · 请求日志                        级别：摘要  保留 7 天 · 已用 3.2 MiB / 128 MiB   [×]
[时间范围 ▾] [状态：全部|成功|失败|进行中] [模型 ▾] [级别：全部|摘要|完整] [请求 ID ______]  [刷新]
────────────────────────────────────────────────────────────────────────────────
时间            请求 ID         模型               状态     阶段         耗时    级别    大小
10-23 10:42:13  3f9a…c1  ⧉     claude-sonnet-4-6  200      finished     4.2s    完整    1.8 MiB
10-23 10:41:57  3f9a…c1  ⧉ ②   claude-sonnet-4-6  529 过载  upstream     0.9s    完整    0.4 MiB
10-23 10:40:02  b07e…9d  ⧉     claude-opus-4-1    400      parse_request 12ms   摘要    3 KiB
● 进行中 1：e11c…02 · upstream · 已 18s
                                                              [加载更多]
```

- 使用 `STable`，点击一行进入详情。
- “进行中”显示在表格上方，不能点进去。
- 失败行把 `error_type` 显示成徽章，鼠标悬停显示 256 字以内的错误文字。
- 截断的日志（`log_status=truncated`）显示“已截断”标记。
- 分页是“加载更多”，用游标实现，不做页码。

### 8.3 详情

```text
← 返回列表   请求 3f9a…c1 ⧉   200 · 4.2s · claude-sonnet-4-6 · 流式 · 完整
[概览] [事件 (37)] [请求头] [响应头] [正文 (6)]
```

- **概览**：用 `SDescriptions` 展示 `metadata.json` 里的常用字段，包括请求 ID、时间、阶段、状态、错误、模型、消息数、beta、执行方式、历史模式、截断情况。其余字段收在“全部字段”下，以 JSON 显示。
- **事件**：时间线，每条显示相对开始的毫秒数、事件名和 detail 的单行预览，点击展开完整 JSON。顶部可以按事件名过滤。
- **请求头 / 响应头**：用 `SKeyValue` 展示，遮蔽过的值显示成灰色的 `[redacted]`。
- **正文**（只有完整级别并且有 `settings:manage` 权限才显示）：
  - 左侧是文件列表，按类别分组：请求（`request.body`）、组装（`build-components.json`、`effective-config.json`、`feature-decisions.json` 等）、CLI（`cli-stdout.jsonl`）、上游（`upstream*`）、响应（`response.body`）、其他。每个文件显示大小。
  - 右侧是查看器：
    - JSON 默认格式化，可以切换到原文；
    - JSONL 每行一个可折叠的块；
    - 如果 `response.body` 是 SSE，按事件拆开显示，也可以切换到原文；
    - 其他内容按纯文本显示，二进制内容显示十六进制预览。
  - 先读第一段 1 MiB，底部有“继续加载（已显示 1 MiB / 共 3.4 MiB）”。超过 1 MiB 的 JSON 只能显示原文，不做格式化。
  - 工具栏：复制当前已加载的内容、下载完整文件、自动换行开关。
  - 第一次打开正文时，显示一次提示：“正文包含用户对话内容，查看会记入审计。”
- 摘要级别的日志没有“正文”标签，改为一行提示：“摘要级别不保存正文；需要时在账号容器里临时开启完整级别。”

### 8.4 显示安全

- 所有内容都用文本节点渲染（`SCode` 或 `<pre>`），**不使用 `v-html`**，也不把内容里的链接或 Markdown 转成可点击元素。
- 复制和下载都使用后端返回的原始字节。
- 关闭抽屉后释放已经加载的正文，不缓存到本地存储。

## 9. 旧版本兼容

- **旧 Worker**（没有 `/admin/request-logs/query`）：核心收到 404 或 405 后返回 `request_log_viewer_unsupported`，界面隐藏“查看日志”入口。判断依据是 GET 状态里新增的 `viewer: true` 字段。
- **旧核心配新插件**：新增的 `x-request-id` 头只影响 Worker 记录的 ID，不影响其他功能。
- 发布顺序：先发插件（Worker、控制器、插件代码），再发核心，与之前的流程一致。

## 10. 测试

- **Worker**：
  - 索引的建立、更新和清理；
  - 游标分页、过滤条件；
  - 文件名和 id 的校验：路径穿越、符号链接、不存在的文件；
  - 摘要级别不能读正文；
  - 级别为关闭时返回 409；
  - 读取 1 MiB 边界、下载。
- **控制器**：三个子路径只接受 POST；GET、PUT、带查询串的请求都被拒绝。
- **核心**：
  - 参数校验；
  - 权限：`account:own:read` 看不到列表，`account:update` 读不了正文；
  - 审计去重；
  - 响应上限；
  - 下载按流转发，不进内存。
- **插件**：`x-request-id` 等于 `meta.request_id`。
- **界面**：mock 数据；整页截图（列表、详情的各个标签、摘要日志、超大文件、SSE）。
- **线上**：在 31 号临时开完整级别，发一条 `ccg-audit-` 请求，然后验证：
  - 从用量记录能跳到这条日志；
  - 能看到正文，并且记了审计；
  - 切回摘要后发的请求没有正文标签。

## 11. 确认结果（按建议）

1. **方向**：是否同意让日志内容经过核心显示在界面上（之前的设计是“内容不经过核心”）？建议同意，正文单独授权并记审计。
2. **列表和详情的权限**：建议 `settings:read` 或 `account:read`，**不给** `account:own:read`。理由是事件和请求头里有平台用户的 ID（`x-ccgateway-session-scope`）和错误原文。还是放宽到账号创建者也能看？
3. **正文的权限**：建议只有 `settings:manage`。
4. **用量记录跳转**：是否加这个入口？需要插件转发 `x-request-id`，发布后才生效，之前的记录对不上。建议加。
5. **下载**：是否允许下载完整文件？建议允许，同样只限 `settings:manage`，并记审计。
6. **抽屉还是独立页面**：建议用抽屉，不新增路由。从用量记录过来时也是打开同一个抽屉。

## 12. 实施（2026-10-23）

- **插件**：`BuildUpstreamRequest` 加 `x-request-id: <meta.request_id>`（格式不对就不带，客户端自己的 `x-request-id` 从不转发）。
- **Worker**（`engine/request_log_viewer.go`）：
  - 索引：启动时扫描 `metadata.json` 建立，`finish()` 时加入，清理（`prune`，每分钟和请求开始时）删掉被清理的条目，关闭时清空。升级前没有 `log_level` 的日志算完整。
  - `detail` 的 `content:false` 把事件里的文字截到 256 字节；只有核心确认调用者有 `settings:manage` 时才发 `content:true`。
  - `read` 用 `os.Root` 打开文件并 `Lstat`，符号链接和目录外的路径都读不到；文件在锁内打开，锁外发送。
  - 找不到用 `request_log_not_found`，与旧 Worker 的 `not_found_error` 区分开，核心据此判断是“日志不存在”还是“Worker 不支持”。
  - GET 状态多一个 `viewer: true`。
- **控制器**：`ROUTE` 加 `request-logs/(query|detail|read)`，只放行 POST；`read` 的 `X-Log-*` 和 `X-Content-Type-Options` 头原样转发。
- **核心**（`request_log_viewer.go`）：三个 GET 路由；查询参数和返回内容逐项校验，未知参数 400，Worker 返回的未知字段丢弃；请求头和响应头里的密钥字段再遮蔽一次；文件读取校验 `X-Log-*` 与请求一致后按 `Content-Length` 流式转发；审计按“用户 + 账号 + 日志 + 文件 + 是否下载”10 分钟去重（每个节点各自去重）。
- **界面**：`RequestLogViewer.vue`（抽屉：列表、详情）、`RequestLogContent.vue`（正文）、`requestLogViewer.ts`（接口和格式化）。JSONL/SSE 最多显示 500 个块，其余看原文；超过 1 MiB 的 JSON 只显示原文。
- **测试**：Worker 6 个、核心 5 个、控制器 2 个、插件 1 处、界面 4 个；mock 加了列表、详情、正文和两条 CCGateway 用量记录（一条重试两次，一条直接进详情）。
