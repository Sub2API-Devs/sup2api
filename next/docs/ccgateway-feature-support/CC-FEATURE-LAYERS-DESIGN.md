# CC 特性分层配置与请求内容转换设计

日期：2026-10-20。实现目标已按最新讨论切换为 **Claude CLI 2.1.304 / `ccgateway-v12-feature-policy`**。2.1.302 源码引用保留为历史调查依据，不能用作 304 的二进制指纹。

本设计覆盖 **CLI 2.1.304 重新优化、Worker 改造、核心策略接口、正式前端和配套发布**。目标是在一次 build 请求内，按全局、分组、账号配置，只修改计费归属及已识别的环境字段，保留客户端其他提示内容，并兼容动态内容位于 system、user 或被客户端省略的情况。第 1–11 节定义行为，第 12 节按实际代码入口定义各层改造、接口、交付顺序和回滚。

**这是行为规范；实现与验证状态单独记录。** 304 的 CLI、Worker、核心和前端代码已按此规范改造；第 2 节保留改造前的 302 状态对照。实际验证与限制见 [304 实现记录](../CLAUDE-CODE-2.1.304-IMPLEMENTATION.md)，生产发布仍需明确执行，不因本地完成自动部署。

配套文件：[交互设计稿](cc-feature-layers-mockup.html)、[讨论与调查记录](CC-FEATURE-LAYERS-DISCUSSION.md)。后续实现以本设计为准，讨论记录保留历史依据。

## 1 范围与原则

只转换两类内容：

1. 顶层 system 中的 `x-anthropic-billing-header:` 文本，仅处理 `cc_version`、`cc_entrypoint`。
2. 已识别的完整环境块与环境更新块，仅处理第 3 节的 10 个环境字段。

“计费归属头”是请求正文里的文本，不是 HTTP Header。`<system-reminder>` 是文本包装，不代表 API 的 system 角色。数组下标不是识别条件。

其他 reminder、账号邮箱、模型说明、日期、剩余 token、CLAUDE.md、自动记忆路径、`gitStatus` 提交及修改清单、文件、Skill、MCP、Hook、工具输入与输出均不属于语义转换范围。环境的 `isGitRepo` 只表示是否为 Git 仓库，不等于 `gitStatus`；`scratchpadDirectory` 是临时目录，不等于自动记忆目录。

处理遵循以下约束：

- 保留目标原来的载体、顺序及无关文字；不把 user 中的环境复制回 system。
- 不重建整个客户端提示；原生渲染只用于取得服务端字段值及版本对应的字段文案。
- 客户端未发送的环境字段不补；计费归属按独立补齐规则处理。
- 同一请求、策略和服务端快照重复处理，结果不变。
- 每个成功处理的 build 请求只构建一次并发送一次模型请求；校验或采集失败时不发送。采集、渲染、健康探测不得产生额外模型调用。
- 保存策略在下一次请求生效，不重建账号容器。已有会话已经收到的回答不会追溯改变。

## 2 改造前的 302 能力与接入状态（历史对照）

| 能力 | CLI 2.1.302 源码行为 | 当前项目 build |
|---|---|---|
| 环境结构 | `aNe` 定义 10 个结构字段 | 转换白名单只有平台、系统版本 |
| 环境采集 | `Ryt` 收集快照，也可取得宿主提供的快照 | 平台使用 Go 运行时，OS 使用本机命令 |
| 完整环境生成 | `pZn/xyt` 输出完整环境文本 | 没有自动替换所有客户端字段 |
| 环境更新生成 | `lNe/Oyt` 支持 7 类字段更新 | 当前环境转换器不处理 update 模板 |
| 计费归属生成 | `GPo` 生成版本和入口等字段；`VAs` 生成版本指纹 | 没有按来源合并客户端字段 |
| 显式 system 块 | 项目补丁可用 `ccgatewaySystemBlocks` 覆盖默认生成结果 | 数组已接通，字符串路径不同 |
| reminder 组件 | 项目通过位置引用和渲染快照还原 | 有一次消费检查，但存在 null 文本边界错误 |
| 后续消息规范化 | 原生函数可能修复工具配对、合并消息、裁剪媒体 | 仍会执行，尚不满足完整保真要求 |
| 动态 system 排除参数 | 调整动态上下文位置；不是统一删除功能 | 必须根据收到的内容处理，不能依赖启动参数 |

原生采集／渲染不等于原生“从任意 HTTP 文本中逆向解析并局部替换”。CLI 内部拥有结构化 attachment，HTTP 通常只保留渲染结果；不能恢复不存在于 HTTP 的完整内部类型、会话状态或历史快照。

旧 `erase_client_attachments`、`replace_client_attachments` 属于另一条 native 入口。当前 build/direct 在进入 exchange 之前分流，不能把旧代码视为新 build 已支持的能力。

## 3 字段与默认值

### 3.1 计费归属

| 配置键 | UI 名称 | 可选来源 | 新配置默认 |
|---|---|---|---|
| `cc_version` | 版本标识 | 客户端／服务端 | 客户端 |
| `cc_entrypoint` | 入口标识 | 客户端／服务端 | 客户端 |

不提供手动字符串或擦除选项。版本值必须由当前 CLI 按本次请求生成，不能将 `2.1.302.b50` 作为固定版本号。三位后缀是用户消息内容参与计算的指纹；入口取运行时设置及原生回退来源。

### 3.2 环境信息

所有环境字段都提供客户端／服务端／擦除。下表的配置键是目标合同；除现有两项外均需扩展校验及能力声明。

| 配置键 | UI 名称 | CLI 结构字段 | 原生完整块表示 | 原生 update 支持 | 新配置默认 |
|---|---|---|---|---|---|
| `platform_name` | 平台名称 | `platform` | `Platform:` | 无此增量项 | 服务端 |
| `os_version` | 系统版本 | `osVersion` | `OS Version:` | 无此增量项 | 服务端 |
| `shell` | Shell | `shell` | `Shell:` | 无此增量项 | 客户端 |
| `primary_directory` | 工作目录 | `workingDirectory` | `Primary working directory:` | 新值、旧值、撤回 | 客户端 |
| `additional_directories` | 额外工作目录 | `additionalWorkingDirectories` | 标题及缩进目录列表 | 增加、移除列表 | 客户端 |
| `git_repository` | Git 仓库状态 | `isGitRepo` | `Is a git repository:` | 当前值及旧值 | 客户端 |
| `worktree` | Worktree 状态与说明 | `isWorktree` | 多行 worktree 与 stash 说明 | 进入、退出 | 客户端 |
| `scratchpad_directory` | 临时目录 | `scratchpadDirectory` | 路径及使用说明 | 新目录、不可用说明 | 客户端 |
| `github_cli` | GitHub 工具说明 | `githubCli` | 按能力生成的长文案 | 新说明、停用说明 | 客户端 |
| `agent_proxy` | Agent 代理说明 | `agentProxy` | 按能力生成的说明 | 新说明、停用说明 | 客户端 |

