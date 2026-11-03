/**
 * components/HistorySearchDialog.tsx
 *
 * Ctrl+R 历史搜索对话框（全屏版本）：扫描 prompt 历史、模糊匹配、显示扫描状态（Loading/Searching older prompts/No history yet）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/HistorySearchDialog.tsx
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: sole-consumer 1, affinity 2, fingerprint 1
 */
import { useRegisterOverlay } from "../context/overlayContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { Me } from "./design-system/ThemeProvider.js";
import { y, R, P, Q } from "../../vendor/react/cjs/react.production.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { getTimestampedHistory, isTransientHistoryReadError, HISTORY_SCOPES } from "../history.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { logError } from "../utils/log.js";
import { useShortcutDisplay } from "../keybindings/useKeybindingDisplay.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FuzzyPicker } from "./design-system/FuzzyPicker.js";
import { Text, Box } from "../ink/components/Text.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { EDITOR_MODES } from "../utils/configConstants.js";
import { formatRelativeTimeAgo, truncateToWidth } from "../utils/format.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { wrapAnsi } from "../ink/wrapAnsi.js";
import { OverflowHint } from "./CtrlOToExpand.js";

//@ chunk-18hwfzwa.js:662972-663022 sole-consumer
var HISTORY_DIALOG_VISIBLE_ROWS = 6,
  AGe = 8,
  k2t = 16777216,
  v2t = 256,
  C2t = 100,
  _2t = 4;
//@ chunk-18hwfzwa.js:663022-663303 affinity
function getHistoryScanStatusText(h, x) {
  if (!h) return "Loading\u2026";
  let trimmed = x.trim();
  switch (h.status) {
    case "failed":
      return "Couldn't read prompt history";
    case "scanning":
      return trimmed ? "Searching older prompts\u2026" : "No history yet";
    case "complete":
    case "truncated":
      return trimmed ? "No matching prompts" : "No history yet";
  }
}
/**
 * 全屏历史搜索对话框：列出匹配的历史 prompt（fuzzy），显示扫描进度与截断状态，选中后回填。
 */
