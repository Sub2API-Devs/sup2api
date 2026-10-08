# Files API 核心 HTTP 实施记录

2026-10-08。此记录为源码与隔离 HTTP 测试证据，未表示生产账号 Files 资格、真实上传/删除或部署已验证。

## 路由与边界

Gateway 增加 `/v1/files` POST/GET、`/v1/files/{public_id}` GET/DELETE、`/v1/files/{public_id}/content` GET。依赖 `core.ProviderResources` 与固定操作 `core.ProviderResourceTransport`，不读取账号 token；平台 API key 不传递给 Worker。其他业务路由保持原处理链。

先校验 API key、节点健康、用户并发；只使用当前启用的 ccgateway 账号类型和分组 Candidates。首次创建可在实际发送前选择有身份能力与可用 slot/rate 额度的账号；已存在资源固定 issuer/account/generation，不能失败后换账号。Owner 为 UserID+GroupID，同一 owner 换 API key 不丢资源，不同用户或组不能探测远端资源。

上传逐段解析 multipart，在 0600 临时文件中完整计量并 SHA256 后才 Reserve。单件 spool 上限 512 MiB，最多 4 个进程级 spool，用户无限并发也不能绕过总计约 2 GiB 的临时磁盘上限；提供方自身大小限制仍由真实操作返回。取消会关闭原始请求 body，解除阻塞并清理临时文件。原始 filename 单独解析，非法路径/控制字符/保留字符明确拒绝，不能静默重命名；标准省略文件 Content-Type 会原样省略给提供方检测，旧 beta 省略则拒绝。

Reserve 的 Dispatch 只授权单次发送。网络错误、取消、5xx、无法验证的 2xx/JSON/文件大小保留 uncertain；只有认证固定操作返回匹配的 400 invalid_request、401 authentication、403 permission 才 FailCreate。无自动重试。Finalize 验证 remote ID、type、文件大小、metadata，外部仅返回 public ID。ExpiresAt 只取提供方实际返回，不能以本地开始时间猜测；旧 Files beta 不报告 expiry，携 expires_in_seconds 的组合在 dispatch 前明确拒绝，避免无法证明的生命周期。

DELETE 先 BeginDelete，后只发送一次。有效 file_deleted 或实际 404/not_found_error 确认远端已不存在；404 仍原样返回，不改成200。其他真实失败保持原 status/error详情、安全 request-id/Retry-After 头，本地记 delete_uncertain。错误中只将本次 remote ID 替换为 public ID，保留其他结构化字段及大整数。下载固定账号并设置已知 Content-Length，短响应不会伪装为成功的较短 chunked 文件。

## 当前/旧版协议

依据 [Files API migration](https://platform.claude.com/docs/en/build-with-claude/files#migrate-from-files-api-2025-04-14) 与 [List Files](https://platform.claude.com/docs/en/api/files/list)：

- 标准：page/next_page，limit 默认20、1..1000；最多100个去重 ids[]，不可与page/limit混用；before_id/after_id返回400。file对象总有 expires_at（无过期为null）。
- files-api-2025-04-14：before_id/after_id、data/has_more/first_id/last_id；file对象不展示expires_at。不把无beta请求也送进旧格式。
- managed-agent scope、workspace选择尚无本地资源映射，明确拒绝，不调用共享账号 workspace 全量列表。

列表只调用本地资源 Query，SQL在 owner/plugin/kind/账号集合/ready/到期元数据保留窗口过滤后分页，不先拿一页再过滤。过期metadata/list保留至30天；内容及模型引用仍拒过期。metadata GET固定账号真实查询，外部手工删除造成的本地列表缓存滞后仍需后续reconciliation；本轮不伪称自动同步共享workspace。

## 验证

`go test ./internal/gateway -run '^TestFiles' -count=1` PASS 2.942s；`go vet ./internal/gateway` PASS。

HTTP回归涵盖上传/metadata/content/列表/删除、平台key不外传、public ID替换、同owner换key、跨owner拒绝、issuer generation变化拒绝、未知创建只发一次、5xx/取消/坏JSON/大小不符uncertain、明确400失败、分页协议/SQL筛选参数、插件停用、Dispatch=false不重发、单件超限、阻塞上传取消、全局spool满额、过期metadata/content/delete、非法文件名、删除400/403/404/429/503原义、大整数error details、安全响应头、账号slot选择与rate/user限制、provider真实expiry及旧版拒绝边界。

持久化 Query、quota、生命周期并发与 Linux 数据库测试由 providerresources owner 单独记录；Worker真实CLI操作carrier及生产资格由相应模块记录，不能由这里的 fake transport 测试替代。
