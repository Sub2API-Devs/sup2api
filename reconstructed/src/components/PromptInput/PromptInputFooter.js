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
import { yt, ce, j, P, R, Rh } from "../../../vendor/react/cjs/react.production.js";
import { jgo } from "../../screens/replDialogState.js";
import { RKn } from "../../utils/backgroundHandoff.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import {
  onMemoryPauseChange,
  getMemoryToggledOff,
  onAutoMemorySessionSwitchChange,
  getAutoMemoryOffThisSession,
} from "../../bootstrap/state.js";
import { ZUo, f5s, QUo } from "../../utils/background/remote/remoteSession.js";
import { Me } from "../design-system/ThemeProvider.js";
import { vyn } from "../../services/accountMemory/memoryContext.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { qd } from "../../hooks/useSettings.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { Oy } from "./footerGates.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../ink/components/Input.js";
import { useVisibleAgentTaskCount, BackgroundTasksPanel } from "../CoordinatorAgentStatus.js";
import { useAppState } from "../../state/AppState.js";
import { getEffectiveStatusLine } from "../../utils/hooks/hooksConfigSnapshot.js";
import { useFullscreenFooterData } from "../FullscreenLayout.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { PromptInputFooterSuggestions, getArrowedSuggestionId } from "./PromptInputFooterSuggestions.js";
import { whr } from "../../utils/accessibility/screenReader.js";
import { PromptInputHelpMenu } from "./PromptInputHelpMenu.js";
import { the } from "../StatusLine.js";
import { PromptHintNamespace } from "../pluginUi/PromptHint.js";
import { Notifications } from "./Notifications.js";
import { FooterIndicators, FooterStatusLine } from "./PromptInputFooterStatus.js";
import { clampCursorOffset } from "../../vim/operators.js";
import { parsePastedRefs } from "../../history.js";
import { getBridgeStatus } from "../../bridge/bridgeStatusUtil.js";
import { isBridgeEnabled } from "../../bridge/bridgeEntitlement.js";

