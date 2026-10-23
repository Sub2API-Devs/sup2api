# Claude Code 2.1.296 分析与改动记录

> 2026-10-24：本文是 2.1.296 时期（v3–v6）的历史记录。Worker 已不使用 mods 工具分发与 native 运行时（CONTRACTS §53.21），生产 CLI 是 2.1.304（见 [cli-mods README](../companions/cli-mods/README.md)），现行请求链路见 [请求模式](REQUEST-MODES.md) 第 1 节。

记录日期：2026-10-18。本文作为本项目对 Claude Code **2.1.296** 的分析、补丁和验证状态总入口。版本已由用户确认，并与原版源码头、补丁 manifest、已测试产物一致。

当前版本为 **v6 CLI 补丁与独立 Worker 测试部署**：已实现无前缀工具注册、同名工具覆盖、mods 分发，以及 `claude request --direct/--build --betas "a,b" file.json`。控制器转发，Worker 提取 messages 内的提醒/system 组件，CLI 复用内置函数组装并单次发送；request 仅启用显式 API Key，不使用订阅账号。原 21 号未切换。完整本机 startup 自动构建仍属后续工作，不与本轮已渲染上下文提取混淆。

**本记录固定以 2.1.296 为分析和补丁基线，不表示它是官方发布渠道的最新版本。** 2026-10-18 已补充本地官方 Windows 客户端的 Haiku 4.5 / Opus 5.5 多轮项目分析测试、日志定位，以及禁止自动更新的实施边界。模型名称与 CLI 版本是两个独立维度。后续改动先核对本文、补丁 manifest 和产物哈希，不把其他版本的符号、偏移或运行结果套用到本基线。

## 1 版本与产物身份

| 对象 | 身份或位置 |
|---|---|
| 分析基线 | 官方 Claude Code 2.1.296；当前补丁目标 Linux x64/glibc |
| 官方 Linux ELF SHA-256 | `24972e3bc859fab2b46ed4c1e51f7d6130f06d3bd550811a114640de3370d0de` |
| 官方 Windows EXE SHA-256 | `76de74f7694a5bdc03378a5f837c9e132827bf004c98c276bc4e9094ff06769a` |
| 当前补丁标识 | `ccgateway-v6-components-betas` |
| 当前最终 ELF SHA-256 | `e98293425adf386e6f2588d437440852ee0e4b0f17654ed5e295fa64eb8a5383` |
| 补丁源码与构建入口 | [companions/cli-mods](../companions/cli-mods/README.md) |
| 当前 patched 源码 | 仓库根目录 `artifacts/claude-mods-research-20261017/linux-x64/request-components-v6-release/` |
| 当前 ELF | 同一研究目录下 `linux-x64/request-release-v6/claude-linux-native` |
| 当前交付归档 | 同一研究目录下 `linux-x64/claude-linux-x64-components-v6.tar.gz` |
| 独立 Worker 镜像 | OVH `ccgateway-worker:components-v6-test`，直接执行 Go Worker 与内嵌 Bun 的 CLI ELF |

`request-cli-v1/v2`、`request-cli-final`、旧 native/tools ELF 等属于中间材料，不能仅凭目录名判断是否为最终版本。以补丁 manifest 和二进制哈希为准。大体积 artifacts、远端 `/tmp` 和本机临时目录不保证长期存在；小型证据保存在本插件的 `docs/cli-research/2.1.296/`。

## 2 原版发行结构与宿主

- 原生 EXE/ELF 是 Bun 运行时与模块、资源的组合。此次从模块表恢复可读 JS 与资源，再使用 Bun 重编译；不是将整个产品反编译成一个独立 JS 文件。
- 模块与字节码并存，不能保证直接改 EXE 内明文就改变运行行为。还原后的 `cli.js` 依赖相邻模块和资源。
- Windows/Linux 的 JS 构建产物不完全相同：有固化的平台值、不同模块与原生资源，也有共同代码中的运行时平台分支。不能用 Windows 载荷直接重新编译就认定得到等价 Linux 版本。
- shell、权限、沙箱、原生模块和工具可用性还受环境与配置影响。探测中共有工具的 Schema 一致，不代表所有宿主始终提供相同工具集合。
- 本次取得的 VS Code Linux 扩展内 CLI 与官方 Linux CLI 哈希一致；扩展仍有自己的 webview、宿主、控制协议和启动配置。替换 PATH 中的 CLI 不会自动替换扩展内的 CLI。
- Agent SDK 启动 CLI 子进程，通过 stream-json 发送输入和控制消息。已读 Python SDK 用 `--plugin-dir` 传入本地插件；所分析 TypeScript SDK 还存在 initialize 交付分支。

