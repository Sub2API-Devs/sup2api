/**
 * components/Stats.tsx
 *
 * /stats 统计：每日活跃热力图、token 用量图、峰值日、最长会话等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Stats.tsx
 * pieces: chunk-j6tt9nsa.js (31)
 * attribution: placement 3, affinity 1, file-local 3, layout 7, fingerprint 15, callgraph-witnessed 1, callgraph-fingerprint 1
 */
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { aggregateClaudeCodeStatsForRange, totalUsageTokens } from "../utils/stats.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import {
  useState,
  suspenseTypeExport,
  use,
  useTransition,
  useRef,
} from "../../vendor/react/cjs/react.production.js";
import { isStatsScanAllowed } from "../services/usageInsights/transcriptScan.js";
import { useScrollViewportSize } from "./ScrollViewportContext.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { Spinner } from "./Spinner.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useTabHeaderFocus, Tab, Tabs } from "./design-system/Tabs.js";
import { formatNumber, formatDuration } from "../utils/format.js";
import { generateHeatmap } from "../utils/heatmap.js";
import { renderModelName } from "../utils/model/modelDisplay.js";
import { figures_default } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { BulletRow } from "./design-system/BulletRow.js";
import { getThemeWithOverrides } from "../utils/systemTheme.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { themeColorToAnsi } from "../utils/theme.js";
import { applyColor } from "../ink/colorize.js";
import { usageRefreshSignal } from "./Settings/Usage.js";
import { copyAnsiToClipboard } from "../utils/screenshotClipboard.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { sequential } from "../utils/sequential.js";

//@ chunk-j6tt9nsa.js:77453-77506 placement
/**
 * ISO 日期（YYYY-MM-DD）前缀与整串正则。错归（统计界面）。
 */
var ISO_DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}/;
var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
//@ chunk-j6tt9nsa.js:77506-77661 placement (2.1.88 match: nextCronRunMs, 0.693)
/**
 * 严格的 YYYY-MM-DD 字符串，日期有效则原样返回，否则 null。错归（统计界面 mergeCacheWithNewStats 使用），旧版名 evaluateTimeBasedTrigger 为错配。
 */
function parseIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) return null;
  let date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value) ? value : null;
}
//@ chunk-j6tt9nsa.js:77661-77754 placement
/**
 * 以 YYYY-MM-DD 开头且可解析的时间字符串。
 */
function parseIsoDateTimePrefix(value) {
  return typeof value === "string" && ISO_DATE_PREFIX_RE.test(value) && Number.isFinite(Date.parse(value))
    ? value
    : null;
}
//@ chunk-j6tt9nsa.js:90585-90614 affinity
function emptyStatsMap() {
  return new Map();
}
//@ chunk-j6tt9nsa.js:90614-90654 file-local
function rowsAboveTwo(prev) {
  return Math.max(prev - 2, 0);
}
//@ chunk-j6tt9nsa.js:90654-90689 layout
function firstItem(items) {
  let [first] = items;
  return first;
}
//@ chunk-j6tt9nsa.js:90689-90806 fingerprint (2.1.88 match: _temp1, 1)
function renderModelLegendItem(item, i) {
  return jsxProd_default_2(
    Text,
    {
      children: [
        i > 0 ? " \xB7 " : "",
        jsxProd_default(Ansi, {
          children: item.coloredBullet,
        }),
        " ",
        item.model,
      ],
    },
    item.model,
  );
}
//@ chunk-j6tt9nsa.js:90806-90912 layout (2.1.88 match: formatPeakDay, 0.864)
function formatPeakDay_2(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
//@ chunk-j6tt9nsa.js:90912-90998 fingerprint (2.1.88 match: DATE_RANGE_LABELS, 0.949)
var STATS_RANGE_LABELS = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};
var STATS_RANGES = ["all", "7d", "30d"];
//@ chunk-j6tt9nsa.js:90998-91060 file-local
function getNextDateRange(current) {
  let currentIndex = STATS_RANGES.indexOf(current);
  return STATS_RANGES[(currentIndex + 1) % STATS_RANGES.length];
}
//@ chunk-j6tt9nsa.js:91060-91274 fingerprint (2.1.88 match: createAllTimeStatsPromise, 1)
function createAllTimeStatsPromise(storage) {
  return aggregateClaudeCodeStatsForRange("all", storage)
    .then((data) => {
      if (!data || data.totalSessions === 0)
        return {
          type: "empty",
        };
      return {
        type: "success",
        data,
      };
    })
    .catch((err) => ({
      type: "error",
      message: err instanceof Error ? err.message : "Failed to load stats",
    }));
}
//@ chunk-j6tt9nsa.js:91274-91393 layout
var EMPTY_ACTIVITY_STATS = {
  todaySeconds: 0,
  weekSeconds: 0,
  longestStretchMs: 0,
  lastWeekSessions: {
    count: 0,
    medianMs: 0,
    averageMs: 0,
    longestMs: 0,
  },
};
//@ chunk-j6tt9nsa.js:91393-91435 layout
function emptyStatsProvider(storageV5) {
  return Promise.resolve(EMPTY_ACTIVITY_STATS);
}
//@ chunk-j6tt9nsa.js:91435-92663 callgraph-witnessed (2.1.88 match: Stats, 0.296)
/**
 * /stats：活跃热力图、token 用量图表、常用模型、峰值日与连续天数等统计。
 */
