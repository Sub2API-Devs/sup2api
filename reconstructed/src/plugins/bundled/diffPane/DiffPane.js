/**
 * plugins/bundled/diffPane/DiffPane.tsx
 *
 * 2.1.316 新增：内置 diff 面板插件的界面：侧栏/对话框面板、分段绘制与停靠布局。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wyqg6m3h.js (65)
 * attribution: placement 65
 */
import {
  DIALOG_PATH_FLOOR,
  DIALOG_PATH_RESERVE,
  STAT_CELLS,
  PATH_FLOOR,
  TODO_BAR_CELLS,
  TODO_BAR_RESERVE,
  PRE_SESSION_BODY_CAP,
  GUTTER_CHROME,
  MAX_VISIBLE_FILES,
  WHEEL_ROWS,
  SCROLL_MARGIN_ROWS,
  MAX_SUMMARY_ROWS,
  PANE_RIGHT_PAD_COLUMNS,
  OPEN_MIN_COLUMNS,
  AUTO_OPEN_MIN_COLUMNS,
  WIDEST_BUCKET_COLUMNS,
  SLOW_REFRESH_REST_MAX_MS,
  TIMED_OUT_REST_MS,
  TIMED_OUT_REST_MAX_MS,
  REFRESH_DEBOUNCE_MS,
  REDRAW_COALESCE_MS,
  HEAD_POLL_MS,
  GIT_TIMEOUT_MS,
  PROMPT_CONTEXT_MAX_CHARS,
} from "./hooks.js";
import {
  truncateStart,
  sanitizeName,
  keptOf,
  padEnd,
  plural,
  codeBlocksOf,
  MAX_CODE_CHARS,
  cellWidth,
  sanitizeLine,
  TAB_WIDTH,
  subHunksOf,
  drawnLineOf,
  listWindowOf,
  segmentRowsOf,
  pickedTurnOf,
  turnTotalsOf,
  BODY_BUDGET,
  dialogTitleOf,
  wrappedLines,
  partitionOf,
  headerTotalsOf,
  ZERO_TOTALS,
  emptyStateOf,
  modeLabelOf,
  unbornNoteOf,
  hunkSourceOf,
  MAX_BODY_CHARS,
  INITIAL_MODEL,
  baseModeOf,
  NO_BODIES,
  afterFetch,
  turnDiffsOf,
  afterNewSession,
} from "./diffModel.js";
import { diffStat } from "../../../components/MessageSelector.js";
import { askKeyOf } from "../../../components/permissions/hooks.js";
import { displayPathOf, isBodyLine } from "./gitDiffRead.js";
import { countWhere, adjustHunkLineNumbers, backendOf, INSTALLED_BACKEND_PROBES } from "./diffSources.js";
import {
  NOT_IN_REPOSITORY_TEXT,
  MORE_BELOW_TEXT,
  untrackedWithheldTextOf,
  RESIZE_TERMINAL_TEXT,
  isRecord,
  baseStoreKeyOf,
  PANE_ID,
  PANE_TITLE,
  STORE_OPEN_KEY,
  COMMAND_SPEC,
  BUILTIN_HOLDS_PATTERN,
  registerFailedTextOf,
  GIT_UNANSWERED_TEXT,
  AWAITS_SURFACE_TEXT,
  DIALOG_DISMISSED_TEXT,
  PANEL_SHOWN_TEXT,
  PANEL_HIDDEN_TEXT,
  PLUGIN_NAMES,
  CODE_EDITING_TOOLS,
  mayHaveWritten,
  SHELL_TOOLS,
} from "./constants.js";
import { armedAskOf, fittedAskTextOf } from "./diffText.js";
import { CC_PLUGIN_DIFF } from "../diff/index.js";
import { BUILTIN } from "../../../utils/telemetry/pluginTelemetry.js";

