# 产品功能差距分析：sub2api 原版 / new-api / next 新平台（2026-10-04）

> 范围：只读盘点，未改任何源码。结论以代码为准，每项附路径证据。
> 路径前缀约定：
> - **S** = sub2api 原版，`backend/internal/...`（后端）、`frontend/src/views/...`（前端）
> - **N** = new-api（`D:/projects/golang/new-api`），`router/`、`controller/`、`model/`、`service/`、`web/default/src/features/...`
> - **X** = next 新平台，`next/server/internal/...`、`next/web/src/views/...`、`next/plugins/...`、`next/sdk/...`
>
> 标记：✅ 有 ｜ ⚠️ 部分/弱 ｜ ❌ 代码中未发现

---

## 0. 总评

1. **next 的平台底座已经超过两个参照项目**：插件运行时（签名、授权、多节点发布、沙箱、出口隧道）、主从节点升级、表达式计费（按上下文分档、按时段、按请求头/参数加价）、价格同步源、自定义角色 RBAC 与"自己创建的"所有权授权、可配置粘性会话规则引擎、网关钩子、核心托管异步任务与预扣/对账，这些 sub2api 和 new-api 都没有，或者做得更弱。
2. **next 的"运营/商业层"几乎是空的**。sub2api 原版是面向 C 端的完整中转站：自助注册、第三方登录、2FA、充值支付、兑换码、订阅、邀请返利、公告、邮件通知、运维监控、模型广场。这些在 next 里都没有。按 `ARCHITECTURE.md` §1.2，"支付和用户自助充值、OAuth 类账号"是**有意推迟**；其余大多是**还没迁移**。
3. **网关客户端体验有硬缺口**：next 没有客户端用的 `/v1/models`。`sdk/platforms/*.json` 声明的端点里没有它，未命中的 GET 会落到控制台 SPA 回退，所以未带凭证访问也返回 200（HANDOFF-2026-10-03 §2.8 把这当成正常，其实是误判）。API Key 只有名称、分组、过期三个字段，没有额度、限速、IP 限制、模型限制。
4. **建议路线**：先补"能对外开站"的最小闭环：Key 增强 → 模型列表与广场 → 注册与邮件 → 账号健康与错误策略 → 充值/兑换插件 → 报表。商业逻辑（支付、兑换、签到、返利、通知、动态权重）尽量做成插件，通过已有的 `HostService.LedgerCredit/Debit`（critical 权限，带 `maxPerTx`/`maxPerDay` 范围和幂等键，`X: plugin/grpcruntime/host.go:279-334`）落账。凡是影响"钱、身份、安全、调度"最终决定的部分，留在核心。

---

## 1. 归属原则（来自 docs，用于第 4–6 节判断）

| 原则 | 出处 |
|---|---|
| 核心负责"数据、钱、安全、调度"；插件负责"某种账号怎么对接上游"和"额外的业务逻辑"；插件不能直接改余额，只能调用受限的账本接口 | `ARCHITECTURE.md` §3 |
| 插件执行、核心记录：插件只陈述上游事实（用了多少），核心决定价格、归属、扣费 | `PLUGIN-EXECUTES-CORE-RECORDS.md` §1，CONTRACTS §25/§31 |
| 粘性会话、限流身份、failover 留在核心；插件只能通过 `ResolveAffinityKey`/`RankAccounts` 提供取值与排序建议，最终调度权在核心 | CONTRACTS §24，memory「粘性会话留在核心」 |
| 模型价格、账号模型列表、映射、权重、限流都是核心属性，由管理员配置 | CONTRACTS §17、§18 |
| 插件路由支持 `public`/`webhook` 鉴权，可承接支付回调 | `X: plugin/routes/routes.go:201` |
| 插件可订阅核心事件（`usage.recorded`、`balance.changed`、`account.status_changed`、`user.created` 等）、跑定时任务、声明菜单与原生页面 | CONTRACTS §6、§22、§23 |

---

## 2. 功能矩阵

### 2.1 用户、身份与安全

| 功能 | sub2api | new-api | next | 差距说明 |
|---|---|---|---|---|
| 管理员建用户/启停/删除 | ✅ `S: server/routes/admin.go:300-325` | ✅ `N: router/api-router.go:144-164` | ✅ `X: iam/http.go:25-30` | — |
| 用户自助注册 | ✅ `S: routes/auth.go`（`/register`、`send-verify-code`） | ✅ `N: api-router.go:77` | ❌ 只有 `/auth/login` `/auth/refresh`（`X: iam/http.go:18-23`） | **丢失**。不能自助开站 |
| 邮箱验证/找回密码 | ✅ `S: auth/ForgotPasswordView.vue`、`EmailVerifyView.vue` | ✅ `N: api-router.go:44-46` | ❌ 无 SMTP 模块 | **丢失**，依赖邮件基础设施 |
| 邀请码注册 | ✅ `S: /validate-invitation-code`、`auth_service_invitation_race_test.go` | ⚠️ 通过 aff 码 | ❌ | 丢失 |
| 人机验证（Turnstile/阿里/腾讯） | ✅ `S: service/turnstile_service.go`、`aliyun_captcha_service.go`、`tencent_captcha_service.go` | ✅ Turnstile `N: middleware/turnstile-check.go` | ❌ 只有登录限速（`X: iam/ratelimit.go`） | 丢失 |
| 第三方登录 | ✅ LinuxDo/GitHub/Google/OIDC/微信/钉钉（`S: handler/auth_*_oauth.go`） | ✅ GitHub/Discord/OIDC/LinuxDo/Telegram/微信 + 自定义 OAuth 提供商（`N: controller/custom_oauth.go`、`oauth/`） | ❌ | 丢失；new-api 的"自定义 OIDC 提供商（discovery）"更通用 |
| TOTP 2FA | ✅ `S: handler/totp_handler.go` | ✅ 含备用码（`N: controller/twofa.go`） | ❌ step-up 只校验密码（`X: iam/http.go:90-103`） | 丢失 |
| Passkey | ✅ `S: handler/passkey_handler.go` | ✅ `N: controller/passkey.go` | ❌ | 丢失 |
| 会话管理 | ⚠️ 只能全部吊销（`/auth/revoke-all-sessions`） | ✅ 列出/单个吊销/吊销其他（`N: api-router.go:94-96`） | ⚠️ 有 refresh 家族与重放检测（迁移 0006），没有会话列表 | new-api 更好，可引入 |
| 新设备登录验证 | ❌ | ✅ `N: model/login_verification.go`、`/login/verify` | ❌ | 可选 |
| 用户访问令牌（管理 API） | ⚠️ 全局单个 admin API key（`S: admin.go:577-579`） | ✅ 每用户 access token（`N: controller/access_token.go`） | ❌ 只有 JWT | 可引入 |
| 自定义角色/权限 | ⚠️ 固定 admin/user | ✅ casbin 角色（`N: router/authz-router.go`） | ✅ 自定义角色 + 插件权限 + own 级授权（`X: authz/http.go`、CONTRACTS §21） | next 最强 |
| 用户自定义属性 | ✅ `S: admin.go:713-723` | ❌ | ❌ | 丢失（低优先） |
| 供应商角色（只管自己的账号） | ❌ | ✅ SupplierAuth（`N: channel-router.go:21`） | ✅ `account:own:*`（CONTRACTS §21） | next 已有 |
| 首次安装向导 | ✅ `S: setup/`、`views/setup/SetupWizardView.vue` | ✅ `N: /api/setup` | ⚠️ 用环境变量引导超管 | 可接受 |

