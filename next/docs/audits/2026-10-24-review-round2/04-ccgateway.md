# 审核 Round 2 — 04：CCGateway 栈（contracts / engine / worker / 插件 / controller / cli-mods / 核心）

审核对象：
- `3791a1f60`（`refactor(ccgateway): split credit events, resource authorization and request logs (round 2 X1-X18)`）
- `0172eafa7`（`refactor(ccgateway): controller upgrade steps and cli-mods raw JSON module (round 2 X29-X33)`）
- `fde7f9163` 中 `next/server/internal/ccgateway` 的部分（X19–X27）

对照基线：各提交的 `~1`。计划与结果：`next/docs/audits/2026-10-24-optimization-round2/05-ccgateway.md`。
审核日期：2026-10-24。只读审核（除本文件外未改仓库任何文件）；临时验证代码全部在 `/tmp`、`C:/temp` 下的一次性目录。

---

## 结论（verdict）

**有条件通过。** 三个提交的结构性目标（拆分、复用、去死代码）基本达成，绝大多数「行为等价」的说法我独立验证成立。**但发现一处真实的输出回归**：`MessageFromEvents` 改成 `creditStream` 之后，**零内容块**的完整流输出从 `"content":[]` 变成 `"content":null`，并让 `ClaimForResponse` 在这种情况下从「返回 claim」变成「返回 `fallback credit response content missing`」（R-X1）。这条只在「流里一个 content block 都没有」时触发，因此现有测试（全部至少一个块）没抓到，但它是 fallback credit 记账链路上的判定差异，必须修。

其余问题集中在三类：**新增/拆分出来的抽象有一处用错（把「无块」变成 nil）**、**行为变更点缺少测试钉住**（`logFileKind` 的 kind 标签、`features` 端点内容、`installLock` 的失败码）、以及**复用没做到底**（`installLock` 已抽出但两个调用点仍手写、`bundledRoles` 用 `json.Unmarshal` 而旁边就是 `decodeStrictJSON`、`writeMetadata` 在 `finish` 内外都可调用）。

### 实际做过的验证（可复现）

1. **`MessageFromEvents` 新旧差分**（`/tmp/diffprobe`）：把 `3791a1f60~1` 与 `3791a1f60` 的 credits 包各复制成独立包，用 14 种事件（message_start 两种、block_start 三种、四种 delta、block_stop、message_delta 两种、message_stop、ping、unknown）做深度 4 的全排列，**共 21 万+ 序列对拍**。结论：错误判定与错误文案**完全一致**；唯一差异是「有 `message_start` + `message_delta` + `message_stop`、但从未 `content_block_start`」这类序列，旧输出 `"content":[]`、新输出 `"content":null`。
2. **`ClaimForResponse` 连带影响**（`/tmp/creditprobe`、`/tmp/creditold`）：同一零块流（带 `stop_reason:"refusal"` + `fallback_credit_token`）旧实现返回 `claim err=<nil>`，新实现返回 `claim err=fallback credit response content missing`。
3. **cli-mods 出口对拍**（`C:/temp/clidiff`）：把 `0172eafa7~1` / `0172eafa7` 的 `direct-billing.js`、`content-policy.js`、`shared.js`（+ 新 `raw-json.js`）分别装进两个目录，用 13 种 body × 4 种 policy × 3 种 nativeBilling = **156 组**调 `applyDirectBilling`，返回值与异常 `message|status` **全部相同**。`npm test` 171 通过 0 跳过；`release-v23` ELF 复算 sha256 = `558d7b31…5b5c`，与文档一致；`patched-v23/ccgateway-direct-billing.js` 已改成 `from './ccgateway-raw-json.js'`。
4. **`sing-box` 配置对拍**（controller，新旧 `network.py` 直接 load 后对比）：proxy/direct 两种入参下 config dict 与 nft 规则 `==` 全等；唯一差异是 JSON 键序（`detour` 从 `tls` 之前挪到之后，见 R-X8）。
5. **测试实跑**：contracts 7 包、engine、插件 2 包、worker 3 包 `go test -count=1 ./...` 全绿；`next/server` `go build ./...`、`go vet ./internal/ccgateway/` 通过；controller 190 通过；cli-mods 171 通过。
6. **staticcheck**（`/d/mise/installs/go/1.27.0/bin`）：`-checks 'U1000,S1000,S1002,S1023,ST1005'` engine 仍只有已知 4 处 ST1005；contracts、worker、插件、`./internal/ccgateway`（加 `SA4006,SA4011`）**无输出**——即 §8.1.1 记的 SA4006 确已修，本轮没有新引入的告警。
7. **死代码 / 残留引用全仓 grep**（`next/` 排除 `node_modules`、`docs/`）：`features.Catalog`、`CatalogVersion`（作为被删符号）、`autoUpdateCLI` 在 Go/TS/Vue/JS/Py 中**零命中**；`next/web/src`、`next/sdk`、`next/e2e`、`next/tools` 也不调用 `/system/ccgateway/features`。core 0.1.185 的兼容性：`features.Catalog()` 只被核心编译期使用，插件二进制不引用，**先插件后核心的顺序成立**。
8. **`request_log` 拆分的锁序核对**：按函数逐一对拍旧 `request_log.go` 与三个新文件——`capture`/`finish`/`request`/`clearContent`/`reserve`/`stopContent`/`requestLogChange` 除「提出去的那段」外逐字相同；`s.mu → d.mu` 的获取顺序、`pruneFiles()` 在 `s.mu` 之外调用、`finish` 里 `unlock()` 之后才拿 `s.mu`，**全部与原实现一致**。剪枝/预算算法未动。
9. **`initializeResourceAuthorization` 拆分的 defer/stop 顺序**：`verificationCLI.stop()` 是 `input.Close → cancel → output.Close → <-done → writer.Close`，与原 `defer func(){ input.Close(); cancel(); output.Close(); <-done }` + `defer writer.Close()`（LIFO 后执行）**同序**；`awaitResourceInitialization` 的状态机（control_response/auth_status/system/result/exit、stage 名、25ms tick、30s 超时）逐分支一致；`credentialSources`/`readCredential`/`resourceSourceIdentity` 的安全条件（backend 支持、5 个 override 键、env 重复拼写、settings 注入、source 唯一、stored_oauth 的 darwin/config=storage 限制、token 字符检查、OAuth first-party origin）与错误文本逐字保留。

---

## 问题表（按严重度）

