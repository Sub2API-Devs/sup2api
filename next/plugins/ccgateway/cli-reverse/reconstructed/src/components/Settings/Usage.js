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
import { formatResetText, formatTokens, formatRelativeTimeAgo, formatResetTime } from "../../utils/format.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState, useAppStateSession } from "../../state/AppState.js";
import { selectPluginCommands } from "../../commands/plugin/PluginSettings.js";
import { selectMcpCommands } from "./Status.js";
import { useMainLoopModelSetting, useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { pluginSkillBudgetUsage } from "../../utils/plugins/pluginSkillBudget.js";
import { bytesPerTokenForModel } from "../../utils/model/modelDisplay.js";
import { MEMO_CACHE_SENTINEL, __toESM } from "../../../runtime/bun-runtime.js";
import {
  init_react_production,
  createContext,
  useContext,
  useState,
  suspenseTypeExport,
  use,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-9689amr8.js:12028-12675 fingerprint (2.1.88 match: Usage, 0.427)
/**
 * /usage：当前会话与本周用量条（全部模型/Sonnet/Opus）、重置时间，团队/企业的额外用量区。
 */
function Usage(usage) {
  let { rate_limits: rateLimits, subscription_type: subscriptionType } = usage;
  if (!rateLimits) return null;
  let showSonnetWeek = subscriptionType === "max" || subscriptionType === "team" || subscriptionType === null;
  let bars = [
    {
      title: "Current session",
      limit: rateLimits.five_hour,
    },
    {
      title: "Current week (all models)",
      limit: rateLimits.seven_day,
    },
    ...(showSonnetWeek
      ? [
          {
            title: "Current week (Sonnet only)",
            limit: rateLimits.seven_day_sonnet,
          },
        ]
      : []),
    ...(rateLimits.model_scoped ?? []).map((modelScope) => ({
      title: `Current week (${modelScope.display_name})`,
      limit: {
        utilization: modelScope.utilization,
        resets_at: modelScope.resets_at,
      },
    })),
  ];
  let lines = [];
  for (let { title, limit } of bars) {
    if (!limit || limit.utilization === null) continue;
    let responseBody = limit.resets_at
      ? ` \xB7 resets ${formatResetText(limit.resets_at, true, true, true)}`
      : "";
    lines.push(`${title}: ${Math.floor(limit.utilization)}% used${responseBody}`);
  }
  return lines.length > 0
    ? lines.join(`
`)
    : null;
}
//@ chunk-9h8dr0qb.js:42676-42716 placement
function selectMainLoopModel(state) {
  return state.mainLoopModel;
}
//@ chunk-9h8dr0qb.js:42716-42972 placement
function renderPluginSkillTokensRow(plugin) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "row",
      children: [
        jsxProd_default(Box, {
          width: 28,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: plugin.pluginName,
          }),
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            plugin.skillCount,
            " ",
            plural(plugin.skillCount, "skill"),
            " \xB7 ~",
            plugin.approxTokens,
            " ",
            "tok/turn",
          ],
        }),
      ],
    },
    plugin.pluginName,
  );
}
//@ chunk-9h8dr0qb.js:42972-44139 placement
/**
 * 显示各插件技能描述每轮占用的 token。
 */
function renderPluginSkillFootprint() {
  let $ = useMemoCache(15);
  let appState = useAppState(selectPluginCommands);
  let appState_2 = useAppState(selectMcpCommands);
  let appState_3 = useAppState(selectMainLoopModel);
  let model = useMainLoopModelSetting() ?? appState_3;
  let usage;
  if ($[0] !== appState_2 || $[1] !== model || $[2] !== appState) {
    usage = pluginSkillBudgetUsage([...appState, ...appState_2], bytesPerTokenForModel(model ?? undefined));
    $[0] = appState_2;
    $[1] = model;
    $[2] = appState;
    $[3] = usage;
  } else usage = $[3];
  let usageValue = usage;
  if (usageValue.byPlugin.length === 0) {
    return null;
  }
  let titleElement;
  let noteElement;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    titleElement = jsxProd_default(Text, {
      bold: true,
      children: "Plugin skill-listing footprint",
    });
    noteElement = jsxProd_default(Text, {
      dimColor: true,
      wrap: "wrap",
      children:
        "What each plugin's skill descriptions add to the system prompt (cached input after the first turn). Agents and MCP tools not yet counted.",
    });
    $[4] = titleElement;
    $[5] = noteElement;
  } else {
    titleElement = $[4];
    noteElement = $[5];
  }
  let pluginRows;
  if ($[6] !== usageValue.byPlugin) {
    pluginRows = usageValue.byPlugin.map(renderPluginSkillTokensRow);
    $[6] = usageValue.byPlugin;
    $[7] = pluginRows;
  } else pluginRows = $[7];
  let totalLabel;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    totalLabel = jsxProd_default(Box, {
      width: 28,
      children: jsxProd_default(Text, {
        children: "Total",
      }),
    });
    $[8] = totalLabel;
  } else totalLabel = $[8];
  const capSuffix = usageValue.overBudget
    ? " (capped at the listing budget; per-plugin figures above are pre-truncation)"
    : "";
  let totalRow;
  if ($[9] !== usageValue.totalTokens || $[10] !== capSuffix) {
    totalRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop: 1,
      children: [
        totalLabel,
        jsxProd_default_2(Text, {
          children: ["~", usageValue.totalTokens, " tok/turn", capSuffix],
        }),
      ],
    });
    $[9] = usageValue.totalTokens;
    $[10] = capSuffix;
    $[11] = totalRow;
  } else totalRow = $[11];
  let column;
  if ($[12] !== pluginRows || $[13] !== totalRow) {
    column = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        titleElement,
        noteElement,
        jsxProd_default_2(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [pluginRows, totalRow],
        }),
      ],
    });
    $[12] = pluginRows;
    $[13] = totalRow;
    $[14] = column;
  } else column = $[14];
  return column;
}
//@ chunk-9h8dr0qb.js:44139-44143 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9h8dr0qb.js:44139", () => {
  init_react_production();
});
//@ chunk-9h8dr0qb.js:44143-44147 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9h8dr0qb.js:44143", () => {
  init_react_production();
});
//@ chunk-9h8dr0qb.js:44147-44181 placement
function selectUltracode(state) {
  return state.ultracode;
}
//@ chunk-9h8dr0qb.js:44181-44389 placement
function renderUsageShareRow(row) {
  return jsxProd_default_2(
    Box,
    {
      children: [
        jsxProd_default(Box, {
          width: USAGE_EVIDENCE_WINDOW_DAYS,
          flexShrink: 0,
          children: jsxProd_default_2(Text, {
            children: [row.pct, "%"],
          }),
        }),
        jsxProd_default_2(Text, {
          wrap: "wrap",
          children: [
            row.title,
            row.detail &&
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [" \xB7 ", row.detail],
              }),
          ],
        }),
      ],
    },
    row.key,
  );
}
//@ chunk-9h8dr0qb.js:44389-44405 placement
var usageDataSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9h8dr0qb.js:44389", () => {
  usageDataSlot = createContext(null);
});
//@ chunk-9h8dr0qb.js:44405-44433 placement
function useUsageData() {
  return useContext(usageDataSlot);
}
//@ chunk-9h8dr0qb.js:44433-45315 placement
/**
 * 执行用量修复建议（Remote Control 下不可用）。
 */
