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

## 最终候选门禁启动

最终Git SHA `2bd328b46b18415ff209ecfaa39e71f27c17407c` 已由root提交推送。OVH Git fetch后新建 clean detached `/home/debian/sup2api/release-0.1.72`，未上传本地源码。session22880 开始Linux6包 gateway/ccgateway/helperhistory/usage/app/migrations 的race真实隔离PG门禁，随后core vet及contracts全race/vet串行。2CPU/2GiB/GOMAXPROCS2/GOMEMLIMIT1400MiB、原CI缓存、源码只读挂载，日志 `/home/debian/sub2api-next-test/validation-2bd328b46`。当前尚无终态，不把运行中或skip算通过；尚未构建签名、导入、升级或变更默认镜像。

## Linux 门禁与签名终态

首6包命令误将迁移路径写作 ./migrations（正确为 ./internal/migrations），产生setup fail，保留core-race.log/exit1；其余5包734PASS、5可选CLI skip且零testfail。随后只补正确迁移包race：4PASS含真实迁移幂等双跑；core6包vet0、contracts72PASS/race0、contracts vet0。可选skip为3个ABC CLI与2个OpenAI CLI，普通数据库测试均实际运行；Windows实际CLI/PG的inline JSON/SSE和混合链证据另独立保存，不冒称Linux重跑。

prepare session78264 exit0，仍Git精确2bd328b46，defaultcache/原签名trust未变。签名manifest与payload摘要、tar全部文件mode/size/hash、plugin签名及TLS完整originGET逐字节一致通过。独立验证最初把manifest envelope摘要当payload摘要比较而断言失败；按实际签名协议核payload摘要后通过，不是制品签名失败。

- manifest: 8eeb83269a7732b35a6baa2dc12db7489e055a78f0115abf265445c638fd8111
- bundle: 7388c16e124e9cdfa51478966df2ccc594499bd4123724175b2294d9252918b0，110181094bytes
- core binary: ec817c52e21adc09db665f92ce45766d9d7805ad9ca11063bb825ad15340bacf
- plugin0.1.13 package: 1fc462a95937f6523e3b0224101cc9b9659eeec7ff432f8eef71d5f380b37ac1
- plugin linux-amd64 binary: 1e5a7cd7726860f59e01663be42154157da4585b71ce630d43b1e9d74277a315
- trust: e51300373d1ce798114d1b39207dcb0e9dd4b7e9dccaa7e1935f55e334847133，与live相同
- schema_before/after均e8ec13814e64ced829fe95d94c719afe902eed9d7b50370634d5d129ec321138

新本平台备份 /home/debian/sup2api-managed/backups/core-0.1.72-20261008T134119Z，database.dump20682267bytes、0600，pg_restore --list验证成功；同目录四节点inspect仅私有0600。正常签名manifest import已完成，preflight HTTP200、blockers=[]、expected_revision137、四节点准确。尚未创建升级计划，默认镜像/controller未改。

CC作者随后交付Worker.75同SHA双账号原地更新及#22唯一identity200实证（13:41:39–42UTC）：CLI自身access刷新、原principal/generation保持、锁清理且无CLI残留。该证据来自负责该操作的CC作者，不是本代理重复发起身份请求。本代理已汇报root等待最终发布门禁确认；没有额外模型调用。
