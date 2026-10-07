# 独立审查与整改记录

日期：2026-10-08。本记录区分源码审查、定向单测、真实 CLI 和生产验证。本轮未部署，也未执行新的生产推理；目录中的 partial/unsupported 是实施中基线，不能当作整个计划的终局交付状态。

## 共享契约、核心目录与构建上下文

审查对象为主 agent 新增的 companions/contracts、features GET、核心/Worker BetaRules 共享引用、Go module/workspace及Docker上下文，审查者并非这些实现的作者。

发现并修复构建阻断：`next/Dockerfile.dockerignore`原先排除整个companions，而核心新go.mod/go.work依赖其中contracts。改为继续排除Worker业务模块，但显式允许contracts进入核心构建上下文。Worker Dockerfile已复制contracts/go.mod，独立模块replace路径正确。真实Docker构建仍需在服务器验证，不能仅凭源码检查声称镜像成功。

新增contracts测试验证：目录ID唯一、基础schema与前端所需非null数组、runtime_verified显式false、Catalog深层slice互不共享、BetaRules跨调用修改隔离，以及文档中提及的beta不自动进入执行白名单。源码目录当前36项。

新增核心GET测试验证：匿名401；无settings:read的用户403（包括只有settings:manage）；settings:read可200。使用空Service且没有数据库/SSH/Worker，证实只读目录不依赖运行时；检查no-store及源码目录版本，未把健康检查或目录响应解释为运行时功能验证。

通过命令：

```text
contracts/: go test ./features
contracts/: GOWORK=off go mod tidy -diff
contracts/: GOWORK=off go test ./features
worker/: GOWORK=off go list -mod=readonly -deps ./cmd/worker
server/: GOWORK=off go list -mod=readonly -deps ./internal/ccgateway
server/: go test ./internal/ccgateway -run '^TestFeatureCatalogAuthorizationAndNoRuntimeDependency$' -count=1
```

首次gofmt命令在next目录使用重复next前缀而路径失败，已更正相对路径后成功执行；没有因此声称首次命令成功。go.work已格式化，相关新增Go文件已gofmt。

## 请求计划审查

审查对象为另一 agent 编写的feature_plan.go及parsePolicyRequest新增链路。原始请求与计划字段被独立复制；出站字段先准备patch，metadata冲突时不会留下部分更新；诊断视图与原始请求返回副本。主模型归属校验属于relay实现及其测试范围，不由这些纯解析测试代替。

工具选择检查：请求声明名称先校验，forced choice无工具、与手动thinking、内部ToolSearch或结构化续轮组合会拒绝，名称在实际调用时转换为wire名。将来实现续轮阶段处理后才能撤销对应拒绝，不能简单移除校验。自适应thinking不能全局禁止forced工具，见下方规范修正。

metadata检查（首轮审查记录，冲突规则已撤销）：客户端user_id只允许string/null且限制字符数，因此正常解析后map断言有类型不变量；null metadata对象与metadata.user_id=null不同。补充各字段的null、boolean、array、object错误输入回归，均返回错误而非panic。当时接受了“与CC已有归属信息冲突即拒绝”的假设；后续官方协议复核确认缺乏依据并会破坏真实CC客户端接入，已撤销，详见 `REQUEST-PROGRESS.md` 的上线前纠错。当前显式metadata原样用于主请求，HTTP鉴权另层保持不变。

发现并修复数值边界：单纯Float64范围检查会将`-1e-9999`舍入成负零、将`1.00000000000000000001`舍入成1，错误接受范围外值。现保留原始JSON数值，用mantissa排除微小负数，并仅在浮点值等于1的边界用按输入长度选精度的big.Float复核；top_k依旧Int64校验，溢出和非整数拒绝。新增上下界、溢出、极小合法正值和错误类型回归。

