# Worker 0.1.78 构建与发布

北京时间2026-10-09（UTC2026-10-08）准备，精确候选 `00c5b0d19760217c1323dc706f3970f1551dfcd6`。服务器仅Git fetch创建clean detached worktree `/root/ccgateway-features-00c5b0d19`，制品 `/opt/ccgateway-runtime/feature-validation-00c5b0d19`，没有上传源码。

预检磁盘8.0GiB可用，`.78`镜像标签不存在。Go1.27-bookworm禁网、2CPU/2GiB、GOMAXPROCS2，复用编译缓存，不复用测试结果。

本阶段仅构建验证，账号仍`.77`，旧镜像/程序/备份保留。无auth status、在线profile或真实模型请求；Core .73 / Plugin .13 / Controller .48不动，账号更新等待根代理明确放行。

Linux engine race32.879s、engine vet、contracts/worker test与worker vet通过；standalone Version0.1.78/fullSHA产物哈希 `5cedb9dda30c222cd5861a2e8238af1446cf312332d723d91b0b420de4d24127`。

严格fake目录校验后的真实CLI新/续/cold/rollback、旧工具结果session_context与新目录否例定向77.721s全部通过。这是禁网假上游；实际OAuth组合另有独立CoreABC JSON131.127/SSE126.791s及旧.77RED39.787s证据。

新image `ccgateway-worker:0.1.78` ID `sha256:a74739b06449c50bc570a4f143161c5dc70e266cb9df9ec8119777d89182b648`，OCI revision精确。镜像程序hash `3d70a1de6dbaf989432bc3b68cdf0597d5ea2a645520217db159c3b2c9b9561a`，与standalone分别记录。禁网fixture默认8787 health/features200，Version/fullSHA/modified=false/catalog.16/schema[1]/payload[1,2]/CLI2.1.292全核；fixture已移除，磁盘7.7GiB可用，旧资源保留。构建门禁完成，账号仍.77，等待放行。

## 放行后实际更新

根代理明确放行后，依次#22→#21。旧.77哈希 `159630448186b49cde2d58cd503a7002a30cf774f80efede1e0980e2dd0d4c3f`核对并唯一备份；两次确认无活动CLI，临时新文件hash核对后原子替换，各重启一次。每个health/features/本地快照通过后才进行下一个。

双方新程序SHA256 `5cedb9dda30c222cd5861a2e8238af1446cf312332d723d91b0b420de4d24127`。#22原ID `9de9b219210f43379014eb2bb991bc7cb813e2ecd92a9ec0830e232e7f1c8e22`；#21原ID `6b67d1ffb6e65ffd91a07ff43b18c987e454a2ec20342e064bd33dc91543ae2b`；仍原imageRef `ccgateway:0.1.56`。before/after的imageID、mount、user、path、args、labels逐字相同，凭据字节与身份摘要保持，无Plugin override。

health/features精确.78/fullSHA/catalog.16，new local_snapshot credential_present=true/online_verified=false；#22 access未过期，#21为API key。最终无活动CLI，没有auth status、profile、模型或锁操作；Core/Plugin/Controller未改。

唯一备份及完整证据 `/opt/ccgateway-runtime/manual-backups/20261009-00c5b0d19-22`、同前缀`-21`：`ccgateway`是已核旧.77回滚程序，before/after容器和私有凭据元数据、final-verification.json均保留。需要回滚时先确认无活动CLI，核旧hash后走临时文件原子替换/原容器重启，不重建账号；未执行回滚。正式完成信号已发root/API，未来默认.78及controller正常刷新由API独占。
