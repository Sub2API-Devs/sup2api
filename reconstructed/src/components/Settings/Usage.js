/**
 * components/Settings/Usage.tsx
 *
 * /usage 标签页：当前会话、本周（全部模型/Sonnet/Opus）用量条与重置时间、额外用量（usage credits）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Settings/Usage.tsx
 * pieces: chunk-9689amr8.js (1), chunk-9h8dr0qb.js (52)
 * attribution: fingerprint 3, placement 49, layout 1
 */
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState, useAppStateSession } from "../../state/AppState.js";
import { Ou } from "../../commands/plugin/PluginSettings.js";
import { selectMcpCommands } from "./Status.js";
import { useMainLoopModelSetting, useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { pluginSkillBudgetUsage } from "../../utils/plugins/pluginSkillBudget.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";
import { MEMO_CACHE_SENTINEL, Re } from "../../../runtime/bun-runtime.js";
import { j, qt, Se, y, fo, Qr, P } from "../../../vendor/react/cjs/react.production.js";
import { Nu, dg } from "../../context/QueuedMessageContext.js";
import {
  effortBelowMaxSaved,
  enqueueContinuationMessages,
  createEvidenceWindow,
  collectUsageRecommendations,
  KGe,
  costliestBehavior,
  usageRecommendationAction,
} from "../../services/usageInsights/recommendations.js";
import { wt, Jn } from "../../remote/remoteMode.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { logError } from "../../utils/log.js";
import { Me } from "../design-system/ThemeProvider.js";
import { fAe } from "../../services/usageInsights/transcriptScan.js";
import { nd } from "../../utils/stableEmptyObject.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { cronToHuman } from "../../utils/cron.js";
import { formatTokens, formatRelativeTimeAgo, formatResetText, formatResetTime } from "../../utils/format.js";
import { ProgressBar } from "../design-system/ProgressBar.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { isClaudeAISubscriber, getSubscriptionType } from "../../utils/auth.js";
import { jF } from "../../utils/plugins/pluginGates.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { iGt, LXn, SPEND_PERIOD_LABELS } from "../../commands/cost/usagePeriods.js";
import { getRawUtilization, areLimitsObserved } from "../../services/claudeAiLimits.js";
import { formatCurrency } from "../../services/api/referral.js";
import { Yn } from "../../utils/stripAnsi.js";
import { formatTotalCost } from "../../cost-tracker.js";
import { Title } from "../design-system/Title.js";
import { errorMessage } from "../../utils/errors.js";
import {
  normalizeUsageLimits,
  fetchUsageWithModelScopes,
  _hn,
  a2o,
  modelScopedWeeklyRows,
  overageIncludedModels,
} from "../../services/api/usage.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { FeedColumn } from "../LogoV2/FeedColumn.js";
import { usageCreditsCommand } from "../../commands/extra-usage/index.js";
import { Wr } from "../../../vendor/asciichart/asciichart.js";

//@ chunk-9h8dr0qb.js:42676-42716 placement
function Fu(ee) {
  return ee.mainLoopModel;
}
//@ chunk-9h8dr0qb.js:42716-42972 placement
function renderPluginSkillTokensRow(ne) {
  return r(
    Box,
    {
      flexDirection: "row",
      children: [
        e(Box, { width: 28, children: e(Text, { dimColor: !0, children: ne.pluginName }) }),
        r(Text, {
          dimColor: !0,
          children: [
            ne.skillCount,
            " ",
            plural(ne.skillCount, "skill"),
            " \xB7 ~",
            ne.approxTokens,
            " ",
            "tok/turn",
          ],
        }),
      ],
    },
    ne.pluginName,
  );
}
/**
 * 显示各插件技能描述每轮占用的 token。
 */
//@ chunk-9h8dr0qb.js:42972-44139 placement
function renderPluginSkillFootprint() {
  let D = w(15),
    o = useAppState(Ou),
    u = useAppState(selectMcpCommands),
    p = useAppState(Fu),
    h = useMainLoopModelSetting() ?? p,
    E;
  if (D[0] !== u || D[1] !== h || D[2] !== o)
    ((E = pluginSkillBudgetUsage([...o, ...u], bytesPerTokenForModel(h ?? void 0))),
      (D[0] = u),
      (D[1] = h),
      (D[2] = o),
      (D[3] = E));
  else E = D[3];
  let T = E;
  if (T.byPlugin.length === 0) {
    return null;
  }
  let A, v;
  if (D[4] === MEMO_CACHE_SENTINEL)
    ((A = e(Text, { bold: !0, children: "Plugin skill-listing footprint" })),
      (v = e(Text, {
        dimColor: !0,
        wrap: "wrap",
        children:
          "What each plugin's skill descriptions add to the system prompt (cached input after the first turn). Agents and MCP tools not yet counted.",
      })),
      (D[4] = A),
      (D[5] = v));
  else ((A = D[4]), (v = D[5]));
  let F;
  if (D[6] !== T.byPlugin)
    ((F = T.byPlugin.map(renderPluginSkillTokensRow)), (D[6] = T.byPlugin), (D[7] = F));
  else F = D[7];
  let U;
  if (D[8] === MEMO_CACHE_SENTINEL)
    ((U = e(Box, { width: 28, children: e(Text, { children: "Total" }) })), (D[8] = U));
  else U = D[8];
  const W = T.overBudget
    ? " (capped at the listing budget; per-plugin figures above are pre-truncation)"
    : "";
  let M;
  if (D[9] !== T.totalTokens || D[10] !== W)
    ((M = r(Box, {
      flexDirection: "row",
      marginTop: 1,
      children: [U, r(Text, { children: ["~", T.totalTokens, " tok/turn", W] })],
    })),
      (D[9] = T.totalTokens),
      (D[10] = W),
      (D[11] = M));
  else M = D[11];
  let B;
  if (D[12] !== F || D[13] !== M)
    ((B = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [A, v, r(Box, { flexDirection: "column", marginTop: 1, children: [F, M] })],
    })),
      (D[12] = F),
      (D[13] = M),
      (D[14] = B));
  else B = D[14];
  return B;
}
//@ chunk-9h8dr0qb.js:44139-44143 placement
j();
//@ chunk-9h8dr0qb.js:44143-44147 placement
j();
//@ chunk-9h8dr0qb.js:44147-44181 placement
function Gu(J) {
  return J.ultracode;
}
//@ chunk-9h8dr0qb.js:44181-44389 placement
function renderUsageShareRow(B) {
  return r(
    Box,
    {
      children: [
        e(Box, { width: ja, flexShrink: 0, children: r(Text, { children: [B.pct, "%"] }) }),
        r(Text, {
          wrap: "wrap",
          children: [B.title, B.detail && r(Text, { dimColor: !0, children: [" \xB7 ", B.detail] })],
        }),
      ],
    },
    B.key,
  );
}
//@ chunk-9h8dr0qb.js:44389-44405 placement
var _o = qt(null);
//@ chunk-9h8dr0qb.js:44405-44433 placement
function wn() {
  return Se(_o);
}
/**
 * 执行用量修复建议（Remote Control 下不可用）。
 */
