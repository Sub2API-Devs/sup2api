# 远程 MCP 真实验收：0.1.67 首次失败

2026-10-08，在核心0.1.66/Worker0.1.67稳定后，使用平台现有API Key作一次匿名只读连接测试。目标为官方说明无需认证的DeepWiki MCP，仅启用read_wiki_structure，参数限定公开仓库modelcontextprotocol/python-sdk；没有MCP授权token，没有把本地项目作为查询材料。

公开请求ID `5ae8b46af2d3009acc298a3c`，6.481秒，HTTP502/api_error：`incomplete model message`。首轮失败后没有重试，也未发送pause续轮；原始响应正文与凭据不落报告。脱敏证据 `evidence/public-mcp-0.1.67.json`。

当前仅能确认公开链路失败，不能把此结果解释成提供商不支持MCP、也不能记作功能通过。正在检查真实提供商事件与CLI/Worker处理差异，需补充根因及后续验证。

## 隔离定位（尚未上线修复）

账号22 Worker请求 `b8424881-8f9c-4dfa-ad88-cdfc0dd0352f` 已获得上游HTTP200和MCP调用开头。后续隔离真实CLI实验确认：完整initial input可处理，而initial空对象再发空/非空/组合input_json_delta时，CLI在真实block_stop之前就abandon并取消提供商请求。不能根据被取消后的短日志认定提供商漏发终态。

正在实现等价输入块载体桥，必须等真实block_stop且参数校验完整后才交CLI，保持原始观察与秘密检查，不补造工具结果/终态。独立复核又发现转换后未清理旧Content-Length，已列为发布阻断；修复及复测完成前保持旧失败结论。详见MCP-INPUT-STREAM-REPAIR及独审记录。
