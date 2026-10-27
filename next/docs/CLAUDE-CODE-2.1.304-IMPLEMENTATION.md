# Claude CLI 2.1.304 分层特性改造说明

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](../plugins/ccgateway/docs/CLI-TEST-PLAN.md)。

日期：2026-10-20。本文记录本次实现使用的 **Linux x64/glibc CLI 2.1.304** 基线及项目改造位置。[正式设计](ccgateway-feature-support/CC-FEATURE-LAYERS-DESIGN.md) 已切换到 304 目标，文中的 302 源码调查保留为历史证据；实际支持范围由 304 profile、补丁、测试和运行时能力共同决定。

本文区分源码实现、自动测试和完整出站验收。源码接通或单测通过不代表已经部署，也不代表已完成真实 CLI 的端到端抓包验证。

后续配置专项补测见第 7 节；其中的新制品覆盖第 6 节的首轮制品，旧报告保留对应 SHA 的历史证据。

**最新修复见第 10 节：第 8–9 节发现的工具丢失、参数丢弃、非法输入放行和环境变量覆盖已修复，新的 75 项实际链路验收全部通过。旧失败报告保留其制品 SHA；这仍不代表所有模型和任意请求的全分支覆盖。**

## 1 固定基线与补丁

- 版本：`2.1.304`。
- 原始二进制 SHA-256：`ea0f135784631619a7a409d07322ecec964f9cc4fd377508ed1ba3f141f27912`。
- 补丁标识：`ccgateway-v12-feature-policy`。
- [基线 profile](../plugins/ccgateway/companions/cli-mods/profiles/linux-x64-2.1.304.json) 记录被修改或绑定模块的独立 SHA-256。
- [304 patcher](../plugins/ccgateway/companions/cli-mods/patch-cli-2.1.304.cjs) 在任何修改前校验基线，AST 定位与字符串替换均要求唯一锚点；输出必须为新的独立目录，产出清单记录原文件、补丁后文件及支持模块哈希。

不能将 302 的混淆符号名直接套用到 304。共享支持文件的变动也必须保留旧版本回归，不对旧 profile 自动宣告新能力。

## 2 304 原生符号映射

以下符号仅适用于上述 hash-bound 基线。

| 模块 | 符号 | 职责与本次使用方式 |
|---|---|---|
| `chunk-rncrmfyt.js` | `_oo` | 原生完整环境正文渲染；依赖 `dy` 输出列表层级 |
| 同上 | `zkt` | `# Environment`、固定引导句和正文的完整渲染 |
| 同上 | `Kkt` | `# Environment update` 的七类增量事件渲染；用于核对模板和生成测试样本 |
| 同上 | `dy` | 主字段输出 ` - `；额外目录子项输出 `  - `，不是任意缩进均可识别 |
| 同上 | `Gkt` | 临时目录及完整使用说明 |
| 同上 | `ANe` | GitHub 内置工具能力文案 |
| 同上 | `xNe` / `ule` | 结构化 Agent 代理文案 |
| 同上 | `foo` | 代理说明 fallback，可能返回原生运行时字符串；只在实际需要时读取 |
| 同上 | `uoo` / `poo` / `moo` / `Nkt` | Shell、OS、临时目录、GitHub 能力的原生读取入口 |
| 同上 | `gH` / `Cl` / `hK` | Git 仓库与 worktree 事实读取 |
| `chunk-t61vswm2.js` / `chunk-6qx5mjec.js` | `PAs` / `kLo` | 原生计费归属组装／生成；在 `kLo` 新值生成后捕获归属，不能从已被客户端文本覆盖的最终分组中反取 |
| `chunk-rncrmfyt.js` | `HZ` | 当前模块内的 function-hook dispatcher；短箭头别名在多个模块同构，不能仅凭 AST 形状选择 |
| `chunk-rncrmfyt.js` | `qmn` | 原生请求构建；外部 build 使用显式 system 和已转换 wire messages，生成参数仍由原生逻辑决定 |
| 同上 | `Gmn` / `jA` / `Xfr` | 外部输入保真边界及消息 system 角色传递；避免原生 CLI 自有历史修复对外部文本做有损规整 |

`_oo`、`zkt`、`Kkt` 的语义与先前 302 研究中的完整/增量环境结构一致，但本次补丁绑定的是 304 模块。工作目录、额外目录、Git、worktree、临时目录、GitHub、代理支持增量模板；平台、OS、Shell 不虚构增量事件。

## 3 单次 build 流程

[304 构建适配器](../plugins/ccgateway/companions/cli-mods/request-build.js) 按以下顺序执行：

