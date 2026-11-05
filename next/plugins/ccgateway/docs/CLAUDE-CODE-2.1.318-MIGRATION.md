# Claude Code 2.1.316 → 2.1.318 迁移记录（CLI v47 → v48，发布版本 v56）

2026-11-05。把账号 Worker 里的定制 CLI 从官方 2.1.316（`ccgateway-v47-count-tokens`）移到官方 2.1.318。要求与以往相同：`claude request --build|--direct` 与 `claude ccgateway-mgmt` 的逻辑与 v47 一样，只允许出现官方自己的变化。做法按 [CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md) 第 1–5 节，上一次迁移见 [CLAUDE-CODE-2.1.316-MIGRATION](CLAUDE-CODE-2.1.316-MIGRATION.md)。

**状态**：v48 完成迁移与验证（第 1–7 节），不发布。2.1.318 新增的工具清单头 `x-claude-code-sandy-plover` 需要会话记忆支持（[SESSION-MEMORY-TOOLS-USED-DESIGN](SESSION-MEMORY-TOOLS-USED-DESIGN.md)），已实现并验证，以 v56（最终构建 v56b）发布（第 8 节）。只给新账号，老账号保持原 CLI。

| 项 | 2.1.316 / v47 | 2.1.318 / v48 |
|---|---|---|
| 官方 manifest | 2026-10-30T23:47:48Z，commit `cd7ceb45` | 2026-11-03T19:21:35Z，commit `ca1fa9dea62c1027756786c841c548788644560d` |
| 官方 linux-x64 ELF SHA-256 | `fd13c700…d824`（328262000 字节） | `708c77b204db30086ff6f1ed34577bda03e1be74ced80557cbf7b54249ebf0bd`（337814032 字节，与 manifest 一致） |
| 内嵌 Bun | 1.4.4（修订 `71c9bf0ca`） | 1.4.4（修订 `424a542a9`），profile `bunVersion` 仍为 1.4.4 |
| Bun 报告的 Node.js 版本 | `v26.12.1` | `v26.12.1` |
| 还原 | 2880 模块 / 2648 JS | 3100 模块 / 2857 JS，`unresolved` 为空 |
| 补丁标签 | `ccgateway-v47-count-tokens` | `ccgateway-v48-cc-2-1-318`（验证用，不发布） |
| 定制 ELF SHA-256 | — | `ec0e1b91085a18349c797f3a8eb25a26ce1676393e705a1b812175dcbcbb45e5`（v48） |
| 能力 | 23 项 | 23 项（不变；v56 加 `request_tools_used_v1`） |

分析中间产物在 `artifacts/claude-2.1.318/`（不进 Git）：`official-manifest.json`、`claude-linux-x64`、`linux-restored/`、`seeds.json`、`equiv-316-318.json`、`equiv.out`、`carry.json`、`diffs/`（unitdiff，含 `closure/`）、`review/`（`g1-query.md` 主查询、`g2-core.md` 核心其余、`sp-spec.md` 工具清单头规格，及各自脚本）、`port/`（`map.cjs`、`make-profile.cjs`、`sites.cjs`）、`patched-v48/`。编译、TLS、离线回归在 ovh `~/sup2api/checks/cli-318/`。

## 1. 下载与还原

- 发布渠道 latest 为 2.1.318（stable 2.1.311）。按 `acquire.py` 样板下载，SHA-256 与字节数等于 manifest。本机 curl 走代理时报 `CRYPT_E_REVOCATION_OFFLINE`，加 `--ssl-no-revoke`；Python 下载不受影响。
- `restore-bun.cjs` 还原：3100 个模块、2857 个 JS，`unresolved` 为空，`bunVersion` 1.4.4（修订 `424a542a9`），`runtimeVersion` `v26.12.1`。
- 官方 ELF 另在 ovh `~/sup2api/checks/cli-318/official/claude-linux-x64`（同一 SHA）。

## 2. 静态分析

`seeds.cjs . 2.1.316` 生成 97 个种子；`equiv.cjs`（本机约 12 分钟）：旧 100792 个单元、新 104496 个，配对 96886，冲突 1051。种子：same 88、changed 6、unmapped 3。

