# build 模式的请求组件化与内容改写设计

本文描述 `claude request --build` 在 Claude Code 2.1.304 / contract v2 下的实现契约（以代码为准，版本见 [`cli-mods/README.md`](../companions/cli-mods/README.md) 的版本表）：Worker 如何把客户端 Messages body 装进组件信封，CLI 如何把组件还原成 CC 内部记录、按策略替换或擦除、再用 CC 原生构造器产出最终 body。direct 的计费头处理在第 6.3 节。

这是**代码契约说明**，不是发布或部署验收记录。各层注入（身份行、环境、提示词、工具）以 [注入等级设计](../../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md) 第 6、7、8、12 节为准，本文只写组件与内容改写；请求头的去向见 [REQUEST-HEADERS](../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md)。附件类型的完整清点见 [BUILD-ATTACHMENT-TRANSFORM-DESIGN.md](BUILD-ATTACHMENT-TRANSFORM-DESIGN.md)——那是 2.1.302 时期 Worker 侧 v1 改写的研究记录，v1 路径已于 2026-10-24 删除（CONTRACTS §53.21）。

## 结论

- build 模式**不重新实现协议**。最终 body 由 CC 自己的请求构造器（`jOt` → `qmn` → `PAs`）产出，Worker 与 CLI 只提供组件和精确的文本改写。（`jOt`、`aBe` 是 2.1.304 bundle 里的名字；较早的文档与审核报告按旧源码写作 `Kvt`、`MDe`，指同一函数。）
- 只有一条路径：Worker 把客户端的块原样放进信封（只把 custom 工具的 `input_schema` 原位改名为 `inputSchema`），改写全部在 CLI 里、在保留原始 wire 记录的前提下进行。CLI 未声明 `build_content_preservation_v1` 时 Worker 直接 409。
- 内容改写**只作用于已识别的环境行与计费行**。环境段里未识别格式、代码围栏内、歧义和重复的内容一律不改，并留诊断；`erase` 也只删除识别出的、受支持的条目。
- 环境字段的来源有三种：`client`（原样）、`worker`（用 CLI 自己的原生环境渲染）、`erase`（删除）；只在注入等级「低」及以上下发（CONTRACTS §53.18）。
- build 的请求总带计费头：客户端没有就补 CLI 原生的整行，缺字段就补原生值；`client`（默认）保留客户端已有的值，`worker` 换成原生值。选 `worker` 时**要么用原生值，要么拒绝**：计费头无法安全改写（多个头、重复字段、格式不对）时 400；原生计费值拿不到时 503。
- 原生环境拿不到时同样**拒绝请求（503）**，不使用猜测值。
- 身份行（OAuth）由 CLI 按计费头的入口**自适应**补，不可配置：带计费头的 CC 请求不补，没有计费头的请求缺身份行时补一句（第 6.1 节）。API Key 账号不补。
- 身份（`metadata.user_id`）不属于内容策略，也不可配置：build 有就按账号密钥映射（`replace`），没有就给账号自己的身份（2026-10-25 起，第 7 节）；direct 原样转发 body，但 Worker 仍把客户端会话交给 CLI，让会话头与 body 一致（第 7 节）。
- direct 只处理开头的计费头（等级 0）：缺头或缺字段时补原生值，按计费来源换字段，**不补身份行**，字符串 system 改成块数组，其余字节原样转发（第 6.3 节）。

## 1. 总体链路

```text
客户端 Messages body
      │ ① Worker：装进组件信封（messagesBuildComponents）
      ▼
components JSON ──stdin──▶ claude request --build
      │ ② CLI：组件 → CC 内部记录（prepareBuildInput）
      │ ③ CLI：内容策略替换/擦除（applyContentPolicy）
      │ ④ CLI：非 CC 请求按等级注入各层（injectLayers，探针构建）
      │ ⑤ CLI：原生构造器产出 body（jOt），身份行由原生 PAs 放置（recordedCliPrefix，OAuth），计费合并（mergeBillingAttribution）
      │ ⑥ CLI：身份 metadata（applyBuildMetadata）
      ▼
最终 body ──▶ CC 自己的 SDK（client.beta.messages.create）──▶ POST /v1/messages?beta=true ──▶ 上游
```

一次客户端请求仍然只触发一次模型生成：CLI 以 `maxRetries: 0` 发送，工具调用交回客户端。注入层需要的探针构建只在 CLI 进程内产出 body，不发送。

## 2. Worker 侧：body → 组件信封

入口 `messagesBuildComponents`（engine），Worker 的请求命令在 build 下调用它（`request_command.go` `prepareInput`）。

先做两道校验：`validateBuildNumbers`（数值字段范围）与 `validateBuildContent`（内容结构）。然后按固定映射装填：

| 原 body 字段 | 去向 | 缺省时 |
|---|---|---|
| `model` | `model` | 必须是非空字符串，否则 400 |
| `system` | `systemPrompt`（字节原样） | 不写这个键（CLI 视为没有 system）；显式 `null` 400 |
| `messages` | `messages`（字节原样） | 必须是非空数组，否则 400 |
| `tools` | `tools`（每个工具的键序原样，custom 工具只把 `input_schema` 原位改名） | 不写这个键（与空数组不同） |
| `stream` | `stream` | 不写这个键（CLI 也不发） |
| 其余全部 | `parameters` | — |