//@ chunk-wyqg6m3h.js:36855-37057 placement
function listRow(e, o, r) {
  let { Box: Box, Button: Button } = e.ui;
  return h(
    Box,
    { flexDirection: "row" },
    h(
      Button,
      {
        key: o.key,
        plain: !0,
        dimColor: o.isDim,
        ...(o.isAutoFocus ? { autoFocus: !0 } : {}),
        onPress: o.onPress,
      },
      o.label,
    ),
    h(Box, { flexGrow: 1 }),
    r,
  );
}
//@ chunk-wyqg6m3h.js:37057-37073 placement
var POINTER = "\u276F";
//@ chunk-wyqg6m3h.js:37073-37357 placement
function dialogFileRow(e, o, r) {
  let { Text: Text } = e.ui,
    max = Math.max(DIALOG_PATH_FLOOR, e.columns - DIALOG_PATH_RESERVE),
    a = o.isSelected ? POINTER : " ",
    i = truncateStart(sanitizeName(o.displayPath), max),
    p = h(Text, { dimColor: !0, italic: !0 }, o.note ?? ""),
    y = o.note !== null ? p : diffStat(e, o.added, o.removed);
  return listRow(e, { key: o.key, label: `${a} ${i}`, onPress: r, isDim: !1, isAutoFocus: o.isSelected }, y);
}
//@ chunk-wyqg6m3h.js:37357-37438 placement
function dimNote(e, o) {
  let { Text: Text } = e.ui;
  return h(Text, { dimColor: !0, wrap: "truncate-end" }, o);
}
//@ chunk-wyqg6m3h.js:37438-37555 placement
function divider(e) {
  let { Text: Text } = e.ui;
  return h(Text, { dimColor: !0, wrap: "truncate-end" }, "\u2500".repeat(Math.max(1, e.columns)));
}
//@ chunk-wyqg6m3h.js:37555-37587 placement = _temp2 (1)
var fileKeyOf = (url) => `file:${sanitizeName(url.path)}`;
//@ chunk-wyqg6m3h.js:37587-37650 placement
var statTextOf = (e, o) => keptOf([e > 0 ? `+${e}` : null, o > 0 ? `-${o}` : null]).join(" ");
//@ chunk-wyqg6m3h.js:37650-37856 placement
function fileRow(e, o, r) {
  let s = padEnd(
    truncateStart(sanitizeName(o.displayPath), Math.max(e.columns - STAT_CELLS, PATH_FLOOR)),
    e.columns - statTextOf(o.added, o.removed).length,
  );
  return listRow(
    e,
    { key: o.key, label: s, onPress: r, isDim: !0, isAutoFocus: !1 },
    diffStat(e, o.added, o.removed),
  );
}
//@ chunk-wyqg6m3h.js:37856-37873 placement
var present = (e) => keptOf(e);
//@ chunk-wyqg6m3h.js:37873-38109 placement
function headerView(e, o, r) {
  let { Box: Box, Text: Text } = e.ui;
  return h(
    Box,
    { flexDirection: "row", height: 1 },
    present([
      o &&
        ((i) =>
          h(
            Text,
            { wrap: "truncate-end" },
            h(Text, { bold: !0 }, plural(i.filesCount, "file")),
            " changed ",
            diffStat(e, i.linesAdded, i.linesRemoved),
          ))(o),
      h(Box, { flexGrow: 1 }),
      r,
    ]),
  );
}
//@ chunk-wyqg6m3h.js:38109-38313 placement
function legendRow(e, o) {
  let { Box: Box, Text: Text } = e.ui;
  return h(Box, { flexDirection: "row" }, [
    h(
      Text,
      { dimColor: !0, wrap: "truncate-end" },
      truncateStart(sanitizeName(o.displayPath), Math.max(e.columns - STAT_CELLS, PATH_FLOOR)),
    ),
    h(Box, { flexGrow: 1 }),
    diffStat(e, o.added, o.removed),
  ]);
}
//@ chunk-wyqg6m3h.js:38313-38504 placement
function listEdgeButton(e, o, r) {
  let { Button: Button } = e.ui,
    n = o === "list-up";
  return h(
    Button,
    {
      key: o,
      plain: !0,
      dimColor: !0,
      action: n ? "app:diffFileListUp" : "app:diffFileListDown",
      onPress: () => e.actions.scrollList(n ? -1 : 1),
    },
    r,
  );
}
//@ chunk-wyqg6m3h.js:38504-38940 placement
function nameRow(e, o) {
  let { Box: Box, Text: Text, Button: Button } = e.ui,
    filtered = [o.isUntracked ? "untracked" : null, o.isTruncated ? "truncated" : null].filter(
      (l) => l !== null,
    ),
    i = filtered.length === 0 ? "" : ` (${filtered.join(", ")})`,
    p = h(
      Button,
      { key: askKeyOf(o.path), onPress: () => e.actions.toggleAsk(o.path) },
      o.isArmed ? "asked \u2713" : "ask",
    );
  return h(Box, { flexDirection: "row" }, [
    h(Text, { bold: !0, wrap: "truncate-start" }, truncateStart(sanitizeName(o.displayPath), e.columns)),
    h(Text, { dimColor: !0 }, i),
    h(Box, { flexGrow: 1 }),
    ...(o.isAskable ? [p] : []),
  ]);
}
//@ chunk-wyqg6m3h.js:38940-39251 placement
function sourcePicker(e, o) {
  let { Select: Select } = e.ui,
    { source: source, turns: turns } = o;
  return turns.length > 0
    ? h(Select, {
        key: "source",
        label: "source",
        options: [
          { value: "current", label: "Current" },
          ...turns.map((i) => ({ value: String(i.index), label: `T${i.index}` })),
        ],
        value: source.kind === "current" ? "current" : String(source.index),
        onSelect: (i) => e.actions.chooseSource(i),
      })
    : null;
}
//@ chunk-wyqg6m3h.js:39251-39392 placement
function titleRow(e, o) {
  let { Text: Text } = e.ui,
    s = o.subtitle !== "";
  return h(
    Text,
    { wrap: "truncate-end" },
    sanitizeName(o.title),
    h(Text, { dimColor: !0 }, s ? ` ${sanitizeName(o.subtitle)}` : ""),
  );
}
//@ chunk-wyqg6m3h.js:39392-39748 placement
function todoBar(e, o) {
  let { todos: todos } = o;
  if (todos.total === 0) return null;
  let { Box: Box, Text: Text } = e.ui,
    max = Math.max(1, Math.min(TODO_BAR_CELLS, e.columns - TODO_BAR_RESERVE)),
    rounded = Math.round((todos.done / todos.total) * max);
  return h(
    Box,
    { flexDirection: "row", gap: 1, marginTop: 1 },
    h(
      Text,
      null,
      h(Text, { color: "success" }, "\u2588".repeat(rounded)),
      h(Text, { color: "inactive" }, "\u2591".repeat(Math.max(0, max - rounded))),
    ),
    h(Text, { dimColor: !0 }, `${todos.done}/${todos.total}`),
  );
}
//@ chunk-wyqg6m3h.js:39748-39886 placement
function toggleRow(e, o, r) {
  let { Box: Box, Button: Button } = e.ui;
  return h(
    Box,
    { flexDirection: "row" },
    h(Button, { key: o, plain: !0, dimColor: !0, onPress: r.onPress }, r.label),
  );
}
//@ chunk-wyqg6m3h.js:39886-39896 placement
var FILE_FRAME_NODES = 16;
//@ chunk-wyqg6m3h.js:39896-39928 placement
var SAFE_PATHSPEC_PATTERN = /^[\p{L}\p{N}._/@+-]+$/u;
//@ chunk-wyqg6m3h.js:39928-40296 placement
function placeholderOf(e) {
  if (e.isUntracked) return e.words.untrackedNoteOf(e.path, SAFE_PATHSPEC_PATTERN.test(e.path));
  if (e.isBinary) return ["Binary file - cannot display diff"];
  if (e.body === void 0) return ["Loading diff\u2026"];
  if (e.body === null) return ["Diff unavailable"];
  let { isLarge: isLarge, hunks: hunks } = e.body,
    s = hunks.length === 0,
    n = isLarge ? "Large file - diff exceeds 1 MB limit" : s ? "No diff content" : null;
  return n ? [n] : null;
}
//@ chunk-wyqg6m3h.js:40296-40840 placement
function detailView(e, o, r) {
  let { Box: Box, Text: Text, Code: Code } = e.ui,
    i = placeholderOf(o),
    p = codeBlocksOf(i ? [] : (o.body?.hunks ?? []), {
      chars: r.chars - sanitizeName(o.displayPath).length,
      nodes: r.nodes - FILE_FRAME_NODES,
    }),
    l = o.body?.isTruncated === !0 || p.isTruncated,
    sliced = sanitizeName(o.path).slice(-MAX_CODE_CHARS),
    d = l ? [h(Text, { dimColor: !0, italic: !0 }, "\u2026 diff truncated (exceeded 400 line limit)")] : [],
    mapped = (i ?? []).map((O) => h(Text, { dimColor: !0, italic: !0, wrap: "wrap" }, O)),
    mapped_2 = p.sources.map((source) => h(Code, { source: source, format: "diff", path: sliced }));
  return {
    element: h(Box, { flexDirection: "column" }, [
      nameRow(e, { ...o, isTruncated: l, isAskable: i === null }),
      divider(e),
      ...(i ? mapped : mapped_2),
      ...d,
    ]),
    room: p.room,
  };
}
//@ chunk-wyqg6m3h.js:40840-40992 placement
var bodyEntryOf = (e, o) => ({
  path: e.path,
  displayPath: displayPathOf(e),
  added: e.added,
  removed: e.removed,
  isUntracked: e.isUntracked,
  isBinary: e.isBinary,
  body: o.bodies.get(e.path),
});
//@ chunk-wyqg6m3h.js:40992-41149 placement
var detailModelOf = (e, o) => ({
  words: o.words,
  path: e.path,
  displayPath: e.displayPath,
  isUntracked: e.isUntracked,
  isBinary: e.isBinary,
  body: e.body,
  isArmed: o.armedPath === e.path,
});
//@ chunk-wyqg6m3h.js:41149-41313 placement
var turnEntryOf = (e) => ({
  path: e.path,
  displayPath: e.path,
  added: e.added,
  removed: e.removed,
  isUntracked: !1,
  isBinary: !1,
  body: { hunks: e.hunks, isTruncated: e.isTruncated, isLarge: !1 },
});
//@ chunk-wyqg6m3h.js:41313-42573 placement
function segmentsOf(e, o) {
  let { earlier: earlier } = o,
    { columns: columns } = e.place,
    n = o.message.length > 0,
    a = e.isPreSessionShown && earlier.length > 0,
    i = earlier.length > PRE_SESSION_BODY_CAP,
    p = (E) =>
      String(
        Math.max(
          1,
          E.oldStart + countWhere(E.lines, (A) => !A.startsWith("+")) - 1,
          E.newStart + countWhere(E.lines, (A) => !A.startsWith("-")) - 1,
        ),
      ).length + GUTTER_CHROME;
  function l(E, A) {
    let max = Math.max(1, columns - p(A)),
      mapped = A.lines.map((line) =>
        Math.max(
          1,
          Math.ceil(cellWidth(sanitizeLine(line.slice(1).replaceAll("\t", " ".repeat(TAB_WIDTH)))) / max),
        ),
      );
    return {
      kind: "hunk",
      path: E.path,
      hunk: A,
      lineRows: mapped,
      rows: mapped.reduce((I, me) => I + me, 0),
    };
  }
  let y = (E) => subHunksOf({ ...E, lines: E.lines.filter(isBodyLine).map(drawnLineOf) }, MAX_CODE_CHARS);
  function d(E) {
    let A = detailModelOf(E, e),
      k = placeholderOf(A),
      mapped = (E.body?.hunks ?? []).map(y),
      I = E.body?.isTruncated === !0 || mapped.some((V) => V.isTruncated),
      me = k ? k.map((V) => ({ kind: "note", text: V })) : mapped.flatMap((V) => V.hunks).map((V) => l(E, V));
    return [
      { kind: "rule", path: E.path },
      { kind: "name", name: { ...A, isTruncated: I, isAskable: k === null } },
      { kind: "rule", path: null },
      ...me,
      ...(I ? [{ kind: "footer" }] : []),
    ];
  }
  let T = (E) => [...d(E), { kind: "blank" }],
    w = () => [
      { kind: "blank" },
      ...o.message.map((E) => ({ kind: "text", text: sanitizeName(E) })),
      { kind: "blank" },
    ],
    R = { kind: "text", text: `diffs hidden above ${PRE_SESSION_BODY_CAP} files` },
    O = () => (i ? [R] : earlier.flatMap(d)),
    _ = () => [{ kind: "blank" }, ...earlier.map((E) => ({ kind: "legend", entry: E })), ...O()];
  return [
    ...(n ? w() : o.rows.flatMap(T)),
    ...keptOf([o.earlierLabel]).map((E) => ({ kind: "toggle", label: E })),
    ...(a ? _() : []),
  ];
}
//@ chunk-wyqg6m3h.js:42573-43102 placement
function bodyLayoutOf(e, o) {
  let r = segmentsOf(e, o),
    s = listWindowOf(e, o),
    n = !o.turn && o.partition.noiseCount > 0,
    a = o.message.length === 0,
    i = a && (o.rows.length > 0 || n),
    p = i
      ? s.shown.length +
        Number(s.above > 0) +
        Number(s.below > 0 || o.totals.notShown > 0) +
        Number(o.isUntrackedNoted) +
        Number(n) +
        2
      : Number(a),
    l = 1 + Number(o.line !== null) + (e.todos.total > 0 ? 2 : 0),
    y = new Map(),
    max = Math.max(0, e.place.rows - l - p),
    T = 0;
  for (let R of r) {
    if (R.kind === "rule" && R.path !== null) y.set(R.path, T);
    T += segmentRowsOf(R);
  }
  let w = l + 1;
  return {
    segments: r,
    extent: T,
    visibleRows: max,
    maxTop: Math.max(0, T - max),
    tops: y,
    listTop: w,
    listEnd: i ? w + p - 2 : w,
  };
}
//@ chunk-wyqg6m3h.js:43102-43235 placement
function dialogEntriesOf(e) {
  let o = pickedTurnOf(e);
  return o
    ? o.files.map(turnEntryOf)
    : [...(e.data?.files ?? [])]
        .sort((r, s) => displayPathOf(r).localeCompare(displayPathOf(s)))
        .map((r) => bodyEntryOf(r, e));
}
//@ chunk-wyqg6m3h.js:43235-43342 placement
var dialogWindowOf = (e, o) =>
  Math.max(
    0,
    Math.min(
      o.length - MAX_VISIBLE_FILES,
      Math.max(0, o.indexOf(e.selectedPath ?? "")) - Math.floor(MAX_VISIBLE_FILES / 2),
    ),
  );
