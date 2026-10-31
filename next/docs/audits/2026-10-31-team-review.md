# 2026-10-31 团队审核：feat/next-platform b6d361d34..e379cf5fb

57 个提交，406 个文件，+37251/−5303，全部在 `next/`。七个只读 agent 按区域分工审核，主控跑模块测试并抽查 P1。

## 测试

| 模块 | build / vet / test |
| --- | --- |
| sdk、server、gateway、plugins/dynweight、plugins/mailer | 全部通过，无 `--- SKIP`（PG 测试真跑） |
| plugins/moderation | **失败 1 个**：`TestCostDaysFollowCallerOffset` |
| next/web | vue-tsc 通过，vitest 874 用例通过 |
| moderation ui、packages/host | vue-tsc 通过，host 单测 15 个通过 |

`TestCostDaysFollowCallerOffset` 失败的原因：`stats_api.go:168` 的 `dayStart` 没先做 `t.UTC()`。pgx 读出的 timestamptz 带本机时区，在非 UTC 主机上日期分桶偏移。生产容器是 UTC，所以线上暂未触发。改法：`l := t.UTC().Add(c.offset)`。

## P1（建议本轮修）

| # | 区域 | 位置 | 问题 |
| --- | --- | --- | --- |
| 1 | 账号用量 | `migrations/0064_account_usage.sql:51` | `period_count` 的 CHECK 约束是 1..1000，但代码、前端和 §73.3 都允许按小时最多 8784。填 1001–8784 时写库 500。需要新迁移先 DROP 约束再 ADD（主控已核实） |
| 2 | 插件设置 | `plugin/api/settings.go:225` | `x-sensitive` 的地址字段被当作密钥。只有插件权限的人可以改 webhook URL，同时沿用原来的密钥（moderation 的 `notify_webhook_url`）。§75.1 的规则本身写得不对（两个 agent 独立发现） |
| 3 | moderation | `extract.go:95` | 按字段是否存在选择审核内容，不看协议，`messages` 优先。Responses/Gemini 请求附带一个假的 `messages` 就能绕过审核（主控已核实）。new-api 按 format 选字段 |
| 4 | 核心钩子 | `gateway/hooks.go:598` | gjson 遇到重复键取第一个，上游解析器多取最后一个。`{"messages":[良性],"messages":[违规]}` 可以绕过审核，需要在核心统一拒绝或规范化 |
| 5 | moderation | `extract.go:360`、`store.go:162` | 提示词里带 `\x00` 时，PG text 列拒绝写入，可疑记录丢失，该用户进不了名单、不会被封禁 |
| 6 | moderation（设计） | §72.1/§72.4 | 只审结尾连续 user 消息、最多 16 条。伪造历史、补 16 条 ok、assistant 预填、tool_result、开头垫长文本等方式都能绕过。文档的论证只考虑了诚实客户端 |
| 7 | moderation（存疑） | `manifest.json:480/60` | 64 MiB 接收上限，内存放大 4–6 倍，512 MB 内存上限，加上 fail-open。几个大请求并发就可能打挂插件，熔断期间被封禁用户也会被放行 |
| 8 | dynweight | `rules/config.go:82` | 默认规则「首字挂死」用整次耗时 p100 ≥ 120s，单样本就会触发。正常的长流式响应会被降权 50%，并且回不来（照搬了 new-api，new-api 原意只针对非流式） |
| 9 | dynweight | `rules/config.go:83`、`eval.go:458` | 「健康恢复」要求有 ttfb 样本。只有非流式流量的键样本数为 0，永远不会回升 |
| 10 | moderation UI | `SettingsTab.vue:86-100` | 保存时把本页 8 个键（含 `jev_default_set`）用打开页面时的旧值整体写回，会覆盖其他管理员之后的修改 |

## P2 摘要

**账号用量**
- 0064 回填用的是旧版原始费用算法，以后退款或改账号时 hourly/totals 会留下残差。
- `EnforceUsageLimits` 读和写之间没有比对配置版本，管理员调高限额的同时可能误禁用约 5 秒。
- 第一次开启限额时，时区存成 UTC 而不是浏览器时区；§73.3 和 §73.4 自相矛盾。
- 用量限制已禁用账号时，插件给的较短禁用被丢弃；之后调高限额会提前放出账号。
- 0064 回填期间会长时间持有 SHARE ROW EXCLUSIVE 锁，部署前要评估 usage_logs 的行数。
- 滚动升级窗口内，`auto_disabled_source` 可能残留。
- 存疑：上游 400 一律豁免，"credit balance too low" 不计入失败。

**网关与插件宿主**
- 动态权重为 0 时，失败切换会直接跳到更低一层，与 §74.5 "不会因此跳层" 不符。
- 超大钩子请求借用 RESOURCE_EXHAUSTED 来识别，插件自身过载返回同一个码时会被误判。
- `common.proto` 中 `session_fingerprint`（实际是 HMAC）和 `environment` 两处注释与实现不符。

**通知、环境变量、审计、mailer**
- 环境变量全局层读库失败时丢掉旧值，2 秒内请求体上限退回 32 MB，超时参数也回到默认。
- 插件写审计在 defer 中同步写库，响应实际要等审计写完（最多 5 秒）。§75.2 "先 flush 不影响调用方" 的说法不成立。
- 节点关闭时会取消正在进行的投递，SMTP 已接收的邮件重启后会再发一次。
- 插件重启或升级中的投递仍然计次数，与 §74.4 不符。
- 邮件 `To` 头列出全部收件人，发给多名终端用户时会互相看到邮箱。
- 审计请求体的脱敏只按字段名判断，`jwt`、Slack 式 webhook 地址会漏掉。

