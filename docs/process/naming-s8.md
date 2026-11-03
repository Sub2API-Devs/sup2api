# 第五阶段第二波命名：name-s8（组 8）

范围：`analysis/segments/naming-round3.json` 第 8 项，共 2,410 个声明、3,076 个顶层绑定，分布在 351 个阅读树文件、175 个 chunk、110 个目录。集中在 `utils/plugins`（约 1,100 个绑定）、`utils/permissions`（含 `serverClassifier` 子目录）、`utils/settings`（含 `mdm`、`policyHelper`）、`utils/sandbox`，以及 `utils/path*`、`utils/peer*`、`utils/session*`、`utils/redaction`、`utils/secureStorage`、`utils/processUserInput` 等。

## 结果

| 项 | 数量 |
|---|---|
| 声明覆盖 | 2,410 / 2,410 |
| 顶层绑定命名 | 3,076 / 3,076 |
| `naming/semantic-s8.jsonl` | 3,076 条（unique = 3,076，无重复键） |
| 说明（`naming/docs-s8.jsonl`） | 1,078 条；导出（1,082 个声明）与 ≥300 字节（87 个声明）全部覆盖，其中 68 个声明已在其他说明表里有说明，其余全部由本表覆盖，合并后剩余 0 |
| 改名引擎校验 | 175 个 chunk 逐个调用 `renameModule`（只加载本表）：3,076 条，实际改名 3,076，拒绝 0，冲突 0。脚本 `artifacts/tmp/s8/check.mjs` |

置信度分布：0.9 的 1 条，0.85 的 86 条，0.8 的 580 条，0.75 的 966 条，0.7 的 1,182 条，0.65 的 13 条，0.6 的 248 条。

做法：

- `artifacts/tmp/s8/dump2.mjs` 生成按阅读树文件分组的源码稿（`dump/NNN.txt`）、`items.json`、`files.txt`；`compact.mjs` 再生成单行紧凑视图便于成批阅读；`one.mjs` / `many.mjs` 按文件或按缺失数查看剩余项。
- 命名稿在 `artifacts/tmp/s8/plan/NN.txt`，格式是 `chunk-x.js@偏移 名字 置信度 说明`；`chunkhdr.mjs` 按偏移补 chunk 头，`build.mjs` 编译成命名表并做保留字/重名/键存在性校验。
- `docs.mjs` 从命名稿的说明文字生成 `naming/docs-s8.jsonl`（按声明聚合兄弟绑定，跳过已有其他说明表覆盖的声明）。

## 命名风格

- 函数 lowerCamelCase、类 PascalCase、模块级常量 UPPER_SNAKE_CASE 并带单位（`_MS`、`_BYTES`、`_TTL_MS`）；布尔 `is/has/should/can` 开头。
- 同一文件里成组的常量按体系命名，例如 `gitCommandRules.js` 的 `GIT_*_RULES` + `*_REASON`、`sensitivePaths.js` 的 `SENSITIVE_*`、`serverClassifier/schemas.js` 的 `MAX_*`、`feature` 开关统一 `is<FlagName>On`。
- 构建时被裁掉的 stub（恒 false/undefined 的占位）仍按含义命名，并加 `never*` / `no*` 前缀，说明里注明“占位/构建时裁掉”。
- 兄弟绑定按“首个为主名、其余带后缀”处理，例如 `UNSAFE_ENV_PREFIXES_2…_8`、`MODEL_ENV_KEYS_2…_5`。这类共 30 余条，只在 0.6–0.7 置信度，合并时可以让位。

## 还没命名的

- 顶层：没有，3,076 个绑定全部命名。
- 说明：没有遗漏。
- 已知把握较低（0.6）的 248 条主要是：数值常量的单位/用途只能从调用点推断（例如 `MAX_ACL_ENTRIES_BYTES`、`MAX_ENDPOINT_PATH_LENGTH`）；构建时裁掉的占位（`neverAllowsLocalWsl`、`noConfigDirWriteDenialForPlan`）；只在一次性拼装里出现的短小工具（`metaJsonLine`、`callSafely`）；以及 `settingsSourceTrust.js` 里从 lodash 内联进来的合并函数（`safeSet_2`、`mergeDeep_2` 等，原本就是 lodash 名）。

## 发现的放错文件/名不副实的声明

格式：`声明 id → 应归路径，证据`。

