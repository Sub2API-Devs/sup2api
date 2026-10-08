# Web 验收脚本与 fallback compaction 探针简审

2026-10-08，独立只读/脚本窄修，无真实网络请求，无业务变更。已有真实验收 JSON 未修改。

public_web_smoke 原成功条件只数正常配对，可能容许额外错误结果，并会把空 call ID / result ID 当匹配。现要求合法 assistant message、恰一个 server call 和一个对应类型结果、非空 ID 精确配对、正常 search 全结果/fetch 结果、无额外 client tool/refusal/error、end_turn 及非空引用文本。失败以 exit1 返回，HTTP200 refusal 保留协议事实而不标任务完成。

合成两个正常search/fetch路径与每种六个否例（refusal、错配、空ID、额外error、重复result、is_error）全部通过。未拿新校验伪称已重新执行两次真实请求；root原证据保持原样。

fallback_compaction_probe_test.go 与 FALLBACK-COMPACTION-ATTRIBUTION-PLAN.md 范围准确：请求本身没有开启compaction，不绕准入；合成无模型compaction记录穿CLI的JSON/SSE，比较完整iterations，只证明传输不丢字段。不证明提供商实际排列、model/attempt归属，也不证明准确费用。未重复探针运行，作者3.200s证据仍标作者结果。方案没有把未来归属parser写成已实现，没有开放组合。
