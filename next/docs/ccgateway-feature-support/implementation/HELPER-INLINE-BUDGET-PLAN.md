# 托管预算与普通 custom inline 时间线

2026-10-08，下一候选，未部署，作者 audit_code_beta。

现 gate 整体拒绝 InlineTools；不能直接删除：旧隐藏 ToolSearch 结果若按当前最终 Searchable 验证，在之后撤销时会误拒，或错误复活过去发现的工具。

最小方案沿用 v1：Segment 的 top-tools 摘要与完整 public-prefix anchor 已共同绑定当时 inline 变更、顺序及 schema；不另造可执行注册。每段回放建立仅到其 AfterMessage 的只读时间线，使用已有 compileToolTimeline/compileInlineTools 和配对账本验证该段。旧 discovered 只留在临时历史视图，不注入当前请求；当前 SDK/Mod/模型目录仍由最终时间线决定。

仅普通 custom 客户端工具；native、server、typed、MCP、显式 safeguards、签名 compaction、资源/credit/context/assistant-tail、legacy synthetic 原 gate 保留。原预算 total/remaining 不重算。

范围：engine/helper_history.go、helper_history_runtime.go、新 helper_history_inline.go 及对应独立单测/真实 CLI 假上游矩阵。不修改资源身份、主请求归属或 Mod。先覆盖旧合法发现后撤销、同名新 schema/精确数字、错误 anchor；再验证 JSON/SSE 新/续/冷/回退、完整隐藏消息和当前目录保真。不能证明的组合继续明确拒绝。

## 作者实现与验证

原红 TestHelperInlineCustodyAtTrailingSystemAndWithdrawnReplay 1.302s，命中整体 inline gate。新 helperInlineHistoryView 对每个已校验 anchor 重建前缀目录，先清最终 InlineTools/internalCache，再按原 base 编译；Message 切片独立，旧 compiler 写 toolCarrier 不污染当前请求。无 inline 的早期段只看原 base，不能把未来新增工具带进去。

API 预审另捕获末尾 inline system 边界：不能把 after 退到前一个 user。新 helperPublicTurnBoundary 允许 user 及紧随其后的连续公开 system 尾，完整 prefix 摘要包含所有指令，仍按真实索引之后插入；孤立 system、assistant 后的 system 拒绝。共享 v1 原本即为公开消息索引，未改变字段。旧 ordinary 段仍恢复；旧 Worker 的整体 inline gate 会明确拒绝新组合，不应被解释成有能力或自动降级。

单测覆盖旧发现后撤销的合法回放且当前不可搜索、同名 9007199254740993→9007199254740995 schema、撤销/重加各位置、未来工具在过去 anchor 拒绝、旧 ordinary 段、public/toolCarrier 不变与错误边界。

TestRealCLIHelperHistoryInlineBudget 复用现有 carrier 场景，普通入口 wrapper 行为不变。16 次本地 CLI2.1.292 假上游调用 PASS19.367s：JSON/SSE各新请求内部发现、结果回传并撤销、普通续聊、冷Worker、同名重加新schema、回退变更前/后。每次上游断言预算 total20000/remaining11000 原值，原 inline 角色/定义/描述/精确数字以及完整隐藏规划/签名和原位 helper system。全 engine PASS6.226s，vet通过，无真实提供商推理。

本实现仍待独立审查；不扩大 native/server/typed/MCP/safeguards/资源等门禁，不更新目录或发布。当前 runtime/helper 文件候选与其它代理资源身份修复分开管理。

## 下一候选目录与 UI

经 root 授权更新 catalog `2026-10-08.16`、插件 manifest `0.1.13`；本地 Git 全引用搜索未发现该 manifest 路径曾使用 .13。它们属于下一候选，不包含在当前 .74 首因修复的已推送部署源中，尚未提交或发布。

F-TASK-BUDGET 与 F-INLINE-TOOLS 沿共享目录准确注明普通 custom inline、真实历史锚点、撤销不复活及隔离验证边界；保留 partial/runtime_verified=false 和其他复杂组合限制。前端继续动态展示同一目录，没有新增预算/inline托管开关，前端测试检查新限定说明与无额外控件。

目录 tests PASS1.654s/vet；插件全包（含 manifest 检查）1.722s/internal0.493s；前端两文件20tests PASS3.84s，typecheck通过。本段不替代独立 engine 评审，也不称真实云端组合已验收。
