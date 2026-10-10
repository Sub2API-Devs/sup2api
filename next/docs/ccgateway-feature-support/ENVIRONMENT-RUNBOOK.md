# CCGateway 环境与操作指南

> **2026-10-11 03:35（北京时间）线上版本，优先于下文：**
> - 核心 **v0.1.109**（源码 `77fb3013a`，manifest `75134fdd22cc…`），ccgateway 仍是 **0.1.36**，worker 没有变化。
> - **分组里没有能服务该端点的账号时，核心返回 404**（用户决定），错误体为 `{"type":"error","error":{"type":"not_found_error","message":"no account in this group serves this endpoint","code":"not_found"}}`，客户端不会重试。分组里有这类账号、只是全部被禁用、冷却或占满时，仍返回 529。只有 CCGateway 账号的分组调用 count_tokens 就属于前一种情况。
> - **本机 CC（2.1.292，opus-5-5，临时 key 33，已删除）复测通过**：
>   - WebSearch："你能使用websearch工具查询下北京的天气吗"，2 轮，24 秒，1 次搜索，回答带 6 个来源。
>   - 子代理："启动子代理 理解最近的 素材库功能 然后报告给我"，243 秒，子代理调用了 24 次工具，最后交回报告。
>   - 网关侧共 34 条记录：30 条 `/v1/messages` 全部 200，4 条 count_tokens 全部 404。每条 404 只出现一次，CC 没有重试，改用本地估算。
>   - 子代理各轮的缓存读取逐轮增长：25.5k → 29.2k → 35.3k → … → 122.9k。
> - 已知问题（与本次无关，已另开任务）：迁移 `0046_proxy_real_ip.sql` 不能重复执行，导致 HEAD 上 3 个迁移测试失败。
>
> **2026-10-11 02:45（北京时间）线上版本（count_tokens 返回 529 的部分已被上面替代）：**
> - 核心 **v0.1.108**（源码 `d6cf130ee`，manifest `96a620ccc0a0…`），ccgateway **0.1.36**。#21/#22/#23 的 worker 原地更新。这次升级一次完成，没有暂停。
> - **插件不再声明 count_tokens**（用户决定）。核心不会把计数请求调度到 CCGateway 账号，核心的托管传输也只放行 `/v1/messages`。分组里没有其他能计数的账号时，核心直接返回 529 `overloaded_error`（`no_available_account`），不会发到 worker。
>   - 线上验证：临时 key 32（已删）调用 count_tokens 返回 529，耗时 0.6 秒；用量记录里没有分配账号，两个 worker 的日志里也没有这条请求。同一个 key 调用 `/v1/messages` 返回 200。
>   - worker 透传入口的 400 "count_tokens is not supported by this gateway" 只作为兜底。
>
> **2026-10-11 02:10（北京时间）线上版本（count_tokens 部分已被上面替代）：**
> - 核心 **v0.1.107**（源码 `7ba179d03`，manifest `38355b0475c3…`），ccgateway **0.1.35**。#21/#22/#23 worker 原地更新，三个二进制 sha256 前缀都是 `85d3a6f118cbced2`。
> - **`thinking_disabled_compat=omit` 在透传下也生效**（用户决定）。CC 的会话标题请求（opus-5-5/fable-5-1 加 `thinking: disabled`）以前在透传下返回 400，现在返回 200。worker 日志里有 `thinking_disabled_omitted`，传给 CLI 的字段只有 `max_tokens`，上游请求不带 thinking。临时 key 30、31 已删除。
> - **升级时出过一次暂停**：所有从节点停止后，主节点的 maintenance 步骤报 "waiting for fresh follower observations"，计划变成 paused。原因是检查在第 4 个节点停止后 3 毫秒就运行了，有节点的心跳超过了 20 秒，是一次时序竞争。处理：先只读查询 `updater.nodes`，确认从节点心跳都在 1 秒内，再执行 `docker exec sup2api-1 sub2api-gateway resume -config /etc/sub2api/shell.json -id <计划 ID>`，计划随即 completed。暂停期间主节点仍是旧版本，从节点把请求转发给它，服务没有中断。
>
> **2026-10-11 01:05（北京时间）线上版本（只有 thinking 那条"待决定"已被上面替代）：**
> - 核心 **v0.1.106**（源码 `f2b067fa6`，manifest `72bdb1e8f9ba…`），ccgateway **0.1.34**。#21/#22/#23 worker 原地更新（三个二进制 sha256 前缀均为 `e96a6973c0094457`）。#20 已停用、没有容器，推送时显示 failed 属正常。
> - **key 14 的 502 已定位并修复**。worker 在上游已经返回 200 之后，又把结果改成 502 "native transcript missing completed response"，核心再按上游故障冷却账号。核心 WARN 日志和 worker 请求日志都能对上。两种情况：
>   - 带 `fallback-credit` beta 的请求（核心会加跟踪头）：CLI 不写会话记录，网关却去读。10-10 #22/#23 上 61 条这种 502 全是这一类。
>   - CC 启动时发的非流式 `max_tokens: 1` 探测：CLI 不记录空回答。
>   - 修复后这两种情况都原样返回上游的回答，只是这一轮不登记，下一轮按客户端历史重建。见 PASSTHROUGH-DESIGN §15 第 20 条。
>   - 线上验证：临时 key 29（已删）发 fable/opus 非流式 `max_tokens: 1` 都返回 200（`stop_reason: max_tokens`）；带 fallback-credit beta 的两轮流式请求都返回 200，worker 日志确认带了跟踪头。
> - **未处理，待用户决定**：key 14 的标题生成请求（"naming a coding session"，opus-5-5，`thinking: disabled`）在透传下返回上游原样的 400。控制台的 `thinking_disabled_compat=omit` 只对旧模式生效；按设计，透传不做这项转换。
>
> **2026-10-11 00:30（北京时间）线上版本（只有 count_tokens 部分仍然有效）：**
> - 核心 **v0.1.105**（源码 `ca619f802`，manifest `1f4dc9ed302d…`），ccgateway **0.1.33**。#21/#22/#23 worker 原地更新，容器 ID 不变。推送内置镜像时 #20 显示 failed：它在 10-03 已停用，没有容器，属正常。
> - **CCGateway 不支持 count_tokens**（用户决定）。透传模式下 `POST /v1/messages/count_tokens` 立即返回 400 `invalid_request_error`："count_tokens is not supported by this gateway"，不会发到上游；Claude Code 收到后在本地估算。特性目录 F-COUNT-TOKENS 标为"不支持"。
>   - manifest 仍声明这个端点。如果不声明，核心找不到路由，会返回 529，SDK 会反复重试。
>   - 旧模式下仍能计数（借 CLI 的鉴权转发客户端原始请求），删除旧代码时一起删除。
>   - 线上验证：临时 key（id 28，已删）调用两次都在 0.6 秒内返回 400，消息原样；同一个 key 的 `/v1/messages` 返回 200。
>
> **2026-10-10 23:50（北京时间）线上版本（只有 count_tokens 已被上面替代）：**
> - 核心 **v0.1.104**（源码 `f785d15c3`，manifest `d99810501197…`），ccgateway **0.1.32**。#21/#22/#23 worker 原地更新，容器 ID 不变；#20 已停用，没有容器。
> - **出站中继已全量切到透传**（23:02，`relay_mode=passthrough`，`relay_passthrough_accounts` 为空）。请求由内层 CLI 构造，中继不改请求和响应。设计与实测见 `PASSTHROUGH-DESIGN.md` 第 15 节。
>   - 切换后验证：#21（API Key 账号，用账号测试）、#22、#23 都走透传并返回 200。
>   - 回退：控制台 CC 特性把"出站中继模式"改回"适配"即可，worker 不用重启。旧代码保留到透传稳定后再删。
> - 同日先后发布、已被取代的版本：
>   - .100：透传 0.1.29；
>   - .101：0.1.30，解码 br/zstd 响应；
>   - .102：0.1.31，附件只用客户端、`caller: direct`、非流式 `max_tokens: 0`；
>   - .103：5xx 诊断日志（见下）。
> - **.104 / 0.1.32：worker 满载不再冷却账号一分钟**。
>   - 问题：worker 同时最多跑 4 个 CLI，账号的 `max_concurrency` 是 10。第 5 个并发请求收到 429 `Gateway concurrency limit reached`，核心按没有 `Retry-After` 的限流处理，冷却账号 60 秒。冷却期间请求没有可用账号，返回 529。
>   - 修复：现在带 `Retry-After: 1`，账号只暂停 1 秒，请求改派到其他账号。
>   - 线上没能直接复现：用户 1 自身的并发上限是 5，会先拦下请求。改为单元测试覆盖（`TestWorkerFullRetryAfter`、`TestFullWorkerPausesTheAccountBriefly`）。
> - **.103 起的诊断日志**：上游返回 5xx 时，核心写一条 WARN `gateway: upstream server error`（状态、`Server`、上游 `request-id`、响应体前 300 字节），用 `docker logs sup2api-N` 查看。原因是 key 14 的 502 没有任何一层留下记录，见下一条。
> - **待查：key 14 的 502**。
>   - key 14 的流量来自本机 127.0.0.1，很可能是同机 viptokens.net 转发的用户请求，上下文 10–23 万 token，并发高。
>   - 这批流量有约一半 502（`upstream server error (502)`，token 为 0）；旧模式下就有，10-09 18 点和 10-10 4 点更多，不是透传引入的。
>   - 已排除的来源：worker 请求日志里没有这些请求，caddy 没有 ccmax 站点的错误，controller 只会返回 503，核心隧道失败是连接错误而不是 502。
>   - 本机复现没有出现 502：同会话并发、3 路并行子代理、8.5 MB 和 11.3 MB 的图片请求都正常。
>   - 下一步：key 14 再出现 502 时，看 WARN 日志确认是谁返回的。
> - 测试用的临时配置已全部还原（分组 5、账号 23 的分组、用户 1 的分组），临时 key 24–26 和 OVH 上的 `/tmp/ccg_api.py` 已删除。

