# 响应与历史关联持久化

日期：2026-10-08。工作区实现，尚未部署。

## 实现

Format 2历史Snapshot增加可选`responses`链，每项包含客户端assistant前缀hash、native anchor、message ID及完整最终客户端响应的RawJSON。这里“完整响应”是经过现有工具名称恢复的客户端可见answer，不是承诺原始上游wire字节一致。CC自身不写JSONL的safeguard_results等envelope也保留在这份独立链里。

链随所选prefix进入Prepared，正常续聊追加本轮响应，回退/分支只继承对应祖先链。没有把envelope字段当messages回放，也不把这些metadata加到namespace而破坏缓存复用。客户端导入的历史若本来没有对应envelope，不伪造过去记录。

RawJSON读写和Prepared继承均深拷贝，避免调用方修改读出结果污染缓存。重启读取校验响应关联hash的顺序、message ID、内容结构与完成状态；错误关联的快照失效，允许从客户端历史重建。旧Format2没有该字段仍正常加载。

持久化使用现有私有cache及原子写入，受24小时、容量和条目上限约束，独立于请求调试日志开关。响应链字节纳入snapshotSize及quota，不创建不受淘汰管理的附加存储。每个前缀重复包含祖先链会增加空间开销，与现有复制JSONL的快照一样可能更早触发淘汰；本批没有宣称消除O(n²)存储。

commit新增完整assistant结构及非refusal/非error检查；不枚举stop_reason白名单，避免把未来合法停止原因误报。生产入口仍只在Runner完整成功后提交，refusal保持现有不提交策略。取消发生在Runner返回与commit之间的边界需要main入口ctx检查，由主任务负责。

## 验证

新测试涵盖响应链跨重启与prefix-hit、分支祖先不夹带未来响应、不同scope不互见、RawJSON不可变、数值精度、envelope不注入JSONL、旧快照兼容、未完成/refusal不提交、错误关联拒绝及容量字节计数。旧历史测试夹具补齐原来省略的assistant id/role/stop_reason，未绕过完整性检查。

`go test ./engine -count=1`全engine测试通过（4.385s）。这是普通测试集，默认跳过需要CCG_REAL_CLI的真实CLI测试，不代表本轮新增持久化已通过真实账号续聊。

既有refusal测试曾因stop_details内部改为RawMessage而失败，已改为编码/解码后比较全部原字段；内容和正常200语义断言保留。

## 当前限制

结构化输出原有commit分支会删除native文件并跳过snapshot，避免把synthetic tool transcript作为客户端文本恢复。本批保留该逻辑，因此结构化输出的完整response尚未通过这条链持久化。若需要，后续应设计不可作为native恢复点的response-only记录，而不是为了存metadata把不等价JSONL标成可恢复。

refusal及失败/未完成请求不建立可恢复快照，调试证据按账号日志开关另行处理。响应envelope保留不表示对应API请求/执行块/费用解释已全面适配。
