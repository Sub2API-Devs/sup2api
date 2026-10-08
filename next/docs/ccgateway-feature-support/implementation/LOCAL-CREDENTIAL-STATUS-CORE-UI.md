# Local credential status: Core and UI integration

候选未提交/未部署。本文件仅记录 Core safeResult 和前端；Worker 的无子进程本地快照、OAuth 锁整改由独立作者实施，不以 UI 单测证明线上认证已修复。

## 合同

`/status` 保留 healthy/logged_in/auth_method 兼容字段；新 status_source=local_snapshot 时 logged_in 等于 credential_present，仅表示已保存或环境存在。online_verified/selection_verified 必须为 false。固定白名单保留 credential_sources、credential_source_unresolved 和有证据时的 access_token_expired，不带凭据内容、路径、helper 命令或 profile。

当前来源枚举与 Worker 作者确认：api_key_env、bearer_env、oauth_token_env、stored_oauth、managed_api_key、external_credential_source、credential_helper_configured。未知/重复来源拒绝，presence=true 但无任何来源也拒绝；不把未知来源猜为已登录。auth_method 保留 claude.ai/oauth_token 与旧枚举，未知值折叠为 unknown。旧 Worker 缺快照字段只保留旧字段，不伪造在线验证事实。

## UI

账号授权、重新授权、账号运行列表、全局连接视图统一改为“凭据已保存”。共享提示明确“本地凭据已保存，在线有效性以实际请求为准”；访问令牌已过期时提示等待原生 CLI 在实际请求时刷新。credential_source_unresolved 或 expired 不触发自动授权链接流程，不因 helper/FD/WIF 等未确认来源自动要求重新授权。仍允许用户自行选择明确的授权动作。

## 验证

Core 白名单/旧接口/非法来源/在线验证伪声明/私密字段丢弃定向测试 PASS 2.239s，ccgateway vet PASS。前端 typecheck PASS；CredentialStatusNotice/AccountRuntimes/CCGatewayAccountReauth/ccgAuthFlow 共 4 文件 24 测试 PASS 2.14s。包含 unresolved 与 expired 均不自动授权的直接断言。没有在线身份探针、模型请求或运行态修改。