> **2026-10-10 16:00（北京时间）线上版本（已被上面替代）：**
> - 核心 **v0.1.99**（源码 `7fa0cb9df`，manifest `ac827a88a667…`），ccgateway **0.1.28**。#21/#22/#23 worker 原地更新，容器 ID 不变。
> - 同日先后发布、已被取代的版本：
>   - .97：PowerShell 与 Bash 超时设置；
>   - .98：Skill。
> - **CC 特性中的 `thinking_disabled_compat` 已在线上打开（`omit`）**，按用户要求。原因：用户本机经 cc-switch 把 claude-opus-5 改写成 claude-opus-5-5，分类器请求仍带 thinking disabled。
>   - 打开后实测：用户本机原提示词下 Agent 被批准，子代理经 SubagentHandback 交回报告；该时段用量日志 18 条全部 200，其中 claude-opus-5-5 的 5 条是分类器等请求。
>   - 要恢复默认，在控制台取消勾选即可。
> - 完整工具集场景（PowerShell、Skill、延迟工具与子代理同时出现）已通过：24 条请求全部 200。
> - **附件来源已改为全部取客户端**（17:00，用户要求"配置该怎么改就怎么改"）：`attachment_source=client`，去掉了字段覆盖和按类型覆盖。
>   - 原先是 `gateway` 加 `workingDirectory=client`，模型同时看到客户端目录和容器的 Linux、非 git 环境，两段顺序还不固定。
>   - 工具都在客户端执行，环境、日期、模型、会话上下文应以客户端为准。这也是代码默认值，上游看到的就是客户端发来的内容。
>   - 另一个好处：容器侧的 session_context 带账号池账号的邮箱，现在不会再进入对话。
>   - 改后用用户本机原提示词复测：上游每个请求只有一段客户端环境（win32、git 仓库、PowerShell），没有容器环境；27 条请求全部 200；回答里不再出现"环境变了"。

