# CCGateway 控制器行为规格（Go 重写的兼容基准）

日期：2026-11-01。状态：只读整理，没有改任何代码。

基准：ccgateway 0.1.118 的 Python 控制器，即 `next/plugins/ccgateway/companions/controller/` 在提交 `7a72fd342`（该目录最后一次改动）时的生产代码、196 项单元测试、`controller/README.md`、`companions/README.md`，以及 CONTRACTS §49、§53、§57。核心侧调用方以 `next/server/internal/ccgateway/` 为准，用来判断每个应答字段"核心使用 / 未使用"。

配套文档：[CCGATEWAY-GUARD-DESIGN.md](../CCGATEWAY-GUARD-DESIGN.md)（guard 与控制器降权设计）。

## 0. 怎么读

- **用途**：Go 版控制器必须逐条保持本文的行为，才能做到三件事：核心不改一行代码就能对接；Worker 协议不变；插件可以回滚到 Python 版 0.1.118，回滚后它能直接接手 Go 版写下的磁盘状态和 Docker 资源。
- **条目编号**：每条行为有一个编号（如 `H3`、`PV5`），第 14 节的"测试 → 条目"对照表和第 15 节的缺陷表都引用这些编号。前缀含义：

  | 前缀 | 范围 | 前缀 | 范围 |
  |---|---|---|---|
  | E | 进程与启动 | PV | 准备容器（provision） |
  | H | HTTP 通用约定 | Y | 就绪判定与状态查询 |
  | R | 端点 | BL | 阻断 |
  | T | 隧道与透传 | D | 删除 |
  | S | 磁盘状态 | W | 原地更新 Worker |
  | M | 内存状态 | P | Worker+CLI 成对激活 |
  | B | 后台循环与定时 | G | 共享网关 |
  | K | 锁与并发 | N | 网段分配与规则生成 |
  | A | 下发配置（apply） | U | 分块上传与导入 |
  | I | 目标镜像 | C | 控制器自升级 |
  | X | 孤儿清理 | Q | 代理域名复查 |
  | O | Docker 资源规格 | V | 输入校验 |
  | EV | 环境变量 | RB | 回滚兼容 |

- **出处**：`文件:行号`。没有目录前缀的文件都在 `next/plugins/ccgateway/companions/controller/` 下；`core:` 前缀表示 `next/server/internal/ccgateway/`。
- **"核心使用"**：以对核心非测试代码的 grep 为准（2026-11-01）。"未使用"的字段 Go 版仍应照样返回：控制台排障、人工脚本和回滚后的旧核心可能会读。
- **符号**：`<root>` 为 `CCG_RUNTIME_ROOT`，`<p>` 为前缀 `CCG_RUNTIME_PREFIX`（默认 `ccg`），`<key>` 为运行环境 key（账号 id 或草稿 key），"账号锁"为 `Manager.guard(key)` 返回的那把 RLock。

---

## 1. 进程与启动（E）

| 编号 | 行为 | 出处 |
|---|---|---|
| E1 | 入口 `python manager.py`：`umask 077`；日志写 stderr，级别 INFO，格式 `%(asctime)s %(levelname)s %(name)s %(message)s`；`CCG_CONTROLLER_KEY` 必须存在（缺失抛 KeyError 退出），少于 32 个字符则退出（`controller key must contain at least 32 characters`）；**只监听 `127.0.0.1:<CCG_CONTROLLER_PORT>`**（`int()` 解析，默认 8787）；`ThreadingHTTPServer`，每个连接一个守护线程；先绑定端口，再构造 `Manager(CCG_RUNTIME_ROOT, CCG_APP_IMAGE, CCG_EGRESS_IMAGE, CCG_RUNTIME_PREFIX 或 'ccg')`；然后启动两个后台线程 `shared.run`（B1）和 `watch_proxies`（B2），最后 `serve_forever` | `manager.py:1057-1072` |
| E2 | `Manager.__init__` 的顺序：前缀必须匹配 `[a-z][a-z0-9-]{0,24}`，否则 `ValueError`；读环境变量并校验（E5）；`<root>` 取 `Path(root).resolve()`（解析符号链接），`mkdir(0700, parents)` 后强制 `chmod 0700`；打开 `<root>/.lock`（`'w'` 模式，会截断）并 `flock(LOCK_EX|LOCK_NB)`，**同一状态目录已有另一个控制器时启动失败**；Docker 客户端超时 60 s；`probe_url` 默认 `https://www.gstatic.com/generate_204`（只能由构造参数改，没有环境变量）；恢复目标镜像（I3）；建 `Uploads`，它用另一个超时 1800 s 的 Docker 客户端（`LOAD_TIMEOUT`） | `manager.py:161-186` |
| E3 | `main` 在启动线程前访问 `manager.shared`，因此**启动时就构造 `SharedEgress`**：`mkdir <root>/shared-egress (0700)`；读 `shared-egress/state.json`，不存在时在内存里建 `{"schema":1,"salt":<64 位 hex>,"bindings":{},"nodes":{}}`（第一次 `save()` 才落盘）；`schema != 1` 抛 `RuntimeError`，JSON 损坏抛 `ValueError`，两种情况控制器都退出；网关镜像取 `CCG_XRAY_IMAGE`，没有则取当时的 `manager.egress_image`（之后不再变，见缺陷 BUG-4） | `shared_egress.py:111-129`、`manager.py:225-230,1070` |
| E4 | 每个连接的 socket 超时 240 s（空闲的 keep-alive、读请求体、写应答都受它约束；隧道建立后改为 3700 s，T7）；协议 `HTTP/1.1`；不写访问日志（`log_message` 为空：请求里可能有 OAuth 材料） | `http_api.py:52-60` |
| E5 | 启动时校验的环境变量（失败即 `ValueError` 退出）：`CCG_ACCOUNT_DISK_GIB`、`CCG_ACCOUNT_DISK_QUOTA_REQUIRED`、`CCG_CONTROLLER_NAME`；`CCG_CONTROLLER_PORT` 用 `int()` 解析（宽松：接受 `' 8787'`、`'+8787'`，非数字则启动失败）。全表见第 12 节 | `manager.py:188-209` |
| E6 | 应答头里由 Python `http.server` 附带的 `Server: BaseHTTP/0.6 Python/3.12.x` 和 `Date` 是附带产物，核心不依赖，Go 版可以不同 | `http_api.py:84`（`send_response`） |

---

## 2. HTTP 通用约定（H）

| 编号 | 行为 | 出处 |
|---|---|---|
| H1 | **鉴权**：每个请求都要鉴权，包括 `/health` 和隧道。取 `Authorization` 头的值并去掉前缀 `Bearer `（`removeprefix`：**不带前缀的裸密钥也会被接受**），再用 `hmac.compare_digest` 与 `CCG_CONTROLLER_KEY` 做常量时间比较；不符时返回 401 `{"error":"unauthorized"}` 并关闭连接。鉴权在路由之前，所以未知路径不带密钥时也是 401 | `http_api.py:117-119` |
| H2 | **方法**：只处理 GET、POST、PUT、DELETE。其他方法（HEAD、PATCH、OPTIONS 等）由 `http.server` 回 501 HTML 错误页，**不经鉴权**，也不是 JSON | `http_api.py:142` |
| H3 | **路由顺序与原始路径**：用原始请求目标 `self.path`（**含查询串**）做 `fullmatch`，不做任何规范化。顺序：① 精确等于 `/health`；② `UPLOAD_ROUTE` 或 `RUNTIME_ROUTE`；③ `ROUTE`；④ 都不匹配时返回 404 `not_found` 并关闭连接。因此带 `?`、`//`、`..`、结尾 `/`、绝对形式 URL 的请求一律 404（例如 `/health?x=1`、`/accounts/1/status?x=1`） | `http_api.py:120-130` |
| H4 | **路由语法**：`ROUTE = /accounts(?:/(<KEY>)(?:/(config\|status\|connection\|tunnel\|worker\|egress\|admin/(?:status\|usage\|features\|request-logs(?:/(?:query\|detail\|read))?\|cli\|auth/(?:session\|start\|complete\|cancel\|logout\|refresh))))?)?`；`UPLOAD_ROUTE = /images/uploads(?:/([A-Za-z0-9_-]{22})(/load)?)?`；`RUNTIME_ROUTE = /runtime/(images\|controller\|cleanup)`；`<KEY>` 见 V1 | `http_api.py:22-25` |
| H5 | **读请求体**：`Content-Length` 缺省视为 `'0'`；必须完全匹配 `[0-9]{1,12}`（允许前导零，拒绝 `+5`、` 5`、`1_000`）且不超过上限；带 `Transfer-Encoding` 一律拒绝。不合格时返回 400 `invalid_request` 并关闭连接。合格时恰好读 `Content-Length` 个字节。上限：账号路由 32 MiB（`MAX_ACCOUNT_BODY`，除隧道和 `worker` 外**每个账号路由都先读完请求体再分派，GET 也不例外**）；`worker`、上传、目标镜像、自升级为 64 KiB；`POST /runtime/cleanup` 为 8 MiB | `http_api.py:28,99-110,138,261-298,309` |
| H6 | **JSON**：解析失败返回 400 `invalid_request`。例外是 `PUT config`：JSON 坏了按 `desired=None` 交给 `apply`，由 `apply` 回 400 并清掉就绪（A1） | `http_api.py:106-110,171-176` |
| H7 | **成功应答格式**：`Content-Type: application/json`、`Content-Length`、`Cache-Control: no-store`；只有在已决定关闭连接时才加 `Connection: close`。正文为 `json.dumps` 的结果（分隔符 `", "`、`": "`），核心不依赖字节格式 | `http_api.py:82-92` |
| H8 | **连接是否关闭**：<br>· **关闭**：401；路由 404；`/health`（无论成败）；隧道的所有应答；透传的所有应答（T12）；所有经 `answer_error` 发出的错误；上传 / 目标镜像 / 自升级的 405 和 `UploadError`；`worker` 的 405。<br>· **保持 keep-alive**：账号路由的成功应答（`GET /accounts`、`DELETE`、`PUT config`、`status`、`connection`、`egress`）；账号路由用 `fail()` 直接发出的 405 和 409（`not_synchronized`、`api_key_account`）；上传、目标镜像、清理、`worker` 的成功应答（上传 PUT 恰好读完 `Content-Length` 字节，"连接仍可用"） | `http_api.py:74,94-97,118,121,130,229,251,272,278,285,298,307,319` |
| H9 | **错误应答表 `ERRORS`**（按顺序匹配，子类排在基类前面）：`BadRequest`→400 `invalid_request`；`InvalidImage`→400 `invalid_image`；`RuntimeNotFound`→404 `not_found`；`NotDraft`→405 `method_not_allowed`；`InvalidCLIProfile`→409 `cli_profile_unavailable`；`UnsupportedContainer`→409 `unsupported_container`；`UpgradeInProgress`→409 `upgrade_in_progress`；`ResourceInUse`→409 `resource_in_use`；`OwnershipMismatch`→409 `resource_in_use`；`ImagePullFailed`→503 `image_pull_failed`；`DiskQuotaUnavailable`→503 `disk_quota_unavailable`；`ContainerChanged`→503 `container_changed`；`RuntimeBusy`→503 `runtime_unavailable`；`ActivationFailed`→503，代码取自异常本身（`egress_not_ready` 或 `proxy_check_failed`）。表外的任何异常（Docker 错误、`ValueError`、`KeyError`、编程错误）一律 503 `runtime_unavailable`（`UNNAMED`） | `common.py:119-148` |
| H10 | **每组端点的"具名子集"**：只有出现在该组子集里的异常类型才按 H9 回答，**其余一律 503 `runtime_unavailable`（并打印堆栈）**。<br>· `REQUEST_ERRORS`（账号路由，含透传）= BadRequest、NotDraft、ImagePullFailed、InvalidCLIProfile、DiskQuotaUnavailable、ActivationFailed、ResourceInUse、RuntimeBusy。<br>· `DELETE_ERRORS`（仅 `DELETE /accounts/<key>`）= 上面再加 OwnershipMismatch。<br>· `MANAGEMENT_ERRORS`（上传、`/runtime/*`）= BadRequest、InvalidImage、ImagePullFailed、UpgradeInProgress、RuntimeBusy。<br>· `WORKER_ERRORS`（`POST worker`）= BadRequest、InvalidImage、RuntimeNotFound、UnsupportedContainer、ImagePullFailed、ContainerChanged、RuntimeBusy。<br>· `TUNNEL_ERRORS` = BadRequest、RuntimeBusy。<br>由此得出（Go 版必须照样）：`PUT config` 遇到带凭据或代理变量的业务镜像（`InvalidImage`）回 **503 `runtime_unavailable`**，不是 400；`PUT config` 和其他账号接口遇到同名的外部资源（`OwnershipMismatch`）回 **503**，只有 `DELETE` 回 409 | `http_api.py:38-48,140,255,313,329` |
| H11 | **错误日志**：每个失败的请求写一行 WARNING：`<方法> key=<key> path=<path> -> <状态> <代码>: <异常类型>: <异常消息前 300 字>`；只有表外异常带堆栈；从不写请求体、请求头或 URL。管理端点的 `path` 是完整路径、`key` 为 `None`。客户端断开（`BrokenPipeError`、`ConnectionResetError`；管理端点另加 `TimeoutError`）只记 `connection dropped`，不回应答。应答已经开始写时只记日志、不再回应答。`UploadError` 不写日志 | `http_api.py:62-80,250-255` |
| H12 | **错误正文**严格为 `{"error":"<code>"}`；唯一例外是 `offset_mismatch`，多一个 `"offset":<当前偏移>` | `http_api.py:94-97`、`images.py:30-38,221` |

---

## 3. 端点全表（R）

除特别注明外，以下端点都要求 H1 的鉴权，路径匹配规则见 H3、H4。"关闭"指应答后关闭连接（H8）。

### 3.1 系统

| 编号 | 方法 路径 | 请求 | 成功 | 错误 | 核心使用 | 出处 |
|---|---|---|---|---|---|---|
| R1 | `GET /health` | 不读请求体 | 200 `{"version","app_image","egress_image","controller_image","network_policy_version":1,"features":[…],"disk_quota":{"default_bytes","support"}}`；`version`=`CCG_CONTROLLER_VERSION`（默认 `dev`），`controller_image`=`CCG_CONTROLLER_IMAGE`（默认空串），`app_image`/`egress_image` 为当前目标（含 `PUT /runtime/images` 的覆盖值），`support` 为 `unknown`/`available`/`unavailable`（进程内观察到的结果，重启后回到 `unknown`）。`features` 固定为 11 项且按此顺序：`tunnel`、`uploads`、`runtime-images`、`self-upgrade`、`worker-update`、`runtime-pair-update-v1`、`shared-egress-v1`、`cli-profile-v1`、`runtime-cleanup-v1`、`account-disk-quota-v1`、`runtime-purge-v2` | 非 GET → 405（关闭）；总是关闭连接 | 使用 `version`、`app_image`、`egress_image`、`controller_image`、`features`（核心检查 `tunnel`、`worker-update`、`runtime-pair-update-v1`、`cli-profile-v1`、`runtime-cleanup-v1`）；**未使用** `network_policy_version`、`disk_quota` 及其余 6 个 feature | `http_api.py:120-124`、`runtime_admin.py:14-23`；core:`runtime.go:227-233`、`accounts.go:441-449`、`workers.go:103-106`、`cleanup.go:20`、`controller_install.go:369` |

### 3.2 账号（`/accounts…`）

| 编号 | 方法 路径 | 请求 | 成功 | 错误 | 核心使用 | 出处 |
|---|---|---|---|---|---|---|
| R2 | `GET /accounts` | 请求体照读（≤32 MiB） | 200 `{"runtimes":[{"key","status","created_at"}]}`，见 Y4 | 非 GET → 405（不关闭）；Docker 等错误 → 503 | 使用全部三个字段（草稿清理按 `created_at`、批量更新 Worker 按 `key`）；404/405 时核心视为旧控制器 | `http_api.py:146-149`、`manager.py:904-924`；core:`sweep.go:211-245`、`workers.go:113` |
| R3 | `DELETE /accounts/<key>` | 头 `X-CCG-Delete-Account`（值必须**逐字等于** `<key>` 才算确认）、`X-CCG-Delete-Data`（值必须是 `1`）；请求体照读 | 200 `{"deleted":true,"removed":{"containers":[名字…],"networks":[名字…],"volume":bool}}`；幂等，什么都没有时也是 200（removed 为空） | 只有 `Delete-Data` 没有确认 → 400 `invalid_request`；数字 key 没有确认 → 405 `method_not_allowed`（`NotDraft`）；外来占用或同名外部资源 → 409 `resource_in_use`；其他 → 503 `runtime_unavailable` | 只看状态码（200；草稿清理把 404 也当已删除）；`removed` 未使用 | `http_api.py:161-169`、`manager.py:771-803`；core:`cleanup.go:106-122`、`drafts.go:328-337` |
| R4 | `PUT /accounts/<key>/config` | JSON 期望配置（见 A2、V 节）；`X-CCG-Revision` 不读 | 200：就绪时为 `public(key)`（Y3）；阻断时为 `{"account_id":<key>,"status":"blocked","revision":""}` | 400 `invalid_request`；409 `cli_profile_unavailable`；503 `image_pull_failed`/`disk_quota_unavailable`/`egress_not_ready`/`proxy_check_failed`/`runtime_unavailable`。任何失败都清掉该账号的就绪（A1） | 只看状态码；失败时的 `error` 进 `details.reason`；应答正文未使用 | `http_api.py:171-176`、`manager.py:669-723`；core:`accounts.go:434-466` |
| R5 | `GET /accounts/<key>/status` | 请求体照读 | 200 `public(key)`：`account_id`、`container`、`cli`、`active_runtime`、`current_image`、`target_image`、`image_update_available`、`target_image_available`、`environment_pending`、`disk_quota`、`status`（只有 `ready`/`pending`，**从不是 `blocked`**）、`revision`、`auth_mode`、`network`、`app_ip`、`gateway_ip`。**未知 key 也回 200**（`status: pending`） | Docker 错误、同名外部容器、网关归属不符 → 503 | 使用 `status`、`revision`、`environment_pending`、`container`、`current_image`、`target_image`、`image_update_available`、`target_image_available`；**未使用** `account_id`、`cli`、`active_runtime`、`disk_quota`、`auth_mode`、`network`、`app_ip`、`gateway_ip` | `http_api.py:178-179`、`manager.py:947-964`；core:`accounts.go:376-389,887-896`、`lifecycle.go:144-163` |
| R6 | `GET /accounts/<key>/connection` | 头 `X-CCG-Revision`（缺省为空串） | 200 `{"app_ip","port":8787,"api_key","revision"}`（`revision` 即请求头的值） | 未就绪或修订号不符 → 409 `not_synchronized`（不关闭）；账号锁 20 s 内拿不到 → 503 `runtime_unavailable`（具名，无堆栈） | 全部使用，并校验：`app_ip` 是 IPv4、私网、在配置的地址池内；`port == 8787`；`revision` 等于请求值；`api_key` 长度 16–512 | `http_api.py:181-185`、`manager.py:966-995`；core:`direct.go:33-77` |
| R7 | `GET /accounts/<key>/egress` | — | 200 `{"backend":"shared_xray","ready":bool}`，`ready` 即 Y6 | `POST` 等其他方法 → 405 | **核心未调用** | `http_api.py:187-188`、`shared_egress.py:377-379` |
| R8 | `GET /accounts/<key>/tunnel` | 见 T1 | 101，之后为原始字节流 | 见 T1–T3 | 使用（控制面板模式的全部模型与资源流量） | `http_api.py:317-371`；core:`controller_tunnel.go:53-81` |
| R9 | `POST /accounts/<key>/worker` | JSON ≤64 KiB。`{"image"}` → 只换 Worker（W 节）；带 `components` 键 → 成对激活（P 节），必须恰好为 `{"image","components":["worker","cli"],"cli_version"}` | 200，正文见 W13、P7–P9 | 非 POST → 405（关闭）；400 `invalid_request`/`invalid_image`；404 `not_found`；409 `unsupported_container`；503 `image_pull_failed`/`container_changed`/`runtime_unavailable` | 使用 `status`、`sha256`、`previous_sha256`、`reason`、`cli_version`、`cli_patch`、`cli_sha256`、`online`；**未使用** `path` | `http_api.py:302-313`；core:`workers.go:224,254-261` |
| R10 | 透传 `…/admin/*` | 见 T9–T13 | Worker 的应答原样流式转发 | 见 T13 | 见 T9 | `http_api.py:192-233` |
| R11 | 405 的情形 | `GET /accounts/<key>`（无子路径）、`/accounts` 的非 GET、本地路径（`config`、`status`、`connection`、`egress`）上的其他方法、透传路径上不允许的方法 | — | 405 `method_not_allowed`（账号路由不关闭连接） | — | `http_api.py:37,146-157,193-194` |

