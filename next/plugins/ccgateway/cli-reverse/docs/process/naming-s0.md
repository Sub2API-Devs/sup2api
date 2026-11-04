# 第五阶段第二波（2a）命名：name-s0（组 0）

范围：`analysis/segments/naming-round3.json` 第 0 项，共 2,778 个顶层绑定，分布在 422 个阅读树文件、258 个 chunk 里。按目录：`cli/`（1,127：`cli/print/` 405、`cli/` 根 453、`cli/transports/` 116、`cli/headlessCloud/` 107、`cli/bg/` 46）、`commands/`（641，review/plugin/bridge/mcp/model/teleport 等）、`bridge/`（488）、`components/`（414）、`bootstrap/`（58）、根级 `commands.js` 等 43、`assets/` 6、`_unattributed/` 1。内容主要是 2.1.316 新增的桥接（Remote Control/CCR）、无头云会话、打印主循环、插件/评测、组件库与 CustomSelect。

## 结果

| 项 | 数量 |
|---|---|
| 清单内顶层绑定已覆盖 | 2,778 / 2,778（2033 个声明） |
| 本表新命名 | 2,775 |
| 未写、沿用已有名（不覆盖） | 3（见下） |
| `naming/semantic-s0.jsonl` 条数 | 2,775 |
| 说明（`naming/docs-s0.jsonl`） | 382 条：≥300 字节或导出的声明全部覆盖（382 = 410 个需说明的声明减去 28 个在别处已有说明的） |
| 改名引擎校验 | 258 个 chunk 中的 257 个（清单只涉及这些），2,775 条：拒绝 0、冲突 0、实际改名 2,775。见 `artifacts/tmp/s0/validate.mjs` |

置信度分布：0.9 1 条，0.88 6，0.85 413，0.82 668，0.8 446，0.78 338，0.75 298，0.72 184，0.7 170，0.68 30，0.65 97，0.62 31，0.6 93（其中 29 条 `note` 以“低把握”开头）。

命名风格：函数/变量 lowerCamelCase（1,502），常量（数字/字符串列表/RegExp/冻结表）UPPER_SNAKE_CASE（1,241），类与 React 组件 PascalCase（32），布尔 is/has/should/shouldn't 起始。

## 未命名的 3 个（保留已有名）

| 声明 | 当前名 | 现有名 | 原因 |
|---|---|---|---|
| `chunk-ypjxapg8.js#De` | `De_ypjx` | auto 0.1（占位改名） | 是个跨会话错误分类函数（把错误归为 bridge_auth/invalid_target/4xx/timeout/other），但同 chunk 的另一处 `De` 与它语义重叠，没有把握取到唯一好名字 |
| `chunk-tyg7f3ek.js#LP` | `MIB` | semantic 0.75 | 上一轮组已命名为 `MIB`；本文件里另有 `MIB = 1048576`，我本想叫 `UPLOADS_CENSUS_MIB_STEPS`，但会覆盖已有 semantic 名，按规则不覆盖 |
| `chunk-ajkmgejw.js#se` | `Web` | reference 0.85 | 参考源码里就是这个组件名（remote-setup 的 Web 连接向导），保留 |

## 发现的放错文件 / 模块名与内容不符的声明

- `chunk-ag5x7vhf.js#ch`（`SCROLL_TEST_LINE_COUNT`，200 行）连同 `ScrollTestFiller`、`buildScrollTestLines` 现放在 `components/ContextVisualization.js`，功能是全屏布局的 "scroll test" 占位区块（关闭对话框后消失）。唯一调用方是 `components/FullscreenLayout.js:271`，应归 `components/_new/FullscreenLayoutView.js`（或独立的 ScrollTestFiller 文件），与 `/context` 的可视化无关。
- `chunk-tyg7f3ek.js@526998`–`@531981`（`HOST_OTEL_KEY_PATTERN`、`MAX_OTEL_ATTRIBUTES`、`SURVEY_*` 枚举表等）放在 `cli/print/mcpTurnRedial.js`，但内容是 **host OTel 事件转发与反馈问卷**（`canRouteHostOtel`、`routeHostOtelEnvelope`、`surveyEventType`），与该文件"下一回合 MCP 重拨"主题不同；文件头注释写的是"MCP 重试编排、下一回合重拨与宿主 OTel 事件转发"，说明切分阶段就合在一起了。
- `chunk-ah34pb7m.js` 的 `Qn`、`rn`（`Ar()` 注册的模块对象，分别导出 `PlacedSite`、`CommandOutputSite`）被放进 `bridge/inboundMessages.js`，但消费方是 `components/Message.js:522` 与 `components/messages/UserTextMessage.js:499`（插件 UI 渲染站点注入点），与桥接入站消息无关，明显是 affinity 误并入，应归 `components/messages` 或 `plugins/functionHooks/ui/renderSites` 一侧。
- `chunk-pjm08t7p.js@10319`–`@10666`（`BRIDGE_CARRIED_FLAG_NAMES`、`MAX_SERVER_EXTRA_ARGS`、`EMPTY_BRIDGE_SERVER_CONFIG` 等）放在 `bridge/bridgeServerConfig.js`，内容与文件名一致（把服务端下发的 claude_code_args/MCP 应用到桥接会话），无需移动。
- `chunk-tyg7f3ek.js@250542`–`@253270`（`HEAP_CENSUS_*`、`UPLOADS_CENSUS_*`）放在 `cli/print/headlessCensus.js`，属无头堆/上传量普查，文件名与内容一致，无需移动。
- `chunk-nkdv7dw8.js` 的 `handleMcpReconnect`/`handleMcpToggle`/`handleGetContextUsage` 等（`cli/print/mcpControlRequests.js`）与同 chunk 的 `cli/print/sessionControlRequests.js` 的处理器共用 `CONTROL_REQUEST_HANDLERS`，两文件按 MCP/会话两主题拆开是对的。
- `chunk-1qpz7qcd.js` 同时贡献 `bridge/attestationGate.js`、`bridge/controlRequests.js`、`bridge/bridgeMessaging.js`、`bridge/replControlHandler.js`、`bridge/deviceAttestation.js` 五个阅读树文件，同名压缩名（`F`、`x`、`gt`、`Et` 等）在各自文件里含义不同；本表按 chunk 键命名，已在名字里加后缀区分（`_2`/`_3`…），阅读树聚合时仍可能出现同名，需要生成器按模块再做一次冲突检测（`naming/README.md` 第 8 节）。