function applyUsageFix(props) {
  let $ = useMemoCache(18);
  let { onClose, children } = props;
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let appStateSession = useAppStateSession();
  const mainLoopModel = useMainLoopModel();
  const sessionEffort = useQueuedMessageText();
  const context = useAppState(selectUltracode);
  let effortBelowMax;
  if ($[0] !== mainLoopModel || $[1] !== sessionEffort || $[2] !== context) {
    effortBelowMax = effortBelowMaxSaved(mainLoopModel, sessionEffort, context);
    $[0] = mainLoopModel;
    $[1] = sessionEffort;
    $[2] = context;
    $[3] = effortBelowMax;
  } else effortBelowMax = $[3];
  let {
    effortBelowMax: effortBelowMax_2,
    isEffortBelowMaxSaved,
    isEffortSwitchFree,
    isUltracodeOn,
  } = effortBelowMax;
  let noticeElement;
  if ($[4] !== appStateSession) {
    noticeElement = isRemoteSessionAvailable() || isBridgeOrTransport(appStateSession);
    $[4] = appStateSession;
    $[5] = noticeElement;
  } else noticeElement = $[5];
  let noticeNode = noticeElement;
  let noticeBody;
  if (
    $[6] !== effortBelowMax_2 ||
    $[7] !== isEffortBelowMaxSaved ||
    $[8] !== isEffortSwitchFree ||
    $[9] !== isUltracodeOn ||
    $[10] !== noticeNode ||
    $[11] !== onClose ||
    $[12] !== commandQueueOrDefault ||
    $[13] !== appStateSession
  ) {
    noticeBody = noticeNode
      ? null
      : {
          live: {
            effortBelowMax: effortBelowMax_2,
            isEffortBelowMaxSaved,
            isEffortSwitchFree,
            isUltracodeOn,
          },
          send: (send) => {
            if (isBridgeOrTransport(appStateSession)) {
              onClose("Nothing was sent. Turn off Remote Control to use fixes.", {
                display: "system",
              });
              return;
            }
            enqueueContinuationMessages(commandQueueOrDefault, send);
            logFeatureOk("usage_fix");
            onClose(undefined, {
              display: "skip",
            });
          },
        };
    $[6] = effortBelowMax_2;
    $[7] = isEffortBelowMaxSaved;
    $[8] = isEffortSwitchFree;
    $[9] = isUltracodeOn;
    $[10] = noticeNode;
    $[11] = onClose;
    $[12] = commandQueueOrDefault;
    $[13] = appStateSession;
    $[14] = noticeBody;
  } else noticeBody = $[14];
  let value = noticeBody;
  let usageDataSlotElement;
  if ($[15] !== children || $[16] !== value) {
    usageDataSlotElement = jsxProd_default(usageDataSlot.Provider, {
      value,
      children,
    });
    $[15] = children;
    $[16] = value;
    $[17] = usageDataSlotElement;
  } else usageDataSlotElement = $[17];
  return usageDataSlotElement;
}
//@ chunk-9h8dr0qb.js:45315-45324 placement
var USAGE_EVIDENCE_WINDOW_DAYS = 5;
//@ chunk-9h8dr0qb.js:45324-45836 placement
function renderFixUsageButton(props) {
  let $ = useMemoCache(10);
  let { recommendations, fix, maxWidth } = props;
  let usageData = useUsageData();
  let [isSending, setIsSending] = useState(false);
  let keybindings;
  if ($[0] !== fix || $[1] !== usageData) {
    keybindings = {
      "settings:fixUsage": () => {
        if (fix) {
          setIsSending(true);
          usageData?.send(fix);
        }
      },
    };
    $[0] = fix;
    $[1] = usageData;
    $[2] = keybindings;
  } else keybindings = $[2];
  const isActive = fix !== undefined && !isSending;
  let buttonElement;
  if ($[3] !== isActive) {
    buttonElement = {
      context: "Settings",
      isActive,
    };
    $[3] = isActive;
    $[4] = buttonElement;
  } else buttonElement = $[4];
  MessageActionsKeybindings(keybindings, buttonElement);
  if (recommendations.length === 0) {
    return null;
  }
  let children;
  if ($[5] !== recommendations) {
    children = recommendations.map(renderUsageShareRow);
    $[5] = recommendations;
    $[6] = children;
  } else children = $[6];
  let boxElement;
  if ($[7] !== maxWidth || $[8] !== children) {
    boxElement = jsxProd_default(Box, {
      flexDirection: "column",
      maxWidth,
      children,
    });
    $[7] = maxWidth;
    $[8] = children;
    $[9] = boxElement;
  } else boxElement = $[9];
  return boxElement;
}
//@ chunk-9h8dr0qb.js:45836-45912 placement
function resetUsageData(error) {
  logError(error);
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
function slashLabel(commandName) {
  return `/${commandName}`;
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
  let $ = useMemoCache(14);
  let { maxWidth } = props;
  let { storageV5 } = useTheme_2();
  let [scanAllowed] = useState(isUsageScanAllowed);
  let scanEffect;
  if ($[0] !== storageV5 || $[1] !== scanAllowed.allowed) {
    scanEffect = () =>
      scanAllowed.allowed ? collectUsageRecommendations(storageV5).catch(resetUsageData) : null;
    $[0] = storageV5;
    $[1] = scanAllowed.allowed;
    $[2] = scanEffect;
  } else scanEffect = $[2];
  let [recommendations] = useState(scanEffect);
  if (recommendations === null || !scanAllowed.allowed) {
    let blockedAttributionHeader;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      blockedAttributionHeader = jsxProd_default(renderAttributionHeader, {
        withSubtitle: false,
      });
      $[3] = blockedAttributionHeader;
    } else blockedAttributionHeader = $[3];
    const children = scanAllowed.allowed ? null : scanAllowed.reason;
    let children_2;
    if ($[4] !== children) {
      children_2 = jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children,
      });
      $[4] = children;
      $[5] = children_2;
    } else children_2 = $[5];
    let blockedNoticeBox;
    if ($[6] !== maxWidth || $[7] !== children_2) {
      blockedNoticeBox = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          blockedAttributionHeader,
          jsxProd_default(Box, {
            marginTop: 1,
            maxWidth,
            children: children_2,
          }),
        ],
      });
      $[6] = maxWidth;
      $[7] = children_2;
      $[8] = blockedNoticeBox;
    } else blockedNoticeBox = $[8];
    return blockedNoticeBox;
  }
  let attributionHeader;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    attributionHeader = jsxProd_default(renderAttributionHeader, {});
    $[9] = attributionHeader;
  } else attributionHeader = $[9];
  let usageColumnBox;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    usageColumnBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        attributionHeader,
        jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: "Scanning local sessions\u2026",
          }),
        }),
      ],
    });
    $[10] = usageColumnBox;
  } else usageColumnBox = $[10];
  let fallback = usageColumnBox;
  let foElement;
  if ($[11] !== maxWidth || $[12] !== recommendations) {
    foElement = jsxProd_default(suspenseTypeExport, {
      fallback,
      children: jsxProd_default(renderAttributionPeriod, {
        maxWidth,
        scanPromise: recommendations,
      }),
    });
    $[11] = maxWidth;
    $[12] = recommendations;
    $[13] = foElement;
  } else foElement = $[13];
  return foElement;
}
//@ chunk-9h8dr0qb.js:47126-47229 placement
function getSignificantBehaviors(usage) {
  if (usage.totalCost === 0) return [];
  return usage.behaviors.filter(
    (behavior) => (behavior.cost / usage.totalCost) * 100 >= MIN_RECOMMENDATION_PCT,
  );
}
//@ chunk-9h8dr0qb.js:47229-47349 placement
function hasUsageBreakdownEntries(state) {
  return (
    state.agents.length > 0 ||
    state.skills.length > 0 ||
    state.plugins.length > 0 ||
    state.mcpServers.length > 0 ||
    state.loops.length > 0
  );
}
//@ chunk-9h8dr0qb.js:47349-50015 placement
function renderAttributionPeriod(props) {
  let $ = useMemoCache(36);
  let { maxWidth, scanPromise } = props;
  let emptyProps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    emptyProps = stableEmptyObject(false);
    $[0] = emptyProps;
  } else emptyProps = $[0];
  let hintFormat = emptyProps;
  let scan = use(scanPromise);
  let [period, setPeriod] = useState("day");
  let usageData = useUsageData();
  let hasDayData;
  if ($[1] !== scan.day) {
    hasDayData = getSignificantBehaviors(scan.day).length > 0 || hasUsageBreakdownEntries(scan.day);
    $[1] = scan.day;
    $[2] = hasDayData;
  } else hasDayData = $[2];
  let hasDay = hasDayData;
  let hasWeek;
  if ($[3] !== scan.week) {
    hasWeek = getSignificantBehaviors(scan.week).length > 0 || hasUsageBreakdownEntries(scan.week);
    $[3] = scan.week;
    $[4] = hasWeek;
  } else hasWeek = $[4];
  let hasWeek_2 = hasWeek;
  let isActive = hasDay || hasWeek_2;
  let keyActions;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    keyActions = {
      "settings:periodDay": () => setPeriod("day"),
      "settings:periodWeek": () => setPeriod("week"),
    };
    $[5] = keyActions;
  } else keyActions = $[5];
  let keyOptions;
  if ($[6] !== isActive) {
    keyOptions = {
      context: "Settings",
      isActive,
    };
    $[6] = isActive;
    $[7] = keyOptions;
  } else keyOptions = $[7];
  MessageActionsKeybindings(keyActions, keyOptions);
  if (!hasDay && !hasWeek_2) {
    return null;
  }
  let periodData = period === "day" ? scan.day : scan.week;
  let behaviors;
  if ($[8] !== periodData) {
    behaviors = getSignificantBehaviors(periodData);
    $[8] = periodData;
    $[9] = behaviors;
  } else behaviors = $[9];
  let behaviors_2 = behaviors;
  let costliest;
  let fixAction;
  if ($[10] !== usageData || $[11] !== period || $[12] !== scan.evidence || $[13] !== periodData) {
    costliest = costliestBehavior(periodData, scan.evidence[period], usageData?.live);
    fixAction = usageData ? usageRecommendationAction(costliest) : undefined;
    $[10] = usageData;
    $[11] = period;
    $[12] = scan.evidence;
    $[13] = periodData;
    $[14] = costliest;
    $[15] = fixAction;
  } else {
    costliest = $[14];
    fixAction = $[15];
  }
  let fixAction_2 = fixAction;
  let header;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    header = jsxProd_default(renderAttributionHeader, {});
    $[16] = header;
  } else header = $[16];
  const windowLabel = period === "day" ? "24h" : "7d";
  let windowLine;
  if ($[17] !== windowLabel) {
    windowLine = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "wrap",
        children: ["Last ", windowLabel, " \xB7 shares overlap"],
      }),
    });
    $[17] = windowLabel;
    $[18] = windowLine;
  } else windowLine = $[18];
  let bodyBox;
  if (
    $[19] !== fixAction_2 ||
    $[20] !== maxWidth ||
    $[21] !== costliest ||
    $[22] !== behaviors_2.length ||
    $[23] !== periodData
  ) {
    bodyBox = jsxProd_default(Box, {
      marginTop: 1,
      flexDirection: "column",
      gap: 1,
      children:
        behaviors_2.length === 0 && !hasUsageBreakdownEntries(periodData)
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
                  recommendations: costliest,
                  fix: fixAction_2,
                  maxWidth,
                }),
                !hasUsageBreakdownEntries(periodData)
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
                          rows: periodData.skills,
                          label: slashLabel,
                        }),
                        jsxProd_default(renderAttributionRows, {
                          title: "Subagents",
                          rows: periodData.agents,
                        }),
                        jsxProd_default(renderAttributionRows, {
                          title: "Plugins",
                          rows: periodData.plugins,
                        }),
                        jsxProd_default(renderAttributionRows, {
                          title: "MCP servers",
                          rows: periodData.mcpServers,
                        }),
                        jsxProd_default(renderLoopsAttribution, {
                          rows: periodData.loops,
                          maxWidth,
                        }),
                      ],
                    }),
              ],
            }),
    });
    $[19] = fixAction_2;
    $[20] = maxWidth;
    $[21] = costliest;
    $[22] = behaviors_2.length;
    $[23] = periodData;
    $[24] = bodyBox;
  } else bodyBox = $[24];
  let fixHint;
  if ($[25] !== fixAction_2 || $[26] !== costliest) {
    fixHint =
      fixAction_2 &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "settings:fixUsage",
        context: "Settings",
        fallback: "f",
        description: formatFixCountLabel(fixAction_2.keys.length, costliest.length),
        ...hintFormat,
      });
    $[25] = fixAction_2;
    $[26] = costliest;
    $[27] = fixHint;
  } else fixHint = $[27];
  let dayHint;
  let weekHint;
  if ($[28] === MEMO_CACHE_SENTINEL) {
    dayHint = jsxProd_default(ConfigurableShortcutHint, {
      action: "settings:periodDay",
      context: "Settings",
      fallback: "d",
      description: "day",
      ...hintFormat,
    });
    weekHint = jsxProd_default(ConfigurableShortcutHint, {
      action: "settings:periodWeek",
      context: "Settings",
      fallback: "w",
      description: "week",
      ...hintFormat,
    });
    $[28] = dayHint;
    $[29] = weekHint;
  } else {
    dayHint = $[28];
    weekHint = $[29];
  }
  let hintsBox;
  if ($[30] !== fixHint) {
    hintsBox = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        italic: false,
        children: jsxProd_default_2(Byline, {
          children: [fixHint, dayHint, weekHint],
        }),
      }),
    });
    $[30] = fixHint;
    $[31] = hintsBox;
  } else hintsBox = $[31];
  let content;
  if ($[32] !== windowLine || $[33] !== bodyBox || $[34] !== hintsBox) {
    content = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [header, windowLine, bodyBox, hintsBox],
    });
    $[32] = windowLine;
    $[33] = bodyBox;
    $[34] = hintsBox;
    $[35] = content;
  } else content = $[35];
  return content;
}
//@ chunk-9h8dr0qb.js:50015-50120 placement
function formatFixCountLabel(index, total) {
  if (index < total) return `fix ${index} of ${total}`;
  return index === 1 ? "fix this" : index === 2 ? "fix both" : `fix all ${index}`;
}
//@ chunk-9h8dr0qb.js:50120-50529 placement
function renderAttributionHeader(props) {
  let $ = useMemoCache(5);
  let { withSubtitle } = props;
  let subtitleFlag = withSubtitle === undefined ? true : withSubtitle;
  let textElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default(Text, {
      bold: true,
      wrap: "wrap",
      children: "What's contributing to your usage?",
    });
    $[0] = textElement;
  } else textElement = $[0];
  let headerElement;
  if ($[1] !== subtitleFlag) {
    headerElement =
      subtitleFlag &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children: "Approximate \xB7 sessions on this machine only",
      });
    $[1] = subtitleFlag;
    $[2] = headerElement;
  } else headerElement = $[2];
  let boxElement;
  if ($[3] !== headerElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [textElement, headerElement],
    });
    $[3] = headerElement;
    $[4] = boxElement;
  } else boxElement = $[4];
  return boxElement;
}
//@ chunk-9h8dr0qb.js:50529-51614 placement
function renderAttributionRows(props) {
  let $ = useMemoCache(23);
  let { title, rows, label } = props;
  if (rows.length === 0) {
    return null;
  }
  let containerComponent;
  let flexDirection;
  let boxElement;
  let rowElements;
  let hiddenCount;
  if ($[0] !== label || $[1] !== rows || $[2] !== title) {
    let sliced = rows.slice(0, USAGE_LIST_MAX_ROWS);
    hiddenCount = rows.length - USAGE_LIST_MAX_ROWS;
    containerComponent = Box;
    flexDirection = "column";
    let titleElement;
    if ($[8] !== title) {
      titleElement = jsxProd_default(Text, {
        children: title,
      });
      $[8] = title;
      $[9] = titleElement;
    } else titleElement = $[9];
    let percentHeader;
    if ($[10] === MEMO_CACHE_SENTINEL) {
      percentHeader = jsxProd_default(Text, {
        dimColor: true,
        children: "% of usage",
      });
      $[10] = percentHeader;
    } else percentHeader = $[10];
    if ($[11] !== titleElement) {
      boxElement = jsxProd_default_2(Box, {
        width: USAGE_NAME_COLUMN_WIDTH + PERCENT_COLUMN_WIDTH,
        justifyContent: "space-between",
        children: [titleElement, percentHeader],
      });
      $[11] = titleElement;
      $[12] = boxElement;
    } else boxElement = $[12];
    let renderRow;
    if ($[13] !== label) {
      renderRow = (row) =>
        jsxProd_default_2(
          Box,
          {
            children: [
              jsxProd_default(Box, {
                width: USAGE_NAME_COLUMN_WIDTH,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  wrap: "truncate-end",
                  children: label ? label(row.name) : row.name,
                }),
              }),
              jsxProd_default(Box, {
                width: PERCENT_COLUMN_WIDTH,
                justifyContent: "flex-end",
                children: jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [row.pct, "%"],
                }),
              }),
            ],
          },
          row.name,
        );
      $[13] = label;
      $[14] = renderRow;
    } else renderRow = $[14];
    rowElements = sliced.map(renderRow);
    $[0] = label;
    $[1] = rows;
    $[2] = title;
    $[3] = containerComponent;
    $[4] = flexDirection;
    $[5] = boxElement;
    $[6] = rowElements;
    $[7] = hiddenCount;
  } else {
    containerComponent = $[3];
    flexDirection = $[4];
    boxElement = $[5];
    rowElements = $[6];
    hiddenCount = $[7];
  }
  let moreIndicator;
  if ($[15] !== hiddenCount) {
    moreIndicator =
      hiddenCount > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["\u2026 ", hiddenCount, " more"],
      });
    $[15] = hiddenCount;
    $[16] = moreIndicator;
  } else moreIndicator = $[16];
  let containerComponentElement;
  if (
    $[17] !== containerComponent ||
    $[18] !== flexDirection ||
    $[19] !== boxElement ||
    $[20] !== rowElements ||
    $[21] !== moreIndicator
  ) {
    containerComponentElement = jsxProd_default_2(containerComponent, {
      flexDirection,
      children: [boxElement, rowElements, moreIndicator],
    });
    $[17] = containerComponent;
    $[18] = flexDirection;
    $[19] = boxElement;
    $[20] = rowElements;
    $[21] = moreIndicator;
    $[22] = containerComponentElement;
  } else containerComponentElement = $[22];
  return containerComponentElement;
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
function formatLoopSchedule(schedule) {
  if (schedule.isDynamic) return "dynamic";
  if (!schedule.cron) return "?";
  let match = schedule.cron.match(
    /^(?:(?:\*\/(\d+)|(\*)) \* \* \* \*|0 (?:\*\/(\d+)|(\*)) \* \* \*|0 0 (?:\*\/(\d+)|(\*)) \* \*|(\d{1,2}) (\d{1,2}) \* \* \*)$/,
  );
  if (match) {
    if (match[1] || match[2]) return `${match[1] ?? 1}m`;
    if (match[3] || match[4]) return `${match[3] ?? 1}h`;
    if (match[5] || match[6]) return `${match[5] ?? 1}d`;
    return `at ${match[8].padStart(2, "0")}:${match[7].padStart(2, "0")}`;
  }
  return cronToHuman(schedule.cron).toLowerCase();
}
//@ chunk-9h8dr0qb.js:52084-53661 placement
function renderLoopsAttribution(props) {
  let $ = useMemoCache(28);
  let { rows, maxWidth } = props;
  if (rows.length === 0) {
    return null;
  }
  let isWide = maxWidth >= USAGE_SHELL_ROWS;
  let headerRows = isWide ? USAGE_TOTAL_ROWS : USAGE_TOTAL_ROWS - USAGE_SECTION_TABLE_ROWS;
  let width = Math.max(12, maxWidth - headerRows);
  let containerComponent;
  let flexDirection;
  let headerRow;
  let rowElements;
  let hiddenCount;
  if ($[0] !== width || $[1] !== rows || $[2] !== isWide) {
    let sliced = rows.slice(0, USAGE_LIST_MAX_ROWS);
    hiddenCount = rows.length - USAGE_LIST_MAX_ROWS;
    let now = new Date();
    containerComponent = Box;
    flexDirection = "column";
    let children;
    if ($[8] === MEMO_CACHE_SENTINEL) {
      children = jsxProd_default(Text, {
        children: "Loops",
      });
      $[8] = children;
    } else children = $[8];
    let promptColumn;
    if ($[9] !== width) {
      promptColumn = jsxProd_default(Box, {
        width,
        children,
      });
      $[9] = width;
      $[10] = promptColumn;
    } else promptColumn = $[10];
    let runsHeader;
    let runCountHeader;
    let shareHeader;
    if ($[11] === MEMO_CACHE_SENTINEL) {
      runsHeader = jsxProd_default(RightAlignedDimText, {
        width: USAGE_SECTION_HEADER_ROWS,
        text: "every",
      });
      runCountHeader = jsxProd_default(RightAlignedDimText, {
        width: USAGE_SECTION_SPARK_ROWS,
        text: "runs",
      });
      shareHeader = jsxProd_default(RightAlignedDimText, {
        width: USAGE_SECTION_DETAIL_ROWS,
        text: "tokens",
      });
      $[11] = runsHeader;
      $[12] = runCountHeader;
      $[13] = shareHeader;
    } else {
      runsHeader = $[11];
      runCountHeader = $[12];
      shareHeader = $[13];
    }
    let perRunHeader;
    if ($[14] !== isWide) {
      perRunHeader =
        isWide &&
        jsxProd_default(RightAlignedDimText, {
          width: USAGE_SECTION_TABLE_ROWS,
          text: "per run",
        });
      $[14] = isWide;
      $[15] = perRunHeader;
    } else perRunHeader = $[15];
    let costHeader;
    if ($[16] === MEMO_CACHE_SENTINEL) {
      costHeader = jsxProd_default(RightAlignedDimText, {
        width: USAGE_SECTION_FOOTER_ROWS,
        text: "last run",
      });
      $[16] = costHeader;
    } else costHeader = $[16];
    if ($[17] !== promptColumn || $[18] !== perRunHeader) {
      headerRow = jsxProd_default_2(Box, {
        children: [promptColumn, runsHeader, runCountHeader, shareHeader, perRunHeader, costHeader],
      });
      $[17] = promptColumn;
      $[18] = perRunHeader;
      $[19] = headerRow;
    } else headerRow = $[19];
    rowElements = sliced.map((row) =>
      jsxProd_default_2(
        Box,
        {
          children: [
            jsxProd_default(Box, {
              width,
              children: jsxProd_default(Text, {
                dimColor: true,
                wrap: "truncate-end",
                children: row.prompt,
              }),
            }),
            jsxProd_default(RightAlignedDimText, {
              width: USAGE_SECTION_HEADER_ROWS,
              text: formatLoopSchedule(row),
            }),
            jsxProd_default(RightAlignedDimText, {
              width: USAGE_SECTION_SPARK_ROWS,
              text: String(row.runs),
            }),
            jsxProd_default(RightAlignedDimText, {
              width: USAGE_SECTION_DETAIL_ROWS,
              text: formatTokens(row.tokens),
            }),
            isWide &&
              jsxProd_default(RightAlignedDimText, {
                width: USAGE_SECTION_TABLE_ROWS,
                text:
                  row.runs > 0 && row.tokens > 0 ? formatTokens(Math.round(row.tokens / row.runs)) : "\u2013",
              }),
            jsxProd_default(RightAlignedDimText, {
              width: USAGE_SECTION_FOOTER_ROWS,
              text:
                row.lastRunMs > 0
                  ? formatRelativeTimeAgo(new Date(row.lastRunMs), {
                      now,
                    })
                  : "\u2013",
            }),
          ],
        },
        row.prompt,
      ),
    );
    $[0] = width;
    $[1] = rows;
    $[2] = isWide;
    $[3] = containerComponent;
    $[4] = flexDirection;
    $[5] = headerRow;
    $[6] = rowElements;
    $[7] = hiddenCount;
  } else {
    containerComponent = $[3];
    flexDirection = $[4];
    headerRow = $[5];
    rowElements = $[6];
    hiddenCount = $[7];
  }
  let moreIndicator;
  if ($[20] !== hiddenCount) {
    moreIndicator =
      hiddenCount > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["\u2026 ", hiddenCount, " more"],
      });
    $[20] = hiddenCount;
    $[21] = moreIndicator;
  } else moreIndicator = $[21];
  let containerComponentElement;
  if (
    $[22] !== containerComponent ||
    $[23] !== flexDirection ||
    $[24] !== headerRow ||
    $[25] !== rowElements ||
    $[26] !== moreIndicator
  ) {
    containerComponentElement = jsxProd_default_2(containerComponent, {
      flexDirection,
      children: [headerRow, rowElements, moreIndicator],
    });
    $[22] = containerComponent;
    $[23] = flexDirection;
    $[24] = headerRow;
    $[25] = rowElements;
    $[26] = moreIndicator;
    $[27] = containerComponentElement;
  } else containerComponentElement = $[27];
  return containerComponentElement;
}
//@ chunk-9h8dr0qb.js:53661-53922 placement
function RightAlignedDimText(props) {
  let $ = useMemoCache(5);
  let { width, text } = props;
  let children;
  if ($[0] !== text) {
    children = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children: text,
    });
    $[0] = text;
    $[1] = children;
  } else children = $[1];
  let renderCache;
  if ($[2] !== children || $[3] !== width) {
    renderCache = jsxProd_default(Box, {
      width,
      justifyContent: "flex-end",
      children,
    });
    $[2] = children;
    $[3] = width;
    $[4] = renderCache;
  } else renderCache = $[4];
  return renderCache;
}
//@ chunk-9h8dr0qb.js:53922-53937 placement
function noopUsageCallback() {}
//@ chunk-9h8dr0qb.js:53937-54010 placement
function clearEnrichError(state) {
  return state.enrichError === null
    ? state
    : {
        ...state,
        enrichError: null,
      };
}
//@ chunk-9h8dr0qb.js:54010-54064 placement
function toUsageNoticeRow(notice) {
  return {
    text: notice.text,
    color: notice.variant,
  };
}
//@ chunk-9h8dr0qb.js:54064-54177 placement
function toLimitBarSpec(limit) {
  let { title, displayName, limit: limit_2 } = limit;
  return {
    bar: displayName,
    title,
    limit: limit_2,
    alwaysShowDateInReset: true,
  };
}
//@ chunk-9h8dr0qb.js:54177-56348 fingerprint (2.1.88 match: LimitBar, 0.788)
function LimitBar(props) {
  let $ = useMemoCache(41);
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
  let showResetTime = showTimeInReset === undefined ? true : showTimeInReset;
  let showDateInReset = alwaysShowDateInReset === undefined ? false : alwaysShowDateInReset;
  let { utilization, resets_at } = limit;
  if (utilization === null) {
    return null;
  }
  let usedText = `${Math.floor(utilization)}% used`;
  let subtext;
  if (resets_at) {
    let t2;
    if ($[0] !== showDateInReset || $[1] !== resets_at || $[2] !== showResetTime) {
      t2 = formatResetText(resets_at, true, showResetTime, showDateInReset);
      $[0] = showDateInReset;
      $[1] = resets_at;
      $[2] = showResetTime;
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
    let resetText;
    if ($[4] !== title) {
      resetText = jsxProd_default(Text, {
        bold: true,
        children: title,
      });
      $[4] = title;
      $[5] = resetText;
    } else resetText = $[5];
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
    let boxElement;
    if ($[10] !== t4 || $[11] !== t5) {
      boxElement = jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: false ? 2 : 1,
        children: [t4, t5],
      });
      $[10] = t4;
      $[11] = t5;
      $[12] = boxElement;
    } else boxElement = $[12];
    let barElement;
    if ($[13] !== subtext) {
      barElement =
        subtext &&
        jsxProd_default(Text, {
          dimColor: true,
          children: subtext,
        });
      $[13] = subtext;
      $[14] = barElement;
    } else barElement = $[14];
    let subtextLines;
    if ($[15] !== trailingLines) {
      subtextLines = jsxProd_default(renderColoredLines, {
        lines: trailingLines,
      });
      $[15] = trailingLines;
      $[16] = subtextLines;
    } else subtextLines = $[16];
    let t8;
    if ($[17] !== resetText || $[18] !== boxElement || $[19] !== barElement || $[20] !== subtextLines) {
      t8 = jsxProd_default_2(Box, {
        flexDirection: "column",
        flexShrink: 0,
        children: [resetText, boxElement, barElement, subtextLines],
      });
      $[17] = resetText;
      $[18] = boxElement;
      $[19] = barElement;
      $[20] = subtextLines;
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
    let lineElement;
    if ($[26] !== t2 || $[27] !== t3) {
      lineElement = jsxProd_default_2(Text, {
        children: [t2, t3],
      });
      $[26] = t2;
      $[27] = t3;
      $[28] = lineElement;
    } else lineElement = $[28];
    let containerElement;
    if ($[29] !== trailingLines) {
      containerElement = jsxProd_default(renderColoredLines, {
        lines: trailingLines,
      });
      $[29] = trailingLines;
      $[30] = containerElement;
    } else containerElement = $[30];
    const ratio = utilization / 100;
    let progressBarElement;
    if ($[31] !== maxWidth_2 || $[32] !== ratio) {
      progressBarElement = jsxProd_default(ProgressBar, {
        ratio,
        width: maxWidth_2,
        variant: false ? "shade" : "block",
        fillColor: false ? "suggestion" : "rate_limit_fill",
        emptyColor: false ? undefined : "rate_limit_empty",
      });
      $[31] = maxWidth_2;
      $[32] = ratio;
      $[33] = progressBarElement;
    } else progressBarElement = $[33];
    let t7;
    if ($[34] !== usedText) {
      t7 = jsxProd_default(Text, {
        children: usedText,
      });
      $[34] = usedText;
      $[35] = t7;
    } else t7 = $[35];
    let t8;
    if ($[36] !== lineElement || $[37] !== containerElement || $[38] !== progressBarElement || $[39] !== t7) {
      t8 = jsxProd_default_2(Box, {
        flexDirection: "column",
        flexShrink: 0,
        children: [lineElement, containerElement, progressBarElement, t7],
      });
      $[36] = lineElement;
      $[37] = containerElement;
      $[38] = progressBarElement;
      $[39] = t7;
      $[40] = t8;
    } else t8 = $[40];
    return t8;
  }
}
//@ chunk-9h8dr0qb.js:56348-56454 placement
function renderColoredLines({ lines }) {
  return (lines ?? []).map((line, index) =>
    jsxProd_default(
      Text,
      {
        dimColor: !line.color,
        color: line.color,
        children: line.text,
      },
      index,
    ),
  );
}
//@ chunk-9h8dr0qb.js:56454-57121 placement
function renderGatewayUsageNotice() {
  let $ = useMemoCache(7);
  let emptyState;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    emptyState = stableEmptyObject(false);
    $[0] = emptyState;
  } else emptyState = $[0];
  let emptyStateValue = emptyState;
  let { columns } = useTerminalSize();
  let roomColumns = columns - 2;
  let maxWidth = Math.min(roomColumns, 80);
  let noticeElement;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    noticeElement = isClaudeAISubscriber();
    $[1] = noticeElement;
  } else noticeElement = $[1];
  let textElement = noticeElement;
  let bodyElement;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    bodyElement = getRemoteCaps();
    $[2] = bodyElement;
  } else bodyElement = $[2];
  let isThinClient = bodyElement !== null;
  let renderRemoteCostElement;
  let pluginSkillFootprintElement;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    renderRemoteCostElement = jsxProd_default(renderRemoteCost, {
      isThinClient,
    });
    pluginSkillFootprintElement = lanternPrismEnabled()
      ? jsxProd_default(renderPluginSkillFootprint, {})
      : null;
    $[3] = renderRemoteCostElement;
    $[4] = pluginSkillFootprintElement;
  } else {
    renderRemoteCostElement = $[3];
    pluginSkillFootprintElement = $[4];
  }
  let boxElement;
  if ($[5] !== maxWidth) {
    boxElement = jsxProd_default(Box, {
      flexDirection: "column",
      width: "100%",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        flexShrink: 0,
        children: [
          renderRemoteCostElement,
          pluginSkillFootprintElement,
          getAPIProvider() === "gateway"
            ? jsxProd_default(UsageCreditsPanel, {
                maxWidth,
              })
            : textElement
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
                    ...emptyStateValue,
                  }),
                }),
        ],
      }),
    });
    $[5] = maxWidth;
    $[6] = boxElement;
  } else boxElement = $[6];
  return boxElement;
}
//@ chunk-9h8dr0qb.js:57121-57890 placement (2.1.88 match: _temp2, 0.477)
/**
 * 用量设置里的额度面板：读取凭据对应的额度，失败时回退显示消费上限，底部 Esc 取消提示。
 */
