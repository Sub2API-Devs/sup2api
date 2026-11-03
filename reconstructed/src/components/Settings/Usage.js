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
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState, useAppStateSession } from "../../state/AppState.js";
import { selectPluginCommands } from "../../commands/plugin/PluginSettings.js";
import { selectMcpCommands } from "./Status.js";
import { useMainLoopModelSetting, useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { pluginSkillBudgetUsage } from "../../utils/plugins/pluginSkillBudget.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";
import { MEMO_CACHE_SENTINEL, Re } from "../../../runtime/bun-runtime.js";
import { init_react_production, qt, Se, y, fo, Qr, P } from "../../../vendor/react/cjs/react.production.js";
import { useCommandQueueOrDefault, useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import {
  effortBelowMaxSaved,
  enqueueContinuationMessages,
  createEvidenceWindow,
  collectUsageRecommendations,
  MIN_RECOMMENDATION_PCT,
  costliestBehavior,
  usageRecommendationAction,
} from "../../services/usageInsights/recommendations.js";
import { isRemoteSessionAvailable, getRemoteCaps } from "../../remote/remoteMode.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { logError } from "../../utils/log.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { isUsageScanAllowed } from "../../services/usageInsights/transcriptScan.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { cronToHuman } from "../../utils/cron.js";
import { formatTokens, formatRelativeTimeAgo, formatResetText, formatResetTime } from "../../utils/format.js";
import { ProgressBar } from "../design-system/ProgressBar.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { isClaudeAISubscriber, getSubscriptionType } from "../../utils/auth.js";
import { lanternPrismEnabled } from "../../utils/plugins/pluginGates.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import {
  refreshGatewayUsage,
  cachedGatewayUsage,
  SPEND_PERIOD_LABELS,
} from "../../commands/cost/usagePeriods.js";
import { getRawUtilization, areLimitsObserved } from "../../services/claudeAiLimits.js";
import { formatCurrency } from "../../services/api/referral.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { formatTotalCost } from "../../cost-tracker.js";
import { Title } from "../design-system/Title.js";
import { errorMessage } from "../../utils/errors.js";
import {
  normalizeUsageLimits,
  fetchUsageWithModelScopes,
  hasModelScopedLimit,
  rateLimitPromoNotices,
  modelScopedWeeklyRows,
  overageIncludedModels,
} from "../../services/api/usage.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { FeedColumn } from "../LogoV2/FeedColumn.js";
import { usageCreditsCommand } from "../../commands/extra-usage/index.js";
import { require_asciichart } from "../../../vendor/asciichart/asciichart.js";

//@ chunk-9h8dr0qb.js:42676-42716 placement
function selectMainLoopModel(ee) {
  return ee.mainLoopModel;
}
//@ chunk-9h8dr0qb.js:42716-42972 placement
function renderPluginSkillTokensRow(ne) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "row",
      children: [
        jsxProd_default(Box, {
          width: 28,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: ne.pluginName,
          }),
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
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
//@ chunk-9h8dr0qb.js:42972-44139 placement
/**
 * 显示各插件技能描述每轮占用的 token。
 */
function renderPluginSkillFootprint() {
  let D = w(15);
  let appState = useAppState(selectPluginCommands);
  let appState_2 = useAppState(selectMcpCommands);
  let appState_3 = useAppState(selectMainLoopModel);
  let h = useMainLoopModelSetting() ?? appState_3;
  let E;
  if (D[0] !== appState_2 || D[1] !== h || D[2] !== appState) {
    E = pluginSkillBudgetUsage([...appState, ...appState_2], bytesPerTokenForModel(h ?? undefined));
    D[0] = appState_2;
    D[1] = h;
    D[2] = appState;
    D[3] = E;
  } else E = D[3];
  let T = E;
  if (T.byPlugin.length === 0) {
    return null;
  }
  let A;
  let v;
  if (D[4] === MEMO_CACHE_SENTINEL) {
    A = jsxProd_default(Text, {
      bold: true,
      children: "Plugin skill-listing footprint",
    });
    v = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap",
      children:
        "What each plugin's skill descriptions add to the system prompt (cached input after the first turn). Agents and MCP tools not yet counted.",
    });
    D[4] = A;
    D[5] = v;
  } else {
    A = D[4];
    v = D[5];
  }
  let F;
  if (D[6] !== T.byPlugin) {
    F = T.byPlugin.map(renderPluginSkillTokensRow);
    D[6] = T.byPlugin;
    D[7] = F;
  } else F = D[7];
  let U;
  if (D[8] === MEMO_CACHE_SENTINEL) {
    U = jsxProd_default(Box, {
      width: 28,
      children: jsxProd_default(Text, {
        children: "Total",
      }),
    });
    D[8] = U;
  } else U = D[8];
  const W = T.overBudget
    ? " (capped at the listing budget; per-plugin figures above are pre-truncation)"
    : "";
  let M;
  if (D[9] !== T.totalTokens || D[10] !== W) {
    M = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop: 1,
      children: [
        U,
        jsxProd_default_2(Text, {
          children: ["~", T.totalTokens, " tok/turn", W],
        }),
      ],
    });
    D[9] = T.totalTokens;
    D[10] = W;
    D[11] = M;
  } else M = D[11];
  let B;
  if (D[12] !== F || D[13] !== M) {
    B = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        A,
        v,
        jsxProd_default_2(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [F, M],
        }),
      ],
    });
    D[12] = F;
    D[13] = M;
    D[14] = B;
  } else B = D[14];
  return B;
}
//@ chunk-9h8dr0qb.js:44139-44143 placement
init_react_production();
//@ chunk-9h8dr0qb.js:44143-44147 placement
init_react_production();
//@ chunk-9h8dr0qb.js:44147-44181 placement
function selectUltracode(J) {
  return J.ultracode;
}
//@ chunk-9h8dr0qb.js:44181-44389 placement
function renderUsageShareRow(B) {
  return jsxProd_default_2(
    Box,
    {
      children: [
        jsxProd_default(Box, {
          width: USAGE_EVIDENCE_WINDOW_DAYS,
          flexShrink: 0,
          children: jsxProd_default_2(Text, {
            children: [B.pct, "%"],
          }),
        }),
        jsxProd_default_2(Text, {
          wrap: "wrap",
          children: [
            B.title,
            B.detail &&
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [" \xB7 ", B.detail],
              }),
          ],
        }),
      ],
    },
    B.key,
  );
}
//@ chunk-9h8dr0qb.js:44389-44405 placement
var usageDataSlot = qt(null);
//@ chunk-9h8dr0qb.js:44405-44433 placement
function useUsageData() {
  return Se(usageDataSlot);
}
//@ chunk-9h8dr0qb.js:44433-45315 placement
/**
 * 执行用量修复建议（Remote Control 下不可用）。
 */