- `chunk-nt75hmzb.js` 的 daemon 路径族（`K8o`、`hsr`、`Q6`、`jwn`、`NTt`、`$Tt`、`FTt`、`UTt`、`X3r`、`Xot`、`nwe`、`Y8o`、`Wwn`、`FA`、`kli`、`Tli`、`owe`、`JC`、`xN`、`Z6` 等）→ 现在在 `utils/sandbox/userNamespace.js`，实际是 daemon 的 socket/密钥/roster 路径。证据：`services/daemon/paths.js` 第一行导入 `{ q, K8o, G, c, hsr, S, ENOTOWNED, UTt, X3r, q8o, Xot }` 全部来自 userNamespace，且该文件本身只有 uid_map 解析属于 userNamespace。
- `chunk-q8cqcff6.js` 的 MDM 加载器（`MdmSettingsLoader` 相关：`Ci`、`se`、`bi`、`t1e`、`One`、`Uyr`、`cIn`、`ave`、`uIn`）→ 现在在 `utils/settings/managedPluginTiers.js`，内容与“托管插件层级”无关。证据：文件名/模块注释写“托管插件层级”，实际导出的是 MDM 设置加载、`mdm`/`wslInherits` 与读取结果；被 `settings/mdm/settings.js` 使用。
- `chunk-q8cqcff6.js` 的宿主环境变量簿记（`sn`、`ue`、`Oe`、`Pe`、`on`、`an`、`ln`、`Eus`、`dn`、`RXt`、`Ui`、`un`、`$e`、`MRi`、`withHostEnvRestored`、`AQ`、`DRi`、`pn`）→ 现在在 `utils/settings/managedSettingsFiles.js`，是“宿主写过的环境变量快照/恢复”，与托管设置文件读取只在 `AQ` 一处耦合。
- `chunk-kswt4qha.js` 的自动压缩提议与拒绝回退 effort（`me`、`j`、`readAutoCompactOffer`、`markAutoCompactOfferEligibleLogged`、`lhi`、`dhi`、`updateAutoCompactOffer`、`O`、`q`、`W`、`oQr`、`U`、`VZo`、`re`、`scr`、`yhi`、`icr`）→ 现在在 `utils/permissions/permissionSetup.js`。证据：消费方是 `services/compact/autocompactOffer.js` 与 `hooks/notifs/specs/sessionNotices.js`，且内容围绕 `autoCompactOffer`/effort 回退，与权限上下文初始化无关。
- `chunk-dcmhvw5a.js` 的 UI 字形常量（`PAUSE_GLYPH`、`AOt`、`ips`、`p1e`、`YO`、`DIAMOND_GLYPH`、`Wx`、`aps`、`Gg`、`hf`、`dps`、`cps`、`T8`、`ups`、`k_r`）与 zod 延迟可选（`ZodDeferredOptional`、`qr`）→ 现在在 `utils/permissions/autoModeRulesPrompt.js`。证据：这些导出被 `commands/ultraplan.js`、`components/messages/SystemNoticeMessage.js`、`PromptInputFooterSuggestions.js`、`BackgroundTask.js`、`utils/model/modelDisplay.js` 等 UI 代码引用，而该模块的职责是 auto 模式分类器提示词；字形常量应归 `components/` 的符号模块。
- `chunk-ddkccdnb.js#cpr` → 应归 `utils/plugins/`（市场名相似检查）。证据：函数体是 `!isOfficialMarketplaceRef(o) && !hasSimilarMarketplaceName(o, r)`，属于插件市场名防冒充，现在落在 `utils/permissions/permissions.js`。
- `chunk-e6aww6q8.js` 的 `Lqe`、`B4t`（浏览器工具输入的只读判定）→ 应归 `utils/permissions/browserComputerUseTools.js`。证据：被 `BROWSER_TOOL_INPUT_CHECKS = new Map([["read_console_messages", B4t], ["read_network_requests", B4t], ["tabs_context_mcp", Lqe]])` 作为回调使用，函数定义却在 `autoModeUnavailable.js`。
- `chunk-e6aww6q8.js#appendEntryToFile` → 名不副实/放错。证据：函数体只是 `getFsImplementation().mkdirSync(getPluginsDirectory())`，由 `installedPluginsManager.js` 在写 `installed_plugins.json` 前调用，与 `sessionStorage` 无关（阅读树 header 已标注 fingerprint 名“appendEntryToFile”）。
- `chunk-e6aww6q8.js` 的 team-onboarding 转录扫描常量（`MAX_METADATA_SCAN_BYTES`、`J9o`、`Den`、`Z9o`、`n8o`、`Len`…`u8o`）→ 应归 `commands/team-onboarding/gather.js`。证据：唯一使用方是 `gather.js` 的会话描述解析（`firstMessage`、`sessionDescriptors.slice(0, Den)`）。
- `chunk-dcmhvw5a.js` 的 lodash 合并实现（`safeSet`、`baseIsEqualWith`、`safeGet`、`cloneDeepWith`、`mergeDeep`、`baseMerge`、`isIterateeCall`、`createAssigner` 及其别名）→ 应归 vendor（lodash 片段）。证据：函数体是 lodash `mergeWith` 系列的内联拷贝，注释也写“深度合并（lodash 风格）”。
- `chunk-dcmhvw5a.js#ZodDeferredOptional` / `#qr`（zod 延迟可选类型）→ 应归 `vendor/zod`。证据：`Fr("ZodDeferredOptional", …)` 直接操作 `_zod` 内部结构。

注：以上仅记录证据，未做任何移动（本轮只写自己的命名/说明/过程文件）。

## 与其他命名表的重合（交给 lead 取舍）

- `naming/semantic-r8.jsonl`：1 处，`chunk-e6aww6q8.js@2480508`：r8 名为 `KIB`（0.6，观测值），本表为 `QUERY_PROFILE_PARTS`（0.7，依据是数组内容 `["setup","prompt_producers",…]`），建议取本表。
- `naming/semantic-state.jsonl`：3 处 semver 包装（`chunk-aepeg2w5.js@220890/220926/220998`），对方 `gt/gte/lte`（0.85），本表 `semverGte/semverGt/semverLt`（0.85）；两者意思相同，按引擎规则同置信度时先加载者（state 表）生效。若要采用本表，需要在合并时提高本表置信度或删掉另一条。
- 说明表：与本组相关的 68 个声明已有说明，均未重复写。

## 工具（都在 `artifacts/tmp/s8/`）

- `dump2.mjs` / `compact.mjs` / `one.mjs` / `many.mjs`：阅读辅助。
- `chunkhdr.mjs`：按偏移给命名稿补 `# chunk-x.js` 头。
- `build.mjs`：命名稿 → `naming/semantic-s8.jsonl`，并做保留字、键存在性、同文件重名检查。
- `docs.mjs`：命名稿说明 → `naming/docs-s8.jsonl`。
- `check.mjs`：逐 chunk 用 `renameModule` 试跑本表（只加载本表），报告拒绝/冲突/改名数。
