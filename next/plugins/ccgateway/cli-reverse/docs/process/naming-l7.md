# 第 7 组（参数与局部变量命名，naming-round4c 下标 7）——续做记录（name-l7c）

## 范围

- 清单：`analysis/segments/naming-round4c.json` 的 `[7]`，`dirs` 首尾 `src/services/api` .. `src/services/artifacts`（4 个顶层目录），871 个声明、接手时按 `artifacts/tmp/lead/final5` 重算仍有 4,817 个压缩绑定。
- 名字表：`naming/semantic-l7.jsonl`（接手 7,956 行、`check` 0 problems），只追加，未整体重写。

## 前任进度与本次续写

- 接手：7,956 行（对应 `git show HEAD:naming/semantic-l7.jsonl` 同内容），本组剩余 4,725 个 `_K` 绑定，集中在 `src/services/api`（claude.js、client.js、gzip/incremental/logging、promptCacheBreakDetection、promptPrefixLedger、requestHeaders、teleportRelay、toolDescriptionCache、usage）后半段与整个 `src/services/artifacts`。
- 本次：75 个批次文件（`artifacts/tmp/l7c/b1..b75.jsonl`）共写入 4,744 行，去重（去掉与前任重复的 @2574854/@2574910 两条 fetch，以及本表内部 24 条同键重写）后净增 4,711 行；最终表 12,666 行、`check` 0 problems（94 chunk）。
- 最终：`check` 0 problems、0 suffixed by conflicts。用 final5+本表合并的 `scan2.mjs scan` 复核本组 `_K` 只剩 7 个（4,725 → 7），全部在 `chunk-e6aww6q8.js#e_n`（api/claude.js 主查询函数）里，见下节。

## 跳过与理由

- `chunk-e6aww6q8.js` @2677189、@2703574、@2714919、@2715014、@2721080、@2737594、@2738315：`e_n`（query 主函数）里的死变量/空生成器，只有 `let x;` 或空函数体，任何名字都会误导读者。
- @2728949/@2728960/@2731575（0.6–0.65 写出后又删掉）：`() => {}` / `(error) => null` 占位回调，命名只是猜它“将来会做什么”。
- @26719（`partial`）、@41844（`options`）等少数低置信度（0.6）保留：从调用点形状可推断为回调参数，但字段含义只在 schema 里，已按调用点参数名命名并标低置信度。

## 命名方法与批次

- 每批用自写的 `artifacts/tmp/l7c/peek.mjs`（prettier 格式化后按窗口截取，只打印含 `_K` 的行及其上下文）、`bind.mjs`（逐绑定列出所有出现行）、`quick`/`scan2.mjs`（重算剩余 `_K`）。先读函数签名 + 首个赋值推断参数名，再对照返回对象字段（大量 `...spread` 的对象字面量直接给出字段名）确定局部变量含义。
- 主要文件：`artifacts` 下 commentReply/commentFormatting/commentMentions/pageAnchors/composeReply、publishArtifact/publishConflicts/publishInstanceFiles/publishFiles/publishErrors、pagePreparation/pageRuntimes、frameApi/frameRelay/frameLive/presenceSocket、durableWatch/pathPins/capabilityDeclaration、artifactTypes/typeInstances、handoverRead/readObservation/shareEntries/replyYield 等；`api` 下 claude.js 后半段、client.js 各 provider 分支、promptCacheBreakDetection 全套、teleportRelay。

## 发现的问题

1. **表内同键重写（已修）**：`b55`/`b58` 对 `chunk-5323y1gy.js` @2142–@3094 一批写成两套不同名字（先写了一版 `credentials/scratchpadDir/...`，后来整段重新看时又写 `signal/placeFor/...`），造成同键 24 条重复；已按后写生效去重，并把最终名字统一为第二版。用 `git show HEAD:naming/semantic-l7.jsonl` 核对，前任 7,956 行的字符串仍逐条在表内（无丢失）。
2. **`_2` 撞名 55 处（全部改名消除）**：多数是本组变量与同函数外层/参数同名（`error`、`response`、`stat`、`slug`、`parsed`、`envelope`、`claim`…）。其中 15 处属 `captures-outer-or-global`（如 `chunk-06y4szbn.js` @104575 `response` 在 `publishFilesVersion` 里与外层同名、`chunk-sqqsb7w7.js` @3871 `msgId`），说明这一片代码大量从外层闭包捕获同义变量，读代码时容易误认为同一变量。改名表在 `artifacts/tmp/l7c/renames.json`；最后一条 `chunk-06y4szbn.js` @124842 改成 `uploadWireBytes`（否则与 @124876 撞）。
3. **重复实现**：`src/services/artifacts/comments/commentReply.js` 的 `sendCommentReply` 与 `api/client.js` 的 relay 路径都各自实现了“relay 失败→`no-auth`/`gatewayDeclined` 包装”，文案几乎相同（`comment reply outcome unknown (...)`），分别返回 `unknownOutcome` 结构；`postThreadReply`/`applyAutoEdit` 又用不同 `failKind` 方言重述同一件事。
4. **`chunk-e6aww6q8.js#e_n`（claude.js 的 query）** 是整组最重的声明（单函数 >200 个绑定、几百行），其中 `Vgt/Ygt` 两个空函数、`uht/BMs` 两个空生成器、`Io/FT/NMs/Ms/HMs` 五个只声明不用的变量——像是线上构建把某些实验代码裁剪后留下的残骸；同行里 `Hgt`、`OLe` 又是 `(error) => {}` 空恢复器，而 `onApiError` 链上依次调用它们，读者会误以为有恢复逻辑。
5. **注释缺失导致易错的语义**：`chunk-hag5hcx6.js` pathPins 的 `ver` 在不同函数里既是版本号又是“更新序号”（`nextPathPinSeq`）；`chunk-9tgt55am.js` replyYield 的 `yielded/notHeld/lost` 三组集合与 `releaseYieldedSlugs` 的返回值容易混（前者是 slug 名，后者是同名数组），已在名字里区分（`yielded`/`notHeld`/`lost`/`released`）。