> **2026-10-10 14:25（北京时间）线上版本（已被上面替代）：**
> - 核心 **v0.1.97**（源码 `1b58e622c`，manifest `0184d432ad66…`），ccgateway **0.1.26**。#21/#22/#23 worker 原地更新，容器 ID 不变。
> - 同日先后发布、已被取代的版本：
>   - .94：Fable 周窗口改读 usage 应答 `limits[]`；safeguards 随内部 ToolSearch 轮发送。
>   - .95：子代理的 SubagentHandback。
>   - .96：agent teams 的 Agent。
> - 本机 CC 2.1.292 端到端测试暴露了四类 worker 拒绝，现在全部处理，详见 `SUBAGENT-DESIGN.md` 第 4 节。根源都是 auto 模式下的服务端审查 safeguards：
>   - 主线程首个请求；
>   - 子代理；
>   - teams 的 Agent；
>   - PowerShell，以及带超时设置的 Bash。
> - 新账号 #23（Max 20x，分组 6）已可调度。
> - `artifacts/subagent_e2e.py` 的 `TOOLS` 已加入 ToolSearch：客户端会延迟加载 Bash，缺了 ToolSearch 子代理就没有 shell。
> - `-p` 加后台子代理时会输出多条 result 事件，脚本取最后一条非空结果。

> **2026-10-10 06:20（北京时间）线上版本（已被上面替代）：**
> - 核心 **v0.1.93**（源码 `69e3e7009`，manifest `a210b1f067c9…`）；ccgateway **0.1.22**；控制器 `ccgateway-controller:0.1.22`，#21/#22 worker 原地更新为 `2f53ce05537a…`（容器 ID 未变）。同夜 .91（`97f7f25d…`，P1 + 粘性会话核心化 + P2 + 无账号 529）、.92（ccgateway 0.1.21）先后发布后被取代；.90 的发布包（P1 单独）从未导入。迁移 0047/0048 已应用，`sticky_rules_core_only` 约束在。发布前备份 `~/sup2api-managed/backups/pg-before-0.1.91-20261009T214500.dump`。
> - 本轮修复：资源检查对已还原会话上下文的误判（502）、请求级错误不再冷却账号（`X-Ccgateway-Error-Scope: request`）、Anthropic 格式无可用账号返回 529 overloaded_error；CLI 2.1.292 默认的 `context_management` clear_thinking keep all + 延迟工具不再 400；`--add-dir` 的 "Additional working directories" 随 workingDirectory 字段来源；CC 特性页恢复附件来源与 CC 特性目录。
> - 本机子代理端到端：`artifacts/subagent_e2e.py`（本机 CLI 2.1.292 在 new-api 目录直连 :3130，临时 key 用完即删）。22:01Z 起账号 22 的 5 小时窗口 100%（上游 429，重置 23:19:59Z），期间所有请求正确返回 529，属真实容量不足而非故障。
> - `/tmp/ccg_api.py`（OVH 上的管理员 API 小工具，从 `.env` 读引导管理员登录，不打印密钥）用后删除。

> **2026-10-10 03:10（北京时间）线上版本（已被上面替代）：**
> - 核心 **v0.1.88**（源码 `062dd8563`，manifest `4e0149cb2d92…`）；ccgateway **0.1.19**：会话改造 §53.12（客户端会话只看 `metadata.user_id`，上游只见哈希会话 U / 子代理 A'，客户端 metadata 不发上游，同会话分支同文件）、分类器 system 形状 502 修复、2.1.292 会话上下文合并的另两种形态（数组 tool_result 追加、tool_result 回合末尾追加；子代理之后的回合曾 502）。控制器 `ccgateway-controller:0.1.19`，#21/#22 worker 原地更新为 `6a8c26b05b79…`（容器 ID 未变）。中间版本 .86/.87 同夜发布后被取代；三次核心升级各约 9–10 秒 503。
> - **P0 隔离加固已上线（CONTRACTS §54）**：外壳镜像 `sup2api-gateway:local` = `062dd85`（`1fb3138968bd`，旧的保留为 `sup2api-gateway:pre-p0` = d917b8c），03:00 起 2→3→4→1 逐节点换，每节点约 9.4 秒；节点容器 `no-new-privileges` + `cap_drop: ALL`；管理 socket 需令牌（无/错令牌 401）。Redis（仍是 `redis:7`，`~/sup2api/.env` 加了 `CACHE_IMAGE=redis:7` 以免切 Valkey）已 `requirepass`，密码 `REDIS_PASSWORD` 在 `~/sup2api/.env` 与 `~/sup2api-managed/.env`，03:07 用 `deploy/single/compose.yml` 重建固化（实时状态清空一次）。改动前备份 `~/sup2api-managed/backups/p0-20261009T185948/`。清掉了 Redis 里 10-01 遗留的 3 个 `redis-cli monitor` 连接。
> - 仓库 `deploy/gateway/ovh/roll-gateway.py` 假定容器名 `sup2api-managed-sup2api-N-1`，与线上 `sup2api-N` 不符，**不能直接用**；本次按"重标 `:local` → `docker compose up -d --no-deps sup2api-N`、等节点 ready/local/新 shell boot/入口 401"逐个替换。
> - `updater.nodes.last_seen` 只在节点状态变化时写，几分钟不变是正常的；活性看 Redis。

