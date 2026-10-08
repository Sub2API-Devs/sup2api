# CodeExec / PTC 独立复核（2026-10-08）

范围：第六批 Worker provider CodeExec、隐式动态 Web、PTC ledger、container admission、历史恢复与响应块。复核人未参与这些 parser/ledger 作者实现。本记录不表示第六批已部署或真实提供商资格已经通过。

## 发现与修复

1. `checkWebResult` 仍把非 `direct` caller 当成未实现 adapter，拒绝动态搜索的正常 `web_search_tool_result`。官方 Web Search 的 Response 说明明确指出动态过滤的嵌套 `server_tool_use` 与结果携带 CodeExec caller。已复用 `checkProviderCaller` 校验原始字段并原样保留。
2. 原 PTC ledger 只跟踪客户端 `tool_use` 子调用，未验证服务端子调用的父关系。新增独立 `serverChildren`：要求活跃 CodeExec 父、ID 不重复、结果 caller 绑定同父；父结果不得先于其未完成服务端结果。它们不成为客户端 `tool_result` 义务。fallback 只放弃本响应段被中断父调用所属子调用。

官方来源（2026-10-08 核对）：
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling

`allowed_callers` 的配置是上游调用偏好而不是客户端授权边界，不额外把合法 direct 返回误判成权限错误。资源归属仍由受控 Outputs/Refs/Contexts 准入和真实 issuer 锁负责。

## 独立证据

`code_execution_independent_review_test.go` 覆盖有效父子序列、孤儿 server caller、父先结束、结果错父、结果漏 caller。`TestRealCLIReviewNestedServerCaller` 用真实 CLI 2.1.292 和隔离假上游执行 5 个请求：新会话、续聊、冷缓存导入、回退、SSE；出站历史逐块完整比对，HTTP JSON 输出内容完整比对，SSE 必须正常 message_stop 且无 error，调用次数必须为 5。

首次针对性运行通过（5.488s）；CodeExec/PTC/容器相关单测及 `go vet ./engine` 通过。真实 CLI 测试不证明提供商产品资格、实际代码执行或费用正确扣账。

## 边界复核

- server 定义从客户端本地工具注册目录分离，仅归属明确的主请求插入 provider tools；本修复不增加本地执行分支。
- 新建以及包含已完成 CodeExec 历史的请求仍要求资源 Outputs；container/custom skill 引用按类型 grant；仍在等待结果的 PTC 父要求真实容器上下文绑定。
- typed HTTP 200 tool error 继续作为普通内容，不变成网关异常；usage 原字段保留，不推算秒数计费。
- 不改核心资源产物注册、账务、Skills 或 credit-token 模块。Provider 第六批端到端资格仍待 Git 候选部署后验证。

最后联合复跑：TestRealCLICodeExecutionGateway / TestRealCLIPTCGateway / TestRealCLIExecutionImplicitAndErrorResults / TestRealCLIReviewNestedServerCaller 全通过（51.634s）。覆盖原执行结果 variants、客户端 PTC、隐式 Web/正常 error、此次嵌套服务端 caller。未触生产配置或授权。
