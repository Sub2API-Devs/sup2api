# Claude Code 2.1.304：硬件信息采集与上报 AST 审计

> 2026-10-27 清理：文中引用的本机 `artifacts/` 与 ovh 上 `~/sup2api/checks/`、旧 `release-*`、`~/sup2api-managed/{stage,backups,publish,ccgateway-images}/` 下的旧版本原始记录已删除，路径仅作出处；现存位置见 [CLI-TEST-PLAN](CLI-TEST-PLAN.md)。

## 结论

在恢复出的 Linux x64/glibc 2.1.304 JavaScript 源码中，确认了环境与资源信息的发送路径，但没有确认“读取 CPU 型号、MAC、主板序列号并组合成硬件指纹上传”的链路。

- 普通模型请求可以携带系统、架构、运行时版本，以及随机生成并持久化的设备 ID。
- 第一方事件遥测包含系统环境和进程资源统计；采样的启动性能事件还会记录系统可用内存和负载。
- 远程工具设备桥另有主机清单功能，可以发送可用 CPU 数、总内存和磁盘余量。它有单独的功能、设置和出站许可条件。
- MAC／BIOS 的明确读取位于 Google 云环境识别依赖中，返回分类布尔值；没有在这条链路中找到原始 MAC／BIOS 上传。
- OpenTelemetry 依赖包含真实系统 machine-id 的读取器，但本次确认的 CC 指标资源组装没有挂接 `hostDetector`。不能把依赖存在视为当前已上报。

当前三个运行中的生产账号 Worker 均继承
`CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`，没有配置
`CLAUDE_CODE_ENABLE_TELEMETRY` 或任何 `OTEL_*` 环境变量。
按已追踪的分支，第一方事件、内部指标、Datadog 日志／错误和远程设备桥被阻断；
普通 Messages 请求里的设备 ID、SDK 请求头、明确选用的服务端环境附件不受该开关统一清除。

上述“阻断”是源码条件与已核对运行环境的结合判断。本轮没有抓取生产全部出站流量，也没有触发真实模型请求。

## 基线与方法

| 项目 | 身份／范围 |
|---|---|
| 官方 Linux ELF SHA-256 | `ea0f135784631619a7a409d07322ecec964f9cc4fd377508ed1ba3f141f27912` |
| 已发布配对 CLI 制品 SHA-256 | `138da88ed5895fbc099115e7662df7ff9a6bd848d5a4cd142e29f2c9baaa56bd` |
| 补丁 | `ccgateway-v12-feature-policy`，以 SHA 区分修订 |
| 恢复结果 | 2,710 个 Bun 模块，其中 2,461 个恢复 JS 模块；恢复记录的 unresolved 为空 |
| 本轮 AST 枚举 | 2,461 个 JS 模块全部解析，0 解析失败 |
| 提取方式 | Babel AST 的 import/export、调用、对象字段、字面量、函数／方法范围；精确函数体与调用方人工复核 |
| 源码校验 | 版本 profile 中的模块哈希、所有已分析模块哈希、定制目录 manifest 的修改模块与支持文件哈希 |

主要输入目录：

- `artifacts/claude-2.1.304/linux-restored`
- `artifacts/claude-2.1.304/linux-patched-v12-assembly-fix`

普通环境采集、第一方遥测、指标、Datadog、设备桥等主要模块与定制目录保持相同源码；定制的请求入口、build、传输头策略另行检查。`yBe` 所在模块虽被补丁修改，变更点是 `PAs` 的计费文本捕获，不是设备 ID 生成。

复跑命令，从仓库根目录执行：

```sh
node next/plugins/ccgateway/companions/cli-mods/test/analysis/hardware-privacy-audit.cjs inventory
node next/plugins/ccgateway/companions/cli-mods/test/analysis/hardware-privacy-audit.cjs report
```

生成：

- `artifacts/claude-2.1.304/hardware-privacy-inventory.json`：全模块哈希、导入／导出和采集候选。
- `artifacts/claude-2.1.304/hardware-privacy-evidence.json`：核对过的函数体、模块哈希、字符范围、行／列、定制请求入口与支持文件。

`symbol`、`refs`、`links`、`at` 子命令用于复核具体节点。`refs` 是标识符引用候选，包含声明／属性名，不伪装成词法绑定已解析的调用图。判断发送必须继续核对载荷、调用者与发送函数。

REA 对三个选定模块进行了独立 AST 图分析。根目录身份为
`2ab944288d1c347e48e97660255533afdf25f72e5aa36bd886bc7956e6a5a03c`，
证据 `ev_974b4de356883fff4c0e4207215f2e8dfffb20f55a481b91d09cd001a260e4a4`。
该图因选定范围和语义节点上限为 partial，未用于宣称完整调用覆盖；全量语法枚举及下列精确节点复核由本地脚本完成。

## 字段与去向