> **2026-10-09 21:00（北京时间）线上版本（已被上面替代）：**
> - OVH 外壳镜像 `sup2api-gateway:local` = `sup2api-gateway:d917b8c`（插件包上限 1 GiB、节点间拉包 30 分钟；20:47 起逐节点换，4→3→2→1，每节点约 10 秒）。
> - 核心 v0.1.85（manifest `12d3a79e0b4d…`，源码 `bb10f0407`，21:37 设置页精简 §53.11；之前 v0.1.84 `8d34abdc9cec…`）；ccgateway 插件 0.1.16，包内带四个运行环境镜像（约 425 MB）。v0.1.83（`6f5a6b72…`）因核心与打包工具对 `images.json` 的 `file` 字段格式不一致而认不出包内镜像，已被 .84 取代。
> - 控制器 `ccgateway-controller:0.1.16`、#21/#22 worker = `ccgateway-app:0.1.16` 的程序（`06d0f4f0…`），由"推送并启用内置镜像"完成：控制器自升级、worker 原地替换（容器 ID 不变）、出口代理容器未动。配置里的镜像覆盖值已清空，今后插件升级带来的新镜像自动生效。
> - **核心发布**：`~/sup2api-managed/build-core.sh VERSION`（已加入：按插件版本缓存在 `~/sup2api-managed/ccgateway-images/<版本>/`，缺失时先跑 `build-ccgateway-images.sh`，再以 `REQUIRE_CCGATEWAY_IMAGES=1` 构建；原脚本备份 `build-core.sh.bak-20261009`）→ `sub2api-shell import` → `upgrade_observe.py`。改了 companions（worker/controller/egress）必须升 ccgateway 插件版本，否则复用旧缓存镜像。升级后在部署页点"推送并启用内置镜像"。
>
> **2026-10-09 18:43（北京时间）起：账号运行环境已从 cc-max 迁到 OVH 本机 Docker，优先于下文所有 cc-max 描述：**
> - OVH 上 `ccg-controller`（`ccg-controller:0.1.49`，host 网络，只听 127.0.0.1:8787，运行目录 `/opt/ccgateway-runtime`、环境文件 `/opt/ccgateway-runtime.env`，均 root 0700/0600）。**控制器端点 `https://ccmax.prophey.ai`**（19:45 起）：DNS 在 Cloudflare（仅 DNS，不走代理）A 记录 → `15.204.107.38`；由本机共用的 `caddy` 容器（`/home/debian/caddy/Caddyfile`，host 网络，管 80/443 上的其他站点）新增站点 `ccmax.prophey.ai { reverse_proxy 127.0.0.1:8787 { flush_interval -1 } }`，Let's Encrypt 自动证书；核心配置 `mode: controller`、`ccmax.prophey.ai:443`、不固定证书（系统根证书）。原先的 `ccg-gateway`（18443，Caddy 内置 CA）已删除。注意：OVH 主机的 systemd-resolved 会缓存否定应答，新域名在生效前被查询过时要 `sudo resolvectl flush-caches`，否则核心容器解析不到（19:41 因此回切过一次，约 1 分钟不可用）。
> - #21（`ccg-21-app/-egress`）、#22（`ccg-d1d2964e14bf728d9-app/-egress`）按原配置 1:1 在 OVH 重建：同名、同镜像 ID、同环境变量、同私网 IP 与子网、同标签/挂载/资源限制；容器可写层（换过的 worker `ddd30dd1…`、更新过的 Claude CLI 2.1.292 等）按 overlay upperdir 逐字节搬运并核对属主/权限/内容哈希；数据卷与 `/opt/ccgateway-runtime/<key>`（state、sing-box 代理配置、防火墙规则）同样搬运核对。出口代理不变：#21 `216.173.82.161`，#22 `47.147.29.235`（迁移后在容器内实测）。#20（已禁用）只迁了数据卷与目录，没有建容器（旧网络 172.18.0.0/16 与 OVH 冲突）；重新启用时控制器会按新地址池新建。
> - 19:00 已清理 cc-max 上的账号容器、控制器、Caddy、账号网络、数据卷、`/opt/ccgateway-runtime*`、`/opt/ccgateway-gateway`，**不再有回滚到 cc-max 的路径**。迁移时刻的完整备份（三个账号数据卷、#21/#22 容器可写层、运行目录、环境文件，含凭据）在 OVH `/opt/ccgateway-backups/ccmax-runtime-20261009.tar.gz`（root 0600，约 400 MB）。21:15 cc-max 上其余遗留（测试容器 `ccgateway-worker-test`、全部镜像与构建缓存、`/opt/ccg*`、`/root/ccgateway-*`、`/root/sup2api` 等）也已全部清理，cc-max 不再承载任何 sup2api / CCGateway 内容（只保留 Docker 本身）。
>
> **2026-10-09 18:10（北京时间）现状（部分已被上面替代）：**
> - Core `v0.1.82`（源码 `4d5c666ca`，manifest `91b20df66c49…`）四节点 primary-first 升级完成；插件版本不变（ccgateway 0.1.15 等）。
> - CCGateway 已切到**控制面板模式**（CONTRACTS §53）：配置 `mode: controller`，`130.94.122.254:443`，**不再保存 SSH 凭据**；cc-max 上 `ccg-gateway`（caddy:2-alpine，host 网络，监听 *:443，Caddy 内置 CA 证书，核心固定信任其根证书）反代到 `ccg-controller`（`ccg-controller:0.1.49`，仍只听 127.0.0.1:8787）。账号模型流量经控制器 `ccg-tunnel` 隧道到账号容器。
> - #21/#22 **未重建**：切换控制器时容器身份与启动时间完全不变；随后用 §53.7 原地更新把容器内 `/usr/local/bin/ccgateway` 从 `e2ab0ee3…`（.80）换成 `ccgateway-worker:0.1.81` 里的 worker（`ddd30dd1…`，含 Claude Code 2.1.292 tool_result 折叠修复），只重启了这两个容器，旧程序备份在 `/opt/ccgateway-runtime/<key>/worker-backups/`。新账号默认镜像 `ccgateway-worker:0.1.81`。
> - 以后更新 worker：部署页"上传镜像"（app）或"更新现有账号的 worker"，或 `POST /system/ccgateway/runtime/workers`；**不要**再用一次性 `update-account.sh`。改回 SSH 模式需重新填写 SSH 凭据。
> - OVH 托管栈只用 `/home/debian/sup2api-managed/compose.yml`（容器名 `sup2api-1..4`、`releases`，卷 `sup2api-managed_sup2api-N-data`）。**不要**在 `release-*/next/deploy/gateway/ovh` 下 `docker compose up`：那份 compose 的卷（`state-N`）、证书路径与线上不同，10-09 07:44 曾因此起了一套错卷的节点（发布服务器崩溃循环、节点不心跳），09:23 恢复原栈时全站 503 约 10 分钟。

