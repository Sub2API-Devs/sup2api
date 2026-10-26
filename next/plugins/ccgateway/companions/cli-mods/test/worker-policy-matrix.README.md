# Worker 配置矩阵验收

`worker-policy-matrix.cjs` 将 Go 核心真实 `ResolveFeaturePolicy` / `resolvedWorkerPolicy`
生成的策略逐项发给真实 Worker，再由固定版本 CLI 向容器内的 HTTP mock 发送请求。
不请求真实模型，不连接 Docker socket，不修改账号容器。

必须在新建的隔离 Linux 容器执行，使用 `--network none`，并挂载：

- 待验收 CLI 与 Worker 二进制、`config-matrix-policies.json`（其 `cli_version` 必须等于 `CC_VERSION`）。
- 整个 `test/` 目录（脚本读 `replay-helpers.cjs` 与 `fixtures/native-environment-<版本>.json`）。

脚本以 root 建立可信 CLI manifest 后，以 UID/GID 1000 运行 Worker（API Key 账号）。
`CCG_MATRIX_DISPOSABLE=1` 是必需的明确测试开关；存在 Docker socket 时拒绝执行。

环境变量：

| 变量 | 含义 |
| --- | --- |
| `CC_VERSION` | Claude Code 版本，缺省 `2.1.304`；选环境模板夹具，CLI 与策略矩阵的版本必须等于它 |
| `PROBE_CLI` | 容器内待验证 CLI 的绝对路径，默认 `/input/claude-linux` |
| `PROBE_EXPECT_CLI_SHA` / `PROBE_EXPECT_WORKER_SHA` | 调用方给出的预期 SHA-256；不给时不校验，报告 `sha_unpinned: true` |
| `PROBE_EXPECT_CLI_PATCH` | 可选，核对 CLI 补丁标签（原先写死 `ccgateway-v12-feature-policy`） |
| `PROBE_WORKER` | 容器内 Worker 二进制的绝对路径，默认 `/input/ccg-worker-linux` |
| `PROBE_POLICIES` | Go 核心生成的矩阵 JSON 路径 |
| `PROBE_REPORT` | 可选报告文件路径；完整报告也输出到 stdout |

`fixtures/native-environment-<版本>.json` 是原生环境渲染器在固定输入下的完整模板，目前只有
2.1.304；其他版本缺它时脚本直接失败，不用别的版本代替。

`config-matrix-policies.json` 的 `cases` 条目包含 `name`、`field`、`expected_mode`、
`expected_source`（或计费组合的 `expected_sources`）及完整 `worker_policy`。脚本直接使用该
wire 策略，不会自行替代核心的三层合并。direct（等级 none）的策略可以带计费入口与计费来源，
不能带环境来源（核心 `feature_policy.go` `workerPolicy`）。

独立 oracle 采用真实完整模板中的字段片段，不导入生产识别器或合并函数。受控运行目录不是
Git 仓库，额外目录为空，未配置 GitHub stand-in / Agent proxy，并通过原生 `bg` 模式关闭
scratchpad；对应服务端来源应删除客户端可选字段，不能保留客户端值或伪造服务端值。

每项断言（现行规则）：

1. 成功请求恰好产生一次上游 `POST /v1/messages?beta=true`。
2. 目标字段按 client / worker / erase 生效。
3. 所有非目标 system/messages 文本、角色、顺序、缓存属性与工具定义完整相等。
4. 计费头：选 `worker` 的字段换成独立算出的原生值（`cc_version` = 首条提示的指纹，
   `cc_entrypoint` = 下发的入口或 `sdk-cli`），缺的字段在行尾补原生值；没有开头计费头时
   （缺块、或头不在首块开头，如字符串 system 中间）在最前插入原生整行，客户端的头原样留下；
   两个计费头且有字段选 `worker` 时 400、零上游（旧矩阵预期原样发出）。
5. direct 请求只有计费来源作用于首块计费头，其余整个正文完全相等（旧矩阵预期正文不变）。
6. 逐请求切换来源和模式不会保留前一请求的策略。

补充矩阵包含历史完整块与七类更新、工具结果不扫描、缺块/缺字段、CRLF、自定义 system 字符串、
代码围栏、原先为空的 reminder 和计费歧义。报告区分内容保真与 CLI 既有的 thinking 等生成参数
规范化，不把后者误报成“整个 build 正文只变化目标字段”。