详细布局、平台比较、SDK/VS Code 入口和早期重建证据见 [机制与改造指南](CLAUDE-CODE-CLI-MECHANISMS.md)。macOS 和 ARM64 等没有完成对应补丁及运行验证。

## 3 原版 mods 与工具机制

典型目录为 `.claude-plugin/plugin.json`、`hooks/hooks.json`、`hooks/register.js`。`hooks.json` 的 `modules` 加载模块，模块导出 `register(on)`，使用 `on(event, handler)` 注册处理器。

处理器收到 `$` 宿主接口、事件数据及 `next`。多个处理器构成中间件链；参数和返回值受各事件契约约束。模块还经过静态扫描和宿主策略，不等于主程序任意 import 的普通 JS。

原版工具机制中的三个字段必须区分：

| 字段 | 职责 |
|---|---|
| 内部 `inputSchema` | 可执行 `safeParse/parse` 的运行时解析器 |
| 内部 `inputJSONSchema` | 可选的模型侧 JSON Schema |
| API `input_schema` | 最终发送给模型的工具定义 |

原版 `tool.describe` 的宿主只采纳 description/isDeferred，不通过该接口采纳工具名或 inputSchema。原版 `$.tool.register()` 通过动态回环 MCP 服务注册，名称带 `mcp__...`；内核的名称查找本身没有必须带前缀的要求。

仅修改模型 Schema 不能自动修改原执行解析器、参数规范化、权限或工具行为。原版这些步骤可能在 `tool.call` 之前发生。因此本项目采用“完整定义注册 + 调用交给 mods”的扩展，而非仅往 tool.describe 返回值添加字段。

## 4 历史 消息与附件的原版机制

CC 内部维护 user、assistant、attachment、system 等会话记录，发送前统一转换为模型请求。顶层 system prompt 与对话中的上下文附件不是同一字段。

### 4.1 从历史文件识别附件

```text
Cle 读取本地 JSONL 或存储后端
  → vut 等按行解析 JSON
  → JFn.processEntry 按顶层 type 分类，按 uuid 建索引
  → wLs 选择会话末端
  → EEt 沿 parentUuid 恢复当前分支
  → LZe / $ar 转成运行时记录
  → Ike 内的 uJ / Umo 检查 attachment 载荷
  → 发请求前 MDe / cLn 恢复或渲染附件
```

附件示意记录（不是完整的写入模板）：

```json
{
  "type": "attachment",
  "uuid": "attachment-record-id",
  "parentUuid": "previous-record-id",
  "sessionId": "session-id",
  "attachment": {
    "type": "hook_additional_context",
    "hookName": "prompt.submit",
    "hookEvent": "UserPromptSubmit",
    "content": ["context text"]
  },
  "rendered": [{"content": "<system-reminder>rendered text</system-reminder>"}],
  "renderedRole": "system"
}
```

顶层 `type` 判断是不是附件；`attachment.type` 选择类型和渲染器；uuid/parentUuid 决定历史链和位置；rendered/renderedRole 保存可复用的渲染内容及角色信息。普通 user 文本里的 `<system-reminder>` 不会让历史读取器将这条记录重新分类为 attachment，后续文字归一化可能另行识别标记。

`Umo` 首先要求 attachment 是对象且 type 是字符串，再对部分类型做基础字段检查：hook_additional_context.content 是字符串数组、file.content 是对象、invoked_skills.skills 是对象数组等。默认分支并不执行完整类型白名单校验。`uJ` 丢弃不通过检查的附件并记录诊断。

`MDe` 在满足条件时复用合法的 rendered；否则调用当前类型渲染器。不是所有历史附件都会重新读取当前环境。`--resume-session-at` 按记录 UUID 截断已经恢复的历史；大文件读取还可能跳过压缩边界之前的部分。

源码定位和精确摘录见 [历史附件识别证据](cli-research/2.1.296/history-attachment-evidence.json)。

### 4.2 每类附件如何进入模型消息

已枚举默认渲染入口显式识别的 130 个类型：88 个表项、22 个 switch 分支、3 个前置特殊类型、17 个兼容类型。**这是 CC 内部类型集合，不是 mods 提供了 130 个附件创建接口。**

- 文件、目录：生成读取说明和格式化结果；文字中的“Called the Read tool”本身不执行 Read。
- 图片文件附件：可以保留原生 image 内容块；直接粘贴图片走输入预处理，还可能缩放、重新编码、追加路径和尺寸说明。
- `file/pdf` 附件：此分支清空 base64，只保留读取说明；真正 Read 的 document/页面图片输出另走工具结果路径。
- 环境、指令、会话上下文：有首次完整声明和后续变化声明。
- 模式、任务、用量、hooks：由字段选择模板或包装生产者提供的文本。
- 工具目录变化和异步交付：某些分支还承载结构化变更或特殊工具回合，不能仅视为普通提醒文本。
- 空渲染器不等于无功能：已发送提醒等记录可能由其他归一化分支读取。

