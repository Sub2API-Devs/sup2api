# Worker 0.1.77

精确候选 `86c8dfe2a7dc59f6f9aefe02980eabc502afc0d1`，服务器 Git fetch 后 clean detached worktree `/root/ccgateway-features-86c8dfe2a`，制品 `/opt/ccgateway-runtime/feature-validation-86c8dfe2a`。没有上传源码。

预检可用磁盘8.4GiB，`.77` 镜像标签不存在；保留 .76 镜像、程序备份和账号容器。Go1.27-bookworm 禁网2CPU/2GiB、GOMAXPROCS2，复用编译缓存，不复用测试结果。

当前仅构建/验证，未替换或重启21/22。Core .73 / Plugin .13 / Controller .48 不变；无 profile、auth status、真实模型请求。实际 OAuth Core ABC SSE 门禁完成且根代理放行后才可更新账号。

Linux engine race32.678s、engine vet、contracts/worker test及worker vet通过。standalone SHA256 `159630448186b49cde2d58cd503a7002a30cf774f80efede1e0980e2dd0d4c3f`。

禁网 Linux 真实 CLI 定向76.368s通过，包含旧helper尾预算、多delta、工具结果session_context往返及新阶段钩子否例。旧helper矩阵没有OAuth身份，不能将该结果冒称新的OAuth托管组合证明。新的完整组合证据由独立Core ABC提供：clean旧cb38 Worker真实RED38.463s，候选dummyOAuth/profile+真实CLI+PG的JSON131.355s/SSE128.441s通过，覆盖原TAB/唯一可信后缀/隐藏哈希/cold/rollback和精确账务。

新镜像 `ccgateway-worker:0.1.77` ID `sha256:1d87020910431b97f596b57b2a6502b639ddf16f5fd66c80e8fb19c8dbbcb09a`，OCI revision正确。镜像程序SHA256 `a6099eba9bb51390da521171568bce099290fe848d581295aa5b9f822bc7f00d`，与standalone按各自构建参数分别记录。禁网fixture默认8787 health/features200，Version/fullSHA、modified=false、catalog.16、schema1、CLI292全核；fixture已移除。剩余空间8.1GiB，旧资源保留，等待根代理放行账号更新。

## 放行后原地更新完成

根代理确认OAuth JSON/SSE门禁后明确放行。#22通过后才更新#21；每个账号两次确认无活动CLI，旧.76程序SHA `fec43652f1d4393a3c1e47f3ea204202f5fd9a0f51c0a8b5ba4c709b01e753c6`核实并唯一备份，新临时程序SHA核实后原子替换，各重启一次。

新程序双方为 `159630448186b49cde2d58cd503a7002a30cf774f80efede1e0980e2dd0d4c3f`。#22 ID仍`9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`；#21 ID仍`6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`。双方 imageRef仍`ccgateway:0.1.56`，完整before/after的imageID/user/mount/path/args/labels逐字相同，凭据文件字节和本地账号身份摘要保持，无Plugin override。

两账号health/features为精确.77/fullSHA/catalog.16，new local_snapshot credential_present=true且online_verified=false；#22 OAuth access未过期，#21 API key存在。最终无活动CLI；没有auth status、profile、模型、锁操作或核心/插件/控制器修改。

唯一私有备份与证据位于 `/opt/ccgateway-runtime/manual-backups/20261008-86c8dfe2a-22`、同前缀`-21`。各目录`ccgateway`是已核旧.76回滚程序，`container-before/after.json`、`credential-before/after.json`、`verification.json`、`final-verification.json`保存完整比较事实。必要时先确认无活动CLI，校验备份哈希，按相同临时文件原子替换流程恢复原容器；未执行回滚。

完成信号已发root/API代理。未来默认镜像与控制器刷新由API代理另行处理，本代理不并行操作。

根代理独立SSH核验两原ID、imageRef.56、running和双方159630448…程序哈希；API报告default.77稳定后，本代理再次只读比较两原容器ID/imageID/imageRef/user/mount/path/args/labels与部署after快照逐字相同，running=true、程序完整哈希仍一致。制品目录`post-controller-21/22-container.json`及`post-controller-21/22-verification.json`保存证据，没有身份或模型请求。公网验收由根代理独占。