//@ chunk-9h8dr0qb.js:44433-45315 placement
function applyUsageFix(o) {
  let v = w(18),
    { onClose: onClose, children: children } = o,
    h = Nu(),
    D = useAppStateSession();
  const E = useMainLoopModel(),
    T = dg(),
    A = useAppState(Gu);
  let F;
  if (v[0] !== E || v[1] !== T || v[2] !== A)
    ((F = effortBelowMaxSaved(E, T, A)), (v[0] = E), (v[1] = T), (v[2] = A), (v[3] = F));
  else F = v[3];
  let {
      effortBelowMax: effortBelowMax,
      isEffortBelowMaxSaved: isEffortBelowMaxSaved,
      isEffortSwitchFree: isEffortSwitchFree,
      isUltracodeOn: isUltracodeOn,
    } = F,
    H;
  if (v[4] !== D) ((H = wt() || isBridgeOrTransport(D)), (v[4] = D), (v[5] = H));
  else H = v[5];
  let K = H,
    ee;
  if (
    v[6] !== effortBelowMax ||
    v[7] !== isEffortBelowMaxSaved ||
    v[8] !== isEffortSwitchFree ||
    v[9] !== isUltracodeOn ||
    v[10] !== K ||
    v[11] !== onClose ||
    v[12] !== h ||
    v[13] !== D
  )
    ((ee = K
      ? null
      : {
          live: {
            effortBelowMax: effortBelowMax,
            isEffortBelowMaxSaved: isEffortBelowMaxSaved,
            isEffortSwitchFree: isEffortSwitchFree,
            isUltracodeOn: isUltracodeOn,
          },
          send: (ne) => {
            if (isBridgeOrTransport(D)) {
              onClose("Nothing was sent. Turn off Remote Control to use fixes.", { display: "system" });
              return;
            }
            (enqueueContinuationMessages(h, ne),
              logFeatureOk("usage_fix"),
              onClose(void 0, { display: "skip" }));
          },
        }),
      (v[6] = effortBelowMax),
      (v[7] = isEffortBelowMaxSaved),
      (v[8] = isEffortSwitchFree),
      (v[9] = isUltracodeOn),
      (v[10] = K),
      (v[11] = onClose),
      (v[12] = h),
      (v[13] = D),
      (v[14] = ee));
  else ee = v[14];
  let V = ee,
    L;
  if (v[15] !== children || v[16] !== V)
    ((L = e(_o.Provider, { value: V, children: children })), (v[15] = children), (v[16] = V), (v[17] = L));
  else L = v[17];
  return L;
}
//@ chunk-9h8dr0qb.js:45315-45324 placement
var ja = 5;
//@ chunk-9h8dr0qb.js:45324-45836 placement
function renderFixUsageButton(o) {
  let A = w(10),
    { recommendations: recommendations, fix: fix, maxWidth: maxWidth } = o,
    D = wn(),
    [E, T] = y(!1),
    v;
  if (A[0] !== fix || A[1] !== D)
    ((v = {
      "settings:fixUsage": () => {
        if (fix) (T(!0), D?.send(fix));
      },
    }),
      (A[0] = fix),
      (A[1] = D),
      (A[2] = v));
  else v = A[2];
  const F = fix !== void 0 && !E;
  let U;
  if (A[3] !== F) ((U = { context: "Settings", isActive: F }), (A[3] = F), (A[4] = U));
  else U = A[4];
  if ((MessageActionsKeybindings(v, U), recommendations.length === 0)) {
    return null;
  }
  let W;
  if (A[5] !== recommendations)
    ((W = recommendations.map(renderUsageShareRow)), (A[5] = recommendations), (A[6] = W));
  else W = A[6];
  let M;
  if (A[7] !== maxWidth || A[8] !== W)
    ((M = e(Box, { flexDirection: "column", maxWidth: maxWidth, children: W })),
      (A[7] = maxWidth),
      (A[8] = W),
      (A[9] = M));
  else M = A[9];
  return M;
}
//@ chunk-9h8dr0qb.js:45836-45912 placement
function md(M) {
  return (
    logError(M),
    {
      day: EMPTY_USAGE_BREAKDOWN,
      week: EMPTY_USAGE_BREAKDOWN,
      evidence: { day: createEvidenceWindow(), week: createEvidenceWindow() },
    }
  );
}
//@ chunk-9h8dr0qb.js:45912-45943 placement
function fd(Ve) {
  return `/${Ve}`;
}
//@ chunk-9h8dr0qb.js:45943-46092 placement
var EMPTY_USAGE_BREAKDOWN = {
    totalCost: 0,
    requestCount: 0,
    sessionCount: 0,
    behaviors: [],
    agents: [],
    skills: [],
    plugins: [],
    mcpServers: [],
    loops: [],
    peakParallel: 0,
  },
  USAGE_LIST_MAX_ROWS = 8,
  USAGE_NAME_COLUMN_WIDTH = 28,
  PERCENT_COLUMN_WIDTH = 6;
/**
 * 用量归因：技能、子代理、插件、MCP 服务器各占多少（扫描本地会话）。
 */