| 结论 | 种子 |
|---|---|
| changed | `MN`→`uF`（客户端工厂）、`LGt`→`I5t`（queryModel）、`Kbe`→`rMe`（renderAttachment）、`gB`→`YU`（工具定义）、`e_n`→`Z_n`（主查询）、`AT`→`sv`（消息规整） |
| unmapped | `cli.js:qe`（入口，新版 `Xe`）、`Qyn`（消息规整入口，新版 `X_n`）、`TB`（压缩摘要提示，新版 `pcr`，文本一字不差） |

新核心模块 `chunk-5xgkngpb.js`（旧核心 14105 个配对单元里 13711 个落在它里面）。`carry-profile.cjs` 的 problems：`createClient`、`queryModel`、`renderAttachment`（changed，已审）、`coreScope.turnPosition`（搬出核心，见 2.2）、`coreScope.compactionSummary`（UNPAIRED，手填 `pcr`）。

### 2.1 changed / unmapped 单元的审查

| 单元 | 变化 | 对 `claude request` 的影响 |
|---|---|---|
| `e_n`→`Z_n` 主查询（g1） | **查询参数 `Z`→`ne`**（新核心另有导入的 `Z`、`Q`）；模型事实 `It`→`Nt`、beta 列表 `gt`→`It`（含义对调）；包装 `ke`→`Ee`；构建器 `g5n`→`VJn`、beta 列表 `Os`→`Pi`；模型表那一行结尾 `,`→`;`，后面新增 program-use-case-ids 的展开追加 `else if(pE(mt,dR)&&YNn())It=[...It,dR];`；消息一步拆成两步：`jy=nRr(…)` 后 `Yg=Oy=Xgn(jy,…)`（`Xgn` 是 tool-provenance 后处理，改 `tool_addition` 块的 `ownership_metadata`）；请求体字面量 `Qc`→`jf`，多一项 `...I9`（`program_use_case_id`）；新增第 7 个参数（流式快路径，yield 锚点之后才用） | 11 处锚点按新局部名重写，另加两处：第 12 号（program-use-case-ids 追加加 build 判断）、7b（wire 消息跳过 `Xgn`，与 316 跳过 `YSr` 等价）。构建器原 12 个 beta 头值与顺序不变，新增 `claude-code-side-query-2026-09-29` 排第 2（只对特定 querySource，build 不触发）。runbook §8：构建器外 6 处 `.push` 一一对应，thinking-token-count（`S1`）仍不在模型表，第 3 号 build 判断仍需要 |
| `Qyn`→`X_n` 消息规整入口（g2，unmapped） | **多第三个参数 `r`（分阶段计时回调）** | 锚点写 `function X_n(e,n,r){`；返回对象 8 个字段名与顺序不变，提前返回原样可用；旧锚点文本在新核心里 0 次 |
| `AT`→`sv`（g2） | flush `rs/fs`→`js/Fa`、记录数组 `Kn`→`wn`、循环变量 `jo`→`Fo` | 锚点 `case"progress":continue;case"system":` 不变且唯一；旧名在 `sv` 里是别的模块导入或无绑定，漏改不报错，派生脚本断言 |
| `YSr`→`nRr`（g2，same） | 记录变量 `At`→`mt`（`At` 在 `nRr` 里是另一个局部） | 替换文本里 `At.` 全换 `mt.` |
| `Sio`→`vdo`（g2，same） | `Y1/qde/cio`→`sz/Rfe/mdo` | 换名 |
| `gB`→`YU`（g2） | 新的缓存键钩子在提前返回之后 | 签名不变 |
| `MN`→`uF` 客户端工厂 | 提供方路由 `Od`→`kd`；`v4t`→`jJt`（`se`→`ae`）、凭证读取 `fge`→`B_e`、`Pn`→`Hn`、`hUe`→`kGe`、`fl`→`Ka`、自定义头 `ze`→`Ke`、`lw/Lr/_e/I8e`→`HS/Vr/ye/RZe`、容器 id `J`→`X`、重读 `Bl`→`Vl`；`StoredLoginHeldBackError` 多一个原因 `session_owner`（"This session belongs to another account…"，只在 `!e.apiKey && sessionOwnerHold` 时抛）；OAuth 刷新失效时带 `loginEnded==="time_limit"` | 6 处锚点按新名重写。`session_owner` 现在走传输错误映射（未映射）；Worker 不设 `sessionOwnerHold`，不会触发 |
| `Fl`→`Wl` | UA `wU()`→`g1()`；同模块的 `Ml` 是 foundry URL 函数 | 换名 |
| `qe`→`Xe` 入口（unmapped） | 参数列表仍 `t`，快路径设置来源 `o`→`s` | `entryStub('t','s')`，锚点 `if(a!==void 0){` 唯一 |
| `Rt`→`Tt` 会话（`chunk-5ythzcas.js`） | `p7t`→`lTo`（新增：嵌套会话不用远程会话 id）、`Ude`→`dpe` | 换名 |
| `BWi`→`Foa` 容器资源（`chunk-rf2v5y5r.js`） | **GiB 常量 `a`→`l`（`a` 变成错误日志函数）**、cpus `d`→`u`、内存 `p`→`d`、`Pxr`→`CBr`、`Ce`→`ke`、`u`→`f` | 换名；派生脚本断言 `*l`、`Number(l)` |
| `Z`→`N` 启动报告（`chunk-eehtd1bk.js`） | `node:os` 默认导入 `F`→`M`；mark 列表 `p`→`a`（`p` 变成单个 mark） | 换名 |
| `JXs`→`tyi` 计费（`chunk-7pwjpdkw.js`，same） | `ca`→`Ia`；选项对象键和顺序不变 | 换名 |

