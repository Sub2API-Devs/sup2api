# 2026-10-24 代码质量审核 04：cli-mods（注入 Claude Code 2.1.304 的 JS 补丁，CLI v23）

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](../../../plugins/ccgateway/docs/CLI-TEST-PLAN.md)。

范围：`f546fa31a..HEAD` 中 `next/plugins/ccgateway/companions/cli-mods`。重点是这次新写或重写的部分：
- 补丁器 `patch-cli.cjs`、`patch-cli-2.1.304.cjs`，以及 profile；
- `request-*.js`、`shared.js`、`request-entry.inc.js`；
- `content-policy.js`、`direct-billing.js`、`model-request.js`，以及测试。

同时查了已删除的 2.1.296/302 支持和已删除的 native/Mod 路径还剩什么。这是只读审核，没有改代码。下文路径都相对于 `next/plugins/ccgateway/companions/cli-mods/`。`jOt`、`aBe`、`chunk-xxxx.js` 这类压缩名的导入是有意绑定 CLI 的打包产物，不算问题。

## 摘要

- 这轮重构方向是对的：
  - `shared.js` 收拢了 `toBlocks`、`splice`、UUID 正则。
  - 能力列表只保留在 profile 里。
  - 入口代码挪进了 `request-entry.inc.js`。
  - `checkImports` 会核对补丁新增的每个导入名。
  - `request-command.js` 拆成 readInput / prepareDirect / prepareBuild / streamResponse 几步。
  - `npm test` 174 项全过，0 跳过（本机有恢复源码，原生对账测试真跑了）。
- **最大的残留：Mod 工具执行链仍整套打在 CLI 里。** Worker 从 2026-10-19 起只跑 `claude request`，而 `request` 只构建请求，在发送前就 `yield ccgateway_request` 返回，模型响应的规范化和工具执行都走不到。但下面这些都还在：
  - 补丁器里的 `Pb`、`GYr`、`Ua`、`computeToolPool`、`Ten`、`N_e`、`mIt`、`ton`、`addTool`、`bz` 十处改写；
  - `tool-dispatch.inc.js`；
  - `native-tools.js` 里的分发、合并、版本号逻辑；
  - `native_tools`、`mods_dispatch` 两个能力；
  - 测试探针和夹具；
  - README 里约 95 行的“历史”。

  构建路径真正还要用的只有 `FH` 改写，以及 `registerNative` / `findNative` / `isNative` / `nativeDefinition`。
- **真问题：**
  - direct 给没有 system 的请求补计费头时，把 `system` 插到 body 的第一个键。官方 2.1.304 的顺序是 `model, messages, system, …`（见 `artifacts/claude-2.1.304/official-request-304-fresh.json`），这与“线上形状与官方一致”的约束不符。
  - `buildRequest` 里的 `snapshotAttachments` 永远是空操作（死代码）。
  - `applyContentPolicy` 的 `native.billing` 分支和诊断里的 `rule_version` 都没有调用方。
- **复用：**
  - 环境字段和计费字段两张表、来源校验各写了两份（`content-policy.js` 和 `request-policy.js`）。同一个 policy 在一次 build 里被校验 3 次。
  - build 和 direct 各自解析请求入口（entrypoint）。
  - `request-entry.inc.js` 把同两个模块重复动态导入，“首个用户提示文本”的提取也写了两处。
  - `request-input.js` 的组件解析在 `buildRequest` 中跑两遍，第二遍只是为了把改写后的消息再转回记录。
- **长函数与深嵌套：**
  - `buildRequest`：约 91 行；
  - `applyContentPolicy`：约 84 行，嵌套 5 层；
  - `runRequestCommand`：约 79 行；
  - `environmentRegions`：约 54 行，嵌套 4 层；
  - `checkImports`：约 59 行，内嵌函数。

## 问题表

按价值排序。“行为变化”指上游实际收到的请求（字段、顺序、取值）会不会变。

