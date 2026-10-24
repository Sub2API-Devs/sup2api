# 2026-10-24 优雅度审核：cli-mods（定制 Claude Code CLI，v25）

范围：`next/plugins/ccgateway/companions/cli-mods/`（当前 HEAD `5eb390030`，含 v24 `beta-path` 与 v25 `beta-order` 两个未合并进发布线的改动），以及它们改写的原生模块。原生基线是 `artifacts/claude-2.1.304/linux-restored/`（压缩 JS），补丁产物是 `artifacts/claude-2.1.304/patched-v25/`。设计文档：`next/plugins/ccgateway/docs/REQUEST-MODES.md`、`BUILD-REQUEST-COMPONENTS-DESIGN.md`、`cli-mods/README.md`。

判据是用户给的一条：**出口与官方客户端一致，凡是原生能决定的都交给原生调用，补丁只做最小接入，自己写的逻辑越少越好。** 因此下文把「调用了原生函数」和「自己复刻了原生函数的语义」分开评价；后者即使当前输出正确，也算不优雅。路径除特别注明外都相对 `cli-mods/`；原生符号用「文件 + 函数名」定位（压缩名是打包产物，不算问题）。

只读审核：没有改任何文件、没有提交、没有升补丁标签。为确认行为，跑了 `node --test test/request-options.test.mjs test/request-identity.test.mjs test/request-policy.test.mjs`（13/13 通过）；对原生代码的结论来自直接阅读 `linux-restored` 的原文，并在需要处用 `@babel/parser` 复核了 AST 结构。

---

## 0. 总体结论

**整体是克制的，比同类"改压缩包"工程优雅得多；不优雅的地方集中在三处。**

真正优雅、值得保持的做法：

1. **把"原生会怎么说"当作事实源，而不是抄字符串。** `native-environment-2.1.304.inc.js:52-185` 用标记值去跑原生渲染器（`_oo`、`zkt`、`Kkt`、`Gkt`、`xNe`、`ANe`、`Eoo`、`RBs`、`u7t`、`fSt`、`p4n`），把环境标题/字段标签/撤回语/附件开头词在运行时**推导**出来，形状不符就 `throw`。这是整个目录里最有价值的设计：补丁里没有一句 CC 的英文措辞。
2. **注入层用原生探针构建。** `request-build.js:58-98` 把 `injectLayers` 变成"一次原生 builder 调用"：工具用原生 `m4t` 工具池，提示词用原生 `wx`/`r1e`/`ki`，附件用原生 `Wkt`/`eSt`/`JDr`/`date`，位置由原生决定。这不是重写，是借用。
3. **计费头、身份行、指纹、UA、入口都调原生。** `PAs` 生成计费行并顺带捕获（`patch-cli-2.1.304.cjs:140`）、`n1n`/`t1n`/`B1s` 判断身份行（`request-entry.inc.js:19,51-56`）、`RIs` 算指纹（只喂它原生会读的那一条消息，`request-input.js:275-285`）、`dN()` 生成 UA（`patch-cli-2.1.304.cjs:136`）、`setEntrypointOnRequests` 设入口（`request-command.js:187`、`request-build.js:163`）。
4. **纯函数读原样复用：** 从哈希绑定模块里抽出原生 `pr` 并改名成 `ccgatewayJoinAppend`（`patch-cli-2.1.304.cjs:147-150`），而不是自己写"两段提示词怎么拼"。
5. **补丁器本身的工程纪律：** profile 绑定模块哈希、`once()` 唯一性检查、AST 定位而不是全文 `replace`、`checkImports` 校验补丁新增的每个导入名确由哈希绑定模块导出（`patch-cli-2.1.304.cjs:193-246`）。这套机制让"升级一次、重审一次"成为可能。

真正不优雅的：

1. **v25 的 beta 顺序是"补丁的补丁"。** 它承认了"自己拼顺序"这件事本身：补丁期用正则从 `uXn` 的压缩文本里抠 `zr.push(X)` 的顺序，生成一个 `ccgatewayBetaOrder` 塞进原生 core 作用域，再在两层（`request-command.js` 与 `request-options.js`）各插一次。概念是对的（顺序来自原生，不是硬编码表），落地是脆的。
2. **`content-policy.js` 是所有模块里最"自己写"的一块。** 517 行文本识别（环境行、撤回、代码围栏、计费头字段）。原生没有"解析自己渲染文本"的函数，所以不能全算重写；但实现里围栏状态被三处各扫一遍、每段用户文本被解析两次、`suspects`/`blocked` 状态机比实际需要复杂。
3. **接入面还不够小。** `request-entry.inc.js` 把 56 行接线（15 个动态 import、三个适配闭包）直接注入原生入口；`natives` 适配层只覆盖一半（另一半由支持模块直接 import 原生 chunk），两种边界并存。
4. **beta 与身份行的装配分散在两到三层，各算一遍。**

一句话：**"把决定权交回原生"这件事做对了 80%，剩下 20% 恰恰是最近两版（v24/v25）为对齐抓包补进来的东西——它们是"补丁的补丁"，也是这次审核最该动手的地方。**

---

## 1. 逐模块评分

| 模块 | 评分 | 一句话理由 |
|---|---|---|
| `patch-cli.cjs` | 尚可 | 只做版本分派，正确；单元素数组 `['2.1.304']` 是无意义的壳。 |
| `patch-cli-2.1.304.cjs` | 尚可 | AST 锚点 + 哈希绑定 + `checkImports` 是同类工程的上限；扣分在 `qmn` 一个函数里 10 个锚点、以及 v25 的 `zr.push` 文本正则（全文件唯一一处脱离 AST 的扫描）。 |
| `request-entry.inc.js` | 不优雅 | 56 行接线注入原生入口：15 个动态 import、`ccgDirect`/`ccgAgent`/`prefixBuild` 三个适配闭包。逻辑本身没错，但放错层，且无法普通单测。 |
| `request-command.js` | 尚可 | 主流程清晰（读入→准备→发送→输出），`prepareDirect`/`prepareBuild` 拆得对；扣分在参数膨胀（`state,options,signal,controller,run,{...}`）、beta 放置与 UA/身份头二次推导。 |
| `request-build.js` | 尚可偏优雅 | 原生探针、原生工具池、原生断点标记是真正的复用；扣分在 7 个 `ccgateway*` 伪选项穿进原生 options（`buildOptions`）、`limitBreakpoints` 手写上游 4 断点规则。 |
| `request-options.js` | 尚可 | `normalizeBetas`/`setProtocolHeaders` 小、清楚；`placeBetas` 是"自己实现顺序"的落点；文件同时装了 CLI 参数解析、HTTP 头策略、beta 规范化三件事。 |
| `request-policy.js` | 尚可 | 校验集中、错误清楚；`identityLineChoices` 与 Go 侧 `contracts/features/identity_line.go` 同一张表两处维护；`build_identity_lines` 兼容分支是历史包袱（有意保留）。 |
| `request-input.js` | 尚可 | 组件→CC 记录的适配层，职责单一；`record()`/`messageRecord()`/`systemRecord()` 手写原生记录形状（原生已有 `ile` 建 `api_system`）；`parseComponents`/`validateToolPairs`/`splitTools` 有一定重复校验。 |
| `request-parameters.js` | 尚可 | 并回原生不拥有的参数，边界明确；`nativeFields`/`nativeOutputFields`/`clientOnlyFields` 是手抄的原生字段名单，升级会漂（有测试兜底）。 |
| `model-request.js` | 尚可 | 需要"原始字节 + 自己 stdout"才自建流读取，理由成立；但它绕开了原生 `beta.messages.create`，于是自己接手了 beta 头、`?beta=true` 路径和非流式超时。 |
| `request-output.js` | 优雅 | 17 行，只做一件正确的事（写 + 中止）。 |
| `request-error.js` | 优雅 | 协议帧自洽、有界（64KB 预览、32 个头）；错误分类表是协议的一部分，不算重写原生。 |
| `request-identity.js` | 尚可 | 身份来源/载体选择清楚、复用原生 `yBe`；`applyBuildCliPrefix`/`prefixPosition`/`checkedPrefix`（107-125）复刻了原生 `PAs` + `recordedCliPrefix` 已经能做的事。 |
| `request-agent.js` | 尚可偏优雅 | 明确定位为"只选择 CC 的四个输入，头由原生写"，这是正确抽象；`clientFields` 正则与原生常量（`uYo=32`/`cYo=4096`/UA 形状）手抄，模块级可变 `requestUserAgent` 是隐式全局。 |
| `content-policy.js` | 不优雅 | 最大的一块自写逻辑（517 行）：围栏状态三处重复、`recognizedUser` 每段解析两次、`suspects`/`blocked`/`unsupported_format` 多状态；但原生确实没有对应解析器，属"必要但可压缩"。 |
| `direct-billing.js` | 尚可 | 原始 JSON splice 是 direct 透传的唯一正确做法，`systemAsBlocks` 的规则有原生依据（侧请求的 string system 形状）；`billingItems`/`arraySystemEdits` 的 pending+order 机制偏绕。 |
| `raw-json.js` | 尚可 | 无原生等价物，字节保真必须自己扫；59 行可读。`skipString`/`skipValue` 多导出了。 |
| `shared.js` | 优雅 | 5 个小函数一张表，无隐藏语义。 |
| `native-tools.js` | 尚可 | 造一个"惰性 CC 工具"让原生策略看到它，思路对；`nativeDefinition` 复刻了原生 `FH` 的返回形状（可改成在原生结果上覆写）。 |
| `container-resources.js` | 尚可 | cgroup 分配读取是原生没有的能力（原生 `Ali` 只报 host/statfs），必须自写；DI 默认参数是测试缝。 |
| `native-environment-2.1.304.inc.js` | 优雅（密度高） | 词表推导与原生探针是这套补丁的灵魂；`ccgatewayEnvironment` 复刻了原生 `Wkt` 的收集顺序（见 2a-2）。 |
| `profiles/linux-x64-2.1.304.json` | 优雅 | 版本、能力、支持模块、哈希一处定义，补丁器与测试共用。 |
| `test/` | 尚可 | `npm test` 只跑 `*.test.mjs`，`test/` 里还有 11 个不被 `npm test` 执行的 `*.cjs` 探针/回放脚本（约 10 万字节），没有说明哪些还有用。 |

