# Claude Code 2.1.302 分析与改动记录

记录日期：2026-10-18。**这是 2.1.302 的独立实现记录；2.1.296 文档保持历史基线，不覆盖或重用其验证结论。** 已正式部署 Core 0.1.158、CCGateway/Controller/Worker 0.1.58，生产 21 号固定 CLI 2.1.302，保留 native 模式。第 8 节保留首次隔离验证时的限制；其透明出口阻塞已在正式部署中修复，新建容器 build/direct 的就绪与真实请求验证见第 9 节。

## 1 官方产物身份

- 官方发布 manifest：`https://downloads.claude.ai/claude-code-releases/2.1.302/manifest.json`，本次取得版本为 2.1.302，commit 为 `2ef144e6f98c1c99d082b735e4b38f50e3391e55`。
- Linux x64/glibc：285793528 字节，SHA-256 `60d7eb7f12fbb28a52533fe8be5884097403562aa02dc73991a021c7067e29a5`。
- Windows x64 本机快照：290211488 字节，SHA-256 `3ab075f78998efef8b87f491c2e4a39c309dddf44e51d0103eba4f3713d2a0ae`，与同版本官方 manifest 匹配。
- 原始产物与研究材料位于仓库 `artifacts/claude-2.1.302/`；正式小型证据使用本目录下 `cli-research/2.1.302/`，不混入 2.1.296 证据目录。

## 2 本次目标与边界

1. 基于 2.1.302 重新定位并迁移工具定义注册、mods 调用分发、request direct/build、组件恢复与 beta/认证头隔离。不能只替换旧补丁的版本号、哈希或符号名。
2. 继续生成包含 Bun 的原生 Linux 可执行文件，保留 CLI 和 hooks-worker 双入口；不以裸 JS 代替交付 CLI。
3. ccgateway 提供请求模式配置：零注入 direct 传完整 Messages body；build 由 Worker 提取组件并交 CLI 原生构建。Controller 转发，不自行解析或注入消息内容。
4. 账号授权创建容器时即禁用 CC 原生和受管自动更新，并使用 ccgateway 配置所指定的 CLI 版本/补丁身份。
5. 验证网关配置、Controller、Worker 与实际 CLI 的版本/模式一致性，不将默认镜像版本、semver 或“容器已启动”视为完整验证。

## 3 重新分析进展

官方 Linux 产物已经按 manifest 校验。Bun 模块表提取获得 2686 项，其中 JS 2433 项，模块资源引用恢复未发现未解析项。这仅说明静态载荷恢复成功，不证明重编译或补丁语义等价；仍需原生启动及行为测试。

本次 REA 的 Rizin 调用返回 `ERR_REA_WINDOWS_NATIVE` / capability_unavailable，不能提供该项分析证据；当前使用已校验的 Bun 模块表恢复和 AST 定位继续分析。2.1.296 的模块哈希检查保持有效，不对新版本放宽为未校验替换。

## 4 302 的补丁定位与实现

补丁器为 [patch-cli-2.1.302.cjs](../companions/cli-mods/patch-cli-2.1.302.cjs)，输入模块哈希为 [302 profile](../companions/cli-mods/profiles/linux-x64-2.1.302.json)。统一入口仅分派到明确支持的版本，不放宽 296 的原有检查。实际修改 8 个模块，另校验导入依赖模块；复制 7 个支持模块，保存修改后哈希。

| 职责 | 302 定位 | 本次改动 |
|---|---|---|
| 命令入口 | `cli.js / Ge` | 普通主循环前识别 request；保留 fast-path policy；新增只读 `--ccgateway-info` |
| guest / host 工具注册 | `chunk-ctwws12s.js / bE`；`chunk-8242685m.js / hRr` | 传递 kind:native，按会话、名称增加或完整替换工具定义 |
| 工具目录和序列化 | `chunk-sdr1wqge.js / ka`；terminal `computeToolPool`；core `U$` | 合并 native 注册，revision 参与缓存；模型 Schema 不再被旧工具的转换器覆盖 |
| 参数与排队 | core `KQt/Khe/mxt`，`QZt`，streaming `addTool` | 跳过旧工具参数解析和批量拆解，保留字符串 JSON 解码，统一串行排队 |
| mods / hooks | core `jz`、`j7/aur/gDn/Fao/vhn` | tools 交给 mods，执行配置 hooks；无人处理返回错误，不回退原工具执行器 |
| 组件构建 | core `XPt → xRn → gRn/_A → TYr`；渲染 `$Fe` | 原生构建器返回 body 后退出网络循环，再发送一次；显式 system 消息保留 wire 字段 |
| beta | `chunk-yn324528.js / uLo/Y0r` | 显式 beta 在构建前进入原生描述符与策略检查，构建后合并能力 beta |
| 发送/认证 | `chunk-pmgddf3s.js / GU/CEe/Tae` | request 专用 API Key 路径，不选择/刷新订阅账号；发送前隔离 CC/SDK 身份头 |

