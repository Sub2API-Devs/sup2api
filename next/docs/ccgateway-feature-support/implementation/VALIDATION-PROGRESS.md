# 验证基础与真实 CLI 兼容性进展

日期：2026-10-08（Asia/Shanghai）。基线提交：`f7b78a55fa3158317887a46a864d1a32226e99c0` 加共享工作区改动。仅本机 Windows、Claude Code 2.1.292；假 API Key、独立临时 HOME/config、回环假上游。没有生产配置变更、真实云端模型调用、提交、推送或部署。

## 已实施的测试修复

`companions/engine/gateway_test.go`：TestRealCLI 的缓存 lookup 和 prompt-snapshot prepare 使用与 HTTP 入口相同的 `parsePolicyRequest`、实时 scope/session、`toolHistoryNamespace()`。原fixture的裸parseRequest和空namespace会查不到现有快照；nil快照与真实SessionID变化现在分开报错。

修复后基线 `TestRealCLI` 完整 PASS，43.70秒，70次回环模型请求。包括history/system/MCP或原生匹配回退/tool roundtrip/SSE、重启、分支、回退、内置搜索和结构化输出、错误透传/CLI自处理路径。CLI版本不是2.1.288，原生匹配用例按现有版本规则走MCP回退，不能声称2.1.292 native catalog已完整适配。

测试中的`cli-handles-400-with-system`仍观察到网关502和恢复校验信息，这是原fixture明确覆盖的受限错误路径；suite PASS不意味着该场景调用成功或上游system不支持已经解决。

## 新增持久探针

`companions/engine/cli_surface_compat_test.go`，入口 `TestRealCLISurfaceCompatibility`。11个子用例整组执行9.56秒，PASS；其中含明确断言不兼容行为的负例，不能把11个测试通过写成11个特性支持。

从companions目录运行：

```powershell
$env:CCG_REAL_CLI='C:/Users/16790/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe'
go test ./engine -run '^TestRealCLISurfaceCompatibility$' -count=1 -v -timeout 3m
```

没有设置CCG_REAL_CLI时按已有仓库惯例显式skip，不作为验证完成；上述结果设置了真实可执行文件。测试只打印结构/布尔匹配结果和HTTP头名称，不输出Key或自动设备标识。

## 真实观察及归属建议

- `turn.start`事件键：text、turnId。
- `turn.step`事件键：turnId、index、model、effort、messageCount；无body、headers、requestId。
- `model.complete`事件键：model、maxTokens、prompt；无turnId/requestId。
- 生成的CLI类型确认`$.model.classify(text, labels, options?: {model?: string})`；对应hook事件键text、labels、options。
- 主模型和Mod辅助模型均带`X-Claude-Code-Session-Id`，不能仅用session头区分。
- 在turn.step内执行`$.model.classify`，会在同一hook活动窗口发送独立Haiku请求，因此仅用时间窗口/lease不够。

### 请求局部 system marker

`--append-system-prompt`携带每次随机nonce的实验结果：

- 普通主请求有marker。
- stream-json initialize提供自定义systemPrompt后，主请求仍有marker且客户system保持。
- Mod `$.model.complete`辅助请求无marker。
- turn.step内部的Mod `$.model.classify`请求无marker，随后的主请求有marker。
- 内部ToolSearch两轮、StructuredOutput两轮各自都有marker；不是只覆盖首轮。
- marker通常合并到已有system text块的末尾，精确后缀为`\n\n`加marker，不能删除整个块。

建议把marker与可信Mod的turn.step begin/end、辅助模型深度结合；只按model、stream或URL不够。主agent正在实施生产识别与最终剥离；本探针仅验证隔离假上游可见形态，**没有证明生产代码已经把marker剥离且不泄漏上游**。生产必须在转发前剥离、验证仅唯一合法位置、保留客户端原文及缓存标记，异常时拒绝；不要把nonce加进客户端API返回。

### 原生 snapshot 的明确不兼容负例

首次运行snapshot=on，使用marker A；新进程resume同会话且再次snapshot=on，传新marker B：第二次实际system仍含A、不含B。首次按“新nonce应生效”的断言真实失败；已保留为测试中的`UNSAFE_COMBINATION`负例，断言该危险行为，不能标为marker兼容成功。

