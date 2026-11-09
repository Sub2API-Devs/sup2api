# 声明式上游（第 1 期技术规格）

设计文档：https://claude.ai/artifact/Moff7JVEEQdkcgRAL4KK3k （“sup2api 核心通用协议层设计”，方案二）。本文件是第 1 期的实现规格，实现完成后并入 CONTRACTS §86，本文件保留为插件开发说明。

## 0. 定案（用户 2026-11-09 确认）

1. 账号参数覆盖（§84）先于插件执行（用户 2026-11-09 改定）：模型映射 → 预设/清单声明改写 → 账号参数覆盖 → 路由与插件补丁。请求头顺序：预设/清单 → 透传 §81 → 参数覆盖 → 插件 → 鉴权。理由：插件改写是插件自己的内部特殊逻辑，插件知道前面已经执行过账号参数覆盖，所以排在覆盖之后，看到覆盖结果再改。
2. 鉴权头只能由路由的 auth 模板决定：普通请求头（清单 headers、插件头、透传、参数覆盖）都改不了它，核心在最后写入。
3. 支持 `runtime: "none"`（只有清单、没有进程的插件）。
4. extend 模式这次一起做。
5. 请求头模板：`{api_key}`、`{credentials.<k>}`、`{header.<name>}`（客户端头），只限清单声明过的字段；仍禁止透传客户端凭证头。
6. relaykit（AGPL）只参考行为，不拷代码。

## 1. 总体

账号类型在 manifest `accountTypes[].upstream` 声明上游。声明了 upstream 的类型由核心本地实现 `core.PlatformPlugin` 的 5 个入口（ValidateCredentials、BuildUpstreamRequest、ClassifyError、BuildTestRequest、BuildModelsRequest），不调插件进程；`extend: true` 时 BuildUpstreamRequest 先由核心构造，再交给插件追加。

纯计算的“引擎”放在 SDK（`sdk/upstream`），核心（`server/internal/plugin/declarative`）、打包工具和插件测试共用同一份实现。

```
sdk/platforms/upstream/{openai,anthropic,gemini}.json   核心预设（路由表）
sdk/manifest            AccountType.Upstream 类型、Runtime "none"
sdk/manifest/check      upstream 与 runtime none 的校验
sdk/upstream            Resolve（预设+清单+账号）与 Build/Test/Models/Validate/Classify
sdk/paramoverride       §84 引擎（从 server/internal/core 原样迁出，核心保留别名）
server/internal/plugin/declarative   core.PlatformPlugin 适配器（含 extend 包装）
```

## 2. 预设与 manifest 格式

预设与 manifest 的 `upstream` 是同一种结构 `Upstream`；manifest 写 `preset` 引用预设，其余字段逐项覆盖（合并规则见 §2.3）。字段名以设计文档“上游声明格式”一节为准。

```jsonc
"upstream": {
  "preset": "anthropic",            // openai | anthropic | gemini；自定义上游类型也必须写
  "extend": false,                  // true：核心构造后再调插件 BuildUpstreamRequest（需 runtime grpc）
  "accountConfig": false,           // true：账号 settings.upstream 可覆盖（只给自定义上游类型）
  "baseURL": { "default": "https://api.anthropic.com", "required": false, "stripSuffixes": ["/v1"] },
  "credentials": {                  // 与 baseURL 一起对应 apikey.Spec
    "keyValidator": { "prefixes": ["sk-", "sess-"], "minLength": 10 },   // 省略 = 任意 8-512 个可见字符
    "texts": { "unsupportedAccountType": "...", "keyNotString": "...", "keyNotStringCode": "pattern",
               "baseURLRequired": "...", "baseURLFormat": "..." },
    "fields": ["account_id"]        // 模板可引用的其他凭证/设置字段（{credentials.account_id}）
  },
  "auth": { "type": "header", "name": "x-api-key", "value": "{api_key}" },   // header | query | none
  "headers": {                      // 所有路由共用；键 = 小写头名，值 = 一种写法 + 模板；null 删除
    "content-type": { "set": "application/json" },
    "anthropic-version": { "default": "2023-06-01" }
  },
  "routes": {                       // 键 = 上游协议 id（RequestMeta.protocol）；null 删除
    "anthropic.messages":     { "path": "/v1/messages" },
    "anthropic.count_tokens": { "path": "/v1/messages/count_tokens" }
  },
  "defaultProtocol": "anthropic.messages",   // meta.protocol 为空时用
  "filterFields": [],               // 默认不透传的请求体顶层字段（账号层可用 allowFields 放开）
  "paramOverride": null,            // §84 格式；清单的固定改写
  "classify": "anthropic",          // openai | anthropic | gemini → sdk/pluginsdk/providers/<x>.Policy
  "test":   { "protocol": "anthropic.messages", "model": "claude-haiku-4-5", "body": "anthropic.ping" },
  "models": { "path": "/v1/models?limit=1000", "idPath": "data.#.id" }   // null = 不支持拉模型
}
```

