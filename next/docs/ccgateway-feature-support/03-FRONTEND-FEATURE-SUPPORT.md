> **2026-10-08 调研/方案快照，非当前状态。** 正文中的“当前缺口/未实现/候选接口/未来菜单”对应当时基线；部分已在后续批次完成。当前架构与实际接口见[实现指南](IMPLEMENTATION-GUIDE.md)，部署/已验证与剩余事项见[接手文档](HANDOFF-2026-10-09.md)、[当前进度](implementation/PROGRESS.md)及[独立审计](implementation/COMPLETION-PROTOCOL-AUDIT-2026-10-09.md)。保留官方调研与设计依据，不据旧状态重复实施。

# 前端「特性支持」实施方案

状态：2026-10-08 调研与契约提案；本文不代表已实现、测试通过或已上线。本文只规划前端及其所需接口，不修改业务代码。所有示例版本、时间和能力结果均为契约示例，不能用作线上证据。

## 1. 当前源码与需要解决的问题

已在 `D:/projects/golang/sup2api` 绑定的 CodeGraph 中定位 `validRequestPolicy`，并直接读取以下代码：

- `next/web/src/views/ccgateway/RequestPolicySettings.vue`：目前分别展示请求头、请求体，beta 来自前端默认值，bodyFeatures 是 12 项固定说明；同一工具搜索特性分散在 beta、工具字段、搜索策略多个位置。
- `requestPolicy.ts`：七条 beta、unknown_beta/unknown_field、allow_fast/allow_effort、tool_search、附件来源等组成同一个 RequestPolicy。前端 tool_search 校验当前不接受 `auto:0`；官方文档的范围为 0–100，后续应与 Worker 一起对齐，不能只放开前端。
- `RemoteSettings.vue`：GET/PUT `/system/ccgateway/remote-config`；以 JSON 比较维护策略 dirty，六个横向菜单为连接、网络、请求与工具、附件、部署、账号。
- `AccountRuntimes.vue`：已有账号状态、授权、请求日志开关；没有本方案所需的账号级特性覆盖编辑器。日志经 `/system/ccgateway/accounts/{id}/request-logs` 操作。
- `RuntimeInstall.vue`：已有运行环境查询与显式安装按钮。镜像配置与程序真实能力不能相互代替。
- `next/web/src/i18n/locales/{zh,en}/ccgateway.ts`：目前有 headerTitle/bodyTitle、固定 beta/字段描述，也有未必由当前组件使用的旧目录文案，不能把翻译键存在当成功能存在。
- `next/server/internal/ccgateway/request_policy.go`：EffectiveRequestPolicy 仍把 Betas 重置为内置列表；不能仅增加前端自定义选项就宣称已配置成功。

现状问题是把“名称出现”“代码接受”“管理员允许”“CLI 实际采用”“上游账号支持”“真实验证成功”混成一个支持状态。新页面必须将这些事实分开，但放在同一个特性详情中。

## 2. 页面布局：一个特性、一处入口

保留当前横向菜单在内容卡片上方的结构；将「请求与工具」改为「特性支持」。不新增请求头、请求体两个子菜单，不再重复列出同一特性。

「特性支持」默认区域：

1. 一行筛选：搜索、特性分类、能力状态；账号和模型为可选评估上下文，窄屏折叠为筛选按钮。
2. 简短上下文摘要：已选账号、实际 CLI/Worker 版本、认证方式、上游类型、最近探测时间。未选账号时显示“通用适配范围，未评估具体账号”。
3. 分页紧凑列表：名称、当前状态、限制摘要；建议每页 8–10 项。点击行打开右侧详情抽屉，移动端使用同一详情视图。
4. 配置发生修改时才显示固定保存栏：修改项数、保存全部、放弃更改。列表筛选、切换账号上下文、打开详情不构成配置修改。

详情抽屉按顺序展示“用途与当前可用性 → 客户端怎么请求 → 当前处理方式 → 限制与验证 → 管理员策略”。header/body/CLI/env 属于同一特性的详情，不是页面分类依据。技术路径默认折叠，普通使用者先看能否使用及示例。

目标在 1440×900、100% 缩放时主列表及保存栏基本一屏；较小屏允许自然滚动。禁止为塞一屏使用过小字体、截断错误原因或在卡片中堆多个垂直滚动区。长 JSON 只在展开详情中显示，支持复制；长 beta 名称正常换行。

