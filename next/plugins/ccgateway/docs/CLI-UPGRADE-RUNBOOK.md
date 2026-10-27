# 升级 Claude Code CLI 的操作手册

2026-10-27。适用于把账号 Worker 里的定制 CLI 从一个 Claude Code 版本移到另一个版本（2.1.304 / `ccgateway-v31-request-capture` → 2.1.310 / `ccgateway-v32-cc-2-1-310` 就是按本手册做的，过程记录在 [CLAUDE-CODE-2.1.310-MIGRATION](CLAUDE-CODE-2.1.310-MIGRATION.md)），也适用于同版本只改补丁后的重新编译与发布（从第 4 步开始）。

前提与边界：

- 只支持 Linux x64/glibc（Worker 镜像基于 `node:22-bookworm-slim`，profile 名是 `linux-x64-<版本>.json`）。
- 补丁器结构：通用的 `cli-mods/patch-cli.cjs` + 每版一份 `patches/<版本>.cjs`（锚点）与 `profiles/linux-x64-<版本>.json`（原生名字表），环境代码 `native-environment.inc.js` 不带版本号；支持模块只按逻辑名从生成的 `native-<组>.js` 导入原生函数（见 cli-mods README）。
- 分析工具在 `cli-mods/tools/upgrade/`，用 cli-mods 自己的 devDependencies（在 cli-mods 下 `npm install --ignore-scripts` 一次即可）。
- 测试的门槛与用例在 [CLI-TEST-PLAN](CLI-TEST-PLAN.md)（另行编写）；本手册只列必须过的关口。
- Worker 怎样调用 CLI、哪些能力被检查，见 [WORKER-ENGINE](WORKER-ENGINE.md) 第 2、6 节。

下文路径：`artifacts/` 是仓库根目录下不进 Git 的工作区；`cli-mods/` 指 `next/plugins/ccgateway/companions/cli-mods/`。

## 硬性规则：编译用的 Bun 必须与官方一致

**定制 CLI 必须用官方 ELF 内嵌的那个 Bun 版本编译。** Bun 的 TLS 栈就是上游看到的传输层指纹：2026-10-27 实测，Bun 1.4.3 编出的 CLI 与官方 JA3 相同、JA4 不同（签名算法少 Ed25519、ECDSA P-521），同一份补丁用官方内嵌的 Bun 1.4.4 编译后 ClientHello 与官方完全相同（v33）。所以 Bun 版本不是“随手选一个能编的”，而是由官方 ELF 决定，并且**不需要人记得去核对**——下面每一步都会自动检查，版本不一致就直接失败：

| 步骤 | 自动检查 | 不一致时 |
|---|---|---|
| 还原 `tools/upgrade/restore-bun.cjs` | 从官方 ELF 读出 `Bun v<版本> (<修订>)`，写进 `reconstruction.json` 的 `bunVersion`/`bunRevision` | ELF 里找不到 Bun 版本即失败 |
| 补丁 `patch-cli.cjs` | profile 的 `bunVersion` 必须等于 `reconstruction.json` 的 `bunVersion`（还原树也必须是 profile 的官方 ELF）；写进 `ccgateway-patch.json` | 报错并给出应填的版本与 `oven/bun:<版本>` |
| 编译 `build.sh` | `bun --version` 必须等于 `ccgateway-patch.json` 的 `bunVersion` | 拒绝编译 |
| 打包 `package-release.cjs` | 补丁清单与 profile 的 `bunVersion` 一致；ELF 里必须是 `Bun v<bunVersion> (` | 拒绝打包 |
| Worker 镜像构建 `worker/Dockerfile` | release 里的 ELF 必须是 profile `bunVersion` 编出的 | 镜像构建失败 |
| 单测 `npm test`（`test/bun-version.test.mjs`） | 每个 profile 都有 `bunVersion`；有还原树时必须等于官方内嵌版本；上面四道关卡都还在 | 测试失败 |
| 发布前 `test/e2e/tls-fingerprint.sh` | 官方 CLI 与定制 CLI 的 ClientHello 逐项比较（JA3/JA4、扩展、签名算法等） | 结果写进迁移记录，必须是 identical |

换 Claude Code 版本时唯一要手工做的是：按补丁器的报错把新 profile 的 `bunVersion` 填成官方内嵌版本，用 `oven/bun:<该版本>` 镜像编译（ovh 上先 `docker pull oven/bun:<版本>`）。官方修订号（如 2.1.310 的 `2c2ae6246`）与 Docker 镜像的修订号（`38afee6c8`）不同不影响：只核对版本号，TLS 指纹已实测一致。

## 1. 选择版本，下载并校验

1. **查当前版本号**：发布渠道 `https://downloads.claude.ai/claude-code-releases/latest` 与 `.../stable` 各返回一个版本号文本（Worker 的 `/admin/cli` `check` 动作读的就是它们，`engine/cli_management.go`）。本机访问要走 http 代理 `127.0.0.1:7890`（`HTTPS_PROXY=http://127.0.0.1:7890`）。
2. **取清单**：`https://downloads.claude.ai/claude-code-releases/<版本>/manifest.json`，含 `version`、`commit`、`buildDate`、`platforms.<平台>.{checksum, size}`。保存为 `artifacts/claude-<版本>/official-manifest.json`。
3. **下载**：`https://downloads.claude.ai/claude-code-releases/<版本>/linux-x64/claude` → `artifacts/claude-<版本>/claude-linux-x64`。核对 SHA-256 等于 `platforms.linux-x64.checksum`、字节数等于 `size`。样板：`artifacts/claude-2.1.304/acquire.py`（版本写死在脚本里，复制后改版本；先写 `.part` 再改名，校验不过就失败）。
4. 下载的二进制是不可信数据：放进它自己的新目录，不在那个目录里运行脚本。
5. 选版本时先看与当前版本的距离：跨度越大，第 3 步的变化面越大。2.1.304 → 2.1.310 的对比结果（`artifacts/claude-2.1.310/equiv.out`）可作参照。

