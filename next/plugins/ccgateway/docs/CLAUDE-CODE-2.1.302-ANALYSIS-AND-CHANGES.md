# Claude Code 2.1.302 分析与改动记录

> 2026-10-19 最新上线：Core **0.1.168**、ccgateway/Controller/Worker **0.1.66**、CLI **2.1.302 / ccgateway-v10-raw-http-errors**。上游 HTTP 错误状态/正文原样透传，非 JSON、空正文和超长正文不再重新封装；仅本地转发失败生成错误。21/30/31/32 号均已固定新原生 ELF，公网 400 正文与 Worker 哈希一致，日志记录实际错误消息。详见第 15 节。

> 2026-10-19 0.1.165 发布：Core **0.1.165**、ccgateway/Controller/Worker **0.1.65**。Worker 区分调用方取消与自身超时，公网取消已验证为 Core 499/client_canceled、Worker 保留已发 HTTP 200 并记录 client_canceled。CLI 沿用第 13 节的 2.1.302/v9 原生 ELF，SHA 未变；详见第 14 节。

> 2026-10-19 0.1.164 发布：Core **0.1.164**、ccgateway/Controller/Worker **0.1.64**；CLI 仍为 **2.1.302 / ccgateway-v9-stderr-errors**，已重新编译为新 SHA `e7f4c17a…a145f4`。修复字符串错误消息提取与中断类型，21/30 号已迁移并固定新 ELF；实现和验收见第 13 节。

> 2026-10-19 v9 首次上线：Core **0.1.162**、ccgateway/Controller/Worker **0.1.62**、CLI **2.1.302 / ccgateway-v9-stderr-errors** 将 HTTP 错误和 CLI 本地异常改为结构化 stderr；Worker 封装 HTTP 错误，正常 JSON/SSE 仍走 stdout。协议与验证见第 11 节；v8 的“HTTP 错误正文走 stdout”描述保留作历史记录。

> 2026-10-19 v8 发布：Core **0.1.161**、ccgateway/Controller/Worker **0.1.61**，CLI **2.1.302 / ccgateway-v8-request-oauth** 已上线。request 支持原生 OAuth；30 号完整 CC 请求的 build/direct 与 21 号 API Key 回归通过。第 10 节取代下文 v7 的 API Key-only 限制和产物身份；不改变 direct 原文契约。

> 2026-10-19 更新：Core 0.1.160 / ccgateway 0.1.60 已移除可配置的 native 请求路径，仅保留 direct/build，默认 build；21 号已迁移并通过真实模型及本地 CC 工具回合验证。下文 native 模式部署描述属于 2026-10-18 的历史基线，当前模式规则见 [请求模式说明](REQUEST-MODES.md)。本次未改变 2.1.302 CLI 补丁本身。

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

补丁器为 [patch-cli-2.1.302.cjs](../companions/cli-mods/patch-cli-2.1.302.cjs)，输入模块哈希为 [302 profile](../companions/cli-mods/profiles/linux-x64-2.1.302.json)。统一入口仅分派到明确支持的版本，不放宽 296 的原有检查。实际修改 8 个模块，另校验导入依赖模块；复制 8 个支持模块（v9 新增 `ccgateway-request-error.js`），保存修改后哈希。

