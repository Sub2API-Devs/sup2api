# build 模式的请求组件化与内容改写设计

本文描述 `claude request --build` 在 Claude Code 2.1.304 / contract v2 下的实现契约：Go 侧如何把客户端 Messages body 拆成组件，CLI 侧如何把组件还原成 CC 内部记录、按策略替换或擦除、再用 CC 原生构造器产出最终 body。

这是**代码契约说明**，不是发布或部署验收记录。附件类型的完整清点见 [BUILD-ATTACHMENT-TRANSFORM-DESIGN.md](BUILD-ATTACHMENT-TRANSFORM-DESIGN.md)（2.1.302，v1 路径）；本文覆盖随 2.1.304 引入的 v2 路径，两者并存。

## 结论

- build 模式**不重新实现协议**。最终 body 由 CC 自己的请求构造器（`Kvt`）产出，Go 与 CLI 只提供组件和精确的文本改写。
- 内容改写**只作用于已识别的环境行与计费行**。环境段里未识别格式、代码围栏内、歧义和重复的内容一律不改，并留诊断；`erase` 也只删除识别出的、受支持的条目，不是“删掉所有像环境信息的文字”。
- 内容来源有三种：`client`（原样）、`worker`（用 CLI 自己的原生环境渲染）、`erase`（删除）。
- 计费选 `worker` 时**要么用原生值，要么拒绝**：系统提示里的计费头无法安全改写（多个头、重复字段、格式不对）时 400；原生计费值拿不到时 503（2026-10-21 起，此前前一种情况原样放行）。
- 原生环境拿不到时同样**拒绝请求（503）**，不使用猜测值。
- 身份（`metadata.user_id`）不属于内容策略：由 Worker 决定是否改写，经独立环境变量交给 CLI，direct 与 build 遵守同一决定（见第 7 节）。
- v2 与 v1 的差别是**改写发生在 CLI 而不是 Go**：v1 由 Worker 预先改写 body，v2 把原始 wire 形态交给 CLI，由 CLI 在保留原始记录的前提下改写。

## 1. 总体链路

```text
客户端 Messages body
      │ ① Go：拆成 components
      ▼
components JSON ──stdin──▶ claude request --build
      │ ② CLI：组件 → CC 内部记录（prepareBuildInput）
      │ ③ CLI：内容策略替换/擦除（applyContentPolicy / mergeBillingAttribution）
      │ ④ CLI：原生构造器产出 body（Kvt）
      ▼
最终 body ──▶ CC 自己的 HTTP 客户端 ──▶ 上游
```

一次客户端请求仍然只触发一次模型生成：CLI 以 `maxRetries: 0` 发送，工具调用交回客户端。

## 2. Go 侧：body → 组件

入口 `messagesBuildComponentsPolicy`（`engine/request_command.go:47`）。

先做两道校验：`validateBuildNumbers`（数值字段范围）与 `validateBuildContent`（内容结构）。然后按固定映射拆分：

| 原 body 字段 | 去向 |
|---|---|
| `model` | `components.model` |
| `system` | `components.systemPrompt` |
| `messages` | `components.messages` |
| `tools` | `components.tools` |
| `stream` | `components.stream` |
| 其余全部 | `components.parameters` |

约束：

- **system 只接受** string 或 `text` 块，块内只允许 `type` / `text` / `cache_control`；其他字段直接 400。build 表达不了非文本 system 块。
- **`tools` 缺失与空数组不同**，用 `hasTools` 保留这一区别。
- custom 工具的 `input_schema` 改名为 `inputSchema`（组件命名）；非 `custom` 的工具原样进入 `extraToolSchemas`。
- `parameters` 内若再次出现 `model`/`system`/`messages`/`tools`/`stream` 则拒绝，防止绕过组件覆盖。

### 2.1 两条路径

`engine/request_command.go:268`：

| 条件 | 路径 | messages 处理 |
|---|---|---|
| CLI 声明 `build_content_preservation_v1` | **v2** | 原样传递，附带 `requestPolicy` + `runtimeContext` |
| 否则 | **v1** | Go 用 `extractSystemComponents` 切出附件引用 |

v2 下 `policy.ContractVersion` 置为 2，并清空 `RelayMode` / `CLIVersion` / `Identity`——身份上下文走独立环境变量，不进组件信封。

### 2.2 两个版本号不要混用

| 字段 | 值 | 层 | 含义 |
|---|---|---|---|
| `schema_version` | 1 | 核心存储的请求策略（`contracts/features/catalog.go` `PolicySchemaVersion`） | 配置格式；前端、核心按它读写。前端曾写 2 导致核心拒收（已由 bb70dbe83 修复） |
| `contract_version` | 2 | Worker → CLI 的 build 信封 `requestPolicy`（`engine/request_command.go`） | CLI 组件契约；CLI 只接受 2，且 `requestPolicy` 只允许 `contract_version`、`build_attachment_sources`、`build_billing_sources` 三个键 |

