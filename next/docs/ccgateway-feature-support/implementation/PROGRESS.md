# CCGateway 特性实施进度

开始日期：2026-10-08（Asia/Shanghai）。状态：实施中，尚未按本轮方案部署。原始调研保留为基线；本目录记录实际实现、实验、失败、评审和发布证据。

## 本轮授权与约束

- 根据上级目录 36 个 F-* 特性及 8 个 O-* 横向任务完整评估并实施能保持语义的方案。不可等价项必须记录证据、拒绝行为与理由，不能以接收参数但忽略处理宣称兼容。
- 通用 API 特性放在「请求与工具」对应菜单，按功能聚合头、body、响应、历史；「附件与环境」改为「CC 特性」。自然支持项解释即可。
- 持续会话、完整历史调入新账号、回退后分支、system/工具/缓存均纳入测试。
- 可使用本地 CLI、#21/#22、cc-max 及 OVH 隔离测试环境；不得干扰 OVH 其它服务。保留账号容器/卷/OAuth，不按镜像差异自动重建。
- 部署使用已提交并推送的 Git commit，由服务器 Git checkout 后构建。不得上传源码快照。
- 每批实施后由非作者子代理复核，整改后才记录完成。用户不需要中途答疑；未决事项记录并采用有依据的合理方案。

## 起始状态

- Git 基线：f7b78a55fa3158317887a46a864d1a32226e99c0，分支 feat/next-platform。
- 已有未提交 UI 附件三选项/配置迁移修改纳入本轮；独立 cwd_probe_cli_test.go、artifacts/、pelican-bicycle.svg 不视作本轮实现证据，不擅自删除或提交。
- 文档中采样/停止词/完整 tool_choice 等请求能力确有缺口；真实 CLI 历史测试旧 namespace 夹具正在修复，不能先归因为生产续聊故障。
- 会话原有持续目标仍为 active；本次 CreateGoal 因已有目标失败，没有重复创建或把旧目标伪标完成。

## 分工与文件所有权

- 主代理：整体设计、共享特性目录/协议契约、core/plugin 路由、relay 主请求归属与最终 wire 处理、集成评审/部署/总验收。
- audit_code_beta：请求解析/RequestPlan/CLI 配置，第一批非消息参数和工具选择；记录 REQUEST-PROGRESS.md。
- research_cc：前端功能目录与 CC 特性重组、配置迁移/展示验证；记录 UI-PROGRESS.md。
- research_api：隔离真实 CLI 基线、历史夹具、主请求识别/复杂协议可行性实验；记录 VALIDATION-PROGRESS.md。
- 共享文件改动先协调，所有人不自行提交、推送或部署；主代理统一集成。

## 实施批次与退出条件

1. **基础与契约（进行中）**：保真字段计划、功能目录、版本、主模型归属、修正历史夹具。功能未真正接入 relay 前不得显示支持。
2. **普通 API 完整往返（进行中）**：采样/停止/metadata/工具选择/工具元字段/推理/输出/缓存、system 元信息及响应保真；逐项请求-响应-历史测试。
3. **复杂协议能力（进行中）**：服务端工具、Tool Search、文档/资源、上下文/压缩等逐项实际 CLI 验证；可兼容项实施，不可等价项明确拒绝并说明。
4. **调度与协议边界（进行中）**：历史复用/新账号/回退分支，附属端点及其他协议的适配范围，日志溢出/取消/错误分类。
5. **独立评审进行中，部署待开始**：代码规范/语义/安全边界评审整改，Git 提交推送，服务器 Git 构建到隔离测试环境和专用 cc-max，逐功能实测。
6. **完整验收（待开始）**：36 个特性与 8 个横向任务逐条给源码、测试、实测和限制；不能把部分通过、假上游通过或部署成功混为全项完成。

## 当前记录

- 2026-10-08：核对调研文档及当前源码，启动三条子代理工作流。CodeGraph 项目绑定通过；主要已知文件直接读取。
- 2026-10-08：确定 Request.ApplyMainRequestFeatures 接口；仅已确认归属的主模型请求可覆盖客户端参数，不能将参数无区别应用到权限分类器/内部请求。
- 2026-10-08：共享特性目录采用插件配套独立 contracts 模块，数据/契约与 engine、核心运行逻辑分离；前端从 core 读取目录，不维护另一份能力状态。

## 第一批实现与证据（2026-10-08）

