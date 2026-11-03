# 第五阶段第四轮（参数/局部）命名：name-l17c（组 17，续做）

范围：`analysis/segments/naming-round4c.json` 第 17 项（下标 17），清单 `dirs` 首尾为 `src/utils/systemPrompt.js` … `src/vim/types.js`，实际是 `src/utils/` 后半段到 `src/vim/` 的字母序：

- `teleport.js`、`teleport/`（dirSync、dirSyncRules、gitBundle、gitBundleLayout、gitBundleVerify、handoffRelay、homeSettingsMode、partialClone、repositoriesTrusted、screenedGit、seedAttestation、wipStash、worktreeRegistrations 等）
- `transcript.js` 一族（deserialize、entryTypes、resumeAnnouncements、resumeLoadReport、transcriptFiles、transcriptRepair、transcriptRequestBlobs、transcriptWriter…）、`toolSearch.js`、`toolResultStorage.js`
- `udsMessaging`（udsMessaging、udsClient、peerGuard）、`wireToolInputEcho/Repair`、`worktree.js` 与 `worktree/*`、`worktreeIsolation.js`、`wslMounts/wslPaths`、`xml*`、`vim/*`

## 前任写到哪里

接手时 `naming/semantic-l17.jsonl` 为 **6,409 行、100 个 chunk，`annotate check` 0 problems**（21:38 写入，内容与 `artifacts/tmp/lead/prev-l17.jsonl` 一致）。用 `artifacts/tmp/lead/final5` 重算：组内 849 个声明里还有 **341 个声明、2,315 个绑定**显示为 `_K<偏移>`。

## 本次续写

| 项 | 数量 |
|---|---|
| 接手时行数 | 6,409（一行未删、未重写） |
| 本次追加条目 | **2,302**（92 个批次文件，`cat 批次 >> 目标` 追加） |
| 最终行数 | 8,711 |
| 覆盖的声明 | 335 个（341 减 6 个只含死变量的声明） |
| 覆盖的绑定 | 2,303（2,315 减跳过 12） |
| `annotate check` | **0 problems** |
| 相对基线新增的 `_2/_3` 撞名 | **0**（基线自身 5,589 处不变） |
| 覆盖复核 | 用「final5 + 本表合并」重跑，组内剩余 `_K` 偏移 **12 个 / 6 个声明**，全是死变量（见“跳过”） |

置信度分布（本次 2,302 条）：0.85 141、0.82 24、0.8 477、0.78 93、0.75 362、0.73 1、0.72 137、0.7 438、0.68 273、0.65 298、0.63 1、0.62 8、0.6 49。

## 做法

- 自写 `artifacts/tmp/l17c/` 下几个只读小工具（`showidx.mjs` 按声明下标批量展示、`remain.mjs` 用「final5 + 本表」重算剩余 `_K`、`conflicts.mjs` 复刻 rename 打印“会被加 `_2`”的冲突、`allconf.mjs` 对比全表与基线的冲突差异、`rename.mjs` 批量改名）。节点内存一律 ≤3000 MB。
- 每批 `show` 1–26 个声明（多数 20 个以内），读完立刻写 `bNN.jsonl` 再 `cat >>`，每批之后跑 `check`。
- 大函数优先：`gitBundle.createAndUploadGitBundle`（109 绑定）、`wipStash.captureWipStash`（154）、`teleportToRemote`（70）、`deserializeMessagesImpl`（103）、`worktree.getOrCreateWorktree`/`removeAgentWorktree`/`cleanupWorktree` 等先做完，再回头做零散小声明。
- 撞名处理：`check` 只报总数，另用 `conflicts.mjs`/`allconf.mjs` 拿到明细后逐个改名（`readRules`→`readRuleSet`、`behavior`→`trialBehavior`、`errors`→`settingsErrors`、`defaultBranch`→`branchName`、`lastMessageAgeMs`→`messageAgeMs`、`seedRefNames`→`seedRefNamesList`、`gitSource`→`repoSource`、`bundlePath`→`outputBundlePath` 等），最后用 `comm` 与基线冲突表对比，确认**新增 0 处**。
- 中途发现三处自己写错 `file` 字段/写到不存在的偏移（`@3585000` 应在 `chunk-e6aww6q8.js` 而非 `chunk-gjx0rh1b.js`；另有 8 行写成不存在的偏移），`check` 报 “no binding at this offset” 后已删除或改对。
- 去重：写完复查发现 18 行与已有行或彼此重复（同一 `file`+`key`），删掉低质量的那一条（例如 `chunk-aepeg2w5.js@767920` 我先写了 0.75 的 `self`，表里已有 0.8 的同名行）。

