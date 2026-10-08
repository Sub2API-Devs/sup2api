# 已完成客户端历史原值保真：最小实施计划

仅完成且已配对的direct/无caller客户端工具历史，本次目录没有该身份时保存callID与原块指纹。集合仅传输，不注册SDK/CLI工具，也不授予当前响应执行权。当前tools有定义的继续原映射；inline旧定义继续时间线；server/PTC/MCP自身调用与搜索引用不在窄范围；当前存在这些目录不改变已完成direct历史身份。

编译在conversation配对校验之后，wireMessage只对集合中精确原call跳过名称映射，不改通用wireName。原typed固定名gate允许这个已证明历史；大整数、role/name/input/id/result原值和toolset字段复用现完整对齐。ToolSearch同名历史不得被当内部helper消费。包含该历史的cache兼容键加版本标记，避免复用旧改名native快照。

文件：新completed_client_history.go/tests/CLItests，request.go窄字段/hook/wire/configkey，client_tools.go历史gate条件，history_alignment.go同名helper隔离。无源码部署/提交。完整测试后交非作者独审，真实资格通过平台正常Worker链路，若上游不接受原400返回，不编造schema兜底。

## 本轮落地与作者验证（待独审/发布）

已新增completed_client_history.go。顺序/唯一ID/全部结果配对沿用validateConversation先验证，之后只保存已完成原block指纹。私有集合不包含schema、不加入当前Tools；wireMessage仅对原block精确匹配不改名。显式direct仅允许原协议type字段，带server父ID拒绝。inline有已有定义走原时间线；完成的direct历史可与当前server/MCP目录共存；其本身不进入search引用目录，真正未声明引用仍由原ledger拒绝。

生产窄接线：request.go私有字段/编译hook/精确history映射条件/configKey稳定tag；client_tools.go旧typed名硬拒增加已完成历史例外；history_alignment.go阻止已完成客户端同名ToolSearch历史误当内部回合。configKey仅加completed-client-history-v1，不混增长ID或内容摘要；原messages fingerprints负责精确块。既有旧typed拒绝测试改为断言原名保留且无注册，不删除测试目的。

测试：
- 真实CLI2.1.292假上游，retired_fixture/bash × JSON/SSE × 新/续/cold/分支16请求，另恶意新bash响应1请求，17次PASS13.880s。最终wire原name/id/input含9007199254740993不变，tools空；当前模型新未知调用502，只有一次主请求。连续显式断言prefix-hit。
- 单测覆盖缺result、重复ID、错resultID、错顺序，完整call指纹、同名ToolSearch非内部、当前工具仍正常映射、增长history不改configkey、旧snapshot隔离、prefix设置改变/NoTools不改变旧身份、显式direct/toolset原值与父ID偷渡拒绝。追加目标PASS3.048s。
- 全engine普通测试PASS6.451s，vet通过。旧原测试按历史本应拒绝的断言首轮失败，已替换为新保真与不授权断言。没有部署或真实provider资格请求。

本机rawCLI探针与本实现整链证据分开；远端rawsetup没有得到provider结论，因此后续从正常平台Worker路径最小验收。若提供商不接受，保持真实400，不新增虚构typed定义、删除历史或替换工具名。

## 独审整改与再次冻结

research_api独审两个混合web/MCP红例证明原全局gate过宽，已删除，仅保持真实引用/PTC/server独立ledger。root与API又定位protocol cache_control令原指纹与剥cache后wire块不一致，历史被错误改名；现身份两端统一既有withoutProtocolCache规范化，仅去协议cache，input内部同名业务字段仍精确。API独立opaque input.cache_control篡改负例通过。

真实CLI新集合19请求PASS17.716s：原16新续coldbranch矩阵全部增加历史tool_use 1h marker位置/TTL精确保真及prefixhit；恶意新调用1；新mixed Web/MCP各1。全engine4.331s/vet通过。以上为作者整改后结果，待独审复跑新增目标。无真实provider调用或部署。
