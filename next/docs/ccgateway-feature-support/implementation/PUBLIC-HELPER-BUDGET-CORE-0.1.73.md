# Core .73 / Worker .76 公开预算工具验收

部署Git精确 `cb38d953b554bcd47ed75c9c7ddec9436a4d90d4`。用户授权平台API、claude-opus-5-5；无路由覆盖，首错即停。原始安全输出 `evidence/public-helper-budget-core-0.1.73.json`。此次只执行两请求，未执行普通SSE/回退/inline，也未重试。

## 首请求成功

2026-10-08T14:51:08.287601Z，RID `d49b8d1f80551caeeef1c640`，账号22/node1，200/tool_use，16.216秒，一次公开尝试。Worker首轮实际有两次提供商调用，隐藏ToolSearch A/U与49字节尾预算system已完整出站，不再触发上一版leading-only错误。

公开与持久账务精确一致：input48/output154/cache read1646/cache creation1h1921，service_tier=standard/inference_geo=not_available。iterations保留两提供商轮：24/91/1h1646和24/63/1h275/cache read1646。账务billed，费用0.01896920。helper committed，历史records1、用量receipt1、已消费outbox0。

这是实际首请求/内部发现/工具交接和计量证据，不代表完整会话闭环或跨账号验证。

## 工具结果续聊失败

2026-10-08T14:51:24.460129Z，RID `58765193bd96b5f10af0e6b1`，同账号22/node1，502，9.768秒，一次尝试。第二attempt父receipt精确等于首请求已持久receipt，Core已正确找到原链，没有跨账号或未知链降级。

Worker记录 `d84f123d-9768-465a-8cf8-c4c98ef0cc05`，处理2464ms，首因 `cannot prepare the upstream request: session attachment tool-result position changed`。记录只有cli-request和upstream-refused，没有主模型实际request/response；本次在准备出站时拒绝。账本按传输不确定状态保留uncertain，records0、用量receipt1、outbox0；结算failed/0费用，usage unknown且没有replacement事实。不能把公开0计数泛称提供商零消耗，Worker阶段证据单独列明。

原因：normalizeToolResultContexts记原公开user序号1；applyHelperHistory插回隐藏ToolSearch user后，restoreContexts仍按原序号恢复可信session_context后缀而定位到隐藏user。客户端结果ID未变化，严格校验正确拒绝了错误位置。

## 修复门禁与范围

候选在helper内部所有公开历史对齐及恢复证明结束后、隐藏消息插入前执行原恢复闭包；不放宽user/block/tool ID检查，不全局搜索ID。原客户端文本、同文reminder和尾TAB仍保留，可信后缀仅恢复一次。

旧顺序单测RED已复现；独审新阶段及篡改/取消否例已通过。另以Git clean cb38旧Worker二进制、隔离dummy OAuth/profile与真实隔离PG构造前态，38.463秒真实RED复现相同502；未改共享源码造红。修复后的完整OAuth场景门禁仍在跑。后续只需Worker .77，Core .73、Plugin .13、Controller .48保持；未把候选算上线或把旧失败覆盖为成功。
