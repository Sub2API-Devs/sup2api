# F-FAST / F-DIAGNOSTICS 与 Advisor-only 独立审查

证据日期：2026-10-08。仅本地 Claude Code 2.1.292 + 隔离假上游；未用真实模型、未部署。本批不修改核心计价规则。

## F-FAST

官方 [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) 仍要求 `fast-mode-2026-02-01`；[Python beta Messages schema](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/message_create_params.py) 为 `Optional[Literal["standard", "fast"]]`，因此显式 null 保留。

- 显式 fast 在 AllowFast 关闭时返回明确错误，不再静默降成标准速度；缺失所需 beta 同样拒绝。
- API plan 在已归属的主模型请求精确应用 speed；客户端未传时删除内层 CLI speed 默认值。辅助请求不覆盖。
- API 路径 CLI fastMode=false，避免 CLI 本地资格检查、降档、环境状态覆盖 API 语义。非 API 的低层 Runner 兼容测试仍保留原设置。
- usage.speed 原样回传；不能把请求 fast 当作实际 fast，更不能据此自动写管理员价格。模型可用性、账号资格与容量交真实 provider 决定，未在本批证明。
- 官方 priority tier 不能与 fast commitment 同用，不等同于 `service_tier:auto` 必须改写或拒绝；本实现不猜测账户 commitment。

## F-DIAGNOSTICS