环境中还有与开关或运行状态有关的固定说明，例如下载文件处理提示。它们不属于上述 10 个结构字段，保留原文；未知行也不隐式归入某个字段。

这里是**本设计采用的新建配置默认值**。升级已有配置时，必须保留当前生效行为：历史缺省的 `build_attachment_sources` 表示客户端，不能因升级静默变为服务端。没有显式新建动作的旧配置按迁移后的客户端默认值保存。

CLI 本次目标安装版本固定为 2.1.304，UI 只读展示；改变 `cc_version` 的来源不会安装或切换 CLI。

## 4 三层合并与存储合同

### 4.1 合并顺序

逐字段按以下顺序取值：

```text
允许生效的账号自定义
    → 本次请求所用 API Key 的分组配置
    → 全局默认
```

不是按账号所属分组随意选择一个。一次请求使用一个明确的分组上下文；缺少分组时使用全局，账号自定义不生效。

| 分组状态 | 分组值生效 | 账号值生效 | 已保存值 |
|---|---|---|---|
| 没有分组配置 | 否，继承全局 | 账号处于自定义时直接覆盖全局 | 不自动创建分组配置 |
| 已配置但总开关关闭 | 否，继承全局 | 账号处于自定义时直接覆盖全局 | 全部保留 |
| 总开关开启，账号覆盖关闭 | 是 | 否 | 全部保留 |
| 两个开关都开启 | 是 | 账号处于自定义时生效 | 全部保留 |

“移除分组配置”删除该组覆盖值与开关，不删除账号自定义。“账号切回跟随默认”清空该账号全部覆盖值，不只是当前查看分组下的值。账号只有一份覆盖配置。

分组 CC 配置是可选层。浏览、选择分组不产生保存值；手动启用时从空的稀疏覆盖开始，默认允许账号覆盖。只有启用的分组配置才能施加账号覆盖限制。关闭或移除分组配置后，已保存的账号自定义可以直接覆盖全局，不再因分组缺省而失效。这里的“分组未配置”不同于缺少请求分组上下文：无分组上下文的后台探测仍只使用全局。

### 4.2 数据表示

全局复用 `ccgateway_remote.request_policy`，环境复用并扩展 `build_attachment_sources`；新增 `build_billing_sources`。分组记录包含 `enabled`、`allow_account_override` 和稀疏覆盖值；账号记录包含配置方式及稀疏覆盖值。持久化以实体 ID 关联，名称仅用于展示。

“跟随”在存储中表示缺少该键，不使用字符串 `"follow"` 作为 Worker 来源。不允许空字符串作为来源；可清除的 UI 值先转换成删除键操作，校验后再提交。

核心发往 Worker 的示意合同如下。它表示合并后的具体值，不包含跟随、UI 标签或分组列表：

```json
{
  "relay_mode": "build",
  "cli_version": "2.1.304",
  "build_billing_sources": {
    "cc_version": "worker",
    "cc_entrypoint": "client"
  },
  "build_attachment_sources": {
    "platform_name": "worker",
    "os_version": "worker",
    "shell": "client",
    "primary_directory": "client",
    "additional_directories": "client",
    "git_repository": "client",
    "worktree": "client",
    "scratchpad_directory": "client",
    "github_cli": "client",
    "agent_proxy": "client"
  }
}
```

JSON 来源使用既有 `client/worker` 命名；环境额外接受 `erase`。当前合同尚不接受全部示例键，必须随 schema 与能力版本升级，不能直接向旧 Worker 下发。

核心从已认证请求上下文取得 API Key 的分组，覆盖入站策略头，不允许 API 调用方自行选择管理策略。保存请求采用原子更新和版本冲突检查，避免不同管理员相互覆盖。预览和运行必须调用同一套合并逻辑。

## 5 请求处理流程

```text
核心认证并确定账号与 API Key 分组
    → 合并具体策略
    → 验证 Worker 与 CLI 能力
    → Worker 校验结构并传递原内容组件和可信策略
    → CLI 在同一个 request --build 进程中识别并生成修改计划
    → CLI 仅采集实际需要的服务端环境字段
    → CLI 原位合并完整环境与更新内容
    → CLI 原生逻辑生成本次服务端计费字段
    → 将选定计费字段合并到显式 system 块
    → 验证内容保真与请求结构
    → 单次发送模型请求
```

新合同将内容识别、原生采集、环境渲染和计费合并集中在 CLI 构建适配层。Worker 负责请求与策略校验、资源限制、进程管理和诊断接收，不再对同一个请求先执行 Go 环境替换再执行一遍 JS 替换。现有 Go 两字段转换仅作为旧合同的过渡路径保留；新旧路径互斥。此职责划分细化第 7 节的采集要求，避免维护两套环境解析语义。

direct 不执行任何内容转换，不下发环境或计费来源，不探测这些转换能力。UI 保留保存值但禁用相关控件；只有最终有效模式为 build 才执行。此项作为本设计的统一规则，替代原型中的暂定措辞。

Worker 先确认请求头选择的模式在该 CLI 版本支持列表内，再按请求执行。容器管理配置固定 build，后续策略改变不进入容器重建判定。首次部署需要更新 Worker 能力；这不意味着旧进程无需升级就能获得新功能。策略保存不得重建 #21/#22 等账号容器。

本设计新增以下能力声明，均不是当前已存在的声明：

| 能力名 | 含义 |
|---|---|
| `request_policy_mode_v1` | 按请求选择 direct/build，并验证 CLI 支持模式 |
| `build_attachment_sources_v2` | 10 个环境字段、擦除、完整块和更新块处理 |
| `build_billing_sources_v1` | 按原生生成值局部合并两个计费字段 |
| `build_content_preservation_v1` | 外部 system 统一路径及第 10 节的内容保真合同 |

保留现有 `build_attachment_sources_v1` 的原含义，不能用它证明 v2 支持。Worker 只能声明其与实际加载 CLI 共同支持的能力；核心预检和 Worker 入站都校验实际所需能力。能力不足时拒绝启用或执行对应策略，不得静默忽略或擅自切换模式。

结构无效使用 400 `invalid_request_error`；模式、CLI 版本或已声明合同不匹配使用 409 `configuration_error`；实际需要的服务端值无法取得使用 503 `configuration_error`。合法但未匹配的内容原样继续，配合字段诊断，不伪装成转换成功。

## 6 识别和修改计划

### 6.1 允许的载体

| 载体 | 环境转换 | 计费归属 |
|---|---|---|
| 顶层 system 字符串 | 按版本模板识别，保留其他文字 | 只识别独立归属文本行 |
| 顶层 system text 数组 | 在原块内定位字段 | 定位归属块，不假定下标 |
| 消息中的 system 角色 | 只分析直接 text，保留消息角色及生命周期 | 不在这里寻找或新建归属 |
| user 的独立环境 reminder | 识别完整块或更新块 | 不处理 |
| user 的普通正文、引用、代码围栏 | 不做语义转换 | 不处理 |
| user 的多个 reminder 合并为一块 | 仅在版本模板和边界明确时处理；否则跳过 | 不处理 |
| tool_result | 默认不改；其中文本可能是真实工具输出 | 不处理 |
| assistant、thinking、工具参数、图片、文档 | 不扫描 | 不处理 |

