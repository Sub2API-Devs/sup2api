# 会话记忆迁到控制器 Valkey + 工具清单头 `x-claude-code-sandy-plover`（详细设计）

2026-11-05。状态：**设计，待用户确认后实现**。随定制 CLI 升级到 Claude Code 2.1.318 一起发布。

相关文档：[SUBAGENT-REQUEST-CONTEXT-DESIGN](SUBAGENT-REQUEST-CONTEXT-DESIGN.md)、[CLI-UPGRADE-RUNBOOK](CLI-UPGRADE-RUNBOOK.md)、[CLAUDE-CODE-2.1.316-MIGRATION](CLAUDE-CODE-2.1.316-MIGRATION.md) 第 11 节（第一方形状转换）、`companions/engine/session_state.go`（现有会话记忆）、`next/docs/ccgateway-guard/`（guard 与 Go 控制器）。

官方语义的完整规格和 30 条原生实跑测试向量在 `artifacts/claude-2.1.318/review/sp-spec.md`、`sp-vectors.out`（不进 Git）。实现的第一步把规格的"实现所需的精确规则"一节收进本目录 `cli-research/`，测试向量收进 `contracts/features/testdata/`（第 10 节）。

---

## 0. 决定

| # | 决定 | 来源 |
|---|---|---|
| D1 | 做到 2.1.318 新头 `x-claude-code-sandy-plover`（本会话用过的工具清单） | 用户，2026-11-05 |
| D2 | 工具集合进会话记忆，**跨压缩保留**（官方压缩后不清空集合；与 316 时"cc_prev_msg 不做跨压缩记忆"不同） | 用户，2026-11-05 |
| D3 | **每个控制器宿主一个 Valkey，该宿主上所有账号的 Worker 共用；每个 Worker 只能读写自己账号的数据** | 用户，2026-11-05 |
| D4 | **会话过期用 TTL 实现**；TTL 默认 **24 小时**（线程状态与工具集合都是）；能用短 TTL 模拟过期做测试 | 用户，2026-11-05 |
| D5 | **现有会话记忆一起迁**：cc_prev_req、轮次位置、prompt 哈希、prompt id、message id、子代理派生上下文 | 用户，2026-11-05 |
| D6 | **318 一方形状客户端没发这个头时，按"路上丢了"补发** | 用户，2026-11-05 |
| D7 | 记忆过期后，下一个请求从本次请求的消息历史里重新提取，作为新起点继续累积（照官方"恢复会话"的做法，只是没有存档那一半） | 用户确认，2026-11-05 |
| D8 | 记忆永远不能阻塞或拖慢请求：Valkey 慢、挂了或没挂载时退回进程内存 | 本设计（与"日志必须解耦"同一原则） |
| D9 | 原生语义（取名、换名、截断、排序、序列化）只在 CLI 里由原生函数实现，Go 里不抄规则；Worker 只负责存取 | 本设计 |

---

## 1. 背景

### 1.1 这个头（规格第 1–3、6 节）

- **值**：JSON 数组，元素是 `{"name":"…"}`。顺序是首次使用的先后，13 个内置工具（Bash、Read、Edit、Write、Glob、Grep、NotebookEdit、TodoWrite、Agent、Task、ToolSearch、EnterPlanMode、ExitPlanMode）整体放到最后。最多 64 项、7168 字符；有项被丢弃时第一项是 `{"name":"unreadable-tools-used-before-summary"}`（下称 UD）。名字必须匹配 `^[A-Za-z0-9_.:-]{1,256}$`，否则记成 UD。连接器字段（`url`、`directory_entry`、`unresolved`）只在客户端直连 `api.anthropic.com` 时出现，经网关的客户端不会有。
- **作用域**：整个会话一份。主线程、所有子代理、压缩请求、side query 都带同一份全量。
- **记录时机**：工具一进执行函数就记（权限检查之前，被拒绝的也算），从带这个工具结果的下一个请求起出现；服务端工具在助手消息到达时记；`mcp_tool_use` 记成 `server:name`；`mcp__s__t` 原样；旧名先换新名（Task→Agent、KillShell/KillBash→TaskStop 等 8 条）。另有侧通道（@ 文件、hook、MCP 资源、`!` bash 等）也会记，历史里看不出来。
- **生命周期**：进程内存里只增不减；集合增长时往 transcript 追加 `{"type":"tools-used","tools":[…]}`，transcript 默认保留 30 天（`cleanupPeriodDays`）。压缩不清空，只在摘要里另写一份字母序名单；/clear、新对话会换会话 id。**恢复会话 = 存档记录 + 对历史重新提取（`LQi`）**。
- **发送条件**：路径以 `/v1/messages` 结尾（count_tokens 不发）；provider 是一方；`ci()`（设了 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`，或 base URL 是 api.anthropic.com）；GrowthBook 开关 `tengu_silly_shore`（默认开）。改 base URL 接入又没设那个变量的客户端（三方形状）不发。
- **316**：已有同一个头和同一套集合，但发送还要 `tengu_snug_mitten`（默认关），所以默认不发。集合照常维护，压缩摘要名单和 Agent 结果名单 316 的历史里也有。

### 1.2 离线实测（2026-11-05，ovh `~/sup2api/checks/cli-318/e2e`，v48 = 2.1.318 首个候选）

| 场景 | 官方 318 直连 | 客户端 → 网关 | v48 → 上游 |
|---|---|---|---|
| Bash 往返 | `[]` → `[{"name":"Bash"}]` | 同左 | `[]` → `[]` ✗ |
| 子代理 1–3 层 | `[]` → 之后全是 `[{"name":"Agent"}]` | 同左 | 全 `[]` ✗ |
| 三方形状（tp-*）带工具/子代理 | 非空 | 不发 | 全 `[]` ✗ |
| 316 客户端 | 不发 | 不发 | 发了 `[]` ✗ |
| 没用工具、非 CC | `[]` | 一方 `[]`，非 CC 不发 | `[]` ✓ |

v48 去掉这个头后，与 v47 的 73 个场景 0 差异。

### 1.3 现在为什么做不到

1. 核心只转发插件 manifest `passHeaders` 白名单上的客户端头，白名单没有它，客户端的值在核心就被丢掉。
2. 定制 CLI 一个请求一个进程，build 路径上没有任何记录点，集合永远是空的。
3. 发送层（`chunk-vn3g7zt8.js` 的 fetch 包装 `XS`）用 `H.set` 覆盖设置，direct 时客户端带来的同名头也会被盖成 `[]`。
4. Worker 的会话记忆只在进程内存，Worker 原地升级、容器停了再起都会丢；每个账号最多 4096 条、闲置 24 小时。

---

## 2. 总体结构

```text
客户端 ──▶ 核心 ──▶ 插件 ──▶ Worker ─────────────────────────────▶ 定制 CLI ──▶ 上游
          passHeaders      │ ① 读记忆（会话的工具集合、线程状态）    │ ③ 原生规则：历史提取 ∪ 记忆，
          放行新头          │ ② 经 CCG_REQUEST_AGENT 交给 CLI ──────▶│   决定发不发、发什么
                           │ ⑤ 读应答里的工具调用，写回记忆 ◀───────│ ④ 元数据回报最终集合
                           ▼
            /run/ccg-state/valkey.sock（guard 挂进容器）
            控制器宿主上的 Valkey，ACL 用户 acct-<key> 只能碰 ccg:<key>:*
            所有键带 TTL（默认 24 小时）
