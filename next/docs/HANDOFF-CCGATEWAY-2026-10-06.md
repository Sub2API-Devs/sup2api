# CCGateway 会话与 system 适配完整交接

交接日期：2026 年 10 月 6 日，Asia/Shanghai。接收者：接手 sup2api / CCGateway 开发、测试及部署的 AI。

本文记录用户要求、现有实现、真实测试证据、已经上线的版本、未部署修改以及剩余工作。最重要的状态是：**通过 Claude Code Mod 的 `prompt.submit → context` 注入 system 上下文已在真实授权容器中验证；该方案尚未接入业务。手工构建 system attachment 历史并 resume 尚未验证。最新的 1 小时请求超时只修改了代码，尚未部署。**

本文优先于旧交接文档中关于本次工作的状态描述；实际代码、现场服务和本次证据仍需核对。用户已要求把工作交给另一位 AI，本轮仅完成交接，没有继续部署。

## 2026-10-06 下午接手更新（覆盖下文中 system 相关的“未完成”描述）

- 手工构造的 `hook_additional_context` 附件 + resume 已在 cc-max 真实容器验证可用，出站为真正的 `role: "system"`。结果见 [manual-attachment-results.md](handoff-evidence/2026-10-06-ccgateway/manual-attachment-results.md)。
- 业务代码已改为该方案并移除随机标记 + 回环还原（`inline_system.go`、`history.go`、`runner.go`、`mod/hooks/register.js`，回环中继改名 `display_relay.go`，只做 `thinking.display`）。说明见 `tools/ccgateway/README.md`「messages 中的 system」。
- 带 system 的历史现在参与前缀缓存：prefix-hit / fork / rebuild 均覆盖。`output_config`、`clear_at` 等 system 字段改为 400；最后一轮 system 单块 10 万、合计 20 万 UTF-16 字符上限。
- 验证：`go test ./...`、Linux vet；本地 CLI 2.1.288 + 模拟上游的 `TestRealCLI`、`TestSystemMessagesRealCLI`；容器内真实模型 `TestSystemMessagesLiveE2E` 七项通过；next/server `internal/ccgateway`（33 个测试，PG 正常运行，无跳过）与 `remotedocker` 通过；控制器 25 个单元测试在 ccg-controller 容器内通过；前端类型检查与 ccgateway 相关 33 个测试通过。
- 旧方案的 `native_system_resume_probe_test.go`、`inline_system_context_test.go` 已删除（被测代码已不存在，失败结论保留在本文下文）。
- 已提交 `dcfdbfed3` 并部署（2026-10-06 17:30–17:42）：cc-max 从该提交构建 `ccgateway:0.1.53`、`ccg-controller:0.1.45`，经核心 remote-config + runtime/install 更新，账号 21/22 应用容器均已换新镜像（21 仍不可调度）；OVH 核心 0.1.45（manifest `f8972eab…`）主节点优先升级完成，四节点 ready。服务器 `~/sup2api/src` 原有未提交副本已 `git stash`（`pre-dcfdbfed3 server-side copies`）。
- 公网验收（本机 CC 的网关入口，路由到账号 22）：最后一轮 system 不泄露、下一轮 prefix-hit 答对、SSE 答对、工具结果后的 system 答对；错误位置与 `output_config` 均返回 400。
- 发现但未改动：经网关的每个请求都带 Claude Code 的 `session_context` 附件，内含 Claude 账号邮箱，API 客户端可让模型说出它。README 记录过此前决定“不通过 Mod 删除附件”，是否改为删除这一类需用户决定。

## 接手前先读

1. 全程使用中文。理解用户的错别字，例如 frok 是 fork、绘画是会话、stream/steam/astream json 是 stream-json、mods 指 Claude Code Mods。
2. 用户非常在意客户消息的语义、角色和顺序。不能把 system 降成 user、移到顶层、合并改写，或者只因 HTTP 200 就宣称支持成功。Mod 的 system-reminder 包装已经明确告知用户。
3. 区分四件事：模型回答遵循指令、历史记录标记为 system、真实出站消息角色、完整历史的无损恢复。这四者不是同一证据。
4. 用户后来明确要求在 **ssh cc-max 的真实已授权 CC 容器**测试，不再使用本地 CC；无需检查实际出站角色。本次近期实验没有抓取出站请求，依靠结果和历史文件验证。
5. 用户此前授权：完成全部功能后更新部署、自己测试、持续调试；可用子代理并创建 worktree。不要每一步重复索要授权。当前要求是交接，不能把独立实验误当成已完成上线。
6. 用户要求调试日志通过 CCGateway 页面配置，不要环境变量开关，关闭时清理日志并停止保留；超限清理整条记录。不要把这等同于整个 CC 运行环境已经实现供应商意义上的零数据保留。
7. 保护现有工作区：大量修改未提交，不能 git reset / clean / 覆盖。`.mcp.json` 是用户未跟踪文件，不要动。
8. 不写入或输出 API Key、SSH 私钥、OAuth Token、登录配置。会话中的测试 Key 本文不复制。

