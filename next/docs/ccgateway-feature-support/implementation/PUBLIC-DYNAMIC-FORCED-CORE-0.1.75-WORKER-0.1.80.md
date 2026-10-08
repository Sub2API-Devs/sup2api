# Core .75 / Worker .80 公开动态 MCP 与 forced mixed 独立核验

2026-10-09只读核既有六次请求，不新增模型/身份/配置操作。原artifact分别为 evidence/public-dynamic-mcp-core-0.1.75-worker-0.1.80.json 与 public-forced-mixed-core-0.1.75-worker-0.1.80.json。Core RID逐一SHA256与脚本匹配；Worker以响应用量、目录/结果/调用hash与时间联合关联，不假称存在持久跨层RID。

## Dynamic 三次

全部account22、HTTP200/success、attempts1、billed，每次只有1个实际provider HTTP交换。

- fresh RID bbf9b04351f2e28c997184f3，17:58:41.384Z；Worker目录21eb0bbd-d4bd-44b5-ae5c-59f507023f96（metadata request_id 0bb2a2f7-f354-46b7-a8df-dd6551103fb6）。input218/output380/read2752；创建总2595，明确1h1376，core普通创建1219；费用0.0261254。
- continuation RID 5f3057a26eea9786dde1915d，17:58:53.543Z；目录0a405538-eb45-4f1f-bda1-b82b29204e60（8d3f5f8c-599e-48e7-9bff-c1e899ad1f99）。218/276/read7196；总2753，明确1h1534，core普通创建1219；费用0.0261982。
- rollback RID ef4278d4532ae913eb895ee7，17:59:04.063Z；目录9f7a53d9-181a-4922-a003-40ce76761b48（bc22fe3e-10ac-4de0-870a-b1e6bb125b06）。218/310/read8415；总1534，明确1h315，core普通创建1219；费用0.0173700。

三次客户端tools与最终上游tools全对象hash一致9e6cd056808ab9f14f1c55a806adf95e1f0eebcc63dc2ffe1f94989e6f0c898e；mcp_servers全对象相同，无authorization_token、无pinned tools。首响应listing hash d02e326766435eb2072b0d9747089a3fa8523355baa77a752f490ed8914bac10与artifact完全一致；续/回退在最终wire message2/block0保留同对象，首请求没有伪造历史listing。公开各1search+1MCP成功和顺序配对由artifact验证。没有生产冷重启或多服务器验收。

### TTL 新观察，不掩盖计费不确定性

每个原provider SSE恰message_start和末message_delta两组usage。start明确创建总=1h分别1376/1534/315且5m=0；末delta累计总分别2595/2753/1534，但没有任何cache_creation分桶字段。公开JSON准确保留start分桶并更新累计总，未丢弃上游末分桶（上游根本没发）。三个差额都是1219，其TTL不能由原response证明为5m或1h。

Core现有usagerules.Tokens把total-1h放CacheCreation普通桶，源码注释将其视为5m。本次实际公式p*4+c*20+cr*0.2+cc*5+cc1h*8，每百万计价，首账ledger1354中cc1219收费0.006095；其余已知项相加与总账一致。没有重复请求/双加总量迹象，但“公式算术正确”不等于1219的TTL来源已确定。现有账单保留，不自动改历史。新请求的语义整改设计见 CACHE-TTL-EVIDENCE-DESIGN.md。

## Forced mixed 三次

全部account22、200/success、attempts1、billed；每请求1provider，没有实际hidden helper回合。

- first RID539701b2cbb4fd3a94254ca8，18:00:41.056Z。Worker目录1d36a58c-638a-4956-8313-695089cb6715（a42f1f9c-80f1-43b0-840a-6d8f208f945b）。33/24/1h1360，费用0.008619，tool_use。
- continuation RID0f2fd3953b86831bd4be94a2，18:00:46.963Z。目录b54d992d-6921-4f78-8fbc-6719920bfc7f（be0ce5ac-7b18-42d5-8f86-1e64fab53a51）。1/14/1h1880，费用0.011493，end_turn。
- rollback RID5aa011e30e6474366373dd28，18:00:52.048Z。目录a59e177b-21a3-4dc7-bc32-6eacf1a1ecbf（0503d356-c30d-4402-bd86-55d12602047d）。1/14/1h1880，费用0.011493，end_turn。

三个客户端原目录全对象hash均2c87dc028f828b4e2be0f1369b38e55ac23308b6b074e13cbc0049635839c11f，与artifact一致，defer_loading依次false/true。首请求最终wire仅两原客户工具，除精确mcp__ccgateway__名称映射外所有定义/字段完整相等；named目标与disable_parallel_tool_use:true原样映射，没有ToolSearch/placeholder。后两请求tool_choice:auto，最终目录是正常ToolSearch+DeferredToolPlaceholder+eager目标，未发现deferred工具无需提前展开，因此不是首轮“仅原两工具”的相同条件；实际未调用helper，不将允许helper误报为执行helper。

Sonnet当前公式p*3+c*15+cr*0.1+cc*3.75+cc1h*6；首ledger1363各项与总0.008619相符。本组三次总创建均等于明确1h，未出现dynamic差额。

部署文档已冻结；这些是新验收记录，不覆盖旧失败。真实匿名动态MCP和明确eager目标mixed子集通过，不外推多服务器、未知引用、强制未发现目标或模型通用资格。