---

## 2. 重点问题

### 2a. 自己重写了原生已有的逻辑

按"能不能改成调原生"排序，每条给位置、为什么不优雅、更优雅做法、风险、出口是否变。

| # | 位置 | 重写了什么 | 原生里已有的东西 | 更优雅做法 | 风险 | 出口变? |
|---|---|---|---|---|---|---|
| a1 | `request-identity.js:94-125`（`prefixPosition`/`applyBuildCliPrefix`/`checkedPrefix`） | 身份行插在哪、`none` 时怎么补 `fallback` | 原生 builder 内部就是 `PAs(n, cW, {...})`，其中 `cW = n1n({isNonInteractive, hasAppendSystemPrompt, recorded: J.recordedCliPrefix})`，`PAs` 无条件把 `[计费行, 身份行, ...提示词]` 拼起来（`chunk-rncrmfyt.js` 内 `PAs` 调用点、`chunk-t61vswm2.js` `PAs`/`n1n`） | 给 build 的 options 加 `recordedCliPrefix`：客户端已有身份行时传 `null`（`PAs` 的 `.filter(Boolean)` 会丢掉），否则传选出那一行的文本。删掉 `applyBuildCliPrefix` 和 `prefixBuild` 透传 | 中：要确认 `recordedCliPrefix` 在 build 作用域被读到（`buildOptions` 与 `qmn` 是同一 options 对象），并用 `patch-wire-preservation` 对拍 | 否（同一位置：计费行之后、客户端首块之前） |
| a2 | `native-environment-2.1.304.inc.js:3-46`（`ccgatewayEnvironment`） | 环境快照的字段逐个读取（`gH`/`Cl`/`hK`/`uoo`/`poo`/`moo`/`Nkt`/`platform`） | `Wkt({cwd, additionalWorkingDirectories})` 就是这件事（`chunk-rncrmfyt.js` 内 `Wkt`，`cle()` 覆盖、`isWorktree`、`isGitRepo`、`shell`、`osVersion`、`scratchpadDirectory`、`githubCli` 全在里面） | 需要全部字段时直接 `await Wkt({...})`，只在"只要少数字段"时走按需读取；或者把按需读取收敛成一个 `{field, reader}` 表 | 中低：按需读取是为了不跑昂贵的 git 检测；`Wkt` 会全读。若原生以后给快照加字段，我们的手写版会静默少一个字段（这是真正的漂移风险） | 否（`zkt` 渲染同样的快照） |
| a3 | `request-input.js:15-41`（`systemRecord`） | `{type:'api_system', message:{role:'system', content}, uuid, timestamp}` | 原生 `ile(e)` 就是这个记录工厂（`chunk-rncrmfyt.js`，`ile` 产生 `api_system`） | 补丁在 core 尾巴加一行 `export {ile as ccgatewaySystemRecord}`（与抽出 `pr` 同样的手法），`systemRecord` 只在其上加 `ccgatewayWireSystem`/`toolAdditions` 等自有字段 | 低 | 否 |
| a4 | `native-tools.js:27-34` + `patch-cli-2.1.304.cjs:96`（`FH` 改写） | CC 工具定义的字段组合（`name`/`description`/`input_schema`/`defer_loading`/`cache_control`） | 原生 `FH` 自己就会从工具的 `name`/`descriptionText`/`inputJSONSchema` 组出这份定义（`chunk-rncrmfyt.js` 的 `FH` 尾部），并且已处理 hipaa 剥离 | FH 的补丁改成"先跑原生结果，再把 `e.ccgatewayRequestDefinition` 覆写上去"（`{...native, ...e.ccgatewayRequestDefinition, ...description 处理}`），删掉 `nativeDefinition` 与补丁里的 `dsi` 复刻 | 中：`FH` 尾部很长，改写方式要从"函数头插入早返回"变成"包一层"，需对拍工具定义字节 | 可能变（原生会多带它自己的 `strict`/`eager_input_streaming` 条件），需对拍；目标是更接近官方 |
| a5 | `request-input.js:161-176`（`messageRecord` 的 assistant 分支） | assistant 记录的 `id: msg_<uuid>`、`type:'message'`、`stop_reason:null`、全零 `usage` | 原生在 query loop 里内联构造 assistant 记录（`chunk-rncrmfyt.js` 约 4.88M 偏移处的工厂、以及 loop 里的 `type:"assistant",uuid:...`），没有导出的通用工厂 | 至少要核实这些字段是否被原生读到：build 路径上 `Gmn` 被 `ccgatewayInput` 短路、`Xfr` 的输出被 `ccgatewayWireMessages` 覆盖，多数字段到不了出口。把**实际上没人读**的字段删掉，只留 `{type, uuid, timestamp, message, ccgatewayWireMessage}` | 低 | 否（如核实无人读） |
| a6 | `request-identity.js:33,48-52`（`flat()`/`encode()`） | `user_<device>_account_<uuid>_session_<id>` 载体格式 | 原生 `yBe` 只产 JSON 值；这个扁平格式是**客户端/Worker 协议**（Go 侧 `engine/request_identity.go:132-134` 同一正则、同一拼法） | 不需要调原生；但两处（JS 与 Go）是同一格式的两份实现，应放同一个契约夹具，改一处另一处测试红 | 低 | 否 |
| a7 | `request-options.js:117-123`（`apiKeyRequestHeaders` 排除登录 beta） | "API key 不发 login beta" | 原生 `S8n` 的 `gTe` 规则本来就是 `when: () => kt() || …`（有登录才加）；而 build 里 `mt` 被客户端 betas 整体替换，所以必须在头层补一手 | 维持现状，但把这个不变式写成一处（见 b3）：只有"替换了 mt"这一个原因导致需要手工排除 | 低 | 否 |

补充（**不是**重写、不应改）：`direct-billing.js` 的原始 JSON 扫描（direct 必须字节透传）；`content-policy.js` 对 CC 环境文本的识别（原生只渲染、不解析）；`request-options.parseRequestJSON` 的安全整数检查（`JSON.parse` 会丢位）；`container-resources.js`（原生没有 cgroup 分配读取）。

