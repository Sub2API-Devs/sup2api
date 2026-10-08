# Sonnet 附件与 assistant-tail continuation 修复

## 真实失败与证据边界

线上 Worker 0.1.70 / CLI 2.1.292，2026-10-08T08:33:59.175571769Z，账号22请求 `c09e1a33-890b-43e0-bd79-a5608b8492be`：人工构造的无签名 pending server history 返回502，`continuation transport input changed`。原验收文件是 `evidence/public-sonnet-pending-server-0.1.70.json`。没有最终上游请求文件或提供商响应，不能把这次失败归为提供商拒绝人工历史。

原生 bootstrap 已把 Auto Mode 保留在真实 user。末尾人工 transport frame 却再次触发 engine 的 `total_tokens_reminder`，形成提醒加随机 marker 两块；原来的单 marker 严格校验因此拒绝。真实历史已有相同提醒，两次值均为15000000，inner text SHA256 为 `2b7db5539346e950458ca997a2b441c057bc70cb6f5ecf3e4115c594f72c4863`。不记录用户提示、邮箱或授权信息。

隔离临时 Mod 探针确认 `prompt.attachment` 事件只有 `type/text/origin`，没有 user UUID 或消息位置。不能在该事件上做全局去重。实际 wrapper 有两种确证形态：`<system-reminder>\n{inner}\n</system-reminder>`，以及其后恰好一个 LF；不使用 TrimSpace。

## 处理与边界

Mod 只对本请求 continuation 已启用、origin=engine 且策略实际 keep 的 token 提醒，经原有认证 control 通道回报完整输出。与日志开关无关，不改变提醒内容、附件策略、Auto Mode 或工具权限。

Runner 从服务端可信 Prepared native rows 收集证明：每个 native user 必须与客户端对应真实 user 的协议内容匹配，提醒必须是该 user 后的原生 attachment。记录真实 user 序号，不能假定总是第一个 user：长历史导入时，提醒实际可能位于第二个真实 user。

在已认证主请求中，只有以下证明同时成立才消除人工输入的重复副作用：

- control 属于本请求随机 marker，已 ready，并回报至少两次同值 engine keep 提醒；
- Prepared 原生记录在指定真实 user 序号有同值附件；
- 最终出站视图同一真实 user 原位置确实保留完整 wrapper，且客户端原消息没有伪造该 wrapper；
- 末尾恰为单个已知提醒 wrapper 加精确随机 transport marker，前一角色是 assistant。

只移除整个人工 transport frame；真实历史所有提醒的文本、消息序号、块序号和安全附件均不变。marker 自带的 CLI ephemeral cache_control 属于人工载体，不转移到任何真实块。所有定位检查和 marker 泄漏扫描成功后才修改 body，失败不产生部分变更。之后仍执行完整历史、签名、缓存和 server ledger 校验。

同值真实新 user 不做去重；changed budget、未知或安全附件、额外尾部块、任意空白裁剪、跨请求 ack、缺原生证明、客户仿造 wrapper 均拒绝。没有证据的组合继续明确失败，不删除安全内容兜底。

## 本地验证

先按线上 gateway keep + 顶层 system 复现502。两消息 client/gateway/both × JSON/SSE × 新建/暖续/cold/rollback 24次隔离真实CLI通过25.990s。

进一步扩大普通长历史时独审复跑发现只绑定首user过窄；保留红灯并改成严格真实user序号绑定，而非改测试环境或删除提醒。最终长历史矩阵包含顶层system、普通user/assistant/user、pending server尾部；fake提供商调用次数恰为4/组，检测marker不泄漏、真实提醒原位置/原值完整、Auto Mode原位保留。

单测覆盖无/单次ack、错误request、未知detail、大小限制、无日志认证、变值、客户端仿造、未知suffix、额外LF、marker泄漏失败原子性和native首user不匹配。独审另加第二真实user位置正例与移位否例。

此文描述本地候选与隔离CLI证据，未提交、未部署，未重试真实提供商。真实人工pending fixture是否被提供商接受仍待发布后一次受控验收。

最终作者结果：长历史24次隔离CLI矩阵25.147s通过；完整engine单测4.355s通过，go vet ./engine通过。独立复核另行记录。

独审新增红例确认 user→assistant→attachment 不能归为前 user 提醒证明。已收紧原生窗口：user 打开、assistant 关闭；保持 ordinal 不变。红灯与 gateway/both JSON 8次真实CLI回归9.438s通过，相关独审/作者单测0.311s与vet通过。