本指南供接手 AI 直接定位环境和执行检查。2026-10-09 本轮实际执行了本机工具定位、两台服务器 SSH 只读检查、容器选定字段/程序哈希/健康状态及 Core 节点状态查询；没有读取凭据值、运行 OAuth 探针、调用模型、重启、写数据库或部署。下面测试、构建、更新和恢复命令是后续操作方法，不代表本轮执行结果。当前状态见 [HANDOFF](HANDOFF-2026-10-09.md)，代码结构见 [IMPLEMENTATION-GUIDE](IMPLEMENTATION-GUIDE.md)，未闭环范围见 [REMAINING-WORK](REMAINING-WORK.md)。

## 1. 本机入口

- Windows / PowerShell，仓库 `D:/projects/golang/sup2api`，产品代码在 `next/`，真实本地 Claude 测试项目为 `D:/projects/test`。
- 远端 `https://github.com/Sub2API-Devs/sup2api.git`，工作分支 `feat/next-platform`。共享工作区已有其他 AI 开发，本轮先观察到 `c6c8bf888` 并继续推进；**线上 Core 源码仍为 `1c35179527a7632f3ea06b9d9014d81854112956`**。最新开发HEAD以现场Git为准，不提交全部未跟踪文件。
- `go.exe`：`D:/mise/shims/go.exe`，本轮版本 `go1.27.0 windows/amd64`；Node：`D:/app/nodejs/node.exe`，`v24.20.0`。
- Python 用 `py -3`，本轮 `3.14.7`；启动器即使出现旧式启动器警告仍可工作。PATH 的 `python.exe` 是 Microsoft WindowsApps 别名，不用它跑脚本。
- 原生 CLI：`C:/Users/16790/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe`，本轮 `2.1.292`。`claude.ps1/.cmd` 是包装入口，Go 的 `CCG_REAL_CLI` 应指向原生 exe。
- Playwright 包：`C:/Users/16790/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`；现有视觉脚本直接引用此路径。用 `load_workspace_dependencies` 刷新运行时路径；浏览器使用已安装 Edge，具体 launch 参数以脚本为准。

```powershell
Set-Location D:/projects/golang/sup2api
git status --short
git rev-parse HEAD
git branch --show-current
Get-Command go,node,py,ssh,rg | Select-Object Name,Source
ssh -G ovh | Select-String '^(hostname|user|port|identityfile) '
ssh -G cc-max | Select-String '^(hostname|user|port|identityfile) '
```

本机 SSH 配置实际解析为 `ovh = debian@15.204.107.38:22`、`cc-max = root@130.94.122.254:22`，identity 为 `~/.ssh/id_rsa`。保留已有主机指纹验证；缺少别名/密钥时从本机可信 SSH 配置和用户安全会话恢复，不能关闭 `StrictHostKeyChecking` 或从文档推导私钥。

## 2. OVH：Core、插件和独立测试数据库

- Git 主仓库 `/home/debian/sup2api/src`；精确 `.78` clean detached 构建树 `/home/debian/sup2api/release-0.1.78`。
- 正式运行目录 `/home/debian/sup2api-managed`（0700），`compose.yml`、私有 `.env`（0600）、`config/sup2api-{1..4}.json`、`certs/`、`keys/`、`stage/`、`publish/` 在这里。
- 容器 `sup2api-1`、`sup2api-2`、`sup2api-3`、`sup2api-4`；宿主端口依次 `3130/3131/3132/3133 → 8080`，主节点为 1。容器内 `/etc/sub2api/shell.json` 挂对应节点配置，`/var/lib/sub2api` 是各节点独立持久卷。
- 公共平台入口 `http://15.204.107.38:3130/`；API 模型路径 `/v1/messages`，管理前缀 `/api/v1`。管理凭据优先经 SSH 回环使用。`https://ccgateway.internal` 是 Core 内部特殊 transport 标识，不是公网 URL。
- PostgreSQL `sup2api-pg-1`、Redis `sup2api-redis-1`、插件市场 `market` 和制品服务 `releases` 属于现有服务；不要拿生产 PG 跑 fixture、清理其他服务或启动 `deploy/single`。
- 隔离 Compose 在 `/home/debian/sub2api-next-test/testdb/docker-compose.yml`，项目 `sub2api-next-testdb`；PG `sub2api-next-testdb-pg-1`，`127.0.0.1:45432 → 5432`；Redis `sub2api-next-testdb-redis-1`，`127.0.0.1:36379 → 6379`。目录没有 `.env`，PG 密码由 Compose 的 `POSTGRES_PASSWORD` 配置；值须只在受控进程内读取。
- `.78` 发布日志 `/home/debian/sup2api-managed/upgrade-20261008T195114.log`；备份 `/home/debian/sup2api-managed/backups/core-0.1.78-20261008T194528Z`。数据库 dump、完整 inspect 和配置备份是私有恢复材料，不提交 Git。

SSH 登录后运行以下只读检查；生产 API 未认证 `401` 是正常保护，不代表模型能力已验收：

```sh
ssh ovh
for n in sup2api-1 sup2api-2 sup2api-3 sup2api-4; do
  docker inspect "$n" --format '{{.Name}}|{{.Config.Image}}|{{.State.Status}}'
  docker exec "$n" /var/lib/sub2api/current/bin/sub2api version
  docker exec "$n" sha256sum /var/lib/sub2api/current/bin/sub2api
done
for p in 3130 3131 3132 3133; do curl -s -o /dev/null -w "$p %{http_code}\n" "http://127.0.0.1:$p/api/v1/key/prices"; done
docker exec sup2api-pg-1 psql -U sup2api -d sup2api -AtF'|' -c 'select node_id,mode,ready,stopped from updater.nodes order by 1'
docker exec sup2api-1 sub2api-gateway status -config /etc/sub2api/shell.json | python3 -c 'import sys,json; d=json.load(sys.stdin)["data"]; print({"baseline":d["baseline"],"nodes":[{k:n.get(k) for k in ("node_id","mode","ready","stopped")} for n in d["nodes"]]})'
```

