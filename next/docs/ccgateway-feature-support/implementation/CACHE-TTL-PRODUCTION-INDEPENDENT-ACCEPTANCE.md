# Core .77 / Worker .80 TTL来源独立只读验收

唯一模型调用由root执行；本代理未发模型、profile、授权状态探针或数据库写入。公开结果见 `evidence/public-cache-ttl-core-0.1.77-worker-0.1.80.json`。

## 精确账务记录

clientRID `cache-ttl-77-039d57ff045f4f73`，serverRID `f566aacd7141ac2b38c11592`，usage_log_id **744**，2026-10-08 19:18:37.887329 UTC，account22。独立只读SQL核200/success/attempt1/billed，usage记录1条、`usage:<RID>` balance ledger1条；Additional/Replacement均0。本场景无helper custody，不要求helper receipt。

Core metrics：total2595、explicit1h1376、explicit5m0、unclassified1219、partial、source=json、platform_default_cache_write_compat。原输入218/输出409/read2752、默认收费桶1219与1h收费桶1376保持。

实际明细：输入218×4/M=0.000872，输出409×20/M=0.00818，read2752×0.2/M=0.0005504，默认写1219×5/M=0.006095，1h1376×8/M=0.011008，合计0.02670540。差额1219仅是本次实际未细分TTL，不等于提供商报告5m；未修改历史账单。

## Worker原始SSE

最新对应log `7f6dee11-d43f-49b6-bc42-b7b072c040c5`，内部requestID `74dd04f7-01e6-437b-8c85-0dac77d1dd8c`，完成19:19:01.656599865 UTC、22937ms。与Core时间/账号/唯一调用及完整usage对应；Worker请求头未携Core RID，不宣称存在直接同名header关联。

唯一上游响应 `109d1cb1-d756-4f69-a8a6-5d8b98c72f7b` HTTP200，原SSE SHA256 `7a77e20652a5132d949ed5774a6650a8539458aac8f3947116576071fbe2972f`，70events、1message_stop、0error。

- index0 message_start：input2/output24、cache total1376、1h1376、5m0、read0。
- index68 message_delta：input218/output409、cache total2595、read2752、thinking0，未再次报告TTL细分，stop=end_turn。
- 公共JSON保留最新total2595和先前explicit1h1376/5m0，HTTP200/end_turn保持。Core的source=json指它接收的公共JSON，不冒称其直接解析了内部SSE。

## 静态HTTP与管理UI接口

匿名只读HTTP访问OVH本机3130的index200，SHA256 `59d91516cfaa30290956bdff028d85920697b0842c4810d0189797eecb75ffd5`。实际引用 `/assets/index-Cinbey_M.js` SHA256 `ae0895fd9df3f2fbc942004c39e0dec15a13d3f68a876477ba16e4c63e1dc331` 含中性“默认计费桶”；实际 `/assets/UsageTable-DT-ct9Nd.js` SHA256 `eb376e82d313046341207870aa8a7ba30373664ae93d1028141b79ef350256f7` 含cache_write_evidence。

这只是部署静态文件HTTP证据，不是浏览器视觉。为避免重复登录，API代理负责root已授权的唯一正常operator登录及真实管理UI流程；本代理已提供usage744及双RID。admin/真实owner HTTP安全投影的实际结果待该流程单列，不能将静态源码检查冒充实际用户会话验证。没有输出凭据、完整提示或MCP正文。
