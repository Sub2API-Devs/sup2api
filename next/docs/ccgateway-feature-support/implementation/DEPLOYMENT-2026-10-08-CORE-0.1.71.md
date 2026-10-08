# Core 0.1.71 / Plugin 0.1.12 部署记录

2026-10-08。精确Git候选 `428164d4756e64163710910224957744554a2011`，catalog `.15`，配套Worker `.73`。仅本平台sup2api-1..4；没有模型调用。Linux门禁/签名完整验证见 `CORE-0.1.71-VALIDATION-PREPARATION.md`。

## 备份与升级

发布前本平台 `sup2api` 数据库custom-format备份：`/home/debian/sup2api-managed/backups/core-0.1.71-20261008T114912Z/database.dump`，20258276 bytes；目录0700、dump0600，pg_restore --list验证成功。同目录四节点完整inspect私有0600、nodes-before.jsonl。首次验证命令漏docker exec -i，pg_restore收到空stdin失败；补-i后原备份验证成功，未重新覆盖dump，不是数据库备份失败。

签名manifest `f2d7d55a952db9ab6b7bcd0e00b3b34ff273bc38d54dc78f4d75b65f2c24c94e` 正常导入。重新preflight HTTP200、blockers=[]、目标准确为四节点；基于最新expected_revision创建计划 `350dc5c7884468b6fe1650fa921d1f8d`，HTTP202。既有观察脚本未传故障参数，无额外重启。计划最终 `completed|27`。

升级监控 `/home/debian/sup2api-managed/upgrade-20261008T114948.log` 每约0.1秒检查匿名key/prices：正常401、维护503，没有其它状态。相对观察起点的503窗口：节点1 22.21–58.17秒，节点2 22.22–59.53秒，节点3 22.22–59.11秒，节点4 22.22–58.17秒。总观测维护跨度约37.32秒，不宣称零中断，也不将匿名检查称为模型验收。

## 最终实际状态

四节点均Core0.1.71、local/ready=true/stopped=false、release=f2d7...。实际schema都为 `e8ec13814e64ced829fe95d94c719afe902eed9d7b50370634d5d129ec321138`，迁移由原 `df9d222590f04365c30fcaeb2ce4f9120c7c16ced7b32db751ea0205394b3ed6` 正常完成。

CCGateway active/desired均0.1.12、enabled；installed package `0bbcacca59def9b4011e80b8d895898c198a72611f280a5fabe5ab40556970d7` 与候选相同。逐个从docker top取得四节点实际插件进程路径并sha256，均 `b9f030ecbc206c8cd4b460d02675ae2711129c75d1b59781d13056c87db4a467`。没有覆盖immutable0.1.11包。

## 未来镜像与账号保留

CC作者先完成Worker.73镜像/双账号原地更新，health/features/catalog.15/schema[1]绿，无模型调用。随后读取完整public remote-config，按Config允许字段克隆，仅修改images.app为ccgateway-worker:0.1.73；其他public字段和secret-presence flags逐项相同，controller/egress镜像、网络、策略和SSH设置不变。秘密依same-connection既有保存语义保留，未读取或输出内容。

正常runtime/install刷新controller返回200；实际controller CCG_APP_IMAGE=.73。刷新前后独立比较#21/#22的Id、Image、Mounts及完整Config（含授权相关labels/env），完全一致。私有事实文件位于cc-max `/opt/ccgateway-runtime/default-0.1.73-{before,after}.json`，0600。不重建账号、不更改旧image引用、不迁移卷、不清授权。

## 证据及恢复边界

OVH `stage/0.1.71` 保存verification.json、backup-path.txt、nodes-after.jsonl、binaries-after.json、maintenance-observation.json、default-image-verification.json。旧0.1.70stage/publish/四节点发布目录与本次DB备份保留。若后续需恢复，由正常updater rollback/preflight决定兼容；本批新增schema，不能仅换旧程序后假称已恢复数据库。必要数据库恢复须在维护状态、确认新写入处理后针对本平台dump执行，不在本次成功发布中自动回灌。

全部稳定后已通知root进行公开协议验收；此记录不冒称预算隐藏轮次已通过真实provider上线验收。

## 首次公开预算调用失败：旧 controller 路由

root只发1次后停止。公开request_id的SHA256为39fce042721ede777c891cbc8d502e0b41248585a78edabeee7b5b8631df1df1，核心精确匹配RID efb21210ad2a39fc834e057d，2026-10-08T11:53:43.846572Z，sup2api-1/account22/attempt1，503/internal，错误helper history runtime verification unavailable，0tokens/free。没有凭此认定key错误或模型超载。