function UsageCreditsPanel(exitState) {
  let $ = useMemoCache(15);
  let { maxWidth } = exitState;
  let emptyState;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    emptyState = stableEmptyObject(false);
    $[0] = emptyState;
  } else emptyState = $[0];
  let headerElement = emptyState;
  let { credentials } = useTheme_2();
  let usageResult;
  if ($[1] !== credentials) {
    usageResult = () => refreshGatewayUsage(credentials).catch(noopUsageCallback);
    $[1] = credentials;
    $[2] = usageResult;
  } else usageResult = $[2];
  let [panelElement] = useState(usageResult);
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
  if ($[6] !== maxWidth || $[7] !== panelElement) {
    children = jsxProd_default(SpendLimitReading, {
      reading: panelElement,
      maxWidth,
    });
    $[6] = maxWidth;
    $[7] = panelElement;
    $[8] = children;
  } else children = $[8];
  let foElement;
  if ($[9] !== fallback || $[10] !== children) {
    foElement = jsxProd_default(suspenseTypeExport, {
      fallback,
      children,
    });
    $[9] = fallback;
    $[10] = children;
    $[11] = foElement;
  } else foElement = $[11];
  let textElement;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default(Text, {
      dimColor: true,
      italic: false,
      children: jsxProd_default(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Settings",
        fallback: "Esc",
        description: "cancel",
        ...headerElement,
      }),
    });
    $[12] = textElement;
  } else textElement = $[12];
  let boxElement;
  if ($[13] !== foElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [foElement, textElement],
    });
    $[13] = foElement;
    $[14] = boxElement;
  } else boxElement = $[14];
  return boxElement;
}
//@ chunk-9h8dr0qb.js:57890-58054 placement
/**
 * 在 Suspense 下读取额度花费数据并渲染支出上限行。
 */
