# 真实账号最小基线

执行时间：2026-10-08 07:21–07:24（Asia/Shanghai；2026-10-07 23:21–23:24 UTC）。通过既有 `ssh -J ovh cc-max`，直接在现有账号容器执行；不是本轮新 Worker 部署验证。

## 操作边界

没有重建或重启容器，没有替换程序、修改配置、复制授权或刷新登录。CLI 采用既有配置与出口，`claude-opus-5-5`、工具列表为空、最多一轮、禁止会话持久化，只请求固定短答。凭据仅在原容器内存读取和用于原配置上游；未输出、导出或落盘。GET 请求禁止重定向，15 秒超时，不变更出口/防火墙。

Files 仅 `GET /v1/files?limit=1`，没有上传、下载、删除或输出资源名称、ID、内容。模型资格仅查询指定公开模型的 Models API，不创建 Code Execution 容器，不连接任意第三方 MCP。

## 真实 CLI

- 账号 21，`ccg-21-app`：CLI 2.1.288，现有 API Key 通道，配置第三方 API base；单轮成功，固定短答精确匹配，CLI duration 2304 ms、is_error=false。
- 账号 22，`ccg-d1d2964e14bf728d9-app`：CLI 2.1.288，现有 CC OAuth，未配置替代 API base；单轮成功，固定短答精确匹配，CLI duration 2015 ms、is_error=false。

这证明两个账号此时能实际生成短答，不仅是 health 正常；不能推广为全部 beta、工具或资源 API 都具备资格。

## Files 与 Models 只读结果

账号 21：

- 对原配置第三方上游，Files 使用标准 x-api-key 得到 HTTP 401 / new_api_error / Invalid token。
- 相同凭据、同一上游改用 Bearer 后，HTTP 400 / new_api_error，消息为“未指定模型名称，模型名称不能为空”。没有给 Files 伪造 model 参数绕过路由。
- 指定 Opus 5.5 的 Models GET 返回 HTTP 200，但 body 含 invalid_request_error，且无 capabilities。不能当成模型能力查询成功。
- 因此当前第三方通道的资源路由/认证合同不兼容，不能据此判断其最终提供商账号没有 Files 或 Code Execution 资格。Messages 的成功与 Files 的失败须分开呈现。

账号 22：

- 现有 OAuth scopes 包含 user:file_upload、user:inference、user:mcp_servers、user:plugins、user:profile、user:sessions:claude_code。scope 名称不是对任意平台功能的成功证明。
- 原默认官方上游，Bearer OAuth 并携 oauth-2025-04-20，Files GET HTTP 200、正常 JSON、无 error。所有资源 payload 均丢弃，未展示或记录。
- 指定 Opus 5.5 的 Models GET HTTP 200，有 capabilities；`capabilities.server_tools.code_execution.supported=true`。这只是该上游报告的模型能力，不是账号执行授权/实际执行成功。

## MCP / Code Execution 资格结论

未对 MCP connector 做真实连接测试：需要合适的受控 HTTPS MCP 服务及消息请求，读取 OAuth 中 user:mcp_servers 不能证明 Messages MCP connector 可用。没有为测试随意接入外部服务、获取另一套 MCP token 或创建资源。

未触发 Code Execution：它可能创建上游执行容器，超出本次“无资源创建”的基线边界。22 的 Models API 能力报告为 true，21 通道没有可用的 Models 能力响应；两者都不称执行资格已验证。

当前官方文档说明 Files 已不需要 beta；旧 files-api-2025-04-14 仍保留旧分页响应。当前 Code Execution 三个版本也无需 beta，旧 beta 仍可用；应查询 Models 的 `capabilities.server_tools.code_execution.supported`，而非含义不同的顶层 code_execution。MCP connector 是 Messages API 功能，远程 MCP 的 OAuth authorization_token 又是另一套认证，不能与 CC OAuth 混同。

参考：[Files](https://platform.claude.com/docs/en/build-with-claude/files)、[Code Execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool)、[MCP connector](https://platform.claude.com/docs/en/agents-and-tools/mcp-connector)。

后续 strict codec 独立复核已经就绪，本次基线到此结束。没有将结果计入第三批代码上线或全部功能支持证据。
