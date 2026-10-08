# Helper history + session context independent review

候选未提交/部署。线上Core.73/Worker.76第一预算请求200，第二tool_result续聊502；Worker首因session attachment tool-result position changed。原normalize保存公开user ordinal，hidden回放插入私有user后才restore，导致旧位置不再对应公开tool_result。

## 方案审查

作者最小stage hook在applyHelperHistory全部公共alignment、segment来源/位置与replay匹配成功后、插入hidden rows前调用原strict restore闭包。既有tool_result_context的ordinal/block/ID/原始完整字符串与可信suffix检查没有放宽；count走原恢复路径，非helper同回调。恢复失败阻断出站和delta导出，不能提前恢复后被helper二次alignment再误拒。

新增独立helper_context_restore_review_test：改变公开历史不调用restore；restore返回错误时不插入private rows、exportDelta继续返回错误。PASS1.348s。

## 实际前态红例

新增Core ABC SessionContext选项：实际Worker子进程仅隔离temp配置dummyOAuth token/email/account，fake provider固定/api/oauth/profile返回合成身份；不读取本机真实凭据。tool_result原文PUBLIC_WEATHER_RESULT末尾TAB，最终至少一轮真实CLI将session_context嵌入该结果，严格prefix+TAB+wrapper/email一次。普通预算hidden tail、cold/rollback、真实PG账本强计量原样保留。

作者业务修复已落，因此旧态由Git clean detached artifacts/context-before-cb38（精确cb38d953b554bcd47ed75c9c7ddec9436a4d90d4）编译独立旧Worker，测试专用CCG_ABC_WORKER_BINARY指定该二进制。没有临时改共享实现造红。前态TestHelperHistoryABCSessionContextRealDBCLI/false真实PG RED38.463s（fixture37.40/子29.29）：第一请求成功，tool_result续聊502精确session attachment tool-result position changed，与线上一致。74958终态，隔离隧道关闭。

当前修复同夹具JSON转绿测试session56300运行中，尚无最终结论；不提前称通过，无线上请求。

同一夹具当前修复 JSON PASS131.355s（fixture130.27/子120.19），非skip，56300终态且45439已关闭。真实dummyOAuth/profile、session_context实际embedded≥1、原tool_result末TAB完整保留、每个嵌入suffix的email只一次；cold/rollback、helper尾system完整hash、5公开6provider、124input/131output/1hcache1647、5usage5receipt全部强断言通过。此处直接证明JSON CoreHTTP/Worker/CLI/PG，不将先前未触发suffix的普通fixture当本故障证明。SSE组合尚未额外运行。

最终同组SSE `TestHelperHistoryABCSessionContextRealDBCLI/true` PASS128.441s（fixture127.24/子118.10），实际CoreHTTP/Worker/CLI/隔离PG，不skip。所有原断言不变：session_context实际嵌入至少一次、完整client尾TAB、suffix email唯一、helper尾systemhash、cold/rollback、124input/131output/1h1647、5公开6provider/5usage5receipt。99247终态、45439已关闭。测试源码未变，源已由root冻结提交86c8dfe2a7dc59f6f9aefe02980eabc502afc0d1；部署仍由独立Worker.77 Linux门禁及双账号patch决定，此记录不提前声称已上线。

## Worker.77 后未来镜像配置闭环

2026-10-08，CC作者先完成精确86c8dfe2a Worker.77双账号原地patch，root授权后本代理才保存未来默认images.app=ccgateway-worker:0.1.77。镜像存在并核IDsha256:1d87020910431b97f596b57b2a6502b639ddf16f5fd66c80e8fb19c8dbbcb09a。完整public配置仅app变化、其他字段与secret-presence flags一致；PUT200、正常runtime/install200，Controller仍.48。

刷新前后cc-max私有0600 /opt/ccgateway-runtime/default-0.1.77-{before,after}.json核原21/22 Id/Image/Mounts/完整Config/Path/Args完全一致，没有重建或改授权。Core仍.73、Plugin.13，没有新的四节点维护发布。仅只读#22数据库active/schedulabletrue/reason空、Redis cooldown TTL=-2不存在，未人为解锁/刷新quota/profile，未调用模型或旧auth status。配置验证事实OVH /home/debian/sup2api-managed/default-worker-0.1.77-verification.json。稳定已通知root独占bounded公网验收，本文不替代其结果。

## Worker.77 公网复验：首轮200，续聊真实400

root唯一bounded复验两请求后停止：首SHA63288576cf0572d8cbf49a80565ad951108d22735c4c60b3888f8f01c32fe8e8精确RID132411e65e2579f4c43b1baf，15:35:35.176536Z/node1/account22，200/attempt1；48input/154output/cacheRead2528/cache1h1037，standard/not_available，billed0.01207360，与公开值一致。helper2d3a8d1a44314cb16396038d76df95653d63f569b2662d5b committed，historyrecord1/usage receipt1/outbox0。

续SHAed8492e515b7a385c733923288eb32c703d642b529bb6876155ebbf2cd4d1354对应RIDf1f2d40c074d58e5d56afab2，15:35:50.176707Z/node1/account22，400/attempt1，upstream_error、upstream returned HTTP 400。helper0c8b9af70684ae5f3810f70a521a3726250944ffebaf48b7 uncertain，historyrecord0/usage receipt1/outbox0；账务failed/cost0，helper response usage is unknown，无replacement已知用量。账号仍active/schedulabletrue、cooldown key不存在，非调度503。已交CC只读取本次真实上游400，未沿用旧position error、未改产品、未额外模型/身份/额度请求。
