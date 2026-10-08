# 普通API format + 全eager forced窄修

2026-10-08；.69真实验收后下一候选，未提交部署，无真实provider调用。

唯一业务diff：forced_loaded_tool.go资格排除从JSONSchema!=nil改为structuredOutput()。request_policy将公开output_config.format标记APIOutputFormat=true，已有structuredOutput仅指旧内部synthetic循环。普通API格式原本只因字段存在就错误触发内部续轮限制；现在复用全eager目录、helper禁止、maxturn1，不更改format/choice或模型限制。旧synthetic、deferred、inline/server/typed/MCP/safeguards等资格均保持。

新增forced_api_format_test.go验证API与legacy资格区别及执行限制。forced_api_format_cli_test.go真实CLI2.1.292接隔离假上游：

- JSON/SSE × named/any × 新建/续聊/回退分支/cold，16请求PASS21.331s。完整format/schema、选择名称/parallel、两客户工具schema/description/1h缓存显式false保留；只一次模型请求，无helper目录，外部tool_use大整数精确保留。
- JSON/SSE × end_turn/refusal/max_tokens/恶意helper/provider400，10请求PASS10.633s。普通200终态不改错误，helper502，原400原文与状态保留，均一次模型调用无重试。
- 全engine普通tests PASS4.248s，vet通过；默认全test不设置真实CLI，真CLI证据来自上述单独矩阵。

假上游Opus模型标签不证明实际Opus5.5支持forced；提供商真实拒绝仍原样返回。没有为了满足format伪造文本/强制隐式第二轮，输出format在tool_use阶段由上游按原协议处理。catalog由root统一，不在本批修改。

文件freeze：forced_loaded_tool.go，新增forced_api_format_test.go与forced_api_format_cli_test.go。等待非作者独审；不要将作者结果当独立复核或线上成功。
