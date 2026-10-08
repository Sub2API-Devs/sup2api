# Helper payload v2 协商独立审查

审查对象：research_api 编写的 contracts/helperhistory 版本框架、features runtime capability 解析、core helperRuntimeInfo 选择与派发/响应门禁。审查者未修改这些生产实现；不把本人 Worker 位置捕获实现计作独审。未调用模型、未部署、未运行昂贵 ABC 或 DB（作者正在独立进行）。

## 已发现并由作者整改

1. Request/Response 的前置 map 校验只识别精确 payload_version，而 Go typed JSON 解码大小写不敏感。`Payload_Version:null`、`PAYLOAD_VERSION:0`、canonical 2 后跟 alias 0 均能降成默认 1。独立红例复现后作者拒绝非 canonical 别名；原严格 JSON 解析仍拒重复字段。
2. capability 显式 `helper_history_payload_versions:null` / `[]` 被视为省略，核心默认授予 legacy 1。独立红例复现后作者仅允许省略使用 legacy，显式空/null/别名均拒绝。

红灯保留：helperhistory 1.976s / features 1.549s，新增独立测试文件没有删改失败目标。

## 复核结论

- transport 仍 1，省略 payload_version 的 marshal 不添加字段且 effective=1；显式 0/null/未知/字符串/浮点形式不当作合法版本。请求与响应均覆盖。
- capability 只在明确支持的 1/2 中取交集最大值；未知值不推断为 2，只有未知值无交集拒绝。
- known v2 chain 遇 legacy Worker，RequestEnvelope.Validate 在 Reserve 之前拒绝；既有 HTTP 回归实际检查 calls 和 attempts 不增加。
- Response effective version 必须与派发 envelope 一致；新增独立测试覆盖默认1↔2、显式1↔2变化，拒绝前不安装 h.response。
- 协商 2 可追加 v1 receipt，core 直接引用原 Payload bytes 构造 History；没有对既有账本 receipt 解码重写。已有混合链 HTTP 回归检查原记录 bytes/binding/namespace，独立请求解码测试保留数字与原 body。
- 校验不依靠客户端私有 header 建立授权；沿既有 owner lookup、namespace/issuer 固定与 authenticated Worker transport。未知普通路径仍由纯 requirement gate 决定，不因声明版本本身获得托管。

## 最终执行

- 独立及作者全 helperhistory/features：PASS 1.619s / 0.268s；两包 vet PASS。
- core `TestReviewHelperReply|TestHelperPayloadCapability|TestHelperKnownVersionTwo|TestHelperLegacyReceiptCanAppend`：PASS 2.987s（SUB2API_TESTPG=off，该组为 HTTP/内存 fixture，不能标 DB 验证）。
- 本审查新增：helperhistory/payload_version_review_test.go、features/payload_capabilities_review_test.go、gateway/helper_payload_review_test.go。

本轮共享/核心协商无剩余阻断项。Worker 位置语义与真实 core→Worker→CLI→PG 全链仍由其他独审负责，不能由此结论替代。
