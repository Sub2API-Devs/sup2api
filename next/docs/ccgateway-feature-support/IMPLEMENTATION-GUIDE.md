# 当前实现指南

核对基线：产品源码 `1c35179527a7632f3ea06b9d9014d81854112956`，Core .78 / Plugin .14 / Worker .80 / Controller .48。此文说明当前模块职责与接续改动入口；逐项状态、上线与未验证范围分别见 [接手文档](HANDOFF-2026-10-09.md) 和两份 [协议](implementation/COMPLETION-PROTOCOL-AUDIT-2026-10-09.md)、[全栈](implementation/COMPLETION-SCOPE-AUDIT-2026-10-09.md) 审计。原始 01–05 是调研基线，其中建议接口和旧“尚未实现”不优先于源码及本指南。

## 目录与职责

```text
next/
├─ plugins/ccgateway/
│  ├─ internal/ccgateway/        平台插件：账号类型、插件协议、执行入口
│  ├─ assets/、forms/            插件资源与表单
│  └─ companions/               插件配套独立运行组件
│     ├─ contracts/             目录、policy、helper、资源、计量跨组件合同
│     ├─ engine/                API→CC交互、历史、响应、工具、资源、日志
│     ├─ mod/                   Claude Code Mod：请求作用域/主轮改写/工具拦截
│     ├─ worker/                账号容器 HTTP 入口、配置与进程生命周期
│     ├─ controller/            Python 容器/网络管理与连接发现
│     ├─ egress/                独立账号出口代理
│     ├─ catalog/               原生工具名称/参数目录
│     └─ main.go、Dockerfile    独立网关兼容入口，复用同一 engine
├─ server/internal/
│  ├─ ccgateway/                Core 所有的连接、策略、账号/资源/隐藏链管理
│  ├─ gateway/                 调度、执行、计量、helper custody、转换联调
│  ├─ core/、usage/、usagerules/ 固定安全用量、结算与投影
│  └─ ...
└─ web/src/views/
   ├─ ccgateway/                设置、特性目录、运行能力、账号容器
   └─ usage/                    用量明细、缓存事实及费用
```

代码仍都属于 CCGateway 配套项目，但安装到 Core 的插件不会把 Worker/CLI/controller/egress 打进插件业务入口。不要把 API→CLI 实现移回 Core 插件或重写一份简化 DTO。

## 真实请求路径

1. 公共 API Key 经 Core 鉴权、分组/模型选择、调度与费用约束；平台 Key、账号调用 Key、Controller 管理 Key 是不同层次。
2. Core `server/internal/ccgateway/direct.go` 从已鉴权 Controller 获取当前账号地址、凭据和 revision，校验地址池/8787/revision，SSH 直连账号 Worker。Controller 不转模型请求/响应体。
3. `worker/internal/server` 把完整请求交给 `engine`，保留 body、头和 Core 下发策略；`engine/request_policy.go`、`request.go`、`feature_plan.go` 等校验并构造受控请求计划。
4. `engine/runner.go` 以原生 CLI stream-json 交互；initialize 后提交 user 帧，保持控制回调。Mod 通过同服务 8787 的随机回环路径/令牌读取配置、确认主轮处理；结束清理内存接口。CLI 授权、原生 JSONL 及 Mod 加载文件仍存在。
5. 输出 JSON/SSE 保留合法 block、顺序、签名、usage、停止原因及上游错误；Core 再执行转换/计量/结算。不能把 HTTP 200 refusal 当网关错误。

SSH Key 的 `permitopen="*:8787"` 只限制端口，私网池由 Core 校验；Key 持有人绕过 Core 直接使用不受该池校验。这是已知边界，不能写成 SSH 支持 CIDR。

## 特性支持、配置及作用域

- 注册表源在 `companions/contracts/features/catalog.go`，经 Core `features.go` 和 Worker features 返回；前端 `FeatureSupport.vue`、`featureCatalog.ts` 展示同一功能下的 beta headers、body paths、作用机制、资格/模型/CLI 要求和限制。
- 前端 `RemoteSettings.vue` / `RequestPolicySettings.vue` / `requestPolicy.ts` 保存策略；Core `config.go` / `request_policy.go` / `attachment_policy.go` 校验有效策略；Worker `engine/request_policy.go` 再校验。这些是受鉴权 Core 下发的内部策略，不是公共客户端可自行指定的任意 CLI/env。
- API 与 CC 分维度：通用请求/工具语义位于“特性支持”；附件、环境、CC 专有功能位于“CC 特性”。自然支持的功能展示说明，不造无作用开关。
- catalog 支持状态不等于账号 provider 资格。`contracts/features/runtime.go` 区分运行程序、目录、局部 CLI probe 与真实 provider 验证，不能用 health 或镜像 tag 提升为 verified。
- helper **transport schema=1** 和 **payload v1/v2** 分开协商，旧链保持兼容；UI 当前尚缺 payload versions 单独呈现，这是交接待办。
- 未知 beta 默认 ignore、未知字段可选 ignore 是现有行为；是否应更严格是未闭环事项，不能在说明里写成所有未知语义已明确拒绝。body已知高风险字段门禁另有保护。
- 修改默认镜像只影响未来创建/显式重建；不同镜像只提示，不能因同步配置偷偷替换现有账号容器。

## system / attachment / cwd

