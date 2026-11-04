# 一方代码最后剩下的压缩名：left-s1（naming-leftover-src 第 [1] 项）

范围：`analysis/segments/naming-leftover-src.json` 数组下标 **[1]**，`dirs` 首 `src/utils/transcriptDiagnostics.js`、尾 `src/vim/transitions.js`（含 `src/utils/worktree*`、`src/utils/udsMessaging*`、`src/vim/operators.js` 等 46 个目录）。清单 365 个声明、`unnamed` 合计 1,300。名字表 `artifacts/tmp/lead/final9`；起点：`naming/semantic-left-s1.jsonl` 不存在（本组首个写者）。

## 交付

| 项 | 数值 |
|---|---|
| 命名表 | `naming/semantic-left-s1.jsonl`，**1,290 行 / 1,280 个不同绑定 / 34 个 chunk**（3 个顶层、1,277 个参数与局部） |
| 批次 | 15 个批次文件 `artifacts/tmp/left-s1/b001…b015.jsonl`，每批 ≤30 个声明，全部 `cat 批次 >> 目标` 追加 |
| `annotate check naming/semantic-left-s1.jsonl artifacts/tmp/lead/final9` | **0 problems，0 suffixed by conflicts** |
| 覆盖率 | 合并（`tools/naming/resolve.mjs` → `artifacts/tmp/left-s1/resolved`）后重渲染全部 365 个声明：**只剩 5 个 `_K`**（全部是死代码，见下）；清单里能看到的 1,285 个不同 `_K` 绑定中命名了 **1,280** 个（99.6%），365 个声明里 **361 个**至少命名了一个绑定 |
| 重名/非法名 | 无保留字、无 `_2` 结尾、无 `_K<数字>`；同一函数内不再撞名（见「修掉的冲突」） |
| **命名数** | **1,280 个绑定** |
| **未命名数** | **5 个绑定，全部是死变量/从不读取的参数；没有「看不出用途所以跳过」的** |

清单 `unnamed` 1,300 与实际可见 `_K` 1,285 的差是 `annotate` 按「声明内出现的令牌」计数：同一个绑定会同时出现在定义它的声明与引用它的声明里，且清单生成后别的命名表又补过几个（例如 `chunk-e6aww6q8.js#y9` 的 `RequestBlobStore`，本表接手时它的 `has`/`successor`/`noteLine` 参数已有名字，声明内已无 `_K`）。

## 未命名清单（5 个）

| file | key（压缩名） | 所在声明 / 路径 | 原因 |
|---|---|---|---|
| `chunk-e6aww6q8.js` | `@3650398`（`r`） | `getAgentWorktreeChanges(worktreePath, baseline, r)` · `src/utils/worktree.js` | 第三个参数在整段函数里从未读取（死参数） |
| `chunk-e6aww6q8.js` | `@3651175`（`n`） | `getHookWorktreeHead(worktreePath, n)` · `src/utils/worktree.js` | 函数体只有 `return;`，第二参数从不读取 |
| `chunk-e6aww6q8.js` | `@3651238`（`s`） | `getWorkingCopyWorktreeChanges(worktreePath, originalChangeset, originalCwd, s)` · `src/utils/worktree.js` | 函数体只有 `return null;`，第四参数从不读取 |
| `chunk-e6aww6q8.js` | `@3682907`（`It`） | `execIntoTmuxWorktree` · `src/utils/worktree.js` | `let It = null;` 恒为 null（官方关掉的分支），只参与 `It === null ? null : ...`，命名反而会掩盖它是常量 |
| `chunk-j66yxmsq.js` | `@372`（`t`） | `noopStdinReset(t)` · `src/utils/windowsStdin.js` | 空函数、`refs 0`，参数从不读取 |

这 5 个查证成本很低，但按指南「看不出用途的宁可不命名」，且它们都是死代码，命名会给读者错误暗示。

## 命名约定（本组）

- 函数/类按行为命名（`describeTranscriptPosition`、`findBtwTriggerPositions`、`stripCacheControl_2`、`readWorktreeLockReason`），已有名字的一律不改。
- 参数按「是什么」：`message`、`block`、`toolUseId`、`worktreePath`、`repoRoot`、`storageV5`、`credentials`、`senderClass`、`expectPeerPid`、`expectPeerProcStart`。
- 字符串产物用 `xxxText`/`xxxKey`/`xxxReason`/`xxxHint`（`lockReason`、`refusalDetail`、`bindHint`、`fallbackDir`），映射/集合用 `xxxByYyy`（`copiesByInputs`、`verdictsById`、`inboxByPid`、`stampsById`），布尔用 `is/has/should/can`（`isLinewise`、`hasStickyBit`、`shouldDeregister`、`canChmod`）。
- 同一函数里多个同义绑定按角色区分：`firstText`/`secondText`（排序比较器）、`verdictA`/`verdictB`、`statsA`/`statsB`、`pathA`/`pathB`、`gitDirLine`/`commonDirLine`/`headRefLine`。
- 深拷贝/工具类老名字保持：`itemCount`、`strings`、`allStrings`、`copy`、`element`。
- vim 相关沿用 vim 术语：`linewise`、`textObject`/`objType`、`registerText`/`registerLinewise`、`wantedColumn`、`operatorRange`、`countTyped`、`motionCount`、`snapOutOfPlaceholder`、`placeholder`、`anchor`、`span`、`toggled`。
- 网络/UDS 相关沿用协议字段：`verifiedPeerPid`、`verifiedPeerProcStart`、`selfSentAncestry`、`hopChain`、`refspec`、`promisors`、`fetchableRemotes`。

