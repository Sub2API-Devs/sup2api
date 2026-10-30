# CCGateway 定制 Claude Code CLI（cli-mods）

本目录维护账号 Worker 里运行的定制 Claude Code：对官方 Linux x64/glibc 版本的源码补丁、补丁加进去的 `claude request` 命令及其支持模块，以及打包脚本。Worker 对每个模型请求运行一次 `claude request --build|--direct`（CONTRACTS §53.21），工具调用交回客户端。

## 当前版本

**现行：Claude Code 2.1.312 / `ccgateway-v38-cc-2-1-312`**（2026-10-30 随插件 0.1.114 上线；ELF SHA-256 `c66a1f056a79c55226b026de197534c97995d543b5b6b08d8d22f7a1648e9ddb`，Bun 1.4.4 编译，TLS 指纹与官方 2.1.312 相同）。逻辑与线上 v36 相同，另加会话记忆（我们写的计费头带 `cc_prev_req`、续接时 turn 字段不回退，能力 `build_session_state_v1`；何时给记忆由 Worker 判定）。迁移记录见 [CLAUDE-CODE-2.1.312-MIGRATION](../../docs/CLAUDE-CODE-2.1.312-MIGRATION.md)。

**上一版：Claude Code 2.1.310 / `ccgateway-v36-content-guard`**（插件 0.1.109–0.1.113，ELF `06d428b6…19fe`）。仓库里 2.1.310 与 2.1.304 的 profile 与锚点仍在，测试照常覆盖（`CCG_CLI_VERSION=2.1.310|2.1.304 npm test`）；它们的标签随支持模块的变化升为 `ccgateway-v39-session-state`（2.1.310）与 `ccgateway-v40-session-state`（2.1.304），这两个版本不再单独发布。v33（`ccgateway-v33-bun-1-4-4`，插件 0.1.105，ELF `720f4645…2463`）起编译用的 Bun 等于官方内嵌版本（profile `bunVersion`，`package-release.cjs` 核对），TLS 指纹因此与官方相同（[CLI-TEST-PLAN](../../docs/CLI-TEST-PLAN.md) 缺口第 8 条）。

- 2.1.310 → 2.1.312 的分析、迁移与验证：[CLAUDE-CODE-2.1.312-MIGRATION](../../docs/CLAUDE-CODE-2.1.312-MIGRATION.md)
- 2.1.304 → 2.1.310 的分析、迁移与验证：[CLAUDE-CODE-2.1.310-MIGRATION](../../docs/CLAUDE-CODE-2.1.310-MIGRATION.md)
- 以后每次换版本的操作手册：[CLI-UPGRADE-RUNBOOK](../../docs/CLI-UPGRADE-RUNBOOK.md)
- 测试体系与用例：[CLI-TEST-PLAN](../../docs/CLI-TEST-PLAN.md)

CLI 经 `claude --ccgateway-info` 报告版本、补丁标签和能力；能力列表只有一处——各版 profile 的 `capabilities`（三版相同）：

`request_direct`、`request_build`、`request_oauth`、`request_error_stderr`、`request_raw_http_errors`、`request_policy_mode_v1`、`build_attachment_sources_v2`、`build_billing_sources_v1`、`build_content_preservation_v1`、`container_resource_reporting_v1`、`request_identity_v1`、`build_identity_line_v1`、`direct_billing_v1`、`request_agent_context_v1`、`build_injection_v1`、`request_levels_v1`、`client_user_agent_v1`、`request_capture_v1`、`management_http_v1`（v34 起）、`build_session_state_v1`（v38 起：`CCG_REQUEST_IDENTITY.previous` 与响应元数据 `session`，见 [计费头文档](../../docs/CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION.md) 第 5 节）。

各能力的含义与核心、Worker 怎样要求它们，见 [build 设计](../../docs/BUILD-REQUEST-COMPONENTS-DESIGN.md) §10。2.1.296 时期 mods 工具扩展的 `native_tools`、`mods_dispatch` 两项随该扩展在 v23 删除（见文末）。

现行行为的事实源：