- UI：通用 API 特性/CC 特性重组；后端 `GET /system/ccgateway/features` 单一目录，明确 `runtime_verified=false`；19项组件测试及类型检查通过。独立审查修复 core Docker context 排除 contracts 的构建阻断。实际浏览器检查被 CUA 连接错误阻断，不能称已视觉验收。
- RequestPlan：采样、停止词、service_tier、tool_choice 的精确JSON验证与出站覆盖；metadata.user_id上限512并保护内层身份。数值边界经独立审查修正；adaptive+forced不做全局误拒，模型限制由上游判断。
- 主请求归属：每请求随机 append section + 已鉴权Mod turn租约，严格剥离后转发，不改辅助 model.complete/classify。原生 snapshot 会重用旧nonce的失败已实测保留；新参数请求同时关闭CLI与initialize的snapshot开关。逐turn校验和nonce其它位置泄漏防护经过独立整改。
- 真实 CLI 2.1.292 隔离验证：原TestRealCLI修fixture后70次回环请求完整通过；新FeaturePlan九请求覆盖新会话、续聊、开关切换、回退fork、新cache导入、forced工具结果续聊及SSE。最终wire无nonce且客户端system保留。只证明真实CLI+假上游链路，不证明真实上游模型采用参数。
- 响应：登记6类非执行envelope扩展；真实CLI流能保留，但JSONL除stop_details外不保证落盘。因此新增响应RawJSON checkpoint链，关联native anchor和client hash，支持重启/分支与旧snapshot；不将envelope塞回messages。structured原有不建native snapshot仍是待补持久化边界。
- SSE：主代理复核发现message_stop重建丢扩展，已整改。真实CLI→完整Worker HTTP外部JSON/SSE × start/delta/stop × structured共12组合验证通过，终止事件仅一次，late safeguard结果不搬到start。
- 日志：超64MiB保留有明确truncated状态的partial记录；关闭purge不复活，完成后拒迟到记录，metadata独立256KiB预算。独立审查补每request互斥与固定锁序、慢客户端不阻塞日志开关。core透传实际限额，UI展示24h/单请求/软总额，旧Worker明确未报告；定向Go与UI测试通过。Linux race仍待执行。
- Tool Search：原生CLI server search块续聊/fork/新HOME导入实测可行，已开始Worker codec/typed工具注入；首个完整6请求Worker回归通过，边界测试与独立审查未完成，尚未标正式支持。
- 新发现CC专有字段safeguards/safeguard_results，已新增专项研究/实现任务；不能只靠公开API字段清单宣称CC全面兼容。
- 原生工具：2.1.292实测目录收集到26名称、28schema变体，目录升级/混合工具验证进行中，未观察的隐藏工具不伪造定义。

分项日志：[UI](UI-PROGRESS.md)、[请求](REQUEST-PROGRESS.md)、[响应](RESPONSE-PROGRESS.md)、[历史响应](HISTORY-RESPONSE-PROGRESS.md)、[验证](VALIDATION-PROGRESS.md)、[独立评审](REVIEW-PROGRESS.md)、[归属审查](ATTRIBUTION-REVIEW.md)、[服务端工具方案](SERVER-TOOLS-PLAN.md)。

## 部署准备与禁止误报

第一批checkpoint验证：companions、Worker、contracts、平台插件的各模块普通单测和vet通过；core仅定向ccgateway配置/目录/日志等无数据库测试与包vet通过（未冒充core全库数据库测试）；前端typecheck及27项组件/策略测试通过。真实CLI大回归在2.1.292目录升级与MCP描述修复后再次70次回环请求通过，另有API搜索6次、RequestPlan9次、safeguards4次、HTTP响应位置12组合证据。所有假上游结果只作该层证据。

已补CC safeguards主请求保真，保持Mod/stdio本地执行deny；历史工具名会改变时明确拒绝。2.1.292目录最终为29名称、32schema变体；Read/Bash/Write+已有MCP+自定义+缺失工具fallback混合验证无本地写文件副作用。具体模型的真实classifier verdict、Linux跨平台目录与真实API行为仍待下一阶段验证。

- 第一批检查点已提交并推送：`e927e44f04182b1ee8e0942889ccedd2085edb9b`，96文件；线上仍是此前版本，尚未替换/重启账号容器。目录unsupported/partial是当前实施状态，不是所有不可行项的最终结论。
- 只读检查OVH当前账号为debian，HOME `/home/debian`；生产sup2api四节点端口3130–3133，多种其它服务运行中。隔离PG45432/Redis36379存在，不得拿生产数据库跑测试。
- cc-max `/root/sup2api`为现有Git checkout（只读观察HEAD36aeea1c5）；已有git-release目录、Worker0.1.64镜像及#21/#22旧镜像标识的保留容器。尚未更新、重启、删除任何服务器资源。
- 本机无gcc/CGO，race尝试未成功，不能把并发单测写为race通过；计划在服务器Git拉取checkpoint后用隔离Linux构建环境运行。

### 检查点服务器验证

- cc-max经Git fetch检出 `/root/ccgateway-features-e927e44f0`，OVH经Git fetch检出 `/home/debian/sub2api-next-test/git-features-e927e44f0`；均核对完整commit与干净工作区。没有上传源码。
- cc-max使用Go1.27.1/GCC隔离容器、只读源码、2CPU/2GiB运行 `go test -race -p 2 ./engine`，通过（15.465s）。原有worker-builder镜像实为Go1.21.13且无GCC，未拿它做伪验证。
- 从该Git检出构建 `ccgateway-worker:features-e927e44f0`，CLI明确2.1.292，镜像revision标签为完整commit。镜像构建通过；断网临时容器默认8787健康检查通过。首次探针漏设必需的合成CCG_API_KEY被正常拒绝，补齐隔离key后成功；未挂载账号授权或调用云模型。
- Linux真实CLI全组验证已在独立断网容器完成，`-test.run TestRealCLI -test.v` 最终PASS/exit0；产物目录 `/opt/ccgateway-runtime/feature-validation-e927e44f0/`，日志 `cli-linux.log`。覆盖该checkpoint全部真实CLI前缀测试（含响应12组合、safeguards、搜索/历史等）；仍是隔离假上游，不是账号真实推理。