| id | 位置 | 类型 | 问题 | 具体改法 | 风险 | 行为变更 |
|---|---|---|---|---|---|---|
| R-X1 | `next/plugins/ccgateway/companions/contracts/credits/events.go:36,48,79`（`creditStream.blocks` 零值；`MessageFromEvents` 末尾 `stream.message["content"] = stream.blocks`） | 正确性回归（抽象引入） | 旧实现里 `blocks := []any{}` 是**非 nil 空切片**；新状态结构 `creditStream` 的 `blocks` 字段零值就是 `nil`。因此「`message_start`（`content:[]`）→ `message_delta` → `message_stop`、全程没有 content block」的**合法完整流**，`json.Marshal` 后从 `"content":[]` 变成 `"content":null`。连带：`ClaimForResponse` 的 `object["content"].([]any)` 断言失败，同一响应从「返回 claim」变成 `fallback credit response content missing`（已实证，见验证 1/2）；`helperDeliveredPrefix` 只做 `m.Content[0] != '['` 检查，`null` 的首字节是 `'n'`，也会判成 `public assistant response is incomplete`。零内容块的流是真实存在的（纯 refusal、只带 `stop_details` 的响应），不是构造不出来的输入 | 在 `MessageFromEvents` 里保持非 nil：`stream := &creditStream{open: -1, blocks: []any{}}`；或单点修在末尾：`content := stream.blocks; if content == nil { content = []any{} }; stream.message["content"] = content`。推荐前者（一个字段，语义直白）。补一条回归测试：零块完整流 → 输出含 `"content":[]`，且 `ClaimForResponse` 在该响应上返回 nil error | 低（一处字段初值 + 一条测试） | **是**（修掉的话回到旧行为；即「修复」，但按现状属于已引入的回归） |
| R-X2 | `next/plugins/ccgateway/companions/engine/request_log_viewer.go:419-433`（`logFileKind`）；`next/web/src/views/ccgateway/requestLogViewer.ts:214`（`FILE_KINDS`） | 行为变更未披露 + 跨端不一致 | X17 删掉 `cli-` / `upstream` 前缀分类后：① 旧日志里名为 `cli-stdout.jsonl` 的文件，kind 从 `cli` 变成 **`other`**（不是计划里写的 `upstream`/`other` 混合说法，因为 `cli-*` 同时不满足 `resource-`、`history*`、`.json` 后缀——`.jsonl` 不等于 `.json`）；② web 的 `FILE_KINDS` 仍含 `'cli'`，分组标题 `logViewer.kind.cli` 仍在，但**再也不会有文件归到该组**——一个永久空分组；③ 计划 §6.3/§412 的说法「`cli`/`upstream` 归一为 `other`/`upstream`」与实际不一致（`upstream*` 已无写者，`resource-*` 仍归 `upstream`）。另外 `git merge-base` 核实：**0.1.86（`24c316eee`）确实仍是 `traceReader` 写 `cli-stdout.jsonl` 的版本**（`runner.go:265,348`），所以线上现存日志里这种文件是真实存在的，最长保留 7 天 | 短期保留 `cli-` 分支并注释「仅为 0.1.86 及更早 Worker 的历史日志」，与 `history` 一样排到 2026-10-31 之后一起删；同时把 web 的 `FILE_KINDS` 与 zh/en 的 `logViewer.kind.*` 一起去掉（这一条属 web 写者，已在计划 §7.5 列出，但实际上 web 侧要做的是**删掉一个已死分组**，不是「以后再说」）。若坚持现在就删，则同步在 `applyLevel`/`clearContent` 之外补一条测试说明 `cli-stdout.jsonl → other`，并把它写进发布说明 | 低（仅展示标签） | 是（旧日志的分组标签；已在计划里承认，但计划对标签值的描述不准） |
| R-X3 | `next/server/internal/ccgateway/features.go:17`（改返回 `RequestCatalog("request_build")`） | 行为变更 + 测试只钉住了「不是旧目录」 | `GET /system/ccgateway/features` 的返回体从 native 时代目录（含 `F-SAFEGUARDS`、`F-ADD-DIR`、`F-CLIENT-ATTACHMENT-ERASE/REPLACE`、`F-STREAM` 等 10+ 条、`catalog_version 2026-10-09.x`）换成**只有 2 条**（`F-REQUEST-MODES` + `F-BUILD-ATTACHMENTS`）、`catalog_version 2026-10-20.request-attachments-v1`。`features_test.go:52-55` 只断言「等于 `RequestCatalog("request_build")`、`len(Features)>0`」——这是**同义反复**（端点与测试都调同一个函数），删掉的能力条目不会被测试发现。仓里另有两处仍在描述旧目录：`next/web/mock/ccgateway.ts:14-17`（dev mock 仍返回 `F-SAFEGUARDS`/`F-ADD-DIR`/`F-THINKING-DISABLED-COMPAT`/`F-STREAM` 与 `catalog_version 2026-10-09.18`），`next/docs/CONTRACTS.md:4035,4046` 仍用「特性目录 `F-CLIENT-ATTACHMENT-ERASE` / `F-CLIENT-ATTACHMENT-REPLACE`」当作对外契约的锚点 | ① 测试改成断言**具体的 feature id 集合**（`[]string{"F-REQUEST-MODES","F-BUILD-ATTACHMENTS"}`）与 `CatalogVersion`，这样任何增减都要显式改测试；② 同步 `next/web/mock/ccgateway.ts` 的 `/features` 夹具（否则 mock 环境与控制台看到的目录不同，dev 里会看到已被删掉的条目）；③ `CONTRACTS.md:4035/4046` 的两句要么改成指向 `F-BUILD-ATTACHMENTS`/`F-BUILD-CONTENT-POLICY`，要么明说这两个旧 ID 已随 native 目录删除 | 低 | 是（已披露；缺的是钉住它的测试与 mock 同步） |
| R-X4 | `next/plugins/ccgateway/companions/contracts/credits/events.go:17-31`（`deltaTextFields`/`deltaBlockTypes` 包级 map） | 过度抽象 / 用可变全局换常数时间 | 原本两个 `map[string]string{...}` 字面量是**每次 delta 现建**，作者把它们提成包级可变 map。收益是省两次分配，代价是：`credits` 是导出包，包级 `var` map 任何同包代码（含未来的测试/工具）都能改，改了之后所有流量的事件解析都跟着变；而实际只有 4 个键、switch 分支已经按 kind 分好。这是「用一个可变全局去优化一个每 SSE 帧一次的 map 分配」，方向反了 | 换成 `switch kind` 里的 `key, expected := "text", "text"` 这类常量赋值（4 个 case 各一行），或用一个 `var deltaFields = [...]struct{kind, text, block string}` 的**只读切片** + 小循环；前者最简、零全局状态。合并两表也可以：`deltaBlockTypes["text_delta"]=="text"` 与 `deltaTextFields` 同名项有 3 个相同 | 低 | 否 |
| R-X5 | `next/plugins/ccgateway/companions/contracts/credits/events.go:13`（`errCreditStream` 包级 `var`，未导出） | 抽象不一致 | 提 `errCreditStream` 统一替换了 `fail()` 闭包是对的（错误文案逐字不变），但 `resource_identity_carrier.go` 的同类改动提的是 `errUnverifiedResourceSource` 并加了 `var` 级注释，而 `events.go` 里同一模式在多处 `return nil, errCreditStream` 之外还保留了 `mergeCreditFacts` 自己的 `fmt.Errorf` 和 `validStringDeltaFields` 的布尔返回——两处「同一错误、两种表达」并存。可读性上不影响正确性，但 `MessageFromEvents` 现在有 **6 处**把 `stream.apply` 的 err 换成 `errCreditStream`（`apply` 内部又各自返回它），也就是「错误值相同、包装层多一层」 | 让 `apply` 及其 6 个 `on*` 处理器**只返回错误或 nil**，`MessageFromEvents` 直接 `return nil, err`（省掉 `if err != nil { return nil, errCreditStream }` 的重写，语义等价）；`mergeCreditFacts` 的错误也统一成 `errCreditStream`。这样「一个失败 = 一个错误值」在文件内是唯一定义 | 低（错误文案对外仍相同：`fallback_credit.go` 只看 `err != nil`） | 否 |
| R-X6 | `next/server/internal/ccgateway/request_logs.go:354-357`（`validateLogTierLimits` 的匿名 struct 参数） | 抽象味道 | 为了让「提取函数」不改类型，`validateLogTierLimits` 的入参声明成**内联匿名 struct**（`*struct{ Summary *requestLogTier ...; Full ... }`），而 `requestLogLevelState.Limits` 是同样的匿名内联 struct。Go 里两个匿名 struct 类型只要字段+tag 一致就**可赋值**，所以能编译通过——但这是「靠结构同一性传递参数」，一旦 `requestLogLevelState.Limits` 的某个字段加 `omitempty` 或改名，这个函数会**静默编译失败**且错误信息很难指向真实原因（报「cannot use in.Limits (variable of type struct{...}) as struct{...}」）。这属于拆分时该提类型却没提 | 把 `requestLogLevelState` 的 `Limits` 提成命名类型 `requestLogLimits`（`Summary`/`Full`），`validateLogTierLimits(limits *requestLogLimits)`。零行为变化、去掉隐式耦合 | 低 | 否 |
| R-X7 | `next/server/internal/ccgateway/runtime.go:473-484`（`installLock`）；调用点 `controller_install.go:287-295`、`cleanup.go:201-209` | 复用没做到底 + 错误码含义变化未测 | X25 抽出了 `installLock(c, ctx)` 统一「拿不到锁 → `install_failed`；别人持有 → `install_in_progress`」，但 **`controller_install` 与 `cleanup` 仍手写完整 6 行**（`lockInstall` + 两种 `httpapi.Fail`），只有 `bundle_push.go:226`、`workers.go:377`、`controller_uploads.go:239` 改为复用。更值得注意的是 `cleanup.go` 的**错误分支码不同**：`lockInstall` 返回 error 时它答 `core.ErrUnavailable`（无 reason 串），而 `installLock` 会答 `reasonError(..., "install_failed")`——计划 §8 已提「cleanup 的 `core.ErrUnavailable` 答复与其余不同，保持原样」，但这样一来 `installLock` 的**语义承诺**（「ok=false ⇒ 响应已写，且是这两个码之一」）就有例外，未来任何新调用点都不会知道。同时 `installLock` 抽出来后**没有任何测试**覆盖「e != nil」分支（现有安装测试走的是 happy path 与 in-progress 分支） | 二选一：(a) 给 `installLock` 加一个 `reason` 形态参数（或在 `cleanup` 里保留手写并加注释「此处码与其他不同，故不复用」），把「为什么有两套」写成注释而不是隐含；(b) 若认为 `cleanup` 也该统一，就把它的答复改成 `install_failed` 并接受一个**管理端可见的错误码变化**（需写进发布说明）。另外补一个 `lockInstall` 返回 error 的 fake-Locker 测试，断言 `installLock` 写出 503 + `install_failed` | 低 | 取决于 (a)/(b)；(a) 不变 |
| R-X8 | `next/plugins/ccgateway/companions/controller/network.py:96-108`（`singbox_dns`） | 输出顺序变化（字节层面）+ 测试未钉住 | 拆分后 `detour` 从 `tls` **之前**挪到**之后**（旧代码里 `detour` 写在同一 dict 字面量的 `tls` 前，新代码先建含 `tls` 的 dict 再 `server['detour'] = ...`）。语义完全相同（实测 dict `==` 成立），但 `json.dumps` 的输出**字节序不同**，而这份 config 是被 `write_private(d / 'sing-box.json', json.dumps(config))` 落盘并被 `_singbox` 读回做**相等比较**的：`reuse = had_egress and self._singbox(aid) == config` 比的是 Python dict（不受顺序影响），**所以不影响复用判定**；但如果任何既有运行目录里的 `sing-box.json` 是被比对的原始字节（例如 golden 文件、`migration-*` 脚本），就会出现「内容相同、字节不同」的误判。计划 §7.1 声称「字符串片段一字未改」，这只对 nft 成立，对 sing-box JSON 的键序不成立 | 让 `singbox_dns` 保持旧键序（在字面量里带 `detour` 占位再 `del`，或直接在建 dict 时把 `detour` 放 `tls` 前），做到字节级不变；或反过来在计划/测试里明确「键序不保证」。同时 `test_network.py:48/54` 只断言 `config['dns']['servers'][0]['detour']`，建议再加一条 `json.dumps(config)` 的整串断言（golden），把「以后别动键序」钉住 | 低 | 是（仅 JSON 键序，语义不变） |
| R-X9 | `next/plugins/ccgateway/companions/controller/upgrade.py:169-190` | 顺序安全（拆分正确但缺少一条护栏） | 拆成 `prepare_environment`/`swap_controller`/`start_controller`/`wait_controller_healthy` 后，**rename→stop→run 的顺序、两处 `put_back_env` 的时机都保持不变**（`test_upgrade.py` 的容器调用序列断言原样通过，190 全绿）。但有一处细节退化了可读性/可验证性：原来 `current` 是 `swap_controller` 内 `rename` 前的那个对象，`start_controller` 里用的是它 `stop()`；现在 `start_controller` **重新 `container(client, prev)` 查一次**。若 `swap_controller` 的 `rename` 失败在「`name` 不存在」的恢复路径之后（`container(client, prev).rename(name)` 成功、`remove(prev)` 成功、`current = container(name)` 为 None），则 `prev` 不存在 → `start_controller` 的 `old is None` → 直接 `containers.run`，**旧控制器从未 stop 就被新容器占用同名**。基线代码在同一场景下 `current is None` 也是直接 run，所以**不是回归**；但既然拆成了四个具名步骤，这个「prev 可能不存在」的分支现在被藏在了 `if old is not None` 里，测试也没有覆盖「prev 在 start 时消失」 | 在 `start_controller` 的 docstring 里写明「prev 缺失是合法的中断恢复状态（中断发生在 rename 之后、删除之前）」，并在 `test_upgrade.py` 加一条：`swap_controller` 之后把 `prev` 从 fake 客户端移除，断言 `run` 仍被调用且结果是 `done`。不改逻辑 | 低 | 否 |
| R-X10 | `next/plugins/ccgateway/companions/cli-mods/test/support.mjs:11-16` | 测试夹具与生产安装器脱钩 | `installSupport` 只复制**显式传入的 names + `shared`**，而 `patch-cli-2.1.304.cjs:157` 是 `profile.supportModules` **全量**复制。新增 `raw-json` 后：`direct-billing.js` 现在 `import { member, members, elements, skipWs } from './raw-json.js'`，但**没有任何测试用 `installSupport` 装 `direct-billing`**（`direct-billing.test.mjs`/`contract-fixtures.test.mjs` 都是直接 `import '../direct-billing.js'` 走源码名）。也就是说「`raw-json` 是否真的被安装成 `ccgateway-raw-json.js`、`direct-billing` 安装后的 import 是否被改写」这条链，**只被 `patch-wire-preservation-304.test.mjs:290` 间接覆盖（且它断言的是 content-policy）**；`grep 'ccgateway-raw-json' test/` 零命中 | ① 在 `support.mjs` 里改成「按 import 图自动带依赖」（递归解析 `'./x.js'`）而不是靠调用方枚举；② 或最小改动：给 `patch-wire-preservation-304.test.mjs` 加一行 `assert(patchManifest.supportFiles['ccgateway-raw-json.js'] && /from '\.\/ccgateway-raw-json\.js'/.test(read('ccgateway-direct-billing.js')))`。后者更贴近本次改动、成本 2 行 | 低 | 否（只加测试） |
| R-X11 | `next/plugins/ccgateway/companions/cli-mods/direct-billing.js:16-27` | 拆分缺口（「拆分完成度」与文档不符） | `applyDirectBilling` 从 56 行降到 27 行，但**主函数体里有三段新抽函数的调用**（`systemAsBlocks`/`billingItems`/`insertSystem`/`arraySystemEdits`），只剩「取 top/system、分支、提前返回」——这部分是好的。问题在 `billingItems` 的返回值语义：正常时返回 `{index, block}` 数组，编辑时**在同数组里混入 `{block}` 与 `{index, block, text}`**，下游靠 `item.index === undefined` / `item.text !== undefined` 区分三种形态（`:72-79`）。这个「三形态数组」是原实现就有的隐式契约，拆分只是把它从 `applyDirectBilling` 里**搬**到了 `billingItems`，没有降低理解成本，反而让「这个数组里有什么」跨了两个函数边界 | 在 `billingItems` 的注释里明确写出三形态（`{index,block}` 保留原字节 / `{block}` 新增 / `{index,block,text}` 替换文本），或改成两个数组 `{kept, inserts, replaced}`。前者零风险、就是补注释；后者更清楚但要改 `arraySystemEdits` 的 pending/order 逻辑（该逻辑是字节级语义，风险更高）。**建议只补注释** | 低 | 否 |
| R-X12 | `next/server/internal/ccgateway/bundle_push.go:282-301`（`bundledRoles`） | 复用遗漏 | 同一提交把 `runtimeWorkers`/`cliManagementBody` 收进了 `decodeStrictJSON(raw, v)`（`workers.go:299` 附近），但 `bundledRoles` 仍手写 `io.ReadAll` + `json.Unmarshal`——**并且它是本模块里唯一还对未知字段宽容的请求体**（`runtimeWorkers` 与 `cliManagementBody` 都 `DisallowUnknownFields`）。计划 §8 说 `decodeStrictJSON` 是「本模块控制台端点统一的 body 契约」，这里正好是反例。行为上不改也不会有 bug，但「同一目录里两套 body 契约」正是本轮要消除的东西 | 若**有意**宽容（`{"roles":[...]}` 之外允许别的键以便未来扩展）：在注释里写明「此处不拒绝未知字段，理由 X」。若无意：改成 `decodeStrictJSON(raw, &in)`。两者都要显式化 | 低（若改成 strict，需要写进发布说明：带未知键的 body 从 200 变 400） | 取决于选择 |
| R-X13 | `next/server/internal/ccgateway/controller_uploads.go:331-378`（`applyLoadedImage` 的 5 返回值） | 过度抽象 / 接口味道 | X20 的拆分把 `cfg, workers, ctx, cancelTail, ok` 五个值从 `applyLoadedImage` 返回，其中 `ctx`/`cancelTail` 是**输入的 ctx 加一个可选派生**，`cfg`/`workers` 是业务结果，`ok` 是「已写响应」。调用点于是变成 `if cfg, workers, ctx, cancelTail, ok = s.applyLoadedImage(...)` 的**整体赋值**（连入参 `ctx` 都被覆盖），紧接着 `if cancelTail != nil { defer cancelTail() }`。这比原来的内联段更难读：读者必须知道「ctx 可能被换掉」这个隐藏副作用。而且 `cancelTail == nil` 时 `defer cancelTail()` 会 panic，所以只能写 `if`——即结构本身在强迫调用方写防御代码 | 把「尾部预算」从返回值里拿掉：`applyLoadedImage` 只返回 `(Config, *workersReport, bool)`，尾部 ctx 由调用点在建之前/之后自己 `context.WithTimeout(context.WithoutCancel(ctx), 2*time.Minute)`（`bundle_push.go:241` 已经是这么写的，两处可以统一成一个小 helper `tailContext(ctx)`）。这样五返回值降到三，`ctx` 不再被覆盖 | 低 | 否 |
| R-X14 | `next/server/internal/ccgateway/request_logs.go:241-252`（`decodeRequestLogState`）与 `request_log_limits_test.go:27,88` | 测试覆盖退步 | 拆分后 `decodeRequestLogState` 在 levels 分支出错时 `return legacy, err`——**返回的是零值/半填的 legacy 结构 + 错误**。调用方（`request_logs.go:74`）在 `err != nil` 时直接 503，所以不影响线上；但测试 `request_log_limits_test.go` 在 `err != nil` 时**只断言 `err != nil` 就 `return`**，没有断言「出错时不会把半填结构当成功返回」。基线是 `return nil, err`，新代码是 `return legacy, err`——这是一个**返回契约从「nil+err」退化到「值+err」**的变化，靠调用方记得检查 err 才安全 | 要么恢复 `return nil, err`（与基线一致、更安全），要么在测试里加一条「出错时返回的第一个值必须是零值」（`if err != nil { if len(...) != 0 { fail } }`）。前者更省事。`decodeLevelState` 的 `*requestLogLevelState` 指针返回同理，可以简化为 `(requestLogLevelState, bool, error)` | 低 | 否（现状调用方安全） |
| R-X15 | `next/plugins/ccgateway/companions/engine/request_log_diagnostic.go`（`writeMetadata`）vs `request_log_store.go`（`finish` 的调用点） | 位置/职责（低嵌套的可读性副作用） | `writeMetadata` 被提成 `requestDiagnostic` 的方法，但它做的是「关 response 文件 + 写 response-headers + emit + 写 metadata + 超限截断」五件事，且**必须在 `d.mu` 内调用**（注释写了 "Caller holds d.mu"）。`finish` 现在是 `b := d.writeMetadata()`——比原来 34 行的内联段好，但 `writeMetadata` 自己又调 `d.saveLocked`（会走 `reserve`，可能把 `d.discarded` 置 true 并关 response），所以「锁内做 IO + 改预算状态」这个组合没有变、只是换了名字。**锁顺序与预算算法确实未变**（已验证），这里只是提醒：拆分文档说「`finish` 的 metadata 落盘提 `writeMetadata()`」听起来像纯提取，实际它承担了 `finish` 一半的状态机，读者不该把它当纯函数 | 在 `writeMetadata` 的注释里补一句「会通过 `saveLocked` 消耗预算、可能置 `discarded`；返回的字节是给索引用的最终 metadata」。或把「关 response + 写 headers + emit」与「写 metadata（含截断）」拆成两个方法，后者只管字段与落盘 | 低 | 否 |
| R-X16 | `next/plugins/ccgateway/companions/engine/request_log_viewer.go:419` 的注释 | 注释与事实不符 | 新注释说「`cli-*` and `upstream*` stopped being written when the managed CLI updater and the legacy relay went away」。但事实核对：`cli-stdout.jsonl` 的写者 `traceReader` 在 **0.1.86（`24c316eee`）仍在**（`runner.go:265,348`），是 `9361e138f`（2026-10-24 04:48）才删的，而 0.1.86 不含该提交。所以「stopped being written」对线上现存日志不成立，这句话会让后来人以为可以直接删 `history`/`cli-` 的兼容分支 | 改成「`cli-*` was written up to plugin 0.1.86; `upstream*` only by the removed legacy relay; keep the compatibility branches until those logs age out (7 days after 0.1.87 rollout)」 | 无 | 否 |
| R-X17 | `next/plugins/ccgateway/companions/contracts/features/catalog.go:1-27`（只剩两个类型 + 常量） | 死文件（低） | 删掉 `Catalog`/`entry`/`CatalogVersion` 后，`catalog.go` 只剩 `Feature`、`Document` 两个类型与 `PolicySchemaVersion` 常量，而 `request_modes.go`（`RequestCatalog`）、`runtime.go`（`RuntimeCapabilities`）、核心 `features.go` 都在用它们。文件名 `catalog.go` 现在描述的是「目录的线形」，可以接受；但包级注释「A native-era source catalog no longer exists」+ 文件名会让人继续找 `Catalog`。属轻微的命名残留 | 把该文件改名为 `document.go`（或把两个类型并进 `request_modes.go`），或至少把包级注释改成「Feature/Document 是目录的线形；目录内容只由 RequestCatalog/RequestRuntimeCatalog 产生」。**不紧急** | 无 | 否 |
| R-X18 | `next/plugins/ccgateway/companions/worker/internal/config/config.go:157-180`（`parseBind`） | 行为微差（已核对为等价，但缺少边界测试） | `parseBind` 把 `port` 校验留在 `if port, err = strconv.Atoi(rawPort); err != nil \|\| port < 1 \|\| port > 65535`——注意**这里用 `=` 而不是 `:=`**，即 `port` 是被命名返回值，`Atoi` 失败时 `port` 已被赋为 0（Atoi 失败返回 0），随后 `return "", 0, ...` 也覆盖。语义等价已核过；但 `parseBind` 有三条分支（空、SplitHostPort 失败、端口非法、host 非法、localhost 归一）在 `config_test.go` 中我没有找到逐一覆盖（`grep 'CCG_BIND' config_test.go` 的用例集中在 `Load` 层）。这类「安全 host 校验」值得直接测到函数级 | 给 `parseBind` 加表驱动测试（用 `t.Setenv`）：`""`、`":8788"`、`"127.0.0.1:8788"`、`"localhost:0"`、`"localhost:65536"`、`"0.0.0.0:8788"`、`"8.8.8.8:8788"`、`"bad"`、`"127.0.0.1:"`，断言 host/port/err 与错误文案 | 低 | 否（只加测试） |
| R-X19 | 计划文档 `05-ccgateway.md:412`、§6.3 | 文档与实现不符（低） | 结果表写「X17 只改旧日志文件的 `kind` 标签（`cli`/`upstream` 归一为 `other`/`upstream`）」。实际：`cli-*` → `other`，`upstream*` 前缀已删故旧 `upstream-*` 文件现在落到 `other` 或 `build`（依后缀），`resource-*` 仍 `upstream`。同时 `§7.5` 提到 web `FILE_KINDS` 只「以后」删 `history`，但实际上 `cli` 已经变成死的了（R-X2） | 把这一行改成逐前缀的映射表（`request.body→request`、`response.body→response`、`resource-*→upstream`、`history*→history`、`*.json→build`、其余→other），并注明 `cli-*`/`upstream*` 的历史文件现在归 `other` | 无 | 否 |
| R-X20 | `next/plugins/ccgateway/companions/engine/cli_management.go:35,80,91,217`（`checked` 字段） | 死代码残留（X18 的尾巴） | X18 删掉了唯一的自动刷新者 `autoUpdateCLI`，`checked` 现在**只在 `checkCLIRelease` 成功时写、在 `cliView()` 里作为 `release_checked_at` 读出**——这个仍在用，不是死代码。但 `cliManagement_test.go:52` 附近对 `policy.AutoUpdate` 的断言与 `putCLIPolicy` 的 409 分支（`auto && pinnedVersion != ""`）在没有自动更新的世界里只剩「拒绝客户端打开一个本来就无效的开关」这一层意义。这不是本轮引入的问题（W15/V9 已记录），列出来只为闭合 X18 的语义：删掉后台 ticker 后，`auto_update`/`channel` 字段与写盘路径仍在，属**已知遗留**，不阻断 | 无需动作（等 W15/V15 的协议改名一起清）。**仅需**在 X18 的发布说明里明确「非固定版本 Worker 不再自动刷新 `latest_version`，必须手动 check」——计划 §6.3 已写，确认即可 | 无 | 是（已披露） |