## 2. 还原源码

官方 ELF 是 Bun 编译的单文件（2.1.304、2.1.310 都内嵌 Bun 1.4.4，模块已编成字节码），但模块表里仍带着每个模块的源码，可还原成一个 ESM 源码目录。还原器 `cli-mods/tools/upgrade/restore-bun.cjs`：

```sh
node cli-mods/tools/upgrade/restore-bun.cjs \
  artifacts/claude-<版本>/claude-linux-x64 artifacts/claude-<版本>/linux-restored <版本>
```

- 第三个参数是版本：还原器核对入口 `cli.js` 里的 `VERSION:"<版本>"`，并写进输出的 `package.json`，补丁器靠这个字段选 profile。
- 还原器同时从 ELF 读出内嵌的 Bun 版本写进 `reconstruction.json`（`bunVersion`、`bunRevision`），输出里也会打印；这就是新 profile `bunVersion` 应填的值（见上面的硬性规则）。
- 输出目录必须不存在。
- 目录名固定为 `artifacts/claude-<版本>/linux-restored`：cli-mods 的原生对账测试按这个路径找还原源码（`test/artifacts.mjs`）。

还原器的做法（读源码可核对）：

- 从文件尾部找 `\n---- Bun! ----\n`，其前 32 字节是头：模块数据的基址偏移（u64）、模块表偏移与字节数（u32）、入口模块下标（头内 +16）。
- 模块表每项 52 字节：名字指针（偏移、长度）在 0，数据指针在 8，编码在 48，loader 在 49。loader 1 是 JS 源码，5 是文件资源，13 是文本资源；名字去掉 `.../root/` 前缀成为相对路径（拒绝 `..`、`:`、绝对路径），入口模块 `cli` 写成 `cli.js`。
- 改写：`import.meta.require` 及其别名换成 `require`；对资源的 `require`/`import` 换成带 `with { type: "file"|"text" }` 的导入；字符串里的 `B:/~BUN/root/…`、`/$bunfs/root/…` 换成相对路径（作为模块说明符时）或 `import.meta.dir + …`。每个改写后的模块重新解析一遍，失败即停。
- 写出 `reconstruction.json`：输入路径、`binarySha256`、入口、模块数、JS 模块数、`unresolved`（找不到目标的 bunfs 引用）、每个模块的原始 SHA-256 与改写次数。

检查：`binarySha256` 等于清单的 checksum；`unresolved` 为空；`entry` 是 `cli.js`。2.1.310 的结果是 2801 个模块、2551 个 JS、`unresolved` 为空。

## 3. 静态分析：旧版补丁依赖的东西在新版里变成了什么

补丁不按行号或文本 diff 定位：每个改写点是"某个哈希绑定模块里唯一的某个函数里唯一出现一次的一段文本"，支持模块按名字导入原生函数。升级要回答的是：**每个被依赖的原生名字在新版里是哪个名字、逻辑变没变**。工具在 `cli-mods/tools/upgrade/`（依赖 cli-mods 的 devDependencies：`@babel/parser`、`espree`、`eslint-scope`、`esbuild`）。下面的命令都在 cli-mods 目录下运行。

### 3.1 `equiv.cjs`：结构等价配对

```sh
node tools/upgrade/seeds.cjs . <旧版本> > artifacts/claude-<新>/seeds.json   # 旧 profile 的全部原生名字 + 旧锚点改写的全部函数
node --max-old-space-size=14000 tools/upgrade/equiv.cjs <旧还原目录> <新还原目录> \
  artifacts/claude-<新>/seeds.json artifacts/claude-<新>/equiv-<旧>-<新>.json
```

第一次跑约 8 分钟（两边各约 9.5 万个单元），每棵树的索引缓存在输出旁的 `equiv-index-*.json`，之后再跑只需配对时间。

