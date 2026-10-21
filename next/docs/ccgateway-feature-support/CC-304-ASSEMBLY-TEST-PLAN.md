# CLI 2.1.304 原生组装链路测试方案

本方案针对“客户端请求拆分 → 按配置修改计费／环境 → 原生 build → 实际出站”的完整链路。验收对象是 **CLI 2.1.304 + ccgateway v12**。用例按原生组装阶段分组；配置组合数量、HTTP 200 和静态分支清单都不能代替请求内容正确性。

**最新修复后的既定合同验收已通过：75/75，见第 8 节。** 第 3–7 节保留修复前的 AST／REA 分析、72 项运行结果与缺口，旧失败报告不改写；“全部合同通过”不等于原生 CLI 全分支覆盖。

## 1 验收合同与边界

| 合同 | 验收方法 |
|---|---|
| direct | 原始请求正文按字节相等，转换策略不改变正文；例外是身份改写，以及 OAuth 请求缺少 Claude Code 开头行时插入该行（只插入字节） |
| build 的 system/messages | JSON 结构及全部非目标内容相等；只允许明确选择的计费／环境字段改变 |
| 工具目录 | 名称、顺序、schema、description 是否存在、延迟标志及其他客户端字段逐项比较；不能只核对工具数量 |
| 生成参数 | 每个字段单独声明保留、已证实的原生归一化或不支持；未确定合同记为 unknown |
| 原生归一化 | 必须有固定版本源码证据和针对性断言；不能因为当前输出如此就把它当预期 |
| 无匹配／歧义 | 环境段保留原内容，不凭空插入；计费字段选 worker 时没有计费头才插入，计费头歧义（多个头、重复或格式不对）400 零调用，不保留客户端值 |
| 最终发送 | 成功请求恰好一次模拟上游调用；无效输入零调用；响应／错误／流式按合同返回 |
| 连续会话 | 历史内容与工具配对不损坏，同一输入重复转换幂等，相邻请求配置互不污染 |

范围是进入 Worker 的 Anthropic Messages 请求，以及当前第一方 HTTP 发送路径。普通非 CC 请求也必须已经符合 Messages 协议。Bedrock、Vertex、交互式 Agent 的全部工具执行、真实云端鉴权刷新、生产 Docker 升级回滚不在这次完整性声明内。排除项不能在报告里显示为通过。

## 2 实际组装顺序与测试分组

`Worker 解码和分解 → prepareBuildInput → applyContentPolicy → 注册工具 → jOt/qmn → Gmn/jA/Xfr 与 FH → uXn 构造请求体 → 原生计费捕获和合并 → openModelRequest → 回传`

| 分组 | 对应阶段 | 必须检查的行为 |
|---|---|---|
| INPUT | Worker 分解、request-options、prepareBuildInput | 缺失与 null、非法 JSON、数字范围、内部保留键、system 字符串／数组、错误输入零发送 |
| SYS | systemRecord、原生 system 组装、wire 恢复 | 无 system、自定义文本、多块、缓存标记、已有空块、官方原始 system；非目标字节片段和块属性保留 |
| MSG | Gmn、jA、Xfr 与 wire messages | 文本／数组、多模态、工具调用与结果、跨轮历史、交错 system、引用代码围栏、重复与孤立工具配对 |
| TOOLS | registerNative、B1e、FH、qmn | 官方全目录、ToolSearch、defer_loading、缓存字段、顺序、缺失 description、完整 JSON schema、tool_choice 与工具存在性 |
| PARAM | buildRequest.options、qmn.uXn | model、max_tokens、temperature、top_p、stop_sequences、metadata、thinking、output_config、context_management、原生 beta／provider 条件及额外请求体覆盖 |
| BILL_ENV | PAs、kLo、原生环境 helper、content-policy | 两计费字段来源、十环境字段来源、system／首 user／历史更新、缺失／歧义／围栏、增量更新和幂等；客户端使用 exclude-dynamic-system-prompt-sections 时仍正确 |
| POLICY | 三层解析与请求策略 | 全局／分组／账号逐字段继承、双开关、follow/custom、混合来源、direct、相邻和并发请求配置隔离 |
| SEND | request-command、openModelRequest | 正文、模型凭据选择、内部策略头不外泄、单次发送、上游错误、流式和非流式响应 |

