# Claude Code 2.1.312 → 2.1.316 迁移记录（CLI v41 → v43，后续 v44、v45、v46）

2026-11-02。把账号 Worker 里的定制 CLI 从官方 2.1.312（`ccgateway-v41-login-401`）移到官方 2.1.316，要求 `claude request --build|--direct` 与 `claude ccgateway-mgmt` 的逻辑与 v41 一样，只允许出现官方自己的变化。做法按 [CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md) 第 1–5 节，上一次迁移见 [CLAUDE-CODE-2.1.312-MIGRATION](CLAUDE-CODE-2.1.312-MIGRATION.md)，计费头规则见 [CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION](CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION.md)。

| 项 | 2.1.312 / v41 | 2.1.316 / v43（v42 未发布） |
|---|---|---|
| 官方 manifest | 2026-10-27T17:16:03Z 构建，commit `f375cd85` | 2026-10-30T23:47:48Z 构建，commit `cd7ceb459c6864567b16a11f60101b24421475c1` |
| 官方 linux-x64 ELF SHA-256 | `4f4178ce…a5d01d`（293592432 字节） | `fd13c70000fec3f2116dfbcbb6121210b4a29328bf0e46210a59dd594a67d824`（328262000 字节，与官方 manifest 一致） |
| 内嵌 Bun | 1.4.4（修订 `0ae49f8b6`） | 1.4.4（修订 `71c9bf0ca`），profile `bunVersion` 仍为 1.4.4 |
| Bun 报告的 Node.js 版本 | 官方 `v26.12.1`；v41 发 `v26.3.0` | 官方 `v26.12.1`；v43 起 profile `runtimeVersion` `v26.12.1`，CLI 报告它（第 4、5 节） |
| 还原 | 2813 模块 / 2581 JS | 2880 模块 / 2648 JS，`unresolved` 为空，入口 `cli.js` |
| 补丁标签 | `ccgateway-v41-login-401` | `ccgateway-v43-cc-2-1-316`（插件 0.1.122 起新账号使用；v42 `ccgateway-v42-cc-2-1-316` 编译验证过、未发布）；`ccgateway-v44-stored-login`（第 10 节，未发布）；候选 `ccgateway-v45-first-party-shape`（第 11 节） |
| 定制 ELF SHA-256 | `2c80da64281533d32faecbb3816a1f6a8c8070037dd49d035ef2c7387b1af211`（线上 v41） | `f8f9afa447be6ef132f87c6af7d1880fc822e68f4cf9249f2143a59fdfa163a0`（v43，325183664 字节；v42 是 `3a1ca882…78a4`）；v44 `76b11ddd052bd92506a10cc6ddcb7b81da12ddc5f19aee91c048a9739172f99b`（325183664 字节），第 6 节；v45 `724ebb3397eef4abb88d4e320ebef0e55edc66fe1ca409263ada6db05a6b3bde`，第 11.4 节 |
| 能力 | 20 项 | 21 项：v41 的 20 项加 `build_injection_tools_v2`（第 5 节）；v45 22 项，再加 `build_first_party_shape_v1`（第 11 节） |

分析中间产物在 `artifacts/claude-2.1.316/`（不进 Git）：`official-manifest.json`、`claude-linux-x64`、`linux-restored/`、`seeds.json`、`equiv-312-316.json`、`equiv-index-82961a4ddc91.json`（旧树）、`equiv-index-d8c229e5ecfa.json`（新树）、`equiv.out`、`carry.json`、`diffs/g1…g4/`（unitdiff）、`review/`（四组审查报告 `g1-query.md`、`g2-core.md`、`g3-transport.md`、`g4-entry.md` 与脚本）、`captures/`（官方抓包，2.1.312 重抓与 2.1.316）、`patched-v42/`、`patched-v43/`、`release-v42/`、`release-v43/`、`runtime/`（运行时探针）、`inject/`（注入工具探针）、`verify/`（v42 的 `RESULTS.md`、v43 的 `RESULTS-v43.md` 与日志）、`port/`（本次移植用的一次性脚本：生成 profile、作用域自由名对照、测试移植、产物断言）。

## 1. 下载与还原

- 官方 `2.1.316` 的 manifest 与 linux-x64 ELF 按 `acquire.py` 样板下载，SHA-256 与字节数等于 manifest。
- `restore-bun.cjs` 还原：`binarySha256` 等于 manifest checksum，2880 个模块、2648 个 JS，`unresolved` 为空，`bunVersion` 1.4.4（修订 `71c9bf0ca`）。
- 24 个哈希绑定模块里除 `cli.js` 外名字全部换了（`cli.js` 内容也变了），按 equiv 配对重新找（第 3 节）。

## 2. 静态分析（equiv / unitdiff / carry-profile）

`seeds.cjs . 2.1.312` 生成 87 个种子；`equiv.cjs` 结果（`equiv-312-316.json`）：旧 98638 个单元、新 100792 个，配对 95302（same 93637、changed 1665），冲突 1131（`old-reached-twice` 1092、`new-claimed-twice` 39）。87 个种子：same 80、changed 4、unmapped 3。

| 结论 | 种子 |
|---|---|
| same | 其余 80 个，包括全部 `coreScope`（49）、`coreImports`（2）、`locate.systemRecord`/`appendJoin` 和 `natives` 里除下面两个以外的全部 |
| changed | `K$`→`MN`（客户端工厂）、`YH`→`gB`（工具定义）、`Qmn`→`e_n`（主查询）、`Kk`→`AT`（消息规整） |
| unmapped | `cli.js:Ke`（入口，新版 `qe`）、`Kmn`（消息规整入口，新版 `Qyn`）、`d2s`（计费头，新版 `chunk-w5ndchqs.js:JXs`），都按文本与结构人工确认 |

`carry-profile.cjs` 的 `problems` 只有 `createClient`（changed）和 `attributionHeader`（UNPAIRED，carry 给 `null`，profile 手填 `chunk-w5ndchqs.js:JXs`）。新核心模块是 `chunk-e6aww6q8.js`（旧核心 14001 个配对单元里 13864 个落在它里面）。

四组审查（`review/g1…g4`）的结论摘要如下，细节与证据文件见各报告。

### 2.1 changed / unmapped 单元的审查

| 单元 | 变化 | 对 `claude request` 的影响 |
|---|---|---|
| `Qmn`→`e_n` 主查询（g1） | 局部名全部重新压缩；**查询参数 `Q`→`Z`**（新核心另有一个导入的 `Q`）；包装函数与时钟两个局部名对调（旧 `Se` 包装/`ke` 时钟，新 `ke` 包装/`Se` 时钟）；构建器 `x9n`→`g5n`、beta 列表 `Hr`→`Os`；构建器多一个"粘性拒绝"过滤（会话里被服务端拒绝的 beta），组织 effort 上限；遥测用的构建器调用改为出错时才执行；计费调用多传 `responseBeforeCompaction` | 11 处锚点按新局部名重写，逻辑不变。粘性拒绝集与 effort 上限都是进程内状态，一次请求一个进程时为空，build 出口不变。构建器的 12 个 beta 头值与顺序与 2.1.312 完全相同（常量从 `chunk-bwbq4xvm.js` 导入）。模型表之后对 beta 列表的 `.push` 新旧都是 6 处、一一对应，没有新挪出模型表的 beta，2.1.312 加的 thinking-token-count build 判断仍需要、原样保留 |
| `Kmn`→`Qyn` 消息规整入口（g2，unmapped） | 新增外来 thinking 判断、per-turn effort 的 `effortCap`；返回对象的 8 个字段名与顺序不变 | 外部消息在开头直接返回，无影响。**新核心里另有一个无关的 `function Kmn(e,n)`（沙箱说明附件），旧锚点文本在里面恰好命中一次**；派生脚本显式改名为 `Qyn`，测试断言沙箱 `Kmn` 未被改动 |
| `Kk`→`AT` 消息规整（g2） | peer 观察消息/图片撤回提示、`withdrawnImages`、`cowork_memory_context` 等 | build 的外部消息跳过 `Qyn` 后不跑 `AT`；`api_system` 分支的 flush 名换成 `rs();fs();Kn.push(jo);`（已核对是同一对 flush 函数、记录数组与循环变量） |
| `YH`→`gB` 工具定义（g2） | eager-streaming 配置来源、`citations` 按模型判断 | 客户端工具在开头逐字返回，无影响 |
| `K$`→`MN` 客户端工厂（g3） | 函数末尾新增：等待"受管设置是否压住本机登录"落定（`qW`）；**重读登录凭证、重判 OAuth、重读自定义头里的 Authorization，变化时整个客户端重建**（`let Bl=Pn();if(…)return MN(e);`）；受管 apiKeyHelper 压住本机登录时抛 `StoredLoginHeldBackError`。另外**本模块里 `Od`/`Ud` 两个名字对调**：按 model 选提供方路由的是 `Od`（2.1.312 的 `Ud`），`Ud` 是一方 TLS URL 判定（参数是对象） | 锚点 1–5 按新名重写，第 2 条必须写 `Od(s)!=="firstParty"`（写成 `Ud(s)` 会让每个 API-key 请求都被拒）。新增第 6 条锚点：把重读/重判/重建那一段包进 `if(!ccgatewayAPIKeyOnly){…}`，API-key-only 路线跳过的仍是 2.1.312 的同一组调用（自定义头、凭证读取、OAuth 判定、代理认证）；不加的话这条路线会读本机登录凭证，并且在 `fl()` 为真且本机有带 inference scope 的登录时 `MN(e)` 会无限递归。OAuth 路线照官方执行：Worker 没有受管 apiKeyHelper，不会抛错；令牌刚刷新时重建一次，出口不变 |
| `d2s`→`JXs` 计费（g4，unmapped） | 多透传一个可选选项 `responseBeforeCompaction` 给原生头构建器 `Dns`（原 `f3o`） | 锚点 `d=ca([s,n,...e].filter(Boolean));` 唯一，替换只换名。新字段见第 4 节 |
| `Ke`→`qe` 入口（g4，unmapped） | 参数列表 `e`→`t`、快路径设置来源 `r`→`o`，GitHub stand-in 仍是 `a`；新增 `markNoDialogLaunch()` 与编译期常量 `ie=!1` 的判断，都在锚点之后 | `entryStub('t','o')`，锚点 `if(a!==void 0){` 唯一 |

传输闭包（g3）：全树请求头字面量 2.1.312 与 2.1.316 都是 136 个、集合完全相同；`hw`→`bw` 只差 `crypto.randomUUID` 的别名，`x-client-request-id`、gzip 与末尾随机空白规则不变；新增的 CCS 发送方地址重试、gzip 分块诊断、reply-hold 计数、系统 CA 循环交叉签名过滤都在 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 加 Worker 环境下不触发或不改变出口字节。UA 仍由 `Fl`（不是新版的 `Ml`，那是另一个函数）里的 `"User-Agent":wU()` 写，模板不变。