302 的 `j7` 聚合器包含新版 ask 相关返回信息，`jz` 和主构建器也有结构变化；迁移经过对应调用点检查及新 ELF 的行为测试，不仅依赖静态相似度。build 的 api_system 分支在 `_A` 内先调用 `tr/Fr` 排空待处理上下文，再按原位置加入 `dn`；`TYr` 在 wire 边界保留组件提供的原始 system 字段。

`request-build.js` 等公共支持模板仍保留 296 的 import 记号，302 补丁器按固定映射生成对应导入；生成文件属于 302 manifest 的校验内容。不要直接把这些模板当成可独立执行的 302 CLI。

## 5 direct/build 的当前契约

```sh
claude request --direct --betas "a,b" messages.json
claude request --build --betas "a,b" components.json
claude --ccgateway-info
```

两种输入不同，均可读 stdin 或 --input；两种模式互斥。每个 request 命令发送一次模型请求，输出 JSON/SSE，工具执行与后续模型回合属于调用方。不存在通过 request 命令自动接管 tools 的完整 agent loop。

- **direct / 零注入**：收到的完整 Messages JSON 原文发送，除可选 BOM；不注入 system、工具、历史、默认生成参数或本机身份。认证及允许的传输头由 CLI 生成，beta 独立传递；零注入不等于复用客户端认证头。
- **build**：Worker 从 user 文本和嵌套 tool_result 提取平衡的 system-reminder，并提取独立 role:system。组件为 model/systemPrompt/messages/attachments/tools/parameters/stream，引用和文本模板保留位置；CLI 使用 `$Fe` 渲染/回放，经原生消息构建器生成 body。
- 不从标签猜测内部附件类型，不重新读取 Worker 的 CLAUDE.md、图片或 PDF，不补入 Worker startup 环境；每次请求带来的历史原位处理一次，不跨请求猜测去重。
- build 不承诺字节或 JSON 形状相等。文字可以变成 text 数组；没有提供 system/tools/metadata/thinking/temperature/stream 时，原生构建器可能补默认值。本轮最小输入实际出现 `system:[]`、`tools:[]`、原生 metadata.user_id、thinking.disabled、temperature:1、stream:false。需要保持字段完全缺省时用 direct。
- CLI build 接口的 `systemPrompt` 字符串采用原生提示构建路径，回归中会加入 billing 提示和 Agent SDK 身份提示；数组形式按显式 system blocks 保留。Worker 提取 HTTP system 后使用结构化 blocks 路径，已通过真实客户端出入口对比；不要把 CLI 字符串输入的行为等同于 Worker 的 HTTP 重建路径。
- request 当前只接受显式 API Key 的 Anthropic-compatible 路线；订阅/OAuth 的请求发送未实现。原有 native 路径和授权管理不因此改成 API Key-only，但选择 direct/build 的账号必须具备 API Key。
- 原生认证头在最终 fetch 边界校验；允许 X-Api-Key、anthropic-version/beta、JSON Content-Type、Accept 和固定 UA；CC/Stainless 会话头及客户端凭证不沿用。自定义环境头不能覆盖认证或 beta。
- build 拒绝 JS 无法精确表示的整数；direct 保留有效 JSON 的原文数字。HTTP 错误、取消、超时、SSE 输出沿用 v7 实际测试过的公共发送实现。

mods 的 native 工具注册独立于 request：同名完整覆盖，未知名称可交给 mods，hooks 明确拒绝仍生效。旧有 context、ask、结构化结果、完整 resume/TUI/ToolSearch 兼容缺口并未因迁移版本而自动修复，本轮不宣称这些场景完整兼容。

## 6 ccgateway 配置与账号创建链路