### 2.2 API Key、分组、账号池、调度

| 功能 | sub2api | new-api | next | 差距说明 |
|---|---|---|---|---|
| Key 增删改 | ✅ `S: routes/user.go:76-83` | ✅ `N: api-router.go:274-288` | ✅ `X: apikey/apikey.go:59-67` | — |
| Key 额度（USD） | ✅ `Quota/QuotaUsed`（`S: service/api_key.go`） | ✅ `RemainQuota/UnlimitedQuota`（`N: model/token.go`） | ❌ 表里只有 name/group/expires_at（`X: migrations/0001_core.sql:219-232`） | **丢失**，高优先 |
| Key 周期限速（5h/1d/7d 美元） | ✅ `RateLimit5h/1d/7d`（`S: service/api_key.go`） | ❌ | ❌ | 丢失 |
| Key IP 白/黑名单 | ✅ `IPWhitelist/IPBlacklist` | ✅ `AllowIps` | ❌ | 丢失 |
| Key 模型限制 | ❌（只看分组白名单） | ✅ `ModelLimits`（`N: model/token.go`） | ❌ | **new-api 独有**，值得引入 |
| Key 跨分组自动/重试 | ⚠️ 分组级 fallback（`S: service/group.go FallbackGroupID`） | ✅ auto 分组 + `CrossGroupRetry` | ❌ Key 只绑一个分组（PROGRESS §10） | 设计取舍，暂不建议 |
| 批量查看 Key 明文 | ⚠️ | ✅ `/token/batch/keys` | ❌ 只存哈希 | next 的安全取舍，保持 |
| 分组倍率/白名单/可见性 | ✅ | ✅ | ✅ `rate_multiplier`、`model_allowlist`、`visibility`+`user_groups`（`X: 0001_core.sql:201-217`） | — |
| 用户专属分组倍率 | ✅ `user_group_rate`（`S: service/user_group_rate.go`） | ✅ GroupGroupRatio | ❌ | 丢失（中） |
| 高峰时段倍率 | ✅ `PeakRate*`（`S: service/group.go`） | ❌ | ✅ 用价格表达式实现时段加价（`ARCHITECTURE.md` §7.3 示例） | next 更通用 |
| 分组订阅额度（日/周/月） | ✅ `DailyLimitUSD` 等 | ✅ 订阅套餐 | ❌ | 见 2.4 订阅 |
| 分组 fallback / 模型路由 / 组合路由 | ✅ `FallbackGroupID`、`ModelRouting`、`composite-routes`（`S: admin.go:337-341`） | ⚠️ auto 分组 | ❌ | 丢失（中低） |
| 仅限 Claude Code 客户端 | ✅ `ClaudeCodeOnly` | ❌ | ⚠️ 可用钩子插件实现 | 适合插件 |
| 账号类型 | ✅ 大量 OAuth/APIKey（Claude OAuth/setup-token、Codex、Gemini CLI、Antigravity、Grok、Bedrock、Vertex、国产厂商） | ✅ 40+ 渠道适配器（`N: relay/channel/*`） | ⚠️ 只有 apikey/relay 类 + ccgateway managed + volcengine（插件 manifest） | **OAuth 账号类型丢失**（§1.2 有意推迟），应以插件补 |
| 账号模型列表/映射/权重/RPM·TPM·TPD·SPM | ✅ | ✅ | ✅ `X: migrations/0009`、CONTRACTS §18 | — |
| 从上游拉模型 | ✅ | ✅ | ✅ `/accounts/:id/models/fetch`（CONTRACTS §19） | — |
| 上游模型变更自动检测与通知 | ❌（手动同步） | ✅ `N: controller/channel_upstream_update.go`、`/upstream_updates/detect_all` | ❌ | new-api 独有，可引入 |
| 请求头/参数覆盖 | ⚠️ 请求头覆盖（`S: service/account_header_override.go`） | ✅ `HeaderOverride`/`ParamOverride`（`N: model/channel.go`） | ❌ | 可引入（核心账号属性） |
| 状态码映射/错误透传 | ✅ 错误透传规则（`S: admin.go:737-746`） | ✅ `StatusCodeMapping` | ❌ 完全由插件 `ClassifyError` 决定 | 缺"管理员覆盖" |
| 多 Key 渠道 | ❌（账号批量创建） | ✅ `N: model/channel_multi_key.go` | ❌ | 不建议照搬，用批量导入代替 |
| 标签批量操作 | ❌ | ✅ `/channel/tag/*` | ❌ | 低 |
| 账号批量操作/复制/导入导出 | ✅ `S: admin.go:411-420`、`/accounts/data` | ✅ 复制/批量 | ❌ | 丢失（中） |
| 失败切换 + 冷却 + 自动禁用 | ✅ 429/529 冷却可配（`S: admin.go:580-585`）、`temp_unsched` | ✅ `RetryCodes/DisableCodes/DisableKeywords`（`N: model/request_policy.go`） | ✅ 插件 `ClassifyError` → 冷却/禁用（`X: gateway/dispatch.go:527-544`），`max_attempts` 可配 | next 缺管理员可覆盖的错误策略 |
| 定时测试 / 自动恢复 | ✅ 定时测试计划（`S: admin.go:725-735`） | ✅ 全量测试 + 自动禁用/启用（`N: controller/channel-test.go:927-1146`） | ⚠️ 只有手动 `/accounts/:id/test` | 缺 |
| 动态权重（按健康度自适应） | ❌ | ✅ `N: model/channel_dynamic_weight*.go` | ⚠️ 有扩展点 `RankAccounts`（CONTRACTS §24），没有实现 | 适合做成插件 |
| 粘性会话 | ⚠️ 硬编码 | ✅ channel affinity | ✅ 规则引擎 + 统计（`X: gateway/sticky*.go`） | next 最强 |
| 用户并发上限 | ✅ | ⚠️ | ✅ `users.max_concurrency` | — |
| 用户级 RPM | ✅ `RPMLimit` + 分组 override | ✅ 模型请求限速（`N: middleware/model-rate-limit.go`） | ❌ 只有账号级 | 丢失（中） |
| 代理管理 | ✅ 含质量检测、批量、导出 | ⚠️ | ✅ 含自动关联代理串（CONTRACTS §21） | 缺质量检测/批量（低） |
| TLS 指纹模板 | ✅ `S: admin.go:748-757` | ❌ | ❌ | 平台相关，归插件 |

### 2.3 模型、定价与计费

