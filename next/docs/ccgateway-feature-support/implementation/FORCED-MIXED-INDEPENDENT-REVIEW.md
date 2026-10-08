# Forced mixed catalog 独立复核

2026-10-09。复核当前作者冻结候选，仅新增 `engine/forced_mixed_review_test.go`，未修改业务、作者测试或 features catalog；未访问生产/真实模型。当前窄范围未发现新增阻断缺陷。

## 范围与结论

named choice 的目标必须显式 defer_loading:false；其他普通工具可显式 true。any 混合、implicit、deferred 目标、MCP、inline、typed/server、safeguards 及旧 synthetic structured output 仍受统一资格判定限制。执行上限一轮，CCGATEWAY_TOOL_SEARCH=0；保留 ENABLE_TOOL_SEARCH 的客户策略，不伪造发现，也不开放 helper 响应。

`verifyForcedLoadedCatalog` 先逐一检查实际目录中的名字、schema、重复与多余工具，要求完整，再从 Plan.raw 恢复原目录顺序与字段存在性，唯一名称变换为既有 wireName。只允许删除内部 ToolSearch/DeferredToolPlaceholder。函数自身先验证、后整体替换；缺项不从 Plan 补齐。原始 Plan 重新解码，响应变更不污染 Request 或下一次恢复。

独立测试实际调用 ApplyMainRequestFeatures，比较整个原目录，而非只比作者 helper 返回值：description 空串、strict:false、input_examples 空数组、eager_input_streaming:null、schema 大整数、顺序与 defer 原值均保真；原 named choice、disable_parallel_tool_use:true、metadata:{} 保留。改变输出 schema 后，原 Request 与下一次恢复结果不变。

独立负例覆盖末尾重复/未知、schema 改变、defer 对象错误类型；直接调用 verify 失败时原 wire 对象 digest 不变。缓存测试证明 defer 变更改变 configKey；原缓存组成已含 Tools、metadata、ToolSearch/命名空间，预算另有 zero-helper namespace，不要求每种主轮 choice 都新增独立 namespace。any/implicit/MCP/inline 资格拒绝与零 helper 配置均通过。

## 调用链证据与测试限制

`ApplyMainRequestFeatures` 在 verify 前调用 applyCompleteToolCatalog/applyServerSearchTools；既有适配可恢复 SDK augmentation 的客户端 schema/metadata。因此直接 verify 的坏 schema 负例只证明该函数边界，不能据此声称整个主轮对恢复前的所有 schema 差异都拒绝。没有将既有客户端 SDK 恢复无依据当成新缺陷。

`outbound_relay.go` 的前置 verifyNativeWireTools 仅在 InlineTools!=nil 时执行，后置仅在 InlineTools==nil 时执行；本 mixed 排除 inline，实际是后置校验，不能描述为前后双核。新原始目录恢复仍先经过 forced verify 的 schema 检查；原生工具校验路径保持原有条件。本独审不把未新增的所有原生配置生产组合声明为资格通过。

## 实际运行

工作目录 `next/plugins/ccgateway/companions`；SUB2API_TESTPG=off。

- 清空 CCG_REAL_CLI，`go test ./engine -run '^TestReviewForcedMixed' -count=1`：PASS 1.272s。
- CCG_REAL_CLI 指向隔离 fixture 使用的本机 2.1.292：`go test ./engine -run '^(TestReviewForcedMixed.*|TestRealCLIForcedMixed.*|TestReviewForcedLoaded.*|TestForcedLoaded.*|TestForcedMixed.*)$' -count=1 -timeout=120s`：PASS 7.299s。
- `go vet ./engine`：PASS。

真实 CLI fixture 使用 dummy key、独立配置与 loopback 假上游；覆盖 JSON/SSE 首次/结果续聊/回退/cold 的八次主轮，预算/原 choice/并行参数/完整目录/usage，以及 helper 非法响应和提供商 forced 拒绝的两项负例。使用作者冻结 fixture，未新增昂贵 ABC/PG/profile 测试；该证据不等于真实提供商模型支持 forced choice 或生产发布完成。

## 追加：真实 native relay RED（取代上方无新增阻断结论）

Root 指出恢复可能掩盖真实 native 定义后，独立新增 `native_wire_before_plan_review_test.go`，通过真实 `relay.handler → adaptAttributed → ApplyMainRequestFeatures` 和 2.1.292 的 matchNativeTools 选择 Read，不直接绕过 relay 调 verify。SUB2API_TESTPG=off、CCG_REAL_CLI 空，六个子例含每种条件的合法基线和故意改变实际 CLI schema。

`go test ./engine -run '^TestReviewNativeWireDefinitionBeforePlanRelay' -count=1`：RED 1.494s。

- `plain-native-metadata/changed`：Read 声明 strict:false 触发 applyServerSearchTools，实际 CLI schema 与请求已验证定义不符；恢复覆盖后仍真实到达假上游 handler，HTTP200、Failure=nil。这证明既有 native 防线确实可被恢复掩盖，不能仅以客户端 SDK augmentation 合理为由忽略 native。
- `mixed-native-metadata/same` 与 `mixed-exact-schema/same`：合法原生定义被 HTTP400 拒绝。新 originalForcedCatalog 返回 []Object，写入 message.tools 后，verifyNativeWireTools 只按 []any 取目录，得到空列表，误报 Read unavailable。这是 mixed 新路径的实际类型不兼容。
- mixed changed 当前被拒绝不能算正确识别 schema 的证据，因为其 same 基线也失败。plain same 通过。

最小修复建议：在任何会恢复原生定义的主轮改写之前验证实际 CLI native schema（当前仅 inline 分支前置不够）；统一后置目录读取类型或规范恢复结果类型，保留防重复/缺失/不符校验。此次只新增测试和记录，未改作者业务；上方测试绿只覆盖 custom mixed，不能扩大为 native mixed 通过。保留六case原断言供修复转绿。

## 最终修复独立复测：RED → GREEN

CC 冻结两处修复后，本代理保持六个原断言不变复测。outboundRelay 将非 count 主轮的实际 native 校验统一提前至 ApplyMainRequestFeatures 之前；verifyNativeWireTools 使用 historyContent 兼容 []any/[]Object。旧后置检查保留。

源码检查确认此前步骤只有主轮 system 标记识别、工具结果 context 规范化、消息内 image carrier 恢复、尾 continuation 移除，没有改写顶层 tools 原始对象。解码来自 JSON，不存在顶层 tool 与消息 block 共享引用的路径。count 条件、req.CountTokens 原请求早返、已验证 credit.raw 早返与辅助请求分流保持原状；本批不扩这些路径的语义。

独立实际命令（SUB2API_TESTPG=off，CCG_REAL_CLI=隔离 fixture 的本机 2.1.292）：

```text
go test ./engine -run '^(TestReviewNativeWireDefinitionBeforePlanRelay|TestRealCLIForcedMixedNativeClientTool|TestReviewForcedMixed.*)$' -count=1 -timeout=120s
PASS 6.006s
go vet ./engine
PASS
```

六case合法 native 全部通过，变更实际 native schema 全部在假上游之前拒绝。真实 CLI native Read JSON/SSE 新请求、续聊、回退、cold 全矩阵通过，检查实际出站 Read 名/schema、choice/并行开关、budget/目录/deferral/缓存字段和零额外主调用。使用冻结作者 fixture，独立复跑；无生产模型/授权调用。

最终结论：已报告的两项 native 缺陷均以原 RED 断言转绿，当前候选无剩余阻断发现。保留上述 RED 记录解释修复必要性，不将早期 custom-only 绿当成 native 证据。未修改作者业务或版本。