function applyUsageFix(props) {
  let v = w(18);
  let { onClose, children } = props;
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let appStateSession = useAppStateSession();
  const mainLoopModel = useMainLoopModel();
  const queuedMessageText = useQueuedMessageText();
  const appState = useAppState(selectUltracode);
  let F;
  if (v[0] !== mainLoopModel || v[1] !== queuedMessageText || v[2] !== appState) {
    F = effortBelowMaxSaved(mainLoopModel, queuedMessageText, appState);
    v[0] = mainLoopModel;
    v[1] = queuedMessageText;
    v[2] = appState;
    v[3] = F;
  } else F = v[3];
  let { effortBelowMax, isEffortBelowMaxSaved, isEffortSwitchFree, isUltracodeOn } = F;
  let H;
  if (v[4] !== appStateSession) {
    H = isRemoteSessionAvailable() || isBridgeOrTransport(appStateSession);
    v[4] = appStateSession;
    v[5] = H;
  } else H = v[5];
  let K = H;
  let ee;
  if (
    v[6] !== effortBelowMax ||
    v[7] !== isEffortBelowMaxSaved ||
    v[8] !== isEffortSwitchFree ||
    v[9] !== isUltracodeOn ||
    v[10] !== K ||
    v[11] !== onClose ||
    v[12] !== commandQueueOrDefault ||
    v[13] !== appStateSession
  ) {
    ee = K
      ? null
      : {
          live: {
            effortBelowMax,
            isEffortBelowMaxSaved,
            isEffortSwitchFree,
            isUltracodeOn,
          },
          send: (ne) => {
            if (isBridgeOrTransport(appStateSession)) {
              onClose("Nothing was sent. Turn off Remote Control to use fixes.", {
                display: "system",
              });
              return;
            }
            enqueueContinuationMessages(commandQueueOrDefault, ne);
            logFeatureOk("usage_fix");
            onClose(undefined, {
              display: "skip",
            });
          },
        };
    v[6] = effortBelowMax;
    v[7] = isEffortBelowMaxSaved;
    v[8] = isEffortSwitchFree;
    v[9] = isUltracodeOn;
    v[10] = K;
    v[11] = onClose;
    v[12] = commandQueueOrDefault;
    v[13] = appStateSession;
    v[14] = ee;
  } else ee = v[14];
  let value = ee;
  let L;
  if (v[15] !== children || v[16] !== value) {
    L = jsxProd_default(usageDataSlot.Provider, {
      value,
      children,
    });
    v[15] = children;
    v[16] = value;
    v[17] = L;
  } else L = v[17];
  return L;
}
//@ chunk-9h8dr0qb.js:45315-45324 placement
var USAGE_EVIDENCE_WINDOW_DAYS = 5;
//@ chunk-9h8dr0qb.js:45324-45836 placement
function renderFixUsageButton(props) {
  let A = w(10);
  let { recommendations, fix, maxWidth } = props;
  let usageData = useUsageData();
  let [E, T] = y(false);
  let v;
  if (A[0] !== fix || A[1] !== usageData) {
    v = {
      "settings:fixUsage": () => {
        if (fix) {
          T(true);
          usageData?.send(fix);
        }
      },
    };
    A[0] = fix;
    A[1] = usageData;
    A[2] = v;
  } else v = A[2];
  const isActive = fix !== undefined && !E;
  let U;
  if (A[3] !== isActive) {
    U = {
      context: "Settings",
      isActive,
    };
    A[3] = isActive;
    A[4] = U;
  } else U = A[4];
  MessageActionsKeybindings(v, U);
  if (recommendations.length === 0) {
    return null;
  }
  let children;
  if (A[5] !== recommendations) {
    children = recommendations.map(renderUsageShareRow);
    A[5] = recommendations;
    A[6] = children;
  } else children = A[6];
  let M;
  if (A[7] !== maxWidth || A[8] !== children) {
    M = jsxProd_default(Box, {
      flexDirection: "column",
      maxWidth,
      children,
    });
    A[7] = maxWidth;
    A[8] = children;
    A[9] = M;
  } else M = A[9];
  return M;
}
//@ chunk-9h8dr0qb.js:45836-45912 placement
function resetUsageData(M) {
  logError(M);
  return {
    day: EMPTY_USAGE_BREAKDOWN,
    week: EMPTY_USAGE_BREAKDOWN,
    evidence: {
      day: createEvidenceWindow(),
      week: createEvidenceWindow(),
    },
  };
}
//@ chunk-9h8dr0qb.js:45912-45943 placement
function slashLabel(Ve) {
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
};
var USAGE_LIST_MAX_ROWS = 8;
var USAGE_NAME_COLUMN_WIDTH = 28;
var PERCENT_COLUMN_WIDTH = 6;
//@ chunk-9h8dr0qb.js:46203-47126 placement
/**
 * 用量归因：技能、子代理、插件、MCP 服务器各占多少（扫描本地会话）。
 */
