# 离线端到端回归套件（e2e）

把**真实的官方 Claude Code 客户端**接到**被测的 Worker + 定制 CLI**，上游换成本地假服务，在一个断网的一次性容器里跑完全部场景，记录上游收到的原始字节。用途：

- **同版本回归**：基线镜像与候选（新 Worker / 新 CLI）各跑一遍，`regress-compare.cjs` 逐请求比较上游收到的请求行、请求头（名字、顺序、值）与正文，期望 0 差异或只有已说明的差异。
- **保真对照**：同一场景里，官方客户端直连假上游（A 侧）与经网关（B 侧）各发一次，`compare.cjs` 逐字段列出差异。
- **定向断言**：`verify.cjs`、`values-verify.cjs`、`beta-check.cjs` 检查 A/B 比较看不出的不变式；`capcheck.cjs`、`respmatch.cjs` 核对 Worker 请求日志。
- **跨版本**：换 CLI 版本时的动态对照（见 [CLI-TEST-PLAN](../../../../docs/CLI-TEST-PLAN.md) 第 4 节）。

来源：`artifacts/claude-2.1.304/e2e/release-0195/kit`（r3 套件，2026-10-25 起用于 0.1.94–0.1.103 的每次发布），合并了 `release-0201/capcheck.cjs`、`release-0203/respcheck.cjs`、`release-0203/respmatch.cjs` 与 `release-0203/kit/proxy.cjs`（记录 Worker 答复正文的版本）。artifacts 里的原文件保留未动。收进仓库时的改动见文末。

## 前提

- **Linux x86-64 主机 + Docker**（ovh）。本机 Windows 没有 Docker，跑不了。容器 `--network none`，不连任何外部地址。
- **被测镜像** `ccgateway-app:<版本>`：里面有 `/usr/local/bin/worker`、`/opt/ccgateway/cli/manifest.json` 与 `<CC 版本>/claude`，以及 `node`、`openssl`、`curl`（Worker 镜像基于 `node:22-bookworm-slim`）。
- **官方未改的 CLI**（Linux x64 ELF），作为客户端。2.1.304 的在 ovh `~/sup2api/checks/ccg-304-v12/claude-official-304`（SHA-256 `ea0f1357…27912`）；2.1.310 的 linux-x64 官方校验和是 `b7367643…7df56`（`artifacts/claude-2.1.310/official-manifest.json`）。
- 宿主机的 `node`（只有 `docker.sh` 读 manifest 时用）；没有时可以在命令前加 `docker run --rm --entrypoint node $IMG` 的方式运行各核对脚本（见下）。
- 所有凭据都是假值：`sk-ant-oat01-ccgaudit-fake`、`sk-ant-ort01-ccgaudit-fake`、`sk-ant-oat01-client`、`ccg-audit-gateway-key`、`ccg-audit-admin-key`、`ccg-audit-upstream-key`，邮箱 `*@example.invalid`，UUID 为 `00000000-…`/`11111111-…`/`22222222-…` 形式。假上游用 `openssl` 现场生成的自签证书冒充 `api.anthropic.com`，经 unix socket 接入。

## 拓扑

```text
            A 侧（参考）                                B 侧（被测）
官方 CLI ──unix socket──▶ 假上游          官方 CLI ──HTTP──▶ proxy.cjs ──▶ Worker ──▶ 定制 CLI ──unix socket──▶ 假上游
 (ANTHROPIC_UNIX_SOCKET,                    (ANTHROPIC_BASE_URL=     扮演核心：注入      w1 :8787 OAuth 账号
  _CLAUDE_CODE_ASSUME_                       http://127.0.0.1:8788    X-CCGateway-       w3 :8777 API Key 账号
  FIRST_PARTY_BASE_URL=1)                    或 :8778)                Request-Policy      （fallback credit 发放方）
```