每个运行用例必须有稳定 ID、所属分组、合同、fixture 来源、源码符号、实测状态和差异。一个用例可触及其他组，但不能据此宣称其他组全部覆盖。

## 3 AST 与 REA 证据

### AST

[assembly-inventory.cjs](../../plugins/ccgateway/companions/cli-mods/test/analysis/assembly-inventory.cjs) 用 Babel AST 唯一定位关键声明，记录文件 SHA、函数 SHA、精确字符范围、行号和决策点。嵌套的 `uXn` 单独归属，避免重复计入 `qmn`。

初次清单包含 14 个文件、33 个符号、3,335 个语法决策点；**所有决策点执行状态都是 unmeasured**。该数包含原生重试／流读取以及未必能从 build-only 路径到达的代码，并非 3,335 个有效测试分支，更不是执行覆盖率。完整闭包、动态调用和 provider 运行条件还需独立证据。

[参数分析脚本](../../plugins/ccgateway/companions/cli-mods/test/analysis/parameter-assembly-analysis.cjs) 进一步追踪“输入字段 → 适配层 options → 原生最终对象”，记录条件和后置覆盖。工具专项分析则定位候选集、ToolSearch 筛选、schema 生成和缓存标记。

### REA

REA 已实际解析原始计费模块 `chunk-t61vswm2.js`、`chunk-6qx5mjec.js` 和补丁目录内六个适配模块；不是只阅读文件名：

| 分析 | 结果 | 限制 |
|---|---|---|
| 原始计费两个模块 | 2 文件，22,695 AST 节点，0 解析失败 | 2,468 个未选文件；依赖与语义图 partial |
| 六个补丁适配模块 | 6 文件，9,428 AST 节点，0 解析失败 | 2,475 个未选文件；动态调用及属性仍有 unknown |
| `fingerprint` 属性流 | 两个候选 seed，结果 ambiguous | 不能推断为确定调用链 |
| `isDeferred` 属性流 | 一个 seed，零可确认关系，结果 ambiguous | 由 AST 专项和运行回放补证，不能把未解析关系当作不存在 |
| 精确 `cc_version` literal 查询 | 无精确匹配 | 文本位于模板字面量，不能据此判定源码没有计费逻辑 |

完整原始证据导出至 [rea-evidence.json](../../../artifacts/claude-2.1.304/assembly-audit/rea-evidence.json)，便于核验 ID 和限制；文件较大。常用索引见 [rea-summary.json](../../../artifacts/claude-2.1.304/assembly-audit/rea-summary.json)。REA 的顶层导出计数不能替代各语义图内部 unknown 清单。静态关联不证明实际执行。

## 4 用例与预期值来源

1. **真实官方 fixture**：未修改的官方 304 CLI 在新 HOME／工作目录实际发出的请求。固定正文和制品 SHA，保留原始抓包来源。
2. **派生 fixture**：从官方抓包删除计费、替换载体、增加历史等；明确标记 derived，不能冒充另一种真实客户端实测。
3. **普通 Messages fixture**：手写协议边界、图片和工具往返、未知字段；明确标记 synthetic。
4. **原生 helper 分支**：从固定 SHA 的 AST 提取函数执行，外部依赖逐个显式 stub；证明 helper 在指定条件下的行为，不能替代完整 ELF 运行。
5. **配置矩阵**：真实 Go resolver 生成 wire policy，Vue 控件测试验证提交值，真实 Worker 检查最终出站；这三种证据分别标记层次。

预期值不调用生产替换器生成。不因 actual 输出多出或少了字段，就自动把 expected 同步成 actual。已证实原生 metadata、thinking 或默认参数处理，需要明确声明归一化规则和适用条件。

304 的 `cc_version` 后缀也要独立断言：`qmn → RIs(Aa) → PAs → kLo`。`RIs` 选第一个非 meta user 记录的首个文本，取 UTF-16 下标 4、7、20 的字符（缺位为 `0`），与原生固定盐及 `2.1.304` 拼接后计算 SHA-256 的前三位。它不是整个请求的摘要。生成预期值须使用预期转换后的消息，不能从实际出站的 `cc_version` 抄回 expected；客户端来源则保留客户端原值，不重算。