### 2.2 依赖的其余原生

- `natives`：carry 给出的新名逐项核对（`modelBetas` `XNn`、`AnthropicClient` `jDe`、`modelFetch` `ooe`、`toolPool` `vGt`、`identityLine/isIdentityLine` `tcr/ecr`、`attributionFingerprint` `Wwi`、`setEntrypointOnRequests/getRootSession` 在 `chunk-pfp3j087.js` 等）。闭包里 changed 的单元已看 unitdiff（`diffs/closure/`）：gzip 分块的子代理保留、模型 API 空闲连接重开、beta 表新增 tool-provenance/program-use-case-ids、生成 userID 时保留已有合法值、身份行拆分改为逐行查找（结果相同）、默认提示词 `original_games` 段措辞改动、一批受 REPL 开关 `ae()`（默认 false）控制的改动。
- `coreScope`：整体换成 carry 的值，`turnPosition` 删掉、`compactionSummary` 填 `pcr`。**56 个旧名里 41 个在新核心里仍是绑定但含义不同**（`l3n` 插件同步、`TB` 是 `` `Install ${…}` ``、新核心自己另有一个无关的 `Egr`），补丁器的作用域检查会放行，所以不能留任何旧名。
- `coreImports`：`betaFromHeader` `chunk-7kayq7nc.js:yAs`、`currentDate` `chunk-v4ach9rb.js:yhs`，新增 `turnPosition` `chunk-nt9amew5.js:Egr`（补丁器以别名导入并核对导出名）。
- `locate`：`requestBuilder` `VJn`、`builderBetaList` `Pi`、`systemRecord` `chunk-5xgkngpb.js:Tfe`、`appendJoin` `chunk-hjswk319.js:Tr`、`betaMessagesModule` `chunk-vn3g7zt8.js`（仍恰好一处 POST `/v1/messages?beta=true`）。

## 3. 补丁的迁移