「附件与环境」「部署与运行」「账号容器」保持独立菜单。附件策略不复制到特性支持页，只提供一条只读摘要和跳转链接。

## 3. 内容和控件边界

### 只读支持说明

模型选择、SSE、system、citations、普通工具调用等已有自然支持能力，只提供说明与当前证据，不凭空制造“启用此功能”开关。没有实际后端策略的特性不得出现可保存控件。

每个特性详情统一包含：

- 稳定 feature ID、中文/英文名称、分类、官方资料链接。
- 客户端协议、相关 header 名称和值、body JSON 路径、最小有效请求片段。
- Worker 的处理机制：原生映射、环境变量、Mod、响应转换、内部循环；均为只读，不允许用户自由填写命令/环境变量。
- 当前评估状态、原因、受影响范围、可采取的下一步。
- 证据类型：源码审核、隔离真实 CLI、真实上游；各自版本、日期和用例引用。单纯 header 到达只表示传输验证。
- 已保存策略与本次评估的实际采用值；不把未保存草稿标为生效。

### 有真实业务意义的管理员策略

保留/迁移现有允许 fast、允许 effort、工具搜索模式、自定义普通工具 MCP 前缀、上游错误处理等策略。新增策略必须先有后端实施与验证，随后由服务端 schema 描述允许选项。

未知 beta 和未知 body 的处理放在「未识别特性」详情，不再以请求头/请求体划分主页面。二者可以具有不同策略，但必须写清“忽略会丢弃该要求”“透传仅传输不保证语义兼容”。不能把任意 body 透传默认打开，也不能允许客户端设置 Worker 执行环境、路由、凭据和权限。

自定义 beta 属于管理员高级策略，不能由用户选择任意 mapping 名字后假装获得实现。Feature registry 拥有可执行映射；额外标记只能表示经过策略允许的 header 传递。

## 4. 能力状态：配置值不能证明可用

建议分开保存三组机器状态，再生成中文摘要，避免一个 supported 布尔值：

- adapter_status：`supported / partial / unsupported / planned`，表示当前 Worker 适配范围。
- availability：`available / unavailable / unknown`，按 CLI、Worker、model、auth_method、provider、账号权限评估。
- policy_status：`allowed / denied / inherited`，表示管理员允许与否。

未知不是不支持；未验证不是失败；UI 不能把缺失版本、离线账号、健康检查通过映射为“已支持”。混合账号分组展示“部分账号可用”，具体列表在详情中；核心仍须逐请求重新检查，前端快照不能作为执行授权。

标准 reason_code 示例：`worker_policy_version_unsupported`、`cli_feature_unavailable`、`model_unsupported`、`account_entitlement_unknown`、`provider_unsupported`、`adapter_missing_response_block`、`administrator_denied`、`probe_stale`。服务端返回参数化详情；i18n 翻译稳定 code，未知 code 显示可理解的通用提示和诊断 ID，不能空白。

典型显示：

- Tool Search：可能是“有限支持：客户端自定义工具延迟加载已适配；API server-tool 定义或 tool_reference 历史未完成”。不得只因 ENABLE_TOOL_SEARCH=true 显示全面支持。
- 最大输出：注明 CC 可能按模型裁剪，只有实际出站核验才给精确参数保证。
- Thinking：按模型显示可用类型、display 值与限制；模型不允许关闭时 disabled 不能显示“已关闭”。
- Fast：策略允许与账号获准分开；实际发生 cooldown/standard fallback 应能从请求记录查看。
- OpenAI Chat Completions/Responses：仅在协议过滤器中显示“未来适配”，列出缺少的语义转换、流式事件和工具往返验证；不能因平台有入口或模型名称相同标为 CCGateway 已支持。

## 5. 接口与 schema 提案

以下路由和字段是建议契约，须与核心/Worker 实施文档统一命名后定稿，不是现有 API。

- `GET /system/ccgateway/features`：版本化特性目录、只读说明、可编辑策略 schema、资料链接。来源应是同一后端 registry；前端不再复制 beta 白名单。
- `GET /system/ccgateway/accounts/{id}/capabilities?model=...`：实际 Worker/CLI 版本与能力快照、评估结果、探测时间。默认只读查询，不自动发推理、安装或重启。
- 全局策略仍可挂在现有 remote-config，新增 schema_version/config_revision；账号覆盖使用单独受权限控制接口。不要让选择“评估账号”隐式创建账号配置。

