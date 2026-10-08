# Inline helper 位置合同 v2 修复候选

本地候选，未提交/部署/真实模型验收。原 inline v1 候选不得发布：独立 core→Worker→CLI→隔离 PG 测试发现 CLI catalogue system 位于公开 user 与公开 inline directive 之间；后续 wire 遗失该对象。原作者仅检查 helper 紧前 system，实际检查到公开 directive，是验收假阳性。独审最终红例 41.620s 与此前 171.164s 失败均保留，由独审记录引用。

## 最小修复

私有 transport 仍 1，显式协商 payload 2；省略视为 1。共享/核心由 research_api 实施，Worker 本文负责。版本 1 普通历史继续读取；inline 托管必须版本 2，不能在版本 1 暗产新段。协商 2 导入旧段时只在内部验证视图标记 whole_round，不改数据库原始字节。

- `helper_history_positions.go` 在已识别的公开 message 边界之间扫描非公开 system，拒任何未登记其他 role。
- 首个已归属主请求记录每个 AfterMessage 的实际对象；下一主请求必须原位置、完整对象来源匹配，并经原 source SSE/helper result/隐藏确认后才能导出 system_only。仅沿既有窄规则接受 CLI 单 text block→string 表示转换，保存后一次实际对象，不复制初始 cache marker。
- 原完整 hidden assistant/user 仍 whole_round，位于完整公开 user+inline directive 之后；system_only 在 user 之后 directive 之前。公开 directive 从不复制入私有段、从不移动。
- 冷恢复按同一边界插入；CLI 已有该位置系统时，必须全有且精确相等，才替换避免重复；部分存在/内容变化拒绝。新请求的搜索资格仍由当前 timeline 独立确定，旧 helper 不重新激活已撤销定义。
- Worker capability 明确 `[1,2]`，response 回显请求 payload_version；默认旧 transport 语义不变。

## 当前验证

作者真实 CLI2.1.292 + 隔离 fake provider：JSON/SSE × 新/工具结果续/普通续/cold/撤销/重加/回退，16 provider calls，17.096s PASS。已将旧 fixture 的 catalogue 断言修为真实 user→catalogue→public inline→hidden assistant 相邻位置及目录完整对象 hash，原预算 total/remaining 和 schema 大整数断言保持。

新增位置、错误 anchor、来源变更/移位、版本 1 inline 拒绝单测通过；全 engine 非真实 CLI 4.448s PASS，vet PASS。仍需独立 core→Worker→CLI→PG JSON/SSE 重跑，不能把作者 fake wire 通过替代该门禁。安全鉴权/issuer 生产故障由另一独立修复线处理，本候选不修改认证或资源运行态。

## 作者最终冻结增量

旧 v1 兼容矩阵先出现两次红（28.695s / 32.151s）：把新 gap 扫描用于旧 ordinary v1 后，CLI 既有普通续聊系统被误判为需要新位置合同。修复将新位置采集限定到明确协商 payload 2；v1 继续既有 whole_round 合同，inline 在入口明确必须 2，绝不允许新 inline 默默降级。已导入段的 leading system 不当成本次新段重复采集，仍接受 replay 全对象/数量检查。

最终同一命令旧 v1 Carrier 12 calls + 旧 v1 TaskBudget 12 calls + 新 v2 Inline 16 calls，合计 40 fake provider calls / JSON+SSE 全 PASS 42.602s。最新全 engine 6.893s 与 vet PASS；Worker TestCapabilities 两例 PASS 1.872s（先前 Test.*Features 匹配零测试不算验证）。新增位置否例 1.334s。已交 research_api 独立 core+Worker+CLI+PG 验证；未真实模型调用、未提交/部署。

## Core 与共享协商（独立于 Worker 作者）

transport 版本仍为 1。核心一次读取实际 Worker capability 与 issuer，得到 Namespace/Binding/PayloadVersions 后才选择受支持交集；未声明 payload 能力的旧 Worker 按 v1，未知版本不被当作 v2。仅选择 v2 时发送新增 payload_version 字段。已知 v2 历史遇旧 Worker，在 Reserve/Dispatch 前失败，不重新选账号或静默降级；导入旧 v1 receipt 保留原始 Payload 字节、namespace 和绑定，允许后继新增 v2 receipt。

响应必须回显相同有效 payload 版本。共享解码拒显式 0/null/未来未知 payload 版本以及大小写别名；capability 只有字段省略可兼容 v1，显式 null/空数组不能授予能力。这两处曾由独审红例证明，已修复且保留测试。

