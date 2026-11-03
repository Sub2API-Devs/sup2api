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
import { showSwarmFooterGate } from "../../components/PromptInput/footerGates.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { hasNonCommandInput, useLiveStatusFlags, LiveStateRow } from "./LiveStateRow.js";
import { y, P, g5r, init_react_production, yt } from "../../../vendor/react/cjs/react.production.js";
import { useAppState } from "../../state/AppState.js";
import { teleportToRemoteWithErrorHandling_2 } from "../../utils/teleport.js";
import { currentToolPermissionContext } from "../../utils/permissions/currentPermissionContext.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { isDecstbmRendererEnabled } from "../../ink/nativeCursor.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ExportTranscriptView } from "../../utils/exportRenderer.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { TeammateViewHeader } from "../../components/TeammateViewHeader.js";
import { LogoHeader } from "../../components/Messages.js";
import { renderSessionHeaderLine, PendingTaskUpdatesNote } from "../../components/SessionHeader.js";
import { slashCommandLinkSignal } from "../../components/SlashCommandLink.js";
import { AwsAuthStatusBox } from "../../components/AwsAuthStatusBox.js";
import { ScrollAnchor } from "../../ink/screen.js";
import { CodeLine } from "../../components/HighlightedCode.js";
import { QueuedCommandsListMemo, WaitingLines } from "../../components/PromptInput/WaitingMessages.js";
import { DialogHost } from "../../components/dialogs/DialogHost.js";
import { Box } from "../../ink/components/Text.js";
import { subscribeScrollTraceLive, isScrollTraceLiveWatching } from "../../ink/widest-line.js";
import { ScrollKeybindingHandler } from "../../components/ScrollKeybindingHandler.js";

//@ chunk-18hwfzwa.js:1459274-1459338 placement
function isUserOrAssistantMessage(Ir) {
  return Ir.type === "user" || Ir.type === "assistant";
}
//@ chunk-18hwfzwa.js:1459338-1459393 placement
function selectLogoState() {
  return announcementState().isLogoRetired ? "gone" : "logo";
}
//@ chunk-18hwfzwa.js:1459393-1459419 placement
function alwaysFalseMessageArea(Pr) {
  return false;
}
//@ chunk-18hwfzwa.js:1459419-1459454 placement
function selectVerbose4(ts) {
  return ts.verbose;
}
//@ chunk-18hwfzwa.js:1459454-1459483 placement
function createFalseStore() {
  return createStore(false);
}
//@ chunk-18hwfzwa.js:1459483-1459504 placement
var HOME_PAGE = null;
var STATE_ROW_SOURCE_CONTEXT = null;
//@ chunk-18hwfzwa.js:1459504-1459543 placement
function selectUnseenDivider(h) {
  return h.unseenDivider;
}
//@ chunk-18hwfzwa.js:1459543-1463446 placement
/**
 * MessageArea：REPL 消息区，渲染转录、虚拟滚动与固定到底部。
 */