- **单元**：每个 JS 模块的每个模块作用域绑定。单元的规范形式是它的 AST，标识符按 eslint-scope 的作用域分析分类：局部变量按首次使用编号 `L<n>`，模块绑定写成 `M`（并按出现顺序记下它解析到的单元，经 import/export 追到定义处，称为 refs），全局名保留，属性名照写。规范形式相同且 refs 两两对应，就是同一段逻辑。
- **配对**：① 两边各自唯一的规范哈希先配对；② 名字未被压缩的导出（长度 ≥ 6、含三个小写字母）按名字唯一配对；③ seeds 里写了 `newKey` 的强制配对；④ 已配对的单元沿 refs 传播（旧单元第 i 个 ref 对新单元第 i 个 ref）；⑤ 逻辑有变化的一对用 Myers 算法对齐 token，相等段落里的 refs 继续传播。
- **构建元数据**（版本号、构建时间、commit）天然不同：工具从两边 `cli.js` 读出 `VERSION`、`BUILD_TIME`、`GIT_SHA`，每对规范成同一个占位，否则含版本串的单元全部显示为 changed。`EQUIV_NORMALIZE='[[旧,新],…]'` 可覆盖。
- **seeds.json**：`[{"file":"chunk-x.js","name":"FH"}, …]`，用旧版的名字（`seeds.cjs` 生成，`why` 说明来自 profile 哪一项或锚点）；可加 `"newKey":"<新文件>:<新名字>"` 强制配对、`"depth":n` 改闭包深度（默认 3）。入口函数常被重新压缩又改了逻辑（2.1.304 `Ve` → 2.1.310 `Ye`），配不上时用 `newKey` 固定再跑。
- **一对一**：一个新单元只能被一个旧单元占用；第二个旧单元再走到它，记为 `new-claimed-twice` 冲突而不配对（2.1.310 时 REA 交叉验证发现最初的版本漏了这种情况：68 个新键被两个旧键同时占用）。
- changed 的一对带 `similarity`（对齐后相同 token 的比例）与 `how`（怎么配上的）。**`similarity` 低于约 0.3 的通常是配错了**（按位置对齐走到了无关函数），先确认配对再看 diff。
- **输出**：stdout 一行汇总，`seeds` 的每项是 `[旧键, 新键, 状态, 闭包总数, 闭包 same 数, 闭包 changed 数, 闭包 unmapped 数]`；文件里有 `map`（旧键 → 新键）、`conflicts` 与每个种子的 `report`（闭包里 changed 的单元带 `diffTokens` 与前 60 个增删 token）。

状态的含义与处理：

| 状态 | 含义 | 处理 |
|---|---|---|
| `same` | 规范形式与 refs 都对应 | 换名即可；锚点文本里的局部名仍要核对（局部名可能被重新压缩） |
| `changed` | 已配对但 token 不同 | 用 `unitdiff.cjs` 看差异，逐个判断补丁的前提还成不成立 |
| `unmapped` | 没有配上 | 函数被拆分、合并、内联或重写。2.1.304 → 2.1.310 里 `uXn`（请求构建器，`locate.requestBuilder`）与 `chunk-dxktn51d.js:Ure` 都是 unmapped，必须用 `inspect.cjs`/REA 手工找 |
| conflict `old-reached-twice` | 同一个旧单元经两条路径被配到两个不同的新单元 | 一般是某个调用方改调了另一个函数（`how` 说明是哪条传播得出的）；两个候选都要看，确定后用 `newKey` 固定再跑。也可能只是叶子函数的位置对齐噪声：两个候选函数体相同即是 |
| conflict `new-claimed-twice` | 两个旧单元都想配同一个新单元 | 旧版两个函数在新版合并，或其中一个被删除；看 `owner` 与 `old` 哪个才是 |

2.1.304 → 2.1.310 的汇总：旧 94222 个单元、新 97364 个，配上约 9 万个；补丁依赖的约 110 个名字里绝大多数 same，changed 的是 `qmn FH jA HTe sF mle cy dN Mn m4t(工具池) Ve`，需要手工找的是入口、`uXn`（主查询里的局部函数，不是模块绑定）、`Ure`（`crypto.randomUUID`）。

### 3.2 `unitdiff.cjs`、`lookup.cjs`、`inspect.cjs`

```sh
node unitdiff.cjs <旧> <新> equiv.json <输出目录> chunk-rncrmfyt.js:qmn chunk-38xgev2z.js:sF …
node lookup.cjs equiv.json chunk-rncrmfyt.js:FH   # 或裸名 FH（在旧键里按后缀找），或 new:<新键> 反查
node inspect.cjs <还原目录> <文件> <名字|-> [搜索词…]   # MAX=字节数 控制整段输出长度
```

- `unitdiff` 把一对单元两边都规范化后用 esbuild 重新打印（模块绑定统一用旧名、新树经配对表换回旧名，局部变量按首次使用编号，全局名照写），再用 `git diff --no-index` 出 `<文件>_<名字>.old.js/.new.js/.diff`。这样剩下的差异只是逻辑差异。样例在 `artifacts/claude-2.1.310/diffs/`。
- `lookup` 打印配对结果、状态和涉及该键的冲突。
- `inspect` 打印一个绑定的源码（`-` 为整个模块），给搜索词时只打印每处前后各几百字符，用来在新版里按锚点文本找位置。

### 3.2b `carry-profile.cjs`：把 profile 的名字带到新版

```sh
node tools/upgrade/carry-profile.cjs equiv.json <旧树的 equiv-index-*.json> <新树的 equiv-index-*.json> profiles/linux-x64-<旧>.json <新核心模块> > carry.json
```

按配对把旧 profile 的 `natives`、`coreScope`、`coreImports`、`locate` 换成新版名字：原生导出找新版的导出名，核心作用域名找新核心里绑定到同一单元的本地名（声明或已有 import）；配不上或配到 changed 单元的写进 `problems`，逐个人工确认。新核心模块：旧核心的绝大多数单元在 `map` 里落到的那个模块（2.1.310 是 `chunk-j0tbz6ra.js`）。哪个索引是旧树：含旧核心模块名的那个。`modules` 的哈希按新版还原文本重新算：被改写的模块、natives 用到的模块、核心 import 的来源模块。

### 3.3 REA 交叉验证

equiv 的配对靠规范形式与传播，可能把形状相同而语义不同的函数配错。用 REA MCP 独立做一遍：