- profile `profiles/linux-x64-2.1.318.json` 由 `artifacts/claude-2.1.318/port/make-profile.cjs` 生成：natives/coreScope/coreImports/locate 按第 2.2 节；`modules` = 补丁需要的模块（核心、natives、coreImports、locate、被改写或加导入的模块、两个编译入口）加上每个 316 模块"大部分配对单元去了的那个模块"（`port/map.cjs`），共 27 个，哈希按 318 还原文本计算。
- 锚点 `patches/2.1.318.cjs` 由 `tools/upgrade/examples/derive-anchors-2.1.318.cjs` 从 2.1.316 的锚点逐条替换生成（每条替换必须恰好命中预期次数；主查询块最后 `Z.`→`ne.`；末尾断言没有任何 316 名字残留，按标识符边界检查 `Z`、`Q`、`ke`、`gt`、`pt`、`MN`、`AU`、`Se`，并断言 `ne.ccgateway` 19 处（产物里展开后 29 处）、`Nt.thinking`、7a/7b/12 号锚点、`X_n(e,n,r)`、`kd(s)!=="firstParty"`、`*l` 等各自的次数）。第二组的断言脚本 `review/g2-assert.cjs` 对派生结果全部通过（对 316 文件跑有 150 条失败）。
- `request-parameters.js`：`nativeBodyOrder` 在 `context_management` 与 `safeguards` 之间加 `program_use_case_id`（318 的构建器在客户端带 program-use-case-ids beta、且本进程有组织的 use case 时写入；Worker 不设，build 下不会出现，但客户端自带时按原生位置排）。四个旧版本的 `body-fields` 测试改为只比本版本字面量里出现的字段。
- `worker/Dockerfile` `ARG CLAUDE_VERSION=2.1.318`。
- 补丁：`node patch-cli.cjs …/linux-restored …/patched-v48` 成功，改写 8 个模块；`anchor-hazards`：28 处替换、无 hazard、28 处逐字出现在产物里。补丁后的 `Z_n` 与第一组验证脚本产出的 `g1-new-Z_n.patched.js` 逐字相同；`Z_n` 里 `Z.ccgateway`、`Q.ccgateway` 0 处，`ne.ccgateway` 29 处。构建器 beta 列表 `[gk,zHe,Jk,R2,rbe,nQe,cNt,VW,Bnn,xht,uNt,gD,x2]` 从 `chunk-7kayq7nc.js` 导入。
- 测试：`test/native/2.1.318/` 由 316 那份移植（进行中，见第 7 节）；新增夹具 `official-{request,tools}-2.1.318.json`（`capture-official.sh` 抓取）、`native-{vocabulary,layers,environment}-2.1.318.json`（原生生成）。

## 4. 官方 2.1.318 的变化（对我们可见的部分）

`capture-official.sh` 同一镜像分别抓官方 2.1.316 与 2.1.318，`official-diff` **0 差异**（最小请求）。下面的变化出现在这个最小请求之外：

| 变化 | 出现在哪 | 结论 |
|---|---|---|
| **新请求头 `x-claude-code-sandy-plover`**：本会话用过的工具清单（316 已有但受默认关的开关压着，318 去掉了这个开关） | 每个一方 Messages 请求 | 我们每请求一个进程，build 永远发 `[]`；客户端的值在核心被 passHeaders 丢掉；316 客户端的请求我们也发了。做法见 [SESSION-MEMORY-TOOLS-USED-DESIGN](SESSION-MEMORY-TOOLS-USED-DESIGN.md)，v56 实现 |
| program-use-case-ids beta（`program-use-case-ids-2026-09-17`）：模型表加入；构建器写 `program_use_case_id`；EXTRA_BODY 里同名字段删掉；被拒时重试 | 主查询、构建器 | 依赖 `CLAUDE_CODE_PROGRAM_USE_CASE_ID` 或组织凭证槽，Worker 不设；第 12 号锚点堵住进程级粘性状态 |
| tool-provenance beta（`tool-provenance-2026-10-26`）与 `ownership_metadata` 后处理 | 模型表、主查询 | wire 工具与消息在 build 下整组替换（第 1 号、7a/7b） |
| side-query beta（`claude-code-side-query-2026-09-29`） | 构建器 | 只对特定 querySource |
| `StoredLoginHeldBackError` 新原因 `session_owner` | 客户端工厂 | Worker 不会触发；未映射 |
| 默认提示词 `original_games` 段措辞（"or with similar mechanics"、"its name, characters, art, music, levels or look"） | 原生默认提示词 | 只在"高"注入等级用原生默认提示词时可见，按官方变化 |
| 计费头 `cc_version=2.1.318.<指纹>`、UA `claude-cli/2.1.318` | 原生 | 官方必要变化 |

`cch` 仍按用户决定保持 `00000`。

## 5. 编译与打包

