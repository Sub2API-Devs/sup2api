# dom-state 过程记录（state 领域）

负责：`analysis/segments/domains.json` 的 `state` 键，275 个重组模块、4,364 个顶层声明（快照取自 05:49 的 domains.json）。
交付：`naming/semantic-state.jsonl`、`naming/docs-state.jsonl`、`naming/modules-state.json`、`docs/handbook/state.md`、本文件。

## 1. 做法

1. 读 AGENTS.md、PLAN、domain-guide、lead.md；按路径把 275 个模块分成 7 组（`artifacts/tmp/state/groups.mjs` → `groups.json`）：settings 48、session 38、memory 29、telemetry 39、auth 30、infragit 27、infra 64。
2. 写了一套批量工具（都在 `artifacts/tmp/state/`，头注释写明输入输出）：
   - `stats.mjs`：每个模块的声明数与命名来源统计；
   - `priority.mjs` → `priority.tsv`：本领域声明按被引用次数排序（列：入度、id、当前名、来源、置信度、模块、方法、字节）；
   - `todo.mjs`：列出某组尚未命名的高入度声明；
   - `skim.mjs`：模块的声明概览（出处、首行、字符串）；
   - `showmany.mjs`：一次进程里批量打印多个声明的阅读树源码（接受压缩名或当前名）；
   - `addnames.mjs`：把草稿（`{id|file+at, local?, nth?, name, conf, note}` 或 `{id, doc}`）解析成规范的 `{file, key:"@偏移"}`，用 `tools/rename/lib/rename.mjs · bindingsOf` 校验绑定存在、未冻结、名字合法；id 可写压缩名、旧版/自动名、门面名或阅读树快照里的名字；
   - `merge.mjs`：合并各组草稿 → 三个交付文件，同时报告组间冲突和与门面原名的重叠（`merge-report.json`）；
   - `finalname.mjs`：查声明最终显示名（门面 > semantic > reference/auto）。
3. settings 组和全局高引用的核心声明由主线程完成；其余 6 组由 fork 助手并行完成（session、memory、telemetry、auth、infragit、infra），各自交付 `draft-<组>.jsonl`、`modules-<组>.json`、`notes-<组>.md`，主线程校验后合并。
4. 手册按 domain-guide 要求的结构写，结论都在 316 代码里核过；与 2.1.88 的对比用 `references/claude-code-analysis/src` 和旧版设置 schema 键差集（`oldkeys.txt`/`newkeys.txt`）。
5. 用改名引擎试跑：`node tools/rename/apply.mjs original <只含 semantic-state.jsonl 的目录> <临时输出> --check`：3,122 个绑定改名，0 rejected、0 警告、8 个作用域冲突加后缀，α 校验 0 差异（约 20 秒）。

## 2. 数据

| 项 | 数量 |
|---|---|
| 语义命名（semantic-state.jsonl） | 1,643 条（与门面原名重复/冲突的 644 条已剔除，门面优先） |
| 声明说明（docs-state.jsonl） | 939 条 |
| 模块说明（modules-state.json） | 275 / 275 |
| 本领域顶层声明 | 4,364；门面或本领域 semantic 覆盖 2,597；仍为压缩名/自动名约 525（入度 ≥1 的约 500） |
| docs 覆盖 | 入度最高的前 100 个声明中 79 个；入度 ≥2 的 2,275 个中 613 个（未覆盖的多为门面已给名的小工具、第三方或已移出本领域的声明） |
| 各组草稿 | session 383/133、memory 301/113、telemetry 318/136、auth 335/174、infragit 336/146、infra 267/135、settings 约 340/107（命名/docs，合并去重前） |

## 3. 坑与处理

- **naming/final 在工作中被 lead 重新生成**（06:58，加入门面名、调整自动名），部分草稿里按旧当前名写的 id 失效（95 条）。`addnames.mjs` 加了三级回退：压缩名 → `analysis/names/*.jsonl` 里的名字 → 阅读树快照（`build/readable/src` 的 `//@` 出处行）里的名字，全部解析成功。
- **门面原名**（lead 06:05 通知）优先级高于 semantic：合并时与门面同键的 644 条全部剔除（128 条与门面同名，516 条不同；不同的以门面为准，列表在 `merge-report.json` 的 `facadeDiff`）。手册里的函数名也改用门面名。
- **Edit 工具写 `\b` 会变成退格符**、heredoc 里的反斜杠会被吃掉：脚本里的正则用 Write 写或用 `String.fromCharCode`；已核对文件中没有 0x08 字符。
- **子代理并发上限**：起初其他领域成员占满 20 个子代理名额，只能先自己做 settings；名额空出后再派 fork。
- **切分在工作中被 lead 更新**（06:59）：`priority.tsv` 后来的查询里出现 `_new/…`、`react/…` 等新路径，说明部分声明已被移出 state。模块说明仍以 domains.json（275 个）为准；若 lead 重新生成 domains.json，需要补新模块、删已移走模块的说明（`merge.mjs` 会报 missing/extra）。