界面位置：ccgateway 设置 → **CC 特性 → Claude Code 版本与请求模式**。提供 direct、build 和兼容旧账号的 native；direct/build 隐藏不使用的旧 Agent 附件擦除、工具前缀和字段忽略控件。保存数据示例：

```json
{
  "request_policy": {
    "schema_version": 1,
    "relay_mode": "direct",
    "cli_version": "2.1.302",
    "unknown_field": "reject"
  }
}
```

| 层级 | 实现与失败行为 |
|---|---|
| Web / Core | requestPolicy 保存模式与版本，旧 legacy/passthrough 值归一 native；只接受合法版本号，不接受 latest 或路径。指定 build/direct 且未给版本时补 2.1.302 |
| Core 账号与授权草稿 | 期望配置增加 cli.version/request_mode/disable_auto_update，加入 revision；配置变更清空缓存并触发同步。老配置未指定版本时保留兼容行为 |
| Core → Controller | 下发前检查 cli-profile-v1 能力；旧 Controller 不支持时明确要求升级，不把未知字段当成已应用 |
| Controller 新建授权容器 | 按所选 Worker 镜像里的 manifest 选择版本，先校验路径、root 所有权、目录不可组/全局写、SHA256 与可用模式，再更换容器。镜像未提供指定版本返回 cli_profile_unavailable，保留原容器 |
| Controller 默认值 | 新 Controller 镜像带 CCG_DEFAULT_CLI_VERSION=2.1.302；新授权容器即使来自未传版本的旧配置，也选此版本。已存在的旧容器不因默认值变化自动替换 |
| 创建时禁更 | 容器 ENV 直接设 DISABLE_AUTOUPDATER=1；初始化数据卷时写 cli-update.json 的 auto_update:false，不依赖第一次模型调用才关闭 |
| Worker 启动 | WORKER_CLI_PATH、WORKER_CLI_VERSION、CCG_CLI_SHA256、CCG_CLI_PATCH、CCG_REQUEST_MODE 来自已验证的 profile；启动前核对实际版本、文件哈希、--ccgateway-info 的 patch/capabilities，失败不启动业务服务 |
| Worker 每请求 | 主机下发的模式/版本与本 Worker 不一致时返回 409，零次模型发送；不静默退回 native 路径 |
| 更新管理 | pinned_version 回传界面；不允许开启受管自动更新或申请官方 CLI 安装。版本选择应通过 ccgateway 配置和包含指定版本的镜像完成 |
| 旧兼容网关入口 | engine.Main 也读取 CCG_REQUEST_MODE 并执行固定版本校验；兼容入口镜像使用同一 release 目录，不再 npm 安装官方最新包 |

版本或模式变更会重建账号业务容器，保留账号数据卷；模式变化保留当前镜像身份，版本变化才选择配置目标镜像。此操作可能中断正在进行的请求，应在空闲时切换。新的配置与校验不意味着生产镜像已替换，也不自动下载未打包的 CLI 版本。

## 7 构建、发布输入和升级顺序

```sh
node patch-cli.cjs /absolute/restored-302 /absolute/new-patched-302
sh build.sh /absolute/new-patched-302 /absolute/claude-linux-native
node package-release.cjs /absolute/claude-linux-native /absolute/new-patched-302/ccgateway-patch.json /absolute/companions/cli-mods/release
docker build -f worker/Dockerfile -t ccgateway-worker:302-v7-final .
```

使用 Bun **1.4.3**，编译 CLI 和 hooks-worker 双入口。release 目录包含 manifest.json 和版本目录中的原生 ELF/补丁清单；它被 git 忽略，构建 Worker 前必须准备。Dockerfile 固定默认版本 2.1.302，并去除 Windows 打包可能带来的目录组写权限，避免控制器拒绝不安全的目录。目录不存在或版本缺失时构建/创建失败，不退回安装未修改官方 CLI。

- 当前补丁：`ccgateway-v7-request-modes`。
- 当前 ELF SHA-256：`b14a537bbaa1218f23ba7347151f52fb29654af1101ed4b935507b6beb2dc9d8`。
- 本机 ELF：`artifacts/claude-2.1.302/claude-linux-native`。
- 独立测试最终镜像：`ccgateway-worker:302-v7-final`、`ccgateway-controller:302-v7-final`；早期 `302-v7-test` 标签仅属于本轮中间验证。
- 先准备包含 CLI 的 Worker 镜像和支持 cli-profile-v1 的 Controller，再更新 Core/界面并选择版本和模式；只有 source/semver 相同不证明镜像具备补丁。
- 首次隔离验证没有切换生产镜像。后续正式发布使用插件内置的 `ccgateway-{app,controller,egress}:0.1.58` 镜像，不使用测试 tag；部署详情见第 9 节。