| 信息 | 采集／构造 | 已确认的去向 | 当前 Worker 判断 |
|---|---|---|---|
| CPU 架构，如 x64 | `process.arch`／`os.arch()` | SDK `X-Stainless-Arch`；事件 `env.arch`；指标 `host.arch`；远程主机描述 | OAuth 模型请求头保留；上述遥测／设备桥受开关阻断 |
| OS 平台 | `process.platform`、平台适配器 | SDK `X-Stainless-OS`；事件 `platform/platform_raw`；环境附件 | 模型请求仍可能携带 |
| 内核、发行版 | `os.release()`、`/etc/os-release` 的 ID／VERSION_ID | 事件 `linux_kernel/linux_distro_id/linux_distro_version`；指标 `os.version`；错误日志；环境附件 | 遥测受阻断；选用服务端 OS 附件时仍可进入模型请求 |
| CPU 数 | `os.availableParallelism()` | 远程工具主机清单 `inventory.cpus` | 设备桥在非必要流量开关处拒绝 |
| 总内存 | `os.totalmem()` | 主机清单 `inventory.memory_gb`，按 GiB 四舍五入 | 同上 |
| 磁盘可用空间 | `statfs(工作目录)` 的 `bavail * bsize` | `inventory.disk_free_gb`，整数 GiB 且有上限裁剪 | 同上；没有磁盘序列号字段 |
| 系统可用内存、负载 | `os.freemem()`、`os.loadavg()[0]` | 采样事件 `tengu_startup_perf` 的 `free_mem_mb/load_avg_1m` | 第一方事件入口被阻断 |
| 进程资源统计 | `process.memoryUsage/cpuUsage/uptime/constrainedMemory` | 事件 `process`：JSON 再 base64 编码 | 第一方事件入口被阻断；CPU 使用时间不同于 CPU 型号 |
| 随机设备 ID | 配置 `userID`，缺失时 `randomBytes(32)` | build 的 `metadata.user_id` 内 `device_id`；事件设备 ID | build 的模型请求仍使用；direct 保留客户端原始正文 |
| 随机机器 ID | 配置 `machineID`，缺失时独立生成随机数 | 错误日志 `host_name_redacted = I_t().slice(0,12)` 等 | 错误上报被阻断；它不是 `/etc/machine-id` |
| hostname | `os.hostname()`／主机名提供者 | 远程设备名称及桥接地址、主机描述；其他本地校验 | 远程路径被阻断；Datadog 的 `hostname` 是固定产品字符串 |
| MAC、BIOS | 网卡 MAC 前缀、BIOS 厂商与日期路径 | Google 云环境分类布尔值 | 未确认原始 MAC／BIOS 发往 Anthropic 的链路 |
| OS machine-id | `/etc/machine-id`、`/var/lib/dbus/machine-id` | 依赖中的 OTel `host.id` 候选；另有 PID 域身份构造 | CC 当前指标组装未启用 hostDetector；现场两个文件均不存在 |
| CPU 型号、主板／磁盘序列号、内核 boot_id | 本轮没有发现明确的 JS 自动上报链 | 没有确认发送字段或发送节点 | 不能由“容器能读到”推断“CLI 已发送” |

SDK 为不同运行时生成的字段略有区别，表格描述字段语义，不把未抓包的具体运行时版本值写成现场发送值。

## 关键 AST 链路

### 1. 普通模型请求：随机设备 ID 与软件环境

`chunk-7p6jp6kj.js:ZM`：

- 先读配置 `userID`，验证为 64 位十六进制字符串。
- 无合法保存值时，默认由 `crypto.randomBytes(32).toString("hex")` 生成并保存。
- 函数另有可选的显式 seed 参数；模型 metadata 中的调用是无参 `ZM()`。
- `I_t` 为配置 `machineID` 独立生成随机值。
- 两者均没有 CPU、网卡或系统 machine-id 输入。

`chunk-t61vswm2.js:yBe` 组装：

```text
ZM() → device_id
OAuth 账号上下文 → account_uuid
会话上下文 → session_id
JSON.stringify(上述对象) → metadata.user_id
```

特殊远程上下文还有额外字段，不能把此函数概括为永远只有三个键。

`chunk-qm6t5b60.js:ne → S5n`
产生 `X-Stainless-OS/Arch/Runtime/Runtime-Version/Package-Version` 等头；
`chunk-38xgev2z.js:buildHeaders` 合并这些 SDK 头。

定制 `request-options.js:authenticatedRequestHeaders`：

- OAuth 保留 CC 生成的身份／传输头，再处理版本与 beta。
- 显式 API Key 路径重建有限的头集合，使用 `User-Agent: ccgateway-request`，不保留这些 Stainless 环境头。

`request-command.js` 的 direct 路径使用原始 JSON 字符串；build 路径调用原生组装，因此不能将 build 的设备 ID 行为套用到 direct。

### 2. 第一方事件与启动性能

```text
环境收集 i1 / 进程资源 d1
  → GUr
  → I1 的 core_metadata、user_metadata、event_metadata
  → transformLogsToEvents / RT
  → ig.sendBatchWithRetry
  → /api/event_logging/v2/batch
```

