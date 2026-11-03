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
  let { Box, Button } = e.ui;
  return h(
    Box,
    {
      flexDirection: "row",
    },
    h(
      Button,
      {
        key: o.key,
        plain: true,
        dimColor: o.isDim,
        ...(o.isAutoFocus
          ? {
              autoFocus: true,
            }
          : {}),
        onPress: o.onPress,
      },
      o.label,
    ),
    h(Box, {
      flexGrow: 1,
    }),
    r,
  );
}
//@ chunk-wyqg6m3h.js:37057-37073 placement
var POINTER = "\u276F";
//@ chunk-wyqg6m3h.js:37073-37357 placement
function dialogFileRow(e, o, onPress) {
  let { Text } = e.ui;
  let max = Math.max(DIALOG_PATH_FLOOR, e.columns - DIALOG_PATH_RESERVE);
  let a = o.isSelected ? POINTER : " ";
  let i = truncateStart(sanitizeName(o.displayPath), max);
  let p = h(
    Text,
    {
      dimColor: true,
      italic: true,
    },
    o.note ?? "",
  );
  let y = o.note !== null ? p : diffStat(e, o.added, o.removed);
  return listRow(
    e,
    {
      key: o.key,
      label: `${a} ${i}`,
      onPress,
      isDim: false,
      isAutoFocus: o.isSelected,
    },
    y,
  );
}
//@ chunk-wyqg6m3h.js:37357-37438 placement
function dimNote(e, o) {
  let { Text } = e.ui;
  return h(
    Text,
    {
      dimColor: true,
      wrap: "truncate-end",
    },
    o,
  );
}
//@ chunk-wyqg6m3h.js:37438-37555 placement
function divider(e) {
  let { Text } = e.ui;
  return h(
    Text,
    {
      dimColor: true,
      wrap: "truncate-end",
    },
    "\u2500".repeat(Math.max(1, e.columns)),
  );
}
//@ chunk-wyqg6m3h.js:37555-37587 placement = _temp2 (1)
var fileKeyOf = (url) => `file:${sanitizeName(url.path)}`;
//@ chunk-wyqg6m3h.js:37587-37650 placement
var statTextOf = (added, removed) =>
  keptOf([added > 0 ? `+${added}` : null, removed > 0 ? `-${removed}` : null]).join(" ");
