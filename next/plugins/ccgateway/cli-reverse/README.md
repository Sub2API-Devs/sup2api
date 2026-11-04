# Claude Code 2.1.316 逆向重建

本目录（sup2api 的 `next/plugins/ccgateway/cli-reverse/`）把官方 Claude Code CLI **2.1.316** 还原成一个人能读、能编译运行的源码项目。输入是官方的 linux-x64 单文件可执行程序（sha256 `fd13c700…d824`），还原方法基于 **AST 语法分析**。

交付物是阅读树 [`reconstructed/`](reconstructed/)：

- 源码按旧版目录布局组织，名字已经还原，带出处注释和说明。
- 用和官方相同的 **Bun 1.4.4** 从这些源码构建出 CLI，在 98 个运行场景里，行为和官方原生构建逐字段一致。

所有代码都从官方二进制推导而来。旧版源码（2.1.88，放在 `references/claude-code-analysis`，用 `bash tools/fetch-references.sh` 拉取）只用来提供名字、目录结构和意图线索。

本目录原来是独立仓库 `cc`，2026-11-04 用 `git subtree` 合并进 sup2api 的 ccgateway 模块，原来的提交历史保留。下文所有命令都在本目录执行，路径也都相对本目录。ccgateway 的定制 CLI（`../companions/cli-mods/`）就是建立在 `research/` 的结论之上的。

> 这是一个研究项目。代码版权属于 Anthropic PBC，每个生成文件都保留了原始版权声明。仓库不分发官方二进制本身。

## 最终结果

| 项 | 结果 |
|---|---|
| 声明对应 | 阅读树 81,667 个顶层声明，与官方构建的声明一一对应。每个声明前有一行 `//@ chunk-xxx.js:起-止 <放置依据>` 出处注释，可以追溯到原字节区间；末尾的 `(2.1.88 match: 名字, 相似度)` 是与旧版最相近的函数，只是线索，不一定是这个声明的名字 |
| 一方代码 | 5,295（其中 353 个是动态加载用的再导出入口 `*.lazy.js`） 个文件，82.5 MB；其中 3,280 个文件是 2.1.88 没有、316 新增的 |
| 第三方代码 | 264 个 npm 包，2,027 个文件，15.4 MB；与 npm 源码对齐，文件头写明包名和版本 |
| 可读率（[`tools/verify/readability.mjs`](tools/verify/readability.mjs)） | 一方代码顶层 / 参数 / 局部均为 **100%**（剩余 2 / 60 / 68 个）；第三方 **98.8% / 100% / 100%**（剩余 114 / 1 / 1 个）。成员有意取的短名（`ids`、`ttl`、比较器的 `a/b`）与上游原名（ajv 的 `it`）计为可读，分别统计在 `analysis/readability/summary.json` 的 chosenShort、authenticShort 字段。函数钩子 worker（`src/plugins/functionHooks/hooks-worker/hooks-worker.js`，worker 线程里的另一个程序，不在扫描的 chunk 里，不计入上面的比例）的 208 个绑定另按 [`naming/worker-hooks-worker.json`](naming/worker-hooks-worker.json) 命名，改名时逐个核对引用的绑定不变（[`tools/emit/worker-names.mjs`](tools/emit/worker-names.mjs)） |
| 剩余压缩名 | 共 246 个，全部有原因：`frozen` 111（直接 eval 冻结）、`dead` 35（从未读取）、`authored` 100（作者原名），**命名缺口 0**；逐条原因见 [`analysis/readability/leftover.md`](analysis/readability/leftover.md) |
| 构建 | `reconstructed/` 用 Bun 1.4.4 构建 0 错误，约 25 秒；运行时不读 `original/`、`runnable/`、`artifacts/` |
| 运行一致 | 原版 vs 阅读树构建产物 **98/98** 场景一致；原版 vs 改名树 `runnable/` **98/98** 一致 |
| 改名等价 | α 校验 0 差异：模块内、跨模块、文件级都是 0 |
| 去压缩等价 | 2,650 个模块的 printer 校验和规范形校验都是 0 差异 |
| 声明级等价 | 逐个声明拿阅读树和官方原始字节比结构（[`tools/verify/decl-equiv.mjs`](tools/verify/decl-equiv.mjs)，不依赖场景，覆盖每一行）：81,667 个里 81,662 个一致；官方每条顶层语句都有着落，阅读树没有多出来的逻辑。剩下 5 个都在第三方包里，是有意按 npm 源码写法还原的（`var X = class e {…}` 写成 `class X {…}`，正则 flags `ig` 写成 `gi`），见 [`analysis/verify/decl-equiv.md`](analysis/verify/decl-equiv.md) |
| 静态校验 | 0 解析错误、0 重复声明、0 缺失导入；自由标识符 32 个，与原版集合相同 |
| 文档引用 | 架构文档和 10 本手册的代码引用逐条校验，失效 0 处 |