## 5 门禁与已知缺口

- `pass`：合同全部满足，且所需发送次数、响应、正文检查完成。
- `fail`：违反已定义合同；已知缺陷仍然是失败。
- `unknown`：预期合同或必要证据不足。
- `not-run`：有测试计划但没有运行结果。
- `out-of-scope`：明确不在此次路径内，附理由；不计作通过。

出现 fail、unknown 或缺少计划用例结果时，整体验收不得绿色通过。AST 分支尚未插桩测量，因此即使运行用例全绿，也不能声明原生 CLI 分支 100% 覆盖。

修复前发现的失败／缺口（当前处理结果见第 8 节）：

| 项目 | 当前证据 | 处置 |
|---|---|---|
| 官方请求 ToolSearch 丢失 | 实际输入 12 工具，build 输出 11；适配层与原生延迟标志不一致 | 保留严格失败，待业务修复后复跑 |
| top_p、stop_sequences、context_management | 输入字段未进入当前适配映射，实际抓包丢失 | 每字段独立失败，不合并成“参数大致正确” |
| 未提供工具 description | build 增加空 description | 严格保真测试失败；若产品允许归一化，需显式修改合同 |
| 原生额外请求体 | qmn.uXn 后置 spread 可能覆盖先前字段 | 单独验证 CLAUDE_CODE_EXTRA_BODY 的可达性与 Worker 环境边界 |
| native model／thinking 分支 | 不同模型和强制工具选择可能产生不同原生行为 | 按源码条件细分；没有可靠 oracle 的项保持 unknown |
| 全量原生分支执行率 | 尚无对所有原生决策点的运行插桩 | 报告 unmeasured，不伪造覆盖百分比 |

## 6 重现与制品身份

当前补丁 ELF SHA-256：`08aa7c7d97532ef28cfccd31e2b4c4c84c2bd87509669e951cd106df488fb727`。

官方 ELF SHA-256：`ea0f135784631619a7a409d07322ecec964f9cc4fd377508ed1ba3f141f27912`。

Worker SHA-256：`03af739a358643ea063a812cfb6e81c901a32ad3c901b623c0850f077806585d`。

在仓库根目录执行静态库存：

```powershell
node next/plugins/ccgateway/companions/cli-mods/test/analysis/assembly-inventory.cjs
node next/plugins/ccgateway/companions/cli-mods/test/analysis/parameter-assembly-analysis.cjs
node next/plugins/ccgateway/companions/cli-mods/test/analysis/tool-assembly-analysis.cjs --assert-contract
node next/plugins/ccgateway/companions/cli-mods/test/analysis/assembly-coverage.cjs
```

运行链路使用一次性 Linux 容器、`--network none`、测试凭据和 loopback 模拟上游。报告必须带实际制品 SHA；HTTP 200 不能覆盖失败状态。旧 87 项配置矩阵与 52 项回归报告保留原范围，不重新解释为新的整体通过。

工具分析不带 `--assert-contract` 时只检查分析器和原生 helper 是否按已观察源码工作，保真缺陷保存在报告里；用于验收必须带该参数。总体门禁还会检查 manifest SHA、逐用例 ELF SHA、重复／多余／漏跑 ID，不能把旧制品或过滤运行报告当作完整结果。

## 7 本轮实测结果

加强断言后，最终 72 项全部重新执行，**52 通过、19 失败、1 unknown、0 漏跑**。主线独立执行覆盖门禁，确认 manifest、用例定义、CLI／Worker SHA 与报告一致，返回 `blocked`（退出码 1）。首批 56 项报告作为历史证据保留，不混用首批较弱的断言。

本地 Node 套件 **86/86 通过、0 跳过**，包含新增的 6 个原生指纹回归与 5 个覆盖门禁回归，日志见 [node-tests.log](../../../artifacts/claude-2.1.304/assembly-audit/node-tests.log)。门禁回归确认 HTTP 成功、汇总 pass 或旧 SHA 不能绕过缺失／失败的语义断言。这一结果证明这些测试自身及支持模块满足其断言，不抵消真实组装链路的 19 个失败。

