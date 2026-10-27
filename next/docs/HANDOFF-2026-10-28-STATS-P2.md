# 交接：统计界面 P2 + 两节点部署（2026-10-28）

> **2026-10-28 已完成**：P2 已提交（`9506f63ba`），核心 0.1.209 已发布到两个节点并核对通过，记录在 [ovh/README.md](../deploy/gateway/ovh/README.md) 顶部。§3 的部署记录也已补上。本文剩下的内容只作历史参考。

本文给下一位接手的 AI。读完这一份就能接着做，不需要翻之前的对话。

**仓库与环境**
- 仓库：`D:\projects\golang\sup2api`，分支 `feat/next-platform`，最新已推送提交是 `fc0414f0a`。
- 本机是 Windows，用 Git Bash，没有 Docker 和 WSL。
- 用中文回答用户。用户的长期规则在 `C:\Users\16790\.claude\projects\D--projects-golang-sup2api\memory\MEMORY.md`。

---

## 1. 现在线上是什么状态（都已完成并验证）

| 组件 | 版本 | 位置 |
|---|---|---|
| 核心 | 0.1.208（`45a1741f8`，统计 P1） | 两个节点 |
| 网关镜像 | `sup2api-gateway:0.1.127`（`1a8b0ce10`） | ovh `sup2api-1`、clicodeplus `sup2api-ccp` |
| CCGateway 插件 | 0.1.107（`fc0414f0a`，rollout 192） | 两个节点 |
| CLI | Claude Code 2.1.310 / `ccgateway-v33-bun-1-4-4` | 不变 |

### 1.1 部署架构（2026-10-27 用户要求，已上线）

总说明在 `next/deploy/gateway/clicodeplus/README.md`。

- **请求路径**：api.prophey.ai 解析到 clicodeplus（64.186.225.70）。那里的 Caddy（`/root/caddy/Caddyfile`）优先转给本机节点 `127.0.0.1:3140`（`sup2api-ccp`）。本机节点不健康时，经 `127.0.0.1:3141` 跳板转到 `https://sup2api.15.204.107.38.sslip.io`，也就是 ovh 的 Caddy（`~/caddy/Caddyfile`），再到 `127.0.0.1:3130`（`sup2api-1`）。
- **主节点**是 ovh 的 `sup2api-1`：负责发布源和插件包存储，也是升级协调者。
- **数据库**：Supabase。两个节点的 DSN 都写在各自的 `.env` 里。
- **Redis**：`rediss://…@valkey.prophey.ai:6380/0`，主机是 40.160.152.211，`ssh valkey`，经 ovh 跳板，目录 `~/valkey-stack`。
  - 那台机器上的 Caddy 用 layer4 的 `remote_ip` 做白名单，只放行 64.186.225.70 和 15.204.107.38。
  - 用 redis-cli 测试时要加 `--sni valkey.prophey.ai`。
- **端口与防火墙**：两个节点之间走 7443（HTTPS）。用户明确要求**节点不装防火墙**。
- **服务器上的目录**：
  - clicodeplus：`/root/sup2api-node`（compose、`.env`、certs、`config/sup2api-ccp.json`）。
  - ovh：`~/sup2api-managed`，只剩 `sup2api-1` 和 `releases`。
- **已删除**：ovh 上的 sup2api-2/3/4（容器、状态卷、集群登记）和 ovh 本机的 `sup2api-valkey`。

### 1.2 网关 0.1.127：就绪检查改为「懒」（用户规则）

- 默认认为本机核心可用。只要请求到达了核心（核心返回什么状态码都算），就保持可用。
- 只有连接失败（连接被拒、被重置；客户端自己断开不算）才进入怀疑状态，之后最多每 30 秒向核心问一次 `/v1/status`。
- 代码位置：
  - `next/gateway/internal/proxy/readycache.go` 的 `LazyReady`。
  - `router.go` 里 `Config.LocalSucceeded` / `LocalFailed`，在 `ModifyResponse` 和 `ErrorHandler` 里调用。
  - `cmd/sub2api-gateway/main.go` 里接线。
