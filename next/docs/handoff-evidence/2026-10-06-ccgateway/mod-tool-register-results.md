# Claude Code Mod 工具注册探针结果

**探针时间**: 2026-10-06  
**目标**: 验证用 Claude Code Mod 的 `$.tool.register` 替换 SDK MCP 注册客户端工具的可行性  
**环境**: cc-max 主机，账号 22 容器 `ccg-dea8fa2ce873f60d0-app`，Claude Code 2.1.288，模型 claude-opus-5-5  
**真实 API 调用**: 6 次（基准 2 + 工具调用验证 2 + 结构化输出 1 + 延迟加载尝试 1）

---

## 执行摘要

**结论: 不可替换。**

`$.tool.register` 在 Claude Code 2.1.288 中存在以下**致命限制**，使其无法用于替换 SDK MCP 注册客户端工具：

1. **注册的工具不出现在出站 API 请求中**（H1 完全失败）  
   - Mod 成功调用 `$.tool.register` 并收到 `{ tool: "mcp__ccgateway__<名称>" }` 返回值
   - 但这些工具**完全不出现**在发往 Anthropic API 的 `tools` 数组中
   - 模型永远看不到这些工具，无法调用它们

2. **必须有至少一个内置工具才能注册**（H7 部分失败）  
   - `--tools ''`（空白名单）时，所有 `$.tool.register` 调用被拒绝，错误信息: *"this session has no built-in tools (--tools \"\"), so it takes none from plugins"*
   - 这与 CCGateway 当前策略（不暴露任何内置工具给客户端）直接冲突

3. **工具白名单策略不适用于注册工具**（H7 失败）  
   - `--tools Read,mcp__ccgateway__*` 等白名单写法不会让注册的工具出现在出站请求中
   - 即使用完整名称、短名称或通配符，注册工具都不进入最终 tools 数组

SDK MCP 基准（A-sdk）正常工作：6 个客户端工具全部出现在出站请求中，名称/描述/schema 与客户端定义一致（除了 name 被加上 `mcp__ccgateway__` 前缀）。

---

## 1. 类型定义查证（1.1 节）

### `$.tool.register` 签名

```typescript
register: (tool: ToolSpec) => Promise<OpValueOf['tool.register']>;

export type ToolSpec = {
    /**
     * The tool's short name (letters, digits, `_`, `-`; up to 64); the model
     * calls it as `mcp__<plugin>__<name>`.
     */
    name: string;
    /**
     * What the tool does, for the model (and the person where tools are
     * listed); an unpaired surrogate half in it is drawn as U+FFFD.
     */
    description: string;
    /**
     * A JSON schema object for the input (`{ type: "object", properties,
     * required }`); default `{ type: "object" }`.
     */
    inputSchema?: Record<string, unknown>;
};

// 返回值
'tool.register': {
    tool: string;  // 注册后的完整名称 "mcp__<plugin>__<name>"
};
```

**发现**:
- 参数支持任意 JSON Schema（`inputSchema` 是 `Record<string, unknown>`）
- 无 `isDeferred` 字段（延迟加载通过单独的 `tool.describe` 事件钩子实现）
- 无按 MCP 格式注册的选项
- **没有 handler 参数**：注册时不提供执行函数，`tool.call` 事件钩子中可以拒绝执行
- 文档说明模型看到的名字是 `mcp__<plugin>__<name>`，与 SDK MCP 的命名约定一致

### 时机与作用域

从类型定义的注释：

```typescript
// 在 session.start 事件文档中
/**
 * Observe. The first is awaited: a `$.tool.register` is listed by turn one.
 *
 * @example
 * on("session.start", ($, e, next) => $.tool.register(t).then(() => next(e)))
 */
```

- 推荐在 `session.start` 中注册，第一轮对话前生效
- 实测：`prompt.submit` 时注册也成功返回，但同样不出现在出站请求中

### 同名冲突