| 分组 | 通过 | 失败 | unknown |
|---|---:|---:|---:|
| INPUT | 11 | 3 | 0 |
| SYS | 4 | 0 | 0 |
| MSG | 7 | 1 | 0 |
| TOOLS | 4 | 7 | 0 |
| PARAM | 11 | 8 | 1 |
| SEND | 7 | 0 | 0 |
| BILL_ENV | 8 | 0 | 0 |
| 合计 | 52 | 19 | 1 |

72 项产生 61 次 loopback 上游请求。11 项拒绝用例正确零发送；另外 3 项本应拒绝却发送，已经计入失败。模拟上游接受请求并不证明真实模型 API 会接受。

POLICY 分组复用同一制品之前的 [87 项实际策略矩阵](../../../artifacts/claude-2.1.304/worker-config-matrix-report.json) 和核心／Vue 配置测试证据，单独统计，没有把它们再次计入这 72 项。该矩阵验证已定义的继承／来源组合，不代表 12 字段任意配置的完整笛卡尔积。

失败按根因归纳如下；同一根因可能对应多个失败场景：

1. `ToolSearch` 被过滤，导致工具发现、强制指定 ToolSearch 和历史 tool_reference 配套目录不完整。
2. 混合服务端／自定义工具重排，缺失 description 被补为空字符串。
3. `top_p`、`top_k`、`stop_sequences`、`service_tier`、`context_management`、额外 output_config／未知顶层参数丢失。
4. `max_tokens=0/-1` 和非法 `thinking.type` 没有在入口拒绝，仍产生上游调用。
5. 继承的 `CLAUDE_CODE_EXTRA_BODY` 确实能后置覆盖 system、messages、max_tokens。

唯一 unknown 是默认模型配置下 `thinking: enabled` 的精确预算／adaptive 门控；另一个显式关闭 adaptive 的用例已经验证，不能用它替代默认条件。两项 thinking 的 `display: updates` 通过 AST 确认属于原生输出规则后，采用明确预期重跑，没有删除字段以回避比较。

官方完整抓包的 build 用例：system/messages 保真，但 ToolSearch 与 context_management 丢失，整例失败；同一官方抓包的 direct 原文字节比较通过。计费组通过独立指纹计算校验，不再只判断版本字符串格式。

可复核材料：

- [固定用例定义](../../plugins/ccgateway/companions/cli-mods/test/fixtures/assembly-cases.json)、[运行说明](../../plugins/ccgateway/companions/cli-mods/test/assembly-replay.README.md)。
- [最终真实链路报告](../../../artifacts/claude-2.1.304/assembly-replay-report.json)、[覆盖门禁报告](../../../artifacts/claude-2.1.304/assembly-audit/coverage.json)。
- [工具 AST／VM 报告](../../../artifacts/claude-2.1.304/assembly-audit/tools.json)：23 个分支清单，36 个原生 helper 断言通过；保真合同 2 通过、4 失败。VM 依赖有显式 stub，不冒充完整 ELF 执行。

本轮修正的是测试和证据记录。业务缺陷仍在，未部署。有限测试清单已经全部执行，但原生所有模型／运行时条件的分支覆盖率仍是 unmeasured，不能据此宣称任意输入、任意模型或全部配置笛卡尔积都已验证。

参数 AST 另列出 71 个更细的原生建议场景。[语义映射](../../../artifacts/claude-2.1.304/assembly-audit/parameters-runtime-map.json) 对照修复前的 72 项运行清单：16 项有相应计划、30 项部分覆盖、25 项尚无相应计划。这里的“计划”不是通过；其余缺口涉及模型别名／能力上限、不同模型门控、组织开关、其他 provider 和 standalone／Worker 的交叉边界等。该清单与 72 项运行用例不是同一个计数维度，不能用 72 大于 71 推导全部覆盖。

## 8 修复后复验