## 环境和工作状态

- 主仓库：`D:/projects/golang/sup2api`。
- Shell：Windows PowerShell。
- 当前分支：`feat/next-platform`。
- 本次核对 HEAD：`b2fc4d079be36d8b1e8ac48ad412aa736f93b176`。
- 测试工作目录：`D:/projects/test`。
- 当前修改清单：[working-tree-status.txt](handoff-evidence/2026-10-06-ccgateway/working-tree-status.txt)。该清单在新建本文之前生成，不包含本文自身。
- 旧资料：`next/docs/HANDOFF-2026-10-03.md`、`next/docs/MULTINODE-VALIDATION.md`。旧版状态、权限表述不能覆盖本会话更新后的明确授权。
- Goal 工具在交接时返回 **paused**，不是 active，也不是 complete。目标是日志、部署和 system 适配；尚未完成。不要自动标记 complete，也不要未经用户重新启动长期 goal。
- 现有子代理历史：`/root/role_error`、`/root/table_layout` 已完成各自早期任务。前者 worktree 为 `C:/Users/16790/.codex/worktrees/ccgateway-role-error/sup2api`；后者的页面/日志相关变更已应用主区。不要再次盲目重复应用补丁。

工具偏好：先确认目标项目，再使用 CodeGraph / Serena。当前实际有 `mcp__codegraph__codegraph_explore`，已对本仓库调用；返回的源码是当前磁盘内容，但结果可能夹带旧 backend 同名文件，应限定具体路径。Serena 需检查实际可用清单和项目绑定，不能假定存在。缺失时直接用 rg / 精确读写。不要为工具使用而反复检索。

## 服务与部署位置

- `ssh ovh`：`debian@15.204.107.38`。用户 API 地址为 `http://15.204.107.38:3130`。
- `ssh cc-max`：`root@130.94.122.254`。
- cc-max 的账号 22 应用容器：`ccg-dea8fa2ce873f60d0-app`，用于本次真实实验。
- 账号 21 应用容器：`ccg-21-app`。此前用户已有 `schedulable=false`，不要擅自开启调度。
- 交接时现场 `docker ps` 再次确认：两应用均为 **ccgateway:0.1.52**，controller 为 **ccg-controller:0.1.44**，都运行中；两个 egress 镜像 ID 前缀为 `82664cbb4ecc`。
- OVH 核心四节点 **0.1.44** 是前面部署记录中的版本；本轮没有再次核验四节点现场版本。
- 容器内 Claude：`/usr/local/bin/claude`，实际版本 **2.1.288**。
- 容器用户 node，工作路径 `/work`，`CLAUDE_CONFIG_DIR=/work/config`，授权为已登录的 first-party Claude 账号。不要输出身份、邮箱或令牌。
- SDK 检查包：官方 `@anthropic-ai/claude-agent-sdk@0.3.291`，位于 `D:/projects/test/claude-agent-sdk-source-0.3.291/package`。SDK 实测显式指定容器已有 `/usr/local/bin/claude`，因此 SDK 0.3.291 搭配 CLI 2.1.288。
- 曾有 OVH helper `/tmp/ccg-update-app.py VERSION`：从已有配置读取授权、保留完整配置后更新镜像。部署前阅读确认仍适用。只 PUT images 可能丢 SSH 配置，不可这样做。
- 不要在 OVH 跑 `next/deploy/single/deploy.sh`；沿用现有多节点滚动部署方式。本文不提供未经重新核验的一键生产部署命令。

## 用户需求演变与已经完成的功能

### 页面与请求参数支持

用户最初要求“功能支持”分请求头与请求体两部分，随后明确纠正：请求头支持页面只说明 **anthropic-beta**，不是 anthropic-version，也不要列 Authorization、Content-Type、workspace 或网关扩展头来充数。

用户要求：

- 删除 Beta 高级规则和任意动作选择器。每项 Beta 的处理由代码固定，不能让管理员随意选透传就声称适配。
- 白名单外 Beta 只提供“忽略”或“返回错误”。
- 删掉仅“交给 Claude Code 管理”但没有实际适配价值的条目。
- 请求体部分列明已支持的参数。
- 菜单里的粘性会话迁到系统设置。
- 账号列表用更大宽度换较小高度；整个项目表格的操作列固定可见，不能横向滚动隐藏，参考 new-api。