## 4. 主要发现（详见手册）

- 托管设置从"第一个非空者胜"变为多层组合（policyHelper、remote、MDM、file+drop-in、父进程切片、宿主覆盖、HKCU），支持 merge 与宽容解析。
- 设置 schema 顶层键 75 → 约 187。
- 几乎所有持久化都有 storage v5 后端与 diskless 两条路径。
- 转录记录类型 18 → 47；SessionMemory、MagicDocs 已删；团队记忆改为 `/v1/memory_stores` 多 store 同步。
- API key 不再读 macOS 钥匙串；新增 WIF、宿主启动器令牌、4 种新提供方、proxyAuthHelper、SSRF 守卫。
- Datadog token 更换、白名单 41 → 243；1P 端点改为 `/api/event_logging/v2/batch`。
- 旧版名语义反转：`chunk-aepeg2w5.js#Sh`（旧名 isAutoMemoryEnabled）实为"环境默认关闭自动记忆"。

## 5. 给 lead 的建议（切分/匹配修正）

格式：`声明 id → 应归属/应叫什么，证据`。完整清单在各组 notes（`artifacts/tmp/state/notes-*.md` 的"给 lead 的建议"一节），这里列重要的。

### 5.1 错配的旧版名（高引用）

- `chunk-cgr0tezp.js#t` → 叫 `logForDebugging`，归 `utils/debug.ts`；旧版配成 `teamMemorySync · fetchTeamMemory`。证据：函数体 `H().log(msg,{level:"debug"})`，全局 3,868 处调用，消息都是调试日志。（门面已给出同名，已生效。）
- `chunk-e6aww6q8.js#sn`（现名 logForDebugging）→ 构造 `type:"attachment"` 消息，应改名并归附件/消息模块。
- `chunk-nn4p932b.js#Z`（及同 chunk `#v`、`#k`）→ 第三方 `react/jsx-runtime`（`Symbol.for("react.transitional.element")`），被配成 `utils/plans.ts · getPlansDirectory`。（lead 新切分似已归到 react。）
- `chunk-aepeg2w5.js#Sh`（isAutoMemoryEnabled）→ 语义相反，实为"环境默认关闭"。
- `chunk-dcmhvw5a.js#hasAutoModeOptIn` → 实为读取单个设置来源（loadSettingsForSourceFromDisk）；`chunk-5hsd6qen.js#Po`（旧名 getSettingSourceDisplayNameCapitalized）→ 实为 getEnabledSettingSources（门面已确认）；`chunk-fq0cr76a.js#getSettingsRootPathForSource` → isSandboxEnabledInSettings；`chunk-aat7wt0p.js#loadManagedFileSettings` → 路径符号链接安全遍历。
- `chunk-e6aww6q8.js#PLUTIL_ARGS_PREFIX`（mdm/constants）→ 工具定义 token 计数；`chunk-vrb44rx7.js#WINDOWS_REGISTRY_VALUE_NAME` → React 组件。两者都不属 MDM。
- `chunk-e6aww6q8.js#van`（handleOAuth401Error）→ 401 去重类；`chunk-e6aww6q8.js#sKi`（sendEventToRemoteSession）→ interruptRemoteSession。
- 大量 `fingerprint-shared` 克隆名：`isRealPathWithinTeamDir_N`（约 30 个，实为通用 ENOENT 判定）、`countToolCallsSince_N`（约 58 个，tool_use 遍历）、`logEventTo1P_N`（13 个，各种 API 提供方判定）、`getEnabledSettingSources_N`（11 个）、`execTmux_N`（10 个，WSL/UNC 路径判定与托管目录）、`getErrorsPath_N`（转录路径函数）。lead 已决定 shared 克隆不再决定归属；命名上本领域给了各自的语义名。

### 5.2 未归属段中应归入本领域的核心代码

