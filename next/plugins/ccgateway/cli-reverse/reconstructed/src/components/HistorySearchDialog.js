/**
 * components/HistorySearchDialog.tsx
 *
 * Ctrl+R 历史搜索对话框（全屏版本）：扫描 prompt 历史、模糊匹配、显示扫描状态（Loading/Searching older prompts/No history yet）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/HistorySearchDialog.tsx
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: sole-consumer 1, affinity 2, fingerprint 1
 */
import { useRegisterOverlay } from "../context/overlayContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useState, useRef, useEffect, useMemo } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-czq1j3j2.js:683676-683726 sole-consumer
var HISTORY_DIALOG_VISIBLE_ROWS = 6;
var PROMPT_ROW_GAP = 8;
var MAX_SCAN_BYTES = 16777216;
var ENTRY_OVERHEAD_BYTES = 256;
var INITIAL_HISTORY_BATCH = 100;
var HISTORY_BATCH_GROWTH = 4;
//@ chunk-czq1j3j2.js:683726-684007 affinity
function getHistoryScanStatusText(scan, query) {
  if (!scan) return "Loading\u2026";
  let trimmed = query.trim();
  switch (scan.status) {
    case "failed":
      return "Couldn't read prompt history";
    case "scanning":
      return trimmed ? "Searching older prompts\u2026" : "No history yet";
    case "complete":
    case "truncated":
      return trimmed ? "No matching prompts" : "No history yet";
  }
}
//@ chunk-czq1j3j2.js:684007-687427 fingerprint (2.1.88 match: HistorySearchDialog, 0.53)
/**
 * 全屏历史搜索对话框：列出匹配的历史 prompt（fuzzy），显示扫描进度与截断状态，选中后回填。
 */