//@ chunk-wyqg6m3h.js:43342-43679 placement
function dialogFocusOf(e, o) {
  let r = dialogEntriesOf(e),
    mapped = r.map((E) => E.path),
    mapped_2 = r.map((E) => fileKeyOf(E)),
    index = mapped_2.indexOf(o ?? ""),
    max = Math.max(0, mapped.indexOf(e.selectedPath ?? "")),
    p = dialogWindowOf(e, mapped),
    l = Math.min(mapped.length, p + MAX_VISIBLE_FILES) - 1,
    y = mapped[index] ?? null,
    d = mapped_2[p + index - dialogWindowOf({ selectedPath: y }, mapped)],
    T = max === 0 && index === l,
    w = max === mapped.length - 1 && index === p;
  return l - p >= 2 && (w || T)
    ? "stay"
    : y !== null && d !== void 0
      ? { selectedPath: y, landing: d }
      : null;
}
//@ chunk-wyqg6m3h.js:43679-43909 placement
function preludeOf(e, o) {
  let { Box: Box } = e.ui,
    s = o.data === null && !o.hasSettled,
    n = h(Box, null, dimNote(e, NOT_IN_REPOSITORY_TEXT)),
    i = s
      ? (() =>
          messagePaneOf(e, {
            top: [headerView(e, null, null)],
            message: ["Loading diff\u2026"],
            controls: null,
            earlier: null,
            rest: [],
          }))()
      : null;
  return o.isOutsideRepository ? n : i;
}
//@ chunk-wyqg6m3h.js:43909-45274 placement
function dialogPane(e, o) {
  let { Box: Box, Text: Text } = e.ui,
    n = preludeOf(e, o);
  if (n) return n;
  let a = pickedTurnOf(o),
    { data: i } = o,
    p = dialogEntriesOf(o),
    l = a ? turnTotalsOf(a) : (i?.stats ?? null),
    y = o.source.kind === "turn",
    d = p.length > MAX_VISIBLE_FILES,
    found = p.find((D) => D.path === o.selectedPath),
    w = found ?? p[0],
    R = o.dialogView === "detail" && found !== void 0,
    O = dialogWindowOf(
      o,
      p.map((D) => D.path),
    ),
    sliced = p.slice(O, O + MAX_VISIBLE_FILES),
    E = dimNote(e, " "),
    A = p.length - O - sliced.length,
    k = !y && i !== null && i.stats.filesCount > 0 && p.length === 0,
    U = y ? "No file changes in this turn" : k ? "Too many files to display details" : "No changes yet",
    I = p.length > 0 ? null : U,
    me =
      l &&
      h(
        Text,
        { dimColor: !0, wrap: "truncate-end" },
        `${plural(l.filesCount, "file")} changed `,
        diffStat(e, l.linesAdded, l.linesRemoved),
      ),
    V = (D) => (D.isUntracked ? "untracked" : D.isBinary ? "Binary file" : null),
    Me = (D) =>
      dialogFileRow(
        e,
        {
          key: fileKeyOf(D),
          path: D.path,
          displayPath: D.displayPath,
          added: D.added,
          removed: D.removed,
          note: V(D),
          isSelected: D === w,
        },
        () => e.actions.selectFile(D.path),
      );
  function ye(D, Y) {
    let ze = D === "up" ? "\u2191" : "\u2193",
      replaced = plural(Y, "file").replace(" ", " more ");
    return dimNote(e, ` ${ze} ${replaced}`);
  }
  let he = (D, Y) => (Y > 0 ? ye(D, Y) : E),
    Oe = (D, Y) => (d ? he(D, Y) : null),
    ge = (D) => [detailView(e, detailModelOf(D, o), BODY_BUDGET).element],
    z = present([Oe("up", O), ...sliced.map(Me), Oe("down", A)]),
    C = R && found ? ge(found) : z,
    u = I === null ? C : [dimNote(e, I)],
    M = R
      ? "\u2191/\u2193 to scroll \xB7 Esc to back"
      : "\u2191/\u2193 to select \xB7 Enter to view \xB7 Esc to close";
  return h(
    Box,
    { flexDirection: "column" },
    present([
      titleRow(e, dialogTitleOf(o)),
      h(Box, { height: 1 }),
      me,
      sourcePicker(e, o),
      h(Box, { flexDirection: "column", marginTop: 1, marginBottom: 1 }, u),
      dimNote(e, M),
    ]),
  );
}
//@ chunk-wyqg6m3h.js:45274-45635 placement
function dialogRowsOf(e) {
  let o = dialogEntriesOf(e),
    r = pickedTurnOf(e) !== void 0 || e.data !== null,
    s = o.length > MAX_VISIBLE_FILES,
    found = o.find((w) => w.path === e.selectedPath),
    a = e.dialogView === "detail" && found !== void 0,
    i = dialogWindowOf(
      e,
      o.map((w) => w.path),
    ),
    reduced = (found?.body?.hunks ?? []).reduce((w, R) => w + 1 + R.lines.length, 0),
    min = Math.min(o.length - i, MAX_VISIBLE_FILES),
    d = o.length === 0 ? 1 : min + (s ? 2 : 0),
    T = a ? 2 + Math.max(1, reduced) : d;
  return 2 + Number(r) + Number(e.turns.length > 0) + 2 + T + 1;
}
//@ chunk-wyqg6m3h.js:45635-46046 placement
function listBodyOf(e) {
  let { data: o, partition: partition, totals: totals, empty: empty } = e,
    a = empty?.hint ?? null;
  if (empty) return a === null ? [] : [a];
  if (o !== null && o.files.length === 0 && totals.filesCount > 0)
    return ["Too many changed files to show diff", "Per-file diff is skipped above 500 files"];
  return partition.shown.length === 0 && partition.noiseCount > 0
    ? [
        "Only tests and generated files changed",
        'Tests and generated files are hidden \xB7 click "show" above to view ' + "them",
      ]
    : partition.shown;
}
//@ chunk-wyqg6m3h.js:46046-46055 placement
var FOOT_ROWS = 3;
//@ chunk-wyqg6m3h.js:46055-46746 placement
function messagePaneOf(e, o) {
  let { Box: Box, Text: Text } = e.ui,
    { top: top, controls: controls, earlier: earlier, rest: rest } = o,
    flattened = o.message.flatMap((I) => wrappedLines(sanitizeName(I), e.columns)),
    mapped = flattened.map((I) => h(Text, { dimColor: !0 }, I)),
    d = controls === null ? [] : [controls],
    T = earlier === null ? [] : [earlier],
    R = d.length > 0 || T.length === 0 ? d : [h(Box, { height: 1 })],
    O = earlier === null ? 0 : FOOT_ROWS,
    _ = e.rows - top.length - 1 - O,
    floored = Math.floor((_ - flattened.length) / 2);
  if (!(rest.length === 0 && _ - floored - flattened.length >= d.length))
    return h(Box, { flexDirection: "column" }, [
      ...top,
      h(Box, { height: 1 }),
      ...mapped,
      ...R,
      ...T,
      ...rest,
    ]);
  let k = floored > 0 ? [h(Box, { height: floored })] : [],
    mapped_2 = T.map((I) => h(Box, { flexDirection: "column", marginTop: 1, paddingBottom: 1 }, I));
  return h(Box, { flexDirection: "column", height: e.rows }, [
    ...top,
    h(Box, { height: 1 }),
    h(Box, { flexDirection: "column", height: _, alignItems: "center" }, [...k, ...mapped, ...d]),
    ...mapped_2,
  ]);
}
//@ chunk-wyqg6m3h.js:46746-47563 placement
function dockPlanOf(e) {
  let { data: o, requestedMode: requestedMode } = e,
    s = pickedTurnOf(e),
    n = e.isNoiseShown ? "shown" : "hidden",
    a = partitionOf(o?.files ?? [], n),
    i = e.isPreSessionShown ? "hide" : "show",
    p = s ? turnTotalsOf(s) : o ? headerTotalsOf(o, a) : ZERO_TOTALS,
    l = s ? null : emptyStateOf(e, p.filesCount),
    y = s ? [] : listBodyOf({ data: o, partition: a, totals: p, empty: l }),
    flattened = y.flatMap((k) => (typeof k === "string" ? [k] : [])),
    T = s ? s.files.length > 0 : flattened.length < y.length,
    w = (k) => bodyEntryOf(k, e),
    R = s ? s.files.map(turnEntryOf) : T ? a.shown.map(w) : [],
    O = s ? [] : a.preSession.map(w),
    _ = O.length > 0,
    E = o !== null && !o.isUnborn && (requestedMode !== "session" || o.mode !== "session"),
    A = s
      ? `Turn ${s.index} "${s.preview}"`
      : E
        ? modeLabelOf(requestedMode, e)
        : unbornNoteOf(e, p.filesCount);
  return {
    turn: s,
    partition: a,
    totals: p,
    empty: l,
    line: A === null ? null : sanitizeName(A),
    rows: R,
    earlier: O,
    earlierLabel: _ ? `+${plural(O.length, "file")} edited before this session (${i})` : null,
    notes: flattened,
    message: l ? [l.headline, ...flattened] : T ? [] : flattened,
    isUntrackedNoted: !s && o?.isUntrackedWithheld === !0 && l === null,
  };
}
//@ chunk-wyqg6m3h.js:47563-47734 placement
function hunkWindowOf(e, o) {
  let r = 0,
    s = 0,
    n = 0,
    a = 0;
  for (let lineRow of e.lineRows) {
    if (r + lineRow <= o.skip) s += 1;
    else if (n < o.take) ((n += lineRow), (a += 1));
    r += lineRow;
  }
  let i = adjustHunkLineNumbers(e.hunk, s);
  return { ...i, lines: i.lines.slice(0, a) };
}
//@ chunk-wyqg6m3h.js:47734-47977 placement
function bodyScrolledBy(e, o) {
  let { visibleRows: visibleRows, maxTop: maxTop } = bodyLayoutOf(e, dockPlanOf(e)),
    abs = Math.abs(o.by),
    a = abs >= o.contentRows && o.contentRows > o.bodyRows,
    i = !a && abs >= o.bodyRows,
    p = a ? maxTop : i ? Math.max(1, visibleRows) : abs * WHEEL_ROWS;
  return { ...e.place, top: Math.max(0, Math.min(maxTop, e.place.top + Math.sign(o.by) * p)) };
}
//@ chunk-wyqg6m3h.js:47977-48829 placement
function drawWindow(e, o, r) {
  let { Box: Box, Text: Text, Code: Code } = e.ui,
    i = [],
    p = o.visibleRows + SCROLL_MARGIN_ROWS,
    max = Math.max(0, Math.min(r, o.maxTop)),
    togglePreSession = e.actions.togglePreSession,
    d = 0,
    T = 0,
    w = 0;
  function R(_, E) {
    let A = hunkSourceOf(hunkWindowOf(_, E)),
      k = sanitizeName(_.path);
    return (
      (w += A.length),
      w > MAX_BODY_CHARS
        ? h(Text, { dimColor: !0, italic: !0 }, "\u2026")
        : h(Code, { source: A, format: "diff", path: k })
    );
  }
  function O(_, E) {
    switch (_.kind) {
      case "rule":
        return divider(e);
      case "blank":
        return h(Box, { height: 1 });
      case "name":
        return nameRow(e, _.name);
      case "hunk":
        return R(_, E);
      case "note":
        return h(Text, { dimColor: !0, italic: !0, wrap: "wrap" }, _.text);
      case "footer":
        return h(Text, { dimColor: !0, italic: !0 }, "\u2026 diff truncated (exceeded 400 line limit)");
      case "text":
        return dimNote(e, _.text);
      case "toggle":
        return toggleRow(e, "presession", { ..._, onPress: togglePreSession });
      case "legend":
        return legendRow(e, _.entry);
    }
  }
  for (let segment of o.segments) {
    let E = segmentRowsOf(segment);
    if (d + E > max && T < p) {
      let max_2 = Math.max(0, max - d);
      (i.push(O(segment, { skip: max_2, take: p - T })), (T += E - max_2));
    }
    d += E;
  }
  return i;
}
//@ chunk-wyqg6m3h.js:48829-48944 placement
function isWheelOverList(e, o) {
  let r = dockPlanOf(e),
    { listTop: listTop, listEnd: listEnd } = bodyLayoutOf(e, r),
    a = o.pointer?.row ?? -1;
  return a >= listTop && a < listEnd && r.rows.length > MAX_SUMMARY_ROWS;
}
//@ chunk-wyqg6m3h.js:48944-49605 placement
function listBlockOf(e, o, r) {
  let { shown: shown, above: above, below: below } = listWindowOf(o, r),
    { noiseCount: noiseCount } = r.partition,
    { notShown: notShown } = r.totals,
    l = !r.turn && noiseCount > 0,
    y = above > 0,
    d = below > 0,
    T = notShown > 0,
    w = o.isNoiseShown ? "hide" : "show",
    joined = keptOf([d ? `${below} ${MORE_BELOW_TEXT}` : null, T ? `${notShown} not shown` : null]).join(
      " \xB7 ",
    ),
    O = (k) =>
      fileRow(
        e,
        {
          key: fileKeyOf(k),
          path: k.path,
          displayPath: k.displayPath,
          added: k.added,
          removed: k.removed,
          note: null,
          isSelected: !1,
        },
        () => e.actions.selectFile(k.path),
      ),
    _ = y ? listEdgeButton(e, "list-up", `\u2191 ${above} more above`) : null,
    E = d ? listEdgeButton(e, "list-down", `\u2193 ${joined}`) : T ? dimNote(e, `\u2026 ${joined}`) : null,
    A = l
      ? toggleRow(e, "noise", {
          label: `${plural(noiseCount, "test")}/generated (${w})`,
          onPress: e.actions.toggleNoise,
        })
      : null;
  return present([
    _,
    ...shown.map(O),
    E,
    r.isUntrackedNoted ? dimNote(e, untrackedWithheldTextOf(o)) : null,
    A,
  ]);
}
//@ chunk-wyqg6m3h.js:49605-49746 placement
function listScrolledBy(e, o) {
  let max = Math.max(0, dockPlanOf(e).rows.length - MAX_SUMMARY_ROWS);
  return { ...e.place, listStart: Math.max(0, Math.min(max, Math.min(e.place.listStart, max) + o)) };
}
//@ chunk-wyqg6m3h.js:49746-49816 placement
var placeAtFile = (e, o) => ({ ...e.place, top: bodyLayoutOf(e, dockPlanOf(e)).tops.get(o) ?? e.place.top });
//@ chunk-wyqg6m3h.js:49816-49870 placement
var insetOf = (e) => ({ ...e, columns: Math.max(1, e.columns - PANE_RIGHT_PAD_COLUMNS) });
//@ chunk-wyqg6m3h.js:49870-50611 placement
function sidebarPane(e, o) {
  let { Box: Box, Button: Button } = e.ui,
    n = preludeOf(e, o);
  if (n) return n;
  let a = dockPlanOf(o),
    i = a.message.length === 0,
    p = !i && !(o.isPreSessionShown && a.earlier.length > 0),
    l = listBlockOf(e, o, a),
    togglePreSession = e.actions.togglePreSession,
    d = l.length > 0,
    T = present([
      headerView(
        e,
        a.empty ? null : a.totals,
        h(
          Box,
          { flexDirection: "row" },
          present([
            sourcePicker(e, o),
            h(
              Button,
              { key: "base", plain: !0, action: "app:cycleDiffBase", onPress: e.actions.cycleBase },
              "",
            ),
          ]),
        ),
      ),
      a.line === null ? null : dimNote(e, a.line),
      todoBar(e, o),
    ]);
  if (p)
    return messagePaneOf(e, {
      top: [...T, ...l],
      message: a.message,
      controls: null,
      earlier:
        keptOf([a.earlierLabel]).map((R) =>
          toggleRow(e, "presession", { label: R, onPress: togglePreSession }),
        )[0] ?? null,
      rest: [],
    });
  let w = () =>
    d ? h(Box, { flexDirection: "column", marginTop: 1, marginBottom: 1 }, l) : h(Box, { height: 1 });
  return h(Box, { flexDirection: "column" }, [
    ...T,
    ...(i ? [w()] : []),
    ...drawWindow(e, bodyLayoutOf(o, a), o.place.top),
  ]);
}
//@ chunk-wyqg6m3h.js:50611-50834 placement
function paneView(e, o, r) {
  let { Box: Box } = e.ui,
    n = r.placement === "dock",
    a = o.isFullscreen !== !1 && r.terminalColumns !== null && r.terminalColumns < OPEN_MIN_COLUMNS;
  return n
    ? h(Box, { flexDirection: "column", paddingRight: PANE_RIGHT_PAD_COLUMNS }, sidebarPane(insetOf(e), o))
    : a
      ? h(Box, null, dimNote(e, RESIZE_TERMINAL_TEXT))
      : dialogPane(e, o);
}
//@ chunk-wyqg6m3h.js:50834-51150 placement
function drawnFilesOf(e) {
  let o = e.data?.files ?? [];
  if (e.placement === "inline") {
    let n = pickedTurnOf(e) !== void 0,
      mapped = dialogEntriesOf(e).map((l) => l.path),
      i = dialogWindowOf(e, mapped),
      sliced = mapped.slice(i, i + MAX_VISIBLE_FILES);
    return o.filter((l) => !n && sliced.includes(l.path));
  }
  let r = partitionOf(o, e.isNoiseShown ? "shown" : "hidden"),
    s = e.isPreSessionShown && r.preSession.length <= PRE_SESSION_BODY_CAP;
  return [...r.shown, ...(s ? r.preSession : [])];
}
//@ chunk-wyqg6m3h.js:51150-51237 placement
var entryKindsOf = (e) => (o) =>
  e.listDir(o).then(
    (r) => new Map(r.map((s) => [s.name, s.kind])),
    () => null,
  );
