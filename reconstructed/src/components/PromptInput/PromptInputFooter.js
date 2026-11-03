/**
 * components/PromptInput/PromptInputFooter.tsx
 *
 * 输入框页脚：左侧状态（模式/提示/后台任务/PR 状态）、右侧通知、建议列表；含 Bridge 状态指示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputFooter.tsx
 * pieces: chunk-18hwfzwa.js (18), chunk-ag5x7vhf.js (2)
 * attribution: placement 13, layout 5, fingerprint 2
 */
import { yt, ce, init_react_production, P, R, Rh } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useSettingsState } from "../../hooks/useSettings.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { showSwarmFooterGate } from "./footerGates.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../ink/components/Input.js";
import { useVisibleAgentTaskCount, BackgroundTasksPanel } from "../CoordinatorAgentStatus.js";
import { useAppState } from "../../state/AppState.js";
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
import { getBridgeStatus } from "../../bridge/bridgeStatusUtil.js";
import { isBridgeEnabled } from "../../bridge/bridgeEntitlement.js";

//@ chunk-18hwfzwa.js:851815-851966 placement
function useFooterTranscript({ turn, transcript }) {
  let previewStore = turn.stream.previewStore;
  let L = yt(previewStore.subscribe, () => (previewStore.getFlags() & STATE_HAS_RAW) !== 0);
  let ee = ce((ke) => isIdleForBackground(ke, L), [L]);
  return useStoreSelector(transcript, ee);
}
//@ chunk-18hwfzwa.js:851966-851970 placement
init_react_production();
//@ chunk-18hwfzwa.js:851970-851983 placement
var accountMemoryMarkerApi = null;
//@ chunk-18hwfzwa.js:851983-852334 placement
function AccountMemoryMarker() {
  let h = yt(onMemoryPauseChange, getMemoryToggledOff);
  let x = yt(onAutoMemorySessionSwitchChange, getAutoMemoryOffThisSession);
  let D = yt(onSessionTeamChanged, sessionTeamOrUndefined);
  let L = yt(onSessionTeamChanged, currentSessionTeamKey);
  let { credentials, storageV5 } = useTheme_2();
  P(() => {}, [L, credentials, storageV5]);
  let Re = h
    ? undefined
    : accountMemoryMarkerApi?.accountMemoryMarker(() => {
        let He = memorySyncPolicyClosedStub();
        return He === "open" || He === "account_off";
      });
  return h
    ? ["memory paused"]
    : [
        ...[],
        ...(Re === "read_only" ? ["account memory: read-only"] : Re === "off" ? ["account memory: off"] : []),
      ];
}
//@ chunk-18hwfzwa.js:852334-852367 layout
function selectDebug(qn) {
  return qn.debug;
}
//@ chunk-18hwfzwa.js:852367-852410 layout
function selectHideLoginNotice(ps) {
  return ps.hideLoginNotice;
}
//@ chunk-18hwfzwa.js:852410-852451 layout
function selectIsLoading_2(xs) {
  return xs.isLoading && true;
}
//@ chunk-18hwfzwa.js:852451-852496 layout
function selectIsExternalLoading(kr) {
  return kr.isExternalLoading;
}
//@ chunk-18hwfzwa.js:852496-852544 layout
function selectCoordinatorTaskIndex_2(ls) {
  return ls.coordinatorTaskIndex;
}
//@ chunk-18hwfzwa.js:852544-857891 fingerprint = PromptInputFooter (0.503)
/**
 * 页脚组件：上方建议列表（有建议时），否则左侧 PromptInputFooterLeftSide + 右侧 Notifications；全屏与帮助菜单打开时布局不同。
 */