本轮四节点 `.78`、程序 SHA256 `872573c772bd97322fc076b006b34fcc732f47c5dd9aa8f3836ddb36d6d1a689`，local/ready=true/stopped=false，四入口 `401`。Docker 日志轮转为每文件 50m、5 个文件；必要时 `docker logs --since 10m --tail 100 sup2api-1` 私下检查，分享前脱敏。

## 3. cc-max：Controller 与保留原授权的账号容器

- Git 主仓库 `/root/sup2api`，Worker `.80` 构建树 `/root/ccgateway-features-609691490`，源码 `60969149045452a96e5f0b125c912ddf28f8eeba`。
- Runtime `/opt/ccgateway-runtime`（0700），Controller 私有文件 `/opt/ccgateway-runtime.env`（0600）；容器 `ccg-controller`，镜像 `ccg-controller:0.1.48`，host network，实际管理监听 **127.0.0.1:8787**，无管理 Key 的 `/health` 返回 `401`。
- #21：`ccg-21-app`，持久卷 `ccg-21-data` 挂 `/work`；#22：`ccg-d1d2964e14bf728d9-app`，卷 `ccg-d1d2964e14bf728d9-data`。相应 egress 容器为同前缀 `-egress`；每账号独立网络和代理。
- 两个 app 的镜像标签仍 `ccgateway:0.1.56`，实际 `/usr/local/bin/ccgateway` 为 `.80`，SHA256 `e2ab0ee3884ccbf725064f93e23dd48b6f55cdd5967dc8154627a825ea187f79`。普通重启保留原地程序，重建可能恢复旧镜像；不要删除/重建 #21/#22。
- 本地未来默认镜像 `ccgateway-worker:0.1.80`，镜像内程序是 `/usr/local/bin/worker`，构建参数不同，哈希不同。保存默认镜像配置不会自动替换已有账号；镜像推送仓库未闭环。
- Worker 内部监听 `8787`，宿主 Controller 的同端口与它们处于不同网络空间。Core 按 Controller 的带 revision 连接信息动态发现私网 IP，再经 SSH 直连；不要固定每账号 IP 或逐账号维护 permitopen。
- 现场还有 `ccgateway-worker-test`，宿主 `8788`，属于旧测试资源，不代表生产默认镜像。新隔离测试不要占用它或生产 `8787`。
- `/work/data/cache` 和 `/work/data/request-logs` 现场存在；授权/config 在 `/work` 持久卷内，勿读取或复制 OAuth 内容。账号管理 API 只提供日志开关/限额状态，日志正文留在容器文件；关闭会删除已有日志。
- 最新构建门禁/制品 `/opt/ccgateway-runtime/feature-validation-609691490`；原地更新备份 `/opt/ccgateway-runtime/manual-backups/20261009-609691490-21` 与 `...-22`，旧 `.79` 程序名 `ccgateway`。

```sh
ssh cc-max
for n in ccg-21-app ccg-d1d2964e14bf728d9-app; do
  docker inspect "$n" --format '{{.Name}}|{{.Id}}|{{.Config.Image}}|{{.State.Status}}|{{.HostConfig.NetworkMode}}'
  docker exec "$n" sha256sum /usr/local/bin/ccgateway
  docker exec "$n" node -e 'fetch("http://127.0.0.1:8787/health").then(async r=>console.log(r.status,await r.text()))'
done
docker inspect ccg-controller --format '{{.Name}}|{{.Config.Image}}|{{.State.Status}}'
```

原 `.56` 容器没有 curl，上面的 Node fetch 本轮可用。两 Worker `/health` 均 `200`、CLI `2.1.292`；不代表 OAuth/余额在线有效。Docker app 日志轮转为 20m×3；`docker logs --since 10m --tail 100 ccg-controller` 等输出也须先脱敏。**不要运行 `claude auth status`、profile、手工 refresh/清锁作为健康检查**，曾发生探针遗留 OAuth 锁。

查询具体请求先在平台用量找时间/账号/attempt，再到对应Worker列文件：`docker exec ccg-d1d2964e14bf728d9-app find /work/data/request-logs -maxdepth 2 -type f`（#21改容器名）。每请求目录内可有`events.jsonl`、`effective-config.json`、`mod-config.json`、`feature-decisions.json`、`history-native.jsonl`、`upstream-request-*.body`及响应；按实际文件和partial/truncated状态判断。正文用受控SSH私下读取，不把整个目录提交Git或回显到公开报告。Core管理`GET /api/v1/system/ccgateway/accounts/22/request-logs`只返回enabled/限额，不是日志下载接口。Worker目前无Core RID header直接联结，需时间/账号/上游ID/usage交叉核对。

## 4. 凭据与管理访问

平台 API Key、Core 管理 token、Controller 管理 Key、Worker 调用/管理 Key、上游 OAuth/API Key 是不同层。平台 Key 从用户当前安全会话取得，进程变量名 `SUP2API_API_KEY`；不能拿 bootstrap 管理 token 当模型 Key。不得把秘密值放命令参数、Git、报告、HAR/trace/storageState 或完整 inspect 输出。

Core 管理 token 可在 **OVH 内部**读取 `/home/debian/sup2api-managed/.env` 的 `SUB2API_BOOTSTRAP_ADMIN_EMAIL/PASSWORD` 后向 `http://127.0.0.1:3130/api/v1/auth/login` 登录；仅在内存保留返回 token，随后请求管理 API。参考已存在 [verify-ccgateway.py](../../deploy/gateway/ovh/verify-ccgateway.py) 的 `api` 和登录部分，**不要直接以 `--configure/--enable-plugin` 执行它来获取访问**，这些参数会写配置。如下模板只输出无秘密的摘要；失败只记状态码，不输出响应体：