```

分工：

| 组件 | 职责 |
|---|---|
| Worker（Go） | 存取记忆（Valkey 或进程内存）；读应答流里的工具调用；把记忆交给 CLI，收 CLI 回报的集合 |
| 定制 CLI（JS，原生函数） | 用原生 `nD` 从历史提取；合并；判断上游看到的版本；在发送点设置或不设置头；序列化交给原生 `Nf` |
| 控制器（Go） | 每账号 ACL 用户的建立、更新与删除；口令随 Worker 配置下发 |
| guard（Go） | 给新建的 app 容器加 socket 目录挂载；管理 socket 目录 |
| compose | 新服务 `state`（Valkey） |
| 核心 | passHeaders 放行；请求策略下发 TTL；设置项与控制台 |

---

## 3. 头的规则

### 3.1 发不发

全部满足才发：

1. Messages 请求（count_tokens 不发）——原生 `sn(J)` 判断，保留；
2. 一方路线、`ci()`、`tengu_silly_shore`——原生 `tft(L)&&ub()` 判断，保留（账号容器里 `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL=1`，开关按账号求值）；
3. **上游看到的版本 ≥ 2.1.318**：CLI 在发送点读本次请求实际要发的 `User-Agent`，解析 `claude-cli/X.Y.Z`，低于 2.1.318 就不设这个头。保留客户端 UA 的请求看客户端版本（316 客户端不发，修掉 1.2 的 ✗）；用我们自己身份的请求（非 CC）看 CLI 版本。
   - 判断放在 CLI，而不是 Worker：只有 CLI 知道这次最终发哪个 UA（`ccgatewayClientUserAgent()??g1()`）。
4. 老账号的 CLI 还是 2.1.316，原生不发，不受影响。

### 3.2 发什么

| 优先级 | 来源 | 何时 |
|---|---|---|
| 1 | 客户端带来的值，**逐字原样** | 客户端发了这个头（318 一方形状客户端） |
| 2 | 记忆 ∪ 本次历史，原生 `Nf` 序列化 | 客户端没发：三方形状、路上丢了（D6）、非 CC、客户端那边开关关了 |
| 3 | 只看本次历史 | 没有记忆：新会话、过期、换了账号、Valkey 不可用、没有会话 id |

- 客户端值无论来自哪一级，都要并进记忆（第 4.4 节），所以后续丢头的请求也能接上。
- 非 CC 请求没有官方对照，按同一套规则：没有工具调用就是 `[]`，有 tool_use 历史（例如 SDK 自带工具）就列出来，与请求体一致。

### 3.3 合并顺序（CLI 里，第 2、3 级）

```
names = 记忆（插入顺序）
for n of nD(本次历史 wire→内部形状, undefined, true)：    // 原生，排序后的结果
  if n 不在 names：names.push(n)
wf().replace(names)                                         // 原生集合，过 ote 规范化
值 = Nf(wf())                                               // 原生序列化：内置工具后置、64/7168 截断、UD
```

- 记忆在时：顺序与官方一致（记忆是首次出现顺序，历史提取一般不带新名字，因为上一次的应答已经写进记忆）。
- 记忆过期时（D7）：`names` 就是 `nD` 的排序结果，与官方"恢复会话但存档被清掉"一致。与官方实时值的差别只在顺序和侧通道。
- wire 消息转内部形状：`{type: role, message: {content}}`；压缩摘要消息用原生的摘要判断（规格 4.2 的正则 `W`，取原生函数，不抄）标上 `isCompactSummary:true`；伴随块（正则 `C`）标上 `isMeta:true, turnCompanion:true`。这样原生 `nD` 能解析摘要名单、伴随块名单、Agent/SendMessage/Poll/Skill 结果里的名单。
- **不做的启发式**：`Called the X tool with the following input:` 这类侧通道元消息不认（宁可少不可错）。

---

## 4. Worker（`companions/engine`）

### 4.1 存储接口

`sessionStates`（现在是一个带 LRU 的结构体）拆成接口加两种实现：

```go
// sessionStore is where the Worker keeps what it remembers of each upstream
// session. Every call is bounded (storeOpTimeout) and never fails a request:
// an error is "nothing remembered".
type sessionStore interface {
	// thread state (cc_prev_req, turn, prompt hash, prompt/message id, agent type, spawns)
	loadThread(ctx context.Context, session, thread string) (*sessionEntry, error)
	saveThread(ctx context.Context, session, thread string, e *sessionEntry) error
	// the session's tools-used set, in first-use order
	loadTools(ctx context.Context, session string) ([]string, error)
	mergeTools(ctx context.Context, session string, names []string) error
}
```

- `memoryStore`：现在的实现（LRU 4096、闲置 TTL）加上工具集合，TTL 用策略里的值。
- `valkeyStore`：第 5 节的键和脚本。
- `fallbackStore`：先用 `valkeyStore`，每次调用失败或超时就退回 `memoryStore`，并且保持一份本地副本（写两边）。Valkey 恢复后从 Valkey 读，本地副本只做退路。
- **线程占用（`enter`/`leave`/`shared`）留在进程内存**：同一账号只有一个 Worker 进程，在途请求跨重启没有意义。
- 选择：启动时 `CCG_STATE_SOCKET` 指向的文件存在且 `CCG_STATE_PASSWORD` 非空 → `fallbackStore`；否则 `memoryStore`（老账号、没挂载、本地开发）。

### 4.2 超时与预算

| 项 | 值 |
|---|---|
| 单次操作超时 | 30 毫秒 |
| 一个请求读记忆合计 | 不超过 60 毫秒（读线程 + 读工具集合并发） |
| 写记忆 | 不在请求的关键路径：应答结束时异步写，写失败只记诊断 |
| 连接 | 进程启动时建连接池（最多 4 条，与请求槽位一致），断线由客户端库重连 |
| 熔断 | 连续 5 次失败后 30 秒内直接走内存，不再尝试 |

诊断：`session_store` 事件（`backend`=valkey/memory，`op`，`ms`，`error`），只进请求日志的诊断段，不打业务日志。

### 4.3 读（请求进来时）

在 `attachSessionState` 现有逻辑之外，新增 `attachToolsUsed`：

1. CLI 有 `request_tools_used_v1` 能力（第 6 节）才做；
2. 会话 id 用客户端自己在 `metadata.user_id` 里给的（与 `attachSessionState` 的 `named` 条件相同）；没有就不读记忆，CLI 只看历史；
3. 读 `loadTools(session)`，交给 CLI（4.6）；
4. 客户端带了这个头：按 contracts 的形状校验后，原值交给 CLI。

线程状态的读（`latest`、`spawned`）逻辑不变，只是从接口读。`attachSessionState` 现有的所有条件（会话是客户端给的、线程能分辨、没有别的请求在途、历史接得上）保持不变。

### 4.4 写（应答结束时）

- 线程状态：`rememberSessionState` 照旧在读到 `message_stop` 时调用，改为 `saveThread`（异步）。
- 工具集合：
  1. CLI 在应答元数据里回报 `tools_used`（本次请求的最终集合，插入顺序，含客户端原值里的名字，去掉 UD 截断标记）；
  2. 应答观察器读出本次应答里的 `tool_use` / `server_tool_use` / `mcp_tool_use` 名字（按块顺序，`mcp_tool_use` 记 `server:name`，只做 `^[A-Za-z0-9_.:-]{1,256}$` 校验，不合格的记 UD）；
  3. `mergeTools(session, CLI 回报 ++ 应答里的名字)`：按顺序追加没有的名字。
- **观察器现在只对"用记忆的请求"开**（`observe: p.session != nil && p.session.usable`）。改成：有会话 id 且 CLI 支持新能力的请求都开，只读工具调用；读 message id、Agent 调用的部分仍按原条件。
- 观察器对工具调用只看 `content_block_start` 的 `type` 与 `name`（JSON 应答看 `content[].type/name`），不缓存输入，开销可以忽略。
- 失败的请求（非 2xx、流中断）：CLI 回报的部分照写（与官方一致：工具在请求发出前就记了），应答里的部分只在读到完整块时写。

### 4.5 会话、线程与键

- 工具集合按**会话**一份（主线程、子代理共用）；线程状态按**会话 + 线程**一份，与现在相同。
- 键里的会话 id 和线程 id 原样使用前先过各自的正则（会话是 UUID；线程是 `main` 或 agent id `^[!-~]{1,256}$`），再做一次 SHA-256 取前 32 个十六进制字符，避免特殊字符和超长键。

### 4.6 交给 CLI（`CCG_REQUEST_AGENT`）

`requestAgent`（`engine/request_agent.go`）新增一个字段，只给有能力的 CLI：

```json
{
  "version": 1, "map": true, "key": "…", "client": { … },
  "tools_used": {
    "client": "[{\"name\":\"Bash\"}]",      // 客户端原值，逐字；没有就省略
    "memory": ["Bash", "mcp__db__query"]     // 记忆里的集合，插入顺序；没有记忆就省略
  }
}
```

- `client` 与 `memory` 可以同时有（CLI 用 `client` 发，`memory` 只用来回报合并）。
- 整个 `tools_used` 字段缺失 = Worker 不支持或不让发 → CLI 不设这个头（老行为是发 `[]`，见第 6.3 节）。
- 环境变量的总长：`memory` 最多 256 个名字 × 256 字节，远低于 Linux 单个环境变量 128 KiB 的上限；超出就截掉尾部并加 UD（与原生截断语义一致）。

### 4.7 策略（TTL）

`features.WorkerPolicy` 新增：

```go
// SessionMemory is how long the Worker keeps what it remembers of an upstream
// session (SESSION-MEMORY-TOOLS-USED-DESIGN.md §5). nil keeps the defaults.
SessionMemory *SessionMemoryPolicy `json:"session_memory,omitempty"`