两者独立演进：改配置格式不改 `contract_version`，反之亦然。

### 2.3 v1 的引用式提取

`extractSystemComponents`（`engine/request_components.go:181`）依赖 `reminderSpans`（同文件 `:310`）做**配平扫描**，不是正则：

- 只识别精确的 `<system-reminder>` / `</system-reminder>`。
- 嵌套标记作为一个整体（深度计数）。
- 未配平或孤立的标记按普通文本处理。

产出是**位置引用**，不复制内容：

| 载体 | 结果 |
|---|---|
| `role: "system"` 的消息 | 整体替换为 `{"attachment": "ccg-context-N"}`，`kind: "system"` |
| user 消息中的 text 块 | `{type:"ccgateway_text", block, parts:[…]}`，`parts` 在文本片段与 `{attachment:id}` 之间交错 |
| `tool_result.content` 数组 | 递归处理；媒体块原样保留 |

偏移量是 UTF-8 字节偏移，因此 CLI 侧可以按字节精确还原。

## 3. 组件契约（wire format）

CLI 侧 `prepareBuildInput`（`cli-mods/request-input.js:35`）是唯一解析点。

允许的顶层键：`model`、`systemPrompt`、`messages`、`attachments`、`tools`、`parameters`、`stream`。未知键直接拒绝——生成选项必须进 `parameters`。

`attachments` 有两种定位方式：

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

1. **原生渲染必须等价**——`ccgateway_attachment` / `ccgateway_text` 展开时调用 CC 原生渲染器 `MDe`，渲染结果与原文必须逐字节一致，否则报错：

   ```js
   if (text !== item.block.text) fail('native rendered reminder snapshot changed unexpectedly');
   ```

2. **工具配对完整**——`tool_use` / `tool_result` 必须成对、顺序正确、id 唯一，缺失或多出都拒绝。

## 5. 内容策略：识别 → 决策 → 写回

`applyContentPolicy`（`cli-mods/content-policy.js:186`）。`relay_mode === 'direct'` 时直接返回副本，不做任何改写。

### 5.1 可配置字段与来源

| 段 | 字段 | 允许来源 |
|---|---|---|
| `build_attachment_sources` | `platform_name`、`os_version`、`shell`、`primary_directory`、`additional_directories`、`git_repository`、`worktree`、`scratchpad_directory`、`github_cli`、`agent_proxy` | `client` / `worker` / `erase` |
| `build_billing_sources` | `cc_version`、`cc_entrypoint` | `client` / `worker` |

缺省或 `client` 表示保留客户端内容。

### 5.2 识别：只认精确格式

`environmentRegions`（`content-policy.js:84`）：

1. 逐行扫描并跟踪代码围栏（`fenceAfter`）；**围栏内一律不识别**，避免改写示例或被引用的内容。
2. 定位 `# Environment` / `# Environment update` 标题；普通段还要求下一行是固定引导语。
3. 段落延续到下一个标题或 `</system-reminder>`。
4. `identify`（`:53`）按精确前缀匹配十个字段；`github_cli` 与 `agent_proxy` 用整段正则全匹配。

**不认识就不改**：

| 情况 | 处理 |
|---|---|
| 看起来像但格式不符（`suspectedField`） | 标记 `unsupported_format`，跳过 |
| 同一字段出现两次 | 标记 `ambiguous`，跳过 |
| 围栏内的疑似字段 | 标记 `ambiguous`，跳过 |
| `# Environment update` 中的增量行，但没有基线 | 标记 `missing_baseline`，跳过 |

上述跳过同样适用于 `erase`：只有识别出的受支持条目会被删除，其余文字保留。

### 5.3 `worker` 来源 = CLI 自己的原生渲染

这一点容易误解：Worker **不把值传给 CLI**。CLI 调用原生环境读取器（`cli-mods/native-environment-2.1.304.inc.js`），用 CC 自己的渲染函数 `zkt` 生成一份完整环境文本，再解析回字段：

```js
const snapshot = await native.readEnvironment?.(neededFields);
const regions = environmentRegions(text, 'native');
if (regions.length !== 1 || regions[0].update || regions[0].blocked.size || …) throw Error('Invalid native environment');
```

校验要求：恰好一段、不是 update 段、没有 blocked 字段、且包含 `platform_name`。任一不满足即 503。

`runtimeContext` 同样受限（`cli-mods/request-policy.js`）：`workingDirectory` 必须是绝对路径，且**必须等于 CLI 的启动目录**，否则拒绝——防止在临时 cwd 上声明环境事实。

