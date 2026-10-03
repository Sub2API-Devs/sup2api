# CCGateway 内建插件

从 `D:\projects\golang\ccgateway` 的 2026-10-03 工作副本导入 Go 网关和 Mod；此目录独立维护，不包含原项目的本地数据、可执行文件或凭据。

管理入口位于 Sub2API「插件管理」中的 CCGateway 卡片，随宿主内建，无需上传 `.s2plugin`。原有可安装插件继续使用现有 OpenAI OAuth 传输协议。CCGateway 作为 Docker sidecar 提供 Anthropic Messages，通过普通 API Key 账号进入宿主调度链路。

## 本地 Docker

在 `deploy/.env.ccgateway` 中填写两个不同的随机密钥（不要提交该文件）：

```dotenv
CCG_API_KEY=<网关调用密钥>
CCG_ADMIN_KEY=<独立管理密钥>
```

从 `deploy` 目录运行：

```sh
docker compose --env-file .env.ccgateway -f docker-compose.ccgateway.yml up -d --build
```

宿主后端也需要设置相同的 `CCG_API_KEY` 和 `CCG_ADMIN_KEY`，然后启动或重启后端。后端默认连接 `http://127.0.0.1:8787`。

后端本身运行于 Docker 时，可将此 compose 文件与现有部署文件合并：

```sh
docker compose --env-file .env --env-file .env.ccgateway -f docker-compose.local.yml -f docker-compose.ccgateway.yml -f docker-compose.ccgateway-host.yml up -d --build
```

其中主服务镜像必须包含本次后端和前端改动；现有远端发布镜像不会自动包含工作区代码。已有账号的 base_url 不会随环境变量自动迁移，迁移网关地址后应在账号管理中更新。

镜像固定 Claude Code 2.1.288，使用非 root 用户；授权与历史保存在 `ccgateway-data` 专用卷。普通 `down` 保留数据，`down -v` 会清除授权与历史。宿主不需要 Docker socket，也不会读取用户现有的 Claude 凭据。

## 授权和使用

1. 打开插件管理，确认容器连接状态。
2. 点击获取授权链接，在浏览器完成 Claude 授权。
3. 粘贴完整的 `code#state`，点击完成授权。授权链接十分钟过期；需要保持同一个网关实例，重启后应重新发起授权。
4. 点击接入账号调度，创建 Anthropic API Key 账号。该账号使用网关调用密钥，真实 OAuth 凭据仅由容器内 CLI 管理。
5. 在账号管理中调整分组，使用所属分组的 Sub2API API Key 调用正常 `/v1/messages`。停用该账号即可停止调度；退出授权会影响该容器关联的所有账号。

每个容器仅有一套授权，不是多账号池。账号创建可重复操作以供不同调度配置使用。页面不保存授权码或管理密钥。后端管理接口继承管理员认证、审计和敏感操作二次验证；管理端口与模型端口共用监听器，凭据各自独立。

支持文本、图片、客户端工具往返、SSE 和本地历史缓存。不支持扩展思考、`anthropic-beta`、`tool_choice:any/tool`、`/v1/models`、`/v1/messages/count_tokens`；完整 Claude Code 客户端的所有功能不在当前协议范围内。容器健康检查只证明服务在线，授权状态不证明模型权限，实际模型调用仍需验证。

授权 RPC 是 Claude Code 内部协议：`initialize` → `claude_authenticate` → 同进程 `claude_oauth_callback`。升级 CLI 后需重新验证。登录进程持有 PKCE verifier；服务验证 URL、state、会话 ID 与有效期，回调后销毁进程。授权中间状态仅在内存中，不能将多个副本放在随机负载均衡后。

## 验证

```sh
go test ./...
go vet ./...
```

原网关真实 CLI 测试使用 `CCG_REAL_CLI` 指定可执行文件；未配置时跳过。真实浏览器 OAuth 和 Docker 启动验证需要可用的 Docker 环境及用户完成授权。