另外总写 `attachments: []`、`requestPolicy`（`features.CLIPolicy`，见 2.2）和 `runtimeContext`（`workingDirectory` 为 Worker 的工作目录，`additionalWorkingDirectories` 为空）。

约束：

- **system 只接受** string 或 `text` 块，块内只允许 `type` / `text` / `cache_control`；其他字段直接 400。build 表达不了非文本 system 块。
- **`tools` 缺失与空数组不同**：缺失时信封里没有 `tools` 键，CLI 也就不发。
- custom 工具必须有对象形 `input_schema`，同时带 `inputSchema` 拒绝；非 custom 工具原样传入。
- **缺省不填充**（审核 C10 已修）：客户端没发 `stream` 时信封里没有 `stream`，出口 body 也没有（`request_components.go`、`request-input.js` `prepareBuildInput`）。`system` 缺省为空：build 总带计费头，最终 system 一定是块数组，影响只在形状。
- `parameters` 内若再次出现 `model`/`system`/`messages`/`tools`/`stream`，或 `requestPolicy`/`runtimeContext`/`ccgateway*` 前缀，CLI 拒绝（`validateBuildParameters`），防止绕过组件。

### 2.1 Worker 的能力门

Worker 在读 body 之前按 CLI 的 `--ccgateway-info` 能力检查（`requestCapabilityGates` / `checkCapabilities`，build 与 direct 共用一张表，与核心预检 `requestPolicyCapabilities` 对应），任一不满足 409 `configuration_error`：

| 条件 | 需要 CLI 能力 |
|---|---|
| 模式与容器自己的模式不同（或 CLI 版本已知） | `request_build` / `request_direct` |
| 任何 build 请求 | `build_content_preservation_v1` |
| 请求带核心的策略头（两种模式） | `request_levels_v1` |
| build：附件来源用了 `worker`/`erase` 或 v2 才有的字段 | `build_attachment_sources_v2` |
| build：计费来源有 `worker` | `build_billing_sources_v1` |
| build：下发了服务端入口 `build_billing_entrypoint` | `build_identity_line_v1` |
| build：下发了 `build_injection` | `build_injection_v1` |
| direct：下发了服务端入口或计费来源 | `direct_billing_v1` |

（`request_levels_v1` 一行是审核 C11 补上的 build 缺口；此前 Worker 只在 direct 带计费来源时检查它。）

### 2.2 两个版本号不要混用

| 字段 | 值 | 层 | 含义 |
|---|---|---|---|
| `schema_version` | 1 | 核心存储的请求策略与核心→Worker 线形 `WorkerPolicy`（`contracts/features/catalog.go` `PolicySchemaVersion`） | 配置格式；前端、核心按它读写 |
| `contract_version` | 2 | Worker → CLI 的 build 信封 `requestPolicy`（`features.CLIPolicy`，`contracts/features/wire.go`） | CLI 组件契约；CLI 只接受 2 |

Worker 写的 `requestPolicy` 只有 `contract_version`、`build_attachment_sources`、`build_billing_sources`、`build_billing_entrypoint`、`build_injection`（`WorkerPolicy.CLI()`，注入项只留为 true 的）。CLI 的 `validateRequestPolicy`（`cli-mods/request-policy.js`）还接受旧 Worker 可能带来的 `build_identity_lines`，校验后不使用；其他键拒绝。两者独立演进：改配置格式不改 `contract_version`，反之亦然。

### 2.3 已删除的 v1 路径

2026-10-24 之前，CLI 不声明 `build_content_preservation_v1` 时 Worker 走 v1：自己切出 `<system-reminder>` 片段和 `role:"system"` 消息、改成附件引用，并用本机事实改写环境段。v1 已随 native 清理删除（审核 C1/C5，CONTRACTS §53.21），代码只能从 git 历史查看。CLI 侧仍保留解析附件引用的代码（第 3 节），Worker 不再使用。

## 3. 组件契约（wire format）

CLI 侧 `prepareBuildInput`（`cli-mods/request-input.js`）是唯一解析点。

允许的顶层键：`model`、`systemPrompt`、`messages`、`attachments`、`tools`、`parameters`、`stream`（另有 Worker 写的 `requestPolicy`、`runtimeContext`，由 `buildRequest` 先取出）。未知键直接拒绝——生成选项必须进 `parameters`。`stream` 若存在必须是布尔值。

`attachments` 有两种定位方式（Worker 现在总发空数组，下表是 CLI 仍接受的形式）：

| 形式 | 含义 |
|---|---|
| `{id, kind: "system", message}` | 被 `{"attachment": id}` 引用，展开成 system 消息 |
| `{id, kind: "reminder", block}` | 被 `ccgateway_attachment` 引用，包成 `hook_additional_context` |
| `{afterMessage, role, text \| attachment}` | 按消息下标插入，无需引用 |

引用必须恰好使用一次：缺失、重复或 `kind` 不符都拒绝；未被引用的附件也拒绝。

## 4. CLI 侧：组件 → CC 内部记录

`prepareBuildInput` 逐条转换：

