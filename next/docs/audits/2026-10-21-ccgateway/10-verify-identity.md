# 10 交叉核验：请求身份（metadata.user_id）与定制 CLI / 发布产物

核验日期 2026-10-21。基线：本机 `feat/next-platform` HEAD `43d576838`。线上为 CCGateway 0.1.70（Worker/CLI 源码等同 origin `50da2ceac`，CLI 为 v12）。身份映射相关代码（`request_identity.go`、`request-identity.js`、`identity.go`、`feature_policy.go:188-193`、Yi 会话补丁、v14 标签）**全部**由未推送提交 `08035b19c` 引入（`git show --stat 08035b19c` 已核对），所以 B1–B4 只影响未推送的 HEAD，不影响线上 0.1.70。

本次只读核验。临时 Go 测试 `engine/zz_verify_identity_test.go` 和 `%TEMP%\ccg-verify-identity\` 下的 node 脚本已在用完后删除。工作区里的 `next/server/internal/ccgateway/zz_verify_path_test.go` 属于其他核验员，不是本核验员创建的。

材料代号：M = 主控（00/05/07/02），A = `1 - 副本.txt`，B = `1.txt` + `审核报告.txt` + artifacts。

## 1 核验表

| # | 结论（来源） | 判定 | 修正严重度 | 影响 | 关键证据 |
|---|---|---|---|---|---|
| 1 | B1：核心默认下发 `user_id=replace`，engine 原样放进 build 信封，CLI 拒绝，所有 build 请求失败（M-B1/05-F1 报，B-F01 报，**A 漏报**） | **成立** | **P0**（发布阻断） | 只影响 HEAD，需要新 Core＋新 Worker＋v14 CLI 同时部署 | 下发：`feature_policy.go:188-191`；`resolvedWorkerPolicy` 只把附件和计费两类做了稀疏化（`:265-278`）。信封：`request_command.go:42,272-274`。拒绝：`request-policy.js:16-18`。错误帧：`request-error.js:39-42` 把 build 阶段一律映射为 400。复现：信封 `{"contract_version":2,"request_identity_sources":{"user_id":"replace"}}` → **HTTP 400** `invalid_request_error` / `cli_invalid_request` / `Unknown request policy key: request_identity_sources`。B 的 live 证据：build 24/24 全是 400，上游请求数 0 |
| 2 | B2：新 Worker 配 v12 CLI（没有 `request_identity_v1`）时所有请求 409（M-B2/02-F2/05-F2 报，B 在 F01 中顺带提到，A 漏报） | **成立** | P1 | 只影响 HEAD。按当前树直接构建镜像就会得到这个组合（见 #8） | `request_command.go:209-216`：判断条件是 `policy.Identity["user_id"] != ""`，而核心总是填 `replace`，Worker 区分不出默认值和显式配置。这个判断位于模式分支之前，所以 direct 也 409。核心 `runtime_features.go:25-45` 的能力预检不包含身份能力，预检通过也挡不住。复现：`b2_409=true` |
| 3 | B3：客户端没发身份或选了 client 时，build 发出的是 Worker 原生 user_id；只带其他 metadata 字段时这些字段会丢（M-B3/05-F3 报、B-F02 报；**A 的结论相反，A 错**） | **成立** | P2（M、B 定的 P1 偏高） | 两边都有：线上 v12 的 build 本来就总是用原生 metadata，这不是回归；HEAD 的提交说明却声称已经修好，实际没有 | 只有 `rewrite‖session` 时才传 `CCG_REQUEST_IDENTITY`（`request_command.go:333`）。客户端没有可用身份时 `rewrite=false`（`request_identity.go:148-154,172-174,204-207`），client 模式根本不计算（`:218`）。于是 JS `applyBuildMetadata` 收不到上下文，直接 `return built`（`request-identity.js:64`）。`metadata` 属于 nativeFields，不会恢复客户端的值（`request-parameters.js:13`）。复现（Worker 实际传的环境）：absent/空/仅 custom/`""`/null/数字，build 全部得到原生 `user_id`，`custom` 丢失；direct 原样保留。A 说的"无身份时 delete built.metadata"这条分支，从 Worker 永远走不到 |
| 4 | B4：映射密钥 = SHA-256(公开常量＋小写邮箱)，没有秘密成分（M-B4/05-F4 报 P1，A-T5 列为设计权衡，B 漏报） | **成立** | P2 | 只影响 HEAD；与线上直接透传客户端 ID 相比仍是改进 | `request_identity.go:48`。上游知道账号邮箱，可以推出密钥；对已知的 device_id 计算 HMAC，就能反查和跨账号关联。威胁成立。但这是新功能的隐私强度不足，不是功能故障，定为 P2 |
| 5 | A-C7：`mode≠replace` 且 `rewrite=true` 时，direct 会写入原生 device_id | **部分成立** | P3（A 定的 Medium 偏高） | 只影响 HEAD，当前不可达 | Go 永远不会生成 `mode:'client', rewrite:true`：client 分支只设 Session，而且整个分支是死代码（`request_command.go:218`）。`mode:'worker', rewrite:true`（`request_identity.go:215-217`）写入原生身份是**设计本意**（identity.go:12 "worker = Worker CLI's own identity"）。原生 device_id 是账号容器自己的 CLI userID，不是宿主机或最终用户的 ID。A 指出的问题只是缺少防御性不变量 |
| 6 | A-C8：空或非标量 user_id 在 build 与 direct 下语义不一致；数字/布尔静默放行 | **部分成立**（A 描述的方向是错的） | P3 | 只影响 HEAD | A 依据的是 JS 模块在注入假上下文时的行为。实际集成中，`""`、`null`、`{}` 时 Go 不传上下文 → build 注入原生 ID、direct 原样保留。不一致确实存在，但方向与 A 说的相反，而且就是 #3。数字/布尔：只要映射适用（OAuth、非 client），Go 就返回 **400** `metadata.user_id must be an object or a string`（`request_identity.go:197-198`），不是静默放行。只有在映射本来就不适用的路径上才会透传 |
| 7 | A-C3：`content-policy.js:319-322` 计费字段歧义时不替换，客户端伪造的 billing 原样上行 | **部分成立** | P3（A 定的 High 明显高估） | 线上和 HEAD 都有 | 代码事实成立，客户端也确实能构造歧义（重复 key、写两行、放进代码围栏、两个 block 各写一行）。但这是**有文档的设计**："无匹配/歧义 → 保留原内容"（`CC-304-ASSEMBLY-TEST-PLAN.md:16`）。环境字段歧义时同样保留客户端文本（`content-policy.js:108,129,196-197`），模块内部语义是一致的。后果等同于 `source=client`，而 client 正是默认值；客户端本来就掌控整个正文，billing 不是安全边界。"冒用版本身份"的说法夸大了 |
| 8 | `package-release.cjs` 只接受 v12，源码是 v14；镜像复制的是旧 release（A-C2、M-B6/05-F7、B-F03 都报了） | **成立** | P2（打包本身 fail-closed；真正的后果是 #2，已单独定为 P1） | 只影响 HEAD 的发布流程 | `package-release.cjs:7-8` 对比 `patch-cli-2.1.304.cjs:135`。`worker/Dockerfile:32` 只 `COPY cli-mods/release/`，`:33` 只做 `test -f`，不校验 SHA，也不编译。`release/` 被 `.gitignore` 忽略；本地 `release/manifest.json` 的 304 条目是 v12（`138da88e…`），302 条目是 v7。`build.sh` 没有 `--target`。`cli-mods/Dockerfile` 是另一个独立的原生镜像，与 Worker 无关。B 说"重建镜像不会自动获得新 CLI"是对的 |
| 9 | A："根会话补丁保证 metadata 与传输头一致"；M-07 实测 build 每轮换新 session、direct 头与正文不一致 | **双方针对的版本不同，都只说对了一部分** | L1/L2 在线上仍是 P1 | M-07 测的是线上 v12；A 看的是 v14 源码 | v12 没有 Yi 会话补丁，所以 M-07 的 L1/L2 在线上成立。v14 的 `patch-cli-2.1.304.cjs:52` 只在 Worker 传了上下文时才生效。build＋replace 且客户端带 session 时，跨轮稳定（复现 `replace_session_stable_with_client_session=true`），但被 #1 阻断，实际用不上；客户端 user_id 不含 session 时每次 `uuid()`，仍然不稳定。direct＋replace/worker 时，头、正文、account_uuid 一致，L2 已修。**direct＋client**、OAuth 读不到邮箱、build＋worker/client 这几种情况仍未修 |
| 10 | M-07 L3：OAuth 第一方 build 追加伪造的 `diagnostics.previous_message_id` | **成立**，v14 没有改动 | P1–P2（真实上游是否校验无法判定，暂按 P1） | 线上和 HEAD 都有 | 原生 qmn 条件追加 `diagnostics:{previous_message_id:rt??null}`（restored `chunk-rncrmfyt.js`）。build 为重建的 assistant 记录伪造 `msg_${randomUUID()}`（`request-input.js:155`）。cli-mods 和 engine 都没有处理这个字段（grep 为空）。原版 CLI 里有 `previous_message_id_invalid` 的 400 分类，说明服务端会校验这个字段 |
| 11 | A-C10：`/healthz` 未鉴权，返回版本、补丁和 SHA | **成立**（只是信息暴露） | P3 / 提示 | 线上和 HEAD 都有 | `engine/main.go:66-70`。Worker 只在本账号的私有网络上（`manager.py:51,544-547`）可达，能访问的只有本账号的 egress、控制器隧道和宿主机；Worker 的 `/health` 本来就返回同类信息，控制器探针也依赖它（`offline_migration_probe.py:42`）。版本和补丁哈希不是秘密 |
| 12a | M-05 F5：Scratchpad 路径泄露客户端会话 ID | **成立** | P2（HEAD：削弱了映射的效果）；线上没有额外损失（线上 metadata 本身就带原会话） | 两边都有 | 原版 `XT(e=q())` → `ke(aC(),e,"scratchpad")`，路径里含会话 UUID（restored `chunk-gzxd3rp1.js`）；`content-policy.js:63` 识别这一行。`scratchpad_directory` 的默认来源是 client，direct 下正文原样转发。前提是客户端启用了 scratchpad（`pi()` 门控） |
| 12b | M-05 F6：503 被报成 400 | **成立** | P3（M 定 P2；只在服务端配置错误时触发） | 两边都有 | `request-error.js:37-55` 不读 `error.status`。复现：`status:503` 的错误在 build 阶段被映射成 `400 invalid_request_error/cli_invalid_request` |
| 12c | M-05 F9：客户端没发 system 时 build 发出 `system: []`；字符串被改成数组 | **成立** | P2（按"尽量不改客户端结构"的原则） | 两边都有 | engine `request_command.go:66` 给缺省 system 设 `[]`；`request-input.js:46-48,59`；补丁后的 qmn 总会输出 `system` 键（`patch-cli-2.1.304.cjs:102`） |
| 13 | 同主题补充：全局 PUT 省略 identity 会丢失已存值（M-02 F5、B-F06） | **成立** | P2 | 只影响 HEAD | `config.go:359-380` 只对 billing 和 attachment 两类做了"省略即保留" |
| 14 | 同主题补充：direct 模式下 identity 仍然生效，但 UI 隐藏了这一项（M-02 F6、B-F07） | **成立** | P2 | 只影响 HEAD | `RequestPolicySettings.vue:156-199`：identity 放在 `v-else`（非 direct）分支里；Worker 在模式分支之前就处理身份（`request_command.go:202-227`），direct 也会调用 `identityBody` |
| 15 | 同主题补充：前端不校验 identity 的取值（B-F08） | **成立** | P3 | 只影响 HEAD | `requestPolicy.ts:145-156,194-201` 没有检查 `request_identity_sources` 的值 |
| 16 | 同主题补充：不透明 user_id 被改写成 CC JSON 字符串（M-05 F16）；对比 A 的"三载体保持原形态" | M **成立**；A **部分成立** | P3 | 只影响 HEAD | `request_identity.go:192-196` 把不透明字符串按 `carrier=json` 处理。B 的证据（opaque 用例）显示上游收到的是 JSON 对象字符串。object、json、flat 三种结构化载体确实保持原形态 |
| 17 | A："direct 逐字节保留，只替换 user_id 跨度" | **成立** | — | — | `request-identity.js:122-132` 只拼接被替换的跨度 |

## 2 有争议条目的详细论证

### 2.1 #1 的状态码，以及 A 漏报

- 实际状态码是 **400**：`runRequestCommand` 在调用 `buildRequest` 之前就把 `phase` 设为 `'build'`（`request-command.js:77`）。`validateRequestPolicy` 抛出的错误经 `localErrorFrame` 映射为 400。Worker 的 `requestErrorFrame.write` 直接沿用帧里的 Status（`request_error.go:185,196`）。M 的 05-F1 正文已经写了"以 400 失败"，只是总报告 00 没写状态码，并不矛盾。
- 触发条件：只要核心下发了 identity（新 Core），并且 Worker 加载的 CLI 支持 `build_content_preservation_v1`（走 v2 信封）。旧 Worker 0.1.70 的 `ValidatePolicySchemaJSON` 不拒绝未知键，会忽略该字段，不受影响。
- 严重度定 P0 而不是 B 的 P1：生产全局默认是 build，这个缺陷会让默认模式完全不可用，发布前必须修。
- A 漏报，原因是它只审了 `request-identity.js` 模块内部，没有跟到 Worker 生成的信封与 `validateRequestPolicy` 白名单之间的合同。

### 2.2 #3：A 的"已核对正确"不成立

A 的依据是 `applyBuildMetadata` 第 69 行的 `delete built.metadata`。但这一行要求 `identity()` 非空，也就是 Worker 传了 `CCG_REQUEST_IDENTITY`。Go 端（`request_command.go:333`）只在 `Rewrite || Session != ""` 时才传：

- **replace 或 worker 模式**：`Rewrite=true` 的前提是客户端带有可用的 user_id。客户端没有身份时 `Rewrite=false`、`Session=""`，不传上下文。
- **client 模式**：第 218 行直接跳过，`identity == nil`。`mapRequestIdentity` 里的 `case "client"`（设置 Session）因此是死代码。

结论：从 Worker 出发，"客户端无身份 → 删除 metadata"这条分支**不可达**。

临时 Go 测试逐例核对了 `mapRequestIdentity` 的结果：absent、空对象、仅 custom、`""`、`null`、`{}` 在三种模式下都是 `env_passed=false`。node 脚本在"不传上下文"时的结果：build 全部输出原生 `user_id`，`custom: "KEEP"` 被丢弃；direct 原样保留。这与 B 的 `identity-default-current.json`（3 通过、5 失败，失败项都多出了原生 user_id）一致。

另外，B 提醒"JS 不能只看 mode，还要尊重 rewrite"也是对的。例如 user_id 为 `{"foo":1}` 时，Go 判定没有可用字段、不改写；而 JS 的 `hasUserID` 认为它非空并会替换。将来如果改成总是传上下文，两边就会产生新的分歧。

### 2.3 #5、#6：A 用了 Go 不会生成的上下文

A-C7 和 A-C8 都直接按 JS 函数的语义推导。实际集成时，上下文由 Go 生成，有两条约束：

- client 模式永远没有上下文；
- `""`、`null`、`{}` 永远 `rewrite=false`；数字或布尔在映射适用时直接 400。

因此 A 描述的"direct 对 `""` 会替换""数字静默放行"在集成链路上不会发生。真实存在的不一致是 #3（build 注入、direct 保留）。M-05 F3 指出过，JS 测试 `request-identity.test.mjs:34-43` 本身就构造了这类 Go 不会生成的上下文，A 很可能被这些测试误导了。

### 2.4 #7：计费歧义不替换是设计选择

- `CC-304-ASSEMBLY-TEST-PLAN.md:16` 写明"无匹配/歧义 → 保留原内容"；`IMPLEMENTATION.md:105` 也记录了"歧义回滚"的测试覆盖。
- 环境字段遇到歧义时同样保留客户端原文（`blocked` → 不进入 active）。A 只拿它和 `source_unavailable`（服务端缺少数据 → 503）对比，得出"语义不一致"，但这两种情况的性质不同。
- `build_billing_sources.cc_version=worker` 的作用是让指纹与 Worker CLI 对齐，不是防范客户端的安全控制。客户端本来就能控制 system 和 messages 的全部内容。最坏的后果也只是退化成默认的 client 行为。可以考虑改成 fail-closed，但定为 P3。

### 2.5 #9：v12 和 v14 的差别

| 场景 | 线上 v12 | HEAD v14 源码 |
|---|---|---|
| build，跨轮 session | 每轮随机（L1） | replace＋客户端带 session 时稳定（被 #1 阻断，实际用不上）；worker/client 模式或客户端不带 session 时仍然随机 |
| build，头与 metadata | 一致（M-07 已注明） | 一致 |
| direct，正文身份 | 最终用户的 device_id/session，`account_uuid:""`（L2） | replace：映射后的 device_id、真实 account_uuid、映射后的 session；worker：原生身份；**client：仍是最终用户的值** |
| direct，头与正文 session | 不一致（L2） | replace/worker 一致；**client 模式、OAuth 读不到邮箱时仍不一致** |

所以 A 的说法只在 v14＋replace/worker＋已传上下文时成立；M-07 的 L1/L2 对线上成立，v14 也只是部分修复。

## 3 三方在本主题的准确度

**M（主控）**
- 准确度最高，本主题的主要结论（B1–B4、B6、L1–L3、F5/F6/F9、02-F5/F6）全部成立，并且给出了根因与修复方向。
- 严重度普遍偏高一档：B3、B4 我定为 P2，F6 定为 P3。
- 00 总报告的 B1 没有写 400 状态码（05 正文有）。
- L1/L2 的标注是"生产版本"，正确；但没有说明 v14 修复了哪些场景、没修哪些场景。

**A**
- 漏报：#1（P0）、#2（P1）。
- 说反：#3。它把"build 无原生残留""根会话保证一致"列入"已核对正确"，其中前一条是错的，后一条只部分成立。
- 高估：C3（High → P3）、C7（Medium → P3，且是不可达路径）、C8（方向描述错误）。
- 正确：C2、T5（事实正确，定位为设计权衡偏轻）、C10（定级合理）、direct 逐字节替换。
- 根本问题：只看 JS 模块本身，没有沿 Worker 到 CLI 的上下文和信封合同核对集成行为。

**B**
- #1、#3（含 custom 字段丢失）、#8 都有真实容器证据，判断准确；B 的 `identity-live-current.json` 证实了 400。
- B1 定为 P1 偏低（应为 P0）。
- 漏报：#4 密钥可推导、L3 伪造 previous_message_id、F5 Scratchpad、F6 状态码映射、F9 `system: []`。这些大多不在 B 的覆盖范围内。
- B 指出的"JS 应尊重 rewrite"是另外两方都没提到的有效补充。
