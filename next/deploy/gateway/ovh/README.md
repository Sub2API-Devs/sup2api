# OVH当前部署入口

2026-10-09 21:37：Core .85（外壳 d917b8c）四个gateway-managed节点`sup2api-1..4`，3130..3133；管理/主入口3130。CCGateway Controller（0.1.49）与账号Worker已从cc-max迁到本机Docker（`ccg-controller`、端点 `https://ccmax.prophey.ai`（共用 caddy 反代）、`ccg-21-*`、`ccg-d1d2964e14bf728d9-*`），cc-max 上的旧容器停止保留作回滚；详见环境指南顶部。不在OVH重建账号。

完整[当前状态](../../../docs/ccgateway-feature-support/HANDOFF-2026-10-09.md)、[环境/使用指南](../../../docs/ccgateway-feature-support/ENVIRONMENT-RUNBOOK.md)和精确部署基线集中维护于特性文档目录，不再在这里复制逐版本发布流水。

## 更新原则

1. 本地审查、提交、推送；服务器Git fetch精确SHA，clean detached工作树构建，禁止scp/rsync上传源码。
2. 从仓库内执行`prepare-core-release.sh VERSION FULL_GIT_SHA`。它在Docker主机上构建CCGateway运行环境镜像（缓存在`~/sup2api-managed/ccgateway-images/<插件版本>/`，每版本只构建一次）和核心（REQUIRE_CCGATEWAY_IMAGES=1，镜像随ccgateway插件包分发），准备签名制品、备份和预检，不创建升级计划或切服务；版本/制品不可覆盖。
3. 核固定Go编译器、六builtin不可变包、签名/hash、原schema、备份和fresh preflight，再由正常primary-first updater升级。四节点独立核版本/hash/ready，真实服务验收另记。
4. 服务端既有`~/sup2api-managed/upgrade_observe.py`节点映射为`sup2api-*`。仓库同名旧脚本映射不同，**不能直接覆盖服务端脚本或不核映射就运行**；不要传故障注入的第二参数。
5. CCGateway保存未来镜像配置不替换现有账号。#21/#22保留原容器/数据/授权，Worker需显式备份和原子替换程序；Controller更新另走明确步骤。

不要再使用`deploy/single/deploy.sh`，会与管理节点争用3130/3131。也**不要在本目录（或服务器上任何 `release-*/next/deploy/gateway/ovh`）执行 `docker compose up`**：线上节点由 `/home/debian/sup2api-managed/compose.yml` 管理（容器 `sup2api-1..4`/`releases`，卷 `sup2api-managed_sup2api-N-data`，证书挂载路径也不同），本目录的 `compose.yml` 卷名为 `state-N`，起出来是一套用旧状态卷、不心跳、发布服务器缺证书的错误节点（2026-10-09 07:44 发生过）。核心升级只走 `~/sup2api-managed/build-core.sh VERSION` → 主节点 `sub2api-shell import` → `upgrade_observe.py DIGEST`。不要把正常核心升级写成零中断，最近维护窗口约30–38秒。禁止生产DB运行测试fixture；测试使用隔离45432库。

`.env`、keys/certs/stage/publish及私有备份仅留服务器；不要提交或打印鉴权、密码、DSN、完整inspect。更详命令和恢复路径见环境指南。此文替代此前自动踢账号换镜像和tools/ccgateway旧路径说明。

## 隔离加固迁移（2026-10-10 起，尚未在 OVH 执行）

