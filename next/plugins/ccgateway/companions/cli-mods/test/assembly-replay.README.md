# 原生组装分组验收（按 Claude Code 版本）

入口 `assembly-replay.cjs` 在一次性 Linux 容器中启动真实 Worker、补丁 CLI 和
loopback Messages mock。只覆盖 first-party Anthropic Messages 的
`request --build` / `request --direct`，另有三个 standalone 输入拒绝用例。运行账号是
API Key 账号（`ANTHROPIC_API_KEY` 为合成值）：不覆盖 OAuth 的身份行与账号身份、
Bedrock、Vertex、交互式 agent loop，也不把案例通过率称为 AST 分支覆盖率。

## 版本与制品身份

- `CC_VERSION`（缺省 `2.1.304`）选版本：清单 `fixtures/assembly-cases-<版本>.json`，
  CLI `--ccgateway-info` 的版本、策略头 `cli_version` 都必须是它。清单自带
  `cc_version`，与 `CC_VERSION` 不符时直接失败。
- 预期 SHA-256 **由调用方给出**：`PROBE_EXPECT_CLI_SHA`（补丁 CLI）、
  `PROBE_EXPECT_WORKER_SHA`（Worker；旧名 `PROBE_EXPECTED_WORKER_SHA256` 仍认）、
  `PROBE_OFFICIAL_SHA`（官方 CLI，只有 live/official 两个探针用）。不给时不校验，
  报告 `artifact_identity` 里列出实际 SHA，并标 `sha_unpinned: true`；给了而不符直接失败。
  `PROBE_EXPECT_CLI_PATCH` 可选地核对补丁标签。脚本里不再写死任何 SHA。
- `analysis/assembly-coverage.cjs`（验收门）对未固定 CLI SHA 的报告给出 `blocked`
  （“CLI SHA unpinned”）；`assembly-merge.cjs` 以最终清单的旧字段或
  `PROBE_EXPECT_CLI_SHA` 为准，都没有时要求各批次是同一个 CLI 并标 `sha_unpinned`。

## 清单怎么生成

```sh
cd next/plugins/ccgateway/companions/cli-mods/test
node fixtures/build-assembly-manifest.cjs                       # 2.1.304
CC_VERSION=2.1.310 node fixtures/build-assembly-manifest.cjs    # 2.1.310
CC_VERSION=2.1.310 node fixtures/build-client-content-manifest.cjs
```

需要 `fixtures/official-request-<版本>.json`（`e2e/capture-official.sh` 抓的未改官方请求）。
`ToolSearch`、`DeferredToolPlaceholder` 的定义取自**同一份抓包**的 `tools` 数组
（`official-tools-2.1.304.json` 正是 `official-request-2.1.304.json` 里这两项，
`body_sha256` 相同）；有 `official-tools-<版本>.json` 时生成器核对它与抓包一致，
没有时直接用抓包。要单独留一份带官方 ELF SHA 的工具夹具，抓包时加
`TOOLS_OUT=…/official-tools-<版本>.json`（见 `e2e/capture-official.sh` 头注释）。

| 分组 | 项数 | 合同 |
| --- | --- | --- |
| INPUT | 11 | Worker/standalone 校验、空值、角色、工具回合、保留组件、非字符串 beta |
| SYS | 4 | 字符串/数组/空/缓存 system |
| MSG | 9 | 原消息角色与块、媒体、系统生命周期、超过 2^53 的整数原文、官方完整请求 |
| TOOLS | 12 | 自定义工具、ToolSearch/deferred、typed server 工具、顺序、未知属性 |
| PARAM | 24 | 模型/令牌/thinking/工具选择/output_config/采样参数/未知字段，构建器表达不了的值原样发 |
| SEND | 7 | direct 保字节、beta/auth、一次上游、HTTP 错误、SSE |
| BILL_ENV | 9 | 环境字段替换/擦除、计费头补齐、独立指纹、双计费头拒绝/放行、混合来源 |

## 现行合同（相对 2026-10-20 清单的变化与依据）

