# 隐藏工具引用目录独立复核

日期：2026-10-08。候选尚未部署。没有额外公网模型调用。

## 真实故障

Worker .77 的公网首请求成功，工具结果续聊由真实 provider 返回 `Tool reference mcp__ccgateway__lookup_fixture not found in available tools`。隐藏历史、工具 ID 与 session_context 附件恢复正确，但新的 CLI 进程没有同步加载历史已发现的 deferred 工具。此前 ABC 假上游未验证工具引用是否有定义，因此其通过结果不能证明该条件。

## 独立前态复现

- 新增 `helper_history_catalog_abc_test.go`，假上游仅检查协议位置 `user.content[].tool_result.content[].tool_reference`，不扫描不透明 input；从 top tools 建立目录，并按公开 system 中 addition/removal 的真实位置更新。
- 七个单测证明缺定义拒绝、先添加后引用通过、未来添加不能授权过去引用、后续撤回不否定过去合法引用、撤回后引用拒绝、重加后引用通过、不透明 input 中同名字段不被扫描。`TestABCReferenceCatalogPosition` 最新 PASS 3.052s。
- 独立 clean worktree `artifacts/catalog-before-86c8` 固定 `86c8dfe2a7dc59f6f9aefe02980eabc502afc0d1`，编译旧 Worker；没有改动共享作者实现。
- `TestHelperHistoryABCCatalogRealDBCLI/false`：实际隔离 PostgreSQL、Core HTTP、旧 Worker、真实 CLI 2.1.292、假 OAuth/profile 与假 provider，FAIL 39.787s。工具结果续聊确实命中 provider 400：`Tool reference mcp__ccgateway__weather not found in available tools`。CLI 将该错误聚合为外层 502，不能把这次隔离的外层状态说成公网原始 400。
- 原真实 session_context、尾 TAB、冷导入/回退与用量断言没有删减；此红例在续轮中止，后续阶段未完成。
- 执行 session 80572 已终态，专用 SSH 隧道 45439 在 finally 关闭。未测试生产数据库、未变更生产配置。

## 待完成

等待 Worker 作者冻结目录恢复候选，使用相同严格假上游和账务断言复跑。此前未检查目录的绿色矩阵不充当本修复证据。

## 修复版 JSON 独立集成

作者冻结后，相同 `TestHelperHistoryABCCatalogRealDBCLI/false` 使用当前源码编译 Worker，PASS 131.127s（2026-10-08 15:53 UTC）。严格假上游拒绝条件未修改。5 次公开请求 / 6 次假 provider 调用，覆盖首轮、工具结果续聊、普通夹轮、新 Worker/cache 冷导入、回退；真实 session_context 后缀至少发生一次，尾 TAB 与原文保持，隐藏块与尾系统对象 hash 保持。强计量总 input 124 / output 131 / cache_creation_1h 1647 和唯一 usage/receipt、重复持久不重复计费断言均通过。

同一 shell session 50285 顺序运行 SSE 子组中；此刻不宣称 SSE 已通过。没有真实 provider 调用或生产部署。

## 修复版 SSE 独立集成终态

`TestHelperHistoryABCCatalogRealDBCLI/true` PASS 126.791s，同一严格假上游、真实 OAuth 形态 fixture、真实 Core/Worker/CLI 与隔离 PostgreSQL，5 次公开请求 / 6 次假 provider 调用。与 JSON 相同的目录、原文/TAB/可信后缀、隐藏历史、尾系统 hash、cold/rollback、124/131/1h1647 和唯一账务收据断言全部通过。session 50285 已终态，专用 SSH 隧道在 finally 关闭。

结论：本次目录恢复的独立隔离端到端门禁 GREEN，前态精确 .77 的 RED 保留。元字段/任意大整数/schema 冲突的独立 engine 测试属于其他审查文件，不把本 ABC 普通目录样本夸称涵盖全部工具元字段。真实 provider 修复后验收与部署仍未执行。

## Worker .78 未来默认镜像闭环

2026-10-09（北京时间），作者完成精确 `00c5b0d19760217c1323dc706f3970f1551dfcd6` Worker .78 的原账号 22→21 补丁与健康检查后，本代理才执行 root 已授权的配置更新。

- 已确认 `ccgateway-worker:0.1.78` 存在，镜像 ID `sha256:a74739b06449c50bc570a4f143161c5dc70e266cb9df9ec8119777d89182b648`。
- 完整 public 配置读取后仅修改 `images.app`；PUT 200、正常 `runtime/install` 200。Controller 保持 `ccg-controller:0.1.48`，其余公开字段和 secret-presence flags 逐项相同；凭据仅内存使用，没有记录。
- cc-max 0600 文件 `/opt/ccgateway-runtime/default-0.1.78-before.json` 与 `default-0.1.78-after.json` 核原 21/22 的 Id、Image、Mounts、完整 Config、Path、Args 完全一致，均 running；未重建既有账号。
- OVH 安全事实 `/home/debian/sup2api-managed/default-worker-0.1.78-verification.json` 保存配置/刷新状态，不含凭据。
- 只读 #22：active、schedulable=true、status_reason 空；Redis cooldown TTL=-2（不存在），未人为清冷却。
- Core .73 / Plugin .13 没有重新发布。没有 quota/profile/模型调用，后续公网验收由 root 独占；本记录不替代真实 provider 回归结果。

## .78 公网验收后的只读关联

2026-10-08 16:10 UTC（北京时间次日），root 独占请求；本代理未重试模型。

- 首 SHA `4ea8a3452e4378f0e65ec473db3c4f069974d92dfc05568667db92dbad349d80` → RID `ca94d197da9250a4d33937a4`，200，#22/attempt1，48 input /154 output /2524 cache read /1033 cache creation 1h，billed 0.0120408。helper attempt `a753d7d9fd8ab2fe833f219b5000ea70f3d91715fc139ca7` committed，1 record/1 usage receipt/0 outbox。
- 续 SHA `b8fd89654be748884b8cab40c1dd8a84e820f22ba7c8ad5c02a8888312860a42` → RID `da88efe85e42e8446d0e9405`，200，#22/attempt1，2/20/read883/1h1568，billed 0.0131286。attempt `1fa5403ce5182e3bb46d75bcbdd63226e197e52caf71c81d` committed，parent 精确为首 attempt，同样各1 record/receipt。
- 第三 ordinary SSE（省略 task_budget）SHA `d5917fd4cb442071ec9b161a0682676fe75cf21d482f3c8b21286df537c9e5fe` → RID `b7f8fa4e34e4238987b723f3`，503，#22/attempt1。真正核心类别是 `gateway_helper_history_storage`；attempt `5e61ffb8d0f6ca6b86cf904bb6f6ec3cdc52f5b00c0589b0` uncertain，parent 精确为第二 attempt，0 record/1 usage receipt/0 outbox。已知真实用量2/66/read883/1h1585，billed 0.0141846，无重复收费。#22仍 active/schedulable，reason空、cooldown TTL=-2。

CC只读关联 Worker `a3033c97-7e35-44af-a2cb-cc9691dff7bc`，1次provider请求，200/end_turn、完整message_stop。真实公共SSE含 thinking_delta 的 `estimated_tokens` 字段。源码 `helperDeliveredPrefix` 调用 `credits.MessageFromEvents`；后者 thinking_delta 固定 `len(delta)==2` 拒绝该三字段事件，使 finishHelperHistory 的 valid=false，返回统一storage503。当前原始重组/Commit错误在恢复持久成功时没有日志，因此不能把泛化storage文案说成数据库失败。该新缺口待独立红例及修复；本次已停止，没有rollback/inline/public重试。
