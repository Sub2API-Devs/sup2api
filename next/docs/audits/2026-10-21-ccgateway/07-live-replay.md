# 07 实测回放：真实 Claude Code 请求经 Worker 重组后的上游形态

审核日期 2026-10-21。审核员：实测。范围：用**当天新抓**的官方 Claude Code 2.1.304 请求，在 OVH 隔离容器里以客户端身份发给生产镜像 Worker（`ccgateway-app:0.1.70`），由定制 CLI 发往自写假上游，逐字段比较“客户端原始请求 → 上游实际收到的请求”和“上游响应 → Worker 返回的响应”。全程无真实 Anthropic 流量、无真实凭据、未接触生产容器。

## 0 结论摘要

- **内容保真达标**：build 模式下 system 块数量/顺序/文本/cache_control、messages（含 304 新增的 `role:"system"` 中途消息、带签名 thinking 历史、tool_use/tool_result 配对、tool_result 内图片、用户图片）、tools（14 个，含 `defer_loading`）以及非原生托管参数在 3 种 Worker 凭据形态 × 29 条输入上**全部相等**；direct 模式 81/81 正文**逐字节相等**；`build-worker` 只改了所选 4 个环境字段和 `cc_version`。响应侧 SSE 逐字节一致，JSON/429/400 错误体、状态码、`request-id`、`retry-after`、`anthropic-ratelimit-*` 均原样返回。native 模式已退役，请求一律 409 且零上游调用。
- **身份与指纹层面存在明显偏差**（这是本轮主要发现）：build 每个请求换一个新 `session_id`；direct 把最终用户的 `metadata.user_id`（设备 ID、会话 ID）原样送到 OAuth 账号，且与请求头会话 ID 不一致；OAuth 第一方路径下内层 CLI 追加 `diagnostics.previous_message_id`，多轮时填的是**伪造的 `msg_<uuid>`**；API Key 路径的上游请求头被换成 `User-Agent: ccgateway-request` 等隔离头；`cc_version=worker` 的指纹按 CLAUDE.md 提醒块计算，与官方算法取的文本不同；`x-stainless-timeout` 为 3600（官方 600）。
- 生产当前版本**没有**账号身份映射（v14 在本机 HEAD 的两个未推送提交里），因此上述 metadata 问题在线上真实存在；v14 是否修复无法在服务器实测（源码不得经 Git 以外途径上传，且不得推送）。

## 1 环境与版本

| 项 | 值 |
|---|---|
| 客户端（抓包） | 本机 Windows 官方 Claude Code `2.1.304 (Claude Code)`，`claude.exe` SHA-256 `019e5174d5d954585edb1a946fe280e44a973050b4897034adf0e16306f85fdd` |
| 客户端（第一方对照） | OVH 上已存在的官方 Linux ELF `/home/debian/sup2api/checks/ccg-304-v12/claude-official-304`，SHA-256 `ea0f135784631619a7a409d07322ecec964f9cc4fd377508ed1ba3f141f27912`（只读挂载） |
| Worker 镜像 | `ccgateway-app:0.1.70`，镜像 ID `sha256:e9b9bf9907935aea8fd897d86323031050b224a357d60af8fa66ba7e298282d4`，label revision `9dfcb60b9c155d80e50f4aff1ee292f65e8522be` |
| Worker 程序 | `/usr/local/bin/worker` SHA-256 `5ece090925153f055d36c84894d134aa24f0346eec34b3c2a598809fc618360a`（与 304 实施记录第 12 节的正式 Worker 一致） |
| 定制 CLI | `/opt/ccgateway/cli/2.1.304/claude` SHA-256 `138da88ed5895fbc099115e7662df7ff9a6bd848d5a4cd142e29f2c9baaa56bd`，patch `ccgateway-v12-feature-policy`，capabilities 含 `request_direct/request_build/request_oauth/build_*` |
| origin 对照 | 服务器 `git fetch` 得 `origin/feat/next-platform` = `50da2ceac`；在独立 worktree 中 `git diff 9dfcb60b9..50da2ceac -- engine worker cli-mods mod contracts` **为空**，故生产镜像即 origin 当前的 Worker/CLI 源码，无需另行构建 |
| 本机 HEAD 差异 | 本机 `43d576838` 比 origin 多 2 个未推送提交：`08035b19c`（按账号映射请求身份 v14：`cli-mods/request-identity.js`、`engine/request_identity.go`、`patch-cli-2.1.304.cjs`、profile）和 `43d576838`（容器资源/卷配额：`cli-mods/container-resources.js` 等）。**两者都改动 Worker/engine/cli-mods，本次未实测** |