原生 `reminderFold` 可能把客户端上下文并入工具结果。未经真实样本确认，不能承诺这类内容已经支持转换，也不能为了命中率扫描所有工具输出。确认可识别的格式后，应以独立规则版本及回归样本接入。

### 6.2 识别标准

完整环境同时匹配 `# Environment`、固定引导句和合法字段布局；主系统提示中的模型／产品介绍虽然也使用该标题，不属于机器环境。

字段识别记录载体路径、UTF-8 字节范围、模板版本、逻辑字段、文本范围和依赖状态。不得用全文字符串替换去修改同名词。只有环境列表主层级的 `Platform:` 等才是字段；未知父项下的缩进子项不透明。额外目录列表和多行说明必须作为整体字段识别。

同一环境块重复声明同一字段属于歧义；历史不同时间出现多个完整环境块属于合法重复，不去重历史。嵌套标签、失配标签、未知模板和可疑引用保留原文。

先生成计划再应用。不能在发现后续歧义之前已经写入前面的结果。若某字段在本次请求的相关更新中存在无法解析的旧值、歧义或不可支持的增量，撤销该字段在本次请求中的整组计划，保留原始时间线；其他独立字段可继续处理。

### 6.3 类型和字节边界

在转换之前校验文本为非 null 字符串。`null`、错误对象类型及保留的内部引用类型直接返回 400，不让转换器把它们“修复”为上一段文字。

只替换目标范围。保留块属性、LF/CRLF、非目标文字、标签、位置和 `cache_control`。JSON 序列化允许改变对象键顺序及等价转义，不承诺整个 build JSON 字节相同；目标之外的文本字符串、数组顺序和语义字段必须满足保真规则。

“未命中”不等于“异常 JSON”：合法但未知的模板可以原样通过，结构无效的输入应拒绝。

## 7 环境值生成与局部替换

### 7.1 服务端来源

服务端环境以账号运行上下文为基础，复用版本固定的 CLI 快照和渲染代码。不能把客户端上传的路径当作 Worker 的 chdir 或文件访问授权，也不能把每次请求的随机临时执行目录误当作稳定工作目录。

Worker/CLI 适配器需取得明确的账号工作上下文，并在请求内固定一次快照。可缓存稳定且成功的事实；失败可重试，不使用 `sync.OnceValues` 永久缓存一次采集错误。需要退出或更新的会话能力按运行上下文失效，不能跨账号复用。

采集结果必须分为：

| 状态 | 含义 | 行为 |
|---|---|---|
| present | 已取得有效值，包括 false、空列表等合法值 | 按原生字段语义生成 |
| absent | 原生上下文明确没有该可选字段 | 处理为服务端确实不存在 |
| unavailable | 读取失败、超时或上下文无法确定 | 实际需要该字段时返回配置错误 |

没有识别到需要服务端替换的字段时，不采集对应事实。无环境请求不能因 OS 命令失败或目录不存在而返回 503。

### 7.2 完整块

- 客户端：原字段范围不变。
- 服务端且 present：把该字段替换成服务端值／版本文案，不复制整个服务端环境。
- 服务端且 absent：移除已识别的客户端可选字段描述，记录 `removed_server_absent`，不回退成客户端值。
- 擦除：删除该字段拥有的全部行及说明，其他字段不动。
- 客户端没有该字段：不补，不因服务端存在同名字段而添加。

“false”与“不存在”不同。例如 `isGitRepo=false` 应显示 false；`isWorktree=false` 的完整环境通常不生成肯定的 worktree 说明；额外目录为空时不保留客户端目录列表。

Git 状态与 worktree 的原生文案依赖工作目录上下文；临时目录包含路径及使用说明，GitHub/代理包含能力说明。不能把这些统一当作冒号后的标量。适配器需返回字段拥有的片段，并保证原生渲染依赖不会顺带覆盖来源仍为客户端的其他字段。

若所有目标字段被删除，但块内还有未知行或固定说明，保留这些内容。只有整个环境内容已空时才移除空的环境段；同一 text 块含其他内容时不得删除整块。

### 7.3 连续会话和环境更新

每次独立处理本次收到的历史，不保存跨请求“已替换附件列表”，也不恢复客户端已压缩或省略的内容。

沿消息顺序建立本次请求内的字段状态：

1. 解析完整块和更新块的字段事件，包括当前值、旧值、加入、移除和撤回。
2. 客户端来源保留完整时间线；服务端来源对该请求使用同一个服务端快照；擦除移除该字段的完整及更新描述。
3. 当较早的变换结果已经表达同一服务端值时，删除后续该字段的无效更新，不留下客户端的“was”或目录增删信息。更新块含其他字段时只删该字段的事件。
4. 需要表达服务端状态变化或合法缺失时，复用 `Oyt` 的相应文案；不要自造与原生矛盾的撤回提示。
5. 仅剩增量但缺少可恢复基线时，不编造旧值或目录集合。能无歧义表达当前绝对值的模板才可转换；否则按第 6.2 节撤销该字段计划并记录 `missing_baseline`。

平台、Shell、OS 不在 2.1.302 的增量字段列表中，不为它们虚构 `Environment update` 格式。客户端重新发出完整环境时照常处理。

被处理的是本次送给模型的环境描述，不是客户端真实状态，也不是对历史机器状态的复原。更改策略会影响下一次发送的历史版本和提示缓存前缀。

## 8 计费归属合并

### 8.1 单次原生生成

环境修改结束后，在同一次 build 内调用当前 CLI 的原生计费生成逻辑，获得服务端候选。`cc_version` 指纹必须以本次进入该生成点的消息为依据；不跨请求缓存完整版本字符串，不手写固定后缀。

候选必须捕获 `GPo` 的新生成结果，不能从最后的 `Rf.system` 反向取值：原生 `PNs` 会把新归属放在前面，再拼入调用方文本；`mxo` 遇到多个归属前缀会使用后遇到的候选，原客户端块可能覆盖原生候选。第 12.4 节的构建专用捕获接口要在这一步之前取得原生结果。

仅提取选择服务端的两个目标值，合并到客户端的显式 system 内容。原生生成的身份提示、其他 system 段以及额外归属字段不会因此整体覆盖客户端内容。

### 8.2 有值、缺失和异常

| 客户端状态 | 客户端来源 | 服务端来源 |
|---|---|---|
| 唯一合法字段存在 | 保留原值 | 原位替换对应值 |
| 合法块存在但目标字段缺失 | 保持缺失 | 在同一块补目标字段 |
| 确认整个归属块不存在 | 不新增 | 新建一个只含所需服务端字段的归属块 |
| 重复归属块、重复键或格式有歧义 | 原样保留 | 跳过整个归属合并，不追加；记录原因 |
| 服务端生成失败或明确禁用归属输出 | 不依赖服务端生成 | 返回明确配置错误，不绕过原生禁用策略 |

