# claude request 与 WebSearch

基线：Linux x64/glibc Claude Code 2.1.296；分析及实现日期：2026-10-18。

当前版本为 `ccgateway-v6-components-betas`：Worker 提取两种 system 上下文，CLI 原生组装并支持 `--betas`、位置文件参数及 API Key 出口头隔离。[v6 验证](cli-research/2.1.296/components-v6-verification.json) 包含实际 ELF、Worker 和真实上游结果。历史 v5 结果见 [模式验证](cli-research/2.1.296/request-modes-verification.json)，旧版审计见 [completion-audit.json](cli-research/2.1.296/completion-audit.json)。

## 两种输入契约

```sh
claude request --direct --betas "context-management-2025-06-27" messages-body.json
claude request --build --betas "mid-conversation-system-2026-04-07" components.json
```

两个参数互斥；未指定时默认为 `--direct`，兼容旧用法。两种模式均只发送一次模型请求、返回 JSON 或 SSE 正文。模型返回的 tool_use 交回调用方；request 命令不启动工具执行循环、不执行这些工具，也不自动触发 mods 的 tool.call。

| 模式 | 输入 | 处理 |
|---|---|---|
| `--direct` | 完整 Anthropic Messages HTTP body | 原文发送（除可选 BOM）；不提取附件、不重新构造消息 |
| `--build` | 明确的构建组件 | 附件渲染、消息转换、工具定义和系统提示经 CC 原生构建器组装后发送 |

外部客户端仍发送普通 Messages body，控制器只转发，Worker 负责提取组件。CLI 不扫描文本猜测原生附件类型。省略文件或使用 `-` 读 stdin，`--input` 与位置文件互斥。`--betas` 支持重复参数、逗号切分、去空格和稳定去重，beta 名称大小写保留。现有显式组件用法仍兼容：

```json
{
  "model": "claude-haiku-4-5-20251001",
  "systemPrompt": ["回答用户的问题。"],
  "messages": [{"role":"user","content":"分析这段代码。"}],
  "attachments": [
    {
      "afterMessage": 0,
      "role": "user",
      "text": "<system-reminder>\n这里是网关已提取的上下文。\n</system-reminder>"
    },
    {
      "afterMessage": 0,
      "role": "user",
      "attachment": {
        "type": "hook_additional_context",
        "hookName": "GatewayContext",
        "hookEvent": "UserPromptSubmit",
        "content": ["这段内容使用 CC 的原生附件模板。"]
      }
    }
  ],
  "tools": [{
    "name": "ClientTool",
    "description": "由客户端执行的工具",
    "inputSchema": {
      "type": "object",
      "properties": {"value":{"type":"string"}},
      "required": ["value"]
    }
  }],
  "parameters": {"max_tokens":1024,"tool_choice":{"type":"auto"}},
  "stream": true
}
```

- `systemPrompt` 接受字符串、字符串数组或完整的 text 块数组；text 块的 cache_control 等字段保留。
- `messages` 按顺序包含历史及本轮消息，可带 user/assistant/system；图片、document 等原生块保留。含提醒的 tool_result.content 在 Worker 提取/CLI 恢复后可能从字符串变成 text 块数组，不能承诺原始 JSON 形状不变。
- `attachments[].afterMessage` 是从 0 开始的消息索引。同位置附件按数组顺序插入。`text` 与 `attachment` 二选一：前者回放现有文字，后者交 CC 的类型渲染器生成内容。
- 附件 `role` 默认 user；可显式设置 system，作为原生归一化阶段的角色信息，最终仍受 CC 的模型能力与合并规则影响。独立 `messages[].role=system` 走专用保留分支。
- 自定义工具用 `inputSchema`，构建时变成 `input_schema`，名称不添加 MCP 前缀。服务端工具使用原生 `type/name` 定义。
- `parameters` 放 max_tokens、thinking、tool_choice、output_config、metadata 等参数；不能覆盖 model/system/messages/tools/stream。beta 首选独立 `--betas`，兼容旧 `parameters.betas` 和 `--header anthropic-beta:...`。
- 独立 system 消息保留完整文本块、output_config 和 clear_at（never/next_user_message）。输入顺序不被自动改成合法位置：上游对 system 的位置、模型和 beta 限制仍然有效。
- 构建模式使用原生消息归一化，不承诺 JSON 字节、所有块边界及浮点数保真。Worker 和 CLI 均在丢失精度前拒绝超出 JS 安全整数范围或非有限值的数字；需要原始数字文本时用 direct。