| 合同 | 现在 | 依据 |
| --- | --- | --- |
| 上游请求行 | 两种模式都是 `POST /v1/messages?beta=true` | REQUEST-MODES §1.1；`model-request.js` `messagesPath` |
| build 的计费头 | system 开头没有完整计费头的请求，前面插入 CLI 原生整行（`content: billing_insert`，76 项里 60 项） | v16；`content-policy.js` `mergeBillingAttribution`；build 设计 §5.5 |
| direct | 也补计费头（v17）；比较“客户端 body + 合同里的 system 改动”整体相等，system 成员以外的**每个字节**相等，system 不变时整包逐字节相等 | `direct-billing.js`；build 设计 §6.3 |
| 原生计费头 | 单独一块、只有 `type`/`text`、一行；`cc_version` 等于独立算出的指纹、`cc_entrypoint` 为 `sdk-cli`；其余键只能是 `cch`、`cc_prompt_id`、`cc_turn_origin`、`cc_prompt_index`、`cc_turn_index`（值按请求生成，只记录） | build 设计 §5.5 |
| 指纹 | 取第一条有正文的用户消息里第一个**不以 reminder 标签开头**的 text 块（旧 oracle 取第一个 text 块，CC 请求里那是环境 reminder）；盐与采样位置按版本表（`replay-helpers.cjs` `fingerprintFacts`，2.1.304/2.1.310 相同，只有版本串不同） | `request-input.js` `firstPromptText`；build 设计 §6.2；`native/<版本>/billing-fingerprint-oracle.cjs` |
| metadata | 客户端的原样发出，客户端没发就没有（不再接受 CLI 重生成的 metadata）；`params.metadata_regenerated` → `params.metadata_client_value_kept` | API Key 账号身份按 `client`：engine `request_identity.go` `resolveRequestIdentity`；`request-identity.js` `applyBuildMetadata`；build 设计 §7 |
| 构建器表达不了的生成值 | `max_tokens` 0/-1、`stream: "true"`、未知 thinking 类型：不再 400，原样发出（`*_as_sent`）；未知 thinking 时构建器按缺省（机械 disabled）补 `temperature: 1` | REQUEST-MODES §1.1；`request-parameters.js` `generationControls`；`request-build.js` `thinkingConfigFor`；engine `request_generation_validation_test.go` |
| 超过 2^53 的整数 | 不再 400；`messages.unsafe_number_as_written` 断言出站字节含原文 `"unsafe":9007199254740992` | engine `validateBuildContent`（v29） |
| 两个计费头 | 有字段选 `worker`：400、零上游（`billing_duplicate_worker_refused`）；全是 `client`：原样放行、不补头（新增 `billing_duplicate_client_kept`） | `mergeBillingAttribution`；build 设计 §5.5 表、§8 |
| 工具与采样参数 | 不变：工具目录逐项相等（ToolSearch 保留、缺 description 不补），`top_p`/`stop_sequences`/`context_management` 等保留 | CLI-TEST-PLAN §9 |
| 官方请求 | `messages.official_capture_build/direct`，读 `official-request-<版本>.json` | — |

必须保留严格失败：HTTP 200 不能证明组装保真。工具丢失或顺序变化、参数丢弃、未知字段
被增删、`CLAUDE_CODE_EXTRA_BODY` 越过保留合同覆盖内容，都会返回 `fail`。非内容字段闭合
比较：显式预期参数逐项精确断言，其余变化只允许缺省 thinking → `{type:'disabled'}`、随之
`temperature: 1`、缺省 effort `high`（`replay-helpers.cjs` `nativeDefaultPermitted`，
2026-10-20 实测）。有任何 fail/unknown 时退出码为 1。源码符号（`qmn`、`uXn` 等）是
2.1.304 恢复源码里的名字，其他版本经 `artifacts/claude-<版本>/equiv-*.json` 对应。

这些合同是按源码推出来的，**2.1.310 与现行 2.1.304 制品都还没有跑过**；第一次运行出现
的失败要逐项判断是实现问题还是合同问题，不得把实际输出回写成预期。

## 在 ovh 上用新版本运行组装对账

前提：ovh 宿主机有 Docker 与 node；被测镜像 `$IMG`（Worker 镜像，含 `node`）；候选 CLI
发布目录 `$CLI_NEW`（`package-release.cjs` 输出：`manifest.json` + `<版本>/claude`）与
Worker 二进制（`$WORKER_NEW`，或从镜像取 `/usr/local/bin/worker`）。

```sh
V=2.1.310
B=/tmp/ccg-assembly-$V; mkdir -p $B/input $B/out $B/tests
# 1. 测试目录：仓库 next/plugins/ccgateway/companions/cli-mods/test 整个放到 $B/tests
#    （git archive HEAD:next/plugins/ccgateway/companions/cli-mods/test | tar -x -C $B/tests，或 scp -r）
# 2. 输入（UID 1000 要能执行）
cp $CLI_NEW/$V/claude $B/input/claude-linux
cp $WORKER_NEW $B/input/ccg-worker-linux          # 或 docker run --rm --entrypoint cat $IMG /usr/local/bin/worker > $B/input/ccg-worker-linux
cp /path/claude-official-$V $B/input/claude-official-$V   # 只 live-official-client / official-client-replay 需要
chmod 755 $B/input/*
CLI_SHA=$(node -p "require('$CLI_NEW/manifest.json').versions['$V'].sha256")
WORKER_SHA=$(sha256sum $B/input/ccg-worker-linux | cut -d' ' -f1)
OFFICIAL_SHA=b73676430af12f97316a798b8371f81d640f90a58bdcb8f3ce56a835bb47df56   # 2.1.310 linux-x64（artifacts/claude-2.1.310/official-manifest.json）
# 3. 组装对账（76 项）
run() { # $1 脚本, $2 报告名, 其余：额外 -e
  s=$1; n=$2; shift 2
  docker run --rm --network none --user 0 -e CCG_ASSEMBLY_DISPOSABLE=1 -e CCG_REPLAY_DISPOSABLE=1 \
    -e CC_VERSION=$V -e PROBE_EXPECT_CLI_SHA=$CLI_SHA -e PROBE_EXPECT_WORKER_SHA=$WORKER_SHA "$@" \
    -v $B/input:/input:ro -v $B/tests:/tests:ro -v $B/out:/out \
    --entrypoint node $IMG /tests/$s > $B/out/$n.json 2> $B/out/$n.log
  echo "$n exit=$? $(grep -c '^pass ' $B/out/$n.log) pass, $(grep -c '^fail ' $B/out/$n.log) fail"
}
run assembly-replay.cjs assembly-$V
# 4. 客户端来源 × 内容策略（14 项）
run assembly-replay.cjs client-content-$V -e PROBE_MANIFEST=/tests/fixtures/client-content-cases-$V.json
# 5. 官方客户端实时转发（10 项）、官方抓包回放
run live-official-client.cjs live-official-$V -e PROBE_OFFICIAL_SHA=$OFFICIAL_SHA
run official-client-replay.cjs official-replay-$V -e PROBE_OFFICIAL_SHA=$OFFICIAL_SHA
# 6. 验收门（宿主机）
CC_VERSION=$V node $B/tests/analysis/assembly-coverage.cjs $B/tests/fixtures/assembly-cases-$V.json $B/out/assembly-$V.json $B/out/assembly-$V-coverage.json
```

