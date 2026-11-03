# 第五阶段第二波命名：name-s1（组 1）

范围：`analysis/segments/naming-round3.json` 第 1 项，共 2,794 个顶层绑定，分布在 202 个 chunk、472 个阅读树文件。主要目录：`components/*`（EffortNudge、FeedbackSurvey、fleet、permissions、pluginUi、PromptInput、tasks、usageCredits、settings）、`constants/*`、`context/*`、`daemon/*`、`entrypoints/*`（含 sdk 的两大 schema 文件）、`hooks/*`、`ink/*`。

## 结果

| 项 | 数量 |
|---|---|
| 顶层绑定已覆盖 | 2,794 / 2,794（100%） |
| `naming/semantic-s1.jsonl` 条数 | 2,794 |
| 说明（`naming/docs-s1.jsonl`） | 247 条（≥300 字节或被导出的声明；其中 452 个声明已有其他组的说明，未重复写） |
| 改名引擎校验（只加载本表，逐个 chunk 调 `renameModule`） | 202 个 chunk：2,794 条，拒绝 0，冲突 0，告警 0，全部改名生效 |

置信度分布：0.85 的 201 条、0.8 的 564 条、0.75 的 695 条、0.7 的 895 条、0.65 的 122 条、0.6 的 317 条。

## 命名口径

- 函数与类 lowerCamelCase / PascalCase；常量、正则、冻结表 UPPER_SNAKE_CASE 并带单位（`AUTH_COOLDOWN_MS`、`MAX_TOOL_OUTPUT_BYTES`）；布尔 is/has/should 开头。
- SDK schema 文件（`entrypoints/sdk/controlSchemas.js`、`coreSchemas.js`）以 registry 的配对关系为准：`CONTROL_REQUEST_REGISTRY` 里 `tryRenderShutdownMessage(SDKXxxMessageSchema(), side, R())` 的 `R` 就是 Xxx 请求的响应 schema，据此命名 50 多个 `XxxResponseSchema`，置信度 0.85。
- 同一文件里一组相关常量成体系命名，例如 `ScrollKeybindingHandler.js` 的滚轮加速常量（`WHEEL_ACCEL_STEP`、`WHEEL_DECAY_HALF_LIFE_MS`…）、`footerLinks.js` 的链接扫描上限、`usageCredits/creditOffers.js` 的金额常量。
- 恒为 `null`/`false`/空、且只被可选链或 `if (x)` 使用的槽位，统一命名为 `xxxSlot`、`xxxModule`、`returnFalse*`、`noop*`，并在 `note` 里写"未启用/占位"。
- 同一模块内重复语义的 selector 用 `_2`、`_3` 后缀（引擎会再补后缀也无妨），并在 note 标明用途。

## 做法与工具（`artifacts/tmp/s1/`）

- `dump4.mjs`：按阅读树路径导出"声明文本 + 每个绑定的前 N 处使用"，生成 `d4/*.txt`（后来另加 `line.mjs`，直接给每条待命名绑定一行：key/名字/kind/引用数/路径/声明片段）。
- `line.mjs`：按 chunk 输出一行一条清单；`ctx.mjs`：查某标识符在某文件里的引用上下文（用来确认 registry 配对、常量用途）。
- `n/*.tsv`：人工命名决定，每行 `N <chunk> <@偏移> <新名> <置信度> <note>`；`build.mjs` 编译成 `naming/semantic-s1.jsonl`，校验文件/键是否存在、名字是否合法、是否保留字、置信度区间。
- `validate.mjs`：把本表单独放进 `artifacts/tmp/s1/naming-only/`，逐个 chunk 调 `renameModule`，报告拒绝/冲突/告警。

## 发现的问题

放错文件或模块名与内容不符的声明（`声明 id → 应归位置，证据`）：