修复明细及新制品见 [实现记录第 10 节](../CLAUDE-CODE-2.1.304-IMPLEMENTATION.md)。原 72 项继续执行，增加 tools 空数组／null／错误类型三项，工具断言进一步区分字段缺省和空数组。原 unknown thinking 用例依据独立原版 AST oracle 写出准确预期，再在新 ELF 实际重跑。

| 分组 | 通过／计划 | 失败 | unknown／漏跑 |
|---|---:|---:|---:|
| INPUT | 16/16 | 0 | 0 |
| SYS | 4/4 | 0 | 0 |
| MSG | 8/8 | 0 | 0 |
| TOOLS | 12/12 | 0 | 0 |
| PARAM | 20/20 | 0 | 0 |
| SEND | 7/7 | 0 | 0 |
| BILL_ENV | 8/8 | 0 | 0 |
| 合计 | **75/75** | **0** | **0** |

原生管理字段仍由原生代码决定；额外参数按输入透传。ToolSearch、混合工具顺序、description 缺省、context_management、其他参数和 EXTRA_BODY 隔离均通过原严格合同。非法输入拒绝用例要求零上游调用。实际发送总数 59，与 16 项拒绝用例严格对应。

默认 `assembly-coverage.cjs` 现读取 [修复报告](../../../artifacts/claude-2.1.304/assembly-repair-report.json)，输出 [repair-coverage.json](../../../artifacts/claude-2.1.304/assembly-audit/repair-coverage.json)，实际门禁 `pass`，无身份、合同、定义哈希或断言缺失问题。原 [72 项定义](../../../artifacts/claude-2.1.304/assembly-cases-pre-fix.json)、失败报告和 coverage.json 保留为历史；不要拿更新后的 75 项 manifest 验证旧制品报告。

修复前的工具／参数诊断脚本含历史判断，现在明确绑定原快照，拒绝混用新适配层，避免修复后仍生成“参数丢失”的过时结论。thinking 的当前特定模型预期见 [独立 oracle](../../../artifacts/claude-2.1.304/assembly-audit/thinking-enabled-fixture-oracle.json)。

附加回归：Node 101/101、Go 两模块通过、真实配置矩阵 87/87、CLI 出站 52/52。未执行生产部署。第 7 节较细的跨模型等覆盖缺口仍作为后续测试范围，不因本次已确认缺陷修复而自动变成已验证。

## 9 CC／非 CC × 修改／缺失补齐专项

为直接回答不同客户端的附件处理覆盖范围，另建 [14 项固定合同](../../plugins/ccgateway/companions/cli-mods/test/fixtures/client-content-cases.json)，复用真实 Worker／CLI 引导与严格出站比较。两份二进制均为第 8 节修复后的 SHA，结果 **14/14 通过，14 次上游请求，0 fail／unknown／漏跑**，独立门禁通过。

| 场景 | CC | 非 CC |
|---|---|---|
| 客户端来源，保留原内容 | 通过 | 通过 |
| 修改已有计费与环境字段 | 通过 | 通过 |
| 对修改后的内容重复处理，保持幂等 | 通过 | 通过 |
| direct 即使携带转换策略也保持原文字节 | 通过 | 通过 |
| 计费缺失，按 worker 来源补齐一次 | 通过 | 通过 |
| 环境块缺失，不注入新块 | 通过 | 通过 |
| 环境字段缺失，不注入新字段 | 通过 | 通过 |

CC 基础样本来自未修改的官方 CLI 2.1.304 实际抓包；修改、删除计费／环境等变体明确标记为 derived，不冒充再次运行官方 CLI 产生的原始请求。非 CC 是普通 Anthropic Messages 构造样本，通过真实 HTTP 调用测试 Worker，不代表所有第三方客户端或其他协议均已测试。

修改案例明确要求计费文本和环境文本真的发生变化，避免输入、输出值碰巧相同而形成无效覆盖。独立预期将工作目录替换为隔离 Worker 目录、删除选中的 shell 字段，并独立计算原生计费指纹；所有其他 system/messages、12 个官方工具定义或普通自定义工具仍逐项保留。

