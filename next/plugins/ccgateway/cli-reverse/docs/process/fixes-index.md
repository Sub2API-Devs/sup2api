# 问题报告 → 裁决 对照索引

各轮成员在自己的过程文档里记录了"发现的问题"（放错文件、名不副实、工具问题）。这些条目没有一条留在报告里不处理：每份报告都由一个修正成员逐条核对，裁决为**搬 / 改名 / 驳回 / 官方行为保留 / 工具层处理**，并写回 `naming/` 的覆盖表。本表给出每份报告在哪里被裁决。

| 报告（输入） | 内容 | 裁决文档 | 落地的覆盖表 |
|---|---|---|---|
| `domain-*.md`（10 个领域）、`placement-g0…g7`、`placement-grest.md` | 领域归属建议、放置冲突、跨文件命名冲突 | [`fixer.md`](fixer.md) 第 1–10 节 | `placement-zz-fixes.json`、`semantic-zz-fixes.jsonl`、`docs-zz-fixes.jsonl` |
| `naming-r0…r9.md`（第二轮顶层命名） | 放错文件 291 条、名字/说明 24 条 | [`fixer.md`](fixer.md) "第二轮"一节 | 同上（第二轮追加） |
| `naming-s0…s9.md`（第三轮顶层命名）、`tidy.md` 遗留 | 放错文件 262 条、改名 10、说明 11 | [`fixer3.md`](fixer3.md) | `placement-zzzzz-fixer3.json`（tidy：`placement-zzzz-tidy.json`）、`semantic-zzz-fixer3.jsonl`、`docs-zzz-fixer3.jsonl`、`modules-fixer3.json` |
| `naming-l0…l17`（含 l2x/l5x/l8x/l9x/l10x，第四轮参数/局部）、`naming-v0…v6`（第三方补名）、lead 的 zod 错位记录 | 名不副实 45、zod 错位 34、放错 13、官方疑似 bug/死代码 21、工具问题 9 | [`fixer4.md`](fixer4.md) | `semantic-zzzz-fixer4.jsonl`、`placement-zzzzzz-fixer4.json`、`docs-zzzz-fixer4.jsonl`、`modules-fixer4.json` |
| `naming-left-s0.md`、`naming-left-s1.md`、`naming-left-v.md`（最后补名） | 只有工具层问题（清单计数、自别名占位、`check` 不认保留名、与并行表撞名），无放错/名不副实 | lead：本文件下节 | — |
| `tools/verify/name-shape.mjs` 的形态标记（176 条语句） | 名字与初值形态不符 | `naming/_name-shape-verdicts.jsonl`（shapefix 269 条 + lead 9 条）；修正在 `semantic-zzz-shapefix*.jsonl`、`docs-zzz-shapefix.jsonl` | 工具输出 `unadjudicated: 0` |

## 工具层问题的处理（lead）

| 问题 | 来源 | 处理 |
|---|---|---|
| `annotate check` 放行保留字/全局名（`self`、`process`、`unescape`…），合并时被 `resolve` 丢弃 | v2、left-v、fixer4 | `RESERVED` 抽到 `tools/naming/lib/reserved.mjs`，`check` 与 `resolve` 共用；`check` 现在把保留名、`_K<偏移>` 占位、等于压缩名的名字都报为问题 |
| "名字 = 压缩名"的占位条目会遮住其他表的真名字，且让剩余量统计失真 | l17、left-s0、left-v | `tools/naming/drop-identity.mjs` 清掉 2,330 条（l17 第一轮 2,173 条为主） |
| 刻意取的短名（`ids`、`pin`、`ttl`、比较器的 `a/b`）被可读率算作压缩名 | lead | `readability.mjs` 单列 `chosenShort`，计为可读 |
| 清单 `unnamed` 按声明重复累计、区间交叠 | l3、l11、v6、left-* | 判断进度一律用合并后重渲染（`resolve` → `readability`），不用清单计数 |
| `annotate check` 只对照 final 快照，抓不到与并行新表的撞名 | left-s1 | 收尾全量 `resolve` + `readable-check`（0 重复）兜底；成员已自行复核 |
| 共享 final 目录被硬链接污染 | left-s1 | 已恢复（left-s1 记录了核对方法）；规则写进 `naming-round4-guide.md`：共享目录只用复制 |