ovh `~/sup2api/checks/cli-318/build.sh v48`：上传工作区快照（`src/cli-mods`）、在宿主上还原与补丁、`oven/bun:1.4.4` 容器里 `build.sh`（`--cpus 4 --memory 8g --network none`，3127 个模块）、`node:22-bookworm-slim` 容器里 `package-release.cjs`（运行 ELF 核对 `v26.12.1` 通过）。release `release-v48/2.1.318/claude`，SHA `ec0e1b91…45e5`。

## 6. TLS 指纹与请求头

`test/e2e/tls-fingerprint.sh`（ovh，`ccgateway-app:0.1.129`，官方 2.1.318、官方 2.1.316、v48 direct/build 各两次，34 条连接）：v48 与官方 2.1.318 的 Messages 连接 **TLS identical**。`x-stainless-*` 逐项相同（`runtime-version v26.12.1`、`package-version 0.128.0`），UA `claude-cli/2.1.318`。头名差异只有请求本身不带的 prompt-id / beta；官方 316 没有 `x-claude-code-sandy-plover`，318 两边都有（值 `[]`）。

## 7. 验证

| 层 | 内容 | v48 |
|---|---|---|
| 单测 + 原生对账 | `CCG_CLI_VERSION=2.1.318 CCG_REQUIRE_ARTIFACTS=1 npm test` 与 2.1.316 | **进行中**（测试移植） |
| 补丁器 | `patch-cli.cjs`、`anchor-hazards`、`g2-assert` | 28/28、无 hazard；断言全过 |
| 运行时版本 | `runtime-check.cjs` | `v26.12.1`，打包时通过 |
| TLS / 请求头 | 第 6 节 | identical；`x-stainless-*` 相同 |
| 离线回归：噪声 | `ccgateway-app:0.1.129`（v47）+ 官方 2.1.316 客户端两次 | **0 of 73**，149 个请求 |
| 离线回归 D1 | 官方 2.1.316 客户端，v47 对 v48（`NEW=1`），规则：UA 与 `cc_version` 版本替换 | 72 of 73 有差异，**全部是新头 `x-claude-code-sandy-plover`**（149 次）；去掉这个头后 **0 of 73**（`results/d1-strip.txt`） |
| 官方 318 客户端经 v48 | `crossversion` 对 v47 基线 | `countMismatch` 为空 |
| 定向断言 | `verify.cjs`（a47、a47r、c48o316、c48o318） | 四次 **2321/2321** |
| 其他 | capcheck、respmatch、fp-compare、values、beta-check、classify、conc | 四次：capcheck 188/188、`missing 0`、`bodyMismatch 0`；respmatch 174/174；fp-compare 不变式 0 失败；values 12/12；beta 只有已知 2 条；classify/conc 完成；`all` 61 次退出 0、1 次非 0（`login` 场景，基线相同） |
| 组装对账 L4、客户端来源 L4b、实时转发 L6、组件组合 L5、策略矩阵 L7 | `assembly-replay` 等 | 在 v56b 上跑（第 8.3 节）：L4 **76/76**（上游 64，`acceptance: pass`），L4b **14/14**，L6 实时转发 **12/12**、抓包回放 14 项 **`verified`**，L5 **216/216**，L7 **`passed`**（上游 98） |
| 资源管理断网场景 | `TestResourceManagementLinuxOfflineNetNone`（ovh，`ccgateway-app:0.1.129`，`--network none`，SHA 固定） | 官方 2.1.316 与官方 2.1.318 的通过/失败集合**完全相同**（91 败 136 过，已知：官方 CLI 没有 `ccgateway-mgmt`）；v47（0.1.129 自带）与 v56b **完全相同**（9 败 104 过）。定制 CLI 在断网时 `auth status` 不退出（v47、v48、v56b 都超时，官方两版 0.13 秒返回），所以 API key / 环境 OAuth 的选择用例失败，属于已有情况，不是 318 带来的 |
| Go | engine、worker、contracts | v48 没有改 Go，未跑；v56 改 engine/contracts，届时 Linux 全量 |

