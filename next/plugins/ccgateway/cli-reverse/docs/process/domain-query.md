# 领域 query 过程记录（dom-query）

## 1. 范围与交付物

- **领域**：`query`，模块清单在 `analysis/segments/domains.json`。开工时 115 个模块、2,164 个声明；lead 两次更新切分（加门面导出、加 `_new/*.helpers`）后为 120 个模块、2,053 个声明。
- **交付物**：
  - `naming/semantic-query.jsonl`：语义命名 2,475 条。
  - `naming/docs-query.jsonl`：声明说明 2,203 条，覆盖本领域全部 2,053 个声明，另有 150 条是 `_unattributed`/`_new`/misc 里与本领域直接相关的声明。
  - `naming/modules-query.json`：模块说明 120/120。
  - `docs/handbook/query.md`：子系统手册，17 节，约 177 KB。
- **可复现**：草稿和工具都在 `artifacts/tmp/query/`（gitignore），每个脚本文件头写了输入和输出。
  - 合并：`node artifacts/tmp/query/merge.mjs` 由草稿生成上面三个 naming 文件。
  - 手册：`node artifacts/tmp/query/assemble.mjs` 由 `hb-*.md` 生成 `docs/handbook/query.md`。

## 2. 方法

1. **建索引**：`index.mjs` 用 rename 库的 `bindingsOf` + `renameModule`，为本领域每个声明列出绑定键（`@偏移`）、压缩名、阅读树里的当前名，写入 `bindings.jsonl` 和 `decls.jsonl`。切分每次更新后重跑。
2. **辅助脚本**（q.mjs 当时 callers 很慢，后由 lead 修复）：
   - `todo2.mjs <模块>`：列出缺命名或缺文档的声明。
   - `q2.mjs`：q.mjs 的副本，额外加载草稿名。
   - `keys.mjs`：压缩名 → 键。
   - `def.mjs`：名字 → 定义声明，会跨 chunk 解析 import。
   - `edges.mjs`：快速调用关系。
3. **标注格式**：每个子区域写一份 `ann-<区>.txt`，一行同时给出名字和文档，例如 `@键 名字 置信度 | 文档`；`ann.mjs` 再把它拆成 `sem-/docs-/mod-<区>`。`check.mjs` 校验：
   - 键必须是真实绑定，名字合法，未冻结；
   - 置信度在 0.6–0.95；
   - 文档 id 存在；
   - 统计与门面名的冲突。
