# ck318-1：核对可疑的已有名字（7 项 + 100 个抽样）

## 范围与产物

- 输入：`artifacts/tmp/batches-r2/ck318-1/items.jsonl`（7 项，来自 `batch-nm318-4.md` 的发现 2/3 与 `batch-nm318-6.md` 的发现 1–5）、`unstable-sample.jsonl`（100 个，种子 318，抽自 `artifacts/tmp/upgrade-318/carry-e-unstable.jsonl`）。
- 产出：`verdicts.jsonl`（107 行，A1–A2、B1–B5、1–100）、`naming/semantic-ck318-1.jsonl`（11 行）。
- 校验：`node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-ck318-1.jsonl` → `11 lines, 6 chunks, 0 problems, 0 suffixed by conflicts`。

## 判断方法

每条都读两边的代码：316 用 `artifacts/versions/2.1.316-original/<chunk>` 的原文 + `artifacts/versions/2.1.316-naming/final/` 的名字，318 用 `original/<chunk>` + `bindingsOf` 精确取绑定（`declStart`、`kind`、`scope`、`topDeclStart`），再用正则列出该绑定在所属顶层声明里的全部引用点，逐个看接收者、属性名、调用方参数名。

抽样项先看抽样给出的 `old316` / `new318` 两段，再按绑定身份核对：同一个角色应是同一个参数位置、同一个用途（同一个字段被读取、同一个 setter 被存、同一个字段名被写入）。反向候选存在的，单独核它是不是真正的同位角色。

第 2 条（`entrypoint`）在 316 是 `replaceEntrypointOnRequests` 的参数，在 318 却落在 `replaceWrapUpOffered` 上，而 `entrypointOnRequests` 的 setter 已后移一位；用它校准后，判断一律以“318 这个绑定的实际读写对象”为准，不看名字像不像。

## 结论

7 项点名：**4 rename、3 keep**。

- A1 rename：`@164911` 改成 `importHook`。318 `@164822` 是 `pu()` 真正建出来的钩子（`C_e(e,{importModuleDynamically:n})` 并缓存），`@164911` 只是 `runInContext` 选项里的参数，两者同名会撞。
- A2 rename：`@192545` 改成 `request`。`ha` 从 `Mu` 收到的是 `{dispatchCtx,replToolUseID,parentMessage,input}` 整个请求对象（`ha` 内读 `e.replToolUseID`）；`@183269`（剥权限层的上下文副本）和 `@192925`（`e.dispatchCtx` 字段）确实叫 `dispatchCtx`。
- B1 keep：`Jc` 与 2.1.88 的 `expandKey` 逐行一致，`iU` 是 `isNotInformational`；两个名字都对，只是 316 的 `iU` 被重排到了别的符号上。
- B2 keep：四个名字**已被别的表换掉了**，现在的名字正好对：`filtered`（不再是空数组缓存）、`summarizedIds`（Set，`resultMsg.type==="user" && drawsInterruptedRow`）、`hookCallIds`（`new Set(zo.map(toolUseId_2))`，不是 `lookups` 里取的结果）、`endedToolIds`。
- B3 rename：`@275502` → `workerWaitGivenUp`（超时放弃等 worker 的闸门），`@275511` → `heldWhileWaiting`（等待期间扣住消息）。`held`/`heldMessages`/`releaseHeld` 三处正确。
- B4 keep：`H` 累加图片数（`H+=be`）→`cut_picture_count`，`j` 累加同一批里的非图片（`j+=Be-be`，另有 `j+=Ce?0:1`）→`hidden_picture_count`，`I` 累加未知块（`I+=he`）→`cut_read_count`，没有错位。
- B5 rename：`@2633258` → `baseMap`（lodash `_baseMap`，现在是 `mapArray`，那是另一个 lodash 函数），`@2633374` → `baseSortBy`（`_baseSortBy`）。`compareAscending`/`compareMultiple` 与 lodash 原文逐行一致，保留。别名的错位（`mapCollect`/`sortUnwrap`/`compareAscending_2`）只写进 note，未改放置表。

抽样 100 个：**6 rename、94 keep**。

改名的 6 条：#2、#30、#47、#48、#60、#84。

## 错误集中在哪里

- **看起来不是“反向候选存在就容易错”。** 抽样里 7 条带反向候选（2、8、47、48、77、83、99），只有 #2 是“反向候选才是对的”；#47、#48 的反向候选（`args`、`wait`）也是错的，两个位置在 318 都换了含义；其余 4 条正向本来就是对的。反过来 6 条错误里有 4 条（#30、#47、#48、#60 …）根本没有可用的反向候选或反向候选同样错。
- **真正的两类高发情形：**
  1. **316→318 在同类 getter/setter 序列里插入了新的一对**，参数序号整体后移一位，名字按正向搬过去就落到隔壁方法上（#2 是典型：新增 `wrapUpOffered`/`replaceWrapUpOffered` 后，`entrypointOnRequests` 的 setter 后移）。
  2. **名字描述的是 316 当时的实现细节，318 已把该细节换掉或占位已失效。** #60 在 316 里是字面量 `let y=!1`（于是叫 `unusedFlag`），318 让它真正参与判断（`||f`、`if(ae()&&!f)`）；#84 在 316 是 `n.turnAbortSignal()` 的结果（于是叫 `signal`），318 改成 `new AbortController().signal` 并把该参数存进 `pending.promptUuid`、由 `BGs` 回读；#47/#48 是构造器参数，名字按“第几个参数”给了 `tracked`/`result`，而 318 里它们直接赋给 `this.toolDefinitions`/`this.canUseTool`，字段名才是准的。
- 按抽样比例（6%）线性外推，800 个不稳定对里大约有 48 个放错，量级在 5%–8% 之间；其中“有新插入的同形成员”和“316 侧是占位/常量”的条目应当优先复核，纯参数位置不变、接收者不发生变化的条目基本可以不再看。
- 另有用作校准的规律：名字对不上的条目，把绑定身份、`kind`、`scope` 一起看就能定案——#48 的 `result`（param）与反向候选 `args`（`setTimeout` 回调 param）分属不同函数，两者都不是 `this.canUseTool` 时，说明正反向都只是按位置猜的。

## 未做与遗留

- 只写三个产物，未改其他表、未改放置表、未跑 pipeline、未提交。
- B5 的别名（`Qhn`/`Jhn`/`Zhn`/`eyn` 现名 `mapCollect`/`sortUnwrap`/`compareAscending_2`/`compareMultipleAlias`）与正文不一致，属同段 vendor 代码，按要求只记在 verdict 的 why 里。
- `@4867843` 与同 chunk `@4854869` 同名（都是 `backgroundTimeoutNote`、都是毫秒值），本批只改了抽样命中的那一处；若要统一，`@4854869` 需要另一批处理。
