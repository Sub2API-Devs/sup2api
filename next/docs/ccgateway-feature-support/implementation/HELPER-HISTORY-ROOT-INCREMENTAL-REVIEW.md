# Root 增量独审

2026-10-08，未部署候选。范围为A增量Lookup/outbox延后、C响应边界和SSE未终态重试门禁，不代表ABC全链已完成。

## 实际隔离数据库

root重新读取实现后运行四例，全部非skip，169.465s通过：

- namespace前置Lookup隔离owner、完整链、跨namespace歧义、顺序及缺失边界。
- 过期/损坏仍属于已知不可恢复，不降成未知以便重新选号。
- 前64条损坏记录延后而不删除，第65条正常记录可被消费；推进时间仍可重试、错摘要ACK拒绝。
- root新增冷Service恢复延后状态、取消不改密文/计数、到期仍返回原冻结bytes/digest。

使用OVH既有隔离PG45432，经本地45440隐藏SSH隧道。凭据仅进程内存，go测试创建独立数据库；finally关闭指定隧道并恢复环境变量。没有使用生产数据库或修理本机损坏PG。

## 核心响应边界

公开响应→下一请求prefix独立测试2.663s通过，包含不透明签名、超大整数、小数词法及工具结果边界。

合法private envelope的headers=null独立测试先红：Header.Clone返回nil后Set导致panic（2.989s）。root初始化空map后，HelperCustody/ReviewHelper定向组3.060s与vet通过。该修复尚未提交。

## SSE门禁

作者在未见真实message_stop的EOF/读错误交给CLI之前同步关闭再次派发；仅已认证custody或原PassUpstreamErrors配置启用。root独立测试同次Read返回数据+EOF/UnexpectedEOF、正文伪装终态、CRLF；原始字节和错误保留，确定性同步派发门禁组1.205s通过。完整tool_use终态仍允许后续正常helper轮。

这些确定性证据支持修复此前部分计量测试偶发额外提供商调用的窗口；仍须ABC真实CLI整链复验。未通过概率重跑掩盖原失败，不制造message_stop，不把已知部分用量说成零或完整用量。
