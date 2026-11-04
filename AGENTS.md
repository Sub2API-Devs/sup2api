# AGENTS.md：给在本仓库工作的 AI 与成员

本仓库是官方 Claude Code CLI 的 AST 逆向工程项目，是一个独立项目。主线是把 **2.1.316** 还原成能读、能编译运行的阅读树 `reconstructed/`。此外，`research/` 收录官方 CLI 的行为研究，`tools/versions/` 提供版本对比工具。

本文件是本仓库唯一的指令文件。

## 沟通

- 始终用中文回复，文档也用中文写。
- 用户的错别字和大小写不一致，按上下文和常识理解。

## 硬规则

1. `original/` 是从官方 ELF 提取的真值，**只读**。阅读树里的所有内容都必须能追溯到 `original/` 的文件和字节区间。
2. `references/claude-code-analysis/` 是旧版源码（约 2.1.88），**只读**，只用来取名字和目录线索。不得把旧版代码当成 316 的实现拷进输出。名字要标注来源：facade / semantic / vendor / reference / auto。
3. 不要手工改生成物，包括 `reconstructed/`、`naming/final/`、`analysis/` 下工具写出的文件、`runnable/`。要改就改生成器（`tools/`）或命名表、放置表（`naming/semantic-*`、`docs-*`、`modules-*`、`placement-*`），再跑 `tools/pipeline.sh`。
4. 改动之后要证明没改坏。运行对拍 98 个场景全部一致，α 校验和规范形校验 0 差异，`readable-check` 全部通过。这些都在 `VERIFY=1 bash tools/pipeline.sh` 里，跑法和结果的读法见 README 的"验证方法"一节。
5. 编译用的 Bun 版本必须等于官方 ELF 内嵌的版本：2.1.316 是 **1.4.4**。`restore-bun.cjs` 会把内嵌版本写进 `original/reconstruction.json`，`reconstructed/build.mjs` 会拒绝其他版本。换版本时以 ELF 实际内嵌的版本为准，不要凭记忆。
6. 每一步都要写文档。里程碑写 `docs/WORKLOG.md`，一两行。细节写 `docs/process/<角色或主题>.md`：做了什么、怎么做、数据、发现、坑、没做完的。
7. 工具必须可复现：输入、输出路径写在文件头注释里。
8. 大文件不入库，包括 ELF、`node_modules`、`analysis/scan`、`runnable/`、`artifacts/tmp`、`artifacts/versions`，见 `.gitignore`。
9. `research/` 是从 sup2api 迁入的研究快照，文档保持原样。补充结论另写新文件，或在文末加"补充（日期）"一节。不要改动原文。
10. 与 sup2api 的关系：sup2api（`D:\projects\golang\sup2api`）是使用这些研究结论的产品项目，它的定制 CLI（ccgateway）仍在 sup2api 里维护。本仓库的工作**不修改 sup2api**。sup2api 需要的结论由 sup2api 自己的会话来取用。

## 子代理与团队

- 量大但机械的任务用 `model: "sonnet"` 的子代理，比如逐个命名、翻译、写说明、核对引用。设计工具、构建链路、等价性论证用默认模型。
- 一个目录或文件同一时间只有一个写者。并行成员各写自己的表，例如 `naming/semantic-<代号>.jsonl`。共享目录（`naming/final`、`artifacts/tmp/lead/final*`）只读，要预览就用 `cp` 复制一份，**不要用 `ln`**：Git Bash 上 `ln` 会建硬链接，写预览就会写坏共享表。
- 子代理不 commit、不跑 pipeline、不再派生子代理；每完成一批就写盘，防止被中断时丢进度。由 lead 统一合并、校验、提交。
- 派活的提示词要写清楚以下几项：范围、输入、命令、产物路径、校验命令和通过标准、禁改目录、"发现的问题"要写进过程文档。

## 本机环境（Windows + Git Bash）

- Node 24。没有全局 bun，Bun 1.4.4 由根目录的 npm 包 `bun@1.4.4` 提供（`node_modules/bun/bin/bun.exe`）。没有 rg、bc。`python` 是 WindowsApps 的占位符，不能用。
- **heredoc 和 `node -e` 会吞反斜杠、执行反引号**。正则、Markdown、模板字符串这类内容，一律用 Edit 或 Write 工具写；必须用 shell 时，heredoc 写成 `<<'EOF'`。写完 grep 一下确认内容没被改。
- 访问外网（下载官方 ELF、npm）要走本机代理：`HTTPS_PROXY=http://127.0.0.1:7890`。Node 自带的 fetch 还要加 `NODE_USE_ENV_PROXY=1`。
- 本仓库没有 git 远端，只做本地提交。要推到远端，需要用户同意。

## 读代码从哪里开始

- 总览：`README.md`，包括最终统计、构建运行、验证方法、已知限制。
- 架构与一次请求的全过程：`docs/ARCHITECTURE.md`；子系统手册：`docs/handbook/`。
- 找函数：`reconstructed/symbols.jsonl`，或运行 `node tools/q.mjs find|show|callers|callees|where <词或声明 id>`。
- 项目怎么做出来的：`docs/PLAN.md`、`docs/WORKLOG.md`、`docs/process/`。问题报告和裁决的对照表在 `docs/process/fixes-index.md`。
- 官方 CLI 的行为结论（请求组装、计费头、附件、第一方/第三方形状、各版本变化）：`research/README.md`。
- 版本对比：`tools/versions/README.md`。
