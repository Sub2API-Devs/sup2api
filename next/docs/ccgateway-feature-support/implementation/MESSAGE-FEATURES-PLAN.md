# 复杂消息：媒体、引用与会话内字段

日期：2026-10-08。当前本机 CLI 2.1.292。本文区分原始 CLI 探针、Worker 实现、隔离上游验证与尚未开放的功能；没有真实云推理、生产授权或生产部署结论。

## F-DOCUMENTS / F-IMAGES：本轮实现

保持 API block/source 原形，不把 PDF 提取成 text，不改变 role，不在 Worker 下载 URL。

- document：PDF base64、`text/plain` text、content 字符串或 text/image 数组、URL PDF；保留 title/context/citations.enabled（包括可选 null）。
- image：保留原 base64 能力，增加 HTTP(S) URL。URL 必须绝对地址且不含嵌入凭据。
- tool_result.content：允许 document 与既有 text/image，不泛开放其它未知/执行块。
- **file_id 明确拒绝**：raw CLI 能转发它不等于平台可以安全共享账号的 Files 命名空间。客户端文件映射与账号资源绑定属于 F-FILES；document/image file source 均不得凭猜测 ID 读取账号资源。
- PDF base64 检查编码/媒体类型，PDF 页数、内容合法性及模型限制由上游判断。URL 原样到上游，官方读取限制和错误照原协议处理。

接入文件：新增 `media_blocks.go`；`request.go` 仅文档分支、image source 校验和 tool_result 媒体白名单。未触 max_tokens/thinking 解析。

## F-CITATIONS：发现真实缺口后补齐历史恢复

原始 CLI 的 `--include-partial-messages` 能输出 citations_delta，但其最终/native assistant 文本不保留这些引用，直接 resume 的 wire 历史也丢失。只通过既有 JSON/SSE 输出测试不等于续聊引用正确。本轮探针先按“应保留”断言真实失败，随后固定为明确的**原生能力负例**。

新增 `citation_restore.go`，在 relay 已确认主模型请求、还原 system 后处理：

1. 以本次客户端完整历史为权威，不依赖上一台 Worker 的缓存副本。
2. 按 assistant turn 对齐；只跳过可确认的 CC 内部 ToolSearch 及对应工具结果。客户端自有同名 ToolSearch、混合客户端工具的轮次不能按名字误跳。
3. 比较 assistant 数量、该轮完整 block 结构（除 text.citations 与块级 cache_control）、前置 user 内容、此前 document 顺序。相同文本出现在不同 turn/block/doc index 时仍按原位置处理，不全文搜索绑定。
4. 仅复制缺失的原 citations 数组；原 wire 已有不同引用、文本/块/文档/用户锚点不一致时明确失败。不整体替换 messages、不删内部搜索或环境消息、不伪造引用。
5. `HasMainRequestFeatures` 纳入引用历史，确保该恢复依赖主请求归属；辅助请求不套用引用补丁。

接入文件：新模块及 `outbound_relay.go` 的一处调用。没有修改 native JSONL 内容、没有把引用隐藏写入原生工具输入。与 limits owner 的 max_tokens/warmup 接入分区协作。

当前边界：非 assistant 文本携带 citations 明确拒绝恢复；额外 StructuredOutput 等改变历史 turn 结构、无法严格对齐的组合会失败，尚未声称通用适配。引用相关缓存断点策略没有在这里重写。

## 证据

### 原始 CLI 隔离探针

`message_features_cli_probe_test.go`：

- document text/content/base64 PDF/URL PDF/file_id、image URL 各首轮与 resume，共 12 次本机回环请求；源块保留，CLI 本地 asset fetch 为 0。
- text 文档 citations_delta 在流式事件可见，但原生 resume 中引用位置丢失；测试输出标明 EXPECTED LIMITATION。file_id 探针只证实转发能力，Worker 仍拒绝它。
- clear_at 与 inline effort 两个独立负例，见下节。所有 fixture 与 key 均为合成，本轮没有客户端真实文件内容。

### Worker 完整 HTTP 链路

`media_gateway_cli_compat_test.go`：

