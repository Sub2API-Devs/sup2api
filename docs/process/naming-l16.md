# 第五阶段第四轮（参数/局部）命名：name-l16b（组 16 续做）

范围：`analysis/segments/naming-round4b.json` 第 16 项，从 `src/utils/redactSecrets.js` 到 `src/utils/swarm/teammateMessageRepair.js`（107 个路径、1,069 个声明，接手时剩余 3,723 个 `_K` 绑定）。名字表 `naming/semantic-l16.jsonl`，清单 `naming-round4b.json`（只含仍有压缩名的声明），现名基线 `artifacts/tmp/lead/final4`。

## 前任写到哪里

接手时 `naming/semantic-l16.jsonl` 为 **7,386 行、80 个 chunk，`annotate check` 0 problems**。用 final4 重算清单：1,069 个声明里 1,069 个仍有压缩名（清单本身只含非零项），合计 **3,723 个 `_K` 绑定**，最大 6 个声明各占 98/149/59/45/43/42 个。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时行数 | 7,386（全部保留，只追加） |
| 本次追加条目 | 3,717（约 60 批，`cat 批次 >> 目标` 追加，未整体重写） |
| 主动撤回 | 4（死变量/未读数：`chunk-cgr0tezp.js@10918`、`chunk-fq0cr76a.js@899482`、`chunk-dcmhvw5a.js@328936`、`chunk-rtnapjwv.js@16148`） |
| 最终行数 | 11,099（净增 3,713），162 个 chunk，键无重复 |
| 有新名字的声明 | 1,065 / 1,069 |
| `annotate check` | **0 problems**，0 suffixed by conflicts |
| 剩余 `_K` 绑定 | **4**（即上面 4 个刻意跳过的绑定） |

置信度分布（本次 3,713 条）：0.85 129、0.8 3,504、0.75 58、0.7 19、0.6 3。0.6 的三条是正则捕获组（`encodedAtQuoted` / `encodedAtPlain` 两个 `%40` 分支谁是谁只能靠语义猜）和一个模板字符串里插值的设置路径名（`settingPath`）。

## 做法

1. 清单里声明很碎（1,069 个里 455 个只有 1 个绑定），直接按 `show` 的偏移分页会读大量「已无剩余」的声明。写了一个只渲染有剩余绑定的脚本：从 `annotate show` 的输出里按 `_K` 记号定位，每个记号带前后一行上下文，声明头保留。大函数（98/149/59 个绑定）单独 `dump` 到文件再用同样的过滤读全文，避免反复打印同一段代码。
2. `show` 的 final4 不含自己刚写的条目，因此每次批末重建合并目录（final4 的 `top.json` + `locals.jsonl` 与本表拼接）再重算剩余，保证下一批看到的是最新状态、也保证最终剩余量可信。
3. 每批 `cat 批次 >> naming/semantic-l16.jsonl` 后立刻 `annotate check`，全程 0 problems；撞名用只针对本表的检测脚本找出，逐个改名（见下）。
4. 按「看不出用途不命名」撤回 4 条；另外 6 处因为猜错文件（`chunk-r5n7tcxe.js` 的 8 个绑定写成了 `chunk-dcmhvw5a.js`）被 `check` 报 `no binding at this offset`，已修正到正确 chunk。

## 撞名处理

`check` 报出约 40 次 `_2` 撞名（`same-scope` / `captures-outer-or-global` / `param-body-or-catch-clash`），全部改名消除，最后 0 suffixed。典型改法：