### 3.3 上传（`/images/uploads…`）

| 编号 | 方法 路径 | 请求 | 成功 | 错误 | 核心使用 | 出处 |
|---|---|---|---|---|---|---|
| R12 | `POST /images/uploads` | JSON ≤64 KiB，必须是对象且键 ⊆ {`size`,`sha256`} | 200 `{"upload_id":<22 字符>,"offset":0,"size":n}` | 其他方法 → 405（关闭）；体不合规 → 400 `invalid_request`；值不合规 → 400 `invalid_request`（`UploadError`）；未完成上传已有 4 个 → 409 `too_many_uploads` | 使用 `upload_id`（核心再按 `[A-Za-z0-9_-]{22}` 校验）、`offset`、`size` | `http_api.py:276-282`、`images.py:186-204`；core:`controller_uploads.go:87-103` |
| R13 | `PUT /images/uploads/<id>` | 头 `X-CCG-Offset`（`[0-9]{1,12}`）；`Content-Length` 必须在 1..64 MiB；不得带 `Transfer-Encoding`；原始字节 | 200 `{"offset":新偏移,"size"}` | 头不合规 → 400 `invalid_request`；id 不存在 → 404；偏移不符 → 409 `{"error":"offset_mismatch","offset":<当前>}`；超出声明大小、请求体提前结束 → 400 `invalid_request`（这一块整块丢弃，U2） | 使用 | `http_api.py:288-294`、`images.py:216-227` |
| R14 | `GET /images/uploads/<id>` | 请求体照读（≤64 KiB） | 200 `{"offset","size"}` | 404 `not_found` | 使用 | `http_api.py:295-297`、`images.py:206-208` |
| R15 | `DELETE /images/uploads/<id>` | 同上 | 200 `{"deleted":true}` | 404 `not_found` | 只看状态码 | `images.py:210-214` |
| R16 | `POST /images/uploads/<id>/load` | 请求体照读；非 POST → 405 | 200 `{"sha256":<整个文件的 hex>,"images":[{"id":"sha256:…","tags":[…]}]}` | 404；没收齐 → 409 `incomplete`；校验和不符 → 400 `checksum_mismatch`；导入失败或导入结果为空 → 400 `load_failed`；其他 → 503 | 使用 `sha256`、`images[].id`、`images[].tags` | `http_api.py:283-287`、`images.py:229-253` |

### 3.4 运行时管理（`/runtime/…`）

| 编号 | 方法 路径 | 请求 | 成功 | 错误 | 核心使用 | 出处 |
|---|---|---|---|---|---|---|
| R17 | `GET /runtime/images` | 请求体照读（≤64 KiB） | 200 `{"app","egress","controller"}` | — | **核心未调用**（核心改用 `/health`） | `http_api.py:265-267`、`runtime_admin.py:25-26` |
| R18 | `PUT /runtime/images` | JSON ≤64 KiB，对象，键 ⊆ {`app`,`egress`}，值都满足 V3 | 200 同 `/health` | 400 `invalid_request`；400 `invalid_image`（app 镜像带凭据或代理变量；egress 镜像没有共享网关标签）；503 `image_pull_failed` | 使用（只看是否成功，以及返回的 `controller_image`） | `http_api.py:268-269`、`runtime_admin.py:28-49`；core:`controller_api.go:149-176` |
| R19 | `POST /runtime/controller` | JSON ≤64 KiB，恰好 `{"image"}` | **202** `{"accepted":true}` | 400 `invalid_request`（含降级检查失败，C2）；409 `upgrade_in_progress`；503 `image_pull_failed`；环境文件路径不合规 → 503 `runtime_unavailable` | 2xx 或请求发出后连接被断都视为已受理，之后轮询 `/health` 最多 90 s | `http_api.py:270-271`、`runtime_admin.py:51-79`；core:`controller_api.go:206-238` |
| R20 | `GET /runtime/cleanup` | 请求体照读（≤64 KiB） | 200 `{"runtimes":[{"key","identity"}]}`，见 X1–X3 | 运行环境超过 20000 个 → 503 | 使用 | `http_api.py:260-262`、`cleanup.py:92-110`；core:`cleanup.go:215` |
| R21 | `POST /runtime/cleanup` | JSON ≤**8 MiB**，见 X4 | 200 `{"results":[{"key","status","reason"?}],"deleted":n,"failed":n}` | 400 `invalid_request` | 使用全部字段 | `http_api.py:263-264`、`cleanup.py:113-154`；core:`cleanup.go:63-77,229` |
| R22 | 其余方法 | — | — | 405（关闭） | — | `http_api.py:272` |

### 3.5 已删除、必须回 404 的路径

`/accounts/<key>/v1/messages`、`/accounts/<key>/v1/messages/count_tokens`（旧模型转发；CONTRACTS §53.5 说这段代码还在，实际已删除，见 BUG-19）、`/accounts/<key>/migrate-auth`、`/accounts/<key>/admin/cli/catalog`、`/accounts/<key>/admin/auth/<其他>`、`/images/upload`、`/images/load/<id>`、`/images`。（R23；`test_manager.py:481-499`、`test_uploads.py:234-236`）

---

## 4. 隧道与透传（T）

### 4.1 隧道 `GET /accounts/<key>/tunnel`

| 编号 | 行为 | 出处 |
|---|---|---|
| T1 | **前置检查**：一进入就把连接标记为"关闭"（隧道连接永不回到 HTTP）；非 GET → 405；`Upgrade` 头去空白、转小写后必须等于 `ccg-tunnel`；`Connection` 头按逗号拆分、去空白、转小写后必须含 `upgrade`（允许 `keep-alive, upgrade`）；不得有 `Transfer-Encoding`；`Content-Length` 缺省或恰好为字符串 `'0'`（`'00'` 不行）。任一不满足 → 400 `invalid_request`。**不读请求体** | `http_api.py:317-325` |
| T2 | **修订号检查**：调 `connection(key, X-CCG-Revision)`，即在账号锁下（最多等 20 s，K2）读 `state.json`，要求状态存在、修订号非空且等于 `readiness()` 的结果；**检查完就释放账号锁**，之后的连接和转发都不持锁。拿不到锁 → 503 `runtime_unavailable`；不就绪 → 409 `not_synchronized`；其他异常 → 503 | `http_api.py:326-331`、`manager.py:979-995` |
| T3 | **连接上游**：`socket.create_connection((app_ip, 8787), timeout=5)`；失败 → 503 `runtime_unavailable`（**这一步失败不写日志**） | `http_api.py:332-335` |
| T4 | **101 应答**：`HTTP/1.1 101 Switching Protocols`，头 `Connection: Upgrade`、`Upgrade: ccg-tunnel`（另有 `Server`、`Date`），没有正文。核心只认 101 加 `Upgrade: ccg-tunnel`（不区分大小写） | `http_api.py:336-341`；core:`controller_tunnel.go:71` |
| T5 | **字节转发**：两个方向各一个循环：客户端 → 上游用 `rfile.read1(65536)` 再 `sendall`；上游 → 客户端用 `recv(65536)` 再直接写 socket。**`rfile` 是带缓冲的：紧跟在升级请求后面、已被读进缓冲区的字节（流水线发来的第一个模型请求）必须先转发出去**。读到多少写多少，从不攒满缓冲区；内容不解析、不记录 | `http_api.py:345-371` |
| T6 | **半关闭**：一侧读到 EOF 后，对另一侧 `shutdown(SHUT_WR)`，另一方向继续转发，直到两个方向都结束；然后关闭上游 socket，HTTP 连接也随之关闭 | `http_api.py:357-371` |
| T7 | **超时与出错**：建立隧道后两侧 socket 的超时都改为 3700 s（`TUNNEL_IDLE_SECONDS`；对读和写都生效）；任一方向超时或出错（`OSError`、`ValueError`）都对两侧做 `shutdown(SHUT_RDWR)`，拆掉整条隧道。长流式应答期间客户端 → 账号方向是空闲的，所以单条隧道最长约 1 小时 | `http_api.py:27,349-364` |
| T8 | 隧道只对 `X-CCG-Revision` 当下就绪的账号建立；建立后不会因为账号随后失去就绪而被拆掉 | `http_api.py:326-343` |

### 4.2 透传到 Worker（`/accounts/<key>/admin/…`）

| 编号 | 行为 | 出处 |
|---|---|---|
| T9 | **方法白名单**：`admin/request-logs` → GET、PUT；`admin/request-logs/query`、`…/detail`、`…/read` → 只允许 POST；`admin/cli` → GET、POST、PUT；`admin/usage` → GET；`admin/features` → GET；其余透传路径（`admin/status`、`admin/auth/session`、`admin/auth/{start,complete,cancel,logout,refresh}`）→ GET、POST。其他方法 → 405，**不连接 Worker**。核心实际调用：`admin/status`（GET）、`admin/auth/session`（GET）、`admin/auth/{start,complete,cancel,logout}`（POST）、`admin/auth/refresh`（POST）、`admin/usage`（GET）、`admin/features`（GET）、`admin/cli`（GET/POST/PUT）、`admin/request-logs`（GET/PUT）、`admin/request-logs/{query,detail,read}`（POST） | `http_api.py:33-35,193-194`；core:`accounts.go:737-752`、`cli_management.go:134`、`helper_history.go:54`、`request_logs.go:242`、`request_log_viewer.go:96,450`、`token_refresh.go:32`、`usage.go:62`、`runtime_features.go:145,182` |
| T10 | **就绪与账号类型**：`ready_state(key, X-CCG-Revision)`（同 T2：账号锁最多 20 s，读状态，修订号必须等于当前就绪修订号），不满足 → 409 `not_synchronized`；路径以 `admin/auth/` 开头或等于 `admin/usage`、且 `state.auth_mode == "api_key"` → 409 `api_key_account`。两者都不关闭连接。检查完即释放账号锁，转发期间不持锁 | `http_api.py:206-216` |
| T11 | **发往 Worker 的请求**：`http://<app_ip>:8787/<path>`；方法同调用方；请求头**只有** `Authorization: Bearer <state.admin_key>` 和 `Content-Type: application/json`（外加 HTTP 客户端的默认头），调用方的任何请求头都不转发（包括 `X-CCGateway-Request-Policy`、`Anthropic-Beta`、`X-Api-Key`）；请求体为调用方的原始字节（空体就是空体）；不跟随重定向；不使用环境里的代理（`trust_env=False`）；连接超时 5 s，读超时 240 s（每次读之间）；流式读取 | `common.py:240-256`、`http_api.py:200-203` |
| T12 | **回给调用方的应答**：状态码与 Worker 相同；`Content-Type` 取 Worker 的，没有时用 `application/json`；固定加 `Connection: close`、`Cache-Control: no-store`；**不发 `Content-Length`**，正文边收边写（`iter_content(chunk_size=None)`，每块写完就 flush），写完关闭连接；只有 `admin/request-logs/read` 额外转发 Worker 的 `X-Log-File-Size`、`X-Log-Offset`、`X-Log-Length`、`X-Content-Type-Options`（值非空时）。其他 Worker 应答头一律丢弃。注意：`requests` 默认带 `Accept-Encoding: gzip, deflate` 并在 `iter_content` 里自动解压，所以若 Worker 压缩了应答，转发出去的是**解压后的字节**且不带 `Content-Encoding`；Go 版要么不请求压缩，要么同样解压 | `http_api.py:218-233` |
| T13 | **失败**：连不上 Worker、Worker 中途出错 → 应答还没开始时回 503 `runtime_unavailable`（表外异常，带堆栈）；已经开始时只记日志并断开连接（调用方看到截断的正文）；调用方中途断开 → `connection dropped` | `http_api.py:70-80,137-140` |

---

## 5. 磁盘状态（S）

### 5.1 目录结构（0.1.118 生产，`<root>` = `/opt/ccgateway-runtime`）

```text
<root>/                         0700（启动时强制 chmod）
  .lock                         0600（umask），flock 互斥
  runtime.json                  0600  目标镜像覆盖值（I2、I3）
  uploads/                      0700
    <id>.part  <id>.json        0600  分块上传（U 节）
  backups/                      0700
    <key>.json                  0600  删除账号但保留数据时的 state 快照
  shared-egress/                0700  整个目录只读挂进共享网关的 /config
    state.json                  0600  共享网关状态，含全部代理凭据
    boot.json boot.nft dns.json active.nft operation.json   0600  网关读取的配置
  <key>/                        0700
    state.json                  0600
    egress-desired.json         0600  核心最近一次下发的期望配置（不含 auth，含代理凭据）
    resolv.conf                 0644  挂进账号容器的 /etc/resolv.conf（只读）
    app.nft                     0600  防火墙辅助容器读取的规则
    worker-backups/             0700
      <UTC>-<sha12>             0600  旧 Worker 程序，最多 5 份
    sing-box.json firewall.nft        sing-box 时代的遗留，由 PV13 删除
```

### 5.2 写入规则

| 编号 | 行为 | 出处 |
|---|---|---|
| S1 | **原子写**（`write_private`/`write_private_bytes`）：临时文件为同目录下的 `<文件名>.tmp`（`path.with_suffix(path.suffix + '.tmp')`，例如 `state.json.tmp`、`21.json.tmp`、`20261101T000000Z-abcdef012345.tmp`）；`open(..,'wb')` 后显式 `chmod 0600`，写入、`flush`、`fsync`，再 `rename` 覆盖目标。**不 fsync 目录**。所有 JSON 用 `json.dumps` 默认格式写成一行 | `common.py:171-182` |
| S2 | `.lock`：`open('w')` 并 `flock(LOCK_EX|LOCK_NB)`，进程存活期间一直持有；同一 `<root>` 只能有一个控制器 | `manager.py:168-170` |
| S3 | 目录权限：`<root>`、`<key>/`、`backups/`、`uploads/`、`shared-egress/`、`worker-backups/` 都按 0700 创建（`<root>`、`uploads/`、`worker-backups/` 另外显式 `chmod 0700`） | `manager.py:166-167,477,793`、`images.py:130-131`、`shared_egress.py:115`、`worker_update.py:94-96` |

### 5.3 `runtime.json`

| 编号 | 行为 | 出处 |
|---|---|---|
| S4 | 内容 `{"app":<ref>,"egress":<ref>,"env":{"app":<启动时的 CCG_APP_IMAGE>,"egress":<启动时的 CCG_EGRESS_IMAGE>}}`。只由 `PUT /runtime/images` 写（`{}` 不写）。启动时读：不存在 → 用环境变量；是对象、`env` 与本次启动的环境变量完全相等、`app` 和 `egress` 都满足 V3 → 用文件里的值覆盖；否则（旧格式、损坏、环境变量已被重装改写）**删除文件**，用环境变量 | `runtime_admin.py:44-48`、`manager.py:211-223` |

### 5.4 `<key>/state.json` 字段

所有字段都由控制器自己写；核心不读这个文件。"桥接守护"指 ovh 上现有的 `next/deploy/gateway/ovh/ccgateway-bridge-guard.py`（它读 `status`、`app_ip`、`gateway_ip`）。"回滚读"指 Python 0.1.118 控制器接手时会读到的字段。

| 编号 | 字段 | 取值与含义 | 写入时机 | 读取方 | 出处 |
|---|---|---|---|---|---|
| S5 | `api_key` | Worker 的 API 密钥，`secrets.token_urlsafe(32)`（43 字符）；作为容器环境变量 `CCG_API_KEY`；经 `connection` 交给核心 | 第一次 provision；之后不变 | 控制器（connection、容器环境）；回滚读 | `manager.py:626,640,995` |
| S6 | `admin_key` | Worker 的管理密钥，`token_urlsafe(32)`；容器环境 `CCG_ADMIN_KEY`；控制器调用 Worker 管理接口时用；**同时是凭据指纹的 HMAC 盐**（PV3） | 第一次 provision；之后不变 | 控制器；回滚读 | `manager.py:479,626,640`、`common.py:247-250` |
| S7 | `app_ip` | 账号容器在 `<p>-<key>-net` 上的地址 | provision 分配新网络时 | 控制器、桥接守护、共享网关绑定；回滚读 | `manager.py:611-617,629` |
| S8 | `gateway_ip` | 账号容器的默认路由和 DNS 地址。新网络时先是 `allocate_addresses` 分配的第一个地址；`SharedEgress.apply` 之后改为**共享网关在该网络上的实际地址** | provision；每次共享网关 apply | 控制器（防火墙、`resolv.conf`、`attach` 排除已用地址）、桥接守护；回滚读 | `manager.py:629`、`shared_egress.py:219,322` |
| S9 | `revision` | 当前就绪的修订号（64 位 hex）；新建或重建时置空 `''` | `activate` 成功时写为下发的修订号；`_record_runtime` 置空 | 控制器（`is_ready`、`healthy`、恢复）；回滚读 | `manager.py:630,751` |
| S10 | `status` | `pending`（刚 provision）→ `syncing`（共享网关 apply 开始）→ `ready`（activate 成功）/ `egress_error`（apply 失败）；`blocked`（阻断）。**持久化的 `ready` 在重启后不被信任**，只用于：B1 的恢复只处理 `ready`；`GET /accounts` 对 `blocked` 直接报 `blocked` | `_record_runtime`、`SharedEgress.apply`、`activate`、`block` | 控制器、桥接守护（`blocked` 时不放行）；回滚读 | `manager.py:630,751,764`、`shared_egress.py:313,327` |
| S11 | `created_at` | RFC 3339 UTC，秒精度（`%Y-%m-%dT%H:%M:%SZ`） | 第一次 provision | `GET /accounts`；缺失时用目录 mtime | `manager.py:628,912`、`common.py:167-168` |
| S12 | `network` | `{"pool","allocation"}`，规范化后的网络策略（N1） | provision | 判断网络策略是否变化；回滚读 | `manager.py:629` |
| S13 | `disk_quota` | `{"limit_bytes":int,"status":"enforced"\|"unbounded"\|"legacy_unbounded"}`；缺失视为 `legacy_unbounded` | 每次新建容器 | PV8 决定能否用无上限卷；`status` 应答 | `manager.py:566-568,633-634,960` |
| S14 | `auth_mode` | `oauth` 或 `api_key`；缺失视为 `oauth` | 新建容器时 | 透传的 `api_key_account` 判断；`status` 应答 | `manager.py:496,962`、`http_api.py:213` |
| S15 | `cli` | `{"version","request_mode","disable_auto_update":true}`，创建容器时选定的 CLI；可能没有（旧配置） | 新建容器且有 CLI 选择时 | PV4、PV8 | `manager.py:497-498,553` |
| S16 | `active_runtime` | `{"version","patch","sha256","worker_sha256","container_id","container_identity"}`；成对激活成功后写入；`container_identity` 是 `dockerfs.container_identity()` 生成的 JSON **字符串**（PV4、RB4） | P7 | PV4、PV5；`status` 应答 | `runtime_updates.py:279-282` |
| S17 | `environment` | `{"locale","timezone"}`，容器当前生效的值（空串表示未设置） | 新建容器；Worker 原地应用成功后 | PV6 | `manager.py:499,465` |
| S18 | `environment_created` | 创建容器时的值；旧状态没有时取当时的 `environment` | 新建容器；PV6 `setdefault` | PV7（创建时设定的值不能原地清空） | `manager.py:499,536` |
| S19 | `environment_pending` | bool：期望值与 `environment` 不同 | 新建容器（false）；PV6；PV7 成功后 false | `status` 应答（核心据此报 `environment_requires_new_runtime`） | `manager.py:499,537,466` |
| S20 | `environment_desired` | 待推送给 Worker 的值；不待推送时删除 | PV6；PV7 成功或新建容器时删除 | PV7 | `manager.py:500,539-541,467` |
| S21 | `egress_backend` | 恒为 `shared_xray`。**只有 0.1.117 及更早的控制器读它**；0.1.118 照写，以便插件回滚到 0.1.117 时旧控制器仍把账号当作共享网关账号。**Go 版必须继续写** | 每次共享网关 apply | 0.1.117 | `shared_egress.py:320-322`、`manager.py:94-96` |
| S22 | `migration_failed` | 旧版"迁移授权"留下的标记；0.1.118 **只读不写**：为真时 `PUT config` 一律 400，只能删除该草稿 | — | `_validate_desired` | `manager.py:693-694` |
| S23 | 遗留字段 `uplink_ip`、`legacy_gateway_ip`、`egress_migration` | sing-box 时代的字段，由 PV13 和 `_record_runtime` 删除 | — | — | `manager.py:98,605-609,631-632` |

