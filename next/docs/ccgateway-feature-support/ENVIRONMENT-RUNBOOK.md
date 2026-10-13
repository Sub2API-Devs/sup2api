# CCGateway 环境与操作指南

> **2026-10-14 0.1.127 / CCGateway 0.1.47：不绑代理即直连（CONTRACTS §49.20）。** 起因：#21 绑定的代理 #6（`216.173.82.161:5505`）对带/不带凭据的 CONNECT 都回 407，Controller 连通性检查失败，运行环境停在 syncing，测试回 409 `not_synchronized`。用户要求代理可为空、为空直连。源码 `73e465ce3`（功能）+ `37e6b308b`（修复：直连时 DoH 不能写 detour，否则 sing-box 启动即退出，`sing-box check` 不报错）。0.1.126（manifest `60da2305…`，计划 `580d2210…`）上线后发现该问题，随即发布 0.1.127（manifest `81ad9cc1…`，计划 `942fdd66…`，27 步完成，约 40s 维护 503）。其余五个内置插件包与 0.1.125 逐字节一致；无 schema／外壳变更。部署页接口只推送 controller 角色，`ccg-controller` 现为 `ccgateway-controller:0.1.47`；app/egress 默认镜像与现有账号容器未替换。#21 改为 `proxy_id=null` 后同步 ready，egress 出口 IP 即宿主 `15.204.107.38`；`claude-sonnet-5-5`、`claude-opus-5-5` 账号测试 200，并已开启调度。升级前备份 `~/sup2api-managed/backups/direct-0.1.126/database.dump`（SHA-256 `5cbfecf2…`）。代理 #6 仍被停用账号 #20 引用，未删除。

> **2026-10-14（UTC+8）0.1.125 维护式升级已完成：** 用户要求“更新然后确认”，并在维护升级及 Worker 范围确认中选择“全部都升级”，本轮据此包含 #21–#26 六个现有 Worker，#23／#25 的先前排除不再适用于程序升级；仍不改变授权、账号状态或调度。四个托管外壳已用 `sup2api-gateway:0.1.125`，Core 四节点均为 `0.1.125`，六个内置插件均在四节点 active：CCGateway `0.1.45`、Anthropic `0.2.6`、OpenAI `0.3.5`、Gemini `0.2.5`、Moderation `0.1.7`、Volcengine `0.12.4`。
> - **执行与签名：** 使用下方已核验的同一 manifest／bundle，Core SHA-256 四节点均为 `5414a29a9a90110b2b2f3d33299036c025a6f49cc838ea8862cb23085ab35a19`。外壳先按 2→3→4→1 替换，每次旧 Core 恢复 ready/local 和入口 401 后才继续。线上 Compose 原先写死 local 镜像，候选仅把该项改为 `GATEWAY_IMAGE` 模板，复用原“除镜像外渲染配置一致”门禁；未放宽安全参数。之后导入签名发布，通过无 blockers 预检创建维护计划 `cc2a47f65bea55d7593824d3be86aa67`，27 步完成，error 为空。0053 已登记，checksum `896c876a878df1ccfc0e38758c4e39fbc20a111c51a01dcd3b4a35c66206c9f0`；四节点 schema 均为 `ab632807227d05b55f414c1b36127689f69b66696e23dc00a05380fbaea65f1a`，ready/local，页面 HTTP 200。
> - **全部现有 Worker：** #21／#22／#24／#25／#26 原地替换程序并重启原 app；#23 在停止状态备份并离线替换，未启动 app 或 egress。六份程序 SHA-256 均为 `140f86898e5d09204053fdf706acac3a4e0f4c5c3596d33d79f5ae50d7f12a39`；五个运行中 Worker 的 /health 与 /admin/features 通过，版本 `0.1.45`、源码 `fad78f9d23edb40f203c881fcf20afe799e54117`、仅 native 模式。#23 只确认离线程序／保留性，不冒称运行健康；#20 无 Worker 容器，未创建或启用。Controller／egress 本轮未替换或重启；账号容器镜像标签仍是原值，不能把程序更新说成镜像替换。
> - **保留性：** 14 个既有 CCGateway 容器的 ID、镜像、Config／HostConfig、挂载均与升级前一致，仅五个运行中 app 的 StartedAt 按预期变化；#23 保持 exited。六个 Worker 的实际 CLI 文件与授权文件摘要均保留，#26 CLI 仍为 2.1.296，其余运行中实例为 2.1.292。7 个账号的 status／schedulable／auto_disable／auto_disabled_until、加密凭据摘要、settings 摘要均一致；#22／#24 调度开启，#21／#25／#26 调度关闭，#20／#23 停用，未重新授权。
> - **配额与边界：** #22 已连续取得主动查询成功快照，正常约三分钟复查；观测窗口 5h 42%、共享 7d 89%，均 allowed。#24 查询返回 auth_rejected 并退避；#25／#26 保留未登录错误快照且调度关闭，没有为验证而启用或发送模型请求。#20／#23 不执行自动查询，#21 API key 类型不依赖订阅配额快照。Controller 对 #22／#24／#25／#26 为 ready，#21 仍为 pending（其 Worker 自身健康，调度关闭），不能声称所有账号都可推理。本轮未执行本地 CC 或生产模型验收。
> - **恢复与审计材料：** 新鲜数据库 dump 位于 `~/sup2api-managed/backups/quota-0.1.125/database.dump`，0600、17,824,530 字节、SHA-256 `e27c3250f5772915b0a9a839983a208a5ab2f7a80d99ce7708b87c41b20e04d6`。已在 network=none、无生产目录挂载的同版本临时 PostgreSQL 中完整恢复，并连续执行 0053 两次，7 个账号状态校验不变；临时容器已清理。未向生产库恢复数据，跨 schema／Host API 仍禁止自动旧基线恢复。外壳恢复材料在 `gateway-rollbacks/20261013T181045Z-7bdf202d/`。两组各五份旧 Worker 备份经摘要核验归档到对应 `worker-backups-before-quota-0.1.125/`，删除文件数为 0；Worker 基线／逐个结果／健康证据在 Controller 的 `/opt/ccgateway-runtime/quota-0.1.125-workers/`，并复制到管理节点私有备份目录的 `workers/`。管理节点备份根目录另存 core-proof、final-proof、restore-proof、计划结果及执行辅助脚本。

