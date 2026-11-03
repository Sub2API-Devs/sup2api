/**
 * components/Stats.tsx
 *
 * /stats 统计：每日活跃热力图、token 用量图、峰值日、最长会话等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Stats.tsx
 * pieces: chunk-18hwfzwa.js (2), chunk-9h8dr0qb.js (31)
 * attribution: affinity 2, fingerprint 16, placement 3, file-local 3, layout 7, callgraph-witnessed 1, callgraph-fingerprint 1
 */
import { r, e, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Ansi } from "../ink/components/AnsiText.js";
import { aggregateClaudeCodeStatsForRange, totalUsageTokens } from "../utils/stats.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Me } from "./design-system/ThemeProvider.js";
import { y, fo, Qr, y5r, R } from "../../vendor/react/cjs/react.production.js";
import { K2n } from "../services/usageInsights/transcriptScan.js";
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
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { BulletRow } from "./design-system/BulletRow.js";
import { getThemeWithOverrides } from "../utils/systemTheme.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { themeColorToAnsi } from "../utils/theme.js";
import { applyColor } from "../ink/colorize.js";
import { Rl } from "./Settings/Usage.js";
import { copyAnsiToClipboard } from "../utils/screenshotClipboard.js";
import { Yn } from "../utils/stripAnsi.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { sequential } from "../utils/sequential.js";

/**
 * ISO 日期（YYYY-MM-DD）前缀与整串正则。错归（统计界面）。
 */
//@ chunk-9h8dr0qb.js:77494-77547 placement
var ISO_DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}/,
  ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/**
 * 严格的 YYYY-MM-DD 字符串，日期有效则原样返回，否则 null。错归（统计界面 mergeCacheWithNewStats 使用），旧版名 evaluateTimeBasedTrigger 为错配。
 */
//@ chunk-9h8dr0qb.js:77547-77702 placement = evaluateTimeBasedTrigger (0.576)
function parseIsoDate(o) {
  if (typeof o !== "string" || !ISO_DATE_RE.test(o)) return null;
  let date = new Date(o);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(o) ? o : null;
}
/**
 * 以 YYYY-MM-DD 开头且可解析的时间字符串。
 */