- `analyze_javascript_application` 对新旧还原目录各做一次，得到每个函数的语义指纹（`normalized_result.semantic_graph` 的 `fingerprints`）；`compare_application_versions` 给出版本差异。
- 把 REA 两边各自唯一的指纹配对，与 equiv 的配对逐模块对照：一致的 same/changed 记为确认；equiv 说 same 而 REA 说不同、或 REA 的唯一配对与 equiv 冲突的，单独审查。2.1.310 时的做法与脚本在 `artifacts/claude-2.1.310/scratch-rea/`（`fpjoin.cjs` 生成两边的函数表、`join.cjs <left-fns> <right-fns> <旧文件> <新文件>` 对照），例：`chunk-38xgev2z.js → chunk-bbw420pv.js` 1027 对中 596 对共同判 same、11 对共同判 changed、1 对分歧、0 冲突（`join-transport.txt`）。
- 这些脚本是一次性的草稿，不是稳定工具；结论以人工审查为准。

### 3.4 逐个审查锚点

对每个依赖：找到新名字 → 看 `unitdiff` → 判断补丁的前提（参数名、调用形状、返回对象形状、所在模块）是否还成立 → 记录结论。审查结论要写进新版的迁移文档（2.1.310 的是 [CLAUDE-CODE-2.1.310-MIGRATION](CLAUDE-CODE-2.1.310-MIGRATION.md)，分组审查报告在 `artifacts/claude-2.1.310/review/`），而不是只留在脚本输出里。

2.1.310 时按四组并行审查，每组一份报告，开头先给锚点对照表（旧文本 | 新文本 | 唯一性已验证 | 语义是否等价）：① 主查询与请求构建器（`qmn`/`uXn`）；② 核心其余补丁点与环境代码用到的名字；③ 传输、认证、请求头（`sF`/`nl`/`mle`/`cy`/SDK）；④ 入口、会话、容器资源、计费头、身份、工具池与测试清单；另有 REA 交叉验证一组。锚点的替换文本要把**局部变量名**按新函数逐个换掉（例：2.1.310 的 `m$` 把参数解构挪进了函数体，`apiKey` 从 `e` 变成 `n`；新核心里导入 `a`/`i` 的含义与旧核心正好互换），不能整体字符串替换。2.1.310 的锚点文件是用脚本从 2.1.304 的锚点逐条替换生成的（每条替换必须恰好命中预期次数，最后检查旧名字不再残留），脚本 `cli-mods/tools/upgrade/examples/derive-anchors-2.1.310.cjs` 可作下一次的样板。

同版本重构补丁器或支持模块时，用 `tools/upgrade/tokcmp.cjs`（两份模块按 token 比较，可给改名表）与 `tools/upgrade/supcmp.cjs`（两次补丁产物的支持模块：代码 token 相同、每个本地名背后的原生绑定相同、没有残留旧名）证明产物等价，再发布。

### 3.5 当前补丁的全部依赖（2.1.304）

**A. 被改写的函数**（`cli-mods/patches/2.1.304.cjs`，每处 `edit(文件, 函数, …)` + `once(旧文本, 新文本)`；旧文本里的单字母名是该函数里的局部变量，新版几乎一定会换）：

| 模块:函数 | 改写 | 依赖的原生名字/形状 |
|---|---|---|
| `cli.js:Ve` | 在 `if(n!==void 0){` 前插入请求入口桩 | 入口参数列表 `e`、快路径策略的设置来源 `s` |
| `chunk-dxktn51d.js:Yi` | 会话 ID 先取请求的 | `id:ier()??Ure()` |
| `chunk-yqea5hk4.js:Ali` | 资源报告读容器配额（5 处） | `qir`、`Ne`、`u`、`d`、`p`、`a`、`bavail`/`bsize` 文本 |
| `chunk-sx3g9k86.js:V` | 内存/负载报告读容器配额 | `p.length`、`F.freemem`/`F.loadavg`、`n.checkpoint_count` |
| 核心 `FH` | 客户端工具定义逐字返回 | 函数签名 `async function FH(e,n){` |
| 核心 `qmn` | 主查询：build 只构建不发送（10 处） | `jh.tools`、`z2(yl)`（`CLAUDE_CODE_EXTRA_BODY`）、`S8n(J.model,{isAgenticQuery:wt})`、`jh.system`、`Rk`/`Gf`/`_i`、`Xfr(`、`fi={model:`、`RIs(Aa)`、`fingerprint:tF,agentContext:`、`HTe(()=>sF({maxRetries:0,`、`uXn({model,fastMode})` |
| 核心 `Gmn` | 外部消息跳过原生修复 | 返回对象的全部字段名（`messagesPreNormalize`…`blocksEligible`） |
| 核心 `jA` | 处理 `api_system` 记录 | `case"progress":continue;case"system":`、`or()`、`Br()`、`po.push(Lo)` |
| 核心 `Xfr` | 外部 system 原样 | `ft.type==="api_system"` |
| 核心 `_oo` | 环境段代理说明按请求 | `l1(e)?ule(e):foo()` |
| `chunk-38xgev2z.js:sF` | API-key-only 客户端（5 处） | 参数 `apiKey:e`、`CLAUDE_CODE_CONTAINER_ID`、`xFt`、`Zle`、`Mn`、`q6n`、`ll`、`ty`、`Se`、`T2e`、`Gr`、`Sd(n)` |
| `chunk-38xgev2z.js:nl` | UA 可用客户端的 | `"User-Agent":dN()` |
| `chunk-t61vswm2.js:PAs` | 交回原生计费头与身份行 | `d=ki([s,n,...e].filter(Boolean));`、参数 `r` |

