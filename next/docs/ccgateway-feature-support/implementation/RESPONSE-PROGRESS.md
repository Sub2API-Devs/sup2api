# 响应保真与服务端安全检查记录

日期：2026-10-08。当前工作区实现，未部署。

## 官方资料核对

本轮直接获取官方文档内容（网页工具不支持text/markdown，改用HTTPS读取官方`.md`）：

- [Auto mode classifier request charges](https://code.claude.com/docs/en/auto-mode-classifier-billing)：网关需要保留safeguards请求、safeguard_results返回及tool-use IDs；缺失会令CC改用另计费用的分类请求，或因没有verdict拒绝动作。
- [Gateway protocol](https://code.claude.com/docs/en/llm-gateway-protocol#feature-pass-through)：功能字段与beta配对，透明Anthropic网关应保真；OAuth必需beta不能删除。本文Worker是协议适配器，不能仅将这条建议解读成任意CC执行字段可直接映射。
- [Server-side classifier review](https://code.claude.com/docs/en/permission-modes#server-side-classifier-review)：可用性依赖平台、地区、凭据和CLI版本；请求了不保证服务端有review。无verdict时客户端拒绝，而非网关代造通过。

资料未公开足够safeguards schema证明可任意改写工具名或客户端/内层CC身份，也未说明其内容本身可以作为认证凭据。请求侧如适配，需保留安全需求与真实verdict，不能关闭检查、伪造结果或借设置切换身份。已有MCP名称改写是否影响review语义仍需真实客户端工具回合验证。服务端deny不是传输故障，不能为了让调用成功改成allow。

## 当前实现

`response.go` 原来已复制message_start.message及message_delta.delta内字段，但丢掉message_delta事件顶层非usage字段，且强制仅一个终止delta。新增 `response_extensions.go` 注册非执行envelope字段：safeguard_results、input_transformations、stop_details、context_management、container、diagnostics。

这些字段从message_start、message_delta和message_stop的相应位置取完整JSON快照，保留未知嵌套键及数值，不与发给客户端的SSE事件共享可变map。后续值整体替换前值（含null），不发明局部patch/数组拼接语义。message_delta允许扩展/usage更新在终止reason前后到达；只有真实终止reason才标记Stopped，message_stop仍要求所有块闭合且已终止。

不改tool_use.id、不改安全结果，不把refusal变成错误。只转换现有工具wire name回客户端name。新增envelope保留不等于其请求、执行块、历史或计量已经全支持；本批仍拒绝未登记server tool内容块，未开放复杂request字段。

## 验证

单测覆盖：完整JSON与原SSE键、RawJSON大整数、正常refusal、晚到verdict、显式null替换、累计usage替换而不重复相加、工具ID对应、未授权新执行块拒绝及不完整消息拒绝。命令`go test ./engine -run 'Test(Response|Accumulator|Stream|Citations|Refusal)' -count=1`通过（1.041s）。

新增可选真实CLI探针 `TestRealCLIResponseEnvelopePersistence`，隔离HOME/config、假API Key、loopback假上游，无生产账号。实际CLI2.1.292：六个扩展均出现在stream-json输出；native JSONL仅保留stop_details，其余五项未发现。探针通过的是流传输断言，native结果逐项报告而不是断言全部支持；没有真实官方模型调用。

因此不能声称原生JSONL完整保存了这些响应字段。建议Worker在历史快照/诊断旁按message ID保存独立response envelope，保留CLI原始JSONL；不要把返回envelope当客户端messages块重新注入。历史持久化补充由历史模块负责，本批未修改native/history。

## 待完成

- 请求safeguards的字段/beta配对、主请求归属、内层CC自带safeguards冲突策略及真实客户端验证。
- Worker完整JSON/SSE→CLI→native/独立envelope→续聊组合测试；响应费用扩展只原样保留，核心计费尚需独立适配。
- 真实review结果与tool-use ID/映射名称绑定实验；不使用合成verdict宣称真实服务端检查生效。

## 后续修复：终止事件及结构化输出

独立复查发现Accumulator保留message_stop扩展仍不足：runner原先截住原stop，HTTP末尾重建空stop导致SSE客户端丢字段。已改为Prepared运行时RawJSON保存最终非内部搜索轮的stop注册字段，最终HTTP成功结束才发送原位置的stop。该字段不进Snapshot/JSON响应/JSONL，读取返回新对象防止修改共享数据；新的结构化轮次清空旧stop，避免把前轮verdict归到最后一个message ID。

结构化输出重建SSE现在按最终buffered流保留扩展的原位置：start绑定值仍在start，delta顶层/内部扩展及终止后观察仍在delta，stop扩展由HTTP最后发送；不会把晚到safeguard结果提前放进message_start。result路径及等待CLI退出后的finish路径再次校验Mod/scope，补齐没有stream_event的特殊结束路径。

新增 `TestRealCLIHTTPResponseEnvelopeLocations`：真实CLI2.1.292对隔离假上游，经过完整Worker HTTP，再由外部HTTP客户端检查JSON或SSE。六个注册字段分别放在start/delta/stop，交叉structured开关与stream开关，共12组合全部通过（8.55s）；SSE检查原位置及恰好一个message_stop。测试没有使用真实账号，合成字段只证明传输保真，不证明官方安全评估采用或任何账号功能授权。

新增普通单测覆盖stop深拷贝、结构化扩展位置/顺序、无stream result不能跳过归属校验。整合后的`go test ./engine -count=1`通过（3.695s），默认不包含需要CCG_REAL_CLI的可选测试。
