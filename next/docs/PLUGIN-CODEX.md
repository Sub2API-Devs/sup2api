# codex 插件：ChatGPT 账号（Codex 设备码 / Sign in with ChatGPT）

日期：2026-11-08。状态：已实现（插件 0.1.1，需核心 ≥0.1.257，未发布）。核心契约见 CONTRACTS §83（WebSocket 每轮 patch 见 §83.6）。

## 1. 目标与边界

- 新增内置并默认启用的插件 `codex`，让运营者用**自己的** ChatGPT 订阅为**自己的**应用提供 OpenAI 兼容接口：`/v1/chat/completions`、`/v1/responses`、`/v1/responses`（WebSocket 模式）。
- 两种建号方式（同一 `creationGroup: "codex"` 下的两个账号类型）：
  1. `codex_device`：Codex 设备码登录（与 Codex CLI `--device-auth`、OpenCode 等第三方工具相同的公开流程）。
  2. `chatgpt_siwc`：OpenAI 官方第三方入口 Sign in with ChatGPT · ChatGPT plan usage（授权码 + PKCE）。
- 守线（写进插件说明，不做技术强制）：
  - 请求如实标明来源：`originator: sup2api`、`User-Agent: sup2api-codex/<版本>`；**不**伪装 Codex CLI 的 UA、TLS 指纹、`x-codex-*` 头，**不**注入 Codex 官方系统提示词。
  - 仅供账号所有者自用；把多人 ChatGPT 账号做成号池对外出售违反 OpenAI 条款（付费/托管应用需先通过 OpenAI 的 Sign in with ChatGPT 候补审批）。
- 不做：Codex 账号的用量面板（`x-codex-*` 额度头）、连接池/预热、`previous_response_id` 跨连接恢复。

## 2. 官方协议事实

### 2.1 Codex 设备码（`codex_device`）

来源：openai/codex `codex-rs/login/src/device_code_auth.rs`。issuer = `https://auth.openai.com`，client_id = `app_EMoamEEZ73f0CkXaXp7hrann`（Codex 公开客户端）。

1. `POST https://auth.openai.com/api/accounts/deviceauth/usercode`，JSON `{"client_id": "..."}` → `{"device_auth_id", "user_code"（或 "usercode"）, "interval"（字符串秒数）}`；404 = 该账号/工作区未开启设备码登录（ChatGPT 设置 → 安全 → Device code authorization；企业工作区需管理员开启）。
2. 展示验证地址 `https://auth.openai.com/codex/device` 和 `user_code`，15 分钟有效。
3. 轮询 `POST https://auth.openai.com/api/accounts/deviceauth/token`，JSON `{"device_auth_id", "user_code"}`：403/404 = 尚未授权，按 interval 继续；2xx → `{"authorization_code", "code_challenge", "code_verifier"}`；其他状态 = 失败。
4. 换令牌：`POST https://auth.openai.com/oauth/token`，form：`grant_type=authorization_code`、`code`、`redirect_uri=https://auth.openai.com/deviceauth/callback`、`client_id`、`code_verifier` → `{id_token, access_token, refresh_token, expires_in}`。
5. 刷新：`POST https://auth.openai.com/oauth/token`，JSON `{"client_id", "grant_type":"refresh_token", "refresh_token", "scope":"openid profile email"}`（与旧版 `backend/internal/pkg/openai/oauth.go` 一致）；refresh token 会轮换。
6. 身份：id_token 的 `https://api.openai.com/auth` 声明里有 `chatgpt_account_id`、`chatgpt_plan_type`；`email` 在顶层。
7. 上游：`POST https://chatgpt.com/backend-api/codex/responses`，头 `authorization: Bearer <access_token>`、`chatgpt-account-id`、`originator: sup2api`、`user-agent`、`accept: text/event-stream`；请求体须 `store:false`、`stream:true`、带 `instructions` 字段（缺省时补空串）。WebSocket：`wss://chatgpt.com/backend-api/codex/responses` + `openai-beta: responses_websockets=2026-02-06`。

### 2.2 Sign in with ChatGPT（`chatgpt_siwc`）

