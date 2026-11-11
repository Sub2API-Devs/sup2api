# 通用配置项与核心编辑器（第 2 期技术规格）

设计文档：https://claude.ai/artifact/Moff7JVEEQdkcgRAL4KK3k “通用配置项与编辑器”一节。实现完成后并入 CONTRACTS §87。

目标：限流、参数覆盖、请求头透传、代理、模型映射等账号通用配置只由核心实现一份界面和执行逻辑；插件只声明默认值、是否显示、是否可改、是否锁定，或在自己的页面引用核心编辑器。

## 1. commonControls 扩展

manifest `accountTypes[].commonControls`：键 = 通用项名，值 = 声明。

| 名称 | 账号字段 | 值类型 |
|---|---|---|
| `schedulable`、`auto_disable`（已有） | 同名 | bool |
| `priority` | `priority` | int |
| `weight` | `weight` | int |
| `max_concurrency` | `max_concurrency` | int |
| `rpm_limit`、`tpm_limit`、`spm_limit` | 同名 | int |
| `spm_window_seconds` | `spm_window_seconds`（会话周期，CONTRACTS §71.1） | int，60–86400，核心默认 60；声明它需 `hostCompat` 下限 ≥0.1.276（`check.SPMWindowFirstCore`） |
| `model_limits` | `model_limits` | 数组（同账号接口；各列表可带 `spm_window_seconds`，带了同样需下限 ≥0.1.276） |
| `usage_limit` | 账号用量限制（§73） | 对象（同账号接口） |
| `model_mapping` | `model_mapping` | 对象 |
| `param_override` | `param_override` | §84 对象 |
| `header_passthrough` | `header_passthrough` | 字符串数组 |
| `environment` | `environment`（各项超时） | 对象 |
| `proxy` | `proxy_id` / `proxy_url` | 只支持 `required` |

每项声明（都可省略）：

| 字段 | 含义 | 缺省 |
|---|---|---|
| `visible` | 编辑页是否显示 | true |
| `configurable` | 能否修改（false = 只读，值固定为 `default`，已有账号保持原值） | true |
| `default` | 新账号的默认值 | 核心默认 |
| `locked` | true = 值永远是 `default`，新老账号都不能改；核心强制 | false |
| `required` | 只用于 `proxy`：必须配置代理 | false |

- 合并：插件默认值 → 账号自己的值 → 插件锁定值。
- `visible: false` 只影响界面；后端仍按 configurable/locked 校验（隐藏且可改的项，接口照样能设）。
- 与 `defaultLimits` 的关系：同一字段两处都写时以 `commonControls.<名>.default` 为准；check 报冲突（两处不同值）。`defaultLimits` 继续有效。
- 后端（`account/handlers.go applyCommonControls` 泛化为表驱动）：新建时缺省值取 `default`；`configurable: false` 或 `locked` 时，新建只接受 default、更新只接受原值（locked：只接受 default），否则字段错误 `read_only`；`proxy.required` 时新建 / 更新后没有代理报 `required`。锁行后校验（沿用现有做法），绕过界面直接调接口也改不了。
- `GET /account-types` 原样返回 `common_controls`（键为上表名称）。
- check：未知名称、值类型不符、`default` 越界（复用账号接口的范围校验）、`required` 用在 proxy 之外、`locked` 却没有 `default` 都报错。

## 2. 编辑页按声明渲染

- 账号编辑页（`web/src/views/accounts/AccountEditor.vue` 及各分区组件）对每个通用项读声明：`visible: false` 隐藏；不可改或锁定时控件置灰并显示原因（复用 `accounts.editorUi.commonControlFixed` 一类文案）；新建时预填 `default`；`proxy.required` 时代理必填并提示。
- 编辑页不认识任何具体插件；导航摘要跳过隐藏项。批量编辑：对不可改的项，所选账号所属类型有不可改的，该项置灰并提示。

## 3. 核心编辑器开放给插件（UI 3.7）

- `@sub2api/host`：`HOST_UI_VERSION` 3.6.0 → 3.7.0；`PluginHost.components`（只读对象）提供 `ParamOverrideEditor`、`RateLimitEditor`（rpm/tpm/spm，2026-11-11 起会话数一行带会话周期 `spm_window_seconds`，只在给过或改过时出现在 v-model 里）、`ModelLimitsEditor`、`HeaderPassthroughEditor`、`ProxyPicker`、`ModelMappingEditor`、`UpstreamEditor`，props 与 v-model 形状和账号接口字段一致；用到的插件声明 `hostUICompat: "^3.7"`（sdk/manifest check 按 3.7 要求核心下限为本期核心版本）。
- schema 表单控件（`web/src/components/schema/widgets.ts`）：新增 `param-override`、`header-passthrough`、`rate-limits`、`model-limits`、`model-mapping`（`proxy-select`、`upstream-editor` 已有），插件设置和账号凭证表单都能用；数据格式即核心执行格式，校验在插件自己的设置接口里用 SDK 同一套规则（`sdk/paramoverride` 等）。
- 规则：组件产出的格式就是核心执行的格式，插件不自己解释；凭证头、逐跳头仍在 §81 禁止列表。

## 4. 编辑页分区插槽

- 新插槽 `account.editor.section`：插件在 manifest `ui.slots` 声明，带 `label`、`icon`、可选 `accountTypes`（只对这些类型显示）。账号编辑页在导航最后追加这些分区，props `{ account, accountType, readonly }`。
- 按 §23.3 的决定，插件分区不进核心保存流程：分区内的配置由插件自己的接口保存（新建账号时分区显示“保存账号后可配置”）。

## 5. ccgateway

第 2 期不动 ccgateway 的核心内集成（CC 授权流程、CC 特性、语言、自动模型），等用户决定是否整体搬进插件（见 2026-11-09 线程）。新的通用机制（`proxy.required`、分区插槽）就绪后，搬迁时可直接使用。
