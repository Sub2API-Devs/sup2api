# 第五阶段第二波命名：name-s6（组 6）

范围：`analysis/segments/naming-round3.json` 第 6 项（index 5），共 3,181 个顶层绑定 / 2,324 个声明，分布在 369 个阅读树文件、225 个 chunk。集中区域：`tools/ArtifactTool`（556）、`skills/bundled`（426）、`services/remoteTools`（298）、`services/selfHostedRunner`（190）、`services/projects`（140）、`tools/AgentTool`（136）、`services/policyLimits`（133）、`services/tools`（113）、`services/workflow(s)`（124）、`services/tips`（79）、`services/remoteManagedSettings`（76）、`services/usageInsights`（66）、`services/rateLimit*`（65+3）、`services/skillsSync`（57）、`services/usageCreditOffers.js`（41）、`services/teamMemorySync`、`services/taskFiles`、`tasks/*`、`skills/*`、`state/*`、以及 `setup.js`、`Tool.js`、`tools.js`。

## 结果

| 项 | 数量 |
|---|---|
| 顶层绑定命名 | 3,181 / 3,181（`naming/semantic-s6.jsonl` 3,181 条，键不重复） |
| 声明覆盖 | 2,324 / 2,324 |
| 说明（`naming/docs-s6.jsonl`） | 1,490 条；本组「被导出或 ≥300 字节」的 696 个声明里，651 个由本表写说明，另 45 个已有其他说明表覆盖（`docs-p0/p3/prest/tools/r9/extensions` 等），合并后剩余 0 |
| 改名引擎校验 | 225 个 chunk 逐个调用 `renameModule`（只加载本表）：3,181 条，实际改名 3,181，拒绝 0，冲突 0。脚本 `artifacts/tmp/s6/validate.mjs` |

置信度分布：0.85 的 8 条，0.82 的 60 条，0.8 的 237 条，0.78 的 577 条，0.75 的 991 条，0.72 的 649 条，0.7 的 190 条，0.68 的 22 条，0.65 的 379 条，0.62 的 17 条，0.6 的 51 条（0.6 多为只能从调用点/初值推断单位的常量、构建时裁掉的占位、以及只被一处调用的短小助手）。

做法：

- `artifacts/tmp/s6/items.json`（本组 items 原样）、`rows.mjs`→`rows.json`：给每条补 `declId`、`bytes`、`exported`、`strings`（按 `analysis/scan/decls.jsonl` 的 start/end 匹配）。
- `dump.mjs`→`dump/NNN-<file>.txt`：按阅读树文件输出相关声明源码（含 `//@ chunk:start-end` 标记，截断 70 行/3500 字符）；`compact.mjs`→`compact.txt` 生成带源码的紧凑清单；`list.mjs <path>` 按文件列剩余条目。
- 决策稿 `artifacts/tmp/s6/n/*.txt`：`T <file>@<offset> <Name> <confidence> | 备注`、`D <declId> 说明`、`S <id> 原因`。`build.mjs` 编译成两张表并校验文件归属、名字合法性、保留字、重复键、未知 id；`validate.mjs` 按 chunk 用 `renameModule` 试跑。
- `genres.mjs`/`resmap.mjs`/`resourceStats.mjs`：为 `__cc_resource_N`/`Et(...)` 内嵌资源映射批量按资源文件名/资源表键命名（327 条，0.65），并按所属技能（如 `mods/resources.js`、`storybookResources.js`）补说明。
- `crossuse.mjs`：扫描 `import { X } from "…"` 且解析目标确实是本文件的跨顶层目录引用，用于找「放错文件」候选（结果 `misplaced.json`）。

## 命名风格