| 功能 | sub2api | new-api | next | 差距说明 |
|---|---|---|---|---|
| 客户端 `/v1/models` | ✅ `S: routes/gateway.go`、`handler/openai_models_handler.go` | ✅ `N: router/relay-router.go:46`（并分 anthropic/gemini 形状） | ❌ `X: sdk/platforms/*.json` 没有声明；未命中的 GET 落到 SPA 回退 | **丢失，高优先**（很多客户端启动时会调用） |
| 模型广场/公开定价页 | ✅ `S: routes/model_plaza.go`、`views/ModelPlazaView.vue` | ✅ `/api/pricing` + `features/pricing` | ❌（只有给下游同步用的 `/key/prices`，`X: billing/sync.go`） | 丢失 |
| 模型元数据（厂商、图标、描述、标签） | ⚠️ 模型广场字段 | ✅ `N: model/model_meta.go`、`vendor_meta.go` | ❌ | 可引入 |
| 缺失价格的模型提示 | ⚠️ | ✅ `/models/missing`（`N: controller/missing_models.go`） | ⚠️ 价格同步预览可看出 | 低成本可补 |
| 价格配置 | ✅ 渠道定价 + 分组覆盖 | ✅ 倍率 + 价格 + 分档表达式 | ✅ 统一表达式 + 试算 + 历史（`X: billing/prices.go`、`billing/expr`） | next 最强 |
| 价格同步 | ⚠️ 渠道定价同步 | ✅ 倍率同步（`N: controller/ratio_sync.go`） | ✅ LiteLLM/models.dev/上游 sup2api（CONTRACTS §17） | — |
| 余额与账本 | ✅ | ✅ | ✅ `X: billing/balance.go`、`ledger.go` | — |
| 预扣费与对账 | ⚠️ | ✅ `N: model/quota_reserve.go` | ✅ `X: billing/precharge.go`、`usage/reconcile.go` | — |
| 管理员调余额 | ✅ | ✅ | ✅ `/users/:id/balance/adjust` | — |
| 用量退款 | ✅ 订单退款 | ⚠️ | ✅ `/usage/:id/refund` | — |
| 图片/视频/音频专项计费 | ✅ 分组级专项价 | ✅ | ✅ 表达式 + 视频价格编辑器（`X: web/src/views/prices/VideoPriceEditor.vue`） | — |

### 2.4 商业：充值、支付、兑换、订阅、返利

| 功能 | sub2api | new-api | next | 差距说明 |
|---|---|---|---|---|
| 在线充值/订单 | ✅ 支付宝/微信/Stripe/易支付/Airwallex（`S: routes/payment.go`、`service/payment_*`） | ✅ 易支付/Stripe/Creem/Waffo（`N: controller/topup*.go`） | ❌（§1.2 有意推迟） | **丢失，高优先** |
| 退款/订单管理/支付看板 | ✅ `S: admin/orders/*` | ⚠️ | ❌ | 随支付一起做 |
| 兑换码 | ✅ `S: admin.go:536-550` | ✅ `N: controller/redemption.go` | ❌ | 丢失 |
| 优惠码 | ✅ `S: admin.go:552-562` | ❌ | ❌ | 丢失（低） |
| 订阅套餐 | ✅ `S: service/subscription_service.go` | ✅ `N: controller/subscription*.go` | ❌ | 丢失（高价值、高成本） |
| 邀请返利 | ✅ `S: service/affiliate_service.go`、`admin/affiliates/*` | ✅ aff 码 + 转余额 | ❌ | 丢失 |
| 每日签到 | ❌ | ✅ `N: controller/checkin.go`、`model/checkin.go` | ❌ | new-api 独有，适合插件 |
| 余额不足提醒 | ✅ `S: service/balance_notify_service.go` | ✅ 额度预警 | ❌ | 丢失，可交给通知插件 |

### 2.5 用量、统计、仪表盘、运维

| 功能 | sub2api | new-api | next | 差距说明 |
|---|---|---|---|---|
| 使用记录（管理员/用户） | ✅ | ✅ | ✅ 含详情、hook 决策、计费明细（`X: usage/api.go`、CONTRACTS §15） | — |
| 用量汇总 | ✅ | ✅ | ⚠️ 只按 day/model/user 汇总（`X: usage/api.go:343-378`） | 维度少 |
| 管理员仪表盘 | ✅ 趋势、模型/分组/Key/用户排行、实时（`S: admin.go:281-298`） | ✅ `N: /api/data*`、`features/dashboard` | ⚠️ 7 天汇总 + 今日数（`X: web/src/views/dashboard/DashboardView.vue:32-65`） | **明显缩水** |
| 用户仪表盘 | ✅ `S: user.go:99-112` | ✅ | ⚠️ `X: usage/MyStatsView.vue` | 中 |
| 每 Key 每日用量 | ✅ `/user/api-keys/:id/usage/daily` | ✅ | ❌ | 低成本 |
| 用量导出 | ⚠️ 前端导出 | ❌ | ❌ | 可补 |
| 用量清理/保留期 | ✅ 清理任务（`S: admin.go:707-709`） | ✅ 系统任务（`N: controller/system_task.go`） | ❌ 只清理任务运行记录（`X: job/retention.go`） | **丢失**，表会无限增长 |
| 运维监控（错误日志、告警规则、邮件告警、实时 QPS、系统日志） | ✅ `S: admin.go:191-279`、`views/admin/ops/*` | ⚠️ 性能统计（`N: controller/performance.go`） | ⚠️ 节点拓扑、升级、插件历史（`X: views/nodes/*`、`upgrades/*`），没有请求错误分析 | 丢失（中高） |
| 渠道状态页/监控 | ✅ 监控 v1/v2 + 用户状态页（`S: user/ChannelStatusV2View.vue`） | ✅ Uptime Kuma（`N: controller/uptime_kuma.go`）、性能指标公开页（`perf_metrics.go`） | ❌ | 丢失，适合插件 |
| 排行榜（公开） | ⚠️ 只有管理员用户消费排行 | ✅ `N: controller/rankings.go` | ❌ | 低，适合插件 |
| 审计日志 | ✅ 中间件覆盖所有管理变更（`S: admin.go:31,152-160`） | ✅ `N: controller/audit.go` | ✅ `/audit-logs` + 界面（`X: audit/http.go`、`views/upgrades/AuditView.vue`）；覆盖面按模块逐个补 | 覆盖面待核 |
| 备份恢复 / S3 | ✅ `S: admin.go:633-663` | ❌ | ❌（只有部署脚本里的 pg_dump） | 丢失（中） |
| 在线升级 | ✅ 单机 | ✅ `features/system-update` | ✅ 多节点主节点优先（CONTRACTS §34–§40） | next 最强 |
| 多节点 | ⚠️ | ⚠️ 实例列表（`N: system_info.go`） | ✅ | next 最强 |

### 2.6 内容、通知、站点

