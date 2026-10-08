# Core .71 后剩余范围窄复核

2026-10-08，只读业务代码；没有真实网络验收或重复昂贵测试。

live_api_smoke.py 脱敏正则独审通过。新增 test_live_api_redaction.py 两个离线测试：task-budgets beta 不误伤，独立 sk-/Bearer 凭据及完整已知 key 仍移除；真实 Probe 搭配内存 HTTP400 的摘要保留 beta、不泄密。0.014s，无网络。

## 当前必须先闭环

Core .71 / Worker .73 已部署且 ABC 隔离链已有完整实现及证据，不能再将 general task_budget 的持久隐藏链概括为“未实现”。真实公开四步尚未完成：第一次旧 Controller .47 缺 features 路由，升级 .48 后第二次失败转为 OAuth identity 载体，仍在模型派发/Reserve 之前；详见 PUBLIC-HELPER-BUDGET-CORE-0.1.71。当前优先完成此修复独审并重新执行正常平台链路，不用隔离测试补写真实成功。

COMPLETION-EVIDENCE-MATRIX 的 F-TASK-BUDGET/O-HISTORY 与 FINAL-FEATURE-CLOSURE 顶部仍是早期快照；PROGRESS 较新，但有多阶段叠加。后续总文档应区分“已实现/已部署/真实验收仍阻断”，保留两次 503 原证据，不把旧表当作新任务清单。

## 接下来最明确的可兼容实现

1. 普通 custom inline 时间线与托管预算组合。现 admitHelperHistory 对 InlineTools 整体拒绝；普通 inline+内部搜索已有身份/可搜目录分离和原位置恢复。可复用它支持非 server/typed/MCP、无签名 compaction 的窄组合；持久段目录摘要须绑定当时实际有效目录，撤销不复活，冷/回退重加 schema 不混淆。不能直接删除 gate，也不能把“尚未接入”称为协议不兼容。
2. 已归属只读 Files 图片/文档引用与托管预算组合。现同函数对 resources 整体拒绝；资源输入已有同 owner/account/issuer、公开到远端 ID 精确路径映射。可按共享 binding 固定账号、重核文件有效期，并将稳定原资源身份纳入恢复证明。先排除 PTC/container/产物登记，避免将一个资源入参小闭环扩大成执行状态合并。

以上是可执行设计方向，尚未新增业务代码或证明组合已可用。普通独立 inline、Files 功能不因此被记为整体缺失。

## 仍需协议证据或独立产品的部分

fallback default 无固定候选授权/价格保证；fallback+compaction 缺可靠每 attempt 模型归属（已有传输探针，不等于可计费）；动态未 pinned MCP 缺确定发现身份。这些不能猜模型/价格/工具身份后放行。跨 issuer diagnostics、持久 Responses ID、Batches 等也不能冒充已有 stateless 转换功能。

本轮不扩大这些范围，不把 provider 资格未验证本身当作缺兼容实现。