上述函数除性能入口外位于 `chunk-7p6jp6kj.js`。`RT` 明确列出了环境字段；`processMetrics` 会作为 JSON 的 base64 写入 `process`，不是密码学加密。

启动性能位于 `chunk-sx3g9k86.js`：

```text
V: os.freemem/loadavg → free_mem_mb/load_avg_1m
K: 采样与状态判断 → tengu_startup_perf
```

`V` 也用于本地性能文件。仅发现采集函数不等于事件一定发送。

第一方入口 `ZBt/yC` 和初始化 `oze` 均检查 `OW()`：

```text
IGt: CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC 非空 → essential-traffic
VF: IGt() !== default → true
Oy: VF() || 其他禁用条件 → true
OW: !Oy() → false
ZBt/yC/oze → 不发送／不建立第一方事件导出器
```

`DISABLE_TELEMETRY` 与 `DO_NOT_TRACK` 也参与该解析。字串 `"0"` 对非必要流量变量仍为非空；不能用 `"0"` 表示关闭这个环境开关。

### 3. 内部指标、Datadog 与显式 OTEL

`chunk-e7mgxhn6.js:it` 手工合并：

- service 名称与 CLI 版本；
- `osDetector` 的 OS 信息；
- 显式 CPU 架构；
- 允许的环境资源属性／配置的身份属性。

它没有调用 `hostDetector`。内部指标导出器 `ge` 再以 `transformMetricsForInternal` 筛选资源字段，发送到 `/api/claude_code/metrics`。`Ve()` 首先判断 `VF()`，当前非必要流量开关使内部导出器不能启用。

`chunk-5720eenm.js:initializeDatadog` 也在 `Oy()` 为真时返回 false。其事件路径 `LFt` 使用 `GUr` 的环境／进程数据；`userBucket` 来自随机 `userID` 的哈希分桶，不是 CPU 指纹。

错误路径：

```text
chunk-rp4e5650.js:OBe → n2s 门禁 → K 构造错误载荷 → QDo
```

`K` 包含平台、OS release、Node/Bun 版本，以及随机 `machineID` 的 12 字符前缀。其 `error.fingerprint` 属于错误分组逻辑，不能解释为硬件指纹。`chunk-gvtgs37t.js:n2s` 在 `Oy()` 为真时拒绝；发送目的地是 Datadog browser intake。

**显式第三方 OTEL 需独立判断。** `Dt()` 读取 `CLAUDE_CODE_ENABLE_TELEMETRY`，`Bn` 据此建立 `OTEL_*` 配置的导出器；它不是统一复用 `Ve()` 的内部指标条件。因此不能仅凭第一方遥测关闭，就声称任意显式 OTEL 配置都被禁用。现场三个 Worker 没有这些环境配置。

### 4. 远程工具主机清单：CPU／总内存的明确发送路径

`chunk-yqea5hk4.js:Ali` 明确构造：

```text
availableParallelism() → cpus
round(totalmem() / 2^30) → memory_gb
statfs.bavail * statfs.bsize / 2^30 → disk_free_gb
```

还包括本地工具清单。采集需要 `qir()`：远程功能开关 `pot()` 成立，且 `remoteControl.shareHostProfile` 的有效值不是 off。

发送载体继续追踪到：

```text
chunk-dykwp5mc.js:r2t
  → 动态 gatherHostInventory / Ali
  → hostInventory
chunk-hcgkwy7m.js:zir → Kir → hn
  → 主机 description.inventory
  → Tli / Jr
  → 工具定义 _meta[DM].target.inventory
  → registry.setGroup
chunk-dykwp5mc.js:Je / en
  → 设备桥 getTools / connect frame
  → /devices/<组织_账号>/<设备名称>/bridge
```

它属于远程工具注册／描述，不是每次 `/v1/messages` 都附带的固定硬件字段。

`r2t` 在采集之前判断 `Jbe()`；`chunk-x14q1sjn.js:pRt` 遇到 `Tt()` 为真立即拒绝出站。因此当前 Worker 的非必要流量开关在这条路径的采集前就阻断了流程。

### 5. 有读取器，不代表有硬件上报