新建归属块放在顶层 system 的起始位置，不移动其余块；保留已有块的 `cache_control`，新增块不复制不属于它的缓存属性。字符串 system 转成一个显式 text 块后按同样规则处理，其原文字保持完整。

保留 `cc_version/cc_entrypoint` 之外的客户端字段、顺序及分隔格式。不得顺便覆盖 `cc_workload`、项目归属、前一请求等字段。若未来发现其他字段与修改内容有必须重算的依赖，应单独扩大设计和验收范围，不能暗中重写。

没有重复块的合法输入，处理后最多一个归属块；本来存在重复或歧义的输入按原文放过，因此“唯一”不能被误写成会擅自删除客户端重复块。

## 9 客户端提示布局兼容

`--exclude-dynamic-system-prompt-sections` 的帮助说明是将机器相关动态段从缓存的 system 前缀移到首条 user 消息。源码中的 `iar` 会把相关上下文合并到 `userContext`，自定义 system 时跳过默认 prompt 的对应生成；环境附件还有独立生产入口，不能仅凭该参数推断有无环境。

网关看不到也不需要客户端启动参数。只根据实际正文处理：

| 实际请求 | 处理要求 |
|---|---|
| 环境在 system | 原位置处理，保留其他 system 文本 |
| 环境在 user reminder | 原位置处理，不复制回 system |
| 自定义 system | 保留原文；只处理其中明确识别的目标 |
| system 字符串／text 数组／缺省 | 普通外部请求统一进入显式 system 通道；缺省用空数组 |
| 环境部分或全部缺失 | 跳过对应环境操作，正常继续 |
| 续聊／恢复／压缩后重新发环境 | 按该次请求重新识别，不使用跨请求残留 |

普通外部请求不能落回 CLI 默认 system 生成通道，否则可能把客户端排除的内容重新注入。内部账号 probe 如需原生默认提示，应使用单独的受控模式标识；不能根据 system 是否缺失来猜测请求是 probe。

位置、块边界和缓存属性保留有助于尊重客户端缓存布局，但内容实际改变时缓存前缀也会改变。本功能不承诺不同账号、策略或环境下共享同一缓存。

## 10 build 内容保真

局部转换正确不代表最终构建正确。304 外部 build 在原生 `Gmn/jA/Xfr` 与最终请求对象边界保留经过校验和局部转换的 wire 内容；模型参数仍走原生规则，并逐项验证最终出站。

### 10.1 允许和禁止的差异

允许变化：

- 配置选中的环境字段、归属字段及约定的缺失补齐；
- 擦除后空的目标段或块；
- system 字符串规范化成一个等价显式 text 块；
- 当前 build 既有的模型生成参数规范化，如 thinking、token 上限、tool choice，以及 CLI 所有的 metadata。它们需单独记录，不计为附件转换。

内容保真范围内必须保持：

- 非目标 system/user/assistant 文本、角色、相对顺序和块属性；
- 工具 ID、配对关系、输入、结果及结果内媒体；
- thinking 内容和签名、图片、文档、引用和未识别内容；
- system 消息的 `clear_at`、`output_config`、工具目录增删等已支持功能字段。

304 外部请求的完整工具定义也属于保真范围：名称、顺序、schema、延迟／缓存标记、未知属性和字段是否存在均保留。原生 CLI 会话的工具筛选不能过滤外部传入的 ToolSearch；未传 tools 和显式空数组必须区分。

生成参数分为两类：model、max_tokens、thinking、temperature、tool_choice、metadata、betas 和 output_config 的 effort／format 保留已经明确的原生处理规则；其余客户端参数及 output_config 扩展字段按原值传递。内部组件键不得经 parameters 覆盖，合并必须保留安全的 own-property 语义。禁止静默丢弃参数，也禁止用完整原始 body 撤销原生字段处理。

外部 build 不读取 `CLAUDE_CODE_EXTRA_BODY` 作为后置覆盖来源。显式 max_tokens 必须为正安全整数；thinking 必须使用 enabled／disabled／adaptive，enabled 必须有正安全整数预算，其他两种不得带预算；stream 显式传入时必须为布尔值。Worker 和独立 CLI 在发送前拒绝非法值。缺省控制项继续使用原生默认值，direct 保持原始正文。

未经显式合同支持的消息字段或 native 无法表达的结构，应在发送前拒绝，而不是静默丢弃。不能通过把完整原始 body 覆盖回 build 结果来恢复内容，因为那会撤销原生生成参数的处理。

### 10.2 必须处理的已发现边界

| 边界 | 已有证据 | 实现要求 |
|---|---|---|
| text:null 复用上一块字符串 | Go 转换及组件提取反例；后续组件校验接受重复结果 | 转换前严格类型校验，每块独立变量 |
| tool_use 与 tool_result 中间有 system | 原生 DRn 函数反例；可能补错误结果并删除真实结果 | 外部 build 使用能跨合法 system 配对的校验；无效输入报错，不自动修复 |
| error tool_result 含图片／文档 | 原生 Uks 函数会移除媒体并合并文本 | 外部保真路径不执行破坏性规整；不能支持时明确拒绝 |
| 连续 user、空白 text、未知消息字段 | 原生规范化会合并／删除／筛选 | 明确绕过或在校验阶段拒绝，不偷偷改变 |
| 字符串 system | 没有 systemBlocks，落入默认组装 | 与数组统一显式路径，probe 独立 |
| 未知嵌套环境行 | 深层 Platform 可被当作主字段 | 按模板层级识别，未知子树不透明 |
| 一个歧义片段取消整块识别 | 现有扫描器返回 nil | 对明确独立范围局部跳过；无法分离才跳过整个载体 |
| 服务端事实首次失败 | 当前 Once 缓存失败，且先取值后识别 | 先计划后采集，失败可重试 |

外部请求可以直接保留无关 reminder 为原 text，无需为了两个目标类型把它们全部拆成虚构的 Hook attachment。若保留位置引用机制，必须验证引用存在、类型匹配、恰好消费一次，并在最终发送前确认没有内部占位类型残留。

## 11 UI 与诊断

UI 使用[六个交互场景](cc-feature-layers-mockup.html)：

1. 全局默认：请求模式、计费归属 2 项、环境 10 项、只读 CLI 版本。
2. 分组默认：左侧分组列表，右侧两个开关与逐项配置。
3. 分组 direct：保留来源值但禁用转换控件。
4. 分组覆盖关闭：只提示继承全局、无需配置，不展开覆盖字段；已保存值保留，手动重新启用后恢复展示。账号自定义仍按第 4 节生效。
5. 账号自定义：按分组预览，一份账号覆盖，未改字段跟随。
6. 账号只读：展示最终值和全局／分组来源，不把保存但无效的账号值当生效值。

环境分为运行环境 3 项、目录与仓库 5 项、工具与代理说明 2 项。差异标记比较来源选项与继承来源，不比较某次请求中的真实路径；显式选择与继承值相同不标橙色。