- `chunk-bwbq4xvm.js#k`（现 `freezeHeaderEntry`，导出名 `k`）→ 应归 `utils/betas.js`。证据：`utils/betas.js` 第 53 行 `import { k } from "../components/permissions/AskUserQuestionPermissionRequest/QuestionNavigationBar.js"`，并用它定义 beta 表（`k("claude_code", "claude-code-20250219")` 等），同一 chunk 紧邻的 `defineLocalBeta`/`betaFromName` 也在这个模块里；`QuestionNavigationBar.js` 内无任何调用。这是切块/归属错误（从 betas.js 的 chunk 摘出来放进了 QuestionNavigationBar）。
- `chunk-vrr64ez0.js#yr`（`MAX_ADOPT_SHELLS`）与同组的 `ADOPT_RECORD_SCHEMA_BASE`、`ADOPT_RECORD_MAX_AGE_MS`、`adoptRecordSchema` 实际服务于 `daemon/jobs/adoptRecord.js`（后者从 `../attach/attachJob.js` 导入这四个），现在却声明并导出在 `daemon/attach/attachJob.js` 末尾。证据：`daemon/jobs/adoptRecord.js` 的 import 语句和 `reapAdoptRecord` 里的用法；attachJob 自身不引用 `yr`。
- `chunk-18hwfzwa.js#730567–730811` 一段（`monitorMcpKillModule`、`mcpTaskDetailDialogModule`、各 `*DetailGates`、`backgroundListModules`）实为 `components/tasks/BackgroundTasksDialog.js` 顶部为兼容不同构建而写的一串可选 require/`null` 槽位（`HXt?.killMonitorMcp`、`Uw?.useBackgroundListV3`），不属于本文件的功能逻辑，属拼接残留；命名按实际用途写在 note 中。

名字或注释配错：

- `constants/claudeAiOrigin.js` 的 `HBe` 被注释成“staging/prod”，实际是 artifact 主机覆盖函数（被 `services/artifacts/classifierContext.js` 导入）；本组命名为 `getArtifactHostOverride`。
- `constants/outputLimits.js` 里 `Yoo`/`Sdt`/`sCi`/`qhr`/`iCi`/`SIt` 等除 `Vhr`（`getMaxOutputLength()` 的下限）、`Tle`（MCP 结果上限，`persistenceThresholdCeiling`）、`cPn`（中间截断默认长度）、`Z9t`（合并提示上限）、`JT`（描述截断）外，都没有其他引用，只在同文件 export；命名按数值与邻近常量推断，置信度 0.6–0.65，`note` 已注明。
- `components/permissions/wrapWidth.js` 的 `yce = 8` 被多个文件当作“最多显示几条/几个应用”的阈值使用（`ComputerUseApproval`、`ClaudeMdExternalIncludesDialog`、`SendToProjectDialog`），命名为 `MAX_VISIBLE_ITEMS`。

## 与其他命名表的重合（交给 lead 取舍）

`naming/semantic-s2.jsonl` 里有 2,389 条键与本组相同、名字不同。核对清单后发现：`semantic-s2.jsonl` 的 2,794 条全部落在**本组（第 1 项）**的键上，只有 4 条键不在任何分组里（`chunk-6d9n2xk3.js@14520`、`chunk-s06523pk.js@1100`、`chunk-nwq3j1yh.js@4818`、`chunk-bwbq4xvm.js@238727`），而 `semantic-s2.jsonl` 对它自己那组（第 2 项，ink/*）的键覆盖为 0。看起来 s2 成员写错了分段（拿第 1 项当成了自己那组），建议 lead 让 s2 核对清单后重做；本组两份文件都只按第 1 项写。若最终两份都进合并表，同名键以置信度高者胜（两边都是 source=semantic）。

`naming/docs-s2.jsonl` 的 39 条中有 38 条 id 根本不在任何分组的声明里（`声明 id` 由 chunk+压缩名拼出，与清单对不上），也一并提示。

## 已知限制

- 部分 `null` 占位槽位（`BackgroundTasksDialog.js` 顶部、`installNotices.js` 的 `*_t` 槽位、`SkillProposalMessage.js` 的 `disabledToolUi_*`）只能按“未启用”归类，真正的模块名在官方构建里应当存在但被裁掉，无法确认。
- `constants/outputLimits.js` 的多数常量无外部引用，名字根据邻近注释与数值推断，置信度较低。
- `components/Settings/Config.js` 里 `_o`/`wn` 等 selector 只被同文件内引用一次，按上下文命名。
