/**
 * components/Stats.tsx
 *
 * /stats 统计：每日活跃热力图、token 用量图、峰值日、最长会话等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Stats.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-9h8dr0qb.js (31)
 * attribution: fingerprint 16, placement 3, affinity 1, file-local 3, layout 7, callgraph-witnessed 1, callgraph-fingerprint 1
 */
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { aggregateClaudeCodeStatsForRange, totalUsageTokens } from "../utils/stats.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { y, fo, Qr, y5r, R } from "../../vendor/react/cjs/react.production.js";
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
import { DEFAULT_PROGRESS_DISPLAY } from "../_unattributed/chunk-18hwfzwa/part-001.js";

//@ chunk-9h8dr0qb.js:77494-77547 placement
/**
 * ISO 日期（YYYY-MM-DD）前缀与整串正则。错归（统计界面）。
 */
var ISO_DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}/;
var ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
//@ chunk-9h8dr0qb.js:77547-77702 placement = evaluateTimeBasedTrigger (0.576)
/**
 * 严格的 YYYY-MM-DD 字符串，日期有效则原样返回，否则 null。错归（统计界面 mergeCacheWithNewStats 使用），旧版名 evaluateTimeBasedTrigger 为错配。
 */
function parseIsoDate(o) {
  if (typeof o !== "string" || !ISO_DATE_RE.test(o)) return null;
  let date = new Date(o);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(o) ? o : null;
}
//@ chunk-9h8dr0qb.js:77702-77795 placement
/**
 * 以 YYYY-MM-DD 开头且可解析的时间字符串。
 */