### 5.5 其他文件

| 编号 | 行为 | 出处 |
|---|---|---|
| S24 | `egress-desired.json`：核心下发的期望配置**去掉 `auth` 键**后原样保存（含 `revision`、`proxy`（含用户名密码）、`direct`、`enabled`、`network`、`cli` 以及核心带的其他键）。写入时机：已有状态时，在校验通过后、provision 之前写（A3）；第一次 provision 之后写。读取方：B1 恢复、W11 重新激活（作为 `desired` 交给共享网关 apply）、Q1 代理域名复查 | `manager.py:272-275,683,719-720`、`shared_egress.py:371-375` |
| S25 | `resolv.conf` 内容恒为 `nameserver <gateway_ip>\noptions timeout:2 attempts:2\n`，权限 0644。**两种写法必须区分**：① 新建容器前（`_record_runtime`）用原子写，产生**新 inode**，只有之后新建的容器看到它；② 共享网关 apply 时（`SharedEgress.resolv`）**原地覆盖、保持 inode 不变**（`open('w')`、写入、fsync、`chmod 0644`），因为这个文件已经 bind mount 进正在运行的容器 | `common.py:259-261`、`manager.py:619-625`、`shared_egress.py:334-342` |
| S26 | `app.nft`：账号业务防火墙规则（N6），每次装防火墙前原子写（0600），只读挂进辅助容器的 `/app.nft` | `manager.py:344-352` |
| S27 | `worker-backups/`：文件名 `%Y%m%dT%H%M%SZ-<旧 sha 前 12 位>`（UTC），内容为旧 Worker 程序（0600）；只按正则 `[0-9]{8}T[0-9]{6}Z-[0-9a-f]{12}` 识别（普通文件、非符号链接），按名字排序后只留最新 5 份 | `worker_update.py:27-28,86-103` |
| S28 | `backups/<key>.json`：删除账号运行环境但不清除数据（只带 `X-CCG-Delete-Account`）时写入删除前的 `state.json` 内容；带 `X-CCG-Delete-Data: 1` 清除时删掉。孤儿清理把它算作运行环境的一部分（X1、X2） | `manager.py:791-802` |
| S29 | 上传文件：`<id>.part`（`O_EXCL` 创建，0600，已收字节）与 `<id>.json`（`{"size":n,"sha256":<hex 或 null>}`，先写 `<id>.tmp` 再改名，0600）。偏移就是 `.part` 的大小 | `images.py:195-204` |

### 5.6 `shared-egress/state.json`（共享网关状态）

| 编号 | 行为 | 出处 |
|---|---|---|
| S30 | 顶层 `{"schema":1,"salt":<64 位 hex>,"bindings":{<key>:绑定},"nodes":{<tag>:出站}}`。`schema` 必须为 1（否则启动失败）；`salt` 首次创建时生成，之后不变（参与出站 tag 计算，G5） | `shared_egress.py:117-121` |
| S31 | 绑定 `bindings[<key>]` = `{"ip":app_ip,"gateway":网关在该账号网络上的地址,"network_id":账号网络 ID,"container_id":账号容器 ID,"interface":网关内对应网卡名,"port":20000–29999 的 DNS 专用 SOCKS 端口,"tag":出站 tag,"revision":绑定时的修订号,"active":bool}`。端口一旦分配，同一账号再次 configure 时沿用 | `shared_egress.py:279-284` |
| S32 | 出站 `nodes[<tag>]` = `{"outbound":Xray 出站对象（含 tag、代理地址、**明文用户名和密码**）,"endpoint":[固定 IP, 端口] 或 null（直连）}` | `shared_egress.py:37-53,278` |
| S33 | 每次 `save()` 都整份原子写（S1）。写入时机：configure、fence、sync（每次都写）、remove、collect | `shared_egress.py:131-132` |
| S34 | 网关读取的文件（目录只读挂到网关的 `/config`）：`boot.json`（固定的 `BASE` 配置，建网关时写）、`boot.nft`（`firewall({},{})`，建网关时写）、`dns.json`（`{<活动绑定的 ip>:{"port":n}}`，每次 sync 写；建网关时写 `{}`）、`active.nft`（`firewall(bindings,nodes)`，每次 sync 写）、`operation.json`（每次调用带对象的 `xray api` 前写入那个对象）。全部 0600、原子写；网关进程以 root 读取 | `shared_egress.py:147-154,180-182,255-256` |

### 5.7 容器内由控制器写的文件

| 编号 | 行为 | 出处 |
|---|---|---|
| S35 | Worker 程序 `/usr/local/bin/worker` 或 `/usr/local/bin/ccgateway`（W3）：先放成 `<目标>.next-<12 位 hex>`（root、0755），校验后 `mv -f` | `dockerfs.py:116-140` |
| S36 | `/opt/ccgateway/cli/active-runtime.json`：成对激活的选择指针 `{"schema_version":1,"manifest":"<release>/manifest.json","version","request_mode":"build"}`；切换期间多带 `"maintenance_lease":<48 位 hex>,"maintenance_expires":<unix 秒，当前 +300>`；遗留回滚快照还可能带 `"maintenance_only":true` | `runtime_updates.py:106-111,254-256,155-157` |
| S37 | `/opt/ccgateway/cli/<patch>-<sha12>-<12 位 hex>/`（0755）下的 `claude` 与 `manifest.json`（`{"versions":{<version>:{…entry,"path":"claude"}}}`）：每次成对激活新建一个，从不覆盖已有的 | `runtime_updates.py:229-245` |
| S38 | `/opt/ccgateway/cli/legacy-snapshot-<sha12>-<12 位 hex>.json`：没有指针的旧容器，为回滚记录的 CLI 身份 | `runtime_updates.py:150-153` |

### 5.8 Docker 侧的持久"状态"

| 编号 | 行为 | 出处 |
|---|---|---|
| S39 | 以下 Docker 标签和选项与磁盘文件一样属于兼容范围（回滚后 Python 版据此认领资源）：账号标签 `io.sup2api.ccgateway.account=<key>`（容器、网络、卷）；凭据指纹 `io.sup2api.ccgateway.auth`（账号容器）；镜像 ID `io.sup2api.ccgateway.image`（账号容器）；网络策略 `io.sup2api.ccgateway.network`（网络，`json.dumps(policy, sort_keys=True)`，只写不读）；配额 `io.sup2api.ccgateway.disk-quota-bytes`（卷，与卷选项 `size` 必须相等）；网关归属 `io.sup2api.ccgateway.shared=<prefix>`（网关容器）。规格见第 10 节 | `common.py:32-36`、`shared_egress.py:22` |

---

## 6. 内存状态（M）

重启后全部丢失；下列行为依赖"丢失"这一点。

| 编号 | 行为 | 出处 |
|---|---|---|
| M1 | `online[key] = 修订号`：账号在该修订号下就绪。**只在内存里**，重启后为空，所以重启后所有账号都先报 `pending`，直到 B1 恢复或核心重新下发 | `manager.py:176,287-301` |
| M2 | `boots[key] = (账号容器 StartedAt, 网关 StartedAt)`：`activate` 成功时记录；任何一个容器重启过，就绪即失效（Y1） | `manager.py:177,755` |
| M3 | `image_seen = (单调时钟, 目标 app 镜像 ID)`：`status` 查询时最多每 30 s 解析一次目标镜像；`PUT /runtime/images` 后清零 | `manager.py:178,305-312`、`runtime_admin.py:48` |
| M4 | `locks[key]`：每个 key 一把 RLock，按需创建，**从不删除** | `manager.py:234-237` |
| M5 | 共享网关：`boot = (网关容器 ID, StartedAt)`（最近一次读取 Xray 清单时的网关启动身份）；`loaded_nodes`、`loaded_ports`（Xray 进程里已有的出站 tag 和入站 tag）；`dropped`（本进程已清理过 sing-box 遗留的 key） | `shared_egress.py:122-129` |
| M6 | 上传：`busy[upload_id]` 每个上传一把锁 | `images.py:132-133` |
| M7 | 目标镜像 `app_image`、`egress_image` 与 `env_images`（本次启动时的环境变量值，用于 S4） | `manager.py:172,183-184` |

---

## 7. 后台循环与定时常量（B）

| 编号 | 行为 | 出处 |
|---|---|---|
| B1 | **`SharedEgress.run`**：无限循环，每轮先 `sleep(10)` 再执行 `recover()`（G15）和 `collect()`（G14）；任何异常只记一行 `shared egress pass failed: …`，下一轮继续。`recover` 抛异常时这一轮跳过 `collect`。第一次执行在启动 10 s 后 | `shared_egress.py:440-447` |
| B2 | **`watch_proxies`**：无限循环，每轮先 `sleep(300)` 再 `recheck_proxies()`（Q3）；第一次在启动 300 s 后 | `manager.py:1051-1054` |

**B3 定时与上限常量**（Go 版取相同值）：

| 常量 | 值 | 用途 | 出处 |
|---|---|---|---|
| socket 超时 | 240 s | 每个 HTTP 连接 | `http_api.py:57` |
| `TUNNEL_IDLE_SECONDS` | 3700 s | 隧道两侧 | `http_api.py:27` |
| 隧道连上游 | 5 s | T3 | `http_api.py:333` |
| `REQUEST_LOCK_WAIT` | 20 s | 请求路径等账号锁（核心等 `connection` 15 s） | `manager.py:88` |
| 透传超时 | 连 5 s / 读 240 s | T11 | `http_api.py:202` |
| `IMAGE_CACHE_SECONDS` | 30 s | M3 | `manager.py:84` |
| `LOAD_TIMEOUT` | 1800 s | `docker load` 的客户端超时 | `manager.py:85` |
| Docker 客户端 | 60 s | 其他所有 Docker 调用 | `manager.py:171` |
| `PROXY_RECHECK_SECONDS` | 300 s | B2 | `manager.py:90` |
| 共享网关循环 | 10 s | B1 | `shared_egress.py:442` |
| Xray API 就绪 | 40 次 × 0.25 s | G3 | `shared_egress.py:197-203` |
| 网关监听 15001 | 30 次 × 0.2 s | A8 | `manager.py:737-746` |
| 连通性探测 | 10 s（脚本内 `AbortSignal.timeout`） | A8 | `manager.py:111-112` |
| 环境原地应用 | 连 3 s / 读 10 s | PV7 | `manager.py:457` |
| `WORKER_IDLE_WAIT` / 间隔 | 120 s / 2 s | W5 | `worker_update.py:29` |
| `WORKER_HEALTH_WAIT` / 间隔 | 30 s / 1 s | W8 | `worker_update.py:30` |
| `WORKER_RESTART_TIMEOUT` | 30 s | `restart(timeout=30)` | `worker_update.py:31` |
| Worker 健康脚本 | 3 s | W8 | `worker_update.py:32-33` |
| 维护接口 | 连 5 s / 读 10 s | P11 | `runtime_updates.py:87` |
| 维护租约过期 | 当前 + 300 s | S36 | `runtime_updates.py:110` |
| CLI `--ccgateway-info` | 15 s，输出 ≤8192 字节 | P4、P10 | `runtime_updates.py:40,51` |
| 阻断时停容器 | 10 s | BL1 | `manager.py:763` |
| `STALE_SECONDS` | 3600 s | 上传过期 | `images.py:25` |
| `MAX_PENDING` | 4 | 未完成上传数 | `images.py:24` |
| `MAX_SIZE` / `MAX_CHUNK` | 4 GiB / 64 MiB | 上传 | `images.py:22-23` |
| 自升级健康等待 | 60 s，每 2 s；单次请求 3 s；开始前先 sleep 1 s | C6 | `upgrade.py:27-28,68-77,206` |
| 自升级 Docker 客户端 | 120 s | C4 | `upgrade.py:207` |
| `WORKER_MAX_BYTES` | 256 MiB | 读 Worker 程序 | `dockerfs.py:22` |
| `MAX_CLI` | 512 MiB | 读 CLI | `runtime_updates.py:18` |
| 清单 / 指针 | 64 KiB | 读容器内 JSON | `runtime_updates.py:121,134` |
| `MAX_KEYS` | 20000 | 清理清单和请求 | `cleanup.py:11` |
| 出站上限 | 256 | G10 | `shared_egress.py:276` |
| DNS 端口范围 | 20000–29999 | G10 | `shared_egress.py:281` |
| Worker 备份 | 5 份 | W6 | `worker_update.py:27` |
| 维护应答 / 探测输出上限 | 4096 字节 | P11、PV19、P10 | `runtime_updates.py:90,144`、`cli_profiles.py:35` |

---

## 8. 锁与并发（K）

| 编号 | 行为 | 出处 |
|---|---|---|
| K1 | **账号锁**（每个 key 一把**可重入**锁）。阻塞获取（不限时）的地方：`apply`（整个下发过程）、`delete`、`update_worker`（取出新程序之后）、`update_runtime`（读完镜像包之后）、后台恢复（逐个 key）、清理清单的每个 key、`clean_one`（其中再调用 `delete`，**同一线程重入**）。非阻塞获取：`recheck_proxies`（拿不到就跳过该 key） | `manager.py:234-237,672,787,1039-1040`、`worker_update.py:174`、`runtime_updates.py:176`、`shared_egress.py:410`、`cleanup.py:84,141` |
| K2 | **请求路径的限时**：`connection`、隧道、透传经 `request_guard` 获取账号锁，最多等 `REQUEST_LOCK_WAIT`=20 s，否则 `RuntimeBusy` → 503 `runtime_unavailable`（具名，无堆栈）。只在读状态、判断就绪期间持锁，之后的转发不持锁。所以一次长时间的 apply 或原地更新期间，该账号的新连接最多等 20 s；已建立的隧道和 keep-alive 连接不受影响 | `manager.py:966-987` |
| K3 | **网络锁**（全局可重入锁）：整个 `_provision`（含拉镜像、CLI 探测、配额校验、准备数据卷的一次性容器、建容器）和 `ensure_network` 都在锁内——**所有账号的容器准备是串行的**，目的是避免两个账号选中同一个空闲网段。`_sync_environment` 在锁外执行 | `manager.py:175,427-436,362-372` |
| K4 | **共享网关锁**（可重入锁）：`configure`、`healthy`、`remove`、`collect`，以及 `SharedEgress.apply` 失败时的 fence 都在锁内；`sync`、`fence` 由持锁的调用方调用。**`healthy` 在请求路径上被调用（Y1），等这把锁不限时**（BUG-1） | `shared_egress.py:113,270,298,345,384,329` |
| K5 | **锁顺序**：账号锁 → 共享网关锁 → 网络锁（`configure` → `ensure` → `create` → `ensure_network`）；账号锁 → 网络锁（provision）。没有反向的获取，不会死锁。`_apply_shared` 在网络策略变化时先 `_detach_shared`（拿共享网关锁并释放）再 provision | `shared_egress.py:3`、`manager.py:712-718` |
| K6 | `runtime_lock` 串行化 `PUT /runtime/images`；`upgrade_lock` 串行化 `POST /runtime/controller` | `runtime_admin.py:35,56` |
| K7 | 上传：全局锁保护 `busy` 字典、创建与过期清理；每个上传一把锁串行化它的写入、导入和删除（阻塞获取）；`status` 不加锁；过期清理跳过正在被占用的上传 | `images.py:132-184` |
| K8 | 全局小锁 `Manager.lock`：保护 `locks` 字典和 `shared` 的延迟创建 | `manager.py:174,225-237` |
| K9 | `online`、`boots`、共享网关的 `data` 在 Python 里不加锁读写（靠 GIL），例如 `shared_bindings()`、`endpoint()`、`recover()` 取 key 列表、`public()`、`runtimes()` 都不拿账号锁。**Go 版必须给这些映射加锁**，但不能因此引入 Python 里没有的长时间等待 | `manager.py:277-301,904-964,999-1010`、`shared_egress.py:306-309,408` |
| K10 | 可重入是行为的一部分：`clean_one` 持账号锁调 `delete`；`provision` 持网络锁调 `ensure_network`；`SharedEgress.apply` 的异常处理和 `remove` → `ensure` → `sync` 都在共享网关锁内互相调用。Go 的 `sync.Mutex` 不可重入，需要把"已持锁"的内部函数拆出来 | 同上 |

---

## 9. 业务流程

### 9.1 下发配置 `PUT config`（A）

| 编号 | 行为 | 出处 |
|---|---|---|
| A1 | `apply` 持账号锁执行 `_apply`；**任何异常都先清掉就绪（`go_offline`）再抛出**：运行环境不在核心要求的状态 | `manager.py:669-677` |
| A2 | `_validate_desired`，按顺序：已有状态里 `migration_failed` 为真 → 400；不是对象 → 400；`cli` 不符合 V7 → 400；`revision` 不是 64 位小写 hex → 400；`network` 不符合 N1 → 400。**这里不校验 `proxy` 的结构**（BUG-5）。`direct` 的含义：`desired.direct is True`（必须是布尔真）且 `proxy` 为假值 | `manager.py:692-710` |
| A3 | 已有状态时，校验通过后立即写 `egress-desired.json`（在 provision 之前，即使之后失败也已写入，BUG-3） | `manager.py:681-683` |
| A4 | **阻断判定**：`proxy` 为假值（`null`、缺失，**也包括空对象 `{}`**）且不是 `direct`，或 `enabled` 为假值（缺省为真）→ 阻断（BL1）。仅缺少 `direct` 的空代理仍然阻断（兼容不带 `direct` 的旧核心） | `manager.py:684-685` |
| A5 | 已有状态且网络策略变化：先 `_detach_shared`（让网关离开该账号的旧网络并删除绑定，G13），再 provision | `manager.py:713-716` |
| A6 | provision（PV 节）后：第一次建状态时才写 `egress-desired.json`；若 `readiness() == 本次修订号`（已在该修订号就绪，且 Y1 已核对容器和网关仍在运行）→ 直接返回 `public()`，**不碰网关**；否则执行共享网关 apply（A7） | `manager.py:717-723` |
| A7 | **共享网关 apply**（`SharedEgress.apply`）：清就绪；`status=syncing` 并保存；账号容器没在运行就启动它；`configure`（G10）；`gateway_ip=网关地址`、`egress_backend=shared_xray` 并保存；原地重写 `resolv.conf`（S25 ②）；`activate`（A8）。任何异常：`status=egress_error` 并保存，持共享网关锁 fence 该绑定（错误被吞掉），再抛出原异常 | `shared_egress.py:311-332` |
| A8 | **`activate`**：① 装业务防火墙和默认路由（PV20 的防火墙辅助容器，脚本为 `NFT_REPLACE` + `ip route replace default via <gateway_ip>`，规则见 N6）；② 等网关：最多 30 次，每次 `reload`，网关不在运行 → `RuntimeError('egress failed')`（503 `runtime_unavailable`），在网关里执行 `ss -lnt \| grep -q :15001` 成功即继续，间隔 0.2 s，超时 → 503 `egress_not_ready`；③ 在账号容器里执行 `node -e PROBE_SCRIPT <probe_url>`（以容器默认用户 1000:1000，脚本 10 s 超时，HTTP 2xx 才算成功），失败 → 503 `proxy_check_failed`；④ `revision=本次`、`status=ready` 并保存；`reload` 两个容器，记 `boots`，`online[key]=修订号`。原地更新 Worker 后的重新激活也走这一步 | `manager.py:725-756,108-112` |

