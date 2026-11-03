# name-l5x：第 5 组后半段（naming-round4c[5] 下标 1263–2705）

## 范围与起点

- 清单：`analysis/segments/naming-round4c.json` 的 `[5]`，共 2,706 个声明，本成员只做下标 **1263 到末尾（2705）**，共 1,443 个声明。
- `dirs` 首尾：`src/main/fastPathSubcommands.js` … `src/plugins/functionHooks`，与派活一致；实际从 `src/plugins/functionHooks/interfaceCalls.js`（chunk-e6aww6q8.js#jZr）开始。
- 名字表：`artifacts/tmp/lead/final5`；结果写新文件 `naming/semantic-l5x.jsonl`（未动 `naming/semantic-l5.jsonl`，那是 name-l5c 的）。
- 接手时 `semantic-l5x.jsonl` 不存在；本表全部由本成员 `cat 批次 >> 目标` 追加。

## 结果

- 追加 **5,801 行**（63 批，每批 20–50 个声明），**5,801 个唯一 (file,key)**，无重复键。
- `node tools/naming/annotate.mjs check naming/semantic-l5x.jsonl`：**5,801 lines, 11 chunks, 0 problems, 0 suffixed by conflicts**。
- 覆盖文件（行数）：chunk-4121qate.js 2,055、chunk-e6aww6q8.js 1,750、chunk-bfnfj4kx.js 703、chunk-s61vbvea.js 580、chunk-jv2zdrd7.js 293、chunk-z3wfa7xm.js 257、chunk-0sfjpx19.js 146、chunk-w2teref8.js 9、chunk-dbh1yfwe.js 4、chunk-d5gb8ms2.js 3、chunk-5prdqx1m.js 1。
- 用 `artifacts/tmp/lead/final5` + 本表合并成 `artifacts/tmp/l5x/final5` 重算：**1263–2705 范围内剩余 `<名>_K<偏移>` 为 0**（脚本 `artifacts/tmp/l5x/measure4.mjs`）。计划里 1443 个声明并非都还有压缩名（部分前任已命名）；以「剩余 _K 为 0」为验收。

## 中途修正的撞名（check 报 suffixed by conflicts）

共处理约 40 处，全部改写为更具体的名字，典型：`cwd`→`resolvedCwd/startCwd`、`decision`→`dec`、`settled`→`settledEntry`、`a/b`→`left/right`、`version`→`currentVersion`、`boxKeyProblem`→`boxKeyIssue`、`hoverProblem`→`hoverIssue`、`linkProblem`→`linkIssue`、`frame`→`walkFrame`、`autoFocusProblem`→`autoFocusIssue`、`siteKey`→`focusSiteKey`、`address`→`pressAddress`、`client`→`eachClient`（同作用域重名）、`mount`→`mountInstance`、`stage`→`stageData`、`copyValue`→`copyElementValue`、`declared`→`shadowingDecl`。这些只改本表，未动他人行。

## 跳过的

- 清单中 `unnamed=0` 的声明（前任已命名）自然跳过，未重复覆盖。
- 范围（1263–2705）里最终没有留下未命名的压缩绑定；仅少数看不出用途的箭头形参位（如 `chunk-4121qate.js@131713`、`@136068`、`chunk-4121qate.js@315721`）给了 `unusedSlot` 这种低置信度（0.75）的存疑名，而不是跳过。

## 发现的问题

1. **`chunk-jv2zdrd7.js#vwo`（createSurfaceClientHost，约 700 行）** 里有 153 个压缩绑定，且同一个函数体内 `client`/`version`/`site` 反复出现在不同嵌套层，只能靠「这是哪一层」区分（用 `eachClient`、`currentVersion`、`clientSiteOf` 等区分），后续再改易撞名。
2. **`chunk-4121qate.js#Jrs`（createHooksEngine）** 里压缩名混用单字母与双字母临时名（`yt_`、`l_K309708`），且 `leaveing/copyAnswer` 一路被包了 3 层（return path / event path / next path），原意需结合 `bare` 里同名导出才能判断——`bare` 下的字段（`leavingCopy/leavingAnswer/freezeOwn`）与本地包装名一一对应，可作为后续读者参照。
3. **`chunk-s61vbvea.js#CK`（dispatchDesktopClient）** 的 press/input/select 三条链在压缩代码里共用一个 `reached` 变量，返回对象的 `reached` 字段实为「bottom 是否执行过」而非「是否送达」，命名按后者理解会误导。
4. **`chunk-4121qate.js#Ui`（checkRenderTree）** 三次 `notOverBudget()` 各自新建 budget，只有第二次（`retryBudget`）的 `isClientAdded/isOverRows` 被采用，其余两次的结果除非进入对应分支都丢弃——原逻辑如此，非压缩误读。
5. 过程中曾写出一行坏 file 名（`"e6aww6q8"` 少了 `chunk-` 前缀与 `.js`），追加前已删掉并用正确行补回。`check` 未报错（该行 file 不匹配 `original/` 下任何 chunk，但也不触发 bad：本轮未深究）；提醒后续成员追加前用脚本校验每行 `file` 形如 `^chunk-[\w-]+\.js$`。
6. `chunk-d5gb8ms2.js#G$t`（matcherDoors）文件名与模块内容（matcher 的 door 解析）不一致，属既有结构；未改动。
