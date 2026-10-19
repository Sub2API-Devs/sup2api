# Claude Code mods 工具注入扩展

**当前版本为 2.1.302 / `ccgateway-v9-stderr-errors`，完整说明见 [302 独立文档](../../docs/CLAUDE-CODE-2.1.302-ANALYSIS-AND-CHANGES.md)。** v9 新增 `request_error_stderr` 能力：错误通过带版本的 stderr JSON 行交给 Worker，正常 JSON/SSE 继续走 stdout。延续 v8 的显式 API Key / 原生 OAuth 支持；没有 API Key 时使用 CC 读取/刷新凭证及生成 Bearer，并合并原生 OAuth beta。`patch-cli.cjs` 按恢复目录 package.json 选择独立的 `patch-cli-2.1.296.cjs` 或 `patch-cli-2.1.302.cjs`，每个版本仍做自己的哈希和唯一锚点检查。302 基线映射在 `profiles/linux-x64-2.1.302.json`；`--ccgateway-info` 报告补丁能力，Worker 启动还需匹配二进制 SHA-256。296 未在本次重新发布或验证，下面的 v6 限制是历史记录。

302 构建原生 ELF 后，用 `node package-release.cjs <ELF> <ccgateway-patch.json> <新 release 目录>` 生成 Worker 的 `cli-mods/release/` 输入。Worker 与兼容入口 Dockerfile 从此目录安装指定版本，不再在构建时下载官方 CLI。镜像内目录会去掉组/其他用户写权限；Controller 创建账号时验证 manifest、版本与哈希，然后设置禁更和版本环境。管理更新不能把已固定的定制 CLI 替换成官方渠道包。

下面保留的是 2.1.296/v6 的使用背景；**302 的函数名、产物身份和测试以新文档为准**，旧版本文档不覆盖。

此目录维护 Linux x64/glibc Claude Code **2.1.296** 的源码补丁。当前版本 `ccgateway-v6-components-betas` 支持 `claude request --direct/--build --betas "a,b" file.json`，也支持 stdin 和原 `--input`。direct 传完整 HTTP body；build 接收 Worker 提取的组件，复用 CC 内置渲染和构建后单次发送。request 入口仅启用显式 `ANTHROPIC_API_KEY`，不选择或刷新订阅账号。组件契约、构建链和 WebSearch 见 [请求与搜索说明](../../docs/CLAUDE-REQUEST-AND-WEBSEARCH.md)。

v6 中 Worker 提取 user 文本内完整的 `<system-reminder>` 片段和独立 `role:system` 消息，用引用保留原位置。CLI 通过原生 `MDe` 回放提醒文本，通过 `hT/Jan/Xyr` 保留 system 角色、原内容块和生命周期字段；不猜测 CLAUDE.md/memory 类型，也不重新生成 Worker 本机上下文。顶层 system text 块的缓存字段保留。API Key 由 CC 工厂生成认证头，最终发送前隔离 CC/SDK 环境头；beta 在构建前进入原生 beta 描述符流程。

2026-10-18 多轮实测补充：build 部分 tool_result.content 会从字符串转成 text 块数组，文字一致但 JSON 形状不同；direct 保持原文字节。官方本地客户端的工具循环与长报告续写发生在调用方，远端 request 不执行工具。[2.1.296 总记录](../../docs/CLAUDE-CODE-2.1.296-ANALYSIS-AND-CHANGES.md) 留存当前实现、最新测试、日志位置和未解决问题。

固定补丁基线时必须设置 `DISABLE_AUTOUPDATER=1`；本目录 Dockerfile 已固化此变量。若由 Controller 管理 Worker，还需把 `/admin/cli` 的 `auto_update` 设为 false，防止受管更新下载官方版本覆盖定制 ELF。禁用自动更新不阻止手工安装，替换前仍须核对 manifest/hash。2.1.296 是本项目验证基线，不是自动追踪 stable/latest 的声明。

原有 v3 功能仍保留：模型 `tool_use` 交给 mods 的 `tool.call` 处理器，包括原内置工具、MCP 工具、mod 工具和未登记名称；按名称新增或完整替换工具定义，无 MCP 前缀。审计已发现该执行链仍有 context、ask、结构化结果及恢复路径的兼容问题，本次 request 命令未修复这些问题，不将既有测试通过等同于全部 hooks 兼容。

## 使用

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

## 调用语义

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

## 构建

输入必须是已按研究流程恢复的 Linux 2.1.296 模块目录。补丁器校验七个目标 chunk 及 cli.js 的完整 SHA-256，再通过 AST 定位绑定、验证唯一锚点，并记录七个支持模块的哈希。遇到其他版本或修改过的模块直接失败，不猜测偏移。输出目录必须不存在，原目录不会修改。

```sh
cd next/plugins/ccgateway/companions/cli-mods
npm install --ignore-scripts
node patch-cli.cjs /absolute/path/restored /absolute/path/patched
sh build.sh /absolute/path/patched /absolute/path/claude-linux-native
```

使用 **Bun 1.4.3、Linux x64/glibc** 编译。`build.sh` 同时指定 CLI 和 `src/plugins/functionHooks/hooks-worker/hooks-worker.js` 两个入口。仅编译 CLI 会遗漏外部 mods 使用的 worker，虽然 `--version` 和部分 `plugin test` 仍能成功，但实际会话加载 mod 会失败。

如果复用已有 Babel 安装，可以设置 `CCG_BABEL_PACKAGE` 为该安装的绝对 `package.json` 路径，补丁器通过它解析 `@babel/parser`。默认使用本目录安装的依赖。

Dockerfile 的构建上下文需要包含生成的 `claude-linux-native`：

```sh
docker build -f /absolute/path/cli-mods/Dockerfile -t ccgateway-cli:native /absolute/path/binary-directory
docker run --rm ccgateway-cli:native --version
```

## 验证

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

当前端到端验证覆盖 Linux headless 模式。terminal 工具池已接入同一注册表，但交互 TUI、子 agent、ToolSearch 延迟发现及完整历史恢复尚未做端到端验收。Windows/macOS 需要针对对应发行包重新定位、应用补丁和验证。

v3 ELF 已通过 12 个回环场景与 8 项单元测试，另在不安装 Bun 的 Debian 运行镜像中通过版本启动检查。[验证摘要](../../docs/cli-research/2.1.296/mods-all-tools-verification.json) 保存场景、二进制及补丁哈希。研究机镜像为 `ccgateway-cli:mods-hooks-2.1.296`。

普通 mods 工具执行与 request 模式独立。Worker 已通过 CCG_REQUEST_MODE=direct/build 接入 request，模型 tool_use 交回客户端执行。v6 的独立 OVH Worker、官方客户端对照和实际 API Key 请求结果见 [v6 验证](../../docs/cli-research/2.1.296/components-v6-verification.json)。未切换原 21 号服务。