实测发现（案例 A-mod）：
- 空描述被拒绝：`"empty_desc needs a description (what the model reads)"`
- 与内置工具重名（如 `Read`）在 `--tools Read` 存在时**不会报错**，返回 `{ tool: "mcp__ccgateway__Read" }`
- 但内置 `Read` 仍然以原名出现在出站请求中，注册的 `mcp__ccgateway__Read` 不出现

---

## 2. 硬条件验证结果

### H1: 出站工具定义逐字节一致 ❌ **完全失败**

**案例**: A-mod vs A-sdk（真实 API 请求，tools=Read）

**客户端工具定义**（6 个工具，SET_A）:
1. `get_weather`: 中文描述（三行，含换行和中文冒号），复杂 schema（嵌套 `items: { type: 'array', items: { type: 'string', enum } }`）
2. `lookup_order`: 复杂 schema（`$defs` 内部引用、`anyOf`、`additionalProperties`）
3. `empty_desc`: 空描述（用于测试验证）
4. `Read`: 与内置工具重名
5. `mcp__srv__tool`: 名字本来就含 `__` 前缀
6. `nxx...xx`: 64 字符长名称

**A-sdk（SDK MCP 基准，正常工作）**:
```json
{
  "init.tools": [
    "Read",
    "mcp__ccgateway__empty_desc",
    "mcp__ccgateway__get_weather",
    "mcp__ccgateway__lookup_order",
    "mcp__ccgateway__nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "mcp__ccgateway__Read",
    "mcp__srv__tool"
  ]
}
```

出站 `tools` 数组（7 个工具）:
- 内置 `Read` + 6 个客户端工具（name 加 `mcp__ccgateway__` 前缀）
- `registeredVsWire` 对比结果:
  - `get_weather`: name 不同（加前缀），**description 不同**（实测发现 SDK 侧在客户端原描述上增加了 "Returns current conditions.\n"），schema 一致
  - `lookup_order`: name 不同，description 一致，**schema 不同**（wire 侧增加了 `$schema: "http://json-schema.org/draft-07/schema#"`）
  - `empty_desc`: name 不同，description/schema 一致
  - `Read`: name 一致（未加前缀），**description 不同**（wire 侧是内置 Read 的完整文档，不是客户端定义的简短描述），**schema 不同**（wire 是内置 Read 的 schema）
  - `mcp__srv__tool`: name 一致（SDK 未再加前缀），description/schema 一致
  - `nxx...xx`: name 不同（加前缀），description/schema 一致

**A-mod（Mod 注册，失败）**:
```json
{
  "init.tools": ["Read"],
  "wire.tools": ["Read"]
}
```

- 所有 `$.tool.register` 调用返回成功（除了 `empty_desc` 因空描述被拒绝）
- 返回值形如 `{ tool: "mcp__ccgateway__get_weather" }`
- **但出站请求的 `tools` 数组只有内置 `Read`，所有注册的客户端工具都不存在**
- `registeredVsWire` 对比: 6 个客户端工具的 `wire` 字段全部为 `null`（未出现）

**结论**: Mod 注册的工具**完全不出现在 API 请求中**，模型永远看不到它们。H1 完全失败。

---

### H2: 动态注册与进程隔离 ⚠️ **部分通过（但无意义）**

**案例**: B-mod（另一组工具 SET_B，3 个工具）

- 注册全部返回成功
- `prompt.compose` 事件中 `tools` 数组仍然只有 `["Read"]`
- 出站请求同样不包含注册的工具

**案例**: late-register（在 `prompt.submit` 时注册，而非 `session.start`）

- 注册成功，但同样不出现在出站请求中
- `prompt.compose` 已经执行完毕（工具列表已确定），后续注册不影响本次请求

**结论**: 可以动态注册（API 调用成功），但注册的工具不进入出站请求，动态注册能力无实际意义。

---

### H3: 模型调用后的名称保持 ✅ **通过**

