# CCGateway request policy（已归档）

> 归档（2026-10-24，审核 C5）：本文描述的 native 请求策略（附件擦除/替换、工具前缀、Beta 规则、tool_search 等）随 native 执行路径已从 engine 删除，生产只走 CLI 的 `request` 命令。本文不描述当前行为；现状见 [CONTRACTS §53.18–§53.21](CONTRACTS.md) 与 [REQUEST-MODES](../plugins/ccgateway/docs/REQUEST-MODES.md)。

本文描述当前代码契约，不是发布或部署验收记录。旧模型 relay 仅保留在
`archive/ccgateway-relay-0.1.41@4b0e0967c`；当前工作树的旧主体与
`mod/search` 已物理删除。native-only 构建已随 Core 0.1.121 / CCGateway 0.1.42
发布，本地 CC 经 #22 的文本、Read、图片和 WebSearch 验收通过，详见
`ccgateway-feature-support/ENVIRONMENT-RUNBOOK.md`。资源授权已通过两版 CLI 的
隔离验证，不等于所有真实账号具备 Files/Skills 上游资格；#26 的 OAuth 刷新失败仍待处理。

## 策略来源与固定执行契约

设置页仍通过 `GET/PUT /system/ccgateway/remote-config` 和
`settings:manage` 权限保存 `request_policy`。省略策略保留已保存的值。
认证宿主为每个模型请求写入 `X-CCGateway-Request-Policy`，覆盖调用方原值；
控制器仅在认证账号路由上传递它。公共调用方不能选择或覆盖内部策略。
该请求路径不写配置、不重建网络、不重启容器。

- `schema_version` 仍为 1。
- `relay_mode` 仅保留固定值 `native` 作为 wire guard，不再是执行选路开关。
  核心读取历史配置并生成有效策略时归一为 native；保存 API 拒绝显式
  `legacy` / `passthrough`，Worker 也拒绝非 native 值；缺省或空值按 native。
- `relay_passthrough_accounts`、`relay_native_accounts` 两个灰度名单及
  `pass_upstream_errors` 已不再参与策略或执行。旧 JSON 中残留这些键不代表
  仍可选路、回滚或切换错误处理。
- `Config.WorkerRequestPolicy(accountID)` 对所有账号下发相同的有效执行模式。
  当前 Worker 的 `execution_modes` 只声明 `native`；缺字段不能推定 native 支持，
  声明也不是模型/提供商/实际运行验证。
- Worker 不再声明 helper history transport/payload 能力，相关路由已摘除。
  核心或共享 contracts 中残留的托管历史协议属于历史兼容记录，不是当前 Worker 功能。

## 当前默认值与字段行为

核心有效默认策略：`unknown_field=reject`、`allow_fast=true`、
`allow_effort=true`、`tool_search=request`、`custom_tool_prefix=ccgateway`、
`thinking_disabled_compat=pass`、`relay_mode=native`；`betas` 来自代码固定的
`features.BetaRules()`，不是本文维护的第二份清单。

- 核心始终把 `allow_fast` / `allow_effort` 置 true，旧保存的 false 被忽略。
  Worker 缺少宿主策略时自身默认 `allow_fast=false`，不能把两者混为一谈。
- `speed` 为 `fast` / `standard` 时配置请求级 CLI `fastMode`，并通过原生请求表达；
  未提供时显式保持 standard，避免会话遗留状态。实际资格与定价由上游决定。
- `output_config.effort` 支持 `low`、`medium`、`high`、`xhigh`、`max`，
  配置 `--effort`；缺省为 high。format/task_budget 等通过受控 EXTRA_BODY 表达，
  不使用 CLI 合成 StructuredOutput 工具模拟 API format。
- `betas` 是历史可编辑字段：核心与 Worker 都重新使用代码固定规则，显式空数组
  **不再表示禁用所有 beta**。native parser 保留客户端 beta 的顺序并去重后交给
  `ANTHROPIC_BETAS`；规则用于 ToolSearch/细粒度工具流等 CLI 设置，
  不是 native 的 beta 转发白名单。核心和设置页已移除 `unknown_beta`，历史配置中的
  该字段不会再次保存或下发；CLI 仍可能附加自己的 beta。
- `unknown_field` 接受 `reject` / `ignore`，控制不支持的顶层字段；非法或不能承载的
  已知内容仍会被拒绝。native 对 `output_config` 的完整对象走独立解析与 EXTRA_BODY，
  不应沿用旧策略“忽略会剥离所有未知 output_config 子字段”的承诺。