- `p1`（:8788）→ `w1`（:8787，OAuth：假的已登录凭据 + `CLAUDE_CODE_OAUTH_TOKEN`）。
- `p3`（:8778）→ `w3`（:8777，API Key 账号，`CREDIT_SIM=1`：带 credit beta 的请求先查 Worker 资源身份，再加跟踪头，模拟核心 0.1.187+ 的 credit 路径）。`w3` 的 CLI 经 `shim.sh` 包一层：离线容器里定制 CLI 的 `auth status --json` 会等管理端点，shim 只代答这一个子命令，模型请求不经过它。
- 客户端都设 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`：客户端指向自定义地址时会少发很多 CC 字段（`cch`、`cc_prompt_id`、request-class 等头、`diagnostics`、一块 system），设了以后形状与直连官方相同。线上用户是改 base URL 接入的，评估网关保真度要从客户端实际发来的东西出发。

## 目录与脚本

| 文件 | 作用 |
|---|---|
| `docker.sh` | 宿主机入口：准备工作目录（kit 副本 + 官方 CLI），读出 CLI 固定值，起一次性断网容器跑 `run.sh`，日志写到 `$B/<模式>-<标签>.log` |
| `run.sh` | 容器内主流程：生成证书与两个账号目录，起 `w1`/`w3` 两个 Worker 与 `p1`/`p3` 两个代理，按 `RUN_MODE` 跑各阶段（第 1–6 阶段即 69 个场景） |
| `extra.sh` | `run.sh` 的第 6 阶段（r3 增补）：非 CC 身份与上下文、1–3 层嵌套子代理、credit 流式回执、Worker 自己的 probe |
| `values.sh` + `values.cjs` + `values-verify.cjs` | `values` 模式：12 个“客户端值保真”请求与断言 |
| `conc.sh` | `conc` 模式：两个被跟踪的 credit 流同时在途 |
| `classify.sh` + `noncc3.cjs` | `classify` 模式：计费头位置决定 CC / 非 CC 归类 |
| `shim.sh` | 只代答 `auth status`（见上），其余转给镜像里的 `/opt/ccgateway/cli/<CC_VERSION>/claude` |
| `fake-upstream.cjs` | 假上游（TLS over unix socket）：每个请求按到达顺序记成 `req-NN.json`（`rawHeaders` 保序、`body`、`rawBody` 原文）；按 `SCENARIO` 回答（`text`、`tool`、`subagent`、`sub1/2/3`、`bg`、`fork`、`aux`、`credit`、`credit-slow`、`error400`）；另答 Worker 资源身份探测 `GET /api/oauth/profile`（写 `profile.json`，不计入请求） |
| `proxy.cjs` | 扮演核心：原样转发，只加策略头（`CREDIT_SIM=1` 时再加 credit 跟踪头）；记录入站 `in-NN.json`（原始头与正文）与 Worker 答复 `resp-NN.json`（状态、头、trailer、正文、首字节/结束时间） |
| `noncc.cjs`、`noncc2.cjs` | 非 CC 客户端（`anthropic-sdk-python` UA）按固定顺序发的几组请求，`verify.cjs` 按序号断言 |
| `credit-client.cjs` | credit 流式探针客户端：测首字节与结束时间、收 trailer |
| `regress-compare.cjs` | **两次运行**逐请求比较（B 侧上游所见），掩码随机值；可选白名单规则文件（见“已知差异”）；有差异时退出码 1 |
| `compare.cjs` | **同一次运行**的 A/B 逐字段比较（按请求类别配对），只列差异 |
| `verify.cjs` | 17 组定向断言（下表），退出码 = 是否有失败 |
| `checks.cjs` | 每个请求的类别头、agent/parent/session/prompt 头、计费头、metadata、system 块数与缓存、工具名单，供人工核对 |
| `beta-check.cjs` | 入站 beta 是否都到了出口、网关加了哪些、A 侧独有哪些 |
| `msgs-diff.cjs` | 子代理场景里 messages 的差异是否只在耗时与 agent-id |
| `export-baseline.cjs` | 把 A 侧导出成“真实 CC 发给上游的样子”的基线文件（令牌遮蔽） |
| `capcheck.cjs` | 上游请求记录（CLI v31 `request_capture_v1`）：每个上游收到的请求都在 Worker 日志 `upstream-request.json` 里有同哈希的记录，保留的 `upstream-request.body` 与收到的字节相同，记录的头与收到的一致（密钥遮蔽） |
| `respcheck.cjs` | 响应组装核对，按 request-id 配对；在本套件里配不上（见下），保留它是因为 `respmatch.cjs` 用它的 `assemble()` |
| `respmatch.cjs` | 响应组装核对，按规范化 JSON **内容**配对：Worker 日志的 `response.json` 要能在代理记录的客户端答复（SSE 组装后）里找到相同的一份 |

## 环境变量

| 变量 | 用在 | 缺省（= 2.1.304 时期的取值） | 含义 |
|---|---|---|---|
| `B` | docker.sh | `/tmp/ccg-audit-0195` | 宿主机工作根目录：`work-<标签>/`、日志、manifest 副本、候选制品 |
| `IMG` | docker.sh | `ccgateway-app:0.1.94` | 被测镜像 |
| `OFFICIAL_CLI` | docker.sh | `~/sup2api/checks/ccg-304-v12/claude-official-304` | 官方客户端 ELF，复制成工作目录的 `bin/claude-official` |
| `EXPECT_OFFICIAL_SHA` | docker.sh | 不查 | 设了就核对官方客户端 SHA-256 |
| `CC_VERSION` | docker.sh、run.sh | `2.1.304` | 网关 CLI 的版本：manifest 里取哪一项、策略头的 `cli_version`、shim 的目标路径 |
| `CLIENT_CC_VERSION` | run.sh、noncc2/3 | `2.1.304` | 套件**自己编造**的 CC 形状请求里的版本（`s4` 与 `noncc-context2`/`noncc-classify` 的计费头 `cc_version`、CC 形状 UA）。比较两次运行时两边必须相同 |
| `NEW` | docker.sh | 空 | `1`：把候选 Worker 与候选 CLI 挂到镜像上（不需要先打镜像） |
| `WORKER_NEW` | docker.sh | `$B/worker-new` | 候选 Worker（Linux 静态二进制）；文件不存在时用镜像自带的 Worker |
| `CLI_NEW` | docker.sh | `$B/cli-new` | 候选 CLI 发布目录（`package-release.cjs` 的输出：`manifest.json` + `<版本>/claude` + `ccgateway-patch.json`），挂到 `/opt/ccgateway/cli` |
| `EXPECT_CLI_SHA` | docker.sh | 不查 | 设了就核对 manifest 里该版本的 SHA-256 |
| `TAG` | docker.sh | `NEW=1` 时 `new`，否则镜像标签 | 工作目录名 `work-<TAG>`。换官方客户端、换版本时用不同标签，否则会复用旧目录里的 `bin/claude-official` |
| `KIT` | docker.sh | docker.sh 所在目录 | 复制进工作目录的脚本来源 |
| `REQUEST_LOG` | docker.sh、run.sh | 空（不动日志级别） | `off`/`summary`/`full`：写进每个策略头的 `request_log`（Worker 0.1.102+ 按它记录），并对两个 Worker 本地 `PUT /admin/request-logs`（旧 Worker 按本地级别）。跑 `capcheck`/`respmatch` 前设 `full` |
| `RUN_MODE`、`SMOKE`、`CALIB2` | run.sh | `all` | 由 docker.sh 的第一个参数设定 |
| `CLI_PIN_OVERRIDE` | run.sh | docker.sh 传入；单独运行时读镜像 manifest | Worker 的 `WORKER_CLI_VERSION`/`CCG_CLI_SHA256`/`CCG_CLI_PATCH` |
| `CAP_ROOT`、`CEXTRA` | run.sh | `/t/cap`、`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` | 抓包根目录；客户端附加环境 |

`REQUEST_LOG` 只改 Worker 入站的策略头，不改上游请求；但它让两次运行的入站字节不同，所以用 `regress-compare` 比较的两次运行要用同一个设置（比较只看 B 侧上游，入站不参与，但日志级别会影响 Worker 的耗时与行为）。

## 运行模式

`sh docker.sh <模式>`，每种模式各起一个新容器；工作目录在多次运行之间保留，抓包按场景名落在同一个 `cap/` 下。

| 模式 | 跑什么 | 抓包目录 | 日志末行 |
|---|---|---|---|
| `all` | 第 1–6 阶段，69 个场景（下表） | `cap/` | `== worker logs` 之后的 Worker 日志尾 |
| `values` | 客户端值保真 12 个请求，并当场执行 `values-verify.cjs` | `cap/values/` | `values done`（前面有 `values N/12 pass`） |
| `conc` | 两个被跟踪的 credit 流并发 | `cap/credit-concurrent/` | `conc done` |
| `classify` | 计费头位置归类 3 个请求 | `cap/noncc-classify/` | `classify done` |
| `smoke` | 冒烟：官方客户端一次、非 CC 一次、credit 一次、资源身份、API Key 账号一次 | `cap/smoke-*` | `smoke done` |
| `calib1` / `calib2` | 校准（同一批简化场景各跑一遍，看噪声） | `cal1/` / `cal2/` | `calib done (...)` |

## 场景清单（`all`，69 个场景，122 个上游请求）

请求数是 2026-10-25 起各次运行里 B 侧上游收到的个数（`release-0196/results/regress-0195-vs-new.txt`：“0 of 69 cases differ; 122 requests compared”）。“A/B”表示同一场景官方客户端直连与经网关各跑一次；“B”表示只经网关。策略缩写：微 = `POLICY_MICRO`（build、无注入），低 = `POLICY_LOW`（build、平台/系统版本取服务端、注入四种首轮附件），高 = `POLICY_HIGH`（低 + 内置提示词 + Bash/Read/Edit/Write 四个工具），direct = `POLICY_NONE`，另有 `ERASE`（十个环境字段全擦除）、`ATTACH`（平台/系统/shell/主目录取服务端，附加目录与 git 擦除）、`BILLING`（`cc_version`、`cc_entrypoint` 取服务端）、`ENTRY`（服务端入口 `sdk-cli`）。

### 1. CC 客户端（官方 CLI，第 1 阶段，A/B，24 个）

| 场景 | 客户端命令 / 设置 | 策略 | 假上游 | B 请求数 |
|---|---|---|---|---|
| `main-build-low` | `-p "Reply with the single word OK." --model claude-opus-4-8 --output-format json` | 低 | text | 1 |
| `main-build-low-stream` | 同上，`--output-format stream-json --verbose` | 低 | text | 1 |
| `main-build-micro` | 同 main | 微 | text | 1 |
| `main-build-erase` | 同 main | ERASE | text | 1 |
| `main-build-high` | 同 main | 高 | text | 1 |
| `main-direct` | 同 main | direct | text | 1 |
| `main-build-billing` | 同 main | BILLING | text | 1 |
| `tool-build-low` | `-p "Run the command and report its output."` | 低 | tool（先 Bash tool_use，带 tool_result 后答 DONE） | 2 |
| `tool-direct` | 同上 | direct | tool | 2 |
| `subagent-build-low` | `-p "use a subagent to say OK"` | 低 | subagent（主线程 → LEVEL1 → LEVEL2） | 5 |
| `subagent-direct` | 同上 | direct | subagent | 5 |
| `turn2-build-low` | 两轮：第二次加 `--continue` | 低 | text | 2 |
| `compact-build-low` | 一轮后 `-p "/compact" --continue` | 低 | text | 2 |
| `attach-worker` | 同 main | ATTACH | text | 1 |
| `aux-nonessential` | `-p "Say OK."`，不设 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | 低 | text | 1 |
| `ua-cli-client-build-low` | 客户端 `CLAUDE_CODE_ENTRYPOINT=cli` | 低 | text | 1 |
| `ua-cli-worker-billing` | 同上 | BILLING | text | 1 |
| `ua-cli-entrypoint` | 同上 | ENTRY | text | 1 |
| `ua-sdk-build-low` | `CLAUDE_CODE_ENTRYPOINT=sdk-ts CLAUDE_AGENT_SDK_VERSION=0.2.71` | 低 | text | 1 |
| `apikey-shape-haiku-micro` | API Key 形状客户端（`ANTHROPIC_AUTH_TOKEN`）经 OAuth 账号，`claude-haiku-4-5-20251001` | 微 | text | 1 |
| `apikey-shape-sonnet-micro` | 同上，`claude-sonnet-4-6` | 微 | text | 1 |
| `apikey-shape-opus-micro` | 同上，`claude-opus-4-8` | 微 | text | 1 |
| `apikey-shape-opus-direct` | 同上 | direct | text | 1 |
| `login-account` | 已登录的客户端（自带 `accountUuid` 22222222-…），`-p "Say OK."` | 低 | text | 1 |

### 2. 非 CC 请求（curl，`user-agent: anthropic-sdk-python/0.40.0`，第 2 阶段，B，18 个）

| 场景 | 请求体 / 头 | 策略 | B 请求数 |
|---|---|---|---|
| `plain-build-micro` / `-low` / `-high`、`plain-direct` | `PLAIN`：字符串 system `Answer concisely.` + 一条 user | 微 / 低 / 高 / direct | 各 1 |
| `plain-tools-high` / `-low` / `-direct` / `-micro` | `TOOLS`：客户端自己的 `Bash`（`strict`、`cache_control`）与 `MyTool` | 高 / 低 / direct / 微 | 各 1 |
| `plain-nosystem-build` / `-direct` | 没有 system | 低 / direct | 各 1 |
| `s1-missing-result-build` / `-direct` | assistant 的 `tool_use` 后面没有 `tool_result` | 低 / direct | **0** / 1（build 在 CLI 校验工具配对时拒绝，不发上游） |
| `s2-unsafe-number-build` / `-direct` | tool_use 输入里有 `9007199254740993` | 低 / direct | 各 1 |
| `s3-uppercase-session-build` | `metadata.user_id` 里大写的 session_id | 低 | 1 |
| `s4-no-prompt-id-build` | 带 CC 计费头（无 `cc_prompt_id`）与 agent_sdk 身份行，另带 `x-claude-code-prompt-id` 头 | 低 | 1 |
| `s5-two-beta-lines-build` | `anthropic-beta: claude-code-20250219,context-1m-2025-08-07` | 低 | 1 |
| `s5b-two-beta-lines-build` | 两行 `anthropic-beta`（第二行 `oauth-2025-04-20`） | 低 | 1 |

### 3. 上游错误透传（第 3 阶段，B，2 个）

`err400-build`（低）、`err400-direct`（direct）：假上游回 400，带白名单外的头（`x-internal-route`、`set-cookie`）与正文 `probe error <>&`。各 1 个请求。

### 4. fallback credit（第 4 阶段，经 p3/w3，B，9 个）

| 场景 | beta | 模式 | 假上游 |
|---|---|---|---|
| `credit-beta-0701-build` / `-direct` | `fallback-credit-2026-07-01` | build（微）/ direct | text |
| `credit-beta-0601-build` | `fallback-credit-2026-06-01` | build | text |
| `credit-ssf-0701-build` | `server-side-fallback-2026-07-01` | build | text |
| `credit-ssf-0601-build` / `-direct` | `server-side-fallback-2026-06-01`（不注册 credit 协议） | build / direct | text |
| `credit-issued-build` / `-direct` | `fallback-credit-2026-07-01` | build / direct | credit（拒绝并发放 token） |
| `credit-issued-stream-build` | 同上，`stream:true` | build | credit |

各 1 个请求。

### 5. API Key 账号（第 5 阶段，经 p3/w3，2 个）

`apikey-account-client`（官方客户端 A/B，低）、`apikey-account-noncc-high`（curl 非 CC，高）。各 1 个请求。

### 6. r3 增补（第 6 阶段，`extra.sh`，14 个）

| 场景 | 内容 | B 请求数 |
|---|---|---|
| `noncc-identity` | 非 CC、无 `metadata.user_id`：turn1、turn2（同一对话）、other（另一对话）、`user_id:null`、客户端自带身份、direct | 6 |
| `noncc-context` | 非 CC 伪造 CC 上下文头：plain、forged（子代理头等）、compaction、plain-direct、forged-direct | 5 |
| `sub1-build-low` / `sub1-direct` | 官方客户端，1 层子代理（A/B） | 各 3 |
| `sub2-build-low` / `sub2-direct` | 2 层 | 各 5 |
| `sub3-build-low` / `sub3-direct` | 3 层 | 各 7 |
| `credit-stream-trailer-build` | 被跟踪的流式 credit，假上游首事件后停 1.5 秒 | 1 |
| `credit-json-trailer-build` | 被跟踪的非流式 credit | 1 |
| `noncc-identity2` | 身份边界输入：`user_id:""`、`{}`、只有未知字段、首条消息相同的两个对话、同一对话的后续轮 | 6 |
| `noncc-context2` | CC 形状 UA 但无计费头、计费头不在首块、计费头在首块、direct + CC 形状 UA | 4 |
| `probe-build` | 直接打 Worker 的 `/v1/ccgateway/probe`（不经代理） | 1 |
| `credit-plain-vs-tracked` | 同一正文，先不带 credit beta、再带，都流式 | 2 |

### 其他模式的场景

| 场景 | 模式 | 内容 |
|---|---|---|
| `values` | values | 12 个：`numbers`（tool_use 与 schema 里的 `12345678901234567891`、`1.0`、`-0`、`1e2`、`0.1`、`1.00000000000000001`、`99999999999999999999`、`-9007199254740993`）、`numbers-direct`、`top-k-extra`（`top_k:5.0` 与未知字段 `x_future`）、`max-tokens-inexact`、`max-tokens-ten`（`10.0`）、`max-tokens-zero`、`thinking-future`（未知类型）、`thinking-no-budget`、`stream-string`（`"true"`）、`user-id-number`、`user-id-bad-json`、`user-id-number-direct` |
| `credit-concurrent` | conc | 两个被跟踪的流式 credit，间隔 0.2 秒发出 |
| `noncc-classify` | classify | 三个请求带同样的伪造子代理头：计费头在第二块、无计费头、计费头在首块 |
| `smoke-main`、`smoke-plain`、`smoke-credit`、`smoke-apikey` | smoke | 冒烟 |
| `c-main-low`、`c-tool-low`、`c-sub-low`、`c-direct`、`c-sonnet`、`c-identity`、`c-context`、`c-sub3`、`c-credit-stream` | calib1/calib2 | 校准 |

假上游另有 `bg`（后台子代理）、`fork`（`subagent_type:"fork"`）、`aux` 三种应答，`run.sh` 目前没有场景用它们。

## verify.cjs 的断言

| # | 范围 | 断言 |
|---|---|---|
| 1 | 所有场景 A/B | Messages 请求行带 `?beta=true` |
| 2 | 所有 B | 出口没有 `x-ccgateway*`、`x-request-id`、`x-stainless-helper` |
| 3 | 带计费头的 B | `x-claude-code-prompt-id` 头 = 计费头 `cc_prompt_id`；session 头 = `metadata.user_id` 的 session_id |
| 4 | 入站带工具的场景 | 客户端工具全部在出口，逐字节相同（键序、字段），不新增字段，`strict` 不增不减 |
| 5 | `main-build-low`、`apikey-account-client`、`apikey-account-noncc-high`、`plain-build-*` | 身份行：OAuth 与官方逐字相同；客户端自带的不新增、不挪位；API Key 账号的非 CC 请求不补；非 CC 微/低补 `agent_sdk`，高补 `official_cli_sdk` 且不同时补 `agent_sdk` |
| 6 | `apikey-shape-*` | 客户端发的 beta 全在出口，顺序不变；列出 A 独有（首方路径）与网关新增 |
| 7 | `credit-*`（有 `b.hdr` 的） | 200；除 `ssf-0601` 外有资源身份头；发放了 token 时回执（头或 trailer）= sha256(token)，否则没有回执；没有 Worker 错误源头 |
| 8 | `err400-*` | 400 透传、正文原样、`x-ccgateway-error-source` 会被核心白名单挡掉 |
| 9 | `noncc-identity` | 6 次都到上游；补账号身份（device 64 hex + 账号 UUID）、JSON 字符串载体、session = 会话头、turn2 沿用、另一对话不同、`null` 也补、客户端自带的仍映射、direct 不加 metadata、metadata 在 `max_tokens` 之前 |
| 10 | `noncc-context` | 伪造的子代理/压缩头不进出口、计费头不是子代理；伪造与不伪造掩码后逐字节相同（build 与 direct 各一组） |
| 11 | `sub[123]-*` | 嵌套到对应层数、parent 指向已出现的 agent、每个上下文头出口 = 客户端原值、子代理计费头 `cc_is_subagent=true`、子代理不带 `extended-cache-ttl` |
| 12 | `credit-stream/json-trailer-build` | 被跟踪、资源身份头、回执在 trailer 且 = sha256(token)、不在响应头；流式的首字节先于结束 ≥ 800 ms、分多块、假上游事件间隔约 1.5 秒 |
| 13 | `noncc-identity2` | 空串补身份；首条消息相同的两个对话共享会话（设计如此）；后续轮沿用；其他 metadata 键保留 |
| 14 | `noncc-context2` | CC 形状 UA 不使非 CC 请求接受 CC 上下文；首块计费头的按 CC 处理 |
| 15 | `probe-build` | 200 |
| 16 | `credit-plain-vs-tracked` | 两个都到上游且正文相同；未跟踪的无回执、跟踪的回执在 trailer；两者都是首字节先于结束 |
| 17 | `credit-concurrent` | 两个都 200 且都有回执；第二个没有排队（结束 < 3.4 秒）、两者结束时间相差 < 0.9 秒 |

## 在 ovh 上怎么跑

1. **放 kit**：把本目录拷到 ovh，例如 `$B/kit/`（`git archive` 或 `scp -r`；`.sh` 必须是 LF，仓库 `.gitattributes` 已规定）。`docker.sh` 默认从自己所在目录复制脚本。
2. **准备 `B`**：`B=/tmp/ccg-e2e-<日期>`（任意空目录）。工作目录 `$B/work-<标签>` 首次运行时创建，里面的文件属 UID 1000；要重来就删掉它（宿主机用户不是 1000 时用容器删：`docker run --rm --user 1000:1000 -v $B:/b --entrypoint rm $IMG -rf /b/work-<标签>`）。
3. **官方客户端**：`OFFICIAL_CLI=<路径>`，建议同时给 `EXPECT_OFFICIAL_SHA`。
4. **候选**（`NEW=1` 时）：
   - Worker：在 `next/plugins/ccgateway/companions/worker` 用 Dockerfile 里同样的命令编 `CGO_ENABLED=0 GOOS=linux go build -o $B/worker-new ./cmd/worker`（ldflags 的版本号可省）。
   - CLI：`patch-cli.cjs` → `build.sh` → `package-release.cjs` 的输出目录整个放到 `$B/cli-new/`（见 `cli-mods/README.md` 打包步骤）。
5. **跑**（基线与候选可以并行，标签不同即可）：

   ```sh
   cd $B/kit
   # 基线：镜像自带的 Worker + CLI
   B=$B IMG=ccgateway-app:0.1.103 OFFICIAL_CLI=$OFF REQUEST_LOG=full sh docker.sh all
   B=$B IMG=ccgateway-app:0.1.103 OFFICIAL_CLI=$OFF REQUEST_LOG=full sh docker.sh values
   # 候选：同一镜像，挂新 Worker 与新 CLI
   B=$B IMG=ccgateway-app:0.1.103 OFFICIAL_CLI=$OFF REQUEST_LOG=full NEW=1 sh docker.sh all
   B=$B IMG=ccgateway-app:0.1.103 OFFICIAL_CLI=$OFF REQUEST_LOG=full NEW=1 sh docker.sh values
   # 需要时再跑 conc、classify
   ```

   每次打印 `exit=<码> <日志末行>`。场景是串行的，每个场景都要起一次官方客户端。远程用 ssh 等待时，按日志文件里出现 `^exit=` 判断结束，不要用 `pgrep -f`/`pkill -f`（会匹配到自己）。
6. **核对**（宿主机有 node 就直接跑；没有就 `docker run --rm --network none --user 1000:1000 -v $B:/b -w /b/kit --entrypoint node $IMG <脚本> ...`，路径换成 `/b/...`）：

   ```sh
   node regress-compare.cjs $B/work-0.1.103/cap $B/work-new/cap   > $B/regress.txt
   node verify.cjs          $B/work-new/cap                        > $B/verify-new.txt
   node beta-check.cjs      $B/work-new/cap
   node compare.cjs         $B/work-new/cap  [场景...]             > $B/compare-new.txt
   node checks.cjs          $B/work-new/cap                        > $B/checks-new.txt
   node msgs-diff.cjs       $B/work-new/cap sub1-build-low sub3-build-low subagent-build-low
   node capcheck.cjs        $B/work-new                            # 需要 REQUEST_LOG=full
   node respmatch.cjs       $B/work-new  $B/work-0.1.103           # 需要 REQUEST_LOG=full，Worker 0.1.103+
   ```

### 输出在哪

| 位置 | 内容 |
|---|---|
| `$B/<模式>-<标签>.log` | 容器的全部输出：每个场景的 `== 名字`、客户端退出码与结果摘要、`status=…`、最后的抓包计数与 Worker 日志尾 |
| `$B/work-<标签>/cap/<场景>/a/req-NN.json` | A 侧：官方客户端直连时假上游收到的请求 |
| `…/b/req-NN.json`、`b/resp-NN.json`、`b/emit.jsonl`、`b/profile.json` | B 侧：经网关时假上游收到的请求；credit 场景假上游发出的完整答复与事件时间；资源身份探测 |
| `…/in/in-NN.json`、`in/resp-NN.json` | 代理（扮演核心）收到的入站请求、Worker 给出的答复（含正文、trailer、时间） |
| `…/b.hdr`、`b.body`、`client.*` | curl / 探针客户端看到的响应 |
| `$B/work-<标签>/logs/` | `worker-w1.log`、`worker-w3.log`、`proxy-p1.log`、`proxy-p3.log`、`worker-*-resp.jsonl` |
| `$B/work-<标签>/data-w1/`、`data-w3/` | Worker 数据目录，`request-logs/<uuid>/`（`metadata.json`、`upstream-request.json/.body`、`response.json` 等） |

### 判定通过

| 核对 | 通过标准 |
|---|---|
| 运行本身 | `exit=0`；日志里每个官方客户端 `client exit=0`、`result="OK"`/`"DONE"`；`== captures` 的 B 侧计数与上面的场景表一致（`s1-missing-result-build` 为 0） |
| `regress-compare`（同一 CLI 版本） | `0 of 69 cases differ; 122 requests compared`（只跑了 `all` 时）；退出码 0。比新旧之前先用同一镜像跑两遍（或两个标签）确认 0 差异，排除环境噪声 |
| `verify.cjs` | 末行 `N/N assertions passed, 0 failed`，退出码 0。N 随跑过的模式变化（2026-10-25 的两次：1584、1534） |
| `values` | 日志与 `values-verify.cjs` 输出 `values 12/12 pass` |
| `beta-check` | `client_betas_missing_at_egress` 只允许 1 条：`apikey-account-client #1: oauth-2025-04-20`（客户端是 OAuth 形状，账号是 API Key，登录 beta 只随登录发送，`request-headers.js apiKeyRequestHeaders`）；`added by the gateway` 只能是原生顺序里的 beta（r3：`prompt-caching-scope-2026-01-05, effort-2025-11-24, cache-diagnosis-2026-04-07, oauth-2025-04-20, extended-cache-ttl-2025-04-11`） |
| `capcheck` | `missing: 0`、`bodyMismatch: 0`、`metaBad: 0`、`secretsLeaked: false`；`headerDiff` 只能是运行时在发送边界之后加的连接级头（逐项说明）；不设 `REQUEST_LOG` 时 `w3` 默认 off 不记日志，会少 15 条，属预期 |
| `respmatch` | `matchedClientAnswer` = `responseJson`，`miss` 为空；`rawBodyOnly`/`noResponseFile` 要能逐条解释（例如凭据安全模式不留响应正文） |
| `compare.cjs`（A/B） | 只出现下节“已知差异”里的项 |