> **0.1.125 候选准备阶段（上线前历史记录）。** 用户确认本轮提交、推送并准备发布包，生产升级、数据库迁移与 Worker 更新须另行确认。配额功能提交 `fad78f9d23edb40f203c881fcf20afe799e54117`；最终发布源码 `f1a975717a68a759d61ad5ba459349a78af9e752`，均已推送 `origin/feat/next-platform`。通过 Git bundle 同步后，在 clean detached worktree `/home/debian/sup2api/release-0.1.125` 运行现有签名准备脚本，未导入升级计划。
> - **版本与范围：** Core／托管外壳 `0.1.125`，Host API `7`；CCGateway／Worker `0.1.45`、Anthropic `0.2.6`、OpenAI `0.3.5`、Gemini `0.2.5`、Moderation `0.1.7`、Volcengine `0.12.4`。初始 `0.1.124` 候选因 SDK 重编造成其他五个内置插件同版本不同制品而未采用；用户选择给这五个插件同步升版。旧候选保留但不导入、不覆盖。最终候选中的 CCGateway 0.1.45 包与初始候选逐字节一致，其同版本镜像缓存也复用原内容。
> - **签名制品：** manifest `238257b9705aea72631d9cfa5418d2d87c5a292866fc31013987c3d3b93ea9db`，bundle `68cae8bd3158ee2b657e3632830712b3e13179b4f3f42c6ba1421a4460136cc9`，Core SHA-256 `5414a29a9a90110b2b2f3d33299036c025a6f49cc838ea8862cb23085ab35a19`。制品在 `~/sup2api-managed/publish/sup2api/`，准备记录在 `stage/0.1.125/` 和 `publish/v0.1.125.digests`。使用已有 release 公钥核验 Ed25519 签名，并验证 manifest payload、完整 bundle、11 个包内文件、6 个内置插件签名和 CCGateway 镜像档案摘要／大小；builtin trust 与线上一致，未更换签名密钥。
> - **验证与补充修复：** 前一阶段 Core、SDK、CC 插件／engine／Worker／contracts 全包、vet、隔离 PostgreSQL 回归与相关 Linux race、Linux 构建、前端 40 项测试／类型检查／构建通过。本轮补跑新增宿主兼容门禁及五个升版插件的全包测试、vet；签名构建完成 Linux 发布编译。Volcengine 发现旧 Anthropic 用量覆盖遮蔽当前平台字段，已移除两份重复覆盖并改为继承，保留 delta input 覆盖／缺失跳过回归；不修改费率或计费公式。CCGateway 最低 Core `0.1.124`，Volcengine 最低 Core `0.1.125`。构建日志中 claude-oauth 的 publisher 拼写 warning 属于未打入该 release bundle 的市场包，不计为本轮内置插件变更。
> - **数据库与恢复边界：** 签名策略为 `maintenance`，新增 `0053_account_quota_refresh.sql`；schema-before `d3c81ba151c7e40831ee845f4b336b75ad419fc8cc3972baa3962f177361edac`，schema-after `ab632807227d05b55f414c1b36127689f69b66696e23dc00a05380fbaea65f1a`。旧托管外壳按其编译的 Host API 拒绝不匹配目标，上线前须确认并更新为支持 API 7 的外壳。跨 schema／Host API 不能使用自动 baseline recovery；生产执行前需要新鲜数据库备份、恢复验证、旧程序／插件保留和明确维护窗口，不能把已有备份或单元测试说成生产恢复演练完成。
> - **线上保持不变：** 准备结束后只读复核四个 Core 仍为 `0.1.123`，schema 均为上述 schema-before，外壳容器仍使用原 `sup2api-gateway:local`。未执行迁移、生产升级、账号授权、模型请求、Worker 更新或账号容器重建；未使用或更新 #23／#25。后续允许更新的 Worker 范围仍需用户单独确认，已有账号 CLI 不随镜像准备而改变。

> **2026-10-13 工具配置匹配与目录 API 发布验收：** 四个 Core 节点已更新为 **0.1.123**，CCGateway 插件与 #26／#22／#24 Worker 为 **0.1.44**。发布源码 `a6a3f40251574f2284b0ecdc008d99ffd97e57c1`，通过 Git bundle 同步并在 clean detached worktree 构建，未推送 origin。manifest `5a508fa0230f6c4b919fdf1ec1ffe7c56f2b58cd63acb3607f42e85852bfed16`；primary-first 计划 `8a41cea1d4433790b67e1d67b6c44666` completed，日志 `upgrade-20261013T071937.log`。四节点 Core SHA-256 均为 `5b4f604d9d05884ebd7685bd677894ff6f3167a0f3efaa6725de788f3c88caec`，其他五个 builtin、签名 trust 与数据库 schema 保持不变。
> - **新的匹配规则：** 工具名称与完整 input_schema（含参数说明、必填项和约束）用于选择同一套捕获配置，不合并不同工具的环境开关；顶层 description 由 Mod 按客户端原文覆盖，包括空字符串、空格、换行。新配置／白名单／声明组合在使用原生工具前以隔离回环探针验证并在该版本内存快照中缓存，不读取账号授权、不请求真实模型；不一致的原生定义在上游调用前回退 MCP，无法验证则失败。未修改客户端 schema，也不恢复生产模型 HTTP 中继。
> - **完整内存目录 API 已上线：** Worker `GET /admin/cli/catalog`，Core `GET /api/v1/system/ccgateway/cli/:id/catalog`，分别使用 Worker 管理鉴权和 settings:read。按 name 分组返回 variants 的完整 description／input_schema，不公开内部配置元数据。#26 为 **2.1.296**，#22／#24 为 **2.1.292**，均 ready、**30 个工具名／38 份定义**；GET 前后 synced_at 不变。新计数来自已调整的六配置采集，不与之前的独立八配置导出混称同一份目录。三个账号 auto_update=false、stable 不变。
> - **原地更新与保留性：** 三个 Worker 程序 SHA-256 均为 `5ead8fb3777a8a277d6d5a58f8105a0f0b27aab83f1ee344b475eb1c30e5ef5f`。14 个容器 ID、镜像、挂载、Config／HostConfig 摘要保留，仅三个目标 app 与 Controller 的启动时间因重启改变；没有重建容器。每个目标 Worker 更新前后，实际 CLI 文件及既有授权文件摘要保持不变。Controller 只原地替换 manager.py 并保留原文件。重启后首个 CLI 管理查询返回 503，随后三个账号查询均成功，未作额外配置变更。没有使用或更新 #23／#25，没有修改账号调度、授权、自动禁用规则或 CC 安装。
> - **本地 CC 实测通过：** Windows CC **2.1.296**、**claude-opus-5-5** 于 **07:29:17–07:29:58 UTC** 完成文本、Read 读取专用 fixture、图片颜色识别及一次真实 WebSearch。使用子进程临时配置和 SSH 回环通道，不改全局 CC 配置。临时 Key **42** 已撤销。使用记录 **3355–3361** 共七笔，全部由 **#22** 处理，均为 200、一次尝试、正常结算，anomalies 空；客户端无 API／协议／工具错误。搜索记录 **3360** 输入 21,093、输出 822，web_search_requests=1，实际缓存读写均 0、缓存证据 complete；主会话缓存正常。#24／#26 仅通过程序、保留性及目录管理验证，不声称完成模型验收；#26 原有 schedulable=false 保持不变。
> - **验证与恢复材料：** engine／Worker／contracts／插件回归与 vet、Linux engine／Worker race、Core CCGateway 全包、Controller 109 项及 Mod 测试通过；Windows 2.1.296、Linux 2.1.292 各六配置乘两种白名单，共 24 组真实 CLI 离线声明验证通过。签名构建及无网络、无账号挂载的非 root 新镜像门禁通过。数据库备份 `backups/pg-before-0.1.123.dump` 为 0600、18,609,986 字节，恢复列表通过；各账号 native-0.1.123 基线／程序更新报告／catalog.json、`controller-0.1.123/`、`native-0.1.123-key-42-acceptance.json` 留在私有 backups。#26／#22 原有各五份 Worker 备份已移至各自 `worker-backups-before-0.1.123` 保留，没有删除；新增备份仍在 worker-backups。备份不等于已执行生产回滚。