新头的取值（`sp-table.cjs`，c48o318 组）：官方直连在 Bash 往返后发 `[{"name":"Bash"}]`、子代理后每个请求都发 `[{"name":"Agent"}]`，三方形状客户端不发；v48 一律 `[]`；316 客户端经 v48 也带了 `[]`（官方 316 不发）。这是 v56 要修的。

## 8. v56：工具清单头（`ccgateway-v56-cc-2-1-318`）

按 [SESSION-MEMORY-TOOLS-USED-DESIGN](SESSION-MEMORY-TOOLS-USED-DESIGN.md)（实现时的修正见其第 13 节）。v56 = v48 加工具清单头。

- **能力** `request_tools_used_v1`（profile 24 项）。新支持模块 `request-tools-used.js`；共用的 `request-agent.js`（`readRequestAgent` 接受并校验 `tools_used`，版本中立的衔接点 `prepareToolsUsed`/`requestToolsUsed`/`toolsUsedReport`/`useToolsUsedMerge`）和 `request-command.js`（发送前合并一次、2xx 时回报）。318 专属模块由补丁后的 `chunk-vn3g7zt8.js` 静态加载时注册合并函数：共用模块不能导入 316 profile 没装的模块。
- **新原生**（`natives.toolsUsed`）：`toolsUsedFromHistory` `chunk-sva49n74.js:nD`、`conversationToolsUsed` `chunk-pfp3j087.js:getConversationToolsUsed`、`companionTools` `chunk-sva49n74.js:PZt`、`compactSummaryTools` `chunk-sva49n74.js:ccgatewayCompactSummaryTools`（**补丁在该模块末尾追加** `export {Z as ccgatewayCompactSummaryTools};`，Z 是原生摘要正则的读取函数，锚点先确认 `function Z(e){let t=e.match(w);…}` 恰好一次）、`toolsUsedUnreadable` `chunk-5ythzcas.js:UD`。`chunk-sva49n74.js` 加入 `modules`（`b858678a…3d24`）。两个正则都不手抄。
- **发送点**（`chunk-vn3g7zt8.js:XS`，函数内恰好一次）：

  ```js
  // 318 原文
  if(sn(J))try{if(tft(L)&&ub()){if(H.set(Ulo,Nf(wf())),Ps().once("tools_used_header"))g("api_tools_used_header")}}catch{}
  // v56
  if(sn(J))try{if(tft(L)&&ub()){let ccgToolsUsed=ccgatewayToolsUsedHeader(H,()=>Nf(wf()));if(ccgToolsUsed===null)H.delete(Ulo);else if(H.set(Ulo,ccgToolsUsed??Nf(wf())),Ps().once("tools_used_header"))g("api_tools_used_header")}}catch{}
  ```

  外层原生 `sn`/`tft`/`ub` 与 `catch` 保留。返回值：没有 Worker 上下文为 `undefined`（原生行为）；没有 `tools_used`，或发出的 `User-Agent` 低于 2.1.318 为 `null`（删头）；客户端值原样；否则原生 `Nf(wf())`。
- **合并**：记忆（原样，含 UD）→ 客户端值的名字（去掉首项截断 UD）→ wire 消息转内部形状后 `nD(…, undefined, true)`，按顺序去重，`wf().replace` 写进原生集合。伴随块后的记录给一个原生不解析的 `origin` 种类（原生要求伴随块后紧跟带 origin 的 user 记录）；Skill/REPL 结果里的名单原生只读内部字段，wire 上拿不到，不解析。
- **回报**：应答元数据 `tools_used`，最多 256 个，只在 2xx 时写。
- **旧版本标签**：共用模块变了，按 runbook 4.7 升号：2.1.316 `ccgateway-v57-tools-used`、2.1.312 `v58-tools-used`、2.1.310 `v59-tools-used`、2.1.304 `v60-tools-used`。只补丁、不编译、不发布；线上老账号继续用原 ELF。v57（316）不声明新能力，实跑一律不发这个头、不回报。
- **ovh 编译与验证（v56，2026-11-05）**：ELF `bbe14000…83d2`，TLS 与官方 2.1.318 identical。离线回归（`e2e56.sh`，0.1.129 镜像挂候选 Worker 与 v56，内存存储）：新头的取值与官方直连逐项相同（三方形状客户端由我们组装，316 客户端不发）；去掉这个头后 v47 对 v56、v48 对 v56 都是 **0 of 73**；verify 2321/2321，capcheck、respmatch、fp-compare、values 全过。Linux Go 测试全量通过（contracts、engine、worker、controller 1050、guard 344、server compose、插件）。