### 2b. "打补丁的补丁"（含 v25 专项评估）

| # | 位置 | 是什么 | 为什么不优雅 | 更优雅的做法 | 风险 | 出口变? |
|---|---|---|---|---|---|---|
| b1 | `patch-cli-2.1.304.cjs:155-162` | v25 在补丁期用 `/\bzr\.push\(([A-Za-z_$][\w$]*)\)/g` 扫描 `uXn` 的压缩文本，把 12 个原生 beta 常量名拼成一行源码，生成 `export function ccgatewayBetaOrder(model){...}` 追加到 core | ① 全文件唯一一处**脱离 AST 的文本扫描**（其他锚点都走 `nodes()`）；② 只匹配裸标识符，`zr.push(eS.beta)`（插件 beta）被静默漏掉；③ 12 个条件 push 无论条件是否成立都被当成"顺序位"，所以注释说"CC 的顺序"其实只是"一个偏序"；④ 只校验了 `g1t`/`H_t` 两个硬编码名字，其余 10 个名字是否仍在 core 作用域没有检查；⑤ 生成的代码依赖 core 的导入绑定（已核：12 个都在 core 的 import 里，但补丁器没验证） | 用 `nodes()` 找 `uXn` 函数体里的 `CallExpression`，callee 为 `zr.push`，参数为 `Identifier` 的按出现顺序收集（同一批 AST 工具）；对每个收集到的名字做"是否为 core 的导入绑定"校验；去掉两个哨兵名字，改成"集合非空且都解析得到" | 中低（只影响补丁期/排序，出口仅在异常输入下可能不同） | 否 |
| b2 | `request-command.js:135-149` + `request-options.js:96,99-113` | 同一份排序做两次：`prepareOutgoing` 先把 header 里的 betas 拆成"客户端/新增"再 `placeBetas`，`authenticatedRequestHeaders` 又把 `[oauthBeta]` `placeBetas` 一次 | 排序语义散在两个模块、两次插入，且第二次默认"第一次已经排好"——这个隐含前提没有任何断言 | 只保留一个 `finalBetas({client, added, order})`：build 直接返回 `{clientBetas, addedBetas}` 三元组（而不是先拼成 header 字符串再被上游解析回来），OAuth 的登录 beta 作为 `added` 的一项传进去，只调用一次 | 低 | 否 |
| b3 | `request-command.js:134`、`request-build.js:169-171` | 客户端计费头算两遍：build 内部已经 `billing.requestBilling(initial.systemBlocks)` 得到 `clientBilling`（用于请求类别），`prepareOutgoing` 又用**原始** `body.systemPrompt`/`body.system` 算一次（用于"是否保留客户端 UA"） | 两个来源不同形状：build 内是规范化后的 blocks，command 侧是原始组件。若客户端 `systemPrompt` 是字符串数组（Worker 的 `buildSystemComponent` 允许），`leadingBilling` 返回 `null` → "保留客户端 UA"恒为 false。这是一处真实的行为分叉，不只是重复 | `buildRequest` 的返回值带上 `clientBilling`，command 直接使用；`keepClientUserAgent` 只做比较，不再解析 | 低（改动点集中） | 可能变：build + 字符串数组 system + 带限定符的 CC UA 时会**开始保留客户端 UA**（更接近官方） |
| b4 | `model-request.js:72`、`78-87` | v24 硬编码 `'/v1/messages?beta=true'` 并自己拼 beta 头 | 这个字符串是原生 SDK `Ps.create` 里的路径（`chunk-38xgev2z.js`）；我们绕开 `client.beta.messages.create` 才需要抄它 | 两条路：**(i)** build 模式改用原生 `client.beta.messages.create(body,{headers,...}).asResponse()`（路径、`?beta=true`、`betas`→头、非流式超时、`x-stainless-helper` 全由原生给）；direct 因为要发原始字节串仍保留 `client.post`。**(ii)** 至少不要写字面量：补丁期用 AST 从哈希绑定模块提取该路径 | 中：原生 `create` 会 JSON 序列化 body（build 的场景正好是对象），但会多出 `x-stainless-helper`（有 server tool 时）与原生超时计算 | (i) 可能变且**更接近官方**；(ii) 否 |
| b5 | `request-policy.js:9-16` vs `contracts/features/identity_line.go:43` | entrypoint→身份行候选表两处维护 | 同一张表在 JS 与 Go 各一份，任一侧改了另一侧不会红 | 用一份 JSON 夹具（或补丁期从 Go 常量生成），两侧测试都读它 | 低 | 否 |
| b6 | `request-policy.js:69-88`、`request-parameters.js:9-20`、`request-agent.js:19-38` | 硬编码的自然顺序/字段名单（附件顺序 `environment,model,total_tokens,date`、原生拥有的 body 字段、CC 头正则与 `32`/`4096` 上限） | 都是"原生知识的副本"，没有对账机制；`uYo=32`/`cYo=4096` 是原生常量（`chunk-rncrmfyt.js`） | 附件顺序来自 `ccgatewayLayerAttachments` 的 if 顺序，可让 inc 导出一个 `order`；字段名单至少加一条测试：与原生 body 字面量的键集对账 | 低 | 否 |
| b7 | `request-command.js:188` | `entrypoint === 'cli'` 判断"是否终端人类输入" | 这是把原生的"入口名"当成"交互性"的代理判断；原生 `n1n` 用 `isNonInteractive`/`hasAppendSystemPrompt` 两个布尔 | 用 `identityLineFor` 同一套输入判断（`cli` 只在非交互为 false 时出现），或直接把 `n1n` 的选择结果作为 turn 的交互性来源 | 低 | 否 |
| b8 | `direct-billing.js:33-39`（`systemAsBlocks`） | 字符串 system 拆成"计费行一块 + 其余一块" | 规则有原生依据（`IAs` 之后的第一块），但实现是手写正则；原生没有"string→blocks"的导出函数 | 保留（无原生替代），把注释里的原生依据指向具体符号即可 | 低 | 否 |

**v25 专项结论（回答"是不是最优雅、有没有更原生的接入点"）：**

- **概念是对的。** 顺序来自原生（`S8n` 的模型表 + `uXn` 的 push 顺序），而不是把 header 字符串表抄进仓库；客户端 betas 保持客户端顺序、只给"我们加的"找位置，这条规则也说得通。相比硬编码一条 12 项链，这是正确方向。
- **落地不是最优雅。** 三处可改：(1) 用 AST 而不是文本正则收集 `zr.push`，并校验名字都在 core 作用域（b1）；(2) 顺序的消费只发生一次（b2）；(3) 生成的函数不必放进原生 core 模块——12 个常量里 11 个由 `chunk-4qs43hr1.js` 导出、`S8n` 由 `chunk-7p6jp6kj.js` 导出，只有 `$W` 没导出；只要补丁在 core 尾巴补一行 `export {…, $W}`，`ccgatewayBetaOrder` 就可以放进**支持模块**，和别的支持模块一样被 `checkImports` 校验、被单测用桩模块覆盖，原生 core 只多一行导出。
- **有没有"只改一个锚点让原生自己产生顺序"的做法？** 有，但只对 build 成立：原生在 `_p = mN(xT)`（`chunk-rncrmfyt.js`，uXn 尾部）已经算好按原生顺序排的 header 列表，并且 firstParty 下 `body.betas = CHe(vFr(xT))` 就是同一份；现有拦截点（`patch-cli-2.1.304.cjs:119`，`let eo=HTe(()=>sF({maxRetries:0,`）在它之后，可以顺手把 `_p` 一起 yield 出去，build 就不必再"重建顺序"。但要注意：**build 的原生结果本身就满足不了 v25 的目标**——patch 把 `mt` 换成了客户端列表，native 只会把 per-request betas 追加在客户端列表之后；v25 想做的是"官方客户端会写在哪"，这是官方模型表顺序，原生构建器此刻并不知道。所以这个 yield 只能作为"新增 beta 的相对次序"来源，`S8n(model)` 仍然要调一次来拿模型表位置。换句话说：**v25 本质上是一次"按官方形态重排"，不是"让原生重排"**，注释里不要写成后者。
- **顺带风险：** `ccgatewayBetaOrder(model)` 现在对 **direct + API key** 也会执行（`prepareOutgoing` 无条件调用），而该路径根本不用 `betaOrder`；`S8n` 会拿客户端模型名跑原生模型表/能力缓存。若某个上游模型名让原生抛错，一条本来可用的 direct 直通会变成 500/本地错误。建议只在 build 或 OAuth 时计算，并 `try/catch` 回退成空顺序（等价于 v24 的"追加在末尾"）。