### 5.4 写回与清理

`splice`（`content-policy.js:174`）按 `start` 降序替换，避免偏移错乱；换行风格跟随原文（`\r\n` vs `\n`）。

清理规则：

| 条件 | 动作 |
|---|---|
| 环境段内所有受管行都被删除 | 连同 `# Environment` 标题整段删除 |
| user 消息中 `<system-reminder>` 内文全部删除 | 连同 wrapper 删除 |
| 整个 text 槽变空且原本非空 | 移除该槽 |
| 消息 content 变成空数组 | 删除该消息；但要求没有其他生命周期字段，否则报错 |

保留规则：未知/固定指令行只要还在，标题与 wrapper 就保留。

### 5.5 计费归属

`mergeBillingAttribution`（`content-policy.js`）只在某个字段选 `worker` 时工作。**计费头**指 system text 块中以 `x-anthropic-billing-header:` 开头、且不在代码围栏内的行；出现在句中、缩进引用或围栏里的同名文字是客户端内容，不算计费头，也不改。

| 情况 | 行为 |
|---|---|
| 恰好一个计费头且格式合法 | 替换选中的字段，缺的字段追加；未知字段与选 `client` 的字段原样保留 |
| 没有计费头（包括只在引用或围栏里出现） | 在 system 首部插入一行，只含选 `worker` 的字段 |
| 多个计费头（同一块或跨块）/ 同一行重复出现头部 / 字段重复 / 字段格式不合法 | **400 拒绝**，诊断 `ambiguous`（先于原生值检查） |
| 原生值不可用 | 503（CLI 以 `source: internal` 报告，网关换账号重试） |

所有字段都是 `client` 时不检查、不修改。2026-10-21 前，“多个头/重复/格式不合法/引用或围栏”都只记诊断并原样放行，客户端的计费值会上行；同时 CLI 把 build 阶段的所有错误都报成 400，原生值缺失的 503 实际也以 400 返回。两处已一并修正（5f2246442）。

## 6. 原生构造器与最终 body

`buildRequest`（`cli-mods/request-build-2.1.304.js:12`）流程：

1. `prepareBuildInput(external, MDe, {preserveContent: true})` 得到 `initial`，供策略读取。
2. `applyContentPolicy` 改写 system 与 messages。
3. 用改写结果**再跑一次** `prepareBuildInput`，得到最终 `input`。
4. 客户端工具通过 `registerNative` 注册进 CC 的 native 工具表，使构造器认得它们。
5. `Kvt({…})` 是 CC 原生请求构造器，负责模型名归一化、thinking、`tool_choice`、`metadata`、缓存标记。补丁注入的 `ccgateway_request` 事件携带它产出的 body。
6. `mergeAdditionalParameters` 只并回构造器**不拥有**的参数。
7. `mergeBillingAttribution` 处理计费行；`normalizeBetas` 归一化 beta 后写入 header 并从 body 删除 `betas`。

设计意图写在注释里：

```js
// Native model rules own generation parameters; never overlay the input
// body onto their result (in particular thinking and tool_choice).
```

生成参数由 CC 自己的模型规则决定，组件只补充它不管的部分。

最后 `request-command.js:76` 在 build 之后才应用身份策略——因为 build 会自行生成 `metadata`，身份来源必须覆盖它。

## 7. 身份边界

`metadata.user_id` 由身份来源（`request_identity_sources.user_id`：`client` / `worker` / `replace`，默认 `replace`）决定，与内容策略分开：

- **只经环境变量传递**：Worker 把解析结果写入 `CCG_REQUEST_IDENTITY`（`{version:2, mode, rewrite, session_id?, device_id?, parent_session_id?, carrier?}`），不进 build 信封；核心只下发非默认来源。
- **是否改写只由 Worker 的 `rewrite` 决定**，direct（`rewriteDirectIdentity`）与 build（`applyBuildMetadata`）相同。客户端没发身份、或身份里没有可映射字段（只有未知字段、已知字段全为空或 null）时 `rewrite=false`，两条路径都保留客户端原值及其载体（对象 / JSON 字符串 / 扁平字符串）。2026-10-21 前 build 不看 `rewrite`，会把这类值换成 CLI 自己的身份并改成 JSON 字符串（ae97bd868 修复）。
- **build 不凭空生成身份**：客户端没发 metadata 时删掉原生构造器生成的 metadata；客户端 metadata 没有 `user_id` 时按客户端原样发送。
- **账号类型**：API Key 账号 `replace` 按 `client` 处理；OAuth 账号读不到邮箱时 `replace` 退为 `worker`。
- **会话头一致**：Worker 给出 `session_id` 时 CLI 以它作为根会话，传输头与 metadata 一致。

