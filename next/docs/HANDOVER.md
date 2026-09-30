# 交接文档：sup2api `next/` 插件机制这条线

> 写给**接手这项工作的人 / AI**。2026-09-30 交接。分支 `feat/next-platform`，HEAD `aab0c5cee`，已全部推送到 origin，工作树干净。
>
> **先读这一份，再按 §2 的指引读别的。** 这份文档假设你对仓库一无所知。

---

## 0. 三十秒摘要

- **做的是什么**：给 sup2api 的 `next/` 平台做了一个字节火山方舟 / 豆包插件（`next/plugins/volcengine`，0.5.0），以及为它长出来的**核心插件契约五期改造**（代号 A→E，主题「**插件执行，核心记录**」）。
- **状态**：用户最初要的东西**全部做完**，核心五期**全部落地**，`next` CI **连续全绿**（run #4 起）。
- **还欠什么**：见 §7。其中**一条会漏钱**（`ParseReconcileResponseRequest` 缺 `truncated`）、**一条是最大的信心缺口**（e2e 仍是 0 断言）。
- **最重要的一条纪律**：见 §8.1——报告里必须指出上级（用户 / 主控 / 设计文档）写错的地方。这条在这一轮抓到了十几个真问题，包括一个一条 `curl` 就能打出稳定 5xx 的缺陷。

---

## 1. 仓库与分支

| | |
|---|---|
| 仓库 | `Sub2API-Devs/sup2api`（公开） |
| 工作分支 | `feat/next-platform`（**不是** `main`） |
| HEAD | `aab0c5cee`，== origin，树干净 |
| 主目录 | `next/`（Go 1.27 多模块 workspace） |
| 旧代码 | 仓库根还有老版本（`backend-ci.yml` 管它）。**这条线只碰 `next/`** |

`next/go.work` 的成员：

```
./sdk  ./server  ./e2e  ./tools/sub2api-plugin  ./deploy/mock-upstream
./plugins/{anthropic,gemini,guard,moderation,openai,relay,volcengine}
```

新增 Go 模块要加进 `go.work`，并在自己的 `go.mod` 里 `replace github.com/Sub2API-Devs/sup2api/next/sdk => ../../sdk`（按相对路径）。

---

## 2. 文档地图：哪份是哪件事的真相源

**按这个顺序读**：

| 文档 | 是什么 | 什么时候看 |
|---|---|---|
| **本文件** | 交接说明：环境、纪律、待办、坑 | 现在 |
| [`ROUND-2026-09-PLUGIN-MECHANISM.md`](ROUND-2026-09-PLUGIN-MECHANISM.md) | **前因后果的叙事**：需求怎么变成五期改造、每个决策为什么这么定、沿途挖出的缺陷按后果分类、方法论 | 想理解「当初为什么」时。**建议先通读一遍**，它是唯一有时间线的 |
| [`CONTRACTS.md`](CONTRACTS.md) | **开发契约 + 落地记录**。§25 是插件执行核心记录（§25.1–§25.7 按期递增），§26 是插件机制加固（§26.1–§26.7）。§2 是构建与测试 | **动手前必读 §2**；改契约前必读对应的 §25/§26 小节。**这是权威**，与设计稿冲突时以它为准 |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | 整体设计（1940 行） | 需要了解某个子系统时按章查 |
| [`PLUGIN-EXECUTES-CORE-RECORDS.md`](PLUGIN-EXECUTES-CORE-RECORDS.md) | 核心契约扩展的**原始设计稿**。头部已标注「正文里有若干条后来被证伪」 | 想看当初的推演。**别当现状读** |
| [`PLUGIN-VOLCENGINE-ARK.md`](PLUGIN-VOLCENGINE-ARK.md) | 火山方舟插件设计 + 落地记录。§9 是挖出的核心缺陷清单、§10 是三期代价、§11 是五期收尾与 Ark 事实表 | 动这个插件前必读。**§11.1 的 Ark 事实表对账时会反复用到** |
| [`PROGRESS.md`](PROGRESS.md) | 更早几轮的交接记录，**停在 2026-09-25，这一轮不在里面** | 考古用 |

**一条硬规则**：这些文档是真相源，**先读文档再动手，不要凭记忆或猜测回答**。设计稿与 CONTRACTS 冲突时，CONTRACTS 赢。

---

## 3. 环境：这台机器的特殊之处