### 2c. 补丁锚点

现状：`patch-cli-2.1.304.cjs` 里 32 处 `once()` 字符串替换 + 6 处 `edit()` + 2 处 AST 抽取（`pr`、`uXn`）。分布：

| 位置 | 锚点数 | 评价 |
|---|---|---|
| `cli.js` `Ve`（入口） | 1（1 行锚点 + 56 行注入代码） | 锚点短、唯一性有检查；问题是**注入的代码太长** |
| `chunk-dxktn51d.js` `Yi` | 1 | 只在会话 id 上插入一个原生调用，最小 |
| `chunk-yqea5hk4.js` `Ali` | 5 | 资源报告：4 个数值替换 + 1 个跳过。都是"把原生的 host 视图换成容器视图"，语义单一 |
| `chunk-sx3g9k86.js` `V` | 2 | 同上 |
| core `FH` | 1 | 早返回 |
| core `qmn` | **10** | 一个函数 10 个锚点：tools/system/messages×2/betas/extraBody/fingerprint/capture/yield。这是补丁最大的接入面 |
| core `Gmn` `jA` `Xfr` | 3 | 外部消息绕过原生修复/归一化所需的三个小口 |
| `chunk-38xgev2z.js` `sF` | 4 + 1 | "API-key-only 路由"这一个概念拆成 5 个锚点 |
| `chunk-38xgev2z.js` `nl` | 1 | UA |
| `chunk-t61vswm2.js` `PAs` | 1 | 捕获原生计费行 |
| core `_oo` | 1 | 让渲染器接受预渲染的代理文本（见下） |
| AST 抽取 | 2 | `pr` 改名复用、`uXn` 顺序扫描 |

问题与建议：

1. **`qmn` 的 10 个锚点可以少一半（语义上）。** 它们都在表达同一件事：`ccgatewayBuildOnly` 时用外部输入替换原生 wire。可以引入一个早期派生变量（例如在 `qmn` 开头 `let ccg=J.ccgatewayBuildOnly===true?J:undefined`），后续 8 个 `J.ccgatewayBuildOnly===true?…` 改成 `ccg?…`。锚点数量不变，但生成代码更短、重复条件更少、读起来是一个开关而不是 8 次 mag。真正减少锚点需要原生提供"wire 注入"钩子，不现实，不建议强求。
2. **`sF` 的 4 个锚点是一个概念。** 建议在补丁器里把这一组命名为 `apiKeyOnlyRoute`，一次 `edit('chunk-38xgev2z.js','sF', …)` 里集中写完并加注释；另外三个"跳过"锚点可以合成一个 `once` 序列，避免读补丁时以为是四处独立改动。
3. **`_oo` 的 `ccgatewayProxyText` 补丁值得复核是否还需要。** `content-policy.js` 的 `readServerFields` 已经用 `snapshot.fieldText` 对 `agent_proxy` 做替换/删除（`content-policy.js:282-285`），而 `_oo` 在 override 分支里本来就会渲染 `ule(override)`（与 `ccgatewayEnvironment` 传入的 `ccgatewayProxyText` 相同）。也就是说：正常分支下 `ccgatewayProxyText:null` 起的作用是**屏蔽**原生 `foo()` 的代理提示，而这同样可以由 `fieldText: {agent_proxy: null}` 表达。建议做一次对拍：若可删，则少一个原生渲染器锚点、少一个私有快照键。
4. **入口注入应改成"3 行桩 + 一个支持模块"（最高收益的锚点改进）。** `request-entry.inc.js` 的内容可以整体搬进新的支持模块 `request-entry.js`：它自己静态 import `chunk-*` 与 `ccgateway-*`（支持模块本来就这么做，`request-build.js` 已经直接 import core），只导出 `runRequestCommand(args, settings)` 与 `info()`。注入到 `Ve` 的代码变成：

   ```js
   if(e[0]==="--ccgateway-info"){console.log(JSON.stringify(CCGATEWAY_INFO));return}
   if(e[0]==="request"){let{runRequest}=await import("./ccgateway-request-entry.js");process.exit(await runRequest(e.slice(1),s))}
   ```

   收益有三层：补丁锚点从 56 行降到 3 行；接线逻辑第一次可以被普通单测覆盖（现在只能靠"打完补丁再跑"的集成测试）；`natives` 适配层随之消失（见 d1）。
5. **`messagesPath` 与 `betaOrder` 之外，尽量不要再新增"字面量式原生知识"**；新增时必须走"补丁期从哈希绑定源码提取"这条路，并在 `checkImports` 之外补一条"提取结果非空且符号可解析"的断言（v25 只做了一半）。

### 2d. 抽象 / 复用 / 解耦 / 嵌套 / 死代码

