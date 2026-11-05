# 批次 ns318-1：名字形态裁决（18 条语句）

2.1.318 合并后 `analysis/name-shape/unadjudicated.jsonl` 里分到本批的 18 条语句。输入是 `artifacts/tmp/batches-r2/ns318-1/statements.jsonl`，逐条读 `original/<chunk>.js` 的语句及其配套函数，给一条裁决。

## 方法

照 `docs/process/shapefix.md`：形态对不上就去看绑定在函数体里的实际用法（`.has` / `includes` / `test` / `replace` / `Math.min` / `slice`），按用法判，不按相邻名字猜。

## 结论

- 误报 14 条，改名 4 条，错位重排 0 条。
- 改名 4 个绑定（4 条语句各 1 个，其余兄弟绑定名称正确，不是整组错位）：

| 语句 | 原判标记 | 裁决 |
|---|---|---|
| `chunk-5xgkngpb.js@1241724` | RM_TARGET_RE | RM_TARGET_RE→RM_COMMAND_NAMES（`new Set([...])` + `hHo.has(s[0])`，是命令名集合） |
| `chunk-7jxyna5q.js@528083` | REPEATABLE_READ_COMMANDS | REPEATABLE_READ_COMMANDS→MAX_TRACKED_ENTRIES（`500`，`while(z.size>XL)z.delete(…)` 是两张表的条目上限） |
| `chunk-d57g06xv.js@1063` | FULLWIDTH_MAP | FULLWIDTH_MAP→FULLWIDTH_MAP_PAIRS（`[正则,替换串]` 数组 + `reduce`，不是 Map） |
| `chunk-s4p9jscb.js@900` | MAX_DISPLAY_NAME | MAX_DISPLAY_NAME→MAX_DISPLAY_NAME_CHARS（`128`，`Z(f(e),d)` 截字符） |

## 误报的几类

- 名字带 `_CHARS` 而初值是字符码 `Set` 或字符类正则，用法都是 `.has` / `.test` / `replace`：`NAME_CHARS`、`SUBSTITUTION_NAME_CHARS`、`OPERATOR_CHARS`、`DOLLAR_SPECIAL_CHARS`、`TOKEN_BOUNDARY_CHARS`、`WHITESPACE_CHARS`、`SHELL_META_CHARS`、`NON_WORD_CHARS`、`UNDISPLAYABLE_CHARS`（后两个是正则，同 shapefix 里 `UNSAFE_LOG_CHARS`、`MARKDOWN_BREAK_CHARS` 判误报的口径一致）。
- 名字说的是“变量名/事件名/标记名”而值是那个名字的字符串：`CCR_SHR_IDLE_RELEASE_DEFAULT_MINUTES`（环境变量名）、`TENGU_TOOLS_USED_HEADER_SIZE`（遥测事件名）、`NOT_SENT_FOR_SIZE`（标签标记串）、`AGENT_DISABLED_ENV`（环境变量名集合）。
- 名字本身是长度上限或语义上限、值确实是数字：`REPORT_LOCK_KEY`（pg 咨询锁编号）、`WORK_COST_PER_DIR`（每目录 work 开销）、`MAX_TASK_DESCRIPTION` / `MAX_TASK_LABEL`（`ct(text, 40)` 截长度）。
- 名称容器/结构正确：`isOnHolder`（`{isOn:void 0}` 持有回调）、`weakSet`（`new WeakSet`）。

## 拿不准

- `REPORT_LOCK_KEY`：留着 `_KEY` 但值是数字。判误报，理由是 pg 咨询锁编号就是一把锁的 key；若 lead 口径要求 `_KEY` 必须绑字符串，可改为 `REPORT_LOCK_ID`。
- `REPEATABLE_READ_COMMANDS`：改名成 `MAX_TRACKED_ENTRIES` 用了“entries”，也可以叫 `MAX_METER_ENTRIES`（类内 `#e`、`#t`）。取了更中性的写法。

## 校验

```
node --max-old-space-size=3000 tools/naming/annotate.mjs check naming/semantic-ns318-1.jsonl
4 lines, 4 chunks, 0 problems, 0 suffixed by conflicts
```

`verdicts.jsonl` 18 行，`file`/`stmt` 与 `statements.jsonl` 按序一一对应。
