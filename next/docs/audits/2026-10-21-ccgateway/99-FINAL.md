# CCGateway 审核 · 三方交叉核验后的最终结果（2026-10-21）

## 来源与方法

- **M**：主控审核，即 [00-SUMMARY](00-SUMMARY.md) 与分报告 01–07。
- **A**：另一 AI 的报告（`Downloads/1 - 副本.txt`）。
- **B**：另一 AI 的报告（`Downloads/1.txt`，完整版及复现材料在 `artifacts/ccgateway-audit-20261021/`）。

由 4 个核验员逐条对照 HEAD `43d576838` 源码判定，并用 `git show 9dfcb60b9` 区分线上是否已有：

- [10-verify-identity](10-verify-identity.md)：身份与 CLI；
- [11-verify-config](11-verify-config.md)：配置、前端与生命周期；
- [12-verify-path](12-verify-path.md)：链路、额度与控制器；
- [13-verify-tests](13-verify-tests.md)：测试、CI 与规范。

核验过程中新写了 PG 测试、vitest、node 和 Go 复现，临时文件已全部删除。

严重度以核验员修正后的为准。"线上"指 0.1.70（源码 `9dfcb60b9`）已经存在的问题；"HEAD"指只存在于两个未推送提交（`08035b19c` 身份映射 v14、`43d576838` 卷配额）中的问题。

## 1. 发布阻断：未推送的两个提交修好前不能推送或部署

| ID | 级别 | 问题 | 关键证据 | 谁报了 |
|---|---|---|---|---|
| R1 | **P0** | 核心总是下发 `request_identity_sources.user_id=replace`，engine 把它放进 build 信封，CLI 白名单只认 3 个键 → **所有 build 请求 HTTP 400** `Unknown request policy key`，零上游调用（线上默认就是 build） | `server/internal/ccgateway/feature_policy.go:188`；`engine/request_command.go:272-274`；`cli-mods/request-policy.js:17` | M、B（B 定 P1 偏低）；**A 漏报** |
| R2 | P1 | 同一根因：engine 分不清"核心填的默认值"与"显式配置"，而且这个判断在模式分支之前 → 新 Worker 配 v12 CLI 时 **build 和 direct 都 409**；核心能力预检也不查身份能力 | `request_command.go:209-216`；`runtime_features.go:25-45` | M；A、B 漏报 |
| R3 | P2 | 卷配额：在 ext4 等不支持配额的存储上，新建和**重新授权**都 503 | `controller/manager.py:358-386,660` | M |
| R4 | P2 | `package-release.cjs` 只认 v12，补丁器输出 v14；`worker/Dockerfile` 只复制被 gitignore 的 release 目录，只检查存在、不校验 SHA、不编译 → 重建镜像拿不到新 CLI | `cli-mods/package-release.cjs:7`；`worker/Dockerfile:32-33` | 三方 |
| R5 | P2 | 身份映射密钥 = SHA-256(公开常量＋邮箱)，上游知道邮箱即可推出密钥，进而反查或跨账号关联 | `engine/request_identity.go:48` | M、A；B 漏报 |
| R6 | P2 | build 选 client 来源，或客户端没带身份时，Worker 不把身份上下文传给 CLI → 发出 Worker 原生 user_id，客户端的其他 metadata 字段丢失。线上 v12 本来就这样，但 v14 提交说明声称已修 | `request_command.go:218,333`；`cli-mods/request-parameters.js:13` | M、B；**A 说反**（A 称"无身份时删除 metadata"，该分支实际走不到） |
| R7 | P2/P3 | direct 下身份仍生效但界面隐藏（P2）；全局 PUT 省略 identity 会把已存值重置为 replace（P3）；前端不校验 identity（P3）；核心与前端都没有任何身份字段测试 | `RequestPolicySettings.vue:161-199`；`config.go:359-380` | M、B |

**修复要点：**
1. 核心只在显式配置时下发 identity，与 attachment/billing 一样做稀疏化。
2. engine 组 CLI 信封前剥离 Identity，或让 CLI 合同正式接受该键。
3. 409 按能力判断，不按值判断。
4. 密钥改为每账号随机持久密钥，或 HMAC(admin_key, …)。
5. 补 engine→真实 cli-mods 信封的端到端测试。
6. 修完后用 [07](07-live-replay.md) 的隔离容器方法复测 v14（会话 ID 跨轮稳定、请求头与正文一致）。