| # | 位置 | 问题 | 建议 |
|---|---|---|---|
| d1 | `request-entry.inc.js:9-57` vs `request-command.js:3-12`、`request-build.js:1-14` | 原生绑定两种边界并存：一部分经 `natives` 从入口传入（`oauthBeta`/`betaOrder`/`identityBuild`/`prefixBuild`/`directBuild`/`agentNative`），另一部分由支持模块直接 import（`sF`/`Al`/`mBr`/`setEntrypointOnRequests`/整个 core）。`runRequestCommand(args, natives = {})` 的默认值只为测试存在，生产每次都会传 | 统一成一种：支持模块直接 import（可被 chunk 桩替身替换，现有单测已这么做），入口只传 `settings`。`natives` 层删除，`?.` 分支随之消失 |
| d2 | `request-command.js:107-117,123-140,176-207` | 参数膨胀：`readRequest(state, options, signal, controller, run, {apiKey, natives})`、`prepareOutgoing(state, options, {body, rawBody, timeout, apiKey, signal}, natives)`；`state.phase` 在 4 个函数里被写 8 次 | 一个 `ctx = {state, options, run, signal, controller, apiKey}` 传下去；`phase` 收敛成 `setPhase()` 的两个调用点 |
| d3 | `request-command.js:111` + `model-request.js:92` | `checkModelRequest` 对同一请求校验两次（第 1 次在 `readRequest`，第 2 次在 `openModelRequest`） | 只留 `openModelRequest` 一处（或 `readRequest` 一处，`openModelRequest` 信任调用者） |
| d4 | `request-command.js:135-149` | `clientOrderedBetas` 依赖一个未写明的顺序不变式："`outgoing.headers['anthropic-beta']` 的前缀就是客户端顺序"（由 `finishBuilt` 的 `normalizeBetas(clientBetas, built.betas, layers?.betas)` 保证）。这不是错，但没有任何断言 | 让 build 直接返回 `{clientBetas, addedBetas}`，删掉"从 header 反解析"这一步（同时解掉 b2） |
| d5 | `request-command.js:58-62,81-82` | `delete process.env.ANTHROPIC_CUSTOM_HEADERS` 再在 `finally` 恢复：用环境变量做一次性隔离，且与 `patch-cli-2.1.304.cjs:131` 里"从 `me` 删除 authorization/x-api-key"的第二次兜底重复 | 保留（原生 `sF` 内部读 env，没有参数可传）；把两处合并成一个注释块说明"这是同一个不变式的两道保险"，或者在 sF 补丁里删掉删除循环（若确认 `te={}` 已足够） |
| d6 | `content-policy.js:117-131,144-153,156-173` | 代码围栏状态机写了三遍（`environmentRegions`、`regionEnd`、`regionEntries` 各扫一遍、各自维护 `fence`） | 一个 `fencedLines(text)` 迭代器返回 `{line, fenced}`，三处消费同一个序列 |
| d7 | `content-policy.js:248,325` | `recognizedUser(slot.text)` 对每个 user slot 解析两次（一次在 `applyContentPolicy`，一次在 `compactSlot`） | 把 ranges 存在 slot 上，`compactSlot` 复用 |
| d8 | `content-policy.js:37-42,108-113,156-175` | `suspects`（"像原生行但不是"）+ `blocked` Map + `unsupported_format`/`ambiguous`/`missing_baseline` 三种状态，只为把"不敢改"的行报给诊断 | 收敛成一条规则：`suspectedField` 命中即 `blocked`；删掉 `blocked` 的 Map（用 Set + 固定状态名）。约省 30 行、少一层状态 |
| d9 | `content-policy.js:420-428`（`nativeHeader` 的 entrypoint splice） | `setEntrypointOnRequests(entrypoint)` 已经让原生 `kLo` 生成带目标 entrypoint 的计费行（`kLo` 的 `S=TY()??env??"unknown"`，`H2r` 改的正是 `TY()`）；`nativeHeader` 再 splice 一次 `build_billing_entrypoint`，在 build 与 direct 两条路径上都是空操作 | 实测确认后删除 splice 与该函数的第二段（保留"生成头是否可用"的校验） |
| d10 | `request-identity.js:8-25,29-31,37-45` | `identity()` 每次调用都 `JSON.parse` + 全量校验；`requestSessionID()`、`target()`、`applyBuildMetadata()` 各调一次（同一进程内最多 3 次） | 进程内记忆一次（这是单请求进程，缓存即"解析一次"） |
| d11 | `request-agent.js:121-129` | `keepClientUserAgent` 既返回布尔又改模块级 `requestUserAgent`，调用方只取副作用（`request-command.js:134` 直接丢弃返回值） | 拆成 `setClientUserAgent(agent, client, sent)`（无返回值）与 `clientUserAgent()`；或把值放进请求上下文，由补丁读上下文（更彻底，但要改 `nl` 补丁） |
| d12 | `request-options.js` | 一个 133 行文件装了三件事：CLI 参数解析、HTTP 头策略、beta 规范化/排序 | 拆 `request-headers.js`（`authenticatedRequestHeaders`/`apiKeyRequestHeaders`/`setProtocolHeaders`/`placeBetas`），参数解析与 JSON 输入留在 `request-options.js` |
| d13 | `request-input.js:45-71,161-176,237-245` | `parseComponents` 校验了 `parameters.betas`，`validateBuildParameters` 又校验一次，`mergeAdditionalParameters` 第三次引用；`prepareBuildInput` 与 `validateToolPairs` 的失败形状（普通 Error vs `buildInputError`）不同（`request-input.js:6` 已改用统一的 `buildInputError`，但仍在多处重复校验） | 参数只校验一次（prior audit J12 已有方向，这里只剩重复引用） |
| d14 | `request-build.js:196-215` | `buildOptions` 把 7 个 `ccgateway*` 伪字段平铺进原生 options，补丁里 10 个锚点各读一个 | 收成一个 `ccgateway` 对象（`buildOnly`、`wire`、`probe` 等作子字段）；补丁锚点数量不变，但生成代码与读代码成本下降 |
| d15 | `request-parameters.js:9-20` | 三张手抄的原生字段名单，升级即漂 | 补丁期从 `$c` 对象字面量提取键集生成常量，并加一条"与原生键集一致"的测试 |
| d16 | `raw-json.js:1-14,16-56` | `skipString`/`skipValue` 导出但只在本模块用 | 去掉 `export`（或明确它们是公共 API 并加注释） |
| d17 | `patch-cli.cjs:7` | `if (!['2.1.304'].includes(version))` | 改回 `version !== '2.1.304'` |
| d18 | `test/*.cjs`（11 个） | `npm test` 只跑 `*.test.mjs`；`request-probe.cjs`、`websearch-probe.cjs`、`request-modes-probe.cjs`、`worker-policy-matrix.cjs`、`assembly-replay.cjs`、`live-official-client.cjs`、`official-client-replay.cjs` 等不被执行，也没有 README 说明何时手动跑 | 在 `README` 的测试节加一张"手动探针"表，或把确实无用的删掉（与 prior audit J21 同类） |
| d19 | `container-resources.js:35-39` | 默认参数 `enabled`/`read`/`disk` 是测试缝，生产只走第一形参 | 保留能力，但把注入参数挪到测试包装函数（`getContainerResourcesForTest`）以避免生产签名被测试塑造 |
| d20 | `request-agent.js:79-113` | `resolveAgentContext` 35 行、main/subagent 两支混在一个函数 | 拆 `mainContext`/`subagentContext`（两支各自 10 行左右），共用 `derive` |

---

## 3. 改进清单（按收益排序；「出口」= 上游实际收到的字节/头是否变）

1. **把 `request-entry.inc.js` 改成 3 行桩 + `request-entry.js` 支持模块**（解除 d1）。出口不变。收益最高：补丁面从 56 行降到 3 行，接线逻辑首次可单测。
2. **v25 顺序收集改成 AST + 作用域校验**（b1）。出口不变（异常输入除外）。去掉全文件唯一的文本正则，去掉 `g1t`/`H_t` 哨兵。
3. **beta 装配收敛成一个函数、一次调用**（b2/d4）。出口不变。删掉"从 header 反解析"。
4. **build 返回 `clientBilling` 供 `keepClientUserAgent` 使用**（b3）。出口**可能变**：客户端 `systemPrompt` 为字符串数组且 UA 带限定符时开始保留客户端 UA——与 v22 能力声明一致，更接近官方。
5. **身份行改走原生 `recordedCliPrefix`**（a1）。出口不变（需对拍）。删掉 `request-identity.js:99-125` 与 `prefixBuild` 透传。
6. **`systemRecord` 复用原生 `ile`**（a3）。出口不变。少一份记录形状的复制。
7. **`ccgatewayEnvironment` 改为调原生 `Wkt`（或按需表）**（a2）。出口不变；消除"原生新增快照字段则我们静默缺字段"的漂移风险。
8. **build 改用原生 `client.beta.messages.create`，direct 保留 `client.post`**（b4-i）。出口**可能变**：路径/`?beta=true`/betas 头/非流式超时/`x-stainless-helper` 由原生给出——更接近官方；必须用 `patch-wire-preservation` + 官方客户端对拍。若不采纳，至少用 AST 从原生提取 `messagesPath`（出口不变）。
9. **content-policy 的围栏扫描收敛成一个迭代器**（d6）。出口不变。
10. **content-policy 的 `recognizedUser` 只解析一次**（d7）。出口不变。
11. **content-policy 的 `suspects`/`blocked` 收敛成一条规则**（d8）。出口不变（保守行为保留）。
12. **删除 `nativeHeader` 的 entrypoint splice**（d9，先实测）。出口不变。
13. **`request-command` 参数对象化、`phase` 收拢**（d2）。出口不变。
14. **删掉重复的 `checkModelRequest`**（d3）。出口不变（本地错误帧文字相同）。
15. **把 beta 的"顺序"计算限制在需要它的路径，并 try/catch 回退**（b1 补充）。出口不变；避免 direct+API key 被 `S8n` 的未知模型行为拖垮。
16. **`request-options` 拆出 `request-headers.js`**（d12）。出口不变。
17. **FH 补丁改成"原生结果 + 客户端定义覆写"**（a4）。出口**可能变**（更接近官方定义生成），需对拍；同时删掉 `nativeDefinition` 与补丁里的 `dsi` 复刻。
18. **`identity()` 进程内解析一次**（d10）。出口不变。
19. **`keepClientUserAgent` 去掉"返回布尔 + 改全局"的双重语义**（d11）。出口不变。
20. **`$W` 补一行导出，把 `ccgatewayBetaOrder` 移出原生 core 到支持模块**（b1 补充）。出口不变；让这段逻辑进正常模块边界与单测。
21. **`_oo` 的 `ccgatewayProxyText` 复核是否可删**（2c-3）。出口不变（若 `fieldText` 已覆盖）。
22. **`request-parameters` 的原生字段名单改为从原生 body 字面量提取（或加对账测试）**（d15/b6）。出口不变。
23. **`request-policy.identityLineChoices` 与 Go 契约共用夹具**（b5）。出口不变。
24. **`patch-cli.cjs` 去掉单元素数组；`raw-json` 收回多余导出；`test/*.cjs` 补说明或清理**（d17/d16/d18）。出口不变。
25. **`container-resources` 的 DI 参数移出生产签名**（d19）。出口不变。