> **2026-10-13 12:25（UTC+8）#26 CC 实际升级验收：** 按用户要求，`f1751a0ae`／`32cf63a7f` 已推送 `origin/feat/next-platform`。通过登录后的 Core 管理 API，将 #26 临时设为 latest、保持自动更新关闭，调用 `POST /api/v1/system/ccgateway/cli/26 {"action":"update"}`；Controller 完成 **2.1.292 → 2.1.296** 原地安装，Worker 验证后完成同步，`update_state=complete`、目录 ready、30 个名称／36 个变体，同步时间 `2026-10-13T04:25:32.0447566Z`。实际 `claude --version` 一致。结束后已恢复 stable／auto_update=false。
> - **保留性与备份：** 14 个容器 ID、StartedAt、镜像、配置、挂载摘要均未变，本次连 Worker／容器重启也没有；#26 Worker SHA-256、实际 CLI 路径、已存在的授权文件 SHA-256 和 status／schedulable／auto_disabled_until 均未变。新 CLI SHA-256 为 `24972e3bc859fab2b46ed4c1e51f7d6130f06d3bd550811a114640de3370d0de`。Controller 内旧程序备份 `/opt/ccgateway-runtime/de509b30280535378/cli-backups/20261013T042529313823Z-a967e7b1d8b4` 已核 SHA-256、0600 权限和容器 ID 元数据；对应 `cli-account26-20261013T042527Z-{before,result,after}.json` 留在管理节点私有 backups。#22／#24 实测仍为 2.1.292；没有使用或更新 #23／#25。#26 原有调度关闭状态保留，没有推理／重新授权或生产回退操作。
> - **定义查阅与兼容测试：** 从已升级容器复制同一 SHA-256 的 CLI，在 network=none、uid 1000、无账号挂载的独立容器运行动态采集、原生 Read／描述差异 MCP 路由、Runtime Mod 交接及描述保真测试，全部通过。独立八配置导出为 30 个名称／39 个变体，文件 `/home/debian/sup2api/checks/cli26-catalog-20261013/out/claude-2.1.296.json`；Read 的 `file_path`、`offset`、`limit`、`pages`、`allow_large` schema 及完整描述已取得。八配置导出与 Worker 六配置内存目录覆盖不同，39 不能冒称 Worker 内存变体数，离线导出也不是直接读取 Worker 内存。
> - **查询 API 的现有边界：** Worker `GET /admin/cli` 需要管理密钥，Core `GET /api/v1/system/ccgateway/cli/:id` 需要登录和 settings:read；支持已安装／目录版本、状态、数量、检查／同步时间、更新策略及错误。POST check／sync／update 和 PUT 策略要求 settings:manage。当前接口**不返回完整 name／description／input_schema**，`/admin/features` 是静态能力契约而非动态工具定义；如需前端展示实际内存工具目录，需要新增只读快照查询和 Core 受权限保护的转发接口。

> **2026-10-13 CLI 目录同步发布：** 四个 Core 节点已为 **0.1.122**，CCGateway 插件及 #26／#22／#24 Worker 为 **0.1.43**。发布源码 `f1751a0ae7673d0854c9c2d8be6bc1239e52f885`，通过 Git bundle 同步后在 clean detached worktree 构建，未推送 origin。manifest `857cd19a071b70e00c81ef9a759b59cc1275464a385eaef658d9b26a44212bb4`；四节点 Core SHA-256 均为 `27101e7f0bd52956f1a281c997e0111adaca60088c83a1b716f1714b58286c8b`。primary-first 计划 `f207be42842258ba59cd0c438961ed46` completed，其他五个 builtin、签名 trust 和 schema 均保持不变。
> - **工具一致性与目录：** 名称、完整 schema、描述文本全部一致才保留原生名称；描述空格／换行及参数说明也参与匹配，不再宽松匹配 Bash／PowerShell 超时文案。工具目录只放内存，启动、每十分钟以及更新完成后共用同步锁；版本不变且目录有效不重采集。请求绑定不可变快照，既有 JSONL 不迁移。版本变化时补跑隔离的 Mod／工具交接兼容探针，失败不发布新目录。
> - **原地保留性：** 三个 Worker 程序 SHA-256 均为 `d250ee6c730f9cd6ab7ca2a2ca32a982b73b60b2688fb4ea9c4761a2415005fb`。14 个容器 ID、镜像、挂载及配置摘要保留，只重启三个目标 app 和原 Controller；Controller 通过备份后替换 `/app/manager.py`／`cli_updates.py` 原地更新，原镜像／环境版本标签未重写。没有重建账号容器、重新授权、修改调度／自动禁用规则，也未使用或更新 #23／#25。
> - **CC 本体与管理验证：** CC 仍为 **2.1.292**，CLI SHA-256 `a967e7b1d8b4e47ee421d5433027880347952b0c0857abf880e2c942a4ec93b3` 保持不变。三个内存目录均 ready，30 个名称／36 个定义变体；线上检查更新、人工同步及同版本跳过采集均通过。自动更新默认关闭、渠道 stable；本次查询 stable 返回 2.1.287，代码不会自动降级。未执行生产 CC 升版，真正安装／失败回退路径以隔离测试结果为证，不冒称生产安装验收。
> - **安装权限边界：** #22 实测 Worker 为 uid 1000，实际 CLI 位于 root 所有的 `/usr/local/lib/node_modules/@anthropic-ai/claude-code.features-78aa07448/bin/claude.exe`。因此由 Controller 校验官方 manifest 版本／平台／大小／SHA-256 后替换实际文件，保留私有旧程序及路径／版本元数据；Worker 的模型、授权、目录同步锁在安装验证和回退期间保持。不会开放推理进程原生自更新或改变遥测禁用策略。
> - **本地 CC 实测：** Windows CC **2.1.296**、模型 **claude-opus-5-5** 于 22:08:01–22:08:41 UTC 通过文本、Read、图片和一次原生 WebSearch。记录 **3283–3289** 全部由 **#22** 服务，均 200、一次尝试、正常结算；客户端无 API／工具／协议错误。搜索记录 **3288** 输入 21,228、输出 925、`web_search_requests=1`，实际缓存读写均 0，cache evidence complete、unclassified 0、anomalies 空。主会话缓存正常保留。临时 Key **41** 已撤销，未改全局本地 CC 配置。#24／#26 本轮仅通过版本、健康和管理验证；#26 原有 schedulable=false 保留，未声称其授权问题已修复。
> - **验证与恢复材料：** Core CCGateway 全包在独立测试 PostgreSQL 通过，测试库随后正常停止；engine／Worker／contracts 普通回归、vet、Linux engine／Worker race 通过。Windows 2.1.296 和断网无账号挂载的 Linux 2.1.292 动态采集、Mod 交接与 native／WebSearch 回归通过；Controller 初轮 107 项、最终相关 65 项通过；前端 195 项、typecheck、定向 ESLint 与发布构建通过。`backups/pg-before-0.1.122.dump` 为 0600、18,160,761 字节，恢复列表通过；`core-0.1.122-runtime-baseline.json`、各账号 `native-0.1.122*` 基线／更新报告、Controller `backups/controller-0.1.122/` 及 `upgrade-20261012T214822.log` 保留。保留备份不等于已完成跨版本自动回退演练。

