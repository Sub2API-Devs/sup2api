# 验证矩阵、证据和实施验收

日期：2026-10-08（Asia/Shanghai）。状态：实施计划，不是功能完成报告。

## 1. 怎样才算完成一个特性

以 [特性目录](01-FEATURE-CATALOG.md) 的 feature ID 为单位验收。每项必须具有：官方协议定义、当前代码状态、输入到执行映射、响应及历史规则、模型/认证/版本条件、可理解错误、前端说明与必要策略、验证证据。自然支持的能力也要给出证据，不强行增加开关。

以下条件缺一不能标为“完整支持”：

1. 输入 header、顶层字段、嵌套字段和相关内容块全部有归属；缺失/null/false/0/空数组不误合并。
2. CLI 参数接受不等于生效：捕获实际模型请求，核对对应值及未要求修改的字段。
3. JSON 与 SSE 的返回语义一致，包括新增块、引用、停止原因、用量、错误。
4. 响应原样作为后续请求历史仍可用，包含续聊、回退、分支、Worker 重启、全新调度导入。
5. 账号认证、模型、CLI 版本、上游类型及策略允许均满足；不能用一个账号一次成功推断全局。
6. 前端说明、实际请求处理、日志决策一致；旧 Worker 不得静默忽略新策略。

已知暂不能等价的功能保持单独阻碍记录：缺什么、如何验证可行性、下一行动、临时错误。不能仅把“暂不支持”写入 UI 就将实现任务勾选完成；确认本架构没有等价能力的外部产品边界见 [协议范围](05-PROTOCOL-SCOPE.md)。

## 2. 证据分层

- D：官方文档/官方 SDK 源码，只证明契约或入口存在。
- S：本仓库代码审计，只证明实现路径存在；可能有缺陷。
- U：隔离单测/假 CLI，证明解析、映射和状态机。
- W：真实 Claude CLI + 隔离假上游，证明实际出站请求/CLI 协议；不证明模型接受。
- R：真实目标上游，证明该版本、模型、认证和用例组合可用。
- P：部署后通过平台 API Key 入口验证，证明该线上路径可用；未测公网/CDN则不能扩展范围。

证据必须记录 timestamp、source_commit、Worker build、CLI version、model、provider、auth_method、policy revision、case ID、结果和脱敏附件。pass/fail/not_run/partial 是不同结果；健康检查不属于真实模型验证。

## 3. 已有调研证据快照

源码基线为 `0aa878be9ae6f7b5d327cf1900bccbe7f76347f8` 加当前工作区。三个既有前端文件存在未提交修改，不属于本次文档新增实现。原交接文件未修改。

上一调查轮使用本机 Windows Claude Code **2.1.292**，独立临时 HOME/配置目录、假 API Key、回环 HTTP 假上游，做了 11 组参数捕获；本轮文档整理没有再次运行或把它当生产测试。数据摘要在 [CLI 证据](evidence/cli-wire-2.1.292.json)。假上游返回固定 OK，不校验官方参数，CLI exit=0 不等于上游功能通过。

| Case | 实际观察 | 能证明/不能证明 |
| --- | --- | --- |
| baseline | CLI 自带多项 beta、adaptive thinking、metadata、context_management | 默认行为快照，不是 beta 全集 |
| extra-beta | 额外 beta 发出；与自带项可重复 | 头传输成立，不是账号获权 |
| extra-body | sampling/stop_sequences/service_tier/metadata 发出；effort 覆盖 CLI 值 | 不能整包注入客户端 body |
| tokens-thinking | max_tokens=512；该配置未发 thinking 字段 | 不能把省略解释为上游确实关闭 thinking |
| task-budget | task_budget.total=12000 + 对应 beta | 仅传输捕获；12000低于官方最小20000，属于上游非法值，不能作为合法正例；remaining未验证 |
| adaptive-display | adaptive/omitted/medium 发出 | 模型响应内容未验证 |
| extra-nested-merge | 额外 output_config 键与 CLI effort/task_budget 共存 | 仅该对象样例；不是任意深度合并证明 |
| max-token-cap | 999999 被裁剪为 128000 | 需要实际参数差异记录 |
| thinking-budget | Sonnet 4.6 发 enabled、2048预算、4096上限 | 不说明 Opus 5.5 接受同样组合 |
| fast-setting | speed=fast 与 beta 发出 | 账号资格、真实fast及计费未验证 |
| json-schema | 两次模型请求、额外内部工具，未见 output_config.format | CC agent格式化和API原生格式约束不能混同 |