function HistorySearchDialog({ initialQuery, onSelect, onCancel }) {
  useRegisterOverlay("history-search");
  let { columns } = useTerminalSize();
  let { storageV5 } = useTheme_2();
  let [scope, setScope] = useState("everywhere");
  let [scanState, setScanState] = useState(null);
  let [query, setQuery] = useState(initialQuery ?? "");
  let scanCacheRef = useRef({});
  useEffect(() => {
    logFeatureOk("history_search_open");
  }, []);
  useEffect(() => {
    let cached = scanCacheRef.current[scope];
    if (cached) {
      setScanState(cached);
      return;
    }
    setScanState(null);
    let cancelled = false;
    let items = [];
    (async () => {
      try {
        let reader = getTimestampedHistory(scope, storageV5);
        let totalBytes = 0;
        let nextBatchSize = INITIAL_HISTORY_BATCH;
        let hitLimit = false;
        for await (let entry of reader) {
          if (cancelled) return;
          let { display, expandedDisplay } = entry;
          let index = display.indexOf(`
`);
          let lower = display.toLowerCase();
          items.push({
            entry,
            lower,
            expandedLower: expandedDisplay === display ? lower : expandedDisplay.toLowerCase(),
            firstLine: index === -1 ? display : display.slice(0, index),
          });
          totalBytes += entry.textLength + ENTRY_OVERHEAD_BYTES;
          if (totalBytes >= MAX_SCAN_BYTES) {
            hitLimit = true;
            break;
          }
          if (items.length >= nextBatchSize) {
            setScanState({
              items: items.slice(),
              status: "scanning",
            });
            nextBatchSize *= HISTORY_BATCH_GROWTH;
          }
        }
        if (!cancelled) {
          let nextState = {
            items,
            status: hitLimit ? "truncated" : "complete",
          };
          scanCacheRef.current[scope] = nextState;
          setScanState(nextState);
          if (hitLimit) logFeatureSad("history_search_scan", "text_limit_reached");
          else logFeatureOk("history_search_scan");
        }
      } catch (error) {
        if (!cancelled)
          if (items.length > 0) {
            setScanState({
              items,
              status: "truncated",
            });
            logFeatureSad("history_search_scan", "picker_scan_interrupted");
          } else {
            setScanState({
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
      cancelled = true;
    };
  }, [scope, storageV5]);
  let shortcutDisplay = useShortcutDisplay("historySearch:cycleScope", "HistorySearch", "ctrl+s");
  useKeybinding(
    "historySearch:cycleScope",
    () => {
      let index = HISTORY_SCOPES.indexOf(scope);
      let nextScope = HISTORY_SCOPES[(index + 1) % HISTORY_SCOPES.length];
      setScope(nextScope);
      logEvent("tengu_history_picker_scope", {
        from: fromEnum(scope),
        to: fromEnum(nextScope),
      });
    },
    {
      context: "HistorySearch",
    },
  );
  let filtered = useMemo(() => {
    if (!scanState) return [];
    let items = scanState.items;
    let needle = query.trim().toLowerCase();
    if (!needle) return items;
    let isScanning = scanState.status === "scanning";
    let matches = [];
    let fuzzy = [];
    for (let item of items)
      if (item.lower.includes(needle) || item.expandedLower.includes(needle)) matches.push(item);
      else if (!isScanning && fuzzyMatchScore(item.lower, needle)) fuzzy.push(item);
    return matches.concat(fuzzy);
  }, [scanState, query]);
  let previewOnRight = columns >= 100;
  let listWidth = previewOnRight ? Math.floor((columns - 6) * 0.5) : columns - 6;
  let rowWidth = Math.max(20, listWidth - PROMPT_ROW_GAP - 1);
  let previewWidth = previewOnRight ? Math.max(20, columns - listWidth - 12) : Math.max(20, columns - 10);
  return jsxProd_default(FuzzyPicker, {
    title: jsxProd_default_2(Text, {
      children: [
        "Search prompts ",
        jsxProd_default_2(Text, {
          color: "suggestion",
          children: ["\xB7 ", scope],
        }),
        scanState?.status === "truncated" &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [" ", "\xB7 newest ", scanState.items.length.toLocaleString(), " only"],
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
    resetKey: scope,
    extraHints: (hintProps) => [
      shortcutDisplay &&
        jsxProd_default(
          KeyboardShortcutHint,
          {
            chord: shortcutDisplay,
            action: "scope",
            ...hintProps,
          },
          "scope",
        ),
      EDITOR_MODES() &&
        jsxProd_default_2(
          Text,
          {
            children: [hintProps.terse ? "esc" : "Esc", " i / for slash commands"],
          },
          "vim",
        ),
    ],
    emptyMessage: (q_0) => getHistoryScanStatusText(scanState, q_0),
    selectAction: "use",
    direction: "up",
    previewPosition: previewOnRight ? "right" : "bottom",
    renderItem: (item, isFocused) => {
      let relativeTime = formatRelativeTimeAgo(new Date(item.entry.timestamp));
      return jsxProd_default_2(Text, {
        children: [
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [relativeTime, " ".repeat(Math.max(0, PROMPT_ROW_GAP - bunStringWidth(relativeTime)))],
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
      let mapped = sliced.map((line) => truncateToLength(line, previewWidth * HISTORY_DIALOG_VISIBLE_ROWS));
      let filtered = wrapAnsi(
        mapped.join(`
`),
        previewWidth,
        {
          hard: true,
        },
      )
        .split(
          `
`,
        )
        .filter((line) => line.trim() !== "");
      let reduced = sliced.reduce(
        (acc, line, lineIndex) => acc + Math.ceil((line.length - mapped[lineIndex].length) / previewWidth),
        0,
      );
      let hiddenLines = wrapped.length - sliced.length + reduced;
      let overflow = filtered.length > HISTORY_DIALOG_VISIBLE_ROWS || hiddenLines > 0;
      let shown = filtered.slice(0, overflow ? HISTORY_DIALOG_VISIBLE_ROWS - 1 : HISTORY_DIALOG_VISIBLE_ROWS);
      let count = filtered.length - shown.length + hiddenLines;
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
//@ chunk-czq1j3j2.js:687427-687549 affinity
function fuzzyMatchScore(lower, needle) {
  let lastMatchEnd = 0;
  for (let idx = 0; idx < needle.length; idx++) {
    let index = lower.indexOf(needle.charAt(idx), lastMatchEnd);
    if (index === -1) return false;
    lastMatchEnd = index + 1;
  }
  return true;
}
export { HistorySearchDialog };