mods 的 `prompt.submit.context` 被包装成 hook_additional_context；`prompt.attachment` 拦截可渲染的附件文本，按 UUID 缓存决定，不是通用二进制附件或完整消息重写接口。

`hT` 决定最终位置：相邻 user 合并、部分附件折叠到 tool_result、符合条件的附件聚合成 api_system。模型能力、记录角色、内容类型及开关都影响结果。`Jan` 还会整理 thinking、媒体限制和工具调用配对，因此发送内容不是对历史文件的逐行原样复制。

完整逐类表见 [附件组装机制](CLAUDE-CODE-ATTACHMENTS.md)，分支原文见 [附件渲染证据](cli-research/2.1.296/attachment-renderers.json)。以上是原版静态分析，本轮没有修改这些附件或历史处理函数。

## 5 已实现的工具补丁

目标：同名覆盖、没有则添加完整工具定义；调用由 mods 执行；原工具、MCP 工具和未知名称在主模型调用路径也交给 mods，不落回内置执行器；配置的工具 hooks 仍参与生命周期。

| 修改位置 | 已做的改动 |
|---|---|
| guest `CT`、host `BWo` | 传递并识别 `kind:'native'`，进入会话内注册表 |
| `native-tools.js` | 按名称完整替换定义，克隆 JSON Schema，维护 revision 和合并数组缓存；提供透传解析器和无默认执行器的工具对象 |
| headless `ta`、terminal `computeToolPool` | 最终合并注册工具，将 revision 纳入缓存判断 |
| `sN` | native 专用模型定义序列化，避免旧工具特定 Schema 转换覆盖注册值；保留描述 hooks 路径 |
| `eYt`、`Gle`、`vwt` | 调整响应参数规范化，绕过既有工具解析；字符串输入仍需解码成对象，不是任意原始字节透传 |
| `n5t` | 不再拆解批量工具包装调用 |
| streaming `addTool` | 不在该入口做旧工具查找/Schema/并发安全判断，统一串行排队 |
| `Xj`、`tool-dispatch.inc.js` | 替换为 mods 分发及配置 hooks adapter；取消、错误结果和停止控制仍存在 |

注册示例：

```js
on('session.start', async ($, e, next) => {
  await $.tool.register({
    kind: 'native', name: 'MyTool', description: '由 mods 执行',
    inputSchema: { type: 'object', properties: { value: { type: 'string' } } }
  });
  return next(e);
});
on('tool.call', { tool: 'MyTool' }, async ($, e) => ({ result: e.value }));
```

使用原名称如 Bash 即覆盖该定义。工具调用参数沿用扁平事件结构，`tool` / `tool_use_id` 是保留元数据。无人接管或 next 到达补丁 core 时返回 no-handler 错误，不执行原工具。普通非 native 注册仍带 MCP 前缀。

注册记录按会话隔离，没有新提供 unregister；进程重启后需重新注册。主 streaming 路径绕过旧工具前置检查，不代表完整恢复、所有程序调用入口都已经清除检查。mods 自身 API 权限、模块策略和用户 hooks 决策也没有被统一删除。

演进记录：早期工具分发版本误跳过工具 hooks，v3 恢复 PreToolUse、PostToolUse、PostToolUseFailure adapter；v4 在其基础上增加 request 命令。v4 没有自动修复 v3 后续审计发现的兼容缺陷。

v5 新增 direct/build 单次请求模式。组件构建经 Kvt 的原生请求构建器，在原网络/重试循环前返回 body，再共用 direct 的发送层。为明确输入的 system 记录添加仅 build 启用的 hT 分支；新增 request-input.js、request-build.js、request-output.js，并修复 stdout 背压等待无法取消的问题。v3 工具分发兼容缺陷仍未修复。

## 6 已实现的原始请求入口

```sh
claude request --direct --input request.json
claude request --build --input components.json
cat request.json | claude request
claude request --input request.json --response-meta response-meta.json
```

无参数兼容 direct。build 的组件包含 model、systemPrompt、messages、attachments、tools、parameters、stream；自定义工具用 inputSchema。当前 Worker 用附件 id、消息槽位和 ccgateway_text 模板保留位置；旧 afterMessage + text/attachment 组件输入继续兼容。客户端 HTTP 请求的附件识别由 Worker 负责，CLI build 不自动扫描标签。两个模式都只发送一次请求，返回的工具调用交给调用方。具体契约见 [两种输入说明](CLAUDE-REQUEST-AND-WEBSEARCH.md)。