```python
# 在 ovh 的 python3 中运行；不向终端输出 env/token/完整响应。
import json, pathlib, urllib.request, urllib.error
v = dict(x.split('=', 1) for x in pathlib.Path('/home/debian/sup2api-managed/.env').read_text().splitlines() if '=' in x)
def api(path, body=None, token=None):
    h = {'Content-Type': 'application/json'}
    if token: h['Authorization'] = 'Bearer ' + token
    q = urllib.request.Request('http://127.0.0.1:3130/api/v1' + path, headers=h,
        data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.urlopen(q, timeout=15) as r: return json.load(r)['data']
    except urllib.error.HTTPError as e: raise SystemExit('HTTP ' + str(e.code)) from None
token = api('/auth/login', {'email':v['SUB2API_BOOTSTRAP_ADMIN_EMAIL'], 'password':v['SUB2API_BOOTSTRAP_ADMIN_PASSWORD']})['access_token']
d = api('/system/ccgateway/runtime', token=token)
print({k:d.get(k) for k in ('up_to_date','controller_version')})
token = ''; v.clear()
```

Controller 管理凭据由 `/opt/ccgateway-runtime.env` 的可信配置在 cc-max 进程内读取，或由 Core 已保存加密配置使用；不要读取 OAuth。OVH 专用 SSH identity/known_hosts 在 `/home/debian/sup2api-managed/ccgateway/`，不要替换成本机通用 Key。UI 只读验收脚本 [cache-ttl-production-ui.mjs](implementation/evidence/cache-ttl-production-ui.mjs) 通过私有 stdin 接收内存 token、SSH loopback base 与已验收 usage 行；它限制 GET、401 即停，不保存会话。新会话没有平台 Key 时仍能继续离线/假上游验证，真实调用明确标未执行。

## 5. 隔离验证命令与跳过边界

以下 PowerShell 按需要选择，不是每次全部执行。`next/plugins/ccgateway/companions` 是共享 engine 模块，worker/contracts 各有独立 go.mod。`CCG_REAL_CLI` 只放在定向 CLI 测试作用域，全模块 race 先清掉它，避免意外扩大真实 CLI 范围。

```powershell
Remove-Item Env:CCG_REAL_CLI -ErrorAction SilentlyContinue
Push-Location next/plugins/ccgateway/companions
go test -count=1 ./engine
go vet ./engine
$env:CCG_REAL_CLI = 'C:/Users/16790/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe'
go test -count=1 -v ./engine -run 'TestRealCLI(DynamicMCPListingHistory|ForcedMixed.*|PinnedMCPDeferredSearch|HelperHistory.*|InlineInternalSearch)$'
Remove-Item Env:CCG_REAL_CLI
Pop-Location
Push-Location next/plugins/ccgateway/companions/contracts; go test -count=1 ./...; go vet ./...; Pop-Location
Push-Location next/plugins/ccgateway/companions/worker; go test -count=1 ./...; go vet ./...; Pop-Location
Push-Location next/plugins/ccgateway; go test -count=1 ./...; Pop-Location
Push-Location next/web; npm test; npm run typecheck; npm run build; Pop-Location
```

这些 CLI 用例用临时 HOME/USERPROFILE/CLAUDE_CONFIG_DIR、假 Key、回环假提供商，验证实际出站/续聊/冷导入/回退，不证明真实模型接受或账号资格。没有 `CCG_REAL_CLI` 时真实 CLI 测试 skip；必须看 `-v` 输出。Linux 门禁按改动用 `go test -race`，Windows race 需本机 C 工具链；缺少时记录未执行，不能把普通 test 当 race。不要自动重生成 `CCG_NATIVE_CATALOG_OUTPUT` 版本夹具。

本机嵌入 PG 曾缺 `global/pg_control`，未修复；用已存在 OVH 隔离 PG。先另开 PowerShell 前台隧道 `ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:45432:127.0.0.1:45432 ovh`（若本地占用，选择空闲本地端口并同步修改 DSN）。随后从可信 Docker 配置在 Python 内存取得测试密码并启动 Go，**不打印密码或 DSN**：

```python
# 从仓库根用 py -3 执行；先确认隧道连的是隔离 PG，不能换生产容器名。
import json, os, subprocess, urllib.parse
raw = subprocess.check_output(['ssh','ovh','docker','inspect','sub2api-next-testdb-pg-1'], text=True)
v = dict(x.split('=',1) for x in json.loads(raw)[0]['Config']['Env'] if '=' in x)
env = os.environ.copy(); env.pop('SUB2API_TESTPG', None)
env['TEST_DATABASE_URL'] = 'postgresql://postgres:' + urllib.parse.quote(v['POSTGRES_PASSWORD'], safe='') + '@127.0.0.1:45432/postgres?sslmode=disable'
subprocess.run(['go','test','-count=1','-v','./internal/usage','./internal/gateway','-run','CacheWriteEvidence|HelperCustody'], cwd='next/server', env=env, check=True)
```

需要 Core＋真实 CLI＋隔离上游完整隐藏历史时，在上述子进程 env 加原生 `CCG_REAL_CLI`，定向 `go test -count=1 -v ./internal/gateway -run 'TestHelperHistoryABC(Inline)?RealDBCLI$'`。测试会创建/删除隔离数据库及迁移模板，需 CREATEDB；这属于测试写入。`SUB2API_TESTPG=off` **仅在 TEST_DATABASE_URL 未设置时**跳过数据库测试；设置了 DSN 会优先使用它。仅 skip 的成功不能记作账务/PG通过。隧道结束按 Ctrl+C 关闭，不清理服务器旧资源。

真实平台 API/本地 Claude 用已保留的 [live_api_smoke.py](evidence/live_api_smoke.py)、[public_dynamic_mcp.py](evidence/public_dynamic_mcp.py)、[public_forced_mixed.py](evidence/public_forced_mixed.py)、[public_helper_budget.py](evidence/public_helper_budget.py)、[local_claude_smoke.py](evidence/local_claude_smoke.py)。这些命令会消费额度，先从安全会话将 Key 放进当前进程，不回显，测试选小量明确断言，先错即停：

