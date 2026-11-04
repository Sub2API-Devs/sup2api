/**
 * plugins/bundled/diffPane/diffModel.ts
 *
 * 2.1.316 新增：diff 面板数据模型：空状态、文件编辑、回合、换行与代码块。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wyqg6m3h.js (48)
 * attribution: placement 48
 */
import { arrayOf, MAX_SUMMARY_ROWS } from "./hooks.js";
import { isRecord, untrackedWithheldTextOf, isNoiseFile } from "./constants.js";
import { countWhere, GIT_WORDS, GIT_BASE_MODES, adjustHunkLineNumbers } from "./diffSources.js";
import { cutHunks, displayPathOf, isBodyLine } from "./gitDiffRead.js";
import { todoProgressOf } from "../../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-wyqg6m3h.js:28722-28943 placement = adjustHunkLineNumbers (0.843)
/**
 * 从不可信数据中筛出形状合法的 hunks。
 */
var adjustHunkLineNumbers_2 = (structuredPatch) =>
  arrayOf(structuredPatch)
    .filter(isRecord)
    .flatMap((patch) => {
      let { oldStart, newStart, lines } = patch;
      return typeof oldStart === "number" && typeof newStart === "number" && Array.isArray(lines)
        ? [
            {
              oldStart,
              newStart,
              lines: arrayOf(lines).filter((line) => typeof line === "string"),
            },
          ]
        : [];
    });
//@ chunk-wyqg6m3h.js:28943-29469 placement
/**
 * 把 Edit/Write 结果转成文件变更显示数据（路径、hunks、是否新建）；暂存结果返回 null。
 */
function fileEditOf(result) {
  if (!isRecord(result) || typeof result.filePath !== "string") return null;
  if (result.staged === true) return null;
  let hunks = adjustHunkLineNumbers_2(result.structuredPatch);
  let isCreate = result.type === "create";
  if (hunks.length > 0) {
    let flattened = hunks.flatMap((hunk) => hunk.lines);
    return {
      path: result.filePath,
      hunks,
      added: countWhere(flattened, (line) => line.startsWith("+")),
      removed: countWhere(flattened, (line) => line.startsWith("-")),
      isNewFile: isCreate,
      isTruncated: false,
    };
  }
  if (!isCreate || typeof result.content !== "string") return null;
  let lines = result.content.split(`
`);
  return {
    path: result.filePath,
    hunks: [
      {
        oldStart: 0,
        newStart: 1,
        lines: lines.map((line) => `+${line}`),
      },
    ],
    added: lines.length,
    removed: 0,
    isNewFile: true,
    isTruncated: false,
  };
}
//@ chunk-wyqg6m3h.js:29469-29562 placement
var isPromptRow = (row) =>
  row.role === "user" && (row.toolResults === undefined || row.toolResults.length === 0) && row.text !== "";