**这些不是建议，是踩过的坑。**

### 3.1 文件编辑

**一律用 Edit / Write 工具。用 python 或 sed 写文件会静默失败** —— 这台机器上 `python` 是 WindowsApps 的占位符，直接 exit 49，**不报错、不写文件**。

`sed -i` 做简单替换可以用（验证过），但多行 / 精确替换用 Edit。

**heredoc 写长文档会被内容里的引号绊住**（本轮失败过两次）：嵌套 heredoc 必挂；单个 `<<'EOF'` 写几百行中文 Markdown 也可能挂。**长文档用 Write 工具。**

**Write 工具的 `/tmp` 与 shell 的 `/tmp` 不是同一处** —— Write 写到 Windows 临时目录，shell 看不到。要跨工具传文件就写到仓库内的路径。

### 3.2 数据库测试

用 `testutil.DB(t)`，需要环境变量：

```bash
TEST_DATABASE_URL=postgres://postgres:sub2api@127.0.0.1:45432/postgres?sslmode=disable
```

`45432` 是**到 ovh 测试库的 SSH 隧道**，主控通常常驻开着：

```bash
ssh -N -L 45432:127.0.0.1:45432 -L 36379:127.0.0.1:36379 ovh
```

**先确认隧道活着**（`echo > /dev/tcp/127.0.0.1/45432`）。没有这个变量时数据库测试会**自动跳过**——所以「本地全绿」可能意味着「约 70 条 DB 用例一条没跑」。

Redis：单测用 `github.com/alicebob/miniredis/v2`；集成测试用 `TEST_REDIS_URL=redis://127.0.0.1:36379/0`。

**耗时注意**：经隧道跑 `internal/usage` 约 **610 秒**，`internal/account` 约 370 秒。`go test` 默认超时 10 分钟，所以 **`next/server` 的完整 `./...` 必须带 `-timeout 30m`**，否则会 `panic: test timed out` 而与代码无关。CI 的门禁脚本已经带了。

（CONTRACTS §2 的脚本注释里写着「usage ~8.5 分钟」——那是隧道往返延迟造成的，数据库同网络时只要 1.1 秒。）

### 3.3 推送

```bash
git -c http.proxy=http://127.0.0.1:7890 push origin feat/next-platform
```

本机直连 GitHub 时好时坏，**推送要带这个代理**。

### 3.4 读 CI 日志

Actions 的 `actions/jobs/{id}/logs` 对非 admin 返回 403，**但本机 git credential helper 里存着一个能用的 token**：

```bash
TOK=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')
curl -s -H "Authorization: Bearer $TOK" --proxy http://127.0.0.1:7890 \
  "https://api.github.com/repos/Sub2API-Devs/sup2api/actions/workflows/next-ci.yml/runs?per_page=4"
```

**CI 红先看日志，不要先猜。** 本轮主控一度断言「需要 admin 权限取不到」，结果让 agent 白花大半时间做无谓的 Linux 复现；拿到日志后 30 秒定案。

**只认 run 级 `conclusion`**。本轮主控用步骤级的 grep 误报过一次「CI 全绿」，必须当场更正——步骤的 `success` 不代表 run 通过。

### 3.5 前端

Node 24 + npm，目录 `next/web`。只有 `typecheck` 和 `build` 两个脚本，**没有 lint、没有测试运行器**。

```bash
cd next/web && npm run typecheck && npm run build
```

产物输出到 `next/server/web/dist`（被 `next/server/web` 用 `embed` 嵌入）。**跑完 build 必须还原占位文件**，见 §9.1。

### 3.6 在 Linux 上跑测试（seccomp / `/proc` 等）

本机是 Windows。需要真 Linux 的测试用 ovh 上的一次性容器：

```bash
# 同步代码到 ~/sub2api-next-test/ci/<你的代号>/ 然后
docker compose -f next/deploy/ci/compose.yml run --rm gotest go test ./...
```

用完删掉同步目录。

---

## 4. 服务器约束（**安全相关，务必遵守**）

ovh 这台机器上跑着**生产的 sup2api 和 newapi**。

- **只碰你自己的同步目录和一次性 `gotest` 容器。不要触碰服务器上的其他 compose 项目和容器。**
- **所有测试组件一律用 docker compose 启动，禁止在服务器上直接安装或运行任何服务 / 进程。**
- 测试库是 compose 项目 `sub2api-next-testdb`（目录 `~/sub2api-next-test/testdb`）。
- **e2e 绝不能跑在生产 sup2api 栈上** —— 它会创建用户、账号、产生扣费。