## Worker 提取后的组件

`engine/request_components.go` 提取 user 内容及 tool_result 文本中的平衡 `<system-reminder>` 片段。图片、document 等块不提取；assistant 中引用的标签保留。嵌套标签保留为整个不透明文本片段，未闭合标签不提取，不推断路径、文件或 memory 来源。

```json
{
  "model": "claude-opus-5-5",
  "systemPrompt": [{"type":"text","text":"全局指令"}],
  "messages": [
    {"role":"user","content":[{"type":"ccgateway_text","block":{"type":"text"},"parts":[{"text":"前文 "},{"attachment":"r0"},{"text":" 后文"}]}]},
    {"attachment":"s0"}
  ],
  "attachments": [
    {"id":"r0","kind":"reminder","block":{"type":"text","text":"<system-reminder>上下文</system-reminder>"}},
    {"id":"s0","kind":"system","message":{"role":"system","content":[{"type":"text","text":"本轮 system 上下文"}],"clear_at":"never"}}
  ],
  "tools": [],
  "parameters": {"max_tokens":1024},
  "stream": false
}
```

每个引用恰好消费一次，缺失、重复或未使用附件都会报错。提取后原位置不再保留第二份正文。CLI 用 MDe 的合法纯文本 rendered 快照回放提醒；块属性放在组件外层，在原位置恢复，避免触发 hook 模板重新包装。独立 system 进入原生 api_system 记录，在 Xyr 输出边界保留原始 wire 字段。

每个 API 请求自带的历史按本次输入重放一次，不用“这是第一次请求”的猜测去删历史，也不自动追加 Worker 环境。本实现不恢复已经丢失的原生附件来源、原始 UUID 或启动配置；此前完整本机 startup 构建的分析不等于已实现该功能。