### 2.2 依赖的其余原生

- `natives`：`modelBetas` `lRn`、`mainAgentContext` `ad`、`betasAllowed` `foo`、`oauthBeta` `UEe`、`requestIdentity` `vVe`、`querySourceFor` `nue`、`AnthropicClient` `uPe`、`modelFetch` `dte`、`toolPool` `qNt`、`identityLine`/`isIdentityLine` `p7n`/`f7n`、`billingHeaderPrefix` `fit`、`reminderOpen`/`Close` `Zx`/`Sre`、`setEntrypointOnRequests`/`getRootSession` 在 `chunk-nj7t53r7.js`（再导出 `chunk-ndmse9kj.js`），全部 same；`unitdiff` 0 行或只差版本元数据。
- 计费指纹 `Vei`（原 `oYs`）：盐 `59cf53e54c78`、下标 4/7/20、sha256 前 3 位不变。
- 身份行三条文本逐字不变（`oe`/`Ue`/`Ie`），选择逻辑 `p7n` 与 `b6n` 逐 token 相同。
- 环境段渲染器与读取器、词表、层词表、日期、token 预算、模型身份：全部 same，`native-environment.inc.js` 与支持模块不用改。
- `CLAUDE_CODE_EXTRA_BODY` 仍由核心本地函数 `RV`（原 `jK`）读取，0 行差异。
- SDK 模块 `chunk-hwmsct5x.js` 里仍恰好一处 POST `/v1/messages?beta=true`。
- contracts/features（`agent_context.go`、`identity_line.go`、`injection.go`、`levels.go`、`request_modes.go`）都不用改：上下文头 10 个名字都在，UA 正则匹配 `claude-cli/2.1.316 (…)`，新的 `SendToProject*` 是受开关控制的延迟工具，不进注入工具清单。

## 3. 补丁的迁移

- profile `profiles/linux-x64-2.1.316.json`：由 2.1.312 的 profile 与 `carry.json` 生成（`artifacts/claude-2.1.316/port/make-profile.cjs`）。`natives`/`coreScope`/`coreImports`/`locate.systemRecord`/`appendJoin` 取自 carry；`natives.natives.attributionHeader` 手填 `chunk-w5ndchqs.js:JXs`；`locate.requestBuilder` `g5n`、`builderBetaList` `Os`、`betaMessagesModule` `chunk-hwmsct5x.js` 人工确认；`capabilities`、`supportModules`、`patchOnly` 不变。`modules` 沿用 2.1.312 的 24 个模块，每个映射到"新版里装着它大部分配对单元的模块"（`map` 按模块计数，例如 `chunk-7dmym6x9`→`chunk-e6aww6q8` 13864/14001、`chunk-ysj6rv35`→`chunk-55ht3bcx` 175/176、`chunk-ksa0mq1y`→`chunk-g54kbxqw` 645/671）；只做再导出的两个模块按 natives 去向映射（`chunk-c2txqh1z`→`chunk-nj7t53r7`、`chunk-44429y21`→`chunk-hhv17y7d`）。哈希按新还原文本重算，其中 15 个与 g4 报告第 2 节给出的 SHA-256 逐个一致。
- 锚点 `patches/2.1.316.cjs` 由 `tools/upgrade/examples/derive-anchors-2.1.316.cjs` 从 2.1.312 的锚点逐条替换生成（每条替换必须恰好命中预期次数；主查询块里 `Q.`→`Z.` 25 处、最后 `Z.ccgateway` 18 处；最后检查没有旧名字残留，并且按标识符边界检查 `Q`、`Kmn`、`Ml`、`Kk`、`Xmr`、`YH` 不再出现、主查询块里不出现 `Se(`，`Od(s)!=="firstParty"`、`function Qyn(e,n){if(n.ccgatewayInput===true)`、`if(!ccgatewayAPIKeyOnly){let Bl=Pn();` 各恰好一次）。客户端部分与 g3 的建议锚点 `diffs/g3/client-anchors-2.1.316.proposed.cjs` 逐条相同。13 个被改写函数：入口 `cli.js:qe`、会话 `chunk-ndmse9kj.js:Rt`、容器资源 `chunk-5mav84cq.js:BWi` 与 `chunk-eweqvj83.js:Z`、核心 `chunk-e6aww6q8.js` 的 `gB`/`e_n`（构建器 `g5n`）/`Qyn`/`AT`/`YSr`/`Sio`、客户端 `chunk-hwmsct5x.js:MN`/`Fl`、计费 `chunk-w5ndchqs.js:JXs`。与 2.1.312 相比只有名字不同，外加 `MN` 里一处新锚点（第 2.1 节）。
- 补丁器、支持模块、`native-environment.inc.js` 都没有改（v42；v43 改了补丁器、`request-build.js`、`native-environment.inc.js`、四个 profile，见第 5 节）。
- 补丁：`node patch-cli.cjs …/linux-restored …/patched-v42` 成功，改写 7 个模块，34 个支持文件；`anchor-hazards`：27 处替换文本全部逐字出现在产物里，无 `$` 模式（`{"replacements":27,"hazards":[]}`、`{"verbatimInOutput":27,"missing":[]}`）。产物另做的断言（`port/check-patched.cjs`，全部通过）：`e_n` 唯一且不含 `Q.ccgateway`、含 12 处 `Z.ccgatewayBuildOnly` 与 thinking-token-count 的 build 判断、build yield `g5n({model:Z.model,fastMode:false})`；`function Qyn(e,n){if(n.ccgatewayInput===true)`；沙箱 `Kmn` 与还原文本逐字相同；`MN` 里 `Od(s)!=="firstParty"` 一处、模块里没有 `Ud(s)!=="firstParty"`、`if(!ccgatewayAPIKeyOnly){let Bl=Pn();` 一处、两处 `Pn()` 都在 API-key-only 判断之后；UA 只有 `ccgatewayClientUserAgent()??wU()`；新版 `Ml` 未被改动；beta 列表 `[yv,qT,xG,Rge,l3e,KPt,tj,l9t,qlt,VPt,DO,PG]` 从 `chunk-bwbq4xvm.js` 导入。
- `test/native/2.1.316/` 由 2.1.312 那份按新名字移植（`port/port-tests.cjs`、`port/port-wire.cjs`，每条替换恰好命中预期次数）；vm 桩的自由变量名用作用域分析逐个对照（`port/free.cjs`、`port/declfree.cjs`，例如构建器 `Qc` 读的 24 个名字、环境渲染器的 `Qso`/`e9`/`Ao`/`bn`、轮次函数的 `cft`/`Gk`/`gf`/`t0e`/`lz`）。计费指纹的期望值按手算公式 `sha256(盐 + 采样 + "2.1.316")[0:3]` 重算（`0cd→2e4`、`536→0c0`、`622→644`、`23b→f9f`；同一公式用 "2.1.312" 得出旧值），原生 oracle（vm 里执行 `tF`/`$f`）与手算一致，官方 2.1.316 抓包的 `cc_version=2.1.316.182` 也由它复现。`patch-wire-preservation` 新增 API-key-only 路线的断言（2.1.312 的测试里没有）：`Od(s)!=="firstParty"` 一处、无 `Ud(s)!=="firstParty"`、`se=ccgatewayAPIKeyOnly?{}:v4t(),`、`pt=ccgatewayAPIKeyOnly?null:Pn(),kt=ccgatewayAPIKeyOnly?false:hUe(`、`if(!ccgatewayAPIKeyOnly)await I8e();`、`if(!ccgatewayAPIKeyOnly){let Bl=Pn();`、`Pn()` 恰好两处；另断言 `gB` 开头、`Qyn` 开头、沙箱 `Kmn` 与新版 `Ml` 保持原生、`e_n` 里没有 `Q.ccgateway`。
- 版本无关部分只动了测试辅助 `test/replay-helpers.cjs`：计费指纹事实表加 2.1.316 一行。`nativeBillingExtras` 与 `test/e2e/verify.cjs` 的字段顺序表**没有**加 `cc_prev_msg`/`cc_prev_prompt_index`/`cc_prev_turn_index`：官方 2.1.316 抓包（未压缩的首轮）不带这三个字段，测试全过；我们写的头也不会带（第 4 节）。只有将来拿压缩之后的官方客户端抓包做对照时才需要加，届时作为可选的末尾字段（排在 `cc_project` 之后）。
- 新增的夹具：`official-request-2.1.316.json`、`official-tools-2.1.316.json`（`capture-official.sh` 抓取，`body_sha256` 一致）、`native-{vocabulary,layers,environment}-2.1.316.json`（原生生成）、`assembly-cases-2.1.316.json`（76 项）、`client-content-cases-2.1.316.json`（14 项），后两个由 `fixtures/build-*.cjs` 按 `CC_VERSION=2.1.316` 生成。与 2.1.312 的对比：词表、层词表逐字相同；环境段模板只差 `cli_version` 与 provenance；两份 cases 只差官方抓包带来的值（`body_sha256`、`source_cli_sha256`（2.1.312 那份为 null，因为当时没有 official-tools 文件）、`tools_source`、抓包里的计费头 `cc_version=2.1.316.182`/`cch`/`cc_prompt_id`、`metadata.user_id`、日期提醒 2026-11-02、按新版本算出的 `cc_version` 指纹）与 suite 名、版本号。

## 4. 官方 2.1.316 的变化（对我们可见的部分）

D0：`capture-official.sh` 同一镜像分别抓官方 2.1.312 与 2.1.316。2.1.312 的重抓与仓库夹具经 `official-diff` 0 差异（`captures/diff-312recap-vs-committed.txt`）；2.1.312 与 2.1.316 的 `official-diff` 也是 0 差异（`captures/diff-312-vs-316.txt`，版本号、指纹、cch、日期先规范化）；请求头名与顺序完全相同，只差会话 ID、prompt ID、client request ID（`captures/headers-312-vs-316.txt`）。下面的变化出现在这个最小请求之外：