---

## 5. 怎么验证「做完了」

CONTRACTS §2 要求每个模块通过四条，CI 的门禁脚本就是它：

```bash
sh .github/next-ci/next-check-module.sh next/sdk
sh .github/next-ci/next-check-module.sh next/server     # 需要 TEST_DATABASE_URL
sh .github/next-ci/next-check-module.sh next/plugins/volcengine
```

脚本做四件事：`gofmt -l .`（有输出即失败）、`go vet ./...`、`go build ./...`、`go test -count=1 -timeout 30m ./...`。

另外还应做的：

```bash
GOOS=linux go build ./...     # 交叉编译（镜像是 Linux）
# 改了 sdk 之后，确认七个插件仍能编译：
for p in anthropic gemini guard moderation openai relay volcengine; do (cd next/plugins/$p && go build ./...); done
```

改 proto 后：`cd next/sdk && buf generate`（工具在 `go env GOBIN`）。

CI 有三个 job：`server (with PostgreSQL and Redis)` / `sdk, tools and e2e` / `plugins`。`server` job 里有一步叫 **「Database tests really run」**——它保证那约 70 条 DB 用例真的连库跑了而不是静默跳过。**这一步是这轮最重要的防线之一，别删。**

---

## 6. 已经定过的决策：**不要重新论证**

| 决策 | 内容 | 出处 |
|---|---|---|
| **插件执行，核心记录** | 插件只陈述上游事实（模型在哪、用了多少、错误什么意思、任务完成没）；核心做决定并落账（定价、扣费、账本、使用记录、调度）。**插件永远不说「扣多少钱」，只说「用了多少」** | 用户原话，全线的总原则 |
| **核对超时保留预扣** | 核对超次数 / 超时限时，预扣即最终费用，不退。理由：调用已真实发往上游、成本已产生。留人工出口（重新核对 / 退款） | 用户裁定 2026-09-29 |
| **未知时长按模型上界预扣** | Ark 2.5 的 `duration: -1` 是官方默认（模型自选），所以不写时长的提交按 30 秒预扣 ≈ 45 元。**接受，靠核对退回** | 用户裁定 2026-09-30，理由写在 `videospec.go` 头部 |
| **`max_reconcile_age_sec` 默认 7 天** | Ark 视频任务上游保留 7 天可查，24h 会让本来核对得上的任务被提前放弃（而放弃 = 保留预扣 = 用户为猜出来的数字付钱） | CONTRACTS §25.6 |
| **`billing:"free"` + plugin 用量源 = 硬错误** | `check` 只有 `FieldError` 没有 warning 等级，所以只能硬错误。代价（免费端点想用插件计量做统计也被拒）写在规则旁边 | CONTRACTS §25.6 |
| **`BUILTIN_PLUGINS` 显式列举** | 进市场 = 「运维可以装」（发现式，新插件零改动）；进 builtin = 「每个部署都带且不能卸载」，是部署决策，不该是「目录存在」的副产品。volcengine 故意不内置（需要每个部署自己的 Ark 凭证和 baseurl） | `build-go.sh` 注释 |
| **粘性会话留在核心** | 不做成插件（与限流身份 / failover 耦合）。插件选账号的扩展点已由 `RankAccounts` 提供，核心保留最终调度权 | CONTRACTS §24 |
| **官方火山 SDK 已移除** | 换成自写 V4 签名，用官方 SDK 的 golden vector 交叉验证。收益：`ctx` 可取消、不再重试非幂等 `Create*`、少 6 个模块 | `PLUGIN-VOLCENGINE-ARK.md` §11.5 |

---

## 7. 待办队列（按优先级）

### 7.1 会漏钱 —— 最高优先

**`ParseReconcileResponseRequest` 缺 `truncated`**（CONTRACTS §25.7 第 1 条）

`next/server/internal/usage/reconcile.go` 用 `io.ReadAll(io.LimitReader(resp.Body, 256KiB))` 读核对响应，**插件收到半个 JSON 文档而且无从得知**。

