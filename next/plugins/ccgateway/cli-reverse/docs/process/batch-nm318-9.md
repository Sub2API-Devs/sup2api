# 批次 nm318-9：命名

## 范围与结果

- 范围：`src/tools/ProjectsTool/projectRead.js` … `src/utils/model/modelCatalog/maskedIds.js`，`plan.json` 下标 0 的 536 个声明、1598 个仍压缩的绑定。
- 结果：`naming/semantic-nm318-9.jsonl` 1411 行，全部偏移键，`source` 一律 `semantic`。
- 校验：`node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-nm318-9.jsonl` → `1411 lines, 92 chunks, 0 problems, 0 suffixed by conflicts`。
- 按 `plan.json` 的 `unnamed` 预算逐声明复核（脚本 `artifacts/tmp/batches/nm318-9/work/count.mjs`），536 个声明的剩余占位绑定数为 0。行数比预算少，是因为部分声明的顶层/局部早已被 `naming/final` 里的名字覆盖，预算把同一绑定按声明重复计了一次。

## 做法

1. 先用 `tools/naming/annotate.mjs show` 按每批 4–18 个声明读源码，同时用自己写的 `work/slots.mjs` 列出该声明里**确实是占位**的绑定（排除已冻结、已有名字、名字长于 3 的），保证只写该写的偏移。
2. 命名依据优先取 316 的对拍名字（`hints.jsonl`，316 条全部落在本批 79 个声明里），其次取字符串字面量（错误文案、`tengu_*` 事件名、环境变量、schema 字段名）、属性名和调用关系。391 条 `local-not-aligned`/`low-similarity` 提示只用来确认语义，偏移一律以 318 现码为准。
3. 每写 20–80 行跑一次 `check`；出现 `suffixed by conflicts` 时用 `work/conflict.mjs` 定位，改成同义不同名的写法（例如同一函数里多个 `content` 改成 `sourceContent`/`rawContent`/`data`），直到归零。
4. 全程只写 `naming/semantic-nm318-9.jsonl` 与 `docs/process/batch-nm318-9.md`，草稿脚本放在 `artifacts/tmp/batches/nm318-9/work/`。

## 跳过的条目

无。536 个声明的占位绑定全部命名完毕。

## 发现的问题

- `chunk-73r4a0j7.js#Le`（`utils/background/adopt.js`）：既有名字 `adoptShellRoots` 与函数体不一致——它返回的是候选目录路径加分隔符的列表，不做任何“adopt”。已按实义命名其内部绑定，未改函数名。
- `chunk-5xgkngpb.js` 里 `utils/hooks.js` 的 `sW`（`execCommandHook`）与 `j$`（`executeHooksOutsideREPL`）两个大函数参数极多且大量 `_K` 占位集中，命名只能靠调用处的实参位置判断；个别形如 `Y_K3555205`、`Ve_K3555234` 的“可空覆盖值”取的是 `execCommand`/`bunOptionsFrom` 这类描述性名字，置信度 0.65–0.75。
- `chunk-1p1fwh3h.js`/`chunk-9xh6zw2q.js` 的 `$ps`、`h`、`MMt`（`upstreamproxy/proxyFetch.js`）三个函数都围绕同一个 TLS 会话 fetch 包装，`@986` 附近既有名字已经占用了 `sessionFetch`，只能改用 `sessionFetch`/`fetchOptions` 等变体，读起来略重复。
- `chunk-5xgkngpb.js#iZt`（`utils/api.js`）是注册进来的“描述前缀提供者”，全仓只有 `sci` 写入、`YU` 读取，`sci` 未导出；命名取 `toolDescriptionPrefixProvider`/`registerToolDescriptionPrefixProvider`，置信度 0.7。
- `chunk-4z1ntdgk.js` 的 `shellReader.js`/`commandReach.js` 是 316 新增的 shell 解析层，几乎每个函数都是密集的单字母参数。命中了大量 `program`/`args`/`text`/`state` 之类的重复名，conflict 改了几轮；其中 `mi`（`splitPipeline`）21 处占位按“词/词下标/命令/条件位置”分组命名。
- `plan.json` 的 `unnamed` 与当前 `naming/final` 有重复计数：按声明累加的预算（1598）大于实际需要命名的占位绑定数（1411 行），复核时以 `work/count.mjs` 的实测为准。