- `chunk-d0te4b5s.js:Ir` 的 Google 云检测检查 `/sys/class/dmi/id/bios_vendor` 是否含 `Google`，以及网卡 MAC 是否以 `42:01` 开头。结果是布尔值。
- `chunk-j8jwkrgq.js:z5/vce`、`chunk-yrdh91k8.js:un` 使用接口地址做本地地址判断；`chunk-024r210v.js:qb` 检查 IPv6 loopback。没有在这些函数中构造 MAC 上报字段。
- `chunk-4qs43hr1.js:bA` 的通用 OTel hostDetector 确实能读取 hostname、架构和真实 OS machine-id；`chunk-7dttn3gk.js:s` 是 Linux reader。但当前 CC 的 `it` 没有选择它。
- `chunk-w1pck5fs.js:P5s` 另用 machine-id 与 PID namespace 构造 PID 域身份，`chunk-38vgtxey.js:TC` 缓存它；没有将它等同于模型请求的 `device_id`。
- `chunk-whn549sj.js:nn` 可读取 `process.report.getReport()`，仅取 `header.glibcVersionRuntime` 判断 musl／glibc，以选择 SDK 二进制。这不是已确认的诊断报告上传路径。
- `chunk-rncrmfyt.js:Jwn` 读取 cgroup／proc 内存状态用于资源判断；`Xnt` 使用 CPU 并行度设置 Git checkout workers。两者不应被单独算作遥测发送证据。
- `cpuid` 文本命中在汇编语法高亮词表，不是执行 CPUID 的 JS 采集函数。

## 审计时 Worker 的准确边界（v12）

`engine/request_command.go` 启动 `claude request --build/--direct` 时使用 `runner.baseEnv()`。
`engine/runner.go:baseEnv` 强制的是 `DISABLE_AUTOUPDATER=1`，没有强制非必要流量开关。
`runner_config.go:cliEnv` 虽然设置了该开关，但不是这里的 request 启动链路。

当前保护实际来自 Worker Dockerfile 的 ENV 和现有容器环境；本轮已逐个确认三个运行容器为 `1`。
因此，离开正式镜像启动 Worker、显式传入另一份 Runner 环境或未来改变启动方式时，不能依赖旧 `cliEnv` 来保证 request 路径的遥测关闭。

定制 CLI 的 AST 也确认 `request` 有提前分支，执行原生快路径策略加载后进入专用请求函数并退出，不经过后面的完整交互入口。模块导入仍会发生，故没有把“提前分支”写成“所有初始化／背景代码绝不运行”。

服务端 OS 附件由 `ccgatewayEnvironment → poo` 等原生读取器按策略选择；这是模型上下文内容。前述遥测开关不会自动擦除它。
`cc_version` 后缀则来自请求文本采样的短哈希，已有独立 billing oracle；不属于 CPU／MAC 哈希。

## 限制与后续建议

本轮是 JS AST 与静态路径分析，没有完整分析 Bun／ELF 的原生运行时、原生扩展或 WASM 内部；没有证明任意动态插件、工具命令或客户端正文无法上传硬件信息；没有生产全量抓包。没有命中某个字面量也不能单独证明没有动态读取。

现有证据支持优先检查以下明确入口，而不是先假定 CPU 型号或 MAC 已经被上传：

1. request 子进程的非必要流量开关是否始终可靠继承。
2. 显式 OTEL 导出器是否允许启用，以及目的地由谁控制。
3. 系统／架构请求头和服务端 OS 附件的产品要求。
4. 远程设备桥是否会在未来启用，以及主机清单分享设置。

审计阶段只新增审计脚本与文档。随后按用户要求完成下述本地实现；生产状态未改变。

## 本地 v13 实现（未部署）

按用户进一步明确的要求，改为**分配多少就报告多少**。当前本地候选为 `ccgateway-v13-container-resources`，能力 `container_resource_reporting_v1`；先前未部署的随机 profile 方案已撤换。

| 位置 | 替换字段 |
|---|---|
| 远程工具主机清单 `Ali` | `cpus`、`memory_gb` 读取容器配额；`disk_free_gb` 仅报告经控制器验证的限额卷余量 |
| 启动性能采集 `V` | `free_mem_mb` 读取容器配额余量；不报告宿主机 loadavg |

Controller 当前本地创建默认值为 `mem_limit='1g'` 和 `nano_cpus=2000000000`，即 1 GiB 内存、共享 CPU 最多 2 核算力。因此限制从容器创建起就生效，不需要等首个模型请求随机生成身份。CLI 采集时从当前内核 cgroup 读取实际生效值，之后调整配额也能跟随，无需重建配置文件或缓存。已有线上容器尚未应用这一内存默认值。

当前读取口径：

- 从 `/proc/self/cgroup` 定位当前私有 cgroup v2，在标准 `/sys/fs/cgroup` 挂载内检查当前组及可见祖先。
- CPU：`cpu.max` 的 quota／period，并考虑显式 cpuset 和 effective cpuset 的更紧限制。
- 内存：有限 `memory.max` 的最小值。
- 可用内存：各有限边界的 `memory.max - memory.current` 的最小值，报告 MiB。它表示配额余量，不是宿主机 `os.freemem()`，也不包含对可回收页缓存的估算。
- 磁盘：Controller 通过 Docker local volume 的 `size` 选项创建硬配额，默认 10 GiB，可由 `CCG_ACCOUNT_DISK_GIB` 配置。验证后向 Worker 传入 `CCG_ACCOUNT_DISK_QUOTA_BYTES`；CLI 读取 `/work` 的 `statfs.bavail * bsize`，并确认该文件系统视图总量不大于已验证限额。缺少配额标记、读失败或得到宿主机大小的视图时省略，不回退到共享磁盘余量。
- 负载：不使用宿主机的一分钟 loadavg，也不编造容器负载。

