# 主请求归属独立审查

日期：2026-10-08。本审查针对另一执行者实现的request_attribution、relay、Mod租约和snapshot开关，不将自己实现的RequestPlan算作独立审查。

## 已检查

- Mod通过带认证的回环control请求开启/关闭turn租约，try/finally释放。
- nonce标记只有在单个text块内精确终端section时可删除；重复、中间位置、尾随文本等拒绝。错误消息不含nonce。
- 删除组合text中的标记保留cache_control和其它块属性；独立marker块仅删除该块。
- auxiliary无marker时body原样经过；count_tokens可剥离marker但不应用生成controls。
- FeaturePlan应用要求非空scope，不能fallback成所有/messages都是主请求。
- snapshot CLI flag与initialize `systemPromptSnapshot` 都在scope启用时关闭，防旧标记跨恢复会话复用。真实CLI恢复证据由另一agent的验证记录提供，本次未重复推断。
- 新增request_attribution_test.go覆盖lease失效、重复进入、32并发归属、aux/主请求/count HTTP管线、拒绝不转发与不泄nonce、cache_control保真及CLI snapshot开关。

## 验证和限制

聚焦测试通过：`go test ./engine -run 'Test(MainRequestScope|RelayMainAttribution|RelayAttributionFailure|MainAttribution)' -count=1`（0.991s）。尝试race时环境报`-race requires cgo`；本机未找到gcc，不把普通并发测试当race通过，后续需Linux/带CGO编译器环境验证。

初次审查发现：scope.verify仅验证process累计applied>0，不能证明每个内部turn都应用过计划。若先前turn成功、后续turn丢失marker，被当作aux透传后总计数仍通过。

已实施整改：enter记录本轮应用计数基线，verify检查当前轮，leave在无应用时设置不可被后续计数清除的失败状态，control_end返回409；同轮多次应用（例如重试）合法。新增回归证明前轮成功不能掩盖后轮缺标记，晚到计数也不清除失败。recordApplied仍在转发前完成，正常model响应结束才触发Mod finally，不等待token流结束后再计数。

同时加固nonce泄漏：只允许精确剥离顶层system终端section，再对整个编码请求检查nonce；即使没有匹配顶层标记，messages、metadata、system其它属性或JSON键出现nonce也拒绝。使用禁用HTML转义的JSON编码避免`<`/`>`转义绕过扫描。拒绝时输入对象不部分改写，不做全局replace。

整改后的归属与control聚焦测试通过（1.021s），含缺轮、隐藏nonce及control端到端409回归。race环境限制仍未解除。

尚未验证：新的CLI版本是否改变append section布局，非标准body布局归属，或未运行Mod回调的特殊内部执行路径。实现对无法归属应明确失败，不能以删控制字段兜底伪装兼容。