type SessionMemoryPolicy struct {
	ThreadTTLSeconds int `json:"thread_ttl_seconds,omitempty"` // 60..2592000, default 86400
	ToolsTTLSeconds  int `json:"tools_ttl_seconds,omitempty"`  // 60..2592000, default 86400
}
```

- 核心只发给 health 里声明 `SessionMemoryCapability = "session_memory_ttl_v1"` 的 Worker（与 `FirstPartyShape` 同样的做法：旧 Worker 不认识未知键会拒绝）。
- 设置按 全局 → 分组 → 账号 解析；控制台在 CCGateway 设置的"请求"页加两项（秒，带"24 小时"之类的快捷选项）。
- 测试时设成 2 秒就能模拟过期。

---

## 5. Valkey

### 5.1 部署

| 项 | 值 |
|---|---|
| 位置 | 每台控制器宿主一个，compose 项目 `ccgateway` 新服务 `state` |
| 镜像 | `valkey/valkey:9`（与现有缓存同版本；发布时固定到具体小版本，ovh 本地预先 pull） |
| 监听 | **只有 unix socket**：`port 0`、`unixsocket /run/ccg-state/valkey.sock`、`unixsocketperm 666`（访问控制靠 ACL 口令，不靠文件权限，见 7.2）。账号容器的出站规则（`inet` 表）丢弃私网和回环，TCP 本来就走不通，也不为此放开；路径式 unix socket 走 VFS，不经过 netfilter，也与网络命名空间无关 |
| 持久化 | 无（`save ""`、`appendonly no`）。重启等同于全部过期（D7 兜底） |
| 内存 | `maxmemory 256mb`、`maxmemory-policy volatile-lru`；容器 `mem_limit 320m` |
| 其他 | `protected-mode yes`、`rename-command` 不用（用 ACL）、`latency-tracking yes`；关闭 `default` 用户 |
| 进程开销 | 空实例常驻约 9 MiB（2026-11-05 ovh 实测） |

容量估算：线程状态每条约 0.3–1 KB，工具集合每会话几百字节到 8 KB。按每账号 200 个活跃会话、每会话 5 个线程、全部 1 KB 估：一个账号约 1.2 MB，100 个账号约 120 MB，在 256 MB 内。满了按 LRU 淘汰最久没用的会话，被淘汰的会话退回"只看历史"。

### 5.2 键

`<s>` = SHA-256(会话 id) 前 32 位十六进制，`<t>` = SHA-256(线程 id) 前 32 位十六进制。

| 键 | 类型 | 值 | TTL | 写 / 续期 |
|---|---|---|---|---|
| `ccg:<key>:s:<s>:t:<t>` | string | 线程状态 JSON（见下） | `thread_ttl`，默认 86400 秒 | `SET … EX`（每次成功应答重写） |
| `ccg:<key>:s:<s>:tools` | string | 名字数组 JSON（插入顺序，最多 256 个） | `tools_ttl`，默认 86400 秒 | 合并脚本写入并续期；读用 `GETEX … EX` 续期 |

线程状态 JSON（现在 `sessionEntry` 的持久化形式，`v` 是格式版本）：

```json
{"v":1,"state":{"thread":"main","request_id":"req_…","turn_position":{"prompt_index":3,"turn_index":7},
 "prompt_hash":"…","message_id":"msg_…","prompt_id":"…","agent_type":"…"},
 "history":{"count":12,"digest":"<64 hex>"},
 "spawns":[{"prompt":"<64 hex>","agent_type":"general-purpose"}],
 "at":"2026-11-05T03:00:00Z"}