## 做法与工具（都在 `artifacts/tmp/s0/`）

- `dump.mjs`：按阅读树路径聚合本组声明（一个 chunk 可能贡献到多个文件，所以按 `path` 分组，并按 `(path,line)` 合并多绑定声明），输出 `dump/NNN.txt`（每个文件一份，含声明源码、本组绑定、同声明其他顶层绑定、文件内用法、导出列表）和 `items.json`。
- `brief.mjs` / `rest.mjs`：精简阅读；`rest.mjs` 只打印仍有未命名绑定的声明，并自动排除"已被门面/参考源码命名"的项。
- `uses.mjs`：给定路径与压缩名，打印其在文件内的全部出现行，用来确认常量的语义（例如区分"碎片大小"与"保留量"）。
- `n/*.jsonl`：人工命名决定，每行 `{"chunk","name"/"key","new","conf","note"}` 或 `{"decl","doc"}`。
- `build.mjs`：编译成 `naming/semantic-s0.jsonl` / `naming/docs-s0.jsonl`，检查文件/名字合法性、门面与 vendor 名不被覆盖、已有 semantic 名不被覆盖、重复项；同时输出覆盖率与 `build-report.json`。置信度 <0.5 剔除、0.5–0.6 提到 0.6 并标"低把握"（本组没有低于 0.5 的条目）。
- `doclist.mjs` / `docview.mjs` / `doclist-names.tsv`：列出 ≥300 字节或被导出的声明、已有说明情况与源码摘要，用于批量写中文说明。
- `validate.mjs`：对 `semantic-s0.jsonl` 里每个 chunk 调 `renameModule`，统计拒绝、冲突与改名数。

## 与其他命名表的重合（交给 lead 取舍）

- 键重合 2 处，都在 `naming/_semantic-tools-lowconf.jsonl`（该文件以 `_` 开头，加载时会被跳过）：其中 1 处同名（`chunk-gfa3ceg6.js@3593 SUBMODULE_UPDATE_MODES`，与 tools 组一致）；1 处不同：`chunk-gfa3ceg6.js@3468` 我叫 `OPT_IN_GIT_CONFIG_PATTERNS`，tools 组叫 `SENSITIVE_GIT_CONFIG_KEY_PATTERNS`——代码是"仅在显式允许时才传递的 git config 键"（ssl/proxy/lfs/merge.conflictstyle），两个名字都能说得通，以 lead 取舍为准。
- `chunk-tyg7f3ek.js@253225`：现有 semantic 名是 `MIB`（上一轮组所定），本文件里另有 `MIB = 1048576`，我未覆盖。
- 门面名与 reference 名（如 `chunk-ajkmgejw.js#se → Web`）均未覆盖。
- 与 `naming/final` 合并后再跑一遍引擎（把 final 里同 chunk 非 minified 的条目一起喂给 `renameModule`）：冲突 16 条，全部来自 final 既有条目之间的同名，本表条目 0 条。为避免与 final 里的语义名/导入名撞车，我改过 16 个名字（`countUtf16CodePoints`、`noopTaskClickHandler`、`visibleFrameUrls`、`taskInputFieldNames`、`handleBackgroundTasks`、`artifactFrameSchema`、`REVIEW_REUSE_ANGLE_LOW_EFFORT`、`marketplaceLabel` 等）。

## 已知限制

- 多绑定 `var` 声明（223 个声明、968 个绑定）逐个核对了初值：发现并修正了 6 组错位命名——`SURVEY_*` 枚举表整体错一格（wK 实为响应值、vK 为类型…）、`deviceRegistration` 的 `_gi`/`bgi`/`_`/`N`/`Hdr`/`S`/`I`/`kZo` 不是超时常量而是稳定判定时间、关闭码 4000、争用重连基准与重公告延迟、`WorkerSocket` 的 `Ts` 是 hello 超时（不是写队列 tick）、artifacts 的 `ht` 是 ISO 时间正则、host OTel 的 `Xn`/`Qn`/`co` 是能力名/应答措辞/首个流策略超时，以及 `sessionControlRequests` 的 `kn` 是可直接放行的子类型集合。
- 大量 2.1.316 新模块只有英文注释/字符串作为证据，`bootstrap/` 与 `bridge/` 的状态切片类字段（如 `SessionFlags`、`ToolsUsedSet`）只按字段名和读写点命名，未逐字段验证业务语义。
- React Compiler 生成的 `nullPlaceholderN`/`emptyPlaceholderN` 占位函数按固定模式命名（共 38 个），名字只表达"恒 null / 恒空串"。
- `commands.js` 里 16 个 `gatedCommandSlot_*` 与 17 个 `stubCommand_*`（含若干别名）是构建期被裁掉的命令位，只能按"占位"命名。