### 第二批当前分工

- audit_code_beta：正整数max_tokens权威值已本地实现/实测，0token预热JSON到CLI SSE桥接进行中；不是只接受0后照常stream推理。
- research_api：document/URL image输入及引用历史保真；发现CLI丢citation/clear_at/inline effort的负证据，引用恢复实施中，system生命周期扩展仍未开放。
- research_cc：Worker能力端点/core只读账号代理/controller GET白名单/UI账号能力和schema1契约，本地验证已做，数据库ownership/Python控制器待服务器验证，账号列表分页收尾中。

### 第二批追加进展（尚未提交/上线）

- max_tokens：正整数主请求保真及0 token非流预热桥接已实施，gzip/逃逸marker与历史不污染经过独立整改，真实CLI隔离HTTP测试通过，详见LIMITS-PROGRESS。
- metadata：纠正第一批错误的“身份冲突拒绝”；官方user_id是归因而非鉴权。显式metadata对象原样替换、缺省保留CLI；HTTP凭据始终仍属容器。真正本地外层CC测试暴露system缓存块边界错误，缓存owner已修，完整双CLI回归继续中。
- thinking/output：发现CLI会省略disabled、强加默认effort、拒绝API updates/between_tools参数；现由已归属主请求表达API语义。API format改为真实上游约束解码，refusal/截断单次返回；首批假上游往返通过，签名历史与独立审查进行中。
- 主代理：新增direct服务端web_search/web_fetch的6版本API定义、结果/错误/引用、URL source专用工具名路由；36次完整Worker/真实CLI隔离请求通过（6版本各新/续聊/下一轮/回退/新cache导入/SSE）。不执行本地抓取，不把上游工具变MCP。pause_turn及未完成服务端调用与客户端工具混合还在适配，不宣称完整Web协议完成。独立审查已分派research_api。
- F-CACHE及media的共享历史对齐仍在收尾，禁止在完整外层CC测试和审查前部署第一批checkpoint到#21/#22。

## 验收台账

### 第二批续接记录（2026-10-08，当前未提交部署）

- Metadata 已纠正并完成真正外层本地 Claude CLI → Worker → 内层 CLI → 隔离假上游测试，两种合成认证模式保留外层 user_id 原值；这不是实账号 OAuth 验证。
- F-CACHE 原位断点、1h/5m 顺序、顶层自动缓存及新/续聊/fork/冷导入已实现并独立复核。显式缓存与尚未适配的内部轮次/服务端工具组合具体拒绝，不默默挪动断点。
- F-THINKING/F-OUTPUT 使用已归属主请求 API 参数；去掉 CC 默认 thinking/effort 对普通 API 的干扰，API JSON schema 不再模拟成 StructuredOutput 工具。真实 CLI 的终态/拒绝/截断、签名历史与冷重建已过隔离测试。
- F-SYSTEM 增加 clear_at 和 inline effort 元数据，保留原位置/生命周期；空 effort-only system 没有文本伪装。25 项及 12 轮长历史隔离测试完成。普通客户端 system 不被附件来源策略删除。
- F-CONTEXT/F-COMPACTION/assistant-tail 已实施；Opus 的暂停续接和压缩响应回放通过，Sonnet 额外 Auto Mode 安全附件无法等价恢复的生成组合仍明确拒绝，绝不搬移/删除安全指令。独立复核修复 thinking.signature 被误判为 compaction.signature；JSONL 轮询未变时不重复扫描。
- F-COUNT-TOKENS 首版独立复核发现计数 CC 扩展输入的语义错误，已改成计数客户端原始 body；6 项真实 CLI及 40 轮长历史/原始 schema 字节一致测试通过。Sonnet prefill 计数通过；不调用生成上游、不创建历史快照。
- F-WEB-TOOLS 已扩展至 7 版本；36+6 次完整 Worker/真实 CLI 隔离请求及8次混合延迟服务端结果流程通过。嵌套 WebFetch document 的缓存字段审查问题已修复，客户端引用来源纳入精确对齐。
- F-ADVISOR 三种结果与续聊/移除定义/冷导入12次隔离请求通过，CLI 省略的 Advisor 历史通过已注册 omissions 与完整非 system 序列校验恢复。只有 Advisor 块的历史组合仍在复核。
- Task budget 六项合法参数隔离往返通过。Fallback 响应桥接修复 CLI 漏掉原始 SSE 边界和历史块/trigger；10 项真 CLI 隔离验证通过。请求 fallback/credit 仍待多模型账务、非流式原始 JSON 桥接和账号亲和，不能据响应 codec 开放请求。
- 平台关联模型计费：官方 Advisor 顶层 usage **只包含 executor**，额外顾问 tokens 必须独立计价。新增描述式附加 usage 抽取、累计快照替换、独立价格快照、预扣与结算持久化；gateway 校验关联模型的分组权限、账号模型及价格并映射字段。独立复核修复插件 BodyPatch 在前置检查后改变关联模型的越权缺口。JSON/SSE/重复事件/未知模型账务错误测试通过；真正 PostgreSQL 结算重试测试仍待 Linux 隔离数据库。
- 主代理独立账务复核修复 Submit(nil) 在拷贝附加项前被解引用的问题，回归通过；不是只依赖实现者自测。
- F-CLIENT-TOOLSETS/F-INLINE-TOOLS 正在实现，四类 typed/toolset 首16次真 CLI 隔离流程通过，但完整版本/工具时间线组合未完成，勿提前标完整支持。
- F-FAST 与 Diagnostics 正在补主请求精确保真和可信 scope/message ID 归属索引；不得将 metadata/session_id 作为租户鉴权。
- Worker 普通单测、vet 通过；前端 `npm run typecheck` 与4文件25项组件测试通过。误用 pnpm 自动生成的 lock/workspace 文件已移除，`npm ci` 使用原 package-lock 恢复依赖；不把失败 pnpm 命令写成成功验证。
- 第一批 checkpoint 的 Linux race/完整真实 CLI 隔离测试已通过；第二批仍需新 Git checkpoint 后重新验证。没有把尚未提交的变化传至服务器，也没有重启/替换 #21/#22 或 OVH 其它服务。

