# Core 0.1.72 / Plugin 0.1.13 部署记录

2026-10-08，Git精确2bd328b46b18415ff209ecfaa39e71f27c17407c。根代理确认Linux/Core/V2独审与Worker.75原生OAuth刷新profile200后，授权仅本平台sup2api-1..4正常升级。详细门禁/签名/备份见CORE-0.1.72-VALIDATION-PREPARATION.md。

## 发布和实际状态

重新preflight HTTP200、blockers=[]，正常创建计划1a13b5368dee94bf85a4d1a5204d5609（HTTP202），最终completed|27。没有额外重启/故障注入。四节点实际current binary version均0.1.72、SHA256 ec817c52e21adc09db665f92ce45766d9d7805ad9ca11063bb825ad15340bacf；local/ready=true、stopped=false，release=8eeb83269a7732b35a6baa2dc12db7489e055a78f0115abf265445c638fd8111。

CCGateway active/desired均0.1.13、enabled，installed package SHA 1fc462a95937f6523e3b0224101cc9b9659eeec7ff432f8eef71d5f380b37ac1。四节点逐一读取/proc实际插件exe均0.1.13-1fc462a9路径，binary SHA均1e5a7cd7726860f59e01663be42154157da4585b71ce630d43b1e9d74277a315，与签名候选一致；旧immutable .12包保留。候选catalog.16，schema前后均e8ec13814e64ced829fe95d94c719afe902eed9d7b50370634d5d129ec321138。

## 维护窗口

观察日志/home/debian/sup2api-managed/upgrade-20261008T134407.log。匿名key/prices仅出现正常401和维护503；相对起点各节点503区间：1为22.30–58.30s，2为22.30–58.71s，3为22.30–60.60s，4为22.30–59.97s。总观测跨度38.30s，不宣称零中断。旧观察脚本的进程容器名映射仍是历史compose前缀，因此不使用其proc字段证明活进程；本文实际进程与hash由部署后独立/proc读取验证。

## 默认镜像与账号保护

读取完整public remote-config，仅修改images.app为ccgateway-worker:0.1.75；其他全部public设置、secret-presence flags相同，controller仍ccg-controller:0.1.48。PUT200、正常runtime/install200。刷新前后cc-max两个原账号的Id/Image/Mounts/完整Config/Path/Args逐项相同，私有0600快照/opt/ccgateway-runtime/default-0.1.75-{before,after}.json。不重建账号、不换既有imageRef、不清授权、不搬卷。新默认仅影响未来容器。

## 认证与额度复验

没有调用claude auth status或旧admin/status，没有重复profile，没有模型请求。Worker.75原生自动刷新profile200来自CC作者独占操作。全部稳定后按授权仅一次正常GET /accounts/22/quota（无force），HTTP200、source=active、error为空、旧token_expired消失，updated_at=2026-10-08T13:47:50.71088Z、2个额度窗口。未输出额度正文、身份原ID或令牌。这不是模型资格验证；公网推理由root独占后续验收。

本批备份/home/debian/sup2api-managed/backups/core-0.1.72-20261008T134119Z/database.dump，0600/20682267bytes且pg_restore目录校验通过。旧.71制品/备份保留；schema未变仍需正常rollback/preflight，不能自行覆盖运行程序或回灌DB。当前Git工作树clean，全部稳定已通知root与CC独立只读复核。

## 首次公开预算验收失败（部署后，未重试）

root唯一一次public_helper_budget.py首请求HTTP502、12.705s后停止，证据public-helper-budget-core-0.1.72.json。按request_id SHA256 72296893f0a03d6a3f676f25d7356c15495102622dc5fabdb6a108db7b8fa010精确匹配核心RID890a39010a218c9e7fbc1dbc，2026-10-08T13:49:44.012734Z、node1/account22/claude-opus-5-5、attempts1，error_type upstream_error，安全message upstream server error (502)。

本次已进入托管：provider_helper_attempts ID44eb2274ed22c02dbbbbe3e280bef27d19e4be832444f622于13:49:48.600622Z创建，state=uncertain、usage_digest存在；history records0、outbox0、usage receipt1。并非之前controller404或identity失败的0Reserve阶段。账务初读pending，后续已failed、cost0，冻结billing_detail.inputs.billing_error明确helper response usage is incomplete；tokens/cache暂0、metrics{}不能称完整真实零用量/免费成功。用量未知被阻止计费，未重发、未重复登记。Worker真实出站/错误首因由CC只读关联中，暂不猜测。没有为调查额外发模型、身份或配置请求。

Worker关联后追加：首provider完整200/message_stop消耗并未丢失。只读核billing_detail.inputs.replacement一项：Model claude-opus-5-5，Input24、Output91、CacheRead0、CacheCreation0、CacheCreation1h1647，Metrics service_tier=standard/inference_geo=not_available，与CC原始provider事实完全一致。整体仍因后续结果不完整而failed，不能用主row零tokens推断无消耗；本次无第二provider重试。CC定位第二helper轮新尾system预算提醒被拒，修复候选另行审查，未直接修改运行态。
