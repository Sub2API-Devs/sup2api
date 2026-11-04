# 手册引用的中间数据

手册写作时生成的小文件。原来放在 `artifacts/tmp/`，那个目录不入库，干净检出后手册里的这些引用就找不到了，2026-11-04 搬到这里入库。内容和当时一样，没有改动。

| 文件 | 引用它的手册 | 内容 |
|---|---|---|
| `bootstrap/env.tsv` | `bootstrap.md` | 启动阶段读取的环境变量清单 |
| `state/groups.json`、`state/oldkeys.txt`、`state/newkeys.txt` | `state.md` | 会话状态字段的分组，以及 2.1.88 和 316 的字段名对比 |
| `tools/toolfields.mjs` | `tools.md` | 统计 316 工具定义对象各字段出现次数的脚本，在 cli-reverse 目录执行 |
| `tools/semantic.jsonl` | `tools.md` | 写工具手册时整理的工具相关命名 |