- text 文档及引用：新请求 rebuild、续聊 prefix-hit、下一轮 prefix-hit、回退 fork、空 cache 导入 rebuild、SSE citations_delta/message_stop。最后真正发往假上游的历史引用与客户端一致。
- content source、base64 PDF、URL PDF、image URL 经 HTTP/CLI/Mod/relay 保持原块。
- tool_result 内 document 初次导入及引用回复，再续聊 prefix-hit，实际历史保留文档引用。
- 基础 10 请求通过，追加 tool_result 2 请求独立通过；CLI 2.1.292。证据是协议/生命周期正确性，**不是官方 PDF 解析、URL抓取、引用事实准确性或模型资格认证**。

单测：source形状/类型/file_id拒绝，document role、嵌套工具结果；同文不同turn/document的引用恢复、内部搜索保留、文档重排/文本变化/已有冲突/缺失turn/块顺序拒绝。独立 reviewer 新增“客户端原生 ToolSearch 误认内部”红灯，已补 request-aware 判定并通过。

## F-SYSTEM：clear_at / inline output_config.effort，初始探针记录

官方两者是 messages 条目属性，不是文本附件里的字段，也不能挪到顶层后宣称等价：

- `clear_at` 为 `never` / `next_user_message`，需 `mid-conversation-system-clear-at-2026-08-21`。到期的原消息仍须随历史原样回传；本地删除会改变上下文/缓存/签名语义。
- `next_user_message` 仅可配文本，不可混入 output_config、工具增删或块 cache_control。位置规则仍生效。
- messages[].output_config.effort 对应 `mid-conversation-output-config-2026-07-01`；effort 可为 low/medium/high/xhigh/max。effort-only 空 content 条目也有合法形态，不能因为普通 system 附件需要文本就伪造可见文本。

探针：将 clear_at 或 high effort 加到 native system attachment 行、attachment 元数据及 rendered 部分，CLI 保留正文，却不保留该客户端属性；CLI 自带的 medium effort 不是客户端 high 被正确传递的证据。裸 CLI 未加载 Worker Mod 时正文还有 `prompt.submit hook additional context:`，不能把直接调用当前 relay restore 的失败误判为生产 Mod 回归。

建议下一批改动：

1. Message DTO 增加经 beta/role/组合/位置校验的可选字段，指纹包含语义字段；保留 nil、显式 never 与空 output_config 的区别。
2. 扩展 systemGroup 的“原消息”表示，在现有精确位置恢复后复制客户端字段，不能从内层 CLI effort 推断。
3. clear_at 的历史全部保留；渲染/清除语义交给上游。禁止本地删历史来模拟。
4. effort-only 空内容需专门设计无泄漏载体，不能临时往可见 system 增加说明文字。该子项未经验证先拒绝。
5. 同时修旧 system_restore 的 ToolSearch 纯名称判定，与请求级客户端路由区分；引用模块本轮已处理此差异。

以上是初始媒体阶段的结论；下方实施补充已扩展 DTO 与准入，保留此记录说明原生字段不会自动透传。

## F-CONTEXT / F-COMPACTION：后续独立阶段

官方 context_management.edits 包含 clear_tool_uses、clear_thinking、compact。API compaction block 带 content（可 null 表示失败）、encrypted_content、signature、tool_changes，必须完整回传；不等同于让 CLI 自行 `/compact` 或删除 JSONL 前缀。

后续至少需要：主请求 plan 精确适配编辑规则；识别 CLI 自身 compact 与上游 compaction 的作用域；响应/流式 block codec；签名/加密内容与工具增删的完整历史；pause/abort/失败压缩语义；跨 Worker 导入、回退与上下文索引测试。本轮未做 compaction 真实 CLI 探针，保持不支持，不用媒体探针推断 compaction 可行。

## 官方依据（2026-10-08 核对）

