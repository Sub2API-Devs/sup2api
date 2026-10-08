# Fallback credit 第七批设计与进度

2026-10-08。用户授权继续实现。当前等待第六批 checkpoint：独立模块保留未跟踪，所有 credit tracked hooks 已撤下；运行时文件暂名 `engine/fallback_credit.go.pending`，不参与编译。没有对生产启用或执行真实兑换。

## 官方约束与支持边界

[Fallback credit](https://platform.claude.com/docs/en/build-with-claude/fallback-credit) 的令牌属于拒绝响应，五分钟内向同组织/工作区兑换；本平台收紧为同一已验证账号与 issuer generation。不是本地一次性令牌：显式重试仍由 provider 判定，不标记为首次使用后永久耗尽。

`model`、输出上限、采样、stop sequences、stream、metadata 和 service tier 可以改变；提示词字段必须匹配。两个 fallback beta 家族有例外，其他 beta 集合保持一致。continuation 按原拒绝 content 追加一个 assistant，可移除未完成客户端工具调用并裁剪末尾文本空白，不能丢 thinking/signature 或移动 fallback 边界。provider 对实际可兑换模型、已执行服务端工具及瞬时拒绝仍有最终判定权。

[默认服务端路由](https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback#server-side-fallback) 未公开按分类推荐的完整路由，不能把 Models API 的显式允许目标误认成可冻结的默认链。因此 `fallbacks: "default"` 继续明确拒绝；不改写为另一种显式请求冒充支持。

本平台不自动选目标、不换号、不丢 token 重新请求、不执行拒绝重试阶梯。目标模型照常通过分组权限、账号能力与冻结价格；真实兑换折扣以 provider 返回的缓存用量结算，不伪造免费或退款。

## 已完成的独立模块

- `contracts/credits`：TokenHash、Prompt、Digest、MatchingBetas、ClaimForResponse；UseNumber 保留数字身份，未知顶层字段默认绑定，null/缺省不合并。只忽略官方允许的变动字段；最多三个合法提示词摘要（原体、原 content 追加、规范化 content 追加）。
- `core.FallbackCredits`：Record 和 Resolve 端口；记录 owner、完整 ResourceBinding、source model、令牌哈希、合法提示词摘要、观察时间及期限。无令牌明文、无原提示词。
- `fallbackcredits.Service` 与 0041：事务 owner/token 锁，拒跨 owner/账号/issuer 改绑；重复观察不延长原期限。Resolve 不消费令牌。过期记录短期作为防复活记录保留，按 owner 对全部保留记录设置上限，新增时清理超过 24 小时的过期记录。
- `engine/fallback_credit_registry.go`：AES-GCM 加密原 wire prompt 与合法 wire echo，令牌哈希作文件身份和 AAD；密钥从配置 Worker key 派生；原 token 不进入快照。每条/总容量有界、原子写入、过期清理，密钥变更或丢失快照明确拒绝。

## 待重新接入的 Worker 逻辑

`fallback_credit.go.pending` 已编写但未完成真实 CLI 验证：

1. 只有核心可信 tracking capability 才开启登记；兑换还需要已验证 token hash capability。若已有资源授权复用 issuer 锁，否则独立查询同 broker 的真实身份，不借此授予文件或输出资源权限。
2. 核对本次客户端提示词/beta摘要、原账号身份、CLI版本、完整请求策略及工具身份配置。
3. main marker + Mod turn 归属成立后，兑换只使用已加密原 wire prompt；允许修改的参数来自本次已校验请求。合法 continuation 使用预先绑定的 wire echo，不从新模型生成的系统附件猜测重建。之后仍执行资源引用校验。
4. provider JSON 使用真实 JSON carrier；SSE 在本功能启用时有界缓冲到终态，原始事件顺序保留。快照保存成功后才能发动态 Ready header 和原 token。
5. 禁止 CLI session persistence，跳过包含 credit 的常规 response checkpoint；诊断请求和 beta 提前进入脱敏模式，分片原始日志不保留，完整结构中的 fallback_credit_token 脱敏。主响应观察器学习新发行令牌，防其他日志字符串间接携带。

延迟 SSE 首事件是当前严格登记方案的可见取舍；不会宣称仍具有逐 token 即时首字延迟。

## 核心所需四处接线

由 root 在资源输出接线冻结后处理，避免同时修改 pipeline/forward：

- 完整拒绝响应：验证 Worker Ready hash 与实际 token 哈希一致，`credits.ClaimForResponse(原客户端body,最终客户端response,原beta)`，Record 成功后对外提供可追踪 token。
- 调度前：`Resolve(owner,TokenHash,Digest)` 固定原 AccountID；重新检查账号可用性、issuer/generation、目标模型权限/价格。失败不能改选其他账号。
- 构建 Worker 请求：内部 TrackingHeader=1、AdmissionHeader=tokenHash，携当前期望 principal/generation。平台用户不能自行注入这些内部头。
- 一经派发不在核心或 Worker 自动重试；真实 400/429/5xx 与计费证据保持原义。

头常量在 `contracts/credits`：`X-CCGateway-Fallback-Credit-Track`、`X-CCGateway-Fallback-Credit`、`X-CCGateway-Fallback-Credit-Ready`。只有哈希进入这些头，原 token 仍在标准请求/响应 JSON 字段内。

## 实际验证

- `go test ./credits -count=1`：PASS 2.570s；覆盖可变/不可变字段、beta、超安全整数、raw/规范化 continuation、签名和边界保留、不修改源对象、非 refusal 不发行 claim。
- `TestCreditRegistryEncryptedBoundedAndPersistent`：PASS 3.677s；密文检查、重开恢复、重复不续期、改 prompt/密钥/ciphertext/path 拒绝、容量约束。
- 核心 `TestCreditRecordValidation`：PASS 3.261s；时间/哈希格式/摘要别名隔离；vet 通过。
- 已新增 `TestFallbackCreditDBOwnershipExpiryAndRetries`，等待 Git 候选 Linux 数据库执行；本机 PostgreSQL 既有启动故障，本轮未伪称 DB 通过。
- 撤下主 hooks 后 engine 相关准入/诊断/registry 目标测试 PASS 1.323s。

## checkpoint 恢复指引

只包含 credit hook 的本机补丁暂存于 `C:/Users/16790/AppData/Local/Temp/ccgateway-credit-hooks.patch`，不能未经检查覆盖第六批后续代码。第六批提交后读取新主链，逐段恢复 hooks，再将 pending 文件改回 Go 文件并完成真假响应、拒绝、跨账号/过期/日志与两种请求形态的真实 CLI 假上游测试。

本文件、contracts/credits、fallback_credit*、core/ports_fallback_credits.go、server/internal/fallbackcredits 和 0041 均属于第七批，不纳入第六批提交。

## 第七批 Worker 主链接入（第六批 4903994 后）

已逐段核对新主链恢复 hooks，`fallback_credit.go.pending` 改为实际 Go 文件。本节取代上方「待接线」状态；核心端接线与数据库验证由 root 独立记录，以下不是生产部署证明。

- June/July credit beta 进入共享 forward 白名单；追踪和兑换仍要求核心可信 capability 与实时 issuer/generation。登记前有界校验客户端原始提示词，兑换同时绑定完整策略、CLI 版本、上游地址与工具身份；只在归属主请求中恢复原 wire，辅助 count 不记录为 credit 来源。
- 真实 CLI 隔离探针发现 SSE 丢弃 `stop_details.fallback_credit_token`。已从归属主响应观察器按相同 message ID、stop reason、其余 stop_details 完全一致恢复唯一已知缺失字段，拒绝字段变化或不同 token。JSON 保留原 JSON carrier。记录 token 首次被观察时间，五分钟过期不从最终缓冲释放时重算。
- 修复空 `content: []` 被内部编码为 null 后的断言崩溃；无 prefill claim 只登记原请求摘要。重复使用令牌不当成 single-use，重新观察不延长原期限。损坏或过期同 hash 不能覆盖重发；过期墓碑保留 24 小时并计入 128 MiB 总预算，单记录 64 MiB。
- credit 请求禁止 CLI session persistence 且跳过普通历史 checkpoint。beta 在读取任何分片日志前就启用凭据脱敏；token 字段及其他字符串中的已知 token 均不落日志。
- 原始提供商拒绝保持正常 200。若原响应已收到而 Worker 登记失败，向**可信核心**返回原响应及实际 usage，并设置内部 `X-CCGateway-Fallback-Credit-Failure: storage`，不设 Ready。核心必须消费此故障头并在公共出口返回 `gateway_credit_storage`，不得暴露未托管 token。此为内部账务保真协议，不把拒绝伪装为提供商失败。发送网络错误另走原传输错误流程，不冒充登记失败。
- 新共享 `credits.MessageFromEvents` 聚合公共 ID 改写后的事件，精确保留 JSON 数字、完整块、text/thinking/signature/citations/input_json/compaction delta；要求完整事件生命周期，未知 delta/身份覆盖/截断均报错，32 MiB 有界。供核心按最终客户端内容登记续写摘要。

### 实测与边界

- 全 engine + credits 单测 PASS 7.199s / 0.246s，vet PASS。
- `TestRealCLIFallbackCreditWireBinding`：JSON/SSE 拒绝、原体兑换、assistant 续写、重复兑换，共 8 次实际 CLI→隔离假上游；Opus→Sonnet 时原系统提示、工具目录和历史精确保留，JSON/SSE 模式切换及 max_tokens/temperature/metadata 允许变化。篡改 system 在上游调用前拒绝。PASS 13.548s。
- `TestRealCLIFallbackCreditFailuresDoNotRetry`：登记容量失败、提供商 400/429；每例仅 1 次上游调用。失败故障协议保留真实 usage，无 Ready；不做 tokenless 或改号重试。已追加 SSE 登记失败案例。
- 新旧 fallback 联合真实 CLI 回归 PASS 23.584s；此为隔离协议验证，不说明真实提供商可发行、兑换 token 或实际退款。
- 仍明确拒绝 default 不确定目标、内层 CC ToolSearch 多轮、合成 structured tool 回合、count/warmup 的 credit 混用。来源和目标模型真实资格及退款由提供商最终判定；核心每次重新核验模型权限、价格与原账号，不能绕过。

官方规则复核：[Fallback credit](https://platform.claude.com/docs/en/build-with-claude/fallback-credit)。

## 对象 token、null 与 best_effort 增量（2026-10-08）

依据 [官方 Messages 参数规范](https://platform.claude.com/docs/en/api/http/beta/messages/create)，接入共享 `credits.Parameter`。裸字符串、无 mode 对象、显式 strict 对象保留原形态；对象必须有 fallback-credit-2026-07-01，null 无兑换语义且无需 beta/capability，仍在最终主请求保留 null。

核心仅为已登记所有者的 token 发 Admission 和原 issuer。Worker 的 best_effort 只有在快照有效、完整客户端摘要、策略、工具身份和 issuer 均匹配时才复用原 wire；快照缺失/过期或提示词/策略不匹配时，按普通当前请求流程构建，并将原 token 对象及 mode 原样发送给提供商。不是去掉 token 重试，也不改账号。已存在快照身份不符仍拒绝。

本地文件 I/O、解密或损坏与正常缺失/过期分开：前者明确 `503 gateway_credit_storage` 且无上游请求，不伪装提供商 token 失败。完整 proof 缺失时重新执行普通 conversation/server-history/执行容器上下文检查；best_effort 不授予 PTC 回放豁免。对象 token 的值同样参与日志中其他字符串的凭据脱敏。

真实 CLI 额外证明 SSE 的 opaque usage.fallback_credit 大整数会舍入，已仅在同一归属主响应、同 message ID 且全部非数字字段/结构相同的前提下恢复原提供商子字段，包含 JSON 最终响应及对应 SSE 事件。不改状态或计算退款，不伪造 redeemed。

- 新 `TestRealCLICreditParameterModes`：JSON/SSE 各发行源请求及 strict-object/mode-less/best-match/changed/expired/missing/provider400/null，合计 18 次模型调用；corrupt 与旧 beta 对象在模型调用前拒绝。包含原始 wire 与当前 prompt 分支、原对象 mode、usage.fallback_credit 超安全整数精确保留、无隐式重试。初轮 PASS 22.549s，精度红测修复后纳入联合回归。
- 新单测覆盖 null、July 门禁、对象日志脱敏、lookup missing/corrupt 分类、best_effort 未配对 client echo 与缺失 PTC container 拒绝、usage 状态不可被恢复覆盖。全 engine/credits PASS 7.017s / 0.238s，vet PASS。
- `go test ./engine -run '^TestRealCLI(CreditParameterModes|FallbackCredit|CreditReview)' -count=1`：联合新旧信用与独立 PTC 审查 CLI 回归 PASS 34.227s。

仍为实际 CLI 与隔离假提供商；真实 provider 对象模式资格、退款结果、数据库与部署证据分别记录。增量冻结供独立复核。