| 职责 | 302 定位 | 本次改动 |
|---|---|---|
| 命令入口 | `cli.js / Ge` | 普通主循环前识别 request；保留 fast-path policy；新增只读 `--ccgateway-info` |
| guest / host 工具注册 | `chunk-ctwws12s.js / bE`；`chunk-8242685m.js / hRr` | 传递 kind:native，按会话、名称增加或完整替换工具定义 |
| 工具目录和序列化 | `chunk-sdr1wqge.js / ka`；terminal `computeToolPool`；core `U$` | 合并 native 注册，revision 参与缓存；模型 Schema 不再被旧工具的转换器覆盖 |
| 参数与排队 | core `KQt/Khe/mxt`，`QZt`，streaming `addTool` | 跳过旧工具参数解析和批量拆解，保留字符串 JSON 解码，统一串行排队 |
| mods / hooks | core `jz`、`j7/aur/gDn/Fao/vhn` | tools 交给 mods，执行配置 hooks；无人处理返回错误，不回退原工具执行器 |
| 组件构建 | core `XPt → xRn → gRn/_A → TYr`；渲染 `$Fe` | 原生构建器返回 body 后退出网络循环，再发送一次；显式 system 消息保留 wire 字段 |
| beta | `chunk-yn324528.js / uLo/Y0r` | 显式 beta 在构建前进入原生描述符与策略检查，构建后合并能力 beta |
| 发送/认证 | `chunk-pmgddf3s.js / GU/CEe/Tae` | request 专用认证路径：显式 API Key 时隔离 CC/SDK 身份头；无 Key 时复用原生 OAuth 读取/刷新与 Bearer（见第 10 节） |

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
- request 现支持显式 API Key 与原生 OAuth 两条 Anthropic-compatible 路线（OAuth 实现见第 10 节）；选择 direct/build 的账号不再必须具备 API Key。OAuth 的可用性适用于已验证的原生 CC 请求形状，不表示上游接受任意简化的 Messages body。
- 原生认证头在最终 fetch 边界按认证路线校验。显式 API Key 路线仅保留 X-Api-Key、anthropic-version/beta、JSON Content-Type、Accept 和固定 UA，不沿用 CC/Stainless 会话头；OAuth 路线校验原生 Bearer 且禁止同时出现 X-Api-Key，保留 CC 生成的身份、SDK 和传输头，并合并认证 beta（见第 10 节）。两条路线都不沿用调用方凭证，自定义环境头不能覆盖认证或 beta。
- build 拒绝 JS 无法精确表示的整数；direct 保留有效 JSON 的原文数字。取消、超时与 SSE 输出沿用 v7 实际测试过的公共发送实现；v9 起 HTTP 错误与本地异常改走结构化 stderr 帧，不再写入 stdout 或成功 meta，详见第 11 节。

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
docker build -f worker/Dockerfile -t ccgateway-worker:302-local .
```

使用 Bun **1.4.3**，编译 CLI 和 hooks-worker 双入口。release 目录包含 manifest.json 和版本目录中的原生 ELF/补丁清单；它被 git 忽略，构建 Worker 前必须准备。Dockerfile 固定默认版本 2.1.302，并去除 Windows 打包可能带来的目录组写权限，避免控制器拒绝不安全的目录。目录不存在或版本缺失时构建/创建失败，不退回安装未修改官方 CLI。

- 当前补丁：`ccgateway-v10-raw-http-errors`。
- 当前 ELF SHA-256：`2b88af3a603846d1157206e84390216726e7e33555199ee7a66a201f09b1e905`（v10，第 15 节）；`e7f4c17a…a145f4` 属于第 13 节的 v9 修订，`b254b658…28152` 属于第 11 节的首次 v9 发布。
- 本机 ELF：`artifacts/claude-2.1.302/claude-linux-native` 是 2026-10-18 生成的 **v7** 产物（SHA-256 `b14a537bbaa1218f23ba7347151f52fb29654af1101ed4b935507b6beb2dc9d8`）；v8/v9 在 Linux 构建机产出，本机没有对应 ELF，重新构建前不要直接打包。
- 历史测试镜像：v7 轮次的 `ccgateway-worker:302-v7-final`、`ccgateway-controller:302-v7-final`；`302-v7-test` 属于该轮中间验证。当前构建示例使用本地中性 tag `302-local`，不代表已验收产物。
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

当时仍保留第 5 节的 API Key-only、build 默认值和 mods 兼容边界；API Key-only 已由第 10 节取代。`count_tokens` 不支持的 404 也未在本次发布中补齐。

## 10 request OAuth 支持（2026-10-19）

### 根因和实现

30 号原先在读取请求和发送网络之前，被 `request-command.js` 的 API Key-only 检查拒绝。Worker 丢弃 CLI stderr，界面因而只显示通用 502。原生 302 本身支持 OAuth，限制来自我们的 request 扩展。

- `request-command.js` 不再强制 `ANTHROPIC_API_KEY`。显式 Key 时仍向 `GU` 传 `ccgatewayAPIKeyOnly:true`，避免混选账号内的 OAuth；否则传 false，执行原生 `mle → Nn → hqn → mUs → CEe`，复用发送前刷新、凭证读取、订阅判断及 SDK Bearer 设置。没有自行实现 token 刷新或把 OAuth token 当 API Key。
- `patch-cli-2.1.302.cjs` 从原生 `chunk-yn324528.js / Ake.header` 获取认证 beta（当前值 `oauth-2025-04-20`），传给 request 入口。原生 `FYn/kte` 的描述符体系同样使用 Ake；不复制 token、不放宽 baseline 哈希校验。
- `authenticatedRequestHeaders` 在最终 fetch 边界分流：API Key 保持原最小头集合；OAuth 校验原生 Bearer 且禁止同时出现 X-Api-Key，保留 CC 生成的身份、SDK 和压缩等传输头，合并显式/构建 beta 与 OAuth beta。CLI 请求入口继续移除 `ANTHROPIC_CUSTOM_HEADERS`，调用方仍不能通过 `--header` 注入 Authorization、X-Api-Key 或身份头。
- `model-request.js` 仍单次发送，direct 的 JSON 原文不变；build 的组件/附件规则不变。响应 meta 中的 `authProfile` 与 `betas` 来自最终 fetch 头，只有模式/认证类型/功能名，不包含凭证。Worker 目前仍不持久化该 meta 或最终出站 body/header；其 request.body 是入站请求，build-components.json 是组件输入。
- 新身份 `ccgateway-v8-request-oauth`，新增 `request_oauth` capability。发布物由 Bun 1.4.3 双入口编译成原生 Linux ELF，SHA-256 为 `339e2e0d2df25fb89181b30c1e5c00b463b72729103038705b1210ddd197cd9a`；没有交付裸 JS。

### 验证与边界

27 项支持模块单测通过；原生 ELF 的模式/传输回归通过。组件 probe 更新了旧的“缺 API Key 必须失败”预期，13 个场景覆盖 OAuth build/direct、客户端 beta、环境头隔离和 direct 原文字节保留。

30 号授权用量接口返回正常，不能把此前 502 解释为订阅无效或额度耗尽。实测有以下差异：

1. 简化 Messages 请求使用空 system 时，OAuth build/direct 均得到上游 HTTP 429 `rate_limit_error`，有上游 request-id。补充 Claude Code beta 本身没有让简化 direct 请求成功。上游没有提供更具体的拒绝原因，不能断言所有 429 都由某一个字段造成。
2. build 使用字符串 systemPrompt 的原生提示构建路径时，`claude-opus-5-5` 返回 200。该路径原本就包含原生提示构建行为，不是在此次补丁中新写身份文本。
3. 更新后的正式 30 号 Worker 默认 build。完整 CC 客户端通过其 8787 入口发送请求，HTTP 200、约 5.9 秒，返回 `REAL_CLIENT_OAUTH_OK`，modelUsage 只有 `claude-opus-5-5`。该客户端使用同版编译 CLI 的常规 `-p` 路径和独立临时配置，没有运行工具。
4. 将第 3 项 Worker 日志中保存的完整入站 body 和 beta 交给正式 CLI `request --direct` 原文重放，HTTP 200、SSE 有 message_stop，返回同一标记。此项验证 direct CLI；正式 Worker 配置保持 build，没有切全局模式。
5. 21 号 API Key 在候选 ELF 上的 build/direct 均 200；上线后正式 Worker 再次以 `claude-opus-5-5` 返回 `APIKEY_21_V8_OK`。

因此支持 OAuth 的结论适用于已验证的原生 CC 请求形状，不等于任意简化 API 请求都会被订阅上游接受。原简化账号测试仍可能显示上游 429；request 不自动改模型、不向 direct body 注入 system。原生发送前刷新调用已恢复，本次没有故意破坏真实凭证测试过期 token/401 恢复，也不宣称恢复了完整 Agent 重试/回退循环。

临时 Worker 曾尝试在同容器的 8788 监听验证，但账号隔离规则只允许业务 8787 的 loopback，健康探测被阻断，不能计为功能通过。随后使用正式允许的 8787 完成第 3 项；临时进程已停止，没有放宽防火墙。

### 正式发布

源码 `437feaabc9d3329738139e83e2011c7131b3779c`，Core 四节点 **0.1.161**，插件、Controller、Worker **0.1.61**。release `v0.1.161`，manifest `ed1e2add33e61b7ff7d7684fdedd42a3f4e4b564d4a22f8dd42f23f5c2eda696`，升级计划 `03ed4fac1d8f457eb2a31222949a65ba` 完成 27 步。Core SHA-256 为 `bc2c664e3f3a24c507017078fd99e6d0fedbe04636024ec76a8245fddec84fad`。

同一个 2.1.302 版本的新补丁不会只靠版本号触发现有容器替换。本次在空闲时停止并暂存 21/30 旧容器，由正常账号同步使用新镜像重建，保留原专属数据卷、授权和网络。确认新容器的 ELF 哈希、patch、features、Worker revision、禁更状态与真实调用后，仅移除本轮临时保留的旧容器，未删除数据卷。停止的历史账号和共享出口身份/启动时间未变。

四节点 ready 200，模式均为 build，runtime up_to_date；新创建账号选择 0.1.61 镜像中的 v8 CLI，禁更保持。插件验签开关和 release 签名策略沿用原部署，未改其他 builtin 包。备份位于 `~/sup2api-managed/backups/ccgateway-request-oauth-0.1.161/`，数据库恢复列表及 21/30 卷归档已验证；原生构建和测试记录位于 `~/sup2api/checks/ccg-302-v8/`。

脱敏证据见 [OAuth 发布验证](cli-research/2.1.302/oauth-deployment-0.1.161.json)。

## 11 stderr 错误协议（v9）

CLI 到 Worker 的错误通道改为一行 `CCG_REQUEST_ERROR ` 前缀加 JSON，协议版本为 `ccgateway.request.error.v1`。例如：

```text
CCG_REQUEST_ERROR {"protocol":"ccgateway.request.error.v1","source":"http","status":429,"error":{"type":"rate_limit_error","code":"provider_quota","message":"quota exceeded"},"headers":{"retry-after":"7"},"body":"{\"type\":\"error\",\"error\":{\"type\":\"rate_limit_error\",\"code\":\"provider_quota\",\"message\":\"quota exceeded\"}}"}
```

`status` 是 HTTP 状态，`error.code` 优先使用上游 code，缺失时使用 error.type；`source` 区分 http/input/transport/timeout/interrupted/internal。HTTP 错误退出码为 2；本地异常为 1，信号中断为 130。fast-path policy 明确拒绝时输出 403 / cli_policy_denied；进程崩溃或缺失有效错误帧由 Worker 生成 502 / cli_process_error。

上述 interrupted/130 指 CLI 自身收到并处理 SIGINT/SIGTERM。Worker 使用 `exec.CommandContext` 默认的 Process.Kill（Linux 上为 SIGKILL）取消子进程，不能依赖 CLI 信号处理器生成该帧；Worker 的调用方取消和自身 deadline 分别在本地识别，见第 14 节。

- **HTTP 非 2xx**：原生 SDK 抛异常前保存的 Response 仍是事实来源。CLI 读取错误正文，输出 stderr 错误帧，stdout 不输出错误正文，也不写成功 meta。复用的 meta 路径在开始时清除，避免残留上一次成功状态。
- **正常 JSON/SSE**：保持 meta 状态/响应头加 stdout 响应字节，不解析或改写 SSE。上游 HTTP 200 中原本就有的 `event:error` 是 SSE 协议内容，仍原样传递；不会伪造一个新的 HTTP 状态。
- **本地异常**：输入/构建错误为 400 / cli_invalid_request，超时为 504 / cli_timeout，连接异常为 502，提供可用的原生机器错误码（如 ECONNRESET）或 cli_transport_error。任意异常 message/stack 可能包含凭证或代理 URL，因此不直接下发，使用固定公开说明。
- **Worker**：持续消费 stderr，仅接受一个完整、版本正确、字段合法的协议行；普通日志丢弃。错误行限 512 KiB，错误正文限 64 KiB，超大、重复、损坏的协议帧不会作为有效响应。收到错误帧后按其状态写 HTTP；完整合法上游 JSON 错误正文保留原文字节，否则生成 Anthropic 格式的 type/code/message 错误对象。
- **响应头**：只保留 request-id、anthropic-request-id、retry-after、x-should-retry、anthropic-ratelimit-*、anthropic-fast-* 等已允许事实头；不带出 Authorization、Cookie、压缩/分帧头以及 Connection 指定的逐跳头。
- **响应已开始后失败**：不能重写 HTTP 状态或在半截 JSON/SSE 后追加普通 JSON。Worker 记录 stderr 错误并中断 HTTP framing；Core 的 ccgateway 路线在完成已有用量、账号和粘性处理后，也中断客户端响应，避免把上游中断转换成正常 EOF。已经发出的 HTTP 200 保持 200，日志以 response_interrupted/error_code 标明失败，不重放已开始的请求。
- **日志**：修复 diagnosticWriter 只写 http_status、却未更新 status 的问题。普通 HTTP 400/429 等在 metadata.json 和 request_finished 中记录真实状态；新增 cli_error 事件，保存 status/code/source/response_started，不保存任意 native stderr。

新 Worker 兼容旧 CLI 的 meta + stdout HTTP 错误协议，便于滚动更新；新 CLI 的结构化错误需要新 Worker 才能解释，因此正式账号容器应同时更新 Worker、ELF 和固定 SHA/patch。Controller 的原始连接/隧道无需新增错误解析；Core 原有错误策略仍可能重试或切换账号，最终返回被选中的失败，已提交响应不重试。

本次未承诺无限制错误正文、任意异常原文透出，或在 HTTP 200 已发送后把状态改为 4xx/5xx。

### v9 构建、部署与验收

实现提交 `d11bb221ee85ae39a9a63b737a8a0cbce5d02e11`；最终发布源码 `de02308b9808763c3861f62e35e88b145cd2ed65` 追加 Core 流中断传递和完整 Worker/ELF 组合回归。CLI 继续使用 Bun 1.4.3 编译原生 ELF，SHA-256 `b254b6580a341d94a607bf02c1535e72a8ee384f655a902ffc33324279a28152`，声明 `request_error_stderr` 能力。

30 项 JS 支持模块测试、Linux Engine/Worker 测试和 Core 针对 HTTP 错误/流中断的回归通过。原生 CLI transport probe 为 20 个场景，mode probe 9 个、component probe 12 个；真实 Worker 加原生 ELF 的 build/direct 两组均通过，覆盖 400/401/403/429/500/529、错误头、普通 stderr 忽略、无效 beta、本地超时、流中断及日志状态。中断用量仍计入账本，已发出的回合没有被重试。

正式 Core 四节点 **0.1.162**，插件/Controller/Worker **0.1.62**。release `v0.1.162`，manifest `3a8108c53d3f4715f888448e9fcd1abfca532054454e673b5e1b3ef95807051b`，升级计划 `68b70bc5e548e9ff9ae98c7ef187715f` 完成 27 步。Core SHA-256 `e6f1a1c293009a455fba3e357011ddf196266a0e649be4bbec9e0c0a2bd18240`。21/30 号更新为新容器，固定 v9 CLI，保留数据卷/授权，默认 build、禁更保持。共享出口和停止的历史账号未改动。

- 公网入口经 21 号实测上游 HTTP 400：客户端和 Worker 响应 body SHA-256 均为 `1a8d8b45ac9a61551d80700981a301ccb23aa5a553f73e873073b7033d7ffa13`，错误正文没有丢失。metadata.status/http_status、cli_error 和 request_finished 均为 400。该转发上游的原始 error.type 为字符串 `<nil>`，原值保留，未伪造供应商错误码。
- 单独运行正式 CLI direct 的同类错误：退出码 2，stdout 0 字节，无成功 meta 文件；stderr 错误帧包含 HTTP 400、code/message 和原错误正文。
- 公网正常 SSE：HTTP 200、9 个事件、完整 message_stop，输出 `STDERR_V9_PUBLIC_STREAM_OK`。Worker 直连正常 SSE 也通过。
- 30 号完整 CC 客户端经正式 build Worker/OAuth，以 `claude-opus-5-5` 正确回答法国首都为巴黎，未降级。此前固定标记测试出现模型拒答及原生模型回退，不计为目标模型成功；它是正常 HTTP 内容，不能误判成 stderr 传输失败。

私有备份位于 `~/sup2api-managed/backups/ccgateway-stderr-errors-0.1.162/`，数据库 dump 和 21/30 卷归档已检查；测试/构建记录位于 `~/sup2api/checks/ccg-302-v9/`，发布构建在 `~/sup2api-managed/stage/0.1.162/`。仅移除了本轮临时保留的旧容器，未移除数据卷或生产孤立资源。脱敏证据见 [stderr 发布验收](cli-research/2.1.302/stderr-deployment-0.1.162.json)。

## 12. 账号测试请求与原始错误展示（0.1.63）

30 号旧测试请求为 `max_tokens:64`、单条 `ping` 且没有 system，实测收到 HTTP 429，错误码 `rate_limit_error`、message `Error`。同账号以普通字符串 system `Answer the user concisely.` 和问题 `What is the capital of France?` 经内建 build 构建后，收到 HTTP 200 并回答 Paris；有无显式 claude-code beta 均成功。该 A/B 只证明两种请求形状的观测结果，不解释上游 429 原因。

插件 `BuildTestRequest` 改用内部 `https://ccgateway.internal/v1/ccgateway/probe`，保留用户选定模型，设置 max_tokens 128。Core 只允许 ccgateway 的 managed/apikey 类型访问此精确虚拟 URL。Worker 认证后识别 probe，局部使用 build，复用 `messagesBuildComponents` 和既有原生 ELF 的 `request --build`；无 Agent 循环、无模型替换、无手写 CC 身份。Worker 日志记录 configured_mode、mode、probe，测试结果返回 test_mode=native_build。