function UsageAttributionView(props) {
  let D = w(14);
  let { maxWidth } = props;
  let { storageV5 } = useTheme_2();
  let [h] = y(isUsageScanAllowed);
  let E;
  if (D[0] !== storageV5 || D[1] !== h.allowed) {
    E = () => (h.allowed ? collectUsageRecommendations(storageV5).catch(resetUsageData) : null);
    D[0] = storageV5;
    D[1] = h.allowed;
    D[2] = E;
  } else E = D[2];
  let [T] = y(E);
  if (T === null || !h.allowed) {
    let A;
    if (D[3] === MEMO_CACHE_SENTINEL) {
      A = jsxProd_default(renderAttributionHeader, {
        withSubtitle: false,
      });
      D[3] = A;
    } else A = D[3];
    const children = h.allowed ? null : h.reason;
    let children_2;
    if (D[4] !== children) {
      children_2 = jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children,
      });
      D[4] = children;
      D[5] = children_2;
    } else children_2 = D[5];
    let U;
    if (D[6] !== maxWidth || D[7] !== children_2) {
      U = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          A,
          jsxProd_default(Box, {
            marginTop: 1,
            maxWidth,
            children: children_2,
          }),
        ],
      });
      D[6] = maxWidth;
      D[7] = children_2;
      D[8] = U;
    } else U = D[8];
    return U;
  }
  let A;
  if (D[9] === MEMO_CACHE_SENTINEL) {
    A = jsxProd_default(renderAttributionHeader, {});
    D[9] = A;
  } else A = D[9];
  let v;
  if (D[10] === MEMO_CACHE_SENTINEL) {
    v = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        A,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "Scanning local sessions\u2026",
          }),
        }),
      ],
    });
    D[10] = v;
  } else v = D[10];
  let fallback = v;
  let F;
  if (D[11] !== maxWidth || D[12] !== T) {
    F = jsxProd_default(fo, {
      fallback,
      children: jsxProd_default(renderAttributionPeriod, {
        maxWidth,
        scanPromise: T,
      }),
    });
    D[11] = maxWidth;
    D[12] = T;
    D[13] = F;
  } else F = D[13];
  return F;
}
//@ chunk-9h8dr0qb.js:47126-47229 placement
function getSignificantBehaviors(o) {
  if (o.totalCost === 0) return [];
  return o.behaviors.filter((behavior) => (behavior.cost / o.totalCost) * 100 >= MIN_RECOMMENDATION_PCT);
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
function renderAttributionPeriod(props) {
  let h = w(36);
  let { maxWidth, scanPromise } = props;
  let D;
  if (h[0] === MEMO_CACHE_SENTINEL) {
    D = stableEmptyObject(false);
    h[0] = D;
  } else D = h[0];
  let E = D;
  let T = Qr(scanPromise);
  let [A, v] = y("day");
  let usageData = useUsageData();
  let U;
  if (h[1] !== T.day) {
    U = getSignificantBehaviors(T.day).length > 0 || hasUsageBreakdownEntries(T.day);
    h[1] = T.day;
    h[2] = U;
  } else U = h[2];
  let W = U;
  let M;
  if (h[3] !== T.week) {
    M = getSignificantBehaviors(T.week).length > 0 || hasUsageBreakdownEntries(T.week);
    h[3] = T.week;
    h[4] = M;
  } else M = h[4];
  let B = M;
  let isActive = W || B;
  let K;
  if (h[5] === MEMO_CACHE_SENTINEL) {
    K = {
      "settings:periodDay": () => v("day"),
      "settings:periodWeek": () => v("week"),
    };
    h[5] = K;
  } else K = h[5];
  let ee;
  if (h[6] !== isActive) {
    ee = {
      context: "Settings",
      isActive,
    };
    h[6] = isActive;
    h[7] = ee;
  } else ee = h[7];
  MessageActionsKeybindings(K, ee);
  if (!W && !B) {
    return null;
  }
  let ne = A === "day" ? T.day : T.week;
  let V;
  if (h[8] !== ne) {
    V = getSignificantBehaviors(ne);
    h[8] = ne;
    h[9] = V;
  } else V = h[9];
  let L = V;
  let J;
  let ae;
  if (h[10] !== usageData || h[11] !== A || h[12] !== T.evidence || h[13] !== ne) {
    J = costliestBehavior(ne, T.evidence[A], usageData?.live);
    ae = usageData ? usageRecommendationAction(J) : undefined;
    h[10] = usageData;
    h[11] = A;
    h[12] = T.evidence;
    h[13] = ne;
    h[14] = J;
    h[15] = ae;
  } else {
    J = h[14];
    ae = h[15];
  }
  let me = ae;
  let fe;
  if (h[16] === MEMO_CACHE_SENTINEL) {
    fe = jsxProd_default(renderAttributionHeader, {});
    h[16] = fe;
  } else fe = h[16];
  const De = A === "day" ? "24h" : "7d";
  let de;
  if (h[17] !== De) {
    de = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "wrap",
        children: ["Last ", De, " \xB7 shares overlap"],
      }),
    });
    h[17] = De;
    h[18] = de;
  } else de = h[18];
  let ve;
  if (h[19] !== me || h[20] !== maxWidth || h[21] !== J || h[22] !== L.length || h[23] !== ne) {
    ve = jsxProd_default(Box, {
      marginTop: 1,
      flexDirection: "column",
      gap: 1,
      children:
        L.length === 0 && !hasUsageBreakdownEntries(ne)
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "Nothing over ",
                MIN_RECOMMENDATION_PCT,
                "% in this period \u2014 try the other window.",
              ],
            })
          : jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default(renderFixUsageButton, {
                  recommendations: J,
                  fix: me,
                  maxWidth,
                }),
                !hasUsageBreakdownEntries(ne)
                  ? jsxProd_default_2(Box, {
                      flexDirection: "column",
                      children: [
                        jsxProd_default(Text, {
                          bold: true,
                          children: "Skills, subagents, plugins, and MCP servers",
                        }),
                        jsxProd_default(Text, {
                          dimColor: true,
                          wrap: "wrap",
                          children: "No attribution data yet \xB7 accumulates as you use Claude",
                        }),
                      ],
                    })
                  : jsxProd_default_2(Fragment, {
                      children: [
                        jsxProd_default(renderAttributionRows, {
                          title: "Skills",
                          rows: ne.skills,
                          label: slashLabel,
                        }),
                        jsxProd_default(renderAttributionRows, {
                          title: "Subagents",
                          rows: ne.agents,
                        }),
                        jsxProd_default(renderAttributionRows, {
                          title: "Plugins",
                          rows: ne.plugins,
                        }),
                        jsxProd_default(renderAttributionRows, {
                          title: "MCP servers",
                          rows: ne.mcpServers,
                        }),
                        jsxProd_default(renderLoopsAttribution, {
                          rows: ne.loops,
                          maxWidth,
                        }),
                      ],
                    }),
              ],
            }),
    });
    h[19] = me;
    h[20] = maxWidth;
    h[21] = J;
    h[22] = L.length;
    h[23] = ne;
    h[24] = ve;
  } else ve = h[24];
  let pe;
  if (h[25] !== me || h[26] !== J) {
    pe =
      me &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "settings:fixUsage",
        context: "Settings",
        fallback: "f",
        description: formatFixCountLabel(me.keys.length, J.length),
        ...E,
      });
    h[25] = me;
    h[26] = J;
    h[27] = pe;
  } else pe = h[27];
  let Ce;
  let He;
  if (h[28] === MEMO_CACHE_SENTINEL) {
    Ce = jsxProd_default(ConfigurableShortcutHint, {
      action: "settings:periodDay",
      context: "Settings",
      fallback: "d",
      description: "day",
      ...E,
    });
    He = jsxProd_default(ConfigurableShortcutHint, {
      action: "settings:periodWeek",
      context: "Settings",
      fallback: "w",
      description: "week",
      ...E,
    });
    h[28] = Ce;
    h[29] = He;
  } else {
    Ce = h[28];
    He = h[29];
  }
  let xe;
  if (h[30] !== pe) {
    xe = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: false,
        children: jsxProd_default_2(Byline, {
          children: [pe, Ce, He],
        }),
      }),
    });
    h[30] = pe;
    h[31] = xe;
  } else xe = h[31];
  let Oe;
  if (h[32] !== de || h[33] !== ve || h[34] !== xe) {
    Oe = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [fe, de, ve, xe],
    });
    h[32] = de;
    h[33] = ve;
    h[34] = xe;
    h[35] = Oe;
  } else Oe = h[35];
  return Oe;
}
//@ chunk-9h8dr0qb.js:50015-50120 placement
function formatFixCountLabel(o, u) {
  if (o < u) return `fix ${o} of ${u}`;
  return o === 1 ? "fix this" : o === 2 ? "fix both" : `fix all ${o}`;
}
//@ chunk-9h8dr0qb.js:50120-50529 placement
function renderAttributionHeader(props) {
  let h = w(5);
  let { withSubtitle } = props;
  let p = withSubtitle === undefined ? true : withSubtitle;
  let D;
  if (h[0] === MEMO_CACHE_SENTINEL) {
    D = jsxProd_default(Text, {
      bold: true,
      wrap: "wrap",
      children: "What's contributing to your usage?",
    });
    h[0] = D;
  } else D = h[0];
  let E;
  if (h[1] !== p) {
    E =
      p &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children: "Approximate \xB7 sessions on this machine only",
      });
    h[1] = p;
    h[2] = E;
  } else E = h[2];
  let T;
  if (h[3] !== E) {
    T = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [D, E],
    });
    h[3] = E;
    h[4] = T;
  } else T = h[4];
  return T;
}
//@ chunk-9h8dr0qb.js:50529-51614 placement
function renderAttributionRows(props) {
  let D = w(23);
  let { title, rows, label } = props;
  if (rows.length === 0) {
    return null;
  }
  let E;
  let flexDirection;
  let A;
  let v;
  let F;
  if (D[0] !== label || D[1] !== rows || D[2] !== title) {
    let sliced = rows.slice(0, USAGE_LIST_MAX_ROWS);
    F = rows.length - USAGE_LIST_MAX_ROWS;
    E = Box;
    flexDirection = "column";
    let W;
    if (D[8] !== title) {
      W = jsxProd_default(Text, {
        children: title,
      });
      D[8] = title;
      D[9] = W;
    } else W = D[9];
    let M;
    if (D[10] === MEMO_CACHE_SENTINEL) {
      M = jsxProd_default(Text, {
        dimColor: true,
        children: "% of usage",
      });
      D[10] = M;
    } else M = D[10];
    if (D[11] !== W) {
      A = jsxProd_default_2(Box, {
        width: USAGE_NAME_COLUMN_WIDTH + PERCENT_COLUMN_WIDTH,
        justifyContent: "space-between",
        children: [W, M],
      });
      D[11] = W;
      D[12] = A;
    } else A = D[12];
    let B;
    if (D[13] !== label) {
      B = (H) =>
        jsxProd_default_2(
          Box,
          {
            children: [
              jsxProd_default(Box, {
                width: USAGE_NAME_COLUMN_WIDTH,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  wrap: "truncate-end",
                  children: label ? label(H.name) : H.name,
                }),
              }),
              jsxProd_default(Box, {
                width: PERCENT_COLUMN_WIDTH,
                justifyContent: "flex-end",
                children: jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [H.pct, "%"],
                }),
              }),
            ],
          },
          H.name,
        );
      D[13] = label;
      D[14] = B;
    } else B = D[14];
    v = sliced.map(B);
    D[0] = label;
    D[1] = rows;
    D[2] = title;
    D[3] = E;
    D[4] = flexDirection;
    D[5] = A;
    D[6] = v;
    D[7] = F;
  } else {
    E = D[3];
    flexDirection = D[4];
    A = D[5];
    v = D[6];
    F = D[7];
  }
  let W;
  if (D[15] !== F) {
    W =
      F > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["\u2026 ", F, " more"],
      });
    D[15] = F;
    D[16] = W;
  } else W = D[16];
  let M;
  if (D[17] !== E || D[18] !== flexDirection || D[19] !== A || D[20] !== v || D[21] !== W) {
    M = jsxProd_default_2(E, {
      flexDirection,
      children: [A, v, W],
    });
    D[17] = E;
    D[18] = flexDirection;
    D[19] = A;
    D[20] = v;
    D[21] = W;
    D[22] = M;
  } else M = D[22];
  return M;
}
//@ chunk-9h8dr0qb.js:51614-51671 placement
var USAGE_SECTION_HEADER_ROWS = 10;
var USAGE_SECTION_SPARK_ROWS = 6;
var USAGE_SECTION_DETAIL_ROWS = 8;
var USAGE_SECTION_TABLE_ROWS = 9;
var USAGE_SECTION_FOOTER_ROWS = 9;
var USAGE_TOTAL_ROWS =
  USAGE_SECTION_HEADER_ROWS +
  USAGE_SECTION_SPARK_ROWS +
  USAGE_SECTION_DETAIL_ROWS +
  USAGE_SECTION_TABLE_ROWS +
  USAGE_SECTION_FOOTER_ROWS;