| id | 位置 | 准则 | 问题 | 具体改法 | 风险 | 行为变化 |
|---|---|---|---|---|---|---|
| J1 | `patch-cli-2.1.304.cjs:54,78,79,81-89,92-94,140-146`；`tool-dispatch.inc.js`；`native-tools.js:34-86`；`profiles/linux-x64-2.1.304.json:11-12` | 简洁 / 残留 | 已删除的 Mod 工具执行链仍整套打进 CLI：<br>- `Pb`/`GYr`（`$.tool.register` 的 `kind:"native"`）<br>- `Ua`/`computeToolPool`（headless/TUI 工具池合并）<br>- `Ten`/`N_e`/`mIt`/`ton`/`addTool`/`bz`（响应规范化与工具分发）<br>- 第 145 行的 `ccgRevision`/`ccgMerge`/`ccgFind`/`ccgDispatch` 导入<br><br>`request` 命令在发送前就返回，这些都走不到。 | 删掉：<br>- 这 10 处 `edit`<br>- `dispatchNames`/`rename`<br>- `tool-dispatch.inc.js`<br>- `native-tools.js` 的 `dispatchNative`/`mergeNative`/`nativeRevision`/`resultText`，以及工具对象上的 `call`/`create`/`render*`/`mapToolResultToToolResultBlock`<br><br>保留 `registerNative`/`findNative`/`isNative`/`nativeDefinition` 和 `FH` 改写，只给 `core` 导入这四个名字；把 `marker` 改名为 `ccgateway.request-tool`。<br><br>同步删除：<br>- profile 的 `native_tools`、`mods_dispatch`（Go 侧没有任何地方检查它们）<br>- `test/native-tools.test.mjs` 的分发用例<br>- `test/runtime-probe.cjs`、`test/hook-probe.cjs`、`test/fixture/hooks/`、`Dockerfile`<br>- README 第 92–186 行，改为指向 296 文档<br><br>升补丁标签。 | 中。<br>- CLI 字节会变。<br>- `N_e` 在原生代码里还有第二个调用点（`be=Uq(r,we)&&s4t(r,we)` 的缓存判断），可能落在历史消息的构建路径上。必须用 `patch-wire-preservation-304` 加官方客户端对拍（`official-client-replay.cjs` / `live-official-client.cjs`）确认出口字节不变；不确定的话，`N_e` 这一处先保留。 | 预期否（需对拍确认）。另外 `--ccgateway-info` 的能力列表会少两项。 |
| J2 | `direct-billing.js:95-99` | 真问题（线上形状） | 客户端没有 `system` 时，direct 把补上的 `"system":[…]` 插在 `{` 后面，成为第一个键。官方 2.1.304 的键序是 `model, messages, system, tools, metadata, …`。 | 插到 `messages` 成员之后：`const after = member(top,'messages') ?? member(top,'model'); return raw.slice(0, after.end) + ',"system":' + json + raw.slice(after.end)`。<br><br>在 `test/direct-billing.test.mjs` 加一条键序断言（`Object.keys(JSON.parse(out))`）。 | 低 | **是**：没有 system 的 direct 请求，键序改成与官方一致。 |
| J3 | `request-build-2.1.304.js:138-146,204` | 简洁 / 死代码 | `snapshotAttachments(input.messages)` 永远什么都不做。第 193 行第二次 `prepareBuildInput` 传入 `attachments: []`，引用也已在第一遍解析掉，`input.messages` 里不会再有 `type:'attachment'` 的记录。 | 删掉 `snapshotAttachments` 和第 204 行的调用；附件渲染只保留在第 184–189 行（或 J4 的新位置）。 | 低 | 否 |
| J4 | `request-build-2.1.304.js:169-259`、`request-input.js:233-241` | 低嵌套 / 抽象 | `buildRequest` 约 91 行，串了九件事：<br>1. 校验<br>2. 第一遍 `prepareBuildInput`<br>3. 手写附件渲染（184–189，与 `request-input` 的角色/渲染逻辑重复）<br>4. 内容策略<br>5. 第二遍 `prepareBuildInput`（又跑一遍 `parseComponents`、`validateToolPairs`、`splitTools`）<br>6. 选请求类别<br>7. 组 options<br>8. 注入层<br>9. 收尾合并 | 让 `request-input.js` 分两步导出：<br>- `resolveComponents(components, aBe)`：校验、解析引用，返回线上 system/messages、tools、request<br>- `toRecords(wireMessages, model)`：线上消息转 CC 记录<br><br>`buildRequest` 拆成三步：<br>- `prepareContent()`：policy、context、内容策略，返回 transformed<br>- `buildOptions(input, agent, …)`<br>- `finishBuilt(built, …)`：参数并回、断点、计费、prompt id、身份行、betas、stream<br><br>主函数控制在 30 行内。 | 中：触及 build 主路径，靠 `request-parameters-304`、`request-injection`、`patch-wire-preservation-304` 覆盖。 | 否 |
| J5 | `content-policy.js:8-9,208-216`；`request-policy.js:4-9,99-119` | 复用 | 两个文件各有一份：<br>- 环境字段 10 项、计费字段 2 项<br>- `build_attachment_sources`/`build_billing_sources` 的来源校验<br><br>一次 build 里同一个 policy 被校验 3 次：`validateRequestPolicy`、`applyContentPolicy` 内的 `validatePolicy`、`mergeBillingAttribution` 内的 `validatePolicy`。两处对 `build_billing_entrypoint` 的规则也不同：一个用表，一个用正则。 | 把 `environmentFields`、`billingFields` 放进 `shared.js`，两边都导入。<br><br>`content-policy.js` 只保留一个 `validatePolicy`，复用 `request-policy.js` 的 `validateSources`（导出它），并且只在 `createContentPolicy` 的公开入口校验一次；内部的 `mergeBillingAttribution` 不再重复校验。 | 低 | 否 |
| J6 | `request-build-2.1.304.js:180-181`；`request-command.js:149-151` | 复用 | build 和 direct 各写了一遍“算请求入口 → `?? defaultEntrypoint` → `setEntrypointOnRequests`”。direct 里 `agentNative` 缺失的分支在生产中走不到：`directBuild` 和 `agentNative` 都由入口一起提供。 | 在 `request-policy.js` 加 `applyRequestEntrypoint(requestEntrypoint, system, policy)`：算出入口、调用 `setEntrypointOnRequests`、返回值，两处都调用它。<br><br>`prepareDirect` 直接用 `agentNative.entrypoint`，删掉三元分支。 | 低 | 否 |
| J7 | `request-entry.inc.js:12-13,26-48`；`request-build-2.1.304.js:199` | 复用 / 解耦 | `ccgateway-request-input.js` 的 `fingerprintMessages` 和 `chunk-jkcb7qdd.js` 的 `KF` 各被动态导入两次（`ccgDirect` 内一次，`ccgAgent` 前一次）。<br><br>`fingerprintMessages(...)[0].message.content` 这个“取首个提示文本”的写法在入口和 build 里各写一遍。<br><br>拒绝帧手写了协议串 `"ccgateway.request.error.v1"`，`request-error.js` 已有 `errorProtocol`。<br><br>箭头参数 `s` 遮蔽了 `Ve` 的 `s`（设置来源）。 | 在 request 分支开头一次性导入 `fingerprintMessages`、`KF`、`RIs`、`Al`，`ccgDirect` 和 `ccgAgent` 共用。<br><br>在 `request-input.js` 导出 `firstPromptText(messages, reminderOpen)`，由 `fingerprintMessages` 包装它。<br><br>在 `request-error.js` 导出 `policyDeniedFrame()`。<br><br>参数改名为 `system`。 | 低。入口代码在 `cli.js` 里，改了要升标签。 | 否 |
| J8 | `content-policy.js:239-322,118-171` | 低嵌套 | `applyContentPolicy` 约 84 行。第 285–312 行是 `for → for → if → if`，再加 user 分支 `for → if → if`，最深 5 层。`environmentRegions` 约 54 行，`for → for → if → while`。 | `applyContentPolicy` 拆出三个函数：<br>- `readServerFields(c, active, native)`：第 250–269 行<br>- `planEdits(active, server, emit)`：第 270–283 行<br>- `compactSlot(c, slot, edits, regions)`：第 285–311 行，`regionEdits` 和 `wrapperEdits` 各成一个函数<br><br>`environmentRegions` 拆出 `regionEnd(ls, first)` 和 `regionEntries(c, ls, first, stop, update)`。 | 低：内容策略测试覆盖面大（`content-policy.test.mjs` 44KB）。 | 否 |
| J9 | `content-policy.js:320,78` | 简洁 / 死代码 | `applyContentPolicy` 末尾的 `if (native.billing !== undefined) …` 没有任何调用方（生产只传 `readEnvironment`，测试也没传）。`diagnostic()` 加的 `rule_version: 'cli-2.1.304-v1'` 会被唯一的输出端 `contentDiagnostic`（`request-policy.js`）丢掉。 | 删掉这一行，以及 `rule_version`。 | 低 | 否 |
| J10 | `content-policy.js:47-74,444-478` | 复用 | `createContentPolicy` 和 `createBillingPolicy` 逐字重复了 6 个包装绑定，而且后者少了 `hasBilling`。<br><br>`leadingBilling` 和 `setLeadingBillingField` 都写了 `result.conflict ? undefined : result.candidates.find(c => c.line.start === 0)`。`leadingBilling` 和 `requestBilling` 都写了 `Object.fromEntries([...keys].map(([f,{value}]) => [f, value]))`。 | 加 `billingApi(c)`，返回全部计费方法（含 `hasBilling`）。`createContentPolicy` 改成 `{ ...billingApi(c), applyContentPolicy }`，`createBillingPolicy` 改成 `billingApi({ billingHeader })`。<br><br>抽出 `leadingHeader(c, text)` 和 `fieldValues(keys)`。 | 低 | 否 |
| J11 | `model-request.js:4,22-26,122-128` | 简洁 / 残留 | `streams` 映射、`owner` 参数和 “belongs to another mod” 报错，是 Mod 宿主 API 时代的多持有者设计；现在唯一的持有者是固定串 `'cli-request'`。`checkModelRequest` 的报错 `takes { body…, headers?, timeoutMs? }` 也是 Mod API 的措辞。 | 去掉 `owner` 参数和 `owned()` 的持有者比较。`openModelRequest` 直接返回 `{ entry, … }`，读写函数直接接收 entry，不再通过 id 查表。报错改成 CLI 语境。 | 低：改 `request-command.js` 的四处调用和对应测试。 | 否 |
| J12 | `request-input.js:5,52`；`request-parameters.js:6-8,22,55`；`request-build-2.1.304.js:172`；`request-command.js:69-72` | 复用 | 同一组输入被重复校验：<br>- `parameters`：`parseComponents` 第 52 行、`validateBuildParameters`（build 第 172 行）、`mergeAdditionalParameters` 第 55 行，共 3 次<br>- 超时：`checkModelRequest`、`request-command` 第 72 行、`openModelRequest` 内，共 3 次<br><br>两个 `fail` 抛出的错误形状也不同：`request-input` 是普通 Error，`request-parameters` 带 `status: 400` 和 `code`。 | 参数校验只留在 `validateBuildParameters`：删掉 `parseComponents` 第 52 行，`mergeAdditionalParameters` 不再重复调用。<br><br>`request-input` 的 `fail` 改用 `request-parameters` 的带 status 版本（导出为 `buildInputError`）。<br><br>删掉 `request-command.js` 第 72 行，超时默认值交给 `checkModelRequest` / `openModelRequest`。 | 低：个别本地错误的消息文字会变，要核对 Worker 有没有按文字匹配。 | 否（只影响本地错误帧文字） |
| J13 | `request-build-2.1.304.js:202-203`；`request-command.js:93-94` | 复用 | build 先用 `mBr` 检查客户端 betas，`runRequestCommand` 又对合并后的 betas 检查一次，报错文字相同。 | 只在 `request-command.js` 保留一处；build 那处删掉，或改为 `assertBetasAllowed(betas)` 共用。 | 低 | 否 |
| J14 | `request-options.js:90-115` | 复用 | `authenticatedRequestHeaders` 和 `apiKeyRequestHeaders` 都写了“设 `anthropic-version`、合并 betas、有就 set 没有就 delete”；build 末尾（`request-build-2.1.304.js:251-254`）也写了同样的 set/delete。 | 抽出 `setProtocolHeaders(headers, version, betas)`，三处共用。 | 低 | 否 |
| J15 | `patch-cli-2.1.304.cjs:157-160`；`test/support.mjs:7-8,13` | 复用 / 残留 | 支持模块清单和 `request-build → request-build-2.1.304.js` 的特判在补丁器和测试里各写一份。只剩一个版本后，`-2.1.304` 后缀成了无意义的特例。 | 把文件改名为 `request-build.js`，删掉两处特判。<br><br>清单放进 profile（`supportModules`）或单独的 `support-modules.json`，补丁器和 `test/support.mjs` 都读它。<br><br>`native-environment-2.1.304.inc.js` 是拼进哈希绑定模块的代码，可以保留版本后缀。 | 低：`ccgateway-patch.json` 的 `supportFiles[*].source` 会变。 | 否 |
| J16 | `patch-cli-2.1.304.cjs:56,76,135,146,155` | 抽象 | 往模块头部加导入有 5 处，都是 `files.set(file, 'import …' + files.get(file))`，并且依赖之前恰好有一次 `edit` 把该文件放进了 `modified`。如果哪天某个文件只加导入、没有 `edit`，产物里会静默缺少这处改动。 | 抽出 `prependImports(file, text)`：拼接时一并 `modified.add(file)`，而且同一文件只拼一次。 | 低 | 否 |
| J17 | `patch-cli-2.1.304.cjs:21-51,185-243` | 低嵌套 / 简洁 | `nodes()` 每次 `edit` 都用 Babel 重新解析整个模块（`chunk-rncrmfyt.js` 约 11 次），`checkImports` 又再解析。`checkImports` 约 59 行，内嵌 `exported`、`records` 两个函数，嵌套 4 层。 | 每个文件解析一次，缓存 `{text, ast}`，`edit` 之后只让该文件的缓存失效。<br><br>`checkImports` 拆成模块级的 `exportNames(text)`、`importRecords(text)` 和一个 10 行左右的主循环。 | 低（只影响补丁期） | 否 |
| J18 | `request-command.js:41-119` | 低嵌套 | `runRequestCommand` 约 79 行，第 75–95 行把 agent 解析、两种模式的准备、UA、betas 检查、headerPolicy 混在一起。 | 抽出 `prepareOutgoing(options, body, rawBody, natives, signal)`，返回 `{ outgoing, agent }`，主函数只剩读入、发送、输出。 | 低 | 否 |
| J19 | `request-build-2.1.304.js:104-114` | 真问题（边界） | `limitBreakpoints` 按文字找要去掉 `cache_control` 的块（`body.system.find(item => item.text === text)`）。客户端 system 里如果恰好有一块文字相同且带标记，会先删掉客户端自己的断点。 | 改按位置定位：注入的块就是 `built.system` 中 `layers.system` 那一段，记下下标范围，只在这段里从后往前去掉标记。 | 低 | 是（只在上面这种边界情况下，修正后保留客户端标记） |
| J20 | `request-build-2.1.304.js:255-257`；`test/request-parameters-304.test.mjs:142-150` | 简洁 / 测试 | 注释说 stream “keeps the native builder's key position”，测试只断言了值，没有断言键序。官方请求里 `stream` 是最后一个键。 | 测试里加断言：`Object.keys(sent.body).at(-1) === 'stream'`，或与官方抓包的键序比对；不满足就修正注释。 | 低 | 否 |
| J21 | `request-parameters.js:1-2`；`test/request-components-probe.cjs:84`；`test/analysis/parameter-assembly-analysis.cjs:154`；`README.md:13` | 简洁 / 残留 | 2.1.296/302 的残留：<br>- “older adapters do not import this module”<br>- 探针断言 UA 以 `claude-cli/2.1.302` 开头<br>- 分析脚本引用已删除的 `request-build.test.mjs`<br>- README 还在解释两项废弃能力 | 改注释为“只由 build 导入”；探针改成 2.1.304，或者连同其他 2.1.302 时期的探针一起删掉；删掉分析脚本里的那条引用；README 随 J1 一起改。 | 低 | 否 |

