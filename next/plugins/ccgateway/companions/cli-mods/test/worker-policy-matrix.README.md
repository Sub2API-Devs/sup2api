# Worker 配置矩阵验收

`worker-policy-matrix.cjs` 将 Go 核心真实 `ResolveFeaturePolicy` / `resolvedWorkerPolicy`
生成的策略逐项发给真实 Worker，再由固定版本 CLI 向容器内的 HTTP mock 发送请求。
不请求真实模型，不连接 Docker socket，不修改账号容器。

必须在新建的隔离 Linux 容器执行，使用 `--network none`，并挂载：

- 待验收 CLI 与 Worker 二进制、`config-matrix-policies.json`。
- 此脚本及 `fixtures/native-environment-2.1.304.json`，保持相对路径。

脚本以 root 建立可信 CLI manifest 后，以 UID/GID 1000 运行 Worker。
`CCG_MATRIX_DISPOSABLE=1` 是必需的明确测试开关；存在 Docker socket 时拒绝执行。

环境变量：

| 变量 | 含义 |
| --- | --- |
| `PROBE_CLI` | 容器内待验证 CLI 的绝对路径 |
| `PROBE_EXPECT_CLI_SHA` | 预期 CLI SHA256，防止验收旧快照 |
| `PROBE_WORKER` | 容器内 Worker 二进制的绝对路径 |
| `PROBE_POLICIES` | Go 核心生成的矩阵 JSON 路径 |
| `PROBE_REPORT` | 可选报告文件路径；完整报告也输出到 stdout |

`config-matrix-policies.json` 的 `cases` 条目包含
`name`、`field`、`expected_mode`、`expected_source`（或计费组合的
`expected_sources`）及完整 `worker_policy`。脚本直接使用该 wire 策略，
不会自行替代核心的三层合并。

独立 oracle 采用真实 2.1.304 完整模板中的字段片段，不导入生产识别器或合并函数。
GitHub 与 Agent proxy 使用完整原生文案。受控运行目录不是 Git 仓库，
额外目录为空，未配置 GitHub stand-in / Agent proxy，并通过原生 `bg` 模式关闭
scratchpad；对应服务端来源应删除客户端可选字段，不能保留客户端值或伪造服务端值。

每项断言：

1. 成功请求恰好产生一次上游 POST。
2. 目标字段按 client / worker / erase 生效。
3. 所有非目标 system/messages 文本、角色、顺序、缓存属性与工具定义完整相等。
4. direct 请求的整个正文完全相等。
5. 逐请求切换来源和模式不会保留前一请求的策略。

补充矩阵包含历史完整块与七类更新、工具结果不扫描、缺块/缺字段、
CRLF、自定义 system 字符串、代码围栏、原先为空的 reminder 和计费歧义。
报告区分内容保真与 CLI 既有的 metadata/thinking 等生成参数规范化，不把后者
误报成“整个 build 正文只变化目标字段”。