## 8 首次隔离验证结果与日志（正式部署前）

本轮重新执行了 302 ELF 的 11 个组件请求场景及 12 个工具/mods/hooks 场景，24 项支持模块单测通过。前端 53 项模式保存、版本输入、旧模式归一化和更新锁控件测试与类型检查通过；Controller 46 项测试、Worker 配置/server/worker 测试和管理校验通过。Core ccgateway 包的 121 个顶层测试在 Linux 隔离 PostgreSQL 上通过，包括配置保存及 cli profile/revision 下发；本机嵌入式 PostgreSQL 的符号链接失败和通过 SSH 跑全套测试超时不计为通过。

另补跑通过 9 个模式回归场景和 11 个请求传输回归场景，覆盖互斥参数、错误输入、build 消息/附件组合、SSE、HTTP 错误、取消、超时、输出背压、认证头拒绝及大整数原文透传。WebSearch 场景为服务端工具响应 fixture 回放，不能据此宣称真实上游 WebSearch 已验收。

真实 API 验证使用两个独立 Worker，复用 21 号 API Key 和 URL，经既有隔离 capture 网络发送，未使用订阅账号：

- build 与 direct 各一次请求，HTTP 200，正确回答法国首都是巴黎；认证匹配，beta 保留；direct body 逐字节一致，build 的原生默认值和块形状差异如第 5 节所列。
- 官方 Windows **2.1.302** 客户端分别通过两种 Worker 模式读取项目 README_CN.md 并回答；各一次 Read、两次模型请求、18 秒，均正常退出，项目文件/Git diff 未变化。
- 管理接口回读 auto_update:false、pinned_version:2.1.302；尝试开启自动更新、申请官方安装、发送错误版本的请求均返回 409，错误版本请求没有产生模型调用。

**创建链路未通过的部分**：真实 Controller 已按 profile 创建了正确的 302 容器并执行校验，但 `_activate` 的联网探测失败。OVH Docker 的 DOCKER-INTERNAL 对测试 internal bridge 的非子网目标报文有实际 DROP 计数，Google 探测及目标 API 域名访问均超时。没有通过修改宿主机隔离规则或伪造 ready 状态绕过此问题。透明出口链路尚未验收，独立 capture 网络中的成功不替代这项验收；生产 21 号未替换/重启。

本轮正式证据为 [302 验证摘要](cli-research/2.1.302/verification.json) 和 [函数迁移映射](cli-research/2.1.302/migration-map.json)。远端根目录 `/home/debian/sup2api/checks/ccg-302-v7/` 保存构建、测试和实际 API 记录；完整认证 env 文件为私有文件，不进入仓库。独立 Worker 分别是 `ccg-302-build-test`（127.0.0.1:32777）和 `ccg-302-direct-test`（127.0.0.1:32778）。

Worker 每请求日志仍为 `/work/data/request-logs/<id>/`，包含请求/响应、metadata/events，build 另有 build-components。出口 capture 文件在既有 `/home/debian/sup2api/checks/ccg-components-v6-20261018/capture/`；目录名称属于测试记录器，不代表其中新增请求仍由 v6 CLI 发出。应按请求哈希与 302 证据索引区分。本地临时会话日志不保证永久保留，仓库只保存脱敏摘要及源材料哈希。

## 9 OVH 正式部署（2026-10-18，北京时间）

用户授权构建并更新服务后，发布源码为 `bcaa5915219cfc2fd2236c38dff6a259853f2342`。Core 四节点均为 **0.1.158**，CCGateway 插件、Controller 和 Worker 为 **0.1.58**，21 号容器改用 `ccgateway-app:0.1.58`，CLI 固定 **2.1.302 / ccgateway-v7-request-modes**。保留原 `native` 请求模式，数据卷仍为 `ccg-21-data`；停止的历史账号容器未启动，原共享 Xray 容器身份和启动时间不变。