> 任何标记「出口可能变」的条目都是**故意的**：它们的方向都是"把决定权还给原生"，因此结果应当更接近官方客户端，而不是凭我们判断去改。落地顺序建议：先做 1–3、6–17（出口不变的），再单独一个提交做 4、8、17 三条需要官方对拍的。

---

## 4. 不建议改的

- **`direct-billing.js` + `raw-json.js` 的原始字节拼接。** direct 必须逐字节透传；`JSON.parse`/`stringify` 会改键序与数字形态。
- **`Gmn`/`jA`/`Xfr`/`qmn` 的 wire 短路。** 外部历史不能经过原生的修复、reminder 折叠、媒体裁剪，否则客户端字节会变。
- **`native-environment-2.1.304.inc.js` 的标记推导。** 它是"不抄措辞"的唯一办法；复杂度来自原生渲染器的形状，不是过度设计。
- **入口代码的懒加载。** 普通 CLI 启动不能拖上 request 命令的依赖树。
- **`build_identity_lines` 的兼容读取。** 契约要求旧核心升级前接受而不使用（prior audit A3）。
- **`natives` 里的原生值本身**（不是这层包装）：`oauthBeta`、`betaOrder`、身份行三选一，都应由原生提供；只是传递方式应改成支持模块直接 import。

---

## 5. 验证与方法

- 只读：未修改任何文件、未提交、未升 `extension`。唯一新增文件是本报告。
- 原生依据逐条核对过 `artifacts/claude-2.1.304/linux-restored/`：`uXn`（含 `zr.push` 12 处与 `zr.push(eS.beta)`）、`S8n` 与 `_0` 规则表、`_p=mN(xT)`/`CHe`/`mN`/`ZUo`、`PAs`/`n1n`/`t1n`/`B1s`/`kLo`/`IAs`、`recordedCliPrefix` 的读取点、`Wkt`/`ile`、`dN`、SDK `Ps.create`（`/v1/messages?beta=true`、`x-stainless-helper`、非流式超时）、`wR` 注册表顺序。
- 用 `@babel/parser` 复核了 `uXn` 的真实 AST 范围（8044 字符）与其中全部 `.push(` 调用，确认 12 个标识符、确认 `eS.beta` 被现有正则漏掉。
- 已跑（快速子集）：`node --test test/request-options.test.mjs test/request-identity.test.mjs test/request-policy.test.mjs` → 13/13 通过。未跑完整 `npm test` 与官方客户端对拍；本报告里任何"出口不变/可能变"的结论在实施时都必须用 `patch-wire-preservation-304.test.mjs` 与 `official-client-replay.cjs` / `live-official-client.cjs` 复核。

---

## 处理结果（2026-10-24）

按用户指示，本轮只做**出口不变**的条目：上游收到的请求字节与请求头与整理前相同（唯一例外是 v25 已故意改掉的 beta 顺序，保持现状）。第 4、5、8、17 条会改变出口，留作下一轮并与官方客户端对拍。工作树未提交、未推送；profile 的 `extension` 仍为 `ccgateway-v25-beta-order`；ELF 未编译（由用户编译）。

### 第 3 节逐条

