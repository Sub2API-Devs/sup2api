# 第九批 Linux 数据库 / race 门禁

候选初次：`cd4d5e40b2de7c22af7718a3b35d12d9f41e786a`，2026-10-08。OVH从Git fetch精确SHA建立clean detached worktree `/home/debian/sub2api-next-test/git-audit-nine-cd4d5e40b`，未上传源码。仅隔离PG容器sub2api-next-testdb-pg-1的loopback45432；Docker inspect验证容器名/端口，凭据仅内存不打印。Docker Go1.27-trixie、2CPU/2GiB、GOMAXPROCS2/GOMEMLIMIT1400MiB、CGO/race、readonly源码、既有cachevols。

## 首轮发现与修复

七包命令：`go test -json -race -p 1 -parallel 2 -timeout 25m -count=1 ./internal/providerresources ./internal/gateway ./internal/ccgateway ./internal/app ./internal/fallbackcredits ./internal/messagediagnostics ./internal/migrations`，随后同包vet。

初轮test_exit=1、vet_exit=0。593项PASS、2项可选真实CLI skip、3项FAIL：app的TestManagedRuntimeMigrationDoesNotBootstrap，以及migrations的TestMigrationsFromFirstIdempotentRunTwice/TestSecurityHardeningDoesNotReopenPrivateProxies。统一根因0042使用非幂等CREATE TABLE/INDEX，重复迁移报provider_diagnostic_messages已存在。此为实际阻断，不能用其它包通过作为放行依据。

0042 TestDiagnosticsDBOwnershipRetentionAndConcurrentRecords实际PG PASS0.11s，包括8并发幂等、过期同IDRecord必须拒绝、期限不延长、跨owner/issuer与配额释放。0041 TestFallbackCreditDBOwnershipExpiryAndRetries实际PASS0.11s；providerresources10组DB与ccgateway2组DB也非skip。首次各包：providerresources2.245s、gateway9.197s、ccgateway3.316s、app失败1.618s、fallbackcredits1.121s、messagediagnostics1.117s、migrations失败0.194s。

只在本地窄修0042表及两个索引为IF NOT EXISTS，交父提交新SHA，服务器不传补丁、不改worktree源文件。首轮日志保留 `/home/debian/sub2api-next-test/feature-validation-audit-cd4d5e40b/run1/`。最终门禁须以修正候选重跑结果为准。

两项skip均未安装真实CLI的core端可选链路：TestOpenAIWorkerRealCLIProtocolChain/TestOpenAIWorkerRealCLIExactToolNumbers；不称本轮已验证它们。engine实际CLI在父负责的cc-max门禁分开记录。

空input_json_delta的新增单测实际位于contracts/credits与protocol-codec/strict，另起同资源上限容器在相同精确SHA执行这两模块race/vet，结果后补；不将其误写为next/sdk已有单测。

## 初候选空delta独立门禁

同精确cd4d5e40b readonly源码：contracts `go test -json -race -p 1 -count=1 ./credits ./diagnostics` 与vet均exit0；credits9tests通过（1.017s），diagnostics包无测试，不能计作功能测试通过。strict `go test -json -race -p 1 -count=1 ./strict` 与vet均exit0，33tests通过（1.086s）。两包 `TestEmptyInputDeltaRetainsInitialObject` 实际PASS，0race；日志分别contracts-race.jsonl/strict-race.jsonl及vet日志、codec-status.txt。此绿门禁不覆盖0042迁移失败，整体仍待修正SHA。

## 修正候选最终门禁：GREEN

精确SHA `1186563e47565e938da2cd2b1a9e8be6cd5ac2d5`，通过Git fetch新增独立clean detached worktree `/home/debian/sub2api-next-test/git-audit-nine-1186563e4`。同隔离PG45432、readonly源码、2CPU/2GiB限制；不在服务器修改源码。该候选包括0042幂等DDL及统一资源身份多值头校验。

七包全部PASS：providerresources2.147s、gateway9.684s、ccgateway3.408s、app3.578s、fallbackcredits1.124s、messagediagnostics1.118s、migrations1.201s。共609tests/subtests PASS，2skip仍仅可选真实CLI用例，0FAIL/0race。`TestDiagnosticsDBOwnershipRetentionAndConcurrentRecords` 实际PG PASS0.11s；此前红灯TestManagedRuntimeMigrationDoesNotBootstrap PASS1.08s、TestMigrationsFromFirstIdempotentRunTwice PASS0.09s、TestSecurityHardeningDoesNotReopenPrivateProxies PASS0.08s。0041及现有资源DB同七包实际执行，不是skip获得绿色。

随后在相同候选串行执行全部contracts `go test -json -race -p 1 -count=1 ./...`：55tests通过，credits/features/httpfacts/resources包分别PASS1.017s/1.044s/1.007s/1.013s，diagnostics包无测试单列，未把它计为功能用例。strict33tests PASS1.083s。两个TestEmptyInputDeltaRetainsInitialObject实跑PASS（strict0.01s），全程0race。

七包、全contracts、strict三组vet均exit0，三个vet日志均0字节。status.txt六项test/vet exit全部0；测试结束Git工作区仍干净。总计697个真实test/subtest通过（609+55+33），另2个core可选CLI skip与1个contracts无测试包。

新完整证据目录 `/home/debian/sub2api-next-test/feature-validation-audit-1186563e4/run1/`：core-db-race.jsonl、contracts-race.jsonl、strict-race.jsonl、对应三个vet日志、status.txt/environment.log。已向父报告OVH DB门禁满足；生产部署由父结合cc-max engine/CLI验收统一控制。原cd4d5e40b红结果保留，不能倒写为曾通过。此文不声称真实提供商全部beta、MCP远程操作或信用计费效果已完成验收。