### 2.1 路由 `Route`

```jsonc
{
  "method": "POST",                       // 默认 POST
  "path": "/v1beta/models/{model}:streamGenerateContent?alt=sse",   // 可带查询串；值是模板
  "transport": "http",                    // http | websocket（openai.responses_ws：ws(s) 方案、GET、去掉 content-type）
  "headers": { ... },                     // 本路由的头，合并在共用 headers 之后
  "patches": [ { "op": "set", "path": "stream_options.include_usage", "value": true, "when": "stream" } ],
  "model": { "from": "request", "trimPrefix": "", "required": false }
}
```

- `model.from`：`request` = `pluginsdk.RequestModel`（请求体 model，退回 meta.model）；`meta` = meta.model。`trimPrefix` 去掉前缀（gemini 的 `models/`），`required` 为空时报 InvalidArgument。结果作为 `{model}` 和 `upstream_model`。
- `{model}` 在路径部分按 `url.PathEscape` 转义，在查询串部分按 `url.QueryEscape` 转义。
- `patches[].when`：省略 = 总是；`stream` = `meta.stream` 为真时。值是任意 JSON。
- websocket：URL 方案 https→wss、http→ws，method GET，删除 content-type；`openai-beta` 由路由 headers 用 append 追加 `responses_websockets=2026-02-06`（已含 `responses_websockets=` 时不追加）。

### 2.2 请求头

每个头写成 `{"set": v}`、`{"default": v}` 或 `{"append": v}`，v 是模板：

| 写法 | 含义 |
|---|---|
| `set` | 覆盖 |
| `default` | 只在没有这个头时写（客户端经 passHeaders 带来的优先） |
| `append` | 已有值不含该值时用 `,` 追加；没有就写入 |

单次构造的顺序（引擎内部）：
1. inbound headers（核心已按 passHeaders 过滤，原样带上）
2. 共用 `headers`，再路由 `headers`
3. auth（header 型写入 `auth.name`；query 型写进 URL 查询参数）

核心发送时的完整顺序见 §4。

### 2.3 合并规则

`Resolve(preset, manifest, account)`：预设 → 清单 → 账号，后面覆盖前面；对象按字段合并，`headers` 按头名、`routes` 按协议合并（路由内逐字段，`headers` 按头名、`patches` 整体替换），写 `null` 删除。清单可新增预设没有的协议键，但必须是账号类型 `platforms[].endpoints` 覆盖到的协议。

账号层（仅 `accountConfig: true`，即自定义上游）：账号 settings 字段 `upstream`，只能写 `baseURL`（default 之外由账号 base_url 设置给出）、`auth`、`headers`、`routes` 的 `path`，以及 `allowFields`（放开哪些 filterFields）。不能改 `credentials`、`classify`、`test`、`models`、`paramOverride`、`transport`、`patches`、`model`。

可服务的端点 = routes 里列出的协议（原生）加核心能转换到它们的协议；调度规则不变（routes 必须与账号类型 `platforms[].endpoints` 一致，check 校验）。

### 2.4 模板

可用变量：`{api_key}`、`{base_url}`、`{model}`（映射和账号参数覆盖之后的上游模型；插件 patch 改了模型时只重算 URL）、`{credentials.<k>}`（k 必须在 `credentials.fields` 里）、`{client_header.<name>}`（name 必须在该账号类型的 passHeaders 里，且不在 §81 禁止列表；只能用在普通请求头）。未知变量 → 校验失败（manifest check / 账号保存时）。运行时变量取不到值 → 该头不写。`{api_key}` 只允许出现在 auth.value 和路径查询串里；`{client_header.*}` 不允许出现在 auth。

### 2.5 默认过滤字段

`filterFields` 是请求体顶层字段名列表，构造时删除（账号层 `allowFields` 列出的除外）。预设声明各家的候选列表（openai/anthropic：`service_tier`、`safety_identifier`、`inference_geo`、`speed` 中适用的），但为了行为不变，openai、anthropic、gemini、relay 四个插件的清单把 `filterFields` 设为 `[]`；只有自定义上游类型用预设的默认过滤。

## 3. 引擎（sdk/upstream）

