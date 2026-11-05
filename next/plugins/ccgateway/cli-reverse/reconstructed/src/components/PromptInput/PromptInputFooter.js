/**
 * components/PromptInput/PromptInputFooter.tsx
 *
 * 输入框页脚：左侧状态（模式/提示/后台任务/PR 状态）、右侧通知、建议列表；含 Bridge 状态指示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputFooter.tsx
 * pieces: chunk-czq1j3j2.js (18), chunk-hnxhr3bs.js (2)
 * attribution: placement 13, layout 5, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { getBridgeStatus } from "../../bridge/bridgeStatusUtil.js";
import { useAppState } from "../../state/AppState.js";
import { isBridgeEnabled } from "../../bridge/bridgeEntitlement.js";
import {
  init_react_production,
  useSyncExternalStore,
  useCallback,
  useEffect,
  useRef,
  memo,
} from "../../../vendor/react/cjs/react.production.js";
import { STATE_HAS_RAW } from "../../screens/replDialogState.js";
import { isIdleForBackground } from "../../utils/backgroundHandoff.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import {
  onMemoryPauseChange,
  getMemoryToggledOff,
  onAutoMemorySessionSwitchChange,
  getAutoMemoryOffThisSession,
} from "../../bootstrap/state.js";
import {
  onSessionTeamChanged,
  sessionTeamOrUndefined,
  currentSessionTeamKey,
} from "../../utils/background/remote/remoteSession.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { memorySyncPolicyClosedStub } from "../../services/accountMemory/memoryContext.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";
import { useSettingsState } from "../../hooks/useSettings.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { showSwarmFooterGate } from "./footerGates.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../ink/components/Input.js";
import { useVisibleAgentTaskCount, BackgroundTasksPanel } from "../CoordinatorAgentStatus.js";
import { getEffectiveStatusLine } from "../../utils/hooks/hooksConfigSnapshot.js";
import { useFullscreenFooterData } from "../FullscreenLayout.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { PromptInputFooterSuggestions, getArrowedSuggestionId } from "./PromptInputFooterSuggestions.js";
import { isSuggestionNavEnabled } from "../../utils/accessibility/screenReader.js";
import { PromptInputHelpMenu } from "./PromptInputHelpMenu.js";
import { StatusLineMemo } from "../StatusLine.js";
import { PromptHintNamespace } from "../pluginUi/PromptHint.js";
import { Notifications } from "./Notifications.js";
import { FooterIndicators, FooterStatusLine } from "./PromptInputFooterStatus.js";
import { clampCursorOffset } from "../../vim/operators.js";
import { parsePastedRefs } from "../../history.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:46818-46829 placement
var FOOTER_WIDE_COLUMNS = 60;
//@ chunk-hnxhr3bs.js:46829-47242 fingerprint (2.1.88 match: BridgeStatusIndicator, 0.608)
/**
 * Remote Control（bridge）状态指示：连接/断开/重连中。
 */