| 功能 | sub2api | new-api | next | 差距说明 |
|---|---|---|---|---|
| 公告 | ✅ 定向 + 已读状态（`S: admin.go:438-448`、`user.go:116-120`） | ✅ notice | ❌ | 丢失 |
| 自定义首页/自定义页面/法律文档 | ✅ `S: HomeView.vue`、`user/CustomPageView.vue`、`public/LegalDocumentView.vue` | ✅ home/about/协议/隐私（`N: api-router.go:30-35`） | ❌ 只有登录页 | 丢失 |
| 站点品牌与公开设置 | ✅ `/settings/public` | ✅ `/api/status` | ❌ | 丢失 |
| 邮件服务（SMTP、模板、测试） | ✅ `S: admin.go:569-575`、`service/email_*` | ✅ | ❌ | **丢失，是注册/通知的前置条件** |
| 用户通知渠道 | ⚠️ 只有邮件（含额外收件人） | ✅ 邮件/Webhook/Bark/Gotify（`N: service/user_notify.go:76-130`） | ⚠️ guard 插件只能发规则告警 webhook | new-api 更全，可引入 |
| 多语言 | ⚠️ en/zh | ✅ 7 种（`N: web/default/src/i18n/locales`） | ⚠️ en/zh；插件 i18n 不自动加载（PROGRESS §4 F） | 低成本扩展 |

### 2.7 网关能力与任务类接口

| 功能 | sub2api | new-api | next | 差距说明 |
|---|---|---|---|---|
| Anthropic/OpenAI chat/Responses/Gemini/Embeddings | ✅ | ✅ | ✅ `X: sdk/platforms/*.json` | — |
| Responses WebSocket | ✅ | ✅ | ✅ openai 插件 0.3.x | — |
| 协议互转 | ✅ 大量专用转换 | ✅ | ⚠️ 转换器框架（`X: gateway/convert`），覆盖有限 | 持续补 |
| 图片生成/编辑/批量图片 | ✅ `S: handler/openai_images.go`、`batch_image_handler.go` | ✅ | ⚠️ volcengine 图片 | 按平台插件补 |
| 视频/任务（Seedance、Grok 媒体、MJ、Suno） | ✅ Seedance/Grok/视频 | ✅ MJ、通用任务、任务插件（`N: router/task-router.go`、`controller/midjourney.go`） | ✅ 核心托管异步任务（CONTRACTS §28）+ volcengine 视频 | 底座已有；MJ/Suno 按需做插件 |
| 素材库 | ❌ | ✅ `N: controller/asset_library*.go` | ✅ volcengine 插件素材库 | — |
| TTS/STT/Realtime | ✅ Grok 音频、`/realtime/calls` | ✅ | ❌ | 按平台插件补 |
| Web Search 模拟 | ✅ `S: admin.go:602-605` | ✅ | ❌ | 适合钩子/平台插件 |
| 内容审核/提示词审计 | ✅ 风控中心 + 提示词审计 | ⚠️ | ✅ moderation 插件（CONTRACTS §20）+ guard | 已迁移 |
| Playground 在线对话 | ❌ | ✅ `N: router/relay-router.go:89-95`、`features/playground` | ⚠️ 只有管理员账号测试和 moderation 在线测试 | new-api 独有，值得引入 |

---

## 3. (a) next 相比 sub2api「丢失 / 尚未迁移」清单

按对"能对外运营"的影响分级。"有意推迟"指 `ARCHITECTURE.md` §1.2 明确列为本期不做的项。

### P0：不补就无法面向 C 端开站
| # | 功能 | sub2api 证据 | 备注 |
|---|---|---|---|
| A1 | 客户端 `/v1/models` | `S: routes/gateway.go`、`handler/openai_models_handler.go`、`gateway_models_test.go` | 未迁移；客户端兼容性问题 |
| A2 | API Key 额度、周期限速、IP 黑白名单 | `S: service/api_key.go`（APIKey 结构） | 未迁移 |
| A3 | 自助注册、邮箱验证、找回密码、邀请码、人机验证 | `S: routes/auth.go`、`service/auth_service.go`、`turnstile_service.go` | 未迁移 |
| A4 | 邮件服务（SMTP、模板） | `S: admin.go:569-575`、`service/email_service.go` | 未迁移；A3、通知依赖它 |
| A5 | 在线充值/订单/退款 | `S: routes/payment.go`、`service/payment_*` | **有意推迟** |
| A6 | 兑换码 | `S: admin.go:536-550`、`service/redeem_service.go` | 未迁移 |

### P1：运营必需，缺了会很吃力
| # | 功能 | sub2api 证据 | 备注 |
|---|---|---|---|
| A7 | 管理员仪表盘（趋势、排行、实时） | `S: admin.go:281-298`、`service/dashboard_*` | next 只有 7 天汇总 |
| A8 | 使用记录保留期/清理 | `S: admin.go:707-709`、`service/usage_cleanup_service.go` | next 无，usage_logs 会无限增长 |
| A9 | 定时账号测试 + 自动恢复；429/529 冷却、错误透传等可配策略 | `S: admin.go:580-585,725-746`、`service/scheduled_test_*`、`error_passthrough_service.go` | next 只有插件分类 + 手动测试 |
| A10 | OAuth 类账号（Claude OAuth/setup-token、Codex、Gemini CLI、Antigravity、Grok、Bedrock、Vertex、国产厂商额度） | `S: admin.go:450-513`、`service/*_oauth_service.go` | **有意推迟**；按插件逐个做 |
| A11 | 公告、自定义首页/页面、法律文档、站点公开设置 | `S: admin.go:438-448`、`views/HomeView.vue`、`/settings/public` | 未迁移 |
| A12 | TOTP、Passkey、第三方登录（LinuxDo/GitHub/Google/OIDC/微信/钉钉） | `S: handler/totp_handler.go`、`passkey_handler.go`、`auth_*_oauth.go` | 未迁移 |
| A13 | 订阅套餐（分组日/周/月额度） | `S: service/subscription_service.go`、`group.go` 的 `*LimitUSD` | 未迁移，成本高 |
| A14 | 邀请返利、优惠码 | `S: service/affiliate_service.go`、`promo_service.go` | 未迁移 |
| A15 | 运维监控：请求/上游错误分析、告警规则、邮件告警、系统日志、实时 QPS | `S: admin.go:191-279`、`service/ops_*` | 未迁移 |
| A16 | 模型广场、用户可用渠道页 | `S: routes/model_plaza.go`、`user/AvailableChannelsView.vue` | 未迁移 |

### P2：锦上添花或可由插件补
| # | 功能 | sub2api 证据 |
|---|---|---|
| A17 | 用户专属分组倍率、用户级 RPM、平台额度 | `S: service/user_group_rate.go`、`user.go RPMLimit`、`admin.go:317-319` |
| A18 | 分组 fallback、模型路由、组合路由、分组复制与排序 | `S: admin.go:335-344` |
| A19 | 账号批量操作、复制、导入导出、CRS 同步；代理质量检测/批量/导出 | `S: admin.go:371-420,519-532` |
| A20 | 渠道监控 v1/v2 与用户状态页 | `S: admin.go:799-873`、`user/ChannelStatus*View.vue` |
| A21 | 数据库备份恢复（S3） | `S: admin.go:633-663` |
| A22 | 余额不足邮件提醒 | `S: service/balance_notify_service.go` |
| A23 | 用户自定义属性、合规确认、管理员 API Key | `S: admin.go:162-168,577-579,713-723` |
| A24 | 平台专属网关能力：Web Search 模拟、Grok 媒体/音频、批量图片、Realtime、TLS 指纹、Claude Code 限定 | `S: admin.go:601-605,748-757`、`handler/grok_*`、`batch_image_handler.go` |