`cli.js/Bt` 在普通主循环之前识别 request，沿用 fast-path policy。direct 将原始 JSON 字符串（去除可选 BOM）交给 `model-request.js`；build 先构建 body。共用发送层通过 CC 的 `eF` 客户端调用 `client.post('/v1/messages').asResponse()`。以下原文保真说明仅针对 direct。

- 不构造 CC 主对话、历史或工具循环，不向 body 注入 CC system/messages/tools；HTTP 头仍由 CC 认证和传输层生成。
- 不调用会改写部分字段的高层 messages.create；大整数、空白和键序在此路径保留。
- UTF-8 JSON/SSE 正文写 stdout，诊断写 stderr，状态与头可写独立 meta 文件；HTTP 错误返回退出码 2，输入/传输错误为 1，中断为 130。
- 默认总请求期限 600000ms；不包含读取 stdin 之前/期间的无限等待。v5 将命令期限连接到输出写等待，已修复 v4 的输出背压超时缺陷。
- 当前仅接 Anthropic-compatible Messages 客户端。没有完成专用 Bedrock/Vertex/Foundry 协议。
- 最终接口是命令行入口，**没有交付 `$.model.request` mods API**。

详细用法与传输边界见 [request 与 WebSearch](CLAUDE-REQUEST-AND-WEBSEARCH.md)。

## 7 原版 WebSearch

普通 WebSearch 工具会检查输入与预算，额外发起模型请求，声明服务端 `web_search_20250305` 工具，设置 `max_uses:8`、域名过滤及强制 tool_choice，再整理服务端搜索结果、URL、摘要和用量。它不是本地爬虫，也不等于把字符串工具名 WebSearch 直接交给上游。

另有 firstParty + 特定开关 + CCR session 的代理分支，调用会话的 `/worker/web-search`。不能推广为所有远程会话默认行为。

新 request 可以直接发送服务端 web_search 的完整 Messages 请求，无需另加搜索命令；真实账号、模型与上游是否支持仍由服务决定。原版三阶段调用链和新入口的内容块透传已用回环模拟验证，没有在这些测试中执行真实互联网搜索。

## 8 验证记录与已知问题

证据层级要分开：源码定位、提取函数测试、源码版运行、实际 ELF 回环测试、真实上游请求分别证明不同范围。REA 静态关系图覆盖不完整；CodeGraph 曾不可用，后续使用直接源码和 AST 定位补足。不能把静态可达性当作运行证明。

| 验证 | 已有结果与范围 |
|---|---|
| 原版重建 | Linux 启动、plugin 测试、独立运行通过；早期重建版本曾完成一次真实纯文本问答，不证明当前 request 的真实 OAuth 或全部功能 |
| v3 工具扩展 | 8 项单测、12 个回环场景；覆盖新工具、覆盖、禁用工具、未知名称、重新注册、MCP、hooks 参数/结果改写等 |
| v4 request | 11 个原始场景通过，另有 5 项传输单测；与前述 8 项合计 13 项单测 |
| request 独立审计 | 重跑 11 项并新增 4 项；复杂内容块/大整数原文保留，慢错误响应不增量输出，非 UTF-8 错误字节被重编码，输出堵塞缺陷复现 |
| 最终 ELF hooks 审计 | context 丢失、ask 转错误复现；Pre/Post stop 均只发一次模型请求并停止 |
| 网关集成审计 | 早期仅只读源码核对；2026-10-18 新增隔离 Worker 的真实上游闭环，见下节 |
| v5 模式验证 | 19 项单测，原有 11 个请求回归，新增 9 个模式场景及普通 mods 回归通过；模式场景包括组件构建、独立 system、图片、附件、工具定义和两模式背压超时 |

独立审计的小型结果已从临时目录提炼至 [完成度审计摘要](cli-research/2.1.296/completion-audit.json)，其中记录源结果哈希，不复制完整提示词和认证头。