### 9.2 准备容器 provision（PV）

| 编号 | 行为 | 出处 |
|---|---|---|
| PV1 | `provision` 持网络锁执行 `_provision`；之后在锁外，若 `environment_pending` 且有 `environment_desired`，执行 PV7 | `manager.py:427-436` |
| PV2 | `_provision` 顺序：① 校验 CLI（V7，失败 400）、网络策略、认证（V5，失败 400）；② `mkdir <key>/ (0700)`；③ 读状态；盐 = 已有 `admin_key`，否则新生成；④ 算凭据指纹（PV3）和环境 `{locale,timezone}`（缺省空串）；⑤ 已有状态时查已有账号容器（不存在不报错；同名外部容器 → `OwnershipMismatch`），若 PV5 判定保留 → 返回原状态；⑥ **所有校验在拆除任何东西之前完成**：`_plan_container`（PV8）；状态不存在或网络策略变化时检查网段余量（PV11）；⑦ 拆除被替换的（PV12）；⑧ 地址（PV14）；⑨ 记录状态（PV15）；⑩ 建容器（PV17）；⑪ 写 `auth_mode`、`cli`（有时）、`environment`=`environment_created`=本次值、`environment_pending=false`，删 `environment_desired`，保存 | `manager.py:470-502` |
| PV3 | **凭据指纹** = `HMAC-SHA256(key=admin_key 的 UTF-8, msg=json.dumps(认证去掉 locale 和 timezone, sort_keys=True))` 的小写 hex，写在账号容器的 `io.sup2api.ccgateway.auth` 标签上。`json.dumps` 使用 Python 默认格式：分隔符 `", "` 和 `": "`、`ensure_ascii=True`（非 ASCII 转成 `\uXXXX`）、键按码点排序。例：`{"mode": "oauth"}`、`{"api_key": "…", "base_url": "https://api.anthropic.com", "mode": "api_key"}`。**Go 版必须逐字节一致**，否则所有现有账号在第一次下发时都会被判为"凭据变化"而重建（RB3） | `manager.py:152-157` |
| PV4 | **`_same_runtime(state, existing, cli)`** 为真当且仅当：`cli` 为空；或 `cli` 与 `state.cli` 完全相等；或"激活匹配"（已有容器存在，`state.active_runtime.container_identity == container_identity(已有容器)`，且 `cli.version == active_runtime.version`）；或 `cli.version == state.cli.version` 且两者的 `request_mode` 都在 {`direct`,`build`} 内 | `manager.py:504-516` |
| PV5 | **`_keep_existing`**：已有容器存在、网络策略相同、容器的指纹标签等于本次指纹 → 若 PV4 为假 → 409 `cli_profile_unavailable`（换 CLI 版本必须走成对激活），否则执行 PV6 并保留容器（不重建、不换镜像，**即使目标镜像已变**）。若不满足前述条件，但已有容器正是 `active_runtime` 记录的那个、`cli` 不为空且 PV4 为假 → 同样 409。其余情况进入重建 | `manager.py:518-530` |
| PV6 | `_note_environment`：`current = state.environment`（缺省两个空串）；`environment_created` 不存在时设为 `current`；`environment_pending = (本次值 != current)`；待推送时写 `environment_desired`，否则删除；保存 | `manager.py:532-542` |
| PV7 | `_sync_environment`（不让 apply 失败）：若某一项期望为空、而创建时的值非空 → 不处理（创建时设定的值无法原地清空，保持 pending）；账号容器不在运行 → 不处理；`PUT http://<app_ip>:8787/admin/environment`（`json=期望值`，管理密钥，连 3 s / 读 10 s）；非 200、应答不是对象、`locale` 或 `timezone` 与期望不同、任何网络或 Docker 错误 → 保持 pending；成功 → `environment=期望`、`environment_pending=false`、删 `environment_desired` 并保存。容器**不重建也不重启** | `manager.py:438-468` |
| PV8 | **`_plan_container`**（只校验、不改动）：① 没有已有容器、`cli` 为空、设置了 `CCG_DEFAULT_CLI_VERSION` → `cli = {version:<该值>, request_mode:"build", disable_auto_update:true}`（不合规 → 400）；② `version_changed` = `cli` 非空且版本与 `state.cli` 不同；`retired_mode` = `cli` 非空且 `state.cli.request_mode` 不在 {direct,build}；③ 镜像：有已有容器且两者都为假 → **沿用已有容器的镜像 ID**（`attrs.Image`），否则用当前目标 app 镜像（这是"凭据或网络变化不顺带升级镜像"的规则，以及迁移退役模式的有意例外）；④ `ensure_image`（PV18）；⑤ 镜像环境里有 `HTTP_PROXY` 等 8 个代理变量或 5 个凭据变量（V9）→ `InvalidImage`（`PUT config` 下为 503，H10）；⑥ `resolve_profile`（PV19），失败 → 409 `cli_profile_unavailable`；⑦ 配额：`recorded` = 有状态时取 `state.disk_quota.status`（缺省 `legacy_unbounded`），无状态时为 None；`legacy = recorded == 'legacy_unbounded'`；允许无上限 = `legacy`，或 `recorded` 为 None/`unbounded` 且未要求配额；⑧ `account_volume`（PV9）；⑨ `verify_disk_quota`（PV10） | `manager.py:544-572` |
| PV9 | **数据卷与配额**（`account_volume`/`_data_volume`）：卷已存在就用它（从不替换已有数据）；不存在 → 建 `local` 卷，`driver_opts={size:<字节>}`，标签 {账号, 配额=同一字节数}；Docker 报错含 `no quota support`（不区分大小写）→ 记 `support=unavailable`，若要求配额或不允许无上限 → 503 `disk_quota_unavailable`，否则建无上限卷（只带账号标签）；其他 Docker 错误原样抛出。随后核对：账号标签不符 → `OwnershipMismatch`；卷没有 `size` 选项、没有配额标签且允许无上限 → 返回（卷, 0）；否则要求驱动为 `local`、`size` 匹配 `[1-9][0-9]{0,14}`、配额标签等于 `size`、`1 GiB ≤ size ≤ 1024 GiB`，不满足 → 503 `disk_quota_unavailable`；通过时记 `support=available`，**以卷上记录的大小为准**（改默认值不会改已有卷） | `manager.py:374-409` |
| PV10 | `verify_disk_quota`：大小为 0 时跳过；否则用目标镜像起一次性容器（O7-②），在 `/work`（只读）上 `statfsSync`，`blocks<=0` 或 `blocks*bsize > 配额` 时退出码 42；任何 Docker 错误（含非零退出）→ 503 `disk_quota_unavailable`。在替换任何容器或网络之前执行 | `manager.py:411-423` |
| PV11 | 网段余量检查（`_check_subnet_capacity`）：已占用 = 所有 Docker 网络的 IPv4 子网（不含本账号自己标签的网络）+ 宿主机路由（不含本账号旧子网）；`allocate_subnet` 无空闲 → `ValueError`（**503 `runtime_unavailable`**，不是 400）；此时还没拆除任何东西 | `manager.py:574-580` |
| PV12 | `_remove_replaced`：有已有容器 → 清就绪、强制删除它（不存在不报错）；网络策略相同 → 结束；否则清就绪（含 boots）、清 sing-box 遗留（PV13）、删除旧的 `<p>-<key>-net`（不存在不报错） | `manager.py:582-592` |
| PV13 | `drop_own_egress`：删除 `<p>-<key>-egress` 容器（强制）、`<p>-<key>-uplink` 网络、`<key>/sing-box.json`、`<key>/firewall.nft`；状态里有 S23 的任一字段就全部删除并保存。网关自己的 `<p>-d0000000000000000-xray-uplink` 不在范围内 | `manager.py:594-609` |
| PV14 | 地址：`ensure_network(key,'net',策略,internal=True)`（持网络锁：已有且归属本账号就沿用；否则已占用 = 宿主机路由 + 所有 Docker 子网，分配子网（N2），建内部网，规格见 O4）；`reload`；网络策略未变 → 沿用状态里的 `gateway_ip`、`app_ip`；否则 `allocate_addresses(第一个 IPAM 子网, allocation)` → `[gateway_ip, app_ip]`（N3） | `manager.py:611-617,362-372` |
| PV15 | `_record_runtime`：写 `resolv.conf`（S25 ①，0644）；无状态时新建 `{api_key, admin_key=盐, app_ip, gateway_ip, revision:'', status:'pending', created_at}`；更新 `network`、`gateway_ip`、`app_ip`，`revision=''`，`status='pending'`；删除 S23 字段；`disk_quota={limit_bytes, status: 有大小→enforced / legacy→legacy_unbounded / 否则 unbounded}`；保存 | `manager.py:619-636` |
| PV16 | 账号容器环境：CLI 探测给的变量（PV19）→ 再合并 `TELEMETRY_ENV` 8 项（CLI 变量不能覆盖它们）：`DISABLE_AUTOUPDATER=1`、`DISABLE_TELEMETRY=1`、`DO_NOT_TRACK=1`、`DISABLE_ERROR_REPORTING=1`、`DISABLE_GROWTHBOOK=1`、`CLAUDE_CODE_ENABLE_TELEMETRY=0`、`DISABLE_FEEDBACK_COMMAND=1`、`CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1`；`CCG_API_KEY`、`CCG_ADMIN_KEY`、`CCG_EXTERNAL_EGRESS=1`；有配额时 `CCG_ACCOUNT_DISK_QUOTA_BYTES`；API Key 模式加 `ANTHROPIC_API_KEY`、`ANTHROPIC_BASE_URL`；有 locale 时 `LANG`=`LC_ALL`=locale（不含 `.` 时补 `.UTF-8`）；有 timezone 时 `TZ`。**不设** `CLAUDE_CODE_DISABLE_WEB_FETCH`、`CLAUDE_CODE_DISABLE_ARTIFACT`、`ENABLE_CLAUDEAI_MCP_SERVERS`、`CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL` | `manager.py:74-83,638-651` |
| PV17 | `_create_app`：先用选定镜像跑"准备数据卷"一次性容器（O7-①，脚本 `PREPARE_VOLUME`：建 `/work/config`、`/work/data`，删 `/work/data/environment.json`，写 `/work/data/cli-update.json` 为 `{"auto_update":false,"channel":"stable"}`，`chown -R 1000:1000 /work`）；再**只创建、不启动**账号容器（O3）。容器在 A7 才启动 | `manager.py:105-107,653-665` |
| PV18 | `ensure_image(ref)`：本地有就用；没有就拉取一次再取；拉取或取失败（Docker 或 HTTP 错误）→ 503 `image_pull_failed`。镜像 ID（`sha256:…`）不能拉取 | `manager.py:314-324` |
| PV19 | `resolve_profile`：`cli` 为空 → 不加变量；否则用选定镜像起一次性容器（O7-③）运行 `node -e PROBE <version> <request_mode>`：读 `/opt/ccgateway/cli/manifest.json`，版本和模式必须已打包，`realpath` 后路径在该根下，`patch` 匹配 `ccgateway-[a-z0-9-]+`，`sha256` 为 64 位 hex，从文件到 `/` 的每一级都属 root 且组和其他人不可写，文件哈希相符；输出超过 4096 字节或版本不符 → 失败。结果变量：`WORKER_CLI_PATH`、`WORKER_CLI_VERSION`、`CCG_CLI_SHA256`、`CCG_CLI_PATCH`、`CCG_REQUEST_MODE` | `cli_profiles.py:17-42` |
| PV20 | 一次性容器 `oneshot`：名字 `<p>-oneshot-<16 位 hex>`，`remove=True`；**启动失败时也要删掉**（docker-py 会把起不来的容器留在 Created）。删除失败不掩盖原错误。防火墙辅助容器（`helper`）：先写 `<key>/app.nft`，镜像用**正在运行的共享网关容器的镜像 ID**，规格见 O7-④ | `manager.py:332-352` |

### 9.3 就绪与状态查询（Y）

| 编号 | 行为 | 出处 |
|---|---|---|
| Y1 | `readiness(key, state)`：`online` 里没有该 key → `''`。否则：取账号容器（`owned`）和共享网关容器；若 `shared.healthy` 为假，或任一容器不在 `running`，或两个容器的 `StartedAt` 与 `boots[key]` 不同 → 清就绪；任一容器不存在（NotFound）→ 清就绪；**其他异常（同名外部容器、网关归属不符、Docker 错误）原样抛出**。返回 `online.get(key, '')`。不查镜像（请求路径调用它） | `manager.py:926-940` |
| Y2 | `SharedEgress.healthy`（持共享网关锁）：网关在运行、`boot == (网关 ID, StartedAt)`（即本进程已经读过这个网关进程的 Xray 清单）、绑定 `active`、绑定的 `revision == state.revision`、`container_id == 账号容器 ID`、`ip == state.app_ip` | `shared_egress.py:297-304` |
| Y3 | `public(key)`：读状态（没有则 `{}`）；`online = readiness()`；`current_image` = 账号容器的镜像 ID（没有容器为空串）；`target_id` = 目标镜像 ID（M3，Docker 错误为空串）；应答字段见 R5，其中 `image_update_available = current 非空且 target 非空且两者不同`、`target_image_available = target 非空`、`disk_quota` 缺省 `{"limit_bytes":0,"status":"legacy_unbounded"}`、`status = 'ready' 当且仅当 key 在 online 且 online == state.revision`、`revision = online`、`auth_mode` 缺省 `oauth`、`app_ip`/`gateway_ip` 缺省空串。查询状态从不拉取镜像、从不改变就绪 | `manager.py:947-964` |
| Y4 | `runtimes()`：遍历 `<root>` 的直接子项，按名字的**字节序**排序（所以 `12` 排在 `3` 前面），只取名字匹配 V1、不是符号链接、是目录的；`created_at` = `state.created_at`，否则目录 mtime 的 RFC 3339；`status` = 状态为 `blocked` 时 `blocked`，否则 `public().status`（Docker 错误或 `ValueError` → `pending`）；读状态或目录出错（并发删除）→ 跳过该项 | `manager.py:904-924` |
| Y5 | `ready_state(key, revision)`：持账号锁（K2）；状态存在、修订号非空、`readiness() == revision` 才返回状态，否则 None。`connection` 在此基础上返回 R6 的四个字段；`api_key` 只出现在这里，从不出现在 `status` | `manager.py:979-995` |
| Y6 | `is_ready(key, state)`：`state.revision` 非空且 `readiness() == state.revision`（用于 `GET egress` 和恢复） | `manager.py:942-945` |

### 9.4 阻断（BL）

| 编号 | 行为 | 出处 |
|---|---|---|
| BL1 | `block(key)`：清就绪；有状态时：停止账号容器（`timeout=10`；不存在不报错；同名外部容器 → 503），`status=blocked` 并保存，`shared.remove(key)`（绑定置为不活动并同步，**不断开网络、不删绑定**，G12）。容器、网络、数据卷、状态目录都保留。返回 `{"account_id":<key>,"status":"blocked","revision":""}`。没有状态时什么都不建，直接返回同样的结果。后台恢复从不复活已阻断的运行环境 | `manager.py:758-767` |

### 9.5 删除（D）

| 编号 | 行为 | 出处 |
|---|---|---|
| D1 | 先校验 key（V1）；不是草稿 key 且没有账号确认 → `NotDraft`（405）。`remove_volume = (不是账号确认) 或 purge`，即草稿总删卷，账号只在 purge 时删卷。然后持账号锁 | `manager.py:783-787` |
| D2 | **删除计划**（只查不改）：① `<p>-<key>-app`、`<p>-<key>-egress` 若存在但账号标签不符 → `OwnershipMismatch`（409）；② 运行环境的容器 = 带账号标签 `=<key>`（用标签过滤列出，含已停止的）、标签值确实等于 key、且名字为 `<p>-<key>-` + `ACCOUNT_CONTAINER_ROLE`（`(app\|egress)(-[A-Za-z0-9_.-]+)?`，例如人工迁移留下的 `-app-rollback-<tag>`）的全部容器，按名字排序；其他前缀同 key 的容器不算；③ 网络 `<p>-<key>-net`、`<p>-<key>-uplink`（按精确名字，标签不符 → 409）；④ 卷 `<p>-<key>-data`（标签不符 → 409，**即使这次不删卷**）；⑤ 共享网关 ID（`<p>-shared-egress` 且归属标签等于本前缀） | `manager.py:826-865` |
| D3 | **先查占用、再删**：网络上的端点，不属于本运行环境、也不是共享网关的 → 外来；要删卷时，挂着该卷的容器中不属于本运行环境、也不是"已结束的本控制器一次性容器"的 → 外来。有外来者 → `ResourceInUse`（409 `resource_in_use`，外来容器名只写日志），**什么都不删** | `manager.py:851-859` |
| D4 | 本控制器遗留的一次性容器（名字以 `<p>-oneshot-` 开头且状态为 `created`/`exited`/`dead`）一并删除并**排在最前**：挂着该卷的；`HostConfig.NetworkMode` 为 `container:<本运行环境某容器 ID>` 的；挂载源等于运行目录或以 `<运行目录>/` 开头的（`/root/210` 不算 `/root/21`）。运行中的一次性容器不删，但若它挂着要删的卷，按 D3 算作占用 | `manager.py:860-884` |
| D5 | **执行顺序**：`_detach_shared`（G13：网关离开账号网络、删除绑定）→ 账号确认且不 purge 且有状态时写 `backups/<key>.json` → 清就绪 → 删容器（一次性容器、运行环境容器；强制；不存在的跳过）→ 删网络（`reload` 时已不存在则跳过；网关还在网络上就先强制断开）→ 计划删卷时强制删卷 → 删运行目录（是目录且不是符号链接时 `rmtree`）→ purge 时删 `backups/<key>.json` | `manager.py:787-824` |
| D6 | 返回 `removed` 只列这次实际删掉的：`containers`（名字列表）、`networks`（名字列表）、`volume`（bool） | `manager.py:805-824` |
| D7 | 中途失败（如某个容器删不掉）→ 异常抛出（503），已删的不恢复；重试会接着删剩下的 | `test_manager.py:966-974` |

### 9.6 原地更新 Worker（W，`POST worker {"image"}`）