这些页面和固定白名单修改在前面已实现并部署。当前白名单代码有 7 项：

- `interleaved-thinking-2025-05-14`：forward。
- `fine-grained-tool-streaming-2025-05-14`：fine_grained_tools。
- `context-1m-2025-08-07`：forward，并有上下文配置处理。
- `fast-mode-2026-02-01`：fast。
- `advanced-tool-use-2025-11-20`：tool_search。
- `dev-full-thinking-2025-05-14`：forward。
- `model-context-window-exceeded-2025-08-26`：forward。

注意 forward 仅代表对应处理，不能扩张成全部 API 能力都已实现。相关文件：`next/web/src/views/ccgateway/RequestPolicySettings.vue`、`requestPolicy.ts`、`tools/ccgateway/request_policy.go`、核心同名策略文件、`STable.vue`、`AccountsView.vue`、设置与路由文件。

### 完整请求响应调试日志

前面已部署：账号页面开关 → 核心管理接口 → controller → 应用日志开关。

- 完整请求正文、响应正文/SSE、脱敏 headers、元数据；旧 relay 也支持保存出站 request body。
- 关闭持久化 `request-logs.disabled` 标记，停止活动记录并删除日志根目录，不中断正常业务。
- 单条记录累计 64 MiB 超限清除整条；保留期 24 小时，总量约 512 MiB 软限制。
- 0.1.52 真正移除了 `CCG_REQUEST_LOG_ENABLED` 的配置作用和管理接口 env 拒绝逻辑。
- 前面在账号 21 验证：开启后错误请求也有日志；关闭后根目录删除，再请求不创建日志；最后恢复 enabled=true。接手若依赖当前开关，重新只读查询。

相关文件：`tools/ccgateway/request_log.go` / `_test.go`、`auth.go`、`main.go`，核心 `request_logs.go` / `_test.go`，controller `manager.py`，页面 `AccountRuntimes.vue` / `.spec.ts`。

仍需完整核验：所有新增 Mod 传递文件、失败残留、原生历史与调试日志的不同保留规则。不能把关闭调试日志说成删除业务会话缓存。

## 当前业务调用链

核心通过 CCGateway gRPC 插件参与协议处理，再由核心 HTTP transport 经 SSH/HTTP controller 路由到账号应用容器。**容器内 CCGateway 调 CC 是 stdin/stdout stream-json，不是 gRPC。**

一次请求的生命周期：

1. `tools/ccgateway/main.go` 校验请求、工具、策略、会话标识。
2. 会话 key 来自 `X-CCGateway-Session-Scope` 和 `X-CCGateway-Session-ID`。无显式 ID 时 logical 为 auto，并发 busy key 独立生成。
3. 显式同会话已有请求时返回 409；应用默认 4 个并发槽，满时返回 429。
4. 建立请求临时目录，调用 `prepareHistory`。
5. `Runner.run` 每请求启动一个新的 `claude -p` 进程，使用 `--input-format stream-json --output-format stream-json`，加载现有 Mod。
6. 通过 initialize 控制帧发送顶层 system、工具等，再发送 pending user 输入。
7. 处理流式响应、工具控制回调，得到终态后关闭 stdin、排空 stdout、Wait，抓取原生历史。
8. 成功则提交缓存检查点；释放会话占用、并发槽，移除临时请求目录。

容器长期存在，但 CC 进程不是跨多轮常驻。继续会话依靠历史恢复。

关键文件：

- `tools/ccgateway/main.go`：请求生命周期、并发、超时和缓存提交。
- `tools/ccgateway/runner.go`：CC 进程、参数、stream-json 初始化和回调。
- `tools/ccgateway/history.go`：前缀匹配、resume/fork/rebuild、缓存。
- `tools/ccgateway/native.go`：原生记录抓取、工具交接清理。
- `tools/ccgateway/mod/hooks/register.js`：现有工具拦截及轮次控制。
- `next/server/internal/ccgateway/client.go`：模型请求 transport。
- `tools/ccgateway/runtime/manager.py`：账号 controller 转发。

## 工具调用现状

现有 Mod 已做以下处理：

