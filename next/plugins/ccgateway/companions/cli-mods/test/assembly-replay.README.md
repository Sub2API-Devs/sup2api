# 304 原生组装分组验收

入口 `assembly-replay.cjs` 在一次性 Linux 容器中启动真实 Worker、已校验 SHA 的
patched CLI 2.1.304 和 loopback Messages mock。只覆盖 first-party Anthropic
Messages 的 `request --build` / `request --direct`，另有三个 standalone 输入拒绝
用例。不覆盖 Bedrock、Vertex、交互式 agent loop，也不将案例通过率称为 AST 分支覆盖率。

`fixtures/assembly-cases.json` 是静态、可审阅合同，包含稳定 ID、分组、完整输入、
策略、运行环境、预期合同、源码符号和 fixture 来源。运行
`node fixtures/build-assembly-manifest.cjs` 可重新生成。原生 ToolSearch 定义及
完整官方请求来自全新测试 HOME、合成凭据、loopback mock 的官方未修改 304 抓包，
保存在 `fixtures/official-tools-2.1.304.json` 和 `fixtures/official-request-2.1.304.json`。

| 分组 | 合同 |
| --- | --- |
| INPUT | Worker/standalone 校验、空值、不安全数字、角色、工具回合及保留组件 |
| SYS / MSG | 字符串/数组 system、原消息角色与块、媒体、系统生命周期、官方完整请求 |
| TOOLS | 自定义工具、ToolSearch/deferred、typed server 工具、顺序及未知属性 |
| PARAM | 模型/令牌/thinking/工具选择/output_config/采样参数和未知字段 |
| SEND | 逐字节 direct、beta/auth、一次上游、HTTP 错误、SSE |
| BILL_ENV | 无匹配/重复保留、精确字段替换、混合来源、独立计费 fingerprint |

必须保留严格失败：HTTP 200 不能证明组装保真。工具丢失或顺序变化、参数丢弃、
未知字段被增删、`CLAUDE_CODE_EXTRA_BODY` 越过保留合同覆盖内容，都会返回 `fail`。
无法建立可靠模型门控 oracle 的案例是 `unknown`。有任何 fail/unknown 时退出码为 1。
修复前的 72 项曾有 19 个失败、1 个 unknown。修复后当前 75 项已全部通过，
不得把实际输出回写成预期来消除未来回归。

非内容字段采用闭合比较：显式预期参数逐项精确断言；其他变化仅允许代码中可执行的
原生规则，包括 metadata 的 JSON 结构及 device/session 格式、缺省 thinking disabled、
其对应 temperature 1、当前固定模型缺省 effort high。明确启用 thinking 的案例
单独写出固定原生 display updates 预期及 AST 依据。其余变化失败，动态模型规则
无可靠 oracle 时标 unknown。原生 metadata 规范化不等于客户端原文保留。

计费 `cc_version` 从预期变换后的首个用户文本按独立 304 salt、UTF-16 索引
4/7/20 和 SHA256 前三位计算，两个不同采样文本分别断言；不读取实际输出反推预期。
direct 同时比较对象与实际发送 JSON 字节，包含缩进和结尾换行。
mock 还检查 POST `/v1/messages`、合成 Worker 凭据、无 Authorization 与策略头泄漏，
所有非拒绝案例要求一次上游。

示例运行：

```sh
docker run --rm --name ccg304-assembly-replay \
  --label io.sup2api.task=ccg-304-v12 --network none --user 0 \
  -e CCG_ASSEMBLY_DISPOSABLE=1 \
  --mount type=bind,src=/absolute/isolated-input,dst=/input,readonly \
  --mount type=bind,src=/absolute/cli-mods/test,dst=/tests,readonly \
  --entrypoint node ccgateway-app:0.1.69 /tests/assembly-replay.cjs \
  > assembly-repair-report.json
```

输入目录放置 manifest 固定 SHA 的 `claude-linux-assembly-fix` 与
`ccg-worker-304-assembly-fix-linux`，Worker 文件须可由 UID 1000 执行，例如权限 0755。
不要挂载 Docker socket、真实用户 HOME 或凭据。
`PROBE_CLI` / `PROBE_WORKER` 可指定路径，实际 SHA 必须仍满足静态 manifest。
`PROBE_MANIFEST` 指定另一个 manifest；`PROBE_CASE_FILTER` 或 `PROBE_CASE_IDS`
只用于明确的子集运行；`PROBE_REPORT` 可额外保存报告。默认执行全部案例。

