# CCGateway 出站中继完全透传：方案汇总（2026-10-10 讨论结论）

用户决定：worker 的每个上游请求都由内层 Claude Code CLI 自己构造并发出。出站中继不修改请求，也不修改响应。
客户端字段能用 CLI 表达的交给 CLI；表达不了的，按本文逐项处理。
标注"待验证"的条目，实现前先用假上游或 #23 实测。

## 1. 出站中继

- **请求**：原样转发，不增删、不改写任何字段或头。
- **响应**：响应体原样流给 CLI。中继只读记录以下内容，供网关使用：
  - 状态码；
  - 限额响应头（5h/7d/Fable 采样用，**不再转给客户端**）；
  - 非 2xx 时的错误体。
- **日志**：账号开启请求日志时，只记录 CLI 发出的原始请求。透传下，它也就是上游实际收到的请求。
- **删除**：中继里的全部请求改写和响应桥接，包括：
  - 系统消息、工具、历史、图片、引用的还原；
  - 字段补写，`thinking.display` 注入；
  - U/A' 改写；
  - 错误改写、SSE 错误终止、MCP 凭据保护；
  - JSON 生成桥接、预热桥接。

## 2. 错误与重试

- 内层 CLI 设 `CLAUDE_CODE_MAX_RETRIES=0`，不做任何重试，由客户端处理。
- 上游错误（状态码 + 错误体）原样返回给客户端。网关按状态码自行冷却账号、故障转移，逻辑不变。
- 控制台的"上游错误直接返回给客户端"设置删除（透传下总是如此）。

## 3. CLI 参数能表达的（第一类）

| 字段 | 做法 |
|---|---|
| model | `--model` |
| max_tokens | `CLAUDE_CODE_MAX_OUTPUT_TOKENS` |
| thinking 未写 | `--thinking disabled`。opus-5-5、fable-5-1 不发 thinking 字段，和客户端一致；老模型发 `disabled` |
| thinking 写了（任何形式） | 客户端的整个 thinking 对象原样放进 EXTRA_BODY（见第 4 节）。`--max-thinking-tokens` 在 opus-5-5 上会变成 adaptive，预算丢失；`--thinking-display summarized` 不会出现在请求里。所以都不用参数（已实测） |
| effort 未写 | `--effort high`（官方默认）。否则 CLI 对 opus-5-5 会自己补 medium，对 sonnet-4-6 补 high（已实测） |
| speed / fast | settings `fastMode` |
| betas | `ANTHROPIC_BETAS`，客户端的 `anthropic-beta` 原样传 |
| system | `--system-prompt`，内容不变，结构按 CLI 的方式 |
| 缓存 TTL | `CLAUDE_CODE_PROMPT_CACHE_TTL` |
| --add-dir | `--add-dir` |

所以 thinking 和 effort 必须按客户端原值精确表达，不能让 CLI 用它自己的默认值。

## 4. 经 `CLAUDE_CODE_EXTRA_BODY` 传递的（第二类）

**统一由 Mod 在每一轮发出前设置**：Mod 在 `turn.step` 里调用 `$.env.set("CLAUDE_CODE_EXTRA_BODY", …)`，CLI 每次发请求都会重新读取这个变量。

- worker 只准备两份取值，"第 0 轮"和"其余轮"，用文件交给 Mod，不受命令行长度和单个环境变量约 128 KB 的限制。
- Mod 只负责按轮次选用其中一份，不自己生成内容。

已实测：

- **按顶层键替换，不是深合并**（官方原文就是 "merge into the top level"）。`{"thinking":{"display":"omitted"}}` 会让请求里的 thinking 只剩 display，type 丢失。所以每个键都要放客户端的完整对象。
- `output_config` 是例外：CLI 在合并之后才写入 effort。所以客户端的 format 和 CLI 的 `--effort` 能同时保留。
- 每个请求只发一次。

字段：

- thinking：客户端写了就原样放入；
- 采样：temperature、top_p、top_k、stop_sequences、service_tier、inference_geo；
- `output_config`：format、effort、task_budget，客户端原样（旧字段 `output_format` 同理）；
- `tool_choice`：见第 7 节；
- `safeguards`：见第 6 节。

前提条件：

- 内层 CLI 不发辅助请求。worker 已关掉非必要流量和自动记忆，不用 auto 模式，也没有 hook。测试要断言：只出现主请求和内部 ToolSearch 轮。
- 设置 `CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS=1`，避免 CLI 自带的 format 和客户端的混在一起。已实测：EXTRA_BODY 里的 format 仍原样保留（opus-5-5、sonnet-4-6）。
- 不用 `--json-schema`。它走 StructuredOutput 工具，由 CLI 事后校验并重试，不是 API 原生的 format（官方文档已确认）。

## 5. 忽略客户端值、由 CLI 决定（第三类）

