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
import { Me } from "../design-system/ThemeProvider.js";
import { y, P, j, qt, Se } from "../../../vendor/react/cjs/react.production.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useAppState } from "../../state/AppState.js";
import { dg } from "../../context/QueuedMessageContext.js";
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
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { isUltracodeActive, getEffortSuffix } from "../../utils/effort.js";
import { Oy } from "../PromptInput/footerGates.js";
import { BridgeStatusIndicator } from "../PromptInput/PromptInputFooter.js";
import { displayModelName } from "../../utils/model/validateModel.js";
import { viewedTaskParts } from "../../state/teammateViewHelpers.js";
import { truncate } from "../../utils/format.js";
import { OAr } from "../../utils/transcriptDiagnostics.js";
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
  uiSignals.clawdEntranceTaken = !0;
  let m = filterEntranceAnimations(CLAWD_ANIMATION_NAMES, chalkForChart());
  return m[Math.floor(Math.random() * m.length)];
}
//@ chunk-ag5x7vhf.js:57055-57344 placement
function useClawdEntranceAnimation(m) {
  let $ = w(6),
    { storageV5: storageV5 } = Me(),
    T;
  if ($[0] !== m) ((T = () => (m ? pickClawdEntranceAnimation() : void 0)), ($[0] = m), ($[1] = T));
  else T = $[1];
  let [k] = y(T),
    _,
    I;
  if ($[2] !== k || $[3] !== storageV5)
    ((_ = () => {
      if (k === void 0 || !isNewerClawdEntranceVersion(getGlobalConfig().lastClawdEntranceVersion)) {
        return;
      }
      saveGlobalConfig(markClawdEntranceSeen, storageV5);
    }),
      (I = [k, storageV5]),
      ($[2] = k),
      ($[3] = storageV5),
      ($[4] = _),
      ($[5] = I));
  else ((_ = $[4]), (I = $[5]));
  return (P(_, I), k);
}
//@ chunk-ag5x7vhf.js:57344-57348 placement
j();
//@ chunk-ag5x7vhf.js:61638-61729 placement
function claimNoticeImpression(m) {
  let countedNoticeImpressions = announcementState().countedNoticeImpressions;
  if (countedNoticeImpressions.has(m)) return !1;
  return (countedNoticeImpressions.add(m), !0);
}
//@ chunk-ag5x7vhf.js:61729-61789 placement
function hasNoticeImpression(m) {
  return announcementState().countedNoticeImpressions.has(m);
}
//@ chunk-ag5x7vhf.js:61789-61803 placement
var hr = qt(!0);
//@ chunk-ag5x7vhf.js:61803-61831 placement
function Dt() {
  return Se(hr);
}
//@ chunk-ag5x7vhf.js:61831-61926 placement
function at(m, h, { enabled: x = !0 } = {}) {
  let T = Dt();
  P(() => {
    if (!x || !T) return;
    if (claimNoticeImpression(m)) h();
  }, [x, T, m, h]);
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
  let $ = w(34),
    x;
  if ($[0] !== m) ((x = m === void 0 ? {} : m), ($[0] = m), ($[1] = x));
  else x = $[1];
  let { oneShotsAllowed: oneShotsAllowed } = x,
    k = oneShotsAllowed === void 0 ? !0 : oneShotsAllowed,
    { columns: columns } = useTerminalSize(),
    I = useIsScreenReaderEnabled(),
    agent = useAppState(selectAgent),
    A = dg(),
    L = useMainLoopModel_2(),
    effortValue = parseUserSpecifiedModel(L),
    modelDisplayName = renderModelSetting(L),
    {
      version: version,
      cwd: cwd,
      billingType: billingType,
      agentName: agentNameFromSettings,
    } = getLogoDisplayData(),
    pe = agent ?? agentNameFromSettings,
    xe;
  if ($[2] === MEMO_CACHE_SENTINEL) ((xe = justSwitchedRenderer()), ($[2] = xe));
  else xe = $[2];
  let ge = xe !== void 0,
    showGuestPassesUpsell = useIsFullscreen(),
    We = useClawdEntranceAnimation(k && showGuestPassesUpsell),
    ultracode = useAppState(selectUltracode),
    Fe = e(AnimatedClawdLogo, {
      fullscreen: showGuestPassesUpsell,
      entrance: We,
      ultra: isUltracodeActive(ultracode, effortValue),
    }),
    showOverageCreditUpsell = Dt(),
    me = Oy(),
    se = BridgeStatusIndicator(showGuestPassesUpsell && showOverageCreditUpsell && !me),
    _e = showGuestPassesUpsell && showOverageCreditUpsell,
    oe;
  if ($[3] !== _e) ((oe = (ve) => (_e ? viewedAgentTask(ve)?.model : void 0)), ($[3] = _e), ($[4] = oe));
  else oe = $[4];
  let Ee = useAppState(oe),
    He = Ee ? displayModelName(Ee) : void 0,
    Ue;
  if ($[5] !== _e) ((Ue = (lt) => (_e ? viewedAgentTask(lt)?.effort : void 0)), ($[5] = _e), ($[6] = Ue));
  else Ue = $[6];
  let it = useAppState(Ue),
    ae;
  if ($[7] !== _e)
    ((ae = (tt) => _e && viewedTaskParts(tt.viewingAgentTaskId, tt.tasks).teammate !== void 0),
      ($[7] = _e),
      ($[8] = ae));
  else ae = $[8];
  let ct = useAppState(ae),
    textWidth = Math.max(columns - 15, 20),
    $e = I ? version : truncate(version, Math.max(textWidth - 13, 6)),
    Qe = modelDisplayName + getEffortSuffix(effortValue, A),
    Wt = He
      ? renderModelSetting(He) + getEffortSuffix(parseUserSpecifiedModel(He), ct ? void 0 : A, OAr(it))
      : Qe,
    Ze = null,
    pt = 0,
    Xt,
    rt;
  if ($[9] === MEMO_CACHE_SENTINEL)
    ((rt = getProTrialStatus()), (Xt = proTrialBadgeText(rt)), ($[9] = Xt), ($[10] = rt));
  else ((Xt = $[9]), (rt = $[10]));
  let qe = Xt;
  if (qe) {
    if ($[11] === MEMO_CACHE_SENTINEL)
      ((pt = bunStringWidth(` \xB7 ${qe}`)),
        (Ze = r(Text, {
          children: [
            e(Text, { dimColor: !0, children: " \xB7 " }),
            e(Text, { color: rt.status === "expired" ? "suggestion" : "warning", children: qe }),
          ],
        })),
        ($[11] = pt),
        ($[12] = Ze));
    else ((pt = $[11]), (Ze = $[12]));
  }
  let {
      shouldSplit: shouldSplit,
      truncatedModel: truncatedModel,
      truncatedBilling: truncatedBilling,
    } = I
      ? { shouldSplit: !1, truncatedModel: Wt, truncatedBilling: billingType }
      : formatModelAndBilling(Wt, billingType, textWidth - pt, Qe),
    Ot;
  if ($[13] !== se) ((Ot = se ? 3 + bunStringWidth(rcPillLabel(se.label)) : 0), ($[13] = se), ($[14] = Ot));
  else Ot = $[14];
  let It = Ot,
    kt = (pe ? textWidth - 1 - bunStringWidth(pe) - 3 : textWidth) - It,
    to = I ? cwd : truncatePathForDisplay(cwd, Math.max(kt, 10));
  const de = pe && `@${pe}`;
  let le;
  if ($[15] !== de || $[16] !== to)
    ((le = [de, to].filter(Boolean)), ($[15] = de), ($[16] = to), ($[17] = le));
  else le = $[17];
  let joined = le.join(" \xB7 "),
    st;
  if ($[18] === MEMO_CACHE_SENTINEL) ((st = e(Text, { bold: !0, children: "Claude Code" })), ($[18] = st));
  else st = $[18];
  let Ge;
  if ($[19] !== $e)
    ((Ge = r(Text, { children: [st, " ", r(Text, { dimColor: !0, children: ["v", $e] })] })),
      ($[19] = $e),
      ($[20] = Ge));
  else Ge = $[20];
  let Ve;
  if ($[21] !== shouldSplit || $[22] !== Ze || $[23] !== truncatedBilling || $[24] !== truncatedModel)
    ((Ve = shouldSplit
      ? r(Fragment, {
          children: [
            e(Text, { dimColor: !0, children: truncatedModel }),
            r(Text, { children: [e(Text, { dimColor: !0, children: truncatedBilling }), Ze] }),
          ],
        })
      : r(Text, {
          children: [r(Text, { dimColor: !0, children: [truncatedModel, " \xB7 ", truncatedBilling] }), Ze],
        })),
      ($[21] = shouldSplit),
      ($[22] = Ze),
      ($[23] = truncatedBilling),
      ($[24] = truncatedModel),
      ($[25] = Ve));
  else Ve = $[25];
  let ze;
  if ($[26] !== joined || $[27] !== se)
    ((ze = se
      ? r(Box, {
          flexDirection: "row",
          children: [
            r(Text, { dimColor: !0, wrap: "truncate-start", children: [joined, " \xB7 "] }),
            e(RemoteControlPill_2, { status: se }),
          ],
        })
      : joined && e(Text, { dimColor: !0, children: joined })),
      ($[26] = joined),
      ($[27] = se),
      ($[28] = ze));
  else ze = $[28];
  let At;
  if ($[29] !== Ge || $[30] !== Ve || $[31] !== ze)
    ((At = r(Box, { flexDirection: "column", children: [Ge, Ve, ze] })),
      ($[29] = Ge),
      ($[30] = Ve),
      ($[31] = ze),
      ($[32] = At));
  else At = $[32];
  let ut;
  if ($[33] === MEMO_CACHE_SENTINEL)
    ((ut =
      ge &&
      e(Box, {
        paddingLeft: 2,
        flexDirection: "column",
        marginTop: 1,
        children: e(RendererSwitchNotice, {}),
      })),
      ($[33] = ut));
  else ut = $[33];
  let jt = r(Box, {
    flexDirection: "column",
    children: [r(Box, { flexDirection: "row", gap: 2, alignItems: "center", children: [Fe, At] }), ut],
  });
  return showGuestPassesUpsell ? jt : e(FreezeWhenOffscreen, { children: jt });
}
/**
 * 精简 Logo 里可点击的 Remote Control 状态胶囊：悬停高亮，点击时打点并放行默认行为。
 */
