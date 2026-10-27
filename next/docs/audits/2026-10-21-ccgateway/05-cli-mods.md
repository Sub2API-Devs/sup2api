# 05 定制版 Claude Code CLI（cli-mods）审核

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](../../../plugins/ccgateway/docs/CLI-TEST-PLAN.md)。

审核日期：2026-10-21；分支 `feat/next-platform`，HEAD `43d576838`。本次只读审核，没有修改任何源码、文档或配置。临时脚本和提取出的内容都放在仓库外的 `%TEMP%\ccg-audit-cli\`。

## 1 范围与方法

**范围**：`next/plugins/ccgateway/companions/cli-mods/` 下的补丁器（`patch-cli.cjs`、`patch-cli-2.1.{296,302,304}.cjs`）、支持模块、`build.sh`、`Dockerfile`、`package-release.cjs`、`release/`、`profiles/`、`test/`；以及 engine 侧与 CLI 直接交互的部分：`request_command.go`、`request_identity.go`、`runner.go`、`cli_pinned.go`、`request_error.go`、`contracts/features/identity.go`。另外查看了 Core 侧 `next/server/internal/ccgateway/feature_policy.go` 里身份来源的下发逻辑。

**方法**

1. **原版基线**：`artifacts/claude-2.1.304/claude-linux-x64` 的 SHA-256 为 `ea0f1357…f27912`，与官方 `official-manifest.json` 里 linux-x64 的 checksum 一致；`linux-restored/` 是由它恢复出的模块树。本机全局安装的官方 2.1.304 是 Windows 原生 Bun 可执行文件 `bin/claude.exe`，SHA `019e5174…` 也与官方 manifest 的 win32-x64 一致。Windows 版的 chunk 命名与 Linux 不同，所以对照时以 Linux 恢复树为准。
2. **重跑补丁器**：用 `CCG_BABEL_PACKAGE=next/web/package.json` 在临时目录对 `linux-restored` 跑当前 HEAD 的 `patch-cli.cjs`，成功，产物为 v14，修改 12 个模块、生成 13 个支持文件。连续两次运行的 manifest 逐字节相同，说明补丁器输出是确定的。还用 302 补丁器对 `artifacts/claude-2.1.302/linux-restored` 跑了一次（见 F8）。
3. **拆包核对**：自写的只读脚本 `dump-bun.cjs` 只解析 Bun trailer 和模块表，不执行任何内容。用它拆出 `release/2.1.304/claude`（SHA `138da88e…`，就是生产的 v12）内嵌的 JS。Bun 编译时把所有 chunk 合成了一个约 53 MB 的模块并重新排版，因此逐个比对时用的是重排后的锚点（例如 `J.ccgatewayBuildOnly === true` 共 9 处，与补丁器中 qmn 的 9 处替换一致）。
4. **与原版对照**：用 Babel AST 读取原版 `qmn`、`yBe`、`PAs`、`sF`、`nl`、`XT` 等函数，核对补丁语义和身份字段的来源。
5. **测试与复现**：
   - 执行 `node --test test/*.test.mjs`：**116 通过、0 失败、0 跳过**，耗时 36 秒。
   - 用 `go test -overlay` 在不往仓库写文件的前提下调用 `messagesBuildComponentsPolicy`，复现 F1。
   - 直接调用支持模块复现 F1 和 F6。
   - 用伪 ELF 复现 F7。
6. **没做的事**：没有运行任何 CLI 可执行文件（本机没有 Linux 和 docker），没有联网，没有使用任何凭据，也没有 ssh。

> 说明：**release 目录里的二进制是 v12（生产版），源码 HEAD 是 v14（身份映射和容器资源，尚未发布）**。v12 的补丁点已经在二进制中核对落地；v14 新增的部分只能核对补丁器输出和源码。

## 2 补丁清单（patch-cli-2.1.304.cjs）

各补丁的共同前提：补丁器先校验 profile 中 19 个模块的 SHA-256（L14–18）；AST 必须唯一命中目标函数（L37–38）；`once()` 要求锚点在该函数文本内唯一（L32–35）；替换后文本若没有变化直接报错（L40）；所有被修改的模块都会重新 parse（L133）；输出必须是一个全新目录（L10）。版本一变、锚点一变都会**报错失败，不会静默跳过**。例外见 F13。

| # | 位置（补丁器行） | 改了什么 | 为什么 | 是否合理 / 是否健壮 |
|---|---|---|---|---|
| 1 | `cli.js:Ve`（L44） | 新增 `--ccgateway-info` 能力输出；新增 `request` 子命令：先执行原生 fast-path 策略，拒绝时输出 403 错误帧，否则进入 `runRequestCommand` | 提供 Worker 用的单次请求入口 | 合理。入口在交互初始化之前，避开了 TUI/MCP 等加载 |
| 2 | `chunk-0q47gehe:Pb`（L45） | `tool.register` 透传 `kind:"native"` | 支持 mods 原生工具 | 合理 |
| 3 | `cli.js:Ve`（L46–51） | 标签 v12 改为 v14；把 `identityBody`/`identityBuild` 注入 run；能力追加 `container_resource_reporting_v1`、`request_identity_v1` | v14 身份映射 | 动态 import 解构的 `yBe`/`gTe` 没有静态校验（F13）；标签在 3 处硬编码 |
| 4 | `chunk-dxktn51d:Yi`（L52–53） | root session id 优先取 `ccgRequestSessionID()` | 让会话头 `X-Claude-Code-Session-Id: q()`（原生 `nl()`）与 metadata 一致 | 合理。已在原版 `chunk-38xgev2z:nl` 核实会话头读的是 `q()` |
| 5 | `chunk-yqea5hk4:Ali`（L56–65） | 资源清单的 CPU/内存/磁盘改读 cgroup 和受验证的配额 | 不上报宿主机硬件 | 合理。无限额时字段省略，不回退到宿主机值 |
| 6 | `chunk-sx3g9k86:V`（L66–71） | 启动性能事件的 free_mem/loadavg 改用容器值，或省略 | 同上 | 合理 |
| 7 | core `GYr`（L75） | `kind:"native"` 走自有注册表 | mods 原生工具 | 合理 |
| 8 | headless `Ua`（L76） | 工具池加 revision，并合并原生注册 | 同上 | 合理 |
| 9 | core `FH`（L77） | 原生工具定义直接使用注册对象和描述 | 同上 | 合理 |
| 10 | core `Ten`（L78–82） | `tool_use` 只把字符串 input 做 JSON 解析，其余规范化全部跳过 | mods 自行校验 | 用 indexOf 截取区间，**没有唯一性检查**（F13） |
| 11 | core `N_e`/`mIt`（L83–84） | 输入修复和 Schema 解析改成恒等函数 | 同上 | 影响整个 CLI，是 mods 设计的一部分；request 路径不处理模型响应，因此不受影响 |
| 12 | `chunk-qygf2xvn:ton`（L85） | 不再拆解批量工具包装 | 同上 | 同上 |
| 13 | `chunk-gzc5bc6y:addTool`（L86） | 统一串行排队，不检查工具可用列表 | 同上 | 同上 |
| 14 | core `bz`（L89–91） | 工具执行入口替换为 `tool-dispatch.inc.js`（改名映射 `HZ` 等） | mods 分发，并保留 Pre/PostToolUse | `rename()` 会盲目替换所有同名单词，包括字符串和注释里的（F13） |
| 15 | core `qmn`（L92–108） | 9 处 build-only 分支：wire tools 原样传入；不读 `CLAUDE_CODE_EXTRA_BODY`；betas 只用客户端值；system/messages 使用外部 wire；给 Gmn 传 `ccgatewayInput`；捕获计费；最终对象 yield 出来而不发送 | 原生生成参数，外部内容保真 | 合理，并已在二进制中落地。注意 `system:` 键总会出现（F9） |
| 16 | core `Gmn`（L111） | 外部输入跳过原生历史修复和提醒折叠 | 不对客户端历史做有损规整 | 合理 |
| 17 | core `jA`（L112） | 外部 `api_system` 行保留 system 角色 | 不改角色 | 合理 |
| 18 | core `Xfr`（L113） | 有 `ccgatewayWireSystem` 时原样克隆 | 保留生命周期字段 | 合理 |
| 19 | `chunk-38xgev2z:sF`（L114–120） | `ccgatewayAPIKeyOnly`：只允许 firstParty 加 API Key，不读 OAuth，剥离 auth 头后交给 SDK 设置 | API Key 账号不触碰订阅凭证 | 合理；OAuth 分支保持原生 |
| 20 | `chunk-t61vswm2:PAs`（L123） | 原生 attribution 生成后回调捕获 | 计费字段的 worker 来源 | 合理；不传回调时为 no-op |
| 21 | core `_oo`（L124） | 读取适配器注入的 `ccgatewayProxyText` | 按需读取代理文本 | 合理 |
| 22 | terminal `computeToolPool`（L125–129） | 缓存 key 带 revision | 重新注册后生效 | 合理 |
| 23 | 导入注入（L130–132） | 3 个模块注入 native-tools 导入；core 注入 `ZUo` 并追加 `native-environment-2.1.304.inc.js` | — | 已核对 `ZUo`、`jOt`、`aBe`、`Al`、`mBr`、`sF`、`_ke`、`mle`、`yBe`、`gTe`、`getRootSession`、`loadFastPathPolicy` 在目标模块中都有导出 |
| 24 | 支持模块（L140–151） | 13 个文件复制为 `ccgateway-*.js`；request-command/request-build 两个文件的 296 时代名称改为 304 名称并替换 chunk 文件名 | 支持模块共用一套源码 | 共用源码导致旧版本漂移（F8） |

**v12 在二进制中的核对结果**：`ccgateway-v12-feature-policy`、`ccgatewayAPIKeyOnly ? {} :`、`ccgatewayCaptureBilling?.(`、`batchToolUses: []`、`status: "queued",`、`keptForeignSignatures: true`、`case "api_system": {`、`function mIt(e2, n2, r2, s) { return n2; }`、`request requires the API-key…`、`CC policy denied this request`、`No tool.call mod handler`，以及 9 处 `J.ccgatewayBuildOnly === true`，全部在 `release/2.1.304/claude` 内找到。没有找到任何 v14 字符串，这与"v14 未发布"一致。

当前 HEAD 产物与 release v12 的 manifest 对比：

- 只有 `cli.js`、`chunk-dxktn51d`、`chunk-yqea5hk4`、`chunk-sx3g9k86`，以及支持模块 model-request、request-command、container-resources、request-identity 不同，正好对应 v14 的声明改动。
- 其余 8 个原生模块和 9 个支持模块的哈希完全一致。

## 3 发现表

| ID | 严重度 | 标题 | 置信度 |
|---|---|---|---|
| F1 | **P0** | Worker 把 `request_identity_sources` 放进 build 信封，CLI 视为未知键拒绝：新 Core＋新 Worker＋v14 CLI 下**所有 build 请求失败** | 确认（已复现） |
| F2 | **P1** | Core 总是显式下发 `user_id:"replace"`，Worker 把它当成显式配置：新 Worker 配 v12 CLI 时**所有请求返回 409** | 确认 |
| F3 | **P1** | build 的"客户端原始"和"客户端未发 metadata"两种情况，实际都发出 Worker 原生 metadata，与 UI、文档、提交说明相反；Go 中的 client 分支是死代码 | 确认 |
| F4 | **P1** | 映射密钥＝SHA-256（公开常量＋账号邮箱），没有秘密成分；上游可以对已知 device_id 计算 HMAC 来反查或跨账号关联 | 很可能 |
| F5 | P2 | 客户端真实会话 ID 仍通过 Scratchpad 路径出现在环境文本中（direct 全部如此；build 在该字段取 client 时如此） | 确认 |
| F6 | P2 | `localErrorFrame` 忽略 `error.status`：503 configuration_error 被报成 400 invalid_request_error | 确认（已复现） |
| F7 | P2 | `package-release.cjs` 无法打包 v14；本地 release 的 302 条目是 v7（生产是 v11）；release 不入 Git，镜像构建时不校验哈希 | 确认（已复现） |
| F8 | P2 | 共享支持模块演进后，重建 302 得到与已部署 v11 不同的 5 个支持模块，补丁标签却相同；没有任何 296/302 回归测试 | 确认（已复现） |
| F9 | P2 | build 把字符串 system 改成单块数组，客户端没发 system 时发出 `system: []` | 确认 |
| F10 | P2 | build 本地校验的错误文字不是官方文字（例如 `request --build: missing tool results`） | 确认（官方原文是否逐字存疑） |
| F11 | P2 | 补丁器只校验 19 个模块，其余约 2440 个恢复模块不校验；`build.sh` 不固定 Bun 版本、没有 `--target`，与实际发布流程不一致 | 确认 |
| F12 | P2 | README 和隐私审计文档关于身份映射的描述与代码不符（yBe 预算、build 删除 metadata） | 确认 |
| F13 | P3 | 补丁器的健壮性细节：`Ten` 的 indexOf、`rename()` 盲替换、动态 import 解构不校验、标签三处硬编码 | 确认 |
| F14 | P3 | 测试依赖未入库的 `artifacts/` 和 `next/web` 的 Babel 7.29.9（package.json 声明 8.0.4 且未安装）；干净检出时 billing oracle 静默跳过 | 确认 |
| F15 | P3 | API Key 路线的 User-Agent 固定为 `ccgateway-request`，向上游暴露网关指纹 | 确认 |
| F16 | P3 | replace 模式下，不透明 user_id 字符串被改写成 CC JSON 字符串（载体格式变了）；`target()` 追加 parent 后不再经过原生长度预算 | 确认 |

## 4 发现详述

### F1（P0）build 信封携带 request_identity_sources，CLI 拒绝

- **证据**：
  - Core 解析时总会填默认值：`next/server/internal/ccgateway/feature_policy.go:188-191` 写入 `p.RequestIdentitySources["user_id"]="replace"`。
  - `:262-279` 下发 wire policy 时，只对附件和计费两类做了 client 值稀疏化，没有处理身份来源。
  - Worker 的 `buildRequestPolicy` 带有字段 `Identity …json:"request_identity_sources,omitempty"`（`companions/engine/request_command.go:42`）。
  - v2 build 路径（`request_command.go:271-274`）只清掉 `RelayMode`/`CLIVersion`，随后把整个 policy 当作 `components.requestPolicy` 交给 CLI（`:137`）。
  - CLI 的 `request-policy.js:16-18` 只接受 `contract_version`、`build_attachment_sources`、`build_billing_sources` 三个键，遇到其他键抛出 `Unknown request policy key`。`request-build-2.1.304.js:15` 在构建前调用这个函数。
- **复现**：
  - go overlay 测试的输出：`requestPolicy={"contract_version":2,"request_identity_sources":{"user_id":"replace"}}`。
  - 把这段信封交给 `validateRequestPolicy`，得到 `REJECT … Unknown request policy key: request_identity_sources`。
- **影响**：生产的全局模式是 build＋2.1.304。只要把 HEAD 的 Core＋Worker＋v14 CLI 部署上去，**每个 build 请求都会以 400 失败**（phase=build，见 F6）；只有 direct 能用。
- **为什么测试没发现**：
  - JS 单测只验证"未知键要拒绝"。
  - Go 的 `TestRequestCommandAppliesAccountIdentityOnlyForOAuth` 用的是假 CLI，而且没带 policy 头。
  - `artifacts/claude-2.1.304/account-identity-v15-probe.cjs` 的真实链路 smoke 同样没有发送 policy 头。
- **修复建议**：Worker 在构造 v2 信封时清掉 `policy.Identity`（身份由 `CCG_REQUEST_IDENTITY` 单独传递）；或者让 CLI 显式接受并忽略这个键。再补一条跨组件契约测试：把 Worker 实际生成的信封直接交给真实的 `validateRequestPolicy`。

### F2（P1）Core 下发的默认值被 Worker 当成显式配置，旧 CLI 返回 409

- **证据**：
  - `request_command.go:206-216` 的注释写的是"默认来源在旧 CLI 上静默不生效"。
  - 但判断条件是 `policy.Identity["user_id"] != ""`。Core 总会填 `"replace"`（见 F1），所以 Worker 区分不出默认值和显式配置。
  - Core 端没有任何地方按 Worker 能力决定是否下发身份来源（`grep RequestIdentity next/server` 中只有 feature_policy/request_policy 两处）。
- **影响**：
  - 新 Core＋新 Worker＋v12 CLI 时，所有请求（direct 和 build）都返回 409 `Loaded CLI does not support the requested identity source`。
  - 这个组合在现实中会出现：仓库当前的 `release/` 只有 v12，而且 `package-release.cjs` 拒绝打包 v14（F7）。直接用当前树构建 Worker 镜像，就会得到这个组合。
  - 旧 Worker 0.1.70 会忽略这个未知字段，不受影响。
- **修复建议**：
  - Core 只在账号、分组或全局存在显式覆盖时才下发；或者在 wire 上像附件那样把默认值稀疏化（只删 `replace`，保留显式的 client/worker）。
  - Worker 的 409 只针对 `client`/`worker` 这类无法静默降级的选择。

### F3（P1）build 模式身份语义与文档相反

- **证据**：
  - `request_command.go:218` 在 `identityMode == "client"` 时根本不计算 identity；`:333` 只在 `Rewrite || Session != ""` 时才设置 `CCG_REQUEST_IDENTITY`。
  - CLI 的 `request-identity.js:64` 在没有上下文时 `return built`，保留原生 builder 生成的 `metadata`（`qmn` 中 `metadata:yBe(...)`，含 Worker 的 device_id、account_uuid 和随机 session）。
- **结果**：
  - "客户端原始"＋build：上游收到的是 **Worker 原生身份**，不是客户端发的值。UI 文案是"客户端发什么就转发什么"（隐私审计文档 :411）。
  - replace 或 worker 模式下客户端没发 metadata 时，build 仍然发送原生 metadata。这与 README:3、隐私审计 :415、提交 08035b19c 说明中的"build drops the metadata the native builder would otherwise invent"相反。
  - `request_identity.go:209-214` 的 `case "client"`（让 CLI 会话跟随客户端会话）从 serveRequestCommand 永远走不到；只有单元测试 `metadata_attribution_test.go:266-271` 直接调用了它。
- **测试互相矛盾**：
  - JS 测试 `request-identity.test.mjs:34-43` 构造了 Go 永远不会生成的上下文（`mode:'client'` 和"无 metadata 时 `rewrite:true`"），以此断言文档语义。
  - Go 测试 `request_command_test.go:105-114` 断言"no client identity: the CLI runs natively"。
- **影响**：用户在后台选的身份来源，在 build 下与实际出站不一致。"客户端原始"在 build 里实际等同于"服务端"。
- **修复建议**：只要身份能力已启用，就总是传入上下文，包括 client 模式和无 metadata 的情况，并让 CLI 按 mode 决定是保留客户端值还是删除 metadata。也可以反过来改文档和 UI。两边的测试需要对齐到同一个契约，并补一条用真实 CLI 的端到端用例。

### F4（P1）映射密钥可由公开信息推导

- **证据**：
  - `request_identity.go:48` 计算 `key = SHA-256("ccgateway-request-identity-key-v1\0" + lower(email))`，没有任何服务端秘密。
  - 同仓库的 `CLAUDE-CODE-2.1.304-HARDWARE-PRIVACY-AUDIT.md:352-354` 自己建议"以账号 Worker 的独立持久密钥做 HMAC…不能使用全局固定盐"。
- **影响**：
  - 映射的目标是防止同一客户端在多个账号之间被上游关联（见提交说明）。
  - 但上游本来就知道每个 OAuth 账号的邮箱，并且通过原生遥测和直连掌握海量 CC `device_id`（64 位 hex）。它可以对候选 device_id 逐一计算 `HMAC(key_A, x)`，把网关账号背后的真实安装反查出来，再跨账号关联。
  - 算法常量写在源码里，只要源码或产物外流，这种保护就只剩"不公开"。
  - 置信度定为"很可能"：结论依赖威胁模型和算法是否已经公开。
- **修复建议**：为每个账号生成随机密钥，存放在 Core 或 Controller（加密保存），按账号注入 Worker；或者用 Core 的服务端主密钥＋账号 ID 通过 HKDF 派生。邮箱只适合作为盐或域分隔。迁移时要注意：换密钥后已有会话的映射会变化。

### F5（P2）客户端会话 ID 经 Scratchpad 路径泄露

- **证据**：原版 `chunk-gzxd3rp1.js:XT` 中 scratchpad 的计算是 `ke(aC(), sessionId, "scratchpad")`，路径里含会话 UUID。环境文本会写成 `Scratchpad directory: <路径>`（content-policy.js:63 识别这一行）。
- **影响**：
  - direct 模式下正文原样转发，必然带出客户端真实 session。
  - build 模式下，`scratchpad_directory` 来源为 client（存量配置的缺省值，见 IMPLEMENTATION §5）时也会带出。
  - 结果是：metadata 里的会话已经映射，正文里却仍是原会话。同一客户端会话在账号间故障转移时，上游可以靠这段路径把两个账号关联起来。
- **修复建议**：identity 为 replace 时，在 build 中把 scratchpad 字段联动成 worker 或 erase；或者对路径中的会话段套用同一映射。direct 模式要在文档里明确说明这条"不保护"的边界。

### F6（P2）本地错误一律按阶段映射为 400

- **证据**：
  - `request-error.js:39-42,52` 在 phase 为 build 时固定输出 `status 400 / invalid_request_error / cli_invalid_request`，没有读取 `error.status`/`error.code`。
  - `content-policy.js:34-36,229,326` 按设计会抛 503 `configuration_error`（原生环境或计费不可用，属于服务端问题）。
  - Worker 的 `request_error.go` 直接沿用 frame.Status。
  - 复现输出：`{"source":"input","status":400,"error":{"type":"invalid_request_error","code":"cli_invalid_request","message":"Required native environment is unavailable"}}`。
- **影响**：服务端事实不可用被报成"客户端请求无效"。客户端会误判，Core 也可能因为把它当 4xx 而不做故障转移或重试。
- **修复建议**：当 error 带有 3 位 status 和受控的 code（400/409/503 白名单）时，以它们为准。

### F7（P2）发布流程与本地 release 漂移

- **证据**：
  - `package-release.cjs:7-8` 写死了 `'2.1.304':'ccgateway-v12-feature-policy'`。拿伪 ELF 和 v14 的 manifest 去打包，抛出 `Unsupported patch release`。
  - `release/manifest.json` 的 302 条目是 `ccgateway-v7-request-modes`/`b14a537b…`，而生产的 302 是 v11 `14da5daf…`（`artifacts/claude-2.1.302/release-v11/manifest.json`）；`artifacts` 中甚至有 `ccgateway-cli-input-REJECTED-302v7.tar.gz`。
  - `release/` 被 `.gitignore` 忽略，`worker/Dockerfile:31` 和 `companions/Dockerfile:11` 只做 `test -f`，不校验 manifest 中的 SHA。
- **影响**：
  - v14 不改脚本就打不了包。脚本会显式报错，属于 fail-closed，但正是这个缺口导致了 F2 的组合。
  - 用本地 release 构建镜像时，如果要回滚到 302，装上的是已被拒绝的 v7。
  - 镜像的输入既不能从 Git 复现，构建时也不做校验。
- **修复建议**：
  - 允许的 patch 标签改为从 patcher 的 manifest 或 profile 读取。
  - 打包时合并而不是覆盖已有 manifest，并核对旧条目与线上一致。
  - Dockerfile 在 COPY 之后用 manifest 校验 SHA-256。

### F8（P2）旧版本补丁器共享可变的支持模块

- **证据**：
  - 用当前 HEAD 的 `patch-cli-2.1.302.cjs` 重建 302 能成功，标签仍是 `ccgateway-v11-native-build-parameters`。
  - 但与已部署 v11 的 manifest 相比，`model-request`、`request-command`、`request-input`、`request-options`、`request-error` 五个支持模块哈希不同（原生模块全部相同）。
  - 没有任何测试调用 `patch-cli.cjs`、`patch-cli-2.1.296.cjs` 或 `patch-cli-2.1.302.cjs`；296 也没有 profile json。
- **影响**：同一个补丁标签对应不同的行为。旧版本的"保留"实际上没有回归保护。
- **修复建议**：按版本目录冻结支持文件，或在 manifest 中绑定支持文件哈希并对重建结果做比对；296 如果确认不再使用，就删除。

### F9（P2）build 改变 system 的结构

- **证据**：
  - `request-input.js:46-48`：字符串 system 被改成 `[{type:'text',text}]`。
  - `request-input.js:59`：没有 system 时为 `[]`。
  - 补丁后的 `qmn` 中 `$c={…,system:J.ccgatewayBuildOnly===true?J.ccgatewaySystemBlocks:jh.system,…}` 总会输出 system 键。
  - 测试 `request-policy.test.mjs:30-40` 名为"preserves string system"，实际断言的却是转换后的结果。
- **影响**：语义等价，但违反项目"尽量不改客户端请求结构"的原则；非 CC 客户端会看到多出来的 `system: []`。
- **修复建议**：记录客户端原始的 system 形态；全部为 client 且没有计费插入时，按原形态（string、缺省）输出。

### F10（P2）本地校验错误文字不是官方原文

- **证据**：
  - `request-input.js:169-181`（工具配对）、`request-parameters.js:5-6,23-32` 抛出的都是 `request --build: …` 格式的文字。
  - Worker 的 `request_command.go:51-120` 也有类似的自定义文字。
  - 上游官方 API 对同类错误会返回自己的原文。
- **影响**：与"错误文字与官方逐字一致"的原则冲突。官方原文是否逐字相同，本次没有在线核对。
- **修复建议**：对上游本来就会拒绝的输入，改为原样发给上游，让它返回官方错误；只有 build 确实无法表达的情况才保留本地错误，并在文档中列出清单。

### F11（P2）构建输入完整性和可重复性

- **证据**：
  - `patch-cli-2.1.304.cjs:14-18` 只校验 profile 中的 19 个模块，`:134` 却 `cpSync` 了整棵恢复树（约 2460 个 JS 模块）。
  - profile 中的 `binarySHA256` 从来没有被校验。
  - `build.sh:8-9` 没有 `--target=bun-linux-x64`，也不检查 Bun 版本；而实际发布用的是 Windows 上执行 `--compile --target=bun-linux-x64`（`CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md:447`）。
- **影响**：恢复树中未校验的模块被篡改或误改时会被静默编译进产物；按 `build.sh` 构建得不到发布用的产物。
- **修复建议**：校验恢复树的 `reconstruction.json` 与官方 manifest 的 checksum，或者对全树计算 Merkle 哈希；`build.sh` 固定 Bun 版本和 target，并输出产物哈希。

### F12（P2）文档与代码不一致

- README:3 写"build 在原生 metadata 组装及大小预算内映射"，隐私审计 :427 写"`yBe` 的原生身份对象在合并额外 metadata 及执行长度预算之前应用映射"。
- 但当前补丁器**没有修改 yBe**（`chunk-t61vswm2` 的产物哈希与 v12 相同）。映射是在构建完成后由 `applyBuildMetadata` 整体替换的，不受原生 `ae` 预算约束（见 F16）。
- `artifacts/linux-patched-v15-carriers` 里的 `chunk-t61vswm2` 有不同的哈希，说明文档描述的是一个已被撤回的中间版本。
- 隐私审计 :415 的描述与实际行为相反（见 F3）。

### F13（P3）补丁器健壮性细节

- `patch-cli-2.1.304.cjs:79-81`：`Ten` 用 `indexOf` 截取 `case"tool_use":{` 到 `case"text":` 之间的内容，没有检查唯一性。
- `:90`：`rename()` 对全文所有标识符形状的单词做替换，`tool-dispatch.inc.js` 里的字符串和注释也会被改（当前内容恰好没有冲突）。
- `:49`：动态 `import()` 解构 `yBe`、`gTe` 时，名字不存在只会在运行期得到 undefined。本次已核实这些名字目前都存在。
- 版本标签在 L44、L47、L135 三处硬编码，release 与源码之间已经出现 v12/v14 漂移。
- `content-policy.js:189,308` 的 `relay_mode` 分支被 `validateRequestPolicy` 拒绝在先，是死代码。

### F14（P3）测试环境依赖

- `patch-wire-preservation-304.test.mjs:19-21,46` 和 `billing-fingerprint-oracle.test.mjs:8-10` 依赖未入库的 `artifacts/claude-2.1.304/linux-restored`。前者缺失时直接失败（符合"不能悄悄跳过"），**后者缺失时静默 skip**。
- `package.json` 声明 `@babel/parser 8.0.4`，但没有安装；测试实际用的是 `next/web` 中的 7.29.9。

### F15（P3）API Key 路线的 User-Agent

`request-options.js:109` 把 User-Agent 固定为 `ccgateway-request`，与 CC 原生 UA 不同，上游可以据此识别网关。如果有意隔离，需要在文档中说明；否则应改用原生 UA。

### F16（P3）身份载体与长度预算

- Go 侧把不透明的 user_id 按 carrier `json` 处理（`request_identity.go:192-196`），CLI 输出 CC 的 JSON 对象字符串，非 CC 客户端看到的格式因此改变。
- `request-identity.js:34-42` 的 `target()` 在原生 user_id（可能已合并 `CLAUDE_CODE_EXTRA_METADATA`）之上追加 parent 等字段，不再经过原生 `yBe` 的 `ae` 长度回退逻辑。

## 5 测试覆盖评估

`npm test`：**16 个文件、116 项，全部通过，0 跳过**（本机有 artifacts）。

| 测试文件 | 覆盖 | 缺失 |
|---|---|---|
| assembly-coverage（5） | 验收门禁不能被假绿或漏跑掩盖 | 只测门禁逻辑本身 |
| billing-fingerprint-oracle（6） | 用原版 AST 的 `aW/Eg` 计算 cc_version 指纹的采样规则（索引 4/7/20、UTF-16、首个非 meta user）；作为 worker 计费值的独立 oracle | 不测补丁后的 CLI，与身份无关；缺 artifacts 时静默 skip |
| container-resources（9） | cgroup v2 的 CPU、内存、磁盘、嵌套、cpuset、无限额、越界 | 无真实容器（文档另有 smoke） |
| content-policy（30） | 10 个环境字段 ×3 种来源 ×5 种载体、两两组合 1620 例、更新事件、围栏、CRLF、计费合并 | 503 错误的出站帧（F6）；scratchpad 与身份联动（F5） |
| model-request（7） | 原始字节、错误体、分块、取消、owner 隔离 | — |
| native-environment（3） | 只读取所选字段、读取错误、override | — |
| native-tools（8） | mods 注册和分发、hooks | 交互 TUI、子 agent 未覆盖（README 已注明） |
| patch-wire-preservation-304（9） | **真实运行补丁器**并核对哈希；用 vm 执行 qmn 最终对象（tools、EXTRA_BODY、thinking）、Ali/V 资源、Yi 会话 | 没有测 identityBuild/identityBody 在 Ve 中的接线；没有测 qmn 的 system 形态（F9）；没有测 sF、PAs、Gmn、jA、Xfr、_oo、Ten 等补丁点的执行语义（依赖文档中的外部 75 项 E2E） |
| request-build（1） | 296/302 版 request-build.js 的参数归一化 | 不覆盖 304 适配器 |
| request-command-errors（1） | stderr 帧和错误体文件 | — |
| request-error（9） | HTTP 与本地错误帧 | 没有覆盖 status 透传（F6） |
| request-identity（3） | direct 只改写身份片段；build 三种载体 | 用了 Go 永远不会生成的上下文（F3）；没有与 Worker 契约对齐的测试 |
| request-input（7）、request-options（6）、request-parameters-304（9）、request-policy（3） | 输入、选项、参数边界和策略校验 | **没有 Worker 实际信封→CLI 策略的契约测试（F1）** |

整体缺口：

- 没有测试覆盖 `patch-cli.cjs` 入口、296/302 补丁器、`package-release.cjs`、`build.sh`、Dockerfile。
- direct/build 的端到端链路（真实 CLI）只存在于 test 目录里的 `*.cjs` 手工探针和 artifacts 报告中，不在 `npm test` 里。
- native 模式在 304 已不再是请求模式，只有 mods 探针覆盖。

## 6 代码规范观察

- `package-release.cjs` 和补丁器大段内容是压缩成一行的 JS（例如 L44 单行超过 1 KB），审阅和 diff 都困难。建议把注入代码移到独立的 `.inc.js` 文件里，用与 `tool-dispatch.inc.js` 相同的方式加载。
- 支持模块用 296 时代的混淆名书写，再按版本改名，读者很难对照。建议改为按版本生成的导入适配层。
- 策略校验有两份：`content-policy.js:178` 的 `validatePolicy` 和 `request-policy.js:13` 的 `validateRequestPolicy`。
- README 顶部是累积的版本流水账，当前事实和历史混在一起，已出现与代码不符的描述（F12）。
- 以下内容符合要求：错误不做脱敏、截断或改写；内部字段以 `ccgateway` 前缀隔离，并禁止客户端提交（`request-parameters.js:21`）；原型污染防护（`:52-55`）。

## 7 未能验证的范围

- **没有在 Linux 上运行补丁后的 CLI**，因此以下几点没有实测：
  - request 进程实际有没有外联遥测、statsig、Sentry。仅根据 `runner.go:133-140` 的 `DISABLE_TELEMETRY`、`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`、`DISABLE_ERROR_REPORTING`、`DO_NOT_TRACK`、`CLAUDE_CODE_ENABLE_TELEMETRY=0`、`DISABLE_AUTOUPDATER` 推断已关闭。
  - OAuth 刷新时的出站。
  - `--ccgateway-info` 启动时有没有副作用。
- v14 没有可用的编译产物（release 中是 v12），F1、F3 都是按源码和组件级复现得出的。
- 没有在线核对官方 API 的错误原文（F10），也没有核对 Bun 1.4.3 重新编译是否会改变运行时语义。
- content-policy 的 1620 个组合用例以本地测试结果为准，没有逐个人工复核模板。
- 工作区中的 `zz_audit_path_test.go`（3 个）不是本审核员产生的，应属于 audit-path。本审核的临时文件全部在 `%TEMP%\ccg-audit-cli\`。
