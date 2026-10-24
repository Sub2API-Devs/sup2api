# 复核 Round 2 — 02: SDK / 平台类插件（fe7010fb9 + 87fee074a）

日期: 2026-10-24
范围: `next/sdk`、`next/plugins/{anthropic,openai,gemini,claude-oauth,moderation,guard,growth,payment,relay,volcengine}`
依据: `next/docs/audits/2026-10-24-optimization-round2/04-sdk-plugins.md` §6、`/d/tmp/gometrics/{all,after}.tsv`
方法: 只读 diff/代码核对 + 自行跑 `go build` / `go test` / `staticcheck`；两处结论用临时模块实测（非仓内文件）
（CodeGraph/Serena/WarpGrep 本会话不可用，全部结论来自 Grep/Read/git）

---

## 结论（verdict）

**可以合并，但需修一处测试基建回归（R-G1）并补录三条未声明的行为变化（R-G2/R-G3/R-G16）。** 两个提交整体质量高：抽象方向正确，大部分「完成」声明经我复核成立，wire 行为保全得也相当仔细。

逐项核验结果（抽检全部「完成」项）：

| 核验对象 | 结论 |
|---|---|
| payment 27 处内联 error envelope → `pluginsdk.ErrorResponse` | 新旧均 27 处，code 分布一致（18 `invalid_argument` / 4 `internal` / 1 `unimplemented` / 4 `unauthenticated`），JSON 结构、status、content-type 完全相同（旧 `jsonResponse` 本来就转发 `pluginsdk.JSONResponse`）。**逐字等价** |
| growth / moderation / guard SQL 语义 | growth `recordCommission` 两次 SUM 合并不改变结果（两次读之间无写；少一次查询）；moderation `eventFilter`→`eventQuery` 条件与占位符顺序、`errs` 顺序逐项一致；guard `replaceRules`/`upsertRule`/`onStats` 与原实现逐字等价，`LOCK TABLE` 位置不变 |
| G6 volcengine 协议修正 | 正确：`providers/volcengine.ProtocolMessages` 原为 `"anthropic-messages"`，与核心下发的 `anthropic.messages`（内置 anthropic 平台的 protocol id）永不相等，`PolicyAnthropic` 因此从未生效；改为引用 `providers/anthropic` 常量后可达，且 SDK 与插件两层都加了测试。旧拼写在仓内已无运行时引用 |
| manifest/check 拆文件是否丢/改序校验 | **无损**。`Validate()` 的 `v.basics()…v.resources()` 调用顺序逐一相同；`platforms()`/`accountTypes()`/`ui()` 的抽取保守，抽取函数体内检查顺序（自己的冲突 → 追加 own → 内置平台 → 其他插件；sections→menus→pages→slots→native→settings）与旧完全一致；非注释代码行做 multiset 比对只剩 4 行差异，均为变量改名/内联 |
| Router 预编译 | 行为确实变确定；`TestRouterPatternPriority`/`OnlyTheMatchingMethod`/`ReregisterReplaces` 存在且通过（见 R-G9 的两处小问题） |
| staticcheck / 测试 | 10 个插件 staticcheck 全干净；SDK 仅 `gen/`（144 条，生成代码）与 `egress.SA1019`（既有）。11 个模块 `go test ./...` 全绿，growth `-v` 统计 SKIP=0（PG 真跑） |
| metrics | 范围内函数 349→374、行数 6827→6526、嵌套≥4 由 9→8、≥60 行由 20→11（`after.tsv`） |

未做/降级的项（G7、G31，以及 `pkgsig.Digest`）理由成立，不算问题。

---

## 问题表（按严重度排序）

