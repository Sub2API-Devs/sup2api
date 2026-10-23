# CCGateway 定制 Claude Code CLI（cli-mods）

本目录维护账号 Worker 里运行的定制 Claude Code：对官方 Linux x64/glibc 版本的源码补丁、补丁加进去的 `claude request` 命令及其支持模块，以及打包脚本。Worker 对每个模型请求运行一次 `claude request --build|--direct`（CONTRACTS §53.21），工具调用交回客户端。

## 当前版本

**Claude Code 2.1.304 / `ccgateway-v23-bound-imports`**（2026-10-24 工作树，未编译未发布；上一版 `ccgateway-v22-client-entrypoint` 随插件 0.1.83 起；profile `profiles/linux-x64-2.1.304.json` 的 `extension`）。用 Bun 1.4.3 编译（官方 2.1.304 内嵌 Bun 1.4.4，边界见 [REQUEST-HEADERS](../../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md)「已知边界」）。

CLI 经 `claude --ccgateway-info` 报告版本、补丁标签和能力；能力列表只有一处——`profiles/linux-x64-2.1.304.json` 的 `capabilities`（2026-10-24 工作树；之前是 `patch-cli-2.1.304.cjs` 里的常量）：

`request_direct`、`request_build`、`request_oauth`、`request_error_stderr`、`request_raw_http_errors`、`native_tools`、`mods_dispatch`、`request_policy_mode_v1`、`build_attachment_sources_v2`、`build_billing_sources_v1`、`build_content_preservation_v1`、`container_resource_reporting_v1`、`request_identity_v1`、`build_identity_line_v1`、`direct_billing_v1`、`request_agent_context_v1`、`build_injection_v1`、`request_levels_v1`、`client_user_agent_v1`。

各能力的含义与核心、Worker 怎样要求它们，见 [build 设计](../../docs/BUILD-REQUEST-COMPONENTS-DESIGN.md) §10。`native_tools`、`mods_dispatch` 是 2.1.296 时期 mods 工具扩展留下的声明，Worker 已不使用（见文末历史）。

现行行为的事实源：

| 主题 | 文档 |
|---|---|
| build 组件、内容改写、计费头、身份 | [BUILD-REQUEST-COMPONENTS-DESIGN](../../docs/BUILD-REQUEST-COMPONENTS-DESIGN.md) |
| 注入等级（0/微/低/高）、身份行自适应、各层注入 | [CC-INJECTION-LEVELS-DESIGN](../../../../docs/ccgateway-feature-support/CC-INJECTION-LEVELS-DESIGN.md) |
| 请求类别（主线程/子代理/压缩）、prompt ID | [SUBAGENT-REQUEST-CONTEXT-DESIGN](../../docs/SUBAGENT-REQUEST-CONTEXT-DESIGN.md) |
| 请求头的去向、请求入口与 UA | [REQUEST-HEADERS](../../../../docs/ccgateway-feature-support/REQUEST-HEADERS.md) |
| 模式、策略头、能力门、错误来源 | [REQUEST-MODES](../../docs/REQUEST-MODES.md) |

## 文件

| 文件 | 作用 |
|---|---|
| `patch-cli.cjs` | 读恢复目录 `package.json` 的版本，只接受 2.1.304，转给 `patch-cli-2.1.304.cjs`（2.1.296、2.1.302 的补丁器与 302 profile 已删除，2026-10-24 工作树，审核 D6） |
| `patch-cli-2.1.304.cjs` | 校验 profile 里每个模块的 SHA-256（被改写的模块与补丁导入的原生模块），按 AST 定位唯一锚点改写，校验补丁新增的每个导入名确由对应模块导出（`checkImports`，审核 D3），复制支持模块（加 `ccgateway-` 前缀），写出 `ccgateway-patch.json`（补丁标签、能力、改前改后哈希） |
| `profiles/linux-x64-2.1.304.json` | 官方 ELF 的 SHA-256、补丁标签 `extension`、能力 `capabilities`、模块哈希 `modules` |
| `request-entry.inc.js` | 插进入口函数（`cli.js` 的 `Ve`）的 `--ccgateway-info` 与 `request` 分支 |
| `request-command.js` | `claude request` 入口：读输入、direct 计费头、调 build、身份与身份行、发送、错误帧 |
| `request-build-2.1.304.js` | build：内容策略、注入层探针、原生构造器、参数并回、计费合并 |
| `shared.js` | 支持模块共用的小函数（`object`、`toBlocks`、`systemTexts`、UUID 正则、`splice`），装成 `ccgateway-shared.js` |
| `request-input.js`、`request-parameters.js`、`request-policy.js`、`content-policy.js`、`direct-billing.js`、`request-identity.js`、`request-agent.js`、`request-options.js`、`request-output.js`、`request-error.js`、`model-request.js`、`container-resources.js`、`native-tools.js` | 支持模块 |
| `native-environment-2.1.304.inc.js`、`tool-dispatch.inc.js` | 拼进原生模块作用域的代码（原生环境读取与词表、工具分发） |
| `build.sh` | 用 Bun 编译 ELF |
| `package-release.cjs` | 把 ELF 和补丁清单打成 Worker 镜像用的 `release/` 目录 |