| 主题 | 文档 |
|---|---|
| build 组件、内容改写、计费头、身份 | [BUILD-REQUEST-COMPONENTS-DESIGN](../../docs/BUILD-REQUEST-COMPONENTS-DESIGN.md) |
| 注入等级（0/微/低/高）、身份行自适应、各层注入 | [CC-INJECTION-LEVELS-DESIGN](../../../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md) |
| 请求类别（主线程/子代理/压缩）、prompt ID | [SUBAGENT-REQUEST-CONTEXT-DESIGN](../../docs/SUBAGENT-REQUEST-CONTEXT-DESIGN.md) |
| 请求头的去向、请求入口与 UA | [REQUEST-HEADERS](../../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md) |
| 模式、策略头、能力门、错误来源 | [REQUEST-MODES](../../docs/REQUEST-MODES.md) |
| 上游请求记录（`--capture-request`） | [REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN](../../../../docs/ccgateway-feature-support/REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md) |

## 硬性规则：Bun 版本与官方一致

编译用的 Bun 必须等于官方 ELF 内嵌的版本（profile `bunVersion`，现为 1.4.4），否则上游看到的 TLS 指纹与官方 Claude Code 不同。这条规则由工具链自动保证，不靠人记：还原器从官方 ELF 读出版本写进 `reconstruction.json`，`patch-cli.cjs` 要求 profile 的 `bunVersion` 与之相等，`build.sh` 要求编译器版本相等，`package-release.cjs` 与 Worker 镜像构建要求 ELF 是该版本编出的，`npm test` 的 `test/bun-version.test.mjs` 也会检查。任何一步不一致都直接失败并给出应改成的版本。详见 [CLI-UPGRADE-RUNBOOK](../../docs/CLI-UPGRADE-RUNBOOK.md)“硬性规则”。

## 版本无关的结构（2026-10-27 起）

补丁分成每版都一样的部分与每版各一份的部分，换 Claude Code 版本时只新增后者：

| 每版一份 | 内容 |
|---|---|
| `profiles/linux-x64-<版本>.json` | 官方 ELF 的 SHA-256；补丁标签 `extension`；`bunVersion`（官方 ELF 内嵌的 Bun 版本，编译必须用它）；`capabilities`；`supportModules`；`core`（主查询所在模块）；`locate`（AST 定位：请求构建器与其 beta 列表变量、system 记录工厂、追加提示词拼接函数、beta Messages 端点所在模块）；`natives`（支持模块用到的原生绑定，分组 `entry`/`command`/`natives`/`build`，逻辑名 → `文件:原生名`）；`coreScope`（环境代码用到的核心作用域名，逻辑名 → 原生名）；`coreImports`（补丁新加到核心的导入）；`patchOnly`；`modules`（每个哈希绑定模块的 SHA-256） |
| `patches/<版本>.cjs` | 锚点：在哈希绑定模块的唯一函数里，把恰好出现一次的文本换掉（`edit` + `once`），以及给模块加导入（`surround`） |
| `test/native/<版本>/` | 该版的原生对账测试（在还原源码上执行原生函数或读原生 AST） |
| `test/fixtures/*-<版本>.json` | 该版的原生夹具与官方抓包 |

每版一样的：`patch-cli.cjs`（读还原目录的版本，按 profile 与锚点打补丁；生成 `ccgateway-native-<组>.js` 按逻辑名再导出原生绑定；把 `native-environment.inc.js` 里的 `native_<逻辑名>` 换成该版核心的名字；复制支持模块；`checkImports`）、全部支持模块（只从 `./native-<组>.js` 按逻辑名导入原生，直接导入 `./chunk-*` 会被补丁器拒绝）、`native-environment.inc.js`、版本无关测试（原生函数用 `stub-*.js` 桩，`test/support.mjs` 的 `linkNatives` 生成同名的原生分组模块）。

## 文件