| 问题 | 状态与影响 |
|---|---|
| stdout 背压时超时/中断失效 | v4 实测缺陷；v5 写等待接入 AbortSignal，两个模式均在实际 ELF 不消费 stdout 的 500ms 期限测试中退出。旧审计结果保留，不再列为 v5 未修复项 |
| mods tool.call.context 丢失 | 最终 ELF 实测；dispatcher 只消费 deny/result，没有保留该 context |
| 内容块数组被字符串化 | 当前 `resultText` 对非字符串执行 JSON.stringify。前版真实 ELF 对照已证实结构化/图片结果降级；最终版代码仍相同，但本次最终 ELF 没重跑该场景 |
| PreToolUse ask | 最终 headless ELF 返回错误 tool_result，不进入原审批流程；不能称全部 hooks 语义兼容 |
| 恢复路径前置解析残留 | `Zo → ja → Wa/Ka → Xj` 中仍有 safeParse/isConcurrencySafe；静态及隔离函数证据，不是完整恢复场景已复现失败 |
| ToolSearch 与内部 helper | 原插件 next() 依赖原 core，新 core 永远 no-handler，必须适配；完整延迟发现闭环未验收 |
| deferral | native 序列化分支只采纳描述处理的 description，没有完整传播原有 deferral 状态更新；需结合 ToolSearch 验证 |
| 特殊调用入口 | 程序调用路径有 session pool 查找；TUI、子 agent、完整 resume 尚未端到端验收 |
| HTTP 错误流 | SDK 读完错误响应后才返回；不能保证错误正文实时增量输出；任意非 UTF-8 字节也不保真 |
| 真实服务能力 | 最终 request 的真实 OAuth 刷新、搜索授权、非 Anthropic 专用协议未验证 |

已撤销的错误推断：人为让 helper 的 after() 抛异常，不足以证明真实 PostToolUse 错误会把成功工具结果变成失败。前次真实 CLI 的 command exit1/exit2、无效 JSON、超时、function throw 测试保留了成功结果。不要把此项重新列为已确认运行缺陷。

## 9 两种目标模式的集成状态

### 9.1 当前 v6

- `direct` 保留原始 JSON 文本，Worker 单独传 beta；`build` 由 Worker 提取 system 提醒和独立 system 消息，再交给 CLI 构建。外部客户端不需要改用组件协议。
- Worker 的 `request_components.go` 为每个提取项生成 id/origin；messages 内的引用/文本模板保留角色、位置、前后文字和块属性。嵌套 tool_result 的文本也处理，图片/document 不提取，未闭合标签不提取。无跨请求文本猜测去重，每个输入历史只重放一次。
- CLI 的 request-input 经原生 MDe 回放合法纯文本 rendered；保留 cache_control 等属性到外层模板，避免回退到 hook 模板改变原文。system 消息进入 api_system，经 hT/Jan 到 Xyr，在 wire 边界保留 content 数组、output_config、clear_at 等原字段。顶层 system 块在原生 PCe 组装处保留。
- beta 通过原生 Y_o 描述符在 uln 构建前输入，不继承 hBn 的默认会话 beta 集合。原生构建仍可产出对应能力 beta，最后与客户端集合稳定合并；YEr 检查组织策略。
- eF 增加 request 专用 API Key 分支，跳过订阅选择/刷新；默认普通会话不变。fetchOverride 在 CC/SDK 补头后、Zre 压缩前实施允许头策略，丢弃无关本机/SDK身份头，认证必须与显式 API Key 匹配。任意 ANTHROPIC_CUSTOM_HEADERS 不能覆盖本次认证或 beta。
- Controller 只修复多行 anthropic-beta 的转发，不提取正文；控制器源码测试通过，生产控制器未部署此变更。

24 项单元测试、11 项 v6 原生 CLI 场景、11 项原请求回归、9 项模式回归、Worker 两模式 JSON/SSE 完整链路及普通 mods 回归通过。OVH 独立容器 `ccg-v6-build`、`ccg-v6-direct` 使用 21 号同一 API Key 和 URL，原 21 号二进制 hash/启动时间未变化。

真实上游 direct、旧式提醒 build 返回预期答案。新式 role=system 首个样例位置非法，上游返回 400；修正后合成标记问题被上游拒绝。按用户要求改为“法国的首都是哪里？”后，64 token 样例耗尽预算；1024 token、low effort 返回“法国的首都是巴黎。”并正常 end_turn，未严格只返回城市名。所有尝试均只发送一次模型请求，原错误/拒绝原样交回，不通过重试或改写规避。

官方 2.1.296 客户端独立容器 → v6 Worker → 定制 ELF → 同一上游的测试成功；Worker 提取 5 个 reminder 组件。入口/出口 JSON 完全相等，system/messages/tools 与缓存字段均相同；JSON 字段顺序变化使字节 SHA 不同，不能称字节保真。

完整证据见 [v6 组件与 beta 验证](cli-research/2.1.296/components-v6-verification.json)。build 会拒绝无法由 JS 精确表达的整数，CLI 未恢复原生附件来源、原始 UUID、完整 startup 配置或自动采集 Worker 环境。

### 9.2 v5 历史记录

以下保留首次 Worker 接入时的记录。system 缓存标记丢失等描述仅适用于 v5，已由上面的 v6 修改更新。