---

## 关于审核清单里逐条结论

1. **`MessageFromEvents` → `creditStream` 的判定与错误文本**：逐分支一致（深度 4、全排列对拍），**唯一差异是零内容块的 `content: [] → null`（R-X1）**。乱序/畸形流覆盖：`events_test.go` 覆盖了 identity 重写、未知 delta、错 index、`ping` 代 `message_stop`；`empty_input_delta_test.go` 覆盖了空 `partial_json` 与非法 delta；**未覆盖**「message_delta 后才 message_start」（`onMessageStart` 的 `s.message != nil` 会拒）、「第二个 content_block_start 同 index」（`index != len(s.blocks)` 会拒）、「零块完整流」（R-X1）。前两条由 `apply` 的 `s.ended` 与 index 检查兜住，逻辑正确；零块这条是唯一真实缺口。
2. **engine 资源授权拆分**：安全条件与错误文本**逐字未变**（`credentialSources` 的 5 个 override 键、env 重复拼写、settings 注入、source 唯一性；`readCredential` 的 darwin/config=storage、token 字符、OAuth first-party origin；`awaitResourceInitialization` 的 stage 名与 30s/25ms）。`defer/stop` 顺序经核对与原 LIFO 等价（R-X 见验证 9）。`firstPartyOrigin(target, basePath)` 把 `resource_carrier.go` 的管理 API origin 检查与 `resource_identity_carrier.go` 的 Bearer 来源检查合成一个谓词，**两处各自的错误文案保留**（`resource OAuth management requires the first-party API origin` vs `errUnverifiedResourceSource`）——正确。
3. **`request_log` 三段拆分**：锁顺序与剪枝未变（验证 8）。唯一的可读性问题见 R-X15/R-X16。
4. **`features.Catalog` 与后台 CLI 发布检查的删除**：Go/TS/Vue/JS/Py 零残留；`unhandled` 的两处文档（`CONTRACTS.md:3934`、`ENVIRONMENT-RUNBOOK.md:214`）**已被更新**；但 `CONTRACTS.md:4035/4046` 与 `next/web/mock/ccgateway.ts` 仍在描述旧目录（R-X3）。发布顺序「先插件后核心」成立：`Catalog` 只被核心编译期使用，插件二进制不引用。
5. **controller upgrade 拆分**：rename→stop→run 顺序与两处 `put_back_env` 时机不变（`test_upgrade.py` 190 全绿，容器调用序列断言原样）；`prepare_environment` 的 env 写回（`write_atomic(env_file, updated)`）在 `swap_controller` **之前**、失败时写回 `original`，与基线一致。R-X9 是一条「拆分后可读性/测试覆盖」建议，不是回归。
6. **cli-mods `raw-json.js` 提取**：请求字节不变（156 组对拍 + `npm test` 171 + `release-v23` sha 复算 + patched 产物 import 改名）。`supportModules` 已登记 `raw-json`（profile 第 24 行）、`patch-cli-2.1.304.cjs:157` 读 profile 全量复制。**缺口**：测试侧的 `installSupport` 不装 `direct-billing`，新增模块的安装链只有间接覆盖（R-X10）。
7. **过度抽象 / 复用遗漏 / 残留**：R-X4（可变全局）、R-X6（匿名 struct 传参）、R-X13（五返回值 + ctx 覆盖）、R-X7/R-X12（复用未用到底）、R-X17/R-X20（命名与已知遗留）。

