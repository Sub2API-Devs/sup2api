# CCGateway 插件全面审核 · 总报告（2026-10-21）

基线：本机 `feat/next-platform` HEAD `43d576838`（比 origin 多 2 个未推送提交 `08035b19c` 身份映射 v14、`43d576838` 卷配额）；线上 Core 0.1.173 / CCGateway・Controller・Worker 0.1.70（源码 `9dfcb60b9`，与 origin `50da2ceac` 的 Worker/engine/cli-mods 无差异）。

审核方式：7 个只读审核面并行，主控核对全部 P0/P1 的代码证据，并自跑核心 PG 与前端测试。分报告：

| # | 报告 | 范围 | P0 | P1 | P2 | P3 |
|---|---|---|---:|---:|---:|---:|
| 01 | [01-lifecycle.md](01-lifecycle.md) | 账号创建/编辑/删除/重授权：前端 → 核心 → 控制器 | 0 | 2 | 4 | 10 |
| 02 | [02-layers.md](02-layers.md) | 全局 / 分组 / 账号多层覆盖 | 0 | 3 | 7 | 4 |
| 03 | [03-models-quota.md](03-models-quota.md) | 自动模型列表、额度准入、错误分类 | 0 | 2 | 9 | 6 |
| 04 | [04-request-path.md](04-request-path.md) | 网关 → 核心 → 隧道 → Worker → engine → CLI，含安全 | 0 | 1 | 5 | 7 |
| 05 | [05-cli-mods.md](05-cli-mods.md) | 定制 CLI 补丁、build 组件替换、metadata.user_id | 1 | 3 | 8 | 4 |
| 06 | [06-quality.md](06-quality.md) | 代码规范、死代码、契约重复、测试质量与 CI | – | 1* | 多 | 多 |
| 07 | [07-live-replay.md](07-live-replay.md) | 真实 CC 2.1.304 请求在 OVH 隔离容器经生产镜像 Worker 重放 | 0 | 3 | 4 | 3 |

\* 06 的 A1 与 02-F4、04-F6 为同一问题。各报告之间的重复已在下文合并。

## 1. 总体结论

- **请求内容保真达标（实测）。** 23 条真实客户端请求在 3 种凭据形态下，build 模式的 system / messages（中途 `role:"system"`、带签名 thinking 历史、tool_use↔tool_result、图片）/ tools / 参数全部相等。direct 81/81 正文逐字节相等，响应 SSE/JSON/错误体逐字节一致。没有策略头、Worker key 或凭据泄漏到上游。native 模式已退役，统一返回 409，不调用上游。
- **v12 CLI 补丁扎实。** 补丁先按哈希锁定基线，锚点必须唯一命中，否则报错退出，不会静默跳过；输出可重复。release 二进制里实际落地的改动与声明一致，116 项 node 测试全过。
- **主要问题集中在四处：**
  1. 未推送的 v14 身份映射提交不能直接发布。
  2. 身份/指纹层面与官方客户端不一致（线上现存）。
  3. 管理面的几处合同错误，以及保存会打断服务。
  4. 额度准入过于保守，会周期性拦截健康账号。
- **代码层面：** native 执行链、旧中继、`AccountRuntimes=false` 等遗留分支已在生产中走不到，却仍占 engine 大部分复杂度。策略结构在核心 / engine / 前端 / cli-mods 各写一份，靠 `"2.1.304"` 字符串判断能力。

## 2. 发布阻断：未推送的 2 个提交（必须先修再推）