- Core SHA-256：`2877a0e3afcdc057b5135f0abf75c8e4d492ed42c86355243ce4c170dd90ddee`；Worker：`35a92364f0e9d4578c7247a7bb3b823304d8eddd455418acd62c6506e70c43c1`。
- 正式 release 为 `v0.1.158-r2`，manifest 为 `88875593dcb638c4586345e1f2f91a1f68a4e5f6243486f5e61deb8848831262`，bundle 为 `1281602fd82b9cf4b03baa642a4a824a311438dc27af466447e107d21282bfd0`。升级计划 `16f9829865a2611801c985e62e648b6a` 完成 27 步。首次打包误用旧 `local` 工具写入 Host API 6，被预检拒绝；改用生产外壳同版 `sup2api-gateway:0.1.125` 打包为 Host API 7，原失败制品保留，没有绕过兼容检查。
- 用户要求先关闭插件包签名检查。核对发现四节点已有 `SUB2API_PLUGIN_VERIFY_SIGNATURES=false`，本次沿用该开关。旧插件签名私钥缓存缺失，新 ccgateway 包采用独立构建密钥生成包封装；旧 trust 元数据与其余五个 builtin 包字节保留。**重新开启插件验签前，需要使用可信密钥重新签发该包，或完成明确的信任迁移。** Core release 仍由原发布私钥签名并正常验签导入。
- 管理 API 回读 `pinned_version=2.1.302`、`auto_update=false`，Worker build 为 0.1.58、源码 revision 一致、`modified=false`，runtime `up_to_date=true`。四入口 `/readyz` 均 200，实际前端 `CCGatewayView-D2CTSQjF.js` 与构建产物一致。

### 9.1 透明出口修复

重建 21 号时再次确认：DNS、路由及 Worker 健康，但 Docker `DOCKER-INTERNAL` 按原始公网目的 IP 丢弃已送往代理 MAC 的桥接帧，导致 `_activate` 网络探测失败。增加宿主部署服务 [ccgateway-bridge-guard.py](../../../deploy/gateway/ovh/ccgateway-bridge-guard.py) 和 [systemd unit](../../../deploy/gateway/ovh/ccgateway-bridge-guard.service)，版本 `41794f07b2561981f70db8df7127928253431244`。

服务只管理 `CCG-PROXY-BRIDGE` 链与一个 `DOCKER-USER` 跳转，按运行中的账号身份、internal 网络、默认代理网关、双方 IP 和物理 veth 对生成规则：账号 TCP 只允许桥接到指定代理 peer，回包必须为 established/related。不放开宿主直连，不改默认路由或全局 sysctl；代理命名空间中的 TPROXY、input/forward 隔离继续生效。每 3 秒刷新，处理容器重建/删除；某个账号的 PID 在刷新中消失时仅撤掉该账号规则，不清空健康账号规则。新增 6 项测试覆盖身份、网络、端点变化和此竞态。

服务已启用为 `/etc/systemd/system/ccgateway-bridge-guard.service`，程序安装在 `/usr/local/libexec/ccgateway-bridge-guard.py`。当前 OVH Docker 网络模式需要此宿主配套服务；仅复制 Worker/Controller 镜像到另一台采用相同 internal 桥接过滤的主机，不能认为透明出口自动可用。

### 9.2 正式验收与恢复材料

1. 官方 Windows CC 2.1.302 经生产 21 号调用 `claude-opus-5-5`，完成一次 Read 与两次模型请求，17 秒正常退出，工具错误为 0，项目文件和 Git diff 不变。
2. 通过生产 Controller 新建独立草稿容器，先 build 后 direct；两次均 ready、CLI 2.1.302、创建时禁更，真实 API 均返回 200/OK。测试完成后删除此草稿（HTTP 200），未改生产 21 号的模式。
3. 对专用探测目标进行断路验证：代理 peer 丢弃该流时请求超时；将该目标临时路由到 Docker 宿主网关时也超时；恢复指定代理路径后返回 204。测试规则和临时路由均已移除。该测试针对探测流，不声称穷尽所有网络故障场景。
4. 脱敏结果见 [正式部署验证](cli-research/2.1.302/production-deployment.json)。服务器私有备份在 `~/sup2api-managed/backups/ccgateway-302-0.1.158/`，包括已验证恢复目录的 PostgreSQL dump、控制器状态/环境、21 号数据卷及旧 CLI/Worker 程序；构建日志在 `~/sup2api-managed/stage/0.1.158/`。

当前仍保留第 5 节的 API Key-only、build 默认值和 mods 兼容边界。`count_tokens` 不支持的 404 也未在本次发布中补齐。