这些数值不随机、不持久化为另一份硬件配置。资源调度、内存保护、Git 并发、CPU 架构、OS／内核描述、SDK 请求头、`userID/machineID` 以及 Node/Bun 的底层系统接口保持原行为。不能把它解释为整个容器的硬件虚拟化。

读取失败、无限额、cgroup v1 或无法识别的挂载布局，对应字段省略，不回退到宿主机总量，也不阻断模型请求。CC 原生清单的 CPU／GiB 字段只接受整数；不能精确表示的分数配额省略，不擅自四舍五入成其他分配量。当前默认 2 CPU／1 GiB 可以完整表示。旧随机 profile 文件不再读取或生成。

Worker 只在已加载 CLI 声明该能力时传入可信开关；health 的 request capabilities 只有在 Worker 与 CLI 均接通时才包含该能力。旧 CLI 和维护模式不启用；上线须配对更新 Worker 与 CLI。

`Runner.baseEnv()` 现在强制设置：

```text
CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1
DISABLE_TELEMETRY=1
DO_NOT_TRACK=1
DISABLE_ERROR_REPORTING=1
CLAUDE_CODE_ENABLE_TELEMETRY=0
```

不会为了报告资源而开启遥测或远程设备桥。direct 的原始请求正文保持不变；build 继续遵循既有内容策略。

实现入口：

- `companions/cli-mods/container-resources.js`
- `companions/cli-mods/patch-cli-2.1.304.cjs`
- `companions/engine/cli_pinned.go`
- `companions/engine/runner.go`

验证覆盖 2 CPU／2 GiB、动态配额变更、嵌套 cgroup、cpuset、缺失／无限额／分数配额及未知格式。提取真实补丁 AST 的测试把宿主机 CPU／内存／磁盘读取器设为必抛异常，检查已知配额及未知配额都不读取它们，并比较资源控制和身份生成函数源码未变。

旧 `hardware-profile-v13-smoke.json` 记录的是已撤换的随机方案，不能用于证明当前方案通过。

CPU／内存阶段已完成：

- 16 项 JS 定向测试通过，无跳过；包含资源读取及真实补丁 AST 回归。
- Go request／环境／能力定向测试通过，实际子进程收到资源报告开关与强制关闭的遥测开关。
- Bun 1.4.3 编译 Linux ELF 成功；Bun 在真实限额容器读取到 2 CPU／2 GiB。
- 无网络临时容器内运行实际 Worker＋CLI，direct/build 的 JSON 与 SSE 均通过；旧随机文件即使损坏也不再被使用。
- 同一临时容器运行中把限额从 2 CPU／2 GiB 调为 1 CPU／1 GiB，未重启 Worker，随后读取到 1 CPU／1 GiB，build 请求仍成功。
- 5 次成功请求对应 5 次回环模型调用，回环上游未收到其他路径。

```text
Worker: 9c93ccb44283efaaa81fe6a5acf79c150e0d02cd6b3ced9740019d5a3e4e253f
CLI:    5f396918038bcbe3dc64ad4a1c24412a9758610581f8a6a6815844217ee23c4d
```

[当前资源配额方案的 Linux 验证报告](../../../../artifacts/claude-2.1.304/container-resources-v13-smoke.json)。
测试使用假凭据和回环模型，没有进行真实上游账号验收。没有更新生产 Worker、CLI、账号卷或容器配置。

## 后续磁盘硬配额实现（未部署）

Controller 新建账号卷默认限制为 10 GiB；改变默认值只影响新卷，不自动扩缩旧卷。配额后端和只读 `statfs` 验证都位于删除／替换容器与网络之前，失败返回 `disk_quota_unavailable`，控制台有对应提示。

旧卷保留并标记 `legacy_unbounded`。限额卷的 ownership label、quota label 与 Docker options 必须一致，不接受伪造的额度，也不能在已记录 enforced 的卷失去 quota options 后退回 legacy。只在创建新容器时下发已验证额度；已有账号的数据迁移单独执行。

配额范围是 `/work` 数据卷，覆盖配置、历史、缓存、请求数据等；不涵盖 Docker 容器可写层及宿主机日志。配额是用量上限，存储池空闲空间不足时实际可用空间还会更少。

当前生产 Docker 卷目录的文件系统为 ext4，真实探测已返回：

```text
quota size requested but no quota support
```

