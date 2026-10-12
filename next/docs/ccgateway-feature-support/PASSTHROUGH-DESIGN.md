# CCGateway 原生请求表达（native-only 当前设计）

本文沿用原文件路径，但不再描述可选的 passthrough HTTP relay。
当前工作树只保留 native 模型执行：请求由内层 Claude Code CLI 构造并连接 provider；
Worker 不建立模型 HTTP 中继，也不改写 CLI 已发出的 HTTP 请求/响应。
旧 relay 主体与 `mod/search` 已物理删除，旧实现及原讨论、分阶段上线计划、旧验证结果
请查 `archive/ccgateway-relay-0.1.41@4b0e0967c`。归档不是当前可选回滚路径。

**状态边界**：这是代码合同，发布与验收证据另见 `ENVIRONMENT-RUNBOOK`。
native-only 已随 Core 0.1.121 / CCGateway 0.1.42 发布；Windows 2.1.296、隔离 Linux
2.1.292 回归和 #22 的本地 CC 文本/Read/图片/WebSearch 验收已通过。资源授权通过
隔离验证，不推定所有真实账号具备 Files/Skills 上游资格。#26 的 OAuth 刷新失败仍待处理；
不能用旧 relay 或其他账号的成功结果替代它的验证，也不改写历史部署证据。

## 1. 固定执行路径与保留组件

- `relay_mode` 仅接受固定 `native`，作为 wire guard；缺省/空值按 native。
  核心读历史配置时归一为 native，保存 API 和 Worker 拒绝显式旧模式。
- 不再有 legacy 默认、`relay_passthrough_accounts` / `relay_native_accounts`
  两套灰度名单、`pass_upstream_errors` 错误选项，也不在失败后回到旧 relay。
- Worker 能力仅声明 `execution_modes: ["native"]`；不再声明 helper history
  transport/payload 能力，相关路由已摘除。共享类型或核心托管存储仍存在不等于此 Worker 可执行。
- `engine/passthrough.go` / `parsePassthroughRequest` 是保留的共享 native 请求表达与准入代码；
  名字中的 passthrough 是历史命名，不是尚存的 HTTP relay 模式。
- 保留主 Mod、原生 parser、WebSearch、CLI EXTRA_BODY、私有原生会话与工具交接。
  主模型和搜索进程不将 `ANTHROPIC_BASE_URL` 覆盖为 loopback relay，保留合法账号地址。
- Mod 控制面仍是本地 HTTP：`CCGATEWAY_MOD_URL` / token、`127.0.0.1:8787` 本地放行、
  `NO_PROXY` 的 `127.0.0.1,localhost`、账号代理/sing-box 均保留。
  它们和 Files/Skills 管理 HTTP 都不是已删除的模型中继；不使用生产 CA、hosts 重定向或 uTLS。
- initialize 成功且 Mod ready 后才交用户输入，失败或取消时不提交输入。
  客户端工具交回客户端执行，不在 Worker 本地执行。

## 2. 错误、重试与观测

- 原生错误与用量来自 CLI stream-json：`assistant.error`、`assistant.request_id`、
  `result.api_error_status`、`stream_event`、`rate_limit_event` 等；`subtype=success`
  仍须检查 `is_error`。控制协议 request_id 不是上游请求 ID。
- 不保证原始 HTTP 状态码、错误体、全部响应头或订阅限额头逐字节透传。
  没有真实状态时保守返回请求级 502，不猜测认证失败/禁用账号；有真实状态时沿用账号分类。
  有效限流重置时间可生成有界 Retry-After，这是规范化提示，不是原始响应头副本。
- 已提交 SSE 响应头不能回填后来才观察到的上游 request_id；事件事实与诊断可记录它。
  配置、CLI 输出、会话日志不能冒充原始线上 HTTP 报文。
- 仍设置 `CLAUDE_CODE_MAX_RETRIES=0` 与 `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK=1`，
  但这不禁止全部 CLI 特性恢复（例如 400 后移除 thinking display / beta / effort 重发）。
  内部工具轮、搜索及显式回退也可能产生多个请求。Mod 的事后中止不是网络闸门。
- 按真实 SSE usage 合并各内部轮，不把重复 assistant 块或累计 `result.modelUsage` 再计一次。
  不从美元、次数或累计 modelUsage 反推缺失的细分用量。

## 3. CLI 参数与原生输入