## 打包步骤（2.1.304）

1. **准备恢复的源码目录**：官方 2.1.304 ELF（SHA-256 等于 profile 的 `binarySHA256`）解包出的模块目录，如 `artifacts/claude-2.1.304/linux-restored`。补丁器只认 profile 里的模块哈希，其他版本或改过的模块直接失败。
2. **改代码时先升补丁标签**：任何补丁或支持模块的变化都要改 `profiles/linux-x64-2.1.304.json` 的 `extension`（`ccgateway-vNN-<名字>`）；Worker 镜像构建按它核对 release，旧标签的产物会让镜像构建失败。
3. **补丁**（输出目录必须不存在，原目录不改）：

   ```sh
   cd next/plugins/ccgateway/companions/cli-mods
   npm install --ignore-scripts
   node patch-cli.cjs /absolute/path/restored /absolute/path/patched
   ```

   复用已有 Babel 时可设 `CCG_BABEL_PACKAGE` 为该安装的 `package.json` 绝对路径。
4. **编译**（Bun 1.4.3）：在 Linux x64/glibc 上 `sh build.sh /absolute/path/patched /absolute/path/claude-linux-native`；在其他系统上交叉编译用同样两个入口加目标：

   ```sh
   cd /absolute/path/patched
   bun build cli.js src/plugins/functionHooks/hooks-worker/hooks-worker.js --compile --target=bun-linux-x64 --outfile /absolute/path/claude-linux-native
   ```

   两个入口都必须给：只编 `cli.js` 会漏掉 hooks worker。
5. **打包**：

   ```sh
   node package-release.cjs /absolute/path/claude-linux-native /absolute/path/patched/ccgateway-patch.json /absolute/path/new-release
   ```

   脚本只接受补丁标签等于 profile `extension` 的清单，输出目录必须不存在；产物是 `<版本>/claude`、`<版本>/ccgateway-patch.json` 与 `manifest.json`（版本、SHA-256、补丁标签、`modes: ["build","direct"]`）。
6. **放进 Worker 构建上下文**：用新目录替换 `cli-mods/release/`（不进 Git）。`companions/worker/Dockerfile` 把它装到 `/opt/ccgateway/cli/`，构建时核对 ELF 的 SHA-256 与 manifest 一致、manifest 的补丁标签与 profile 一致；控制器创建或配对更新账号容器时再按 manifest 校验版本与哈希，Worker 启动时校验固定版本、补丁标签与哈希。
7. **测试**：`npm test`（`node --test test/*.test.mjs`）。原生词表与层词表夹具在恢复源码上执行原生函数生成，变化时用 `CCG_UPDATE_CONTRACT_FIXTURES=1` 重生成；跨层夹具在 `companions/contracts/testdata/`。与原生对账的测试（`native-vocabulary`、`cli-prefix` 末项、`billing-fingerprint-oracle`、`patch-imports-304`）在恢复源码目录存在时必须真跑；目录不存在时跳过并在 stderr 打印 `CCG_NATIVE_TEST_SKIPPED <原因>`，设 `CCG_REQUIRE_ARTIFACTS=1` 时改为失败（`test/artifacts.mjs`）。`patch-wire-preservation-304` 缺恢复源码时直接失败。