## 从哪里开始读

| 你想 | 去看 |
|---|---|
| 了解整体架构、一次请求怎么走完 | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| 按子系统深入到函数级 | [`docs/handbook/`](docs/handbook/)：启动、查询循环、工具、权限、扩展、状态、UI、Ink、代理、命令 |
| 读源码 | [`reconstructed/src/`](reconstructed/src/) 是一方代码，按 2.1.88 目录布局；`reconstructed/vendor/` 是第三方包 |
| 找一个函数 | 查 `reconstructed/symbols.jsonl`（名字 → 文件:行、来源、说明），或运行 `node tools/q.mjs find <词>` |
| 了解 316 相对旧版的变化 | 各手册的"与 2.1.88 的差异"一节，以及 [`docs/CHANGES-SINCE-2.1.88.md`](docs/CHANGES-SINCE-2.1.88.md) |
| 了解这个项目是怎么做出来的 | [`docs/PLAN.md`](docs/PLAN.md)、[`docs/WORKLOG.md`](docs/WORKLOG.md)、[`docs/process/`](docs/process/)（各成员的过程记录；问题报告与裁决的对照见 [`docs/process/fixes-index.md`](docs/process/fixes-index.md)） |
| 了解阅读树怎么做到能编译运行 | [`docs/process/buildable.md`](docs/process/buildable.md) |
| 了解官方 CLI 实际发出什么请求、各版本改了什么 | [`research/README.md`](research/README.md)；版本对比工具见 [`tools/versions/README.md`](tools/versions/README.md) |
| 作为 AI 在本目录工作 | [`AGENTS.md`](AGENTS.md) |

## 目录

```
reconstructed/        ★ 阅读树（生成物，入库）
  package.json          npm run build / npm start
  build.mjs             用 Bun 1.4.4 构建 → dist/
  src/                  一方代码（按 2.1.88 布局；316 新增模块放在最合适的目录）
  vendor/               第三方 npm 包（按包名/版本还原的路径）
  runtime/              Bun 打包器运行时辅助、延迟初始化（deferred-init.js）
  assets/               资源文件（提示词、wasm、图片等）
  manifest.json         文件 → 声明列表、出处
  symbols.jsonl         名字 → 文件:行、声明 id、来源、说明
artifacts/official/   官方 ELF（不入库，按 sha256 校验）与 manifest；2.1.304/310/312 在同名子目录
artifacts/versions/   其他版本的还原树与版本配对结果（生成物，不入库）
original/             从 ELF 提取的 2,880 个模块（2,648 个 JS + 232 个资源），只读真值
runnable/             改名后、与 original 同布局的可运行树（生成物，不入库）
analysis/             AST 事实与中间结果：scan / reference / match / vendor / facades / segments / names / readability / verify
naming/               命名与文档输入：semantic-*（语义名）、docs-*（声明说明）、modules-*（模块说明）、placement-*（放置）、_name-shape-verdicts.jsonl（形态裁决）
  final/              合并后的最终命名表（生成物）
tools/                流水线工具：extract / ast / vendor / segment / naming / rename / emit / build / verify / q.mjs；versions/ 是版本对比工具
research/             官方 CLI 行为研究（从 ccgateway 文档与 sup2api artifacts 复制的快照）：请求组装、计费头、附件、第一方/第三方形状、各版本变化、实抓请求
docs/                 架构、手册、过程记录
references/           旧版源码 2.1.88（只读，不入库；bash tools/fetch-references.sh 拉取）
```

## 构建和运行阅读树

需要 Node.js 22 或更高版本，以及 Bun **1.4.4**。构建脚本会拒绝其他版本的 Bun，除非加 --any-bun 参数（见 `reconstructed/build.mjs` 开头的说明）。

```bash
cd reconstructed
```

```bash
npm run build
```

```bash
npm start -- --version
```

也可以直接用 Bun 运行产物：

```bash
bun reconstructed/dist/cli.js -p "hello"
```

`build.mjs` 按以下顺序找 Bun：`--bun <路径>`、环境变量 `$BUN`、本目录或上级目录的 `node_modules/bun/bin/bun[.exe]` 或 `node_modules/@oven/bun-<平台>/bin/bun[.exe]`、`PATH` 里的 `bun`。在本目录执行过 `npm ci --ignore-scripts` 后，会用装好的 Bun 1.4.4（不跑 postinstall 时 `node_modules/bun/bin` 里只是占位文件，真正的二进制在 `@oven/bun-<平台>` 包里）。

## 从官方二进制重建全部内容

```bash
npm ci --ignore-scripts
```