| 目标 | CLI 层 | 实际网关层 |
|---|---|---|
| 零注入透传 | --direct 已实现，v5 修复背压取消 | Worker 设置 CCG_REQUEST_MODE=direct 启用；官方 CLI → Worker → 定制 ELF → 真实上游已通过，入口/出口 body 逐字节一致 |
| 网关模拟 | --build 显式组件单次构建发送已实现；另有 native 定义注册与主路径 mods 分发，兼容缺陷待修 | Worker 设置 CCG_REQUEST_MODE=build 启用 HTTP body → 显式组件 → CLI 构建发送；真实闭环已通过。工具调用交回客户端；不是 mods 工具执行闭环 |

Worker 未设置 CCG_REQUEST_MODE 时保持旧 native 链路。新模式保留网关认证、并发限制、32 MiB 输入限制、进程取消、请求日志和 CLI 维护锁；以 stdout 接收 JSON/SSE，response-meta 保留上游状态。运行时 capabilities 报告 request_direct 或 request_build，并清空不适用的旧 native 策略声明。平台 request_policy/UI/controller 尚未增加新模式选择，仓库标准 Worker Dockerfile 默认安装的是官方 CLI 2.1.292；兼容入口 Dockerfile 为 2.1.288。这些现有默认值不是 v6 定制产物，也不因本分析记录固定 2.1.296 而自动改变。

2026-10-18 在 OVH 新建隔离 Worker `ccg-request-build-test`，仅复用 21 号的上游 API key，独立网络/数据卷。原 21 号未重启、未切换，仍为 2.1.301。官方客户端与定制 CLI 都使用原生 Linux ELF：定制版由 Bun 1.4.3 编译 CLI 和 hooks-worker 双入口，未以 `node cli.js` 或 `bun cli.js` 运行。测试 Worker 指向 `/usr/local/bin/claude-request`。

官方 2.1.296 客户端声明 Read 工具并载入测试 CLAUDE.md，使用 Haiku 4.5、最多一个回合。build/direct 各完成一次上游请求、返回期望文本。build 捕获入口 32095 字节、出口 32021 字节：解析后的 JSON 仅缺失 `system[1].cache_control` 和 `system[2].cache_control`，messages、tools、附件标记及其他字段一致；因此不是完整 body 保真。direct 捕获入口/出口均为 32096 字节，SHA-256 完全相同。该结论仅针对本次样本，不能外推至所有附件与历史形态。

Worker 的 build 适配器保留 messages 中的原内容块和提醒文字位置，不靠标签猜测内部 130 类附件。顶层 system 文本转换为 systemPrompt，工具 input_schema 转换为 inputSchema，其他生成字段放入 parameters；system 的原 cache_control 在此转换中丢失，CLI builder 又显式关闭自动缓存标记。需要保留原缓存布局时使用 direct；修复 build 缓存布局需扩展组件契约，不能把这次差异藏在比较归一化中。

验证摘要见 [真实 Worker 请求测试](cli-research/2.1.296/worker-request-live-verification.json)。包含新 Worker 配置、两种模式结果、逐字段差异、官方/定制 ELF 身份及原 21 号未修改的哈希证据；不含 API key。

独立 cli-mods Dockerfile 没有被生产 Worker 构建链使用。CLI 检查只看 semver，不识别补丁能力；controller 管理更新下载官方 ELF，可能覆盖同一路径上的定制版本。关闭 CLI 自更新并不关闭 controller 的更新流程。

后续仍需固化补丁身份与标准 Worker 安装/更新规则、平台模式配置，以及复杂历史/附件/工具调用的扩展验证。v5 的 system 缓存字段丢失已由 v6 修复；多轮 JSON 形状差异见下一节，旧 mods 执行链的兼容问题仍独立存在。

### 9.3 官方本地客户端多轮验证（2026-10-18）

本地官方原生 Windows CC **2.1.296** → 本机测试记录器 / SSH 隧道 → OVH 独立 `ccg-v6-build` 或 `ccg-v6-direct` → v6 Linux 原生 ELF → 21 号相同 API Key 与 URL。这条测试未经过生产 Controller；不使用订阅认证。客户端仅开放 Read/Glob/Grep，禁用 hooks 与 MCP，使用独立配置和会话，项目文件状态与 Git diff 前后相同。这是工具白名单约束，不是操作系统只读挂载。

