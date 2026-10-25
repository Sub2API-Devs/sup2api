# CCGateway 定制 Claude Code CLI（cli-mods）

本目录维护账号 Worker 里运行的定制 Claude Code：对官方 Linux x64/glibc 版本的源码补丁、补丁加进去的 `claude request` 命令及其支持模块，以及打包脚本。Worker 对每个模型请求运行一次 `claude request --build|--direct`（CONTRACTS §53.21），工具调用交回客户端。

## 当前版本

**Claude Code 2.1.304 / `ccgateway-v28-cc-only-context`**（2026-10-25，随插件 0.1.93 发布，ELF SHA-256 `aedec4eb3e2dab0c4c4956cd5e272a2586934d74b9987201ac9523513796d39c`；上一版 `ccgateway-v27-account-identity` 随插件 0.1.92；profile `profiles/linux-x64-2.1.304.json` 的 `extension`）。用 Bun 1.4.3 编译（官方 2.1.304 内嵌 Bun 1.4.4，边界见 [REQUEST-HEADERS](../../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md)「已知边界」）。

CLI 经 `claude --ccgateway-info` 报告版本、补丁标签和能力；能力列表只有一处——`profiles/linux-x64-2.1.304.json` 的 `capabilities`（2026-10-24 工作树；之前是 `patch-cli-2.1.304.cjs` 里的常量）：

`request_direct`、`request_build`、`request_oauth`、`request_error_stderr`、`request_raw_http_errors`、`request_policy_mode_v1`、`build_attachment_sources_v2`、`build_billing_sources_v1`、`build_content_preservation_v1`、`container_resource_reporting_v1`、`request_identity_v1`、`build_identity_line_v1`、`direct_billing_v1`、`request_agent_context_v1`、`build_injection_v1`、`request_levels_v1`、`client_user_agent_v1`。

各能力的含义与核心、Worker 怎样要求它们，见 [build 设计](../../docs/BUILD-REQUEST-COMPONENTS-DESIGN.md) §10。2.1.296 时期 mods 工具扩展的 `native_tools`、`mods_dispatch` 两项随该扩展在 v23 删除（见文末）。

现行行为的事实源：

| 主题 | 文档 |
|---|---|
| build 组件、内容改写、计费头、身份 | [BUILD-REQUEST-COMPONENTS-DESIGN](../../docs/BUILD-REQUEST-COMPONENTS-DESIGN.md) |
| 注入等级（0/微/低/高）、身份行自适应、各层注入 | [CC-INJECTION-LEVELS-DESIGN](../../../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md) |
| 请求类别（主线程/子代理/压缩）、prompt ID | [SUBAGENT-REQUEST-CONTEXT-DESIGN](../../docs/SUBAGENT-REQUEST-CONTEXT-DESIGN.md) |
| 请求头的去向、请求入口与 UA | [REQUEST-HEADERS](../../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md) |
| 模式、策略头、能力门、错误来源 | [REQUEST-MODES](../../docs/REQUEST-MODES.md) |

## 文件

