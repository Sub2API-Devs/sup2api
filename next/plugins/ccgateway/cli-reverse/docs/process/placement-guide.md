# 第三阶段：未归属代码放置指南

切分后仍有约 **17.7 MB / 48,000 个声明**没有归属（`build/readable/src/_unattributed/<chunk>/part-NNN.js`），另有约 400 个由门面 chunk 推出、但旧版没有对应文件的模块（`build/readable/src/_new/<导出名>.ts`）。它们绝大多数是 **2.1.316 相对 2.1.88 新增的一方代码**（Artifact、Fleet、云会话、工作流、插件发布、设置托管……），少量是第三方或误归。你的任务是让它们成为人能读懂的模块。

## 你负责的范围

`analysis/segments/placement-work.json` 的 `groups[<你的组号>].chunks` 列出的 chunk。处理这些 chunk 里：
- 所有 `kind = unattributed` 的声明（`analysis/segments/decl-path.jsonl` 中 path 以 `_unattributed/` 开头）；
- path 以 `_new/` 开头、且声明来自你的 chunk 的模块（门面推出的新模块，名字只是导出名，要给它找到正确的目录和文件名）。

## 怎么判断一段代码是什么

按证据强度：
1. **门面原名**（`analysis/facades/facades.json`、`analysis/names/facade.jsonl`）：门面 chunk 的导出列表就是一个源文件的原始导出名，同一门面的声明属于同一文件。
2. **字符串**：错误信息、日志前缀 `[remote-bridge]`、遥测事件名 `tengu_*`、GrowthBook 开关、设置键、环境变量、API 路径、工具名/命令名、提示词文本。
3. **调用关系**：`node tools/q.mjs callers/callees <id>`；只被某模块使用的通常是它的私有代码。
4. **chunk 内位置**：Bun 把同一源文件的顶层语句连续放在 chunk 里，相邻的未归属段常常和左右已归属的模块是同一个文件，或者是同一目录下的兄弟文件。
5. **旧版**：`references/claude-code-analysis/src` 的目录结构给出命名惯例；旧版有同名/同职责文件的，用旧版路径。
6. **第三方**：看起来像 npm 包（版权注释、通用库风格、和 Claude Code 无关的领域）就放 `vendor/<包名>/<文件>`，在 note 写证据；不确定就写 `vendor/_unknown/<主题>.js`。

## 交付物（只写这些文件，组号为 N）

1. **`naming/placement-gN.json`**：`{ "<声明 id>": "<目标路径>" }`。
   - 声明 id = `chunk-xxx.js#压缩名`（见 decl-path.jsonl 的 id）。
   - 目标路径用源码风格：`services/artifacts/publish.ts`、`components/fleet/FleetView.tsx`、`utils/cloudSession/lease.ts`；React 组件 `.tsx`，其余 `.ts`。
   - 已有的模块路径（`analysis/segments/modules.json` 的键）可以直接用来"并入"；新路径放在最合适的现有目录下，必要时新建目录（参考旧版的顶层划分：`services/`、`utils/`、`components/`、`hooks/`、`tools/<Name>Tool/`、`commands/<name>/`、`bridge/`、`cli/`、`entrypoints/` 等）。
   - 一个新文件通常 3–60 个声明；不要把整段 part 一股脑塞进一个文件，也不要每个声明一个文件。
   - **不要**再输出 `_unattributed/`、`_new/` 前缀的路径。确实无法判断的留空（不写进 placement），并在过程文档列出。
2. **`naming/semantic-pN.jsonl`**：这些声明的顶层名（以及关键参数/局部变量），格式同 `docs/process/domain-guide.md`。已有门面原名的不要写。
3. **`naming/docs-pN.jsonl`**：重要声明（导出的、被多处使用的、超过 300 字节的）的一到四行中文说明。
4. **`naming/modules-pN.json`**：你新建或并入的每个目标路径一句话说明（新文件写明"2.1.316 新增"）。
5. **`docs/process/placement-gN.md`**：过程记录：放了多少声明/字节、新建了哪些目录与文件（按主题列表）、发现的 2.1.316 新功能（简述，这是手册的重要素材）、无法判断的部分、给 lead 的建议。
6. `docs/WORKLOG.md` 末尾追加一行。

## 规则

- 工具与只读资源同 `docs/process/domain-guide.md`。批量查询请写 node 脚本放 `artifacts/tmp/pN/`，直接读 `analysis/scan/decls.jsonl`、`analysis/segments/decl-path.jsonl`、`original/<chunk>`，比反复调用 q.mjs 快得多。
- 只写自己组号的文件；不要改 `tools/`、`analysis/`、`naming/final/`、`build/`、其他人的文件；不要 git commit。
- 以覆盖率优先：先把整个范围按主题粗分到目录和文件（可以按字符串主题批量判定），再在时间允许时细化命名和说明。
- 完成后回报：放置的声明数/字节数、新建文件数、主要新功能主题、未放置的部分。