## 2. 线上现存问题

### P1

| ID | 问题 | 关键证据 | 谁报了 |
|---|---|---|---|
| P1-1 | **全局 CC 策略在界面上保存不了。** 前端写 `schema_version:2`，核心只收 1 → 400，同页的网络、连接、镜像改动一起丢失（PG 复现；改成 1 即 200） | `web/src/views/ccgateway/RequestPolicySettings.vue:50,58`；`contracts/features/runtime.go:135` | M、A；B 漏报 |
| P1-2 | **任何带凭据的保存都会打断服务。** `creds.go:306` 无条件重新加密（随机 nonce），revision 拼了密文 hex → 明文相同的两次 PATCH 得到不同 revision（PG 复现），runtime 重新激活。期间核心返回 `409 {"error":"not_synchronized"}`：没有 `error.type`，分类器判为 RETURN_TO_CLIENT，**不切换到健康账号**，客户端看到非官方格式 409 | `accounts.go:135`；`AccountEditor.vue:549`；`client.go:261-263`；`plugins/ccgateway/internal/ccgateway/classify.go:144-147` | M；**A 认为 revision 设计"正确"，片面**；B 漏报 |
| P1-3 | **生命周期同步状态不会自愈。** 只有投递路径写状态；卡在 pending/failed 后额度刷新跳过该账号，30 分钟后快照 `quota_stale` → UNKNOWN，**OAuth 账号被硬拦截** | `account/lifecycle_events.go:90-139`；`ccgateway/accounts.go:328-334`；`account/quota_refresh.go:43,265` | M（后果被低估）；A、B 漏报 |
| P1-4 | **额度窗口重置后拦截最长约 30 分钟。** 插件判"重置未确认"，核心复查下限 30 分钟，没有被动采样；单账号分组直接 503（实测 T+10m 到 T+29m 都是 `quota_reset_unconfirmed:5h`） | `availability.go:143-145`；`account/quota.go:40-46` | M；A、B 漏报 |
| P1-5 | **一次额度查询失败，账号 30 分钟不可调度。** `quota_refresh.go:85` 的指数退避恒等于 30 分钟，等于没生效 | `availability.go:123-126`；`quota_refresh.go:84-85` | M；A、B 漏报（视失败频率至少 P2） |
| P1-6 | **身份与会话（实测生产镜像）。** build 每轮生成新 `session_id`，同一会话在上游不连续；direct 把终端用户的 device_id/session_id 原样送到 OAuth 账号，`account_uuid:""`，而且与请求头会话 ID 不一致 | [07](07-live-replay.md) D1/D2 | M；A 误以为 v14 已解决（v14 只部分修复，且被 R1 阻断） |
| P1-7 | **OAuth 第一方 build 伪造 `diagnostics.previous_message_id`。** 重建的历史消息 ID 是 `msg_${uuid}`，v14 也没处理；原版 CLI 对这个字段有 400 错误分类，说明服务端会校验（真实上游是否校验无法判定，暂按 P1） | `cli-mods/request-input.js:155` | M |

### P2

- **配置**
  - 删除分组后，孤立的 `cc_feature_groups` 键会让 remote-config 整表保存 400，报错文案不提分组；不带这张表即可恢复（M）。
  - 4 个旧策略字段（`thinking_disabled_compat`、`tool_search`、`unknown_field`、`custom_tool_prefix`）在 build/direct 下不读，**线上开的 thinking omit 已失效**（M；A 漏报）。
  - 存储配置严格解码，版本回退时整层失效（M）。
  - 冲突后"重试"会用旧草稿覆盖他人改动（M）。
- **模型**
  - **编辑自动模型账号会提交 `model_mapping:{}`，清空映射**。`fillForm` 里 `applyDefaults` 重置了映射，违反 §59.5（**只有 B 发现**，线上数据丢失）。
  - "移除失败模型"假成功（M、B）。
  - 老账号 `auto_models` 为 NULL（迁移 0055 未回填），只改启停或优先级的 PATCH 都会覆盖自定义列表；A 引用的 `WHERE updated_at` 保护只作用于自动刷新（M）。
  - 自动模式下映射别名不可调度（M）。
  - 自动列表不随升级刷新（三方）。