### 8.1 真 Valkey 与会话记忆场景（设计 10.2、10.4）

- **ACL 隔离**（`controller-go/integration/state/run.sh`）：sessionstate 4 项、accounts 1 项、engine 15 项（含共用存储用例在真 Valkey 上跑），uid 1000 只读挂载再跑 1 项，**全部通过**。实测 block（`off`）**不会断开已认证的连接**，这个连接仍只能访问自己的前缀；`DELUSER` 会断开。设计第 12 节已据此更新。
- **离线场景**（`docker.sh state`，13 个场景，A 侧官方 318 直连、B 侧经网关，`state-check.cjs` 逐请求比工具清单头和线程链）：多工具（Bash、Read、MCP、WebSearch）的一方、三方、删头三种情形，压缩，Worker 重启（Valkey / 老容器），TTL 过期与未过期，Valkey 一开始就停 / 两轮之间停，@ 文件读取后删头并重启。最终 **12 个与官方一致，1 个是预期差异**：`st-ttl-tp` 记忆过期后，压缩后第一个请求没有 `cc_prev_req`，与官方存档被清理后恢复会话的效果相同。Worker 请求日志里 Valkey 读写 161 次，最长 30 ms；停机时 6 次退回内存，3 次超时，没有请求失败。

### 8.2 场景里发现并修好的三个问题（v56b，候选 Worker `edef0389…4de3`）

| 问题 | 原因 | 修法 | 何时引入 |
|---|---|---|---|
| 客户端没发头时（三方形状或头被删），WebSearch 之后的请求多出 `{"name":"web_search"}` | Worker 把 WebSearch side query 应答里的服务端工具调用也并进了集合；官方只记主循环（主线程、子代理）里的服务端/MCP 调用 | engine `tools_used.go`：side query 的应答不并入集合。判定 side query：客户端标了 `auxiliary`，或者没标类别且只提供服务端工具 | v56 |
| 三方客户端的 WebSearch side query 经网关后变成 `main`，带上了 prompt ID、turn 字段和 diagnostics，导致下一个主线程请求丢了 `cc_prev_req` 和 diagnostics | 三方形状转换把没有类别头的请求一律当主线程 | cli-mods `request-agent.js`、`request-build.js`：转换的请求如果没有类别头、不是子代理也不是压缩、只提供 `web_search` 服务端工具，就用官方的 query source `web_search_tool` 构建（CC 自己写 `auxiliary`），不续接也不改线程记忆 | v47 起（v44 第一方形状转换） |
| 工具循环之后压缩，压缩请求和压缩后的第一个请求都缺 `cc_prev_req` 和 diagnostics | 压缩请求不含最后一条应答，压缩后的请求以摘要开头，都不"续接最近一次应答"，Worker 就什么都不给 | engine：每个线程多记最近 16 个应答，键是应答里文本块的文本和工具块的 ID，值是 request-id 和 message ID。请求不续接最近一次应答时，按它最后一条 assistant 消息去找，只给这两项。存储格式仍为 v1，多一个可选字段 `answers` | v47 起（只压缩、没有工具时正常，所以原有回归没测出来） |

v47 基线（0.1.129 自带，`e2e-state-base.sh`）在同样场景下有后两个问题，说明不是 v56 引入的回归。

- **v56b 验证**：
  - 补丁标签仍是 `ccgateway-v56-cc-2-1-318`（v56 没发布过，不升号）；ELF `9998134d…2681`；TLS 与官方 2.1.318 identical；
  - `npm test`：318 共 261 项 260 过，316 共 251 项 250 过，各有 1 项只在 Linux 上跑而跳过；engine 在 Linux 上全量通过；
  - 全量离线回归 c56bo316、c56bo318：去掉新头后，v47 对 v56b、v48 对 v56b 都是 **0 of 73**；v56 对 v56b（318 客户端）**0 of 73**；新头取值表与 v56 完全相同；verify 2321/2321（两组）；capcheck 188/188、`missing 0`、`bodyMismatch 0`；respmatch 174/174；fp-compare 不变式 0 失败；values 12/12；beta 只有已知 2 条；
  - 三方场景的线程链：除 `tp-main-direct`、`tp-main-off`（按设计不转换）外都与官方一致；
  - state 13 个场景：12 个一致，1 个是预期差异。