另有 `surround` 给 `chunk-dxktn51d.js`、`chunk-yqea5hk4.js`、`chunk-sx3g9k86.js`、`chunk-38xgev2z.js` 与核心加的导入（导入支持模块）和追加代码（核心末尾拼上环境代码、`ccgatewayJoinAppend`、`export {ile as ccgatewaySystemRecord}`）。

**B. 按 AST 定位的原生结构**（profile `locate`，`patch-cli.cjs`）：

- `requestBuilder: uXn` 与 `builderBetaList: zr`：补丁期从构建器里按顺序收集 `zr.push(标识符)` 作为 beta 顺序填进 `request-betas.js`；每个名字必须是核心模块作用域的绑定且不能是核心自己声明的（要能被导入）。
- `systemRecord: chunk-rncrmfyt.js:ile`：原生 system 记录工厂，必须在核心里。
- `appendJoin: chunk-wt08cjq1.js:pr`：拼接两段追加提示词的函数，必须含 `\n\n`，被复制改名为 `ccgatewayJoinAppend`。
- `betaMessagesModule: chunk-38xgev2z.js`：模块里必须恰好有一处 `this._client.post('/v1/messages?beta=true', …)`，其字面量填进 `model-request.js` 的 direct 路径。

**C. 支持模块用到的原生绑定**（profile `natives`，生成 `ccgateway-native-<组>.js` 按逻辑名再导出）：

- `entry`：`loadFastPathPolicy`（只在快路径策略判定前需要）。
- `command`：`createClient`(`sF`)、`AnthropicClient`(`_ke`)、`modelFetch`(`mle`)、`mainAgentContext`(`Al`)、`modelBetas`(`S8n`)、`betasAllowed`(`mBr`)、`setEntrypointOnRequests`。
- `natives`：`oauthBeta`(`gTe`)、`requestIdentity`(`yBe`)、`attributionHeader`(`PAs`)、`billingHeaderPrefix`(`oJe`)、`reminderOpen`(`KF`)、`attributionFingerprint`(`RIs`)、`mainAgentContext`、`querySourceFor`(`Zoe`)，以及补丁加进核心的 `ccgatewayLayerVocabulary`、`ccgatewayPromptTurn`。
- `build`：`queryModel`(`jOt`)、`renderAttachment`(`aBe`)、`isBillingHeader`(`B1s`)、`reminderClose`(`lKe`)、`toolPool`(`m4t`)、`identityLine`(`n1n`)、`isIdentityLine`(`t1n`)、`getRootSession`、`setEntrypointOnRequests`，以及补丁加进核心的 `ccgatewayEnvironment`、`ccgatewaySystemRecord` 等 8 个。
- 名字换了只改 profile；**签名或语义**变了（参数对象的键、返回形状、`queryModel` 读的 `ccgateway*` 选项）要改支持模块。

**D. 环境代码的原生绑定**（`native-environment.inc.js` 里的 `native_<名字>`）：

- `coreScope`：49 个核心模块作用域绑定（Git/worktree/shell/OS 读取器，环境段渲染器 `zkt`/`Kkt`/`_oo`/`xNe`…，提示词与权限 `ki`/`r1e`/`wx`/`gd`，环境收集 `Wkt`，模型身份、token 预算、日期、上下文头名 `m4t`/`c4t`/`f4t`/`u4t`/`p4t` 等）。
- `coreImports`：`betaFromHeader`（`chunk-4qs43hr1.js:ZUo`）、`currentDate`（`chunk-t2p0d04m.js:POo`），补丁以 `ccgateway_native_<名字>` 导入核心；`patchOnly` 列出只在锚点里用、环境代码不用的名字（现为 `betaFromHeader`）。

**E. 哈希绑定的模块**（profile `modules`）：被改写的模块与补丁导入的原生模块共 20 个；补丁器先核对每个模块的 SHA-256，任何一个不符即失败。新版的模块名（`chunk-<8 位>.js`）几乎全部会变。

**F. 补丁以外依赖 2.1.304 的地方**：

- `contracts/features`：CC 上下文头表 `AgentContextHeaders`、UA 形状 `ClientUserAgent`（`agent_context.go`）、身份行名（`identity_line.go`，对应 `n1n`）、注入工具清单 `InjectionTools`（`injection.go`）、系统提示词里的工具名（`levels.go`）。新版改了这些头或工具时要同步改，核心与 Worker 共用。
- cli-mods 测试夹具 `test/fixtures/*-<版本>.json`：`native-vocabulary`、`native-layers`、`native-environment` 由原生函数生成（`CCG_UPDATE_CONTRACT_FIXTURES=1`）；`official-request`、`official-tools` 是官方客户端的抓包，要用新版官方二进制重新抓。
- 版本号常量：`worker/Dockerfile` 的 `ARG CLAUDE_VERSION`、`controller/Dockerfile` 的 `ENV CCG_DEFAULT_CLI_VERSION`、核心 `server/internal/ccgateway/cli_version.go` 的 `PinnedCLIVersion`、控制台 `web/src/views/ccgateway/requestPolicy.ts` 的默认 `cli_version`，以及控制器的迁移探针（`runtime_migration_probe.py` 等）。

## 4. 移植补丁器