> **2026-10-12 native-only 线上版本：** Core 四节点 **v0.1.121**，CCGateway / #26、#22、#24 Worker **0.1.42**。发布源码 `c9e54f6792fe785a61ba91fc8ed88833aa28ce41`；manifest `db6d286b8aa300518bfa6d0375c5b4660d16391ad061fe2689ae4f140e89e90e`；Core SHA-256 `1f66cf31c4cf9677097b9b5cfe868dfd60046c7a5d006973751d77b88497bf3f`。正常 primary-first 计划 `256977cc97d80da632ea1f5bc20138eb` completed，五个未升版 builtin、trust 与 schema 保持不变。
> - **当前分支已移除旧执行模式**：删除模型 HTTP relay、旧搜索插件及相关旧设置/专用测试；旧代码保存在 `archive/ccgateway-relay-0.1.41@4b0e0967c`。当前只声明 native，不在错误后自动切回旧实现。有效策略固定 native、去掉旧灰度与无效字段，其余管理员策略不变。
> - **原地更新与保留性**：三个目标程序 SHA-256 均为 `289797eed4b21a8b1a40730a44b526899e5ca35efe5c0a0f00655fc1499dba38`；CLI 仍为 **2.1.292** / `a967e7b1d8b4e47ee421d5433027880347952b0c0857abf880e2c942a4ec93b3`。14 个账号/控制器容器的 ID、镜像、挂载、安全设置和环境摘要均保留，只重启三个目标 app。#24 更新后的单条 Docker 复核命令曾失败；随后状态为 running、无 restart-loop，版本/哈希及全量保留性复核通过，没有重跑更新。未重建容器、未重新授权、未使用或更新 #23/#25。
> - **本地 CC 实测通过**：11:49:33–11:50:14 UTC，Windows CC **2.1.296** 使用 **claude-opus-5-5**，经用户批准的子进程临时配置与 SSH 回环通道完成文本、Read、图片和一次 WebSearch。测试脚本未写全局 CC 配置（末次只读复核时，全局入口已为 CCGateway）；两个本轮临时 Key（37/38）均已撤销。7 笔记录 **3078–3084** 全部由 **#22** 处理，均 200、一次尝试、正常结算；#24 通过运行版本/哈希门禁，本轮没有被调度到真实请求，不能声称其模型复验完成。
> - **搜索计量**：记录 **3083** 输入 **21,198**、输出 **1,068**，实际 `web_search_requests=1`，缓存读写均为真实 **0**；SSE cache evidence 为 complete，未分类 Token 为 0，anomalies 为空。CLI 返回真实搜索结果，无工具/API/协议错误。主会话记录 3082/3084 的缓存写入合计 **3,642**、读取 **2,178**，与本地 CLI 主会话一致；CLI 汇总不含隐藏搜索子请求，独立搜索用量不重复相加。
> - **#26 授权边界**：首个文本请求记录 **3074** 为 502、零用量、零费用。Mod v3 握手已成功；CLI 明确返回 `OAuth session expired and could not be refreshed`，`api_error_status=null`、`duration_api_ms=0`，没有伪造成上游 401 或触发插件停用。用户选择先用 #22/#24；复核时 #26 已经 schedulable=false，故没有再次 PATCH，保持 active 且无自动停用期限。#26 须恢复授权后另行验证，不宣称迁移修复了其授权问题。
> - **恢复材料与范围**：`backups/pg-before-0.1.121.dump` 为 0600、22,484,919 字节，恢复列表通过；Core/三个 Worker 的私有基线、更新报告、旧程序备份与 `upgrade-20261012T113123.log` 保留。旧制品和分支不是自动跨版本回滚证明。新增镜像在断网、无账号挂载的非 root 门禁中确认版本/CLI 哈希与仅 native 能力；本轮套接字采样未捕获活动连接，不将其作为新的生产 TLS 抓取证据。资源授权/OAuth 的隔离验收见下文，未进行生产 Files/Skills 上传或推定所有账号的资源资格。

## 0.1.120 历史部署记录

