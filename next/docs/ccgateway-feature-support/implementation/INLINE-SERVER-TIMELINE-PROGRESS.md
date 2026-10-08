# Inline server tools 与 compaction 工具时间线

2026-10-08。Worker 与核心授权路径已接线，当前处于独立复核阶段；下列测试不等于真实 provider 签名/资格验收。

## 官方依据

- [Mid-conversation system messages and tool changes](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages)：按值定义可包含 Anthropic 客户端/服务端工具；变更从所在位置生效。暂停的 assistant server turn 后不能直接变更工具。新按值定义使用 inline-tools-2026-09-15；旧 beta 仅支持引用。
- [SDK CompactionBlockParam](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_compaction_block_param.py)：tool_changes 是相对于请求 tools 的净效果，原样回放；content:null 是 no-op。
- [Compaction on demand](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand)：签名块置于历史首位、保留原块；原 system/tools 与保留 thinking 的绑定不可擅自改写。

## 实施边界与分工

Worker 使用同一有序编译器处理 system tool_addition/tool_removal 和有效 compaction.tool_changes。原始 Base 工具目录只用于真实上游前缀；Known 是内部身份注册并集；Active 表示最终可用集合，不能把并集暴露为上游当前工具目录。每个历史调用按所在位置验证工具可用性；未完成 server 调用禁止撤销或替换对应定义。失败压缩不改变状态，完整签名块不得被编译器修改。

当前开放目标仅已有适配器的 server 类型（Web、API ToolSearch、Advisor）。MCP inline 秘密/连接时间线、未实现 server 类型、显式 safeguards 冲突和内部 CC ToolSearch 循环继续明确拒绝。签名 compaction 内必须改名的自定义工具不能通过篡改签名适配。

Core 另行实现嵌套模型引用枚举：普通 messages[].content[].tool.definition 与 compaction 的 tool_changes[].tool.definition。Advisor model 进入同一权限与计价链；签名 compaction 内只允许 identity mapping，不能改写摘要签名所覆盖的定义。Worker 不能先放行 Advisor，再补核心授权。

## 当前验证

新增 inline_timeline.go/tests，暂未改 tracked Worker 接线。覆盖 server 按值加入、调用完成后移除、压缩后回放、原签名/历史对象不变、撤销后的非法调用、pending server 变更拒绝、暂停 assistant 后变更拒绝、失败压缩 no-op。TestInlineTimeline* PASS。

后续：接现有解析/响应活跃性/server pending ledger；新增真实 CLI 隔离假上游的新请求、续聊、回退、冷导入、SSE、逐块缓存及移除后历史矩阵，再与核心 Advisor 权限测试联合验证。当前没有新代码部署或真实 provider 签名验收证据。

## Worker 已接线与真实 CLI 矩阵

公共编译器现已接现有 inline 解析。普通 inline server 定义原样留在 system 的位置，compaction 内 definitions 不提升到顶层 tools。声明身份与最终活跃性分离：已移除的 server 工具保持历史 wire 名称，但不能再出现在新响应调用中。历史 client/server 调用类型不能互换。API ToolSearch 的本轮发现只更新 Accumulator 局部视图，不修改 Request 时间线；后续请求依据真实 search result 历史重放。

显式 cache visitor/copy/skeleton 增加受控 compaction.tool_changes 路径。整块签名仍必须精确匹配，不遍历工具 input/schema 内任意字段。summary 内需将普通自定义名改为 MCP 名的组合明确拒绝，不能改签名。先前 CLI 省略 toolset_name 的严格恢复移到 cache/citation 完整对齐之前，解决 browser toolset + cache 续聊失败；最终身份与整段历史仍全部核验。

新增 `TestRealCLIInlineServerTimeline`：Web search/Web fetch/Advisor 三类 × 普通 inline/签名 compaction 两种 × 新请求、调用结果续聊并移除、冷导入、SSE、回退，共 30 次。顶层空 tools 保持不变、无随机carrier、用户 5m marker 完整；compaction 内 definition 的 1h marker 原样保留，签名块逐字段相等。PASS 23.549s（最初单跑；后续联合测试包含新增1h断言）。

新增 `TestRealCLIInlineToolSearchRoundtrip`：bash/browser toolset × 五流程，共 10 次，工具引用、实际调用及结果保持身份，带显式 cache。PASS 9.533s。与原 `TestRealCLIInlineToolTimeline`、`TestRealCLITypedToolSearchRoundtrip` 联合共 58 次隔离假上游调用 PASS 47.056s。`go vet ./engine` PASS。新单测覆盖未激活调用拒绝、pending server 变更拒绝、失败压缩 no-op、response局部搜索发现、移除后历史名保留但响应调用拒绝、签名改名拒绝且不修改输入。

核心 `TestInlineAdvisorCoreAuthorizationPriceAndMapping` 已覆盖 12 个实际 HTTP 场景；另有 `TestModelReferenceLocationsDoNotWalkToolData`。独立重跑两项 PASS 1.075s，覆盖权限/缺价/账号选择/映射/签名 identity-only/插件 patch 和冻结价格归属。Worker 原 blanket-reject 断言已改为 admitted model 与原协议块保真，并在测试中指明 core 权限测试。本轮尚未部署；真实 provider 对 summary 签名、模型资格与缓存计费不属于 fake wire 测试证据。

旧阈值压缩保留的前缀消息可为引用提供真实已有定义；冷 signed summary import 中缺失的定义仍拒绝，不能猜 schema。最终补充执行：engine 全套 PASS 4.853s、vet PASS。