这次没有修改 CLI 字节：继续使用 **2.1.302 / ccgateway-v9-stderr-errors**。业务 `/v1/messages` 路径与 direct 原始 body 透传保持；内部账号探测不能代替业务 direct 请求验收。

Core 账号测试保留实际状态、错误码、正文及白名单响应头。没有响应错误码时不合成 http_XXX。对 HTTP response 错误，不返回或持久化插件推导的 reason/effect，前端也屏蔽旧结果中的推导字段；不补充“原因未知”“配额耗尽”等解释。分类仍用于区分本地故障来源，业务请求的原有分类/调度策略不变。

### 发布验收

发布源码 `80d734868ac9c66ef3939fd2cb9a02aa9b2f170a`；测试专用后续提交 `b58531c38` 修正 API Key 入口的原生 Agent SDK 身份断言，没有修改运行代码或 ELF。Core **0.1.163**、插件/Controller/Worker 程序 **0.1.63** 已上线，升级计划 `711828d791bcb388e9a96dd8fb824aa9` 完成 27 步。四节点版本、核心哈希和实际 AccountsView 前端文件均验证一致。

- 前端类型检查及 34 项测试、插件/Engine 回归通过；Core account/ccgateway 包在隔离 PostgreSQL 上通过。原生 ELF 加正式 Worker 的 build/direct 组合通过，包含真实错误转发及新增探测；direct 业务 body 逐字节一致。
- 经前端同一 `/accounts/:id/test` 接口，21、30 号所选 `claude-opus-5-5` 均返回 HTTP 200、test_mode=native_build，正文为 Paris。升级过程中首次 21 号调用赶在异步插件激活完成前，仍是旧 ping 请求；已在四节点激活 .63 后重测，未将旧结果作为本次验收。
- 21/30 原容器、卷、授权和 CLI 哈希保留，Worker 程序原地升级；容器的基础镜像标签仍为 .62，未来创建目标镜像为 .63。默认 build、禁更设置保持。共享出口、停止的历史账号未变。
- 私有备份 `~/sup2api-managed/backups/ccgateway-probe-0.1.163/` 的数据库与卷归档已检查；构建位于 `~/sup2api-managed/stage/0.1.163/`，验证位于 `~/sup2api/checks/ccg-probe-163/`。