- **cache_control 断点**：只影响缓存命中和费用，不影响回答。
- **context_management**：由 CLI 自己管理上下文。
- **每轮内嵌的 system / effort**：由 worker 交给 CLI，合进 CLI 自己的上下文。
- **客户端 metadata**：上游看到的是 CLI 自己的会话标识。

## 6. safeguards（服务端审查）

- **请求**：`safeguards` 放进 EXTRA_BODY，`dangerous-tool-use-2026-09-03` 放进 `ANTHROPIC_BETAS`。
  - 已实测：上游收到的内容和客户端一致。
  - 主请求和内部 ToolSearch 轮都带它，和现在一致。
  - web_search 短进程不带。
- **结论**：worker 从 CLI stream-json 输出的 `stream_event`（message_delta）里读取 `safeguard_results`，原样转给客户端。已实测：CLI 原样输出这个字段，内层 CLI 收到后不报错。
- **工具名和 schema 的一致性校验**：保留在 worker 里。
- 不能用短进程实现：服务端审查的是同一个请求里刚生成的 tool_use，没有单独审查一个已有调用的接口。

## 7. tool_choice

worker 先把工具名换成内层 CLI 里的名字，再把 tool_choice 原样放进 EXTRA_BODY。返回客户端时换回原名，现有逻辑已经在做。

| 客户端 | 上游 | 说明 |
|---|---|---|
| 不写 / auto | 不写 / auto | |
| none | none | 一轮，只有文字 |
| tool: X | tool: 内层名（`mcp__ccgateway__X`，原生工具名字不变） | 一轮 |
| any | any | 见下方"强制调用与内部轮次" |
| disable_parallel_tool_use | 原样 | |
| 和 thinking 同时出现 | 原样 | manual thinking 不能和强制调用同时用；adaptive 是否允许由模型决定，上游的结论原样返回 |
| 名字不在客户端工具里 | 原名 | 上游返回 400，和官方一致 |

**实测（2026-10-10，经线上网关，账号 #23/#22，共 7 个请求）：**

1. **claude-opus-5-5、claude-fable-5-1 完全不支持 `any` 和 `tool`**：上游返回 400 "tool_choice: type "tool" and "any" are not supported for this model."。透传时原样交给上游即可，网关不做判断。
2. **claude-sonnet-4-6 支持**。any 加 web_search 时，一次服务端搜索就满足了"必须调用工具"，之后模型可以直接用文字回答（stop_reason end_turn）。auto 下的行为相同。

**强制调用与内部轮次（已解决）：**

- **问题**：EXTRA_BODY 若在进程启动时一次设定，对 CLI 的每一轮都生效。官方的强制只作用于一次请求，所以内部轮次（web_search 回填、内部 ToolSearch）之后的续接轮也会被强制，和官方不一致。
- **解决**：由 Mod 按轮次设置 EXTRA_BODY（已实测，2026-10-10）。
  - CLI 每次发请求时都会重新读取 `CLAUDE_CODE_EXTRA_BODY`。
  - Mod 的 `turn.step` 钩子在 `next(e)` 之前调用 `$.env.set("CLAUDE_CODE_EXTRA_BODY", …)`，就能按 `e.index` 决定这一轮带什么。
  - 实测：第 0 轮带 `tool_choice: any`，WebSearch 回填后的第 1 轮不带，temperature 两轮都带。
- **规则**：
  - 客户端的 tool_choice 只放进第 0 轮。这一轮对应客户端的这次请求；内部轮次之后的续接轮不带，和官方"一次请求内服务端工具执行完可以自由回答"一致。
  - 其它字段（thinking、采样、output_config、safeguards）每轮都带。
  - Mod 从 worker 给的两个变量里读取"第 0 轮"和"其余轮"的取值，例如 `CCGATEWAY_FIRST_STEP_BODY` 和 `CCGATEWAY_STEP_BODY`。这两个值都由 worker 根据客户端请求生成，Mod 只负责按轮次选用。
- 因此，强制调用加 web_search、强制调用加内部 ToolSearch 都**不再需要返回 400**，也不必一开始就加载全部客户端工具。
- 限制：Mod 的 `turn.step` 只能直接改写 model 和 effort，其它请求字段都固定。按轮次设置环境变量是唯一能逐轮改变请求字段的办法，所以请求仍完全由 CLI 构造。

## 8. web_search（20250305 / 20260209 / 20260318）

**通用路径：**

1. 主 CLI 打开内置 `WebSearch`。上游看到的是 CC 自己的工具。
2. Mod 的 `tool.call` 拦下调用，交给 worker。
3. worker 在当前账号的容器里起一次性短进程：
   - `claude -p x --plugin-dir <搜索 Mod> --tools WebSearch --allowedTools WebSearch --max-turns 1`；
   - Mod 在 `turn.step` 里调用 `$.tool.call(WebSearch)`，然后中止这一轮。
   - 已实测：上游只收到一次搜索请求。