合法temperature=0.2仍进入参数计划，不因某个新模型拒绝而在网关统一禁用。官方API说明新模型可能仅接受temperature=1、top_p>=0.99且不接受top_k；这是上游模型约束，需保留精确400内容，不能称为网关转换失败。[Messages API](https://platform.claude.com/docs/en/api/messages/create)

当前policy header尚无schema_version握手与旧Worker能力拒绝；新增RequestPlan是Worker进程内部状态，没有作为新policy格式跨网发送。因此本阶段不宣称完成版本化激活；该项仍需核心/Worker协议统一设计及测试。

## auto:N三端对齐

官方ENABLE_TOOL_SEARCH允许auto:N的N为0–100，之前只允许1–100属于遗漏。[官方MCP配置](https://code.claude.com/docs/en/mcp#configure-tool-search)

UI、核心保存校验、Worker内部policy校验现统一接受规范十进制auto:0到auto:100；全部101个值逐个覆盖。三端共同拒绝-1、101、小数、空值、溢出数字，以及+1、01、空白等非规范写法（Go旧Atoi曾接受部分非规范值，前端原本拒绝）。已保存auto:0可正常加载并保留为select当前选项，不因UI没有预设选项而丢弃。

通过命令：

```text
companions/: go test ./engine -run 'TestGenerationPlan|TestForcedToolChoice|TestToolSearchThresholdRange' -count=1
server/: go test ./internal/ccgateway -run '^TestToolSearchThresholdRange$' -count=1
web/: npx vitest run src/views/ccgateway/requestPolicy.spec.ts
```

未跑数据库全suite，未重复无关UI套件。后续集成仍需真实CLI出站对照、主/辅助请求隔离和精确上游错误验证。

## 最新规范交叉复核修正

另一调研agent指出metadata长度和adaptive thinking限制后，重新读取官方当前文档并修正前轮审查遗漏：

- `metadata.user_id`当前最大512字符，不是256。实现改为按Unicode字符计数512；测试256/257/512个多字节字符精确保留，513拒绝。[API metadata定义](https://platform.claude.com/docs/en/api/messages/create)
- 手动 `thinking.type=enabled`不支持forced工具；adaptive可支持，官方单独指出Opus5.5/Sonnet5.5/Fable5.1/Mythos5.1等模型限制。移除adaptive全局拒绝，保留enabled拒绝；针对Opus5、Opus5.5、别名检查网关不改写any/tool请求，由上游决定具体模型并返回精确错误。测试接纳仅代表网关保留该请求，不代表上述模型全部支持。[官方工具选择规则](https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools)

通过：`go test ./engine -run 'TestGenerationPlan|TestForcedToolChoice|TestAdaptiveThinkingForced|TestMetadataUserID' -count=1`。CLI真实模型返回仍由主agent的出站/上游验证负责。

## 请求日志留存与并发审查

主agent将日志超限由整目录删除改成保留partial记录后，本轮独立审查进一步修复：

- 旧store锁只覆盖部分文件操作，Mod/relay并行reserve会写fields，主请求stage/fields和finish编码却未锁；store=nil的诊断没有并发保护。新增每请求mutex，统一store→diagnostic锁序，main调用改为安全setter，读取/修改/完成快照同步。
- 网络ResponseWriter.Write移到日志锁外，避免一个慢客户端阻止账号关闭日志及清理。日志写失败标记partial，超过内容预算标记truncated；不能两者都称complete。
- 完成步骤持锁关闭文件、记录响应头与metadata、移除active，并标记finished，拒绝迟到Mod/relay继续捕获。关闭日志清空active目录后，即使重新启用，旧请求finish也不能重建旧日志。
- 内容64MiB到达后保留已有文件，后续正文和trace不增长，请求传输和Flush继续。completion metadata单独保留；详细消息摘要过大时删摘要并明确标记metadata_details_truncated，将当前元数据结构控制在256KiB内。请求头也纳入内容预算。
- 核心原来只返回enabled，丢弃Worker上报的limits。改为白名单DTO透传正整数、安全范围的限额，兼容旧Worker缺少字段，隐藏未知额外信息及未识别overflow行为。
- 账号UI按每个Worker实际上报显示限额；旧版本没有完整字段则显示未报告，绝不硬编码宣称64MiB或partial保留。中英文同步，不再承诺无上限完整日志。

新增/更新回归覆盖：已有artifact留存、truncated completion、超过64MiB停止增长、SSE继续及Flush、关闭再开启不复活旧请求、慢客户端不锁住disable、store有/无两种并行trace与元数据、完成后迟到事件拒绝、metadata摘要独立预算、核心限额投影/异常/缺失/私有字段过滤、前端旧Worker降级与实际限额显示。

验证命令：

```text
companions/: go test ./engine -run 'Test.*RequestLog|TestTrace|TestRequestDiagnostic' -count=1
server/: go test ./internal/ccgateway -run '^TestRequestLogLimitsProjection$|^TestRequestLogsRejectMalformedSwitch$|^TestRequestLogsManagementRoutes$' -count=1
web/: npm run typecheck
web/: npx vitest run src/views/ccgateway/AccountRuntimes.spec.ts
```

核心定向测试、前端类型检查和5项账号组件测试已通过。日志完成态整改的复测一度被并行server_tools实现缺少符号阻断；相邻实现补齐后已重跑上述日志定向命令并通过。未声称Windows本地race成功；Linux race由主agent后续安排。未使用数据库全suite或生产请求。