| 客户端字段 | 当前表达 |
|---|---|
| model | `--model`；账号/模型资格由上游决定 |
| max_tokens | CLI 输出预算及受控 EXTRA_BODY；非流式零 token 预热不支持，见第 9 节 |
| thinking 缺省 | `--thinking disabled`，实际发出字段由 CLI/模型语义决定 |
| thinking 显式对象 | 完整对象经 EXTRA_BODY；CLI thinking 参数同时维持自身行为，不保证 CLI 恢复时仍保留原字段 |
| output_config.effort | `--effort`，缺省 high；支持 low/medium/high/xhigh/max |
| speed | 请求级 settings `fastMode` 与生成字段；缺省 standard |
| anthropic-beta | 按顺序去重后交 `ANTHROPIC_BETAS`；CLI 可加自己的 beta，非 HTTP 头原样复制 |
| system / 会话内 system | CLI system 输入与原生历史/Mod，结构按 CLI 构造 |
| 缓存 TTL | 请求有缓存控制时提取 5m/1h 到 `CLAUDE_CODE_PROMPT_CACHE_TTL`；不恢复断点 |
| additional_directories | `--add-dir` |

`thinking_disabled_compat` 保留 pass/omit：omit 只对已登记不支持 disabled 的
`claude-opus-5-5` / `claude-fable-5-1` 不将客户端 disabled 放入 EXTRA_BODY，
CLI 使用 `--thinking disabled`；不改成 adaptive。默认 pass 保留值，失败按第 2 节处理。
此兼容是请求表达，不是旧中继字段还原。

## 4. 每轮 `CLAUDE_CODE_EXTRA_BODY`

Worker 将“第 0 轮”与“后续轮”两份字段序列化为 JSON 字符串，经主 Mod 控制面交给 Mod；
`turn.step` 直接设置 `CLAUDE_CODE_EXTRA_BODY`，不在 Mod 里再次解析/重序列化数值，
CLI 自己读取并构造请求。
不接受调用方任意环境变量，也不让 Worker 替 CLI 拼装完整模型 HTTP 请求。

- 每轮字段：max_tokens、thinking、temperature/top_p/top_k、stop_sequences、
  service_tier、inference_geo、output_config（format/effort/task_budget）、output_format、
  safeguards、diagnostics；有效 speed 也进入表达。
- `tool_choice` 只在第 0 轮，强制工具名换为内层名，返回时换回客户端名。
- EXTRA_BODY 按顶层键替换，不是递归合并，因此携带完整对象；CLI 的 effort 设置还会
  参与 output_config 构造。不能推断任意字段组合或工具定义都可等价表达。
- `CLAUDE_CODE_DISABLE_STRUCTURED_OUTPUTS=1`；不使用 `--json-schema` 的合成工具/校验重试
  模拟 HTTP API format。CLI 特性恢复导致的字段变化仍服从第 2 节。

## 5. 必须保留的原生语义差异

- 数字接受 CLI 原生 JSON 精度，不承诺任意大整数逐值或逐字节保真。真实 CLI 2.1.296
  隔离回归观察到数值 `9007199254740993` 出站为 `9007199254740992`，同内容字符串未改变。
  Worker 到 Mod 的 JSON 文本保持原数值，最终 CLI 解析仍可能舍入；此限制不放宽请求
  倍数上限或 usage/cache 的严格计量校验。
- cache_control 断点、context_management、compaction 由 CLI 自身行为决定，
  不承诺精确执行客户端断点或编辑策略；TTL 保留不等于缓存命中。
- system 分块与 beta 由 CLI 构造，连续文本可能合并；不保证原始 HTTP 字段位置。
  会话内 `clear_at:next_user_message` 遇到后续任意 user（含纯 tool_result）失效；
  inline effort 在新输入 user 后生效，纯 tool_result 后设置则等下一条新输入。
  CLI 缓存附件不会自行重新渲染，内部搜索续轮因此先在下一次模型调用前暂停，再使用
  已落盘的原生记录同模型恢复一次。Worker 核验 Mod 回报的自有附件 UUID、来源、位置、
  会话、assistant 内容及完整 tool-result 配对，只删除该附件中的临时文本；保留持久
  系统文字、同名业务文本、已执行工具结果和用量，不重放搜索、fallback 或首轮 tool_choice。
  ccgateway-v3 确认后才允许输入，边界失败或取消不恢复。Windows 2.1.296、隔离 Linux
  2.1.292 的生命周期与失败用例已通过；不宣称未知 CLI 版本等价。
- 客户端 metadata 只用于选会话，不原样替换上游 CLI metadata。
- 客户端附件保留，内层 CLI 的非功能性附件移除；功能性附件仍用于原生流程。
  旧 attachment_source 选项不恢复 relay 的附件改写能力。