4. 结果回填给主 CLI，同一轮里继续生成回答。
5. 给客户端返回 `server_tool_use` + `web_search_tool_result`（title、url）+ 回答，usage 计入 `web_search_requests` 和短进程消耗的 token。

**参数：**

- allowed_domains、blocked_domains 原样传入；
- max_uses 由 Mod 计数；
- user_location、response_inclusion 返回 400。

**结果块：**

- `encrypted_content` 由网关签发，里面是搜索结果文本，哪个账号的 worker 都能还原。所以换账号没有影响。
- 没有 page_age，也没有 citations 块，回答里用 markdown 链接。

**其它规则：**

- **快速路径**：CC 客户端自己发起的搜索请求（只有一个 web_search 工具，消息是 "Perform a web search for the query: Q"）直接走短进程，只发 1 次上游请求。
- 历史里出现不是网关签发的 `encrypted_content` → 400。
- web_fetch → 400。CLI 的 WebFetch 和官方的服务端 web_fetch 是两回事。
- **钩子回答 WebSearch**（已实测）：Mod 的 `tool.call` 返回 `{result: {query, results, durationSeconds, searchCount}}`，CLI 用 WebSearch 自己的格式转换后交给模型。格式和真实执行完全一致（"Web search results for query: …\n\nLinks: […]\n\n…\n\nREMINDER: …"）。

## 9. 第四类功能（2026-10-10 用 Mod 和原生会话文件重新评估）

借助 Mod 按轮次设置 EXTRA_BODY（第 7 节），以及"原生会话文件里的历史原样发出"，重新实测了一遍。全部用假上游和本机 CC 2.1.292。

**客户端带的工具，各用什么 CLI 参数带上：**

| 客户端工具 | CLI 参数 | 结果 |
|---|---|---|
| CC 自带工具（Read、Bash 等） | `--tools` | 原生定义，名字不变 |
| 自定义工具 | MCP（现有做法） | 上游名字是 `mcp__ccgateway__X` |
| web_search | 内置 WebSearch + 短进程 | 第 8 节 |
| advisor | `--advisor <model>` | 待 #23 实测 |
| MCP connector（`mcp_servers`） | `--mcp-config` | 能做，但连接改由容器发起，凭据进容器；默认不做 |
| code_execution、服务端 web_fetch、tool_search_tool_*、typed 工具集、PTC、container skills | 没有 | 返回 400，原因见下 |

**改为支持（请求仍完全由 CLI 构造）：**

| 功能 | 做法 | 实测 |
|---|---|---|
| fallbacks 多级回退 | Mod 的 `turn.step` 依次尝试：`next({...e, model})` 失败时（stopReason 为 null）换下一个模型。配合 `CLAUDE_CODE_MAX_RETRIES=0`，每次尝试只发一个请求 | opus 529 → sonnet 529 → haiku 成功，共 3 个请求，结果 success。<br>CLI 自带的 `--fallback-model` 要连续 3 次 529 才切换，而且依赖重试，不用 |
| `max_tokens: 0` 预热 | EXTRA_BODY `{"max_tokens":0}`；Mod 只放行一轮（现有逻辑） | 请求里是 `max_tokens: 0`。CLI 会把 max_tokens 当错误，最多再发 3 次，由 Mod 拦住 |
| 历史里的 citations | worker 写原生会话文件时保留 | assistant 文本块的 citations 原样上游 |
| 资源：文档（text、base64 PDF、`file_id`） | 历史里写进会话文件；最后一条消息里作为 CLI 输入 | 两种位置都原样上游（CLI 只加它自己的 cache_control）；beta 经 `ANTHROPIC_BETAS` 传 |
| `output_config.task_budget` | EXTRA_BODY | `--task-budget` 参数在假上游环境下没有生效，所以用 EXTRA_BODY |

**仍然做不到，入口返回 400：**

- **assistant 预填充**：CLI 发出的请求总以用户消息结尾。会话文件以 assistant 结尾时，`RESUME_INTERRUPTED_TURN` 不会发出请求（已实测）。
- **count_tokens**：CCGateway 不提供（2026-10-11 用户决定）。订阅账号本身支持计数，legacy 曾借 CLI 的认证、把请求体换成客户端原文来计数；透传下不做，入口返回 400「count_tokens is not supported by this gateway」，Claude Code 客户端收到后改用本地估算。0.1.36 起插件不再声明这个端点（用户决定），核心不调度到 CCGateway 账号；worker 的 400 只作兜底。
- **fallback credit**：需要替换整个请求体。
- **需要在 `tools` 里加定义的功能**：
  - code_execution、web_fetch、tool_search_tool_*；
  - typed 工具集（computer use、text_editor 等）；
  - MCP connector；
  - PTC（依赖 code_execution）；
  - container skills。

  CLI 没有参数能添加这些定义。EXTRA_BODY 是按顶层键整个替换：实测 `--tools Read,Grep` 加 EXTRA_BODY `{"tools":[code_execution]}`，上游只剩 code_execution。Mod 也帮不上：`$.tool.list()` 只返回 name、description、是否 MCP，没有 schema，拼不出 CLI 原本的工具列表。要支持这些，只能由 worker 每轮自己拼出完整工具列表（还要跟着延迟加载的变化），等于网关重写请求，违背透传原则，所以不用。
  - MCP connector 例外：CLI 有 `--mcp-config`，可以由内层 CLI 从容器里连客户端指定的 MCP 服务器。但这样连接发起方从 Anthropic 服务端变成了容器，凭据也会进容器，所以默认不做，需要时单独决定。