//@ chunk-9h8dr0qb.js:77702-77795 placement
function parseIsoDateTimePrefix(o) {
  return typeof o === "string" && ISO_DATE_PREFIX_RE.test(o) && Number.isFinite(Date.parse(o)) ? o : null;
}
//@ chunk-9h8dr0qb.js:90886-90915 affinity
function kf() {
  return new Map();
}
//@ chunk-9h8dr0qb.js:90915-90955 file-local
function Tf(prev_0) {
  return Math.max(prev_0 - 2, 0);
}
//@ chunk-9h8dr0qb.js:90955-90990 layout
function Df(o) {
  let [Xe] = o;
  return Xe;
}
//@ chunk-9h8dr0qb.js:90990-91107 fingerprint = _temp1 (1)
function renderModelLegendItem(item, i) {
  return r(
    Text,
    { children: [i > 0 ? " \xB7 " : "", e(Ansi, { children: item.coloredBullet }), " ", item.model] },
    item.model,
  );
}
//@ chunk-9h8dr0qb.js:91107-91213 layout = formatPeakDay (0.864)
function formatPeakDay_2(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
//@ chunk-9h8dr0qb.js:91213-91299 fingerprint = DATE_RANGE_LABELS (0.948)
var ts = { "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" },
  mo = ["all", "7d", "30d"];
//@ chunk-9h8dr0qb.js:91299-91361 file-local
function getNextDateRange(current) {
  let currentIndex = mo.indexOf(current);
  return mo[(currentIndex + 1) % mo.length];
}
//@ chunk-9h8dr0qb.js:91361-91575 fingerprint = createAllTimeStatsPromise (1)
function createAllTimeStatsPromise(o) {
  return aggregateClaudeCodeStatsForRange("all", o)
    .then((data) => {
      if (!data || data.totalSessions === 0) return { type: "empty" };
      return { type: "success", data: data };
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
  lastWeekSessions: { count: 0, medianMs: 0, averageMs: 0, longestMs: 0 },
};
//@ chunk-9h8dr0qb.js:91694-91736 layout
function nl(o) {
  return Promise.resolve(EMPTY_ACTIVITY_STATS);
}
/**
 * /stats：活跃热力图、token 用量图表、常用模型、峰值日与连续天数等统计。
 */
//@ chunk-9h8dr0qb.js:91736-92964 callgraph-witnessed = Stats (0.296)
function Stats(t0) {
  let $ = w(21),
    { onClose: onClose } = t0,
    { storageV5: storageV5 } = Me(),
    [h] = y(K2n),
    E;
  if ($[0] !== storageV5 || $[1] !== h.allowed)
    ((E = h.allowed ? createAllTimeStatsPromise(storageV5) : null),
      ($[0] = storageV5),
      ($[1] = h.allowed),
      ($[2] = E));
  else E = $[2];
  let T = E,
    A;
  if ($[3] !== storageV5 || $[4] !== h.allowed)
    ((A = h.allowed ? nl(storageV5) : null), ($[3] = storageV5), ($[4] = h.allowed), ($[5] = A));
  else A = $[5];
  let v = A,
    { rows: rows } = useScrollViewportSize(useTerminalSize()),
    max = Math.max(8, Math.min(rows - 4, 31)),
    W;
  if ($[6] !== onClose)
    ((W = () => onClose("Stats dialog dismissed", { display: "system" })), ($[6] = onClose), ($[7] = W));
  else W = $[7];
  let M;
  if ($[8] === MEMO_CACHE_SENTINEL) ((M = { context: "Settings" }), ($[8] = M));
  else M = $[8];
  if ((useKeybinding("confirm:no", W, M), T === null || v === null || !h.allowed)) {
    const B = h.allowed ? null : h.reason;
    let H;
    if ($[9] !== B)
      ((H = e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, wrap: "wrap", children: B }) })),
        ($[9] = B),
        ($[10] = H));
    else H = $[10];
    let K;
    if ($[11] !== max || $[12] !== H)
      ((K = e(Box, { flexDirection: "column", minHeight: max, children: H })),
        ($[11] = max),
        ($[12] = H),
        ($[13] = K));
    else K = $[13];
    return K;
  }
  let B;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((B = r(Box, {
      marginTop: 1,
      children: [e(Spinner, {}), e(Text, { children: " Loading your Claude Code stats\u2026" })],
    })),
      ($[14] = B));
  else B = $[14];
  let H;
  if ($[15] !== v || $[16] !== T)
    ((H = e(fo, { fallback: B, children: e(StatsContent, { allTimePromise: T, activeTimePromise: v }) })),
      ($[15] = v),
      ($[16] = T),
      ($[17] = H));
  else H = $[17];
  let K;
  if ($[18] !== max || $[19] !== H)
    ((K = e(Box, { flexDirection: "column", minHeight: max, children: H })),
      ($[18] = max),
      ($[19] = H),
      ($[20] = K));
  else K = $[20];
  return K;
}
//@ chunk-9h8dr0qb.js:92964-96305 fingerprint = StatsContent (0.519)
function StatsContent(t0) {
  let $ = w(50),
    { allTimePromise: allTimePromise, activeTimePromise: activeTimePromise } = t0,
    { storageV5: storageV5 } = Me(),
    D = Qr(allTimePromise),
    E = Qr(activeTimePromise),
    [T, A] = y("all"),
    [v] = y(kf),
    [F, U] = y5r(),
    [W, M] = y(null),
    allTimeResult = R(null),
    K;
  if ($[0] !== T || $[1] !== v || $[2] !== storageV5)
    ((K = function J() {
      let ee = allTimeResult.current ?? T;
      let ne = getNextDateRange(ee);
      let V = ne !== "all" && !v.has(ne);
      if (V && !K2n().allowed) {
        do ne = getNextDateRange(ne);
        while (ne !== "all" && !v.has(ne) && ne !== ee);
        if (ne === ee) {
          return;
        }
        V = !1;
      }
      if (((allTimeResult.current = ne), V)) {
        let L = aggregateClaudeCodeStatsForRange(ne, storageV5).catch(() => (v.delete(ne), null));
        v.set(ne, L);
      }
      (M(ne),
        U(() => {
          (A(ne), M(null));
        }));
    }),
      ($[0] = T),
      ($[1] = v),
      ($[2] = storageV5),
      ($[3] = K));
  else K = $[3];
  let J = K,
    ae = W ?? T,
    [me, fe] = y("Overview"),
    [De, de] = y(null),
    ve = useClock(),
    pe;
  if ($[4] !== T || $[5] !== v)
    ((pe = T === "all" ? null : (v.get(T) ?? null)), ($[4] = T), ($[5] = v), ($[6] = pe));
  else pe = $[6];
  let Ce = pe,
    He = Ce ? Qr(Ce) : null,
    xe =
      T === "all" ? (D.type === "success" ? D.data : null) : (He ?? (D.type === "success" ? D.data : null)),
    Oe = D.type === "success" ? D.data : null,
    { headerFocused: headerFocused, focusHeader: focusHeader } = useTabHeaderFocus(),
    Ue;
  if ($[7] !== me || $[8] !== E || $[9] !== ve || $[10] !== J || $[11] !== xe || $[12] !== focusHeader)
    ((Ue = function ye(Ie) {
      if (Ie.key === "up") {
        (Ie.preventDefault(), focusHeader());
        return;
      }
      if (Ie.key === "r" && !Ie.ctrl && !Ie.meta) {
        (Ie.preventDefault(), J());
        return;
      }
      if (Ie.ctrl && Ie.key === "s" && xe) (Ie.preventDefault(), handleScreenshot(xe, E, me, de, ve));
    }),
      ($[7] = me),
      ($[8] = E),
      ($[9] = ve),
      ($[10] = J),
      ($[11] = xe),
      ($[12] = focusHeader),
      ($[13] = Ue));
  else Ue = $[13];
  let ye = Ue;
  if (D.type === "error") {
    let We;
    if ($[14] !== D.message)
      ((We = r(Text, { color: "error", children: ["Failed to load stats: ", D.message] })),
        ($[14] = D.message),
        ($[15] = We));
    else We = $[15];
    let _e;
    if ($[16] !== ye || $[17] !== We)
      ((_e = e(Box, { marginTop: 1, tabIndex: 0, autoFocus: !1, onKeyDown: ye, children: We })),
        ($[16] = ye),
        ($[17] = We),
        ($[18] = _e));
    else _e = $[18];
    return _e;
  }
  if (D.type === "empty") {
    let We;
    if ($[19] === MEMO_CACHE_SENTINEL)
      ((We = e(Text, { color: "warning", children: "No stats available yet. Start using Claude Code!" })),
        ($[19] = We));
    else We = $[19];
    let _e;
    if ($[20] !== ye)
      ((_e = e(Box, { marginTop: 1, tabIndex: 0, autoFocus: !1, onKeyDown: ye, children: We })),
        ($[20] = ye),
        ($[21] = _e));
    else _e = $[21];
    return _e;
  }
  if (!xe || !Oe) {
    let We, _e;
    if ($[22] === MEMO_CACHE_SENTINEL)
      ((We = e(Spinner, {})),
        (_e = e(Text, { children: " Loading stats\u2026" })),
        ($[22] = We),
        ($[23] = _e));
    else ((We = $[22]), (_e = $[23]));
    let Ne;
    if ($[24] !== ye)
      ((Ne = r(Box, { marginTop: 1, tabIndex: 0, autoFocus: !1, onKeyDown: ye, children: [We, _e] })),
        ($[24] = ye),
        ($[25] = Ne));
    else Ne = $[25];
    return Ne;
  }
  let We;
  if ($[26] === MEMO_CACHE_SENTINEL) ((We = (at) => fe(at)), ($[26] = We));
  else We = $[26];
  let _e;
  if ($[27] !== E || $[28] !== Oe || $[29] !== T || $[30] !== xe || $[31] !== F || $[32] !== ae)
    ((_e = e(Tab, {
      title: "Overview",
      children: e(OverviewTab, {
        stats: xe,
        allTimeStats: Oe,
        activeTimeStats: E,
        dateRange: T,
        selectorRange: ae,
        isLoading: F,
      }),
    })),
      ($[27] = E),
      ($[28] = Oe),
      ($[29] = T),
      ($[30] = xe),
      ($[31] = F),
      ($[32] = ae),
      ($[33] = _e));
  else _e = $[33];
  let Ne;
  if ($[34] !== xe || $[35] !== F || $[36] !== ae)
    ((Ne = e(Tab, {
      title: "Models",
      children: e(ModelsTab, { stats: xe, selectorRange: ae, isLoading: F }),
    })),
      ($[34] = xe),
      ($[35] = F),
      ($[36] = ae),
      ($[37] = Ne));
  else Ne = $[37];
  let ot;
  if ($[38] !== me || $[39] !== headerFocused || $[40] !== _e || $[41] !== Ne)
    ((ot = e(Box, {
      flexDirection: "row",
      gap: 1,
      marginBottom: 1,
      children: r(Tabs, {
        initialHeaderFocused: !1,
        title: null,
        color: "claude",
        selectedTab: me,
        onTabChange: We,
        disableNavigation: headerFocused,
        children: [_e, Ne],
      }),
    })),
      ($[38] = me),
      ($[39] = headerFocused),
      ($[40] = _e),
      ($[41] = Ne),
      ($[42] = ot));
  else ot = $[42];
  const st = headerFocused ? "\u2193 stats" : "\u2191 tabs \xB7 r to cycle dates \xB7 ctrl+s to copy",
    et = De ? ` \xB7 ${De}` : "";
  let Ge;
  if ($[43] !== st || $[44] !== et)
    ((Ge = e(Box, { paddingLeft: 2, children: r(Text, { dimColor: !0, children: [st, et] }) })),
      ($[43] = st),
      ($[44] = et),
      ($[45] = Ge));
  else Ge = $[45];
  let Qe;
  if ($[46] !== ye || $[47] !== Ge || $[48] !== ot)
    ((Qe = r(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: !1,
      onKeyDown: ye,
      children: [ot, Ge],
    })),
      ($[46] = ye),
      ($[47] = Ge),
      ($[48] = ot),
      ($[49] = Qe));
  else Qe = $[49];
  return Qe;
}
//@ chunk-9h8dr0qb.js:96305-96800 fingerprint = DateRangeSelector (0.89)
function DateRangeSelector(t0) {
  let $ = w(9),
    { dateRange: dateRange, isLoading: isLoading } = t0,
    D;
  if ($[0] !== dateRange)
    ((D = mo.map((range, T) =>
      r(
        Text,
        {
          children: [
            T > 0 && e(Text, { dimColor: !0, children: " \xB7 " }),
            range === dateRange
              ? e(Text, { bold: !0, color: "claude", children: ts[range] })
              : e(Text, { dimColor: !0, children: ts[range] }),
          ],
        },
        range,
      ),
    )),
      ($[0] = dateRange),
      ($[1] = D));
  else D = $[1];
  let A;
  if ($[2] !== D) ((A = e(Box, { children: D })), ($[2] = D), ($[3] = A));
  else A = $[3];
  let v;
  if ($[4] !== isLoading) ((v = isLoading && e(Spinner, {})), ($[4] = isLoading), ($[5] = v));
  else v = $[5];
  let F;
  if ($[6] !== A || $[7] !== v)
    ((F = r(Box, { marginBottom: 1, gap: 1, children: [A, v] })), ($[6] = A), ($[7] = v), ($[8] = F));
  else F = $[8];
  return F;
}
//@ chunk-9h8dr0qb.js:96800-96935 layout
function sortModelUsage(o) {
  let sorted = Object.entries(o).sort(([, p], [, h]) => totalUsageTokens(h) - totalUsageTokens(p));
  return { modelEntries: sorted, totalTokens: sorted.reduce((p, [, h]) => p + totalUsageTokens(h), 0) };
}
//@ chunk-9h8dr0qb.js:96935-97201 file-local
function formatTokenBreakdown(o) {
  let u = 0,
    p = 0,
    h = 0,
    D = 0;
  for (let E of Object.values(o))
    ((u += E.inputTokens || 0),
      (p += E.outputTokens || 0),
      (h += E.cacheReadInputTokens || 0),
      (D += E.cacheCreationInputTokens || 0));
  return (
    `Input ${formatNumber(u)} \xB7 Output ${formatNumber(p)} \xB7 ` +
    `Cache read ${formatNumber(h)} \xB7 Cache write ${formatNumber(D)}`
  );
}
//@ chunk-9h8dr0qb.js:97201-97269 layout
function _i(o, u) {
  if (u <= 0) return "0.0";
  return ((totalUsageTokens(o) / u) * 100).toFixed(1);
}
//@ chunk-9h8dr0qb.js:97269-97388 layout
function formatCacheTokens(o) {
  return (
    `Cache: ${formatNumber(o.cacheReadInputTokens || 0)} read \xB7 ` +
    `${formatNumber(o.cacheCreationInputTokens || 0)} write`
  );
}
//@ chunk-9h8dr0qb.js:97388-103714 fingerprint = OverviewTab (0.688)
function OverviewTab(o) {
  let $ = w(102),
    {
      stats: stats,
      allTimeStats: allTimeStats,
      dateRange: dateRange,
      selectorRange: selectorRange,
      isLoading: isLoading,
    } = o,
    { columns: terminalWidth } = useTerminalSize(),
    v,
    F,
    U,
    W,
    M,
    B,
    H,
    K,
    ee,
    ne,
    V,
    L,
    J,
    ae,
    me,
    fe;
  if (
    $[0] !== allTimeStats.dailyActivity ||
    $[1] !== dateRange ||
    $[2] !== isLoading ||
    $[3] !== selectorRange ||
    $[4] !== stats ||
    $[5] !== terminalWidth
  ) {
    let { modelEntries: modelEntries, totalTokens: totalTokens } = sortModelUsage(stats.modelUsage);
    fe = totalTokens;
    let favoriteModel = modelEntries[0];
    let pe;
    if ($[22] !== stats) ((pe = generateFunFactoid(stats)), ($[22] = stats), ($[23] = pe));
    else pe = $[23];
    W = pe;
    M = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : stats.totalDays;
    U = Box;
    J = "column";
    ae = 1;
    if ($[24] !== allTimeStats.dailyActivity || $[25] !== terminalWidth)
      ((me =
        allTimeStats.dailyActivity.length > 0 &&
        e(Box, {
          flexDirection: "column",
          marginBottom: 1,
          children: e(Ansi, {
            children: generateHeatmap(allTimeStats.dailyActivity, { terminalWidth: terminalWidth }),
          }),
        })),
        ($[24] = allTimeStats.dailyActivity),
        ($[25] = terminalWidth),
        ($[26] = me));
    else me = $[26];
    if ($[27] !== isLoading || $[28] !== selectorRange)
      ((H = e(DateRangeSelector, { dateRange: selectorRange, isLoading: isLoading })),
        ($[27] = isLoading),
        ($[28] = selectorRange),
        ($[29] = H));
    else H = $[29];
    F = Box;
    ne = "row";
    V = 4;
    L = 1;
    v = Box;
    B = "column";
    K = 28;
    ee =
      favoriteModel &&
      r(Text, {
        wrap: "truncate",
        children: [
          "Favorite model:",
          " ",
          e(Text, { color: "claude", bold: !0, children: renderModelName(favoriteModel[0]) }),
        ],
      });
    (($[0] = allTimeStats.dailyActivity),
      ($[1] = dateRange),
      ($[2] = isLoading),
      ($[3] = selectorRange),
      ($[4] = stats),
      ($[5] = terminalWidth),
      ($[6] = v),
      ($[7] = F),
      ($[8] = U),
      ($[9] = W),
      ($[10] = M),
      ($[11] = B),
      ($[12] = H),
      ($[13] = K),
      ($[14] = ee),
      ($[15] = ne),
      ($[16] = V),
      ($[17] = L),
      ($[18] = J),
      ($[19] = ae),
      ($[20] = me),
      ($[21] = fe));
  } else
    ((v = $[6]),
      (F = $[7]),
      (U = $[8]),
      (W = $[9]),
      (M = $[10]),
      (B = $[11]),
      (H = $[12]),
      (K = $[13]),
      (ee = $[14]),
      (ne = $[15]),
      (V = $[16]),
      (L = $[17]),
      (J = $[18]),
      (ae = $[19]),
      (me = $[20]),
      (fe = $[21]));
  let de;
  if ($[30] !== v || $[31] !== B || $[32] !== K || $[33] !== ee)
    ((de = e(v, { flexDirection: B, width: K, children: ee })),
      ($[30] = v),
      ($[31] = B),
      ($[32] = K),
      ($[33] = ee),
      ($[34] = de));
  else de = $[34];
  let pe;
  if ($[35] !== fe) ((pe = formatNumber(fe)), ($[35] = fe), ($[36] = pe));
  else pe = $[36];
  let Ce;
  if ($[37] !== pe)
    ((Ce = e(Box, {
      flexDirection: "column",
      width: 28,
      children: r(Text, {
        wrap: "truncate",
        children: ["Total tokens:", " ", e(Text, { color: "claude", children: pe })],
      }),
    })),
      ($[37] = pe),
      ($[38] = Ce));
  else Ce = $[38];
  let He;
  if ($[39] !== F || $[40] !== de || $[41] !== Ce || $[42] !== ne || $[43] !== V || $[44] !== L)
    ((He = r(F, { flexDirection: ne, gap: V, marginBottom: L, children: [de, Ce] })),
      ($[39] = F),
      ($[40] = de),
      ($[41] = Ce),
      ($[42] = ne),
      ($[43] = V),
      ($[44] = L),
      ($[45] = He));
  else He = $[45];
  let xe;
  if ($[46] !== stats.totalSessions)
    ((xe = formatNumber(stats.totalSessions)), ($[46] = stats.totalSessions), ($[47] = xe));
  else xe = $[47];
  let Oe;
  if ($[48] !== xe)
    ((Oe = e(Box, {
      flexDirection: "column",
      width: 28,
      children: r(Text, {
        wrap: "truncate",
        children: ["Sessions:", " ", e(Text, { color: "claude", children: xe })],
      }),
    })),
      ($[48] = xe),
      ($[49] = Oe));
  else Oe = $[49];
  let Ve;
  if ($[50] !== stats.longestSession)
    ((Ve =
      stats.longestSession &&
      r(Text, {
        wrap: "truncate",
        children: [
          "Longest session:",
          " ",
          e(Text, { color: "claude", children: formatDuration(stats.longestSession.duration) }),
        ],
      })),
      ($[50] = stats.longestSession),
      ($[51] = Ve));
  else Ve = $[51];
  let ke;
  if ($[52] !== Ve)
    ((ke = e(Box, { flexDirection: "column", width: 28, children: Ve })), ($[52] = Ve), ($[53] = ke));
  else ke = $[53];
  let Ue;
  if ($[54] !== Oe || $[55] !== ke)
    ((Ue = r(Box, { flexDirection: "row", gap: 4, children: [Oe, ke] })),
      ($[54] = Oe),
      ($[55] = ke),
      ($[56] = Ue));
  else Ue = $[56];
  let Ie;
  if ($[57] !== stats.activeDays)
    ((Ie = e(Text, { color: "claude", children: stats.activeDays })),
      ($[57] = stats.activeDays),
      ($[58] = Ie));
  else Ie = $[58];
  let ye;
  if ($[59] !== M) ((ye = r(Text, { color: "subtle", children: ["/", M] })), ($[59] = M), ($[60] = ye));
  else ye = $[60];
  let We;
  if ($[61] !== Ie || $[62] !== ye)
    ((We = e(Box, {
      flexDirection: "column",
      width: 28,
      children: r(Text, { wrap: "truncate", children: ["Active days: ", Ie, ye] }),
    })),
      ($[61] = Ie),
      ($[62] = ye),
      ($[63] = We));
  else We = $[63];
  let _e;
  if ($[64] !== stats.streaks.longestStreak)
    ((_e = e(Text, { color: "claude", bold: !0, children: stats.streaks.longestStreak })),
      ($[64] = stats.streaks.longestStreak),
      ($[65] = _e));
  else _e = $[65];
  const Ne = stats.streaks.longestStreak === 1 ? "day" : "days";
  let at;
  if ($[66] !== _e || $[67] !== Ne)
    ((at = e(Box, {
      flexDirection: "column",
      width: 28,
      children: r(Text, { wrap: "truncate", children: ["Longest streak:", " ", _e, " ", Ne] }),
    })),
      ($[66] = _e),
      ($[67] = Ne),
      ($[68] = at));
  else at = $[68];
  let ot;
  if ($[69] !== We || $[70] !== at)
    ((ot = r(Box, { flexDirection: "row", gap: 4, children: [We, at] })),
      ($[69] = We),
      ($[70] = at),
      ($[71] = ot));
  else ot = $[71];
  let st;
  if ($[72] !== stats.peakActivityDay)
    ((st =
      stats.peakActivityDay &&
      r(Text, {
        wrap: "truncate",
        children: [
          "Most active day:",
          " ",
          e(Text, { color: "claude", children: formatPeakDay_2(stats.peakActivityDay) }),
        ],
      })),
      ($[72] = stats.peakActivityDay),
      ($[73] = st));
  else st = $[73];
  let et;
  if ($[74] !== st)
    ((et = e(Box, { flexDirection: "column", width: 28, children: st })), ($[74] = st), ($[75] = et));
  else et = $[75];
  let Ge;
  if ($[76] !== allTimeStats.streaks.currentStreak)
    ((Ge = e(Text, { color: "claude", bold: !0, children: allTimeStats.streaks.currentStreak })),
      ($[76] = allTimeStats.streaks.currentStreak),
      ($[77] = Ge));
  else Ge = $[77];
  const Qe = allTimeStats.streaks.currentStreak === 1 ? "day" : "days";
  let ze;
  if ($[78] !== Ge || $[79] !== Qe)
    ((ze = e(Box, {
      flexDirection: "column",
      width: 28,
      children: r(Text, { wrap: "truncate", children: ["Current streak:", " ", Ge, " ", Qe] }),
    })),
      ($[78] = Ge),
      ($[79] = Qe),
      ($[80] = ze));
  else ze = $[80];
  let rt;
  if ($[81] !== et || $[82] !== ze)
    ((rt = r(Box, { flexDirection: "row", gap: 4, children: [et, ze] })),
      ($[81] = et),
      ($[82] = ze),
      ($[83] = rt));
  else rt = $[83];
  let kt;
  if ($[84] !== stats.modelUsage || $[85] !== fe)
    ((kt =
      fe > 0 &&
      e(Text, { color: "subtle", wrap: "truncate", children: formatTokenBreakdown(stats.modelUsage) })),
      ($[84] = stats.modelUsage),
      ($[85] = fe),
      ($[86] = kt));
  else kt = $[86];
  let Ze;
  if ($[87] === MEMO_CACHE_SENTINEL)
    ((Ze =
      null &&
      r(Fragment, {
        children: [
          e(Box, { marginTop: 1, children: e(Text, { children: "Shot distribution" }) }),
          r(Box, {
            flexDirection: "row",
            gap: 4,
            children: [
              e(Box, {
                flexDirection: "column",
                width: 28,
                children: r(Text, {
                  wrap: "truncate",
                  children: [
                    null.buckets[0].label,
                    ":",
                    " ",
                    e(Text, { color: "claude", children: null.buckets[0].count }),
                    r(Text, { color: "subtle", children: [" (", null.buckets[0].pct, "%)"] }),
                  ],
                }),
              }),
              e(Box, {
                flexDirection: "column",
                width: 28,
                children: r(Text, {
                  wrap: "truncate",
                  children: [
                    null.buckets[1].label,
                    ":",
                    " ",
                    e(Text, { color: "claude", children: null.buckets[1].count }),
                    r(Text, { color: "subtle", children: [" (", null.buckets[1].pct, "%)"] }),
                  ],
                }),
              }),
            ],
          }),
          r(Box, {
            flexDirection: "row",
            gap: 4,
            children: [
              e(Box, {
                flexDirection: "column",
                width: 28,
                children: r(Text, {
                  wrap: "truncate",
                  children: [
                    null.buckets[2].label,
                    ":",
                    " ",
                    e(Text, { color: "claude", children: null.buckets[2].count }),
                    r(Text, { color: "subtle", children: [" (", null.buckets[2].pct, "%)"] }),
                  ],
                }),
              }),
              e(Box, {
                flexDirection: "column",
                width: 28,
                children: r(Text, {
                  wrap: "truncate",
                  children: [
                    null.buckets[3].label,
                    ":",
                    " ",
                    e(Text, { color: "claude", children: null.buckets[3].count }),
                    r(Text, { color: "subtle", children: [" (", null.buckets[3].pct, "%)"] }),
                  ],
                }),
              }),
            ],
          }),
          e(Box, {
            flexDirection: "row",
            gap: 4,
            children: e(Box, {
              flexDirection: "column",
              width: 28,
              children: r(Text, {
                wrap: "truncate",
                children: ["Avg/session:", " ", e(Text, { color: "claude", children: null.avgShots })],
              }),
            }),
          }),
        ],
      })),
      ($[87] = Ze));
  else Ze = $[87];
  let Xe;
  if ($[88] !== W)
    ((Xe = W && e(Box, { marginTop: 1, children: e(Text, { color: "suggestion", children: W }) })),
      ($[88] = W),
      ($[89] = Xe));
  else Xe = $[89];
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
    $[98] !== J ||
    $[99] !== ae ||
    $[100] !== me
  )
    ((tt = r(U, { flexDirection: J, marginTop: ae, children: [me, H, He, Ue, ot, rt, kt, null, Ze, Xe] })),
      ($[90] = U),
      ($[91] = H),
      ($[92] = He),
      ($[93] = Ue),
      ($[94] = ot),
      ($[95] = rt),
      ($[96] = kt),
      ($[97] = Xe),
      ($[98] = J),
      ($[99] = ae),
      ($[100] = me),
      ($[101] = tt));
  else tt = $[101];
  return tt;
}
/**
 * 书籍 token 数对照表。
 */