var USAGE_SHELL_ROWS = USAGE_TOTAL_ROWS + 24;
//@ chunk-9h8dr0qb.js:51671-52084 placement
/**
 * 把循环任务的 cron 表达式缩写成 "5m"/"2h"/"1d"/"at HH:MM"；动态循环返回 dynamic，其他表达式用 cronToHuman 转成文字。
 */
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
function renderLoopsAttribution(props) {
  let T = w(28);
  let { rows, maxWidth } = props;
  if (rows.length === 0) {
    return null;
  }
  let h = maxWidth >= USAGE_SHELL_ROWS;
  let D = h ? USAGE_TOTAL_ROWS : USAGE_TOTAL_ROWS - USAGE_SECTION_TABLE_ROWS;
  let width = Math.max(12, maxWidth - D);
  let A;
  let flexDirection;
  let F;
  let U;
  let W;
  if (T[0] !== width || T[1] !== rows || T[2] !== h) {
    let sliced = rows.slice(0, USAGE_LIST_MAX_ROWS);
    W = rows.length - USAGE_LIST_MAX_ROWS;
    let now = new Date();
    A = Box;
    flexDirection = "column";
    let children;
    if (T[8] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        children: "Loops",
      });
      T[8] = children;
    } else children = T[8];
    let K;
    if (T[9] !== width) {
      K = jsxProd_default(Box, {
        width,
        children,
      });
      T[9] = width;
      T[10] = K;
    } else K = T[10];
    let ee;
    let ne;
    let V;
    if (T[11] === MEMO_CACHE_SENTINEL) {
      ee = jsxProd_default(RightAlignedDimText, {
        width: USAGE_SECTION_HEADER_ROWS,
        text: "every",
      });
      ne = jsxProd_default(RightAlignedDimText, {
        width: USAGE_SECTION_SPARK_ROWS,
        text: "runs",
      });
      V = jsxProd_default(RightAlignedDimText, {
        width: USAGE_SECTION_DETAIL_ROWS,
        text: "tokens",
      });
      T[11] = ee;
      T[12] = ne;
      T[13] = V;
    } else {
      ee = T[11];
      ne = T[12];
      V = T[13];
    }
    let L;
    if (T[14] !== h) {
      L =
        h &&
        jsxProd_default(RightAlignedDimText, {
          width: USAGE_SECTION_TABLE_ROWS,
          text: "per run",
        });
      T[14] = h;
      T[15] = L;
    } else L = T[15];
    let J;
    if (T[16] === MEMO_CACHE_SENTINEL) {
      J = jsxProd_default(RightAlignedDimText, {
        width: USAGE_SECTION_FOOTER_ROWS,
        text: "last run",
      });
      T[16] = J;
    } else J = T[16];
    if (T[17] !== K || T[18] !== L) {
      F = jsxProd_default_2(Box, {
        children: [K, ee, ne, V, L, J],
      });
      T[17] = K;
      T[18] = L;
      T[19] = F;
    } else F = T[19];
    U = sliced.map((ae) =>
      jsxProd_default_2(
        Box,
        {
          children: [
            jsxProd_default(Box, {
              width,
              children: jsxProd_default(Text, {
                dimColor: true,
                wrap: "truncate-end",
                children: ae.prompt,
              }),
            }),
            jsxProd_default(RightAlignedDimText, {
              width: USAGE_SECTION_HEADER_ROWS,
              text: formatLoopSchedule(ae),
            }),
            jsxProd_default(RightAlignedDimText, {
              width: USAGE_SECTION_SPARK_ROWS,
              text: String(ae.runs),
            }),
            jsxProd_default(RightAlignedDimText, {
              width: USAGE_SECTION_DETAIL_ROWS,
              text: formatTokens(ae.tokens),
            }),
            h &&
              jsxProd_default(RightAlignedDimText, {
                width: USAGE_SECTION_TABLE_ROWS,
                text: ae.runs > 0 && ae.tokens > 0 ? formatTokens(Math.round(ae.tokens / ae.runs)) : "\u2013",
              }),
            jsxProd_default(RightAlignedDimText, {
              width: USAGE_SECTION_FOOTER_ROWS,
              text:
                ae.lastRunMs > 0
                  ? formatRelativeTimeAgo(new Date(ae.lastRunMs), {
                      now,
                    })
                  : "\u2013",
            }),
          ],
        },
        ae.prompt,
      ),
    );
    T[0] = width;
    T[1] = rows;
    T[2] = h;
    T[3] = A;
    T[4] = flexDirection;
    T[5] = F;
    T[6] = U;
    T[7] = W;
  } else {
    A = T[3];
    flexDirection = T[4];
    F = T[5];
    U = T[6];
    W = T[7];
  }
  let H;
  if (T[20] !== W) {
    H =
      W > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["\u2026 ", W, " more"],
      });
    T[20] = W;
    T[21] = H;
  } else H = T[21];
  let K;
  if (T[22] !== A || T[23] !== flexDirection || T[24] !== F || T[25] !== U || T[26] !== H) {
    K = jsxProd_default_2(A, {
      flexDirection,
      children: [F, U, H],
    });
    T[22] = A;
    T[23] = flexDirection;
    T[24] = F;
    T[25] = U;
    T[26] = H;
    T[27] = K;
  } else K = T[27];
  return K;
}
//@ chunk-9h8dr0qb.js:53661-53922 placement
function RightAlignedDimText(props) {
  let h = w(5);
  let { width, text } = props;
  let children;
  if (h[0] !== text) {
    children = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children: text,
    });
    h[0] = text;
    h[1] = children;
  } else children = h[1];
  let E;
  if (h[2] !== children || h[3] !== width) {
    E = jsxProd_default(Box, {
      width,
      justifyContent: "flex-end",
      children,
    });
    h[2] = children;
    h[3] = width;
    h[4] = E;
  } else E = h[4];
  return E;
}
//@ chunk-9h8dr0qb.js:53922-53937 placement
function noopUsageCallback() {}
//@ chunk-9h8dr0qb.js:53937-54010 placement
function clearEnrichError(In) {
  return In.enrichError === null
    ? In
    : {
        ...In,
        enrichError: null,
      };
}
//@ chunk-9h8dr0qb.js:54010-54064 placement
function toUsageNoticeRow(hn) {
  return {
    text: hn.text,
    color: hn.variant,
  };
}
//@ chunk-9h8dr0qb.js:54064-54177 placement
function toLimitBarSpec(o) {
  let { title, displayName, limit } = o;
  return {
    bar: displayName,
    title,
    limit,
    alwaysShowDateInReset: true,
  };
}
//@ chunk-9h8dr0qb.js:54177-56348 fingerprint = LimitBar (0.788)
function LimitBar(props) {
  let $ = w(41);
  let {
    title,
    limit,
    maxWidth,
    showTimeInReset,
    alwaysShowDateInReset,
    extraSubtext,
    trailingLines,
    subtextOverride,
  } = props;
  let F = showTimeInReset === undefined ? true : showTimeInReset;
  let U = alwaysShowDateInReset === undefined ? false : alwaysShowDateInReset;
  let { utilization, resets_at } = limit;
  if (utilization === null) {
    return null;
  }
  let usedText = `${Math.floor(utilization)}% used`;
  let subtext;
  if (resets_at) {
    let t2;
    if ($[0] !== U || $[1] !== resets_at || $[2] !== F) {
      t2 = formatResetText(resets_at, true, F, U);
      $[0] = U;
      $[1] = resets_at;
      $[2] = F;
      $[3] = t2;
    } else t2 = $[3];
    subtext = `Resets ${t2}`;
  }
  if (extraSubtext) {
    if (subtext) subtext = `${extraSubtext} \xB7 ${subtext}`;
    else subtext = extraSubtext;
  }
  if (subtextOverride !== undefined) subtext = subtextOverride;
  let maxWidth_2 = false ? Math.max(1, maxWidth - 4) : maxWidth;
  if (maxWidth_2 >= 62) {
    let ee;
    if ($[4] !== title) {
      ee = jsxProd_default(Text, {
        bold: true,
        children: title,
      });
      $[4] = title;
      $[5] = ee;
    } else ee = $[5];
    const ratio = utilization / 100;
    let t4;
    if ($[6] !== ratio) {
      t4 = jsxProd_default(ProgressBar, {
        ratio,
        width: 50,
        variant: false ? "shade" : "block",
        fillColor: false ? "suggestion" : "rate_limit_fill",
        emptyColor: false ? undefined : "rate_limit_empty",
      });
      $[6] = ratio;
      $[7] = t4;
    } else t4 = $[7];
    let t5;
    if ($[8] !== usedText) {
      t5 = jsxProd_default(Text, {
        children: usedText,
      });
      $[8] = usedText;
      $[9] = t5;
    } else t5 = $[9];
    let ae;
    if ($[10] !== t4 || $[11] !== t5) {
      ae = jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: false ? 2 : 1,
        children: [t4, t5],
      });
      $[10] = t4;
      $[11] = t5;
      $[12] = ae;
    } else ae = $[12];
    let me;
    if ($[13] !== subtext) {
      me =
        subtext &&
        jsxProd_default(Text, {
          dimColor: true,
          children: subtext,
        });
      $[13] = subtext;
      $[14] = me;
    } else me = $[14];
    let fe;
    if ($[15] !== trailingLines) {
      fe = jsxProd_default(renderColoredLines, {
        lines: trailingLines,
      });
      $[15] = trailingLines;
      $[16] = fe;
    } else fe = $[16];
    let t8;
    if ($[17] !== ee || $[18] !== ae || $[19] !== me || $[20] !== fe) {
      t8 = jsxProd_default_2(Box, {
        flexDirection: "column",
        flexShrink: 0,
        children: [ee, ae, me, fe],
      });
      $[17] = ee;
      $[18] = ae;
      $[19] = me;
      $[20] = fe;
      $[21] = t8;
    } else t8 = $[21];
    return t8;
  } else {
    let t2;
    if ($[22] !== title) {
      t2 = jsxProd_default(Text, {
        bold: true,
        children: title,
      });
      $[22] = title;
      $[23] = t2;
    } else t2 = $[23];
    let t3;
    if ($[24] !== subtext) {
      t3 =
        subtext &&
        jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              children: " ",
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: ["\xB7 ", subtext],
            }),
          ],
        });
      $[24] = subtext;
      $[25] = t3;
    } else t3 = $[25];
    let L;
    if ($[26] !== t2 || $[27] !== t3) {
      L = jsxProd_default_2(Text, {
        children: [t2, t3],
      });
      $[26] = t2;
      $[27] = t3;
      $[28] = L;
    } else L = $[28];
    let J;
    if ($[29] !== trailingLines) {
      J = jsxProd_default(renderColoredLines, {
        lines: trailingLines,
      });
      $[29] = trailingLines;
      $[30] = J;
    } else J = $[30];
    const ratio = utilization / 100;
    let me;
    if ($[31] !== maxWidth_2 || $[32] !== ratio) {
      me = jsxProd_default(ProgressBar, {
        ratio,
        width: maxWidth_2,
        variant: false ? "shade" : "block",
        fillColor: false ? "suggestion" : "rate_limit_fill",
        emptyColor: false ? undefined : "rate_limit_empty",
      });
      $[31] = maxWidth_2;
      $[32] = ratio;
      $[33] = me;
    } else me = $[33];
    let t7;
    if ($[34] !== usedText) {
      t7 = jsxProd_default(Text, {
        children: usedText,
      });
      $[34] = usedText;
      $[35] = t7;
    } else t7 = $[35];
    let t8;
    if ($[36] !== L || $[37] !== J || $[38] !== me || $[39] !== t7) {
      t8 = jsxProd_default_2(Box, {
        flexDirection: "column",
        flexShrink: 0,
        children: [L, J, me, t7],
      });
      $[36] = L;
      $[37] = J;
      $[38] = me;
      $[39] = t7;
      $[40] = t8;
    } else t8 = $[40];
    return t8;
  }
}
//@ chunk-9h8dr0qb.js:56348-56454 placement
function renderColoredLines({ lines }) {
  return (lines ?? []).map((u, p) =>
    jsxProd_default(
      Text,
      {
        dimColor: !u.color,
        color: u.color,
        children: u.text,
      },
      p,
    ),
  );
}
//@ chunk-9h8dr0qb.js:56454-57121 placement
function renderGatewayUsageNotice() {
  let o = w(7);
  let u;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    u = stableEmptyObject(false);
    o[0] = u;
  } else u = o[0];
  let p = u;
  let { columns } = useTerminalSize();
  let D = columns - 2;
  let maxWidth = Math.min(D, 80);
  let T;
  if (o[1] === MEMO_CACHE_SENTINEL) {
    T = isClaudeAISubscriber();
    o[1] = T;
  } else T = o[1];
  let A = T;
  let v;
  if (o[2] === MEMO_CACHE_SENTINEL) {
    v = getRemoteCaps();
    o[2] = v;
  } else v = o[2];
  let isThinClient = v !== null;
  let U;
  let W;
  if (o[3] === MEMO_CACHE_SENTINEL) {
    U = jsxProd_default(renderRemoteCost, {
      isThinClient,
    });
    W = lanternPrismEnabled() ? jsxProd_default(renderPluginSkillFootprint, {}) : null;
    o[3] = U;
    o[4] = W;
  } else {
    U = o[3];
    W = o[4];
  }
  let M;
  if (o[5] !== maxWidth) {
    M = jsxProd_default(Box, {
      flexDirection: "column",
      width: "100%",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        flexShrink: 0,
        children: [
          U,
          W,
          getAPIProvider() === "gateway"
            ? jsxProd_default(UsageCreditsPanel, {
                maxWidth,
              })
            : A
              ? jsxProd_default(loadUsageData, {
                  maxWidth,
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  italic: false,
                  children: jsxProd_default(ConfigurableShortcutHint, {
                    action: "confirm:no",
                    context: "Settings",
                    fallback: "Esc",
                    description: "cancel",
                    ...p,
                  }),
                }),
        ],
      }),
    });
    o[5] = maxWidth;
    o[6] = M;
  } else M = o[6];
  return M;
}
//@ chunk-9h8dr0qb.js:57121-57890 placement = _temp2 (0.477)
/**
 * 用量设置里的额度面板：读取凭据对应的额度，失败时回退显示消费上限，底部 Esc 取消提示。
 */