- 函数 lowerCamelCase、类/接口 PascalCase、模块级常量 UPPER_SNAKE_CASE 并带单位（`_MS`、`_BYTES`、`_CHARS`、`_TTL_MS`）；布尔 `is/has/should/can/needs`；宿主插槽统一 `*Slot(s)`（`HostScoped`、`SessionRootSlot`）。
- ArtifactTool 的内联提示词段落统一 `PAGE_RULES_*`/`PAGE_CONTRACT_*`/`CORE_*_PARAGRAPH`，动作处理器统一 `ARTIFACT_<ACTION>_ACTION_HANDLER`，结果渲染表统一 `ARTIFACT_*_RESULT_RENDERERS`。
- policyLimits 统一 `Policy*`（`PolicyLimitsClient`、`policyState`、`policyEvidence`、`startupGate`、`cacheStamp`），feature 开关统一 `is<Flag>On`。
- 外部构建被裁掉的空壳/占位按含义命名并注明「占位/此构建为 null」：`noop*Stub`、`neverTrue`、`internalExtraToolSlot`、`ARTIFACT_ROOMS_MODULE` 等。

## 还没命名的

- 顶层：没有，3,181 个绑定全部命名。
- 说明：本组 696 个应说明声明已 100% 覆盖（含 45 个由其他表覆盖），无遗漏。
- 把握较低（0.6–0.62，共 68 条）的典型：
  - 只有数值、单位/用途靠调用点推断的常量（`TIP_MAX_NOTE_CHARS`、`MAX_NOTIFIED_AGENTS`、`DETACHED_SHELL_POLL_MS`、`BASE64_LINE_WIDTHS`）；
  - 构建时裁掉的占位（`noopSimplifySkillStub` 等 6 个空函数、`neverTrue`、`isBigQueryMetricsEnabled`、`noteStoredLoginSurface`、`eligibilityOverride`、`storageSlotOrNull`）；
  - 惰性注入且当前为 null 的模块槽（`watchLiveArmsRef`、`LIVE_EDIT_RESULT_MODULE`、`CORE_FILES_LIVE_MODULE` 等）；
  - 只被一处调用的短小助手（`trimmedOrEmpty`、`errorMessageString`、`parseTimestampSafe`、`enumOrUndefined`）。
- 已逐条核对并修正的错误命名（自查阶段）：`chunk-jmtrt20w.js@565/573/580` 原按数值猜成「文件字符/标题长度」上限，实际是预览丢弃问题数、截图数、错误数上限（依据 `preview.js` 的 `slice(0, …)` 与 `issuesDropped`），已改名；`chunk-zv6whf9m.js@14996` 与 @15018 撞名，改为 `usageCreditHostStates`。

## 发现的放错文件/名不副实的声明

格式：`声明 id → 应归路径，证据`。仅记录证据，未移动任何代码。