| id | file:line | kind | 问题 | 具体修法 | 风险 | 行为变化 |
|---|---|---|---|---|---|---|
| R-G1 | `next/sdk/pluginsdk/pluginsdktest/fakehost.go:304-325`（`Dial` 在 285-292） | bug（测试基建） | `dialAndOpen` 拨号失败时 `return nil, stream.Send(...)`：Send 成功则返回 `(nil, nil)`，`Dial` 见 `err == nil` 继续执行 `defer conn.Close()` / `conn.RemoteAddr()`，对 nil `net.Conn` 直接 panic。重构前 `Dial` 在此处 `return stream.Send(...)` 正常结束。**已用临时模块复现：panic at fakehost.go:290**。`poll_test.go` 里 `fh.DialFunc = denyDial` 这类「拨号失败」注入只要真被触发就会崩掉测试进程 | 让 `dialAndOpen` 在已上报失败后返回哨兵错误（如 `errDialReported`），由 `Dial` 识别并 `return nil`；或返回 `(nil, err)` 并在 `Dial` 里判断 `conn == nil`；补一个「DialFunc 返回 error → 收到 `DialResult{ok:false}` 且不崩」的单测 | 中（只影响测试/SDK 夹具，但会 crash 整个测试二进制） | 是（原为正常结束，现 panic） |
| R-G2 | `next/sdk/pluginsdk/apikey/apikey.go:186-214` + `next/plugins/openai/internal/openai/platform.go:51-58` | 未声明的校验放宽 | openai 账号提交 `{"base_url": ""}`：旧 `ValidateCredentials` 走 `apikey.NormalizeBaseURL("")` 得到 `is required` → 报 `base_url` `format` 错；新共享实现把「显式空串」与「缺省」合为一支，回落 `DefaultBaseURL` 且不再报错。§6.1 只说 openai「仅文案变化」 | 若接受放宽：写进 §6.3 发布说明；若不接受：`Spec` 增加一个开关（如 `EmptyBaseURLIsDefault bool`）保留 openai 旧行为 | 低 | 是 |
| R-G3 | `next/plugins/growth/internal/growth/routes.go:368-371` | 健壮性（潜在静默错误） | `return id, row.Scan(&id)`：`id` 是普通变量读取，Go 规范只保证**函数调用之间**的左右顺序，变量读取与调用的先后未定义；当前 gc（含 `-N -l`）返回 42，但换编译器/版本可返回 0，导致 `invitees` 全为 0 且无报错。旧写法 `rows.Scan(&id)` 后 append 无此问题 | 拆成 `if err := row.Scan(&id); err != nil { return 0, err }; return id, nil` | 低-中（当前不触发） | 否（当前行为正确） |
| R-G4 | `next/sdk/pluginsdk/providers/volcengine/volcengine.go:98-112` | 分类不完整 | G6 修好后 Ark Anthropic 面只剩 404/5xx 换词表：413 仍是 `invalid_request_error`（Anthropic 为 `request_too_large`）、529 仍是 `api_error`（Anthropic 为 `overloaded_error`），与 `providers/anthropic.errorTypeForStatus` 不一致；新增测试只覆盖 404/500/503/429 | 从 `providers/anthropic` 导出 `ErrorType(status int) string` 并复用，或在 `errorTypeAnthropic` 补 413/529；`classify_test.go` 补这两例 | 低（Ark 极少发 413/529） | 是（仅这两个状态码的客户端 error type） |
| R-G5 | `next/sdk/pluginsdk/apikey/apikey.go:83-99, 118-126, 205-210` | API 形状 / 健壮性 | `Texts` 把「文案 + printf 模板 + 错误 code」混在一起：`fmt.Sprintf(msg, accountType)` 与 `fmt.Sprintf(msg, err.Error())` 直接吃插件给的字符串——模板漏写 `%q`/`%s` 会输出 `%!(EXTRA string=…)`，文案里出现孤立 `%`（如 "100%"）会被破坏；且 `KeyNotString` 名为文案却同时把 code 从 `type` 改成 `pattern` | 用固定占位符 + `strings.ReplaceAll`（如 `{type}`），或改成 `func(accountType string) string`；`code` 与文案分开配置 | 低-中（现有 3 个调用点都带 `%q`） | 否 |
| R-G6 | `next/sdk/pluginsdk/apikey/apikey.go:313-328` | 过参数 / 隐藏副作用 | `ModelListRequest(cfg, path, idsPath, stripPrefix, headers)`：5 个位置参数里 `path`/`idsPath`/`stripPrefix` 是三个相邻字符串，互换可编译且无报错（gemini 传的是非空 `"models/"`，一旦写反就是模型列表错）；并且原地 `delete(headers, "content-type")` 修改调用方 map，文档虽注明仍是易踩的副作用 | 收成 options 结构（`ModelList{Path, IdsPath, StripPrefix}`）或至少给 `idsPath`/`stripPrefix` 命名类型；deleting 前浅拷贝 headers | 低 | 否 |
| R-G7 | `next/plugins/moderation/internal/moderation/hook.go:80, 129` | 热路径重复计算 | `gate()` 内 `sampled(textHash(text), …)` 与 `OnGatewayRequest` 的 `hash := textHash(text)` 对同一段（最长 100k 字符）文本算两次 SHA-256；拆函数前只算一次。hook 每个请求都会走 | 让 `gate` 返回 `([32]byte, model, text, early)` 或直接把 hash 放进一个 gate 结果结构 | 低（纯性能） | 否 |
| R-G8 | `next/plugins/payment/internal/payment/paging.go:19-63` | 过度抽象 + 遗漏复用 | `pagedQuery` 8 个字段（含 3 个错误前缀 label），但两个调用方仍各自手写「有/无 status」两套 SQL 与占位符编号——最易出错的那部分重复没被消掉；且同插件 `ListOrders`（`order_service.go:321`）与 `GetUserRedeemHistory`（`redeem_service.go:243`）仍是同样的 count+page+scan 手写体，没有接入新 helper | 把 status 过滤与占位符拼装也收进 helper（如 `listSpec{base, where, args}`），并把剩余 2 处接入；或反过来保持两处手写、删掉只省 10 行的 helper | 低-中 | 否 |
| R-G9 | `next/sdk/pluginsdk/http.go:25-28, 46-75` | 遗留重复状态 / 死保护 | `Handle` 同时维护 `routes` map 与 `byMethod` 切片（两份真相）；只对 `byMethod` 做了 nil 保护——零值 `Router{}` 会先在第 48 行 `r.routes[...] = h` 上 nil map 赋值 panic，保护实际是死代码。另 `HandleHTTP` 注释写 "longest literal prefix first"，实现是按**字面段数量**排序（`/:x/b` 与 `/a/:id` 同分时按文本序，`/:x/b` 反而胜出） | 去掉 `routes` map（全字面量模式同样会被 `matchSegments` 命中），或统一两处 nil 保护；注释改成「字面段多者优先，同分按 pattern 文本」 | 低 | 理论上有（歧义路由，已在 §6.3 说明） |
| R-G10 | `next/sdk/pluginsdk/apikey/apikey_test.go:131-164` | 测试缺口（声明未落实） | 「所有字段错误文案逐字保留」只靠 `TestTextsKeepShippedWording`：它自建一份 `Spec`，把 relay 的文案抄进测试，并未断言三个插件真实的 `spec`；anthropic / openai 的 Texts 漂移不会让任何测试失败（插件测试只断言字段名与含 "/"） | 在 anthropic/openai/relay 的 `TestValidateCredentials` 里对关键用例断言 `(field, code, message)` 三元组逐字相等 | 低-中（保护不生效） | 否 |
| R-G11 | `next/plugins/volcengine/internal/volcengine/platform.go:68-77` | 遗漏复用 | G6 只把 **SDK 一侧**的常量指向 `anthropic`；插件自己仍写着字面量 `"anthropic.messages"` / `"anthropic.count_tokens"`（`classify.go` 用 SDK 常量、`upstreamPath` 用本地常量），两者只靠 `TestAnthropicSurfaceProtocolIDs` 维持相等——正是 anthropic/relay 插件已经用别名消掉的那种漂移面 | `ProtocolMessages = sdkvolcengine.ProtocolMessages`（该文件已可 import providers 包），常量收敛到一处 | 低 | 否 |
| R-G12 | `next/plugins/guard/internal/guard/stats.go:163` | 过参数 | `statsTrend(ctx, db, st, table, col, bucketExpr, from, to, loc)` 9 个参数，其中 `table`/`col`/`bucketExpr` 是拼进 SQL 的片段、`$3` 还隐式绑定 `loc`；与 `statsTopRules`/`statsRecent` 的 `(ctx, db, st, from, to)` 前缀重复 | 用一个 `statsQuery{db, table, col, bucketExpr, from, to, loc}` 或让 `getStats` 构造两次 `pgxpool` 查询；SQL 片段只允许内部常量 | 低 | 否 |
| R-G13 | `next/plugins/volcengine/internal/volcengine/assets.go:146-151` | 遗留包装 | G21 计划是「删掉 `decodeJSONObject` 改用 `apikey.DecodeObject`」，实际留了一层 3 行转发（10 个调用点仍走它），且它定义在 `assets.go` 却被 `prefix.go` 使用 | 调用点直接改 `apikey.DecodeObject` 并删除包装 | 低 | 否 |
| R-G14 | `next/plugins/anthropic/internal/anthropic/platform.go:186`；`next/plugins/openai/internal/openai/platform.go:181`；`next/plugins/claude-oauth/main.go:39` | 字面量遗留 | G5/G8 已建常量，但 `BuildTestRequest` 的 `UsageProtocol` 仍是 `"anthropic.messages"` / `"openai.chat"` 字面量；claude-oauth 的 `AnthropicAPIVersion = "2023-06-01"` 重复 `providers/anthropic.DefaultAPIVersion`（该文件已 import 这个包），`volcengine/platform.go:168` 的 `DefaultAnthropicVersion` 同样 | 分别改用 `ProtocolMessages` / `anthropic.DefaultAPIVersion`（openai 的 protocol id 可顺手在 providers/openai 导出常量） | 低 | 否（值相同） |
| R-G15 | `next/plugins/payment/internal/payment/routes.go:268-269, 339-340` | 遗留噪声 | `status := ""` 紧接 `status = pluginsdk.Query(req, "status")` 的两次赋值（本次提交改写了这两个 handler 的错误分支却未清理） | 合并为一次 `status := pluginsdk.Query(req, "status")` | 极低 | 否 |
| R-G16 | `next/docs/audits/2026-10-24-optimization-round2/04-sdk-plugins.md` §6.1/§6.2；`next/plugins/growth/internal/growth/routes.go:223, 437` | 文档准确性 | 抽检三处与事实不符：①「validate.go 1537→686」实际是 **1493→686**；②「SDK staticcheck 仅 egress.go 的 SA1019」实际 `gen/pluginv1` 另有 144 条 SA1019（若默认排除 gen，应写明）；③growth 给 `checkin_date` 加的 `::text` 与 §6.1/§6.3 的说明对不上——pgx 默认结果格式是 text（`pgconn` 在 resultFormats 为空时全列 text），该 cast 是空操作，属未说明的改动 | 修正行数字与 staticcheck 口径；`::text` 要么说明理由（防将来启用二进制结果格式）要么删除 | 极低 | 否 |