- **advisor**：CLI 有 `--advisor <model>` 参数，但在假上游（API key + 自定义地址）下请求里没有出现 advisor 工具。可能只对特定登录方式或模型开放。上线前在 #23 的真实环境里再测一次：生效就支持，否则返回 400。

## 10. 子代理与会话身份

- ccgateway 把客户端的 `X-Claude-Code-Agent-Id` 交给 worker，worker 用它选择分支 (S, A)。这部分不变。
- **agent id**：子代理分支启动 CLI 时，设 `ANTHROPIC_CUSTOM_HEADERS="x-claude-code-agent-id: A'"`。已实测：上游只收到一个这个头。
  - 不能用这个变量去改 session 头：头和 metadata 会不一致。
- **会话 ID**：主线程用 `--session-id` / `--resume`，会话 ID 就是 U，头和 metadata 一致。已实测。
- **子代理分支也用会话 ID U**（已实测可行）：
  - 分支文件放在 worker 自己的目录里，文件名是 U，用 `--resume <绝对路径>` 恢复。CLI 会追加写回同一个文件。
  - 主线程和子代理分支的请求，头和 metadata 都是 U。子代理请求另外带 A'，两边历史互不混入。
  - 不能按分支分开配置目录：内层 CLI 的 OAuth 凭据在配置目录里，分开会导致令牌刷新冲突。
  - 注意：恢复分支时，CLI 会在 projects 目录下另外生成一个小文件，实现时要确认它不影响什么。
- 客户端的 S 不外泄。

## 11. 其它需要改到 worker 一侧的

- **主请求标记**：去掉。透传下不需要区分主请求和辅助请求。
- **图片**（已实测）：
  - **历史里的图片**：worker 写进原生会话文件的图片，CLI 原样发出，不加任何东西。
  - **最后一条用户消息里的图片**：作为新输入交给 CLI 时，CLI 会做两件事：
    - 把图片存成临时文件，并在后面加一段 `[Image: source: <容器内路径>]` 文字；
    - 大图会被缩放、重新编码（3000×3000 缩成 2000×2000，文字里还附带坐标换算说明）。
  - URL 图片原样发出，不加文字。
  - 用 `CLAUDE_CODE_RESUME_INTERRUPTED_TURN=1` 恢复以用户消息结尾的会话也是一样。CLI 没有关闭这个行为的开关。
  - **做法**：最后一条用户消息如果以文本块结尾，就把它前面的块（包括图片）写进会话文件，只把末尾的文本作为新输入。CLI 发送时会把相邻的用户消息合并，内容顺序不变。实现时要实测这个合并。
  - **不以文本结尾的**（比如只有图片）：接受 CLI 的原生处理（附加来源文字，大图缩放），并写进文档。
- **续接**：
  - 现在的续接只用在客户端最后一条是 assistant 消息时：assistant 预填充，或服务端工具 pause_turn 之后的续接。worker 给 CLI 一段触发文本，由中继删掉，再恢复原来的 assistant 尾部。
  - 透传后：
    - web_search 在同一轮内由短进程完成，网关不再返回 pause_turn，客户端也就不会发这种续接；
    - assistant 预填充 CLI 无法表达（CLI 的请求总以用户输入结尾），返回 400。
  - **新发现**：`CLAUDE_CODE_RESUME_INTERRUPTED_TURN=1` 加 `--resume` 一个以用户消息结尾的会话，CLI 会直接发出请求，不需要任何新输入（`resume_reason: interrupted_turn`）。这可以作为"最后一条消息不经 CLI 输入处理"的通用办法，但图片仍会附加来源文字，见上。
- **历史**：worker 把客户端历史写成 CLI 的原生会话文件。citations、文档（含 `file_id`）、图片原样保留，CLI 照原样发出（第 9 节已实测）。连续的 system 消息按 CLI 的方式合并，内容不变。
- ~~删除 `thinking_disabled_compat` 开关~~：**保留，透传下同样生效**（2026-10-11，用户决定）。当初的理由是"CLI 对 opus-5-5 不会发 disabled"，但发 disabled 的是客户端：cc-switch 把模型名改成 opus-5-5 后，CC 的标题、分类器请求仍带 `thinking: disabled`，透传下得到上游原样的 400。开 `omit` 时，透传在入口去掉这个字段（不放进 EXTRA_BODY，CLI 用 `--thinking disabled`，对这些模型不发 thinking），这是透传下网关唯一会去掉的生成字段。