内容见[网关 README“隔离加固”](../README.md#隔离加固2026-10-10)：管理 socket 令牌、核心环境白名单、Redis 密码、`no-new-privileges`/`cap_drop`。线上的 Redis 是 `sup2api` 项目（`deploy/single/compose.yml`）的 `sup2api-redis-1`，四个节点由 `~/sup2api-managed/compose.yml` 管理。顺序要求：**先让所有客户端带上密码，再给 Redis 设密码**；**先让核心支持令牌，再换新网关**（或换网关时临时打开迁移开关）。

1. **准备密码**：`openssl rand -hex 32` 生成 `REDIS_PASSWORD`，同时写入 `~/sup2api/.env` 与 `~/sup2api-managed/.env`（600，不打印）。确认缓存支持 `HELLO`（Valkey 9 / Redis ≥ 6）：`docker exec sup2api-redis-1 valkey-cli INFO server | grep -E '^(valkey|redis)_version'`。
2. **核心先支持令牌（推荐）**：发布含核心配合改动（读 `SUB2API_UPDATER_TOKEN_FILE`、带 `Authorization`）的核心版本，照常 `build-core.sh` → `import` → `upgrade_observe.py`。旧网关不设该变量，新核心就不带令牌，照常工作。若必须先换网关，在 `~/sup2api-managed/.env` 设 `SUB2API_ALLOW_TOKENLESS_MANAGEMENT=true`，第 5 步完成后再清空并再滚动一次网关。
3. **改已安装的 compose**：在 `~/sup2api-managed/compose.yml` 的节点公共段把 `REDIS_URL` 改为 `redis://:${REDIS_PASSWORD:?}@redis:6379/0`，加 `security_opt: ["no-new-privileges:true"]`、`cap_drop: [ALL]` 和 `SUB2API_ALLOW_TOKENLESS_MANAGEMENT: ${SUB2API_ALLOW_TOKENLESS_MANAGEMENT:-}`（与本目录 compose.yml 一致）。此时 Redis 仍无密码，带密码的客户端也能连上。
4. **滚动新网关镜像**：`roll-gateway.py --image <新标签>`（候选 compose 必须与第 3 步改过的已安装文件只差镜像），顺序 `sup2api-2,3,4` 后 `sup2api-1`；每个节点重建会重启其核心，主节点约 30–38 秒不可用。每个节点确认：就绪、`docker compose exec sup2api-N sub2api-shell status` 正常、日志没有 `NOAUTH`；若开了迁移开关，日志里出现 “management request without token accepted” 是预期的。
5. **核对没有不带密码的客户端**：`docker exec sup2api-redis-1 valkey-cli CLIENT LIST` 中的来源地址只能是四个节点容器的 IP（`docker network inspect sup2api_default`）；有其他来源先查清楚。
6. **运行时给 Redis 设密码（不重启、不丢数据）**：`set -a; . ~/sup2api-managed/.env; printf %s "$REDIS_PASSWORD" | docker exec -i sup2api-redis-1 valkey-cli -x CONFIG SET requirepass`。已有连接保持，新连接须带密码。验证：`docker exec sup2api-redis-1 valkey-cli PING` 返回 `NOAUTH`；`export REDISCLI_AUTH="$REDIS_PASSWORD" VALKEYCLI_AUTH="$REDIS_PASSWORD"; docker exec -e REDISCLI_AUTH -e VALKEYCLI_AUTH sup2api-redis-1 valkey-cli PING` 返回 `PONG`（密码经环境传入，不出现在命令行）；四节点就绪、心跳和升级锁正常。回退：`CONFIG SET requirepass ""`，客户端不用改。
7. **固化**：`~/sup2api/src` 更新到含新 `deploy/single/compose.yml` 的提交。运行时设置在 Redis 容器重启后会丢（启动参数里还没有密码），所以在下一个没有升级计划的低峰窗口执行 `docker compose -p sup2api -f ~/sup2api/src/next/deploy/single/compose.yml --env-file ~/sup2api/.env up -d --no-deps redis` 重建 Redis（会清空实时状态：节点登记由心跳自动重建，锁、限流、粘性等重新开始）。完成前若 Redis 意外重启，重新执行第 6 步。
8. **收尾**：若用了迁移开关，所有节点基线核心支持令牌后清空 `SUB2API_ALLOW_TOKENLESS_MANAGEMENT` 并再滚动一次网关；日志里不再出现上述警告即完成。
