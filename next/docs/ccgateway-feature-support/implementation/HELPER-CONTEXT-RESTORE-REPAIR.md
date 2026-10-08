# 隐藏历史恢复与客户端工具结果附件的位置

## 线上 .76 证据

Core .73 / Worker .76 普通预算首次请求真实成功：Core RID `d49b8d1f80551caeeef1c640`，Worker log `59ae5487-59d5-4f8b-b0e0-7bca5b92b484`。原始提供商响应两次均完整 message_stop/tool_use：隐藏 ToolSearch 用量24/91、1h1646；外部工具调用用量24/63、1h275、cache read1646。公共汇总48/154、1h1921、read1646，与 Core 已提交记录一致。两次 Mod helper_reminder ACK，完整隐藏 A/U 及49B尾预算 system 已保留；前一版尾system问题已修。

第二次返回工具结果时失败：Core RID `58765193bd96b5f10af0e6b1`，Worker log `d84f123d-9768-465a-8cf8-c4c98ef0cc05`。本地错误 `cannot prepare the upstream request: session attachment tool-result position changed`。日志仅原始 CLI 请求、拒绝 body 和准备事件，没有 actual 上游请求/响应文件；该轮在准备主请求时被拒，没有模型响应。Core 已识别前次 parent receipt，未丢失账号绑定，不能将其 unknown 账务状态当作已知零消耗。

## 根因和候选

`normalizeToolResultContexts` 在插入隐藏历史之前记录客户端结果的 user ordinal/block/ID，并临时剥离本请求已认证的 session_context 后缀用于严格对齐。旧顺序在 `applyHelperHistory` 插入隐藏 ToolSearch user 之后再恢复后缀，原 ordinal 指向隐藏 user，故正确的定位防线拒绝。

候选不改变任何定位/内容校验，不按 tool ID 全局查找：`applyHelperHistory` 完成全部公开消息对齐、原段证明和同anchor匹配后，在插入隐藏行前调用既有恢复闭包。其批量先验证再写入行为不变。非托管请求同样恢复一次；count 保留原路径。恢复失败禁止插入并记录捕获错误，不能返回成功托管段。

原结果尾字符、当前已认证后缀恰一次、块号、ID 和消息顺序保持；隐藏 user 不再错误地占用尚待恢复的公共 ordinal。

## 作者验证

`TestHelperContextRestoresPublicResultBeforeHiddenInsertion` 使用完整持久隐藏 A/U、公开工具结果尾TAB和已认证后缀：旧顺序真实 RED **1.467s**，与线上报错相同；候选与原 ToolResult/Helper 否例目标 **1.273s** 通过。实际 OAuth session_context 触发的 Core ABC 独审进行中；普通假上游不触发后缀的通过不能代替此证据。

新阶段钩子独审 **1.288s** 通过：原错误顺序仍拒绝，证明没有退化为全局 ID 查找；新顺序仅调用一次、原 view 幂等，客户端自带同文 reminder 与尾 TAB 保持，隐藏结果不改。ID/block/content 篡改、callback 取消均拒绝且不插入隐藏行、锁存捕获错误；非helper恢复一次，历史证明失败不调用恢复。最新全 engine **4.454s**、vet 通过。原尾预算12次真实CLI回归 **25.981s** 通过，但该无OAuthcontext夹具不替代独立 OAuth ABC 证据。

本轮没有新公网模型请求、身份请求、运行态更改或部署。
