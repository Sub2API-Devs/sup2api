# OVH 核心0.1.63部署记录

## 已完成的范围

2026-10-08 在 OVH 通过既有签名核心升级流程，将 `sup2api-1..4` 从0.1.62更新到0.1.63。没有重建容器、替换其镜像或修改卷/授权配置；没有操作其他平台服务。原始容器ID、镜像ID及按Destination排序的挂载集合均与升级前备份一致。`sup2api-2` 的 Docker inspect 挂载数组顺序发生变化，排序后逐项相同，不是卷变化。

候选来自服务器 Git clean checkout `b786448a80930802aeaf4130c7987350f39fece6`，业务为7/8批 `747c168a383fd4e6738cb9451a29b1fb84010560` 加构建并发小修，未带第九批未提交源码。root 已确认两个 Worker 在原容器升级到747c168a且真实 Opus5.5 短答均HTTP200后，才创建本次核心升级计划；Worker结果由root另行留证，本记录不将其冒充本agent独立测试。

## 候选与校验

- manifest payload digest：`f6567906ab39bafb604f61e31b4a2225d09c2a02e44af17a447ca4d6ef526295`
- manifest envelope SHA256：`1db8a810844d456e7442b8446e1d338febffbf78f73276cd583ded6a08cc6713`
- bundle SHA256：`f524bd1a6aafe10dba1b3952cbf11c56681deb3c29aa53cfdc0b320f9edf204d`，110029007 bytes
- 四节点当前核心二进制SHA256：`d5aa1b34e12a345dd8d0223a5838c9a865d857d65a612c0e4322605a1abaa432`
- 签名key id：`sup2api-ovh-2026`
- builtin trust.pub保持原SHA256：`e51300373d1ce798114d1b39207dcb0e9dd4b7e9dccaa7e1935f55e334847133`
- schema_before：`fb05265b28db53cd8e6fe2b3932f3ba37320b712b720533dbb402e0907fcfd76`
- schema_after：`a685e0d83523a7b5a7ee3017a93bd4d7a0a6f82714829374f93c9fcf1586b729`

独立验证Ed25519签名、payload摘要、bundle摘要/大小和所有归档文件路径/大小/模式/摘要通过。两产物经既有CA验证TLS后，完整HTTP GET哈希再次通过。打包权限修复经Git提交20a5226获取，仅公开产物设0644，未重建或改变b786候选字节。

## 备份与恢复边界

私有备份目录：`/home/debian/sup2api-managed/backups/v0.1.63-20261008T031614Z`。

- `sup2api.dump`：仅本平台数据库 custom-format pg_dump，19755667 bytes；SHA256 `6933e1025cfb4e3ebd843e99d29da0ae1e8b020678d1707c561bddaff4eb7ff9`。
- `pg_restore --list`通过；没有执行恢复演练，也没有将目录校验称为完整恢复验证。
- `node-facts.json`记录四节点发布链接、版本/schema、容器/镜像ID和挂载；私有节点配置、compose和.env一并保存，目录0700、文件0600。未输出凭据。

恢复必须在协调维护窗口同时处理数据库与四节点对应0.1.62发行，不能仅把旧二进制指向已迁移数据库。该dump是03:16:14 UTC的快照，而正式升级约03:33:34 UTC开始；恢复到此快照会丢弃其后写入，本次成功部署未执行回滚。

## 升级计划与可用性实测

重新preflight HTTP200、blockers为空，目标仅sup2api-1/2/3/4。以已签manifest创建计划返回HTTP202：

`1011ace1691f22206da4f0d18b026194`

使用服务器已有 `upgrade_observe.py`，未提供故障注入参数。策略是maintenance；观察器在t=3.08s记录创建，t=62.53s记录`completed|27`，t=66.67s完成收尾。完整日志：

`/home/debian/sup2api-managed/upgrade-20261008T033334.log`

每个入口在 `/api/v1/key/prices` 做未授权HTTP探测，正常应返回401。每节点633条样本，四节点都在t=22.24s首次看到维护503：

- sup2api-1：356条503；最后503 t=58.36，恢复401 t=58.46，观测故障至恢复36.22秒。
- sup2api-2：357条503；最后503 t=58.46，恢复401 t=58.56，36.32秒。
- sup2api-3：378条503；最后503 t=60.66，恢复401 t=60.76，38.52秒。
- sup2api-4：369条503；最后503 t=59.71，恢复401 t=59.82，37.58秒。

采样间隔约0.1秒；以上是采样观测区间，不是精确网络故障边界。没有观测到连接失败码0或其他HTTP状态；这不代表没有真实用户请求受影响，也不代表零中断。该探测证明入口从维护503恢复正常认证401，不替代真实公开模型推理/Files/信用功能验收。

## 最终状态

四节点均为 `local / ready=true / stopped=false`，version0.1.63、schema_after及current发行digest完全一致。数据库 `schema_migrations` 已包含0038资源、0039资源上下文、0040Skills版本、0041fallback credits。计划completed，无迁移失败或暂停；未手动重启节点。最终服务器证据存：

- `stage/0.1.63/verification.json`
- `stage/0.1.63/deployment-summary.json`
- `stage/0.1.63/preflight.json`（较早导入后的检查，正式执行又重新preflight）

公开API现可由root开展功能验收。首轮构建曾因宿主384核/TasksMax512导致Go并发失败，保留在 `prepare-0.1.63-747c168a.log` 和 `stage/0.1.63-failed-747c168a`；修复后新构建日志 `prepare-0.1.63-b786448a.log` 成功。不能把该资源限额失败写成业务代码功能失败，也不能删掉原失败证据。

## 后续公开验收发现：旧插件仍在运行

公开 `/v1/messages/count_tokens` 请求 `719020712b65d57118d29423` 在03:53:07Z记为account22、503/no_account；此前structured请求 `900732afc178ff98d5cc6d77` 为account22、HTTP200成功。这里不是此前工具502的10秒冷却：账号已选中，插件构建请求失败后被dispatch兜底折叠为no_account。

只读实物核对发现：CCGateway active/desired仍0.1.9，数据库packageSHA `f5231a76a442987ad08ebb4e85443001d7b14c1fb6d0d829f67f67731d1b71ec`，上传时间2026-10-06T21:50:46Z；新0.1.63内置包同名0.1.9但SHA为 `fdafe93fb1595239359410154d3d5df097c3a727ad7d739c124a21038646629f`。`ensureBuiltin` 明确对same version / different content保留既有包，因而新CCGateway插件实现没有生效。

节点1实际插件 `/var/lib/sub2api/plugins/ccgateway/0.1.9-f5231a76/bin/plugin` SHA256 `bd64a11829cc70e6858cbd9386d47cf9876e2ab454b3766e8c2f9712ffef12fa`。二进制只检查常量存在性：旧 `Messages only; token counting is unavailable` 存在，新 `Messages and token counting only` 不存在。没有读取或输出任何用户payload/凭据。

因此本记录的“核心部署完成”不能解读为所有同版本内置插件的新内容均已安装。最小修复应递增CCGateway manifest版本并走正常插件rollout；不能覆盖immutable0.1.9包或泛改调度规则来掩盖。root负责后续版本与发布，本次排查没有修改插件、调度或冷却状态。