- **待做**：镜像与发布。

### 8.3 组装对账 L4–L7（v56b）

做法与 316（v45）相同：ovh `~/sup2api/checks/cli-318/l47/replay.sh`，镜像 `ccgateway-app:0.1.129`，每层一个一次性的 `--network none` 容器，测试目录取自本机工作区，CLI、Worker、官方 ELF 的 SHA 都固定：CLI v56b `9998134d…2681`、Worker `edef0389…4de3`、官方 2.1.318 `708c77b2…f0bd`。日志在 `l47/replay-v56b/out/`。

| 层 | 结果 |
|---|---|
| 组装对账 L4（`assembly-cases-2.1.318.json`） | **76/76**，上游 64，coverage `acceptance: pass` |
| 客户端来源 × 内容策略 L4b | **14/14** |
| 官方客户端实时转发 L6 | **12/12** |
| 官方抓包回放 L6 | 14 项 **`verified`**，0 失败 |
| 组件组合 L5 | **216/216**（上游 216） |
| Worker 策略矩阵 L7 | **`passed`**，0 失败，上游 98 |

L7 的矩阵沿用 316 的做法：把 316 矩阵里 135 处 `cli_version` 换成 2.1.318（`artifacts/claude-2.1.318/config-matrix-policies-2.1.318.json`）。这份矩阵不含新加的 `session_memory`，Worker 按默认的 24 小时处理；`session_memory` 的下发和校验由核心与 contracts 的单测覆盖。
- **验证**：`npm test`：2.1.318 259 项 258 过 0 失败（1 项 Linux 专用跳过），2.1.316 249 项 248 过 0 失败，都没有 `CCG_NATIVE_TEST_SKIPPED`；312/310/304 的 patch-wire-preservation 各 10 项全过。补丁 `patched-v56`（改写 9 个模块）、`patched-v57`；anchor-hazards 318 29 处、316 27 处，无 hazard；g2-assert 113 条全过。Bun 1.4.4 实跑补丁后的真 CLI 10 个场景（direct 与 build）：记忆 + 历史、客户端值原样、wire 压缩摘要、316 UA 不发、无 `tools_used` 不发、无 Worker 上下文发原生 `[]`。`injected-tools-2.1.318.json`、`-2.1.316.json` 在 v56/v57 补丁树上重新探测，工具逐字相同。

## 9. 手册与工具的更正

- runbook §8 的"beta 从模型表挪进主查询"检查只扫 `.push(常量)`，318 的追加写成展开赋值 `It=[...It,dR]`，还有被调函数返回 `[...n,TN]`。检查要扩展到构建器之外对 beta 列表变量的全部赋值及其右侧的被调函数（`review/g1-ast.cjs` 的 assignments 部分）。
- 这次 profile `modules` 不能沿用旧清单逐个映射：两个旧模块在 318 里拆开了（`chunk-eweqvj83.js` → `chunk-948bfvqt.js`/`chunk-eehtd1bk.js`、`chunk-g54kbxqw.js` → `chunk-k0v80sg8.js`/`chunk-5xgkngpb.js`）。改为"补丁需要的模块 + 映射结果"的并集（`make-profile.cjs`）。
- 派生脚本的计数断言要按源码里的文本数（例如 `wire` 变量在源码里只写一次，产物里展开）；`Hn()` 在锚点源码里旧文本、替换文本各一次。

## 变更记录

- 2026-11-05：v48 迁移与验证；v56（工具清单头）补丁、编译与离线回归；真 Valkey 隔离与会话记忆 13 个场景；修 side query 并入集合、三方 side query 类别、压缩后链条三个问题（v56b + 候选 Worker），全量回归 0 差异。
