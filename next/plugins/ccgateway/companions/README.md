# CCGateway 运行组件

平台插件代码位于 ..；核心管理与连接发现位于 ../../../server/internal/ccgateway；配置页面位于 ../../../web/src/views/ccgateway。它们不实现 Claude Code 进程交互。

本目录按运行职责分开：

- engine/：共享交互引擎（Go 包 ccgateway/engine），负责 Anthropic 请求、Claude Code 协议、历史、工具、system、响应和诊断日志；由 Worker 在账号容器内执行。
- worker/：账号 Worker 独立 Go 模块（ccgateway/worker），负责配置、生命周期、HTTP 服务及健康检查，依赖父模块的 engine。
- mod/：嵌入引擎的 Claude Code Mod。
- catalog/：原生工具定义目录。
- controller/：Python 容器控制器、网络管理和测试，独立 Docker 构建上下文。
- egress/：sing-box 出口代理镜像和入口脚本，独立 Docker 构建上下文。
- main.go 与根 Dockerfile：原独立命令的兼容入口，调用同一 engine；账号部署使用 worker/Dockerfile。

构建入口（仓库根目录执行）：

    docker build -f next/plugins/ccgateway/companions/worker/Dockerfile -t ccgateway-worker:dev next/plugins/ccgateway/companions
    docker build -f next/plugins/ccgateway/companions/controller/Dockerfile -t ccg-controller:dev next/plugins/ccgateway/companions/controller
    docker build -f next/plugins/ccgateway/companions/egress/Dockerfile -t ccgateway-egress:dev next/plugins/ccgateway/companions/egress

目录调整不修改镜像引用、容器名称、数据卷路径或已有授权。CI 保留 ccgateway-app 注册表名称，由 Worker 入口构建。旧交接及历史验证文档中的旧路径仅描述当时状态。

# CCGateway 内建插件

从 `D:\projects\golang\ccgateway` 的 2026-10-03 工作副本导入 Go 网关和 Mod；此目录独立维护，不包含原项目的本地数据、可执行文件或凭据。

管理入口位于 Sub2API「插件管理」中的 CCGateway 卡片，随宿主内建，无需上传 `.s2plugin`。原有可安装插件继续使用现有 OpenAI OAuth 传输协议。CCGateway 作为 Docker sidecar 提供 Anthropic Messages，通过普通 API Key 账号进入宿主调度链路。

## 本地 Docker

在 `deploy/.env.ccgateway` 中填写两个不同的随机密钥（不要提交该文件）：

```dotenv
CCG_API_KEY=<网关调用密钥>
CCG_ADMIN_KEY=<独立管理密钥>
```

从 `deploy` 目录运行：

```sh
docker compose --env-file .env.ccgateway -f docker-compose.ccgateway.yml up -d --build
```

宿主后端也需要设置相同的 `CCG_API_KEY` 和 `CCG_ADMIN_KEY`，然后启动或重启后端。后端默认连接 `http://127.0.0.1:8787`。

后端本身运行于 Docker 时，可将此 compose 文件与现有部署文件合并：

```sh
docker compose --env-file .env --env-file .env.ccgateway -f docker-compose.local.yml -f docker-compose.ccgateway.yml -f docker-compose.ccgateway-host.yml up -d --build
```

其中主服务镜像必须包含本次后端和前端改动；现有远端发布镜像不会自动包含工作区代码。已有账号的 base_url 不会随环境变量自动迁移，迁移网关地址后应在账号管理中更新。

镜像固定 Claude Code 2.1.288，使用非 root 用户；授权与历史保存在 `ccgateway-data` 专用卷。普通 `down` 保留数据，`down -v` 会清除授权与历史。宿主不需要 Docker socket，也不会读取用户现有的 Claude 凭据。

## 授权和使用

1. 打开插件管理，确认容器连接状态。
2. 点击获取授权链接，在浏览器完成 Claude 授权。
3. 粘贴完整的 `code#state`，点击完成授权。授权链接十分钟过期；需要保持同一个网关实例，重启后应重新发起授权。
4. 点击接入账号调度，创建 Anthropic API Key 账号。该账号使用网关调用密钥，真实 OAuth 凭据仅由容器内 CLI 管理。
5. 在账号管理中调整分组，使用所属分组的 Sub2API API Key 调用正常 `/v1/messages`。停用该账号即可停止调度；退出授权会影响该容器关联的所有账号。