## 已确认「没有问题」的高风险点（供后续轮次不必重查）

- `ClassifyError` 抽出 `classifyLocal` 后，case 顺序（transport → local → billing → 401/403 → 429 → 529 → 5xx → 4xx）与 `cooldown` 时长、`resp.LocalFailure` 的赋值位置全部一致；`default` 分支的 `ACTION_RETURN_TO_CLIENT` 覆盖原来的 400/404/405/413，等价。
- `evaluateQuotaAvailability` 抽出 `scanQuotaWindows`/`blockedWindow`/`finalQuotaState` 后，末尾重复的 `authRefused` 分支改为 `return`，`Reason` 由初值 `authorization_required` 承担；`State`/`RetryAtUnix` 与改动前逐字段一致。
- `helperhistory.Validate`、`resources.requestResourceCapabilities`、`features.DecodeRuntimeCapabilities`、`credits.ClaimForResponse` 的拆分：错误文案与 `pairIndex`/`parents` 自增语义均保留（`validateUniqueRange` 按 `name` 生成两条文案，与原文逐字相同）。
- `worker/config` 的 `readTrustedJSON`/`verifyRuntimeManifestEntry`/`applyMaintenanceLease`：所有校验分支与错误文本未变，`parseBind` 语义等价（R-X18 只是缺测试）。
- 核心 `httpapi.NoStore` 取代 21 处、`detached` 取代 8 处、`decodeStrictJSON` 取代 2 处、`runtimeKeysOf`、`workerAnswer` 的应答校验：**行为不变**（`workerAnswer.result` 的四个格式检查与回显条件逐条对应）。
- `SweepDrafts` 拆出 `removeExpiredDrafts` 后，首错规则、`ctx.Err()` 提前返回位置、三段仍依次执行——与原实现一致。
- `MarkAccountDeleted` 改 `RetainDays` + `RETURNING purge_after`：`account/purge.go` 去掉一次 `SELECT now() + make_interval`，审计 `retain_until` 字段与语义不变（`handlers.go:1410` 仍写该字段），`cleanup_test.go` 已同步。