---

## 附：复核中确认「不是问题」的几处可疑点

- **relay 的字段错误顺序变化**（`[base_url, api_key]` → `[api_key, base_url]`）已在 §6.3 与 `relay_test.go` 同步，属已声明行为变化。
- **anthropic/relay 去掉 `KeyValidator`**（`sk-ant-`/`sk-relay-` + min20）：旧 `ValidateCredentials` 本来只用 `validAPIKey`、`FromAccount` 也不校验，删除不改变任何路径；`apikey.OpenAI` 仍被 openai 使用，`Validator` 没有变成死代码。
- **`apikey.Anthropic/Gemini`、`classify.TypeIn/MessageContains/CodePrefix/FirstReset` 删除**：仓内 0 引用，`go build ./...`（server/tools/sdk/plugins）通过；仅建议按 G12 原意补一条 SDK CHANGELOG（仓内没有该文件）——这条按 P3 处理，未单列。
- **`pluginsdktest.Harness.Start` 拆分**：`t.Cleanup` 顺序（Shutdown → conn.Close → plugSrv.Stop → hostSrv.Stop）与拆分前一致。
- **`batch` drain 重构**：ctx.Done 路径「排空 → 刷满批 → 刷余量」与旧闭包实现等价，`batch[:0]` 复用底层数组的别名关系与旧代码相同。
- **payment `withLockedRow`**：错误文案（`invalid code` / `query code: …` / `begin transaction: …` / `commit: …`）逐字保留，`errors.Is` 比旧的 `==` 更稳；`listPaged` 的错误前缀（`count codes` / `query codes` / `scan code`、promo 三处）也逐字一致。`pgx.CollectRows` 在空页返回 `[]T{}`，但两个 handler 都用 `make([]map[string]any, len(...))` 重建，HTTP 形态不变。
- **growth `pgxCollectRows`**：显式把空结果转 nil，保住了这些列表端点一直以来的 `null`（payment 侧不需要，因为最终都经过 `make`），不是不一致缺陷。
- **moderation `DecodeSettings` 分组**：新旧键集合完全一致、相对顺序一致、字段彼此独立，clamp 结果不变。

