/**
 * screens/repl/ReplScreenFrame.tsx
 *
 * 2.1.316 新增。REPL 屏幕框架。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Cr, useAppState } from "../../state/AppState.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useDialogOfKind } from "../../state/dialogQueue.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";
import { Cg } from "../../utils/subagentStatusLine.js";
import { yv } from "./storeHooks.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useBackgroundTaskNavigation } from "../../hooks/useBackgroundTaskNavigation.js";
import { useVoiceIntegration, useVoiceKeybindingHandler } from "../../hooks/useVoiceIntegration.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { ug } from "./ReplEffects.js";
import { zt, P, j } from "../../../vendor/react/cjs/react.production.js";
import { isHumanTurnNotInterrupt } from "../../utils/messages.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useBackgroundWorkItems, b8 } from "../../hooks/useBackgroundWorkItems.js";
import { hasActiveAgentTasks } from "../../tasks/taskStatus.js";
import { useSessionPresence } from "./sessionPresence.js";
import { DAr } from "../../components/messages/UserLocalCommandOutputMessage.js";
import { hV } from "../../components/dialogs/registry.js";
import { Box } from "../../ink/components/Text.js";
import { isMouseTrackingEnabled } from "../../utils/fullscreen.js";
import { AlternateScreen } from "../../ink/components/AlternateScreen.js";

//@ chunk-18hwfzwa.js:1438659-1438702 placement
function selectInputOwnsEscape2(Un) {
  return Un.inputOwnsEscape;
}
//@ chunk-18hwfzwa.js:1438702-1438748 placement = _temp2 (1)
function selectViewingAgentTaskId_5(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:1438748-1438795 placement
function jUo(or) {
  return or.toolProgress.size > 0;
}
/**
 * ReplScreenFrame：REPL 屏幕框架（全屏/经典布局、消息区与输入区的排布）。
 */
