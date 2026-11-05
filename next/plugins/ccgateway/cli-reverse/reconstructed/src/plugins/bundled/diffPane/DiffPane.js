/**
 * plugins/bundled/diffPane/DiffPane.tsx
 *
 * 2.1.316 新增：内置 diff 面板插件的界面：侧栏/对话框面板、分段绘制与停靠布局。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c7hntn0y.js (65)
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-c7hntn0y.js:37219-37421 placement
function listRow(ctx, row, right) {
  let { Box, Button } = ctx.ui;
  return h(
    Box,
    {
      flexDirection: "row",
    },
    h(
      Button,
      {
        key: row.key,
        plain: true,
        dimColor: row.isDim,
        ...(row.isAutoFocus
          ? {
              autoFocus: true,
            }
          : {}),
        onPress: row.onPress,
      },
      row.label,
    ),
    h(Box, {
      flexGrow: 1,
    }),
    right,
  );
}
//@ chunk-c7hntn0y.js:37421-37437 placement
var POINTER = "\u276F";
//@ chunk-c7hntn0y.js:37437-37721 placement
function dialogFileRow(ctx, row, onPress) {
  let { Text } = ctx.ui;
  let max = Math.max(DIALOG_PATH_FLOOR, ctx.columns - DIALOG_PATH_RESERVE);
  let pointer = row.isSelected ? POINTER : " ";
  let label = truncateStart(sanitizeName(row.displayPath), max);
  let note = h(
    Text,
    {
      dimColor: true,
      italic: true,
    },
    row.note ?? "",
  );
  let stat = row.note !== null ? note : diffStat(ctx, row.added, row.removed);
  return listRow(
    ctx,
    {
      key: row.key,
      label: `${pointer} ${label}`,
      onPress,
      isDim: false,
      isAutoFocus: row.isSelected,
    },
    stat,
  );
}
//@ chunk-c7hntn0y.js:37721-37802 placement
function dimNote(ctx, text) {
  let { Text } = ctx.ui;
  return h(
    Text,
    {
      dimColor: true,
      wrap: "truncate-end",
    },
    text,
  );
}
//@ chunk-c7hntn0y.js:37802-37919 placement
function divider(ctx) {
  let { Text } = ctx.ui;
  return h(
    Text,
    {
      dimColor: true,
      wrap: "truncate-end",
    },
    "\u2500".repeat(Math.max(1, ctx.columns)),
  );
}
//@ chunk-c7hntn0y.js:37919-37951 placement (2.1.88 match: _temp2, 1)
var fileKeyOf = (url) => `file:${sanitizeName(url.path)}`;
//@ chunk-c7hntn0y.js:37951-38014 placement
var statTextOf = (added, removed) =>
  keptOf([added > 0 ? `+${added}` : null, removed > 0 ? `-${removed}` : null]).join(" ");
//@ chunk-c7hntn0y.js:38014-38220 placement
function fileRow(ctx, row, onPress) {
  let label = padEnd(
    truncateStart(sanitizeName(row.displayPath), Math.max(ctx.columns - STAT_CELLS, PATH_FLOOR)),
    ctx.columns - statTextOf(row.added, row.removed).length,
  );
  return listRow(
    ctx,
    {
      key: row.key,
      label,
      onPress,
      isDim: true,
      isAutoFocus: false,
    },
    diffStat(ctx, row.added, row.removed),
  );
}
//@ chunk-c7hntn0y.js:38220-38237 placement
var present = (items) => keptOf(items);
//@ chunk-c7hntn0y.js:38237-38473 placement
function headerView(ctx, totals, right) {
  let { Box, Text } = ctx.ui;
  return h(
    Box,
    {
      flexDirection: "row",
      height: 1,
    },
    present([
      totals &&
        ((totals) =>
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
              plural(totals.filesCount, "file"),
            ),
            " changed ",
            diffStat(ctx, totals.linesAdded, totals.linesRemoved),
          ))(totals),
      h(Box, {
        flexGrow: 1,
      }),
      right,
    ]),
  );
}
//@ chunk-c7hntn0y.js:38473-38677 placement
function legendRow(ctx, entry) {
  let { Box, Text } = ctx.ui;
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
        truncateStart(sanitizeName(entry.displayPath), Math.max(ctx.columns - STAT_CELLS, PATH_FLOOR)),
      ),
      h(Box, {
        flexGrow: 1,
      }),
      diffStat(ctx, entry.added, entry.removed),
    ],
  );
}
//@ chunk-c7hntn0y.js:38677-38868 placement
function listEdgeButton(ctx, key, label) {
  let { Button } = ctx.ui;
  let isUp = key === "list-up";
  return h(
    Button,
    {
      key,
      plain: true,
      dimColor: true,
      action: isUp ? "app:diffFileListUp" : "app:diffFileListDown",
      onPress: () => ctx.actions.scrollList(isUp ? -1 : 1),
    },
    label,
  );
}
//@ chunk-c7hntn0y.js:38868-39304 placement
function nameRow(ctx, file) {
  let { Box, Text, Button } = ctx.ui;
  let filtered = [file.isUntracked ? "untracked" : null, file.isTruncated ? "truncated" : null].filter(
    (flag) => flag !== null,
  );
  let suffix = filtered.length === 0 ? "" : ` (${filtered.join(", ")})`;
  let askButton = h(
    Button,
    {
      key: askKeyOf(file.path),
      onPress: () => ctx.actions.toggleAsk(file.path),
    },
    file.isArmed ? "asked \u2713" : "ask",
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
        truncateStart(sanitizeName(file.displayPath), ctx.columns),
      ),
      h(
        Text,
        {
          dimColor: true,
        },
        suffix,
      ),
      h(Box, {
        flexGrow: 1,
      }),
      ...(file.isAskable ? [askButton] : []),
    ],
  );
}
//@ chunk-c7hntn0y.js:39304-39615 placement
function sourcePicker(ctx, view) {
  let { Select } = ctx.ui;
  let { source, turns } = view;
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
        onSelect: (value) => ctx.actions.chooseSource(value),
      })
    : null;
}
//@ chunk-c7hntn0y.js:39615-39756 placement
function titleRow(ctx, title) {
  let { Text } = ctx.ui;
  let hasSubtitle = title.subtitle !== "";
  return h(
    Text,
    {
      wrap: "truncate-end",
    },
    sanitizeName(title.title),
    h(
      Text,
      {
        dimColor: true,
      },
      hasSubtitle ? ` ${sanitizeName(title.subtitle)}` : "",
    ),
  );
}
//@ chunk-c7hntn0y.js:39756-40112 placement
function todoBar(ctx, view) {
  let { todos } = view;
  if (todos.total === 0) return null;
  let { Box, Text } = ctx.ui;
  let max = Math.max(1, Math.min(TODO_BAR_CELLS, ctx.columns - TODO_BAR_RESERVE));
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
//@ chunk-c7hntn0y.js:40112-40250 placement
function toggleRow(ctx, key, row) {
  let { Box, Button } = ctx.ui;
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
        onPress: row.onPress,
      },
      row.label,
    ),
  );
}
//@ chunk-c7hntn0y.js:40250-40260 placement
var FILE_FRAME_NODES = 16;
//@ chunk-c7hntn0y.js:40260-40292 placement
var SAFE_PATHSPEC_PATTERN = /^[\p{L}\p{N}._/@+-]+$/u;
//@ chunk-c7hntn0y.js:40292-40660 placement
function placeholderOf(file) {
  if (file.isUntracked) return file.words.untrackedNoteOf(file.path, SAFE_PATHSPEC_PATTERN.test(file.path));
  if (file.isBinary) return ["Binary file - cannot display diff"];
  if (file.body === undefined) return ["Loading diff\u2026"];
  if (file.body === null) return ["Diff unavailable"];
  let { isLarge, hunks } = file.body;
  let isEmpty = hunks.length === 0;
  let message = isLarge ? "Large file - diff exceeds 1 MB limit" : isEmpty ? "No diff content" : null;
  return message ? [message] : null;
}
//@ chunk-c7hntn0y.js:40660-41204 placement
function detailView(ctx, file, budget) {
  let { Box, Text, Code } = ctx.ui;
  let placeholder = placeholderOf(file);
  let blocks = codeBlocksOf(placeholder ? [] : (file.body?.hunks ?? []), {
    chars: budget.chars - sanitizeName(file.displayPath).length,
    nodes: budget.nodes - FILE_FRAME_NODES,
  });
  let isTruncated = file.body?.isTruncated === true || blocks.isTruncated;
  let path = sanitizeName(file.path).slice(-MAX_CODE_CHARS);
  let truncatedLines = isTruncated
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
  let mapped = (placeholder ?? []).map((line) =>
    h(
      Text,
      {
        dimColor: true,
        italic: true,
        wrap: "wrap",
      },
      line,
    ),
  );
  let mapped_2 = blocks.sources.map((source) =>
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
        nameRow(ctx, {
          ...file,
          isTruncated,
          isAskable: placeholder === null,
        }),
        divider(ctx),
        ...(placeholder ? mapped : mapped_2),
        ...truncatedLines,
      ],
    ),
    room: blocks.room,
  };
}
//@ chunk-c7hntn0y.js:41204-41356 placement
var bodyEntryOf = (file, view) => ({
  path: file.path,
  displayPath: displayPathOf(file),
  added: file.added,
  removed: file.removed,
  isUntracked: file.isUntracked,
  isBinary: file.isBinary,
  body: view.bodies.get(file.path),
});
//@ chunk-c7hntn0y.js:41356-41513 placement
var detailModelOf = (file, view) => ({
  words: view.words,
  path: file.path,
  displayPath: file.displayPath,
  isUntracked: file.isUntracked,
  isBinary: file.isBinary,
  body: file.body,
  isArmed: view.armedPath === file.path,
});
//@ chunk-c7hntn0y.js:41513-41677 placement
var turnEntryOf = (file) => ({
  path: file.path,
  displayPath: file.path,
  added: file.added,
  removed: file.removed,
  isUntracked: false,
  isBinary: false,
  body: {
    hunks: file.hunks,
    isTruncated: file.isTruncated,
    isLarge: false,
  },
});
//@ chunk-c7hntn0y.js:41677-42937 placement
function segmentsOf(ctx, view) {
  let { earlier } = view;
  let { columns } = ctx.place;
  let hasMessage = view.message.length > 0;
  let showEarlier = ctx.isPreSessionShown && earlier.length > 0;
  let earlierCapped = earlier.length > PRE_SESSION_BODY_CAP;
  let numberWidthOf = (hunk) =>
    String(
      Math.max(
        1,
        hunk.oldStart + countWhere(hunk.lines, (line) => !line.startsWith("+")) - 1,
        hunk.newStart + countWhere(hunk.lines, (line) => !line.startsWith("-")) - 1,
      ),
    ).length + GUTTER_CHROME;
  function hunkSegment(file, hunk) {
    let max = Math.max(1, columns - numberWidthOf(hunk));
    let mapped = hunk.lines.map((line) =>
      Math.max(
        1,
        Math.ceil(cellWidth(sanitizeLine(line.slice(1).replaceAll("\t", " ".repeat(TAB_WIDTH)))) / max),
      ),
    );
    return {
      kind: "hunk",
      path: file.path,
      hunk,
      lineRows: mapped,
      rows: mapped.reduce((acc, rows) => acc + rows, 0),
    };
  }
  let splitHunk = (hunk) =>
    subHunksOf(
      {
        ...hunk,
        lines: hunk.lines.filter(isBodyLine).map(drawnLineOf),
      },
      MAX_CODE_CHARS,
    );
  function fileSegments(file) {
    let model = detailModelOf(file, ctx);
    let placeholder = placeholderOf(model);
    let mapped = (file.body?.hunks ?? []).map(splitHunk);
    let isTruncated = file.body?.isTruncated === true || mapped.some((part) => part.isTruncated);
    let segments = placeholder
      ? placeholder.map((text) => ({
          kind: "note",
          text,
        }))
      : mapped.flatMap((part) => part.hunks).map((hunk) => hunkSegment(file, hunk));
    return [
      {
        kind: "rule",
        path: file.path,
      },
      {
        kind: "name",
        name: {
          ...model,
          isTruncated,
          isAskable: placeholder === null,
        },
      },
      {
        kind: "rule",
        path: null,
      },
      ...segments,
      ...(isTruncated
        ? [
            {
              kind: "footer",
            },
          ]
        : []),
    ];
  }
  let withBlank = (entry) => [
    ...fileSegments(entry),
    {
      kind: "blank",
    },
  ];
  let messageSegments = () => [
    {
      kind: "blank",
    },
    ...view.message.map((line) => ({
      kind: "text",
      text: sanitizeName(line),
    })),
    {
      kind: "blank",
    },
  ];
  let capNote = {
    kind: "text",
    text: `diffs hidden above ${PRE_SESSION_BODY_CAP} files`,
  };
  let earlierSegments = () => (earlierCapped ? [capNote] : earlier.flatMap(fileSegments));
  let legendSegments = () => [
    {
      kind: "blank",
    },
    ...earlier.map((entry) => ({
      kind: "legend",
      entry,
    })),
    ...earlierSegments(),
  ];
  return [
    ...(hasMessage ? messageSegments() : view.rows.flatMap(withBlank)),
    ...keptOf([view.earlierLabel]).map((label) => ({
      kind: "toggle",
      label,
    })),
    ...(showEarlier ? legendSegments() : []),
  ];
}
//@ chunk-c7hntn0y.js:42937-43466 placement
function bodyLayoutOf(ctx, view) {
  let segments = segmentsOf(ctx, view);
  let list = listWindowOf(ctx, view);
  let hasNoise = !view.turn && view.partition.noiseCount > 0;
  let noMessage = view.message.length === 0;
  let showsList = noMessage && (view.rows.length > 0 || hasNoise);
  let listRows = showsList
    ? list.shown.length +
      Number(list.above > 0) +
      Number(list.below > 0 || view.totals.notShown > 0) +
      Number(view.isUntrackedNoted) +
      Number(hasNoise) +
      2
    : Number(noMessage);
  let chromeRows = 1 + Number(view.line !== null) + (ctx.todos.total > 0 ? 2 : 0);
  let tops = new Map();
  let max = Math.max(0, ctx.place.rows - chromeRows - listRows);
  let top = 0;
  for (let segment of segments) {
    if (segment.kind === "rule" && segment.path !== null) tops.set(segment.path, top);
    top += segmentRowsOf(segment);
  }
  let listTop = chromeRows + 1;
  return {
    segments,
    extent: top,
    visibleRows: max,
    maxTop: Math.max(0, top - max),
    tops,
    listTop,
    listEnd: showsList ? listTop + listRows - 2 : listTop,
  };
}
//@ chunk-c7hntn0y.js:43466-43599 placement
function dialogEntriesOf(view) {
  let turn = pickedTurnOf(view);
  return turn
    ? turn.files.map(turnEntryOf)
    : [...(view.data?.files ?? [])]
        .sort((fileA, fileB) => displayPathOf(fileA).localeCompare(displayPathOf(fileB)))
        .map((file) => bodyEntryOf(file, view));
}
//@ chunk-c7hntn0y.js:43599-43706 placement
var dialogWindowOf = (view, paths) =>
  Math.max(
    0,
    Math.min(
      paths.length - MAX_VISIBLE_FILES,
      Math.max(0, paths.indexOf(view.selectedPath ?? "")) - Math.floor(MAX_VISIBLE_FILES / 2),
    ),
  );
//@ chunk-c7hntn0y.js:43706-44043 placement
function dialogFocusOf(view, element) {
  let entries = dialogEntriesOf(view);
  let mapped = entries.map((entry) => entry.path);
  let mapped_2 = entries.map((entry) => fileKeyOf(entry));
  let index = mapped_2.indexOf(element ?? "");
  let max = Math.max(0, mapped.indexOf(view.selectedPath ?? ""));
  let windowStart = dialogWindowOf(view, mapped);
  let windowEnd = Math.min(mapped.length, windowStart + MAX_VISIBLE_FILES) - 1;
  let selectedPath = mapped[index] ?? null;
  let landingKey =
    mapped_2[
      windowStart +
        index -
        dialogWindowOf(
          {
            selectedPath,
          },
          mapped,
        )
    ];
  let atLast = max === 0 && index === windowEnd;
  let atFirst = max === mapped.length - 1 && index === windowStart;
  return windowEnd - windowStart >= 2 && (atFirst || atLast)
    ? "stay"
    : selectedPath !== null && landingKey !== undefined
      ? {
          selectedPath,
          landing: landingKey,
        }
      : null;
}
//@ chunk-c7hntn0y.js:44043-44273 placement
function preludeOf(ctx, view) {
  let { Box } = ctx.ui;
  let isLoading = view.data === null && !view.hasSettled;
  let outsideNote = h(Box, null, dimNote(ctx, NOT_IN_REPOSITORY_TEXT));
  let loadingPane = isLoading
    ? (() =>
        messagePaneOf(ctx, {
          top: [headerView(ctx, null, null)],
          message: ["Loading diff\u2026"],
          controls: null,
          earlier: null,
          rest: [],
        }))()
    : null;
  return view.isOutsideRepository ? outsideNote : loadingPane;
}
//@ chunk-c7hntn0y.js:44273-45638 placement
function dialogPane(ctx, view) {
  let { Box, Text } = ctx.ui;
  let prelude = preludeOf(ctx, view);
  if (prelude) return prelude;
  let turn = pickedTurnOf(view);
  let { data } = view;
  let entries = dialogEntriesOf(view);
  let totals = turn ? turnTotalsOf(turn) : (data?.stats ?? null);
  let isTurnSource = view.source.kind === "turn";
  let isListLong = entries.length > MAX_VISIBLE_FILES;
  let entry = entries.find((entry) => entry.path === view.selectedPath);
  let selectedEntry = entry ?? entries[0];
  let showsDetail = view.dialogView === "detail" && entry !== undefined;
  let windowStart = dialogWindowOf(
    view,
    entries.map((entry) => entry.path),
  );
  let sliced = entries.slice(windowStart, windowStart + MAX_VISIBLE_FILES);
  let blank = dimNote(ctx, " ");
  let belowCount = entries.length - windowStart - sliced.length;
  let tooManyFiles = !isTurnSource && data !== null && data.stats.filesCount > 0 && entries.length === 0;
  let emptyText = isTurnSource
    ? "No file changes in this turn"
    : tooManyFiles
      ? "Too many files to display details"
      : "No changes yet";
  let emptyNote = entries.length > 0 ? null : emptyText;
  let totalsLine =
    totals &&
    h(
      Text,
      {
        dimColor: true,
        wrap: "truncate-end",
      },
      `${plural(totals.filesCount, "file")} changed `,
      diffStat(ctx, totals.linesAdded, totals.linesRemoved),
    );
  let noteOf = (entry) => (entry.isUntracked ? "untracked" : entry.isBinary ? "Binary file" : null);
  let renderEntry = (fileEntry) =>
    dialogFileRow(
      ctx,
      {
        key: fileKeyOf(fileEntry),
        path: fileEntry.path,
        displayPath: fileEntry.displayPath,
        added: fileEntry.added,
        removed: fileEntry.removed,
        note: noteOf(fileEntry),
        isSelected: fileEntry === selectedEntry,
      },
      () => ctx.actions.selectFile(fileEntry.path),
    );
  function overflowNote(direction, count) {
    let arrow = direction === "up" ? "\u2191" : "\u2193";
    let replaced = plural(count, "file").replace(" ", " more ");
    return dimNote(ctx, ` ${arrow} ${replaced}`);
  }
  let edgeNote = (direction, count) => (count > 0 ? overflowNote(direction, count) : blank);
  let listEdge = (direction, count) => (isListLong ? edgeNote(direction, count) : null);
  let detailRows = (entry) => [detailView(ctx, detailModelOf(entry, view), BODY_BUDGET).element];
  let listRows = present([
    listEdge("up", windowStart),
    ...sliced.map(renderEntry),
    listEdge("down", belowCount),
  ]);
  let bodyRows = showsDetail && entry ? detailRows(entry) : listRows;
  let contentRows = emptyNote === null ? bodyRows : [dimNote(ctx, emptyNote)];
  let hintText = showsDetail
    ? "\u2191/\u2193 to scroll \xB7 Esc to back"
    : "\u2191/\u2193 to select \xB7 Enter to view \xB7 Esc to close";
  return h(
    Box,
    {
      flexDirection: "column",
    },
    present([
      titleRow(ctx, dialogTitleOf(view)),
      h(Box, {
        height: 1,
      }),
      totalsLine,
      sourcePicker(ctx, view),
      h(
        Box,
        {
          flexDirection: "column",
          marginTop: 1,
          marginBottom: 1,
        },
        contentRows,
      ),
      dimNote(ctx, hintText),
    ]),
  );
}
//@ chunk-c7hntn0y.js:45638-45999 placement
function dialogRowsOf(view) {
  let entries = dialogEntriesOf(view);
  let hasTitleLine = pickedTurnOf(view) !== undefined || view.data !== null;
  let isListLong = entries.length > MAX_VISIBLE_FILES;
  let found = entries.find((entry) => entry.path === view.selectedPath);
  let showsDetail = view.dialogView === "detail" && found !== undefined;
  let windowStart = dialogWindowOf(
    view,
    entries.map((entry) => entry.path),
  );
  let reduced = (found?.body?.hunks ?? []).reduce((acc, hunk) => acc + 1 + hunk.lines.length, 0);
  let min = Math.min(entries.length - windowStart, MAX_VISIBLE_FILES);
  let listRows = entries.length === 0 ? 1 : min + (isListLong ? 2 : 0);
  let bodyRows = showsDetail ? 2 + Math.max(1, reduced) : listRows;
  return 2 + Number(hasTitleLine) + Number(view.turns.length > 0) + 2 + bodyRows + 1;
}
//@ chunk-c7hntn0y.js:45999-46410 placement
function listBodyOf(view) {
  let { data, partition, totals, empty } = view;
  let hint = empty?.hint ?? null;
  if (empty) return hint === null ? [] : [hint];
  if (data !== null && data.files.length === 0 && totals.filesCount > 0)
    return ["Too many changed files to show diff", "Per-file diff is skipped above 500 files"];
  return partition.shown.length === 0 && partition.noiseCount > 0
    ? [
        "Only tests and generated files changed",
        'Tests and generated files are hidden \xB7 click "show" above to view ' + "them",
      ]
    : partition.shown;
}
//@ chunk-c7hntn0y.js:46410-46419 placement
var FOOT_ROWS = 3;
//@ chunk-c7hntn0y.js:46419-47110 placement
function messagePaneOf(ctx, pane) {
  let { Box, Text } = ctx.ui;
  let { top, controls, earlier, rest } = pane;
  let flattened = pane.message.flatMap((line) => wrappedLines(sanitizeName(line), ctx.columns));
  let mapped = flattened.map((line) =>
    h(
      Text,
      {
        dimColor: true,
      },
      line,
    ),
  );
  let controlsRows = controls === null ? [] : [controls];
  let earlierRows = earlier === null ? [] : [earlier];
  let controlRow =
    controlsRows.length > 0 || earlierRows.length === 0
      ? controlsRows
      : [
          h(Box, {
            height: 1,
          }),
        ];
  let footRows = earlier === null ? 0 : FOOT_ROWS;
  let bodyRows = ctx.rows - top.length - 1 - footRows;
  let floored = Math.floor((bodyRows - flattened.length) / 2);
  if (!(rest.length === 0 && bodyRows - floored - flattened.length >= controlsRows.length))
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
        ...controlRow,
        ...earlierRows,
        ...rest,
      ],
    );
  let topPad =
    floored > 0
      ? [
          h(Box, {
            height: floored,
          }),
        ]
      : [];
  let mapped_2 = earlierRows.map((row) =>
    h(
      Box,
      {
        flexDirection: "column",
        marginTop: 1,
        paddingBottom: 1,
      },
      row,
    ),
  );
  return h(
    Box,
    {
      flexDirection: "column",
      height: ctx.rows,
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
          height: bodyRows,
          alignItems: "center",
        },
        [...topPad, ...mapped, ...controlsRows],
      ),
      ...mapped_2,
    ],
  );
}
//@ chunk-c7hntn0y.js:47110-47927 placement
function dockPlanOf(view) {
  let { data, requestedMode } = view;
  let turn = pickedTurnOf(view);
  let noiseFilter = view.isNoiseShown ? "shown" : "hidden";
  let partition = partitionOf(data?.files ?? [], noiseFilter);
  let toggleLabel = view.isPreSessionShown ? "hide" : "show";
  let totals = turn ? turnTotalsOf(turn) : data ? headerTotalsOf(data, partition) : ZERO_TOTALS;
  let empty = turn ? null : emptyStateOf(view, totals.filesCount);
  let listBody = turn
    ? []
    : listBodyOf({
        data,
        partition,
        totals,
        empty,
      });
  let flattened = listBody.flatMap((item) => (typeof item === "string" ? [item] : []));
  let hasFileRows = turn ? turn.files.length > 0 : flattened.length < listBody.length;
  let toEntry = (file) => bodyEntryOf(file, view);
  let rows = turn ? turn.files.map(turnEntryOf) : hasFileRows ? partition.shown.map(toEntry) : [];
  let earlier = turn ? [] : partition.preSession.map(toEntry);
  let hasEarlier = earlier.length > 0;
  let showModeLabel =
    data !== null && !data.isUnborn && (requestedMode !== "session" || data.mode !== "session");
  let lineText = turn
    ? `Turn ${turn.index} "${turn.preview}"`
    : showModeLabel
      ? modeLabelOf(requestedMode, view)
      : unbornNoteOf(view, totals.filesCount);
  return {
    turn,
    partition,
    totals,
    empty,
    line: lineText === null ? null : sanitizeName(lineText),
    rows,
    earlier,
    earlierLabel: hasEarlier
      ? `+${plural(earlier.length, "file")} edited before this session (${toggleLabel})`
      : null,
    notes: flattened,
    message: empty ? [empty.headline, ...flattened] : hasFileRows ? [] : flattened,
    isUntrackedNoted: !turn && data?.isUntrackedWithheld === true && empty === null,
  };
}
//@ chunk-c7hntn0y.js:47927-48098 placement
function hunkWindowOf(segment, windowSpec) {
  let consumedRows = 0;
  let offset = 0;
  let takenRows = 0;
  let takenLines = 0;
  for (let rows of segment.lineRows) {
    if (consumedRows + rows <= windowSpec.skip) offset += 1;
    else if (takenRows < windowSpec.take) {
      takenRows += rows;
      takenLines += 1;
    }
    consumedRows += rows;
  }
  let hunk = adjustHunkLineNumbers(segment.hunk, offset);
  return {
    ...hunk,
    lines: hunk.lines.slice(0, takenLines),
  };
}
//@ chunk-c7hntn0y.js:48098-48341 placement
function bodyScrolledBy(ctx, event) {
  let { visibleRows, maxTop } = bodyLayoutOf(ctx, dockPlanOf(ctx));
  let delta = Math.abs(event.by);
  let isPage = delta >= event.contentRows && event.contentRows > event.bodyRows;
  let isRowStep = !isPage && delta >= event.bodyRows;
  let step = isPage ? maxTop : isRowStep ? Math.max(1, visibleRows) : delta * WHEEL_ROWS;
  return {
    ...ctx.place,
    top: Math.max(0, Math.min(maxTop, ctx.place.top + Math.sign(event.by) * step)),
  };
}
//@ chunk-c7hntn0y.js:48341-49193 placement
function drawWindow(ctx, layout, top) {
  let { Box, Text, Code } = ctx.ui;
  let out = [];
  let takeRows = layout.visibleRows + SCROLL_MARGIN_ROWS;
  let max = Math.max(0, Math.min(top, layout.maxTop));
  let onPress = ctx.actions.togglePreSession;
  let scannedRows = 0;
  let takenRows = 0;
  let charsUsed = 0;
  function renderHunk(segment, hunkSegment) {
    let source = hunkSourceOf(hunkWindowOf(segment, hunkSegment));
    let path = sanitizeName(segment.path);
    charsUsed += source.length;
    return charsUsed > MAX_BODY_CHARS
      ? h(
          Text,
          {
            dimColor: true,
            italic: true,
          },
          "\u2026",
        )
      : h(Code, {
          source,
          format: "diff",
          path,
        });
  }
  function renderSegment(segment, sliceWindow) {
    switch (segment.kind) {
      case "rule":
        return divider(ctx);
      case "blank":
        return h(Box, {
          height: 1,
        });
      case "name":
        return nameRow(ctx, segment.name);
      case "hunk":
        return renderHunk(segment, sliceWindow);
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
        return dimNote(ctx, segment.text);
      case "toggle":
        return toggleRow(ctx, "presession", {
          ...segment,
          onPress,
        });
      case "legend":
        return legendRow(ctx, segment.entry);
    }
  }
  for (let segment of layout.segments) {
    let rows = segmentRowsOf(segment);
    if (scannedRows + rows > max && takenRows < takeRows) {
      let max_2 = Math.max(0, max - scannedRows);
      out.push(
        renderSegment(segment, {
          skip: max_2,
          take: takeRows - takenRows,
        }),
      );
      takenRows += rows - max_2;
    }
    scannedRows += rows;
  }
  return out;
}
//@ chunk-c7hntn0y.js:49193-49308 placement
function isWheelOverList(ctx, event) {
  let plan = dockPlanOf(ctx);
  let { listTop, listEnd } = bodyLayoutOf(ctx, plan);
  let pointerRow = event.pointer?.row ?? -1;
  return pointerRow >= listTop && pointerRow < listEnd && plan.rows.length > MAX_SUMMARY_ROWS;
}
//@ chunk-c7hntn0y.js:49308-49969 placement
function listBlockOf(ctx, view, list) {
  let { shown, above, below } = listWindowOf(view, list);
  let { noiseCount } = list.partition;
  let { notShown } = list.totals;
  let hasNoise = !list.turn && noiseCount > 0;
  let hasAbove = above > 0;
  let hasBelow = below > 0;
  let hasNotShown = notShown > 0;
  let toggleLabel = view.isNoiseShown ? "hide" : "show";
  let joined = keptOf([
    hasBelow ? `${below} ${MORE_BELOW_TEXT}` : null,
    hasNotShown ? `${notShown} not shown` : null,
  ]).join(" \xB7 ");
  let renderFile = (url) =>
    fileRow(
      ctx,
      {
        key: fileKeyOf(url),
        path: url.path,
        displayPath: url.displayPath,
        added: url.added,
        removed: url.removed,
        note: null,
        isSelected: false,
      },
      () => ctx.actions.selectFile(url.path),
    );
  let aboveButton = hasAbove ? listEdgeButton(ctx, "list-up", `\u2191 ${above} more above`) : null;
  let belowRow = hasBelow
    ? listEdgeButton(ctx, "list-down", `\u2193 ${joined}`)
    : hasNotShown
      ? dimNote(ctx, `\u2026 ${joined}`)
      : null;
  let noiseToggle = hasNoise
    ? toggleRow(ctx, "noise", {
        label: `${plural(noiseCount, "test")}/generated (${toggleLabel})`,
        onPress: ctx.actions.toggleNoise,
      })
    : null;
  return present([
    aboveButton,
    ...shown.map(renderFile),
    belowRow,
    list.isUntrackedNoted ? dimNote(ctx, untrackedWithheldTextOf(view)) : null,
    noiseToggle,
  ]);
}
//@ chunk-c7hntn0y.js:49969-50110 placement
function listScrolledBy(ctx, delta) {
  let max = Math.max(0, dockPlanOf(ctx).rows.length - MAX_SUMMARY_ROWS);
  return {
    ...ctx.place,
    listStart: Math.max(0, Math.min(max, Math.min(ctx.place.listStart, max) + delta)),
  };
}
//@ chunk-c7hntn0y.js:50110-50180 placement
var placeAtFile = (ctx, path) => ({
  ...ctx.place,
  top: bodyLayoutOf(ctx, dockPlanOf(ctx)).tops.get(path) ?? ctx.place.top,
});
//@ chunk-c7hntn0y.js:50180-50234 placement
var insetOf = (place) => ({
  ...place,
  columns: Math.max(1, place.columns - PANE_RIGHT_PAD_COLUMNS),
});
//@ chunk-c7hntn0y.js:50234-50975 placement
function sidebarPane(ctx, view) {
  let { Box, Button } = ctx.ui;
  let prelude = preludeOf(ctx, view);
  if (prelude) return prelude;
  let plan = dockPlanOf(view);
  let noMessage = plan.message.length === 0;
  let showsMessage = !noMessage && !(view.isPreSessionShown && plan.earlier.length > 0);
  let listBlock = listBlockOf(ctx, view, plan);
  let onPress = ctx.actions.togglePreSession;
  let hasListRows = listBlock.length > 0;
  let topRows = present([
    headerView(
      ctx,
      plan.empty ? null : plan.totals,
      h(
        Box,
        {
          flexDirection: "row",
        },
        present([
          sourcePicker(ctx, view),
          h(
            Button,
            {
              key: "base",
              plain: true,
              action: "app:cycleDiffBase",
              onPress: ctx.actions.cycleBase,
            },
            "",
          ),
        ]),
      ),
    ),
    plan.line === null ? null : dimNote(ctx, plan.line),
    todoBar(ctx, view),
  ]);
  if (showsMessage)
    return messagePaneOf(ctx, {
      top: [...topRows, ...listBlock],
      message: plan.message,
      controls: null,
      earlier:
        keptOf([plan.earlierLabel]).map((label) =>
          toggleRow(ctx, "presession", {
            label,
            onPress,
          }),
        )[0] ?? null,
      rest: [],
    });
  let listElement = () =>
    hasListRows
      ? h(
          Box,
          {
            flexDirection: "column",
            marginTop: 1,
            marginBottom: 1,
          },
          listBlock,
        )
      : h(Box, {
          height: 1,
        });
  return h(
    Box,
    {
      flexDirection: "column",
    },
    [
      ...topRows,
      ...(noMessage ? [listElement()] : []),
      ...drawWindow(ctx, bodyLayoutOf(view, plan), view.place.top),
    ],
  );
}
//@ chunk-c7hntn0y.js:50975-51198 placement
function paneView(ctx, view, props) {
  let { Box } = ctx.ui;
  let isDocked = props.placement === "dock";
  let isTooNarrow =
    view.isFullscreen !== false && props.terminalColumns !== null && props.terminalColumns < OPEN_MIN_COLUMNS;
  return isDocked
    ? h(
        Box,
        {
          flexDirection: "column",
          paddingRight: PANE_RIGHT_PAD_COLUMNS,
        },
        sidebarPane(insetOf(ctx), view),
      )
    : isTooNarrow
      ? h(Box, null, dimNote(ctx, RESIZE_TERMINAL_TEXT))
      : dialogPane(ctx, view);
}
//@ chunk-c7hntn0y.js:51198-51514 placement
function drawnFilesOf(view) {
  let files = view.data?.files ?? [];
  if (view.placement === "inline") {
    let hasTurn = pickedTurnOf(view) !== undefined;
    let mapped = dialogEntriesOf(view).map((entry) => entry.path);
    let windowStart = dialogWindowOf(view, mapped);
    let sliced = mapped.slice(windowStart, windowStart + MAX_VISIBLE_FILES);
    return files.filter((file) => !hasTurn && sliced.includes(file.path));
  }
  let partition = partitionOf(files, view.isNoiseShown ? "shown" : "hidden");
  let includePreSession = view.isPreSessionShown && partition.preSession.length <= PRE_SESSION_BODY_CAP;
  return [...partition.shown, ...(includePreSession ? partition.preSession : [])];
}
//@ chunk-c7hntn0y.js:51514-51601 placement
var entryKindsOf = (ctx) => (dir) =>
  ctx.listDir(dir).then(
    (entries) => new Map(entries.map((entry) => [entry.name, entry.kind])),
    () => null,
  );
//@ chunk-c7hntn0y.js:51601-51712 placement (2.1.88 match: isEnvTruthy, 0.824)
var isEnvTruthy = (settings, envValue) =>
  settings.fileCheckpointingEnabled !== false &&
  !["1", "true", "yes", "on"].includes((envValue ?? "").trim().toLowerCase());
//@ chunk-c7hntn0y.js:51712-51745 placement
var isOnPaneSurface = (props) => props.surface !== "mobile";
//@ chunk-c7hntn0y.js:51745-51796 placement
var messageOf = (error) => (error instanceof Error ? error.message : String(error));
//@ chunk-c7hntn0y.js:51796-51853 placement (2.1.88 match: getFileModificationTimeAsync, 1)
/**
 * 返回"取 mtime 或 null"的函数（柯里化）。
 */