## 已知差异的判读方法

### A/B（`compare.cjs`）里允许的差异

2026-10-25 r3 全量（`artifacts/claude-2.1.304/e2e/wf-r3-2026-10-25/results/results-compare.txt`）里出现的全部差异类别，及其原因：

| 差异 | 原因 | 怎么确认 |
|---|---|---|
| `x-client-request-id`、`x-claude-code-session-id`、`x-claude-code-prompt-id`、`x-claude-code-agent-id`、`x-claude-code-parent-agent-id`、`x-claude-code-prev-tool-durations`（标“每次随机”） | 每次运行随机；build + OAuth 时 session/prompt 被按账号映射 | `verify.cjs` 第 3、11 条（相等关系），`checks.cjs` 看每个请求的值 |
| `system[0]` 计费头只差 `cch=…` 与 `cc_prompt_id=…` | `cch` 由官方运行时每次计算；`cc_prompt_id` 被映射 | 同一行其余字段（`cc_version` 含指纹、`cc_entrypoint`、`cc_turn_*`）必须相同 |
| `metadata.user_id` 的 `device_id`/`account_uuid`/`session_id` | 按账号映射；API Key 形状客户端经 OAuth 账号时补账号 UUID | `noncc-identity*` 的断言 |
| `anthropic-beta`：A 有 `mid-conversation-system-clear-at-2026-08-21` 而 B 没有 | 客户端指向自定义地址时自己不发这个 beta，网关不补客户端没发的 | `beta-check.cjs` 的 “only the A side has” |
| `anthropic-beta`：API Key 形状客户端经 OAuth 账号时 B 多 `oauth-2025-04-20`、`extended-cache-ttl-2025-04-11` | OAuth 账号必须带登录 beta；1 小时缓存 beta 随构造器加，位置按原生顺序 | `verify.cjs` 第 6 条 |
| 子代理场景 `messages[3].content[0] (tool_result).content` | 子代理交回的文字里有耗时与 agent-id | `msgs-diff.cjs` 输出 “same after masking agent ids and durations” |
| `attach-worker`、`main-build-erase` 的环境段文字 | 策略要求服务端值或擦除；A 是客户端自己的 | 差异只在策略点名的字段行 |