| 文件 | 作用 |
|---|---|
| `patch-cli.cjs` | 读恢复目录 `package.json` 的版本，只接受 2.1.304，转给 `patch-cli-2.1.304.cjs`（2.1.296、2.1.302 的补丁器与 302 profile 已删除，2026-10-24 工作树，审核 D6） |
| `patch-cli-2.1.304.cjs` | 校验 profile 里每个模块的 SHA-256（被改写的模块与补丁导入的原生模块），按 AST 定位唯一锚点改写（每个模块每版文本只解析一次），导入与追加代码在改写后一次拼上（`surround`），校验补丁新增的每个导入名确由对应模块导出（`checkImports`，审核 D3），复制支持模块（加 `ccgateway-` 前缀），用 AST 从 `uXn` 收集请求构建器推出的 beta 顺序并填入 `request-betas.js`（审核 b1/20），写出 `ccgateway-patch.json`（补丁标签、能力、改前改后哈希） |
| `profiles/linux-x64-2.1.304.json` | 官方 ELF 的 SHA-256、补丁标签 `extension`、能力 `capabilities`、支持模块清单 `supportModules`（补丁器与 `test/support.mjs` 共用）、模块哈希 `modules` |
| `request-entry.inc.js` | 插进入口函数（`cli.js` 的 `Ve`）的三行桩：`--ccgateway-info` 与加载 `request-entry.js` 的 `request` 分支（2026-10-24 审核 1，入口不再带接线代码） |
| `request-entry.js` | `claude request` 的入口支持模块：CC 的 fast-path 策略（拒绝时写 403 帧）、需要时才加载命令与原生绑定（2026-10-24 审核 1） |
| `request-natives.js` | 请求用到的原生绑定汇成一处（身份行与计费头、登录 beta、指纹、query source、层词表），供 `request-entry.js` 传给命令（2026-10-24 审核 1/d1 的绑定面） |
| `request-command.js` | `claude request` 入口：读输入、direct 计费头、调 build、身份与身份行、beta 装配（一次）、发送、错误帧 |
| `request-build.js` | build：内容策略、注入层探针、原生构造器、参数并回、计费合并（2026-10-24 前名为 `request-build-2.1.304.js`）；返回客户端与新增 beta 两组，供命令一次放置 |
| `request-betas.js` | 原生 beta 顺序（`S8n` 模型表 + `uXn` 的 push 顺序，顺序由补丁期 AST 填入）与失败回退（追加 + 一条 stderr 诊断），以及唯一的放置函数 `finalBetas` 的顺序来源（2026-10-24 审核 2/20） |
| `request-headers.js` | 请求的协议头：`normalizeBetas`、`finalBetas`、OAuth/API-key 头策略、`setProtocolHeaders`（2026-10-24 审核 16，从 `request-options.js` 拆出） |
| `shared.js` | 支持模块共用的小函数与表（`object`、`toBlocks`、`systemTexts`、环境字段与计费字段、UUID 正则、`splice`），装成 `ccgateway-shared.js` |
| `raw-json.js` | 在原始 JSON 文本上定位对象成员与数组元素的范围（`skipWs`/`members`/`elements`/`member`），让调用方只重写被改动的那一段、其余字节原样透传；装成 `ccgateway-raw-json.js`（2026-10-24 审核 X32，从 `direct-billing.js` 抽出） |
| `native-tools.js` | 把客户端自定义工具做成 CC 工具对象（`requestTool`），只供 CC 的策略与补丁后的 `FH` 读定义；CLI 不执行工具 |
| `request-input.js`、`request-parameters.js`、`request-policy.js`、`content-policy.js`、`direct-billing.js`、`request-identity.js`、`request-agent.js`、`request-options.js`、`request-output.js`、`request-error.js`、`model-request.js`、`container-resources.js` | 支持模块 |
| `native-environment-2.1.304.inc.js` | 拼进原生模块作用域的代码（原生环境读取与词表） |
| `build.sh` | 用 Bun 编译 ELF |
| `package-release.cjs` | 把 ELF 和补丁清单打成 Worker 镜像用的 `release/` 目录 |

## 打包步骤（2.1.304）

1. **准备恢复的源码目录**：官方 2.1.304 ELF（SHA-256 等于 profile 的 `binarySHA256`）解包出的模块目录，如 `artifacts/claude-2.1.304/linux-restored`。补丁器只认 profile 里的模块哈希，其他版本或改过的模块直接失败。
2. **改代码时先升补丁标签**：任何补丁或支持模块的变化都要改 `profiles/linux-x64-2.1.304.json` 的 `extension`（`ccgateway-vNN-<名字>`）；Worker 镜像构建按它核对 release，旧标签的产物会让镜像构建失败。
3. **补丁**（输出目录必须不存在，原目录不改）：

   ```sh
   cd next/plugins/ccgateway/companions/cli-mods
   npm install --ignore-scripts
   node patch-cli.cjs /absolute/path/restored /absolute/path/patched
   ```

   复用已有 Babel 时可设 `CCG_BABEL_PACKAGE` 为该安装的 `package.json` 绝对路径。
