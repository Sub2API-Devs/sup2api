# system 开头注入（计费头 / 默认开头行）设计与核对

> 2026-10-22 后续：direct 不再是纯透传，build 与 direct 都必须带计费头，身份行按入口可选，见 [BILLING-IDENTITY-AUTOFILL-DESIGN.md](BILLING-IDENTITY-AUTOFILL-DESIGN.md) 第 7 节。本文保留 v16 的设计与实测。

2026-10-21 设计，2026-10-22 实施为 CLI v16（`ccgateway-v16-build-prefix`），随 Core 0.1.175 / 插件 0.1.73 部署 ovh，实施结果见第 6 节。UI 设计稿：[system-prefix-injection-mockup.html](system-prefix-injection-mockup.html)（可用 `#direct`、`#raw`、`#account` 直接打开对应场景）。第 4 节是实施前对照 v15（`ccgateway-v15-cli-prefix`，线上 0.1.72）的核对，保留作依据。

## 1. 要做什么（2026-10-21 用户定稿）

- **direct = 纯透传**：请求原样转发，不做任何改动——不补计费头和开头行，也不改 `metadata.user_id`。
- **build**：
  - `metadata.user_id`：客户端有就自动替换（现在的「替换」），没有不加。前端不再有身份标识设置。
  - 开头行：客户端首块不是开头行时补上，不替换客户端自己的。不设选项。
  - 计费头：客户端没带就补上；两个字段各选「客户端，没有用服务端」（默认）或「服务端」。
  - 附件转换：不变。
- **控制台测试**：固定用 build 模式测（不论账号设的是 direct 还是 build），由 build 补上计费头和开头行。现有代码已经如此：Worker 收到 `/v1/ccgateway/probe` 一律走 build（`engine/request_command.go:174-178`），插件测试请求 `BuildTestRequest` 不用改。

上游（OAuth，Sonnet/Opus）：首块既不是计费头也不是开头行时 429（10-21 在 30 号实测）。

## 2. UI（基于现有 CC 特性页）

1. **请求模式卡**：direct 叫「纯透传（direct）」。下面一两行固定说明，没有控件——direct：“请求原样转发，不做任何改动”；build：“metadata.user_id 有就自动替换，没有不加”“开头行没有就补上”。
2. **身份标识卡删掉。**
3. **「计费归属」改名「计费头」**（只在 build 显示）：版本标识、入口标识两行，列为「客户端，没有用服务端」「服务端」。
4. **附件转换**：不变。

## 3. 配置与传递

- `request_identity_sources` 不再由前端设置，核心也不再下发（已保存的旧值同样不下发）；Worker 没收到时按自己的默认 `replace` 处理（build）。API Key 账号仍保留客户端原值（现有规则）。
- `build_billing_sources` 取值不变（`client | worker`），只是 `client` 的含义变为“客户端，没有用服务端”。不改名，旧配置不用迁移。
- CLI v16：
  - build：没有计费头时用原生 `kLo` 整行补上，有就按字段改值或补缺字段；再补开头行。
  - direct：去掉 v15 的开头行插入和身份改写，纯透传。
- Worker：direct 不再解析和传递身份上下文。
- 不加新能力：核心下发的内容没有新字段，新行为全在随插件一起发布的 Worker 与 CLI 里。

**与线上行为的差别**：build 从“只补开头行”变为“计费头和开头行都补”；direct 从“补开头行 + 改 user_id”变为完全不改。

## 4. 对照 v15 的核对结果

### 4.1 入口标识与开头行不一致（需要决定）

- Worker 启动请求进程时设 `CLAUDE_CODE_ENTRYPOINT=sdk-cli`（`engine/request_command.go:344-351`）。原生计费头的入口取 `TY() ?? CLAUDE_CODE_ENTRYPOINT`（chunk-6qx5mjec `kLo`）；请求命令不设 `TY()`（`launchOptions.entrypointOnRequests`），所以服务端的 `cc_entrypoint` 是 `sdk-cli`（待实测）。
- v15 插入的开头行是终端那句 `le`（按用户要求，`n1n({isNonInteractive:false})`）。
- 真实客户端只有两种组合：
  - 终端交互式：`cc_entrypoint=cli` + `le`；
  - `claude -p` 非交互：`cc_entrypoint=sdk-cli` + `De`（"You are a Claude agent, built on Anthropic's Claude Agent SDK."）。
  
  `sdk-cli` + `le` 不存在。现在 build 选「入口标识＝服务端」时，发出去的就是这种组合。