1. 验证 Worker 的内部 `requestPolicy` 和可信 `runtimeContext`，从参数空间分离，禁止泄漏给上游。
2. 显式还原客户端 system/messages；校验文本类型及合法工具配对。
3. [内容策略模块](../plugins/ccgateway/companions/cli-mods/content-policy.js) 只读取原文本生成匹配计划，识别明确模板与歧义。
4. 计划确定需要服务端字段后，调用 `native.readEnvironment(neededFields)`。字段集合只包含命中、非冗余且来源为 worker 的字段；无匹配、client、erase 不触发读取。
5. [原生环境适配器](../plugins/ccgateway/companions/cli-mods/native-environment-2.1.304.inc.js) 按需调用原生读取器并复用 `zkt`；返回 `{text, fieldText, unavailableFields}`。`fieldText.agent_proxy` 允许原生 fallback 文案，null 表示明确不存在。
6. 原位应用环境变换，再进入原生 builder。原生生成版本指纹时看到的是本次已经转换后的消息。
7. 捕获本次新生成的计费归属，调用 `mergeBillingAttribution`，只合并选为 worker 的 `cc_version`/`cc_entrypoint`。
8. 发送已构建结果。无第二次 build、无第二次环境注入，不通过覆盖整份原始 body 绕开 CLI 的生成参数规则。

`ccgatewayProxyText` 仅由可信适配器填入原生快照，控制代理 fallback 是否需要读取。它不是客户端可提交字段，也不是公开模型请求字段。

## 4 内容转换合同

### 4.1 计费归属

每项来源仅为 `client` 或 `worker`。client 保留原值，缺失不补。worker 采用本次 CLI 原生生成值，合法原块中按值范围替换，缺字段时在同一行补齐；完全缺块时只新建一个包含所需字段的块。

保留其他计费字段、分隔空白、未知合法键、文本块顺序及缓存属性。重复块、重复键、被引用或代码围栏内的归属、异常语法不进行合并，也不追加第二份。实际需要的原生输出为空或不可用则返回配置错误。

选择服务端入口只使用当前运行上下文的原生输出，不修改 `CLAUDE_CODE_ENTRYPOINT` 来切换 CLI 功能或交互模式。

### 4.2 环境

十项白名单与设计一致：`platform_name`、`os_version`、`shell`、`primary_directory`、`additional_directories`、`git_repository`、`worktree`、`scratchpad_directory`、`github_cli`、`agent_proxy`。来源为 `client/worker/erase`。

只扫描顶层 system、消息 system 的直接文本及由独立平铺 reminder 组成的 user 文本。不进入 assistant、tool_result、工具参数、普通用户正文、引用、代码围栏或嵌套 reminder。不同历史位置的完整环境不是重复输入；同一环境内的重复字段属于歧义。

- 保留 LF/CRLF、原位置、块属性及未知说明；无关 reminder 不需要泛化拆分再重新注入。
- 工作目录/Shell 的服务端说明不改变客户端工具执行位置。
- 环境字段不存在不补；服务端明确无可选字段则删除对应客户端描述；读取失败不能当作缺席。
- 多行 worktree/stash、临时目录说明和额外目录列表作为完整字段处理。未知父项下的嵌套同名字段不属于主环境字段。
- 同一请求只使用一份服务端事实。已有完整基线的服务端字段更新被消除，避免残留客户端旧值及目录增删。
- 无法恢复基线的增量保留原文，并撤销该字段在本次请求中的所有变更计划；独立字段仍可正常处理。
- 仅清理由本次转换明确产生的空环境段和空 text 块；客户端原有空白不清理。空消息只允许删除没有附加元数据的普通 user 消息；涉及 system 生命周期或其他消息字段时明确报错。

`--exclude-dynamic-system-prompt-sections` 兼容依靠收到内容的位置识别，无需新增 UI 开关。客户端没有发送的环境不会被“恢复”为服务端默认提示。

## 5 Worker、核心与前端连接

执行合同仍使用 `client/worker/erase`，UI 展示“保留客户端／使用服务端／擦除”。计费归属禁用 erase。direct 不执行内容变换，保存值在切回 build 后继续使用。

核心保存全局 `request_policy`、分组 `cc_feature_groups`、账号 `cc_feature_policy`，逐字段合并；账号草稿随原账号 PATCH 原子提交。前端与核心使用相同 dot-key 来源键，例如 `build_billing_sources.cc_version`。账号的“按分组查看”仅改变生效预览，一份账号草稿继续跨允许覆盖的分组使用。