- 0.1.126 同时修了 `remove-node`、`set-primary`、插件包回退这三处，它们原来引用了两张从未创建过的表。
- 效果：api.prophey.ai 的延迟从 0.38 秒降到 0.02–0.04 秒。

### 1.3 CCGateway 0.1.107：默认模型加入 claude-haiku-5-5（Pro 和 Max）

- 改了 `next/plugins/ccgateway/internal/ccgateway/models.go` 的 `DefaultModels` 和 `manifest.json` 里的三个列表。
- 已上线：上传、升级、bundled controller,egress、paired（Worker 与 CLI 原地更新）、bundled app。23 号账号显示 failed，因为它已被删除，属正常。
- 自动模型模式的账号 32、34–41，已用 `stage/ccgateway-0.1.107/refresh_models.py` 重新应用默认列表，现在都含 haiku-5-5。
- **没有动的账号**：31（手动模型）；20、21（已停用，`auto_models` 是 null）。
- 线上测试：35 号经 api.prophey.ai、34 号经 ovh，用 `claude-haiku-5-5` 都返回 200。线上已有这个模型的价格（`model_prices` id 323）。

---

## 2. 正在做：统计界面 P2（未提交）

**背景文档**：
- 设计稿：`next/docs/USAGE-STATS-AND-USER-CONSOLE-DESIGN.md`，P2 见 §4.3–§4.5、§6、§8。
- 示意图：`next/docs/mockups/usage-stats-redesign.html`（画面 ③④⑤）。
- P1 的契约：`next/docs/CONTRACTS.md` §66。

用户确认过的决定：使用统计并入使用记录页；「累计」改成「近 30 天」；个人资料页放到 P3；管理员的消费榜用条形图，不用折线。

### 2.1 后端（已写完，测试通过，未提交）

- **`next/server/internal/usage/stats.go`**
  - `Overview` 结构给用户和管理员共用。`APIKeys` 只在用户自己的视图里有；`Users`（需要 `user:read`）和 `Accounts`（需要 `account:read`）只在管理员视图里有，都用指针加 `omitempty`。
  - `overview(c, self)` 一次扫描近 30 天，查询放在 `statsTx` 里。
  - 管理员版本 `allOverview` 按「时区 + 权限组合」在进程内缓存 30 秒（`overviewCache`，`overviewTTL`）。
  - `can()` 通过 `s.Authz` 判断权限。`Authz` 是 nil 时，管理员视图不显示用户和账号两块。
  - `rankRows()` 处理 `?order=cost|requests|tokens&limit=1..200`：先按指标降序排，再把剩下的合并成 `key="__other__"` 一行。延迟取的是按成功请求数加权的平均。
- **`next/server/internal/usage/api.go`**
  - 新路由：`GET /usage/overview`（`usage:all:read`）、`GET /usage/export`（`usage:all:read`）、`GET /me/usage/export`（`usage:self:read`）。
  - `summarize` 新增 `group_by=upstream_model`，只给管理员，用户自己的视图返回 400。结果最后经过 `rankRows`。
- **`next/server/internal/usage/export.go`**（新文件）
  - 输出 CSV，按 `(created_at,id)` 做游标分页，每批 1000 行，上限 100000 行，超出时在末尾写一行说明。
  - 文件开头写 UTF-8 BOM，代码是 `Write([]byte{0xEF,0xBB,0xBF})`。不要改成字符串字面量，Go 会报 illegal BOM。
  - `lang=zh|en` 决定表头语言，`tz` 决定时间列的时区。
  - 用户自己的导出调用 `hideUpstream`，并且去掉管理员专用列（用户、账号、上游模型）。
  - `csvCell` 防公式注入：以 `= + - @ \t \r` 开头的单元格前面加 `'`。
  - 每次导出写一条审计 `usage.export`。
- **`next/server/internal/usage/settler.go`**：`Service` 新增 `Authz core.Authorizer` 和 `overviews overviewCache`。
- **`next/server/internal/app/phases.go`**：在 `b.az = az` 之后加了 `b.settler.Authz = az`。
- **`next/server/internal/usage/stats_p2_test.go`**（新文件）：`TestSummaryRankingAndUpstreamModel`、`TestAllOverview`、`TestUsageExport`，全部通过。