服务器隔离约束（全部满足）：自建 `--internal` 网络 `ccg-audit-net`；所有容器 `--cap-drop ALL --security-opt no-new-privileges --cpus 2 --memory 4g --pids-limit 512 --user 1000:1000`，无端口发布、无账号数据卷；凭据全为假值（`sk-ant-api03-AUDITFAKE…`、`sk-ant-oat01-AUDITFAKE…`、邮箱 `audit-account@example.invalid`）。第一方端点用 `--add-host api.anthropic.com:<假上游 IP>` + 一次性自签 CA（`NODE_EXTRA_CA_CERTS`）模拟，假上游同时监听 HTTP 18080 与 TLS 443。

## 2 方法

```text
[本机] 官方 claude 2.1.304（env -i 清空宿主会话变量，临时 CLAUDE_CONFIG_DIR/HOME/APPDATA）
        └─ ANTHROPIC_BASE_URL=http://127.0.0.1:18431 → 本机假上游（记录头/正文，按提示返回 text / tool_use / thinking）
           → 20 条真实 /v1/messages 请求（数据集 dataset.json，sha ff3fcfcf…）
[OVH ccg-audit-net]
  ccg-audit-upstream（驱动 + 假上游）──客户端头 + x-api-key + X-CCGateway-Request-Policy──▶ ccg-audit-worker-N:8787
  ccg-audit-worker-N（生产镜像 Worker → 定制 CLI request --build/--direct）──▶ 假上游（记录上游请求、返回 SSE/JSON/错误）
```

- W1：API Key，`ANTHROPIC_BASE_URL=http://ccg-audit-upstream:18080`（自定义 URL）。
- W2：OAuth（假 `.credentials.json` + `.claude.json`），第一方 `https://api.anthropic.com` 被指向假上游——**这是生产 OAuth 账号的真实路径**。
- W3：API Key + 第一方 URL。
- W4：`CCG_REQUEST_MODE=native`（验证退役行为）。
- 另用官方 Linux ELF 在同一网络对第一方端点（OAuth 与 API Key 各 4 轮、6 条消息请求）抓包，作为“官方第一方形态”对照，再把这 12 条也送进 W2/W3 回放。

策略头（模拟核心下发的稀疏 wire policy）：`build-default` = `{"schema_version":1,"relay_mode":"build","cli_version":"2.1.304"}`；`direct`；`build-worker` = build + `platform_name/os_version/shell/primary_directory=worker` + `cc_version/cc_entrypoint=worker`；`no-policy` = 不带头；`native-policy` = `relay_mode:"native"`。

### 与仓库已有回放工具的关系

`official-client-replay.cjs`、`live-official-client.cjs`、`assembly-replay.cjs`、`component-combination-replay.cjs`、`worker-policy-matrix.cjs` 都在 `--network none` 的单容器内用 loopback 上游、**API Key**、Linux 官方 CLI 运行，断言内容保真与策略字段，`replay-helpers.cjs` 里还有 `onlyUserIDChanged`（v14 用）。它们**未覆盖**：Windows 客户端实际形态、OAuth 第一方路径的上游请求头、`diagnostics`、会话 ID 跨轮稳定性、header 与 metadata 一致性、官方第一方 billing 字段。本轮未改动也未重跑这些脚本，只复用了它们的启动参数思路（manifest、SHA 校验、uid 1000）。

## 3 场景清单（本机官方 Windows 客户端实抓）