function MessageArea(props) {
  let $ = w(74);
  let {
    scrollPin,
    turn,
    focused,
    tools,
    commands,
    toolProgress,
    showSpinner,
    stateRowYields,
    panelHoldsQueue,
    promptMounted,
    remoteSendsNow,
    waitingLines,
    onRowsDrawn,
    isRemoteSession,
    pauseAnimation,
    hidePlaceholder,
    hideWelcomeChrome,
    historyHidden,
  } = props;
  let isFullscreen = useIsFullscreen();
  let oo = showSwarmFooterGate();
  let { rows } = useTerminalSize();
  let storeSelector = useStoreSelector(turn.stream, hasNonCommandInput);
  let [so] = y(useAppState(teleportToRemoteWithErrorHandling_2));
  let ao;
  if ($[0] !== focused.messages || $[1] !== storeSelector || $[2] !== so) {
    ao = so || storeSelector || focused.messages.some(isUserOrAssistantMessage);
    $[0] = focused.messages;
    $[1] = storeSelector;
    $[2] = so;
    $[3] = ao;
  } else ao = $[3];
  let co = ao;
  let bo =
    HOME_PAGE !== null &&
    oo &&
    focused.isMain &&
    !hideWelcomeChrome &&
    !co &&
    rows >= HOME_PAGE.HOME_PAGE_MIN_PANE_ROWS;
  let [Ao, Bo] = y(selectLogoState);
  let Ro = bo ? "home" : Ao === "home" && focused.isMain ? (co ? "gone" : "logo") : Ao;
  if (Ro !== Ao) Bo(Ro);
  let Ho = oo && Ro === "gone";
  let Io;
  let Wo;
  if ($[4] !== Ho) {
    Io = () => {
      if (Ho) announcementState().isLogoRetired = true;
    };
    Wo = [Ho];
    $[4] = Ho;
    $[5] = Io;
    $[6] = Wo;
  } else {
    Io = $[5];
    Wo = $[6];
  }
  P(Io, Wo);
  let storeSelector_2 = useStoreSelector(scrollPin, selectUnseenDivider);
  let Cn;
  if ($[7] !== focused || $[8] !== isRemoteSession) {
    Cn = {
      focused,
      isRemoteSession,
    };
    $[7] = focused;
    $[8] = isRemoteSession;
    $[9] = Cn;
  } else Cn = $[9];
  let liveStatusFlags = useLiveStatusFlags(Cn);
  let appState = useAppState(alwaysFalseMessageArea);
  let verbose = useAppState(selectVerbose4);
  let kn;
  if (
    $[10] !== focused.isMain ||
    $[11] !== appState ||
    $[12] !== liveStatusFlags ||
    $[13] !== stateRowYields
  ) {
    kn =
      currentToolPermissionContext() &&
      focused.isMain &&
      !appState &&
      !stateRowYields &&
      !liveStatusFlags.remoteBootstrapLive &&
      !liveStatusFlags.replyChannelStatusLive;
    $[10] = focused.isMain;
    $[11] = appState;
    $[12] = liveStatusFlags;
    $[13] = stateRowYields;
    $[14] = kn;
  } else kn = $[14];
  let Fn = kn;
  let [bn] = y(createFalseStore);
  let Go;
  if ($[15] !== bn || $[16] !== Fn || $[17] !== turn.pauseStartTimeRef) {
    Go = Fn
      ? {
          agentId: mainAgentId(),
          pauseStartTimeRef: turn.pauseStartTimeRef,
          liveRowMounted: bn,
        }
      : null;
    $[15] = bn;
    $[16] = Fn;
    $[17] = turn.pauseStartTimeRef;
    $[18] = Go;
  } else Go = $[18];
  let value = Go;
  let liveStateRowMounted = useStoreSelector(bn);
  let source;
  if ($[19] !== focused || $[20] !== turn) {
    source = {
      kind: "live",
      focused,
      turn,
    };
    $[19] = focused;
    $[20] = turn;
    $[21] = source;
  } else source = $[21];
  const unseenDivider = focused.isMain ? storeSelector_2 : undefined;
  const scrollViewport = isFullscreen || isDecstbmRendererEnabled() ? scrollPin.viewport : undefined;
  let on;
  if (
    $[22] !== commands ||
    $[23] !== hidePlaceholder ||
    $[24] !== onRowsDrawn ||
    $[25] !== pauseAnimation ||
    $[26] !== scrollPin.revealRef ||
    $[27] !== source ||
    $[28] !== unseenDivider ||
    $[29] !== scrollViewport ||
    $[30] !== tools ||
    $[31] !== waitingLines
  ) {
    on = jsxProd_default(ExportTranscriptView, {
      source,
      tools,
      commands,
      screen: "prompt",
      pauseAnimation,
      hidePlaceholder,
      waitingLines,
      onRowsDrawn,
      unseenDivider,
      scrollViewport,
      reveal: scrollPin.revealRef,
    });
    $[22] = commands;
    $[23] = hidePlaceholder;
    $[24] = onRowsDrawn;
    $[25] = pauseAnimation;
    $[26] = scrollPin.revealRef;
    $[27] = source;
    $[28] = unseenDivider;
    $[29] = scrollViewport;
    $[30] = tools;
    $[31] = waitingLines;
    $[32] = on;
  } else on = $[32];
  let _o = on;
  const mode = historyHidden ? "hidden" : "visible";
  let Dn;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    Dn = jsxProd_default(TeammateViewHeader, {});
    $[33] = Dn;
  } else Dn = $[33];
  let wn;
  if ($[34] !== bo) {
    wn = bo && HOME_PAGE !== null && jsxProd_default(HOME_PAGE.HomePage, {});
    $[34] = bo;
    $[35] = wn;
  } else wn = $[35];
  const hideWelcomeChrome_2 = hideWelcomeChrome || bo;
  let Kn;
  if ($[36] !== bo || $[37] !== Ho || $[38] !== hideWelcomeChrome_2) {
    Kn = jsxProd_default(LogoHeader, {
      hideWelcomeChrome: hideWelcomeChrome_2,
      homeMessage: bo,
      hideLogo: Ho,
    });
    $[36] = bo;
    $[37] = Ho;
    $[38] = hideWelcomeChrome_2;
    $[39] = Kn;
  } else Kn = $[39];
  let Wn;
  if ($[40] !== hideWelcomeChrome || $[41] !== bo) {
    Wn = !hideWelcomeChrome && !bo && jsxProd_default(renderSessionHeaderLine, {});
    $[40] = hideWelcomeChrome;
    $[41] = bo;
    $[42] = Wn;
  } else Wn = $[42];
  let children;
  if ($[43] !== _o || $[44] !== value) {
    children =
      STATE_ROW_SOURCE_CONTEXT !== null
        ? jsxProd_default(STATE_ROW_SOURCE_CONTEXT.StateRowSourceContext.Provider, {
            value,
            children: _o,
          })
        : _o;
    $[43] = _o;
    $[44] = value;
    $[45] = children;
  } else children = $[45];
  let Zn;
  if ($[46] !== bo || $[47] !== children) {
    Zn = jsxProd_default(slashCommandLinkSignal.Provider, {
      value: bo,
      children,
    });
    $[46] = bo;
    $[47] = children;
    $[48] = Zn;
  } else Zn = $[48];
  let Un;
  if ($[49] !== mode || $[50] !== wn || $[51] !== Kn || $[52] !== Wn || $[53] !== Zn) {
    Un = jsxProd_default_2(g5r, {
      mode,
      children: [Dn, wn, Kn, Wn, Zn],
    });
    $[49] = mode;
    $[50] = wn;
    $[51] = Kn;
    $[52] = Wn;
    $[53] = Zn;
    $[54] = Un;
  } else Un = $[54];
  let dr = Un;
  let or;
  if (
    $[55] !== focused ||
    $[56] !== isFullscreen ||
    $[57] !== historyHidden ||
    $[58] !== isRemoteSession ||
    $[59] !== liveStateRowMounted ||
    $[60] !== panelHoldsQueue ||
    $[61] !== promptMounted ||
    $[62] !== remoteSendsNow ||
    $[63] !== liveStatusFlags ||
    $[64] !== scrollPin ||
    $[65] !== showSpinner ||
    $[66] !== toolProgress ||
    $[67] !== turn ||
    $[68] !== verbose ||
    $[69] !== waitingLines
  ) {
    or =
      !historyHidden &&
      jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(AwsAuthStatusBox, {}),
          jsxProd_default(ScrollAnchor, {}),
          jsxProd_default_2(CodeLine, {
            verbose,
            children: [
              toolProgress,
              jsxProd_default(QueuedCommandsListMemo, {
                turn,
                promptMounted,
              }),
              jsxProd_default(WaitingLines, {
                sendsNow: remoteSendsNow,
                waitingLines,
                turn,
                promptMounted,
              }),
            ],
          }),
          jsxProd_default(DialogHost, {
            scrollRegion: isFullscreen ? scrollPin : undefined,
          }),
          null,
          jsxProd_default(Box, {
            flexGrow: 1,
          }),
          jsxProd_default(LiveStateRow, {
            turn,
            focused,
            showSpinner,
            liveStateRowMounted,
            replacements: liveStatusFlags,
            isRemoteSession,
          }),
          isFullscreen &&
            panelHoldsQueue &&
            jsxProd_default(CodeLine, {
              verbose,
              children: jsxProd_default(PendingTaskUpdatesNote, {}),
            }),
        ],
      });
    $[55] = focused;
    $[56] = isFullscreen;
    $[57] = historyHidden;
    $[58] = isRemoteSession;
    $[59] = liveStateRowMounted;
    $[60] = panelHoldsQueue;
    $[61] = promptMounted;
    $[62] = remoteSendsNow;
    $[63] = liveStatusFlags;
    $[64] = scrollPin;
    $[65] = showSpinner;
    $[66] = toolProgress;
    $[67] = turn;
    $[68] = verbose;
    $[69] = waitingLines;
    $[70] = or;
  } else or = $[70];
  let pr;
  if ($[71] !== dr || $[72] !== or) {
    pr = jsxProd_default_2(Fragment, {
      children: [dr, or],
    });
    $[71] = dr;
    $[72] = or;
    $[73] = pr;
  } else pr = $[73];
  return pr;
}
//@ chunk-18hwfzwa.js:1463446-1463450 placement
init_react_production();
//@ chunk-18hwfzwa.js:1463450-1463951 placement
/**
 * 消息区滚动快捷键处理（模态时用模态视口）。
 */
