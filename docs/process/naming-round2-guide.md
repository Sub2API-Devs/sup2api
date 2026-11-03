# 第四阶段：第二轮命名指南

整合后阅读树里还有约 **18,400 个一方顶层声明（≥100 字节，共约 6 MB）仍是压缩名**。它们已经在正确的文件里（`reconstructed/src/...`），只差名字和说明。本轮把它们变成可读的。

## 你的范围

`analysis/segments/naming-round2.json` 是一个数组，第 N 项（N = 你的组号）给出：
- `dirs`：你负责的目录；
- `items`：待命名声明 `{id, name, file, line, bytes}`。`file` / `line` 是该声明在 `reconstructed/` 中的位置（出处行 `//@` 的下一行），`id` 是声明 id（`chunk-xxx.js#压缩名`），`name` 是当前（压缩）名。

## 做法

1. **先按文件读**：打开 `reconstructed/<file>`，文件头有模块说明，周围声明大多已有名字，结合上下文判断。需要看调用方用 `node tools/q.mjs callers <id>`。
2. **优先顺序**：字节数大的、被其他模块导入的（文件末尾 `export {…}` 里的）、被多处调用的先命名。
3. **顶层名**：写进 `naming/semantic-r<N>.jsonl`，键为该绑定声明标识符在 `original/<chunk>` 中的偏移 `@N`。偏移的取法：`node tools/q.mjs bindings <id>` 会列出该声明内全部绑定及其键（顶层绑定是 `top/...` 那一行）。批量处理时可直接用 `tools/rename/lib/rename.mjs` 的 `bindingsOf(file, source)`（参考 `tools/q.mjs` 里 `printBindings` 的写法）。
4. **重要函数的参数与关键局部变量**（≥500 字节的函数）：同一文件，同样用 `bindings` 给出的 `@偏移` 键。
5. **说明**：≥300 字节或被导出的声明，在 `naming/docs-r<N>.jsonl` 写 1–4 行中文说明（格式 `{"id": "...", "doc": "..."}`）。
6. 命名规则同 `docs/process/domain-guide.md`（风格、置信度 0.6–0.95、不要用保留字和全局名、门面原名优先不要覆盖）。React Compiler 产物 `_temp` 回调可以按用途命名（如 `renderOptionRow`、`handleKeyDown`）。

## 交付物（N 为组号）

- `naming/semantic-r<N>.jsonl`、`naming/docs-r<N>.jsonl`
- `docs/process/naming-r<N>.md`：命名了多少（顶层/参数/局部）、说明多少、还剩哪些没命名及原因、发现的问题（例如放错文件的声明：`声明 id → 应归路径，证据`）。
- `docs/WORKLOG.md` 末尾追加一行。

## 规则

- 只写上述文件和 `artifacts/tmp/r<N>/`；不改 tools/、analysis/、naming/ 下其他文件、reconstructed/；不 git commit；不派生子代理；不要运行 `tools/pipeline.sh`。
- 完成前用改名引擎试跑校验（参考 `naming/README.md`：对你涉及的 chunk 调 `renameModule`，确认 0 拒绝；冲突会自动加后缀，可接受）。
- 以覆盖率为先：先把全部顶层声明命名，再补局部和说明。