- 建议：注入用一致的“终端”组合，即注入的计费头写 `cc_entrypoint=cli`，「入口标识＝服务端」也取 `cli`。改法是让 CLI 生成计费行时把入口当作 `cli`，比如调用 `kLo` 前临时设入口，不改 Worker 的进程环境（它还影响其他原生行为）。

### 4.2 `cc_version` 后缀算错了（现有问题，worker 来源已受影响）

- 原生：`cc_version = 2.1.304.<RIs(messages)>`。`RIs` → `aW` 取**第一条非 meta 的 user 消息**的文字（字符串，或第一个 text 块），`Eg` 取第 4、7、20 个字符加盐做 sha256，截前 3 位（chunk-2gh4h0fv）。真实 CC 里附件（system-reminder）是单独的 `isMeta` 消息，所以算的是用户真正的输入。
- build：`prepareBuildInput` 把每条 wire user 消息都做成普通 user 记录（`request-input.js:158`，没有 `isMeta`）。客户端第一条 user 消息的第一个 text 块通常是 `<system-reminder>…`，于是取到的总是 `<system-reminder>` 的固定字符，所有会话的后缀几乎都一样。真实 CC 不会这样。
- direct 注入计费头时也要算这个值，问题相同。
- 建议：计算时跳过以原生 `KF`（`<system-reminder>`）开头的 text 块，取第一个真正的用户文字；build 与 direct 用同一个函数，并加测试对照原生 `RIs` 的结果。

### 4.3 计费头的补齐

- 现在 `mergeBillingAttribution` 在没有计费头且有字段选 `worker` 时自行插入，只写选中的字段；上游要求两个字段都在，单字段插入必然 400（10-21 实测，线上同样）。新规则：build 下没有计费头就插入原生 `kLo` 整行（两个字段都在，不自己拼）；有计费头时按字段选项改值或补缺的字段。原生行里还有 firstParty OAuth 的 `cch=00000`；会话类字段（`cc_prev_req`、`cc_prompt_id` 等）在单次请求进程里没有。
- 判断“已有计费头”现在有两套规则：开头行检查用原生 `B1s`（块文字以 `oJe` 开头），字段改写用 `billingCandidate`（围栏外任一行以 `oJe` 开头）。插入判断以上游规则为准，只看首块（`B1s`）；字段改写沿用行级规则。

### 4.4 客户端计费头不在首块（需要决定）

客户端的计费头在后面的块里（不在首块）。再插一个就有两个计费头，上游接不接受未测。建议这种情况不再插计费头，只在最前面补开头行（上游接受），并发诊断 `billing_not_first`。实施前先在 30 号上测“两个计费头”。

### 4.5 `cch=00000`（2026-10-22 已实测，见第 6 节）

原生行写的是占位 `cch=00000`。官方二进制在发送前是否会把它换成按请求计算的值，以及我们用标准 Bun 1.4.3 重新编译的 CLI 发出去的是什么，目前没有核实。上游接受 `00000` 和不带 `cch`（10-21 实测）。实施时在 30 号上抓一次 v15 build 实际发出的计费行（Worker 诊断日志或临时打印），再决定注入时带不带。

### 4.6 已核对、与设计一致的部分

- 顺序：build 先在 `buildRequest` 里合并计费头，再由 `request-command` 插开头行；`prefixPosition` 看到首块是计费头就把开头行放在其后，得到原生形状。新增的计费注入放在同一位置（开头行之前）即可。
- 只对 OAuth：v15 的开头行只在没有 `ANTHROPIC_API_KEY` 时插入（`request-command.js`），保持不变；计费注入同样只对 OAuth。
- direct 回到纯透传：去掉 cli.js 补丁里传给请求命令的 `prefixBody` 与 `identityBody`，`directCliPrefix`、`rewriteDirectIdentity` 及其测试一并删除。
- 控制台测试：probe 固定走 build，所以总会补齐，测试不受 direct 设置影响。
- 原生文字来源：计费头前缀 `oJe`、判断 `B1s`、开头行 `n1n`/`t1n`、reminder 标签 `KF`/`lKe` 都已在 v15 从 CLI 取得，新功能不需要再抄写任何 CC 文字。

## 5. 用户决定（2026-10-22）