| 编号 | 行为 | 出处 |
|---|---|---|
| W1 | 请求必须恰好是 `{"image":<V3>}`，否则 400。**不持账号锁**先取新程序：`ensure_image`（503 `image_pull_failed`）；用该镜像建一个**不启动、断网**的临时容器（O8），`get_archive('/usr/local/bin/worker')`，要求归档里只有一个普通文件且 ≤256 MiB（归档总量超过上限 + 1 MiB 即停止读取），取不到 → 400 `invalid_image`；临时容器无论成败都删除（删除失败不掩盖原错误）；算 SHA-256 | `worker_update.py:37-45,169-175`、`dockerfs.py:31-50,143-146,157-166` |
| W2 | 持账号锁（阻塞）。账号容器不存在或同名外部容器 → 404 `not_found`（`OwnershipMismatch` 在这里也被当作"没有"）；不在运行 → 200 `{"status":"not_running"}` | `worker_update.py:47-58` |
| W3 | 目标路径：容器 `Path` 加 `Args` 中第一个基名为 `worker` 或 `ccgateway` 的条目；只接受裸名或 `/usr/local/bin/<名>`，映射为 `/usr/local/bin/<名>`；其他位置或找不到 → 409 `unsupported_container`。用 root 在容器里 `sha256sum` 目标文件，读不出 → 409 | `dockerfs.py:65-81,104-108`、`worker_update.py:58-63` |
| W4 | 当前程序哈希等于新程序 → 200 `{"status":"unchanged","sha256"}`，不重启 | `worker_update.py:181-182` |
| W5 | **空闲**：`top -eo pid,comm` 的 COMMAND 列里只有 `docker-init` 和程序基名前 15 个字符（Linux 截断 comm）；没有 COMMAND 列 → 抛错（503）。每 2 s 重查，最多 120 s；仍忙 → 200 `{"status":"busy"}`，不做任何改动 | `dockerfs.py:84-92`、`worker_update.py:75-84,183-185` |
| W6 | 备份：从容器读出当前程序（必须是普通文件，否则 409），哈希必须等于 W3 测得的值，写 `worker-backups/`（S27），只留最新 5 份。**只有确定要更新时才备份**（busy 时不轮换掉旧备份） | `worker_update.py:86-103` |
| W7 | 放置：`put_archive` 一个 root、0755、mtime 为当前时间的单文件 tar，文件名 `<目标>.next-<12 位 hex>`；容器内以 root `chmod 0755`、`stat -c %u:%g:%a` 必须为 `0:0:755`、`sha256sum` 必须相符；任一步失败删掉临时文件再抛错。之后再查一次空闲：忙 → 删临时文件，200 `busy` | `dockerfs.py:53-62,116-133`、`worker_update.py:207-219` |
| W8 | 切换：记下 `was_online`（状态修订号非空且 `readiness()` 等于它）→ 清就绪 → 以 root `mv -f` 替换（失败删临时文件，503）→ `restart_healthy`：只重启这一个容器（`timeout=30`，Docker 报错吞掉）；重启后 `State.StartedAt` 没变 → 判为不健康（旧进程可能还在回答健康检查）；然后**立即**补装业务防火墙（W9），再等健康：最多 30 s、每 1 s，在容器里执行 `node -e` 请求 `http://127.0.0.1:8787/health`（3 s 超时）返回 200；容器已退出 → 不健康 | `worker_update.py:105-129,186-196` |
| W9 | `_refence`：重启后网络命名空间是新的，没有规则也没有默认路由；状态里有 `gateway_ip` 且容器在运行时，立即执行 A8 ① 的防火墙步骤；失败只记日志 | `worker_update.py:131-141` |
| W10 | 回滚：新程序不健康 → 容器在运行时用备份按 W7 + `mv` 放回；容器已停止时（新程序一启动就退出，无法 exec）直接 `put_archive` 覆盖目标并读回比对；再 `restart_healthy`。仍不健康 → 200 `{"status":"rolled_back","reason":"rollback_unhealthy","online":false}`（不再尝试激活）；健康 → `{"status":"rolled_back","reason":"unhealthy",…}`。回滚本身出错 → 503，容器里可能留着新程序 | `worker_update.py:143-151,196-204`、`dockerfs.py:149-154` |
| W11 | 重新激活：只在 `was_online` 时执行。核对容器未变（W12；**这一步不在 try 里**，变化时整个请求 503）；状态修订号必须仍等于原值；然后用 `egress-desired.json` 执行共享网关 apply（A7）。任何失败只记日志、清就绪，返回 false；成功 → true。核心下一次对账会补上，不重建容器 | `worker_update.py:153-167,204` |
| W12 | 容器身份：`container_identity` = `json.dumps({id, image(attrs.Image), config_image, user, labels, mounts(每个挂载 json.dumps(sort_keys) 后排序的列表), path, args}, sort_keys=True)`。从开始到结束每一步（等空闲、重启前后、恢复、重新激活）都与开始时比对；不同或容器按名字找不到 → 503 `container_changed` | `dockerfs.py:95-101`、`worker_update.py:65-73` |
| W13 | 成功应答 `{"status":"updated","previous_sha256","sha256","path":<目标路径>,"online":bool}`；`online` = `was_online` 且重新激活成功 | `worker_update.py:187-205` |

### 9.7 Worker + CLI 成对激活（P，`POST worker` 带 `components`）

| 编号 | 行为 | 出处 |
|---|---|---|
| P1 | 请求必须恰好有三个键 `image`、`components`、`cli_version`；`components == ["worker","cli"]`（顺序固定）；`image` 满足 V3；`cli_version` 满足 V4；否则 400 `invalid_request`。不能指定路径，不能只换一个组件 | `runtime_updates.py:168-173` |
| P2 | **读镜像包**（不持账号锁）：`ensure_image`；临时容器（O8）里读 `/opt/ccgateway/cli/manifest.json`（≤64 KiB），`release_entry`：`versions[<版本>]` 必须是对象，`path` 为非空相对路径（不含 `\`、空段、`.`、`..`），`sha256` 为 64 位 hex，`patch` 匹配 `ccgateway-[a-z0-9-]+`，`modes` 是同时含 `direct` 和 `build` 的列表；读 CLI（≤512 MiB），必须以 `\x7fELF` 开头且哈希等于 `sha256`；读 Worker，必须是 ELF。这些失败抛 `ValueError` → **503 `runtime_unavailable`**（不是 400 `invalid_image`，BUG-6） | `runtime_updates.py:64-79,118-128` |
| P3 | **开始**（持账号锁）：账号容器不在运行 → `{"status":"not_running"}`；以 root 运行 `TRUST_SCRIPT`（`/opt/ccgateway/cli` 及其每一级上级是 root 所有、组和其他人不可写、不是符号链接的目录；`active-runtime.json` 若存在也须如此），失败 → 409 `unsupported_container`；读状态（无状态 → 503）；取回滚用的旧指针（P10）；等空闲（W5），忙 → `{"status":"busy"}`；备份 Worker（W6）；调 Worker 维护接口 `pause`（P11），409 → `{"status":"busy"}`；租约必须匹配 `[a-f0-9]{48}`，否则抛错（BUG-7）；`was_online` 只看内存（`online[key] == state.revision`），不重新核对容器 | `runtime_updates.py:200-227` |
| P4 | **放置新版本**：在容器里以 root `mkdir -m 0755 /opt/ccgateway/cli/<patch>-<sha12>-<12 位 hex>`；写入 `claude` 和 `manifest.json`（S37，每个文件写后读回比对）；以 root 运行 `INFO_SCRIPT`：路径在 CLI 根下、每一级 root 所有且不可被组和其他人写、不是符号链接、哈希相符；执行 `<cli> --ccgateway-info`（15 s，≤8192 字节，环境加 `DISABLE_AUTOUPDATER=1`），`version`、`patch` 相符，`capabilities` 含 `REQUIRED` 五项（`request_direct`、`request_build`、`build_attachment_sources_v2`、`build_billing_sources_v1`、`build_content_preservation_v1`）。失败 → 503，当前这一对不变 | `runtime_updates.py:23-24,34-43,229-245` |
| P5 | **切换**：放置新 Worker（W7）；维护接口 `validate`（409 → `busy`）且容器仍空闲，否则 `{"status":"busy"}`（未切换，`finally` 里恢复准入）；生成带租约的新指针并放置；再核对容器；清就绪；标记 `switched`；`mv` 指针、`mv` Worker（两次替换都在准入暂停期间，模型请求看不到混合的一对）；`restart_healthy`（W8）且 P6 通过 → 提交（P7）；否则抛错 → 回滚（P9） | `runtime_updates.py:247-267` |
| P6 | 新 Worker 身份核对：在容器里请求 `/health`（3 s），要求 200、`cli_version`、`cli_patch`、`cli_sha256` 与新 CLI 相符，`capabilities` 含 `HEALTH_REQUIRED` 四项（`build_attachment_sources_v2`、`build_billing_sources_v1`、`build_content_preservation_v1`、`request_policy_mode_v1`） | `runtime_updates.py:25-26,57-61,159-163` |
| P7 | **提交**：再核对容器；把指针换成**不带租约**的版本；`state.active_runtime = {version, patch, sha256, worker_sha256, container_id, container_identity}` 并保存；标记 `safe`、`reopened`（从此**绝不回滚、绝不重启**：恢复准入的应答即使丢失，新进程也可能已经接了新请求）；恢复准入（P8）。应答 `{"status":"updated","sha256":<Worker>,"cli_version","cli_patch","cli_sha256","online"}` | `runtime_updates.py:273-299` |
| P8 | **恢复准入与就绪**：`resume` 从不抛错，Worker 确认时为真；确认且 `was_online` 时执行重新激活（W11，异常吞掉）。`_run` 的 `finally`：删掉残留的临时 Worker 文件；未切换或已 `safe` 时再调一次 `resume`。已 `reopened` 后出现的异常只返回 `updated` + `online:false` | `runtime_updates.py:98-103,182-198,289-295` |
| P9 | **回滚**（切换后任何异常且未 `reopened`）：再核对容器；把旧指针**连同租约**写回（重启后仍保持暂停）；放回旧 Worker（W10）；**整份**写回开始时的状态快照；`restart_healthy`。健康 → 把指针换成不带租约的旧指针，标记 `safe`/`reopened`，恢复准入并按旧状态重新激活，应答 `{"status":"rolled_back","reason":"unhealthy","online"}`；不健康 → `{"status":"rolled_back","reason":"rollback_unhealthy","online":false}`，**准入保持暂停**（指针里留着租约，需要人工处理）。回滚本身出错 → 抛出（503），不恢复准入 | `runtime_updates.py:301-316` |
| P10 | **回滚用的旧指针**：容器里有 `active-runtime.json` 就原样读出（≤64 KiB）；没有（旧镜像）→ 按容器环境（`WORKER_CLI_PATH` 缺省 `/usr/local/bin/claude`、`WORKER_CLI_VERSION`、`CCG_CLI_SHA256`、`CCG_CLI_PATCH`）以 root 运行 `LEGACY_SNAPSHOT_SCRIPT`：`realpath` 在 CLI 根下、每级 root 所有且不可写、普通文件且 ≤512 MiB、执行 `--ccgateway-info`，版本和 patch 合规、与环境中的固定值一致，并且**同时声明** `request_direct` 和 `request_build`；输出 ≤4096 字节；按 P2 的规则核对后，把 `{"versions":{<版本>:entry}}` 写成 S38 的快照清单，旧指针为 `{"schema_version":1,"manifest":<快照名>,"version","request_mode":<环境里的模式，native 时为 build>,"maintenance_only":<是否 native>}`。从不下载或替换旧 CLI | `runtime_updates.py:44-56,130-157` |
| P11 | **维护接口**：`POST http://<app_ip>:8787/admin/runtime`，管理密钥，体 `{"action":"pause"\|"validate"\|"resume","lease"?}`（连 5 s / 读 10 s，不走代理）。409 → None（忙）；非 200 或正文超过 4096 字节 → 抛错（"Worker 不支持成对激活，先单独更新 Worker"）；正文必须是对象且 `active_requests == 0` | `runtime_updates.py:82-95` |

### 9.8 共享网关（G）

| 编号 | 行为 | 出处 |
|---|---|---|
| G1 | 网关容器名 `<p>-shared-egress`，归属标签 `io.sup2api.ccgateway.shared` 必须等于本前缀，否则 `RuntimeError('shared container ownership mismatch')`（503）；网关自己的网络 `<p>-d0000000000000000-xray-uplink`，用账号标签值 `d0000000000000000` 走同一个分配器 | `shared_egress.py:124,134-138,179` |
| G2 | **建网关**（只在需要而网关不存在时）：`ensure_image(网关镜像)`，镜像标签 `io.sup2api.ccgateway.shared-egress` 必须为 `1`；用**触发它的那个账号的网络策略**建 uplink 网（非内部网）；写 `boot.json`、`boot.nft`、`dns.json`；创建容器（O6），不启动 | `shared_egress.py:174-191` |
| G3 | `ensure(policy, existing_only)`：网关不存在 → `existing_only` 时抛 NotFound，否则建；不在运行 → `existing_only` 时抛错，否则启动；`reload`；若 `(ID, StartedAt)` 与 `boot` 不同 → 读清单：反复执行 `xray api lso --server=127.0.0.1:10085`，最多 40 次、间隔 0.25 s，仍失败 → `Xray unavailable`；然后 `lso` 得到已有出站 tag，`lsi` 得到已有入站 tag，更新 `boot` | `shared_egress.py:156-207` |
| G4 | **接入账号网络**（`attach`）：按名字取 `<p>-<key>-net`（**不核对归属**）；网关已在该网络上就沿用其地址；否则在第一个子网的主机地址里按顺序选第一个未用的（排除已有端点、`.1`、`state.app_ip`、`state.gateway_ip`）并接入；账号容器在该网络上的地址必须等于 `state.app_ip`，否则 `account network identity changed`；在网关里执行 `ip -j -4 addr` 找出持有该地址的网卡名。返回（网关地址、网络 ID、账号容器 ID、网卡名） | `shared_egress.py:209-229` |
| G5 | **出站**（`node`）：直连 → `{"protocol":"freedom","settings":{"domainStrategy":"UseIPv4"}}`，`endpoint` 为 null；代理 → 先解析成一个 IPv4（N5），`socks5` 用 `socks`、`http`/`https` 用 `http`，`servers:[{"address":IP,"port":端口}]`，用户名或密码非空时加 `users:[{"user","pass"}]`，`https` 加 `streamSettings:{"security":"tls","tlsSettings":{"serverName":<原主机名>,"allowInsecure":false}}`；`endpoint=[IP,端口]`。tag = `proxy-` + `sha256(salt + json.dumps(出站对象, sort_keys=True))` 的前 24 位 hex（计算时还没有 tag 字段）。tag 随解析结果、凭据变化而变，密码不出现在 tag 里 | `shared_egress.py:37-53` |
| G6 | **路由**（整份替换，从不按账号单独替换）：按 key 的字符串顺序，对每个活动绑定生成两条：`{"type":"field","ruleTag":"dns-<key>","inboundTag":["dns-<端口>"],"outboundTag":<tag>}`、`{"type":"field","ruleTag":"app-<key>","inboundTag":["transparent"],"source":["<ip>/32"],"outboundTag":<tag>}`；最后一条 `{"type":"field","ruleTag":"deny","network":"tcp,udp","outboundTag":"block"}`；`domainStrategy` 为 `AsIs`。DNS 入站：`{"tag":"dns-<端口>","listen":"127.0.0.1","port":端口,"protocol":"socks","settings":{"auth":"noauth","udp":false}}` | `shared_egress.py:56-70` |
| G7 | **网关防火墙**（`table inet ccg_shared`）：每个绑定（不论是否活动）先校验网卡名（去掉 `_`、`-` 后为字母数字）、`ip`、`gateway` 为 IPv4；`intercept` 链（prerouting、mangle 优先级、policy accept）：活动绑定放行到网关 53 的 TCP/UDP；所有绑定丢弃发往私有目的地址（`PRIVATE_DESTINATIONS`）的包，并把 TCP 打标记 1、TPROXY 到 `:15001`；`forward` 链 policy drop、无规则；`input` 链 policy drop：`lo`、已建立连接、活动绑定的 DNS、活动绑定带标记 1 的包；`output` 链 policy drop：`lo`、已建立连接，每个出站有 `endpoint` 时只放行到该 IP 和端口的 TCP，直连出站时丢弃私有目的地址、放行其余 IPv4 TCP（代理端点的放行排在直连的丢弃之前）。文本格式见源码，规则的先后在语义上等价即可（BUG-17） | `shared_egress.py:73-107`、`network.py:87-88` |
| G8 | **同步**（`sync`，调用方持共享网关锁）：① 对每个活动绑定，账号容器不存在、ID 变了、网络 ID 变了、地址变了或不在运行 → 置为不活动；② 保存；③ 对每个未加载的出站执行 `xray api ado /config/operation.json`（内容 `{"outbounds":[出站]}`）；④ 对每个绑定（不论是否活动）若其 DNS 入站未加载，执行 `adi`（`{"inbounds":[入站]}`）；⑤ `adrules` 整份路由；⑥ 写 `dns.json`、`active.nft`；⑦ 在网关里执行 `sh -ec '{ if nft list table inet ccg_shared …; then echo "delete table inet ccg_shared"; fi; cat /config/active.nft; } \| nft -f -'`（原子替换整张表）。任一命令非零退出 → `RuntimeError('shared egress command failed: <命令名>')`，不带输出（不泄露配置和凭据） | `shared_egress.py:140-154,231-259` |
| G9 | `fence(key)`：绑定存在时置为不活动、保存、同步 | `shared_egress.py:261-266` |
| G10 | **configure**（持账号锁的调用方再持共享网关锁）：`ensure(state.network)`；fence 本账号；`attach`；直连（`direct` 且无代理）或代理生成出站；出站已有 256 个且本 tag 是新的 → 抛错（需要回收）；登记出站；端口沿用本账号原绑定的，否则取 20000–29999 中第一个未被任何绑定占用的；写入活动绑定（S31，`revision` 取 `desired.revision`）；保存；同步。同步失败 → 绑定置为不活动、保存、尽力再同步一次，然后抛出原异常 | `shared_egress.py:268-295` |
| G11 | `endpoint(key)`：本账号绑定的出站的 `endpoint`；直连或无绑定为 None | `shared_egress.py:306-309` |
| G12 | **remove(key, disconnect=False)**（持共享网关锁）：无绑定 → 直接返回（不写文件）；绑定置为不活动并保存；取网关（不存在为 None，归属不符抛错）；网关在运行时 `ensure(该账号的网络策略, existing_only=True)` 再同步——**不会创建或启动网关**；`disconnect` 时：网关存在则断开账号网络，删除绑定并保存 | `shared_egress.py:344-361` |
| G13 | `disconnect(key, 网关)`：账号网络存在且网关在其上时强制断开；网络不存在不报错。`_detach_shared(key)`：本前缀的网关存在时先 `disconnect`，然后 `remove(key, disconnect=True)` | `shared_egress.py:363-369`、`manager.py:886-892` |
| G14 | **回收**（`collect`，持共享网关锁，B1 每 10 s）：网关不在运行，或 `ss -Hnt state established` 有任何输出（整个网关有已建立的 TCP 连接，含 DNS）→ 不回收；否则删除不被任何绑定（**含不活动绑定**）引用的出站（已加载的先 `xray api rmo <tag>`）；卸载不对应任何绑定端口的 `dns-*` 入站（`rmi`）；出站有删除时保存并同步。网关不存在时抛 NotFound（每 10 s 一行告警，BUG-16） | `shared_egress.py:381-404` |
| G15 | **恢复**（`recover`，B1 每 10 s）：key 集合 = 绑定的 key ∪ `<root>` 下名字匹配 V1 且 `is_dir()` 的子项（会跟随符号链接，BUG-18）；按字符串顺序逐个持账号锁（阻塞）：先 G16；读状态，无状态或 `blocked` → 跳过；`_recover_one`：状态不是 `ready` → 跳过（失败的新配置按核心的重试处理）；账号容器不在运行 → 跳过（**从不启动停着的账号**）；`is_ready` 为假或 `healthy` 为假 → 用 `egress-desired.json`（不存在则抛错）执行 A7。单个 key 的异常只记日志并清该 key 的就绪。**控制器重启后 `online` 为空，所以每个 `status=ready` 且容器在运行的账号都会在约 10 s 后被重新 apply 一次**（fence → 接入 → 同步 → 防火墙 → 探测） | `shared_egress.py:406-438` |
| G16 | `_drop_own_egress(key)`：本进程每个 key 只成功执行一次 PV13（停止的、阻断的、没有状态的 key 也做）；失败只记日志，下一轮重试，从不让账号下线 | `shared_egress.py:421-430` |
| G17 | 网关运行中不因目标 egress 镜像变化而重建；只有之后新建的网关用新镜像（但见 BUG-4） | `shared_egress.py:125-128`、CONTRACTS §57 |

### 9.9 网段分配与规则生成（N）