运行方式：

```sh
cd next/server && NO_PROXY=127.0.0.1,localhost go test ./internal/usage/ -count=1
```

本机常驻的测试 PG 由 `sdk/testpg` 自动连接。提交前还要跑：

```sh
GOOS=linux go vet ./internal/...
go test ./... -count=1
```

**还没做**：CONTRACTS 里记录 P2 的 §66.5（导出）和 §66.6（`/usage/overview`、`order`/`limit`、`upstream_model`）。

### 2.2 前端（2026-10-28 已全部完成，未提交）

**更新**：下面 9 步都已做完，CONTRACTS §66.5–66.6 也已补写。检查结果：
- typecheck 通过。
- eslint 0 个错误。
- vitest 802 个全部通过（新增 RankingBars、UserRanking、AdminDashboard 三个 spec，UsageRecords、MyApiKeysView 两个 spec 加了用例）。
- 后端 usage、app 测试通过，P2 的三个 PG 测试确认真的执行了。
- console-mock 浏览器验证通过，控制台没有错误：
  - 管理员仪表盘
  - 上游模型切换
  - 点排行跳转并筛选
  - 用户排行页签
  - 导出（BOM、中文表头）
  - 普通用户没有排行和上游切换，地址栏里的 `user_id` 被忽略
  - 密钥用量抽屉（7、30、90 天）

新增文件：
- `views/usage/UserRanking.vue`
- `views/keys/KeyUsageDrawer.vue`
- 上面三个新 spec

接下来只剩 §2.3（提交、发布 0.1.209）和 §3。下面保留原来的待做说明，供核对。

已完成：
- `next/web/src/views/usage/exportUsage.ts`（新文件）：带登录令牌 fetch，遇到 401 时先调一次 `api.get('/me')` 续期再重试，然后用对象 URL 下载文件。
- `next/web/src/views/usage/useUsageSummary.ts`：新增第 5 个参数 `extra`，用来传 `order`/`limit`。
- `next/web/src/i18n/locales/{zh,en}/stats.ts`：新增 `exportCsv`、`exportFailed`、`sourceRequested`/`sourceUpstream`、`userRanking`、`rankingHint`、`inputTokens`、`outputTokens`、`cacheTokens`、`totalTokens`、`userSpend`、`userSpendHint`、`byRequests`、`clickToFilter`、`admin.*`、`key.*`、`tabs.ranking`。

**`otherPlain` 这个键还没加进去**，见下面的问题。

**`next/web/src/components/stats/RankingBars.vue`（新文件，有两处要改）**
1. 第 14 行 `export type RankMetric = …` 要移到 `components/stats/stats.ts` 里（放在 `Granularity` 类型旁边）。组件里改成 `import { …, type RankMetric } from './stats'`。
2. 「其他」一行的标签现在用 `t('stats.other',{n:''}).replace(正则)` 硬削出来。要改成 `t('stats.otherPlain')`，并在两份 `stats.ts` 里加 `otherPlain: '其他'` / `'Other'`。

上一次我用 `node -e` 改这两处时脚本报错，**文件没有被改动**。

**待做**（按顺序）：
1. **修好 `RankingBars.vue`**，见上面两条。
2. **`DistributionCard.vue`**：在 `#actions` 里 Token/费用切换的前面加一个 `<slot name="extra" />`。
3. **`components/stats/UsageCharts.vue`**：加一个 `modelSources?: boolean` 属性。为 true 时在模型分布卡片的 `#extra` 里放一个 SSegmented（请求模型 / 上游模型），模型分布的 `groupBy` 改成 `() => source.value`，取值 `'model'` 或 `'upstream_model'`。管理员使用记录页传 `modelSources`。
4. **`views/usage/UserRanking.vue`**（新建）：管理员的「用户排行」页签。
   - 数据：`useUsageSummary(summaryPath, filters, 'user', enabled, () => ({ order, limit }))`。
   - 控件：前 20 / 50 / 100 / 200 选择，排序方式（费用、请求、Token 由服务端排；输入、输出、缓存在前端对拿到的这批数据再排）。
   - 列：排名（前三名加奖牌）、用户（`user_email` 加 `#id`）、请求数、输入、输出、缓存、总 Token、费用。
   - 点一行时 emit `select(userId)`，由 UsageRecords 设 `filters.user_id` 并切回「用量明细」页签。
