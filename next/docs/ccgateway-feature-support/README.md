# CCGateway 特性支持与实施入口

更新：2026-10-09。**当前 Core 0.1.78 / Plugin 0.1.14 / Worker 0.1.80 / Controller 0.1.48；整体兼容目标尚未完成。** 版本、源码、上线、测试和组合限制必须分别判断，不以目录状态或健康检查代替实际验证。

## 接手顺序

1. [接手文档](HANDOFF-2026-10-09.md)：线上版本与精确源码、已闭环证据、剩余任务、部署恢复、现场遗留和禁止重踩的失败。
2. [当前实现指南](IMPLEMENTATION-GUIDE.md)：模块目录、真实调用链、配置/Mod/历史/日志/计量与构建入口。
3. [当前进度](implementation/PROGRESS.md)：单一当前状态，近期完成项、未完成项和此次文档整理状态。
4. [独立协议审计](implementation/COMPLETION-PROTOCOL-AUDIT-2026-10-09.md)及[原始要求/全栈审计](implementation/COMPLETION-SCOPE-AUDIT-2026-10-09.md)：可继续实现的缺口、已知契约限制和未验证范围。
5. [文档分类索引](DOCUMENT-INDEX.md)：仍适用的设计、实际验证/部署、调研基线及历史快照。不要从旧快照重新计算线上版本。

## 已确认的近期结果

- .75/.80：单 dynamic MCP 与受限 named eager mixed 工具目录的新/续/回退公网验收；native 实际 wire 校验；helper transport 与 payload 版本明确区分。
- .74/.79：normal/inline budget 隐藏历史及 CLI 尾 system、公网工具往返与计量，实际可空 thinking estimate 不再导致 Core 503。
- .77：cache TTL provenance、精确整数/冷重放计量；真实 usage744 证明显式 1h 与未细分差额，原收费保留。
- .78：桌面横滚展开详情与移动保存栏布局修复，真实生产页面七状态验证通过。

这些结果不能外推为所有模型、账号资格、跨账号资源与组合全部通过。详细限制见接手文档和独立审计；不是“100%完成”。

## 文档使用规则

- 一项功能统一列出关联 beta header、body、工具/内容/响应块、CLI/env/Mod 处理和限制；通用 API 位于“特性支持”，CC 专有配置位于“CC 特性”。
- 01–05 是 2026-10-08 **调研与方案快照**；建议接口、旧“未实现”或前端命名不能当当前源码状态。
- `implementation/*PLAN*` / `*DESIGN*` 是专题设计；当前是否实现、上线，必须配对应源码/测试/部署证据。文件存在不代表已批准或已完成。
- 验证文档记录当时真实条件，fake provider、真实 CLI、隔离 PG、公网推理、生产 UI 与发布结果不互相替代。
- 总览只维护当前状态；过程、失败与旧发布证据保留。旧总览已[归档](implementation/archive/2026-10-09-pre-handoff/ROOT-README.md)，原链接保留跳转说明。
- 原[Oct7迁移交接](../ccgateway-migration/HANDOFF-2026-10-07.md)未修改；它的旧架构/完成度不是当前指引，后续[修复记录](../ccgateway-migration/REPAIR-2026-10-07.md)与新证据优先。
- 服务器必须通过 Git 获取明确提交再构建；保存配置不自动替换现有容器；#21/#22 容器与授权必须保留。