//@ chunk-ag5x7vhf.js:64759-65228 placement
function RemoteControlPill_2(m) {
  let k = w(10),
    { status: status } = m,
    [x, T] = y(!1),
    _;
  if (k[0] !== status.label)
    ((_ = (I) => {
      (logRcPillClicked("click", rcPillLabel(status.label)), I.allowDefault());
    }),
      (k[0] = status.label),
      (k[1] = _));
  else _ = k[1];
  let D, A;
  if (k[2] === MEMO_CACHE_SENTINEL) ((D = () => T(!0)), (A = () => T(!1)), (k[2] = D), (k[3] = A));
  else ((D = k[2]), (A = k[3]));
  let L;
  if (k[4] !== x || k[5] !== status)
    ((L = e(RemoteControlStatus, { status: status, highlighted: x })),
      (k[4] = x),
      (k[5] = status),
      (k[6] = L));
  else L = k[6];
  let V;
  if (k[7] !== _ || k[8] !== L)
    ((V = e(Box, { flexShrink: 0, onClick: _, onMouseEnter: D, onMouseLeave: A, children: L })),
      (k[7] = _),
      (k[8] = L),
      (k[9] = V));
  else V = k[9];
  return V;
}
//@ chunk-ag5x7vhf.js:65228-65318 placement
function viewedAgentTask(m) {
  let { teammate: teammate, localAgent: localAgent } = viewedTaskParts(m.viewingAgentTaskId, m.tasks);
  return teammate ?? localAgent;
}

export { hr, hasNoticeImpression, at, Dt, CondensedLogo, claimNoticeImpression };
