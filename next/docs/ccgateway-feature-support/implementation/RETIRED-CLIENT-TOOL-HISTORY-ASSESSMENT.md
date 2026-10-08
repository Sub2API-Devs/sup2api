# 已完成、当前未声明的客户端工具历史：只读可行性评估

2026-10-08。仅新增隔离探针，未改业务/目录/部署，未发真实provider请求。

## 官方与实证分层

[Handle tool calls](https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls)要求原assistant tool_use与对应tool_result连续匹配；公开形状为name/id/input，不携带原typed版本schema。本轮未找到“已完成普通client历史工具一定仍须列在本次tools”的明确总规则，也未找到足以保证所有模型接受这种省略的明确承诺，故不把假上游通过当官方合法性证明。

两个明确例外不能一起放宽：[Tool search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)要求后续仍有引用对应定义；[Troubleshooting](https://platform.claude.com/docs/en/agents-and-tools/tool-use/troubleshooting-tool-use)要求未完成server调用保留定义。inline撤销已有时间线协议，不可借未知历史绕过withdraw或未来发现规则。

## 当前具体行为

- client_tools.go validateAPIClientConfiguration开头按apiClientToolNames匹配历史name；没有toolset_name且当前目录找不到时拒绝：historical typed tool identity requires its declaration。
- request.go wireMessage对没有toolset_name的所有历史tool_use调用wireName；一个根本不在当前tools的普通retired_fixture也会改名为mcp__ccgateway__retired_fixture。它没有被注册，但历史本身名字改变。
- 带toolset_name的历史无需当前定义已可过入口；verifyAPIClientHistory根据完整ID/name/input和历史对齐补回CLI省略的toolset_name。不存在“全部无定义typed历史都须新增持久账本”的已证结论。

## 真实CLI隔离探针

retired_tool_history_probe_test.go，CLI2.1.292，独立临时JSONL包含已完成user→assistant call→user result→assistant done，再cold --resume --fork-session；--tools空。三次假上游Messages：普通retired_fixture、typed固定名bash、带computer toolset_name的screenshot。全部原name/id/input在真实CLI出站保留，目录tools为空；screenshot的toolset_name被CLI省略。PASS3.716s（test主体1.85s）。输入只有无敏感fixture，未执行任何历史工具。

探针同时记录现入口：普通工具被MCP改名，bash被硬拒，明确toolset成员入口接受。由此排除“CLI必须注册可执行工具才能带历史”假设。该探针仅传输，不经过生产准入全链、不证明上游模型资格。

## 最小可行设计（尚未实施）

1. 新建只读历史身份集合，按完整已完成call/result位置和ID收集；限定普通客户端direct或无caller、无tool_reference依赖、无未完成server/PTC/MCP责任。name仅用于传输，不据其猜原typed版本或schema。
2. 当前tools/native匹配/SDK注册/Mod许可/响应工具准入仍只使用当前目录。历史未知name绝不加入r.Tools，也不能被未来响应调用。
3. 历史wireMessage对不属于当前已声明身份的已完成调用保持原name/id/input；必要CLI省略toolset_name仅复用现精确恢复，不更改tool_result归属。最终出站再做完整前缀对齐，不能按名字全局replace。
4. 将validateAPIClientConfiguration旧按固定名拒绝缩到真的需要声明的活跃引用/执行情形，不能把历史输入schema缺失当当前执行授权。
5. 更改namespace/cache兼容版本，旧native缓存可能带过去MCP改名；不命中不兼容snapshot，冷重建不注册工具。签名/opaque安全上下文组合先要求证据或继续拒绝，不删除签名。

## 必需验证

首个目标为完成的普通client history，而不是所有server历史：JSON/SSE×同Worker/新cache/回退/长history，原name/id/input/result（大整数）精确；当前目录无该名、模型恶意再call此名必须拒绝且无容器执行；同名当前工具/重命名映射冲突、重复ID/缺result、toolset字段遗漏、API search引用/inline撤销/PTC等分别负例。之后才安排最小真实provider合法性采样，保留其400原错，不改角色或注册虚构schema兜底。

当前结论是“存在明确无需可执行注册的载体路径及过宽入口限制候选”，不是“此功能已实现或所有缺定义历史官方合法”。旧FINAL中一概要求持久typed身份账本应调整为按协议类别区分；普通完整历史原值已能携带的身份，不必先猜它原来是什么typed定义。

## 单次真实账号资格尝试：未取得提供商结论

经root明确授权，在#22现有容器以UID1000直接SSH执行独立临时测试命令（未上传源码/脚本文件）。独立/tmp synthetic JSONL含已完成retired_fixture和bash的call/result，末尾只要求HISTORY_READY；--tools空、max-turns1、setting-sources空、no-session-persistence，原授权未读取或修改。loopback转发在发送前必须验证tools空与原call精确，只容许一次/v1/messages真正转发，后续拒绝。

95秒硬超时后进程被终止：attempted=0、forwarded=0、provider_status=null、无终态/HISTORY_READY、无tool事件。测试没有取得真实提供商响应，不能写为API拒绝，也不能据此否定已完成历史合法性。临时fixture保留，未删用户数据、未重复尝试。

只读核对同netns iptables OUTPUT/mangle为ACCEPT，nat OUTPUT仅DockerDNS规则；未证明旧loopback出口限制是本次原因。CLI stderr未保存以避免无意记录凭据，当前只能定位至受控relay收到主请求之前没有完成，不能猜OAuth/网络根因。未改防火墙、不占线上8787、不重启服务。后续若继续资格实验，需先设计可脱敏观察启动失败且不增加模型次数的方式，由root另行安排。

### 无模型setup诊断补充

#22 UID1000、HOME=/home/node；--version确认2.1.292且exit0；只读auth status仅提取loggedIn=true/exit0，未打印邮箱/token。原SSH Node启动使用spawn默认stdin pipe但没有end；本机成功Go探针stdin为nil(/devnull)。[Node子进程文档](https://nodejs.org/api/child_process.html#subprocessstdin)明确，等待全部stdin的子进程必须等该流关闭。因此原命令存在输入未封口的明确setup缺陷，不能先归因于API或网络。

修正方案：stdio[0]=ignore，stdout/stderr只做有界结构/错误类型摘要；本测试使用命令行-p文本及resume，不是stream-json输入，不需initialize控制帧。先以转发永远拒绝的零provider启动测试确认relay可见，再决定唯一实际提供商调用。此段仅报告方案，尚未发起新的模型进程。

### stdin修正后的零转发检查

按root授权执行一次zero-forward诊断，stdio[0]=ignore；loopback处理器即使收到合法请求也固定本地拒绝，绝不发provider。20秒硬终止，attempted0/forwarded0，仅system类型事件，无result/tool事件，stderr0。检查未通过，故没有执行条件授权的真实provider转发，也没有盲重试。只读env布尔显示HTTP/HTTPS/ALL_PROXY均未设置。

原stdin遗漏属明确启动缺陷，但修正后仍阻断，不能称它已证明是唯一根因。下一诊断应观察system subtype、resume与no-session-persistence组合和环境启动路径，仍不得把没有请求到relay当提供商拒绝。当前普通历史原值传输的可行性仍来自本机隔离CLI三例；真实API资格未得到结论。

### 路由统计口径纠正（未再启动CLI）

只读复核保留的启动命令，路由regex接受/v1/messages及?beta=true，因此不是query导致精确等号漏计。但attempted只在主path匹配后增加；非主route被400拒绝却未计数。前述“未进入relay”只能收窄为“没有匹配主path被统计”，不能断言总HTTP为零或网络失败。旧记录仅event.type，没有system/control subtype，stdout只在已退出进程内存，无法回溯握手/permission状态。

已准备evidence/retired_history_setup_diagnostic.cjs，默认且实际无provider转发代码，stdin ignore；新增total_http、主path/count/other路径计数（不保存query参数）、事件type/subtype安全枚举，仍20秒硬限。仅node --check语法通过，没有执行脚本或新模型进程。由root后续统一测试；服务器执行须遵守Git取源码或获准独立命令，不上传产品源码。

### 与生产Worker relayEnv对齐（待Git候选运行）

root发现另一个具体环境差异。对照runner_config.go:205–219，first-party loopback carrier设置_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1，并以已有NO_PROXY/no_proxy为基础同时给两者追加127.0.0.1,localhost。诊断现已复制这三个非秘密变量，不添加APIkey、不读取OAuth、不改变授权。原探针缺该标记可能影响CLI对自定义base的OAuth行为，但尚无新实验确认，不能把它宣称为已证根因。

冻结文件：evidence/retired_history_setup_diagnostic.cjs、engine/retired_tool_history_probe_test.go、本评估文档。node --check语法通过；本次没有启动CLI。由root提交推送后，服务器从精确Git候选读取脚本，仅做一次零转发诊断并观察总HTTP/path/subtype。