不在表里的差异都要当作回归，直到查清。

### 两次运行（`regress-compare.cjs`）

同一 CLI 版本的基线与候选应当 0 差异；有差异时先确认它是本次改动的**预期**（例如改 beta 顺序时只有 beta 头不同），在发布记录里逐条写明。

换 CLI 版本（例如 2.1.304 → 2.1.310）时，有些差异是**官方变化**，不是我们的回归。用规则文件把它们列出来，`regress-compare` 只隐藏规则点名的部分，并在末尾汇总被隐藏的项与次数：

```json
{
  "replace": [["claude-cli/2.1.310", "claude-cli/2.1.304"], ["cc_version=2.1.310", "cc_version=2.1.304"]],
  "ignoreHeaders": ["x-stainless-package-version"],
  "mask": ["\"some_new_native_field\":\\{[^}]*\\}"],
  "cases": []
}
```

- `replace`：只作用于右侧（候选），把新版本的字面值换回旧值再比较。
- `ignoreHeaders`：只不比这些头的值，名字与顺序仍比较。
- `mask`：正则，两侧都替换为 `<masked>`。
- `cases`：只比较列出的场景（空或省略 = 全部）。

每条规则都要有证据（AST 对比的 `unitdiff` 输出、新官方客户端自己的抓包），写法与审查见 [CLI-TEST-PLAN](../../../../docs/CLI-TEST-PLAN.md) 第 4.3 节。`cc_version` 末三位指纹已由内置掩码处理（`cc_version=<版本>.<fp>`），规则只需处理版本号本身。