function BridgeStatusIndicator(props) {
  let $ = useMemoCache(4);
  let { columns } = useTerminalSize();
  let isWide = props && columns >= FOOTER_WIDE_COLUMNS;
  let statusElement;
  if ($[0] !== isWide) {
    statusElement = (args) =>
      isWide && !args.replBridgeOutboundOnly && (args.replBridgeEnabled || args.replBridgeError !== undefined)
        ? getBridgeStatus({
            error: args.replBridgeError,
            connected: args.replBridgeConnected,
            sessionActive: args.replBridgeSessionActive,
            reconnecting: args.replBridgeReconnecting,
          })
        : null;
    $[0] = isWide;
    $[1] = statusElement;
  } else statusElement = $[1];
  let connected = useAppState(statusElement);
  let bridgeStatus;
  if ($[2] !== connected) {
    bridgeStatus = connected !== null && isBridgeEnabled() ? connected : null;
    $[2] = connected;
    $[3] = bridgeStatus;
  } else bridgeStatus = $[3];
  return bridgeStatus;
}
//@ chunk-czq1j3j2.js:852289-852293 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:852289", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:856440-856444 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:856440", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:873485-873489 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:873485", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:874081-874085 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:874081", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:884672-884823 placement
function useFooterTranscript({ turn, transcript }) {
  let previewStore = turn.stream.previewStore;
  let hasRawState = useSyncExternalStore(
    previewStore.subscribe,
    () => (previewStore.getFlags() & STATE_HAS_RAW) !== 0,
  );
  let selector = useCallback((store) => isIdleForBackground(store, hasRawState), [hasRawState]);
  return useStoreSelector(transcript, selector);
}
//@ chunk-czq1j3j2.js:884827-884840 placement
var accountMemoryMarkerApi = null;
//@ chunk-czq1j3j2.js:884840-885191 placement
function AccountMemoryMarker() {
  let memoryPaused = useSyncExternalStore(onMemoryPauseChange, getMemoryToggledOff);
  let autoMemoryOff = useSyncExternalStore(onAutoMemorySessionSwitchChange, getAutoMemoryOffThisSession);
  let sessionTeam = useSyncExternalStore(onSessionTeamChanged, sessionTeamOrUndefined);
  let sessionTasks = useSyncExternalStore(onSessionTeamChanged, currentSessionTeamKey);
  let { credentials, storageV5 } = useTheme_2();
  useEffect(() => {}, [sessionTasks, credentials, storageV5]);
  let accountMarker = memoryPaused
    ? undefined
    : accountMemoryMarkerApi?.accountMemoryMarker(() => {
        let policy = memorySyncPolicyClosedStub();
        return policy === "open" || policy === "account_off";
      });
  return memoryPaused
    ? ["memory paused"]
    : [
        ...[],
        ...(accountMarker === "read_only"
          ? ["account memory: read-only"]
          : accountMarker === "off"
            ? ["account memory: off"]
            : []),
      ];
}
//@ chunk-czq1j3j2.js:885191-885224 layout
function selectDebug(state) {
  return state.debug;
}
//@ chunk-czq1j3j2.js:885224-885267 layout
function selectHideLoginNotice(state) {
  return state.hideLoginNotice;
}
//@ chunk-czq1j3j2.js:885267-885333 layout
function selectIsLoading_2(state) {
  return state.isLoading && !(codeModeAccepted() && state.stopWaitPending);
}
//@ chunk-czq1j3j2.js:885333-885378 layout
function selectIsExternalLoading(state) {
  return state.isExternalLoading;
}
//@ chunk-czq1j3j2.js:885378-885426 layout
function selectCoordinatorTaskIndex_2(state) {
  return state.coordinatorTaskIndex;
}
//@ chunk-czq1j3j2.js:885426-890774 fingerprint (2.1.88 match: PromptInputFooter, 0.503)
/**
 * 页脚组件：上方建议列表（有建议时），否则左侧 PromptInputFooterLeftSide + 右侧 Notifications；全屏与帮助菜单打开时布局不同。
 */
