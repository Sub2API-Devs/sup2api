# 第五阶段：放错文件的声明（第三轮修正）指南

第三轮顶层命名组（name-s0 … s9）在各自的过程文档里报告了放错文件、名字配错的声明。本轮把这些报告核对后落地。

## 输入

- `docs/process/naming-s0.md` … `naming-s9.md` 里"发现的问题 / 放错文件"一节（格式大多是 `声明 id → 应归路径，证据`）。
- 上一轮的做法和判断标准：`docs/process/fixer.md`（第二轮一节），放置表格式：`docs/process/placement-guide.md`。
- 查证工具：`node tools/q.mjs callers|callees|module|where <id或路径>`，阅读树 `reconstructed/`，2.1.88 源码 `references/claude-code-analysis/src`。

## 判断标准（与 fixer.md 一致）

- **搬**：唯一或主要调用方在目标文件 / 目标目录；或与目标文件的其他声明在 chunk 中相邻且职责一致；或 2.1.88 里就在目标文件。
- **不搬**：调用方分散；依赖原模块的私有状态；报告者自己存疑；没有明确目标。
- 一个文件里混入的一整组无关声明（例如 `memorySummary.js` 里的事件上传器），可以拆到新文件：新路径按职责命名（lowerCamelCase.ts），同一组声明放同一个文件。
- 第三方代码（lodash 片段、zod 片段等）放到 `vendor/<包名>/...`。

## 输出

1. `naming/placement-zzzzz-fixer3.json`：`{"声明id": "目标路径.ts"}`（文件名排序在全部放置表之后，后加载者覆盖）。
2. 报告里的"名字配错"：`naming/semantic-zzz-fixer3.jsonl`，格式同其他 semantic 表；**confidence 用 0.97**（合并按优先级 + 置信度取最高，同置信度先加载者胜）。键是 `@偏移`（`node tools/q.mjs bindings <id>` 可查）。
3. 说明配错：`naming/docs-zzz-fixer3.jsonl`（`{"id","doc"}`，后加载者覆盖）。
4. 新建文件的模块说明：`naming/modules-fixer3.json`。
5. `docs/process/fixer3.md`：逐条裁决表（报告来源、声明、裁决 搬/不搬/改名、理由），汇总数字；`docs/WORKLOG.md` 末尾一行。

## 校验

- 放置表每个键都在 `analysis/scan/decls.jsonl` 的声明 id 里；目标路径合法（不含 `_new/`、`_unattributed/`）。
- semantic 表用 `node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-zzz-fixer3.jsonl` 校验，0 problems。

## 规则

只写上述文件和 `artifacts/tmp/fixer3/`；不改 tools/、analysis/、其他 naming 文件、reconstructed/；不跑 tools/pipeline.sh；不 commit；不派生子代理；node 内存 ≤3000 MB。