---

## 处理结果（controller/cli-mods）

范围：`next/plugins/ccgateway/companions/controller/**`（不含 README.md）与 `next/plugins/ccgateway/companions/cli-mods/**`。未提交。

### R-X8（sing-box JSON 键序）— 已修

- 核实：`0172eafa7~1` 的 `configuration` 在同一 dict 字面量里把 `detour` 写在 `tls` **之前**，拆分后 `detour` 被 `server['detour'] = ...` 追加到末尾，`json.dumps` 输出字节序改变。语义（dict `==`）与复用判定（`self._singbox(aid) == config`，比的是 dict）不受影响，但落盘的 `sing-box.json` 字节变了。
- 改法：`companions/controller/network.py` 的 `singbox_dns` 恢复旧键序——字面量里带 `detour` 占位、`not with_detour` 时 `del`，注释说明键序是文件字节的一部分。
- 验证：用 `0172eafa7~1` 的旧 `network.py` 与新实现并排跑 `configuration`，proxy / direct 两种入参的 `json.dumps(config)` **均 `==` 成立**（字节级）。
- 测试：`companions/controller/test_network.py` 新增 `test_singbox_json_key_order_is_pinned`，对 proxy 与 direct 两种配置断言整串 `json.dumps` 输出（含 `detour` 在 `tls` 前、direct 无 `detour`），把键序钉死。