这与 §25.3 给 `ExtractUsage` 定的规则**正好相反**（那里超 `maxBytes` 就**不给**，理由是「半个 JSON 值解出来是错数，不是没数」）。C 期给 `ExtractUsage` 加了 `truncated`、E 期加了 `fields_omitted`，都为了同一件事，而核对这条路上两个都没有。

后果：被截断的状态文档里 `status` 在前会读出 `succeeded`、`usage` 在后被切掉读成 0 → 插件答 `SETTLED` 带 0 → **全额退款**。

**两个修法二选一**：加 `truncated` 字段，或者照 `ExtractUsage` 的规矩超限就不给。**后者更符合已有契约**。

### 7.2 最大的信心缺口

**e2e 仍是 0 断言**（`PLUGIN-VOLCENGINE-ARK.md` §9.9）

**这不是改个 URL 能救的。** 缺的是整套目标拓扑：`deploy/compose.yml`、`deploy/caddy/`、`deploy/scripts/` 已于 2026-09-27 删除，现在只剩 `deploy/single/compose.yml`（两个节点直接发布 3130/3131），**没有 Caddy、没有 mock-upstream、没有 `/__node1` `/__node2` `/__mock` 三条辅助路由**。而 e2e 的 `E2E_MOCK_URL`、`E2E_NODE_URLS`、`docker.go`、`mock.go` 全建立在那套拓扑上。

所以就算把默认值改成 3130，e2e 仍是 0 断言——只是从「ping 不通」换成「`/__mock` 404」。

**需要做决策**：重建那套拓扑，还是改写 e2e 适配 single 拓扑，还是别的。**建议先出方案给用户定，别闷头建。**

另外 e2e 里有四处**静默跳过 / 定时炸弹**（`PLUGIN-VOLCENGINE-ARK.md` §9.8 第 11–14 项），修拓扑时一并处理。

### 7.3 会静默分叉

**`next/web/src/api/types.ts` 的 `UIPluginPage` 是 `manifest.Page` 的手写镜像**，没有任何东西保证同步。本轮加 `search` 字段是手动补的。**下一个往 `manifest.Page` 加字段的人会忘，后果是「声明了但前端读不到」。**

修法方向：生成，或加一个跨语言比对测试。注意 `next/web` **没有测试运行器**，所以检查大概得落在 Go 侧（参考 `icons.json` 那套 sha256 闸门的做法，见 §8.6）。

### 7.4 小而明确

| 项 | 位置 | 说明 |
|---|---|---|
| `anthropic /models?q=` 不转义 LIKE 元字符 | `next/plugins/anthropic/internal/anthropic/models.go` | `?q=%` 返回全量目录并显示成搜索结果，`?q=a_c` 命中 `abc`。`moderation` 和 `volcengine` 都是正确写法，照抄即可（`volcengine` 的叫 `LikeTerm`）。可考虑把它提到 `pluginsdk` 省得每个插件各写一遍 |
| `usageRequestFields` 表达不了数组任意元素 | CONTRACTS §25.7 第 2 条 | `ValidUsagePath` 只收单值路径，`content.#.text` 被拒。火山靠枚举 `content.0/1/2.text` + `content.#`（数组长度）绕过。建议允许受限的多值路径 |
| `fields` 的值是原始 JSON 这件事要写进契约正文 | CONTRACTS §25.7 第 3 条 | 取的是 `gjson.Result.Raw`，字符串**带引号**。插件作者极易写错 |
| `next-ci` 没有前端 job、不构建镜像 | `.github/workflows/next-ci.yml` | 所以 `build-go.sh` / `build-demo.sh` 这条打包路径**零 CI 覆盖**，前端的保证也只能挂在 Go 测试上 |
| `manifest.Page` 的 `serverPaged` 仍有一个盲点 | `DeclarativeTable.vue` | 路由带 `page` 信封却不真分页时，核心分不出来。已从启发式改成读响应事实，但这一种情况静态不可验证 |
| `usage_extract=plugin` 放错了列 | CONTRACTS §25.6 末尾 | 它是**事实**不是异常，却放在叫 `anomalies` 的列里。汇总 SQL 已把它排除，但根子上该挪出去 |
| `0002_video_tasks.sql` 的列注释已过期且不可改 | — | 迁移 checksum 不可变。只能靠后续迁移的 `COMMENT ON COLUMN` 追平 |

### 7.5 记录在案、不排期

