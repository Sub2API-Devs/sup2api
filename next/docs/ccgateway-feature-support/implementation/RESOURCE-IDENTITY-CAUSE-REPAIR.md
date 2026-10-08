# 资源身份载体首因诊断修复（2026-10-08）

本候选只修确定的错误遮蔽及补充阶段证据，尚未证明修复线上身份失败本身。没有绕过主轮归属、身份校验或改动授权，没有执行真实模型请求。

## 线上事实

Worker 0.1.73 / Git 428164d4756e64163710910224957744554a2011，Controller 0.1.48。账号 22 的请求日志 `b4e65e4d-54bd-46ae-9724-f247e21af472` 在 12:03:15.144 UTC 开始身份确认，12:03:24.727 失败，错误为 `main model turn ended without applying its client feature plan`。核心尚未 Reserve/Dispatch helper 请求，不能归类为模型资格拒绝。

现有日志无法证明 profile GET 是否已经派发：runResource 出错会清除 op.response。12:03:10—12:03:30 的容器 stdout/stderr 日志为空；Worker 未配置 Runner.Stderr，默认丢弃 CLI stderr。只读环境核验 CLAUDE_CONFIG_DIR 和 CLAUDE_SECURESTORAGE_CONFIG_DIR 都为 /work/config，监听 0.0.0.0:8787，无 Plugin override。未输出账号标识、配置秘密或 profile 内容。

## 确定缺陷与本候选

1. Mod `turn.step` 的 finally 中 lease(end) 失败会覆盖原始 next 异常。现在仍总是尝试结束 lease，原异常存在时保留原对象；正常 next 后 end 失败仍抛错。Go 独立归属校验不变。
2. Go onResult 原先先返回 checkMod 错误，覆盖 CLI is_error 原因。现在将 CLI 首因和 Mod 校验错误合并，仍失败关闭；完整响应/拒绝的原处理不变。
3. runResource 在清理响应之前记录固定事件 resource_carrier_completed，仅含 request_prepared、response_received、runner_failed，以及实际存在的 response_status。request_prepared仅证明relay已准备并消耗此载体，不证明提供商已收到请求；没有 profile 正文、令牌、UUID或完整 CLI 环境。

此变更不保证网络丢失 ack 与服务端拒绝完全相同；若服务端已接受 end 而客户端未收到回复，需分别看真实作用域状态及 CLI 终态，不能伪称 lease 失败。

## 验证

- Go 首因+scope 双错误回归先红后绿；原无应用 plan 的成功 result 仍拒。
- Node 原始 turn 异常+end 失败先红后绿，确认 end 确实调用。
- 新 TestRealCLIResourceStoredOAuthIdentity：真实 CLI 2.1.292、独立临时已保存假 OAuth、单端口 Mod/relay、假 profile，只允许一次 profile GET、其他上游路径为零。通过；尚未复现线上首因。
- 修复后 `go test ./engine -run '^TestRealCLIResource' -count=1 -timeout=90s` 22.226s 通过；全部 engine 单测（不设置 CCG_REAL_CLI）5.783s 通过，go vet 通过。
- 服务器 Git 428 原源码的禁网 Linux API-key/OAuth-env profile 隔离测试 12.873s 通过；不包含本地新增保存 OAuth 测试，不能当本候选 Linux 验证。

下一步需要独审、Git 精确构建后，以一次受控只读身份请求获取真实首因与派发事实。此文档记录阶段成果，不能将诊断修复描述为线上身份功能已经恢复。
