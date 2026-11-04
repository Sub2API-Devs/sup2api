# 名字与初值形态不符（shapefix）逐条裁决

`analysis/name-shape/statements.jsonl` 共 269 条被 `tools/verify/name-shape.mjs` 标记的多声明 `var` 语句（332 个被标记的绑定）。本轮逐条判断每条语句属于 **误报 / 错位重排 / 改名**，修正写进 `naming/semantic-zzz-shapefix.jsonl`，说明写进 `naming/docs-zzz-shapefix.jsonl`。

## 判断方法

- 先读语句里每个绑定的 `init` 与 `kind`：`MAX_*_BYTES = 262144` 与名字相符，`MAX_*_BYTES = "一段图标说明"` 说明整组名字错了一格。
- 形态对不上时到 `original/<chunk>.js` 里看这个绑定在函数体里的实际用法（`test`/`replace`/`Math.min`/模板串），按用法命名，而不是按相邻名字推断。
- 名字与初值都自洽但名字与用法不符的（例如 `getOsRelease` 绑的是按 host 缓存的客户端槽），照样按用法改名。
- 同一 `var` 语句里前几个名字整体往后错一格时记为 **错位重排**，逐个给出「原名 → 新名」；只有个别名字不对、其余成立时记为 **改名**。
- 名字本身就是正确的描述（`MAX_*_TEXT` 绑数字但语义确实是文本长度上限、`_CHARS` 绑字符类正则、`weakSet` 绑 `new WeakSet()`、`NEGLIGIBLE_COST = 1e-9` 等）一律记为误报，不写修正。

## 结论

- **误报 164** 条、**改名 81** 条、**错位重排 24** 条（共 269 条语句）。
- 实际改动 111 条语句里的 **244 个绑定**：其中 142 个正是被标记的绑定，另 102 个是同一语句里未被标记、跟着整体错位的兄弟绑定。
- 被标记的 332 个绑定里，142 个改了名；其余绑定判定名字正确（这些绑定集中在 164 条误报语句里）。
- 有 6 条语句标在“误报”上，但同语句里另有兄弟绑定被改（15、44、53、100、169、194：标记的那个名字本身对，但同一 `var` 里另有名字与初值错位），因此“改动绑定数”大于“被标记且改动数”。
- 修正表 naming/semantic-zzz-shapefix.jsonl 共 245 行；说明表 naming/docs-zzz-shapefix.jsonl 共 41 行。

### 几类典型的误报（占 164 条里的大多数）

- 名字带 `_CHARS` / `_BYTES` / `_COUNT` 但值确实是字符串 / Set / 正则 / 数字：`TAG_BOUNDARY_CHARS`（`new Set`）、`RESOLVING_SPINNER_CHARS`（旋转提示帧字符串）、`ALLOWED_CONTROL_CHARS`（`new Set`）、`DOCKER_DANGEROUS_SHORT_FLAG_CHARS`（`new Set`）。
- 名字带 `_MS` / `_SECONDS` / `_THRESHOLD` 但值故意是设置键名：`TENGU_*` 系列特性开关串、`silent_turn_reminder_seconds`、`keepalive_tolerance_seconds`、`x-ccr-sse-*` 请求头名。
- `MAX_*_TEXT` / `MAX_*_MESSAGE` 绑数字：值是文本字段的长度上限（`MAX_LABEL_TEXT = 120`、`MAX_SERVER_MESSAGE = 160`、`MAX_VALIDATION_TEXT = 1e5` 等）。
- `*_SCHEMA` 绑字符串：值是 schema 的名字（`SCHEMA = "schema"`）、zod 的 `.describe` 文案或常量表；本组里除 schema 相关重排外均未误判。
- `doc-number` 规则：说明里写的是 `1e-9`、`0700`、`2^31-1`、`8 天` 之类的写法，脚本按十进制数字比对，全部是误报（26 处）。

## 按来源的错误率

“错误”指该来源产出的、被标记且复核后确实要改名（或属于错位重排）的绑定；语句级按“这条语句里只要有任一名来自该表且整条语句被判定为非误报”计，因此一条语句涉及多个来源时会在每张表里各记一次（语句数合计 272 > 269）。

| 来源 | 绑定数 | 错误 | 错误率 | 语句数 | 语句有错 | 语句错误率 |
|---|---|---|---|---|---|---|
| semantic-s8.jsonl | 62 | 48 | 77.4% | 37 | 29 | 78.4% |
| (auto) | 31 | 1 | 3.2% | 28 | 1 | 3.6% |
| semantic-s3.jsonl | 28 | 9 | 32.1% | 24 | 5 | 20.8% |
| semantic-s7.jsonl | 18 | 5 | 27.8% | 14 | 4 | 28.6% |
| semantic-s5.jsonl | 18 | 4 | 22.2% | 18 | 4 | 22.2% |
| semantic-s6.jsonl | 18 | 8 | 44.4% | 11 | 6 | 54.5% |
| semantic-s2.jsonl | 16 | 9 | 56.3% | 13 | 7 | 53.8% |
| (reference) | 14 | 13 | 92.9% | 14 | 12 | 85.7% |
| semantic-s4.jsonl | 12 | 4 | 33.3% | 12 | 4 | 33.3% |
| semantic-permissions.jsonl | 12 | 3 | 25.0% | 11 | 2 | 18.2% |
| semantic-s1.jsonl | 9 | 0 | 0.0% | 9 | 0 | 0.0% |
| semantic-r6.jsonl | 8 | 1 | 12.5% | 5 | 1 | 20.0% |
| semantic-p6.jsonl | 7 | 4 | 57.1% | 7 | 4 | 57.1% |
| semantic-ink.jsonl | 7 | 6 | 85.7% | 3 | 2 | 66.7% |
| semantic-p3.jsonl | 6 | 5 | 83.3% | 6 | 5 | 83.3% |
| semantic-r1.jsonl | 6 | 2 | 33.3% | 4 | 1 | 25.0% |
| semantic-tools.jsonl | 6 | 1 | 16.7% | 5 | 1 | 20.0% |
| semantic-agents.jsonl | 5 | 0 | 0.0% | 4 | 0 | 0.0% |
| semantic-r0.jsonl | 5 | 0 | 0.0% | 5 | 0 | 0.0% |
| semantic-r7.jsonl | 5 | 2 | 40.0% | 5 | 2 | 40.0% |
| semantic-p7.jsonl | 5 | 5 | 100.0% | 5 | 5 | 100.0% |
| semantic-extensions.jsonl | 4 | 1 | 25.0% | 4 | 1 | 25.0% |
| semantic-r3.jsonl | 4 | 0 | 0.0% | 4 | 0 | 0.0% |
| semantic-p4.jsonl | 3 | 2 | 66.7% | 3 | 2 | 66.7% |
| semantic-prest.jsonl | 3 | 3 | 100.0% | 3 | 3 | 100.0% |
| semantic-query.jsonl | 3 | 0 | 0.0% | 3 | 0 | 0.0% |
| semantic-p0.jsonl | 3 | 0 | 0.0% | 3 | 0 | 0.0% |
| semantic-p5.jsonl | 3 | 2 | 66.7% | 3 | 2 | 66.7% |
| semantic-r2.jsonl | 3 | 2 | 66.7% | 2 | 1 | 50.0% |
| semantic-s0.jsonl | 2 | 0 | 0.0% | 1 | 0 | 0.0% |
| semantic-r8.jsonl | 2 | 0 | 0.0% | 2 | 0 | 0.0% |
| semantic-bootstrap.jsonl | 1 | 1 | 100.0% | 1 | 1 | 100.0% |
| semantic-s9.jsonl | 1 | 0 | 0.0% | 1 | 0 | 0.0% |
| semantic-state.jsonl | 1 | 0 | 0.0% | 1 | 0 | 0.0% |
| semantic-commands.jsonl | 1 | 1 | 100.0% | 1 | 1 | 100.0% |
| **合计** | **332** | **142** | **42.8%** | **272** | **106** | **39.0%** |

要点：错误率最高的是 `(reference)`（旧版 2.1.88 对照名，92.9%，基本是“名字与新版语义不符”）和 `semantic-s8`（77.4%，大常量组整体错位）；`(auto)` 规则兜底只有 3.2%，`semantic-s1` / `semantic-r0` / `semantic-agents` / `semantic-r3` 等 0%。

## 逐条裁决

