# 插件设计：字节火山方舟 / 豆包（`volcengine`）

> 状态：**设计稿，尚未实现**。2026-09-29 调研产出。
> 目标：把 new-api 拆成两个渠道类型的「字节火山方舟」和「豆包通用 / 豆包视频」合成 **一个** sup2api 插件，支持自定义 Base URL 与素材库端点。
> 参考实现：`D:\projects\golang\new-api`（AGPL-3.0，**只读设计、不复制代码**；sup2api 为 LGPL-3.0）。

---

## 1. 需求

| 项 | 要求 |
|---|---|
| 合并 | 火山方舟（对话 / 嵌入 / 图片）与豆包视频在 sup2api 里是**同一个插件、同一种账号类型**，不像 new-api 那样分成两个渠道类型 |
| 自定义 Base URL | 账号可填自己的 Ark 地址（官方国内、BytePlus 海外、第三方中转），留空用官方默认 |
| 自定义素材端点 | 素材库（火山「素材」OpenAPI）的地址可单独配置，留空表示该账号不启用素材库 |

### new-api 的现状（要合并的两边）

| new-api | 渠道类型 | 内容 |
|---|---|---|
| 「字节火山方舟」 | `ChannelTypeVolcEngine = 45`，显示名 `VolcEngine` / 火山方舟 | `relay/channel/volcengine/`：OpenAI 兼容的 `chat/completions`、`embeddings`、`images/generations`、`rerank`、`responses`，加上走 WebSocket 的 TTS |
| 「豆包通用 / 豆包视频」 | `ChannelTypeDoubaoVideo = 54`，显示名 `Doubao` | `plugins/tasks/doubao/plugin.js`（JS 任务插件）：Seedance 视频（异步任务）、Seedream 图片（同步），自带 `usageSchema` 计量与素材库 |

两边默认 Base URL 都是 `https://ark.cn-beijing.volces.com`（`constant/channel.go:116`、`:125`），任务插件的 `meta.channelTypes = [54, 45]` 已经承认「两种渠道说的是同一套线上协议」——**合并成一个插件是符合上游事实的**，不是我们自创的简化。

素材库在 new-api 里的配置形态（`relaykit/dto/channel_settings.go:242`）：

```go
AssetLibraryEndpoint string // 兼容火山的素材 OpenAPI 路径，拼在渠道 Base URL 之后；空 = 不启用
AssetLibraryRegion   string // 签名区域，空 = cn-beijing；BytePlus 海外用 ap-southeast-1
```

凭证格式是 `APIKey` 或 `APIKey|AccessKey|SecretKey`（填了 AK 才启用素材库），素材调用用火山官方 SDK 的 V4 HMAC-SHA256 签名，`ServiceName=ark`、`Version=2024-01-01`，官方端点 `https://ark.cn-beijing.volcengineapi.com`（`service/assetlib/upstream.go:24`）。支持的 Action 是 `CreateAsset(Group)` / `Get` / `List` / `Update` / `Delete` 十个（`service/assetlib/openapi.go:145`）。

---

## 2. 要接入的上游接口面

以下路径以 Ark 为准（来自 new-api 实际可用的代码与火山官方文档），Base 为 `https://ark.cn-beijing.volces.com`：

| 能力 | 方法与路径 | 形态 | 计量 |
|---|---|---|---|
| 对话 | `POST /api/v3/chat/completions`（模型名以 `bot` 开头时为 `/api/v3/bots/chat/completions`） | OpenAI 兼容，支持 SSE | prompt/completion token（inclusive） |
| Responses | `POST /api/v3/responses` | OpenAI 兼容 | token |
| 嵌入 | `POST /api/v3/embeddings` | 同步 JSON | token |
| 重排 | `POST /api/v3/rerank` | 同步 JSON | token |
| 图片（Seedream） | `POST /api/v3/images/generations` | **同步** JSON，图生图也走这个路径 | 张数 + token |
| 视频（Seedance） | `POST /api/v3/contents/generations/tasks` → `{id}` | **异步任务** | 无 |
| 查询视频任务 | `GET /api/v3/contents/generations/tasks/{id}` | 轮询；`status` ∈ queued/running/succeeded/failed/expired；成功时带 `content.video_url` 与 `usage.completion_tokens` | **在这里才拿到用量** |
| 素材库 | `POST {素材端点}/?Action=...&Version=2024-01-01` | 火山 OpenAPI，AK/SK V4 签名 | 不计费 |
| 语音 TTS | `wss://openspeech.bytedance.com/api/v1/tts/ws_binary` | **WebSocket** | — |

计费惯例（火山官方 + 社区中转的一致做法）：**创建视频任务不计费，第一次查到 `succeeded` 时按 `usage.completion_tokens` 结算，并按任务 id 去重**。

---

## 3. sup2api 插件模型能表达什么

先把能力边界钉死，后面的分期完全由它决定。

### 3.1 能直接表达的

- **账号类型服务内置平台**：`accountTypes[].platforms[].platform = "openai"`，插件只实现 `BuildUpstreamRequest` 把请求指到 `{base_url}/api/v3/chat/completions`。`relay` 插件就是这么接 anthropic 的（`next/plugins/relay/manifest.json`）。
- **自定义 Base URL**：`settingsFields: ["base_url"]` + `guardedSettings` 限定官方地址，持有 `account:settings:custom` 权限的管理员才能填别的（CONTRACTS §21.3）。这正好对应 new-api 的「已解锁豆包自定义 API 地址编辑」。
- **插件自己的平台与端点**：`platforms[].endpoints[]`，需要 `platform.register` + `gateway.endpoint` 两个 High 权限（`sdk/manifest/check/validate.go`）。
- **非 token 计量**：`usage.facts` 声明计量键，价格表达式里用 `u("key")` 读（ARCHITECTURE 7.3）。核心已实现（`billing/expr`、`usagerules/usagerules.go:93`）。
- **插件自己的后台接口与页面**：`routes` + `ui.pages` / `ui.native`，走 `/api/v1/p/volcengine/*`。

### 3.2 现在**不能**表达的（硬约束，已逐条核对代码）

| # | 约束 | 出处 | 影响 |
|---|---|---|---|
| A | **每个端点必须能取到模型**：`request.modelPath` 或 `request.modelParam` 二选一必填，且只能是「请求体 gjson 路径」或「路径参数」这两种声明式取法 | `sdk/manifest/check/validate.go` | 查询任务 `GET .../tasks/:id` 没有模型，**端点声明不出来** |
| B | **插件拿不到路径参数**：`BuildUpstreamRequestRequest`、`ResolveAffinityKeyRequest`、`RankAccountsRequest` 都只有 `meta`（无路径）、请求体字段和请求头 | `sdk/proto/.../platform.proto`、`scheduler.proto` | 插件无法拼出 `/tasks/{id}` 的上游 URL，也无法按任务 id 选账号 |
| C | **粘性会话取不到路径参数**：`keySources.type` 只有 `body / header / api_key / user / plugin` | `gateway/sticky.go:296`、`sdk/manifest/manifest.go:268` | 同上 |
| D | **核心不解析上游响应体来建绑定**，绑定只在请求成功后按「本次请求算出的会话键」写入 | ARCHITECTURE 6.5 第 4 步 | 创建任务时任务 id 在**响应体**里，`task_id → 账号` 的对应关系**没有任何一方能记下来** |
| E | **没有「同一任务只计费一次」的概念**：幂等键是 `usage:request_id`，每个 HTTP 请求一条 | ARCHITECTURE 7.4 | 客户端反复查询已成功的任务会**重复计费** |
| F | `kind` 只允许 `"proxy"`，`"custom"`（插件自己处理、复用核心鉴权与计费）是预留未实现 | `sdk/manifest/check/validate.go` | 异步任务类接口没有正式落点 |
| G | ~~端点路径首段保留~~ **已解决**：`manifest.CoreRouteSegments`（`sdk/manifest/routes.go`）成为唯一真相，`app/app.go`、`webui/webui.go`、`manifest/check` 三处全部从它派生，核心与 CLI 行为一致。保留段是 `api` / `plugin-ui` / `healthz`，首段精确匹配 | `sdk/manifest/routes.go` | 仍**不能**用 Ark 原生的 `/api/v3/...`，但 `/apifoo`、`/healthcheck` 这类不再被误拒 |
| H | 网关只代理 HTTP，没有 WebSocket 通道 | 全局 | 豆包语音 TTS 接不了 |
| I | **`HostService` 没有账号接口**：只有 log / kv / db.schema / authz / ledger / broadcast；`accounts.read` 这个权限在非测试代码里从未被使用 | `sdk/proto/.../host.proto`、全仓检索 | 插件**无法**自己列账号、读凭证，所以「插件完全绕开网关、自己挑账号发请求」这条路走不通 |
| J | **`HostService` 没有「上报一笔用量」接口**：计费只在网关流水线里发生 | ARCHITECTURE 7.4 | 插件后台完成的任务，没法让核心按价格表结算 |
| K | ~~核心不持有平台插件的调用句柄~~ **已解决（A 期）**：`core.PlatformBinding` 有了 `Client`，`registry.go` 会把声明平台的插件的 `PlatformService` 填进去。注意内置平台恒 nil，且**声明平台不要求 `platform.adapter.v1`**，所以插件平台的 Client 也可能是 nil | `core/ports_plugin.go:70`、CONTRACTS §25.1 | 调用方必须做 nil 检查 |