function PromptInputFooter(props) {
  let $ = useMemoCache(92);
  let {
    scope,
    transcript,
    turn,
    chrome,
    exitMessage,
    row1Hint,
    leftArrowDetachAvailable,
    proactivityLevelStepped,
    proactivityPillCollapsed,
    vimMode,
    mode,
    isAutoUpdating,
    verbose,
    onChangeIsUpdating,
    suggestionsStore,
    inputTakesFocus,
    onSelectSuggestion,
    onHoverSuggestion,
    toolPermissionContext,
    helpOpen,
    suppressHint,
    tasksSelected,
    bridgeSelected,
    ideSelectionSelected,
    isPasting,
    showExpandPasteHint,
    hasStash,
    isInputWrapped,
    isSearching,
    historyQuery,
    setHistoryQuery,
    historyFailedMatch,
    onOpenArtifacts,
  } = props;
  let row1Hint_2 = row1Hint === undefined ? null : row1Hint;
  let pastingActive = isPasting === undefined ? false : isPasting;
  let showExpandPasteHint_2 = showExpandPasteHint === undefined ? false : showExpandPasteHint;
  let hasStash_2 = hasStash === undefined ? false : hasStash;
  let {
    suggestions,
    selectedSuggestion,
    suggestionsEmptyMessage,
    maxColumnWidth,
    hoveredSuggestionId,
    arrowedSuggestionId,
  } = useStoreSelector(suggestionsStore);
  let debug = useStoreSelector(chrome, selectDebug);
  let hideLoginNotice = useStoreSelector(chrome, selectHideLoginNotice);
  let isLoading = useStoreSelector(turn, selectIsLoading_2);
  let isExternalLoading = useStoreSelector(turn, selectIsExternalLoading);
  let footerArgs;
  if ($[0] !== transcript || $[1] !== turn) {
    footerArgs = {
      turn,
      transcript,
    };
    $[0] = transcript;
    $[1] = turn;
    $[2] = footerArgs;
  } else footerArgs = $[2];
  let betweenCalls = useFooterTranscript(footerArgs);
  let settings = useSettingsState();
  let { columns } = useTerminalSize();
  let isFullscreen = useIsFullscreen();
  let isSwarmFooterVisible = showSwarmFooterGate();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let messagesRef = useRef(null);
  let measureMessages;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    measureMessages = () => (messagesRef.current === null ? 0 : measureElement(messagesRef.current).width);
    $[3] = measureMessages;
  } else measureMessages = $[3];
  let messagesRef_2 = useMeasured(measureMessages);
  let modeLabels = AccountMemoryMarker();
  let paddingX = isSwarmFooterVisible ? 0 : FOOTER_HORIZONTAL_PADDING;
  let contentWidth = columns - 2 * paddingX;
  let isFullscreen_2 = useVisibleAgentTaskCount();
  let coordinatorTaskIndex = useAppState(selectCoordinatorTaskIndex_2);
  let tasksSelected_2 = tasksSelected && (isFullscreen_2 === 0 || coordinatorTaskIndex < 0);
  const statusLine = settings?.statusLine;
  let statusLineConfig;
  if ($[4] !== statusLine) {
    statusLineConfig = getEffectiveStatusLine(statusLine);
    $[4] = statusLine;
    $[5] = statusLineConfig;
  } else statusLineConfig = $[5];
  let statusLineConfig_2 = statusLineConfig;
  let hasStatusLine = statusLineConfig_2 !== undefined;
  let suppressHintValue = suppressHint || isSearching;
  let suppressHint_2 = suppressHintValue || hasStatusLine;
  let hasSuggestionContent = suggestions.length > 0 || !!suggestionsEmptyMessage;
  let fullscreenFooterArgs;
  if (
    $[6] !== hasSuggestionContent ||
    $[7] !== hoveredSuggestionId ||
    $[8] !== isFullscreen ||
    $[9] !== maxColumnWidth ||
    $[10] !== onHoverSuggestion ||
    $[11] !== onSelectSuggestion ||
    $[12] !== selectedSuggestion ||
    $[13] !== suggestions ||
    $[14] !== suggestionsEmptyMessage
  ) {
    fullscreenFooterArgs =
      isFullscreen && hasSuggestionContent
        ? {
            suggestions,
            selectedSuggestion,
            maxColumnWidth,
            emptyMessage: suggestionsEmptyMessage,
            hoveredId: hoveredSuggestionId,
            onSelect: onSelectSuggestion,
            onHoverChange: onHoverSuggestion,
          }
        : null;
    $[6] = hasSuggestionContent;
    $[7] = hoveredSuggestionId;
    $[8] = isFullscreen;
    $[9] = maxColumnWidth;
    $[10] = onHoverSuggestion;
    $[11] = onSelectSuggestion;
    $[12] = selectedSuggestion;
    $[13] = suggestions;
    $[14] = suggestionsEmptyMessage;
    $[15] = fullscreenFooterArgs;
  } else fullscreenFooterArgs = $[15];
  useFullscreenFooterData(fullscreenFooterArgs);
  if (
    !shouldShowFooterStatus({
      hasSuggestionContent,
      isFullscreen,
      helpOpen,
    })
  ) {
    let suggestionArea;
    if (
      $[16] !== arrowedSuggestionId ||
      $[17] !== hasSuggestionContent ||
      $[18] !== inputTakesFocus ||
      $[19] !== isFullscreen ||
      $[20] !== maxColumnWidth ||
      $[21] !== selectedSuggestion ||
      $[22] !== suggestions ||
      $[23] !== suggestionsEmptyMessage
    ) {
      suggestionArea =
        hasSuggestionContent && !isFullscreen
          ? jsxProd_default(Box, {
              paddingX: 2,
              paddingY: 0,
              children: jsxProd_default(PromptInputFooterSuggestions, {
                suggestions,
                selectedSuggestion,
                maxColumnWidth,
                emptyMessage: suggestionsEmptyMessage,
                keepWindow: isSuggestionNavEnabled(),
                cursorRowId: inputTakesFocus
                  ? getArrowedSuggestionId({
                      suggestions,
                      selectedSuggestion,
                      arrowedSuggestionId,
                    })
                  : null,
              }),
            })
          : jsxProd_default(PromptInputHelpMenu, {
              dimColor: true,
              fixedWidth: true,
              paddingX: 2,
            });
      $[16] = arrowedSuggestionId;
      $[17] = hasSuggestionContent;
      $[18] = inputTakesFocus;
      $[19] = isFullscreen;
      $[20] = maxColumnWidth;
      $[21] = selectedSuggestion;
      $[22] = suggestions;
      $[23] = suggestionsEmptyMessage;
      $[24] = suggestionArea;
    } else suggestionArea = $[24];
    return suggestionArea;
  }
  const flexDirection = isScreenReaderEnabled ? "column" : "row";
  let statusLineElement;
  if (
    $[25] !== exitMessage ||
    $[26] !== pastingActive ||
    $[27] !== mode ||
    $[28] !== hasStatusLine ||
    $[29] !== transcript ||
    $[30] !== vimMode
  ) {
    statusLineElement =
      mode === "prompt" &&
      !exitMessage.show &&
      !pastingActive &&
      hasStatusLine &&
      jsxProd_default(StatusLineMemo, {
        transcript,
        vimMode,
      });
    $[25] = exitMessage;
    $[26] = pastingActive;
    $[27] = mode;
    $[28] = hasStatusLine;
    $[29] = transcript;
    $[30] = vimMode;
    $[31] = statusLineElement;
  } else statusLineElement = $[31];
  const hideVimModeIndicator = statusLineConfig_2?.hideVimModeIndicator ?? false;
  const isInputEmpty = !suppressHint;
  const rowWidth = contentWidth - (isScreenReaderEnabled ? 0 : FOOTER_MESSAGES_GAP + messagesRef_2);
  const onOpenTasksDialog = isFullscreen ? chrome.openBashesDialog : undefined;
  const onOpenArtifacts_2 = isFullscreen ? onOpenArtifacts : undefined;
  let footerLeftSide;
  if (
    $[32] !== betweenCalls ||
    $[33] !== exitMessage ||
    $[34] !== historyFailedMatch ||
    $[35] !== historyQuery ||
    $[36] !== isExternalLoading ||
    $[37] !== isLoading ||
    $[38] !== pastingActive ||
    $[39] !== isSearching ||
    $[40] !== leftArrowDetachAvailable ||
    $[41] !== mode ||
    $[42] !== tasksSelected_2 ||
    $[43] !== proactivityLevelStepped ||
    $[44] !== proactivityPillCollapsed ||
    $[45] !== row1Hint_2 ||
    $[46] !== contentWidth ||
    $[47] !== setHistoryQuery ||
    $[48] !== showExpandPasteHint_2 ||
    $[49] !== suppressHint_2 ||
    $[50] !== suppressHintValue ||
    $[51] !== hideVimModeIndicator ||
    $[52] !== isInputEmpty ||
    $[53] !== rowWidth ||
    $[54] !== onOpenTasksDialog ||
    $[55] !== onOpenArtifacts_2 ||
    $[56] !== toolPermissionContext ||
    $[57] !== vimMode
  ) {
    footerLeftSide = jsxProd_default(PromptHintNamespace.FooterHintLine, {
      exitMessage,
      row1Hint: row1Hint_2,
      leftArrowDetachAvailable,
      proactivityLevelStepped,
      proactivityPillCollapsed,
      vimMode,
      hideVimModeIndicator,
      mode,
      toolPermissionContext,
      suppressHint: suppressHint_2,
      suppressHintExceptStatusline: suppressHintValue,
      isInputEmpty,
      isLoading,
      isExternalLoading,
      betweenCalls,
      tasksSelected: tasksSelected_2,
      isPasting: pastingActive,
      showExpandPasteHint: showExpandPasteHint_2,
      isSearching,
      historyQuery,
      setHistoryQuery,
      historyFailedMatch,
      rowWidth,
      wrappedRowWidth: contentWidth,
      onOpenTasksDialog,
      onOpenArtifacts: onOpenArtifacts_2,
    });
    $[32] = betweenCalls;
    $[33] = exitMessage;
    $[34] = historyFailedMatch;
    $[35] = historyQuery;
    $[36] = isExternalLoading;
    $[37] = isLoading;
    $[38] = pastingActive;
    $[39] = isSearching;
    $[40] = leftArrowDetachAvailable;
    $[41] = mode;
    $[42] = tasksSelected_2;
    $[43] = proactivityLevelStepped;
    $[44] = proactivityPillCollapsed;
    $[45] = row1Hint_2;
    $[46] = contentWidth;
    $[47] = setHistoryQuery;
    $[48] = showExpandPasteHint_2;
    $[49] = suppressHint_2;
    $[50] = suppressHintValue;
    $[51] = hideVimModeIndicator;
    $[52] = isInputEmpty;
    $[53] = rowWidth;
    $[54] = onOpenTasksDialog;
    $[55] = onOpenArtifacts_2;
    $[56] = toolPermissionContext;
    $[57] = vimMode;
    $[58] = footerLeftSide;
  } else footerLeftSide = $[58];
  let leftColumn;
  if ($[59] !== statusLineElement || $[60] !== footerLeftSide) {
    leftColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink: 1,
      children: [statusLineElement, footerLeftSide, false],
    });
    $[59] = statusLineElement;
    $[60] = footerLeftSide;
    $[61] = leftColumn;
  } else leftColumn = $[61];
  let notifications;
  if (
    $[62] !== hasStash_2 ||
    $[63] !== hideLoginNotice ||
    $[64] !== isAutoUpdating ||
    $[65] !== isFullscreen ||
    $[66] !== isInputWrapped ||
    $[67] !== onChangeIsUpdating ||
    $[68] !== scope.apiKeyVerification ||
    $[69] !== transcript ||
    $[70] !== verbose
  ) {
    notifications = isFullscreen
      ? null
      : jsxProd_default(Notifications, {
          apiKeyVerification: scope.apiKeyVerification,
          hideLoginNotice,
          isAutoUpdating,
          verbose,
          transcript,
          onChangeIsUpdating,
          isInputWrapped,
          hasStash: hasStash_2,
        });
    $[62] = hasStash_2;
    $[63] = hideLoginNotice;
    $[64] = isAutoUpdating;
    $[65] = isFullscreen;
    $[66] = isInputWrapped;
    $[67] = onChangeIsUpdating;
    $[68] = scope.apiKeyVerification;
    $[69] = transcript;
    $[70] = verbose;
    $[71] = notifications;
  } else notifications = $[71];
  let footerElement;
  if (
    $[72] !== bridgeSelected ||
    $[73] !== chrome ||
    $[74] !== debug ||
    $[75] !== ideSelectionSelected ||
    $[76] !== modeLabels ||
    $[77] !== contentWidth ||
    $[78] !== scope.initialMcpClients ||
    $[79] !== notifications
  ) {
    footerElement = jsxProd_default(PromptFooter, {
      initialMcpClients: scope.initialMcpClients,
      chrome,
      bridgeSelected,
      ideSelectionSelected,
      modeLabels,
      debug,
      rowWidth: contentWidth,
      ref: messagesRef,
      notifications,
    });
    $[72] = bridgeSelected;
    $[73] = chrome;
    $[74] = debug;
    $[75] = ideSelectionSelected;
    $[76] = modeLabels;
    $[77] = contentWidth;
    $[78] = scope.initialMcpClients;
    $[79] = notifications;
    $[80] = footerElement;
  } else footerElement = $[80];
  let row;
  if (
    $[81] !== columns ||
    $[82] !== paddingX ||
    $[83] !== flexDirection ||
    $[84] !== leftColumn ||
    $[85] !== footerElement
  ) {
    row = jsxProd_default_2(Box, {
      width: columns,
      flexDirection,
      flexWrap: "wrap",
      alignItems: "flex-start",
      paddingX,
      columnGap: FOOTER_MESSAGES_GAP,
      children: [leftColumn, footerElement],
    });
    $[81] = columns;
    $[82] = paddingX;
    $[83] = flexDirection;
    $[84] = leftColumn;
    $[85] = footerElement;
    $[86] = row;
  } else row = $[86];
  const showWorkflows = mode === "prompt" && !exitMessage.show && !pastingActive;
  let tasksPanel;
  if ($[87] !== showWorkflows) {
    tasksPanel = jsxProd_default(BackgroundTasksPanel, {
      showWorkflows,
    });
    $[87] = showWorkflows;
    $[88] = tasksPanel;
  } else tasksPanel = $[88];
  let content;
  if ($[89] !== row || $[90] !== tasksPanel) {
    content = jsxProd_default_2(Fragment, {
      children: [row, tasksPanel],
    });
    $[89] = row;
    $[90] = tasksPanel;
    $[91] = content;
  } else content = $[91];
  return content;
}
//@ chunk-czq1j3j2.js:890774-890790 placement
var PromptInputFooterMemo; // deferred: uses PromptInputFooter of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:890774", () => {
  PromptInputFooterMemo = memo(PromptInputFooter);
});
//@ chunk-czq1j3j2.js:890790-890873 placement
function shouldShowFooterStatus({ hasSuggestionContent, isFullscreen, helpOpen }) {
  return !(hasSuggestionContent && !isFullscreen) && !helpOpen;
}
//@ chunk-czq1j3j2.js:890873-891597 placement
function PromptFooter(props) {
  let $ = useMemoCache(13);
  let {
    notifications,
    initialMcpClients,
    chrome,
    bridgeSelected,
    ideSelectionSelected,
    modeLabels,
    debug,
    rowWidth,
    ref,
  } = props;
  let isSwarmFooterVisible = showSwarmFooterGate();
  let footerIndicators;
  if (
    $[0] !== bridgeSelected ||
    $[1] !== chrome ||
    $[2] !== debug ||
    $[3] !== ideSelectionSelected ||
    $[4] !== initialMcpClients ||
    $[5] !== isSwarmFooterVisible ||
    $[6] !== modeLabels ||
    $[7] !== rowWidth
  ) {
    footerIndicators = isSwarmFooterVisible
      ? jsxProd_default(FooterIndicators, {
          width: rowWidth,
          chrome,
          initialMcpClients,
          bridgeSelected,
          ideSelectionSelected,
        })
      : jsxProd_default(FooterStatusLine, {
          debug,
          bridgeSelected,
          modeLabels,
        });
    $[0] = bridgeSelected;
    $[1] = chrome;
    $[2] = debug;
    $[3] = ideSelectionSelected;
    $[4] = initialMcpClients;
    $[5] = isSwarmFooterVisible;
    $[6] = modeLabels;
    $[7] = rowWidth;
    $[8] = footerIndicators;
  } else footerIndicators = $[8];
  let footerElement;
  if ($[9] !== notifications || $[10] !== ref || $[11] !== footerIndicators) {
    footerElement = jsxProd_default_2(Box, {
      ref,
      flexShrink: 0,
      marginLeft: "auto",
      flexDirection: "column",
      alignItems: "flex-end",
      children: [notifications, footerIndicators],
    });
    $[9] = notifications;
    $[10] = ref;
    $[11] = footerIndicators;
    $[12] = footerElement;
  } else footerElement = $[12];
  return footerElement;
}
//@ chunk-czq1j3j2.js:891597-891612 placement
var FOOTER_HORIZONTAL_PADDING = 2;
var FOOTER_MESSAGES_GAP = 1;
//@ chunk-czq1j3j2.js:891612-891748 placement (2.1.88 match: setCwdState, 1)
function setCwdState(nextValue, cursorOffset) {
  if (nextValue !== nextValue.normalize("NFC")) return cursorOffset;
  let clampedOffset = clampCursorOffset(nextValue, cursorOffset);
  return parsePastedRefs(nextValue).some(
    (ref) => clampedOffset >= ref.index && clampedOffset < ref.index + ref.match.length,
  )
    ? cursorOffset
    : clampedOffset;
}
export {
  FOOTER_WIDE_COLUMNS,
  shouldShowFooterStatus,
  setCwdState,
  PromptInputFooterMemo,
  useFooterTranscript,
  BridgeStatusIndicator,
  AccountMemoryMarker,
};