同一个初始会话，resume时同时设置CLI `--system-prompt-snapshot off`及initialize `systemPromptSnapshot:false`：旧marker消失，新marker出现，客户system保留，PASS。需要marker的请求必须关闭两个snapshot入口；普通不需marker的请求可继续按既有策略管理快照。CLI版本改变后重新验证。

### 尚未证明的辅助路径

`$.model.fork`在本次print-mode的turn.step前/后都返回`isAnswered:false, reason:nothing-to-fork`，没有发辅助请求。对应测试仅断言该环境限制；不能因此推断fork不继承marker。

未实际触发内建auto-mode权限分类器、真正子代理/agentId路径。Worker现有客户端工具由拦截交回客户端，但不能仅据此推断CLI所有内部辅助请求不存在。需要后续专项验证；无法可信识别的携marker请求应拒绝，不盲目patch。

## Server-tool块实验边界

直接CLI接受隔离假上游发来的：

- server_tool_use + web_search_tool_result；
- server_tool_use + tool_search_tool_result，其中含tool_search_tool_search_result/tool_reference。

这些块保留在CLI assistant输出，文本结尾亦保留。仅证明CLI对合成响应的接受/输出；尚未证明Worker解析通过、真实API接受该工具定义、正确执行、次轮历史或计费。已把fixture共享给响应实现agent，后续分别验收。

## CC特有 safeguards 协议

真实CLI主请求自动含`safeguards`；辅助complete/classify没有该字段。不能用这一观察当永久主请求识别规则。

官方[Auto mode classifier request charges](https://code.claude.com/docs/en/auto-mode-classifier-billing)指出网关应保留safeguards、safeguard_results及tool-use IDs，否则客户端可能退回本地classifier或缺少安全判定。它不在公开Messages顶层字段清单中，但属于实际CC协议扩展，需专门兼容，不能让未知字段过滤丢掉。当前没有捕获真实safeguard_results响应的完整shape，不编造字段。

## 实验中已纠正的问题

- 最初假SSE把完整text放在content_block_start而无delta，CLI丢文本并再次请求；改为标准start/delta/stop后恢复。该失败属于fixture错误，不能归因CLI丢普通text。
- 最初Mod帮助函数放在register内部，静态能力编译器拒绝`$`传参，hook未加载。移为顶层函数后通过；未将“插件出现在init列表”当hook生效证据。
- 初次gofmt路径使用了错误工作目录；随后已对真实文件执行gofmt。

官方依据：[Mod reference](https://code.claude.com/docs/en/plugins/mods/reference)、[Mod events](https://code.claude.com/docs/en/plugins/mods/events)、[Mod API](https://code.claude.com/docs/en/plugins/mods/api)。本机生成类型比滚动文档更接近当前CLI，但不能推断生产CLI版本。

## 后续整合验证

marker/RequestPlan/响应首批实现汇合后已再次执行原`TestRealCLI`：PASS，45.00秒，70次回环模型请求。原system恢复受限错误用例仍如上记录，不宣称业务成功。

新增`engine/feature_plan_cli_compat_test.go`，`TestRealCLIFeaturePlanCompatibility`：PASS，6.37秒，9次回环模型请求。通过真实Worker HTTP入口、实际CLI、Mod、relay链路核验：

- Sonnet4.6请求的temperature=0.2、stop_sequences、service_tier最终wire准确应用（假上游不验证模型是否接受，不能写成官方成功调用）。
- 首次rebuild；续聊prefix-hit；关闭这些controls再开启，均保持prefix-hit。
- 回退旧节点fork，实际消息不包含后续主分支内容；空cache模拟新Worker导入为rebuild。
- forced tool_choice真实wire恢复为MCP工具名，客户端响应恢复原名；回传tool_result后prefix-hit且结果内容保留。
- SSE收到message_stop、正文与无error；所有实际假上游请求都检查不含`<ccgateway-request:`，客户system保留。

此批不验证生产OAuth/权限、不调用云模型，也没有覆盖真实内建auto-mode分类器或子代理。因此仍不得声称全部请求归属已可对任意CLI/插件开放。后续实现改变相关路径时重跑这些测试；生产与部署证据另记。