## 8. 失败与拒绝语义

| 情况 | 结果 |
|---|---|
| system 块含非文本字段 | 400 |
| `parameters` 覆盖组件字段 | 400 |
| 附件引用缺失/重复/kind 不符 | 拒绝 |
| 原生渲染与原文不一致 | 拒绝 |
| 工具配对不完整 | 拒绝 |
| `runtimeContext` 与启动目录不一致 | 拒绝 |
| 原生环境不可用 | 503 |
| 计费选 `worker` 但计费头无法安全改写 | 400 |
| 原生计费值不可用 | 503（换账号重试） |
| 能力不匹配 | 409（见第 10 节） |

## 9. 诊断

CLI 以单行 stderr 输出，Go 侧 `engine/request_content_diagnostic.go` 解析：

```text
CCG_CONTENT_DIAGNOSTIC {"protocol":"ccgateway.content.diagnostic.v1","field":…,"status":…,"carrier":…}
```

`contentDiagnostic`（`cli-mods/request-policy.js`）有严格白名单：`field` 必须在字段表内，`status` / `carrier` 必须匹配 `^[a-z_]{1,40}$`。**匹配到的文本、路径、计费值和任意属性都不进日志**。

状态取值：`replaced`、`unchanged`、`erased`、`removed_server_absent`、`inserted`、`not_found`、`ambiguous`、`unsupported_format`、`missing_baseline`、`source_unavailable`。

v1 路径另有 `build_attachment_transform` 诊断事件，记录来源、改变数量和各字段位置与前后摘要，不记录完整上下文正文。

## 10. 能力协商与灰度

能力常量在 `contracts/features/attachments.go`：

| 常量 | 值 |
|---|---|
| `BuildAttachmentCapability` | `build_attachment_sources_v1` |
| `BuildAttachmentCapabilityV2` | `build_attachment_sources_v2` |
| `BuildBillingCapability` | `build_billing_sources_v1` |
| `BuildContentPreservationCapability` | `build_content_preservation_v1` |

Worker 在 `/healthz` 声明能力；核心在发送模型正文前通过**同一账号路由**读取并核对能力与 CLI 版本。旧 Worker、未知能力、版本不符或探测失败都阻止模型发送，不跨原地更新缓存能力，避免降级后静默忽略配置。该探测是本地 Worker 查询，不是上游模型请求。

`relay_mode` 为 `direct` 时不探测、不改写；配置保留但控件禁用，切回 build 后生效。

## 11. 已知缺口

- ~~计费 `ambiguous` 分支 fail-open~~：已改为拒绝（第 5.5 节，5f2246442）。
- **v1 与 v2 并存**，两条路径的字段集不同（v1 只有 `platform_name` / `os_version`）。升级后需要确认配置迁移不会把历史 v1 字段带进 v2。
- `ccgatewayEnvironment` 依赖的原生读取器（`gH`、`Cl`、`uoo`、`poo`、`moo`、`Nkt`、`foo`、`zkt`）在补丁里以符号绑定，**换 CLI 版本必须重新核对符号**；profile 的模块哈希是这条约束的锚点。

## 12. 验证范围

已完成的本地验证（不代表上游验收）：

- Go：`go test ./engine/`，含组件拆分、内容校验、能力拒绝与诊断解析用例。
- JS：`node --test cli-mods/test/*.test.mjs`，含组件组合矩阵与 v1/v2 改写用例；计费拒绝路径（多头、重复字段、格式不对、引用与围栏）与 direct/build 身份改写一致性用例。
- 组装回放：`cli-mods/test/fixtures/build-assembly-manifest.cjs` 覆盖 `billing_env.*`、`content.*` 等组合，并校验 `source_symbols`（`applyContentPolicy`、`mergeBillingAttribution`、`ccgatewayEnvironment`）。
- 跨层契约夹具（`contracts/testdata/`，CI 运行）：前端编辑器实际发送的策略经核心的合并与校验；Worker 实际写给 CLI 的 stdin 与身份上下文经 CLI 的解析、策略、参数、输入、内容策略与身份函数。生产方输出变化时测试失败，需重新生成夹具并通过消费方。
- 继承矩阵：附件、计费、身份三类来源 × 全局/分组/账号 × 分组开关 × 账号模式；身份来源另测 direct/build 两种模式下发。

未完成：

- 真实上游模型的 build 验收。
- 十项字段在同一请求内混合来源的端到端抓包（现有覆盖为组合矩阵，不是真实客户端全量）。
- 契约夹具在 CLI 侧不运行原生构造器（`Kvt`、`MDe` 需编译后的 CLI），这部分仍靠 Linux 编译产物的回环验证。