function MessageScrollHandler(props) {
  let $ = w(6);
  let { scrollPin, modalSlotActive, ultraplanChoiceShowing, isMain } = props;
  let isFullscreen = useIsFullscreen();
  let Re = yt(subscribeScrollTraceLive, isScrollTraceLiveWatching);
  let Be = modalSlotActive && !Re;
  const scrollViewport = Be ? scrollPin.modalViewport : scrollPin.viewport;
  const isActive = isFullscreen && !ultraplanChoiceShowing;
  const onScroll = modalSlotActive
    ? undefined
    : isMain
      ? scrollPin.onUserScroll
      : scrollPin.onUserScrollWithoutDivider;
  const recordsTelemetry = !modalSlotActive && isMain;
  let kt;
  if (
    $[0] !== Be ||
    $[1] !== scrollViewport ||
    $[2] !== isActive ||
    $[3] !== onScroll ||
    $[4] !== recordsTelemetry
  ) {
    kt = jsxProd_default(ScrollKeybindingHandler, {
      scrollViewport,
      isActive,
      onScroll,
      recordsTelemetry,
      yieldsPageKeysWhenContentFits: Be,
    });
    $[0] = Be;
    $[1] = scrollViewport;
    $[2] = isActive;
    $[3] = onScroll;
    $[4] = recordsTelemetry;
    $[5] = kt;
  } else kt = $[5];
  return kt;
}
//@ chunk-18hwfzwa.js:1463951-1463996 placement
var EMPTY_DIVIDER_STATE = {
  dividerY: null,
  unseenDivider: undefined,
};
export { MessageScrollHandler, MessageArea, EMPTY_DIVIDER_STATE };
