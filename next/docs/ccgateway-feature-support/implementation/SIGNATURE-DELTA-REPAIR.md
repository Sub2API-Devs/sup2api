# 不透明签名增量的替换语义

2026-10-08。作者 root，独审 audit_code_beta。源码检查点，不代表上线。

官方 [Python SDK](https://raw.githubusercontent.com/anthropics/anthropic-sdk-python/main/src/anthropic/lib/streaming/_messages.py) `accumulate_event` 和 [TypeScript SDK](https://raw.githubusercontent.com/anthropics/anthropic-sdk-typescript/main/src/lib/MessageStream.ts) 的 `signature_delta` 用新值替换旧签名。思考正文仍按增量拼接，签名是不透明值。

发现四处旧实现错误拼接：Worker Accumulator、共享信用响应重建、普通 Anthropic→Responses 转换、strict 转换。已改为替换，Worker 同时拒绝非字符串签名。初始签名加多次增量、空最终签名均覆盖；不修改 thinking 正文。

四处新增回归先红，分别观测 initialfirst / initialfirstfinal。修复后 root 完整 engine 5.353s、credits 1.196s、codec 1.748s、strict 1.254s 通过，codec vet 通过。独审重新运行 credits 0.295s、codec 1.875s、strict 1.226s 与 vet 通过，另覆盖非法签名不修改已有内容。

结合尚未提交的 initial-thinking CLI 桥，独审实际 CLI 对隔离假上游的 JSON/SSE 新请求和续聊共四次调用 4.509s 通过：initial thinking 加后续正文，初始及两次签名增量，最终和下一轮历史都只有最终签名。独审新夹具最初漏 SSE event 行而失败，修正夹具后通过，未以此改产品逻辑。该集成证据依赖桥候选，不能当成本签名检查点单独包含桥，也不是真实提供商验收。

隐藏工具历史、失败计量及核心接线仍另行审查；本修复不开放通用 task_budget 能力。