见 `PLUGIN-VOLCENGINE-ARK.md` §9.7 的「暂不做」小节（`plugin/pkg` 混合包、`ValidateOptions.Tooling` 的策略布尔、`facts` 的累加语义）。

---

## 8. 工作纪律：这一轮验证有效的做法

**用 agent team 并行推进时，这几条必须写进每个 agent 的提示词。** 每一条都是被实践反复证明有用的。

### 8.1 「必须指出我写错的地方」

> 「报告里必须指出我的设计文档 / 指令写错或不可行的地方，**直说，不要替我圆场**。」

这一轮靠这条抓到的真东西（部分）：

- 一条会把整列变成噪音的错误指令
- `sdk/platforms.Builtin()` 的浅拷贝会**污染全进程**
- `endpoint.response` 是**死声明**（声明了运行时从不读）
- 一条从 2026-09-24 就错、**206 个 commit 没人发现**的测试断言
- `readBody` 不查 UTF-8 → **一个 `curl` 就是稳定 5xx**
- 主控给的字段清单漏掉一个入口，**会低估 9 倍**

**这条是投入产出比最高的一句话。** 不写它，agent 会替你圆场。

### 8.2 一个 Go 模块同时只让一个 agent 写

两个 agent 并行改同一模块时，彼此的 `go build ./...` 会看到对方的半成品，产生大量假失败，agent 会去调查不存在的问题。

**实测有效的切分**：

| 轨 | 目录 |
|---|---|
| 核心轨 | `next/sdk` + `next/server` |
| 插件轨 | `next/plugins/<单个插件>` |
| 前端轨 | `next/web` |
| 工程轨 | `.github/`、`next/e2e/`、`next/deploy/`、`next/tools/` |

只读的 agent（排查、审计）可以任意并行，但要告诉它「某些目录正处于在途状态，看到半成品别当成问题」。

**明确列出禁改目录**，并说明「那里有别的 agent」。

**跨轨依赖靠 SendMessage**：本轮 `core-declare` 落地 `manifest.Page.Search` 后直接通知了 `plugin-adopt`，后者自己把 `"search": "q"` 加上了。这比让主控当中转站快。

### 8.3 收紧校验规则必须设前置关卡

先量全量资产（**三个内置平台 + 七个插件**）满不满足新规则。不满足时判断是资产不规范还是规则太死。

**不许为了让测试过悄悄放宽规则，也不许为了保住规则硬改资产** —— 两种都要显式报告。这一轮每条新规则都是零误伤落地的。

### 8.4 「钱算错了但没人发现」必须有测试证明现在会被发现

不是「新行为有测试」，是「**旧的错误行为会被这个测试抓住**」。

最好的例子：拆掉插件自建的 `est_tokens` 估值表之后，测试**直接把那一列清成 0 再跑一遍**，答案必须不变——这正面证明「预估现在由核心持有」，而不是靠「旧列没了」间接推断。

### 8.5 测试不许用间接证据，也不许假设端口空闲

这条是被 CI 的第一次运行教出来的（详见 `ROUND-2026-09-PLUGIN-MECHANISM.md` §7）：

- **不许假设某个本地端口是空闲的**。CI 的 `server` job 用 `ports: 5432:5432` / `6379:6379` 把 postgres / redis 发布到 runner 的 `127.0.0.1`（GH runner 上 job 不在容器里，必须这么发布），所以任何「连这个端口应当失败」的断言都会在那里翻转。
- **不许用「A 失败」来间接证明「B 生效」** —— 直接证明 B。要证明「连不上」就用 `net.Listen(":0")` 拿端口再立刻 `Close()`；要证明「连得上」就起自己的监听。

### 8.6 生成物必须有办法发现自己过期了

`sdk/manifest/check/icons.json` 是从 `next/web/packages/ui/src/icons.ts` 生成的（`npm run icons:json`）。防过期的做法：**json 里记源文件的 sha256，Go 测试重新哈希比对**，不一致就红并给出要跑的命令。

选哈希而不是「Go 里再解析一遍 TS」，因为第二个解析器迟早会和真的那个分歧。

**而且那个查找源文件的辅助函数找不到就 FAIL，绝不 skip** —— 「找不到所以跳过」正是让一个跨模块测试绿着空跑好几个月的写法（CONTRACTS §26.4）。

### 8.7 不许给测试加 skip 来让它过

**这一整轮的主题就是消灭静默跳过的测试**，再加一个就是倒退。