共享 helperhistory/features 全测试 1.797s/1.290s PASS；核心协商/既有 custody/requirement/独审目标 3.267s PASS，相关 vet PASS。上述是本地合同和 HTTP 夹具，真实隔离 PG 的新增 inline ABC 尚在执行，不能当作已完成。

### 独立 ABC JSON 红转绿

2026-10-08，最新 v2 候选 `TestHelperHistoryABCInlineRealDBCLI/false` 真隔离 PostgreSQL + 实际 Worker HTTP + CLI2.1.292 + 假 provider PASS 167.188s（fixture 164.26s，JSON 子组 154.27s）。并非 skip。7 次公开请求 / 8 次 provider 调用，包含新请求、外部工具结果、普通夹轮、新 Worker/cache/store 冷恢复、撤销前后回退与同名新 schema。断言真正内部目录在 user 与公开 inline directive 之间的原位及完整对象 hash，另逐块核 hidden thinking/signature/planning/tool input/result 配对；7 usage / 7 receipt 与 160 input / 64 output 无重复。此前 41.620s 的同路径真实红例保留，不以旧作者 fixture 假阳性替代。

共享整改后核心协商/custody/requirement/独审目标再跑 PASS 1.574s、vet PASS。SSE 独立子组随后运行中，未将 JSON 通过写成两协议全部完成；无生产模型请求、无部署。

### SSE 最终证据与边界

`TestHelperHistoryABCInlineRealDBCLI/true` 真隔离 PostgreSQL + 实际 Worker HTTP + CLI2.1.292 + 假 provider PASS 169.326s（fixture 168.05s，SSE 子组 157.35s）；与 JSON 同样 7 公开请求 / 8 provider 调用、7 usage / 7 receipt 及强位置/对象/签名/精度断言。两组均完成后关闭各自隔离 SSH 隧道，无生产请求。

旧 core→新 Worker 的省略 payload_version 路径由作者 Carrier/TaskBudget 各 12 次真实 CLI 调用证明（结构字段为 0 且 omitempty，实际未发送该字段），不是用选择 v2 的新 core ABC 代替。已知 v2→旧 Worker 在 Reserve 前拒绝、旧 v1 原 bytes→新 v2 追加由核心 HTTP 内存 store 测试直接证明；本次 ABC 从首轮即为 v2，尚未把跨版本混合收据真数据库迁移额外独立验证，不应将这部分说成已完成实证。

非作者共享/核心协商审查已 GREEN，原两项协议红例修复后复跑通过。当前作者区冻结，未提交、未部署。

### 跨版本真实账本追加测试（执行中）

新增 `TestHelperHistoryABCMixedPayloadRealDBCLI/false`，复用普通 ABC，仅首轮模拟 legacy capability 字段省略，随后使用真实 Worker `[1,2]` 声明；5 次公开请求 / 6 次 provider 调用的既有冷恢复/回退/账务断言保持。直接从真实 store Lookup 读取第一次 v1 收据，再在第二次 v2 追加和冷 store 重读后检查旧 Payload bytes、Receipt、ChainDigest 完全不变，ParentReceipt、Namespace、账号/issuer/generation 保持。当前实际 PG 运行中，不能提前登记为通过。测试源码编译及 gateway vet 已通过；无业务源改动。

跨版本追加实例最终 PASS 136.892s（fixture 135.86s，JSON 子组 125.67s），真实隔离 PostgreSQL / 实际 Worker / CLI2.1.292，5 次公开请求、6 次假 provider 调用、5 条真实 usage 与 receipt，120 input / 48 output。v1→v2 的原 bytes/receipt/chainDigest、父链、同 namespace/issuer 与冷 store 重读全部直接断言通过，不再只依据内存 store 推断。18760 句柄完成，隔离隧道已关闭；未重复已通过的 inline JSON/SSE 全矩阵。候选再次冻结。

### Root Worker 位置复核

发现 v2 原扫描只覆盖两条 public 消息之间，alignClientHistory 允许首条 public 前有额外 system，但 AfterMessage>=0 无法表示其位置。新增独立反例先红1.432s，入口显式拒绝此未支持布局后绿1.394s；不忽略、不挪动该 system。现有 CLI 内部目录在 user 后，正常布局不受影响。随后独立真实 CLI v2 inline SSE 子组12.298s通过（假提供商，无真实账号），覆盖最终入口窄修。旧 v1 路径不执行这个新位置扫描。