**已迁移、无需再补**：内容风控/提示词审计（→ moderation 插件）、关键词拦截（→ guard 插件）、插件系统（next 重写，更强）、在线升级（多节点）、审计日志（已有界面）、价格同步、所有权授权、粘性会话、异步视频任务（volcengine + 核心托管任务）。

---

## 4. (b) new-api 有、sub2api 没有、值得引入 next 的功能（按价值/成本排序）

| 排名 | 功能 | new-api 证据 | 价值 | 成本 | 归属 | 理由 |
|---|---|---|---|---|---|---|
| B1 | **API Key 模型限制** | `N: model/token.go ModelLimits` | 高 | 低 | 核心（apikey + gateway 鉴权） | 与 A2 一起做，几乎零额外成本 |
| B2 | **管理员可覆盖的请求/错误策略**（重试码、禁用码、禁用关键词、自动禁用开关） | `N: model/request_policy.go`、`controller/request_policy.go` | 高 | 中 | 核心（插件 `ClassifyError` 给默认，管理员规则优先） | 调度和 failover 属于核心；做法与粘性规则一样，插件给默认、管理员覆盖 |
| B3 | **定时全量测试 + 自动禁用/自动启用** | `N: controller/channel-test.go:927-1146` | 高 | 中 | 核心（复用 `BuildTestRequest`） | 账号状态是核心数据；与 A9 合并 |
| B4 | **Playground 在线对话** | `N: router/relay-router.go:89-95`、`web/default/src/features/playground` | 中高 | 低中 | 核心（控制台页 + 网关会话入口） | 涉及身份与计费，只能核心 |
| B5 | **多渠道用户通知**（邮件/Webhook/Bark/Gotify，可加 Telegram） | `N: service/user_notify.go` | 中高 | 中 | **插件**（订阅核心事件）+ 核心提供发信能力 | 典型"额外业务逻辑" |
| B6 | **账号请求头/参数覆盖** | `N: model/channel.go HeaderOverride/ParamOverride` | 中 | 低 | 核心账号属性（与 §18 模型映射同理） | 核心发上游请求，改写应在核心统一执行 |
| B7 | **上游模型变更检测 + 通知** | `N: controller/channel_upstream_update.go` | 中 | 低中 | 核心定时任务（复用 `BuildModelsRequest`）+ 事件交给通知插件 | 账号模型列表是核心属性 |
| B8 | **模型元数据与厂商**（图标、描述、标签、端点类型）+ 缺失价格提示 | `N: model/model_meta.go`、`vendor_meta.go`、`controller/missing_models.go` | 中 | 中 | 核心（与价格表并列） | 支撑模型广场 |
| B9 | **动态权重**（按成功率/延迟自适应） | `N: model/channel_dynamic_weight*.go` | 中高 | 高 | **插件**（实现 `RankAccounts` + 订阅 `usage.recorded`） | 扩展点已具备；核心保留最终调度权（§24） |
| B10 | **会话列表与单个吊销**、**用户 Access Token** | `N: controller/auth_session.go`、`access_token.go` | 中 | 低 | 核心（iam） | 安全与身份 |
| B11 | **自定义 OIDC/OAuth 提供商**（discovery 多实例）、Telegram/Discord 登录 | `N: controller/custom_oauth.go`、`telegram.go` | 中 | 中 | 核心（iam） | 比 sub2api 每个厂商单写一套更通用，可同时覆盖 A12 |
| B12 | **每日签到** | `N: controller/checkin.go` | 低中 | 低 | **插件**（`ledger.credit`，`maxPerDay` 范围） | 纯营销逻辑 |
| B13 | **供应商对账单** | `N: controller/channel_statement.go` | 中（next 已有供应商角色） | 中 | 核心（按 `accounts.created_by` 汇总用量） | 涉及钱与归属 |
| B14 | **多语言扩展**（ja/fr/ru/vi/zh-TW）+ 插件 i18n 自动加载 | `N: web/default/src/i18n/locales/*.json` | 低中 | 低 | 核心 web | 顺带补 PROGRESS §4 F |
| B15 | 公开排行榜/模型性能指标 | `N: controller/rankings.go`、`perf_metrics.go` | 低中 | 中 | **插件**（订阅 `usage.recorded`，在插件 schema 里聚合） | 非核心 |
| B16 | Uptime Kuma 状态集成 | `N: controller/uptime_kuma.go` | 低 | 低 | 插件 | 与 A20 合并成"状态页插件" |
| B17 | 预填模型组 | `N: controller/prefill_group.go` | 低 | 低 | 核心 | 已部分被插件 `defaultModels`（CONTRACTS §41）替代 |
| B18 | Midjourney/Suno 等任务 | `N: controller/midjourney.go`、`task_plugin.go` | 低中 | 中 | 插件（核心托管任务 §28 已具备） | 按需 |
| ✗ | 不建议：多 Key 渠道、批量导出 Key 明文、io.net 部署管理（`N: controller/deployment.go`）、跨分组 auto | — | — | — | — | 与 next "一账号一凭证、只存哈希、Key 绑定单分组"的设计冲突，或者价值低 |

---

## 5. 综合排序（a + b）与归属

把丢失项和引入项合并，按"价值 ÷ 成本"排出路线图用的顺序：

| 排名 | 功能包 | 来源 | 价值 | 成本 | 归属 |
|---|---|---|---|---|---|
| 1 | API Key 增强：额度、周期限速、IP 黑白名单、模型限制 | A2 + B1 | 高 | 低 | 核心 |
| 2 | 客户端 `/v1/models` + 模型广场/公开定价 + 模型元数据 | A1 + A16 + B8 | 高 | 低中 | 核心 |
| 3 | 邮件服务 + 自助注册/验证/找回密码/邀请码/人机验证 | A3 + A4 | 高 | 中 | 核心 |
| 4 | 账号健康巡检、自动启停 + 管理员错误策略 | A9 + B2 + B3 | 高 | 中 | 核心（插件给默认分类） |
| 5 | 充值支付 + 兑换码（+ 优惠码） | A5 + A6 (+A14) | 高 | 中高 | **插件**（核心账本） |
| 6 | 运营仪表盘、多维报表、用量导出与保留期 | A7 + A8 | 高 | 中 | 核心 |
| 7 | 通知中心插件（余额不足、账号禁用、模型变更、公告推送） | A22 + B5 + B7 | 中高 | 中 | **插件** + 核心发信能力 |
| 8 | Playground 在线对话 | B4 | 中高 | 低中 | 核心 |
| 9 | 2FA（TOTP/Passkey）+ 会话管理 + OIDC/OAuth 登录 | A12 + B10 + B11 | 中高 | 中高 | 核心 |
| 10 | 公告 + 站点品牌/首页/法律文档 | A11 | 中 | 低 | 核心 |
| 11 | 订阅套餐（分组周期额度） | A13 | 高 | 高 | 核心（影响计费资金来源） |
| 12 | 账号请求头/参数覆盖 | B6 | 中 | 低 | 核心 |
| 13 | 邀请返利、签到 | A14 + B12 | 中 | 低中 | 插件 |
| 14 | OAuth 类账号类型（Claude OAuth、Codex、Gemini CLI…） | A10 | 高（视业务） | 高 | 插件（每类一个） |
| 15 | 动态权重 | B9 | 中高 | 高 | 插件（RankAccounts） |
| 16 | 运维错误分析与告警 | A15 | 中高 | 中高 | 核心（数据）+ 告警走通知插件 |
| 17 | 状态页/监控、排行榜 | A20 + B15 + B16 | 低中 | 中 | 插件 |
| 18 | 用户专属倍率、用户 RPM、分组 fallback/路由 | A17 + A18 | 中 | 中 | 核心 |
| 19 | 批量/导入导出、备份 | A19 + A21 | 中 | 中 | 核心 |
| 20 | 多语言、供应商对账单、Access Token | B14 + B13 + B10 | 低中 | 低 | 核心 |