- `tool.call` 拒绝在容器内执行客户工具；真正执行由 API 客户端负责。
- 允许开启时的内部 ToolSearch，最多 3 次；允许 StructuredOutput 校验。
- `turn.step` 阻止无约束续跑，只有受限工具搜索和一次结构化格式续跑可继续。
- `controlReply` 的 `can_use_tool` 同样拒绝客户工具；支持 SDK MCP 虚拟工具协议，关闭不适用的人机交互请求。
- 工具名称存在客户名到 MCP wire name 的映射。应同时核对请求、响应和历史映射，不能破坏 `tool_use_id`。

`captureNative` 在进程退出、原生写入完成后保留本次完整 assistant 响应边界。`cleanToolHandoffs` 清掉本轮网关拒绝客户工具产生的内部 tool_result，并修复 parent 链；并行工具的拒绝结果可能夹在 assistant blocks 之间，因此不能只删尾部。真实客户端下一请求的 tool_result 才是应恢复的结果。

**不等待客户端工具结果一小时。** 返回 tool_use 后本轮应收尾并释放 CC。客户端永远不回就没有下一轮，只有 24 小时历史缓存。下一次调到另一个账号时，只要客户端带完整历史，就能在新账号重建；旧账号无需通知。只有发送孤立 tool_result、依赖服务器补全其余历史的模式，才需要固定账号或跨账号历史服务，当前不能凭空支持。

用户后来要求“超时改成 1h”，上下文中已明确解释为**单次正在执行的请求上限**，不是挂起等客户工具结果一小时。

## 历史延续、补齐与分支

当前 `prepareHistory` 按客户消息累计 fingerprints，查找匹配的 assistant 边界缓存。缓存保存原生 Rows、客户 Hashes、LastUUID、SessionID、NativePath、NativeDigest、Work、PromptEvidence。

- 完全匹配前缀且只有最后一条新增输入、原文件 digest 一致、没有活动写者：`prefix-hit`，直接 resume 原会话。
- 匹配历史但要补更多内容或需要隔离：fork，使用缓存原生前缀并补齐内容。
- 无匹配检查点：rebuild，构建历史 JSONL。
- 工具结果续接有额外恢复锚点和配对处理，不能照普通文本输入简化。
- 目前 `InlineSystems` 非空会禁止上述前缀缓存查找；JSONSchema 也有独立不复用逻辑。这是需要修复的 system 性能/正确性限制，不能误称已经解决。

用户讨论过的例子：

1. 原账号仅有 `abc`，客户端在其他账号聊到 `abcdefghl` 后回来：复用相同的 `abc`，导入已完成历史 `defgh`，仅最后待回答部分 `l` 触发模型。不是把全部新增历史依次发送成 user 输入，否则会重答和重复触发工具。
2. `abcdefg` 改成 `abcdlo`：从可用的相同前缀检查点 fork，保留 `abcd`，舍弃原分支 `efg` 对新分支的影响，再接入 `lo`。
3. 同内容的 system 在不同位置再次出现，可能是用户有意重申，不能按文本 hash 全局去重。

CC 官方提供 `resume`、`resumeSessionAt`、`forkSession`；当前 Runner 已使用 CLI `--resume`、`--resume-session-at`、`--fork-session`、`--session-id`。SDK 中 resumeSessionAt 是消息 UUID。当前网关选 assistant 检查点，不要假定任意 attachment UUID 都可作为安全锚点。分支前 system 要保留，分支后旧 system 不得泄漏；工具调用和结果不能被截断成无效配对。

缓存目前 24 小时、最多 1024 个索引项，并受字节限制。原生抓取文件限制 64 MiB、单 JSONL 行限制 32 MiB。手工导入长历史和大输出仍需核验整个累计内存上限，不能认为已有单文件限制就足够。

## system 适配的旧方案与明确禁区

用户最初错误：`400 messages[1].role: unsupported role "system"; expected user or assistant`，以及后续 502 upstream_error、503 no_account。不要把这些统一归因于同一问题。

早期业务实现位于 `inline_system.go`：保存 system 索引/原始内容，CC 输入和导入历史中用随机文本 marker 作为载体，在 loopback HTTP relay 中恢复真正 system。因额外 CC 附加上下文，曾尝试移动/合并末尾辅助 user 消息。

**用户明确拒绝改变消息顺序或内容。0.1.52 已移除 `moveTrailingAuxiliaryContext`、`trailingTextSystemMarker` 相关逻辑。绝不能再悄悄恢复这种做法。**

当前业务仍有 marker + HTTP relay，并非最新 Mod 注入方案。relay 还承载 thinking.display 等兼容处理；替换 system 路径时要分析这类独立用途，不能粗暴整文件删除。

## 官方文档与源码结论

已实际检索、阅读官方文档和 npm 发布包，不只是凭经验回答。

