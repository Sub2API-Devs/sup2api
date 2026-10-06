# Mod $.tool.register 探针完成报告

**探针时间**: 2026-10-06  
**目标**: 验证用 Claude Code Mod 的 `$.tool.register` 替换 SDK MCP 注册客户端工具的可行性  
**环境**: cc-max 主机，账号 22 容器 `ccg-dea8fa2ce873f60d0-app`，Claude Code 2.1.288  
**真实 API 调用数**: 6 次（基准 2 + 验证 4）

---

## 核心结论

**不可替换。** `$.tool.register` 在 Claude Code 2.1.288 中存在两个致命限制：

### 1. 注册的工具不出现在 API 请求中（H1 完全失败）

**证据**:
- A-mod 案例：5 个客户端工具成功调用 `$.tool.register`，全部返回 `{ tool: "mcp__ccgateway__<名称>" }`
- 但出站请求的 `tools` 数组只有 `["Read"]`（内置工具），注册的客户端工具全部缺失
- 对比 A-sdk（SDK MCP 基准）：同样的 6 个客户端工具全部出现在出站 `tools` 数组中

**影响**: 模型永远看不到 Mod 注册的客户端工具，无法调用它们。这是根本性失败。

### 2. 必须有至少一个内置工具才能注册（H7 部分失败）

**证据**:
- `--tools ''`（空白名单）时，所有 `$.tool.register` 调用被拒绝
- 错误信息: `"this session has no built-in tools (--tools \"\"), so it takes none from plugins"`

**影响**: CCGateway 当前策略是 `--tools ''`（不暴露内置工具给客户端），与此限制直接冲突。

---

## 其他硬条件结果

- **H2（动态注册）**: ⚠️ API 调用成功，但注册的工具不进入出站请求，无实际意义
- **H3（名称保持）**: ✅ 内置工具的 tool_use 名称保持一致，`tool.call` 事件正常
- **H4（重名行为）**: ⚠️ 不会报错，但注册工具不出现，冲突行为无法完整验证
- **H5（续接）**: ✖️ 无法验证（模型看不到注册工具，无法生成 tool_use）
- **H6（延迟加载）**: ⚠️ 机制存在但无效（`tool.describe` 不会对未出现在 tools 列表中的工具触发）
- **H7（白名单）**: ❌ 完全失败（空白名单拒绝注册 + 白名单不影响注册工具的出站）
- **H8（含 __ 的名称）**: ✅ Mod 会加前缀，但工具不出现
- **H9（StructuredOutput）**: ✅ 与 Mod 注册互不干扰

---

## 根本原因

`$.tool.register` 的设计意图是**插件为自己的功能注册工具并执行**，不是用于**透传客户端工具**。

- SDK MCP 通过模拟 MCP 服务器，让 CC 的"工具发现"逻辑将客户端工具加入 `init.tools` 和出站请求
- Mod 注册只是在 CC 内部注册表添加记录，**不会触发 API 请求构造逻辑**
- 注册的工具不出现在 `prompt.compose` 事件的 tools 列表中，对模型完全不可见

---

## 建议

**继续使用当前的 SDK MCP 方案**（`tools/ccgateway/sdk_mcp.go`），它已验证可行。

如果希望客户端工具的 name 与直连官方时一致（不加 `mcp__ccgateway__` 前缀），需要：
1. 等待 CC 未来版本提供"透传客户端工具"API，或
2. 修改 CC 源码，或
3. 寻找其他替代机制（如拦截出站请求并修改 tools 数组，但这超出 Mod 能力范围）

**当前 2.1.288 版本的 Mod `$.tool.register` 完全不适用于此场景。**

---

## 产出文件

- **探针脚本**: `D:/projects/golang/sup2api/next/docs/handoff-evidence/2026-10-06-ccgateway/mod-tool-register-probe.cjs`（无凭据）
- **详细结果**: `D:/projects/golang/sup2api/next/docs/handoff-evidence/2026-10-06-ccgateway/mod-tool-register-results.md`（本地，包含所有案例证据和类型定义摘录）
- **清理状态**: 容器内 25 个探针根目录、70 个会话目录、临时脚本已全部删除

---

**探针完成时间**: 2026-10-06  
**报告语言**: 中文（按用户要求）
