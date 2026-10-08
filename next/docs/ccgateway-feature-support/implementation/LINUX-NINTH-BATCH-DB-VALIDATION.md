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
