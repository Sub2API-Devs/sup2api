# Eager any 与预算门禁纠正独立复核

2026-10-08，目标 D:/projects/golang/sup2api，9ba4之后未提交候选/catalog.11。复核者非本次any和预算改动作者；曾参与旧named基础，不将旧基础冒充重新全量独审。未提交/部署/真实provider调用。

## 结论

本次范围通过，未发现阻断业务缺陷。any只在全目录普通客户端工具显式defer_loading:false、无server/typed/MCP/inline/safeguards/format的既有资格范围开放；保留原any和parallel字段，不替换auto。最终目录只客户工具，排除内部helper；CLI whitelist、Mod环境与maxturn1共同禁止内部搜索执行。客户端本身声明的同名ToolSearch优先按客户身份保留，不被当helper删除。

最终目录验证缺失/重复/未知项和schema/deferral改变拒绝；并行参数省略、false、true都保留。缓存恢复在目录验证之后按既有plan执行，作者真实CLI用例同时检查description/1h marker。未知CLI身份仍经原native验证，不额外扩大。

task_budget业务只有拒绝错误文本变化，门禁未打开。合法total64000替换旧10000测试值，避免最小值先拒造成假阳性。12个首轮/工具结果/普通续聊×remaining缺省/null/0/正数均命中隐藏历史持久恢复缺失；未来方案与实现明确分开。官方完整history无需递减remaining，不能从累计inputusage推算预算；本次未实现持久账本，不据单HTTP ledger宣称支持。

## 独立新增与运行

新增 forced_any_independent_review_test.go：
- 客户声明原生同名ToolSearch不得被删、不得当内部history。
- any三个parallel状态精确保留，单轮/Mod禁helper。
- 空目录、schema改变、defertrue、重复helper均拒绝。

`go test ./engine -run 'TestReviewForcedAny|TestTaskBudget|TestRealCLIForced(EagerAny|Loaded)' -count=1`：PASS16.088s，实际CLI2.1.292接隔离假上游，named9+any10共19请求，含JSON/SSE、新建/续聊/分支/cold、恶意helper和provider400原样不重试。不是Opus5.5模型资格证明；真实模型不支持forced时保持上游错误。

`go vet ./engine` PASS。catalog F-TOOL-SEARCH旧句只提指定目标，与新F-TOOL-CHOICE不一致，已窄修为全部显式eager的any或指定目标，并保持partial。修改后features测试PASS1.179s。第一次目录编辑命令cwd错误未写文件，其后旧目录测试成功不计作新修改验证；已修路径并重新验证。

本批不涉及预算持久产品、general deferred forced、多模型fallback或MCP新组合。尚未发布catalog.11，不能将本次隔离证据写为线上已验收。