function SpendLimitReading(props) {
  let $ = useMemoCache(3);
  let { reading, maxWidth } = props;
  const spend = use(reading);
  let element;
  if ($[0] !== maxWidth || $[1] !== spend) {
    element = jsxProd_default(renderSpendLimit, {
      spend,
      maxWidth,
    });
    $[0] = maxWidth;
    $[1] = spend;
    $[2] = element;
  } else element = $[2];
  return element;
}
//@ chunk-9h8dr0qb.js:58054-58854 placement
function renderSpendLimit(props) {
  let $ = useMemoCache(10);
  let { spend, maxWidth } = props;
  let utilization;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    utilization = getRawUtilization();
    $[0] = utilization;
  } else utilization = $[0];
  let overage = utilization.overage;
  let utilizationOverage;
  if ($[1] !== spend) {
    utilizationOverage = spend
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
    $[1] = spend;
    $[2] = utilizationOverage;
  } else utilizationOverage = $[2];
  let spendElement = utilizationOverage;
  if (!spendElement) {
    let overageElement;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      overageElement = areLimitsObserved()
        ? null
        : jsxProd_default(Text, {
            dimColor: true,
            children: "Spend limit \xB7 Shown once your gateway reports one",
          });
      $[3] = overageElement;
    } else overageElement = $[3];
    return overageElement;
  }
  let containerElement;
  if ($[4] !== spend) {
    containerElement = spend
      ? `${formatCurrency(spend.used, spend.currency)} / ${formatCurrency(spend.limit, spend.currency)} spent${spend.period ? ` ${SPEND_PERIOD_LABELS[spend.period]}` : ""}`
      : undefined;
    $[4] = spend;
    $[5] = containerElement;
  } else containerElement = $[5];
  let extraSubtext = containerElement;
  let limitBarElement;
  if ($[6] !== extraSubtext || $[7] !== spendElement || $[8] !== maxWidth) {
    limitBarElement = jsxProd_default(LimitBar, {
      title: "Spend limit",
      limit: spendElement,
      maxWidth,
      alwaysShowDateInReset: true,
      extraSubtext,
    });
    $[6] = extraSubtext;
    $[7] = spendElement;
    $[8] = maxWidth;
    $[9] = limitBarElement;
  } else limitBarElement = $[9];
  return limitBarElement;
}
//@ chunk-9h8dr0qb.js:58854-59430 placement
function renderRemoteCost(props) {
  let $ = useMemoCache(10);
  let { isThinClient } = props;
  let costText;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    costText = stripAnsi(formatTotalCost());
    $[0] = costText;
  } else costText = $[0];
  let children = costText;
  let costElement;
  if ($[1] !== isThinClient) {
    costElement = () => (isThinClient ? fetchRemoteSessionCost() : null);
    $[1] = isThinClient;
    $[2] = costElement;
  } else costElement = $[2];
  let [isThinClientHint] = useState(costElement);
  const remoteSuffix = isThinClient ? " (remote)" : "";
  let titleElement;
  if ($[3] !== remoteSuffix) {
    titleElement = jsxProd_default_2(Title, {
      children: ["Session", remoteSuffix],
    });
    $[3] = remoteSuffix;
    $[4] = titleElement;
  } else titleElement = $[4];
  let containerElement;
  if ($[5] !== isThinClientHint) {
    containerElement = isThinClientHint
      ? jsxProd_default(suspenseTypeExport, {
          fallback: jsxProd_default(Text, {
            dimColor: true,
            children: "Loading remote cost\u2026",
          }),
          children: jsxProd_default(RemoteCostText, {
            costPromise: isThinClientHint,
          }),
        })
      : jsxProd_default(Text, {
          dimColor: true,
          children,
        });
    $[5] = isThinClientHint;
    $[6] = containerElement;
  } else containerElement = $[6];
  let boxElement;
  if ($[7] !== titleElement || $[8] !== containerElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [titleElement, containerElement],
    });
    $[7] = titleElement;
    $[8] = containerElement;
    $[9] = boxElement;
  } else boxElement = $[9];
  return boxElement;
}
//@ chunk-9h8dr0qb.js:59430-59573 placement
function RemoteCostText(props) {
  let $ = useMemoCache(2);
  let { costPromise } = props;
  const children = use(costPromise);
  let costElement;
  if ($[0] !== children) {
    costElement = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[0] = children;
    $[1] = costElement;
  } else costElement = $[1];
  return costElement;
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
function asOfSuffix(timestamp, now) {
  if (timestamp === undefined) return "";
  return ` as of ${formatRelativeTimeAgo(new Date(timestamp), {
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
  let $ = useMemoCache(67);
  let { maxWidth } = props;
  let emptyProps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    emptyProps = stableEmptyObject(false);
    $[0] = emptyProps;
  } else emptyProps = $[0];
  let hintFormat = emptyProps;
  let { storageV5, credentials } = useTheme_2();
  let initialSnapshot;
  if ($[1] !== storageV5) {
    initialSnapshot = () => normalizeUsageLimits(storageV5);
    $[1] = storageV5;
    $[2] = initialSnapshot;
  } else initialSnapshot = $[2];
  let [persistedUsage] = useState(initialSnapshot);
  let initialUsageState;
  if (
    $[3] !== persistedUsage?.fetchedAtMs ||
    $[4] !== persistedUsage?.source ||
    $[5] !== persistedUsage?.utilization
  ) {
    initialUsageState = () => ({
      utilization: persistedUsage?.utilization ?? null,
      source: persistedUsage?.source ?? null,
      fetchedAtMs: persistedUsage?.fetchedAtMs,
      enrichError: null,
    });
    $[3] = persistedUsage?.fetchedAtMs;
    $[4] = persistedUsage?.source;
    $[5] = persistedUsage?.utilization;
    $[6] = initialUsageState;
  } else initialUsageState = $[6];
  let [usageState, setUsageState] = useState(initialUsageState);
  let { utilization, enrichError } = usageState;
  let [loadError, setLoadError] = useState(null);
  let [isLoading, setIsLoading] = useState(true);
  let loadUsage;
  if ($[7] !== credentials || $[8] !== storageV5) {
    loadUsage = async () => {
      setIsLoading(true);
      setLoadError(null);
      setUsageState(clearEnrichError);
      let usageWithModelScopes = await fetchUsageWithModelScopes(storageV5, credentials);
      J: switch (usageWithModelScopes.status) {
        case "ok": {
          setUsageState({
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
          setLoadError(USAGE_LOAD_FAILED_TEXT);
          break J;
        }
        case "seeded": {
          let date = new Date();
          setUsageState((prev) => {
            let hadNoUtilization = prev.utilization === null;
            let nextSource =
              usageWithModelScopes.seedSource === "headers"
                ? "headers"
                : hadNoUtilization
                  ? "persisted"
                  : prev.source;
            let nextFetchedAt =
              usageWithModelScopes.seedSource === "headers"
                ? undefined
                : hadNoUtilization
                  ? usageWithModelScopes.seedFetchedAtMs
                  : prev.fetchedAtMs;
            return {
              utilization:
                usageWithModelScopes.seedSource === "headers"
                  ? usageWithModelScopes.utilization
                  : (prev.utilization ?? usageWithModelScopes.utilization),
              source: nextSource,
              fetchedAtMs: nextFetchedAt,
              enrichError:
                usageWithModelScopes.seedSource === "persisted"
                  ? `Showing last-known usage${nextSource === "persisted" ? asOfSuffix(nextFetchedAt, date) : ""}${usageWithModelScopes.rateLimitedVia !== null ? ` (${describeRateLimitWait(usageWithModelScopes.heldUntilMs)})` : " (could not refresh)"}`
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
            setLoadError(
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
            setLoadError(
              usageWithModelScopes.responseBody
                ? `${USAGE_LOAD_FAILED_TEXT}: ${usageWithModelScopes.responseBody}`
                : USAGE_LOAD_FAILED_TEXT,
            );
            logFeatureBad("usage_plan_limits", "load_failed");
          }
        }
      }
      setIsLoading(false);
    };
    $[7] = credentials;
    $[8] = storageV5;
    $[9] = loadUsage;
  } else loadUsage = $[9];
  let loadUsageStable = loadUsage;
  let retryEffect;
  let retryDeps;
  if ($[10] !== loadUsageStable) {
    retryEffect = () => {
      loadUsageStable();
    };
    retryDeps = [loadUsageStable];
    $[10] = loadUsageStable;
    $[11] = retryEffect;
    $[12] = retryDeps;
  } else {
    retryEffect = $[11];
    retryDeps = $[12];
  }
  useEffect(retryEffect, retryDeps);
  let retryHandler;
  if ($[13] !== loadUsageStable) {
    retryHandler = () => {
      loadUsageStable();
    };
    $[13] = loadUsageStable;
    $[14] = retryHandler;
  } else retryHandler = $[14];
  const isActive = (!!loadError || !!enrichError) && !isLoading;
  let retryKeyArgs;
  if ($[15] !== isActive) {
    retryKeyArgs = {
      context: "Settings",
      isActive,
    };
    $[15] = isActive;
    $[16] = retryKeyArgs;
  } else retryKeyArgs = $[16];
  useKeybinding("settings:retry", retryHandler, retryKeyArgs);
  if (loadError) {
    let errorText;
    if ($[17] !== loadError) {
      errorText = jsxProd_default_2(Text, {
        color: "error",
        children: ["Error: ", loadError],
      });
      $[17] = loadError;
      $[18] = errorText;
    } else errorText = $[18];
    let errorHints;
    if ($[19] === MEMO_CACHE_SENTINEL) {
      errorHints = jsxProd_default(Text, {
        dimColor: true,
        italic: false,
        children: jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(ConfigurableShortcutHint, {
              action: "settings:retry",
              context: "Settings",
              fallback: "r",
              description: "retry",
              ...hintFormat,
            }),
            jsxProd_default(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "cancel",
              ...hintFormat,
            }),
          ],
        }),
      });
      $[19] = errorHints;
    } else errorHints = $[19];
    let errorBox;
    if ($[20] !== errorText) {
      errorBox = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [errorText, errorHints],
      });
      $[20] = errorText;
      $[21] = errorBox;
    } else errorBox = $[21];
    return errorBox;
  }
  if (!utilization) {
    let loadingText;
    if ($[22] === MEMO_CACHE_SENTINEL) {
      loadingText = jsxProd_default(Text, {
        dimColor: true,
        children: "Loading usage data\u2026",
      });
      $[22] = loadingText;
    } else loadingText = $[22];
    let loadingBox;
    if ($[23] === MEMO_CACHE_SENTINEL) {
      loadingBox = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          loadingText,
          jsxProd_default(Text, {
            dimColor: true,
            italic: false,
            children: jsxProd_default(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "cancel",
              ...hintFormat,
            }),
          }),
        ],
      });
      $[23] = loadingBox;
    } else loadingBox = $[23];
    return loadingBox;
  }
  let subscriptionType;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    subscriptionType = getSubscriptionType();
    $[24] = subscriptionType;
  } else subscriptionType = $[24];
  let subscriptionType_2 = subscriptionType;
  let showSonnetRow =
    subscriptionType_2 === "max" || subscriptionType_2 === "team" || subscriptionType_2 === null;
  let BoxComponent;
  let flexDirection;
  let gap;
  let limitBars;
  if (
    $[25] !== maxWidth ||
    $[26] !== utilization.five_hour ||
    $[27] !== utilization.limits ||
    $[28] !== utilization.seven_day ||
    $[29] !== utilization.seven_day_sonnet
  ) {
    let promoNotices = rateLimitPromoNotices();
    let noticesForBar = (barName) =>
      promoNotices
        .filter((notice) => notice.bar.toLowerCase() === barName.toLowerCase())
        .map(toUsageNoticeRow);
    let bars = [
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
      ...(showSonnetRow
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
    BoxComponent = Box;
    flexDirection = "column";
    gap = 1;
    limitBars = bars.map((barSpec) => {
      let { bar, title, limit, alwaysShowDateInReset } = barSpec;
      return (
        limit &&
        jsxProd_default(
          LimitBar,
          {
            title,
            limit,
            maxWidth,
            alwaysShowDateInReset,
            trailingLines: noticesForBar(bar),
          },
          title,
        )
      );
    });
    $[25] = maxWidth;
    $[26] = utilization.five_hour;
    $[27] = utilization.limits;
    $[28] = utilization.seven_day;
    $[29] = utilization.seven_day_sonnet;
    $[30] = BoxComponent;
    $[31] = flexDirection;
    $[32] = gap;
    $[33] = limitBars;
  } else {
    BoxComponent = $[30];
    flexDirection = $[31];
    gap = $[32];
    limitBars = $[33];
  }
  let creditBar;
  if ($[34] !== maxWidth || $[35] !== utilization.cinder_cove) {
    creditBar =
      utilization.cinder_cove &&
      jsxProd_default(LimitBar, {
        title: "Claude Code and Cowork credit",
        limit: utilization.cinder_cove,
        maxWidth,
        subtextOverride: creditExpiryLabel(utilization.cinder_cove.resets_at),
      });
    $[34] = maxWidth;
    $[35] = utilization.cinder_cove;
    $[36] = creditBar;
  } else creditBar = $[36];
  let fableCreditBar;
  if ($[37] !== maxWidth || $[38] !== utilization.wattle_ember) {
    fableCreditBar =
      utilization.wattle_ember &&
      jsxProd_default(LimitBar, {
        title: utilization.wattle_ember.label || "Credit",
        limit: utilization.wattle_ember,
        maxWidth,
        subtextOverride: formatCreditLine(utilization.wattle_ember),
        trailingLines: formatFableCredit(utilization.wattle_ember),
      });
    $[37] = maxWidth;
    $[38] = utilization.wattle_ember;
    $[39] = fableCreditBar;
  } else fableCreditBar = $[39];
  let feedColumn;
  if ($[40] !== maxWidth) {
    feedColumn = jsxProd_default(FeedColumn, {
      maxWidth,
    });
    $[40] = maxWidth;
    $[41] = feedColumn;
  } else feedColumn = $[41];
  let extraUsageSection;
  if ($[42] !== maxWidth || $[43] !== utilization.extra_usage) {
    extraUsageSection =
      utilization.extra_usage &&
      jsxProd_default(ExtraUsageSection, {
        extraUsage: utilization.extra_usage,
        maxWidth,
      });
    $[42] = maxWidth;
    $[43] = utilization.extra_usage;
    $[44] = extraUsageSection;
  } else extraUsageSection = $[44];
  let enrichErrorText;
  if ($[45] !== enrichError) {
    enrichErrorText =
      enrichError &&
      jsxProd_default(Text, {
        dimColor: true,
        children: enrichError,
      });
    $[45] = enrichError;
    $[46] = enrichErrorText;
  } else enrichErrorText = $[46];
  let refreshingText;
  if ($[47] !== enrichError || $[48] !== isLoading) {
    refreshingText =
      isLoading &&
      !enrichError &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "Refreshing\u2026",
      });
    $[47] = enrichError;
    $[48] = isLoading;
    $[49] = refreshingText;
  } else refreshingText = $[49];
  let retryHint;
  if ($[50] !== enrichError) {
    retryHint =
      enrichError &&
      jsxProd_default(ConfigurableShortcutHint, {
        action: "settings:retry",
        context: "Settings",
        fallback: "r",
        description: "retry",
        ...hintFormat,
      });
    $[50] = enrichError;
    $[51] = retryHint;
  } else retryHint = $[51];
  let cancelHint;
  if ($[52] === MEMO_CACHE_SENTINEL) {
    cancelHint = jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Settings",
      fallback: "Esc",
      description: "cancel",
      ...hintFormat,
    });
    $[52] = cancelHint;
  } else cancelHint = $[52];
  let hintsLine;
  if ($[53] !== retryHint) {
    hintsLine = jsxProd_default(Text, {
      dimColor: true,
      italic: false,
      children: jsxProd_default_2(Byline, {
        children: [retryHint, cancelHint],
      }),
    });
    $[53] = retryHint;
    $[54] = hintsLine;
  } else hintsLine = $[54];
  let content;
  if (
    $[55] !== BoxComponent ||
    $[56] !== flexDirection ||
    $[57] !== gap ||
    $[58] !== limitBars ||
    $[59] !== creditBar ||
    $[60] !== fableCreditBar ||
    $[61] !== feedColumn ||
    $[62] !== extraUsageSection ||
    $[63] !== enrichErrorText ||
    $[64] !== refreshingText ||
    $[65] !== hintsLine
  ) {
    content = jsxProd_default_2(BoxComponent, {
      flexDirection,
      gap,
      children: [
        limitBars,
        creditBar,
        fableCreditBar,
        feedColumn,
        extraUsageSection,
        enrichErrorText,
        refreshingText,
        hintsLine,
      ],
    });
    $[55] = BoxComponent;
    $[56] = flexDirection;
    $[57] = gap;
    $[58] = limitBars;
    $[59] = creditBar;
    $[60] = fableCreditBar;
    $[61] = feedColumn;
    $[62] = extraUsageSection;
    $[63] = enrichErrorText;
    $[64] = refreshingText;
    $[65] = hintsLine;
    $[66] = content;
  } else content = $[66];
  return content;
}
//@ chunk-9h8dr0qb.js:65969-65992 layout
var USAGE_CREDITS_LABEL = "Usage credits";
//@ chunk-9h8dr0qb.js:65992-67685 fingerprint (2.1.88 match: ExtraUsageSection, 0.698)
function ExtraUsageSection(props) {
  let $ = useMemoCache(27);
  let { extraUsage, maxWidth } = props;
  let subscriptionType = getSubscriptionType();
  let isConsumerPlan = subscriptionType === "pro" || subscriptionType === "max";
  if (!isConsumerPlan && !(subscriptionType === "team" || subscriptionType === "enterprise")) {
    return null;
  }
  if (!extraUsage.is_enabled) {
    if (isConsumerPlan && usageCreditsCommand.isEnabled()) {
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
    if (isConsumerPlan) {
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
    let usedLabel;
    if ($[2] !== currency || $[3] !== extraUsage.used_credits) {
      usedLabel = formatCurrency(extraUsage.used_credits, currency);
      $[2] = currency;
      $[3] = extraUsage.used_credits;
      $[4] = usedLabel;
    } else usedLabel = $[4];
    const subtitle = `${usedLabel} spent`;
    let titleElement;
    if ($[5] !== subtitle) {
      titleElement = jsxProd_default(Title, {
        subtitle,
        children: USAGE_CREDITS_LABEL,
      });
      $[5] = subtitle;
      $[6] = titleElement;
    } else titleElement = $[6];
    return titleElement;
  }
  if (typeof extraUsage.used_credits !== "number") {
    return null;
  }
  let utilization =
    extraUsage.utilization ??
    (extraUsage.monthly_limit > 0
      ? Math.max(0, Math.min(100, (extraUsage.used_credits / extraUsage.monthly_limit) * 100))
      : 100);
  let usedLabel;
  if ($[7] !== currency || $[8] !== extraUsage.used_credits) {
    usedLabel = formatCurrency(extraUsage.used_credits, currency);
    $[7] = currency;
    $[8] = extraUsage.used_credits;
    $[9] = usedLabel;
  } else usedLabel = $[9];
  let usedLabelValue = usedLabel;
  let limitLabel;
  if ($[10] !== currency || $[11] !== extraUsage.monthly_limit) {
    limitLabel = formatCurrency(extraUsage.monthly_limit, currency);
    $[10] = currency;
    $[11] = extraUsage.monthly_limit;
    $[12] = limitLabel;
  } else limitLabel = $[12];
  let formattedMonthlyLimit = limitLabel;
  let utilizationValue;
  let utilization_2;
  let resetsAt;
  let title;
  if ($[13] !== utilization) {
    let now = new Date();
    let oneMonthReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    utilizationValue = LimitBar;
    title = USAGE_CREDITS_LABEL;
    utilization_2 = utilization;
    resetsAt = oneMonthReset.toISOString();
    $[13] = utilization;
    $[14] = utilizationValue;
    $[15] = utilization_2;
    $[16] = resetsAt;
    $[17] = title;
  } else {
    utilizationValue = $[14];
    utilization_2 = $[15];
    resetsAt = $[16];
    title = $[17];
  }
  let limit;
  if ($[18] !== utilization_2 || $[19] !== resetsAt) {
    limit = {
      utilization: utilization_2,
      resets_at: resetsAt,
    };
    $[18] = utilization_2;
    $[19] = resetsAt;
    $[20] = limit;
  } else limit = $[20];
  const extraSubtext = `${usedLabelValue} / ${formattedMonthlyLimit} spent`;
  let t10;
  if (
    $[21] !== utilizationValue ||
    $[22] !== maxWidth ||
    $[23] !== title ||
    $[24] !== limit ||
    $[25] !== extraSubtext
  ) {
    t10 = jsxProd_default(utilizationValue, {
      title,
      limit,
      showTimeInReset: false,
      alwaysShowDateInReset: true,
      extraSubtext,
      maxWidth,
    });
    $[21] = utilizationValue;
    $[22] = maxWidth;
    $[23] = title;
    $[24] = limit;
    $[25] = extraSubtext;
    $[26] = t10;
  } else t10 = $[26];
  return t10;
}
//@ chunk-9h8dr0qb.js:67685-67776 placement (2.1.88 match: formatPeakDay, 0.789)
function formatPeakDay(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}
//@ chunk-9h8dr0qb.js:67776-68119 placement
function formatCreditLine(wattleEmber) {
  let parts = [];
  if (wattleEmber.limit_dollars != null) {
    let usedLabel = formatUsageUSD(wattleEmber.used_dollars ?? 0);
    let limitLabel = formatUsageUSD(wattleEmber.limit_dollars);
    parts.push(`${usedLabel} of ${limitLabel} used`);
  }
  if (wattleEmber.resets_at) {
    let resetLabel = formatResetText(wattleEmber.resets_at, true, true, true);
    let periods = wattleEmber.periods ?? [];
    let endsAt = periods.length >= 2 ? periods.at(-1)?.ends_at : undefined;
    let periodLabel = endsAt != null && Date.parse(wattleEmber.resets_at) < Date.parse(endsAt);
    parts.push(periodLabel ? `Resets ${resetLabel}` : `Expires ${resetLabel}`);
  }
  return parts.join(" \xB7 ");
}
//@ chunk-9h8dr0qb.js:68119-68564 placement
function formatFableCredit(wattleEmber) {
  let periods = Array.isArray(wattleEmber.periods) ? wattleEmber.periods : [];
  let [firstPeriod, secondPeriod] = periods;
  if (
    periods.length !== 2 ||
    firstPeriod == null ||
    secondPeriod == null ||
    wattleEmber.limit_dollars == null ||
    [firstPeriod.starts_at, firstPeriod.ends_at, secondPeriod.ends_at].some(
      (dateText) => typeof dateText !== "string" || Number.isNaN(Date.parse(dateText)),
    )
  )
    return [];
  let limitLabel = formatUsageUSD(wattleEmber.limit_dollars);
  let firstStart = formatPeakDay(firstPeriod.starts_at);
  let firstEnd = formatPeakDay(firstPeriod.ends_at);
  let secondEnd = formatPeakDay(secondPeriod.ends_at);
  return [
    {
      text: `You have ${limitLabel} USD of Fable usage for each of two periods: ${firstStart} to ${firstEnd}, and ${firstEnd} to ${secondEnd}. Unused credit doesn't carry over.`,
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
var usageRefreshSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9h8dr0qb.js:68732", () => {
  usageRefreshSignal = __toESM(require_asciichart(), 1);
});
//@ chunk-9h8dr0qb.js:68750-68754 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9h8dr0qb.js:68750", () => {
  init_react_production();
});
export { usageRefreshSignal, Usage, UsageAttributionView, renderGatewayUsageNotice, applyUsageFix };