function UsageCreditsPanel(exitState) {
  let $ = w(15);
  let { maxWidth } = exitState;
  let h;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    h = stableEmptyObject(false);
    $[0] = h;
  } else h = $[0];
  let D = h;
  let { credentials } = useTheme_2();
  let T;
  if ($[1] !== credentials) {
    T = () => refreshGatewayUsage(credentials).catch(noopUsageCallback);
    $[1] = credentials;
    $[2] = T;
  } else T = $[2];
  let [A] = y(T);
  let spend;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    spend = cachedGatewayUsage();
    $[3] = spend;
  } else spend = $[3];
  let fallback;
  if ($[4] !== maxWidth) {
    fallback = jsxProd_default(renderSpendLimit, {
      spend,
      maxWidth,
    });
    $[4] = maxWidth;
    $[5] = fallback;
  } else fallback = $[5];
  let children;
  if ($[6] !== maxWidth || $[7] !== A) {
    children = jsxProd_default(SpendLimitReading, {
      reading: A,
      maxWidth,
    });
    $[6] = maxWidth;
    $[7] = A;
    $[8] = children;
  } else children = $[8];
  let W;
  if ($[9] !== fallback || $[10] !== children) {
    W = jsxProd_default(fo, {
      fallback,
      children,
    });
    $[9] = fallback;
    $[10] = children;
    $[11] = W;
  } else W = $[11];
  let M;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    M = jsxProd_default(Text, {
      dimColor: true,
      italic: false,
      children: jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Settings",
        fallback: "Esc",
        description: "cancel",
        ...D,
      }),
    });
    $[12] = M;
  } else M = $[12];
  let B;
  if ($[13] !== W) {
    B = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [W, M],
    });
    $[13] = W;
    $[14] = B;
  } else B = $[14];
  return B;
}
//@ chunk-9h8dr0qb.js:57890-58054 placement
/**
 * 在 Suspense 下读取额度花费数据并渲染支出上限行。
 */