//@ chunk-wyqg6m3h.js:37650-37856 placement
function fileRow(e, o, onPress) {
  let label = padEnd(
    truncateStart(sanitizeName(o.displayPath), Math.max(e.columns - STAT_CELLS, PATH_FLOOR)),
    e.columns - statTextOf(o.added, o.removed).length,
  );
  return listRow(
    e,
    {
      key: o.key,
      label,
      onPress,
      isDim: true,
      isAutoFocus: false,
    },
    diffStat(e, o.added, o.removed),
  );
}
//@ chunk-wyqg6m3h.js:37856-37873 placement
var present = (e) => keptOf(e);
//@ chunk-wyqg6m3h.js:37873-38109 placement
function headerView(e, o, r) {
  let { Box, Text } = e.ui;
  return h(
    Box,
    {
      flexDirection: "row",
      height: 1,
    },
    present([
      o &&
        ((i) =>
          h(
            Text,
            {
              wrap: "truncate-end",
            },
            h(
              Text,
              {
                bold: true,
              },
              plural(i.filesCount, "file"),
            ),
            " changed ",
            diffStat(e, i.linesAdded, i.linesRemoved),
          ))(o),
      h(Box, {
        flexGrow: 1,
      }),
      r,
    ]),
  );
}
//@ chunk-wyqg6m3h.js:38109-38313 placement
function legendRow(e, entry) {
  let { Box, Text } = e.ui;
  return h(
    Box,
    {
      flexDirection: "row",
    },
    [
      h(
        Text,
        {
          dimColor: true,
          wrap: "truncate-end",
        },
        truncateStart(sanitizeName(entry.displayPath), Math.max(e.columns - STAT_CELLS, PATH_FLOOR)),
      ),
      h(Box, {
        flexGrow: 1,
      }),
      diffStat(e, entry.added, entry.removed),
    ],
  );
}
//@ chunk-wyqg6m3h.js:38313-38504 placement
function listEdgeButton(e, o, r) {
  let { Button } = e.ui;
  let n = o === "list-up";
  return h(
    Button,
    {
      key: o,
      plain: true,
      dimColor: true,
      action: n ? "app:diffFileListUp" : "app:diffFileListDown",
      onPress: () => e.actions.scrollList(n ? -1 : 1),
    },
    r,
  );
}
//@ chunk-wyqg6m3h.js:38504-38940 placement
function nameRow(e, o) {
  let { Box, Text, Button } = e.ui;
  let filtered = [o.isUntracked ? "untracked" : null, o.isTruncated ? "truncated" : null].filter(
    (l) => l !== null,
  );
  let i = filtered.length === 0 ? "" : ` (${filtered.join(", ")})`;
  let p = h(
    Button,
    {
      key: askKeyOf(o.path),
      onPress: () => e.actions.toggleAsk(o.path),
    },
    o.isArmed ? "asked \u2713" : "ask",
  );
  return h(
    Box,
    {
      flexDirection: "row",
    },
    [
      h(
        Text,
        {
          bold: true,
          wrap: "truncate-start",
        },
        truncateStart(sanitizeName(o.displayPath), e.columns),
      ),
      h(
        Text,
        {
          dimColor: true,
        },
        i,
      ),
      h(Box, {
        flexGrow: 1,
      }),
      ...(o.isAskable ? [p] : []),
    ],
  );
}
//@ chunk-wyqg6m3h.js:38940-39251 placement
function sourcePicker(e, o) {
  let { Select } = e.ui;
  let { source, turns } = o;
  return turns.length > 0
    ? h(Select, {
        key: "source",
        label: "source",
        options: [
          {
            value: "current",
            label: "Current",
          },
          ...turns.map((turn) => ({
            value: String(turn.index),
            label: `T${turn.index}`,
          })),
        ],
        value: source.kind === "current" ? "current" : String(source.index),
        onSelect: (i) => e.actions.chooseSource(i),
      })
    : null;
}
//@ chunk-wyqg6m3h.js:39251-39392 placement
function titleRow(e, o) {
  let { Text } = e.ui;
  let s = o.subtitle !== "";
  return h(
    Text,
    {
      wrap: "truncate-end",
    },
    sanitizeName(o.title),
    h(
      Text,
      {
        dimColor: true,
      },
      s ? ` ${sanitizeName(o.subtitle)}` : "",
    ),
  );
}
//@ chunk-wyqg6m3h.js:39392-39748 placement
function todoBar(e, o) {
  let { todos } = o;
  if (todos.total === 0) return null;
  let { Box, Text } = e.ui;
  let max = Math.max(1, Math.min(TODO_BAR_CELLS, e.columns - TODO_BAR_RESERVE));
  let rounded = Math.round((todos.done / todos.total) * max);
  return h(
    Box,
    {
      flexDirection: "row",
      gap: 1,
      marginTop: 1,
    },
    h(
      Text,
      null,
      h(
        Text,
        {
          color: "success",
        },
        "\u2588".repeat(rounded),
      ),
      h(
        Text,
        {
          color: "inactive",
        },
        "\u2591".repeat(Math.max(0, max - rounded)),
      ),
    ),
    h(
      Text,
      {
        dimColor: true,
      },
      `${todos.done}/${todos.total}`,
    ),
  );
}
//@ chunk-wyqg6m3h.js:39748-39886 placement
function toggleRow(e, key, r) {
  let { Box, Button } = e.ui;
  return h(
    Box,
    {
      flexDirection: "row",
    },
    h(
      Button,
      {
        key,
        plain: true,
        dimColor: true,
        onPress: r.onPress,
      },
      r.label,
    ),
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
  if (e.body === undefined) return ["Loading diff\u2026"];
  if (e.body === null) return ["Diff unavailable"];
  let { isLarge, hunks } = e.body;
  let s = hunks.length === 0;
  let n = isLarge ? "Large file - diff exceeds 1 MB limit" : s ? "No diff content" : null;
  return n ? [n] : null;
}
//@ chunk-wyqg6m3h.js:40296-40840 placement
function detailView(e, o, r) {
  let { Box, Text, Code } = e.ui;
  let i = placeholderOf(o);
  let p = codeBlocksOf(i ? [] : (o.body?.hunks ?? []), {
    chars: r.chars - sanitizeName(o.displayPath).length,
    nodes: r.nodes - FILE_FRAME_NODES,
  });
  let l = o.body?.isTruncated === true || p.isTruncated;
  let path = sanitizeName(o.path).slice(-MAX_CODE_CHARS);
  let d = l
    ? [
        h(
          Text,
          {
            dimColor: true,
            italic: true,
          },
          "\u2026 diff truncated (exceeded 400 line limit)",
        ),
      ]
    : [];
  let mapped = (i ?? []).map((O) =>
    h(
      Text,
      {
        dimColor: true,
        italic: true,
        wrap: "wrap",
      },
      O,
    ),
  );
  let mapped_2 = p.sources.map((source) =>
    h(Code, {
      source,
      format: "diff",
      path,
    }),
  );
  return {
    element: h(
      Box,
      {
        flexDirection: "column",
      },
      [
        nameRow(e, {
          ...o,
          isTruncated: l,
          isAskable: i === null,
        }),
        divider(e),
        ...(i ? mapped : mapped_2),
        ...d,
      ],
    ),
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
  isUntracked: false,
  isBinary: false,
  body: {
    hunks: e.hunks,
    isTruncated: e.isTruncated,
    isLarge: false,
  },
});
//@ chunk-wyqg6m3h.js:41313-42573 placement
function segmentsOf(e, o) {
  let { earlier } = o;
  let { columns } = e.place;
  let n = o.message.length > 0;
  let a = e.isPreSessionShown && earlier.length > 0;
  let i = earlier.length > PRE_SESSION_BODY_CAP;
  let p = (E) =>
    String(
      Math.max(
        1,
        E.oldStart + countWhere(E.lines, (A) => !A.startsWith("+")) - 1,
        E.newStart + countWhere(E.lines, (A) => !A.startsWith("-")) - 1,
      ),
    ).length + GUTTER_CHROME;
  function l(E, A) {
    let max = Math.max(1, columns - p(A));
    let mapped = A.lines.map((line) =>
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
      rows: mapped.reduce((acc, me) => acc + me, 0),
    };
  }
  let y = (E) =>
    subHunksOf(
      {
        ...E,
        lines: E.lines.filter(isBodyLine).map(drawnLineOf),
      },
      MAX_CODE_CHARS,
    );
  function d(E) {
    let A = detailModelOf(E, e);
    let k = placeholderOf(A);
    let mapped = (E.body?.hunks ?? []).map(y);
    let I = E.body?.isTruncated === true || mapped.some((V) => V.isTruncated);
    let me = k
      ? k.map((text) => ({
          kind: "note",
          text,
        }))
      : mapped.flatMap((V) => V.hunks).map((V) => l(E, V));
    return [
      {
        kind: "rule",
        path: E.path,
      },
      {
        kind: "name",
        name: {
          ...A,
          isTruncated: I,
          isAskable: k === null,
        },
      },
      {
        kind: "rule",
        path: null,
      },
      ...me,
      ...(I
        ? [
            {
              kind: "footer",
            },
          ]
        : []),
    ];
  }
  let T = (E) => [
    ...d(E),
    {
      kind: "blank",
    },
  ];
  let w = () => [
    {
      kind: "blank",
    },
    ...o.message.map((E) => ({
      kind: "text",
      text: sanitizeName(E),
    })),
    {
      kind: "blank",
    },
  ];
  let R = {
    kind: "text",
    text: `diffs hidden above ${PRE_SESSION_BODY_CAP} files`,
  };
  let O = () => (i ? [R] : earlier.flatMap(d));
  let _ = () => [
    {
      kind: "blank",
    },
    ...earlier.map((entry) => ({
      kind: "legend",
      entry,
    })),
    ...O(),
  ];
  return [
    ...(n ? w() : o.rows.flatMap(T)),
    ...keptOf([o.earlierLabel]).map((label) => ({
      kind: "toggle",
      label,
    })),
    ...(a ? _() : []),
  ];
}
//@ chunk-wyqg6m3h.js:42573-43102 placement
function bodyLayoutOf(e, o) {
  let r = segmentsOf(e, o);
  let s = listWindowOf(e, o);
  let n = !o.turn && o.partition.noiseCount > 0;
  let a = o.message.length === 0;
  let i = a && (o.rows.length > 0 || n);
  let p = i
    ? s.shown.length +
      Number(s.above > 0) +
      Number(s.below > 0 || o.totals.notShown > 0) +
      Number(o.isUntrackedNoted) +
      Number(n) +
      2
    : Number(a);
  let l = 1 + Number(o.line !== null) + (e.todos.total > 0 ? 2 : 0);
  let y = new Map();
  let max = Math.max(0, e.place.rows - l - p);
  let T = 0;
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
function dialogFocusOf(e, element) {
  let r = dialogEntriesOf(e);
  let mapped = r.map((E) => E.path);
  let mapped_2 = r.map((E) => fileKeyOf(E));
  let index = mapped_2.indexOf(element ?? "");
  let max = Math.max(0, mapped.indexOf(e.selectedPath ?? ""));
  let p = dialogWindowOf(e, mapped);
  let l = Math.min(mapped.length, p + MAX_VISIBLE_FILES) - 1;
  let y = mapped[index] ?? null;
  let d =
    mapped_2[
      p +
        index -
        dialogWindowOf(
          {
            selectedPath: y,
          },
          mapped,
        )
    ];
  let T = max === 0 && index === l;
  let w = max === mapped.length - 1 && index === p;
  return l - p >= 2 && (w || T)
    ? "stay"
    : y !== null && d !== undefined
      ? {
          selectedPath: y,
          landing: d,
        }
      : null;
}
//@ chunk-wyqg6m3h.js:43679-43909 placement
function preludeOf(e, o) {
  let { Box } = e.ui;
  let s = o.data === null && !o.hasSettled;
  let n = h(Box, null, dimNote(e, NOT_IN_REPOSITORY_TEXT));
  let i = s
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
  let { Box, Text } = e.ui;
  let n = preludeOf(e, o);
  if (n) return n;
  let a = pickedTurnOf(o);
  let { data: i } = o;
  let p = dialogEntriesOf(o);
  let l = a ? turnTotalsOf(a) : (i?.stats ?? null);
  let y = o.source.kind === "turn";
  let d = p.length > MAX_VISIBLE_FILES;
  let found = p.find((D) => D.path === o.selectedPath);
  let w = found ?? p[0];
  let R = o.dialogView === "detail" && found !== undefined;
  let O = dialogWindowOf(
    o,
    p.map((D) => D.path),
  );
  let sliced = p.slice(O, O + MAX_VISIBLE_FILES);
  let E = dimNote(e, " ");
  let A = p.length - O - sliced.length;
  let k = !y && i !== null && i.stats.filesCount > 0 && p.length === 0;
  let U = y ? "No file changes in this turn" : k ? "Too many files to display details" : "No changes yet";
  let I = p.length > 0 ? null : U;
  let me =
    l &&
    h(
      Text,
      {
        dimColor: true,
        wrap: "truncate-end",
      },
      `${plural(l.filesCount, "file")} changed `,
      diffStat(e, l.linesAdded, l.linesRemoved),
    );
  let V = (D) => (D.isUntracked ? "untracked" : D.isBinary ? "Binary file" : null);
  let Me = (url) =>
    dialogFileRow(
      e,
      {
        key: fileKeyOf(url),
        path: url.path,
        displayPath: url.displayPath,
        added: url.added,
        removed: url.removed,
        note: V(url),
        isSelected: url === w,
      },
      () => e.actions.selectFile(url.path),
    );
  function ye(D, Y) {
    let ze = D === "up" ? "\u2191" : "\u2193";
    let replaced = plural(Y, "file").replace(" ", " more ");
    return dimNote(e, ` ${ze} ${replaced}`);
  }
  let he = (D, Y) => (Y > 0 ? ye(D, Y) : E);
  let Oe = (D, Y) => (d ? he(D, Y) : null);
  let ge = (D) => [detailView(e, detailModelOf(D, o), BODY_BUDGET).element];
  let z = present([Oe("up", O), ...sliced.map(Me), Oe("down", A)]);
  let C = R && found ? ge(found) : z;
  let u = I === null ? C : [dimNote(e, I)];
  let M = R
    ? "\u2191/\u2193 to scroll \xB7 Esc to back"
    : "\u2191/\u2193 to select \xB7 Enter to view \xB7 Esc to close";
  return h(
    Box,
    {
      flexDirection: "column",
    },
    present([
      titleRow(e, dialogTitleOf(o)),
      h(Box, {
        height: 1,
      }),
      me,
      sourcePicker(e, o),
      h(
        Box,
        {
          flexDirection: "column",
          marginTop: 1,
          marginBottom: 1,
        },
        u,
      ),
      dimNote(e, M),
    ]),
  );
}
//@ chunk-wyqg6m3h.js:45274-45635 placement
function dialogRowsOf(e) {
  let o = dialogEntriesOf(e);
  let r = pickedTurnOf(e) !== undefined || e.data !== null;
  let s = o.length > MAX_VISIBLE_FILES;
  let found = o.find((w) => w.path === e.selectedPath);
  let a = e.dialogView === "detail" && found !== undefined;
  let i = dialogWindowOf(
    e,
    o.map((w) => w.path),
  );
  let reduced = (found?.body?.hunks ?? []).reduce((acc, R) => acc + 1 + R.lines.length, 0);
  let min = Math.min(o.length - i, MAX_VISIBLE_FILES);
  let d = o.length === 0 ? 1 : min + (s ? 2 : 0);
  let T = a ? 2 + Math.max(1, reduced) : d;
  return 2 + Number(r) + Number(e.turns.length > 0) + 2 + T + 1;
}
//@ chunk-wyqg6m3h.js:45635-46046 placement
function listBodyOf(e) {
  let { data: o, partition, totals, empty } = e;
  let hint = empty?.hint ?? null;
  if (empty) return hint === null ? [] : [hint];
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
  let { Box, Text } = e.ui;
  let { top, controls, earlier, rest } = o;
  let flattened = o.message.flatMap((I) => wrappedLines(sanitizeName(I), e.columns));
  let mapped = flattened.map((I) =>
    h(
      Text,
      {
        dimColor: true,
      },
      I,
    ),
  );
  let d = controls === null ? [] : [controls];
  let T = earlier === null ? [] : [earlier];
  let R =
    d.length > 0 || T.length === 0
      ? d
      : [
          h(Box, {
            height: 1,
          }),
        ];
  let O = earlier === null ? 0 : FOOT_ROWS;
  let _ = e.rows - top.length - 1 - O;
  let floored = Math.floor((_ - flattened.length) / 2);
  if (!(rest.length === 0 && _ - floored - flattened.length >= d.length))
    return h(
      Box,
      {
        flexDirection: "column",
      },
      [
        ...top,
        h(Box, {
          height: 1,
        }),
        ...mapped,
        ...R,
        ...T,
        ...rest,
      ],
    );
  let k =
    floored > 0
      ? [
          h(Box, {
            height: floored,
          }),
        ]
      : [];
  let mapped_2 = T.map((I) =>
    h(
      Box,
      {
        flexDirection: "column",
        marginTop: 1,
        paddingBottom: 1,
      },
      I,
    ),
  );
  return h(
    Box,
    {
      flexDirection: "column",
      height: e.rows,
    },
    [
      ...top,
      h(Box, {
        height: 1,
      }),
      h(
        Box,
        {
          flexDirection: "column",
          height: _,
          alignItems: "center",
        },
        [...k, ...mapped, ...d],
      ),
      ...mapped_2,
    ],
  );
}
//@ chunk-wyqg6m3h.js:46746-47563 placement
function dockPlanOf(e) {
  let { data: o, requestedMode } = e;
  let s = pickedTurnOf(e);
  let n = e.isNoiseShown ? "shown" : "hidden";
  let a = partitionOf(o?.files ?? [], n);
  let i = e.isPreSessionShown ? "hide" : "show";
  let p = s ? turnTotalsOf(s) : o ? headerTotalsOf(o, a) : ZERO_TOTALS;
  let l = s ? null : emptyStateOf(e, p.filesCount);
  let y = s
    ? []
    : listBodyOf({
        data: o,
        partition: a,
        totals: p,
        empty: l,
      });
  let flattened = y.flatMap((k) => (typeof k === "string" ? [k] : []));
  let T = s ? s.files.length > 0 : flattened.length < y.length;
  let w = (k) => bodyEntryOf(k, e);
  let rows = s ? s.files.map(turnEntryOf) : T ? a.shown.map(w) : [];
  let O = s ? [] : a.preSession.map(w);
  let _ = O.length > 0;
  let E = o !== null && !o.isUnborn && (requestedMode !== "session" || o.mode !== "session");
  let A = s
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
    rows,
    earlier: O,
    earlierLabel: _ ? `+${plural(O.length, "file")} edited before this session (${i})` : null,
    notes: flattened,
    message: l ? [l.headline, ...flattened] : T ? [] : flattened,
    isUntrackedNoted: !s && o?.isUntrackedWithheld === true && l === null,
  };
}
//@ chunk-wyqg6m3h.js:47563-47734 placement
function hunkWindowOf(e, o) {
  let r = 0;
  let offset = 0;
  let n = 0;
  let a = 0;
  for (let p of e.lineRows) {
    if (r + p <= o.skip) offset += 1;
    else if (n < o.take) {
      n += p;
      a += 1;
    }
    r += p;
  }
  let i = adjustHunkLineNumbers(e.hunk, offset);
  return {
    ...i,
    lines: i.lines.slice(0, a),
  };
}
//@ chunk-wyqg6m3h.js:47734-47977 placement
function bodyScrolledBy(e, o) {
  let { visibleRows, maxTop } = bodyLayoutOf(e, dockPlanOf(e));
  let n = Math.abs(o.by);
  let a = n >= o.contentRows && o.contentRows > o.bodyRows;
  let i = !a && n >= o.bodyRows;
  let p = a ? maxTop : i ? Math.max(1, visibleRows) : n * WHEEL_ROWS;
  return {
    ...e.place,
    top: Math.max(0, Math.min(maxTop, e.place.top + Math.sign(o.by) * p)),
  };
}
//@ chunk-wyqg6m3h.js:47977-48829 placement
function drawWindow(e, o, top) {
  let { Box, Text, Code } = e.ui;
  let i = [];
  let p = o.visibleRows + SCROLL_MARGIN_ROWS;
  let max = Math.max(0, Math.min(top, o.maxTop));
  let onPress = e.actions.togglePreSession;
  let d = 0;
  let T = 0;
  let w = 0;
  function R(_, E) {
    let A = hunkSourceOf(hunkWindowOf(_, E));
    let path = sanitizeName(_.path);
    w += A.length;
    return w > MAX_BODY_CHARS
      ? h(
          Text,
          {
            dimColor: true,
            italic: true,
          },
          "\u2026",
        )
      : h(Code, {
          source: A,
          format: "diff",
          path,
        });
  }
  function O(segment, E) {
    switch (segment.kind) {
      case "rule":
        return divider(e);
      case "blank":
        return h(Box, {
          height: 1,
        });
      case "name":
        return nameRow(e, segment.name);
      case "hunk":
        return R(segment, E);
      case "note":
        return h(
          Text,
          {
            dimColor: true,
            italic: true,
            wrap: "wrap",
          },
          segment.text,
        );
      case "footer":
        return h(
          Text,
          {
            dimColor: true,
            italic: true,
          },
          "\u2026 diff truncated (exceeded 400 line limit)",
        );
      case "text":
        return dimNote(e, segment.text);
      case "toggle":
        return toggleRow(e, "presession", {
          ...segment,
          onPress,
        });
      case "legend":
        return legendRow(e, segment.entry);
    }
  }
  for (let segment of o.segments) {
    let E = segmentRowsOf(segment);
    if (d + E > max && T < p) {
      let max_2 = Math.max(0, max - d);
      i.push(
        O(segment, {
          skip: max_2,
          take: p - T,
        }),
      );
      T += E - max_2;
    }
    d += E;
  }
  return i;
}
//@ chunk-wyqg6m3h.js:48829-48944 placement
function isWheelOverList(e, o) {
  let r = dockPlanOf(e);
  let { listTop, listEnd } = bodyLayoutOf(e, r);
  let a = o.pointer?.row ?? -1;
  return a >= listTop && a < listEnd && r.rows.length > MAX_SUMMARY_ROWS;
}
//@ chunk-wyqg6m3h.js:48944-49605 placement
function listBlockOf(e, o, r) {
  let { shown, above, below } = listWindowOf(o, r);
  let { noiseCount } = r.partition;
  let { notShown } = r.totals;
  let l = !r.turn && noiseCount > 0;
  let y = above > 0;
  let d = below > 0;
  let T = notShown > 0;
  let w = o.isNoiseShown ? "hide" : "show";
  let joined = keptOf([d ? `${below} ${MORE_BELOW_TEXT}` : null, T ? `${notShown} not shown` : null]).join(
    " \xB7 ",
  );
  let O = (url) =>
    fileRow(
      e,
      {
        key: fileKeyOf(url),
        path: url.path,
        displayPath: url.displayPath,
        added: url.added,
        removed: url.removed,
        note: null,
        isSelected: false,
      },
      () => e.actions.selectFile(url.path),
    );
  let _ = y ? listEdgeButton(e, "list-up", `\u2191 ${above} more above`) : null;
  let E = d ? listEdgeButton(e, "list-down", `\u2193 ${joined}`) : T ? dimNote(e, `\u2026 ${joined}`) : null;
  let A = l
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
  return {
    ...e.place,
    listStart: Math.max(0, Math.min(max, Math.min(e.place.listStart, max) + o)),
  };
}
//@ chunk-wyqg6m3h.js:49746-49816 placement
var placeAtFile = (e, o) => ({
  ...e.place,
  top: bodyLayoutOf(e, dockPlanOf(e)).tops.get(o) ?? e.place.top,
});
//@ chunk-wyqg6m3h.js:49816-49870 placement
var insetOf = (e) => ({
  ...e,
  columns: Math.max(1, e.columns - PANE_RIGHT_PAD_COLUMNS),
});
//@ chunk-wyqg6m3h.js:49870-50611 placement
function sidebarPane(e, o) {
  let { Box, Button } = e.ui;
  let n = preludeOf(e, o);
  if (n) return n;
  let a = dockPlanOf(o);
  let i = a.message.length === 0;
  let p = !i && !(o.isPreSessionShown && a.earlier.length > 0);
  let l = listBlockOf(e, o, a);
  let onPress = e.actions.togglePreSession;
  let d = l.length > 0;
  let T = present([
    headerView(
      e,
      a.empty ? null : a.totals,
      h(
        Box,
        {
          flexDirection: "row",
        },
        present([
          sourcePicker(e, o),
          h(
            Button,
            {
              key: "base",
              plain: true,
              action: "app:cycleDiffBase",
              onPress: e.actions.cycleBase,
            },
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
        keptOf([a.earlierLabel]).map((label) =>
          toggleRow(e, "presession", {
            label,
            onPress,
          }),
        )[0] ?? null,
      rest: [],
    });
  let w = () =>
    d
      ? h(
          Box,
          {
            flexDirection: "column",
            marginTop: 1,
            marginBottom: 1,
          },
          l,
        )
      : h(Box, {
          height: 1,
        });
  return h(
    Box,
    {
      flexDirection: "column",
    },
    [...T, ...(i ? [w()] : []), ...drawWindow(e, bodyLayoutOf(o, a), o.place.top)],
  );
}
//@ chunk-wyqg6m3h.js:50611-50834 placement
function paneView(e, o, r) {
  let { Box } = e.ui;
  let n = r.placement === "dock";
  let a = o.isFullscreen !== false && r.terminalColumns !== null && r.terminalColumns < OPEN_MIN_COLUMNS;
  return n
    ? h(
        Box,
        {
          flexDirection: "column",
          paddingRight: PANE_RIGHT_PAD_COLUMNS,
        },
        sidebarPane(insetOf(e), o),
      )
    : a
      ? h(Box, null, dimNote(e, RESIZE_TERMINAL_TEXT))
      : dialogPane(e, o);
}
//@ chunk-wyqg6m3h.js:50834-51150 placement
function drawnFilesOf(e) {
  let files = e.data?.files ?? [];
  if (e.placement === "inline") {
    let n = pickedTurnOf(e) !== undefined;
    let mapped = dialogEntriesOf(e).map((l) => l.path);
    let i = dialogWindowOf(e, mapped);
    let sliced = mapped.slice(i, i + MAX_VISIBLE_FILES);
    return files.filter((file) => !n && sliced.includes(file.path));
  }
  let r = partitionOf(files, e.isNoiseShown ? "shown" : "hidden");
  let s = e.isPreSessionShown && r.preSession.length <= PRE_SESSION_BODY_CAP;
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
  e.fileCheckpointingEnabled !== false &&
  !["1", "true", "yes", "on"].includes((o ?? "").trim().toLowerCase());
//@ chunk-wyqg6m3h.js:51348-51381 placement
var isOnPaneSurface = (e) => e.surface !== "mobile";
//@ chunk-wyqg6m3h.js:51381-51432 placement
var messageOf = (error) => (error instanceof Error ? error.message : String(error));
//@ chunk-wyqg6m3h.js:51432-51489 placement = getFileModificationTimeAsync (1)
/**
 * 返回"取 mtime 或 null"的函数（柯里化）。
 */
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
  mark: (feature, r) =>
    safely(() =>
      e.mark({
        feature,
        ...r,
      }),
    ),
  shown: (value, value_2) =>
    safely(() =>
      e.log({
        event: "tengu_repl_diff_panel_shown",
        props: {
          trigger: {
            value,
            of: SHOWN_TRIGGERS,
          },
          terminal_width_bucket: {
            value: value_2,
            of: WIDTH_BUCKETS,
          },
        },
      }),
    ),
  asked: () =>
    safely(() =>
      e.mark({
        feature: FEATURES.selectionAttach,
        kind: "ok",
      }),
    ),
});
//@ chunk-wyqg6m3h.js:52198-52222 placement
var TABS = ["diff", "convo"];
//@ chunk-wyqg6m3h.js:52222-52302 placement
function widthBucketOf(e) {
  let [o, r, s, n] = WIDTH_BUCKETS;
  let a = e ?? 0;
  let i = a < OPEN_MIN_COLUMNS;
  let p = a < AUTO_OPEN_MIN_COLUMNS;
  let l = a < WIDEST_BUCKET_COLUMNS;
  return i ? o : p ? r : l ? s : n;
}
//@ chunk-wyqg6m3h.js:52302-52405 placement
function refreshRestOf(e, o) {
  let min = Math.min(e, SLOW_REFRESH_REST_MAX_MS);
  let s = o > 0 ? Math.min(TIMED_OUT_REST_MS * 2 ** (o - 1), TIMED_OUT_REST_MAX_MS) : 0;
  let max = Math.max(min, s);
  return max > REFRESH_DEBOUNCE_MS ? max : 0;
}
//@ chunk-wyqg6m3h.js:52405-52554 placement
/**
 * 窗格打开结果：placed / awaited（暂无界面）/ withdrawn。
 */
function classifyPanePlacement(e) {
  if (!(isRecord(e) && e.isPlaced === false)) return "placed";
  return typeof e.reason === "string" && e.reason.startsWith("no-surface") ? "awaited" : "withdrawn";
}
//@ chunk-wyqg6m3h.js:52554-64097 placement
function register(e) {
  let o = null;
  let r = null;
  let s = null;
  let n = 0;
  let a = false;
  let i = null;
  let p = null;
  let l = false;
  let y = false;
  let d = false;
  let T = 0;
  let w = false;
  let R = null;
  let O = null;
  let _ = null;
  let E = null;
  let A = false;
  let k = false;
  let U = false;
  let I = 0;
  let me = null;
  let resolved = Promise.resolve();
  let Me = 0;
  let ye = 0;
  let he = null;
  let Oe = null;
  let ge = new Set();
  let z = {
    toplevel: "",
    headKey: "",
  };
  let C = {
    cwd: "",
    isEmpty: false,
    epoch: 0,
  };
  let u = INITIAL_MODEL;
  let M = new Map();
  let D = new Set();
  let Y = (f) => o ?? f;
  let ze = () => a && i === null;
  let Qt = (f) => ({
    run: (m, g) =>
      Y(f).run(
        m,
        C.cwd === ""
          ? g
          : {
              cwd: C.cwd,
              ...g,
            },
      ),
    readFile: (m) => Y(f).readFile(m),
    mtimeOf: (m) => getFileModificationTimeAsync(Y(f))(m),
    entryKindsOf: (m) => entryKindsOf(Y(f))(m),
    nowMs: () => Y(f).now(),
    sessionStartMsOf: () => n,
    onBranchBase: (m) => {
      let c =
        m.kind === "error"
          ? {
              kind: "sad",
              reason: m.reason,
            }
          : {
              kind: "ok",
              props: {
                outcome: {
                  value: m.kind,
                  of: BASE_OUTCOMES,
                },
              },
            };
      if (!D.has(c.kind)) {
        D.add(c.kind);
        recorderOf(Y(f)).mark(FEATURES.baseResolve, c);
      }
    },
  });
  function wt(f) {
    if (r || C.isEmpty) return Promise.resolve(true);
    s ??= ci(f).finally(() => {
      s = null;
    });
    return s;
  }
  async function ci(f) {
    let m = {
      isAnswered: true,
    };
    let g = Qt(f);
    let { epoch } = C;
    let S = await backendOf(
      {
        ...g,
        run: (L, ee) =>
          g.run(L, ee).catch((error) => {
            m.isAnswered &&= L[0] !== "git" || !/\baborted\b/.test(messageOf(error));
            throw error;
          }),
      },
      INSTALLED_BACKEND_PROBES,
    );
    if (epoch !== C.epoch) return false;
    r ??= S;
    C.isEmpty = r === null && m.isAnswered;
    if (!S || r !== S) return m.isAnswered || r !== null;
    yi(f, S);
    let b = baseModeOf(
      await f.storeGet(baseStoreKeyOf(S.repository.toplevel)).catch(() => {
        return;
      }),
    );
    let N = b && S.baseModes.includes(b) ? b : null;
    u = {
      ...u,
      words: S.words,
      baseModes: S.baseModes,
      ...(N && {
        requestedMode: N,
      }),
    };
    return true;
  }
  function ui() {
    r = null;
    C.isEmpty = false;
    C.epoch += 1;
    z.toplevel = "";
    z.headKey = "";
    M.get("poll")?.cancel();
    M.delete("poll");
    M.get("rest")?.cancel();
    M.delete("rest");
    I = 0;
    k = false;
    U = false;
    M.get("refresh")?.cancel();
    M.delete("refresh");
  }
  function Jt() {
    return {
      id: PANE_ID,
      title: PANE_TITLE,
      closeOnEscape: true,
      rows: dialogRowsOf(u),
    };
  }
  function rs(f) {
    let m = dialogRowsOf(u);
    if (a && u.isFullscreen === false && m !== p) {
      p = m;
      f.openPane(Jt()).catch(() => {
        return;
      });
    }
  }
  function K(f) {
    rs(f);
    if (M.has("redraw")) return;
    M.set(
      "redraw",
      f.after(REDRAW_COALESCE_MS, () => {
        M.delete("redraw");
        f.invalidate();
      }),
    );
  }
  async function De(f) {
    let { data: m } = u;
    let g = r;
    if (!m || !g) {
      he = null;
      Oe = null;
      ge.clear();
      u = {
        ...u,
        bodies: NO_BODIES,
      };
      return false;
    }
    let c = ss(m);
    let S = m.baseRef !== Oe;
    if (c !== he) {
      he = c;
      ge.clear();
    }
    if (S) {
      Oe = m.baseRef;
      u = {
        ...u,
        bodies: NO_BODIES,
      };
      K(f);
    }
    return xi(f, g, m);
  }
  let ss = (f) => `${Me}|${f.baseRef}`;
  async function xi(f, m, g) {
    let c = ss(g);
    let filtered = drawnFilesOf(u).filter((L) => !ge.has(L.path));
    for (let L of filtered) ge.add(L.path);
    let hunks = await m.fetchHunks(g, filtered);
    if (he === c && hunks.size > 0) {
      u = {
        ...u,
        bodies: new Map([...u.bodies, ...hunks]),
      };
      K(f);
    }
    return [...hunks.values()].includes(null);
  }
  function ns() {
    let f = r;
    if (!f || z.headKey !== "") return;
    f.headKeyOf()
      .catch(() => "")
      .then((headKey) => {
        if (r === f && z.headKey === "") z.headKey = headKey;
      });
  }
  function yi(f, m) {
    let g = () => m.headKeyOf().catch(() => "");
    if (z.toplevel === m.repository.toplevel) return;
    M.get("poll")?.cancel();
    z.toplevel = m.repository.toplevel;
    z.headKey = "";
    M.set(
      "poll",
      f.every(HEAD_POLL_MS, () => {
        if (!ze()) return;
        if (k && !A) eo(f);
        g().then((c) => {
          let S = z.headKey !== "" && c !== z.headKey;
          z.headKey = c;
          if (S) to(f);
        });
      }),
    );
  }
  async function Le(f, m = false) {
    if (A || (M.has("rest") && !m)) {
      k = true;
      U ||= m;
      if (!A) eo(f);
      return;
    }
    A = true;
    let c = () => {
      return;
    };
    resolved = new Promise((resolve) => {
      c = resolve;
    });
    k = false;
    U = false;
    M.get("refresh")?.cancel();
    M.delete("refresh");
    let S = recorderOf(f);
    let b = r;
    let { epoch } = C;
    let L = await f.now().catch(() => null);
    let ee = null;
    let j = null;
    let Ve = async () => ({
      outcome: b
        ? await b.fetchDiff(u.requestedMode)
        : {
            kind: "no-repository",
          },
      endedMs: await f.now().catch(() => null),
    });
    try {
      u = {
        ...u,
        isLoading: u.data === null,
      };
      let [q, oe] = await Promise.all([Ve(), f.messages().catch(() => [])]);
      let { outcome } = q;
      switch (
        ((j = q.endedMs),
        (u = afterFetch(u, {
          outcome,
          messages: oe,
        })),
        (ee = outcome.kind),
        outcome.kind)
      ) {
        case "no-repository":
          break;
        case "unavailable":
          S.mark(FEATURES.read, {
            kind: "sad",
            reason: "git_diff_failed",
          });
          break;
        case "data":
          Me += 1;
          break;
      }
      let Ei = await De(f);
      if (outcome.kind === "data")
        S.mark(
          FEATURES.read,
          Ei
            ? {
                kind: "sad",
                reason: "git_hunks_failed",
              }
            : {
                kind: "ok",
              },
        );
    } catch (error) {
      S.mark(FEATURES.read, {
        kind: "sad",
        reason: "git_diff_threw",
      });
      throw error;
    } finally {
      let q = await f.now().catch(() => null);
      let oe = j ?? q;
      let Se = L === null || oe === null ? 0 : oe - L;
      A = false;
      c();
      if (epoch === C.epoch) hi(f, Se, ee, q ?? j);
      K(f);
      fs(f);
    }
  }
  function hi(f, m, g, c) {
    I = g !== "data" && m >= GIT_TIMEOUT_MS ? I + 1 : 0;
    M.get("rest")?.cancel();
    M.delete("rest");
    let b = refreshRestOf(m, I);
    if (b === 0) {
      as(f);
      return;
    }
    let N = f.after(b, () => {
      if (M.get("rest") === N) is(f);
    });
    M.set("rest", N);
    me = c === null ? null : c + b;
  }
  function is(f) {
    M.delete("rest");
    fs(f);
    as(f);
  }
  function as(f) {
    if (d) {
      d = false;
      Ye(f).catch(() => {
        return;
      });
    }
  }
  async function eo(f) {
    let m = M.get("rest");
    let g = me;
    let c = await f.now().catch(() => null);
    if (m !== undefined && M.get("rest") === m && g !== null && c !== null && c >= g) is(f);
  }
  function fs(f) {
    if (!k || A) return;
    let m = U;
    if (M.has("rest") && !m && a) return;
    k = false;
    U = false;
    if (m) Le(f, true);
    else if (a) to(f);
  }
  function to(f) {
    M.get("refresh")?.cancel();
    let m = f.after(REFRESH_DEBOUNCE_MS, () => {
      if (M.get("refresh") !== m) return;
      M.delete("refresh");
      Le(f);
    });
    M.set("refresh", m);
  }
  async function ps(f, m) {
    let g = await f.sessionId().catch(() => null);
    if (g !== null && g !== O) {
      O = g;
      recorderOf(f).shown(m, widthBucketOf(R));
    }
  }
  async function ms(f, m) {
    await ps(f, m);
    await wt(f);
    ns();
    Le(f, true);
  }
  async function ls(f, m, g = T) {
    let c = m === "auto_open";
    let epoch = C.epoch;
    while (c && A) await resolved;
    let b = a || C.epoch !== epoch || T !== g;
    if (c && b) return "withdrawn";
    let N = u.isFullscreen === false;
    u = {
      ...u,
      selectedPath: null,
      dialogView: "list",
      place: {
        ...u.place,
        top: 0,
        listStart: 0,
      },
    };
    p = N ? dialogRowsOf(u) : null;
    let L = ye;
    let ee = Me;
    if (!N)
      await Le(f, true).catch(() => {
        return;
      });
    let { data: j } = u;
    let Ve =
      Me !== ee &&
      C.epoch === epoch &&
      !a &&
      T === g &&
      j !== null &&
      headerTotalsOf(j, partitionOf(j.files, u.isNoiseShown ? "shown" : "hidden")).filesCount > 0;
    if (c && !Ve) return "withdrawn";
    let q = await f.openPane(
      N
        ? {
            ...Jt(),
            focus: true,
          }
        : {
            id: PANE_ID,
            title: PANE_TITLE,
          },
    );
    let oe = classifyPanePlacement(q);
    if (oe === "withdrawn") {
      await f
        .closePane({
          id: PANE_ID,
        })
        .catch(() => {
          return;
        });
      return oe;
    }
    a = true;
    ns();
    if (oe === "awaited") i = m;
    else await ps(f, m);
    if (N || ye !== L) Le(f, true);
    return oe;
  }
  async function ds(f) {
    await f.closePane({
      id: PANE_ID,
    });
    a = false;
    i = null;
  }
  function cs(f, value) {
    recorderOf(f).mark(FEATURES.tabSwitch, {
      kind: "ok",
      props: {
        tab: {
          value,
          of: TABS,
        },
      },
    });
  }
  async function Ye(f) {
    let m = () => a || l;
    if (m()) return;
    if (y && M.has("rest")) {
      d = true;
      eo(f);
      return;
    }
    d = false;
    let g = T;
    let c = await f.storeGet(STORE_OPEN_KEY);
    let b = c === true ? OPEN_MIN_COLUMNS : AUTO_OPEN_MIN_COLUMNS;
    if (!(c !== false && u.isFullscreen === true && R !== null && R >= b) || m()) return;
    if (!(await f.isCheckpointing().catch(() => true)) || m()) return;
    await wt(f);
    if (!r || m()) return;
    let ee = ye;
    let { epoch } = C;
    l = true;
    let Ve = await ls(f, "auto_open", g).catch(() => "withdrawn");
    if (C.epoch !== epoch) return;
    l = Ve !== "withdrawn";
    y = !l;
    if (!l && ye !== ee) await Ye(f);
  }
  async function us(f) {
    w = turnDiffsOf(await f.messages().catch(() => [])).length > 0;
    if (w) await Ye(f);
  }
  function Rt(f) {
    _ = null;
    u = {
      ...u,
      armedPath: null,
    };
    f.status(undefined);
  }
  let Oi = (f) => ({
    selectFile: (m) => {
      let g = u.placement === "dock";
      u = {
        ...u,
        selectedPath: m,
        dialogView: g ? u.dialogView : "detail",
        place: g ? placeAtFile(u, m) : u.place,
      };
      De(f).catch(() => {
        return;
      });
      K(f);
    },
    scrollList: (m) => {
      u = {
        ...u,
        place: listScrolledBy(u, m),
      };
      K(f);
    },
    toggleNoise: () => {
      u = {
        ...u,
        isNoiseShown: !u.isNoiseShown,
      };
      De(f);
      K(f);
    },
    togglePreSession: () => {
      u = {
        ...u,
        isPreSessionShown: !u.isPreSessionShown,
      };
      De(f);
      K(f);
    },
    cycleBase: () => {
      let { baseModes, requestedMode } = u;
      let c = baseModes[(baseModes.indexOf(requestedMode) + 1) % baseModes.length] ?? requestedMode;
      if (c === requestedMode) return;
      u = {
        ...u,
        requestedMode: c,
      };
      recorderOf(f).mark(FEATURES.baseSwitch, {
        kind: "ok",
        props: {
          mode: {
            value: c,
            of: u.baseModes,
          },
        },
      });
      let toplevel = u.data?.repository.toplevel;
      if (toplevel !== undefined)
        f.storeSet(baseStoreKeyOf(toplevel), c).catch(() => {
          return;
        });
      Le(f, true);
      K(f);
    },
    chooseSource: (m) => {
      let g = Number(m);
      let source =
        m !== "current" && Number.isInteger(g)
          ? {
              kind: "turn",
              index: g,
            }
          : {
              kind: "current",
            };
      u = {
        ...u,
        source,
        selectedPath: null,
        dialogView: "list",
      };
      K(f);
    },
    toggleAsk: (m) => {
      if (_?.path === m) {
        Rt(f);
        K(f);
        return;
      }
      gi(f, m);
    },
  });
  function gi(f, m) {
    _ = armedAskOf(
      m,
      pickedTurnOf(u)?.files.find((file) => file.path === m)?.hunks ?? u.bodies.get(m)?.hunks ?? [],
    );
    u = {
      ...u,
      armedPath: m,
    };
    f.status(`${sanitizeName(m)} rides your next prompt (press ` + "asked \u2713 to drop it)");
    K(f);
  }
  async function xs(f) {
    let m = await f.startedAt().catch(() => {
      return;
    });
    return typeof m === "number" ? m : null;
  }
  async function Si(f, cwd) {
    n = (await xs(f)) ?? (await f.now());
    C.cwd = cwd;
    try {
      await f.registerCommand(COMMAND_SPEC);
      o = f;
    } catch (error) {
      let c = messageOf(error);
      if (!BUILTIN_HOLDS_PATTERN.test(c)) f.uiLog(registerFailedTextOf(sanitizeName(c)));
    }
  }
  e("session.start", async (f, m, g) => {
    await Si(
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
        startedAt: () => f.session.usage().then((c) => (isRecord(c) ? c.startedAt : undefined)),
        mark: (c) => f.telemetry.mark(c),
        log: (c) => f.telemetry.log(c),
      },
      m.cwd,
    );
    if (o)
      us(o).catch(() => {
        return;
      });
    return g(m);
  });
  e(
    "ui.render",
    {
      component: "PromptHint",
    },
    (f, m, g) => {
      if (isOnPaneSurface(m)) {
        let { viewport } = m;
        let S = R === null && viewport?.columns !== undefined;
        R = viewport?.columns ?? R;
        u = {
          ...u,
          isFullscreen: viewport?.isFullscreen ?? u.isFullscreen,
        };
        if (S && w && o)
          Ye(o).catch(() => {
            return;
          });
      }
      return g(m);
    },
  );
  e(
    "ui.render",
    {
      component: "Pane",
    },
    async (f, m, g) => {
      if (m.requestId !== PANE_ID || !o || !isOnPaneSurface(m)) return g(m);
      let { Box, Text, Button, Select, Code } = await f.ui.resolve(m);
      R = m.viewport?.columns ?? R;
      if (i !== null) {
        let j = i;
        i = null;
        ms(o, j).catch(() => {
          return;
        });
      }
      let ee = m.props.placement !== u.placement;
      u = {
        ...u,
        placement: m.props.placement,
        place: {
          ...u.place,
          columns: Math.max(1, m.props.bodyColumns - PANE_RIGHT_PAD_COLUMNS),
          rows: m.props.scroll.bodyRows,
        },
      };
      if (ee)
        De(o).catch(() => {
          return;
        });
      return paneView(
        {
          ui: {
            Box,
            Text,
            Button,
            Select,
            Code,
          },
          actions: Oi(o),
          columns: m.props.bodyColumns,
          rows: m.props.scroll.bodyRows,
        },
        u,
        {
          placement: m.props.placement,
          terminalColumns: R,
        },
      );
    },
  );
  e(
    "command.run",
    {
      command: "diff",
    },
    async (f, m, g) => {
      if (!o) return g(m);
      let c = (await wt(o)) || (await wt(o));
      if (!r)
        return {
          text: c ? NOT_IN_REPOSITORY_TEXT : GIT_UNANSWERED_TEXT,
        };
      let { isFullscreen } = m.presentation;
      R = m.presentation.columns;
      u = {
        ...u,
        isFullscreen,
      };
      let b = paneToggleOf({
        isOpen: a,
        columns: isFullscreen ? R : null,
      });
      if (b === "too-narrow")
        return {
          text: RESIZE_TERMINAL_TEXT,
        };
      let N = b === "open";
      if (!N) T += 1;
      let L = N ? await ls(o, "manual") : await ds(o).then(() => "placed");
      if (L === "withdrawn")
        return {
          text: RESIZE_TERMINAL_TEXT,
        };
      if (L === "awaited")
        return {
          text: AWAITS_SURFACE_TEXT,
        };
      if (!isFullscreen)
        return N
          ? {}
          : {
              text: DIALOG_DISMISSED_TEXT,
            };
      cs(o, N ? "diff" : "convo");
      await o.storeSet(STORE_OPEN_KEY, N).catch(() => {
        return;
      });
      return {
        text: N ? PANEL_SHOWN_TEXT : PANEL_HIDDEN_TEXT,
      };
    },
  );
  e(
    "ui.close",
    {
      id: PANE_ID,
    },
    async (f, m, g) => {
      if (m.origin.kind === "person" && u.placement === "inline" && u.dialogView === "detail" && o) {
        u = {
          ...u,
          dialogView: "list",
        };
        K(o);
        p = dialogRowsOf(u);
        o.openPane({
          ...Jt(),
          focus: true,
        }).catch(() => {
          return;
        });
        return {
          deny: "back to the file list",
        };
      }
      let S = await g(m);
      let b = S.deny === undefined;
      let N = b && m.origin.kind === "person";
      if (b) {
        a = false;
        i = null;
      }
      if (N) T += 1;
      let L = u.isFullscreen !== false;
      if (N && o && L) {
        cs(o, "convo");
        await o.storeSet(STORE_OPEN_KEY, false).catch(() => {
          return;
        });
      }
      return S;
    },
  );
  e(
    "ui.focus",
    {
      plugin: PLUGIN_NAMES,
    },
    (f, m, g) => {
      let S = u.placement === "inline" && u.dialogView === "list" && o ? dialogFocusOf(u, m.element) : null;
      if (S === "stay") return {};
      if (!S || !o) return g(m);
      u = {
        ...u,
        selectedPath: S.selectedPath,
      };
      De(o).catch(() => {
        return;
      });
      rs(o);
      o.invalidate();
      return g({
        ...m,
        element: S.landing,
      });
    },
  );
  e(
    "ui.scroll",
    {
      requestId: PANE_ID,
    },
    (f, m, g) => {
      if (!(m.origin.kind === "person" && u.placement === "dock") || !o) return g(m);
      let S = isWheelOverList(u, m);
      u = {
        ...u,
        place: S ? listScrolledBy(u, m.by) : bodyScrolledBy(u, m),
      };
      o.invalidate();
      return {};
    },
  );
  e(
    "command.run",
    {
      command: ["clear", "resume"],
    },
    async (f, m, g) => {
      let c = await g(m);
      if (!o) return c;
      let S = m.command === "resume";
      let b = ze() && !S;
      if (a && S)
        await ds(o).catch(() => {
          return;
        });
      ui();
      l = false;
      y = false;
      d = false;
      w = false;
      he = null;
      Oe = null;
      ge.clear();
      Rt(o);
      u = afterNewSession(u);
      n = (await xs(o)) ?? (S ? n : await o.now());
      if (b) await ms(o, "manual");
      if (S)
        us(o).catch(() => {
          return;
        });
      return c;
    },
  );
  function Ti(f, m, g) {
    let any = CODE_EDITING_TOOLS.some((L) => L === m.tool);
    let S = any && g !== undefined && g.deny === undefined && g.isError !== true;
    let b = any ? S : mayHaveWritten(g);
    if (b) ye += 1;
    if (b && ze()) to(f);
    if ((S && m.agentId === undefined) || (b && y))
      Ye(f).catch(() => {
        return;
      });
  }
  e(
    "tool.call",
    {
      tool: [...CODE_EDITING_TOOLS, ...SHELL_TOOLS],
    },
    async (f, m, g) => {
      let c;
      try {
        c = await g(m);
        return c;
      } finally {
        if (o) Ti(o, m, c);
      }
    },
  );
  e("prompt.submit", async (f, m, g) => {
    let c = _;
    if (!o || !c || E === c) return g(m);
    let context = m.context ?? [];
    let b = fittedAskTextOf(c.text, PROMPT_CONTEXT_MAX_CHARS - context.reduce((acc, L) => acc + L.length, 0));
    if (b === undefined) {
      Rt(o);
      o.status(`${sanitizeName(c.path)}'s diff did not fit in the prompt and was dropped`);
      K(o);
      return g(m);
    }
    E = c;
    try {
      let N = await g({
        ...m,
        context: [...context, b],
      });
      if (N.drop === undefined) {
        recorderOf(o).asked();
        if (_ === c) {
          Rt(o);
          K(o);
        }
      }
      return N;
    } finally {
      E = null;
    }
  });
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
