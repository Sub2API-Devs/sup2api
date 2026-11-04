# 第二阶段：领域成员工作指南

每个领域成员负责一个子系统（领域清单与模块列表在 `analysis/segments/domains.json`，按路径前缀划分，规则在 `tools/segment/domains.mjs`）。目标：让该子系统的重组源码**人能看懂、AI 能读懂**，并写出函数级的子系统手册。

## 你能用的东西（全部只读）

| 资源 | 用途 |
|---|---|
| `build/readable/src/<path>.js` | 当前阅读树（lead 定期重新生成）。每个声明前有出处行 `//@ chunk-xxx.js:起-止 归属方法 = 旧版名 (分数)` |
| `node tools/q.mjs show <id\|名字>` | 单个声明的格式化源码，**实时**套用所有命名（含你刚写的 semantic 名） |
| `node tools/q.mjs bindings <id\|名字>` | 声明内全部绑定：命名键 `@偏移`、压缩名、当前名与来源、引用数、上下文 |
| `node tools/q.mjs module-bindings <path>` | 一个重组模块的全部绑定 |
| `node tools/q.mjs callers/callees <id\|名字>`、`find <文本>`、`module <path>`、`where <chunk>` | 关系与检索 |
| `references/claude-code-analysis/src/` | 旧版 2.1.88 源码，取名字与意图；**316 的实现以 original 为准** |
| `references/claude-code-analysis/analysis/` | 旧版的分析文档，可参考结构，但每个结论都要用 316 代码核实 |
| `analysis/match/decl-map.jsonl` | 每个声明的旧版匹配（ref、分数、方法） |

声明 id 是 `chunk-xxx.js#压缩名`。命名键 `@N` 是绑定声明标识符在 `original/<chunk>` 里的字节偏移（不会变）。

## 你要写的东西（只写这些文件）

1. **`naming/semantic-<领域>.jsonl`**：语义命名，每行一条：
   ```json
   {"file":"chunk-cgcrer2m.js","key":"@2171","name":"getTrimmedEnvValue","source":"semantic","confidence":0.8,"note":"读 env，CLAUDE_CONFIG_DIR 特判，空串视为未设置"}
   ```
   - 优先级高于旧版名和自动名；只在你**确认**含义时写，置信度 0.6–0.95。
   - 要改掉的：仍是压缩名的顶层函数/常量/类、重要参数和局部变量；明显错误的旧版名或自动名（例如匹配错了的）也可以覆盖，在 note 写原因。
   - 名字风格跟旧版一致：函数 camelCase 动词开头，常量 UPPER_SNAKE，类/组件 PascalCase，布尔 is/has/should。不要用保留字和 `process`、`require` 之类全局名（引擎会自动加后缀，但应避免）。
   - 局部变量不必穷尽：优先命名函数参数、跨越多行使用的变量、返回值；循环下标、一次性临时值可以不管。
   - 冲突不用自己处理，引擎会在作用域冲突时加 `_2`。
2. **`naming/docs-<领域>.jsonl`**：声明级说明，lead 的生成器会把它作为 JSDoc 放在声明前：
   ```json
   {"id":"chunk-cgcrer2m.js#KEr","doc":"读取环境变量并去掉首尾空白；空串返回 undefined。CLAUDE_CONFIG_DIR 走 getClaudeConfigHomeDir。"}
   ```
   覆盖该领域的所有导出/被其他模块使用的函数和关键内部函数，中文，1–4 行，讲做什么、关键分支、副作用；不要逐行复述代码。
3. **`naming/modules-<领域>.json`**：`{"<重组模块路径>": "一句话中文说明"}`，覆盖该领域全部模块，生成器放进模块头注释和总索引。
4. **`docs/handbook/<领域>.md`**：子系统手册，至少包含：
   - 概述：这个子系统负责什么、在整体中的位置（谁调用它、它调用谁）。
   - 模块地图：主要文件及职责（链接到 `reconstructed/src/...`，以重组路径为准）。
   - 关键流程：按调用顺序列出函数（`路径 · 函数名`），说明每步做什么、关键分支和状态变化；配一段时序或调用链。
   - 数据结构：主要对象/消息/配置的字段形状（从代码里读出来的，不是猜的）。
   - 配置项与环境变量：读了哪些 env、settings 键、特性开关（GrowthBook/statsig 名）。
   - 与 2.1.88（旧版）的差异：新增/删除/改名的功能，有代码证据就写。
   - 未解之处：没弄清的地方，列出声明 id。
5. **`docs/process/domain-<领域>.md`**：过程记录（做了哪些、命名多少条、覆盖率、遇到的问题、给 lead 的建议，例如切分错误：某声明被归错了文件）。

## 规则

- 以 `original/` 的代码为唯一依据；旧版代码只用来取名字和理解意图，结论必须在 316 代码里能看到。
- 发现**切分或匹配错误**（声明归错文件、第三方代码混在你的领域、旧版名明显配错），不要改别人的文件：写进你的过程文档"给 lead 的建议"一节，格式 `声明 id → 应归属路径/应叫什么，证据`。
- 不要改 `original/`、`references/`、`tools/`、`analysis/`、`naming/final/`、`build/`、其他领域的文件。不要 git commit。
- 每完成一批，在 `docs/WORKLOG.md` 末尾追加一行（只追加）。
- `_unattributed/` 下的代码（未归属，含 316 新增一方代码和尚未识别的第三方）暂不处理；第三方识别完成后 lead 会另行分派。
- 本机 Windows + Git Bash，Node 24；没有 rg，用 grep。q.mjs 每次调用约 2 秒，批量查询可以在一个 node 脚本里多次调用逻辑（读 tools/q.mjs 自己写临时脚本，放 `artifacts/tmp/<领域>/`）。
