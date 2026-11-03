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

//@ chunk-wyqg6m3h.js:28722-28943 placement = adjustHunkLineNumbers (0.843)
/**
 * 从不可信数据中筛出形状合法的 hunks。
 */
var adjustHunkLineNumbers_2 = (structuredPatch) =>
  arrayOf(structuredPatch)
    .filter(isRecord)
    .flatMap((o) => {
      let { oldStart, newStart, lines } = o;
      return typeof oldStart === "number" && typeof newStart === "number" && Array.isArray(lines)
        ? [
            {
              oldStart,
              newStart,
              lines: arrayOf(lines).filter((i) => typeof i === "string"),
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
  let o = adjustHunkLineNumbers_2(result.structuredPatch);
  let r = result.type === "create";
  if (o.length > 0) {
    let flattened = o.flatMap((a) => a.lines);
    return {
      path: result.filePath,
      hunks: o,
      added: countWhere(flattened, (a) => a.startsWith("+")),
      removed: countWhere(flattened, (a) => a.startsWith("-")),
      isNewFile: r,
      isTruncated: false,
    };
  }
  if (!r || typeof result.content !== "string") return null;
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
var isPromptRow = (e) =>
  e.role === "user" && (e.toolResults === undefined || e.toolResults.length === 0) && e.text !== "";
//@ chunk-wyqg6m3h.js:29562-29572 placement
var PREVIEW_CHARS = 30;
//@ chunk-wyqg6m3h.js:29572-30069 placement
function turnOf(e, index) {
  let text = e[0]?.text ?? "";
  let preview =
    [...text].length <= PREVIEW_CHARS ? text : `${[...text].slice(0, PREVIEW_CHARS - 1).join("")}\u2026`;
  let filtered = e
    .flatMap((l) => (l.role === "assistant" ? l.toolUses : []))
    .map((l) => fileEditOf(l.result))
    .filter((l) => l !== null);
  let i = new Map();
  for (let l of filtered) {
    let y = i.get(l.path);
    i.set(
      l.path,
      y
        ? {
            path: l.path,
            hunks: [...y.hunks, ...l.hunks],
            added: y.added + l.added,
            removed: y.removed + l.removed,
            isNewFile: y.isNewFile || l.isNewFile,
            isTruncated: false,
          }
        : l,
    );
  }
  let files = [...i.values()].map((l) => ({
    ...l,
    ...cutHunks(l.hunks),
  }));
  return {
    index,
    preview,
    files,
  };
}
//@ chunk-wyqg6m3h.js:30069-30211 placement
function turnDiffsOf(e) {
  let flattened = e.flatMap((r, s) => (isPromptRow(r) ? [s] : []));
  return flattened
    .map((r, s) => turnOf(e.slice(r, flattened[s + 1]), s + 1))
    .filter((r) => r.files.length > 0)
    .toReversed();
}
//@ chunk-wyqg6m3h.js:30211-30440 placement
function afterFetch(e, o) {
  let { outcome, messages } = o;
  let n = outcome.kind === "data";
  let a = outcome.kind === "unavailable";
  let data = n ? outcome.data : a ? e.data : null;
  return {
    ...e,
    isLoading: false,
    hasSettled: true,
    isOutsideRepository: outcome.kind === "no-repository",
    data,
    turns: turnDiffsOf(messages),
    todos: todoProgressOf(messages),
  };
}
//@ chunk-wyqg6m3h.js:30440-30455 placement
var NO_BODIES = new Map();
//@ chunk-wyqg6m3h.js:30455-30570 placement
var NEW_SESSION_FIELDS = Object.freeze({
  selectedPath: null,
  source: Object.freeze({
    kind: "current",
  }),
  turns: Object.freeze([]),
  bodies: NO_BODIES,
});
//@ chunk-wyqg6m3h.js:30570-30597 placement
var afterNewSession = (e) => ({
  ...e,
  ...NEW_SESSION_FIELDS,
});
//@ chunk-wyqg6m3h.js:30597-30673 placement
function baseModeOf(e) {
  return e === "session" || e === "uncommitted" || e === "branch" ? e : null;
}
//@ chunk-wyqg6m3h.js:30673-30773 placement
function pickedTurnOf(e) {
  let { source } = e;
  let index = source.kind === "turn" ? source.index : null;
  return e.turns.find((turn) => turn.index === index);
}
//@ chunk-wyqg6m3h.js:30773-30857 placement
var turnTitleOf = (e) => ({
  title: `Turn ${e.index}`,
  subtitle: e.preview === "" ? "" : `"${e.preview}"`,
});
//@ chunk-wyqg6m3h.js:30857-31224 placement
function dialogTitleOf(e) {
  let o = pickedTurnOf(e);
  let source = e.data?.source;
  let s = e.data?.isUnborn === true;
  let n = source?.kind === "branch";
  function a() {
    switch (true) {
      case s:
        return {
          title: "Staged and new files",
          subtitle: "(no commits yet)",
        };
      case n && source?.kind === "branch":
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
  return o ? turnTitleOf(o) : a();
}
//@ chunk-wyqg6m3h.js:31224-31984 placement
function emptyStateOf(e, filesCount) {
  let { data: r, words } = e;
  if (!r)
    return {
      headline: "Diff unavailable",
      hint: `Couldn't read the ${words.diffCommand} \u2014 it will retry on the ` + "next change",
    };
  if (filesCount > 0) return null;
  if (r.isUntrackedWithheld)
    return {
      headline: "No tracked changes",
      hint: untrackedWithheldTextOf(e),
    };
  if (r.isUnborn)
    return {
      headline: "No commits yet",
      hint: "Nothing to diff against until the repo's first commit",
    };
  switch (r.mode) {
    case "uncommitted":
      return {
        headline: "No uncommitted changes",
        hint: null,
      };
    case "branch":
      if (r.source.kind === "branch")
        return {
          headline: `No changes vs ${r.source.baseBranch}`,
          hint: null,
        };
      return {
        headline: `No changes vs ${r.source.base}`,
        hint: "No base branch to compare against \u2014 showing changes vs " + r.source.base,
      };
    case "session":
      return {
        headline: "No changes this session",
        hint: null,
      };
  }
}
//@ chunk-wyqg6m3h.js:31984-32239 placement
function headerTotalsOf(e, o) {
  let { stats, files } = e;
  let preSession = o.preSession;
  let a = stats.filesCount - preSession.length;
  return {
    filesCount: a,
    linesAdded: stats.linesAdded - preSession.reduce((acc, p) => acc + p.added, 0),
    linesRemoved: stats.linesRemoved - preSession.reduce((acc, p) => acc + p.removed, 0),
    notShown: Math.max(0, a - (files.length - preSession.length)),
  };
}
//@ chunk-wyqg6m3h.js:32239-32661 placement
var INITIAL_MODEL = Object.freeze({
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
//@ chunk-wyqg6m3h.js:32661-33102 placement
function modeLabelOf(requestedMode, o) {
  let { data: r } = o;
  let source = r?.source;
  let n = r !== null && o.requestedMode !== r.mode;
  let a = requestedMode === o.requestedMode;
  let i = a && n ? "\u2026" : "";
  let base = source?.kind === "working-tree" ? source.base : o.words.base;
  let l = a && !n && r?.mode === "branch";
  function y() {
    switch (requestedMode) {
      case "session":
        return "this session";
      case "uncommitted":
        return `uncommitted (vs ${base})`;
      case "branch":
        if (source?.kind === "branch") return `branch vs ${source.baseBranch}`;
        return l ? `vs ${base} (no base branch)` : "branch diff";
    }
  }
  return `${y()}${i}`;
}
//@ chunk-wyqg6m3h.js:33102-33338 placement
function partitionOf(files, o) {
  let sorted = [...files].sort((i, p) => displayPathOf(i).localeCompare(displayPathOf(p)));
  let preSession = sorted.filter((i) => i.isPreSession);
  let filtered = sorted.filter((i) => !i.isPreSession);
  let filtered_2 = filtered.filter((i) => !isNoiseFile(i.path));
  return {
    shown: o === "shown" ? filtered : filtered_2,
    preSession,
    noiseCount: filtered.length - filtered_2.length,
  };
}
//@ chunk-wyqg6m3h.js:33338-33487 placement
var turnTotalsOf = (e) => ({
  filesCount: e.files.length,
  linesAdded: e.files.reduce((acc, file) => acc + file.added, 0),
  linesRemoved: e.files.reduce((acc, file) => acc + file.removed, 0),
  notShown: 0,
});
//@ chunk-wyqg6m3h.js:33487-33596 placement
function unbornNoteOf(e, filesCount) {
  return e.data?.isUnborn === true && filesCount > 0
    ? "no commits yet \u2014 showing staged and new files"
    : null;
}
//@ chunk-wyqg6m3h.js:33596-33672 placement
var ZERO_TOTALS = Object.freeze({
  filesCount: 0,
  linesAdded: 0,
  linesRemoved: 0,
  notShown: 0,
});
//@ chunk-wyqg6m3h.js:33672-33830 placement
function listWindowOf(e, o) {
  let max = Math.max(0, Math.min(e.place.listStart, o.rows.length - MAX_SUMMARY_ROWS));
  let sliced = o.rows.slice(max, max + MAX_SUMMARY_ROWS);
  return {
    shown: sliced,
    above: max,
    below: o.rows.length - max - sliced.length,
  };
}
//@ chunk-wyqg6m3h.js:33830-33867 placement
var segmentRowsOf = (e) => (e.kind === "hunk" ? e.rows : 1);
//@ chunk-wyqg6m3h.js:33867-33902 placement
var keptOf = (e) => e.filter((o) => o !== null);
//@ chunk-wyqg6m3h.js:33902-33915 placement
var MAX_BODY_CHARS = 80000;
//@ chunk-wyqg6m3h.js:33915-33927 placement
var MAX_BODY_NODES = 1500;
//@ chunk-wyqg6m3h.js:33927-33969 placement
var BODY_BUDGET = Object.freeze({
  chars: MAX_BODY_CHARS,
  nodes: MAX_BODY_NODES,
});
//@ chunk-wyqg6m3h.js:33969-34194 placement
function hunkHeaderOf(e) {
  let o = countWhere(e.lines, (p) => !p.startsWith("+"));
  let r = countWhere(e.lines, (p) => !p.startsWith("-"));
  let s = o === 0;
  let n = r === 0;
  let a = s ? Math.max(0, e.oldStart - 1) : e.oldStart;
  let i = n ? Math.max(0, e.newStart - 1) : e.newStart;
  return `@@ -${a},${o} +${i},${r} @@`;
}
//@ chunk-wyqg6m3h.js:34194-34235 placement
var hunkSourceOf = (e) =>
  [hunkHeaderOf(e), ...e.lines].join(`
`);
//@ chunk-wyqg6m3h.js:34235-34409 placement
function leadingHunkOf(e, o) {
  let r = 0;
  let s = 0;
  for (let line of e.lines) {
    let a = hunkHeaderOf({
      ...e,
      lines: e.lines.slice(0, s + 1),
    });
    r += 1 + line.length;
    if (a.length + r > o) break;
    s += 1;
  }
  return {
    ...e,
    lines: e.lines.slice(0, s),
  };
}
//@ chunk-wyqg6m3h.js:34409-34420 placement
var MAX_CODE_CHARS = 1e4;
//@ chunk-wyqg6m3h.js:34420-34562 placement
function firstLineCut(e, o) {
  let [r = ""] = e.lines;
  let sliced = r.slice(
    0,
    Math.max(
      1,
      o -
        1 -
        hunkHeaderOf({
          ...e,
          lines: [r],
        }).length,
    ),
  );
  return /[\uD800-\uDBFF]$/u.test(sliced) ? sliced.slice(0, -1) : sliced;
}
//@ chunk-wyqg6m3h.js:34562-34754 placement
function subHunksOf(e, o) {
  let r = [];
  let hunks = e;
  let isTruncated = false;
  while (hunks.lines.length > 0) {
    let a = leadingHunkOf(hunks, o);
    let i = a.lines.length === 0;
    let p = i
      ? {
          ...hunks,
          lines: [firstLineCut(hunks, o)],
        }
      : a;
    r.push(p);
    isTruncated ||= i;
    hunks = adjustHunkLineNumbers(hunks, p.lines.length);
  }
  return {
    hunks: r,
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
function cellWidth(e) {
  let o = 0;
  for (let r of e) {
    let s = r.codePointAt(0) ?? 0;
    let n = ([l, y]) => s >= l && s <= y;
    let a = s < FIRST_WIDE_POINT;
    let i = !a && ZERO_WIDTH_RANGES.some(n);
    let p = !a && !i && WIDE_RANGES.some(n);
    o += i ? 0 : p ? 2 : 1;
  }
  return o;
}
//@ chunk-wyqg6m3h.js:35185-35253 placement
function chargedWidth(e) {
  let o = 0;
  for (let r of e) o += Math.max(1, cellWidth(r));
  return o;
}
//@ chunk-wyqg6m3h.js:35253-35308 placement
var padEnd = (e, o) => `${e}${" ".repeat(Math.max(0, o - chargedWidth(e)))}`;
//@ chunk-wyqg6m3h.js:35308-35350 placement
var plural = (e, o) => (e === 1 ? `1 ${o}` : `${e} ${o}s`);
//@ chunk-wyqg6m3h.js:35350-35359 placement
var TAB_WIDTH = 4;
//@ chunk-wyqg6m3h.js:35359-35468 placement
var sanitizeLine = (e) =>
  e.replaceAll("\t", " ".repeat(TAB_WIDTH)).replace(/[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]/gu, "");
//@ chunk-wyqg6m3h.js:35468-35485 placement
var sanitizeName = (e) => sanitizeLine(e);
//@ chunk-wyqg6m3h.js:35485-35634 placement
function truncateStart(e, o) {
  if (chargedWidth(e) <= o) return e;
  let r = [...e];
  let s = "";
  for (let i = r.length - 1; i >= 0; i--) {
    let a = `${r[i]}${s}`;
    if (chargedWidth(a) + 1 > o) break;
    s = a;
  }
  return `\u2026${s}`;
}
//@ chunk-wyqg6m3h.js:35634-36123 placement
function wrappedLines(e, columns) {
  let max = Math.max(1, columns);
  let s = [""];
  let parts = e.split(" ");
  for (let [a, i] of parts.entries()) {
    let p = cellWidth(i);
    let l = cellWidth(s[s.length - 1] ?? "");
    if (a !== 0) {
      if (l >= max) {
        s.push("");
        l = 0;
      }
      s[s.length - 1] += " ";
      l += 1;
    }
    if (p > max) {
      let y = 1 + Math.floor((p - (max - l) - 1) / max);
      if (Math.floor((p - 1) / max) < y) s.push("");
      let d = [...i];
      let T = cellWidth(s[s.length - 1] ?? "");
      for (let [w, R] of d.entries()) {
        let O = cellWidth(R);
        if (T + O <= max) s[s.length - 1] += R;
        else {
          s.push(R);
          T = 0;
        }
        T += O;
        if (T === max && w < d.length - 1) {
          s.push("");
          T = 0;
        }
      }
      continue;
    }
    if (l + p > max && l > 0 && p > 0) s.push("");
    s[s.length - 1] += i;
  }
  return s;
}
//@ chunk-wyqg6m3h.js:36123-36190 placement
var drawnLineOf = (e) => e.slice(0, 1) + e.slice(1).split("\t").map(sanitizeLine).join("\t");
//@ chunk-wyqg6m3h.js:36190-36666 placement
function codeBlocksOf(e, o) {
  let r = [];
  let s = 0;
  let isTruncated = false;
  let a = () => ({
    chars: o.chars - s,
    nodes: o.nodes - r.length,
  });
  for (let i of e) {
    let lines = i.lines.filter(isBodyLine).map(drawnLineOf);
    let l = subHunksOf(
      {
        ...i,
        lines,
      },
      MAX_CODE_CHARS,
    );
    isTruncated ||= l.isTruncated;
    for (let hunk of l.hunks) {
      let d = o.chars - s;
      let w = hunkSourceOf(hunk).length <= d ? hunk : leadingHunkOf(hunk, d);
      if (r.length + 1 > o.nodes || w.lines.length === 0)
        return {
          sources: r,
          isTruncated: true,
          room: a(),
        };
      let O = hunkSourceOf(w);
      r.push(O);
      s += O.length;
      if (w.lines.length < hunk.lines.length)
        return {
          sources: r,
          isTruncated: true,
          room: a(),
        };
    }
  }
  return {
    sources: r,
    isTruncated,
    room: a(),
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