## 修掉的冲突（引擎会加 `_2`，故改名）

`annotate check` 对本表报 0 problems，但把本表并入 `tools/naming/resolve.mjs` 的全量合并（含 final9 之后其他成员新写的 `naming/semantic-*.jsonl`）后，有 5 个绑定与同函数内别处的名字撞车，已改：

| 绑定 | 原名 | 改名 |
|---|---|---|
| `chunk-0kp6eg01.js@27397` | `dirStats` | `directoryStats` |
| `chunk-e6aww6q8.js@321635` | `messages` | `requestMessages` |
| `chunk-e6aww6q8.js@3601815` | `worktreePath` | `worktreePathCandidate` |
| `chunk-e6aww6q8.js@3602317` | `defaultBranch` | `newBaseBranch` |
| `chunk-e6aww6q8.js@3676964` | `entry` | `matchedEntry` |

改后 `resolve.mjs` 合并结果里本表的 1,280 个绑定全部原样生效：0 条被丢弃、0 条被加 `_2`（用 `artifacts/tmp/left-s1/conflictsR.mjs` 复核）。**结论：`annotate check` 只对照 final 快照，抓不到「与 final 之后新写的命名表撞名」**；收尾前必须再跑一次 `resolve.mjs` 并用它重渲染。

## 过程中的问题

1. **误用硬链接污染了共享名字表 `artifacts/tmp/lead/final9/top.json`（已完全恢复）。** 我为了增量预览建了 `artifacts/tmp/left-s1/final/`，用 `ln -f ... || cp ...` 想「链接或复制」`final9/top.json`；在这台 Git Bash 上 `ln` 成功，于是 `final/` 与 `final9/` 变成同一个 inode。随后 `overlay.mjs` 写 `final/top.json` 时把 3 个顶层绑定（`chunk-zya51bzb.js@576/@586`、`chunk-s61vbvea.js@451170`）写进了 final9。发现方式：`annotate show … final9` 输出的这几个声明从 `o_K576` 变成 `messagingSocketEnv`。处理：按原值把这 3 条改回 `{name:压缩名, min:压缩名, source:"minified", confidence:0}`（与 `resolve.mjs` 对 kept 绑定写出的形式一致），删掉硬链接、改为真复制；恢复后 `final9/top.json` 字节数回到 24,962,094（污染前原值），2649 个 chunk、186,674 条不变，`show` 对原表重新显示 `_K`。**教训：共享的 final 目录只用 `cp`，绝不用 `ln`；预览目录必须独立。**
2. **重复键**：为修正冲突我先追加过一次第一条名字（`dirStats`→`finalDirStats` 等），后来又追加最终名，因此表里 5 个 key 各出现两次（1,290 行 / 1,280 键）。合并按 confidence 取最后一条，已确认最终生效的是最后一版；顺带删掉了一次误写的 `baseBranchName_2`（`_2` 后缀违规）。
3. **`resolve.mjs` 的 compiler-cache 规范化**会把我命名的 React Compiler 缓存变量 `@30980`（`@30980 cache`）改名为 `$`（`withResolvers.js#ResultMessages` 的 `useMemoCache` 数组），与 2.1.88 源码一致，是有意行为，不算丢失。
4. **清单与渲染的计数差**（见上「覆盖率」一段）：`unnamed` 是 token-声明对，不是绑定数；判断进度要用重渲染后仍出现的 `_K`。

## 复现脚本（`artifacts/tmp/left-s1/`）

- `scan.mjs <from> <count>`：用 final9 + 本表增量渲染一批声明并列出剩余 `_K`（阅读用）。
- `overlay.mjs`：把本表合并进 `final/`（top 覆盖 + locals 连接），供 `scan.mjs`/`annotate show` 用。
- `lefts0.mjs`：只用 final9 渲染全部 365 个声明，输出每条剩余 `_K`（file、key、路径、声明、压缩名）。
- `lefts.mjs`：同上但用 `final/`（本表叠加后）。
- `lefts0.txt` / `lefts.txt`：两次输出（1,285 / 5 条）。
- `conflictsR.mjs`：用 `resolve.mjs` 的全量合并结果检查本表有没有被加 `_2`。
- `topleft.mjs`：扫本组 chunk 的顶层绑定，确认没有遗漏的顶层压缩名（剩下的都不是本组清单范围：`chunk-jhrww53q.js` 的 schema 常量、`chunk-aepeg2w5.js`/`chunk-s61vbvea.js`/`chunk-bwbq4xvm.js` 里清单外的声明）。