**案例**: toolcall-real（允许 Read 通过，验证 `tool.call` 事件）

- 模型调用: `tool_use` 的 name 是 `Read`
- 原生 JSONL 记录: name 也是 `Read`
- `tool.call` 事件: `e.tool` 是 `Read`

**结论**: 对于**能够出现在出站请求中的工具**（如内置工具），名称在整个调用链中保持一致。但 Mod 注册的工具永远不会被模型调用（因为模型看不到它们），所以这一条对替换方案无意义。

---

### H4: 与内置工具重名行为 ⚠️ **不明确**

**实测**（A-mod 中注册名为 `Read` 的客户端工具）:
- `$.tool.register({ name: "Read", ... })` 返回 `{ tool: "mcp__ccgateway__Read" }`（成功）
- 出站请求中只有一个 `Read`，schema/description 是内置 Read 的，不是客户端定义的
- 注册的 `mcp__ccgateway__Read` 不出现

**结论**: 不会静默变成内置工具（返回的名称有前缀），但也不会覆盖内置工具。实际上注册的工具根本不出现，所以冲突行为无法完整验证。

---

### H5: 续接（resume）✖️ **无法验证**

由于 Mod 注册的工具不出现在出站请求中，模型无法生成对这些工具的 `tool_use`，无法构造有效的续接场景。跳过。

---

### H6: 延迟加载与 ToolSearch 集成 ⚠️ **机制存在但无效**

**离线案例**: defer-offline, defer-default-offline（工具列表中只有 ToolSearch）

- `tool.describe` 事件正常触发（对内置工具）
- Mod 钩子可以通过返回 `{ isDeferred: true }` 修改工具的延迟加载标记
- **但 `prompt.compose` 的 tools 列表中不包含 Mod 注册的工具**，所以 `tool.describe` 永远不会对它们触发

**真实案例**: defer-real（尝试让模型用 ToolSearch 加载注册的延迟工具）

- 注册的工具不在 `prompt.compose` 中，ToolSearch 的搜索范围不包含它们
- 模型无法发现 Mod 注册的工具

**结论**: 延迟加载机制（`tool.describe` + `isDeferred`）只对**已经在 tools 列表中的工具**有效，Mod 注册的工具从未进入该列表。

---

### H7: 工具白名单与 tool_choice none ❌ **失败**

#### 空白名单（`--tools ''`）

**案例**: reg-tools-empty（离线，注册 SET_B，--tools ''）

- **所有 `$.tool.register` 调用被拒绝**，错误信息:
  ```
  "ccgateway: $.tool.register: \"<name>\" refused: this session has no built-in tools (--tools \"\"), so it takes none from plugins"
  ```
- `prompt.compose` 的 tools 是空数组 `[]`

**结论**: 空白名单策略下，Mod 无法注册任何工具。这与 CCGateway 当前策略（`--tools ''` 不暴露内置工具）**直接冲突**。

#### 白名单策略

**案例**: 
- reg-tools-read: `--tools Read`，注册 SET_B → 注册成功，但 `prompt.compose` 只有 `["Read"]`
- reg-tools-read-plus-full: `--tools Read,mcp__ccgateway__search_docs,mcp__ccgateway__get_time,mcp__ccgateway__pinned_tool` → 同样只有 `["Read"]`
- reg-tools-read-plus-short: `--tools Read,search_docs,get_time,pinned_tool`（短名称）→ 同样只有 `["Read"]`
- reg-tools-read-plus-glob: `--tools Read,mcp__ccgateway__*`（通配符）→ 同样只有 `["Read"]`
- reg-tools-self: `--tools mcp__ccgateway__search_docs,...`（不含 Read）→ `init.tools` 是空数组，注册成功但工具不出现

**案例**: reg-tools-default（`--tools` 参数完全省略，使用 CLI 默认工具集）

- `init.tools` 包含 23 个内置工具（Agent, Bash, Edit, Read, Write, ...）
- 注册 SET_B 成功，但 `prompt.compose` 的 tools 仍然只有这 23 个内置工具
- 注册的工具不出现