正式前端使用 Vue、`@sub2api/ui` 和中英 i18n，不执行 HTML 设计稿里的字符串插入逻辑。304 版本只读；现有配置缺省来源按 client 保留，明确新建配置的 Platform/OS 采用 worker 默认。全局/分组保存带 `feature_revision`；账号草稿带账号 revision。版本冲突保留草稿并要求重新核对；预览采用序号与取消机制，旧响应不能覆盖新的分组选择。

账号切回 follow 时清空全部覆盖；分组关掉任一允许开关只使对应层失效，不删除保存值。只读账号显示服务端返回的 effective/sources，不能把休眠的自定义误展示为生效结果。

部署页增加独立的“升级 Worker + CLI 2.1.304”操作，调用 `POST /system/ccgateway/runtime/workers`，body 为 `{"components":["worker","cli"],"cli_version":"2.1.304"}`。旧 worker-only 操作仍发送空 body，供旧 Worker 的程序升级。成对动作展示每个账号实际 CLI 版本、补丁、哈希、在线状态及失败/回滚结果，两类操作共用互斥锁。

304 策略需先完成配套运行程序激活。存量 302 设置不在后台自动迁移，显式保存配置才选择 304；保存字段本身不升级程序或重建账号容器。Controller 能力不足时应明确失败，不能把 worker-only 成功误报为已完成 CLI 成对升级。

## 6 诊断与验证状态

内容策略通过 callback 产生字段、状态、固定载体分类。外层以 `CCG_CONTENT_DIAGNOSTIC` + `ccgateway.content.diagnostic.v1` 输出至 stderr；不记录匹配原文、路径、版本完整值或凭据。`source_unavailable` 与 `not_found`、`unsupported_format`、`ambiguous`、`missing_baseline`、`unchanged`、`replaced`、`erased`、`inserted`、`removed_server_absent` 分开。

本次已完成的局部验证：

- `node --test .../test/content-policy.test.mjs`：24 项通过，覆盖十项完整字段、七类更新模板、按需采集、缺失、歧义回滚、复杂原生文案、代码围栏、未知目录子树、缓存属性、CRLF、空块处理及计费归属幂等。
- 完整/增量 fixture 从上述 304 原生 `zkt/Kkt` 函数在固定事实下生成；断言全选 worker 后完整输出等于原生服务端环境，后续无效增量消失。
- 前端针对性验证：8 组 130 项通过，包含分组 revision 事务、账号原子 PATCH、草稿/过时响应、12 字段合同、成对激活请求和逐账号实际 CLI 展示。`vue-tsc -b` 通过。针对改动文件 ESLint 无 error；历史 Vue 文件仍有格式 warning。

最终集成记录：

| 检查 | 最终结果 |
|---|---|
| 304 hash-bound patcher 与打包 | 通过。Bun 1.4.3 在 Windows 交叉编译 Linux x64/glibc，CLI 与 hooks-worker 两入口；生成 release manifest，保留旧 302 entry |
| CLI 支持模块及旧版本回归 | 69 项 Node 测试通过，保留旧 build 参数／工具／认证／错误流测试 |
| Worker 合同/请求模式/错误流式回归 | contracts、engine、worker Go 包通过；最终 Worker + CLI 在 Linux 非 root 容器中 7 项真实检查通过，3 个成功请求恰好产生 3 次本地上游调用 |
| Controller 升级与旧容器兼容 | Linux Python 环境 89 项通过；没有 Windows fcntl 替身。独立审查并复验了暂停、过期恢复、健康失败和回滚边界 |
| 核心迁移、策略合并、权限和原子保存 | 隔离 PostgreSQL 上 account、gateway、ccgateway、migrations 测试通过；全 server 包编译通过。ccgateway 仅跳过 Windows 不能执行的 `TestPortScript` |
| 真实 CLI 最终出站差异与单次模型请求 | 最终 ELF 的 52 项 Linux loopback 抓包通过，覆盖 12 字段、缺失／歧义、连续历史、原生参数、工具媒体保真、无效输入零发送和 direct 原文字节 |
| 正式前端构建 | 130 项针对性测试、类型检查与 `npm run build` 通过；构建输出位于 `next/server/web/dist` |
| 正式前端浏览器视觉验收 | 未执行；不能用组件测试替代视觉验收 |
| 生产发布 | 未执行；没有更新生产账号容器 |

首轮 CLI ELF SHA-256：`810628d13f081d87b806b4afb606d64bde26f7f7be158feb2afe941f97ffd5c3`。首轮交付目录为 `artifacts/claude-2.1.304/release-v12`。[首轮出站报告](../../artifacts/claude-2.1.304/feature-policy-final-verified.json) 使用合成内容、测试凭据和本地模拟上游，不包含真实模型调用。