//@ chunk-wyqg6m3h.js:51237-51348 placement = isEnvTruthy (0.824)
var isEnvTruthy = (e, o) =>
  e.fileCheckpointingEnabled !== !1 && !["1", "true", "yes", "on"].includes((o ?? "").trim().toLowerCase());
//@ chunk-wyqg6m3h.js:51348-51381 placement
var isOnPaneSurface = (e) => e.surface !== "mobile";
//@ chunk-wyqg6m3h.js:51381-51432 placement
var messageOf = (e) => (e instanceof Error ? e.message : String(e));
/**
 * 返回"取 mtime 或 null"的函数（柯里化）。
 */
//@ chunk-wyqg6m3h.js:51432-51489 placement = getFileModificationTimeAsync (1)
var getFileModificationTimeAsync = (filePath) => (o) =>
  filePath.stat(o).then(
    (r) => r.mtimeMs,
    () => null,
  );
//@ chunk-wyqg6m3h.js:51489-51587 placement
function paneToggleOf(e) {
  let o = e.columns !== null && e.columns < OPEN_MIN_COLUMNS;
  return e.isOpen ? "close" : o ? "too-narrow" : "open";
}
//@ chunk-wyqg6m3h.js:51587-51631 placement
var BASE_OUTCOMES = ["merge-base", "head-is-base", "none"];
//@ chunk-wyqg6m3h.js:51631-51797 placement
var FEATURES = {
  read: "repl_diff_read",
  tabSwitch: "repl_tab_switch",
  baseSwitch: "repl_diff_base_switch",
  baseResolve: "diff_base_resolve",
  selectionAttach: "diff_selection_attach",
};
//@ chunk-wyqg6m3h.js:51797-51848 placement
function safely(e) {
  try {
    e().catch(() => {
      return;
    });
  } catch {}
}
//@ chunk-wyqg6m3h.js:51848-51878 placement
var SHOWN_TRIGGERS = ["auto_open", "manual"];
//@ chunk-wyqg6m3h.js:51878-51936 placement
var WIDTH_BUCKETS = ["under_110", "110_to_143", "144_to_199", "200_plus"];
//@ chunk-wyqg6m3h.js:51936-52198 placement
var recorderOf = (e) => ({
  mark: (o, r) => safely(() => e.mark({ feature: o, ...r })),
  shown: (o, r) =>
    safely(() =>
      e.log({
        event: "tengu_repl_diff_panel_shown",
        props: {
          trigger: { value: o, of: SHOWN_TRIGGERS },
          terminal_width_bucket: { value: r, of: WIDTH_BUCKETS },
        },
      }),
    ),
  asked: () => safely(() => e.mark({ feature: FEATURES.selectionAttach, kind: "ok" })),
});
//@ chunk-wyqg6m3h.js:52198-52222 placement
var TABS = ["diff", "convo"];
//@ chunk-wyqg6m3h.js:52222-52302 placement
function widthBucketOf(e) {
  let [o, r, s, n] = WIDTH_BUCKETS,
    a = e ?? 0,
    i = a < OPEN_MIN_COLUMNS,
    p = a < AUTO_OPEN_MIN_COLUMNS,
    l = a < WIDEST_BUCKET_COLUMNS;
  return i ? o : p ? r : l ? s : n;
}
//@ chunk-wyqg6m3h.js:52302-52405 placement
function refreshRestOf(e, o) {
  let min = Math.min(e, SLOW_REFRESH_REST_MAX_MS),
    s = o > 0 ? Math.min(TIMED_OUT_REST_MS * 2 ** (o - 1), TIMED_OUT_REST_MAX_MS) : 0,
    max = Math.max(min, s);
  return max > REFRESH_DEBOUNCE_MS ? max : 0;
}
/**
 * 窗格打开结果：placed / awaited（暂无界面）/ withdrawn。
 */