```powershell
py -3 next/docs/ccgateway-feature-support/evidence/live_api_smoke.py --base http://15.204.107.38:3130 --only json --output artifacts/api-json.json
py -3 next/docs/ccgateway-feature-support/evidence/public_dynamic_mcp.py --base http://15.204.107.38:3130 --output artifacts/dynamic.json
py -3 next/docs/ccgateway-feature-support/evidence/public_forced_mixed.py --base http://15.204.107.38:3130 --output artifacts/forced.json
py -3 next/docs/ccgateway-feature-support/evidence/public_helper_budget.py --base http://15.204.107.38:3130 --inline --output artifacts/helper-inline.json
py -3 next/docs/ccgateway-feature-support/evidence/local_claude_smoke.py --cli C:/Users/16790/AppData/Roaming/npm/node_modules/@anthropic-ai/claude-code/bin/claude.exe --base http://15.204.107.38:3130 --project D:/projects/test --output artifacts/local-read.json
```

先确认 `artifacts` 输出目录存在；本地 Read 用例要求测试项目有 `pelican-bicycle.svg`。该脚本只对子进程设置 API 入口，禁用 setting sources/会话持久化，不改全局 Claude 配置；它不替代使用临时配置的隔离 engine 用例。公网分组请求不能保证覆盖 #21/#22，更不能证明强制 cold restart；须用管理侧 usage/attempt/account 与 Worker 日志核对。HTTP 200 refusal、tooltoo_many_requests、仅结构返回都不等于功能成功执行。

## 6. Git-only 构建、受控更新与恢复

正式发布顺序是本机审查/适当测试→提交/推送→服务器 Git fetch 精确 SHA→新 clean detached worktree→构建/签名/核哈希→备份/fresh preflight→正常 updater。禁止上传源码树/压缩包替代 Git，也不执行旧 `deploy/single`、旧滚动迁回 single 或自动重建已有账号。

OVH shell 模板，替换 VERSION/FULL_SHA 为经批准的实际值，不能重复占用 `.78`：

```sh
version=VERSION; sha=FULL_SHA; repo=/home/debian/sup2api/src
git -C "$repo" fetch origin "$sha"
git -C "$repo" worktree add --detach "/home/debian/sup2api/release-$version" "$sha"
cd "/home/debian/sup2api/release-$version"
test "$(git rev-parse HEAD)" = "$sha" && test -z "$(git status --porcelain --untracked-files=all)"
sh next/deploy/gateway/ovh/prepare-core-release.sh "$version" "$sha"
```

[prepare-core-release.sh](../../deploy/gateway/ovh/prepare-core-release.sh) 仅准备制品，要求既有签名钥/相同 trust/一致在线基线；2 CPU/4 GiB cgroup 限额，不导入、不创建升级计划。核 builtin 同版本包不可变、签名/TLS/schema、备份恢复列表后，取 `publish/vVERSION.digests` 的 manifest_digest，以主节点 `sub2api-gateway import -config /etc/sub2api/shell.json -manifest https://releases/sup2api/DIGEST.json` 导入。再在控制台正常 preflight 创建计划，或使用已核服务器 `/home/debian/sup2api-managed/upgrade_observe.py DIGEST`，**不传 fault/follower 参数**。服务端 `CONTAINER={n:n for n in PORTS}` 已修；仓库旧 observer 映射仍旧，不能直接覆盖服务端。`.78` 实测维护 503 窗口 37.87s，不是零中断。

Worker 在 cc-max `/root/sup2api` 同样 Git fetch 精确 SHA、新建 detached tree；镜像构建上下文必须 `next/plugins/ccgateway/companions`：`docker build --build-arg WORKER_VERSION=VERSION --build-arg SOURCE_REVISION=FULL_SHA -f next/plugins/ccgateway/companions/worker/Dockerfile -t ccgateway-worker:VERSION next/plugins/ccgateway/companions`。先在独立资源配额的门禁容器验证 engine/contracts/worker、真实 CLI 假上游及新镜像 health/features；镜像构建本身的资源限制按当前 host BuildKit/cgroup 条件核验后再运行，不靠默认无限资源。不要将 `CCG_REAL_CLI` 注入整个 race 容器。源码 SHA、standalone 与镜像程序哈希分别记录。

账号程序原地更新依次 #22→#21，保留 ID/卷/config/凭据：确认无活动 CLI→保存旧程序及私有元数据→新程序复制到同目录唯一临时文件→校验批准哈希/0755→再次确认无活动 CLI→原子 mv→仅重启原容器→health/features/ID/卷核对→逐账号实际功能验收。服务器已有 `feature-validation-609691490/update-account.sh` 是已完成 `.79→.80` 的一次性脚本，旧哈希和备份目录写死，**不要重跑**。保存默认镜像与更新现有账号是两件操作；runtime/install是另一个安装入口，不能用它代替保留容器的程序补丁流程，执行前应核当前重建/安装边界。

Core 失败恢复先只读 `status`，按原因选择正常状态机的 pause、resume 或 rollback；例如满足回滚条件时运行 `docker exec sup2api-1 sub2api-gateway rollback -config /etc/sub2api/shell.json -id UPGRADE_ID`，暂停/继续则分别将动作改为 `pause`/`resume`。rollback 仅限数据库/协议契约一致、插件兼容且旧签名制品存在；跨 schema 需独立备份恢复方案，不能猜测执行 SQL 向下迁移。本轮未验证 `.78` 实际回滚。

Worker 恢复在确认无活动 CLI 后，对目标账号选择相应 `...-21/ccgateway` 或 `...-22/ccgateway`，旧 SHA256 必须 `0c44e181c3e60257e3f0668144139dc471529f859148f6f1aa8136b56e897231`。用 `docker cp OLD_BACKUP CONTAINER:/usr/local/bin/ccgateway.restore-UNIQUE`、容器内 `chmod 755`/`sha256sum`、再次查活动 CLI、同目录 `mv` 原子恢复，再 `docker restart -t 30 CONTAINER`；重复健康/身份/历史/实际工具验证。恢复前还需核新历史与旧能力/policy 兼容，不能只恢复程序就宣称恢复完成。