| 编号 | 行为 | 出处 |
|---|---|---|
| N1 | `network_policy(raw)`：None → `{}`；必须是对象且键 ⊆ {`pool`,`allocation`}；`pool` 缺省或空 → `10.0.0.0/8`，用非严格模式解析（`192.168.50.7/24` → `192.168.50.0/24`）；必须是 IPv4、前缀长度 ≤24、属于 `10/8`、`172.16/12`、`192.168/16` 之一；`allocation` 缺省或空 → `random`，只能是 `random`/`sequential`。返回 `{"pool":<规范化>,"allocation"}`（键顺序无关） | `network.py:12-22` |
| N2 | `allocate_subnet(policy, occupied)`：子网前缀 = `max(24, pool 前缀 + 1)`（所以 `/24` 的池分成两个 `/25`，`/16` 的池分成 `/24`）；与已占用网段重叠的子网全部排除；`random` 用密码学随机从空闲里选，`sequential` 取第一个；无空闲 → `ValueError('network pool exhausted or overlaps host routes')` | `network.py:37-52` |
| N3 | `allocate_addresses(subnet, allocation, 2)`：可选偏移为 2 到 `地址数-2`（排除网络地址、Docker 网桥 `.1`、广播地址）；按 `random`/`sequential` 依次选两个不重复的 → `[gateway_ip, app_ip]` | `network.py:60-68` |
| N4 | `host_routes()`：读宿主机 `/proc/net/route`（**控制器在 host 网络命名空间里才有意义**），跳过表头，掩码非零的行（忽略默认路由）按小端解析为网段 | `network.py:25-34` |
| N5 | `proxy_outbound(proxy)`：`protocol` 只能是 `http`、`https`、`socks5`；`host` 非空且 ≤253；`port` 用 `int()` 转换（接受字符串 `"1080"`）且在 1–65535；用 `getaddrinfo(AF_INET, SOCK_STREAM)` 取**第一个**结果并要求是 IPv4；返回 `{server, server_port, username(缺省''), password(缺省'')}`。解析在控制器里做（不在业务网络里），结果固定在出站和网关防火墙里 | `network.py:71-84` |
| N6 | 业务防火墙 `business_rules(gateway_ip)`：`gateway_ip` 必须是 IPv4；`table inet ccg_app` 的 `output` 链 policy drop：已建立连接、到网关 53 的 UDP 和 TCP、`127.0.0.1:8787` 的 TCP、丢弃私有目的地址、放行其余 IPv4 TCP（没有 IPv6，UDP 只有受控的 DNS）。装载脚本 `NFT_REPLACE`：表已存在则 `delete table` 后与新规则一起 `nft -f -` 原子替换，否则直接 `nft -f /app.nft` | `network.py:91-103`、`manager.py:108-110` |

### 9.10 分块上传与导入（U）

| 编号 | 行为 | 出处 |
|---|---|---|
| U1 | 创建：`size` 必须是整数（不是布尔）且在 1..4 GiB；`sha256` 为 None 或 64 位**小写** hex；持全局锁先清过期上传（U6），未完成上传（`*.json` 中名字合规的）已有 4 个 → 409 `too_many_uploads`；id = `secrets.token_urlsafe(16)`（22 字符）；建 `.part` 与 `.json`（S29） | `images.py:186-204` |
| U2 | 写一块：id 不合规或不存在 → 404；持该上传的锁；偏移不等于 `.part` 当前大小 → 409 `offset_mismatch` + 当前偏移；`当前 + 长度 > size` → 400；从当前位置写，每次读至多 1 MiB，**恰好读满 `Content-Length` 字节**；请求体提前结束 → 截断回原偏移并 400；任何异常（含读超时）都截断回原偏移再抛出，偏移不前进 | `images.py:53-67,216-227` |
| U3 | 查询不加锁：`{"offset":<.part 大小>,"size"}`；删除：持锁，存在则删 `.part`、`.json` | `images.py:206-214` |
| U4 | 导入：持锁；未收齐 → 409 `incomplete`（**文件保留**）；算整个文件的 SHA-256，声明过且不符 → 400 `checksum_mismatch`；用超时 1800 s 的客户端 `docker load`（普通或 gzip 压缩的 tar），Docker 或 HTTP 错误 → 400 `load_failed`，导入结果为空 → 400 `load_failed`；成功 → R16 的应答。**除 `incomplete` 外，无论成败都删除上传文件** | `images.py:229-253` |
| U5 | 标签取自归档本身（`archive_tags`）：读归档里的 `manifest.json` 与 `index.json`（必须是普通文件且 ≤1 MiB）；经典存储以 `manifest.json` 里 `Config` 的摘要为镜像 ID，containerd 存储以 `index.json` 里带 `io.containerd.image.name` 注解的摘要为 ID，并把短标签与 `docker.io/library/…` 形式对应；归档读不出清单时用 Docker 报告的标签；读得出清单但对不上某个镜像 ID 时，该镜像的 `tags` 为空列表 | `images.py:45-50,79-123,256-260` |
| U6 | 过期清理：每次创建时执行；最后修改时间（`.json` 与 `.part` 的较晚者）超过 3600 s 的上传删除；正被写入或导入（拿不到该上传的锁）的跳过 | `images.py:162-184` |

### 9.11 目标镜像（I）

| 编号 | 行为 | 出处 |
|---|---|---|
| I1 | `GET /runtime/images` → 当前 `{"app","egress","controller":CCG_CONTROLLER_IMAGE}` | `runtime_admin.py:25-26` |
| I2 | `PUT /runtime/images`：校验（R18）；`{}` → 直接返回 `/health`，不写任何东西；持 `runtime_lock` 逐个角色：`ensure_image`（失败 503）；app 镜像按 V9 拒绝（400 `invalid_image`）；egress 镜像必须带 `io.sup2api.ccgateway.shared-egress=1`（否则 400 `invalid_image`，旧 sing-box 镜像进不来）；全部通过后才写 `runtime.json`（S4）、更新内存目标、清 M3；返回 `/health`。已有账号容器和运行中的网关都不受影响 | `runtime_admin.py:28-49` |
| I3 | 启动时恢复：见 S4 | `manager.py:211-223` |
| I4 | 目标镜像只用于**新建**的容器；`status` 用它报告 `image_update_available`；目标镜像本地不存在时连接和下发照常（不拉取，`target_image_available:false`） | `manager.py:305-312,947-964` |

### 9.12 控制器自升级（C）

| 编号 | 行为 | 出处 |
|---|---|---|
| C1 | `POST /runtime/controller`：请求恰好 `{"image"}`；环境文件路径必须是绝对路径且所在目录不是 `/`（否则 503）；持 `upgrade_lock`：`ensure_image`（503）；降级检查（C2）；辅助容器 `<控制器名>-upgrade` 正在运行 → 409 `upgrade_in_progress`，已结束则删掉；启动辅助容器（C3）；回 202 | `runtime_admin.py:51-72` |
| C2 | 降级检查：新镜像带 `io.sup2api.ccgateway.shared-egress=1` 标签 → 通过；否则只要共享网关有任何绑定 → 400 `invalid_request`（不声明共享网关的控制器接不住已绑定的账号）。**Go 版控制器镜像必须带这个标签**，否则 Python 0.1.118 拒绝升级到它 | `runtime_admin.py:74-79`、`Dockerfile:6` |
| C3 | 辅助容器：**用新镜像**运行 `python upgrade.py <ref>`，`remove=True`、`detach=True`、host 网络，环境 `CCG_RUNTIME_ENV_FILE`、`CCG_CONTROLLER_NAME`、`CCG_CONTROLLER_PORT`，挂载 Docker socket（读写）和环境文件**所在目录**（读写，同路径；单文件 bind mount 做 rename 会 EBUSY）。因此**新镜像里必须有能被 `python upgrade.py <ref>` 调起的自升级程序**（RB6） | `runtime_admin.py:58-71` |
| C4 | `upgrade.py` 主流程：先 sleep 1 s（让旧控制器写完 202）；镜像不合规或名字不合规 → `invalid_request`；读环境文件失败、缺 `CCG_RUNTIME_ROOT`（必须是绝对路径且不是 `/`）或 `CCG_CONTROLLER_KEY` → `install_failed`；原子写环境文件（C5），失败 → `install_failed`；`swap_controller`：只剩 `<名>-prev` 时先改回原名，删除残留 prev，当前容器改名为 prev（不停止），失败则恢复环境文件 → `install_failed`；`start_controller`：停止 prev（不存在也可以），按安装参数启动新控制器（O9）；等健康（C6）。成功 → 删除 prev → `done` | `upgrade.py:101-198` |
| C5 | 环境文件改写：去掉所有以 `CCG_CONTROLLER_IMAGE=`、`CCG_CONTROLLER_VERSION=` 开头的行（版本由镜像自带），末尾追加 `CCG_CONTROLLER_IMAGE=<ref>`；写 `<文件>.tmp`（0600）、fsync、改名。新控制器的环境 = 解析后的文件（只认 `KEY=VALUE` 行，跳过空行、`#` 行、无 `=` 行、键里有空白的行，值保留尾随空白）再强制写入 `CCG_CONTROLLER_NAME`、`CCG_CONTROLLER_PORT`（文件里有则取文件的，否则取参数）、`CCG_RUNTIME_ENV_FILE` | `upgrade.py:31-65,101-122` |
| C6 | 健康等待：`GET http://127.0.0.1:<端口>/health`（Bearer 密钥，不走代理，单次 3 s），`controller_image` 等于新 ref 才算成功；最多 60 s、每 2 s | `upgrade.py:68-77,156-163` |
| C7 | 失败回滚（启动失败或 60 s 内不健康）：删除新容器，prev 改回原名并启动 → `restored`；没有 prev → `removed`；改名或启动失败 → `restore_failed`；然后恢复环境文件原文。结果 `controller_unhealthy` + 回滚代码。输出最后一行 `CCG_RESULT=<结果>[ CCG_ROLLBACK=<回滚>]`，`done` 时退出码 0，否则 1 | `upgrade.py:86-98,188-212` |

### 9.13 孤儿清理（X）

| 编号 | 行为 | 出处 |
|---|---|---|
| X1 | 清单的 key 集合 = `<root>` 下名字合规、是目录、不是符号链接的 ∪ `backups/*.json`（名字合规、非符号链接）∪ 共享网关绑定的 key ∪ 带账号标签、标签值合规、名字符合 D2 规则的容器 ∪ 名字恰好为 `<p>-<key>-net`/`-uplink`（网络）或 `<p>-<key>-data`（卷）且标签值为该 key 的。超过 20000 个 → 503 | `cleanup.py:92-110` |
| X2 | 每个 key 持账号锁算快照摘要：资源行（容器 `app`/`egress`、网络 `net`/`uplink`、卷 `data`、其他运行环境容器以名字后缀为角色）各为 `[类型, 角色, ID, CreatedAt, Created, State.StartedAt]`；运行目录（是符号链接 → 失败）`['directory', inode, mtime_ns]`；`state.json`（是符号链接 → 失败）`['state', inode, mtime_ns, 内容 sha256]`；备份 `['backup', 内容 sha256]`；绑定 `['shared_binding', 绑定对象]`。全都没有 → 不列出；否则 `identity = sha256(json.dumps(列表, sort_keys=True))`。容器重启、状态改写、绑定变化都会改变摘要 | `cleanup.py:16-69` |
| X3 | 某个 key 的快照读不出（同名外部资源、符号链接、Docker 错误）→ 记一行 WARNING，照样列出，`identity = sha256('unreadable runtime ' + key)`，任何真实快照都不会等于它 | `cleanup.py:72-89` |
| X4 | `POST` 请求：对象且恰好两个键 `keep_keys`、`candidates`；两者都是列表且各 ≤20000；`keep_keys` 每项合规且不重复；`candidates` 每项是恰好有 `key`、`identity` 两个键的对象，`key` 合规且不重复，`identity` 为 64 位小写 hex。任何不合规 → 400，什么都不删 | `cleanup.py:113-130` |
| X5 | 逐个候选：在 `keep_keys` 里 → `kept`；否则持账号锁重算快照：没有 → `absent`；不等 → `changed`；相等 → `delete(key, account=True, purge=True)` → `deleted`；异常 → `failed`，`reason` 为 `resource_in_use`（`ResourceInUse`/`OwnershipMismatch`）或 `resource_cleanup_failed`。返回 `results`（按候选顺序）及 `deleted`、`failed` 计数 | `cleanup.py:131-154` |

### 9.14 代理域名复查（Q）

| 编号 | 行为 | 出处 |
|---|---|---|
| Q1 | `pinned_proxy(key)`：`egress-desired.json` 的 `proxy.host` 是非空字符串且不是 IP 字面量，且绑定的出站有固定地址 → `(host, int(port), 固定地址)`；否则 None（直连和 IP 字面量从不复查）。读文件或字段出错 → None | `manager.py:999-1018` |
| Q2 | `proxy_moved`：`getaddrinfo(host, port, AF_INET, SOCK_STREAM)` 的地址集合非空且不含固定地址 → 已迁移；解析失败不算证据 | `manager.py:1020-1032` |
| Q3 | `recheck_proxies`：遍历 `online` 中的 key（排序），非阻塞拿账号锁（拿不到就跳过：正在 apply，它会重新解析）；仍就绪且已迁移 → 记 WARNING 并清就绪（含 boots）。核心随后看到 `pending` 再次下发，重新解析并换出站。异常只记日志 | `manager.py:1034-1049` |

---

## 10. Docker 资源规格（O）

这些参数决定回滚后 Python 版能否认领 Go 版（经 guard）建出的资源，也是 guard `policy.py` 的输入。

| 编号 | 资源 | 规格 | 出处 |
|---|---|---|---|
| O1 | 名字 | 账号容器 `<p>-<key>-app`；遗留 `<p>-<key>-egress`；账号网络 `<p>-<key>-net`；遗留 `<p>-<key>-uplink`；数据卷 `<p>-<key>-data`；网关 `<p>-shared-egress`；网关网络 `<p>-d0000000000000000-xray-uplink`；一次性容器 `<p>-oneshot-<16 位 hex>`；读镜像文件的临时容器（Docker 随机名）；自升级辅助 `<控制器名>-upgrade`；旧控制器 `<控制器名>-prev` | `manager.py:242-243,336`、`shared_egress.py:124,179`、`runtime_admin.py:58`、`upgrade.py:172` |
| O2 | 标签 | 见 S39。账号容器：账号、`auth`=指纹、`image`=镜像 ID；账号网络：账号、`network`=策略 JSON；网关网络：账号=`d0000000000000000`、`network`=策略 JSON；数据卷：账号，有配额时另加配额标签；网关容器：`shared`=前缀 | `manager.py:327,369-370,401-409,657-658`、`shared_egress.py:184` |
| O3 | 账号容器 | 创建不启动；镜像为 PV8 选定的引用；`user=1000:1000`；只接 `<p>-<key>-net`，固定 `app_ip`；挂载：数据卷 → `/work`（读写）、`<root>/<key>/resolv.conf` → `/etc/resolv.conf`（只读）；内存 1 GiB（`mem_limit='1g'`）；`nano_cpus=2e9`；`init`；`cap_drop=ALL`；`no-new-privileges:true`；`pids_limit=256`；日志 json-file，20m × 3；**没有重启策略**（宿主机重启后由核心下发时 A7 启动）；环境见 PV16 | `manager.py:326-330,653-665` |
| O4 | 账号网络 | bridge；`internal=True`（网关网络为 False）；`enable_ipv6=False`；IPAM 一个池：子网 + 网关 `.1` | `manager.py:369-372` |
| O5 | 数据卷 | `local` 驱动；`driver_opts.size`=配额字节数（存储不支持配额时没有） | `manager.py:400-409` |
| O6 | 网关容器 | 创建不启动；网络 = 网关网络；`init`；`cap_drop=ALL`，`cap_add=[NET_ADMIN, NET_BIND_SERVICE]`；`no-new-privileges:true`；sysctl `net.ipv4.ip_forward=0`、`net.ipv6.conf.all.disable_ipv6=1`；`<root>/shared-egress` → `/config`（只读）；内存 384 MiB；`pids_limit=256`；`nano_cpus=2e9`；环境 `GOMAXPROCS=2`；重启策略 `unless-stopped`；日志 json-file，**10m** × 3 | `shared_egress.py:183-191` |
| O7 | 一次性容器 | ① 准备数据卷：账号镜像，`entrypoint=[sh,-ec]`，`user=0`，`network_mode=none`，数据卷 → `/work`（读写），**默认能力、没有 `no-new-privileges`**；② 配额校验：账号镜像，`entrypoint=[node]`，`user=1000:1000`，`network_mode=none`，`cap_drop=ALL`，`no-new-privileges`，数据卷 → `/work`（只读）；③ CLI 探测：账号镜像，`entrypoint=[node]`，`user=0`，`network_mode=none`，`cap_drop=ALL`，`no-new-privileges`，无挂载；④ 防火墙辅助：网关容器的镜像 ID，`entrypoint=[sh,-ec]`，默认用户，`network_mode=container:<账号容器 ID>`，`cap_drop=ALL`，`cap_add=[NET_ADMIN]`，`no-new-privileges`，`<key>/app.nft` → `/app.nft`（只读）。全部 `remove=True` 且起不来也删除（PV20） | `manager.py:332-352,411-421,653-655`、`cli_profiles.py:30-37` |
| O8 | 读镜像文件 | `containers.create(ref, entrypoint=['true'], network_disabled=True)`，从不启动，用完强制删除 | `dockerfs.py:157-166` |
| O9 | 自升级 | 辅助容器见 C3。新控制器：`restart=unless-stopped`，**host 网络**，环境见 C5，挂载 Docker socket（读写）与 `CCG_RUNTIME_ROOT`（同路径读写），日志驱动用守护进程默认值、`max-size=20m`、`max-file=3`。与核心安装脚本的 `docker run` 等价 | `upgrade.py:137-153`；core:`runtime.go:142-165` |

---

## 11. 输入校验规则全表（V）