//@ chunk-9h8dr0qb.js:46203-47126 placement
function UsageAttributionView(o) {
  let D = w(14),
    { maxWidth: maxWidth } = o,
    { storageV5: storageV5 } = Me(),
    [h] = y(fAe),
    E;
  if (D[0] !== storageV5 || D[1] !== h.allowed)
    ((E = () => (h.allowed ? collectUsageRecommendations(storageV5).catch(md) : null)),
      (D[0] = storageV5),
      (D[1] = h.allowed),
      (D[2] = E));
  else E = D[2];
  let [T] = y(E);
  if (T === null || !h.allowed) {
    let A;
    if (D[3] === MEMO_CACHE_SENTINEL) ((A = e(renderAttributionHeader, { withSubtitle: !1 })), (D[3] = A));
    else A = D[3];
    const v = h.allowed ? null : h.reason;
    let F;
    if (D[4] !== v) ((F = e(Text, { dimColor: !0, wrap: "wrap", children: v })), (D[4] = v), (D[5] = F));
    else F = D[5];
    let U;
    if (D[6] !== maxWidth || D[7] !== F)
      ((U = r(Box, {
        flexDirection: "column",
        children: [A, e(Box, { marginTop: 1, maxWidth: maxWidth, children: F })],
      })),
        (D[6] = maxWidth),
        (D[7] = F),
        (D[8] = U));
    else U = D[8];
    return U;
  }
  let A;
  if (D[9] === MEMO_CACHE_SENTINEL) ((A = e(renderAttributionHeader, {})), (D[9] = A));
  else A = D[9];
  let v;
  if (D[10] === MEMO_CACHE_SENTINEL)
    ((v = r(Box, {
      flexDirection: "column",
      children: [
        A,
        e(Box, {
          marginTop: 1,
          children: e(Text, { dimColor: !0, children: "Scanning local sessions\u2026" }),
        }),
      ],
    })),
      (D[10] = v));
  else v = D[10];
  let W = v,
    F;
  if (D[11] !== maxWidth || D[12] !== T)
    ((F = e(fo, {
      fallback: W,
      children: e(renderAttributionPeriod, { maxWidth: maxWidth, scanPromise: T }),
    })),
      (D[11] = maxWidth),
      (D[12] = T),
      (D[13] = F));
  else F = D[13];
  return F;
}
//@ chunk-9h8dr0qb.js:47126-47229 placement
function getSignificantBehaviors(o) {
  if (o.totalCost === 0) return [];
  return o.behaviors.filter((behavior) => (behavior.cost / o.totalCost) * 100 >= KGe);
}
//@ chunk-9h8dr0qb.js:47229-47349 placement
function hasUsageBreakdownEntries(o) {
  return (
    o.agents.length > 0 ||
    o.skills.length > 0 ||
    o.plugins.length > 0 ||
    o.mcpServers.length > 0 ||
    o.loops.length > 0
  );
}
//@ chunk-9h8dr0qb.js:47349-50015 placement
function renderAttributionPeriod(o) {
  let h = w(36),
    { maxWidth: maxWidth, scanPromise: scanPromise } = o,
    D;
  if (h[0] === MEMO_CACHE_SENTINEL) ((D = nd(!1)), (h[0] = D));
  else D = h[0];
  let E = D,
    T = Qr(scanPromise),
    [A, v] = y("day"),
    F = wn(),
    U;
  if (h[1] !== T.day)
    ((U = getSignificantBehaviors(T.day).length > 0 || hasUsageBreakdownEntries(T.day)),
      (h[1] = T.day),
      (h[2] = U));
  else U = h[2];
  let W = U,
    M;
  if (h[3] !== T.week)
    ((M = getSignificantBehaviors(T.week).length > 0 || hasUsageBreakdownEntries(T.week)),
      (h[3] = T.week),
      (h[4] = M));
  else M = h[4];
  let B = M,
    H = W || B,
    K;
  if (h[5] === MEMO_CACHE_SENTINEL)
    ((K = { "settings:periodDay": () => v("day"), "settings:periodWeek": () => v("week") }), (h[5] = K));
  else K = h[5];
  let ee;
  if (h[6] !== H) ((ee = { context: "Settings", isActive: H }), (h[6] = H), (h[7] = ee));
  else ee = h[7];
  if ((MessageActionsKeybindings(K, ee), !W && !B)) {
    return null;
  }
  let ne = A === "day" ? T.day : T.week,
    V;
  if (h[8] !== ne) ((V = getSignificantBehaviors(ne)), (h[8] = ne), (h[9] = V));
  else V = h[9];
  let L = V,
    J,
    ae;
  if (h[10] !== F || h[11] !== A || h[12] !== T.evidence || h[13] !== ne)
    ((J = costliestBehavior(ne, T.evidence[A], F?.live)),
      (ae = F ? usageRecommendationAction(J) : void 0),
      (h[10] = F),
      (h[11] = A),
      (h[12] = T.evidence),
      (h[13] = ne),
      (h[14] = J),
      (h[15] = ae));
  else ((J = h[14]), (ae = h[15]));
  let me = ae,
    fe;
  if (h[16] === MEMO_CACHE_SENTINEL) ((fe = e(renderAttributionHeader, {})), (h[16] = fe));
  else fe = h[16];
  const De = A === "day" ? "24h" : "7d";
  let de;
  if (h[17] !== De)
    ((de = e(Box, {
      marginTop: 1,
      children: r(Text, { dimColor: !0, wrap: "wrap", children: ["Last ", De, " \xB7 shares overlap"] }),
    })),
      (h[17] = De),
      (h[18] = de));
  else de = h[18];
  let ve;
  if (h[19] !== me || h[20] !== maxWidth || h[21] !== J || h[22] !== L.length || h[23] !== ne)
    ((ve = e(Box, {
      marginTop: 1,
      flexDirection: "column",
      gap: 1,
      children:
        L.length === 0 && !hasUsageBreakdownEntries(ne)
          ? r(Text, {
              dimColor: !0,
              children: ["Nothing over ", KGe, "% in this period \u2014 try the other window."],
            })
          : r(Fragment, {
              children: [
                e(renderFixUsageButton, { recommendations: J, fix: me, maxWidth: maxWidth }),
                !hasUsageBreakdownEntries(ne)
                  ? r(Box, {
                      flexDirection: "column",
                      children: [
                        e(Text, { bold: !0, children: "Skills, subagents, plugins, and MCP servers" }),
                        e(Text, {
                          dimColor: !0,
                          wrap: "wrap",
                          children: "No attribution data yet \xB7 accumulates as you use Claude",
                        }),
                      ],
                    })
                  : r(Fragment, {
                      children: [
                        e(renderAttributionRows, { title: "Skills", rows: ne.skills, label: fd }),
                        e(renderAttributionRows, { title: "Subagents", rows: ne.agents }),
                        e(renderAttributionRows, { title: "Plugins", rows: ne.plugins }),
                        e(renderAttributionRows, { title: "MCP servers", rows: ne.mcpServers }),
                        e(renderLoopsAttribution, { rows: ne.loops, maxWidth: maxWidth }),
                      ],
                    }),
              ],
            }),
    })),
      (h[19] = me),
      (h[20] = maxWidth),
      (h[21] = J),
      (h[22] = L.length),
      (h[23] = ne),
      (h[24] = ve));
  else ve = h[24];
  let pe;
  if (h[25] !== me || h[26] !== J)
    ((pe =
      me &&
      e(ConfigurableShortcutHint, {
        action: "settings:fixUsage",
        context: "Settings",
        fallback: "f",
        description: formatFixCountLabel(me.keys.length, J.length),
        ...E,
      })),
      (h[25] = me),
      (h[26] = J),
      (h[27] = pe));
  else pe = h[27];
  let Ce, He;
  if (h[28] === MEMO_CACHE_SENTINEL)
    ((Ce = e(ConfigurableShortcutHint, {
      action: "settings:periodDay",
      context: "Settings",
      fallback: "d",
      description: "day",
      ...E,
    })),
      (He = e(ConfigurableShortcutHint, {
        action: "settings:periodWeek",
        context: "Settings",
        fallback: "w",
        description: "week",
        ...E,
      })),
      (h[28] = Ce),
      (h[29] = He));
  else ((Ce = h[28]), (He = h[29]));
  let xe;
  if (h[30] !== pe)
    ((xe = e(Box, {
      marginTop: 1,
      children: e(Text, { dimColor: !0, italic: !1, children: r(Byline, { children: [pe, Ce, He] }) }),
    })),
      (h[30] = pe),
      (h[31] = xe));
  else xe = h[31];
  let Oe;
  if (h[32] !== de || h[33] !== ve || h[34] !== xe)
    ((Oe = r(Box, { flexDirection: "column", children: [fe, de, ve, xe] })),
      (h[32] = de),
      (h[33] = ve),
      (h[34] = xe),
      (h[35] = Oe));
  else Oe = h[35];
  return Oe;
}
//@ chunk-9h8dr0qb.js:50015-50120 placement
function formatFixCountLabel(o, u) {
  if (o < u) return `fix ${o} of ${u}`;
  return o === 1 ? "fix this" : o === 2 ? "fix both" : `fix all ${o}`;
}
//@ chunk-9h8dr0qb.js:50120-50529 placement
function renderAttributionHeader(o) {
  let h = w(5),
    { withSubtitle: withSubtitle } = o,
    p = withSubtitle === void 0 ? !0 : withSubtitle,
    D;
  if (h[0] === MEMO_CACHE_SENTINEL)
    ((D = e(Text, { bold: !0, wrap: "wrap", children: "What's contributing to your usage?" })), (h[0] = D));
  else D = h[0];
  let E;
  if (h[1] !== p)
    ((E =
      p &&
      e(Text, { dimColor: !0, wrap: "wrap", children: "Approximate \xB7 sessions on this machine only" })),
      (h[1] = p),
      (h[2] = E));
  else E = h[2];
  let T;
  if (h[3] !== E) ((T = r(Box, { flexDirection: "column", children: [D, E] })), (h[3] = E), (h[4] = T));
  else T = h[4];
  return T;
}
//@ chunk-9h8dr0qb.js:50529-51614 placement
function renderAttributionRows(o) {
  let D = w(23),
    { title: title, rows: rows, label: label } = o;
  if (rows.length === 0) {
    return null;
  }
  let E, T, A, v, F;
  if (D[0] !== label || D[1] !== rows || D[2] !== title) {
    let sliced = rows.slice(0, USAGE_LIST_MAX_ROWS);
    F = rows.length - USAGE_LIST_MAX_ROWS;
    E = Box;
    T = "column";
    let W;
    if (D[8] !== title) ((W = e(Text, { children: title })), (D[8] = title), (D[9] = W));
    else W = D[9];
    let M;
    if (D[10] === MEMO_CACHE_SENTINEL) ((M = e(Text, { dimColor: !0, children: "% of usage" })), (D[10] = M));
    else M = D[10];
    if (D[11] !== W)
      ((A = r(Box, {
        width: USAGE_NAME_COLUMN_WIDTH + PERCENT_COLUMN_WIDTH,
        justifyContent: "space-between",
        children: [W, M],
      })),
        (D[11] = W),
        (D[12] = A));
    else A = D[12];
    let B;
    if (D[13] !== label)
      ((B = (H) =>
        r(
          Box,
          {
            children: [
              e(Box, {
                width: USAGE_NAME_COLUMN_WIDTH,
                children: e(Text, {
                  dimColor: !0,
                  wrap: "truncate-end",
                  children: label ? label(H.name) : H.name,
                }),
              }),
              e(Box, {
                width: PERCENT_COLUMN_WIDTH,
                justifyContent: "flex-end",
                children: r(Text, { dimColor: !0, children: [H.pct, "%"] }),
              }),
            ],
          },
          H.name,
        )),
        (D[13] = label),
        (D[14] = B));
    else B = D[14];
    v = sliced.map(B);
    ((D[0] = label),
      (D[1] = rows),
      (D[2] = title),
      (D[3] = E),
      (D[4] = T),
      (D[5] = A),
      (D[6] = v),
      (D[7] = F));
  } else ((E = D[3]), (T = D[4]), (A = D[5]), (v = D[6]), (F = D[7]));
  let W;
  if (D[15] !== F)
    ((W = F > 0 && r(Text, { dimColor: !0, children: ["\u2026 ", F, " more"] })), (D[15] = F), (D[16] = W));
  else W = D[16];
  let M;
  if (D[17] !== E || D[18] !== T || D[19] !== A || D[20] !== v || D[21] !== W)
    ((M = r(E, { flexDirection: T, children: [A, v, W] })),
      (D[17] = E),
      (D[18] = T),
      (D[19] = A),
      (D[20] = v),
      (D[21] = W),
      (D[22] = M));
  else M = D[22];
  return M;
}
//@ chunk-9h8dr0qb.js:51614-51671 placement
var Hn = 10,
  Vn = 6,
  Kn = 8,
  sn = 9,
  qn = 9,
  Qn = Hn + Vn + Kn + sn + qn,
  er = Qn + 24;
