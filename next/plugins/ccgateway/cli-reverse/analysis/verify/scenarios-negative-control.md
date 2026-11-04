# 对拍：original vs artifacts/tmp/scenarios/neg

- 时间：2026-11-03T19:48:47.221Z，耗时 69 s
- 运行时：bun 1.4.4+38afee6c8，node v24.20.0，win32-x64
- 场景：4；归一化后一致：1；预期满足：基线 4，候选 1
- 重跑后才一致（不稳定）的场景：无
- 不归一化就会不一致的场景：4（tool-read-errors, tool-edit-errors, mcp-resources, tty-permission-reject）
- 归一化规则命中次数：uuid=47，port=23，header:content-length=23，path:cwd=110，date=23，path:home=23，duration=27，hex64=23，path:tmp=1，tty-turn-line=1

| 场景 | 一致 | 基线预期 | 候选预期 | 退出码 | API 请求 | 外网请求 | 耗时 ms |
|---|---|---|---|---|---|---|---|
| tool-read-errors | 是 | 满足 | 满足 | 0/0 | 6/6 | 0/0 | 4635/5171 |
| tool-edit-errors | **否**（5） | 满足 | **old_string missing: lacks "String to replace not found in file." in <tool_use_error>String to replace was not found in file.
String: nope</tool_use_error>** | 0/0 | 9/9 | 0/0 | 2966/3423 |
| mcp-resources | **否**（3） | 满足 | **read missing: lacks "Resource not found: verify://nope" in Resource missing: verify://nope — it may have been deleted or the URI is stale. Re-run ListMcpResourcesTool to refresh.** | 0/0 | 7/7 | 0/0 | 3263/3755 |
| tty-permission-reject | **否**（4） | 满足 | **pty step 3 waitFor "User rejected write to note.txt" not matched** | 0/0 | 1/1 | 0/0 | 12748/34235 |

## 差异（每个场景最多列 10 条）

### tool-edit-errors

- `$.requests[4].body.messages[9].content[0].content` 第 1 行：`<tool_use_error>String to replace not found in file.` → `<tool_use_error>String to replace was not found in file.`
- `$.requests[5].body.messages[9].content[0].content` 第 1 行：`<tool_use_error>String to replace not found in file.` → `<tool_use_error>String to replace was not found in file.`
- `$.requests[6].body.messages[9].content[0].content` 第 1 行：`<tool_use_error>String to replace not found in file.` → `<tool_use_error>String to replace was not found in file.`
- `$.requests[7].body.messages[9].content[0].content` 第 1 行：`<tool_use_error>String to replace not found in file.` → `<tool_use_error>String to replace was not found in file.`
- `$.requests[8].body.messages[9].content[0].content` 第 1 行：`<tool_use_error>String to replace not found in file.` → `<tool_use_error>String to replace was not found in file.`

### mcp-resources

- `$.requests[4].body.messages[9].content[0].content` 第 1 行：`Resource not found: verify://nope — it may have been deleted or the URI is stale. Re-run ListMcpResourcesTool to refresh.` → `Resource missing: verify://nope — it may have been deleted or the URI is stale. Re-run ListMcpResourcesTool to refresh.`
- `$.requests[5].body.messages[9].content[0].content` 第 1 行：`Resource not found: verify://nope — it may have been deleted or the URI is stale. Re-run ListMcpResourcesTool to refresh.` → `Resource missing: verify://nope — it may have been deleted or the URI is stale. Re-run ListMcpResourcesTool to refresh.`
- `$.requests[6].body.messages[9].content[0].content` 第 1 行：`Resource not found: verify://nope — it may have been deleted or the URI is stale. Re-run ListMcpResourcesTool to refresh.` → `Resource missing: verify://nope — it may have been deleted or the URI is stale. Re-run ListMcpResourcesTool to refresh.`

### tty-permission-reject

- `$.snapshots[0][13]` 第 1 行：`  ⎿  User rejected write to note.txt` → `  ⎿  User denied write to note.txt`
- `$.snapshots[0][25]` 第 1 行：`                                                                                ◐ medium · /effort` → ``
- `$.snapshots[0][29]` 第 1 行：`  ⏸ manual mode on · ? for shortcuts · ← for agents` → `  ⏸ manual mode on · ? for shortcuts`
- `$.pty.matched[3]`：`true` → `false`


## 场景说明

- **tool-read-errors**：Read 的成功与错误路径：不存在的文件 → "File does not exist. Note: your current working directory is <CWD>."（is_error）；目录 → EISDIR（is_error）；缺 file_path → InputValidationError（is_error）；offset=2/limit=1 → "2\ttwo"（只回第 2 行，带行号）；完整读取 → 带行号的全文。
- **tool-edit-errors**：Edit/Write 的前置条件与错误路径：没 Read 就 Edit、没 Read 就覆盖已有文件 → "File has not been read yet. Read it first before writing to it."；Read 后 old_string 不存在 → "String to replace not found in file."；多处匹配且 replace_all=false → "Found 2 matches …"；replace_all=true → 全部替换；Write 新建嵌套目录 deep/a/b.txt 再 Edit 它。检查每个 tool_result 和最终文件内容。
- **mcp-resources**：MCP 资源与工具错误（fake-mcp-server --full）：ToolSearch select 三个延迟工具 → ListMcpResourcesTool 列出两个资源（带 server 字段）→ ReadMcpResourceTool 读 verify://notes/readme（contents 原样）→ 读不存在的 uri → "Resource not found: … Re-run ListMcpResourcesTool to refresh."（非 is_error）→ mcp__verify__fail（isError=true）→ tool_result is_error。服务器日志里有 resources/list、resources/read、tools/call。
- **tty-permission-reject**：[垫片+伪终端] 权限确认框拒绝：同上，确认框出现后按 Esc → 屏幕显示 "User rejected write to note.txt"，文件不存在，不再发后续请求（共 1 个请求）。