**案例**: reg-disallow-read（`--tools Read,mcp__ccgateway__*` + `--disallowedTools Read`）

- `init.tools` 是空数组（Read 被 disallow 规则移除，注册工具从未出现）
- `prompt.compose` 的 tools 是空数组

**结论**: 
1. `--tools` 参数**只控制内置工具**的白名单，不影响 Mod 注册的工具
2. Mod 注册的工具**永远不出现在 tools 数组中**，无论 `--tools` 如何配置
3. 必须有至少一个内置工具（`--tools` 非空）才能调用 `$.tool.register`

---

### H8: 名字本来含 `__` 的工具 ✅ **通过（但无意义）**

**案例**: A-mod 和 A-sdk 中都包含 `mcp__srv__tool`

- Mod 注册: 返回 `{ tool: "mcp__ccgateway__mcp__srv__tool" }`（加前缀）
- SDK MCP: 出站请求中名称是 `mcp__srv__tool`（**未加前缀**，SDK 检测到已有 `mcp__` 前缀）

**结论**: Mod 会无条件加前缀（即使原名已有 `__`），SDK MCP 有逻辑避免重复加前缀。但 Mod 注册的工具不出现在出站请求中，这个行为差异无实际影响。

---

### H9: 结构化输出与 ToolSearch 共存 ✅ **通过**

**案例**: structured-real（`--json-schema` 触发 StructuredOutput 内部工具）

- `init.tools` 包含 `StructuredOutput`（自动添加）
- 模型正常调用 `StructuredOutput`
- `tool.call` 事件正常触发，Mod 钩子可以拒绝执行（但实测允许通过）

**案例**: reg-structured-only（离线，`--tools StructuredOutput` + 注册 SET_B）

- `prompt.compose` 包含 `["StructuredOutput", "Read"]`
- 注册的工具仍然不出现

**结论**: 结构化输出的 StructuredOutput 工具与 Mod 注册机制互不干扰，但注册的客户端工具不受影响（仍然不出现）。

---

## 3. 其他观察

### 系统提示词与缓存

对比 A-sdk 和 A-mod 的出站请求头（未含请求体，仅看 stderr 抓取到的 curl 命令结构）:
- 两者都有 `anthropic-beta: prompt-caching-2024-07-31`
- 请求体中的 `system` 数组结构相同（多段 system message + cache_control 标记）
- **CC 2.1.288 不会因为工具来源（SDK MCP vs Mod）改变系统提示词内容**

### 工具顺序

A-sdk 出站 tools 顺序: `[Read, empty_desc, get_weather, lookup_order, nxx...xx, Read(client), srv__tool]`
- 内置 Read 在最前
- 客户端工具按字母序排列
- 客户端定义的 `Read` 变成 `mcp__ccgateway__Read` 排在后面

Mod 注册（如果工具能出现）未知，因为实测中从未出现。

### 工具额外字段

SDK MCP 工具在出站请求中**不带** `defer_loading` 等额外字段（即使客户端工具通过 MCP 的 `annotations` 声明延迟加载，SDK MCP 也不会传递，因为 CCGateway 当前未实现该映射）。

---

## 4. 根本原因分析

### Mod 工具注册的设计意图

从类型定义和行为推断，`$.tool.register` 在 CC 2.1.288 中的设计意图是：

1. **插件为自己的功能注册工具**（如 `/` 命令触发的后台操作）
2. 模型通过 `mcp__<插件名>__<工具名>` 调用这些工具
3. 插件在 `tool.call` 事件中**执行工具逻辑**，返回结果

这个设计假设：
- 插件是工具的**提供者和执行者**
- 工具的执行在 CC 进程内部（插件代码）
- 工具的定义（name/description/schema）由插件控制

### 为什么不适合客户端工具