1. 入口一致性（4.1）：保持 `sdk-cli`，开头行改用与之配套的 SDK 那句 `De`（`n1n({isNonInteractive:true,hasAppendSystemPrompt:false})`），即 `claude -p` 的组合。
2. 客户端计费头不在首块（4.4）：未答复，按建议实施——不再插第二个计费头，就地补字段，开头行补在最前；没有加 `billing_not_first` 诊断。
3. `cc_version` 后缀（4.2）：一起修。

## 6. 实施结果（2026-10-22）

- 代码：CLI `content-policy.js`（计费补齐）、`request-input.js` `fingerprintMessages` 与补丁中 `RIs` 的改动（指纹）、`request-identity.js` / `request-command.js`（去掉 direct 改写，开头行改 SDK 那句）；Worker `engine/request_command.go`（direct 不解析身份）；核心 `feature_policy.go`（不下发身份来源）；前端 `RequestPolicySettings.vue`（删身份卡，模式下写固定说明，计费头两列）。规则细节见 [build 组件设计](../../plugins/ccgateway/docs/BUILD-REQUEST-COMPONENTS-DESIGN.md) §5.5、§6.1、§6.2、§7。
- 本地：cli-mods 131 项、engine、核心 ccgateway（含 PG）、前端 622 项与类型检查通过。指纹用官方 `claude -p` 抓到的请求核对：新取法得 `b17`，与其自带的 `cc_version=2.1.304.b17` 相同，旧取法得 `159`。
- 抓包（ovh 上的一次性容器，无网络、假 OAuth 令牌，v16 ELF sha256 `b68c845c…595b8d`）：
  - direct 发出的字节与输入完全相同，环境里带身份上下文也不改。
  - build 首块为 `x-anthropic-billing-header: cc_version=2.1.304.<指纹>; cc_entrypoint=sdk-cli;`，第二块为 SDK 那句，客户端提示保留，`metadata.user_id` 被替换。
  - 指纹按用户文字计算：首块是 reminder 时得 `95b`（按 reminder 算会是 `44e`），换一句提示得 `544`。
  - 客户端头只有 `cc_version=2.1.304.zzz;` 时保留 `zzz`、补上 `cc_entrypoint=sdk-cli;`，开头行放在其后。
  - 客户端没有 metadata 时 build 不加；API Key 不插开头行。
- 30 号真实上游（v16 ELF 临时放进容器，测完删除）：build `claude-opus-4-8`、`claude-sonnet-4-6`、首块为 reminder 的 Opus 请求都是 200。direct 下 CC 形状的请求（计费头 + SDK 那句）200；不带二者的简化请求 429，这正是纯透传的预期。
- 发布后（Core 0.1.175 / 插件 0.1.73）：30/31/32/33 控制台 claude-opus-4-8、claude-sonnet-4-6 均 200，30/31/32 Haiku 200。
- 计费头不在首块（2026-10-22，30 号，线上 v16 CLI，`claude-opus-4-8` 与 `claude-sonnet-4-6` 结果相同）：
  - build：客户端 system 为 `[提示, 计费头]` 或 `[提示, 只有 cc_version 的计费头]` 时，发出的是 `[SDK 开头行, 提示, 补齐两个字段的计费头]`（一次性容器抓包确认），上游 200。
  - direct 直接发各种排列：`[提示, 计费头]` 没有开头行 429；`[开头行, 提示, 计费头]`、`[开头行, 计费头, 提示]`、首尾两个计费头 `[计费头, 提示, 计费头]` 都是 200。
  - 不在首块的计费头上游不检查：只有 `cc_version` 的头、指纹为 `zzz` 的头放在后面都是 200。缺字段 400 只发生在首块。
  - 结论：4.4 的做法（不插第二个头、开头行补在最前）可用；插第二个头上游也接受，但没有必要。
- 真实客户端走 direct（2026-10-22，30 号）：
  - 做法：临时受限分组 `ccg-audit-direct` 只含 30 号，分组覆盖 `relay_mode=direct`，再建一个绑定该分组的临时 Key。本机官方 Claude Code 2.1.304 用临时配置目录，经 SSH 隧道连 ovh 核心。生产分组 10 同时仍解析为 build。
  - 结果：`claude -p` 简单问答（`claude-opus-4-8`）返回 `DIRECT-OK`；Opus 与 Sonnet（`claude-sonnet-4-6`）各做一轮 Read 工具往返（客户端本地读文件，再把 tool_result 发回），都拿到文件里的暗号，`is_error=false`。
  - 30 号 Worker 日志：这 5 次请求全是 `mode=direct`、HTTP 200，入站 body 首块就是客户端自带的计费头、第二块是 SDK 那句。同一时段经其他分组到 30 号的请求仍是 build。
  - 测完删除 Key、分组覆盖和分组，30 号的分组恢复为 6/9/10，管理员的受限分组恢复为 4，关闭隧道。
