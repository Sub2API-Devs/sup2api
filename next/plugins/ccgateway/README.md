# CCGateway 插件及配套组件

CCGateway 把 Claude Code 账号作为平台的 Anthropic Messages 上游：每个账号一个独立容器，容器里的 Worker 对每个请求运行一次定制的 Claude Code CLI，由 CLI 用 Claude Code 自己的函数组装请求、以该账号的身份发给 Anthropic。工具调用交回客户端执行，网关不运行 Agent 循环。

本目录归集同一插件的源码，但平台插件与远程容器组件分别编译、打包和部署。

## 当前版本

以 [ovh 发布记录](../../deploy/gateway/ovh/README.md) 最上面一条为准（2026-10-26）：

- 插件、控制器、Worker、出口 **0.1.105**（`manifest.json` 的 `version`，镜像与插件版本一起变）；插件要求核心 `>=0.1.172 <0.2.0`，线上核心 0.1.207。
- CLI **Claude Code 2.1.310 / `ccgateway-v33-bun-1-4-4`**（ELF SHA-256 `720f4645…2463`，Bun 1.4.4 编译为字节码，与官方内嵌版本相同；上一版 2.1.304 / v31 的 profile 与锚点仍在）。版本记录在 [cli-mods README](companions/cli-mods/README.md)，迁移到 2.1.310 的记录在 [CLAUDE-CODE-2.1.310-MIGRATION](docs/CLAUDE-CODE-2.1.310-MIGRATION.md)。

## 目录

```text
ccgateway/
├─ manifest.json          # 平台插件清单：两种账号类型（managed：OAuth 授权码/API Key；apikey）、额度窗口、生命周期动作、转发头
├─ main.go                # 插件进程入口（gRPC，pluginsdk.Serve）
├─ go.mod                 # 插件独立 Go 模块
├─ internal/ccgateway/    # 平台适配：凭据校验、错误分类与冷却（classify.go）、额度（quota.go）、生命周期（lifecycle.go）、默认模型（models.go）
├─ forms/                 # 账号表单（managed、apikey 的 schema 与 UI）
├─ assets/                # 图标与许可
├─ docs/                  # 设计、机制分析、操作手册（见下）
└─ companions/            # 账号容器里运行的组件，不随插件包安装到核心
   ├─ go.mod              # Worker 引擎模块 ccgateway
   ├─ engine/             # /v1/messages → CLI request 命令、身份、日志、资源身份、管理接口
   ├─ worker/             # 账号 Worker 程序（独立模块）及 Dockerfile
   ├─ contracts/          # 跨组件合同（WorkerPolicy、能力名、头表、错误来源）与契约夹具
   ├─ cli-mods/           # 定制 CLI 的补丁、支持模块、编译与打包、测试
   ├─ controller/         # Python 容器控制器及 Dockerfile
   ├─ egress/             # 出口代理及 Dockerfile
   └─ xray-egress/        # 共享 Xray 出口
```

平台插件只依赖自己的模块与平台 SDK，不依赖 companions。插件打包器按白名单收集 manifest、资源、表单和插件二进制，不收集 companions；核心 Docker 上下文也排除 companions。镜像由 `next/deploy/docker/build-ccgateway-images.sh` 构建，以 `images/` 放进插件包，安装后经控制器推送（CONTRACTS §53.10）。构建与测试命令见 [companions README](companions/README.md)。

核心侧的账号、配置、连接与管理接口在 `../../server/internal/ccgateway`，控制台页面在 `../../web/src/views/ccgateway`。

## 请求链路

```
客户端 → 核心（调度、计费、组装 WorkerPolicy 策略头）
      → ccgateway 插件（错误分类、冷却、转发头白名单）
      → 控制器隧道（ccg-tunnel） → 账号容器 Worker :8787 /v1/messages
      → claude request --build|--direct（打包的定制 CLI，一请求一进程） → Anthropic
```

