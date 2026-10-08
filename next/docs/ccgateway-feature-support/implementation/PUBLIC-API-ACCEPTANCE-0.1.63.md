# 0.1.63 公网 API 验收：发现工具空参数流缺陷

2026-10-08，实际访问用户提供的公网平台入口 `http://15.204.107.38:3130/`，使用其已授权的客户端 Key（本文不记录）。模型 `claude-opus-5-5`。核心四节点 0.1.63，业务源提交 b786448a；#21/#22 Worker 为 747c168a，CLI 2.1.292。

这是公开入口真实模型测试，不是隔离假上游。没有指定某个账号、修改调度或自动重试。完整汇总在 [public-api-smoke-0.1.63.json](evidence/public-api-smoke-0.1.63.json)。测试脚本位于上一级 evidence/live_api_smoke.py，只从进程环境读取 Key，不保存请求正文或凭据。

## 实际结果

- 独立基础调用：HTTP200，准确返回 PLATFORM_READY，request_id `b80c5df2d43ba6e90f90a718`。
- 矩阵的 JSON、续聊记忆、回退新分支、完整 SSE 均符合预期。
- 40轮外部客户端历史导入返回 HTTP200、stop_reason=refusal、空content。核心记录 success=true、无 error_type；这是正常模型拒绝，没有改成502，也没有导致冷却。因为没有返回预期答案，业务断言没有计成功，后续需区分传输保真与提供商是否愿意回答。
- 空参数客户端工具首轮返回502，错误为 `invalid tool input JSON`，request_id `7b7a0895f109d1a7363add20`。工具结果回传没有执行。
- 后续结构化输出、计数、缓存及两个 OpenAI 协议收到503，不能当这些功能自身失败或通过；它们均位于上述502引起的账号22十秒冷却窗口。冷却已自然过期，没有修改冷却规则。

核心只读核对：长历史 `de379061428d8857fd98c5ae` 归属账号22，HTTP200/success=true；工具失败也归属账号22，只有一次尝试。后续 `cd75d97cdebfab1a50501f3b`、`f57f3a6618bb8909e1b1f223` 等记录 account_id为空、no_account。Key鉴权成功，不是用户用错Key。

## Worker 根因

账号22日志 `/work/data/request-logs/8540df6f-a003-40d8-a817-23dbd8223819` 对应 Worker request_id `19c4ec80-f384-42e5-86fb-8cd97bd59ddc`。只读取本次 fixture 请求及其日志，不输出授权文件/请求密钥。

真实提供商流中：tool_use 的初始 input 为 `{}`，随后发送一个 `input_json_delta`，其 `partial_json` 是空字符串，之后结束该块。CLI 已接受工具调用，但 Worker 的 Accumulator 因空字符串已进入 Inputs map，在 block_stop 处将空串作为完整JSON解析，误报502。

修复要求是空字符串片段不改变既有对象；空白字符串、截断的非空JSON、数组或非字符串delta仍须拒绝。相同问题需核对信用聚合、MCP凭据检查及共享协议转换器，避免只修一条调用路径。当前作者和独立复核代理正在处理，尚未将修复部署后的结果补写成成功。

## 下一次验收

修复先通过单测和真实CLI的JSON/SSE空参数往返及历史重建，再随新的Git候选部署。之后重新运行受影响的公开工具、结构化输出、计数、缓存与OpenAI协议测试。此前失败汇总保留，不覆盖为全绿。

本机第一次 `python` 命令实际落到 WindowsApps 别名且未执行脚本，不计测试；实际矩阵由 `py -3` 执行并生成上述结果文件。

## 冷却结束后的独立验证

在不重试工具失败请求的前提下，单独执行此前被冷却遮挡的功能。结果见 [独立验证汇总](evidence/public-api-smoke-independent-0.1.63.json)。

- 结构化输出HTTP200，返回JSON满足要求。
- 显式5m缓存首请求创建2738个token；相同请求第二次HTTP200，上游usage明确cache_read_input_tokens=2738、cache_creation_input_tokens=0。这是实际提供商用量报告的缓存命中，与本地prefix-hit分开；本文不推导未经核对的计费节省金额。
- OpenAI Chat Completions和Responses均HTTP200，协议文本结果符合预期。
- count_tokens仍503，request_id `719020712b65d57118d29423`，前一个请求是正常200，不能再解释为工具502冷却。正在独立核对候选路由/能力声明。
- 空工具delta作者修复及独立审已完成，8次真实CLI隔离工具往返通过；未以此替代修复部署后的公开工具成功证据。

## count_tokens 部署版本根因与修正

独立复核确认核心已选账号22，但实际仍运行2026-10-06安装的CCGateway0.1.9。0.1.63构建虽打包新实现，插件manifest未递增版本；安装器按同版本不可覆盖规则保留旧包，旧二进制明确不提供count_tokens。具体安装SHA/二进制证据见DEPLOYMENT-2026-10-08-CORE-0.1.63后续段落。

已在本地将插件manifest递增至0.1.10，插件全模块单测/vet通过。没有覆盖immutable旧包或修改调度/冷却规则。下一次发布必须核对四节点实际active插件版本与候选包SHA，然后再验公开count调用，不能只看核心版本就称插件更新完成。
