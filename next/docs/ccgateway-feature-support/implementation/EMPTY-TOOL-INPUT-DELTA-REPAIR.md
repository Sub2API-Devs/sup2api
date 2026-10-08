# 空工具参数 delta 修复

2026-10-08。主代理在真实公网 #22 的 request `8540df6f-a003-40d8-a817-23dbd8223819` 观察到：上游 `tool_use.input={}`，随后 ping 和 `input_json_delta.partial_json=""`，CLI 接受但 Worker blockStop 错误解析空串，返回502。本文不记录真实请求内容或凭据；没有改冷却、模型拒绝或账号策略。

## 根因与修复

- Accumulator 曾因空串也创建 Inputs 条目，导致 stop 解析空 JSON。改为严格检查 partial_json 字符串类型，只有非空字符串才建立/追加输入缓冲；空串保持原始 input。合成结构化分支转换 text_delta 前也校验类型，不能吞数字/null。
- shared credits.MessageFromEvents 同类 hasInput=true 导致相同错误；只有非空字符串才表示存在增量。工具初始 input 必须对象，避免修空串后数组/null被保留当合法。
- protocol-codec/strict 在空字符串时不置 hasArgs、不触发 initial input 冲突，停止时正常输出原对象。legacy Anthropic→Responses 已有空串no-op，本轮未改。
- MCP credential guard 同类空缓冲误判也修正，空字符串不新建待解析项；类型非法仍拒绝，凭据检查未关闭。

只有长度为零的字符串是 no-op；空白、截断JSON、数组、null、非字符串均为负例，不能 trim 后当 `{}`。既有 initial input 大整数保留测试覆盖。对于非空 initial 与非空 delta 的旧覆盖行为，本次不扩大修复范围，需结合 CLI 原始数值恢复路径另证，避免紧急修复造成其他退化。

## 验证

- Accumulator、credits聚合器、strict两协议新增用例先红后绿：初始{}或非空对象配空delta；空白/截断/数组/null/数值delta拒绝。
- 真实 CLI 2.1.292 +隔离假上游 JSON/SSE × 首次空arg工具、tool_result续聊、冷Worker完整历史、回退，共8次调用通过（7.920s）。真实工具名lookup_fixture、caller.direct、ping及空delta结构与事故一致；未调用生产模型。
- 全engine单测4.139s、vet通过；contracts credits全测试1.303s；protocol-codec全模块及strict通过（0.618s/1.489s）。
- 未提交、未部署；交独立agent复核后由主代理按Git候选发布。