## 版本记录（2.1.304）

只列每版留下的现行规则；被后续版本推翻的写明。细节见各设计文档。

| 版本 | 插件 | 内容 | 现状 |
|---|---|---|---|
| v23 `bound-imports` | 未发布 | 补丁导入的 5 个原生模块（`chunk-7y2kvacy/jkcb7qdd/m5q1b1c4/eanw7pgv/t2p0d04m`）加入 profile 哈希绑定，补丁期校验新增导入名确由目标模块导出（D3）；能力列表只在 profile、入口代码移到 `request-entry.inc.js`（D7）；删 296/302 补丁器与死代码（D6）；支持模块重构（`shared.js`）。原生模块字节与 v22 相同，`cli.js` 只差标签与入口代码的排版/注释（词法记号相同），出口字节不变 | 待编译 |
| v22 `client-entrypoint` | 0.1.83 | 请求入口由 CLI 按请求设置（`requestEntrypoint` → 原生 `setEntrypointOnRequests`），计费头与 UA 读同一个值；CC 形状的客户端 UA 在计费头的 `cc_version`/`cc_entrypoint` 仍是客户端的时原样保留（`keepClientUserAgent`）；能力 `client_user_agent_v1` | 现行 |
| v21 `native-layers` | 0.1.80 | 注入层的写死项改成原生提取：权限上下文 `gd()`、按非交互主线程 `xh` 组装提示词、追加提示词用原生 `pr`、剩余 token 用 `JDr` | 现行 |
| v20 `request-levels` | 0.1.79 | 注入等级：direct 只处理计费头、不补身份行；非 CC 请求按主线程；已有的层不重复补；身份行自适应（不再按入口配置）；system 统一为块数组；能力 `request_levels_v1` | 现行 |
| v19 `request-layers` | 0.1.78 | 非 CC 请求按配置注入提示词、首轮附件、工具（探针构建）；能力 `build_injection_v1` | 配置模型被 v20 取代 |
| v18 `agent-context` | 0.1.75 | 按客户端还原请求类别（`CCG_REQUEST_AGENT`）；能力 `request_agent_context_v1` | 现行；"非 CC 请求当子代理"被 v20 改为主线程 |
| v17 `identity-line` | 0.1.74 | 服务端入口六选一；计费头不在首块开头按缺失处理；能力 `build_identity_line_v1`、`direct_billing_v1` | 入口现行；"身份行按入口配置"与"direct 补身份行"被 v20 取代 |
| v16 `build-prefix` | 0.1.73 | build 总带计费头；指纹改为取第一个非 reminder 的 text 块 | 现行；"direct 纯透传"被 v17 取代 |
| v15 `cli-prefix` | 0.1.72 | 内容策略的识别文字改为运行时从原生 CLI 取得 | 现行；"build 与 direct 都补开头行"被 v16/v20 取代 |
| v14 `account-identity` | — | 按账号邮箱派生密钥映射 `metadata.user_id`（只 OAuth）；build 不发自己编的 `diagnostics`；容器资源报告 | 映射现行；"身份来源在插件设置中配置"已取消（2026-10-21 起不可配置，固定 `replace`，见 build 设计第 7 节） |
| v12 `feature-policy` 及以前 | ≤0.1.71 | 2.1.304 的第一版补丁：十个环境字段来源、外部历史保真 | 见 [CC-FEATURE-LAYERS-DESIGN](../../../../docs/ccgateway-feature-support/CC-FEATURE-LAYERS-DESIGN.md) |

2.1.302（v7–v11）与 2.1.296（v3–v6）的记录分别在 [302 文档](../../docs/CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md) 与 [296 文档](../../docs/CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES.md)；两个旧补丁器在 2026-10-24 工作树里已删除（审核 D6），需要时从 git 历史取。

## 历史：2.1.296 的 mods 工具注入扩展（v3–v6）

> 以下是 2.1.296 时期的说明，Worker 已不使用 mods（native 运行时 2026-10-24 删除，CONTRACTS §53.21）。补丁里的工具分发代码仍在，对应 `native_tools`、`mods_dispatch` 两个能力声明。保留原文供查阅。