| 组件 | 内部记录 |
|---|---|
| `systemPrompt` | `systemBlocks`（text 块） |
| `messages[].role === "system"` | `api_system`：content 拼成字符串，原文留在 `ccgatewayWireSystem` |
| `messages[].role === "assistant"` | `assistant`：补 `id`/`type`/`usage` 骨架，原文留在 `ccgatewayWireMessage` |
| `messages[].role === "user"` | `user`，原文留在 `ccgatewayWireMessage` |
| `attachments` | 展开为上述引用或按 `afterMessage` 插入 |

`ccgatewayWireMessage` / `ccgatewayWireSystem` 是**字节保真的关键**：后续策略改写的是原始 wire 形态，而不是 CC 渲染后的形态。

两条硬校验：

1. **原生渲染必须等价**——`ccgateway_attachment` / `ccgateway_text` 展开时调用 CC 原生渲染器 `aBe`，渲染结果与原文必须逐字节一致，否则报错：

   ```js
   if (text !== item.block.text) fail('native rendered reminder snapshot changed unexpectedly');
   ```

2. **工具配对完整**——`tool_use` / `tool_result` 必须成对、顺序正确、id 唯一，缺失或多出都拒绝。

## 5. 内容策略：识别 → 决策 → 写回

`applyContentPolicy`（`cli-mods/content-policy.js`）。

### 5.1 可配置字段与来源

| 段 | 字段 | 允许来源 | 何时下发 |
|---|---|---|---|
| `build_attachment_sources` | `platform_name`、`os_version`、`shell`、`primary_directory`、`additional_directories`、`git_repository`、`worktree`、`scratchpad_directory`、`github_cli`、`agent_proxy` | `client` / `worker` / `erase` | 等级低、高 |
| `build_billing_sources` | `cc_version`、`cc_entrypoint` | `client` / `worker` | 所有等级（含 direct） |

缺省或 `client` 表示保留客户端内容，且核心不下发 `client` 项（线形稀疏）；计费头缺少的部分 build 总会补上（5.5）。

### 5.2 识别：只认精确格式

`environmentRegions`（`content-policy.js`）：

1. 逐行扫描并跟踪代码围栏（`fenceAfter`）；**围栏内一律不识别**，避免改写示例或被引用的内容。
2. 定位 `# Environment` / `# Environment update` 标题；普通段还要求下一行是原生引导语。
3. 段落延续到下一个标题或 reminder 标签（`KF` / `lKe`）。
4. `identify` 按精确前缀匹配十个字段；`github_cli` 与 `agent_proxy` 用整段正则全匹配。

**不认识就不改**：

| 情况 | 处理 |
|---|---|
| 看起来像但格式不符（`suspectedField`） | 标记 `unsupported_format`，跳过 |
| 同一字段出现两次 | 标记 `ambiguous`，跳过 |
| 围栏内的疑似字段 | 标记 `ambiguous`，跳过 |
| `# Environment update` 中的增量行，但没有基线 | 标记 `missing_baseline`，跳过 |

上述跳过同样适用于 `erase`：只有识别出的受支持条目会被删除，其余文字保留。

### 5.3 `worker` 来源 = CLI 自己的原生渲染

这一点容易误解：Worker **不把值传给 CLI**。CLI 调用原生环境读取器（`cli-mods/native-environment-2.1.304.inc.js` 的 `ccgatewayEnvironment`），用 CC 自己的渲染函数 `zkt` 生成一份完整环境文本，再解析回字段：

```js
const snapshot = await native.readEnvironment?.(neededFields);
const regions = environmentRegions(text, 'native');
if (regions.length !== 1 || regions[0].update || regions[0].blocked.size || …) throw Error('Invalid native environment');
```

校验要求：恰好一段、不是 update 段、没有 blocked 字段、且包含 `platform_name`。任一不满足即 503。

`runtimeContext` 同样受限（`request-policy.js` `runtimeContext`）：`workingDirectory` 必须是绝对路径，且**必须等于 CLI 的启动目录**，否则拒绝——防止在临时 cwd 上声明环境事实。Worker 在 build 下以自己的工作目录启动 CLI，所以两者一致。

### 5.4 写回与清理

`splice`（`content-policy.js`）按 `start` 降序替换，避免偏移错乱；换行风格跟随原文（`\r\n` vs `\n`）。

清理规则：

| 条件 | 动作 |
|---|---|
| 环境段内所有受管行都被删除 | 连同 `# Environment` 标题整段删除 |
| user 消息中 `<system-reminder>` 内文全部删除 | 连同 wrapper 删除 |
| 整个 text 槽变空且原本非空 | 移除该槽 |
| 消息 content 变成空数组 | 删除该消息；但要求没有其他生命周期字段，否则报错 |

保留规则：未知/固定指令行只要还在，标题与 wrapper 就保留。

### 5.5 计费归属