**moderation 后端**
- 被封禁用户仍可使用 embeddings、count_tokens 以及 volcengine 生图、生视频。
- pre 命中后同步写库可能超过钩子超时，导致本应拒绝的请求被放行。
- 默认 `record_errors` 和 `store_text` 都开启，渠道故障期间原文会保存 7 天。
- `/users` 能枚举几乎所有活跃用户的显示名。
- 保留期清理未检查 `pg_advisory_unlock` 的返回值；如果线上走事务池（Supabase 6543），锁会泄漏（存疑）。
- 0007 迁移用的是非并发 CREATE INDEX。
- 关停时排队中的 post 任务会被丢弃。
- AI 分析可被提示注入，诱导自动移出名单。
- 统计保留期短于 30 天时，`/costs` 的 30 天数据会不完整。

**dynweight**
- 粘性清理逐键全量 SCAN，超时会丢事件和通知。
- min_samples 不是硬门槛，低流量键会抖动。
- 降到 0 后不影响已有的粘性会话。
- 存疑：权重 0 的排除发生在并发和限流闸门之前。

**控制台前端**
- 限额输入框 `step="0.01"`，金额超过 2 位小数时整个账号保存被卡住。
- 切到 `period=none` 后，周期长度的报错行被隐藏，无法保存。
- 清空限额再关闭开关，返回 400。
- 只有本人账号权限的用户，环境变量卡片为空（§74.3 权限漏了 own 级）。
- `reenter` 和通知校验的报错是硬编码英文。
- `listAll` 写死 200 作为终止条件。
- 半小时时区下周期起点显示偏差。
- `PluginSettingsView` 切换插件时没有请求序号保护。
- mock 错误码与真实接口不一致。
- 成功率小字把尝试次数标成「次」。

**moderation UI**
- 阈值清空后保存返回 400。
- 已过时（stale）的分析仍提供「按建议执行」。
- 版本抽屉切换流程后可能串数据。
- 一次轮询失败就替换整个抽屉内容。
- `flow_id=0` 返回 400。
- 来源计数是 30 天，点进去查的是全部历史。
- 错误码 `panic` 没有文案。
- 总超时填 0 时，显示值和实际值不一致。
- 表单不限宽，`#title-extra` 导致页面说明没有进顶栏。

## CONTRACTS 需要修订的地方

- **§75.1**：规则需要区分凭据和 x-sensitive 地址。改为"任何字段改动都不能沿用未重填的密钥"。嵌套的密钥字段也要掩码。
- **§75.2**：flush 不等于响应结束，要么改实现，要么改说法。
- **§74.4**：插件重启或升级中的投递不计次数，这一条做不到；"1 小时" 的退避永远达不到。
- **§74.3**：读权限需要加上 `account:own:read`。
- **§74.5**：
  - 失败切换时会跳层；
  - "恰好一次" 只对状态成立；
  - 缺 "累积到头仍按已有样本判" 这一句；
  - 健康恢复依赖首字样本；
  - 长流式会误触发首字挂死；
  - 候选权重 ≥1 的前提不总成立；
  - 迁移注释把章节写成了 §73.5。
- **§74.2**：sticky 清除的 percent 是按条抽样的期望值，不是精确比例。
- **§73.3/§73.4**：
  - 首次配置的时区规则自相矛盾；
  - 金额允许 8 位小数，但界面只能填 2 位；
  - `period=none` 的上限 1000 没写；
  - 小时周期上限 8784 与数据库约束冲突。
- **§73.4**：自动禁用信息只放在悬停里，触屏和键盘用户看不到。
- **§72.1**："封禁" 的定义言过其实，钩子只覆盖 6 个协议。
- **§72.2**：没写明 failure=open 时被封禁用户也会放行；"响应超大计为失败" 的分支实际碰不到。
- **§72.4**：需要明说同步拦截只对不刻意规避的用户有效。
- **§72.12 与 §72.13.7**：key 是否导入互相矛盾；`analysis_guidelines` 会被静默丢弃。
- **§72.14**：`/users` 不能列出用户的说法不成立。
- **§72.15**：设置不覆盖的说法只对本页以外的键成立；图片额度挤占文本，没有前端提示。
- **HANDOFF §1/§5**：按用户名筛选需要 `user:read` 权限，文档没写。

## 修复状态（2026-10-31，同日第二轮 agent team）

全部 P1、P2 已修，#4（重复键）与 #6（审核整个请求）按用户要求一并改。七个写者按模块分工：核心三份（account、gateway/plugin/audit/sdk、notify/environment/mailer）各在独立 worktree，合回主目录；moderation 后端、moderation UI、dynweight、web 在主目录按目录独占。CONTRACTS 三方合并，3 段冲突手工合并。

- 版本：moderation 0.6.0、dynweight 0.3.0、mailer 0.1.1；核心迁移 0064/0068/0070 直接修改（生产只到 0063），dynweight 新增迁移 0002。
- 测试：sdk、server、gateway、dynweight、mailer、moderation 全部 build/vet/test 通过；server、sdk 另做 GOOS=linux vet；web vue-tsc + vitest、moderation UI typecheck + vitest 通过。
- 合并时顺带：前端补 `recipient_too_long` 文案，`neverSaved` 优先读 `configured`。
- 核心修复中另发现：gjson 递归校验遇到约 11 MB 的 `[` 会栈溢出导致核心进程退出，已在网关扫描时限制嵌套深度 10000。
- 未解决或需要后续：
  - 插件页路由没有标题，标题和说明无法进顶栏；
  - 宿主不提供当前用户 id，换账号登录时插件缓存不会清；
  - `ClearStickyBindings` 只接受单个 model；
  - credit balance 的 400 不计入失败（观测里拿不到上游正文）；
  - moderation 0.6.0 升级要重新批准 `gateway.hook`（high），审核费用和 pre 延迟会上升。