当前分工：主代理集成/关联模型准入/独立账务审查与部署；audit_code_beta 多模型账务基础及主代理 gateway 独立复核；research_cc typed client tools/toolsets/inline 工具时间线；research_api 服务端工具独立复核、fast/diagnostics。详细证据见本目录各专项 PROGRESS/REVIEW 文件。

### 第二批冻结与集成检查

- 三个子任务已达到当前检查点冻结状态。typed12版本×6流程、API ToolSearch与typed组合8流程、inline引用/按值10流程已通过；独立复核修复typed搜索引用和移除toolset定义后的历史身份恢复。非空compaction.tool_changes、inline服务端工具暂时具体拒绝。
- 快速模式不再只设置CLI fastMode；精确主wire值与缺省清理已经实现。缓存诊断用可信host scope及Worker消息ID归属索引验证，1小时/4096条有界，独立于调试日志。受控授权/注销换代防旧请求迟到复活，宿主机绕过接口换授权仍是明确运维边界。
- 独立账务复核后，Compaction同样进入额外计费项，主模型身份由核心传入，不信任任意response model。JSON/SSE真实HTTP测试通过，包括最终speed/服务等级/地域和Web用量事实、重复delta不重复收费。
- 新SDK事件级facts需要声明后才可映射，初次整合检查因未扩展schema验证而失败，已补声明校验与enum回归，不通过放宽未知字段修复。
- 前端类型检查与25项定向测试再通过；Worker全部单测/vet通过；插件manifest测试已从错误的“每个SSE事件都有全量字段”假设改为实际累计快照语义，并通过。正在运行当前整个 `TestRealCLI` 集合；不能把尚在运行当完成。
- 当前其他协议/资源结论：next的converter registry尚无builtin转换（legacy存在另外一套）；Files/container/MCP connector资源字段的CLI传输probe8场景通过，但平台资源归属/端点产品未建立，继续明确拒绝。下一批复用legacy codec的设计见 PROTOCOL-CONVERSION-PLAN；资源边界见 RESOURCE-PROTOCOL-BOUNDARIES。

所有特性初始均为待评估/未完成。下列行只记录本轮工作状态；现有能力不是不存在，也不代表本轮已验证。

- 请求/输出：F-MODEL、F-LIMITS、F-STREAM、F-SYSTEM、F-MESSAGES、F-THINKING、F-OUTPUT、F-SAMPLING、F-STOP、F-METADATA、F-CACHE、F-DIAGNOSTICS。
- 工具/资源：F-TOOLS、F-TOOL-CHOICE、F-TOOL-SEARCH、F-TOOL-STREAM、F-CITATIONS、F-IMAGES、F-DOCUMENTS、F-FILES、F-SKILLS、F-WEB-TOOLS、F-CODE-EXEC、F-PTC、F-ADVISOR、F-CLIENT-TOOLSETS、F-MCP。
- 上下文/服务：F-CONTEXT、F-COMPACTION、F-INLINE-TOOLS、F-FAST、F-TASK-BUDGET、F-FALLBACK、F-ROUTING、F-COUNT-TOKENS、F-OTHER-APIS。
- 横向：O-REGISTRY、O-HISTORY、O-ATTACHMENTS、O-ERRORS、O-LOGGING、O-UI、O-PROTOCOLS、O-VALIDATION。

## 恢复工作的方法