`mergeBillingAttribution`（`content-policy.js`）。**计费头**指 system text 块中以 `x-anthropic-billing-header:` 开头、且不在代码围栏内的行；出现在句中、缩进引用或围栏里的同名文字是客户端内容，不算计费头，也不改。原生值是 CLI 本次构建时原生 `PAs` 生成的整行（补丁经 `ccgatewayCaptureBilling` 取得）：`cc_version=2.1.304.<指纹>; cc_entrypoint=<请求入口>;`，OAuth 另有 `cch`，主线程另有 `cc_prompt_id`、`cc_turn_origin`、`cc_prompt_index`、`cc_turn_index`（第 6 节）。请求入口按 [REQUEST-HEADERS](../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md)「请求入口」一节决定；下发了服务端入口 `build_billing_entrypoint`（`cli`、`sdk-cli`、`sdk-ts`、`sdk-py`、`claude-desktop`、`claude-vscode` 六选一；默认 `sdk-cli` 不下发）时，补齐和 `worker` 写入的 `cc_entrypoint` 是它。

两个字段的来源：`client`（默认，界面写作“客户端，没有用服务端”）保留客户端的值，客户端没有时用原生值；`worker`（“服务端”）总用原生值。

| 情况 | 行为 |
|---|---|
| 没有计费头（包括只在引用或围栏里出现），或计费头不在首块开头 | 在 system 首部插入原生整行；不在首块的客户端头原样留下（上游只读首块开头的头，两个头上游接受） |
| 恰好一个计费头且格式合法 | 选 `worker` 的字段换成原生值；缺的字段追加原生值；未知字段与客户端已有的 `client` 字段原样保留（只对首块开头的头） |
| 多个计费头（同一块或跨块）/ 同一行重复出现头部 / 字段重复 / 字段格式不合法 | 有字段选 `worker`：**400 拒绝**；全是 `client`：原样放行。都记诊断 `ambiguous` |
| 原生值不可用 | 有字段选 `worker`：503（CLI 以 `source: internal` 报告，网关换账号重试）；全是 `client`：原样放行，记 `source_unavailable` |

客户端头带 `cc_prompt_id` 且 OAuth 映射了 prompt ID 时，首块头的 `cc_prompt_id` 改成映射值，与 prompt-id 请求头一致（`setLeadingBillingField`，见 [SUBAGENT-REQUEST-CONTEXT-DESIGN](SUBAGENT-REQUEST-CONTEXT-DESIGN.md)）。

为什么总要补（2026-10-21 实测）：上游要求计费头同时含 `cc_version` 与 `cc_entrypoint`，缺任一个都返回 400 `x-anthropic-billing-header is a reserved keyword and may not be used in the system prompt.`，`cch` 可有可无；OAuth 的 Sonnet/Opus 请求首块没有计费头也没有身份行时返回 429。

计费头不在首块（2026-10-22，30 号实测，Opus/Sonnet 相同）：上游只检查首块的计费头，放在后面的头缺字段或指纹不对都是 200，首尾两个头也是 200；`[提示, 计费头]` 没有开头行仍是 429。现在这种请求发出 `[原生计费头, 提示, 客户端计费头]`：客户端在任意位置带了计费头就算 CC 请求，不补身份行（第 6.1 节）。

### 5.6 识别用的文字全部取自原生 CC

`content-policy.js` 里没有 CC 的措辞，只导出 `createContentPolicy(vocabulary)`。词表由 `request-build.js` 在运行时从打过补丁的 CLI 取得：

| 词表项 | 原生来源（2.1.304） |
|---|---|
| 标题、引导语、update 标题、worktree / stash 句 | 环境模块常量 `PNe`、`ooo`、`roo`、`jkt`、`Ukt` |
| 六个字段的行首标签、`(was …)`、additional 变更行、五个撤回句 | 用原生 `_oo`（完整段）与 `Kkt`（update 段）渲染带标记的快照，再把标记切掉 |
| scratchpad 前后缀 | 原生 `Gkt` 渲染标记路径 |
| `github_cli` 全部句子 | 原生 `iys` + `ANe` 遍历 16 种输入组合（12 句不同文本），外加 `aoo` |
| `agent_proxy` 的固定片段 | 原生 `xNe` 多种输入渲染后取公共部分 |
| 计费头 | `oJe`（chunk-7y2kvacy.js） |
| reminder 标签 | `KF` / `lKe`（chunk-jkcb7qdd.js） |

取词函数 `ccgatewayEnvironmentVocabulary` 在 `native-environment-2.1.304.inc.js`，与原生环境模块同作用域。`compile` 校验词表完整，缺任何一项启动 build 时报错。`test/native-vocabulary.test.mjs` 在恢复的 2.1.304 源码上执行这些原生函数，与 `test/fixtures/native-vocabulary-2.1.304.json` 比较（`CCG_UPDATE_CONTRACT_FIXTURES=1` 重新生成）；其余测试读这份 fixture。注入层检测用的文字（附件开头、安全段 `p4n`、循环请求头名）另由 `ccgatewayLayerVocabulary()` 取得，夹具 `test/fixtures/native-layers-2.1.304.json`。

仍不是从 CLI 取的只有两处：`metadata.user_id` 的扁平载体 `user_<device>_account_<uuid>_session_<sid>`（旧版客户端格式，2.1.304 里已不存在，只为保留客户端原载体）；以及 5.5 的上游首块规则（实测结论，CLI 里没有对应代码）。

## 6. 原生构造器与最终 body

`buildRequest`（`cli-mods/request-build.js`）流程：