- [Agent SDK 流式输入](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode)：`AsyncIterable<SDKUserMessage>`，输入为 `type:user`，message 是对象，content 可以是文本/内容块数组。message 不是完整历史数组。
- [TypeScript reference](https://code.claude.com/docs/en/agent-sdk/typescript)：`systemPrompt` 为初始化配置；`forkSession` 和 `resumeSessionAt` 支持分支。网页版超大，曾通过 shell 下载 `.md` 到本地 `typescript-reference.txt` 核对。
- [会话中途更新指令](https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts#update-claudes-instructions-mid-session)：推荐 `UserPromptSubmit` / `PostToolUse` 的 additionalContext。
- [查看实际上下文](https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts#see-what-claude-received)：reminder 在不同模型上可渲染为 user 中 system-reminder 或独立 system；SDK 输出事件本身不等于实际模型输入。
- 顶层 systemPrompt 默认可被首轮快照固定；`snapshot:false` 用于恢复时刷新顶层提示词，不等同于中途原位置插入 system。
- [Messages API 中途 system](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages)：直接 API 能力，不能套用成 CC stdin 接口。具体模型与位置限制以当前官方页为准。
- [Mods 概览](https://code.claude.com/docs/en/plugins/mods/overview)：Mod 在 CC 进程内运行，支持 `claude -p` 和 Agent SDK；终端 2.1.287 起默认启用。当前 2.1.288 实测成功。
- [Mod 添加上下文](https://code.claude.com/docs/en/plugins/mods/events#rewrite-or-add-to-a-prompt)：`next({...e,context:[...(e.context??[]),extraText]})` 保留 e.text，在提示词后增加上下文。
- [Mods reference](https://code.claude.com/docs/en/plugins/mods/reference)：`prompt.submit`、`prompt.attachment`、`session.append` 等。不能根据事件名字发明任意 role 写入能力。
- [官方 workshop](https://github.com/anthropics/agent-sdk-workshop/blob/main/01-guided-demo/GUIDE.md#stage-3--memory--context)：完整 additionalContext 示例。
- [Issue 1120](https://github.com/anthropics/claude-agent-sdk-python/issues/1120)：特定版本 SessionStart additionalContext 变成尾部 system 的用户复现，不是普遍接口保证。

SDK 0.3.291 源码证据：

- `sdk.d.ts` 约 6230 行 SDKUserMessage 注释明确 role=user。
- 约 4495 行 initialize 中 `systemPrompt`、`appendSystemPrompt`、`systemPromptSnapshot`。
- `sdk.mjs` 的 streamInput 将输入逐行序列化写 transport，未见把 message[] 自动展开为历史的逻辑；该版本未找到公开 setSystemPrompt。
- `verbatimPrompts:true` 对用户帧添加 `client_composed:true`，避免 @path 展开和 slash 命令执行；当前实现还跳过 turn-start 的一批自动 attachment。这个功能不提供 system 入口，且可能与 Mod/Hook 注入阶段相互影响，组合行为未测，不能盲目启用。
- `SDKSystemMessage type:system subtype:init` 是输出初始化事件，不是可发送的系统提示词。
- Managed Agents 的 `system.message` 属于另一个云产品，不是本地 CC Agent SDK。

## 真实测试结果与可复用证据

下列近期证据已复制到仓库 `next/docs/handoff-evidence/2026-10-06-ccgateway/`，便于交给其他 AI。脚本不含实际凭据，但会继承已授权容器环境；不要在不确认目标时执行。

### SDK additionalContext 测试成功

脚本：[additional-context-probe.mjs](handoff-evidence/2026-10-06-ccgateway/additional-context-probe.mjs)。结果：[additional-context-summary.json](handoff-evidence/2026-10-06-ccgateway/additional-context-summary.json)。历史摘录：[hook-history-extract.json](handoff-evidence/2026-10-06-ccgateway/hook-history-extract.json)。

使用 SDK 0.3.291、CLI 2.1.288、claude-opus-5-5，用户每轮询问当前配置，指令仅由 Hook 注入：

1. 初始顶层配置 Ruby、无校验码：返回 Ruby / UNKNOWN。
2. 第二轮 Hook 注入 Java 和 `MAPLE_f1b62262c1`：准确返回。
3. 第三轮不注入：仍准确返回 Java 和该码。
4. 第四轮 Hook 更新 Python 和 `CEDAR_86e5ea71ef`：准确返回。
5. 第五轮不注入：保持 Python 和新码。
6. 关闭进程，resume，取消 Hook：仍返回 Python 和新码。

远端目录 `/work/additional-context-probe-gg8pIz`；会话 ID `25964bbe-15c3-44fe-b668-be498e785f87`；原生历史 `/work/config/projects/-work-additional-context-probe-gg8pIz/25964bbe-15c3-44fe-b668-be498e785f87.jsonl`。

历史第 19 / 31 行为独立 `attachment.type=hook_additional_context`，content 保存原始注入文本，`renderedRole=system`，rendered 带 `<system-reminder>` 和 `UserPromptSubmit hook additional context:`。UUID/parentUuid 接入当轮 user 与 assistant 之间的链，周围还存在 CC 自带 attachment。

证据边界：第 6 轮也可能从前面的 assistant 回复中记住配置；历史中确实保存了 attachment，但未进行删除 prior answer、长会话压缩或出站角色抓取。不能把本实验扩大为严格 system 权限证明或任意长度恢复保证。

### Mod context 注入测试成功

脚本：[mod-context-probe.cjs](handoff-evidence/2026-10-06-ccgateway/mod-context-probe.cjs)。结果：[mod-context-summary.json](handoff-evidence/2026-10-06-ccgateway/mod-context-summary.json)。

临时 plugin 只对测试进程用 `--plugin-dir` 加载，没有全局安装，也没有修改业务 Mod：

```js
export function register(on) {
  on('prompt.submit', async ($, e, next) => next({
    ...e,
    context: [...(e.context ?? []), 'Application configuration: ...']
  }));
}
```

真实返回 Java 和随机码 `BIRCH_2a2adb1044e2`，成功退出。会话历史第 7 行：

```json
{
  "type": "attachment",
  "attachment": {
    "type": "hook_additional_context",
    "content": ["Application configuration: ..."],
    "hookName": "prompt.submit",
    "hookEvent": "UserPromptSubmit"
  },
  "renderedRole": "system"
}
```

rendered 仍包含 `<system-reminder>` 和 `prompt.submit hook additional context:` 包装。原始客户正文未改，但整体模型可见文本有 CC 包装，不能叫逐字透明透传。

远端 `/work/mod-context-probe-macWR1`，会话 `6f84e32a-303d-4786-8869-6f40c4f03dcb`，原生历史 `/work/config/projects/-work-mod-context-probe-macWR1/6f84e32a-303d-4786-8869-6f40c4f03dcb.jsonl`。

这只验证了一轮 Mod 注入；Mod 多轮一次性消费、resume、工具结果输入、并发、长历史还未验证。SDK Hook 的六轮结果不能直接冒充 Mod 全套结果。

### 直接发送 attachment 失败

脚本：[direct-attachment-probe.cjs](handoff-evidence/2026-10-06-ccgateway/direct-attachment-probe.cjs)。结果：[direct-attachment-results.json](handoff-evidence/2026-10-06-ccgateway/direct-attachment-results.json)。

不注册 Hook，拿真实历史 attachment 模板替换 session/uuid/随机码后，测试：

- attachment 独立帧在 user 前：UNKNOWN。
- attachment 独立帧在 user 后：UNKNOWN。
- user 对象附 `attachments:[attachment]`：UNKNOWN。
- 对照组普通 user 携带随机码：准确返回。

三种失败方式进程均 exit 0、无 stderr，但对应已存在的历史文件均没有该随机码，说明不能以“不报错”判定接收成功。远端 `/work/direct-attachment-probe-oPxeBs`。历史文件路径存在已单独确认。

脚本依赖 `/tmp/ccg-hook-history-extract.json` 作为模板；接手机器不同应显式准备该合成测试摘录，不要假定存在。该路径是容器内路径。

### 之前的 stream-json 变体测试

独立脚本仍在 `D:/projects/test/ccgateway-container-stream-system.cjs`，近期针对真实 cc-max 容器做过：

- 外层 type=user，message.role=system：exit 1，`Expected message role 'user', got 'system'`。
- 外层 type=system，message.role=system：没有达到注入效果，UNKNOWN。
- 外层 type=api_system：UNKNOWN。
- 直接裸 `{role:'system',content:'后续示例使用 Java。'}`：UNKNOWN。
- message:[system,user] 或 message:[user,system]：exit 1，`Expected message role 'user', got 'undefined'`。
- 普通 user 对照成功。

这些都在同一 CC 进程先 READY，再发候选内容后追问。没有抓出站角色。相关旧产物：`D:/projects/test/cc-max-stream-system-results-20261006/results.json`、`ccg-raw-system-summary.json`、`ccg-raw-system-input.jsonl`。

### 更早的本地和 API 测试

不要与上面的真实容器测试混淆：

- 原生 HTTP `/v1/messages` 实验绕过 CC，不能证明 CC 输入支持。自然语言 Java 中途/长历史有成功，随机冲突和部分更新有失败/拒绝；output budget 被 thinking 消耗也出现过。
- 本地 CLI 真实模型测试：JSONL 的 type=api_system / type=system 注入未见目标码；type=user 配 message.role=system 虽看到码，但曾证实转为 user，不能算 system。
- 顶层 `--append-system-prompt` 对照有效，不等同于中途插入。
- 真实 CLI + mock 上游诊断：2.1.288 和隔离 2.1.291 多种原生 system 记录、长历史恢复失败。不要把 mock 测试说成真实服务调用。
- 诊断测试 `tools/ccgateway/native_system_resume_probe_test.go` 用 `CCG_REAL_CLI` 等显式条件启用，针对已知不支持路径可能故意失败。不要删除失败证据或声称全部真实测试绿色。
- 本地旧客户端 2.1.288，隔离安装 2.1.291 在 `C:/Users/16790/AppData/Local/Temp/ccgateway-cli-2.1.291/...`，未替换原有本地安装。

## system 一次性注入的设计要求

以下是与用户讨论确定的实现方向，**尚未全部写入业务代码**：

1. 历史中已提交的 system 按原位置恢复为 attachment；本轮待回答部分的新 system 通过 Mod 注入。二者互斥。
2. 使用客户消息位置及历史前缀身份定位，建立与 CC 原生 UUID 的映射。不能只用文本去重，同内容在不同位置可有独立语义。
3. 完整历史重发时仅处理新增部分；重复工具内部 step 不重复触发 system。
4. Mod 本轮消费一次待注入队列，立即释放引用。不要把全部历史存在模块全局数组。
5. 重试要区分尚未提交、已写历史、回答完成。已落盘不盲目重注；状态不明必须恢复核对。不能简单以 HTTP 失败判断“未消费”。
6. fork 只继承分支点之前的已注入状态，不能带入被丢弃分支的 system。
7. 换账号重建时，新的 CC 会话需要恢复旧 system；这不是重复注入同一个原生会话。但不能又把它作为本轮新增 context 追加。
8. 多条 system、不同角色之间的位置以及工具结果后的 system 均需验证；不能为符合 CC 接口任意移动、降级或合并客户内容。

待验证的关键路径：**手工构造与 CC 实际生成一致的 attachment，正确连接 parentUuid 和渲染字段，再 resume。** 之前 api_system/type:system 的失败并没有覆盖这个新格式。真实 Hook 生成的 attachment 能保存，不代表手工伪造记录已经验证成功。

## 内存、进程与超时讨论

用户担心重复 Mod 工具调用、system 注入导致内存溢出或卡死。要求不是无限常驻等待，应该：

- 请求体、system 总量、工具参数、单行 stream-json、累计输出、历史文件都有上限；超限明确报错，不能静默截断。
- 内部工具循环有次数和耗时上限；客户工具返回后结束本轮。
- 模块只存本轮待处理数据，按轮释放；历史保存在受限缓存中。
- 客户端取消、总超时、Mod 未就绪、stdout 阻塞都要能结束任务，释放并发槽/会话占用。
- 不持有全局锁等待网络、CC 或长时间文件操作。
- 容器资源限制作为最后兜底；进程树和继承输出管道的退出需要故障测试。

当前 `runner.go` 终态关闭 stdin 后 `io.Copy(io.Discard, stdout)` 再 `cmd.Wait()`；context 可终止主进程，但不能据此保证任意子进程继承管道都能及时退出。**强制退出宽限、进程树清理和严格最终释放保证仍未完成核验。**

### 最新用户要求与未部署修改

用户要求“超时改成1h”。刚做的磁盘修改：

1. `tools/ccgateway/main.go`：`CCG_TIMEOUT` 默认从 `3m` 改成 `1h`。
2. `next/server/internal/ccgateway/client.go`：模型请求 context 从 4 分钟改为 **61 分钟**，给应用 1 小时 deadline 的终态响应留余量。
3. `tools/ccgateway/runtime/manager.py`：仅 `v1/messages` 的 relay read/socket timeout 改为 **3660 秒**；连接超时仍 5 秒，管理接口仍 240 秒。

这涉及 app、controller、核心三处，**全部尚未部署**。现场 app0.1.52/controller0.1.44 不含这次修改。之前查询应用容器未设置 CCG_TIMEOUT，所以旧镜像仍走默认 3 分钟。

用户“不要环境变量”的明确要求原本针对日志开关。这次未新增环境变量，只改现有默认值；若希望超时也页面化，需继续按产品要求设计，不要擅自扩大本次范围。

待继续检查：上层 gateway execute、请求上下文、代理或负载均衡是否还有更短的响应/整体 deadline。SSH transport 本身没有独立 HTTP header/body timeout，只有连接握手限制。`platformTimeout()` 出现在准备/平台 RPC 路径，不能仅凭名称全部改成一小时。

差异快照：[timeout-related-working-diff.txt](handoff-evidence/2026-10-06-ccgateway/timeout-related-working-diff.txt)。注意它包含同文件其他尚未提交变更，不是纯超时补丁，不能不审查就应用到另一份工作区。

## 验证状态

最近已运行：

- `cd tools/ccgateway; go test ./...`：通过，约 5.4 秒测试时间。默认未启用 opt-in 真实 CLI 诊断。
- `cd next/server; go test ./internal/ccgateway ./internal/remotedocker`：**整体失败**。remotedocker 通过；ccgateway 的 DB 测试被本机 embedded PostgreSQL 16.9.0 无法启动阻断，错误包括 `data/global/pg_control` 不存在、pg_ctl 启动失败。不是业务断言通过，也不能记作代码回归已确认。
- controller Python 测试：本次 1h 修改后未执行；manager.py 使用 fcntl，需要 Linux 环境或现有隔离 CI，不应在 Windows 假称通过。
- Mod/Hook/direct attachment 的真实结果见上面证据，全部使用合成输入。

修复测试环境应使用已有隔离 PostgreSQL 或 TEST_DATABASE_URL；不要删除/重建用户的整个本地 DB 目录。`SUB2API_TESTPG=off` 可跳过 DB 测试，但必须报告跳过，不能替代完整验证。

## 建议接手顺序

1. 先阅读本文、git diff、证据脚本，确认当前未提交工作和服务版本；不要重复回退已被用户否决的方案。
2. 补做手工 attachment + resume 的短历史真实试验。随机码只放 attachment，设计问题避免之前 assistant 已泄露答案造成误判；检查历史链和模型行为，不未经用户要求抓实际出站。
3. 验证 Mod 多轮一次性注入、恢复、工具结果轮次，以及与现有工具拦截 Mod 的兼容；需要动态上下文传递，不要硬编码测试文案进产品。
4. 重构客户历史前缀与原生记录映射，覆盖完整导入、增量多消息、旧节点 fork、账号切换重建；去重状态随分支而不是按内容全局共享。
5. 替换 inline-system 旧 marker/relay 路径，保留与 system 无关的其他兼容职责。明确包装差异，不冒充逐字原样转发。
6. 补内存和退出边界，验证连续工具调用不会累积 Mod 数据、请求取消后资源及时释放。
7. 完成 1h 修改的全链路验证和必要测试。不要把连接超时、管理请求超时也无差别拉长。
8. 在已有授权范围内构建版本、部署 app/controller/core，滚动验证，保留回退能力。更新前核对账号21禁调度状态、既有授权和代理配置。
9. 用用户提供地址及安全来源的测试 Key 调用 `claude-opus-5-5`。不要把 Key 写进测试文件、命令输出或文档。确认真实请求、工具往返、历史分支和 system 后，再向用户报告完成。

### 最小验收场景

- 普通 user 单轮与连续 resume。
- 一次性导入完整历史；旧账号缺少多轮后补齐。
- abcdefg → abcdlo 分支，丢弃分支的 system 不出现。
- 同一历史反复发送不重复 system；同文本不同位置应分别保留。
- 多条连续 system、当前轮末尾 system、历史中间 system。
- 一个和多个并行 tool_use，真实 tool_result 续接；结果带 is_error、文本/图片；工具结果后附 system。
- 工具返回后客户端永不回复：进程和并发槽释放。
- 工具结果到其他账号：根据完整历史重建，不重新执行历史工具。
- 请求断开、超时、结果已落盘但响应失败、重复重试、并发分支。
- 长会话与容量边界；当前业务禁自动 compact，若改变必须单独验证 system 保留。
- 调试日志开启/关闭/超限/重启持久化；关闭后新日志和遗留内容不再保留。
- 1 小时应用 deadline 不被 controller/core 的 4 分钟旧值抢先取消。

## 交接完成的边界

本文和合成测试证据保存在仓库，便于新 AI 直接读取。未提交、未推送、未部署这次交接或 1h 修改。没有新增业务功能实现来代替尚未完成的 system 历史适配。下一位 AI 应从“已验证的 Mod 注入 + 待验证的历史恢复”继续，而不是从零重做所有 JSON 变体。