固定补丁基线时必须设置 `DISABLE_AUTOUPDATER=1`；本目录 Dockerfile 已固化此变量。若由 Controller 管理 Worker，还需把 `/admin/cli` 的 `auto_update` 设为 false，防止受管更新下载官方版本覆盖定制 ELF。禁用自动更新不阻止手工安装，替换前仍须核对 manifest/hash。2.1.296 是本项目验证基线，不是自动追踪 stable/latest 的声明。

原有 v3 功能仍保留：模型 `tool_use` 交给 mods 的 `tool.call` 处理器，包括原内置工具、MCP 工具、mod 工具和未登记名称；按名称新增或完整替换工具定义，无 MCP 前缀。审计已发现该执行链仍有 context、ask、结构化结果及恢复路径的兼容问题，本次 request 命令未修复这些问题，不将既有测试通过等同于全部 hooks 兼容。

### 使用

下面的 `kind: 'native'` 是本项目扩展。使用本目录构建的 CLI，在 mod 的 `hooks/register.js` 中注册：

```js
export function register(on) {
  on('session.start', async ($, e, next) => {
    const registered = await $.tool.register({
      kind: 'native',
      name: 'Bash', // 同名则替换；改成 MyTool 则添加。
      description: '由我的 mod 处理脚本请求',
      inputSchema: {
        type: 'object',
        properties: { script: { type: 'string' } },
        required: ['script']
      }
    });
    // 原版 CLI 不支持 kind，会走 MCP；检查返回名称避免误用。
    if (registered.tool !== 'Bash') throw new Error('需要带 native-tools 扩展的 CLI');
    return next(e);
  });

  on('tool.call', { tool: 'Bash' }, async ($, e) => {
    // 在这里自行校验参数、执行逻辑，并返回结果。
    return { result: { received: e.script } };
  });
}
```

配套清单仍是标准 mods 格式：`.claude-plugin/plugin.json` 声明插件，`hooks/hooks.json` 使用 `{"modules":["./register.js"]}`。完整可运行示例见 [测试 mod](test/fixture/hooks/register.js)。

未指定 `kind: 'native'` 的 `$.tool.register()` 仍通过原 MCP 路径注册带前缀的定义，但调用也统一交给 mods。注册仍通过现有 tool.register 事件入口及名称、描述、Schema 对象形式校验；native 分支不进入原 MCP 注册器的限制。工具调用不再要求事先成功注册，模型返回的未知名称也能被 mod 接管。

### 调用语义

1. 按会话保存定义；同名注册以最后一次成功注册为准，替换整个工具对象。
2. 在 headless 和 terminal 工具池最终合并定义，更新缓存版本。不会套用原工具的 allowed/disallowed、`--tools` 等筛选。
3. 模型工具定义使用注册的名称、描述及 JSON Schema。后续 `tool.describe` mod 仍可以调整描述。
4. 对所有工具跳过模型响应中的参数规范化、修复和 Schema 解析，也不拆解批量工具包装调用。
5. 流式调用队列不再检查工具是否在可用列表中，也不调用原 Schema 或 isConcurrencySafe；统一串行排队。取消和队列生命周期仍正常工作。
6. 替换原 `runToolUse` 为统一的 mods 分发入口，不进入工具查找拒绝、隔离检查、远程路由、参数转换或内置执行权限检查。
7. 调用前运行配置的 PreToolUse hooks；更新后的参数交给 mod。hook 主动拒绝或要求停止时照常阻断，不把 hook 的决策当作应删除的内置检查。
8. mod 返回结果后运行 PostToolUse，支持结果改写；附加上下文的保留存在已记录的兼容缺口，不能声称全部 context 语义已恢复。mod 失败或无人接管时运行 PostToolUseFailure。不调用原工具执行器或输出 Schema 校验，结果仍进入 CLI 的正常消息和模型循环。