1. 校验 `parameters`、`requestPolicy`、`runtimeContext`；`prepareBuildInput(external, aBe, {preserveContent: true})` 得到 `initial`，供策略读取。
2. 算出请求入口（`requestEntrypoint`）并调原生 `setEntrypointOnRequests`，原生计费头与 UA 读同一个值。
3. `applyContentPolicy` 改写 system 与 messages；用改写结果**再跑一次** `prepareBuildInput`，得到最终 `input`。
4. 计算指纹用的消息（`fingerprintMessages`，6.2）；按客户端的计费头与首条提示解析请求类别（`resolveAgent`，见 SUBAGENT-REQUEST-CONTEXT-DESIGN）；主线程由 `markPrompt`（原生 `iws`/`h0n`，经 `ccgatewayMarkTurns`）给提示记录写 turn 与 prompt ID，原生 `PAs` 据此写出完整的主线程计费头。
5. 每个客户端工具做成一个 CC 工具（`native-tools.js` `requestTool`，带 `ccgatewayRequestDefinition` = 客户端原定义），CC 自己的权限、延迟加载、工具搜索策略照常看到它；补丁让原生 `FH` 对这些工具直接返回客户端定义（v26 起，原生 `FH` 会给客户端工具加 `strict` 等字段、改键序），body 的 `tools` 写客户端原定义（`ccgatewayWireTools`），CC 自己的工具仍走原生 `FH`。
6. **没有计费头的请求**按下发的 `build_injection` 注入各层（`injectLayers`：一次原生探针构建取提示词块、工具定义、附件位置与所需 beta；客户端已有的层不重复补）。规则见 [注入等级设计](../../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md) 第 7、12、13 节。有计费头的请求只做第 5 节的转换。
7. `jOt({…})` 是 CC 原生请求构造器，负责模型名归一化、thinking、`tool_choice`、`metadata`、缓存标记。补丁注入的 `ccgateway_request` 事件携带它产出的 body。
8. `mergeAdditionalParameters`（`request-parameters.js`）把构造器**不拥有**的参数并回：除 `max_tokens`、`thinking`、`tool_choice`、`metadata`、`temperature`、`betas`、`output_config` 与组件键以外，客户端 `parameters` 里的字段（如 `top_p`、`top_k`、`stop_sequences`、`service_tier`）原样写入最终 body；`output_config` 只并回 `effort`/`format` 以外的子键；`diagnostics` 只在客户端自己发了时才发。
9. 注入了提示词时按上游 4 个缓存断点的上限去掉注入块上的原生标记（`limitBreakpoints`）；`mergeBillingAttribution` 处理计费行（5.5）；beta 取客户端 ∪ 构造器 ∪ 注入层所需，写入请求头并从 body 删除 `betas`：客户端的保持客户端顺序，新增的按原生顺序插入（`request-betas.js` `betaOrder` 与 `request-headers.js` `finalBetas`，v25；见 [REQUEST-HEADERS](../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md)）。
10. `request-command.js` 经 `model-request.js` 发送：build 用原生 `client.beta.messages.create`（请求行 `POST /v1/messages?beta=true`，超时取 Claude Code 默认 600 秒与 Worker 期限的较小者、`maxRetries: 0`，v26）。

设计意图写在注释里：

```js
// Native model rules own generation parameters; never overlay the input
// body onto their result (in particular thinking and tool_choice).
```

生成参数由 CC 自己的模型规则决定，组件只补充它不管的部分。

身份行（6.1）在构造时由原生放置；`request-command.js` 在 build 之后只处理身份 metadata（`applyBuildMetadata`，第 7 节）——build 会自行生成 `metadata`，必须按客户端原有的决定覆盖。

### 6.1 Claude Code 身份行（OAuth，build）

原生 CC 的 system 总是 `[计费头, 身份行, ...提示]`（2.1.304 `PAs`；身份行由 `n1n` 从三句里选：交互式 `You are Claude Code, Anthropic's official CLI for Claude.`（`official_cli`）、非交互且有追加提示的 `..., running within the Claude Agent SDK.`（`official_cli_sdk`）、非交互的 `You are a Claude agent, built on Anthropic's Claude Agent SDK.`（`agent_sdk`））。build 保留客户端 system，原生身份行不会自动出现。

上游规则（2026-10-21 用 Max、Pro 账号实测）：OAuth 请求的**第一个 system 块**必须是计费头，或是上面三句之一（整块完全相等）；否则 Sonnet/Opus 返回 429 `rate_limit_error`、消息 `Error`，Haiku 不受影响。计费头在首块时身份行在哪都行，没有也行（2026-10-22 在 30 号复测）。build 总带计费头，所以补身份行是为了像入口所代表的客户端，不是上游的要求。

**选哪一句：自适应，不可配置**（2026-10-23 用户决定，注入等级设计第 8 节决定 4、第 12 节）。`buildRequest` 按最终计费头的入口（`billingEntrypoint`）调 `identityLineFor`（`request-policy.js`）：

| 入口 | 补的句子 |
|---|---|
| `cli` | `official_cli` |
| `sdk-cli`、`sdk-ts`、`sdk-py` | `agent_sdk`；注入了内置提示词且客户端 system 非空（成为追加提示词）时 `official_cli_sdk` |
| `claude-desktop`、`claude-vscode`（`claude-desktop-3p` 按 `claude-desktop`） | `official_cli_sdk` |
| 其他入口、或拿不到入口 | 按下发的服务端入口那一行（默认 `sdk-cli`） |