脱敏证据见 [账号探测发布验收](cli-research/2.1.302/account-probe-deployment-0.1.163.json)。

## 13. v9 错误元数据修订（0.1.164 / 0.1.64 已发布）

本次修订 `request-error.js` 的错误元数据提取：同时支持顶层 JSON 字符串（如 `"quota exceeded"`）和字符串 `error` 字段（如 `{"error":"quota exceeded"}`），保留已有对象错误的 message 提取；不改写错误帧保存的原始 body。input/build/transport 阶段发生信号中断时统一使用 `source=interrupted`、HTTP 502、`type=api_error` 和 `code=cli_interrupted`，避免沿用输入阶段的 `invalid_request_error`。

补丁名称仍为 `ccgateway-v9-stderr-errors`，但源码修订需要重新构建原生 ELF、生成 release manifest，并以新 ELF SHA-256 和 patch 固定账号容器；同版本号或同补丁名不能证明修订已应用。第 11、12 节的 `b254b6580a341d94a607bf02c1535e72a8ee384f655a902ffc33324279a28152` 是此前发布的 v9 身份。本次以源码 `a9d6a0678baf0115062a97c8547ff6b3ecdbad80` 在 Linux 使用 Bun **1.4.3** 重新编译双入口原生 ELF，新 SHA-256 为 `e7f4c17a942fc9d54368053a6fb84169cdfc41b88ad2e8c4b3ae52b370a145f4`。

完整且有效的上游 JSON 错误仍原样返回；超长响应按既有 64 KiB 边界处理。当保留的 JSON 前缀含字符串 error 时，新提取逻辑也用于 Worker 重新封装的错误，不再丢失原消息。未增加配额原因推断或错误解释。

### 原生验收和部署

- 34 项支持模块测试通过。新 ELF 的传输探针 25 个场景、模式探针 9 个、组件探针 12 个均通过；新 Worker 与新 ELF 的 build/direct 两组各发送 13 次模型请求，覆盖两种字符串正文的完整与超长情况、客户端响应和错误日志。direct 业务 body 仍逐字节一致。
- 信号探针以成功 meta 清理确认处理器已安装，验证模型请求发出前中断的 exit 130、HTTP 502、api_error；input/build/transport/output 的字段一致性由单元测试覆盖。首次模式探针与构建共用 CPU 配额，在发出 HTTP 前触及外层 1.8 秒保护时限；保留该失败证据，使用独立 CPU 配额重跑未改动的探针后，9 个场景全部通过。
- Core 四节点 **0.1.164**、插件/Controller/Worker **0.1.64**，升级计划 `4d0540074139ded00682db922346cfba` 完成 27 步。四节点 Core 哈希、ready、插件激活版本及实际前端文件已核对。
- 21/30 app 容器逐个迁移至 **ccgateway-app:0.1.64**，固定新 ELF SHA，保留授权环境、专属卷、固定 IP 和安全配置。不是只替换 Worker 程序：旧容器分别保留为 `ccg-21-app-rollback-errors164` 和 `ccg-de046df67b4908784-app-rollback-errors164`，均停止并断网。未来镜像目标为 .64；默认 build，CLI 2.1.302 禁更。共享出口和原有停止账号未变。
- 两账号均经实际账号测试接口调用 `claude-opus-5-5`，HTTP 200、回答 Paris。公网正常 SSE 为 200 且含 message_stop；真实上游 400 的客户端正文与 Worker response.body SHA 一致，metadata 的 status/http_status 均为 400，上游错误码原样保留。
- 私有备份位于 `~/sup2api-managed/backups/ccgateway-errors-0.1.164/`，数据库与账号卷归档已检查，并备份 Controller 状态；构建在 `~/sup2api-managed/stage/0.1.164/`，原生测试与产物在 `~/sup2api/checks/ccg-302-v9-r3/`。

脱敏证据见 [错误元数据修订发布验收](cli-research/2.1.302/error-metadata-deployment-0.1.164.json)。

## 14. Worker 区分调用方取消与自身超时（0.1.165 / 0.1.65 已发布）

`serveRequestCommand` 等待子进程结束后，先检查父请求 context。父请求取消/到期或派生 context 为 Canceled 时，记录 `canceled=true`、`error_type/error_code=client_canceled`、`error_source=client`，不把已取消请求误判成 CLI 错误或超时。未发出响应时仅诊断 status 为 499，不向已离开的客户端写 JSON 或隐式成功响应；已发出响应时保留原 status/http_status（例如 200），并置 response_interrupted。两种情况均以 ErrAbortHandler 结束处理。

父请求仍有效、Worker 自己的 WithTimeout 到期且没有有效 CLI 错误帧时，记录 `cli_timeout`、`error_source=timeout`；尚未发响应则返回 HTTP 504，已发响应则只记录原因并中断 framing。真实上游错误帧仍按既有协议处理。request_command_failed 事件分别记录 cancelled/timed_out，不再把 deadline 统称为取消。

