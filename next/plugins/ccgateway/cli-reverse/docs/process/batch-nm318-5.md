# nm318-5 命名批次

## 范围

`plan.json` 下标 0，475 个声明 / 1599 个未命名绑定，路径 `src/bridge/worktreeState.js` … `src/components/Messages.js`，共 106 个 chunk、111 个目录。`hints.jsonl` 只有 98 个声明有 316 同名提示（387 条），其余是 318 新增或重排过的代码。

## 结果

- 写入 `naming/semantic-nm318-5.jsonl`：1449 行，覆盖 `plan` 里全部 1310 个可命名（未冻结、无既存名）绑定，覆盖率 100%。
- `annotate.mjs check`：`1449 lines, 99 chunks, 0 problems, 0 suffixed by conflicts`（退出码 0）。
- 全部用偏移键 `file` + `key:"@N"`，`source` 一律 `semantic`，`confidence` 0.6–0.9；没有一行用 `top`/`export`。
- 没有跳过条目。确有 7 处只能给占位名（`unused`/`_unused`/`_opts`），见下。

## 做法

- 先 `show` 读代码再写；每 20–60 行落盘一次，每批结束跑 `check`。
- 有 316 提示的声明（98 个）按 `hints.jsonl` 沿用了 316 的名字（如 `cwd`、`args`、`pluginOnlyNames`），并读 318 代码确认含义未变。
- 现场写了几个草稿脚本（都在 `artifacts/tmp/batches/nm318-5/work/`）：
  - `binds.mjs` / `binds2.mjs`：列出声明范围内的绑定键，`binds2` 会标出 `naming/final` 里的既存名，避免重复命名；
  - `count.mjs`：统计某标识符在声明内的出现次数；
  - `conflicts.mjs`：复现 `check` 的改名引擎，定位被加后缀的键；
  - `progress.mjs` / `todo.mjs`：按 `bindingsOf` 统计实际覆盖率、列出还没命名的声明，用来在用到 `plan` 的 `unnamed` 计数之外核对真实进度。

## 发现的问题

1. **`plan.json` 的 `unnamed` 计数与实际可命名绑定不一致**：`unnamed` 是 1599，但扣掉冻结和 `naming/final` 已有名后实际只剩 1310 个可命名绑定；按 `unnamed` 算覆盖率会永远到不了 100%。建议 lead 侧重算 `plan` 时用 `bindingsOf` + 既存名过滤。
2. **同一个 `file`+`key` 在多处被写重复**（`chunk-tmkr83ys.js@2972`、`chunk-hjswk319.js@49031`、`chunk-0p9n1dy7.js@20557`、`chunk-0p9n1dy7.js@20561`）以及 `chunk-163scjsz.js@19668` 先写了 `state` 又写了 `reconnecting`。已按后者去重，最终 1449 行为唯一键。
3. **写错文件前缀一次**：把属于 `chunk-pvz3y4bf.js` 的偏移写成了 `chunk-h6004nzv.js`，`check` 报 3 条 `no binding at this offset`，删掉重写。
4. **`chunk-czq1j3j2.jsonl` 当文件名写进 `file` 字段**一次，`check` 报 `no such chunk`，改回 `chunk-czq1j3j2.js`。
5. **保留字/全局名撞墙**：`chunk-qyz2x025.js@125977` 想叫 `self`、`chunk-5xgkngpb.js@2097699` 想叫 `module`，都被 `check` 按 `RESERVED` 拒，改 `client` / `loadedModule`。`chunk-5xgkngpb.js@1839226`、`@1839294` 一开始直接沿用压缩名 `y`/`S`，被 `name equals the minified name` 拒，改 `prompt` / `fromSubagent`。
6. **大量同作用域同名**：318 的巨型函数里普遍存在多个 `message`、`row`、`state`、`value`、`id`、`entry` 等同义局部（例如 `chunk-0yw3taqg.js#$Y` 一个函数约 200 KB、`chunk-czq1j3j2.js#SMe` 一个渲染函数近百个局部）。引擎的 `same-scope`/`captures-outer-or-global` 冲突比 316 多得多，改名约 30 次才归零；现在这些位置用了 `message`/`messageRow`、`firstContentBlock`/`contentBlock`、`state_2` 之外的专名（`forwardedSettings`、`dialogColor`、`autoModeConsentRow` 等）区分。
7. **部分名字只能到"宽泛但不算错"**：`chunk-8as4prnp.js@35425`、`@35451`、`chunk-czq1j3j2.js@1143939`、`chunk-0yw3taqg.js@917701`、`chunk-5xgkngpb.js@1763347` 是纯占位形参（函数体忽略），命名 `unused`/`_unused`；`chunk-sj6t0nqg.js@6885`、`chunk-abba4dz7.js@1366` 是解构里未用到的字段，命名 `_opts`。`chunk-h6004nzv.js#Mn`、`chunk-9ac95zt3` 相关的几个 `key`/`content`/`view` 只到中等置信度（0.7）。
8. **316 没有对应代码的声明很多**（377/475），这些位置完全靠 318 代码本身推断；其中相当一部分是 React Compiler 生成的记忆化临时变量，按它们装的内容命名（`measureEffect`、`stepRowElements`、`impressionCallback` 等）。
9. 没发现已有名字明显错误，也没有发现代码放错文件。

## 遗留

无。如果要提高质量，优先复核 `chunk-ny1a8wws.js#ot`（53 个绑定，模型切换与用量额度同意流程交织）、`chunk-czq1j3j2.js#SMe`（92 个绑定）里那些 0.6–0.7 的名字。