```go
type Profile struct { /* Resolve 的结果，全部字段已合并 */ }

func Preset(name string) (manifest.Upstream, bool)
func Resolve(m *manifest.AccountType, passHeaders []string, account json.RawMessage) (*Profile, error)
func (p *Profile) Validate(in *pluginv1.ValidateCredentialsRequest) *pluginv1.ValidateCredentialsResponse
func (p *Profile) Build(in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error)
func (p *Profile) Test(in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error)
func (p *Profile) Models(in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error)
func (p *Profile) Classify(now time.Time, in *pluginv1.ClassifyErrorRequest) *pluginv1.ClassifyErrorResponse
func (p *Profile) AuthHeader() string   // header 型返回小写头名，供核心最后重写
```

- Validate：`apikey.Spec{AccountType, DefaultBaseURL, StripSuffixes, RequireBaseURL, KeyValidator, Texts}.Validate`；`accountConfig` 时额外校验 settings.upstream 的形状与模板。
- Build：返回的 `Patches` 是路由 `patches`，再接清单 `paramOverride` 产生的补丁（引擎把 §84 结果转成 SET/DELETE 补丁不现实，所以清单 paramOverride 由核心在 extend 之前对请求体执行，见 §4；引擎不处理它）。
- Test：`body` 取值 `openai.chat_ping` | `anthropic.ping` | `gemini.ping`（复用 providers 的 ping 体，maxTokens 1），或一个含 `{model}` 的 JSON 模板。`UsageProtocol` = test.protocol；URL 与请求头按该协议路由构造（不带 inbound 头）。
- Models：`apikey.ModelListRequest` 等价。
- 等价性：openai/anthropic/gemini/relay 四个旧插件对同一输入的输出必须与 `Profile` 逐字节一致（URL、method、headers、patches、upstream_model、测试与模型列表请求、校验结果、错误归类）。

## 4. 核心

### 4.1 绑定（registry.addAccountTypes）

- 类型声明了 upstream：`Client = declarative.New(profile, ext.Platform())`。不需要 `accounts.credentials` 授权（凭证只在核心内使用），插件进程可以没有（runtime none）。
- `extend: true`：BuildUpstreamRequest 先由 Profile 构造得到 base，再调 `ext.Platform().BuildUpstreamRequest`，请求里带 `base`（proto 新字段）；插件返回的 headers 追加覆盖 base 的（鉴权头除外），patches 接在 base patches 之后，url 非空时替换。其他 4 个入口仍由 Profile 实现。extend 要求 `accounts.credentials` 授权（插件要看凭证）。
- 声明式 Client 不实现 `core.ExecutePlugin`，所以走 BuildUpstreamRequest + forwardBuilt 路径。

### 4.2 runtime none

- 包里没有 runtimes；不能声明需要进程的能力（hooks、routes、jobs、scheduler、observer、notification、platforms 的 plugin 用量提取等，见 check）。
- rollout 的 Runtime 按 manifest.Runtime 分派：`none` 返回一个常驻 ready 的静态实例（Platform() 为 nil，Grants 照常读），迁移、drain、stop 都是空操作。

### 4.3 发送顺序（gateway）

请求体：模型映射 → 协议转换 → filterFields（账号没放开的）→ 预设/清单 paramOverride（声明的固定改写）→ **账号 §84 覆盖** → Build（`meta.model` 为覆盖后的模型）的路由 patches → 插件 extend / 老插件 patches → streamOnly 强制。插件 patch 改了 model 时，声明式类型按最终请求体的 model 重新渲染 URL（`core.DeclaredUpstream.UpstreamURL`）；代码插件的 URL 是它自己的。WebSocket 每轮同样。

请求头：声明构造的头（inbound → 预设/清单 → 路由）→ 声明的 paramOverride 头 → 透传 §81 与粘性规则（只补没设的）→ 账号 §84 头 → 插件头（`SplitHeaders` 区分声明和插件的）→ **鉴权头重写** → 核心资源头、额度头。

### 4.4 接口

`GET /api/v1/account-types`（及账号类型详情）为声明式类型返回 `upstream`：Resolve 后的清单层结果（不含账号层），控制台“从预设填入”用它。

## 5. 自定义上游（内置插件 `custom` 0.1.0）

