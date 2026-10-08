# Worker 0.1.79

精确候选 `7d322abd9cf8579fe229aa74f50ee654c1d1e2d4`。cc-max仅Git fetch创建clean detached worktree `/root/ccgateway-features-7d322abd9`，制品 `/opt/ccgateway-runtime/feature-validation-7d322abd9`；没有上传源码。

预检`.79`标签未占用，磁盘7.7GiB；原21/22仍`.78`，ID/imageRef.56/程序哈希及备份已只读核实。旧镜像和备份不清理。Linux验证使用Go1.27-bookworm、禁网2CPU/2GiB/GOMAXPROCS2，复用编译缓存，不复用测试结果。

构建阶段未部署账号；随后收到root明确放行，按下述流程完成更新。全过程未调用CLI auth status、在线profile或真实模型。Core .74由API代理独立负责。

Linux engine race33.278s、contracts race、engine/contracts/worker vet和worker test通过。standalone Version0.1.79/fullSHA哈希 `0c44e181c3e60257e3f0668144139dc471529f859148f6f1aa8136b56e897231`。

新增隐藏ThinkingEstimates JSON/SSE、严格目录与旧context真实CLI定向91.945s通过，均禁网假上游，不是线上推理。新image `ccgateway-worker:0.1.79` ID `sha256:c7282386bab45314d7ae432c220bd3e3f87b1f82303a9d246cefa63576770704`；image程序SHA256 `0d7f93d96ba280190f6443904ead43ec934cedaf853a7b6261a214b56df81330`，与standalone分别记录。OCI revision正确；禁网默认8787 health/features200、Version/fullSHA/modified=false/catalog.16/schema[1]/payload[1,2]/CLI2.1.292全部核验。fixture已移除，磁盘剩余7.4GiB。

## 原容器更新结果

获放行后按 #22→#21 执行，更新前及原子替换前分别确认没有活动CLI；每个账号仅重启一次，前一账号完整验证通过后才更新下一账号。旧 `.78` 程序SHA256均为 `5cedb9dda30c222cd5861a2e8238af1446cf312332d723d91b0b420de4d24127`；临时新程序核对后原子替换，两账号最终SHA256均为 `0c44e181c3e60257e3f0668144139dc471529f859148f6f1aa8136b56e897231`。

- #22 原ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22` 保持。
- #21 原ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b` 保持。
- 两账号imageRef仍为 `ccgateway:0.1.56`；before/after记录中的ID、image、mount、labels、user、path、args完全相同，凭据文件字节摘要也相同。
- health/features均200，Version `.79`、精确revision、catalog `.16`、schema `[1]` 正确；新只读状态为 `local_snapshot`、`online_verified=false`，#22模式claude.ai、#21模式api_key。这仅证实本地凭据存在，不表示在线认证验证。

唯一备份位于 `/opt/ccgateway-runtime/manual-backups/20261009-7d322abd9-22` 和 `...-21`；各目录保存旧程序 `ccgateway`、私有容器和凭据摘要before/after以及 `final-verification.json`。需要回滚时，使用对应目录旧程序，核上述 `.78` SHA后按同样无活动CLI/临时文件/原子替换流程恢复原容器；不重建容器。

最终独立只读核验确认两账号无活动CLI、旧备份哈希正确、新程序哈希正确。没有更改OAuth、锁文件、默认镜像或Controller；已通知root和API代理双账号完成，默认配置与Controller后续由API代理单独负责。