---

## 6. Top 10 设计草案

> 统一约束：新迁移从 `0026` 起，写成可重复执行（IF NOT EXISTS）；权限在 `authz` 中注册并写进 CONTRACTS §4；新接口补 `web/mock`；中英文 i18n。

### T1. API Key 增强（核心）
- **数据模型**（迁移 `0026_api_key_limits.sql`）：`api_keys` 增加 `quota_usd numeric(20,8) NULL`（NULL 表示不限）、`used_usd numeric(20,8) NOT NULL DEFAULT 0`、`rate_limits jsonb NOT NULL DEFAULT '{}'`（`{"5h":"10","1d":"30","7d":"100"}`，单位美元）、`ip_allow cidr[] NOT NULL DEFAULT '{}'`、`ip_deny cidr[] NOT NULL DEFAULT '{}'`、`model_limits jsonb NOT NULL DEFAULT '[]'`（通配符，与分组白名单同语法）、`max_concurrency int NOT NULL DEFAULT 0`。周期窗口用量存 Redis：`rl:key:{id}:cost:{5h|1d|7d}:{bucket}`，用 Redis 时间分桶，与账号限额口径一致；累计 `used_usd` 写 PG，作为额度的唯一依据。
- **网关**：`apikey.Authenticate` 返回的 `core.APIKeyPrincipal` 增加上述字段 → 在鉴权阶段校验 IP（取 `client_ip`，沿用可信代理配置）→ 模型解析后校验"分组白名单 ∩ Key 模型限制" → 余额检查阶段同时检查 `quota_usd - used_usd` 和各窗口余量 → 结算事务里 `UPDATE api_keys SET used_usd = used_usd + $cost`，与 `usage_logs`、`balance_ledger` 同一事务，事务提交后再累加 Redis 窗口。超限返回 429 `key_quota_exceeded` / `key_rate_limited`，网关在 Redis 上加 `slot:key:{id}`。
- **API**：`POST /me/api-keys`、`PATCH /api-keys/:id` 增加字段；`GET /me/api-keys` 返回 `used_usd` 和 `window_usage`；`POST /api-keys/:id/reset-usage`（`apikey:all:manage`）。
- **前端**：`views/keys/MyApiKeysView.vue`、`AllApiKeysView.vue` 的编辑弹窗加"额度与限速 / IP / 模型"三个分区；列表加用量进度条。
- **耦合点**：`gateway/pipeline.go`（鉴权、模型检查）、`billing/precharge.go`（预扣时把 Key 额度当作第二道上限）、`usage/settler.go`（结算事务）、`apikey` 缓存失效（PATCH 后广播）。注意 CONTRACTS §7 写明 `apikey:{sha256}` 已不再用作身份缓存，每次认证直接读 PG，新字段随同一条查询读出即可。

### T2. 客户端模型列表 + 模型广场（核心）
- **端点**：在平台 JSON 中新增端点种类 `kind: "models"`。anthropic 和 openai 都声明 `GET /v1/models`，gemini 声明 `GET /v1beta/models`。同一路径的冲突用规则消解：**models 类端点允许多个平台共用路径**，核心按请求头判别（带 `anthropic-version` 或 `x-api-key` 走 anthropic 形状，否则走 openai 形状），sub2api 的做法同此（`S: handler/openai_models_handler.go`）。还要相应修改 `manifest` 的端点冲突校验。
- **数据来源**（核心计算，不调插件）：Key 所在分组 → 分组内可服务该平台、且所属插件已启用的账号的 `models`（§18）∪ 插件 `defaultModels`（§41）→ 与分组白名单、Key 模型限制取交集 → 可选再与已配价格的模型取交集（`missing_price_policy=reject` 时启用）。结果按分组缓存 30 秒，收到 `account:changed`/`config:changed` 时失效。
- **模型元数据**（迁移 `0027_model_meta.sql`）：`model_meta(model PK, vendor, display_name, description, icon, tags jsonb, context_window int, endpoints jsonb, visible bool, updated_at)`、`model_vendors(id, name, icon)`；可从价格同步源（models.dev 自带元数据）一键导入。
- **API**：`GET /api/v1/public/models`（站点设置开启"公开模型广场"后匿名可访问，否则需要登录）返回模型、厂商、按分组折算后的价格（复用 `billing.Pricer` 与 `/key/prices` 的折算逻辑）；`GET/PUT /model-meta`（`price:manage`）；`GET /prices/missing`（被调用过但没配价格的模型，从 `usage_logs.error_type='price_not_configured'` 聚合）。
- **前端**：新增公开页 `/models`（广场：搜索、厂商筛选、分组切换、价格换算），后台 `prices` 页加"元数据"页签。
- **耦合点**：`sdk/platforms/*.json` 与 `manifest` 校验、`gateway/routes.go` 的动态路由、`webui` 的 reservedPrefixes（加入 `/v1/models`，避免 SPA 回退）、`billing/sync.go`。

### T3. 邮件服务 + 自助注册（核心）
- **邮件模块**（新包 `server/internal/mail`）：设置项 `mail`（`smtp_host/port/user/password_enc/from/tls`，密码 AES-GCM 加密）；模板表 `mail_templates(event, locale, subject, body, updated_at)`，内置模板随代码提供，可"恢复官方模板"（参考 `S: admin.go:571-575`）；发送走异步队列（PG outbox + 一个节点执行，用现有 `core.Locker`）。新增宿主能力 `mail.send`（manifest 权限，风险 high），让通知插件不用各自保存 SMTP 凭证。
- **注册**：设置项 `registration`：`{enabled, email_verify, invite_required, allowed_email_domains[], default_role, default_group_ids[], initial_balance, captcha:{provider:"turnstile|none", site_key, secret_enc}}`。验证码存 Redis `mailcode:{purpose}:{email}`（TTL 10 分钟，限频）。邀请码第一阶段用表 `invitation_codes(code, created_by, max_uses, used, expires_at)`；返利逻辑留给 T5 的返利插件，插件订阅 `user.created` 事件（payload 里补 `invited_by`）。
- **API**：`POST /auth/register`、`POST /auth/email-code`、`POST /auth/password/forgot`、`POST /auth/password/reset`、`GET /public/site`（注册开关、验证码 site key、站点名）；后台 `GET/PUT /settings/mail`、`POST /settings/mail/test`、`GET/PUT /settings/registration`、`/mail-templates/*`。全部走 `iam/ratelimit.go` 限速。
- **前端**：`views/auth/` 新增 Register、ForgotPassword、ResetPassword；设置页加"邮件""注册"两个卡片。
- **耦合点**：`iam`（建用户事务里同时分配默认角色、分组、初始余额，初始余额走 `billing.Ledger.Apply`，kind 用 `admin_adjust` 或新增 `signup_bonus`）、`authz`（默认角色）、`event`（`user.created` 加字段）。