| ID | 级别 | 问题 | 证据 |
|---|---|---|---|
| B1 | **P0** | 核心总是下发 `request_identity_sources:{user_id:"replace"}`。engine 组 build 信封时只清 `RelayMode/CLIVersion`，Identity 原样进信封。CLI `validateRequestPolicy` 只认 3 个键，遇到它直接抛 `Unknown request policy key`。结果：新 Core＋新 Worker 下**所有 build 请求失败**（线上默认就是 build）。 | `engine/request_command.go:41,273`；`cli-mods/request-policy.js:16-18`；`server/internal/ccgateway/feature_policy.go:188-193`（05-F1，主控已核） |
| B2 | P1 | 同一根因：Worker 把核心填的默认值当显式配置，新 Worker 配 v12 CLI（例如"只升级 Worker"）时**所有请求 409**。engine 注释的本意是"默认值不生效即可"。 | `engine/request_command.go:209-216`；`feature_policy.go:188`（02-F2 / 05-F2，主控已核） |
| B3 | P1 | build 选"客户端原始"或客户端未发 metadata 时，上游实际收到的是 Worker 原生 metadata，与 UI/文档相反；Go 的 client 分支是死代码；JS 与 Go 测试各自断言相反的行为。 | 05-F3 |
| B4 | P1 | 映射密钥 = SHA-256(公开常量＋账号邮箱)，没有秘密成分，上游可以反查或跨账号关联 device_id。 | 05-F4 |
| B5 | P2 | 卷配额：在不支持配额的存储（README 写明当前主机是 ext4）上，不只新建，**重新授权**也会 503。 | `controller/manager.py:358-386,660`（03-F-10） |
| B6 | P2 | `package-release.cjs` 拒绝打包 v14；本地 release 里的 302 条目是 v7（生产是 v11）；镜像构建不校验哈希。 | 05-F7/F8 |

**修复方向：** 核心只在显式配置时下发 identity（与 attachment/billing 一样做稀疏化），engine 在组 CLI 信封前剥掉 Identity，或让 CLI 合同正式接受该键。按能力而不是按值决定 409。密钥改为每账号随机持久密钥。

## 3. 线上现存的 P1

| ID | 问题 | 证据 | 来源 |
|---|---|---|---|
| L1 | **全局 CC 策略在界面上存不了。** 前端写 `schema_version: 2`，核心只接受 1，返回 400。表单动过一次后，同页的连接/网络/镜像保存也一起失败。 | `web/src/views/ccgateway/RequestPolicySettings.vue:50,58`；`contracts/features/runtime.go:135`；引入于 9dfcb60b9 | 02-F1，主控已核 |
| L2 | **删除 API Key 分组后，所有 remote-config 保存失败。** 孤立的 `cc_feature_groups` 键每次都被重新校验，报错又被换成不提分组的通用文案。 | `server/internal/ccgateway/config.go:554-563,583-588`；`RemoteSettings.vue:236` | 02-F3 |
| L3 | **任何一次账号保存都会打断服务。** 编辑器每次都带 `credentials`，核心用随机 nonce 重新加密；revision 拼了 `credentials_enc` 的 hex，于是只改名称也会让 runtime 重新激活。 | `web/src/views/accounts/AccountEditor.vue:549`；`accounts.go:135` | 01-F2 |
| L4 | **未同步时 409 直接返回客户端。** `{"error":"not_synchronized"}` 没有 `error.type`，分类器落入默认的 RETURN_TO_CLIENT，不切换到健康账号，客户端看到非官方格式的 409。与 L3 叠加：管理员改名称即可让在用客户端报错。 | `client.go:261-263`；`plugins/ccgateway/internal/ccgateway/classify.go:144-147` | 04-F1，主控已核 |
| L5 | **生命周期同步状态不会自愈。** 只在事件投递时写；锁竞争、`updated_at` 漂移、超时、死信后会永久停在 pending/failed，额度自动刷新被跳过，手动刷新 409。 | `account/lifecycle_events.go:90-139`；`ccgateway/accounts.go:328-334`；`account/quota_refresh.go:43,265` | 01-F1 |
| L6 | **窗口重置后账号被拦最长约 30 分钟。** 插件把"重置后未确认"判为未知，核心把复查时间钳到 30 分钟（`quotaQueryFloor = quotaFresh`），单账号分组直接 503。 | `availability.go:143-145`；`account/quota.go:40-46`；`quota_refresh.go:84-93` | 03-F-01，主控已核 |
| L7 | **一次额度查询失败，账号就 30 分钟不可调度**（`quotaErrorTTL = quotaFresh`）。另外快照有效期 = 查询周期，每轮都有一段 UNKNOWN 空窗（03-F-03）。 | `availability.go:123-129` | 03-F-02，主控已核 |
| L8 | **build 每轮生成新的 `session_id`**（metadata 与 `X-Claude-Code-Session-Id`），同一会话在上游看起来不连续；官方三轮恒定。 | 实测 W1/W2/W3 | 07-L1 |
| L9 | **direct 把最终用户的 device_id / session_id 原样送到 OAuth 账号**，`account_uuid:""`，且与请求头会话 ID 不一致。多个终端用户的设备 ID 汇聚到同一账号。 | 实测 | 07-L2 |
| L10 | **OAuth 第一方 build 追加 `diagnostics.previous_message_id`**，多轮时是内层 CLI 伪造的 `msg_<uuid>`，官方是上一条上游响应的真实 ID。 | 实测；`cli-mods/request-build-2.1.304.js` 未处理 | 07-L3 |