每个容器仅有一套授权，不是多账号池。账号创建可重复操作以供不同调度配置使用。页面不保存授权码或管理密钥。后端管理接口继承管理员认证、审计和敏感操作二次验证；管理端口与模型端口共用监听器，凭据各自独立。

支持文本、图片、客户端工具往返、SSE 和本地历史缓存。不支持扩展思考、`anthropic-beta`、`tool_choice:any/tool`、`/v1/models`、`/v1/messages/count_tokens`；完整 Claude Code 客户端的所有功能不在当前协议范围内。容器健康检查只证明服务在线，授权状态不证明模型权限，实际模型调用仍需验证。

授权 RPC 是 Claude Code 内部协议：`initialize` → `claude_authenticate` → 同进程 `claude_oauth_callback`。升级 CLI 后需重新验证。登录进程持有 PKCE verifier；服务验证 URL、state、会话 ID 与有效期，回调后销毁进程。授权中间状态仅在内存中，不能将多个副本放在随机负载均衡后。

## 管理接口与错误代码（2026-10-05）

管理端点均需 `Authorization: Bearer <CCG_ADMIN_KEY>`。所有状态与错误都是英文代码，界面按代码做多语言；`message` 只是英文兜底说明，不含中文，也不应被匹配。

- `GET /admin/status` → `{"healthy":true,"logged_in":bool,"auth_method":string}`
- `GET /admin/auth/session` → `{"session":{"session_id","url","expires_at"}}` 或 `{"session":null}`（登录进程已退出或过期即为 null）
- `POST /admin/auth/start` → `{"session_id","url","expires_at"}`；已有未过期的待完成授权时直接返回同一会话（幂等）
- `POST /admin/auth/complete` `{"code","session_id"?}` → `{"success":true}`；`session_id` 可选，给出时必须与当前会话一致
- `POST /admin/auth/cancel` `{"session_id"?}` → `{"success":true}`；幂等，请求体可为空；`session_id` 与当前会话不同时不影响当前会话
- `POST /admin/auth/logout` → `{"success":true}`

错误格式：`{"type":"error","error":{"type":"<code>","message":"<English>"}}`，HTTP 400（未知端点 404 `not_found_error`，管理密钥错误 401 `authentication_error`）。

| 代码 | 含义 | 之后的会话 |
|---|---|---|
| `invalid_request` | 请求体不是合法 JSON 或缺少 `code` | 不变 |
| `session_not_found` | 没有待完成授权、已过期，或 `session_id` 不一致 | 无（不一致时原会话保留） |
| `invalid_code` | 不是 `code#state`，或 state 不属于本次授权 | 保留，可重新粘贴 |
| `auth_rejected` | Claude Code 拒绝了授权码 | 结束 |
| `auth_process_failed` | 登录进程无法启动、已退出或超时 | 结束 |
| `invalid_auth_url` | 登录链接校验失败 | 结束 |
| `status_unavailable` | 无法读取 `claude auth status` | - |
| `logout_failed` | `claude auth logout` 失败 | - |

模型接口（`/v1/messages`）返回给 Anthropic 客户端的错误格式不变。

Claude Code 账号改为录入时授权：编辑器先创建草稿运行环境（键为 `d` + 16 位小写十六进制），启动容器、完成上述授权后才保存账号，账号沿用草稿键；失败、取消或放弃的草稿由核心定期经控制器 `DELETE /accounts/<key>` 清理。控制器接口、`GET /accounts` 列表、`GET /health` 以及镜像更新只重建业务容器、保留数据卷与登录，见 `runtime/README.md`。

## 验证

```sh
go test ./...
go vet ./...
```

原网关真实 CLI 测试使用 `CCG_REAL_CLI` 指定可执行文件；未配置时跳过。真实浏览器 OAuth 和 Docker 启动验证需要可用的 Docker 环境及用户完成授权。

## SSH 远程 Docker 与代理

下述桥接地址与环境变量说明针对 `backend/` + `frontend/` 的旧版内建 CCGateway。next 核心从 0.1.15 起提供独立管理页和 `ccgateway` 插件，接入方式见下一节。

远程主机用本仓库 Dockerfile / Compose 部署容器，名称固定为 `ccgateway`，端口只绑定远程 `127.0.0.1:8787`。页面可以检查 Docker/Compose、查询状态、启动、停止、重启、读取日志；安装 Docker、构建镜像与首次创建容器仍使用 Compose。后端和远程容器需配置相同且互不相同的 `CCG_API_KEY`、`CCG_ADMIN_KEY`。