- **链路**
  - 能力预检碰到 409 时报成"能力冲突"，路由留在缓存且不触发 Kick（M）。
  - **路由缓存键不含控制器地址/证书/密钥，漏收配置广播后会一直连旧控制器**（**只有 B 发现**）。
  - Worker 槽位写死 4，账号并发默认 10，超出的请求要先读完最多 32 MiB 请求体才拿到 429（M）。
  - 额度快照有效期等于查询周期，每轮都有一段空窗（M）。
- **生命周期**
  - purge 失败后不退回到停止容器（M）。
  - 插件卸载时批量删除不写删除意图，数据卷和 OAuth 凭据留在宿主机（M）。
- **隐私与安全**
  - 请求日志**默认开启**，明文保存完整 prompt 和工具结果：每请求 64 MiB，24 小时软上限 512 MiB（A 提出；核验发现是默认开启，不是 A 说的"开启后"；需产品决定）。
  - 直连出口不屏蔽宿主机自身公网 IP（核验补充）。
- **请求形态**
  - 客户端没发 system 时发出 `system: []`，字符串 system 被改成数组（M）。
  - `cc_version=worker` 用首个文本块算指纹，与原生算法不一致，测试 oracle 固化了这个偏差（M）。
  - API Key 路径 UA 为 `ccgateway-request`（M、A）。
  - `x-stainless-timeout: 3600`，官方为 600（M）。
  - 客户端会话 ID 经 Scratchpad 路径出现在环境文本中（HEAD 上 P2；线上无额外损失）。

### P3（摘要）

**A 提出、核验后降级：**
- C3 billing 歧义放行：设计如此，后果等同 client 来源。
- C4 save 重入：按钮已禁用，真实浏览器里点击和回车都提交不了。
- C5 egress 无 CPU 限制。
- C6 models/fetch 不查代理权限：CONTRACTS 明文允许。
- C7 mode/rewrite 缺防御性检查。
- C8 空或非标量 user_id。
- C9 自动更新线程会死：会打 traceback，线上也未启用。
- C10 `/healthz` 不鉴权：只在本账号私网可达。

**M 的条目：**
- Worker key 不匹配的 401 被判为凭据失效（实测判 DISABLE）。
- 请求日志在账号级锁内清理。
- 客户端取消也会清路由。
- 本地 503 错误被报成 400。
- `cli_version` 被固化。
- 缺 `claude-haiku-5-5`。
- Pro 请求 Fable 的 403 被当作凭据失效。
- xray DNS 截断应答丢 question 段（`xray-egress/service.py:81-82`）。

**其他：** controller key 等同宿主机 root，应写进文档。

## 3. 被判为不成立或需要改正的结论

| 来源 | 原结论 | 核验结果 |
|---|---|---|
| A | build 无原生组件残留，"无身份时删除 metadata" | **说反**：该分支走不到，实际发出原生 user_id（R6） |
| A | revision 包含凭据，改动必然下发，是正确的 | **片面**：未改变的凭据也会重新加密并触发重新激活（P1-2） |
| A | T2：缺策略头时退化为多轮 | **不成立**：请求模式缺头仍按 build 执行一次 |
| A | T1/T3/T6：缓冲非流式、跨模型重发、同会话并发 | 只在生产不可达的 native exchange 路径，按死代码处理 |
| A | T-8：取消和断连只有 1 个测试函数 | **不成立**：该函数下有 16 个子测试，另有 3 个以上相关测试 |
| A | engine `main.go`/`exchange` 是上帝函数，应重构 | 位置对，结论错：整段不可达，**应删除**；真正该拆的是 `serveRequestCommand`（`request_command.go:149-438`） |
| A | T-4：controller 三个文件不被 CI 收集 | 它们本来就是需要真实 Docker 的脚本，不是 unittest，问题只在命名 |
| A | C3/C4/C5/C9 定为 High | 均降为 P3（见上） |
| B | 预检 401/连接失败不清路由 | 部分成立：真实 `/healthz` 不鉴权，预检不会遇到 401（B 用假 Worker 复现，前提不符） |
| B | R1 定 P1 | 应为 P0 |
| B | 核心 4465 项"不包含审计用例" | 多出的 5 个是其他审核员临时放进去的 `TestZZAudit*` |
| M | 若干严重度偏高 | R6、本地 503→400、分组孤立键、haiku、Fable、日志锁各降一档；P1-3 的后果反而被低估 |
| M | contracts 的 gofmt 也不检查 | 小错：递归的 `gofmt -l .` 能覆盖到 |