/**
 * 把循环任务的 cron 表达式缩写成 "5m"/"2h"/"1d"/"at HH:MM"；动态循环返回 dynamic，其他表达式用 cronToHuman 转成文字。
 */
//@ chunk-9h8dr0qb.js:51671-52084 placement
function formatLoopSchedule(o) {
  if (o.isDynamic) return "dynamic";
  if (!o.cron) return "?";
  let match = o.cron.match(
    /^(?:(?:\*\/(\d+)|(\*)) \* \* \* \*|0 (?:\*\/(\d+)|(\*)) \* \* \*|0 0 (?:\*\/(\d+)|(\*)) \* \*|(\d{1,2}) (\d{1,2}) \* \* \*)$/,
  );
  if (match) {
    if (match[1] || match[2]) return `${match[1] ?? 1}m`;
    if (match[3] || match[4]) return `${match[3] ?? 1}h`;
    if (match[5] || match[6]) return `${match[5] ?? 1}d`;
    return `at ${match[8].padStart(2, "0")}:${match[7].padStart(2, "0")}`;
  }
  return cronToHuman(o.cron).toLowerCase();
}
//@ chunk-9h8dr0qb.js:52084-53661 placement
function renderLoopsAttribution(o) {
  let T = w(28),
    { rows: rows, maxWidth: maxWidth } = o;
  if (rows.length === 0) {
    return null;
  }
  let h = maxWidth >= er,
    D = h ? Qn : Qn - sn,
    max = Math.max(12, maxWidth - D),
    A,
    v,
    F,
    U,
    W;
  if (T[0] !== max || T[1] !== rows || T[2] !== h) {
    let sliced = rows.slice(0, USAGE_LIST_MAX_ROWS);
    W = rows.length - USAGE_LIST_MAX_ROWS;
    let date = new Date();
    A = Box;
    v = "column";
    let H;
    if (T[8] === MEMO_CACHE_SENTINEL) ((H = e(Text, { children: "Loops" })), (T[8] = H));
    else H = T[8];
    let K;
    if (T[9] !== max) ((K = e(Box, { width: max, children: H })), (T[9] = max), (T[10] = K));
    else K = T[10];
    let ee, ne, V;
    if (T[11] === MEMO_CACHE_SENTINEL)
      ((ee = e(RightAlignedDimText, { width: Hn, text: "every" })),
        (ne = e(RightAlignedDimText, { width: Vn, text: "runs" })),
        (V = e(RightAlignedDimText, { width: Kn, text: "tokens" })),
        (T[11] = ee),
        (T[12] = ne),
        (T[13] = V));
    else ((ee = T[11]), (ne = T[12]), (V = T[13]));
    let L;
    if (T[14] !== h)
      ((L = h && e(RightAlignedDimText, { width: sn, text: "per run" })), (T[14] = h), (T[15] = L));
    else L = T[15];
    let J;
    if (T[16] === MEMO_CACHE_SENTINEL)
      ((J = e(RightAlignedDimText, { width: qn, text: "last run" })), (T[16] = J));
    else J = T[16];
    if (T[17] !== K || T[18] !== L)
      ((F = r(Box, { children: [K, ee, ne, V, L, J] })), (T[17] = K), (T[18] = L), (T[19] = F));
    else F = T[19];
    U = sliced.map((ae) =>
      r(
        Box,
        {
          children: [
            e(Box, {
              width: max,
              children: e(Text, { dimColor: !0, wrap: "truncate-end", children: ae.prompt }),
            }),
            e(RightAlignedDimText, { width: Hn, text: formatLoopSchedule(ae) }),
            e(RightAlignedDimText, { width: Vn, text: String(ae.runs) }),
            e(RightAlignedDimText, { width: Kn, text: formatTokens(ae.tokens) }),
            h &&
              e(RightAlignedDimText, {
                width: sn,
                text: ae.runs > 0 && ae.tokens > 0 ? formatTokens(Math.round(ae.tokens / ae.runs)) : "\u2013",
              }),
            e(RightAlignedDimText, {
              width: qn,
              text:
                ae.lastRunMs > 0 ? formatRelativeTimeAgo(new Date(ae.lastRunMs), { now: date }) : "\u2013",
            }),
          ],
        },
        ae.prompt,
      ),
    );
    ((T[0] = max), (T[1] = rows), (T[2] = h), (T[3] = A), (T[4] = v), (T[5] = F), (T[6] = U), (T[7] = W));
  } else ((A = T[3]), (v = T[4]), (F = T[5]), (U = T[6]), (W = T[7]));
  let H;
  if (T[20] !== W)
    ((H = W > 0 && r(Text, { dimColor: !0, children: ["\u2026 ", W, " more"] })), (T[20] = W), (T[21] = H));
  else H = T[21];
  let K;
  if (T[22] !== A || T[23] !== v || T[24] !== F || T[25] !== U || T[26] !== H)
    ((K = r(A, { flexDirection: v, children: [F, U, H] })),
      (T[22] = A),
      (T[23] = v),
      (T[24] = F),
      (T[25] = U),
      (T[26] = H),
      (T[27] = K));
  else K = T[27];
  return K;
}
//@ chunk-9h8dr0qb.js:53661-53922 placement
function RightAlignedDimText(o) {
  let h = w(5),
    { width: width, text: text } = o,
    D;
  if (h[0] !== text)
    ((D = e(Text, { dimColor: !0, wrap: "truncate-end", children: text })), (h[0] = text), (h[1] = D));
  else D = h[1];
  let E;
  if (h[2] !== D || h[3] !== width)
    ((E = e(Box, { width: width, justifyContent: "flex-end", children: D })),
      (h[2] = D),
      (h[3] = width),
      (h[4] = E));
  else E = h[4];
  return E;
}
//@ chunk-9h8dr0qb.js:53922-53937 placement
function Jd() {}
//@ chunk-9h8dr0qb.js:53937-54010 placement
function Zd(In) {
  return In.enrichError === null ? In : { ...In, enrichError: null };
}
//@ chunk-9h8dr0qb.js:54010-54064 placement
function em(hn) {
  return { text: hn.text, color: hn.variant };
}
//@ chunk-9h8dr0qb.js:54064-54177 placement
function toLimitBarSpec(o) {
  let { title: title, displayName: displayName, limit: limit } = o;
  return { bar: displayName, title: title, limit: limit, alwaysShowDateInReset: !0 };
}
//@ chunk-9h8dr0qb.js:54177-56348 fingerprint = LimitBar (0.788)
function LimitBar(t0) {
  let $ = w(41),
    {
      title: title,
      limit: limit,
      maxWidth: maxWidth,
      showTimeInReset: t1,
      alwaysShowDateInReset: alwaysShowDateInReset,
      extraSubtext: extraSubtext,
      trailingLines: trailingLines,
      subtextOverride: subtextOverride,
    } = t0,
    F = t1 === void 0 ? !0 : t1,
    U = alwaysShowDateInReset === void 0 ? !1 : alwaysShowDateInReset,
    { utilization: utilization, resets_at: resets_at } = limit;
  if (utilization === null) {
    return null;
  }
  let usedText = `${Math.floor(utilization)}% used`,
    H;
  if (resets_at) {
    let ee;
    if ($[0] !== U || $[1] !== resets_at || $[2] !== F)
      ((ee = formatResetText(resets_at, !0, F, U)), ($[0] = U), ($[1] = resets_at), ($[2] = F), ($[3] = ee));
    else ee = $[3];
    H = `Resets ${ee}`;
  }
  if (extraSubtext) {
    if (H) H = `${extraSubtext} \xB7 ${H}`;
    else H = extraSubtext;
  }
  if (subtextOverride !== void 0) H = subtextOverride;
  let ne = !1 ? Math.max(1, maxWidth - 4) : maxWidth;
  if (ne >= 62) {
    let ee;
    if ($[4] !== title) ((ee = e(Text, { bold: !0, children: title })), ($[4] = title), ($[5] = ee));
    else ee = $[5];
    const V = utilization / 100;
    let L;
    if ($[6] !== V)
      ((L = e(ProgressBar, {
        ratio: V,
        width: 50,
        variant: !1 ? "shade" : "block",
        fillColor: !1 ? "suggestion" : "rate_limit_fill",
        emptyColor: !1 ? void 0 : "rate_limit_empty",
      })),
        ($[6] = V),
        ($[7] = L));
    else L = $[7];
    let J;
    if ($[8] !== usedText) ((J = e(Text, { children: usedText })), ($[8] = usedText), ($[9] = J));
    else J = $[9];
    let ae;
    if ($[10] !== L || $[11] !== J)
      ((ae = r(Box, { flexDirection: "row", gap: !1 ? 2 : 1, children: [L, J] })),
        ($[10] = L),
        ($[11] = J),
        ($[12] = ae));
    else ae = $[12];
    let me;
    if ($[13] !== H) ((me = H && e(Text, { dimColor: !0, children: H })), ($[13] = H), ($[14] = me));
    else me = $[14];
    let fe;
    if ($[15] !== trailingLines)
      ((fe = e(renderColoredLines, { lines: trailingLines })), ($[15] = trailingLines), ($[16] = fe));
    else fe = $[16];
    let De;
    if ($[17] !== ee || $[18] !== ae || $[19] !== me || $[20] !== fe)
      ((De = r(Box, { flexDirection: "column", flexShrink: 0, children: [ee, ae, me, fe] })),
        ($[17] = ee),
        ($[18] = ae),
        ($[19] = me),
        ($[20] = fe),
        ($[21] = De));
    else De = $[21];
    return De;
  } else {
    let ee;
    if ($[22] !== title) ((ee = e(Text, { bold: !0, children: title })), ($[22] = title), ($[23] = ee));
    else ee = $[23];
    let V;
    if ($[24] !== H)
      ((V =
        H &&
        r(Fragment, {
          children: [e(Text, { children: " " }), r(Text, { dimColor: !0, children: ["\xB7 ", H] })],
        })),
        ($[24] = H),
        ($[25] = V));
    else V = $[25];
    let L;
    if ($[26] !== ee || $[27] !== V)
      ((L = r(Text, { children: [ee, V] })), ($[26] = ee), ($[27] = V), ($[28] = L));
    else L = $[28];
    let J;
    if ($[29] !== trailingLines)
      ((J = e(renderColoredLines, { lines: trailingLines })), ($[29] = trailingLines), ($[30] = J));
    else J = $[30];
    const ae = utilization / 100;
    let me;
    if ($[31] !== ne || $[32] !== ae)
      ((me = e(ProgressBar, {
        ratio: ae,
        width: ne,
        variant: !1 ? "shade" : "block",
        fillColor: !1 ? "suggestion" : "rate_limit_fill",
        emptyColor: !1 ? void 0 : "rate_limit_empty",
      })),
        ($[31] = ne),
        ($[32] = ae),
        ($[33] = me));
    else me = $[33];
    let fe;
    if ($[34] !== usedText) ((fe = e(Text, { children: usedText })), ($[34] = usedText), ($[35] = fe));
    else fe = $[35];
    let De;
    if ($[36] !== L || $[37] !== J || $[38] !== me || $[39] !== fe)
      ((De = r(Box, { flexDirection: "column", flexShrink: 0, children: [L, J, me, fe] })),
        ($[36] = L),
        ($[37] = J),
        ($[38] = me),
        ($[39] = fe),
        ($[40] = De));
    else De = $[40];
    return De;
  }
}
//@ chunk-9h8dr0qb.js:56348-56454 placement
function renderColoredLines({ lines: lines }) {
  return (lines ?? []).map((u, p) => e(Text, { dimColor: !u.color, color: u.color, children: u.text }, p));
}
//@ chunk-9h8dr0qb.js:56454-57121 placement
function renderGatewayUsageNotice() {
  let o = w(7),
    u;
  if (o[0] === MEMO_CACHE_SENTINEL) ((u = nd(!1)), (o[0] = u));
  else u = o[0];
  let p = u,
    { columns: columns } = useTerminalSize(),
    D = columns - 2,
    min = Math.min(D, 80),
    T;
  if (o[1] === MEMO_CACHE_SENTINEL) ((T = isClaudeAISubscriber()), (o[1] = T));
  else T = o[1];
  let A = T,
    v;
  if (o[2] === MEMO_CACHE_SENTINEL) ((v = Jn()), (o[2] = v));
  else v = o[2];
  let F = v !== null,
    U,
    W;
  if (o[3] === MEMO_CACHE_SENTINEL)
    ((U = e(renderRemoteCost, { isThinClient: F })),
      (W = jF() ? e(renderPluginSkillFootprint, {}) : null),
      (o[3] = U),
      (o[4] = W));
  else ((U = o[3]), (W = o[4]));
  let M;
  if (o[5] !== min)
    ((M = e(Box, {
      flexDirection: "column",
      width: "100%",
      children: r(Box, {
        flexDirection: "column",
        gap: 1,
        flexShrink: 0,
        children: [
          U,
          W,
          getAPIProvider() === "gateway"
            ? e(UsageCreditsPanel, { maxWidth: min })
            : A
              ? e(loadUsageData, { maxWidth: min })
              : e(Text, {
                  dimColor: !0,
                  italic: !1,
                  children: e(ConfigurableShortcutHint, {
                    action: "confirm:no",
                    context: "Settings",
                    fallback: "Esc",
                    description: "cancel",
                    ...p,
                  }),
                }),
        ],
      }),
    })),
      (o[5] = min),
      (o[6] = M));
  else M = o[6];
  return M;
}
/**
 * 用量设置里的额度面板：读取凭据对应的额度，失败时回退显示消费上限，底部 Esc 取消提示。
 */