先读本文件与三个分工进度文件，再检查 git diff/status 与实际测试产物。状态记录不能替代当前代码/运行证据。每批补充命令、结果、commit、部署目标和未解决事项后更新本文件。

### 第二批检查点与第三批启动（2026-10-08）

- 第二批检查点 b52f5fc1c18a364e06b978cec39d29490f4bdd11 已提交并推送，OVH 与 cc-max 通过 Git fetch 新建并核对干净 worktree。没有上传源码，没有更新线上容器。
- Windows 完整真实 CLI 隔离集首次 FAIL347.123s：旧 TestRealCLI 将 tool_choice:none 断言为删除工具目录、Fast 缺 beta、管理员关闭时期待静默降速。已改为校验原客户端定义+none及明确400/无上游调用；主集单用例67调用PASS50.697s，完整集合重跑中。普通refusal原始完整message_stop阻止隐式继续的race修复4种JSON/SSE组合通过，独立复核通过。
- OVH 隔离 PostgreSQL 45432 的 Linux race：gateway/convert/usagerules/billing/ccgateway通过；usage新DB回归首次失败。原因是测试直接调用事务settle后错误期待process层markFailed已运行；修正为走完整process并检查ledger故障确实触发，数据库复测待进行。没有改业务结算以迎合测试。
- cc-max #21/#22容器ID与既有镜像未动，实际CLI为2.1.288；本地主要验证2.1.292。上线前必须核验/原地更新CLI，不能只替换Worker后忽略版本差异。
- 第三批已开始：共享协议codec机械抽取（root独立AST核对104公开符号签名完全一致）、请求专属PreparedConverter、search_result/图片transformations/错误响应header完整链路。新增文件未混入第二批checkpoint。
- 所有线上部署、真实提供商推理、资源资格和UI视觉检查仍未完成；隔离假上游与编译成功不能作为这些工作的替代。

### 第二批验证完成、第三/四批集成中（2026-10-08 07:50）

- 第二批 Windows 完整真实 CLI 隔离集 PASS 376.624s；cc-max 从 b52 Git 源码编译的 Linux 完整 CLI 集 PASS。Linux engine/Worker/contracts race 与 vet 通过。控制器在既有 0.1.47 镜像中挂载 Git 源码只读运行，39 项 Python 测试 PASS 6.616s；宿主机缺 docker Python 依赖的失败不计作代码失败。
- usage DB 测试夹具修复已提交推送 af29d31ecf42366fdc5bffdf9b4993ade9c9c4a0；OVH 测试 worktree 经 Git 更新到该 SHA，隔离 PostgreSQL 45432 全 usage race PASS 5.010s。第三/四批尚未提交或部署。
- #21/#22 原容器各用原 CLI 2.1.288 完成一次真实 Opus 5.5 简短推理。#22 原授权 Files GET 200，Models 返回 code_execution.supported=true；只是账号资格基线，尚未上传/执行资源，不能证明新代码通过。详见 REAL-ACCOUNT-BASELINE。
- 第三批共享 codec 已抽取并通过独立复核；next 核心已接 OpenAI Chat Completions/Responses 严格转换。HTTP JSON/SSE/正常拒绝/截断/断流/权限/原始用量检查通过；完整核心→Worker→真实 CLI→假上游 50 次通过（包括 30 轮、回退、冷导入及数值精度）。OpenAI SSE 为确定终态拒绝而有界缓冲，已记录延迟取舍。
- search_result、图片 transformations、JSON/SSE/count 响应安全 header 已实现；55 次媒体/历史与 4 次成功响应 header 真 CLI 隔离验证通过。不是云端图片识别资格结论。
- 真实 CLI 揭示工具大整数舍入与初始非空 tool input 原生历史丢失；采用已归属原始输入、严格完整历史对齐和既有 responseOnly 重建修复。缓存键保留精确客户端数值。混合 MCP pending call 丢失另由注册遗漏集合恢复，禁止全局宽松对齐。
- 第四批显式 fallback 已接模型权限、参数价格快照、每次尝试替代主用量、最终真实 JSON/SSE carrier。8 次真 CLI 隔离调用通过；多次尝试不重复加最终用量，免费拒绝仍计限流。缺 per-attempt 归属的 compaction 组合将具体拒绝；实际 speed 等事实不能复制给前面尝试。DB 新 replacement 测试待下个 Git checkpoint 在隔离 PG 验证。
- 第四批 MCP connector 的请求/响应/历史与凭据日志隔离已实现，混合工具和跨 SSE 碎片凭据回显保护仍在收尾。Files/container/Code execution/PTC/Skills 资源产品与 fallback default/credit 尚未完成，不把这些记成不可实现。
- 07:47 本机 gateway 全包测试仍因旧 PostgreSQL 缺 global/pg_control 失败；convert/usagerules/core 通过。将数据库部分放到隔离 Linux PG，不修复或删除本机数据库。
- 当前分工：root 核心协议/模型授权/账务绑定与资源设计；audit_code_beta fallback/结算及资源预研；research_cc 精度与 Worker 绑定地址后独立复核 fallback；research_api MCP 收尾后独立复核精度。完成第四批后冻结、提交、Git 拉取测试，再推进资源批次。

