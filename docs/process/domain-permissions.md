# 过程记录：permissions 领域（dom-permissions）

## 1. 做了什么

- **范围**：最初派到 `analysis/segments/domains.json` 的 `permissions` 键，共 67 个模块、1363 个声明。lead 在 06:59 和 07:31 两次重切后，本领域变为 69 个模块。另外有 6 个 `_new/*` 模块在内容上属于本领域，但 `domainOf` 把它们归到 misc：`_new/SandboxManager`、`_new/exec`、`_new/decideWithToolCheckHooks`、`_new/INLINE_CODE_FLAGS`、`_new/extractOutputRedirections`、`_new/filterToolsByDenyRules`。这 6 个我一并做了命名、说明和模块说明。
- **分工**：
  - 第一轮按子系统拆成 4 个分支，各写各的草稿，互不重叠：
    - core：utils/permissions 核心 17 个模块，加 types/permissions、classifierApprovals；
    - cfs：yoloClassifier、filesystem、pathValidation；
    - bash：utils/bash/*；
    - shell：sandbox、Shell、shell/*、powershell、secureStorage、exec*。
  - 第二轮是 3 个补漏分支（gap1–3），处理“被其他模块使用但还没有说明”的 404 个声明。
  - 合并、门面对齐、校验和手册由我完成。
- **工具**（都在 `artifacts/tmp/permissions/`，文件头注释写了输入和输出）：
  - `check.mjs`：校验命名键是否为绑定声明偏移、名字是否合法、doc id 是否存在、是否在本领域、有无重复。
  - `merge.mjs`：合并草稿。门面原名优先，同键时丢弃 semantic；落在 vendor 模块的条目丢弃；按新切分生成模块说明；报告写到 `merge-report.json`。
  - `missing-docs.mjs`：列出缺说明的跨模块使用声明。
  - `count.mjs`：统计命名的分类条数。
  - `patch-handbook.mjs`：对手册打更正补丁，每条更正必须恰好命中一次。
  - 各分支的规格源文件和生成器：`core/`、`cfs/`、`bash/`、`shell/`、`gap1-3/`。
- **重新生成**：`node artifacts/tmp/permissions/merge.mjs`，再运行 `node artifacts/tmp/permissions/check.mjs naming/semantic-permissions.jsonl naming/docs-permissions.jsonl naming/modules-permissions.json`。

## 2. 数据

| 项 | 数 |
|---|---|
| `naming/semantic-permissions.jsonl` | **1,994** 条：顶层 1,019、参数 647、局部 328。check 结果 errors=0 |
| 与门面原名同键而丢弃的条目 | 160 条：同名 45、不同名 115，不同名的一律以门面为准 |
| 落在 vendor 模块而丢弃的条目 | 4 条：sandbox-runtime 的 shell-quote 和 SandboxManager、@azure/core-client、openid-client |
| `naming/docs-permissions.jsonl` | **874** 条。本领域模块 1,750 个声明中有 847 个带说明；跨模块使用且超过 60 字节的声明中，只有 13 个缺说明，都在 07:31 新切出的 `utils/bash/_new/checkDeclarationOptions` 等辅助模块里 |
| `naming/modules-permissions.json` | 75 个：本领域 69 个全覆盖，另加 6 个 `_new/*` |
| `docs/handbook/permissions.md` | 15 节：模式、规则、判定流水线、钩子、文件权限、分类器、Bash/PowerShell、沙箱、执行、存储、数据结构、配置/env/开关、与 2.1.88 的差异、未解之处 |

check 的警告（"not in domain"）全部来自重切。命名本身对绑定生效，不受归属变化影响。

## 3. 发现

- **auto 进入对外枚举**：`EXTERNAL_PERMISSION_MODES = [acceptEdits, auto, bypassPermissions, default, dontAsk, plan]`，default 的标题改为 "Manual"，并接受别名 `manual`。`bubble` 仍是内部模式。
- **判定流水线从 permissions.ts 拆出**，门面是 `decideWithToolCheckHooks`。调用链为 `hasPermissionsToUseTool (GE) → hasPermissionsToUseToolWithSink (gKe) → hasPermissionsToUseToolInner (dTr) → decideWithToolCheckHooks (aWr) → checkToolAndRulePermissions (abn)`。最后两个是我起的语义名：dTr 原来被旧版名占用为 hasPermissionsToUseTool，与门面名冲突，已改名。
- **Bash 解析器换成纯 TS 实现**，产出 tree-sitter 形状的 AST，带 64 条缓存；2.1.88 的 shell-quote 回退和 `parse-unavailable` 已删除。
- **分类器只剩 XML 两阶段**，新增严重度模式和外层重试；模型选择改为 GrowthBook 优先于 env。
- **linux 构建只用明文凭据存储**：平台安全存储恒为空，所以 `getSecureStorage` 永远返回 plainTextStorage。
- 沙箱适配层大幅扩张（Windows srt-win、凭据遮罩、tlsTerminate、可信层过滤），平台实现都在 vendor `@anthropic-ai/sandbox-runtime@0.0.81`。

## 4. 坑

- 切分在工作期间改了两次（06:59 门面切分，07:31 sole-consumer 辅助模块），modules.json 曾在我读取时被改写。因此 `merge.mjs` 每次都按当前 modules.json 和 `domainOf` 重算，不缓存模块清单。
- 旧版名与门面名在同一绑定上冲突的有 115 处。最典型的是 `dTr`：旧版名 hasPermissionsToUseTool 实际是 Inner，而门面的 hasPermissionsToUseTool 是 `GE`。凡是有门面名的，以门面名为准。
- 在 Bash heredoc 里写含 `\d` 的正则会被吃掉反斜杠，已改成 `[0-9]`。

## 5. 给 lead 的建议

格式：`声明 id → 应归属/应叫什么，证据`。各分支的完整列表见本节末尾。

### 5.1 领域映射

- `_new/exec.ts` → `utils/Shell.ts`。证据：门面导出 exec、setCwd、getShellConfig、getPsProvider，与 2.1.88 的 Shell.ts 导出一致。
- `_new/SandboxManager.ts` → `utils/sandbox/sandbox-adapter.ts`。证据：门面对象 `SandboxManager`（`chunk-fq0cr76a#Ke`）就是 2.1.88 sandbox-adapter 导出的同名对象。
- `_new/decideWithToolCheckHooks.ts` → `utils/permissions/permissions.ts`。证据：含 hasPermissionsToUseTool、checkRuleBasedPermissions、deletePermissionRule、applyPermissionRulesToPermissionContext、syncPermissionRulesFromDisk，都是 2.1.88 permissions.ts 的导出。
- `_new/INLINE_CODE_FLAGS.ts` → `types/permissions.ts`。证据：含 EXTERNAL_PERMISSION_MODES、PERMISSION_MODES，以及 decisionReason 类型表。
- `_new/extractOutputRedirections.ts` → `utils/bash/commands.ts`。证据：splitCommand、extractOutputRedirections 在 2.1.88 都在 commands.ts。
- `_new/filterToolsByDenyRules.ts` → `utils/permissions/permissions.ts` 或 `tools.ts`。
- 如果暂不改路径，至少在 `tools/segment/domains.mjs` 里把这 6 个模块映射到 permissions。

### 5.2 类型与命名错配

- `chunk-n4pvm0gt#Qsn` → 应叫 getNextPermissionMode，现在误名 EXTERNAL_PERMISSION_MODES。证据：函数体是 `switch(context.mode)` 的循环。semantic 已覆盖。
- `chunk-kswt4qha#Fwe` 不是 getNextPermissionMode，是主动性档位（proactivity level）到模式的映射。
- `chunk-dcmhvw5a#yd` 才是 toExternalPermissionMode，返回 `.external`；`chunk-tbfde207#zPs` 是 AppState 元数据更新器，应移出 PermissionMode。`yI` 和 `Qxi` 的旧版名配反了。
- `chunk-e6aww6q8#Jbr` 应叫 buildYoloSystemPrompt：它是 async，并读 `settings.autoMode`。`chunk-2a8yx6fc#jWs` 才是 buildDefaultExternalSystemPrompt。
- `chunk-e6aww6q8#Ibr` 不是 stripThinking，去掉 `<thinking>` 的是 `#GJe`。`#ESn` 解析 `<category>`，`#vSn` 才是 parseXmlReason。`#$Sn` 只是工具输入投影，`#HSn` 才是 toCompactBlock。
- `chunk-e6aww6q8#wSn` 不是 txtRequire，真正的 txtRequire 是 `chunk-e6aww6q8#ebr`。
- `chunk-aepeg2w5#_W` 不是 buildTranscriptForClassifier。`#Hy` 和 `#kxt` 是模型注册相关的代码（收集 confidential 模型 id、getHiddenModelIds），应归模型模块。

### 5.3 第三方代码误入本领域

- `chunk-r0ads4ty#dsr/csr/usr` → `@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js`。
- `chunk-fq0cr76a#od/qf/A3o/z6r/I1/on` → sandbox-runtime。
- `chunk-1ny7cxrt#vu/PO` → openid-client。
- `chunk-mrx6y2r5#sg` → @azure/core-client。

### 5.4 误归到本领域的一方代码（指纹共享、布局插值、亲和度造成）

**permissions**：

- `permissionExplainer.ts` 的 4 个声明（chunk-1ny7cxrt）是模型白名单代码。
- permissions.ts 里来自 chunk-qxvqcab6、8wvtd8sr、9tgt55am、a76knw89 的段是 Artifact、WebFetch、Monitor 工具的专属规则检查。
- `chunk-kswt4qha#uhi/jZo/WZo/fhi/tcr` 是 CLI 的 model/systemPrompt 解析。
- `chunk-pp50kewz#Rn` → utils/plugins。
- `chunk-18hwfzwa#WOt` → UI 的 auto 启动选项。
- `chunk-hgrqcyvx#nqn` → 工具决定遥测。
- `chunk-e6aww6q8#stt/eWr/mbe` → AgentTool 的可派发代理过滤。
- `chunk-e6aww6q8#hU` → hooks/toolPermission/permissionLogging。
- `chunk-sfy7bm1n#EYe`、`#wFe`、`#kJ`、`#Uar`，以及约 15 个 `getDenyRuleForAgent_*`、`supportsPersistence_*`，是共享指纹误名。

**filesystem**：

- `chunk-82kqcve8#Ei` 判的是 seed-admin 路径，`#Lp`、`#ed`、`#KJo`、`#Yc` 的旧版名都配错。
- `chunk-8t8n4kdh#ba` → MCP discover verdicts；真正的 ensureScratchpadDir 是 `chunk-82kqcve8#ywe`。
- `chunk-8wvtd8sr#qc` 不是 getScratchpadDir。
- `chunk-18hwfzwa#xgo/Mgo`、`chunk-e6aww6q8#V9t/uoe/bXn`、`chunk-s61vbvea#BVo/Yyn/_er`、`chunk-axmbhcjg#ie/Ve`、`chunk-0h4e7gnq#Yd`、`chunk-aat7wt0p#Gft`、`chunk-a477qqne#n2t`、`chunk-xr4xc2mq#sLe` → 分别归 memdir、worktree、plans、settings。
- `chunk-e6aww6q8#QEo` → `utils/plugins/walkPluginMarkdown.ts`。
- `chunk-fq0cr76a#Ide` 的参数含义错位：第二个参数是 cwd。

**yoloClassifier**：

- `buildTranscriptEntries`、`combineUsage`、`parseXmlBlock` 的共享匹配基本都是误配：
  - `chunk-0sfjpx19#Ht/uo/Gi`、`chunk-9h8dr0qb#ao` → 成本统计与消息工具；
  - `chunk-aqdf5t3e#_Dr/qt/zt`、`chunk-18hwfzwa#rx/Yqo`、`chunk-psktkvhp#H/I`、`chunk-tyg7f3ek#rF/xV`、`chunk-ha3km179#dd`、`chunk-r7bynxfq#c`、`chunk-s61vbvea#fqr` → 消息工具；
  - `chunk-aepeg2w5#gC…mC`（14 个）→ “决定性人类回合”判定，建议单独成模块。
- `chunk-e6aww6q8#vUr/EUr/ast` → 决策原因分析标签。

**bash**：

- commands.ts 中的 `generatePlaceholders_*`、`co`、`d_s`、`ja`，bashPipeCommand.ts 中的 `je`、`Qi`，shellQuote.ts 中的 `b`/`y`/`Ede`（lodash isSymbol）和 `It` → 都是无关代码，应移出。
- `chunk-whwptcwy#te/re/z/se` → tools/BashTool 的 served shell line 和敏感路径辅助。
- treeSitterAnalysis.ts 中的 `chunk-8wvtd8sr#hGe`、`chunk-wj577vf9#oe` 判断的是 list 动作，应移出。
- `chunk-a477qqne#je/fe/vn` → 文件读取结果的编解码。
- `chunk-m41h77x8#Qi` → 通用的 repeat。
- `chunk-aqdf5t3e#co` → frameLive 相关。
- `chunk-hm0ce8vc#ja` → runner/git。

**shell/sandbox/secureStorage**：

- readOnlyCommandValidation 中约 40 个 `ghIsDangerousCallback_N` 是共享指纹误配，实际是 git remote 解析、repo facts（`chunk-2a8yx6fc#Ir/Hr/En`）、主机名遮蔽、gh 端点校验。
- `chunk-7r5y3c3p#Hhe` → utils/file。
- `chunk-qchp9vrd#us/Lc` → 插件评测的模拟应答。
- `chunk-e6aww6q8#gIn` → config。
- `chunk-e6aww6q8#tRs` → commandSemantics。
- `chunk-e6aww6q8#kRr/bRr/wRr` → PowerShell 遥测分类。
- `chunk-v9tcvh08#k…u_r` → API 提供者端点。
- `chunk-6vnxsn99#we/rn` → gitDiff。
- `chunk-82kqcve8#Jl/of` → plans。
- `chunk-4r745zza#A` → 3P 默认模型探测。
- `chunk-x58vpmpd#se` → deviceKeyStore。
- `chunk-fq0cr76a#oce` → 沙箱依赖探测（bwrap 试跑）。
- `chunk-b29hdd5e#SRi` 不是 doReadAsync。
- `chunk-sycgf9xs#ee` 是 killProcessGroup。
- `chunk-vkh471k3#H8e` → 外部命令调用。

### 5.5 未归属但应并入本领域

- `_unattributed/chunk-82kqcve8/part-023…046`：
  - `Xp/SJ/nYt/qp/Wst/$At/Sc/b_/oYt/Zc/Zp/En/Ui/mvn/dYe/j9r/gd` → filesystem.ts。
- `_unattributed/chunk-e6aww6q8/part-399`：
  - `MSn/PJe/Cwr/LJe/Rwr/PSn` → yoloClassifier.ts。
- `chunk-e6aww6q8/part-276`：
  - `Kkn`（findApplicableAllowRule）→ permissions.ts。
- `chunk-38axkkfw/part-001…006`、`chunk-r01896cg/part-001…006`：
  - `rU/Te/kwe/_vn/At/we/ee/D/Tar` → utils/bash/ast.ts。
- `chunk-r01896cg#St/En/$t/Tt/re/ke/lt/Re/Ie/Nn/Fe/vn/Cn/Bt` → 应归 ast.ts，而不是 bashParser.ts。07:31 已有一部分进了 `utils/bash/_new/checkDeclarationOptions`。
- `chunk-k5vy5m8c` part-001（`S_`、`Be`、缓存常量）→ bashParser.ts。

### 5.6 工具

- `naming/docs-*.jsonl` 会被 rename 加载器扫到（dom-agents 已报告）。本领域的 docs 文件只有 `{id, doc}` 字段，加载器需要跳过它。

## 6. 未完成

- 07:31 新切出的 `utils/bash/_new/checkDeclarationOptions` 等 4 个辅助模块：模块说明已写，其中 13 个声明还没有逐条说明。
- `chunk-fq0cr76a#Q0`（约 50KB 的沙箱配置换算）只命名了少数局部变量。
- 未解之处的声明 id 列在手册第 15 节。