- 外层同名被捕获：`bridgeSession`→`effectiveBridgeSession`、`cwdFilePath`→`trackingFilePath`、`filePath`→`stubFilePath`、`credentials`→`keptCredentials`、`network`/`filesystem`→`keptNetwork`/`keptFilesystem`、`claudeEntryUid`→`entryUid`、`fileAuthored`→`fileAuthoredContent`、`unsetStmt`→`unsetOnSuccessStmt`、`properties`→`propertyMap`、`error`→`caughtError`、`filtered`→`heldMessages`。
- 同作用域重名：`task`→`currentTask`/`stateTask`、`scope`→`currentScope`、`busy`→`refinementAcc`、`pollInterval`→`watchPollInterval`、`comparison`→`hourBand`、`accessKeyIdVar`→`normalizedKeyId` 等；`storageV5`/`sessionId` 撞参数时改 `storageBackend`/`targetSessionId`。

## 跳过

4 个，均为「声明了但从不读取」的占位：

- `chunk-cgr0tezp.js@10918`（`resultError.js` `escapeControlChars` 里 `Array.from` 的第一个回调参数，函数体只用第二个 `index`）。
- `chunk-fq0cr76a.js@899482`（`ripgrep.js` `countFilesRoundedRg` 里的 `let fileCount, x = null;`，`x` 从未参与计算）。
- `chunk-dcmhvw5a.js@328936`（`buildPolicyTolerantSettingsSchema` 里 `.transform((value, ctx) => …)` 的第二参数，函数体未用）。
- `chunk-rtnapjwv.js@16148`（`subprocessEnv` 里 `let unused = !1;`，紧接 `unused = …some(...)` 后在「全量短路」条件里被引用一次，语义是恒 `false` 的占位开关，按原样命名会误导人）。

## 发现的问题

- `src/utils/swarm/inProcessRunner.js` 的 `waitForNextPromptOrShutdown`（`chunk-8xs34hez.js#Me`）里同一个「投递前先把消息过 receive 钩子」的闭包 `V` 出现了两次用途（shutdown 优先分支和普通投递分支），第二处已经先 `markMessagesAsRead` 再返回，前一处是「先交付再标记」，两条路径顺序不一致，读起来容易误判谁负责标记已读。
- `chunk-e6aww6q8.js#hbe`（`Shell.js` 的 `exec`）里 `commandString` 被沙箱包装反复改写（Windows 编码 PowerShell、seccomp 包装、`retryWithoutSignalOnAbort` 重试三处都覆盖同一个变量），而 `carriedCommandText` 只在最后拼回 argv，两者不是同一样东西，命名上必须分开，否则会以为重试改的是同一份文本。
- `src/utils/settings/types.js` 的 `buildPolicyTolerantSettingsSchema`（149 个绑定）把多组「宽容解析 + 降级/剔除/记录」用的可变状态（`pairSeq`、`salvagedPairs`、`failClosedGroupNames`、`degradedSigv4Flavors` 及其清空时机）分散在一个超大函数里，任何一条路径忘了清空都会污染下一个键；同函数里 `normalizePair` 还会递归调用自己以抢救「密钥名被填到 secret 槽」的错位对。
- `src/utils/sandbox/sandbox-adapter.js` 的 `convertToSandboxRuntimeConfig` 里对 `denyLexicals` 的「可信/不可信」两级语义（`addDenyLexical` 只置位 `trusted`，`denyReachesLiteral` 要求 lexical 还能覆盖 literal）没有任何注释，只靠日志字符串区分，容易被后续改动改坏。
- `src/utils/swarm/teammateMessageRepair.js` 的 `MAX_REPAIR_CACHE` 是 64，而 `rememberRepair` 的淘汰是在 set 之后立即删最旧，超过容量时新条目本身也可能被删（`keys().next().value ?? requestId` 的兜底恰好指向刚才那条），边界上会丢刚记下的修复记录。
- `src/utils/startupTiming.js` 的 `telemetryFields()` 里 `other_ms = allTotalMs - listedTotalMs` 用的两个总和来源不同（一个按 `STARTUP_PHASE_FIELDS` 白名单累加、一个按 `Object.values(this.phases)` 全量累加），历史上加过新阶段没进白名单时这个差值会变成负数上限为 0，掩盖遗漏。