function Stats(props) {
  let $ = useMemoCache(21);
  let { onClose } = props;
  let { storageV5 } = useTheme_2();
  let [scanAllowed] = useState(isStatsScanAllowed);
  let statsPromise;
  if ($[0] !== storageV5 || $[1] !== scanAllowed.allowed) {
    statsPromise = scanAllowed.allowed ? createAllTimeStatsPromise(storageV5) : null;
    $[0] = storageV5;
    $[1] = scanAllowed.allowed;
    $[2] = statsPromise;
  } else statsPromise = $[2];
  let statsPromiseValue = statsPromise;
  let emptyProvider;
  if ($[3] !== storageV5 || $[4] !== scanAllowed.allowed) {
    emptyProvider = scanAllowed.allowed ? emptyStatsProvider(storageV5) : null;
    $[3] = storageV5;
    $[4] = scanAllowed.allowed;
    $[5] = emptyProvider;
  } else emptyProvider = $[5];
  let emptyProviderValue = emptyProvider;
  let { rows } = useScrollViewportSize(useTerminalSize());
  let minHeight = Math.max(8, Math.min(rows - 4, 31));
  let dismiss;
  if ($[6] !== onClose) {
    dismiss = () =>
      onClose("Stats dialog dismissed", {
        display: "system",
      });
    $[6] = onClose;
    $[7] = dismiss;
  } else dismiss = $[7];
  let keybindingOptions;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    keybindingOptions = {
      context: "Settings",
    };
    $[8] = keybindingOptions;
  } else keybindingOptions = $[8];
  useKeybinding("confirm:no", dismiss, keybindingOptions);
  if (statsPromiseValue === null || emptyProviderValue === null || !scanAllowed.allowed) {
    const children = scanAllowed.allowed ? null : scanAllowed.reason;
    let children_2;
    if ($[9] !== children) {
      children_2 = jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          wrap: "wrap",
          children,
        }),
      });
      $[9] = children;
      $[10] = children_2;
    } else children_2 = $[10];
    let emptyBox;
    if ($[11] !== minHeight || $[12] !== children_2) {
      emptyBox = jsxProd_default(Box, {
        flexDirection: "column",
        minHeight,
        children: children_2,
      });
      $[11] = minHeight;
      $[12] = children_2;
      $[13] = emptyBox;
    } else emptyBox = $[13];
    return emptyBox;
  }
  let fallback;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default_2(Box, {
      marginTop: 1,
      children: [
        jsxProd_default(Spinner, {}),
        jsxProd_default(Text, {
          children: " Loading your Claude Code stats\u2026",
        }),
      ],
    });
    $[14] = fallback;
  } else fallback = $[14];
  let children;
  if ($[15] !== emptyProviderValue || $[16] !== statsPromiseValue) {
    children = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: jsxProd_default(StatsContent, {
        allTimePromise: statsPromiseValue,
        activeTimePromise: emptyProviderValue,
      }),
    });
    $[15] = emptyProviderValue;
    $[16] = statsPromiseValue;
    $[17] = children;
  } else children = $[17];
  let columnBoxElement;
  if ($[18] !== minHeight || $[19] !== children) {
    columnBoxElement = jsxProd_default(Box, {
      flexDirection: "column",
      minHeight,
      children,
    });
    $[18] = minHeight;
    $[19] = children;
    $[20] = columnBoxElement;
  } else columnBoxElement = $[20];
  return columnBoxElement;
}
//@ chunk-j6tt9nsa.js:92663-96000 fingerprint (2.1.88 match: StatsContent, 0.519)
function StatsContent(props) {
  let $ = useMemoCache(50);
  let { allTimePromise, activeTimePromise } = props;
  let { storageV5 } = useTheme_2();
  let allTimeResult = use(allTimePromise);
  let activeTab = use(activeTimePromise);
  let [dateRange, setDateRange] = useState("all");
  let [pendingRanges] = useState(emptyStatsMap);
  let [isScanning, setScanning] = useTransition();
  let [pendingSelectorRange, setPendingSelectorRange] = useState(null);
  let allTimeResult_2 = useRef(null);
  let cycleRange;
  if ($[0] !== dateRange || $[1] !== pendingRanges || $[2] !== storageV5) {
    cycleRange = function cycleRangeImpl() {
      let fromRange = allTimeResult_2.current ?? dateRange;
      let range = getNextDateRange(fromRange);
      let needsScan = range !== "all" && !pendingRanges.has(range);
      if (needsScan && !isStatsScanAllowed().allowed) {
        do range = getNextDateRange(range);
        while (range !== "all" && !pendingRanges.has(range) && range !== fromRange);
        if (range === fromRange) {
          return;
        }
        needsScan = false;
      }
      allTimeResult_2.current = range;
      if (needsScan) {
        let scanPromise = aggregateClaudeCodeStatsForRange(range, storageV5).catch(() => {
          pendingRanges.delete(range);
          return null;
        });
        pendingRanges.set(range, scanPromise);
      }
      setPendingSelectorRange(range);
      setScanning(() => {
        setDateRange(range);
        setPendingSelectorRange(null);
      });
    };
    $[0] = dateRange;
    $[1] = pendingRanges;
    $[2] = storageV5;
    $[3] = cycleRange;
  } else cycleRange = $[3];
  let cycleRangeStable = cycleRange;
  let selectorRange = pendingSelectorRange ?? dateRange;
  let [activeTabName, setActiveTab] = useState("Overview");
  let [copyStatus, setCopyStatus] = useState(null);
  let clock = useClock();
  let rangePromise;
  if ($[4] !== dateRange || $[5] !== pendingRanges) {
    rangePromise = dateRange === "all" ? null : (pendingRanges.get(dateRange) ?? null);
    $[4] = dateRange;
    $[5] = pendingRanges;
    $[6] = rangePromise;
  } else rangePromise = $[6];
  let rangePromise_2 = rangePromise;
  let rangeResult = rangePromise_2 ? use(rangePromise_2) : null;
  let stats =
    dateRange === "all"
      ? allTimeResult.type === "success"
        ? allTimeResult.data
        : null
      : (rangeResult ?? (allTimeResult.type === "success" ? allTimeResult.data : null));
  let allTimeData = allTimeResult.type === "success" ? allTimeResult.data : null;
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let onKeyDown;
  if (
    $[7] !== activeTabName ||
    $[8] !== activeTab ||
    $[9] !== clock ||
    $[10] !== cycleRangeStable ||
    $[11] !== stats ||
    $[12] !== focusHeader
  ) {
    onKeyDown = function onKeyDownImpl(event) {
      if (event.key === "up") {
        event.preventDefault();
        focusHeader();
        return;
      }
      if (event.key === "r" && !event.ctrl && !event.meta) {
        event.preventDefault();
        cycleRangeStable();
        return;
      }
      if (event.ctrl && event.key === "s" && stats) {
        event.preventDefault();
        handleScreenshot(stats, activeTab, activeTabName, setCopyStatus, clock);
      }
    };
    $[7] = activeTabName;
    $[8] = activeTab;
    $[9] = clock;
    $[10] = cycleRangeStable;
    $[11] = stats;
    $[12] = focusHeader;
    $[13] = onKeyDown;
  } else onKeyDown = $[13];
  let onKeyDown_2 = onKeyDown;
  if (allTimeResult.type === "error") {
    let children;
    if ($[14] !== allTimeResult.message) {
      children = jsxProd_default_2(Text, {
        color: "error",
        children: ["Failed to load stats: ", allTimeResult.message],
      });
      $[14] = allTimeResult.message;
      $[15] = children;
    } else children = $[15];
    let errorBox;
    if ($[16] !== onKeyDown_2 || $[17] !== children) {
      errorBox = jsxProd_default(Box, {
        marginTop: 1,
        tabIndex: 0,
        autoFocus: false,
        onKeyDown: onKeyDown_2,
        children,
      });
      $[16] = onKeyDown_2;
      $[17] = children;
      $[18] = errorBox;
    } else errorBox = $[18];
    return errorBox;
  }
  if (allTimeResult.type === "empty") {
    let children;
    if ($[19] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        color: "warning",
        children: "No stats available yet. Start using Claude Code!",
      });
      $[19] = children;
    } else children = $[19];
    let emptyBox;
    if ($[20] !== onKeyDown_2) {
      emptyBox = jsxProd_default(Box, {
        marginTop: 1,
        tabIndex: 0,
        autoFocus: false,
        onKeyDown: onKeyDown_2,
        children,
      });
      $[20] = onKeyDown_2;
      $[21] = emptyBox;
    } else emptyBox = $[21];
    return emptyBox;
  }
  if (!stats || !allTimeData) {
    let spinner;
    let loadingText;
    if ($[22] === MEMO_CACHE_SENTINEL) {
      spinner = jsxProd_default(Spinner, {});
      loadingText = jsxProd_default(Text, {
        children: " Loading stats\u2026",
      });
      $[22] = spinner;
      $[23] = loadingText;
    } else {
      spinner = $[22];
      loadingText = $[23];
    }
    let loadingBox;
    if ($[24] !== onKeyDown_2) {
      loadingBox = jsxProd_default_2(Box, {
        marginTop: 1,
        tabIndex: 0,
        autoFocus: false,
        onKeyDown: onKeyDown_2,
        children: [spinner, loadingText],
      });
      $[24] = onKeyDown_2;
      $[25] = loadingBox;
    } else loadingBox = $[25];
    return loadingBox;
  }
  let onTabChange;
  if ($[26] === MEMO_CACHE_SENTINEL) {
    onTabChange = (tab) => setActiveTab(tab);
    $[26] = onTabChange;
  } else onTabChange = $[26];
  let t7;
  if (
    $[27] !== activeTab ||
    $[28] !== allTimeData ||
    $[29] !== dateRange ||
    $[30] !== stats ||
    $[31] !== isScanning ||
    $[32] !== selectorRange
  ) {
    t7 = jsxProd_default(Tab, {
      title: "Overview",
      children: jsxProd_default(OverviewTab, {
        stats,
        allTimeStats: allTimeData,
        activeTimeStats: activeTab,
        dateRange,
        selectorRange,
        isLoading: isScanning,
      }),
    });
    $[27] = activeTab;
    $[28] = allTimeData;
    $[29] = dateRange;
    $[30] = stats;
    $[31] = isScanning;
    $[32] = selectorRange;
    $[33] = t7;
  } else t7 = $[33];
  let t8;
  if ($[34] !== stats || $[35] !== isScanning || $[36] !== selectorRange) {
    t8 = jsxProd_default(Tab, {
      title: "Models",
      children: jsxProd_default(ModelsTab, {
        stats,
        selectorRange,
        isLoading: isScanning,
      }),
    });
    $[34] = stats;
    $[35] = isScanning;
    $[36] = selectorRange;
    $[37] = t8;
  } else t8 = $[37];
  let t9;
  if ($[38] !== activeTabName || $[39] !== headerFocused || $[40] !== t7 || $[41] !== t8) {
    t9 = jsxProd_default(Box, {
      flexDirection: "row",
      gap: 1,
      marginBottom: 1,
      children: jsxProd_default_2(Tabs, {
        initialHeaderFocused: false,
        title: null,
        color: "claude",
        selectedTab: activeTabName,
        onTabChange,
        disableNavigation: headerFocused,
        children: [t7, t8],
      }),
    });
    $[38] = activeTabName;
    $[39] = headerFocused;
    $[40] = t7;
    $[41] = t8;
    $[42] = t9;
  } else t9 = $[42];
  const hintText = headerFocused ? "\u2193 stats" : "\u2191 tabs \xB7 r to cycle dates \xB7 ctrl+s to copy";
  const copySuffix = copyStatus ? ` \xB7 ${copyStatus}` : "";
  let t11;
  if ($[43] !== hintText || $[44] !== copySuffix) {
    t11 = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [hintText, copySuffix],
      }),
    });
    $[43] = hintText;
    $[44] = copySuffix;
    $[45] = t11;
  } else t11 = $[45];
  let t12;
  if ($[46] !== onKeyDown_2 || $[47] !== t11 || $[48] !== t9) {
    t12 = jsxProd_default_2(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: false,
      onKeyDown: onKeyDown_2,
      children: [t9, t11],
    });
    $[46] = onKeyDown_2;
    $[47] = t11;
    $[48] = t9;
    $[49] = t12;
  } else t12 = $[49];
  return t12;
}
//@ chunk-j6tt9nsa.js:96000-96495 fingerprint (2.1.88 match: DateRangeSelector, 0.89)
function DateRangeSelector(props) {
  let $ = useMemoCache(9);
  let { dateRange, isLoading } = props;
  let children;
  if ($[0] !== dateRange) {
    children = STATS_RANGES.map((range, i) =>
      jsxProd_default_2(
        Text,
        {
          children: [
            i > 0 &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 ",
              }),
            range === dateRange
              ? jsxProd_default(Text, {
                  bold: true,
                  color: "claude",
                  children: STATS_RANGE_LABELS[range],
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  children: STATS_RANGE_LABELS[range],
                }),
          ],
        },
        range,
      ),
    );
    $[0] = dateRange;
    $[1] = children;
  } else children = $[1];
  let t2;
  if ($[2] !== children) {
    t2 = jsxProd_default(Box, {
      children,
    });
    $[2] = children;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== isLoading) {
    t3 = isLoading && jsxProd_default(Spinner, {});
    $[4] = isLoading;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] !== t2 || $[7] !== t3) {
    t4 = jsxProd_default_2(Box, {
      marginBottom: 1,
      gap: 1,
      children: [t2, t3],
    });
    $[6] = t2;
    $[7] = t3;
    $[8] = t4;
  } else t4 = $[8];
  return t4;
}
//@ chunk-j6tt9nsa.js:96495-96630 layout
function sortModelUsage(modelUsage) {
  let sorted = Object.entries(modelUsage).sort(([, a], [, b]) => totalUsageTokens(b) - totalUsageTokens(a));
  return {
    modelEntries: sorted,
    totalTokens: sorted.reduce((acc, [, usage]) => acc + totalUsageTokens(usage), 0),
  };
}
//@ chunk-j6tt9nsa.js:96630-96896 file-local
function formatTokenBreakdown(modelUsage) {
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;
  let cacheWriteTokens = 0;
  for (let usage of Object.values(modelUsage)) {
    inputTokens += usage.inputTokens || 0;
    outputTokens += usage.outputTokens || 0;
    cacheReadTokens += usage.cacheReadInputTokens || 0;
    cacheWriteTokens += usage.cacheCreationInputTokens || 0;
  }
  return (
    `Input ${formatNumber(inputTokens)} \xB7 Output ${formatNumber(outputTokens)} \xB7 ` +
    `Cache read ${formatNumber(cacheReadTokens)} \xB7 Cache write ${formatNumber(cacheWriteTokens)}`
  );
}
//@ chunk-j6tt9nsa.js:96896-96964 layout
function percentOf(usage, totalTokens) {
  if (totalTokens <= 0) return "0.0";
  return ((totalUsageTokens(usage) / totalTokens) * 100).toFixed(1);
}
//@ chunk-j6tt9nsa.js:96964-97083 layout
function formatCacheTokens(usage) {
  return (
    `Cache: ${formatNumber(usage.cacheReadInputTokens || 0)} read \xB7 ` +
    `${formatNumber(usage.cacheCreationInputTokens || 0)} write`
  );
}
//@ chunk-j6tt9nsa.js:97083-103403 fingerprint (2.1.88 match: OverviewTab, 0.684)
function OverviewTab(props) {
  let $ = useMemoCache(102);
  let { stats, allTimeStats, dateRange, selectorRange, isLoading } = props;
  let { columns: terminalWidth } = useTerminalSize();
  let modelBox;
  let statsRowBox;
  let outerBox;
  let funFact;
  let rangeDays;
  let flexDirection;
  let dateRangeSelector;
  let width;
  let children;
  let flexDirection_2;
  let gap;
  let marginBottom;
  let flexDirection_3;
  let marginTop;
  let heatmap;
  let totalTokens;
  if (
    $[0] !== allTimeStats.dailyActivity ||
    $[1] !== dateRange ||
    $[2] !== isLoading ||
    $[3] !== selectorRange ||
    $[4] !== stats ||
    $[5] !== terminalWidth
  ) {
    let { modelEntries, totalTokens: totalTokens_2 } = sortModelUsage(stats.modelUsage);
    totalTokens = totalTokens_2;
    let favoriteModel = modelEntries[0];
    let funFactoid;
    if ($[22] !== stats) {
      funFactoid = generateFunFactoid(stats);
      $[22] = stats;
      $[23] = funFactoid;
    } else funFactoid = $[23];
    funFact = funFactoid;
    rangeDays = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : stats.totalDays;
    outerBox = Box;
    flexDirection_3 = "column";
    marginTop = 1;
    if ($[24] !== allTimeStats.dailyActivity || $[25] !== terminalWidth) {
      heatmap =
        allTimeStats.dailyActivity.length > 0 &&
        jsxProd_default(Box, {
          flexDirection: "column",
          marginBottom: 1,
          children: jsxProd_default(Ansi, {
            children: generateHeatmap(allTimeStats.dailyActivity, {
              terminalWidth,
            }),
          }),
        });
      $[24] = allTimeStats.dailyActivity;
      $[25] = terminalWidth;
      $[26] = heatmap;
    } else heatmap = $[26];
    if ($[27] !== isLoading || $[28] !== selectorRange) {
      dateRangeSelector = jsxProd_default(DateRangeSelector, {
        dateRange: selectorRange,
        isLoading,
      });
      $[27] = isLoading;
      $[28] = selectorRange;
      $[29] = dateRangeSelector;
    } else dateRangeSelector = $[29];
    statsRowBox = Box;
    flexDirection_2 = "row";
    gap = 4;
    marginBottom = 1;
    modelBox = Box;
    flexDirection = "column";
    width = 28;
    children =
      favoriteModel &&
      jsxProd_default_2(Text, {
        wrap: "truncate",
        children: [
          "Favorite model:",
          " ",
          jsxProd_default(Text, {
            color: "claude",
            bold: true,
            children: renderModelName(favoriteModel[0]),
          }),
        ],
      });
    $[0] = allTimeStats.dailyActivity;
    $[1] = dateRange;
    $[2] = isLoading;
    $[3] = selectorRange;
    $[4] = stats;
    $[5] = terminalWidth;
    $[6] = modelBox;
    $[7] = statsRowBox;
    $[8] = outerBox;
    $[9] = funFact;
    $[10] = rangeDays;
    $[11] = flexDirection;
    $[12] = dateRangeSelector;
    $[13] = width;
    $[14] = children;
    $[15] = flexDirection_2;
    $[16] = gap;
    $[17] = marginBottom;
    $[18] = flexDirection_3;
    $[19] = marginTop;
    $[20] = heatmap;
    $[21] = totalTokens;
  } else {
    modelBox = $[6];
    statsRowBox = $[7];
    outerBox = $[8];
    funFact = $[9];
    rangeDays = $[10];
    flexDirection = $[11];
    dateRangeSelector = $[12];
    width = $[13];
    children = $[14];
    flexDirection_2 = $[15];
    gap = $[16];
    marginBottom = $[17];
    flexDirection_3 = $[18];
    marginTop = $[19];
    heatmap = $[20];
    totalTokens = $[21];
  }
  let favoriteModelBox;
  if ($[30] !== modelBox || $[31] !== flexDirection || $[32] !== width || $[33] !== children) {
    favoriteModelBox = jsxProd_default(modelBox, {
      flexDirection,
      width,
      children,
    });
    $[30] = modelBox;
    $[31] = flexDirection;
    $[32] = width;
    $[33] = children;
    $[34] = favoriteModelBox;
  } else favoriteModelBox = $[34];
  let children_2;
  if ($[35] !== totalTokens) {
    children_2 = formatNumber(totalTokens);
    $[35] = totalTokens;
    $[36] = children_2;
  } else children_2 = $[36];
  let totalTokensBox;
  if ($[37] !== children_2) {
    totalTokensBox = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: jsxProd_default_2(Text, {
        wrap: "truncate",
        children: [
          "Total tokens:",
          " ",
          jsxProd_default(Text, {
            color: "claude",
            children: children_2,
          }),
        ],
      }),
    });
    $[37] = children_2;
    $[38] = totalTokensBox;
  } else totalTokensBox = $[38];
  let topRow;
  if (
    $[39] !== statsRowBox ||
    $[40] !== favoriteModelBox ||
    $[41] !== totalTokensBox ||
    $[42] !== flexDirection_2 ||
    $[43] !== gap ||
    $[44] !== marginBottom
  ) {
    topRow = jsxProd_default_2(statsRowBox, {
      flexDirection: flexDirection_2,
      gap,
      marginBottom,
      children: [favoriteModelBox, totalTokensBox],
    });
    $[39] = statsRowBox;
    $[40] = favoriteModelBox;
    $[41] = totalTokensBox;
    $[42] = flexDirection_2;
    $[43] = gap;
    $[44] = marginBottom;
    $[45] = topRow;
  } else topRow = $[45];
  let children_3;
  if ($[46] !== stats.totalSessions) {
    children_3 = formatNumber(stats.totalSessions);
    $[46] = stats.totalSessions;
    $[47] = children_3;
  } else children_3 = $[47];
  let sessionsBox;
  if ($[48] !== children_3) {
    sessionsBox = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: jsxProd_default_2(Text, {
        wrap: "truncate",
        children: [
          "Sessions:",
          " ",
          jsxProd_default(Text, {
            color: "claude",
            children: children_3,
          }),
        ],
      }),
    });
    $[48] = children_3;
    $[49] = sessionsBox;
  } else sessionsBox = $[49];
  let children_4;
  if ($[50] !== stats.longestSession) {
    children_4 =
      stats.longestSession &&
      jsxProd_default_2(Text, {
        wrap: "truncate",
        children: [
          "Longest session:",
          " ",
          jsxProd_default(Text, {
            color: "claude",
            children: formatDuration(stats.longestSession.duration),
          }),
        ],
      });
    $[50] = stats.longestSession;
    $[51] = children_4;
  } else children_4 = $[51];
  let longestSessionBox;
  if ($[52] !== children_4) {
    longestSessionBox = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: children_4,
    });
    $[52] = children_4;
    $[53] = longestSessionBox;
  } else longestSessionBox = $[53];
  let sessionRow;
  if ($[54] !== sessionsBox || $[55] !== longestSessionBox) {
    sessionRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 4,
      children: [sessionsBox, longestSessionBox],
    });
    $[54] = sessionsBox;
    $[55] = longestSessionBox;
    $[56] = sessionRow;
  } else sessionRow = $[56];
  let activeDaysText;
  if ($[57] !== stats.activeDays) {
    activeDaysText = jsxProd_default(Text, {
      color: "claude",
      children: stats.activeDays,
    });
    $[57] = stats.activeDays;
    $[58] = activeDaysText;
  } else activeDaysText = $[58];
  let totalDaysText;
  if ($[59] !== rangeDays) {
    totalDaysText = jsxProd_default_2(Text, {
      color: "subtle",
      children: ["/", rangeDays],
    });
    $[59] = rangeDays;
    $[60] = totalDaysText;
  } else totalDaysText = $[60];
  let activeDaysBox;
  if ($[61] !== activeDaysText || $[62] !== totalDaysText) {
    activeDaysBox = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: jsxProd_default_2(Text, {
        wrap: "truncate",
        children: ["Active days: ", activeDaysText, totalDaysText],
      }),
    });
    $[61] = activeDaysText;
    $[62] = totalDaysText;
    $[63] = activeDaysBox;
  } else activeDaysBox = $[63];
  let longestStreakText;
  if ($[64] !== stats.streaks.longestStreak) {
    longestStreakText = jsxProd_default(Text, {
      color: "claude",
      bold: true,
      children: stats.streaks.longestStreak,
    });
    $[64] = stats.streaks.longestStreak;
    $[65] = longestStreakText;
  } else longestStreakText = $[65];
  const dayWord = stats.streaks.longestStreak === 1 ? "day" : "days";
  let longestStreakBox;
  if ($[66] !== longestStreakText || $[67] !== dayWord) {
    longestStreakBox = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: jsxProd_default_2(Text, {
        wrap: "truncate",
        children: ["Longest streak:", " ", longestStreakText, " ", dayWord],
      }),
    });
    $[66] = longestStreakText;
    $[67] = dayWord;
    $[68] = longestStreakBox;
  } else longestStreakBox = $[68];
  let streakRow;
  if ($[69] !== activeDaysBox || $[70] !== longestStreakBox) {
    streakRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 4,
      children: [activeDaysBox, longestStreakBox],
    });
    $[69] = activeDaysBox;
    $[70] = longestStreakBox;
    $[71] = streakRow;
  } else streakRow = $[71];
  let children_5;
  if ($[72] !== stats.peakActivityDay) {
    children_5 =
      stats.peakActivityDay &&
      jsxProd_default_2(Text, {
        wrap: "truncate",
        children: [
          "Most active day:",
          " ",
          jsxProd_default(Text, {
            color: "claude",
            children: formatPeakDay_2(stats.peakActivityDay),
          }),
        ],
      });
    $[72] = stats.peakActivityDay;
    $[73] = children_5;
  } else children_5 = $[73];
  let peakDayBox;
  if ($[74] !== children_5) {
    peakDayBox = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: children_5,
    });
    $[74] = children_5;
    $[75] = peakDayBox;
  } else peakDayBox = $[75];
  let currentStreakText;
  if ($[76] !== allTimeStats.streaks.currentStreak) {
    currentStreakText = jsxProd_default(Text, {
      color: "claude",
      bold: true,
      children: allTimeStats.streaks.currentStreak,
    });
    $[76] = allTimeStats.streaks.currentStreak;
    $[77] = currentStreakText;
  } else currentStreakText = $[77];
  const streakDayWord = allTimeStats.streaks.currentStreak === 1 ? "day" : "days";
  let currentStreakBox;
  if ($[78] !== currentStreakText || $[79] !== streakDayWord) {
    currentStreakBox = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: jsxProd_default_2(Text, {
        wrap: "truncate",
        children: ["Current streak:", " ", currentStreakText, " ", streakDayWord],
      }),
    });
    $[78] = currentStreakText;
    $[79] = streakDayWord;
    $[80] = currentStreakBox;
  } else currentStreakBox = $[80];
  let peakRow;
  if ($[81] !== peakDayBox || $[82] !== currentStreakBox) {
    peakRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 4,
      children: [peakDayBox, currentStreakBox],
    });
    $[81] = peakDayBox;
    $[82] = currentStreakBox;
    $[83] = peakRow;
  } else peakRow = $[83];
  let tokenBreakdown;
  if ($[84] !== stats.modelUsage || $[85] !== totalTokens) {
    tokenBreakdown =
      totalTokens > 0 &&
      jsxProd_default(Text, {
        color: "subtle",
        wrap: "truncate",
        children: formatTokenBreakdown(stats.modelUsage),
      });
    $[84] = stats.modelUsage;
    $[85] = totalTokens;
    $[86] = tokenBreakdown;
  } else tokenBreakdown = $[86];
  let shotDistribution;
  if ($[87] === MEMO_CACHE_SENTINEL) {
    shotDistribution =
      null &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(Text, {
              children: "Shot distribution",
            }),
          }),
          jsxProd_default_2(Box, {
            flexDirection: "row",
            gap: 4,
            children: [
              jsxProd_default(Box, {
                flexDirection: "column",
                width: 28,
                children: jsxProd_default_2(Text, {
                  wrap: "truncate",
                  children: [
                    null.buckets[0].label,
                    ":",
                    " ",
                    jsxProd_default(Text, {
                      color: "claude",
                      children: null.buckets[0].count,
                    }),
                    jsxProd_default_2(Text, {
                      color: "subtle",
                      children: [" (", null.buckets[0].pct, "%)"],
                    }),
                  ],
                }),
              }),
              jsxProd_default(Box, {
                flexDirection: "column",
                width: 28,
                children: jsxProd_default_2(Text, {
                  wrap: "truncate",
                  children: [
                    null.buckets[1].label,
                    ":",
                    " ",
                    jsxProd_default(Text, {
                      color: "claude",
                      children: null.buckets[1].count,
                    }),
                    jsxProd_default_2(Text, {
                      color: "subtle",
                      children: [" (", null.buckets[1].pct, "%)"],
                    }),
                  ],
                }),
              }),
            ],
          }),
          jsxProd_default_2(Box, {
            flexDirection: "row",
            gap: 4,
            children: [
              jsxProd_default(Box, {
                flexDirection: "column",
                width: 28,
                children: jsxProd_default_2(Text, {
                  wrap: "truncate",
                  children: [
                    null.buckets[2].label,
                    ":",
                    " ",
                    jsxProd_default(Text, {
                      color: "claude",
                      children: null.buckets[2].count,
                    }),
                    jsxProd_default_2(Text, {
                      color: "subtle",
                      children: [" (", null.buckets[2].pct, "%)"],
                    }),
                  ],
                }),
              }),
              jsxProd_default(Box, {
                flexDirection: "column",
                width: 28,
                children: jsxProd_default_2(Text, {
                  wrap: "truncate",
                  children: [
                    null.buckets[3].label,
                    ":",
                    " ",
                    jsxProd_default(Text, {
                      color: "claude",
                      children: null.buckets[3].count,
                    }),
                    jsxProd_default_2(Text, {
                      color: "subtle",
                      children: [" (", null.buckets[3].pct, "%)"],
                    }),
                  ],
                }),
              }),
            ],
          }),
          jsxProd_default(Box, {
            flexDirection: "row",
            gap: 4,
            children: jsxProd_default(Box, {
              flexDirection: "column",
              width: 28,
              children: jsxProd_default_2(Text, {
                wrap: "truncate",
                children: [
                  "Avg/session:",
                  " ",
                  jsxProd_default(Text, {
                    color: "claude",
                    children: null.avgShots,
                  }),
                ],
              }),
            }),
          }),
        ],
      });
    $[87] = shotDistribution;
  } else shotDistribution = $[87];
  let funFactBox;
  if ($[88] !== funFact) {
    funFactBox =
      funFact &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          color: "suggestion",
          children: funFact,
        }),
      });
    $[88] = funFact;
    $[89] = funFactBox;
  } else funFactBox = $[89];
  let content;
  if (
    $[90] !== outerBox ||
    $[91] !== dateRangeSelector ||
    $[92] !== topRow ||
    $[93] !== sessionRow ||
    $[94] !== streakRow ||
    $[95] !== peakRow ||
    $[96] !== tokenBreakdown ||
    $[97] !== funFactBox ||
    $[98] !== flexDirection_3 ||
    $[99] !== marginTop ||
    $[100] !== heatmap
  ) {
    content = jsxProd_default_2(outerBox, {
      flexDirection: flexDirection_3,
      marginTop,
      children: [
        heatmap,
        dateRangeSelector,
        topRow,
        sessionRow,
        streakRow,
        peakRow,
        tokenBreakdown,
        null,
        shotDistribution,
        funFactBox,
      ],
    });
    $[90] = outerBox;
    $[91] = dateRangeSelector;
    $[92] = topRow;
    $[93] = sessionRow;
    $[94] = streakRow;
    $[95] = peakRow;
    $[96] = tokenBreakdown;
    $[97] = funFactBox;
    $[98] = flexDirection_3;
    $[99] = marginTop;
    $[100] = heatmap;
    $[101] = content;
  } else content = $[101];
  return content;
}
//@ chunk-j6tt9nsa.js:103403-104798 fingerprint (2.1.88 match: BOOK_COMPARISONS, 0.823)
/**
 * 书籍 token 数对照表。
 */
