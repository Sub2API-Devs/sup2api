# 第七/八批 Linux 数据库与 race 验证

2026-10-08，精确 Git 提交 `747c168a383fd4e6738cb9451a29b1fb84010560`。服务器通过 Git fetch + detached worktree 建立 `/home/debian/sub2api-next-test/git-audit-seven-747c168a3`，检验 HEAD 和测试前后干净工作树；没有上传源码。

环境：OVH 隔离 `/home/debian/sub2api-next-test`；仅 `sub2api-next-testdb-pg-1` 的 loopback45432 PostgreSQL（inspect核对容器名和端口），不访问生产DB。连接凭据仅内存环境传递，未打印/写日志。Docker `golang:1.27-trixie`，2CPU/2GiB、GOMAXPROCS=2/GOMEMLIMIT=1400MiB、CGO/race，readonly源码，GOWORK=/src/next/go.work；复用gomod/gocache卷。Redis36379未作为本次外部服务测试，gateway内部miniredis不能冒称真实Redis覆盖。

命令：`go test -json -race -p 1 -parallel 2 -timeout 25m -count=1 ./internal/providerresources ./internal/gateway ./internal/ccgateway ./internal/app ./internal/fallbackcredits ./internal/migrations`；同六包 `go vet -p 1`。

结果：test_exit=0、vet_exit=0、563 test/subtest通过、0失败、0 data race、vet日志0字节。六包分别2.161s、8.790s、3.372s、3.557s、1.121s、1.192s。

仅两项跳过：TestOpenAIWorkerRealCLIProtocolChain、TestOpenAIWorkerRealCLIExactToolNumbers（本容器未提供实际CLI）；不可视为本轮真实CLI通过。新增0041的 `TestFallbackCreditDBOwnershipExpiryAndRetries` 实际PostgreSQL PASS 0.11s，覆盖并发幂等、owner隔离、strict摘要、过期不能兑换、LookupOwned保留expired custody/crossowner拒绝、重复观察不复活。providerresources10组DB（含Skills3、观察资源/上下文跨owner并发与容量）均真实PASS，ccgateway两组DB亦PASS；迁移包通过。不是仅skip获得绿色。

完整证据目录 `/home/debian/sub2api-next-test/feature-validation-audit-747c168a3/run1/`：`core-db-race.jsonl`逐测试事件、`core-vet.log`、`status.txt`、`environment.log`。日志0600，仅以sudo读取结果摘要。该SHA不包含后续diagnostics0042或内部round缓存代码；不对新代码沿用本次验证结论，也不声称生产部署/真实providercredit退款已经验收。