| 编号 | 对象 | 规则 | 失败时 | 出处 |
|---|---|---|---|---|
| V1 | 运行环境 key | `(?:[1-9][0-9]{0,17}\|d[0-9a-f]{16})`，全匹配，必须是 `str`；用于路径、容器名、卷名之前必须先过这一关 | 路由不匹配 → 404；函数内 → 400 | `common.py:20-22,151-154` |
| V2 | 修订号 | `[a-f0-9]{64}` | 400 | `common.py:23`、`manager.py:701-703` |
| V3 | 镜像引用 | `[a-z0-9][a-z0-9._/-]{0,127}(:[A-Za-z0-9._-]{1,128})?(@sha256:[0-9a-f]{64})?` 或本地镜像 ID `sha256:[0-9a-f]{64}`（与核心 §49.16 同一规则） | 400 | `common.py:27-28,157-158` |
| V4 | CLI 版本 | `[0-9]{1,5}\.[0-9]{1,5}\.[0-9]{1,5}` | 400 | `common.py:25` |
| V5 | 认证 `auth` | 缺省 → `{"mode":"oauth"}`；必须是对象；`locale`、`timezone` 按 V6 校验（空串表示未设置，不写进结果）；键 ⊆ {mode, locale, timezone} 且 `mode=="oauth"` → OAuth；否则必须 `mode=="api_key"` 且键 ⊆ {mode, api_key, base_url, locale, timezone}；`api_key` 为字符串、长度 8–512、每个字符在 ASCII 33–126；`base_url` 缺省 `https://api.anthropic.com`，字符串、≤2048、不含空白，`https`、有主机名、无用户信息、不含 `?`、`#`；结果去掉结尾的 `/` 再去掉结尾的 `/v1` | 400 | `manager.py:126-149` |
| V6 | locale / timezone | locale：字符串、≤64、全匹配 `(?:C\|POSIX\|[A-Za-z]{2,3}(?:_[A-Za-z0-9]{2,8}){0,2})(?:\.[A-Za-z0-9-]{1,16})?(?:@[A-Za-z0-9]{1,16})?`；timezone：字符串、≤128、全匹配 `[A-Za-z][A-Za-z0-9_+-]{0,63}(?:/[A-Za-z0-9][A-Za-z0-9_+-]{0,63}){0,3}`；两者都不能是 `Local`；空串合法；`None`、数字等非字符串 → 失败 | 400 | `manager.py:113-123` |
| V7 | CLI 选择 `cli` | None（旧配置）合法；否则必须是恰好有 `version`、`request_mode`、`disable_auto_update` 三个键的对象，`version` 满足 V4，`request_mode` 为 `build` 或 `direct`，`disable_auto_update` 严格为 `true` | 400 | `cli_profiles.py:6-13` |
| V8 | 网络策略 | 见 N1 | 400 | `network.py:12-22` |
| V9 | 业务镜像 | 镜像 `Config.Env` 里不得有：`HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY`、`NO_PROXY` 及其小写形式，`ANTHROPIC_API_KEY`、`ANTHROPIC_BASE_URL`、`ANTHROPIC_AUTH_TOKEN`、`CLAUDE_CODE_OAUTH_TOKEN`、`CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR` | `InvalidImage`（`PUT /runtime/images` 为 400，`PUT config` 为 503） | `common.py:40-42,161-164` |
| V10 | 代理 | 见 N5（在 configure 里才校验） | 503（BUG-5） | `network.py:71-84` |
| V11 | 上传 id | `[A-Za-z0-9_-]{22}` | 路由不匹配 → 404；函数内 → 404 | `images.py:26-27,135-138` |
| V12 | 上传大小 / 校验和 | 整数非布尔、1..4 GiB；`sha256` 为 None 或 64 位小写 hex | 400 | `images.py:186-190` |
| V13 | 分块 | `X-CCG-Offset` 为 `[0-9]{1,12}`；`Content-Length` 为 `[0-9]{1,12}` 且 1..64 MiB；无 `Transfer-Encoding` | 400 | `http_api.py:289-292` |
| V14 | 请求体长度 | `[0-9]{1,12}`，见 H5 | 400 | `http_api.py:26,99-104` |
| V15 | 目标镜像请求 | 对象，键 ⊆ {app, egress}，值满足 V3 | 400 | `runtime_admin.py:28-32` |
| V16 | 单镜像请求 | 对象且键集合恰好为 {image}，值满足 V3（`worker`、`/runtime/controller`） | 400 | `common.py:221-227` |
| V17 | 成对激活请求 | 见 P1 | 400 | `runtime_updates.py:168-172` |
| V18 | 清理请求 | 见 X4 | 400 | `cleanup.py:113-130` |
| V19 | 控制器名 | `[a-z][a-z0-9-]{0,40}` | 启动失败；`upgrade.py` 返回 `invalid_request` | `common.py:29`、`manager.py:203-205` |
| V20 | 前缀 | `[a-z][a-z0-9-]{0,24}` | 启动失败 | `manager.py:162-163` |
| V21 | 磁盘配额默认值 | `CCG_ACCOUNT_DISK_GIB` 全匹配 `[1-9][0-9]{0,3}` 且 1..1024（拒绝 `0`、`-1`、`1.5`、`010`、`1025`、`10g`、空串） | 启动失败 | `manager.py:189-192` |
| V22 | 配额要求开关 | `CCG_ACCOUNT_DISK_QUOTA_REQUIRED` 为 `0` 或 `1` | 启动失败 | `manager.py:195-198` |
| V23 | 卷配额 | 驱动 `local`；`size` 为 `[1-9][0-9]{0,14}`；标签等于 `size`；1 GiB..1024 GiB | 503 `disk_quota_unavailable` | `manager.py:382-385` |
| V24 | 防火墙操作数 | 写进 nft 或路由的 IP 一律先 `IPv4Address` 规范化；网卡名去掉 `_`、`-` 后须为字母数字 | `ValueError` | `common.py:210-213`、`shared_egress.py:78-80`、`network.py:92` |
| V25 | CLI 清单条目 | 见 P2 | `ValueError` | `runtime_updates.py:64-79` |
| V26 | 维护租约 | `[a-f0-9]{48}` | 抛错（503） | `runtime_updates.py:20,224-225` |
| V27 | 控制器密钥 | 至少 32 个字符 | 启动失败 | `manager.py:1062-1064` |

---

## 12. 环境变量全表（EV）

| 变量 | 默认 | 读取位置与含义 | 出处 |
|---|---|---|---|
| `CCG_CONTROLLER_KEY` | 必填 | 管理密钥，≥32 字符；`upgrade.py` 从环境文件读它做健康检查 | `manager.py:1062`、`upgrade.py:113` |
| `CCG_RUNTIME_ROOT` | 必填 | 状态目录；`upgrade.py` 要求绝对路径且不是 `/`，并以同路径挂进新控制器 | `manager.py:1068`、`upgrade.py:113-116` |
| `CCG_APP_IMAGE` | 必填 | 目标 app 镜像（可被 S4 覆盖）；核心的 `inspectScript` 从控制器容器的环境读它 | `manager.py:1068`；core:`runtime.go:103-109` |
| `CCG_EGRESS_IMAGE` | 必填 | 目标 egress（共享网关）镜像；同上 | 同上 |
| `CCG_RUNTIME_PREFIX` | `ccg` | 资源名前缀（V20） | `manager.py:1069` |
| `CCG_CONTROLLER_PORT` | `8787` | 监听端口；自升级时传给辅助容器和新控制器 | `manager.py:206,1065` |
| `CCG_CONTROLLER_NAME` | `ccg-controller` | 自己的容器名（V19），自升级只碰这个名字 | `manager.py:203-205` |
| `CCG_CONTROLLER_VERSION` | `dev` | `/health.version`；镜像构建参数 `VERSION` 写入 | `manager.py:207`、`Dockerfile:9-10` |
| `CCG_CONTROLLER_IMAGE` | 空串 | `/health.controller_image`；核心用它判断自升级是否完成 | `manager.py:208` |
| `CCG_RUNTIME_ENV_FILE` | `/opt/ccgateway-runtime.env` | 自升级改写的环境文件 | `manager.py:209`、`upgrade.py:208` |
| `CCG_ACCOUNT_DISK_GIB` | `10` | 新数据卷的配额（V21） | `manager.py:189-192` |
| `CCG_ACCOUNT_DISK_QUOTA_REQUIRED` | `0` | `1` 时存储不支持配额就拒绝建卷（V22） | `manager.py:195-198` |
| `CCG_DEFAULT_CLI_VERSION` | 镜像内 `2.1.312` | 新建且未指定 CLI 时的默认版本；**每次下发时读**，不是启动时 | `manager.py:548-550`、`Dockerfile:11` |
| `CCG_XRAY_IMAGE` | 无 | 另行固定的网关镜像；只在构造 `SharedEgress` 时读 | `shared_egress.py:128` |
| Docker 客户端变量（`DOCKER_HOST` 等） | docker-py 默认 | `docker.from_env()` 读取；生产不设 | `manager.py:171,185` |
| 仅测试与人工脚本 | — | `TEST_RUNTIME_ROOT`（`shared_integration.py`、`shared_failure_test.py`）、`CCG_OFFLINE_DISPOSABLE`（`offline_migration_probe.py`） | — |
| 设计稿新增（0.1.118 没有） | — | `CCG_CONTROLLER_BIND`、`CCG_GUARD_URL`、`CCG_GUARD_TOKEN` | `CCGATEWAY-GUARD-DESIGN.md` §6.2、§8.2 |

核心安装脚本写的环境文件只有 `CCG_RUNTIME_ROOT`、`CCG_APP_IMAGE`、`CCG_EGRESS_IMAGE`、`CCG_CONTROLLER_IMAGE`、`CCG_CONTROLLER_KEY`、`CCG_CONTROLLER_PORT=8787`（core:`runtime.go:188-193`）。测试把控制器读取的环境变量列在 `test_manager.py:31-32`（`ENVIRONMENT`），每个测试开始前清空。

---

## 13. 回滚到 Python 0.1.118 的兼容清单（RB）

Go 版写下的东西，Python 0.1.118 接手时必须能原样读懂。按 guard 设计，数据根会从 `/opt/ccgateway-runtime` 搬到 `/opt/ccgateway-controller`、`shared-egress/state.json` 改名为 `shared-egress-state.json`；回滚（`release-controller`）时文件要搬回原位，下面的格式要求与位置无关。

| 编号 | 要求 | 违反的后果 |
|---|---|---|
| RB1 | `state.json` 保留第 5.4 节的全部字段名和取值（`status` 的五个值、`disk_quota.status` 的三个值、`auth_mode`、`environment*`、`cli`、`active_runtime`），**继续写 `egress_backend: shared_xray`**；不要写 Python 不认识但会改变它行为的字段（Python 忽略未知字段） | 字段缺失：例如缺 `admin_key` 会被当作新账号重新生成密钥并重建容器；`disk_quota` 缺失会被当作 `legacy_unbounded` |
| RB2 | `egress-desired.json` 保存核心下发的原文（去掉 `auth`），Python 的恢复和代理复查直接把它当作 `desired` 用 | 回滚后后台恢复失败，账号保持 pending 直到核心重新下发 |
| RB3 | 账号容器的 `io.sup2api.ccgateway.auth` 标签按 PV3 的 Python `json.dumps` 格式计算 | Python 判为凭据变化，第一次下发就重建所有账号容器（会中断请求，数据卷保留） |
| RB4 | `active_runtime.container_identity` 按 W12 的 Python 格式、用**完整的** Docker inspect 数据（`Labels` 全部、`Mounts` 每项全部字段：`Type`、`Name`、`Source`、`Destination`、`Driver`、`Mode`、`RW`、`Propagation`）计算。guard 设计 §6.1 的白名单只给 `Mounts[].{Type,Name,Source,Destination,RW}`，用它算出的字符串与 Python 存下的不同 | `_same_runtime` / `_keep_existing` 判断错误：可能把已激活的账号误判为需要成对激活（409）或允许本该拒绝的变更 |
| RB5 | `shared-egress/state.json` 保持 schema 1：`salt` 不变，`bindings` 九个字段、`nodes` 的 `outbound`/`endpoint` 结构不变；出站 tag 最好按 G5 的 Python 格式计算 | schema 不对 Python 启动失败；tag 格式不同只造成一次出站更替（旧 tag 等网关空闲时被回收） |
| RB6 | 控制器镜像带 `LABEL io.sup2api.ccgateway.shared-egress="1"`；并且要么镜像里保留可由 `python upgrade.py <ref>` 调起的自升级程序，要么接受"Python 0.1.118 无法经自升级切到 Go 镜像"（设计稿 §8.3 选择后者：辅助容器失败，旧控制器不受影响） | 缺标签：有绑定时 Python 拒绝升级（400） |
| RB7 | `runtime.json` 的 `env` 记录启动时的环境变量；`backups/<key>.json`、`worker-backups/` 命名、上传文件格式保持一致 | 目标镜像覆盖值被丢弃；备份轮换或清理快照出错 |
| RB8 | Docker 资源名字、标签、`size` 选项按第 10 节；账号容器只接一张网络，地址等于 `state.app_ip`（G4 会核对）；网关归属标签等于前缀 | Python 认领失败：`OwnershipMismatch`、`account network identity changed` |
| RB9 | 内存状态不迁移：回滚后 Python 的 `online` 为空，约 10 s 后对每个 `ready` 账号重新 apply 一次（G15）；Go 版接管时同理 | 每次切换控制器实现都有一次全量重新激活，应安排在低峰 |

---

## 14. 测试 → 行为条目对照表

共 196 项（`python -m unittest discover -p 'test_*.py'`）。`test_manager.py` 的 `FakeDocker`/`FakeShared` 是内存模型，大部分 Manager 测试**不经过真正的 `SharedEgress`**；共享网关的 `configure`、`attach`、`sync`、`fence`、`collect`、`load_inventory`、`create` 没有单元测试（只有 `shared_integration.py`、`shared_failure_test.py` 两个真机脚本），Go 版移植时应补上。

### 14.1 `test_manager.py`（75）

| 测试 | 条目 |
|---|---|
| `DiskQuotaTests.test_invalid_disk_defaults_are_rejected_before_state_is_opened` | V21、E5 |
| `…test_new_account_uses_a_hard_volume_quota_and_passes_the_verified_limit` | PV9、PV16、O3、O5 |
| `…test_new_account_container_carries_the_telemetry_switches` | PV16 |
| `…test_unsupported_storage_creates_an_unbounded_volume_and_reports_it` | PV9、R1（`support`） |
| `…test_required_quota_never_creates_an_unlimited_fallback` | PV9、V22 |
| `…test_invalid_quota_requirement_is_rejected` | V22、E5 |
| `…test_failed_mount_verification_keeps_the_working_runtime` | PV10、PV2（先校验后拆除） |
| `…test_default_changes_do_not_resize_existing_data` | PV9 |
| `…test_legacy_data_is_preserved_and_not_claimed_to_have_a_quota` | PV8、PV9、S13 |
| `…test_unowned_or_inconsistent_volumes_cannot_be_adopted` | PV9、V23 |
| `…test_a_previously_enforced_volume_cannot_silently_become_legacy` | PV8、PV9 |
| `…test_an_enforced_account_never_falls_back_to_an_unbounded_volume` | PV8、PV9 |
| `KeyTests.test_key_pattern` | V1 |
| `KeyTests.test_routes_only_accept_valid_keys` | H3、H4、R23 |
| `ManagerTests.test_direct_runtime_without_proxy` | A4、BL1 |
| `…test_oneshot_removes_a_container_that_could_not_start` | PV20 |
| `…test_failed_migration_draft_left_by_an_older_controller_is_only_discarded` | A2、S22、D1 |
| `…test_missing_default_image_does_not_break_existing_connection` | I4、Y3、Y5、PV5 |
| `…test_network_change_recreates_containers_keeps_volume_and_keys` | A5、PV12、PV14、N3、S5、S6 |
| `…test_new_account_has_no_egress_container_or_uplink` | R7、PV13 |
| `…test_runtime_left_by_an_own_egress_controller_drops_its_uplink_address` | PV15、S23 |
| `…test_invalid_network_does_not_interrupt_existing_runtime` | A2、N1 |
| `…test_exhausted_pool_does_not_interrupt_existing_runtime` | PV11 |
| `…test_guard_and_paths_reject_traversal` | V1 |
| `…test_first_provision_records_created_at_and_image` | PV15、S11、O2 |
| `…test_image_change_keeps_app_and_volume` | PV5、I4 |
| `…test_container_without_image_label_uses_inspect_data` | PV5（`image_of`） |
| `…test_bad_new_image_keeps_running_container` | PV5、V9 |
| `…test_image_change_only_reports_available_update` | Y3、I4、A6 |
| `…test_controller_restart_keeps_old_image_and_new_accounts_use_new_default` | M1、PV8、PV18 |
| `…test_environment_changes_preserve_existing_runtime` | PV6、PV7 |
| `…test_environment_change_applied_in_place_by_worker` | PV7、S17–S20 |
| `…test_environment_retried_after_worker_failure` | PV7 |
| `…test_environment_set_at_creation_cannot_be_cleared_in_place` | PV7、S18 |
| `…test_new_container_discards_in_place_environment` | PV17 |
| `…test_pull_failure` | PV18 |
| `…test_delete_draft_removes_everything_and_is_idempotent` | D1、D5、D6 |
| `…test_delete_refuses_account_keys` | D1、V1 |
| `…test_delete_account_runtime_when_named_explicitly` | D1、D5、S28 |
| `…test_delete_refuses_foreign_resources` | D2 |
| `…test_delete_tolerates_a_network_removed_meanwhile` | D5 |
| `…test_delete_purges_an_own_egress_left_by_an_older_controller` | D2、D6 |
| `…test_network_change_removes_an_own_egress_left_by_an_older_controller` | PV12、PV13 |
| `…test_delete_removes_ended_helpers_in_the_runtime_namespace_or_directory` | D4 |
| `…test_delete_purge_removes_suffixed_rollback_containers` | D2、D6 |
| `…test_delete_refuses_foreign_container_on_the_volume_and_removes_nothing` | D3 |
| `…test_delete_removes_stale_helpers_but_not_a_running_one` | D3、D4 |
| `…test_delete_never_touches_another_prefix_with_the_same_key` | D2 |
| `…test_delete_without_purge_keeps_volume_and_backup` | D1、D5、S28 |
| `…test_delete_failure_propagates_and_retry_completes` | D7 |
| `…test_runtimes_lists_state_directories` | Y4、S11 |
| `HandlerTests.test_errors_are_english_codes` | H1、H3、H6、H9、H10、H11、R11、A8 |
| `…test_health` | H1、R1 |
| `…test_unsupported_disk_quota_has_a_specific_error` | H10、PV9 |
| `…test_explicit_account_delete_purges_data` | R3 |
| `…test_delete_with_a_foreign_volume_user_is_a_conflict` | R3、D3、H11 |
| `…test_delete_with_a_same_name_foreign_resource_is_a_conflict` | R3、H10、H11 |
| `…test_cleanup_http_requires_auth_and_complete_snapshot` | R20、R21、X4、X5 |
| `…test_cleanup_accepts_inventory_larger_than_normal_management_body` | H5、R21、R1 |
| `…test_delete_and_list` | R2、R3 |
| `…test_session_pass_through` | T9、T10、T11 |
| `…test_request_logs_pass_through` | T9 |
| `…test_request_log_read_reports_its_range` | T12 |
| `…test_features_read_only_pass_through` | T9 |
| `…test_cli_management_is_a_plain_pass_through` | T9、T11、R23 |
| `…test_pass_through_never_forwards_caller_headers` | T11 |
| `…test_usage_pass_through` | T9、T10 |
| `…test_api_key_accounts_reject_oauth` | T10 |
| `ConnectionTests.test_request_path_never_waits_unbounded_for_the_account_lock` | K2 |
| `ConnectionTests.test_connection_reads_readiness_without_image_lookups` | Y1、Y5 |
| `ProxyRecheckTests.test_moved_proxy_host_makes_the_runtime_pending` | Q2、Q3 |
| `ProxyRecheckTests.test_new_resolution_reconfigures_the_gateway_at_the_same_revision` | Q3、A6 |
| `ProxyRecheckTests.test_address_literal_and_direct_are_never_rechecked` | Q1 |
| `EnvironmentValidationTests.test_locale_and_timezone_shapes` | V5、V6 |
| `ConnectionStateTests.test_connection_requires_current_ready_revision_and_keeps_key_private` | Y5、R6、Y1 |

### 14.2 `test_worker.py`（30）

| 测试 | 条目 |
|---|---|
| `test_updated_new_image_path` | W1、W3、W6、W7、W8、W13 |
| `test_updated_legacy_ccgateway_path` | W3 |
| `test_unchanged` | W4 |
| `test_busy_all_along_changes_nothing` | W5 |
| `test_waits_until_idle` | W5 |
| `test_busy_on_second_check_discards_staged_file` | W7 |
| `test_not_running` | W2 |
| `test_not_found` | W2 |
| `test_unsupported_container` | W3 |
| `test_backup_must_be_a_regular_file` | W6 |
| `test_rolled_back_when_unhealthy` | W10 |
| `test_rollback_unhealthy` | W10 |
| `test_rollback_into_exited_container` | W10 |
| `test_failed_restart_is_never_reported_healthy` | W8 |
| `test_container_changed_before_replacement` | W12 |
| `test_container_changed_after_restart` | W12 |
| `test_container_replaced_by_name` | W12 |
| `test_activation_failure_only_clears_readiness` | W11 |
| `test_offline_account_is_not_activated` | W11 |
| `test_rules_return_right_after_restart_before_health_wait` | W9 |
| `test_backups_keep_newest_five` | W6、S27 |
| `test_image_without_program` | W1 |
| `test_pull_failure` | W1、PV18 |
| `ProgramArchiveTests.test_read_single_file` | W1 |
| `ProgramArchiveTests.test_image_container_removal_failure_keeps_the_real_error` | O8、W1 |
| `ProgramArchiveTests.test_tar_file_is_root_0755` | W7 |
| `ProgramArchiveTests.test_worker_idle_truncates_comm` | W5 |
| `ProgramArchiveTests.test_route` | H4 |
| `WorkerHandlerTests.test_http` | R9、H5、W13 |
| `WorkerHandlerTests.test_http_errors` | R9、H10、W3、W12 |

