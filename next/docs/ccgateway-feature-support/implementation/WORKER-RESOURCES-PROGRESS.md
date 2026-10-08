# Worker Files / Skills 资源承载进度

证据日期：2026-10-08。本批只说明 Worker 资源传输及身份基础，不能据此宣称 Code Execution、Skills 执行、PTC 或 Messages 的 file_id 已完整开放。

## 已实现接口

- `/_ccgateway/resources/identity`：Worker API key 鉴权，返回 `principal_id`、`generation`、`auth_type`。
- `/_ccgateway/resources/v1/files...`、`.../v1/skills...`：共享 `contracts/resources.ValidateOperation` 的固定方法 / 路径 / query 白名单。不可指定任意主机或 `/messages`。
- 普通资源操作必须携带核心核实的 `X-CCGateway-Resource-Principal`、`X-CCGateway-Resource-Generation`，不匹配返回 409；实际资源操作不发往提供方。
- API key 模式必须管理配置 `CCG_RESOURCE_ISSUER_ID` 与 `CCG_RESOURCE_ISSUER_GENERATION`。不使用 API key 或 token 摘要冒充稳定 workspace 身份。
- OAuth 模式使用真实 CLI 认证，经同一代理线路固定 GET `/api/oauth/profile`。当前严格解析 `account.uuid` 与 `organization.uuid`，仅返回加域哈希，不暴露标识原文。
- OAuth `authMethod` 支持本地真实 CLI `oauth_token` 与线上 #22 只读确认的 `claude.ai`，均要求 `apiProvider=firstParty`。未知认证形态明确不可用。

资源身份独立持久化到 `DataDir/resource-identity/identity-v1.json`，先持久化再返回。实际核验同 issuer 的刷新 / 重新授权保留 generation；issuer 改变或 API key 管理 epoch 改变才生成新 generation。写入有 OS 文件锁和原子 rename。诊断消息所有权 epoch 仍按原语义轮换，不再作为资源 epoch。修复了 Runtime 构造 authManager 遗漏 diagnostics authorizationChanged 回调的问题。

## CLI 认证载体

资源负载不进入 CLI 消息。Worker 启动隔离真实 CLI，使用既有 nonce + Mod scope 验证唯一主请求后，将该请求替换为固定资源方法、路径和原始 body。CLI 自身认证头不导出给核心。辅助请求拒绝；一次 carrier 最多 dispatch 一次。资源模式没有 HistoryCache.Prepare、会话提交或响应 checkpoint，CLI 使用 `--no-session-persistence`。

提供方状态码、二进制 / JSON body 在送入 CLI 之前完整截获。没有合成模型响应，没有收费 `/messages` 请求。资源响应头只保留现有安全事实及必要 Content-Type / Content-Disposition / Content-Encoding / ETag / Last-Modified；不传认证、Cookie 或 Connection 指定的逐跳头。gzip 若被 Go transport 自动解压则按实际解码 body 返回长度，其它保留编码事实。产品 beta 保留客户端字段；只从 CLI 保留已知 OAuth 认证基础 beta `oauth-2025-04-20`，不混入无关推理 beta。profile 内部操作保留 CLI 自身头。

## 资源与生命周期边界

- 请求和响应 body 均落入 0600 临时文件，不整块留内存。
- 单 body 硬上限 512 MiB；`CCG_RESOURCE_BODY_LIMIT_BYTES` 可降低；提供方实际 500 MB 限制仍由提供方原错误返回。
- `CCG_RESOURCE_SPOOL_LIMIT_BYTES` 默认 1 GiB，共享预算涵盖并发上传及下载；可配置但最高 4 GiB。
- Content-Length 超限早拒，流式逐块限额，长度不一致拒绝，取消关闭输入并释放配额 / 文件。
- 单资源请求最长 10 分钟。仅该请求使用 ResponseController 延长 body 读写 deadline，不改变普通模型请求的全局 30 秒读超时。
- `data/resource-spool/instance-UUID` 持 OS 独占 lease；取得 lease 后才创建实例目录。启动仅清理能取得锁的死实例中 `resource-body-*` 直接文件，不递归删除、不清活动实例。正常 Runtime Close 等待请求退出后回收实例。
- 与受控授权操作共享 authManager mutex，防止 profile 核验与实际资源调用之间切换账户。当前串行化同账号的资源认证与执行，上传可先并发有界 spool。
- 所有资源路径统一先授权锁、后 CLI 并发槽；等待授权的请求不占 CLI 槽。文件模型验证后可以释放验证槽并保留授权锁，再安全取得执行槽。授权锁等待可取消，取消后即时释放已上传的 spool。修复了旧 slots→authority 顺序与模型二次取槽之间的环形等待；确定性饱和队列 / 取消回归重复 20 轮通过。
- 管理员直接改宿主机授权文件、环境变量或在相同显式 issuer / epoch 下换 API key 不经过该受控锁；不能声称可自动识别这些外部替换。API key 管理者须正确维护 issuer 与 epoch。

