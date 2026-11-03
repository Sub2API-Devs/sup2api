# 第五阶段：全项目人类易读

目标：`reconstructed/` 里**每一个文件**读起来像人写的源码：绑定（顶层、参数、局部）有意义的名字，代码没有压缩痕迹，文件有归属和说明。

## 1. 度量

`tools/verify/readability.mjs` 统计每个绑定的最终名字是否仍像压缩名（模块是压缩的、名字与 original 中相同且 ≤3 字符；或命名来源给了不常见的 ≤3 字符名）。导入绑定不计（跟随导出方）。

```bash
node --max-old-space-size=8000 tools/verify/readability.mjs [out=analysis/readability] [final=naming/final]
```

输出 `summary.json`（按 src/vendor、top/param/local 汇总）、`files.jsonl`（每个阅读树文件）、`todo.jsonl`（每个仍压缩的绑定：`file`、`key`=`@偏移`、`min`、`path`、`scope`、`kind`、`refs`、`declId`）。

2026-11-03 起点（严格口径）：

| | 顶层 | 参数 | 局部 |
|---|---|---|---|
| src（一方） | 69.7%（剩 27,751） | 17.7%（剩 136,606） | 32.6%（剩 155,817） |
| vendor | 11.6%（剩 8,177） | 2.4%（剩 39,333） | 24.1%（剩 38,352） |

此前"≥100 字节一方顶层声明 99.9% 有名字"只是顶层大声明的口径。

## 2. 两波

- **第一波：自动化**（确定性，可复跑，进 `tools/pipeline.sh`）：
  - `vendor-names`：第三方代码与 npm 包源码对齐，取回原名 → `analysis/names/vendor.jsonl`（source `vendor`）；
  - `ref-align`：一方已匹配声明与 2.1.88 源码按词法序列对齐，取回参数与局部名 → `analysis/names/reference-align.jsonl`（source `reference`）；
  - `auto2`：自动命名增强（跨函数传播参数名 / 实参名、更多局部规则）、修复对未压缩模块的误改名 → `analysis/names/auto.jsonl`、`analysis/names/propagate.jsonl`（source `auto`）；
  - `deminify`：阅读树去压缩痕迹（`!0`→`true`、`void 0`→`undefined`、`{a: a}`→`{a}`、`typeof x > "u"`、逗号表达式语句拆开等）+ 同一外部导入的多个别名合一。语义等价用"同样的变换作用于 runnable 再跑运行时对照"证明。
- **第二波：语义命名**（子代理读代码命名，`naming/semantic-s<N>.jsonl` / `docs-s<N>.jsonl`）：自动化之后剩下的，按引用数与函数大小排序。

## 3. 共同规则（第一波）

- 只写自己名下的文件（见派活说明）和 `artifacts/tmp/<代号>/`；不改别人的工具、`naming/` 下的手写表、`reconstructed/`；不运行 `tools/pipeline.sh`；不 git commit；不派生子代理。
- 生成的 `analysis/names/*.jsonl` 先写到临时文件再改名替换（其他成员同时在读这个目录）。
- 内存：node 用 `--max-old-space-size=8000` 以内，本机同时跑多个成员。
- 带反斜杠的 JS 源码改动用 Edit/Write 工具，不要用 heredoc / sed（会吃掉反斜杠，见 lead.md 第 11 节）。
- 自测：
  ```bash
  node --max-old-space-size=8000 tools/naming/resolve.mjs analysis artifacts/tmp/<代号>/final
  node --max-old-space-size=8000 tools/verify/readability.mjs artifacts/tmp/<代号>/ra artifacts/tmp/<代号>/final
  ```
  前后对比 `summary.json`；改名引擎安全性：`node --max-old-space-size=8000 tools/rename/apply.mjs original artifacts/tmp/<代号>/final artifacts/tmp/<代号>/runnable --force --report artifacts/tmp/<代号>/rename-report.json --check`（拒绝数、α 校验 0 差异），用完删掉 `artifacts/tmp/<代号>/runnable`。
- 名字质量优先于数量：宁可不命名，也不要给错名字（错名比压缩名更误导人）。每种规则抽查 ≥30 例，写进过程文档。
- 过程文档 `docs/process/<代号>.md`（中文）：做法、数据、抽查结果、已知限制、要加进 `tools/pipeline.sh` 的命令（由主控加）。完成后 `docs/WORKLOG.md` 末尾追加一行。
