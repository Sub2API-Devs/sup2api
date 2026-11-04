# 第五阶段第二波（2a）顶层命名：name-s9（组 9）

范围：`analysis/segments/naming-round3.json` 第 9 项，共 **1,604 个顶层绑定**（1,263 个声明），分布在 215 个阅读树文件、127 个 chunk。整段是 `src/utils/` 的后半（`Shell.js` 之后的字母序）与 `src/voice/`：shell 执行（`Shell`、`ShellCommand`、`utils/shell/*`）、shutdown/sideQuery/sleep、skill、spellcheck、stage 文件、startup、status/statusNoticeDefinitions、storage（v5 存储键与空间）、stringUtils、subagent*、subprocessEnv、suggestions、swarm、systemReminder、task/*、teammate/teammateMailbox、telemetry/*（OTel、插件遥测、BigQuery、Perfetto、udsmessaging 之外）、teleport/*（gitBundle、dirSync、wipStash、api、session、securityTier 等）、transcript/*、toolCgroup/toolPools/toolResultStorage、udsMessaging/*、uploadsDir、userTurnTags、workflowGates、worktree/worktreeIsolation、wslMounts/wslPaths、windows*、wireToolInput*、words、voice。

## 结果

| 项 | 数量 |
|---|---|
| 顶层绑定命名 | 1,604 / 1,604（清单全覆盖） |
| `naming/semantic-s9.jsonl` 条数 | 1,604（与清单一一对应，键不重复） |
| 说明（`naming/docs-s9.jsonl`） | 431 条；带说明的声明覆盖全部 ≥300 字节的声明（清单内 38 个）以及清单内被导出的声明（另有 5 个导出声明在别的 docs 表里已有说明，未重复写） |
| 改名引擎试跑 | 127 个 chunk 逐个 `renameModule`（只加载本表）：请求 1,604，改名 1,604，**拒绝 0，冲突 0，告警 0**（`artifacts/tmp/s9/rename-check.json`） |
| 与门面/vendor 名冲突 | 0（`naming/final/top.json` 里本组键没有 facade/vendor 来源的条目） |
| 与其他 semantic 表的键重合 | 0（写表前按 `file|key` 查过所有 `naming/semantic-*.jsonl`） |

置信度：0.9 共 1 条，0.85 共 281，0.8 共 624，0.75 共 338，0.7 共 240，0.65 共 31，0.6 共 89。低档（0.6–0.65）主要是外部构建里的空实现/恒 false/恒 null 桩（`Apn`、`oN`、`l9o`、`yKe`、`G3e`、`vgr` 等）、只剩数值的阈值常量（`seedPaths.js` 的一串 `MAX_*`）、以及只能按调用点推断的匹配函数。

## 命名风格

- 函数/变量 lowerCamelCase，类 PascalCase，模块级常量 UPPER_SNAKE_CASE 带单位（`MAX_FILE_READ_CHUNK_BYTES`、`GIT_REF_READ_TIMEOUT_MS`、`TICK_INTERVAL_MS`）。
- 布尔/谓词 is/has/should/can 开头（`isWorktreeConfigPath`、`hasRecoveredBearer`、`shouldEchoWireToolInputsForRequest`）；getter 用 `getXxx` 或直接 `xxx` 的既成习惯（`shellPaths`、`taskNotificationQueue`）。
- 按宿主/会话缓存的单例按 `xxxByHost` / `xxxBySessionRoot` 命名，取值函数用不带后缀的同名（与阅读树已有习惯一致，如 `bR` → `shellEnvSnapshot`）。
- 同一文件内的常量成体系：`statusNoticeDefinitions.js` 的 30 多个提示对象统一 `<TOPIC>_NOTICE`；`storageKeys.js` 的 `*_RE` / `*_ERROR` 成对；`swarm/teammateIds.js` 的 `MAX_*` 一组；`truncateGraphemes.js` 的媒体/字节上限一组 `MAX_*_BYTES` / `MAX_*_CHARS`。

## 做法与产物（均在 `artifacts/tmp/s9/`）

1. `extract.mjs`：按阅读树路径分组，把每个待命名声明连同「文件头说明、同文件里别的声明首行、同文件内用法、跨文件调用方（`reconstructed/symbols.jsonl` 名）」写成 12 份视图 `views/NNN.txt`；`compact.mjs` 生成更紧凑的 `views2/NNN.txt`（签名 + 截断函数体 + 2 条用法/调用方），覆盖第 4–214 个文件。
2. `needdoc.mjs`：导出 ≥300 字节或导出的声明源码，得 `needdoc.txt`（404 条）；`sizes.txt` 是每个文件的逐条大小。
3. `n/000.txt`–`n/004.txt`：人工命名决定（`@ 路径` 分段，`压缩名 新名 置信度 | 备注`，重名时写 `@偏移`）；`d/000.txt`、`d/001.txt`：说明（`压缩名 ! 说明`，跨文件重名时写 `chunk#名` 或声明 id）。
4. `build.mjs`：按 `path+冻结名`（或 `path+@偏移`）解析到清单条目，生成两张表；带 `DOC ` 前缀的备注同时写进说明。`unnamed` 恒为 0。
5. `validate.mjs`：用 `tools/rename/lib/rename.mjs` 的 `renameModule` 逐 chunk 试跑，只加载本表。

## 没命名的

- 顶层：0。清单里 1,604 条全部写入。
- 说明：清单内 ≥300 字节的声明全部覆盖；清单内被导出但小于 300 字节的声明也全部有说明（本表 431 条），只有 5 个导出声明依赖别的 docs 表里已有的说明（`spellcheck.js#t8e`、`tasks.js#Iii`、`pluginTelemetry.js#yf`、`toolPool.js#Ckt`、`truncateGraphemes.js#dA`），按指南「已有说明的不重复写」没写。

## 保持原名的情况

清单里没有「原名已经可读、写入同名条目」的绑定：清单是严格口径（名字与 original 相同且 ≤3 字符才算压缩名），而这一组里已经可读的常量（`DISK_FULL_ADVICE`、`USER_TURN_TAG_RULES`、`SPELLCHECK_PROGRAMS`、`WINDOWS_PROFILE_ENV_VARS`、`SEED_INDEX_NAME_PATTERN`、`AGENT_WORKTREE_SLUG_PATTERNS` 等）本就不在清单里，我没有覆盖它们；只给它们同一 `var` 里的兄弟压缩绑定（`Pco`、`tan`、`oPi`、`Wb`、`Ki`、`Xo` 等）命名，命名时避开了这些已有名字。

## 与其他命名表的重合（交给 lead 取舍）

- 键重合 0。
- 说明重合：写说明前按 `analysis/segments` 的声明 id 与 `naming/docs-*.jsonl` 比对过，本组仅跳过 5 个已有说明的导出声明（见上），说明内容无分歧。

## 发现的问题

### 放错文件的声明（`声明 id → 应归路径，证据`）

- `chunk-e6aww6q8.js#obn`…（`utils/Shell.js` 里的 `safeSessionIdForSnapshot`、`isWorktreeConfigPath`）使用 `WORKTREES_SEGMENT` / `WORKTREE_CONFIG_SUFFIXES`。这两个常量定义在 `utils/Shell.js`，但语义属于 git worktree（`utils/worktree.js` 的邻居）；`jTr` 的唯一调用方是 `shell/argvLimits.js` 的 `checkArgvLimits`，它判断「这个路径是 worktree 的配置文件」。建议把这两个常量与 `jTr` 一起移到 `utils/worktree.js` 或 `utils/shell/argvLimits.js`。（`obn` 是占位写法，准确 id 见 `isWorktreeConfigPath` 对应的 `chunk-e6aww6q8.js#jTr`。）
- `chunk-e6aww6q8.js`（`utils/shell/bashProvider.js` 里 `Qvr`/`Zvr`/`Wwn` 一带）是 **sandbox-runtime 的配置桩**（`{enabled, enforce, everywhere, python_leg}`、`isPythonLegEnabled`）。同一段还有 `Wwn`（小写、非 `[a-z0-9_-]` 转下划线、截 63）像 Kubernetes/sandbox 名字清洗。这一整段与 bash 提供者无关，应归 `utils/sandbox/`（`sandbox-adapter`/`sandbox-runtime` 一侧）。阅读树文件头也写了「本段混入了 sandbox-runtime 的 Windows 常量与按 BOM 判编码的函数」（指的正是 powershellProvider.js）。
- `chunk-e6aww6q8.js`（`utils/shell/powershellProvider.js` 的 `H3n`/`THt`/`EHt`）被 `runSubagentStatusLine`、`execCommandHook`、`exec` 使用，属 PowerShell 提供者；但同一文件里 `POWERSHELL_UTF8_PRELUDE`/`SCRIPT_BLOCK_KEYWORD_RE`/`PS_DEFAULT_CHILD_ENV` 是 sandbox-runtime 的脚本包装常量，混放。
- `chunk-aepeg2w5.js#Zj`/`#Bx`/`#mgr`（`utils/teleport/api.js` 的 can_use_tool 控制请求 schema、登录提示、会话过期文案）本身合理地在 api.ts；但同一 chunk 的 `q6e`/`ugr`/`fgr`/`cro`（`ClientEventUploadError` 等）与 `cgr`（`/api/directory/plugins`）、`Dx`/`Nki`/`Dj`（上传停滞超时与分块）落在 `utils/telemetry/memorySummary.js`，与「内存归因统计」无关，是一整段 CCR 客户端事件上传器（`ClientEventUploader`）的邻居，建议单独成 `utils/telemetry/clientEventUploader.js`。阅读树文件头也写了「客户端事件上传队列（紧急、重试、关闭交接）」这一句，说明文件本身是合并体。
- `chunk-p52gp8zk.js#Me`（`gatewayIdentityAttributes.js` 的 `OTEL_METRICS_INCLUDE_DEFAULTS` 与 `VCS_*` 属性名）实际被 `instrumentation.js`/`repositoryAttributes.js`/`gatewayIdentityAttributes.js` 共用；`VCS_*` 与 `OTEL_*` 默认值应归 `utils/telemetry/repositoryAttributes.js` 或 `instrumentation.js`，放 `gatewayIdentityAttributes` 里只是切分结果。
- `chunk-t0gq9gyw.js#nOi/#RMt`（`truncateGraphemes.js` 的媒体上限 `MAX_MEDIA_BASE64_BYTES`/`PDF_TILE_*`/`MAX_IMAGE_SIDE_PX` 与 `MAX_INLINE_GRAPHEME_*`）与 `vY`/`aQt`/`put`/`OMn`/`H8`/`mut` 一起是**媒体与请求字节/页数上限**，调用方是 `services/api/claude.js`、`tools/FileReadTool`、`utils/pdf.js`、`utils/mcpOutputStorage.js`、`services/api/requestTooLarge.js`。放在「按字素截断」文件里是错位，应归 `utils/mediaLimits.js`（或 `services/api/mediaLimits.js`）。同一个文件里还有 `isAllPrintable`/`sanitizeDisplayChars` 一族也属显示文本，混放。
- `chunk-k50y1rw8.js`（`utils/transcriptIds.js`）里的 `c`/`d`/`C$s`/`CMr`/`kAo` 是「目录同步记录键 / 转录文件路径」，`DIR_SYNC_RECORD_SUFFIX` 与 `storageKeys.js` 的 `eo`/`DIR_SYNC_RECORD_SUFFIX` 重复定义；`utils/transcriptIds.js` 只保留 `resolveTranscriptLocation`，目录同步那半应归 `teleport/dirSync.js` 或 `storage/storageKeys.js`。
- `chunk-bwbq4xvm.js#rs`（`utils/words.js` 的 `NOUNS`）与 `ADJECTIVES`/`VERBS` 一起是随机 slug 词表，文件对；但 `utils/words.js` 顶部还挂了 `repairMalformedStringsDeep`/`taggedId` 的一小段（`chunk-m41h77x8.js`），是切分结果，属 `stringUtils.js`。
- `chunk-f640a6hn.js#Pf`（`isUntrustedObject`）在 `utils/untrustedValues.js`，合理；但 `utils/shutdown/pendingWrites.js` 的 `n0e` 与它逻辑**完全相同**（沿原型链 + `Pf`），建议 `n0e` 直接复用 `Pf` 或在 `untrustedValues.js` 提供 `isUntrustedObjectDeep`。
- `chunk-3dq9c61y.js#z`（`toolchainDetection.js` 的 `HOST_PROFILE_DEADLINE_MS` 与 `*.plist`/CUDA 路径）中，`detectTerminal`（`G`/`y`/`W`/`Z`/`K`/`Q` 一带）与「终端探测」无关，属 `utils/terminalProbe.js`；`utils/toolchainDetection.js` 文件内注释已写「误归 deepLink」。
- `chunk-ag5x7vhf.js#_I` 一带（`statusNoticeDefinitions.js`）是一串 21 个「状态提示对象」，被 `zI`（`ALL_STATUS_NOTICES`）引用。它们是同一数组里的元素，散落在 `_I`/`II`/…/`US` 多个声明偏移上，阅读时不容易看出是一张表；建议在文件里给这张表加上「这是一组 notice」的注释（不改结构）。

### 名字或注释配错

- `utils/Shell.js` 的 `Opn` 名为 `figSpecRegistryByHost`；但调用方 `components/permissions/*PermissionRequest` 用它取的是 `getCompoundCommandPrefixesStatic_2(Opn.of(host), command)`，即「按宿主的 Fig spec 注册表」，名字对。
- `utils/shell/shellEnvironment.js` 的 `WINDOWS_PROFILE_ENV_VARS` 里混进了代理 CA/token 变量（`Vot(1,1,"ca","token",!0)`），名字只说 Windows 档案变量；这些变量实际用于「可注入环境变量白名单」，建议改名 `INJECTABLE_WORKSPACE_ENV_VARS` 或拆两个集合。
- `utils/telemetry/memorySummary.js` 文件头只提「客户端事件上传队列 + 内存归因」，但整个文件 50 条声明里过半是 CCR 客户端事件上传（见上）；名字 `memorySummary.js` 名不符。
- `utils/teleport/gitBundleVerify.js` 的 `Vo`（`BUNDLE_HEADER_SIGNATURES`）与 `utils/teleport/gitBundle.js` 里的 `xr` 内容对不上：`Vo` 在验证模块、`BUNDLE_OUTPUT_NAME` 在同文件的函数声明里被误写成 `async function BUNDLE_OUTPUT_NAME(e, n = tmpdir(), r = "out.bundle")`（应是常量），说明阅读树里这处声明被贴到了函数头。
- `utils/teleport/wipStash.js` 的 `Xa`（`credentialConfigPathSpellings`）与 `bn`/`Yi`/`pr`/`Oi`/`En` 一起是「疑似凭据路径」判定，与「种子索引」无关；但它们在同一 chunk 且被 `checkCredentialLikePaths` 共用，属文件内错位而非跨文件。
- `utils/udsMessaging.js` 的 `X`（`SOCKET_DIR_HINTS`）与 `ke`/`ve`/`fn` 三条拒绝文案是三段模板，阅读树把它们并列在同一个 `var` 里却只把 `X` 单独暴露，容易误以为 `X` 与其它无关系。
- `utils/truncateGraphemes.js` 文件头只写「按字素截断每行；图片尺寸与大小上限等」，实际混了 `MAX_OUTPUT_TOKENS_CAP`、`MAX_REQUEST_BYTES`、`MAX_PDF_PAGES` 等请求级上限（见上）。
- `utils/teleport/cloudLaunch.js` 里 `gZo`/`hZo`/`_Zo`/`SZo` 是「--tools 不支持」的四种环境文案，`rnn` 是空列表文案；阅读树把 `CLOUD_LAUNCH_TOOL_ERRORS`（空列表文案）单独放在 `gZo` 前，其余三个在下面，顺序被打乱。
- `utils/teleport/seedPaths.js` 的 `s`/`i`/`c`/`l`/`r`/`e`/`E`/`L`/`IWs` 全是纯数字常量，来自一条链式推导（`r = _ + c + l`、`min = ...`），互相依赖但只写在同一个 `var` 里；这类绑定不适合独立命名，我在表里给了 `SEED_*_SLACK` / `MAX_*`，置信度只有 0.5–0.6，建议 lead 人工核对。
- `utils/Shell.js` 的 `bTn`（`shellExportsForSpawn`）返回值与参数名的关系只有读 `exec` 的 3 处调用点才能确认（`shellType === "bash" && !shouldUseSandbox && !scrubCredentialEnv`），置信度 0.6。

## 已知限制

- 本组多数文件是 2.1.316 新增（旧版 2.1.88 无对应），没有旧源码可对照，名字全部按行为与调用点推断；推断依据以 `note` 字段记录（`s9 <文件>` 或 `s9 <文件> · 理由`）。
- 外部构建里大量 `subtype === "tengu_*"` GrowthBook 开关返回 `!1`/`!0`/`null`；这些桩函数的命名以「开关名 + Stub」标注，实际语义要到内部构建里才能确认。
- `utils/shell/powershellProvider.js` 里 `POWERSHELL_UTF8_PRELUDE`、`SCRIPT_BLOCK_KEYWORD_RE` 等混入的 sandbox-runtime 段没有命名（清单外），只作为背景记录。