5. **`views/usage/UsageRecords.vue`**：
   - 管理员时在 tabs 里加 `{ key: 'ranking', label: t('stats.tabs.ranking') }`，渲染 UserRanking。
   - 在 UsageFilters 的 `#actions` 插槽放「导出 CSV」按钮，调用 `exportUsage(listPath + '/export', filters)`，失败时用 `notifyError`。
   - 初始化时读路由 query 里的 `user_id`、`group_name`、`model_contains`、`api_key_id`、`from`、`to`，合并进 `useList` 的初始筛选。这样管理员仪表盘点排行可以跳转到 `/usage?user_id=…&from=…&to=…`。
   - 给 UsageCharts 传 `:model-sources="admin"`。
6. **`views/dashboard/AdminDashboard.vue` 重写**（设计 §4.4，示意图画面 ④），保留 `PluginSlot dashboard.widgets`：
   - 8 张卡片，数据来自 `GET /usage/overview?tz=`：
     - 今日请求：今日数，对比昨日的涨跌，副行「成功率」和「近 30 天」。
     - 今日收入：原价（倍率不为 1 时显示）、近 30 天。
     - 活跃用户：`users.active_today`，副行「今日新增 / 共」；没有 `users` 时不显示这张卡。
     - 可用账号：`available/total`，副行「异常 / 停用」；没有 `accounts` 时不显示。旧版只统计前 200 个账号（P0-5），新版用后端的 COUNT。
     - 今日 Token、缓存命中率、RPM/TPM（`last_5m` 除以 5）、平均响应。
   - 时间范围条：SDateRange 加粒度切换，写法照 UserDashboard。
   - 图表：`<UsageCharts summary-path="/usage/summary" layout="dashboard" …/>`。
   - 下方两列：
     - 用户消费榜：RankingBars，数据是 `group_by=user&order=<metric>&limit=10`，可切费用/请求/Token；点一行用 `router.push('/usage?user_id=…&from=…&to=…')`。
     - 分组分布：DistributionCard，`group_by=group`。
   - DashboardView 的「刷新」按钮目前只对用户版显示，管理员版也要接上 revision。
7. **API 密钥用量抽屉**（设计 §4.3，示意图画面 ③）：
   - 在 `views/keys/MyApiKeysView.vue` / `KeyUsageCell.vue` 加点击，打开 SDrawer。
   - 抽屉内：7/30/90 天切换（SSegmented）；三张卡（请求、费用、Token）；每日费用柱状图；按模型的分布卡。
   - 数据：`/me/usage/summary?api_key_id=<id>&group_by=day|model|none&from=…&tz=`（用 useUsageSummary）。
8. **更新 mock**（`next/web/mock/billing.ts`）：
   - 加 `GET /usage/overview`，按 `/me/usage/overview` 的写法，再加 `users`、`accounts`。
   - `usageSummary` 支持 `group_by=upstream_model`，以及 `order`/`limit` 和 `__other__` 合并。
   - 加 `/me/usage/export`、`/usage/export`，返回一小段 CSV。
9. **补 spec**：UsageRecords 的 ranking 页签与导出按钮、RankingBars、UserRanking 排序、AdminDashboard 按权限隐藏卡片。

完成后的检查（在 `next/web` 下）：

```sh
npm run typecheck
npx eslint .
npx vitest run
```

当前基线：793 个测试全部通过，eslint 0 个错误。