| 文件 | 作用 |
|---|---|
| `patch-cli.cjs` | 补丁器（版本无关，见上节）：校验 profile 里每个模块的 SHA-256，执行 `patches/<版本>.cjs` 的锚点，按 AST 从请求构建器收集 beta 顺序填入 `request-betas.js`、从 SDK 找 beta Messages 端点填入 `model-request.js`、复制追加提示词拼接函数为 `ccgatewayJoinAppend`、导出 system 记录工厂为 `ccgatewaySystemRecord`；替换文本按原文插入（不解释 `$` 模式）；写出 `ccgateway-patch.json`（补丁标签、能力、改前改后哈希） |
| `patches/2.1.304.cjs`、`patches/2.1.310.cjs`、`patches/2.1.312.cjs` | 各版锚点（2.1.312 的由 `tools/upgrade/examples/derive-anchors-2.1.312.cjs` 生成） |
| `profiles/linux-x64-2.1.304.json`、`profiles/linux-x64-2.1.310.json`、`profiles/linux-x64-2.1.312.json` | 各版 profile |
| `request-entry.inc.js` | 插进 CLI 入口函数（2.1.304 `Ve`、2.1.310 `Ye`、2.1.312 `Ke`）的三行桩：`--ccgateway-info` 与加载 `request-entry.js` 的 `request` 分支；入口的参数列表与设置来源名由锚点给（`entryStub(<参数>, <设置>)`） |
| `request-entry.js` | `claude request` 的入口支持模块：CC 的 fast-path 策略（拒绝时写 403 帧）、需要时才加载命令与原生绑定 |
| `request-natives.js` | 请求用到的原生绑定组合（身份、计费头、登录 beta、指纹、query source、层词表），供 `request-entry.js` 传给命令 |
| `request-command.js` | `claude request` 入口：读输入、direct 计费头、调 build、身份与身份行、beta 装配（一次）、发送、错误帧、请求记录 |
| `request-build.js` | build：内容策略、注入层探针、原生构造器、参数并回、计费合并；返回客户端与新增 beta 两组 |
| `request-betas.js` | 原生 beta 顺序（模型表 + 请求构建器的 push 顺序，补丁期 AST 填入）与失败回退 |
| `request-headers.js` | 请求的协议头：`normalizeBetas`、`finalBetas`、OAuth/API-key 头策略、`setProtocolHeaders` |
| `model-request.js` | 发送：build 走原生 `beta.messages.create().asResponse()`，direct 走 `client.post`；fetch 边界的数字还原与上游请求记录（`--capture-request`/`--capture-body`） |
| `shared.js`、`raw-json.js` | 共用小函数；在原始 JSON 文本上定位成员与元素，只重写被改动的那一段 |
| `native-tools.js` | 把客户端自定义工具做成 CC 工具对象（`requestTool`），只供 CC 的策略与补丁后的工具定义函数读定义；CLI 不执行工具 |
| `request-input.js`、`request-parameters.js`、`request-policy.js`、`content-policy.js`、`direct-billing.js`、`request-identity.js`、`request-agent.js`、`request-options.js`、`request-output.js`、`request-error.js`、`container-resources.js` | 支持模块 |
| `request-session.js` | 会话记忆（v38）：我们写计费头的请求，把 Worker 记住的上一次请求 ID 与 turn 放回 CC 自己读的位置（最后一条 assistant 记录的 `requestId`、prompt 记录的 `turnPosition`），由原生写 `cc_prev_req` 与 turn 字段；把本次用的 turn 报告给 Worker |
| `native-environment.inc.js` | 拼进核心模块作用域的代码（原生环境读取与词表、注入层、轮次标记），原生名写作 `native_<逻辑名>` |
| `build.sh` | 用 Bun 编译 ELF（`--compile --bytecode --format=esm`，两个入口） |
| `package-release.cjs` | 把 ELF 和补丁清单打成 Worker 镜像用的 `release/` 目录 |
| `tools/upgrade/` | 换版本用的分析工具：`restore-bun.cjs`（还原）、`seeds.cjs`、`equiv.cjs`（结构等价配对）、`unitdiff.cjs`、`lookup.cjs`、`inspect.cjs`、`carry-profile.cjs`（把 profile 名字带到新版）、`tokcmp.cjs`/`supcmp.cjs`（重构前后产物等价）、`anchor-hazards.cjs`（锚点替换文本逐字出现在产物里）。用法见 [CLI-UPGRADE-RUNBOOK](../../docs/CLI-UPGRADE-RUNBOOK.md) |
| `test/` | `npm test`（`test/run.mjs`：版本无关测试 + `test/native/<版本>/`）；`test/e2e/` 离线端到端回归套件与官方抓包工具（`capture-official.sh`、`official-diff.cjs`）；手动探针 `*.cjs` |

## 打包步骤

1. **还原官方源码**：`node tools/upgrade/restore-bun.cjs <官方 ELF> /abs/artifacts/claude-<版本>/linux-restored <版本>`（ELF 的 SHA-256 须等于官方 manifest 与 profile 的 `binarySHA256`）。补丁器只认 profile 里的模块哈希。
2. **改代码时先升补丁标签**：任何补丁或支持模块的变化都要改当前版本 profile 的 `extension`（`ccgateway-vNN-<名字>`）；Worker 镜像构建按它核对 release，旧标签的产物会让镜像构建失败。
3. **补丁**（输出目录必须不存在，原目录不改）：

   ```sh
   cd next/plugins/ccgateway/companions/cli-mods
   npm install --ignore-scripts
   node patch-cli.cjs /absolute/path/restored /absolute/path/patched
   ```

   复用已有 Babel 时可设 `CCG_BABEL_PACKAGE` 为该安装的 `package.json` 绝对路径。