//@ chunk-18hwfzwa.js:1438795-1442441 placement
function ReplScreenFrame(h) {
  let $ = w(67),
    {
      fullscreen: fullscreen,
      embedded: embedded,
      screen: screen,
      turn: turn,
      transcript: transcript,
      titles: titles,
      localJsx: localJsx,
      dialogSurface: dialogSurface,
      attachRequests: attachRequests,
      draft: draft,
      scrollPin: scrollPin,
      children: children,
    } = h,
    kt = Cr(),
    { rows: rows } = useTerminalSize(),
    It = useDialogOfKind(LOCAL_JSX_DIALOG.kind),
    Ot = Cg(),
    Et = yv(),
    Dt = Ot && Et !== "INSERT",
    Lt = useStoreSelector(draft, selectInputOwnsEscape2);
  const oo = screen === "transcript";
  let io;
  if ($[0] !== It || $[1] !== Lt || $[2] !== oo)
    ((io = { inputOwnsEscape: Lt, isTranscriptScreen: oo, isPanelOpen: It }),
      ($[0] = It),
      ($[1] = Lt),
      ($[2] = oo),
      ($[3] = io));
  else io = $[3];
  let { handleKeyDown: handleKeyDown, handleKeyDownCapture: handleKeyDownCapture } =
      useBackgroundTaskNavigation(io),
    ao;
  if ($[4] !== draft) ((ao = { composer: draft }), ($[4] = draft), ($[5] = ao));
  else ao = $[5];
  let co = useVoiceIntegration(ao);
  const bo = !It,
    Ao = screen !== "transcript" && !Dt;
  let Bo;
  if (
    $[6] !== draft ||
    $[7] !== bo ||
    $[8] !== Ao ||
    $[9] !== co.cancelRecording ||
    $[10] !== co.handleKeyEvent ||
    $[11] !== co.resetAnchor ||
    $[12] !== co.stripTrailing
  )
    ((Bo = {
      voiceHandleKeyEvent: co.handleKeyEvent,
      voiceCancelRecording: co.cancelRecording,
      stripTrailing: co.stripTrailing,
      resetAnchor: co.resetAnchor,
      isActive: bo,
      composerTakesTypedKeys: Ao,
      composer: draft,
    }),
      ($[6] = draft),
      ($[7] = bo),
      ($[8] = Ao),
      ($[9] = co.cancelRecording),
      ($[10] = co.handleKeyEvent),
      ($[11] = co.resetAnchor),
      ($[12] = co.stripTrailing),
      ($[13] = Bo));
  else Bo = $[13];
  let { handleKeyDown: handleKeyDown_2 } = useVoiceKeybindingHandler(Bo),
    Ho;
  if ($[14] === MEMO_CACHE_SENTINEL) ((Ho = mainAgentId()), ($[14] = Ho));
  else Ho = $[14];
  let { messages: messages } = ug(Ho),
    Wo,
    mn;
  if ($[15] !== messages.length || $[16] !== scrollPin)
    ((Wo = () => {
      scrollPin.setRenderedLength(messages.length);
    }),
      (mn = [scrollPin, messages.length]),
      ($[15] = messages.length),
      ($[16] = scrollPin),
      ($[17] = Wo),
      ($[18] = mn));
  else ((Wo = $[17]), (mn = $[18]));
  zt(Wo, mn);
  let Cn;
  if ($[19] !== messages) {
    let at = messages.at(-1);
    Cn = at != null && isHumanTurnNotInterrupt(at) ? at : void 0;
    (($[19] = messages), ($[20] = Cn));
  } else Cn = $[20];
  let vo = Cn,
    Yo,
    kn;
  if ($[21] !== vo || $[22] !== scrollPin)
    ((Yo = () => {
      if (vo) scrollPin.onUserRowLanded(vo);
    }),
      (kn = [vo, scrollPin]),
      ($[21] = vo),
      ($[22] = scrollPin),
      ($[23] = Yo),
      ($[24] = kn));
  else ((Yo = $[23]), (kn = $[24]));
  P(Yo, kn);
  let Fn = useAppState(selectViewingAgentTaskId_5),
    bn;
  if ($[25] !== scrollPin)
    ((bn = () => {
      scrollPin.repin(!0, "agent-view-change");
    }),
      ($[25] = scrollPin),
      ($[26] = bn));
  else bn = $[26];
  let Go;
  if ($[27] !== Fn) ((Go = [Fn]), ($[27] = Fn), ($[28] = Go));
  else Go = $[28];
  P(bn, Go);
  let hn = useStoreSelector(turn.stream, jUo),
    Mn,
    Xo;
  if ($[29] !== It || $[30] !== hn || $[31] !== scrollPin)
    ((Mn = () => {
      scrollPin.onBelowTranscriptSlotChange(hn || It);
    }),
      (Xo = [scrollPin, hn, It]),
      ($[29] = It),
      ($[30] = hn),
      ($[31] = scrollPin),
      ($[32] = Mn),
      ($[33] = Xo));
  else ((Mn = $[32]), (Xo = $[33]));
  zt(Mn, Xo);
  let Sn;
  if ($[34] !== handleKeyDownCapture || $[35] !== handleKeyDown_2)
    ((Sn = ($n) => {
      if ((handleKeyDown_2($n), !$n.defaultPrevented)) handleKeyDownCapture($n);
    }),
      ($[34] = handleKeyDownCapture),
      ($[35] = handleKeyDown_2),
      ($[36] = Sn));
  else Sn = $[36];
  let on;
  if ($[37] === MEMO_CACHE_SENTINEL) ((on = e(useBackgroundWorkItems, {})), ($[37] = on));
  else on = $[37];
  let _o;
  if ($[38] !== kt || $[39] !== turn.guard.isActive || $[40] !== turn.isExternalLoading)
    ((_o = () => turn.guard.isActive || turn.isExternalLoading || hasActiveAgentTasks(kt.getState().tasks)),
      ($[38] = kt),
      ($[39] = turn.guard.isActive),
      ($[40] = turn.isExternalLoading),
      ($[41] = _o));
  else _o = $[41];
  let cn;
  if ($[42] !== _o || $[43] !== titles || $[44] !== transcript || $[45] !== turn)
    ((cn = e(useSessionPresence, {
      turn: turn,
      guard: turn.guard,
      titles: titles,
      transcript: transcript,
      isSessionWorking: _o,
    })),
      ($[42] = _o),
      ($[43] = titles),
      ($[44] = transcript),
      ($[45] = turn),
      ($[46] = cn));
  else cn = $[46];
  let Dn;
  if ($[47] !== attachRequests || $[48] !== children)
    ((Dn = e(DAr, { value: attachRequests, children: children })),
      ($[47] = attachRequests),
      ($[48] = children),
      ($[49] = Dn));
  else Dn = $[49];
  let wn;
  if ($[50] !== localJsx || $[51] !== Dn)
    ((wn = e(hV, { value: localJsx, children: Dn })), ($[50] = localJsx), ($[51] = Dn), ($[52] = wn));
  else wn = $[52];
  let mr;
  if ($[53] !== dialogSurface || $[54] !== wn)
    ((mr = e(b8, { value: dialogSurface, children: wn })),
      ($[53] = dialogSurface),
      ($[54] = wn),
      ($[55] = mr));
  else mr = $[55];
  let Kn;
  if ($[56] !== handleKeyDown || $[57] !== Sn || $[58] !== cn || $[59] !== mr)
    ((Kn = r(Box, {
      flexDirection: "column",
      flexGrow: 1,
      width: "100%",
      onKeyDownCapture: Sn,
      onKeyDown: handleKeyDown,
      children: [on, cn, mr],
    })),
      ($[56] = handleKeyDown),
      ($[57] = Sn),
      ($[58] = cn),
      ($[59] = mr),
      ($[60] = Kn));
  else Kn = $[60];
  let Wn = Kn;
  if (!fullscreen) {
    return Wn;
  }
  if (embedded) {
    let Fr;
    if ($[61] !== Wn || $[62] !== rows)
      ((Fr = e(Box, { flexDirection: "column", height: rows, width: "100%", flexShrink: 0, children: Wn })),
        ($[61] = Wn),
        ($[62] = rows),
        ($[63] = Fr));
    else Fr = $[63];
    return Fr;
  }
  let Fr;
  if ($[64] === MEMO_CACHE_SENTINEL) ((Fr = isMouseTrackingEnabled()), ($[64] = Fr));
  else Fr = $[64];
  let Zn;
  if ($[65] !== Wn)
    ((Zn = e(AlternateScreen, { mouseTracking: Fr, children: Wn })), ($[65] = Wn), ($[66] = Zn));
  else Zn = $[66];
  return Zn;
}
//@ chunk-18hwfzwa.js:1442441-1442445 placement
j();
//@ chunk-18hwfzwa.js:1442445-1442484 placement
function selectIsBriefOnly2(Dt) {
  return Dt.isBriefOnly;
}
//@ chunk-18hwfzwa.js:1442484-1442521 placement
function selectUltracode2(Lt) {
  return Lt.ultracode;
}
//@ chunk-18hwfzwa.js:1442521-1442557 placement
function selectFastMode(oo) {
  return oo.fastMode;
}

export { ReplScreenFrame, selectIsBriefOnly2, selectUltracode2, selectFastMode };