**本设计的“注入”仅包括缺失的服务端计费归属补齐。环境信息只处理已存在且可识别的块／字段，缺失时不凭空新增；其他 reminder、文件或任意附件不在转换范围。** 因此本报告没有宣称支持“非 CC 没有任何环境内容时注入整套 CC 环境附件”。

证据：[专项运行报告](../../../artifacts/claude-2.1.304/client-content-report.json)、[专项覆盖门禁](../../../artifacts/claude-2.1.304/assembly-audit/client-content-coverage.json)。可复跑：

```sh
node test/fixtures/build-client-content-manifest.cjs
# 在 assembly-replay.README.md 的隔离容器命令上增加：
# -e PROBE_MANIFEST=/tests/test/fixtures/client-content-cases.json
# 使用同一 assembly-replay.cjs，将 stdout 保存为 client-content-report.json
```

## 10 客户端组件的单字段、多字段与组合替换

按“使用客户端组件，单个替换、多个替换、组合替换”新增两层验证。本轮不改变业务代码和二进制。

### 10.1 全来源组合单元测试

[慢速单元套件](../../plugins/ccgateway/companions/cli-mods/test/analysis/client-combination-unit.mjs) 穷举 10 个环境字段的 client／worker／erase，以及 2 个计费字段的 client／worker，共 `3^10 × 2^2 = 236,196` 种合法来源分配。

**236,196/236,196 通过，0 失败，耗时约 111.4 秒。** 每项实际调用生产内容转换器并再次应用，验证完整请求等于独立 golden 预期、原输入不变及幂等。共 472,392 次转换调用；4,096 个组合不读取环境，232,100 个组合只读取一次且字段集合准确。

预期由固定原生模板的有序字段片段构造，不使用生产匹配器决定预期。该层固定一个完整 user reminder 载体，环境采集和计费生成为明确的样本替身；不宣称 236,196 次真实 CLI 执行。worktree／github_cli 的客户端与服务端 golden 文案相同，其来源还通过 collector 请求集合及 erase 分支核对，不能仅凭文字相等推断替换成功。缺失、歧义、代码围栏、其他载体和历史增量继续由既有专项覆盖。

[单元矩阵报告](../../../artifacts/claude-2.1.304/client-combination-unit-report.json) 记录完整枚举规则、每字段每来源计数、失败清单、结果摘要哈希及源码哈希，确认执行期间源码未改变。原有内容策略 30 项测试也通过，保留其中的 150 个载体场景、1,620 个配对场景和并发配置测试。

### 10.2 真实 Worker／CLI 组件矩阵

CC 与非 CC 各 108 项，合计 **216/216 通过，0 失败、0 unknown、0 漏跑**。每项恰好一次 loopback 上游请求。

| 分组 | CC | 非 CC | 合计 |
|---|---:|---:|---:|
| 单字段 worker 替换（12 字段） | 12 | 12 | 24 |
| 单字段 erase（10 环境字段） | 10 | 10 | 20 |
| 任意两字段同时 worker 替换（12 选 2） | 66 | 66 | 132 |
| 3／4／6／10／12 字段同时替换 | 5 | 5 | 10 |
| client／worker／erase 混合来源 | 6 | 6 | 12 |
| 连续请求切换 worker／erase／client | 6 | 6 | 12 |
| 全 client、重复应用、direct 原样 | 3 | 3 | 6 |
| 合计 | **108** | **108** | **216** |

CC 保留官方抓包主体、工具目录和其他 reminder，换入完整原生客户端环境模板与计费哨兵，明确标记派生来源。非 CC 保留普通 Messages 工具往返、工具结果内媒体和其他文本。每次比较整个 system/messages、完整工具定义与所有非目标内容，生成参数仍使用第 8 节明确的原生规则。

独立预期在隔离 Linux 容器中由 golden 片段、受控工作目录及 OS 事实构造，不读取生产转换结果反推预期。此运行环境不存在的可选服务端字段预期被移除；与单元层存在全部服务端字段的样本相互补充。真实矩阵不是所有输入、载体和模型的笛卡尔积。