//@ chunk-9h8dr0qb.js:57121-57890 placement = _temp2 (0.477)
function UsageCreditsPanel(exitState) {
  let $ = w(15),
    { maxWidth: maxWidth } = exitState,
    h;
  if ($[0] === MEMO_CACHE_SENTINEL) ((h = nd(!1)), ($[0] = h));
  else h = $[0];
  let D = h,
    { credentials: credentials } = Me(),
    T;
  if ($[1] !== credentials) ((T = () => iGt(credentials).catch(Jd)), ($[1] = credentials), ($[2] = T));
  else T = $[2];
  let [A] = y(T),
    v;
  if ($[3] === MEMO_CACHE_SENTINEL) ((v = LXn()), ($[3] = v));
  else v = $[3];
  let F;
  if ($[4] !== maxWidth)
    ((F = e(renderSpendLimit, { spend: v, maxWidth: maxWidth })), ($[4] = maxWidth), ($[5] = F));
  else F = $[5];
  let U;
  if ($[6] !== maxWidth || $[7] !== A)
    ((U = e(SpendLimitReading, { reading: A, maxWidth: maxWidth })),
      ($[6] = maxWidth),
      ($[7] = A),
      ($[8] = U));
  else U = $[8];
  let W;
  if ($[9] !== F || $[10] !== U)
    ((W = e(fo, { fallback: F, children: U })), ($[9] = F), ($[10] = U), ($[11] = W));
  else W = $[11];
  let M;
  if ($[12] === MEMO_CACHE_SENTINEL)
    ((M = e(Text, {
      dimColor: !0,
      italic: !1,
      children: e(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Settings",
        fallback: "Esc",
        description: "cancel",
        ...D,
      }),
    })),
      ($[12] = M));
  else M = $[12];
  let B;
  if ($[13] !== W)
    ((B = r(Box, { flexDirection: "column", gap: 1, children: [W, M] })), ($[13] = W), ($[14] = B));
  else B = $[14];
  return B;
}
/**
 * 在 Suspense 下读取额度花费数据并渲染支出上限行。
 */