| ID | 内容 | 请求数 |
|---|---|---|
| s01/s02/s03 | `-p` 简单问答，`--model sonnet/opus/haiku` → `claude-sonnet-5-5/opus-5-5/haiku-5-5` | 各 1 |
| s04 | Read 工具多轮（假上游回 tool_use → 客户端读本地文件 → tool_result 回来） | 2 |
| s05 | Bash 场景：Windows 客户端只有 PowerShell 工具，假上游回 PowerShell tool_use | 2 |
| s06 | Read PNG：tool_result 内含 image 块 | 2 |
| s07/s08 | opus `--effort high`，首轮返回 thinking+签名；`--resume` 第二轮带 thinking 历史 | 1+1 |
| s09/s14 | 尝试关闭 thinking（settings / `MAX_THINKING_TOKENS=0`）——2.1.304 对 5.5 模型仍发 `adaptive`，未能得到 `disabled` 形态 | 各 1 |
| s10/s11 | `--session-id` + `--append-system-prompt`（system[1] 变为 “You are Claude Code…”），`--resume` 后 Read 工具（3 轮历史） | 1+2 |
| s12 | `--exclude-dynamic-system-prompt-sections`（环境移入首个 user） | 1 |
| s13 | `--input-format stream-json` 用户消息带 base64 图片 | 1 |
| s15/s16 | 旧模型 `claude-sonnet-4-6`（max_tokens 32000、无中途 system 消息）、`claude-haiku-4-5-20251001`（`thinking: enabled, budget_tokens 31999`、无 output_config） | 各 1 |
| d01/d02/d03 | 由 s01 派生：假上游回 429（带 retry-after）、400、非流式 JSON | 回放时各 1 |

所有客户端请求均含：CLAUDE.md 提醒块（`AUDIT_CLAUDE_MD_CANARY`）、gitStatus 提醒、`role:"system"` 环境消息（5.5 系模型）、billing 块、14 个工具（含 `ToolSearch`、`DeferredToolPlaceholder(defer_loading)`），`metadata.user_id` 为 `{device_id, account_uuid:"", session_id}`。数据中保留了本机路径（含 Windows 用户目录名 `16790`），已确认不含任何凭据（假 key 只以“长度+哈希”形式记录）。

## 4 结果矩阵

“相等”指与客户端原始请求逐项比较（system/messages/tools 深比较；params = 除 system/messages/tools/metadata 外的顶层字段）。“上游”列为 Worker 实际发往假上游的次数。

| Worker | 模式 | 用例 | 状态码 | 上游 | 正文逐字节 | system | messages | tools | params | metadata | 响应一致 |
|---|---|---:|---|---:|---:|---:|---:|---:|---|---|---:|
| W1 API Key·自定义 URL | build-default | 23 | 200×21/429/400 | 23 | 0 | 23 | 23 | 23 | 23 相等 | 23 被替换 | 23 |
| W1 | no-policy | 23 | 同上 | 23 | 0 | 23 | 23 | 23 | 23 相等 | 23 被替换 | 23 |
| W1 | build-worker | 23 | 同上 | 23 | 0 | 仅 billing | 仅环境块 | 23 | 23 相等 | 23 被替换 | 23 |
| W1 | direct | 23 | 同上 | 23 | **23** | 23 | 23 | 23 | 23 相等 | 原样 | 23 |
| W1 | native-policy | 23 | 409×23 | **0** | – | – | – | – | – | – | – |
| W2 OAuth·第一方 | build-default | 23 | 200×21/429/400 | 23 | 0 | 23 | 23 | 23 | **+diagnostics** | 23 被替换 | 23 |
| W2 | build-worker | 23 | 同上 | 23 | 0 | 仅 billing | 仅环境块 | 23 | +diagnostics | 23 被替换 | 23 |
| W2 | direct | 23 | 同上 | 23 | **23** | 23 | 23 | 23 | 相等 | 原样 | 23 |
| W3 API Key·第一方 | build-default/worker/direct | 23×3 | 同上 | 69 | direct 23 | 同 W2 | 同 W2 | 23 | build 加 diagnostics | build 替换 | 69 |
| W2 + 官方第一方 OAuth 输入 | build-default/worker/direct | 6×3 | 200 | 18 | direct 6 | 相等（worker 仅 billing） | 相等/仅环境 | 6 | **相等**（客户端已带 diagnostics，保留） | build 只换 session_id | 18 |
| W3 + 官方第一方 API Key 输入 | 同上 | 6×3 | 200 | 18 | direct 6 | 同上 | 同上 | 6 | 相等 | 同上 | 18 |
| W4 `CCG_REQUEST_MODE=native` | 无头/build/native 头 | 3 | 409×3 | 0 | – | – | – | – | – | – | – |

