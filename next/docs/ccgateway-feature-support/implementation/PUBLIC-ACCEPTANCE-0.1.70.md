# Worker 0.1.70 公开验收：保留失败与资格边界

线上精确源码 `e463222dce5353b5e0bb6e95265bf9886efc0930`，核心 0.1.69、Worker 0.1.70、catalog .13。核心、默认未来镜像和控制器全部稳定后，使用用户授权的平台 API Key；不使用私有路由头，不改账号或安全配置。

## 已完成但当前未声明的工具历史

`evidence/public-completed-history-0.1.70.json`：一次请求 HTTP 200、原生 `refusal`、content=[]，5.707 秒。内容标记任务未完成，脚本未发送第二轮，不能称续聊验收成功。

独立 Worker 日志：#22 `c9db762e-74ab-4313-b2ad-00e72ccd2223`，08:31:59.258 UTC。仅一次上游调用，原始 SSE 同样 refusal 并真实 message_stop。两组 tool_use/tool_result 的名称、ID、输入、结果整体 canonical hash 与客户端一致；retired_fixture/bash 均未被重命名。客户端及上游工具目录均为空，没有新工具调用或 Mod 执行。这里证明历史转发和正常拒绝透传，不证明提供商完成构造历史中的任务。

## Sonnet 人工构造 pending server 历史

`evidence/public-sonnet-pending-server-0.1.70.json`：唯一请求 HTTP 502，5.467 秒；明确是 unsigned 人工 fixture，不是捕获的真实 provider pause_turn，不截断真实响应或重复调用诱导 pause。

独立 Worker 日志：#22 `c09e1a33-890b-43e0-bd79-a5608b8492be`，08:33:59.175 UTC。具体错误 `continuation transport input changed`，主请求适配失败，零提供商生成交换。bootstrap 已保留首 user 的 Auto Mode 安全附件；最后人工 continuation marker 又收到线上策略保留的 87 字节 total_tokens_reminder。现有 guard 正确拒绝静默删除/改变 assistant-tail 语义。

这是已证实的附件策略组合缺口，不是提供商资格 400。旧隔离测试过滤此类附件而遗漏线上组合，不能以其通过掩盖失败。已另开 SONNET-ATTACHMENT-CONTINUATION-REPAIR 修复与独审；本次没有重试或变更线上配置。

## 生成控制验收

旧 `evidence/public-generation-controls-0.1.70.json` 保留：max_tokens=0、thinking disabled 返回HTTP400/invalid_request_error，脚本停止。#22 e4c0c349-6e39-4e4d-a3fb-2ec2deab5f7d的唯一原始上游响应明确该模型不支持thinking.type.disabled；最终max0/streamfalse/disabled原样，不能据此判断max0资格。未改写旧失败。

root移除不受模型支持的thinking字段，另存 `evidence/public-generation-controls-0.1.70-model-defaults.json`，三项均HTTP200。独立复核仅读取既有Worker日志，未发请求、未改配置：

- max_tokens=0：#22 e51401f6-12de-4e7c-a2c2-40cefc0a004d，最终上游max0、streamfalse、thinking字段缺省。仅1次上游响应；对外完整JSON与提供商原JSON语义相等，content空、output_tokens0、stop_reason=max_tokens，原message ID哈希770ee830850fee55a0bba04c20381ba92724fedee7d11aad389804321bfa92d6。history-prepared assistant行0、没有history-native文件，事件明确history_commit_skipped reason=cache_warmup（08:40:10.889Z），没有虚构assistant checkpoint。
- max_tokens=1：#22 d819f3a9-8e5a-48e0-9f72-4c0ef248aacf，最终上游max1、streamtrue、thinking缺省，1次上游响应。原返回1个text块、output_tokens1、max_tokens终态，cache_read_input_tokens556。
- SSE停止词：#22 5ca8ab7c-90f9-4a5b-9a8a-23cdb4f09309，最终max128、streamtrue、stop_sequences原数组[STOP_FIXTURE_6318]，1次上游响应。对外stop_reason=stop_sequence、stop_sequence精确匹配原值，且恰1个message_stop，output_tokens26。