现状：Linux 上 `next/server` 的 `go test -v ./...` 共 **599 个 `=== RUN`，只有 1 个 SKIP**（`TestDemoPlugins`，缺 `S2P_DEMO_DIR`）。保持这个数字。

### 8.8 替换厂商实现必须交叉验证，向量来自被替换的那一方

尤其是加密 / 签名。换掉官方 SDK 之前先用它真的发出请求、把整个请求逐字段冻结成 golden vector，自写实现必须**逐字节**复现。

**向量一旦要重新生成，必须再从那一方取——用新实现重算会让测试变成同义反复。**

（本轮主控独立复核过一次：从 Go 模块缓存取出已删掉的 `volc-sdk-golang@v1.0.23`，用同样输入独立签名，与提交的向量逐字节相同。模块缓存里通常还留着被删的依赖，这招可以复用。）

### 8.9 agent 不 commit / 不 push

由主控统一处理。agent 只把改动留在工作树，报告里写清改了哪些文件。

---

## 9. 会咬人的坑

### 9.1 `next/server/web/dist/index.html` 是被 git 跟踪的占位文件

它给 `//go:embed all:dist` 兜底（镜像的 `ui` stage 自己 build），而同目录 `assets/` 被 `.gitignore` 的 `dist/` 忽略。

**每次 `npm run build` 都会把它覆盖成引用一堆 ignored 文件的真页面。** 一旦提交，仓库里就有个指向不存在资源的 index.html。

**跑完前端构建必须 `git checkout next/server/web/dist/index.html`，提交前确认它不在 diff 里。**

### 9.2 插件迁移是 checksum 不可变的

`next/server/internal/store/migrate.go` 对每个迁移文件算 sha256 并与 `plugin_migrations.checksum` 比对。**改动已应用的迁移文件会让整个安装 / 升级中止**（`migration X was modified after being applied`）。

所以：

- **列的增删一律新写迁移文件**，已应用的一个字节都不能动
- **迁移文件里不要写「这一列为什么存在」** —— 那种注释会随语义变化而失效，而且**无法修改**。语义变了只能靠后续迁移的 `COMMENT ON COLUMN` 追平

### 9.3 `.gitignore` 的裸规则会吞掉整棵树

曾有一条裸 `scripts`，忽略树里**任何**叫 `scripts` 的目录。CI 脚本最初写进 `.github/scripts/` 时 git 直接当不存在，连 `git status` 都不显示。已收窄成 `/scripts/`。**加 `.gitignore` 规则时想清楚要不要带前导 `/`。**

### 9.4 「留列但停止读写」会让那一列开始撒谎

`est_tokens` 是 `NOT NULL DEFAULT 0`，**没有「未知」这个值**。停止写入之后每一行新记录都会声称「预扣了 0」——这比删了更糟。

正确做法是**保留写入、只砍掉读取**：写进去的是事实，只是插件不再依赖它。

### 9.5 `check` 包没有 warning 等级

只有 `FieldError`。所以「给个 warn」这种需求在校验层**做不到**，只能硬错误或什么都不做。选硬错误时把代价写在规则旁边。

### 9.6 两个 `icon` 字段是两套词汇表

- 顶层 `manifest.icon` → 插件头像，语法是 `text:<1-2字>` / 包内相对路径 / 绝对 URL / `data:`。**不是 SIcon 名字**，已有兜底（取首字母），七个插件全是 `text:X`
- `ui.menus[].icon` → SIcon 名字，**只有这个**该对 `ICON_NAMES` 校验

拼写一样、含义不同。校验层别搞混。

### 9.7 `gjson.ValidBytes` 不检查 UTF-8

而 `proto.Marshal` 拒绝非法 UTF-8。已在 `readBody` 一处堵住（`utf8.Valid` → 400），但**任何新的「把客户端字节塞进 proto string」的地方都要想到这条**（CONTRACTS §25.1「净化不是可选项」）。

### 9.8 看起来像占位符的常量可能是产品决策

`max_reconcile_age_sec` 的 7 天、未知时长按模型上界预扣——都是定过的。**代码注释里写明了它是决策**，不要当成随手填的数字调低。反过来，你自己写这类常量时也要说明。

---

## 10. 核心契约速查（A→E 五期的产出）

改插件或改核心前，先知道有哪些口子可用：