| 变化 | 出现在哪 | 结论 |
|---|---|---|
| 默认系统提示词：新增 `original_games` 段（"Do build original games … Don't build a recreation of a specific existing game…"，只在模型 client data 打开或带 `opus_5_5_prompt_bundle` 时）；lean 模型的 communication 段 `short`→`none`；被识别为 described 的 fable 模型不再输出 fable 身份段 | 原生默认提示词（`KI`，原 `sI`）。我们只在 build 的"高"注入等级用原生默认提示词（`ccgatewayDefaultPrompt`）时带出 | 官方变化，按原生原样；"高"等级的组装对账与离线回归里可能出现差异，按官方变化记录 |
| 两个新的延迟工具 `SendToProject`、`SendToProjectContext`（`shouldDefer:!0`，`isEnabled` 受开关控制），插在 Skill 之后 | 原生工具池 `qNt` 的列表 | build 按名字挑选注入的工具，不会带出；不加进注入工具清单 |
| Bash（权限匹配抽函数、后台任务判断、精简版提示词的 `run_in_background` 段与"不要反复轮询"措辞）、NotebookEdit、WebFetch、Skill 的工具定义变化 | 官方客户端的工具；我们只在"高"等级注入 Bash/NotebookEdit 时带出 | 官方变化，按原生原样 |
| 计费头可在 `cc_project` 之后追加 `cc_prev_msg=<msg_…>`、`cc_prev_prompt_index`、`cc_prev_turn_index`：只在本会话刚做过上下文压缩之后、主线程、一方路线时，指回压缩前最后一次主请求的应答 | 原生头构建器 `Dns`；主查询以 `responseBeforeCompaction:Hi?Zbs():void 0` 传入 | 我们写的头不带：build 一次只跑一次查询，进程里不会压缩；direct 不传 `responseBeforeCompaction`。客户端自带的头原样透传（`content-policy.js` 按通用 `key=value` 解析，不认识的字段保留）。与"非 CC 请求的会话记忆不跨压缩"一致，不做 Worker 侧记忆 |
| 计费头 `cc_version=2.1.316.<指纹>`、UA `claude-cli/2.1.316` | 原生计费头、UA | 官方必要变化 |
| 正文 `model` 的覆盖解析重构（`zT`/`MG`/`jw`，`modelOverrides` 按小写 id 查） | 构建器 | 没有覆盖策略时结果相同；账号容器不写这些设置。离线回归时核对 `model` 字段 |

`cch`：仍按用户决定保持 `00000` 占位、不处理。

另外两项是 v42 编译后离线验证（`artifacts/claude-2.1.316/verify/RESULTS.md`）才发现的：

| 变化 / 差异 | 出现在哪 | 结论 |
|---|---|---|
| 原生默认提示词 "Communicating with the user" 段（readable 变体）删掉了一句 `Write code that reads like the surrounding code: match its comment density, naming, and idiom.`：2.1.312 还原源码里它在 `chunk-7dmym6x9.js` 的 `drr()`，2.1.316 整棵还原树（2648 个 JS）里都没有，对应位置（`chunk-e6aww6q8.js`）前后文字不变 | 非 CC 请求在"高"注入等级用原生默认提示词时（离线回归 `plain-build-high`、`plain-tools-high` 的 `system[3]`、`apikey-account-noncc-high` 的 `system[2]`）；官方 2.1.316 客户端自己的提示词里也没有 | **官方变化**，按原生原样。D1/D2 剩下的 3 个场景差异全是它（v42 与 v43 相同） |
| **`X-Stainless-Runtime-Version`：官方 2.1.312 与 2.1.316 发 `v26.12.1`，我们的 CLI（v38–v42）发 `v26.3.0`** | 每个模型请求的请求头（SDK `chunk-3wydcdvj.js` `ne()`：`"X-Stainless-Runtime-Version":globalThis.process.version`） | **早已存在、不是 2.1.316 引入**：值是 Bun 报告的 Node.js 兼容版本。官方 ELF 内嵌 Anthropic 自己的 Bun 1.4.4 修订（2.1.312 `0ae49f8b6`、2.1.316 `71c9bf0ca`，公开 oven-sh/bun 里没有，GitHub API "No commit found"），我们用公开的 `oven/bun:1.4.4`（`38afee6c8`）编译。官方 2.1.304/2.1.310 的 Bun 也报告 `v26.3.0`（修订 `de4bc695b`/`2c2ae6246`），所以差异从 2.1.312 / v38 上线起就存在。TLS 指纹不受影响。用户决定发布前修：v43 起 CLI 报告官方的值（第 5 节） |

运行时探针（ovh 一次性 `--network none` 容器，`artifacts/claude-2.1.316/runtime/`）：官方 ELF 的 `BUN_BE_BUN=1` 不生效（直接进 CC 的 CLI），改用 Bun 的 `BUN_OPTIONS=--preload=<探针>`（编译出的可执行文件也认，在入口之前执行），读 `process.version`、`process.versions`（全部键）、`process.release`、`process.features`、`process.config`、`Bun.version`/`Bun.revision`/`Bun.main`、`navigator.*`、`os.*`、`process.execArgv`/`argv`。官方 2.1.316 与 v42（入口执行前）不同的只有：