这些证明本账号/模型实际接受模型缺省thinking下的0/1token限制与停止词，并保真桥接。max0仍有真实input/cache_creation用量；后续cache_read556是提供商实际报告，不能外推零成本预热或通用计费收益。公开 RID 到核心 usage 的精确关联已补核如下；核心到 Worker 仍为参数、终态与时间关联，未将时间相邻冒充跨层 ID 证明。

所有 evidence 只保存状态、用量与散列，不保存 API Key 或原始用户会话。后续本地候选不计入上述线上版本能力。

## 六条请求的独立关联核验

只读 OVH 平台 `usage_logs`，以公开证据的完整 request_id SHA-256 匹配核心 request_id；六条均精确命中账号 #22、attempts=1，client_request_id 为空。以下时间均为核心请求创建 UTC 时间，Worker 日志时间通常较晚、代表处理事件或结束。

- 新 max0：SHA `619ef1de6a7bd9909466cb2e826508c5a06933e646d0d98a46f3e9048edf600c` → 核心 `07d795123dacc6c7183162cd`，08:40:06.990379，200/success，input2/output0；参数与终态对应 Worker `e51401f6-12de-4e7c-a2c2-40cefc0a004d`。
- max1：SHA `a1c8d6f4aab0096c20c6ed5686dba2369dcf117b7263b78cf953697ff219dfe4` → 核心 `2785936f5b93f308c37d5728`，08:40:11.458605，200/success，input2/output1；对应 Worker `d819f3a9-8e5a-48e0-9f72-4c0ef248aacf`。
- SSE stop：SHA `fe62774be6ef2d3e39492b134d4d24360fe413bbec07dff0d9952f4a47ab1dd5` → 核心 `390885f142c2d49dc93f3db2`，08:40:16.809224，200/success，input2/output26；对应 Worker `5ca8ab7c-90f9-4a5b-9a8a-23cdb4f09309`。
- 旧 disabled 400：SHA `d66cca74ff6d9261c8d3811f550d16d91b0a15184d45aff638d5a8b7e5541405` → 核心 `1c4180893a24118e8c26f195`，08:37:11.611809，400/failed，input0/output0；对应 Worker `e4c0c349-6e39-4e4d-a3fb-2ec2deab5f7d`。
- 完成历史 refusal：SHA `145f75dcb2f546e00dd1cc6107ad5942998c57454ae94abfc0f357a6764d7743` → 核心 `dc2b0ffcce2855691ed0795f`，08:31:54.100804，200/success，input2/output0；对应 Worker `c9db762e-74ab-4313-b2ad-00e72ccd2223`。核心将正常拒绝记为协议成功，与内容任务未完成不冲突。
- Sonnet 502：SHA `d7d78b3655ee3f3365ddad3e8f943bbad3ef4e223beabe4c9127c9404afd7f5a` → 核心 `8d031b147adf68ae66386bf1`，08:33:54.250695，502/failed，input0/output0；对应 Worker `c09e1a33-890b-43e0-bd79-a5608b8492be`。

关联强度限制：公开证据 → 核心 RID 是哈希精确证明；核心 RID → 上述 Worker 目录尚没有稳定跨层 ID 证明。核查了六条核心 usage 的 plugin/hook/scheduling 详情、四个核心实例 08:30–08:42 的对应 RID 日志，以及六个 Worker 目录共 29 个 metadata/header/event 文件，未找到连接两层的相同 ID。Worker 对应依赖先前已核的唯一参数、状态/终态、用量和时间顺序；不能把此关联升级为 ID 等价。核心 attempts=1 是调度尝试计数，实际提供商交换次数另由 Worker 上游文件核实：五条各一次，Sonnet 适配失败为零。

附带观察：四条成功请求核心日志报告 `inference_geo=not_available` 不在已声明 `[global, us]` 枚举，因而没有记录该 fact。此告警未改变 API 状态；其账务影响另行窄评估，不能把该值替换为 global/us 或声称已证明地域驻留。本次没有模型调用、凭据输出或运行态修改，旧失败证据原样保留。