function SpendLimitReading(props) {
  let D = w(3);
  let { reading, maxWidth } = props;
  const spend = Qr(reading);
  let E;
  if (D[0] !== maxWidth || D[1] !== spend) {
    E = jsxProd_default(renderSpendLimit, {
      spend,
      maxWidth,
    });
    D[0] = maxWidth;
    D[1] = spend;
    D[2] = E;
  } else E = D[2];
  return E;
}
//@ chunk-9h8dr0qb.js:58054-58854 placement
function renderSpendLimit(props) {
  let h = w(10);
  let { spend, maxWidth } = props;
  let D;
  if (h[0] === MEMO_CACHE_SENTINEL) {
    D = getRawUtilization();
    h[0] = D;
  } else D = h[0];
  let overage = D.overage;
  let T;
  if (h[1] !== spend) {
    T = spend
      ? {
          utilization: Math.round(spend.utilization),
          resets_at: spend.resetsAt,
        }
      : overage
        ? {
            utilization: Math.round(overage.utilization * 100),
            resets_at: new Date(overage.resets_at * 1000).toISOString(),
          }
        : null;
    h[1] = spend;
    h[2] = T;
  } else T = h[2];
  let A = T;
  if (!A) {
    let v;
    if (h[3] === MEMO_CACHE_SENTINEL) {
      v = areLimitsObserved()
        ? null
        : jsxProd_default(Text, {
            dimColor: true,
            children: "Spend limit \xB7 Shown once your gateway reports one",
          });
      h[3] = v;
    } else v = h[3];
    return v;
  }
  let v;
  if (h[4] !== spend) {
    v = spend
      ? `${formatCurrency(spend.used, spend.currency)} / ${formatCurrency(spend.limit, spend.currency)} spent${spend.period ? ` ${SPEND_PERIOD_LABELS[spend.period]}` : ""}`
      : undefined;
    h[4] = spend;
    h[5] = v;
  } else v = h[5];
  let extraSubtext = v;
  let U;
  if (h[6] !== extraSubtext || h[7] !== A || h[8] !== maxWidth) {
    U = jsxProd_default(LimitBar, {
      title: "Spend limit",
      limit: A,
      maxWidth,
      alwaysShowDateInReset: true,
      extraSubtext,
    });
    h[6] = extraSubtext;
    h[7] = A;
    h[8] = maxWidth;
    h[9] = U;
  } else U = h[9];
  return U;
}
//@ chunk-9h8dr0qb.js:58854-59430 placement
function renderRemoteCost(props) {
  let p = w(10);
  let { isThinClient } = props;
  let h;
  if (p[0] === MEMO_CACHE_SENTINEL) {
    h = stripAnsi(formatTotalCost());
    p[0] = h;
  } else h = p[0];
  let children = h;
  let E;
  if (p[1] !== isThinClient) {
    E = () => (isThinClient ? fetchRemoteSessionCost() : null);
    p[1] = isThinClient;
    p[2] = E;
  } else E = p[2];
  let [T] = y(E);
  const A = isThinClient ? " (remote)" : "";
  let v;
  if (p[3] !== A) {
    v = jsxProd_default_2(Title, {
      children: ["Session", A],
    });
    p[3] = A;
    p[4] = v;
  } else v = p[4];
  let F;
  if (p[5] !== T) {
    F = T
      ? jsxProd_default(fo, {
          fallback: jsxProd_default(Text, {
            dimColor: true,
            children: "Loading remote cost\u2026",
          }),
          children: jsxProd_default(RemoteCostText, {
            costPromise: T,
          }),
        })
      : jsxProd_default(Text, {
          dimColor: true,
          children,
        });
    p[5] = T;
    p[6] = F;
  } else F = p[6];
  let U;
  if (p[7] !== v || p[8] !== F) {
    U = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [v, F],
    });
    p[7] = v;
    p[8] = F;
    p[9] = U;
  } else U = p[9];
  return U;
}
//@ chunk-9h8dr0qb.js:59430-59573 placement
function RemoteCostText(props) {
  let h = w(2);
  let { costPromise } = props;
  const children = Qr(costPromise);
  let D;
  if (h[0] !== children) {
    D = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    h[0] = children;
    h[1] = D;
  } else D = h[1];
  return D;
}
//@ chunk-9h8dr0qb.js:59573-59768 placement
async function fetchRemoteSessionCost() {
  let remoteCaps = getRemoteCaps();
  if (!remoteCaps) return "Remote cost unavailable";
  try {
    return (
      await remoteCaps.sendControlRequest({
        subtype: "get_session_cost",
      })
    ).text;
  } catch (error) {
    return `Remote cost unavailable (${errorMessage(error)})`;
  }
}
//@ chunk-9h8dr0qb.js:59768-59803 placement
var USAGE_LOAD_FAILED_TEXT = "Failed to load usage data";
//@ chunk-9h8dr0qb.js:59803-59885 placement
function asOfSuffix(o, now) {
  if (o === undefined) return "";
  return ` as of ${formatRelativeTimeAgo(new Date(o), {
    now,
  })}`;
}
//@ chunk-9h8dr0qb.js:59885-60028 placement
function describeRateLimitWait(heldUntilMs) {
  return heldUntilMs === undefined
    ? "requests temporarily limited \u2014 try again in a moment"
    : `rate limited until ${formatResetTime(Math.ceil(heldUntilMs / 60000) * 60)}`;
}
//@ chunk-9h8dr0qb.js:60028-65969 placement
/**
 * 加载用量与额度数据（远程会话成本、gateway 花费上限、限流、刷新失败回退到上次已知数据，约 6 KB）。
 */