只读管理GET accounts/22/features同样503。进一步核cc-max实际controller镜像ccg-controller:0.1.47，部署/app/manager.py的ROUTE仅含status/usage/request-logs/auth，不含admin/features；使用现有实际controller认证的只读GET该固定路径返回404 not_found。当前428候选源码允许features，但既有controller没有跟随Worker原地binary升级。

链路结论：requirement直连返回needs_custody后，core WorkerCapabilities通过旧controller读取能力被404挡住，未进入Reserve/Dispatch；provider_helper_attempts该RID行数0。Worker无新普通请求日志与此一致，但单凭空日志不能证明纯探针未到。没有模型重试、没有改key/冷却/授权/配置，已报root安排正常Git控制器版本更新，不绕过管理认证。

## Controller 0.1.48 正常更新与恢复

root明确授权后，从cc-max已有clean Git428工作树构建新且未占用的ccg-controller:0.1.48，镜像ID `sha256:bcb8242bf7a504daa40e6c32fe42cd2e683f2a1c54cee3005a6064b5cfe2dace`。受限2CPU/2GiB构建；同镜像禁网运行controller全部Python unittest，39项PASS6.740s。构建包装最后tail因PowerShell→sh末行CRLF路径显示失败，实际build/tests日志独立确认成功；没有把包装exit1改称全脚本成功。

现场live47源码按换行规范化后与Git候选差异仅3行：允许count_tokens和admin/features路由、features只准GET。network.py不变，_provision/认证/持久目录行为逐字相同。CC代理独立确认existing同network+auth立即return、不按默认app_image替换账号。没有绕过route权限或把404当无能力后换号。

备份旧controller完整inspect及两个账号全部inspect至cc-max `/opt/ccgateway-runtime/controller-0.1.48`，私有文件0600。旧镜像.47保留。通过正常配置API复制允许public字段，仅images.controller从.47改.48；其他字段/secret-presence flags、app.73/egress/网络策略相同，正常runtime/install200。实际新controller镜像确认.48。

恢复验证：用实际controller认证+实际revision读取21和22/admin/features均200/schema[1]；Core管理接口accounts/21/features与accounts/22/features均200，catalog.15、Worker.73/full428/modified=false。两个账号Id/Image/Mounts/完整Config（含labels/env）前后完全相同，无重建、授权、旧image引用或卷变动。没有模型调用。已通知root进行唯一新公开预算验收。

证据：OVH `stage/0.1.71/controller48-verification.json`，cc-max `controller-0.1.48/{build.log,tests.log,*.normalized.diff,verification.json,*-before.json,*-after.json}`。这次首503确由发布流程遗漏controller能力路由升级造成，不能掩盖为泛化模型负载错误。

## Controller恢复后第二次独立调用仍失败（待定位）

root重新只发一次，未自动重试：request SHA d36da34fc9081e849ea00477c2da8187a511627e889648844eed2be3551d9c36，精确核心RID0c77dad4417b7ae826f562db，2026-10-08T12:03:13.073273Z，sup2api-1/account22/attempt1，503/internal，外层error仍helper history runtime verification unavailable。input/output0，metrics空，billing_status free、cost0；provider_helper_attempts/outbox/receipts均无该RID。

此次不能沿用第一次controller404结论：更新后的能力路径已实证200。代码后续步骤为实际ResourceTransport.Identity，当前仅作为待查方向，Worker代理正在关联resource身份诊断。不根据12秒耗时推定具体provider错误，不发新探针/模型、不改配置。

第二次失败已由CC关联Worker身份请求 `b4e65e4d-54bd-46ae-9724-f247e21af472`：12:03:24.723 stage admission / resource_identity_failed，实际错误 `main model turn ended without applying its client feature plan`。这是OAuth身份profile载体失败，非一般推理请求；core依旧0Reserve/0Dispatch/0usage。runResource会在runner error时清理op.response，现日志不能据此确认profile HTTP是否真正出站，故不虚称零profile请求；普通模型派发未开始。

只读核心诊断审查：ResourceTransport.Identity除明确issuer缺失外把非200统一错误；helperRuntimeFailure再泛化message，fromCore仅拷Status/Code/Message，内部cause未保存在usage事实，遮蔽capabilities与identity差别。建议后续窄typed阶段/固定错误类别+HTTPstatus的安全结构日志，关联核心RID/account和可信Worker request ID，保留客户端泛化错误；不记录身份/令牌/完整URL/原始response文本，不按错误message猜资格。此处仅设计，engine修复由CC负责，未改产品/配置/运行态。
