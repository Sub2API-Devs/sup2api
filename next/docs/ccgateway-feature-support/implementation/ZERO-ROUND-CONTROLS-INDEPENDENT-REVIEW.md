# 零内部轮次控制与真实缓存隔离：独立复核

2026-10-08，未部署、未新增真实提供商调用。独审没有改产品代码。

## 结论

当前限定候选独审绿色。safeguards 使用真正 wireMessage 的历史名字核验，允许已完成且严格保原名的退休客户端历史；当前工具目录/schema、opaque context 和其他安全门禁未放松。篡改已登记历史输入会令完整指纹失效，不能借旧身份获得许可。

task_budget 仅在 `forcedLoadedClientCatalog()` 成立时越过“配置开启内部搜索”的表面条件：当前全部普通工具明确 eager、forced any/tool、maxTurns=1、helper 禁止执行。它不是让一般内部搜索具备跨轮预算能力；auto、deferred、synthetic、MCP/server/inline/safeguards 等组合仍由现有 gate 拒绝。

## 缓存隔离纠正

原 `configKey` 的 completed-history tag 没有为 native HistoryCache 提供隔离。此次删除该无效位置，改入真实 `toolHistoryNamespace`，该键实际参与 `findPriorSnapshot`、普通 commit 及 API response checkpoint 写入。

两个固定格式 tag 分别隔离 completed-history 传输变化和 zero-helper budget 路径。tag 不随每个旧 call ID 或预算数值增长；具体消息指纹仍限定分支。独立执行作者的真实索引测试：种入旧键下可读取的 snapshot，调用 prepareHistory 后必须 rebuild，验证不只是两个字符串不同。

## 独立验证

- 作者真实 CLI 隔离矩阵中 safeguards/JSON 与 forced-tool-budget/JSON 共9调用，连同实际旧索引隔离单测，PASS 8.380s。
- forced-any-budget/SSE 5调用，PASS 4.006s。
- 上述预算组先建立 auto/no-budget 会话，再切 forced/budget，断言实际 history=rebuild；随后续聊、冷导入和回退的预算对象及目录保持原值，实际主请求数与外部调用数一致。
- 新 `zero_round_controls_review_test.go`：auto/none、隐式或显式deferred、synthetic、MCP/server/inline/safeguards、无目标、缺beta仍拒绝；修改已完成历史 input 后 safeguards 仍拒绝。加原一般预算隐藏历史 gate 回归，PASS 1.463s。
- `go vet ./engine` 通过。

真实 CLI 为2.1.292，上游均是隔离 fixture。本次没有证明实际提供商的 safeguards/预算资格，也没有恢复此前一般搜索的隐藏 helper。冷导入保持的是客户端给出的完整可见历史；一般预算+内部搜索持久账本缺口仍未解决，不能以此次零helper路径宣称其已支持。