- `_unattributed/chunk-dcmhvw5a/part-051/052/056.js`（`resolvePolicySettings` SI、`loadManagedFileSettingsFromDir` Tbr、`og`、`Ws` 等）→ `utils/settings/settings.ts`（托管层组合）。
- `_unattributed/chunk-aepeg2w5/part-012~014.js`（config 写队列、乐观写、freshness 监视）→ `utils/config.ts`。
- `_unattributed/chunk-jhrww53q/part-006.js`（`resolveGlobalClaudeFile` y_、`getGlobalClaudeFile` fb）→ `utils/env.ts`。
- `_unattributed/chunk-qzv7ezvq/part-001.js`、`chunk-f9pzpnqt/part-005/006.js`（项目目录、路径清洗）→ `utils/sessionStorage.ts` / `sessionStoragePortable.ts`。
- `_unattributed/chunk-s61vbvea/part-008.js`（`PromptHistoryStore` Pm）→ `history.ts`。
- `chunk-e6aww6q8.js#iBo/sNe/MJo/IJo`（continue/resume 加载）→ `utils/conversationRecovery.ts`。
- `_unattributed/chunk-cgr0tezp/part-018.js`（`DebugLogger`）→ `utils/debug.ts`。
- `chunk-aepeg2w5.js#Rl`（part-111，GrowthBook 客户端包装）→ `services/analytics/growthbook.ts`。
- `chunk-f22e0a61.js#Ey/Ehr/s8` → `services/analytics/config.ts`（旧版有此文件）。
- `chunk-aepeg2w5.js#$lt/ZM/yh/mI`（part-006）→ `memdir/paths.ts`。
- `chunk-0sfjpx19.js#fo/Ni/Hi/zt`（part-008，caffeinate）→ `services/preventSleep.ts`；该文件现有成员全是错配（ssh -G 探测、launchctl 包装）。
- 多 store 记忆同步（`chunk-s61vbvea` part-016~018、`chunk-hwmsct5x/part-008.js`）→ 建议新建 `services/memoryStores/`（316 新增）。

### 5.3 混入本领域、应移出的代码

- `services/SessionMemory/*`、`services/MagicDocs/*`、`services/teamMemorySync/{index,types,watcher}.ts`：316 已无这些功能，路径下全是错配声明（server classifier echo-wire → 权限/分类器；`chunk-82kqcve8.js#Vf` .synced-at 读取 → remoteManagedSettings；`chunk-wr8v03d0.js` base64/fetch 包 → vendor；servedCatalog/publishedCatalog → 模型/插件目录模块）。
- `services/oauth/crypto.ts`：MCP discovery 缓存加密（`chunk-0qyh5wah.js`）、`structuredContentJsonBase64`（`chunk-aqt8xcjw.js`）→ services/mcp；签名文档校验另归。
- `utils/commitAttribution.ts` 混入 `chunk-3wek6r2k` 约 70 个声明（启动设置、marketplace 同步、模型目录）；`utils/attribution.ts` 混入 `chunk-tyg7f3ek` 约 30 个（转录轮次判定）。
- `utils/sessionStoragePortable.ts` 混入 `chunk-vrr64ez0.js`（终端按键，12KB `SAr`）与 git 危险配置键；`utils/sessionStorage.ts` 混入 `chunk-06y4szbn`（artifact frame HTML）；`utils/plans.ts` 混入 PowerShell 路径常量。
- `utils/errorLogSink.ts` 混入 history purge（`chunk-5f8vf2zr`）与转录路径函数。
- `utils/stringUtils.ts` 混入 deniedModels 条目解析（→ utils/model）与标签中和/同形字符代码（建议独立模块）；`utils/hash.ts#Ue`（chunk-hq88884p）→ caCerts；`utils/tokenBudget.ts#mze` → bash/权限。
- `utils/generators.ts` 混入 plist XML 解析器（`chunk-sasp5j43`，→ settings/mdm）与 SDK ReadableStream 适配（→ vendor）。
- 第三方：`utils/lockfile.ts` 的 `chunk-bmbhxpfm.js#ut/#at`（proper-lockfile）、`services/diagnosticTracking.ts` 的 `@opentelemetry/api-logs`、`utils/telemetry/sessionTracing.ts` 的 `@azure/core-tracing`（`chunk-mrx6y2r5`）、`chunk-20ppca50.js` 的 default-browser/open、`chunk-nm3tp7ry.js` 的 STSClient → vendor。
- 领域划分：约 20 个 infra 模块更适合 ui（Cursor、suggestions/*、collapse*、status、staticRender、logoV2Utils…）或 query/tools（analyzeContext、sideQuery、queryContext、tokenBudget、toolErrors、argumentSubstitution）。

## 6. 未完成

- 本领域剩余约 500 个入度 ≥1 的未命名声明，多为混入代码与低引用常量；建议在切分修正后再补。
- 多 store 记忆同步、托管文档保护机制（held/substitute/floors）、转录压缩重写、teleport 细节未逐函数阅读（手册第 11 节）。
- 若 lead 按新切分重新生成 domains.json，需要重跑 `node artifacts/tmp/state/merge.mjs` 并补模块说明。