| 模型与路径 | 模型 HTTP 请求 | 本地工具调用 | 结果 |
|---|---:|---:|---|
| Haiku 4.5 / build | 17 | 34 | 187 秒，自主完成项目概览 |
| Haiku 4.5 / direct | 16 | 31 | 158 秒，自主完成项目概览 |
| Opus 5.5 / build 首段 | 90 | 137 | 670 秒，达到测试器设置的 90 轮上限，未输出最终报告 |
| Opus 5.5 / build 证据续接 | 5 | 9 | 207 秒，将前段真实工具返回交给新官方 CLI 会话后完成报告；不是原生 resume |
| Opus 5.5 / direct | 90 | 140 | 835 秒，独立完成架构报告 |

上述模型请求均为 HTTP 200；成功不能仅用 200 判断，还要检查客户端 result、SSE stop_reason 和是否生成完整结果。两份 Opus 长报告都出现 max_tokens 后由**本地官方客户端**继续请求，最终 end_turn；报告需拼接最后一次工具调用后的全部文本段，不能仅保存 result.result 的最后一段。架构报告属于模型静态分析，未验证模块与部署状态仍是盲区。

单次 `claude request` 仍只发送一次模型请求。多轮读取、tool_result 回传和长输出续写由**调用方 CC 客户端**驱动，远端 Worker/定制 CLI 不执行本地工具，也未接管 agent loop。

多轮实测修正了单回合样本不能揭示的边界：

- direct 所有样本的入站/上游正文逐字节一致。
- build 的部分含提醒的 `tool_result.content` 从字符串转换为 text 块数组；逐项拼接后的文字完全相同，其余差异检查通过。**不能将早期单回合 JSON 完全相等结论推广到多轮所有请求。** 此转换源于 Worker 对嵌套 content 提取模板及 CLI 恢复内容块，不代表文字丢失或额外工具执行。
- beta 均保留，出口 API Key 与 21 号配置匹配，无 Authorization，也未携带被禁止的 CC/Stainless 身份头；匹配本次输入/出口样本，不泛化到所有协议。
- Haiku 两种模式各请求过一次 `/v1/messages/count_tokens`，Worker 返回 404；客户端继续完成。此兼容缺口未修复。
- Opus 响应中的 model 字段为 `claude-opus-5-5`；它不能单独证明第三方服务内部的真实模型路由。

脱敏留存见 [本地多轮验证摘要](cli-research/2.1.296/local-client-multiturn-verification.json)。保留初始回合上限和读取错误，不将续接完成写成首段无错误完成。

### 9.4 日志与问题定位

| 位置 | 内容与用途 |
|---|---|
| 本地每模式目录 `stdout.jsonl` / `stderr.log` | 官方客户端事件、工具调用/结果与进程诊断；stderr 为空不代表没有模型或工具错误 |
| 本地 `input-NNN.json` / `response-NNN.body` | 完整 Messages 入站正文及原始 JSON/SSE 响应；按序号对应 |
| 本地 `requests.json` / `result.json` | 路径、状态、beta、正文 SHA-256；客户端结果、工具数量、工作区检查 |
| `transport-audit.json` | 本地 index → 出口 captureFile；内容差异、认证匹配布尔值和 beta 检查 |
| Worker `/work/data/request-logs/<request-id>/` | request.body、response.body、metadata.json、events.jsonl、请求/响应头；build 额外有 build-components.json |
| OVH `/home/debian/sup2api/checks/ccg-components-v6-20261018/capture/` | outgoing-NNN.body、脱敏 headers.json、状态/耗时 json |

本地 Haiku 根目录为 `%LOCALAPPDATA%/Temp/ccg-local-client-20261018-183946/`，Opus 根目录为 `%LOCALAPPDATA%/Temp/ccg-opus55-architecture-20261018-185619/`。各含 build、direct；Opus 的 build 续接在 build-completion/build。完整报告为 architecture-report.txt。临时目录和远端捕获目录尚未建立长期保留/轮转规则，不作为可永久依赖的证据地址。

排查顺序：先看 result / SSE stop_reason，按 requests.json 的序号和 SHA-256 找 Worker request.body，再用 transport-audit 的 captureFile 比较最终出口；build 同时检查 build-components 中的引用位置。不能仅检查最终回答或 HTTP 状态。远端 request 子进程的 stderr 当前被丢弃以避免泄露凭证，Worker 只记录 request_command_failed 等生命周期事件；它不是完整 CLI 内部调试日志。出口记录器已移除认证头，正文仍包含项目源码/历史内容，仓库只留小型脱敏摘要和源文件哈希。

### 9.5 固定基线与禁止自动更新

自动更新分为两层，必须分别关闭：

