# Release 0.1.80 最终独立审查

2026-10-09。审查提交 `60969149045452a96e5f0b125c912ddf28f8eeba`。结论：本次限定范围内没有发现新的发布阻断问题。此前 native 原始 schema 被恢复掩盖、合法 `[]Object` 目录误读的两项问题已修复；本次保留原有六个断言复跑通过，不将旧红例再次报告为现存问题。

## 实际范围与证据

使用本机 PowerShell、git diff、rg、Get-Content 阅读已知目标文件及现有独审记录。会话存在 CodeGraph/Serena 工具名，但本次没有调用、没有确认其项目绑定；已知文件的差异与调用路径采用本机读取，没有将 MCP 索引作为证据。

检查 dynamic listing 的准入、不可变目录、按历史位置编译、响应账本局部 clone、search identity 解析及 response 映射。历史先编译再用于后续解析，未来 listing 无法授权先前调用；response 的 listing 与 loaded 状态不写回共享 Request。listing 冲突或未知引用失败不产生部分授权。现有未来顺序、响应隔离、NoTools、未知 server、对象深拷贝及冲突原子性断言复跑通过。

检查 forced named eager + explicit deferred 旁工具的资格与完整目录恢复。先验证实际名称、schema、重复/额外/缺失工具，再重新解码 Plan.raw 恢复目录，保留字段存在性、顺序与数值；不从 Plan 填补缺失实际工具。any mixed、implicit、MCP/inline 等仍不在此次资格内。现有字段完整性、缓存隔离与单轮 helper 边界断言复跑通过。

检查原始 native 校验在 `ApplyMainRequestFeatures` 前运行，前面的步骤不恢复顶层 tools；后置目录读取已兼容 `[]any` 与 `[]Object`。count、已验证 credit.raw 和辅助请求的既有分流没有改变，本次不将这些路径扩大为普通主轮校验覆盖。

新增独占文件 `engine/release_80_independent_test.go`，仅测试、不修改业务：

- listing-only 历史（模拟保留目录、回退发现内容）：deferred 工具不能调用；显式 eager 可调用；disabled 与未列出的 name 拒绝，共四个子例。
- 真实 `relay.handler → adaptAttributed` 路径：native Read 合法基线实际到达本地假 handler 且 HTTP 200；missing 与 duplicate 在原始校验拒绝，并返回 native availability 错误，共三个子例。

## 实际命令

工作目录：`D:/projects/golang/sup2api/next/plugins/ccgateway/companions`。

```powershell
gofmt -w engine/release_80_independent_test.go
$env:SUB2API_TESTPG='off'
$env:CCG_REAL_CLI=''
go test ./engine -run '^(TestRelease80.*|TestReviewDynamicMCP.*|TestDynamicMCP.*|TestReviewForcedMixed.*|TestReviewNativeWireDefinitionBeforePlanRelay)$' -count=1 -timeout=90s
# PASS: ok ccgateway/engine 1.215s
go vet ./engine
# PASS: exit 0
```

新增测试全文 diff 已检查；未提交。真实 CLI 假上游矩阵属于已有审查记录，本代理本次未重跑；未发真实模型请求、未部署、未操作账户或授权数据，未验证公网新版本。结论仅适用于单动态服务器及当前受限 forced mixed 组合，不代表多动态服务器、inline/compaction/fallback 组合或真实提供商模型资格已验证。
