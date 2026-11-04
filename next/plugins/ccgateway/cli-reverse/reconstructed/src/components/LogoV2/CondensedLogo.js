/**
 * components/LogoV2/CondensedLogo.tsx
 *
 * 精简版 Logo 行（已有会话/窄终端时）：显示模型、agent、ultracode、cwd 与过期等状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/CondensedLogo.tsx
 * pieces: chunk-ag5x7vhf.js (13)
 * attribution: sole-consumer 1, placement 9, layout 2, fingerprint 1
 */
import { uiSignals } from "../../state/uiSignals.js";
import {
  getForcedFirstLaunch,
  isNewerClawdEntranceVersion,
  filterEntranceAnimations,
  CLAWD_ANIMATION_NAMES,
  markClawdEntranceSeen,
} from "./AnimatedClawd.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { chalkForChart } from "./Clawd.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import {
  useState,
  useEffect,
  init_react_production,
  createContext,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useAppState } from "../../state/AppState.js";
import { useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { useMainLoopModel_2 } from "../../hooks/useMainLoopModel.js";
import { parseUserSpecifiedModel, renderModelSetting } from "../../utils/model/modelDisplay.js";
import {
  getLogoDisplayData,
  formatModelAndBilling,
  truncatePathForDisplay,
} from "../../utils/logoV2Utils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { justSwitchedRenderer, AnimatedClawdLogo, RendererSwitchNotice } from "./CondensedLogoParts.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { isUltracodeActive, getEffortSuffix } from "../../utils/effort.js";
import { showSwarmFooterGate } from "../PromptInput/footerGates.js";
import { BridgeStatusIndicator } from "../PromptInput/PromptInputFooter.js";
import { displayModelName } from "../../utils/model/validateModel.js";
import { viewedTaskParts } from "../../state/teammateViewHelpers.js";
import { truncate } from "../../utils/format.js";
import { effortLevelOf } from "../../utils/transcriptDiagnostics.js";
import { getProTrialStatus, proTrialBadgeText } from "../../services/api/proTrial.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { Text, Box } from "../../ink/components/Text.js";
import { rcPillLabel, logRcPillClicked, RemoteControlStatus } from "../PromptInput/RemoteControlPill.js";
import { FreezeWhenOffscreen } from "../FreezeWhenOffscreen.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:56868-57055 sole-consumer
function pickClawdEntranceAnimation() {
  if (uiSignals.clawdEntranceTaken) return;
  if (!getForcedFirstLaunch() && !isNewerClawdEntranceVersion(getGlobalConfig().lastClawdEntranceVersion))
    return;
  uiSignals.clawdEntranceTaken = true;
  let candidates = filterEntranceAnimations(CLAWD_ANIMATION_NAMES, chalkForChart());
  return candidates[Math.floor(Math.random() * candidates.length)];
}
//@ chunk-ag5x7vhf.js:57055-57344 placement
function useClawdEntranceAnimation(enabled) {
  let $ = useMemoCache(6);
  let { storageV5 } = useTheme_2();
  let pick;
  if ($[0] !== enabled) {
    pick = () => (enabled ? pickClawdEntranceAnimation() : undefined);
    $[0] = enabled;
    $[1] = pick;
  } else pick = $[1];
  let [animation] = useState(pick);
  let markSeen;
  let markDeps;
  if ($[2] !== animation || $[3] !== storageV5) {
    markSeen = () => {
      if (
        animation === undefined ||
        !isNewerClawdEntranceVersion(getGlobalConfig().lastClawdEntranceVersion)
      ) {
        return;
      }
      saveGlobalConfig(markClawdEntranceSeen, storageV5);
    };
    markDeps = [animation, storageV5];
    $[2] = animation;
    $[3] = storageV5;
    $[4] = markSeen;
    $[5] = markDeps;
  } else {
    markSeen = $[4];
    markDeps = $[5];
  }
  useEffect(markSeen, markDeps);
  return animation;
}
//@ chunk-ag5x7vhf.js:57344-57348 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:57344", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:61638-61729 placement
function claimNoticeImpression(noticeKey) {
  let countedNoticeImpressions = announcementState().countedNoticeImpressions;
  if (countedNoticeImpressions.has(noticeKey)) return false;
  countedNoticeImpressions.add(noticeKey);
  return true;
}
//@ chunk-ag5x7vhf.js:61729-61789 placement
function hasNoticeImpression(noticeKey) {
  return announcementState().countedNoticeImpressions.has(noticeKey);
}
//@ chunk-ag5x7vhf.js:61789-61803 placement
var noticeImpressionEnabled; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:61789", () => {
  noticeImpressionEnabled = createContext(true);
});
//@ chunk-ag5x7vhf.js:61803-61831 placement
function useNoticeImpressionEnabled() {
  return useContext(noticeImpressionEnabled);
}
//@ chunk-ag5x7vhf.js:61831-61926 placement
function useNoticeImpression(noticeKey, onShown, { enabled = true } = {}) {
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  useEffect(() => {
    if (!enabled || !noticeImpressionEnabled) return;
    if (claimNoticeImpression(noticeKey)) onShown();
  }, [enabled, noticeImpressionEnabled, noticeKey, onShown]);
}
//@ chunk-ag5x7vhf.js:61926-61958 layout
function selectAgent(state) {
  return state.agent;
}
//@ chunk-ag5x7vhf.js:61958-61994 layout
function selectUltracode(state) {
  return state.ultracode;
}
//@ chunk-ag5x7vhf.js:61994-64759 fingerprint (2.1.88 match: CondensedLogo, 0.508)
function CondensedLogo(props) {
  let $ = useMemoCache(34);
  let options;
  if ($[0] !== props) {
    options = props === undefined ? {} : props;
    $[0] = props;
    $[1] = options;
  } else options = $[1];
  let { oneShotsAllowed } = options;
  let oneShots = oneShotsAllowed === undefined ? true : oneShotsAllowed;
  let { columns } = useTerminalSize();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let agent = useAppState(selectAgent);
  let effortValue = useQueuedMessageText();
  let mainLoopModel = useMainLoopModel_2();
  let effortValue_2 = parseUserSpecifiedModel(mainLoopModel);
  let modelDisplayName = renderModelSetting(mainLoopModel);
  let { version, cwd, billingType, agentName: agentNameFromSettings } = getLogoDisplayData();
  let agentLabel = agent ?? agentNameFromSettings;
  let justSwitched;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    justSwitched = justSwitchedRenderer();
    $[2] = justSwitched;
  } else justSwitched = $[2];
  let showSwitchNotice = justSwitched !== undefined;
  let showGuestPassesUpsell = useIsFullscreen();
  let entrance = useClawdEntranceAnimation(oneShots && showGuestPassesUpsell);
  let ultracode = useAppState(selectUltracode);
  let clawdLogo = jsxProd_default(AnimatedClawdLogo, {
    fullscreen: showGuestPassesUpsell,
    entrance,
    ultra: isUltracodeActive(ultracode, effortValue_2),
  });
  let showOverageCreditUpsell = useNoticeImpressionEnabled();
  let swarmFooter = showSwarmFooterGate();
  let bridgeStatus = BridgeStatusIndicator(showGuestPassesUpsell && showOverageCreditUpsell && !swarmFooter);
  let showAgentTask = showGuestPassesUpsell && showOverageCreditUpsell;
  let selectTaskModel;
  if ($[3] !== showAgentTask) {
    selectTaskModel = (state) => (showAgentTask ? viewedAgentTask(state)?.model : undefined);
    $[3] = showAgentTask;
    $[4] = selectTaskModel;
  } else selectTaskModel = $[4];
  let appState = useAppState(selectTaskModel);
  let taskModel = appState ? displayModelName(appState) : undefined;
  let selectTaskEffort;
  if ($[5] !== showAgentTask) {
    selectTaskEffort = (state) => (showAgentTask ? viewedAgentTask(state)?.effort : undefined);
    $[5] = showAgentTask;
    $[6] = selectTaskEffort;
  } else selectTaskEffort = $[6];
  let effort = useAppState(selectTaskEffort);
  let selectHasTeammate;
  if ($[7] !== showAgentTask) {
    selectHasTeammate = (state) =>
      showAgentTask && viewedTaskParts(state.viewingAgentTaskId, state.tasks).teammate !== undefined;
    $[7] = showAgentTask;
    $[8] = selectHasTeammate;
  } else selectHasTeammate = $[8];
  let appState_2 = useAppState(selectHasTeammate);
  let textWidth = Math.max(columns - 15, 20);
  let truncatedVersion = isScreenReaderEnabled ? version : truncate(version, Math.max(textWidth - 13, 6));
  let modelLabel = modelDisplayName + getEffortSuffix(effortValue_2, effortValue);
  let modelName = taskModel
    ? renderModelSetting(taskModel) +
      getEffortSuffix(
        parseUserSpecifiedModel(taskModel),
        appState_2 ? undefined : effortValue,
        effortLevelOf(effort),
      )
    : modelLabel;
  let trialBadge = null;
  let trialBadgeWidth = 0;
  let trialText;
  let trialStatus;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    trialStatus = getProTrialStatus();
    trialText = proTrialBadgeText(trialStatus);
    $[9] = trialText;
    $[10] = trialStatus;
  } else {
    trialText = $[9];
    trialStatus = $[10];
  }
  let trialText_2 = trialText;
  if (trialText_2) {
    if ($[11] === MEMO_CACHE_SENTINEL) {
      trialBadgeWidth = bunStringWidth(` \xB7 ${trialText_2}`);
      trialBadge = jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 ",
          }),
          jsxProd_default(Text, {
            color: trialStatus.status === "expired" ? "suggestion" : "warning",
            children: trialText_2,
          }),
        ],
      });
      $[11] = trialBadgeWidth;
      $[12] = trialBadge;
    } else {
      trialBadgeWidth = $[11];
      trialBadge = $[12];
    }
  }
  let { shouldSplit, truncatedModel, truncatedBilling } = isScreenReaderEnabled
    ? {
        shouldSplit: false,
        truncatedModel: modelName,
        truncatedBilling: billingType,
      }
    : formatModelAndBilling(modelName, billingType, textWidth - trialBadgeWidth, modelLabel);
  let pillWidth;
  if ($[13] !== bridgeStatus) {
    pillWidth = bridgeStatus ? 3 + bunStringWidth(rcPillLabel(bridgeStatus.label)) : 0;
    $[13] = bridgeStatus;
    $[14] = pillWidth;
  } else pillWidth = $[14];
  let pillWidth_2 = pillWidth;
  let pathWidth = (agentLabel ? textWidth - 1 - bunStringWidth(agentLabel) - 3 : textWidth) - pillWidth_2;
  let shownCwd = isScreenReaderEnabled ? cwd : truncatePathForDisplay(cwd, Math.max(pathWidth, 10));
  const agentTag = agentLabel && `@${agentLabel}`;
  let secondaryParts;
  if ($[15] !== agentTag || $[16] !== shownCwd) {
    secondaryParts = [agentTag, shownCwd].filter(Boolean);
    $[15] = agentTag;
    $[16] = shownCwd;
    $[17] = secondaryParts;
  } else secondaryParts = $[17];
  let joined = secondaryParts.join(" \xB7 ");
  let titleText;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    titleText = jsxProd_default(Text, {
      bold: true,
      children: "Claude Code",
    });
    $[18] = titleText;
  } else titleText = $[18];
  let versionText;
  if ($[19] !== truncatedVersion) {
    versionText = jsxProd_default_2(Text, {
      children: [
        titleText,
        " ",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["v", truncatedVersion],
        }),
      ],
    });
    $[19] = truncatedVersion;
    $[20] = versionText;
  } else versionText = $[20];
  let modelText;
  if (
    $[21] !== shouldSplit ||
    $[22] !== trialBadge ||
    $[23] !== truncatedBilling ||
    $[24] !== truncatedModel
  ) {
    modelText = shouldSplit
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children: truncatedModel,
            }),
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  dimColor: true,
                  children: truncatedBilling,
                }),
                trialBadge,
              ],
            }),
          ],
        })
      : jsxProd_default_2(Text, {
          children: [
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [truncatedModel, " \xB7 ", truncatedBilling],
            }),
            trialBadge,
          ],
        });
    $[21] = shouldSplit;
    $[22] = trialBadge;
    $[23] = truncatedBilling;
    $[24] = truncatedModel;
    $[25] = modelText;
  } else modelText = $[25];
  let secondaryText;
  if ($[26] !== joined || $[27] !== bridgeStatus) {
    secondaryText = bridgeStatus
      ? jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default_2(Text, {
              dimColor: true,
              wrap: "truncate-start",
              children: [joined, " \xB7 "],
            }),
            jsxProd_default(RemoteControlPill_2, {
              status: bridgeStatus,
            }),
          ],
        })
      : joined &&
        jsxProd_default(Text, {
          dimColor: true,
          children: joined,
        });
    $[26] = joined;
    $[27] = bridgeStatus;
    $[28] = secondaryText;
  } else secondaryText = $[28];
  let infoBox;
  if ($[29] !== versionText || $[30] !== modelText || $[31] !== secondaryText) {
    infoBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [versionText, modelText, secondaryText],
    });
    $[29] = versionText;
    $[30] = modelText;
    $[31] = secondaryText;
    $[32] = infoBox;
  } else infoBox = $[32];
  let switchNotice;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    switchNotice =
      showSwitchNotice &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default(RendererSwitchNotice, {}),
      });
    $[33] = switchNotice;
  } else switchNotice = $[33];
  let logo = jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: 2,
        alignItems: "center",
        children: [clawdLogo, infoBox],
      }),
      switchNotice,
    ],
  });
  return showGuestPassesUpsell
    ? logo
    : jsxProd_default(FreezeWhenOffscreen, {
        children: logo,
      });
}
//@ chunk-ag5x7vhf.js:64759-65228 placement
/**
 * 精简 Logo 里可点击的 Remote Control 状态胶囊：悬停高亮，点击时打点并放行默认行为。
 */
