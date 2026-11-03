/**
 * screens/repl/MessageArea.tsx
 *
 * 2.1.316 新增。REPL 消息区。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (11)
 * attribution: placement 11
 */
import { announcementState } from "../../services/announcements/announcementState.js";
import { createStore } from "../../state/store.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { Oy } from "../../components/PromptInput/footerGates.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { hasNonCommandInput, useLiveStatusFlags, LiveStateRow } from "./LiveStateRow.js";
import { y, P, g5r, j, yt } from "../../../vendor/react/cjs/react.production.js";
import { useAppState } from "../../state/AppState.js";
import { teleportToRemoteWithErrorHandling_2 } from "../../utils/teleport.js";
import { tE } from "../../utils/permissions/currentPermissionContext.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { isDecstbmRendererEnabled } from "../../ink/nativeCursor.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ExportTranscriptView } from "../../utils/exportRenderer.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { TeammateViewHeader } from "../../components/TeammateViewHeader.js";
import { LogoHeader } from "../../components/Messages.js";
import { iee, PendingTaskUpdatesNote } from "../../components/SessionHeader.js";
import { ynn } from "../../components/SlashCommandLink.js";
import { AwsAuthStatusBox } from "../../components/AwsAuthStatusBox.js";
import { ScrollAnchor } from "../../ink/screen.js";
import { CodeLine } from "../../components/HighlightedCode.js";
import { rse, WaitingLines } from "../../components/PromptInput/WaitingMessages.js";
import { DialogHost } from "../../components/dialogs/DialogHost.js";
import { Box } from "../../ink/components/Text.js";
import { subscribeScrollTraceLive, isScrollTraceLiveWatching } from "../../ink/widest-line.js";
import { ScrollKeybindingHandler } from "../../components/ScrollKeybindingHandler.js";

//@ chunk-18hwfzwa.js:1459274-1459338 placement
function bqo(Ir) {
  return Ir.type === "user" || Ir.type === "assistant";
}
//@ chunk-18hwfzwa.js:1459338-1459393 placement
function wqo() {
  return announcementState().isLogoRetired ? "gone" : "logo";
}
//@ chunk-18hwfzwa.js:1459393-1459419 placement
function kqo(Pr) {
  return !1;
}
//@ chunk-18hwfzwa.js:1459419-1459454 placement
function selectVerbose4(ts) {
  return ts.verbose;
}
//@ chunk-18hwfzwa.js:1459454-1459483 placement
function Cqo() {
  return createStore(!1);
}
//@ chunk-18hwfzwa.js:1459483-1459504 placement
var wx = null,
  Vee = null;
//@ chunk-18hwfzwa.js:1459504-1459543 placement
function selectUnseenDivider(h) {
  return h.unseenDivider;
}
/**
 * MessageArea：REPL 消息区，渲染转录、虚拟滚动与固定到底部。
 */
