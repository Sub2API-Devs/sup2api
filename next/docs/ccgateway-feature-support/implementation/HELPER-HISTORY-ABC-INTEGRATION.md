# ABC 隐藏历史托管：真实 Worker / CLI / 隔离数据库集成

日期：2026-10-08。候选代码未部署，核心 EnableHelperHistory 仍默认关闭，Worker 未自动宣告 helper schema。测试文件为 `next/server/internal/gateway/helper_history_abc_cli_test.go`。

## 夹具与证据层级

从当前 companions/worker 源码 `go build` 临时 Worker 子进程，实际 HTTP 私有载体进入 Worker、实际 CLI 2.1.292 执行内部 ToolSearch，再访问 loopback 假 provider。核心使用既有 HTTP API 测试入口、真实 A 加密持久层、真实 PostgreSQL usage receipt / outbox 消费路径。测试数据库来自独立 `sub2api-next-testdb-pg-1`，由 testutil 自动创建/清理数据库，没有连接生产数据库。

账号目录、核心鉴权和价格是测试夹具；假 provider 只返回固定 SSE。正式能力广告未开启，测试显式 opt-in 核心开关，并从实际 Worker 读取 CLI 版本和真实稳定 issuer，再按共享合同计算 namespace。这不是正式发布资格宣告，也不是实际 Anthropic 推理或供应商计费验收。

每个协议运行5个公开请求：新请求内部搜索后返回客户端工具调用；客户端 tool_result 续轮；普通无预算夹轮；停止 Worker 后保留 issuer 数据、替换 native CacheDir 并新建核心 A Service 的冷导入；回退到早先工具结果历史。原始预算为20000，不由网关扣减。普通无预算轮也写空 Payload 收据。

每协议实际 fake provider 调用6次，冻结用量合计 input120/output48；5条 outbox 均同账号且公开请求 attempts=1。每条冻结记录直接 Persist 两次，再 Drain；最终 usage_logs=5、usage receipt=5、待确认 outbox=0。这里证明持久用量和结算待处理输入不会因重放重复插入；未将测试价格或待处理记录声称为实际供应商扣费。

## 原始失败与修正

- 第一轮 JSON/SSE 两组均首次返回核心503，35.230s RED。
- 单JSON诊断复现26.287s RED：Worker实际 inner200、正常 tool_use、用量40/16，返回真实 AuthType=api_key；核心错误地对 resources.Identity 整体比较，期望里没有这个描述字段，误拒同一 principal/generation。
- 核心改为仅严格比较合同绑定字段 principal/generation；auth_type保留为返回事实。新增api_key/claude.ai允许，错issuer/epoch仍拒；连同空Headers独审回归2.889s通过。Worker原本仅把两个绑定字段转为可信头验证，没有同类误判。

## 通过记录与断言边界

- 完整 JSON/SSE ABC：226.505s PASS（主测试223.90s；JSON111.49s，SSE103.37s），10个公开请求、12次真实CLI到假provider调用。
- 追加严格预算存在性：JSON122.010s PASS（子组111.26s），既要求带预算轮字段确实存在且原值不变，也要求无预算普通轮保持缺省。
- 追加断言编辑时有一次测试文件重复 import 导致编译失败，已移除重复import；该次没有执行DB/CLI，不计入产品失败或通过。

完整矩阵当时显式验证了私有规划不外发、隐藏轮前system的角色/位置及整个对象hash、工具外部续轮、冷导入和用量。此前把“签名恢复验证”也列为该矩阵直接证据过强：当时签名保真来自B作者测试，ABC自身尚只依helper ID分支。已纠正，并新增严格断言：隐藏assistant三块顺序，thinking/signature/planning/tool ID/name/input逐字段相同；整个assistant对象、下一user完整tool_result对象在续轮/冷/回退保持hash；配对ID唯一且结果内容非空。允许CLI原本产生的cache metadata，但后续完整对象不能丢改。这些最新断言目前仅编译检查通过，交root独立运行最新SSE子组，未借先前绿灯冒称已动态验证。

所有测试子进程已停止，相应隐藏SSH隧道在finally关闭，未改线上运行态。下一门禁是root非作者最新SSE验证和提交后精确Git SHA的Linux门禁。

## 实际 admission 探针后的 JSON 重验

新命令 `TestHelperHistoryABCRealDBCLI/false`（JSON）通过120.731s，子组110.80s；实际经过 Worker requirement HTTP，不是decision stub。五个公开请求/六次隔离provider调用，包含隐藏轮、外部tool_result续接、普通无budget空收据夹轮、冷Worker与新A实例、回退。最新强断言直接验证原thinking/signature/planning/tool_use字段与对应tool_result完整对象、leading system原位完整对象、预算原值及缺省不注入；数据库冻结outbox/usage/receipt仍按夹具既有幂等断言执行。会话13317终态，隧道finally关闭。没有生产模型调用。