2026-10-18 的官方 Windows 2.1.296 多轮实测中，Haiku 4.5 与 Opus 5.5 的 direct 出口均逐字节一致；build 部分 tool_result.content 变成 text 数组，拼接文字一致，其余已比较字段相同。早期单回合 JSON 完全相等仅限该样本。普通客户端负责本地工具执行、tool_result 回传和 max_tokens 后续写，因此一次客户端任务可以产生多次独立 request；远端每次 request 仍只发送一次模型请求。Haiku 客户端触发的 count_tokens 路径返回 404，尚未修复。详见 [多轮验证与日志边界](CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES.md#93-官方本地客户端多轮验证2026-10-18)。

维护固定 **2.1.296 / ccgateway-v6-components-betas** 基线时，启动环境设置 `DISABLE_AUTOUPDATER=1`，并单独关闭 Worker `/admin/cli` 的受管 auto_update；二者不是同一开关。具体实施与版本边界见 [禁止自动更新](CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES.md#95-固定基线与禁止自动更新)。

## beta 与请求头归属

仅 request 入口要求显式 ANTHROPIC_API_KEY，eF 的受控分支跳过订阅选择与刷新，使用原生 API Key 认证。普通 `-p` 和交互路径不受此开关影响。request 启动时屏蔽 ANTHROPIC_CUSTOM_HEADERS 的任意覆盖；客户端只能通过 --header 指定 anthropic-version/anthropic-beta。

direct 的最终 beta 为显式客户端集合。build 在 Kvt/uln 构建前通过原生 Y_o 转成 beta 描述符，不继承默认 CC 会话 beta；保留显式集合及本次构建产出的能力 beta。组织 beta 策略仍由 YEr 检查。最终 beta 不作为 SDK 参数残留在 body。

model-request.js 的 fetchOverride 在 SDK 和 CC 补头之后、Zre 压缩之前重建允许头集合：原生生成且与配置匹配的 X-Api-Key、anthropic-version、anthropic-beta、JSON Content-Type、Accept 和固定 User-Agent=ccgateway-request。不继承会话 ID、X-Stainless、fallback、任意环境头，也不使用客户端 Authorization。Host、Content-Length、Content-Encoding 等由实际传输产生；保留原 body、signal、代理和压缩设置。此策略仅针对本次 API Key Anthropic-compatible 路线，不宣称 OAuth/订阅或专用云平台兼容。

## 构建实现

```text
组件 JSON
  → request-input.js 生成内部记录和明确位置的附件
  → MDe 渲染原生附件 / rendered 回放已提取文字
  → 会话内工具对象与专用 Schema 序列化
  → Kvt → uln → Jan/hT → Xyr → 原生 body builder
  → 构建完成事件，在进入原网络/重试循环前返回
  → 与 direct 共用 eF + raw post，发送一次
```

原 `hT` 不接收 api_system 输入。本补丁仅在 request build 标记启用时新增该分支，并先 flush 待处理附件，避免客户端独立 system 消息被漏掉。原有普通会话不会启用此分支。build 不进入完整 agent loop，因此不会自动采集本地 BDr 附件或加载会话 mods；要构造的附件和工具由组件明确提供。

构建结果中的 beta 从 SDK 参数形态转成 HTTP 头。生成响应不用 Kvt 的流解析/重试，而由共用传输模块输出上游原正文，因此模型即使返回 tool_use，也不会导致第二次请求。

## 直接透传入口

`claude request --direct`（也包括未带模式参数的旧用法）直接接收完整 Messages JSON。它复用 CC 的认证客户端与网络发送层，不构造主对话、工具执行回合或额外系统提示词。

```sh
claude request --input request.json
cat request.json | claude request
claude request --input request.json --response-meta response-meta.json
claude request --input request.json --header 'anthropic-beta:your-beta'
```

标准输出只有响应正文；成功的 `stream:true` 响应逐块输出 UTF-8 SSE，不等待整个响应结束。HTTP 错误需等 SDK 读取完成，不保证增量输出；非 UTF-8 响应字节会被文本解码重编码。诊断输出到 stderr。`--response-meta` 单独保存 HTTP 状态、状态文本及响应头。

退出码：成功为 0，输入或传输错误为 1，上游 HTTP 错误为 2，中断为 130。HTTP 错误正文仍写入 stdout。请求默认总超时 600000ms，可用 `--timeout-ms` 修改。认证头由 CC 负责，`--header` 不接受 Authorization、X-Api-Key、Host 等传输归属字段。输入只为路由和 stream 开关解析，发送使用原始 JSON 文本（去除可选 UTF-8 BOM），不重新序列化，因此大整数、空白和键序不会在此步骤改变。HTTP 传输仍可使用 CC 自身的压缩。

当前仅支持显式 API Key 的 Anthropic-compatible Messages 路线；订阅账号、Bedrock、Vertex、Foundry 等不在 request 入口支持范围。入口沿用 CC 的 fast-path 策略和原生客户端；direct 不执行高层 prompt/history 转换。

这是新增命令行入口，不是新增 `$.model.request` mods API。后者在实现过程中根据需求改为了此命令。原有 mods 功能仍保留。

## 发送实现

```text
cli.js / Bt 识别 request
  → fast-path policy
  → ccgateway-request-command.js 读取 JSON
  → eF 创建 CC 客户端
  → client.post('/v1/messages', { body, stream, signal }).asResponse()
  → CC fetch 包装 _w / Zre
  → 响应正文逐块写 stdout
```

客户端工厂 `eF` 位于恢复模块 `chunk-gr4a0fky.js`。它处理账号凭据、OAuth/API key 分支、默认请求头、提供商和代理/网络配置。入口无需复制或导出账号 token。

没有调用 `messages.create()`：这个高层方法会调用 `Cd()`，将 `output_format` 转成 `output_config.format`，还会把 betas、workspace/user profile 字段转成头。底层 `post()` 不做这些 Messages 特有的重建，因此更适合完整请求体转发。

非 2xx 响应仍会被 SDK 转成异常。传输模块在 CC 的 fetchOverride 中只为错误响应保留 clone，随后返回其原始状态、响应头及正文；不把解析过的错误对象重新编码。普通网络错误和超时仍返回 CLI 错误。

可重复补丁、构建和测试位于 [cli-mods](../companions/cli-mods/README.md)。请求代码为 `request-command.js` 与 `model-request.js`，恢复后的依赖随 Bun 一并编入 ELF。

## WebSearch 的两个实现分支

普通本地会话的内置 `WebSearch` 不是本地搜索引擎爬虫。`chunk-sfjcyk7w.js` 中的 `Co` 工具会：

1. 检查 query、域名过滤参数，以及会话共享搜索预算。
2. 构造额外的模型请求，提示词要求为主模型执行搜索并简要总结。
3. 在工具定义中加入 `{type:'web_search_20250305', name:'web_search', max_uses:8}`，透传 allowed_domains / blocked_domains，特定模式还带 search_profile。
4. 强制 `tool_choice:{type:'tool',name:'web_search'}`，通过 `Kvt` 的 `querySource:'web_search_tool'` 发送。
5. 读取 `server_tool_use`、`web_search_tool_result` 和文本块；从流中提取搜索进度，最后由 `Os` 整理结果、标题、URL、耗时和次数。

`max_uses:8` 是该版本子请求中的上限；外层还另有会话共享预算。这不是“每次一定执行八次搜索”。实际搜索由上游的服务端工具完成。

另有 CCR 会话代理分支。`ko(session)` 的条件为 firstParty 提供商、启用 `CLAUDE_CODE_WEBSEARCH_USE_CCR_PROXY` 且存在 CCR session id。`To` 调用 `V8r`，向会话地址的 `/worker/web-search` 发出 query 和域名过滤参数。没有显式会话地址时，模板为 `/v1/code/sessions/<session-id>/worker/web-search`。不能将此分支概括为所有远程会话默认走代理。

现有 CCGateway `native_web_search.go` 使用单独 CLI 进程和 `CLAUDE_CODE_EXTRA_BODY` 声明同一服务端搜索工具。新 request 命令提供了更直接的承载方式；Worker 现在可以通过 CCG_REQUEST_MODE 选择请求模式，但旧 native WebSearch 路径未替换。

## 通过 request 使用服务端搜索

请求里的 `web_search` 是服务端工具，和本地内置工具名 `WebSearch` 是两层不同接口。可以直接提供：

```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1024,
  "messages": [{"role":"user","content":"Search the web for the requested topic and cite sources."}],
  "tools": [{"type":"web_search_20250305","name":"web_search","max_uses":8}],
  "tool_choice": {"type":"tool","name":"web_search"},
  "stream": true
}
```

request 不把搜索结果改写成本地工具文本；上游返回的搜索结果、引用和用量字段会作为正文直接输出。账号、模型及上游是否接受该服务端工具，由实际服务决定。

## 验证边界

v5 ELF SHA-256：`a0736bbcd1c37d65a47e0217dec929d86afc30850a284e0c2e6c9301f64ee2a9`。19 项单元测试、原有 11 个请求回归场景、新增 9 个模式场景及普通 mods 回归通过。新增场景验证显式 direct、模式冲突、build 拒绝 HTTP body、组件构建、混合历史/图片/两种附件/独立 system、自定义工具定义、SSE、HTTP 错误，以及两种模式的 stdout 背压超时。使用实际 ELF、隔离 Docker、回环模型服务和假 key；没有新增真实模型请求或部署。

以下是保留的 v4 验证记录：

最终 ELF SHA-256：`d39e92fad26d9957844b937802187f2d926c10c33fb050812aab09d8ec9886f5`。研究机 Docker 镜像：`ccgateway-cli:request-2.1.296`。11 个命令场景、5 项传输单元测试及 8 项已有 mods 单元测试通过；另验证了原版 WebSearch 调用链和修改版普通 mods 场景。[验证摘要](cli-research/2.1.296/request-command-verification.json) 保存场景、哈希与范围。

使用隔离 Docker、假 API key 和回环模拟服务验证完整 JSON、文件输入、实时 SSE/UTF-8、HTTP 错误、超时、输入错误、认证头归属、帮助、取消及大整数/正文逐字保真。模拟 WebSearch 场景确认服务端工具定义、结果块、引用与用量字段不会被重写。

另外使用未修改的官方 Linux ELF 运行 WebSearch：捕获了主模型调用、搜索子请求和主模型继续回答三次 Messages 请求。子请求的 `web_search_20250305`、`max_uses:8`、域名过滤及强制 tool_choice 与源码一致；模拟服务返回的 URL 和摘要进入了主模型的工具结果。测试程序为 `companions/cli-mods/test/websearch-probe.cjs`。

上述历史回环测试未发真实搜索或模型请求。2026-10-18 已补充下述真实模型验证；真实 OAuth 刷新、上游搜索授权仍未验证。此前审计发现的 mods context、ask、结构化工具结果及恢复路径问题仍待修复；request 入口不经过那条 mods 工具执行链。

## v5 独立 Worker 接入与历史验证（2026-10-18）

以下为 v5 初次接入记录，保留当时发现的缓存差异。v6 已保留 system 原缓存块，并实现 messages 中两种 system 载体的提取；当前结果见文末。

账号 Worker 使用 `CCG_REQUEST_MODE=direct` 或 `CCG_REQUEST_MODE=build`，`WORKER_CLI_PATH` 指向已编译的定制 ELF。留空保持旧 native 模式。Go Worker 直接启动 `claude request --direct/--build`，通过 stdin 传参、stdout 接收 JSON/SSE、独立 meta 文件读取上游状态；不使用 JS 启动器。正常成功响应逐块转发，客户端自行处理 tool_use。

HTTP build 适配器将顶层 system 文本映射为 systemPrompt、tools[].input_schema 映射为 inputSchema，其他生成选项放入 parameters。messages 原始块的位置和类型保留到组件输入，不根据 system-reminder 猜测原始附件类型；显式 typed attachments 仍通过 CLI 组件接口传入。适配器会丢弃顶层 system 块的 cache_control，原生 builder 不自动恢复这些缓存标记。

OVH 隔离 Worker `ccg-request-build-test` 使用与 21 号相同的上游 API key，原 21 号的二进制、容器和数据未切换。官方 2.1.296 客户端在另一个容器中启动，包含 Read 定义和测试 CLAUDE.md，通过新 Worker 向真实 Haiku 4.5 发请求。官方和定制 CLI 均为 Linux ELF；定制 CLI 内置 Bun，不依赖外部 JS 入口。

| 模式 | 真实模型请求 | 结果 | 入口与出口正文 |
|---|---|---|---|
| build | 1 | 返回 CC_REQUEST_BUILD_OK | messages、tools 和附件标记一致；仅两处 system.cache_control 被移除，JSON 与字节均不完全相同 |
| direct | 1 | 返回 CC_REQUEST_DIRECT_OK | 32096 字节原样保留，SHA-256 与解析后的 JSON 均相同 |

测试仅覆盖该真实样本。缓存布局、复杂历史及其他附件组合不能据此视为全量兼容。[完整摘要](cli-research/2.1.296/worker-request-live-verification.json) 保存字段级差异和 ELF 身份；原始合成请求保存在 OVH 隔离测试目录，不记录认证头。新 Worker 的模式不会自动接入平台 UI、controller 更新或旧 request_policy 策略。

## v6 实际部署与结果

OVH `ccg-v6-build`（127.0.0.1:32774）和 `ccg-v6-direct`（127.0.0.1:32775）健康运行，镜像为 `ccgateway-worker:components-v6-test`。通过隔离捕获 relay 转发至 21 号配置的同一 URL，API Key 仅在私有 env 文件及进程内复用，不写入仓库或捕获头。CLI SHA-256 为 `e98293425adf386e6f2588d437440852ee0e4b0f17654ed5e295fa64eb8a5383`。

- direct 和旧式提醒 build：真实 Haiku 4.5 返回期望答案，各一次模型 POST；direct body 逐字节一致，build 的消息/顶层 system 一致。
- 新式 system：真实 Opus 5.5 在合法消息位置接受请求；普通常识问题在 1024 token / low effort 下正常回答“法国的首都是巴黎。”，role/system 块及 clear_at 均未改变。先前非法位置、refusal、64 token 用尽的尝试均留在证据中，不隐瞒失败。
- 官方 2.1.296 客户端：Worker 提取 5 个提醒，最终 system/messages/tools 与完整 JSON 均相等，字节顺序不同。客户端完成一个回合并返回期望答案。
- 最终捕获没有 X-Stainless、CC 会话/agent/fallback 等无关身份头；使用固定 UA 和配置对应的 X-Api-Key，未带订阅 Authorization。传输生成的 Host、长度、连接、编码头仍存在。

[v6 验证摘要](cli-research/2.1.296/components-v6-verification.json) 包含边界、所有真实尝试、原生 ELF 身份和原 21 号未修改的检查。普通 mods 回归另有两次模型调用，这是原工具循环测试，不属于 request 单次发送场景。
