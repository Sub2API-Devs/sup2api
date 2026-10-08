# Sonnet CLI 默认 context_management 泄漏修复

## 线上事实（不是 prefill 资格结论）

Worker0.1.71，账号22，请求`ce99d868-b9e0-4ee8-8740-c99681bb03fd`，2026-10-08T09:12:17.123858133Z，关联验收`evidence/public-sonnet-pending-server-0.1.71.json`。只发一次实际上游请求，收到原始400 invalid_request_error：`clear_thinking_20251015` strategy requires `thinking` to be enabled or adaptive。没有重试。

客户未指定 thinking/context_management；CLI原请求自动生成 adaptive thinking(display updates)及clear_thinking keep=all。主请求恢复删除了未指定thinking，却遗留CLI隐式context_management。这是网关请求默认字段隔离缺口，不能归因提供商不接受人工pending历史。

前一批附件修复已生效：原CLI真实首user安全块997B和token提醒86B在最终wire的消息/块位置及哈希相同；人工尾user中的87B重复提醒和随机marker均不出站。客户端与最终尾assistant完整canonical哈希均`fb48c1022bfe2ed485309430c5c79cd0d99c3441ad3a94f7aea295a69b8d6c05`，角色序列user/assistant/user/assistant相同。两个engine keep事件输出相同，三方证明成功，history=rebuild。

## 窄修

只修改ApplyMainRequestFeatures的apiGeneration缺省字段隔离表：增加context_management。客户缺省时不继承CLI隐式策略；客户明确null或对象保持原值（既有工具名映射规则不变）。不重新注入thinking，不替客户修复不合法组合，不改变任何安全附件。该主计划仍只在已归属主请求调用，辅助分类/count路径没有新增改写。

## 验证

TestMainPlanDoesNotLeakCLIContextDefault先红后绿。明确context/null保真、缺省不继承、非generation不删、客户clear_thinking却无thinking不由网关修复的单测通过。

TestRealCLIContextDefaults：absent/null/explicit × JSON/SSE × 新建/暖续/冷导入/回退，24次隔离真实CLI调用18.275s通过；每组4次无重发，日志证明实际CLI确实自动产生thinking/context默认，而最终wire使用客户三态。显式策略样例含clear_thinking及clear_tool_uses。

本候选没有部署或真实模型重试；真实Sonnet人工pending是否被提供商接受仍未得到结论。API代理另做独立辅助/count/上游原始400边界复核。

追加回归：TestRealCLISonnetAttachmentContinuation原长历史/三附件策略24次通过23.335s；完整engine测试4.151s通过，go vet通过。