//@ chunk-wyqg6m3h.js:52405-52554 placement
function classifyPanePlacement(e) {
  if (!(isRecord(e) && e.isPlaced === !1)) return "placed";
  return typeof e.reason === "string" && e.reason.startsWith("no-surface") ? "awaited" : "withdrawn";
}
//@ chunk-wyqg6m3h.js:52554-64097 placement
function register(e) {
  let o = null,
    r = null,
    s = null,
    n = 0,
    a = !1,
    i = null,
    p = null,
    l = !1,
    y = !1,
    d = !1,
    T = 0,
    w = !1,
    R = null,
    O = null,
    _ = null,
    E = null,
    A = !1,
    k = !1,
    U = !1,
    I = 0,
    me = null,
    resolved = Promise.resolve(),
    Me = 0,
    ye = 0,
    he = null,
    Oe = null,
    ge = new Set(),
    z = { toplevel: "", headKey: "" },
    C = { cwd: "", isEmpty: !1, epoch: 0 },
    u = INITIAL_MODEL,
    M = new Map(),
    D = new Set(),
    Y = (f) => o ?? f,
    ze = () => a && i === null,
    Qt = (f) => ({
      run: (m, g) => Y(f).run(m, C.cwd === "" ? g : { cwd: C.cwd, ...g }),
      readFile: (m) => Y(f).readFile(m),
      mtimeOf: (m) => getFileModificationTimeAsync(Y(f))(m),
      entryKindsOf: (m) => entryKindsOf(Y(f))(m),
      nowMs: () => Y(f).now(),
      sessionStartMsOf: () => n,
      onBranchBase: (m) => {
        let c =
          m.kind === "error"
            ? { kind: "sad", reason: m.reason }
            : { kind: "ok", props: { outcome: { value: m.kind, of: BASE_OUTCOMES } } };
        if (!D.has(c.kind)) (D.add(c.kind), recorderOf(Y(f)).mark(FEATURES.baseResolve, c));
      },
    });
  function wt(f) {
    if (r || C.isEmpty) return Promise.resolve(!0);
    return (
      (s ??= ci(f).finally(() => {
        s = null;
      })),
      s
    );
  }
  async function ci(f) {
    let m = { isAnswered: !0 },
      g = Qt(f),
      { epoch: epoch } = C,
      S = await backendOf(
        {
          ...g,
          run: (L, ee) =>
            g.run(L, ee).catch((j) => {
              throw ((m.isAnswered &&= L[0] !== "git" || !/\baborted\b/.test(messageOf(j))), j);
            }),
        },
        INSTALLED_BACKEND_PROBES,
      );
    if (epoch !== C.epoch) return !1;
    if (((r ??= S), (C.isEmpty = r === null && m.isAnswered), !S || r !== S))
      return m.isAnswered || r !== null;
    yi(f, S);
    let b = baseModeOf(
        await f.storeGet(baseStoreKeyOf(S.repository.toplevel)).catch(() => {
          return;
        }),
      ),
      N = b && S.baseModes.includes(b) ? b : null;
    return ((u = { ...u, words: S.words, baseModes: S.baseModes, ...(N && { requestedMode: N }) }), !0);
  }
  function ui() {
    ((r = null),
      (C.isEmpty = !1),
      (C.epoch += 1),
      (z.toplevel = ""),
      (z.headKey = ""),
      M.get("poll")?.cancel(),
      M.delete("poll"),
      M.get("rest")?.cancel(),
      M.delete("rest"),
      (I = 0),
      (k = !1),
      (U = !1),
      M.get("refresh")?.cancel(),
      M.delete("refresh"));
  }
  function Jt() {
    return { id: PANE_ID, title: PANE_TITLE, closeOnEscape: !0, rows: dialogRowsOf(u) };
  }
  function rs(f) {
    let m = dialogRowsOf(u);
    if (a && u.isFullscreen === !1 && m !== p)
      ((p = m),
        f.openPane(Jt()).catch(() => {
          return;
        }));
  }
  function K(f) {
    if ((rs(f), M.has("redraw"))) return;
    M.set(
      "redraw",
      f.after(REDRAW_COALESCE_MS, () => {
        (M.delete("redraw"), f.invalidate());
      }),
    );
  }
  async function De(f) {
    let { data: m } = u,
      g = r;
    if (!m || !g) return ((he = null), (Oe = null), ge.clear(), (u = { ...u, bodies: NO_BODIES }), !1);
    let c = ss(m),
      S = m.baseRef !== Oe;
    if (c !== he) ((he = c), ge.clear());
    if (S) ((Oe = m.baseRef), (u = { ...u, bodies: NO_BODIES }), K(f));
    return xi(f, g, m);
  }
  let ss = (f) => `${Me}|${f.baseRef}`;
  async function xi(f, m, g) {
    let c = ss(g),
      filtered = drawnFilesOf(u).filter((L) => !ge.has(L.path));
    for (let L of filtered) ge.add(L.path);
    let hunks = await m.fetchHunks(g, filtered);
    if (he === c && hunks.size > 0) ((u = { ...u, bodies: new Map([...u.bodies, ...hunks]) }), K(f));
    return [...hunks.values()].includes(null);
  }
  function ns() {
    let f = r;
    if (!f || z.headKey !== "") return;
    f.headKeyOf()
      .catch(() => "")
      .then((m) => {
        if (r === f && z.headKey === "") z.headKey = m;
      });
  }
  function yi(f, m) {
    let g = () => m.headKeyOf().catch(() => "");
    if (z.toplevel === m.repository.toplevel) return;
    (M.get("poll")?.cancel(),
      (z.toplevel = m.repository.toplevel),
      (z.headKey = ""),
      M.set(
        "poll",
        f.every(HEAD_POLL_MS, () => {
          if (!ze()) return;
          if (k && !A) eo(f);
          g().then((c) => {
            let S = z.headKey !== "" && c !== z.headKey;
            if (((z.headKey = c), S)) to(f);
          });
        }),
      ));
  }
  async function Le(f, m = !1) {
    if (A || (M.has("rest") && !m)) {
      if (((k = !0), (U ||= m), !A)) eo(f);
      return;
    }
    A = !0;
    let c = () => {
      return;
    };
    ((resolved = new Promise((q) => {
      c = q;
    })),
      (k = !1),
      (U = !1),
      M.get("refresh")?.cancel(),
      M.delete("refresh"));
    let S = recorderOf(f),
      b = r,
      { epoch: epoch } = C,
      L = await f.now().catch(() => null),
      ee = null,
      j = null,
      Ve = async () => ({
        outcome: b ? await b.fetchDiff(u.requestedMode) : { kind: "no-repository" },
        endedMs: await f.now().catch(() => null),
      });
    try {
      u = { ...u, isLoading: u.data === null };
      let [q, oe] = await Promise.all([Ve(), f.messages().catch(() => [])]),
        { outcome: outcome } = q;
      switch (
        ((j = q.endedMs),
        (u = afterFetch(u, { outcome: outcome, messages: oe })),
        (ee = outcome.kind),
        outcome.kind)
      ) {
        case "no-repository":
          break;
        case "unavailable":
          S.mark(FEATURES.read, { kind: "sad", reason: "git_diff_failed" });
          break;
        case "data":
          Me += 1;
          break;
      }
      let Ei = await De(f);
      if (outcome.kind === "data")
        S.mark(FEATURES.read, Ei ? { kind: "sad", reason: "git_hunks_failed" } : { kind: "ok" });
    } catch (error) {
      throw (S.mark(FEATURES.read, { kind: "sad", reason: "git_diff_threw" }), error);
    } finally {
      let q = await f.now().catch(() => null),
        oe = j ?? q,
        Se = L === null || oe === null ? 0 : oe - L;
      if (((A = !1), c(), epoch === C.epoch)) hi(f, Se, ee, q ?? j);
      (K(f), fs(f));
    }
  }
  function hi(f, m, g, c) {
    ((I = g !== "data" && m >= GIT_TIMEOUT_MS ? I + 1 : 0), M.get("rest")?.cancel(), M.delete("rest"));
    let b = refreshRestOf(m, I);
    if (b === 0) {
      as(f);
      return;
    }
    let after = f.after(b, () => {
      if (M.get("rest") === after) is(f);
    });
    (M.set("rest", after), (me = c === null ? null : c + b));
  }
  function is(f) {
    (M.delete("rest"), fs(f), as(f));
  }
  function as(f) {
    if (d)
      ((d = !1),
        Ye(f).catch(() => {
          return;
        }));
  }
  async function eo(f) {
    let m = M.get("rest"),
      g = me,
      c = await f.now().catch(() => null);
    if (m !== void 0 && M.get("rest") === m && g !== null && c !== null && c >= g) is(f);
  }
  function fs(f) {
    if (!k || A) return;
    let m = U;
    if (M.has("rest") && !m && a) return;
    if (((k = !1), (U = !1), m)) Le(f, !0);
    else if (a) to(f);
  }
  function to(f) {
    M.get("refresh")?.cancel();
    let after = f.after(REFRESH_DEBOUNCE_MS, () => {
      if (M.get("refresh") !== after) return;
      (M.delete("refresh"), Le(f));
    });
    M.set("refresh", after);
  }
  async function ps(f, m) {
    let g = await f.sessionId().catch(() => null);
    if (g !== null && g !== O) ((O = g), recorderOf(f).shown(m, widthBucketOf(R)));
  }
  async function ms(f, m) {
    (await ps(f, m), await wt(f), ns(), Le(f, !0));
  }
  async function ls(f, m, g = T) {
    let c = m === "auto_open",
      epoch = C.epoch;
    while (c && A) await resolved;
    let b = a || C.epoch !== epoch || T !== g;
    if (c && b) return "withdrawn";
    let N = u.isFullscreen === !1;
    ((u = { ...u, selectedPath: null, dialogView: "list", place: { ...u.place, top: 0, listStart: 0 } }),
      (p = N ? dialogRowsOf(u) : null));
    let L = ye,
      ee = Me;
    if (!N)
      await Le(f, !0).catch(() => {
        return;
      });
    let { data: j } = u,
      Ve =
        Me !== ee &&
        C.epoch === epoch &&
        !a &&
        T === g &&
        j !== null &&
        headerTotalsOf(j, partitionOf(j.files, u.isNoiseShown ? "shown" : "hidden")).filesCount > 0;
    if (c && !Ve) return "withdrawn";
    let openPane = await f.openPane(N ? { ...Jt(), focus: !0 } : { id: PANE_ID, title: PANE_TITLE }),
      oe = classifyPanePlacement(openPane);
    if (oe === "withdrawn")
      return (
        await f.closePane({ id: PANE_ID }).catch(() => {
          return;
        }),
        oe
      );
    if (((a = !0), ns(), oe === "awaited")) i = m;
    else await ps(f, m);
    if (N || ye !== L) Le(f, !0);
    return oe;
  }
  async function ds(f) {
    (await f.closePane({ id: PANE_ID }), (a = !1), (i = null));
  }
  function cs(f, m) {
    recorderOf(f).mark(FEATURES.tabSwitch, { kind: "ok", props: { tab: { value: m, of: TABS } } });
  }
  async function Ye(f) {
    let m = () => a || l;
    if (m()) return;
    if (y && M.has("rest")) {
      ((d = !0), eo(f));
      return;
    }
    d = !1;
    let g = T,
      storeGet = await f.storeGet(STORE_OPEN_KEY),
      b = storeGet === !0 ? OPEN_MIN_COLUMNS : AUTO_OPEN_MIN_COLUMNS;
    if (!(storeGet !== !1 && u.isFullscreen === !0 && R !== null && R >= b) || m()) return;
    if (!(await f.isCheckpointing().catch(() => !0)) || m()) return;
    if ((await wt(f), !r || m())) return;
    let ee = ye,
      { epoch: epoch } = C;
    l = !0;
    let Ve = await ls(f, "auto_open", g).catch(() => "withdrawn");
    if (C.epoch !== epoch) return;
    if (((l = Ve !== "withdrawn"), (y = !l), !l && ye !== ee)) await Ye(f);
  }
  async function us(f) {
    if (((w = turnDiffsOf(await f.messages().catch(() => [])).length > 0), w)) await Ye(f);
  }
  function Rt(f) {
    ((_ = null), (u = { ...u, armedPath: null }), f.status(void 0));
  }
  let Oi = (f) => ({
    selectFile: (m) => {
      let g = u.placement === "dock";
      ((u = {
        ...u,
        selectedPath: m,
        dialogView: g ? u.dialogView : "detail",
        place: g ? placeAtFile(u, m) : u.place,
      }),
        De(f).catch(() => {
          return;
        }),
        K(f));
    },
    scrollList: (m) => {
      ((u = { ...u, place: listScrolledBy(u, m) }), K(f));
    },
    toggleNoise: () => {
      ((u = { ...u, isNoiseShown: !u.isNoiseShown }), De(f), K(f));
    },
    togglePreSession: () => {
      ((u = { ...u, isPreSessionShown: !u.isPreSessionShown }), De(f), K(f));
    },
    cycleBase: () => {
      let { baseModes: baseModes, requestedMode: requestedMode } = u,
        c = baseModes[(baseModes.indexOf(requestedMode) + 1) % baseModes.length] ?? requestedMode;
      if (c === requestedMode) return;
      ((u = { ...u, requestedMode: c }),
        recorderOf(f).mark(FEATURES.baseSwitch, {
          kind: "ok",
          props: { mode: { value: c, of: u.baseModes } },
        }));
      let S = u.data?.repository.toplevel;
      if (S !== void 0)
        f.storeSet(baseStoreKeyOf(S), c).catch(() => {
          return;
        });
      (Le(f, !0), K(f));
    },
    chooseSource: (m) => {
      let g = Number(m),
        S = m !== "current" && Number.isInteger(g) ? { kind: "turn", index: g } : { kind: "current" };
      ((u = { ...u, source: S, selectedPath: null, dialogView: "list" }), K(f));
    },
    toggleAsk: (m) => {
      if (_?.path === m) {
        (Rt(f), K(f));
        return;
      }
      gi(f, m);
    },
  });
  function gi(f, m) {
    ((_ = armedAskOf(
      m,
      pickedTurnOf(u)?.files.find((g) => g.path === m)?.hunks ?? u.bodies.get(m)?.hunks ?? [],
    )),
      (u = { ...u, armedPath: m }),
      f.status(`${sanitizeName(m)} rides your next prompt (press ` + "asked \u2713 to drop it)"),
      K(f));
  }
  async function xs(f) {
    let m = await f.startedAt().catch(() => {
      return;
    });
    return typeof m === "number" ? m : null;
  }
  async function Si(f, m) {
    ((n = (await xs(f)) ?? (await f.now())), (C.cwd = m));
    try {
      (await f.registerCommand(COMMAND_SPEC), (o = f));
    } catch (error) {
      let c = messageOf(error);
      if (!BUILTIN_HOLDS_PATTERN.test(c)) f.uiLog(registerFailedTextOf(sanitizeName(c)));
    }
  }
  (e("session.start", async (f, m, g) => {
    if (
      (await Si(
        {
          now: () => f.clock.now(),
          after: (c, S) => f.clock.after(c, S),
          every: (c, S) => f.clock.every(c, S),
          run: (c, S) => f.process.run(c, S),
          stat: (c) => f.fs.stat(c),
          listDir: (c) => f.fs.list(c),
          readFile: (c) => f.fs.read(c),
          storeGet: (c) => f.store.get(c),
          storeSet: (c, S) => f.store.set(c, S),
          isCheckpointing: async () =>
            isEnvTruthy(await f.settings.read(), await f.env.get("CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING")),
          messages: () => f.session.messages(),
          invalidate: () => f.ui.invalidate("ui.render"),
          status: (c) => f.ui.status(c),
          uiLog: (c) => f.ui.log(c),
          openPane: (c) => f.ui.open(c),
          closePane: (c) => f.ui.close(c),
          registerCommand: (c) => f.command.register(c),
          sessionId: () => f.session.id(),
          startedAt: () => f.session.usage().then((c) => (isRecord(c) ? c.startedAt : void 0)),
          mark: (c) => f.telemetry.mark(c),
          log: (c) => f.telemetry.log(c),
        },
        m.cwd,
      ),
      o)
    )
      us(o).catch(() => {
        return;
      });
    return g(m);
  }),
    e("ui.render", { component: "PromptHint" }, (f, m, g) => {
      if (isOnPaneSurface(m)) {
        let { viewport: viewport } = m,
          S = R === null && viewport?.columns !== void 0;
        if (
          ((R = viewport?.columns ?? R),
          (u = { ...u, isFullscreen: viewport?.isFullscreen ?? u.isFullscreen }),
          S && w && o)
        )
          Ye(o).catch(() => {
            return;
          });
      }
      return g(m);
    }),
    e("ui.render", { component: "Pane" }, async (f, m, g) => {
      if (m.requestId !== PANE_ID || !o || !isOnPaneSurface(m)) return g(m);
      let { Box: Box, Text: Text, Button: Button, Select: Select, Code: Code } = await f.ui.resolve(m);
      if (((R = m.viewport?.columns ?? R), i !== null)) {
        let j = i;
        ((i = null),
          ms(o, j).catch(() => {
            return;
          }));
      }
      let ee = m.props.placement !== u.placement;
      if (
        ((u = {
          ...u,
          placement: m.props.placement,
          place: {
            ...u.place,
            columns: Math.max(1, m.props.bodyColumns - PANE_RIGHT_PAD_COLUMNS),
            rows: m.props.scroll.bodyRows,
          },
        }),
        ee)
      )
        De(o).catch(() => {
          return;
        });
      return paneView(
        {
          ui: { Box: Box, Text: Text, Button: Button, Select: Select, Code: Code },
          actions: Oi(o),
          columns: m.props.bodyColumns,
          rows: m.props.scroll.bodyRows,
        },
        u,
        { placement: m.props.placement, terminalColumns: R },
      );
    }),
    e("command.run", { command: "diff" }, async (f, m, g) => {
      if (!o) return g(m);
      let c = (await wt(o)) || (await wt(o));
      if (!r) return { text: c ? NOT_IN_REPOSITORY_TEXT : GIT_UNANSWERED_TEXT };
      let { isFullscreen: isFullscreen } = m.presentation;
      ((R = m.presentation.columns), (u = { ...u, isFullscreen: isFullscreen }));
      let b = paneToggleOf({ isOpen: a, columns: isFullscreen ? R : null });
      if (b === "too-narrow") return { text: RESIZE_TERMINAL_TEXT };
      let N = b === "open";
      if (!N) T += 1;
      let L = N ? await ls(o, "manual") : await ds(o).then(() => "placed");
      if (L === "withdrawn") return { text: RESIZE_TERMINAL_TEXT };
      if (L === "awaited") return { text: AWAITS_SURFACE_TEXT };
      if (!isFullscreen) return N ? {} : { text: DIALOG_DISMISSED_TEXT };
      return (
        cs(o, N ? "diff" : "convo"),
        await o.storeSet(STORE_OPEN_KEY, N).catch(() => {
          return;
        }),
        { text: N ? PANEL_SHOWN_TEXT : PANEL_HIDDEN_TEXT }
      );
    }),
    e("ui.close", { id: PANE_ID }, async (f, m, g) => {
      if (m.origin.kind === "person" && u.placement === "inline" && u.dialogView === "detail" && o)
        return (
          (u = { ...u, dialogView: "list" }),
          K(o),
          (p = dialogRowsOf(u)),
          o.openPane({ ...Jt(), focus: !0 }).catch(() => {
            return;
          }),
          { deny: "back to the file list" }
        );
      let S = await g(m),
        b = S.deny === void 0,
        N = b && m.origin.kind === "person";
      if (b) ((a = !1), (i = null));
      if (N) T += 1;
      let L = u.isFullscreen !== !1;
      if (N && o && L)
        (cs(o, "convo"),
          await o.storeSet(STORE_OPEN_KEY, !1).catch(() => {
            return;
          }));
      return S;
    }),
    e("ui.focus", { plugin: PLUGIN_NAMES }, (f, m, g) => {
      let S = u.placement === "inline" && u.dialogView === "list" && o ? dialogFocusOf(u, m.element) : null;
      if (S === "stay") return {};
      if (!S || !o) return g(m);
      return (
        (u = { ...u, selectedPath: S.selectedPath }),
        De(o).catch(() => {
          return;
        }),
        rs(o),
        o.invalidate(),
        g({ ...m, element: S.landing })
      );
    }),
    e("ui.scroll", { requestId: PANE_ID }, (f, m, g) => {
      if (!(m.origin.kind === "person" && u.placement === "dock") || !o) return g(m);
      let S = isWheelOverList(u, m);
      return ((u = { ...u, place: S ? listScrolledBy(u, m.by) : bodyScrolledBy(u, m) }), o.invalidate(), {});
    }),
    e("command.run", { command: ["clear", "resume"] }, async (f, m, g) => {
      let c = await g(m);
      if (!o) return c;
      let S = m.command === "resume",
        b = ze() && !S;
      if (a && S)
        await ds(o).catch(() => {
          return;
        });
      if (
        (ui(),
        (l = !1),
        (y = !1),
        (d = !1),
        (w = !1),
        (he = null),
        (Oe = null),
        ge.clear(),
        Rt(o),
        (u = afterNewSession(u)),
        (n = (await xs(o)) ?? (S ? n : await o.now())),
        b)
      )
        await ms(o, "manual");
      if (S)
        us(o).catch(() => {
          return;
        });
      return c;
    }));
  function Ti(f, m, g) {
    let any = CODE_EDITING_TOOLS.some((L) => L === m.tool),
      S = any && g !== void 0 && g.deny === void 0 && g.isError !== !0,
      b = any ? S : mayHaveWritten(g);
    if (b) ye += 1;
    if (b && ze()) to(f);
    if ((S && m.agentId === void 0) || (b && y))
      Ye(f).catch(() => {
        return;
      });
  }
  (e("tool.call", { tool: [...CODE_EDITING_TOOLS, ...SHELL_TOOLS] }, async (f, m, g) => {
    let c;
    try {
      return ((c = await g(m)), c);
    } finally {
      if (o) Ti(o, m, c);
    }
  }),
    e("prompt.submit", async (f, m, g) => {
      let c = _;
      if (!o || !c || E === c) return g(m);
      let S = m.context ?? [],
        b = fittedAskTextOf(c.text, PROMPT_CONTEXT_MAX_CHARS - S.reduce((N, L) => N + L.length, 0));
      if (b === void 0)
        return (
          Rt(o),
          o.status(`${sanitizeName(c.path)}'s diff did not fit in the prompt and was dropped`),
          K(o),
          g(m)
        );
      E = c;
      try {
        let N = await g({ ...m, context: [...S, b] });
        if (N.drop === void 0) {
          if ((recorderOf(o).asked(), _ === c)) (Rt(o), K(o));
        }
        return N;
      } finally {
        E = null;
      }
    }));
}
//@ chunk-wyqg6m3h.js:64097-64119 placement
var STORE_ID = `${CC_PLUGIN_DIFF}@${BUILTIN}`;