1. **profile**：复制 `profiles/linux-x64-<旧>.json` 为 `linux-x64-<新>.json`，逐项填：`version`、`binarySHA256`（官方 ELF）、`extension`（见下）、`bunVersion`（**官方 ELF 内嵌的 Bun 版本**，取还原输出的 `bunVersion`；填错补丁器直接报错）、`capabilities`、`supportModules`、`core`（新版的主查询模块）、`locate`、`natives`、`coreScope`、`coreImports`、`patchOnly`、`modules`（每个哈希绑定模块的 SHA-256，按还原后的文件文本计算）。
2. **锚点**：复制 `patches/<旧>.cjs` 为 `patches/<新>.cjs`，每处 `edit`/`once` 按第 3 节的结论重写。锚点文件拿到 `{files, edit, once, surround, nodes, tree, core, profile, entryStub}`；`edit` 要求函数在该模块里唯一、改后文本有变化，`once` 要求旧文本在函数里恰好出现一次——锚点失效时补丁器直接报错，不会悄悄跳过。入口桩用 `entryStub(<参数名>, <设置名>)`，两个名字取自新版入口函数。
3. **分派**：不用改 `patch-cli.cjs`。它读还原目录 `package.json` 的版本，找 `profiles/linux-x64-<版本>.json` 与 `patches/<版本>.cjs`，缺一个就报 `Unsupported Claude Code baseline`。
4. **环境代码**：`native-environment.inc.js` 是各版共用的，只写 `native_<名字>`；补丁器按 profile 把它们换成核心绑定或导入。profile 没映射的名字、映射了却不是核心绑定的名字、映射了环境代码却没用（且不在 `patchOnly`）的名字都会让补丁失败。新版若要换读取方式而不只是换名，才改这个文件（会影响所有版本，旧版 profile 也要跟着验证）。
5. **支持模块的原生导入**：支持模块只能 `from './native-<组>.js'` 导入原生（补丁器拒绝直接导入 `./chunk-*`），组和逻辑名在 profile `natives` 里。新增一个原生依赖 = 在 profile 的某组加一行逻辑名 → `文件:名字`。
6. **`checkImports`**：补丁新增的每个导入名（静态导入、`export {…} from`、`let {x} = await import(…)` 解构）都必须确由目标模块导出（按安装后的文本解析）；目标必须是哈希绑定的模块或支持模块；`import * as` 与不解构的动态导入无法检查，直接失败。它保证"补丁依赖的符号与定义它的模块一样被钉住"（审核 D3）。
7. **补丁标签 `extension`**：格式 `ccgateway-v<NN>-<名字>`（Worker 与控制器的正则是 `^ccgateway-[a-z0-9-]+$`，不能有点号：版本写成 `2-1-310`；补丁器按同一正则检查，2.1.310 初版标签 `v32-cc-2.1.310` 就是被组装对账探针启动 Worker 时拒绝才发现的）。任何补丁或支持模块的变化都要升标签；序号跨 Claude Code 版本连续（2.1.296 用 v3–v6，2.1.302 用 v7–v11，2.1.304 从 v12 到 v31），新版从下一个号开始。`package-release.cjs` 只打包标签等于 profile 的清单，Worker 镜像构建核对 release 与 profile 的标签，旧产物会让构建失败。
8. **能力**：`capabilities` 名字不跟版本走；只有语义变化时才改名或加新能力，并同步核心预检与 Worker 闸门（`requestCapabilityGates`）。
9. 跑补丁（输出目录必须不存在，原目录不改）：

   ```sh
   cd next/plugins/ccgateway/companions/cli-mods
   npm install --ignore-scripts
   node patch-cli.cjs /abs/artifacts/claude-<新>/linux-restored /abs/artifacts/claude-<新>/patched-v<NN>
   ```

   输出目录里的 `ccgateway-patch.json` 记补丁标签、能力、每个改写模块的改前改后哈希与每个支持模块的哈希。复用已有 Babel 时设 `CCG_BABEL_PACKAGE` 为其 `package.json` 的绝对路径。

## 5. 测试

用例与验收标准见 [CLI-TEST-PLAN](CLI-TEST-PLAN.md)。发布前至少要过：

1. **cli-mods 单测，原生对账真跑**：`CCG_CLI_VERSION=<新> CCG_REQUIRE_ARTIFACTS=1 npm test`。还原目录存在时原生对账测试必须执行；stderr 出现 `CCG_NATIVE_TEST_SKIPPED` 即不算通过。原生生成的夹具变化时用 `CCG_UPDATE_CONTRACT_FIXTURES=1` 重生成并逐项审查差异。
2. **Go 全量（Linux）**：engine、worker、contracts 在 Linux 上跑 `go test -count=1 -v`（本机 Windows 跑不了进程级用例，在 ovh 用 `golang:1.27-bookworm` 一次性容器，命令见 [companions README](../companions/README.md)）；改了 engine 再 `GOOS=linux go vet ./...`。不设 `CCG_REAL_CLI` 时 `TestRealCLI*` 显示 SKIP，不能当作已验证。
3. **真实 CLI 用例**：`TestRealCLIResource*` 用新版**官方** Linux CLI 跑（重建的 CLI 的 `auth status` 不退出）；资源管理断网场景 `TestResourceManagementLinuxOfflineNetNone`（CONTRACTS §53.14 把它定为升级 CLI 时的回归）。
4. **官方客户端对拍**：`test/official-client-replay.cjs`（`--network none` 一次性容器，用新版官方二进制生成请求，经 Worker 回放比较出口）。脚本固定了官方与补丁 CLI 的 SHA，换制品要显式更新预期。
5. **官方请求对比与夹具**：`test/e2e/capture-official.sh` 在一次性断网容器里用未改的官方 CLI（全新 HOME、全新非 Git 项目、合成 API key、假上游）抓一个请求，存为 `test/fixtures/official-request-<版本>.json`；`test/e2e/official-diff.cjs <旧> <新>` 按组件（system 各块、首轮各 reminder、每个工具的描述/schema/其他字段、生成参数）比较，版本号、cc_version 指纹、cch、日期先规范化。新旧官方请求的差异就是这次升级里"官方自己的变化"的完整清单（2.1.310：延迟工具列表多了 `Monitor`、Bash 描述多一句 Monitor 说明，其余相同），出口比较时据此判读。
6. **离线端到端回归**：`cli-mods/test/e2e/`（`docker.sh`，在 ovh 一次性 `--network none` 容器里跑真实客户端 → Worker → 假上游，`NEW=1` 把候选 Worker 与 CLI release 挂进旧镜像）。同版本改补丁时要求与上一版出口 0 差异（2.1.304 时 69 场景 122 请求）、`capcheck` 上游记录完整、`respmatch` 的 `response.json` 与客户端收到的流一致。换 Claude Code 版本时出口与旧版必然有差异，基线改为新版官方客户端自己的出口，差异逐条解释。
7. **控制器**：`(cd controller && python -m unittest discover -p 'test_*.py')`；迁移探针里写死的版本要改。

