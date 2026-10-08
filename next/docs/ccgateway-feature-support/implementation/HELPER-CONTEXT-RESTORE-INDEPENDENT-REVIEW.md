# 隐藏历史与 tool_result 可信后缀恢复独立复核

日期：2026-10-08。基线 `cb38d953b`，复核其后的未提交最小候选：`engine/helper_history_runtime.go` 与 `engine/outbound_relay.go`。本代理只新增独立测试和本文，不修改作者实现或测试。线上首预算200、第二次tool_result续聊502的事实来自root交接，本代理未访问生产。

## 结论

当前候选未发现新的阻断问题。修复保持原 `normalizeToolResultContexts` 的可信来源、原公开user序号、block索引、tool_use_id及内容严格性，通过改变恢复时点避免隐藏user插入后坐标错位，没有改成按ID全局搜索，也没有删除可信后缀或客户端正文。

`applyHelperHistory(body, restorePublic...)` 在公开历史alignment、隐藏系统来源证明、imported segment解码和leading system匹配全部完成后、插入隐藏消息前执行恢复。`outboundRelay.adaptAttributed` 的generation分支把原恢复闭包交给该hook，count分支仍直接恢复一次；无helper时调用同闭包一次。`tool_result_context.go` 本身未放宽。

## 独立 RED → GREEN

独立文件：`engine/helper_context_restore_independent_test.go`。

fixture先使用现有真实capture函数及观察证据生成隐藏ToolSearch A/U segment，再清理当前请求的旧观察状态，模拟冷请求导入。公开历史为user、客户端assistant工具调用、user工具结果；结果前有text block，客户端正文自身含与可信session_context同文的system-reminder并以TAB结尾，CLI另附一份当前可信suffix。

按旧顺序 normalize → applyHelperHistory → restore，独立单测在restore处明确 RED：`session attachment tool-result position changed`（1.293s）。准备fixture时曾因工具wire名未转换和旧observed round未重置分别触发历史验证错误，已修正这两项测试构造错误；不将它们算产品缺陷。

新顺序 normalize → applyHelperHistory(body, restore) 保持同样内容断言 GREEN。旧顺序保留为单独负例，仍必须报错，用于证明严格位置检查没有退化成全局ID匹配。

## 实际通过的检查

- hook只执行一次，执行时仍是3条公开消息，之后才变成含隐藏A/U的5条。
- 最终公开工具结果为完整客户端原文（包括其自带同文reminder和TAB）加恰好一份当前可信suffix。
- 原view内连续调用恢复闭包两次保持幂等；隐藏user结果与导入的原始segment对象摘要一致，不被迁移后缀。
- 历史证明完成后，在hook中分别篡改tool ID、交换block位置、修改content，原restore仍拒绝；失败不插入隐藏消息且锁存x.err。
- callback返回context.Canceled时原错误原因保留，不插隐藏消息。这是同步错误传播测试，不是实际HTTP取消/CLI终止实测。
- 无helper路径恢复一次且正文完整；公开历史证明失败时callback调用次数为零。
- 既有可信context ACK来源、完整匹配、双result原子校验、尾空白/ECMAScript trim集合等针对性回归通过。

## 命令与边界

设置 `SUB2API_TESTPG=off`，在companions模块执行：

```powershell
go test ./engine -run 'TestIndependentHelperContext|TestReviewToolResult|TestToolResultContext|TestReviewSessionContext' -count=1
go vet ./engine
```

最终定向测试 PASS（0.346s），vet PASS。较早独立hook与context/trim组合也PASS（1.288s）。没有运行真实CLI、模型、PG、部署或网络取消；Core→Worker→CLI→PG新夹具和真实提供商续聊分别由其他代理/后续验收提供，不能借本地绿宣称公网续聊已恢复。

本次未改cancel控制流和网络派发路径；该判断基于最小diff只移动闭包执行时点。count无新增独立整链测试，其原分支一次调用依据源码检查。多隐藏位置、当前轮新helper和跨HTTP完整链由作者/API集成矩阵继续验证，本文不冒充已全部执行。
