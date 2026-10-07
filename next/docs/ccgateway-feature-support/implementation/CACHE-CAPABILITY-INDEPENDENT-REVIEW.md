# Cache 与 Worker 能力端点独立复核

复核者：audit_code_beta（非这两部分实现作者）。日期：2026-10-08。

直接审阅 cache_plan、history_alignment、Worker features HTTP 端点、contracts runtime 解码、核心 runtime_features / accounts 权限与控制器路由，未在所审范围发现新增阻断缺陷。动态工作区在继续变化，本记录不替代最终集成审查。

- Worker `/admin/features` 只允许 GET，校验管理员 Bearer，空管理员密钥拒绝，返回 no-store。
- 核心接口复用账号读取和所有者权限，查询能力只读，不触发 reconcile/替换容器。控制器注入内部管理员凭据；响应区分静态代码目录、运行时观测的 CLI 版本及尚未验证的 provider 能力。
- Cache 计划针对协议 breakpoint 恢复，显式缓存与内部搜索/某些服务端执行轮次组合仍明确拒绝；属于有限组合支持，不能标注全功能已验证。
- 独立运行 `TestRealCLICacheHistoryAndNativeToolCompatibility` + `TestRealCLICacheBreakpointObservation`，真实 CLI 接隔离假上游，PASS 7.140s；涵盖 system/user/native Read 混合、重建、prefix-hit、分支和冷导入。
- 独立运行真实外层 CLI → Worker → 隔离假上游 `TestRealCLIMetadataGatewayCompatibility`，模拟 API Key / OAuth 内层身份，PASS 9.861s。
- Worker `go test ./internal/server/...` PASS 1.638s，contracts `go test ./features/...` PASS。

审查时 Worker Dockerfile 默认版本仍为 2.1.288，主线程构建明确传 2.1.292；后续默认版本改动应以最终代码为准。测试未调用真实官方模型，不提供账户能力或部署证明。