- [DocumentBlockParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/document_block_param.py)、[ContentBlockSourceParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/content_block_source_param.py)、[嵌套 source 类型](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/content_block_source_content_param.py)、[ToolResultBlockParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/tool_result_block_param.py)。
- [会话内 system / clear_at / effort](https://platform.claude.com/docs/en/build-with-claude/mid-conversation-system-messages)、[BetaMessageParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_message_param.py)、[system output config](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_system_message_output_config_param.py)。
- [ContextManagementConfig](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_context_management_config_param.py)、[CompactionBlockParam](https://github.com/anthropics/anthropic-sdk-python/blob/main/src/anthropic/types/beta/beta_compaction_block_param.py)。

## F-SYSTEM 实施补充（2026-10-08，本地隔离验证中）

本阶段选择无文本载体方案：Message DTO 保存 clear_at / output_config 原 JSON 元字段并进入历史指纹；有文本 system 沿用原 attachment 与 systemGroup 的完整角色/位置恢复。仅含 effort 的空 content system 不写入 CLI JSONL、不伪造提示词，主请求 nonce + Mod scope 验证之后，使用完整客户端角色/块序列与已知工具映射精确定位，再插回原始消息间隙。CLI 将两个 user 合并时，只允许完整唯一块序列切分；不匹配就拒绝，不按文本片段猜测。

clear_at 的过期由上游解释；下一轮及新 Worker 导入仍携带原始历史，不在本地删除已经过期的指令。next_user_message 不允许 output_config 或缓存断点；API 请求必须提供已准入的对应 beta。effort 同时受现有 AllowEffort 控制。普通 API 认证/容器授权不受影响。

空 directive 的恢复不依赖本地 sidecar，因此完整客户端历史可以跨 cache/import/branch。任何内部 ToolSearch 轮次只按客户端工具归属及 tool_use ID / tool_result 配对识别，不能仅凭名字跳过客户端声明的同名工具。显式客户端 effort 存在时，移除未匹配客户端的 CLI 自带 inline effort，保留它的其它内容/属性；避免 CC 默认 medium 覆盖客户端指定值。

首轮 TestRealCLIInlineMetadataCompatibility：真实 CLI 2.1.292 对隔离假上游，clear_at 文本、effort 文本、effort-only 置首三个形态，各新建、两轮 prefix-hit、回退 fork、新 cache import，共 15 请求 PASS 10.24 秒。继续扩展用户之间/assistant 与 user 之间、重复内容及内部搜索验证。这里只证明协议处理与最终 wire；没有宣称真实提供商模型接受所有 beta 或其实际语义已经验证。

补充回归结果：五种形态共 25 个真实 CLI → 隔离假上游请求通过（18.07 秒），另 12 轮、约 90 KiB 重复用户上下文及重复 assistant 的 effort-only 长历史五流程通过（3.58 秒）。覆盖首条空指令、assistant/user 间空指令、两个 user 之间空指令；三个模式均保持 prefix-hit/fork/rebuild 的预期路径。发现并修复的真实失败：冷导入时 CLI 合并两个独立 user 行会给前一 text 增添换行；现把原 block 序列先写入同一 native user 行，在已验证主请求按完整唯一序列切回客户端原位置。失败记录保留，不把初次失败描述为一直通过。

单测覆盖：缺 beta、AllowEffort、非法组合、历史指纹、重复内容定位、内层 ToolSearch 及客户端同名工具的区别、额外未知 user 拒绝；engine 全单测及 go vet 均通过（其他团队成员仍在并行开发，以上为该次完整检查）。尚未宣称真实上游 beta 行为验证、生产部署或缓存计费收益。

主 agent 随后的独立审查发现，普通 API 请求即使没有会话内元字段，CLI 自带的空 content / output_config.effort=medium 仍可能覆盖 API 顶层 effort。现于已归属主请求、恢复客户端 system 之前清理 CLI 生成的 inline effort；保留其它字段及非空文本，再恢复客户端显式 inline 配置，因此不会删掉真正的 per-turn override。新增未指定 effort / 顶层 high 两种形态各五流程，并联 clear_at / effort-only 回归，20 请求通过（14.84 秒）。辅助请求不进入此处理；count adapter 复用完整主请求适配后再切换官方 count endpoint。

同时防止 systemGroup 将 CLI 合成的缓存断点搬到 clear_at=next_user_message：这种块不能缓存，客户端准入本已拒绝显式组合，现在最终 wire 也删除该处 CLI 合成断点，保留其它合法客户端断点配置。针对最终 wire 增加断言；未将这一静态发现称为已经真实上游复现的失败。