特性定义示例：

```json
{
  "catalog_version": "proposal-1",
  "features": [{
    "id": "F-TOOL-SEARCH",
    "title_key": "ccgateway.features.toolSearch.title",
    "protocols": ["anthropic.messages"],
    "subcapabilities": ["cc_internal", "api_server"],
    "request": {
      "headers": [{"name": "anthropic-beta", "values": ["advanced-tool-use-2025-11-20"], "requirement": "legacy_or_provider_dependent"}],
      "body_paths": ["tools[].defer_loading", "tools[].type"],
      "content_block_types": ["tool_search_tool_result", "tool_reference"]
    },
    "implementation": {
      "mechanisms": ["cli_env", "tool_registry", "history_adapter"],
      "environment": ["ENABLE_TOOL_SEARCH"],
      "minimum_worker_capability": "tool_search_v2"
    },
    "policy_schema": {
      "type": "object",
      "properties": {
        "mode": {"enum": ["request", "off", "on", "threshold"]},
        "threshold_percent": {"type": "integer", "minimum": 0, "maximum": 100}
      },
      "additionalProperties": false
    }
  }]
}
```

`body_paths` 只是相关结构索引，不表示全部已支持；详情必须结合 adapter_status 和字段级 limitations。`tool_reference`是块类型而非同名JSON属性，并可嵌套在搜索结果或工具结果中，应按所属codec校验。现代API示例不要求旧advanced-tool-use beta，界面不得将其显示为所有搜索请求必填。mode/threshold 是未来 UI 规范化形式，兼容层再转换当前 request/false/true/auto:N；不能直接改发送格式要求旧 Worker 猜测。

能力评估示例：

```json
{
  "account_id": 22,
  "observed_at": "<RFC3339>",
  "runtime": {
    "worker_version": "<实际版本>",
    "worker_build_commit": "<实际提交>",
    "cli_version": "<实际版本>",
    "policy_schema_versions": [1],
    "auth_method": "oauth",
    "provider": "anthropic"
  },
  "model": "claude-opus-5-5",
  "features": [{
    "id": "F-TOOL-SEARCH",
    "adapter_status": "partial",
    "availability": "unknown",
    "policy_status": "allowed",
    "reason_code": "adapter_missing_response_block",
    "limitations": ["<以源码及用例证据填充>"],
    "verification": [{"kind": "source_audit", "result": "partial", "evidence_id": "<报告引用>"}]
  }]
}
```

证据结果应结构化为 pass/fail/partial/not_run，不把文案解析成状态。API不得返回账号凭据、环境变量值、实际完整请求体或 OAuth 文件。请求详情日志沿用 Worker 存储与权限机制，不在插件侧重复保留。

## 6. 全局、账号、客户端的优先级

提议按两类处理，避免简单“后者覆盖前者”造成账号绕过全局限制：

1. 能否启用的限制：平台/全局禁止为上限，账号只能进一步收紧；CLI/模型/provider 硬限制任何层都不能突破。
2. 运行默认值：显式账号覆盖优先于全局默认；客户端请求在允许集合内选择具体值；缺失参数交给明确的默认规则，不能把 absent、null、false、0 当成同一个值。

账号级编辑选择为“跟随全局 / 覆盖”，重置意味着删除 override 键而不是复制当前全局值。前端只展示后端计算的 effective_policy 及 provenance，不再复制整套后端优先级。全局配置与账号配置分别保存、分别 dirty；跨上下文切换先保留草稿或提示未保存，不静默丢弃。

当前尚无账号 feature override，不将其描述为已存在功能。可以先交付全局设置和账号只读能力评估，再交付账号覆盖，避免第一阶段出现无后端支持的空控件。

## 7. 保存、版本与旧 Worker

保存请求带 `schema_version`、`expected_revision` 和显式变更；成功响应返回规范化策略、new revision、受影响账号的兼容性结果。409 revision冲突保留草稿、给出差异与重新加载入口，不能自动覆盖他人设置。校验错误定位到具体特性，不被笼统的“保存失败”吞掉。

特性目录缓存不能与配置一起提交；只提交管理员控制的字段。刷新只读能力不改变 dirty。隐藏菜单的修改仍计入“保存全部”，延续目前切换菜单不丢草稿的行为。