function RemoteControlPill_2(props) {
  let $ = useMemoCache(10);
  let { status } = props;
  let [hovered, setHovered] = useState(false);
  let onClick;
  if ($[0] !== status.label) {
    onClick = (event) => {
      logRcPillClicked("click", rcPillLabel(status.label));
      event.allowDefault();
    };
    $[0] = status.label;
    $[1] = onClick;
  } else onClick = $[1];
  let onMouseEnter;
  let onMouseLeave;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setHovered(true);
    onMouseLeave = () => setHovered(false);
    $[2] = onMouseEnter;
    $[3] = onMouseLeave;
  } else {
    onMouseEnter = $[2];
    onMouseLeave = $[3];
  }
  let children;
  if ($[4] !== hovered || $[5] !== status) {
    children = jsxProd_default(RemoteControlStatus, {
      status,
      highlighted: hovered,
    });
    $[4] = hovered;
    $[5] = status;
    $[6] = children;
  } else children = $[6];
  let pill;
  if ($[7] !== onClick || $[8] !== children) {
    pill = jsxProd_default(Box, {
      flexShrink: 0,
      onClick,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    $[7] = onClick;
    $[8] = children;
    $[9] = pill;
  } else pill = $[9];
  return pill;
}
//@ chunk-ag5x7vhf.js:65228-65318 placement
function viewedAgentTask(state) {
  let { teammate, localAgent } = viewedTaskParts(state.viewingAgentTaskId, state.tasks);
  return teammate ?? localAgent;
}
export {
  noticeImpressionEnabled,
  hasNoticeImpression,
  useNoticeImpression,
  useNoticeImpressionEnabled,
  CondensedLogo,
  claimNoticeImpression,
};