//@ chunk-9h8dr0qb.js:103714-105109 fingerprint = BOOK_COMPARISONS (0.823)
var BOOK_TOKEN_COMPARISONS = [
    { name: "The Little Prince", tokens: 22000 },
    { name: "The Old Man and the Sea", tokens: 35000 },
    { name: "A Christmas Carol", tokens: 37000 },
    { name: "Animal Farm", tokens: 39000 },
    { name: "Fahrenheit 451", tokens: 60000 },
    { name: "The Great Gatsby", tokens: 62000 },
    { name: "Slaughterhouse-Five", tokens: 64000 },
    { name: "Brave New World", tokens: 83000 },
    { name: "The Catcher in the Rye", tokens: 95000 },
    { name: "Harry Potter and the Philosopher's Stone", tokens: 103000 },
    { name: "The Hobbit", tokens: 123000 },
    { name: "1984", tokens: 123000 },
    { name: "To Kill a Mockingbird", tokens: 130000 },
    { name: "Pride and Prejudice", tokens: 156000 },
    { name: "Dune", tokens: 244000 },
    { name: "Moby-Dick", tokens: 268000 },
    { name: "Crime and Punishment", tokens: 274000 },
    { name: "A Game of Thrones", tokens: 381000 },
    { name: "Anna Karenina", tokens: 468000 },
    { name: "Don Quixote", tokens: 520000 },
    { name: "The Lord of the Rings", tokens: 576000 },
    { name: "The Count of Monte Cristo", tokens: 603000 },
    { name: "Les Mis\xE9rables", tokens: 689000 },
    { name: "War and Peace", tokens: 730000 },
  ],
  Qm = [
    { name: "a TED talk", minutes: 18 },
    { name: "an episode of The Office", minutes: 22 },
    { name: "listening to Abbey Road", minutes: 47 },
    { name: "a yoga class", minutes: 60 },
    { name: "a World Cup soccer match", minutes: 90 },
    { name: "a half marathon (average time)", minutes: 120 },
    { name: "the movie Inception", minutes: 148 },
    { name: "watching Titanic", minutes: 195 },
    { name: "a transatlantic flight", minutes: 420 },
    { name: "a full night of sleep", minutes: 480 },
  ];