- **核心**按全局 → 分组 → 账号解析 CC 特性策略与请求日志级别，每个请求带 `X-CCGateway-Request-Policy`（`contracts/features.WorkerPolicy`，CONTRACTS §53.18、§65）；发送前读 Worker `/healthz` 预检 CLI 版本与能力。核心不记任何请求日志。
- **插件**把 CC 上下文头（请求类别、agent、prompt ID、压缩标记）按 `contracts/features.AgentContextHeaders` 转发，按 `X-CCGateway-Error-Source` 区分网关自己的拒绝与上游错误（CONTRACTS §53.20）。
- **控制器**管理每个账号的容器、数据卷、内部网络与出口容器，做 Worker+CLI 的配对原地更新（不重建账号容器），见 [控制器 README](companions/controller/README.md)。
- **Worker**只做鉴权、策略、身份与 agent 上下文映射、并发槽位、请求日志和错误来源标记，见 [Worker 引擎](docs/WORKER-ENGINE.md)。
- **CLI**用 Claude Code 自己的函数生成上游请求与全部请求头，见 [REQUEST-HEADERS](../../docs/ccgateway-feature-support/REQUEST-HEADERS.md)。

## 两种模式

模式不单独配置：核心按注入等级决定（等级 0 → direct，微/低/高 → build），随每个请求的策略头下发；Worker 容器的 `CCG_REQUEST_MODE`（缺省 build）只在请求没有策略头时生效。控制台的账号测试固定走 build。

| 模式 | 做什么 |
|---|---|
| `direct` | 请求体原样转发，只处理 system 开头的计费头：缺头或缺字段补原生值、按计费来源换字段（字符串 system 因此改成块数组）；不补身份行，不改 metadata |
| `build` | Worker 把客户端的块原样装进组件信封，CLI 用 Claude Code 原生构造器重新组装：总带计费头；没有计费头的请求按等级补身份行、环境附件、内置提示词与工具；环境字段按来源转换；`metadata.user_id` 按账号映射，没带的给账号自己的身份 |

细节：[REQUEST-MODES](docs/REQUEST-MODES.md) 第 1 节、[build 组件设计](docs/BUILD-REQUEST-COMPONENTS-DESIGN.md)、[注入等级设计](../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md)。

## 文档索引

**现行**（以代码为准）：

