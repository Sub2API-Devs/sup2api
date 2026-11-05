# nm318-8 命名批次过程记录

## 范围

`artifacts/tmp/batches/nm318-8/plan.json`（下标 0）：88 个 chunk、505 个声明、1603 个待命名绑定。路径跨度是 `src/services/memorySync/syncConfig.js` … `src/tools/ProjectsTool/projectRead.js`，即 services 的后半段、state、tasks、Tool/tools 主表和整个 `src/tools/**`。

## 做法

1. 先读 `AGENTS.md`、`GUIDE-naming.md`、`TASK.md`，确认只用偏移键、只写两个产物。
2. 逐段 `annotate.mjs show`，每批 3–10 个声明，结合字符串字面量（错误文案、`tengu_*`、环境变量、schema 字段名）、调用关系（谁调用、返回值怎么用、属性名）定名；`hints.jsonl` 里 2.1.316 的旧名字优先沿用（例如 `targetsOnDisk`、`checkList`、`nextAfterReplyRule`、`threadRuleMode`、`onChildLine`、`allDirs`、`checkedPath`）。
3. 每写完一批就追加进 `naming/semantic-nm318-8.jsonl` 并跑一次 `check`，遇冲突改候选名再写。
4. 大批量机械命名（模块级 `require` 绑定、`__cc_resource_*`、ssh/rsync/scp 参数分析里的小局部）用脚本从源码上下文批量生成后统一 `check`。

## 结果

- `naming/semantic-nm318-8.jsonl`：2400 行，全部 `source: "semantic"`，全部偏移键。
- `annotate.mjs check`：`2400 lines, 88 chunks, 0 problems, 0 suffixed by conflicts`。
- 覆盖率：本批 1603 个绑定全部有名字（100%）。其中约 400 条是顶层绑定，note 里写了依据（字符串常量内容、`tengu_*` 名、在规则/schema/映射里的作用）。

## 发现的问题

1. **`chunk-5xgkngpb.js` 一个 chunk 被拆进大量阅读树文件**（`toolExecution.js`、`FileReadTool`、`GrepTool`、`BashTool/*`、`LocalAgentTask` 等 40 多个）。这批里同一个 chunk 的 400 多条命名跨十几个文件，容易在同一 chunk 内撞名；已按 `same-scope` / `captures-outer-or-global` 报错逐个改掉（例如 `gitBashNote` → `gitBashEnvNote`、`input` → `callInput`、`task` → `taskEntry`）。合并时若报同 chunk 冲突，属于同因。
2. `chunk-frs14hy1.js`、`chunk-yz2nt7xx.js`、`chunk-2c3pj4kn.js` 也有同样情况（同一 chunk 分散在 AgentTool 多个文件）。
3. `chunk-y1rdce29.js` 是纯资源表（`__cc_resource_19/28/30/40/52/...` 与 `readEmbeddedTextSync`）。`SKILL_FILES` 由压缩名 `Wp` 在导出表里拼成；导出的 `SKILL_FILES` 名已在 `naming/final/top.json` 里（`@14116`），因此 `@14904`（`Wp`，实际 SKILL_FILES 对象）只能退一步命名为 `SKILL_FILES`，check 会按同 scope 处理。
4. `chunk-6hqkes0x.js` 的 `SKILL_MD`、`nonStorybookSkillText` 等也来自同一模式（`__cc_resource` + `readEmbeddedTextSync`），命名依据是导出表的键名（`storybook/SKILL.md`、`non-storybook/SKILL.md`）。
5. 只看名字看不出用途、但影响不大的地方：`chunk-5xgkngpb.js@3261713`（`savedCopyFramingModule`）等几个 lazy `require` 包装，名字来自调用方的用法，不是原义。
6. 有一处旧名字来源不完整：`chunk-h2y5xkdx.js#pn`（`analyzeRsyncScp`）在 316 的 hints 里只有 4 条（`remoteCommands`、`hostCandidates` 等），318 新增的 scp/sftp 分支局部没有 316 对照，按 318 的字符串和参数名现起名。

## 遗留

- 无跳过项。规则里给的“跳过 unnamed ≤ 2 且 refs 很少的小声明”最终也补完了。
- 名字密度最高的 chunk 是 `chunk-5xgkngpb.js`（407 条），合并时值得优先跑一遍 `readable-check` 看有没有同名重组。