### R-X9（upgrade rename→stop→run 护栏）— 已加测试 + 文档

- 核实：拆分后顺序与两处 `put_back_env` 时机未变（既有 `test_upgrade.py` 序列断言原样通过）；`start_controller` 重新 `container(client, prev)` 查询，`prev` 缺失时直接 `run`，与基线的 `current is None → run` 同义，不是回归，只是「中断恢复」分支被藏进 `if old is not None`。
- 改法：`companions/controller/upgrade.py` 的 `start_controller` docstring 写明「`prev` 缺失是 rename 之后、删除之前中断的合法状态」。逻辑未改。
- 测试：`test_upgrade.py` 新增 `test_prev_gone_before_start_still_runs_the_new_controller`——包住 `swap_controller` 执行真实逻辑后把 `prev` 从 fake client 删掉，断言整次升级仍返回 `('done','')`、`stop` 未被调用、`run` 用新镜像发生。

### R-X10（`installSupport` 与生产安装器脱钩）— 已修

- 核实：原 `test/support.mjs` 只复制调用方枚举的 names + `shared`，而 `patch-cli-2.1.304.cjs:157` 按 `profile.supportModules` **全量**复制；`direct-billing.js` 新增的 `./raw-json.js` 依赖在测试侧从未被安装。
- 改法：`cli-mods/test/support.mjs` 改为完全按 profile 的 `supportModules` 全量安装（与生产安装器同一份清单、同一套 `'./x.js' → './ccgateway-x.js'` 改写），`names` 参数降级为「本测试打算用到的模块」校验——不在 profile 清单里就立刻报错。`supportModules` 导出供测试断言。
- 测试：
  - `test/direct-billing.test.mjs` 新增 `installed direct billing imports the installed raw-json and shared modules`：只请求 `direct-billing`，断言 `ccgateway-raw-json.js` / `ccgateway-content-policy.js` / `ccgateway-shared.js` / `ccgateway-request-policy.js` 都被装出、`ccgateway-direct-billing.js` 的 import 已改成 `./ccgateway-raw-json.js` 等，并**动态导入装出来的模块**执行 `applyDirectBilling`，与源码版结果逐字节相同——这条链此前只被间接覆盖。
  - `test/patch-wire-preservation-304.test.mjs` 增加两行断言：`patchManifest.supportFiles['ccgateway-raw-json.js']` 存在、安装后的 `ccgateway-direct-billing.js` 从 `./ccgateway-raw-json.js` 导入，钉住生产安装器的行为。