> A / B / C / D 是同一件事的四个切面：**核心与插件之间缺少「按请求上下文问插件」和「把上游响应的少量结果回传插件」这两条通道**。补上之后，异步任务不必成为核心概念（见第 5 节）。

---

## 4. 设计方案

### 4.1 插件标识

| 字段 | 值 |
|---|---|
| `key` | `volcengine` |
| `name` | `{ "en": "Volcengine Ark", "zh": "字节火山方舟" }` |
| `icon` | `text:V`（后续换成火山方舟图标 `ui/icon.svg`） |
| `capabilities` | 一期只有 `platform.adapter.v1`；三期（素材库）再加 `http.routes.v1` |
| `hostPermissions` | 一期只有 `platform.register` + `accounts.credentials{types:own}`；三期再加 `db.schema`、`routes.admin`、`ui.menu` |
| `database.schema` | 三期才有，`plg_volcengine` |

> 这张表按期递增，**不要照最终形态去实现一期**，那会多申请两个高危权限。

### 4.2 账号类型（只有一个）

```jsonc
{
  "id": "apikey",
  "label": { "en": "Ark API key", "zh": "方舟 API Key" },
  "form": { "mode": "schema", "schema": "forms/apikey.schema.json", "uiSchema": "forms/apikey.ui.json" },
  "sensitiveFields": ["api_key", "secret_key"],
  "settingsFields": ["base_url", "asset_base_url", "asset_region"],
  "guardedSettings": [
    { "field": "base_url", "allowed": [
        "https://ark.cn-beijing.volces.com",
        "https://ark.ap-southeast.bytepluses.com" ] },
    { "field": "asset_base_url", "allowed": [
        "https://ark.cn-beijing.volcengineapi.com" ] }
  ],
  "platforms": [
    { "platform": "openai" },      // 内置：对话 / responses / 嵌入
    { "platform": "volcengine" }   // 本插件的平台：图片、视频（见 4.3）
  ]
}
```

表单字段：

| 字段 | 存放 | 说明 |
|---|---|---|
| `api_key` | 凭证（加密） | Ark API Key，必填 |
| `access_key` / `secret_key` | 凭证（`secret_key` 加密） | 素材库 AK/SK；两者都留空 = 不启用素材库 |
| `base_url` | settings | 留空 = 官方 `https://ark.cn-beijing.volces.com`；受 `guardedSettings` 约束 |
| `asset_base_url` | settings | 素材库端点，留空 = 不启用 |
| `asset_region` | settings | 签名区域，留空 = `cn-beijing`，BytePlus 填 `ap-southeast-1` |

一个账号类型同时服务两个平台，就是「合并成一个插件」在 sup2api 里的落法：**管理员录一次账号，对话、图片、视频、素材全都有了**，不用像 new-api 那样建两个渠道。

### 4.3 平台与端点

对话 / responses / 嵌入**不新建平台**，直接服务内置 `openai` 平台——客户端照常打 `/v1/chat/completions`，与别的 OpenAI 账号混在同一个分组里调度。

其余走插件自己的平台 `volcengine`。因为约束 G 不能用 `/api/v3`，改用 `/ark/v3`（Ark 官方 SDK 的 `base_url` 本来就整段可配，客户端填 `https://本站/ark/v3` 即可）：

```jsonc
"platforms": [{
  "id": "volcengine",
  "label": { "en": "Volcengine Ark", "zh": "火山方舟" },
  "usage": { "semantics": "inclusive" },
  "endpoints": [
    { "id": "images", "method": "POST", "path": "/ark/v3/images/generations",
      "protocol": "volcengine.images", "kind": "proxy",
      "auth": { "headers": ["authorization"] },
      "request": { "modelPath": "model" },
      "response": { "nonStream": "json" },
      "errorFormat": "openai", "billing": "usage",
      "usage": { "semantics": "inclusive",
        "json": { "map": { "output_tokens": "usage.output_tokens" } },
        "facts": { "images": { "type": "number", "path": "usage.generated_images" } } } },

    // —— 以下两个端点用到的 request.modelSource / usage.source 是四期才存在的
    //    manifest 字段。四期落地之前，这段 jsonc 抄进 manifest 会被
    //    DisallowUnknownFields 直接打回。 ——
    { "id": "video_submit", "method": "POST", "path": "/ark/v3/contents/generations/tasks",
      "protocol": "volcengine.video_submit", "kind": "proxy",
      "request": { "modelPath": "model" },
      "usage": { "source": "plugin" },               // 插件读出任务 id 并返回预扣
      "billing": "usage" },                          // 计的是预估费用
    { "id": "video_query", "method": "GET", "path": "/ark/v3/contents/generations/tasks/:task_id",
      "protocol": "volcengine.video_query", "kind": "proxy",
      "request": { "modelSource": "plugin" },        // 插件拿 task_id 查表得出模型
      "billing": "free" }                            // 客户端查多少次都不计费
  ]
}]
```

### 4.4 计费

| 能力 | 口径 |
|---|---|
| 对话 / responses / 嵌入 | 内置 openai 平台的 token 规则，`semantics: inclusive`，无需插件参与 |
| 图片 | `usage.generated_images` 进 `facts.images`，`usage.output_tokens` 进输出 token。**Ark 图片响应没有 `input_tokens`**，所有样本里 `total_tokens == output_tokens`；另有 `usage.input_images`（传了参考图时才出现），当前不计费。价格表达式形如 `tier("base", u("images") * 0.03 + c * 2)` |
| 视频 | 提交时插件按分辨率与时长返回预估用量，核心按价格表预扣；核对到 `succeeded` 后插件返回真实 `usage.completion_tokens`（作为输出 token `c`）与 `resolution` fact，核心补扣或退回差额 |

价格仍然归核心、由管理员按完整模型 ID 配置（ARCHITECTURE 7.3），插件只声明计量键，不带价。

### 4.5 素材库

素材库不是 LLM 代理，不走网关，**作为插件自己的后台接口 + 控制台页面**落地：

```
GET    /api/v1/p/volcengine/assets            列出素材（按账号）
POST   /api/v1/p/volcengine/assets            创建素材
DELETE /api/v1/p/volcengine/assets/:id        删除素材
GET    /api/v1/p/volcengine/asset-groups      素材组
```

插件内部用账号上的 `asset_base_url` + `access_key/secret_key` 做火山 V4 HMAC-SHA256 签名调用上游（需要 `net` 权限）。`plg_volcengine` 里存本地索引（账号 id、上游素材 id、名称、类型、状态），控制台出一个 native 页面。

**签名用火山官方 Go SDK，不要手写**（2026-09-29 决定）：`github.com/volcengine/volcengine-go-sdk`（Apache-2.0，与本仓库 LGPL-3.0 兼容），走 `universal.DoCall`，`ServiceName=ark`、`Version=2024-01-01`、`Region` 取账号的 `asset_region`（默认 `cn-beijing`，BytePlus 用 `ap-southeast-1`）。手写 V4 签名是典型的易错活，new-api 也是这么做的（`service/assetlib/upstream.go`）。

> **依赖只能加在 `next/plugins/volcengine/go.mod`**，不许进 `next/sdk/` 或 `next/server/`。SDK 的依赖面刚因为 manifest 校验收敛多了 `semver` 和 `cron`（CONTRACTS §26.1），所有插件的 go.mod 都会跟着带，不能再往里塞厂商 SDK。

### 4.5.2 三期曾被一个核心缺口阻塞（2026-09-29 当天解除）

> **已解除**：`HostService.ListAccounts` / `GetAccountCredentials` 已落地（CONTRACTS §26.6），带「只限本插件账号类型 + NOT_FOUND 不泄露存在性 + 每次读写审计且审计失败即调用失败 + 游标分页」四道约束。三期可以开工。下面保留当时的推演，因为它解释了为什么最终是这个形态。

**素材库现在做不了**，不是设计问题，是核心少一个能力。

素材库是插件自己的 HTTP 路由，而 `HTTPRequest`（`app.proto`）只给 `Caller{user_id, request_id, client_ip, locale}`；`HostService` 的 10 个 RPC（Log / KV×4 / GetDSN / AuthzCheck / Ledger×2 / Publish）里**没有任何账号或凭证接口**。凭证只在 `BuildUpstreamRequest`、`ClassifyError` 这类**网关调用**里由核心随 `Account` 传给插件。

于是：插件要用账号上的 `access_key` / `secret_key` 做火山 V4 签名，却在自己的路由里**拿不到那对密钥**。

排除掉的替代方案：