保留 Process.Kill、WaitDelay、并发槽位与临时目录清理，以及解除阻塞响应写的机制；不改为 SIGTERM，也不在调用方离开后继续读取上游补齐 usage。Core 的取消分类、重试策略及已捕获用量结算保持。关闭请求只能证明本地连接与进程被中止，不能证明供应商立即停止计算或计费。

本次仅修改 Worker 和相关测试/记录，CLI 继续使用第 13 节的原生 2.1.302/v9 ELF（SHA `e7f4c17a942fc9d54368053a6fb84169cdfc41b88ad2e8c4b3ae52b370a145f4`），无需重新编译 CLI。

### 发布与验收

源码 `0cf7e18aa905a72679a607f80786a73f4d0f3b50`，Core **0.1.165**、插件/Controller/Worker 程序 **0.1.65**；升级计划 `cd2f180e3b3dd65c0c09a7d6cf40f7a5` 完成 27 步。四节点核心版本、哈希、ready、插件激活和前端文件均核对一致。

- Windows Engine 全量、Linux Engine/Worker 全量测试通过。新增 16 个真实子进程与 HTTP 场景，覆盖 direct/build、响应前后、客户端取消、已有错误帧时取消、Worker deadline、父请求 deadline；校验无隐式成功响应、无追加错误 JSON、并发槽位释放和临时目录清理。
- 新 Worker 与既有原生 ELF 的 build/direct 组合均通过，每组 15 次模型请求，包含响应前后真实客户端取消；模拟上游连接关闭、取消日志以及后续正常请求均已验证。此结果不代表供应商后台计算或计费立即停止。
- 公网测试经 21 号，在收到首个 SSE 事件后关闭客户端连接：Worker metadata 保留 status/http_status=200，canceled=true、error_type/error_code=client_canceled、error_source=client；request_command_failed 为 cancelled=true、timed_out=false。Core 同一 request_id 的记录为 HTTP 499、client_canceled、attempts=1，没有重试；捕获用量为 input=71/output=0，这不是供应商最终消耗或零输出计算的证明。
- 21/30 号真实账号测试均用 `claude-opus-5-5` 返回 HTTP 200、回答 Paris；公网正常 SSE 完整结束。真实 HTTP 400 经 30 号返回，客户端与 Worker response.body SHA 一致，保留上游 invalid_request_error 和正文。
- 21/30 仅原地更新 `/usr/local/bin/worker`，Worker SHA 为 `e33ec9e6cbce45a94fca03e9d9e23effaa058324877f4b71e45725dff60c1011`。容器 ID、Config/HostConfig、授权、卷和 CLI SHA 均未改变；基础镜像标签仍 .64，未来创建目标镜像 .65。默认 build、CLI 禁更保持。旧回滚容器、其他停止账号及共享出口未变。
- 私有备份位于 `~/sup2api-managed/backups/ccgateway-cancel-0.1.165/`，包含已检查的数据库/卷归档和 Controller 状态；Controller 的 Worker 更新操作还自动保留旧 Worker 程序。构建位于 `~/sup2api-managed/stage/0.1.165/`，测试与验收位于 `~/sup2api/checks/ccg-cancel-165/`。

脱敏证据见 [取消分类发布验收](cli-research/2.1.302/cancellation-deployment-0.1.165.json)。

## 15. v10 上游 HTTP 错误原样透传（0.1.168 / 0.1.66 已发布）

本节取代 v9 对非 JSON/超长 HTTP 错误重新封装的行为。真实上游 HTTP 错误的状态码、正文和 Content-Type 保留；JSON 不重序列化、不新增 code，文本、HTML、空正文和非 UTF-8 字节同样透传。只有本地输入校验、连接/超时、正文读取失败、CLI 协议/临时文件故障等本系统错误才生成错误结构。重试及账号状态策略仍可执行，但最终选择返回的上游响应不由错误分类器改写。

- CLI `readModelResponse` 增加内部字节读取模式，默认文本模式保留给既有 mods。`request` 错误分支使用字节模式；带 `--response-meta P` 时，将完整原始错误体写入请求临时目录的 `P.error-body`，完成后才输出 stderr 帧。帧仍为 `ccgateway.request.error.v1`，新增 `bodyFile=true`、`bodyBytes`；64 KiB 只作为诊断消息提取前缀，不再限制客户端正文。没有 meta 路径的直接命令行调用在帧里提供完整 `bodyBase64`。stdout 仍只包含成功 JSON/SSE。
- Worker 根据自己创建的 meta 路径打开 sidecar，不接受 CLI 提供任意文件路径；检查普通文件和完整长度后按原字节发送。无 JSON 合法性要求，不把空正文替换为 envelope。若文件缺失、不完整或协议损坏，则作为本地转发错误返回 502。请求结束清理临时目录；已有取消/超时语义保持。
- Core 将错误分类前缀与完整响应分开：小正文保留在内存，大正文写入私有临时文件，最终发出原始状态/正文，结束时删除文件（含重试与取消）。读取中断不会伪装成完整的上游 HTTP 错误。兼容路径和 Execute 回调路径均使用同一保留逻辑，跨协议错误也不重封装。
- 用量日志从 `error.message`、顶层 message、字符串 error 或原始文本提取真实消息，与客户端正文渲染分离；`error_type=upstream_error` 仍是 Core 内部故障类别。客户端得到的上游 error.type/code 不变。没有消息的正文不补充猜测原因。

补丁身份为 `ccgateway-v10-raw-http-errors`，增加 `request_raw_http_errors` 能力；必须重新构建原生 Bun ELF 并更新 CLI SHA/patch 固定，单独更新 Worker 或 Core 不能升级旧 CLI 的 64 KiB 行为。诊断字段会转义数据库不接受的 NUL/非法 UTF-8；客户端正文仍使用未经改变的字节。此前各节的 v9 SHA 和验收记录保留为历史事实。

### 发布与验收

- Core 源码 `9c690dcbbf9b958a36d6281e1d8a3aec93989b32`，运行环境源码 `234840c2c5a6c614377b1621d64aecc10aa92bb0`。后一个 Core 提交仅补充诊断存储处理，不改变运行环境源码。Bun 1.4.3 编译双入口原生 ELF，SHA-256 为 `2b88af3a603846d1157206e84390216726e7e33555199ee7a66a201f09b1e905`。
- 36 项支持模块测试通过；Windows Engine 全量和 Core 专项通过，Linux Core gateway/Engine/Worker 全量通过（数据库使用隔离 PostgreSQL）。原生 CLI + Worker 在 direct/build 各层共 32 个场景通过，涵盖 JSON、HTML、文本、空正文、非法 UTF-8、180 KiB 错误正文、成功 JSON/SSE；HTTP 状态、Content-Type 和正文均核对。首次 Worker 探针 10 秒启动等待不足，扩大等待至 60 秒后对相同二进制验证通过，未修改就绪检查。
- 四个 Core 节点升级至 **0.1.168**，插件/Controller/Worker 为 **0.1.66**，升级计划 `8e642aab6dd95811fd4eb02fba7a32b3` completed/27，manifest `c6cdd7355d6ad6da43f7e3603f6f196842036609a82d4e1e4528ecd59b6677a0`。0.1.167 只完成构建，没有切换线上；最终版加入诊断存储修订后以 0.1.168 发布。
- 21/30/31/32 app 逐个迁移至 `ccgateway-app:0.1.66`，保留授权卷、环境、安全配置、固定 IP；旧 app 以 `-rollback-raw167` 后缀停止断网留作回滚。四账号均 ready，CLI 版本/patch/SHA 和 Worker build 校验通过，默认 build、禁更保持；未来创建目标镜像同为 .66，共享出口未变。
- 公网真实请求 `2647d19ad8e76527c2198cd7` 经 32 号返回 HTTP 400，原始 `invalid_request_error` 与 `top_p: range: 0..1` 均保留；客户端正文和 Worker response.body SHA-256 同为 `e0f1000425018590e0678903a4424ffd8bb799b7d0b07df680602183cbdce63a`。Core 用量日志记录实际消息、attempts=1。
- 备份在 `~/sup2api-managed/backups/ccgateway-raw-errors-0.1.167/`。数据库/四账号卷归档已检查；Controller 全目录在线归档遇到文件变动，因此另外短暂暂停 Controller、保存并校验 `controller-config-consistent.tar.gz` 的配置快照，不把前一份在线归档当作一致快照。最终制品和验证在 `~/sup2api-managed/stage/0.1.168/`，原生测试在 `~/sup2api/checks/ccg-302-v10/`。