## 不建议改的

- **线上入口改写**：`qmn` 里的 `wire` 条件、`Gmn`/`jA`/`Xfr`/`sF`/`nl`/`PAs`/`_oo` 这些改写都在构建路径上，是保真所需。
- **`direct-billing.js` 手写的 JSON 扫描器**：这是为了让未改动的字节逐字透传，不能换成 `JSON.parse`/`stringify`。
- **入口代码的懒加载**：`request-entry.inc.js` 里的动态 `import()` 是为了不拖慢普通 CLI 启动，导入本身不要改成静态的。J7 只是建议合并重复的导入。
- **兼容旧版的 `build_identity_lines`**：`request-policy.js` 接受而不使用这一项（审核 A3 的要求），核心升级之前保留。

## 验证

- 跑了 `npm test`：174 通过，0 失败，0 跳过。
- 对照恢复源码 `artifacts/claude-2.1.304/linux-restored/` 确认了：
  - `Ten`/`ton`/`mIt` 只在 `chunk-rncrmfyt.js` 的响应处理段（`_Xn(zr)` 之后）被调用；
  - `N_e` 另有一处缓存判断调用（J1 的风险项）；
  - `PAs([], undefined, …)` 返回的数组第 0 项只可能是计费头或空，入口里 `[0] ?? ""` 是安全的。