客户端排除动态段的兼容自动执行，不新增同名设置开关。路径、Shell 和能力说明选择服务端只改变模型看到的描述，不改变工具执行位置，这个影响放在环境区简短提示中。

“处理规则”说明缺失、歧义、连续会话和失败行为。第一版不在设置页展示模拟命中率，也不新增响应诊断 Header；沿用受控请求日志。

诊断以字段操作为单位记录：

| 状态 | 含义 |
|---|---|
| `not_found` | 没有目标字段 |
| `unsupported_format` | 可疑目标不是支持的模板 |
| `ambiguous` | 字段／块重复或无法确认边界 |
| `missing_baseline` | 更新所需旧状态无法恢复 |
| `unchanged` | 识别成功，无需改变 |
| `replaced` | 原位替换成功 |
| `erased` | 按用户策略擦除 |
| `inserted` | 按归属规则补齐 |
| `removed_server_absent` | 服务端明确没有该可选环境字段 |
| `source_unavailable` | 实际需要的服务端取值失败 |

记录来源层、字段、载体位置、规则版本、策略摘要、快照标识及前后摘要；不把完整路径、Git 文案或提示正文新增到普通日志。changed=0 不能替代这些状态。

## 12 各层改造与交付设计

以下新增类型、组件、接口字段、表和模块均是待实施设计；已有文件路径在第 14 节可直接定位。本轮只完成设计，不修改业务实现、不重新打包或部署。

### 12.1 共用合同

在 `companions/contracts/features` 扩展来源枚举、字段白名单和 schema 校验，同时更新前端 `requestPolicy.ts`。环境与计费使用不同类型，禁止计费出现 erase。旧的 native 附件类型枚举不复用为新字段清单。

三层存储合同与 Worker 执行合同分开：

- 存储合同允许覆盖键缺失，分组包含两个开关，账号包含 `follow/custom` 状态。
- 执行合同只有合并后的具体模式、具体来源和固定 CLI 版本。
- 来源追踪是核心预览／诊断数据，不要求 Worker 再合并一次。
- 扩展已有 `schema_version` 时，核心、Worker、CLI 输入校验和 TypeScript 校验同步更新；当前前端只接受版本 1，不能漏改。
- 用共同的 JSON 正反例测试 Go 和 JS/TS 校验，确保未知键、null、空来源、重复 JSON 键、非法枚举及超限输入一致拒绝。

给 CLI 的新增内部组件为 `requestPolicy` 和 `runtimeContext`，位于 Worker 构建的组件 envelope 中，不放进用户 `parameters` 或最终 HTTP body。`prepareBuildInput` 必须显式允许并消费它们；模型参数不能覆盖这些内部字段。

`runtimeContext` 由 Worker 从已校验的账号运行配置构造，只包含稳定工作上下文和运行身份，不包含客户端提供的任意目录授权。最终发往上游前必须确认内部策略、上下文和引用占位均未泄漏。

### 12.2 核心策略接口与存储

**现有入口：**`server/internal/ccgateway/config.go` 的 `Config/mergeConfig/save`，`http.go` 的 remote-config 路由，`request_policy.go` 的 `WorkerRequestPolicy`。

本设计采用以下存储分工：

| 对象 | 目标存储 | 保存行为 |
|---|---|---|
| 全局 | 现有加密 `ccgateway_remote.request_policy` | 保留既有凭据及其他设置，不整包覆盖成 UI 裁剪结果 |
| 分组 | 同一 Config 新增 `cc_feature_groups`，以真实 group ID 为键 | 保存开关与稀疏覆盖；与全局在同一个设置事务提交 |
| 账号 | 新增 `ccgateway_account_feature_policies` 表，以 account_id 唯一关联 | 保存 follow/custom、覆盖 JSON、revision；不写入容器环境 settings |

账号不能直接借用现有 `settings`：当前账号 `settings` 更新入口只接受 locale/timezone，并涉及容器环境逻辑。本次新增策略是请求配置，应与容器配置和凭据分离。账号创建后默认 follow；账号软删除后不再读取其策略，硬删除时级联清理。

全局／分组沿用 `GET/PUT /system/ccgateway/remote-config`，新增 `cc_feature_groups` 和不含秘密的 `feature_revision`。PUT 缺省这些新字段必须保留原值；清空用显式空对象，不能把旧前端“不认识新字段”解释成删除。策略保存带上读取时的 revision，在事务中比较，不匹配返回 409。现有 `save` 事务锁能保证写入原子性，但没有客户端版本条件时仍可能发生过期覆盖，不能把行锁当成完整乐观并发控制。

账号策略随现有 `PATCH /accounts/:id` 的新增 `cc_feature_policy` 字段保存，与其他账号编辑在同一事务内提交，避免前端先保存账号再另调一次策略接口造成半成功。该字段仅对 CCGateway 账号有效。新增账号按 follow 创建，不接受客户端偷偷提供未获准覆盖值。

新增只读预览接口：

```text
GET  /system/ccgateway/accounts/:id/cc-features?group_id=...
POST /system/ccgateway/accounts/:id/cc-features/preview
```

GET 返回已保存账号覆盖、可查看分组、当前有效策略、各字段继承来源和可编辑状态。POST 接受未保存的账号覆盖草稿与 group_id，使用同一合并器返回预览，不落库、不调用 Worker 或模型。响应携带 global/group/account 版本组成的 `policy_revision`；返回的字段名为 `effective`、`inherited`、`sources`、`editable`、`disabled_reason`。

已有 `/system/ccgateway/accounts/:id/:action` 是通用管理路由，新路由需显式注册并防止被通配 action 当成未知管理动作。权限分别复用 settings 管理权、账号行级读写权；必须验证账号归属和分组关系，不允许通过预览读取其他账号策略或控制器秘密。分组配置修改要求 settings:manage，并核验真实分组；不得为虚构或已删除 group ID 保存配置。

**请求接入：**`gateway/dispatch.go` 已用 `c.principal.Group.ID` 调度账号，但调用 `ModelClientFor` 时仅传账号与代理。改为传入类型明确的请求上下文（账号 ID、代理 ID、API Key 分组 ID、用途），不继续用可变位置参数塞入更多 ID。

合并入口改为按账号和请求分组解析策略。账号连通性 probe 没有 API Key 分组，应显式使用 probe/global 语义，不能取账号所属分组中的第一个。缓存键和失效事件包含全局版本、group ID、账号版本；策略变更只使策略缓存失效，不改变容器 desired revision。

当前 remote-config 保存后会 Kick 所有运行时。新逻辑必须区分连接／网络／镜像改变与仅请求策略改变；后者不进入容器重建判定。分组移除、关闭和账号切回 follow 均用第 4 节的保存语义处理。

### 12.3 Worker 请求入口优化