## 12. 上线

- **策略开关** `relay_mode`：取值 `legacy` 或 `passthrough`，默认 legacy。
- **顺序**：
  1. 先在 #23 上切到 passthrough，跑 e2e，再用用户本机 CC 测原提示词；
  2. 没问题后全量切换；
  3. 稳定后删除旧代码。
- **文档**：CONTRACTS、特性目录（CatalogVersion）、SUBAGENT-DESIGN、RUNBOOK 同步更新。

## 13. 实现前的验证清单（2026-10-10 全部完成）

1. any 加 web_search 的官方语义：见第 7 节（#23 真实请求）。
2. `CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS` 保留 EXTRA_BODY 里的 format：见第 4 节。
3. thinking 的精确表达：见第 3、4 节。EXTRA_BODY 按顶层键替换。
4. 子代理分支统一用会话 ID U：见第 10 节，可行。
5. 钩子回答 WebSearch 的格式：见第 8 节，和真实执行一致。
6. 图片：见第 11 节。最后一条消息里的 base64 图片会附加来源文字。
7. 续接和预填充：见第 11 节。预填充返回 400；新发现可以恢复中断的轮次。

2 到 7 都用假上游和本机 CC 2.1.292 完成，没有发真实请求。

## 14. 改动清单与分阶段实施（2026-10-10 定稿）

图片方案已确认（第 11 节）。下面每个阶段单独提交，各自带测试；旧路径保留到全量切换稳定后再删。

### 阶段 0：开关

- **请求策略新增 `relay_mode`**：取值 `legacy` 或 `passthrough`，默认 legacy。
  - 再加 `relay_passthrough_accounts`（账号 ID 列表）。核心在 `client.go` 生成 `X-CCGateway-Request-Policy` 时按账号算出生效值，这样可以只对 #23 打开。
- **改动位置**：
  - 核心：`server/internal/ccgateway/request_policy.go`；
  - 引擎：`engine/request_policy.go`；
  - 控制台：`requestPolicy.ts`、`RequestPolicySettings.vue`、中英文 i18n、mock、spec；
  - 特性目录：`contracts/features/catalog.go`，新增条目并升 CatalogVersion。

### 阶段 1：透传主体（engine）

1. **CLI 参数**（`runner_config.go` 的 `cliArgs` / `cliEnv`）：
   - thinking：没写就传 `--thinking disabled`，写了就把整个对象放进 EXTRA_BODY；
   - effort：没写就传 `--effort high`；
   - `--settings` 文件的 `env` 里写入：
     - `CLAUDE_CODE_MAX_RETRIES=0`；
     - `CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS=1`；
     - 两份 EXTRA_BODY 取值的文件路径（"第 0 轮"和"其余轮"），由 Mod 读取（第 4、7 节）。thinking、采样参数、output_config、safeguards 两份里都有；tool_choice（换成内层名字）只在"第 0 轮"那份里。
   - `ANTHROPIC_BETAS` 原样传客户端的 beta。
   - 子代理分支设 `ANTHROPIC_CUSTOM_HEADERS=x-claude-code-agent-id: A'`。
   - 分支会话文件统一用会话 ID U，按路径 `--resume`（第 10 节）。
2. **中继**（`outbound_relay.go`）：passthrough 模式下请求原样转发。只读记录三样：
   - 状态码；
   - 限额头：交给网关采样，不再经 `providerResponseFacts` 转给客户端；
   - 非 2xx 的错误体。

   请求日志只记 CLI 的原始请求。`adaptAttributed`、响应侧的 `ModifyResponse` 桥接、`sessionHeaders` 在这个模式下都不再执行。
3. **结果**（`runner_session.go` / `response.go`）：
   - `safeguard_results` 等响应扩展字段从 CLI 的 `stream_event` 里读；
   - 上游错误原样交给 `x.passUpstream`，状态码和错误体都不改。
4. **入口校验**（`main.go` 的 `admit`，`feature_plan.go`）：在 passthrough 下返回 400 的情况：
   - 第 9 节"仍然做不到"的各项（含 assistant 预填充）；
   - user_location；
   - 不是网关签发的 `encrypted_content`；
   - 依赖中继还原的载体：inline tools、图片 transformations。

   错误文字要写明原因。