### R-X11（`billingItems` 三形态数组）— 跳过（值低，且会触发 CLI v23 重建）

- 核实：`direct-billing.js` 的 `billingItems` 确实返回混用 `{index,block}` / `{block}` / `{index,block,text}` 三形态的数组，下游 `arraySystemEdits` 靠 `item.index === undefined` / `item.text !== undefined` 区分。这是原实现就有的隐式契约。
- 审核建议的两条改法（补注释 / 改 `{kept, inserts, replaced}`）都在 `direct-billing.js` 内，而该文件是 `profile.supportModules` 成员，会被打进 CLI v23 ELF（已核实 ELF 内含 `applyDirectBilling` 符号文本）。任何改动都会让 `ccgateway-patch.json` 的 `supportFiles` sha 与 `release-v23` 产物失效，必须按流程重建 v23 并更新 sha。
- 结论：按任务约定「值低则跳过、优先不重建」——**本轮不做 R-X11**，保持 v23 现状。若后续因其他原因需要重建 v23，可顺带补上 `billingItems` 的三形态注释（或改成 `{kept, inserts, replaced}`，后者要连带重审 `arraySystemEdits` 的 pending/order 字节语义，风险更高）。

### 测试实跑

- controller：`test_cleanup test_cli_profiles test_headers test_manager test_network test_runtime test_runtime_updates test_shared_egress test_tunnel test_upgrade test_uploads test_worker` 共 **192 通过**（原 190 + 本轮 2 条新测试），0 失败。
- cli-mods：`npm test` **172 通过，0 跳过**（原 171 + 本轮 1 条新测试），无 skip。
- 未改动任何 Go 模块、web 源码或 CLI v23 产物；未重建 ELF，因此没有新的 sha。


---

## 处理结果（Go 插件/engine/worker/contracts）

处理范围仅限 `next/plugins/ccgateway` 的 Go 代码：插件模块、`companions/{engine,worker,contracts}`。`next/server`、controller、cli-mods、web 未改动（只读核对）。未提交。

