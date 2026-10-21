# 13 · 交叉核验：测试覆盖、CI 门禁、代码规范

- 核验日期：2026-10-21；分支 `feat/next-platform`，HEAD `43d576838`；核验员 verify-tests（只读）
- 被核验材料：M＝`00-SUMMARY.md` §5–6 与 `06-quality.md`；A＝`Downloads/1 - 副本.txt` 第五、六节；B＝`Downloads/1.txt`、`artifacts/ccgateway-audit-20261021/审核报告.txt`、`validation-summary.json` 及同目录日志
- 环境：Windows 11、Go 1.27、Node 24.20；没有 Docker，没有 Linux。需要 PG 的 `next/server` 测试按约定没跑，采信 M/B 的日志
- 临时文件全部在 `%TEMP%\ccg-verify-tests\`（Go `-json` 输出、vitest JSON、deadcode 输出、what-if 副本）。仓库没有改动，结束时 `git status --short` 与开始时一致

判定：成立 / 部分成立 / 不成立 / 无法判定。

---

## 1. 测试数量口径对照

### 1.1 本次实际运行

| 模块 | 命令 | 顶层 | 含子测试 | 结论 |
|---|---|---|---|---|
| 前端 `views/ccgateway` | `npx vitest run src/views/ccgateway` | – | **20 文件 / 259 项**，全过 | 与 M 一致 |
| 前端 `views/ccgateway` + `views/accounts` | `npx vitest run src/views/ccgateway src/views/accounts` | – | **31 文件 / 387 项**，全过 | 与 B 一致：B 的口径是这两个目录合计 |
| 前端全部 | `npx vitest run` | – | 65 文件 / 619 项，全过 | 参考值 |
| companions（只有 `ccgateway/engine` 包有测试） | `go test -count=1 -json ./...`，未设任何 `CCG_*` | 725：通过 630 / 跳过 95 | **1790：通过 1489 / 跳过 301**，失败 0 | 与 M、B 完全一致（B 的 `engine-tests.jsonl` 也是同样的数字，同样是 Windows 跑的） |
| companions/contracts | `go test -count=1 -json ./...` | 57 | 119，全过 | 与 M 一致 |
| companions/worker | 同上 | 22：通过 21 / 跳过 1 | 44：通过 43 / 跳过 1 | 与 M 一致（M 表里的"worker 43"是 Go worker，不是 controller） |
| 插件 `next/plugins/ccgateway` | 同上 | 32 | 145，全过 | 与 M 一致 |
| cli-mods | `node --test test/*.test.mjs` | – | 16 文件 / 116 项，全过，跳过 0（本机有未入库的 `artifacts/claude-2.1.304`） | 三方一致 |
| engine `.mjs` | `node --test` 4 个文件 | – | 9 项全过 | 与 M 一致 |
| contracts `install-locales.test.cjs` | `node --test` | – | 2 项全过 | 与 M 一致 |

engine 的跳过原因（从 `-json` 输出分类）：

- 顶层 95 个跳过中，**85 个由 `CCG_REAL_CLI` 门控**；另外 6 个是 Windows 专属跳过（`shell fixture` 3 个、`Linux executable fixture` 2 个、`Linux shell fixture` 1 个），4 个是其他环境门控（`CCG_COMPACT_REBUILD_INPUT`、`CCG_LINUX_RESOURCE_SSH`、`CCG_E2E_CLI`、隔离探针）。
- 含子测试的 301 个跳过中，`CCG_REAL_CLI` 占 291 个。
- 推算到 Linux CI 上：顶层约 89 个、含子测试约 295 个仍然会跳过。

### 1.2 各方口径核对

| 数字 | 来源 | 实际口径 | 判定 |
|---|---|---|---|
| 前端 259 | M | `views/ccgateway` 20 个文件 | 成立 |
| 前端 387 | B | `views/ccgateway` + `views/accounts` 共 31 个文件（B 只写了"相关测试"，没说明范围） | 成立（口径未说明） |
| 前端 269 | A | 以上任何组合都凑不出 269；静态统计 `it(`/`test(` 只有 185 处。A 也没给出命令 | **无法复现** |
| 核心 ccgateway 4460 | M | 已入库测试 142 个顶层（静态统计 `func Test…(t *testing.T)` 也是 142），含子测试 4460 | 成立 |
| 核心 ccgateway 4465 / 顶层 147 | B | B 的 Linux 日志（`ccgateway-linux-tests.log`）里有 **5 个 `TestZZAudit*` 用例**（`GlobalSchemaVersionTwoRejected`、`WireAlwaysCarriesIdentity`、`MergeDropsIdentityOnOmission`、`StoredOverridesStrictDecode`、`LegacyFieldsLayered`），都没有子测试。这些是其他审核员临时放进去的 `zz_audit_path_test.go`，被编进了 B 的测试二进制。4465 − 5 = 4460，147 − 5 = 142 | 数字属实，但 B 说"不包含 zz_audit_path_test.go"**不成立**。另外，B 在 Windows 上跑的 `server-db-tests.jsonl` 里 ccgateway 包失败了：`TestPortScript` 因为没有 `sh` 而失败（与 M 的 T4 一致），`TestControllerInstallLocal` 卡住，最后 10 分钟超时。B 的汇总里没有提这次失败 |
| controller 43 项可导入 | M | Windows 下 9 个模块因 `import fcntl` 导入失败，只是部分结果 | 成立（不完整） |
| controller 163 项通过 | B | Linux / Python 3.12，清掉继承来的 `CCG_DEFAULT_CLI_VERSION` 之后全过（`controller-linux-clean-tests.log`：`Ran 163 tests … OK`）。13 个 `test_*.py` 里静态统计 `def test_` 也是 163 个。第一次没清这个变量时：failures=1、errors=79（`controller-linux-tests.log`），其中 78 个是 `TypeError: 'NoneType' has no len()` | 成立；同时说明 controller 测试**依赖宿主环境变量** |
| companions 1790（跳过 301） | M、B | 含子测试 | 成立 |
| "engine 命中 75 处 skip" | A | `engine/*_test.go` 中 `t.Skip` 静态调用 75 处，分布在 51 个文件（本次复现 75/51） | 数字成立 |
| "~60+ 验收用例靠 t.Skip" | A | 实际顶层跳过 95 个，其中 `CCG_REAL_CLI` 85 个 | **低估** |
| 66 处 `os.Getenv("CCG_REAL_CLI")`、49 个文件 | M | engine 65 处 + worker 1 处 = 66 处，共 49 个文件 | 成立 |

### 1.3 统一数字（可复核）

| 套件 | 统一口径 | 数字 |
|---|---|---|
| 核心 `server/internal/ccgateway`（真实 PG，Linux） | 已入库测试，含子测试 | **142 顶层 / 4460 项，0 跳过**（来源：B 的 Linux 日志减去 5 个 `TestZZAudit*`，与 M 一致） |
| 插件 Go | 含子测试 | 32 / 145 |
| contracts | 含子测试 | 57 / 119 |
| worker | 含子测试 | 22 / 44（跳过 1） |
| engine（companions） | 含子测试 | 725 / 1790：通过 1489、跳过 301（`CCG_REAL_CLI` 291） |
| controller（Linux，清理环境变量后） | unittest | 163 |
| cli-mods | node | 16 文件 / 116 |
| engine `.mjs` + `install-locales` | node | 9 + 2 |
| 前端 ccgateway | vitest | 20 文件 / 259（加上 accounts：31 文件 / 387） |

---

## 2. CI 核验

现有 workflow 有 `backend-ci.yml`、`ccgateway-images.yml`、`cla.yml`、`next-ci.yml`、`release.yml`、`security-scan.yml`。其中 backend、release、security 里的 pnpm/vitest 步骤只针对旧的 `frontend/`（例如 `backend-ci.yml:59-64` 的 `frontend/pnpm-lock.yaml` 和 `make test-frontend`），与 `next/web` 无关。

| # | 结论 | 来源 | 判定 | 证据 |
|---|---|---|---|---|
| C1 | cli-mods 的 16 个测试文件（116 项）不在 CI；`ccgateway-images.yml:57` 只跑 `attachment_policy_mod_test.mjs` | A-T-1、B-F11、M | **成立** | `ccgateway-images.yml:53-57`；`grep -rn "cli-mods\|npm" .github/workflows` 没有命中 `next/`；`cli-mods/package.json` 里的 `npm test` 没有地方调用。另外 engine 的另外 3 个 `.mjs` 和 `install-locales.test.cjs` 也不在 CI（M 的说法成立） |
| C2 | 前端 vitest 不在任何 CI | A-T-3、M | **成立**（不止 vitest） | 整个 `next/web` 在 CI 里既不跑 typecheck，也不跑 lint、test。补充：本机 `vue-tsc -b` 通过，`eslint .` 0 error / 7117 warning，vitest 619 项全过，所以接入 `npm run check` 现在就是绿的 |
| C3 | contracts 模块没有 workflow | M | **成立**（M 的细节需修正） | contracts 有自己的 `go.mod`。companions 里 `go list ./...` 只列出 `ccgateway`、`ccgateway/catalog`、`ccgateway/engine`、`ccgateway/mod`；workspace 模式下，`next/plugins/ccgateway` 里的 `go list ./...` 也只列出插件自己的 2 个包，嵌套模块不会被纳入。所以 contracts 的 **vet 和 test 从来不跑**。M 说"gofmt 也从不检查"**不成立**：`gofmt -l .` 是按文件递归的，`next-ci.yml` plugins job 在 `next/plugins/ccgateway` 下执行、`ccgateway-images.yml:45` 在 companions 下执行，都会覆盖 contracts（本机 gofmt 报 `catalog.go` 只是 `core.autocrlf=true` 产生的 CRLF，HEAD 版本是干净的） |
| C4 | `ccgateway-images.yml` 在 PR 上不触发 | M | **成立**（补充：比 M 说的更窄） | `ccgateway-images.yml:15-24` 只有 `push: branches: [main, feat/next-platform]` 加 `workflow_dispatch`。其他分支的 push 和所有 PR 都不会运行 engine、worker、controller 测试。对比 `next-ci.yml:18-28`，push 和 PR 都会触发 |
| C5 | controller 的 3 个非 `test_*.py` 文件不会被 `unittest discover` 收集 | A-T-4 | **部分成立** | 事实属实（`ccgateway-images.yml:65` 用 `-p 'test_*.py'`）。但这 3 个文件**本来就不是 unittest 用例**：`integration_test.py:216`、`shared_integration.py:189`、`shared_failure_test.py:148` 都只是 `if __name__ == '__main__': main()`，里面没有 `TestCase`；要求真实 Docker，并且有硬性守卫（`TEST_RUNTIME_ROOT` 必须包含 `/checks/xray-…`），镜像固定为 `ccgateway-app:0.1.55`。就算改名也收集不到，更不可能在 GitHub runner 上跑。真正的问题是 `*_test.py` 这个命名有误导性，而且脚本已经过时。M 说"符合预期"更准确 |
| C6 | `internal/ccgateway` 缺少"不得 SKIP"哨兵，`next-ci.yml:181-197` 只针对 migrations | A-T-9 | **事实成立，风险不成立** | 哨兵确实只跑 `TestCoreMigrationsApplyAndAreIdempotent`。但 ccgateway 的数据库测试没有跳过路径：`server/internal/ccgateway` 已入库测试里 `t.Skip` 为 0 处；`sdk/testpg/testpg.go:51-63` 在没设 `TEST_DATABASE_URL` 时会自己启动 PG，失败就 `t.Fatalf`，只有显式设置 `SUB2API_TESTPG=off` 才会跳过。CI 设置了 `TEST_DATABASE_URL`（`next-ci.yml:163`）。B 的 Linux 日志也是 0 跳过。顺带：`next-ci.yml:160-162` 的注释"Without it the ~70 database cases skip"已经过时 |
| C7 | CI 不设置 `CCG_*`，真实 CLI 用例永远跳过 | A-T-2、M | **成立**（A 的数字偏低） | `grep -rn CCG_ .github/` 没有命中。顶层 85 个 / 含子测试 291 个由 `CCG_REAL_CLI` 门控。补充判断：49 个门控文件里，只有约 7 个涉及 build/direct（启发式 grep：`"build"`、`"direct"`、`serveRequestCommand`、`NewRuntime`），其余约 42 个验证的是 native 或研究性探针。**直接在 CI 打开 `CCG_REAL_CLI`，大部分是在测已退役的路径**（见 §5.1） |
| C8 | 测试依赖未入库的 `artifacts/` | M-T5 | **成立** | `cli-mods/test/patch-wire-preservation-304.test.mjs:18-20,46`：基线不存在时直接 assert 失败，并且通过 `next/web/package.json` 借用 web 的 `@babel/parser`（cli-mods 自己没有 `node_modules`）；`billing-fingerprint-oracle.test.mjs:8-10`：基线缺失时**显式 skip 并给出原因**，node 会报为 skipped，不算"静默"。`artifacts/` 在 `git status` 中是 `??`。所以 C1 不能直接一行接入，得先处理这两个依赖 |
| C9 | 补充：controller 测试依赖宿主环境 | B | **成立** | 见 §1.2：继承 `CCG_DEFAULT_CLI_VERSION` 后出现 79 个 error。依据是 `manager.py:642-644` 读取这个变量，`test_cli_profiles.py:27,36` 用 `patch.dict` 设置它，但其他用例没有清理。GitHub runner 不会设置它，所以 CI 目前碰巧是绿的 |

---

## 3. 测试缺口核验

| # | 结论 | 来源 | 判定 | 证据 |
|---|---|---|---|---|
| G1 | `request_identity_sources` 不在 `feature_policy_matrix_test.go` 的 `matrixFields`；新身份字段没有进入完整覆盖矩阵 | A-T-5、B | **成立，而且缺口更大** | `feature_policy_matrix_test.go:18-38` 只有 10 个环境字段和 2 个计费字段（:73 注释写的是 4,128 个用例）。进一步看：`server/internal/ccgateway` 的**所有已入库测试里，没有任何一处**引用 `RequestIdentitySources` 或 `request_identity_sources`，也就是说默认补 `replace`（`feature_policy.go:188-190`）、合并（:140-141）、mergeConfig 省略时丢失（B-F06）都没有测试。前端 `views/ccgateway/*.spec.ts` 里也没有身份字段的用例。`contracts/features/identity.go` 没有对应的 `_test.go`，只在 engine 的 `metadata_attribution_test.go:263-300` 有单元测试 |
| G2 | Core 没有并发测试 | A-T-6 | **部分成立** | `server/internal/ccgateway` 测试里没有 `sync.WaitGroup` 或 `errgroup`，`t.Parallel()` 为 0；仅有的 3 处 `go func()`（`controller_conn_test.go:172,241`、`request_cache_test.go:64`）只是假隧道里的 io.Copy。`feature_revision` 冲突只有顺序版本（`feature_policy_test.go:227-234`）。但"Core 无并发测试"说得太宽：`server/internal/account/automatic_state_test.go:273`、`quota_refresh_test.go` 等是有并发用例的。准确的说法是：**ccgateway 包内没有并发创建、草稿采纳、并发保存 remote-config 或 feature policy 的测试** |
| G3 | `pids_limit` 和 egress 资源没有断言 | A-T-7 | **成立**，范围还可以扩大 | 实现位置：`manager.py:499-502` 的 `common()`（`cap_drop`、`no-new-privileges`、`pids_limit=256`）、`:826`（egress `mem_limit='128m'`）、`shared_egress.py:173`。测试里只断言了 app 的 `mem_limit` 和 `nano_cpus`（`test_manager.py:239-240`）以及 `user`（:373）。**`cap_drop`、`security_opt`、`pids_limit`、egress 的任何资源限制都没有断言** |
| G4 | 取消和断连只有 1 个测试函数 | A-T-8 | **不成立** | 单看 `request_cancellation_test.go` 确实只有 1 个函数（:65），但它是 direct/build × 4 种原因（client、client_with_frame、worker_deadline、parent_deadline）× 是否已发头，共 **16 个子测试**。生产路径上另外还有：`request_command_test.go:339 TestRequestCommandCancelsNativeProcess`（direct 超时会杀掉子进程，Windows 上跳过）、`request_error_test.go:175 TestRequestCommandMidStreamFailureAbortsHTTP`、`runtime_test.go:32 TestRuntimeCloseCancelsActiveRequest`、`runner_lifecycle_test.go:150`、`resource_spool_test.go:49`、`resource_concurrency_test.go:91` 等。真正缺的是**核心侧**：客户端断开后的 failover 和隧道释放 |
| G5 | 跨层契约没有测试（engine→CLI 信封、前端→核心） | M | **成立** | 仓库里没有任何 Go、TS 或 node 测试同时读取另一种语言的字段表（检索 `request-policy.js`、`content-policy.js`、`requestPolicy.ts`、`BuildAttachmentFields` 的跨语言引用，结果为 0）。engine 测试用 shell 假 CLI，不会经过 `cli-mods/request-policy.js:16-18` 的白名单，所以 B1 没被发现 |

---

## 4. "测试把错误行为写成了断言"（M）逐条核对

| # | 对象 | 判定 | 证据 |
|---|---|---|---|
| W1 | 额度 F-01（窗口已重置但未确认 → 判为未知） | **成立** | 插件 `availability.go:143-145` 返回 `quota_reset_unconfirmed`，测试 `availability_test.go:125`（`"allowed reset elapsed"` → `UNKNOWN`）。核心 `account/quota_refresh_test.go:647-652` 的 `TestQuotaNextCheckBounds` 断言插件给的复查提示 1 / 3 / 29 分钟**一律被钳到 30 分钟** |
| W2 | 额度 F-02（一次查询失败就 30 分钟不可调度） | **成立**，并补一个细节 | `availability_test.go:92`（`"failed refresh"` → `UNKNOWN`）、`:124`（`"stale after 30 minutes"` → `UNKNOWN`）。核心 `quota_refresh.go:85` 写的是 `min(quotaErrorTTL*2^min(failures,6), 30min)`，但 `quotaErrorTTL = quotaFresh = 30min`（`quota.go:40-43`），所以**指数退避是死公式，永远等于 30 分钟**。`TestQuotaNextCheckBounds`（`quota_refresh_test.go:654-656`）断言 failures 为 0、1、6、100 时都是 30 分钟，把这一点固化了 |
| W3 | billing 指纹 oracle（07-L5） | **成立** | 原生 `chunk-2gh4h0fv.js` 中，`aW` 取的是 `e.find(s => s.type==="user" && !s.isMeta)` 的第一个文本块（本次直接从基线读出）。oracle `billing-fingerprint-oracle.cjs:46-51` 和 `assembly-replay.cjs:36-39` 都把 wire 消息映射成不带 `isMeta` 的记录，然后取"第一个 user 消息的第一个文本块"，注释里明写 "isMeta is not lifted"。也就是说，oracle 复刻的是实现的偏差，不是官方客户端的取值。与官方的实测差异出自 07-D6（s01/s04/s15），本次没有重新抓包 |
| W4 | JS 与 Go 对身份 client 模式的断言相反（05-F3） | **成立** | JS：`request-identity.test.mjs:37-43` 在默认上下文（`payload()` 等于 `mode:'replace', rewrite:true`，:10）下断言"客户端没发身份就不带 metadata"；:34 和 :87 构造了 `mode:'client'` 上下文。Go：`request_command.go:218` 在 client 模式下不计算 identity，:333 只在 `Rewrite \|\| Session != ""` 时才注入 `CCG_REQUEST_IDENTITY`；`request_command_test.go:105-114` 断言"no client identity: the CLI runs natively"（环境变量为空）。而 `cli-mods/request-identity.js:63` 没有上下文时 `return built`，保留原生 metadata。两边各自全绿，组合起来的行为与 JS 测试的预期相反。B 的"Go 测试断言无身份不传 context，JS 测试手工注入 context"是同一个结论 |

---

## 5. 代码规范核验

### 5.1 关键裁决：native exchange 链在生产中是否可达

**结论：不可达，M 的判断正确，A 把 `main.go`/`exchange` 当作上帝函数来重构是方向错误。**

- 两个生产构造函数都把 `RequestMode` 强制设为非空：
  - `engine/runtime.go:58-60`：空值改成 `"build"`；:61 `validateRequestMode` 只接受空、`direct`、`build`（`request_command.go:24-29`）；:162 `g.RequestMode = o.RequestMode`。
  - `engine/main.go:648-651`（`Serve`）：同样的处理。
- Worker 配置这一层：
  - `worker/internal/config/config.go:102`：默认值 `"build"`。
  - :114-118：遇到 `native` 改成 `build` 并进入 MaintenanceOnly。
  - :132-135：再兜底一次，只允许 direct 或 build。
  - `active_runtime.go:59`：只接受 build 或 direct。
  - `worker.go:49-51` 用 `cfg.RequestMode` 调 `NewRuntime`。
- 生产代码里 `&Gateway{` 只有 `main.go:647` 和 `runtime.go:160` 两处。`main.go:99-102` 在 `RequestMode != ""` 时直接 `serveRequestCommand` 并 return，所以 :103-141 的 `exchange.admit/session/execute` 只有测试里直接构造 `&Gateway{}` 时才会执行。
- 用 deadcode 实测：
  - 从 worker 入口分析，engine 有 **161 个函数**不可达（约 4.3k 行，按 func 到 `}` 计；M 报的是 161 个、约 4.1k 行）。
  - 在仓库外的副本里删掉 `main.go:103-141` 后再分析，增加到 274 个，即**额外 113 个函数、约 2.5k 行**（M 报的是约 119 个、约 2.8k 行，数量级一致）。新增最多的是 `fallback_credit.go`、`mcp_connector.go`、`tool_result_context.go`、`history.go`、`helper_history*.go`、`internal_cache_rounds.go`、`gateway_attachments.go`、`native_branch.go`。
- 修正一点：`runner_session.go`（`cliSession`）和 `passthroughBodies` 在删掉 native 分支后**仍然可达**。路径是 `runtime.go:204-208` 的 CLI 目录同步（每 10 分钟 sync，CLI 变化后 `verifyCLICatalog` → `cli_catalog_verify.go:147,153,219` `probeNativeConfiguration` → `Runner.run` → `cliSession`）。所以 A 说 `runner_session.go` 职责过多，指的是生产后台确实会跑的代码；但它服务的是 native 工具目录校验，也属于 native 时代的残留，build/direct 请求路径不经过它。

### 5.2 逐条核对

| # | 结论 | 来源 | 判定 | 证据 / 说明 |
|---|---|---|---|---|
| Q1 | 161 个函数只被测试调用 | M | **成立** | deadcode 的结果见上 |
| Q2 | native exchange 链生产不可达，应先删再重构 | M | **成立** | §5.1。M 的复杂度 Top30 中"16 个在死路径上"本次没有用 gocyclo 复核 |
| Q3 | `engine.Serve` 是旧入口 | M | **成立** | `companions/main.go` 调 `engine.Serve()`；`companions/Dockerfile:4` 构建它；发布脚本只用 `worker/Dockerfile`（`build-ccgateway-images.sh:54,91`）；deadcode 报 `Serve`、`listen`、`maintain` 不可达 |
| Q4 | controller 的 `v1/messages` 旧中继 | M | **成立** | `manager.py:80` 的 `ROUTE` 包含 `v1/messages(?:/count_tokens)?`，`:1576-1587` 的注释是 "Legacy relay" 加 `relay_timeout=3660`。核心调用 `runtimeRequest` 的 17 处 path 只有 `status`、`config`、`admin/*`、`""`；其余入口（`cleanup.go:78`、`controller_tunnel.go:53`、`direct.go:60`、`workers.go:216`）也都不是 `v1/messages`。中继分支本身要保留给 `admin/*`，只删 `v1/messages` 路由和 3660 秒那个特例 |
| Q5 | `AccountRuntimes=false` 分支仍可激活 | M | **成立** | `config.go:334` 只在 `mergeConfig` 里置 true；`decodeStored`（:253-279）不做归一化；非测试代码里还有 26 处引用 `AccountRuntimes` |
| Q6 | `"2.1.304"` 硬编码 | M（6 处）/ A（三处） | M **成立**；A **部分成立**（低估） | 核心 6 处：`client.go:227`、`request_policy.go:56,95`、`runtime_features.go:27,33`、`workers.go:73`。前端 2 处：`requestPolicy.ts:102`、`RuntimeInstall.vue:177`。另外还有两个 Dockerfile 的 `ARG CLAUDE_VERSION`、`controller/Dockerfile`、cli-mods 的 `package-release.cjs`、`patch-cli.cjs`。cli-mods 里按版本命名的补丁文件属于合理的按版本拆分，不算问题 |
| Q7 | 契约重复四处（核心 / engine / 前端 / cli-mods），没有跨语言一致性测试 | M | **成立** | 核心 `request_policy.go:12-38`；engine 有两份，`request_policy.go:16-30`（native 版）和 `request_command.go:38-45`（`buildRequestPolicy`）；前端 `requestPolicy.ts:66-80`；cli-mods `request-policy.js:3-8,16-18` 手写了 10 个环境字段和 3 个合法 key。跨语言测试见 G5，为 0 |
| Q8 | `engine/main.go` 上帝函数（733 行；`execute` 344-483） | A | **位置属实，结论不成立** | 文件 733 行，`execute` 在 :344-486。但整段都在 §5.1 的不可达分支里，应该删除而不是重构 |
| Q9 | `runner_session.go` 职责过多（481 行） | A | **部分成立** | 行数属实。它在生产中只经 CLI 目录校验可达（§5.1），应随 native 清理一起评估去留，先不要重构 |
| Q10 | `serveRequestCommand` 约 290 行 | A、M | **成立** | `request_command.go:149-438`，恰好 290 行。它是唯一的生产请求路径，**真正需要拆分的是这个函数** |
| Q11 | 请求改写有三处实现 | A | **部分成立** | 生产路径上其实是两套：v1 的 `transformBuildAttachments`（`build_attachments.go:112`，在 `request_command.go:255-267` 只处理 `platform_name`、`os_version`）和 v2 的 `messagesBuildComponentsPolicy`（:274）。第三处 `passthroughBodies`（`passthrough.go:266`）只被 native `main.go:363` 和目录校验 `runner.go:154` 调用，不改写生产请求 |
| Q12 | 前端和后端各有一份三层合并 | A | **成立** | 前端 `requestPolicy.ts:180-182` 的 `mergeFeaturePolicy` 用在分组预览（`GroupPolicyList.vue:75`、`RequestPolicySettings.vue:13`），账号预览走服务端 `/preview`（`AccountFeatureSettings.vue:42`）。后端在 `feature_policy.go:106-146`。前端 `featureDifferenceCount`（:186-194）又写了一遍身份默认值 `'replace'` |
| Q13 | 前端 betas 是死数据 | A、M | **成立** | `requestPolicy.ts:103-111` 只有 7 条，`features.BetaRules()`（`catalog.go:98` 起）有 15 条以上；核心在 `request_policy.go:97` 用默认值覆盖 |
| Q14 | 302 与 304 的 build 适配器大段重复 | A | **成立** | `request-build.js`（61 行）和 `request-build-2.1.304.js`（90 行），去掉缩进后 diff 只有 33 行不同，前者大部分内容都包含在后者里。`patch-cli-2.1.302.cjs:93` 和 `patch-cli-2.1.304.cjs:141-142` 各自引用一个。等 2.1.302 下线（M-S12）后可以一起删 |

---

## 6. 合并后的测试与 CI 整改清单（按投入产出排序）

| 序 | 动作 | 投入 | 收益 / 理由 |
|---|---|---|---|
| 1 | `ccgateway-images.yml` 的 `test` job 增加 `pull_request` 触发（paths 不变），或者把 test job 挪进 `next-ci.yml` | 几行 YAML | engine、worker、controller 的 1790 + 44 + 163 项测试在 PR 上生效（C4） |
| 2 | 新增 `next/web` job：`npm ci && npm run check` | 一个 job | 本机 typecheck、lint、test 都已是绿的，接入零修复；覆盖 619 项，含 ccgateway 259 项（C2） |
| 3 | 新增一步 `sh .github/next-ci/next-check-module.sh next/plugins/ccgateway/companions/contracts`，或让 plugins job 遍历 go.work 中 `plugins/**` 下的所有模块 | 一行 | contracts 的 119 项测试和 vet 开始运行（C3） |
| 4 | 补跨层契约测试（最高价值的新测试）：① Go 测试读取 `cli-mods/request-policy.js`、`content-policy.js` 和 `web/.../requestPolicy.ts` 的字段字面量，与 `features.*Fields` 对比；② engine 用真实 `cli-mods` 模块（node，不需要真实 CLI）校验 `buildRequestPolicy` 信封能被 `validateRequestPolicy` 接受；③ 核心 `resolvedWorkerPolicy` 的输出直接喂给 ② | 中 | 直接防住 B1、L1 这一类问题（G5、Q7） |
| 5 | cli-mods 接入 CI 的前置修复：`@babel/parser` 改用 cli-mods 自己 `npm ci` 安装（package.json 已经声明了 devDependency）；基线缺失时 `patch-wire-preservation-304` 显式 skip，并在 CI 中统计 skip 数量或从受控位置下载基线；然后加 `cd cli-mods && npm ci && npm test`，以及另外 3 个 engine `.mjs` 和 `install-locales.test.cjs` | 小到中 | 116 + 5 项进入 CI（C1、C8） |
| 6 | 身份字段补测：`matrixFields` 加 `request_identity_sources.user_id`（client、worker、replace），核心补默认值、合并、省略保留的用例，前端补 spec；同时**修正 W4 中 JS 与 Go 相互矛盾的断言**，统一到同一份契约 | 小 | G1、W4，与 B1–B3 的修复同步进行 |
| 7 | 修复额度缺陷时一起改测试：`availability_test.go:92,124,125`、`quota_refresh_test.go:647-656`；修 07-L5 时改 oracle（`billing-fingerprint-oracle.cjs:46-51`、`assembly-replay.cjs:36-39` 要用 `isMeta` 语义） | 随缺陷修复一起做 | W1–W3。不改测试的话，修复会被现有测试拦下 |
| 8 | controller 测试做到环境无关：在 `setUp` 或模块级清理 `CCG_DEFAULT_CLI_VERSION` 等 `CCG_*` 变量；补 `common()` 的 `cap_drop`、`security_opt`、`pids_limit` 和 egress `mem_limit` 断言 | 小 | C9、G3 |
| 9 | 先删 native 再整理门控：按 §5.1 删除 native 分支和 deadcode 清单，同时删掉只验证 native 的约 42 个 `CCG_REAL_CLI` 测试文件；剩下的 build/direct 真实 CLI 用例抽成 `requireRealCLI(t)`，放进 `workflow_dispatch` 加自托管 Linux runner 定期跑 | 大（分批） | C7、T1、T3；跳过率从约 17% 降下来，engine 测试规模大幅缩小 |
| 10 | 核心补并发测试：并发创建账号和草稿采纳、并发 PUT remote-config 的 `feature_revision` 冲突、分组删除后保存、未同步保存 | 中 | G2 与 L2/L3 等线上问题的回归 |
| 11 | 小清理：`next-ci.yml:160-162` 的过时注释；controller 的 3 个 `*_test.py` 探针改名或移到 `probes/`，并更新 0.1.55 镜像固定值；`TestPortScript` 在没有 `sh` 时跳过；查清 Windows 上 `TestControllerInstallLocal` 卡住的原因 | 小 | C5、C6、M-T4 |
| 12 | 不建议做：为 ccgateway 单独加"不得 SKIP"哨兵（A-T-9）。该包没有跳过路径，收益接近 0；如果一定要加，在 CI 里断言 `SUB2API_TESTPG` 没有被设为 off 就够了 | – | C6 |

---

## 7. 三方准确度评价（本主题）

| 维度 | M | A | B |
|---|---|---|---|
| 数字 | 全部可以复现（259、1790/301、145、119、43、116、9、2、4460），口径都写明了；controller 只给了 Windows 的部分结果 | 前端 269 无法复现；"~60+"低估（实际 85）；75 处 skip 是静态计数，可以复现 | 387 和 163 可以复现，但没写口径；4465/147 混入了 5 个 `TestZZAudit*`，与 B 自己"不包含"的声明矛盾；Windows 上 ccgateway 包的失败和超时没有在汇总中提及 |
| CI 结论 | 大部分成立且最完整（contracts、cli-mods、web、PR 触发、artifacts 依赖）；"contracts 的 gofmt 也不检查"有误 | T-1、T-2、T-3 成立；T-4 事实对、定性偏；T-9 事实对、风险不存在 | F11 成立，但范围最窄 |
| 测试缺口 | 跨层契约和"测试固化错误"4 条全部成立，价值最高 | T-5、T-7 成立（T-5 实际缺口更大）；T-6 说得太宽；**T-8 不成立** | 身份矩阵缺口成立；controller 环境依赖是独家且有效的发现 |
| 代码规范 | 关键判断（native 链生产不可达，应先删）正确，并有 deadcode 量化支撑 | 位置和行数大多属实，但把不可达的 `main.go`/`exchange` 列为头号重构对象，方向错误；"三处改写"中有一处不在生产路径；版本字面量低估 | 只给了结构性结论（多处手工维护），没有具体位置，不好评价 |
| 总体 | **最准确**，可以作为本主题的主基线 | 能抓到一部分 CI 缺口，但有一项不成立、一项方向错误，数字精度较低 | 实测证据扎实（Linux、真实 PG、容器），但数字口径和自我声明有瑕疵 |

---

## 附 · 复现命令（都在仓库外落盘）

```sh
O=%TEMP%/ccg-verify-tests
cd next/web && npx vitest run src/views/ccgateway --reporter=json --outputFile=$O/vitest-ccg.json        # 20/259
npx vitest run src/views/ccgateway src/views/accounts --reporter=json --outputFile=$O/vitest-ccg-accounts.json  # 31/387
cd next/plugins/ccgateway/companions && go test -count=1 -json ./... > $O/companions.jsonl              # 725/1790
(cd contracts && go test -count=1 -json ./...) ; (cd worker && go test -count=1 -json ./...)
node $O/count.cjs $O/*.jsonl ; node $O/skips2.cjs $O/companions.jsonl                                 # 统计与跳过原因
cd next && deadcode -filter ccgateway ./plugins/ccgateway/companions/worker/cmd/worker                 # engine 161
# what-if：companions 复制到 $O/whatif，删掉 engine/main.go:103-141，GOWORK=off 再跑 deadcode → engine 274
```