| 现有文件 | 改造职责 |
|---|---|
| `engine/main.go` | 按请求选择模式，验证真实 CLI 支持集合；停止强制要求请求模式等于容器环境变量 |
| `engine/request_command.go` | 一次读取、严格结构校验、构造内部组件、单次子进程、保持超时／取消／流式行为 |
| `engine/request_components.go` | 修复 null；v2 保留原始消息，不再泛化拆分无关 reminder |
| `engine/build_attachments.go` | v1 过渡兼容与测试保留；v2 禁止重复执行这套 Go 语义替换 |
| `contracts/features/attachments.go`、`request_modes.go` | 新合同、能力和功能目录，不能继续用 v1 文案声称覆盖新字段 |
| `worker/internal/config/config.go` | 支持可信运行上下文及经验证的活动 CLI 制品描述，保留旧环境变量回退 |

Worker 仍先做 JSON 类型、大小、非法内部键和来源合同检查；具体模板匹配和替换计划在同一个 CLI 进程内完成。对新合同，`messagesBuildComponents` 保留 system/messages 的内容及属性，只做有定义的 API→组件映射，不在 Go 与 JS 各解析一遍环境。

v2 路径不再在未匹配前调用 Go 的 OS 采集；CLI 匹配后按需取值。仍使用 `json.RawMessage` 保留未解析区域，禁止把所有数字提前转成 float64。超过 JS 能安全表达范围的数值继续按明确合同拒绝，不静默舍入。

诊断通过版本化、可区分的 stderr 协议记录返回 Worker，不能混进成功响应 stdout。诊断必须有长度上限、字段白名单和脱敏；现有错误帧、HTTP 原始错误、取消检测和流式时序保持。健康信息返回实际生效的 CLI 版本、patch、哈希和能力，而不是只报告请求配置值。

### 12.4 CLI 2.1.304 补丁与构建适配层

**版本范围：**新增 2.1.304 的独立 hash-bound patcher；保留 2.1.296 和 2.1.302，不绕过 profile 哈希验证，也不直接手改生成后的压缩产物作为源码。

`request-input.js/request-build.js` 等支持文件被不同版本 patcher 共用。304 新策略必须通过显式合同版本和版本适配器进入；共用文件的通用修复需补旧版本回归，不能因改了公共模块就让 旧版本隐式加载 304 私有符号。

建议新增两个项目支持模块（名称属于本设计）：

| 模块 | 职责 |
|---|---|
| `request-content-policy.js` | 纯函数识别、字段计划、完整／更新状态处理、环境局部应用、计费字段合并、诊断 |
| `native-environment-2.1.304.inc.js` | 2.1.304 原生绑定，按需采集快照、渲染字段及提供计费生成捕获接口 |

原生绑定统一由 `patch-cli-2.1.304.cjs` 导出或注入；业务解析器不散布压缩函数名。新增或读取原生模块时将其基线 SHA 加入版本 profile；补丁锚点必须恰好命中一次，失配立即停止构建。升级同版本不同二进制基线也不能自动忽略哈希差异。

同一进程内的目标顺序：

```text
request-command 解析 Worker envelope
  → request-content-policy 仅根据原始文本生成计划
  → request-native-context 按需采集服务端字段
  → 应用环境修改，留下逐字段诊断与内容保真基线
  → prepareBuildInput 转成原生记录，保留无关原文
  → 原生 builder 处理生成参数
  → 捕获原生 GPo 本次生成的归属
  → 最终 system 使用原块与选定原生字段的合并结果
  → 检查消息保真后交 model-request 单次发送
```

具体补丁点：

| 位置 | 设计改动 |
|---|---|
| `request-input.js` | 严格非 null 文本；显式 system 数组统一；仅消费受控内部组件；保留消息原文及生命周期 |
| `request-build.js` | 接入一次转换计划与原生快照；传递外部保真标识；不以原始 body 覆盖原生参数结果 |
| `xRn` | 仍生成原生参数，在最终 system 边界调用局部合并；不再简单从 `Rf.system` 提取服务端计费值 |
| `PNs/GPo` | 在 `GPo` 返回后、混入客户端 system 之前，通过构建专用回调捕获新归属；沿用 `VAs` 原生指纹 |
| `gRn/DRn` | 外部 build 用合法工具配对校验替代有损自动修复，允许支持的中间 system；无效输入报错 |
| `Uks/ERn/dRn/cL` 等 | 外部保真路径不静默删除媒体、空白块或重排内容；超限／无法表达时明确拒绝 |
| `_A/TYr` | 保留已有 api_system 与 wire system 支持，并验证前后规范化不会破坏其位置和功能字段 |
| `model-request.js` | 发送已构建结果；保留原认证、Header 和错误协议，不再次注入环境或归属 |

构建专用回调只在内部 `ccgatewayBuildOnly` 路径设置，不能由用户正文提供。所有客户端来源时可以不使用捕获结果，但仍走显式 system 通道。选择服务端时只拿原生生成的目标字段，不修改进程全局 `CLAUDE_CODE_ENTRYPOINT` 来假装改变运行方式。

原生渲染只构造环境文字，不进入工具或 Agent 执行循环。不要为每个字段或每轮再启动一个 `claude -p` 探针；一个成功的请求只有一个 request CLI 进程和一次模型 POST。

性能约束：每次请求对候选文本做一次扫描并复用字段计划，不为 10 个字段各遍历一遍全部历史；先匹配后采集，快照在请求内共享，只复制实际修改的载体。保真检查复用解析结果和修改范围。记录转换耗时、计划命中数、采集耗时及 CLI 启动次数，与改造前同一批样本比较；不预先宣称性能收益，也不通过省略正确性检查换取数字。

### 12.5 正式前端接入

HTML 设计稿仅用于交互对照，正式界面沿用现有 Vue 和 `@sub2api/ui`，不能将原型的整页 innerHTML 渲染复制进产品。

| 现有文件或新增组件 | 改造范围 |
|---|---|
| `views/ccgateway/RemoteSettings.vue` | CC 页全局／分组子页、组列表、统一草稿与保存状态；保留连接、网络、部署页行为 |
| `views/ccgateway/RequestPolicySettings.vue` | 改为复用字段表单；CLI 版本从 SInput 改为只读文本；新增计费与 10 项环境字段 |
| `views/ccgateway/requestPolicy.ts` | 分开全局、稀疏覆盖、有效值类型；扩展校验、迁移、客户端归一化和字段元数据 |
| 新 `CCFeatureFields.vue` | 全局／分组／账号共用字段渲染、跟随、来源标签、差异数和 direct 禁用 |
| 新 `CCFeatureGroupSettings.vue` | 两个开关、添加／移除配置、保存值与生效值区分 |
| 新 `CCFeatureAccountSettings.vue` | follow/custom、按分组预览、只读态；与账号编辑草稿共同提交 |
| `views/accounts/AccountEditor.vue`、`AccountEditorNav.vue` | 仅 CCGateway 账号新增 CC 特性分区；加载、保存、切账号时状态隔离 |
| `views/accounts/editorErrors.ts` | 增加 `cc_features` 分区与字段错误映射，错误不再落入 scheduling |
| `api/types.ts` 及 i18n | 存储／预览响应类型、来源名称、状态和校验文案 |