- 自定义工具通过 SDK MCP 注册，上游名为 `mcp__<prefix>__X`；可匹配的原生工具
  使用 CLI 定义，不承诺把任意客户端 schema 原样注入 CLI 工具列表。
- 历史 citations/文档/图片可作为已准入原生会话内容承载，但不代表已移除的
  “观察 HTTP 后恢复所有来源与块”的能力仍可用；签名资格由上游检查。
- 最后一条用户消息有 base64 图片且以文本结尾时，前部块写历史，尾部文本作新输入；
  不以文本结尾时接受 CLI 原生图片预处理（来源文字、缩放/重编码），不标记为完全等价。
- 内部 ToolSearch 不等于 API ToolSearch；内部轮次不等于核心 helper history 托管。

## 6. safeguards

safeguards 经 EXTRA_BODY 表达，`safeguard_results` 从 CLI stream_event 读取。
保留客户端工具身份校验，不修改审查结论、不授予本地执行。
内部 ToolSearch 可走现有原生流程；工具名变化及不能保持语义的组合仍受准入约束。
不再宣称纯 `mcp_servers` 服务端连接器或旧 relay 对任意客户端 schema 的保真支持。
真实提供商审查资格与效果须单独验证。

## 7. tool_choice 与显式模型回退

- auto/none/any/tool 与并行约束通过第 0 轮 EXTRA_BODY 表达，后续内部轮不继续强制。
  模型是否支持由上游/CLI 决定，不把某模型的隔离成功当作全模型资格。
- 快捷 WebSearch 只接受省略/auto 的选择；none/强制选择走普通执行路径，不改变用户意图。
- `fallbacks` 由 Worker 在当前 CLI 进程结束后协调，不再依赖 relay 错误闸门或 Mod 换模型。
  仅真实 429/500/502/503/504/529，且无主输出、无已执行内部搜索、无请求级失败、未取消时尝试。
- 每次从最初请求重新准入、建立私有历史；不继承失败尝试运行态。
  条目 null 删除对应覆盖（max_tokens:null 保留主限制），speed 可逐尝试配置。
- `fallback_credit_token` 兑换不支持；历史 wire 绑定/信用兑换记录不是 native 执行功能。

## 8. WebSearch（保留，不使用旧 `mod/search`）

支持登记的 web_search 20250305/20260209/20260318 请求表达，但不等同官方服务端工具的
所有语义。主 CLI 提供 WebSearch，主 Mod 拦截调用并交 Worker；Worker 在同账号启动
正常单轮 native CLI 模型流，由 EXTRA_BODY 声明唯一 server web_search，使用 auto，
结果回填主 CLI。快捷入口（单一 web_search、标准搜索提示）直接走该 native 搜索进程。
**不再承诺固定只发一次上游 HTTP 请求**，CLI 的原生搜索/恢复行为仍存在。

- 保留 allowed_domains / blocked_domains、max_uses、最多 8 轮主路径搜索、结果与错误块。
  user_location、response_inclusion、allowed_callers、延迟加载等不支持参数仍拒绝。
- 仅搜索子进程设置 `DISABLE_PROMPT_CACHING=1`，主会话缓存不变；不事后清零缓存费用。
  若仍报告缓存创建，要求真实且一致的 5m/1h 分项，否则请求级失败。
- 用实际 SSE usage 计量 token、缓存、实际搜索次数；搜索进程不强制关闭 thinking，
  保留已有 effort。thinking/redacted_thinking 不拼入搜索摘要或引用载荷。
- HTTP/进程失败或账务事实缺失终止请求；未执行搜索返回明确工具错误并保留已有用量。
  空结果与错误分开，不把普通文字/网址冒充搜索结果，也不凭空增加搜索次数。
- `ccgws1.<payload>.<mac>` 是网关历史格式，含必要结果文本，可用于重建 WebSearch 调用/结果。
  不能接收任意官方 encrypted_content 并假称等价；普通主路径的文字摘要、链接也不等价于
  完整官方 page_age/citations/encrypted_content 协议。原生快捷结果与主路径应分别验收。
- `web_fetch` 不支持：CLI WebFetch 不能冒充官方服务端 web_fetch。

## 9. 明确不支持的模型请求

入口拒绝不能原生表达的功能，不从旧目录中的 legacy 适配记录推导支持：

- assistant 预填充/末尾 assistant 续接载体；CLI 请求以用户轮结束。
- 非流式 `max_tokens:0` 预热：CLI 总是流式，旧非流 warmup 桥接已删除。
  客户端显式流式零 token 交 CLI/上游处理，不宣称有效预热。
