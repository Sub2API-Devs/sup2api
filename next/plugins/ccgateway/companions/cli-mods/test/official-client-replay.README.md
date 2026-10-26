# 官方客户端与普通 Messages 回放验收

`official-client-replay.cjs` 在一次性 Linux 容器中，以全新 HOME、工作目录和
mock API Key 启动**未修改的官方 CLI**（版本由 `CC_VERSION` 指定，缺省 2.1.304），
真实生成一轮请求，再将其正文及 `anthropic-version` / `anthropic-beta` 头发给真实
Worker 回放。不读取真实用户配置，不请求外部模型，也不使用其他版本的样本代替新抓包。

运行约束与 `worker-policy-matrix.cjs` 相同：新建容器、`--network none`、
无 Docker socket；显式设置 `CCG_REPLAY_DISPOSABLE=1`。命令见
`assembly-replay.README.md`“在 ovh 上用新版本运行组装对账”。

| 环境变量 | 内容 |
| --- | --- |
| `CC_VERSION` | 官方与补丁 CLI 的版本，缺省 `2.1.304` |
| `PROBE_OFFICIAL` | 官方未修改二进制，默认 `/input/claude-official-<版本>` |
| `PROBE_CLI` | 待回放的补丁 CLI，默认 `/input/claude-linux` |
| `PROBE_WORKER` | Worker 二进制，默认 `/input/ccg-worker-linux` |
| `PROBE_OFFICIAL_SHA` / `PROBE_EXPECT_CLI_SHA` / `PROBE_EXPECT_WORKER_SHA` | 调用方给出的预期 SHA-256；不给时不校验，报告 `sha_unpinned: true` 并列出实际 SHA |
| `PROBE_REPORT` | 可选 JSON 报告文件；报告也输出到 stdout |
| `PROBE_CAPTURE` | 可选原始官方请求保存路径，仅含本次全新测试环境的数据 |
| `PROBE_CASE_FILTER` | 可选案例名子串，用于重跑已发现的特定差异 |

验收包含官方原始请求（build/direct）、平台/OS 选择、明确标记的目标值派生样本、
缺计费块原生补齐，以及四类普通 **Anthropic Messages** 请求的 build/direct：
无 system、自定义字符串 system、多模态与工具回合、普通 reminder 引用。
它不声明支持任意 OpenAI 或其他协议正文。

## 断言（现行规则，CLI-TEST-PLAN 第 9 节）

- 上游请求行为 `POST /v1/messages?beta=true`（v24 起两种模式相同）。
- system 开头没有完整计费头的请求，build 与 direct 都在前面插入 CLI 原生整行
  （build 总带计费头；direct 自 v17 起补）；该行的 `cc_version` 必须等于按首条提示独立算出的
  指纹，`cc_entrypoint` 为 `sdk-cli`，其余键只能是原生会带的几项。官方抓包自带的
  `cc_version` 也必须等于同一算法的结果；去掉计费头后补回的值必须等于官方原值。
- 工具目录在 build 中**逐项相等**：`ToolSearch` 保留，省略 `description` 的定义不补空串
  （补丁 `FH` 直接返回客户端定义，v26）。旧 README 记录的 12→11 与补 `""` 已不成立。
- build 的生成参数：客户端给的全部保留（`top_p`、`stop_sequences`、`context_management`
  等由 `mergeAdditionalParameters` 并回）；只允许构建器给**缺省的**控件补原生值
  （thinking disabled、`temperature: 1`、effort high）；metadata 是客户端的原值或没有
  （API Key 账号，build 设计 §7）。
- direct：除 system 成员外每个字节与发送的相同；system 只多出原生计费头（字符串 system
  变成块数组）。官方原始请求自带完整计费头，direct 整包逐字节相等。

报告字段：`request_line`、`native_header`、`system_equal`、`messages_equal`、`tools_equal`、
`content_differences`、`generation_parameter_differences`、`unauthorized_parameter_changes`、
`full_body_equal`；顶层 `cc_version`、`artifact_identity`、`sha_unpinned`、`status`
（`verified` / `failed_checks`）。成功发送一次请求不代表内容或全部参数未发生变化。