4. **编译**（Bun 1.4.3）：在 Linux x64/glibc 上 `sh build.sh /absolute/path/patched /absolute/path/claude-linux-native`；在其他系统上交叉编译用同样两个入口加目标：

   ```sh
   cd /absolute/path/patched
   bun build cli.js src/plugins/functionHooks/hooks-worker/hooks-worker.js --compile --target=bun-linux-x64 --outfile /absolute/path/claude-linux-native
   ```

   两个入口都必须给：只编 `cli.js` 会漏掉 hooks worker。
5. **打包**：

   ```sh
   node package-release.cjs /absolute/path/claude-linux-native /absolute/path/patched/ccgateway-patch.json /absolute/path/new-release
   ```

   脚本只接受补丁标签等于 profile `extension` 的清单，输出目录必须不存在；产物是 `<版本>/claude`、`<版本>/ccgateway-patch.json` 与 `manifest.json`（版本、SHA-256、补丁标签、`modes: ["build","direct"]`）。
6. **放进 Worker 构建上下文**：用新目录替换 `cli-mods/release/`（不进 Git）。`companions/worker/Dockerfile` 把它装到 `/opt/ccgateway/cli/`，构建时核对 ELF 的 SHA-256 与 manifest 一致、manifest 的补丁标签与 profile 一致；控制器创建或配对更新账号容器时再按 manifest 校验版本与哈希，Worker 启动时校验固定版本、补丁标签与哈希。
7. **测试**：`npm test`（`node --test test/*.test.mjs`）。原生词表与层词表夹具在恢复源码上执行原生函数生成，变化时用 `CCG_UPDATE_CONTRACT_FIXTURES=1` 重生成；跨层夹具在 `companions/contracts/testdata/`。与原生对账的测试（`native-vocabulary`、`cli-prefix` 末项、`billing-fingerprint-oracle`、`patch-imports-304`、`native-environment` 的原生快照字段、`request-parameters-304` 的原生 body 字段）在恢复源码目录存在时必须真跑；目录不存在时跳过并在 stderr 打印 `CCG_NATIVE_TEST_SKIPPED <原因>`，设 `CCG_REQUIRE_ARTIFACTS=1` 时改为失败（`test/artifacts.mjs`）。`patch-wire-preservation-304` 缺恢复源码时直接失败。

   `npm test` 只跑 `*.test.mjs`。`test/` 里的 `*.cjs` 是手动探针，按需在一次性容器里跑：

   | 脚本 | 何时跑 |
   |---|---|
   | `official-client-replay.cjs`、`live-official-client.cjs` | 官方客户端与本 CLI 的字节对拍（`--network none` 容器，见各自 README）；改出口形状时必跑 |
   | `worker-policy-matrix.cjs` | 真实 Worker → 原生 CLI → 本地模型桩的策略矩阵（见 `worker-policy-matrix.README.md`） |
   | `assembly-replay.cjs`、`assembly-runtime.cjs`、`assembly-merge.cjs`、`component-combination-replay.cjs`、`replay-helpers.cjs` | 原生组装对账套件与其运行时/合并工具（`assembly-replay.README.md`） |
   | `request-probe.cjs`、`request-modes-probe.cjs`、`websearch-probe.cjs` | 本地起回环模型桩观察单个请求形状（模式、header、WebSearch 包装） |
   | `analysis/*.cjs` | 一次性分析脚本，不对账 |

## 版本记录（2.1.304）

只列每版留下的现行规则；被后续版本推翻的写明。细节见各设计文档。

| 版本 | 插件 | 内容 | 现状 |
|---|---|---|---|
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