4. **编译**（**必须**用 profile `bunVersion` 指定的 Bun，即官方内嵌版本，`build.sh` 会拒绝其他版本；Linux x64/glibc；ovh 上用 `oven/bun:<bunVersion>` 容器，Windows 传过去的副本先去 CR）：`sh build.sh /absolute/path/patched /absolute/path/claude-linux-native`。两个入口（`cli.js` 与 hooks worker）都必须给。
5. **打包**：`node package-release.cjs /absolute/path/claude-linux-native /absolute/path/patched/ccgateway-patch.json /absolute/path/new-release`（脚本旁要有 `profiles/`）。产物是 `<版本>/claude`、`<版本>/ccgateway-patch.json` 与 `manifest.json`。
6. **放进 Worker 构建上下文**：用新目录替换 `cli-mods/release/`（不进 Git）。`companions/worker/Dockerfile` 按 `ARG CLAUDE_VERSION` 安装到 `/opt/ccgateway/cli/` 并核对 SHA 与补丁标签；控制器创建或配对更新账号容器时再按 manifest 校验，Worker 启动时校验固定版本、补丁标签与哈希。
7. **测试**：`npm test`（默认最新 profile 的版本；`CCG_CLI_VERSION=<版本>` 指定）。原生对账测试在 `artifacts/claude-<版本>/linux-restored` 存在时必须真跑，缺失时跳过并打印 `CCG_NATIVE_TEST_SKIPPED`，`CCG_REQUIRE_ARTIFACTS=1` 时改为失败。原生夹具变化时用 `CCG_UPDATE_CONTRACT_FIXTURES=1` 重生成并逐项审查。离线端到端回归、组装对账等在 ovh 一次性容器里跑，见 [CLI-TEST-PLAN](../../docs/CLI-TEST-PLAN.md) 与 `test/e2e/README.md`。

## 版本记录（2.1.312）

| 版本 | 插件 | 内容 | 现状 |
|---|---|---|---|
| v38 `cc-2-1-312` | 插件 0.1.114 | 移到 Claude Code 2.1.312（2026-10-27 构建，commit `f375cd85`），逻辑与 v36 相同：13 个被改写函数按新版重写锚点（入口 `Ke`、会话 `Rt`、资源 `YOi`/`V`、核心 `YH`/`Qmn`/`Kmn`/`Kk`/`Xmr`/`boo`、客户端 `K$`/`Ml`、计费 `d2s`），另加一处：主查询里新出现的 thinking-token-count push 加 build 判断（2.1.312 把它从模型表挪了出来，否则非 CC 请求会多这个 beta）。新增会话记忆（`request-session.js`、能力 `build_session_state_v1`，Worker `engine/session_state.go`）：我们写的计费头带 `cc_prev_req`（上一次成功上游响应的 request-id，仅当消息续接上一次请求、最后一条 assistant 正是那次应答时），续接时客户端命名的会话的 turn 字段不回退；截断历史不给记忆（插件 0.1.114 起，Worker 侧判定，CLI 不变）。官方自己的变化：环境段 Shell 按 PATH 上的 shell 写（`unknown` → `bash`）、Bash 工具描述改写、客户端缺省 `output_config` 时 effort 跟随历史里的 system 轮。分析与验证见 [CLAUDE-CODE-2.1.312-MIGRATION](../../docs/CLAUDE-CODE-2.1.312-MIGRATION.md)。ELF `c66a1f05…9ddb` | 现行 |

2.1.310 与 2.1.304 的 profile 随支持模块的变化升为 v39 / v40（`session-state`），不单独发布。

## 版本记录（2.1.310）