//@ chunk-18hwfzwa.js:663303-666723 fingerprint = HistorySearchDialog (0.528)
function HistorySearchDialog({ initialQuery: initialQuery, onSelect: onSelect, onCancel: onCancel }) {
  useRegisterOverlay("history-search");
  let { columns: columns } = useTerminalSize(),
    { storageV5: storageV5 } = Me(),
    [ke, Re] = y("everywhere"),
    [Be, He] = y(null),
    [We, ze] = y(initialQuery ?? ""),
    Xe = R({});
  (P(() => {
    logFeatureOk("history_search_open");
  }, []),
    P(() => {
      let Dt = Xe.current[ke];
      if (Dt) {
        He(Dt);
        return;
      }
      He(null);
      let Lt = !1,
        oo = [];
      return (
        (async () => {
          try {
            let Xt = getTimestampedHistory(ke, storageV5),
              io = 0,
              so = C2t,
              po = !1;
            for await (let entry of Xt) {
              if (Lt) return;
              let { display: display, expandedDisplay: expandedDisplay } = entry,
                index = display.indexOf(`
`),
                lower = display.toLowerCase();
              if (
                (oo.push({
                  entry: entry,
                  lower: lower,
                  expandedLower: expandedDisplay === display ? lower : expandedDisplay.toLowerCase(),
                  firstLine: index === -1 ? display : display.slice(0, index),
                }),
                (io += entry.textLength + v2t),
                io >= k2t)
              ) {
                po = !0;
                break;
              }
              if (oo.length >= so) (He({ items: oo.slice(), status: "scanning" }), (so *= _2t));
            }
            if (!Lt) {
              let ao = { items: oo, status: po ? "truncated" : "complete" };
              if (((Xe.current[ke] = ao), He(ao), po))
                logFeatureSad("history_search_scan", "text_limit_reached");
              else logFeatureOk("history_search_scan");
            }
          } catch (error) {
            if (!Lt)
              if (oo.length > 0)
                (He({ items: oo, status: "truncated" }),
                  logFeatureSad("history_search_scan", "picker_scan_interrupted"));
              else
                (He({ items: [], status: "failed" }),
                  logFeatureBad("history_search_scan", "picker_scan_failed"));
            if (isTransientHistoryReadError(error))
              logForDebugging(`History picker read failed: ${errorMessage(error)}`, { level: "error" });
            else logError(error);
          }
        })(),
        () => {
          Lt = !0;
        }
      );
    }, [ke, storageV5]));
  let rt = useShortcutDisplay("historySearch:cycleScope", "HistorySearch", "ctrl+s");
  useKeybinding(
    "historySearch:cycleScope",
    () => {
      let index = HISTORY_SCOPES.indexOf(ke),
        Lt = HISTORY_SCOPES[(index + 1) % HISTORY_SCOPES.length];
      (Re(Lt), logEvent("tengu_history_picker_scope", { from: fromEnum(ke), to: fromEnum(Lt) }));
    },
    { context: "HistorySearch" },
  );
  let filtered = Q(() => {
      if (!Be) return [];
      let items = Be.items,
        lower = We.trim().toLowerCase();
      if (!lower) return items;
      let oo = Be.status === "scanning",
        Xt = [],
        io = [];
      for (let item of items)
        if (item.lower.includes(lower) || item.expandedLower.includes(lower)) Xt.push(item);
        else if (!oo && fuzzyMatchScore(item.lower, lower)) io.push(item);
      return Xt.concat(io);
    }, [Be, We]),
    At = columns >= 100,
    It = At ? Math.floor((columns - 6) * 0.5) : columns - 6,
    rowWidth = Math.max(20, It - AGe - 1),
    Et = At ? Math.max(20, columns - It - 12) : Math.max(20, columns - 10);
  return e(FuzzyPicker, {
    title: r(Text, {
      children: [
        "Search prompts ",
        r(Text, { color: "suggestion", children: ["\xB7 ", ke] }),
        Be?.status === "truncated" &&
          r(Text, {
            dimColor: !0,
            children: [" ", "\xB7 newest ", Be.items.length.toLocaleString(), " only"],
          }),
      ],
    }),
    placeholder: "Filter history\u2026",
    initialQuery: initialQuery,
    items: filtered,
    getKey: (item_0) => String(item_0.entry.timestamp),
    onQueryChange: ze,
    onSelect: (item_1) => {
      (logEvent("tengu_history_picker_select", { result_count: filtered.length, query_length: We.length }),
        item_1.entry.resolve().then(
          (q_0) => {
            (logFeatureOk("history_search_accept"), onSelect(q_0));
          },
          (Lt) => {
            throw (logFeatureBad("history_search_accept", "accept_resolve_failed"), Lt);
          },
        ));
    },
    onCancel: onCancel,
    resetKey: ke,
    extraHints: (Dt) => [
      rt && e(KeyboardShortcutHint, { chord: rt, action: "scope", ...Dt }, "scope"),
      EDITOR_MODES() && r(Text, { children: [Dt.terse ? "esc" : "Esc", " i / for slash commands"] }, "vim"),
    ],
    emptyMessage: (Dt) => getHistoryScanStatusText(Be, Dt),
    selectAction: "use",
    direction: "up",
    previewPosition: At ? "right" : "bottom",
    renderItem: (item_2, isFocused) => {
      let oo = formatRelativeTimeAgo(new Date(item_2.entry.timestamp));
      return r(Text, {
        children: [
          r(Text, { dimColor: !0, children: [oo, " ".repeat(Math.max(0, AGe - bunStringWidth(oo)))] }),
          r(Text, {
            color: isFocused ? "suggestion" : void 0,
            children: [" ", truncateToWidth(item_2.firstLine, rowWidth)],
          }),
        ],
      });
    },
    renderPreview: (item_3) => {
      let wrapped = item_3.entry.expandedDisplay
          .split(
            `
`,
          )
          .filter((Ao) => Ao.trim() !== ""),
        sliced = wrapped.slice(0, HISTORY_DIALOG_VISIBLE_ROWS),
        mapped = sliced.map((Ao) => truncateToLength(Ao, Et * HISTORY_DIALOG_VISIBLE_ROWS)),
        filtered = wrapAnsi(
          mapped.join(`
`),
          Et,
          { hard: !0 },
        )
          .split(
            `
`,
          )
          .filter((Ao) => Ao.trim() !== ""),
        reduced = sliced.reduce((Ao, Bo, Ro) => Ao + Math.ceil((Bo.length - mapped[Ro].length) / Et), 0),
        po = wrapped.length - sliced.length + reduced,
        ao = filtered.length > HISTORY_DIALOG_VISIBLE_ROWS || po > 0,
        shown = filtered.slice(0, ao ? HISTORY_DIALOG_VISIBLE_ROWS - 1 : HISTORY_DIALOG_VISIBLE_ROWS),
        bo = filtered.length - shown.length + po;
      return r(Box, {
        flexDirection: "column",
        borderStyle: "round",
        borderDimColor: !0,
        paddingX: 1,
        height: HISTORY_DIALOG_VISIBLE_ROWS + 2,
        children: [
          shown.map((row, Bo) => e(Text, { dimColor: !0, children: row }, Bo)),
          e(OverflowHint, { count: bo }),
        ],
      });
    },
  });
}
//@ chunk-18hwfzwa.js:666723-666845 affinity
function fuzzyMatchScore(h, x) {
  let D = 0;
  for (let L = 0; L < x.length; L++) {
    let index = h.indexOf(x.charAt(L), D);
    if (index === -1) return !1;
    D = index + 1;
  }
  return !0;
}

export { HistorySearchDialog };