- `tool_search` 控制 CLI 内部 ToolSearch，允许 `request`、`false`、`true`、
  `auto`、`auto:0` 至 `auto:100`，不等于支持 API `tool_search_tool_*` 服务端工具。
- 核心和设置页已移除附件/环境来源、未知附件策略字段，历史值不会再次保存或下发。
  native 固定保留客户端附件，移除内层 CLI 的非功能性附件，不恢复旧来源选路。
- EXTRA_BODY 以原始 JSON 字符串经 Mod 传给 CLI，不在 Mod 内额外解析/重序列化。
  数值最终遵循 CLI 的 JSON 精度：超过可无损表达范围的整数可能被舍入；例如
  `9007199254740993` 的真实 CLI 出站为 `9007199254740992`，同内容字符串保持不变。
  这不放宽 max_tokens 等请求上限，也不改变真实 usage 与缓存计量校验。
- 会话内指令保留语义而非原始 HTTP 字段：`clear_at:next_user_message` 在后续任何 user
  （包括纯 tool_result）出现后失效；inline effort 在新输入后生效，纯工具结果后设置
  则等待下一条含新输入的 user。内部 ToolSearch/WebSearch 续轮在下一次模型调用前暂停，
  由 Worker 核验自有附件 UUID 与完整原生工具结果后，仅清除该附件中的临时文本，
  同模型恢复一次；保留持久指令、同名正文、工具结果和累计用量，不重放搜索或强制工具。
  Mod 协议为 ccgateway-v3，旧协议不能放行用户输入；身份/落盘/取消异常失败关闭。
  credit 跟踪仍限定单次模型生成，与内部 ToolSearch/WebSearch 的组合在生成前拒绝。
- `thinking_disabled_compat=omit` 仅对已登记的 disabled 不支持模型
  （`claude-opus-5-5`、`claude-fable-5-1`）移除客户端 `thinking: disabled`，
  不把它改成 adaptive；默认 pass 保留客户端值。此策略是 native 请求表达，
  不是模型 HTTP 中继。上游拒绝按 CLI 可观察错误规范化，不承诺原始 HTTP 错误体。

## 执行、错误与资源边界

共享 native parser、CLI 参数、每轮 `CLAUDE_CODE_EXTRA_BODY`、主 Mod 与 WebSearch
仍保留。Runner 清理继承的请求改写环境，仅设置受控的请求级值。
主模型及搜索进程保留合法账号 `ANTHROPIC_BASE_URL`，不再改写为 loopback relay。
Mod 控制 HTTP、账号代理与 `NO_PROXY` 中的 `127.0.0.1,localhost` 仍需要，
不能因删除模型 relay 一并移除。

错误和用量来自 CLI stream-json，不提供原始模型 HTTP headers/body。
`CLAUDE_CODE_MAX_RETRIES=0` 与禁用 nonstreaming fallback 不排除 CLI 的特性恢复重发、
内部工具轮或显式模型回退；不能承诺首次错误后只发一次请求。
无法观察到真实状态时返回请求级错误，不猜测认证失败，也不自动切回旧 relay。

Files/Skills 使用独立、白名单限定的非模型管理 HTTP；不是通过模型请求载体抓取凭据。
资源授权检查唯一支持的凭据来源与前后身份绑定。API key/env OAuth 使用
`auth status --json` 核验；stored OAuth 只使用无用户输入的原生初始化进程，不再追加
可能再次触发刷新并提前退出的独立 status 进程。stored OAuth 刷新生命周期仅放行
已验证的 CLI 2.1.292/2.1.296；未知版本在认证前失败关闭，升级 CLI 后必须重新验收。
OAuth 刷新只能由 CLI 自身完成：管理 HTTP 不自行刷新、不发模型探针、不清刷新锁。
Worker 只观察固定版本的刷新标记，必要时等待旋转落盘，并在进程退出及 profile 查询后
重查指纹；令牌须仍有超过 30 秒有效期。来源不明、刷新未完成或绑定变化时失败关闭。
37 场景已分别在 Windows 2.1.296、隔离 Linux 2.1.292 连续两轮通过；这不替代
真实账号资源访问验收，也不证明尚未支持的 CLI 版本兼容。

逐项表达、语义差异与拒绝清单见
`ccgateway-feature-support/PASSTHROUGH-DESIGN.md`。非流式 `max_tokens:0` 预热桥接、
helper history、服务端 MCP/PTC/container 等旧适配不能据历史目录说明宣称当前支持。