使用同一已验证 CLI `138da88e…56bd` 和 Worker `98f2746f…79db`。可复跑入口为 [component-combination-replay.cjs](../../plugins/ccgateway/companions/cli-mods/test/component-combination-replay.cjs)，说明见 [测试 README](../../plugins/ccgateway/companions/cli-mods/test/assembly-replay.README.md)。实际生成的完整 [216 项合同](../../../artifacts/claude-2.1.304/component-combination-cases.json) 和 [出站报告](../../../artifacts/claude-2.1.304/component-combination-report.json) 一并保存，覆盖门禁另核对 manifest、逐项定义、制品 SHA、必需断言和漏跑项。

## 11 Docker 中真实官方 CC 客户端实时转发

根据“启动真实 CC 客户端转发过来”的要求，新增 [live-official-client.cjs](../../plugins/ccgateway/companions/cli-mods/test/live-official-client.cjs)。此次每个请求均由未修改的官方二进制当场生成，不加载历史请求 fixture，不调用生成器拼装客户端请求。

实际链路：

```text
官方 Claude Code 2.1.304（真实 --print / --resume 进程）
  → 原字节记录入口（只增加可信测试策略 HTTP Header）
  → 真实 Worker
  → 修复后的 CLI 2.1.304
  → loopback 模拟 Anthropic SSE 上游
  → 响应返回官方客户端，客户端输出 ASSEMBLY
```

在 `--network none` 的隔离 Docker 中执行，官方版本命令输出 `2.1.304 (Claude Code)`，原版 ELF SHA 为 `ea0f1357…f27912`；修复 CLI 和 Worker 仍为第 8 节的 SHA。使用合成 API Key，全新客户端 HOME／工作目录，未连接生产 Core 或真实云模型。

**最终 10/10 通过，10 次真实客户端模型请求、10 次 Worker 上游请求，0 额外 API 请求，0 入口错误。**

| 场景 | 实测结果 |
|---|---|
| 默认客户端来源 | 原提示内容／工具保持，原生 metadata 使用 Worker 身份 |
| 单独替换工作目录 | 真实客户端目录改为隔离 Worker 目录，其他内容不变 |
| 单独替换 cc_entrypoint | 客户端用合法启动环境生成 sdk-ts，出站按策略变为 sdk-cli |
| 多字段替换 | 工作目录、Shell 擦除、cc_version／cc_entrypoint 均核对实际差异 |
| 混合来源 | client 字段保留，worker 字段重建，erase 字段删除 |
| direct 带替换策略 | 最终上游原文字节与入口捕获完全一致 |
| `--exclude-dynamic-system-prompt-sections` | 实际环境位于首条 user，选中字段正常处理 |
| 自定义 `--system-prompt` 与排除参数 | 自定义提示原样保留，实际存在的环境正常处理 |
| 原生会话首轮 | 用 `--session-id` 持久化，真实客户端收到 SSE 结果 |
| 原生 `--resume` 第二轮 | 同一 session，消息从 1 条增为 3 条；首轮用户、助手和第二轮用户历史保留，新策略生效 |

默认调用、排除参数调用和自定义 system 调用在本次样本中都观察到首条 user 环境。不能因此宣称开启参数时相对默认发生了位置迁移，也不能假定自定义 system 就一定没有环境附件。

独立预期依据入口捕获及受控 Worker 目录／系统事实计算，只修改选中字段；计费指纹从预期消息独立计算。出站对完整 system/messages/tools 逐项比较，其他参数除明确原生 metadata 身份外保持；另检查 HTTP POST `/v1/messages`、客户端 beta 保留、凭据隔离、一个计费块、SSE 完成以及官方客户端退出 0、result 为 `ASSEMBLY`。

原 Buffer 转发属于源码层证据，direct 的最终原文字节比较为独立端点验证；没有把本地重复计算哈希当作 Worker 接收端证明。该测试证明真实客户端生成、Worker 处理、转发和客户端解码链路，不证明云模型生成、提示缓存命中或真实工具执行。

证据：[完整实时抓包与断言](../../../artifacts/claude-2.1.304/live-official-client-report.json)、[独立汇总校验](../../../artifacts/claude-2.1.304/live-official-client-summary.json)。测试容器执行后已清理，业务代码和制品没有改变。