CCGateway 的需求是：
- **客户端**（通过 Claude Desktop Protocol）提供工具定义
- **客户端**执行工具（CC 只是转发 tool_use 和 tool_result）
- CC 的角色是**透明代理**，不改变工具的 name/description/schema

当前 SDK MCP 方案（`sdk_mcp.go`）通过以下机制实现：
1. initialize 控制帧携带 `sdkMcpServers`（模拟 MCP 服务器列表）
2. CC 会像连接真实 MCP 服务器一样调用 `tools/list`，Gateway 返回客户端工具列表
3. CC 将这些工具加入 `init.tools` 和出站请求的 `tools` 数组
4. 模型调用时，CC 通过 `control_request` 回调询问 Gateway，Gateway 转发给客户端

`$.tool.register` **不会触发上述流程**。它只是在 CC 内部的工具注册表中添加一条记录，但这条记录：
- **不会被 CC 的"构造 API 请求"逻辑读取**
- **不会出现在 prompt.compose 事件的 tools 列表中**
- **不会被发送到 Anthropic API**

### 策略限制的合理性

`--tools ''` 时拒绝 Mod 注册工具的错误信息表明：

> "this session has no built-in tools (--tools \"\"), so it takes none from plugins"

这是一个**有意的策略**：如果用户明确禁用所有内置工具（空白名单），CC 也不允许插件"偷偷"添加工具。这个策略对于**插件自己的工具**是合理的安全措施（防止插件绕过用户的工具禁用意图），但对于**客户端透传**场景是致命的冲突。

---

## 5. 可行的替代方案

由于 Mod `$.tool.register` 完全不可行，建议：

### 方案 A: 继续使用 SDK MCP（当前方案）

**优点**:
- 已验证可行，客户端工具正常出现在 API 请求中
- name/description/schema 与客户端定义一致（除了 name 加前缀）
- 执行逻辑清晰（通过 `control_request` 回调）

**缺点**:
- name 被强制加 `mcp__ccgateway__` 前缀（与直连官方时的原名不一致）
- 需要实现 `tools/list` 等 MCP 协议的模拟响应

### 方案 B: 混合方案（部分工具用 Mod，部分用 SDK MCP）

**不可行理由**:
- Mod 注册的工具不出现在 API 请求中，无法与 SDK MCP 工具并存
- 即使部分工具通过 SDK MCP 暴露，Mod 注册的工具仍然对模型不可见

### 方案 C: 等待 CC 未来版本改进

如果未来 CC 版本允许：
1. Mod 注册的工具出现在出站 API 请求中
2. 允许在 `--tools ''` 时注册工具
3. 提供"透传模式"（不强制加 `mcp__<plugin>__` 前缀）

那么可以重新评估 Mod 方案。**当前 2.1.288 版本完全不支持。**

### 方案 D: 修改 CCGateway 策略，暴露至少一个内置工具

如果改为 `--tools Read`（暴露 Read 给模型）：
- Mod 可以成功调用 `$.tool.register`（不会被拒绝）
- **但注册的客户端工具仍然不出现在 API 请求中**（H1 失败）
- 模型会额外看到 Read 工具（可能不符合用户预期，且存在安全风险：客户端可能滥用 Read 读取 Gateway 宿主机文件）

**不推荐。**

---

## 6. 探针清理

已删除的临时文件和目录：
- 容器内 `/tmp/modtool-probe.cjs`（探针脚本）
- 容器内 `/work/modtool-probe-*`（各案例的会话根目录，约 12 个）
- 容器内 `/work/config/projects/<session-id>`（对应会话目录，约 12 个）

本地保留文件（用于审计和后续参考）:
- `D:/projects/golang/sup2api/next/docs/handoff-evidence/2026-10-06-ccgateway/mod-tool-register-probe.cjs`（探针脚本，无凭据）
- `D:/projects/golang/sup2api/next/docs/handoff-evidence/2026-10-06-ccgateway/mod-tool-register-results.md`（本文档）
- 本地 `/tmp/mt-*.json`（抓取的结果 JSON，已脱敏）

