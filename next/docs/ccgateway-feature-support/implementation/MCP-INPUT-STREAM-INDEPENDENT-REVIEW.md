# MCP 输入流桥独立复核

2026-10-08；只新增 `mcp_input_stream_review_test.go` 和本记录，生产修复由作者完成。没有部署或重复真实提供商调用。

## 发现并整改

首轮发现实际阻断：桥接原 SSE 418 字节为 339 字节，但保留 provider Content-Length=418。新增独立测试稳定失败。作者修复为移除 Content-Length/Transfer-Encoding 头与传输编码、ContentLength=-1，由下游代理选择正确 framing；原失败测试已转绿。不能用此前 chunked fixture 成功掩盖这个显式长度问题。

同时复核作者将逐片字符串拼接改为 strings.Builder，完成后 Reset；16 MiB 累积边界包含初始块，避免超大起始事件和大量分片的反复复制。未被标准 transport 解码的 Content-Encoding 明确拒绝并关闭 body，不把压缩字节当可安全检查的 JSON。

## 数据与执行边界

主请求归属后的实际响应依次经过 MCP secret guard、原始日志/terminal observer，再进入 CLI 输入桥。完整 block_stop 到来才提交完整初始 input；原始 message ID/index 与完整原 block 元数据须同 exact-input ledger 对应，只有 input 字段换为源流 UseNumber 解析对象。更新可信完整输入后，CLI 数值归一化仍受既有精度恢复约束，不从任意文本猜输入。

没有补造 block_stop、message_stop、工具结果或终态。空 delta 保留初始 object；非空 delta 要求初始空 object，非法/截断/数组/null、错 index/顺序/未知 delta 拒绝；EOF 持有未完成块时报错。provider error 保留真实事件语义。非 MCP 请求不包桥、不修改 body 或长度。

新增独立验证包括：显式旧长度清理；真实 HTTP gzip 经标准 transport 解压后正确桥接，大整数 9007199254740993 保留；secret 在两段 input_json_delta 拼接后由 guard 拒绝，CLI输出及 exact ledger 均不出现该凭据片段；Close 确定性解阻塞正在等待的上游读取；非 MCP 原 body/长度不动。全部桥/独立单测修正后 PASS 0.451 秒。

最终修正代码独立复跑真实 CLI2.1.292 `TestRealCLI(MCPInputDeltaTransportProbe|MCPConnectorGateway)` PASS 25.703 秒、vet 通过，覆盖 JSON/SSE 的完整初始对象、空 delta、合法 delta、组合及既有 MCP 往返。所用凭据与提供商均为隔离 fixture，不是线上 MCP 服务资格证明。

最终无阻断。仍须精确 Git 候选门禁和部署后一次受控公开 MCP 复验；本记录不宣称候选已上线，不声称可阻止远端任意编码或隐写泄漏。
