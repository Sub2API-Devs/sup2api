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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { showSwarmFooterGate } from "../../components/PromptInput/footerGates.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { hasNonCommandInput, useLiveStatusFlags, LiveStateRow } from "./LiveStateRow.js";
import {
  useState,
  useEffect,
  activityTypeExport,
  init_react_production,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1459274-1459338 placement
function isUserOrAssistantMessage(message) {
  return message.type === "user" || message.type === "assistant";
}
//@ chunk-18hwfzwa.js:1459338-1459393 placement
function selectLogoState() {
  return announcementState().isLogoRetired ? "gone" : "logo";
}
//@ chunk-18hwfzwa.js:1459393-1459419 placement
function alwaysFalseMessageArea(props) {
  return false;
}
//@ chunk-18hwfzwa.js:1459419-1459454 placement
function selectVerbose4(appState) {
  return appState.verbose;
}
//@ chunk-18hwfzwa.js:1459454-1459483 placement
function createFalseStore() {
  return createStore(false);
}
//@ chunk-18hwfzwa.js:1459483-1459504 placement
var HOME_PAGE = null;
var STATE_ROW_SOURCE_CONTEXT = null;
//@ chunk-18hwfzwa.js:1459504-1459543 placement
function selectUnseenDivider(appState) {
  return appState.unseenDivider;
}
//@ chunk-18hwfzwa.js:1459543-1463446 placement
/**
 * MessageArea：REPL 消息区，渲染转录、虚拟滚动与固定到底部。
 */
function MessageArea(props) {
  let $ = useMemoCache(74);
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
  let swarmFooterGate = showSwarmFooterGate();
  let { rows } = useTerminalSize();
  let storeSelector = useStoreSelector(turn.stream, hasNonCommandInput);
  let [teleportHook] = useState(useAppState(teleportToRemoteWithErrorHandling_2));
  let hasContent;
  if ($[0] !== focused.messages || $[1] !== storeSelector || $[2] !== teleportHook) {
    hasContent = teleportHook || storeSelector || focused.messages.some(isUserOrAssistantMessage);
    $[0] = focused.messages;
    $[1] = storeSelector;
    $[2] = teleportHook;
    $[3] = hasContent;
  } else hasContent = $[3];
  let hasVisibleContent = hasContent;
  let showHomePage =
    HOME_PAGE !== null &&
    swarmFooterGate &&
    focused.isMain &&
    !hideWelcomeChrome &&
    !hasVisibleContent &&
    rows >= HOME_PAGE.HOME_PAGE_MIN_PANE_ROWS;
  let [logoState, setLogoState] = useState(selectLogoState);
  let nextLogoState = showHomePage
    ? "home"
    : logoState === "home" && focused.isMain
      ? hasVisibleContent
        ? "gone"
        : "logo"
      : logoState;
  if (nextLogoState !== logoState) setLogoState(nextLogoState);
  let logoRetired = swarmFooterGate && nextLogoState === "gone";
  let retireLogoEffect;
  let retireLogoDeps;
  if ($[4] !== logoRetired) {
    retireLogoEffect = () => {
      if (logoRetired) announcementState().isLogoRetired = true;
    };
    retireLogoDeps = [logoRetired];
    $[4] = logoRetired;
    $[5] = retireLogoEffect;
    $[6] = retireLogoDeps;
  } else {
    retireLogoEffect = $[5];
    retireLogoDeps = $[6];
  }
  useEffect(retireLogoEffect, retireLogoDeps);
  let storeSelector_2 = useStoreSelector(scrollPin, selectUnseenDivider);
  let liveStatusInput;
  if ($[7] !== focused || $[8] !== isRemoteSession) {
    liveStatusInput = {
      focused,
      isRemoteSession,
    };
    $[7] = focused;
    $[8] = isRemoteSession;
    $[9] = liveStatusInput;
  } else liveStatusInput = $[9];
  let liveStatusFlags = useLiveStatusFlags(liveStatusInput);
  let appState = useAppState(alwaysFalseMessageArea);
  let verbose = useAppState(selectVerbose4);
  let liveRowVisible;
  if (
    $[10] !== focused.isMain ||
    $[11] !== appState ||
    $[12] !== liveStatusFlags ||
    $[13] !== stateRowYields
  ) {
    liveRowVisible =
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
    $[14] = liveRowVisible;
  } else liveRowVisible = $[14];
  let showLiveRow = liveRowVisible;
  let [liveRowMountedStore] = useState(createFalseStore);
  let liveRowProps;
  if ($[15] !== liveRowMountedStore || $[16] !== showLiveRow || $[17] !== turn.pauseStartTimeRef) {
    liveRowProps = showLiveRow
      ? {
          agentId: mainAgentId(),
          pauseStartTimeRef: turn.pauseStartTimeRef,
          liveRowMounted: liveRowMountedStore,
        }
      : null;
    $[15] = liveRowMountedStore;
    $[16] = showLiveRow;
    $[17] = turn.pauseStartTimeRef;
    $[18] = liveRowProps;
  } else liveRowProps = $[18];
  let value = liveRowProps;
  let liveStateRowMounted = useStoreSelector(liveRowMountedStore);
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
  let exportView;
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
    exportView = jsxProd_default(ExportTranscriptView, {
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
    $[32] = exportView;
  } else exportView = $[32];
  let exportElement = exportView;
  const mode = historyHidden ? "hidden" : "visible";
  let teammateHeader;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    teammateHeader = jsxProd_default(TeammateViewHeader, {});
    $[33] = teammateHeader;
  } else teammateHeader = $[33];
  let homePageElement;
  if ($[34] !== showHomePage) {
    homePageElement = showHomePage && HOME_PAGE !== null && jsxProd_default(HOME_PAGE.HomePage, {});
    $[34] = showHomePage;
    $[35] = homePageElement;
  } else homePageElement = $[35];
  const hideWelcomeChrome_2 = hideWelcomeChrome || showHomePage;
  let logoHeader;
  if ($[36] !== showHomePage || $[37] !== logoRetired || $[38] !== hideWelcomeChrome_2) {
    logoHeader = jsxProd_default(LogoHeader, {
      hideWelcomeChrome: hideWelcomeChrome_2,
      homeMessage: showHomePage,
      hideLogo: logoRetired,
    });
    $[36] = showHomePage;
    $[37] = logoRetired;
    $[38] = hideWelcomeChrome_2;
    $[39] = logoHeader;
  } else logoHeader = $[39];
  let sessionHeaderLine;
  if ($[40] !== hideWelcomeChrome || $[41] !== showHomePage) {
    sessionHeaderLine = !hideWelcomeChrome && !showHomePage && jsxProd_default(renderSessionHeaderLine, {});
    $[40] = hideWelcomeChrome;
    $[41] = showHomePage;
    $[42] = sessionHeaderLine;
  } else sessionHeaderLine = $[42];
  let children;
  if ($[43] !== exportElement || $[44] !== value) {
    children =
      STATE_ROW_SOURCE_CONTEXT !== null
        ? jsxProd_default(STATE_ROW_SOURCE_CONTEXT.StateRowSourceContext.Provider, {
            value,
            children: exportElement,
          })
        : exportElement;
    $[43] = exportElement;
    $[44] = value;
    $[45] = children;
  } else children = $[45];
  let linkProvider;
  if ($[46] !== showHomePage || $[47] !== children) {
    linkProvider = jsxProd_default(slashCommandLinkSignal.Provider, {
      value: showHomePage,
      children,
    });
    $[46] = showHomePage;
    $[47] = children;
    $[48] = linkProvider;
  } else linkProvider = $[48];
  let messageFrame;
  if (
    $[49] !== mode ||
    $[50] !== homePageElement ||
    $[51] !== logoHeader ||
    $[52] !== sessionHeaderLine ||
    $[53] !== linkProvider
  ) {
    messageFrame = jsxProd_default_2(activityTypeExport, {
      mode,
      children: [teammateHeader, homePageElement, logoHeader, sessionHeaderLine, linkProvider],
    });
    $[49] = mode;
    $[50] = homePageElement;
    $[51] = logoHeader;
    $[52] = sessionHeaderLine;
    $[53] = linkProvider;
    $[54] = messageFrame;
  } else messageFrame = $[54];
  let headerBlock = messageFrame;
  let bodyBlock;
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
    bodyBlock =
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
    $[70] = bodyBlock;
  } else bodyBlock = $[70];
  let areaFragment;
  if ($[71] !== headerBlock || $[72] !== bodyBlock) {
    areaFragment = jsxProd_default_2(Fragment, {
      children: [headerBlock, bodyBlock],
    });
    $[71] = headerBlock;
    $[72] = bodyBlock;
    $[73] = areaFragment;
  } else areaFragment = $[73];
  return areaFragment;
}
//@ chunk-18hwfzwa.js:1463446-1463450 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1463446", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1463450-1463951 placement
/**
 * 消息区滚动快捷键处理（模态时用模态视口）。
 */