| 值 | 官方 2.1.316 | v42（`oven/bun:1.4.4`） | 有没有会出网的读取者（2.1.316 还原源码） |
|---|---|---|---|
| `process.version` / `process.versions.node` | `v26.12.1` / `26.12.1` | `v26.3.0` / `26.3.0` | **有**：Stainless 请求头 `ne()`（每个 Messages 请求）；Vertex 路线的 `x-goog-api-client: gl-node/<版本>`（`chunk-na3pph4p.js`，Worker 不走 Vertex）；遥测：第一方事件 `env.node_version`（`chunk-jhrww53q.js` → `chunk-aepeg2w5.js`）、Datadog 错误 `node_version`（`chunk-crrjgh95.js` `K`）、OTel 资源 `process.runtime.version`（`chunk-bwbq4xvm.js`），三者在 Worker 里被 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`、`DISABLE_ERROR_REPORTING`、`CLAUDE_CODE_ENABLE_TELEMETRY=0` 挡住、不可达。v43 统一改成官方值 |
| `process.release.headersUrl` | `…/v26.12.1/node-v26.12.1-headers.tar.gz` | `…/v26.3.0/…` | 无（源码里没有 `headersUrl` 读取者） |
| `Bun.revision`、`versions.{usockets,uwebsockets,webkit,mimalloc,ares,v8,icu,unicode}`、`versions.libarchive`（只我们有）、`versions.sandbox_runtime*`（只官方有） | 官方修订 | 公开修订 | 无（源码不读这些键；Datadog 的 `bun_version` 是常量 `"1.4.4"`） |
| `process.execArgv` | 多一个 `--zero-fill-buffers`（官方编译时加的） | 无 | 无出网读取者（`--inspect` 检测、OTel `process.command_args` 不可达）；只影响 `Buffer.allocUnsafe` 是否清零，不改出口 |
| `Bun.main` / `process.argv[1]` | `/$bunfs/root/cli` | `/$bunfs/root/claude-linux-v42`（编译输出文件名） | 无出网读取者：都在 bunfs 里（`Bun.main` 判断结果相同），`argv[1]` 只用于本地子进程与安装方式判断（standalone 时多数直接用 `execPath`） |
| `navigator.userAgent`、`Bun.version`、`process.platform/arch`、`os.*`、`process.features` | 相同 | 相同 | — |

`X-Stainless-OS`/`Arch`/`Runtime`/`Package-Version`（`0.128.0`）、UA（`claude-cli/<VERSION> (external, <entrypoint>)` 与 `claude-code/<VERSION>`，都不含运行时版本）、计费头（`cc_version` 只用 `VERSION` 与指纹）、环境段（平台、Shell、OS 版本，不含 Node.js 版本）、`metadata.user_id` 都与 Node.js 版本无关，官方与我们相同。

改了 `process.version` 之后其余读取者的行为（结论：都不变）：`chunk-1ny7cxrt.js` 的 crypto 能力判断（主版本 ≥12.8、≥16.9/17）、`chunk-mrx6y2r5.js` 的 `semver.satisfies(process.version, ">=15.7.0" / "^6.12.0 || >=8.0.0")`、`chunk-fhdzwff4.js` 的 setup 检查（主版本 ≥22）、`chunk-bmbhxpfm.js`（graceful-fs 的 v0.x 判断）、AWS SDK 的 `emitWarningIfUnsupportedVersion`（只在本地警告），26.3.0 与 26.12.1 落在同一分支；`chunk-6qssfmzs.js` 的快捷键判断在 Bun 下读的是常量 `"1.4.4"`，且只在 Windows；`chunk-0ffn6ajs.js`（堆诊断文件）、MCP HTTP 传输的调试日志只写本地。

## 5. 新增功能（v43）

v42 只做版本迁移；v42 编译验证后、发布前（2026-11-02）加了两项，标签升为 `ccgateway-v43-cc-2-1-316`（v42 没有发布）。

### 5.1 报告官方的运行时版本

做法按 Bun 版本硬性规则（[CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md)“硬性规则”）：官方的值是官方 ELF 的属性，自动读出、从不手填、每一步核对。

- 还原：`tools/upgrade/elf-facts.cjs` 从官方 ELF 读 Bun 写进去的 Node.js 版本（npm 用户代理串 `bun/1.4.4 npm/? node/v26.12.1 linux x64` 与 `process.release.headersUrl` 两处，必须一致），`restore-bun.cjs` 写进 `reconstruction.json` 的 `runtimeVersion`。四个还原树都按新还原器重写了 `reconstruction.json`（其余字段与模块哈希逐字不变，只多这一项；旧文件留在 `artifacts/claude-<版本>/reconstruction.before-runtime.json`）：2.1.316/2.1.312 `v26.12.1`，2.1.310/2.1.304 `v26.3.0`。
- profile：四个 profile 都加 `runtimeVersion`；`modules` 加 hooks worker 入口（`src/plugins/functionHooks/hooks-worker/hooks-worker.js`）的哈希，因为它是第二个编译入口、要被改写。
- 补丁器：profile 与 `reconstruction.json` 的 `runtimeVersion` 必须相等；两个编译入口（`cli.js` 与 hooks worker，hooks worker 在自己的线程里、有自己的 `process`）的第一条语句是 `import "./ccgateway-runtime-version.js"`，ESM 先执行它，后面的模块（包括计算并缓存 Stainless 平台头的 SDK）读到的都是官方值；`request`、`ccgateway-mgmt`、普通 CLI 三种用法都走这个入口。模块（`runtime-version.js`）只用 `Object.defineProperty` 改 `process.version` 与 `process.versions.node`，保持各自的属性特性，属性不可改时启动失败而不是悄悄留下编译器的值。`ccgateway-patch.json` 记下 `runtimeVersion`。
- 打包与镜像：`package-release.cjs` 要求补丁清单与 profile 的 `runtimeVersion` 一致，并用 `runtime-check.cjs` 运行编好的 CLI（`BUN_OPTIONS=--preload` 的探针在进程退出时读值，这时入口已执行），不等于 profile 值就拒绝打包；Worker 镜像构建跑同一个检查。用 v42 的 ELF 试过：`The CLI reports Node.js v26.3.0 (versions.node 26.3.0), not the official v26.12.1`。
- 测试：`test/runtime-version.test.mjs`（ELF 读取的单测；每个 profile 等于官方值；模块只改两个值、特性不变、不可改时失败；打包检查对一个替身 CLI 放行正确值、拒绝错误值（只在 Linux x64 上跑，本机 Windows 跳过这一条）；各关卡都在）；`test/runtime-native.mjs` 被四版 `patch-wire-preservation` 调用：两个入口的第一条语句、hooks worker 只多这一句、模块执行后的值等于还原树记录的官方值。

### 5.2 首轮工具注入：官方首轮带定义的全部工具（能力 `build_injection_tools_v2`）

用户要求（2026-11-02）："高"等级能注入官方 2.1.316 首轮带完整定义的全部工具（`Bash`、`Read`、`Edit`、`Write`、`Agent`、`Skill`、`ToolSearch`、`ListAgents`、`ReportFindings`、`ScheduleWakeup`、`Workflow`；`WebSearch`/`NotebookEdit` 照旧）；"工具注入不代表我们需要实现 只是带上定义而已"。核心与控制台（合同 `InjectionTools`/`DefaultInjectionTools`）由另一位负责；CLI 侧：

- v42 实测（Worker 环境：`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`、遥测关、GrowthBook 缺省、没有 skills/agents 目录）：13 个名字都在原生工具池 `qNt` 里，CLI 都认；但与官方抓包（`test/fixtures/official-request-2.1.316.json`）比，`Agent`、`ListAgents` 的定义不同，`ToolSearch`/`DeferredToolPlaceholder` 根本不发。原因都是渲染时的上下文：v42 只拿选中的工具渲染，并把 `agents: []`、`allowedAgentTypes: []` 传给构建器——`Agent` 的描述按"有没有 general-purpose agent、能不能 fork"写（空 agent 列表 → "subagent_type is required: the general-purpose agent is not available"），`ListAgents` 按工具里有没有 `SendMessage` 写，原生构建器只有在有被延迟的工具时才发 `ToolSearch` 并配上 `DeferredToolPlaceholder`。
- v43：探针运行（`request-build.js` `injectLayers`）用 CC 的整个工具池与 CC 的内置 agent（新原生绑定 `ccgatewayBuiltInAgents` → 各版核心的内置 agent 列表函数：2.1.316 `lKe`、2.1.312 `LGe`、2.1.310 `Tje`、2.1.304 `eUe`；没有 agent 文件和插件时 CC 的 agent 加载器给的就是它），`allowedAgentTypes` 不限，与官方首轮相同；只取选中的名字和 CC 为它们加的、池外的名字（`ToolSearch` 配的 `DeferredToolPlaceholder`），客户端同名工具仍是客户端的。没有选 `ToolSearch` 时把它从渲染池拿掉，原生就不延迟任何工具，选中的工具（包括 `WebSearch`、`NotebookEdit`）整段发出，与 v42 相同；选了 `ToolSearch` 时 CC 延迟的工具（`WebSearch`、`NotebookEdit`、`SendMessage`、`Cron*` 等）留给 ToolSearch、不发，与官方首轮相同。延迟工具清单的 reminder、agent 类型清单、skill 清单这些会话状态不加（用户决定）。系统提示词仍按选中的工具生成（不变）。
- 是否随 `ToolSearch` 一起加 `DeferredToolPlaceholder`：跟原生走——原生在发 `ToolSearch` 时总是配它（官方抓包也是），所以加；不选 `ToolSearch` 时原生两者都不发。
- 结果（编好的 v43，`test/injection-tools-probe.cjs`，ovh 离线容器）：选官方首轮的 11 个名字（另加或不加 `WebSearch`/`NotebookEdit`）时，发出的工具与官方抓包同名、同序（`Agent,Bash,Edit,ListAgents,Read,ReportFindings,ScheduleWakeup,Skill,ToolSearch,Workflow,DeferredToolPlaceholder,Write`），10 个定义与 placeholder 逐字相同；`Bash` 只差后台超时的缺省值（描述里 `default 1800000ms / 30 minutes` 对官方 `600000ms / 10 minutes`，`run_in_background` 参数说明同理）。这一项取决于会话怎样启动：CC 在单次 `-p` 打印会话里取 600000（官方抓包就是 `-p`），其他会话（交互式 CC、我们的 request 命令）取 GrowthBook 缺省 1800000（`chunk-fym4r1th.js` `Znr`），保留原生值。v42 同样的探针：`Agent`、`ListAgents` 不同，`ToolSearch`/placeholder 缺失。`Bash,Read,Edit,Write`（现在的"高"缺省）与 `Bash,WebSearch,NotebookEdit` 的输出与 v42 逐字相同。
- 系统提示词与官方的差别（不在本次范围，记录）：按 11 个工具生成的提示词与官方抓包只差两行——记忆目录路径（HOME 不同）与官方多一句 `Use TaskCreate to plan and track work…`。后者是因为官方工具集里有 `TaskCreate`（延迟工具，`Wue()`：主循环模型 `V3t()` 在 `ZCr`（较早的模型，含 claude-sonnet-4-6）里或没有设时开启），而我们按选中的工具生成提示词；我们的工具池里也没有 `TaskCreate/TaskGet/TaskList/TaskUpdate`（request 命令下 `Wue()` 为假，没有继续追查是哪个条件；只影响延迟清单，不影响发出的定义）。
- 兼容：旧账号继续用 2.1.312 / v41，它不认这 6 个新名字（`Claude Code tool Skill is not available`）。所以 v43 声明新能力 `build_injection_tools_v2`（只加在 2.1.316 的 profile 上），核心按它挑 CLI。Worker 侧要在 `engine/cli_pinned.go` `requestCapabilities()` 的列表里加这个能力，并在 `engine/request_command.go` `requestCapabilityGates` 加一道关（build 且注入了这 6 个名字之一时要求它）——属于 engine/合同，已交给负责人，本次没改。
- 测试：`test/request-injection.test.mjs` 新增"整个池渲染、只取选中的与配对的"用例（含不选 ToolSearch 时整段发出、未知名字拒绝）；`test/native/2.1.316/injected-tools.test.mjs` 用 `test/fixtures/injected-tools-2.1.316.json`（v43 的探针录制，带 ELF SHA 与补丁标签）对照官方抓包，唯一允许的差别是上面的 Bash 两处，补丁标签变了就要求重新录制。

## 6. 编译与打包

都在 ovh 一次性容器里：本机补丁 → tar 传过去 → `oven/bun:1.4.4`（`--network none`）里跑去 CR 的 `build.sh`（两个入口，`--compile --bytecode --format=esm`）→ `node:22-bookworm-slim` 里从完整的 cli-mods 副本跑 `package-release.cjs`。

| 项 | v42（未发布） | v43 | v44（候选） |
|---|---|---|---|
| 补丁树 | `artifacts/claude-2.1.316/patched-v42`：改写 7 个模块、34 个支持文件 | `artifacts/claude-2.1.316/patched-v43`：改写 8 个模块（多 hooks worker 入口）、35 个支持文件（多 `ccgateway-runtime-version.js`）；`ccgateway-patch.json` 带 `runtimeVersion: "v26.12.1"` | `artifacts/claude-2.1.316/patched-v44`：与 `patched-v43` 只差 `ccgateway-request-error.js`、`cli.js`（`--ccgateway-info` 里的补丁标签）与 `ccgateway-patch.json`（日志 `build/patch-v44.log`） |
| 打包模块数 | 2905 | 2906 | 2906 |
| 定制 ELF SHA-256 | `3a1ca8822259d45007b2849da61f7dc262630227dc01eff19d8fcf79d8bc78a4`（325179568 字节） | `f8f9afa447be6ef132f87c6af7d1880fc822e68f4cf9249f2143a59fdfa163a0`（325183664 字节），ELF 里 `Bun v1.4.4 (38afee6c8)` | `76b11ddd052bd92506a10cc6ddcb7b81da12ddc5f19aee91c048a9739172f99b`（325183664 字节），`Bun v1.4.4 (38afee6c8)` |
| `package-release.cjs` 的运行时检查 | （当时没有；事后对 v42 跑 `runtime-check.cjs`：拒绝，`reports Node.js v26.3.0`） | 通过：`{"version":"v26.12.1","node":"26.12.1","versionLine":"2.1.316 (Claude Code)"}` | 通过，值相同 |
| `--ccgateway-info` | `{"version":"2.1.316","patch":"ccgateway-v42-cc-2-1-316", capabilities: 20 项}` | `{"version":"2.1.316","patch":"ccgateway-v43-cc-2-1-316", capabilities: 21 项}`（v42 的 20 项加 `build_injection_tools_v2`） | `{"version":"2.1.316","patch":"ccgateway-v44-stored-login", capabilities: 21 项}`（与 v43 相同，含 `build_injection_tools_v2`） |
| `--version` | `2.1.316 (Claude Code)` | 同 | 同 |
| release | `artifacts/claude-2.1.316/release-v42/` | `artifacts/claude-2.1.316/release-v43/`（`manifest.json`：`2.1.316` → `2.1.316/claude`，补丁 `ccgateway-v43-cc-2-1-316`，modes `build`/`direct`；ovh 上保留 `/tmp/ccg316-rt/build/release-v43`）；日志 `artifacts/claude-2.1.316/build/build-v43.log`，脚本 `verify/scripts-v43/ovh-build-v43.sh` | `artifacts/claude-2.1.316/release-v44/`（补丁 `ccgateway-v44-stored-login`，modes `build`/`direct`）；ovh 上 `~/sup2api/checks/cli-releases/release-v44-2.1.316`（v43 的目录未动）；日志 `build/build-v44.log`，脚本 `verify/scripts-v44/ovh-build-v44.sh`（与 v43 的相同，只换目录与标签） |

v45 的编译与打包见第 11.4 节（做法与 v44 相同，脚本 `verify/scripts-v45/`）。

2.1.312/2.1.310/2.1.304 的补丁产物也变了（入口导入、注入工具渲染），标签升为 v44/v45/v46，补丁成功，但都不编译、不发布；线上旧账号继续用 v41。v44 改了共用的 `request-error.js`，三者再升为 `ccgateway-v47-stored-login`/`v48-stored-login`/`v49-stored-login`，同样不编译、不发布。

## 7. 验证

v42 由独立验证者在 ovh 一次性容器里按 2.1.312 迁移记录的矩阵跑完（`artifacts/claude-2.1.316/verify/RESULTS.md`）；v43 的改动可能影响的部分在同样的容器里复验（`verify/RESULTS-v43.md`，脚本 `verify/scripts-v43/`）；v44 同样（ovh `/tmp/ccg316-v44`，用完已删；脚本 `verify/scripts-v44/`，日志 `verify/v44/`、`verify/npm-v44-local/`，Worker 是 `ccgateway-app:0.1.122` 自带的 `14e165ed…33dd`）。Worker 一律是 `ccgateway-app:0.1.121` 自带的（`40111c23…78e0`，两次都没有改 engine）。

| 层 | 内容 | v42 | v43 | v44（候选） |
|---|---|---|---|---|
| 单测 + 原生对账 | `CCG_CLI_VERSION=<v> CCG_REQUIRE_ARTIFACTS=1 npm test` | Linux（`node:22-bookworm-slim`，`--network none`）2.1.316 与 2.1.312 各 32 个文件 212/212；本机 Windows 四版 212/212 | Linux 四版：2.1.316 34 个文件 **226/226**，2.1.312/2.1.310/2.1.304 各 33 个文件 **222/222**；本机 Windows 四版 225/226、221/222（各 1 条只在 Linux 上跑的用例跳过）；0 失败，无 `CCG_NATIVE_TEST_SKIPPED` | Linux（ovh `node:22-bookworm-slim`，`--network none`）四版：2.1.316 35 个文件 **228/228**，2.1.312/2.1.310/2.1.304 各 33 个文件 **223/223**；本机 Windows 227/228、222/223（各 1 条只在 Linux 上跑的用例跳过）；0 失败，无 `CCG_NATIVE_TEST_SKIPPED`（多出的用例：`request-error` 的 stored-login 用例、`native/2.1.316/stored-login.test.mjs`） |
| 补丁器 | `patch-cli.cjs`、`anchor-hazards` | 27 处替换、无 hazard；重新补丁与 `patched-v42` 逐文件相同 | 同（27/27）；`patched-v43` 与 v42 只差第 6 节列的文件；2.1.312/2.1.310/2.1.304 也补丁成功 | 27/27、无 hazard；`patched-v44` 与 `patched-v43` 只差 `ccgateway-request-error.js`、`cli.js` 的补丁标签、`ccgateway-patch.json` |
| 运行时版本 | 编好的 CLI 报告的 `process.version`（`runtime-check.cjs`） | `v26.3.0`（被新检查拒绝） | **`v26.12.1`**，打包时通过 | **`v26.12.1`**，打包时通过 |
| 请求头 | `tls-fingerprint.sh` 记录的请求头，对官方 2.1.316 | `x-stainless-runtime-version` `v26.3.0`（其余相同） | **`x-stainless-*` 逐项相同**（`runtime-version v26.12.1`），头名与顺序相同（只少请求本身不带的 prompt-id / beta） | **PASS**：`x-stainless-*` 与官方 2.1.316 逐项相同，头名与顺序与 v43 相同 |
| TLS 指纹 | 同一次运行 | 38 条连接 identical（JA4 `t13d1713h1_5b57614c22b0_7f527383e249`、JA3 `1523504b38f0fae0d881d4b6554aac1b`、ALPN 只 `http/1.1`） | 38 条连接，**identical**，值相同 | 22 条连接（官方 2.1.316、v43、v44 的 direct/build 各两次），Messages 连接 **identical**（JA4 `t13d1713h1_5b57614c22b0_7f527383e249`、JA3 `1523504b38f0fae0d881d4b6554aac1b`、ALPN `http/1.1`） |
| 组装对账（L4） | `assembly-cases-2.1.316.json` | 76/76，上游 64，`acceptance: pass` | **76/76**，上游 64，`acceptance: pass` | **76/76**，上游 64，`acceptance: pass` |
| 客户端来源 × 内容策略 | 14 项 | 14/14 | **14/14** | **14/14** |
| 官方客户端实时转发 / 抓包回放（L6） | 官方 2.1.316 | 10/10；`verified` | **10/10**；**`verified`** | **10/10**；**`verified`** |
| 组件组合（L5） | 216 项 | 216/216 | **216/216** | **216/216** |
| Worker 策略矩阵（L7） | `config-matrix-policies-2.1.316.json` | `passed`，上游 98 | **`passed`**，上游 98 | **`passed`**，上游 98 |
| 首轮工具注入 | `test/injection-tools-probe.cjs` 对官方抓包 | 失败：`Agent`、`ListAgents` 不同，`ToolSearch`/placeholder 缺失 | **通过**：11 个工具与 placeholder 同名同序，定义逐字相同，只差 Bash 后台超时缺省值（第 5.2 节） | **通过**（3/3），工具与 v43 的录制逐字相同；夹具按 v44 重新录制 |
| 离线回归：噪声 | v41 + 官方 2.1.312 客户端两次 | 0 of 73，149 个请求 | **0 of 73**，149 个请求 | 基线 v43（`ccgateway-app:0.1.122` 自带）+ 官方 2.1.316 客户端两次：**0 of 73**，149 个请求 |
| 离线回归 D1 | 官方 2.1.312 客户端，v41 对候选 | 3 of 73（规则：两条版本替换） | **3 of 73**（规则另加 `v26.12.1`→`v26.3.0`，隐藏 149 次，正好每个上游请求一次），同样 3 个"高"等级场景、同一处官方提示词变化 | 官方 2.1.316 客户端，v43 对 v44（`NEW=1`），**不用规则**：**0 of 73**，149 个请求（出口无差异） |
| 离线回归 D2 | 官方 2.1.316 客户端经候选，`crossversion` | `gatewayOnly` 只有那处官方变化（+ `login-account` 归因假象） | 与 v42 相同 | 不需要（D1 已用官方 2.1.316 客户端） |
| 客户端对网关 A/B | `compare.cjs` | `x-stainless-runtime-version` A/B 差异 67 处（与 v41 基线相同） | **0 处** | `compare.cjs` 报告 v43 与 v44 都是 1374 行，逐行差异 1308 与 v43 两次运行之间的噪声相同（每次运行的随机值） |
| 定向断言 | `verify.cjs` | 四次运行 1662/1662 | 四次运行 **1662/1662** | 三次运行 **1662/1662** |
| 其他 | values、beta-check、capcheck、respmatch、classify、conc | values 12/12；beta 只有已知 1 条；capcheck 149/149、0 缺失；respmatch 135/135 | 相同 | 三次运行：values 12/12；beta 只有已知 1 条；capcheck 149/149、`missing 0`、`bodyMismatch 0`、`secretsLeaked false`；respmatch 135/135；classify/conc 完成；`all` 61 次退出 0、1 次非 0（`login` 场景，基线相同） |
| Go（Linux） | engine、worker、contracts，`GOOS=linux go vet` | engine 顶层 249 过（16 跳过，需真实 CLI）；worker 23 过；contracts 59 过；vet 通过 | 没有改 Go，未重跑 | 没有改 Go，未重跑 |
| 真实 CLI 用例 | `CCG_REAL_CLI` = 官方 2.1.316 / 2.1.312 | 两版集合相同：6 过 5 败（已知） | 未重跑（与 CLI 补丁无关） | 未重跑 |
| 断网资源回归 | `TestResourceManagementLinuxOfflineNetNone` | 两版集合相同（24 败，已知：官方 CLI 没有 `ccgateway-mgmt`） | 未重跑 | 未重跑 |
| 控制器 | controller-go、guard | 389 过、85 过（Python 控制器已删） | 未重跑 | 未重跑 |

v45 的验证（同样的矩阵，另加三方形状场景）见第 11.4 节。

没有跑或没有覆盖：经 Worker 的"高"等级全部工具注入（0.1.121 的合同还不认 6 个新名字，只在 CLI 层验证；合同与能力关由负责 engine/合同的一方改）、D0 重抓、`controller-go/integration/l7`、压缩后 `cc_prev_*` 的透传、核心↔插件与真实上游（发布后用生产账号测）。

## 8. 版本常量

插件内已改：`companions/worker/Dockerfile` 的 `ARG CLAUDE_VERSION=2.1.316`、`companions/worker/README.md` 的缺省值说明；`cli-mods/README.md` 的现行版本与版本记录（ELF 哈希与插件版本标 TBD）。控制器的 `CCG_DEFAULT_CLI_VERSION` 已于 2026-11-02 删除（`cli-from-image-v1`），没有对应常量要改。

插件内仍写着 2.1.312、本次没有改的：

| 位置 | 性质 |
|---|---|
| `companions/controller-go/integration/l7/itlib.py` `CLI_VERSION = '2.1.312'`，`scenarios_x.py` 的 `cli_version`，`scenarios_mem.py` 注释 | L7 集成测试针对线上镜像的版本，跑 L7 时随新镜像改 |
| `companions/controller-go/internal/**/_test.go`、`companions/engine/*_test.go` 里的 `2.1.312` | 测试数据里的示例版本号，与当前版本无关 |
| `companions/contracts/testdata/web-policy-payloads.json` 的 `cli_version` | 前端测试生成的契约夹具，随核心/前端默认值一起重生成 |
| `docs/` 里的历史记录、`cli-mods/test/replay-helpers.cjs` 里的 `versionAtLeast(version, '2.1.312')` | 历史或"自某版本起"的规则，不改 |
| `companions/README.md`、插件 `README.md`、`docs/CLI-TEST-PLAN.md` 的"当前版本"行 | 本来就停在 2.1.310，属于文档陈旧，留给发布时一起更新 |

插件外需要合并时改（本次未动，只给 `cli-from-image-v1` 之前的旧控制器用）：

| 文件 | 现值 | 改为 |
|---|---|---|
| `next/server/internal/ccgateway/cli_version.go` `PinnedCLIVersion` | `2.1.312` | `2.1.316` |
| `next/web/src/views/ccgateway/requestPolicy.ts` 默认 `cli_version` | `2.1.312` | `2.1.316` |

## 9. 手册、工具与要求里不对的地方

| 位置 | 问题 | 处理 |
|---|---|---|
| RUNBOOK §3.4（锚点替换） | 旧名在新版里仍然存在但含义不同时，"旧名不再残留"的检查与补丁器的唯一性检查都可能悄悄通过：本次有 `Q`（查询参数 → 新核心的导入）、`Kmn`（消息规整 → 沙箱说明，旧锚点文本恰好命中一次）、`Ud`（提供方路由 → 一方 URL 判定）。`anchor-hazards` 的"替换文本逐字出现"也证明不了打在哪个函数里 | 派生脚本按标识符边界查残留，并对产物断言补丁打在正确的函数、同名的无关函数保持原生（测试里固定）。建议手册"常见坑"补一条 |
| RUNBOOK §3.4（官方新增逻辑） | 只看 equiv 的 changed 与锚点能否命中，看不出官方在被改写函数里新加的、绕过我们跳过逻辑的调用（本次 `MN` 末尾的重读/重建）；它在 API-key-only 路线上破坏"跳过同一组调用"的不变式 | 审查 changed 的被改写函数时，逐条看新增语句是否落在我们跳过的路径上；本次加第 6 条锚点 |
| 任务要求"`nativeBillingExtras` 加三个新字段（如需要）" | 官方首轮抓包不带它们，测试不需要；加了会放宽对我们自己写的头的检查 | 不加，理由见第 3 节 |
| RUNBOOK“硬性规则”（Bun 修订号） | 原写“官方修订号与 Docker 镜像修订号不同不影响：只核对版本号，TLS 指纹已实测一致”。TLS 一致不代表运行时信息一致：同为 1.4.4，私有修订报告的 Node.js 版本不同，上游看得到 `X-Stainless-Runtime-Version`（v38 起就存在，到 2.1.316 的离线验证才发现）；2.1.312 迁移只比了 TLS，没比请求头的值 | 规则扩到 `runtimeVersion`（还原器读出、profile 记录、补丁器装上、打包与镜像运行核对、测试检查，第 5.1 节）；手册“硬性规则”与“常见坑”已补；`tls-fingerprint.sh` 的请求头记录要逐项比 `x-stainless-*` |

## 10. v44：CC 不肯用已存的登录时回 401/403（`ccgateway-v44-stored-login`）

2026-11-02，v43 上线（插件 0.1.122，新账号）之后。来源：`artifacts/claude-2.1.316/eval/transport.md` 第 1 节。

- 官方 2.1.316 新增 `StoredLoginHeldBackError`（`chunk-7c9mpntp.js` 的 `nU`，基类是 `chunk-2g090z7k.js` 的 `TelemetrySafeError` `C`，构造参数依次是 message、telemetryMessage、`errorClass`）：message 取原因对应的原文，telemetryMessage 是 `Stored login held back`，`errorClass` 是 `stored_login_refused_<原因>`，`name` 是 `StoredLoginHeldBackError`，**没有 `.code`**。客户端工厂 `MN` 在 OAuth 订阅、远程受管设置尚未加载并且 `jie()` 判定要扣下登录时抛出（`throw new nU(uwe())`）。三种原因与原文：`admin`（组织设置要管理员修 API key helper 配置）、`settings_unloaded`（组织设置没加载到，检查网络后重启）、`restart_needed`（重启以完成登录）。
- v43 之前它被 `localErrorFrame` 当成 502 `cli_transport_error`：核心换号重试、插件只冷却 10 秒、账号永远不会被禁用（与 0.1.116 之前的 `OAuthRefreshDeadError` 同样的问题），也违反“认证/登录失效一律 401、消息原样”。
- v44（只改支持模块 `request-error.js`）：`loginFailure` 在错误及其 cause 链里按类名 `StoredLoginHeldBackError`（类名是字面量，压缩后仍在）找到它，从实例的 `errorClass` 读原因：

| `errorClass` | 状态 | type / code | 理由 |
|---|---|---|---|
| `stored_login_refused_admin` | 403 | `permission_error` / `stored_login_refused_admin` | 组织的策略不让用这个登录，和 `OAuthAccountOnHoldError` 同类，每个请求都一样 |
| `stored_login_refused_restart_needed` | 401 | `authentication_error` / `stored_login_refused_restart_needed` | 登录没完成；每个请求都起新进程，“重启”没用，要重新授权 |
| `stored_login_refused_settings_unloaded` | 502（source 仍是 transport） | `api_error` / `stored_login_refused_settings_unloaded` | 暂时性的（“检查网络”），换号重试是对的；code 只为让日志能搜到 |

  message 一律是 CC 原文。未知原因、或别的类带同样的 `errorClass`，照旧走 transport 映射。401/403 在 build/input 阶段与其他登录错误一样记 `source: input`，502 在任何阶段都是 transport（可重试）。
- 核心侧（不在 cli-mods，另行处理）：要让这两个 401/403 真正禁用账号，默认失败规则 `login-invalid` 加关键词 `stored_login_refused_restart_needed`、`account-on-hold` 加 `stored_login_refused_admin`（`server/internal/gateway/failure_policy.go` 与一条幂等迁移）；不加的话核心把插件的 DISABLE 降为冷却，但客户端看到的状态已经对了。
- 测试：`test/request-error.test.mjs`（官方形状的构造错误：三种原因 × 四个阶段、cause 链、未知原因与别的类不受影响）；`test/native/2.1.316/stored-login.test.mjs`（在 vm 里从还原源码取 `C`、`o`、`nU` 实例化真正的错误，核对 name/errorClass/telemetryMessage、无 `.code`、原因集合等于 CC 的 `o`，再核对映射）。
- 标签：2.1.316 `ccgateway-v43-cc-2-1-316` → `ccgateway-v44-stored-login`；共用支持模块变了，三个旧 profile 也升：2.1.312 → `ccgateway-v47-stored-login`、2.1.310 → `ccgateway-v48-stored-login`、2.1.304 → `ccgateway-v49-stored-login`（v44–v46 已被 `runtime-version` 占用），不编译、不发布。`test/fixtures/injected-tools-2.1.316.json` 按 v44 重新录制（工具与 v43 逐字相同）。
- 编译与验证见第 6、7 节的 v44 列：ELF `76b11ddd052bd92506a10cc6ddcb7b81da12ddc5f19aee91c048a9739172f99b`；出口与 v43 完全相同（离线回归 D1 0 of 73，TLS 指纹与请求头与官方 2.1.316 相同）。release 在 `artifacts/claude-2.1.316/release-v44/` 与 ovh `~/sup2api/checks/cli-releases/release-v44-2.1.316`。

## 11. v45：三方形状转一方形状（`ccgateway-v45-first-party-shape`）

2026-11-03 用户决定：官方 CC 客户端经自定义 `ANTHROPIC_BASE_URL` 接入（线上用户都这样接）时发的是三方形状——短计费头（只有 `cc_version`、`cc_entrypoint`，可能有 `cc_workload`/`cc_is_subagent`）、三块 system（头、身份行、整段提示词，后两块各一个缓存标记）、没有 CC 的请求头（request-class、prompt-id 等）、没有 `diagnostics`；直连 `api.anthropic.com` 时发一方形状。网关把前者转成后者。规则全文与逐项做法在 [CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION](CLAUDE-CODE-BILLING-AND-PROMPT-INJECTION.md) §0、§2.4、§5，这里记 CLI/Worker 的实现、原生依据与验证。

### 11.1 开关

| 层 | 做法 |
|---|---|
| 合同（另一位负责，本次未改） | 能力 `features.FirstPartyShapeCapability = "build_first_party_shape_v1"`；`WorkerPolicy.FirstPartyShape *bool`（json `first_party_shape`），`FirstPartyShapeEnabled()`：nil 或 true 为开。核心只对声明了能力的 Worker 写显式值；跳过预检的路径根本不发这个字段，所以 Worker 把"没有"当开。核心从不因此拒绝请求 |
| CLI | 只在 2.1.316 的 profile 声明这个能力（`--ccgateway-info` 22 项）；2.1.312/310/304 的 profile 加了同样的支持模块与原生绑定，但不声明，Worker 不会让它们转换 |
| Worker | `engine/request_command.go`：`parseRequestPolicy` 记下 `FirstPartyShapeEnabled()`；`admitRequest` 在 build、不是控制台测试（probe）、CLI 声明了能力时才开；开时给 CLI 进程加环境变量 `CCG_FIRST_PARTY_SHAPE=1`（不放进 CLI 的请求信封，合同里没有它）；`cli_pinned.go` 的 `requestCapabilities` 报告这个能力 |
| 回退 | 任何一步对不上都不转（整条），请求照常发；从不因为这个功能拒绝请求 |

### 11.2 三类改动

| 类 | 项 | 实现 | 原生依据 |
|---|---|---|---|
| ① 不管开关 | 子代理不发 `x-claude-code-agent-type: custom` | `request-agent.js`：客户端给了类型用它的；否则父线程那次 Agent 调用的 `subagent_type` 是 CC 内置类型（新原生绑定 `ccgatewayBuiltInAgents`）时用它；都没有时客户端工厂的 `source` 用 `agent:default`（原生 `LEi`/`HEi` 对它给子代理类别、不写类型头） | `MN` 客户端工厂按 `source` 算类别与类型 |
| ① | 正文键序 | `request-parameters.js nativeOrder`：顶层键按原生构造器 `g5n` 的对象字面量 `Qc`（model、messages、system、tools、tool_choice、metadata、max_tokens、thinking、temperature、context_management、safeguards、output_config、speed、thread、diagnostics），未知键保持原相对位置放在最后 | `g5n` |
| ① | beta 与正文一致 | `request-betas.js bodyBetas`：`prompt-caching-scope` 只在一方计费头（带 `cch`）或有 `scope:global` 标记时、`cache-diagnosis` 只在有 `diagnostics` 时、`extended-cache-ttl` 只在有 1h 标记时；正文用到而客户端与构造器都没发的补上；客户端自己的 beta 不动 | 构造器按 `j3()`/`t$()`/TTL 推这三个 beta（描述符：2.1.316 `chunk-bwbq4xvm.js` `cOe`/`VPt`/`l9t`，2.1.312 `chunk-afamv62a.js` `vYe`/`LAt`/`lYt`，2.1.310 `chunk-at88wjsn.js` `rqe`/`KEt`/`BKt`，2.1.304 `chunk-4qs43hr1.js` `m1t`/`H_t`/`g1t`） |
| ① | beta 放置 | `request-headers.js finalBetas` 与 `betaOrder` 的 `builderAt`：加进来的 beta 放在它前面最后一个 CC 排在它之前的 beta 后面；CC 顺序表不认识的（主查询自己 push 的 effort、thinking-token-count、advanced-tool-use、mid-conversation-*，以及客户端独有的）视为排在模型表之后、构造器 beta 之前 | 官方一方抓包：模型表 → 主查询 push → 构造器 push（第一次离线运行发现 v45 初版把 `thinking-binding-controls` 放到 effort 前、把 1h beta 放到 effort 前，按此修正后重编） |
| ② 无状态 | 计费头 | `content-policy.js thirdPartyBilling` 识别（首块整块一行，字段 ⊆ {`cc_version`, `cc_entrypoint`, `cc_workload`, `cc_is_subagent=true`}，版本 ≥ 2.1.304）；`completeBillingHeader`：原生 `Dns` 为本请求写的整行（`JXs` 截获）重渲染必须逐字往返且带 `cch`，入口、子代理标记要与客户端一致，`cc_version` 换回客户端的（Worker 拥有时除外）、`cc_workload` 取客户端的（原生行没有时插在 `cch` 之后） | `Dns` 字段顺序 |
| ② | system 3→4 | `first-party-shape.js firstPartySystem`：三块都是纯文本块、头无标记、第二块是身份行、行与提示词标记相同；静态段用新原生绑定 `ccgatewayPromptSections`（原生提示词构造器带动态边界渲染）按请求模型与工具渲染，客户端 reminder 列出的延迟工具（原生开头 `mPs`，一行一个名字）作为延迟工具桩加进工具池，先带延迟工具、再不带；提示词必须恰好以 `静态段 + "\n\n"` 开头；拆块与标记交给原生（`ccgatewayFirstPartySystem` → `ZSr`） | `s2o`/`ZSr`/`vX`，边界 `h$`（2.1.312 `Jmr`/`uN`，2.1.310 `Ekr`/`U0`，2.1.304 `Jfr`/`kL`） |
| ② | 压缩请求 | 末条用户消息以原生压缩提示词开头（`ccgatewayCompactionOpenings` = `Tsn(q9e)`、`Tsn(TB)`；2.1.312 `Htn`/`R9e`/`aB`，2.1.310 `Tcn`/`V8e`/`WH`，2.1.304 `rln`/`G8e`/`eB`）时按压缩请求构建：类别 `compaction`、头里没有 prompt/turn、主线程的 `cc_prev_req`、构造器带 `cache-diagnosis` 时带 diagnostics；客户端带了压缩头照原样透传 | 原生压缩是 fork，`t$()&&(Et||forkPointUuid)` 成立 |
| ③ 有状态 | `cc_prompt_id` / `x-claude-code-prompt-id` | 主线程没有客户端值时按（上游会话，turn 序号，prompt 哈希）派生 UUIDv4（`request-agent.js derivePromptId`）；子代理用父线程本轮的值：Worker 记住每次应答的 message id、prompt id 与 Agent/Task 调用（`engine/answer_observer.go` 解析 SSE/JSON 应答，有界），子代理线程首个请求按"唯一一个 prompt 相同的调用、父线程不忙"配对（`engine/session_state.go spawned`），之后用本线程记忆 | 官方：同一 prompt 的主线程请求与全部子代理共用 |
| ③ | `cc_prev_req`、turn | 沿用 v38 起的会话记忆（`build_session_state_v1`），转换的请求也续接 | — |
| ③ | `diagnostics` | 只在原生构造器本来会写时：线程首个请求 `{previous_message_id:null}`，Worker 证明续接上一次应答时为那次的 message id，其余不带 | `t$()&&(Et||forkPointUuid)&&JF` |

Worker 侧另修一处让记忆对 CC 客户端生效的问题：CC 每轮把缓存标记挪到最后一条消息、把只有一段文字的 content 写成字符串，原来的历史摘要因此永远对不上；现在摘要前统一成文本块数组并去掉 `cache_control`（`canonicalMessage`）。

不做（用户决定）：`mid-conversation-system-clear-at`、1 小时缓存 TTL、订阅用户才有的工具/技能、改标题请求的模型。做不到：`x-claude-code-prev-tool-durations`（网关不知道客户端执行工具的耗时）、压缩头 `x-cc-compaction-request`/`x-claude-code-compaction`（手动还是自动不可知）、压缩之后的 `cc_prev_msg` 一组。

与任务要求不同的一处：要求写"没拆块时不加 global scope 的 beta"；官方一方抓包里子代理请求（system 不拆、没有 global 块）也带 `prompt-caching-scope`（`j3()` 为真就推），所以一方计费头的请求一律保留它，与官方相同。

### 11.3 测试

- 单测：`test/first-party-shape.test.mjs`（13 项：头的识别与补全、键序、agent 类型、prompt id、主线程/第二轮/子代理/开关关闭/静态段不符/补不全的转换、`bodyBetas`、身份信封校验、压缩、延迟工具）；`test/request-options.test.mjs` 加真实三方形状 beta 的放置用例；其余测试桩按新原生导出更新。
- 原生对账：`test/native/2.1.316/first-party-shape.test.mjs`（4 项）——从还原源码取出真正的 `s2o`/`ZSr`/`vX` 与 `Dns` 规则，对官方同一客户端两种形状的抓包（`fixtures/first-party-shape-2.1.316.json`，11 个请求，`build-first-party-shape-fixture.cjs` 生成）逐块逐字节得出一方形状；beta 集合等于官方；官方压缩提示词都以原生开头之一开始（`compaction-prompts-2.1.316.json`）。四版 `patch-wire-preservation` 断言新标签、能力、原生绑定与 beta 导入行，四版 `body-fields` 断言 `nativeBodyOrder` 等于原生字面量。
- Worker：`engine/first_party_shape_test.go`（应答解析、开关、会话记忆、子代理只在确定时配对、上报、缓存标记与字符串 content）。
- 离线 e2e：新模式 `thirdparty`（`test/e2e/thirdparty.sh`，15 个场景，**不设** `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL`）与 `fp-compare.cjs`（B 侧不变式 + 对 A 侧一方形状逐项列差异）；`live-official-client.cjs`、`official-client-replay.cjs` 作为"保留"对照时在策略里写 `first_party_shape:false`，另加两个转换场景。

### 11.4 编译与验证

做法与 v44 相同（第 6、7 节），ovh 一次性容器 `/tmp/ccg316-v45`（用完已删），脚本 `artifacts/claude-2.1.316/verify/scripts-v45/`（`ovh-rebuild.sh` → `ovh-build-v45.sh` → `ovh-everything.sh`：npm、Go、TLS、L4–L7、e2e、e2e 检查），日志 `verify/v45/final/final.tgz`；第一次运行（发现 beta 放置问题、修正前的 ELF `13e1f68f…efe`，未保留）的结果在 `verify/v45/run1/run1.tgz`。Worker 是本次 engine 改动编出的 Linux 静态二进制（`7739700a6f1c34496a0b398573f7d36b75e6b797968c0040527a5f90c42e9180`），挂在 `ccgateway-app:0.1.123` 上。

| 项 | v45 |
|---|---|
| 补丁树 | `artifacts/claude-2.1.316/patched-v45`（日志 `build/patch-v45.log`）：改写 8 个模块（与 v44 相同，锚点没有改，27 处替换），36 个支持文件（多 `ccgateway-first-party-shape.js`） |
| 打包 | 2907 个模块；`package-release.cjs` 的运行时检查通过（`v26.12.1`）；`Bun v1.4.4 (38afee6c8)` |
| 定制 ELF SHA-256 | `724ebb3397eef4abb88d4e320ebef0e55edc66fe1ca409263ada6db05a6b3bde`（325228720 字节） |
| `--ccgateway-info` | `{"version":"2.1.316","patch":"ccgateway-v45-first-party-shape", capabilities: 22 项}`（v44 的 21 项加 `build_first_party_shape_v1`） |
| release | `artifacts/claude-2.1.316/release-v45/`（modes `build`/`direct`）；ovh `~/sup2api/checks/cli-releases/release-v45-2.1.316` |
| 单测 + 原生对账 | Linux（`node:22-bookworm-slim`，`--network none`，`CCG_REQUIRE_ARTIFACTS=1`）：2.1.316 37 个文件 **245/245**，2.1.312/2.1.310/2.1.304 各 34 个文件 **236/236**，无 `CCG_NATIVE_TEST_SKIPPED`；本机 Windows 244/245、235/236（各 1 条只在 Linux 上跑的用例跳过） |
| Go（Linux，`golang:1.27-bookworm`） | engine 255 过、16 跳过（需真实 CLI）；worker 3 个包、contracts 7 个包全过；`go vet`、`GOOS=linux go vet` 通过（本机同） |
| TLS 指纹 | 22 条连接（官方 2.1.316、v44、v45 的 direct/build 各两次）：10 条 Messages 连接 **identical**（JA4 `t13d1713h1_5b57614c22b0_7f527383e249`）；请求头 **PASS**（头名与顺序相同，`x-stainless-*` 逐项相同） |
| 组装对账（L4） | **76/76**，上游 64，`acceptance: pass` |
| 客户端来源 × 内容策略 | **14/14** |
| 官方客户端实时转发（L6） | **12/12**（原 10 项在策略里写 `first_party_shape:false` 作"保留"对照，另加 `first_party_default`、`first_party_directory` 两项按转换后的形状核对再还原比较）；抓包回放 14 项 **`verified`** |
| 组件组合（L5） | **216/216** |
| Worker 策略矩阵（L7） | **`passed`**，上游 98 |
| 首轮工具注入 | 3/3，工具与 v44 的录制逐字相同；夹具按 v45 重新录制（只换 ELF SHA） |
| 离线回归：噪声 | 基线 v44（`ccgateway-app:0.1.123` 自带 Worker）两次：**0 of 73**，149 个请求；含三方形状场景 **0 of 88**，178 个请求 |
| 离线回归 D1（v44 → v45，73 个原有场景） | **35 of 73** 不同，**只有 `anthropic-beta`**，正文与其他头 0 差异；全部是 ① 的修正：去掉正文没用到的 `cache-diagnosis`（没有 `diagnostics` 的请求，6+9+2 个请求）、`extended-cache-ttl`（没有 1h 标记，3 个）或两者（47 个：非 CC、API-key 形状、错误、probe、values 等）；顺序变化两类：客户端独有的 `fallback-credit`/`server-side-fallback`（CC 顺序表里没有）之前插入 `prompt-caching-scope`（11 个请求，模型表的 beta 排在 CC 不认识的 beta 之前）；`s5b-two-beta-lines-build` 的 `prompt-caching-scope` 移到 `oauth` 之后（1 个，v44 把它放到了 `oauth` 前面，与 CC 的模型表相反） |
| 定向断言 / 其他 | `verify.cjs` 三次运行 2168/2168、2168/2168、**2193/2193**（多出的 25 项是 `verify.cjs` 只在请求带 prompt id 时才做的"prompt-id 头 = 计费头 `cc_prompt_id`"，转换后的三方形状请求有了 prompt id）；values 12/12；beta-check 只有已知 2 条；capcheck 178/178、`missing 0`、`bodyMismatch 0`、`secretsLeaked false`；respmatch 164/164；classify/conc 完成；`all` 61 次退出 0、1 次非 0（`login` 场景，基线相同） |
| 三方形状对一方形状（`fp-compare.cjs`，15 个场景、28 对请求） | 不变式：v45 **0 失败**（v44 110 失败）；规范化后的差异 v44 260 处 → v45 92 处，剩下的见下表 |

v45 的 92 处差异全部归类如下（场景名见 `test/e2e/README.md`）：

| 差异 | 次数 | 场景 | 原因 |
|---|---|---|---|
| `mid-conversation-system-clear-at` 只在 A | 28 | 所有 Opus 请求 | 用户决定不做 |
| 消息里的延迟工具清单多 `RemoteTrigger`、`WebFetch`，技能清单多 `schedule` | 28（19 + 9） | 所有有首轮 reminder 的请求 | 客户端自己写的内容：同一客户端接自定义地址时就这样列，网关不改消息（订阅专属工具/技能，用户决定不做） |
| `x-claude-code-prev-tool-durations` 只在 A | 6 | 工具循环与子代理的续接请求 | 网关不知道客户端执行工具的耗时 |
| `x-cc-compaction-request`、`x-claude-code-compaction` 只在 A | 4 | `tp-compact-low` | 手动还是自动压缩不可知（客户端带了就透传） |
| 计费头、system 拆块与标记、prompt-id 头、`diagnostics`、`prompt-caching-scope`/`cache-diagnosis`/`thinking-binding-controls` beta | 19 | `tp-main-off`、`tp-main-direct` | 对照场景，按设计不转换 |
| `oauth` beta、`authorization`/`x-api-key` | 7 | `tp-apikey-low`、`tp-token-low`、`tp-apikey-account` | 客户端的认证方式与账号类型不同（API key 客户端经 OAuth 账号、OAuth 客户端经 API key 账号），与形状无关 |

没有跑或没有覆盖：真实上游（发布后用生产账号测）、核心 ↔ 插件（核心与合同由另一位负责）、`controller-go/integration/l7`、真实 CLI 的 engine 用例（16 跳过，与 v44 相同）。

## 12. v46：实测发现的两处缺口（`ccgateway-v46-shape-prompt-text`）

2026-11-03 实测：82 号账号原地升到 v45（插件 0.1.124，Worker `eacf79d9…`），官方 Claude Code 2.1.316 客户端按用户的接法（`ANTHROPIC_BASE_URL=https://api.prophey.ai`、网关密钥作 `ANTHROPIC_AUTH_TOKEN`、全新 HOME、`sdk-cli`、`claude-sonnet-4-6`）跑了 4 个会话：单轮、工具循环（Read）、`--continue` 第二轮、general-purpose 子代理，共 10 个请求（日志在 `artifacts/cc-thirdparty/live82/ours/`）。计费头补全、`cc_prev_req`、3→4 拆块、prompt-id 头、首个请求的 diagnostics 都对；两处不对：

| 缺口 | 现象 | 根因 |
|---|---|---|
| 1. 续接请求没有 `diagnostics` | 带 `cc_prev_req` 的 6 个请求都没有 `diagnostics`，也没有 `cache-diagnosis` beta；官方带 `previous_message_id` = 上一次应答的 `msg_…` | Worker 一次应答也没读：CLI 写到 stdout 的是 fetch 已解压的字节，但 `--response-meta` 里记的是上游原始响应头，Anthropic 的应答都带 `Content-Encoding`（gzip/br），v45 的 `newAnswerObserver` 见到非 identity 的编码就不读（`return nil`），所以记忆里没有 message id。离线 e2e 的假上游不压缩，没暴露 |
| 2. 子代理没有 `x-claude-code-agent-type`、`cc_prompt_id`、prompt-id 头 | 父线程的 Agent 调用写着 `subagent_type: general-purpose`，子代理首个请求的 prompt 与它逐字相同，但配不上 | 同一个根因（父线程应答里的 Agent 调用也没读到），另有一个时序问题：记忆在 CLI 进程退出之后才写、线程占用也在请求处理完才释放，而客户端拿到完整应答就立刻发下一个请求（子代理首个请求、工具结果）。CLI 退出得慢时，下一个请求会看到父线程"还在忙"，按"宁可少不可错"什么都不给 |
| 附带发现：工具循环里 prompt id 变了 | 同一轮的第二个请求（`cc_turn_index` 仍是 1）`cc_prompt_id` 与第一个不同（官方同一轮共用） | CLI 派生 prompt id 时对 prompt 的内容取哈希，内容带着客户端的缓存标记：客户端把 `cache_control` 挂在最后一条消息上，第一个请求里 prompt 带标记，有了工具结果之后标记挪走，哈希就变了。这个只在 prompt 本身是最后一块时出现（Sonnet 4.6 的三方形状；Opus 的首轮最后一块是系统提醒），所以 v45 的离线 e2e（Opus 为主）没暴露 |

修正：

- **Worker（`engine/answer_observer.go`、`request_command.go`、`session_state.go`）**：观察器不再看 `Content-Encoding`（CLI 给的就是解码后的字节；类型对不上、读不了的仍然不记）；观察器认出应答的结尾（流的 `message_stop`、JSON 应答完整可解析）时，在把这一段写给客户端**之前**就把应答记入会话记忆并释放线程（只做一次，CLI 退出后不再重复），客户端随后发来的请求一定能看到它。记忆的条件（续接证明、子代理唯一配对、父线程不忙）不变，证明不了照旧不给。观察器也不再只在转换时才开（记 message id 不影响不转换的请求：不转换的 CLI 拿到的上下文里会去掉一方形状的字段）。
- **CLI（`request-session.js promptTextHash`、`request-build.js`）**：派生 prompt id 用的哈希去掉 `cache_control`，并把只有一段文字的字符串 content 当作一个文本块（与 Worker 比较历史时的规整方式相同），同一轮的请求共用一个 prompt id。CLI 的补丁产物因此变了，标签：2.1.316 `ccgateway-v45-first-party-shape` → `ccgateway-v46-shape-prompt-text`；三个旧 profile 的产物也变了，升为 `ccgateway-v53-shape-prompt-text`（2.1.312）、`v54`（2.1.310）、`v55`（2.1.304），不编译、不发布。
- **发布要成对**：Worker 与 CLI 都变了，v46 要和这次的 Worker（离线验证用 `3cf2744aef47490f334b0570d0f9bb3ae5537d763347a12631c6fed016febd93`）一起发。

测试：

- Worker：`engine/first_party_live_test.go`，用实测请求的形状（`engine/testdata/first-party-live-2.1.316.json`，由 `testdata/build-first-party-live.cjs` 从 82 号日志生成：去掉工具定义、截短提示词、替换签名、设备/账号/会话 ID 与上游 request/message/tool_use ID，结构不变）。`TestFirstPartyShapeLiveConversation`：应答按 gzip 记录时，工具循环的续接拿到上一次应答的 message id、子代理首个请求拿到父线程的 prompt id 与 `general-purpose`、子代理续接与主线程下一轮都拿到各自的上一次应答；`TestFirstPartyShapeMemoryIsReadyWhenTheAnswerEnds`：父线程的 CLI 写完应答后再拖 4 秒才退出，客户端收到 `message_stop` 立即发子代理首个请求与主线程下一个请求，两者都拿到记忆，CLI 退出后线程不被旧应答回写。两项在恢复旧逻辑时都失败（已核对）。测试桩 CLI 可按请求内容脚本化回答（`CCG_TEST_REQUEST_SCRIPT`）、记录响应编码、延迟退出。
- CLI：`test/first-party-shape.test.mjs` 新增"缓存标记挪走后同一轮 prompt id 不变"（实测的工具循环形状；字符串 content 与单个文本块相同；换 prompt 则不同），旧哈希下失败（已核对）。
- 离线 e2e：假上游 `FAKE_GZIP=1` 时按请求的 `accept-encoding` 用 gzip 回答（`thirdparty` 模式打开它）；新增 `tp-sonnet-tool-low`、`tp-sonnet-subagent-low`、`tp-sonnet-turn2-low` 三个 Sonnet 4.6 场景；`fp-compare.cjs` 新增两条不变式：每个线程有 assistant 消息的请求 `diagnostics.previous_message_id` 等于该线程上一次应答的 message id（首个请求为 null，A 与 B 都查）、子代理的 agent type 与官方一致。

编译与验证（ovh `/tmp/ccg316-v46`，用完已删；脚本 `artifacts/claude-2.1.316/verify/scripts-v46/`，日志 `verify/v46/final.tgz`；基线镜像 `ccgateway-app:0.1.124`，自带 Worker `eacf79d9…` 与 v45）：

| 项 | v46 |
|---|---|
| 补丁树 | `artifacts/claude-2.1.316/patched-v46`（日志 `build/patch-v46.log`）：与 `patched-v45` 只差 `ccgateway-request-build.js`、`ccgateway-request-session.js`、`cli.js`（补丁标签）与 `ccgateway-patch.json` |
| 定制 ELF SHA-256 | `2125d0b0953f3ee789f82fc39d4b6d7ec9ebb252f5ed88aac5189f46fd0b0b41`（325232816 字节，2907 个模块，`Bun v1.4.4 (38afee6c8)`，运行时检查 `v26.12.1`，能力 22 项不变） |
| release | `artifacts/claude-2.1.316/release-v46/`；ovh `~/sup2api/checks/cli-releases/release-v46-2.1.316` |
| 单测 + 原生对账 | Linux（`CCG_REQUIRE_ARTIFACTS=1`）：2.1.316 37 个文件 **246/246**，2.1.312/2.1.310/2.1.304 各 34 个文件 **237/237**，无跳过标记；本机 Windows 245/246、236/237（各 1 条只在 Linux 上跑）。`injected-tools-2.1.316.json` 按 v46 重录（工具逐字相同） |
| Go | Linux（`golang:1.27-bookworm`）engine **257 过**、16 跳过（需真实 CLI），worker 3 个包、contracts 7 个包全过；本机 Windows engine 252 过、21 跳过（另 5 项只在 Linux 上跑），`go vet`、`GOOS=linux go vet` 通过 |
| TLS / 请求头 | 22 条连接，10 条 Messages 连接（官方、v45、v46 各 direct/build 两次）与官方 **identical**；请求头 **PASS** |
| L4 / 客户端内容 / L6 / L5 / L7 | **76/76**（上游 64，acceptance pass）/ **14/14** / 实时转发 **12/12**、抓包回放 14 项 **verified** / **216/216** / 策略矩阵 **passed**（上游 98） |
| 噪声 | v45 两次：**0 of 73**（149 个请求）；含三方形状场景 **0 of 91**（188 个请求） |
| D1（v45 → v46，73 个原有场景） | **0 of 73**，149 个请求，出口无差异 |
| 断言 | verify 2310/2310、2310/2310、**2321/2321**；values 12/12；beta-check 只有已知 2 条；capcheck 188/188（`missing 0`、`bodyMismatch 0`、`secretsLeaked false`）；respmatch 174/174 |
| 三方形状对一方形状（`fp-compare.cjs`，18 个场景） | 不变式：v45 **53 失败**（续接缺 diagnostics 12、子代理 agent type 11、子代理 `cc_prompt_id` 11、prompt id 共用方式 5 等，与实测一致），v46 **0 失败** |

v46 对官方一方形状剩下的差异与 v45 相同的几类（第 11.4 节），只是新加的 Sonnet 场景让次数变多：`mid-conversation-system-clear-at`（28，不做）、消息里客户端自己写的延迟工具/技能清单（48，客户端内容）、`x-claude-code-prev-tool-durations`（10，做不到）、两个压缩头（4）、对照场景 `tp-main-off`/`tp-main-direct`（19，按设计不转换）、认证方式与账号类型（7）。

## 变更记录

| 日期 | 版本 | 内容 |
|---|---|---|
| 2026-11-02 | v42 | 移到 2.1.316，逻辑与 v41 相同（未发布） |
| 2026-11-02 | v43 | 报告官方运行时版本 `v26.12.1`；首轮工具注入（`build_injection_tools_v2`）；插件 0.1.122 起新账号使用 |
| 2026-11-02 | v44 | `StoredLoginHeldBackError` 按 `errorClass` 回 403 / 401 / 可重试 502（第 10 节）；未发布，并入 v45 |
| 2026-11-03 | v45 | 三方形状转一方形状（`build_first_party_shape_v1`）与三处一致性修正（第 11 节）；插件 0.1.124 上线 82 号账号实测 |
| 2026-11-03 | v46 | 实测两处缺口：Worker 读压缩应答并在应答结束时立即记忆、CLI 派生 prompt id 不受缓存标记影响（第 12 节）；候选，需要同一次改动的 Worker |