| 方案 | 为什么不行 |
|---|---|
| AK/SK 放插件全局设置（`ui.settings`），走 `Configure` 拿 | 变成整个安装共用一套素材库，失去 new-api 的按账号隔离（它的凭证格式就是 `APIKey\|AccessKey\|SecretKey`，每个渠道一套） |
| 插件在 `ValidateCredentials` / `BuildUpstreamRequest` 时把看到的凭证缓存进自己的 schema | 插件持久化解密后的凭证，安全上不可接受 |
| 把素材库做成 `volcengine` 平台的网关端点，让核心选账号并传凭证 | V4 签名要对**完整请求体**做哈希，而 `BuildUpstreamRequest` 只拿到端点声明的 `requestFields`——契约明确禁止整体下发请求体。死路 |

**需要的核心能力**：让插件读**自己账号类型**的账号与凭证，受既有的 `accounts.credentials {"types":"own"}` 授权约束（这个 grant 的语义本来就是「本插件账号类型的凭证」，现在只是没有主动读取的入口）。形态建议：

```protobuf
// HostService
rpc ListAccounts(ListAccountsRequest) returns (ListAccountsResponse);      // 只返回本插件账号类型的账号
rpc GetAccountCredentials(GetAccountCredentialsRequest) returns (GetAccountCredentialsResponse);
```

这不该夹带在插件三期里偷偷做——它是一项新的核心能力，且触及凭证，**要单独决策、单独排期**。在此之前三期挂起。

> 顺带：这也解释了 `HostPermissionRisk` 里 `accounts.read`（Medium）为什么在非测试代码里从未被使用——它是为这个入口预留的，入口一直没做。

### 4.5.3 火山官方 SDK 用不到的地方（重要）

**代理路径上用不了它。** 在 sup2api 的架构里上游请求是**核心发的**：插件的 `BuildUpstreamRequest` 只返回 `{method, url, headers, patches}`，真正的 HTTP 调用连同账号代理、SSRF 防护、用量提取、失败切换、并发槽位全在核心手里（`gateway/dispatch.go`）。插件改用 Ark SDK 自己发请求，就等于把这一整套全部绕过。

四期的核对循环（`BuildReconcileRequest` → 核心代发 → `ParseReconcileResponse`）同理，也是核心发请求。

所以本插件里火山官方 SDK 的作用域**只有素材库这一处**：它是插件自己的 HTTP 路由 + 自己的出口调用，不经过网关。

**不做**：new-api 那种「对外提供一个兼容火山签名的素材 OpenAPI 入口」。sup2api 网关只认 API Key 鉴权，没有可插拔的签名鉴权，做这个要动核心鉴权链，性价比太低。

### 4.6 两个上游细节（一期实现时确认）

- **`bot` 前缀模型走另一条路径**：模型名以 `bot` 开头时是「接入点/智能体」，路径为 `/api/v3/bots/chat/completions`。判据只能是 `strings.HasPrefix(model, "bot")`——上游只给了这一个信号，所以名字里带 bot 但不是接入点的模型（如 `doubao-bot`）会被误判。一期已实现并在测试里钉住了这个边界。
- **Ark 错误体的 `type` 不是 OpenAI 语义类型**。Ark 返回 `{"error":{code,message,param,type}}`，但 `type` 是 HTTP 短语（`Unauthorized`、`BadRequest`），不是 OpenAI 的 `invalid_request_error` / `rate_limit_error`。**任何「OpenAI 兼容就直接透传 type」的实现都会把 HTTP 短语吐给 OpenAI SDK**。正确做法是按状态码给标准类型，把 Ark 的 `code` 放进 reason。
- **图片生成的失败可能是 HTTP 200**：整个请求一张也没生成时，Ark 在 200 里放顶层 `error` 对象；组图时 `data[]` 里也可能逐张带 `error`。核心只在非 2xx 才调 `ClassifyError`，所以这两种会被当成功请求记账。目前不会乱收钱（这时 `generated_images` 通常是 0 或缺失，`u("images")` 算出 0），但 `billable` 会因为 `Metrics` 非空而为 true。四期的 `ExtractUsage` 里处理。

### 4.7 明确不做

- **豆包语音 TTS**：WebSocket，网关不支持（约束 H）。
- **从上游拉取模型列表**：方舟**没有** API Key 可调用的模型列表接口（详见 §6 一期说明），`BuildModelsRequest` 返回 `Unimplemented`，模型由管理员手填。

---

## 5. 异步任务：插件执行，核心记录

这一节原本在本文里展开，现已抽成独立的核心契约文档：**[插件执行、核心记录](PLUGIN-EXECUTES-CORE-RECORDS.md)**。那份文档里的四条扩展（`path_params`、`ResolveModel`、`ExtractUsage` + `UsageReport`、预扣费 + 核心驱动的核对循环）都不带厂商语义，豆包视频只是第一个用户。

这里只说本插件怎么落在那套契约上。

先否掉两个看起来更省事的方案：

| 方案 | 为什么不行 |
|---|---|
| 核心长出「异步任务」这个一等概念（提交、绑定、轮询、结算都在核心） | 把一类厂商接口的形状写进核心。即梦、可灵、Sora、混元各家任务模型都不一样，核心会被不断拉扯 |
| 插件彻底绕开网关，用自己的 `routes` 全包 | 约束 I：插件没法列账号、读凭证，**挑不出账号**；而且丢掉 API Key 鉴权、分组、限流、并发槽位、价格表、使用记录 |

### 5.1 跑起来是这样

```
提交  POST /ark/v3/contents/generations/tasks
      核心鉴权 → 调度选账号 → 插件 BuildUpstreamRequest → 转发
      响应转发完后核心调 ExtractUsage：
        插件从响应体读出 task id，写进 plg_volcengine.tasks（连同账号、模型、用户）
        返回 Reservation{ ref_id = task_id, tokens = 按分辨率与时长预估, next_check_after_sec }
      核心按价格表算出预估费用 → 预扣 → usage_logs(billing_status='reserved')
                             → pending_settlements 登记一条

轮询  GET /ark/v3/contents/generations/tasks/:task_id      billing: free
      核心用 ResolveModel 问插件模型（插件拿 path_params 里的 task_id 查表）
      核心用 RankAccounts + path_params 把请求钉到建任务的那个账号
      插件 BuildUpstreamRequest 拼出上游 URL → 转发 → 原样返回客户端
      这条路不计费，纯粹是把客户端的查询转给上游

结算  核心的核对循环到期 → BuildReconcileRequest（核心带着账号凭证和代理去发）
      → ParseReconcileResponse：
          还在跑    → PENDING + next_check_after_sec
          成功      → SETTLED + tokens{Output: usage.completion_tokens} + facts{resolution}
          失败/过期 → FAILED + reason
      核心按真实用量重算，与预扣差额补扣或退回，usage_logs 改 billed，发 usage.recorded
```

### 5.2 为什么这样是对的

- **钱收得到**：客户端提交完再也不回来查是常态，new-api 正是因此用后台轮询（`fetchMode: "per_task"`）而不是依赖客户端。核对由核心驱动，与客户端来不来无关。
- **钱不会重复收**：计费只发生在核对循环里，客户端查多少次都不计费（查询端点 `billing: free`）。
- **钱不会漏收**：提交时就预扣，用户不能用 $0 余额压一批任务进来。
- **插件权限很小**：不需要 `net`（请求由核心代发）、不需要列账号（核心把账号传给它）、不需要 `app.jobs.v1`（核心驱动节奏）、不需要 `ledger.debit`（核心按价格表算钱）。插件只要 `platform.register` + `gateway.endpoint` + `accounts.credentials` + `db.schema`。

### 5.3 插件自己的任务表

```sql
-- plg_volcengine.tasks
task_id     varchar PRIMARY KEY,   -- 上游返回的任务 id
account_id  bigint NOT NULL,       -- 建任务的账号，轮询要钉回它
model       varchar NOT NULL,      -- ResolveModel 要用
user_id     bigint NOT NULL,
state       varchar NOT NULL,      -- running | done | failed
created_at  timestamptz NOT NULL
```

插件要能容忍记录缺失：查不到就让 `ResolveModel` 返回空（核心 400），或退回普通调度让上游自己回 404。


---

## 6. 分期计划

| 期 | 范围 | 核心改动 | 产出 |
|---|---|---|---|
| **一期** ✅ | 账号类型 + 对话 / responses / 嵌入（服务内置 openai 平台）、自定义 Base URL、账号测试 | 无 | 可用的「火山方舟」账号，与现有 OpenAI 账号同组调度 |
| **二期** ✅ | `volcengine` 平台 + 同步图片端点（Seedream），张数计量与计费 | 无 | 图片生成可用可计费 |
| **三期** ✅ | 素材库：插件路由 + 火山官方 SDK 做 V4 签名 + `plg_volcengine` 索引 + 控制台页面 | 无 | 自定义素材端点落地（0.3.0） |
| **四期 · 核心** | [插件执行、核心记录](PLUGIN-EXECUTES-CORE-RECORDS.md) 的 A + B + C + D | 是，且都是通用能力 | 插件参与用量与使用记录、预扣费、异步核对 |
| **五期** ✅ | 视频（Seedance）：提交 + 轮询 + 核对结算，落在四期的契约上；收尾见 §11 | 无 | 豆包视频可用（0.5.0）；预估从猜变成读，官方 SDK 退场 |

