# Named eager + explicit deferred bystander

2026-10-09，本地候选，未提交或部署，未调用真实提供商。

重新读取[官方工具搜索文档](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)：`defer_loading`控制上下文加载，每次请求仍须提供完整定义。这是目录保真的依据，不证明所有模型接受强制工具选择。提供商拒绝仍按原400返回。

## RED 与观察

新增隔离CLI 2.1.292测试 `TestRealCLIForcedMixedNamedClientTool`，JSON/SSE各新/结果续聊/回退/cold四请求。原实现两组均在准入阶段400（1.275s）。只扩named eager资格后，两客户端定义实际均出现在最终目录，原tool choice未改auto，但旧verify把无关deferred定义强制为false，新测试8次出站断言均失败（7.049s）。这不是缺目录，也不需要捏造搜索发现。

该实验沿用原CLI deferral环境和注册路径；没有修改ENABLE_TOOL_SEARCH，没有启用helper。原verify能通过说明CLI该工具的deferral表示为缺省/false，而非原API explicit true。采用最小修复：完整校验实际客户端名字/schema/重复/未知项后，在mixed模式以原始已验证RequestPlan目录重建公开字段，仅使用既有wireName映射。保留原顺序、字段存在性、schema数字和cache marker；缺任何客户端定义仍拒绝，绝不根据名字补缺目录。整批提交避免失败时部分改写。

## 边界

复用单一 `forcedLoadedClientCatalog` 资格，现有执行权限、max-turns=1、响应视图、预算和历史调用点同时采用，无第二套判定。仅named目标explicit false，其余ordinary工具必须有explicit bool；any mixed、named deferred、implicit、inline/MCP/server/typed/safeguards及legacy synthetic仍拒。原全eager any路径保留。

只改 `forced_loaded_tool.go`，未改runner环境或动态MCP业务。原review测试中“unrelated explicit true一律拒”的陈旧预期改为本候选正例；原metadata检查改读已提交wire对象，适配新的原子copy而不再要求输入别名被修改。

新增 `forced_mixed_test.go` 验证完整定义/空description/false metadata/大整数/原顺序、缺失/重复/未知/schema差异原子拒绝、mixed any及deferred目标拒绝、helper不入白名单。`forced_mixed_cli_test.go` 包含上述8请求且带原20000预算、不递减、每请求仅一次假provider调用、usage20/8无隐藏累加；另helper响应明确失败无额外调用，provider400精确透传不改auto/不重试。

作者门禁：forced单元回归+预算8CLI 6.991s通过；全部mixed CLI（另2否例）8.359s通过；全engine4.352s及vet通过。最终提交前独审另行记录；所有CLI均为隔离假上游，不代表真实Opus5.5支持forced。

## 原生工具真实路由独审整改

Root和独审补真实relay六例发现两项问题：非inline native带metadata时，既有`applyServerSearchTools`可能先恢复客户schema，后置校验失去原CLI schema证据；mixed原目录返回`[]Object`而原checker仅识别`[]any`，会误拒合法Read。作者独立复跑原候选RED，未改独审断言。

最小修复：`outbound_relay.go`中非count主请求统一在Apply之前检查实际native工具，保留原noninline后核；`tool_matching.go`复用`historyContent`读取两种内部目录表示。custom SDK augmentation逻辑没有改，count/verified credit早返回没有改，description/defer仍不参与native身份匹配。

独审六例和Native/Forced目标1.372s绿。新增原生mixed真实CLI wrapper复用相同往返矩阵，真实Read schema、合法Read输入且原生name到上游必须仍为Read；覆盖JSON/SSE新/续/回退/cold、预算和无隐藏轮。原生+custom mixed、provider拒绝/helper否例、旧native cache history及真实relay组合18.096s通过；最终全engine4.341s及vet通过。新增测试`forced_mixed_native_cli_test.go`，独审`native_wire_before_plan_review_test.go`由独立作者持有。
