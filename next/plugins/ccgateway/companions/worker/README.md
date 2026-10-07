> 当前架构：本模块只提供账号服务入口与生命周期；完整协议实现位于 ../engine，Mod 位于 ../mod。Docker 构建上下文必须是父目录 next/plugins/ccgateway/companions。旧阶段性文档不代表当前能力验证结果。

# CCGateway Worker

保留每账号独立 Worker 的 HTTP 入口和容器部署方式。业务实现直接复用 `../engine` 共享包，原网关入口也使用同一份实现。

## 本次修复

- initialize 成功后提交完整 user 帧；保留 stdin 以响应 CLI 控制回调。
- 复用 SDK MCP 工具、权限控制、Anthropic SSE 累加校验和非流式响应。
- 复用原生 JSONL 历史、持久指纹缓存、续聊、分支和重建。
- 复用 system 还原、Mod、附件策略、thinking 和结构化输出。
- `CCG_API_KEY` 鉴权；管理接口使用独立 `CCG_ADMIN_KEY`。
- 自动提取嵌入的 Mod，不再指向镜像中不存在的 `/app/mod`。
- 启动时读取真实 CLI 版本；修复正常关闭被当成错误的问题。

`internal/cli` 和 `internal/history` 的空壳实现及错误测试已移除，替代它们的是共享包及原有测试，不是删除这些能力。

## 配置与运行

必需：`CCG_API_KEY`。`WORKER_ID` 缺省使用 hostname。需要账号列表中的 OAuth 管理时，还必须设置与调用 Key 不同的 `CCG_ADMIN_KEY`。

- 镜像通过 `CCG_BIND` 默认监听 8787，与账号控制器一致；`WORKER_PORT` 可覆盖。裸程序未配置两者时使用 8788。
- `WORKER_CLI_PATH` 指向原生 Claude Code 可执行文件。
- `WORKER_PLUGIN_PATH` 默认为空，使用随程序嵌入的 Mod；显式路径必须含 `hooks/hooks.json`。
- `CLAUDE_CONFIG_DIR` 是该账号的授权和 CLI 配置目录。
- `HISTORY_DIR` 存放 Worker 数据；`CACHE_DIR` 存放持久历史缓存。
- `REQUEST_TIMEOUT` 和 `CLI_TIMEOUT` 取较短的正值。
- `WORKER_CLI_VERSION` 不是版本验证依据，健康接口返回实际检测到的版本。
- 历史保留语义沿用原实现：24 小时；`HISTORY_RETENTION` 暂不改变此行为。

`/v1/messages` 的请求语义、校验和响应与原网关一致：`stream: true` 返回 SSE，否则返回 Anthropic message JSON。请求体、鉴权头、session/scope、request policy 和 native-tools 头直接交给共享实现，不再经简化 DTO 丢字段。

`/health`、`/healthz` 为健康接口；`/admin/*` 沿用原网关授权、代理、用量和请求日志接口。核心经固定主机指纹的 SSH 直接访问账号私网 HTTP；控制器只负责管理和带 revision 的连接信息发现。动态地址与 SSH 配置见 `../controller/README.md`。

从仓库根目录构建：

```sh
docker build -f next/plugins/ccgateway/companions/worker/Dockerfile -t ccgateway-worker:repair next/plugins/ccgateway/companions
```

测试容器使用 `test/integration/docker-compose.test.yml`；设置测试专用调用 Key 和管理 Key 后，以独立 compose 项目启动，不复用生产容器。

## 验证范围

本次 Windows 本地验证包括两个模块的单测、真实 Claude Code 2.1.288 对本地假上游的协议测试，以及 Worker 自身连续三轮调用（JSON、JSON、SSE）。真实 CLI 测试使用合成凭据和隔离配置，不调用生产账号或云模型。

```sh
cd next/plugins/ccgateway/companions/worker
go test ./...
# 设置 CCG_REAL_CLI 为本机原生 CLI 的绝对路径后：
go test -count=1 -v ./internal/worker -run TestWorkerRealCLI
```

共享实现的真实 CLI 测试位于 `../engine`，包括工具往返、system 历史和附件过滤。

## Mod 通信与兼容边界

Mod 使用 CLI 2.1.288 已验证的 `$.http.fetch`，在同一回环服务端口读取内存配置并确认初始化、system 挂载。每次调用使用随机路径和独立令牌，结束即移除；不再通过文件传递配置或确认消息。CLI 自身历史 JSONL、授权文件和嵌入 Mod 的加载文件仍保留。

消息数组中的 system 角色需要上游模型支持；Sonnet 4.6 实测拒绝该角色，顶层 system 正常。上游错误透传由现有 request policy 控制。不能把假上游测试通过解释为所有模型都支持所有组合。

此前 SUMMARY、DASHBOARD、HANDOFF 等文件中的覆盖率、完成度和可投入生产的说法已作废，不能作为验收依据。原交接 `HANDOFF-2026-10-07.md` 保留不动。

## 2026-10-07 现场部署

已在 cc-max 的 #21 和 #22 原业务容器内安装 Worker 并重启；容器 ID、数据卷、#22 OAuth 授权都保留。真实非流式、历史续聊、SSE、客户端工具往返和核心账号测试入口已通过。Linux Worker 镜像 `ccgateway-worker:0.1.58` 已在 cc-max 构建，控制器 `ccg-controller:0.1.46` 已部署。详细证据与恢复方式见 `next/docs/ccgateway-migration/REPAIR-2026-10-07.md`。

兼容原账号容器的 `CCG_BIND`/`CCG_DATA_DIR`。内部上游中继复用服务端口，适配原出口防火墙仅放行回环 8787 的规则。镜像名仍为原镜像，本次是原容器内安装；未来镜像重建须使用正式 Worker 镜像，才能保留新程序版本。