5. **图片**：最后一条用户消息以文本块结尾时，前面的块写进会话文件，末尾的文本作为新输入；否则交给 CLI 原生处理（第 11 节）。
6. **主请求标记**：passthrough 下不再注入。
7. **历史**：worker 写原生会话文件时，原样保留 citations、文档（含 `file_id`）、服务端工具块。实测 CLI 会照原样发出（第 9 节）。
8. **Mod 的 `turn.step`**（`mod/hooks/register.js`）：
   - 按轮次设置 `CLAUDE_CODE_EXTRA_BODY`：第 0 轮带 tool_choice，其余轮不带；
   - fallbacks 回退链；
   - `max_tokens: 0` 只放行一轮。

### 阶段 2：web_search 短进程（engine + mod）

- **主 CLI 的 Mod**（`mod/hooks/register.js`）：
  - `tool.call` 拦下 WebSearch，经控制通道请求 worker；
  - `turn.step` 允许搜索回填后的那一轮续接。
- **新增只做搜索的 Mod**：`turn.step` 里调用 `$.tool.call(WebSearch)`，结果交给 worker，然后中止这一轮。
- **worker 侧**：
  - 起短进程、计数 max_uses；
  - 生成 `server_tool_use` + `web_search_tool_result`；
  - `encrypted_content` 由网关签发并验签；
  - 历史里的搜索结果还原成 WebSearch 的调用和结果；
  - usage 合并计入。
- **CC 客户端快速路径**：只有一个 web_search 工具、消息是 "Perform a web search for the query: Q" 的请求，直接走短进程。

### 阶段 3：测试

- **单元测试**：
  - 各字段到 CLI 参数和 EXTRA_BODY 的映射；
  - 入口的 400 清单；
  - tool_choice 的名字换算；
  - `encrypted_content` 签发和验签。
- **真实 CLI 测试**（假上游，`CCG_REAL_CLI`）。断言上游收到的请求就是 CLI 发出的，中继不改任何东西；覆盖：
  - 采样、format、thinking、effort、tool_choice、safeguards；
  - 子代理头和会话 ID U；
  - 图片拆分；
  - web_search 通用路径和快速路径；
  - 换容器后还原历史；
  - 关闭重试后的错误原样返回。
- 现有的 legacy 测试保持通过。
- 控制台：typecheck、lint、vitest。

### 阶段 4：上线

1. 升版本，提交、推送，在 OVH 部署。
2. `relay_passthrough_accounts=[23]`，用 #23 跑：
   - e2e 全部场景；
   - web_search；
   - `--advisor` 在真实环境下是否生效（决定 advisor 支持还是返回 400，第 9 节）；
   - 用户本机 cc-switch 环境下的原提示词。
3. 没问题后改成 `relay_mode=passthrough`，全量切换。
4. 稳定后另起一个提交删除 legacy：
   - 中继改写和桥接；
   - `pass_upstream_errors`；
   - 载体还原、主请求标记。
5. 同步更新 CONTRACTS、特性目录、SUBAGENT-DESIGN、RUNBOOK。

### 已知偏差（写进特性目录，不算缺陷）

- 系统消息：客户端连续的多条 system 消息，会被 CLI 合并成一条（内容不变）。
- 自定义工具：上游看到的名字仍是 `mcp__ccgateway__X`，和现在相同。
- 最后一条消息只有图片时：CLI 附加来源文字，大图会被缩放。
- web_search：结果是 CLI 的文字摘要，没有 page_age 和 citations 块。

## 15. 实现状态（2026-10-11）

阶段 0 到 3 已完成，阶段 4（#23 上线验证）未开始。

| 阶段 | 提交 | 内容 |
|---|---|---|
| 0 | `d94032278` | 策略 `relay_mode`、`relay_passthrough_accounts`；核心按账号算出生效值发给 Worker；控制台；特性目录 F-RELAY-PASSTHROUGH |
| 1、2、3 | 本次提交（ccgateway 0.1.29） | 透传主体、web_search 一次性进程、测试 |

**代码位置**：
- `engine/passthrough.go`：入口校验、400 清单、EXTRA_BODY 两份取值、thinking/effort 参数、图片拆分。
- `engine/passthrough_relay.go`：中继只读转发、错误与 fallbacks 闸门、订阅限额头过滤。
- `engine/web_search_passthrough.go`：web_search 计划、一次性进程、结果块签发与还原、快速路径、SSE 合成。
- `mod/hooks/register.js`：`turn.step` 按轮次设置 EXTRA_BODY、fallbacks；`tool.call` 把 WebSearch 交给 Worker。
- `mod/search/`：一次性搜索进程的 Mod。
- 会话 U：`Prepared.WireSession` / `runSession()`（`history.go`、`native.go`）。