- `chunk-aepeg2w5.js#Aro` / `#Cro`（`IOS_SIMULATOR_DISPLAY_NAME`、`ANDROID_EMULATOR_DISPLAY_NAME`）→ 应归 `services/analytics/metadata.js` 或 `services/tools/toolExecution.js` 所用的设备工具模块。证据：`routinesApi.js` 里只是顺带导出；实际使用方是 `services/analytics/metadata.js`（`{ [Aro]: "mobile_simulator_ios", [Cro]: "mobile_simulator_android" }`）与 `services/tools/toolExecution.js`（`[Aro, Cro].flatMap(getMcpPrefix…)`），与 routines API 无关。
- `chunk-88g43zt5.js#dn`（`agentProxyForwarderSlots`）→ 「独立 agent 代理」状态被放在 `services/selfHostedRunner/agentProxyStandalone.js`，但同一 chunk 的 `egressProxy.js`、`relayForwarderSlot` 才是同类宿主状态；文件名与内容一致，属正常，仅在此记录它与 selfHostedRunner 之外的中继状态强耦合（`isAgentProxyStandaloneActive` 读 `forwarder`）。
- `chunk-41w44bgm.js#Fs`（`O_NONBLOCK_FLAG`）→ 应归 `utils/task/diskOutput.js` 或与 `O_NOFOLLOW_FLAG` 同处；证据：`skills/bundledSkills.js` 里同时定义 `Fs`（O_NONBLOCK）和 `O_NOFOLLOW_FLAG`，但 `Fs` 在文件内无任何使用，唯一消费方 `services/workflow/scriptFile.js` 只用 `O_NOFOLLOW_FLAG`；`utils/task/diskOutput.js` 已有同义常量。
- `chunk-8wvtd8sr.js#Js`（`artifactCardTitleOf`）→ 只是 `artifactUrls.js#artifactCardTitle` 的转发，函数体为 `return artifactCardTitle(e)`；放在 `durableWake.js` 仅为障碍（barrel）转发，可归 `artifactUrls.js` 或删除。
- `chunk-9fcadreh.js#DCs` / `#LCs` → `changesPaneRefusals.js` 里的正则匹配助手，但 `DCs` 只用于拼 `CHANGES_PANE_SETTING_PATTERNS` 里的 joined 正则、`LCs` 只与 `Wmo/Gmo` 比较，属正常的文件内助手；对 `services/selfHostedRunner/changesPaneRefusals.js` 而言没有放错，但 `DCs` 复用 `gitIgnore` 风格原因串（`.git/…`）而非「变更面板」，名字据此取的。
- `chunk-zv6whf9m.js#we`（`usageCreditHostStates`）与 `#yz`：同一文件里有两套「按 host 保存的用量额度状态」（`we` 与另一处 `yz` 的 `of()`），其中 `we` 无引用、`yz` 才是被 `s9()` 使用的入口，疑似构建裁剪残留。
- `chunk-tmx5d02z.js#ji` 的 `AppifactReplToolAlias`…`AppifactReplToolExport4` → 同一对象在 `export { … }` 里连出 5 个别名（阅读树按导出名分别记），实际是同一个 `buildTool` 结果，属导出层冗余而非放错文件。
- `chunk-e6aww6q8.js#m$o`、`#V6n`、`#K6n`、`#pet`、`#p$o`、`#B_e`、`#$Et`（claude-test 插件常量与助手）→ 语义上属于 `plugins/bundled/claudeTest/`，现在被放在 `services/pluginTest/claudeTestPlugin.js`（插件测试框架目录）；证据：导出名与 `plugins/bundled/claudeTest` 的技能/插件清单一致，且 `entrypoints` 侧只把它当作「已安装的测试插件」读取。
- `chunk-9tyqgtn4.js#lTs`（技能读/渲染协议常量）与 `#mTs`（插件命令协议常量）→ 现在在 `services/remoteTools/commandRendering.js`，与文件职责一致，无需移动；记录在此是因为二者与 `services/remoteTools/*` 里其余的 MCP 协议常量（`backgroundCommands.js`、`servingGates.js`）风格不同，若后续拆分协议模块可一并迁出。
- `chunk-6vnxsn99.js#Cn`（`UNLIMITED_RATE_LIMITER`）→ 「永不限流的限流器」是任务循环的默认占位，与 `tasks/taskLoopRegistry.js` 相符，无需移动；记录它是因为同文件还有 `Re`（结算回调执行）等通用助手，若后续拆出限流/任务循环两个模块，这几个应随限流器一起走。

## 与其他命名表的重合（交给 lead 取舍）

- 说明表：本组 651 个由本表写的说明里，与 `docs-p0/p3/prest/tools/r9/extensions/p2/p4/p6/p7/state` 重复的 58 条已删除（保留对方说明），当前 `docs-s6.jsonl` 与任何其他 `docs-*.jsonl` 均无重复 id。
- 命名表：与 `naming/semantic-p0/p2/p3/p5/state/tools-lowconf` 重合的键均为同名或不同角度（如 `usageCreditStateSlots` 撞名已改为 `usageCreditHostStates` 避让），本表内部引擎试跑 0 冲突。

## 工具（都在 `artifacts/tmp/s6/`）

- `rows.mjs`、`dump.mjs`、`compact.mjs`、`list.mjs`：阅读辅助。
- `genres.mjs` / `resmap.mjs` / `resourceStats.mjs`：内嵌资源映射批量命名。
- `build.mjs`：决策稿 → 两张表，并做保留字、文件归属、重复键检查。
- `validate.mjs`：逐 chunk 用 `renameModule` 试跑本表（只加载本表），报告拒绝/冲突/改名数。
- `crossuse.mjs`：跨顶层目录导入分析（放错文件候选）。