一到三期覆盖了需求里「合并成一个插件 + 自定义 baseurl + 素材端点」的全部字面要求，可以独立发布。四期是一笔**核心投资**：那四条扩展没有一条带厂商或「任务」语义，做完之后豆包视频只是第一个用户。

---

## 7. 待确认

1. **四期（核心契约扩展）是否现在做**。不做的话一~三期照常能发，视频留到以后；做的话它不只解决豆包视频，是把「插件参与计费与记录」这件事打通。决策点见 [PLUGIN-EXECUTES-CORE-RECORDS.md §8](PLUGIN-EXECUTES-CORE-RECORDS.md)。
2. **端点路径用 `/ark/v3/...` 是否可接受**（`/api` 被核心占用，改不了）。客户端把 Ark SDK 的 `base_url` 设成 `https://本站/ark/v3` 即可。
3. **图片端点要不要同时占用通用的 `/v1/images/generations`**。占了对 OpenAI SDK 更友好，但把一个通用路径绑给了单一厂商插件，以后核心要给内置 openai 平台加图片端点会冲突。倾向不占。
4. **素材库是否需要对外 OpenAPI 入口**（new-api 有）。本稿按「只做控制台管理」设计。

---

## 8. 代码出处（便于复核）

**sup2api（约束来源）**
- `next/sdk/manifest/manifest.go` — Platform / Endpoint / StickyRule / UsageRules
- `next/sdk/proto/sub2api/plugin/v1/platform.proto` — `BuildUpstreamRequest` 的入参
- `next/sdk/proto/sub2api/plugin/v1/host.proto` — 插件能向核心要的全部能力（没有账号、没有用量上报）
- `next/sdk/proto/sub2api/plugin/v1/app.proto` — `RunJob`（后台轮询的落点）、`HandleHTTP`
- `next/server/internal/core/ports_plugin.go:70` — `PlatformBinding` 不带 Client
- `next/sdk/manifest/check/validate.go` — 保留路径段、平台权限、端点校验
- `next/server/internal/gateway/sticky.go:296` — 粘性键取值来源
- `next/server/internal/gateway/pipeline.go:246` — 模型从路径参数或请求体读取
- `next/server/internal/gateway/rank.go` — `RankAccounts` 调用时机（可用来把请求钉到指定账号）
- `next/server/internal/usagerules/usagerules.go:93` — facts 提取
- `next/docs/ARCHITECTURE.md` 6.4 / 6.5 / 6.6 / 7.3 / 7.4，`CONTRACTS.md` §6（事件）、§24（RankAccounts）

**new-api（参考，只读）**
- `relay/channel/volcengine/{adaptor,constants,tts}.go`
- `plugins/tasks/doubao/plugin.js`（`meta` 在 244 行，路由在 273 行，提交/查询在 758 / 860 行）
- `constant/channel.go:45,54,116,125`
- `relaykit/dto/channel_settings.go:242`
- `service/assetlib/{upstream,openapi}.go`