1. **已做。** `request-entry.inc.js` 只剩两行代码（`--ccgateway-info` 与 `request` 分支），接线移入新的支持模块 `request-entry.js`（fast-path 策略、需要时才加载命令与原生绑定）；新增的支持模块 `request-entry.js`、`request-natives.js`、`request-betas.js`、`request-headers.js` 都登记进 profile 的 `supportModules`。`request-natives.js` 静态导入全部原生绑定，补丁期 `checkImports` 会逐个校验（test/patch-imports-304.test.mjs 的"未绑定模块"用例现在报在 `request-natives.js` 上）。`patch-wire-preservation-304` 里对入口文字的断言改成"三行桩 + 支持模块"两级断言，并新增 `request-entry.test.mjs` 覆盖接线（策略先行、拒绝帧 403、绑定形状）。
2. **已做。** 补丁器改为用 `nodes()` 在 `uXn` 的 init 里找 `zr.push(<Identifier>)`（AST，不再用正则），成员表达式（`eS.beta`）显式跳过并在注释里说明它不是模块常量；每个收集到的名字都用 `moduleBindings()` 校验是 core 的模块作用域绑定（import 或顶层声明），`g1t`/`H_t` 哨兵删除，改为"收集结果非空"断言。
3. **已做。** `buildRequest` 返回 `{ clientBetas, addedBetas }`；命令在 `prepareOutgoing` 里用 `requestBetas()` 一次装配（`finalBetas` 一次调用），删掉从 `outgoing.headers['anthropic-beta']` 反解析客户端顺序的 `clientOrderedBetas`；登录 beta 作为 additions 的一项一起放，`request-headers.js` 只负责写头（不再二次 `placeBetas`）。
4. **跳过，前提不成立。** Worker 把客户端的 system 原样作为 `systemPrompt` 传给 CLI（`companions/engine/request_components.go:51`），而 `systemPrompt` 只能是字符串或块数组；字符串数组不是合法的 Messages 请求，`leadingBilling` 对字符串数组返回 `null` 的分支在实际中到不了。`keepClientUserAgent` 保持现状。
5. **留作下一轮**（身份行改走原生 `recordedCliPrefix`）：报告标为"需对拍"，按用户指示与 4/8/17 一起做。
6. **已做。** 补丁在 core 尾巴加 `export {ile as ccgatewaySystemRecord}`；`request-input.js` 的 `systemRecord` 用原生 `ile(content)` 生成记录，再补 `ccgatewayWireSystem`/tool 变更字段。原生工厂由 `request-build.js` 传入（`prepareBuildInput({ systemRecord })`、`wireRecords(..., systemRecord)`），模块本身不引入原生依赖，单测显式传桩。
7. **已做（按需表方案）。** `ccgatewayEnvironment` 的逐字段读取收敛成一个 `{field, key, reader}` 表（`ccgatewayEnvironmentReaders`）；另导出 `ccgatewayEnvironmentSnapshotKeys`，`native-environment.test.mjs` 新增一条原生对账：从恢复源码的 `Wkt` 里取返回对象的键集，要求与我们的快照键完全一致。没有改成"全部字段时无条件调 `Wkt`"：`Wkt` 会读所有字段（含昂贵的 git 检测），且任一 reader 抛错会让整份快照失败，而按需读取要保持"某个字段不可用只影响该字段"的现有行为（现有单测 `native read errors are field-specific` 就是这条）。
8. **留作下一轮**（build 改用原生 `client.beta.messages.create`）：报告标为"出口可能变"，需官方对拍。
9. **已做。** 新增 `fencedLines(text)` 迭代器，`environmentRegions`、`regionEnd`、`regionEntries`、`billingCandidate` 共用这一次围栏扫描；围栏状态机只剩 `fenceAfter` 一处。
10. **已做。** `applyContentPolicy` 把每个 user slot 的 `recognizedUser` 结果存在 `slot.ranges` 上，`compactSlot` 复用，不再解析第二遍。
11. **已做（保守简化）。** `region.blocked` 的 Map 删除：`regionEntries` 通过 `block(field, status)` 回调直接记到 state 的 `blocked` Set 并立即出一条诊断；`suspectedField` 命中即 blocked 仍是唯一规则。两种 status（`ambiguous`/`unsupported_format`）保留：它们进 Worker 诊断日志，合并会改变可观测语义而不减少"不可编辑"的判定。
12. **已做（先核对原生再删）。** `kLo` 的 entrypoint 取 `TY()`（`setEntrypointOnRequests` 改的正是它），build 与 direct 都在原生生成计费头之前调用 `setEntrypointOnRequests`，所以 `nativeHeader` 里的 entrypoint splice 恒为空操作；删除 splice，只保留"生成头是否可用"的校验。`content-policy.test.mjs` 与 `contract-fixtures.test.mjs` 的对应夹具改成"原生头已带目标 entrypoint"。
13. **已做。** `runRequestCommand` 的参数膨胀收敛成 `ctx = {state, run, controller, signal, options, apiKey, natives}`，各步骤收一个 `ctx`；`clearMeta` 独立出来。`phase` 仍按步骤赋值：`readErrorBody`/`streamResponse` 在 transport/output 之间交替是错误帧分类所必需的，没有硬压成两个调用点。
14. **已做。** `checkModelRequest` 只在 `readRequest` 调用一次（输入阶段，错误帧仍是 400 `cli_invalid_request`）；`openModelRequest` 信任调用者，不再重复校验。
15. **已做。** beta 顺序只在"有 beta 要放"时计算（`requestBetas` 的 `missing` 非空）；`betaOrder` 包 try/catch，失败时返回空顺序（等价于追加）并向 stderr 写一行 `CCG_BETA_ORDER_UNAVAILABLE {"protocol":"ccgateway.beta_order.v1",...}`。注：Worker 的 stderr 读取器只认 `CCG_REQUEST_ERROR`/`CCG_CONTENT_DIAGNOSTIC` 前缀，未知前缀的行被丢弃；这条诊断目前只在本地运行与容器日志里可见，若要让 Worker 记录需要 Go 侧新增前缀（不在本次范围）。
16. **已做。** 新增 `request-headers.js`（`normalizeBetas`、`finalBetas`、`authenticatedRequestHeaders`、`apiKeyRequestHeaders`、`setProtocolHeaders`）；`request-options.js` 只留参数解析与 JSON 输入。
17. **留作下一轮**（`FH` 改"原生结果 + 客户端定义覆写"）：出口可能变，需对拍。
18. **已做。** `identity()` 按环境串记忆（同一进程只解析一次；换了 env 串会重新解析，测试仍可在同进程切上下文）。
19. **已做。** `keepClientUserAgent` 改成纯 setter `setClientUserAgent(agent, clientHeader, sentHeader)`（无返回值），读取仍走 `clientUserAgent()`。
20. **已做。** `ccgatewayBetaOrder` 移出原生 core：新支持模块 `request-betas.js` 导入 `S8n` 与构建器的 12 个 beta 常量，列表由补丁器 AST 填入。**与报告的一处偏差：**报告说"只有 `$W` 没导出、需要在 core 补一行导出"，实测 `$W` 已由 `chunk-4qs43hr1.js` 导出（12 个常量全部导出），所以原生 core 不需要这一行；本轮 core 只多了第 6 条的 `export {ile as ccgatewaySystemRecord}`。
21. **复核后保留，未删。** `fieldText: { agent_proxy }` 只能覆盖"替换成什么值"，而 `readServerFields` 是**先解析**原生环境快照文本再做替换的，并且要求解析出的 region 没有 blocked 字段；若删掉 `_oo` 的 `ccgatewayProxyText`，进程自身的代理提示会进入快照，一旦其措辞落在 `suspectedField` 的判定里就会把 `agent_proxy` 标成 blocked，导致 503。要删必须与官方对拍（报告自己也写"建议做一次对拍"），留下一轮一并做。
22. **已做（对账测试方案）。** 不改成"补丁期从原生 body 字面量生成名单"：原生 body 里有 `context_management`、`safeguards`、`speed`、`thread` 等允许客户端覆盖的扩展字段，按字面量决定"原生拥有"会改变出口。改为导出 `nativeParameterFields` 并在 `request-parameters-304.test.mjs` 里用 AST 读原生 `$c` 字面量：原生拥有的字段必须都在字面量里，字面量里的每个字段要么被适配层拥有，要么在显式的扩展名单里——原生新增字段会让这条测试红。
23. **已做（源码对账方案）。** 新增测试读 `companions/contracts/features/identity_line.go`，把 `IdentityLineChoices`、`BillingEntrypoints`、`DefaultBillingEntrypoint` 与 `request-policy.js` 的表逐项比较；改任一侧另一侧测试红。没有另建 JSON 夹具：Go 侧的常量就是夹具，避免第三份拷贝。
24. **已做。** `patch-cli.cjs` 的 `!['2.1.304'].includes(version)` 改回 `version !== '2.1.304'`；`raw-json.js` 收回 `skipString`/`skipValue` 的导出（仍导出 `skipWs`/`members`/`elements`/`member`）；README 的测试节加了"手动探针"表（`official-client-replay`、`live-official-client`、`worker-policy-matrix`、`assembly-*`、`request-*-probe`、`analysis/*` 各何时跑）。探针脚本未删除（其中记录了对拍方法）。
25. **已做。** `container-resources.js` 的生产签名改为 `getContainerResources()`（只读环境），测试注入挪到 `getContainerResourcesForTest({enabled, read, disk})`；原生补丁仍调用无参版本。

### 未做、留作下一轮（需要官方客户端对拍）

- 第 4 条（前提不成立，本身不做）。
- 第 5 条（身份行走原生 `recordedCliPrefix`）。**2026-10-24 第二轮已做，见下。**
- 第 8 条（build 改用原生 `client.beta.messages.create`）。**2026-10-24 第二轮已做，见下。**
- 第 17 条（`FH` 覆写原生结果）。**2026-10-24 第二轮已做（改为客户端定义逐字返回），见下。**
- 第 21 条（`_oo` 的 `ccgatewayProxyText`）：复核结论是删除会让未请求的代理提示进入快照并可触发 blocked→503，需对拍。

另外两项按报告"视可行性"处理成别的形态：第 7 条用按需表而不是无条件 `Wkt`；第 22 条用原生 body 对账测试而不是补丁期生成名单（理由同上）。

### 验证

- `cd next/plugins/ccgateway/companions/cli-mods && npm test`：**179/179 通过、0 跳过**。原生相关测试（`patch-wire-preservation-304`、`patch-imports-304`、`native-environment`、`native-vocabulary`、`cli-prefix` 末项、`billing-fingerprint-oracle`、`request-parameters-304` 的 body 字段对账、`request-policy` 的 Go 契约对账）全部真跑。
- 重新打补丁（输出目录先清空）：`node next/plugins/ccgateway/companions/cli-mods/patch-cli.cjs artifacts/claude-2.1.304/linux-restored artifacts/claude-2.1.304/patched-v25` 成功；manifest 的 `extension` 仍为 `ccgateway-v25-beta-order`，`files` 7 个、`supportFiles` 21 个（含新增的 `ccgateway-request-betas.js`、`ccgateway-request-entry.js`、`ccgateway-request-natives.js`、`ccgateway-request-headers.js`）。
- 未编译 ELF、未提交、未推送。

---

## 第二轮：第 3 节剩余三条（出口可能变的三条）

2026-10-24，按用户指示做第 5、8、17 条——它们的方向都是"把决定权还给原生"。profile 的 `extension` 升为 `ccgateway-v26-native-assembly`；工作树未提交、未推送；ELF 未编译。

### 第 5 条（a1）身份行走原生 `recordedCliPrefix`

**原生核实（先读源码再改）：**

- **读取点唯一。** `chunk-rncrmfyt.js` 的 `qmn` 里 `cW=n1n({isNonInteractive:J.isNonInteractiveSession,hasAppendSystemPrompt:J.hasAppendSystemPrompt,recorded:J.recordedCliPrefix})`；`jOt → ugn → qmn` 把 build 的 options 原样透传（`qmn(e,n,r,s,h,{modelFacts:y,...S})`，`J` 由 `S` 得来），所以 build 的 `buildOptions` 加 `recordedCliPrefix` 确实会被读到。core 没有第二处读它（`chunk-gzc5bc6y.js` 里的同名键属于主循环的 prompt 快照，不在 build 路径）。
- **`n1n` 对 null/字符串：** 先判 `Pe()==="vertex"` 返回交互行；否则 `e?.recorded!==void 0` 时**原样返回 recorded**（`null` 也返回 `null`）；`recorded` 为 `undefined` 时才按 `isNonInteractive`/`hasAppendSystemPrompt` 三选一。
- **`PAs` 的位置：** `[header, line, ...prompt].filter(Boolean)`，即"计费头之后、提示词之前"；`null`（或空串）被 `.filter(Boolean)` 丢掉，等于不插行。所以"有行/无行"原生能表达。
- **"none / fallback"映射：** `none` = `recorded:null`（原生 filter 丢弃）。`fallback`（系统首块既不是计费头也不是身份行时仍须有一行，否则上游 429）**不是原生概念**：`n1n` 只会给三行之一或 null，`PAs` 不会替"首块不是头"补行。这一小段保留在 build 里。