function MessageScrollHandler(props) {
  let $ = useMemoCache(6);
  let { scrollPin, modalSlotActive, ultraplanChoiceShowing, isMain } = props;
  let isFullscreen = useIsFullscreen();
  let isTracing = useSyncExternalStore(subscribeScrollTraceLive, isScrollTraceLiveWatching);
  let yieldsPageKeys = modalSlotActive && !isTracing;
  const scrollViewport = yieldsPageKeys ? scrollPin.modalViewport : scrollPin.viewport;
  const isActive = isFullscreen && !ultraplanChoiceShowing;
  const onScroll = modalSlotActive
    ? undefined
    : isMain
      ? scrollPin.onUserScroll
      : scrollPin.onUserScrollWithoutDivider;
  const recordsTelemetry = !modalSlotActive && isMain;
  let scrollHandler;
  if (
    $[0] !== yieldsPageKeys ||
    $[1] !== scrollViewport ||
    $[2] !== isActive ||
    $[3] !== onScroll ||
    $[4] !== recordsTelemetry
  ) {
    scrollHandler = jsxProd_default(ScrollKeybindingHandler, {
      scrollViewport,
      isActive,
      onScroll,
      recordsTelemetry,
      yieldsPageKeysWhenContentFits: yieldsPageKeys,
    });
    $[0] = yieldsPageKeys;
    $[1] = scrollViewport;
    $[2] = isActive;
    $[3] = onScroll;
    $[4] = recordsTelemetry;
    $[5] = scrollHandler;
  } else scrollHandler = $[5];
  return scrollHandler;
}
//@ chunk-18hwfzwa.js:1463951-1463996 placement
var EMPTY_DIVIDER_STATE = {
  dividerY: null,
  unseenDivider: undefined,
};
export { MessageScrollHandler, MessageArea, EMPTY_DIVIDER_STATE };
