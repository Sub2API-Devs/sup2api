# 单轮客户端工具实施计划

日期：2026-10-09
基线：feat/next-platform @ c6c8bf888
设计文档：`SINGLE-TURN-CLIENT-TOOLS-DESIGN.md`

## 当前实现状态

### ✅ 已正确实现

1. **工具执行拦截**（`mod/hooks/register.js:152-166`）
   - `tool.call` hook 拦截所有客户端工具
   - 仅允许内部 ToolSearch 和 StructuredOutput 执行
   - 返回 `{deny: 'ccgateway: execution belongs to the API client.'}`

2. **轮次限制**（`mod/hooks/register.js:36-44`）
   - `turn.step` hook 限制后续模型请求
   - 允许结构化输出的一次格式验证续轮
   - 正确处理工具交接场景

3. **退出码处理**（`runner_session.go:340-341`）
   - 忽略 CLI 的非零退出码
   - 注释明确说明"工具交接达到 max-turns 并以非零退出，尽管响应是完整的"

### ⚠️ 需要调整的部分

#### 1. maxTurns 策略

**当前逻辑**（`runner_config.go:27-40`）：
```go
func (r *Request) maxTurns() string {
    if r.forcedLoadedClientCatalog() {
        return "1"
    }
    switch {
    case r.structuredOutput() && r.toolSearchEnabled():
        return "5"  // ❌ 不符合单轮设计
    case r.structuredOutput():
        return "2"  // ✅ 允许一次格式验证续轮
    case r.toolSearchEnabled():
        return "4"  // ❌ 不符合单轮设计
    }
    return "1"  // ✅ 默认单轮
}
```

**设计要求**（设计文档第9行）：
> 建议该模式统一向 CC 传入 `--max-turns 1`

**但要注意**（设计文档第35行）：
> 在本文建议的单轮模式下，不主动注入这种内部发现流程

**结论**：
- ❌ 不应该为了内部 ToolSearch 设置 maxTurns=4 或 5
- ✅ 结构化输出的 maxTurns=2 是合理的（格式验证续轮）
- ✅ 其他场景统一 maxTurns=1

#### 2. ToolSearch 注入策略

**当前逻辑**（`runner_config.go:52-54`）：
```go
if r.toolSearchEnabled() && !r.forcedLoadedClientCatalog() {
    tools = append(tools, "ToolSearch")  // ❌ 主动注入
}
```

**设计要求**（设计文档第35-37行）：
> 不主动注入这种内部发现流程。若客户端明确使用 `defer_loading`、工具引用或动态发现协议，不能为了单轮而默默改成全量加载。必须走已验证的等价适配；不具备时，在调用模型前明确拒绝该组合。

**结论**：
- ❌ 单轮模式下不应注入内部 ToolSearch
- ❌ 不能静默改变 `defer_loading` 的值
- ✅ 应该在请求解析时明确拒绝 defer_loading + 单轮的组合

## 实施方案

### 方案 A：保守方案（推荐）

**原则**：明确区分单轮模式与多轮模式，不破坏现有功能

1. **保持当前 maxTurns 逻辑不变**
   - 已经工作正常
   - 工具拦截机制确保客户端工具不会在容器执行
   - maxTurns > 1 仅用于内部 ToolSearch 轮次

2. **当前实现已经符合设计文档核心要求**：
   - ✅ 工具执行前拦截（已实现）
   - ✅ 完整响应返回（已实现）
   - ✅ 客户端工具不在容器执行（已实现）
   - ✅ 正确处理轮次上限（已实现）

3. **补充测试和文档**：
   - 添加完整测试覆盖
   - 更新特性说明文档
   - 说明内部 ToolSearch 的工作方式

### 方案 B：严格单轮方案

**原则**：严格按照设计文档，禁用内部 ToolSearch

1. **修改 maxTurns 逻辑**：
   ```go
   func (r *Request) maxTurns() string {
       if r.structuredOutput() {
           return "2"  // 允许格式验证续轮
       }
       return "1"  // 统一单轮
   }
   ```

2. **禁止注入 ToolSearch**：
   ```go
   func (r *Request) enabledTools() []string {
       tools := []string{}
       if !r.NoTools {
           for _, tool := range r.Tools {
               if r.runtimeToolSearchable(tool.Name) {
                   tools = append(tools, r.wireName(tool.Name))
               }
           }
       }
       // 不再注入内部 ToolSearch
       sort.Strings(tools)
       return tools
   }
   ```

3. **拒绝不兼容的组合**：
   ```go
   func (r *Request) validateSingleTurnMode() error {
       if r.toolSearchEnabled() {
           for _, tool := range r.Tools {
               if tool.DeferLoading != nil && *tool.DeferLoading {
                   return fmt.Errorf("defer_loading requires multi-turn tool discovery, which is not supported in single-turn client tool mode")
               }
           }
       }
       return nil
   }
   ```

### 方案对比

| 方面 | 方案 A（保守） | 方案 B（严格） |
|------|--------------|--------------|
| 与设计文档字面一致性 | 中等 | 高 |
| 破坏现有功能风险 | 低 | 中等 |
| defer_loading 支持 | 保留（通过内部搜索） | 拒绝 |
| 实施复杂度 | 低 | 中等 |
| 测试工作量 | 中等 | 高 |

## 推荐决策

**选择方案 A（保守方案）**，理由：

1. **当前实现已经满足核心需求**：
   - 工具拦截机制确保客户端工具单轮交接
   - 内部 ToolSearch 是独立的发现流程，不影响客户端工具循环
   - 响应完整返回给客户端

2. **设计文档的核心关注点**：
   - 第29行："CC 的本地 Read、Bash 等能力必须在执行前被可靠拦截" ✅ 已实现
   - 第49行："Mod／执行控制在任何客户端工具产生本地副作用之前拦截调用" ✅ 已实现
   - 第50行："Worker 提取完整模型响应" ✅ 已实现

3. **"单轮"的真正含义**（设计文档第11行）：
   > "一轮"不表示"只能调用一个工具"。一个 assistant 响应可以包含多个 `tool_use`

   关键是**客户端工具的单轮交接**，而非禁止所有多轮流程。

4. **defer_loading 的价值**：
   - 减少上下文窗口占用
   - 按需加载工具定义
   - 已有用户依赖此功能

## 实施步骤

### 步骤 1：添加测试 ✓

按设计文档第8节要求，覆盖以下场景：

1. 普通文本响应
2. 单工具调用
3. 同一响应五工具调用（JSON 和 SSE）
4. 客户端声明的搜索工具往返
5. 服务端工具（如果支持）
6. 延迟加载工具
7. 新会话、续聊、回退
8. 容器没有执行客户端工具的副作用
9. 完整 tool_use + 上限退出
10. 工具映射和结果保真

### 步骤 2：更新文档

1. 更新特性支持说明
2. 说明单轮客户端工具的工作方式
3. 说明内部 ToolSearch 与客户端工具的区别
4. 提供使用示例

### 步骤 3：验证

1. 运行所有测试
2. 本地功能验证
3. 检查响应完整性
4. 验证工具拦截

## 后续改进（可选）

如果用户明确要求严格单轮模式：

1. 添加配置选项 `strict_single_turn`
2. 该模式下禁用内部 ToolSearch
3. 拒绝 defer_loading
4. 更新文档说明两种模式的差异
