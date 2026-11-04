# 第五阶段第二波（2a）：顶层名补全指南

阅读树一方代码（reconstructed/src）里还有 **27,751 个顶层绑定仍是压缩名**（严格口径，见 `docs/process/readability-guide.md`）。多是小工具函数（`function X(e){return e.type==="assistant"&&…}`）、常量组（`var vGo=30000,CGo=3600000,…`）、多声明 `var` 里的次要绑定、小类。自动化（第一波）对顶层名帮不上，这一轮由命名成员读代码补齐。

## 你的范围

`analysis/segments/naming-round3.json` 是数组，第 N 项（N = 你的组号）：
- `dirs`：负责的目录；
- `items`：待命名绑定 `{id, file, key, name, path, line, refs, kind}`。`file` 是 original 里的 chunk，`key` 是该绑定声明标识符的偏移 `@N`（**直接用作命名表的 key**），`name` 是当前压缩名，`path`/`line` 是它在阅读树中的位置（声明所在的出处行 `//@` 附近），`refs` 是引用次数。

## 做法

1. 按文件读：打开 `path`，看声明本身和周围已命名的代码；需要时 `node tools/q.mjs callers <id>` 看调用方。
2. 顶层名写进 `naming/semantic-s<N>.jsonl`，每行 `{"file":"chunk-xxx.js","key":"@123","name":"isAssistantMessage","source":"semantic","confidence":0.8}`。
3. 命名风格：函数/变量 lowerCamelCase，类 PascalCase，模块级常量（数字、字符串、正则、冻结表）UPPER_SNAKE_CASE 并带单位（`POLL_INTERVAL_MS`、`MAX_RETRIES`）；React 组件 PascalCase；布尔 is/has/should 开头。同一文件里一组相关常量命名要成体系。
4. 被导出或 ≥300 字节的声明，在 `naming/docs-s<N>.jsonl` 写 1–3 行中文说明（`{"id":"<declId>","doc":"…"}`）；已有说明的不重复写。
5. 置信度 0.6–0.95；看不懂用途的宁可不命名（错名比压缩名更误导人），记进过程文档。
6. 不要用保留字和全局名（`process`、`Buffer`、`fetch`、`URL` 等，完整列表见 tools/naming/resolve.mjs 的 RESERVED）；与同文件已有名字重名时引擎会自动加后缀，但应尽量避开。
7. 门面原名（`analysis/names/facade.jsonl`）和已有 semantic 名不在你的清单里，不要覆盖。

## 交付物（N 为组号）

- `naming/semantic-s<N>.jsonl`、`naming/docs-s<N>.jsonl`
- `docs/process/naming-s<N>.md`：命名了多少、说明多少、没命名的及原因、发现的问题（放错文件的声明：`声明 id → 应归路径，证据`）。
- `docs/WORKLOG.md` 末尾追加一行。

## 规则

- 只写上述文件和 `artifacts/tmp/s<N>/`；不改 tools/、analysis/、naming/ 下其他文件、reconstructed/；不 git commit；不派生子代理；不运行 `tools/pipeline.sh`。同时在工作的还有第一波自动化成员（vendor-names、ref-align、auto2、deminify）和其他 9 个命名组。
- 完成前用改名引擎试跑：对你涉及的每个 chunk 调 `tools/rename/lib/rename.mjs` 的 `renameModule`（用法见 `naming/README.md` 和 `docs/process/naming-r0.md` 等上一轮成员的做法），确认 0 拒绝。node 内存 ≤4000 MB。
- 覆盖率优先：先把清单里全部顶层名命名，再写说明。