每项报告包含 `definition_sha256`（输入、合同、环境、模式、策略等可执行定义）、
实际 CLI/Worker SHA、每个断言、内容和参数差异、上游次数。新增或修改定义需重新执行。
`assembly-merge.cjs` 可校验批次 manifest hash、定义 hash、实际 CLI SHA 后合并；
旧定义的结果不能满足新合同。修复前先运行 56 个初版案例，再对加强断言的 72 个案例
完整重跑。修复后新增工具字段存在性／非法形态三项，在新 CLI／Worker 上完整运行 75 项；
tools 缺省和空数组严格区分。默认 enabled thinking 的固定模型条件已有独立原生 AST
oracle，因此精确断言 adaptive＋display updates，不能外推到所有模型。

## 客户端组件的单项、多项与组合测试

完整来源组合是单独的慢速单元套件，不加入每次默认 Node 测试：

```sh
node next/plugins/ccgateway/companions/cli-mods/test/analysis/client-combination-unit.mjs
```

它在固定原生完整模板上穷举 `3^10 × 2^2 = 236196` 个来源组合，逐项校验独立
golden 预期、输入不变、二次应用幂等和 collector 所需字段。collector 和计费生成是
明确的 fixture 替身；报告不把这些调用称为真实 CLI 执行。

真实组件组合使用 `component-combination-replay.cjs`。它先在隔离 Linux 容器内
生成 `PROBE_MANIFEST`，从该容器的 `os.type/release` 与受控工作目录构造独立预期，
再调用标准 `assembly-replay.cjs` 执行 216 项。必须给生成的 manifest 一个输出挂载，
保留该文件供事后门禁校验，例如在上述隔离 Docker 命令中使用：

```sh
# 增加可写的专用测试输出挂载 /output，并设置：
# -e PROBE_MANIFEST=/output/component-combination-cases.json
# 入口换为 /tests/component-combination-replay.cjs
# stdout 保存为 component-combination-report.json
```

CC 与非 CC 各 108 项：12 单字段 worker、10 单字段 erase、66 对字段 worker、
5 组多字段 worker、6 组混合来源、6 次连续切换、all-client、重复应用及 direct。
CC 以官方抓包为主体，换入完整原生客户端环境模板及明确计费哨兵；非 CC 使用普通
Messages 工具往返样本。两者都明确标记 fixture 来源。最终比较完整 system/messages、
工具目录、缓存属性和所有非目标组件；未发生目标变化的同值字段还需结合 collector
和 erase 分支证据判断，不能凭一次文字相等推断来源选择正确。

## 真正启动官方客户端的实时转发

`live-official-client.cjs` 不读取历史请求 fixture。它校验并启动未修改的官方
2.1.304 ELF，让原版 CLI 自己生成请求，再经仅记录原始请求、注入可信测试策略的入口
转发到真实 Worker；修复版 CLI 组装后请求 loopback SSE 上游，响应一路返回原版 CLI。
每项同时检查客户端进程退出、JSON result、入站／出站次数、实际 POST 路径、凭据隔离、
完整内容／工具、实际目标变化和响应完成。

```sh
docker run --rm --name ccg304-live-official \
  --label io.sup2api.task=ccg-304-v12 --network none --user 0 \
  -e CCG_ASSEMBLY_DISPOSABLE=1 \
  --mount type=bind,src=/absolute/isolated-input,dst=/input,readonly \
  --mount type=bind,src=/absolute/cli-mods/test,dst=/tests,readonly \
  --entrypoint node ccgateway-app:0.1.69 /tests/live-official-client.cjs \
  > live-official-client-report.json
```

输入目录另需 `claude-official-304`，SHA 为
`ea0f135784631619a7a409d07322ecec964f9cc4fd377508ed1ba3f141f27912`，须允许 UID 1000
执行。两个修复制品仍使用上述固定身份。每个普通场景使用全新 HOME／目录；会话场景
以原生 `--session-id` 创建，再由原生 `--resume` 发起下一轮，不手工拼接历史。

10 项覆盖默认客户端、单字段、多个字段、混合来源、direct、动态 system 排除参数、
自定义 system，以及会话首轮／恢复轮。恢复轮必须带有首轮用户提示、助手响应和第二轮
用户提示，并保持同一 session ID。开启排除参数时还断言环境实际位于首个 user 载体；
默认调用本次也观察到相同位置，因此不把它描述为相对于默认模式发生了可观测迁移。

代理以原 Buffer 调用 fetch 是源码层证据；只有 direct 场景还独立比较最终模型端
原文字节。不把同一个 Buffer 重复计算哈希当作 Worker 接收端的独立证明。模型上游
为本地模拟响应，官方客户端与 Worker／两份 CLI 均实际执行；不测试生产 Core、
真实账号 OAuth、云模型生成或真实工具执行。