```

- 不存消息内容，只存 id、哈希和名字。
- 单值上限：线程键 16 KB、工具键 16 KB，超了就不写（宁可少不可错），记诊断。
- 读到 `v` 不认识的值当作没有记忆（为以后改格式留余地）。

### 5.3 合并脚本

```lua
-- KEYS[1] = ccg:<key>:s:<s>:tools
-- ARGV[1] = TTL seconds, ARGV[2] = cap (256), ARGV[3..] = names in order
local cur = redis.call('GET', KEYS[1])
local list = cur and cjson.decode(cur) or {}
local seen = {}
for _, n in ipairs(list) do seen[n] = true end
local changed = false
for i = 3, #ARGV do
  local n = ARGV[i]
  if not seen[n] and #list < tonumber(ARGV[2]) then
    list[#list + 1] = n; seen[n] = true; changed = true
  end
end
if changed or not cur then
  redis.call('SET', KEYS[1], cjson.encode(list), 'EX', ARGV[1])
else
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return #list
```

- 用 `EVALSHA`，首次 `NOSCRIPT` 时 `EVAL`（Valkey 重启后脚本缓存也会丢）。
- 名字在 Worker 里已经过校验（`^[A-Za-z0-9_.:-]{1,256}$` 或 UD），脚本里不再校验。
- `cjson.encode` 空表会编成 `{}`：读取时把 `{}` 当成空数组。

### 5.4 隔离（每个 Worker 只能用自己的数据）

- `default` 用户关闭（`user default off`）。
- 控制器管理用户 `ccg-controller`：`+acl|setuser +acl|deluser +acl|list +acl|getuser +info +ping`（对账读 `INFO server` 的 `run_id`，health 读内存与淘汰数），不能读写任何键（`resetkeys`）。口令在 compose 安装时生成，存在控制器数据目录。
- 每个账号一个用户 `acct-<key>`：

  ```
  ACL SETUSER acct-<key> reset on #<sha256(口令)> resetkeys ~ccg:<key>:* resetchannels -@all
      +hello +get +set +getex +expire +del +exists +ttl +evalsha +eval +script|load +ping
  ```

  `eval` 只能碰声明在 `KEYS` 里的键，ACL 的键模式同样约束它。`KEYS`、`SCAN`、`FLUSH*`、`CONFIG`、`ACL`、`DEBUG`、`MONITOR`、`CLIENT`、`MODULE`、`FUNCTION`、`PUBLISH` 全部禁止。
- 口令：32 字节随机数（十六进制 64 位），控制器生成，存进账号状态，建容器时作为环境变量 `CCG_STATE_PASSWORD` 交给 Worker（第 7.5 节），Valkey 里只存它的 SHA-256。
- 被攻破的容器最多能写满**自己的**前缀，借 `volatile-lru` 挤掉其他账号的会话，让它们退回"只看历史"；读不到也改不了别人的数据。Worker 自己有单值上限，但攻击者绕得过。这一项列为已知风险（第 12 节）。

---

## 6. 定制 CLI（`companions/cli-mods`）

### 6.1 能力与标签

- 新能力 `request_tools_used_v1`（`contracts/features/request_modes.go` 与 profile `capabilities`）。
- 2.1.318 首次发布的标签：v48 只在 ovh 验证过、未发布；加上本功能后发布为 `ccgateway-v56-cc-2-1-318`（序号照规则递增）。

### 6.2 新增原生依赖（profile `natives`）

| 逻辑名 | 318 位置 | 用途 |
|---|---|---|
| `toolsUsedFromHistory` | `chunk-sva49n74.js:nD`（已导出） | 历史提取 |
| `conversationToolsUsed` | `chunk-pfp3j087.js:getConversationToolsUsed`（= `wf`） | 原生集合 |
| `isCompactSummaryText`、`isToolsUsedCompanion` | 原生摘要与伴随块判断（规格 4.2 的 `W`、`C` 所在函数，实现时定位并确认导出；没导出就由补丁在所在模块追加导出） | wire 消息标记 |

`Nf`、`Ulo` 不需要导入：在发送点的补丁里原地使用。

### 6.3 发送点补丁（`chunk-vn3g7zt8.js:XS`）

318 原文：

```js
if(sn(J))try{if(tft(L)&&ub()){if(H.set(Ulo,Nf(wf())),Ps().once("tools_used_header"))g("api_tools_used_header")}}catch{}
```

改为（示意，实际锚点按派生脚本逐字生成）：

```js
if(sn(J))try{if(tft(L)&&ub()){let ccgTU=ccgatewayToolsUsedHeader(H);
  if(ccgTU===void 0){if(H.set(Ulo,Nf(wf())),Ps().once("tools_used_header"))g("api_tools_used_header")}
  else if(ccgTU!==null){if(H.set(Ulo,ccgTU),Ps().once("tools_used_header"))g("api_tools_used_header")}
  else H.delete(Ulo)}}catch{}
```

`ccgatewayToolsUsedHeader(H)`（新支持模块 `request-tools-used.js`）：

| 返回 | 含义 |
|---|---|
| `undefined` | 不是网关请求（普通 CLI 用法、`ccgateway-mgmt`）：原生行为 |
| `null` | 不发：Worker 没给 `tools_used`，或 `H` 里要发的 `User-Agent` 版本低于 2.1.318 |
| 字符串 | 发这个值：客户端原值；否则在调用前已 `wf().replace(合并结果)`，返回 `Nf(wf())` 的结果（由补丁传入 `Nf`，避免支持模块直接导入核心以外的未导出名） |

合并（3.3 节）在构建请求时做一次（`request-build.js` / `request-command.js` 拿到消息之后、发送之前），结果写进原生集合；发送点只读。direct 模式同样走这里，所以 direct 也能发客户端原值。

### 6.4 回报

应答元数据（`o.meta` 文件，`requestCommandOutput.response` 读取）新增 `tools_used`：本次最终集合的名字数组（插入顺序，去掉截断用的 UD，最多 256 个）。只有能力打开时写。

### 6.5 测试（原生）

- `test/native/2.1.318/tools-used.test.mjs`：
  - 规格的 30 条向量：序列化（原生 `Nf`）、历史提取（原生 `nD` + wire 标记）逐条对；
  - 合并顺序：记忆在时追加、记忆空时排序、客户端原值逐字；
  - UA 版本判断：`claude-cli/2.1.316 (…)` 不发、`2.1.318` 发、无 UA（不应出现）不发；
  - 没有 `tools_used` 字段 → 不设头。
- `patch-wire-preservation.test.mjs`：发送点补丁逐字断言；原生 `sn`、`tft`、`ub` 判断仍在外层。

---

## 7. 控制器、guard、compose

以下路径相对 `next/`，`C/` = `plugins/ccgateway/companions/`。现状依据 2026-11-05 的代码调研。

### 7.1 现状要点（决定了下面的做法）

| 事实 | 位置 | 影响 |
|---|---|---|
| app 容器挂载写死两项：账号卷 `/work` 与 `<RuntimeRoot>/<aid>/resolv.conf` | `C/guard/internal/policy/policy.go:245-250`（`App()`） | 第三项要在这里加 |
| start/restart 前 `appMounts` 要求**恰好 2 个**挂载 | `C/guard/internal/api/handlers.go:621-639`，调用在 `appAction` `:667-673` | 必须放宽为"2 个（老）或 3 个（新）"，否则老容器的 restart（包括 Worker 原地更新那次）会被拒 |
| 挂载来源逐级 `openat(O_NOFOLLOW)`：每一级目录 root 属主、无 g/o 写；条目只认普通文件，socket 判为 `special` 被拒 | `C/guard/internal/files/files_linux.go:30-107`、`:244-257`、`VerifyDir` `:538-574`、`list` `:441-450` | 新增"socket 目录"校验函数；socket 目录本身也必须 root 属主、0755 |
| 控制器发给 guard 的建容器请求没有挂载字段，挂载完全由 guard 决定 | `C/controller-go/internal/guardapi/types.go:288-296`、`C/guard/internal/api/types.go:117-125` | 控制器不用改请求结构；guard 按开关决定是否加第三项 |
| Worker 的密钥走建容器时的环境变量，CLI 子进程环境里会去掉 | `C/controller-go/internal/accounts/provision.go:643-672`（`appEnvironment`）、`C/engine/runner.go:74`（`workerSecrets`） | 口令同样走环境变量，并加进 `workerSecrets` |
| 环境变量与挂载只在建容器时定；没有不重建就改挂载的办法 | `provision.go:116-150`（`keepExisting` / `removeReplaced`）、`updates/worker.go:87` | 老账号不重建就用不上 Valkey（7.6） |
| app 容器 uid/gid 1000:1000、cap_drop ALL、no-new-privileges、根可写、`/run` 不是 tmpfs | `policy.go:237`、`:251-261` | 容器内挂载点 `/run/ccg-state` 可直接用 |
| guard 能起停的 compose 服务只有 `controller`、`egress` | `C/guard/internal/compose/compose.go:21` | 加 `state` |
| compose 模板唯一一份、由核心安装脚本整份写出；安装脚本建 `/opt/ccgateway-runtime` 等目录，root 0700 | `server/internal/ccgateway/compose/ccgateway.compose.yml`、`server/internal/ccgateway/runtime_compose.go:215-301`（`:221` mkdir） | 改模板与安装脚本，随核心发布 |
| 容器身份哈希包含 Mounts | `C/controller-go/internal/containerfs/containerfs.go:73-83` | 新建容器的 identity 与老容器不同，`sameRuntime`/`keepExisting` 照常按各自身份判断（新旧都合法） |

### 7.2 socket 目录与权限

- 宿主路径：`/opt/ccgateway-runtime/state/`，**root:root 0755**（满足 guard 逐级校验：root 属主、无 g/o 写）。由安装脚本创建（`runtime_compose.go:221` 那行一起 mkdir，之后单独 `chmod 755`）。`/opt/ccgateway-runtime` 本身是 0700：app 容器经 bind 挂载直接看到 `state/` 这一层，不需要穿过上层目录的权限。
- Valkey 进程在容器里以 **uid 0** 运行（`cap_drop: ALL`、`read_only`、`no-new-privileges`），作为目录属主可以在里面建 socket；socket 文件 root 属主、0666。
- 谁能连：挂了这个目录的容器（app、控制器）。**访问控制靠 ACL 口令**（第 5.4 节），文件权限只是第一层。不使用 group_add 或专用 gid，避免改容器配置字段。
- 挂进容器一律**只读**（`:ro`）：unix socket 的 connect 只检查 socket 文件的写权限，只读挂载不影响连接（Linux 对只读文件系统的拒绝只作用于普通文件、目录和符号链接）。这也满足 `appMounts` 现有"bind 必须非 RW"的风格。
- guard 新函数 `files.VerifySocketDir(abs)`：目录本身按 `checkDir`；条目只允许名为 `valkey.sock` 的一个 socket（root 属主），或者为空（Valkey 还没起来）；其他任何条目都拒绝。

### 7.3 compose

模板 `server/internal/ccgateway/compose/ccgateway.compose.yml` 新增服务（写法照 egress，yml:111-131）：

```yaml
state:
  image: ${CCG_STATE_IMAGE:-valkey/valkey:9.x.y}
  # Not the image's entrypoint: it chowns and drops to the valkey user with
  # setpriv, which fails under cap_drop ALL, and the socket must be root's
  # (guard VerifySocketDir).
  entrypoint: ["valkey-server"]
  command: ["--port", "0", "--unixsocket", "/run/ccg-state/valkey.sock", "--unixsocketperm", "666",
            "--save", "", "--appendonly", "no", "--maxmemory", "256mb", "--maxmemory-policy", "volatile-lru",
            "--protected-mode", "yes", "--aclfile", "/etc/valkey/users.acl"]
  network_mode: none
  user: "0:0"
  read_only: true
  cap_drop: [ALL]
  security_opt: ["no-new-privileges:true"]
  volumes:
    - {type: bind, source: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}/state", target: /run/ccg-state, bind: {create_host_path: false}}
    - {type: bind, source: "${CCG_RUNTIME_HOST_ROOT:-/opt/ccgateway-runtime}/state-conf/users.acl", target: /etc/valkey/users.acl, read_only: true, bind: {create_host_path: false}}
  tmpfs: [/data]
  mem_limit: 320m
  pids_limit: 64
  cpus: 1
  restart: unless-stopped
  labels: {io.sup2api.ccgateway.shared: "${CCG_PREFIX:-ccg}"}
```

- 不用 `--requirepass`，口令不出现在命令行（`ps` 可见）。用户只来自 ACL 文件里的管理用户（7.5）和控制器运行时建的账号用户；`default` 用户在 ACL 文件里关闭。
- 控制器服务新增只读挂载：`{source: …/state, target: /run/ccg-state, read_only: true}`。
- `.env` 新增 `CCG_STATE_IMAGE`（安装脚本写，与另外三个镜像变量同一处，`runtime_compose.go:242-244`）。
- 安装脚本：`dc up -d --no-deps state`（项目约定 up/down 必须带服务名，yml:15-17）。
- guard `compose.Services` 加 `"state": true`，控制器可以经 guard 重启它（7.5 的恢复流程用）。

### 7.4 guard

| 改动 | 位置 |
|---|---|
| `App()` 在开关 `CCG_GUARD_SESSION_STATE=1`（安装脚本写进 guard 环境）时 Binds 加第三项 `<RuntimeRoot>/state:/run/ccg-state:ro`，并在 `Volumes` 加挂载点 | `policy.go:245-250` |
| `putApp` 建容器前 `VerifySocketDir(<RuntimeRoot>/state)`（与 `VerifyResolv` 并列） | `handlers.go:592` 附近 |
| `appMounts` 接受 2 项（老形态）或 3 项（新形态，第三项逐字等于上面的 bind、非 RW、rprivate） | `handlers.go:621-639` |
| `Sweep` 把 `state/` 纳入启动清扫，只校验不删除 | `files/runtime.go:73-108` |
| `compose.Services` 加 `state` | `compose/compose.go:21` |
| guard `/v1/health` 的 `Features` 加 `session-state-v1` | `api/handlers.go:21-29`、`types.go:18-21` |

开关的意义：guard 先升级、Valkey 还没部署时，新建容器仍是两项挂载，不会因为目录不存在而建不出容器。

### 7.5 控制器

**管理用户**。Valkey 不持久化，重启后运行时建的用户全部丢失，所以管理用户放在只读的 ACL 文件里：

- 安装脚本生成管理口令，存在控制器数据目录 `/opt/ccgateway-controller/state-admin.secret`（root 0600，容器内 `/data/state-admin.secret`）。
- 安装脚本写 `/opt/ccgateway-runtime/state-conf/users.acl`（root 0644），只有两行：`user default off` 和 `user ccg-controller on #<口令的 SHA-256> resetkeys resetchannels -@all +acl|setuser +acl|deluser +acl|list +acl|getuser +info +ping`。文件里只有哈希，不含口令。
- Valkey 以 `--aclfile` 只读加载它，重启后管理用户自动恢复。账号用户由控制器运行时 `ACL SETUSER` 加上，不写回文件（管理用户没有 `acl|save`、`acl|load`）。
- 没有采用"无口令的引导用户"：任何能连 socket 的容器（包括被攻破的 app）都可能先抢到它。

| 时机 | 做什么 | 位置 |
|---|---|---|
| provision（首次或重建） | `recordRuntime` 之后：没有 `state_password` 就生成（32 字节随机数的十六进制，64 位；与 api_key 同一处生成，`provision.go:623`），存进 `AccountState`（新字段 `state_password`，json `state_password,omitempty`，`store/state.go:112-155`）；`ACL SETUSER acct-<key>`（幂等）；`appEnvironment` 在 guard 报告 `session-state-v1` 时加 `CCG_STATE_SOCKET=/run/ccg-state/valkey.sock`、`CCG_STATE_PASSWORD`、`CCG_STATE_USER=acct-<key>` | `provision.go:145-149`、`:643-672` |
| apply（每次 PUT config） | `sharedApply` 里、进入 `sharedActivate` 前幂等补一次 `ACL SETUSER`。revision 未变且已就绪的 apply 会提前返回、走不到这里，由每 10 秒的后台对账兜底 | `apply.go:189-206` |
| 删除 | `removeResources` 之后、`RemoveAccountDir` 之前 `ACL DELUSER`；键靠 TTL 过期 | `delete.go:67-71` |
| 停用（block） | `ACL SETUSER acct-<key> off`；解除时 `on` | `apply.go:165` |
| 后台对账 | 每轮 `sharedPass`（10 秒）读一次 `INFO server` 的 `run_id`；变化（Valkey 重启）或首次时，在 `recoverKey` 里给每个有 `state_password` 的账号补 `ACL SETUSER`；失败按现有"一次性 + 失败重试"的模式（`dropOwnEgressOnce` 旁边） | `background.go:17`、`shared.go:681-776` |
| 启动 | 仿照 `checkGuard` 只记日志、不阻塞启动 | `cmd/ccg-controller/serve.go:128-139` |
| `/health` | 新字段 `session_state{reachable, used_memory, evicted_keys, users}`，带 30 秒缓存与 3 秒超时（仿照 `egress_gateway`）；`Features` 加 `session-state-v1` | `admin/admin.go:72-157` |

- `state_password` 不进 auth fingerprint（fingerprint 用 admin_key 作 salt、只含认证信息），所以给老账号补口令不会触发重建。
- 账号用户的 ACL 见第 5.4 节。

### 7.6 Worker

- `C/worker/internal/config/config.go:81-82` 旁读 `CCG_STATE_SOCKET`、`CCG_STATE_USER`、`CCG_STATE_PASSWORD`；三者齐全且 socket 存在才启用 Valkey 存储，否则进程内存。
- `C/engine/runner.go:74` `workerSecrets` 加 `CCG_STATE_PASSWORD`（CLI 子进程看不到）。
- 依赖：`github.com/redis/go-redis/v9`（与核心同版本 v9.22.0），测试用 `github.com/alicebob/miniredis/v2`（与核心同版本）。加进 companions 的 `go.mod`；Worker 静态编译不受影响。

### 7.7 老账号

- 挂载与环境变量都在建容器时定，老账号容器没有 socket、没有口令：Worker 用进程内存（现在的行为，加上工具集合与 TTL 策略）。
- 原地更新 Worker 到新版本后，工具清单头照样做，只是 Worker 重启会丢记忆。
- 新账号、以及因凭据或网络策略变化而重建的容器用 Valkey。用户规则"老账号只原地更新、绝不重建"不变；如果以后要给老账号用上，只能逐个重建（`/work` 卷、api_key、admin_key、登录都保留，见调研第 7 点），由用户另行决定。

## 8. 契约、插件与核心

| 位置 | 改动 |
|---|---|
| `contracts/features/agent_context.go` | `AgentContextHeaders` 加 `{"tools_used","X-Claude-Code-Sandy-Plover", …}`。形状用专门的校验（JSON 数组；元素只有 `name`，或 `name`+`url`/`directory_entry`/`unresolved`；名字匹配原生正则；≤64 项），不用正则。长度上限单独 8192（其余头仍 4096） |
| `contracts/features/request_modes.go` | `ToolsUsedCapability = "request_tools_used_v1"`、`SessionMemoryCapability = "session_memory_ttl_v1"` |
| `contracts/features/wire.go` | `WorkerPolicy.SessionMemory` |
| 插件 `manifest.json` | 两处 `passHeaders` 加 `x-claude-code-sandy-plover` |
| 插件 `internal/ccgateway/ccgateway.go` | `agentContextHeaders` 表来自 contracts，自动带上；确认 8192 字节的值能过插件 RPC |
| 核心 | 入站头长度限制核对；`session_memory` 设置的校验与解析（全局 → 分组 → 账号）；只给有能力的 Worker 发 |
| 控制台 | CCGateway 设置两项 TTL；i18n；`contractFixtures.spec.ts`、`RequestPolicySettings.spec.ts` |
| CLI `request-agent.js` | `clientFields` 不加这个头（它不走 agent context 的 client 表），由新字段 `tools_used` 传 |

---

## 9. 时序

**正常一轮（318 一方客户端，Bash 往返）**

1. 请求 1：客户端头 `[]` → Worker 读记忆（空）→ CLI 发客户端原值 `[]` → 应答里有 `tool_use Bash` → Worker `mergeTools([Bash])`。
2. 请求 2（带 Bash 的 tool_result）：客户端头 `[{"name":"Bash"}]` → 原值发出 → 回报 `[Bash]`，合并无变化，续期。

**三方形状客户端（不发头）**

1. 请求 1：没有客户端值，记忆空，历史无工具 → `[]`。
2. 请求 2：记忆 `[Bash]`（来自上一个应答）∪ 历史 `[Bash]` → `[{"name":"Bash"}]`，与官方一致。

**过期后（D7）**

1. 两轮之间超过 24 小时：两个键都已过期。
2. 新请求：记忆空 → `nD(历史)` 排序结果作为起点 → 发出 → 回报写回，TTL 重新计。
3. 之后照常累积。

**Valkey 不可用**

读超时（≤60 毫秒）→ 用进程内存副本 → 熔断 30 秒 → 恢复后重新读 Valkey。请求不受影响。

---

## 10. 测试

### 10.1 Go 单测（engine）

- 存储接口一套用例，三种实现都跑：`memoryStore`、`valkeyStore`（miniredis，含 Lua 脚本）、`fallbackStore`。
- TTL：可控时钟 + miniredis `FastForward`，线程键、工具键分别过期；读工具键续期；过期后下一请求只看历史。
- 超时与熔断：注入慢连接（50 毫秒）→ 走内存、请求不变慢；连续失败 5 次 → 熔断。
- 观察器：SSE 与 JSON 应答里的 `tool_use`、`server_tool_use`、`mcp_tool_use` 名字与顺序；超大输入不缓存。
- `requestAgent` 的 `tools_used` 只给有能力的 CLI；客户端值形状校验。
- 用例在 Linux 上跑（`golang:1.27-bookworm`，ovh），确认没有跳过。

### 10.2 ACL 与隔离（真 Valkey，ovh 一次性容器）

- `acct-A` 读写 `ccg:A:*` 成功；读写 `ccg:B:*`、`KEYS *`、`SCAN`、`FLUSHALL`、`CONFIG GET`、`EVAL` 访问 B 的键都被拒。
- `default` 用户连接被拒；错误口令被拒。
- 控制器对账：删掉一个用户后一分钟内补回；Valkey 重启后全部补回。

**实测（2026-11-05，ovh）**：`companions/controller-go/integration/state/run.sh <next> <工作目录>`。Valkey 按 compose 的 `state` 服务起（`valkey/valkey:9.1.2`、同样的参数、root 无能力、只读根、无网络、socket 目录 root 0755、`users.acl` 按安装脚本的写法生成）；`-tags realvalkey` 的测试二进制在同一镜像里跑（root，重启测试要停 valkey-server，旁边一个循环把它重新拉起），Worker 存储测试另以 uid 1000、只读挂载 socket 目录再跑一遍（与账号容器相同）。默认测试套件不含这些文件（控制器的套件不允许跳过）。结果全部通过：

| 测试 | 内容 |
|---|---|
| `sessionstate` `TestRealValkeyIsolation` | 账号用户对自己前缀的 GET/SET/GETEX/TTL/EXPIRE/EXISTS/DEL/SCRIPT LOAD/EVALSHA/EVAL 都成功；对别的账号的键直接访问、经脚本 `KEYS[1]`、脚本里未声明的键、`ccg:2`/`ccg:210:` 这类前缀都被拒（NOPERM）；KEYS、SCAN、FLUSHALL、FLUSHDB、CONFIG、INFO、ACL、CLIENT、SCRIPT FLUSH、SUBSCRIBE/PUBLISH、MONITOR、SHUTDOWN、SAVE、MODULE、FUNCTION、DBSIZE、RANDOMKEY、SELECT、MIGRATE、RENAME、COPY、OBJECT、MEMORY 都被拒；DEBUG 在 ACL 之前就被拒（`enable-debug-command no`） |
| `TestRealValkeySignIn` | 未认证的命令 NOAUTH；`default` 用户（空口令或任意口令）、错误口令、不存在的用户、用账号口令登管理用户都 WRONGPASS；`HELLO 2 AUTH` 成功；管理用户只能 ACL 与 INFO，键、KEYS、CONFIG SET、ACL SAVE/LOAD、FLUSHALL、SHUTDOWN 都被拒 |
| `TestRealValkeyBlockAndDelete` | `off` 之后新登录被拒，**之前已认证的连接继续可用**（仍只限自己的前缀，见第 12 节）；`DELUSER` 断开该用户的连接 |
| `TestRealValkeyRestart` | 重启后数据和全部账号用户都没了，管理用户从 `users.acl` 回来 |
| `accounts` `TestRealValkeyManager` | 控制器真实的 Manager：建两个账号后各自能登录、只能写自己的前缀、口令互不通用；背着控制器删一个用户，下一轮后台对账补回；Valkey 重启后一轮对账全部补回（日志 "session state Valkey restarted"）；block 后登录被拒，重启加对账后仍是关的，再 apply 恢复；删除账号后用户没了，对账不会再加回来 |
| `engine` `TestSessionStores*`（加 real-valkey、real-fallback 两种实现） | 共用用例在真 Valkey 上跑：线程与工具集合、首次使用顺序、空集合（Lua 写成 `{}`）、256 上限；TTL 用真实时间（线程 2 秒、工具 5 秒、读工具续期） |
| `TestRealValkeyWorkerStore` | 按 `runtime.go` 的方式（`StateStore` → 带本地副本的共享存储）：一个进程写的，下一个进程（Worker 重启）读得到；键在账号前缀下、TTL 约 86400；别的账号的 go-redis 客户端 GET/SET/DEL/EVAL/KEYS/SCAN/FLUSHALL 都 NOPERM；错误口令报 WRONGPASS。uid 1000 + 只读挂载同样通过 |
| `TestRealValkeyStoreAfterRestart` | 重启后用户补回之前存储报错（Worker 用进程内存）；补回后 EVALSHA 得 NOSCRIPT、改用 EVAL，集合从空开始 |
| `TestRealValkeyStoreDown` | Valkey 停着：每个请求都不等它、不失败（每次 < 500 ms），失败 5 次后熔断，本地副本照常回答并继续合并；恢复且熔断时间过后，新会话的集合写进 Valkey |

### 10.3 CLI 原生测试

第 6.5 节。另外跑 `CCG_CLI_VERSION=2.1.316` 全套，确认 316 不受影响。

### 10.4 离线回归（e2e）

`docker.sh` 新增一个与被测容器共享 socket 卷的一次性 Valkey 容器（`--network none`）。新场景，A 侧官方 318 直连，B 侧经网关，逐字节比这个头：

| 场景 | 期望 |
|---|---|
| 多轮工具：Bash、Read、MCP 工具、WebSearch 服务端工具 | B = A |
| 子代理 1–3 层 | B = A |
| 中途压缩后继续用工具 | B = A |
| 三方形状（客户端不发） | B = A（官方一方形状同一客户端的值） |
| 一方客户端头被代理删掉（`proxy.cjs` 删头） | B = A（D6 补发） |
| 316 客户端 | B 不发 |
| **过期模拟**：`thread_ttl`=`tools_ttl`=2 秒，第二轮前等 3 秒 | B = 只看历史的推导值（与 A 的差别只在顺序，逐项列出） |
| **Worker 重启**：两轮之间重启 Worker 进程 | B = A（记忆在 Valkey） |
| **Valkey 停机**：停 `state` 容器 | 请求全部成功，B 退回进程内存；恢复后继续用 Valkey |
| **老容器**：不挂 socket | 行为同进程内存 |

其余断言（verify、capcheck、respmatch、fp-compare、values、beta-check）全过；去掉这个头后与 v48 0 差异。

**实测（2026-11-05，ovh，v56b + 候选 Worker）**：`docker.sh state`（套件 README "state 模式"）。和上表的差别：

- 过期场景用策略最小值 60 秒，等 65 秒；
- 新加 @ 文件读取后删头并重启 Worker 的场景（只有记忆里有这个名字时才看得出 Valkey 的作用）；
- `state-check.cjs` 除了这个头，还逐请求比线程链（类别头、`cc_prev_req`、diagnostics）。

结果：13 个场景里 12 个与官方一致，1 个是预期差异（`st-ttl-tp` 记忆过期后，压缩后第一个请求没有 `cc_prev_req`）。老容器重启、记忆过期后，这个头仍与官方一致，因为官方的压缩摘要和 @ 读取附件都在历史里留了名字（第 13 节第 36 条）。

跑场景时发现了三个问题，都已修好（第 13 节第 33–35 条；迁移记录第 8.2 节）。全量回归里，去掉这个头后，v47 对 v56b、v48 对 v56b 都是 0 差异，其余断言全过。

### 10.5 上线后验收

新建一个测试账号（会用 Valkey），用真实 318 客户端做一次带工具的两轮会话，上游请求日志里第二轮带 `[{"name":"Bash"}]`；Valkey 里只有 `ccg:<该账号>:` 前缀的键，TTL 约 86400。

---

## 11. 发布顺序

compose 模板与安装脚本在核心里（7.1），guard、控制器、Worker、CLI 在插件里。每一步单独可用、可回滚：

1. **插件**（ccgateway 新版本）：contracts、Worker（会读 `CCG_STATE_*`，没有就用进程内存）、CLI v49、控制器（guard 不报 `session-state-v1` 时不建 ACL、不下发口令）、guard（开关默认关，行为与现在相同）、manifest passHeaders。镜像：app（含 v49）、控制器、guard。按现有流程上线（bundled roles、Worker 原地更新照旧）。此时所有账号都用进程内存，工具清单头已经能做。
2. **核心**：先确认外壳 Host API 满足；核心带上新的 compose 模板与安装脚本、`session_memory` 设置与下发、控制台。
3. **控制器宿主**：用核心的一键安装（或等价脚本）完成：建 `state/`（root 0755）与 `state-conf/users.acl`、生成管理口令、`.env` 加 `CCG_STATE_IMAGE`、`dc up -d --no-deps state`（不碰 egress）、guard 环境加 `CCG_GUARD_SESSION_STATE=1` 后 `up -d --no-deps guard`、控制器 `up -d --no-deps controller`。控制器启动后为全部账号补 ACL 用户、给缺口令的账号生成口令（不重建容器）。
4. 之后**新建**的账号容器带第三个挂载和口令，用 Valkey；老账号继续用进程内存（7.7）。
5. 验收（10.5）。

回滚：
- 核心回滚前先清掉存了 `session_memory` 的分组/账号覆盖（旧核心拒绝未知键）。
- 停 Valkey：`dc stop state`，Worker 自动退回进程内存，请求不受影响。
- guard 关开关后，新建容器回到两项挂载；已有三项挂载的容器仍可启动（`appMounts` 两种形态都接受）。
- 插件回滚到旧 guard 之前，**必须先确认没有三项挂载的容器**，否则旧 guard 的 `appMounts` 会拒绝它们 restart。

---

## 12. 风险

| 风险 | 影响 | 处理 |
|---|---|---|
| 被攻破的容器写满共享 Valkey | 其他账号的记忆被 LRU 淘汰，退回只看历史；读不到、改不了别人的数据 | `maxmemory` 兜底；`evicted_keys` 进控制器 health，异常时告警 |
| 老账号没有挂载 | Worker 重启丢记忆 | 与现在相同；重建时自动获得 |
| 侧通道工具（@ 文件、hook、MCP 资源） | 第 2、3 级的值比官方少 | 不猜；客户端发了原值时完全一致 |
| 过期后的顺序 | 排序结果而非首次使用顺序 | 与官方"存档被清理后恢复"一致 |
| GrowthBook 远端关了 `tengu_silly_shore` | 账号容器里原生判断为假就不发 | 原生行为，保持 |
| Valkey 单点 | 挂了退回进程内存 | 请求不受影响；`restart: unless-stopped` |
| 同一宿主上的隔离实例（如测试用的 ccg-gt） | 两个实例共用一个 Valkey 时 `acct-<key>` 撞名，孤儿清理会删对方的用户 | **一个 compose 项目一个 `state` 服务**，各用自己的 RuntimeRoot（2026-11-05 实现时发现） |
| block 下发 `off` 不断开已认证的连接（10.2 实测，Valkey 9.1.2） | 那个连接仍只能读写本账号自己的前缀；停用账号的容器已停，影响很小 | 不处理；删除账号时 `DELUSER` 会断开。Valkey 行为若变，`TestRealValkeyBlockAndDelete` 会失败 |
| 环境变量体积 | `memory` 最多约 66 KB | 低于单变量上限；超出截断加 UD |

---



## 13. 实现中的修正（2026-11-05，以本节为准）

实现时发现上文与实际冲突或写得不清的地方，按下面做（上文相应位置未逐处改写）：

| # | 上文 | 实际做法 | 原因 |
|---|---|---|---|
| 1 | 4.1 接口方法不带 TTL | 每个方法带 `ttl` 参数 | TTL 是每个请求的策略（4.7） |
| 2 | 4.1 启用条件"socket 存在且口令非空" | `CCG_STATE_SOCKET`、`CCG_STATE_USER`、`CCG_STATE_PASSWORD` 三者齐全、socket 存在、USER 形如 `acct-<key>`（`<key>` 为 `[A-Za-z0-9_-]{1,64}`）；键前缀 `<key>` 取自 USER | 与 7.6 统一 |
| 3 | 4.1 "Valkey 恢复后从 Valkey 读" | 先读本地副本，本地没有才读 Valkey | 同一账号只有一个 Worker 写，写是异步的，先读 Valkey 可能读到旧值 |
| 4 | 4.2 连接池 4 条"与请求槽位一致" | 仍为 4；需观察 | 2026-11-04 起模型请求不占槽位，高并发时池等待超时会计入熔断。熔断只会退回内存、不影响请求；如果实测频繁熔断，把池调到 8–16 或池等待不计失败 |
| 5 | 5.4 账号 ACL | 加 `+hello` | go-redis 建连先发 HELLO，被拒后才退回 AUTH |
| 6 | 未提 | go-redis 设 `EndpointTypeNone`、关 `CLIENT SETINFO` | v9.22 的维护通知会把 socket 路径当主机名做 DNS 解析，最长卡 2 秒；ACL 禁了 `CLIENT` |
| 7 | 5.3 合并脚本没有字节上限 | ARGV 改为 ttl、名字数上限、字节上限，名字从 ARGV[4] 开始；解码用 `pcall`；Go 侧 `mergeToolNames` 用同一规则，测试比对两边截断位置一致 | 合并后的大小只有脚本知道 |
| 8 | 4.6 memory 截断 | 超过 256 个截掉尾部，**最后一项**换成 UD；CLI 把 memory 里的 UD 当普通名字 | 原生集合也接受 UD，代表"不可读的工具"；原生序列化的截断标记仍按原生放首位 |
| 9 | 6.4 回报"去掉 UD" | 回报可以包含 UD，只去掉原生序列化插在首位的截断标记 | 与第 8 条一致 |
| 10 | 观察器 | 读 Agent 调用失败（输入过大、超过 16 个）后只停记 spawn，名字照读，`message_stop` 照样读到 | 记忆写入时机与 2026-11-03 的要求一致（在最后字节到达客户端之前） |
| 11 | 写失败 | 不重试；线程状态只留本地副本，工具集合在下次成功读时补写缺的名字 | D7 兜底 |
| 12 | 熔断语义 | 连续 5 次失败熔断 30 秒；之后放行一次，再失败立即重新熔断，成功一次清零；超过 16 KB 被拒写不算失败 | — |
| 13 | 7.3 compose | 用 `entrypoint: ["valkey-server"]` 绕过镜像入口脚本，以 uid 0 运行 | 镜像入口会 setpriv 切到 valkey 用户，`cap_drop: ALL` 下失败，而且 socket 必须归 root |
| 14 | 5.4 管理用户 | 加 `+info` | 对账读 `run_id`，health 读内存与淘汰数 |
| 15 | 7.5 口令 | 64 位十六进制（`TokenHex(32)`） | 与 5.4 统一 |
| 16 | 7.5 apply 补 ACL | 放在 `sharedApply` 里；revision 未变就提前返回的 apply 由每 10 秒的后台对账兜底 | 那条路径走不到 `sharedActivate` |
| 17 | 7.4 | guard 的 `dockerapi.Mount` 补 `Propagation` 字段；带第三个挂载的容器每次 start/restart 都校验 `state/`，与开关无关 | 否则校验不了 rprivate；源目录不在时 Docker 会自建 |
| 18 | 控制器 Valkey 客户端 | 自写最小 RESP2 客户端（AUTH、ACL、INFO），不用 go-redis | 控制器模块没有任何第三方依赖 |
| 19 | 3.3 wire 消息只标 `isMeta`/`turnCompanion` | user 消息按块拆成记录；伴随块后面那条记录给一个原生不解析的 `origin` 种类，伴随块在末尾或连续时补空记录 | 原生 `nD` 要求伴随块后紧跟一条带 `origin` 的 user 记录 |
| 20 | 3.3 Skill/REPL 结果里的名单 | 不解析 | 原生只读内部字段 `toolUseResult`，wire 上没有；Agent/SendMessage/Poll 的名单照常解析 |
| 21 | 6.3 合并放在 request-build.js / request-command.js | 共用的 request-agent.js 提供版本中立的衔接点，318 专属的 request-tools-used.js 由补丁后的 `chunk-vn3g7zt8.js` 加载时注册合并函数；request-command 发送前调用，发送点没合并过时再兜底补做一次 | 共用模块不能导入本版本 profile 没装的模块（`checkImports`），否则 316 的补丁会失败 |
| 22 | 6.2 摘要识别 | 补丁在 `chunk-sva49n74.js` 末尾追加 `export {Z as ccgatewayCompactSummaryTools}`（Z 是原生摘要正则的读取函数），伴随块用已导出的 `PZt`，UD 用 `chunk-5ythzcas.js:UD` | 不在支持模块里手抄正则 |
| 23 | 4.4 失败请求的 CLI 回报照写 | 只在 2xx 时回报（CLI 只在 2xx 写元数据，Worker 靠元数据文件判断是否到达上游）；失败请求只合并客户端值里的名字 | 不改 Worker 契约 |
| 24 | 6.1 标签 v49 | `ccgateway-v56-cc-2-1-318`；共用模块变了，旧版本依次升为 316 v57、312 v58、310 v59、304 v60（只补丁、不编译、不发布） | runbook 4.7：序号跨版本连续、支持模块变就升标签 |
| 25 | 7.3 compose | `init: true` 代替镜像的 tini；标签改用 `io.sup2api.ccgateway.state`；只读挂载整个 `state-conf/` 目录到 `/etc/valkey`（不再单文件挂载 users.acl）；镜像 `valkey/valkey:9.1.2` | `shared` 标签会被 guard/控制器当成共享出口；安装脚本写临时文件再改名，单文件挂载会读到旧 inode |
| 26 | 7.2 `state-conf` 权限未写 | 0700 | 只有 Valkey（root）读 |
| 27 | 4.7 控制台"请求页"加两项 | 作为和其他层并列的一层 `session`，分组/账号按整层跟随或自定义，所有等级（含 direct）都下发 | 不属于等级里的某一层 |
| 28 | 11 回滚 | 旧核心 `FeatureOverrides` 解码 `DisallowUnknownFields`，回滚前必须清掉分组/账号覆盖里的 `session_memory` | 与 first_party_shape 相同 |
| 29 | 安装脚本 | Valkey 任一步失败只打印 `CCG_STATE=<原因>`、核心记 warn，安装照常完成；只有 ACL 文件内容变了才 `--force-recreate` state；回滚保留 `state/` 与口令文件 | Valkey 是可选增强，失败退回内存 |
| 30 | 请求头长度 | 核心与外壳 `http.Server` 默认 1 MiB、passHeaders 不截断、插件 RPC 上限 4 MiB，无需放开；新增测试 8192 字节原样到插件 | — |
| 31 | 10.2 真 Valkey 测试放哪 | `companions/controller-go/integration/state/run.sh`，测试文件带 `-tags realvalkey`（控制器另加 `linux`），只在这个脚本里编译运行 | 控制器默认套件不允许跳过（`check-test-json.sh`），不能用 `t.Skip` 门控 |
| 32 | 10.4 过期场景 TTL 2 秒 | 用策略允许的最小值 60 秒，场景等 65 秒 | `SessionMemoryPolicy.Validate` 范围 60..2592000 |
| 33 | 4.4 应答观察器 | side query（客户端标 `auxiliary`，或没有类别且只提供服务端工具）的应答里的工具调用不并入集合；CLI 回报的名字照收 | 官方只在主循环（主线程、子代理）的助手消息里记 server/mcp 工具；WebSearch 的 side query 应答里的 `web_search` 官方不记，e2e 里 B 侧多出这一项 |
| 34 | 三方形状的 side query | CLI 把"没有类别头、不是子代理或压缩、只提供 `web_search` 服务端工具"的三方请求按 WebSearch 的 query source `web_search_tool` 构建：类别 `auxiliary`，不加 prompt ID、turn 字段和 diagnostics，不续接也不改线程记忆 | 之前当成主线程，紧接着的主线程请求丢了 `cc_prev_req` 和 diagnostics（v47 起就有） |
| 35 | 线程记忆 | 每个线程另记最近 16 个应答：键（应答里文本块的文本与工具块的 ID，按顺序）→ request-id、message ID。请求不续接最近一次应答时，按它最后一条 assistant 消息的键找，找到就只给这两项（不给 turn、prompt ID 等）。存储格式仍为 v1，加可选字段 `answers` | 官方的压缩请求不含最后一条应答、压缩后的请求以摘要开头，仍写那条应答的 `cc_prev_req` 与 `previous_message_id`；工具循环后压缩时这两项一直缺（v47 起就有） |
| 36 | 10.4 的预期差异 | 老容器重启、记忆过期后 B 仍等于 A，不列为预期差异 | 官方压缩摘要带 `<tools-used-before-summary>`，@ 文件读取在历史里有 "Called the Read tool" 附件，只看历史也推得出；记忆是冗余保障 |