//@ chunk-9h8dr0qb.js:105109-105714 fingerprint = generateFunFactoid (0.651)
function generateFunFactoid(o) {
  let factoids = [],
    p = 0;
  for (let D of Object.values(o.modelUsage)) p += (D.inputTokens || 0) + (D.outputTokens || 0);
  if (p > 0) {
    let matchingBooks = BOOK_TOKEN_COMPARISONS.filter((book) => p >= book.tokens);
    for (let book of matchingBooks) {
      let T = p / book.tokens;
      if (T >= 2) factoids.push(`Your input and output are ~${Math.floor(T)}x the tokens in ${book.name}`);
      else factoids.push(`Your input and output are about as many tokens as ${book.name}`);
    }
  }
  if (o.longestSession) {
    let D = o.longestSession.duration / 60000;
    for (let comparison of Qm) {
      let T = D / comparison.minutes;
      if (T >= 2) factoids.push(`Your longest session is ~${Math.floor(T)}x longer than ${comparison.name}`);
    }
  }
  if (factoids.length === 0) return "";
  let randomIndex = Math.floor(Math.random() * factoids.length);
  return factoids[randomIndex];
}
//@ chunk-9h8dr0qb.js:105714-108735 fingerprint = ModelsTab (0.61)
function ModelsTab(t0) {
  let $ = w(61),
    { stats: stats, selectorRange: selectorRange, isLoading: isLoading } = t0,
    { headerFocused: headerFocused, focusHeader: focusHeader } = useTabHeaderFocus(),
    [T, A] = y(0),
    { columns: terminalWidth } = useTerminalSize(),
    U,
    W,
    M,
    B,
    H,
    K,
    ee,
    ne,
    V,
    L,
    J,
    ae,
    me,
    fe,
    De,
    de,
    ve,
    pe,
    Ce,
    He,
    xe;
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
      let { modelEntries: modelEntries, totalTokens: totalTokens } = sortModelUsage(stats.modelUsage);
      K = modelEntries;
      let Ie = function Ie(ke) {
        if (headerFocused) {
          return;
        }
        if (ke.key === "down" && T < K.length - 4) {
          (ke.preventDefault(), A((prev) => Math.min(prev + 2, K.length - 4)));
          return;
        }
        if (ke.key === "up") {
          if ((ke.preventDefault(), T > 0)) (ke.stopPropagation(), A(Tf));
          else focusHeader();
        }
      };
      if (K.length === 0) {
        let ye;
        if ($[29] === MEMO_CACHE_SENTINEL)
          ((ye = e(Box, {
            children: e(Text, { color: "subtle", children: "No model usage data available" }),
          })),
            ($[29] = ye));
        else ye = $[29];
        me = ye;
        break We;
      }
      let chartOutput = generateTokenChart(stats.dailyModelTokens, K.map(Df), terminalWidth);
      let visibleModels = K.slice(T, T + 4);
      let midpoint = Math.ceil(visibleModels.length / 2);
      let leftModels = visibleModels.slice(0, midpoint);
      let rightModels = visibleModels.slice(midpoint);
      H = T > 0;
      B = T < K.length - 4;
      ee = K.length > 4;
      M = Box;
      Ce = "column";
      He = 1;
      xe = 0;
      V = !1;
      L = Ie;
      J =
        chartOutput &&
        r(Box, {
          flexDirection: "column",
          marginBottom: 1,
          children: [
            e(Text, { bold: !0, children: "Tokens per Day" }),
            e(Ansi, { children: chartOutput.chart }),
            e(Text, { color: "subtle", children: chartOutput.xAxisLabels }),
            e(Box, { children: chartOutput.legend.map(renderModelLegendItem) }),
          ],
        });
      if ($[30] !== isLoading || $[31] !== selectorRange)
        ((ae = e(DateRangeSelector, { dateRange: selectorRange, isLoading: isLoading })),
          ($[30] = isLoading),
          ($[31] = selectorRange),
          ($[32] = ae));
      else ae = $[32];
      W = Box;
      de = "row";
      ve = 4;
      pe = e(Box, {
        flexDirection: "column",
        width: 36,
        children: leftModels.map((ye) => {
          let [et, Ge] = ye;
          return e(ModelEntry, { model: et, usage: Ge, totalTokens: totalTokens }, et);
        }),
      });
      U = Box;
      ne = "column";
      fe = 36;
      De = rightModels.map((Qe) => {
        let [ze, rt] = Qe;
        return e(ModelEntry, { model: ze, usage: rt, totalTokens: totalTokens }, ze);
      });
    }
    (($[0] = focusHeader),
      ($[1] = headerFocused),
      ($[2] = isLoading),
      ($[3] = T),
      ($[4] = selectorRange),
      ($[5] = stats.dailyModelTokens),
      ($[6] = stats.modelUsage),
      ($[7] = terminalWidth),
      ($[8] = U),
      ($[9] = W),
      ($[10] = M),
      ($[11] = B),
      ($[12] = H),
      ($[13] = K),
      ($[14] = ee),
      ($[15] = ne),
      ($[16] = V),
      ($[17] = L),
      ($[18] = J),
      ($[19] = ae),
      ($[20] = me),
      ($[21] = fe),
      ($[22] = De),
      ($[23] = de),
      ($[24] = ve),
      ($[25] = pe),
      ($[26] = Ce),
      ($[27] = He),
      ($[28] = xe));
  } else
    ((U = $[8]),
      (W = $[9]),
      (M = $[10]),
      (B = $[11]),
      (H = $[12]),
      (K = $[13]),
      (ee = $[14]),
      (ne = $[15]),
      (V = $[16]),
      (L = $[17]),
      (J = $[18]),
      (ae = $[19]),
      (me = $[20]),
      (fe = $[21]),
      (De = $[22]),
      (de = $[23]),
      (ve = $[24]),
      (pe = $[25]),
      (Ce = $[26]),
      (He = $[27]),
      (xe = $[28]));
  if (me !== EARLY_RETURN_SENTINEL) return me;
  let Oe;
  if ($[33] !== U || $[34] !== ne || $[35] !== fe || $[36] !== De)
    ((Oe = e(U, { flexDirection: ne, width: fe, children: De })),
      ($[33] = U),
      ($[34] = ne),
      ($[35] = fe),
      ($[36] = De),
      ($[37] = Oe));
  else Oe = $[37];
  let ye;
  if ($[38] !== W || $[39] !== Oe || $[40] !== de || $[41] !== ve || $[42] !== pe)
    ((ye = r(W, { flexDirection: de, gap: ve, children: [pe, Oe] })),
      ($[38] = W),
      ($[39] = Oe),
      ($[40] = de),
      ($[41] = ve),
      ($[42] = pe),
      ($[43] = ye));
  else ye = $[43];
  let Qe;
  if ($[44] !== B || $[45] !== H || $[46] !== K || $[47] !== T || $[48] !== ee)
    ((Qe =
      ee &&
      e(Box, {
        marginTop: 1,
        children: r(Text, {
          color: "subtle",
          children: [
            H ? re.arrowUp : " ",
            " ",
            B ? re.arrowDown : " ",
            " ",
            T + 1,
            "-",
            Math.min(T + 4, K.length),
            " of",
            " ",
            K.length,
            " models",
            " ",
            e(KeyboardShortcutHint, { chord: ["up", "down"], action: "scroll", parens: !0 }),
          ],
        }),
      })),
      ($[44] = B),
      ($[45] = H),
      ($[46] = K),
      ($[47] = T),
      ($[48] = ee),
      ($[49] = Qe));
  else Qe = $[49];
  let kt;
  if (
    $[50] !== M ||
    $[51] !== V ||
    $[52] !== L ||
    $[53] !== J ||
    $[54] !== ae ||
    $[55] !== ye ||
    $[56] !== Qe ||
    $[57] !== Ce ||
    $[58] !== He ||
    $[59] !== xe
  )
    ((kt = r(M, {
      flexDirection: Ce,
      marginTop: He,
      tabIndex: xe,
      autoFocus: V,
      onKeyDown: L,
      children: [J, ae, ye, Qe],
    })),
      ($[50] = M),
      ($[51] = V),
      ($[52] = L),
      ($[53] = J),
      ($[54] = ae),
      ($[55] = ye),
      ($[56] = Qe),
      ($[57] = Ce),
      ($[58] = He),
      ($[59] = xe),
      ($[60] = kt));
  else kt = $[60];
  return kt;
}
//@ chunk-9h8dr0qb.js:108735-109824 fingerprint = ModelEntry (0.556)
function ModelEntry(t0) {
  let $ = w(27),
    { model: model, usage: usage, totalTokens: totalTokens } = t0,
    E;
  if ($[0] !== totalTokens || $[1] !== usage)
    ((E = _i(usage, totalTokens)), ($[0] = totalTokens), ($[1] = usage), ($[2] = E));
  else E = $[2];
  let percentage = E,
    A;
  if ($[3] !== model) ((A = renderModelName(model)), ($[3] = model), ($[4] = A));
  else A = $[4];
  let v;
  if ($[5] !== A) ((v = e(Text, { bold: !0, children: A })), ($[5] = A), ($[6] = v));
  else v = $[6];
  let F;
  if ($[7] !== percentage)
    ((F = r(Text, { color: "subtle", children: ["(", percentage, "%)"] })), ($[7] = percentage), ($[8] = F));
  else F = $[8];
  let U;
  if ($[9] !== v || $[10] !== F)
    ((U = r(BulletRow, { children: [v, " ", F] })), ($[9] = v), ($[10] = F), ($[11] = U));
  else U = $[11];
  let W;
  if ($[12] !== usage.inputTokens)
    ((W = formatNumber(usage.inputTokens)), ($[12] = usage.inputTokens), ($[13] = W));
  else W = $[13];
  let M;
  if ($[14] !== usage.outputTokens)
    ((M = formatNumber(usage.outputTokens)), ($[14] = usage.outputTokens), ($[15] = M));
  else M = $[15];
  let B;
  if ($[16] !== W || $[17] !== M)
    ((B = r(Text, { color: "subtle", wrap: "truncate", children: ["  ", "In: ", W, " \xB7 Out:", " ", M] })),
      ($[16] = W),
      ($[17] = M),
      ($[18] = B));
  else B = $[18];
  let H;
  if ($[19] !== usage) ((H = formatCacheTokens(usage)), ($[19] = usage), ($[20] = H));
  else H = $[20];
  let K;
  if ($[21] !== H)
    ((K = r(Text, { color: "subtle", wrap: "truncate", children: ["  ", H] })), ($[21] = H), ($[22] = K));
  else K = $[22];
  let ee;
  if ($[23] !== K || $[24] !== U || $[25] !== B)
    ((ee = r(Box, { flexDirection: "column", children: [U, B, K] })),
      ($[23] = K),
      ($[24] = U),
      ($[25] = B),
      ($[26] = ee));
  else ee = $[26];
  return ee;
}
//@ chunk-9h8dr0qb.js:109824-110697 fingerprint = generateTokenChart (0.82)
function generateTokenChart(dailyTokens, models, terminalWidth) {
  if (dailyTokens.length < 2 || models.length === 0) return null;
  let yAxisWidth = 7,
    availableWidth = terminalWidth - yAxisWidth,
    chartWidth = Math.min(52, Math.max(20, availableWidth)),
    T;
  if (dailyTokens.length >= chartWidth) T = dailyTokens.slice(-chartWidth);
  else {
    let repeatCount = Math.floor(chartWidth / dailyTokens.length);
    T = [];
    for (let day of dailyTokens) for (let ne = 0; ne < repeatCount; ne++) T.push(day);
  }
  let theme = getThemeWithOverrides(resolveSetting("theme", "dark").value),
    colors = [
      themeColorToAnsi(theme.suggestion),
      themeColorToAnsi(theme.success),
      themeColorToAnsi(theme.warning),
    ],
    F = [],
    U = [],
    topModels = models.slice(0, 3),
    M = [theme.suggestion, theme.success, theme.warning];
  for (let K of topModels) {
    let data = T.map((day) => day.tokensByModel[K] || 0);
    if (data.some((ne) => ne > 0))
      (F.push(data),
        U.push({
          model: renderModelName(K),
          coloredBullet: applyColor(re.bullet, M[(F.length - 1) % M.length]),
        }));
  }
  if (F.length === 0) return null;
  let plot = Rl.plot(F, {
      height: 8,
      colors: colors.slice(0, F.length),
      format: (K) => {
        let ee;
        if (K >= 999950000) ee = (K / 1e9).toFixed(1) + "B";
        else if (K >= 1e6) ee = (K / 1e6).toFixed(1) + "M";
        else if (K >= 1000) ee = (K / 1000).toFixed(0) + "k";
        else ee = K.toFixed(0);
        return ee.padStart(6);
      },
    }),
    xAxisLabels = generateXAxisLabels(T, T.length, yAxisWidth);
  return { chart: plot, legend: U, xAxisLabels: xAxisLabels };
}
//@ chunk-9h8dr0qb.js:110697-111044 callgraph-fingerprint = generateXAxisLabels (0.39)
function generateXAxisLabels(data, _chartWidth, yAxisOffset) {
  if (data.length === 0) return "";
  let numLabels = Math.min(4, Math.max(2, Math.floor(data.length / 8))),
    usableLength = data.length - 6,
    step = Math.floor(usableLength / (numLabels - 1)) || 1,
    labelPositions = [];
  for (let F = 0; F < numLabels; F++) {
    let idx = Math.min(F * step, data.length - 1),
      W = formatPeakDay_2(data[idx].date);
    labelPositions.push({ pos: idx, label: W });
  }
  let result = " ".repeat(yAxisOffset),
    v = 0;
  for (let { pos: pos, label: label } of labelPositions) {
    let spaces = Math.max(1, pos - v);
    ((result += " ".repeat(spaces) + label), (v = pos + label.length));
  }
  return result;
}
//@ chunk-9h8dr0qb.js:111044-111190 fingerprint = handleScreenshot (0.953)
async function handleScreenshot(o, u, p, h, D) {
  h("copying\u2026");
  let E = renderStatsToAnsi(o, u, p),
    result = await copyAnsiToClipboard(E);
  (h(result.success ? "copied!" : "copy failed"), D.setTimeout(() => h(null), 2000));
}
//@ chunk-9h8dr0qb.js:111190-111487 fingerprint = renderStatsToAnsi (1)
function renderStatsToAnsi(o, u, p) {
  let lines = [];
  if (p === "Overview") lines.push(...renderOverviewToAnsi(o, u));
  else lines.push(...renderModelsToAnsi(o));
  while (lines.length > 0 && Yn(lines.at(-1)).trim() === "") lines.pop();
  if (lines.length > 0) {
    let at = lines.at(-1),
      lastLineLen = bunStringWidth(at),
      contentWidth = p === "Overview" ? 70 : 80,
      statsLabel = "/stats",
      padding = Math.max(2, contentWidth - lastLineLen - 6);
    lines[lines.length - 1] = at + " ".repeat(padding) + sequential.gray("/stats");
  }
  return lines.join(`
`);
}
//@ chunk-9h8dr0qb.js:111487-112580 fingerprint = renderOverviewToAnsi (0.843)
function renderOverviewToAnsi(o, u) {
  let lines = [],
    theme = getThemeWithOverrides(resolveSetting("theme", "dark").value),
    D = (text) => applyColor(text, theme.claude),
    COL1_LABEL_WIDTH = 18,
    COL2_START = 40,
    COL2_LABEL_WIDTH = 18,
    row = (l1, v1, l2, v2) => {
      let label1 = (l1 + ":").padEnd(18),
        col1PlainLen = label1.length + v1.length,
        spaceBetween = Math.max(2, 40 - col1PlainLen),
        label2 = (l2 + ":").padEnd(18);
      return label1 + D(v1) + " ".repeat(spaceBetween) + label2 + D(v2);
    };
  if (o.dailyActivity.length > 0)
    (lines.push(generateHeatmap(o.dailyActivity, { terminalWidth: 56 })), lines.push(""));
  let { modelEntries: modelEntries, totalTokens: totalTokens } = sortModelUsage(o.modelUsage),
    favoriteModel = modelEntries[0];
  if (favoriteModel)
    lines.push(
      row("Favorite model", renderModelName(favoriteModel[0]), "Total tokens", formatNumber(totalTokens)),
    );
  (lines.push(""),
    lines.push(
      row(
        "Sessions",
        formatNumber(o.totalSessions),
        "Longest session",
        o.longestSession ? formatDuration(o.longestSession.duration) : "N/A",
      ),
    ));
  let currentStreakVal = `${o.streaks.currentStreak} ${o.streaks.currentStreak === 1 ? "day" : "days"}`,
    longestStreakVal = `${o.streaks.longestStreak} ${o.streaks.longestStreak === 1 ? "day" : "days"}`;
  lines.push(row("Current streak", currentStreakVal, "Longest streak", longestStreakVal));
  let activeDaysVal = `${o.activeDays}/${o.totalDays}`,
    peakHourVal =
      o.peakActivityHour !== null ? `${o.peakActivityHour}:00-${o.peakActivityHour + 1}:00` : "N/A";
  if ((lines.push(row("Active days", activeDaysVal, "Peak hour", peakHourVal)), totalTokens > 0))
    lines.push(sequential.gray(formatTokenBreakdown(o.modelUsage)));
  lines.push("");
  let b11 = generateFunFactoid(o);
  return (lines.push(D(b11)), lines.push(sequential.gray(`Stats from the last ${o.totalDays} days`)), lines);
}
//@ chunk-9h8dr0qb.js:112580-113320 fingerprint = renderModelsToAnsi (0.958)
function renderModelsToAnsi(stats) {
  let lines = [],
    { modelEntries: modelEntries, totalTokens: totalTokens } = sortModelUsage(stats.modelUsage);
  if (modelEntries.length === 0) return (lines.push(sequential.gray("No model usage data available")), lines);
  let favoriteModel = modelEntries[0],
    chartOutput = generateTokenChart(
      stats.dailyModelTokens,
      modelEntries.map(([A]) => A),
      80,
    );
  if (chartOutput) {
    (lines.push(sequential.bold("Tokens per Day")),
      lines.push(chartOutput.chart),
      lines.push(sequential.gray(chartOutput.xAxisLabels)));
    let legendLine = chartOutput.legend.map((item) => `${item.coloredBullet} ${item.model}`).join(" \xB7 ");
    (lines.push(legendLine), lines.push(""));
  }
  (lines.push(
    `${re.star} Favorite: ${sequential.magenta.bold(renderModelName(favoriteModel?.[0] || ""))} \xB7 ${re.circle} Total: ${sequential.magenta(formatNumber(totalTokens))} tokens`,
  ),
    lines.push(""));
  let topModels = modelEntries.slice(0, 3);
  for (let [A, v] of topModels) {
    let F = _i(v, totalTokens);
    (lines.push(`${re.bullet} ${sequential.bold(renderModelName(A))} ${sequential.gray(`(${F}%)`)}`),
      lines.push(
        sequential.dim(`  In: ${formatNumber(v.inputTokens)} \xB7 Out: ${formatNumber(v.outputTokens)}`),
      ),
      lines.push(sequential.dim(`  ${formatCacheTokens(v)}`)));
  }
  return lines;
}
//@ chunk-18hwfzwa.js:1668638-1668742 affinity
var DEFAULT_PROGRESS_DISPLAY = {
  background_hint: "nothing",
  bash_mode_progress: "all",
  agent_progress: "nothing",
  own_row: "spinner",
};
//@ chunk-18hwfzwa.js:1668742-1668823 fingerprint = DATE_RANGE_ORDER (0.539)
function DATE_RANGE_ORDER(h) {
  for (let x of h.values()) if (DEFAULT_PROGRESS_DISPLAY[x.kind] === "all") return !0;
  return !1;
}

export { DATE_RANGE_ORDER, DEFAULT_PROGRESS_DISPLAY, parseIsoDate, parseIsoDateTimePrefix, Stats };
