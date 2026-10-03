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

## SSH 远程 Docker 与代理

下述桥接地址与环境变量说明针对 `backend/` + `frontend/` 的旧版内建 CCGateway。next 核心从 0.1.15 起提供独立管理页和 `ccgateway` 插件，接入方式见下一节。

远程主机用本仓库 Dockerfile / Compose 部署容器，名称固定为 `ccgateway`，端口只绑定远程 `127.0.0.1:8787`。页面可以检查 Docker/Compose、查询状态、启动、停止、重启、读取日志；安装 Docker、构建镜像与首次创建容器仍使用 Compose。后端和远程容器需配置相同且互不相同的 `CCG_API_KEY`、`CCG_ADMIN_KEY`。

在插件卡片选择 SSH，填写主机、端口、用户名及密码或私钥。探测指纹不会发送凭据；通过已有可信连接核对指纹后，再点击使用并保存。SSH 凭据使用宿主既有加密服务持久化，页面只返回是否已配置。留空保留原凭据只适用于相同主机、用户、认证方式和指纹；更换目标必须重新提供凭据。

Docker 操作复用原生 Docker CLI；SSH 使用 `golang.org/x/crypto/ssh`，HTTP/SSE 使用 Go `net/http` 与 `httputil.ReverseProxy`。管理请求和模型请求通过 SSH direct-tcpip 到远程回环端口，无需暴露 Docker TCP API。可复用封装在 `backend/internal/remotedocker`，插件适配层在 `backend/internal/ccgatewayremote`。新接入账号统一通过宿主内部桥接地址，随后切换本地/SSH 会作用于新请求。旧版已创建的直连账号需要重新接入或更新 base_url。

### Claude Code 出站代理

代理控制远端 Claude Code 访问模型服务的出口，与 SSH 连接配置独立。支持三种模式：

- 继承：使用容器启动环境中的代理变量。
- 直连：移除子进程的 HTTP_PROXY、HTTPS_PROXY、ALL_PROXY、NO_PROXY 及小写形式。
- 指定代理：设置 HTTP_PROXY / HTTPS_PROXY 及小写形式，移除 ALL_PROXY，保留容器 NO_PROXY；支持 HTTP/HTTPS 地址和可选用户名密码。

代理地址必须能从远端容器访问；127.0.0.1 指容器自身。Claude Code 官方不支持 SOCKS，因此界面与后端均拒绝 SOCKS 地址，参见 [官方网络配置](https://code.claude.com/docs/en/network-config)。代理界面保存后清空输入框，只显示脱敏地址；在已启用指定代理时留空保存保留原地址。

每个模型请求或授权子进程启动时读取配置快照；新请求使用新配置，已运行请求保持原配置，无需重建或重启容器。正在进行的 OAuth 授权要重新发起才会应用新代理。

配置通过管理接口 `/admin/proxy` 更新，以 AES-GCM 加密保存到数据卷内的 `proxy.enc`。加密密钥从管理密钥派生；更换 CCG_ADMIN_KEY 前需安排配置迁移或重置，旧文件不能用新密钥解密。SSH 密码/私钥和代理 URL 不进入管理审计请求体。

### 2026-10-03 验证记录

- 后端管理/服务/审计测试、远程 SSH 框架测试、Go vet 与宿主编译通过；前端 16 个相关测试、类型检查和生产构建通过。
- cc-max 上密码和私钥登录均通过；Docker 状态、启停、重启、日志操作以及 SSH HTTP 健康检查通过。
- Linux 下 SSH 框架和代理模块 `go test -race` 通过。
- 测试容器使用 `ccgateway:ssh-proxy-test`，数据卷保留，端口仅绑定回环，日志轮转 20m × 3。
- 经 SSH 管理接口验证指定代理 → 容器重启后配置与 revision 保留 → 直连 → 继承，最终恢复继承。此项使用不可用的模拟代理地址，仅验证配置，不向它发送模型请求。
- 容器内 Claude Code 2.1.288 的真实 CLI 测试通过：7 次本地模拟模型请求，覆盖历史、system、工具往返和 SSE，0 次云端模型调用。
- 尚未完成真实 OAuth 登录、真实出站代理或收费模型调用；未将这套旧版宿主界面部署到 OVH next 核心。

## next 核心 0.1.15

系统设置与插件列表均提供 CCGateway 管理入口，可保存 SSH 连接、管理 Docker、切换代理及完成 Claude OAuth。SSH 身份和 sidecar 的两个密钥用核心既有主密钥加密保存到共享设置，各节点读取同一配置，无需更改 gateway 环境。

随核心分发的 `ccgateway` 插件初始为禁用；启用后提供 `managed` 账号类型。管理员完成 Claude 授权后可在管理页接入账号，再到账号管理配置分组和模型。账号本身不存储 SSH 或 sidecar 密钥，所有托管账号共享当前远程实例。仅支持 Messages；token 预估和模型发现未开放。

模型调用仍经过正常的鉴权、调度、限流及用量计费。插件返回固定虚拟目标，核心仅对匹配的插件、账号类型和目标调用受限 SSH 传输，其余账号继续使用原有上游访问检查。没有额外的公开桥接端口。账号测试使用相同传输。