- 真实客户端走 build（2026-10-22，30 号，做法同上，临时分组覆盖 `relay_mode=build`）：
  - 结果：简单问答（`claude-opus-4-8`）返回 `BUILD-OK`；Opus、Sonnet 各一轮 Read 工具往返都答对，`is_error=false`。
  - 30 号 Worker 日志：5 次请求都是 `mode=build`、HTTP 200。客户端自带的计费头是 `cc_version=2.1.304.<指纹>; cc_entrypoint=claude-desktop-3p;`（本机 `claude` 从桌面版会话继承了 `CLAUDE_CODE_ENTRYPOINT`），第二块是 SDK 开头行。默认来源“客户端，没有用服务端”下两个字段原样保留，没有补齐和诊断事件，开头行也不重复插入。
  - 清理同上，已全部恢复。
- 不带开头行（2026-10-22，30 号，direct 直接发，`claude-opus-4-8`、`claude-sonnet-4-6` 结果相同）：
  - 首块是计费头时不需要开头行：`[计费头, 提示]`、只有 `[计费头]`、字符串 system 只有计费头、计费头和提示在同一块（数组或字符串，计费头在最前，换行后接提示）都是 200。
  - 没有计费头时首块是开头行即可，终端那句和 SDK 那句都是 200。
  - 二者都没有（`[提示]`、不带 system）429；Haiku 都是 200。
  - 结论：上游要的是首块以计费头开头或首块是开头行，二者有一个就行。计费头可以和提示在同一块，开头行必须单独成块（10-21 实测）。build 总补计费头，所以开头行对上游不是必需的；仍然补上是为了和原生 CC 的形状一致。
- build 不补开头行（2026-10-22，30 号）：用临时 CLI（v16 加一个只在测试里用的环境变量开关，跳过补开头行，测完删除）在 30 号容器里直接跑 `claude request --build`。
  - 抓包确认：关掉后发出的 system 是 `[计费头, 客户端提示]`，没有开头行；开着时是 `[计费头, SDK 开头行, 客户端提示]`。
  - 真实上游，`claude-opus-4-8` 和 `claude-sonnet-4-6` 结果相同：简单问答、首块为 reminder 的一轮工具往返（答出 tool_result 里的暗号）、流式都是 200。
  - direct 同一天补测更接近真实的请求：`[计费头, 提示]` 的工具往返、流式，以及计费头与提示同块的工具往返都是 200；对照 `[提示]` 仍是 429。
  - 结论：build 去掉补开头行也能成功。
- `cch`（2026-10-22，30 号，线上 v16 CLI）：线上 build 发出 `cch=00000;`。
  - 条件：原生 `kLo` 在 `Pe()==="firstParty" && Ri()` 时写 `cch=00000;`。`Ri()` 要求 `ANTHROPIC_BASE_URL` 未设置或是官方地址（或设了 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL`）。之前一次性容器抓包把 base URL 指向本地，所以不带。30 号容器和 Worker 环境里没有 `ANTHROPIC_BASE_URL` 和 Bedrock/Vertex 变量，request 命令也不设，所以条件成立。
  - 实抓：在 30 号容器里用 `ANTHROPIC_UNIX_SOCKET`（请求地址仍是 `api.anthropic.com`，连接走 unix socket 上的 TLS）、占位令牌 `CLAUDE_CODE_OAUTH_TOKEN=ssh-placeholder` 和临时自签证书起假上游，build 发出的首块是 `x-anthropic-billing-header: cc_version=2.1.304.8f6; cc_entrypoint=sdk-cli; cch=00000;`，第二块是 SDK 那句。假上游返回 400，没有请求到达上游。
  - 发出的是原生代码里的占位值 `00000`；官方二进制发送时是否会改写这个值没有核实。上游接受 `00000`（10-21 实测，发布后的控制台测试也都是 200）。