var getFileModificationTimeAsync = (filePath) => (path) =>
  filePath.stat(path).then(
    (stats) => stats.mtimeMs,
    () => null,
  );
//@ chunk-c7hntn0y.js:51853-51951 placement
function paneToggleOf(props) {
  let isTooNarrow = props.columns !== null && props.columns < OPEN_MIN_COLUMNS;
  return props.isOpen ? "close" : isTooNarrow ? "too-narrow" : "open";
}
//@ chunk-c7hntn0y.js:51951-51995 placement
var BASE_OUTCOMES = ["merge-base", "head-is-base", "none"];
//@ chunk-c7hntn0y.js:51995-52161 placement
var FEATURES = {
  read: "repl_diff_read",
  tabSwitch: "repl_tab_switch",
  baseSwitch: "repl_diff_base_switch",
  baseResolve: "diff_base_resolve",
  selectionAttach: "diff_selection_attach",
};
//@ chunk-c7hntn0y.js:52161-52212 placement
function safely(fn) {
  try {
    fn().catch(() => {
      return;
    });
  } catch {}
}
//@ chunk-c7hntn0y.js:52212-52242 placement
var SHOWN_TRIGGERS = ["auto_open", "manual"];
//@ chunk-c7hntn0y.js:52242-52300 placement
var WIDTH_BUCKETS = ["under_110", "110_to_143", "144_to_199", "200_plus"];
//@ chunk-c7hntn0y.js:52300-52562 placement
var recorderOf = (recorder) => ({
  mark: (feature, props) =>
    safely(() =>
      recorder.mark({
        feature,
        ...props,
      }),
    ),
  shown: (value, value_2) =>
    safely(() =>
      recorder.log({
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
      recorder.mark({
        feature: FEATURES.selectionAttach,
        kind: "ok",
      }),
    ),
});
//@ chunk-c7hntn0y.js:52562-52586 placement
var TABS = ["diff", "convo"];
//@ chunk-c7hntn0y.js:52586-52666 placement
function widthBucketOf(columns) {
  let [narrow, medium, wide, widest] = WIDTH_BUCKETS;
  let width = columns ?? 0;
  let isNarrow = width < OPEN_MIN_COLUMNS;
  let isMedium = width < AUTO_OPEN_MIN_COLUMNS;
  let isWide = width < WIDEST_BUCKET_COLUMNS;
  return isNarrow ? narrow : isMedium ? medium : isWide ? wide : widest;
}
//@ chunk-c7hntn0y.js:52666-52769 placement
function refreshRestOf(elapsedMs, timeoutCount) {
  let min = Math.min(elapsedMs, SLOW_REFRESH_REST_MAX_MS);
  let backoffMs =
    timeoutCount > 0 ? Math.min(TIMED_OUT_REST_MS * 2 ** (timeoutCount - 1), TIMED_OUT_REST_MAX_MS) : 0;
  let max = Math.max(min, backoffMs);
  return max > REFRESH_DEBOUNCE_MS ? max : 0;
}
//@ chunk-c7hntn0y.js:52769-52918 placement
/**
 * 窗格打开结果：placed / awaited（暂无界面）/ withdrawn。
 */
function classifyPanePlacement(result) {
  if (!(isRecord(result) && result.isPlaced === false)) return "placed";
  return typeof result.reason === "string" && result.reason.startsWith("no-surface")
    ? "awaited"
    : "withdrawn";
}
//@ chunk-c7hntn0y.js:52918-64461 placement
function register(on) {
  let host = null;
  let backend = null;
  let backendPromise = null;
  let sessionStartMs = 0;
  let isPaneOpen = false;
  let pendingOpenOutcome = null;
  let lastPaneRows = null;
  let isOpening = false;
  let isAutoOpenPending = false;
  let isRestQueued = false;
  let toggleGeneration = 0;
  let hasTurnDiffs = false;
  let terminalColumns = null;
  let lastShownSessionId = null;
  let armedAsk = null;
  let lastAskedAsk = null;
  let isRefreshing = false;
  let isRefreshQueued = false;
  let isForcedRefresh = false;
  let timeoutCount = 0;
  let restDueAt = null;
  let resolved = Promise.resolve();
  let diffGeneration = 0;
  let changeCount = 0;
  let bodiesKey = null;
  let bodiesBaseRef = null;
  let loadedBodyPaths = new Set();
  let repoState = {
    toplevel: "",
    headKey: "",
  };
  let envState = {
    cwd: "",
    isEmpty: false,
    epoch: 0,
  };
  let model = INITIAL_MODEL;
  let timers = new Map();
  let markedBaseOutcomes = new Set();
  let hostFor = (fallback) => host ?? fallback;
  let isIdle = () => isPaneOpen && pendingOpenOutcome === null;
  let hostApiOf = (fallback) => ({
    run: (command, options) =>
      hostFor(fallback).run(
        command,
        envState.cwd === ""
          ? options
          : {
              cwd: envState.cwd,
              ...options,
            },
      ),
    readFile: (path) => hostFor(fallback).readFile(path),
    mtimeOf: (path) => getFileModificationTimeAsync(hostFor(fallback))(path),
    entryKindsOf: (dir) => entryKindsOf(hostFor(fallback))(dir),
    nowMs: () => hostFor(fallback).now(),
    sessionStartMsOf: () => sessionStartMs,
    onBranchBase: (result) => {
      let markArg =
        result.kind === "error"
          ? {
              kind: "sad",
              reason: result.reason,
            }
          : {
              kind: "ok",
              props: {
                outcome: {
                  value: result.kind,
                  of: BASE_OUTCOMES,
                },
              },
            };
      if (!markedBaseOutcomes.has(markArg.kind)) {
        markedBaseOutcomes.add(markArg.kind);
        recorderOf(hostFor(fallback)).mark(FEATURES.baseResolve, markArg);
      }
    },
  });
  function ensureBackend(fallback) {
    if (backend || envState.isEmpty) return Promise.resolve(true);
    backendPromise ??= resolveBackend(fallback).finally(() => {
      backendPromise = null;
    });
    return backendPromise;
  }
  async function resolveBackend(fallback) {
    let probeState = {
      isAnswered: true,
    };
    let hostApi = hostApiOf(fallback);
    let { epoch } = envState;
    let resolved = await backendOf(
      {
        ...hostApi,
        run: (command, options) =>
          hostApi.run(command, options).catch((error) => {
            probeState.isAnswered &&= command[0] !== "git" || !/\baborted\b/.test(messageOf(error));
            throw error;
          }),
      },
      INSTALLED_BACKEND_PROBES,
    );
    if (epoch !== envState.epoch) return false;
    backend ??= resolved;
    envState.isEmpty = backend === null && probeState.isAnswered;
    if (!resolved || backend !== resolved) return probeState.isAnswered || backend !== null;
    startHeadPoll(fallback, resolved);
    let storedMode = baseModeOf(
      await fallback.storeGet(baseStoreKeyOf(resolved.repository.toplevel)).catch(() => {
        return;
      }),
    );
    let modeToPersist = storedMode && resolved.baseModes.includes(storedMode) ? storedMode : null;
    model = {
      ...model,
      words: resolved.words,
      baseModes: resolved.baseModes,
      ...(modeToPersist && {
        requestedMode: modeToPersist,
      }),
    };
    return true;
  }
  function resetSessionState() {
    backend = null;
    envState.isEmpty = false;
    envState.epoch += 1;
    repoState.toplevel = "";
    repoState.headKey = "";
    timers.get("poll")?.cancel();
    timers.delete("poll");
    timers.get("rest")?.cancel();
    timers.delete("rest");
    timeoutCount = 0;
    isRefreshQueued = false;
    isForcedRefresh = false;
    timers.get("refresh")?.cancel();
    timers.delete("refresh");
  }
  function paneRequest() {
    return {
      id: PANE_ID,
      title: PANE_TITLE,
      closeOnEscape: true,
      rows: dialogRowsOf(model),
    };
  }
  function syncOpenPane(hostApi) {
    let paneRows = dialogRowsOf(model);
    if (isPaneOpen && model.isFullscreen === false && paneRows !== lastPaneRows) {
      lastPaneRows = paneRows;
      hostApi.openPane(paneRequest()).catch(() => {
        return;
      });
    }
  }
  function requestRedraw(hostApi) {
    syncOpenPane(hostApi);
    if (timers.has("redraw")) return;
    timers.set(
      "redraw",
      hostApi.after(REDRAW_COALESCE_MS, () => {
        timers.delete("redraw");
        hostApi.invalidate();
      }),
    );
  }
  async function loadBodies(hostApi) {
    let { data } = model;
    let currentBackend = backend;
    if (!data || !currentBackend) {
      bodiesKey = null;
      bodiesBaseRef = null;
      loadedBodyPaths.clear();
      model = {
        ...model,
        bodies: NO_BODIES,
      };
      return false;
    }
    let cacheKey = bodiesCacheKey(data);
    let baseRefChanged = data.baseRef !== bodiesBaseRef;
    if (cacheKey !== bodiesKey) {
      bodiesKey = cacheKey;
      loadedBodyPaths.clear();
    }
    if (baseRefChanged) {
      bodiesBaseRef = data.baseRef;
      model = {
        ...model,
        bodies: NO_BODIES,
      };
      requestRedraw(hostApi);
    }
    return fetchMissingHunks(hostApi, currentBackend, data);
  }
  let bodiesCacheKey = (data) => `${diffGeneration}|${data.baseRef}`;
  async function fetchMissingHunks(hostApi, currentBackend, data) {
    let cacheKey = bodiesCacheKey(data);
    let filtered = drawnFilesOf(model).filter((file) => !loadedBodyPaths.has(file.path));
    for (let file of filtered) loadedBodyPaths.add(file.path);
    let hunks = await currentBackend.fetchHunks(data, filtered);
    if (bodiesKey === cacheKey && hunks.size > 0) {
      model = {
        ...model,
        bodies: new Map([...model.bodies, ...hunks]),
      };
      requestRedraw(hostApi);
    }
    return [...hunks.values()].includes(null);
  }
  function ensureHeadKey() {
    let currentBackend = backend;
    if (!currentBackend || repoState.headKey !== "") return;
    currentBackend
      .headKeyOf()
      .catch(() => "")
      .then((headKey) => {
        if (backend === currentBackend && repoState.headKey === "") repoState.headKey = headKey;
      });
  }
  function startHeadPoll(hostApi, resolved) {
    let readHeadKey = () => resolved.headKeyOf().catch(() => "");
    if (repoState.toplevel === resolved.repository.toplevel) return;
    timers.get("poll")?.cancel();
    repoState.toplevel = resolved.repository.toplevel;
    repoState.headKey = "";
    timers.set(
      "poll",
      hostApi.every(HEAD_POLL_MS, () => {
        if (!isIdle()) return;
        if (isRefreshQueued && !isRefreshing) runDeferredRestIfDue(hostApi);
        readHeadKey().then((headKey) => {
          let headChanged = repoState.headKey !== "" && headKey !== repoState.headKey;
          repoState.headKey = headKey;
          if (headChanged) scheduleRefresh(hostApi);
        });
      }),
    );
  }
  async function refreshDiff(hostApi, force = false) {
    if (isRefreshing || (timers.has("rest") && !force)) {
      isRefreshQueued = true;
      isForcedRefresh ||= force;
      if (!isRefreshing) runDeferredRestIfDue(hostApi);
      return;
    }
    isRefreshing = true;
    let resolveDone = () => {
      return;
    };
    resolved = new Promise((resolve) => {
      resolveDone = resolve;
    });
    isRefreshQueued = false;
    isForcedRefresh = false;
    timers.get("refresh")?.cancel();
    timers.delete("refresh");
    let recorder = recorderOf(hostApi);
    let currentBackend = backend;
    let { epoch } = envState;
    let startedAt = await hostApi.now().catch(() => null);
    let outcomeKind = null;
    let endedAt = null;
    let fetchOutcome = async () => ({
      outcome: currentBackend
        ? await currentBackend.fetchDiff(model.requestedMode)
        : {
            kind: "no-repository",
          },
      endedMs: await hostApi.now().catch(() => null),
    });
    try {
      model = {
        ...model,
        isLoading: model.data === null,
      };
      let [fetchResult, messages] = await Promise.all([fetchOutcome(), hostApi.messages().catch(() => [])]);
      let { outcome } = fetchResult;
      switch (
        ((endedAt = fetchResult.endedMs),
        (model = afterFetch(model, {
          outcome,
          messages,
        })),
        (outcomeKind = outcome.kind),
        outcome.kind)
      ) {
        case "no-repository":
          break;
        case "unavailable":
          recorder.mark(FEATURES.read, {
            kind: "sad",
            reason: "git_diff_failed",
          });
          break;
        case "data":
          diffGeneration += 1;
          break;
      }
      let hunksFailed = await loadBodies(hostApi);
      if (outcome.kind === "data")
        recorder.mark(
          FEATURES.read,
          hunksFailed
            ? {
                kind: "sad",
                reason: "git_hunks_failed",
              }
            : {
                kind: "ok",
              },
        );
    } catch (error) {
      recorder.mark(FEATURES.read, {
        kind: "sad",
        reason: "git_diff_threw",
      });
      throw error;
    } finally {
      let now = await hostApi.now().catch(() => null);
      let endMs = endedAt ?? now;
      let elapsedMs = startedAt === null || endMs === null ? 0 : endMs - startedAt;
      isRefreshing = false;
      resolveDone();
      if (epoch === envState.epoch) scheduleRestRefresh(hostApi, elapsedMs, outcomeKind, now ?? endedAt);
      requestRedraw(hostApi);
      settlePendingRefresh(hostApi);
    }
  }
  function scheduleRestRefresh(hostApi, elapsedMs, outcomeKind, endedAt) {
    timeoutCount = outcomeKind !== "data" && elapsedMs >= GIT_TIMEOUT_MS ? timeoutCount + 1 : 0;
    timers.get("rest")?.cancel();
    timers.delete("rest");
    let delayMs = refreshRestOf(elapsedMs, timeoutCount);
    if (delayMs === 0) {
      flushDeferredOpen(hostApi);
      return;
    }
    let timer = hostApi.after(delayMs, () => {
      if (timers.get("rest") === timer) runRestRefresh(hostApi);
    });
    timers.set("rest", timer);
    restDueAt = endedAt === null ? null : endedAt + delayMs;
  }
  function runRestRefresh(hostApi) {
    timers.delete("rest");
    settlePendingRefresh(hostApi);
    flushDeferredOpen(hostApi);
  }
  function flushDeferredOpen(hostApi) {
    if (isRestQueued) {
      isRestQueued = false;
      maybeAutoOpen(hostApi).catch(() => {
        return;
      });
    }
  }
  async function runDeferredRestIfDue(hostApi) {
    let restTimer = timers.get("rest");
    let dueAt = restDueAt;
    let now = await hostApi.now().catch(() => null);
    if (
      restTimer !== undefined &&
      timers.get("rest") === restTimer &&
      dueAt !== null &&
      now !== null &&
      now >= dueAt
    )
      runRestRefresh(hostApi);
  }
  function settlePendingRefresh(hostApi) {
    if (!isRefreshQueued || isRefreshing) return;
    let isForced = isForcedRefresh;
    if (timers.has("rest") && !isForced && isPaneOpen) return;
    isRefreshQueued = false;
    isForcedRefresh = false;
    if (isForced) refreshDiff(hostApi, true);
    else if (isPaneOpen) scheduleRefresh(hostApi);
  }
  function scheduleRefresh(hostApi) {
    timers.get("refresh")?.cancel();
    let timer = hostApi.after(REFRESH_DEBOUNCE_MS, () => {
      if (timers.get("refresh") !== timer) return;
      timers.delete("refresh");
      refreshDiff(hostApi);
    });
    timers.set("refresh", timer);
  }
  async function logShownOnce(hostApi, trigger) {
    let sessionId = await hostApi.sessionId().catch(() => null);
    if (sessionId !== null && sessionId !== lastShownSessionId) {
      lastShownSessionId = sessionId;
      recorderOf(hostApi).shown(trigger, widthBucketOf(terminalColumns));
    }
  }
  async function openAfterReady(hostApi, trigger) {
    await logShownOnce(hostApi, trigger);
    await ensureBackend(hostApi);
    ensureHeadKey();
    refreshDiff(hostApi, true);
  }
  async function openPane(hostApi, trigger, generation = toggleGeneration) {
    let isAutoOpen = trigger === "auto_open";
    let epoch = envState.epoch;
    while (isAutoOpen && isRefreshing) await resolved;
    let isStale = isPaneOpen || envState.epoch !== epoch || toggleGeneration !== generation;
    if (isAutoOpen && isStale) return "withdrawn";
    let isInline = model.isFullscreen === false;
    model = {
      ...model,
      selectedPath: null,
      dialogView: "list",
      place: {
        ...model.place,
        top: 0,
        listStart: 0,
      },
    };
    lastPaneRows = isInline ? dialogRowsOf(model) : null;
    let changeCountBefore = changeCount;
    let diffGenerationBefore = diffGeneration;
    if (!isInline)
      await refreshDiff(hostApi, true).catch(() => {
        return;
      });
    let { data } = model;
    let hasChanges =
      diffGeneration !== diffGenerationBefore &&
      envState.epoch === epoch &&
      !isPaneOpen &&
      toggleGeneration === generation &&
      data !== null &&
      headerTotalsOf(data, partitionOf(data.files, model.isNoiseShown ? "shown" : "hidden")).filesCount > 0;
    if (isAutoOpen && !hasChanges) return "withdrawn";
    let placement = await hostApi.openPane(
      isInline
        ? {
            ...paneRequest(),
            focus: true,
          }
        : {
            id: PANE_ID,
            title: PANE_TITLE,
          },
    );
    let outcome = classifyPanePlacement(placement);
    if (outcome === "withdrawn") {
      await hostApi
        .closePane({
          id: PANE_ID,
        })
        .catch(() => {
          return;
        });
      return outcome;
    }
    isPaneOpen = true;
    ensureHeadKey();
    if (outcome === "awaited") pendingOpenOutcome = trigger;
    else await logShownOnce(hostApi, trigger);
    if (isInline || changeCount !== changeCountBefore) refreshDiff(hostApi, true);
    return outcome;
  }
  async function closePane(hostApi) {
    await hostApi.closePane({
      id: PANE_ID,
    });
    isPaneOpen = false;
    pendingOpenOutcome = null;
  }
  function markTabSwitch(hostApi, value) {
    recorderOf(hostApi).mark(FEATURES.tabSwitch, {
      kind: "ok",
      props: {
        tab: {
          value,
          of: TABS,
        },
      },
    });
  }
  async function maybeAutoOpen(hostApi) {
    let isBlocked = () => isPaneOpen || isOpening;
    if (isBlocked()) return;
    if (isAutoOpenPending && timers.has("rest")) {
      isRestQueued = true;
      runDeferredRestIfDue(hostApi);
      return;
    }
    isRestQueued = false;
    let generation = toggleGeneration;
    let openStored = await hostApi.storeGet(STORE_OPEN_KEY);
    let minColumns = openStored === true ? OPEN_MIN_COLUMNS : AUTO_OPEN_MIN_COLUMNS;
    if (
      !(
        openStored !== false &&
        model.isFullscreen === true &&
        terminalColumns !== null &&
        terminalColumns >= minColumns
      ) ||
      isBlocked()
    )
      return;
    if (!(await hostApi.isCheckpointing().catch(() => true)) || isBlocked()) return;
    await ensureBackend(hostApi);
    if (!backend || isBlocked()) return;
    let changeCountBefore = changeCount;
    let { epoch } = envState;
    isOpening = true;
    let openOutcome = await openPane(hostApi, "auto_open", generation).catch(() => "withdrawn");
    if (envState.epoch !== epoch) return;
    isOpening = openOutcome !== "withdrawn";
    isAutoOpenPending = !isOpening;
    if (!isOpening && changeCount !== changeCountBefore) await maybeAutoOpen(hostApi);
  }
  async function noteMessagesChanged(hostApi) {
    hasTurnDiffs = turnDiffsOf(await hostApi.messages().catch(() => [])).length > 0;
    if (hasTurnDiffs) await maybeAutoOpen(hostApi);
  }
  function disarmAsk(hostApi) {
    armedAsk = null;
    model = {
      ...model,
      armedPath: null,
    };
    hostApi.status(undefined);
  }
  let actionsOf = (hostApi) => ({
    selectFile: (path) => {
      let isDock = model.placement === "dock";
      model = {
        ...model,
        selectedPath: path,
        dialogView: isDock ? model.dialogView : "detail",
        place: isDock ? placeAtFile(model, path) : model.place,
      };
      loadBodies(hostApi).catch(() => {
        return;
      });
      requestRedraw(hostApi);
    },
    scrollList: (delta) => {
      model = {
        ...model,
        place: listScrolledBy(model, delta),
      };
      requestRedraw(hostApi);
    },
    toggleNoise: () => {
      model = {
        ...model,
        isNoiseShown: !model.isNoiseShown,
      };
      loadBodies(hostApi);
      requestRedraw(hostApi);
    },
    togglePreSession: () => {
      model = {
        ...model,
        isPreSessionShown: !model.isPreSessionShown,
      };
      loadBodies(hostApi);
      requestRedraw(hostApi);
    },
    cycleBase: () => {
      let { baseModes, requestedMode } = model;
      let nextMode = baseModes[(baseModes.indexOf(requestedMode) + 1) % baseModes.length] ?? requestedMode;
      if (nextMode === requestedMode) return;
      model = {
        ...model,
        requestedMode: nextMode,
      };
      recorderOf(hostApi).mark(FEATURES.baseSwitch, {
        kind: "ok",
        props: {
          mode: {
            value: nextMode,
            of: model.baseModes,
          },
        },
      });
      let toplevel = model.data?.repository.toplevel;
      if (toplevel !== undefined)
        hostApi.storeSet(baseStoreKeyOf(toplevel), nextMode).catch(() => {
          return;
        });
      refreshDiff(hostApi, true);
      requestRedraw(hostApi);
    },
    chooseSource: (value) => {
      let index = Number(value);
      let source =
        value !== "current" && Number.isInteger(index)
          ? {
              kind: "turn",
              index,
            }
          : {
              kind: "current",
            };
      model = {
        ...model,
        source,
        selectedPath: null,
        dialogView: "list",
      };
      requestRedraw(hostApi);
    },
    toggleAsk: (path) => {
      if (armedAsk?.path === path) {
        disarmAsk(hostApi);
        requestRedraw(hostApi);
        return;
      }
      armAsk(hostApi, path);
    },
  });
  function armAsk(hostApi, path) {
    armedAsk = armedAskOf(
      path,
      pickedTurnOf(model)?.files.find((file) => file.path === path)?.hunks ??
        model.bodies.get(path)?.hunks ??
        [],
    );
    model = {
      ...model,
      armedPath: path,
    };
    hostApi.status(`${sanitizeName(path)} rides your next prompt (press ` + "asked \u2713 to drop it)");
    requestRedraw(hostApi);
  }
  async function readStartedAt(hostApi) {
    let startedAt = await hostApi.startedAt().catch(() => {
      return;
    });
    return typeof startedAt === "number" ? startedAt : null;
  }
  async function startSession(hostApi, cwd) {
    sessionStartMs = (await readStartedAt(hostApi)) ?? (await hostApi.now());
    envState.cwd = cwd;
    try {
      await hostApi.registerCommand(COMMAND_SPEC);
      host = hostApi;
    } catch (error) {
      let message = messageOf(error);
      if (!BUILTIN_HOLDS_PATTERN.test(message)) hostApi.uiLog(registerFailedTextOf(sanitizeName(message)));
    }
  }
  on("session.start", async (ctx, payload, next) => {
    await startSession(
      {
        now: () => ctx.clock.now(),
        after: (ms, fn) => ctx.clock.after(ms, fn),
        every: (ms, fn) => ctx.clock.every(ms, fn),
        run: (command, options) => ctx.process.run(command, options),
        stat: (path) => ctx.fs.stat(path),
        listDir: (dir) => ctx.fs.list(dir),
        readFile: (path) => ctx.fs.read(path),
        storeGet: (key) => ctx.store.get(key),
        storeSet: (key, value) => ctx.store.set(key, value),
        isCheckpointing: async () =>
          isEnvTruthy(await ctx.settings.read(), await ctx.env.get("CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING")),
        messages: () => ctx.session.messages(),
        invalidate: () => ctx.ui.invalidate("ui.render"),
        status: (text) => ctx.ui.status(text),
        uiLog: (text) => ctx.ui.log(text),
        openPane: (request) => ctx.ui.open(request),
        closePane: (request) => ctx.ui.close(request),
        registerCommand: (spec) => ctx.command.register(spec),
        sessionId: () => ctx.session.id(),
        startedAt: () => ctx.session.usage().then((usage) => (isRecord(usage) ? usage.startedAt : undefined)),
        mark: (mark) => ctx.telemetry.mark(mark),
        log: (event) => ctx.telemetry.log(event),
      },
      payload.cwd,
    );
    if (host)
      noteMessagesChanged(host).catch(() => {
        return;
      });
    return next(payload);
  });
  on(
    "ui.render",
    {
      component: "PromptHint",
    },
    (ctx, payload, next) => {
      if (isOnPaneSurface(payload)) {
        let { viewport } = payload;
        let firstViewport = terminalColumns === null && viewport?.columns !== undefined;
        terminalColumns = viewport?.columns ?? terminalColumns;
        model = {
          ...model,
          isFullscreen: viewport?.isFullscreen ?? model.isFullscreen,
        };
        if (firstViewport && hasTurnDiffs && host)
          maybeAutoOpen(host).catch(() => {
            return;
          });
      }
      return next(payload);
    },
  );
  on(
    "ui.render",
    {
      component: "Pane",
    },
    async (ctx, payload, next) => {
      if (payload.requestId !== PANE_ID || !host || !isOnPaneSurface(payload)) return next(payload);
      let { Box, Text, Button, Select, Code } = await ctx.ui.resolve(payload);
      terminalColumns = payload.viewport?.columns ?? terminalColumns;
      if (pendingOpenOutcome !== null) {
        let pendingTrigger = pendingOpenOutcome;
        pendingOpenOutcome = null;
        openAfterReady(host, pendingTrigger).catch(() => {
          return;
        });
      }
      let placementChanged = payload.props.placement !== model.placement;
      model = {
        ...model,
        placement: payload.props.placement,
        place: {
          ...model.place,
          columns: Math.max(1, payload.props.bodyColumns - PANE_RIGHT_PAD_COLUMNS),
          rows: payload.props.scroll.bodyRows,
        },
      };
      if (placementChanged)
        loadBodies(host).catch(() => {
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
          actions: actionsOf(host),
          columns: payload.props.bodyColumns,
          rows: payload.props.scroll.bodyRows,
        },
        model,
        {
          placement: payload.props.placement,
          terminalColumns,
        },
      );
    },
  );
  on(
    "command.run",
    {
      command: "diff",
    },
    async (ctx, payload, next) => {
      if (!host) return next(payload);
      let isEmptyRepo = (await ensureBackend(host)) || (await ensureBackend(host));
      if (!backend)
        return {
          text: isEmptyRepo ? NOT_IN_REPOSITORY_TEXT : GIT_UNANSWERED_TEXT,
        };
      let { isFullscreen } = payload.presentation;
      terminalColumns = payload.presentation.columns;
      model = {
        ...model,
        isFullscreen,
      };
      let toggle = paneToggleOf({
        isOpen: isPaneOpen,
        columns: isFullscreen ? terminalColumns : null,
      });
      if (toggle === "too-narrow")
        return {
          text: RESIZE_TERMINAL_TEXT,
        };
      let shouldOpen = toggle === "open";
      if (!shouldOpen) toggleGeneration += 1;
      let openOutcome = shouldOpen
        ? await openPane(host, "manual")
        : await closePane(host).then(() => "placed");
      if (openOutcome === "withdrawn")
        return {
          text: RESIZE_TERMINAL_TEXT,
        };
      if (openOutcome === "awaited")
        return {
          text: AWAITS_SURFACE_TEXT,
        };
      if (!isFullscreen)
        return shouldOpen
          ? {}
          : {
              text: DIALOG_DISMISSED_TEXT,
            };
      markTabSwitch(host, shouldOpen ? "diff" : "convo");
      await host.storeSet(STORE_OPEN_KEY, shouldOpen).catch(() => {
        return;
      });
      return {
        text: shouldOpen ? PANEL_SHOWN_TEXT : PANEL_HIDDEN_TEXT,
      };
    },
  );
  on(
    "ui.close",
    {
      id: PANE_ID,
    },
    async (ctx, payload, next) => {
      if (
        payload.origin.kind === "person" &&
        model.placement === "inline" &&
        model.dialogView === "detail" &&
        host
      ) {
        model = {
          ...model,
          dialogView: "list",
        };
        requestRedraw(host);
        lastPaneRows = dialogRowsOf(model);
        host
          .openPane({
            ...paneRequest(),
            focus: true,
          })
          .catch(() => {
            return;
          });
        return {
          deny: "back to the file list",
        };
      }
      let result = await next(payload);
      let isAllowed = result.deny === undefined;
      let fromPerson = isAllowed && payload.origin.kind === "person";
      if (isAllowed) {
        isPaneOpen = false;
        pendingOpenOutcome = null;
      }
      if (fromPerson) toggleGeneration += 1;
      let isInline = model.isFullscreen !== false;
      if (fromPerson && host && isInline) {
        markTabSwitch(host, "convo");
        await host.storeSet(STORE_OPEN_KEY, false).catch(() => {
          return;
        });
      }
      return result;
    },
  );
  on(
    "ui.focus",
    {
      plugin: PLUGIN_NAMES,
    },
    (ctx, payload, next) => {
      let focusResult =
        model.placement === "inline" && model.dialogView === "list" && host
          ? dialogFocusOf(model, payload.element)
          : null;
      if (focusResult === "stay") return {};
      if (!focusResult || !host) return next(payload);
      model = {
        ...model,
        selectedPath: focusResult.selectedPath,
      };
      loadBodies(host).catch(() => {
        return;
      });
      syncOpenPane(host);
      host.invalidate();
      return next({
        ...payload,
        element: focusResult.landing,
      });
    },
  );
  on(
    "ui.scroll",
    {
      requestId: PANE_ID,
    },
    (ctx, payload, next) => {
      if (!(payload.origin.kind === "person" && model.placement === "dock") || !host) return next(payload);
      let overList = isWheelOverList(model, payload);
      model = {
        ...model,
        place: overList ? listScrolledBy(model, payload.by) : bodyScrolledBy(model, payload),
      };
      host.invalidate();
      return {};
    },
  );
  on(
    "command.run",
    {
      command: ["clear", "resume"],
    },
    async (ctx, payload, next) => {
      let result = await next(payload);
      if (!host) return result;
      let isResume = payload.command === "resume";
      let shouldReopen = isIdle() && !isResume;
      if (isPaneOpen && isResume)
        await closePane(host).catch(() => {
          return;
        });
      resetSessionState();
      isOpening = false;
      isAutoOpenPending = false;
      isRestQueued = false;
      hasTurnDiffs = false;
      bodiesKey = null;
      bodiesBaseRef = null;
      loadedBodyPaths.clear();
      disarmAsk(host);
      model = afterNewSession(model);
      sessionStartMs = (await readStartedAt(host)) ?? (isResume ? sessionStartMs : await host.now());
      if (shouldReopen) await openAfterReady(host, "manual");
      if (isResume)
        noteMessagesChanged(host).catch(() => {
          return;
        });
      return result;
    },
  );
  function noteToolResult(hostApi, payload, result) {
    let any = CODE_EDITING_TOOLS.some((tool) => tool === payload.tool);
    let isEditingTool = any && result !== undefined && result.deny === undefined && result.isError !== true;
    let changedFiles = any ? isEditingTool : mayHaveWritten(result);
    if (changedFiles) changeCount += 1;
    if (changedFiles && isIdle()) scheduleRefresh(hostApi);
    if ((isEditingTool && payload.agentId === undefined) || (changedFiles && isAutoOpenPending))
      maybeAutoOpen(hostApi).catch(() => {
        return;
      });
  }
  on(
    "tool.call",
    {
      tool: [...CODE_EDITING_TOOLS, ...SHELL_TOOLS],
    },
    async (ctx, payload, next) => {
      let result;
      try {
        result = await next(payload);
        return result;
      } finally {
        if (host) noteToolResult(host, payload, result);
      }
    },
  );
  on("prompt.submit", async (ctx, payload, next) => {
    let ask = armedAsk;
    if (!host || !ask || lastAskedAsk === ask) return next(payload);
    let context = payload.context ?? [];
    let fittedText = fittedAskTextOf(
      ask.text,
      PROMPT_CONTEXT_MAX_CHARS - context.reduce((acc, part) => acc + part.length, 0),
    );
    if (fittedText === undefined) {
      disarmAsk(host);
      host.status(`${sanitizeName(ask.path)}'s diff did not fit in the prompt and was dropped`);
      requestRedraw(host);
      return next(payload);
    }
    lastAskedAsk = ask;
    try {
      let result = await next({
        ...payload,
        context: [...context, fittedText],
      });
      if (result.drop === undefined) {
        recorderOf(host).asked();
        if (armedAsk === ask) {
          disarmAsk(host);
          requestRedraw(host);
        }
      }
      return result;
    } finally {
      lastAskedAsk = null;
    }
  });
}
//@ chunk-c7hntn0y.js:64461-64483 placement
var STORE_ID; // deferred: uses INLINE_PLUGIN_MARKETPLACE (../../../utils/telemetry/pluginTelemetry.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-c7hntn0y.js:64461", () => {
  STORE_ID = `${CC_PLUGIN_DIFF}@${BUILTIN}`;
});
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