只跑子集：加 `-e PROBE_CASE_FILTER=<子串>` 或 `-e PROBE_CASE_IDS=a,b`。验收 2.1.304 的现行
制品：`V=2.1.304`，官方 SHA 换成 `ea0f135784631619a7a409d07322ecec964f9cc4fd377508ed1ba3f141f27912`。

预期输出：

- `$n.log` 每项一行 `pass <id>` / `fail <id>` / `unknown <id>`；退出码 0 表示全过。
- `assembly-$V.json`：`cc_version`、`artifact_identity`（`cli`/`worker` 的实际与预期 SHA、`pinned_by`）、
  `sha_unpinned: false`、`summary` 为 `{"pass":76,"fail":0,"unknown":0}`、`upstream_requests` 64
  （12 个拒绝项不发上游）；失败项看 `cases[].checks` 里 `status: "fail"` 的断言与 `diffs`。
- live：`summary` `{"pass":10,"fail":0}`；official replay：`status: "verified"`、`failed: 0`。
- 验收门：`acceptance: "pass"`、`issues: []`。
- 组件组合（`component-combination-replay.cjs`）与 Worker 策略矩阵需要
  `fixtures/native-environment-<版本>.json`；2.1.310 还没有（原生环境渲染器在固定输入下的完整模板，
  不能拿 2.1.304 的代替），这两项现在只能跑 2.1.304，脚本对缺夹具的版本直接报错。

## 客户端组件的单项、多项与组合测试

完整来源组合是单独的慢速单元套件，不加入每次默认 Node 测试：

```sh
[CC_VERSION=<版本>] [PROBE_REPORT=<报告路径>] node next/plugins/ccgateway/companions/cli-mods/test/analysis/client-combination-unit.mjs
```

它在固定原生完整模板上穷举 `3^10 × 2^2 = 236196` 个来源组合，按 build 的两步
（`applyContentPolicy` 改环境，再 `mergeBillingAttribution` 合并计费头；计费合并已不在
`applyContentPolicy` 里，旧套件因此在 3/4 组合上失败）逐项校验独立 golden 预期、输入不变、
二次应用幂等和 collector 所需字段。collector 和计费生成是明确的 fixture 替身。2.1.304 现为
236196/236196 通过；报告缺省写 `artifacts/claude-<版本>/client-combination-unit-report.json`。

真实组件组合使用 `component-combination-replay.cjs`：先在隔离容器内按该容器的
`os.type/release` 与受控工作目录生成 `PROBE_MANIFEST`，再调 `assembly-replay.cjs` 执行
216 项（CC、非 CC 各 108：12 单字段 worker、10 单字段 erase、66 对字段、5 组多字段、6 组混合、
6 次连续切换、all-client、重复应用、direct）。必须给生成的清单一个可写输出挂载，例如上面
`run` 里加 `-e PROBE_MANIFEST=/out/component-combination-$V.json`、脚本换成
`component-combination-replay.cjs`。direct 两项现在预期计费来源作用于首块计费头、环境不变。

## 真正启动官方客户端的实时转发

`live-official-client.cjs` 不读取历史请求 fixture：启动未修改的官方 CLI（`CC_VERSION`
版本），经只记录原始请求、注入可信测试策略的入口转发到真实 Worker；补丁 CLI 组装后请求
loopback SSE 上游，响应一路返回官方 CLI。每项检查客户端退出、JSON result、入站/出站次数、
请求行 `?beta=true`、凭据隔离、完整内容/工具、实际目标变化和响应完成；build 的 metadata
必须是客户端原值（API Key 账号），direct 在计费来源改了首块计费头时比较 system 以外的字节、
否则比较全部字节。10 项覆盖默认客户端、单字段、多字段、混合来源、direct、动态 system
排除参数、自定义 system，以及会话首轮/恢复轮。