`normalizeRequestPolicy` 当前只挑选认识的字段，扩展时必须保留新字段，不能保存网络配置时把计费或分组策略清空。新全局默认与旧配置迁移默认分开；覆盖表单不得把“跟随”展开成永久显式值。

预览以服务端合并器为准。切换账号或分组时取消／忽略旧响应，防止慢响应覆盖新选择。关闭分组、切换 direct 或切到只读分组时不清空草稿；只有明确切回账号 follow 才清空全部账号覆盖。保存失败保留草稿，revision 冲突提示重新读取并比较，不宣称已生效。

首版不提供新建账号的提前自定义；创建完成后默认跟随，再进入编辑页配置。分组名称变化不影响按 ID 保存的策略。账号只读预览不能显示无效的账号值，实际内容值如邮箱、真实路径也不需要在配置页面中采集。

### 12.6 304 制品重建与原位升级

**现有发布约束：**

- `cli-mods/build.sh` 在 Linux x64/glibc、Bun 1.4.3 下同时编译 `cli.js` 与 hooks worker 入口。
- `package-release.cjs` 当前硬编码接受 `ccgateway-v11-native-build-parameters`，修改补丁必须同步更新打包校验。
- Worker 镜像从 `cli-mods/release/` 复制固定 CLI，不下载未打补丁的 latest。
- `controller/cli_profiles.py` 检查 manifest、mode、根目录归属和二进制 SHA；Worker 当前从环境变量读取 CLI path/version/hash/patch。
- `manager.update_worker` 当前仅提取并替换 Worker 程序，不会同时升级 CLI。

本次目标补丁标识定为 `ccgateway-v12-feature-policy`，CLI 产品版本为 2.1.304。patcher 的 `--ccgateway-info`、补丁清单、支持文件哈希、package-release 校验、release manifest、Worker 能力目录与发布证据必须使用同一标识。不要修改原版基线哈希来接纳已经改过的输入。

保留旧 CLI 文件，新增制品按 patch ID 暂存到受信任 CLI 根目录下的版本子目录，校验通过后通过 root 拥有且 Worker 不可写的 `active-runtime.json` 选择活动 manifest。新 Worker 优先读取并完整验证这个活动描述；不存在时回退既有环境变量。该描述及其引用文件都必须位于受信任根目录，检查真实路径、所有者、不可写权限、版本、mode、patch 和 SHA，不能成为绕过现有校验的新入口。

这样不需要为了改变容器启动环境变量中的旧 SHA 而重建账号容器。Controller 的原位升级扩展为受控的 Worker+CLI 配套事务：

1. 从指定且已验证的发行制品读取 Worker、CLI、manifest，按类型限制大小；不使用下载官方未打补丁 CLI 的通道替代。
2. 校验当前账号容器身份和旧制品，暂停新任务准入并等待现有任务结束；忙时返回 busy，不强杀在途模型请求。
3. 暂存新 CLI、manifest 和新 Worker，备份旧 Worker 与活动描述；所有新文件校验完成后再切换。
4. 切换 Worker 与活动描述，重启同一容器或现有受控进程，验证新 Worker 及 CLI 的实际 patch/hash/capabilities，再恢复接流。
5. 失败同时回滚 Worker 和活动描述，恢复旧 CLI 选择；不能只回滚其中一个。

升级前后 container ID、账号认证目录、历史目录和账号 ID 必须不变。制品激活状态与“必须重建 app 容器”的配置指纹分离，避免下一次 reconcile 又因镜像或旧环境标记不一致而重建。新容器使用新发行镜像；既有容器使用经过验证的原位激活路径。

现有 worker-only 更新 API 保留兼容；新增配套更新动作只接受受控制品身份及组件枚举，不接受客户端任意目标路径。账号容器不能满足可信目录或原位激活前提时明确报错，不能回退为重建 #21/#22。Controller 自身更新与账号容器更新分别记录。

### 12.7 分阶段交付与退出条件

| 阶段 | 交付内容 | 完成条件 |
|---|---|---|
| A 合同与回归基线 | 共用字段 schema、来源规则、反例及出站差异框架 | Go 与 TS/JS 正反例一致；现有行为基线可复现 |
| B 304 CLI 优化 | 单处转换、原生绑定、归属捕获、保真路径、v12 patch | Linux 实际 CLI 的本地 mock 请求通过完整内容矩阵 |
| C Worker 与制品链 | 新 envelope、动态模式、诊断、能力、配套原位激活 | Worker→CLI→mock 一次发送；配套更新和回滚不改变容器 ID |
| D 核心分层 | 存储、版本检查、统一合并、预览、API Key 分组传递 | 多组账号、关闭开关、权限、并发保存与缓存失效测试通过 |
| E 正式前端 | 三层表单、6 个状态、错误映射、i18n、能力提示 | 保存重载与预览一致；只读、切组、失败草稿行为正确 |
| F 联合验收 | 第 13 节全部矩阵与升级回退 | 输出可复核证据后才允许启用新策略 |

上述阶段描述依赖顺序，不要求把前端留到最后才开发；可以根据稳定合同制作正式组件，但不能把仅 UI 可选当成后端能力已上线。

### 12.8 策略迁移与回滚

升级保留已有客户端／服务端值；不激活历史 native 擦除配置，不删除账号覆盖。没有新字段的旧保存请求不会清除新配置。显式保存后再应用新选择，旧 Worker 不具备能力时清楚报错。

发布先安装支持新合同的 Worker/CLI，再启用核心和 UI 的新策略。每个阶段有独立版本和 capability，不用“都是 2.1.304”推断兼容。

回退到旧核心／Worker前，先将活动策略切回可表示的兼容快照，并保留新配置的备份或未激活存档；不能把新字段从数据库默默删除。恢复新版本后可重新激活原覆盖值。配置回滚与制品回滚分开，均不得改变连接凭据、账号认证或账号容器身份。

## 13 验收标准

最终验收捕获 Worker 经实际打补丁 CLI 发往本地 mock 的 HTTP 请求，不调用真实模型。对输入和最终出站做结构化差异，分别标记字段转换、容器规范化及既有生成参数规范化；禁止未知内容差异。