### 已知限制

- `respcheck.cjs` 按 request-id 配对，在本套件里配不上：代理记录的 `request-id` 是假上游给的（`req_ccgaudit<序号>`，每个场景从 1 重新计数），与 Worker 日志的请求 ID 不是同一个。用 `respmatch.cjs`。
- `capcheck.cjs` 只认工作目录 `cap/*/b` 下的请求，以及 `data-*/request-logs/*/upstream-request.json`；本套件经 unix socket 发上游，原生不会在正文末尾加随机空白、也不压缩，所以 `body_sha256` 可以直接与假上游收到的字节比；线上直连时原生对 ≥ 4096 字符的一方请求会加空白再压缩，那里要看 `content_sha256`（CLI v31 起记录，见 `cli-mods/README.md` v31）。
- 本套件不覆盖：真实上游的接受与否、TLS/HTTP 层指纹（CLI 由 Bun 1.4.3 重编，官方内嵌 Bun 1.4.4）、核心本身（代理只模拟策略头与 credit 跟踪头）、控制器隧道。

## 收进仓库时的改动（相对 `release-0203/kit`）

- `docker.sh`：版本、官方客户端路径、候选路径、Worker 二进制可选、日志级别都改成环境变量（缺省值保持原样）；manifest 里按 `CC_VERSION` 取项，取不到就失败；可选核对两个 SHA-256；新增 `smoke` 模式；第一个参数为空时不再因 `set -u` 中断。
- `run.sh`：策略头由 `CC_VERSION` 生成（不设 `REQUEST_LOG` 时与原字节逐字相同，已比对 8 个策略）；去掉写死的 v28 固定值（`aedec4eb…`），单独运行时读镜像 manifest；`shim.sh` 的目标路径按 `CC_VERSION` 生成；新增 `REQUEST_LOG`（原先是手工在 `start_worker w1` 后插一行 PUT）；`s4` 的计费头版本取 `CLIENT_CC_VERSION`。
- `noncc2.cjs`、`noncc3.cjs`：编造的计费头与 UA 版本取 `CLIENT_CC_VERSION`（缺省 2.1.304）。
- `respmatch.cjs`：原文件从写死的 `/tmp/ccg-audit-0103/respcheck.cjs` 读源码再 `eval` 出 `assemble`，改为 `require('./respcheck.cjs')`；`respcheck.cjs` 导出 `assemble`，命令行行为不变。
- `regress-compare.cjs`：新增可选规则文件、右侧多出的场景（`ONLY-RIGHT`）、有差异时退出码 1；不带规则时，除新增的 `ONLY-RIGHT` 行与退出码外，输出与原脚本相同（已用 `release-0195/results/captures.tgz` 比对）。
- `export-baseline.cjs`：`source` 文字里的客户端说明改为 `OFFICIAL_LABEL`、`RUN_LABEL`（缺省为原文字）。
- 其余脚本与原文件相同。