线上 #21/#22 仍保留原容器与授权，没有更新程序、CLI 或镜像默认值；OVH 四个生产节点未发布本批代码。

### 第三/四批冻结复核（2026-10-08 08:10）

- MCP 完整作者集 24 次真 CLI 隔离调用通过；独立审查额外复现 initial input 与 listing schema 数值舍入，修复已完成。listing 复制 pin、续聊和冷导入 3 次精确上游 wire 检查通过。工具输入恢复现在包括 client/server/MCP 的调用与 MCP listing.tools；非数字字段改变仍拒绝。
- Worker bind 独立审查揭示指定非回环 IP 会让本机 relay 拒绝。现只接受 loopback/unspecified，localhost 同监听与内部 URL 一起归一 127.0.0.1，默认容器 wildcard 行为保留；未放宽 relay 回环访问要求。
- 主代理复核修复 MCP 凭据前缀检查的二次复杂度，改为一次预计算的线性前缀匹配；不完整工具 JSON 与未解码内容编码具体拒绝。调试结构化脱敏保留 json.Number，避免日志证据自身舍入。
- 显式 fallback 独立复核通过；真实终态事实只绑定最后一次采样，先前模型/缺失事实不补零，价格表达式依赖缺失事实时记录 BillingError。新的 gateway API200/计价快照/事实回归通过。
- catalog 已更新为 2026-10-08.4，MCP 两版 beta 收入统一注册，不再单独在 Worker 硬编码准入。OpenAI 协议/MCP/fallback 的前端介绍反映实际子集与限制。
- 冻结模块 tests/vet：shared codec、engine、Worker、SDK manifest/platforms/contracts 通过；本机 core/gateway/usage/billing 用 SUB2API_TESTPG=off 运行仅作为非DB检查，数据库将从新 Git checkpoint 去 OVH 45432 验证。
- 第五批仅新增时间线 helper 与资源设计/新模块，尚未接线。主代理提交时将第五批半成品和原有无关文件排除；不能把未接线 helper 当功能完成。

### 第三/四批 Git 与第五批实施（2026-10-08 08:29 CST）

- 第三/四批已提交推送 bfcbc3b4203cb664e53db305da4fadaecda67106（185文件）。OVH `/home/debian/sub2api-next-test/git-features-bfcbc3b42`、cc-max `/root/ccgateway-features-bfcbc3b42` 都经 Git 新建并核验精确 SHA/干净目录；未上传源码。
- 此 SHA 在 OVH 隔离45432数据库跑 gateway/convert/usagerules/usage/billing/ccgateway 全目标 Linux race+vet通过，含 replacement 冻结重试；cc-max engine/Worker race+vet通过。初次数据库启动脚本未处理镜像默认 POSTGRES_USER 而在执行测试前退出，已采用默认 postgres 后重跑成功。
- Worker 镜像 ccgateway-worker:features-bfcbc3b42 已由 Git 工作树构建，revision标签为完整SHA。镜像manifest sha256:3d408acbd2a7b4bceaf8aa13ad64ef9d18f935770c1d13af7b59240ab98f720f。完整 Linux CLI 隔离集与 legacy backend Docker 构建仍在进行，不能提前记通过。没有原地更新21/22或发布OVH核心。
- 第五批 inline/server/compaction 时间线已实现，core 三个已声明 Advisor 路径均鉴权/冻结价格/调度，签名历史 identity-only。核心HTTP 12场景通过。独立复核修复64模型引用把参数facts误计入上限、同模型位置换name重复声明；也修复已撤销工具被ToolSearch重新激活和显式空压缩净变更未reset。独立真CLI时间线40次隔离请求通过。
- 新 providerresources 服务/0038迁移具备owner(UserID+GroupID)、固定issuer/account generation、quota、reserve/Finalize/uncertain/confirmed failure/delete状态机；默认不主动过期。SQL过滤分页Query正在与Files HTTP接线，DB生命周期/并发/分页测试待下一Git检查点在隔离DB跑。
- Files核心HTTP五路由及Worker专用认证承载正在接线。Worker首3次真实CLI隔离GET/POST multipart/DELETE证明无收费/messages请求、二进制保真、无历史cache；真实账号profile/schema及完整资源CRUD资格未完成。稳定issuer需真实OAuth profile或显式API key管理身份，不能用token哈希或runtime版本替代。
- 当前任务归属：root共享账号resource transport/app接线/独立review与部署验证；research_cc Files HTTP/分页/上传；research_api Worker资源操作/issuer/spool/历史验证；audit_code_beta资源持久化及模型file_id ACL/固定账号映射。CodeExec/PTC/Skills、generated resources与credit仍后续依赖项，未误报完成。
- 前端typecheck通过；第一次定向vitest误写.test.ts导致No test files，正改为实际.spec.ts执行，此错误不算测试通过。

### 第五批独立复核与资源闭环（2026-10-08 08:51 CST）