最终 Worker SHA-256：`03af739a358643ea063a812cfb6e81c901a32ad3c901b623c0850f077806585d`，路径 `artifacts/ccg-worker-304-policy-final-linux`。[Worker 实际链路报告](../../artifacts/claude-2.1.304/worker-policy-final-report.json) 验证真实旧 302 CLI 的 native 维护引导、active pointer 覆盖旧环境、过期暂停跨重启、受认证恢复、每请求模式切换和缺失/null 边界。[Controller 日志](../../artifacts/claude-2.1.304/controller-final-tests.log) 及 [CLI／核心汇总](../../artifacts/claude-2.1.304/validation-summary.json) 保留测试范围与跳过项。

移植期间发现并修复了一个仅原生工具执行暴露的问题：按短函数结构找到的 `hNr` 不在调用模块作用域，改为该模块实际的 `HZ` dispatcher。304 官方原版与补丁版默认都可能延迟广告 TaskCreate/MCP；专门验证完整工具广告的测试显式关闭 tool search，其余场景保留默认设置，避免把版本默认行为误报为移植回退。

原位升级的审查修复了恢复接单后错误回滚、暂停到期自动开放、回滚失败仍解除暂停、回滚重启丢失暂停四个并发边界。暂停到期后仍阻止业务请求；管理认证下可查询当前 token，确认磁盘指针及 Worker/CLI 配对健康后显式恢复。旧 native 容器可先安装仅提供维护管理的新 Worker，再原位成对激活 304；这一引导阶段模型请求明确返回配置错误。

部分旧镜像只有受信 CLI 文件而没有 manifest。Controller 可在确认实际文件位于受信根内、root 所有权和权限、实际版本／补丁及已有 SHA pin 后，为原文件生成回滚清单；不会下载替代旧 CLI 或放宽信任根检查。完整 Controller 驱动的真实容器配对升级／故障回滚仍需部署环境验收；本轮的 Controller 事务测试、真实 Worker 启动与请求抓包分别验证各层，不能宣称已执行生产升级。

## 7 配置专项补测与边界修复

本轮依据“各种配置能否实际生效”增加三层组合、真实控件提交和最终出站矩阵，避免仅用单字段成功推断所有配置都成立。

| 层次 | 新增覆盖与复跑结果 | 测试源码 |
|---|---|---|
| CLI 内容转换 | 150 个“10 字段 × 3 来源 × 5 载体”场景；1,620 个“任意两环境字段 × 9 来源组合 × 4 计费组合”场景；6 组全部字段相邻／并发切换。断言目标 golden span 与整份非目标 JSON、按需读取、幂等及 direct 原样保留。CLI 全套 75 项通过 | [content-policy.test.mjs](../plugins/ccgateway/companions/cli-mods/test/content-policy.test.mjs) |
| 核心配置合并 | 4,128 个逐字段继承／双开关／follow-custom 组合；196 个缺组组合；48 个普通配置跨层组合；12 字段同时混合继承；导出 55 组真实 resolver 与 wire policy | [feature_policy_matrix_test.go](../server/internal/ccgateway/feature_policy_matrix_test.go) |
| HTTP 网关与存储 | 真实 PostgreSQL、6 个 API Key 认证 fixture 对应不同分组，同账号连续 9 次请求；验证 dispatcher 到 mock Worker 的实际策略、切组不串缓存、伪造 header/group_id 无效、follow 清空全部覆盖并立即生效 | [ccgateway_feature_policy_test.go](../server/internal/gateway/ccgateway_feature_policy_test.go) |
| 正式 Vue 提交 | 12 字段跨全局／分组／账号的 126 次来源选择，核对 PUT、preview POST 和原子 PATCH；双开关、direct、follow、四类只读及过时响应。相关 5 组 90 项测试通过，类型检查、定向 lint 和生产构建通过 | [featurePayloadAudit.spec.ts](../web/src/views/ccgateway/featurePayloadAudit.spec.ts)、[AccountFeatureSettings.spec.ts](../web/src/views/ccgateway/AccountFeatureSettings.spec.ts) |

补测先复现、后修复三个问题：

1. 环境转换会清理同一文本里原先就空的无关 reminder。现在仅移除本次转换清空的包装，保留原有空 reminder 及分隔空白。
2. 原环境段内的代码围栏若包含完整 `# Environment` 标题，会错误重启识别；更短或不同类型的围栏也可能提前结束代码区。现在段边界与内容扫描共享一致的围栏长度／类型规则，示例保持原文。
3. 切换账号 ID 时旧预览 debounce 未清除，会把旧草稿提交到新账号预览。现在切换时取消定时器，已有请求仍由序号及 AbortController 防止旧响应覆盖。