- J2 的官方键序取自 `artifacts/claude-2.1.304/official-request-304-fresh.json`。

## 处理结果

2026-10-24 按本表修改，v23 未发布，原地重编（补丁标签仍为 `ccgateway-v23-bound-imports`）。`npm test` 171 通过、0 失败、0 跳过（原生对账测试真跑）。

### 出口验证

- **对拍**：17 种 `claude request` 请求，用 Bun 1.4.3 分别在旧 v23 源码树（改动前补丁输出）和新源码树上运行，发往本地假上游，逐字节比较 body，并比较请求头列表（排除每次随机的 `x-client-request-id`）。
  - direct 7 种：官方抓包、Worker 接管 `cc_version`、无 system、字符串 system、OAuth、子代理、带官方 betas。
  - build 10 种：官方抓包、带 Worker 字段与擦除的策略、OAuth、子代理、带工具的非 CC 请求、无策略、注入全部层、注入加多个缓存标记加 thinking、附件引用与对话中 system、带官方 betas。
- **对拍结果**：16 种完全相同。唯一差异是 `direct-no-system`，键序从 `system, model, messages, max_tokens` 变成 `model, messages, system, max_tokens`，这是 J2 的有意修正。
- **对照**：旧树和旧树对拍，17 种全同，说明对拍本身是确定的。
- **陷阱**：在旧 v23 树的 `Pb` 的 `register`、`GYr`、`Ua`、`computeToolPool`、`Ten`、`N_e`、`o4t`、`mIt`、`ton`、`addTool`、`bz` 入口插入 stderr 标记，再跑这 17 种请求，一次都没有触发。正向对照是在同一棵树上跑 `claude -p` 加一次工具调用，触发了 `Ua`、`Ten`、`ton`、`addTool`、`bz`，说明标记本身有效。
- **ELF**：本机是 Windows，没有 Docker，没有直接执行 Linux ELF。编译用的 `patched-v23` 与做对拍的新源码树 `diff -r` 完全相同，ELF 里能找到新标签与新代码的字符串。
- **新 ELF**：SHA-256 为 `df6e562bd0b330df8530d6346d530d1948511b1572fafe4b0295d1e34c5994ea`，旧值是 `860198c7…7a09`。产物位置：
  - `artifacts/claude-2.1.304/claude-linux-v23-bun143`
  - `artifacts/claude-2.1.304/release-v23/`

