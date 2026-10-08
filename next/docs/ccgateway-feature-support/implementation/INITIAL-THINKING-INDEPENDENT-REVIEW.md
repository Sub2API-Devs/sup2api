# Initial thinking CLI bridge 独立复核

范围：initial_thinking_stream.go、相关测试、outbound_relay.go的桥接顺序，以及root已修改的signature_delta替换聚合语义。只新增独立测试，未修改作者业务代码、未开放gate、未部署。

结论：本轮未发现新的阻断问题。

- response主归属后，原始SSE先经过provider事实/秘密保护及原始source observer，再经过MCP载体桥和thinking载体桥；observer不把改写后的CLI载体当原provider证据。
- 仅thinking start的非空initial text/signature变为等价CLI delta；没有补造block_stop/message_stop或成功终态。后续signature_delta按官方替换语义覆盖，最终opaque值不是拼接。
- 非目标ping/注释/CRLF/redacted_thinking逐字保留；初始扩展字段由原作者大整数测试覆盖。
- 显式Content-Length/Transfer-Encoding已清理，避免使用旧字节长度。真实HTTP gzip由标准transport解压后再桥接，原observer仍见完整原文；未解码gzip/br/未知encoding明确拒绝。
- Close传递到底层ReadCloser，阻塞读取被解除，不把中断视为成功。

独立新测试：engine/initial_thinking_independent_review_test.go，混合initial signature与两次后续replacement、非目标字节、关闭解除阻塞、真实gzip及未解码拒绝，PASS1.213s；go vet ./engine通过。

实际CLI2.1.292隔离重跑：TestRealCLIInitialThinkingCarrier及TestRealCLIInitialThinkingWithReplacementSignature，共16次fake提供商调用，PASS13.712s。初始非空thinking完整隐藏轮的JSON/SSE/new/外部结果/普通续/cold/rollback通过；普通两轮JSON/SSE明确验证最终thinking为initialtail、最终signature为final-signature，历史重放仍保持该最终opaque值。

这证明CLI等价载体与原始协议保真，签名是公开fixture opaque字符串；不声称该fixture经过真实提供商密码学验证或真实模型调用。