//@ chunk-wyqg6m3h.js:29562-29572 placement
var PREVIEW_CHARS = 30;
//@ chunk-wyqg6m3h.js:29572-30069 placement
function turnOf(rows, index) {
  let text = rows[0]?.text ?? "";
  let preview =
    [...text].length <= PREVIEW_CHARS ? text : `${[...text].slice(0, PREVIEW_CHARS - 1).join("")}\u2026`;
  let filtered = rows
    .flatMap((row) => (row.role === "assistant" ? row.toolUses : []))
    .map((toolUse) => fileEditOf(toolUse.result))
    .filter((edit) => edit !== null);
  let byPath = new Map();
  for (let edit of filtered) {
    let existing = byPath.get(edit.path);
    byPath.set(
      edit.path,
      existing
        ? {
            path: edit.path,
            hunks: [...existing.hunks, ...edit.hunks],
            added: existing.added + edit.added,
            removed: existing.removed + edit.removed,
            isNewFile: existing.isNewFile || edit.isNewFile,
            isTruncated: false,
          }
        : edit,
    );
  }
  let files = [...byPath.values()].map((file) => ({
    ...file,
    ...cutHunks(file.hunks),
  }));
  return {
    index,
    preview,
    files,
  };
}
//@ chunk-wyqg6m3h.js:30069-30211 placement
function turnDiffsOf(rows) {
  let flattened = rows.flatMap((row, index) => (isPromptRow(row) ? [index] : []));
  return flattened
    .map((startIndex, index) => turnOf(rows.slice(startIndex, flattened[index + 1]), index + 1))
    .filter((turn) => turn.files.length > 0)
    .toReversed();
}
//@ chunk-wyqg6m3h.js:30211-30440 placement
function afterFetch(state, event) {
  let { outcome, messages } = event;
  let hasData = outcome.kind === "data";
  let isUnavailable = outcome.kind === "unavailable";
  let data = hasData ? outcome.data : isUnavailable ? state.data : null;
  return {
    ...state,
    isLoading: false,
    hasSettled: true,
    isOutsideRepository: outcome.kind === "no-repository",
    data,
    turns: turnDiffsOf(messages),
    todos: todoProgressOf(messages),
  };
}
//@ chunk-wyqg6m3h.js:30440-30455 placement
var NO_BODIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wyqg6m3h.js:30440", () => {
  NO_BODIES = new Map();
});
//@ chunk-wyqg6m3h.js:30455-30570 placement
var NEW_SESSION_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wyqg6m3h.js:30455", () => {
  NEW_SESSION_FIELDS = Object.freeze({
    selectedPath: null,
    source: Object.freeze({
      kind: "current",
    }),
    turns: Object.freeze([]),
    bodies: NO_BODIES,
  });
});
//@ chunk-wyqg6m3h.js:30570-30597 placement
var afterNewSession = (state) => ({
  ...state,
  ...NEW_SESSION_FIELDS,
});
//@ chunk-wyqg6m3h.js:30597-30673 placement
function baseModeOf(mode) {
  return mode === "session" || mode === "uncommitted" || mode === "branch" ? mode : null;
}
//@ chunk-wyqg6m3h.js:30673-30773 placement
function pickedTurnOf(state) {
  let { source } = state;
  let index = source.kind === "turn" ? source.index : null;
  return state.turns.find((turn) => turn.index === index);
}
//@ chunk-wyqg6m3h.js:30773-30857 placement
var turnTitleOf = (turn) => ({
  title: `Turn ${turn.index}`,
  subtitle: turn.preview === "" ? "" : `"${turn.preview}"`,
});
//@ chunk-wyqg6m3h.js:30857-31224 placement
function dialogTitleOf(state) {
  let turn = pickedTurnOf(state);
  let source = state.data?.source;
  let isUnborn = state.data?.isUnborn === true;
  let isBranch = source?.kind === "branch";
  function defaultTitle() {
    switch (true) {
      case isUnborn:
        return {
          title: "Staged and new files",
          subtitle: "(no commits yet)",
        };
      case isBranch && source?.kind === "branch":
        return {
          title: "Branch changes",
          subtitle: `(vs ${source.baseBranch})`,
        };
      default:
        return {
          title: "Uncommitted changes",
          subtitle: "(git diff HEAD)",
        };
    }
  }
  return turn ? turnTitleOf(turn) : defaultTitle();
}
//@ chunk-wyqg6m3h.js:31224-31984 placement
function emptyStateOf(state, filesCount) {
  let { data, words } = state;
  if (!data)
    return {
      headline: "Diff unavailable",
      hint: `Couldn't read the ${words.diffCommand} \u2014 it will retry on the ` + "next change",
    };
  if (filesCount > 0) return null;
  if (data.isUntrackedWithheld)
    return {
      headline: "No tracked changes",
      hint: untrackedWithheldTextOf(state),
    };
  if (data.isUnborn)
    return {
      headline: "No commits yet",
      hint: "Nothing to diff against until the repo's first commit",
    };
  switch (data.mode) {
    case "uncommitted":
      return {
        headline: "No uncommitted changes",
        hint: null,
      };
    case "branch":
      if (data.source.kind === "branch")
        return {
          headline: `No changes vs ${data.source.baseBranch}`,
          hint: null,
        };
      return {
        headline: `No changes vs ${data.source.base}`,
        hint: "No base branch to compare against \u2014 showing changes vs " + data.source.base,
      };
    case "session":
      return {
        headline: "No changes this session",
        hint: null,
      };
  }
}
//@ chunk-wyqg6m3h.js:31984-32239 placement
function headerTotalsOf(state, view) {
  let { stats, files } = state;
  let preSession = view.preSession;
  let filesCount = stats.filesCount - preSession.length;
  return {
    filesCount,
    linesAdded: stats.linesAdded - preSession.reduce((acc, file) => acc + file.added, 0),
    linesRemoved: stats.linesRemoved - preSession.reduce((acc, file) => acc + file.removed, 0),
    notShown: Math.max(0, filesCount - (files.length - preSession.length)),
  };
}
//@ chunk-wyqg6m3h.js:32239-32661 placement
var INITIAL_MODEL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wyqg6m3h.js:32239", () => {
  INITIAL_MODEL = Object.freeze({
    words: GIT_WORDS,
    baseModes: GIT_BASE_MODES,
    isLoading: false,
    hasSettled: false,
    isOutsideRepository: false,
    data: null,
    requestedMode: "session",
    selectedPath: null,
    isNoiseShown: false,
    isPreSessionShown: false,
    source: Object.freeze({
      kind: "current",
    }),
    turns: Object.freeze([]),
    bodies: NO_BODIES,
    todos: Object.freeze({
      done: 0,
      total: 0,
    }),
    armedPath: null,
    placement: "dock",
    isFullscreen: null,
    dialogView: "list",
    place: Object.freeze({
      top: 0,
      listStart: 0,
      columns: 0,
      rows: 0,
    }),
  });
});
//@ chunk-wyqg6m3h.js:32661-33102 placement
function modeLabelOf(requestedMode, view) {
  let { data } = view;
  let source = data?.source;
  let isStale = data !== null && view.requestedMode !== data.mode;
  let isRequested = requestedMode === view.requestedMode;
  let pendingMark = isRequested && isStale ? "\u2026" : "";
  let base = source?.kind === "working-tree" ? source.base : view.words.base;
  let isBranchNoBase = isRequested && !isStale && data?.mode === "branch";
  function label() {
    switch (requestedMode) {
      case "session":
        return "this session";
      case "uncommitted":
        return `uncommitted (vs ${base})`;
      case "branch":
        if (source?.kind === "branch") return `branch vs ${source.baseBranch}`;
        return isBranchNoBase ? `vs ${base} (no base branch)` : "branch diff";
    }
  }
  return `${label()}${pendingMark}`;
}
//@ chunk-wyqg6m3h.js:33102-33338 placement
function partitionOf(files, noiseFilter) {
  let sorted = [...files].sort((fileA, fileB) => displayPathOf(fileA).localeCompare(displayPathOf(fileB)));
  let preSession = sorted.filter((file) => file.isPreSession);
  let filtered = sorted.filter((file) => !file.isPreSession);
  let filtered_2 = filtered.filter((file) => !isNoiseFile(file.path));
  return {
    shown: noiseFilter === "shown" ? filtered : filtered_2,
    preSession,
    noiseCount: filtered.length - filtered_2.length,
  };
}
//@ chunk-wyqg6m3h.js:33338-33487 placement
var turnTotalsOf = (turn) => ({
  filesCount: turn.files.length,
  linesAdded: turn.files.reduce((acc, file) => acc + file.added, 0),
  linesRemoved: turn.files.reduce((acc, file) => acc + file.removed, 0),
  notShown: 0,
});
//@ chunk-wyqg6m3h.js:33487-33596 placement
function unbornNoteOf(state, filesCount) {
  return state.data?.isUnborn === true && filesCount > 0
    ? "no commits yet \u2014 showing staged and new files"
    : null;
}
//@ chunk-wyqg6m3h.js:33596-33672 placement
var ZERO_TOTALS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wyqg6m3h.js:33596", () => {
  ZERO_TOTALS = Object.freeze({
    filesCount: 0,
    linesAdded: 0,
    linesRemoved: 0,
    notShown: 0,
  });
});
//@ chunk-wyqg6m3h.js:33672-33830 placement
function listWindowOf(view, list) {
  let max = Math.max(0, Math.min(view.place.listStart, list.rows.length - MAX_SUMMARY_ROWS));
  let sliced = list.rows.slice(max, max + MAX_SUMMARY_ROWS);
  return {
    shown: sliced,
    above: max,
    below: list.rows.length - max - sliced.length,
  };
}
//@ chunk-wyqg6m3h.js:33830-33867 placement
var segmentRowsOf = (segment) => (segment.kind === "hunk" ? segment.rows : 1);
//@ chunk-wyqg6m3h.js:33867-33902 placement
var keptOf = (items) => items.filter((item) => item !== null);
//@ chunk-wyqg6m3h.js:33902-33915 placement
var MAX_BODY_CHARS = 80000;
//@ chunk-wyqg6m3h.js:33915-33927 placement
var MAX_BODY_NODES = 1500;
//@ chunk-wyqg6m3h.js:33927-33969 placement
var BODY_BUDGET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wyqg6m3h.js:33927", () => {
  BODY_BUDGET = Object.freeze({
    chars: MAX_BODY_CHARS,
    nodes: MAX_BODY_NODES,
  });
});
//@ chunk-wyqg6m3h.js:33969-34194 placement
function hunkHeaderOf(hunk) {
  let oldCount = countWhere(hunk.lines, (line) => !line.startsWith("+"));
  let newCount = countWhere(hunk.lines, (line) => !line.startsWith("-"));
  let oldEmpty = oldCount === 0;
  let newEmpty = newCount === 0;
  let oldStart = oldEmpty ? Math.max(0, hunk.oldStart - 1) : hunk.oldStart;
  let newStart = newEmpty ? Math.max(0, hunk.newStart - 1) : hunk.newStart;
  return `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`;
}
//@ chunk-wyqg6m3h.js:34194-34235 placement
var hunkSourceOf = (hunk) =>
  [hunkHeaderOf(hunk), ...hunk.lines].join(`
`);
//@ chunk-wyqg6m3h.js:34235-34409 placement
function leadingHunkOf(hunk, budget) {
  let used = 0;
  let lineCount = 0;
  for (let line of hunk.lines) {
    let header = hunkHeaderOf({
      ...hunk,
      lines: hunk.lines.slice(0, lineCount + 1),
    });
    used += 1 + line.length;
    if (header.length + used > budget) break;
    lineCount += 1;
  }
  return {
    ...hunk,
    lines: hunk.lines.slice(0, lineCount),
  };
}
//@ chunk-wyqg6m3h.js:34409-34420 placement
var MAX_CODE_CHARS = 1e4;
//@ chunk-wyqg6m3h.js:34420-34562 placement
function firstLineCut(hunk, width) {
  let [firstLine = ""] = hunk.lines;
  let sliced = firstLine.slice(
    0,
    Math.max(
      1,
      width -
        1 -
        hunkHeaderOf({
          ...hunk,
          lines: [firstLine],
        }).length,
    ),
  );
  return /[\uD800-\uDBFF]$/u.test(sliced) ? sliced.slice(0, -1) : sliced;
}
//@ chunk-wyqg6m3h.js:34562-34754 placement
function subHunksOf(hunk, width) {
  let hunks = [];
  let remainingHunk = hunk;
  let isTruncated = false;
  while (remainingHunk.lines.length > 0) {
    let leading = leadingHunkOf(remainingHunk, width);
    let isCut = leading.lines.length === 0;
    let piece = isCut
      ? {
          ...remainingHunk,
          lines: [firstLineCut(remainingHunk, width)],
        }
      : leading;
    hunks.push(piece);
    isTruncated ||= isCut;
    remainingHunk = adjustHunkLineNumbers(remainingHunk, piece.lines.length);
  }
  return {
    hunks,
    isTruncated,
  };
}
//@ chunk-wyqg6m3h.js:34754-34765 placement
var FIRST_WIDE_POINT = 768;
//@ chunk-wyqg6m3h.js:34765-34974 placement
var WIDE_RANGES = [
  [4352, 4447],
  [11904, 12350],
  [12353, 13311],
  [13312, 19903],
  [19968, 40959],
  [40960, 42191],
  [44032, 55203],
  [63744, 64255],
  [65072, 65103],
  [65280, 65376],
  [65504, 65510],
  [127744, 128591],
  [129280, 129535],
  [131072, 262141],
];
//@ chunk-wyqg6m3h.js:34974-35031 placement
var ZERO_WIDTH_RANGES = [
  [768, 879],
  [8203, 8207],
  [65024, 65039],
  [8400, 8447],
];
//@ chunk-wyqg6m3h.js:35031-35185 placement
function cellWidth(text) {
  let width = 0;
  for (let char of text) {
    let codePoint = char.codePointAt(0) ?? 0;
    let isInRange = ([rangeStart, rangeEnd]) => codePoint >= rangeStart && codePoint <= rangeEnd;
    let isNarrow = codePoint < FIRST_WIDE_POINT;
    let isZeroWidth = !isNarrow && ZERO_WIDTH_RANGES.some(isInRange);
    let isWide = !isNarrow && !isZeroWidth && WIDE_RANGES.some(isInRange);
    width += isZeroWidth ? 0 : isWide ? 2 : 1;
  }
  return width;
}
//@ chunk-wyqg6m3h.js:35185-35253 placement
function chargedWidth(text) {
  let width = 0;
  for (let char of text) width += Math.max(1, cellWidth(char));
  return width;
}
//@ chunk-wyqg6m3h.js:35253-35308 placement
var padEnd = (text, width) => `${text}${" ".repeat(Math.max(0, width - chargedWidth(text)))}`;
//@ chunk-wyqg6m3h.js:35308-35350 placement
var plural = (count, noun) => (count === 1 ? `1 ${noun}` : `${count} ${noun}s`);
//@ chunk-wyqg6m3h.js:35350-35359 placement
var TAB_WIDTH = 4;
//@ chunk-wyqg6m3h.js:35359-35468 placement
var sanitizeLine = (text) =>
  text
    .replaceAll("\t", " ".repeat(TAB_WIDTH))
    .replace(/[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "");
//@ chunk-wyqg6m3h.js:35468-35485 placement
var sanitizeName = (name) => sanitizeLine(name);
//@ chunk-wyqg6m3h.js:35485-35634 placement
function truncateStart(text, width) {
  if (chargedWidth(text) <= width) return text;
  let chars = [...text];
  let kept = "";
  for (let i = chars.length - 1; i >= 0; i--) {
    let candidate = `${chars[i]}${kept}`;
    if (chargedWidth(candidate) + 1 > width) break;
    kept = candidate;
  }
  return `\u2026${kept}`;
}
//@ chunk-wyqg6m3h.js:35634-36123 placement
function wrappedLines(text, columns) {
  let max = Math.max(1, columns);
  let lines = [""];
  let parts = text.split(" ");
  for (let [wordIndex, word] of parts.entries()) {
    let wordWidth = cellWidth(word);
    let lineWidth = cellWidth(lines[lines.length - 1] ?? "");
    if (wordIndex !== 0) {
      if (lineWidth >= max) {
        lines.push("");
        lineWidth = 0;
      }
      lines[lines.length - 1] += " ";
      lineWidth += 1;
    }
    if (wordWidth > max) {
      let extraLines = 1 + Math.floor((wordWidth - (max - lineWidth) - 1) / max);
      if (Math.floor((wordWidth - 1) / max) < extraLines) lines.push("");
      let chars = [...word];
      let currentWidth = cellWidth(lines[lines.length - 1] ?? "");
      for (let [charIndex, char] of chars.entries()) {
        let charWidth = cellWidth(char);
        if (currentWidth + charWidth <= max) lines[lines.length - 1] += char;
        else {
          lines.push(char);
          currentWidth = 0;
        }
        currentWidth += charWidth;
        if (currentWidth === max && charIndex < chars.length - 1) {
          lines.push("");
          currentWidth = 0;
        }
      }
      continue;
    }
    if (lineWidth + wordWidth > max && lineWidth > 0 && wordWidth > 0) lines.push("");
    lines[lines.length - 1] += word;
  }
  return lines;
}
//@ chunk-wyqg6m3h.js:36123-36190 placement
var drawnLineOf = (line) => line.slice(0, 1) + line.slice(1).split("\t").map(sanitizeLine).join("\t");
//@ chunk-wyqg6m3h.js:36190-36666 placement
function codeBlocksOf(hunks, budget) {
  let sources = [];
  let charsUsed = 0;
  let isTruncated = false;
  let room = () => ({
    chars: budget.chars - charsUsed,
    nodes: budget.nodes - sources.length,
  });
  for (let hunk of hunks) {
    let lines = hunk.lines.filter(isBodyLine).map(drawnLineOf);
    let split = subHunksOf(
      {
        ...hunk,
        lines,
      },
      MAX_CODE_CHARS,
    );
    isTruncated ||= split.isTruncated;
    for (let hunk of split.hunks) {
      let remainingChars = budget.chars - charsUsed;
      let piece = hunkSourceOf(hunk).length <= remainingChars ? hunk : leadingHunkOf(hunk, remainingChars);
      if (sources.length + 1 > budget.nodes || piece.lines.length === 0)
        return {
          sources,
          isTruncated: true,
          room: room(),
        };
      let source = hunkSourceOf(piece);
      sources.push(source);
      charsUsed += source.length;
      if (piece.lines.length < hunk.lines.length)
        return {
          sources,
          isTruncated: true,
          room: room(),
        };
    }
  }
  return {
    sources,
    isTruncated,
    room: room(),
  };
}
export {
  sanitizeName,
  BODY_BUDGET,
  FIRST_WIDE_POINT,
  INITIAL_MODEL,
  MAX_BODY_CHARS,
  MAX_BODY_NODES,
  MAX_CODE_CHARS,
  NEW_SESSION_FIELDS,
  NO_BODIES,
  PREVIEW_CHARS,
  TAB_WIDTH,
  WIDE_RANGES,
  ZERO_TOTALS,
  ZERO_WIDTH_RANGES,
  afterFetch,
  afterNewSession,
  baseModeOf,
  cellWidth,
  chargedWidth,
  codeBlocksOf,
  dialogTitleOf,
  drawnLineOf,
  emptyStateOf,
  fileEditOf,
  firstLineCut,
  headerTotalsOf,
  hunkHeaderOf,
  hunkSourceOf,
  adjustHunkLineNumbers_2,
  isPromptRow,
  keptOf,
  leadingHunkOf,
  listWindowOf,
  modeLabelOf,
  padEnd,
  partitionOf,
  pickedTurnOf,
  plural,
  sanitizeLine,
  segmentRowsOf,
  subHunksOf,
  truncateStart,
  turnDiffsOf,
  turnOf,
  turnTitleOf,
  turnTotalsOf,
  unbornNoteOf,
  wrappedLines,
};