| 文档 | 内容 |
|---|---|
| [REQUEST-MODES](docs/REQUEST-MODES.md) | 两种模式、策略头、能力门、账号测试、Worker 准入、错误来源；第 2 节是历史记录 |
| [BUILD-REQUEST-COMPONENTS-DESIGN](docs/BUILD-REQUEST-COMPONENTS-DESIGN.md) | build 信封、CLI 组装、内容改写、计费头、身份映射、能力表（§10） |
| [SUBAGENT-REQUEST-CONTEXT-DESIGN](docs/SUBAGENT-REQUEST-CONTEXT-DESIGN.md) | 请求类别（主线程/子代理/压缩）与 prompt ID；现状见第 15 节（"非 CC 请求按子代理"已被注入等级取代） |
| [WORKER-ENGINE](docs/WORKER-ENGINE.md) | Worker 内一次请求的完整流程、并发、请求日志、资源身份、固定 CLI、管理接口、WorkerPolicy 字段 |
| [CLI-UPGRADE-RUNBOOK](docs/CLI-UPGRADE-RUNBOOK.md) | 升级 Claude Code 版本：下载校验、还原、静态分析、移植补丁器、测试、编译打包、发布回滚、常见坑 |
| [CLI-TEST-PLAN](docs/CLI-TEST-PLAN.md) | CLI 与 Worker 的测试方案、组件目录、跨版本证明方法与发布门槛 |
| [CLAUDE-CODE-2.1.310-MIGRATION](docs/CLAUDE-CODE-2.1.310-MIGRATION.md) | 2.1.304 → 2.1.310 的分析、补丁迁移与验证记录（CLI v32） |
| [ACCOUNT-RUNTIME-LIFECYCLE](docs/ACCOUNT-RUNTIME-LIFECYCLE.md) | 账号容器的删除、保留与重新授权（2026-10-19，2026-10-24 修订删除保留） |
| [CLIENT-SETUP](docs/CLIENT-SETUP.md) | 把 Claude Code 客户端指向本平台的推荐配置（按 2.1.304 验证） |
| [CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY](docs/CLAUDE-CODE-2.1.304-SYSTEM-PROMPT-ASSEMBLY.md) | 2.1.304 主/子代理 system 提示词的组装分析与 AST 工具 |
| [CLAUDE-CODE-2.1.304-HARDWARE-PRIVACY-AUDIT](docs/CLAUDE-CODE-2.1.304-HARDWARE-PRIVACY-AUDIT.md) | 2.1.304 环境与资源信息的采集与上报路径审计 |
| [companions README](companions/README.md)、[Worker README](companions/worker/README.md)、[cli-mods README](companions/cli-mods/README.md)、[控制器 README](companions/controller/README.md) | 各组件的目录、配置、构建、测试；cli-mods 含 CLI 版本记录 |
| `next/docs/ccgateway-feature-support/` | [REQUEST-HEADERS](../../docs/ccgateway-feature-support/REQUEST-HEADERS.md)（上游请求头的来源与已知边界）、[CC-INJECTION-LEVELS-DESIGN](../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md)（注入等级 0/微/低/高）、请求日志五篇：[级别](../../docs/ccgateway-feature-support/REQUEST-LOG-LEVELS-DESIGN.md)、[查看](../../docs/ccgateway-feature-support/REQUEST-LOG-VIEWER-DESIGN.md)、[上游请求记录](../../docs/ccgateway-feature-support/REQUEST-LOG-UPSTREAM-CAPTURE-DESIGN.md)、[随请求下发](../../docs/ccgateway-feature-support/REQUEST-LOG-POLICY-DESIGN.md)、[异步写入](../../docs/ccgateway-feature-support/REQUEST-LOG-ASYNC-DESIGN.md) |
| `next/docs/CONTRACTS.md` | §53（控制面板、原地更新、WorkerPolicy、错误来源、只运行请求命令）、§63（首 token 延迟）、§64–§65（请求日志） |

**历史**（只代表当时，不作为现状依据）：

| 文档 | 内容 |
|---|---|
| [CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES](docs/CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md) | 2.1.302（v7–v11）的分析、补丁与发布；native 模式与 Mod 部分已删除 |
| [CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES](docs/CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES.md) | 2.1.296（v3–v6）的分析、mods 工具注入与验证；证据在 `docs/cli-research/2.1.296/`、`2.1.302/` |
| [CLAUDE-CODE-CLI-MECHANISMS](docs/CLAUDE-CODE-CLI-MECHANISMS.md) | 2.1.296 的 Bun 发行结构、SDK/VS Code 接入、mods、工具注册；机制可参考，改造方向已不用 |
| [CLAUDE-REQUEST-AND-WEBSEARCH](docs/CLAUDE-REQUEST-AND-WEBSEARCH.md) | v6 的 `claude request` 与 WebSearch |
| [CLAUDE-CODE-ATTACHMENTS](docs/CLAUDE-CODE-ATTACHMENTS.md) | 2.1.296 内部附件的字段、渲染与位置 |
| [BUILD-ATTACHMENT-TRANSFORM-DESIGN](docs/BUILD-ATTACHMENT-TRANSFORM-DESIGN.md) | build 附件提取研究；第 8 节的 Worker 侧实现已删除 |
| `docs/archive/` | 旧 companions README、2026-10-03 控制器验证 |
| `docs/*-deployment-0.1.15x.json` | 0.1.159/0.1.160 的部署记录 |
| `next/docs/ccgateway-feature-support/` 的 HANDOFF、IMPLEMENTATION-GUIDE、REMAINING-WORK、PASSTHROUGH、SUBAGENT-DESIGN、SINGLE-TURN-CLIENT-TOOLS 等 | 2026-10-09 前后 native 运行时的交接与设计，均已标失效 |