合计：Worker 发往上游 266 次，均恰好一次/用例；退役 native 26 次请求零上游调用（409 `configuration_error`：策略头为 native 时 “Worker CLI version/mode differs…”；Worker 环境为 native 时 health 报 `maintenance_only:true`，请求得 “Retired native runtime requires packaged Worker and CLI activation”）。所有上游请求均无 `X-CCGateway-*` 头泄漏；API Key 路径无 `Authorization`，OAuth 路径无 `x-api-key`；客户端发给 Worker 的 Worker key 从未出现在上游。

已确认通过的细节：

- 304 中途 `role:"system"` 消息（`msg[1]`、`msg[4]`、`msg[7]` 等，含字符串/数组两种形态与 `cache_control`）在 build 中原位保留。
- thinking 历史（`thinking` + 28 字符签名）、`tool_use.id ↔ tool_result.tool_use_id`（如 `toolu_audit_read_4`）、tool_result 内 image、用户 image 均保持。
- 工具目录 14 项顺序、schema、`defer_loading` 一致（此前文档中的 ToolSearch 丢失问题在生产镜像上未复现）。
- `build-worker` 改动与策略严格对应（示例 W2 s04#1）：

```diff
-  - Primary working directory: D:\projects\test\ccg-audit-live-20261021
+  - Primary working directory: /work
-  - Platform: win32
+  - Platform: linux
-  - Shell: PowerShell
+  - Shell: unknown
-  - OS Version: Windows 11 Pro for Workstations 10.0.26200
+  - OS Version: Linux 6.12.95+deb13-amd64
- x-anthropic-billing-header: cc_version=2.1.304.b7a; cc_entrypoint=sdk-cli;
+ x-anthropic-billing-header: cc_version=2.1.304.643; cc_entrypoint=sdk-cli;
```

- 响应：流式 SSE 与假上游输出逐字节相同；非流式 JSON 与 429/400 错误体逐字节相同，状态码一致，`request-id`、`retry-after: 7`、`anthropic-ratelimit-unified-*` 透传；上游自定义头（`x-audit-upstream`）按 `httpfacts` 白名单不透传；`Cache-Control` 统一为 `no-store`；错误响应另带内部头 `X-CCGateway-Error-Source: http`。

## 5 偏差详述

### D1 build：同一会话每轮都换新的 session_id（上游看不到连续会话）

客户端两轮同属会话 `c0452f64-…`，Worker 发往上游的 `metadata.session_id` 与 `X-Claude-Code-Session-Id` 每轮都是新随机值；`device_id` 按 Worker 配置目录固定。

```text
s04#1 client session c0452f64-3c05-…  →  W2 upstream 432ec6db-2cf1-…
s04#2 client session c0452f64-3c05-…  →  W2 upstream edc09e13-63aa-…
s10/s11 三轮 client 11111111-…-555555555502 → 57f9209c… / aa1c7c99… / 4419ede3…
```

官方客户端（第一方抓包 req-0007/0009/0010）三轮会话 ID 恒为 `22222222-…-666666666601`，且请求头与 metadata 一致。build 下 W2 的头与 metadata 互相一致，但跨轮不稳定。分类：**缺陷（生产版本）**；本机 v14 声称用 HMAC 把客户端会话映射成稳定的 UUID，未实测。

### D2 direct：最终用户身份原样进入 OAuth 账号，且头/正文会话不一致

direct 正文逐字节保留，因此上游收到客户端的 `device_id`（如 `bc199ae3…`）、`session_id`、`account_uuid:""`，而认证是账号的 OAuth Bearer；同时请求头 `X-Claude-Code-Session-Id` 来自内层 CLI，是另一个随机值：