//@ chunk-18hwfzwa.js:1459543-1463446 placement
function MessageArea(h) {
  let $ = w(74),
    {
      scrollPin: scrollPin,
      turn: turn,
      focused: focused,
      tools: tools,
      commands: commands,
      toolProgress: toolProgress,
      showSpinner: showSpinner,
      stateRowYields: stateRowYields,
      panelHoldsQueue: panelHoldsQueue,
      promptMounted: promptMounted,
      remoteSendsNow: remoteSendsNow,
      waitingLines: waitingLines,
      onRowsDrawn: onRowsDrawn,
      isRemoteSession: isRemoteSession,
      pauseAnimation: pauseAnimation,
      hidePlaceholder: hidePlaceholder,
      hideWelcomeChrome: hideWelcomeChrome,
      historyHidden: historyHidden,
    } = h,
    Lt = useIsFullscreen(),
    oo = Oy(),
    { rows: rows } = useTerminalSize(),
    io = useStoreSelector(turn.stream, hasNonCommandInput),
    [so] = y(useAppState(teleportToRemoteWithErrorHandling_2)),
    ao;
  if ($[0] !== focused.messages || $[1] !== io || $[2] !== so)
    ((ao = so || io || focused.messages.some(bqo)),
      ($[0] = focused.messages),
      ($[1] = io),
      ($[2] = so),
      ($[3] = ao));
  else ao = $[3];
  let co = ao,
    bo =
      wx !== null && oo && focused.isMain && !hideWelcomeChrome && !co && rows >= wx.HOME_PAGE_MIN_PANE_ROWS,
    [Ao, Bo] = y(wqo),
    Ro = bo ? "home" : Ao === "home" && focused.isMain ? (co ? "gone" : "logo") : Ao;
  if (Ro !== Ao) Bo(Ro);
  let Ho = oo && Ro === "gone",
    Io,
    Wo;
  if ($[4] !== Ho)
    ((Io = () => {
      if (Ho) announcementState().isLogoRetired = !0;
    }),
      (Wo = [Ho]),
      ($[4] = Ho),
      ($[5] = Io),
      ($[6] = Wo));
  else ((Io = $[5]), (Wo = $[6]));
  P(Io, Wo);
  let mn = useStoreSelector(scrollPin, selectUnseenDivider),
    Cn;
  if ($[7] !== focused || $[8] !== isRemoteSession)
    ((Cn = { focused: focused, isRemoteSession: isRemoteSession }),
      ($[7] = focused),
      ($[8] = isRemoteSession),
      ($[9] = Cn));
  else Cn = $[9];
  let No = useLiveStatusFlags(Cn),
    vo = useAppState(kqo),
    Yo = useAppState(selectVerbose4),
    kn;
  if ($[10] !== focused.isMain || $[11] !== vo || $[12] !== No || $[13] !== stateRowYields)
    ((kn =
      tE() &&
      focused.isMain &&
      !vo &&
      !stateRowYields &&
      !No.remoteBootstrapLive &&
      !No.replyChannelStatusLive),
      ($[10] = focused.isMain),
      ($[11] = vo),
      ($[12] = No),
      ($[13] = stateRowYields),
      ($[14] = kn));
  else kn = $[14];
  let Fn = kn,
    [bn] = y(Cqo),
    Go;
  if ($[15] !== bn || $[16] !== Fn || $[17] !== turn.pauseStartTimeRef)
    ((Go = Fn
      ? { agentId: mainAgentId(), pauseStartTimeRef: turn.pauseStartTimeRef, liveRowMounted: bn }
      : null),
      ($[15] = bn),
      ($[16] = Fn),
      ($[17] = turn.pauseStartTimeRef),
      ($[18] = Go));
  else Go = $[18];
  let hn = Go,
    Mn = useStoreSelector(bn),
    Xo;
  if ($[19] !== focused || $[20] !== turn)
    ((Xo = { kind: "live", focused: focused, turn: turn }), ($[19] = focused), ($[20] = turn), ($[21] = Xo));
  else Xo = $[21];
  const Sn = focused.isMain ? mn : void 0,
    $n = Lt || isDecstbmRendererEnabled() ? scrollPin.viewport : void 0;
  let on;
  if (
    $[22] !== commands ||
    $[23] !== hidePlaceholder ||
    $[24] !== onRowsDrawn ||
    $[25] !== pauseAnimation ||
    $[26] !== scrollPin.revealRef ||
    $[27] !== Xo ||
    $[28] !== Sn ||
    $[29] !== $n ||
    $[30] !== tools ||
    $[31] !== waitingLines
  )
    ((on = e(ExportTranscriptView, {
      source: Xo,
      tools: tools,
      commands: commands,
      screen: "prompt",
      pauseAnimation: pauseAnimation,
      hidePlaceholder: hidePlaceholder,
      waitingLines: waitingLines,
      onRowsDrawn: onRowsDrawn,
      unseenDivider: Sn,
      scrollViewport: $n,
      reveal: scrollPin.revealRef,
    })),
      ($[22] = commands),
      ($[23] = hidePlaceholder),
      ($[24] = onRowsDrawn),
      ($[25] = pauseAnimation),
      ($[26] = scrollPin.revealRef),
      ($[27] = Xo),
      ($[28] = Sn),
      ($[29] = $n),
      ($[30] = tools),
      ($[31] = waitingLines),
      ($[32] = on));
  else on = $[32];
  let _o = on;
  const cn = historyHidden ? "hidden" : "visible";
  let Dn;
  if ($[33] === MEMO_CACHE_SENTINEL) ((Dn = e(TeammateViewHeader, {})), ($[33] = Dn));
  else Dn = $[33];
  let wn;
  if ($[34] !== bo) ((wn = bo && wx !== null && e(wx.HomePage, {})), ($[34] = bo), ($[35] = wn));
  else wn = $[35];
  const mr = hideWelcomeChrome || bo;
  let Kn;
  if ($[36] !== bo || $[37] !== Ho || $[38] !== mr)
    ((Kn = e(LogoHeader, { hideWelcomeChrome: mr, homeMessage: bo, hideLogo: Ho })),
      ($[36] = bo),
      ($[37] = Ho),
      ($[38] = mr),
      ($[39] = Kn));
  else Kn = $[39];
  let Wn;
  if ($[40] !== hideWelcomeChrome || $[41] !== bo)
    ((Wn = !hideWelcomeChrome && !bo && e(iee, {})), ($[40] = hideWelcomeChrome), ($[41] = bo), ($[42] = Wn));
  else Wn = $[42];
  let Fr;
  if ($[43] !== _o || $[44] !== hn)
    ((Fr = Vee !== null ? e(Vee.StateRowSourceContext.Provider, { value: hn, children: _o }) : _o),
      ($[43] = _o),
      ($[44] = hn),
      ($[45] = Fr));
  else Fr = $[45];
  let Zn;
  if ($[46] !== bo || $[47] !== Fr)
    ((Zn = e(ynn.Provider, { value: bo, children: Fr })), ($[46] = bo), ($[47] = Fr), ($[48] = Zn));
  else Zn = $[48];
  let Un;
  if ($[49] !== cn || $[50] !== wn || $[51] !== Kn || $[52] !== Wn || $[53] !== Zn)
    ((Un = r(g5r, { mode: cn, children: [Dn, wn, Kn, Wn, Zn] })),
      ($[49] = cn),
      ($[50] = wn),
      ($[51] = Kn),
      ($[52] = Wn),
      ($[53] = Zn),
      ($[54] = Un));
  else Un = $[54];
  let dr = Un,
    or;
  if (
    $[55] !== focused ||
    $[56] !== Lt ||
    $[57] !== historyHidden ||
    $[58] !== isRemoteSession ||
    $[59] !== Mn ||
    $[60] !== panelHoldsQueue ||
    $[61] !== promptMounted ||
    $[62] !== remoteSendsNow ||
    $[63] !== No ||
    $[64] !== scrollPin ||
    $[65] !== showSpinner ||
    $[66] !== toolProgress ||
    $[67] !== turn ||
    $[68] !== Yo ||
    $[69] !== waitingLines
  )
    ((or =
      !historyHidden &&
      r(Fragment, {
        children: [
          e(AwsAuthStatusBox, {}),
          e(ScrollAnchor, {}),
          r(CodeLine, {
            verbose: Yo,
            children: [
              toolProgress,
              e(rse, { turn: turn, promptMounted: promptMounted }),
              e(WaitingLines, {
                sendsNow: remoteSendsNow,
                waitingLines: waitingLines,
                turn: turn,
                promptMounted: promptMounted,
              }),
            ],
          }),
          e(DialogHost, { scrollRegion: Lt ? scrollPin : void 0 }),
          null,
          e(Box, { flexGrow: 1 }),
          e(LiveStateRow, {
            turn: turn,
            focused: focused,
            showSpinner: showSpinner,
            liveStateRowMounted: Mn,
            replacements: No,
            isRemoteSession: isRemoteSession,
          }),
          Lt && panelHoldsQueue && e(CodeLine, { verbose: Yo, children: e(PendingTaskUpdatesNote, {}) }),
        ],
      })),
      ($[55] = focused),
      ($[56] = Lt),
      ($[57] = historyHidden),
      ($[58] = isRemoteSession),
      ($[59] = Mn),
      ($[60] = panelHoldsQueue),
      ($[61] = promptMounted),
      ($[62] = remoteSendsNow),
      ($[63] = No),
      ($[64] = scrollPin),
      ($[65] = showSpinner),
      ($[66] = toolProgress),
      ($[67] = turn),
      ($[68] = Yo),
      ($[69] = waitingLines),
      ($[70] = or));
  else or = $[70];
  let pr;
  if ($[71] !== dr || $[72] !== or)
    ((pr = r(Fragment, { children: [dr, or] })), ($[71] = dr), ($[72] = or), ($[73] = pr));
  else pr = $[73];
  return pr;
}
//@ chunk-18hwfzwa.js:1463446-1463450 placement
j();
/**
 * 消息区滚动快捷键处理（模态时用模态视口）。
 */
