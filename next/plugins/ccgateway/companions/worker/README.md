# CCGateway Worker

每账号独立HTTP入口与生命周期，完整API→Claude Code协议实现复用`../engine`，Mod在`../mod`，跨组件合同在`../contracts`。不要重新写简化DTO或第二套历史实现。

当前上线状态见[交接](../../../../docs/ccgateway-feature-support/HANDOFF-2026-10-09.md)，访问/运行/日志/测试/更新见[环境指南](../../../../docs/ccgateway-feature-support/ENVIRONMENT-RUNBOOK.md)。

## 配置

- `CCG_API_KEY`调用鉴权，`CCG_ADMIN_KEY`独立管理鉴权；不要记录值。
- 容器`CCG_BIND`默认8787；`WORKER_PORT`可覆盖；裸程序未设两者时使用8788。
- `WORKER_CLI_PATH`指原生CLI；默认使用随程序嵌入Mod。自定义`WORKER_PLUGIN_PATH`须有`hooks/hooks.json`。
- `CLAUDE_CONFIG_DIR`账号CLI配置/授权，`HISTORY_DIR`、`CACHE_DIR`历史及持久缓存；兼容原容器`CCG_DATA_DIR`。
- `REQUEST_TIMEOUT`/`CLI_TIMEOUT`取较短正值；`WORKER_CLI_VERSION`不替代实际版本探测。
- 历史保留沿用引擎24h，`HISTORY_RETENTION`目前不改变此行为。

`/v1/messages` JSON/SSE、健康`/health`/`/healthz`、管理`/admin/*`交共享引擎。其它资源/计数能力按engine和真实Worker features判断，不从image tag猜。

## 构建

仓库根执行，构建上下文必须是父companions：

```sh
docker build -f next/plugins/ccgateway/companions/worker/Dockerfile -t ccgateway-worker:dev next/plugins/ccgateway/companions
```

Worker模块`go test ./...`；共享engine及真实CLI tests另跑，CLI须独立临时配置/假provider，不能误将真实账号环境给整个race包。具体命令见环境指南。

现有#21/#22是原容器内.80程序补丁，仍保留.56镜像标识和授权；不要因此自动重建。原始旧Worker完成度/覆盖率报告已从工作目录删除，可从Git历史找回，不作为验收。
