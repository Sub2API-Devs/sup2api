# Worker 0.1.67：真实 CC 逐轮配置不再降级

2026-10-08，核心0.1.66 / 插件0.1.10 / Worker0.1.67，源码779c0630d，catalog.9。默认镜像和控制器刷新完成、两账号原身份核对一致后，再运行实际客户端。

## 本地 Claude

相同只读任务：Claude2.1.292在 `D:/projects/test` 读取既有SVG前40行并回答，进程临时指定公开API，不改全局配置。17.877秒，exit0、is_error=false，原生Read及配对结果各一次，2轮完成。证据 `evidence/local-claude-0.1.67.json`。

按该次会话metadata哈希在两账号日志完整查找，只找到账号22两次请求，各200且各一次上游调用：

- `e214e9dc-c23c-4781-9eb3-1ae9b8e03359`，05:14:55.269 UTC。
- `df11122b-9f3a-411e-83c7-05e80595f879`，05:15:06.044 UTC。

没有匹配的先400再删字段重试。两轮收到和最终上游header均保留 `per-turn-control-2026-07-01`，没有替换成公开beta名。`messages[1].output_config.effort=medium` 作为独立system按原客户端历史时序保留；首次上游数组index2是新增网关环境附件造成的偏移，不能将“相对时序保留”写成所有绝对数组下标都不变。

Read保持原生名。工具结果3606字符完整前缀与573字符可信session_context均保留，附件一次。普通顶层system文本完整；cache元数据可按既有策略恢复，不宣称整个原始JSON逐字相同。详见Worker0.1.67部署记录的日志核验。

## 独立 API beta 实测

`evidence/public-per-turn-0.1.67.json`：同一小请求分别携两个beta名称，system消息包含effort medium，均200/end_turn且返回精确 `PER_TURN_READY`。

- CC实测名称：请求ID `2a43e6f1deb3d9f42ff9972b`，4.620秒。
- 公开API名称：请求ID `43da1b9f0fc3cdc77e3d73ae`，4.891秒。

仅证明此账号/模型/请求的两个名称都被接受。没有据此宣称两个名称在所有模型上完全等价、已废弃其中一个，或所有CC beta天然可透传。原0.1.66自动降级事实保留在旧部署记录。

强制选择已加载工具的窄适配经过真实CLI接隔离上游验证，不能据此声称Opus5.5支持forced tool_choice；该模型限制仍由提供商决定。
