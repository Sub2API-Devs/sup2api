# 初始非空 thinking/signature 的 CLI 传输桥

2026-10-08，未提交/部署候选；只使用本机 Claude 2.1.292 与隔离假上游，没有真实模型调用。作者 audit_code_beta，root 独立读差异。

## 官方合同与原红

[RawContentBlockStartEvent](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/raw_content_block_start_event.py) 的 content_block 包含完整 ThinkingBlock；[ThinkingBlock](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/types/thinking_block.py) 的 thinking/signature 是字符串，signature 应原样回传，没有规定 start 中必须为空。

[Python accumulate_event](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/lib/streaming/_messages.py) 430–436 行保存完整初始块；[TypeScript MessageStream](https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/lib/MessageStream.ts) 578–579 行同样保存。这是合法传输形态的类型与实现证据，不代表本轮真实云端已发过该形态。

独立运行 CC 留存的 TestProbeHelperInitialThinking/json，RED 1.415s：首轮 502，internal cache assistant differs from observed response。原始响应有完整 thinking/signature，CLI 输出丢失，不能为绕过失败删除历史或签名。

## 窄修

新增 initial_thinking_stream.go，复用 sseWatch guard、限额、截断与 ReadCloser 生命周期；在原 source observer 与 MCP 桥之后，仅面向 CLI 重编码 thinking 的非空初始字符串：空 start 加原 thinking_delta/signature_delta，同 index、同原字符串。普通空 start（包括尚无 signature 字段）和非 thinking 块原事件不变；不制造终态，不解释签名，不改变工具目录。原 trace/source observer 仍看到原始事件。

重编码清理 Content-Length/Transfer-Encoding；未解压编码拒绝并记录 relay 错误。仅已归属主请求 SSE 接桥，资源、计数、JSON 桥分支未改。没有泛化 redacted_thinking 或未知块内容。

## 验证

- 原初始块假 CLI 全矩阵转绿：JSON/SSE 的新请求、外部结果续聊、普通续聊、冷 Worker、回退，共 12 个提供商 fixture 调用；TestRealCLIInitialThinkingCarrier PASS 10.987s。原 CC 矩阵文件未修改。
- 单测检查原 source observer 字节不变、最终字段一致、元数据大整数不舍入、中文/TAB、空字段/延后 signature、其他事件原样、非法值拒绝、截断不补成功、HTTP 长度移除。与 MCP bridge/review 定向合跑 1.680s。
- 全 engine（无真实 CLI 环境变量）PASS 5.052s，vet 通过；不能据此称全部真实 CLI 测试已执行。

## 另发现的既存聚合器问题

官方 Python 465–467 及 TS 618–623 的 signature_delta 是替换，response.go 和 contracts/credits/events.go 此前拼接。已报告 root，由其负责聚合器修复与测试。本桥未改这两个文件；本次无后续签名 delta 的矩阵不能证明混合签名序列已验收。

B 运行时 carrier 与计量仍需另行独审；本桥不开放 general task_budget gate。

## 后续增量证据

root 已完成并提交四处签名聚合器替换修复（Worker、credits、legacy codec、strict codec）。独立增量验证：credits 全包 0.295s、codec 全包 1.875s / strict 1.226s 与 vet 通过；非字符串签名拒绝且不篡改旧值单测 1.293s。

TestRealCLIInitialThinkingWithReplacementSignature 的 JSON/SSE 各新请求及续聊共 4 次假上游调用 PASS 4.509s：非空 start 后继续 thinking delta、多次 signature delta，最终和下一轮历史均保留完整 thinking 与最后的原始 signature。首次探针红灯来自测试夹具遗漏 SSE event 行，已修夹具并保留该说明，不作为产品缺陷。CC 独审另复跑 16 次 CLI PASS 13.712s，见 INITIAL-THINKING-INDEPENDENT-REVIEW.md。均非真实提供商推理。