- 上条前端定向测试已完成：实际4个.spec.ts共25项PASS，typecheck PASS。没有因文件名错误少测后直接记通过。
- `bfcbc3b42` legacy backend Docker镜像构建PASS；Worker镜像默认8787健康启动PASS（fixture调用Key，CLI 2.1.292）。完整Linux CLI集有2项历史用例在并行Docker构建期间20秒超时，其他项目通过；构建结束后用完全相同测试二进制分别连续3轮复测，两项均PASS。保留原失败日志，不能把原完整集合改记全绿。
- Files核心HTTP独立审查修复多值beta与显式版本丢失、安全响应头缺失、慢上传占满4个spool槽以及稳定版误用legacy文件名限制。真实TCP验证60秒空闲deadline按每次读重置；不会用总上传时长截断持续有进度的客户端。Worker资源转发另有10分钟总deadline。重复workspace/版本头的歧义也已具体拒绝。
- Worker独立审查修复CLI默认版本覆盖客户端资源版本，并将resource identity从会话cache移到独立DataDir目录。相同issuer重授权保持资源代际、真正换issuer或显式API key epoch才轮换；缓存替换与重启稳定性回归通过。
- Worker file_id验证已完成4类输入×6流转共24次真实CLI隔离请求，包含续聊、回退、冷导入、SSE及count；核心只映射已授权文件并固定原账号，Worker再次核验真实issuer和受控ID列表。资源调试日志补充中，二进制内容以明确的metadata/hash记录，不伪称已保存原始binary。
- 当前本地app/ccgateway/gateway/providerresources测试与vet通过；SUB2API_TESTPG=off明确跳过数据库部分，下一Git检查点再跑隔离Linux数据库。尚未更新21/22程序/CLI或发布OVH核心。
- 第六批CodeExec/PTC/Skills目前仅独立schema helper/设计，尚未接入现有主链；产物登记、container续期及PTC父调用绑定正设计。第五批提交必须排除这些未接线新文件与原有无关文件。
- 第五批冻结前主代理发现授权锁与CLI槽位顺序可形成死锁，统一为可取消的authority→slot顺序后，确定性满槽/取消回归20轮通过；第五批完整资源/历史/日志/legacybeta集合重新PASS34.114s、vet通过。root普通engine/companions与SDK检查通过。资源调试日志已接开关及关闭删除，记录原始filename与二进制省略原因。

### 第五批上线与第六批冻结准备（2026-10-08 09:58 CST）

- 第五批已提交推送 `0c96c681aedcb9c45cd64faf73b0ce60fa4df09a`。隔离OVH数据库验证发现测试账号缺少出口代理，夹具修复 `075845cc2abf25316ecdcdd110f84437fd0c458e` 后 ccgateway race/vet 和核心构建通过；gateway/providerresources Linux race此前已通过。没有修改生产数据库。
- 原地更新 #21/#22 为 `78aa07448e0286da518f994cf2629f802953a756`（兼容原1小时执行超时/128MiB缓存默认值），CLI 2.1.292。容器ID、镜像、挂载与授权均保留，服务器从精确Git提交构建；详见 DEPLOYMENT-2026-10-08-WORKER-RESOURCES。#22实际Files上传/模型读取/删除通过；#21未核验资源issuer，明确拒绝资源操作。尚未发布新OVH核心，因此这些不是公网核心资源闭环证据。
- 第六批已实现官方CodeExec/PTC、容器与产物登记、Skills端点及版本持久化/精确映射。核心按实际owner+issuer固定资源账号；服务端生成的容器、文件、PTC父调用必须先登记再交客户端。有状态SSE最多32MiB缓冲并先关闭Worker响应再取metadata，避免issuer锁死锁，普通Messages流不增加此缓冲。
- 三位代理交叉复核修复：嵌套Web/PTC父子因果校验、跨owner父ID占用、过期容器额度回收与重新续期、null容器误触能力、转换新增执行能力绕过、重复PTC父ID覆盖、Skills版本漂移、上传成功后metadata失败丢失受控资源证据。主代理另核对SSE帧/终态边界与原用量独立结算；资源登记失败不重发模型。
- custom Skills的latest在核心固定为具体已登记版本，Worker私有grant再核对parent/version；provider输出不得换成另一已登记版本。无显式skills的容器续聊，输出仅允许同owner+binding精确查到的已登记skill。输出ID与版本映射保持不可混用public/provider ID。
- Windows主目标gateway/providerresources/engine/contracts/Worker/app非DB测试与vet通过（本机SUB2API_TESTPG=off，未修坏掉的本机PG）。Skills真实CLI隔离新增2型×5流程共10次调用PASS12.757s；CodeExec/PTC及历史矩阵详见专项记录。当前第六批仍未提交/部署，Linux PostgreSQL、race与真实提供商执行/Skills资格待下一Git候选验证。
- 第七批credit仅独立contract、持久store、加密registry与测试；runtime hooks暂撤下，源码为 `fallback_credit.go.pending`，重挂patch保存在本机临时目录。第六批提交排除第七批文件，不能把credit称为已接入。当前团队已冻结第六批实现，research_cc收尾catalog与旧beta检查。

