# 理解小组任务说明（2026-11-04）

用户要求组建一个 agent 团队，把官方 Claude Code CLI 2.1.316 的阅读树真正读懂。现有的 `docs/ARCHITECTURE.md` 和 `docs/handbook/*.md` 是早期按 2.1.88 布局和匹配结果写的。这次核查已经发现它们有说错的地方，比如手动 `/compact` 实际走 `compactViaReactive`，而不是 `compactConversation`。所以这一轮的原则是：**以代码为准，读代码，验证文档，补全文档**。

## 每个成员的产出

1. **核对并修改自己负责的手册**。只改分配给你的手册文件，一个文件同一时间只有一个写者。
   - 说错的地方：直接改正。
   - 缺失的 316 内容：补上。
   - 引用写法沿用手册现有格式：`reconstructed/src/...` 路径、`路径 · 函数名`、`chunk-xxx.js#压缩名` 这类声明 id。
   - 正文里**不要再出现 316 的压缩名**，比如 `fh()`。要引用声明，写真实的名字，并附上声明 id。
2. **写过程记录 `docs/process/understand-<代号>.md`**，内容包括：
   - **核对方法与范围**：读了哪些模块，核对了手册的哪些章节。
   - **端到端追踪**：至少 3 条本领域最核心的流程。每条写成调用链：`文件:行 函数 → 文件:行 函数 → …`，每一步一句话说明它做什么，关键分支写出条件。
   - **改正清单**：表格，列为"手册原说法 | 代码实际 | 证据（文件:行） | 处理"。
   - **新增内容清单**：补了哪些 316 新增或手册遗漏的机制。
   - **命名问题**：读代码时发现的错名、误导名，以及 `X_2` 和 `X` 是两个不同函数的情况。用表格列出：文件:行 | 现名 | 建议名 | 理由。**只记录，不要改命名表。**
   - **给 ARCHITECTURE.md 的建议**：它由 lead 统一修改，你只写建议。
   - **未解之处**：静态读不出来、需要运行才能确认的问题。
3. 最后一条回复给 lead，写清楚：改正了几处（列出最重要的 5 处）、新增了哪些内容、命名问题有几条、doc-refs 的结果。

## 工具与证据

在 `next/plugins/ccgateway/cli-reverse/` 目录下工作，环境是 Windows + Git Bash，路径写成 `/d/...`。

- **读代码**：`reconstructed/src/`（一方代码）、`reconstructed/vendor/`（第三方）。
  - 每个声明前面有 `//@ chunk:起-止 依据` 这样的出处注释。末尾的 `(2.1.88 match: …)` 只是线索，不是这个声明的名字。
- **查声明**：
  - `node tools/q.mjs find|show|callers|callees|where <词|声明 id>`
  - `reconstructed/symbols.jsonl`：名字 → 文件:行
- **旧版对照**：`references/claude-code-analysis/src/`（2.1.88，只读）。只用来理解意图，**不能当作 316 的实现**。
- **运行证据**：
  - `analysis/verify/original-vs-reconstructed-dist.md`：98 个运行场景的结果。
  - `tools/verify/scenarios.mjs`：场景定义。
  - `research/`：官方 CLI 实抓的请求、计费头、第一方和第三方请求形状的对比。
- **校验自己的手册**：
  ```
  node --max-old-space-size=8000 tools/verify/doc-refs.mjs . docs/handbook/<你的手册>.md
  ```
  - 用 `grep ' FAIL '` 查看失效的引用。交付时必须是 0 FAIL。
  - 它也会更新手册末尾的"引用校验结果"一节。

## 约束

- **只写**：分配给你的手册，以及你自己的 `docs/process/understand-<代号>.md`。新手册只有分配给你时才建。
- **不改**：`reconstructed/`、`naming/`、`analysis/`、`tools/`、`original/`、`docs/ARCHITECTURE.md`，以及别人的手册。
- **不要**：git 操作、跑 `tools/pipeline.sh`、再派生子代理、联网。
- **写 Markdown 一律用 Edit 或 Write 工具**。heredoc 和 `node -e` 会吞掉反斜杠，还会执行反引号。
- **每完成一部分就写一次盘**，防止被中断时丢进度。
- **用中文写**。按照 sup2api 的写作习惯：短句、主谓宾完整；先说结论，再给证据；不写口号式的总结。