```bash
bash tools/fetch-references.sh
```

```bash
node tools/extract/restore-bun.cjs artifacts/official/claude-linux-x64 original 2.1.316
```

```bash
SCAN=1 VERIFY=1 bash tools/pipeline.sh
```

说明：

- 官方 ELF 放在 `artifacts/official/claude-linux-x64`，sha256 见 `artifacts/official/official-manifest.json`。没有这个文件时，运行 `node tools/extract/acquire.mjs 2.1.316 linux-x64 artifacts/official` 下载并校验。需要代理时加 `NODE_USE_ENV_PROXY=1 HTTPS_PROXY=…`。`tools/extract/restore-bun.cjs` 的目标目录 `original/` 必须不存在。
- 流水线依次做：AST 扫描 → 与 2.1.88 匹配 → 门面导出名 → 切分与放置 → 命名合并 → 生成 `runnable/` 并做 α 校验 → 生成 `reconstructed/` → 构建阅读树。
- 加 `VERIFY=1` 时，最后还会跑运行对拍和全部静态校验，大约需要 1 小时。
- 第三方识别要联网下载 npm 包，约 15 分钟，结果已经入库，一般不用重跑：

```bash
bash tools/vendor/run.sh
```

## 验证方法

`VERIFY=1 bash tools/pipeline.sh` 会依次跑下面全部检查，每一项也可以单独运行：

| 检查 | 命令 | 证明什么 |
|---|---|---|
| 运行对拍：改名树 | `node tools/verify/compare.mjs original runnable` | 改名后的程序行为不变 |
| 运行对拍：阅读树 | `node tools/verify/compare.mjs original reconstructed/dist` | **从阅读树源码构建出的 CLI 与官方构建行为一致** |
| α 等价 | `node tools/rename/apply.mjs original naming/final runnable --force --check` | 改名前后 AST 只差绑定名，绑定对应是双射，跨模块导入导出一致 |
| 去压缩等价 | `node tools/emit/deminify-dir.mjs runnable <out> --check-printer --check-canonical` | `!0 → true`、拆逗号表达式等改写不改变语义；改写后的树同样跑 98 个场景 |
| 静态完整性 | `node tools/verify/readable-check.mjs` | 81,667 个声明齐全且各出现一次，可解析、无重复、导入都能解析，自由标识符与原版相同 |
| 声明级等价 | `node --max-old-space-size=12000 tools/verify/decl-equiv.mjs` | 每个声明出处注释后面的代码，与官方原始字节在去掉名字、去压缩改写和阅读树布局（`export`、`deferInit` 包装、模块路径）之后结构相同，绑定关系一一对应；场景没走到的代码也覆盖 |
| 可读率 | `node tools/verify/readability.mjs` 和 `node tools/verify/leftover.mjs` | 各类绑定的可读比例，以及剩余压缩名的逐条原因 |
| 名字形态 | `node tools/verify/name-shape.mjs naming/final analysis/name-shape` | 名字和初值形态不符的地方（例如 `isX` 是字符串）全部人工裁决过 |
| 文档引用 | `node tools/verify/doc-refs.mjs . docs/ARCHITECTURE.md docs/handbook/*.md` | 文档里的路径、声明 id、函数名、字面量在阅读树中都存在 |

运行对拍的做法：

- 用 Bun 1.4.4 在隔离沙箱里分别运行两边的程序。
- 本地起一个假的 Anthropic API，记录每一个请求。
- 输出、退出码、屏幕内容、请求体、写出的文件经过归一化（时间、随机 id、路径）之后逐字段比较。

98 个场景按类别：

| 类别 | 场景数 | 内容 |
|---|---|---|
| version / help | 20 | 版本信息、各级子命令帮助 |
| print | 17 | `-p` 模式 |
| ink / tty | 23 | 伪终端里的交互界面：多轮对话、权限接受与拒绝、Esc 中断、斜杠菜单、模式切换、`!` bash 模式、`--continue`/`--resume` |
| tool | 7 | 工具调用往返 |
| perm | 9 | 权限：各种权限模式和 settings 规则 |
| mcp | 6 | MCP 服务器：资源、提示、连接失败、项目配置 |
| plugin | 6 | 插件：目录插件、命令、技能与钩子、校验、市场生命周期 |
| session | 5 | 会话恢复：按 id、`--continue`、fork、带工具历史 |
| 其他 | 5 | hook、doctor、agents、update、非法参数 |

场景定义在 [`tools/verify/scenarios.mjs`](tools/verify/scenarios.mjs)，每次的结果写在 `analysis/verify/<名>.md`。

## 命名来源与可信度

阅读树中的名字按以下优先级取：