function loadUsageData(props) {
  let p = w(67);
  let { maxWidth } = props;
  let h;
  if (p[0] === MEMO_CACHE_SENTINEL) {
    h = stableEmptyObject(false);
    p[0] = h;
  } else h = p[0];
  let D = h;
  let { storageV5, credentials } = useTheme_2();
  let A;
  if (p[1] !== storageV5) {
    A = () => normalizeUsageLimits(storageV5);
    p[1] = storageV5;
    p[2] = A;
  } else A = p[2];
  let [v] = y(A);
  let F;
  if (p[3] !== v?.fetchedAtMs || p[4] !== v?.source || p[5] !== v?.utilization) {
    F = () => ({
      utilization: v?.utilization ?? null,
      source: v?.source ?? null,
      fetchedAtMs: v?.fetchedAtMs,
      enrichError: null,
    });
    p[3] = v?.fetchedAtMs;
    p[4] = v?.source;
    p[5] = v?.utilization;
    p[6] = F;
  } else F = p[6];
  let [U, W] = y(F);
  let { utilization, enrichError } = U;
  let [H, K] = y(null);
  let [ee, ne] = y(true);
  let V;
  if (p[7] !== credentials || p[8] !== storageV5) {
    V = async () => {
      ne(true);
      K(null);
      W(clearEnrichError);
      let usageWithModelScopes = await fetchUsageWithModelScopes(storageV5, credentials);
      J: switch (usageWithModelScopes.status) {
        case "ok": {
          W({
            utilization: usageWithModelScopes.utilization,
            source: "ok",
            fetchedAtMs: undefined,
            enrichError: null,
          });
          logFeatureOk("usage_plan_limits");
          break J;
        }
        case "empty_response": {
          logFeatureBad("usage_plan_limits", "empty_response");
          K(USAGE_LOAD_FAILED_TEXT);
          break J;
        }
        case "seeded": {
          let date = new Date();
          W((me) => {
            let fe = me.utilization === null;
            let De = usageWithModelScopes.seedSource === "headers" ? "headers" : fe ? "persisted" : me.source;
            let de =
              usageWithModelScopes.seedSource === "headers"
                ? undefined
                : fe
                  ? usageWithModelScopes.seedFetchedAtMs
                  : me.fetchedAtMs;
            return {
              utilization:
                usageWithModelScopes.seedSource === "headers"
                  ? usageWithModelScopes.utilization
                  : (me.utilization ?? usageWithModelScopes.utilization),
              source: De,
              fetchedAtMs: de,
              enrichError:
                usageWithModelScopes.seedSource === "persisted"
                  ? `Showing last-known usage${De === "persisted" ? asOfSuffix(de, date) : ""}${usageWithModelScopes.rateLimitedVia !== null ? ` (${describeRateLimitWait(usageWithModelScopes.heldUntilMs)})` : " (could not refresh)"}`
                  : usageWithModelScopes.rateLimitedVia !== null
                    ? `${hasModelScopedLimit(usageWithModelScopes.utilization.limits) ? "Partial usage data" : "Per-model breakdown unavailable"} (${describeRateLimitWait(usageWithModelScopes.heldUntilMs)})`
                    : "Could not refresh usage data",
            };
          });
          logFeatureSad(
            "usage_plan_limits",
            usageWithModelScopes.rateLimitedVia === null
              ? "refresh_failed_seeded"
              : usageWithModelScopes.rateLimitedVia === "envelope"
                ? "rate_limited_seeded_envelope"
                : "rate_limited_seeded_http_429",
          );
          break J;
        }
        case "unavailable": {
          if (usageWithModelScopes.rateLimitedVia !== null) {
            K(
              usageWithModelScopes.heldUntilMs === undefined
                ? "Claude is temporarily limiting requests to the usage page (not your usage limit). Try again in a moment."
                : `Usage endpoint is ${describeRateLimitWait(usageWithModelScopes.heldUntilMs)}.`,
            );
            logFeatureBad(
              "usage_plan_limits",
              usageWithModelScopes.rateLimitedVia === "envelope"
                ? "rate_limited_envelope"
                : "rate_limited_http_429",
            );
          } else {
            K(
              usageWithModelScopes.responseBody
                ? `${USAGE_LOAD_FAILED_TEXT}: ${usageWithModelScopes.responseBody}`
                : USAGE_LOAD_FAILED_TEXT,
            );
            logFeatureBad("usage_plan_limits", "load_failed");
          }
        }
      }
      ne(false);
    };
    p[7] = credentials;
    p[8] = storageV5;
    p[9] = V;
  } else V = p[9];
  let ve = V;
  let pe;
  let Ce;
  if (p[10] !== ve) {
    pe = () => {
      ve();
    };
    Ce = [ve];
    p[10] = ve;
    p[11] = pe;
    p[12] = Ce;
  } else {
    pe = p[11];
    Ce = p[12];
  }
  P(pe, Ce);
  let He;
  if (p[13] !== ve) {
    He = () => {
      ve();
    };
    p[13] = ve;
    p[14] = He;
  } else He = p[14];
  const isActive = (!!H || !!enrichError) && !ee;
  let Oe;
  if (p[15] !== isActive) {
    Oe = {
      context: "Settings",
      isActive,
    };
    p[15] = isActive;
    p[16] = Oe;
  } else Oe = p[16];
  useKeybinding("settings:retry", He, Oe);
  if (H) {
    let Ve;
    if (p[17] !== H) {
      Ve = jsxProd_default_2(Text, {
        color: "error",
        children: ["Error: ", H],
      });
      p[17] = H;
      p[18] = Ve;
    } else Ve = p[18];
    let ke;
    if (p[19] === MEMO_CACHE_SENTINEL) {
      ke = jsxProd_default(Text, {
        dimColor: true,
        italic: false,
        children: jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(ConfigurableShortcutHint, {
              action: "settings:retry",
              context: "Settings",
              fallback: "r",
              description: "retry",
              ...D,
            }),
            jsxProd_default(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "cancel",
              ...D,
            }),
          ],
        }),
      });
      p[19] = ke;
    } else ke = p[19];
    let Ue;
    if (p[20] !== Ve) {
      Ue = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [Ve, ke],
      });
      p[20] = Ve;
      p[21] = Ue;
    } else Ue = p[21];
    return Ue;
  }
  if (!utilization) {
    let Ve;
    if (p[22] === MEMO_CACHE_SENTINEL) {
      Ve = jsxProd_default(Text, {
        dimColor: true,
        children: "Loading usage data\u2026",
      });
      p[22] = Ve;
    } else Ve = p[22];
    let ke;
    if (p[23] === MEMO_CACHE_SENTINEL) {
      ke = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          Ve,
          jsxProd_default(Text, {
            dimColor: true,
            italic: false,
            children: jsxProd_default(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "cancel",
              ...D,
            }),
          }),
        ],
      });
      p[23] = ke;
    } else ke = p[23];
    return ke;
  }
  let Ve;
  if (p[24] === MEMO_CACHE_SENTINEL) {
    Ve = getSubscriptionType();
    p[24] = Ve;
  } else Ve = p[24];
  let Ie = Ve;
  let ye = Ie === "max" || Ie === "team" || Ie === null;
  let We;
  let flexDirection;
  let gap;
  let _e;
  if (
    p[25] !== maxWidth ||
    p[26] !== utilization.five_hour ||
    p[27] !== utilization.limits ||
    p[28] !== utilization.seven_day ||
    p[29] !== utilization.seven_day_sonnet
  ) {
    let Ne = rateLimitPromoNotices();
    let st = (at) => Ne.filter((ot) => ot.bar.toLowerCase() === at.toLowerCase()).map(toUsageNoticeRow);
    let et = [
      {
        bar: "five_hour",
        title: "Current session",
        limit: utilization.five_hour,
        alwaysShowDateInReset: false,
      },
      {
        bar: "seven_day",
        title: "Current week (all models)",
        limit: utilization.seven_day,
        alwaysShowDateInReset: true,
      },
      ...(ye
        ? [
            {
              bar: "seven_day_sonnet",
              title: "Current week (Sonnet only)",
              limit: utilization.seven_day_sonnet,
              alwaysShowDateInReset: true,
            },
          ]
        : []),
      ...modelScopedWeeklyRows(utilization.limits, overageIncludedModels()).map(toLimitBarSpec),
    ];
    We = Box;
    flexDirection = "column";
    gap = 1;
    _e = et.map((Ge) => {
      let { bar, title, limit, alwaysShowDateInReset } = Ge;
      return (
        limit &&
        jsxProd_default(
          LimitBar,
          {
            title,
            limit,
            maxWidth,
            alwaysShowDateInReset,
            trailingLines: st(bar),
          },
          title,
        )
      );
    });
    p[25] = maxWidth;
    p[26] = utilization.five_hour;
    p[27] = utilization.limits;
    p[28] = utilization.seven_day;
    p[29] = utilization.seven_day_sonnet;
    p[30] = We;
    p[31] = flexDirection;
    p[32] = gap;
    p[33] = _e;
  } else {
    We = p[30];
    flexDirection = p[31];
    gap = p[32];
    _e = p[33];
  }
  let Ge;
  if (p[34] !== maxWidth || p[35] !== utilization.cinder_cove) {
    Ge =
      utilization.cinder_cove &&
      jsxProd_default(LimitBar, {
        title: "Claude Code and Cowork credit",
        limit: utilization.cinder_cove,
        maxWidth,
        subtextOverride: creditExpiryLabel(utilization.cinder_cove.resets_at),
      });
    p[34] = maxWidth;
    p[35] = utilization.cinder_cove;
    p[36] = Ge;
  } else Ge = p[36];
  let Ze;
  if (p[37] !== maxWidth || p[38] !== utilization.wattle_ember) {
    Ze =
      utilization.wattle_ember &&
      jsxProd_default(LimitBar, {
        title: utilization.wattle_ember.label || "Credit",
        limit: utilization.wattle_ember,
        maxWidth,
        subtextOverride: formatCreditLine(utilization.wattle_ember),
        trailingLines: formatFableCredit(utilization.wattle_ember),
      });
    p[37] = maxWidth;
    p[38] = utilization.wattle_ember;
    p[39] = Ze;
  } else Ze = p[39];
  let Xe;
  if (p[40] !== maxWidth) {
    Xe = jsxProd_default(FeedColumn, {
      maxWidth,
    });
    p[40] = maxWidth;
    p[41] = Xe;
  } else Xe = p[41];
  let tt;
  if (p[42] !== maxWidth || p[43] !== utilization.extra_usage) {
    tt =
      utilization.extra_usage &&
      jsxProd_default(ExtraUsageSection, {
        extraUsage: utilization.extra_usage,
        maxWidth,
      });
    p[42] = maxWidth;
    p[43] = utilization.extra_usage;
    p[44] = tt;
  } else tt = p[44];
  let mn;
  if (p[45] !== enrichError) {
    mn =
      enrichError &&
      jsxProd_default(Text, {
        dimColor: true,
        children: enrichError,
      });
    p[45] = enrichError;
    p[46] = mn;
  } else mn = p[46];
  let fn;
  if (p[47] !== enrichError || p[48] !== ee) {
    fn =
      ee &&
      !enrichError &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "Refreshing\u2026",
      });
    p[47] = enrichError;
    p[48] = ee;
    p[49] = fn;
  } else fn = p[49];
  let Yt;
  if (p[50] !== enrichError) {
    Yt =
      enrichError &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "settings:retry",
        context: "Settings",
        fallback: "r",
        description: "retry",
        ...D,
      });
    p[50] = enrichError;
    p[51] = Yt;
  } else Yt = p[51];
  let _n;
  if (p[52] === MEMO_CACHE_SENTINEL) {
    _n = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Settings",
      fallback: "Esc",
      description: "cancel",
      ...D,
    });
    p[52] = _n;
  } else _n = p[52];
  let Qt;
  if (p[53] !== Yt) {
    Qt = jsxProd_default(Text, {
      dimColor: true,
      italic: false,
      children: jsxProd_default_2(Byline, {
        children: [Yt, _n],
      }),
    });
    p[53] = Yt;
    p[54] = Qt;
  } else Qt = p[54];
  let ps;
  if (
    p[55] !== We ||
    p[56] !== flexDirection ||
    p[57] !== gap ||
    p[58] !== _e ||
    p[59] !== Ge ||
    p[60] !== Ze ||
    p[61] !== Xe ||
    p[62] !== tt ||
    p[63] !== mn ||
    p[64] !== fn ||
    p[65] !== Qt
  ) {
    ps = jsxProd_default_2(We, {
      flexDirection,
      gap,
      children: [_e, Ge, Ze, Xe, tt, mn, fn, Qt],
    });
    p[55] = We;
    p[56] = flexDirection;
    p[57] = gap;
    p[58] = _e;
    p[59] = Ge;
    p[60] = Ze;
    p[61] = Xe;
    p[62] = tt;
    p[63] = mn;
    p[64] = fn;
    p[65] = Qt;
    p[66] = ps;
  } else ps = p[66];
  return ps;
}
//@ chunk-9h8dr0qb.js:65969-65992 layout
var USAGE_CREDITS_LABEL = "Usage credits";
//@ chunk-9h8dr0qb.js:65992-67685 fingerprint = ExtraUsageSection (0.698)
function ExtraUsageSection(props) {
  let $ = w(27);
  let { extraUsage, maxWidth } = props;
  let subscriptionType = getSubscriptionType();
  let D = subscriptionType === "pro" || subscriptionType === "max";
  if (!D && !(subscriptionType === "team" || subscriptionType === "enterprise")) {
    return null;
  }
  if (!extraUsage.is_enabled) {
    if (D && usageCreditsCommand.isEnabled()) {
      let t1;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        t1 = jsxProd_default(Title, {
          subtitle: "Usage credits are off \xB7 /usage-credits to turn them on",
          children: USAGE_CREDITS_LABEL,
        });
        $[0] = t1;
      } else t1 = $[0];
      return t1;
    }
    return null;
  }
  let currency = extraUsage.currency ?? "USD";
  if (extraUsage.monthly_limit === null) {
    if (D) {
      let t1;
      if ($[1] === MEMO_CACHE_SENTINEL) {
        t1 = jsxProd_default(Title, {
          subtitle: "Unlimited",
          children: USAGE_CREDITS_LABEL,
        });
        $[1] = t1;
      } else t1 = $[1];
      return t1;
    }
    if (typeof extraUsage.used_credits !== "number") {
      return null;
    }
    let A;
    if ($[2] !== currency || $[3] !== extraUsage.used_credits) {
      A = formatCurrency(extraUsage.used_credits, currency);
      $[2] = currency;
      $[3] = extraUsage.used_credits;
      $[4] = A;
    } else A = $[4];
    const subtitle = `${A} spent`;
    let U;
    if ($[5] !== subtitle) {
      U = jsxProd_default(Title, {
        subtitle,
        children: USAGE_CREDITS_LABEL,
      });
      $[5] = subtitle;
      $[6] = U;
    } else U = $[6];
    return U;
  }
  if (typeof extraUsage.used_credits !== "number") {
    return null;
  }
  let W =
    extraUsage.utilization ??
    (extraUsage.monthly_limit > 0
      ? Math.max(0, Math.min(100, (extraUsage.used_credits / extraUsage.monthly_limit) * 100))
      : 100);
  let A;
  if ($[7] !== currency || $[8] !== extraUsage.used_credits) {
    A = formatCurrency(extraUsage.used_credits, currency);
    $[7] = currency;
    $[8] = extraUsage.used_credits;
    $[9] = A;
  } else A = $[9];
  let M = A;
  let F;
  if ($[10] !== currency || $[11] !== extraUsage.monthly_limit) {
    F = formatCurrency(extraUsage.monthly_limit, currency);
    $[10] = currency;
    $[11] = extraUsage.monthly_limit;
    $[12] = F;
  } else F = $[12];
  let formattedMonthlyLimit = F;
  let H;
  let utilization;
  let resetsAt;
  let title;
  if ($[13] !== W) {
    let now = new Date();
    let oneMonthReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    H = LimitBar;
    title = USAGE_CREDITS_LABEL;
    utilization = W;
    resetsAt = oneMonthReset.toISOString();
    $[13] = W;
    $[14] = H;
    $[15] = utilization;
    $[16] = resetsAt;
    $[17] = title;
  } else {
    H = $[14];
    utilization = $[15];
    resetsAt = $[16];
    title = $[17];
  }
  let limit;
  if ($[18] !== utilization || $[19] !== resetsAt) {
    limit = {
      utilization,
      resets_at: resetsAt,
    };
    $[18] = utilization;
    $[19] = resetsAt;
    $[20] = limit;
  } else limit = $[20];
  const extraSubtext = `${M} / ${formattedMonthlyLimit} spent`;
  let t10;
  if ($[21] !== H || $[22] !== maxWidth || $[23] !== title || $[24] !== limit || $[25] !== extraSubtext) {
    t10 = jsxProd_default(H, {
      title,
      limit,
      showTimeInReset: false,
      alwaysShowDateInReset: true,
      extraSubtext,
      maxWidth,
    });
    $[21] = H;
    $[22] = maxWidth;
    $[23] = title;
    $[24] = limit;
    $[25] = extraSubtext;
    $[26] = t10;
  } else t10 = $[26];
  return t10;
}
//@ chunk-9h8dr0qb.js:67685-67776 placement = formatPeakDay (0.789)
function formatPeakDay(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}
//@ chunk-9h8dr0qb.js:67776-68119 placement
function formatCreditLine(wattleEmber) {
  let u = [];
  if (wattleEmber.limit_dollars != null) {
    let p = formatUsageUSD(wattleEmber.used_dollars ?? 0);
    let h = formatUsageUSD(wattleEmber.limit_dollars);
    u.push(`${p} of ${h} used`);
  }
  if (wattleEmber.resets_at) {
    let p = formatResetText(wattleEmber.resets_at, true, true, true);
    let periods = wattleEmber.periods ?? [];
    let endsAt = periods.length >= 2 ? periods.at(-1)?.ends_at : undefined;
    let E = endsAt != null && Date.parse(wattleEmber.resets_at) < Date.parse(endsAt);
    u.push(E ? `Resets ${p}` : `Expires ${p}`);
  }
  return u.join(" \xB7 ");
}
//@ chunk-9h8dr0qb.js:68119-68564 placement
function formatFableCredit(wattleEmber) {
  let periods = Array.isArray(wattleEmber.periods) ? wattleEmber.periods : [];
  let [p, h] = periods;
  if (
    periods.length !== 2 ||
    p == null ||
    h == null ||
    wattleEmber.limit_dollars == null ||
    [p.starts_at, p.ends_at, h.ends_at].some((v) => typeof v !== "string" || Number.isNaN(Date.parse(v)))
  )
    return [];
  let D = formatUsageUSD(wattleEmber.limit_dollars);
  let E = formatPeakDay(p.starts_at);
  let T = formatPeakDay(p.ends_at);
  let A = formatPeakDay(h.ends_at);
  return [
    {
      text: `You have ${D} USD of Fable usage for each of two periods: ${E} to ${T}, and ${T} to ${A}. Unused credit doesn't carry over.`,
    },
  ];
}
//@ chunk-9h8dr0qb.js:68564-68646 placement
function creditExpiryLabel(resetsAt) {
  return resetsAt ? `One-time credit \xB7 Expires ${formatPeakDay(resetsAt)}` : "One-time credit";
}
//@ chunk-9h8dr0qb.js:68646-68732 placement
function formatUsageUSD(limitDollars) {
  return formatCurrency(
    Math.round(limitDollars * 100),
    "USD",
    Number.isInteger(limitDollars) ? "fit" : "precise",
  );
}
//@ chunk-9h8dr0qb.js:68732-68750 placement
var usageRefreshSignal = Re(require_asciichart(), 1);
//@ chunk-9h8dr0qb.js:68750-68754 placement
init_react_production();
//@ chunk-9689amr8.js:12028-12675 fingerprint = Usage (0.427)
/**
 * /usage：当前会话与本周用量条（全部模型/Sonnet/Opus）、重置时间，团队/企业的额外用量区。
 */
