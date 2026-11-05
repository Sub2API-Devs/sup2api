# 批次 nm318-10（命名批）

范围：`src/utils/model/modelCatalog/maskedIds.js` … `src/vim/textObjects.js`（532 个声明、1506 个仍压缩的绑定），输入 `artifacts/tmp/batches/nm318-10/plan.json`（下标 0）与 `hints.jsonl`（221 条）。

## 产物

- `naming/semantic-nm318-10.jsonl`
- 本文件

## 做法

1. 用 `annotate.mjs show <plan> 0 <from> <count>` 按偏移顺序分批读代码，每批 5–14 个声明；小声明直接 `id` 看。
2. 名字依据：`tengu_*` 事件名、错误/日志字符串、设置键与环境变量、被谁调用、属性名；有 316 对应代码（`hints.jsonl`）时优先沿用 316 的同名单元。
3. 每批追加 JSONL 后立刻 `check`；冲突用改名解决（例如 `requestBuild` → `requestBuildSpans`、`ruleTables` → `allowRuleTables`、`inputs` → `candidateHosts`），不留 `suffixed`。
4. 只写偏移键；不碰其他文件、不 commit、不跑 pipeline。

## 命名条数

- 写入 1326 行，覆盖 90 个 chunk；`plan.json` 的 1506 个未命名绑定里本批命名 1326 个（88.0%）。
- 剩下 180 个不是遗漏：它们已经能在 `naming/final`（top.json / locals.jsonl）里查到名字，`annotate` 里显示为可读名而不是 `_K<偏移>`，按规则不改。
- 用 `bindingsOf` 逐声明比对（`work/gaps.mjs`，已扣掉 final 里的名字）后剩余缺口为 0；`work/stats.mjs` 的抽查同样为 0。

## 发现的问题

- `chunk-exfmq47h.js#qGi` 与 `maskedIds.js` 里 `isMaskHydrationSettled` 语义相邻（都读 `servedCatalogMaskHydrated` / `servedCatalogPersistedMaskedIds`），但 `qGi` 被 `_unattributed/chunk-5xgkngpb/part-010.js` 导出使用，判断的是"遮盖表已知"，故命名为 `isMaskIdListKnown`。`show` 输出的第二行偏移 `@776232` 其实属于下一个声明 `hydrateMaskedIds`，容易误写（本批第一版就写错了，已改）。
- `chunk-gg17c06d.js`（permissions.js）的 `hints.jsonl` 里 `@10801`、`@16540` 等是 **2.1.316 的旧文件偏移**（`chunk-sfy7bm1n.js#TH` 等），318 的 chunk 布局不同，直接照抄会报 "no binding at this offset"。本批按 318 实际偏移（`id` 输出的 `_K<偏移>`）重映射。
- `chunk-5xgkngpb.js#gB`（`teleportToRemote`，1900 余行）里有若干"声明后从未再用"的死变量（`h`、`y`、`Ee`、`Et`、`mt`、`To` 等），只能靠位置猜，置信度标 0.45–0.5。
- `chunk-qg41pqt6.js#X0`（`convertToSandboxRuntimeConfig`）同样有大量单次使用的临时布尔，命名以读取的变量/函数名为准（例如 `scanDirectory` 的结果 → `infoDirsScannable`），个别只能给后缀式名字。
- `editPermissionRules.js` 的 `fr`（`editPermissionRules` 主体）里 `y_K30313` 与 `siblingRule` 语义重叠；`U_K14858` / `refusalCode` 返回的字符串就是对外 refusal 码，与 `c_K15409` 的 `refusal` 字段同源。
- `chunk-2dvnfacg.js#ve`（QueryProfiler 类）的私有字段 `#e`、`#n`、`#t`、`#s`、`#r`、`#i`、`#u`、`#a` 不带 `_K`，本批无法命名，需另作（同样情况：`chunk-5xgkngpb.js` 里各类的私有字段）。
- `chunk-5xgkngpb.js#MJe`（bashProvider 的命令常量表）有 8 个门控命令槽位，只能看出"内部/ANT 门控"两类，名字用 `antGatedCmdA/B`、`internalCmdA/B` 等占位式命名，置信度 0.5–0.55。
- `chunk-5xgkngpb.js#Ula`（`execIntoTmuxWorktree`）里 `It_K3778328` 恒为 `null`，`watchDir` 分支实际走不到，置信度 0.55。

## 未命名

按 `bindingsOf` + `naming/final` 比对，本批范围内**没有剩下未命名的绑定**。仍显示 `_K<偏移>` 的只是私有字段（见上一条）与已由 `naming/final` 命名的绑定。

## 校验

`node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-nm318-10.jsonl`：

```
1326 lines, 90 chunks, 0 problems, 0 suffixed by conflicts
```

`confidence` 全部落在 0.6–0.9，`source` 全部为 `semantic`，全部使用偏移键。
