# AGENTS.md — 给在本仓库工作的 AI 与成员

本仓库是官方 Claude Code CLI **2.1.316** 的 AST 逆向工程。用中文写文档和回复。

## 硬规则

1. `original/` 是从官方 ELF 提取的真值，**只读**。所有输出都必须能追溯到 `original/` 的文件和字节区间。
2. `references/claude-code-analysis/` 是旧版源码（约 2.1.88），**只读**，只用来取名字和目录线索；不得把旧版代码当成 316 的实现拷贝进输出。名字来源要标注（reference / vendor / semantic / auto）。
3. 一个目录只有一个写者（见 `docs/PLAN.md` 第 4 节）。不要改别人负责的目录；需要改时在 `docs/WORKLOG.md` 里留言或回报给 lead。
4. 每一步都要写文档：里程碑写 `docs/WORKLOG.md`（一两行），细节写自己负责的 `docs/process/<角色>.md`（做了什么、怎么做、数据、发现、坑、未完成）。
5. 工具必须可复现：输入、输出路径写在文件头注释里；不要手工改生成物，改生成器或命名表。
6. 大文件（ELF、node_modules、`analysis/scan`）不入库，见 `.gitignore`。
7. 本机是 Windows + Git Bash，Node 24；没有全局 bun，Bun 1.4.4 用 npm 包 `bun@1.4.4` 提供。

## 读代码从哪里开始

- 总览与分层：`docs/PLAN.md`
- 阅读指南与索引：`docs/INDEX.md`（第三阶段生成）
- 子系统手册：`docs/handbook/`
- 符号索引：`analysis/symbols.json`（符号 → 文件/行/来源/说明）