4. **分工**：按子区域用 fork 分支并行。主线程完成 query.ts 与 services/api/claude.ts，以及切分更新后剩下的约 40 个声明。分支负责：
   - model（utils/model、cost、effort、thinking、fastMode、advisor）
   - errors（withRetry、errors、限额等 17 个模块）
   - client（client、betas、api、logging、缓存断裂、cost-tracker、query/*、QueryEngine）
   - messages（11 个模块）
   - attachments（2 个模块）
   - compact（19 个模块）
   - prompts（constants、context、systemPrompt，共 25 个模块）

   每个分支只写自己区的 `ann/sem/docs/mod/hb/notes` 文件，没有两个写者写同一个文件。
5. **门面名**：lead 通知后，`ann.mjs` 和 `merge.mjs` 会跳过已有门面名的键（门面优先）。主线程和 model 区在通知前写的 42 条与门面不同的名字已经去掉。
6. **合并规则**（`merge.mjs`）：
   - 保留声明在本领域模块、`_unattributed`/`_new`、或尚无写者的 misc 里的条目。
   - 声明已归到其他领域（tools/state/commands/extensions）的 9 条名字、11 条文档丢弃，清单在 `artifacts/tmp/query/dropped-other-domain.jsonl`。
   - 本领域以外的声明如果其他领域已命名，以他们为准。
7. **引擎试跑**（`engine-check.mjs`，不落盘）：用 `naming/final` 加上 `semantic-query.jsonl` 在涉及的 105 个 chunk 上跑 `renameModule`。
   - 拒绝 0 条。
   - 加后缀 20 条，都是同一 chunk 里已有同名绑定（`same-scope`），属引擎正常处理。
   - 试跑按置信度合并，另有 143 条被高置信度的旧版名压过；正式流水线 `tools/naming/resolve.mjs` 的优先级是 facade > semantic > reference，这些会生效。

## 3. 数据

| 项 | 数值 |
|---|---|
| 语义命名 | 2,475 条：本领域顶层 1,840、参数与局部 459、领域外相关声明 176 |
| 覆盖错配的旧版名 | 265 条（note 写了原因） |
| 置信度分布 | 0.85 以上 231 条；0.75–0.85 672 条；0.6–0.75 1,572 条 |
| 顶层压缩名 | 本领域顶层绑定 2,417 个，其中 1,480 个原是压缩名；现在只剩 1 个（`chunk-372tanf4.js` 的 `WWe=2`，本领域没用到，含义无法确认） |
| 声明说明 | 2,053/2,053 个领域声明（100%） |
| 模块说明 | 120/120 |
| 手册 | 17 节；第 1–6 节和第 14–17 节由主线程写，第 7–13 节由分支片段合并 |

## 4. 关键发现（细节见手册）

- queryLoop 不再递归调用自身，而是返回 `NEXT_ROUND` 哨兵；终止原因和 transition 的全集见手册 4.2 节。
- 400 逐级去特性：决策在 `queryModel.onError`（约 40 个 `retry:` 标签），withRetry 对每个标签只重发一次，重发不计次数、不等待。实测的 6 个请求已逐个对上；第 4 个是 `ToolSearchRefusedError` 让外层重跑 queryModel，不是标签。
- `X-Stainless-Retry-Count` 恒为 0：SDK 客户端是 `maxRetries:0` 创建的。
- 实测的 8 个（第三方）和 11 个（第一方）beta 都已对上代码出处；system 块第三方 3 块、第一方 4 块的差别来自 `s2o` 的全局缓存分界。
- `cc_version` 后缀的算法：`sha256("59cf53e54c78" + 首条用户消息的第 4、7、20 个字符 + "2.1.316")`，取前 3 位十六进制。
- 316 没有 session memory 压缩，`services/compact/sessionMemoryCompact.ts` 下的声明都是归错的。
- 模型数据全部来自内置模型目录；默认 opus = `claude-opus-5-5`、`max_tokens=128000`、effort medium，与实测一致。

## 5. 坑

- **切分在工作中途更新了两次**（06:59、07:31）：
  - 第一次移出 437 个声明、移入 279 个；第二次新增 `_new/*.helpers` 模块。
  - 已完成区域里因此出现了新声明，由 client 分支和主线程补齐。
  - 写草稿时，键是绑定偏移，不受切分影响；但"是否属于本领域"要在合并时按最新切分判断，所以 `ann.mjs` 改成按全量扫描定位声明，不依赖领域索引。
- **门面名在中途引入**：之前写的 42 条与门面冲突，已全部去掉。
- **旧版名大量错配**，集中在两类：
  - fingerprint-shared 同名族，如 `isMedia_N`、`getTokenCountFromUsage_N`、`modelMatchesVersionPrefix_N`、`getRequestTooLargeErrorMessage_N`；
  - 单个字符串命中把常量名配到函数上，如 `*_TAG`、`BLACK_CIRCLE`。

  还有几处语义正好相反的错配，例如：
  - `isAutoCompactEnabled` 实为"被环境变量禁用"；
  - `isAttributionHeaderEnabled` 实为"已关闭"；
  - `#dyn` 被叫作 shouldRetry，实际意思相反。
- **旧版名误导阅读**：`chunk-ha3km179.js#Ti` 的旧版名是 createAssistantAPIErrorMessage，实际是 `isSafetyMonitorBlockedMessage`；queryLoop 里调用它的地方按旧名很容易读错。messages 区已按实际行为覆盖。
- **tools/q.mjs callers** 在大 chunk 上要跑十几分钟（后由 lead 修复），这期间改用自建的 `edges.mjs`。
- 本机并发子代理上限 20，开始时与其他领域抢不到槽位，前期由主线程独自推进。

## 6. 给 lead 的建议

格式统一为 `声明 id → 应归属路径/应叫什么，证据`。

### 6.1 主线程

- `chunk-tyg7f3ek.js#nI`、`#Mp`、`#BE`、`#Dy` → `QueryEngine.ts`。证据：这是 headless 引擎主体，`#nI` 返回 `{submitMessage, interrupt, setModel, getMessages, …}`，`#Mp` 构建 `runQuery: query` 的 ToolUseContext，`#Dy` 是 headless 每轮驱动器。
- `chunk-42jte3st.js#Pjn`（旧版名 `yieldMissingToolResultBlocks_2`）→ 应叫 `collectNamedAgentIds`，且不属于 query.ts。证据：它从 Agent/Task 调用与 toolUseResult 里收集 名字→agentId，和 tool_result 补齐无关。
- `chunk-0kp6eg01.js#gn`（旧版名 useCostSummary）→ 不是 costHook。证据：只注册一次 process exit 监听，退出时删除 activeKeyFile（`DDs`，已归 `_new/validateExplicitMessagingSocketPath.ts`）。`costHook.ts` 现在只剩这一个声明，旧版的 useCostSummary 在 316 里没找到。
- `chunk-cgr0tezp.js#t`：旧版名 `fetchTeamMemory` 为错配，门面名已给出 `logForDebugging`，不需要另外处理；只提醒阅读旧版名阅读树时注意。
- 与其他领域命名冲突的 8 个键都在本领域模块内，按"一个模块一个写者"保留了本领域的名字。对方的名字分别是：
  - state：`getToolUseIdsFromBlocks`、`countNamedToolUses`、`isReadOnlySettingSource`
  - tools：`canAutoApproveWebFetchDispatch`、`markUnreviewedWebFetchDispatch`、`computeToolDefinitionHash`、`INHERIT_MODEL_CHOICE`、`DEFAULT_MODEL_CHOICE`

  请在合并时裁决。键和双方名字可用 `naming/semantic-*.jsonl` 对比得到。
- **匹配器**：建议低分 fingerprint-shared 克隆族与 layout/affinity 放置的声明不再继承旧版名（本领域 265 条覆盖里大部分属于这两类），单字符串指纹配到函数时也不要采用。

### 6.2 各子区域（分支整理，原文照录）

#### 子区域 model


- `chunk-axmbhcjg.js#kt`、`#Q`、`#Bt` → 应归文件访问/权限的敏感路径判定模块（如 `utils/permissions/filesystem.ts` 一类），不是 `utils/model/antModels.ts`；证据：只处理 lexicalRel/realPath 与 sensitive/read_denied。
- `chunk-jhrww53q.js#NN`（环境变量注册表 76 个声明）→ 应归环境变量注册表模块（runtime 文档提到的 `chunk-jhrww53q.js` 集中注册表），不是 `utils/model/bedrock.ts`；证据：`L.bool()/L.str()` 声明 + getter 表。
- `chunk-qz53w8v8.js#C`（1568、各提供商 2000）→ 应归图片尺寸限制（`utils/imageResizer.ts` 或 `constants/apiLimits.ts`），旧版名 CLAUDE_OPUS_4_6_CONFIG 错配；证据：同 chunk 的 `Td()` 计算 maxWidth/maxHeight。
- `chunk-fft78xw8.js#hxo`、`#yxo`、`#d` → 与 fast mode 无关（锚点快照/回退），应移出 `utils/fastMode.ts`；证据：`preAnchorLineUuids`、`context_reduced`。
- `chunk-c18v4hz4.js#ce`、`#L`、`#H` → 与 fast mode 无关（远程/桥接门控 verdict），应移出 `utils/fastMode.ts`；证据：调用方 `useReplBridge` 侧、`eQe` verdict。
- `chunk-e6aww6q8.js#cVe`（"pending"）→ 旧版名 orgStatus 错配，调用方全在 `_unattributed/chunk-e6aww6q8/part-075.js`，应随之归属。
- `chunk-e6aww6q8.js#tAt` → 进程 pid 校验，应归进程清理模块，不是 `utils/effort.ts`（旧版名 isValidNumericEffort 错配）。
- `chunk-e6aww6q8.js#Hhe` → 钩子来源标签，应归 hooks，不是 `utils/model/modelOptions.ts`。
- `chunk-4121qate.js#Ceo`、`#gd` → 提示词块规整（SDK/钩子输入），不是 `utils/model/modelCapabilities.ts`。
- `chunk-82kqcve8.js#aa` → 组织记忆发现缓存路径，应归 memdir/记忆模块。
- `chunk-9mf2agcn.js#eje` → `claude-<uid>` 临时名，应归 Shell/临时目录模块，不是 `utils/model/modelAllowlist.ts`。
- `chunk-5wjwnxna.js#c`（百分比格式化）、`chunk-18hwfzwa.js#A0n`（倍率格式化）→ 归 UI 格式化工具，不是 `utils/modelCost.ts`。
- `chunk-e6aww6q8.js#ZCr`、`#eAr`（Todo 工具旧模型集合）→ 应归 Todo/Task 工具相关模块，不是 `utils/model/model.ts`。
- `chunk-aepeg2w5.js#bEe` → 属于模型别名/1M 判定，应归 `utils/model/model.ts`，不是 `utils/fastMode.ts`（旧版名 getFastModeModel 错配）。
- `chunk-hwmsct5x.js#U_` → Opus 4.6 选项，应归 `utils/model/modelOptions.ts`，不是 `utils/fastMode.ts`。
- `chunk-hwmsct5x.js#Oo`…`#mi`（选项构建）→ 应归 `utils/model/modelOptions.ts`，目前在 `utils/model/agent.ts`。
- 建议把 `_unattributed/chunk-aepeg2w5/part-05x–07x`（`Z_`、`tne`、`Fw`、`rm`、`om`、`ro`、`by`、`ep` 依赖等）与 `_unattributed/chunk-kswt4qha/part-006–012`（`aS`、`gcr`、`Ote` 等）归入 `utils/model/model.ts`、`utils/model/modelAllowlist.ts`、`utils/effort.ts`，它们是这些模块的主体逻辑。
- 匹配器把同名族（`isMedia`、`modelMatchesVersionPrefix` 等）的 fingerprint-shared 结果按名字分发给多个无关声明，建议对 `fingerprint-shared` 且得分低的匹配不采用旧版名。

#### 子区域 errors


- `chunk-cdckcchh.js#s`、`#c`、`#L5t`、`#_` → `vendor/@aws-crypto/sha256-js`（第三方 SHA-256/HMAC，轮常量表 1116352408… 为证）。
- `chunk-mrx6y2r5.js#Up`、`#Ea` → `vendor/@azure/core-rest-pipeline`（字符串 "core-rest-pipeline retryPolicy"）。
- `chunk-82kqcve8.js#gm`、`#wa` → 非 withRetry；解析普通对象头的 retry-after，调用方在 chunk-82kqcve8 part-008，属另一个 HTTP 客户端模块。
- `chunk-e6aww6q8.js#Bte` 所在 `_unattributed/chunk-e6aww6q8/part-389.js`（54 个声明：`Bte` 常量组、`pRe`/`Xb` RETRY_WATCHDOG 判定、`XB`、`MEe`、`iyn`、`y_r`、`__r`、`T_r`、`g_r`、`h_r`、`zQe`、`WQe`）→ `services/api/withRetry.ts`：都是 withRetry 的局部辅助与常量（DEFAULT_MAX_RETRIES=10、FLOOR_OUTPUT_TOKENS=3000、MAX_529_RETRIES=3、PERSISTENT_MAX_BACKOFF_MS=300000、PERSISTENT_RESET_CAP_MS=21600000、HEARTBEAT_INTERVAL_MS=30000，与旧版同值）。
- `chunk-gr2vfhah.js#xU`（指数退避+抖动，默认基数 500、上限 32000）→ `services/api/withRetry.ts`（旧版 getRetryDelay）；`chunk-gr2vfhah.js#WEe`、`T`、`PU`、`Zls`、`LK` 错误码集合 → `services/api/errorUtils.ts`。
- `chunk-3rwvzn82.js#Go`、`chunk-kswt4qha.js#O5t`、`#qZo` → `utils/effort.ts`（effort 级别说明与相邻级别）。
- `chunk-aepeg2w5.js#xRn`、`#uqi` → `utils/auth.ts`（订阅类型为 max）。
- `chunk-06y4szbn.js#Zc`、`#Qc`、`#ed`、`#Zt`、`#In` → 非本领域（部署 live-path 错误与 HTML viewport 处理，疑似 artifact/预览发布模块）。
- `chunk-7t4fmt2f.js#ai`、`#di`、`#li`、`#Lt` → 非 errorUtils；axios 错误码规整（调用方 `#PRt`）。
- `chunk-hvpfdswb.js#O` → `utils/authFileDescriptor.ts`（调用方 getCredentialFromFd）。
- `chunk-aepeg2w5.js#kA` → 网关登出模块（"[gateway-logout] revoked the gateway"），不是 metricsOptOut。
- `chunk-hwmsct5x.js#Yd` 常量组 → 低优先级等待（额度恢复排队）模块，不是 mockRateLimits。
- `chunk-5x106wnr.js#y`、`chunk-ss669z1x.js#vt`、`#Xe`、`chunk-77a3xzkb.js#s`、`#u`、`chunk-fm6h4dv7.js#M7` → 非 claudeAiLimits/mockRateLimits（Promise 结果展开、临时文件名判断、低优先级等待），按 fingerprint-shared 同名族误配。
- 匹配器建议：fingerprint-shared 同名族（`getRequestTooLargeErrorMessage_*`、`extractQuotaStatusFromError_*`、`isMediaSizeErrorMessage_*`）在得分低时不要沿用旧版名，本区域这些几乎全错。

#### 子区域 client


- `chunk-s67vc0kc.js#ke` → 应归 PowerShell 权限检查模块（如 `tools/PowerShellTool/…`），叫 `POWERSHELL_ACTION_PARAMS`/`POWERSHELL_ACTION_VALUES`；证据：同 chunk 内 `-erroraction/-warningaction` 等常量。旧版名 checkTokenBudget 错配；`query/tokenBudget.ts` 切分后只剩这一个归错声明。
- `chunk-e6aww6q8.js#y4t`（旧版名 detectGateway）→ 应归 `tools/BashTool/shouldUseSandbox.ts`，叫 `stripWrapperCommandPrefixes`；证据：使用 `qye`（timeout/time/nice/nohup 集合，shouldUseSandbox.ts），调用者 `#aNo`、`#uNo`（shouldUseSandbox.ts）。
- `chunk-e6aww6q8.js#QFo`（旧版名 writeCacheBreakDiff）→ 应归文本输入组件（`components/BaseTextInput.tsx` 一带），叫 `splitSpansAroundOverlays`；证据：唯一调用者 `chunk-81qqq1aq.js#Knn` = BaseTextInput，处理 spans 区间。
- `chunk-a76knw89.js#To`（旧版名 buildDiffableContent）、`#Se`、`#Ee` → 应归提示词快照/记录工具比较模块（调用者 `chunk-a76knw89.js#roi`、`#TYo`，未归属）。
- `chunk-w6mc5gr3.js#ee`（sanitizeToolName）→ 应归 `services/analytics/datadog.ts`（唯一调用者 `chunk-w6mc5gr3.js#w6t`）。
- `chunk-18hwfzwa.js#ITe`（旧版名 filterSwarmFieldsFromSchema，实为 schema required 过滤）→ 调用者是 `components/mcp/ElicitationDialog.tsx`，应归该组件或其 schema 工具。
- `chunk-hwmsct5x.js#Fl`、`#rh`、`#Ml`、`#gir`、`#i9r` 依赖的 `#Sh/#wh`（已归 client.ts）以及 `chunk-aepeg2w5.js#t8t/#Gto/#Kto/#n8t/#LEi/#HEi`（请求头名与 request-class 计算）→ 应归 `services/api/client.ts`（或 `utils/http.ts`）；证据：只被 getAnthropicClient 使用，构成默认请求头。
- `chunk-bwbq4xvm.js#i9t`（beta 常量组）、`#Rxn`、`#lls`、`#uoo`、`#ed`、`#dls` → 应归 `constants/betas.ts`；证据：全部是 `k(name, header)` beta 定义与集合。
- `chunk-bwbq4xvm.js#oj`、`#Ww`、`#ID` → 应归 `services/api/client.ts`（自定义 anthropic-beta 头、Authorization 屏蔽、SDK auth 初始状态）。
- `chunk-w5ndchqs.js` 的身份行常量 `oe/Ue/Ie/mt/J`（`f7n`、`p7n`）→ 应归 `constants/system.ts`（身份行选择 `p7n`：vertex/记录值/非交互+append/SDK/CLI）。
- `chunk-e6aww6q8.js#zyn`（cache-diagnosis 门）、`chunk-w7m8zp6e.js#ute` → 应归 `utils/betas.ts`。
- `chunk-tyg7f3ek.js#nI`（headless 引擎主体，返回 submitMessage/interrupt/setModel/getMessages…）、`#Mp`（构建 ToolUseContext）、`#BE`（孤立权限/交接处理）、`#Dy`（headless 回合运行器）→ 应归 `QueryEngine.ts`；证据：`ask()`（`#hm`）调用 `#Mp`，`#nI` 的 run 指向 query()。
- costHook.ts：原混入的 `chunk-fq0cr76a.js`（Linux 沙箱挂载点清理 `ga/Zm/o1/JR/ZE/Wf`，旧版名 useCostSummary 被配到 `#A8`）在新切分已移出、costHook.ts 现为 0 个声明；`#A8` 只是注册 process exit 清理，不是 useCostSummary，若仍有旧版名请撤销。
- 门面：本区域与门面名冲突 0 条。


#### 子区域 messages


格式：`声明 id → 应归属路径/应叫什么，证据`。

- `chunk-e6aww6q8.js#jzo` → `utils/messageQueueManager.ts`（createMessageQueue 一类），证据：返回对象含 `enqueue/dequeue/peek/remove/removeByFilter/popAllEditable/getCommandsByMaxPriority/enqueuePendingNotification` 等旧版 messageQueueManager 导出名，记录 `type:"queue-operation"`。
- `chunk-e6aww6q8.js#k6n`、`#Kbe`、`#D6n`、`#zvt`、`#Exs`、`#tvt`、`#Uzt`、`#mJe`、`#b6n`、`#p6n`、`#m6n`、`#rhn` → `utils/messages.ts`，证据：只被 `normalizeMessagesForAPI`/`normalizeAttachmentForAPI` 调用，是规范化管道的步骤（`k6n` 对应旧版 reminderFold 下的 smoosh 数组级步骤）。
- `chunk-ag5x7vhf.js#cs/#vw/#Ol/#Ul/#Bl/#Fl/#rD/#iD/#Cw/#ds/#Mw/#jw/#Ep/#nD/#Tw` → 可保留在 `utils/messages.ts`（是 buildMessageLookups/normalizeMessages 的增量实现），但它们在 UI chunk 里，若 lead 想按旧版布局也可单列 `utils/messageLookups.ts`；旧版名 `EMPTY_LOOKUPS`、`findLastCompactBoundaryIndex`、`getInProgressHookCount` 都配错了。
- `chunk-ah34pb7m.js#Nm` → `components/Message.tsx` 一类（React 组件，用 `w(3)` 缓存），证据：调用方 `chunk-ah34pb7m.js#Ah = UserMessage`；不是 createUserInterruptionMessage。
- `chunk-aepeg2w5.js#Apr` → `utils/model/` 下（模型 id 掩码，调用 `Txt()=servedCatalogMaskedIds`、`kIe`、`nN`），不是 createModelSwitchBreadcrumbs；真正的 createModelSwitchBreadcrumbs 是 `chunk-e6aww6q8.js#uXs`。
- `chunk-e6aww6q8.js#Xv/#$at/#FHn`（插件文本过长提示）→ 插件相关模块（调用方 `_unattributed/chunk-e6aww6q8/part-348.js`），不属于 messages。
- `chunk-e6aww6q8.js#xBe` → `utils/sessionStorage.ts`（调用方全在 sessionStorage：convertToLogOption 等）。
- `chunk-e6aww6q8.js#T5s/#yJo/#EQo` → `cli/print.ts` 或会话恢复模块（调用方 `chunk-tyg7f3ek.js#$z = runHeadlessStreaming`、`#i9`）。
- `chunk-e6aww6q8.js#nO … #Wtt/#MRe/#vEt`（权限拒绝与 auto mode 分类器文案，约 40 个声明）→ 旧版也放在 `utils/messages.ts`，保持即可；但 `buildClassifierUnavailableMessage` 系列的调用方在 `utils/permissions/permissions.ts`，若要细分可单列。
- `chunk-18hwfzwa.js#WIe/#qvt/#Wvt/#jvt/#$vt/#Vvt/#qIe/#Kvt/#Gvt/#$Ie/#c1o/#eCt/#VIe` 与 4 个匿名 `j()` → 用量限额通知 UI（REPL 调用 `useUsageLimitNotices`），不属于 `utils/messageQueueManager.ts`；应归 `components/` 或 `hooks/` 下的限额通知模块。
- `chunk-18hwfzwa.js#Aue` → 权限模式循环（`utils/permissions/getNextPermissionMode.ts` 一类），不是队列 `peek`。
- `chunk-e6aww6q8.js#B9/#epo/#tpo/#U9/#npo/#rpo/#spo/#ipo` → 转录修复/校验模块（`compactMetadata` 修复，调用方 `#Jfo`），不属于 messageQueueManager。
- `chunk-0sfjpx19.js#Un` → `utils/messageQueueManager.ts` 可保留，但它不是 enqueuePendingNotification（是 Slack later 通知判定）。
- `chunk-ha3km179.js#kd` → `utils/messages.ts` 或 queryLoop 附近（找最后一条真实用户消息），不是 isQueuedCommandEditable。
- `chunk-ha3km179.js#Ti` 的旧版名 `createAssistantAPIErrorMessage` 错配：它是 `isSafetyMonitorBlockedMessage`；queryLoop 里多处 `createAssistantAPIErrorMessage(at)` 实为这个判定，阅读时容易误解。
- `chunk-bfnfj4kx.js#Dr` → 不像 streamlinedTransform（统计 stateReads/stateWrites），疑似 workflow/工具状态模块。
- `chunk-e6aww6q8.js#vbt`（字符串 "tengu_chair_sermon"）旧版名 mergeUserContentBlocks 错配。
- 匹配器建议：layout/affinity 夹出来的声明不要直接继承“夹它的两个声明所在文件”的旧版名（本区域 54 处错配大多来自 fingerprint-shared 同名族和 layout）。

#### 子区域 attachments


格式：`声明 id → 应归属路径/应叫什么，证据`。

**旧版名错配（已在 semantic 里覆盖）**：
- `chunk-e6aww6q8.js#Sdo` → getQueuedNotificationMode：返回模式字符串，不是常量集合 INLINE_NOTIFICATION_MODES（那是 `#jxr`）。
- `chunk-e6aww6q8.js#eqo` → shouldIncludeMemoryFile：判断记忆文件是否计入，只被 `#L_e` 调用。旧名 getNestedMemoryAttachmentsForFile 的实体是 `#rAn`。
- `chunk-e6aww6q8.js#Yxr` → getSilentTurnStats：统计静默轮与 silent_turn_reminder，与 auto mode 无关（旧名 getAutoModeAttachmentTurnCount）。
- `chunk-e6aww6q8.js#APs` → isDeferredToolsDeltaUnchanged：返回布尔，调用方是 `#Kbe`（part-429，消息规整），不在附件生成路径；应归 `utils/messages.ts`。
- `chunk-qbyj1m48.js#KLe` → parseQueuedCommandAttachment：解析附件为 {uuid, content, …}，不是生成函数；应归 `utils/messages.ts` 或 `utils/messageQueueManager.ts`。

**归错文件**：
- `chunk-hq88884p.js#Et`（`["bundled","system"]`，CA 证书来源）→ TLS/CA 证书模块（同 chunk 的 `_new/BLOCKED_ROOT_SHA256.ts`），旧版名 filterToBundledAndMcp 错配。
- `chunk-tyg7f3ek.js#uM`（协调器 TTL/长度常量，被 `#cM`/`#HW`/`#NW` 使用）→ 协调器相关模块（`_unattributed/chunk-tyg7f3ek/part-010.js` 同组），旧版名 getAgentPendingMessageAttachments 错配。
- `chunk-0tkmvwy0.js#jn`、`#Lo`（WebFetch 派发自动批准，调用方 AgentTool `#won`）→ `tools/AgentTool/`，与工具结果存储无关；`#Lo` 旧版名 collectCandidatesFromMessage 错配。
- `chunk-twq47pff.js#ar`、`#Rt`（技能路径判断、读 ccr-home-seed.json）→ `utils/hooks/skillImprovement.ts` 或远程种子模块；旧版名 getOutputStyleAttachment / isFileReadDenied 错配。
- `chunk-nkdv7dw8.js#At` → 会话标题相关模块（调用方 `#wCs` 处理 titles.owed）；旧版名 getVerifyPlanReminderTurnCount 错配。
- `chunk-ha3km179.js#sd`（收集助手文本与 SendUserMessage 文本，调用方 `#ad`）→ 回复门/Brief 模块，不是 collectRecentSuccessfulTools。
- `chunk-tmx5d02z.js#sn`、`#Xe`（图片收集，最多 4 张，调用方 `#et`）→ 归属不明，不属于 attachments。
- `chunk-ah34pb7m.js#VR`（`<bash-stdout>`/`<persisted-output>` 标签常量）→ Bash 工具输出模块更合适，与 `chunk-jcnpfn31.js#Dee` 重复定义。
- `chunk-bnwcqde4.js#iJr`（createAttachmentMessage）可留在 attachments.ts。

**应补进本模块**：`chunk-e6aww6q8.js#XCn`、`#ZCn`、`#Kmn`、`#rPr`、`#Gjo`、`#nGe`、`#$Rn`、`#CRn`、`#eCn`、`#wRn`（part-307~314 的附件生成器）目前在 `_unattributed`，都被 getAttachments 直接调用，应归 `utils/attachments.ts`。


#### 子区域 compact


- `chunk-e6aww6q8.js#yzr`、`#hzr`、`#apr`、`#rpr`、`#fpr`、`#xjo`、`#upr`、`#Nln`、`#Zfr`、`#tpr`、`#Ojo`、`#Fln`、`#_te`、`#UTe`、`#Pjo`（part-257/258）→ services/compact/autoCompact.ts；证据：`productionDeps.autocompact = yzr`，内部调用 shouldAutoCompact/compactConversation/checkRapidRefillBreaker。
- `chunk-e6aww6q8.js#Z4e`、`#AJ`、`#J4e`、`#DZ`、`#abe`、`#fse`、`#eWt`、`#F8n`、`#bUo`、`#a6e`、`#dQt`、`#t6e`、`#rQt`、`#iQt`、`#$8n`、`#eQt`、`#sjr`、`#rjr`（part-165/166/167/168）→ services/compact/autoCompact.ts；证据：被 calculateTokenWarningState/getAutoCompactWindow/getAutoCompactThresholdTokens 直接调用，常量 13000/20000/3000 与旧版 AUTOCOMPACT_BUFFER_TOKENS 等一致。
- `chunk-e6aww6q8.js#dJn`、`#Tjo`、`#HTe`、`#lJn`、`#qee`、`#Qsr`、`#Bee`、`#FTe`、`#NTe`、`#LTe`、`#Usn`、`#sir`、`#rir`（part-231/232）→ services/compact/compact.ts（或新建 reactiveCompact.ts）；证据：反应式/整段压缩的直接组成，`tengu_reactive_compact_*`。
- `chunk-e6aww6q8.js#Tp`、`#U4e`、`#j4e`、`#Lg`、`#Vxo`（part-087/162/163）→ utils/tokens.ts；证据：tokenCountWithEstimation 的估算版本，shouldAutoCompact 用。
- `chunk-e6aww6q8.js#szr` → services/compact/compact.ts，叫 buildReactiveCompactionResult；证据：记 `tengu_reactive_compact_succeeded`，被 dJn/Tjo/compactViaReactive 调用，无任何 session memory 逻辑。
- `chunk-tyg7f3ek.js#Gb` → cli/print.ts，叫 getParkedTurnSendUuids；证据：唯一调用方 runHeadlessStreaming 的 `sendsTheParkedTurnTookIn`。
- `chunk-9h8dr0qb.js#gm`、`#bi`、`#jr` → components/Stats.tsx（或统计缓存模块），日期解析；证据：唯一调用方 mergeCacheWithNewStats。
- `chunk-e6aww6q8.js#Oan`、`#Ian`、`#tcr`、`#eve` → MCP 说明/computer-use 相关模块（utils/attachments.ts 附近或 utils/computerUse/）；证据：内容是 computer-use 与 Slack MCP 说明，调用方 getMcpInstructionsDeltaAttachment。
- `chunk-0h4e7gnq.js#Hn` → tools/AgentTool/agentToolUtils.ts（代理轮次用量汇总）；证据：调用方在 chunk-0h4e7gnq part-003 的 turn.complete 读用量。
- `chunk-bss4k1z9.js#Mt` → 会话钩子插件代码（_unattributed/chunk-bss4k1z9），不是 utils/tokens.ts。
- `chunk-e6aww6q8.js#$y` → 自动模式分类器模块（utils/permissions/autoMode 一类），叫 getAutoModeClassifierRole；证据：只是 B3n(...).role。
- `chunk-1ny7cxrt.js#Kbe` → SSE 用量解析器所在模块（chunk-1ny7cxrt part-007），叫 createSseUsageState。
- `chunk-23fm9f0d.js#zt` → utils/cleanup.ts；证据：调用方 cleanupOldMessageFilesInBackground（facade-majority 归 utils/cleanup.ts）。
- `chunk-82kqcve8.js#Te` → utils/permissions/filesystem.ts；证据：调用方 checkEditableInternalPath/checkReadableInternalPath。
- `chunk-6vnxsn99.js#Hhn` → 遥测/通用工具模块；证据：调用方 SessionBackgroundHint 与 gXe，和 speculation 无关。
- `chunk-e6aww6q8.js#rlo`、`#slo` → utils/messages.ts（规整时折叠重复空 Poll 调用）；证据：唯一调用方 tvt → normalizeMessagesForAPI。
- `chunk-qchp9vrd.js#xi` → chunk-qchp9vrd 的工具权限/分组模块；证据：调用方 rr/mf/Br 都在 part-005。
- `chunk-9tgt55am.js#Cd`、`#Od` → Artifact 评论自动回复模块（chunk-9tgt55am part-003）；证据：querySource `artifact_comment_fast_ack`，调用方 kd。
- `chunk-18hwfzwa.js#Eno`、`#Z3e` → components/PromptInput 的拼写检查模块；证据：唯一调用方 Bye（PromptInput 的 spellcheck）。旧版名 findBtwTriggerPositions 为错配。
- `chunk-e6aww6q8.js#gUo`、`#njr`（部分 UI 使用）留在 utils/tokens.ts 合理；`chunk-e6aww6q8.js#qot`（状态栏 context_window）可考虑归 components/StatusLine.tsx。
- 匹配器：本区域 fingerprint 单向匹配到“同名族”（如 getTokenCountFromUsage_5/_6、isMedia_N、findBtwTriggerPositions_2）几乎都错，建议对 fingerprint-shared 低分匹配不再采用旧版名。

#### 子区域 prompts


格式：`声明 id → 应归属路径/应叫什么，证据`

- `build-report-lite-jwtbvm49.mjs#WIN`、`#NOFOLLOW` → 归 build-report-lite 脚本自己的模块，不属于 constants/prompts.ts。证据：位于独立 .mjs 脚本，只是 `process.platform==='win32'` 与 `O_NOFOLLOW`；fingerprint 只因为都含字符串 "win32"。
- `chunk-e6aww6q8.js#KI` → 应叫 `getSystemPrompt`（constants/prompts.ts）。证据：它返回最终的字符串数组并插入动态分界，被 AgentTool、/compact、/context、queryContext 等调用；`#Aur` 只是渲染段列表。
- `chunk-dcmhvw5a.js` 导出的 `h$`（`__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__`）→ constants/prompts.ts 的 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`。证据：它与 HOOK_EVENTS 在同一声明里，被 claude/api 的切分函数用作分界。
- `chunk-w5ndchqs.js#JXs`、`#QXs`（未归属）→ services/api/claude.ts（或 utils/api.ts），名字可用 `prependAttributionAndPrefix` / `prependAttributionHeaderBlock`。证据：JXs 被 queryModel 调用，拼 `[计费头, 身份行, ...systemPrompt]`；QXs 是给辅助查询加计费头块。
- `chunk-gqez588q.js#B`、`#T`、`#_`、`#D`、`#zOs` → 路径规范化/显示工具模块（如 utils/path 一类）。证据：处理 `\\?\`、/private、/Volumes、/proc/self/root 前缀以及 `~/`、`./` 缩写，和 figures 无关。
- `chunk-2xm1rxms.js#Ee`、`#$e` → worktree 工具。`chunk-3zy56vtn.js#ze` → 错误描述工具。`chunk-ah34pb7m.js#bc` → BashTool 输出解析。`chunk-p5akk6be.js#Myr`、`#Gcs` → 标签扫描器（channel）模块。`chunk-e6aww6q8.js#Jan` → tools/AgentTool/loadAgentsDir.ts（被 AgentJsonSchema 使用）。证据：均为函数或 schema，不是 xml 常量；fingerprint 仅因字符串相同。
- `chunk-yb0ajcmt.js#me`、`#mt` → 图布局模块（与 `ht` 等同 chunk 邻居）。`chunk-3nztfxrw.js#cn`、`#qn` → 在途计数相关模块。证据：节点 center/slot 计算、increment/decrement，与 context/stats 无关。
- `chunk-dwh5z7zb.js#dxs` → 启动公告模块（与 `ADe`、`lxs` 同文件）。证据：同 chunk 导出 `ADe`（startupAnnouncementPick）。
- `chunk-hwmsct5x.js#mc` → utils/model/model.ts（getDefaultModelForFamily）。证据：返回 Ug/zy/TD/E6e 默认模型 getter。
- `chunk-aepeg2w5.js#kT` → utils/auth.ts。证据：读 CLAUDE_CODE_OAUTH_SCOPES，被 getClaudeAIOAuthTokens、isUsingOAuth 调用。
- `chunk-ndmse9kj.js#Du`（含 `ki="<synthetic>"` 等）归 constants/messages.ts 正确；同语句里的回滚说明（`gEr`、`Lbs`）应属 rewind 模块，但与常量同一语句无法拆分，保持现状。
- 匹配器：fingerprint 单字符串（"win32"、"summary"、"channel"、"status"）命中的旧版常量名，配到函数上时应丢弃。上面的 `*_TAG` 错配全属于这一类。


## 7. 未完成

- 本领域相关但仍在 `_unattributed` 的代码只命名了直接相关的部分，见 6.2 各子区域"建议移入"。包括：
  - headless 引擎；
  - 自动压缩本体 `yzr` 与反应式压缩；
  - 消息规整流水线的若干步骤与队列核心 `jzo`；
  - beta 常量组与请求头名常量。

  lead 归位后，可以用 `artifacts/tmp/query/todo2.mjs` 对新模块再补一轮。
- 手册第 17 节和各节"未解之处"列出的声明还没读透。
- 每个子区域完整的过程记录（做了什么、坑）在 `artifacts/tmp/query/notes-<区>.md`，本文件只摘录了"给 lead 的建议"。