新 CLI SHA-256 为 `08aa7c7d97532ef28cfccd31e2b4c4c84c2bd87509669e951cd106df488fb727`，位于 `artifacts/claude-2.1.304/claude-linux-config-audit`；对应 `release-v12-config-audit` 已同步到本地 Worker 构建的 release 目录，保留旧版本条目。未部署到生产。

真实 Worker 配置矩阵使用核心导出的 [55 组策略](../../artifacts/claude-2.1.304/config-matrix-policies.json)，由 [可复用脚本](../plugins/ccgateway/companions/cli-mods/test/worker-policy-matrix.cjs) 在一次性 Linux 容器执行。它不导入生产匹配器或合并器作为预期值 oracle，依据原生 golden 字段片段验证目标变化及其余内容保真。

**最终结果：87/87 通过，恰好 87 次模拟上游请求。** 包含 55 组实际核心策略和 32 组载体、连续更新、缺失／歧义、相邻配置切换场景。使用本节的新 CLI SHA 和第 6 节的同一 Worker SHA；[真实 Worker 矩阵报告](../../artifacts/claude-2.1.304/worker-config-matrix-report.json) 记录每项策略、结果与制品／fixture 哈希。[运行说明](../plugins/ccgateway/companions/cli-mods/test/worker-policy-matrix.README.md) 给出隔离约束和所需环境变量。

新 CLI 同时重新通过原有 [52 项出站回归](../../artifacts/claude-2.1.304/feature-policy-config-audit.json)。核心专项 [JSONL 日志](../../artifacts/claude-2.1.304/core-config-matrix-final.jsonl) 无失败、无跳过；隔离数据库已停止。

这些结果证明已覆盖的 304 原生格式、来源选项、逐字段继承规则及两字段交互按预期生效，不等于穷举全部字段的所有笛卡尔组合。未知或歧义内容按规则保留；真实浏览器到真实数据库和真实 Worker 的单一会话验收仍不在本轮声明范围内。未部署生产。

## 8 真实官方客户端与普通 Messages 回放

使用官方未修改 Linux CLI 2.1.304（SHA `ea0f1357…f27912`），新建 HOME 和工作目录、使用测试 API Key，在 `--network none` 的一次性容器内向 loopback 模拟上游真正发出一轮请求。捕获到 3 个 system 块、1 条 user 消息、12 个工具定义和 1 个计费块；机器环境确实位于 user 的首个 content 文本。没有用手写模板或旧 302 样本代替这次实际捕获。

随后将原始正文与安全的 beta/version 头交给真实 Worker 和第 7 节的新 CLI 回放；另外测试普通 Anthropic Messages 的无 system、自定义字符串 system、图片加工具结果、普通 reminder 引用。共 14 条回放均返回 HTTP 200，且每条只发送 1 次上游请求，但**严格保真检查并非全部通过**：

| 情况 | 实际结果 |
|---|---|
| 官方原始请求 direct | 整个正文相同 |
| 官方原始请求 build、平台/OS 选择及缺计费派生变体 | system/messages 符合预期；4 个 build 场景因工具目录变化而严格检查失败。字段级复验确认输入 12 个工具，输出丢失 `ToolSearch`，其后条目前移 |
| 普通 Messages build | 原始 system/messages、多模态和工具结果内容符合预期；未提供工具 description 时会补 `description: ""` |
| 普通 Messages direct | 4 个样本的整个正文相同 |
| build 生成参数 | `metadata.user_id` 重新生成；普通样本会得到原生 thinking/temperature/output_config 默认值。`top_p`、`stop_sequences` 和该样本的 `context_management` 未透传，属于实际限制 |

[回放报告](../../artifacts/claude-2.1.304/official-client-replay-report.json) 明确保留失败、工具差异和生成参数差异，[测试脚本](../plugins/ccgateway/companions/cli-mods/test/official-client-replay.cjs) 不通过放松官方工具断言隐藏失败。平台/OS 的跨值替换和缺计费场景由真实捕获明确派生，报告名称标记 `derived`，不冒充另一台客户端的原始请求。

[工具字段级差异](../../artifacts/claude-2.1.304/official-tool-detail-report.json) 单独重放原始 all-client 请求确认上述缺失；它不是 JSON 对象键顺序差异。保留客户端的延迟工具说明但不发送 `ToolSearch` 可能影响后续工具发现，属于待修复的 build 兼容性问题，不能因模拟上游返回 200 而视为通过。