> **2026-10-12 14:24（北京时间）线上版本：** 核心 **v0.1.120**，CCGateway **0.1.41**，发布源码 `469f038ea63d87a7044627cf6f8f7257a4e0c687`。manifest `8ec1184b3aca7b721dbb07da718b79912446658c2bfe14509e025acf793444ac`；四节点程序 SHA-256 均为 `65f64c0c5b59ce183f9f7fa7901850a75af1693db74ac0f556af783ec252ce72`。primary-first 计划 `7cb118ca3a02bf63cc911d2c293396e1` completed；五个未升版 builtin 包、trust 和 schema 均保持不变。
> - **WebSearch 400 根因与修复**：本地 CC 的搜索子请求已使用 `tool_choice:auto`，旧 Worker 却改成强制 `tool`，被 Opus 5.5 拒绝。0.1.40 改用 auto，保留并行控制，移除强制关闭 thinking，处理 thinking／签名及未搜索、空结果、工具错误。显式 none／force 不再走快捷搜索，force 的 web_search 正确映射为 CLI WebSearch，不变成不存在的 MCP 工具。
> - **搜索专用缓存策略经用户确认**：0.1.119 的真实搜索暴露 CLI 事件缺口：起始缓存写入 2,793（全 1h），最终总数 18,380，却无最终 TTL 分项；assistant／result／modelUsage 也无法补齐，故严格拒绝而非推算。#26 临时原生无缓存探针成功后，用户确认采用；0.1.41 仅给一次性 native 搜索子进程设置官方 `DISABLE_PROMPT_CACHING=1`。主会话缓存保留，不清零上游实际用量、不按美元或请求 TTL 反推。若实际缓存数据仍不完整则请求级失败，不误冷却账号或换号重放。
> - **三个 native Worker 同步完成**：#26、#22、#24 均原地更新到 0.1.41，程序 SHA-256 `df53b0413fbfdffdbeb2a28310c4615c8e08edb87d0f991919d04be711d8535c`，CLI 仍为 2.1.292，CLI SHA-256 `a967e7b1d8b4e47ee421d5433027880347952b0c0857abf880e2c942a4ec93b3` 不变。14 个现存账号／控制器等容器身份、挂载、安全配置及环境摘要保留，仅三个目标 app 的程序及启动时间改变。首次只更新 #26 后，本地请求被调度到旧版 #22，再现旧 400；随后同步 #22/#24，未使用或更新 #23/#25，未重新授权或手工清除停用状态。
> - **本地 CC 搜索验收通过**：06:16:20–06:16:40 UTC，本机 CC **2.1.296** 经既有 CCGateway 配置请求 `claude-opus-5-5`，仅调用一次 WebSearch，真实结果非空，无工具/API/协议错误。网关记录 **2896、2897、2898** 均由 #22 处理，均为 200、一次尝试，分别为发起搜索、搜索子请求和最终回答，没有兼容性 400 重发。搜索记录 **2897**：输入 **12,558**、输出 **914**，缓存读写均 **0**，`metrics.web_search_requests=1`，`cache_write_evidence.completeness=complete`、未分类 Token 为 0、anomalies 为空，按既有价格正常结算。主会话两笔累计缓存读取 **8,800**、写入 **1,179**，与本地 CLI 主会话统计一致。CLI 最终汇总不含隐藏搜索子请求，搜索计量以网关独立记录为准，不重复叠加。
> - **文本／Read／图片复验通过**：06:20:03–06:20:21 UTC，记录 2899（#26，文本）、2900/2901（#22，Read 两轮）、2902（#26，图片）均为 200、一次尝试、正常结算；模型均为 Opus 5.5。本地证据保存在既有临时探针目录：`result-search-f863259d.json`、`result-text-f1c57c21.json`、`result-read-8e701b3c.json`、`result-image-f156bf9a.json`。
> - **出站证据与范围**：该次搜索观察到 #22 的 `claude:170`、`claude:199` 持有 443 连接，未观察到 Worker 持有 443；未捕获载荷。采样有部分进程权限受限，不能把它夸大为完整进程审计。运行二进制与通过无中继测试的源码一致；native 账号仍为 `[22,24,26]`，全局仍是 passthrough，保留 legacy/relay 兼容分支，不宣称已物理删除全部中继代码。
> - **策略及回滚材料**：最终 #22/#24/#26 均 active 且无自动停用期限，#23 disabled、#25 不可调度；管理员 401／关键词禁用规则及 native 策略与发布前一致。备份 `backups/pg-before-0.1.120.dump` 为 0600、24,794,795 字节，恢复列表检查通过；`backups/core-0.1.120-runtime-baseline.json`、各账号 `native-0.1.120*baseline.json`／`*worker-update.json` 及控制器旧程序备份保留。升级日志 `upgrade-20261012T061016.log`。这些是保留的回滚材料，不是跨版本自动回滚演练证明。
> - **验证**：engine、worker、ccgateway 包测试及 engine vet 通过；Windows CLI 2.1.296 与断网隔离 Linux CLI 2.1.292 的 `TestNativeWebSearch|TestRealCLINativeWebSearch` 通过，覆盖实际出站 auto、并行控制、无缓存搜索／主会话仍缓存、thinking／签名、错误与计量；完整缓存事实即使非零也保留，不伪造 0。复现真实 stale TTL 事件并验证请求级错误作用域。0.1.41 镜像断网 health/features 门禁通过。未改数据库代码，不声称本轮执行全套 race 或三数据库矩阵。

## native-only 发布前离线验收（2026-10-12）

- 以下为 0.1.42 发布前完成的离线验收；当前线上版本与真实验证结果见本文开头。旧实现保存在 `archive/ccgateway-relay-0.1.41@4b0e0967c`。工作树删除模型 HTTP relay、旧搜索插件、旧模式开关与已确认的专用测试，不以设置为关闭来保留旧执行模式；资源管理 HTTP、代理和 Mod 回调保留。
- `clear_at:next_user_message` 的内部 ToolSearch/WebSearch 续轮已改为：模型调用前暂停，核验自有附件 UUID 与原生结果，清除临时指令后同模型 resume 一次。只提交真实工具结果后缀；不重放搜索、首轮 tool_choice、同名正文或累计用量。Mod `ccgateway-v3` 在输入前确认，旧协议拒绝。Windows CLI 2.1.296 与 Linux CLI 2.1.292 均通过 15 场景/81 次生命周期请求和 5 个取消/失败场景。
- 最新 Linux 隔离门禁 56 个顶层测试通过、零跳过，覆盖 native 主路径/恢复、搜索/严格计量、clear_at 生命周期、文件引用、Files/Skills 管理 HTTP、身份/取消/字节保真、Mod 协议及 credit+搜索前置拒绝。镜像 `ccgateway-app:0.1.41`、CLI SHA-256 `a967e7b1d8b4e47ee421d5433027880347952b0c0857abf880e2c942a4ec93b3`；测试程序 SHA-256 `f29f076422e282d96f0d191817994142a71c0ae0f4363b592e270ad3d880bee8`。临时容器禁网、无账号挂载、uid 1000、cap-drop ALL/no-new-privileges、2 CPU/4 GiB/512 tasks，结束后确认已删除。使用真实 CLI 与本地假上游，不是生产模型验证。
- 存储 OAuth 的 37 场景此前在上述两版 CLI 各连续两轮通过；只由 CLI 刷新并核验落盘/指纹/30 秒有效期，未知版本拒绝。独立审查未发现高严重度问题；credit 跟踪与搜索原本拒绝过晚，已加生成前门禁；无调用者的旧 credit wire 改写函数已删除。NO_PROXY 不绕过管理 HTTP 的 HTTPS_PROXY、版本为启动快照、外部并发轮换及损坏身份文件仍是明确边界，不宣称通用 ASVS 合规。
- CCGateway/engine/Worker/contracts 全包普通回归、构建与相关 Go vet 通过；Core CCGateway 全包在真实 PostgreSQL **16.9** 上通过（最后一轮 78.160s）。Windows 原有测试库缺 `pg_control`，未删除或修复；以一次性 `LOCALAPPDATA` 创建隔离测试库，保持原 GOCACHE。工具的 `testpg stop` 未能停止该进程，最终用该临时目录自己的 `pg_ctl -D ... stop -m fast -w` 正常关闭；未触及生产库，不声称 SQLite/MySQL 或 race 矩阵通过。
- 原生 Mod 的 Node 测试 7 项通过；前端策略/控制器/语言包 86 项通过，Vue typecheck 和独立临时目录生产构建通过。定向 ESLint 0 errors、495 个既有样式/未使用变量 warnings；Bun 不可用，使用已安装 Node 工具，未安装依赖或修改安全限制。
- 后续提交推送、签名发布、三个允许 Worker 原地更新及本地 CC 经 #22 的模型验收已完成，证据见本文开头。离线结果仍不替代 #26 授权恢复或真实账号 Files/Skills 资格验证；#23/#25 未使用、未更新。

以下为历史部署记录。

