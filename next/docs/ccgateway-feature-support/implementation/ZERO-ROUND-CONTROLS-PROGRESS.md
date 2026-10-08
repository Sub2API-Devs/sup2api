# 零隐藏轮次预算与完成历史safeguards候选

2026-10-08；基于e463之后的独立候选，未提交部署，未发真实provider请求。

## 两个先红问题与最小修复

- 完成direct历史已保原名，但safeguards仍检查通用wireName，真实无改名时也拒绝。红例报unchanged historical tool names:bash；现比较实际wireMessage对应历史身份。当前工具schema/名称核对、内部/search/server等门禁不变；不改opaque safeguards内容。
- 全显式eager forced named/any证明零helper、maxturn1，却被task_budget开关条件一概拒绝。红例准确命中旧history gate；现仅复用forcedLoadedClientCatalog资格豁免，不放general/deferred/internal预算。预算对象原值保留，不按usage扣remaining。

## 配置切换红灯与实际缓存隔离

最初将稳定tag放configKey，单测字符串不同但真实auto→budget请求仍prefix-hit。检查发现configKey没有生产调用，真正索引使用toolHistoryNamespace。此处也揭示e463 completed历史旧tag无效。现删除无效configKey新增tag，在实际namespace追加completed-client-history-v1与符合本窄预算的zero-helper-task-budget-v1。不混callID/增长内容/预算数额，精确原Messages fingerprints继续验证历史。

auto旧native与新forcedbudget测试必须rebuild；完成历史显式种入可读旧namespace snapshot后，prepareHistory新路径必须rebuild。普通同策略续聊仍可prefix-hit。旧snapshot可自然过期，未删除用户历史。

该预算路径仅按客户端提供的完整公开history，与原toolSearch=false预算合同一致。不声称恢复此前未暴露helper，也不修正remaining弥补猜测内容。此前general预算+internal从未开放；要完整支持它仍需独立持久隐藏历史合同。

## 作者验证

先红：两个资格例均准确失败；auto→budget真实CLI4组合均出现prefix-hit，保留作为隔离遗漏证据。旧safeguards removed-native拒绝测试同步新原名保真成功，schema-changed仍拒。

整改后真实CLI2.1.292假上游：零轮次controls28请求（safeguards/named/any × JSON/SSE × 新续cold回退，预算每组先auto旧namespace配置切换）；与completed历史19请求联合PASS37.101s。逐主请求预算对象（remaining省略/null/0/正数）、safeguards、旧历史名、当前目录与单次调用精确；配置切换明确rebuild。

全engine普通测试PASS4.310s、vet通过；追加prepareHistory旧索引独立例与目标PASS1.421s。真实CLI不证明Opus5.5 forced资格，真实错误应上游原样返回。候选待非作者独审；线上e463不包含本候选。

文件：safeguards.go/task_budget.go/tool_names.go窄修，request.go移除无效新增tag；safeguards_test/completed_client_history_test更新真实namespace与新行为；新zero_round_controls_test.go、zero_round_controls_cli_test.go。configKey旧函数本轮不做无关删除，明确它不是历史索引保证。
