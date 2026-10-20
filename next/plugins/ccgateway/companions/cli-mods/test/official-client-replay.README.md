# 官方客户端与普通 Messages 回放验收

`official-client-replay.cjs` 在一次性 Linux 容器中，以全新 HOME、工作目录和
mock API Key 启动**未修改的官方 CLI 2.1.304**，真实生成一轮请求，再将其
正文及 `anthropic-version` / `anthropic-beta` 头发给真实 Worker 回放。
不读取真实用户配置，不请求外部模型，也不使用旧版样本替代新的 304 抓包。

运行约束与 `worker-policy-matrix.cjs` 相同：新建容器、`--network none`、
无 Docker socket；显式设置 `CCG_REPLAY_DISPOSABLE=1`。

| 环境变量 | 内容 |
| --- | --- |
| `PROBE_OFFICIAL` | 官方未修改 304 二进制，默认 `/input/claude-official-304` |
| `PROBE_CLI` | 待回放的 patched CLI，默认 `/input/claude-linux-config-audit` |
| `PROBE_WORKER` | Worker 二进制路径 |
| `PROBE_REPORT` | 可选 JSON 报告文件；报告也输出到 stdout |
| `PROBE_CAPTURE` | 可选原始官方请求保存路径，仅含本次全新测试环境的数据 |
| `PROBE_CASE_FILTER` | 可选案例名子串，用于重跑已发现的特定差异 |

脚本固定校验已验收的官方及 patched CLI SHA。变更制品时应显式更新预期，
不能跳过身份检查后沿用原报告。

验收包含官方原始请求、平台/OS 选择、明确标记的目标值派生样本、
缺计费块原生补齐，以及四类普通 **Anthropic Messages** 请求的 build/direct：
无 system、自定义字符串 system、多模态与工具回合、普通 reminder 引用。
它不声明支持任意 OpenAI 或其他协议正文。

## 已发现的兼容性边界

当前已测试快照中，官方请求的 build 回放保留了 system/messages，但工具目录
存在差异：本次 fresh 样本中的 `ToolSearch` 被去除，12 项工具变为 11 项，
后续条目的位置前移。因此官方四项严格内容检查是**失败**，不能把 HTTP 200 计为全通过。
普通合法工具定义省略 `description` 时，build 会补 `description: ""`，报告为
`observed_tool_normalization`。这些都是现存差异，本验收任务没有修改业务实现。

build 的生成参数也并非原文透传：普通请求中的 `top_p`、`stop_sequences`、
自定义 `context_management` 在实测中消失，同时出现原生生成的 metadata、
thinking、temperature 或 output_config。报告将这些变化单独列在
`generation_parameter_differences`，不混同于提示内容保真。

direct 对本次官方及普通 Messages 样本均做整包相等断言。精确结果以报告中的
`system_equal`、`messages_equal`、`tools_equal`、`content_differences` 和
`full_body_equal` 为准；成功发送一次请求不代表内容或全部参数未发生变化。
