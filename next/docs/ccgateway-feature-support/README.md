# CCGateway 当前文档

状态：2026-10-09，Core .78 / Plugin .14 / Worker .80 / Controller .48。**整体兼容工作尚未完成。**

日常只需按目的读以下文件：

- [当前交接与进度](HANDOFF-2026-10-09.md)：运行状态、已验证、未完成和简要过程。接手先读这个。
- [环境与使用方式](ENVIRONMENT-RUNBOOK.md)：本地命令、SSH、服务/配置/日志位置、API及隔离测试、构建更新与恢复。
- [当前实现指南](IMPLEMENTATION-GUIDE.md)：代码目录和数据/策略/Mod/历史/计量处理链。
- [剩余工作与验收](REMAINING-WORK.md)：下一项怎么设计、修改、测试及边界。

`implementation/evidence/`只保留近期部署基线和代表性真实验收；`evidence/`保留可复用测试脚本与其测试。它们不是额外必读文档。

旧调研、重复总览、批次流水和本地归档已清除。需要追特定失败、完整调研或旧制品时，查[Git历史快照](https://github.com/Sub2API-Devs/sup2api/tree/d7cbb814e0f0089aec6ea9e624aa9ebd4033df9e/next/docs/ccgateway-feature-support)，不必日常翻数百文件。历史版本不能作为当前状态。
