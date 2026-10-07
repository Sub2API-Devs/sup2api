# 协议入口、可实现范围与外部产品边界

日期：2026-10-08。本文列入所有需要追踪的入口；候选方案不是已经支持。本期主要契约是 Anthropic Messages 经 Claude Code 执行，其他协议不得因为平台已有入口而显示可用。

## 1. 现有路径

```text
客户端平台API Key
  → 核心认证/模型映射/账号选择
  → ccgateway插件（anthropic.messages）
  → 核心发现账号连接并直连Worker
  → companions/engine 请求计划、CLI/Mod、出站relay
  → Claude Code实际模型请求
  → Worker响应/历史适配
  → 核心流转发/用量/计费
```

控制器负责容器生命周期和连接发现，不增加模型请求body转换。平台插件包不安装Worker端业务；Worker引擎、Mod、控制器和出口仍分目录构建。

当前事实：`plugins/ccgateway/internal/ccgateway/ccgateway.go:113`明确只接受`anthropic.messages`；manifest说明token counting/model discovery未实现。平台API Key只是平台认证，不是上游能力或账号授权的证明。

## 2. Anthropic入口的工作清单

### Messages：必须完成的主协议

`POST /v1/messages`含`?beta=true`，JSON/SSE、普通请求与各条件特性，以 [功能目录](01-FEATURE-CATALOG.md) 为准。无法承载的字段在执行前明确返回原因，不能200后无声丢参数。通过CC实现的条件功能在完整请求/响应/历史验证后开放，不能为了“全支持”暗中切换成另外的模型执行器。

### Token Counting：独立适配任务

`POST /v1/messages/count_tokens`目前外部不可用。可行性调查：确认账号认证是否允许上游count端点、如何与Worker持有凭据及出站策略整合，使用与生成相同的输入codec但不启动一次模型生成计数。

必须区分：客户端原始Messages输入的token估算，和Worker加入CC内部提示/工具后的实际出站token估算；不能拿后者不加说明当作原始输入计数。若只提供本地估算，必须明确标记估算方法，不能伪装官方端点结果。官方计数本身也是估算，不保证等于最终账单。来源：[Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)。

### Models：能力发现任务

模型目录可来自平台账号声明、CC运行时能力探测、获权的上游Models接口；三者必须注明来源。展示某模型不代表该账号已获权或所有功能通过验证。Models响应与“特性支持”的模型上下文应共享能力结果。

不通过修改defaultModels静态数组就宣称实时模型发现完成；分组模型是可调度账号能力的聚合，不能混淆并集与每账号交集。

### Files / Skills / 容器资源：需资源服务和归属映射

这些具有上传、下载、删除、版本或有效期，不能只支持一个file_id字符串。候选先支持可无损转换的内联文档/图片，随后按上游账号维护资源ID、访问权限、到期时间和调度亲和性。资源内容跨账号重上传需要明确策略；禁止把其他账号ID或秘密直接转发。

API服务端container.skills和CC本地skill/plugin在执行位置、文件系统及计费上不同。若实现CC等价工作流，应明确标记为“CC适配模式”，不能捏造官方container结果。能保持官方协议的上游执行路径仍需逐项验证。

### Batches：可另建平台任务层，不能冒充官方批处理

可在平台排队调用已验证的CC Messages路径，但需要任务存储、查询/取消、并发/重试、单项结果和计费。它不自动取得官方batch折扣、官方任务ID或SLA。若以后兼容同形接口，必须在产品和价格说明中声明本平台实现，不由一个beta开启。

### Legacy Completions 与独立产品

旧文本Completion若转换为Messages，需要明确prompt解析、prefill、stop和返回语义；当前未实现，不作为Messages自然支持。

Managed Agents的agents/sessions/environments/deployments、Admin/workspaces/组织账单、Memory Stores/Dreams、用户资料、MCP tunnels等独立产品不能仅通过一个CC进程等价提供。属于独立端点/控制面能力，不进入“已适配CC特性”开关；若未来有业务需求，要独立立项并依赖真实服务能力。来源：[API overview](https://platform.claude.com/docs/en/api/overview)。

## 3. 其他客户端API协议

### 当前代码事实

`next/server/internal/gateway/convert/convert.go`已定义`Converter.Request/Response/NewStream`和`StreamConverter.Event/Flush`，但`builtins`为空，没有已可用的OpenAI Chat/Responses→Anthropic转换对。

可复用接入点：`routing.go`的`addConvertedRoute`、`dispatch.go`的请求转换、`forward.go`的JSON/SSE返回转换。不能只把ccgateway的protocol判断放宽就使另一协议可用。

### Chat Completions候选

在平台现有转换层新增独立转换器，将已确认可等价的文字/图像输入、system/开发者指令、function tool调用与结果转成规范化Anthropic请求，再走同一个Worker；响应端转换消息、工具ID、停止原因、usage及增量事件。

必须先明确不同角色语义、工具选择、多候选、采样、logprobs等不匹配项，不能一律忽略。只有交集子集完整回归后才能开放“有限兼容”；协议新增字段需要独立官方契约核验，本轮未完成OpenAI全schema审计，不能将此候选标为完整计划已验证。

### Responses候选

仅单次无状态文本/工具交互有基础转换可能；完整兼容还需要item ID、事件顺序、工具结果关联、reasoning表示、存储/检索/删除、previous_response_id和background/cancel等状态语义。CC transcript不等于Responses资源服务。

先定义明确子集与错误，再决定是否建设平台状态服务。不得把Anthropic thinking signature当作另一协议可互换的加密推理块，也不能复用上游产品的文件ID。此为后续协议设计任务，不是当前Worker承诺。

### Bedrock / Vertex等提供商方言

这是不同客户端格式、认证和流编码的适配任务，不是打开CLI某个env就向客户端提供对应API。当前仅调查Anthropic Messages-through-CC；以后新增需保持对应事件编码/错误/字段而非把SSE装成其他二进制协议。来源：[CC网关兼容指南](https://code.claude.com/docs/en/llm-gateway-protocol)。

### 无模型能力基础的端点

Embeddings、音频转录/合成、视频生成、训练/fine-tuning等不能用Claude文本生成伪造等价数值/媒体结果。若平台其他插件已有实现，继续路由对应插件；CCGateway不得因“所有协议”显示这些功能已支持。

## 4. 路由和前端不能隐藏的不等价

- 功能适配完整，但某账号无授权：显示账号不可用；不自动把它标成账号异常/冷却。
- 某些模型接受、其他模型拒绝：按选择的模型评估；列表默认只显示条件支持。
- 需要原账号资源/思维绑定：有调度约束或无法保持的语义必须说明，不可任意换号“修复”。
- 官方字段有值但Worker尚未支持：明确参数路径和原因；未知与已知不支持分开。
- 条件功能可透传请求，却无法解析结果或恢复历史：显示有限/未完成，不能标支持。
- 当前选定协议只有基础转换：列出实际子集；不以一句“兼容OpenAI/Anthropic”代替协议范围。

## 5. 后续决策记录模板

每个未完成入口/功能记录：feature ID、用户价值、官方契约、当前缺口、是否能通过CC保证语义、候选执行路径、专门状态服务依赖、阻碍验证用例、明确返回方式、前端说明、实施批次、验收证据。不能把条件可行长期留空，也不能为完成清单捏造支持结论。