## 6. 编译与打包

**Bun 版本**：编译用的 Bun 必须等于官方 ELF 内嵌的版本（ELF 里的 `Bun v<版本> (<修订>)` 字样；2.1.304、2.1.310 都是 1.4.4）。Bun 的 TLS 栈就是上游看到的指纹：2026-10-27 实测（`test/e2e/tls-fingerprint.sh`），Bun 1.4.3 编译的 CLI 与官方 JA3 相同、JA4 不同（签名算法少 Ed25519 与 ECDSA P-521），同一源码用 Bun 1.4.4 编译后 ClientHello 与官方完全相同（v33 起）。版本写在 profile 的 `bunVersion`，`package-release.cjs` 拒绝不是这个 Bun 编出的 ELF。换 Claude Code 版本时先查新 ELF 的内嵌版本，`docker pull oven/bun:<版本>`，改 `bunVersion`，发布前跑一遍 TLS 指纹对比。

**为什么 `--compile --bytecode --format=esm`**（`build.sh`，v30 起，CONTRACTS §63.5）：官方构建的每个模块都是字节码，没有字节码时每个 CLI 进程都要解析整个包，而 Worker 每个请求启动一次 CLI。v30 只改了编译参数：`--version` 0.80 → 0.04 秒，请求命令启动到读输入 0.91 → 0.10 秒，常驻内存 135 → 139 MiB，ELF 157 → 293 MB（官方 288 MB）。还原出的模块是 ESM，单用 `--bytecode` 默认按 CJS 编译会失败。两个入口都必须给：`cli.js` 与 `src/plugins/functionHooks/hooks-worker/hooks-worker.js`，只编 `cli.js` 会漏掉 hooks worker。

**编译**（发布记录里的做法：本地补丁 → tar 传到 ovh → `oven/bun:<bunVersion>` 容器里编译）。0.1.101 的发布记录写着"仓库里的 build.sh 是 CRLF，临时副本先去 CR"；2026-10-27 核对时仓库与工作树里都是 LF（`git ls-files --eol` 为 `i/lf w/lf`，`.gitattributes` 对 `*.sh` 设 `eol=lf`），但从 Windows 传过去的副本仍可能带 CR，统一先去 CR 最稳妥：

```sh
sed 's/\r$//' cli-mods/build.sh > /tmp/build.sh
sh /tmp/build.sh /abs/patched-v<NN> /abs/claude-linux-v<NN>     # 在 oven/bun:<bunVersion> 容器里
```

非 Linux 主机交叉编译用同样两个入口加 `--target=bun-linux-x64`（cli-mods README 第 4 步）。Bun 编译不能逐字节复现（同源两次编译差约 16 KB），发布一律按产物哈希固定。

**打包**（同一个容器里用 bun 或 node 都可以；脚本要能在自己旁边找到 `profiles/`，所以从 cli-mods 目录或其完整副本里运行）：

```sh
bun package-release.cjs /abs/claude-linux-v<NN> /abs/patched-v<NN>/ccgateway-patch.json /abs/release-v<NN>
```

产物：`<版本>/claude`、`<版本>/ccgateway-patch.json`、`manifest.json`（`{schema:1, versions:{<版本>:{path, sha256, patch, modes:["build","direct"]}}}`）。输出目录必须不存在；脚本只接受 ELF 魔数与 profile 一致的补丁标签。

**放进 Worker 镜像**：用新目录替换 `cli-mods/release/`（不进 Git，`UPSTREAM_LICENSE.md` 一并保留）。`package-release.cjs` 只写一个版本；同一镜像要带多个版本时手工合并 `manifest.json` 的 `versions`。`worker/Dockerfile` 安装到 `/opt/ccgateway/cli/`，按 `ARG CLAUDE_VERSION` 建 `/usr/local/bin/claude` 链接，核对该版本的 SHA-256 与 manifest 一致、补丁标签与 `profiles/linux-x64-<版本>.json` 一致，再整体去掉组写/他写权限。换版本时改 `ARG CLAUDE_VERSION` 的默认值（并留着新版的 profile）。发布镜像用 `next/deploy/docker/build-ccgateway-images.sh <插件版本> <输出目录>`，插件版本必须等于 `manifest.json` 的 `version`。