//@ chunk-18hwfzwa.js:851815-851966 placement
function useFooterTranscript({ turn: turn, transcript: transcript }) {
  let previewStore = turn.stream.previewStore,
    L = yt(previewStore.subscribe, () => (previewStore.getFlags() & jgo) !== 0),
    ee = ce((ke) => RKn(ke, L), [L]);
  return useStoreSelector(transcript, ee);
}
//@ chunk-18hwfzwa.js:851966-851970 placement
j();
//@ chunk-18hwfzwa.js:851970-851983 placement
var noo = null;
//@ chunk-18hwfzwa.js:851983-852334 placement
function AccountMemoryMarker() {
  let h = yt(onMemoryPauseChange, getMemoryToggledOff),
    x = yt(onAutoMemorySessionSwitchChange, getAutoMemoryOffThisSession),
    D = yt(ZUo, f5s),
    L = yt(ZUo, QUo),
    { credentials: credentials, storageV5: storageV5 } = Me();
  P(() => {}, [L, credentials, storageV5]);
  let Re = h
    ? void 0
    : noo?.accountMemoryMarker(() => {
        let He = vyn();
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
  return xs.isLoading && !0;
}
//@ chunk-18hwfzwa.js:852451-852496 layout
function selectIsExternalLoading(kr) {
  return kr.isExternalLoading;
}
//@ chunk-18hwfzwa.js:852496-852544 layout
function selectCoordinatorTaskIndex(ls) {
  return ls.coordinatorTaskIndex;
}
/**
 * 页脚组件：上方建议列表（有建议时），否则左侧 PromptInputFooterLeftSide + 右侧 Notifications；全屏与帮助菜单打开时布局不同。
 */
//@ chunk-18hwfzwa.js:852544-857891 fingerprint = PromptInputFooter (0.503)
function PromptInputFooter(h) {
  let $ = w(92),
    {
      scope: scope,
      transcript: transcript,
      turn: turn,
      chrome: chrome,
      exitMessage: exitMessage,
      row1Hint: row1Hint,
      leftArrowDetachAvailable: leftArrowDetachAvailable,
      proactivityLevelStepped: proactivityLevelStepped,
      proactivityPillCollapsed: proactivityPillCollapsed,
      vimMode: vimMode,
      mode: mode,
      isAutoUpdating: isAutoUpdating,
      verbose: verbose,
      onChangeIsUpdating: onChangeIsUpdating,
      suggestionsStore: suggestionsStore,
      inputTakesFocus: inputTakesFocus,
      onSelectSuggestion: onSelectSuggestion,
      onHoverSuggestion: onHoverSuggestion,
      toolPermissionContext: toolPermissionContext,
      helpOpen: helpOpen,
      suppressHint: suppressHint,
      tasksSelected: tasksSelected,
      bridgeSelected: bridgeSelected,
      ideSelectionSelected: ideSelectionSelected,
      isPasting: isPasting,
      showExpandPasteHint: showExpandPasteHint,
      hasStash: hasStash,
      isInputWrapped: isInputWrapped,
      isSearching: isSearching,
      historyQuery: historyQuery,
      setHistoryQuery: setHistoryQuery,
      historyFailedMatch: historyFailedMatch,
      onOpenArtifacts: onOpenArtifacts,
    } = h,
    mn = row1Hint === void 0 ? null : row1Hint,
    Cn = isPasting === void 0 ? !1 : isPasting,
    No = showExpandPasteHint === void 0 ? !1 : showExpandPasteHint,
    vo = hasStash === void 0 ? !1 : hasStash,
    {
      suggestions: suggestions,
      selectedSuggestion: selectedSuggestion,
      suggestionsEmptyMessage: suggestionsEmptyMessage,
      maxColumnWidth: maxColumnWidth,
      hoveredSuggestionId: hoveredSuggestionId,
      arrowedSuggestionId: arrowedSuggestionId,
    } = useStoreSelector(suggestionsStore),
    debug = useStoreSelector(chrome, selectDebug),
    hideLoginNotice = useStoreSelector(chrome, selectHideLoginNotice),
    Sn = useStoreSelector(turn, selectIsLoading_2),
    isExternalLoading = useStoreSelector(turn, selectIsExternalLoading),
    _o;
  if ($[0] !== transcript || $[1] !== turn)
    ((_o = { turn: turn, transcript: transcript }), ($[0] = transcript), ($[1] = turn), ($[2] = _o));
  else _o = $[2];
  let cn = useFooterTranscript(_o),
    settings = qd(),
    { columns: columns } = useTerminalSize(),
    mr = useIsFullscreen(),
    Kn = Oy(),
    Wn = useIsScreenReaderEnabled(),
    Fr = R(null),
    Zn;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((Zn = () => (Fr.current === null ? 0 : measureElement(Fr.current).width)), ($[3] = Zn));
  else Zn = $[3];
  let messagesRef = useMeasured(Zn),
    dr = AccountMemoryMarker(),
    or = Kn ? 0 : $3e,
    pr = columns - 2 * or,
    isFullscreen = useVisibleAgentTaskCount(),
    coordinatorTaskIndex = useAppState(selectCoordinatorTaskIndex),
    Ir = tasksSelected && (isFullscreen === 0 || coordinatorTaskIndex < 0);
  const Pr = settings?.statusLine;
  let ts;
  if ($[4] !== Pr) ((ts = getEffectiveStatusLine(Pr)), ($[4] = Pr), ($[5] = ts));
  else ts = $[5];
  let Gn = ts,
    Ur = Gn !== void 0,
    Zr = suppressHint || isSearching,
    wr = Zr || Ur,
    zr = suggestions.length > 0 || !!suggestionsEmptyMessage,
    _r;
  if (
    $[6] !== zr ||
    $[7] !== hoveredSuggestionId ||
    $[8] !== mr ||
    $[9] !== maxColumnWidth ||
    $[10] !== onHoverSuggestion ||
    $[11] !== onSelectSuggestion ||
    $[12] !== selectedSuggestion ||
    $[13] !== suggestions ||
    $[14] !== suggestionsEmptyMessage
  )
    ((_r =
      mr && zr
        ? {
            suggestions: suggestions,
            selectedSuggestion: selectedSuggestion,
            maxColumnWidth: maxColumnWidth,
            emptyMessage: suggestionsEmptyMessage,
            hoveredId: hoveredSuggestionId,
            onSelect: onSelectSuggestion,
            onHoverChange: onHoverSuggestion,
          }
        : null),
      ($[6] = zr),
      ($[7] = hoveredSuggestionId),
      ($[8] = mr),
      ($[9] = maxColumnWidth),
      ($[10] = onHoverSuggestion),
      ($[11] = onSelectSuggestion),
      ($[12] = selectedSuggestion),
      ($[13] = suggestions),
      ($[14] = suggestionsEmptyMessage),
      ($[15] = _r));
  else _r = $[15];
  if (
    (useFullscreenFooterData(_r),
    !shouldShowFooterStatus({ hasSuggestionContent: zr, isFullscreen: mr, helpOpen: helpOpen }))
  ) {
    let $r;
    if (
      $[16] !== arrowedSuggestionId ||
      $[17] !== zr ||
      $[18] !== inputTakesFocus ||
      $[19] !== mr ||
      $[20] !== maxColumnWidth ||
      $[21] !== selectedSuggestion ||
      $[22] !== suggestions ||
      $[23] !== suggestionsEmptyMessage
    )
      (($r =
        zr && !mr
          ? e(Box, {
              paddingX: 2,
              paddingY: 0,
              children: e(PromptInputFooterSuggestions, {
                suggestions: suggestions,
                selectedSuggestion: selectedSuggestion,
                maxColumnWidth: maxColumnWidth,
                emptyMessage: suggestionsEmptyMessage,
                keepWindow: whr(),
                cursorRowId: inputTakesFocus
                  ? getArrowedSuggestionId({
                      suggestions: suggestions,
                      selectedSuggestion: selectedSuggestion,
                      arrowedSuggestionId: arrowedSuggestionId,
                    })
                  : null,
              }),
            })
          : e(PromptInputHelpMenu, { dimColor: !0, fixedWidth: !0, paddingX: 2 })),
        ($[16] = arrowedSuggestionId),
        ($[17] = zr),
        ($[18] = inputTakesFocus),
        ($[19] = mr),
        ($[20] = maxColumnWidth),
        ($[21] = selectedSuggestion),
        ($[22] = suggestions),
        ($[23] = suggestionsEmptyMessage),
        ($[24] = $r));
    else $r = $[24];
    return $r;
  }
  const $r = Wn ? "column" : "row";
  let Yr;
  if (
    $[25] !== exitMessage ||
    $[26] !== Cn ||
    $[27] !== mode ||
    $[28] !== Ur ||
    $[29] !== transcript ||
    $[30] !== vimMode
  )
    ((Yr =
      mode === "prompt" &&
      !exitMessage.show &&
      !Cn &&
      Ur &&
      e(the, { transcript: transcript, vimMode: vimMode })),
      ($[25] = exitMessage),
      ($[26] = Cn),
      ($[27] = mode),
      ($[28] = Ur),
      ($[29] = transcript),
      ($[30] = vimMode),
      ($[31] = Yr));
  else Yr = $[31];
  const Er = Gn?.hideVimModeIndicator ?? !1,
    Vr = !suppressHint,
    ms = pr - (Wn ? 0 : QX + messagesRef),
    Xs = mr ? chrome.openBashesDialog : void 0,
    Ls = mr ? onOpenArtifacts : void 0;
  let is;
  if (
    $[32] !== cn ||
    $[33] !== exitMessage ||
    $[34] !== historyFailedMatch ||
    $[35] !== historyQuery ||
    $[36] !== isExternalLoading ||
    $[37] !== Sn ||
    $[38] !== Cn ||
    $[39] !== isSearching ||
    $[40] !== leftArrowDetachAvailable ||
    $[41] !== mode ||
    $[42] !== Ir ||
    $[43] !== proactivityLevelStepped ||
    $[44] !== proactivityPillCollapsed ||
    $[45] !== mn ||
    $[46] !== pr ||
    $[47] !== setHistoryQuery ||
    $[48] !== No ||
    $[49] !== wr ||
    $[50] !== Zr ||
    $[51] !== Er ||
    $[52] !== Vr ||
    $[53] !== ms ||
    $[54] !== Xs ||
    $[55] !== Ls ||
    $[56] !== toolPermissionContext ||
    $[57] !== vimMode
  )
    ((is = e(PromptHintNamespace.FooterHintLine, {
      exitMessage: exitMessage,
      row1Hint: mn,
      leftArrowDetachAvailable: leftArrowDetachAvailable,
      proactivityLevelStepped: proactivityLevelStepped,
      proactivityPillCollapsed: proactivityPillCollapsed,
      vimMode: vimMode,
      hideVimModeIndicator: Er,
      mode: mode,
      toolPermissionContext: toolPermissionContext,
      suppressHint: wr,
      suppressHintExceptStatusline: Zr,
      isInputEmpty: Vr,
      isLoading: Sn,
      isExternalLoading: isExternalLoading,
      betweenCalls: cn,
      tasksSelected: Ir,
      isPasting: Cn,
      showExpandPasteHint: No,
      isSearching: isSearching,
      historyQuery: historyQuery,
      setHistoryQuery: setHistoryQuery,
      historyFailedMatch: historyFailedMatch,
      rowWidth: ms,
      wrappedRowWidth: pr,
      onOpenTasksDialog: Xs,
      onOpenArtifacts: Ls,
    })),
      ($[32] = cn),
      ($[33] = exitMessage),
      ($[34] = historyFailedMatch),
      ($[35] = historyQuery),
      ($[36] = isExternalLoading),
      ($[37] = Sn),
      ($[38] = Cn),
      ($[39] = isSearching),
      ($[40] = leftArrowDetachAvailable),
      ($[41] = mode),
      ($[42] = Ir),
      ($[43] = proactivityLevelStepped),
      ($[44] = proactivityPillCollapsed),
      ($[45] = mn),
      ($[46] = pr),
      ($[47] = setHistoryQuery),
      ($[48] = No),
      ($[49] = wr),
      ($[50] = Zr),
      ($[51] = Er),
      ($[52] = Vr),
      ($[53] = ms),
      ($[54] = Xs),
      ($[55] = Ls),
      ($[56] = toolPermissionContext),
      ($[57] = vimMode),
      ($[58] = is));
  else is = $[58];
  let ws;
  if ($[59] !== Yr || $[60] !== is)
    ((ws = r(Box, { flexDirection: "column", flexShrink: 1, children: [Yr, is, !1] })),
      ($[59] = Yr),
      ($[60] = is),
      ($[61] = ws));
  else ws = $[61];
  let Ci;
  if (
    $[62] !== vo ||
    $[63] !== hideLoginNotice ||
    $[64] !== isAutoUpdating ||
    $[65] !== mr ||
    $[66] !== isInputWrapped ||
    $[67] !== onChangeIsUpdating ||
    $[68] !== scope.apiKeyVerification ||
    $[69] !== transcript ||
    $[70] !== verbose
  )
    ((Ci = mr
      ? null
      : e(Notifications, {
          apiKeyVerification: scope.apiKeyVerification,
          hideLoginNotice: hideLoginNotice,
          isAutoUpdating: isAutoUpdating,
          verbose: verbose,
          transcript: transcript,
          onChangeIsUpdating: onChangeIsUpdating,
          isInputWrapped: isInputWrapped,
          hasStash: vo,
        })),
      ($[62] = vo),
      ($[63] = hideLoginNotice),
      ($[64] = isAutoUpdating),
      ($[65] = mr),
      ($[66] = isInputWrapped),
      ($[67] = onChangeIsUpdating),
      ($[68] = scope.apiKeyVerification),
      ($[69] = transcript),
      ($[70] = verbose),
      ($[71] = Ci));
  else Ci = $[71];
  let oi;
  if (
    $[72] !== bridgeSelected ||
    $[73] !== chrome ||
    $[74] !== debug ||
    $[75] !== ideSelectionSelected ||
    $[76] !== dr ||
    $[77] !== pr ||
    $[78] !== scope.initialMcpClients ||
    $[79] !== Ci
  )
    ((oi = e(PromptFooter, {
      initialMcpClients: scope.initialMcpClients,
      chrome: chrome,
      bridgeSelected: bridgeSelected,
      ideSelectionSelected: ideSelectionSelected,
      modeLabels: dr,
      debug: debug,
      rowWidth: pr,
      ref: Fr,
      notifications: Ci,
    })),
      ($[72] = bridgeSelected),
      ($[73] = chrome),
      ($[74] = debug),
      ($[75] = ideSelectionSelected),
      ($[76] = dr),
      ($[77] = pr),
      ($[78] = scope.initialMcpClients),
      ($[79] = Ci),
      ($[80] = oi));
  else oi = $[80];
  let Oi;
  if ($[81] !== columns || $[82] !== or || $[83] !== $r || $[84] !== ws || $[85] !== oi)
    ((Oi = r(Box, {
      width: columns,
      flexDirection: $r,
      flexWrap: "wrap",
      alignItems: "flex-start",
      paddingX: or,
      columnGap: QX,
      children: [ws, oi],
    })),
      ($[81] = columns),
      ($[82] = or),
      ($[83] = $r),
      ($[84] = ws),
      ($[85] = oi),
      ($[86] = Oi));
  else Oi = $[86];
  const Hi = mode === "prompt" && !exitMessage.show && !Cn;
  let Zi;
  if ($[87] !== Hi) ((Zi = e(BackgroundTasksPanel, { showWorkflows: Hi })), ($[87] = Hi), ($[88] = Zi));
  else Zi = $[88];
  let da;
  if ($[89] !== Oi || $[90] !== Zi)
    ((da = r(Fragment, { children: [Oi, Zi] })), ($[89] = Oi), ($[90] = Zi), ($[91] = da));
  else da = $[91];
  return da;
}
//@ chunk-18hwfzwa.js:857891-857907 placement
var PromptInputFooterMemo = Rh(PromptInputFooter);
//@ chunk-18hwfzwa.js:857907-857990 placement
function shouldShowFooterStatus({
  hasSuggestionContent: hasSuggestionContent,
  isFullscreen: isFullscreen,
  helpOpen: helpOpen,
}) {
  return !(hasSuggestionContent && !isFullscreen) && !helpOpen;
}
//@ chunk-18hwfzwa.js:857990-858714 placement
function PromptFooter(h) {
  let $ = w(13),
    {
      notifications: notifications,
      initialMcpClients: initialMcpClients,
      chrome: chrome,
      bridgeSelected: bridgeSelected,
      ideSelectionSelected: ideSelectionSelected,
      modeLabels: modeLabels,
      debug: debug,
      rowWidth: rowWidth,
      ref: ref,
    } = h,
    ze = Oy(),
    rt;
  if (
    $[0] !== bridgeSelected ||
    $[1] !== chrome ||
    $[2] !== debug ||
    $[3] !== ideSelectionSelected ||
    $[4] !== initialMcpClients ||
    $[5] !== ze ||
    $[6] !== modeLabels ||
    $[7] !== rowWidth
  )
    ((rt = ze
      ? e(FooterIndicators, {
          width: rowWidth,
          chrome: chrome,
          initialMcpClients: initialMcpClients,
          bridgeSelected: bridgeSelected,
          ideSelectionSelected: ideSelectionSelected,
        })
      : e(FooterStatusLine, { debug: debug, bridgeSelected: bridgeSelected, modeLabels: modeLabels })),
      ($[0] = bridgeSelected),
      ($[1] = chrome),
      ($[2] = debug),
      ($[3] = ideSelectionSelected),
      ($[4] = initialMcpClients),
      ($[5] = ze),
      ($[6] = modeLabels),
      ($[7] = rowWidth),
      ($[8] = rt));
  else rt = $[8];
  let kt;
  if ($[9] !== notifications || $[10] !== ref || $[11] !== rt)
    ((kt = r(Box, {
      ref: ref,
      flexShrink: 0,
      marginLeft: "auto",
      flexDirection: "column",
      alignItems: "flex-end",
      children: [notifications, rt],
    })),
      ($[9] = notifications),
      ($[10] = ref),
      ($[11] = rt),
      ($[12] = kt));
  else kt = $[12];
  return kt;
}
//@ chunk-18hwfzwa.js:858714-858729 placement
var $3e = 2,
  QX = 1;
//@ chunk-18hwfzwa.js:858729-858865 placement = setCwdState (1)
function setCwdState(h, x) {
  if (h !== h.normalize("NFC")) return x;
  let D = clampCursorOffset(h, x);
  return parsePastedRefs(h).some((ee) => D >= ee.index && D < ee.index + ee.match.length) ? x : D;
}
//@ chunk-18hwfzwa.js:858865-858869 placement
j();
//@ chunk-18hwfzwa.js:858869-858873 placement
j();
//@ chunk-18hwfzwa.js:858873-858877 placement
j();
//@ chunk-ag5x7vhf.js:47364-47375 placement
var FOOTER_WIDE_COLUMNS = 60;
/**
 * Remote Control（bridge）状态指示：连接/断开/重连中。
 */
//@ chunk-ag5x7vhf.js:47375-47788 fingerprint = BridgeStatusIndicator (0.609)
function BridgeStatusIndicator(m) {
  let $ = w(4),
    { columns: columns } = useTerminalSize(),
    x = m && columns >= FOOTER_WIDE_COLUMNS,
    k;
  if ($[0] !== x)
    ((k = (_) =>
      x && !_.replBridgeOutboundOnly && (_.replBridgeEnabled || _.replBridgeError !== void 0)
        ? getBridgeStatus({
            error: _.replBridgeError,
            connected: _.replBridgeConnected,
            sessionActive: _.replBridgeSessionActive,
            reconnecting: _.replBridgeReconnecting,
          })
        : null),
      ($[0] = x),
      ($[1] = k));
  else k = $[1];
  let connected = useAppState(k),
    D;
  if ($[2] !== connected)
    ((D = connected !== null && isBridgeEnabled() ? connected : null), ($[2] = connected), ($[3] = D));
  else D = $[3];
  return D;
}

export {
  setCwdState,
  FOOTER_WIDE_COLUMNS,
  shouldShowFooterStatus,
  PromptInputFooterMemo,
  BridgeStatusIndicator,
  useFooterTranscript,
  AccountMemoryMarker,
};
