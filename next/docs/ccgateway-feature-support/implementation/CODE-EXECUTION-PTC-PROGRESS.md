# Code Execution / PTC 第六批进度

2026-10-08。第五批 0c96c681 提交后已接入第六批 Worker 主链及受信资源能力准入。以下区分早期 codec 探针与当前 HTTP 假上游验证；未部署，未证明真实 provider 资格、执行或核心资源登记已验收。

## 归属与接口

Worker 负责官方 code_execution 四个声明版本、三类 server call、结果 union、PTC caller parent/child 因果校验及原始 container 参数保真。计算只能发生在 provider container；Worker 本地 Bash/Read/Edit、CC Skills 和 MCP 客户端执行器不能替代这些功能。Core 负责 container/custom-skill/file 的 owner/issuer/account 绑定和调度。

PTC 首次暂停响应还需登记 parent execution tool ID → container ID。仅证明两个container均属同用户，不能证明它们是同一个执行环境。后续请求的 programmatic tool_result 必须匹配原 parent/container/account。纯 messages 不含历史响应 container envelope，Worker不能从输入猜测这条绑定。

Core 对响应 container 和已登记产物路径的 file_id 执行 RegisterObserved，再返回 public ID。生成文件只有file_id时，同账号资源metadata GET确认大小/expiry后登记。JSON/SSE均须在对应结构对外可见之前完成登记；失败不能泄漏remoteID或重跑推理。入站资源grant不能为本次新产物背书，也不能扫描并替换任意代码/工具input/文本字符串。

## 第一阶段独立 helper（历史记录）

- `code_execution.go`：声明版本/调用类别、caller schema、普通/加密/Bash/editor各结果结构。返回码保持整数，stderr/stdout和加密正文不重写，工具执行错误仍是普通结果块。
- `container_plan.go`：string/null/object的container结构，id/skills可选null；anthropic/custom skill及可选version，保留原null/缺省差异，不把本地cwd或技能路径混入。
- `ptc_ledger.go`：执行parent → programmatic client child；拒孤儿/重复ID、过早执行完成、不完整结果批和非text programmatic结果。直接调用与programmatic结果可同批，仍由公共会话校验覆盖直接工具配对。
- `code_execution_test.go`：九种结果variant、四版声明、caller合法/非法、container字段与原值不变、parent/child及结果批。新增严格caller恢复/输入改动/上下文变化拒绝测试后，目标测试 PASS 1.712s。
- `code_execution_cli_probe_test.go`：独立裸CLI codec探针，不经过当前仍未开放的Gateway准入。六类普通/加密/Bash/editor结果在初次SSE与冷JSONL导入均保真，共12次fake model请求；首次完整运行PASS 10.120s。无真实provider代码执行。
- PTC独立两次fake请求探针确认CLI 2.1.292在首次stream保留caller，但冷历史只删除caller。`ptc_history.go` 只恢复这个已观察缺失，精确比对其他字段；任何现存但冲突caller拒绝。调用方仍必须在其余已登记恢复后做最终完整历史对齐。原CLI负面事实测试PASS 4.122s，不等于Gateway恢复已接线。

## 主链接线设计

ServerTools保留原version/name；code_execution定义控制其明确子工具名，不能授权任意server name。统一主归属relay原样传container与allowed_callers；复用现有终态控制、JSON数字保护及精确历史对齐。先用隔离CLI验证全部结果union、续聊/回退/cold、PTC外部工具交接，再与core资源登记闭环组合。

计费只保留可观测 `usage.server_tool_use.code_execution_requests` 等事实，不用次数、token或HTTP墙钟推算计费执行秒数。真实费用需明确策略与provider证据；模型/资格拒绝保留上游原义。

