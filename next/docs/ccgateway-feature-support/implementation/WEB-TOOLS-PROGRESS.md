# 服务端 Web 工具适配

2026-10-08；实施中，未部署。目标是官方服务端工具协议，不在Worker运行抓取或本地Bash。

## 实现与证据

- `web_search_20250305/20260209/20260318` 与 `web_fetch_20250910/20260209/20260309/20260318` 保留原版本、固定名称和参数，仅归属明确的主请求注入。较新版本默认程序化执行，未显式direct的请求在PTC适配前明确拒绝，不能擅自改成direct。
- 复用服务端搜索路由与codec，区分工具调用/结果类型配对；客户端工具MCP和原生拦截保持原路径。domain/location/citations/limits/response_inclusion等字段保持原值；url_sources里声明的客户端工具引用单独按路由映射，普通内容字符串不改写。
- 结果错误仍为HTTP200消息内容，保留encrypted_content、encrypted_index与引用。完全保留上游usage对象；不自行伪造搜索计费。
- `TestWeb*`/`TestServerSearch*`定向通过。`TestRealCLIWebGatewayCompatibility` CLI2.1.292，六版本每个6次，共36次完整HTTP→CLI/Mod→relay→假上游回归，25.91秒PASS；覆盖新会话、prefix-hit续聊、下一轮、fork、空cache导入、SSE、引用及加密结果字串。没有网络抓取或真实模型调用。

## 未完成边界

- 初期缺少 pause_turn/混合延迟结果的记录保留为历史：现已增加单次终态观察、assistant-tail 续接、跨请求 pending ledger；混合客户端 handoff 的8次实际 CLI隔离请求已通过。PTC 调用者和上游代码容器仍未适配。
- 账号上游是否允许Web工具与具体版本需要真实测试；CLI传输通过不等于OAuth entitlement成立。
- 缓存组合现已开放已注册的服务端类型：按客户端原始顺序排列最终工具定义、恢复原位 marker（包含嵌套 fetched document），禁止未声明额外工具。`TestRealCLIServerToolCacheBoundaries` 搜索/抓取/Advisor各新请求、续聊、冷导入、SSE共12次调用，8.97秒PASS。没有把客户端缓存移动成CLI全局TTL。
- 完整工具目录与 `tool_choice:none` 组合曾因CLI不注册工具而遗漏定义，已恢复只供模型查看的原定义并保留none；真实CLI定向回归0.92秒PASS，不允许执行工具。
- 补充第七版本 web_fetch_20260309 六流程4.23秒PASS；原36次统计不是新版总覆盖数。
- 独立审查补user_location可空字段、WebFetch内部document的缓存、引用来源关联；与Advisor/fallback混合历史整改详见FAST-DIAGNOSTICS-PROGRESS。核心现在记录搜索/抓取次数与实际speed/tier/geo作为可计费usage facts；不擅自改变管理员模型价格。

## 官方依据

- [Web search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)：版本、参数、加密结果、HTTP200工具错误、pause_turn和混合工具延迟行为。
- [Web fetch](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool)：版本、引用/URL来源与抓取结果。
- [SDK类型目录](https://github.com/anthropics/anthropic-sdk-python/tree/main/src/anthropic/types)：七种工具Param、ServerToolUseBlockParam、WebFetchToolResultBlockParam与URLSources/tagged tool references。2026-10-08核对。