---

## 处理结果（2026-10-24 执行）

范围：只动 `next/sdk/**` 与 `next/plugins/{anthropic,openai,gemini,claude-oauth,moderation,guard,growth,payment,relay,volcengine}/**`。`next/server`、`next/plugins/ccgateway` 未改，只做 `go build ./...` 只读核对。未提交。

### 逐项结论

| id | 状态 | 处理 | 行为变化 |
|---|---|---|---|
| R-G1 | **已修（bug）** | `dialAndOpen` 拨号失败时先 `Send`，成功则返回哨兵 `errDialReported`；`Dial` 识别它并 `return nil`（流正常结束），`Send` 失败则返回该错误。新增 `pluginsdktest/fakehost_test.go`：拨号失败 → 只发一个 `DialResult{ok:false}`、不 panic、地址被记录、`Send` 失败时错误上抛、首帧不是 open 时报错 | 修 bug（原为 panic 崩掉整个测试二进制） |
| R-G2 | **接受放宽 + 已声明** | 保留共享实现「显式空串 = 缺省」的行为。理由：CONTRACTS §21.3 明确「空值由插件归一化为默认地址」，anthropic/gemini 早已如此（旧 anthropic 的 `normalizeBaseURL` 对空串直接返回 `DefaultBaseURL`），openai 是唯一例外；表单也允许空串并提示「留空使用默认地址」。在 openai 的 `TestValidateCredentials` 增加显式空串用例锁定归一化结果 | **有**：openai 显式提交 `base_url: ""` 不再报 `format` 错，而是归一化为默认地址（与 anthropic/gemini 一致） |
| R-G3 | **已修** | 拆成 `if err := row.Scan(&id); err != nil { return 0, err }; return id, nil`，不再依赖左右求值顺序 | 无（当前行为正确，去掉可移植性隐患） |
| R-G4 | **不做（会改 wire 行为）** | 复核成立（413 仍 `invalid_request_error`、529 仍 `api_error`，与 `providers/anthropic` 不一致），但修它必然改变这两个状态码的 `client_error_type`，违反本任务「不改插件 wire 行为」的约束。已在 `errorTypeAnthropic` 上加注释写明这是有意保留的差异与后续项 | 无 |
| R-G5 | **已修** | `apikey.Texts` 改为命名占位符 + `strings.ReplaceAll`（`{type}` / `{reason}`），不再是 printf 模板：`100%` 之类原样输出，未知占位符不被解释。`KeyNotString` 的 code 拆成独立字段 `KeyNotStringCode`（默认 `pattern`，保持既有语义）。anthropic/openai/relay 三个插件的 `Texts` 同步改写；新增 `TestTextsAreNotFormatStrings` | 无（现有三处文案逐字不变） |
| R-G6 | **已修** | `apikey.ModelList`（`Path` / `IdsPath` / `StripPrefix`）+ `ModelListRequest(cfg, list, headers)`；headers 改为浅拷贝并跳过 `content-type`（大小写不敏感），不再原地改调用方 map。四个调用点（anthropic/openai/gemini/relay）改为具名字段，gemini 的 `StripPrefix: "models/"` 不再可能写错位置 | 无（逐字段等价；差别只是调用方 map 不再被修改） |
| R-G7 | **已修** | `gate` 返回 `gateResult{model, text, hash, early}`，`textHash` 每个请求只算一次；`OnGatewayRequest` 用 `gate.hash` 填 `TextHash` | 无（纯性能） |
| R-G8 | **已修** | `pagedQuery` 改成 `{countSQL, listSQL, where, args, orderBy, labels}`：WHERE 与占位符编号只写一处，`listPaged` 用 `statements(limit, offset)` 自己算出 `$n`/`$n+1`。`ListCodes`/`ListPromoCodes` 去掉手写的两套 SQL；`ListOrders` 与 `GetUserRedeemHistory` 两处手写 count+page 也接入（列清单提为 `selectOrders` / `selectUserRedeemHistory` 常量），错误前缀逐字保留 | 无（SQL 与错误文案等价；空页仍是 `[]`） |
| R-G9 | **已修（并修一处回归）** | 删掉 `routes` map，只留预编译切片（不再双份真相）；零值 `Router{}` 可用（`TestRouterZeroValue`）。注释改成「字面段多者优先，同分按 pattern 文本」。**复核中还发现预编译版本把 `route_path == 已注册 pattern` 的请求当成了模式匹配**：核心下发的 `route_path` 就是 pattern、真实参数在 `path_params`，于是 `:user_id` 会被匹配成字面量并覆盖 `path_params`（moderation 的 `DELETE /blocks/:user_id`、volcengine 的素材路由因此报 400）。现改为「先按 pattern 精确命中（保留调用方给的 path_params），再按段匹配」，新增 `TestRouterRoutePathIsThePattern` 锁定 | 无（恢复重构前语义；歧义路由的选择确定性不变） |
| R-G10 | **已修** | anthropic/openai/relay 三个插件的 `TestValidateCredentials` 各加逐字断言（field, code, message）表：account_type / required / 非字符串 key / prefix / base_url required / base_url format 的关键用例；openai 的 `invalid_prefix` 与 `pattern` 也被固定 | 无 |
| R-G11 | **已修** | 插件 `platform.go` 的 `ProtocolMessages`/`ProtocolCountTokens` 改为 `sdkvolcengine.*` 别名，常量只剩一处 | 无（值相同） |
| R-G12 | **已修** | `statsTrend(...9 个参数)` → `statsQuery{db, table, col, bucketExpr, from, to, loc}` + `q.trend(ctx, st)`；SQL 片段仍只来自 `getStats` 内的常量 | 无 |
| R-G13 | **已修** | 删掉 `assets.go` 的 `decodeJSONObject` 转发，10 个调用点（含两个测试）直接 `apikey.DecodeObject`；`prefix.go` 补 import | 无 |
| R-G14 | **已修** | anthropic/openai 的 `BuildTestRequest` 的 `UsageProtocol` 改用 `ProtocolMessages` / `ProtocolChat`；volcengine 的 `DefaultAnthropicVersion` 与 claude-oauth 的 `AnthropicAPIVersion` 改为 `providers/anthropic.DefaultAPIVersion` | 无（值相同） |
| R-G15 | **已修** | payment 两处 `status := ""` 紧接赋值合并为一次 `status := pluginsdk.Query(req, "status")` | 无 |
| R-G16 | **已修（文档 + 代码注释）** | ①`04-sdk-plugins.md` §6.1 的「1537 → 686」改为「1493 → 686」（`git show fe7010fb9^` 实测 1493 行）；②§6.2 的 staticcheck 口径补上 `gen/pluginv1` 的 144 条 SA1019（手写代码只有 `egress.go` 2 条）；③growth 两处 `checkin_date::text` 各加注释说明理由（pgx 目前按 text 返回，cast 是空操作；显式写上是为了将来若启用二进制结果格式仍然正确），不删 cast | 无 |