**落地（含一处必须保留的原因）：**

- 给 build 的 query options 加 `recordedCliPrefix`（`request-build.js` 的 `identityRequest`）：`null` 或 `n1n` 渲染出的行文本。`null` 的情形=API key 构建、客户端自己的请求（system 带计费头，`clientBilling !== null`）、system 里已经有 CC 的身份行（不重复插）。
- 原生 `PAs` 拼出的 system 在 build 里会被 wire 短路替换成 `J.ccgatewaySystemBlocks`（补丁 `system:...J.ccgatewaySystemBlocks:jh.system`；这是 §4"外部 system 原样"规则，本轮不动），所以不能直接让 PAs 的 system 上线。补丁在 `PAs` 里新增一行 `r.ccgatewayCapturePrefix?.(n)`，把原生实际用的那一行（`n`，即 `n1n` 的输出）交回 build；build 在 `mergeBillingAttribution` 之后按 PAs 的同一位置插入它（有计费头→其后，否则最前），`request-build.js applyIdentityLine`。
- 删除：`request-identity.js` 的 `applyBuildCliPrefix`/`prefixPosition`/`checkedPrefix`、`request-natives.js` 的 `identityLines` 表与 `prefixBuild`、`request-entry.js`/`request-command.js` 的 `prefixBuild` 透传，以及"命令在 build 之后插行"这一步。行文本仍只由 `n1n` 渲染（`identityLineText`：三个契约名对应三组原生输入，`request-build.js`）。
- 选择哪一行仍是 `request-policy.js identityLineFor`（Worker 契约）；原生负责渲染文本、`PAs` 负责位置、`recordedCliPrefix` 负责"有/无"。

**预计出口：不变。** 行文本、行位置（计费头之后、客户端首块之前）、以及"客户端已有的行不覆盖不重复"、"API key 不加行"、"无计费头时用 fallback 行兜底"都与 v25 相同（`request-injection.test.mjs` 覆盖：有头→头后、无头→最前、客户端行保留、API key 无行）。判定条件与 v25 的 `prefixPosition` 一一对应：有计费头时"任一块已是身份行→不加"，否则"首块是身份行→不加，否则最前"，因此没有已知的出口差异。

### 第 8 条（b4-i）build 改用原生 `client.beta.messages.create(...).asResponse()`

**原生核实：** `chunk-38xgev2z.js` 的 `Ps.create(r,n)`：

- 路径写死为 `this._client.post("/v1/messages?beta=true", ...)`；
- `betas`/`user_profile_id`/`workspace_id` 从**请求参数对象**（body）里取出并变成头，不留在 body；
- `x-stainless-helper` 只在 tools/messages 带 SDK 的 `Symbol.for("anthropic.sdk.stainlessHelper")` 时出现（`Ho`/`Ui`），JSON 反序列化来的对象永远没有；
- 非流式超时：`v = n?.timeout ?? client._options.timeout`；`!body.stream && v == null` 时才 `calculateNonstreamingTimeout(max_tokens, gs[model])`，该函数在 `max_tokens` 超过 600 s 预算时直接抛 "Streaming is required…"；
- `stream` 取自 body（`s.stream ?? false`），body 经 `qu()`（把 `output_format` 挪进 `output_config.format`，两者同现则抛错）后浅拷贝交给 `client.post`。

**落地：** `model-request.js sendOnce` 对 build（`nativeCreate`）调 `client.beta.messages.create(options.body, {headers, signal, maxRetries:0, timeout})`，direct 继续 `client.post` 发原始字节。不向 create 传 `betas`——最终 `anthropic-beta` 仍由 `request-headers.js`/fetch 边界统一写，顺序不变。`messagesPath` 不再是字面量：补丁期用 AST 在 `chunk-38xgev2z.js` 找到唯一一条 POST 到 beta Messages 端点（`/v1/messages?beta=true`，batches/count_tokens 是别的路径）的字符串，填进 `model-request.js` 的 `/*CCGATEWAY_MESSAGES_PATH*/` 标记；direct 用它。

**预计出口：**

- 普通 build 请求**不变**：URL/查询相同；body 的 JSON 字节相同（无 `output_format` 时 `qu` 原样返回，`create` 只剥离上述三个参数）；`anthropic-beta` 的值与顺序相同（我们不传 betas）；`content-type: application/json` 由 SDK 的 JSON 序列化器给出（与之前手写同值）；`X-Stainless-Timeout` 同为 `min(timeoutMs,600000)`（显式 timeout，原生非流式规则不触发）；**无** `x-stainless-helper`（JSON 工具没有 symbol）。
- 会有三处变化，方向都是更像官方 SDK：① 客户端 `parameters.output_format` 会被原生 `qu()` 挪到 `output_config.format`（若同时给了 `output_config.format` 则本地报错）；② `parameters.user_profile_id` / `workspace_id` 会从 body 移到请求头；③ 模型为 `claude-mythos-preview` 或 `claude-opus-4-6` 且 thinking 为 enabled 时，SDK 向 stderr 打一条弃用警告（Worker 只认已知前缀，会丢弃）。
- 这些都需要与官方客户端对拍确认后再上线。

### 第 17 条（a4）`FH` 补丁：客户端定义逐字返回（未采用"原生结果 + 合并"）

**原生核实：** `FH` 尾部组装 `qn={name, description, input_schema, ...eager_input_streaming, ...strict}`，再按 `n.deferLoading`/`n.cacheControl` 加 `defer_loading`/`cache_control`，按工具名加 `citations`，最后按供应商剥离；描述来自 `CVo`/`Jxe`（有 `dsi` 钩子时还会改）。如果"先跑原生 FH，再把 `e.ccgatewayRequestDefinition` 覆写上去"：

- `{...native, ...clientDefinition}` 会保留客户端没发的原生字段（`strict`、`eager_input_streaming`、`citations` 等），并且同名键的位置由原生决定——定义不再是客户端原样；
- 原生还会为合成工具跑描述生成、schema 归一化与工具定义缓存登记，结果随后被完全覆盖，纯属浪费，且对任意客户端 schema 有抛错风险。

**判断与落地：** 客户端工具的定义是客户端的数据，必须逐字原样（键顺序、字段）发出；只有 CC 自己的工具（注入层）才用原生定义。因此 `FH` 的 `ccgIsNative(e)` 分支直接 `return structuredClone(e.ccgatewayRequestDefinition)`，不跑原生描述/缓存/供应商逻辑；删除 `native-tools.js` 的 `nativeDefinition` 与补丁里 `dsi`/原生字段的复刻，core 只导入 `isNative`。注入层里 CC 自己的工具走原生 `FH`，不受影响。

**预计出口：不变。** build 的 wire tools 本来就被 `J.ccgatewayWireTools`（客户端定义）替换，`FH` 的结果只喂原生策略/搜索/遥测；客户端工具的定义一直由 `wireToolDefinitions` 逐字发出（键序与字段不变）。

### 第二轮验证

- `cd next/plugins/ccgateway/companions/cli-mods && npm test`：**178/178 通过、0 跳过**（`applyBuildCliPrefix` 的旧单测并入 `request-injection.test.mjs` 的 build 级用例；`model-request.test.mjs` 分 build/direct 两条路径）。原生相关测试全部真跑。
- 重新打补丁（输出目录先清空）：`rm -rf artifacts/claude-2.1.304/patched-v26 && node next/plugins/ccgateway/companions/cli-mods/patch-cli.cjs artifacts/claude-2.1.304/linux-restored artifacts/claude-2.1.304/patched-v26` 成功；`extension=ccgateway-v26-native-assembly`，`files` 7 个、`supportFiles` 21 个（无新增模块）。
- 未编译 ELF、未提交、未推送。
