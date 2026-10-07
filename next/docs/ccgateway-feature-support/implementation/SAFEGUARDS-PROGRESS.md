# Safeguards 请求适配进度（2026-10-08）

## 证据与边界

官方 Claude Code [Auto mode classifier billing](https://code.claude.com/docs/en/auto-mode-classifier-billing) 要求代理保留请求 safeguards、响应 safeguard_results 和 tool-use ID；公开文档没有完整 classifier_context schema。本次通过该站点 `.md` 原文及已存在的本地 CLI 隔离捕获交叉确认。捕获证据只用于结构分析，不复制用户身份、目录、规则及其他原始数据到仓库。

CLI 捕获中的 safeguards 是非空数组，元素具有 type=dangerous_tool_use 和 classifier_context。后者包含 v、permission_mode、platform、live_cwd、home_dir、rule_roots、trusted_directories、rules、auto_mode 等版本化字段。关联头实测为 dangerous-tool-use-2026-09-03；其他同请求 beta 并不因此成为它的必需依赖。

这些捕获证明结构，不证明本次代码已获生产上游接受。公开 schema 不完整，因此只校验数组/对象外壳及 128 KiB 上限，深层内容保真，不改规则、路径、模式或判定。object、null、空数组及空对象元素当前明确拒绝，不猜测其它 CLI 版本支持。

## 实现

- `safeguards.go` 将显式客户端字段进入独立主请求计划；未知的深层属性、null、精确 JSON 数字均保留。
- 主请求 marker/lease 归属通过后才应用。辅助分类请求完全保持原始字节；token count 不注入客户端参数。
- 客户端工具在外部客户端执行，因此显式客户端上下文替换内层容器上下文。例如 D:/client 的路径规则若以 /container 分类将描述错误的执行端；此处原样使用客户端上下文，既不拼接两套规则，也不关闭审查。
- 未传 safeguards 时不修改内层 CLI 自带 safeguards。
- 替换前核对全部实际 outbound 工具与客户端名称、schema 一一相同；存在重命名、额外工具、缺失工具、重复工具或 schema 差异时拒绝。内部 ToolSearch、StructuredOutput 或 API server tools 的执行端不同，首阶段组合明确拒绝。
- Mod tool.call 与 stdio can_use_tool 权限 gate 未修改；客户端工具仍 deny 容器执行。审查 verdict 不授予本地执行权限，不伪造结果。
- 明确传入的关联 beta 通过共享 BetaRules forward。请求未提供该头时不擅自添加；上游对模型/版本限制返回原错误。
- 单一目录新增 scope=cc 的 F-SAFEGUARDS，状态 partial；CC 页折叠说明读取该目录，没有关闭审查的开关，也不标注 runtime_verified。

## 验证

- `go test ./engine -run TestSafeguards -count=1`：通过。覆盖外壳/容量、精确数字、深层保真、计划独立副本、缺省保留内层、工具身份拒绝、内部搜索拒绝、beta admission、真实 relay marker 主请求/辅助/token count 隔离。
- `go test ./engine -run 'TestSafeguards|TestRequestPlan|TestMainRequest' -count=1`：通过。
- contracts `go test ./features`：通过；唯一 ID、schema、深拷贝及 beta admission 检查仍有效。
- web `npx vitest run src/views/ccgateway/FeatureSupport.spec.ts src/views/ccgateway/RequestPolicySettings.spec.ts`：17 项通过。CC-only 特性不会出现在 API 列表，CC 说明无修改策略开关。
- 本次未进行生产调用、部署或 Linux race。完整 CLI/fake-upstream 往返证据见下节；真实账号仍需独立验证。

## 独立复核与 CLI 隔离往返

由 research_api 独立复核，2026-10-08：

- 新增 `safeguards_cli_compat_test.go`，真实 CLI 2.1.292，Worker HTTP → CLI/Mod → 主请求 relay → 隔离假上游 → Worker HTTP，JSON/SSE 各首轮与工具结果续聊，共 4 次请求，通过（2.96 秒）。
- 使用 CLI 已实测 catalogue 的 Read 完整 schema，最终上游仍为 Read，无 MCP 改名。合成 Windows 客户端上下文包含未知嵌套字段与整数 9007199254740993，最终 wire 对象一致；nonce 未泄漏，显式 beta 被保留。
- 假上游返回明确标记为 synthetic fixture 的 opaque `safeguard_results`（含 deny、tool_use_id、未知 detail）；HTTP JSON 与 SSE 均保持一致，正常结束。两个模式客户端回传 tool_result 后都 prefix-hit，实际历史保留同一个工具 ID 与客户端结果。
- 这是 opaque verdict/context 传输证据，不是对真实 classifier 的 deny schema 或判定准确性的认证，更不表示生产账号接受了该上下文。
- 复核发现只校验当前工具表不足：已移除 native 工具或 schema 变化会让旧历史工具名称被映射。因此补充 `validateSafeguardTools` 中的历史 tool_use 名称检查，放在实际 native 匹配后的主出站阶段；不能在 parse 时以空 Native 误判。
- `TestSafeguardsHistoricalToolIdentityAfterNativeMatching` 验证原 native、原 MCP 名可通过；schema 变化与已移除 native 导致历史改名时明确拒绝，且 parse 阶段不误拒。`go test ./engine -run '^TestSafeguards' -count=1` 通过。
- 没有修改鉴权、Mod 执行权限、can_use_tool gate，也没有扩大 beta 自动添加规则。历史 schema 签名及跨版本全局会话身份属于后续独立工作，本次未用所有请求参数粗暴重置 cache。
