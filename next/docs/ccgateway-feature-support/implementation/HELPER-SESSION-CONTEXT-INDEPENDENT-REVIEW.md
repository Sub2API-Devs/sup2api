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