来源：[Code execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool)、[Programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)、[官方SDK类型](https://github.com/anthropics/anthropic-sdk-python/tree/main/src/anthropic/types/beta)。PTC现行caller版本与allowed_callers版本不是完全相同的枚举；不把旧20250825语义擅自提升为20260120。

## 第二阶段：Worker HTTP 主链已接入

- 声明、结果、主API目录、request/response server ledger加入CodeExec；四版本原type/name保留，Python/Bash/editor按版本识别。
- container进入请求计划保留原JSON。显式CodeExec、隐式Web执行、PTC与执行历史都需要核心授予outputs能力；container/customskill按kind和ID校验，不能以file授权代替。
- 新Web动态过滤类型（web_search 20260209/20260318，web_fetch 20260209/20260309/20260318）在allowed_callers省略或非纯direct时支持隐式Python执行，不向工具目录注入额外声明。纯direct不授权隐式执行；没有显式现代CodeExec不能借Web调用Bash/editor。
- PTC父子ID因果在历史与响应共用ledger；结果须完整text批。完整输入历史结束后仍未完成且产生过客户端child的parent，必须有核心可信contexts中的parent→原container关系。已完成旧历史不绑定当前新容器；新响应不要求预知尚未生成的parent。
- CLI 2.1.292在Gateway续聊还会省略同assistant中暂停的code_execution父块。先精确恢复child caller，再复用完整turn对齐恢复已知parent；输入、名称、ID、现有caller或上下文不同均拒。没有移动任意块或启用本地执行。
- 复用API终态控制；工具错误结果保持正常HTTP200/SSE，不隐式重试。原container响应与server_tool_use.code_execution_requests用量保留，不推算执行秒费用。

### 本轮验证

- 全engine单测PASS 6.976s；go vet ./engine PASS。
- TestRealCLICodeExecutionGateway：6类结果×新会话/续聊/冷导入/SSE/回退=30次假上游调用，PASS 28.422s。保留工具cache、container及历史块。
- TestRealCLIPTCGateway：新parent/client handoff、可信container/context续结果、冷导入、SSE、回退=5次。缺context返回400且无上游调用。PASS 9.017s（测试本体5.02s）。
- 两组增加response container与usage原事实断言后联合PASS 34.638s，共35次。
- TestRealCLIExecutionImplicitAndErrorResults：两种隐式Web执行与三种工具错误结果×JSON/SSE=10次，PASS 14.523s；错误结果未触发重试。
- 新准入和历史反例：无outputs授权、未归属skill、同owner但错误container、pending/complete边界、历史上下文变化，目标单测PASS 3.636s。

上述为Worker HTTP→真实CLI→隔离fake provider，不含core public-ID登记、真实provider资格与云端执行。核心RegisterObserved、JSON/SSE public-ID替换与执行上下文持久绑定由root及资源store owner实现，必须完成该闭环后才可宣称最终客户端支持。

### 冻结点追加回归

`go test ./engine -run '^TestRealCLI(PTCGateway|CodeExecutionGateway|ExecutionImplicitAndErrorResults|InlineServerTimeline|TypedToolSearchRoundtrip)$' -count=1`：PASS 75.401s，新45次与既有inline server30次、typed搜索8次联合，共83次隔离模型请求。

`TestExecutionInlineAliasesAndWithdrawal`：inline添加CodeExec后Bash子调用、完成、撤销，保持历史transport身份但不允许再执行，PASS 1.595s。最新全engine单测PASS 5.127s。源码到冻结点供独立review；没有提交、推送或生产部署。

## 第六批能力目录收尾（2026-10-08）

- 目录版本更新为 `2026-10-08.6`。Files、Code Execution、PTC、Skills 均报告 `partial`，说明实际已实现的固定账号、版本授权、续聊与产物登记；`runtime_verified` 仍为 false，未把隔离 CLI 验证写成真实提供商资格。前端直接渲染同一目录，无额外状态副本或开关。
- 三个旧 beta `code-execution-2025-05-22`、`code-execution-2025-08-25`、`skills-2025-10-02` 加入共享 forward 规则。旧 Python 20250522 的提供商 beta 要求保留；当前 20250825/20260120/20260521 不由网关强制加入旧 beta。本批不新增 Worker 必填 beta 门禁，实际版本与模型限制仍由提供商响应。
- 官方当前 [Code execution](https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool) 明确当前版本无需旧 beta；[Skills quickstart](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/quickstart) 使用稳定 Messages/Skills 接口，无旧 beta 必填。目录不沿用旧版 Skills 必须三个 beta 的说法。
- 执行次数是原始用量事实，不据此推算未返回的执行时长或官方月免费额。
- `go test ./contracts/features ./engine -run 'TestExecutionCatalog|TestExecutionLegacyBetas|TestCatalog|TestBetaRules' -count=1` PASS；覆盖目录状态边界、三 beta 精确保留以及无 header 时不注入旧 beta。未修改第七批 credit runtime/hooks，未部署。