> **2026-10-12 12:37（北京时间）线上版本：** 核心 **v0.1.118**，CCGateway **0.1.39**。核心源码 `cffea79e3a8409adf36d2aa10dc9d32b697f67f7`，manifest `fcc8558c9471c93c1ca29e25999f584e9bf93f70bcfc3f8cc3b5bf652c383be4`，四节点程序 SHA-256 均为 `2e0536eb7b075f2a7caa348d5dd33cea869bf32ae1e960f7c8c47f6437644400`。正常 primary-first 升级计划 `8f76da9f4049715a14baebfd92289b94` 已 completed，六个 builtin 包与 trust 的字节保持不变，无 schema 变更。
> - **插件不能自行停用账号**：分类中的 `ACCOUNT_EFFECT_DISABLE` / `automatic_state.ACTION_DISABLE` 仅降级冷却；仅命中管理员状态码或关键词且两级开关允许时才自动禁用。插件 Host API 的 DISABLE 经参数和账号所属校验后返回当前状态、`changed=false`；CLEAR 保留既有语义。插件不能用非法或过短期限削弱管理员规则。线上规则仍为 `enabled=true`、状态码 `401` 和原有关键词，本轮未修改配置。
> - **原生运行环境**：此前 v0.1.117 / 源码 `b40b347069ff8f1c2bfbe5c498451678b48726a7` 发布了 native 路径。#26、#22、#24 的 Worker 经控制器原地更新为 0.1.39（程序 SHA-256 `3ea104fcc80659c6f527e3765ee8e59dcc92bd3b9b718e1133acfc14dc2dde2b`），保留容器和授权，CLI 为 2.1.292。当前 native 账号为 `[22,24,26]`，全局仍为 passthrough，旧中继分支保留，不能表述为已经物理删除全部 relay 代码。本轮 v0.1.118 不更新任何 Worker 或账号容器。
> - **本地 CC 实测 `claude-opus-5-5`**：04:36–04:37 UTC 文本、Read 工具及图片识别成功；文本使用记录 2867 分配 #26、200、一次尝试，输入 2、输出 19、缓存写入 3783，与本地 CLI 统计一致。Read 两轮记录 2868/2869 分配 #24；图片记录 2870 最终分配 #26、200、两次尝试。CLI 套接字采样观察到 #26 的 `claude` 进程持有 443 连接，未观察到 Worker 持有 443，不捕获载荷。成功用量记录有正常计费。
> - **搜索验收仍未完成**：本地 CLI 虽调用两次 WebSearch 并最终输出文档 URL，但搜索子请求记录 2872/2874 返回 400，不能算搜索成功或搜索计量通过。初始探针仅检查工具调用和最终 URL，已在私有结果中追加 `acceptance_passed=false` 撤销该验收结论。仍须修复／核实真实搜索结果和用量，不能宣布整个迁移全部验收完成。
> - **保留性及账号边界**：发布前后账号和控制器容器身份、启动时间、挂载、配置／环境摘要一致；native 策略与用户禁用规则一致。最终查询 #22/#24/#26 均 active；本轮没有手工重置账号状态。#23/#25 不用于测试。备份 `~/sup2api-managed/backups/pg-before-0.1.118.dump` 为 0600、24,355,038 字节，已验证恢复列表；基线 `backups/core-0.1.118-runtime-baseline.json`，升级日志 `upgrade-20261012T043413.log`。
> - **回归验证**：gateway/account 完整包在独立 PostgreSQL 16.14 同机 Linux 测试容器内通过，grpcruntime 包通过；Go vet、前端类型检查、两项语言包测试、相关 ESLint 和发布构建通过。本机内嵌测试 PostgreSQL 缺少 pg_control，未删除或改写其数据；改用独立测试实例。Windows 经 SSH 访问测试库的 account 全包因延迟达到 8 分钟超时，最终以同机 Linux 完整回归结果为准。本轮不声称执行了 race 全套或三数据库矩阵（此仓库使用 PostgreSQL/pgx，并非 new-api/GORM）。

> **2026-10-11 20:58（北京时间）线上版本：** 核心 **v0.1.116**，CCGateway 插件、控制器及既有 Worker 均未更新；插件与控制器仍为 **0.1.38**。发布源码 `bde0ca4f2111b5ad5847a9eb692bfdf7aa4ab230`，manifest `9b76746577377cf8685d2f5493bf8c4b8d296cbfa3a394684d7e568b04ee7501`。先提交推送，再由 OVH 的 clean detached worktree `~/sup2api/release-0.1.116` 使用仓库现有 Dockerfile 构建，保持 2 CPU / 4 GiB / 512 tasks 限制，复用 0.1.38 的运行环境镜像缓存。
> - **使用日志与 API Key 白名单上线**：共用筛选栏补充模型模糊搜索、API Key 名称／ID、调用 IP、协议、端点、状态码、错误类型及流式状态等条件；列表／详情展示调用 IP、API Key 身份和 User-Agent，管理员支持账号、用户、插件、节点及上游维度。列表与汇总使用相同筛选条件，普通用户仍隐藏上游账号信息，日志不展示完整 Key。
> - **白名单语义**：支持 IPv4、IPv6、CIDR，最多 256 条；新建和已有 Key 均可设置。空数组不限制来源，旧 Key 迁移默认空数组，本轮未为任何生产 Key 设置限制。核心 API Key 鉴权统一校验可信调用 IP，不匹配返回 403 / `ip_not_allowed`；覆盖普通请求、WebSocket 握手、资源和价格接口。
> - **托管升级完成**：计划 `7ae0cf8a97d37b01a1ae9d8e24f75413` 为 completed，四节点均 v0.1.116 / local / ready，Host API 仍为 6。迁移 `0052_apikey_ip_allowlist.sql` 已应用，校验和 `b3a1ee501feb52babeeefab4e6df463adec1de279d4a5f8c994e9ce9fc5d1906` 与发布源码一致。
> - **既有容器保护**：12 个账号 app/egress 容器的 ID、启动时间、重启次数、镜像、挂载、安全设置、环境摘要及运行中程序哈希与升级前一致；控制器和四个外壳容器也保持原实例。没有调用 Worker 更新接口，没有重启或重建账号容器，#23 仍为 disabled。本轮没有发模型请求。
> - **线上只读验收**：四入口均核验日志联合筛选与汇总一致、非法 IP 筛选返回 400、Key 列表包含 `allowed_ips`、个人详情隐藏账号／节点信息，以及前端白名单和新筛选资源。实际 IP 拒绝、伪造转发头及所有者隔离在隔离测试中验证；未用生产 Key 修改白名单做拦截试验。
> - **验证与备份**：前端 326 项测试、类型检查和构建通过，相关 ESLint 无错误但仍有格式警告。OVH Docker 的 Go 1.27.1 / GCC 14.2 / PostgreSQL 16.14 上，apikey、usage、gateway、migrations、billing、core 及外壳 proxy 七包 `-race` 全部通过，临时测试容器已清理；此轮未单独等待 GitHub Actions 结果。数据库备份 `~/sup2api-managed/backups/pg-before-0.1.116.dump`（0600，23,736,975 字节）已检查可读取，保护基线为 `~/sup2api-managed/backups/v0116-preflight.json`。跨 schema 恢复仍需评估，不能把备份等同于支持自动回退。

