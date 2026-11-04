# naming gap-b：src 剩余压缩名（naming-final-gap.json 下标 [1]）

清单 `analysis/segments/naming-final-gap.json` 第 [1] 项（src，`src/tools/AskUserQuestionTool` … `src/vim/transitions.js`）：
414 个声明、清单记 440 个 unnamed 绑定。名字表用 `naming/final`（完整流水线产出的最终表），命名写入 `naming/semantic-gap-b.jsonl`（只追加，434 行）。

## 结果

- 命名 434 个绑定，覆盖 124 个 chunk；414 个声明中 411 个已无压缩名。
- 未命名 9 个（见下表），全部是死局部，不是"看不出用途"。
- `annotate check`：434 行 / 124 chunk / 0 problems / 0 suffixed by conflicts。
- 复核：`node --max-old-space-size=8000 tools/naming/resolve.mjs analysis artifacts/tmp/gap-b/resolved` 生成合并表后，
  本表 434 条**全部原样生效**（0 丢弃、0 改名、0 处 `_2`），再 `annotate show … artifacts/tmp/gap-b/resolved` 重渲染整组，
  `_K` 只剩下面 9 个死局部；`reconstructed` 侧抽查（20 余处）命名正确、无 `_2`。

### 未命名清单

| chunk | 偏移 | 所在函数/文件 | 原因 |
| --- | --- | --- | --- |
| chunk-e6aww6q8.js | `@1973303` | teleportToRemote / src/utils/teleport.js | 死局部（`let h = false`，refs=0，声明后从不读取） |
| chunk-e6aww6q8.js | `@1973308` | teleportToRemote / src/utils/teleport.js | 死局部（`let y = false`，refs=0） |
| chunk-e6aww6q8.js | `@1973511` | teleportToRemote / src/utils/teleport.js | 死局部（`let we;`，refs=0） |
| chunk-e6aww6q8.js | `@1974298` | teleportToRemote / src/utils/teleport.js | 死局部（`let gt = null`，refs=0） |
| chunk-e6aww6q8.js | `@1974306` | teleportToRemote / src/utils/teleport.js | 死局部（`let At = []`，refs=0） |
| chunk-e6aww6q8.js | `@1974594` | teleportToRemote / src/utils/teleport.js | 死局部（`let hn = null`，refs=0） |
| chunk-e6aww6q8.js | `@1986484` | teleportToRemote / src/utils/teleport.js | 死局部（`let Hi = undefined`，refs=0） |
| chunk-e6aww6q8.js | `@2004309` | teleportToRemote / src/utils/teleport.js | 死局部（`let Ah = false`，refs=0） |
| chunk-e6aww6q8.js | `@3682907` | execIntoTmuxWorktree / src/utils/worktree.js | 死局部（`let It = null`，refs=2 但两处只用于拼 `watchPath`，恒为 null，结果恒 null） |

## 发现的问题

1. **`naming/final` 里已经有一批"伪名字"占位条目**，形式是 `name === 压缩名 + "_"`（`Se_`、`ke_`、`Je_`、`Ae_`、`we_`…，来自 `naming/semantic-l17.jsonl`）和 `name === "__"`（来自 l17 等，共 42 条落在本组声明里）。`annotate show` 只在 final 无条目时才显示 `_K`，所以这些条目会把"剩余量"藏起来：本组清单记 440、渲染只显示 395 个 `_K`，差额 45 基本就是这批占位条目。已全部按真实用途改名（例如 `Se_`→`idlePolls`、`ke_`→`fetchFailures`、`We_`→`resultMessage`）。
2. **`check` 只对 `naming/final` 快照校验，抓不到合并后 / 同作用域内的撞名**。本表有 4 处 `check` 报 `suffixed`、2 处只能在 `resolve` 后才发现（`latchContext`、`filePathSpellings`、`gatewayUrl`、`adminDirPath`/`commonDirPath`），已分别改成 `requestOptions`、`readSpellings`、`parsedGatewayUrl`、`resolvedAdminDir`/`resolvedCommonDir`，最终 0 suffixed。
3. **清单的 `unnamed` 按声明累计，与渲染不一致**：本组清单 440，实际渲染可见令牌 395；`chunk-e6aww6q8.js#AF` 清单记 2、渲染 10，`chunk-e6aww6q8.js#Gon`/`y9` 则相反（记 3/2、渲染 0）。剩余量必须按渲染或按 `bindingsOf` 重算，不能只信清单数字。
4. **少数名字被 final 里已有的 reference 占位（`name === 压缩名`）占住**：`chunk-e6aww6q8.js@4784263`、`@1386165`、`@4206343`、`chunk-hcckvqyb.js@11756`、`chunk-sycgf9xs.js@3854`、`chunk-06y4szbn.js@173387` 这 6 个参数在 final 里的 `reference` 名字就是 `e`，`show` 因此不显示 `_K`。本表按真实用途给了 `dirPath`/`filePath`/`error` 等名字，resolve 后全部生效。
5. 工作区里 `naming/final` 是其它成员在用（只读），复核一律复制到 `artifacts/tmp/gap-b/`：`final`（预览，overlay 本表）、`resolved`（`resolve.mjs` 全量合并）。没有用 `ln`。

## 用到的工具

- `node --max-old-space-size=3000 tools/naming/annotate.mjs show … 1 <from> 30 naming/final` / `id <declId>` 阅读。
- `artifacts/tmp/gap-b/view.mjs`：把 `show` 输出裁成"只留有 `_K` 的行 + 上下文"，控制上下文消耗。
- `artifacts/tmp/gap-b/remaining.mjs`：按渲染列出仍无名的声明（可指定 final 目录）。
- `artifacts/tmp/gap-b/unnamed-bindings.mjs`：按 `bindingsOf` 列出区间内"名字等于压缩名或 `压缩名_`"的绑定（上面的占位条目只能这样看）。
- `artifacts/tmp/gap-b/conflicts.mjs`：跑 `renameModule` 报告本表里会被加 `_2` 的条目。