## 7. 发布与回滚

**发布**（ovh 发布记录的固定顺序，[ovh README](../../../deploy/gateway/ovh/README.md) 顶部几条；先插件后核心）：

1. 升插件 `manifest.json` 版本（镜像与插件版本一起变），构建镜像与插件包；ovh 已关插件验签，插件包用一次性密钥签名（脚本样板在 ovh 的 `~/sup2api-managed/stage/ccgateway-<版本>/{build.sh,rollout.py}`）。
2. 数据库备份到 `~/sup2api-managed/backups/ccgateway-<版本>/`。
3. 插件上传、升级（权限不变时同意沿用）。
4. `POST /system/ccgateway/runtime/bundled {"roles":["controller","egress"]}`。
5. `POST /system/ccgateway/runtime/workers {"components":["worker","cli"],"cli_version":"<版本>","image":"ccgateway-app:<插件版本>"}`：控制器对每个运行中的账号容器做**配对原地更新**——暂停准入、确认空闲、备份、放入新的不可变 release 目录、写 `active-runtime.json`、重启 Worker 进程、健康检查通过后恢复准入，失败则回到原来的指针与 Worker（`controller/runtime_updates.py`，CONTRACTS §53.7）。**不重建账号容器**，CC 登录令牌与数据卷不动；容器里残留的其他进程会让它一直 busy，要先清掉。
6. `POST /system/ccgateway/runtime/bundled {"roles":["app"]}`。
7. 需要时再发核心（核心改动依赖新 Worker 时必须在插件之后，例如隧道空闲 110 秒依赖 Worker 180 秒）。

**换 Claude Code 版本时的额外步骤**：配对更新把账号切到新版本后，在 CCGateway 设置里把 `cli_version` 改成新版本。核心保存时要求所有就绪的运行环境都已报告新版本（`cli_version.go admitCLIVersion`）；没有就绪运行环境时只接受 `PinnedCLIVersion`，所以核心的这个常量也要随版本更新发布。

**切换窗口**：从第一个账号切到新 CLI 起，到保存新的 `cli_version` 为止，核心发出的策略仍写旧版本，已切换的账号会被核心预检拒绝（503 `configuration_error`，插件冷却 10 秒）或被 Worker 拒绝（409）。所以配对更新和保存设置要在一个脚本里连着做，窗口约等于配对更新的时长；同一分组里还没切换的账号在这段时间承接请求。

**校验点**：

- 每个账号 `/healthz` 的 `claude_version`、`cli_patch`、`cli_sha256` 与 release manifest 一致；容器内 `/opt/ccgateway/cli/active-runtime.json` 指向新版本（镜像默认的 `/usr/local/bin/claude` 可能还是旧的，以 active-runtime 为准）。
- 账号 app 容器 ID 不变（只有控制器容器会换）。
- 控制台账号测试（Haiku）200；用临时 ccg-audit Key 经只含被测账号的分组发真实请求，测后删除 Key。
- 开完整日志的账号，测试请求的日志里有 `upstream-request.json`，授权头为 `[REDACTED]`。

**回滚**：数据库备份在第 2 步；配对更新在健康检查失败时自动回到原指针与原 Worker。已经切换成功后要退回，用上一版插件包与上一版镜像再走一遍第 3–6 步（上一版镜像必须仍在控制器上）。这条路径按代码推断，未在生产演练过。

## 8. 常见坑

- `build.sh` 带 CR 时在 Linux 上直接跑会失败（0.1.101 发布时遇到过），用去掉 CR 的副本。
- `package-release.cjs` 要在旁边找到 `profiles/`，单独拷一个脚本出去跑会报 `Unsupported patch release`。
- 还原器的第三个参数（版本）必须与 ELF 一致，否则还原器报错。
- 补丁、打包的输出目录都必须不存在；补丁器只认 profile 里的模块哈希，还原目录被改过就失败。
- 只编 `cli.js` 会漏掉 hooks worker；只加 `--bytecode` 不加 `--format=esm` 编译失败。
- 本机 Windows 跑不了 engine 的进程级用例，要在 Linux（ovh 一次性 `golang:1.27-bookworm` 容器）跑；不加 `-v` 只看到 `ok`，看不出 `TestRealCLI*` 被跳过。
- 重建的 CLI（2.1.302 v11、2.1.304 起）`claude auth status` 不退出：真实 CLI 的资源用例要用官方 CLI；任何流程都别依赖 `auth status`，订阅类型读凭证的 `claudeAiOauth.subscriptionType`（CONTRACTS §53.14、§59）。
- 原生 CLI 对 ≥ 4096 字符的一方请求会在正文末尾加随机空白再 gzip，上游请求记录的 `body_sha256` 因此与进入网关的不同，比较用 `content_sha256`。
- 在 Windows 上打的包可能带组写/他写权限，Worker Dockerfile 会统一去掉；控制器与 Worker 都拒绝非 root 所有或可写的 CLI 路径。
- ovh 上用 `pgrep -f`/`pkill -f` 等待远端任务会匹配到自己的 shell，改为等输出文件里的结束标记；`set -e` 下 `diff` 有差异会中断后续命令。
- 往账号容器放文件用 `tar | docker exec -i -u 1000 tar x`，`docker cp` 遇到 socket 会中断。
- 离线回归不经过核心，核心与插件之间的问题（如账号设置新键被插件校验拒绝，0.1.96 事故）测不出来：发布后必须在生产做一次账号测试和一次真实请求。