| 来源 | 含义 | 可信度 |
|---|---|---|
| `facade` | Bun 门面 chunk 里的 `export{x as 原名}`，是源码原始的导出名 | 确定 |
| `semantic` | 领域成员读代码后起的名字，带说明 | 高 |
| `vendor` | 与 npm 包源码对齐得到的名字 | 高 |
| `reference` | 与 2.1.88 源码匹配得到的名字（指纹 + 调用图） | 中 |
| `auto` | 从代码证据推出的名字（解构键、方法名、`catch` → `error`、调用方实参名…） | 低 |

每个名字的来源见 `reconstructed/symbols.jsonl` 和 `naming/final/top.json`。

## 已知限制

- **剩余压缩名**：清单和原因见 `analysis/readability/leftover.md`。原因分四类：
  - `frozen`：protobufjs 的 `inquire` 在所在 chunk 里用了直接 `eval`，改名器为保证语义冻结了整个 chunk。
  - `dead`：从未被读取的变量和参数。
  - `authored`：未压缩的随包脚本里，作者自己起的短名。
  - `unnamed`：命名缺口。
- **`_2` 后缀**：同一作用域内两个声明起了同一个名字时，后出现的那个带 `_2`（`_3`…）后缀。一方代码顶层有 1,777 个这样的名字。2026-11-04 核对：其中 697 个和不带后缀的那个是同一份代码（Bun 把同一函数内联进了不同 chunk）；**另外 967 个代码不同**，例如 `src/utils/errors.js` 的 `getErrnoPath` 与 `getErrnoPath_2`、`ThemeProvider.js` 的 `useTheme`（返回 `[主题, 设置函数]`）与 `useTheme_2`（读 context）。这些名字还需要逐个区分。
- **React Compiler 记忆化缓存**：316 的界面组件是 React Compiler 编译过的，565 个文件里有 `if ($[41] !== width) { … $[41] = width; … } else x = $[40];` 这样的按下标缓存，`t0`、`t1` 是编译器的临时变量名。这是官方产物本来的样子，去掉会改变重新渲染的行为，所以阅读树保留了它。读组件时，可以把每段缓存当成一次 `useMemo` 来看。
- **大文件**：`src/cli/print.js` 有 19,127 行（2.1.88 的 `print.ts` 是 5,594 行），`src/services/mcp/client.js` 有 16,083 行。这两个文件声明不多（print.js 69 个），主要是单个函数在 316 里变大了。`src/utils/releaseNotes.js` 里有一个 9 万字符的字符串字面量。
- **第三方包的写法**：少数第三方声明按 npm 源码的写法还原（`var X = class e {…}` 写成 `class X {…}`），和官方字节在提升和暂时性死区上有细微差别。声明级校验列出了全部 5 处。
- **延迟初始化包装**：阅读树按源模块拆成了几千个 ES 模块，模块之间有一个 3,675 个模块组成的导入环（官方构建启动时只求值 8 个 chunk）。为了保持官方的求值顺序，有 5,801 条顶层语句被包在 `deferInit("<chunk>:<偏移>", () => {…})` 里，等导入环加载完成后再按官方顺序执行，每处都有注释说明原因。其中 2,852 条只是为了保持副作用的先后顺序，用更细的副作用分析可以减少。做法和等价性论证见 [`docs/process/buildable.md`](docs/process/buildable.md)。
- **启动速度**：阅读树构建的 CLI 比官方慢约 0.6 秒。官方用的是 bytecode 编译，而 `--compile --bytecode` 在这棵树上生成 bytecode 失败，没有深究。
- **和官方原生二进制的运行时差异**：官方 ELF 内嵌的是私有修订的 Bun 1.4.4。它在发送前把计费头里的 `cch=00000` 改写成按请求计算的值，报告的 Node 版本是 v26.12.1；公开的 Bun 1.4.4 不改写 `cch`，报 v26.3.0。阅读树构建的 CLI 跑在公开 Bun 上，所以这两处与官方原生运行时不同（对拍时两边都在公开 Bun 上跑，因此一致）。见 [`research/README.md`](research/README.md)。
- **场景覆盖**：运行对拍覆盖 98 个场景，场景没走到的路径只有静态证据（声明一一对应、α 等价、规范形等价）。"加载时依赖"的判断是近似的，场景外的启动路径理论上仍可能有顺序问题。函数钩子 worker 只验证了能启动。
- **文件归属**：一个源文件在官方构建里会被拆散到多个 chunk。归属先按门面导出、2.1.88 匹配和调用关系推断，再经过四轮人工复核（[`docs/process/fixes-index.md`](docs/process/fixes-index.md)），但仍是推断，不是源码真值。
- **旧版对照**：`reference` 来源的名字依赖与 2.1.88 的匹配。316 改过的函数可能沿用旧名，名字形态检查和人工复核能兜住一部分。
