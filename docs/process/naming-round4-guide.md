# 第五阶段第二波（2b）：参数与局部变量命名指南

自动化（vendor-names、ref-align、auto2/propagate）之后，一方代码（reconstructed/src）里还有约 **22 万个参数和局部变量仍是压缩名**（`e`、`t`、`V`、`A`……），分布在约 4.6 万个顶层声明里。这一轮由命名成员读代码补齐，目标是读者看任何一个函数都不用猜变量是什么。

## 你的范围

`analysis/segments/naming-round4.json` 是数组，**下标从 0 开始，你的组号 N 就是数组下标 N**（第 0 组是 `[0]`；上一轮有成员把组号当成从 1 数，做了别人的清单）。第 N 项：`{dirs, unnamed, decls:[{id, file, start, end, path, unnamed, refs}]}`，按阅读树路径排好序。开工前打印 `dirs` 的首尾，确认与派活消息里写的一致。

## 工具

```bash
# 看第 N 组第 from 个起的 count 个声明（已应用全部现有名字；仍压缩的参数/局部显示为 <压缩名>_K<偏移>）
node --max-old-space-size=3000 tools/naming/annotate.mjs show analysis/segments/naming-round4.json <N> <from> <count>
# 看单个声明
node --max-old-space-size=3000 tools/naming/annotate.mjs id <声明id>
# 校验你的命名表（必须 0 problems）
node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-l<N>.jsonl
```

输出里 `=== chunk-ag5x7vhf.js#Gs → reconstructed/src/ink/output.js (file chunk-ag5x7vhf.js, 6 unnamed)` 之后是该声明的代码。`k_K17884` 表示 chunk-ag5x7vhf.js 里偏移 17884 的绑定，命名表一行：

```json
{"file":"chunk-ag5x7vhf.js","key":"@17884","name":"rowStart","source":"semantic","confidence":0.8}
```

建议每次 `show` 30–50 个声明，读完一批写一批（追加到 `naming/semantic-l<N>.jsonl`；`note` 可省略，不写说明），每写完约 2,000 行跑一次 `check`。清单很长（约 1–1.7 万个绑定），请保持节奏：读一批、写一批，不要为单个名字反复查证。

## 命名规则

- lowerCamelCase；布尔 is/has/should；计数 count/xxxCount；下标 i/j/idx 可以保留短名；回调参数按元素含义（`message`、`entry`、`[key, value]`）。
- 名字说明"是什么"，不说明类型（`lines` 好于 `arr`，`timeoutMs` 好于 `num`）。
- 同一函数里不要两个绑定同名（引擎会加 `_2`，不美观）；不要用保留字和全局名（`process`、`require`、`fetch`、`URL`、`Buffer`、`name` 以外的 DOM 全局等）。
- 看不出用途的宁可不命名（错名比压缩名更误导人）。React Compiler 的缓存临时变量（`$[3]` 之类相关的 `t0`）按存的是什么命名。
- 只命名显示为 `_K<偏移>` 的绑定；已有名字的不要改（发现明显错误的，记进过程文档，不要在本表覆盖）。
- 置信度 0.6–0.9。

## 优先顺序

清单已按路径排序。先把整组过一遍（覆盖率优先），大函数（unnamed 多的）也要做完；时间不够时，跳过 `unnamed` ≤ 2 且 `refs` 很少的小声明。

## 续做（上下文用尽或中断后由新成员接手）

- 第二批接手（2026-11-03 21:50 起）用 `analysis/segments/naming-round4c.json` + `artifacts/tmp/lead/final5`；剩余量大的组拆成两半，后半段的成员写独立文件 `naming/semantic-l<N>x.jsonl`（`show` 的 from 从派活消息给的位置开始）。不要用 Write 工具整体重写已有的命名表（l17 因此丢过 2,353 行），只追加。
- 清单换成 `analysis/segments/naming-round4b.json`（同样的下标，只含仍有压缩名的声明，`unnamed` 已按当前进度重算），名字表用 `artifacts/tmp/lead/final4`（已含各组截至接手时写入的名字）：
  ```bash
  node --max-old-space-size=3000 tools/naming/annotate.mjs show analysis/segments/naming-round4b.json <N> <from> <count> artifacts/tmp/lead/final4
  ```
- **追加**到原来的 `naming/semantic-l<N>.jsonl`，不要重写或删除已有行。
- 控制上下文：每批 `show` 不超过 30 个声明、输出不超过约 600 行；不要整文件读阅读树、不要反复打印同一段代码；每批写完就进下一批。上一任成员就是因为上下文超过上限而中止的。
- 过程文档 `docs/process/naming-l<N>.md` 记两段：前任写到哪里（接手时表的行数）、你续写了多少。

## 交付物

- `naming/semantic-l<N>.jsonl`（check 0 problems）
- `docs/process/naming-l<N>.md`：命名了多少、跳过多少及原因、发现的问题（错名、放错文件）。
- `docs/WORKLOG.md` 末尾追加一行。

## 规则

只写上述文件和 `artifacts/tmp/l<N>/`；不改 tools/、analysis/、naming/ 下其他文件、reconstructed/；不 git commit；不派生子代理；不运行 `tools/pipeline.sh`；node 内存 ≤3000 MB（同时有十几个成员在跑）。

## 第三方代码（vendor）补名

- 清单 `analysis/segments/naming-vendor.json`（`plan ... --tree vendor --top` 生成，下标从 0），名字表 `artifacts/tmp/lead/final8`；顶层绑定也显示为 `<压缩名>_K<偏移>`，同样用偏移键命名。
- 命名表写 `naming/semantic-v<N>.jsonl`（只追加）。
- 第三方代码按包的习惯命名：CommonJS 包裹变量用 `require_<文件或模块名>`，`x(...)` 懒初始化用 `init_<名>`，导出对象的属性名（`exports.foo = a` 里的 foo）就是 `a` 的名字的首选；私有包（private-unresolved，无 npm 源码）按代码行为和字符串命名。
- 不要用 `_K<偏移>` 作为名字的一部分（合并时会被丢弃）。
- 共享的名字表目录（`artifacts/tmp/lead/final*`）只读：预览目录用 `cp` 复制，绝不用 `ln`（Git Bash 上 `ln` 会建硬链接，写预览就写坏了共享表；left-s1 踩过）。