| 版本 | 插件 | 内容 | 现状 |
|---|---|---|---|
| v33 `bun-1-4-4` | 插件 0.1.105 | 与 v32 同一份补丁，改用 Bun 1.4.4（官方 2.1.310 内嵌版本）编译：ClientHello 与官方完全相同（v32 的 Bun 1.4.3 少两个签名算法）。profile 新增 `bunVersion`，`package-release.cjs` 拒绝其他 Bun 编出的 ELF。补丁产物与 v32 只差补丁标签。ELF `720f4645…2463` | 现行 |
| v32 `cc-2.1.310` | 插件 0.1.104 | 移植到 Claude Code 2.1.310（2026-10-23 构建，commit `0d2056ec`），逻辑与 v31 相同：13 个被改写函数按新版重写锚点（入口 `Ye`、会话 `Fr`、资源 `nki`/`X`、核心 `rH`/`rSn`/`tSn`/`UC`/`Tkr`/`yao`、客户端 `m$`/`ml`、计费 `EFs`），原生名字表见 profile。同时把补丁器改成版本无关（上节）；v31 用新补丁器重新生成的产物与线上 v31 逐 token 等价。官方自己的变化（出口可见）：延迟工具列表多 `Monitor`、Bash 工具描述多一句 Monitor 说明、计费头 `cc_version` 为 2.1.310 及其指纹、UA `claude-cli/2.1.310`。分析、审查与验证记录见 [CLAUDE-CODE-2.1.310-MIGRATION](../../docs/CLAUDE-CODE-2.1.310-MIGRATION.md)。ELF `7fa09728…4486` | 已替换（同源，编译器换 1.4.4 即 v33） |

## 版本记录（2.1.304）

只列每版留下的现行规则（v32 移植到 2.1.310 时全部原样保留，“现行”即在 v32 中仍然成立）；被后续版本推翻的写明。细节见各设计文档。