官方 [Cache diagnostics](https://platform.claude.com/docs/en/build-with-claude/cache-diagnostics) 已 GA；无需历史 `cache-diagnosis-2026-04-07`。请求 [DiagnosticsParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/diagnostics_param.py) 允许 previous_message_id 可缺省或 null。响应 [Diagnostics](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/diagnostics.py) 可以包含仍 pending 的 null 原因。

- 对象、空对象、null 经主请求 plan 保真；非主请求不注入。缺省时删除 CLI 自己的 diagnostics，避免借用内层其他 ID。
- 收到外部 JSON 或 SSE 的真实 message ID 时登记 ownership。ID 本身不重写、不合成。
- 索引为 `cache/message-ownership-v1.json`，独立于请求日志；存 ID 摘要、客户端 scope 摘要、时间和随机授权 generation，不保存提示词或凭据。上限 4096 条、TTL 一小时；这只是本地保留窗口，不承诺上游保留同样长时间。
- scope 来自 Worker API key 租户域 + 核心根据已认证 host Meta 构造的 X-CCGateway-Session-Scope + 授权 generation。用户 metadata/session ID 不能改变归属。没有核心 scope 的直连 Worker 为单租户域。
- previous ID 未知、过期、跨客户端、跨 Worker 账号均在执行模型前明确 400。合法 ID 仍可能得到 provider 的 previous_message_not_found/expired/pending 等真实诊断结果；本地历史缓存命中不代表上游缓存命中。
- OAuth 重新授权、注销前持久化新 generation 并清空记录，持久化失败不继续更换授权。已经准入的并发请求固定旧 generation，迟到响应不能恢复成新账号所有权。授权尝试随后失败会保守地失效旧诊断 ID，不影响普通历史对话。
- 控制器迁移授权只将 config 复制至独立 draft 卷，不复制该 cache 索引。管理员直接绕过管理接口替换凭据文件/上游 API key、保留相同 Worker key 和数据目录时尚无可靠 issuer revision：必须清理该 ownership 文件并重启，不能承诺跨这种操作继续比较。令牌刷新不会自动清空索引。
- 写索引失败不将已经生成的正常回复改成模型错误；记录独立 trace，后续无法证明归属的比较失败关闭。日志关闭不影响索引语义。

## Advisor-only 历史修复

发现真实 CLI 将只含已完成 advisor server_tool_use/advisor_tool_result 的助手 turn 替换为唯一 text `[Advisor response]`，还可能带空 citations 数组。之前恢复器因此拒绝续聊。

仅当原始客户端 turn 全部为已注册 advisor 块、ID 在该 turn 内唯一且调用/结果完整配对、CLI 内容恰好为上述占位时恢复。仍通过整条历史角色、用户 turn 与普通 block 对齐；不接受混合普通文本、未配对调用、乱序结果、重复 ID 或非空占位 citations。没有扩大未知块或任意文本替换权限。

## 验证

- `TestRealCLIAdvisorOnlyHistoryReview`：新请求、prefix-hit、回退 fork、另一 cache 冷导入，四轮真实 CLI 假上游通过（最近 3.00s）。每轮未额外生成模型调用。
- `TestRealCLISpeedDiagnosticsOwnership`：fast/standard/缺省/null 四种主 wire、JSON/SSE usage.speed 与 diagnostics、JSON ID→SSE续请求→SSE ID续请求；跨 scope 和未知 ID 在模型调用前拒绝，总四次模型调用通过（最近 2.91s）。
- `TestAPISpeedDiagnosticsRelayAttribution`：仅主模型应用，辅助分类器原参数与内层 Authorization 保持。
- ownership 持久重载、TTL、quota、跨 scope/Worker、ID碰撞、重新授权后旧 exchange 迟到响应不复活等单测通过。
- Advisor 占位负例单测通过。
- 全 engine 单测通过；go vet engine 通过。contracts/features 当前测试另有并行 inline-tools 注册表旧断言失败，由 typed/inline owner 更新，不能报全仓通过。

## 文件边界

`api_speed.go`、`api_diagnostics.go`、`message_ownership.go`、`api_speed_diagnostics_test.go`；`request_policy.go` speed 验证及 configure 调用；`feature_plan.go` diagnostics 解析/默认剥除/feature decisions；`runner_config.go` API fastMode；`main.go` 准入归属和响应登记；`auth.go` 授权 generation 边界；`history_omissions.go` Advisor 占位受控修复；`advisor_only_cli_review_test.go`。

## Typed / inline 独立审查追加

- `TestReviewTypedAPIToolSearchReferences`：typed bash_20250124 + 服务端 regex 搜索合法准入，但结果引用 tool_name:bash 和相同历史分别被当未声明工具拒绝；初始 response/history 两项红灯。已交 typed owner 统一引用身份适配。
- `TestReviewRemovedToolsetHistoryKeepsIdentity`：完成的 browser 调用/结果历史，当前 tools=[] 时，CLI 丢 toolset_name 后恢复器因当前 typed catalog 为空而提前返回；初始红灯。历史身份由客户端显式字段证明，不应依赖当前是否还提供定义。
- `TestReviewInlineAdvisorAndCompactionCannotBypassModelAuthorization`：inline advisor 定义和 compaction.tool_changes 引入的二级模型均因明确未支持的时间线 ledger 路径拒绝，PASS；没有把缺 beta 当授权隔离证明。
- Root 的服务端 cache 组合已核对：Apply 先按原始 server 定义注入，restoreCacheTools 再以受控 wire name 恢复原工具顺序/标记，typed 仍做整定义比较；不再保留旧的 server tools + cache 一概禁止说明。仍需 typed owner 修上面搜索引用组合，不能以已通过普通 Web/Advisor cache tests 代替。

### 最终复核补充

- Advisor-only 新增 inline system 与 fallback 混合模式。CLI 在 advisor+fallback 无普通文本时使用 `(no content)` 占位。恢复器仅允许该精确占位对应已注册 advisor+fallback、所有 advisor 调用已配对且 fallback 前无 pending 的原始历史；不接受任意空白或普通文本缺失。plain/inline 各四流程通过，fallback 的四流程通过（2.97s）。累计覆盖三模式各新请求/prefix-hit/fork/冷导入。
- typed owner 修复统一 searchReferenceName/wireSearchReferenceName 与无当前目录时的 toolset 历史恢复后，两项独立红灯已转绿。
- 最近全 engine 单测 PASS 5.010s，go vet engine 通过；contracts/features 仍有 owner 待更新的 inline beta 旧断言。此状态不代表全仓验证通过。