核心不再下发 `build_identity_lines`（CONTRACTS §53.18）；旧 Worker 带来的这个键 CLI 接受但不使用。

OAuth 的 build 请求（没有 `ANTHROPIC_API_KEY`）走原生路径（v26 起，`request-build.js` `identityRequest`/`applyIdentityLine`）：选好的句子通过查询选项 `recordedCliPrefix` 交给原生，`n1n` 返回它、`PAs` 把它放在原生放身份行的位置（`[计费头, 身份行, ...提示]`），补丁在 `PAs` 里经 `ccgatewayCapturePrefix` 取回原生渲染出的那一行，再写进最终 body。句子文本只由 `n1n` 按三组输入渲染（`isNonInteractive`、`hasAppendSystemPrompt`），不保存副本；判断用 CLI 的 `t1n`（认的就是 `n1n` 的三句）与 `B1s`（首块是不是计费头）。下表第 2 行「首块既不是计费头也不是身份行」是原生没有的情形，由我们在最前补该入口的句子（v26 只保留这一处自写逻辑）。

| 请求 | system | 处理 |
|---|---|---|
| 带计费头（客户端任意位置有计费头行，即 CC 请求） | 首块是计费头 | 不补（CC 自己的辅助请求本来就没有身份行） |
| 同上 | 首块既不是计费头也不是身份行（只在拿不到原生计费头、计费来源全是 `client` 时出现） | 在最前插入该入口的句子，否则上游 429 |
| 不带计费头 | 首块是计费头（build 补上的）、任一块已是三句之一 | 不改（客户端的身份行不替换） |
| 同上 | 首块是计费头、没有身份行 | 在计费头后插入上表的句子 |
| 同上 | 首块不是计费头 | 在最前插入上表的句子 |

API Key 账号不插入。结果：非 CC 请求是 `[原生计费头, 身份行, ...客户端 system]`（高注入另见注入等级设计第 7 节），与原生 CC 相同；CC 请求保持客户端自己的身份行（有就有，没有就没有）。

### 6.2 计费头里的指纹

`cc_version` 末尾三位是指纹：CC 取第一条非 meta 用户记录的文本（字符串内容或第一个 text 块）的第 4、7、20 个字符，加盐和版本做 sha256（`RIs` → `aW` + `Eg`，chunk-2gh4h0fv.js）。原生 CC 算指纹时 reminder 还是独立的 meta 记录，取到的是用户真正输入的文字；它们并进同一条 wire 消息、排在前面，是之后的事。

build 把客户端的 wire 消息还原成记录时，reminder 已经是第一个 text 块。`fingerprintMessages`（`request-input.js`）取第一条用户消息中第一个不以 reminder 标签开头的 text 块，补丁把 `qmn` 里的 `RIs(Aa)` 换成对它求值（只在 build 下）；direct 用同一取法喂给 `PAs`。用官方 `claude -p` 抓到的请求验证：新取法算出 `b17`，与它自带的 `cc_version=2.1.304.b17` 相同；旧取法得 `159`（`test/billing-fingerprint-oracle.test.mjs`）。

### 6.3 direct 的计费头（等级 0）

direct 不经原生构造器。Worker 在 CLI 声明 `direct_billing_v1` 时总给出 `CCG_DIRECT_POLICY`（`{build_billing_entrypoint?, build_billing_sources?}`，可以是 `{}`）；CLI 由 `direct-billing.js` `applyDirectBilling` 处理，原生整行由 `PAs` 生成（与 build 同一个函数，带指纹、主线程的 prompt ID 与 turn）：

- 请求入口同样按请求设置（`setEntrypointOnRequests`）。
- 首块开头是计费头：按 `build_billing_sources` 换成原生值，缺的字段补原生值；没有、或不在首块开头：在最前插原生整行。
- 字符串 system 改成块数组（官方 CC 一律发块数组）：开头的计费头行单独一块，其余一块。
- **不补身份行**（2026-10-23 起；旧 Worker 带来的身份行配置接受但不使用）。
- 只在原始 JSON 文本上拼接新增的块或改写的那一个字符串，body 其余字节不变；没有 `CCG_DIRECT_POLICY`（手动运行）时原样转发。

Worker 的 direct 能力门见 2.1 节。direct 下 Worker 仍解析 body（必须是 JSON 对象、`model` 非空；有请求上下文能力时还解析 `metadata.user_id` 与 agent 头），所以 direct 不是"Worker 不看 body"的纯透传（审核 C9）。

## 7. 身份边界

`metadata.user_id` 不可配置（2026-10-21 用户决定）：核心不下发 `request_identity_sources`（早先保存的值也不下发）；Worker 以 `features.RequestIdentityDefault`（`replace`）处理。映射只在 CLI 声明 `request_identity_v1` 时启用（`configureRequestIdentity`）；不声明时 Worker 不设 `CCG_REQUEST_IDENTITY`，CLI 的 `applyBuildMetadata` 没有上下文就保留原生构造器生成的 metadata（Worker 里"不支持时按 `client`"的分支因此到不了；在 `request_command.go` `resolveRequestContext`）。界面没有身份卡片，只在请求模式下写一行说明。

