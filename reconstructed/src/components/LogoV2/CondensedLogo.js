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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { y, P, init_react_production, qt, Se } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-ag5x7vhf.js:56868-57055 sole-consumer
function pickClawdEntranceAnimation() {
  if (uiSignals.clawdEntranceTaken) return;
  if (!getForcedFirstLaunch() && !isNewerClawdEntranceVersion(getGlobalConfig().lastClawdEntranceVersion))
    return;
  uiSignals.clawdEntranceTaken = true;
  let m = filterEntranceAnimations(CLAWD_ANIMATION_NAMES, chalkForChart());
  return m[Math.floor(Math.random() * m.length)];
}
//@ chunk-ag5x7vhf.js:57055-57344 placement
function useClawdEntranceAnimation(m) {
  let $ = w(6);
  let { storageV5 } = useTheme_2();
  let T;
  if ($[0] !== m) {
    T = () => (m ? pickClawdEntranceAnimation() : undefined);
    $[0] = m;
    $[1] = T;
  } else T = $[1];
  let [k] = y(T);
  let _;
  let I;
  if ($[2] !== k || $[3] !== storageV5) {
    _ = () => {
      if (k === undefined || !isNewerClawdEntranceVersion(getGlobalConfig().lastClawdEntranceVersion)) {
        return;
      }
      saveGlobalConfig(markClawdEntranceSeen, storageV5);
    };
    I = [k, storageV5];
    $[2] = k;
    $[3] = storageV5;
    $[4] = _;
    $[5] = I;
  } else {
    _ = $[4];
    I = $[5];
  }
  P(_, I);
  return k;
}
//@ chunk-ag5x7vhf.js:57344-57348 placement
init_react_production();
//@ chunk-ag5x7vhf.js:61638-61729 placement
function claimNoticeImpression(m) {
  let countedNoticeImpressions = announcementState().countedNoticeImpressions;
  if (countedNoticeImpressions.has(m)) return false;
  countedNoticeImpressions.add(m);
  return true;
}
//@ chunk-ag5x7vhf.js:61729-61789 placement
function hasNoticeImpression(m) {
  return announcementState().countedNoticeImpressions.has(m);
}
//@ chunk-ag5x7vhf.js:61789-61803 placement
var noticeImpressionEnabled = qt(true);
//@ chunk-ag5x7vhf.js:61803-61831 placement
function useNoticeImpressionEnabled() {
  return Se(noticeImpressionEnabled);
}
//@ chunk-ag5x7vhf.js:61831-61926 placement
function useNoticeImpression(m, h, { enabled: x = true } = {}) {
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  P(() => {
    if (!x || !noticeImpressionEnabled) return;
    if (claimNoticeImpression(m)) h();
  }, [x, noticeImpressionEnabled, m, h]);
}
//@ chunk-ag5x7vhf.js:61926-61958 layout
function selectAgent(oo) {
  return oo.agent;
}
//@ chunk-ag5x7vhf.js:61958-61994 layout
function selectUltracode(mo) {
  return mo.ultracode;
}
//@ chunk-ag5x7vhf.js:61994-64759 fingerprint = CondensedLogo (0.508)
function CondensedLogo(m) {
  let $ = w(34);
  let x;
  if ($[0] !== m) {
    x = m === undefined ? {} : m;
    $[0] = m;
    $[1] = x;
  } else x = $[1];
  let { oneShotsAllowed } = x;
  let k = oneShotsAllowed === undefined ? true : oneShotsAllowed;
  let { columns } = useTerminalSize();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let agent = useAppState(selectAgent);
  let effortValue = useQueuedMessageText();
  let mainLoopModel = useMainLoopModel_2();
  let effortValue_2 = parseUserSpecifiedModel(mainLoopModel);
  let modelDisplayName = renderModelSetting(mainLoopModel);
  let { version, cwd, billingType, agentName: agentNameFromSettings } = getLogoDisplayData();
  let pe = agent ?? agentNameFromSettings;
  let xe;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    xe = justSwitchedRenderer();
    $[2] = xe;
  } else xe = $[2];
  let ge = xe !== undefined;
  let showGuestPassesUpsell = useIsFullscreen();
  let entrance = useClawdEntranceAnimation(k && showGuestPassesUpsell);
  let ultracode = useAppState(selectUltracode);
  let Fe = jsxProd_default(AnimatedClawdLogo, {
    fullscreen: showGuestPassesUpsell,
    entrance,
    ultra: isUltracodeActive(ultracode, effortValue_2),
  });
  let showOverageCreditUpsell = useNoticeImpressionEnabled();
  let me = showSwarmFooterGate();
  let se = BridgeStatusIndicator(showGuestPassesUpsell && showOverageCreditUpsell && !me);
  let _e = showGuestPassesUpsell && showOverageCreditUpsell;
  let oe;
  if ($[3] !== _e) {
    oe = (ve) => (_e ? viewedAgentTask(ve)?.model : undefined);
    $[3] = _e;
    $[4] = oe;
  } else oe = $[4];
  let appState = useAppState(oe);
  let He = appState ? displayModelName(appState) : undefined;
  let Ue;
  if ($[5] !== _e) {
    Ue = (lt) => (_e ? viewedAgentTask(lt)?.effort : undefined);
    $[5] = _e;
    $[6] = Ue;
  } else Ue = $[6];
  let appState_2 = useAppState(Ue);
  let ae;
  if ($[7] !== _e) {
    ae = (tt) => _e && viewedTaskParts(tt.viewingAgentTaskId, tt.tasks).teammate !== undefined;
    $[7] = _e;
    $[8] = ae;
  } else ae = $[8];
  let appState_3 = useAppState(ae);
  let textWidth = Math.max(columns - 15, 20);
  let truncatedVersion = isScreenReaderEnabled ? version : truncate(version, Math.max(textWidth - 13, 6));
  let Qe = modelDisplayName + getEffortSuffix(effortValue_2, effortValue);
  let modelName = He
    ? renderModelSetting(He) +
      getEffortSuffix(
        parseUserSpecifiedModel(He),
        appState_3 ? undefined : effortValue,
        effortLevelOf(appState_2),
      )
    : Qe;
  let Ze = null;
  let pt = 0;
  let Xt;
  let rt;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    rt = getProTrialStatus();
    Xt = proTrialBadgeText(rt);
    $[9] = Xt;
    $[10] = rt;
  } else {
    Xt = $[9];
    rt = $[10];
  }
  let qe = Xt;
  if (qe) {
    if ($[11] === MEMO_CACHE_SENTINEL) {
      pt = bunStringWidth(` \xB7 ${qe}`);
      Ze = jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 ",
          }),
          jsxProd_default(Text, {
            color: rt.status === "expired" ? "suggestion" : "warning",
            children: qe,
          }),
        ],
      });
      $[11] = pt;
      $[12] = Ze;
    } else {
      pt = $[11];
      Ze = $[12];
    }
  }
  let { shouldSplit, truncatedModel, truncatedBilling } = isScreenReaderEnabled
    ? {
        shouldSplit: false,
        truncatedModel: modelName,
        truncatedBilling: billingType,
      }
    : formatModelAndBilling(modelName, billingType, textWidth - pt, Qe);
  let Ot;
  if ($[13] !== se) {
    Ot = se ? 3 + bunStringWidth(rcPillLabel(se.label)) : 0;
    $[13] = se;
    $[14] = Ot;
  } else Ot = $[14];
  let It = Ot;
  let kt = (pe ? textWidth - 1 - bunStringWidth(pe) - 3 : textWidth) - It;
  let to = isScreenReaderEnabled ? cwd : truncatePathForDisplay(cwd, Math.max(kt, 10));
  const de = pe && `@${pe}`;
  let le;
  if ($[15] !== de || $[16] !== to) {
    le = [de, to].filter(Boolean);
    $[15] = de;
    $[16] = to;
    $[17] = le;
  } else le = $[17];
  let joined = le.join(" \xB7 ");
  let st;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    st = jsxProd_default(Text, {
      bold: true,
      children: "Claude Code",
    });
    $[18] = st;
  } else st = $[18];
  let Ge;
  if ($[19] !== truncatedVersion) {
    Ge = jsxProd_default_2(Text, {
      children: [
        st,
        " ",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["v", truncatedVersion],
        }),
      ],
    });
    $[19] = truncatedVersion;
    $[20] = Ge;
  } else Ge = $[20];
  let Ve;
  if ($[21] !== shouldSplit || $[22] !== Ze || $[23] !== truncatedBilling || $[24] !== truncatedModel) {
    Ve = shouldSplit
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
                Ze,
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
            Ze,
          ],
        });
    $[21] = shouldSplit;
    $[22] = Ze;
    $[23] = truncatedBilling;
    $[24] = truncatedModel;
    $[25] = Ve;
  } else Ve = $[25];
  let ze;
  if ($[26] !== joined || $[27] !== se) {
    ze = se
      ? jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default_2(Text, {
              dimColor: true,
              wrap: "truncate-start",
              children: [joined, " \xB7 "],
            }),
            jsxProd_default(RemoteControlPill_2, {
              status: se,
            }),
          ],
        })
      : joined &&
        jsxProd_default(Text, {
          dimColor: true,
          children: joined,
        });
    $[26] = joined;
    $[27] = se;
    $[28] = ze;
  } else ze = $[28];
  let At;
  if ($[29] !== Ge || $[30] !== Ve || $[31] !== ze) {
    At = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Ge, Ve, ze],
    });
    $[29] = Ge;
    $[30] = Ve;
    $[31] = ze;
    $[32] = At;
  } else At = $[32];
  let ut;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    ut =
      ge &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        flexDirection: "column",
        marginTop: 1,
        children: jsxProd_default(RendererSwitchNotice, {}),
      });
    $[33] = ut;
  } else ut = $[33];
  let jt = jsxProd_default_2(Box, {
    flexDirection: "column",
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "row",
        gap: 2,
        alignItems: "center",
        children: [Fe, At],
      }),
      ut,
    ],
  });
  return showGuestPassesUpsell
    ? jt
    : jsxProd_default(FreezeWhenOffscreen, {
        children: jt,
      });
}
//@ chunk-ag5x7vhf.js:64759-65228 placement
/**
 * 精简 Logo 里可点击的 Remote Control 状态胶囊：悬停高亮，点击时打点并放行默认行为。
 */