在插件卡片选择 SSH，填写主机、端口、用户名及密码或私钥。探测指纹不会发送凭据；通过已有可信连接核对指纹后，再点击使用并保存。SSH 凭据使用宿主既有加密服务持久化，页面只返回是否已配置。留空保留原凭据只适用于相同主机、用户、认证方式和指纹；更换目标必须重新提供凭据。

Docker 操作复用原生 Docker CLI；SSH 使用 `golang.org/x/crypto/ssh`，HTTP/SSE 使用 Go `net/http` 与 `httputil.ReverseProxy`。管理请求和模型请求通过 SSH direct-tcpip 到远程回环端口，无需暴露 Docker TCP API。可复用封装在 `backend/internal/remotedocker`，插件适配层在 `backend/internal/ccgatewayremote`。新接入账号统一通过宿主内部桥接地址，随后切换本地/SSH 会作用于新请求。旧版已创建的直连账号需要重新接入或更新 base_url。

### Claude Code 出站代理

代理控制远端 Claude Code 访问模型服务的出口，与 SSH 连接配置独立。支持三种模式：

- 继承：使用容器启动环境中的代理变量。
- 直连：移除子进程的 HTTP_PROXY、HTTPS_PROXY、ALL_PROXY、NO_PROXY 及小写形式。
- 指定代理：设置 HTTP_PROXY / HTTPS_PROXY 及小写形式，移除 ALL_PROXY，保留容器 NO_PROXY；支持 HTTP/HTTPS 地址和可选用户名密码。

