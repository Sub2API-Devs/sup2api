# Worker 0.1.72 真实验收

源码 `e73b3392c64921c51439e63be5f118c761ae795e`；Worker0.1.72、核心0.1.70、插件0.1.11、catalog.14。默认app镜像及controller已先稳定，本次没有重复发布核心。

## Sonnet 人工 pending 历史：单次通过

`evidence/public-sonnet-pending-server-0.1.72.json`：17.584秒，HTTP200/end_turn，Sonnet4.6，一个成功web_search_tool_result精确配对原pending ID，无新tool调用，非空最终文本，web_search_requests=1。RID SHA256 `28cb5a9a9eb24ba57f68feff9d52e815a8b84834b896fc01a287d5df28373a9d`。

历史来源始终是 `constructed_unsigned_fixture`，`actual_provider_pause_observed=false`。这次证明提供商接受这份人工无签名pending历史及网关冷导入保真，不冒充捕获真实pause_turn后的重放测试。只执行一次，无重试或额外pause续调；之前.70的502与.71的400证据未覆盖。

## Worker 独立原始日志

账号22请求 `816db358-b8a9-45d2-8d75-c266c652bf69`，2026-10-08T09:42:04.786738118Z，history=rebuild。只有一份最终实际上游请求和对应HTTP200响应；没有额外模型生成。原生bootstrap及附件证明通过后才产生该请求。

- 最终角色仍为user/assistant/user/assistant。最后assistant完整canonical哈希`86267dc289052c1d0147c0e8c216b4164f1ff932f9a3d164de8a6ef67a525e45`与原客户端完全一致。
- 客户端顶层system是完整独立text块，原文严格相等且只出现一次。未通过裁剪或移动system绕过校验。
- 原CLI第一真实user中的Auto Mode安全块位于message0/block2，997字节，前后哈希均`f73ca0fe574177d73323da09d2ff4636ac3b11afe268fcafd89e5eb5ddd2aca4`。
- token提醒位于message0/block3，86字节，前后哈希均`8e8009240a184fbbddc3419f61039fede2854d850f7450fa9a938ae96b2c3ec6`。本request两个engine keep事件输出一致，末尾人工message4/block0的87字节重复wrapper与随机marker不再出站；真实提醒原位置和内容不变。
- CLI原始请求仍自动产生adaptive thinking(display updates)与clear_thinking keep=all；最终wire的thinking及context_management均确实缺省，符合本次客户端未指定的请求，不再泄漏不配对的默认策略。
- 原始提供商SSE有1个web_search_tool_result、真实end_turn和1个message_stop；客户端对应结果完整canonical内容与原始块相同，tool_use_id精确匹配原pending ID，最终没有新增tool_use/server_tool_use。结果正文和本地授权信息均未输出。

## 结论边界

本轮修复链在真实公开API通过：冷导入原生安全状态、保留真实附件、去除可证明的人工载体重复副作用、API缺省context隔离。构造pending fixture成功不意味着普通文字prefill在Sonnet4.6受支持，也不覆盖任意签名/资源/inline/模型切换组合。持久helper历史工作尚不属于已部署能力。