function RemoteControlPill_2(props) {
  let k = w(10);
  let { status } = props;
  let [x, T] = y(false);
  let onClick;
  if (k[0] !== status.label) {
    onClick = (I) => {
      logRcPillClicked("click", rcPillLabel(status.label));
      I.allowDefault();
    };
    k[0] = status.label;
    k[1] = onClick;
  } else onClick = k[1];
  let onMouseEnter;
  let onMouseLeave;
  if (k[2] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => T(true);
    onMouseLeave = () => T(false);
    k[2] = onMouseEnter;
    k[3] = onMouseLeave;
  } else {
    onMouseEnter = k[2];
    onMouseLeave = k[3];
  }
  let children;
  if (k[4] !== x || k[5] !== status) {
    children = jsxProd_default(RemoteControlStatus, {
      status,
      highlighted: x,
    });
    k[4] = x;
    k[5] = status;
    k[6] = children;
  } else children = k[6];
  let V;
  if (k[7] !== onClick || k[8] !== children) {
    V = jsxProd_default(Box, {
      flexShrink: 0,
      onClick,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    k[7] = onClick;
    k[8] = children;
    k[9] = V;
  } else V = k[9];
  return V;
}
//@ chunk-ag5x7vhf.js:65228-65318 placement
function viewedAgentTask(m) {
  let { teammate, localAgent } = viewedTaskParts(m.viewingAgentTaskId, m.tasks);
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