```text
metadata.user_id.session_id = c0452f64-3c05-4c98-af09-46915625da60   (客户端)
X-Claude-Code-Session-Id     = f066137a-a600-4bd9-8b1c-1523f1215c9f   (内层 CLI)
metadata.account_uuid        = ""   但 Authorization: Bearer <账号 OAuth>
```

官方客户端这三者总是一致（头 = metadata 会话，OAuth 时 `account_uuid` 为账号 UUID）。后果：多个最终用户的设备 ID 汇聚到同一 OAuth 账号，最终用户设备/会话标识泄露给上游。分类：**缺陷（生产版本）**。v14 设计为 direct 只替换 `metadata.user_id`，并称“metadata 与原生会话头保持一致”，需要在 v14 部署前用本轮方法复测头部一致性。

### D3 OAuth 第一方 build：`diagnostics.previous_message_id` 是伪造 ID

经 core 进来的客户端使用自定义 base URL，本身不发 `diagnostics`。build 时内层 CLI（第一方）原生追加该字段；首轮为 `null`，多轮时值为内层 CLI 为重建历史生成的 ID：

```diff
+ "diagnostics": {"previous_message_id": "msg_8df8efa6-7b32-4c15-955d-2357bb024089"}   (W2 s04#2)
```

官方第一方客户端同一位置填的是**上一条上游响应的真实 message id**（对照抓包：`msg_audit_4`、`msg_audit_7`、`msg_audit_9`）；`msg_<uuid>` 格式也不同于真实 Anthropic 的 `msg_01…`。上游若对账即可识别。API Key 第一方（W3）同样出现。若客户端自己带了 `diagnostics`（官方第一方输入），build 会保留客户端值（W2/W3 + 官方输入 params 全相等）。分类：**缺陷**，置信度高。

### D4 混合指纹：客户端的“非第一方形态” + 内层第一方 OAuth 追加项

生产客户端都以 core 为 base URL，故请求是非第一方形态；build 尊重客户端结构，内层 OAuth 又按第一方追加头/字段，组合结果是官方客户端不会发出的形态：

| 项 | 官方第一方 OAuth（对照抓包） | Windows 客户端 → W2 build 上游 |
|---|---|---|
| system | 4 块；`cache_control {ttl:"1h", scope:"global"}` / `{ttl:"1h"}` | 3 块；`{type:"ephemeral"}`（客户端原样） |
| billing | `cc_version; cc_entrypoint; cch=…; cc_prev_req=…; cc_prompt_id=…; cc_turn_origin=sdk; cc_prompt_index; cc_turn_index` | 仅 `cc_version; cc_entrypoint` |
| anthropic-beta | 含 `oauth-2025-04-20`（第 2 位）、`mid-conversation-system-clear-at-2026-08-21`、`thinking-binding-controls`、`extended-cache-ttl`、`cache-diagnosis` | 客户端 9 项 + 末尾追加 `thinking-binding-controls, extended-cache-ttl, cache-diagnosis, oauth`；**缺** `mid-conversation-system-clear-at` |
| 头 | 含 `x-claude-code-prompt-id`（续轮还有 `x-claude-code-prev-tool-durations`） | 无 |
| x-stainless-os | Linux（容器） | Linux，但正文环境写 win32/PowerShell（客户端来源时） |

分类：**设计未说明**。符合“不改客户端结构”，但与“发往上游的请求与官方客户端一致”的目标冲突；需产品决定是否让 build 在第一方 OAuth 下补齐/去除这些第一方特征（`cch` 的计算方式未知，可能覆盖正文，见第 7 节）。

### D5 API Key 路径：上游请求头被替换为隔离头（direct 也一样）

W1/W3 上游收到的头只有 `Accept, Content-Type, User-Agent: ccgateway-request, anthropic-beta, anthropic-version, x-api-key`，URL 为 `/v1/messages`（无 `?beta=true`）；客户端的 `x-app: cli`、`X-Claude-Code-Session-Id`、`X-Stainless-*`、`anthropic-dangerous-direct-browser-access` 全部不出现。来源：`next/plugins/ccgateway/companions/cli-mods/request-options.js:100`（`apiKeyRequestHeaders`，第 109 行写死 UA）。分类：**符合设计**（README 写明 API Key 隔离头），但 UA 直接自曝网关身份，与官方差异明显。

