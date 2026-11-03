# 第五阶段：第四轮报告的问题（fixer4）指南

第四轮参数/局部命名（naming-l*）和第三方补名（naming-v*）的成员在过程文档里记录了"发现的问题"。目标要求：**各轮过程文档记录的放错文件、名不副实条目逐条修正或驳回**。本轮把它们核对后落地。

## 输入

- `docs/process/naming-l*.md`、`docs/process/naming-v*.md` 的"发现的问题"一节。
- `artifacts/tmp/lead/fix-queue.md`（lead 记下的：zod v4 `core/api.js` 与 `classic/schemas.js` 的第三方名字整体错位一格）。
- 判断标准与输出格式同 `docs/process/fixer3-guide.md`（放置表、semantic 修正表 confidence 0.97、docs 修正、modules 说明）。查证工具：`node tools/q.mjs callers|callees|where|bindings`，`node --max-old-space-size=3000 tools/naming/annotate.mjs id <声明id> artifacts/tmp/lead/final8`。

## 分类与处理

1. **名不副实的顶层名**（例：`PLACEABLE_FILE_TYPES = 3000` 实为时间预算 ms；`MAX_SPAWN_RETRIES = 4` 实为描述长度阈值；`isBedrockRegion` 实为 profile 名含 bedrock；`extractMarkupText`、`formatScanNotRun`、`appendEntryToFile` 类）→ 按函数体/用法改名。
2. **第三方名字错位**（zod 那段）→ 按函数体逐个改名。
3. **放错文件**（例：`isMarkdownTooComplex` 只被 `daemon/controlServer.js` 使用却在 `spawnLauncher.js`；`line-width-cache.js` 实为终端输入读取器）→ 放置表，或驳回（说明理由）。
4. **官方代码本身的疑似 bug / 死代码 / 两套实现**（例：`uniqueValues` 恒返回空数组、`getClipboardCommands` 两边同为 linux、v1/v2 双份 OAuth 实现）→ **不改代码**（忠实还原官方构建），在 `docs/process/fixer4.md` 记为"官方行为，保留"，并在对应声明的说明（docs 修正表）里加一句提示读者。
5. **工具层面的问题**（`show` 头部、计数过期等）→ 记为"lead 处理/已处理"，不在本轮改。

## 输出

- `naming/placement-zzzzzz-fixer4.json`、`naming/semantic-zzzz-fixer4.jsonl`（confidence 0.97）、`naming/docs-zzzz-fixer4.jsonl`、`naming/modules-fixer4.json`（如有新文件）。
- `docs/process/fixer4.md`：逐条裁决表（来源文档、条目、类别、裁决 改名/搬/驳回/官方行为保留、理由）、汇总；`docs/WORKLOG.md` 末尾一行。

## 校验

- `node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-zzzz-fixer4.jsonl artifacts/tmp/lead/final8` 0 problems；放置表键全部存在于 `analysis/scan/decls.jsonl`，目标路径合法（无 `_new/`、`_unattributed/`）。

## 规则

只写上述文件和 `artifacts/tmp/fixer4/`；不改 tools/、analysis/、其他 naming 文件、reconstructed/；不跑 pipeline；不 commit；不派生子代理；node ≤3000 MB；每处理约 30 条就把已裁决的写进输出文件和 fixer4.md（防止上下文用尽丢进度）。`naming-l3.md`、`naming-v2.md` 会晚些出现（成员还在做），lead 会通知你再处理。
