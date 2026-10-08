# 本地 Claude 真实 Read 验收：Worker 0.1.66

2026-10-08。核心保持0.1.65、插件0.1.10；两账号Worker更新为0.1.66，默认新建镜像与控制器刷新完成并确认稳定后才发测试。源码为已推送 `56f93858ca7ab76ef9615baec6addf77e74ff205`，服务器Git构建，无本地源码上传。

## 客户端结果

本机Claude2.1.292，项目 `D:/projects/test`，只允许Read读取既有SVG前40行并用中文说明。使用进程内临时API地址/凭据，不改全局设置、不写项目、不持久会话。

18.949秒，exit0、is_error=false、2轮、原生Read一次、匹配tool_use_id的结果一次、最终非空回答；最新严格验收脚本判定通过。CLI汇总input4/output590/cache_creation6986/cache_read2674；只报告实际usage，不推断账单节省。脱敏证据为 `evidence/local-claude-0.1.66.json`。

## Worker日志独立核验

实际路由账号22，两轮Worker ID分别为 `06d2a35b-4483-4b8f-bee7-55ec282ad690`、`8e892880-a922-49f9-83db-b3b48166a861`，均200。

- 普通顶层system5616字符，hash前缀46929d672d5d1554，完整且一次；额外普通inline system49字符，hash前缀854b1b20a5701460，完整一次。
- 提供商工具名为Read，routing.native=true，没有加mcp__ccgateway前缀。
- 客户端工具结果3606字符，hash前缀46b590c71636af8c，作为最终4179字符结果的完整前缀。新增573字符精确匹配该请求经鉴权Mod确认的session_context wrapper，附件内文hash前缀8798029338750562，只有一次；没有删改客户端原文或把未知后缀放行。
- 已保存环境策略是gateway，workingDirectory单独选client。客户端cwd行完整一次，platform由win32换为linux，符合配置。已识别环境附件按策略变换，不宣称所有原始system字节都相同；普通指令仍保留。模型看到的cwd与实际容器进程cwd是不同概念。

部署、容器/卷/授权前后核对与回滚备份见 `DEPLOYMENT-2026-10-08-WORKER-0.1.66.md`。旧0.1.65的真实失败证据保留，不以新成功覆盖。

这证明真实客户端一次原生Read往返恢复，不能推断所有工具、操作系统、账号、上下文组合均已真实验证。高级组合的新增适配仍另行评审、测试与发布。