//@ chunk-9h8dr0qb.js:57890-58054 placement
function SpendLimitReading(o) {
  let D = w(3),
    { reading: reading, maxWidth: maxWidth } = o;
  const h = Qr(reading);
  let E;
  if (D[0] !== maxWidth || D[1] !== h)
    ((E = e(renderSpendLimit, { spend: h, maxWidth: maxWidth })), (D[0] = maxWidth), (D[1] = h), (D[2] = E));
  else E = D[2];
  return E;
}
//@ chunk-9h8dr0qb.js:58054-58854 placement
function renderSpendLimit(o) {
  let h = w(10),
    { spend: spend, maxWidth: maxWidth } = o,
    D;
  if (h[0] === MEMO_CACHE_SENTINEL) ((D = getRawUtilization()), (h[0] = D));
  else D = h[0];
  let overage = D.overage,
    T;
  if (h[1] !== spend)
    ((T = spend
      ? { utilization: Math.round(spend.utilization), resets_at: spend.resetsAt }
      : overage
        ? {
            utilization: Math.round(overage.utilization * 100),
            resets_at: new Date(overage.resets_at * 1000).toISOString(),
          }
        : null),
      (h[1] = spend),
      (h[2] = T));
  else T = h[2];
  let A = T;
  if (!A) {
    let v;
    if (h[3] === MEMO_CACHE_SENTINEL)
      ((v = areLimitsObserved()
        ? null
        : e(Text, { dimColor: !0, children: "Spend limit \xB7 Shown once your gateway reports one" })),
        (h[3] = v));
    else v = h[3];
    return v;
  }
  let v;
  if (h[4] !== spend)
    ((v = spend
      ? `${formatCurrency(spend.used, spend.currency)} / ${formatCurrency(spend.limit, spend.currency)} spent${spend.period ? ` ${SPEND_PERIOD_LABELS[spend.period]}` : ""}`
      : void 0),
      (h[4] = spend),
      (h[5] = v));
  else v = h[5];
  let F = v,
    U;
  if (h[6] !== F || h[7] !== A || h[8] !== maxWidth)
    ((U = e(LimitBar, {
      title: "Spend limit",
      limit: A,
      maxWidth: maxWidth,
      alwaysShowDateInReset: !0,
      extraSubtext: F,
    })),
      (h[6] = F),
      (h[7] = A),
      (h[8] = maxWidth),
      (h[9] = U));
  else U = h[9];
  return U;
}
//@ chunk-9h8dr0qb.js:58854-59430 placement
function renderRemoteCost(o) {
  let p = w(10),
    { isThinClient: isThinClient } = o,
    h;
  if (p[0] === MEMO_CACHE_SENTINEL) ((h = Yn(formatTotalCost())), (p[0] = h));
  else h = p[0];
  let D = h,
    E;
  if (p[1] !== isThinClient)
    ((E = () => (isThinClient ? fetchRemoteSessionCost() : null)), (p[1] = isThinClient), (p[2] = E));
  else E = p[2];
  let [T] = y(E);
  const A = isThinClient ? " (remote)" : "";
  let v;
  if (p[3] !== A) ((v = r(Title, { children: ["Session", A] })), (p[3] = A), (p[4] = v));
  else v = p[4];
  let F;
  if (p[5] !== T)
    ((F = T
      ? e(fo, {
          fallback: e(Text, { dimColor: !0, children: "Loading remote cost\u2026" }),
          children: e(RemoteCostText, { costPromise: T }),
        })
      : e(Text, { dimColor: !0, children: D })),
      (p[5] = T),
      (p[6] = F));
  else F = p[6];
  let U;
  if (p[7] !== v || p[8] !== F)
    ((U = r(Box, { flexDirection: "column", gap: 1, children: [v, F] })), (p[7] = v), (p[8] = F), (p[9] = U));
  else U = p[9];
  return U;
}
//@ chunk-9h8dr0qb.js:59430-59573 placement
function RemoteCostText(o) {
  let h = w(2),
    { costPromise: costPromise } = o;
  const p = Qr(costPromise);
  let D;
  if (h[0] !== p) ((D = e(Text, { dimColor: !0, children: p })), (h[0] = p), (h[1] = D));
  else D = h[1];
  return D;
}
//@ chunk-9h8dr0qb.js:59573-59768 placement
async function fetchRemoteSessionCost() {
  let o = Jn();
  if (!o) return "Remote cost unavailable";
  try {
    return (await o.sendControlRequest({ subtype: "get_session_cost" })).text;
  } catch (error) {
    return `Remote cost unavailable (${errorMessage(error)})`;
  }
}
//@ chunk-9h8dr0qb.js:59768-59803 placement
var Tn = "Failed to load usage data";
//@ chunk-9h8dr0qb.js:59803-59885 placement
function kr(o, u) {
  if (o === void 0) return "";
  return ` as of ${formatRelativeTimeAgo(new Date(o), { now: u })}`;
}
//@ chunk-9h8dr0qb.js:59885-60028 placement
function describeRateLimitWait(o) {
  return o === void 0
    ? "requests temporarily limited \u2014 try again in a moment"
    : `rate limited until ${formatResetTime(Math.ceil(o / 60000) * 60)}`;
}
/**
 * 加载用量与额度数据（远程会话成本、gateway 花费上限、限流、刷新失败回退到上次已知数据，约 6 KB）。
 */
