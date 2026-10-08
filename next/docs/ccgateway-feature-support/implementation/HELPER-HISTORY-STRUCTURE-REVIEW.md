# Helper history 结构与复用复核

2026-10-08，审查 B 作者代码与 C 身份比较；无部署或真实模型调用。

B 的职责边界保持清晰：contracts 负责有界严格 JSON 与载体结构，engine codec 负责原始工具调用/结果、签名和公开位置验真，system 模块只处理有来源的私有系统边界，transport 负责鉴权/身份租约与有界输出，core store 负责归属/加密/持久提交。transport 使用提前返回，没有为降低行数将多种授权揉成一个无类型布尔。

## 已执行的窄复用整改

原 replayHelperHistory 每个 segment 调 helperHistoryAnchors，反复严格解析完整 public，反复解析相同 tools 并计算摘要。长历史下这是可避免的重复工作。

经 root 授权，新增 helperAnchorIndex：每次 replay 一次校验/解析 public、一次 tools canonical digest；按 AfterMessage 缓存经过 user 边界校验的 prefix digest。capture 的原函数沿 wrapper 复用同实现。没有跨请求可变缓存，也未将不同位置或数值词法合并，不去掉 duplicate-key 拒绝。

新增 TestHelperAnchorIndexPreservesExactPublicAndCatalog 覆盖重复/逆序索引、超过 float64 精度的大整数、assistant/越界位置拒绝，以及 public/tools 重复键拒绝。既有 Helper/ReviewHelper 目标 PASS 1.493s，vet 通过；该整改是审查者成为作者，须 root 再独审。

## 保留而未盲目删除的重复校验

DecodeRequest 已验证载体，newHelperHistoryExecution 又校验对象。后者也是可由内部代码独立调用的构造边界，当前不因省一次解析删除其安全校验。后续若集中 DecodePayload 返回有明确验证来源的类型，可共享解码结果；不能只接受一般 struct 后假定此前已验证。此为优化建议，不是当前功能阻断。

## C 身份窄修

unwrapHelperHistoryResponse 改为比较 principal/generation，仍严格比较 attempt/requestDigest/namespace；AuthType 为描述字段，不是另一种 issuer 授权。已有 TestHelperResponseBindingIgnoresDescriptiveAuthTypeOnly 独立运行 PASS 1.201s：api_key/claude.ai 描述可变化，实际 principal 或 epoch 变化拒绝。未编辑 API 作者 ABC 夹具，不据此宣称 ABC 全链已通过。
