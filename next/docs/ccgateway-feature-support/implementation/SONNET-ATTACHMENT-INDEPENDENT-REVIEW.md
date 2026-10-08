# Sonnet continuation 附件独审

2026-10-08，最终候选 GREEN。仅本地 CLI 2.1.292 与隔离假提供商；没有真实模型调用、提交或部署。

线上原问题是保留网关附件时，人工 continuation 输入触发额外 total_tokens_reminder，既有严格 guard 返回502且提供商生成调用为0。不能将这解释为授权错误或通过删除未知附件解决。

## 独立审查与实际失败

原候选把 native 证据限定首 user。作者随后扩充多轮 fixture，独立完整测试实际 RED（14.106s）：gateway/both × JSON/SSE 首 user reminder 数为0，续聊均502。事实是提醒在较后的真实 user。保留此失败，作者改为按原生 user ordinal 绑定，未移动真实提醒。

改后独立全部24调用 PASS24.068s：client/gateway/both × JSON/SSE × 新请求、暖续聊、冷导入、回退。fixture 包含顶层 system、多轮真实历史，并比较原始 CLI 与最终 wire 中真实提醒及 Auto Mode 的 message/block 位置和内容。

进一步独立红例 `TestReviewNativeReminderAfterAssistantIsNotUserProof`（1.474s）证明 user→assistant→attachment 也被原扫描算作前 user 证据。作者增加 activeUser 窗口：user 开启、assistant 关闭；只有窗口内 native attachment 可成为证明。最终相关独立/作者单测 PASS0.254s；作者 gateway/both JSON八调用 PASS9.438s；独立 gateway/both SSE八调用 PASS8.299s。原24调用覆盖其它逻辑，窗口修正后的受影响两协议另有上述证据。vet 通过。

## 保真边界

新增 `continuation_attachment_review_test.go`：未ready、真正历史提醒缺失/变值、错误角色、尾块逆序、额外块、嵌入文本、额外 metadata、安全附件替换均拒绝，失败不修改 body；真正新 user 不删除；相同提醒从第二 user 移至第一 user 不获得许可。

实际允许路径需要本次随机 continuation 身份、已鉴权 ready Mod 的 engine keep 同值确认、Prepared 原生真实 user 位置证据及最终相同 user 位置的 wrapper 同时存在。Mod 不提供事件 UUID/位置，因此不能靠重复文本计数直接授权。wrapper 仅支持已实测无尾换行或单尾换行；不调用泛化 TrimSpace，不删除 Auto Mode/未知附件。诊断关闭不影响认证证据。处理只去掉人工运输末帧，原真实提醒不修改；后续完整历史对齐仍执行。

目录审查：catalog .14 已明确全 eager 强制单轮无 helper 的任务预算例外；一般隐藏内部轮次仍拒。safeguards 原有“工具改名拒绝”不与严格完成历史原名传输冲突。地域事实独审另见 INFERENCE-GEO-INDEPENDENT-REVIEW.md。