**和前面各节相比，实现时定下的细节**：
1. **会话 U**：分支文件仍按原来的确定 ID 存放；运行时私有副本改名为 U 并把记录的 `sessionId` 改成 U，CLI 以 U 续接，结束后再改回分支文件的 ID。实测子代理分支第二次请求为 `prefix-hit`，头和 metadata 都是 U，只多一个 A'。
2. **diagnostics**：也走 EXTRA_BODY（原来在第 9 节没提）。`previous_message_id` 仍按原有归属校验。
3. **compaction**：和 context_management 一样由 CLI 决定，不发往上游（第 5 节的同类）。
4. **订阅限额头**：Worker 不再返回 `anthropic-ratelimit-unified-*`。核心对 ccgateway 账号本来就用用量查询取额度（§44），不读这些头，所以这里没有改核心的采样。
5. **fallbacks**：只有 429、500、502、503、504、529 之后才换下一个模型（与官方回退链一致），400 等直接返回；条目带 `speed` 返回 400（fast 对整个运行固定）。
6. **advisor**：服务端工具一律 400；`--advisor` 留到 #23 实测后再定（第 9 节）。
7. **web_search 结果块**：`encrypted_content` 是 `ccgws1.<payload>.<mac>`，第一个结果里带模型读到的完整文字和 WebSearch 的输入，所以换账号重建时 tool_result 与原来逐字一致（实测）。mac 用固定密钥，只标记"这是本网关的格式"：客户端本来就能写任意历史，这里不需要保密。没有链接的搜索没地方放文字，重建时按 CLI 的格式拼出（只有链接和提醒）。
8. **web_search 的错误**：主路径里一次性进程遇到上游错误，客户端收到 `web_search_tool_result_error`（429 为 `too_many_requests`，其余 `unavailable`），主回答继续；快速路径（CC 客户端自己的搜索请求）把上游错误原样返回，交给网关冷却和故障转移。
9. **web_search 的轮数**：每个请求最多 8 轮搜索；同一轮里既有搜索又有客户端工具时，搜索照常完成，整轮返回给客户端。
10. **流式**：有 web_search 时整条回答在最后一轮结束后一次发出（各轮内容要合并），其余请求照常边收边发。
11. **助手历史托管**（helper history）：passthrough 下不再需要，收到托管请求返回 400。之前在 legacy 下登记过托管链的会话，切到 passthrough 后这类请求会 400，需要客户端开新会话。
12. **Mod 校验**：CLI 对 `claude plugin validate` 不通过的 hooks 模块不报错、直接不加载（例如把 `$` 传给非顶层函数），表现为 "Mod did not acknowledge loading"。真实 CLI 测试开头先校验两个 Mod。
13. **响应压缩**（0.1.30，#23 实测发现）：CLI 请求带 `Accept-Encoding: gzip, deflate, br, zstd`，中继原样发出，真实 API 的错误体用 br、流用 gzip。0.1.29 只解 gzip/deflate 的错误体，br 错误体没解开，核心认不出官方错误，客户端收到通用的 "upstream returned HTTP 400"；流式响应带编码时也跳过了错误事件与用量观察。现在模型请求的响应先按 gzip/deflate/br/zstd 解码再观察，CLI 收到解码后的同一内容（去掉 Content-Encoding/Content-Length）；请求头不改。
14. **附件只用客户端的**（0.1.31，#23 子代理实测发现）：内层 CLI 会在待发的这一轮加自己的附件（提交署名提醒 `remote_session_change`、`agent_listing_delta`、`batching_reminder`、`auto_mode` 等），旧的 `unknown_gateway: pass` 策略让它们留在上游请求里。下一个请求把这一轮当历史按客户端原样重建时没有这些块，上游前缀从这一轮起就对不上，每轮只能读到系统提示的缓存：一个 40 轮的子代理任务缓存读 0.35M、写 1.42M。passthrough 下不再用附件策略：客户端附件原样保留，内层 CLI 自己的附件一律去掉（`hook_additional_context`、`deferred_tools_delta` 两种功能性附件照旧保留）。
15. **历史里的 `caller: direct`**（0.1.31）：上游给每个工具调用标 `"caller":{"type":"direct"}`，客户端下一轮会原样带回。0.1.30 把任何 `caller` 都当程序化调用拒绝，导致带工具的第二轮全部 400；现在只拒绝非 direct 的调用方。
16. **非流式 `max_tokens: 0`**（0.1.31）：API 只接受非流式的 `max_tokens: 0`（流式返回 "stream cannot be true when max_tokens is 0"），而 CLI 总是流式，所以入口 400；客户端自己用流式发的照常交给上游，由上游原样回错。
17. **web_search 用量**（0.1.31）：合并各轮和一次性进程的用量时，`cache_creation` 的 5m/1h 拆分也一起相加（之前只加了总数，按时长计价会不准）。
18. **0.1.31 复测（本机 CC → #23）**：
   - opus-5-5 子代理（21 次工具调用）每轮缓存读取逐轮增长，读 1.10M、写 0.13M，约 $1.12。修复前 fable 同类任务读 0.35M、写 1.42M，约 $19.9。
   - fable 复测仍有断点。原因在客户端：本机 CC 下一轮会把上一轮的 `batching_reminder` 从历史里去掉（`<total_tokens>…

First privately list…` 变成只剩 `<total_tokens>`）。网关发给上游的就是客户端发来的内容，直连官方 API 也会在这里断。
   - WebSearch（客户端快速路径）正常，答案带来源。