- 普通客户端 system 必须保留角色、位置、完整字段及生效/撤回时间线；已识别附件和环境策略不能删除权限分类器等普通指令。
- `attachment_policy.go` / `environment_policy.go` 及 Mod 对已识别结构做选择；未知附件分别 pass/ignore。默认来源与单项覆盖需按实际 DTO 解算，不用 UI 文案猜。
- 前端已把 `workingDirectory` 与 `platform` 放在同级单独配置；后端仍识别旧 environment 整体覆盖和 both 值以兼容已保存策略，隐藏控件不等于旧值已从合同删除。
- 两字段控制模型看到的环境信息，**不把容器进程真实 cwd 改成客户端 Windows/Linux 路径**。缺客户端对应字段时按现有回退规则处理；不要未经验证增加 `--cwd` 或在容器造客户端路径。
- 客户端名称/参数与原生工具匹配时使用原生拦截路径；客户端已有 MCP 名称保持客户端身份；普通自定义工具按配置前缀模拟 MCP 并映射回原名。具体匹配见 `tool_matching.go` / `tool_names.go` / `client_tools.go` / Mod，native 目录来自 `catalog/`；实际 wire 校验需在元数据恢复前执行。
- `tool_result_context.go`、相关多工具 CLI tests 负责结果连续性；旧“五个 Read”失败和 OAuth/无账号原因应按对应记录判断，不从截图直接认定所有并行工具都坏。

## 历史、缓存与隐藏辅助轮

- `engine/history*.go`、`completed_client_history.go` 保留公开历史、JSONL 导入、持久缓存、续聊、分支与重建。只应发送 pending suffix，不能把已完成消息再次生成。
- `inline_timeline.go` / `inline_system_metadata.go` 等维护非顶层 system 的原位元信息；不要把历史中的同文本简单去重。
- CLI 内部 ToolSearch 辅助轮对 API 客户端不可见，Core `helper_history.go` 与 `gateway/helper_history*` 托管完整 A/U、目录和位置锚点；Worker `helper_history_*` 捕获、验证、恢复。v2 能表达独立 system 位置和 CLI 动态尾预算 system，不能删/重算文本代替恢复。
- namespace、public parent、revision、实际工具目录/模型/策略/资格属于复用条件；新 Worker 冷导入及回退要恢复已确认私有段，不能复用未来的撤回/工具发现/资源 ID。
- 本地 `prefix-hit` 是 transcript 优化，**不是**上游 prompt cache hit 证明。缓存读写事实从真实 usage 取证。
- 当前已登记 helper 链与资源/MCP/credit/context/compaction/continuation 等组合仍有门禁；不能删除门禁而不设计对应历史、计量和账号归属。
- 资源入口与归属见 `contracts/resources/`、`engine/resource_*.go`、Core `resources.go`；固定账号/issuer leases 与错误返回不可跨账号猜测等价。计费 helper、fallback、diagnostic 等私有数据不可从公共请求头注入。

## 日志和用量

- 请求调试日志按账号开关，数据存 Worker 容器。Core 控制/查看，插件不重复保存一套模型 body 日志。
- `engine/request_log.go`、`request_trace.go`、Mod 对请求体、有效配置、处理阶段、原生历史快照/重建与实际出站/响应记录，按请求 ID 组织；日志限额/清理和脱敏依源码，不宣称磁盘无限保留或绝对所有阶段都有记录。
- Core `request_logs.go` / `request_log_limits_test.go` 与前端 `AccountRuntimes.vue` 是控制入口；关闭时停止并删除对应账号的调试日志。不要为只读交接再关闭开关或清理历史。
- request key / OAuth / auth header 等秘密须脱敏。实际调试 body 仍是敏感数据，不应整包复制进 Git。Worker 日志目前不直接保留 Core RID header，关联需时间/账号/上游 ID/完整 usage。
- `core` / `usagerules` / `gateway` / `usage` 中 `cache_write_evidence` 固定字段由 host 生成，不能由插件任意 metric 覆盖。事实与平台兼容计费桶分开；保留原金额/冻结字节/幂等键。
- 已知隐藏用量但后续失败须保留各轮事实并标 incomplete，不能写成 0 消耗；缺可信模型/用量归属不能猜费。`thinking_delta.estimated_tokens` 为可空观测，不参与收费。

## 测试与构建入口

从相应模块工作目录运行，Go workspace 保持现有依赖。以下为接续可用命令，不代表此次文档整理又跑了业务测试：

```powershell
# next/plugins/ccgateway/companions
go test ./engine
go vet ./engine
# .../companions/contracts
go test ./...
# .../companions/worker
go test ./...
go vet ./...
# next/plugins/ccgateway
go test ./...
# next/web
npm run typecheck
npm test -- src/views/ccgateway src/views/usage
```

真实 CLI tests 通常通过 `CCG_REAL_CLI` 等环境条件启动，先读该 test 的 skip/fixture/隔离配置再设置。真实 CLI 指向假提供商与真实 OAuth/提供商测试必须分开记录。PG 环境和已通过命令见对应 Linux/DB validation 文档；不要盲目沿用旧端口或生产 DSN。

Docker 构建上下文：

```sh
docker build -f next/plugins/ccgateway/companions/worker/Dockerfile -t ccgateway-worker:dev next/plugins/ccgateway/companions
docker build -f next/plugins/ccgateway/companions/controller/Dockerfile -t ccg-controller:dev next/plugins/ccgateway/companions/controller
docker build -f next/plugins/ccgateway/companions/egress/Dockerfile -t ccg-egress:dev next/plugins/ccgateway/companions/egress
```

Core `next/Dockerfile` 上下文是 `next/`。`deploy/docker/build-go.sh` 保持 Core/插件/contracts workspace 依赖，排除不在 Core 上下文构建的 companions/worker；不要直接关闭 GOWORK。编译器目前固定 Go1.27.1 官方 digest，保持已发布同版本插件包不可变。

部署步骤、精确程序哈希、账号保留、Git-only 和失败记录集中在 [接手文档](HANDOFF-2026-10-09.md)。下一项功能先补红例和方案，再实现、独立审查、真实隔离计量、Git 发布和受控公网验收。