| 维度 | 必测样本 | 关键断言 |
|---|---|---|
| 归属来源 | 客户端、服务端、混合来源 | 只改选择的键，原生指纹按当前请求生成 |
| 归属缺失 | 缺一键、缺整块、无 system | 只补服务端键，不带入默认身份提示 |
| 归属歧义 | 重复块、重复键、异常分隔 | 不追加、不隐式去重、诊断准确 |
| 环境字段 | 10 项逐项与组合 | 多行说明和列表整体归属正确 |
| 环境缺失 | 无块、部分缺失、可选字段 absent | 不补环境；不依赖无关事实读取 |
| 服务端异常 | 必需读取失败、重试成功 | 明确失败，不永久缓存错误 |
| 模板边界 | LF/CRLF、Unicode、重复字段、嵌套、围栏、引用 | 不误改未知内容；null 返回 400 |
| CLI 布局 | 排除动态参数开／关、自定义 system、字符串／数组 | 保留原位置，无默认提示回注 |
| 连续会话 | 首轮、两轮工具往返、恢复、压缩 | 历史与新增块一致，每次只发送一次 |
| 环境更新 | 目录变化、增删列表、Worktree、能力撤回、缺基线 | 不留下冲突旧值；缺基线按规则跳过 |
| 内容保真 | 中间 system、error 媒体、thinking、缓存标记、工具目录 | 无未授权丢失、重排或重复 |
| 三层配置 | 无组配置、两个开关组合、多组账号、清空覆盖 | 预览与运行一致，按请求 API Key 分组 |
| direct | 存在已保存转换来源 | body 保持既有 direct 透传行为，不执行转换 |
| 幂等与版本 | 重复处理、不同请求指纹、新旧 Worker | 不累加内容；能力不足明确失败 |
| 生命周期 | 保存、重新读取、模式改变 | 下一请求生效，账号容器不重建 |
| 管理接口 | 旧前端缺省新字段、并发 revision、越权预览 | 不清空新策略，不覆盖更新，不泄漏其他账号信息 |
| 前端状态 | 切组慢响应、保存失败、只读与草稿切换 | 不串账号／分组、不丢草稿、不假报生效 |
| 配套制品 | patch/hash 不匹配、激活失败、重启及回滚 | Worker 与 CLI 成套切换，container ID 和账号认证不变 |

必须覆盖“没有环境字段，同时模拟服务端事实读取失败”仍能正常发送；必须覆盖客户端已排除动态信息时不被默认 build 再次补回。

已有证据可复用：标准 Windows 2.1.302 首轮抓包只变平台／OS 的组件阶段验证、提取还原单测和原生函数反例。它们不能替代全部扩展字段及最终出站矩阵。Linux CLI 全链路验收是发布条件，不能以 mock 渲染器或源码阅读代替。

## 14 源码依据

相对路径均从本文所在目录解析。压缩源码行较长，函数名是更稳定的定位依据。

| 依据 | 文件和定位 |
|---|---|
| 当前环境策略白名单 | [attachments.go](../../plugins/ccgateway/companions/contracts/features/attachments.go)，`BuildAttachmentSources.Validate` |
| 当前核心全局策略 | [request_policy.go](../../server/internal/ccgateway/request_policy.go)，`WorkerRequestPolicy` |
| 策略头与能力探测入口 | [client.go](../../server/internal/ccgateway/client.go)，`forwardAttempt` |
| Worker 模式分流 | [main.go](../../plugins/ccgateway/companions/engine/main.go)，`ServeHTTP` |
| 转换与组件构建顺序 | [request_command.go](../../plugins/ccgateway/companions/engine/request_command.go)，`serveRequestCommand`、`messagesBuildComponents` |
| 环境识别和替换 | [build_attachments.go](../../plugins/ccgateway/companions/engine/build_attachments.go)、[environment_attachments.go](../../plugins/ccgateway/companions/engine/environment_attachments.go) |
| 位置引用提取 | [request_components.go](../../plugins/ccgateway/companions/engine/request_components.go)，`extractSystemComponents` |
| CLI 输入还原 | [request-input.js](../../plugins/ccgateway/companions/cli-mods/request-input.js)，`prepareBuildInput` |
| CLI 构建与最终 system 选择 | [request-build.js](../../plugins/ccgateway/companions/cli-mods/request-build.js)、[patch-cli-2.1.302.cjs](../../plugins/ccgateway/companions/cli-mods/patch-cli-2.1.302.cjs) |
| 环境 schema、采集、完整与增量生成 | [原生核心](../../../artifacts/claude-2.1.302/linux-restored/chunk-8242685m.js)，第 38–40 行 `aNe/lNe/Ryt/pZn/xyt/Oyt`；第 3448 行 `LIn` |
| 原生配对及媒体规整 | 同上，`gRn/DRn/Uks` |
| 原生计费归属 | [归属模块](../../../artifacts/claude-2.1.302/linux-restored/chunk-dy1pvfkh.js)，`GPo` |
| 原生版本指纹 | [指纹模块](../../../artifacts/claude-2.1.302/linux-restored/chunk-fgk2rzb0.js)，`sj/Qm/VAs` |
| 动态排除参数和上下文迁移 | [参数声明](../../../artifacts/claude-2.1.302/linux-restored/chunk-hjb4qtaj.js)，第 28 行；[上下文组装](../../../artifacts/claude-2.1.302/linux-restored/chunk-3tbxnwq4.js)，`iar` |
| 官方合成首轮 HTTP 样本 | [request-1.json](../../../artifacts/attachment-probe-BMPwq4/request-1.json) |
| 更广附件调查 | [BUILD-ATTACHMENT-TRANSFORM-DESIGN.md](../../plugins/ccgateway/docs/BUILD-ATTACHMENT-TRANSFORM-DESIGN.md) |
| 配置读写和管理路由 | [config.go](../../server/internal/ccgateway/config.go)、[http.go](../../server/internal/ccgateway/http.go) |
| API Key 分组与 transport 调用 | [dispatch.go](../../server/internal/gateway/dispatch.go)，`c.principal.Group.ID` 与 `ModelClientFor` |
| 账号 settings 白名单与账号保存 | [ccgateway.go](../../server/internal/account/ccgateway.go)、[handlers.go](../../server/internal/account/handlers.go) |
| 现有 CC 特性前端 | [RemoteSettings.vue](../../web/src/views/ccgateway/RemoteSettings.vue)、[RequestPolicySettings.vue](../../web/src/views/ccgateway/RequestPolicySettings.vue)、[requestPolicy.ts](../../web/src/views/ccgateway/requestPolicy.ts) |
| 账号编辑前端 | [AccountEditor.vue](../../web/src/views/accounts/AccountEditor.vue)、[AccountEditorNav.vue](../../web/src/views/accounts/AccountEditorNav.vue)、[editorErrors.ts](../../web/src/views/accounts/editorErrors.ts) |
| 前端 API 类型 | [types.ts](../../web/src/api/types.ts) |
| CLI 构建和发行 | [build.sh](../../plugins/ccgateway/companions/cli-mods/build.sh)、[package-release.cjs](../../plugins/ccgateway/companions/cli-mods/package-release.cjs)、[302 profile](../../plugins/ccgateway/companions/cli-mods/profiles/linux-x64-2.1.302.json) |
| Worker 镜像和启动配置 | [Dockerfile](../../plugins/ccgateway/companions/worker/Dockerfile)、[config.go](../../plugins/ccgateway/companions/worker/internal/config/config.go) |
| 现有原位更新与 CLI 校验 | [manager.py](../../plugins/ccgateway/companions/controller/manager.py)，`update_worker`；[cli_profiles.py](../../plugins/ccgateway/companions/controller/cli_profiles.py) |

本地还原源码和 patched-v11 产物用于上述定位；已有核对确认 patched-v11 核心哈希与其补丁清单一致。本设计不据此推断线上正在运行的产物版本。