- **只经环境变量传递**：Worker 把解析结果写入 `CCG_REQUEST_IDENTITY`（`{version:2, mode, rewrite, session_id?, device_id?, parent_session_id?, carrier?}`），不进 build 信封。
  - **build**：Worker 启用了身份映射（CLI 声明 `request_identity_v1`）时总设置，CLI 据此决定最终 metadata。
  - **direct**：CLI 声明 `request_agent_context_v1` 且映射已启用时，Worker 以 `client` 模式解析客户端 metadata，**取到会话 ID 才设置**，只为让 CLI 采用客户端的会话（会话头与 body 里原样转发的 metadata 一致）；body 不改。
- **是否改写只由 Worker 的 `rewrite` 决定**（`applyBuildMetadata`）。客户端没发身份、或身份里没有可映射字段（只有未知字段、已知字段全为空或 null）时 `rewrite=false`，保留客户端原值及其载体（对象 / JSON 字符串 / 扁平字符串）。
- **没有身份的请求给账号自己的身份**（2026-10-25 用户决定，CLI v27；此前不加，而官方 CC 的每个请求都带 `metadata.user_id`）：客户端没发 `metadata.user_id`（没有 metadata、没有这个键、或值为 null/空串）且映射可用（OAuth 账号、有映射密钥）时，Worker 给出 `rewrite: true`、`carrier: json` 与会话（`generatedRequestIdentity`），CLI 写入 `{device_id, account_uuid, session_id}`：device 与 account 是该账号 CLI 自己的值，会话由对话的第一条消息按账号密钥映射，同一对话的后续轮次不变、会话头与之一致；客户端 metadata 里的其他键保留。两个以同一条消息开头的对话会共用会话。API Key 账号、拿不到映射密钥的登录仍不加；direct 原样转发，不加。
- **账号类型**（`resolveRequestIdentity`）：API Key 账号 `replace` 按 `client` 处理；OAuth 账号读不到邮箱时 `replace` 退为 `worker`。
- **会话头一致**：Worker 给出 `session_id` 时 CLI 以它作为根会话（`requestSessionID`），传输头与 metadata 一致。
- 账号测试（`/v1/ccgateway/probe`）是网关自己的请求：固定走 build、不带请求上下文，身份按同样规则处理。

## 8. 失败与拒绝语义

| 情况 | 结果 |
|---|---|
| system 块含非文本字段、`system: null` | 400 |
| `parameters` 覆盖组件字段或保留键 | 400 |
| 附件引用缺失/重复/kind 不符 | 拒绝 |
| 原生渲染与原文不一致 | 拒绝 |
| 工具配对不完整 | 拒绝 |
| `runtimeContext` 与启动目录不一致 | 拒绝 |
| 原生环境不可用 | 503 |
| 计费选 `worker` 但计费头无法安全改写 | 400（全是 `client` 时原样放行） |
| 原生计费值不可用 | 503（换账号重试） |
| 注入了 CLI 没有的工具 | 400，列出 CLI 有的工具 |
| 能力不匹配 | Worker 409（2.1 节）；核心预检失败为核心自己的 503（第 10 节） |

Worker 自己的拒绝带 `X-CCGateway-Error-Source: gateway` 与 `X-CCGateway-Error-Reason`；CLI 的失败以 stderr 错误帧交回，来源为 `input`/`transport`/`timeout`/`interrupted`/`internal` 或上游原样的 `http`（CONTRACTS §53.20）。

## 9. 诊断

CLI 以单行 stderr 输出，Worker 侧 `engine/request_content_diagnostic.go` 解析：

```text
CCG_CONTENT_DIAGNOSTIC {"protocol":"ccgateway.content.diagnostic.v1","field":…,"status":…,"carrier":…}
```

`contentDiagnostic`（`cli-mods/request-policy.js`）有严格白名单：`field` 必须在字段表内，`status` / `carrier` 必须匹配 `^[a-z_]{1,40}$`。**匹配到的文本、路径、计费值和任意属性都不进日志**。

状态取值：`replaced`、`unchanged`、`erased`、`removed_server_absent`、`inserted`、`not_found`、`ambiguous`、`unsupported_format`、`missing_baseline`、`source_unavailable`。

## 10. 能力协商与灰度

能力常量在 `contracts/features/`（`attachments.go`、`identity.go`、`identity_line.go`、`injection.go`、`levels.go`、`request_modes.go`、`agent_context.go`）；CLI 的能力列表只有一处（`profiles/linux-x64-2.1.304.json` 的 `capabilities`），经 `--ccgateway-info` 报告：

| 能力 | 含义 |
|---|---|
| `request_direct` / `request_build` | 支持该模式 |
| `request_policy_mode_v1` | 按请求策略头切换模式 |
| `build_content_preservation_v1` | 信封里是客户端原样的块（唯一的 build 路径） |
| `build_attachment_sources_v1` / `_v2` | 环境字段来源（v2：十个字段与 `erase`） |
| `build_billing_sources_v1` | 计费字段来源 |
| `build_identity_line_v1` | 服务端入口；身份行随入口自适应 |
| `direct_billing_v1` | direct 补计费头 |
| `build_injection_v1` | 非 CC 请求按等级注入各层 |
| `request_levels_v1` | 注入等级语义（direct 不补身份行、非 CC 请求按主线程） |
| `request_identity_v1` | 按账号映射身份 |
| `request_agent_context_v1` | 按客户端还原请求类别（`CCG_REQUEST_AGENT`） |
| `client_user_agent_v1` | 接受客户端 UA（REQUEST-HEADERS） |

