# 原生工具目录、版本匹配与交回客户端

日期：2026-10-08。工作区实现，未部署。

## 实现与证据来源

原代码只允许CLI2.1.288原生匹配，因此2.1.292即便名称和schema完全一致也会整体退回MCP。现在按版本选择实测目录，同一名称支持多个已观测schema变体；未知版本仍不会猜测原生支持。生产最终仍使用`verifyNativeWireTools`核对实际出站定义，缺失/重复/不一致只在尚未转发模型请求时允许安全MCP回退。

新增 `catalog/claude-2.1.292.json` 来自本地真实CLI2.1.292、Windows/amd64、隔离HOME/config、假API Key及回环假上游的实际tools字段。上游始终返回text，没有执行采集到的工具。没有从SDK声明猜schema。伴随 `claude-2.1.292.capture.json` 保存场景、工具名和schema hash，不保存凭据或会话内容。

捕获场景：普通default/plan/dontAsk、agent-team开关、显式候选工具；以及与Worker相同的SDK stream-json输入、initialize、permission-prompt-tool stdio两种场景。普通默认观测22个名称，显式候选26个；SDK默认25个，SDK显式29个。合并共29个名称、32个schema变体，Agent/Bash/SendMessage各两个。

这不是“CC所有工具”承诺：ToolSearch、PowerShell、Monitor、GetTask等未在上述条件出现在出站定义，不能伪造。AskUserQuestion/EnterPlanMode/ExitPlanMode只在本次SDK条件出现。未验证Linux实际目录及所有特性开关；目录来源与运行时校验分别保留。

可重复采集：设置`CCG_REAL_CLI`为实际可执行文件、`CCG_NATIVE_CATALOG_OUTPUT`为`catalog/claude-<实际版本>.json`，运行`TestCaptureRealCLINativeCatalog`。测试检查输出文件版本匹配，并额外生成capture证据。不要用旧输出文件名覆盖另一CLI版本。

## 捕获过程中发现的问题

将Write混合测试扩到Read/Bash/Write时首次失败，实际wire显示Bash安全回退为MCP，fake fixture却仍发Bash原名。进一步SDK抓包确认：普通-p Bash schema的run_in_background描述写默认600000ms，SDK模式写1800000ms。虽然仅描述文本不同，完整schema确实不同；实现没有擅自忽略差异。目录记录两种实测变体，混合测试按SDK场景捕获hash选择对应定义。客户端如果送另一种schema，运行时仍可能回退，这属于真实定义差异，不是无条件版本排除。

完整TestRealCLI随后发现MCP把客户端描述中的Unicode省略号`…`改成`...`。schema、名称不变但描述非精确保真。已修复所有工具route带客户端description，Mod对native和SDK MCP都覆盖tool.describe输出；不是放宽测试或规范化预期。新增独立Unicode/中文/换行描述测试，覆盖自定义Read、已有MCP名、自定义工具及native Write。

## 验证结果

- 精确名称+schema匹配、不同schema走MCP、未知版本不复用目录、多变体不折叠：单测通过。
- `TestMixedNativeHandoffRealCLI`：真实CLI2.1.292＋Worker＋隔离假上游，Read/Bash/Write、已有MCP、自定义工具和运行时缺失原生fallback共6工具通过；所有Mod日志为client_handoff/local_execution=false；Write与Bash哨兵文件均未创建；回传tool_result后prefix-hit、SSE回退正常。最终一次耗时4.06s。
- `TestRealCLIClientToolDescriptionsAreExact`：0.80s通过，客户端Unicode和换行描述实际wire完全一致。
- 原`TestRealCLI`完整回归：43.28s通过，70次本地假上游模型请求、0次云端模型调用。包含native↔custom定义切换、历史续聊/分支、system、MCP/native往返、SSE与错误路径。测试中CLI尝试恢复被拒绝的inline system时仍可出现保护性502，此项通过不能解释成所有错误都不存在。
- `go test ./engine -count=1`普通测试集通过（4.598s）。

未做生产部署，未使用平台真实API Key，未声称本地交互式CC接入生产后所有原生工具已经验证。需要发布后按账号CLI版本及Linux实际wire验证，同时保留已有账号容器和授权。
# 2026-10-08 ToolSearch 追加证据

`TestRealCLICaptureInternalToolSearchDefinition` 通过真实 Worker SDK stream-json + deferred MCP discovery，在隔离假上游捕获 CLI 2.1.292 的 ToolSearch 完整定义，无实际工具执行。schema digest 为 `2cbbab2f0a7585db5ac57d4dd479f14d3896134d1a7cb11ad944317e84b36af5`，已附入版本目录和 capture.json。当前为30个不同名称、33个schema变体；此前29/32是未开启此门槛的原探针结果。

`TestRealCLIClientNativeToolSearchStaysClientOwned` 使用此目录原生匹配，不临时修改测试catalog；在deferred门槛可用时真实wire保持ToolSearch名称，Mod将调用交还客户端，tool_result续聊正常，普通模式prefix-hit；带APIformat也正常。门槛不具备时仍保留已有 runtime verification / MCP fallback，不能只凭静态目录保证工具可用。

重新生成整个版本目录时必须同时运行此追加门槛捕获，不能只运行旧的普通capture覆盖掉补充定义。