| # | 语句 | 被标记的绑定 | 裁决（针对被标记的绑定） | 依据 |
|---|---|---|---|---|
| 1 | `chunk-06y4szbn.js@6203` | TAG_BOUNDARY_CHARS | 误报 | TAG_BOUNDARY_CHARS（初值 new Set([" ","\t",` `,"\f","…） 与名字相符 |
| 2 | `chunk-06y4szbn.js@6991` | DATA_ID_PATTERN | 改名 | DATA_ID_PATTERN→DATA_ID_LENGTH |
| 3 | `chunk-06y4szbn.js@27675` | RATE_LIMIT_TEXT | 改名 | RATE_LIMIT_TEXT→RATE_LIMIT_MIN_WAIT_SECONDS |
| 4 | `chunk-0ba63vr9.js@511` | FOTW_CAMPAIGN_SCHEMA | 改名 | FOTW_CAMPAIGN_SCHEMA→FOTW_EXPERIMENT_FLAG |
| 5 | `chunk-0sfjpx19.js@76273` | OLD_VERSION_THRESHOLD NEW_VERSION_THRESHOLD | 误报 | OLD_VERSION_THRESHOLD（初值 "2.1.285"…），NEW_VERSION_THRESHOLD（初值 "2.1.300"…） 与名字相符 |
| 6 | `chunk-0sfjpx19.js@124668` | NEGLIGIBLE_COST | 误报 | NEGLIGIBLE_COST（初值 0.000000001…） 与名字相符 |
| 7 | `chunk-0wdgqhcf.js@13399` | HANDLERS_SCHEMA | 改名 | HANDLERS_SCHEMA→handlersSchemas |
| 8 | `chunk-0zqb2m0b.js@14859` | CONTESTED_ME_KEY | 误报 | CONTESTED_ME_KEY（初值 Symbol("contested-me-key")…） 与名字相符 |
| 9 | `chunk-16jhn3ak.js@441` | isMcpServerFromProjectOrLocalSettings | 改名 | isMcpServerFromProjectOrLocalSettings→MCP_SETTINGS_SCOPE_KINDS |
| 10 | `chunk-18hwfzwa.js@149387` | MIN_STARTUPS_TO_PROMPT MIN_DENIALS_TO_PROMPT | 误报 | MIN_STARTUPS_TO_PROMPT（初值 5…），MIN_DENIALS_TO_PROMPT（初值 5…） 与名字相符 |
| 11 | `chunk-18hwfzwa.js@155528` | EFFORT_NUDGE_COPY_SCHEMA | 改名 | EFFORT_NUDGE_COPY_SCHEMA→MAX_NUDGE_BODY_CHARS |
| 12 | `chunk-18hwfzwa.js@521534` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 13 | `chunk-18hwfzwa.js@679076` | ALLOWED_CONTROL_CHARS | 误报 | ALLOWED_CONTROL_CHARS（初值 new Set([` `,"\r","\t"])…） 与名字相符 |
| 14 | `chunk-18hwfzwa.js@778316` | MAX_EFFORT | 改名 | MAX_EFFORT→MAX_EFFORT_NOTICE_KEY |
| 15 | `chunk-18hwfzwa.js@1034794` | TENGU_LONG_CONTEXT_SURVEY_THRESHOLD | 误报 | TENGU_LONG_CONTEXT_SURVEY_THRESHOLD（初值 "tengu_long_context_survey_t…） 与名字相符 |
| 16 | `chunk-18hwfzwa.js@1206341` | RESOLVING_SPINNER_CHARS | 误报 | RESOLVING_SPINNER_CHARS（初值 "\u280B\u2819\u2839\u2838\u2…） 与名字相符 |
| 17 | `chunk-1k64h7rw.js@226` | CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE | 误报 | CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE（初值 "CLAUDE_CODE_RELAUNCH_TERMIN…） 与名字相符 |
| 18 | `chunk-1wpnxx5r.js@5737` | CCR_MEMORY_MCP_PATH | 误报 | CCR_MEMORY_MCP_PATH（初值 /^\/v2\/ccr-sessions\/[A-Za-…） 与名字相符 |
| 19 | `chunk-1wpnxx5r.js@10695` | CCR_SESSION_MCP_PATH CODE_SESSION_MCP_PATH | 误报 | CCR_SESSION_MCP_PATH（初值 /^\/v2\/ccr-sessions\/([A-Za…），CODE_SESSION_MCP_PATH（初值 /^\/v1\/code\/sessions\/([A-…） 与名字相符 |
| 20 | `chunk-29pqxdaf.js@6351` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 21 | `chunk-2a8yx6fc.js@50332` | MAX_SCAN_FILE_SIZE | 误报 | MAX_SCAN_FILE_SIZE（初值 "4M"…） 与名字相符 |
| 22 | `chunk-2rkp9ne9.js@15002` | UNICODE_SPACE_CHARS | 误报 | UNICODE_SPACE_CHARS（初值 "\t\v\f \x85\xA0\u1680\u2000…） 与名字相符 |
| 23 | `chunk-38axkkfw.js@4923` | REDIRECT_OPERATOR_TOKENS | 误报 | REDIRECT_OPERATOR_TOKENS（初值 new Set(["<",">",">>","<<","…） 与名字相符 |
| 24 | `chunk-3g8vhh6f.js@809` | isTeamSubscriber_2 | 改名 | isTeamSubscriber_2→TEAM_MEMORY_SCOPE |
| 25 | `chunk-3mec1atf.js@23768` | SPINNER_MAX_TEXT | 误报 | SPINNER_MAX_TEXT（初值 12…） 与名字相符 |
| 26 | `chunk-3s7ydtfd.js@9694` | MIN_ABS_NUMBER | 误报 | MIN_ABS_NUMBER（初值 0.000000000000000000000001…） 与名字相符 |
| 27 | `chunk-3s7ydtfd.js@9797` | MS_PER_NANOSECOND | 误报 | MS_PER_NANOSECOND（初值 0.000001…） 与名字相符 |
| 28 | `chunk-3s7ydtfd.js@9889` | SI_MICRO | 误报 | SI_MICRO（初值 0.000001…） 与名字相符 |
| 29 | `chunk-3s7ydtfd.js@9905` | SI_MILLI | 误报 | SI_MILLI（初值 0.001…） 与名字相符 |
| 30 | `chunk-3s7ydtfd.js@9918` | SI_NANO | 误报 | SI_NANO（初值 0.000000001…） 与名字相符 |
| 31 | `chunk-3s7ydtfd.js@41464` | MAX_LABEL_TEXT | 误报 | MAX_LABEL_TEXT（初值 120…） 与名字相符 |
| 32 | `chunk-3s7ydtfd.js@51396` | NEGLIGIBLE | 误报 | NEGLIGIBLE（初值 0.000000001…） 与名字相符 |
| 33 | `chunk-3s7ydtfd.js@51549` | SI_MICRO_ALT | 误报 | SI_MICRO_ALT（初值 0.000001…） 与名字相符 |
| 34 | `chunk-3s7ydtfd.js@51565` | SI_MILLI_ALT | 误报 | SI_MILLI_ALT（初值 0.001…） 与名字相符 |
| 35 | `chunk-3s7ydtfd.js@51588` | SI_NANO_ALT | 误报 | SI_NANO_ALT（初值 0.000000001…） 与名字相符 |
| 36 | `chunk-3s7ydtfd.js@54656` | NEGLIGIBLE_VALUE | 误报 | NEGLIGIBLE_VALUE（初值 0.000000001…） 与名字相符 |
| 37 | `chunk-3s7ydtfd.js@63137` | SEP_WIDTH | 改名 | SEP_WIDTH→SEP |
| 38 | `chunk-3y22eg7d.js@1385` | MAX_CONTINUATIONS_PER_HUMAN_PROMPT | 误报 | MAX_CONTINUATIONS_PER_HUMAN_PROMPT（初值 3…） 与名字相符 |
| 39 | `chunk-3zy56vtn.js@8660` | MAX_REFUSALS_PER_ENV | 误报 | MAX_REFUSALS_PER_ENV（初值 3…） 与名字相符 |
| 40 | `chunk-4121qate.js@155028` | MAX_SHM_NAME | 改名 | MAX_SHM_NAME→MAX_RGBA_DIMENSION |
| 41 | `chunk-4121qate.js@270439` | STAMP_SLOT_COUNT | 误报 | STAMP_SLOT_COUNT（初值 9…） 与名字相符 |
| 42 | `chunk-4121qate.js@274600` | isPersistableScope | 改名 | isPersistableScope→FLAG_SCOPE |
| 43 | `chunk-4m46mxx9.js@6572` | getStorageDir | 改名 | getStorageDir→MOD_FOLDER |
| 44 | `chunk-4nwcj4sh.js@558` | REGEX_META_CHARS | 误报 | REGEX_META_CHARS（初值 "^$\\.*+?()[]{}\|"…） 与名字相符 |
| 45 | `chunk-55ht3bcx.js@1912` | POLICY_STAMP_SCHEMA | 改名 | POLICY_STAMP_SCHEMA→MAX_HIPAA_STAMP_IDS |
| 46 | `chunk-5aas12zq.js@1524` | MIN_README_WORDS PLUGIN_NAME_SPACE_MESSAGE ICON_INVALID_MESSAGE MAX_SCREENSHOT_COUNT MAX_LINK_CHECK_COUNT MAX_ISSUE_ROWS MACOS_METADATA_DIR LISTING_WHITESPACE_CHARS | 错位重排 | MIN_README_WORDS→ICON_INVALID_MESSAGE，PLUGIN_NAME_SPACE_MESSAGE→MAX_README_BYTES，ICON_INVALID_MESSAGE→MAX_ICON_BYTES，MAX_SCREENSHOT_COUNT→SYSTEM_FILE_NAMES，MAX_LINK_CHECK_COUNT→MACOSX_METADATA_DIR，MAX_ISSUE_ROWS→SYSTEM_FILES_FOUND_NOTE，MACOS_METADATA_DIR→MAX_SCAN_DEPTH |
| 47 | `chunk-5aas12zq.js@25298` | README_LINE_BREAK_CHARS | 误报 | README_LINE_BREAK_CHARS（初值 `) \f\r`…） 与名字相符 |
| 48 | `chunk-5nte8cwj.js@640` | MIN_DESKTOP_VERSION | 误报 | MIN_DESKTOP_VERSION（初值 "1.1.9669"…） 与名字相符 |
| 49 | `chunk-63f0f3kd.js@8644` | GREP_BUNDLED_FLAG_CHARS | 改名 | GREP_BUNDLED_FLAG_CHARS→GREP_BUNDLED_FLAG_RE |
| 50 | `chunk-63f0f3kd.js@103128` | SUBSHELL_MARKER_CHARS | 误报 | SUBSHELL_MARKER_CHARS（初值 "$`{,}\\" 是可跨过的字符集）与名字相符；原判「改名」复核为误报，修正表里留同名条目（等价于明确保持） |
| 51 | `chunk-6j594vm1.js@18451` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 52 | `chunk-6qssfmzs.js@9545` | nonRebindableKeySet | 误报 | nonRebindableKeySet（初值 null…） 与名字相符 |
| 53 | `chunk-6vnxsn99.js@31896` | MODE_FILE | 误报 | MODE_FILE（初值 33188…） 与名字相符 |
| 54 | `chunk-6zvphrsz.js@2054` | INSTALL_LOCK_KEY | 改名 | INSTALL_LOCK_KEY→FAILED_VERSION_EXIT_CODE |
| 55 | `chunk-70qr4vka.js@863` | MAX_TIP_LABEL_CHARS INVISIBLE_CHARS_REGEX TIP_MAX_NOTE_CHARS | 错位重排 | MAX_TIP_LABEL_CHARS→TIP_ID_RE，INVISIBLE_CHARS_REGEX→RETRYABLE_ERRNOS，TIP_MAX_NOTE_CHARS→NOTE_INVISIBLE_CHARS_RE |
| 56 | `chunk-71rdrfpa.js@1758` | externalEventWakeSchema | 改名 | externalEventWakeSchema→SAFE_WAKE_FIELD_RE |
| 57 | `chunk-75swpmx0.js@191` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 58 | `chunk-7kpfrhzn.js@4586` | MAX_IMAGE_PIXELS | 误报 | MAX_IMAGE_PIXELS（初值 40000000…） 与名字相符 |
| 59 | `chunk-82kqcve8.js@75272` | TAG_ATTR_CHARS | 误报 | TAG_ATTR_CHARS（初值 "[^>]{0,1024}"…） 与名字相符 |
| 60 | `chunk-82kqcve8.js@82465` | YAML_SPECIAL_CHARS | 改名 | YAML_SPECIAL_CHARS→YAML_SPECIAL_CHARS_RE |
| 61 | `chunk-82kqcve8.js@178775` | MAX_PLAN_WATCHES_PER_SLUG | 误报 | MAX_PLAN_WATCHES_PER_SLUG（初值 8…） 与名字相符 |
| 62 | `chunk-82kqcve8.js@189579` | PLANS_DIRECTORY_PER_HOST | 误报 | PLANS_DIRECTORY_PER_HOST（初值 new W(()=>new oc)…） 与名字相符 |
| 63 | `chunk-82kqcve8.js@208696` | DOCKER_DANGEROUS_SHORT_FLAG_CHARS | 误报 | DOCKER_DANGEROUS_SHORT_FLAG_CHARS（初值 new Set(far.filter((e)=>e.le…） 与名字相符 |
| 64 | `chunk-82kqcve8.js@222545` | PERMISSION_UPDATE_DESTINATION_SET | 误报 | PERMISSION_UPDATE_DESTINATION_SET（初值 {userSettings:!0,projectSett…） 与名字相符 |
| 65 | `chunk-85kmkm1x.js@23893` | RECORDABLE_NAME_RE | 改名 | RECORDABLE_NAME_RE→RESERVED_MARKETPLACE_NAMES |
| 66 | `chunk-85kmkm1x.js@45366` | MCP_URL_TEMPLATE_RE | 改名 | MCP_URL_TEMPLATE_RE→MAX_URL_LENGTH |
| 67 | `chunk-8fqgaf3a.js@1287` | IS_META_MESSAGE | 误报 | IS_META_MESSAGE（初值 !0…） 与名字相符 |
| 68 | `chunk-8wvtd8sr.js@184530` | PAGE_PROBE_MAX_VALUE_CHARS | 改名 | PAGE_PROBE_MAX_VALUE_CHARS→PAGE_PROBE_ERROR_FRAME_LEFT |
| 69 | `chunk-8wvtd8sr.js@311311` | ACTION_HANDLER_BY_NAME | 误报 | ACTION_HANDLER_BY_NAME（初值 new Map(Cb.flatMap((e)=>e.ac…） 与名字相符 |
| 70 | `chunk-8wvtd8sr.js@311503` | RESULT_RENDERER_BY_KEY | 误报 | RESULT_RENDERER_BY_KEY（初值 new Map(vd.map(([e,n])=>[e,n…） 与名字相符 |
| 71 | `chunk-8wvtd8sr.js@362488` | CONTENT_TYPES_BY_EXT | 误报 | CONTENT_TYPES_BY_EXT（初值 new Map([[".html","text/html…） 与名字相符 |
| 72 | `chunk-99h01h55.js@1886` | MAX_SANITIZED_TEXT ELLIPSIS_CHARS | 误报 | MAX_SANITIZED_TEXT（初值 128…），ELLIPSIS_CHARS（初值 "\u2026\u22EF\uFE19"…） 与名字相符 |
| 73 | `chunk-9cjx5pnm.js@6070` | DIR_MODE | 误报 | DIR_MODE（初值 448…） 与名字相符 |
| 74 | `chunk-9cjx5pnm.js@6081` | FILE_MODE | 误报 | FILE_MODE（初值 384…） 与名字相符 |
| 75 | `chunk-9fcadreh.js@227` | MAX_CHANGE_REASONS_SHOWN | 改名 | MAX_CHANGE_REASONS_SHOWN→MAX_REASONS_SHOWN_TEXT |
| 76 | `chunk-9qwbw2qr.js@9509` | PLUGIN_DIRECTORY_BINDINGS_FILE | 错位重排 | PLUGIN_DIRECTORY_BINDINGS_FILE→PLUGIN_DIRECTORY_BINDINGS_VERSION |
| 77 | `chunk-9qwbw2qr.js@9885` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 78 | `chunk-9rmf152v.js@366` | SPINNER_FLAG_PRIORITY | 误报 | SPINNER_FLAG_PRIORITY（初值 -100…） 与名字相符 |
| 79 | `chunk-9tgt55am.js@31729` | MAX_ANCHOR_TEXT MAX_ANCHORS_PER_FILE | 误报 | MAX_ANCHOR_TEXT（初值 160…），MAX_ANCHORS_PER_FILE（初值 64…） 与名字相符 |
| 80 | `chunk-9tgt55am.js@157310` | QUOTE_CHARS | 误报 | QUOTE_CHARS（初值 '"\u201C\u201D\u201E\u201F\u…） 与名字相符 |
| 81 | `chunk-a477qqne.js@4131` | MEMORY_STAMP_SCHEMA | 改名 | MEMORY_STAMP_SCHEMA→MAX_PROMOTED_ENTRIES |
| 82 | `chunk-a477qqne.js@16887` | LocalDirMemoryStore | 改名 | LocalDirMemoryStore→MEMORY_KEY_PREFIX |
| 83 | `chunk-ae5g0zb5.js@55035` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 84 | `chunk-ae5g0zb5.js@113239` | runFolderMapSlot | 改名 | runFolderMapSlot→notedRunsByHost |
| 85 | `chunk-aepeg2w5.js@54193` | memoryListArgsSchema memorySearchArgsSchema memoryAppendArgsSchema | 错位重排 | memoryListArgsSchema→MAX_INSTRUCTION_CHARS，memorySearchArgsSchema→MAX_STR_REPLACE_INPUT_CHARS，memoryAppendArgsSchema→DEFAULT_STR_REPLACE_INPUT_CHARS |
| 86 | `chunk-aepeg2w5.js@64497` | BI_KEY_LENGTH | 改名 | BI_KEY_LENGTH→biKeyCache |
| 87 | `chunk-aepeg2w5.js@211452` | ETAG_RE MAX_ETAG_CHARS catalogRowSchema | 错位重排 | ETAG_RE→MAX_CATALOG_RESPONSE_BYTES，MAX_ETAG_CHARS→ETAG_PATTERN，catalogRowSchema→MAX_ETAG_CHARS |
| 88 | `chunk-aepeg2w5.js@211612` | parseCatalogRows | 错位重排 | parseCatalogRows→MAX_CATALOG_ROWS |
| 89 | `chunk-aepeg2w5.js@223217` | createCatalogLookupBucket | 改名 | createCatalogLookupBucket→MAX_LOOKUP_CACHE_MODELS |
| 90 | `chunk-aepeg2w5.js@239334` | MIN_INTERNAL_PREFIX | 改名 | MIN_INTERNAL_PREFIX→MIN_CIDR_PREFIX |
| 91 | `chunk-aepeg2w5.js@407872` | MODEL_NAME_ALLOWED_CHARS | 误报 | MODEL_NAME_ALLOWED_CHARS（初值 "A-Za-z0-9._:/@[\\]-"…） 与名字相符 |
| 92 | `chunk-aepeg2w5.js@465304` | MODELS_WITH_1M_DISPLAY_SUFFIX | 误报 | MODELS_WITH_1M_DISPLAY_SUFFIX（初值 new Set(["claude-opus-4-6","…） 与名字相符 |
| 93 | `chunk-aepeg2w5.js@598121` | ANTHROPIC_HEARTH_ROWS | 误报 | ANTHROPIC_HEARTH_ROWS（初值 "anthropic/hearth.rows"…） 与名字相符 |
| 94 | `chunk-aepeg2w5.js@630279` | getGrowthBookClient_2 | 改名 | getGrowthBookClient_2→DEFAULT_GROWTHBOOK_HOST |
| 95 | `chunk-aepeg2w5.js@753511` | getIsBubblewrapSandbox_2 | 改名 | getIsBubblewrapSandbox_2→bubblewrapSandboxPerHost |
| 96 | `chunk-ar2zwb92.js@1133` | DANGEROUS_SPELLING_CHARS DASH_LIKE_CHARS VARIATION_SELECTOR_CHARS | 改名 | VARIATION_SELECTOR_CHARS→VARIATION_SELECTOR_RE |
| 97 | `chunk-astf3mhy.js@14508` | MAX_FORWARDS_PER_PROMPT | 误报 | MAX_FORWARDS_PER_PROMPT（初值 1000…） 与名字相符 |
| 98 | `chunk-av47g0rj.js@1130` | EMPTY_PRINCIPAL_TOKENS | 改名 | EMPTY_PRINCIPAL_TOKENS→EMPTY_TOKEN_SET |
| 99 | `chunk-axmbhcjg.js@7915` | MAX_INCLUDE_DEPTH | 改名 | MAX_INCLUDE_DEPTH→INCLUDE_EXTERNAL |
| 100 | `chunk-b0a246e7.js@12350` | DEGRADED_ANCHOR_FILE | 误报 | DEGRADED_ANCHOR_FILE（初值 Symbol("degraded-wire-anchor…） 与名字相符 |
| 101 | `chunk-b29hdd5e.js@4482` | STORE_COPY_PER_HOST | 误报 | STORE_COPY_PER_HOST（初值 new W(()=>new E)…） 与名字相符 |
| 102 | `chunk-b91jfdd4.js@2557` | HANDSHAKE_TIMEOUT | 误报 | HANDSHAKE_TIMEOUT（初值 "handshake_timeout"…） 与名字相符 |
| 103 | `chunk-bc20zedk.js@30848` | KEY_NAME_MAP | 改名 | KEY_NAME_MAP→KEY_NAME_PAIRS |
| 104 | `chunk-bfnfj4kx.js@75173` | loadAgentsFromDirectory | 改名 | loadAgentsFromDirectory→AGENTS_DIR_NAME |
| 105 | `chunk-bg51yd13.js@26359` | TERMINAL_RESPONSE_CHARS | 误报 | TERMINAL_RESPONSE_CHARS（初值 new Set("ABCDEFGHJKLMPSTXZ@`…） 与名字相符 |
| 106 | `chunk-bhxaz9j0.js@9458` | SCHEMA | 误报 | SCHEMA（初值 "schema"…） 与名字相符 |
| 107 | `chunk-bss4k1z9.js@21577` | LEARN_LABEL | 误报 | LEARN_LABEL（初值 /^learn\s*:\s*/i…） 与名字相符 |
| 108 | `chunk-bss4k1z9.js@22044` | EXPLAIN_LABEL | 误报 | EXPLAIN_LABEL（初值 /^explain:\s*/i…） 与名字相符 |
| 109 | `chunk-bss4k1z9.js@22784` | TAG_LABEL | 误报 | TAG_LABEL（初值 new RegExp(String.raw`^[\s>*…） 与名字相符 |
| 110 | `chunk-bss4k1z9.js@36317` | FIRST_EXPLANATION_LENGTH | 改名 | FIRST_EXPLANATION_LENGTH→FIRST_EXPLANATION_GUIDE |
| 111 | `chunk-bwyr6h72.js@1088` | gcpAdcFileSchema | 改名 | gcpAdcFileSchema→MAX_AWS_PROFILES |
| 112 | `chunk-c6bzd0wx.js@1022` | STATUS_DOT_CHARS | 改名 | STATUS_DOT_CHARS→STATUS_DOT_RE |
| 113 | `chunk-cgr0tezp.js@929` | MAX_SHORT_TEXT | 误报 | MAX_SHORT_TEXT（初值 1024…） 与名字相符 |
| 114 | `chunk-cgr0tezp.js@7254` | ZWJ_VS_KEEP_CHARS | 误报 | ZWJ_VS_KEEP_CHARS（初值 "\\u200D\\uFE0E\\uFE0F"…） 与名字相符 |
| 115 | `chunk-cgr0tezp.js@7977` | RGI_EMOJI_RE | 误报 | RGI_EMOJI_RE（初值 null…） 与名字相符 |
| 116 | `chunk-cgr0tezp.js@12108` | MARKDOWN_BREAK_CHARS | 改名 | MARKDOWN_BREAK_CHARS→MARKDOWN_BREAK_RE |
| 117 | `chunk-cgr0tezp.js@45871` | URL_TERMINATORS_RE MAX_URL_SCAN_LENGTH | 错位重排 | URL_TERMINATORS_RE→LINE_SPAN_COST，MAX_URL_SCAN_LENGTH→URL_SCAN_STOP_RE |
| 118 | `chunk-cgr0tezp.js@51715` | UNQUOTED_TOKEN_CHARS LINE_BREAK_CHARS SIMPLE_VALUE_CHARS KEY_TAIL_CHARS | 误报 | UNQUOTED_TOKEN_CHARS（初值 "[^\\s\\u0085,;&}\\])]+"…），LINE_BREAK_CHARS（初值 "\\n\\r\\x0b\\x0c\\u0085\\u2…），SIMPLE_VALUE_CHARS（初值 `[^\\s\\u0085,;&})"'\\\\]+`…），KEY_TAIL_CHARS（初值 "[\\w.-]{0,256}(?![\\w.-])"…） 与名字相符 |
| 119 | `chunk-cgr0tezp.js@66791` | SHELL_META_CHARS | 改名 | SHELL_META_CHARS→SHELL_PUNCT_RE |
| 120 | `chunk-cgr0tezp.js@75902` | URL_BREAK_CHARS | 改名 | URL_BREAK_CHARS→URL_BREAK_RE |
| 121 | `chunk-cgr0tezp.js@77194` | UNSAFE_LOG_CHARS | 误报 | UNSAFE_LOG_CHARS（初值 new RegExp(`(?!\\t)[${RS}]`,…） 与名字相符 |
| 122 | `chunk-ch0vxh4c.js@544` | PROCESS_WRAPPER_ENV | 改名 | PROCESS_WRAPPER_ENV→PROCESS_WRAPPER_TIMEOUT_MS |
| 123 | `chunk-cjydagjy.js@36916` | POLICY_HELPER_HOST | 改名 | POLICY_HELPER_HOST→POLICY_HELPER_SUBCOMMANDS |
| 124 | `chunk-cwwxybjc.js@8272` | CHANGE_THRESHOLD | 误报 | CHANGE_THRESHOLD（初值 0.4…） 与名字相符 |
| 125 | `chunk-czx62zen.js@11225` | SAFE_DISPLAY_NAME_RE | 改名 | SAFE_DISPLAY_NAME_RE→MAX_SAFE_DISPLAY_NAME_CHARS |
| 126 | `chunk-dcmhvw5a.js@20639` | PLUGIN_NAME_CHARS PATH_SAFE_CHARS USER_SEGMENT_CHARS HOST_SEGMENT_CHARS HOST_CHARS REPO_PATH_CHARS | 误报 | PLUGIN_NAME_CHARS（初值 "[A-Za-z0-9._-]+"…），PATH_SAFE_CHARS（初值 "[A-Za-z0-9._~-]"…），USER_SEGMENT_CHARS（初值 `${Zo}+(?::${Zo}*)?@`…），HOST_SEGMENT_CHARS（初值 ":[1-9][0-9]{0,4}"…），HOST_CHARS（初值 `(?:${Oh})?(${ma})(?:${Rh})?…），REPO_PATH_CHARS（初值 `ssh.${Ur}`…） 与名字相符 |
| 127 | `chunk-dcmhvw5a.js@153478` | credentialRuleExtractSchema credentialRuleOnNoMatchSchema credentialRuleDecodeSchema credentialRuleMaskClaimsSchema credentialRuleExtraSchema credentialRuleChildSchema | 错位重排 | credentialRuleExtractSchema→AWS_CREDENTIAL_ENV_NAMES，credentialRuleOnNoMatchSchema→SLOT_COLLISION_SENTINEL，credentialRuleDecodeSchema→INVALID_PAIR_SENTINEL，credentialRuleMaskClaimsSchema→PARENT_PAIR_SUPPRESSOR_SENTINEL，credentialRuleExtraSchema→MERGE_PAIR_SUPPRESSOR_SENTINEL，credentialRuleChildSchema→CREDENTIAL_CHILD_SENTINELS |
| 128 | `chunk-dcmhvw5a.js@189681` | MAX_EFFORT_DESCRIPTION | 误报 | MAX_EFFORT_DESCRIPTION（初值 "May use excessive tokens re…） 与名字相符 |
| 129 | `chunk-dcmhvw5a.js@225428` | permissionsSettingsSchema | 改名 | permissionsSettingsSchema→CONTROL_CHARS_RE |
| 130 | `chunk-dcmhvw5a.js@240672` | skillOverridesSchema | 改名 | skillOverridesSchema→SKILL_OVERRIDE_COMPONENTS |
| 131 | `chunk-dcmhvw5a.js@364020` | AWS_PROFILE_ENV | 误报 | AWS_PROFILE_ENV（初值 new Set(["AWS_PROFILE"])…） 与名字相符 |
| 132 | `chunk-dsy6gyxv.js@509` | XCODE_COMMAND_PREFIX IOS_BUILD_COMMAND_RE | 错位重排 | XCODE_COMMAND_PREFIX→XCODE_COMMAND_PREFIX_RE，IOS_BUILD_COMMAND_RE→IOS_BUILD_COMMAND_NAMES |
| 133 | `chunk-e1dn1jmn.js@191` | MAX_TIMER_DELAY_MS | 误报 | MAX_TIMER_DELAY_MS（初值 2147483647…） 与名字相符 |
| 134 | `chunk-e67761vs.js@14213` | MAX_INBOUND_TEXT | 误报 | MAX_INBOUND_TEXT（初值 60…） 与名字相符 |
| 135 | `chunk-e6aww6q8.js@66859` | NEWLINE_LIKE_CHARS | 误报 | NEWLINE_LIKE_CHARS（初值 "\r\v\f\x85\u2028\u2029"…） 与名字相符 |
| 136 | `chunk-e6aww6q8.js@133187` | SERVER_CLASSIFIER_DECISION_SCHEMA | 改名 | SERVER_CLASSIFIER_DECISION_SCHEMA→DEFAULT_MAX_SAVED_RULES |
| 137 | `chunk-e6aww6q8.js@215536` | MAX_METADATA_TEXT | 改名 | MAX_METADATA_TEXT→MAX_METADATA_CHARS |
| 138 | `chunk-e6aww6q8.js@304352` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 139 | `chunk-e6aww6q8.js@487075` | WHITESPACE_BYTES | 误报 | WHITESPACE_BYTES（初值 new Set([32,9,13])…） 与名字相符 |
| 140 | `chunk-e6aww6q8.js@589869` | MAX_DIAGNOSTICS_PER_FILE | 误报 | MAX_DIAGNOSTICS_PER_FILE（初值 10…） 与名字相符 |
| 141 | `chunk-e6aww6q8.js@767084` | MAX_SESSION_TEXT | 改名 | MAX_SESSION_TEXT→MAX_SESSION_TEXT_CHARS |
| 142 | `chunk-e6aww6q8.js@854273` | POWERSHELL_PARSER_PER_HOST | 改名 | POWERSHELL_PARSER_PER_HOST→powershellParserPerHost |
| 143 | `chunk-e6aww6q8.js@856917` | PS_TOKENIZER_DASH_CHARS | 误报 | PS_TOKENIZER_DASH_CHARS（初值 new Set(["-","\u2013","\u201…） 与名字相符 |
| 144 | `chunk-e6aww6q8.js@896517` | MIN_BWRAP_VERSION | 误报 | MIN_BWRAP_VERSION（初值 "0.10.0"…） 与名字相符 |
| 145 | `chunk-e6aww6q8.js@897131` | CLOSE_INHERITED_FDS_PREFIX | 改名 | CLOSE_INHERITED_FDS_PREFIX→MAX_INHERITED_FD |
| 146 | `chunk-e6aww6q8.js@990397` | ACTION_SUMMARY_SCHEMA | 改名 | ACTION_SUMMARY_SCHEMA→ACTION_SUMMARY_FIELD |
| 147 | `chunk-e6aww6q8.js@1028996` | dangerousToolUseUnsupportedSchema dangerousToolUseCombinedSchema | 错位重排 | dangerousToolUseUnsupportedSchema→DANGEROUS_TOOL_USE_UNSUPPORTED_REASONS，dangerousToolUseCombinedSchema→DANGEROUS_TOOL_USE_COMBINED_REASONS |
| 148 | `chunk-e6aww6q8.js@1327982` | MAX_SCANNED_ENTRIES | 误报 | MAX_SCANNED_ENTRIES（初值 1e4…） 与名字相符 |
| 149 | `chunk-e6aww6q8.js@2046524` | SEP_WIDTH | 改名 | SEP_WIDTH→SEP |
| 150 | `chunk-e6aww6q8.js@2158801` | describeUrlPermissionTimeout | 改名 | describeUrlPermissionTimeout→URL_PERMISSION_TIMEOUT_FLAG |
| 151 | `chunk-e6aww6q8.js@2231731` | TENGU_LAPIS_ANCHOR_THRESHOLD | 误报 | TENGU_LAPIS_ANCHOR_THRESHOLD（初值 "tengu_lapis_anchor_threshol…） 与名字相符 |
| 152 | `chunk-e6aww6q8.js@2406920` | POST_COMPACT_MAX_TOKENS_PER_FILE | 误报 | POST_COMPACT_MAX_TOKENS_PER_FILE（初值 5000…） 与名字相符 |
| 153 | `chunk-e6aww6q8.js@2516165` | TRAILING_WHITESPACE_CHARS | 误报 | TRAILING_WHITESPACE_CHARS（初值 new Set(` \v\f\r\x1C\x1D\x1E…） 与名字相符 |
| 154 | `chunk-e6aww6q8.js@2574793` | TAKES_REQUEST_BODY_BYTES | 误报 | TAKES_REQUEST_BODY_BYTES（初值 Symbol("takes a request body…） 与名字相符 |
| 155 | `chunk-e6aww6q8.js@2818162` | USER_TAG_UNSAFE_CHARS | 改名 | USER_TAG_UNSAFE_CHARS→USER_TAG_UNSAFE_RE |
| 156 | `chunk-e6aww6q8.js@3291976` | SILENT_TURN_REMINDER_SECONDS | 误报 | SILENT_TURN_REMINDER_SECONDS（初值 "silent_turn_reminder_second…） 与名字相符 |
| 157 | `chunk-e6aww6q8.js@3401980` | URL_PROTOCOLS_WITH_HOST | 误报 | URL_PROTOCOLS_WITH_HOST（初值 new Set(["http:","https:","w…） 与名字相符 |
| 158 | `chunk-e6aww6q8.js@3837046` | SIGNATURE_IGNORED_ENV | 误报 | SIGNATURE_IGNORED_ENV（初值 new Set(Rit)…） 与名字相符 |
| 159 | `chunk-e6aww6q8.js@3981064` | MAX_ERROR_TEXT | 误报 | MAX_ERROR_TEXT（初值 1024…） 与名字相符 |
| 160 | `chunk-e6aww6q8.js@4018401` | MAX_CATALOG_TEXT | 误报 | MAX_CATALOG_TEXT（初值 65536…） 与名字相符 |
| 161 | `chunk-e6aww6q8.js@4095166` | MAX_TAGS_PER_KEY | 误报 | MAX_TAGS_PER_KEY（初值 5…） 与名字相符 |
| 162 | `chunk-e6aww6q8.js@4220852` | readPluginCatalogCache | 改名 | readPluginCatalogCache→PLUGIN_CATALOG_CACHE_VERSION |
| 163 | `chunk-e6aww6q8.js@4387008` | parseNpmPackument UNSAFE_STORE_PREFIX NPM_PACKAGE_NAME_RE ARCHIVE_SUFFIX_RE | 错位重排 | parseNpmPackument→NPM_VIEW_TIMEOUT_MS，UNSAFE_STORE_PREFIX→NPM_PACK_TIMEOUT_MS，NPM_PACKAGE_NAME_RE→BINARY_BASE，ARCHIVE_SUFFIX_RE→OCTAL_RADIX |
| 164 | `chunk-e6aww6q8.js@4407739` | BINARY_LOCKFILE_UNSUPPORTED_TEXT | 错位重排 | BINARY_LOCKFILE_UNSUPPORTED_TEXT→BINARY_LOCKFILE_MESSAGES |
| 165 | `chunk-e6aww6q8.js@4648901` | MAX_EDITABLE_FILE_BYTES | 误报 | MAX_EDITABLE_FILE_BYTES（初值 1073741824…） 与名字相符 |
| 166 | `chunk-e7z1g8a9.js@3799` | PEER_KEY_TMP_FILE_RE PEER_TOKEN_LENGTH PEER_TOKEN_HEX_RE | 错位重排 | PEER_KEY_TMP_FILE_RE→PEER_TOKEN_BYTES，PEER_TOKEN_LENGTH→PEER_TOKEN_HEX_RE，PEER_TOKEN_HEX_RE→MAX_PEER_KEY_FILE_BYTES |
| 167 | `chunk-eavynfj6.js@20115` | ESCAPE_MAX_CHARS | 改名 | ESCAPE_MAX_CHARS→ESCAPE_TARGETS_RE |
| 168 | `chunk-f25sswmp.js@14106` | SHA256_DIGEST_SUFFIX | 改名 | SHA256_DIGEST_SUFFIX→SHA256_DIGEST_SUFFIX_RE |
| 169 | `chunk-f25sswmp.js@14476` | COST_THRESHOLD | 误报 | COST_THRESHOLD（初值 "cost_threshold"…） 与名字相符 |
| 170 | `chunk-f3qhjfah.js@1740` | pluginLinkSchema | 错位重排 | pluginLinkSchema→PLUGIN_LINK_HEADER |
| 171 | `chunk-f3qhjfah.js@38593` | pluginAttributionSchema | 改名 | pluginAttributionSchema→MAX_ATTRIBUTION_FILE_BYTES |
| 172 | `chunk-f640a6hn.js@251` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 173 | `chunk-f9asxqh1.js@1604` | MAX_SCOPE_RESPONSE_BYTES | 误报 | MAX_SCOPE_RESPONSE_BYTES（初值 1e6…） 与名字相符 |
| 174 | `chunk-fm6h4dv7.js@35979` | JUNIPER_TIDE_SCHEMA | 改名 | JUNIPER_TIDE_SCHEMA→JUNIPER_TIDE_PROGRAM |
| 175 | `chunk-fp6aqx1j.js@22463` | SYSTEM_FOREGROUND_SHELL_TASK_ROWS | 误报 | SYSTEM_FOREGROUND_SHELL_TASK_ROWS（初值 "system/foreground_shell_tas…） 与名字相符 |
| 176 | `chunk-fp6aqx1j.js@147368` | KEEPALIVE_TOLERANCE_SECONDS X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS LONG_POLL_TIMEOUT_SECONDS X_CCR_SSE_LONG_POLL_SECONDS | 误报 | KEEPALIVE_TOLERANCE_SECONDS（初值 "keepalive_tolerance_seconds…），X_CCR_SSE_KEEPALIVE_INTERVAL_SECONDS（初值 "x-ccr-sse-keepalive-interva…），LONG_POLL_TIMEOUT_SECONDS（初值 "long_poll_timeout_seconds"…），X_CCR_SSE_LONG_POLL_SECONDS（初值 "x-ccr-sse-long-poll-seconds…） 与名字相符 |
| 177 | `chunk-fq0cr76a.js@734347` | MIN_COMMAND_VERSION | 误报 | MIN_COMMAND_VERSION（初值 "0.5.0"…） 与名字相符 |
| 178 | `chunk-fq0cr76a.js@901792` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 179 | `chunk-fq0cr76a.js@902059` | APPARMOR_USERNS_PROBE_PATH | 错位重排 | APPARMOR_USERNS_PROBE_PATH→APPARMOR_USERNS_ERROR_RE |
| 180 | `chunk-fq0cr76a.js@1068603` | WINDOWS_DRIVE_TOP_DIR WINDOWS_DRIVE_PREFIX MACOS_VOL_FILE_PATH WINDOWS_ABSOLUTE_PREFIX WINDOWS_DEVICE_OR_ADMIN_PATH | 错位重排 | WINDOWS_DRIVE_TOP_DIR→WINDOWS_DRIVE_TOP_DIR_RE，WINDOWS_DRIVE_PREFIX→WINDOWS_DRIVE_PREFIX_RE，MACOS_VOL_FILE_PATH→MACOS_VOL_FILE_PATH_RE，WINDOWS_ABSOLUTE_PREFIX→WINDOWS_ABSOLUTE_PREFIX_RE，WINDOWS_DEVICE_OR_ADMIN_PATH→WINDOWS_DEVICE_OR_ADMIN_PATH_RE |
| 181 | `chunk-frha7zp8.js@629` | SESSION_ACTIVITY_TICK_MS | 改名 | SESSION_ACTIVITY_TICK_MS→SESSION_ACTIVITY_KEY |
| 182 | `chunk-g4k0hvs5.js@1671` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 183 | `chunk-g54kbxqw.js@24641` | MAX_PREFIXED_TOOL_NAME | 改名 | MAX_PREFIXED_TOOL_NAME→MAX_PREFIXED_TOOL_NAME_CHARS |
| 184 | `chunk-g54kbxqw.js@60085` | getCacheBreakDiffPath | 改名 | getCacheBreakDiffPath→cacheBreakStatePrefix |
| 185 | `chunk-g54kbxqw.js@143352` | untrustedFenceRegex | 误报 | untrustedFenceRegex（初值 null…） 与名字相符 |
| 186 | `chunk-g54kbxqw.js@166066` | getAllBaseToolsProvider | 改名 | getAllBaseToolsProvider→baseToolsProvider |
| 187 | `chunk-ga3g4pve.js@1446` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 188 | `chunk-ga5txjrx.js@1769` | SILENCE_DURATION_SECS SILENCE_THRESHOLD | 误报 | SILENCE_DURATION_SECS（初值 "2.0"…），SILENCE_THRESHOLD（初值 "3%"…） 与名字相符 |
| 189 | `chunk-gbtb0mjv.js@5877` | DEFAULT_LOOP_INTERVAL | 误报 | DEFAULT_LOOP_INTERVAL（初值 "10m"…） 与名字相符 |
| 190 | `chunk-gwwacf44.js@1229` | KEYCHAIN_CACHE_PER_HOST | 误报 | KEYCHAIN_CACHE_PER_HOST（初值 new W(()=>new i)…） 与名字相符 |
| 191 | `chunk-hantmvxa.js@83410` | MAX_FINDINGS_RE | 误报 | MAX_FINDINGS_RE（初值 /(^\|\s)--max-findings(?:(?:\…） 与名字相符 |
| 192 | `chunk-hm0ce8vc.js@44923` | MIN_GIT_VERSION_FOR_CAINFO | 误报 | MIN_GIT_VERSION_FOR_CAINFO（初值 "2.31"…） 与名字相符 |
| 193 | `chunk-hm0ce8vc.js@214886` | WORK_ORDER_USED_MESSAGE | 改名 | WORK_ORDER_USED_MESSAGE→MAX_WORK_ORDER_MESSAGE_CHARS |
| 194 | `chunk-hntsfzas.js@4839` | getOsRelease | 误报 | getOsRelease（初值 new W(()=>new L({platform:I,…） 与名字相符 |
| 195 | `chunk-hq88884p.js@51006` | FORBIDDEN_HOST_CHARS IGNORABLE_HOST_CHARS | 错位重排 | FORBIDDEN_HOST_CHARS→FORBIDDEN_HOST_CHARS_RE，IGNORABLE_HOST_CHARS→IGNORABLE_HOST_CHARS_RE |
| 196 | `chunk-hq88884p.js@58153` | MtlsClient | 改名 | MtlsClient→MTLS_SOCKET_TIMEOUT_MS |
| 197 | `chunk-hwmsct5x.js@183031` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 198 | `chunk-hwmsct5x.js@185012` | ANTHROPIC_USAGE_LIMIT | 误报 | ANTHROPIC_USAGE_LIMIT（初值 "anthropic-usage-limit"…） 与名字相符 |
| 199 | `chunk-hwmsct5x.js@193360` | MAX_BUDGET_SPEND_S | 误报 | MAX_BUDGET_SPEND_S（初值 691200…） 与名字相符 |
| 200 | `chunk-j64mp9kq.js@2598` | MAX_SITE_TEXT | 误报 | MAX_SITE_TEXT（初值 4000…） 与名字相符 |
| 201 | `chunk-jbv0t0w5.js@30958` | NOTICE_SAFE_CHARS | 误报 | NOTICE_SAFE_CHARS（初值 "!#$%&(*+,\\-./:;<=>?@[\\\\\…） 与名字相符 |
| 202 | `chunk-jeazk6wn.js@6097` | MAX_SERVER_MESSAGE MAX_RAW_MESSAGE | 误报 | MAX_SERVER_MESSAGE（初值 160…），MAX_RAW_MESSAGE（初值 2048…） 与名字相符 |
| 203 | `chunk-k5vy5m8c.js@406` | ZSH_PARAM_FLAG_CHARS | 误报 | ZSH_PARAM_FLAG_CHARS（初值 new Set(["#","^","=","~","+"…） 与名字相符 |
| 204 | `chunk-kxyd0g16.js@63209` | MemoryListInputSchema | 改名 | MemoryListInputSchema→MAX_LIST_ENTRIES |
| 205 | `chunk-kxyd0g16.js@68951` | MAX_TOKEN_COUNT | 误报 | MAX_TOKEN_COUNT（初值 1e6…） 与名字相符 |
| 206 | `chunk-kxyd0g16.js@155210` | WebBrowserTool SnipTool | 误报 | WebBrowserTool（初值 null…），SnipTool（初值 null…） 与名字相符 |
| 207 | `chunk-mthxbav8.js@50952` | WHITESPACE_CHARS SHELL_META_CHARS | 误报 | WHITESPACE_CHARS（初值 " \t"…），SHELL_META_CHARS（初值 ` ;&\|()<>`…） 与名字相符 |
| 208 | `chunk-mvhmq2z8.js@17551` | CLOUD_MODEL_LIST_TIMEOUT | 改名 | CLOUD_MODEL_LIST_TIMEOUT→CLOUD_MODEL_LIST_TIMEOUT_MESSAGE |
| 209 | `chunk-mvvq2nx1.js@18060` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 210 | `chunk-n2x174m4.js@2793` | launchRecordSchema | 改名 | launchRecordSchema→MAX_LAUNCH_ATTEMPTS |
| 211 | `chunk-n4bsg1hp.js@2835` | X_SERVED_FILE_PAGE_COUNT | 误报 | X_SERVED_FILE_PAGE_COUNT（初值 "x-served-file-page-count"…） 与名字相符 |
| 212 | `chunk-n5fvvrgq.js@1545` | LANGUAGE_MAX_BYTES | 误报 | LANGUAGE_MAX_BYTES（初值 new Map([["asciidoc",G],["gc…） 与名字相符 |
| 213 | `chunk-n5fvvrgq.js@3367` | MARKDOWN_FENCE_CHARS | 误报 | MARKDOWN_FENCE_CHARS（初值 "[`~<"…） 与名字相符 |
| 214 | `chunk-n5fvvrgq.js@6328` | CPP_TEMPLATE_RE | 改名 | CPP_TEMPLATE_RE→CPP_TEMPLATE_MAX_PARTS |
| 215 | `chunk-nw7jbebs.js@40557` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 216 | `chunk-p2qwpk2k.js@25926` | MAX_DENIAL_TEXT | 误报 | MAX_DENIAL_TEXT（初值 200…） 与名字相符 |
| 217 | `chunk-p2qwpk2k.js@68151` | MAX_COMMAND_TEXT | 误报 | MAX_COMMAND_TEXT（初值 200…） 与名字相符 |
| 218 | `chunk-p5akk6be.js@24168` | SPACE_LIKE_CHARS | 误报 | SPACE_LIKE_CHARS（初值 "\u2E40\u30A0\u1400"…） 与名字相符 |
| 219 | `chunk-p5akk6be.js@32951` | OPEN_BRACKET_CHARS CLOSE_BRACKET_CHARS EXTRA_SPACE_CHARS LONG_VOWEL_AND_BLANK_CHARS | 误报 | OPEN_BRACKET_CHARS（初值 "\\[\\uff3b\\ufe47\\u27e6\\u…），CLOSE_BRACKET_CHARS（初值 "\\]\\uff3d\\ufe48\\u27e7\\u…），EXTRA_SPACE_CHARS（初值 `\\t\\v\\f \\u00a0\\u1680\\u…），LONG_VOWEL_AND_BLANK_CHARS（初值 "\\u30fc\\uff70\\u115f\\u116…） 与名字相符 |
| 220 | `chunk-p7xf186d.js@4870` | normalizePairingErrorCode | 改名 | normalizePairingErrorCode→PAIRING_ERROR_CODE_SET |
| 221 | `chunk-q4qb1h08.js@18919` | ATTRIBUTION_HEADER_ENV | 误报 | ATTRIBUTION_HEADER_ENV（初值 new Set(["CLAUDE_CODE_ATTRIB…） 与名字相符 |
| 222 | `chunk-q8cqcff6.js@22465` | PWSH_STRIPPED_ENV SH_STRIPPED_ENV | 误报 | PWSH_STRIPPED_ENV（初值 new Set(["DEVPATH","__PSLOCK…），SH_STRIPPED_ENV（初值 new Set(["ENV","BASH_ENV","S…） 与名字相符 |
| 223 | `chunk-qcc88jq1.js@2323` | fileAttachmentSchema | 改名 | fileAttachmentSchema→SHA256_RE |
| 224 | `chunk-qchp9vrd.js@173185` | KUBECONFIG_ENV | 误报 | KUBECONFIG_ENV（初值 new Set(["KUBECONFIG"])…） 与名字相符 |
| 225 | `chunk-qchp9vrd.js@183776` | EXPLICIT_STRIP_ENV | 误报 | EXPLICIT_STRIP_ENV（初值 new Set([...wTe,"CLAUDE_CODE…） 与名字相符 |
| 226 | `chunk-qchp9vrd.js@233771` | REGEX_META_CHARS | 误报 | REGEX_META_CHARS（初值 new Set(".+^${}()\|[]\\")…） 与名字相符 |
| 227 | `chunk-qg0af0yq.js@19758` | HEADER_VALUE_CHARS | 误报 | HEADER_VALUE_CHARS（初值 "A-Za-z0-9%:_/.\\\\-"…） 与名字相符 |
| 228 | `chunk-qv1jytq6.js@5070` | runStopSchema | 改名 | runStopSchema→RUN_STOP_KEYS |
| 229 | `chunk-r01896cg.js@19184` | DECLARE_SEMANTIC_FLAG_CHARS EXPORT_SEMANTIC_FLAG_CHARS | 错位重排 | DECLARE_SEMANTIC_FLAG_CHARS→DECLARE_FLAG_CHARS_RE，EXPORT_SEMANTIC_FLAG_CHARS→EXPORT_FLAG_CHARS_RE |
| 230 | `chunk-r01896cg.js@66702` | GLOB_CHARS | 误报 | GLOB_CHARS（初值 "*?["…） 与名字相符 |
| 231 | `chunk-r1wk8q25.js@12135` | UPGRADE_RELAY_USAGE_LIMIT | 误报 | UPGRADE_RELAY_USAGE_LIMIT（初值 "upgrade_relay_usage_limit"…） 与名字相符 |
| 232 | `chunk-s3fw2t2g.js@1056` | MAX_VALIDATION_TEXT | 误报 | MAX_VALIDATION_TEXT（初值 1e5…） 与名字相符 |
| 233 | `chunk-s61vbvea.js@461142` | isUltrareviewEnabled | 改名 | isUltrareviewEnabled→ULTRA_REVIEW_CONFIG_FLAG |
| 234 | `chunk-s61vbvea.js@597201` | TRASH_SUFFIX_RANGE_EXCLUSIVE | 误报 | TRASH_SUFFIX_RANGE_EXCLUSIVE（初值 1073741824…） 与名字相符 |
| 235 | `chunk-s61vbvea.js@601806` | MAX_BACKGROUND_LEDGER_PER_HOST | 误报 | MAX_BACKGROUND_LEDGER_PER_HOST（初值 64…） 与名字相符 |
| 236 | `chunk-s61vbvea.js@645264` | MAX_FAULT_TEXT | 误报 | MAX_FAULT_TEXT（初值 500…） 与名字相符 |
| 237 | `chunk-s61vbvea.js@645636` | MAX_VISIBLE_TEXT | 误报 | MAX_VISIBLE_TEXT（初值 200…） 与名字相符 |
| 238 | `chunk-s67w32sp.js@4679` | pluginDirectoryCacheSchemaWithSchema | 错位重排 | pluginDirectoryCacheSchemaWithSchema→LISTING_MAX_AGE_MS |
| 239 | `chunk-s67w32sp.js@10708` | DIRECTORY_NO_ANSWER_TEXT DIRECTORY_REFRESH_TTL_MS | 错位重排 | DIRECTORY_NO_ANSWER_TEXT→DEFAULT_FIRST_ANSWER_MS，DIRECTORY_REFRESH_TTL_MS→DIRECTORY_NO_ANSWER_TEXT |
| 240 | `chunk-s67w32sp.js@11981` | isRecentTimestamp | 改名 | isRecentTimestamp→CLOCK_SKEW_TOLERANCE_MS |
| 241 | `chunk-s67w32sp.js@16547` | hasListingSource | 改名 | hasListingSource→DELISTING_GRACE_MS |
| 242 | `chunk-sdzpqjn8.js@30157` | MAX_EXPORT_BYTES | 误报 | MAX_EXPORT_BYTES（初值 1073741824…） 与名字相符 |
| 243 | `chunk-sh3bk7pt.js@6074` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 244 | `chunk-t0gq9gyw.js@49022` | WINDOWS_MAX_PATH | 误报 | WINDOWS_MAX_PATH（初值 259…） 与名字相符 |
| 245 | `chunk-tkqbtg0j.js@12104` | ENABLE_TOOL_OUTPUT_SCHEMA ENABLE_COMPUTER_OUTPUT_SCHEMA | 错位重排 | ENABLE_TOOL_OUTPUT_SCHEMA→ENABLE_TOOL_OUTPUT_INSTRUCTIONS，ENABLE_COMPUTER_OUTPUT_SCHEMA→ENABLE_COMPUTER_TOOL_NAME_PREFIX |
| 246 | `chunk-tmx5d02z.js@34736` | APPIFACT_REPL_INPUT_SCHEMA | 改名 | APPIFACT_REPL_INPUT_SCHEMA→INPUT_TAB_REFUSAL_MESSAGE |
| 247 | `chunk-tr0s0d0k.js@14130` | MAX_PATH_DEPTH_PREFIX | 误报 | MAX_PATH_DEPTH_PREFIX（初值 32…） 与名字相符 |
| 248 | `chunk-tr0s0d0k.js@24209` | TRAILING_TRIM_CHARS | 误报 | TRAILING_TRIM_CHARS（初值 ".,;:!?"…） 与名字相符 |
| 249 | `chunk-tr0s0d0k.js@42043` | NON_ASSIGNMENT_NEXT_CHARS | 误报 | NON_ASSIGNMENT_NEXT_CHARS（初值 new Set([""," ","\t",` `,'"'…） 与名字相符 |
| 250 | `chunk-v0yfsee9.js@61854` | PS_PARAM_PREFIX_CHARS | 误报 | PS_PARAM_PREFIX_CHARS（初值 new Set(["/","\u2013","\u201…） 与名字相符 |
| 251 | `chunk-w08rdxhd.js@34983` | typeUrlLabelRegex | 误报 | typeUrlLabelRegex（初值 null…） 与名字相符 |
| 252 | `chunk-w5ndchqs.js@12957` | SEP_WIDTH | 改名 | SEP_WIDTH→SEP |
| 253 | `chunk-wa9xapqs.js@516` | MIN_ERROR_REPORTING_VERSION | 误报 | MIN_ERROR_REPORTING_VERSION（初值 "2.1.193"…） 与名字相符 |
| 254 | `chunk-wm1cd8qt.js@13620` | FILE_MODE_READONLY | 误报 | FILE_MODE_READONLY（初值 420…） 与名字相符 |
| 255 | `chunk-wy9dbk5f.js@46366` | MAX_SKILL_OVERRIDE_KEY | 误报 | MAX_SKILL_OVERRIDE_KEY（初值 256…） 与名字相符 |
| 256 | `chunk-wy9dbk5f.js@49304` | MAX_OUTPUT_STYLE_PROMPT | 误报 | MAX_OUTPUT_STYLE_PROMPT（初值 65536…） 与名字相符 |
| 257 | `chunk-wyqg6m3h.js@11307` | MAX_LINES_PER_FILE | 误报 | MAX_LINES_PER_FILE（初值 400…） 与名字相符 |
| 258 | `chunk-wyqg6m3h.js@15157` | HUNK_HEADER | 改名 | HUNK_HEADER→HUNK_HEADER_RE |
| 259 | `chunk-x1mwqya5.js@22211` | SAFE_FALLBACK_TEXT | 改名 | SAFE_FALLBACK_TEXT→SAFE_FALLBACK_TEXT_RE |
| 260 | `chunk-x58vpmpd.js@1480` | DEVICE_KEY_SERVICE_NAME | 改名 | DEVICE_KEY_SERVICE_NAME→KEYCHAIN_TIMEOUT_MS |
| 261 | `chunk-xndtzje6.js@191` | COMPACT_FAILED_CONTEXT_LIMIT COMPACT_FAILED_MEDIA_LIMIT | 错位重排 | COMPACT_FAILED_CONTEXT_LIMIT→COMPACT_FAILED_CONTEXT_LIMIT_MESSAGE，COMPACT_FAILED_MEDIA_LIMIT→COMPACT_FAILED_MEDIA_LIMIT_MESSAGE |
| 262 | `chunk-xr4xc2mq.js@2740` | weakSet | 误报 | weakSet（初值 new WeakSet…） 与名字相符 |
| 263 | `chunk-yb0ajcmt.js@17482` | ARROW_HEAD_CHARS | 误报 | ARROW_HEAD_CHARS（初值 "xo<"…） 与名字相符 |
| 264 | `chunk-yb0ajcmt.js@24361` | SEQUENCE_ARROW_MAP SEQUENCE_TITLE_RE SEQUENCE_AUTONUMBER_RE | 错位重排 | SEQUENCE_ARROW_MAP→SEQUENCE_PARTICIPANT_RE，SEQUENCE_TITLE_RE→MAX_SEQUENCE_TITLE_CHARS，SEQUENCE_AUTONUMBER_RE→MAX_SEQUENCE_STEPS |
| 265 | `chunk-yf82ynbr.js@1096` | BACKUP_OR_COPY_SUFFIX_REGEX | 错位重排 | BACKUP_OR_COPY_SUFFIX_REGEX→MAX_NAME_VARIANTS |
| 266 | `chunk-yf82ynbr.js@7123` | DECORATION_LEAD_CHARS | 误报 | DECORATION_LEAD_CHARS（初值 `${O}#${U}`…） 与名字相符 |
| 267 | `chunk-yf82ynbr.js@8399` | WINDOWS_FORBIDDEN_CHARS | 误报 | WINDOWS_FORBIDDEN_CHARS（初值 '\\:*?"<>\|'…） 与名字相符 |
| 268 | `chunk-yxnffbzs.js@14511` | QUOTE_LIKE_CHARS | 改名 | QUOTE_LIKE_CHARS→QUOTE_LIKE_RE |
| 269 | `chunk-z4g2ta8k.js@69476` | SESSION_STREAM_RECEIVED_AT_MS | 误报 | SESSION_STREAM_RECEIVED_AT_MS（初值 "session_stream_received_at_…） 与名字相符 |

## 说明

- 第 50 条（`chunk-63f0f3kd.js@103128`）原判「改名」，复核后 `SUBSHELL_MARKER_CHARS` 的初值是 `` "$`{,}\"" ``，确为可跨过的字符集，改判**误报**；修正表里留下一条同名条目（等价于“明确保持”）。
- 第 96 条（`chunk-ar2zwb92.js@1133`）里 `DANGEROUS_SPELLING_CHARS`、`DASH_LIKE_CHARS` 两个标记是误报（名字配字符类字符串本就成立），只有同语句的 `VARIATION_SELECTOR_CHARS`（初值是正则）改名为 `VARIATION_SELECTOR_RE`。
- 第 46 条（`chunk-5aas12zq.js@1524`，40 个绑定）里有 23 个改名；同语句的 `xe LISTING_WHITESPACE_CHARS` 名字正确（初值是列空白字符表），保持原样。
- 名字与初值形态相反但语义正确的 `_CHARS` 正则（`UNSAFE_LOG_CHARS`）按误报处理：它是日志里要替换掉的字符类，命名者用 `CHARS` 表达“字符集合”，改名反而失真。
