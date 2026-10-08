# 持久发现引用与原客户端工具目录

## .77 真实证据

首请求 Core `132411e65e2579f4c43b1baf`、Worker `288782ca-53dc-4cb2-a1ad-72fe7231ac3e` 成功。续聊 Core `f1f2d40c074d58e5d56afab2`、Worker `5db87bca-bdd5-4166-9a41-ec614e77b718` 收到一次真实上游400：`Tool reference 'mcp__ccgateway__lookup_fixture' not found in available tools`。不是本地准备失败，也没有自动重试。

续聊最终wire已经完整恢复隐藏ToolSearch A/U及尾system，外部call/result的ID相同，客户端25B结果原文前缀完整，可信session_context后缀573B、wrapper恰一次。可见.77阶段钩子修复已生效。上游没有报告usage，不能把未知账务描述为提供商已证明零消耗。

真正缺口是新CLI首轮目录只有ToolSearch与DeferredToolPlaceholder，尚未加载过去发现的客户端定义；持久恢复了tool_reference消息，但没有相应定义。首请求第二主轮原本有该完整定义，因此续聊恢复后的API请求自相矛盾，提供商正确拒绝。

## Worker候选方案

不依赖新CLI已经加载。仅对通过既有私有payload、anchor和tool catalog摘要准入的历史引用，从同一envelope的原始工具JSON查表补定义。使用精确wireName映射，保留完整schema、description字段存在性、defer_loading、strict/eager、input_examples、cache等原字段；不凭名字生成默认schema。已有同名schema冲突或重复定义拒绝，原生工具缺失不绕过CLI实际目录检查。

入口在现有applyCompleteToolCatalog：先补缺项，再执行原server/metadata/API目录处理，最后恢复原raw字段存在性。避免严格metadata/大整数路径在末尾补项之前先报缺目录。

inline保持既有原Base+原位置addition/removal整条时间线；旧发现不写当前discovered/Active，不把已撤回或仅历史inline定义提升到顶层，也不以最终新schema覆盖过去定义。无需Core或持久合同变更。

## 验证

- 独立生产路径旧态RED：已capture/admit历史引用，但可用目录定义数为0。
- 严格假提供商现会检查每个普通tool_reference均有当前目录定义，不再无条件返回成功。
- 作者严格目录CLI JSON/SSE、新/工具结果续/普通续/cold/rollback矩阵 **26.130s** 通过。
- 独审 **1.315s** 通过：完整定义、空description/显式false/大整数metadata、幂等、冲突/重复原子拒、inline撤回重加新schema不复活旧状态、native/未知引用/摘要改变边界。
- Core OAuth ABC独立旧态400红和候选矩阵进行中，未部署或真实模型重试。