### 14.3 `test_runtime_updates.py`（14）

| 测试 | 条目 |
|---|---|
| `test_pair_switch_retains_container_and_old_cli` | P5、P7、S36 |
| `test_unhealthy_pair_rolls_back_both_files_and_state` | P9 |
| `test_failed_identity_health_rolls_back_pair` | P6、P9 |
| `test_busy_does_not_swap_or_restart` | P3、W6 |
| `test_staged_cli_is_checked_for_the_required_capabilities` | P4 |
| `test_cli_verification_failure_leaves_current_pair` | P4 |
| `test_input_cannot_choose_paths_or_partial_components` | P1、V17 |
| `test_reactivation_failure_after_resume_never_rolls_back_or_restarts` | P7、P8 |
| `test_incomplete_rollback_does_not_resume_mixed_pair` | P8、P9 |
| `test_rollback_stays_paused_across_restart_until_health_is_confirmed` | P9 |
| `test_unhealthy_rollback_stays_paused` | P9 |
| `test_native_legacy_without_manifest_gets_sealed_rollback_snapshot` | P10、S38 |
| `test_legacy_without_observed_request_modes_is_not_assumed_migratable` | P10 |
| `ReleaseIdentityTests.test_rejects_escape_or_unverified_entry` | P2、V25 |

### 14.4 `test_cleanup.py`（17）

| 测试 | 条目 |
|---|---|
| `test_account_purge_removes_containers_networks_volume_and_state` | X1、X2、X5、D5 |
| `test_rollback_copy_alone_is_found_identified_and_purged` | X1、X2、D2 |
| `test_other_prefix_and_unrelated_names_are_not_inventoried` | X1、O1 |
| `test_foreign_user_of_the_volume_is_reported_in_use` | X5、D3 |
| `test_disabled_account_and_authorization_preparation_are_kept` | X5 |
| `test_missing_state_still_finds_owned_resources` | X1、X2 |
| `test_changed_runtime_and_new_runtime_are_not_deleted` | X2、X5 |
| `test_foreign_resource_is_checked_before_any_deletion` | X5、D2 |
| `test_own_egress_left_by_an_older_controller_is_inventoried_and_purged` | X1、X2、D2 |
| `test_one_unreadable_runtime_does_not_fail_the_inventory` | X3、X5 |
| `test_invalid_or_incomplete_request_does_not_delete` | X4、V18 |
| `test_shared_gateway_binding_detached_without_removing_gateway` | G13、D5 |
| `test_failure_is_reported_and_retry_completes_remaining_resources` | X5、D7 |
| `test_backup_only_runtime_is_found_and_purged` | X1、S28 |
| `test_state_missing_directory_with_logs_is_purged` | X1、D5 |
| `test_shared_binding_without_account_state_is_removed_in_place` | X1、G12 |
| `test_shared_cleanup_does_not_start_stopped_gateway` | G12 |

### 14.5 其余文件

| 文件 | 测试 | 条目 |
|---|---|---|
| `test_cli_profiles.py`（7） | `test_retired_agent_mode_requires_explicit_activation_and_keeps_data` | PV4、PV5、PV8 |
| | `test_new_authorization_runtime_uses_controller_default` | PV8（`CCG_DEFAULT_CLI_VERSION`） |
| | `test_new_default_does_not_upgrade_existing_302_container` | PV5、PV8 |
| | `test_creation_passes_version_and_disables_updaters` | PV16、PV19、PV5、PV8 |
| | `test_active_runtime_version_does_not_recreate_account` | PV4、PV5、S16 |
| | `test_bad_profile_does_not_replace_container` | V7、A2 |
| | `test_missing_packaged_version_preserves_existing` | PV8、PV19 |
| `test_headers.py`（1） | `test_pass_through_carries_only_the_account_admin_key` | T11 |
| `test_network.py`（7） | `test_private_pool_and_modes` | N1、V8 |
| | `test_sequential_skips_host_and_docker_routes` | N2、N3 |
| | `test_random_subnet_and_unique_hosts` | N2、N3 |
| | `test_small_custom_pool_and_exhaustion` | N2、N3 |
| | `test_proxy_pinned_to_its_resolved_address` | N5 |
| | `test_rejects_untrusted_network_operands` | N5、N6、V24 |
| | `test_business_has_no_ipv6_or_udp_bypass` | N6 |
| `test_runtime.py`（11） | `RuntimeImageTests.test_get_and_put_persist_across_restart` | I1、I2、I3、S4、M3 |
| | `…test_changed_environment_discards_override` | I3、S4 |
| | `…test_empty_put_writes_nothing` | I2 |
| | `…test_put_both_and_local_image_id` | I2、V3 |
| | `…test_rejections_leave_targets_unchanged` | R18、I2、V9、V15 |
| | `…test_old_format_or_invalid_files_are_discarded` | I3、S4 |
| | `ControllerUpgradeTests.test_starts_helper_from_new_image_and_returns_202` | R19、C1、C3 |
| | `…test_custom_name_port_and_env_file` | C1、C3、EV |
| | `…test_invalid_controller_name_refuses_to_start` | V19、E5 |
| | `…test_running_helper_conflicts_and_finished_one_is_replaced` | C1 |
| | `…test_rejections` | R19、V16 |
| `test_shared_egress.py`（10） | `test_full_snapshot_preserves_other_accounts_and_denies_unknown` | G6 |
| | `test_proxy_credentials_tls_and_versioned_identity` | G5 |
| | `test_firewall_requires_interface_and_source_and_blocks_forwarding` | G7、G6、V24 |
| | `test_new_account_is_bound_to_the_shared_gateway` | A7、S8、S21、S25 |
| | `test_failed_gateway_configuration_leaves_the_runtime_offline` | A1、A7、S10 |
| | `test_gateway_restart_is_recovered_in_the_background` | G15、Y2、Y1 |
| | `test_blocked_runtime_releases_its_binding` | BL1、G12、G15 |
| | `test_gateway_image_is_the_egress_image_unless_pinned` | E3、G17 |
| | `test_recovery_drops_own_egress_leftovers_once` | G16、PV13、S21 |
| | `test_failed_cleanup_is_retried_and_keeps_the_account_online` | G16 |
| `test_tunnel.py`（5） | `test_tunnel_carries_http_with_streaming_and_half_close` | T4、T5、T6 |
| | `test_upgrade_header_case_and_connection_list` | T1 |
| | `test_rejections` | T1、T2、H1 |
| | `test_stopped_runtime_is_not_synchronized` | T2、Y1 |
| | `test_unreachable_account_is_runtime_unavailable` | T3 |
| `test_upgrade.py`（11） | `test_success_replaces_controller_and_drops_prev` | C4、C5、C6 |
| | `test_residual_prev_is_removed_first` | C4 |
| | `test_interrupted_upgrade_left_only_prev` | C4 |
| | `test_unhealthy_new_controller_is_rolled_back` | C7 |
| | `test_failed_start_is_rolled_back` | C7 |
| | `test_rollback_without_previous_controller` | C7 |
| | `test_invalid_input_touches_nothing` | C4、V19 |
| | `test_name_and_port_reach_the_new_controller_without_env_lines` | C5 |
| | `test_prev_gone_before_start_still_runs_the_new_controller` | C4 |
| | `test_parse_env_matches_env_file_rules` | C5 |
| | `HealthImageTests.test_reads_controller_image_with_key` | C6 |
| `test_uploads.py`（8） | `test_resumable_upload_and_load` | U1、U2、U3、U4、R12–R16 |
| | `test_tags_come_from_the_archive_manifest` | U5 |
| | `test_checksum_mismatch_and_load_failure_delete_the_upload` | U4 |
| | `test_create_validation` | U1、R12、V12 |
| | `test_chunk_header_validation` | R13、V13 |
| | `test_interrupted_chunk_is_discarded` | U2 |
| | `test_pending_limit_stale_cleanup_and_delete` | U6、U3 |
| | `test_old_endpoints_are_gone` | R23 |

### 14.6 没有测试覆盖的条目（移植时建议补）

H2（非常规方法 501）、H1 的"无 `Bearer ` 前缀"、H8 的逐项连接关闭、T7（隧道空闲超时与出错拆除）、T12 的压缩应答处理、T13、K4（请求路径等共享网关锁）、K10、B1/B2 的循环本身、Y4 的符号链接排除、G2–G4、G8–G10、G14、Q3 的"拿不到锁就跳过"、C1 的环境文件路径检查、C2 的降级拒绝、U5 的 containerd `index.json` 分支以外的混合情形、X2 中容器重启导致摘要变化、PV3 的指纹字节格式（建议用 Python 生成的固定样例做跨语言对照）、W12 的 `container_identity` 字节格式、G5 的 tag 字节格式。

---

## 15. 现有缺陷、不一致与可疑行为（只记录，不修）

| 编号 | 问题 | 出处 |
|---|---|---|
| BUG-1 | **请求路径的限时不完整**：`connection`、隧道、透传只给账号锁设了 20 s 上限，但 `readiness()` 调 `SharedEgress.healthy()`，它**不限时**地等共享网关锁。另一个账号的 `configure`（含多次 `xray api` 和 `nft` 执行）或每 10 s 一次的 `collect` 持有这把锁时，所有账号的新连接、`status`、`GET /accounts` 都会排队 | `manager.py:933-934`、`shared_egress.py:297-304` |
| BUG-2 | `readiness()` 的文档说"两次 inspect"，实际每次是四次 Docker 调用（`owned(app)`、`shared.container()`，`healthy` 里再各一次），每个模型请求的 `connection` 和每条隧道都要付出 | `manager.py:926-940`、`shared_egress.py:300-301` |
| BUG-3 | **被拒绝的新配置会在约 10 秒后被报为"已就绪"**（推断自代码，未实测）：已有状态时，`egress-desired.json` 在 provision **之前**写入（A3）。若这次下发在拆除任何东西之前失败（409 `cli_profile_unavailable`、503 `disk_quota_unavailable` / `image_pull_failed` 等），`apply` 清掉内存就绪，但 `state.json` 仍是旧修订号且 `status=ready`、容器仍在运行。下一轮后台恢复（G15，≤10 s）看到"`ready` 但未就绪"，就用**新的** `egress-desired.json`（不含 `auth`）执行共享网关 apply，`activate` 把 `state.revision` 写成新修订号并标记就绪。核心随后 `GET status` 看到 `ready` 且修订号相符，不再下发——新配置要求的凭据、CLI 或网络变化实际从未生效，409/503 被掩盖。原地更新 Worker 后的重新激活（W11）只核对 `state.revision`，也用同一个文件，存在同样问题 | `manager.py:681-683`、`shared_egress.py:432-438`、`worker_update.py:153-167` |
| BUG-4 | `PUT /runtime/images` 改了 egress 镜像后，已构造的 `SharedEgress.image` 不变（启动时就构造了，E3）。同一进程里之后**新建**的网关仍用旧镜像，直到控制器重启；与 §57 和 README"之后新建的网关才用新镜像"不符 | `shared_egress.py:128`、`runtime_admin.py:44-47` |
| BUG-5 | 代理设置不在 `_validate_desired` 里校验：缺 `host`、端口越界、协议不支持等要等到 `configure` 才报 `ValueError`/`KeyError`，此时账号容器已经建好，答复是 503 `runtime_unavailable`（带堆栈），状态记为 `egress_error`；README 声称是 400 `invalid_request`。另外 `proxy: {}`（空对象）被当作"没有代理"而阻断 | `manager.py:684,692-710`、`network.py:71-84`、`README.md:180-181` |
| BUG-6 | 错误码不一致：同为"镜像不合格"，只换 Worker 时回 400 `invalid_image`，成对激活的镜像包校验失败（清单、哈希、非 ELF）却回 503 `runtime_unavailable`；`PUT config` 遇到带凭据变量的业务镜像（`InvalidImage`）也回 503，而 `PUT /runtime/images` 回 400 | `runtime_updates.py:118-128`、`http_api.py:42-46` |
| BUG-7 | 成对激活：Worker 的 `pause` 已成功、但返回的租约不合规时，抛错退出而**不恢复准入**（也无法恢复：没有合法租约），账号保持暂停直到人工处理。`_begin` 遇到没有状态的运行环境会以 `AttributeError` 结束（503） | `runtime_updates.py:220-225,210-213` |
| BUG-8 | 成对激活在 `validate` 返回忙时提前返回 `busy`，但已放进容器的新版本目录（含最大 512 MiB 的 CLI）不清理；指针临时文件在放置后、替换前出错时也不清理（只清理临时 Worker）。`legacy_selection` 在空闲检查之前就往容器里写快照清单，每次 `busy` 重试都会多一个文件 | `runtime_updates.py:150-153,250-256,195-196` |
| BUG-9 | 原地更新 Worker 的重新激活（W11）里，`same_container` 在 `try` 之外：程序已经换好并健康，只因容器身份此刻变化，整个请求就回 503 `container_changed`，调用方看不到"已更新" | `worker_update.py:153-156,204` |
| BUG-10 | 同名外部容器在 `POST worker` 上回 404 `not_found`（`OwnershipMismatch` 是 `ValueError`，被 `running_worker` 当作"没有容器"），与 §49.14"其他接口为 503 `runtime_unavailable`"不一致 | `worker_update.py:52-55` |
| BUG-11 | 鉴权的两处宽松：`removeprefix('Bearer ')` 让不带前缀的裸密钥也能通过；`Authorization` 含非 ASCII 字符时 `hmac.compare_digest(str, str)` 抛 `TypeError`，异常逃出处理函数，连接被断开且没有应答（日志里有堆栈） | `http_api.py:117-118` |
| BUG-12 | HEAD、PATCH、OPTIONS 等方法由 `http.server` 回 501 HTML，**在鉴权之前**，也不是约定的 JSON 405 | `http_api.py:142` |
| BUG-13 | 网关归属标签不符时，`delete` 在 `_detach_shared` → `remove` → `container()` 处抛 `RuntimeError`，答复 503 `runtime_unavailable`，而不是 409 `resource_in_use`；`readiness()` 同理会让请求路径 503。`attach` 按名字取账号网络时不核对归属标签 | `manager.py:886-892`、`shared_egress.py:134-138,210` |
| BUG-14 | `_run` 的 `finally` 在提交或回滚已恢复准入后再调一次 `resume`（多一次管理请求，无害） | `runtime_updates.py:197-198,287,315` |
| BUG-15 | `test_manager.py` 中部（`HandlerTests` 之后）有 `if __name__ == '__main__': unittest.main()`，直接 `python test_manager.py` 运行时，其后的 `ConnectionTests`、`ProxyRecheckTests`、`EnvironmentValidationTests`、`ConnectionStateTests` 共 7 项不会执行；`unittest discover` 不受影响 | `test_manager.py:1358-1359` |
| BUG-16 | 还没有共享网关时（新宿主机、没有任何账号），`collect()` 每 10 s 抛 NotFound，写一行 `shared egress pass failed` 告警，日志噪声 | `shared_egress.py:385,446-447` |
| BUG-17 | 网关防火墙 `output` 链里多条 accept 规则来自 Python `set`，每个进程的迭代顺序不同（字符串哈希随机化），所以 `active.nft` 的文本不稳定（语义等价）。Go 版的测试不要比较 Python 生成的原文 | `shared_egress.py:93-101` |
| BUG-18 | 运行环境目录的识别不一致：`runtimes()` 和清理清单排除符号链接，后台恢复的 key 集合用 `is_dir()`（跟随符号链接）。网卡名校验用 `str.isalnum`，接受 Unicode 字母数字 | `manager.py:907`、`cleanup.py:93`、`shared_egress.py:78,408` |
| BUG-19 | 文档过时：`controller/README.md` 的接口表仍列出 `/accounts/<key>/v1/messages` 透传、"账号 id 删除 → 405"（现在可带确认头删除）以及过少的 `status` 字段；CONTRACTS §53.5 说旧模型转发代码"还在"，实际已删除，该路径回 404；README 的错误说明把代理设置错误归为 400（见 BUG-5） | `README.md:151-189`、CONTRACTS §53.5 |
| BUG-20 | 安全相关（guard 设计已覆盖）：准备数据卷的一次性容器以 root 运行，保留 Docker 默认能力且没有 `no-new-privileges`；`resolv.conf`、`app.nft`、`shared-egress/` 这些 bind mount 源都在控制器可写的目录下（设计稿 §2.4）；`shared-egress/state.json` 含全部代理凭据却随目录挂进网关 | `manager.py:654-655,664`、`shared_egress.py:188` |
| BUG-21 | `GET /accounts/<key>/status` 对已阻断的运行环境报 `pending`，`GET /accounts` 报 `blocked`，两处不一致（核心为此在 §49.18 加了"10 分钟内不重复阻断"）；对不存在的 key 也回 200 `pending` | `manager.py:918-924,961` |
| BUG-22 | 网段耗尽（PV11）是 `ValueError`，答复 503 `runtime_unavailable` 并打印堆栈，而网络策略本身不合规是 400；核心看到的都是"运行环境不可用"，无法区分"池满了" | `network.py:49-50`、`manager.py:574-580` |
| BUG-23 | 宿主机重启后账号容器（无重启策略）保持停止，后台恢复也不启动它们（G15），只能等核心下一轮对账发现 `pending` 再下发。不是错误，但切换实现时容易被当成回归 | `manager.py:660-665`、`shared_egress.py:435-436` |

---

## 16. Go 重写最容易出错的地方

1. **三处要与 Python 逐字节一致的 JSON 摘要**：凭据指纹（PV3）、`container_identity`（W12、RB4）、出站 tag（G5）。Python `json.dumps` 默认用 `", "`/`": "` 分隔、`ensure_ascii`、按码点排键；Go 的 `encoding/json` 默认紧凑、不转义非 ASCII、还会转义 `<>&`。指纹不一致会让 Go 版在第一次下发时重建全部账号容器；`container_identity` 还依赖完整的 Docker inspect 字段，guard 白名单子集会让它对不上。
2. **锁的可重入与等待上限**（K1–K10）：Go 的互斥锁不可重入（`clean_one`→`delete`、`provision`→`ensure_network`、`apply` 的失败 fence）；请求路径只能等账号锁 20 s，而共享网关锁不限时（BUG-1，Go 版应决定是保持还是修正，并写进契约）；`online`、`boots`、共享状态的无锁读写要换成真正的同步。
3. **HTTP 边界语义**（H3、H5、H8、T5、T12）：按原始请求目标（含查询串）匹配；`Content-Length` 严格十进制、先读完再分派；哪些应答关闭连接；隧道建立后要先转发 `bufio.Reader` 里已缓冲的流水线字节；半关闭；透传不带 `Content-Length`、`Connection: close`、只转发四个日志头，并处理好 `Accept-Encoding`。Go 的 `net/http` 默认会规范化路径、自动处理 keep-alive 和压缩，需要显式绕开或 hijack。
4. **磁盘状态与 inode 语义**（S1、S25、S4、RB1–RB7）：`state.json` 全部字段与取值、继续写 `egress_backend`；`resolv.conf` 新建容器前换 inode、apply 时原地写；`.tmp` 临时名、0600/0644/0700 权限；`runtime.json` 的 `env` 守卫；`egress-desired.json` 的写入时机。这些决定插件能否回滚到 0.1.118。
5. **两个原地更新的状态机**（W、P）：`was_online`、`switched`/`safe`/`reopened`、租约随指针跨重启保持暂停、"恢复准入之后绝不回滚"、不健康回滚后保持暂停；以及每一步都核对 `container_identity`。测试只覆盖了模拟容器，Go 版要逐条移植 `test_worker.py` 与 `test_runtime_updates.py` 的断言。

另外两处也值得单独核对：每个端点组的"具名错误子集"（H10，决定同一异常在不同端点是 400、404、409 还是 503）；控制器重启后后台恢复会把所有 `ready` 账号重新 apply 一次（G15、RB9）。