1. **CC 自带更新器**：设置 `DISABLE_AUTOUPDATER=1`。本机使用 Windows 用户级环境变量及 `.claude/settings.json` 的 env 持久化；当前已运行的其他父进程需重新启动才能继承用户环境，显式指定其他 CLAUDE_CONFIG_DIR 或 --setting-sources 的启动器还应直接传该环境变量。独立 cli-mods 镜像固化同一 ENV；Go Runner 的 baseEnv 强制设为 1，使 direct/build 不再仅依赖 Docker 环境继承。现有 Worker/兼容入口镜像已有此 ENV。
2. **Controller 的受管 CLI 更新**：每个 Worker 的 `/admin/cli` 策略保存到 `CCG_DATA_DIR/cli-update.json`。使用管理认证 GET 当前 channel，再 PUT `{"auto_update":false,"channel":"原有频道"}`；保留 channel，不触发 check、install 或更新。Controller 的 automatic 分支读取此标志后才允许自动安装。仅禁用 DISABLE_AUTOUPDATER 不能代替这一步。

原版 2.1.296 的 `chunk-0ycjphb5.js` 中，`VRe` 先对 `process.env.DISABLE_AUTOUPDATER` 做布尔解析，再交给 `sA`；真值返回 env 禁用原因。对应模块哈希与精确片段保存在关闭记录中。三个远端 Worker 的策略回读均为 false（原先已为 false，本次显式持久化并补齐配置目录中的 env）；无需重启。Runner 与 cli-mods Dockerfile 的改动已落源码，未重建/替换线上 Worker 镜像，运行中的容器依靠其原有 ENV=1 和新增 settings 配置生效。

本次仅禁用自动升级，不执行降级、手动安装或账号服务重启。原 21 号仍是既有 2.1.301，两个独立定制测试 Worker 为 2.1.296。此前本地测试客户端是 2.1.296，但禁更配置实施时默认 npm 安装路径已报告 **2.1.302**（文件修改时间 2026-10-18 19:27:48，本机时区）；这次替换的来源尚未确定，本次未安装或降级它。不能将当前默认安装继续标为 2.1.296，也不能把此版本漂移写成已证明的自动更新事件。本文分析和测试结论仍固定为 2.1.296。

手工升级命令、Controller 的手工安装和更换镜像仍可改动二进制；后续必须核对补丁标识与哈希，semver 相同不等于保留补丁。当前尚未实现阻止一切手工替换的强制版本锁。

生效范围和回读结果见 [自动更新关闭记录](cli-research/2.1.296/auto-update-disable-verification.json)。这次持久配置与 Runner/Docker 环境调整不修改 v6 CLI 字节码或 ELF，不能声称产生了新 CLI 补丁版本。

## 10 构建与后续维护

```sh
cd next/plugins/ccgateway/companions/cli-mods
npm install --ignore-scripts
node patch-cli.cjs /absolute/restored /absolute/new-patched
sh build.sh /absolute/new-patched /absolute/claude-linux-native
npm test
```

输入必须是匹配 hash 的官方 Linux 2.1.296 还原目录，输出目录必须不存在。v6 patcher 校验七个 chunk 和 cli.js，记录修改前后 hash 及七个支持文件 hash。编译使用 Bun 1.4.3，必须同时包含 CLI 与 hooks-worker 入口；只编译 cli.js 可能启动成功但实际 mods worker 缺失。

更换上游版本、平台、补丁逻辑或 Bun 版本后重新生成 manifest、验证结果和最终 ELF hash。静态符号名与偏移不能跨版本套用。当前源码还原仍依赖研究脚本，不是完全独立发布工程。

文档与证据修改不等于 git 已提交；本次没有执行 commit/push。已部署独立测试 Worker，未切换原 21 号生产 Worker。仓库留存内容不包含真实 API key、OAuth token 或私人会话历史。

## 11 配套资料

- [CLI 原版机制与平台分析](CLAUDE-CODE-CLI-MECHANISMS.md)
- [130 类附件组装对照](CLAUDE-CODE-ATTACHMENTS.md)
- [request 与 WebSearch](CLAUDE-REQUEST-AND-WEBSEARCH.md)
- [补丁用法、构建及测试](../companions/cli-mods/README.md)
- [v4 请求验证与补丁哈希](cli-research/2.1.296/request-command-verification.json)
- [v5 模式验证与当前补丁哈希](cli-research/2.1.296/request-modes-verification.json)
- [v6 组件、beta 与真实 Worker 验证](cli-research/2.1.296/components-v6-verification.json)
- [官方本地客户端多轮验证](cli-research/2.1.296/local-client-multiturn-verification.json)
- [自动更新关闭记录](cli-research/2.1.296/auto-update-disable-verification.json)
- [v3 工具调用验证](cli-research/2.1.296/mods-all-tools-verification.json)
- [历史附件识别源码证据](cli-research/2.1.296/history-attachment-evidence.json)
- [最终版本完成度审计摘要](cli-research/2.1.296/completion-audit.json)
