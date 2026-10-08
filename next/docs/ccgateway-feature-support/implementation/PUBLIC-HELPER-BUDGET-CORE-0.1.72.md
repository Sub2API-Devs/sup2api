# Core .72 / Worker .75 公开预算工具验收

实际部署源2bd328b46；验收脚本a0f6894e1。使用用户授权平台API、claude-opus-5-5、普通deferred工具发现及task_budget total20000；无私有头/路由覆盖。最多四请求，首错停止，不重试。原始安全结果见 `evidence/public-helper-budget-core-0.1.72.json`。

## 实际失败

2026-10-08T13:49:44.012734Z，RID `890a39010a218c9e7fbc1dbc`（SHA256 `72296893f0a03d6a3f676f25d7356c15495102622dc5fabdb6a108db7b8fa010`），node1/account22，一次尝试，公开502、12.705秒。后续工具结果/普通SSE/回退/inline均未执行。

Worker记录 `e5f62b84-3dc8-4887-85d5-537314662495`。第一提供商请求真实200，完整message_stop、ToolSearch tool_use。第二主轮准备在本地拒绝：`helper history cannot discard an unrecorded system inside hidden rounds`，没有发送第二提供商请求。

第二主轮布局为公开user、既有system、隐藏assistant ToolSearch、隐藏user工具结果、新system。尾system为原生CLI产生的 `<total_tokens>14998238 tokens left</total_tokens>`，带ephemeral 1h cache_control。它不是客户端20000预算值，不得重算、删除或挪到leading位置。当前只支持leading-system捕获的校验发现未知布局并拒绝，后续需要真实来源证明及原位置恢复。

这次与旧Core.71两次预派发503不同，已真实产生一轮用量。OAuth刷新与正常额度查询已成功，不能将本次历史捕获失败归因于授权。

## 账务和不确定状态

helper attempt `44eb2274ed22c02dbbbbe3e280bef27d19e4be832444f622` 状态uncertain，历史records0、usage_receipts1，已消费outbox0。结算由pending变failed，billing_error为 `helper response usage is incomplete`，费用0。没有重复尝试/重复收据。

原始已知用量与持久 `billing_detail.inputs.replacement` 完全对应：输入24、输出91、cache read0、1h缓存写入1647，service_tier standard，inference_geo not_available。顶层0tokens不代表真实零消耗；已知分轮事实保存，整体未知用量阻止计费。界面目前未展示这些失败请求的分轮事实，独立审查另推进详情展示，不能估算总量。

## 后续门禁

先以真实尾system构造隔离红例，再核验有序分段/协商/可信来源/相同内容不同位置、JSON与SSE、冷恢复、回退、旧v1链。通过作者和独立测试、Git构建部署后，才重新执行有界真实验收。本记录保留失败，不以修复后的绿覆盖。