**官方文档**
- [创建视频生成任务](https://docs.volcengine.com/docs/ark/create-video-generation-task-api)
- [查询视频生成任务](https://www.volcengine.com/docs/82379/1521309)
- [公共错误码](https://docs.volcengine.com/docs/ark/error-codes)

---

## 9. 实现过程中暴露出来的插件机制问题

都不属于本插件，属于**插件机制**本身。

### 9.1 已解决

| 问题 | 怎么解的 |
|---|---|
| manifest 校验有两份实现（`plugin/pkg` 与 CLI），保留路径清单已分叉 | 校验搬到 `sdk/manifest/check`，`plugin/pkg/validate.go` 缩成转发壳，CLI 直接调同一份；保留路径收敛成 `manifest.CoreRouteSegments` |
| 插件作者 import 不到核心校验（`plugin/pkg` 是 server internal），manifest 没有自动化守卫 | 同上。各插件的 `manifest_test.go` 现在能直接跑核心校验 |
| 内置平台 JSON 在 `server/internal/platforms`，插件够不着 | 移到 `sdk/platforms` |

顺带挖出一个**静默跳过的测试**：一期 `manifest_test.go` 里的 `builtin()` 读内置平台 JSON 时是 `os.IsNotExist → t.Log(skip) → return nil`，所以「与内置 openai 平台交叉校验」那段**一直在空跑**。现已改成硬失败。这类「找不到就跳过」的写法值得在别处也扫一遍。

### 9.2 用量与计费规则的校验缺口（会漏钱）—— **已修复**

二期把 `usage.facts` 真正用起来之后暴露的，原先 `usageRules()` **只校验 `semantics`**，其余一概不看：

| # | 缺口 | 后果 |
|---|---|---|
| 1 | `facts[].path` 不校验是否是合法 gjson 路径 | `"usage..[["` 能装上，运行时静默取不到值。管理员的 `u("images")` 恒为 0，**该计的费一分不计** |
| 2 | `facts[].path` 允许为空 | 该 fact 永远不存在（`usagerules.go:94` 是 `if f.Path != ""` 才提取），但 `u("它")` 能通过价格表达式校验（`billing/pricer.go:134` 只收集键名）。管理员写的表达式恒算 0 |
| 3 | `facts[].type` 不校验 | `"vector"` 能过；`usagerules.go:80` 只认 number/boolean/enum，其余按字符串处理，价格表达式拿到字符串 |
| 4 | `usage.json.map` / `usage.sse[].map` 的**键**不校验 | 写 `"total_tokens"` 能装上。`usagerules.go:69` 的 default 分支把不认识的键**当 metric 塞进 `usage_logs.metrics`** 而不是报错。拼错 `output_tokens` → token 不计费；这个意外的 metric 键又不在 `declaredFacts` 里，`u()` 也取不到，纯粹是看不见的黑洞 |

建议：`map` 的键限定在 `manifest.Usage*` 那 6 个常量内，别的报 `unknown_field`；`facts[].path` 用 gjson 解析校验且不得为空；`type` 限定三选一。

**已于 `sdk/manifest/check/usage.go` 全部实现**，每条正反测试齐备，内置平台 JSON 与 7 个插件全部原样通过（没有为了让规则通过而改资产，也没有为了保住资产而放宽规则）。路径校验的做法是**用同一套语法往返**：`sjson.SetRaw("{}", path, probe)` 物化再 `gjson.Get` 读回——gjson 没有导出的路径校验器，而它对 `usage..[[` 的处理恰恰就是「当成一串永远匹配不上的 key」，这正是要堵的静默失败。

一处**有意的收紧**：gjson 的只读算子（查询 `#(a==1)`、modifier `@this`、管道 `a|b`、通配 `usage.*`、multipath `{a,b}`）在用量路径上被一并拒绝。运行时对结果只做 `Int()/Float()/String()`，只需要单个值；这些算子返回数组或对象，落进 `usage_logs` 就是垃圾。现有资产一个都没用到。

### 9.3 其他核心缺陷

| # | 问题 | 位置 |
|---|---|---|
| 5 | ~~账号类型引用不存在的平台时一声不吭~~ **已修复**：照 hook / rank 的形状加了 `slog.Warn`，绑定照常保留（平台可能来自尚未安装的插件），措辞不断言是拼错 | `plugin/registry/registry.go` |
| 6 | **`endpoint.response` 整个结构体是死声明** —— **已决定：让网关真的读它**（2026-09-29）。两个 agent 独立确认：`Response.Stream` / `Response.NonStream` 在 `server/` 与 `sdk/` 里**零处引用**（除 manifest 定义和测试夹具），是否流式完全由 `request.stream` / `request.streamPath` 决定（`pipeline.go:262`）；走 SSE 还是 JSON 只看上游 `Content-Type`（`forward.go:44`）。后果是真实的：声明了「只有 nonStream」的端点，上游一旦返回 SSE，`usage.json` 规则不生效 → **token 用量完全丢失**，而 `applyFacts` 每个事件都跑，于是按张数收得到钱、按 token 收不到。Ark 图片端点支持 `stream:true`，这是真实场景。落地方案见 §9.6 | `manifest.go:156`、`gateway/forward.go:44`、`gateway/pipeline.go:262` |
| 7 | **插件分类出来的上游错误码到不了客户端**。`ClassifyErrorResponse` 没有 `client_error_code` 字段，`Code` 被硬编码成 `"upstream_error"`；只要插件填了 type 或 message，原始 body 也不透传。于是 Ark 的 `InputTextSensitiveContentDetected`（内容审核）和普通参数错误，到 OpenAI SDK 手里都是 400 + `invalid_request_error` + `code="upstream_error"`，**客户端没法区分「换个 prompt」和「改参数」**。建议加 `client_error_code`，或允许 `passthrough_body=true` | `gateway/dispatch.go:480`、`platform.proto:72` |
| 8 | **`facts[].enum` 运行时完全不认**。`usagerules.go:74` 的 `setMetric` 只区分 boolean / number，`enum` 落进 default 按字符串处理，**从不与 `Enum` 列表比对**。上游返回列表外的值照样写进 `metrics`。校验层现在只能保证「声明 enum 就得非空」，运行时该加一层，否则 `enum` 就是装饰 | `usagerules.go:74` |
| 9 | **`facts[].unit` / `description` 零消费者，管理员看不到可用的 `u()` 键**。全仓库（含 `web/src`）grep `facts` 前端零命中；`declaredFacts` 只收集键名当黑白名单，`expr.Analysis.Facts` 列的是*表达式里用到的* fact 而非可用清单。**fact 这套对管理员目前是盲盒** | `billing/pricer.go:134`、`billing/expr/validate.go:32` |
| 10 | **facts 在每个 SSE 事件上重跑、后写覆盖先写**，manifest 里没有任何办法表达「这个 fact 要累加」或「只看某个事件」（`SSEUsageMap` 有 `event` 过滤，`facts` 没有）。对「每个 chunk 都带、语义是增量」的 fact 会只记最后一个 chunk | `usagerules.go:157,189` |
| 11 | **sticky rule 的 `match.protocols` 指向不存在的协议完全无声**：校验层不查、registry 也不查。与第 5 条同一类缺口，方向是「平台 → 协议」 | `check/validate.go` 的 `stickyRules` |
| 12 | （不是 bug，记一笔）`billing: "free"` 的端点可以同时声明 `usage.facts`，facts 照常写进 `metrics` 但永远不结算。设计上说得通，但没文档说明，容易误以为「声明了 fact 就会计费」 | — |

### 9.4 声明式用量规则表达不了的

Ark 图片响应的 `data[]` 每条带 `size`（如 `"2848x1600"`），**按分辨率分档计价用 facts 表达不出来**——facts 只能取单个 gjson 路径，没法「按 `data[].size` 分组计数」。new-api 正是靠 JS 插件自己算 `images_up_to_1_5k` / `images_above_1_5k` 两档。

这恰好是四期 `ExtractUsage`（插件返回用量）要解决的问题，不是二期的 bug。

### 9.5 尚未解决

**新插件不会被打包**：`deploy/docker/build-go.sh:109` 的 `BUILTIN_PLUGINS` 只有 `anthropic openai gemini moderation`，市场索引走 `tools/sub2api-plugin/scripts/build-demo.sh` 的显式列举。volcengine 写完也进不了镜像和市场，要改这两个脚本。

### 9.6 让网关真的读 `endpoint.response`（2026-09-29 决定）

`endpoint.response` 曾经是纯声明，`usage` 规则却按它的隐含前提工作，结果是**静默吞用量**。决定让网关真的读它，而不是把字段删掉——删掉等于承认「这类不匹配不值得知道」，而它正在悄悄吞钱。

**落地方案**（排在核心 B 期之后做，它要改 `gateway/forward.go` 与 `pipeline.go`，与 B 期冲突）：

1. **仍按上游 `Content-Type` 选转发方式**。不改这一条——因为一个能跑的客户端不该因为 manifest 写漏了就被打断。
2. **拿实际形态与端点声明比对，不一致就出声**：
   - 上游是 SSE，但端点没声明 `response.stream` → `slog.Warn`（带 request_id / protocol / endpoint / plugin），并在 `usage_logs.billing_detail` 里记一个标记（该列是 jsonb、已存在，不需要迁移），例如 `{"response_mismatch":"sse_not_declared"}`
   - 反向（声明了 stream、上游回 JSON）同样记，但危害小
3. **不阻断、不改计费金额**。这一期只做「让它可见」：用量确实丢了，但不要在同一次改动里既改可观测性又改计费口径。
4. `request.stream` / `streamPath` 与 `response.stream` 的关系要在代码注释里写清楚：前者是**客户端请求的意图**，后者是**端点承诺的响应形态**，两者都存在是合理的，不要合并。

这样 `response` 从「刚被加上必填却买不到任何保障」变成「写错了会被抓到」。真正的修复（补 `usage.sse` 规则）仍然在插件作者手上，但至少他会知道要补。

### 9.7 杂项清理轮（排期）

前面几轮攒下的小项，集中一轮做掉，不各占一个轮次。按**文件冲突**分成两批——`server` 这个 Go 模块同一时间只让一个 agent 写，否则彼此的 `go build ./...` 会看到对方的半成品，制造假失败。

**第一批（核心 B 期之后，与 §9.6 同一个 agent 或紧随其后）**——需要改 proto 或 `sdk/manifest/check`，与 B 期冲突：

| # | 项 | 位置 |
|---|---|---|
| 1 | `ClassifyErrorResponse` 增加 `client_error_code`（或 `passthrough_body`）。现在 `Code` 硬编码 `"upstream_error"`，插件分类出的上游错误码到不了客户端，Ark 的内容审核拦截和普通参数错误在 OpenAI SDK 眼里一模一样 | `platform.proto`、`gateway/dispatch.go:480` |
| 2 | sticky rule 的 `match.protocols` 指向不存在的协议完全无声（校验层不查、registry 也不查）。与账号类型那条同类，方向是「平台 → 协议」 | `check/validate.go` 的 `stickyRules`、`registry.go` |
| 3 | `CheckPlatform` 被内置平台与插件平台共用，但内置平台走 JSON、没有 manifest 包裹，`endpoint()` 里任何依赖 `v.m` 的检查在内置平台上空转。现在没有这种检查，但是个静默陷阱——注释写明，或给内置平台造一个假 manifest | `check/validate.go` |

**第二批（与第一批不冲突，可另起一轮）**——运行时与工程侧：

| # | 项 | 位置 |
|---|---|---|
| 4 | `facts[].enum` 运行时完全不认：`setMetric` 只区分 boolean/number，enum 落进 default 按字符串处理，从不与 `Enum` 列表比对 | `usagerules.go:74` |
| 5 | `usagerules.Path` 对求和项 TrimSpace、对单路径不 Trim，两边不一致 | `usagerules.go:104` |
| 6 | 运行时取到的 `input_tokens` 等标准字段若不是数字，至少 warn 一次（现在静默为 0，与键拼错同类，只是换了一层） | `usagerules.go` |
| 7 | 新插件进不了镜像和市场：`BUILTIN_PLUGINS` 只有四个，市场索引走 `build-demo.sh` 的显式列举 | `deploy/docker/build-go.sh:109`、`tools/sub2api-plugin/scripts/build-demo.sh` |
| 8 | `TestTwoNodeRollout` 既有 flaky：`waitFor` 只等 DB 里插件变 enabled，没等两个节点各自 publish 完。在干净 HEAD 上可复现 | `plugin/rollout/rollout_test.go:291` |
| 9 | 保留路径只收敛了一半：`/api/v1`、`/plugin-ui/` 在三处仍是字面量 | `httpapi/router.go:27`、`plugin/routes/routes.go:65`、`registry/package.go:50` |
| 10 | **扫一遍「找不到就跳过」的测试**。插件 `manifest_test.go` 里那段交叉校验因为 `os.IsNotExist → t.Log → return nil`，在内置平台搬家后**一直空跑且显示为绿**。同类写法值得全仓排查 | 全仓 |

**暂不做**（记录在案，不排期）：

- `plugin/pkg` 现在是混合包（一半 SDK 转发壳、一半服务端逻辑）。终局是 18 个 importer 直接 import `sdk/manifest/check`，`plugin/pkg` 只留 `core.Error` 包装——收益是消除「可以往转发壳里加规则」的误导，代价是动 18 个文件的 import
- `ValidateOptions.Tooling` 是策略布尔塞进纯规则包，下次有人想「只跳过二进制不跳过 hostCompat」就会加第二个布尔。滑坡起点，但现在能用
- `facts` 的「累加」与「只看某个事件」语义缺失（`SSEUsageMap` 有 `event` 过滤，`facts` 没有）。这属于能力缺口而非 bug，且四期 `ExtractUsage` 落地后插件可以自己算，优先级下降

### 9.8 静默跳过测试的排查结果（2026-09-29）

起因是插件 `manifest_test.go` 里那段跨模块读内置平台 JSON、`os.IsNotExist → t.Log → return nil` 的交叉校验空跑了很久。全仓排查后两个结论**都和原先的假设不同**：

**结论一：`next/` 没有任何 CI。** `.github/workflows/` 的四个 workflow（`backend-ci` / `cla` / `release` / `security-scan`）没有一个引用 `next/`，`backend-ci.yml` 的 test job 跑的是 `backend/` 的 `make test-unit`。所以「CI 一直是绿的」这个说法本身不成立——**next 的绿全部来自本地**。这是那处空跑能潜伏下来的真正原因，比空跑本身严重。

**结论二：单元测试里现在一处空转都没有。** `sdk/` `plugins/*` `tools/` `server/` 四个模块全量 `go test -v` 逐条核对过 SKIP 输出，全部来自 `TEST_DATABASE_URL`（约 70 条）、Windows 平台（1 条）、`S2P_DEMO_DIR`（1 条）三个合理来源，没有一条无声 `return`。那次事故是**唯一**的同形写法，已随平台搬家一并修好。

**结论三：整个 `next/e2e` 是 0 断言状态**，而且是双重的：

1. `e2e/env.go:45` 的 `E2E_BASE_URL` 默认值是 `http://127.0.0.1:3120`，而 3120 那套部署**已于 2026-09-27 删除**（PROGRESS §138、§144 有记录）。ping 不通 → `Setup()` 整条用例 `t.Skipf`。
2. 即使换成 `:3130` 能连通，`env.go:115` 的 `Pending()` 有 **24 个调用点，覆盖 AC02–AC23 全部用例**，注释写着「等某某模块合并后删掉」，但它们等的模块（a1-identity、gateway、b-billing、guard、round 3/4…）**早就合并了**（PROGRESS 第 8 节记录第 8 轮 17 条验收全部通过）。不加 `E2E_RUN_PENDING=1` 就只剩 `TestAC01` 会跑。

**追加进 §9.7 第二批的三处**：

| # | 项 | 位置 |
|---|---|---|
| 11 | 唯一一处与事故同形的 `t.Log + return`：市场索引签名校验，`/market/index.json.sig` 404 且索引为空时直接 return，后面的 ed25519 校验、`dev-official.pub` 校验、每个插件版本的下载全部不执行且显示 PASS。**市场索引为空本身就该是失败**（测试环境是内置签名市场，空索引说明构建链断了） | `e2e/ac01_infra_test.go:72` |
| 12 | `E2E_DOCKER_HOST` 未设时，CONTRACTS §21.2 的审计行断言整段不执行、用例仍 PASS。应拆成子测试并首行 `RequireDocker()`，让跳过出现在输出里 | `e2e/ac23_ownership_test.go:331` |
| 13 | **定时炸弹**：核心一旦注册第一对协议转换器，这条 `t.Skipf` 会自动生效，把 503 + 错误体格式 + 「未调用上游账号」三段断言一并吞掉，且是函数中途 skip，前半段已 PASS 的断言会被 SKIP 状态盖掉。应改成分支断言：有转换器断言 200 且走了转换，没有断言 503 | `e2e/ac19_builtin_platforms_test.go:77` |
| 14 | `e2e` 的默认目标与陈旧 `Pending()`：默认值改成当前部署或干脆不给默认值（不设就明确报错）；清掉已合并模块的 `Pending()` | `e2e/env.go:45,115` + 24 个调用点 |

**需要单独决策**：`next/` 要不要加 CI。哪怕只跑不依赖外部资源的单测，也能把「本地绿」变成「可验证的绿」。

### 9.9 e2e 复活的真正前置条件（2026-09-29 更正）

上一节说「把 `E2E_BASE_URL` 默认值改掉就能复活 e2e」——**这个判断是错的**。

缺的不是一个 URL，是**整套目标拓扑**。`next/deploy/README.md:15` 自己写着：3120 那套「两节点 + Caddy」的栈已于 2026-09-27 删除，**e2e 仍然按那个布局编写，需要新的目标环境才能再跑**。具体地：`deploy/compose.yml`、`deploy/caddy/`、`deploy/scripts/` 都已不存在；现在只剩 `deploy/single/compose.yml`，两个节点各自直接发布 3130/3131，**没有 Caddy、没有 mock-upstream、没有 `/__node1` `/__node2` `/__mock` 三条辅助路由**。

而 e2e 的 `E2E_MOCK_URL`（默认 `$BASE/__mock`）、`E2E_NODE_URLS`（默认 `$BASE/__node1,...`）、`docker.go`、`mock.go` 全建立在那套拓扑上。所以就算把默认值改成 3130，e2e 仍然是 0 断言——只是从「ping 不通」换成「`/__mock` 404」。

**本轮做到的**：去掉误导性的默认值（不设 `E2E_BASE_URL` 直接 `t.Fatal` 并给出指引）、删掉 23 个陈旧 `Pending()`（逐条核实过对应模块确已落地）、修掉三处会静默吞断言的写法。**没做到的**：让 e2e 真的跑起来。

**下一步需要决策**：e2e 要对着什么跑？

| 方案 | 代价 |
|---|---|
| 重建被删掉的 Caddy 拓扑 | 撤销了 2026-09-27 那次删除决定 |
| 把 e2e 改造成对着 `deploy/single/compose.yml` 跑 | 要重写 `E2E_NODE_URLS` / `E2E_MOCK_URL` 的取值方式，并把 mock-upstream 作为服务加进 single 栈 |
| 起一套独立的 e2e 专用栈 | 最干净，但要新写 compose 与脚本 |

**不能对着线上的 sup2api 栈跑**——e2e 会建用户、账号、扣费。

### 9.10 本轮顺手修掉的一个仓库级陷阱

`.gitignore` 里曾有一条裸 `scripts`，它会忽略树里**任何**叫 `scripts` 的目录。CI 脚本最初写进 `.github/scripts/` 时 git 直接当不存在，连 `git status` 都不显示。而且这不是第一次踩——`next/tools/sub2api-plugin/.gitignore` 里留着 `# The repository root ignores "scripts"; keep this tool's scripts.` + `!/scripts/`。

已收窄成 `/scripts/`（只忽略仓库根的那个）。改动前量过影响面：树里现存的 `scripts` 目录没有任何被静默忽略的文件（`node_modules` 下那几个另有 `node_modules/` 规则兜住），所以这次收窄**没有让任何意外文件变成待跟踪**。

### 9.11 前端杂项第二批的落地与三处判断更正（2026-09-30）

§9.7 里前端侧的三项（`DeclarativeTable` 搜索框、图标名、`/api/v1` 字面量）已落地（`c8a4daf66`）。做的时候发现我原来的描述有三处不准，记下来免得下次按错的前提排活：

**1. 搜索框不是「死的」，是随数据量在能用和不能用之间切换。** `serverPaged = total > items.length` 是个启发式：一页装得下时 `serverPaged=false`，客户端过滤**真的生效**；数据一超过一页就变 `true`，同一个框立刻变哑。比一直死更难发现。

**2. 「没接后端参数 / 后端不认」两个选项都不对。** 核心是**全量转发** query 给插件的（`plugin/routes/routes.go` 把 `URL.Query()` 整个交出去），`anthropic` 的 `/models` 确实实现了 `?q=`（ILIKE，有测试）。真问题是三个 declarative table 页里**只有一个**认 `q`：volcengine 的 `GET /assets`、`GET /asset-groups` 只认 `index_status` / `group_id`。所以「接通」会让 2/3 的页面**返回全量却显示成搜索结果**——比空白更糟的谎。删掉的理由是这个。

真正的修法（**排期**）：`manifest.Page` 加一条「这个 source 认哪个查询参数」的声明（如 `"search": "q"`），`check` 校验参数名；前端**声明了才渲染搜索框**，输入防抖发 `q=` 并回第 1 页。之后 volcengine 两个 assets 路由要么实现 `q` 要么不声明。顺带 `serverPaged` 也该从启发式改成声明式——服务端分页开没开应来自声明，不该靠比较 `total > len(items)` 猜。

**3. 图标名写错的后果比「空白」严重。** 渲染不存在的图标**不空白、不报错、零控制台输出**，画一个 `M5 5h14v14H5z` 的空心方块——和真图标 `stop`（`M6 6h12v12H6z`）几乎一模一样。manifest 里写错名字**不像坏了，像故意的**。现在：名字表抽到 `packages/ui/src/icons.ts`（导出 `ICON_NAMES` / `hasIcon`），兜底换成方框加问号（没有任何真图标长这样），解析不到时 `console.warn` 一次并指名插件与菜单。

`anthropic` 的 `list` **不是名字写错，是图标集缺了一个**：模型目录菜单本来就该是列表图标，现存 55 个里没有合适替代（`ledger` 是账本、`inbox` 是收件箱、`menu` 是汉堡）。加了 `list` 图标，manifest 不改。

图标名静态校验（**排期**）：`icons.ts` 是纯数据无浏览器依赖，加一个 `npm run icons:json` 用 `node --experimental-strip-types` 导出到 `sdk/manifest/check/icons.json`，Go 侧 `embed` 做校验。**两个 icon 字段是两套词汇表，校验层千万别搞混**：顶层 `manifest.icon` 是 `text:<1-2字>` / 包内相对路径 / URL / `data:`（`PluginAvatar.vue` 渲染，已有兜底，七个插件全是 `text:X`）；**只有 `ui.menus[].icon`** 是 SIcon 名字，该对 `ICON_NAMES` 校验。

**4. `/plugin-ui/` 在前端生产代码里一处硬编码都没有**——插件资源 URL 全来自服务端下发的 `UIPlugin.asset_base`，字面量只在 mock fixture 和 vite dev proxy 里。§9.7 第 9 项的前端部分比描述的小得多。`/api/v1` 收敛到 `packages/host/src/routes.ts`（镜像 `sdk/manifest/routes.go`）。

其中一处**不是整洁问题，是安全边界**：`PluginIframe.vue` 里 `/api/v1` 出现三次——建沙箱 iframe 的路径白名单前缀（拦住插件调 `/api/v1/users` 的那道门）、`'/api/v1'.length` 剥前缀、api client 再用**可被 `configureHttp` 改的** `baseURL` 加回去。三个独立的值，**只要一个不一致，白名单校验的路径就和真正发出的路径脱钩**。今天恰好一致，所以不是活漏洞，是雷。现在全部从 `apiBase()` 推导，`src/host.ts` 那个能改掉其中一个值的冗余覆盖也删了。

**5. 一个仓库级陷阱**：`next/server/web/dist/index.html` 是**被 git 跟踪**的占位文件（给 `//go:embed all:dist` 兜底，Docker 的 `ui` stage 自己 build），而同目录 `assets/` 被 `.gitignore` 的 `dist/` 忽略。每次 `npm run build` 都会把它覆盖成引用一堆 ignored 文件的真 index.html——一旦提交，仓库里就有个指向不存在资源的 index.html。**提交前必须确认它不在 diff 里**。

---

## 10. 三期（素材库）落地记录与代价

10 个 Action、13 条 admin 路由、`plg_volcengine` 本地索引、四个宿主渲染页面（2 table + 2 form），版本 0.3.0。**没有 `ui.native`**，所以不需要 `hostUICompat`，也不用付 Critical 权限。

新增权限五条：`accounts.read`(M)、`db.schema`(H)、`routes.admin`(M)、`ui.menu`(M)、`net`(H, optional，`scope.domains` 只到 `*.volcengineapi.com`)。

### 10.1 签名是重算验证过的，不是"能编译"

测试从收到的请求**独立重建**火山 V4 canonical request 并自己推 signing key 链，与 `Authorization` 里的 Signature 逐字节比对；再用「换 SK / 换 region / 换 body 签名都必须变」证明它是签名而不是装饰；10 个 Action 全跑一遍都验签。另有 Action 白名单测试：路由无法诱使插件拿账号的 AK/SK 去签任意控制面调用（如 `DeleteEndpoint`），断言上游收到 0 个请求。

出网全程经注入的拨号器（生产里就是 `egress.DialContext`），`dial == nil` 时直接报错，**绝不回落到直连 socket**。

### 10.2 本地索引与上游不一致的处理

上游是唯一真相，本地只是索引（存在的唯一理由是列表页不必对每个账号各发一次签名调用、各读一次**会写审计**的凭证）。

| 情况 | 处理 |
|---|---|
| 创建：上游成功、索引写失败 | **补偿删除上游**；补偿也失败 → 500 并在消息里给出上游 id（唯一能手工清理的线索）+ error 日志 |
| 创建重试 | `ON CONFLICT (account_id, upstream_id) DO UPDATE`，同一上游 id 不会产生两行 |
| 删除：上游 NotFound | 视为成功，删本地行 |
| 删除：上游其他错误 | **不动索引**并返回错误——丢掉这一行就丢掉了仍存在于上游的资源的唯一指针 |
| 读/改：上游 NotFound | 标 `index_status='missing'`，**行保留不删**（悄悄消失的行和 bug 无法区分），可按此过滤、仍可删除 |
| 字段回写 | 读上游结果用 `CASE WHEN <> ''`（上游没带的字段不得清空索引）；管理员 PATCH 用 `coalesce($n, col)`（提交空串就是要清空） |

凭证每请求每账号最多读一次（请求级缓存），明文不落库、不进日志、不进响应。

### 10.3 火山官方 SDK 的真实代价（需要决策）

指令要求用官方 SDK、禁止手写签名。它能用，但代价比预想的大：

1. **它一度打断了整个 workspace 的构建。** `volcengine-go-sdk` 与 `volc-sdk-golang` 是 `go 1.14` / `go 1.4` 的**未剪枝模块**，传递依赖把**拆分前的单体 `genproto`** 拖进模块图，于是 `go.work` 里**每一个模块**都出现 `ambiguous import: google.golang.org/genproto/googleapis/rpc/status`。已修（在插件自己的 go.mod 里把单体 genproto 顶到拆分之后的版本），代价是 `next/go.work.sum` 多 2 行。
2. **`universal.DoCall` 收不到 `context.Context`**（`DoCallWithType` 也没有）。控制台请求被取消时，**在飞的上游调用无法中止**。现状是调用前查 `ctx.Err()` + 把 deadline 折算成 `http.Client.Timeout`（无 deadline 时 30s）——能做到的最好程度，不是真正的取消。
3. 引入 5 个模块与一张旧模块图。

**替代方案**：自写 V4 签名约 40 行，而且**测试里已经有一份独立实现**（就是上面用来重算验证的那份）。换过去可以一次性去掉上面三条。

代价已经付过且验证通过，所以不急；但 `ctx` 不可取消是持续存在的缺陷。**保留官方 SDK 还是换自写签名，需要决策。**

### 10.4 宿主渲染页面的能力缺口（插件机制）

- **`type: "table"` 的页面是只读的**：`DeclarativeTable.vue` 只有搜索框、刷新、分页，**没有任何行操作**，`manifest.Page` 也没有 `actions` 字段。所以"素材库能在控制台管理"靠 table 做不到，只能再加 `form` 页把创建路径补上。
- **`form` 页里的关联 id 只能手填数字**：schema 表单没有「选项来自插件路由」的能力，所以 `account_id` / `group_id` 要管理员自己抄。体验很糙。正确答案是给声明式表单加一个「选项来自插件路由」的 widget，或者做 native 页——不是现在这样凑。

### 10.5 又两个"声明了但没人管"的形状

| 问题 | 证据 |
|---|---|
| **服务端分页的表格，搜索框完全是死的**：`DeclarativeTable.vue:33` 在 `serverPaged` 为真时直接返回未过滤的行，而 `:56` 的 watch 只监听 `page`/`pageSize`——`q` **既不过滤也不请求**。anthropic 的 `/models` 后端支持 `?q=` 却永远收不到 | `web/src/components/plugin/DeclarativeTable.vue:33,56` |
| **manifest 的菜单图标名没有任何校验**，写错就静默渲染成空方块。实测 `anthropic/manifest.json` 的 `"icon": "list"` **不在** `SIcon.vue` 的 51 个图标里 | 已用脚本比对全部插件 manifest 与图标表 |

### 10.6 契约缺口：插件无法声明「我需要某个 HostService RPC」

三期依赖 §26.6 新增的 `ListAccounts` / `GetAccountCredentials`，但它们落地时 `hostApiVersion` 仍是 1、核心版本仍是 `0.1.0-dev`。`hostCompat` 最细只能表达 `>=0.1.0 <0.2.0`，所以**装在一个还没有这两个 RPC 的 0.1.0 节点上，manifest 校验会通过**，运行时才以 `Unimplemented` 失败（插件把它兜成了可读的 503）。

要真正修，核心在新增 HostService RPC 时需要一个可声明的版本或能力信号。

---

## 11. 五期收尾：预估从「猜」变成「读」，官方 SDK 退场（2026-09-30，0.5.0）

### 11.1 Ark Seedance 事实表（对账时会反复用到）

token = **帧数 × 输出宽 × 输出高 / 1024**，固定 24fps。以下每一条都核对过官方文档，**其中好几条推翻了插件原来的假设**：

| 事实 | 说明 |
|---|---|
| **参数有两种等价写法** | `resolution` / `ratio` / `duration` / `frames` / `seed` / `camera_fixed` / `watermark` 七个参数，除了顶层字段，**也可以写成 `--rs 1080p --dur 30` 挂在 `content[].text` 后面，全系模型都认**，而且**官方从未说明两种写法的优先级** |
| `frames` 优先于 `duration` | 且它是**帧数**不是秒（133 帧 = 5.54 秒）。查询接口回显的 `duration` 是 `frames/24` **向下取整**，**不能用来反推 token 对账** |
| `duration: -1` 是 2.5 的**文档化默认值** | 语义是「模型自己在区间内选」。2.0 系列 / 1.0 pro **连默认值都没有文档** |
| **4k 只有 `doubao-seedance-2-0-260128`** | **2.5 反而不支持 4k**，上限 1080p。全套文档**没有 `2k`**。2.0 fast/mini 只到 720p |
| 时长上界 | 2.5 = 30s，2.0 系列 = 15s，1.0 pro = 12s |
| **像素随比例与代际都变** | 1.0 系列 720p 16:9 是 **1248×704** 不是 1280×720；1080p 21:9 是 2206×946 = 208.7 万像素，**比 16:9 的 207.4 万还多** |
| **「21:9 最贵」不能跨档套用** | 1.0 系列 720p 最贵是 21:9，**1080p 最便宜也是 21:9** |
| `seedance-1-0-lite` **已下线** | 现行文档里只有 6 个 Seedance id |

原来的 `resolutionPixels` 写死 16:9 且不分代际，所以**两个方向同时错**：对 21:9 低估，对 1.0 系列 720p 高估。

### 11.2 预估的三档语义（`fields_omitted` 的落地）

| 情况 | 含义 | 做法 |
|---|---|---|
| 字段**不在** `fields` 也**不在** `fields_omitted` | 客户端没发 | 用 Ark **文档化的默认值**（这是事实，不是猜） |
| 字段在 **`fields_omitted`** | 客户端发了、主机没搬 | **绝不用默认档**，用该模型的**最贵档** |
| 任一 `content.N.text` 被 omit，或 `content.#` > 3 | prompt 没读全 | **四个参数全部作废**，整条按模型最坏情况 |

第三行最容易漏：因为两种写法没有优先级，**prompt 读不全时连已经读到的结构化字段也不可信**，哪怕它写着 480p。实现第一版就在这里写错过（只 bound 了 duration、让 omitted 的 resolution 掉回默认档），结果「全部 absent」和「全部 omitted」估出完全相同的数字，被测试抓出来。

声明的 8 条路径（**顺序即预算优先级**，四个短标量必须排在 prompt 前面，否则一条 4 KiB 的提示词能把决定价格的字段挤掉）：

```json
"usageRequestFields": ["resolution","ratio","duration","frames","content.#",
                       "content.0.text","content.1.text","content.2.text"]
```

`content.#.text` 在契约里**不可表达**（`ValidUsagePath` 只收单值路径），所以靠 `content.#`（数组长度）判断有没有看不见的元素。见 CONTRACTS §25.7 第 2 条。

### 11.3 预扣金额的变化

| 请求 | 旧预扣 | 新预扣 |
|---|---|---|
| 2.0，明确 1080p / 16:9 / 5s | 1,944,000 | **243,000**（÷8） |
| 2.5，明确 720p / 16:9 / 5s | 486,000 | **108,000**（÷4.5） |
| 2.0，什么都不写 | 1,944,000 | **326,041**（文档默认 720p + 15s 上界） |
| **2.5，什么都不写** | 486,000 | **652,083**（×1.34，见下） |
| prompt 读不全 | — | 模型最坏情况（2.0 = 4k × 15s） |

**一处藏在常量里的产品决策，已定（2026-09-30）：接受上界，靠核对退回。** `duration: -1` 是 2.5 的默认值，所以一条不写时长的 2.5 提交按 **30 秒**预扣 ≈ 45 元，而它多半是 5 秒的活（≈7.6 元），预扣即小额余额用户提交时要跨过的门槛。

**决定保留上界的理由**：预扣是预估，核对会结算——猜高的代价是一段临时占用的余额，Ark 一报真实用量差额就退回；猜低的代价是一个 30 秒的视频渲染在一个只付得起 5 秒的余额上。任何更低的数字都是上游不支持的数字。另外两个出口（加「未知时长按 N 秒预估」的配置旋钮；核心支持「预扣 X、上限 Y」）都没做——前者等于把一个没有依据的秒数搬到配置里，后者是核心契约改动，没有第二个用例之前不值得开。

这条与 §25.4 的 `max_reconcile_age_sec` 是同一形状：**一个看起来像占位符的常量其实是产品决策**，所以 `videospec.go` 的文件头注释里写明了它是定过的，免得下一个人当成随手填的数字调低。

### 11.4 结构性低估（提交时无法修正）

2.5 的 edit / extend / 参考视频任务，官方公式把**输入视频时长**也算进 token，而输入是 URL 或 asset id，**提交时看不到长度**；且这三类任务的输出比例是「与输入素材一致」，可能不在那 6 个比例内，**官方没给对应像素值**，所以「取该档最大面积」对它们不是严格上界。只能靠核对循环的真实 `completion_tokens` 补扣 —— 但如果以后要做「提交时给用户报价」，这里报不出来。

### 11.5 §10.3 结案：官方 SDK 已移除

换成约 120 行自写 V4 签名。收益四条：

1. **`ctx` 真正可取消**。旧实现下控制台请求取消后，`DoCall` 仍占一个 goroutine 和一个 socket 最多 30 秒，而这个插件的 manifest 只给了 **`maxOpenFiles: 128`** —— 反复刷素材列表足以打满 fd，连带数据库一起挂。新测试**两头都断言**：调用方拿到 `Canceled`，**且上游 handler 确认自己的 `r.Context()` 被取消了**（socket 真的断了，不是把请求丢在那儿跑）。
2. **不再重试非幂等的 `Create*`**（§10.3 漏记的一条代价）。旧的 `WithMaxRetries(2)` 会重试 `CreateAssetGroup` / `CreateAsset`，重试一次就在上游多建一个资源，而创建路由只拿得到最后一次尝试的 id ——「上游成功但索引写失败就补偿删除」这条设计**永远够不到第一个**。
3. **go.mod 少 6 个模块**，含 §10.3 当初为压住歧义导入而 pin 的**单体 `google.golang.org/genproto`**（`go mod why` 确认主模块根本不需要它）。那笔 workspace 污染债一并还清。
4. 顺带补了非 JSON 响应的处理（中间代理的 HTML 502、空 body、200 里塞数组），旧代码对这些只会给一个含糊的 `InternalError`。

**正确性风险由 golden vector 消除**：在删掉 SDK **之前**，先用官方 SDK v1.2.54 真的发出两个请求并把整个请求逐字段冻结（含它随机生成的 `X-Sdk-Invocation-Id`），自写签名对同样输入必须产出**逐字节相同**的 `Authorization`。**这批向量一旦需要重新生成，必须再从官方 SDK 取 —— 用 `signV4` 重算会让测试变成同义反复**（测试文件头写明了这一点和抓取方法）。

> 主控独立复核过一次：从 Go 模块缓存取 `volc-sdk-golang@v1.0.23`（SDK 签名的实际实现），用同样输入独立签名，两个签名 `527a9b6e…` / `3d61934c…`、payload hash 与 SignedHeaders 列表与提交的 golden vector **逐字节相同**。向量的出处是真的。

抓取过程立刻暴露三个**照文档写一定会写错**的细节：

- **签名的 header 集合不是固定列表**，是 `Content-Type` / `Content-Md5` / `Host` / `X-Security-Token` **加上所有 `X-` 开头的 header**。SDK 自己就多签了两个 `X-Sdk-*`
- **`Content-Type` 实际发的是 `application/json; charset=utf-8`**（`universal.DoCall` 明明 `Set` 的是 `application/json`，被下游 handler 覆盖了），而它**参与签名**
- **Host 带 80/443 时签名去端口，其他端口保留**；路径分段用 RFC 3986 unreserved 集，**`url.PathEscape` 不等价**（它放过 `$&+,:;=@`）

为保证独立性，原有那份从收到的请求独立重算的 `verifySignature` **不共用生产代码的原语**（共用的话原语出错会两边抵消，测试照过）。

### 11.6 其余

- 素材库两个路由支持 `?q=`（ILIKE 匹配操作员在表格里看得见的列，`count(*)` 走同一个 where，否则会翻页翻到已被过滤掉的行），并**转义 LIKE 元字符**（`\` `%` `_`）。`anthropic` 的 `/models?q=` **没有转义** —— `?q=%` 返回全量目录并显示成搜索结果，`?q=a_c` 命中 `abc`，与「搜索框返回全量」是同一类静默答非所问。`moderation` 本来就是正确写法。**已另开任务修 anthropic**，也可考虑把 `LikeTerm` 提到 `pluginsdk`。
- 两个 table 页已声明 `"search": "q"`（`manifest.Page.Search`）。核心的 check 能验名字合法、不撞 `page`/`page_size`、`source` 真实存在，但**「路由到底认不认这个名字」只有插件自己的测试能证明** —— `manifest_test.go` 断言声明与 `volcengine.SearchParam` 一致，分叉就红。
- `est_tokens` **保留列、保留写入、停止读取**。不删是因为插件迁移 checksum 不可变（见 CONTRACTS §25.7 末尾）；不「停止读写」是因为该列 `NOT NULL DEFAULT 0` 没有「未知」值，停写会让每一行新记录都声称预扣 0 —— 那正是「整列变成噪音」。它现在记录的是**从客户端真实请求算出来的**预扣数字，是被质疑计费时第一手的证据。
- `profileOf` 是子串匹配，Ark 的 Endpoint ID（`ep-...`）会落进 unknown 画像。管理员若用 Endpoint ID 注册模型，估算会退化 —— 但只在请求没写 resolution 时才用到这个默认值。
- 估算凡是 bound 了东西都会打一条 `assumed` INFO 日志（哪几项被兜底、`fields_omitted` 是什么、算出多少 token）。用户问「为什么扣这么多」时先看这条。
- 版本 **0.4.0 → 0.5.0**。