function Usage(a) {
  let { rate_limits: rateLimits, subscription_type: subscriptionType } = a;
  if (!rateLimits) return null;
  let i = subscriptionType === "max" || subscriptionType === "team" || subscriptionType === null;
  let s = [
    {
      title: "Current session",
      limit: rateLimits.five_hour,
    },
    {
      title: "Current week (all models)",
      limit: rateLimits.seven_day,
    },
    ...(i
      ? [
          {
            title: "Current week (Sonnet only)",
            limit: rateLimits.seven_day_sonnet,
          },
        ]
      : []),
    ...(rateLimits.model_scoped ?? []).map((n) => ({
      title: `Current week (${n.display_name})`,
      limit: {
        utilization: n.utilization,
        resets_at: n.resets_at,
      },
    })),
  ];
  let o = [];
  for (let { title, limit } of s) {
    if (!limit || limit.utilization === null) continue;
    let responseBody = limit.resets_at
      ? ` \xB7 resets ${formatResetText(limit.resets_at, true, true, true)}`
      : "";
    o.push(`${title}: ${Math.floor(limit.utilization)}% used${responseBody}`);
  }
  return o.length > 0
    ? o.join(`
`)
    : null;
}
export { usageRefreshSignal, Usage, UsageAttributionView, renderGatewayUsageNotice, applyUsageFix };