证据：[原生探针](cli-research/2.1.302/raw-http-errors-native-probe.json)、[发布与公网验收](cli-research/2.1.302/raw-http-errors-deployment-0.1.168.json)。

## 16. v10 对正常客户端使用的增量审核（2026-10-19）

`--build` 在调用原生构建函数之后，与 `--direct` 汇合到同一个 `openModelRequest` 和 `if (!response.ok)` 分支。因此 v10 的 HTTP 错误透传同时适用于两种模式；不是只修其中一个。成功响应仍走默认 `binary=false` 的文本/SSE 读取及 stdout，只有 HTTP 错误分支显式开启字节读取。请求组件、beta/认证、工具定义和本地工具循环未在 v10 增量中修改。

对服务器 v9-r3 与 v10 的实际补丁树逐项核验：8 个修改的原生模块中，7 个 after 哈希完全相同；唯一不同的 cli.js，在归一补丁名称和 `request_raw_http_errors` 能力字段后全文一致。8 个支持模块只有 model-request、request-command、request-error 变化；native-tools、request-build、request-input、request-options、request-output 均未变。这证明本次增量边界，不代表整个定制 CLI 等同官方实现。

新增运行验证：

- 官方 Windows **2.1.302** 原生客户端（官方基线 SHA `3ab075f7…3d2a0ae`），连接隔离的 Linux v10 Worker/CLI，在 build 和 direct 各完成一次两请求工具回合：模拟上游返回 Read，官方客户端本地读取临时文件，将包含标记的非错误 tool_result 送回，最后获得 `OFFICIAL_CLIENT_TOOL_LOOP_OK`。两种模式 exit=0，文件内容不变。没有使用真实订阅凭据或模型上游，也没有修改项目文件。
- 定制 v9/v10 分别直接运行普通 `-p`：纯文本均一次模型请求、exit=0；不加载 mods 时的 Read 回合，两者均两次请求，且都返回 `No tool.call mod handler answered Read`。这是此前全工具交给 mods、未处理不回退的行为；**不能把当前定制 ELF 当作无 mods 的官方普通 Agent 替代品**。
- v10 的 `runtime-probe original`（Bash/Read/TaskCreate/WebFetch 由 mods 接管）和 `hooks-update`（PreToolUse 改输入、PostToolUse 改输出）通过，均两次模型请求、exit=0。

结论：已验证官方客户端经网关的普通文本/Read 工具回合、request 成功 JSON/SSE、HTTP 错误透传，以及上述 mods/hooks 场景。没有发现相对 v9 的 Agent 回归；尚未逐项覆盖交互 TUI、resume、所有 MCP/hooks、所有模型和真实 OAuth 场景，不能声称“任何场景都绝对无影响”。此外 Core 修改覆盖通用 HTTP 错误路径：跨协议错误现在也保留上游正文，不再转换成调用方协议的错误 envelope，这是用户要求的行为变化。

证据：[正常客户端与 v9/v10 对比](cli-research/2.1.302/normal-client-regression-v10.json)。本轮仅审核和记录，没有再次改动运行逻辑或切换生产配置。

## 17. WebSearch / ToolSearch 原生机制与 build 兼容性审核（2026-10-19，存在未修复缺口）

本节先分析 2.1.302 未修改恢复源码，再对照当前 v10 原生 ELF。REA 成功解析选定的 3 个 JavaScript 文件（0 个解析失败），但关系图受选定范围和节点上限限制；不能据此声称完整调用图。关键函数再用 Babel AST 按函数/对象节点边界提取和检查；核心模块 SHA 与版本 profile 一致。原生工具代码只作为分析数据读取，未执行其中的指令文本。证据见 [REA 摘要](cli-research/2.1.302/search-rea-summary.json)。

### 原版 WebSearch

`chunk-3veydjj5.js` 的 WebSearch `create(...).call(...)`（恢复文件字符偏移 43340–48160）先检查会话搜索预算。普通本地分支创建独立搜索子请求：用户消息包含查询，工具为 `web_search_20250305` / `web_search`，`max_uses=8`，保留 allowed_domains/blocked_domains，强制 `tool_choice={type:"tool",name:"web_search"}`，通过原生 `XPt` 请求构建/发送链执行。querySource 为 `web_search_tool`，不建立独立的本地搜索引擎；原生认证、模型/effort 选择和 sticky betas 由客户端上下文提供。

它读取 `server_tool_use`、`web_search_tool_result`、文本和流事件；同文件 `fs` 将搜索结果收敛为 URL/title 与摘要，作为外层 WebSearch 的工具结果交回主模型。`ho` 还显示另一个 CCR 分支：调用 `zdo` 的 `route:"web-search"` 会话代理接口，不是普通 Messages 子请求。本轮未验证 CCR 专用路由。

### 原版 ToolSearch 与 API 服务端 tool search 是两套执行者

- 原生 ToolSearch 对象位于 `chunk-8242685m.js` 字符偏移 1492303–1501089，输入包括 query/max_results，依赖工具池、MCP 连接状态、会话工具状态与 sticky betas。支持 `select:` 按名称选择，也支持关键词搜索和等待正在连接的 MCP 刷新工具池。
- `OTr` 位于 `chunk-fgk2rzb0.js`，执行本地名称/前缀匹配和关键词加权排序（名称分段、描述、searchHint），不是调用 `tool_search_tool_regex_20251119` 服务端工具。`MD` 构造 matches 等结果，ToolSearch 的 `mapToolResultToToolResultBlockParam` 将 matches 映射成 `tool_result.content=[{type:"tool_reference",tool_name:...}]`。
- API 的 regex/BM25 tool search 则通过 tools 中的类型化定义声明给上游，由上游搜索带 `defer_loading:true` 的完整工具定义，返回 `server_tool_use` / `tool_search_tool_result`。官方接口说明：[Tool search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)、[Web search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)。API 上游实际是否可用还取决于模型、服务和账号资格。

### 当前 build 在哪里复用，在哪里丢失上下文