官方task budget专题目前注明CC/Cowork surface不支持；SDK入口/CLI发出字段不能证明该产品或OAuth账号获权。后续应以合法total和获权API渠道验证，并记录文档与目标运行时差异。见[官方限制](https://platform.claude.com/docs/en/build-with-claude/task-budgets)。

原始临时文件位于 `C:/Users/16790/AppData/Local/Temp/cc-beta-audit-MLZrTx/results.json`、`cc-beta-audit-AJZQHm/results.json`。目录可能被系统清理，仓库摘要已去除自动设备/会话标识、safeguards路径及结果尾部，只保留研究必需参数；没有授权凭据。未对 #21/#22、本次线上版本或 OAuth 出站做新的验证。

已有 7 个聚焦 Go 测试在上轮通过：RequestPolicyAdmission、RunnerRequestPolicyMapping、RequestPolicyFields、RequestPolicyHistoryIsolation、RequestPolicyInvalidConfiguration、StructuredOutputAndCachePolicy、FixedBetaWhitelistOverridesLegacyRules。其中 RunnerRequestPolicyMapping 是假 CLI。

真实 `TestRealCLI` 上轮失败于 `gateway_test.go:726`：`normal continuation changed native session`。测试 lookup 使用旧空 namespace，而实际缓存已使用 attachment-policy namespace；nil 与SessionID不同被合并报错。先修测试索引和诊断再重跑，不能用这条输出直接判定生产续聊失败。该断言之后的 beta/Tool Search/恢复场景未执行，不能列入已通过。

## 4. 按特性验收的测试族

每个测试族均有：最小正例、模型不支持反例、禁用策略反例、输入不合法反例、JSON/SSE一致性、真实出站对照、原样历史回传。只有适用的维度才运行，记录 not_applicable 原因，不盲目做所有组合笛卡尔积。

### V01 协议、路由与隔离

- `/v1/messages?beta=true` 路径匹配、多值大小写 beta、API version、Content-Type、请求大小和取消。
- 平台 Key、Worker Key、控制器管理 Key、上游 OAuth/API Key 四层不混用；客户端不能注入内部policy/scope/路由。
- 模型alias经核心映射后能力重新判断；一个分组混合新旧Worker不随机吞功能；账号池不符合能力与临时冷却分开报错。
- #21 API Key / #22 OAuth 分别指定测试，再验证平台分组路径；随机调度成功不能宣称覆盖两者。

### V02 beta 和非消息参数

- known/unknown/legacy/重复beta、格式长度、CC自带beta与客户端beta合并，头与body功能配对。
- sampling/stop/max_tokens/service_tier/speed/metadata 实际值和模型不兼容错误。
- absent/null/false/0/empty 的差异；参数不能污染内部辅助模型请求或下个客户端请求。
- 不允许把 raw headers/env/任意 EXTRABODY 作为客户端能力入口。

### V03 thinking 与结构化输出

- adaptive/enabled/disabled/between_tools 的模型条件、budget边界、display summarized/omitted/updates、redacted块、空thinking+有效signature。
- prefix绑定 error/drop_block、input_transformations、工具名称和system变化后的历史一致性；不能改签名或隐式删thinking使测试“通过”。
- effort各合法等级、task_budget total/remaining与续聊、format/json-schema/strict工具的不同语义。
- refusal不能被结构化校验变502；结构化失败/内部重提示成本和轮次数可解释。

### V04 system、附件和工具变化

- 顶层system字符串/块数组、消息中system、clear_at及按消息output_config；确认发送位置和次数。
- attribution首块不合并吞掉普通system；附件client/gateway/both，已知单项三选项，未知pass/ignore。
- workingDirectory/platform独立，Windows/Linux、新会话导入和全量历史；模型可见cwd不改变容器实际cwd。
- tool_addition/removal/inline定义按历史位置生效；不能提前把未来工具提供给旧轮次。

### V05 客户端工具

- 普通tool、多工具并行、auto/none/any/指定工具/禁止并行；模型不接受组合原样400。
- 同名同schema原生工具通过Mod拦截，执行仍由客户端；同名不同schema不得错误接管Worker本地工具。
- MCP服务名/工具名保真、多个服务同名方法、自定义MCP模拟前缀、名称冲突和结果ID一一对应。
- input_examples/strict/eager_input_streaming/allowed_callers/defer_loading，tool_result含错误/多块及未知字段。
- client toolset以(toolset_name,name)联合路由；browser/computer/custom同名screenshot往返无冲突。

### V06 Tool Search

- CC内部搜索和API server-side regex/bm25分别测试；明确是否保持原协议或提供显式适配模式。
- true/false/auto/auto:0/auto:100；非官方BASE_URL默认行为与disable experimental的优先级。
- tool_reference、搜索结果、server_tool_use及下一轮历史；服务端调用不能被误转发成要求客户端执行。
- 内部多轮隐藏时，客户端看见的工具名/停止原因/聚合usage一致；超限不能无限搜索或无声截断。

### V07 图像、文档和引用

- base64、URL、file引用，支持的媒体类型、无效编码、大小边界、工具结果嵌套。
- PDF/文本/自定义内容源、引用开关、页/字符/内容块索引、search_result来源和流式citations_delta。
- 引用原始位置与转换后模型内容一致；不伪造文件ID/页码；远程URL受既有出口/大小/超时策略约束。

### V08 服务端工具与状态

- Web Search/Fetch、Code Execution/PTC、Advisor、MCP connector各自工具版本/专属参数/返回块。
- 运行位置、caller、container/files/skills和计费归属不能变成Worker本地执行而不说明。
- 容器过期、账号切换、资源作用域、服务端pause_turn和断线恢复；不支持账户明确拒绝。
- 代码/电脑/浏览器/memory类客户端schema工具，仅负责协议与客户端handoff，不主动在Worker获得执行权限。

### V09 上下文、缓存和回退

- context_management.applied_edits、旧压缩与新compaction互斥、空/失败compaction、后续回放。
- 逐块cache_control与5m/1h顺序、顶层自动缓存、缓存失效；history prefix-hit与上游cache_read计费分开。
- fallback块/最终模型/累计usage、组织workspace绑定credit，不能跨账号兑换。
- 长会话、多轮工具、新账号导入、回退到历史点、分支并发、重启恢复、配置变更和签名绑定。

### V10 流、错误和取消

- 正常事件序列、不完整JSON参数增量、signature/citations、ping、多个message_delta及累计usage，未知扩展事件可处理且不丢语义。
- 401/403/400/429/529、retry-after/x-should-retry、SSE中error、超时/断开、客户端取消、正常200 refusal。
- 保留stop_details/stop_sequence/实际模型/request-id；累计用量不重复相加；隐藏内部调用用量单独可追溯。
- 尚未输出响应与已经写出200后的错误不同处理；关闭子进程/Mod端点、并发锁、临时文件和日志收尾。

### V11 配置、界面和升级

- 一个feature汇总头/body/转换/限制；自然支持仅说明；未支持说明原因与后续路径。
- catalog、policy、runtime capability版本分离；保存revision冲突、旧Worker不兼容、混合账号状态、草稿不误显示已生效。
- 附件前端既有迁移不回退；菜单筛选与详情不丢草稿；只读用户、i18n、键盘和窄屏。
- 页面打开/刷新能力/保存策略不自动推理、不拉镜像、不重建账号；手动升级仍保留授权。

### V12 日志与计费

- 每请求一个索引：输入、策略版本、FeaturePlan、CLI/env脱敏、Mod确认、实际出站差异、结果/历史动作。
- 错误路径也完成索引；开启/关闭/删除、容量上限、截断/丢失显式标志、多并发检索、权限隔离。
- OAuth/API Key/Authorization/Cookie/文件凭据不因“完整日志”泄露；请求内容访问沿用账号管理权限。
- 总usage、缓存/服务端工具/fast/内部搜索用量与核心扣费核对；测试Key消费和临时资源可追溯。

## 5. 实施批次与依赖

- P0：修复验证夹具；建立FeatureRegistry、原始JSON+执行计划、能力版本和日志决策；未知参数不能静默成功。先保护原始thinking签名与前缀，不能保真时明确拒绝；先证明主请求/内部搜索/格式化/权限分类器的可信关联，判别不确定时不应用新patch。
- P1：基础字段、beta开放策略、thinking/output/fast/task budget、客户端工具字段、响应保真；上线只读特性目录和现有策略统一入口。
- P2：Tool Search完整往返、多模态/引用、签名绑定、逐块缓存、会话中system/工具变化/历史恢复。
- P3：context management/compaction、服务端工具/PTC/MCP/container等条件能力；通过可行性门槛后逐项实现，不凭名称假适配。
- P4：count_tokens/model discovery及其他协议入口；与平台现有转换框架结合，独立说明范围和未实现服务。

批次是依赖顺序，不是排除清单。Feature catalog内所有条目最终必须有“已实现并验收”或“有证据的架构/上游限制及明确返回行为”；条件可行/待验证不是结项状态。进度记录每feature的实现PR/commit、未决问题、下一验收动作，不凭总体覆盖率宣布全部完成。

## 6. 后续部署约束

实施时遵循现有用户约定：本地审查/测试/提交/推送，服务器Git获取确定commit后构建；不上传源码快照代替Git。#21/#22先有备份和回滚路径，按授权手动原地更新；容器、卷与OAuth不得因镜像不一致自动替换。镜像准备与现有容器程序更新分别记录。

先兼容性验证，再选账号灰度和平台入口验收，最后逐节点核对版本/ready/策略revision。记录真实503或中断，不能声称零中断。回滚必须同时考虑可读取的policy schema、能力版本、历史格式，不能仅回滚二进制后让新历史变不可读。

官方依据：[SSE](https://platform.claude.com/docs/en/build-with-claude/streaming)、[Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking)、[Token counting](https://platform.claude.com/docs/en/build-with-claude/token-counting)、[CC网关兼容](https://code.claude.com/docs/en/llm-gateway-protocol)。实现证据以本目录引用的源码和后续实际用例为准。