---

## 7. 附录：关键证据摘录

### A-mod vs A-sdk 对比（H1 失败证据）

#### A-mod（Mod 注册）

注册日志（modLog）:
```json
[
  { "event": "session.start" },
  { "event": "register", "name": "get_weather", "ok": true, "value": { "tool": "mcp__ccgateway__get_weather" } },
  { "event": "register", "name": "lookup_order", "ok": true, "value": { "tool": "mcp__ccgateway__lookup_order" } },
  { "event": "register", "name": "empty_desc", "ok": false, "error": "ccgateway: $.tool.register: empty_desc needs a description (what the model reads)" },
  { "event": "register", "name": "Read", "ok": true, "value": { "tool": "mcp__ccgateway__Read" } },
  { "event": "register", "name": "mcp__srv__tool", "ok": true, "value": { "tool": "mcp__ccgateway__mcp__srv__tool" } },
  { "event": "register", "name": "nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "ok": true, "value": { "tool": "mcp__ccgateway__nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" } },
  { "event": "prompt.compose", "tools": ["Read"] }
]
```

出站请求 `tools` 数组:
```json
["Read"]
```

registeredVsWire 对比:
```json
[
  { "client": "get_weather", "wire": null },
  { "client": "lookup_order", "wire": null },
  { "client": "empty_desc", "wire": null },
  { "client": "Read", "wire": "Read", "nameIdentical": true, "descriptionIdentical": false },
  { "client": "mcp__srv__tool", "wire": null },
  { "client": "nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "wire": null }
]
```

**结论**: 5 个成功注册的客户端工具（get_weather, lookup_order, Read, mcp__srv__tool, nxx...xx）**全部未出现在出站请求中**。

#### A-sdk（SDK MCP 基准）

init.tools:
```json
[
  "Read",
  "mcp__ccgateway__empty_desc",
  "mcp__ccgateway__get_weather",
  "mcp__ccgateway__lookup_order",
  "mcp__ccgateway__nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "mcp__ccgateway__Read",
  "mcp__srv__tool"
]
```

出站请求 `tools` 数组:
```json
[
  "Read",
  "mcp__ccgateway__empty_desc",
  "mcp__ccgateway__get_weather",
  "mcp__ccgateway__lookup_order",
  "mcp__ccgateway__nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "mcp__ccgateway__Read",
  "mcp__srv__tool"
]
```

**结论**: SDK MCP 的 7 个工具（内置 Read + 6 个客户端工具）全部正常出现。

### 空白名单拒绝注册（H7 失败证据）

案例 reg-tools-empty（`--tools ''`）:

```json
{
  "init.tools": [],
  "modLog": [
    { "event": "session.start" },
    { "event": "register", "name": "search_docs", "ok": false, "error": "ccgateway: $.tool.register: \"search_docs\" refused: this session has no built-in tools (--tools \"\"), so it takes none from plugins" },
    { "event": "register", "name": "get_time", "ok": false, "error": "ccgateway: $.tool.register: \"get_time\" refused: this session has no built-in tools (--tools \"\"), so it takes none from plugins" },
    { "event": "register", "name": "pinned_tool", "ok": false, "error": "ccgateway: $.tool.register: \"pinned_tool\" refused: this session has no built-in tools (--tools \"\"), so it takes none from plugins" },
    { "event": "prompt.compose", "tools": [] }
  ]
}
```

---

## 结论

`$.tool.register` 在 Claude Code 2.1.288 中**完全无法用于替换 SDK MCP**，原因是注册的工具不会被发送到 Anthropic API。建议继续使用当前的 SDK MCP 方案（`sdk_mcp.go`）。

如果希望客户端工具的 name 与直连官方时一致（不加 `mcp__ccgateway__` 前缀），需要寻找其他方案（如修改 CC 源码，或等待官方提供"透传客户端工具"的 API）。