//@ chunk-9h8dr0qb.js:60028-65969 placement
function loadUsageData(o) {
  let p = w(67),
    { maxWidth: maxWidth } = o,
    h;
  if (p[0] === MEMO_CACHE_SENTINEL) ((h = nd(!1)), (p[0] = h));
  else h = p[0];
  let D = h,
    { storageV5: storageV5, credentials: credentials } = Me(),
    A;
  if (p[1] !== storageV5) ((A = () => normalizeUsageLimits(storageV5)), (p[1] = storageV5), (p[2] = A));
  else A = p[2];
  let [v] = y(A),
    F;
  if (p[3] !== v?.fetchedAtMs || p[4] !== v?.source || p[5] !== v?.utilization)
    ((F = () => ({
      utilization: v?.utilization ?? null,
      source: v?.source ?? null,
      fetchedAtMs: v?.fetchedAtMs,
      enrichError: null,
    })),
      (p[3] = v?.fetchedAtMs),
      (p[4] = v?.source),
      (p[5] = v?.utilization),
      (p[6] = F));
  else F = p[6];
  let [U, W] = y(F),
    { utilization: utilization, enrichError: enrichError } = U,
    [H, K] = y(null),
    [ee, ne] = y(!0),
    V;
  if (p[7] !== credentials || p[8] !== storageV5)
    ((V = async () => {
      (ne(!0), K(null), W(Zd));
      let L = await fetchUsageWithModelScopes(storageV5, credentials);
      J: switch (L.status) {
        case "ok": {
          (W({ utilization: L.utilization, source: "ok", fetchedAtMs: void 0, enrichError: null }),
            logFeatureOk("usage_plan_limits"));
          break J;
        }
        case "empty_response": {
          (logFeatureBad("usage_plan_limits", "empty_response"), K(Tn));
          break J;
        }
        case "seeded": {
          let date = new Date();
          (W((me) => {
            let fe = me.utilization === null;
            let De = L.seedSource === "headers" ? "headers" : fe ? "persisted" : me.source;
            let de = L.seedSource === "headers" ? void 0 : fe ? L.seedFetchedAtMs : me.fetchedAtMs;
            return {
              utilization: L.seedSource === "headers" ? L.utilization : (me.utilization ?? L.utilization),
              source: De,
              fetchedAtMs: de,
              enrichError:
                L.seedSource === "persisted"
                  ? `Showing last-known usage${De === "persisted" ? kr(de, date) : ""}${L.rateLimitedVia !== null ? ` (${describeRateLimitWait(L.heldUntilMs)})` : " (could not refresh)"}`
                  : L.rateLimitedVia !== null
                    ? `${_hn(L.utilization.limits) ? "Partial usage data" : "Per-model breakdown unavailable"} (${describeRateLimitWait(L.heldUntilMs)})`
                    : "Could not refresh usage data",
            };
          }),
            logFeatureSad(
              "usage_plan_limits",
              L.rateLimitedVia === null
                ? "refresh_failed_seeded"
                : L.rateLimitedVia === "envelope"
                  ? "rate_limited_seeded_envelope"
                  : "rate_limited_seeded_http_429",
            ));
          break J;
        }
        case "unavailable": {
          if (L.rateLimitedVia !== null)
            (K(
              L.heldUntilMs === void 0
                ? "Claude is temporarily limiting requests to the usage page (not your usage limit). Try again in a moment."
                : `Usage endpoint is ${describeRateLimitWait(L.heldUntilMs)}.`,
            ),
              logFeatureBad(
                "usage_plan_limits",
                L.rateLimitedVia === "envelope" ? "rate_limited_envelope" : "rate_limited_http_429",
              ));
          else
            (K(L.responseBody ? `${Tn}: ${L.responseBody}` : Tn),
              logFeatureBad("usage_plan_limits", "load_failed"));
        }
      }
      ne(!1);
    }),
      (p[7] = credentials),
      (p[8] = storageV5),
      (p[9] = V));
  else V = p[9];
  let ve = V,
    pe,
    Ce;
  if (p[10] !== ve)
    ((pe = () => {
      ve();
    }),
      (Ce = [ve]),
      (p[10] = ve),
      (p[11] = pe),
      (p[12] = Ce));
  else ((pe = p[11]), (Ce = p[12]));
  P(pe, Ce);
  let He;
  if (p[13] !== ve)
    ((He = () => {
      ve();
    }),
      (p[13] = ve),
      (p[14] = He));
  else He = p[14];
  const xe = (!!H || !!enrichError) && !ee;
  let Oe;
  if (p[15] !== xe) ((Oe = { context: "Settings", isActive: xe }), (p[15] = xe), (p[16] = Oe));
  else Oe = p[16];
  if ((useKeybinding("settings:retry", He, Oe), H)) {
    let Ve;
    if (p[17] !== H)
      ((Ve = r(Text, { color: "error", children: ["Error: ", H] })), (p[17] = H), (p[18] = Ve));
    else Ve = p[18];
    let ke;
    if (p[19] === MEMO_CACHE_SENTINEL)
      ((ke = e(Text, {
        dimColor: !0,
        italic: !1,
        children: r(Byline, {
          children: [
            e(ConfigurableShortcutHint, {
              action: "settings:retry",
              context: "Settings",
              fallback: "r",
              description: "retry",
              ...D,
            }),
            e(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "cancel",
              ...D,
            }),
          ],
        }),
      })),
        (p[19] = ke));
    else ke = p[19];
    let Ue;
    if (p[20] !== Ve)
      ((Ue = r(Box, { flexDirection: "column", gap: 1, children: [Ve, ke] })), (p[20] = Ve), (p[21] = Ue));
    else Ue = p[21];
    return Ue;
  }
  if (!utilization) {
    let Ve;
    if (p[22] === MEMO_CACHE_SENTINEL)
      ((Ve = e(Text, { dimColor: !0, children: "Loading usage data\u2026" })), (p[22] = Ve));
    else Ve = p[22];
    let ke;
    if (p[23] === MEMO_CACHE_SENTINEL)
      ((ke = r(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          Ve,
          e(Text, {
            dimColor: !0,
            italic: !1,
            children: e(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "cancel",
              ...D,
            }),
          }),
        ],
      })),
        (p[23] = ke));
    else ke = p[23];
    return ke;
  }
  let Ve;
  if (p[24] === MEMO_CACHE_SENTINEL) ((Ve = getSubscriptionType()), (p[24] = Ve));
  else Ve = p[24];
  let Ie = Ve,
    ye = Ie === "max" || Ie === "team" || Ie === null,
    We,
    ke,
    Ue,
    _e;
  if (
    p[25] !== maxWidth ||
    p[26] !== utilization.five_hour ||
    p[27] !== utilization.limits ||
    p[28] !== utilization.seven_day ||
    p[29] !== utilization.seven_day_sonnet
  ) {
    let Ne = a2o();
    let st = (at) => Ne.filter((ot) => ot.bar.toLowerCase() === at.toLowerCase()).map(em);
    let et = [
      { bar: "five_hour", title: "Current session", limit: utilization.five_hour, alwaysShowDateInReset: !1 },
      {
        bar: "seven_day",
        title: "Current week (all models)",
        limit: utilization.seven_day,
        alwaysShowDateInReset: !0,
      },
      ...(ye
        ? [
            {
              bar: "seven_day_sonnet",
              title: "Current week (Sonnet only)",
              limit: utilization.seven_day_sonnet,
              alwaysShowDateInReset: !0,
            },
          ]
        : []),
      ...modelScopedWeeklyRows(utilization.limits, overageIncludedModels()).map(toLimitBarSpec),
    ];
    We = Box;
    ke = "column";
    Ue = 1;
    _e = et.map((Ge) => {
      let { bar: bar, title: title, limit: limit, alwaysShowDateInReset: alwaysShowDateInReset } = Ge;
      return (
        limit &&
        e(
          LimitBar,
          {
            title: title,
            limit: limit,
            maxWidth: maxWidth,
            alwaysShowDateInReset: alwaysShowDateInReset,
            trailingLines: st(bar),
          },
          title,
        )
      );
    });
    ((p[25] = maxWidth),
      (p[26] = utilization.five_hour),
      (p[27] = utilization.limits),
      (p[28] = utilization.seven_day),
      (p[29] = utilization.seven_day_sonnet),
      (p[30] = We),
      (p[31] = ke),
      (p[32] = Ue),
      (p[33] = _e));
  } else ((We = p[30]), (ke = p[31]), (Ue = p[32]), (_e = p[33]));
  let Ge;
  if (p[34] !== maxWidth || p[35] !== utilization.cinder_cove)
    ((Ge =
      utilization.cinder_cove &&
      e(LimitBar, {
        title: "Claude Code and Cowork credit",
        limit: utilization.cinder_cove,
        maxWidth: maxWidth,
        subtextOverride: Ur(utilization.cinder_cove.resets_at),
      })),
      (p[34] = maxWidth),
      (p[35] = utilization.cinder_cove),
      (p[36] = Ge));
  else Ge = p[36];
  let Ze;
  if (p[37] !== maxWidth || p[38] !== utilization.wattle_ember)
    ((Ze =
      utilization.wattle_ember &&
      e(LimitBar, {
        title: utilization.wattle_ember.label || "Credit",
        limit: utilization.wattle_ember,
        maxWidth: maxWidth,
        subtextOverride: formatCreditLine(utilization.wattle_ember),
        trailingLines: formatFableCredit(utilization.wattle_ember),
      })),
      (p[37] = maxWidth),
      (p[38] = utilization.wattle_ember),
      (p[39] = Ze));
  else Ze = p[39];
  let Xe;
  if (p[40] !== maxWidth) ((Xe = e(FeedColumn, { maxWidth: maxWidth })), (p[40] = maxWidth), (p[41] = Xe));
  else Xe = p[41];
  let tt;
  if (p[42] !== maxWidth || p[43] !== utilization.extra_usage)
    ((tt =
      utilization.extra_usage &&
      e(ExtraUsageSection, { extraUsage: utilization.extra_usage, maxWidth: maxWidth })),
      (p[42] = maxWidth),
      (p[43] = utilization.extra_usage),
      (p[44] = tt));
  else tt = p[44];
  let mn;
  if (p[45] !== enrichError)
    ((mn = enrichError && e(Text, { dimColor: !0, children: enrichError })),
      (p[45] = enrichError),
      (p[46] = mn));
  else mn = p[46];
  let fn;
  if (p[47] !== enrichError || p[48] !== ee)
    ((fn = ee && !enrichError && e(Text, { dimColor: !0, children: "Refreshing\u2026" })),
      (p[47] = enrichError),
      (p[48] = ee),
      (p[49] = fn));
  else fn = p[49];
  let Yt;
  if (p[50] !== enrichError)
    ((Yt =
      enrichError &&
      e(ConfigurableShortcutHint, {
        action: "settings:retry",
        context: "Settings",
        fallback: "r",
        description: "retry",
        ...D,
      })),
      (p[50] = enrichError),
      (p[51] = Yt));
  else Yt = p[51];
  let _n;
  if (p[52] === MEMO_CACHE_SENTINEL)
    ((_n = e(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Settings",
      fallback: "Esc",
      description: "cancel",
      ...D,
    })),
      (p[52] = _n));
  else _n = p[52];
  let Qt;
  if (p[53] !== Yt)
    ((Qt = e(Text, { dimColor: !0, italic: !1, children: r(Byline, { children: [Yt, _n] }) })),
      (p[53] = Yt),
      (p[54] = Qt));
  else Qt = p[54];
  let ps;
  if (
    p[55] !== We ||
    p[56] !== ke ||
    p[57] !== Ue ||
    p[58] !== _e ||
    p[59] !== Ge ||
    p[60] !== Ze ||
    p[61] !== Xe ||
    p[62] !== tt ||
    p[63] !== mn ||
    p[64] !== fn ||
    p[65] !== Qt
  )
    ((ps = r(We, { flexDirection: ke, gap: Ue, children: [_e, Ge, Ze, Xe, tt, mn, fn, Qt] })),
      (p[55] = We),
      (p[56] = ke),
      (p[57] = Ue),
      (p[58] = _e),
      (p[59] = Ge),
      (p[60] = Ze),
      (p[61] = Xe),
      (p[62] = tt),
      (p[63] = mn),
      (p[64] = fn),
      (p[65] = Qt),
      (p[66] = ps));
  else ps = p[66];
  return ps;
}
//@ chunk-9h8dr0qb.js:65969-65992 layout
var Bt = "Usage credits";
//@ chunk-9h8dr0qb.js:65992-67685 fingerprint = ExtraUsageSection (0.698)
function ExtraUsageSection(t0) {
  let $ = w(27),
    { extraUsage: extraUsage, maxWidth: maxWidth } = t0,
    subscriptionType = getSubscriptionType(),
    D = subscriptionType === "pro" || subscriptionType === "max";
  if (!D && !(subscriptionType === "team" || subscriptionType === "enterprise")) {
    return null;
  }
  if (!extraUsage.is_enabled) {
    if (D && usageCreditsCommand.isEnabled()) {
      let A;
      if ($[0] === MEMO_CACHE_SENTINEL)
        ((A = e(Title, {
          subtitle: "Usage credits are off \xB7 /usage-credits to turn them on",
          children: Bt,
        })),
          ($[0] = A));
      else A = $[0];
      return A;
    }
    return null;
  }
  let v = extraUsage.currency ?? "USD";
  if (extraUsage.monthly_limit === null) {
    if (D) {
      let A;
      if ($[1] === MEMO_CACHE_SENTINEL) ((A = e(Title, { subtitle: "Unlimited", children: Bt })), ($[1] = A));
      else A = $[1];
      return A;
    }
    if (typeof extraUsage.used_credits !== "number") {
      return null;
    }
    let A;
    if ($[2] !== v || $[3] !== extraUsage.used_credits)
      ((A = formatCurrency(extraUsage.used_credits, v)),
        ($[2] = v),
        ($[3] = extraUsage.used_credits),
        ($[4] = A));
    else A = $[4];
    const F = `${A} spent`;
    let U;
    if ($[5] !== F) ((U = e(Title, { subtitle: F, children: Bt })), ($[5] = F), ($[6] = U));
    else U = $[6];
    return U;
  }
  if (typeof extraUsage.used_credits !== "number") {
    return null;
  }
  let W =
      extraUsage.utilization ??
      (extraUsage.monthly_limit > 0
        ? Math.max(0, Math.min(100, (extraUsage.used_credits / extraUsage.monthly_limit) * 100))
        : 100),
    A;
  if ($[7] !== v || $[8] !== extraUsage.used_credits)
    ((A = formatCurrency(extraUsage.used_credits, v)),
      ($[7] = v),
      ($[8] = extraUsage.used_credits),
      ($[9] = A));
  else A = $[9];
  let M = A,
    F;
  if ($[10] !== v || $[11] !== extraUsage.monthly_limit)
    ((F = formatCurrency(extraUsage.monthly_limit, v)),
      ($[10] = v),
      ($[11] = extraUsage.monthly_limit),
      ($[12] = F));
  else F = $[12];
  let B = F,
    H,
    U,
    K,
    ee;
  if ($[13] !== W) {
    let now = new Date();
    let oneMonthReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    H = LimitBar;
    ee = Bt;
    U = W;
    K = oneMonthReset.toISOString();
    (($[13] = W), ($[14] = H), ($[15] = U), ($[16] = K), ($[17] = ee));
  } else ((H = $[14]), (U = $[15]), (K = $[16]), (ee = $[17]));
  let L;
  if ($[18] !== U || $[19] !== K)
    ((L = { utilization: U, resets_at: K }), ($[18] = U), ($[19] = K), ($[20] = L));
  else L = $[20];
  const t9 = `${M} / ${B} spent`;
  let ae;
  if ($[21] !== H || $[22] !== maxWidth || $[23] !== ee || $[24] !== L || $[25] !== t9)
    ((ae = e(H, {
      title: ee,
      limit: L,
      showTimeInReset: !1,
      alwaysShowDateInReset: !0,
      extraSubtext: t9,
      maxWidth: maxWidth,
    })),
      ($[21] = H),
      ($[22] = maxWidth),
      ($[23] = ee),
      ($[24] = L),
      ($[25] = t9),
      ($[26] = ae));
  else ae = $[26];
  return ae;
}
//@ chunk-9h8dr0qb.js:67685-67776 placement = formatPeakDay (0.789)
function formatPeakDay(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}
//@ chunk-9h8dr0qb.js:67776-68119 placement
function formatCreditLine(o) {
  let u = [];
  if (o.limit_dollars != null) {
    let p = yi(o.used_dollars ?? 0),
      h = yi(o.limit_dollars);
    u.push(`${p} of ${h} used`);
  }
  if (o.resets_at) {
    let p = formatResetText(o.resets_at, !0, !0, !0),
      h = o.periods ?? [],
      D = h.length >= 2 ? h.at(-1)?.ends_at : void 0,
      E = D != null && Date.parse(o.resets_at) < Date.parse(D);
    u.push(E ? `Resets ${p}` : `Expires ${p}`);
  }
  return u.join(" \xB7 ");
}
//@ chunk-9h8dr0qb.js:68119-68564 placement
function formatFableCredit(o) {
  let u = Array.isArray(o.periods) ? o.periods : [],
    [p, h] = u;
  if (
    u.length !== 2 ||
    p == null ||
    h == null ||
    o.limit_dollars == null ||
    [p.starts_at, p.ends_at, h.ends_at].some((v) => typeof v !== "string" || Number.isNaN(Date.parse(v)))
  )
    return [];
  let D = yi(o.limit_dollars),
    E = formatPeakDay(p.starts_at),
    T = formatPeakDay(p.ends_at),
    A = formatPeakDay(h.ends_at);
  return [
    {
      text: `You have ${D} USD of Fable usage for each of two periods: ${E} to ${T}, and ${T} to ${A}. Unused credit doesn't carry over.`,
    },
  ];
}
//@ chunk-9h8dr0qb.js:68564-68646 placement
function Ur(o) {
  return o ? `One-time credit \xB7 Expires ${formatPeakDay(o)}` : "One-time credit";
}
//@ chunk-9h8dr0qb.js:68646-68732 placement
function yi(o) {
  return formatCurrency(Math.round(o * 100), "USD", Number.isInteger(o) ? "fit" : "precise");
}
//@ chunk-9h8dr0qb.js:68732-68750 placement
var Rl = Re(Wr(), 1);
//@ chunk-9h8dr0qb.js:68750-68754 placement
j();
/**
 * /usage：当前会话与本周用量条（全部模型/Sonnet/Opus）、重置时间，团队/企业的额外用量区。
 */
