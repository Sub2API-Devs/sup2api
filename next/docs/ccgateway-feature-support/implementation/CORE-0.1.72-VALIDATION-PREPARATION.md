# Core 0.1.72 / Plugin 0.1.13 发布准备（只读阶段）

2026-10-08。最终 OAuth/local snapshot 候选 SHA 尚未下发，未 fetch、构建、导入、升级或修改默认镜像。V2 检查点为 686e60546，不能把它称为包含尚未提交的 OAuth 修复。

## 当前事实

OVH 本平台四容器均运行，逐个执行实际 release 二进制 version 均为 0.1.71。updater.nodes 四节点 local/ready=true、stopped=false、error为空，release=f2d7d55a952db9ab6b7bcd0e00b3b34ff273bc38d54dc78f4d75b65f2c24c94e。匿名公开 key/prices 返回正常 401（无模型调用）。现实际插件进程路径为 ccgateway/0.1.12-0bbcacca。

磁盘 /home/debian 所在卷 1.8T、可用888G、47%使用。stage/0.1.72 与 release-0.1.72 路径尚未占用。旧备份 /home/debian/sup2api-managed/backups/core-0.1.71-20261008T114912Z/database.dump 存在，0600、20258276bytes；正式升级前仍需重新做本平台备份，不把旧备份当最新状态。

旧 clean 构建目录 /home/debian/sup2api/release-0.1.71 精确428164d4756e64163710910224957744554a2011、git status空；prepare-core-release.sh存在。隔离PG仅sub2api-next-testdb-pg-1、127.0.0.1:45432，running、pg_isready接受连接；不使用生产DB做测试。

初次只读命令PowerShell变量转义错误导致docker exec容器名缺号；后续使用字面sh循环及实际release路径核实四版本成功。另测试PG没有Docker Health字段，改用已有pg_isready实测，不以模板错误当PG故障。

## 最终 SHA 到达后的门禁

仅从服务器Git获取精确SHA并建立新clean worktree，保留原default构建cache与dev signing key，不覆盖旧stage/artifact。Linux测试使用既有2CPU/2GiB隔离Go容器、GOMAXPROCS=2、go -p1；发布构建2CPU/4GiB固定slice。候选SQL若确认无新增迁移，当前schema指纹保持 e8ec13814e64ced829fe95d94c719afe902eed9d7b50370634d5d129ec321138。

重点 gate：gateway/ccgateway/helperhistory/usage 的 race 与 vet，覆盖v2显式协商、v1旧收据兼容/混合链、core安全验证日志与local status字段；真实隔离PG运行helperhistory与usage持久/幂等/冲突用例，迁移双跑幂等使用真实测试DB。contracts helperhistory/features全race/vet。实际CLI预算inline JSON/SSE及v1→v2混合链的Windows真PG证据另已通过，不把Linux可选CLI skip冒充复跑。最终记录逐包PASS/SKIP及命令，不预先声称通过。

构建新core.72与plugin.13后核签名、trust与live一致、SOURCE_SCHEMA、完整origin下载hash、plugin包/二进制；manifest先准备不升级。必须等待Worker.75单carrier真实identity恢复信号，随后root批准正常四节点预检/备份/发布；未来default images.app只设.75，既有21/22不重建、不换旧image引用、不迁卷/授权。

## 认证预检禁区

不调用旧 /admin/status、claude auth status 或其它会启动短命授权CLI的状态检查。当前.74只允许现有文件元信息、hash、容器身份与既有诊断事实核对；新status是local_snapshot，不能当在线登录证据。真实资格以独占受控carrier profile/native刷新结果为准，不额外重复探针或模型调用。