旧 Worker 不支持新策略时：

- 前端在保存前展示影响账号，核心保存验证仍是最终依据；能力探测失败展示未知，不能默认兼容。
- v1可精确表达的策略可由核心降级编码，标记兼容路径；不能将“不认识的新功能”静默删掉后继续调用。
- 默认拒绝会改变不兼容目标实际行为的激活；若后端设计允许保存待升级草稿，必须有独立 draft/active 状态，不能把“已保存待激活”显示成生效。
- 执行端还须拒绝超出支持版本/必需能力的请求；具体 HTTP 状态与错误码由执行协议统一，UI按code显示升级要求，不自行把它解释为没有账号或冷却。
- schema_version 不兼容与 ordinary API 参数不支持是不同错误。新UI连接旧核心时降级只读兼容页，并解释缺少版本化能力接口。

保存特性策略、刷新能力、切换菜单均不得安装镜像、替换容器或重启服务。部署页继续区分“默认新建镜像”“当前容器镜像引用”“实际Worker程序版本”；镜像不一致只提示，显式手动更新才执行。现有 #21/#22 原容器、数据卷和授权保持用户既定约束，不因UI迁移触发重建。

## 8. 保留附件界面和当前未提交改动

本次文档编写前以下三个文件已有未提交改动：RemoteSettings.vue、RequestPolicySettings.vue、RequestPolicySettings.spec.ts。不得覆盖、回滚或在整理特性页面时漏合并。

保持其目标行为：

- 已知附件每项只选跟随默认、客户端环境、网关容器环境；workingDirectory/platform是独立行，不再展示environment聚合控制。
- 顶部默认来源仍可都保留；未知客户端/容器附件仍可放行或忽略。
- 旧 environment=client/gateway迁移为未显式配置字段的值；显式字段优先；删除旧聚合键。旧单项both迁移为跟随默认，保存前展示迁移说明，因为在某些全局默认下有效行为会改变。
- legacy配置加载后的待迁移状态计入dirty；不自动后台保存；保存后再次加载不重复迁移。
- 普通system、工具发现、Hook上下文保护及模型可见cwd与容器实际cwd区别继续明确。

未来将迁移规则集中到后端版本迁移，前端暂时保留当前兼容逻辑，直到版本化接口到位；不能前后端同时迁移造成重复写入。删除旧文案需确认所有引用，zh/en同步维护。

## 9. 实施拆分与验收

第一阶段：抽离 FeatureSupport 只读列表、详情和现有可编辑策略；服务端 registry 为事实来源。没有能力接口时显示未评估，不伪造绿灯。AttachmentPolicy 独立组件保持当前草稿模型。

第二阶段：接入账号/模型能力快照、版本化保存、迁移预览及兼容性拒绝。第三阶段才增加账号策略覆盖、受控验证操作；任何会发真实请求/产生费用的验证都必须是显式按钮，页面打开或筛选不能自动跑推理。

前端验收必须覆盖：

- 单个feature汇总header/body映射且无重复控件；自然支持特性仅说明。
- 切换tab、过滤和详情不丢草稿；失败保存不清空草稿；409冲突不覆盖；只读用户无编辑权限，后端同时鉴权。
- mixed/unknown/stale状态、模型/认证/provider变更重评估、旧Worker/旧核心兼容，不从镜像tag猜程序能力。
- Tool Search阈值0、100和越界值；fast允许但账号未知；thinking模型不支持禁用；未知beta/body的不同策略和未实现值。
- 保留现有附件迁移回归用例和三选项约束；全局默认both仍能继承；不重新出现聚合environment行。
- GET能力/保存策略不会触发部署；显式手动更新与状态提示保持分离。
- i18n中英文、键盘导航、焦点恢复、aria状态、窄屏详情及1440×900截图验收。
- 以Worker实际出站记录核对一个完整特性案例；组件测试通过不能代替CLI、真实上游或线上验收。

官方参考：[Agent SDK配置](https://code.claude.com/docs/en/agent-sdk/configuration)、[CC环境变量](https://code.claude.com/docs/en/env-vars)、[工具搜索](https://code.claude.com/docs/en/mcp#configure-tool-search)、[网关兼容指南](https://code.claude.com/docs/en/llm-gateway-protocol)。前端“支持”最终取决于本项目适配、运行时条件和验证证据，不能直接照搬官方功能列表。