Worker `main.go` 在 RequestMode 非空时直接进入 `serveRequestCommand`，不会进入后面的旧 exchange/Agent 模拟搜索链。`messagesBuildComponents` 提取组件；`prepareBuildInput` 将非 custom 的工具定义放入 `extraToolSchemas`，自定义工具经 registerNative 创建临时工具对象；`buildRequest` 调用原生 `XPt`（源码适配前名 Kvt）构建一次请求。原生 `xRn` 将 custom schemas 与 extraToolSchemas 合并，补丁在真正模型循环之前截获构建结果；上游的服务端工具由上游执行，调用方本地工具由调用方执行。

**确认的 ToolSearch 缺口：**

1. 我们的 registerNative 设置 `isMcp:false` 和 `isDeferred`。但原生 `pBe` → `T`（`chunk-fm7w7yv5.js`）用于 engine placement 的字段是 `isMcp`、内置白名单和 **`shouldDefer`**，不读取 `isDeferred`。
2. `xRn` 调用 `t_r`/`b7e` 检查 ToolSearch，再据工具池算 Go（可延迟工具）。重建环境没有原客户端完整的工具/MCP/会话状态，上述属性不匹配会使 Go 为空；`xRn` 随后将 dn/useToolSearch 关闭，并在无延迟通道分支删除名称为 ToolSearch 的定义。
3. `gRn` 在 useToolSearch=false 时执行 `Jtt`/`MRn`：Jtt 删除用户 tool_result 内的 tool_reference，空结果改成 `[Tool references removed - tool search not enabled]`；MRn 重建 assistant tool_use，只留 type/id/name/input，移除 caller。
4. 原生 `DRn` 还会移除同一 assistant 消息中没有对应结果的 server_tool_use。对于正在等待客户端工具结果的程序化调用历史，本轮观察到 code_execution 的 server_tool_use 被删除。这是原生会话修复规则与转发外部 API 历史的边界不匹配，不能靠 HTTP 返回 200 判断正确。

### 当前 v10 原生请求抓包结果

使用当前 ELF `2b88af3a…b1e905`、假 API key、回环模拟上游，对 10 类输入分别执行 direct/build，共 20 次请求。核对工具定义、defer_loading、历史块、tool_reference、caller、引用信息及 beta；不是实际调用互联网搜索服务。

| 输入 | build 结果 | direct 对照 |
| --- | --- | --- |
| `web_search_20250305` 定义、max_uses、域名过滤、tool_choice | 保留 | 保留 |
| WebSearch 历史的 server_tool_use、结果、encrypted_content、文本 citations | 保留 | 保留 |
| `web_search_20260209` + code_execution 定义 | 定义保留；不代表动态过滤实际执行已验证 | 保留 |
| 服务端 regex/BM25 定义 + deferred custom 工具 | 定义及 defer_loading 保留 | 保留 |
| 服务端 tool_search_tool_result 内的 tool_references 历史 | 基础样例保留 | 保留 |
| 客户端 ToolSearch + tool_result/tool_reference | **ToolSearch 定义删除，reference 换成文本** | 保留 |
| 同上并设置 ENABLE_TOOL_SEARCH=true | **仍有相同丢失** | 保留 |
| 自定义客户端搜索工具 search_tools + tool_reference | **reference 换成文本** | 保留 |
| code_execution 发起客户端调用、tool_use 带 caller | **caller 和待完成的 server_tool_use 丢失** | 保留 |

服务端 tool_search_tool_result 的引用位于 assistant 服务端结果内部，不在 Jtt 针对的 user tool_result.content 内，所以基础样例通过；不能把该通过推广到所有客户端发现工具或程序化调用组合。WebSearch 子请求本身可承载，但如果外层客户端先依赖 ToolSearch 发现 WebSearch，会先受上述 ToolSearch 缺口影响。build 抓包也保留了客户端 advanced-tool-use beta，并由原生构建器追加 effort beta；它不是 direct 的逐字节零注入语义。

完整输入/实际构建结果和逐项差异见 [搜索兼容性探针](cli-research/2.1.302/search-build-compatibility.json)。所有样例 CLI 都 exit=0、模拟上游都返回成功，但其中 4 类 build 输入发生语义字段丢失，已明确标记为未通过，不能当成兼容性成功。

### 后续修复边界（本轮未实施）

首先修正 deferred 属性映射，但不能只加 ENABLE_TOOL_SEARCH 或全局强制开启原生搜索。build 应以调用方传来的工具声明、引用和 caller 为准，不用临时 CLI 的本地工具目录/会话状态删除它们。应在 ccgatewayBuildOnly/ccgatewayInput 边界约束 xRn 的 ToolSearch 过滤及 gRn/Jtt/MRn/DRn 的破坏性修复，同时保留原生附件渲染和请求构建；普通 Agent 路径不要随之改变。修复后要补官方 CC + MCP ToolSearch 完整回合，以及程序化调用/暂停续传的回归，不能只验证首个请求或返回码。

本轮只分析、抓包和记录；没有修改 CLI/Worker/Core 运行逻辑，也没有切换线上模式。现有 Core 0.1.168 / Worker 0.1.66 / CLI v10 的上述缺口仍存在。

## 18. WebSearch / WebFetch 的 thinking 参数失败（2026-10-19 确认，未修复）

第 17 节只验证了基础工具字段/历史块的保留，不能据此认定真实 WebSearch/WebFetch 可用。用户实际调用发生 HTTP 400 后，本轮结合生产日志、官方恢复源码的 REA/Babel AST 分析以及当前 v10 原生 ELF 出站抓包，确认以下问题。没有修改运行代码或部署。

### 生产请求证据

30 号账号在北京时间 16:11:34 的请求 `29b11161ac7ed59fc0679ec6`，以及 16:12:13 的请求 `4c7b44177899ec27f70048ef`，均收到上游错误：`"thinking.type.disabled" is not supported for this model. Use "thinking.type.adaptive" and "output_config.effort" to control thinking behavior.`

- 第一条 Worker 入站 body 已有 `model=claude-opus-5-5`、`thinking={type:"disabled"}`、`output_config={effort:"medium"}`、`web_search_20250305` 工具和强制 `tool_choice=web_search`，消息含原生 `Perform a web search` 提示。日志目录为 `1ff1032f-a484-43c0-acf0-bfa5bede0781`。
- 第二条也是相同 model/thinking/effort，但没有 tools/tool_choice，消息包含原生网页摘要模板 `Provide a concise response based...`，符合 WebFetch 后续模型整理请求。日志目录为 `3b4cfbd1-fe5f-42ff-8820-e253b8ecd96c`。该模型请求的 400 不能解释成网页 HTTP 抓取失败，也不构成网页内容完整抓取成功的证明。
- 两条请求的 `build-components.json.parameters` 均保留 disabled；客户端 billing header 标记版本为 2.1.299。这里直接观测的是 Worker 入站 body，不是客户端出网处抓包，不能仅据此排除更前面的模型映射等处理。
- 30/31 号的安全检查类辅助请求也曾以同样的 disabled 参数失败。影响不局限于上述两个工具。新错误透传链已把具体上游消息写入 Core 日志和返回客户端。

### 原生构建与当前补丁的差异

官方 WebSearch 的 `call` 在 `chunk-3veydjj5.js` 使用内部 `thinkingConfig={type:"disabled",mechanical:true}` 发起 `web_search_tool` 请求；这不等价于最终 HTTP body 必然发送 disabled。