因此当前主机不能直接启用新建卷硬配额，需要先准备支持 project quota 的 Docker 卷存储。通常为启用 `prjquota/pquota` 的 XFS；迁移存储涉及使用 Docker 卷的服务，必须安排维护及备份恢复。没有格式化现有磁盘、迁移账号数据或部署新版本。详细迁移边界见 [Controller 配额说明](../companions/controller/README.md#account-data-volume-quotas)。

已在独立测试 Docker daemon 和临时 XFS 文件系统中验证内核硬限制：创建 1 GiB 限额卷，UID 1000 的容器写到 1 GiB 后继续写入得到 `No space left on device`；`statfs` 总量保持 1 GiB，真实可用空间从 1 GiB 降至 0，CLI 资源读取模块同步报告 1 → 0。

报告：[磁盘配额内核验证](../../../../artifacts/claude-2.1.304/disk-quota-native-result.json)。这项验证没有挂载生产账号卷，也没有接入生产 Docker socket。

相关验证通过：Controller 全部 163 项单元测试、CLI 17 项定向测试、Core `TestRuntimeErrorMapping`、前端认证流程 14 项测试。Controller 测试覆盖默认额度、不支持后端时无无限额回退、校验失败前保留工作容器、旧数据保留、额度默认值变更不改旧卷以及 ownership／quota 元数据冲突拒绝。新增错误码和中英文提示已接入，未提交或部署。

## v14 实现前的 metadata.user_id 身份映射核对

以下是改动前的调用链；后续 v14 实现见下一节。改动前 direct/build 没有统一的、按 Worker 独立加密映射客户端身份的逻辑：

| 路径 | 实际行为 |
|---|---|
| direct | `rawBody` 直接进入原生 HTTP transport，包含客户端 `metadata.user_id`，没有 hash |
| build | 原生 builder 生成 metadata；`mergeAdditionalParameters` 明确不把客户端 metadata 覆盖回去 |
| 旧 native agent 入口 | `upstreamSessionID` 对固定域名字符串和客户端 session 做 SHA-256，再设置 UUIDv4 version/variant 位；没有 Worker 独立密钥 |

`Gateway.ServeHTTP` 在启用 direct/build 时提前转入 `serveRequestCommand`，不经过旧 session branch 路径。不能用旧的 `metadata_cli_compat_test.go` 或 `session_branch.go` 注释证明当前 direct/build 已经做了会话 hash。

2.1.304 原生 AST 证据：

- `chunk-7p6jp6kj.js:ZM`：合法的已保存 `userID` 优先；没有时调用
  `crypto.randomBytes(32).toString("hex")` 并保存。因此设备 ID 是 64 位十六进制。
- `chunk-t61vswm2.js:yBe`：生成字符串化 JSON，`device_id` 来自 `ZM()`，
  `account_uuid` 来自原生账号上下文，`session_id` 来自 `q()`。
- `chunk-dxktn51d.js:q` 读取当前会话；默认 root session 的 `Yi` 使用
  `ier() ?? Ure()`。`ier` 会把 `CLAUDE_CODE_REMOTE_SESSION_ID` 经固定命名空间派生为 UUIDv5，不能直接用来注入最终映射 ID；
  `Ure` 经 `chunk-grpzqw3p.js` 导出，实际是 `crypto.randomUUID`。
- 当前 Worker 每个 request 启动一个 CLI，未根据收到的 metadata 设置上述会话覆盖。
  默认 build 会话 ID 由新 CLI 的原生会话生成，不是客户端 session 的稳定映射。

若新增稳定隐私映射，建议以账号 Worker 的独立持久密钥做 HMAC-SHA256，
并按设备／会话分别使用域分隔；不能使用全局固定盐或认证 token 作为稳定密钥。
同一 Worker 内同一身份和会话的结果保持稳定，不同 Worker 使用不同密钥。
多调用方共享 Worker 时，应同时考虑可信调用方作用域，避免把不同调用方合并成同一身份。

输出可保持 CC 格式：设备 ID 为 64 位小写 hex；会话采用摘要的 16 字节并设置
UUIDv4 version/variant 位。HMAC 的生成机制与原生随机生成不同，不能声称算法完全一致。
若要求使用完全相同的生成算法，则首次调用原生随机生成器，再持久保存映射。

build 已经使用独立的原生 Worker 设备 ID，因此可继续保留它，仅补客户端会话的稳定映射。
如果要按客户端区分设备，可单独映射该字段。`account_uuid` 应继续遵循 Worker 的实际
原生账号上下文；修改 metadata 不能隐藏上游认证账号本身。

相关会话请求头、parent session 等引用必须与映射保持一致，优先设置原生会话上下文；
direct 如需改写 metadata，必须明确改变其当前原字节透传契约，不能暗中开启。

上述核对阶段完成调用链及原生 AST 检查，16 项 transport／304 参数测试通过，当时尚未修改身份逻辑。

## 按账号邮箱的身份映射 v14（未部署）

补丁 `ccgateway-v14-account-identity` 与 `request_identity_v1` 能力。只有配对 Worker／CLI 支持时才启用，并通过 Worker 实际 capabilities 报告；旧 CLI 和 maintenance／旧 native agent 模式不启用。

**只有 OAuth（Claude 账号）才映射。** API Key 账号没有可映射的 Claude 账号，替换来源按客户端原值处理：direct 原样转发，build 保留客户端的 metadata（不使用 CLI 原生值）。判定与 CLI 自身一致——环境里有 `ANTHROPIC_API_KEY` 即视为 API Key 账号；否则必须存在已保存的 OAuth access token（`.credentials.json` 的 `claudeAiOauth.accessToken`）。

**映射密钥 = 账号私有密钥 × Claude 邮箱**。私有密钥是 Worker 首次启用该能力时在账号数据卷（`$CCG_DATA_DIR/request-identity.key`，32 字节随机，0600）生成的，不由账号编号、API Key 或 OAuth token 派生：

```text
email  = CLAUDE_CODE_USER_EMAIL 或 .claude.json 的 oauthAccount.emailAddress
secret = 账号数据卷中的 32 字节随机值（硬链接发布，同卷并发启动只保留一个）
key    = HMAC-SHA256(secret, "ccgateway-request-identity-key-v2\0" + lowercase(trim(email)))
```

- 只凭邮箱无法推算密钥：上游即使知道账号邮箱，也无法反查或跨账号关联映射值（v1 仅用邮箱派生，已废弃）。
- 数据卷随账号存在：重启、原地更新、原地重新授权都保持同一映射；换成另一个 Claude 登录则映射不同；删除账号或更换数据卷后映射重新生成。
- 密钥文件损坏时 Worker 拒绝启动，而不是悄悄换一套映射。
- 邮箱缺失（OAuth 但读不到邮箱）或账号文件损坏时，替换来源退为“服务端”（Worker 自己的身份），不转发客户端原值。
- 邮箱按 trim + 小写归一，避免同一账号因存储大小写不同而分叉。

**`metadata.user_id` 的三种载体都要能拆。** 已核实（QNTX wire-format 文档、CLIProxyAPI #1750 与 `cloak_utils.go`、AgenticLedger 测试、coder/aibridge）：

| 载体 | 形态 | 拆分 |
|---|---|---|
| 对象 | `{"device_id":…,"account_uuid":…,"session_id":…}` | 直接按字段读 |
| JSON 字符串 | 上述对象的字符串化（2.x 客户端） | 解析字符串内 JSON 后按字段读 |
| 扁平字符串 | `user_<64 hex>_account_<uuid>_session_<uuid>`（1.x 遗留） | 按 `_` 拆三段；`_session_` 后是最后一段 |

扁平格式的 account 段允许为空（`user_<hex>_account__session_<uuid>`，见 #1750 修复前的实际形态）或整体缺失（`user_<hex>_session_<uuid>`）；两种都能识别。不符合扁平正则、也不是 JSON 的字符串按不透明用户标识处理。数字、布尔、数组等非对象非字符串载体在发送前拒绝。

改写后**保持客户端原来的载体形态**：对象仍是对象，JSON 字符串仍是 JSON 字符串，扁平字符串仍输出 `user_<hex>_account_<uuid>_session_<uuid>`（account 段用 Worker 真实账号 UUID）。扁平载体携带的 device 段与 JSON 载体的 device_id 是不同输入，映射结果不同属预期；同一会话 UUID 在两种载体中得到同一会话映射。

**字段不存在时不做任何事。** `metadata`、`metadata.user_id` 缺失或为 `null`，`user_id` 为空字符串，或载体里没有任何可用字段（空对象、只有 `null`／空串字段），都按原样放过：

- Worker 不生成映射，也不把身份上下文传给 CLI，CLI 完全按原生逻辑运行；
- direct 的请求字节与客户端发出的完全一致；
- build 仍由 CLI 生成它自己的原生 metadata（这是 build 的固有行为，不是我们注入）。

只有一个可用字段时也只映射该字段：例如只给了 `session_id`，就只映射会话，设备保持原生值。

**身份来源在插件设置里配置**（`CCGateway 插件设置 → CC 特性 → 身份标识`，与附件转换同一套分层：全局 → 分组 → 账号）：

| 选项 | 含义 |
|---|---|
| 客户端原始 | 客户端发什么就转发什么，不做替换 |
| 服务端 | 用该 Worker CLI 自己的身份（设备、账号、原生会话）替换客户端值 |
| 替换（默认） | 用客户端值做单向映射，密钥来自账号私有密钥与登录邮箱 |

客户端没发 `metadata.user_id` 时，三种来源都不生成身份。build 模式下 Worker 总会把身份上下文交给 CLI（包括“客户端原始”和客户端没发身份的情况），CLI 据此保留客户端自己的 metadata（没有就删掉），而不是使用原生构建器生成的服务端 metadata。API Key 账号的替换来源按客户端原值处理。

默认来源（替换）不随请求策略下发，核心只发送非默认来源。CLI 不支持该能力时，未下发来源的请求不替换也不报错（旧运行时继续正常服务）；显式配置“服务端”却不被支持才返回 409，核心的能力预检也会提前要求 `request_identity_v1`。身份上下文只经 `CCG_REQUEST_IDENTITY` 环境变量交给 CLI，从不进入 build 信封（CLI 信封只接受 `contract_version`、`build_attachment_sources`、`build_billing_sources`）。

映射本身：

- `HMAC-SHA256(key, JSON(["ccgateway-request-identity-v1", "device", 原用户标识]))` 的完整 32 字节转为小写 hex。
- 会话使用独立 `"session"` 域，输入仅为原会话 ID；摘要前 16 字节设置 UUIDv4 version/variant。父会话走同一函数，因此父子引用一致，设备字段变化不会改变同一个会话的映射。
- CC 格式优先取客户端 `device_id`，缺少时用客户端 `account_uuid` 作为用户映射输入；普通非结构化 `user_id` 整串按用户标识映射。没有来源用户标识时保留原生 Worker 设备 ID；没有来源会话 ID 时每个请求生成新 UUID，不把一个用户误当作永久会话。

CLI 环境只收到映射后的 ID，邮箱和密钥都不进入 CLI 环境，也不进入请求。

在 `chunk-dxktn51d.js:Yi` 的原生 root-session 构造处优先读取 Worker 映射值，`q()` 及原生会话头因此使用同一 ID。不会把映射 UUID 再交给 remote-session 的 UUIDv5 派生。`yBe` 的原生身份对象在合并额外 metadata 及执行长度预算之前应用设备／父会话映射，保持实际 `account_uuid` 与原生大小预算。

direct 的唯一原字节例外是已有非空 `metadata.user_id` 字符串：CC 完成原生认证工厂初始化后，用原生 metadata 生成器的结果替换该字符串。定位只处理顶层 metadata，不会改消息／工具里的同名字段，也不重序列化其余数字、空白、未知字段。无 user_id、null 或空串不注入；build 保持原生 metadata 组装。身份字段重复或类型错误在 Worker 发送模型请求前拒绝。

验证已完成：

> 以下是 v1（只用邮箱派生密钥、默认来源随策略下发）的验证记录。2026-10-21 审核修复（私有密钥 v2、默认来源不下发、身份不进 build 信封、build 总传身份上下文、API Key 账号替换按客户端原值）后，Go 与 JS 单元测试已按新语义更新；Linux 编译 CLI 的端到端验证需重跑。

- 三种来源（客户端／服务端／替换）与默认值、来源不合法拒绝、CLI 不支持时默认来源静默不生效；前端 50 项相关测试与类型检查通过。
- Go 测试：字段缺失全部跳过（无 metadata／null／空串／空对象／全 null 字段）、三种载体拆分（对象、JSON 字符串、扁平三段，含空 account 与缺 account）、邮箱派生（同邮箱稳定、大小写归一、跨邮箱不同、`CLAUDE_CODE_USER_EMAIL` 优先）、API Key／无 OAuth／无邮箱／坏文件不启用、父子映射、设备变化不改会话、两个模式的子进程环境。
- 20 项相关 JS 测试通过，包括提取真实 AST 验证原生会话创建与 metadata 大小预算，及 direct 的精确字符串替换。
- 实际 Linux Worker＋Bun 1.4.3 编译 CLI，在 `--network none`、假凭证、回环上游下：OAuth 账号 direct／build 都替换且结果一致、重启后一致、**同账号第二个 Worker 映射相同**、不同邮箱不同、API Key 账号 direct 原字节不变且 build 仍是原生 metadata、父会话正确、无 metadata 的请求字节不变；普通响应与 SSE 正常。
- 13 次成功请求对应 13 次上游模型调用；重复身份字段在发送前被拒绝；对象载体与扁平载体都保持原形态。
- **未修改的官方 2.1.304 客户端实测**（`claude-linux-x64`，SHA-256 `ea0f1357…`）：客户端 → 录制入口 → 本 Worker → 本补丁 CLI → 回环模型桩，build 与 direct 各跑一次。
  两次都返回 `OFFICIAL_OK`；官方客户端发出的 `metadata.user_id` 实测为**字符串**（内部是 JSON），上游收到的是映射值，且与本探针独立计算的 HMAC 结果逐字节一致；
  `account_uuid` 为 Worker 原生账号 UUID；direct 除身份字符串外其余字节完全一致；2 个客户端请求对应 2 次模型请求，没有额外生成。

```text
Worker: 842507e68e8494eb2412a1df88ac55b388b1c1f0956a37d47919896fdadd5032
CLI:    5e6fb20d4c1ce711e6a2ba716c10352cab4878bd43c6b4a2764486cdfba7591c
```

[Linux 身份映射验证报告](../../../../artifacts/claude-2.1.304/account-identity-v16-smoke.json)；[官方客户端实测报告](../../../../artifacts/claude-2.1.304/official-identity-result.json)。
整链路验收使用假 OAuth 凭证与回环模型桩；**真实 Anthropic 上游尚未验收**。
HMAC 保持原生 ID 格式，不等于原生每次随机生成算法，也不能隐藏上游认证账号。
该功能不依赖磁盘配额或存储迁移。没有部署、提交代码或恢复此前已停止的测试容器。
