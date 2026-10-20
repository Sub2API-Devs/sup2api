# CCGateway 当前文档

2026-10-20 专项设计：[CC 特性分层配置与请求内容转换设计](CC-FEATURE-LAYERS-DESIGN.md)，涵盖计费归属、10 个环境字段、连续会话与客户端动态 system 排除参数兼容。配套 [UI 设计稿](cc-feature-layers-mockup.html) 和 [讨论记录](CC-FEATURE-LAYERS-DISCUSSION.md)。这是待实施设计，不代表已部署。

304 组装专项验收：[按原生组装链路分组的测试方案](CC-304-ASSEMBLY-TEST-PLAN.md)。包含 AST／REA 证据、真实官方请求回放、逐字段合同与失败门禁；已修复本轮已确认缺陷，新制品 75/75 合同通过，完整原生分支覆盖仍单独列明范围。

状态：2026-10-09，Core .78 / Plugin .14 / Worker .80 / Controller .48。**整体兼容工作尚未完成。**

日常只需按目的读以下文件：

- [当前交接与进度](HANDOFF-2026-10-09.md)：运行状态、已验证、未完成和简要过程。接手先读这个。
- [环境与使用方式](ENVIRONMENT-RUNBOOK.md)：本地命令、SSH、服务/配置/日志位置、API及隔离测试、构建更新与恢复。
- [当前实现指南](IMPLEMENTATION-GUIDE.md)：代码目录和数据/策略/Mod/历史/计量处理链。
- [剩余工作与验收](REMAINING-WORK.md)：下一项怎么设计、修改、测试及边界。

`implementation/evidence/`只保留近期部署基线和代表性真实验收；`evidence/`保留可复用测试脚本与其测试。它们不是额外必读文档。

旧调研、重复总览、批次流水和本地归档已清除。需要追特定失败、完整调研或旧制品时，查[Git历史快照](https://github.com/Sub2API-Devs/sup2api/tree/d7cbb814e0f0089aec6ea9e624aa9ebd4033df9e/next/docs/ccgateway-feature-support)，不必日常翻数百文件。历史版本不能作为当前状态。