来源：developers.openai.com/siwc/token-sharing-open-source/*。

1. 宿主 ID：每个账号生成一次 `ext_agent_host_id = urn:uuid:<UUIDv4>`，存进凭证，以后不变（两节点共用同一账号即同一 host）。
2. 授权地址 `https://auth.openai.com/api/accounts/authorize`，参数：`client_id=dynamic_agent_client`（首次；重新授权用已发放的 client_id 且不带 agent_name_hint）、`agent_name_hint=sup2api`、`ext_agent_host_id`、`response_type=code`、`redirect_uri=http://127.0.0.1:1455/auth/callback`、`scope=openid profile email offline_access resource.invoke chatgpt.tokens.use.direct`、`resource=https://api.openai.com/v1`、`state`、`nonce`、`code_challenge_method=S256`、`code_challenge`。
3. 服务器不在本地：浏览器跳到 `127.0.0.1:1455` 会打不开，运营者把地址栏完整网址粘回后台。插件解析 `code`、`state`、`client_id`、`scope`、`error`；校验 state；`error=access_denied` 直接失败；新注册缺 `client_id` 视为未完成；重新授权时返回的 client_id 与已存的不同要拒绝。
4. 换令牌：`POST https://auth.openai.com/api/accounts/oauth/token`，form：`grant_type=authorization_code`、`client_id`（已发放的）、`code`、`code_verifier`、`redirect_uri`（同上）、`resource=https://api.openai.com/v1`。必须确认授予的 scope 含 `chatgpt.tokens.use.direct`。
5. 刷新：同一 token 端点，form：`grant_type=refresh_token`、`client_id`（已发放的）、`refresh_token`、`resource`；不带 scope。终止性错误：`invalid_grant`、`invalid_refresh_token`、`token_expired`、`refresh_token_expired`、`refresh_token_invalidated`、`refresh_token_reused`（需重新授权）；`invalid_client`（配置错误）。其他错误保留凭证、稍后重试。
6. 上游：`POST https://api.openai.com/v1/responses`，`authorization: Bearer <access_token>`；必须 `store:false`、`stream:true`，`input` 必须是数组，不支持 `temperature`、`top_p`、`max_output_tokens`、`metadata`、`user`、`truncation`，HTTP 下不能用 `previous_response_id`，不能有 system 角色的 input 项（改用 `instructions`）。禁止调用 `backend-api`。WebSocket：`wss://api.openai.com/v1/responses`，连接内可续接。
7. 模型：`GET https://api.openai.com/v1/models` → `{"models":[{"slug","display_name","visibility"}]}`，取 `visibility=="list"` 的 `slug`。
8. 错误码（结构化 Responses 错误）：`subscription_sharing_usage_limit_exceeded`（429，冷却账号，不推断重置时间）、`subscription_sharing_usage_unavailable`/`subscription_sharing_user_unavailable`（503，短暂退避）、`subscription_sharing_user_not_eligible`（403，禁用账号）、`subscription_sharing_unsupported_capability`（400，原样返回客户端）、`subscription_sharing_route_not_supported`（403）、`subscription_sharing_invalid_user`（401）、`chatpass_v2_scope_not_authorized`/`chatpass_v2_invalid_authorization_context`（403，禁用）。

## 3. 核心改动：上游只接受流式（`streamOnly`）

两类账号的上游都**只接受 `stream:true`**。核心目前按客户端的 `stream` 原样转发，非流式客户端（以及被转换成 Responses 的非流式 chat 请求）会失败。新增：

- `manifest.AccountPlatform.StreamOnly []string`（JSON `streamOnly`）：列出该账号类型上游只接受流式的上游协议（本插件填 `["openai.responses"]`）。
- 请求选中此类账号、上游协议在列表里、且本次为非流式时，核心：把上游请求体的 `streamPath` 置 `true`；按 SSE 读上游；从 `response.completed`（或 `response.incomplete`）事件取 `response` 对象作为非流式 JSON 响应体；若其 `output` 为空，用沿途 `response.output_item.done` 的 `item` 按 `output_index` 补齐；`response.failed`/`error` 事件按上游错误处理（交给插件 `ClassifyError`，状态码取事件里的值，缺省 502）。之后走原有非流式路径（JSON 用量规则、协议转换成 chat JSON、记录、计费）。
- 使用记录的 `stream` 字段仍记客户端视角（false）。
- 只对声明了 `streamOnly` 的账号类型生效，其他插件行为不变。CONTRACTS 增加一节。

## 4. 插件 `codex`

- 目录 `next/plugins/codex`，key `codex`，runtime grpc，能力 `platform.adapter.v1`、`platform.execute.v1`、`platform.websocket.v1`、`http.routes.v1`。
- 两个账号类型都挂内置 `openai` 平台，`endpoints: ["responses", "responses_websocket"]`（chat 由核心转换成 Responses），`streamOnly: ["openai.responses"]`，`refresh: {}`，`sensitiveFields: ["access_token","refresh_token","id_token"]`，`settingsFields: ["proxy_id"]`，表单 `mode: "native"`、组件 `CodexAuthForm`。
- `BuildUpstreamRequest`：按账号类型选 URL 和头；patch `store=false`；字符串 `input` 转数组；`role:"system"` 的 input 项改成 `developer`；`codex_device` 缺 `instructions` 时补空串；删除不支持字段；WebSocket 协议换成 `wss` + `GET` + `openai-beta`，并对每轮 `response.create` 消息返回同样的 patch（不含 stream 相关字段，`chatgpt_siwc` 保留 `previous_response_id`；核心每轮应用，CONTRACTS §83.6）。
- `ClassifyError`：401 → 冷却并提示重新授权（刷新由核心按 `refresh` 声明处理）；429 / `subscription_sharing_usage_limit_exceeded` / `usage_limit_reached` → 冷却（有 `resets_at`/`retry-after` 用之，否则 5 分钟）；403 资格类错误 → 禁用；400 原样返回。
- 刷新：`BuildRefreshRequest` / `ParseRefreshResponse`，按账号类型选端点和格式；轮换后的 refresh token 一并保存。
- 管理路由（`scope: admin`，权限 `codex:manage`）：
  - `POST /auth/device/start` → `{session_id, verification_url, user_code, interval, expires_in}`；会话存 KV（含 device_auth_id，15 分钟过期）。
  - `POST /auth/device/poll` `{session_id}` → `{status: "pending"|"done"|"expired"|"error", credentials?, message?}`；done 时返回完整凭证对象（见下），同时删除会话。
  - `POST /auth/siwc/start` `{client_id?, ext_agent_host_id?}`（重新授权时带上） → `{session_id, authorize_url}`；PKCE verifier、state、nonce、host_id 存 KV。
  - `POST /auth/siwc/exchange` `{session_id, callback_url}` → `{credentials}` 或错误。
- 凭证对象：
  - 共有：`access_token`、`refresh_token`、`id_token`、`expires_at`（Unix 秒）、`email`。
  - `codex_device`：`chatgpt_account_id`、`plan_type`。
  - `chatgpt_siwc`：`client_id`、`ext_agent_host_id`、`scopes`。
- 网络权限域名：`auth.openai.com`、`chatgpt.com`、`api.openai.com`。
- 原生表单 `CodexAuthForm`：设备码页签（开始 → 显示链接与验证码、复制按钮、倒计时、自动轮询 → 成功后填入凭证并显示邮箱/套餐）；Sign in with ChatGPT 页签（生成链接 → 新窗口打开 → 粘贴回调网址输入框 → 换取 → 填入凭证）；编辑已有账号时显示当前邮箱与“重新授权”。按账号类型只显示对应页签。中英文文案。

## 5. 内置

`deploy/docker/build-go.sh` 的 `BUILTIN_PLUGINS` 加 `codex`（安装即启用）。web mock 加 codex 插件与两个账号类型。

## 6. 实现记录（2026-11-08）

- 核心 §83：`streamOnly`（非流式请求强制上游流式、合成 JSON）；同平台转换 `openai.chat → openai.responses`（2026-11-08 改为宽松：旧式 functions、custom 工具、allowed_tools、web_search_options 等能等价的都转换；`stop`、`seed`、罚分、logprobs、消息 `name`、未知字段等静默丢弃并在网关 debug 日志记下字段路径；只有 `n>1`、音频输出/输入、空 `messages` 等无法保留含义的返回 400 `unsupported_conversion`；对话中间的 system/developer 消息转成 `developer` 角色。详见 CONTRACTS §83.2）；manifest 校验对用到这两项的插件要求 hostCompat ≥ `StreamOnlyFirstCore`（占位 0.1.257，发布时定号）。
- 插件：`codex_device` 也删除 Codex 后端已知不接受的字段（`max_output_tokens`、`temperature`、`top_p`、`user`、`metadata`、`stream_options`、`truncation`）；`chatgpt_siwc` 必须有 `client_id`。net 权限只给 `auth.openai.com`（上游与刷新由核心发出）。
- 已知限制：~~WebSocket 消息核心不做 patch，客户端需自带 `store:false`（device 还需 `instructions`）；SIWC 下对话中间的 system/developer 消息会被上游拒绝；~~（0.1.1 已解决，见下）device 账号无在线模型列表；授权请求不走账号代理；路由要求 `codex:manage` 权限。

## 7. 0.1.1（2026-11-08，用户要求 sup2api 兜住客户端差异）

- 核心 CONTRACTS §83.6：WebSocket 每轮消息都调用插件 `BuildUpstreamRequest` 取 body patch（首轮复用握手那次调用，后续轮只取 patch、忽略 URL/头），在钩子与模型映射之后应用；空 patch 时消息逐字节不变；patch 失败回该轮错误事件、不断开。属于同一未发布核心（占位 0.1.257），`hostCompat` 不变。
- 插件：WebSocket 返回与 HTTP 相同的 patch（`store=false`、删除不支持字段、device 补 `instructions`、字符串 input 转数组），不含 stream 相关字段，SIWC 保留 `previous_response_id`。客户端不再需要自带 `store:false`/`instructions`。
- 插件：两种账号类型、HTTP 与 WebSocket 都把 `role:"system"` 的 input 项改成 `role:"developer"`；`requestFields` 新增 `input.#.[role].#(=="system")#`（按项序 `["system"]`/`[]`，每项约 3 字节），据此生成 `input.<i>.role` 的 `OP_SET`，每请求最多 256 个。
- 仍有限制：字符串 input 字段回显整段字符串，超过插件 gRPC 接收上限（4 MiB）会使调用失败；device 账号无在线模型列表；授权请求不走账号代理；路由要求 `codex:manage` 权限。