## 当前验证

真实本地 CLI 2.1.292 + 隔离假提供方，不是生产资源验证：

- GET / POST 原始 multipart / DELETE 三种 carrier：最终只出现资源路径、认证为内层 CLI 凭据，二进制原样，没有模型调用。
- API key / dummy OAuth 正式资源 HTTP：identity、错误 generation 409、有效 DELETE 的提供方 429 + Retry-After 原样，零 HistoryCache 条目，spool 清零。
- 取消已发出的资源请求后，CLI / transport 退出，配额释放。
- 服务器全局 ReadTimeout=50ms、上传分段延迟 150ms 的真实 HTTP 测试通过，证明资源入口单请求 deadline 生效且全局配置不变。
- Runtime 授权回调存在并轮换 diagnostics epoch；资源独立同 issuer 重授权 generation 保留、换 issuer 改变。
- OS lease 测试：第二活实例不会删除第一实例文件，已释放锁的死实例文件可回收。
- `go vet ./engine` 与资源范围单测已通过。Linux OS 锁 / 大体积 512 MiB 压测 / 生产 OAuth profile 仍待服务器 Git 构建候选版本后验证。

线上只读证据：再次核验 #22 容器 ID 后，现有 CLI 2.1.288 `auth status --json` 仅输出 loggedIn=true、authMethod=claude.ai、apiProvider=firstParty。未输出 email、UUID 或凭据。尚未用新 carrier 调用实际 `/api/oauth/profile`，因此其真实账号响应 shape 仍是上线前验证项，未知形态不会退回猜测身份。

## 已接通 Worker 文件引用准入

Messages 和 count_tokens 入站均用共享 scanner 识别已注册文件位置。只有核心审核的 remote ID allowlist、真实 issuer、generation 全部匹配才构造进程内 resourceAdmission；默认解析入口没有 grant，仍拒绝 file_id。任意客户端 header 不会直接变成准入对象；Worker API key 身份保护与真实账号核验必须同时通过。受控授权锁持有到整个模型请求结束。

支持已授权 image / document `source:{type:file,file_id}`、document.content 内图片、user container_upload。后者只是合法输入块保真，不代表 CodeExec / 容器归属 / 生成文件已开放。主出站同时检查所有 ID 与完整客户端历史位置，资源块丢失、移动、重复、替换均拒绝；仅对齐视图排除已知内部 ToolSearch 往返，实际请求不删除工具轮次。身份与 generation 加入资源会话命名空间，文件 ID 已在原消息指纹中。

新增 4 输入形态 × 6 路径，共 24 个真实 CLI 隔离请求：新会话、续聊、回退、不同会话导入、SSE、count_tokens 均逐次断言最终提供方 wire 中原文件 ID。最终主历史严格对齐后重跑仍通过。额外 4 个非法 IDs / principal / generation 请求均在模型推理前拒绝。尚未把这些假提供方结果当作真实 Files 数据访问证明。

## 资源日志

资源入口复用 requestDiagnostic、原每请求配额 / 保留期 / 全局预算、账号开关和关闭即删除机制。一条资源请求有独立 request ID、配置、身份核验、dispatch、实际状态、响应及错误流程。

上传 binary / multipart 不保存原 body，明确记录省略原因，并记录完整 body SHA-256、实际字节数及各 part 的 filename、MIME、长度、SHA-256。小于等于 1 MiB 的 JSON 响应可保存结构化副本；其它响应仅长度 / 哈希 / 明确省略标记。profile 原始账号资料及上游认证头不进入日志。真实慢上传测试同时验证这些日志字段与事件存在、凭据未出现、关闭开关后资源记录被删除。

## 下一层仍需接通

核心租户 ACL、公开 ID 到 provider ID 映射、账号亲和由并行 owner 实施，需要统一集成及生产验证。新建 CodeExec 请求即使没有输入资源 ID，也须核 issuer 后才能注册生成 container / files，不能只依赖第五批入站文件 grant。容器、Code Execution / PTC、Skills 执行及生成文件资源归属按第六批方案推进。