因此当前可以确认内容载体的还原与局部替换，不能宣称 build 已对 CC／非 CC 的所有请求字段无损。此处“非 CC”指进入 Worker 时的 Anthropic Messages 格式；Worker 只接收 `/v1/messages`，不代表直接接收任意协议。本轮只补验收与记录，未改变业务代码或部署。

## 9 按原生组装阶段补测

完整分组、源码证据和合同见 [304 原生组装测试方案](ccgateway-feature-support/CC-304-ASSEMBLY-TEST-PLAN.md)。采用 Babel AST 定位原生符号及参数流，并实际执行 REA 分析；静态结果的 partial／ambiguous 限制保留，不算作运行覆盖。

最终严格验收 **72 项全部执行：52 通过、19 失败、1 unknown**，见 [真实 Worker／CLI 报告](../../artifacts/claude-2.1.304/assembly-replay-report.json)。[覆盖门禁](../../artifacts/claude-2.1.304/assembly-audit/coverage.json) 验证当前 manifest、逐例定义和 CLI／Worker SHA，确认无漏跑，退出码为 1，禁止把此次结果称为全部通过。

补测确认了工具重排、缺失 description 的隐式补写、更多未透传参数，以及 `max_tokens=0/-1`、非法 thinking 类型没有在入口拒绝。原生 `CLAUDE_CODE_EXTRA_BODY` 还会后置覆盖 system/messages/max_tokens。官方完整请求的 build 用例仍因 ToolSearch 和 context_management 丢失失败，direct 原文字节通过。

计费／环境 8 项与发送 7 项全部通过，包含从预期消息独立计算 304 原生计费指纹、不同采样字符、上游错误／SSE 和内部凭据隔离。默认模型下 enabled thinking 的预算／adaptive 条件仍有一项 unknown，未计入通过。本轮仅改进测试与文档，未修复这些业务缺陷或部署。

## 10 组装缺陷修复与新制品验收

本轮已修复第 8–9 节的已确认缺陷，并使用重新编译的 CLI／Worker 重跑验收。旧失败报告保持原样，不能与本节制品混用。

| 问题 | 修复后的行为 |
|---|---|
| ToolSearch 被原生目录过滤，混合工具重排，缺 description 被补空值 | 304 外部 build 将完整 wire tools 传入原生最终对象，保留字段、顺序、缓存和延迟标记。Worker 区分未传 tools 与显式 `[]`，null／错误形态拒绝 |
| 非原生管理参数静默丢失 | 新 `request-parameters.js` 安全合并客户端额外参数和 output_config 扩展字段；原生管理的模型、thinking、tool_choice、metadata、token 上限等不被后置恢复 |
| 原生 EXTRA_BODY 后置覆盖 | 仅外部 build 分支不读取进程级 EXTRA_BODY；普通 CLI 仍使用原有逻辑 |
| 无效 max_tokens／thinking 发送上游 | Worker 与 304 独立 CLI 入口均提前校验；build 还拒绝被 JSON 数值转换错误舍入成整数的 token；direct 继续保留原始正文 |
| 默认 enabled thinking 缺少独立预期 | 从原版 AST 提取判断分支，验证当前 firstParty／Sonnet 4.6 fixture 输出 adaptive＋display updates，预算按原生规则省略。没有更改原生 thinking 实现 |

关键实现：[304 adapter](../plugins/ccgateway/companions/cli-mods/request-build.js)、[参数边界](../plugins/ccgateway/companions/cli-mods/request-parameters.js)、[304 patcher](../plugins/ccgateway/companions/cli-mods/patch-cli-2.1.304.cjs)、[Worker 校验](../plugins/ccgateway/companions/engine/request_components.go)、[组件组装](../plugins/ccgateway/companions/engine/request_command.go)。

| 验证 | 结果 |
|---|---|
| Node 全套，含真实 patch 生成、参数保真、指纹和门禁回归 | 101/101，通过，无跳过 |
| companions 与 Worker 两个 Go 模块全量测试 | 通过；26 类生成控制无效输入确认 400 且 CLI 未启动，另有 tools 存在性／形态回归 |
| 新制品分组真实链路 | **75/75，通过，0 fail、0 unknown、0 漏跑**；16 项拒绝零发送，其余恰好 59 次模拟上游调用 |
| 原配置矩阵 | 87/87，通过，87 次模拟上游调用 |
| 原 CLI 出站回归 | 52/52，通过，3 项拒绝零发送 |