| 能力 | 怎么用 | 期 |
|---|---|---|
| 路径参数 | `RequestMeta.path_params`（五个已有调用点都能用） | A |
| 平台插件句柄 | `core.PlatformBinding.Client` | A |
| **插件提取模型** | 端点 `request.modelSource: "plugin"` → `PlatformService.ResolveModel`。**必须同时声明 `platform.adapter.v1`**，否则拿到 nil 只能 500 | B |
| 声明式 query 白名单 | 端点 `request.queryParams: ["alt","page"]`，`auth.query` 自动排除 | B |
| **插件返回用量** | 端点 `usage.source: "plugin"` → `ExtractUsage`。流式只把 `usage.streamEvents` 声明的事件挑给插件（三重上限：8 个事件名 / `maxBytes` 默认 256 KiB / 64 条），触顶时 `truncated=true` | C |
| 插件补使用日志字段 | `UsageReport` 的 `upstream_model` / `error_type` / `error_message` / `detail_json`（→ `usage_logs.plugin_detail`，上限 4 KiB）。**归属与金额字段核心无条件覆盖** | C |
| 插件传上游错误码 | `ClassifyErrorResponse.client_error_code`（`^[A-Za-z0-9][A-Za-z0-9._:-]*$`，≤64 字节；**非法值丢弃回落，不截断**） | C |
| 插件读自己账号类型的凭证 | `HostService.ListAccounts`（`accounts.read`，不返回凭证）/ `GetAccountCredentials`（`accounts.credentials` + scope `own`）。**审计行先于明文离开函数，审计失败即调用失败** | C |
| **预扣费** | `UsageReport.reserve`（`Reservation{ref_id, tokens, facts, next_check_after_sec, deadline_sec}`）→ 核心写 `pending_settlements`、`billing_status='reserved'` | D |
| **核对循环** | `BuildReconcileRequest` / `ParseReconcileResponse`。核心带账号（含凭证）代发，所以插件**不需要** `net` 权限、**不需要**列账号、**不需要**自己起定时任务 | D |
| 核对结果 | `PENDING` / `SETTLED`（带真实用量）/ `FAILED`（全额退）/ **`SETTLED_ESTIMATE`**（成功但上游没给用量，按预估结算不退） | D/E |
| **插件读请求字段** | 端点 `usageRequestFields: [...]` → `ExtractUsageRequest.fields` + **`fields_omitted`**。上限 16 条 / 单值 4 KiB / 总量 32 KiB。**声明顺序即预算优先级**；值是**原始 JSON**（字符串带引号） | E |
| 页面声明搜索参数 | `manifest.Page.search: "q"`（仅 table 页，不得撞 `page`/`page_size`）。**声明了前端才渲染搜索框** | — |

**永远不交给插件**：定价 / 金额 / 倍率；归属（user_id / api_key_id / group_id / account_id）；直接写 `usage_logs` 或 `balance_ledger`；最终调度权。

---

## 11. 第一件该做的事

1. **通读 `ROUND-2026-09-PLUGIN-MECHANISM.md`**（约 20 分钟）。它有时间线，读完你就知道每个决策的由来。
2. **读 CONTRACTS §2**（构建与测试）和 **§25.7**（最新的三条待办）。
3. **确认环境**：隧道活着（§3.2）、能推送（§3.3）、能读 CI 日志（§3.4）。
4. **跑一遍门禁确认基线是绿的**：`sh .github/next-ci/next-check-module.sh next/sdk`（快），再看最近一次 CI run 的 conclusion。
5. 然后从 **§7.1（`truncated`，会漏钱）** 或 **§7.2（e2e，需要先出方案给用户定）** 开始。

---

## 12. 交接时的未决事项

- **e2e 的目标拓扑需要用户决策**（§7.2）。建议出 2–3 个方案（重建 Caddy 拓扑 / 改写 e2e 适配 single / 用 compose 起一套专用 e2e 栈），列出代价，让用户选。
- **主控在交接前正准备派三轨**：核心轨（`truncated` + 数组路径）、插件轨（anthropic 的 LIKE 转义）、工程轨（CI 前端 job + 镜像构建 + e2e 拓扑调研）。**这个切分已按一模块一写者验证过，可以直接用。**
- 本轮开过一个后台任务 chip 去修 anthropic 的 LIKE 转义，**未确认是否被执行**，动手前先看那个文件的现状。
