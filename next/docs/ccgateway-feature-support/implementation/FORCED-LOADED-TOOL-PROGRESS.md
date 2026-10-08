# Forced named 已装载客户端工具实施记录

本候选独立于0.1.66 Read附件修复，尚未提交/部署。只开放ToolSearch功能配置开启、tool_choice=tool命中普通客户端工具、全目录每项显式defer_loading:false的子集。any、任一deferred/未声明deferral、server/typed/MCP/inline/safeguards、JSONSchema工作流不借此helper放行；其它原有API单请求支持不变。

新增forced_loaded_tool.go：判定窄准入并核实最终所有客户端工具存在、schema一致；仅在实际工具已出现在目录且defer_loading未写或为false时，恢复客户端显式false。真实CLI2.1.292省略false已捕获，不接受actual true或缺失定义。请求tool_choice保持type/name/disable_parallel，名称走既有客户↔wire映射。

执行防线：ENABLE_TOOL_SEARCH保留策略值；CCGATEWAY_TOOL_SEARCH只本请求变0，Mod不执行helper；stdio通过internalHistoryAssistant相同判定deny；responseView不增加内部ToolSearch，maxTurns=1。没有将forced临时改auto，没有客户端工具在容器执行。正常搜索不改授权，关闭搜索不凭空注入deferral。

首probe两项真实失败保留：
1. startModControl将deferral目录配置和helper执行环境开关联动，关闭执行后实际只剩DeferredToolPlaceholder/ToolSearch；完整目录校验按预期502。改为存在cfg.deferral即读取，与执行授权分离。
2. 目录恢复后CLI省略显式false，schema一致但字段缺失，校验按预期拒绝；仅对已存在、schema匹配且未标true的工具恢复原false。
另测试夹具重复callID在第二轮被已有账本正确拒绝，改为每响应唯一ID；不是业务放松重复ID校验。

## 验证

- `TestRealCLIForcedLoadedClientTool`：JSON/SSE各new、tool_result续聊、回退分支、cold cache，共8模型请求；每外部请求恰好1上游，完整两个客户端工具name/schema/defer保持，目标description与1h cache_control保真，外部ID/9007199254740993精确，未混入helper响应。
- `TestRealCLIForcedLoadedRejectsHelperResponse`：上游故意违约返回ToolSearch，HTTP502、仅1上游调用，结合Mod/stdio deny断言保证不执行内部搜索。
- `TestForcedLoadedAdmissionAndExecutionBoundary`：any/deferred/implicit/server/typed/MCP/inline/safeguards/format不能误入；stdio/helper分类/responseView负例。
- `TestForcedLoadedDeferralAndExecutionAreSeparate`：普通search、无search、forcedloaded三组，目录与执行权限独立；普通搜索仍允许helper，无搜索无额外目录。
- 真实CLI上述联合PASS8.472s，9次隔离模型HTTP；全engine普通测试PASS5.146s，vet通过。未调用真实提供商。

官方模型能力另列：Opus5.5只支持auto/none，隔离fixture使用该字符串仅测试CLI承载，不能证明该模型支持forced。网关不改模型或参数；实际模型拒绝必须原样返回。本候选尚需独立审查、精确Git Linux候选与真实资格另行验证。