var BOOK_TOKEN_COMPARISONS = [
  {
    name: "The Little Prince",
    tokens: 22000,
  },
  {
    name: "The Old Man and the Sea",
    tokens: 35000,
  },
  {
    name: "A Christmas Carol",
    tokens: 37000,
  },
  {
    name: "Animal Farm",
    tokens: 39000,
  },
  {
    name: "Fahrenheit 451",
    tokens: 60000,
  },
  {
    name: "The Great Gatsby",
    tokens: 62000,
  },
  {
    name: "Slaughterhouse-Five",
    tokens: 64000,
  },
  {
    name: "Brave New World",
    tokens: 83000,
  },
  {
    name: "The Catcher in the Rye",
    tokens: 95000,
  },
  {
    name: "Harry Potter and the Philosopher's Stone",
    tokens: 103000,
  },
  {
    name: "The Hobbit",
    tokens: 123000,
  },
  {
    name: "1984",
    tokens: 123000,
  },
  {
    name: "To Kill a Mockingbird",
    tokens: 130000,
  },
  {
    name: "Pride and Prejudice",
    tokens: 156000,
  },
  {
    name: "Dune",
    tokens: 244000,
  },
  {
    name: "Moby-Dick",
    tokens: 268000,
  },
  {
    name: "Crime and Punishment",
    tokens: 274000,
  },
  {
    name: "A Game of Thrones",
    tokens: 381000,
  },
  {
    name: "Anna Karenina",
    tokens: 468000,
  },
  {
    name: "Don Quixote",
    tokens: 520000,
  },
  {
    name: "The Lord of the Rings",
    tokens: 576000,
  },
  {
    name: "The Count of Monte Cristo",
    tokens: 603000,
  },
  {
    name: "Les Mis\xE9rables",
    tokens: 689000,
  },
  {
    name: "War and Peace",
    tokens: 730000,
  },
];
var TOKEN_COMPARISONS = [
  {
    name: "a TED talk",
    minutes: 18,
  },
  {
    name: "an episode of The Office",
    minutes: 22,
  },
  {
    name: "listening to Abbey Road",
    minutes: 47,
  },
  {
    name: "a yoga class",
    minutes: 60,
  },
  {
    name: "a World Cup soccer match",
    minutes: 90,
  },
  {
    name: "a half marathon (average time)",
    minutes: 120,
  },
  {
    name: "the movie Inception",
    minutes: 148,
  },
  {
    name: "watching Titanic",
    minutes: 195,
  },
  {
    name: "a transatlantic flight",
    minutes: 420,
  },
  {
    name: "a full night of sleep",
    minutes: 480,
  },
];
//@ chunk-j6tt9nsa.js:104798-105403 fingerprint (2.1.88 match: generateFunFactoid, 0.651)
function generateFunFactoid(stats) {
  let factoids = [];
  let totalTokens = 0;
  for (let usage of Object.values(stats.modelUsage))
    totalTokens += (usage.inputTokens || 0) + (usage.outputTokens || 0);
  if (totalTokens > 0) {
    let matchingBooks = BOOK_TOKEN_COMPARISONS.filter((book) => totalTokens >= book.tokens);
    for (let book of matchingBooks) {
      let times = totalTokens / book.tokens;
      if (times >= 2)
        factoids.push(`Your input and output are ~${Math.floor(times)}x the tokens in ${book.name}`);
      else factoids.push(`Your input and output are about as many tokens as ${book.name}`);
    }
  }
  if (stats.longestSession) {
    let sessionMinutes = stats.longestSession.duration / 60000;
    for (let comparison of TOKEN_COMPARISONS) {
      let ratio = sessionMinutes / comparison.minutes;
      if (ratio >= 2)
        factoids.push(`Your longest session is ~${Math.floor(ratio)}x longer than ${comparison.name}`);
    }
  }
  if (factoids.length === 0) return "";
  let randomIndex = Math.floor(Math.random() * factoids.length);
  return factoids[randomIndex];
}
//@ chunk-j6tt9nsa.js:105403-108417 fingerprint (2.1.88 match: ModelsTab, 0.61)
function ModelsTab(props) {
  let $ = useMemoCache(61);
  let { stats, selectorRange, isLoading } = props;
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let [scrollIndex, setScrollIndex] = useState(0);
  let { columns: terminalWidth } = useTerminalSize();
  let rightBox;
  let statsRowBox;
  let outerBox;
  let canScrollDown;
  let canScrollUp;
  let modelEntries;
  let isScrollable;
  let flexDirection;
  let autoFocus;
  let onKeyDown;
  let chartBox;
  let dateRangeSelector;
  let earlyReturn;
  let width;
  let children;
  let flexDirection_2;
  let gap;
  let leftBox;
  let flexDirection_3;
  let marginTop;
  let tabIndex;
  if (
    $[0] !== focusHeader ||
    $[1] !== headerFocused ||
    $[2] !== isLoading ||
    $[3] !== scrollIndex ||
    $[4] !== selectorRange ||
    $[5] !== stats.dailyModelTokens ||
    $[6] !== stats.modelUsage ||
    $[7] !== terminalWidth
  ) {
    earlyReturn = EARLY_RETURN_SENTINEL;
    $e: {
      let { modelEntries: modelEntries_2, totalTokens } = sortModelUsage(stats.modelUsage);
      modelEntries = modelEntries_2;
      let onKeyDownImpl = function memoCache(event) {
        if (headerFocused) {
          return;
        }
        if (event.key === "down" && scrollIndex < modelEntries.length - 4) {
          event.preventDefault();
          setScrollIndex((prev) => Math.min(prev + 2, modelEntries.length - 4));
          return;
        }
        if (event.key === "up") {
          event.preventDefault();
          if (scrollIndex > 0) {
            event.stopPropagation();
            setScrollIndex(rowsAboveTwo);
          } else focusHeader();
        }
      };
      if (modelEntries.length === 0) {
        let emptyBox;
        if ($[29] === MEMO_CACHE_SENTINEL) {
          emptyBox = jsxProd_default(Box, {
            children: jsxProd_default(Text, {
              color: "subtle",
              children: "No model usage data available",
            }),
          });
          $[29] = emptyBox;
        } else emptyBox = $[29];
        earlyReturn = emptyBox;
        break $e;
      }
      let chartOutput = generateTokenChart(
        stats.dailyModelTokens,
        modelEntries.map(firstItem),
        terminalWidth,
      );
      let visibleModels = modelEntries.slice(scrollIndex, scrollIndex + 4);
      let midpoint = Math.ceil(visibleModels.length / 2);
      let leftModels = visibleModels.slice(0, midpoint);
      let rightModels = visibleModels.slice(midpoint);
      canScrollUp = scrollIndex > 0;
      canScrollDown = scrollIndex < modelEntries.length - 4;
      isScrollable = modelEntries.length > 4;
      outerBox = Box;
      flexDirection_3 = "column";
      marginTop = 1;
      tabIndex = 0;
      autoFocus = false;
      onKeyDown = onKeyDownImpl;
      chartBox =
        chartOutput &&
        jsxProd_default_2(Box, {
          flexDirection: "column",
          marginBottom: 1,
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: "Tokens per Day",
            }),
            jsxProd_default(Ansi, {
              children: chartOutput.chart,
            }),
            jsxProd_default(Text, {
              color: "subtle",
              children: chartOutput.xAxisLabels,
            }),
            jsxProd_default(Box, {
              children: chartOutput.legend.map(renderModelLegendItem),
            }),
          ],
        });
      if ($[30] !== isLoading || $[31] !== selectorRange) {
        dateRangeSelector = jsxProd_default(DateRangeSelector, {
          dateRange: selectorRange,
          isLoading,
        });
        $[30] = isLoading;
        $[31] = selectorRange;
        $[32] = dateRangeSelector;
      } else dateRangeSelector = $[32];
      statsRowBox = Box;
      flexDirection_2 = "row";
      gap = 4;
      leftBox = jsxProd_default(Box, {
        flexDirection: "column",
        width: 36,
        children: leftModels.map((leftModel) => {
          let [model, usage] = leftModel;
          return jsxProd_default(
            ModelEntry,
            {
              model,
              usage,
              totalTokens,
            },
            model,
          );
        }),
      });
      rightBox = Box;
      flexDirection = "column";
      width = 36;
      children = rightModels.map((rightModel) => {
        let [model, usage] = rightModel;
        return jsxProd_default(
          ModelEntry,
          {
            model,
            usage,
            totalTokens,
          },
          model,
        );
      });
    }
    $[0] = focusHeader;
    $[1] = headerFocused;
    $[2] = isLoading;
    $[3] = scrollIndex;
    $[4] = selectorRange;
    $[5] = stats.dailyModelTokens;
    $[6] = stats.modelUsage;
    $[7] = terminalWidth;
    $[8] = rightBox;
    $[9] = statsRowBox;
    $[10] = outerBox;
    $[11] = canScrollDown;
    $[12] = canScrollUp;
    $[13] = modelEntries;
    $[14] = isScrollable;
    $[15] = flexDirection;
    $[16] = autoFocus;
    $[17] = onKeyDown;
    $[18] = chartBox;
    $[19] = dateRangeSelector;
    $[20] = earlyReturn;
    $[21] = width;
    $[22] = children;
    $[23] = flexDirection_2;
    $[24] = gap;
    $[25] = leftBox;
    $[26] = flexDirection_3;
    $[27] = marginTop;
    $[28] = tabIndex;
  } else {
    rightBox = $[8];
    statsRowBox = $[9];
    outerBox = $[10];
    canScrollDown = $[11];
    canScrollUp = $[12];
    modelEntries = $[13];
    isScrollable = $[14];
    flexDirection = $[15];
    autoFocus = $[16];
    onKeyDown = $[17];
    chartBox = $[18];
    dateRangeSelector = $[19];
    earlyReturn = $[20];
    width = $[21];
    children = $[22];
    flexDirection_2 = $[23];
    gap = $[24];
    leftBox = $[25];
    flexDirection_3 = $[26];
    marginTop = $[27];
    tabIndex = $[28];
  }
  if (earlyReturn !== EARLY_RETURN_SENTINEL) return earlyReturn;
  let rightColumn;
  if ($[33] !== rightBox || $[34] !== flexDirection || $[35] !== width || $[36] !== children) {
    rightColumn = jsxProd_default(rightBox, {
      flexDirection,
      width,
      children,
    });
    $[33] = rightBox;
    $[34] = flexDirection;
    $[35] = width;
    $[36] = children;
    $[37] = rightColumn;
  } else rightColumn = $[37];
  let modelColumns;
  if (
    $[38] !== statsRowBox ||
    $[39] !== rightColumn ||
    $[40] !== flexDirection_2 ||
    $[41] !== gap ||
    $[42] !== leftBox
  ) {
    modelColumns = jsxProd_default_2(statsRowBox, {
      flexDirection: flexDirection_2,
      gap,
      children: [leftBox, rightColumn],
    });
    $[38] = statsRowBox;
    $[39] = rightColumn;
    $[40] = flexDirection_2;
    $[41] = gap;
    $[42] = leftBox;
    $[43] = modelColumns;
  } else modelColumns = $[43];
  let scrollHint;
  if (
    $[44] !== canScrollDown ||
    $[45] !== canScrollUp ||
    $[46] !== modelEntries ||
    $[47] !== scrollIndex ||
    $[48] !== isScrollable
  ) {
    scrollHint =
      isScrollable &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          color: "subtle",
          children: [
            canScrollUp ? figures_default.arrowUp : " ",
            " ",
            canScrollDown ? figures_default.arrowDown : " ",
            " ",
            scrollIndex + 1,
            "-",
            Math.min(scrollIndex + 4, modelEntries.length),
            " of",
            " ",
            modelEntries.length,
            " models",
            " ",
            jsxProd_default(KeyboardShortcutHint, {
              chord: ["up", "down"],
              action: "scroll",
              parens: true,
            }),
          ],
        }),
      });
    $[44] = canScrollDown;
    $[45] = canScrollUp;
    $[46] = modelEntries;
    $[47] = scrollIndex;
    $[48] = isScrollable;
    $[49] = scrollHint;
  } else scrollHint = $[49];
  let content;
  if (
    $[50] !== outerBox ||
    $[51] !== autoFocus ||
    $[52] !== onKeyDown ||
    $[53] !== chartBox ||
    $[54] !== dateRangeSelector ||
    $[55] !== modelColumns ||
    $[56] !== scrollHint ||
    $[57] !== flexDirection_3 ||
    $[58] !== marginTop ||
    $[59] !== tabIndex
  ) {
    content = jsxProd_default_2(outerBox, {
      flexDirection: flexDirection_3,
      marginTop,
      tabIndex,
      autoFocus,
      onKeyDown,
      children: [chartBox, dateRangeSelector, modelColumns, scrollHint],
    });
    $[50] = outerBox;
    $[51] = autoFocus;
    $[52] = onKeyDown;
    $[53] = chartBox;
    $[54] = dateRangeSelector;
    $[55] = modelColumns;
    $[56] = scrollHint;
    $[57] = flexDirection_3;
    $[58] = marginTop;
    $[59] = tabIndex;
    $[60] = content;
  } else content = $[60];
  return content;
}
//@ chunk-j6tt9nsa.js:108417-109501 fingerprint (2.1.88 match: ModelEntry, 0.556)
function ModelEntry(props) {
  let $ = useMemoCache(27);
  let { model, usage, totalTokens } = props;
  let percent;
  if ($[0] !== totalTokens || $[1] !== usage) {
    percent = percentOf(usage, totalTokens);
    $[0] = totalTokens;
    $[1] = usage;
    $[2] = percent;
  } else percent = $[2];
  let percentage = percent;
  let children;
  if ($[3] !== model) {
    children = renderModelName(model);
    $[3] = model;
    $[4] = children;
  } else children = $[4];
  let t4;
  if ($[5] !== children) {
    t4 = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[5] = children;
    $[6] = t4;
  } else t4 = $[6];
  let costText;
  if ($[7] !== percentage) {
    costText = jsxProd_default_2(Text, {
      color: "subtle",
      children: ["(", percentage, "%)"],
    });
    $[7] = percentage;
    $[8] = costText;
  } else costText = $[8];
  let bulletRowElement;
  if ($[9] !== t4 || $[10] !== costText) {
    bulletRowElement = jsxProd_default_2(BulletRow, {
      children: [t4, " ", costText],
    });
    $[9] = t4;
    $[10] = costText;
    $[11] = bulletRowElement;
  } else bulletRowElement = $[11];
  let t7;
  if ($[12] !== usage.inputTokens) {
    t7 = formatNumber(usage.inputTokens);
    $[12] = usage.inputTokens;
    $[13] = t7;
  } else t7 = $[13];
  let barElement;
  if ($[14] !== usage.outputTokens) {
    barElement = formatNumber(usage.outputTokens);
    $[14] = usage.outputTokens;
    $[15] = barElement;
  } else barElement = $[15];
  let lineElement;
  if ($[16] !== t7 || $[17] !== barElement) {
    lineElement = jsxProd_default_2(Text, {
      color: "subtle",
      wrap: "truncate",
      children: ["  ", "In: ", t7, " \xB7 Out:", " ", barElement],
    });
    $[16] = t7;
    $[17] = barElement;
    $[18] = lineElement;
  } else lineElement = $[18];
  let formattedCacheTokens;
  if ($[19] !== usage) {
    formattedCacheTokens = formatCacheTokens(usage);
    $[19] = usage;
    $[20] = formattedCacheTokens;
  } else formattedCacheTokens = $[20];
  let cacheTokenTextElement;
  if ($[21] !== formattedCacheTokens) {
    cacheTokenTextElement = jsxProd_default_2(Text, {
      color: "subtle",
      wrap: "truncate",
      children: ["  ", formattedCacheTokens],
    });
    $[21] = formattedCacheTokens;
    $[22] = cacheTokenTextElement;
  } else cacheTokenTextElement = $[22];
  let t10;
  if ($[23] !== cacheTokenTextElement || $[24] !== bulletRowElement || $[25] !== lineElement) {
    t10 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [bulletRowElement, lineElement, cacheTokenTextElement],
    });
    $[23] = cacheTokenTextElement;
    $[24] = bulletRowElement;
    $[25] = lineElement;
    $[26] = t10;
  } else t10 = $[26];
  return t10;
}
//@ chunk-j6tt9nsa.js:109501-110354 fingerprint (2.1.88 match: generateTokenChart, 0.82)
function generateTokenChart(dailyTokens, models, terminalWidth) {
  if (dailyTokens.length < 2 || models.length === 0) return null;
  let yAxisWidth = 7;
  let availableWidth = terminalWidth - yAxisWidth;
  let chartWidth = Math.min(52, Math.max(20, availableWidth));
  let recentData;
  if (dailyTokens.length >= chartWidth) recentData = dailyTokens.slice(-chartWidth);
  else {
    let repeatCount = Math.floor(chartWidth / dailyTokens.length);
    recentData = [];
    for (let day of dailyTokens) for (let i = 0; i < repeatCount; i++) recentData.push(day);
  }
  let theme = getThemeWithOverrides(resolveSetting("theme", "dark").value);
  let colors = [
    themeColorToAnsi(theme.suggestion),
    themeColorToAnsi(theme.success),
    themeColorToAnsi(theme.warning),
  ];
  let series = [];
  let legend = [];
  let topModels = models.slice(0, 3);
  let seriesColors = [theme.suggestion, theme.success, theme.warning];
  for (let model of topModels) {
    let data = recentData.map((day) => day.tokensByModel[model] || 0);
    if (data.some((v) => v > 0)) {
      series.push(data);
      legend.push({
        model: renderModelName(model),
        coloredBullet: applyColor(
          figures_default.bullet,
          seriesColors[(series.length - 1) % seriesColors.length],
        ),
      });
    }
  }
  if (series.length === 0) return null;
  let chart = usageRefreshSignal.plot(series, {
    height: 8,
    colors: colors.slice(0, series.length),
    format: (x) => {
      let label;
      if (x >= 999950000) label = (x / 1e9).toFixed(1) + "B";
      else if (x >= 1e6) label = (x / 1e6).toFixed(1) + "M";
      else if (x >= 1000) label = (x / 1000).toFixed(0) + "k";
      else label = x.toFixed(0);
      return label.padStart(6);
    },
  });
  let xAxisLabels = generateXAxisLabels(recentData, yAxisWidth);
  return {
    chart,
    legend,
    xAxisLabels,
  };
}
//@ chunk-j6tt9nsa.js:110354-110699 callgraph-fingerprint (2.1.88 match: generateXAxisLabels, 0.391)
function generateXAxisLabels(data, yAxisWidth) {
  if (data.length === 0) return "";
  let numLabels = Math.min(4, Math.max(2, Math.floor(data.length / 8)));
  let usableLength = data.length - 6;
  let step = Math.floor(usableLength / (numLabels - 1)) || 1;
  let labelPositions = [];
  for (let i = 0; i < numLabels; i++) {
    let idx = Math.min(i * step, data.length - 1);
    let label = formatPeakDay_2(data[idx].date);
    labelPositions.push({
      pos: idx,
      label,
    });
  }
  let result = " ".repeat(yAxisWidth);
  let currentPos = 0;
  for (let { pos, label } of labelPositions) {
    let spaces = Math.max(1, pos - currentPos);
    result += " ".repeat(spaces) + label;
    currentPos = pos + label.length;
  }
  return result;
}
//@ chunk-j6tt9nsa.js:110699-110845 fingerprint (2.1.88 match: handleScreenshot, 0.953)
async function handleScreenshot(stats, activeTab, tab, setStatus, clock) {
  setStatus("copying\u2026");
  let ansiText = renderStatsToAnsi(stats, activeTab, tab);
  let result = await copyAnsiToClipboard(ansiText);
  setStatus(result.success ? "copied!" : "copy failed");
  clock.setTimeout(() => setStatus(null), 2000);
}
//@ chunk-j6tt9nsa.js:110845-111142 fingerprint (2.1.88 match: renderStatsToAnsi, 1)
function renderStatsToAnsi(stats, theme, tab) {
  let lines = [];
  if (tab === "Overview") lines.push(...renderOverviewToAnsi(stats, theme));
  else lines.push(...renderModelsToAnsi(stats));
  while (lines.length > 0 && stripAnsi(lines.at(-1)).trim() === "") lines.pop();
  if (lines.length > 0) {
    let lastLine = lines.at(-1);
    let lastLineLen = bunStringWidth(lastLine);
    let contentWidth = tab === "Overview" ? 70 : 80;
    let statsLabel = "/stats";
    let padding = Math.max(2, contentWidth - lastLineLen - 6);
    lines[lines.length - 1] = lastLine + " ".repeat(padding) + sequential.gray("/stats");
  }
  return lines.join(`
`);
}
//@ chunk-j6tt9nsa.js:111142-112233 fingerprint (2.1.88 match: renderOverviewToAnsi, 0.843)
function renderOverviewToAnsi(stats, theme) {
  let lines = [];
  let theme_2 = getThemeWithOverrides(resolveSetting("theme", "dark").value);
  let paint = (text) => applyColor(text, theme_2.claude);
  let COL1_LABEL_WIDTH = 18;
  let COL2_START = 40;
  let COL2_LABEL_WIDTH = 18;
  let row = (l1, v1, l2, v2) => {
    let label1 = (l1 + ":").padEnd(18);
    let col1PlainLen = label1.length + v1.length;
    let spaceBetween = Math.max(2, 40 - col1PlainLen);
    let label2 = (l2 + ":").padEnd(18);
    return label1 + paint(v1) + " ".repeat(spaceBetween) + label2 + paint(v2);
  };
  if (stats.dailyActivity.length > 0) {
    lines.push(
      generateHeatmap(stats.dailyActivity, {
        terminalWidth: 56,
      }),
    );
    lines.push("");
  }
  let { modelEntries, totalTokens } = sortModelUsage(stats.modelUsage);
  let favoriteModel = modelEntries[0];
  if (favoriteModel)
    lines.push(
      row("Favorite model", renderModelName(favoriteModel[0]), "Total tokens", formatNumber(totalTokens)),
    );
  lines.push("");
  lines.push(
    row(
      "Sessions",
      formatNumber(stats.totalSessions),
      "Longest session",
      stats.longestSession ? formatDuration(stats.longestSession.duration) : "N/A",
    ),
  );
  let currentStreakVal = `${stats.streaks.currentStreak} ${stats.streaks.currentStreak === 1 ? "day" : "days"}`;
  let longestStreakVal = `${stats.streaks.longestStreak} ${stats.streaks.longestStreak === 1 ? "day" : "days"}`;
  lines.push(row("Current streak", currentStreakVal, "Longest streak", longestStreakVal));
  let activeDaysVal = `${stats.activeDays}/${stats.totalDays}`;
  let peakHourVal =
    stats.peakActivityHour !== null ? `${stats.peakActivityHour}:00-${stats.peakActivityHour + 1}:00` : "N/A";
  lines.push(row("Active days", activeDaysVal, "Peak hour", peakHourVal));
  if (totalTokens > 0) lines.push(sequential.gray(formatTokenBreakdown(stats.modelUsage)));
  lines.push("");
  let factoid = generateFunFactoid(stats);
  lines.push(paint(factoid));
  lines.push(sequential.gray(`Stats from the last ${stats.totalDays} days`));
  return lines;
}
//@ chunk-j6tt9nsa.js:112233-112973 fingerprint (2.1.88 match: renderModelsToAnsi, 0.958)
function renderModelsToAnsi(stats) {
  let lines = [];
  let { modelEntries, totalTokens } = sortModelUsage(stats.modelUsage);
  if (modelEntries.length === 0) {
    lines.push(sequential.gray("No model usage data available"));
    return lines;
  }
  let favoriteModel = modelEntries[0];
  let chartOutput = generateTokenChart(
    stats.dailyModelTokens,
    modelEntries.map(([model]) => model),
    80,
  );
  if (chartOutput) {
    lines.push(sequential.bold("Tokens per Day"));
    lines.push(chartOutput.chart);
    lines.push(sequential.gray(chartOutput.xAxisLabels));
    let legendLine = chartOutput.legend.map((item) => `${item.coloredBullet} ${item.model}`).join(" \xB7 ");
    lines.push(legendLine);
    lines.push("");
  }
  lines.push(
    `${figures_default.star} Favorite: ${sequential.magenta.bold(renderModelName(favoriteModel?.[0] || ""))} \xB7 ${figures_default.circle} Total: ${sequential.magenta(formatNumber(totalTokens))} tokens`,
  );
  lines.push("");
  let topModels = modelEntries.slice(0, 3);
  for (let [model, usage] of topModels) {
    let percent = percentOf(usage, totalTokens);
    lines.push(
      `${figures_default.bullet} ${sequential.bold(renderModelName(model))} ${sequential.gray(`(${percent}%)`)}`,
    );
    lines.push(
      sequential.dim(
        `  In: ${formatNumber(usage.inputTokens)} \xB7 Out: ${formatNumber(usage.outputTokens)}`,
      ),
    );
    lines.push(sequential.dim(`  ${formatCacheTokens(usage)}`));
  }
  return lines;
}
export { parseIsoDate, parseIsoDateTimePrefix, Stats };