## 4. 重要 P2（按主题合并）

**策略字段静默失效。** `thinking_disabled_compat`、`tool_search`、`unknown_field`、`custom_tool_prefix`、`erase/replace_client_attachments` 在三层都能配、预览显示生效，但 build/direct 路径从不读取（只在 native `passthrough.go:95` 使用）。之前线上开的 thinking omit 现已不起作用。（02-F4 / 04-F6 / 06-A1，主控已核）

**分层配置：**
- 全局 PUT 缺省 identity 时会清掉已保存的值（02-F5）。
- identity 在 direct 下仍改写正文，但 UI 隐藏了这一项（02-F6）。
- 存储配置严格解码，版本回退即整层失效（02-F7）。
- 每次保存都把 `cli_version` 固化为 2.1.304（02-F8）。
- 冲突重试会覆盖他人改动（02-F9）。

**自动模型列表：**
- 来源只有插件写死的 11 个模型（`internal/ccgateway/models.go:12-16`），没有后台刷新，也不随升级更新（03-F-07）。
- 老账号（`auto_models` 为 NULL）切一下启停或改优先级，自定义列表就会被覆盖（03-F-04 / 01-F6）。
- 自动模式下映射别名永远调度不到（03-F-05）。
- "移除失败模型"被静默还原（03-F-06）。
- 缺 `claude-haiku-5-5`（03-F-08）。
- Pro 账号请求 Fable 的 403 被当成凭证失效，冷却或禁用整个账号（03-F-09）。

**转发链路：**
- 每请求的 `/healthz` 能力预检抢先碰到 409，使"revision 被拒重试一次"失效（04-F2）。
- Worker 槽位写死为 4，而账号并发默认 10，超出的请求要先上传完整请求体（最大 32 MiB）才拿到 429（04-F3）。
- Worker key 不匹配的 401 被当作上游凭据失效（04-F4）。
- 请求日志在账号级锁内同步清理目录、写大请求体，3000 个目录一次 247 ms，期间流式输出停顿（04-F5）。

**生命周期：**
- purge 失败时不退回到停止容器，purge 成功后也没有终态（01-F3）。
- 插件卸载时批量删除不写删除意图，数据卷和 OAuth 留在宿主机（01-F4）。
- 事件超时 20 s 短于控制器 apply 的正常耗时，并造成队头阻塞（01-F5）。

**指纹与客户端结构：**
- `cc_version=worker` 用首个文本块（CLAUDE.md 提醒）算指纹，测试 oracle 把这个偏差固化成了预期值（07-L5）。
- API Key 路径 UA 是 `ccgateway-request`（07-L6 / 05-F15）。
- `x-stainless-timeout: 3600`，官方是 600（07-L7）。
- 客户端非第一方形态 + 内层第一方 OAuth 追加项，形成官方不会发出的混合形态，需要产品决定（07-L4）。
- build 把字符串 system 改成数组，客户端没发 system 时也发出 `system: []`（05-F9）。
- 本地错误一律映射为 400（05-F6）。
- 客户端会话 ID 仍会经 Scratchpad 路径出现在环境文本里（05-F5）。

**主控自查（出口组件）：**
- X1（P3，潜在）：`companions/xray-egress/service.py:81-82` 在应答超过 1232 字节时构造的 TC 截断包丢了 question 段、计数清零。Go（`dnsPacketRoundTrip` 读不到 Question 就继续等）和 glibc（`res_queriesmatch` 比对 qdcount）都会把它当无效包丢弃，等到超时，不会改走 TCP。
- 修法：沿用 SERVFAIL 分支的写法，保留请求头的 qdcount 和 question 段，只置 QR|TC。

## 5. 代码规范（详见 06）

