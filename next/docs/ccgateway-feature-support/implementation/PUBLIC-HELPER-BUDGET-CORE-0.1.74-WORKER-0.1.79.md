# 普通与 inline 预算：八次公网独立佐证

2026-10-09北京时间。root独占执行两组各4次公开请求，均HTTP200并精确完成测试marker。此文件只读关联数据库/Worker事实，不修改原public脚本中的 `internal_rounds_verified:false` / `durable_receipts_verified:false`：这些标志反映脚本自身未读取内部证据，独立证明由本文提供。

公开证据：`evidence/public-helper-budget-core-0.1.74-worker-0.1.79.json`、`evidence/public-helper-budget-inline-core-0.1.74-worker-0.1.79.json`。Core .74 / Worker .79 / Plugin .13 / Controller .48；没有额外模型重试。

## 普通四请求

通过各request_id的SHA256精确匹配公开artifact。依次为：

- `e08ccb6f49a33b51f754337c`，UTC17:02:26，tool_use；input48/output154/cacheRead2528/cache1h1037，billed0.0120736。
- `868ece60186a9dc917bf198e`，UTC17:02:41，end_turn；2/20/read883/1h1572，billed0.0131606。
- `20097685c16104678cb1575d`，UTC17:02:52，普通无task_budget SSE/end_turn；2/71/read883/1h1589，billed0.0143166。
- `213dc945cf2b9ad9674437bb`，UTC17:03:05，回退/end_turn；2/21/read1743/1h713，billed0.0064806。

四次均account22、attempts1、success=true、error空。helper attempts依次 `6ad4eedafe3ceaa5bc98d7646cd6b4388683bdd5638483d2`、`9d7747a0e2873a9aeb46a83d0d120cf73473c46219119f64`、`d86f713d30daea227efe0ba394ab92fd41975090868cc91f`、`d4b6054214cb925ef1c7eb36b2737cda197fed4acf42ac0f`，全部committed。parent为首→次→第三，第四精确分叉回首。每次1 history record、1 usage receipt、0 outbox。

Worker日志依次 `72d028ef-03d5-4c70-944f-68f0f6dffc37`、`a740c712-222e-4a51-bdac-942d7738418e`、`a3a0bbe9-e890-4ea4-8f5a-f1c4fe515f0f`、`36aeee2f-e1d3-4791-bf35-941a162388be`，provider调用数2/1/1/1。首外部tool ID摘要与公开artifact相同，后续历史同ID。完整隐藏ToolSearch assistant/user pair的canonical SHA256全轮一致 `ef7379ed0ed26990dae820d4a2769e5a46e582291916e0d9be6329ca71422d56`；其紧后system对象全轮一致 `e7088f7cd3c1a760eeaa9c8cc327ec38fbb76a7a9617827f9d20c5dc66b193c7`，未输出内容。每次历史引用均有完整工具定义，定义hash `9a0e82a0b511d82e976f6ef21205feb67573af65189608e65484e5dffa0a6870` 一致。

第三公共response.body真实thinking progress为 `[50,null]`，仍HTTP200/end_turn并成功committed；计费output71来自usage，不是显示估计50。首两/回退公共响应没有这些thinking progress帧，不虚称每轮都有。

## Inline四请求

公开SHA精确匹配RID：

- `e6462aa14839e664917fd7a9`，UTC17:05:27，tool_use；828/154/read1766/1h1055，billed0.0151852。
- `7de9a86b900bc1cc224ac866`，UTC17:05:41，end_turn；752/20/read883/1h878，billed0.0106086。
- `fbdd6fa1f5d25cc23a203127`，UTC17:05:52，普通SSE/end_turn；2/20/read883/1h1622，billed0.0135606。
- `5a8738c0ece169448ecec703`，UTC17:06:03，回退/end_turn；2/21/read1761/1h730，billed0.0066202。

同样均account22/attempt1/success、committed，每次1 history record/1 receipt/0 outbox。attempt依次 `817b50bf4f430d5fb93a34d3cde0d44aa5256e21c3f1a9a5`、`70912e9454be14c527847cff449d3d1c93a510e6611ff8ff`、`39a9b2f1e93ff68e8624fb95612b30971f16cc4da9db8b95`、`dd9f9ac1edb86099aceb42a500dfd39686903259a173cf80`。parent首→次→第三，第四精确回首。

Worker依次 `45861096-1443-4173-9053-f6179067d663`、`b010b4a8-d77b-49b2-9a8b-ba59894a21ec`、`2f136fa8-79f4-4b90-abee-cea1e7ab25d2`、`b0df68b2-67ac-4be5-bd60-e1baed45f78f`，provider调用数2/1/1/1。首tool ID摘要与该组公开artifact精确一致；隐藏pair hash `b3573ab2b7ab53ba00ce2dfb412bb837499eb7336c5b8f00317cca4394f40d1a`、紧后system hash `2ca2d32d80be1f245fede70e93a493eec3c681b91102d97ee00be2a18fbb91c6` 均完整跨轮保持。

逐message重放目录验证：spare_fixture addition保留在位置2，完整对象hash `f3e0158e241da1436979078e6eca7989c49530277845197a4b0d817fcb606832`；第二/第三lookup_fixture removal保留，hash `bab4dfcadfcae22aee24f885612aa82f00d209c3cecb17a257450b18b392d958`，有效目录最终不含lookup。历史tool_reference出现在撤回之前，按其真实位置仍合法；第四回退没有撤回directive，工具重新处于该历史位置的可用目录。没有因顶层历史定义仍存在就宣称撤回失效。inline第三没有thinking progress帧，未用它替代普通组的50/null证据。

## 边界

两组各4次均实际成功；内部两轮、隐藏历史与目录/系统对象保持、单一账务收据由独立只读证据佐证。本轮没有强制重启Worker、切换账号或跨账号冷迁移；不能把之前隔离cold测试说成本次生产冷迁移实测。没有提供商账单对账或缓存省费承诺。没有输出原提示词、签名、工具结果正文或凭据。