### 第六批已上线、第七/八批复核（2026-10-08）

- 第六批 `4903994f459cae7959bd6307b602c91e045f0ed6` 已提交推送（104文件，catalog .6）；Linux全engine发现旧测试仍拒绝null container，单行夹具修复 `160f6064ada938e69e84a32797df82fd660d8e6e` 后完整engine/Worker race通过。真实CLI原实现矩阵235.614s通过，测试补丁未改业务，因此未无意义重复该矩阵。
- OVH 隔离45432使用490399候选六包race/vet通过，519个pass事件、两个可选真实CLI skip，无race/失败；10个providerresources DB与两个ccgateway DB逐名确认实际pass。初始PATH/GOWORK测试启动失败保留，不计通过；见 LINUX-SIXTH-BATCH-DB-VALIDATION。
- #21/#22现均为原地升级160f6064a，Worker哈希 `9edea7dcc5ba07c57ff9307a7cac710efc2c36c01990145537ad698546d8ba30`，CLI2.1.292，旧78aa程序各有新备份。容器ID/image/user/卷/授权不变；#21真实短答READY通过。#22 CodeExec/PTC服务端工具均返回正常HTTP200中的too_many_requests，未成功执行；builtin pptx成功解析真实版本20261002并返回container，但其工具也受限。没有为得到成功而重试或改变授权。见 DEPLOYMENT-2026-10-08-EXECUTION-SKILLS。核心公网服务仍未发布本轮代码。
- 第七批core/Worker信用登记与兑换已接线，正常refusal200，记录owner/账号/issuer/原始提示摘要；Worker加密稳定保存原wire，core只存token哈希。JSON/SSE原用量先提取，Worker信用存储故障通过可信内部FailureHeader+原Message通知core，对外gateway_credit_storage而非refusal错误，不丢用量、不发未登记token。已通过本地HTTP和真实CLI隔离矩阵，尚未Git提交/部署/真实兑换。
- 独立复核又修复信用存储临时instance目录导致重启丢失/跨重启容量失控、跨进程OS锁、身份探针并发槽遗漏、PTC信用合法原样续写被普通账本误拒。所有特殊PTC恢复都要求已证明的原token/snapshot/完整摘要/issuer；不添加原请求没有的container，不放松普通历史义务。core预检无资源身份的候选可在模型派发前跳过；已绑定资源/credit不能换号。
- core信用准入不再阻断普通非CCGateway Anthropic透传；已知本owner CC token固定原账号，实际携token派发后所有路由都不自动重发。官方SDK额外支持null/object及strict/best_effort：共享Parameter和LookupOwned已补，core对象/期限/提示不匹配语义已有HTTP测试，Worker对象模式及跨层复核仍在收尾，不能据字符串测试声称全部完成。
- 第八批inline MCP、非defer MCP与客户端API ToolSearch、纯MCP safeguards的等价组合已实现。作者新增14次CLI与旧矩阵联合PASS51.945s；独立复核再次通过CLI及状态/凭据负例。deferred MCP搜索引用的跨server编码尚无足够证据，继续明确拒绝。见 MCP-COMBINATIONS-PROGRESS / MCP-COMBINATIONS-INDEPENDENT-REVIEW。
- 当前工作区为第七/八批待提交；原无关 artifacts、cwd_probe_cli_test.go、pelican-bicycle.svg未处理。下一步：完成对象信用Worker/独立复核、目录 .7、必要完整测试、新Git候选Linux验证、Git构建核心与Worker镜像、平台公开API/本地CLI和前端视觉验收、汇总逐feature证据与不能等价边界。不得遗漏尚未进行的核心部署。

### 第七/八批冻结与发布准备（2026-10-08）

- 信用 object/null/best_effort 已接线并独立复核。修复精度恢复的方向性漏洞：只允许提供商数字经过 CLI 数值归一，不接受 null、状态文本或数组位置改变。增量负例先红后绿，真实 CLI 定向回归 PASS19.392s；作者新旧信用/PTC联合34.227s证据另记，不当作真实提供商兑换。
- 根代理整体验证：gateway/fallbackcredits/providerresources/app/migrations 非DB单测全部通过，vet通过；engine 5.544s、contracts全包、Worker全包与vet通过。数据库仍等待本候选Git SHA在隔离Linux运行，不借旧SHA结果。目录 .7、前端21项组件测试与typecheck通过。
- OVH四节点仍0.1.62。新增受控发行准备脚本，不导入/升级服务；用原default builder和签名缓存、明确live source schema，专属2CPU/4GiB临时slice经真实RUN证实。四项隔离负例与shell语法通过；禁止覆盖旧发行，既有密钥缺失或trust变化直接停止。
- 37功能/8横切新闭环清单见 FINAL-FEATURE-CLOSURE。当前仍需第九批核心diagnostics归属与冷Worker能力、内部工具回合的缓存边界适配，并继续核验安全上下文/续写的等价边界。第七/八批先保存Git检查点；新业务不得混入本批提交。