- **死代码。** 生产入口不可达的函数 161 个（约 4.1k 行）。整条 native exchange 链走不到（两个构造函数都强制 `RequestMode=build`），删掉后还会多出约 2.8k 行。复杂度 Top 30 中有 16 个在这些死路径上，**先删再重构**。同类遗留还有：`engine.Serve` 旧入口、`companions/main.go`、控制器 `v1/messages` 旧中继（`admin/*` 仍在用，不能删）、`AccountRuntimes=false`/ssh/local 分支、`patch-cli-2.1.296.cjs`。
- **契约重复。** 策略结构、附件字段表、Beta 列表、身份字段在核心 `request_policy.go`、engine `request_policy.go`/`request_command.go`、前端 `requestPolicy.ts`、cli-mods `request-policy.js` 各写一份，没有跨语言一致性测试。B1、L1 都是这个原因直接导致的。建议以 `contracts/features` 为唯一来源，生成或校验其余三处。
- **硬编码版本。** `"2.1.304"` 出现在 `client.go:227`、`runtime_features.go:27/33`、`workers.go:73`、前端保存逻辑中，应改成按能力判断。
- **结构。** engine 是扁平单包（137 源文件），核心 `Service` 是上帝对象，`manager.py` 85 KB 单文件，错误码分散定义。

## 6. 测试评估

**本次实际运行：**

| 模块 | 结果 |
|---|---|
| 核心 `server/internal/ccgateway`（真实 PG） | 4460 个用例（含子测试）全过，0 跳过（主控） |
| 前端 `views/ccgateway` | 20 文件 / 259 项全过（主控） |
| 插件 / contracts / worker | 145 / 119 / 43 全过（worker 另 1 跳过） |
| companions（engine 等） | 1790 项：通过 1489，**跳过 301**（`CCG_REAL_CLI` 门控，CI 从不设置） |
| cli-mods node | 116 项全过 |
| controller Python | Windows 下 9 个模块因 `fcntl` 无法导入，能导入的 43 项通过；需在 Linux 补跑 |

**覆盖缺口（共性）：**
1. **跨层合同没有测试。** 前端测试全部 mock 接口，所以 L1（schema 2 vs 1）漏掉；engine→CLI 信封没有端到端测试，所以 B1 漏掉。
2. **测试把错误行为写成了断言。** 额度 F-01/F-02 的现有测试、billing 指纹 oracle（07-L5）、JS 与 Go 对身份 client 模式的断言互相矛盾（05-F3）。修复时要连同测试一起改。
3. **身份与指纹跨轮一致性没有测试**，包括 session 稳定性、头与正文一致、`diagnostics`。现有回放工具都只用 API Key、单容器、loopback 上游。
4. **分组删除、保存后未同步、额度窗口边界、并发保存冲突、事件超时与死信这些场景都没有测试。**
5. **CI 漏跑。** 没有 workflow 跑 contracts、cli-mods、next/web；`ccgateway-images.yml` 在 PR 上不触发；部分测试依赖未入库的 `artifacts/`（干净检出时 billing oracle 静默跳过）。

## 7. 建议的修复顺序

1. **发布前必须：** B1、B2（核心稀疏下发 identity，engine 剥离，按能力判断）→ 补 engine→CLI 信封端到端测试 → B3、B4 → B5。修完后用 07 的方法在隔离容器里对 v14 复测身份头一致性。
2. **线上热修：**
   - L1：前端改回 `schema_version: 1`，或干脆不发送。
   - L2：分组删除时清理孤立键，或校验时忽略已删除的分组。
   - L3 + L4：revision 不包含密文，只在凭据真实变更时重新加密；`not_synchronized` 改为 failover 并使用官方错误格式。
   - L6、L7：重置后改为乐观放行或立即复查；失败后短退避；有效期大于查询周期。
3. **身份/指纹：** L8–L10 → 07-L5 → 混合形态（07-L4）需产品决定。
4. **处理失效的策略字段：** 要么接到 build/direct 路径，要么正式下线并从 UI 移除。
5. **清理死代码与统一契约**（06 的 A2–A7），同时补齐 CI。

## 8. 未覆盖范围

- v14 身份映射未在容器实测（未推送，按规则不上传源码）。
- 交互式 TUI、桌面版、子代理、WebSearch、MCP 的回放。
- thinking 关闭的请求形态：2.1.304 的 `-p` 对 5.5 模型触发不出 `disabled`。
- 真实上游是否接受混合形态，以及 `cch` 的算法。
- 控制器 Python 在 Linux 上的完整测试；Linux 进程级 engine 用例。
- 多节点总线丢消息的实际频率。

## 9. 清理确认

- OVH 上本次创建的 `ccg-audit-*` 容器、网络、worktree、工作目录均已删除，复查为 0，生产容器运行时长不变。
- 仓库内所有临时测试文件均已删除，`git status` 中只新增本目录。
