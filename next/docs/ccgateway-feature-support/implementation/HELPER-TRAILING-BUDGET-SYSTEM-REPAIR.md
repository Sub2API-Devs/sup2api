# Helper 隐藏轮后的原生预算 system

## 真实失败证据

2026-10-08 13:49 UTC，Core .72 / Worker .75 的首次公开普通预算请求返回 502，未重试。Worker 日志 ID 为 `e5f62b84-3dc8-4887-85d5-537314662495`；第一提供商请求真实 200、完整 message_stop，返回内部 ToolSearch。第二轮准备出站时错误为 `helper history cannot discard an unrecorded system inside hidden rounds`，第二次未到提供商。

第一轮真实用量 input 24、output 91、1h cache creation 1647。核心冻结 replacement 已保存，公开 pending/0 不代表没有消耗。CLI 在完整隐藏 assistant/user 之后追加原生 system：`<total_tokens>14998238 tokens left</total_tokens>`，原单 text 块附 ephemeral/1h cache_control。客户端 task_budget.total 为 20000；这两个预算不是同一概念，本修复不计算、替换或删除原生数值。

## 合同与实现

- v2 已能用同一 AfterMessage 下按数组顺序的 `whole_round → system_only → whole_round` 表达，不新增版本，不扩展 v1 合同。
- 核心普通/inline 请求都从实际 Worker payload 能力选最高 1/2，没有仅 inline 协商 v2 的条件。现有 request.body 是解包后的公共请求，不含 envelope，不能据其缺 payload_version 判断线上用了 v1。
- 新 `helper_reminder` 鉴权 Mod 事件只在保留 engine total_tokens_reminder 后发出；与 continuation 去重分开，日志关闭也工作。必须处于活动主轮 lease，文本类型/字段/大小封闭，按本请求已观察到完整提供商响应的轮次索引登记。
- 新尾 system 必须出现在完整 helper A/U 对之后，精确匹配该轮的附件证据；仍由原始提供商块、runner 隐藏确认、完整工具结果账本验证整轮。没有 message_stop、未确认隐藏、错误轮次/内容/额外字段都拒绝。
- 为既有账本创建仅用于验证的 flat 视图；真实出站对象不删除、不挪位。持久分段从原始 suffix 构造，保留 cache_control 和原文本，不把旧 cache 标记复制到新对象。
- 冷恢复先按 anchor 拼接完整段组，再只匹配整组真正前导 system。尾部与前导同文仍是两个不同位置，不能逐 segment 回到同一 public 边界重复去重。

## 作者验证（候选，尚未部署）

- 新独立红例 `TestHelperHistoryReplayTrailingSystemPreservesPosition` 修复前真实失败：`replayed helper system differs at original boundary`；修改后连同旧精确边界否例通过 1.203s。
- 单测覆盖无 ACK、错轮、变文、未知字段、v1、不完整响应、未确认隐藏轮、无 scope/未激活 scope/非法 ACK 字段和类型；通过 1.236s。
- `TestRealCLIHelperHistoryTrailingBudgetSystem` 使用 CLI 2.1.292、隔离 HOME、假上游、gateway 附件策略和上述真实用量数值。首次 JSON/SSE + 外部结果续聊/普通续聊/冷 Worker/回退矩阵通过 27.971s，强制要求生成 system_only 段，不能靠未触发尾附件假绿。
- 最终出站尾 system 完整对象哈希断言增强后，同一真实 CLI 12 次矩阵 22.530s 通过，覆盖保存后的尾对象在续聊、冷导入、回退中的位置和全部字段不变。
- 全 engine 单测 5.815s、go vet 通过；作者冻结交独立审查。git diff --check 无空白错误。

没有新真实模型、身份探针、线上配置更改或部署。

## Core ABC 发现的用量聚合缺口

独立 Core→Worker→真实 CLI→假上游→隔离 PG 的 JSON 矩阵已通过尾 system 冷恢复/回退哈希，但最终账务断言发现隐藏轮 1h 分类 1647 没有进入公共累计 usage。原 `addSearchUsage` 仅累计四个顶层计数；另独审发现多个最终 message_delta 会再次从已聚合 accumulator 取输入计数，导致 input 34 变58、1h1647变3294。

候选现在使用未聚合最终调用 usage 快照，每个 message_start 重置，逐 delta 更新原始累计值后只加一次隐藏轮。快照仅存在内部状态；公共输出只构造明确协议字段。已知缓存桶、server_tool_use 的 web_search/web_fetch/code_execution 请求计数、output_tokens_details.thinking_tokens 分别累加；iterations 按调用顺序保留。未知隐藏用量字段无法等价汇总时明确失败，普通无隐藏轮路径不受此白名单限制。

service_tier/inference_geo 是分类事实而非计数。所有轮报告相同值才可作为整体分类；冲突或已知/未知混合拒绝，保留原 provider_calls 计量证据。null 是未报告，不是错误类型或相同分类证明。官方 SDK Usage 将缓存顶层计数、cache_creation、server_tool_use、output_tokens_details、service_tier、inference_geo 声明为 nullable：<https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/usage.py>。

显式 null 缓存顶层计数不会通过 tokenCount 变成已知0；全 null 保留 null，与其他轮实际非零计数混合时拒绝声称完整总量并保留 partial 事实。缺必填 input/output、错误类型、负值/非整数不造0：完整隐藏轮提交时和最终调用完整快照汇总时验证，不要求每个 delta 都重复输入计数。隐藏轮自身 nested delta 也在专用路径先合并原始 start 快照，再交 accumulator，普通无隐藏轮的 accumulator 不改变。

已知 nested 的逐字段覆盖为扩展健壮性；官方 MessageDeltaUsage 未保证 cache_creation partial patch，不能把该负例描述为官方必需流形态。真实累计 output 多 delta 则已用实际 CLI 覆盖：最终调用先 output1、后 output8，JSON/SSE 公共汇总必须 input44/output99/1h1647，12 次新/续/cold/rollback 增量 23.928s 通过。独立审查新增边界仍在收尾，未发布。

最终 nullable/必填与独审整改后的同一 12 次真实 CLI 目标再次通过 **29.391s**；22.530s/23.928s 是中间阶段证据，不代替最终验证。全 engine（含 fresh 独审文件）**6.118s**、go vet 通过。已知 server 计数、thinking 细分、iterations 调用顺序及重复 delta 不双算目标 **1.480s** 通过。作者重新冻结，等待 Core ABC 单次复跑，不改原始预期。

官方 BetaUsage 另声明 `speed: Optional[Literal["standard", "fast"]]`：<https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/beta/beta_usage.py>。已沿同一非累计分类机制加入 speed 和隐藏字段白名单，没有新增特殊分支。standard/fast一致、全null、已知/未知混合、最终轮冲突、两隐藏轮冲突均有测试；旧代码真实红为 unknown hidden usage，修复后全 engine **5.518s** 与 vet 通过。fallback_credit 组合仍由原准入拒绝，未开放。
