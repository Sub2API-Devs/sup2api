# gap-a：最后一批压缩名（一方 413 个声明 + 第三方 28 个声明）

范围：`analysis/segments/naming-final-gap.json` 的下标 [0]（src，413 个声明、计划 454 个绑定）与下标 [2]（vendor，28 个声明、55 个绑定）。下标 [1] 由 gap-b 负责，未触碰。

## 结果

| 项 | 数量 |
| --- | --- |
| 命名表 `naming/semantic-gap-a.jsonl` | 493 行（194 个 chunk，377 个不同名字，全部 `source=semantic`，confidence 0.70–0.85） |
| 其中 src（下标 [0]） | 442 个绑定（清单该组共 448 个可见绑定） |
| 其中 vendor（下标 [2]） | 51 个绑定（全部） |
| 未命名（src） | 6 个，全部是死局部（见下表） |
| 未命名（vendor） | 0 |
| `annotate check` | 493 lines / 194 chunks / **0 problems / 0 suffixed** |
| `resolve.mjs` 合并到 `artifacts/tmp/gap-a/final` 后 | 我的 493 条全部原样生效：0 丢弃、0 改名、0 加 `_2` |
| 用合并表重渲染 | src 只剩 6 个 `_K`（1 个声明），vendor 剩 0；与 gap-b 的表 0 重叠、0 撞名 |

命名依据：读声明本身 + 调用方实参名 + `reconstructed/src` 里对应位置的已命名版本（阅读树里大多数函数已经有名字，可以拿来对齐）+ vendor 的 npm 源码（`vendor-ref/node_modules`）。

## 未命名清单

| chunk-x.js | `@偏移` | 所在函数/文件 | 原因 |
| --- | --- | --- | --- |
| chunk-e6aww6q8.js | `@2677189` | `queryModel` / src/services/api/claude.js | 死局部：`let Io` 声明后从来没有被读取（refs=0） |
| chunk-e6aww6q8.js | `@2703574` | `queryModel` / src/services/api/claude.js | 死局部：`let FT` 声明后从来没有被读取（refs=0） |
| chunk-e6aww6q8.js | `@2714919` | `queryModel` / src/services/api/claude.js | 死局部：`let NMs = void 0` 之后从未读取（refs=0） |
| chunk-e6aww6q8.js | `@2715014` | `queryModel` / src/services/api/claude.js | 死局部：`let $Ms = void 0` 之后从未读取（refs=0） |
| chunk-e6aww6q8.js | `@2721080` | `queryModel` / src/services/api/claude.js | 死局部：`let HMs = "idle"` 之后从未读取，两个与之相邻的 recovery 回调也都是空函数（refs=0） |
| chunk-e6aww6q8.js | `@2738315` | `queryModel` / src/services/api/claude.js | 死局部：`async function* BMs() {}` 空生成器，全文件没有调用点（refs=0） |

这 6 个都是官方构建里被摇树/重构后残留的未接线局部，起名只会误导，故按指南跳过。

## 发现的问题

1. **清单的 `unnamed` 与实际渲染不一致（12 个声明）**：清单里 413 个声明共记 454 个绑定，但按声明区间用 `bindingsOf` 实际渲染只有 448 个可见 `_K`；另有 11 个声明清单记 1 个、渲染 0 个（`chunk-ag5x7vhf.js#aC`、`chunk-7nse75qx.js#u`、`chunk-bzr73sfg.js#Id/@Ro/@Mo/@tgt/@ax/@Sx`、`chunk-e6aww6q8.js#gx`、`chunk-1ny7cxrt.js#u1`、`chunk-x6v6jz2y.js#K`），以及 `chunk-e6aww6q8.js#e_n` 清单记 4、渲染 10。原因是清单按“声明区间内出现的令牌”累计，区间互相重叠或令牌属于别的声明时会重复/漏算（left-v、left-s0 也报过同类问题）。我按渲染结果为准逐条命名，所以表里 442 条覆盖了渲染出的全部非死绑定。
2. **`annotate check` 不校验 RESERVED，`show` 与 `resolve` 口径不同**：check 只拒绝 `tools/naming/lib/reserved.mjs` 名单（已修过一版），但 `resolve.mjs` 还会丢弃 `validName` 之外的名字；本次我全部使用 lowerCamelCase 且避开保留字，merge 后 0 丢弃，没有踩到。
3. **`check` 不检查跨表撞名**：check 只拿 `naming/final` 快照对照，抓不到 gap-b 同时写入的新名字。merge 前我用全量 `resolve` 复核过一次（我的 493 条 0 改名、0 `_2`），与 gap-b 的表键集合完全不相交，因此无冲突。
4. **本次命中的压缩名高度集中**：499 个目标里 `e` 163、`n` 53、`i` 41、`r` 35，说明这批正好是 esbuild 作用域里被复用最狠的短名，单看声明本身不足以判断，必须结合调用方实参名和阅读树里的同名函数对齐（例如 `publishPostTurnSummary(handle, …)`、`getBridgeSession(bridgeSessionId, …)`）。
5. **vendor 侧几乎全部可以直接用 npm 原名**：54 个绑定里 46 个能从 `vendor-ref/node_modules` 的源码逐字取回原名（diff `parsePatch` 的 `i`→`lineIndex` 取的是语义名、bignumber 的 `c`/`y` 按 `coefficient`/`carry` 按行为命名，因为源码本身也是压缩过的 `bignumber.js`），其余按包习惯命名（`scanPos`、`docSlot`、`serverTransport` 等）。`private-unresolved` 没有源码，按调用方语义命名（`schema`、`propName`）。

## 复核方法

```bash
sh artifacts/tmp/gap-a/mkfinal.sh                 # cp naming/final → artifacts/tmp/gap-a/final 并叠加本表（仅预览用）
node --max-old-space-size=8000 tools/naming/resolve.mjs analysis artifacts/tmp/gap-a/final
node --max-old-space-size=3000 tools/naming/annotate.mjs show analysis/segments/naming-final-gap.json 0 0 413 artifacts/tmp/gap-a/final
node --max-old-space-size=3000 tools/naming/annotate.mjs show analysis/segments/naming-final-gap.json 2 0 28 artifacts/tmp/gap-a/final
```

`artifacts/tmp/gap-a/compact.mjs` 是本次用的紧凑预览脚本（只打印声明头和含 `_K` 的行，支持 `CTX`/`RANGE`/`FINAL` 环境变量）。共享目录 `naming/final` 全程只读，预览目录一律 `cp -r` 复制。