//@ chunk-9689amr8.js:12028-12675 fingerprint = Usage (0.427)
function Usage(a) {
  let { rate_limits: rate_limits, subscription_type: subscription_type } = a;
  if (!rate_limits) return null;
  let i = subscription_type === "max" || subscription_type === "team" || subscription_type === null,
    s = [
      { title: "Current session", limit: rate_limits.five_hour },
      { title: "Current week (all models)", limit: rate_limits.seven_day },
      ...(i ? [{ title: "Current week (Sonnet only)", limit: rate_limits.seven_day_sonnet }] : []),
      ...(rate_limits.model_scoped ?? []).map((n) => ({
        title: `Current week (${n.display_name})`,
        limit: { utilization: n.utilization, resets_at: n.resets_at },
      })),
    ],
    o = [];
  for (let { title: title, limit: limit } of s) {
    if (!limit || limit.utilization === null) continue;
    let responseBody = limit.resets_at ? ` \xB7 resets ${formatResetText(limit.resets_at, !0, !0, !0)}` : "";
    o.push(`${title}: ${Math.floor(limit.utilization)}% used${responseBody}`);
  }
  return o.length > 0
    ? o.join(`
`)
    : null;
}

export { Rl, Usage, UsageAttributionView, renderGatewayUsageNotice, applyUsageFix };