function parseIsoDateTimePrefix(o) {
  return typeof o === "string" && ISO_DATE_PREFIX_RE.test(o) && Number.isFinite(Date.parse(o)) ? o : null;
}
//@ chunk-9h8dr0qb.js:90886-90915 affinity
function emptyStatsMap() {
  return new Map();
}
//@ chunk-9h8dr0qb.js:90915-90955 file-local
function rowsAboveTwo(prev) {
  return Math.max(prev - 2, 0);
}
//@ chunk-9h8dr0qb.js:90955-90990 layout
function firstItem(o) {
  let [Xe] = o;
  return Xe;
}
//@ chunk-9h8dr0qb.js:90990-91107 fingerprint = _temp1 (1)
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
//@ chunk-9h8dr0qb.js:91107-91213 layout = formatPeakDay (0.864)
function formatPeakDay_2(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
//@ chunk-9h8dr0qb.js:91213-91299 fingerprint = DATE_RANGE_LABELS (0.948)
var STATS_RANGE_LABELS = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};
var STATS_RANGES = ["all", "7d", "30d"];
//@ chunk-9h8dr0qb.js:91299-91361 file-local
function getNextDateRange(current) {
  let currentIndex = STATS_RANGES.indexOf(current);
  return STATS_RANGES[(currentIndex + 1) % STATS_RANGES.length];
}
//@ chunk-9h8dr0qb.js:91361-91575 fingerprint = createAllTimeStatsPromise (1)
function createAllTimeStatsPromise(storageV5) {
  return aggregateClaudeCodeStatsForRange("all", storageV5)
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
//@ chunk-9h8dr0qb.js:91575-91694 layout
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
//@ chunk-9h8dr0qb.js:91694-91736 layout
function emptyStatsProvider(storageV5) {
  return Promise.resolve(EMPTY_ACTIVITY_STATS);
}
//@ chunk-9h8dr0qb.js:91736-92964 callgraph-witnessed = Stats (0.296)
/**
 * /stats：活跃热力图、token 用量图表、常用模型、峰值日与连续天数等统计。
 */
function Stats(props) {
  let $ = w(21);
  let { onClose } = props;
  let { storageV5 } = useTheme_2();
  let [h] = y(isStatsScanAllowed);
  let E;
  if ($[0] !== storageV5 || $[1] !== h.allowed) {
    E = h.allowed ? createAllTimeStatsPromise(storageV5) : null;
    $[0] = storageV5;
    $[1] = h.allowed;
    $[2] = E;
  } else E = $[2];
  let T = E;
  let A;
  if ($[3] !== storageV5 || $[4] !== h.allowed) {
    A = h.allowed ? emptyStatsProvider(storageV5) : null;
    $[3] = storageV5;
    $[4] = h.allowed;
    $[5] = A;
  } else A = $[5];
  let v = A;
  let { rows } = useScrollViewportSize(useTerminalSize());
  let minHeight = Math.max(8, Math.min(rows - 4, 31));
  let W;
  if ($[6] !== onClose) {
    W = () =>
      onClose("Stats dialog dismissed", {
        display: "system",
      });
    $[6] = onClose;
    $[7] = W;
  } else W = $[7];
  let M;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    M = {
      context: "Settings",
    };
    $[8] = M;
  } else M = $[8];
  useKeybinding("confirm:no", W, M);
  if (T === null || v === null || !h.allowed) {
    const children = h.allowed ? null : h.reason;
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
    let K;
    if ($[11] !== minHeight || $[12] !== children_2) {
      K = jsxProd_default(Box, {
        flexDirection: "column",
        minHeight,
        children: children_2,
      });
      $[11] = minHeight;
      $[12] = children_2;
      $[13] = K;
    } else K = $[13];
    return K;
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
  if ($[15] !== v || $[16] !== T) {
    children = jsxProd_default(fo, {
      fallback,
      children: jsxProd_default(StatsContent, {
        allTimePromise: T,
        activeTimePromise: v,
      }),
    });
    $[15] = v;
    $[16] = T;
    $[17] = children;
  } else children = $[17];
  let K;
  if ($[18] !== minHeight || $[19] !== children) {
    K = jsxProd_default(Box, {
      flexDirection: "column",
      minHeight,
      children,
    });
    $[18] = minHeight;
    $[19] = children;
    $[20] = K;
  } else K = $[20];
  return K;
}
//@ chunk-9h8dr0qb.js:92964-96305 fingerprint = StatsContent (0.519)
function StatsContent(props) {
  let $ = w(50);
  let { allTimePromise, activeTimePromise } = props;
  let { storageV5 } = useTheme_2();
  let allTimeResult = Qr(allTimePromise);
  let activeTab = Qr(activeTimePromise);
  let [T, A] = y("all");
  let [v] = y(emptyStatsMap);
  let [F, U] = y5r();
  let [W, M] = y(null);
  let allTimeResult_2 = R(null);
  let K;
  if ($[0] !== T || $[1] !== v || $[2] !== storageV5) {
    K = function J() {
      let ee = allTimeResult_2.current ?? T;
      let range = getNextDateRange(ee);
      let V = range !== "all" && !v.has(range);
      if (V && !isStatsScanAllowed().allowed) {
        do range = getNextDateRange(range);
        while (range !== "all" && !v.has(range) && range !== ee);
        if (range === ee) {
          return;
        }
        V = false;
      }
      allTimeResult_2.current = range;
      if (V) {
        let L = aggregateClaudeCodeStatsForRange(range, storageV5).catch(() => {
          v.delete(range);
          return null;
        });
        v.set(range, L);
      }
      M(range);
      U(() => {
        A(range);
        M(null);
      });
    };
    $[0] = T;
    $[1] = v;
    $[2] = storageV5;
    $[3] = K;
  } else K = $[3];
  let J = K;
  let selectorRange = W ?? T;
  let [me, fe] = y("Overview");
  let [De, de] = y(null);
  let clock = useClock();
  let pe;
  if ($[4] !== T || $[5] !== v) {
    pe = T === "all" ? null : (v.get(T) ?? null);
    $[4] = T;
    $[5] = v;
    $[6] = pe;
  } else pe = $[6];
  let Ce = pe;
  let He = Ce ? Qr(Ce) : null;
  let stats =
    T === "all"
      ? allTimeResult.type === "success"
        ? allTimeResult.data
        : null
      : (He ?? (allTimeResult.type === "success" ? allTimeResult.data : null));
  let Oe = allTimeResult.type === "success" ? allTimeResult.data : null;
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let Ue;
  if (
    $[7] !== me ||
    $[8] !== activeTab ||
    $[9] !== clock ||
    $[10] !== J ||
    $[11] !== stats ||
    $[12] !== focusHeader
  ) {
    Ue = function ye(event) {
      if (event.key === "up") {
        event.preventDefault();
        focusHeader();
        return;
      }
      if (event.key === "r" && !event.ctrl && !event.meta) {
        event.preventDefault();
        J();
        return;
      }
      if (event.ctrl && event.key === "s" && stats) {
        event.preventDefault();
        handleScreenshot(stats, activeTab, me, de, clock);
      }
    };
    $[7] = me;
    $[8] = activeTab;
    $[9] = clock;
    $[10] = J;
    $[11] = stats;
    $[12] = focusHeader;
    $[13] = Ue;
  } else Ue = $[13];
  let onKeyDown = Ue;
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
    let _e;
    if ($[16] !== onKeyDown || $[17] !== children) {
      _e = jsxProd_default(Box, {
        marginTop: 1,
        tabIndex: 0,
        autoFocus: false,
        onKeyDown,
        children,
      });
      $[16] = onKeyDown;
      $[17] = children;
      $[18] = _e;
    } else _e = $[18];
    return _e;
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
    let _e;
    if ($[20] !== onKeyDown) {
      _e = jsxProd_default(Box, {
        marginTop: 1,
        tabIndex: 0,
        autoFocus: false,
        onKeyDown,
        children,
      });
      $[20] = onKeyDown;
      $[21] = _e;
    } else _e = $[21];
    return _e;
  }
  if (!stats || !Oe) {
    let We;
    let _e;
    if ($[22] === MEMO_CACHE_SENTINEL) {
      We = jsxProd_default(Spinner, {});
      _e = jsxProd_default(Text, {
        children: " Loading stats\u2026",
      });
      $[22] = We;
      $[23] = _e;
    } else {
      We = $[22];
      _e = $[23];
    }
    let Ne;
    if ($[24] !== onKeyDown) {
      Ne = jsxProd_default_2(Box, {
        marginTop: 1,
        tabIndex: 0,
        autoFocus: false,
        onKeyDown,
        children: [We, _e],
      });
      $[24] = onKeyDown;
      $[25] = Ne;
    } else Ne = $[25];
    return Ne;
  }
  let onTabChange;
  if ($[26] === MEMO_CACHE_SENTINEL) {
    onTabChange = (at) => fe(at);
    $[26] = onTabChange;
  } else onTabChange = $[26];
  let t7;
  if (
    $[27] !== activeTab ||
    $[28] !== Oe ||
    $[29] !== T ||
    $[30] !== stats ||
    $[31] !== F ||
    $[32] !== selectorRange
  ) {
    t7 = jsxProd_default(Tab, {
      title: "Overview",
      children: jsxProd_default(OverviewTab, {
        stats,
        allTimeStats: Oe,
        activeTimeStats: activeTab,
        dateRange: T,
        selectorRange,
        isLoading: F,
      }),
    });
    $[27] = activeTab;
    $[28] = Oe;
    $[29] = T;
    $[30] = stats;
    $[31] = F;
    $[32] = selectorRange;
    $[33] = t7;
  } else t7 = $[33];
  let t8;
  if ($[34] !== stats || $[35] !== F || $[36] !== selectorRange) {
    t8 = jsxProd_default(Tab, {
      title: "Models",
      children: jsxProd_default(ModelsTab, {
        stats,
        selectorRange,
        isLoading: F,
      }),
    });
    $[34] = stats;
    $[35] = F;
    $[36] = selectorRange;
    $[37] = t8;
  } else t8 = $[37];
  let t9;
  if ($[38] !== me || $[39] !== headerFocused || $[40] !== t7 || $[41] !== t8) {
    t9 = jsxProd_default(Box, {
      flexDirection: "row",
      gap: 1,
      marginBottom: 1,
      children: jsxProd_default_2(Tabs, {
        initialHeaderFocused: false,
        title: null,
        color: "claude",
        selectedTab: me,
        onTabChange,
        disableNavigation: headerFocused,
        children: [t7, t8],
      }),
    });
    $[38] = me;
    $[39] = headerFocused;
    $[40] = t7;
    $[41] = t8;
    $[42] = t9;
  } else t9 = $[42];
  const st = headerFocused ? "\u2193 stats" : "\u2191 tabs \xB7 r to cycle dates \xB7 ctrl+s to copy";
  const et = De ? ` \xB7 ${De}` : "";
  let t11;
  if ($[43] !== st || $[44] !== et) {
    t11 = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        children: [st, et],
      }),
    });
    $[43] = st;
    $[44] = et;
    $[45] = t11;
  } else t11 = $[45];
  let t12;
  if ($[46] !== onKeyDown || $[47] !== t11 || $[48] !== t9) {
    t12 = jsxProd_default_2(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: false,
      onKeyDown,
      children: [t9, t11],
    });
    $[46] = onKeyDown;
    $[47] = t11;
    $[48] = t9;
    $[49] = t12;
  } else t12 = $[49];
  return t12;
}
//@ chunk-9h8dr0qb.js:96305-96800 fingerprint = DateRangeSelector (0.89)
function DateRangeSelector(props) {
  let $ = w(9);
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
//@ chunk-9h8dr0qb.js:96800-96935 layout
function sortModelUsage(modelUsage) {
  let sorted = Object.entries(modelUsage).sort(([, p], [, h]) => totalUsageTokens(h) - totalUsageTokens(p));
  return {
    modelEntries: sorted,
    totalTokens: sorted.reduce((acc, [, h]) => acc + totalUsageTokens(h), 0),
  };
}
//@ chunk-9h8dr0qb.js:96935-97201 file-local
function formatTokenBreakdown(modelUsage) {
  let u = 0;
  let p = 0;
  let h = 0;
  let D = 0;
  for (let E of Object.values(modelUsage)) {
    u += E.inputTokens || 0;
    p += E.outputTokens || 0;
    h += E.cacheReadInputTokens || 0;
    D += E.cacheCreationInputTokens || 0;
  }
  return (
    `Input ${formatNumber(u)} \xB7 Output ${formatNumber(p)} \xB7 ` +
    `Cache read ${formatNumber(h)} \xB7 Cache write ${formatNumber(D)}`
  );
}
//@ chunk-9h8dr0qb.js:97201-97269 layout
function percentOf(usage, totalTokens) {
  if (totalTokens <= 0) return "0.0";
  return ((totalUsageTokens(usage) / totalTokens) * 100).toFixed(1);
}
//@ chunk-9h8dr0qb.js:97269-97388 layout
function formatCacheTokens(usage) {
  return (
    `Cache: ${formatNumber(usage.cacheReadInputTokens || 0)} read \xB7 ` +
    `${formatNumber(usage.cacheCreationInputTokens || 0)} write`
  );
}
//@ chunk-9h8dr0qb.js:97388-103714 fingerprint = OverviewTab (0.688)
function OverviewTab(props) {
  let $ = w(102);
  let { stats, allTimeStats, dateRange, selectorRange, isLoading } = props;
  let { columns: terminalWidth } = useTerminalSize();
  let v;
  let F;
  let U;
  let W;
  let M;
  let flexDirection;
  let H;
  let width;
  let children;
  let flexDirection_2;
  let gap;
  let marginBottom;
  let flexDirection_3;
  let marginTop;
  let me;
  let fe;
  if (
    $[0] !== allTimeStats.dailyActivity ||
    $[1] !== dateRange ||
    $[2] !== isLoading ||
    $[3] !== selectorRange ||
    $[4] !== stats ||
    $[5] !== terminalWidth
  ) {
    let { modelEntries, totalTokens } = sortModelUsage(stats.modelUsage);
    fe = totalTokens;
    let favoriteModel = modelEntries[0];
    let pe;
    if ($[22] !== stats) {
      pe = generateFunFactoid(stats);
      $[22] = stats;
      $[23] = pe;
    } else pe = $[23];
    W = pe;
    M = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : stats.totalDays;
    U = Box;
    flexDirection_3 = "column";
    marginTop = 1;
    if ($[24] !== allTimeStats.dailyActivity || $[25] !== terminalWidth) {
      me =
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
      $[26] = me;
    } else me = $[26];
    if ($[27] !== isLoading || $[28] !== selectorRange) {
      H = jsxProd_default(DateRangeSelector, {
        dateRange: selectorRange,
        isLoading,
      });
      $[27] = isLoading;
      $[28] = selectorRange;
      $[29] = H;
    } else H = $[29];
    F = Box;
    flexDirection_2 = "row";
    gap = 4;
    marginBottom = 1;
    v = Box;
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
    $[6] = v;
    $[7] = F;
    $[8] = U;
    $[9] = W;
    $[10] = M;
    $[11] = flexDirection;
    $[12] = H;
    $[13] = width;
    $[14] = children;
    $[15] = flexDirection_2;
    $[16] = gap;
    $[17] = marginBottom;
    $[18] = flexDirection_3;
    $[19] = marginTop;
    $[20] = me;
    $[21] = fe;
  } else {
    v = $[6];
    F = $[7];
    U = $[8];
    W = $[9];
    M = $[10];
    flexDirection = $[11];
    H = $[12];
    width = $[13];
    children = $[14];
    flexDirection_2 = $[15];
    gap = $[16];
    marginBottom = $[17];
    flexDirection_3 = $[18];
    marginTop = $[19];
    me = $[20];
    fe = $[21];
  }
  let de;
  if ($[30] !== v || $[31] !== flexDirection || $[32] !== width || $[33] !== children) {
    de = jsxProd_default(v, {
      flexDirection,
      width,
      children,
    });
    $[30] = v;
    $[31] = flexDirection;
    $[32] = width;
    $[33] = children;
    $[34] = de;
  } else de = $[34];
  let children_2;
  if ($[35] !== fe) {
    children_2 = formatNumber(fe);
    $[35] = fe;
    $[36] = children_2;
  } else children_2 = $[36];
  let Ce;
  if ($[37] !== children_2) {
    Ce = jsxProd_default(Box, {
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
    $[38] = Ce;
  } else Ce = $[38];
  let He;
  if (
    $[39] !== F ||
    $[40] !== de ||
    $[41] !== Ce ||
    $[42] !== flexDirection_2 ||
    $[43] !== gap ||
    $[44] !== marginBottom
  ) {
    He = jsxProd_default_2(F, {
      flexDirection: flexDirection_2,
      gap,
      marginBottom,
      children: [de, Ce],
    });
    $[39] = F;
    $[40] = de;
    $[41] = Ce;
    $[42] = flexDirection_2;
    $[43] = gap;
    $[44] = marginBottom;
    $[45] = He;
  } else He = $[45];
  let children_3;
  if ($[46] !== stats.totalSessions) {
    children_3 = formatNumber(stats.totalSessions);
    $[46] = stats.totalSessions;
    $[47] = children_3;
  } else children_3 = $[47];
  let Oe;
  if ($[48] !== children_3) {
    Oe = jsxProd_default(Box, {
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
    $[49] = Oe;
  } else Oe = $[49];
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
  let ke;
  if ($[52] !== children_4) {
    ke = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: children_4,
    });
    $[52] = children_4;
    $[53] = ke;
  } else ke = $[53];
  let Ue;
  if ($[54] !== Oe || $[55] !== ke) {
    Ue = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 4,
      children: [Oe, ke],
    });
    $[54] = Oe;
    $[55] = ke;
    $[56] = Ue;
  } else Ue = $[56];
  let Ie;
  if ($[57] !== stats.activeDays) {
    Ie = jsxProd_default(Text, {
      color: "claude",
      children: stats.activeDays,
    });
    $[57] = stats.activeDays;
    $[58] = Ie;
  } else Ie = $[58];
  let ye;
  if ($[59] !== M) {
    ye = jsxProd_default_2(Text, {
      color: "subtle",
      children: ["/", M],
    });
    $[59] = M;
    $[60] = ye;
  } else ye = $[60];
  let We;
  if ($[61] !== Ie || $[62] !== ye) {
    We = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: jsxProd_default_2(Text, {
        wrap: "truncate",
        children: ["Active days: ", Ie, ye],
      }),
    });
    $[61] = Ie;
    $[62] = ye;
    $[63] = We;
  } else We = $[63];
  let _e;
  if ($[64] !== stats.streaks.longestStreak) {
    _e = jsxProd_default(Text, {
      color: "claude",
      bold: true,
      children: stats.streaks.longestStreak,
    });
    $[64] = stats.streaks.longestStreak;
    $[65] = _e;
  } else _e = $[65];
  const Ne = stats.streaks.longestStreak === 1 ? "day" : "days";
  let at;
  if ($[66] !== _e || $[67] !== Ne) {
    at = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: jsxProd_default_2(Text, {
        wrap: "truncate",
        children: ["Longest streak:", " ", _e, " ", Ne],
      }),
    });
    $[66] = _e;
    $[67] = Ne;
    $[68] = at;
  } else at = $[68];
  let ot;
  if ($[69] !== We || $[70] !== at) {
    ot = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 4,
      children: [We, at],
    });
    $[69] = We;
    $[70] = at;
    $[71] = ot;
  } else ot = $[71];
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
  let et;
  if ($[74] !== children_5) {
    et = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: children_5,
    });
    $[74] = children_5;
    $[75] = et;
  } else et = $[75];
  let Ge;
  if ($[76] !== allTimeStats.streaks.currentStreak) {
    Ge = jsxProd_default(Text, {
      color: "claude",
      bold: true,
      children: allTimeStats.streaks.currentStreak,
    });
    $[76] = allTimeStats.streaks.currentStreak;
    $[77] = Ge;
  } else Ge = $[77];
  const Qe = allTimeStats.streaks.currentStreak === 1 ? "day" : "days";
  let ze;
  if ($[78] !== Ge || $[79] !== Qe) {
    ze = jsxProd_default(Box, {
      flexDirection: "column",
      width: 28,
      children: jsxProd_default_2(Text, {
        wrap: "truncate",
        children: ["Current streak:", " ", Ge, " ", Qe],
      }),
    });
    $[78] = Ge;
    $[79] = Qe;
    $[80] = ze;
  } else ze = $[80];
  let rt;
  if ($[81] !== et || $[82] !== ze) {
    rt = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 4,
      children: [et, ze],
    });
    $[81] = et;
    $[82] = ze;
    $[83] = rt;
  } else rt = $[83];
  let kt;
  if ($[84] !== stats.modelUsage || $[85] !== fe) {
    kt =
      fe > 0 &&
      jsxProd_default(Text, {
        color: "subtle",
        wrap: "truncate",
        children: formatTokenBreakdown(stats.modelUsage),
      });
    $[84] = stats.modelUsage;
    $[85] = fe;
    $[86] = kt;
  } else kt = $[86];
  let Ze;
  if ($[87] === MEMO_CACHE_SENTINEL) {
    Ze =
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
    $[87] = Ze;
  } else Ze = $[87];
  let Xe;
  if ($[88] !== W) {
    Xe =
      W &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          color: "suggestion",
          children: W,
        }),
      });
    $[88] = W;
    $[89] = Xe;
  } else Xe = $[89];
  let tt;
  if (
    $[90] !== U ||
    $[91] !== H ||
    $[92] !== He ||
    $[93] !== Ue ||
    $[94] !== ot ||
    $[95] !== rt ||
    $[96] !== kt ||
    $[97] !== Xe ||
    $[98] !== flexDirection_3 ||
    $[99] !== marginTop ||
    $[100] !== me
  ) {
    tt = jsxProd_default_2(U, {
      flexDirection: flexDirection_3,
      marginTop,
      children: [me, H, He, Ue, ot, rt, kt, null, Ze, Xe],
    });
    $[90] = U;
    $[91] = H;
    $[92] = He;
    $[93] = Ue;
    $[94] = ot;
    $[95] = rt;
    $[96] = kt;
    $[97] = Xe;
    $[98] = flexDirection_3;
    $[99] = marginTop;
    $[100] = me;
    $[101] = tt;
  } else tt = $[101];
  return tt;
}
//@ chunk-9h8dr0qb.js:103714-105109 fingerprint = BOOK_COMPARISONS (0.823)
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
//@ chunk-9h8dr0qb.js:105109-105714 fingerprint = generateFunFactoid (0.651)
function generateFunFactoid(stats) {
  let factoids = [];
  let totalTokens = 0;
  for (let D of Object.values(stats.modelUsage)) totalTokens += (D.inputTokens || 0) + (D.outputTokens || 0);
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
//@ chunk-9h8dr0qb.js:105714-108735 fingerprint = ModelsTab (0.61)
function ModelsTab(props) {
  let $ = w(61);
  let { stats, selectorRange, isLoading } = props;
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let [T, A] = y(0);
  let { columns: terminalWidth } = useTerminalSize();
  let U;
  let W;
  let M;
  let B;
  let H;
  let K;
  let ee;
  let flexDirection;
  let autoFocus;
  let onKeyDown;
  let J;
  let ae;
  let me;
  let width;
  let children;
  let flexDirection_2;
  let gap;
  let pe;
  let flexDirection_3;
  let marginTop;
  let tabIndex;
  if (
    $[0] !== focusHeader ||
    $[1] !== headerFocused ||
    $[2] !== isLoading ||
    $[3] !== T ||
    $[4] !== selectorRange ||
    $[5] !== stats.dailyModelTokens ||
    $[6] !== stats.modelUsage ||
    $[7] !== terminalWidth
  ) {
    me = EARLY_RETURN_SENTINEL;
    We: {
      let { modelEntries, totalTokens } = sortModelUsage(stats.modelUsage);
      K = modelEntries;
      let Ie = function Ie(event) {
        if (headerFocused) {
          return;
        }
        if (event.key === "down" && T < K.length - 4) {
          event.preventDefault();
          A((prev) => Math.min(prev + 2, K.length - 4));
          return;
        }
        if (event.key === "up") {
          event.preventDefault();
          if (T > 0) {
            event.stopPropagation();
            A(rowsAboveTwo);
          } else focusHeader();
        }
      };
      if (K.length === 0) {
        let ye;
        if ($[29] === MEMO_CACHE_SENTINEL) {
          ye = jsxProd_default(Box, {
            children: jsxProd_default(Text, {
              color: "subtle",
              children: "No model usage data available",
            }),
          });
          $[29] = ye;
        } else ye = $[29];
        me = ye;
        break We;
      }
      let chartOutput = generateTokenChart(stats.dailyModelTokens, K.map(firstItem), terminalWidth);
      let visibleModels = K.slice(T, T + 4);
      let midpoint = Math.ceil(visibleModels.length / 2);
      let leftModels = visibleModels.slice(0, midpoint);
      let rightModels = visibleModels.slice(midpoint);
      H = T > 0;
      B = T < K.length - 4;
      ee = K.length > 4;
      M = Box;
      flexDirection_3 = "column";
      marginTop = 1;
      tabIndex = 0;
      autoFocus = false;
      onKeyDown = Ie;
      J =
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
        ae = jsxProd_default(DateRangeSelector, {
          dateRange: selectorRange,
          isLoading,
        });
        $[30] = isLoading;
        $[31] = selectorRange;
        $[32] = ae;
      } else ae = $[32];
      W = Box;
      flexDirection_2 = "row";
      gap = 4;
      pe = jsxProd_default(Box, {
        flexDirection: "column",
        width: 36,
        children: leftModels.map((leftModel) => {
          let [et, Ge] = leftModel;
          return jsxProd_default(
            ModelEntry,
            {
              model: et,
              usage: Ge,
              totalTokens,
            },
            et,
          );
        }),
      });
      U = Box;
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
    $[3] = T;
    $[4] = selectorRange;
    $[5] = stats.dailyModelTokens;
    $[6] = stats.modelUsage;
    $[7] = terminalWidth;
    $[8] = U;
    $[9] = W;
    $[10] = M;
    $[11] = B;
    $[12] = H;
    $[13] = K;
    $[14] = ee;
    $[15] = flexDirection;
    $[16] = autoFocus;
    $[17] = onKeyDown;
    $[18] = J;
    $[19] = ae;
    $[20] = me;
    $[21] = width;
    $[22] = children;
    $[23] = flexDirection_2;
    $[24] = gap;
    $[25] = pe;
    $[26] = flexDirection_3;
    $[27] = marginTop;
    $[28] = tabIndex;
  } else {
    U = $[8];
    W = $[9];
    M = $[10];
    B = $[11];
    H = $[12];
    K = $[13];
    ee = $[14];
    flexDirection = $[15];
    autoFocus = $[16];
    onKeyDown = $[17];
    J = $[18];
    ae = $[19];
    me = $[20];
    width = $[21];
    children = $[22];
    flexDirection_2 = $[23];
    gap = $[24];
    pe = $[25];
    flexDirection_3 = $[26];
    marginTop = $[27];
    tabIndex = $[28];
  }
  if (me !== EARLY_RETURN_SENTINEL) return me;
  let Oe;
  if ($[33] !== U || $[34] !== flexDirection || $[35] !== width || $[36] !== children) {
    Oe = jsxProd_default(U, {
      flexDirection,
      width,
      children,
    });
    $[33] = U;
    $[34] = flexDirection;
    $[35] = width;
    $[36] = children;
    $[37] = Oe;
  } else Oe = $[37];
  let ye;
  if ($[38] !== W || $[39] !== Oe || $[40] !== flexDirection_2 || $[41] !== gap || $[42] !== pe) {
    ye = jsxProd_default_2(W, {
      flexDirection: flexDirection_2,
      gap,
      children: [pe, Oe],
    });
    $[38] = W;
    $[39] = Oe;
    $[40] = flexDirection_2;
    $[41] = gap;
    $[42] = pe;
    $[43] = ye;
  } else ye = $[43];
  let Qe;
  if ($[44] !== B || $[45] !== H || $[46] !== K || $[47] !== T || $[48] !== ee) {
    Qe =
      ee &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(Text, {
          color: "subtle",
          children: [
            H ? figures_default.arrowUp : " ",
            " ",
            B ? figures_default.arrowDown : " ",
            " ",
            T + 1,
            "-",
            Math.min(T + 4, K.length),
            " of",
            " ",
            K.length,
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
    $[44] = B;
    $[45] = H;
    $[46] = K;
    $[47] = T;
    $[48] = ee;
    $[49] = Qe;
  } else Qe = $[49];
  let kt;
  if (
    $[50] !== M ||
    $[51] !== autoFocus ||
    $[52] !== onKeyDown ||
    $[53] !== J ||
    $[54] !== ae ||
    $[55] !== ye ||
    $[56] !== Qe ||
    $[57] !== flexDirection_3 ||
    $[58] !== marginTop ||
    $[59] !== tabIndex
  ) {
    kt = jsxProd_default_2(M, {
      flexDirection: flexDirection_3,
      marginTop,
      tabIndex,
      autoFocus,
      onKeyDown,
      children: [J, ae, ye, Qe],
    });
    $[50] = M;
    $[51] = autoFocus;
    $[52] = onKeyDown;
    $[53] = J;
    $[54] = ae;
    $[55] = ye;
    $[56] = Qe;
    $[57] = flexDirection_3;
    $[58] = marginTop;
    $[59] = tabIndex;
    $[60] = kt;
  } else kt = $[60];
  return kt;
}
//@ chunk-9h8dr0qb.js:108735-109824 fingerprint = ModelEntry (0.556)
function ModelEntry(props) {
  let $ = w(27);
  let { model, usage, totalTokens } = props;
  let E;
  if ($[0] !== totalTokens || $[1] !== usage) {
    E = percentOf(usage, totalTokens);
    $[0] = totalTokens;
    $[1] = usage;
    $[2] = E;
  } else E = $[2];
  let percentage = E;
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
  let F;
  if ($[7] !== percentage) {
    F = jsxProd_default_2(Text, {
      color: "subtle",
      children: ["(", percentage, "%)"],
    });
    $[7] = percentage;
    $[8] = F;
  } else F = $[8];
  let U;
  if ($[9] !== t4 || $[10] !== F) {
    U = jsxProd_default_2(BulletRow, {
      children: [t4, " ", F],
    });
    $[9] = t4;
    $[10] = F;
    $[11] = U;
  } else U = $[11];
  let t7;
  if ($[12] !== usage.inputTokens) {
    t7 = formatNumber(usage.inputTokens);
    $[12] = usage.inputTokens;
    $[13] = t7;
  } else t7 = $[13];
  let M;
  if ($[14] !== usage.outputTokens) {
    M = formatNumber(usage.outputTokens);
    $[14] = usage.outputTokens;
    $[15] = M;
  } else M = $[15];
  let B;
  if ($[16] !== t7 || $[17] !== M) {
    B = jsxProd_default_2(Text, {
      color: "subtle",
      wrap: "truncate",
      children: ["  ", "In: ", t7, " \xB7 Out:", " ", M],
    });
    $[16] = t7;
    $[17] = M;
    $[18] = B;
  } else B = $[18];
  let H;
  if ($[19] !== usage) {
    H = formatCacheTokens(usage);
    $[19] = usage;
    $[20] = H;
  } else H = $[20];
  let K;
  if ($[21] !== H) {
    K = jsxProd_default_2(Text, {
      color: "subtle",
      wrap: "truncate",
      children: ["  ", H],
    });
    $[21] = H;
    $[22] = K;
  } else K = $[22];
  let t10;
  if ($[23] !== K || $[24] !== U || $[25] !== B) {
    t10 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [U, B, K],
    });
    $[23] = K;
    $[24] = U;
    $[25] = B;
    $[26] = t10;
  } else t10 = $[26];
  return t10;
}
//@ chunk-9h8dr0qb.js:109824-110697 fingerprint = generateTokenChart (0.82)
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
  let M = [theme.suggestion, theme.success, theme.warning];
  for (let model of topModels) {
    let data = recentData.map((day) => day.tokensByModel[model] || 0);
    if (data.some((v) => v > 0)) {
      series.push(data);
      legend.push({
        model: renderModelName(model),
        coloredBullet: applyColor(figures_default.bullet, M[(series.length - 1) % M.length]),
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
  let xAxisLabels = generateXAxisLabels(recentData, recentData.length, yAxisWidth);
  return {
    chart,
    legend,
    xAxisLabels,
  };
}
//@ chunk-9h8dr0qb.js:110697-111044 callgraph-fingerprint = generateXAxisLabels (0.39)
function generateXAxisLabels(data, _chartWidth, yAxisOffset) {
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
  let result = " ".repeat(yAxisOffset);
  let currentPos = 0;
  for (let { pos, label } of labelPositions) {
    let spaces = Math.max(1, pos - currentPos);
    result += " ".repeat(spaces) + label;
    currentPos = pos + label.length;
  }
  return result;
}
//@ chunk-9h8dr0qb.js:111044-111190 fingerprint = handleScreenshot (0.953)
async function handleScreenshot(stats, activeTab, p, h, clock) {
  h("copying\u2026");
  let ansiText = renderStatsToAnsi(stats, activeTab, p);
  let result = await copyAnsiToClipboard(ansiText);
  h(result.success ? "copied!" : "copy failed");
  clock.setTimeout(() => h(null), 2000);
}
//@ chunk-9h8dr0qb.js:111190-111487 fingerprint = renderStatsToAnsi (1)
function renderStatsToAnsi(stats, activeTab, p) {
  let lines = [];
  if (p === "Overview") lines.push(...renderOverviewToAnsi(stats, activeTab));
  else lines.push(...renderModelsToAnsi(stats));
  while (lines.length > 0 && stripAnsi(lines.at(-1)).trim() === "") lines.pop();
  if (lines.length > 0) {
    let lastLine = lines.at(-1);
    let lastLineLen = bunStringWidth(lastLine);
    let contentWidth = p === "Overview" ? 70 : 80;
    let statsLabel = "/stats";
    let padding = Math.max(2, contentWidth - lastLineLen - 6);
    lines[lines.length - 1] = lastLine + " ".repeat(padding) + sequential.gray("/stats");
  }
  return lines.join(`
`);
}
//@ chunk-9h8dr0qb.js:111487-112580 fingerprint = renderOverviewToAnsi (0.843)
function renderOverviewToAnsi(stats, u) {
  let lines = [];
  let theme = getThemeWithOverrides(resolveSetting("theme", "dark").value);
  let D = (text) => applyColor(text, theme.claude);
  let COL1_LABEL_WIDTH = 18;
  let COL2_START = 40;
  let COL2_LABEL_WIDTH = 18;
  let row = (l1, v1, l2, v2) => {
    let label1 = (l1 + ":").padEnd(18);
    let col1PlainLen = label1.length + v1.length;
    let spaceBetween = Math.max(2, 40 - col1PlainLen);
    let label2 = (l2 + ":").padEnd(18);
    return label1 + D(v1) + " ".repeat(spaceBetween) + label2 + D(v2);
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
  lines.push(D(factoid));
  lines.push(sequential.gray(`Stats from the last ${stats.totalDays} days`));
  return lines;
}
//@ chunk-9h8dr0qb.js:112580-113320 fingerprint = renderModelsToAnsi (0.958)
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
    let F = percentOf(usage, totalTokens);
    lines.push(
      `${figures_default.bullet} ${sequential.bold(renderModelName(model))} ${sequential.gray(`(${F}%)`)}`,
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
//@ chunk-18hwfzwa.js:1668742-1668823 fingerprint = DATE_RANGE_ORDER (0.539)
function DATE_RANGE_ORDER(toolProgress) {
  for (let x of toolProgress.values()) if (DEFAULT_PROGRESS_DISPLAY[x.kind] === "all") return true;
  return false;
}
export { DATE_RANGE_ORDER, parseIsoDate, parseIsoDateTimePrefix, Stats };