代理地址必须能从远端容器访问；127.0.0.1 指容器自身。Claude Code 官方不支持 SOCKS，因此界面与后端均拒绝 SOCKS 地址，参见 [官方网络配置](https://code.claude.com/docs/en/network-config)。代理界面保存后清空输入框，只显示脱敏地址；在已启用指定代理时留空保存保留原地址。

每个模型请求或授权子进程启动时读取配置快照；新请求使用新配置，已运行请求保持原配置，无需重建或重启容器。正在进行的 OAuth 授权要重新发起才会应用新代理。

配置通过管理接口 `/admin/proxy` 更新，以 AES-GCM 加密保存到数据卷内的 `proxy.enc`。加密密钥从管理密钥派生；更换 CCG_ADMIN_KEY 前需安排配置迁移或重置，旧文件不能用新密钥解密。SSH 密码/私钥和代理 URL 不进入管理审计请求体。

### 2026-10-03 验证记录

- 后端管理/服务/审计测试、远程 SSH 框架测试、Go vet 与宿主编译通过；前端 16 个相关测试、类型检查和生产构建通过。
- cc-max 上密码和私钥登录均通过；Docker 状态、启停、重启、日志操作以及 SSH HTTP 健康检查通过。
- Linux 下 SSH 框架和代理模块 `go test -race` 通过。
- 测试容器使用 `ccgateway:ssh-proxy-test`，数据卷保留，端口仅绑定回环，日志轮转 20m × 3。
- 经 SSH 管理接口验证指定代理 → 容器重启后配置与 revision 保留 → 直连 → 继承，最终恢复继承。此项使用不可用的模拟代理地址，仅验证配置，不向它发送模型请求。
- 容器内 Claude Code 2.1.288 的真实 CLI 测试通过：7 次本地模拟模型请求，覆盖历史、system、工具往返和 SSE，0 次云端模型调用。
- 尚未完成真实 OAuth 登录、真实出站代理或收费模型调用；未将这套旧版宿主界面部署到 OVH next 核心。

## next 核心 0.1.15

系统设置与插件列表均提供 CCGateway 管理入口，可保存 SSH 连接、管理 Docker、切换代理及完成 Claude OAuth。SSH 身份和 sidecar 的两个密钥用核心既有主密钥加密保存到共享设置，各节点读取同一配置，无需更改 gateway 环境。

随核心分发的 `ccgateway` 插件初始为禁用；启用后提供 `managed` 账号类型。管理员完成 Claude 授权后可在管理页接入账号，再到账号管理配置分组和模型。账号本身不存储 SSH 或 sidecar 密钥，所有托管账号共享当前远程实例。仅支持 Messages；token 预估和模型发现未开放。

模型调用仍经过正常的鉴权、调度、限流及用量计费。插件返回固定虚拟目标，核心仅对匹配的插件、账号类型和目标调用受限 SSH 传输，其余账号继续使用原有上游访问检查。没有额外的公开桥接端口。账号测试使用相同传输。

## 原生会话恢复（2026-10-04）

客户端自定义工具统一通过 SDK MCP 虚拟服务注册，使用客户端的名称、描述和完整 JSON Schema。标准 `mcp__server__tool` 按第一个分隔符拆成服务名和工具名，模型及 HTTP 响应均保持完整原名。普通工具归入 `ccgateway` 服务，模型名称为 `mcp__ccgateway__<客户端名称>`，HTTP 响应恢复客户端原名，历史导入使用同一映射。不完整的 MCP 类似名称按普通工具处理。映射后的名称冲突返回 400，例如普通 `foo` 与 `mcp__ccgateway__foo` 不能同时声明。

SDK 服务按请求声明分组，不连接客户端实际的 MCP 地址；工具执行仍由客户端负责。每个 `tools/list` 只返回对应服务本轮的工具，未声明服务或 `tools/call` 回调会被拒绝。`--tools` 明确列出本次完整工具名称；`tool_choice:none` 不注册任何 SDK 服务。Mods 不注册工具，只保留执行拦截、就绪确认和单轮推理控制。

CCGateway 请求策略的 `custom_tool_prefix` 可配置普通自定义工具的 MCP 服务名，默认/空值为 `ccgateway`。例如设为 `mytools` 后，普通 `lookup` 注册为 `mcp__mytools__lookup`，响应仍恢复为 `lookup`；原生工具和客户端已有 `mcp__server__tool` 名称不变。配置允许 1–32 位 ASCII 字母、数字、下划线、短横线，不允许连续两个下划线。控制台保存后由核心随每次请求下发，外部客户端不能覆盖核心配置。前缀改变后从客户端完整历史重建原生会话，不复用包含旧 wire 名称的 JSONL。

原生工具按所运行 CLI 版本的已验证名称和完整输入 schema 自动匹配，无需额外请求头。工具描述不参与匹配，原生和 SDK MCP 路径均通过 Mod `tool.describe` 精确保留客户端描述；`defer_loading` 单独控制发现。不匹配则使用 SDK MCP，保留客户端定义；未验证的新版本或目录外工具也使用 SDK MCP。当前目录来自 CLI 2.1.288、2.1.292 的隔离实际请求；2.1.292包含普通headless和SDK stream-json等模式观测到的29个名称、32个schema变体，不代表所有平台/权限下都可用。旧 `CCG_NATIVE_TOOLS` / `X-CCGateway-Native-Tools` 的显式选择仍接受原有校验，但不会授权容器执行工具。原生名称和参数还会与 CLI 实际出站请求再次比较。运行时缺失、重复或参数不兼容时，仅在尚未向上游发送模型请求且未开始客户端响应的情况下，允许一次退回 SDK MCP 并重建工具历史，记录 native_tools_mcp_fallback；已开始上游推理的请求不得自动重放。

原生和 MCP 客户端工具统一由 Mods 的 `tool.call` 拦截，返回的临时拒绝结果不进入客户端续聊历史；HTTP 返回原始 `tool_use`，下一次请求恢复客户端实际 `tool_result`。只有网关自身的工具发现和结构化输出辅助工具允许在 CLI 内执行。开启 Worker 请求日志后，每个请求目录的 `tool-routing.json` 记录名称和原生匹配结果，`events.jsonl` 的 `mod_tool_call` 记录参数、路由、交接决定及是否在容器执行。关闭日志后不保留这些记录。SDK MCP 负责定义注册，Mods 负责执行拦截，不使用 `$.tool.register` 重新注册原生工具。

普通请求使用 Claude Code 自己落盘的 JSONL 续聊；网关只保存客户端消息指纹与原生节点的对应关系。会话记录保留 24 小时并受总量上限约束，与供应商的 5 分钟 / 1 小时 token 缓存有效期无关。

- `messages` 精确接续当前已提交节点：恢复同一个原生 session，仅提交新增用户消息。
- 从旧节点继续或修改中间历史：选取最长匹配的已提交助手节点，原生 fork；新后缀来自客户端，原分支不变。找不到节点时导入完整客户端历史。
- 每次应用当前 system、内置工具与 MCP 定义。快照开关优先逐段比较所恢复检查点的 `prompt_snapshot.systemPrompt` 与请求 system；内置环境消息不参与比较。相关快照全部一致且不含工具定义时开启，否则关闭。配置变化不会单独触发历史重建，但可能影响上游缓存。
- 没有原生提示词快照时，比较该检查点此前成功请求的 system 摘要。证据按请求 `cache_control` 的 5 分钟或 1 小时 TTL 失效（未指定时 5 分钟）；缺失、过期或不一致均关闭。证据随检查点持久化，按用户/API Key/会话及消息历史隔离，失败请求不会更新。证据失效不删除 24 小时原生历史。
- CLI 2.1.288 的隔离 SDK 实验确认，多段 system 和空值在专用快照字段中原样保存，没有内置提示词混入。`off` 不会刷新旧快照，因此 `A on → B off → B on` 会用回 A；已有快照与当前 system 不一致时，历史请求缓存不能覆盖这个判断。
- 含 `tools` 的完整快照可能恢复旧的同名 MCP schema，即使本次初始化传入了新定义；此类快照保守关闭。当前提交到最后助手节点的原生前缀保留早期 system 快照、排除后置完整快照，隔离测试确认 schema 更新正常。关闭 CLI 快照不等于关闭上游 token 缓存。
- 保留 CLI 的环境等原生上下文，不再通过 Mod 删除附件。CLI 进程完成落盘后，清理网关拒绝工具执行产生的未提交结果（包括并行工具块之间交错写入的记录）。客户端工具结果回传时补齐待输入的工具配对，旧历史记录不重写。
- Mod 在模型请求边界阻止 CLI 因输出上限等原因自动发起第二次推理；待第一条响应原生落盘后完成 HTTP 响应。
- CLI 返回结果后先排空标准输出再等待退出，避免尾部输出填满管道；请求取消时关闭读取端，避免继承管道的后代进程阻塞结束。
- 清理内部工具结果时保留同条记录中的其他内容。CLI 中断留下未提交尾部时，从已提交检查点分支恢复，不吸收失败尾部，也不覆盖原分支。
- 同一原生会话只允许一个写入者；并发的历史分支使用独立会话。显式会话 ID 的重叠请求仍返回 409。
- next 插件通过宿主认证后的用户与 API Key ID 隔离会话范围，控制器透传该内部范围。客户端没有提供 `X-CCGateway-Session-ID` 时，可在自己的范围内按完整历史匹配；提供时则进一步隔离会话。
- 原生存储格式升级后不继续使用旧的重建快照，首次请求会导入客户端携带的完整历史。CLI 的原生文件与指纹索引均保存在账号的数据卷内。

后续加固与条件快照验证：Windows Go 测试与 vet 通过；Linux 隔离容器内完整测试通过，包括真实 CLI 的 38 次本地模拟模型调用（无云端调用）。新增覆盖原生定义实际匹配、描述/schema 不匹配降级 SDK MCP、同会话原生转自定义后的工具结果保留、已有 MCP 名称保留、多服务同名工具隔离、四工具并行回传及名称冲突拒绝；同名 MCP schema `string → number → number`，以及系统提示词 `A → A → B → B` 对应快照 `off → on → off → off`；单元测试覆盖 5 分钟/1 小时证据失效、重启和检查点隔离。进程生命周期回归覆盖 4 MiB 尾部输出，以及后代持有输出管道时的请求取消；两项也在生产镜像的 node 用户下通过。以上加固已随 OVH v0.1.21 与 cc-max 新运行镜像部署，公网工具/缓存/业务提示词及预扣结算验收见 next/docs/audits/2026-10-02/MULTINODE-VALIDATION.md §24.7。

发布需同时更新 CCGateway 运行镜像、远程控制器和随核心分发的插件 0.1.2，才能在公网入口启用完整的会话标识透传和调用者隔离。

本次验证：Go 测试与 vet 通过；Claude Code 2.1.288 对本地模拟上游的 23 次调用覆盖正常续聊、旧节点分支、中间编辑、全量导入、system/MCP 覆盖、移除旧工具、原生/并行工具回传、重启恢复、无自定义会话头、调用者隔离及输出上限的单次推理约束。远程控制器 4 个单元测试通过。

在 cc-max 的隔离账号容器中，经实际 sing-box 和账号代理访问真实上游，五轮客户端工具测试的 cache_read_input_tokens 为 0、8639、8808、8950、9120；四次客户端文件操作全部执行并验证，最终文件内容和早期历史标识正确。此验证未部署至 OVH 公网入口，生产账号镜像未更换。

## API 能力映射（2026-10-06）

插件设置展示请求体参数与 Anthropic Beta 请求头。支持的 Beta 名称及处理方式固定，白名单外可选择忽略或返回错误；不使用 CLAUDE_CODE_EXTRA_BODY，也不接受任意环境变量。列出的支持项代表已适配的行为，不能自行添加名称或更改处理方式。

| API 参数 | Claude Code 配置 |
| --- | --- |
| max_tokens | CLAUDE_CODE_MAX_OUTPUT_TOKENS |
| thinking.budget_tokens | MAX_THINKING_TOKENS、CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING |
| cache_control.ttl | CLAUDE_CODE_PROMPT_CACHE_TTL（5m/1h） |
| output_config.effort | --effort |
| speed | --settings fastMode（需管理员开启） |
| output_config.format、旧 output_format | --json-schema、MAX_STRUCTURED_OUTPUT_RETRIES=1 |
| tools[].defer_loading、advanced-tool-use Beta | ENABLE_TOOL_SEARCH、tool.describe |
| 已允许的额外 Beta | ANTHROPIC_BETAS |
| fine-grained-tool-streaming Beta | CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING |
| context-1m Beta | CLAUDE_CODE_DISABLE_1M_CONTEXT、CLAUDE_CODE_MAX_CONTEXT_TOKENS |

结构化输出使用 CLI 内部纯格式校验工具，必要时允许一次原生格式整理续轮，成功后再次校验 JSON Schema 并返回 text JSON；禁止外部 schema 引用。此类请求按完整客户端历史重建，不复用含内部格式工具的原生检查点。工具搜索只允许发现已注册的定义，最多 3 次；客户端工具执行仍被拦截，内部 ToolSearch 不对外返回，额外模型调用计入用量。两种模式均缓冲 SSE，验证完后输出标准事件。提示缓存断点由 Claude Code 管理，不保证客户端逐块断点或上游命中。Files、Batch、托管 agents、服务端工具等专用 API 并非通过 Beta 名称就能实现。

官方依据：[环境变量](https://code.claude.com/docs/en/env-vars)、[结构化输出](https://code.claude.com/docs/en/agent-sdk/structured-outputs)、[工具搜索](https://code.claude.com/docs/en/agent-sdk/tool-search)。Claude Code 2.1.288 的隔离回归共 48 次本地模拟模型请求，验证普通/SSE 结构化输出和工具搜索用量；无真实云端模型调用。

### messages 中的 system（2026-10-06）

位置规则与 [Messages API](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages) 一致：连续的 system 必须紧跟 user（含 tool_result）之后，并位于 assistant 之前或数组末尾，否则返回 400。位置、空内容、非文本块等错误的文字与官方 API 实测返回一致（`system_validation.go` 中的模板），序号为客户端原始数组中的位置。仅接受文本；`output_config`、`clear_at` 等字段返回 400，不静默丢弃。

- 已提交历史中的每条客户端 system 消息各写成一条 Claude Code 自己为 Mod 上下文落盘的 `hook_additional_context` 附件记录（`renderedRole: system`），放在原位置；记录的 `content` 是该消息的文本块数组，`rendered` 与 Mod 生成的一致（单条、带 `prompt.submit hook additional context:` 标签、块之间换行）。
- 最后一轮（最后一个 assistant 之后）的 system 由 Mod 的 `prompt.submit` context 附加,模型请求前写确认文件，网关核对；完成后还核对原生记录确实多出这条附件，任一缺失即失败。Claude Code 一次提交只生成一条记录，所以最后一轮的多条 system 在原生记录里是一条（全部文本块按顺序），续聊时由中继按客户端历史还原。
- 附件策略使用全局默认 attachment_source（client / gateway / both）和 attachment_sources 按类型覆盖。可覆盖 environment（含 cwd）、model、total_tokens_reminder、session_context、date。unknown_client_attachment / unknown_gateway_attachment 分别设为 pass（默认）或 ignore。
  - 容器端按 Mod prompt.attachment 的 type/origin 过滤。hook_additional_context 和 deferred_tools_delta 为功能上下文，始终保留；其他已知类型按来源选择，未知类型按对应来源策略处理。
  - 普通客户端顶层 system 和消息中的 role:system 始终保留，不会因为选择 gateway 整体删除。客户端只有独立文本块完整采用下述显式标记时才可按类型过滤（这是 CCGateway 扩展约定，不是 Anthropic 标准字段）：
    <ccgateway-attachment type="environment">客户端环境内容</ccgateway-attachment>
  - 标记必须覆盖整个文本块；普通正文、混合内容、嵌套或模糊格式均保留。未安装对应标记逻辑的普通 Claude Code 客户端不会自动获得逐类型过滤能力。保留的块不改写其文本；非 system 的用户文本不据此删除。
  - 工具发现和 Hook 上下文不可配置为删除。容器进程 cwd 仍为内部 workspace，此配置只控制环境附件，不映射或挂载客户端文件系统。
  - 策略变化隔离原生历史缓存，避免恢复旧策略保留的附件。开启请求日志时 effective-config.json / mod-config.json 保存策略，client-attachment-decisions.json 保存客户端标记识别决定，events.jsonl 保存 Mod 的保留/删除记录。
  此钩子还去掉 CLI 加在 Mod 上下文前的 prompt.submit hook additional context: 标签。
- 出站还原：请求含客户端 system 时，Runner 为 CLI 开启 system 轮次（`CLAUDE_CODE_FORCE_MID_CONVERSATION_SYSTEM=1`），模型请求在回环中继（`outbound_relay.go`）里还原。Claude Code 会把同一轮未被拦截的 system 附件合成一条 system 消息（附件之间空行，同一附件的文本块之间换行）。Mod 按当前策略过滤 environment、model、date、total_tokens_reminder、session_context 等附件，CLI 合成的 system 消息包含客户端内容和当前策略保留的附件。中继按轮次对齐（客户端 assistant 数；内部 ToolSearch 轮不计），在该轮第一个 assistant 之前的 system 消息里用精确子串定位客户端这一组的整段文本（必须是完整附件，即前后为空行或边界），然后拆成：白名单附件或其他剩余内容一条（保留 `output_config` 等字段；为空且无其他字段则省略），之后是客户端原样的各条 `{"role":"system","content":[文本块...]}`。CLI 加在被替换文本上的缓存断点移到客户端最后一个文本块。剩余内容排在前面，因为后出现的 system 优先。
- 任一组找不到、出现多处或不是完整附件，中继拒绝该请求，网关以该原因返回 502；不会放行结构被改过的请求。CLI 未按 system 轮次发送（客户端文本进了 user 提醒）也按此失败。`/v1/messages/count_tokens` 带 messages 时同样还原，失败只拒绝这次计数。中继保留鉴权头、SSE 原样回传、代理选择，只接受回环来源；开启请求日志时把实际转发的请求体存为 `upstream-request-<序号>-<随机>.body`，被拒绝的原始请求体存为 `upstream-refused-*.body`。
- 上游错误处理由请求策略 `pass_upstream_errors`（`X-CCGateway-Request-Policy` 中的布尔字段，CCGateway 页面配置，缺省 false）决定。所有模型请求都经过回环中继（不带客户端 system 的请求体不改，`thinking.display` 照旧添加）。
  - false（默认）：错误交给 Claude Code 自己处理（重试、退避、刷新令牌、按错误文字改形重发），中继把错误响应和流原样转发给 CLI，不终止、不记录；最终失败时网关按原方式返回（502 等）。带客户端 system 的请求若遇到让 CLI 关闭 system 轮次的 400，CLI 改用 `<system-reminder>` 形状重发，中继无法还原而拒绝转发（上游只收到第一次请求），客户端收到 502，错误信息为 `cannot restore the client's system messages: ...`，不是官方的 400 原文。
  - true：上游对 `/v1/messages` 返回任何非 2xx（含 401、403、408、409、429、529、5xx），或 200 的 SSE 流中途出现 error 事件时，中继记下官方状态码、Content-Type 和原始错误体，立即终止 Claude Code（不让它退避、刷新凭据或改形重试），同一运行后续模型请求一律拒绝且不转发；网关把官方状态码和原始错误体返回给客户端，流式且已开始输出时发 `error` 事件，内容为官方原始的 error 对象。流内 error 事件没有状态码，按官方错误类型映射：invalid_request_error 400、authentication_error 401、billing_error 402、permission_error 403、not_found_error 404、request_too_large 413、rate_limit_error 429、api_error 500、timeout_error 504、overloaded_error 529，未知类型按 500。万一 CLI 读到中继的回应，只有中性文字（不含 system、role、cache_control、thinking 等词）。
  - 两种取值下：中继连不上上游（网络错误）不是上游错误，CLI 可自行重试，最终失败时网关返回 502；中继自身还原失败时终止运行，网关返回 502。
  - 策略解析一直忽略未知字段，旧版应用收到含 `pass_upstream_errors` 的策略时按 false 的行为工作。
- 开启 system 轮次与直连官方一致：模型不支持消息中的 system 时由官方返回 400。CLI 自带的环境/日期上下文在这些请求里也以 system 消息发送。
- system 属于历史指纹的一部分：续聊可直接恢复原生会话，从旧节点分支时只继承分支点之前的 system，换账号时按客户端完整历史在原位置重建。重试已提交请求不会重复 system。
- 最后一轮的单个文本块上限 100,000 字符、合计 200,000 字符（UTF-16 计数）。超过时 CLI 会把 Mod 上下文缩成开头加文件路径，因此直接返回 400。已提交历史不受此限制。

剩余限制：客户端 system 的 `cache_control` 断点不逐块保留（与其他消息相同，断点由 Claude Code 管理）；中继要求客户端整段文本在 CLI 的 system 消息里恰好出现一次，CLI 自带上下文恰好含有相同完整段落时请求会失败而不是猜测；对齐依赖 CLI 2.1.288 的合并规则，新版本改变渲染时会失败关闭，需要重新验证。

验证：本地 `TestSystemMessagesRealCLI`/`TestRealCLI`（Claude Code 2.1.288、模拟上游）要求出站就是客户端原结构：多条连续 system、多文本块（含空行）、tool_result 之后、续聊恢复 Mod 记录、ToolSearch 与结构化输出续轮、带内部 ToolSearch 历史的续聊；开启 `pass_upstream_errors` 时，上游以会触发降级的文字返回 400、不带 system 的请求遇到 429/529、200 流中途 overloaded_error，客户端都收到原样状态码与错误体（流式已开始时为原样 error 事件），上游只收到 1 次请求；默认关闭时，上游先 429 后 200，客户端最终收到 200。`TestSystemMessagesLiveE2E`（容器内真实模型，主控运行）从请求日志读取中继实际转发的请求体，逐条比对客户端 system 消息；容器防火墙只放行回环 8787 时用 `CCG_E2E_RELAY_ADDR` 指定该地址。2026-10-06 早先的合并形状实测（cc-max 账号 22、claude-opus-5-5）见 next/docs/handoff-evidence/2026-10-06-ccgateway/manual-attachment-results.md。

### 请求调试日志

记录由 Worker 容器独立拥有；核心/插件仅代理开关，不复制诊断正文。每个请求对应
`request-logs/<随机目录>/`，`metadata.json` 同时包含 `request_id` 和 `log_directory` 以便关联查询。
所有新增文件受同一日志开关、24 小时保留期和容量限制控制：

- `events.jsonl`：请求生命周期、历史准备/提交、CLI 输入输出、Mod 配置获取/加载确认/system 确认、附件 keep/drop/relabel、上游交换状态。
- `effective-config.json`、`mod-config.json`：实际 CLI 参数、网关生成的环境选项和 Mod 配置。不会转储继承环境、账号 Key、内部 Mod/relay URL 或令牌。
- `history.json`、`history-prepared.jsonl`、`history-native.jsonl`：恢复模式、session/anchor、准备的历史及退出后可读取的原生历史；失败时以事件标明无法读取的快照。
- `cli-stdout.jsonl`：原生 stream-json 输出，包括结束后的排空记录。
- `upstream-<id>-cli-request.body`、`-request.body`、`-response.body` 和相应头/状态文件：每次模型/计数请求的适配前正文、实际转发正文和原始上游响应，包括不需要适配的请求。头部鉴权字段脱敏。

正文只落容器诊断目录，不复制到插件或 Docker 输出。发生容量超限会删除整条诊断，不能把被清理的记录声称为完整保留。日志实现集中在 `gateway/request_log.go` 和 `gateway/request_trace.go`，业务通过 nil-safe trace/artifact/snapshot 接口接入。

管理接口 `GET/PUT /admin/request-logs` 查询或设置 `{"enabled":true|false}`，需要管理密钥。CCGateway 页面按账号控制该设置，状态保存在运行容器的数据卷中。

开启时在 `CCG_DATA_DIR/request-logs/<随机目录>/` 保存原始 `request.body`、`response.body`（含 SSE）、脱敏后的请求/响应头及 `metadata.json`。请求体被出站适配改写过的请求（客户端 system 还原、`thinking.display`）另保存为 `upstream-request-<序号>-<随机标识>.body`（被拒绝的为 `upstream-refused-*`），未改写的不另存，受同一开关和容量限制。消息正文仅写入这些可删除的文件，不输出到 Docker 日志。关闭会停止现有请求的记录、删除全部调试日志，并阻止后续请求落盘；不会中断业务响应。

单请求日志超过 64 MiB 时删除整条日志，不保存部分正文。已完成日志保留 24 小时，总量软限制 512 MiB，按时间清理。这里的零保留仅指调试日志，不改变业务会话缓存。