## 跳过（12 个绑定 / 6 个声明，全部是死变量）

| 声明 | 绑定 | 原因 |
|---|---|---|
| `chunk-e6aww6q8.js#AF`（teleportToRemote） | `no_K1974586`、`Hi_K1986484`、`Ah_K2004309` | 分别声明为 `null` / `void 0` / `!1` 后再无读取或赋值，功能已删除的残留 |
| `chunk-e6aww6q8.js#Y3e`（classifySyncRoot） | `S_K1890430`、`ze_K1891267` | 前者作为第 7 个参数一路透传给递归调用却从未使用；后者是常量空数组 `[]` |
| `chunk-e6aww6q8.js#nTe`（createSyncDenyFilter） | `L_K1895974`、`ke_K1896026` | 都是 `!1`，赋值后从不读 |
| `chunk-e6aww6q8.js#dWr`（resolveDirSyncRules） | `ze_K1898654` | `null` 常量，从不读 |
| `chunk-e6aww6q8.js#z3e`（logTrustedRepositoriesOutcome） | `n_K1882413` | `default:` 分支里把 `outcome` 绑到局部名再也不用 |
| `chunk-e6aww6q8.js#aKi`（execIntoTmuxWorktree） | `It_K3682907`、`Yt_K3682915`、`qt_K3682942` | `It` 是硬编码 `null`，`Yt`/`qt` 全部由它派生，`if (qt !== null)` 整段是走不到的开发用 `bun run watch` 分支 |

按“看不出用途的宁可不命名”，这些保留压缩名（其中 `@1974586` 表里已有前任写的一行，见下）。

## 发现的问题（仅记录，未在本表覆盖）

1. **前任的错名**：`chunk-e6aww6q8.js@1974586` 表里写的是 `{"name":"no_K1974586"}` —— 把“压缩名占位符”本身当成了名字（该绑定实际叫 `no`）。按规则不覆盖既有名字，仅在此记录，建议后续统一清理这类 `xxx_K<偏移>` 形式的名字。
2. **死代码残留**：`execIntoTmuxWorktree`（`chunk-e6aww6q8.js#aKi`）里 `It_K3682907 = null` 之后仍保留完整的 `bun run watch` / `bun run start` 三窗格启动逻辑，永远不执行；`classifySyncRoot` 的第 7 参数 `S_K1890430` 同理。
3. **已有名字的 `_2/_3` 后缀很密**：`gitBundle.js` 里同一作用域出现 `gitSource`、`gitSource_2`、`gitSource_3`，`teleport.js` 的 `teleportToRemote` 里 `env`、`env_2`、`now`、`now_2` 并存，是早前自动命名撞名留下的，读起来割裂；本轮把新写到的几处按语义改成了 `repoSource` 之类，但旧名未动。
4. **同名参数跨层遮蔽**：`console.log`/`JSON` 之类的全局被局部参数同名遮蔽的情况在本组不多，但 `mount`、`entry`、`type`、`uuid` 这类通用名在相邻小函数里大量重复——不是错，只是复查时容易看串。
5. **`wipStash.js` 与 `gitBundle.js` 共用一个 chunk**（`chunk-gjx0rh1b.js`），同一偏移空间；命名时必须按 `file`+`key` 记录，不能按阅读树文件去重（本轮已按此处理）。
6. **`teleport/` 下 `dirSync.js`、`dirSyncRules.js`、`screenedGit.js` 都在 `chunk-e6aww6q8.js`**，与 `teleport.js`、`transcript/deserialize.js` 等十余个阅读树文件共享一个 400 万字符的 chunk，`show` 一次就要重写整个 chunk 的绑定表，是本组最费时的地方（单次 `show` 约 20–40 s）。