浏览器验证：用 `.claude/launch.json` 里的 `console-mock`（`preview_start`，端口可能会变）。
- 管理员登录：admin@example.com / admin。
- 普通用户登录：user@example.com / admin。
- 切换账号时，在 `localStorage['s2a.session']` 里改 `access_token`/`refresh_token`；也可以直接 POST `/api/v1/auth/login`。

### 2.3 P2 收尾与发布（只改核心，没有数据库迁移）

1. **补 CONTRACTS §66**：§66.5 导出，§66.6 `/usage/overview` 加排行。
2. **更新设计文档**：在 `USAGE-STATS-AND-USER-CONSOLE-DESIGN.md` 开头写明「P2 已实现」。
3. **提交、推送**。**只 `git add` 自己的文件**：工作区里本来就有和这次无关的改动（`backend/`、`deploy/`、`next/go.work.sum`、`controller/README.md`、HARDWARE-PRIVACY-AUDIT、`next/server/web/dist/index.html`，以及已删除的 `CCGATEWAY-REQUEST-PATH-AND-TOOL-MAPPING.md`），不要一起提交。
4. **发布核心 0.1.209**（纯核心发布，参考记忆 `core-release-without-plugin-key`、`pending-release-0172`）：
   1. 在 ovh 上：`git -C ~/sup2api/src fetch origin feat/next-platform`，再 `git worktree add --detach ~/sup2api/release-0.1.209 <SHA>`（提示 "Could not read" 是浅克隆造成的，可以忽略）。
   2. 用 sed 把 `~/sup2api-managed/stage/0.1.208/build.sh` 复制成 `stage/0.1.209/build.sh`，改掉其中的 V、SHA、SRC，以及注释行。`builtin` 和 `sub2api-plugin` 两项仍从 `stage/0.1.207/payload` 拷贝。
   3. 后台运行 `setsid nohup sh build.sh > build.out`，用轮询等待输出里出现 `BUILD-OK`。**不要用 `pgrep -f`**，它会匹配到等待命令自己。
   4. 备份数据库：

      ```sh
      pg_dump -Fc --no-owner -f ~/sup2api-managed/backups/core-0.1.209/database.dump "$(cat ~/.secrets/supabase-sup2api.dsn)"
      ```

   5. 签名（在 `~/sup2api-managed` 下执行，`set -C` 防止覆盖已有文件）：

      ```sh
      docker run --rm -v $M/stage/$V/payload:/stage:ro -v $M/publish/sup2api:/publish \
        -v $M/keys/release.key:/release.key:ro -v $SRC/deploy/gateway/package-release.sh:/package-release.sh:ro \
        --user $(id -u) --entrypoint sh sup2api-gateway:0.1.125 /package-release.sh \
        /stage /publish /release.key sup2api-ovh-2026 v$V <短SHA> \
        2adf9bfc258a074c2b0f74027ffa814846a91b38ac32c4d58e0f5757a68d01ac > publish/v$V.digests
      ```

      签名用的镜像 `sup2api-gateway:0.1.125` 在 ovh 上还在。签完执行 `find publish/sup2api -newer publish/v0.1.208.digests -type f -exec chmod 644 {} +`。
   6. 导入并升级：

      ```sh
      docker compose --env-file .env exec -T sup2api-1 sub2api-shell import -config /etc/sub2api/shell.json -manifest https://releases/sup2api/<manifest_digest>.json
      python3 upgrade_observe.py <manifest_digest>
      ```

      计划会覆盖 sup2api-1 和 sup2api-ccp 两个节点。
   7. 验证：
      - 两个节点的 `/readyz`：ovh 是 `127.0.0.1:3130`，clicodeplus 是 `127.0.0.1:3140`。
      - 把 `stage/0.1.208/verify-stats.py` 改成两节点版本：现在它遍历 3130–3133，但 3131–3133 已不存在；clicodeplus 节点改为通过 api.prophey.ai 访问。
      - 再验证 `/usage/overview`（带 users、accounts）、`order`/`limit`、`upstream_model`、两个导出接口（看 BOM 和表头）。
      - 用 curl 检查各节点 `/assets` 下的 CSS 是否包含新组件的类名。