### T4. 账号健康巡检 + 管理员错误策略（核心）
- **错误策略表**（迁移 `0028_error_rules.sql`）：`error_rules(id, name, enabled, priority, match jsonb, effect varchar, cooldown_seconds, client_status, client_message, source varchar, plugin_key)`。`match` 包括 `{plugin_keys[], account_types[], platforms[], status_ranges[], body_regex, transport_error bool}`；`effect` 取 `failover|cooldown|disable|return|passthrough`。语义与粘性规则一致：`source=plugin_default`（插件 manifest 可声明，可选）和 `admin`，优先级小的先匹配。
- **执行点**：`gateway/dispatch.go applyClassification` 之前，先用管理员规则匹配原始 status/body 前缀；命中就覆盖插件 `ClassifyError` 的结论，没命中则沿用插件结论。原有 `defaultCooldown=60s` 改为读设置项 `gateway.default_cooldown_seconds`。
- **巡检**：设置项 `health_check {enabled, interval_minutes, concurrency, auto_disable, auto_enable, disable_after_failures, test_model_by_type{}}`，账号上可以单独覆盖（`accounts.settings` 不归插件，因此新增列 `health_check jsonb`）。核心 job（拿锁 `health:check`，单节点执行）复用 `account/testreq.go` 的测试路径；结果写 `account_test_runs(account_id, ok, status, latency_ms, error, created_at)`，保留 7 天。对 `status_reason` 以 `auto:` 开头的禁用账号，巡检通过后自动恢复 active，并发 `account.status_changed`。
- **API**：`/error-rules` CRUD（新权限 `gateway:policy:manage`）；`GET/PUT /settings/health-check`；`GET /accounts/:id/test-runs`；`POST /accounts/test-all`（异步，返回任务 id）。
- **前端**：新菜单"网关 → 错误策略"；账号列表加"健康"列（最近一次结果与延迟），详情加巡检历史。
- **耦合点**：`gateway/dispatch.go`、`account/directory.go`（`Disable` 带 `auto:` 原因前缀、新增 `Enable`）、`job`、粘性绑定在禁用时的清理（`dispatch.go:541`）。

### T5. 充值支付 + 兑换码（插件，核心记账）
- **插件拆分**：`payment`（支付渠道与订单）、`redeem`（兑换码、优惠码），两者互不依赖，都申请 `ledger.credit`（critical），管理员授权时填 `maxPerTx`/`maxPerDay` 范围；退款额外申请 `ledger.debit`。
- **插件数据**（插件自己的 schema `plg_payment`）：`orders(order_no, user_id, provider, amount, currency, credited_usd, status, paid_at, refunded_at, raw jsonb)`、`provider_configs`（密钥放插件设置的 secret 字段）。支付渠道从 sub2api 移植：支付宝、微信、Stripe、易支付、Airwallex（`S: service/payment_*`、`backend/internal/payment/`）。
- **流程**：用户下单（插件路由 `auth: user`，权限 `plugin.payment:pay`）→ 跳转支付 → 回调（插件路由 `auth: webhook`，插件内验签）→ `Host.LedgerCredit(user_id, credited_usd, idempotency_key=order_no, ref_type="payment_order", ref_id=order_no)`。账本幂等键保证重复回调只入账一次（`X: plugin/grpcruntime/host.go:293-334`）。兑换码同理，幂等键用 `code`。
- **核心改动（少量）**：①插件权限可设"安装时默认授予内置 `user` 角色"的选项（manifest `permissions[].defaultRoles`），否则普通用户看不到"充值"菜单；②`/ledger` 的 kind 筛选支持按 `ref_type` 区分（现在统一是 `plugin_credit`）；③`balance.changed` 事件已有 `kind`，返利插件据此计算。
- **前端**：插件原生页挂到"财务"区（CONTRACTS §22，核心 `finance` 区现在为空，正好承接）：用户侧"充值""兑换"，管理员侧"订单""兑换码"。
- **耦合点**：只依赖已有的 HostService 账本、插件路由、插件菜单，核心几乎不用改；风险集中在 `maxPerDay` 要按站点流水设得足够大，并在授权页上醒目提示。

### T6. 运营仪表盘、多维报表、导出与保留期（核心）
- **聚合表**（迁移 `0029_usage_rollups.sql`）：`usage_rollups_hourly(bucket timestamptz, user_id, api_key_id, group_id, account_id, plugin_key, model, requests, success, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, cost numeric, upstream_cost numeric, latency_ms_sum, PRIMARY KEY(bucket, user_id, api_key_id, group_id, account_id, model))`。在结算事务里 upsert，或由核心消费 `usage.recorded` 批量 upsert（推荐后者，不拖慢结算；以 `events.id` 游标保证不丢不重）。
- **API**：`GET /usage/summary` 扩展 `group_by=day|hour|model|user|group|account|api_key|plugin`，支持多级与 `top=N`；`GET /dashboard/overview`（今日/昨日/7 日：请求数、成功率、花费、活跃用户、活跃账号、平均延迟）；`GET /me/api-keys/:id/usage/daily`；`GET /usage/export`（CSV 流式，最多 100 万行，`usage:all:read`）。
- **保留期**：设置项 `usage.retention_days`（默认 90）和 `usage.rollup_retention_days`（默认 730），核心 job 分批删除（每批 5000 行，拿锁）。
- **前端**：重做 `views/dashboard/DashboardView.vue`（趋势、模型占比、分组/用户/账号 Top，用 `SChart`），`usage/MyStatsView.vue` 加按 Key、按模型；使用记录页加"导出"。
- **耦合点**：`usage/api.go`、`event/delivery`（作为核心内部消费者）、`job`。sticky 统计和 hook 统计已在 Redis，可以并入仪表盘。

### T7. 通知中心（插件 `notify`，核心提供发信与用户查询能力）
- **核心改动**：①宿主能力 `mail.send`（T3）；②宿主能力 `users.read`（只读：id、email、display_name、status，风险 medium），事件 payload 只有 user_id，插件需要据此查收件地址；③新事件 `account.models_changed`（B7 上游模型变更检测的产出）、`balance.low`（不建议，阈值逻辑交给插件，用 `balance.changed` 的 `balance_after` 判断即可）。
- **插件数据**：`plg_notify.preferences(user_id, channel, target_enc, events[], threshold)`、`deliveries(id, user_id, event, channel, status, error, created_at)`。渠道：email（走宿主）、webhook（HMAC 签名，经出口隧道）、Bark、Gotify、Telegram Bot。
- **订阅**：`balance.changed`（余额低于阈值，按用户去抖）、`account.status_changed`（管理员通知：账号被禁用或冷却过多）、`account.models_changed`、插件自己的"公告推送"。
- **前端**：插件原生页"我的 → 通知设置"、管理员"通知 → 投递记录"。
- **耦合点**：只依赖事件总线（`event/delivery` 至少一次投递，插件按 `events.id` 去重）和两个新宿主能力。

