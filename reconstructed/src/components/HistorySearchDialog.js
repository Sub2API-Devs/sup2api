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
import { useTheme_2 } from "./design-system/ThemeProvider.js";
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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
var HISTORY_DIALOG_VISIBLE_ROWS = 6;
var PROMPT_ROW_GAP = 8;
var MAX_SCAN_BYTES = 16777216;
var ENTRY_OVERHEAD_BYTES = 256;
var INITIAL_HISTORY_BATCH = 100;
var HISTORY_BATCH_GROWTH = 4;
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
//@ chunk-18hwfzwa.js:663303-666723 fingerprint = HistorySearchDialog (0.528)
/**
 * 全屏历史搜索对话框：列出匹配的历史 prompt（fuzzy），显示扫描进度与截断状态，选中后回填。
 */
function HistorySearchDialog({ initialQuery, onSelect, onCancel }) {
  useRegisterOverlay("history-search");
  let { columns } = useTerminalSize();
  let { storageV5 } = useTheme_2();
  let [ke, Re] = y("everywhere");
  let [Be, He] = y(null);
  let [query, setQuery] = y(initialQuery ?? "");
  let Xe = R({});
  P(() => {
    logFeatureOk("history_search_open");
  }, []);
  P(() => {
    let Dt = Xe.current[ke];
    if (Dt) {
      He(Dt);
      return;
    }
    He(null);
    let Lt = false;
    let oo = [];
    (async () => {
      try {
        let reader = getTimestampedHistory(ke, storageV5);
        let io = 0;
        let so = INITIAL_HISTORY_BATCH;
        let po = false;
        for await (let entry of reader) {
          if (Lt) return;
          let { display, expandedDisplay } = entry;
          let index = display.indexOf(`
`);
          let lower = display.toLowerCase();
          oo.push({
            entry,
            lower,
            expandedLower: expandedDisplay === display ? lower : expandedDisplay.toLowerCase(),
            firstLine: index === -1 ? display : display.slice(0, index),
          });
          io += entry.textLength + ENTRY_OVERHEAD_BYTES;
          if (io >= MAX_SCAN_BYTES) {
            po = true;
            break;
          }
          if (oo.length >= so) {
            He({
              items: oo.slice(),
              status: "scanning",
            });
            so *= HISTORY_BATCH_GROWTH;
          }
        }
        if (!Lt) {
          let ao = {
            items: oo,
            status: po ? "truncated" : "complete",
          };
          Xe.current[ke] = ao;
          He(ao);
          if (po) logFeatureSad("history_search_scan", "text_limit_reached");
          else logFeatureOk("history_search_scan");
        }
      } catch (error) {
        if (!Lt)
          if (oo.length > 0) {
            He({
              items: oo,
              status: "truncated",
            });
            logFeatureSad("history_search_scan", "picker_scan_interrupted");
          } else {
            He({
              items: [],
              status: "failed",
            });
            logFeatureBad("history_search_scan", "picker_scan_failed");
          }
        if (isTransientHistoryReadError(error))
          logForDebugging(`History picker read failed: ${errorMessage(error)}`, {
            level: "error",
          });
        else logError(error);
      }
    })();
    return () => {
      Lt = true;
    };
  }, [ke, storageV5]);
  let shortcutDisplay = useShortcutDisplay("historySearch:cycleScope", "HistorySearch", "ctrl+s");
  useKeybinding(
    "historySearch:cycleScope",
    () => {
      let index = HISTORY_SCOPES.indexOf(ke);
      let Lt = HISTORY_SCOPES[(index + 1) % HISTORY_SCOPES.length];
      Re(Lt);
      logEvent("tengu_history_picker_scope", {
        from: fromEnum(ke),
        to: fromEnum(Lt),
      });
    },
    {
      context: "HistorySearch",
    },
  );
  let filtered = Q(() => {
    if (!Be) return [];
    let items = Be.items;
    let lower = query.trim().toLowerCase();
    if (!lower) return items;
    let oo = Be.status === "scanning";
    let Xt = [];
    let fuzzy = [];
    for (let item of items)
      if (item.lower.includes(lower) || item.expandedLower.includes(lower)) Xt.push(item);
      else if (!oo && fuzzyMatchScore(item.lower, lower)) fuzzy.push(item);
    return Xt.concat(fuzzy);
  }, [Be, query]);
  let previewOnRight = columns >= 100;
  let listWidth = previewOnRight ? Math.floor((columns - 6) * 0.5) : columns - 6;
  let rowWidth = Math.max(20, listWidth - PROMPT_ROW_GAP - 1);
  let Et = previewOnRight ? Math.max(20, columns - listWidth - 12) : Math.max(20, columns - 10);
  return jsxProd_default(FuzzyPicker, {
    title: jsxProd_default_2(Text, {
      children: [
        "Search prompts ",
        jsxProd_default_2(Text, {
          color: "suggestion",
          children: ["\xB7 ", ke],
        }),
        Be?.status === "truncated" &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [" ", "\xB7 newest ", Be.items.length.toLocaleString(), " only"],
          }),
      ],
    }),
    placeholder: "Filter history\u2026",
    initialQuery,
    items: filtered,
    getKey: (item) => String(item.entry.timestamp),
    onQueryChange: setQuery,
    onSelect: (item) => {
      logEvent("tengu_history_picker_select", {
        result_count: filtered.length,
        query_length: query.length,
      });
      item.entry.resolve().then(
        (q_0) => {
          logFeatureOk("history_search_accept");
          onSelect(q_0);
        },
        (error) => {
          logFeatureBad("history_search_accept", "accept_resolve_failed");
          throw error;
        },
      );
    },
    onCancel,
    resetKey: ke,
    extraHints: (Dt) => [
      shortcutDisplay &&
        jsxProd_default(
          KeyboardShortcutHint,
          {
            chord: shortcutDisplay,
            action: "scope",
            ...Dt,
          },
          "scope",
        ),
      EDITOR_MODES() &&
        jsxProd_default_2(
          Text,
          {
            children: [Dt.terse ? "esc" : "Esc", " i / for slash commands"],
          },
          "vim",
        ),
    ],
    emptyMessage: (q_0) => getHistoryScanStatusText(Be, q_0),
    selectAction: "use",
    direction: "up",
    previewPosition: previewOnRight ? "right" : "bottom",
    renderItem: (item, isFocused) => {
      let oo = formatRelativeTimeAgo(new Date(item.entry.timestamp));
      return jsxProd_default_2(Text, {
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [oo, " ".repeat(Math.max(0, PROMPT_ROW_GAP - bunStringWidth(oo)))],
          }),
          jsxProd_default_2(Text, {
            color: isFocused ? "suggestion" : undefined,
            children: [" ", truncateToWidth(item.firstLine, rowWidth)],
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
        .filter((line) => line.trim() !== "");
      let sliced = wrapped.slice(0, HISTORY_DIALOG_VISIBLE_ROWS);
      let mapped = sliced.map((Ao) => truncateToLength(Ao, Et * HISTORY_DIALOG_VISIBLE_ROWS));
      let filtered = wrapAnsi(
        mapped.join(`
`),
        Et,
        {
          hard: true,
        },
      )
        .split(
          `
`,
        )
        .filter((line) => line.trim() !== "");
      let reduced = sliced.reduce((acc, Bo, Ro) => acc + Math.ceil((Bo.length - mapped[Ro].length) / Et), 0);
      let po = wrapped.length - sliced.length + reduced;
      let overflow = filtered.length > HISTORY_DIALOG_VISIBLE_ROWS || po > 0;
      let shown = filtered.slice(0, overflow ? HISTORY_DIALOG_VISIBLE_ROWS - 1 : HISTORY_DIALOG_VISIBLE_ROWS);
      let count = filtered.length - shown.length + po;
      return jsxProd_default_2(Box, {
        flexDirection: "column",
        borderStyle: "round",
        borderDimColor: true,
        paddingX: 1,
        height: HISTORY_DIALOG_VISIBLE_ROWS + 2,
        children: [
          shown.map((row, i) =>
            jsxProd_default(
              Text,
              {
                dimColor: true,
                children: row,
              },
              i,
            ),
          ),
          jsxProd_default(OverflowHint, {
            count,
          }),
        ],
      });
    },
  });
}
//@ chunk-18hwfzwa.js:666723-666845 affinity
function fuzzyMatchScore(lower, x) {
  let D = 0;
  for (let idx = 0; idx < x.length; idx++) {
    let index = lower.indexOf(x.charAt(idx), D);
    if (index === -1) return false;
    D = index + 1;
  }
  return true;
}
export { HistorySearchDialog };
