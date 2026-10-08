# Core 0.1.73 / Worker 0.1.76 部署记录

精确Git cb38d953b554bcd47ed75c9c7ddec9436a4d90d4。Root确认独立JSON/SSE实际CoreHTTP/Worker/CLI+隔离PG门禁与Worker.76双账号原地部署后放行。仅本平台sup2api-1..4，无模型/身份/额度请求。候选构建/备份见CORE-0.1.73-VALIDATION-PREPARATION.md。

## 发布事实

重新preflight200/blockers=[]，正常计划1e20f8ee140d44ec3790a1a64707ad4d创建202、最终completed|27。四节点current version0.1.73，Core hash7b15e3e79ddcf7db3a7cfa63b426e57d5b0eb2168f542d90296a503cf100ecb1；节点local/ready=true、stopped=false、release04dd3605a2e84460f43cc355b838ea8b080c07ce47003dc1fad2a251ecbcbfc3。

Plugin保持0.1.13，active/desired均.13/enabled；四实际/proc插件路径都是0.1.13-1fc462a9、binary1e5a7cd7726860f59e01663be42154157da4585b71ce630d43b1e9d74277a315，与原已发制品逐字相同。没有覆写同版本包或无依据增.14。schema候选前后e8ec13814e64ced829fe95d94c719afe902eed9d7b50370634d5d129ec321138未变。

观察/home/debian/sup2api-managed/upgrade-20261008T144734.log仅正常匿名401/维护503；节点1 22.10–58.19s、2 22.10–58.80s、3 22.11–60.37s、4 22.11–60.05s，总观测38.27s，不宣称零中断。历史观察脚本proc容器名字段不用于验活，实际进程单独读取/proc确认。

## 未来默认镜像与账号保留

正常完整public配置读改，仅images.app设ccgateway-worker:0.1.76，其他public字段及secret flags逐项相同；Controller仍ccg-controller:0.1.48，egress/network/policy/SSH均不变。PUT200、runtime/install200。cc-max私有0600快照/opt/ccgateway-runtime/default-0.1.76-{before,after}.json核21/22 Id/Image/Mounts/完整Config/Path/Args完全相同。既有账号不重建、不换imageRef、不搬卷/清凭据。

## 发布后调度只读核对

账号22数据库status=active、schedulable=true、status_reason空、未删除；Redis cooldown:account:22 TTL=-2/key不存在。此前helper502冷却已自然失效，没有人为解锁或改Key/账号设置。未force刷新quota/profile，未调用旧auth status或模型。全部稳定后通知root独占公开验收。

备份/home/debian/sup2api-managed/backups/core-0.1.73-20261008T144419Z/database.dump，0600/21100564bytes、pg_restore目录验证；旧Core.72/Plugin.13制品与前备份保留。回滚仍应正常updater preflight/rollback，不直接覆盖程序或回灌DB。本文只证明部署稳定，真实预算功能成功由后续公网验收独立决定。

## 公网预算首轮成功、工具结果续聊失败

root独占public_helper_budget首轮200/tool_use（16.216s），第二tool_result续聊502（9.768s），立即停且未inline/自动重试。证据public-helper-budget-core-0.1.73.json。SHA0b93243883206a94382118a0ab5358115b6f076ca9dc59a3cafcaeced1fe5f8a对应RIDd49b8d1f80551caeeef1c640，14:51:08.287601Z/node1/account22/attempt1；核心已billed0.01896920，48input/154output/cacheRead1646/cacheCreation1h1921，service_tier standard、inference_geo not_available，均与公开响应一致。helperattempt2dd10fa907454a13419da1a662359e2d77760ed1ce3c5519 committed，historyrecord1、usage receipt1、outbox0。

续聊SHA61a093bbe331b8e70486b3b586e12eb9fbb971b25472517f5e32beaf1d4b72cc对应RID58765193bd96b5f10af0e6b1，14:51:24.460129Z/node1/account22/attempt1、502upstream_error。helperattempt8363abd3b234e4ba18b646605a569b4fdc1c579c5f5bb0dc于14:51:28.042998Z创建，uncertain、historyrecord0、usage receipt1、outbox0；parent_receipt精确绑定第一请求的已存receipt（原payload2405bytes），没有跨账号或unknown链降级。

第二账务failed/cost0，原因helper response usage is unknown，无replacement已知用量项；不能把外层0tokens声称完整无消耗，待Worker事实。首轮真实成功与第二失败分别保留，不宣称连续预算验收完整。只读定位结果已交CC，不额外模型/身份/额度请求，不修改运行态。