- runtime none，内置随核心安装并启用。
- 三个账号类型，`creationGroup: "custom"`（新建账号时归在同一组“自定义上游”）：`custom_openai`（preset openai，platforms openai 全部端点）、`custom_anthropic`（preset anthropic）、`custom_gemini`（preset gemini）。都 `accountConfig: true`、`baseURL.required: true`、key 任意，`filterFields` 用预设的默认过滤（service_tier、inference_geo、speed、safety_identifier 中该协议适用的）。
- 表单 schema：`api_key`、`base_url`、`upstream`（object，可选；uiSchema `"ui:widget": "upstream-editor"`）；settingsFields `base_url`、`proxy_id`、`upstream`。凭证加密不回显，其余是设置。
- 控制台 `UpstreamEditor` 组件（schema 表单的 `upstream` 控件）：编辑 auth（方式、名称、模板）、headers、按协议的 path、放开哪些默认过滤字段；默认值来自账号类型 Resolve 后的 `upstream`，可一键恢复；保存的数据就是 §2.3 账号层结构，核心用同一份校验。
- 模型和测试：“获取模型”走 models，“测试”走 test；只服务部分模型用账号的模型列表。
- 不做：路由上选转换器（核心自动选）、按模型分路由、账号上关掉单个协议（第 3 期 count_tokens 本地估算兜底）。

## 6. 四个插件

| 插件 | 版本 | 做法 |
|---|---|---|
| openai | 0.4.0 | runtime none，`upstream.preset: openai` |
| gemini | 0.3.0 | runtime none，`upstream.preset: gemini` |
| relay | 0.3.0 | runtime none，`preset: anthropic`，`baseURL.required`，key 任意，texts 沿用 |
| anthropic | 0.3.0 | runtime grpc（保留模型目录 /models 路由与迁移），账号类型声明 `preset: anthropic`，Platform 实现删除 |

账号类型 id、plugin key 不变；`accounts.credentials` 授权在 runtime none 插件里删除。

## 7. 测试

- 黄金样例：在改动前用旧插件代码对输入矩阵生成 `sdk/upstream/testdata/golden/<plugin>.json`（每种协议 × 有无 base_url × 有无 inbound 头 × stream × gemini models/ 前缀 × anthropic-version 传与不传 × ws；测试请求；模型列表；校验的合法/非法凭证；classify 的现有测试数据），新引擎逐项比对。
- 引擎单测、check 单测、registry/rollout 单测（runtime none、extend）、gateway 单测（§84 位置、鉴权头重写、model 改写后 URL 重算）。
- `go test -race` 全量（容器内），web 单测，控制台截图（新建自定义上游、编辑路由）。

## 8. 实现记录（与上文不同或上文没写的地方）

契约以 CONTRACTS §86 为准，这里记实现时定下的细节。

- **合并**：各层按 JSON merge patch 合并原始 JSON；一个请求头的写法和 `paramOverride` 整体替换。路由里写 `null` 的头只对该路由删除共用头。`manifest.Upstream` 保留解码时的原始字节（`Layer()`），所以 Go 里构造的声明表达不了 `null`。未知字段拒绝。
- **账号层**：只能写 `auth`、`headers`、已声明协议的 `path`、`allowFields`；`baseURL` 由账号的 `base_url` 设置给出，账号层不能写。先读设置，再读凭证。账号层能改鉴权头名，所以 `AuthHeader` 带账号参数。
- **inbound 头**：引擎自己按 passHeaders 过滤（小写精确匹配、去空白、空值跳过），与旧插件的 `apikey.ForwardHeaders` 一致。
- **模型**：只有路由设了 `trimPrefix`（gemini）时 Build 才去空白和前缀；测试模型总是去前缀。“model is required” 的文案由路由路径推出，与旧 gemini 一致。
- **append**：值是 `key=version` 时，已有同 key 的任意版本就不追加（openai-beta 的规则）。
- **模板位置**：`{base_url}` 只能用在 auth 和请求头；`{credentials.api_key}`、`{credentials.base_url}` 拒绝，免得绕过 `{api_key}` 只能放 auth 的规则。
- **新增字段**：`models.stripPrefix`（gemini 的 `models/`）；`providers/gemini.GenerateContentPingBody`。
- **`accounts.credentials`**：只有存在没声明 upstream 或声明了 extend 的账号类型时才需要。
- **runtime none**：能力只允许 `platform.adapter.v1`、`platform.websocket.v1`（responses_ws 需要后者）。
- **表单控件**：schema 表单用 uiSchema 的 `"ui:widget": "upstream-editor"`（不是上文早期写的 `x-widget`）。
- **字段错误**：账号层每个问题一个字段错误，`credentials.upstream.<路径>`。
- **执行路径**：`platform.execute.v1` 插件拿到的是覆盖后的请求体和模型，经核心转发的请求不再重复执行覆盖。
