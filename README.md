# Claude Code 2.1.316 逆向重建

把官方 Claude Code CLI **2.1.316**（linux-x64 单文件可执行，sha256 `fd13c700…d824`）基于 **AST 语法分析**还原成一个人能读、AI 能读、有详细文档的项目。所有代码都从官方二进制推导而来；旧版源码（2.1.88，`references/claude-code-analysis` 子模块）只用来提供名字、目录结构和意图线索。

> 这是一个研究项目。代码版权属于 Anthropic PBC（每个生成文件保留原始版权声明来源）；本仓库不分发官方二进制本身。

## 从哪里开始读

| 你想 | 去看 |
|---|---|
| 了解整体架构、一次请求怎么走完 | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| 按子系统深入（函数级） | [`docs/handbook/`](docs/handbook/)：启动、查询循环、工具、权限、扩展、状态、UI、Ink、代理、命令 |
| 读源码 | [`reconstructed/src/`](reconstructed/src/)（一方代码，按 2.1.88 目录布局）、`reconstructed/vendor/`（第三方包） |
| 找一个函数 | `reconstructed/symbols.jsonl`（名字 → 文件:行、来源、说明），或 `node tools/q.mjs find <词>` |
| 了解 316 相对旧版的变化 | 各手册的"与 2.1.88 的差异"一节；[`docs/CHANGES-SINCE-2.1.88.md`](docs/CHANGES-SINCE-2.1.88.md) |
| 了解这个项目是怎么做出来的 | [`docs/PLAN.md`](docs/PLAN.md)、[`docs/WORKLOG.md`](docs/WORKLOG.md)、[`docs/process/`](docs/process/) |
| 作为 AI 在本仓库工作 | [`AGENTS.md`](AGENTS.md) |

## 目录

```
artifacts/official/   官方 ELF（不入库，按 sha256 校验）与 manifest
original/             从 ELF 提取的 2,880 个模块（2,648 JS + 232 资源），只读真值
analysis/             AST 事实与中间结果：scan / reference / match / vendor / facades / segments / names / verify
naming/               命名与文档输入：semantic-*（语义名）、docs-*（声明说明）、modules-*（模块说明）、placement-*（放置）
  final/              合并后的最终命名表（生成物）
reconstructed/        ★ 阅读树（生成物）：src/ 一方、vendor/ 第三方、runtime/、assets/、manifest.json、symbols.jsonl
runnable/             改名后的可运行树（生成物，不入库；与 original 布局一致，可用 Bun 直接运行）
tools/                全部流水线工具（extract / ast / vendor / segment / naming / rename / emit / verify / q.mjs）
docs/                 架构、手册、过程记录
references/           旧版源码子模块（只读）
```

## 重建流程

```bash
npm ci --ignore-scripts
# 官方 ELF 放到 artifacts/official/claude-linux-x64（sha256 见 official-manifest.json）
node tools/extract/restore-bun.cjs artifacts/official/claude-linux-x64 original 2.1.316   # 目标目录需不存在
SCAN=1 bash tools/pipeline.sh          # 扫描 → 匹配 → 门面 → 切分 → 命名 → runnable/ + build/readable
VERIFY=1 bash tools/pipeline.sh        # 另跑运行对拍（original vs runnable，54 个场景）
bash tools/vendor/run.sh               # 第三方识别（需联网下载 npm 包，约 15 分钟；结果已入库）
```

## 怎么保证"完全基于官方 316"且没改坏

1. **出处**：每个模块都可追溯到 ELF 中的模块表项（`original/reconstruction.json` 记录偏移与 sha256）；阅读树里每个声明前有一行 `//@ chunk-xxx.js:起-止 归属方法 = 旧版名`，指回 `original/` 的字节区间。
2. **改名不改语义**：`tools/rename` 的作用域分析器 + α 等价校验——改名前后 AST 只差绑定名、绑定对应是双射、跨模块导入导出一致；400 万个标识符 0 差异。负例测试证明错误改名会被拒绝。
3. **运行一致**：`tools/verify` 用 Bun 1.4.4 在隔离沙箱里跑 `original/` 和 `runnable/`，本地假 Anthropic API 记录每个请求；54 个场景（版本/帮助/子命令/`-p`/工具往返/MCP/Ink 交互界面）的输出与请求体逐字段一致。

## 命名来源与可信度

阅读树中的名字按优先级取自：

| 来源 | 含义 | 可信度 |
|---|---|---|
| `facade` | Bun 门面 chunk 的 `export{x as 原名}`，源码原始导出名 | 确定 |
| `semantic` | 领域成员读代码后起的名字（带说明） | 高 |
| `vendor` | 与 npm 包源码对齐的名字 | 高 |
| `reference` | 与 2.1.88 源码匹配得到的名字（指纹 + 调用图） | 中 |
| `auto` | 代码证据推出的名字（解构键、方法名、`catch` → `error`…） | 低 |
| （压缩名） | 未能命名 | — |

每个名字的来源见 `reconstructed/symbols.jsonl` 和 `naming/final/top.json`。