官方 WebFetch 的 `call` 位于 `chunk-8242685m.js` 字符偏移 2533311–2541321，先调用 `Xdo` 获取页面；需要整理内容时进入 `nPt`（2519752–2520603），其 `querySource=web_fetch_apply`。后续 `QL` 选择辅助模型，`CYr`（3512189–3512779）同样使用 mechanical disabled 的内部配置调用 `AZ`。部分原生分支可直接返回原始页面内容，并非每一次 WebFetch 都发摘要请求。

`xRn` 用 `Vd` 获取模型能力，`Ijs` 处理 always-on thinking。mechanical disabled 不会被 Ijs 直接转换为 adaptive；最终 body 构造还会检查 `rejectsDisabled`，原生只在允许关闭 thinking 时生成 `{type:"disabled"}`。原生构造也会根据实际 thinking 状态处理强制 tool_choice 等约束。

当前 `request-build.js` 一方面将 thinking 映射为内部 thinkingConfig，另一方面 `request-input.js` 将 parameters（除 betas）完整放入 extraBody。补丁又在 `xRn` 中执行 `Na={...xz(rl),...Q.ccgatewayExtraBody}`，最终请求对象的 `...Na` 位于原生 `thinking:lf`、`tool_choice:MR` 之后。因此客户端显式 thinking/tool_choice 可以覆盖内置计算结果。复用原生构建函数并不等于这些参数最终经过原生兼容处理；简单把 disabled 文本换成 adaptive 也不足以验证强制工具选择、effort、历史 thinking 等组合。

### 原生 ELF 抓包与验证边界

使用第 15 节同一 v10 ELF（SHA `2b88af3a603846d1157206e84390216726e7e33555199ee7a66a201f09b1e905`），以假 key 和回环模拟上游，分别测试搜索型/摘要型请求，thinking 缺省/disabled/adaptive/enabled 四种输入，以及 direct/build，共 16 次：

- 显式 disabled 在两模式最终 HTTP body 中均保留；build 没有消除本次已被真实上游拒绝的参数。
- 缺省 thinking 时，两模式最终 body 均不含 thinking；build 不会无条件新增 disabled。
- 显式 adaptive/enabled 也原样保留；搜索型强制 tool_choice 同样保留。这里只证明出站形状，不代表模型接受这些组合。
- 模拟上游返回 200 是为了抓包，不能作为搜索、摘要或模型参数兼容成功的依据。本轮没有真实执行成功的联网搜索完整回合。

REA 分析了官方恢复目录内 `chunk-mam1wjsh.js` 和 `chunk-8242685m.js`，2 个文件解析成功、0 解析失败；父证据 `ev_3cc67173b33104c37cfe91bc789d062ee72bf0df1e12445857a34c3ba1c6c181`。其语义图达到节点预算而不完整，其余 2440 个文件未分析；这里的函数边界和具体语句由 Babel AST 独立提取核对，不把 REA 摘要当作完整调用图或运行证明。

脱敏抓包及生产字段证据见 [thinking 兼容性确认](cli-research/2.1.302/search-thinking-audit.json)。修复应限定 build 的原生参数映射与 extraBody 覆盖边界；direct 继续承担 body 透传，不暗中修正客户端参数。第 17 节的 ToolSearch/reference/caller 丢失仍需单独修复和完整回合验证。上述问题解决前，不应宣称正常 CC 客户端的全部工具均兼容。

## 19. v11 移除 build 的 extraBody 覆盖（已实现，未部署）

用户明确要求去掉 extraBody 整包覆盖。本节记录工作区实现及隔离验证；线上仍是第 15 节的 v10，第 18 节生产失败记录保持为历史事实。

- `request-input.js` 不再生成或返回 extraBody；`request-build.js` 不再传 ccgatewayExtraBody；302 补丁器删除对 `Na=xz(rl)` 的替换，恢复该处原生表达式。这里删除的是客户端 parameters 的覆盖机制，不删除 CC 本身的 xz 逻辑。
- 生成参数只通过原生接口传入：max_tokens → maxOutputTokensOverride，thinking → thinkingConfig，tool_choice → toolChoice，output_config.effort → effortValue。本次补充 temperature → temperatureOverride、output_config.format → outputFormat。最终请求采用原生构建结果，不再用原值恢复其已调整的字段。
- tools/extraToolSchemas、消息、附件和 system 组件继续使用现有通路；beta 继续通过独立的规范化/原生 beta 流程处理；direct 原始 body、认证、响应及错误透传代码未改。
- 不再存在任意参数兜底补传。未接到原生接口的字段（例如 top_p、stop_sequences、调用方 metadata，以及其他 output_config 扩展字段）不会因放进 parameters 就自动出现在出站 body；原生仍可能生成自己的 metadata 等字段。需保持这些字段原值时使用 direct。未新增另一层 body 合并或未映射字段拒绝规则。
- 296 补丁器同一覆盖锚点也移除，避免共享支持模块去掉参数后留下无效补丁；本轮没有重新构建或发布 296，不能把 302 验证推广给它。

补丁标识为 `ccgateway-v11-native-build-parameters`，package-release 同步要求此标识。已在 Windows 使用本机 Bun 1.4.3 以 `--compile --target=bun-linux-x64` 编译两个原有入口（CLI + hooks worker），生成实际 Linux ELF，不以 JS 脚本代替交付。ELF SHA-256 为 `14da5daf8e6ea2dc8aa7e39a0f2da38427543fa3bfb4ce66274c5e806ee4007e`；本机输出为 `artifacts/claude-2.1.302/claude-linux-v11`，已生成 `release-v11` 及固定 SHA/patch 的 manifest。远端只上传此编译产物，在 `/home/debian/sup2api/checks/ccg-302-v11/` 隔离执行，没有替换任何账号容器。

验证：

1. 支持模块测试 **37/37** 通过。新增构建边界测试覆盖 disabled/adaptive/enabled 参数映射，确认原生返回的 thinking/tool_choice/max_tokens/effort/metadata 结果不会被入参覆盖，并核对 temperature/format 映射及 beta 合并。
2. 官方 302 基线哈希、唯一补丁锚点、生成模块 AST 解析通过；Serena 对 request-input/request-build/302 补丁器返回空诊断；CodeGraph 当次连接关闭，改用已定位源码和 AST 核对。
3. 同一原生 ELF 在 Linux 使用假 key、回环模拟上游执行 **19 次请求**。搜索/摘要型 × 四种 thinking 输入 × direct/build 共 16 次；另有原生参数映射、未映射字段 build/direct 三次。所有 direct 对照按字节保持原始请求。
4. Opus 5.5 build 的 disabled 输入最终不再携带 thinking；强制 web_search 的 tool_choice 由原生改为 auto。adaptive/enabled 输入由原生生成 adaptive（该环境含 display=updates）。Sonnet 4.5 对照保留允许的 disabled、temperature=0.25 和 JSON Schema format，并将 max_tokens=1000000 按原生上限调整为 32000。不是全模型无差别删除 thinking。

证据见 [v11 原生构建抓包](cli-research/2.1.302/native-build-v11-verification.json)。本轮模拟上游只验证请求形状，不证明真实服务接受每个组合或 WebSearch/WebFetch 完整回合成功；第 17 节的 ToolSearch/reference/caller 问题未在本改动中修复。线上 Core/Controller/Worker/CLI 均未更新。