//@ chunk-18hwfzwa.js:1463450-1463951 placement
function MessageScrollHandler(h) {
  let $ = w(6),
    {
      scrollPin: scrollPin,
      modalSlotActive: modalSlotActive,
      ultraplanChoiceShowing: ultraplanChoiceShowing,
      isMain: isMain,
    } = h,
    ke = useIsFullscreen(),
    Re = yt(subscribeScrollTraceLive, isScrollTraceLiveWatching),
    Be = modalSlotActive && !Re;
  const He = Be ? scrollPin.modalViewport : scrollPin.viewport,
    We = ke && !ultraplanChoiceShowing,
    ze = modalSlotActive ? void 0 : isMain ? scrollPin.onUserScroll : scrollPin.onUserScrollWithoutDivider,
    Xe = !modalSlotActive && isMain;
  let kt;
  if ($[0] !== Be || $[1] !== He || $[2] !== We || $[3] !== ze || $[4] !== Xe)
    ((kt = e(ScrollKeybindingHandler, {
      scrollViewport: He,
      isActive: We,
      onScroll: ze,
      recordsTelemetry: Xe,
      yieldsPageKeysWhenContentFits: Be,
    })),
      ($[0] = Be),
      ($[1] = He),
      ($[2] = We),
      ($[3] = ze),
      ($[4] = Xe),
      ($[5] = kt));
  else kt = $[5];
  return kt;
}
//@ chunk-18hwfzwa.js:1463951-1463996 placement
var hkt = { dividerY: null, unseenDivider: void 0 };

export { MessageScrollHandler, MessageArea, hkt };