### 回归与验证

每个模块各跑一次：`go build ./...`、`GOOS=linux go vet ./...`、`gofmt -l`、`staticcheck ./...`、`go test -count=1 ./...`。

| 模块 | build | vet(linux) | gofmt | staticcheck | go test |
|---|---|---|---|---|---|
| next/sdk | OK | OK | 干净 | 手写代码仅 `egress.go` 2 条 SA1019（既有）；`gen/pluginv1` 144 条（生成代码） | 全 ok |
| plugins/anthropic | OK | OK | 干净 | 干净 | ok |
| plugins/openai | OK | OK | 干净 | 干净 | ok |
| plugins/gemini | OK | OK | 干净 | 干净 | ok |
| plugins/relay | OK | OK | 干净 | 干净 | ok |
| plugins/claude-oauth | OK | OK | 干净 | 干净 | ok |
| plugins/moderation | OK | OK | 干净 | 干净 | ok |
| plugins/guard | OK | OK | 干净 | 干净 | ok（SKIP 计 0） |
| plugins/growth | OK | OK | 干净 | 干净 | ok（17 PASS / 0 SKIP，PG 实跑） |
| plugins/payment | OK | OK | 干净 | 干净 | ok（6 PASS / 0 SKIP，含并发兑换） |
| plugins/volcengine | OK | OK | 干净 | 干净 | ok（112 PASS / 0 SKIP，PG 实跑） |

只读核对（未改）：`next/server`、`next/plugins/ccgateway` 均 `go build ./...` 成功 —— `apikey`/`pluginsdk` 的公开 API 改动对它们向后兼容（两者都不引用 `apikey.ModelListRequest` 或 `Texts`）。

复核中新发现的回归（随 R-G9 一并修掉）：`pluginsdk.Router` 在预编译改造后对「`route_path` 即注册 pattern」的请求做了段匹配，导致 path_params 被覆盖；moderation `TestAutoBanAndUnblock` 与 volcengine 的素材/分组路由测试因此在首次全量跑时失败，修复后全部转绿。

### 需要写进发布说明的行为变化

1. **FakeHost（R-G1）** — 测试夹具的拨号失败不再 panic（仅影响测试）。
2. **openai（R-G2）** — 显式 `base_url: ""` 由「`format` 错误」变为「归一化为默认地址」，与 anthropic/gemini 及 CONTRACTS §21.3 一致。
3. 无其他客户端可见变化：错误文案、code、`details.fields` 顺序、SQL、wire 请求逐字未动（R-G4 的 413/529 差异有意保留，见其条目）。
