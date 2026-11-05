/**
 * screens/repl/MessageArea.tsx
 *
 * 2.1.316 新增。REPL 消息区。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (10)
 * attribution: placement 9, layout 1
 */
import {
  init_react_production,
  useState,
  activityTypeExport,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import { createStore } from "../../state/store.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { showSwarmFooterGate } from "../../components/PromptInput/footerGates.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { hasNonCommandInput, useLiveStatusFlags, LiveStateRow } from "./LiveStateRow.js";
import { useAppState } from "../../state/AppState.js";
import { teleportToRemoteWithErrorHandling_2 } from "../../utils/teleport.js";
import { useLogoRetirement } from "./logoRetire.js";
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
import { slashCommandLinkSignal, slashCommandLinkContext } from "../../components/SlashCommandLink.js";
import { AwsAuthStatusBox } from "../../components/AwsAuthStatusBox.js";
import { ScrollAnchor } from "../../ink/screen.js";
import { CodeLine } from "../../components/HighlightedCode.js";
import { MemoizedQueuedCommandsList, WaitingLines } from "../../components/PromptInput/WaitingMessages.js";
import { DialogHost } from "../../components/dialogs/DialogHost.js";
import { Box } from "../../ink/components/Text.js";
import { subscribeScrollTraceLive, isScrollTraceLiveWatching } from "../../ink/widest-line.js";
import { ScrollKeybindingHandler } from "../../components/ScrollKeybindingHandler.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1495068-1495072 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1495068", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1500486-1500550 placement
function isUserOrAssistantMessage(message) {
  return message.type === "user" || message.type === "assistant";
}
//@ chunk-czq1j3j2.js:1500550-1500576 placement
function alwaysFalseMessageArea(props) {
  return false;
}
//@ chunk-czq1j3j2.js:1500576-1500611 placement
function selectVerbose4(appState) {
  return appState.verbose;
}
//@ chunk-czq1j3j2.js:1500611-1500640 placement
function createFalseStore() {
  return createStore(false);
}
//@ chunk-czq1j3j2.js:1500640-1500661 layout
var coordinatorContextCache = null;
var stateRowSource = null;
//@ chunk-czq1j3j2.js:1500661-1500700 placement
function selectUnseenDivider(appState) {
  return appState.unseenDivider;
}
//@ chunk-czq1j3j2.js:1500700-1504788 placement
/**
 * MessageArea：REPL 消息区，渲染转录、虚拟滚动与固定到底部。
 */
function MessageArea(props) {
  let $ = useMemoCache(79);
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
  let logoRetired =
    coordinatorContextCache !== null &&
    swarmFooterGate &&
    focused.isMain &&
    !hideWelcomeChrome &&
    !hasVisibleContent &&
    rows >= coordinatorContextCache.HOME_PAGE_MIN_PANE_ROWS;
  let retireLogoEffect;
  if ($[4] !== focused.isMain || $[5] !== hasVisibleContent || $[6] !== logoRetired) {
    retireLogoEffect = {
      isHome: logoRetired,
      isMain: focused.isMain,
      hasConversationStarted: hasVisibleContent,
    };
    $[4] = focused.isMain;
    $[5] = hasVisibleContent;
    $[6] = logoRetired;
    $[7] = retireLogoEffect;
  } else retireLogoEffect = $[7];
  let { phase, fadeStep } = useLogoRetirement(retireLogoEffect);
  let showHomePage = logoRetired || phase === "leaving";
  let storeSelector_2 = useStoreSelector(scrollPin, selectUnseenDivider);
  let liveStatusInput;
  if ($[8] !== focused || $[9] !== isRemoteSession) {
    liveStatusInput = {
      focused,
      isRemoteSession,
    };
    $[8] = focused;
    $[9] = isRemoteSession;
    $[10] = liveStatusInput;
  } else liveStatusInput = $[10];
  let liveStatusFlags = useLiveStatusFlags(liveStatusInput);
  let appState = useAppState(alwaysFalseMessageArea);
  let verbose = useAppState(selectVerbose4);
  let liveRowVisible;
  if (
    $[11] !== focused.isMain ||
    $[12] !== appState ||
    $[13] !== liveStatusFlags ||
    $[14] !== stateRowYields
  ) {
    liveRowVisible =
      currentToolPermissionContext() &&
      focused.isMain &&
      !appState &&
      !stateRowYields &&
      !liveStatusFlags.remoteBootstrapLive &&
      !liveStatusFlags.replyChannelStatusLive;
    $[11] = focused.isMain;
    $[12] = appState;
    $[13] = liveStatusFlags;
    $[14] = stateRowYields;
    $[15] = liveRowVisible;
  } else liveRowVisible = $[15];
  let showLiveRow = liveRowVisible;
  let [liveRowMountedStore] = useState(createFalseStore);
  let liveRowProps;
  if ($[16] !== liveRowMountedStore || $[17] !== showLiveRow || $[18] !== turn.pauseStartTimeRef) {
    liveRowProps = showLiveRow
      ? {
          agentId: mainAgentId(),
          pauseStartTimeRef: turn.pauseStartTimeRef,
          liveRowMounted: liveRowMountedStore,
        }
      : null;
    $[16] = liveRowMountedStore;
    $[17] = showLiveRow;
    $[18] = turn.pauseStartTimeRef;
    $[19] = liveRowProps;
  } else liveRowProps = $[19];
  let value = liveRowProps;
  let liveStateRowMounted = useStoreSelector(liveRowMountedStore);
  let source;
  if ($[20] !== focused || $[21] !== turn) {
    source = {
      kind: "live",
      focused,
      turn,
    };
    $[20] = focused;
    $[21] = turn;
    $[22] = source;
  } else source = $[22];
  const unseenDivider = focused.isMain ? storeSelector_2 : undefined;
  const scrollViewport = isFullscreen || isDecstbmRendererEnabled() ? scrollPin.viewport : undefined;
  let exportView;
  if (
    $[23] !== commands ||
    $[24] !== hidePlaceholder ||
    $[25] !== onRowsDrawn ||
    $[26] !== pauseAnimation ||
    $[27] !== scrollPin.revealRef ||
    $[28] !== source ||
    $[29] !== unseenDivider ||
    $[30] !== scrollViewport ||
    $[31] !== tools ||
    $[32] !== waitingLines
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
    $[23] = commands;
    $[24] = hidePlaceholder;
    $[25] = onRowsDrawn;
    $[26] = pauseAnimation;
    $[27] = scrollPin.revealRef;
    $[28] = source;
    $[29] = unseenDivider;
    $[30] = scrollViewport;
    $[31] = tools;
    $[32] = waitingLines;
    $[33] = exportView;
  } else exportView = $[33];
  let exportElement = exportView;
  const mode = historyHidden ? "hidden" : "visible";
  let teammateHeader;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    teammateHeader = jsxProd_default(TeammateViewHeader, {});
    $[34] = teammateHeader;
  } else teammateHeader = $[34];
  let homePageElement;
  if ($[35] !== fadeStep || $[36] !== showHomePage) {
    homePageElement =
      showHomePage &&
      coordinatorContextCache !== null &&
      jsxProd_default(coordinatorContextCache.HomePage, {
        fadeStep,
      });
    $[35] = fadeStep;
    $[36] = showHomePage;
    $[37] = homePageElement;
  } else homePageElement = $[37];
  const value_2 = swarmFooterGate && phase === "gone";
  const hideWelcomeChrome_2 = hideWelcomeChrome || showHomePage;
  const hideLogo = swarmFooterGate && phase === "gone";
  let logoHeader;
  if ($[38] !== showHomePage || $[39] !== hideWelcomeChrome_2 || $[40] !== hideLogo) {
    logoHeader = jsxProd_default(LogoHeader, {
      hideWelcomeChrome: hideWelcomeChrome_2,
      homeMessage: showHomePage,
      hideLogo,
    });
    $[38] = showHomePage;
    $[39] = hideWelcomeChrome_2;
    $[40] = hideLogo;
    $[41] = logoHeader;
  } else logoHeader = $[41];
  let sessionHeaderLine;
  if ($[42] !== hideWelcomeChrome || $[43] !== phase) {
    sessionHeaderLine =
      !hideWelcomeChrome && phase === "logo" && jsxProd_default(renderSessionHeaderLine, {});
    $[42] = hideWelcomeChrome;
    $[43] = phase;
    $[44] = sessionHeaderLine;
  } else sessionHeaderLine = $[44];
  let children;
  if ($[45] !== exportElement || $[46] !== value) {
    children =
      stateRowSource !== null
        ? jsxProd_default(stateRowSource.StateRowSourceContext.Provider, {
            value,
            children: exportElement,
          })
        : exportElement;
    $[45] = exportElement;
    $[46] = value;
    $[47] = children;
  } else children = $[47];
  let linkProvider;
  if ($[48] !== logoRetired || $[49] !== children) {
    linkProvider = jsxProd_default(slashCommandLinkSignal.Provider, {
      value: logoRetired,
      children,
    });
    $[48] = logoRetired;
    $[49] = children;
    $[50] = linkProvider;
  } else linkProvider = $[50];
  let headerChildren;
  if ($[51] !== value_2 || $[52] !== logoHeader || $[53] !== sessionHeaderLine || $[54] !== linkProvider) {
    headerChildren = jsxProd_default_2(slashCommandLinkContext.Provider, {
      value: value_2,
      children: [logoHeader, sessionHeaderLine, linkProvider],
    });
    $[51] = value_2;
    $[52] = logoHeader;
    $[53] = sessionHeaderLine;
    $[54] = linkProvider;
    $[55] = headerChildren;
  } else headerChildren = $[55];
  let messageFrame;
  if ($[56] !== mode || $[57] !== homePageElement || $[58] !== headerChildren) {
    messageFrame = jsxProd_default_2(activityTypeExport, {
      mode,
      children: [teammateHeader, homePageElement, headerChildren],
    });
    $[56] = mode;
    $[57] = homePageElement;
    $[58] = headerChildren;
    $[59] = messageFrame;
  } else messageFrame = $[59];
  let headerBlock = messageFrame;
  let bodyBlock;
  if (
    $[60] !== focused ||
    $[61] !== isFullscreen ||
    $[62] !== historyHidden ||
    $[63] !== isRemoteSession ||
    $[64] !== liveStateRowMounted ||
    $[65] !== panelHoldsQueue ||
    $[66] !== promptMounted ||
    $[67] !== remoteSendsNow ||
    $[68] !== liveStatusFlags ||
    $[69] !== scrollPin ||
    $[70] !== showSpinner ||
    $[71] !== toolProgress ||
    $[72] !== turn ||
    $[73] !== verbose ||
    $[74] !== waitingLines
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
              jsxProd_default(MemoizedQueuedCommandsList, {
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
    $[60] = focused;
    $[61] = isFullscreen;
    $[62] = historyHidden;
    $[63] = isRemoteSession;
    $[64] = liveStateRowMounted;
    $[65] = panelHoldsQueue;
    $[66] = promptMounted;
    $[67] = remoteSendsNow;
    $[68] = liveStatusFlags;
    $[69] = scrollPin;
    $[70] = showSpinner;
    $[71] = toolProgress;
    $[72] = turn;
    $[73] = verbose;
    $[74] = waitingLines;
    $[75] = bodyBlock;
  } else bodyBlock = $[75];
  let areaFragment;
  if ($[76] !== headerBlock || $[77] !== bodyBlock) {
    areaFragment = jsxProd_default_2(Fragment, {
      children: [headerBlock, bodyBlock],
    });
    $[76] = headerBlock;
    $[77] = bodyBlock;
    $[78] = areaFragment;
  } else areaFragment = $[78];
  return areaFragment;
}
//@ chunk-czq1j3j2.js:1504792-1505293 placement
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
//@ chunk-czq1j3j2.js:1505293-1505338 placement
var EMPTY_DIVIDER_STATE = {
  dividerY: null,
  unseenDivider: undefined,
};
export { MessageScrollHandler, MessageArea, EMPTY_DIVIDER_STATE };