19. **仍存在的结构差异（属于"请求由 CLI 构造"本身）**：
   - **beta 头**：CLI 的 beta 头比客户端多出 `oauth`、`per-turn-control`、`dangerous-tool-use`、`cache-diagnosis`、`afk-mode` 等，并有重复项。
   - **per-turn effort**：`per-turn-control` 让 CLI 在第一条 system 消息上加 `output_config.effort`，值与顶层相同。
   - **响应多出的字段**：同样因为这些 beta，响应里多出 `safeguard_results`、`context_management`、`diagnostics`、`stop_details`、`caller`。
   - 本机客户端设置了 `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS=1`，所以它自己的 beta 头很短。
   - **决定（2026-10-10，用户确认）：保留，不去掉。**这些都是 CLI 自己的行为，去掉就要中继改请求或响应，违背透传原则。保留时上游看到的是默认配置的官方 CC；内层 CLI 不设 `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`，响应里多出的字段原样返回。CLI 每轮都在同一位置加 per-turn effort，前缀稳定，缓存不受影响（第 18 条已实测）。
   - **`dangerous-tool-use` 实测（#23，sonnet-4-6，自定义工具 `run_shell`）**：
     - 删库目录、`curl | sudo bash`、强推并清 reflog：`not_flagged`。
     - 把 `/etc/shadow` 和 AWS 凭证 POST 到外部地址：`flagged`，`explanation: "[Data Exfiltration]"`。
     - 被标记时只是标注：工具调用照常返回给客户端（`stop_reason: tool_use`）。CLI 没有拒绝、重试或多发请求（上游 1 次），客户端收到的 `safeguard_results` 与上游一致。
     - 是否执行由客户端决定，网关不改变行为。直接给 `rm -rf /` 这类指令时，模型自己就不调用（改成 echo 拒绝），轮不到审查。
20. **上游已回答却返回 502 "native transcript missing completed response"**（0.1.34，key 14 的 502 的来源）：
   - 核心对带 `fallback-credit` beta 的请求加 `X-CCGateway-Fallback-Credit-Track`，这类请求的 CLI 带 `--no-session-persistence`，不写会话记录；结束时网关仍去读记录，读不到就把上游的 200 变成 502，核心再按上游故障冷却账号。10-10 #22/#23 透传下 61 条这种 502 全部是这类请求（"离开后回来"总结、带 system 的主循环轮次）。legacy 下也有，所以比透传更早。
   - Claude Code 启动时发的非流式 `max_tokens: 1` 探测：上游没有内容就停在 max_tokens，CLI 不记录这条回答，同样 502。
   - 现在：不写记录的运行不再读记录；透传下读不到记录也照常返回上游的回答，只是这一轮不登记，下一轮按客户端历史重建。用例 `TestRealCLIPassthroughCreditTracking`、`TestRealCLIPassthroughMaxTokensStop`（用线上原请求复现后写成）。
21. **`thinking_disabled_compat` 在透传下生效**（0.1.35，用户决定）：见第 11 节。10-10 透传后用户本机 CC 的会话标题请求（opus-5-5 + `thinking: disabled`）全部 400。`TestRealCLIThinkingDisabledCompat` 分 legacy/passthrough 两种跑，去掉修复后 passthrough 子用例失败。

**测试结果（本机 CC 2.1.292，假上游）**：
- `TestRealCLIRelayPassthrough` 10 个用例全部通过：字段原样、tool_choice 只在第 0 轮、safeguards 与审查结论、`max_tokens: 0`、529 原样且不重试、400 原样、fallbacks、子代理 U/A' 与续接、最后一条消息里的图片不被改动（去掉拆分后用例失败）、入口 400。
- `TestRealCLIPassthroughWebSearch` 5 个用例全部通过：非流式与流式、换账号重建后 tool_result 逐字一致、非网关签发的结果 400、max_uses、快速路径只发 1 个上游请求。
- 单元测试 `TestPassthrough*`、`TestWebSearch*`、`TestNativeWebSearchTurns`；核心 `TestRelayModeSaveAndWorkerPolicy`；控制台 spec 15 个通过。
- legacy 路径：带 `CCG_REAL_CLI` 跑完整 engine 测试，只有 `TestRealCLI`、`TestMixedNativeHandoffRealCLI` 失败，与 HEAD 上的失败相同（本机 Windows 环境原因）；core gateway/ccgateway、contracts、worker、控制台（194 个）测试全部通过。

**下一步（阶段 4）**：部署到 OVH，设 `relay_passthrough_accounts=[23]`，按第 14 节阶段 4 验证（含真实 web_search 与 `--advisor`）。
