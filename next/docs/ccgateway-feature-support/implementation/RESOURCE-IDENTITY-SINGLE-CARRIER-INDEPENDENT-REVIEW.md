# 单 CLI 身份载体与本地状态成品独审

2026-10-08，审查当前未提交、未部署实现。审查者不是 Worker 作者；本次只新增独立测试和审查文档，不改 Worker 生产代码，不操作服务器。

## 结论

完成独审，未发现本次修复的代码级阻断。审查发现的默认 `.claude.json` 路径问题已由作者修复，复核和回归通过。Windows 上真实 CLI 2.1.292 对隔离假上游的正反例通过；Linux 单进程 wrapper 计数门禁仍需在 Linux 执行，不能由此次 Windows 测试替代。

## 检查与证据

- `identity()` 不再调用 `auth status`。经 `runResource` 启动一个载体，由受 Mod/scope 约束的 native 请求头分类；API Key 仅在 managed issuer ID/generation 齐全时生成哈希身份，拦截后不发送 profile 或模型请求。OAuth 必须具有单一 Bearer 认证及精确 OAuth beta，再使用实际认证请求所得的完整 account/organization UUID 计算身份。缺 beta、双认证头、空 key 等拒绝。
- 错误/取消边界：resource 成功覆盖只在外部 context 未取消、relay 无 failure 且交换已完成时发生，之后必须 `checkMod()`（包括 scope.verify）；`onResult` 本身也校验 Mod/scope 并保留错误。`runResource` 在错误时丢弃/关闭响应，`identity` 只在无错误时持久化身份。未发现失败改写成成功或返回未验证身份的反例。取消路径不重复执行最终校验本身不列为漏洞。
- `/admin/status` 只读本地 JSON/环境，不运行 CLI、helper、不读 FD/WIF 文件。固定输出只描述 presence，online_verified/selection_verified 始终 false；过期是本地时间事实，不代表自动重授权结论。helper/外部来源保持 unresolved；多文件与多环境变量来源去重，与 Core 枚举相容。
- 默认全局配置修复后为 HOME/.claude.json，用户 settings 为 HOME/.claude/settings.json；自定义配置目录分别映射其下 `.claude.json` 和 `settings.json`。secure storage 未设置时服从配置目录，显式空值回退 HOME/.claude，非空值优先。新增独立测试覆盖 HOME 优先于 USERPROFILE 以及三个 secure storage 分支；CLI 实现映射依据作者已核验的 2.1.292 `Gt` 路径证据，本独审复核 Go 路径实现和文件反例。
- 快照无效配置仅返回固定错误，不泄露输入路径/内容；独立测试确认 helper 命令、key、profile 字符串不会进入快照。OAuth 401 或 200 缺组织字段均拒绝，错误不包含假 profile 内 token/账号字段。身份输出只保留哈希 principal/generation，不回传凭据。

## 本次实际执行

工具为 PowerShell、rg、原生 Go；CodeGraph/Serena 未有已确认项目绑定，不使用。所有测试均设置 `SUB2API_TESTPG=off`；无真实上游、真实模型、部署或旧 `auth status` 调用。

1. 首轮本地 snapshot/身份单测 PASS；`TestRealCLIResourceIdentityUsesOneNativeProcess` 在 Windows 明确 SKIP（POSIX wrapper / Linux release gate）。
2. 新增 `resource_identity_independent_test.go`，真实 CLI 2.1.292 + 隔离 HOME/config + httptest 假上游：OAuth 401 拒绝、200 缺组织拒绝、API Key managed issuer 零上游请求，全部 PASS（4.047s）。这些测试不证明进程启动计数。
3. 既有 `TestRealCLIResourceHTTPIdentityAndProviderErrors`（OAuth/API Key）和 `TestRealCLIResourceCancellationReleasesSpool` 真实 CLI 隔离测试 PASS（6.837s）：包括合法 profile、错误 generation 不发送资源请求、资源 429 原样返回、取消释放 spool。
4. 新增 `auth_snapshot_independent_test.go`：secure storage/HOME 优先级、无效配置路径不泄露、helper/FD/WIF 多源去重；作者修复后的默认 global config 回归一并 PASS（1.478s）。
5. `git diff --check` PASS。

独立测试没有执行 `resource_identity_lifecycle_test.go` 中仍含旧 `auth status` 的 stored OAuth 诊断用例。真实 stored OAuth 刷新、Linux wrapper 精确单进程计数、现场遗锁修复及上线状态均不由本次测试证明。