### D6 `cc_version=worker` 的指纹取错文本

官方算法取“首个非 meta 用户记录的首个文本”（即用户真实提示）；build 重建的记录不带 `isMeta`，于是取到首个文本块（本项目为 CLAUDE.md 提醒）。独立计算：

```text
s01  官方 b77（= 提示块）  首块 643   W2 build-worker 实发 643
s04  官方 b7a              首块 643   实发 643
s15  官方 810              首块 159   实发 159
```

结果是同一项目下任意提示都得到同一后缀，而官方客户端随提示变化。仓库测试 oracle 把这一行为当成预期固化：`cli-mods/test/analysis/billing-fingerprint-oracle.cjs:48`、`cli-mods/test/assembly-replay.cjs:36`（注释 “isMeta is not lifted”），所以既有 75/216 项都不会发现。默认 `cc_version=client` 时不受影响。分类：**缺陷**，置信度高。

### D7 `x-stainless-timeout: 3600`

OAuth 路径上游头 `X-Stainless-Timeout: 3600`，官方客户端为 `600`。原因：Worker 把请求超时（`CCG_TIMEOUT`/`REQUEST_TIMEOUT` 默认 1h）作为 `--timeout-ms` 传给 CLI，见 `next/plugins/ccgateway/companions/engine/request_command.go:318`（本机行号；origin 为 291）。分类：**设计未说明**（为长请求延长超时），但形成稳定指纹。

### D8 其他小差异

- 官方第一方输入经 W2 时，`x-claude-code-prompt-id`、`x-claude-code-prev-tool-durations` 被丢弃（Worker 只转发 `anthropic-version`/`anthropic-beta`，`request_command.go:320`）；direct 下 `oauth-2025-04-20` 被追加在 beta 列表末尾（官方在第 2 位）。
- `shell=worker` 时渲染为 `Shell: unknown`：账号容器未设置 `SHELL`；官方 Linux 客户端会写 `bash`/`zsh`。
- 逐字段选择会产生混合环境：示例中 `Primary working directory: /work` 与客户端的 `Additional working directories: D:/…`、`Is a git repository: true` 并存（符合逐字段设计，但对模型来说环境自相矛盾）。

## 6 发现表

| ID | 级别 | 分类 | 描述 | 位置/锚点 | 置信度 |
|---|---|---|---|---|---|
| L1 | P1 | 缺陷 | build 每请求新 `session_id`（metadata 与 `X-Claude-Code-Session-Id`），同一会话在上游不连续 | D1；生产 0.1.70；v14 `engine/request_identity.go`（未推送）声称修复 | 高（实测 W1/W2/W3） |
| L2 | P1 | 缺陷 | direct 把最终用户 `device_id/session_id/account_uuid:""` 原样送到 OAuth 账号，且与请求头会话 ID 不一致 | D2；`engine/request_command.go` direct 分支只透传正文 | 高 |
| L3 | P1 | 缺陷 | 第一方 build 追加 `diagnostics.previous_message_id`，多轮为伪造 `msg_<uuid>`，官方为真实上游 ID | D3；内层 CLI 原生逻辑，`cli-mods/request-build-2.1.304.js` 未处理 | 高 |
| L4 | P2 | 设计未说明 | 客户端非第一方形态 + 内层第一方 OAuth beta/字段 → 官方不会出现的混合指纹（缺 `cch`/`cc_prompt_id`/1h TTL/`mid-conversation-system-clear-at`/`x-claude-code-prompt-id`） | D4 | 高（形态差异）；影响程度待产品判断 |
| L5 | P2 | 缺陷 | `cc_version=worker` 用首个文本块算指纹，与官方“首个非 meta 用户文本”不同；测试 oracle 固化了该偏差 | D6；`cli-mods/test/analysis/billing-fingerprint-oracle.cjs:48`、`cli-mods/test/assembly-replay.cjs:36` | 高 |
| L6 | P2 | 符合设计 | API Key 路径上游头 `User-Agent: ccgateway-request`，丢失全部 SDK 头与 `?beta=true` | D5；`cli-mods/request-options.js:100-113` | 高 |
| L7 | P2 | 设计未说明 | `x-stainless-timeout: 3600`（官方 600） | D7；`engine/request_command.go:318` | 高 |
| L8 | P3 | 设计未说明 | 丢弃 `x-claude-code-prompt-id`/`prev-tool-durations`；direct 的 oauth beta 顺序不同 | D8；`engine/request_command.go:320` | 高 |
| L9 | P3 | 设计未说明 | 服务端 Shell 渲染为 `unknown`；逐字段替换产生自相矛盾的环境 | D8 | 高 |
| L10 | P3 | 待核实 | Worker 错误响应带内部 `X-CCGateway-Error-Source`，需由核心剥离后再返回客户端（核心侧未在本轮验证） | `companions/contracts/requestfailure/failure.go:7` | 中 |
| OK1 | – | 符合设计 | build 内容保真（system/messages/tools/参数）、direct 逐字节、build-worker 仅改所选字段、响应逐字节、native 退役零发送、无策略头/凭据泄漏 | 第 4 节 | 高 |