`inputSchema` 是给模型看的定义，调用路径不根据它拦截输入，原内置工具也是如此。参数校验和执行由 mod 自行负责。事件沿用官方扁平结构，参数从 `e.script` 等字段读取；`tool` 和 `tool_use_id` 为事件元数据，不可作为同名业务参数使用。mod 自身宿主 API 的权限、模块加载策略和会话取消不属于旧工具权限，不被本补丁删除。显式关闭 hooks 的配置仍生效。PreToolUse 的 `ask` 当前在 headless 路径返回“需要批准”的工具错误，不自动放行，也不恢复原工具权限弹窗。

工具的模型可见目录与收到调用后的执行入口是两个层面：未被替换的官方工具仍按原配置决定是否展示；即使它因为 disallowedTools 没有展示，收到该名称的调用后也不会拒绝，而是直接交给 mods。mod 注入的定义在最终工具池合并，因此其展示不受原列表过滤影响。

任何工具无人接管或最终调用 `next()` 时都返回 `No tool.call mod handler answered ...`，不会执行原内置工具或 MCP 服务。无需改定义的原内置工具只需注册 tool.call 处理器，无需先执行 $.tool.register。注册记录在进程内按会话隔离；目前没有额外提供 unregister API，恢复会话时由 mod 重新注册。

### 2.1.296 的构建与验证

2.1.296 的补丁器（已删除，见 git 历史）校验七个目标 chunk 及 cli.js 的完整 SHA-256，再通过 AST 定位绑定、验证唯一锚点，并记录七个支持模块的哈希。

Dockerfile 的构建上下文需要包含生成的 `claude-linux-native`：

```sh
docker build -f /absolute/path/cli-mods/Dockerfile -t ccgateway-cli:native /absolute/path/binary-directory
docker run --rm ccgateway-cli:native --version
```

```sh
npm test
bun test/runtime-probe.cjs /absolute/path/claude-linux-native - /tmp/native-result.json denied
# 源码版：
bun test/runtime-probe.cjs /absolute/path/bun /absolute/path/patched/cli.js /tmp/source-result.json normal
```

运行探针会启动回环模拟模型服务，使用临时配置和假密钥，不调用真实模型。每次测试强制返回指定工具调用，捕获下一轮请求中的结果，并记录配置 hooks 的事件。可选场景：`normal`、`denied`、`disabled`、`unhandled`、`reregister`、`mcp`、`control`、`original`、`original-denied`、`unknown`、`hooks-update`、`hooks-deny`。

- `denied`：显式禁止 Bash/NativeEcho，mod 仍接收调用。
- `disabled`：`--tools ""`，mod 工具仍可见并可调用。
- `unhandled`：无人接管，明确报错，不执行原工具。
- `reregister`：调用过程中重新注册，下一轮看到新描述和 Schema。
- `mcp`：普通注册仍带 MCP 前缀，调用直接由 mod 处理。
- `original`：不替换定义，原 Bash、Read、TaskCreate、WebFetch 的不匹配参数仍到达 mod。
- `original-denied`：原工具被 disallowedTools 隐藏，调用仍到达 mod。
- `unknown`：未登记名称不会被流式队列拒绝，mod 仍能处理。
- `control`：原 Bash 无 mod 接管，返回未实现错误，触发 PreToolUse 和 PostToolUseFailure。
- `hooks-update`：PreToolUse 改写参数，mod 收到新参数；PostToolUse 改写结果，模型收到新结果。
- `hooks-deny`：PreToolUse 显式拒绝后不执行 mod，也不执行成功后置 hook。

每个场景都验证 SessionStart；每次工具调用都验证 PreToolUse 恰好一次，执行成功或失败后分别验证对应后置 hook 恰好一次。旧 v2 误将工具 hooks 一并跳过，已由 v3 修正，不应继续使用旧包。

探针故意提供新 Schema 之外的额外参数，检查它仍原样到达 mod；同时检查日志中没有触发旧工具规范化。断言容许 CLI 在工具结果之后附加自身的 system-reminder。

当时的端到端验证覆盖 Linux headless 模式。terminal 工具池已接入同一注册表，但交互 TUI、子 agent、ToolSearch 延迟发现及完整历史恢复未做端到端验收。v3 ELF 通过 12 个回环场景与 8 项单元测试，[验证摘要](../../docs/cli-research/2.1.296/mods-all-tools-verification.json) 保存场景、二进制及补丁哈希。