| 版本 | 插件 | 内容 | 现状 |
|---|---|---|---|
| v31 `request-capture` | 插件 0.1.101 | 记录最终上游请求（能力 `request_capture_v1`，契约见 [REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN](../../../../docs/ccgateway-feature-support/REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md) §2）：`claude request` 新增 `--capture-request <前缀>`（写 `<前缀>.json`：方法、URL、按名排序的小写请求头，`authorization`/`proxy-authorization`/`x-api-key`/`cookie` 值为 `[REDACTED]`，正文编码/字节数/SHA-256、model、stream、`attempts`）与 `--capture-body`（另写 `<前缀>.body`，须与前者同用）。记录点是 `model-request.js` 的 fetch 边界：认证头、beta、build 数字还原之后、交给原生传输 `mle` 之前；只在发送前拷贝请求头（与二进制正文），其余在发送开始后写，命令退出前等写完，写失败不影响请求与退出码；同一命令多次发送覆盖文件、`attempts` 递增。**边界**：fetch 边界之后原生仍可能压缩正文——原生 `cy` 对 ≥ 4096 字符、未走代理/unix socket 的一方请求选 gzip 时，先在正文末尾加 `\n` 与 0–256 个随机空格/制表符（`HBt`），再设 `compress`，由 `mle`/运行时压缩并加 `Content-Encoding`。记录的是加了空白、压缩前的字节与请求头（线上实际是 gzip 字节；`content-encoding` 不在记录里），所以这类请求的 `body_sha256` 与进入网关的不同；另记 `content_sha256`（去掉末尾空白后的哈希），Worker 用它判断 `body_changed`。help 同时更正：direct 只补计费头，不再写「原样转发」；删去 attachments 引用的旧说明。离线（0.1.100 镜像挂载新 Worker + v31）：69 场景 122 请求与 v30 出口 0 差异，122/122 上游请求有记录且正文逐字节一致。ELF `b7a1df0e…3393d` | 现行 |
| v30 `bytecode` | 插件 0.1.98 | 只改编译：`build.sh` 加 `--bytecode --format=esm`，每个模块编成 Bun 字节码（官方构建也是），补丁与支持模块与 v29 逐字节相同。启动不再解析整个包：`--version` 0.80 → 0.04 秒，请求命令到读输入 0.91 → 0.10 秒（Worker 每个请求启动一次 CLI，CONTRACTS §63.5）；常驻内存 135 → 139 MiB，ELF 157 → 293 MB。ELF `81d5d370…554b` | 已替换 |
| v29 `client-values` | 插件 0.1.95 | 客户端的值原样发（2026-10-25 用户决定）：① **数字保真**：build 解析前把 JS 双精度不能原样写回的数字（超出安全整数的整数、`1.0`、`1e2`、`-0`、超长小数）换成本次随机标记的占位串，组装全程带着走，发送时在 fetch 边界把最终 body 里的占位换回客户端原文（`request-options.js parseBuildJSON`、`model-request.js`）；占位被拷进别的文本则报错不发。不再拒绝（此前 CLI 与 Worker 都回 400）。② **生成参数不预检**：构建器读的数字按「值完全相等才交给构建器」（`numberValue`：`10.0` 是 10，`1.00000000000000001` 不是）；构建器不能如实表达的 max_tokens、temperature、thinking（未知类型/字段、预算非正整数）、output_config 非对象、stream 非布尔，构建时当作未传、最终 body 放回客户端原值（`generationControls`），由上游判断。③ Worker 侧：删 `validateBuildNumbers` 与生成参数预检；build 下读不出的 `metadata.user_id` 当作没带、补账号身份（direct 仍原样）。离线（0.1.94 镜像挂载新 Worker + v29，假上游记录原始 body）：12 个客户端值用例 12/12（旧组合 3/12，其余 9 个被 Worker 400）。ELF `de9c971c…d90a` | 现行 |
| v28 `cc-only-context` | 插件 0.1.93 | 非 CC 请求一律按 CC 主线程构建（2026-10-25 用户决定）：没有计费头的请求不用客户端的请求类别、agent-id/parent/agent-type、prompt-id、上一轮工具耗时与压缩头（`resolveAgentContext` 只对 CC 请求读客户端头），build 与 direct 相同；此前非 CC 请求可自称子代理，出口补 `cc_is_subagent=true`。离线（0.1.92 镜像 + v28）：伪造子代理/压缩头的请求与不带头的完全相同（v27 四项都不同）；官方客户端 32 个场景 54 个请求与 v27 出口 0 差异 | 现行 |
| v27 `account-identity` | 插件 0.1.92 | 没有身份的 build 请求给账号自己的身份（2026-10-25 用户决定）：客户端没发 `metadata.user_id` 而 Worker 给出 `rewrite: true`（OAuth、有映射密钥）时，`applyBuildMetadata` 写入该账号 CLI 自己的 device/account 与 Worker 的对话会话（JSON 字符串，客户端其他 metadata 键保留）；Worker 侧 `generatedRequestIdentity` 由对话第一条消息映射会话。旧 CLI 收到这种上下文只是不加 metadata（与以前相同）。离线验证（新 Worker + v27，假上游）：首轮与后续轮会话相同且等于会话头、不同对话不同、`user_id: null` 也补、客户端自带的值仍按映射、direct 不加。beta 不变（按客户端，只加请求体字段必需的） | 现行 |
| v26 `native-assembly` | 插件 0.1.90、0.1.91 | 把组装决定权交回原生（2026-10-24 优雅度审核 §3 第 5/8/17 条，发布前在 31 号容器内对拍：与 v25 出口 17 个用例 28 个请求逐字节相同）：① **身份行走原生 `recordedCliPrefix`**：build 的 query options 记录选中的身份行文本（`request-build.js identityRequest`），原生 `n1n` 返回它、`PAs` 照原生位置拼（`[header, line, ...prompt]`），补丁在 `PAs` 里新增 `ccgatewayCapturePrefix?.(n)` 把原生渲染出的那一行交回 build；删除 `request-identity.js` 的 `applyBuildCliPrefix`/`prefixPosition`/`checkedPrefix`、`request-natives.js` 的 `prefixBuild` 与 `identityLines`、命令里的 `identityBuild` 之后的插行步骤。`request-policy.js identityLineFor` 仍是"选哪一行"的唯一来源，行的文本一律由 `n1n` 渲染（`identityLineText`，三个名字→三组原生输入）；API key 与"客户端自己的请求（带计费头）"记录 `null`（不插行），系统里已有原生行时不重复插。② **build 走原生 `client.beta.messages.create(body,{headers,signal,maxRetries,timeout}).asResponse()`**：路径、`?beta=true`、betas→头全由 SDK 给（`x-stainless-helper` 也归 SDK，但客户端工具是纯 JSON，该头不会出现）；direct 仍需发原始字节，继续 `client.post`。`messagesPath` 不再手写：补丁期用 AST 在 `chunk-38xgev2z.js` 找唯一一条 POST `/v1/messages?beta=true`，把该原生字面量填进 `model-request.js` 的标记位。超时保持现在的语义：显式传 `timeout=min(timeoutMs,600000)`、`maxRetries:0`，所以原生 `calculateNonstreamingTimeout`（会按 `max_tokens` 上限 600s 抛错）不会被触发。③ **`FH` 改成"客户端定义逐字返回"**：`if(ccgIsNative(e))return structuredClone(e.ccgatewayRequestDefinition);`；删 `native-tools.js` 的 `nativeDefinition`、补丁里对 `dsi`/原生字段的复刻，core 只导入 `isNative`。客户端工具定义是客户端的数据，必须原样（键序、字段）发出，因此**不做"原生结果+覆写"**（原生 `FH` 会给客户端工具加 `strict`/`eager_input_streaming`、走描述钩子、按供应商剥离字段，并重排键序）；注入层里 CC 自己的工具走原生 `FH`，不受影响。 | 现行 |
| v25 `beta-order` | 插件 0.1.89 | 请求加上的 beta 按 Claude Code 自己的顺序放（2026-10-24 工作流审核 P3）：客户端的 beta 保持客户端顺序；登录 beta（OAuth 账号）与请求构建加的 beta（如 1 小时缓存）放在 CC 写它们的位置，而不是追加到末尾。顺序取自原生代码：模型 beta 表 `S8n`，再接请求构建 `uXn` 逐个 push 的顺序（补丁期从哈希绑定的 `uXn` 读出，放进支持模块 `request-betas.js`）；`request-headers.js` 的 `finalBetas`。离线对拍（API Key 形状客户端经 OAuth 账号 vs 官方 OAuth 客户端）：build 的 Haiku/Sonnet 逐位相同，Opus 只差客户端自己没发的 `mid-conversation-system-clear`；direct 的顺序相同，缺 `extended-cache-ttl`——客户端本身就没用 1 小时缓存（请求体也没有 `ttl:1h`），direct 原样转发。ELF `28fbcf20…b0af`。**2026-10-24 整理**（`../../../docs/audits/2026-10-24-cli-elegance/01-cli-mods.md`，出口未变）：入口改成 3 行桩 + 支持模块 `request-entry.js`（`request-natives.js` 汇原生绑定，补丁期 `checkImports` 校验其每个原生导入）；beta 顺序改由补丁器用 AST 从 `uXn` 的 `zr.push` 收集（成员表达式 `eS.beta` 明确跳过，每个名字校验是模块作用域绑定），`ccgatewayBetaOrder` 移到支持模块 `request-betas.js`，只在有 beta 要放时计算，模型表不可识别时回退追加并写一条 `CCG_BETA_ORDER_UNAVAILABLE` 诊断；beta 只放置一次（build 返回客户端/新增两组，`finalBetas` 一次调用，登录 beta 也在这里加入），`request-headers.js` 只管写头；`systemRecord` 改用原生 `ile`；环境快照的按需读取收敛成表，并加原生 `Wkt` 字段对账测试；内容策略的围栏扫描只做一次、`recognizedUser` 每 slot 只解析一次、blocked 走一条规则；删除 `nativeHeader` 的 entrypoint 改写（入口点由 `setEntrypointOnRequests` 原生设定；`_oo` 的 `ccgatewayProxyText` 补丁复核后保留——`fieldText` 只覆盖值，挡不住解析阶段对未请求代理行的 blocked 判定）；`identity()` 按环境串记忆、UA 改成纯 setter；原生 body 字段与身份行表加对账测试。`npm test` 179/179、0 跳过 | 现行 |
| v24 `beta-path` | 插件 0.1.88 | 出口地址与官方一致：Messages 发往 `/v1/messages?beta=true`（原生 `beta.messages.create` 的路径，`model-request.js` 的 `messagesPath`）；v23 发 `/v1/messages`（2026-10-24 工作流审核 P2，官方 49/49 带、网关 54/54 不带）。其余与 v23 相同。ELF `2084a56f…f14a` | 现行 |
| v23 `bound-imports` | 插件 0.1.87 | 补丁导入的 5 个原生模块（`chunk-7y2kvacy/jkcb7qdd/m5q1b1c4/eanw7pgv/t2p0d04m`）加入 profile 哈希绑定，补丁期校验新增导入名确由目标模块导出（D3）；能力列表只在 profile、入口代码移到 `request-entry.inc.js`（D7）；删 296/302 补丁器与死代码（D6）；支持模块重构（`shared.js`）。2026-10-24 代码质量审核 04（J1–J21）：删 mods 工具执行链（`Pb`/`GYr`/`Ua`/`computeToolPool`/`Ten`/`N_e`/`mIt`/`ton`/`addTool`/`bz` 十处改写、`tool-dispatch.inc.js`、能力 `native_tools`/`mods_dispatch`，profile 少绑 5 个不再改写的模块），只留 `FH`；`buildRequest`/`applyContentPolicy`/`runRequestCommand` 拆分，策略只校验一次。出口：direct 给无 system 的请求补的 system 改放在 `messages` 之后（与官方键序一致，J2）；注入提示词的缓存断点按位置让出，客户端同文字的块保留自己的断点（J19）；其余与 v22 逐字节相同（17 种请求在新旧源码上的上游字节与请求头对拍全同）。2026-10-24 第二轮优化（`../../../docs/audits/2026-10-24-optimization-round2/05-ccgateway.md`，X31–X33）：`direct-billing.js` 的手写 JSON 扫描器外置到新的支持模块 `raw-json.js`（已在 profile 的 `supportModules` 登记），`applyDirectBilling`/`mergeBillingAttribution`/`openModelRequest`/`runRequestCommand` 拆成小函数；出口未变（`npm test` 171/171、0 跳过）。ELF `558d7b31…5b5c` | 现行 |
| v22 `client-entrypoint` | 0.1.83 | 请求入口由 CLI 按请求设置（`requestEntrypoint` → 原生 `setEntrypointOnRequests`），计费头与 UA 读同一个值；CC 形状的客户端 UA 在计费头的 `cc_version`/`cc_entrypoint` 仍是客户端的时原样保留（`keepClientUserAgent`）；能力 `client_user_agent_v1` | 现行 |
| v21 `native-layers` | 0.1.80 | 注入层的写死项改成原生提取：权限上下文 `gd()`、按非交互主线程 `xh` 组装提示词、追加提示词用原生 `pr`、剩余 token 用 `JDr` | 现行 |
| v20 `request-levels` | 0.1.79 | 注入等级：direct 只处理计费头、不补身份行；非 CC 请求按主线程；已有的层不重复补；身份行自适应（不再按入口配置）；system 统一为块数组；能力 `request_levels_v1` | 现行 |
| v19 `request-layers` | 0.1.78 | 非 CC 请求按配置注入提示词、首轮附件、工具（探针构建）；能力 `build_injection_v1` | 配置模型被 v20 取代 |
| v18 `agent-context` | 0.1.75 | 按客户端还原请求类别（`CCG_REQUEST_AGENT`）；能力 `request_agent_context_v1` | 现行；"非 CC 请求当子代理"被 v20 改为主线程 |
| v17 `identity-line` | 0.1.74 | 服务端入口六选一；计费头不在首块开头按缺失处理；能力 `build_identity_line_v1`、`direct_billing_v1` | 入口现行；"身份行按入口配置"与"direct 补身份行"被 v20 取代 |
| v16 `build-prefix` | 0.1.73 | build 总带计费头；指纹改为取第一个非 reminder 的 text 块 | 现行；"direct 纯透传"被 v17 取代 |
| v15 `cli-prefix` | 0.1.72 | 内容策略的识别文字改为运行时从原生 CLI 取得 | 现行；"build 与 direct 都补开头行"被 v16/v20 取代 |
| v14 `account-identity` | — | 按账号邮箱派生密钥映射 `metadata.user_id`（只 OAuth）；build 不发自己编的 `diagnostics`；容器资源报告 | 映射现行；"身份来源在插件设置中配置"已取消（2026-10-21 起不可配置，固定 `replace`，见 build 设计第 7 节） |
| v12 `feature-policy` 及以前 | ≤0.1.71 | 2.1.304 的第一版补丁：十个环境字段来源、外部历史保真 | 见 [CC-FEATURE-LAYERS-DESIGN](../../../../docs/ccgateway-feature-support/CC-FEATURE-LAYERS-DESIGN.md) |

2.1.302（v7–v11）与 2.1.296（v3–v6）的记录分别在 [302 文档](../../docs/CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md) 与 [296 文档](../../docs/CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES.md)；两个旧补丁器在 2026-10-24 工作树里已删除（审核 D6），需要时从 git 历史取。

## 历史：2.1.296 的 mods 工具注入扩展（v3–v6）

2.1.296 时期的 `kind: 'native'` 工具注册与 `tool.call` 分发扩展（能力 `native_tools`、`mods_dispatch`）在 Worker 只运行 `claude request` 之后（2026-10-19 起，CONTRACTS §53.21）不再被走到，v23 把补丁里的这条链连同运行探针、测试 mod 与 Dockerfile 一并删除（2026-10-24 审核 J1）。用法、调用语义与验证记录见 [296 文档](../../docs/CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES.md) 与 git 历史。