## 7 未能验证的范围

- **v14 身份映射（本机 `08035b19c`）与卷配额（`43d576838`）未实测**：未推送，按规则不能经 Git 以外方式上传源码，也不能推送。v14 部署前建议复用本轮方法，重点核对 D1/D2 的头与 metadata 一致性及跨轮稳定性。
- 真实交互式客户端（`cli` 入口、TUI）、Claude 桌面版、子代理、WebSearch、MCP 工具、`count_tokens`：本轮全部为 `-p`/stream-json，UA 都是 `sdk-cli`。
- `thinking: {type:"disabled"}` 形态（会话标题等请求）在 2.1.304 的 `-p` 下没能触发，未测 `thinking_disabled_compat`。
- 真实 Anthropic 是否接受 build 后的混合形态、`cch` 的计算输入（若覆盖正文，build-worker 修改 `cc_version`/环境后保留客户端 `cch` 可能失配）、`previous_message_id` 是否被服务端校验：均无法离线验证。
- 核心 → Worker 段（API Key 分组调度、核心实际下发的完整策略、核心是否剥离 `X-CCGateway-Error-Source`）不在本轮；策略头为手工构造的稀疏形态。
- 本机抓包使用 `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` 并清空了宿主 Claude 会话注入的环境变量，与普通用户默认环境可能有细小差异（首次抓包因继承宿主变量出现 `claude-desktop-3p` 入口，已丢弃重抓）。
- TLS/HTTP2 指纹：假上游只提供 HTTP/1.1，未比较 TLS 握手。
- 第一方对照抓包中官方客户端与 W2 的 `device_id` 相同，是因为官方运行复制了 W2 写过 `userID` 的假配置目录，属测试伪影，不作为结论。

## 8 清理证据

服务器（2026-10-21 清理后执行）：

```text
docker rm -f ccg-audit-worker-1..4          → 已删除；ccg-audit-upstream/official 为 --rm 或已删除
docker network rm ccg-audit-net             → ccg-audit-net
git -C /home/debian/sup2api/src worktree remove --force /home/debian/ccg-audit-20261021/src; worktree prune
rm -rf /home/debian/ccg-audit-20261021      → ls: cannot access … No such file or directory
docker ps -a --filter name=ccg-audit-       → （空）
docker ps -a --filter label=io.sup2api.task=ccg-audit-20261021 → （空）
docker network ls | grep -c ccg-audit       → 0
docker volume ls  | grep -c ccg-audit       → 0
docker images     | grep -c ccg-audit       → 0（未构建任何镜像）
git worktree list | grep -c ccg-audit       → 0；主仓库 HEAD 仍为 004f9df10362bda2d664302304b4587f62570fd0（未改动检出）
生产容器 sup2api-1..4、ccg-controller、三个 ccg-*-app/egress、ccg-shared-egress 运行时长与审核前一致
```

本机：测试项目 `D:\projects\test\ccg-audit-live-20261021`、`%TEMP%\ccg-audit-live\`、客户端写入的 `%TEMP%\claude\D--projects-test-ccg-audit-live-20261021\` 在报告完成后删除；仓库 `git status --short` 仅新增本报告（结果见主控摘要）。