### 逐项

| id | 结果 | 说明 |
|---|---|---|
| J1 | 已修 | 已用上面的陷阱与对拍证明：`claude request` 走不到这条链，删除后出口不变。<br>- 删掉十处改写、`dispatchNames`/`rename`、`tool-dispatch.inc.js`、`Dockerfile`、`test/runtime-probe.cjs`、`test/hook-probe.cjs`、`test/fixture/`，以及能力 `native_tools`、`mods_dispatch`。<br>- profile 不再绑定从此不改的 5 个模块：`chunk-0q47gehe/8w3jrzn0/g8r6rccx/qygf2xvn/gzc5bc6y`。产物里这 5 个与官方逐字节相同，有测试断言。<br>- `N_e` 的第二个调用点 `o4t` 在 `jA` 里。外部输入时 `Gmn` 在调用 `jA` 之前就返回；探针请求没有 `wireToolInputs`。陷阱也确认它没被调用，所以一并恢复原生。<br>- 与审核建议不同：`core` 只需要 `isNative`、`nativeDefinition` 两个名字。`registerNative`/`findNative` 的会话注册表已经没有读者，换成 `requestTool(spec)`，直接返回工具对象。`marker` 改名为 `ccgateway.request-tool`。<br>- `claude -p` 等普通 CLI 路径恢复官方行为。 |
| J2 | 确认并修复 | 官方键序已在 `official-request-304-fresh.json` 与 `test/fixtures/official-request-2.1.304.json` 中核对，是 `model, messages, system, tools, metadata, …`。<br>- 补上的 system 现在插在 `messages` 之后；没有 `messages` 时在 `model` 之后，两者都没有时在最前。<br>- 新测试用官方夹具比对键序与字节。<br>- **行为变化**：没有 system 的 direct 请求，键序改成与官方一致。 |
| J3 | 已修 | 审核正确，`snapshotAttachments` 已删除。 |
| J4 | 已修，拆法不同 | `request-input.js` 新导出两个函数：<br>- `wireMessages(records, aBe)`：接手 build 里手写的附件渲染。<br>- `wireRecords(messages, model)`：第二遍只做“记录化 + 工具配对校验”，不再跑 `parseComponents`/`splitTools`。<br>`buildRequest` 拆成 `convertContent`、`buildOptions`、`applyLayers`、`finishBuilt`，主函数约 33 行。 |
| J5 | 已修 | 环境字段与计费字段两张表移到 `shared.js`。<br>- 策略只在入口校验一次：build 用 `validateRequestPolicy`，direct 用 `validateDirectPolicy`。`content-policy.js` 不再校验，`build_billing_entrypoint` 只剩表格规则一种。<br>- 原先在 `content-policy.test.mjs` 里测非法策略的用例，改到 `request-policy.test.mjs`，并新增 direct 策略用例。 |
| J6 | 已修，方式不同 | 没有新加 `applyRequestEntrypoint`：它只会包两行。改为让 `requestEntrypoint` 自己回落到 `defaultEntrypoint`，两处直接调用它再调用 `setEntrypointOnRequests`。<br>direct 中 `agentNative` 缺失的三元分支已删除。 |
| J7 | 已修 | - request 分支统一导入一次 `fingerprintMessages`/`firstPromptText`、`KF`、`RIs`、`Al`。`direct-billing` 仍在 `ccgDirect` 内按需加载，因为只有 direct 用它。<br>- 新增 `firstPromptText`。<br>- 拒绝帧改用 `request-error.js` 的 `policyDeniedFrame()`，帧字节不变，有测试。<br>- 遮蔽 `s` 的参数已改名为 `system`。 |
| J8 | 已修 | - `applyContentPolicy` 拆成 `readServerFields`、`planEdits`/`replacementFor`、`compactSlot`（含 `within`、`leavesBlank`）。<br>- `environmentRegions` 拆成 `regionStart`、`regionEnd`、`regionEntries`、`entryEnd`。<br>- 最深嵌套降到 3 层。 |
| J9 | 已修，审核部分不准 | `native.billing` 分支与 `rule_version` 已删除。<br>审核说测试也没传 `native.billing`，不对：两条矩阵测试传了。已改为按生产顺序显式先转换、再合并计费头。 |
| J10 | 已修 | 新增 `billingApi(c)`。direct 也因此有了 `hasBilling`。另抽出 `leadingHeader`、`fieldValues`。 |
| J11 | 已修 | - 去掉 `streams` 表与 `owner`。<br>- `openModelRequest` 返回的句柄用 Symbol 键携带流状态，读取、取消直接用句柄。<br>- 报错改成 CLI 语境：`the request body must be a Messages JSON object`。经 grep，Worker 不按这些文字匹配。 |
| J12 | 已修 | - `parameters` 的键只由 `validateBuildParameters` 校验，`mergeAdditionalParameters` 不再重复校验。<br>- `request-input` 的 `fail` 改用 `buildInputError`（带 `status: 400` 与 `code`），错误文字不变。<br>- 删掉 `request-command` 里重复的超时检查。<br>- `openModelRequest` 仍保留自己的入口校验，因为它是模块的公开入口，所以超时现在校验 2 次，不是 1 次。 |
| J13 | 已修 | 删掉 build 里的 `mBr` 检查。`mBr` 是全有或全无的判断，命令里合并后的 betas 包含客户端的 betas，所以报错文字、错误帧和阶段都不变。 |
| J14 | 已修 | 新增 `setProtocolHeaders(headers, betas, version?)`，三处共用。 |
| J15 | 已修 | - `request-build-2.1.304.js` 改名为 `request-build.js`。<br>- 支持模块清单放进 profile 的 `supportModules`，补丁器与 `test/support.mjs` 都读它。<br>- `ccgateway-patch.json` 中 `supportFiles[*].source` 变为 `request-build.js`。<br>- `native-environment-2.1.304.inc.js` 保留版本后缀。 |
| J16 | 已修 | 新增 `surround(file, { imports, code })`。导入与追加代码在所有改写之后一次拼上，并加入 `modified`。 |
| J17 | 已修 | 每个文件按当前文本只解析一次。`checkImports` 拆出模块级的 `exportNames`、`importRecords`。<br>重构前后补丁输出逐字节相同，只有一处注释和 `source` 名不同。 |
| J18 | 已修 | 抽出 `prepareOutgoing` 与 `agentResolver`。 |
| J19 | 确认并修复，场景与审核描述不同 | 审核说的“客户端 system 里有一块文字相同”在这个分支不会出现：有注入提示词时，system 就是 `[客户端身份行…, CC 提示词块…]`。<br>真正的问题是：旧代码把客户端身份行也算进了可去标记的范围，断点超限时会去掉客户端身份行自己的 `cache_control`。<br>现在按位置处理，只在 `ownLines` 之后的 CC 提示词块里从后往前去标记，有测试。<br>**行为变化**：只在这种边界情况下，客户端标记得以保留。 |
| J20 | 已核对并加测试 | 官方请求里 `stream` 是最后一个键，新代码就把 `stream` 放在最后。<br>原生构造的 body 里没有 `stream`，所以出口不变，对拍也确认了。<br>测试新增 `Object.keys(body).at(-1) === 'stream'`，注释已改正。 |
| J21 | 已修 | - `request-parameters.js` 的注释已改。<br>- 删掉 302 时期的探针 `test/request-components-probe.cjs`、`test/worker-components-probe.cjs`。它们断言 UA 是 `ccgateway-request`/`claude-cli/2.1.302`、请求里没有 `x-stainless-*`，与现行设计相反。<br>- 删掉 `parameter-assembly-analysis.cjs` 中对已删除测试的引用。这个脚本是钉住历史哈希的修复前审计，路径保持原样。<br>- `tool-assembly-analysis.cjs` 改用 `requestTool`。<br>- README 的历史一节约 95 行，改为指向 296 文档。 |

### 需要别人改的文档

- `next/docs/audits/2026-10-23-ccgateway/99-FINAL.md:126`：ELF sha `860198c7…7a09` 改为 `df6e562b…94ea`；“cli-mods 173/173”改为 171/171；补一句 v23 已删除 mods 工具链与两个能力。
- 以下文档仍写 `request-build-2.1.304.js`，应改为 `request-build.js`（审核记录中的历史引用可以保留）：
  - `next/plugins/ccgateway/docs/BUILD-REQUEST-COMPONENTS-DESIGN.md`
  - `next/docs/CLAUDE-CODE-2.1.304-IMPLEMENTATION.md`
  - `next/docs/ccgateway-feature-support/BILLING-IDENTITY-AUTOFILL-DESIGN.md`
  - `next/docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md`
  - `next/docs/ccgateway-feature-support/CC-REQUEST-LEVELS-DESIGN.md`
- `CONTRACTS.md` 与 `manifest.json` 不需要改：两者都不列 `native_tools`、`mods_dispatch`，Go 侧也不检查这两项。
- 发布时用 `artifacts/claude-2.1.304/release-v23/` 替换 `cli-mods/release/`。