- `fallback_credit_token`、`container`（含 container skills）、`mcp_servers`。
- code_execution、服务端 web_fetch、API tool_search_tool_*、advisor 等未由 CLI 表达的服务端工具；
  typed 工具集、PTC/non-direct caller、toolset_name、inline 工具定义、图片 transformations。
- 对应未支持的 server/MCP/code-exec/compaction/fallback 历史块；WebSearch 仅接收可还原的网关格式。
- helper history 托管：Worker 不再声明或挂载相关路由，不能因核心仍有协议代码而继续使用。
- count_tokens：插件不声明端点，核心不调度到 CCGateway；分组没有计数账号时返回
  404 not_found_error。Worker 的 400 `count_tokens is not supported by this gateway` 仅作兜底。

## 10. 会话与身份

客户端 metadata 推导会话 S，上游 U 按现有 v2 规则由 S 派生；分支按 (S, A) 管理，
子代理上游 A′ 由 (S, A) 派生。私有原生记录以 U 运行，主线程与子代理上游会话一致，
历史文件互不混入；子代理通过 `ANTHROPIC_CUSTOM_HEADERS` 设置 A′。
上游 metadata 与 session 头由 CLI 生成，不再在 relay 改写 U/A′。
本地 prefix-hit 仅是历史复用，不是提供商缓存命中或签名跨账号有效性的证明。

## 11. Files/Skills 独立非模型管理 HTTP

保留资源端点、租户/账号/issuer 归属与具体版本校验；仅允许 Files/Skills 操作白名单
和必要身份查询，不把模型端点作为兜底出口。资源管理可用不代表 container skills、
code execution 或生成产物模型链已经原生支持。

资源授权结合唯一受支持凭据来源、配置目录、provider、前后快照与指纹绑定校验；
身份查询和后续资源 IO 必须使用同一核验身份，profile 返回后再次检查指纹。
API key/env OAuth 使用 CLI `auth status --json`；stored OAuth 使用无用户输入的原生
初始化进程，等待刷新落盘后正常退出，不再追加短命 status 进程。stored OAuth 私有
刷新协议只放行已验收的 2.1.292/2.1.296；版本为 Worker 启动快照，运行期间不支持
外部原地替换 CLI，未知版本在认证前拒绝。仅观察刷新锁、不删除；CLI 的五分钟刷新
窗口决定是否必须等待旋转，凭据可用门限仍是 30 秒，不强制提高到五分钟。
**OAuth 刷新只允许 CLI 自身执行**；Go 管理 HTTP 不实现刷新、不发送模型探针、不抓取
模型 relay 认证。37 场景在 Windows 2.1.296 与断网隔离 Linux 2.1.292 各连续两轮通过，
不代表真实账号资源已验收或新版已上线。来源歧义、settings env/helper 注入、未知
helper/keychain、过期/临近过期令牌或绑定变化均失败关闭；文件凭据目录必须显式一致。
管理 HTTP 配置 HTTPS_PROXY 时使用所选代理，不按 NO_PROXY 绕过；账号透明出口
仍由网络层控制。生产 NO_PROXY 仅用于本地 Mod。外部并发轮换造成的上游拒绝不会
被改写成成功，损坏的持久
身份文件也不会未经验证自行重置。

## 12. 当前代码位置与待验收范围

- `engine/request_policy.go`、`passthrough.go`：固定 native guard、共享 parser、拒绝清单与 EXTRA_BODY。
- `engine/runner.go`、`runner_config.go`、`runner_session.go`、`native_events.go`：CLI 生命周期、Mod、原生观测。
- `engine/web_search_passthrough.go`、`native_web_search.go`：搜索计划、native 子进程与计量。
- `mod/hooks/register.js`：主 Mod，每轮表达与工具交接；旧 `mod/search` 不存在。
- `engine/resource_http.go`、`resource_carrier.go`、`resource_identity_carrier.go`：管理 HTTP 与授权边界。
- `worker/internal/server/features.go`：仅 native 的运行能力声明，无 helper history 能力。

contracts tests 只验证共享合同/目录，不证明 engine 全测、真实 CLI、资源刷新或部署验收。
仍需逐项记录固定模式/旧值拒绝、原生参数/历史/工具交接、CLI 错误与恢复、fallback、
WebSearch 计量、Files/Skills 授权与生命周期的验收结果。历史 relay 测试名称或归档中
“通过”的结果只属于当时实现，不能作为 native-only 当前完成证明。