### T8. Playground（核心）
- **身份方案**（不改网关流水线）：核心为每个"用户 + 分组"惰性创建一个系统托管的 Key，`api_keys` 加 `kind varchar(20) NOT NULL DEFAULT 'user'`（取值 `user|playground`）。`kind=playground` 的 Key 不出现在列表里、不能导出，Key 明文只存在服务端（`key_enc` 加密保存，或每次轮换）。
- **API**：`POST /api/v1/playground/:platform/*path`（`Authed`，权限 `apikey:self:manage` 加 `gateway:use`；请求头 `X-Playground-Group`）→ 核心校验用户能用该分组 → 取或建 playground Key → 以内部请求方式调用网关处理器（同进程，不走网络），流式原样转发。使用记录中 `api_key` 显示"Playground"，照常计费。
- **前端**：新菜单"我的 → 在线测试"：选分组和模型（用 T2 的模型列表）、参数面板（temperature、max_tokens、system）、流式输出、展示本次费用与 request_id（可跳转到使用记录详情）。参考 `N: web/default/src/features/playground`。
- **耦合点**：`apikey`（kind 过滤）、`gateway`（暴露一个可在进程内调用的入口）、`usage` 展示。

### T9. 2FA、会话管理、OIDC 登录（核心）
- **数据**（迁移 `0030_mfa_sessions.sql`）：`users` 加 `totp_secret_enc bytea`、`totp_enabled_at`；`user_backup_codes(user_id, code_hash, used_at)`；`user_passkeys(id, user_id, credential_id, public_key, sign_count, name, created_at, last_used_at)`；`refresh_tokens` 加 `user_agent`、`ip`、`last_used_at`（家族字段已有，迁移 0006）；`auth_providers(id, slug, kind 'oidc|oauth2', issuer, client_id, client_secret_enc, scopes, claim_mapping jsonb, enabled, auto_register)`；`user_identities(user_id, provider_id, subject, email, created_at)`。
- **流程**：登录时若开启 2FA，返回 `mfa_required` 和一次性 `mfa_token`（Redis，5 分钟），`POST /auth/login/mfa` 换取 JWT；step-up 接受 password、totp、passkey 三种方式（`iam/http.go:90` 扩展）。OIDC 用 discovery 自动填端点（参考 `N: controller/custom_oauth.go FetchCustomOAuthDiscovery`），预置 LinuxDo、GitHub、Google 模板。
- **API**：`/me/totp/{setup,enable,disable}`、`/me/passkeys*`、`/me/sessions`（列出、`DELETE /:id`、`POST /revoke-others`）、`/auth/oidc/:slug/{start,callback}`、`/auth-providers` CRUD（`settings:manage` 加 step-up）、`DELETE /users/:id/totp`（管理员重置）。
- **前端**：新"个人资料/安全"页（现在只有改密码）；登录页加第三方按钮与 2FA 第二步。
- **耦合点**：`iam/auth.go`（签发与 refresh 轮换）、`authz` 的 step-up、敏感权限 🔐 的二次验证体验。

### T10. 公告 + 站点品牌/首页/法律文档（核心）
- **数据**（迁移 `0031_site_content.sql`）：`announcements(id, title, body_md, level 'info|warning|critical', audience jsonb {all|roles[]|groups[]|user_ids[]}, pinned, starts_at, ends_at, created_by, created_at)`、`announcement_reads(announcement_id, user_id, read_at)`；设置项 `site {name, logo_url, favicon_url, primary_color, home_mode 'login|markdown|url', home_content, footer_md, legal:{terms_md, privacy_md}, public_model_plaza bool}`。
- **API**：`GET /public/site`（匿名可读，与 T3 共用）、`GET /me/announcements`、`POST /me/announcements/:id/read`、`/announcements` CRUD（新权限 `announcement:manage`）、`GET /announcements/:id/reads`。
- **前端**：公开首页 `/`（未登录时按 `home_mode` 渲染，登录后跳概览）、`/legal/:doc`；控制台顶部公告条和未读角标；设置页加"站点"卡片；markdown 渲染要做 XSS 过滤，与现有 CSP nonce 策略兼容（`webui` 每次替换 `__CSP_NONCE__`）。
- **耦合点**：`webui.Serve`（`/`、`/legal/*`、`/models` 需要公开路由）、`/me/menus`、`authz` 新权限。也可以做成插件，但首页和登录页属于核心控制台，放核心更简单。

---

## 7. 建议路线图

| 阶段 | 目标 | 内容 | 依赖 |
|---|---|---|---|
| **R1（1–2 周）对外可用的网关** | 客户端兼容 + Key 风控 | T1 API Key 增强；T2 前半（`/v1/models`）；B6 请求头/参数覆盖；T6 的保留期 job（先止住 usage_logs 增长） | 无 |
| **R2（2–3 周）可开放注册** | 用户自助闭环 | T3 邮件 + 注册；T10 公告与站点；T2 后半（模型广场 + 元数据） | R1 |
| **R3（2–3 周）稳定运营** | 账号自愈 + 看得见 | T4 健康巡检 + 错误策略；T6 仪表盘/报表/导出；T8 Playground | R1 |
| **R4（3–4 周）商业化** | 收钱 | T5 支付插件 + 兑换插件；返利、签到插件；T7 通知插件 | R2（邮件、`users.read`、默认角色授权） |
| **R5（持续）** | 安全与生态 | T9 2FA/会话/OIDC；订阅套餐（核心）；OAuth 账号类型插件（按业务需要逐个：Claude OAuth → Codex → Gemini CLI）；动态权重插件；运维错误分析；状态页插件；多语言 | R3、R4 |

**跨阶段的核心小改动**（建议先在 CONTRACTS 里定下来）：①插件权限 `defaultRoles`；②宿主能力 `mail.send`、`users.read`；③models 类端点允许按请求头判别、共用路径；④`api_keys.kind`；⑤`error_rules` 的"插件默认 + 管理员覆盖"语义（照搬粘性规则）。

---

## 附：盘点覆盖范围

- sub2api：`backend/internal/server/routes/{admin,user,auth,gateway,payment,model_plaza}.go` 全部路由组，`backend/internal/service` 非测试文件清单，`frontend/src/views` 全部页面。
- new-api：`router/{api-router,channel-router,relay-router,task-router,video-router}.go`，`controller`、`model` 文件清单，`web/default/src/features`、`routes`。
- next：`server/internal` 下所有 `RegisterRoutes` 的路由（iam、authz、apikey、group、account、proxy、billing、usage、gateway、audit、plugin/api、updater、ccgateway），迁移 0001–0025，`authz/menus.go` 核心菜单，`web/src/router` 与 `views`，8 个插件的 manifest（anthropic 0.2.4、openai 0.3.3、gemini 0.2.3、relay 0.2.2、volcengine 0.12.2、ccgateway 0.1.5、guard 0.2.2、moderation 0.1.6），`sdk/proto` 的 RPC 列表。
- 未运行代码，所有结论来自静态检索；"❌"表示按上述范围检索未发现，不排除有零散的私有实现。