[75 项报告](../../artifacts/claude-2.1.304/assembly-repair-report.json)、[新门禁报告](../../artifacts/claude-2.1.304/assembly-audit/repair-coverage.json)、[配置回归](../../artifacts/claude-2.1.304/assembly-fix-worker-config-matrix-report.json)、[52 项回归](../../artifacts/claude-2.1.304/assembly-fix-feature-policy-report.json)、[Node 日志](../../artifacts/claude-2.1.304/assembly-fix-node-tests.log)、[thinking 源码 oracle](../../artifacts/claude-2.1.304/assembly-audit/thinking-enabled-fixture-oracle.json)。

新 CLI：`artifacts/claude-2.1.304/claude-linux-assembly-fix`，SHA-256 `138da88ed5895fbc099115e7662df7ff9a6bd848d5a4cd142e29f2c9baaa56bd`。

新 Worker：`artifacts/ccg-worker-304-assembly-fix-linux`，SHA-256 `98f2746fed500a3b6fb4a6574431d2ebe74bd1ea8e269f6b07895149eced79db`。

本地交付目录为 `artifacts/claude-2.1.304/release-v12-assembly-fix`，已同步到 Worker 构建用的本地 release，保留原 302 条目。CLI 仍为未部署的 `ccgateway-v12-feature-policy` 修订，以实际 SHA 区分。没有更新生产账号容器；隔离测试容器均已清理。

验证范围仍是本方案的第一方 Messages 请求与固定模型条件。跨模型／组织策略／其他 provider 的全分支覆盖尚未完成，不能将 75 个合同全部通过写成整个 CLI 任意行为都已验证。

随后又完成 [CC／非 CC 专项交叉验收](ccgateway-feature-support/CC-304-ASSEMBLY-TEST-PLAN.md)：两类样本各 7 项，合计 14/14 通过，覆盖已有内容修改、计费缺失补齐、幂等、direct 原文字节以及缺失环境不注入。CC 以官方抓包为基础并标明派生变体，非 CC 使用普通 Messages 构造样本。缺失环境块／字段不注入是当前明确合同，不应表述为支持任意附件注入。

追加的客户端组件组合测试见 [测试方案第 10 节](ccgateway-feature-support/CC-304-ASSEMBLY-TEST-PLAN.md)：固定模板的全部 236,196 种合法来源分配单元验证通过；CC／非 CC 各 108 项真实 Worker／CLI 单字段、配对、多字段、混合来源与连续切换验证也全部通过。单元层使用明确的采集／计费替身，真实层独立核对实际出站；两个层次分别计数，不等同于全模型、全载体覆盖。本轮仅增加测试与报告，没有改动业务制品。

随后完成 [真实官方客户端实时转发](ccgateway-feature-support/CC-304-ASSEMBLY-TEST-PLAN.md)：在隔离 Docker 中实际启动未修改的官方 CLI 2.1.304，使其请求经记录入口进入 Worker，再由修复 CLI 发到 loopback SSE 上游并返回原版客户端。10/10 场景通过，10 次客户端请求对应 10 次上游请求，全部官方进程退出 0 且收到 `ASSEMBLY`；原生会话恢复保持同一 session，并携带 1→3 条消息的历史。此轮没有回放历史请求，但模型端仍是明确的本地模拟上游，未执行生产 Core／云模型验收。

## 11 304 迁移复核（2026-10-20）

本轮由 CLI、Worker／Controller、Core／前端三路独立复核。修复 Controller 镜像未复制 `runtime_updates.py` 的打包遗漏，并将 Controller 与通用镜像的新建默认版本改为 304。插件候选版本为 0.1.70，要求 Core >=0.1.172；这些版本号本身不代表已经部署。

复核结果：304 AST／制品输入哈希一致，Node 定向回归 68/68；当前 304 CLI 在隔离 Docker 的 normal、hooks-update、hooks-deny 三场景通过；Controller 102/102；前端 104 项、类型检查和生产构建通过。隔离 PostgreSQL 上 account、ccgateway、gateway、migrations 四包 625 个顶层测试通过、0 失败，9 个既有可选真实 CLI 集成测试因未配置其 fixture 跳过。新增 0056 数据库回归确认存量数据保留、迁移重复执行安全。真实官方客户端的 10 项另见前节，不能用被跳过的测试代替该证据。

迁移必须先补齐 Controller 配对更新能力，并在摘流后对运行中的目标完成旧 Worker 的维护接口 bootstrap，再激活 Worker＋304 CLI，最后保存 Core 的 304 版本并核验协调结果。不能先改全局版本。既有 active-runtime 指针优先于旧环境变量及 `/usr/local/bin/claude` 链接，验收应检查实际激活路径、SHA、Worker health 和内容处理能力。CLI 的 native/mods 测试通过不代表新 Worker 仍提供原 native 请求模式；正式请求模式为 build／direct。

