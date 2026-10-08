# Worker .77 公网预算续聊验收

Core .73 / Plugin .13 / Controller .48保持；Worker .77精确源 `86c8dfe2a7dc59f6f9aefe02980eabc502afc0d1`。原21/22容器/卷/授权保留，root独立核双方程序159630448186b49cde2d58cd503a7002a30cf774f80efede1e0980e2dd0d4c3f。正常默认镜像更新后容器完整Config不变。

使用用户授权平台API、claude-opus-5-5，无路由覆盖。首错即停，执行2请求后未再发普通SSE/rollback/inline。证据 `evidence/public-helper-budget-core-0.1.73-worker-0.1.77.json`。

- 首RID `132411e65e2579f4c43b1baf`，2026-10-08T15:35:35.176536Z/node1/account22，200/tool_use、14.978秒、attempt1。input48/output154/cacheRead2528/cache1h1037，billed0.01207360；历史committed、records1、receipt1/outbox0。Worker首记录 `288782ca` 前缀有2真实provider轮。
- 续RID `f1f2d40c074d58e5d56afab2`，15:35:50.176707Z同账号22，真实提供商400，11.105秒、attempt1。Worker `5db87bca-bdd5-4166-9a41-ec614e77b718` 有实际request/response，原错 `Tool reference mcp__ccgateway__lookup_fixture not found in available tools`。账本uncertain、records0、receipt1/outbox0，usage unknown/failed0cost，无已知replacement。账号active/schedulable且无cooldown，不是再次调度或OAuth故障。

本次session_context恢复已经通过：public tool/result ID保持，结果原25字节加可信后缀成为598字节，wrapper一次。出站历史为公开user、旧system、隐藏ToolSearch A/U、尾system、公开tool call/result、当前system，顺序正确。

剩余缺陷是持久历史引用已恢复，但新CLI未加载对应的deferred定义：本次tools只有DeferredToolPlaceholder和ToolSearch，首请求第二provider轮却有完整lookup定义。只恢复messages不足以使历史引用在新CLI可解析。

候选仅恢复已验证imported引用需要的原始custom定义及完整字段/精确数值，复用wireName和catalog摘要绑定；冲突/重复严格拒。原生工具不能凭空合成，inline继续原Base+位置时间线，不能复活已撤回/重加旧发现。严格fake新增缺引用定义即400，而非默许之前未校验的输入。

独立clean .77旧Worker+真实CoreHTTP/CLI/隔离PG前态39.787秒RED，fakeprovider精确报同缺目录400（CLI对外合成502，证据层次分开）；修复后同断言JSON131.127秒、SSE126.791秒GREEN，保留冷/回退、可信suffix/TAB、历史hash、124/131/1h1647及5usage/5receipt唯一。作者真实CLI12call26.130秒、独审metadata/大数/native/withdraw-readd等通过，Root目标0.318秒通过。拟仅Worker .78，尚未作为新公网验收成功。