> **2026-10-11 20:08（北京时间）线上版本（已被上面替代）：** 核心 **v0.1.115**，CCGateway 插件与控制器 **0.1.38**，发布源码 `20f7e24c70c41f4dd0b862d36c8c8f773acd73ed`，manifest `7c8da683d5d012a6a147015c8f8282a91fd57ebbf129227b67e085a99bbc0b4a`。先推送 Git，再由 OVH 的 clean detached worktree `~/sup2api/release-0.1.115` 使用仓库现有 Dockerfile 构建，保持 2 CPU / 4 GiB / 512 tasks 构建限制。
> - **通用账号生命周期上线**：核心管理准备会话的权限、幂等、过期清理和事务绑定；插件提供校验、准备、账号动作及创建／修改／删除回调。账号与代理变更复用事务事件，回调读取最新账号配置，同步结果有代次保护；代理配置变化与实测出口 IP 变化分别通知。
> - **核心属性与扩展字段边界**：SDK `Account.properties` 提供并发、RPM、TPM、优先级、权重、代理、调度、自动禁用等核心属性，核心继续执行调度与限流；插件扩展 schema 不允许重复核心字段或凭证字段。CCGateway 的语言／时区通过扩展字段校验，准备容器前即可传入。
> - **四节点托管升级完成**：计划 `092c178eabbbecd74f8eaf100126b2ce` 为 completed，四节点均 local/ready，均核验 v0.1.115、CCGateway 0.1.38 和生命周期声明。Host API 仍为 6，本次没有替换外壳容器。迁移 `0051_account_preparations.sql` 已应用，校验和 `5f3c5253abbcc1cac660e38d072a80f5151b7b7665e9df51291eca83c9af1e47` 与源码一致。
> - **全部既有账号容器和 Worker 保持不变**：发布前后核验 12 个 app/egress 容器的 ID、启动时间、重启次数、镜像、环境变量摘要、挂载、安全设置，以及运行中 app 的 Worker／Claude 程序哈希；没有调用 Worker 更新接口，没有重建、重启账号容器。#23 仍为 disabled，app/egress 保持停止，没有重新授权或发模型请求。
> - **新容器使用新默认镜像**：控制器已切换到 `ccgateway-controller:0.1.38`，新建 app/egress 默认镜像为 0.1.38，runtime 的 `up_to_date=true` 表示默认镜像已对齐，不表示旧 Worker 被升级。新 app 镜像离线验证 `ja-JP` / `Asia/Tokyo` 生效。旧容器语言／时区变更标记 `environment_requires_new_runtime`，不会伪报已应用或偷偷替换容器。
> - **备份保留**：数据库备份 `~/sup2api-managed/backups/pg-before-0.1.115.dump`（0600，23,242,858 字节）；容器基线 `~/sup2api-managed/backups/v0115-preflight.json`。切换前确认没有活动 Claude 进程，旧控制器保留为停止的 `ccg-controller-pre-0.1.115`，没有删除；原环境文件、容器规格和 runtime 默认配置保存在 `/opt/ccgateway-runtime/controller-before-0.1.115/`。跨 schema 恢复仍需专门评估，备份不等同于支持直接自动回退。
> - **验证**：隔离 PostgreSQL 16.14 上相关账号、CCGateway、事件、插件运行时、网关、用量和迁移 `-race` 通过，新增迁移覆盖旧结构升级、数据保留和重复执行；SDK、CCGateway 插件测试及 vet 通过；前端 318 项测试、类型检查与构建通过，ESLint 无错误但仍有模板格式等警告。发布镜像内离线运行控制器 103 项测试通过。代理包已有 `TestProxyCRUDTestAndDirectory` 失败项未计入本轮通过项，其余相关测试通过。隔离测试数据库和隧道已停止。

> **2026-10-11 18:01（北京时间）线上版本（已被上面替代）：** 核心 **v0.1.114**，发布源码 `db9b6c01c165e943ca2672a7875b49a95bd7bdca`（功能提交 `3b08da0fd`），manifest `3541ae6066225e32492b6df4a0394b44d5b53c887cf0fd9fbe90bdba0bfb0dbc`。先推送 Git，再由 OVH 的 clean detached worktree `~/sup2api/release-0.1.114-build2` 使用仓库现有 Dockerfile 构建。
> - **Host API 6 / 自动状态上线**：程序只写 `auto_disabled`，插件可指定时间点或时长、主动解除，到期由核心恢复；管理员停用和调度偏好保留。CCGateway 用最晚已耗尽配额窗口及 `Retry-After` 提供解除时间，授权撤销不按配额恢复。账号测试保存真实状态、代码和来源。
> - **插件声明通用开关上线**：`accountTypes[].commonControls` 支持 `auto_disable`、`schedulable` 的 `configurable` / `default`；创建默认值及只读约束由核心执行，已有账号不改写。全局自动禁用关闭或读取失败时，账号级 UI 不可操作。四入口的全局状态投影及 CCGateway 声明均已核验，当前全局仍为开启，本轮未更改该配置。
> - **四节点已完成托管升级**：外壳先按 2→3→4→1 更新，挂载、端口和安全设置一致；升级计划 `3550f81b884ad19a027b2519c966f632` 为 completed，四节点均 local/ready。核心 SHA-256 均为 `25102c8980ea28ec2864bf49d056381015be236a884225661c90294537f7ce11`；迁移 `0049` / `0050` 已应用，校验和与源码一致。
> - **CCGateway 0.1.37；仅原地更新已有 Worker**（用户要求）：通过 `POST /system/ccgateway/runtime/workers` 指定 `ccgateway-app:0.1.37`，没有使用全量 runtime/bundled 切换。#21/#22 更新前均无活动 Claude 调用，仅替换 Worker 程序并短暂重启原容器；新程序 SHA-256 均为 `3234fc868571567a7df9166d1e036dea6888a536ee9838092b05e3ae4ca4b5fb`，health 均 200。账号容器 ID、挂载、安全设置和 Claude 可执行文件哈希均保持一致，#21 的调度关闭保持不变。
> - #23 返回 `not_running`，app/egress 保持停止、账号保持 disabled，没有启动或发模型请求；仍需用户重新授权后验收 Fable。#20 无容器，更新结果 `not_found` 为既有状态。控制器和出口容器未替换，故 runtime 的 `up_to_date=false` 仍可能表示内置镜像引用不同，不等于已更新的 Worker 程序未生效。
> - #21/#22 的全部旧 Worker 程序备份先移动到各 runtime 的 `worker-backups-before-0.1.114` 目录保留，未删除旧备份；本次更新的自动备份留在新的 `worker-backups`。数据库备份 `~/sup2api-managed/backups/pg-before-0.1.114-db9b6c01.dump`（0600）；外壳旧镜像 `sup2api-gateway:pre-0.1.114-db9b6c01`；升级日志 `~/sup2api-managed/upgrade-20261011T100109.log`。跨 Host API / schema 的旧版本恢复不能直接自动回滚。
> - 发布前：前端相关 233 项测试、类型检查和构建通过；SDK / gateway 测试及 vet、11 个插件构建通过；隔离 PostgreSQL 16.14 上账号、网关、插件运行时、迁移和 CCGateway 的 `-race` 通过。本轮没有收费模型实测。首次镜像构建触发进程上限，已限制 Worker / 外壳的 Go 编译并行度，不放宽 2 CPU / 4 GiB / 512 tasks 构建限制；失败构建现场保留在 `release-0.1.114` 和 `stage/0.1.114-failed-3b08`，正式制品和备份保留。