证据保存在 `artifacts/claude-2.1.304/migration-cli-audit.json`、`controller-migration-review-tests.log`、`core-migration-validation-report.json`。发布前需再验证干净 Git 构建、最终镜像及真实迁移；本节不声明生产迁移完成。

## 12 正式迁移结果（2026-10-20）

生产迁移已完成：四个 Core 节点均为 **0.1.172**，CCGateway／Controller 为 **0.1.70**，全局选择 **build＋2.1.304**。运行制品来自 Git `9dfcb60b9c155d80e50f4aff1ee292f65e8522be`，离线迁移辅助程序来自 `a2f2fa17c2ee18d4363aed952a36d82dc53baded`；服务器使用精确 Git 工作树构建，没有上传源码替代 Git。

账号 30、31、32 原地完成 Worker＋CLI 配对升级，保持容器身份与账号卷；最终真实上游模型测试 **3/3 返回 200 和有效消息**。账号 21 在迁移期间被独立账号编辑操作停用（审计 1467，早于迁移摘流）；按用户要求完成 **离线更新到 304，保持 disabled／schedulable=false／容器 exited**。其 StartedAt 仍为原值，迁移没有启动它，因此没有将离线文件验收称为在线健康或真实上游通过。7 个原已停止的历史草稿保持原状；需要恢复它们时另行迁移。

最终运行镜像重新验证：官方真实 CLI **10/10**、组件组合 **216/216**，无失败、未知或漏跑；停机迁移故障恢复／启动保护演练 **4/4**。真实上游烟测使用管理端账号 native-build 测试，覆盖全局策略到 Worker／CLI／上游，不等同于平台 API Key 分组调度的全链路验收。Core 的 9 个可选真实 CLI fixture 用例仍为跳过，未计入通过。

正式 Worker SHA256：`5ece090925153f055d36c84894d134aa24f0346eec34b3c2a598809fc618360a`；304 CLI SHA256：`138da88ed5895fbc099115e7662df7ff9a6bd848d5a4cd142e29f2c9baaa56bd`。旧容器镜像标签和旧 CLI 链接保留作恢复用途，实际选择以 active-runtime 指针及 Worker health 为准。临时镜像覆盖已恢复为自动使用插件包；账号配置比对保留了上述独立的 21 编辑，没有覆盖它。

Core 发行包使用既有发布钥签名；插件沿用服务器既存的关闭密码学验签配置，没有改变 trust 或该设置，不能把包上传状态中的 valid 当作此次完成密码学验签。数据库新增 0055／0056，已备份；旧 171 不能直接读取新增迁移后数据库，恢复需要遵循数据库恢复边界。

证据：[生产汇总](../../artifacts/claude-2.1.304/production-migration-summary.json)、[真实上游复测](../../artifacts/claude-2.1.304/production-live-smoke.json)、[最终镜像验收](../../artifacts/claude-2.1.304/final-image-core172-plugin70-results/summary.json)、[离线迁移演练](../../artifacts/claude-2.1.304/offline-21-migration-probe-report.json)。

## 13 分组配置可选（Core 0.1.173）

按用户确认，分组 CC 策略不是账号自定义的前置条件：没有分组配置、或分组覆盖关闭时，账号自定义直接覆盖全局；只有已启用分组明确禁止账号覆盖时才忽略该账号的覆盖。保存校验、预览与真实请求解析共用同一判断。缺少请求分组上下文的后台探测仍使用全局，账号／分组归属权限和 revision 冲突检查保持有效。

UI 默认提示无需配置并隐藏覆盖字段，只有手动启用后展开；不因浏览／切换分组创建记录，不将继承值复制成固定覆盖。新建分组配置默认允许账号覆盖，已有关闭的分组草稿保留。

源码 `83107b8eeead030672a88ebbce6106d3d74edfc4` 已部署到四个 Core 节点，版本 **0.1.173**。前端 66 项测试、类型检查通过；隔离 PostgreSQL 上 account／ccgateway／gateway 三包的 Feature／CCGateway 专项通过，包括 4,128 个字段继承组合及认证分组到实际请求策略头的链路。四节点生产预览确认未配置分组可编辑、账号字段来源为 account，并确认预览不保存、配置未改写、四个账号容器未重启，账号 21 继续停用。此次生产核验未发起模型请求；CLI／Worker 没有改动。

数据库契约与 0.1.172 相同，插件／Worker／Controller 保持 0.1.70。生产验收：[optional-group-production-verification.json](../../artifacts/claude-2.1.304/optional-group-production-verification.json)。
