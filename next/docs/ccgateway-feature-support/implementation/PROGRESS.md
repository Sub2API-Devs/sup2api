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

- 当前仍未提交本轮代码、未部署。线上仍是此前版本；已有目录unsupported/partial是实施基线，不是所有不可行项的最终结论。
- 只读检查OVH当前账号为debian，HOME `/home/debian`；生产sup2api四节点端口3130–3133，多种其它服务运行中。隔离PG45432/Redis36379存在，不得拿生产数据库跑测试。
- cc-max `/root/sup2api`为现有Git checkout（只读观察HEAD36aeea1c5）；已有git-release目录、Worker0.1.64镜像及#21/#22旧镜像标识的保留容器。尚未更新、重启、删除任何服务器资源。
- 本机无gcc/CGO，race尝试未成功，不能把并发单测写为race通过；计划在服务器Git拉取checkpoint后用隔离Linux构建环境运行。

## 验收台账

所有特性初始均为待评估/未完成。下列行只记录本轮工作状态；现有能力不是不存在，也不代表本轮已验证。

- 请求/输出：F-MODEL、F-LIMITS、F-STREAM、F-SYSTEM、F-MESSAGES、F-THINKING、F-OUTPUT、F-SAMPLING、F-STOP、F-METADATA、F-CACHE、F-DIAGNOSTICS。
- 工具/资源：F-TOOLS、F-TOOL-CHOICE、F-TOOL-SEARCH、F-TOOL-STREAM、F-CITATIONS、F-IMAGES、F-DOCUMENTS、F-FILES、F-SKILLS、F-WEB-TOOLS、F-CODE-EXEC、F-PTC、F-ADVISOR、F-CLIENT-TOOLSETS、F-MCP。
- 上下文/服务：F-CONTEXT、F-COMPACTION、F-INLINE-TOOLS、F-FAST、F-TASK-BUDGET、F-FALLBACK、F-ROUTING、F-COUNT-TOKENS、F-OTHER-APIS。
- 横向：O-REGISTRY、O-HISTORY、O-ATTACHMENTS、O-ERRORS、O-LOGGING、O-UI、O-PROTOCOLS、O-VALIDATION。

## 恢复工作的方法

先读本文件与三个分工进度文件，再检查 git diff/status 与实际测试产物。状态记录不能替代当前代码/运行证据。每批补充命令、结果、commit、部署目标和未解决事项后更新本文件。