## 4. 统一后的测试数字

| 套件 | 结果 |
|---|---|
| 核心 `server/internal/ccgateway`（真实 PG） | 142 个顶层 / 4460 项（含子测试），0 跳过 |
| 前端 `views/ccgateway` | 20 个文件 / 259 项（加上 `views/accounts` 共 387 项，即 B 的口径；前端全部 65 个文件 / 619 项；A 的 269 复现不出） |
| engine（companions） | 1790 项：通过 1489，**跳过 301**（其中 291 个由 `CCG_REAL_CLI` 门控，大多测的是已退役的 native 或探针路径） |
| 插件 / contracts / worker | 145 / 119 / 44（worker 跳过 1） |
| controller | Linux 163 项通过（B）；Windows 只能导入 43 项；测试受宿主环境变量 `CCG_DEFAULT_CLI_VERSION` 影响 |
| cli-mods | 116 项 |

**CI 缺口（已核实）：**
- `next/web` 不在任何 workflow 中。
- contracts 模块的 vet 和 test 从不运行。
- cli-mods 契约测试不在 CI。
- `ccgateway-images.yml` 在 PR 上不触发。

**测试把错误行为写成了断言：**
- 额度：`availability_test.go:92,124,125`、`TestQuotaNextCheckBounds`。
- billing 指纹 oracle。
- JS 与 Go 对身份 client 模式的断言相反。

最大的系统性缺口是**跨层合同没有测试**：R1、R2、P1-1 都是因为前端 mock 了接口、engine 信封从未经过真实 cli-mods 校验才漏掉的。

## 5. 三方准确度

| | 优点 | 问题 |
|---|---|---|
| M | 覆盖最全，所查条目全部成立；唯一做了生产镜像实测（身份与会话、伪造消息 ID） | 严重度普遍偏高一档；漏了 B 的两条（`model_mapping` 被清空、路由不随控制器变化）；P1-3 的后果被低估 |
| A | 独有若干有效小问题（egress CPU、自动更新线程、`/healthz`、请求日志隐私、controller key 文档）；C1 正确 | **漏报 P0（R1）和 P1（R2）**；R6 说反；"revision 正确"片面；多条落在死代码或被高估；测试数字错 |
| B | 实测扎实（87 项 build 失败直接证明 R1）；独有两条有效线上问题 | R1 定级偏低；漏了线上的 P1-1~P1-5；身份相关条目都只存在于未推送代码中却未标注；测试数字口径不清 |

## 6. 最终修复顺序

1. **发布阻断（推送前）：** R1+R2（核心稀疏下发＋engine 剥离＋按能力判断，补信封端到端测试）→ R4 → R3 → R5、R6、R7 → 用 07 的方法复测 v14。
2. **线上热修：**
   - P1-1：前端发 1，或不发送 schema_version。
   - P1-2：凭据明文不变就不重新加密；revision 不含密文；`not_synchronized` 改为 failover 并用官方错误格式。
   - P1-4/P1-5：重置后立即复查或乐观放行；失败后用真正的短退避；有效期大于查询周期。修复时同步改掉固化了错误行为的测试。
   - P1-3：60 秒对账时回写同步状态。
3. **数据正确性：** `model_mapping` 被清空、老账号模型列表被覆盖、移除失败模型假成功、分组孤立键、预检 409 与路由缓存键。
4. **身份与指纹：** P1-6、P1-7、`cc_version=worker` 指纹、`system: []`；混合指纹、UA、请求日志默认开启、宿主机公网 IP 需产品或安全决定。
5. **策略字段：** 4 个不生效的旧字段要么接到 build/direct，要么下线并从 UI 移除。
6. **工程：**
   - CI：`ccgateway-images` 加 PR 触发，加 `next/web` 检查，加 contracts，接入 cli-mods。
   - 跨层契约测试。
   - 删除 native exchange 链（约 274 个不可达函数）和旧入口、旧中继。
   - 契约统一到 `contracts/features`，`"2.1.304"` 改为按能力判断。