export {
  STORE_ID,
  BASE_OUTCOMES,
  FEATURES,
  FILE_FRAME_NODES,
  FOOT_ROWS,
  POINTER,
  SAFE_PATHSPEC_PATTERN,
  SHOWN_TRIGGERS,
  TABS,
  WIDTH_BUCKETS,
  bodyEntryOf,
  bodyLayoutOf,
  bodyScrolledBy,
  detailModelOf,
  detailView,
  dialogEntriesOf,
  dialogFileRow,
  dialogFocusOf,
  dialogPane,
  dialogRowsOf,
  dialogWindowOf,
  dimNote,
  divider,
  dockPlanOf,
  drawWindow,
  drawnFilesOf,
  entryKindsOf,
  fileKeyOf,
  fileRow,
  headerView,
  hunkWindowOf,
  insetOf,
  isEnvTruthy,
  isOnPaneSurface,
  isWheelOverList,
  legendRow,
  listBlockOf,
  listBodyOf,
  listEdgeButton,
  listRow,
  listScrolledBy,
  messageOf,
  messagePaneOf,
  getFileModificationTimeAsync,
  nameRow,
  paneToggleOf,
  paneView,
  placeAtFile,
  placeholderOf,
  preludeOf,
  present,
  recorderOf,
  refreshRestOf,
  register,
  safely,
  segmentsOf,
  sidebarPane,
  sourcePicker,
  statTextOf,
  titleRow,
  todoBar,
  toggleRow,
  turnEntryOf,
  widthBucketOf,
};