function PromptInputFooter(props) {
  let $ = w(92);
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
  let Cn = isPasting === undefined ? false : isPasting;
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
  let _o;
  if ($[0] !== transcript || $[1] !== turn) {
    _o = {
      turn,
      transcript,
    };
    $[0] = transcript;
    $[1] = turn;
    $[2] = _o;
  } else _o = $[2];
  let betweenCalls = useFooterTranscript(_o);
  let settings = useSettingsState();
  let { columns } = useTerminalSize();
  let isFullscreen = useIsFullscreen();
  let Kn = showSwarmFooterGate();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let Fr = R(null);
  let Zn;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    Zn = () => (Fr.current === null ? 0 : measureElement(Fr.current).width);
    $[3] = Zn;
  } else Zn = $[3];
  let messagesRef = useMeasured(Zn);
  let modeLabels = AccountMemoryMarker();
  let or = Kn ? 0 : FOOTER_HORIZONTAL_PADDING;
  let pr = columns - 2 * or;
  let isFullscreen_2 = useVisibleAgentTaskCount();
  let coordinatorTaskIndex = useAppState(selectCoordinatorTaskIndex_2);
  let tasksSelected_2 = tasksSelected && (isFullscreen_2 === 0 || coordinatorTaskIndex < 0);
  const statusLine = settings?.statusLine;
  let ts;
  if ($[4] !== statusLine) {
    ts = getEffectiveStatusLine(statusLine);
    $[4] = statusLine;
    $[5] = ts;
  } else ts = $[5];
  let Gn = ts;
  let Ur = Gn !== undefined;
  let Zr = suppressHint || isSearching;
  let suppressHint_2 = Zr || Ur;
  let zr = suggestions.length > 0 || !!suggestionsEmptyMessage;
  let _r;
  if (
    $[6] !== zr ||
    $[7] !== hoveredSuggestionId ||
    $[8] !== isFullscreen ||
    $[9] !== maxColumnWidth ||
    $[10] !== onHoverSuggestion ||
    $[11] !== onSelectSuggestion ||
    $[12] !== selectedSuggestion ||
    $[13] !== suggestions ||
    $[14] !== suggestionsEmptyMessage
  ) {
    _r =
      isFullscreen && zr
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
    $[6] = zr;
    $[7] = hoveredSuggestionId;
    $[8] = isFullscreen;
    $[9] = maxColumnWidth;
    $[10] = onHoverSuggestion;
    $[11] = onSelectSuggestion;
    $[12] = selectedSuggestion;
    $[13] = suggestions;
    $[14] = suggestionsEmptyMessage;
    $[15] = _r;
  } else _r = $[15];
  useFullscreenFooterData(_r);
  if (
    !shouldShowFooterStatus({
      hasSuggestionContent: zr,
      isFullscreen,
      helpOpen,
    })
  ) {
    let $r;
    if (
      $[16] !== arrowedSuggestionId ||
      $[17] !== zr ||
      $[18] !== inputTakesFocus ||
      $[19] !== isFullscreen ||
      $[20] !== maxColumnWidth ||
      $[21] !== selectedSuggestion ||
      $[22] !== suggestions ||
      $[23] !== suggestionsEmptyMessage
    ) {
      $r =
        zr && !isFullscreen
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
      $[17] = zr;
      $[18] = inputTakesFocus;
      $[19] = isFullscreen;
      $[20] = maxColumnWidth;
      $[21] = selectedSuggestion;
      $[22] = suggestions;
      $[23] = suggestionsEmptyMessage;
      $[24] = $r;
    } else $r = $[24];
    return $r;
  }
  const flexDirection = isScreenReaderEnabled ? "column" : "row";
  let Yr;
  if (
    $[25] !== exitMessage ||
    $[26] !== Cn ||
    $[27] !== mode ||
    $[28] !== Ur ||
    $[29] !== transcript ||
    $[30] !== vimMode
  ) {
    Yr =
      mode === "prompt" &&
      !exitMessage.show &&
      !Cn &&
      Ur &&
      jsxProd_default(StatusLineMemo, {
        transcript,
        vimMode,
      });
    $[25] = exitMessage;
    $[26] = Cn;
    $[27] = mode;
    $[28] = Ur;
    $[29] = transcript;
    $[30] = vimMode;
    $[31] = Yr;
  } else Yr = $[31];
  const hideVimModeIndicator = Gn?.hideVimModeIndicator ?? false;
  const isInputEmpty = !suppressHint;
  const rowWidth = pr - (isScreenReaderEnabled ? 0 : FOOTER_MESSAGES_GAP + messagesRef);
  const onOpenTasksDialog = isFullscreen ? chrome.openBashesDialog : undefined;
  const onOpenArtifacts_2 = isFullscreen ? onOpenArtifacts : undefined;
  let is;
  if (
    $[32] !== betweenCalls ||
    $[33] !== exitMessage ||
    $[34] !== historyFailedMatch ||
    $[35] !== historyQuery ||
    $[36] !== isExternalLoading ||
    $[37] !== isLoading ||
    $[38] !== Cn ||
    $[39] !== isSearching ||
    $[40] !== leftArrowDetachAvailable ||
    $[41] !== mode ||
    $[42] !== tasksSelected_2 ||
    $[43] !== proactivityLevelStepped ||
    $[44] !== proactivityPillCollapsed ||
    $[45] !== row1Hint_2 ||
    $[46] !== pr ||
    $[47] !== setHistoryQuery ||
    $[48] !== showExpandPasteHint_2 ||
    $[49] !== suppressHint_2 ||
    $[50] !== Zr ||
    $[51] !== hideVimModeIndicator ||
    $[52] !== isInputEmpty ||
    $[53] !== rowWidth ||
    $[54] !== onOpenTasksDialog ||
    $[55] !== onOpenArtifacts_2 ||
    $[56] !== toolPermissionContext ||
    $[57] !== vimMode
  ) {
    is = jsxProd_default(PromptHintNamespace.FooterHintLine, {
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
      suppressHintExceptStatusline: Zr,
      isInputEmpty,
      isLoading,
      isExternalLoading,
      betweenCalls,
      tasksSelected: tasksSelected_2,
      isPasting: Cn,
      showExpandPasteHint: showExpandPasteHint_2,
      isSearching,
      historyQuery,
      setHistoryQuery,
      historyFailedMatch,
      rowWidth,
      wrappedRowWidth: pr,
      onOpenTasksDialog,
      onOpenArtifacts: onOpenArtifacts_2,
    });
    $[32] = betweenCalls;
    $[33] = exitMessage;
    $[34] = historyFailedMatch;
    $[35] = historyQuery;
    $[36] = isExternalLoading;
    $[37] = isLoading;
    $[38] = Cn;
    $[39] = isSearching;
    $[40] = leftArrowDetachAvailable;
    $[41] = mode;
    $[42] = tasksSelected_2;
    $[43] = proactivityLevelStepped;
    $[44] = proactivityPillCollapsed;
    $[45] = row1Hint_2;
    $[46] = pr;
    $[47] = setHistoryQuery;
    $[48] = showExpandPasteHint_2;
    $[49] = suppressHint_2;
    $[50] = Zr;
    $[51] = hideVimModeIndicator;
    $[52] = isInputEmpty;
    $[53] = rowWidth;
    $[54] = onOpenTasksDialog;
    $[55] = onOpenArtifacts_2;
    $[56] = toolPermissionContext;
    $[57] = vimMode;
    $[58] = is;
  } else is = $[58];
  let ws;
  if ($[59] !== Yr || $[60] !== is) {
    ws = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink: 1,
      children: [Yr, is, false],
    });
    $[59] = Yr;
    $[60] = is;
    $[61] = ws;
  } else ws = $[61];
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
  let oi;
  if (
    $[72] !== bridgeSelected ||
    $[73] !== chrome ||
    $[74] !== debug ||
    $[75] !== ideSelectionSelected ||
    $[76] !== modeLabels ||
    $[77] !== pr ||
    $[78] !== scope.initialMcpClients ||
    $[79] !== notifications
  ) {
    oi = jsxProd_default(PromptFooter, {
      initialMcpClients: scope.initialMcpClients,
      chrome,
      bridgeSelected,
      ideSelectionSelected,
      modeLabels,
      debug,
      rowWidth: pr,
      ref: Fr,
      notifications,
    });
    $[72] = bridgeSelected;
    $[73] = chrome;
    $[74] = debug;
    $[75] = ideSelectionSelected;
    $[76] = modeLabels;
    $[77] = pr;
    $[78] = scope.initialMcpClients;
    $[79] = notifications;
    $[80] = oi;
  } else oi = $[80];
  let Oi;
  if ($[81] !== columns || $[82] !== or || $[83] !== flexDirection || $[84] !== ws || $[85] !== oi) {
    Oi = jsxProd_default_2(Box, {
      width: columns,
      flexDirection,
      flexWrap: "wrap",
      alignItems: "flex-start",
      paddingX: or,
      columnGap: FOOTER_MESSAGES_GAP,
      children: [ws, oi],
    });
    $[81] = columns;
    $[82] = or;
    $[83] = flexDirection;
    $[84] = ws;
    $[85] = oi;
    $[86] = Oi;
  } else Oi = $[86];
  const showWorkflows = mode === "prompt" && !exitMessage.show && !Cn;
  let Zi;
  if ($[87] !== showWorkflows) {
    Zi = jsxProd_default(BackgroundTasksPanel, {
      showWorkflows,
    });
    $[87] = showWorkflows;
    $[88] = Zi;
  } else Zi = $[88];
  let da;
  if ($[89] !== Oi || $[90] !== Zi) {
    da = jsxProd_default_2(Fragment, {
      children: [Oi, Zi],
    });
    $[89] = Oi;
    $[90] = Zi;
    $[91] = da;
  } else da = $[91];
  return da;
}
//@ chunk-18hwfzwa.js:857891-857907 placement
var PromptInputFooterMemo = Rh(PromptInputFooter);
//@ chunk-18hwfzwa.js:857907-857990 placement
function shouldShowFooterStatus({ hasSuggestionContent, isFullscreen, helpOpen }) {
  return !(hasSuggestionContent && !isFullscreen) && !helpOpen;
}
//@ chunk-18hwfzwa.js:857990-858714 placement
function PromptFooter(props) {
  let $ = w(13);
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
  let ze = showSwarmFooterGate();
  let rt;
  if (
    $[0] !== bridgeSelected ||
    $[1] !== chrome ||
    $[2] !== debug ||
    $[3] !== ideSelectionSelected ||
    $[4] !== initialMcpClients ||
    $[5] !== ze ||
    $[6] !== modeLabels ||
    $[7] !== rowWidth
  ) {
    rt = ze
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
    $[5] = ze;
    $[6] = modeLabels;
    $[7] = rowWidth;
    $[8] = rt;
  } else rt = $[8];
  let kt;
  if ($[9] !== notifications || $[10] !== ref || $[11] !== rt) {
    kt = jsxProd_default_2(Box, {
      ref,
      flexShrink: 0,
      marginLeft: "auto",
      flexDirection: "column",
      alignItems: "flex-end",
      children: [notifications, rt],
    });
    $[9] = notifications;
    $[10] = ref;
    $[11] = rt;
    $[12] = kt;
  } else kt = $[12];
  return kt;
}
//@ chunk-18hwfzwa.js:858714-858729 placement
var FOOTER_HORIZONTAL_PADDING = 2;
var FOOTER_MESSAGES_GAP = 1;
//@ chunk-18hwfzwa.js:858729-858865 placement = setCwdState (1)
function setCwdState(h, cursorOffset) {
  if (h !== h.normalize("NFC")) return cursorOffset;
  let D = clampCursorOffset(h, cursorOffset);
  return parsePastedRefs(h).some((ee) => D >= ee.index && D < ee.index + ee.match.length) ? cursorOffset : D;
}
//@ chunk-18hwfzwa.js:858865-858869 placement
init_react_production();
//@ chunk-18hwfzwa.js:858869-858873 placement
init_react_production();
//@ chunk-18hwfzwa.js:858873-858877 placement
init_react_production();
//@ chunk-ag5x7vhf.js:47364-47375 placement
var FOOTER_WIDE_COLUMNS = 60;
//@ chunk-ag5x7vhf.js:47375-47788 fingerprint = BridgeStatusIndicator (0.609)
/**
 * Remote Control（bridge）状态指示：连接/断开/重连中。
 */
function BridgeStatusIndicator(m) {
  let $ = w(4);
  let { columns } = useTerminalSize();
  let x = m && columns >= FOOTER_WIDE_COLUMNS;
  let k;
  if ($[0] !== x) {
    k = (_) =>
      x && !_.replBridgeOutboundOnly && (_.replBridgeEnabled || _.replBridgeError !== undefined)
        ? getBridgeStatus({
            error: _.replBridgeError,
            connected: _.replBridgeConnected,
            sessionActive: _.replBridgeSessionActive,
            reconnecting: _.replBridgeReconnecting,
          })
        : null;
    $[0] = x;
    $[1] = k;
  } else k = $[1];
  let connected = useAppState(k);
  let D;
  if ($[2] !== connected) {
    D = connected !== null && isBridgeEnabled() ? connected : null;
    $[2] = connected;
    $[3] = D;
  } else D = $[3];
  return D;
}
export {
  FOOTER_WIDE_COLUMNS,
  shouldShowFooterStatus,
  setCwdState,
  PromptInputFooterMemo,
  BridgeStatusIndicator,
  useFooterTranscript,
  AccountMemoryMarker,
};