Worker 在 `/healthz` 声明它能用的能力（`requestCapabilities`）；核心在发送 `/v1/messages` 或 `/v1/ccgateway/probe` 前通过**同一账号路由**核对能力与 CLI 版本（`requireRequestPolicyCapabilities`）。核心按线形要求（`requestPolicyCapabilities`）：

- 总是 `request_policy_mode_v1` 与 `request_levels_v1`。
- direct：下发了服务端入口或计费来源有 `worker` 时 `direct_billing_v1`。
- build：总是 `build_content_preservation_v1`；附件来源需要 v2 时 `build_attachment_sources_v2`，只用 `worker` 的旧两键时 `build_attachment_sources_v1`；计费 `worker` 时 `build_billing_sources_v1`；下发了服务端入口时 `build_identity_line_v1`；有注入时 `build_injection_v1`。

缺能力、版本不符或探测失败都阻止模型发送，核心以自己的 503（`X-CCGateway-Error-Source: core`，原因 `configuration_error`，消息写明缺哪个能力或版本不符）回答。该探测是本地 Worker 查询，不是上游模型请求。`/healthz` 的答复按路由缓存 30 秒（`requestCacheTTL`，审核 A7），Worker 原地更新后该路由被丢弃；缓存期间的旧答复最多推迟核心自己的拒绝，Worker 仍按 2.1 节自行拒绝。

注入等级 none 即 direct，环境来源与注入项保留在配置里但不下发，切回低、高注入后生效。

## 11. 已知缺口

- `ccgatewayEnvironment` 依赖的原生读取器（`gH`、`Cl`、`uoo`、`poo`、`moo`、`Nkt`、`foo`、`zkt`）在补丁里以符号绑定，**换 CLI 版本必须重新核对符号**。审核 D3 指出支持模块另从 5 个未做哈希绑定的模块导入（`chunk-7y2kvacy`、`chunk-jkcb7qdd`、`chunk-m5q1b1c4`、`chunk-eanw7pgv`、`chunk-t2p0d04m`），且动态导入名在补丁期不校验；这 5 个模块已加进 profile 的 `modules` 哈希，补丁器 `checkImports` 校验补丁新增的每个导入名确实由对应模块导出。
- Worker 给 CLI 进程设默认入口：`CLAUDE_CODE_ENTRYPOINT` 未设、为空或为 `cli` 时设成 `sdk-cli`（Worker 组装 CLI 命令时，`request_command.go` `requestCommand`；审核 C14）。v22 起 CLI 按请求调 `setEntrypointOnRequests`，计费头与 UA 都读请求入口，进程默认值不再决定发出的入口；但它与策略默认入口 `sdk-cli` 是两条独立的默认，改其中一个时要一起改。

## 12. 验证范围

已完成的本地验证（不代表上游验收）：

- Go：`go test ./engine/`，含组件装填、内容校验、能力拒绝与诊断解析用例。
- JS：`node --test cli-mods/test/*.test.mjs`，含组件组合矩阵与内容改写用例；计费补齐与拒绝路径（缺头、缺字段、多头、重复字段、格式不对、引用与围栏）、direct 逐字节不变、build 身份按 Worker 决定改写、指纹按官方样本复现。
- 组装回放：`cli-mods/test/fixtures/build-assembly-manifest.cjs` 覆盖 `billing_env.*`、`content.*` 等组合，并校验 `source_symbols`（`applyContentPolicy`、`mergeBillingAttribution`、`ccgatewayEnvironment`）。
- 跨层契约夹具（`contracts/testdata/`，CI 运行）：前端编辑器实际发送的策略经核心的合并与校验（`web-policy-payloads.json`）；核心实际下发的线形经 Worker 解析成 CLI 信封（`core-worker-policies.json`，CONTRACTS §53.18）；Worker 实际写给 CLI 的 stdin 与身份上下文经 CLI 的解析、策略、参数、输入、内容策略与身份函数（`worker-cli-requests.json`，覆盖 replace/client/worker 三种身份模式）。生产方输出变化时测试失败，需重新生成夹具并通过消费方。

未完成：

- 十项字段在同一请求内混合来源的端到端抓包（现有覆盖为组合矩阵，不是真实客户端全量）。
- 契约夹具在 CLI 侧不运行原生构造器（`jOt`、`aBe` 需编译后的 CLI），这部分仍靠 Linux 编译产物的回环验证。
- 生产不记录 Worker 发往上游的报文；出口形状靠离线容器与 31 号容器内回放取得。v26 的抓包与比较结果留在 `artifacts/claude-2.1.304/e2e/wf-r2-2026-10-24/`、`prod31-r2-2026-10-25/`、`subagent-2026-10-25/`（不进 git），结论见 `next/docs/audits/2026-10-24-ccgateway-workflow-r2/`。