> **2026-10-11 14:55（北京时间）线上版本：** 核心 **v0.1.113**（源码 `a12d68ead`，manifest `1d8c3623438ccb9f640549a5fe0e0c022817c3e40aa5584bd59808d614e36e1a`）。本次先推送 Git，OVH 主仓库拉取同一提交，再使用仓库现有 Dockerfile 完整构建；没有使用额外的 Dockerfile。
> - **Host API 5 与公共异步观测上线**：核心成功 RPM/TPM 和获授权插件共用观测、窗口聚合与修订去重；当前并发继续复用核心槽位。账号统计后端与 SDK 已上线，账号页面尚未接入。
> - **外壳先逐节点更新**（2→3→4→1）：`sup2api-gateway:local` 与 `sup2api-gateway:0.1.113-hostapi5` 均指向 `sha256:14b54136a87ad47d5cfea8592739e53613a04747d87c86d3d2ab91f8fe4487b3`。仍使用 `/home/debian/sup2api-managed/compose.yml`，数据卷、端口、`cap_drop: ALL` 和 `no-new-privileges` 不变。校验挂载时按目标路径排序，不能把 Docker 返回顺序变化误判为配置变化。
> - **托管核心升级完成**：计划 `7d1583367c0f3ecf9a91c98926e2bd87` 为 `completed`；四节点均为 local/ready，核心二进制 SHA-256 都是 `25208ad23586696d1b890d12527d2f80ab417095451221488f7fe8fac54aae57`。
> - **0046 历史兼容修复**：不改原 SQL、已应用校验和或 schema contract，仅核心执行器对精确历史文件增加幂等执行兼容。共享库中该记录的校验和和应用时间未变。迁移、store、app 在隔离 PostgreSQL 16.14 上的普通及 `-race` 测试通过。
> - **只读上线验收**：四入口统计设置和账号统计接口均 200，默认窗口 60 秒，从 warming 转为 ok；各节点读取相同的共享起始时间。验收窗口所查账号无成功请求，未主动发起收费模型请求，不能将此当作真实模型采集验收。
> - 内置插件按现有构建流程重新打包；已有同版本插件仍由核心保留，不强行覆盖。ccgateway 仍为 0.1.36，本次未推送或替换账号 worker、控制器镜像。
> - 恢复材料：外壳旧镜像保留为 `sup2api-gateway:pre-0.1.113-a12d68ead`；数据库备份 `~/sup2api-managed/backups/pg-before-0.1.113-a12d68ead.dump`；升级日志 `~/sup2api-managed/upgrade-20261011T065459.log`。Host API 4→5 不支持自动跨协议 baseline recovery，不能把保留旧制品等同于可直接自动回退。
> - 本轮弃用的临时 Dockerfile、源码压缩包、远端测试源码副本和临时构建目录已清理；发布包、正式 stage 和备份按恢复用途保留。

> **2026-10-11 11:50（北京时间）线上版本：** 核心 **v0.1.112**（源码 `2fbe15cfc`，manifest `7c9f590b86aa…`），ccgateway 仍是 **0.1.36**，worker 和控制器都没有变化。CONTRACTS §49.18。
> - **模型请求不再逐次读配置、问控制器**：配置、账号修订号、运行环境的地址和 Worker key 都缓存在每个节点内存里，隧道连接复用。改配置、账号、代理时本节点清空，并通过 Redis 总线通知其他节点；另有 30 秒过期兜底。
> - **定时核对改为每 60 秒一次**（原来 3 秒），变更时已立即同步。
> - **修了停用账号被反复写配置**：控制器对已阻断的运行环境报 `pending`，以前 4 个节点每轮都对停用的 #20 `PUT config`。
> - **实测**（抓本机回环 8787 的控制器请求）：
>
>   | | 升级前 | 升级后 |
>   |---|---|---|
>   | 每分钟 `GET status` | 320 | 12–16 |
>   | 每分钟 `PUT config` | 80 | 0（升级后第一轮每节点 1 次） |
>   | 8 个请求的 `/connection` 和隧道 | 各 8 次 | 各 1 次 |
>
>   临时 key 35 的 8 个请求全部 200，每个 1.6–2.2 秒。4 个节点 10 分钟内没有 ccgateway 相关错误。key 35 和辅助脚本已删除。
> - **本机 CC 复测通过**（2.1.292，opus-5-5，临时 key 36，已删除）：
>   - WebSearch："你能使用websearch工具查询下北京的天气吗"，22 秒，1 次搜索，回答带 4 个来源。
>   - 子代理："启动子代理 理解最近的 素材库功能 然后报告给我"，321 秒，子代理调用了 26 次工具，最后交回报告。
>   - 网关侧：28 条 `/v1/messages` 全部 200，分到 #22 和 #23；4 条 count_tokens 全部 404；没有 409 或 502。
>   - 子代理各轮的缓存读取逐轮增长：22.2k → 36.1k → … → 132.8k。
>

> **2026-10-11 04:30（北京时间）：** 核心 **v0.1.111**（源码 `dcde8a7ae`，manifest `a9a7ad179c25…`），只改了控制台界面，ccgateway 仍是 **0.1.36**。
> - "CC 特性"页去掉了特性目录（工具安全审查、出站中继完全透传、thinking disabled 兼容的说明卡片），各特性的支持情况只写在 worker 的 `catalog.go` 里。
> - thinking disabled 兼容只保留开关，在"工具与错误处理"里，说明补充了"两种中继模式下都生效"。
> - 没有其他页面使用的特性目录视图和"查看账号 Worker 能力"探测组件一并删除；核心的 `/system/ccgateway/features` 接口保留。
>

> **2026-10-11 04:15（北京时间）：** 核心 **v0.1.110**（源码 `9e341029e`，manifest `1b7403c6b535…`），只改了控制台界面，ccgateway 仍是 **0.1.36**，worker 没有变化。
> - "CC 特性"页只保留一个标题，目录卡片里不再重复。
> - 特性目录只列出有限制、不支持和未验证的特性，CC 和通用 API 两处都是这样；完全支持的特性只在 worker 的特性目录代码里说明。状态筛选里也去掉了"支持"。
>

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