| id | 处理 | 位置 |
|---|---|---|
| R-X1 | **已修**（回归）。`creditStream.blocks` 在 `MessageFromEvents` 里初始化为 `[]any{}`，零内容块的完整流重新输出 `"content":[]`；`ClaimForResponse` 在该响应上恢复返回 claim | `contracts/credits/events.go:45-48` |
| R-X1 测试 | 新增两条回归：`TestMessageFromEventsZeroContentBlocks`（零块完整流含 `"content":[]`、不含 `"content":null`）、`TestCreditZeroBlockRefusalStillClaims`（`MessageFromEvents` 组装 → `ClaimForResponse` 返回非 nil claim，2 个 digest、SourceModel 正确）。在 `/tmp/credcheck` 里把 `blocks: []any{}` 改回零值复跑，两条都按预期失败（`{"content":null,...}` / `fallback credit response content missing`），确认测试真的钉住了回归 | `contracts/credits/events_test.go`、`contracts/credits/prompt_test.go` |
| R-X2 / R-X16 | **已修**（engine 侧）。恢复 `cli-` → `cli` 分类分支，修复错误注释为本轮事实：`cli-*` 到插件 0.1.86 仍在写、`upstream*` 只由已删的 legacy relay 写、两个兼容分支等日志老化后再删。新增 `TestRequestLogFileKinds` 钉住逐前缀映射（`cli-stdout.jsonl`/`cli-stderr.jsonl` → `cli` 等 8 例） | `engine/request_log_viewer.go:415-433`、`engine/request_log_viewer_test.go` |
| R-X2 连带（给 web 写者） | 恢复 engine 的 `cli` kind 后，web `next/web/src/views/ccgateway/requestLogViewer.ts:214` 的 `FILE_KINDS` 里的 `'cli'` 与 `logViewer.kind.cli` **不再是死分组**，应**保留**，不要按审核表原文删除 | — |
| R-X4 | **已修**。删掉包级可变 `deltaTextFields`/`deltaBlockTypes`，改为无状态的 `deltaField(kind) (key, blockType)` switch；`onStringDelta` 用其返回值并加 `key == ""` 守卫（未知 kind 仍判失败，与原来两个 map 都取不到值时 `expected=""` 的行为一致） | `contracts/credits/events.go:14-28,180` |
| R-X5 | **已修**。`MessageFromEvents` 直接 `return nil, err`（不再把 `apply` 的 err 重写成 `errCreditStream`）；`onMessageDelta`/`onMessageStop` 直接返回 `mergeCreditFacts` 的 err；`mergeCreditFacts` 的 `fmt.Errorf("response identity overwrite")` 统一为 `errCreditStream`，文件内「一个失败 = 一个错误值」。对外文案不变（唯一被删的 `"response identity overwrite"` 全仓（plugins + server）除定义外零引用，无测试断言它） | `contracts/credits/events.go` |
| R-X15 | **已修（只补注释）**。`writeMetadata` 注释补明「不是纯提取：经 `saveLocked` 消耗预算、可能置 `discarded`，返回的是截断后的最终 metadata」，未拆方法（锁序与预算算法保持原状） | `engine/request_log_diagnostic.go:422-427` |
| R-X17 | **已修**。`contracts/features/catalog.go` → `document.go`（`git mv`，未暂存提交），包注释改为「Feature/Document 是目录的线形，目录值只由 RequestCatalog / RequestRuntimeCatalog 产生」。纯改名，无符号变动 | `contracts/features/document.go` |
| R-X18 | **已修（补测试）**。新增 `TestParseBindBranches`：`""`、`:8788`、`127.0.0.1:8788`、`localhost:9001`（归一为 127.0.0.1）、`[::1]:9001`、`0.0.0.0:8788` 六条成功分支，以及 `localhost:0`、`localhost:65536`、`127.0.0.1:`、`8.8.8.8:8788`、`bad` 五条错误分支，逐条断言 host/port **与错误文案**。`parseBind` 实现未改 | `worker/internal/config/config_test.go` |
| R-X20 | **跳过（核实不是死代码）**。`checked` 在 `save`（切 channel 时清空）、`checkCLIRelease`（成功后写）两处赋值，并由 `cliView()` 作为 `release_checked_at` 输出（`cli_management.go:35,80,91,217`），仍是活字段；审核意见本身也写了「无需动作」，故不改 | — |

### 验证（每个模块一次）

- `contracts`：`go build ./...`、`GOOS=linux go vet ./...`、`go test -count=1 ./...`（7 包全绿）、`staticcheck ./...` 无输出。
- `companions`（engine）：`go build ./...`、`GOOS=linux go vet ./...`、`go test -count=1 ./...`（`ccgateway/engine` 全绿，含新增 `TestRequestLogFileKinds`）、`staticcheck ./...` 仅已知 4 处 ST1005（`cli_check.go:65`、`cli_management.go:206`、`runner.go:30,61`），本轮未新增。
- `worker`：`go build ./...`、`GOOS=linux go vet ./...`、`go test -count=1 ./...`（config/server/worker 全绿）、`staticcheck ./...` 无输出。
- 插件模块：`go build ./...`、`GOOS=linux go vet ./...`、`go test -count=1 ./...`（2 包全绿）、`staticcheck ./...` 无输出。
- `gofmt -l` 对全部改动文件：无输出。
- `next/server`（只读核对，contracts 兼容性）：`go build ./...` 通过，`GOOS=linux go vet ./internal/ccgateway/` 通过。


## 处理结果（next/server 核心 ccgateway，2026-10-24）

处理范围：仅 `next/server/internal/ccgateway`（R-X3 只改测试；`next/web/mock`、`CONTRACTS.md` 不在本写者范围内）。未提交。

| id | 处理 | 位置 |
|---|---|---|
| R-X3 | **已修（测试）**。`features_test` 不再调用与端点同一个 `RequestCatalog`，改为按值钉住：`catalog_version == "2026-10-20.request-attachments-v1"`、`policy_schema_version == 1`、feature id 序列恰为 `["F-REQUEST-MODES","F-BUILD-ATTACHMENTS"]`，并断言第二条的 `status/mechanisms`（任何增删都要显式改测试）。② 的 mock 已由 web 写者同步；③ `CONTRACTS.md:4035/4046` 仍写旧 ID，需要 Docs 处理 | `internal/ccgateway/features_test.go` |
| R-X6 | **已修**。`requestLogLevelState.Limits` 与解码用的匿名 struct 都提成命名类型 `requestLogLimits`，`validateLogTierLimits(*requestLogLimits)` 不再依赖结构同一性 | `internal/ccgateway/request_logs.go:215-235,290-300,357` |
| R-X7 | **已修（采用 (a)）**。`controllerInstall` 改用 `installLock`（错误码与原手写完全一致）；`runtimeCleanup` 保留手写并加注释说明「此处答 `core.ErrUnavailable`（无 reason），与 installLock 不同，按计划 §8 保留」。新增 fake-Locker 测试断言 `installLock` 在 locker 报错时写 503 + `install_failed` | `internal/ccgateway/controller_install.go:306`、`cleanup.go:201-206`、`install_lock_test.go` |
| R-X12 | **已修（选严格）**。`bundledRoles` 改用 `decodeStrictJSON`（空体/`null` 仍表示全部角色）；未知字段与尾随 JSON 从 200 变 400，已补测试用例。**需一行发布说明** | `internal/ccgateway/bundle_push.go:283-300`、`bundle_test.go:671` |
| R-X13 | **已修**。见 01-server R-S10：`applyLoadedImage` 三返回值、调用点用 `tailContext`、`loadRequest` 命名类型 | `internal/ccgateway/controller_uploads.go`、`bundle_push.go` |
| R-X14 | **已修**。`decodeRequestLogState` 任一步失败都 `return nil, err`（基线契约）；`decodeLevelState` 同时改为值返回 `(requestLogLevelState, bool, error)`；测试在错误分支断言第一个返回值为 nil | `internal/ccgateway/request_logs.go:242-260,280-345`、`request_log_limits_test.go:26-40` |

验证见 `01-server.md` 的「验证」小节（`next/server` 全量 `go test -count=1 ./...` 49 包 ok、exit 0）。