5. **记录**：在 `next/deploy/gateway/ovh/README.md` 顶部写发布记录，同时补上**还没记录**的「网关 0.1.127 + CCGateway 0.1.107」；更新记忆 `usage-stats-redesign.md`。

---

## 3. 还没记录的事情

- **`next/deploy/gateway/ovh/README.md`**：顶部目前只写到网关 0.1.126，网关 0.1.127 和 CCGateway 0.1.107 还没写。可参考的数据：
  - 网关镜像 ID `584ba013…`。
  - 插件包 SHA `3839bcfc…8006d`，rollout 192，数据库备份 `backups/ccgateway-0.1.107`。
  - 两个节点更新时，都先把节点从 Caddy 摘下，再重建容器。
- **`next/deploy/gateway/clicodeplus/compose.yml`**：仓库里这份的默认镜像标签还是 0.1.126，服务器上已经改成 0.1.127。用 `ssh clicodeplus 'cat /root/sup2api-node/compose.yml'` 覆盖仓库副本即可。
- **`next/deploy/gateway/clicodeplus/README.md`**：要补一节「网关 0.1.127 懒就绪」，并把 0.1.126 的「1 秒缓存」标为已被替代。

## 4. 常用操作与坑

- **网关镜像发布**：在 ovh 的干净 worktree 里执行 `docker build -f deploy/gateway/Dockerfile -t sup2api-gateway:<V> .`。然后用下面的命令传到 clicodeplus：

  ```sh
  ssh ovh 'docker save … | gzip -1' | ssh clicodeplus 'gunzip | docker load'
  ```

  两边 `.env` 里的 `GATEWAY_IMAGE` 都要改。先更新 ovh，再更新 clicodeplus。clicodeplus 的顺序是：在 Caddyfile 里把 `reverse_proxy 127.0.0.1:3140 127.0.0.1:3141` 改成只剩 `127.0.0.1:3141` 并 reload，重建容器，等 `/readyz` 返回 200，再把 Caddyfile 恢复并 reload。
- **插件发布**：参考 `~/sup2api-managed/stage/ccgateway-0.1.107/{build.sh,rollout.py,refresh_models.py}`。
- **网关的 PG 测试必须用全新数据库**：本机共享测试库 `postgres` 里有残留的插件数据，会导致 14 个用例失败。做法是用一个小 Go 程序 `CREATE DATABASE` 新建一个库，测完 `DROP … WITH (FORCE)`。连接串：

  ```text
  postgres://postgres:postgres@127.0.0.1:<端口>
  ```

  端口在 `C:/Users/16790/AppData/Local/sub2api-testpg/16.9.0/port`。本机没有 `psql`。
- **不要用 bash 写含反引号的内容**：`node -e "…"`、双引号字符串、不加引号的 heredoc 里，反引号都会被当成命令执行（见记忆 `no-backticks-in-bash-strings`）。改 Markdown、Go、TS 一律用 Write 或 Edit 工具；heredoc 写成 `<<'EOF'`。
- **Edit/Write 工具的参数是 JSON**：`"\ufeff"` 会被解析成真正的 BOM 字符。要在文件里写字面量的反斜杠，需要写成 `\\u`。
- **密钥**：
  - 数据库 DSN 在 ovh 的 `~/.secrets/supabase-sup2api.dsn`。
  - 管理员账号是 `~/sup2api-managed/.env` 里的 `SUB2API_BOOTSTRAP_ADMIN_EMAIL`/`PASSWORD`。脚本读入后要 `env.clear()`，**不要打印**。
  - Redis 密码只写在两台服务器的 `.env` 里。
  - 之前对话里泄露过 Redis 密码和 Supabase 密码，用户选择不轮换。
- **用户的规则**：
  - 核心不记录日志。
  - 账号容器只能原地更新，不要重建。
  - 停用的账号不要自行启用。
  - 插件和核心一起发布时，先发插件。
  - Bun 版本必须和官方 ELF 内嵌的版本一致。
  - 节点不装防火墙。
  - 每完成一步都要说明「做了什么、结果如何」。
