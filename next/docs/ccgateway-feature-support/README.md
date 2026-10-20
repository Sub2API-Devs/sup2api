# CCGateway 当前文档

2026-10-20 当前状态：Core **0.1.172**、CCGateway／Controller／Worker **0.1.70**、全局 **build＋CLI 2.1.304** 已部署。账号 30、31、32 在线升级并通过真实上游复测；账号 21 已离线升级，按用户要求保持停用。接手先读 [304 实施与部署记录](../CLAUDE-CODE-2.1.304-IMPLEMENTATION.md)第 12 节和 [环境指南](ENVIRONMENT-RUNBOOK.md)顶部状态。

专项设计：[CC 特性分层配置与请求内容转换设计](CC-FEATURE-LAYERS-DESIGN.md)，涵盖计费归属、10 个环境字段、连续会话与客户端动态 system 排除参数兼容。配套 [UI 设计稿](cc-feature-layers-mockup.html) 和 [讨论记录](CC-FEATURE-LAYERS-DISCUSSION.md)。实际实现、测试及限制以实施记录为准。

304 组装专项验收：[按原生组装链路分组的测试方案](CC-304-ASSEMBLY-TEST-PLAN.md)。包含 AST／REA 证据、真实官方请求回放、逐字段合同与失败门禁；已修复本轮已确认缺陷，新制品 75/75 合同通过，完整原生分支覆盖仍单独列明范围。

最终镜像验收：真实官方客户端 **10/10**、组件组合 **216/216**；在线账号真实上游 **3/3**。7 个历史停止草稿未迁移，生产烟测不覆盖平台 API Key 分组调度全链路；完整兼容范围仍须参考测试方案，不能据这些计数宣称所有原生分支均已覆盖。

日常只需按目的读以下文件：

- [2026-10-09 历史交接](HANDOFF-2026-10-09.md)：当时的验证与剩余工作，不作为当前线上版本依据。
- [环境与使用方式](ENVIRONMENT-RUNBOOK.md)：本地命令、SSH、服务/配置/日志位置、API及隔离测试、构建更新与恢复。
- [当前实现指南](IMPLEMENTATION-GUIDE.md)：代码目录和数据/策略/Mod/历史/计量处理链。
- [剩余工作与验收](REMAINING-WORK.md)：下一项怎么设计、修改、测试及边界。

`implementation/evidence/`只保留近期部署基线和代表性真实验收；`evidence/`保留可复用测试脚本与其测试。它们不是额外必读文档。

旧调研、重复总览、批次流水和本地归档已清除。需要追特定失败、完整调研或旧制品时，查[Git历史快照](https://github.com/Sub2API-Devs/sup2api/tree/d7cbb814e0f0089aec6ea9e624aa9ebd4033df9e/next/docs/ccgateway-feature-support)，不必日常翻数百文件。历史版本不能作为当前状态。
