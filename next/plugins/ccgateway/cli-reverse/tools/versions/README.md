# tools/versions：官方 CLI 版本之间的对比

本目录的工具用来回答一个问题：**两个官方 Claude Code 版本之间，哪些代码没变、哪些变了、变了什么。** 这和 `tools/rename`、`tools/emit` 做的单版本还原互补：还原让一个版本能读懂，这里让版本之间能对上号。

所有工具都直接读还原出的模块树，也就是 `tools/extract/restore-bun.cjs` 的输出（`original/` 就是 2.1.316 的这种树）。

## 来源

这些工具从 sup2api 复制而来，原位置是 `next/plugins/ccgateway/companions/cli-mods/tools/upgrade/`，复制时 sup2api 的提交是 `9b4e71ec4`（2026-11-04）。sup2api 在每次升级定制 CLI 时用它们分析官方版本差异，sup2api 里的原件仍然保留，继续由 sup2api 使用。

只复制了与 sup2api 补丁无关的工具。以下三个是补丁专用的，留在 sup2api：

- `seeds.cjs`：按补丁 profile 生成种子。
- `carry-profile.cjs`：把 profile 的原生名搬到新版本。
- `anchor-hazards.cjs`：检查补丁锚点里 `String.replace` 的特殊字符。

`restore-bun.cjs` 和 `elf-facts.cjs` 与 sup2api 的版本逐字节相同，放在 `tools/extract/`。

## 工具

| 工具 | 用途 | 用法 |
|---|---|---|
| `equiv.cjs` | 结构等价配对。每个模块级绑定是一个单元，规范形是"局部变量按首次出现编号、模块绑定按引用顺序、全局名和属性名保持原样"的 AST。规范形唯一且相同的单元先配对，再沿引用传播；对变了的单元做 token 对齐，相等段里的引用继续传播 | `node --max-old-space-size=12000 tools/versions/equiv.cjs <旧树> <新树> <seeds.json> <out.json>`，seeds 可以是 `[]` |
| `lookup.cjs` | 查配对结果：旧键（`文件:名字`）→ 新键、状态、怎么配上的 | `node tools/versions/lookup.cjs <equiv.json> <名字或 文件:名字>…`；用 `new:<键>` 反查 |
| `unitdiff.cjs` | 配对单元的可读差异：两边的标识符换成可比较的形式（模块绑定用旧树名、局部按首次出现编号）后做 diff | `node tools/versions/unitdiff.cjs <旧树> <新树> <equiv.json> <输出目录> <旧键>…` |
| `inspect.cjs` | 打印某个模块级绑定（`-` 表示整个模块），可只看搜索词周围 | `node tools/versions/inspect.cjs <树> <文件> <名字或 -> [搜索词…]` |
| `tokcmp.cjs` | 两个 JS 文件按 token 比较（忽略注释），可先对第二个文件做改名 | `node tools/versions/tokcmp.cjs <a.js> <b.js> [renames.json]` |
| `supcmp.cjs` | 重构前后的支持模块对比：代码相同（忽略注释、导入声明、局部名），且每个局部名背后是同一个原生绑定 | 见文件头 |

依赖 `espree`、`eslint-scope`、`@babel/parser`，都在根目录 `package.json` 里。

## 一次完整的版本对比

下面以 2.1.312 → 2.1.316 为例。第一步，下载官方二进制并校验：

```bash
node tools/extract/acquire.mjs 2.1.312
```

国内网络需要代理时，Node 要加环境变量才会走代理：

```bash
NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://127.0.0.1:7890 node tools/extract/acquire.mjs 2.1.312
```

第二步，还原模块树（目标目录必须不存在）：

```bash
node tools/extract/restore-bun.cjs artifacts/official/2.1.312/claude-linux-x64 artifacts/versions/2.1.312-restored 2.1.312
```

第三步，配对，约 9 分钟：

```bash
node --max-old-space-size=12000 tools/versions/equiv.cjs artifacts/versions/2.1.312-restored original seeds.json artifacts/versions/equiv-312-316.json
```

2026-11-04 在本仓库实测，seeds 为 `[]`：2.1.312 的 98,638 个单元里有 95,302 个配上了 2.1.316 的单元（316 共 100,792 个），冲突 1,131 处。

第四步，按名字查配对结果，再看差异：

```bash
node tools/versions/lookup.cjs artifacts/versions/equiv-312-316.json <名字>
```

还原树、配对结果都是生成物，放在 `artifacts/versions/`，不入库。sup2api 已经算好的 `equiv-304-310.json`、`equiv-310-312.json`、`equiv-312-316.json` 也复制到了那里。各版本之间已经整理出的变化清单在 [`research/versions/`](../../research/versions/)。

## 和阅读树的关系

阅读树 `reconstructed/` 里的名字是给 2.1.316 起的。对比新版本时，可以先用 `equiv.cjs` 把 316 的单元和新版本配对，再沿用 `naming/final/top.json` 里同一个单元的名字。这一步还没有做成工具，做下一个版本时再实现。
