/**
 * components/PromptInput/PromptInput.tsx
 *
 * 主输入框组件 PromptInput：订阅 PromptDraft（value/cursorOffset/mode/pastedContents），组合 TextInput/VimTextInput、模式指示、建议、历史、粘贴、语音、页脚与帮助菜单，提交时调用 onSubmit。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInput.tsx
 * pieces: chunk-czq1j3j2.js (22)
 * attribution: fingerprint 2, sole-consumer 18, affinity 1, placement 1
 */
import { getActiveAgentForInput } from "../../state/selectors.js";
import { EMPTY_MESSAGES } from "../../state/inProgressToolUses.js";
import { isImagePlaceholder, hasCommand, TEAM_SETUP_GUIDE_LABEL } from "../../commands.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import {
  selectDraftValue,
  selectCursorOffset,
  selectInputMode,
  selectPastedContents,
  selectInterimRange,
  selectDecorations,
  selectCameBack,
  createFrozenEmpty,
  composeNormalized,
} from "../../screens/repl/PromptDraft.js";
import {
  selectCommands,
  selectMcpClients2,
  selectAgentDefinitionsActiveAgents_3,
  queuedHumanRows,
  clearFooterSelectionState,
  isDeleteOrKillKey,
  useComposerEscape,
  dismissPromptOverlay,
  getEditorWaitBorderStyle,
} from "./usePromptInputKeys.js";
import { useMergedClients, NOTIFICATION_TIMEOUT_MS } from "./Notifications.js";
import { useAppState, useAppStoreDirect, useSetAppState } from "../../state/AppState.js";
import { selectTeamContext } from "../teams/TeamStatus.js";
import { selectViewingAgentTaskId_4 } from "./PromptComposer.js";
import { useSession } from "../../context/session.js";
import { sessionStore, useVimMode } from "../../screens/repl/storeHooks.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useCommandQueueOrDefault, useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { useCommandQueue } from "../Messages.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../hooks/useMainLoopModel.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useNotifications } from "../../context/notifications.js";
import { useEditorMode } from "../../utils/subagentStatusLine.js";
import {
  useRef,
  useLayoutEffect,
  useEffect,
  useSyncExternalStore,
  useReducer,
  useImperativeHandle,
  memo,
} from "../../../vendor/react/cjs/react.production.js";
import { setLaunchWarningFor } from "../../state/promptInputStore.js";
import {
  normalizeVimMode,
  isSyntheticContent,
  endsWithCombiningMatch,
  addInlineTextContentsWithFallback,
  mentionsUltraplan,
  hasTextAfterNfcNormalize,
} from "./promptText.js";
import { setCwdState } from "./PromptInputFooter.js";
import { countWhere } from "../../utils/collections.js";
import { isQueuedCommandEditable } from "../../utils/messageQueueManager.js";
import {
  registerPasteCarrier,
  getLaunchMessagesOutsidePastes,
  parsePastedRefs,
  expandTruncatedPastes,
  nfcVariants,
  expandLastPaste,
  getPastedTextRefNumLines,
  mintPasteId,
  formatPastedTextRef,
  MAX_HISTORY_ENTRIES,
  formatImageRef,
} from "../../history.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { stripModePrefix, getModeFromInput as getModeFromInput_2 } from "./inputModes.js";
import {
  ULTRATHINK_KEYWORD,
  findUltrareviewTriggerPositions,
  ULTRACODE_KEYWORD,
} from "../../utils/ultraplan/keyword.js";
import { ultrathinkRaisesEffort } from "../../utils/effort.js";
import {
  setupGuideChipHighlights,
  isSetupGuideLink,
  isSetupGuidePaste,
} from "../../utils/commandPredicates.js";
import { isUltraplanEnabled } from "../../commands/ultraplan.js";
import { isUltrareviewWithBridge } from "../../commands/review/ultrareviewPreconditions.js";
import {
  isWorkflowsAvailable,
  isWorkflowKeywordTriggerEnabled,
} from "../../utils/workflows/workflowGates.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../../keybindings/useShortcutDisplay.js";
import { findBtwTriggerPositions } from "../../utils/sideQuestion.js";
import { findSlashMentionRanges } from "../../utils/attachments/skillMentions.js";
import {
  onKnownSlackChannelsChanged,
  getKnownSlackChannelsVersion,
  hasSlackClient,
  findSlackChannelMentions,
} from "../../utils/suggestions/slackChannelSuggestions.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { isAgentColorName, AGENT_COLOR_TO_THEME_COLOR } from "../../tools/AgentTool/agentColorManager.js";
import {
  useSpellcheckHighlights,
  mergeNonOverlappingRanges,
  formatPasteLabel,
  historyPositionLabel,
} from "./spellcheck.js";
import { getRainbowColor } from "../../utils/thinking.js";
import { emptySpans, overlayDecorations, normalizeInputDecorations } from "./inputDecorations.js";
import {
  EMPTY_SPANS,
  buildVirtualTextLayout,
  offsetDecorations,
} from "../../plugins/functionHooks/prompt/decorationSpans.js";
import { isNfcStable, rangesBefore, createDisplayCursor } from "../../hooks/useTextInput.js";
import { firstGrapheme } from "../../utils/intl.js";
import { logEvent } from "../../services/analytics/index.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { useInputBuffer } from "../../hooks/useInputBuffer.js";
import { useMaybeTruncateInput } from "./useMaybeTruncateInput.js";
import { COMPOSER_EDIT_ORIGIN } from "../../plugins/functionHooks/sessionEvents.js";
import { relayPromptEdits, undoPromptOrigin } from "../pluginUi/promptEditHook.js";
import { historyPromptOrigin } from "../../hooks/useHistorySearch.js";
import { clampCursorOffset, clampOffsetOutsidePlaceholder } from "../../vim/operators.js";
import { useArrowKeyHistory } from "../../hooks/useArrowKeyHistory.js";
import { mergeTurnTags } from "../../utils/userTurnTags.js";
import { useTypeahead } from "../../hooks/useTypeahead.js";
import { isKbCohesionFixesOn } from "../../utils/kbCohesionFixes.js";
import { getPlatform } from "../../utils/platform.js";
import { isMacOptionSpecialChar, MACOS_OPTION_SPECIAL_CHARS } from "../../utils/keyboardShortcuts.js";
import { getNativeCSIuTerminalDisplayName } from "../../commands/terminalSetup/terminalSetup.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isVirtualPancakeEnabled } from "../../utils/permissions/permissionSetup.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { PASTE_THRESHOLD, getImageFromClipboard, looksLikeBinaryText } from "../../utils/imagePaste.js";
import { stripInvisibleChars_2 } from "../../utils/invisibleChars.js";
import { isYankKey, startsWithPunctuation } from "../../hooks/useSearchInput.js";
import { EDITOR_MODES } from "../../utils/configConstants.js";
import { Cursor } from "../../utils/Cursor.js";
import { setSliceField } from "../../state/sliceHelpers.js";
import { recordImagePath, storeImageAndRecord } from "../../utils/imageStore.js";
import { useDoublePress } from "../../keybindings/useActionHandlers.js";
import { formatAtMention, useIdeAtMentioned } from "../../hooks/useIdeAtMentioned.js";
import { collectTrailingAssistantTexts } from "../../utils/messages.js";
import { editPromptInEditor } from "../../utils/promptEditor.js";
import { errorMessage } from "../../utils/errors.js";
import { getShortcutDisplay } from "../../keybindings/shortcutFormat.js";
import { useApp } from "../../ink/components/Input.js";
import { env } from "../../utils/env.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { readClipboard } from "../../ink/termio/osc.js";
import { useFooterAwareMessageActions } from "../CoordinatorAgentStatus.js";
import { showSwarmFooterGate } from "./footerGates.js";
import {
  useTeammateBanner,
  badgeWidth,
  promptModeBadgeText,
  PromptModeBadge,
  PromptBorderBanner,
} from "./promptBorderColor.js";
import { useSessionBanner } from "./useSwarmBanner.js";
import { ideSelectionLabel } from "../IdeStatusIndicator.js";
import { useIdeConnectionStatus } from "../../hooks/useIdeConnectionStatus.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import { selectionBounds } from "../../ink/selection.js";
import { useInputSelectionBridge } from "../../ink/inputSelectionBridge.js";
import { sequential } from "../../utils/sequential.js";
import { VimTextInput } from "../VimTextInput.js";
import { TextInput } from "../TextInput.js";
import { Divider } from "../design-system/Divider.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:159494-159624 fingerprint (2.1.88 match: buildBorderText, 0.791)
/**
 * 拼输入框上边框文字（如会话标题/状态）。
 */
function buildBorderText(segments) {
  let fastSeg = segments.filter(Boolean).join("  ") || undefined;
  return fastSeg
    ? {
        content: ` ${fastSeg} `,
        position: "top",
        align: "end",
        offset: 0,
      }
    : undefined;
}
//@ chunk-czq1j3j2.js:912164-912259 sole-consumer
function hasSuppliedTextLink(state) {
  return state.linkSuppliedTexts.size > 0 && state.linkSuppliedTexts.has(state.value.trim());
}
//@ chunk-czq1j3j2.js:912259-912303 sole-consumer
function selectQueueEditIndex_2(state) {
  return state.queueEditIndex;
}
//@ chunk-czq1j3j2.js:912303-912412 sole-consumer
function viewedAgentMessages(state) {
  let activeAgentForInput = getActiveAgentForInput(state);
  return activeAgentForInput.type === "leader"
    ? undefined
    : (state.transcripts[activeAgentForInput.task.id]?.messages ?? EMPTY_MESSAGES);
}
//@ chunk-czq1j3j2.js:912412-912620 sole-consumer
function pendingMessagesForActiveAgent(state) {
  let activeAgentForInput = getActiveAgentForInput(state);
  switch (activeAgentForInput.type) {
    case "leader": {
      return;
    }
    case "viewed": {
      return activeAgentForInput.task.paneTeardown === undefined
        ? activeAgentForInput.task.pendingUserMessages
        : undefined;
    }
    case "named_agent": {
      return activeAgentForInput.task.pendingMessages;
    }
  }
}
//@ chunk-czq1j3j2.js:912620-912659 sole-consumer
function shownAsList(state) {
  return state.shownAs ?? [];
}
//@ chunk-czq1j3j2.js:912659-912708 sole-consumer
function selectUltraplanSessionUrl(state) {
  return state.ultraplanSessionUrl;
}
//@ chunk-czq1j3j2.js:912708-912756 sole-consumer
function selectUltraplanLaunching(state) {
  return state.ultraplanLaunching;
}
//@ chunk-czq1j3j2.js:912756-912794 sole-consumer
function isImagePasteRef(ref) {
  return isImagePlaceholder(ref.match);
}
//@ chunk-czq1j3j2.js:912794-912810 sole-consumer
function noopInputUpdate() {}
//@ chunk-czq1j3j2.js:912810-912839 sole-consumer
function incrementOffset(offset) {
  return offset + 1;
}
//@ chunk-czq1j3j2.js:912839-912883 sole-consumer
function normalizeNfd(text) {
  return text.normalize("NFD");
}
//@ chunk-czq1j3j2.js:912883-912913 sole-consumer
function pasteIdOf(ref) {
  return ref.id;
}
//@ chunk-czq1j3j2.js:912913-912976 sole-consumer
function isOrphanedTextPaste(entry) {
  let [, ref] = entry;
  return ref.type === "text" && !ref.inline;
}
//@ chunk-czq1j3j2.js:912976-913013 sole-consumer
function secondEntryValue(entry) {
  let [, value] = entry;
  return value;
}
//@ chunk-czq1j3j2.js:913013-913101 sole-consumer
function truncatedTextPasteIds(ref) {
  return ref.match.startsWith("[...Truncated text") ? [String(ref.id)] : [];
}
//@ chunk-czq1j3j2.js:913101-913117 sole-consumer
function noopMessageSelector() {}
//@ chunk-czq1j3j2.js:913117-913184 sole-consumer
function markStashUsed(state) {
  return state.hasUsedStash
    ? state
    : {
        ...state,
        hasUsedStash: true,
      };
}
//@ chunk-czq1j3j2.js:913184-913256 sole-consumer
function logImagePasteFailure(error) {
  logFeatureBad("input_image_paste", "clipboard_read_failed");
  logError(error);
}
//@ chunk-czq1j3j2.js:913256-913282 affinity
var MIN_INPUT_ROWS = 5;
var MIN_FULLSCREEN_INPUT_ROWS = 3;
var INPUT_BADGE_GUTTER = 3;
var INPUT_RIGHT_GUTTER = 2;
//@ chunk-czq1j3j2.js:913282-951491 fingerprint (2.1.88 match: PromptInput, 0.39)
/**
 * 主输入框。从 PromptDraft 订阅 value/cursorOffset/mode/pastedContents/interimRange/decorations，从 scope 取 commands；组合：模式指示 + TextInput/VimTextInput（由 editorMode 决定）+ 建议列表（useTypeahead）+ 历史（useArrowKeyHistory / Ctrl+R）+ 粘贴（usePasteHandler，图片转 [Image #N]）+ 语音（useVoiceIntegration）+ 页脚/帮助菜单。
 * 关键行为：输入首字符 ! 切到 bash 模式；@队友 提及高亮；超长输入自动折叠；排队命令可上箭头回到编辑（queueEditIndex）；alt+w 切换 workflow 关键词；提交时调用 onSubmit(value, helpers)。
 */
function PromptInput(props) {
  let $ = useMemoCache(543);
  let {
    ref,
    draft,
    transcript,
    scope,
    turn,
    chrome,
    suggestionsStore,
    hidden,
    inputTakesFocus,
    takePendingPastes,
    takeEnter,
    embedded,
    onSubmit,
    dispatchCommand,
    chordGestureSpent,
    markAccepted,
    isSearchingHistory,
    historyQuery,
    historyMatch,
    historyFailedMatch,
    historySearchKeyDown,
    onOpenHistorySearch,
    helpOpen,
    setHelpOpen,
    toggleHelp,
    isModalOverlayActive,
    footerItemSelected,
    ideSelectionRidesRow1,
    footerOwnsKeyOf,
    onHistoryDownPastEnd,
    placeholder,
    leftArrowRoute,
    modeIndicator,
    ideSelection,
    topBorderText,
    fastModeTag,
    fastModeCooldown,
    ultraEffortTag,
    onIsPastingChange,
    onExitMessage,
    onExpandPasteHintChange,
    onExternalEditorActiveChange,
  } = props;
  let value = useStoreSelector(draft, selectDraftValue);
  let cursorOffset = useStoreSelector(draft, selectCursorOffset);
  let mode = useStoreSelector(draft, selectInputMode);
  let pastedContents = useStoreSelector(draft, selectPastedContents);
  let interimRange = useStoreSelector(draft, selectInterimRange);
  let decorations = useStoreSelector(draft, selectDecorations);
  let cameBack = useStoreSelector(draft, selectCameBack);
  let { setValue, setCursorOffset, setMode, setPastedContents } = draft;
  let commands = useStoreSelector(scope, selectCommands);
  let mcpClients = useMergedClients(scope.initialMcpClients, useAppState(selectMcpClients2));
  let activeAgents = useAppState(selectAgentDefinitionsActiveAgents_3);
  let teamContext = useAppState(selectTeamContext);
  let viewingAgentTaskId = useAppState(selectViewingAgentTaskId_4);
  let store = useAppStoreDirect();
  let setAppState = useSetAppState();
  let session = useSession();
  let sessionUiStore = sessionStore();
  let storeSelector = useStoreSelector(sessionUiStore, hasSuppliedTextLink);
  let { storageV5 } = useTheme_2();
  let messageQueue = useCommandQueueOrDefault();
  let commandQueue = useCommandQueue();
  let mainLoopModel = useMainLoopModel_3();
  let clock = useClock();
  let { columns, rows } = useTerminalSize();
  let plain = useIsScreenReaderEnabled();
  let { addNotification, removeNotification } = useNotifications();
  let vimMode = useVimMode();
  let isVimEditorMode = useEditorMode();
  let promptSuggestionState = useRef(false);
  let onModeChangeRaw;
  if ($[0] !== session) {
    onModeChangeRaw = (warningId) => {
      promptSuggestionState.current = false;
      setLaunchWarningFor(session, warningId);
    };
    $[0] = session;
    $[1] = onModeChangeRaw;
  } else onModeChangeRaw = $[1];
  let onModeChange = onModeChangeRaw;
  let cursorFixEffect;
  let cursorFixDeps;
  if ($[2] !== draft || $[3] !== sessionUiStore || $[4] !== isVimEditorMode) {
    cursorFixEffect = () => {
      if (!isVimEditorMode || normalizeVimMode(sessionUiStore.getState().vimMode) !== "NORMAL") {
        return;
      }
      draft.setCursorOffset(setCwdState(draft.value.normalize("NFC"), draft.cursorOffset));
    };
    cursorFixDeps = [draft, sessionUiStore, isVimEditorMode];
    $[2] = draft;
    $[3] = sessionUiStore;
    $[4] = isVimEditorMode;
    $[5] = cursorFixEffect;
    $[6] = cursorFixDeps;
  } else {
    cursorFixEffect = $[5];
    cursorFixDeps = $[6];
  }
  useLayoutEffect(cursorFixEffect, cursorFixDeps);
  let externalChangeCursorEffect;
  let externalChangeCursorDeps;
  if ($[7] !== draft || $[8] !== value || $[9] !== sessionUiStore || $[10] !== isVimEditorMode) {
    externalChangeCursorEffect = () => {
      if (!isVimEditorMode || !draft.changedFromOutside || sessionUiStore.getState().vimMode !== "NORMAL") {
        return;
      }
      draft.setCursorOffset(setCwdState(value.normalize("NFC"), draft.cursorOffset));
    };
    externalChangeCursorDeps = [value, draft, sessionUiStore, isVimEditorMode];
    $[7] = draft;
    $[8] = value;
    $[9] = sessionUiStore;
    $[10] = isVimEditorMode;
    $[11] = externalChangeCursorEffect;
    $[12] = externalChangeCursorDeps;
  } else {
    externalChangeCursorEffect = $[11];
    externalChangeCursorDeps = $[12];
  }
  useLayoutEffect(externalChangeCursorEffect, externalChangeCursorDeps);
  let speculation = useRef(value);
  let setQueueEditIndexRaw;
  if ($[13] !== draft.value || $[14] !== setAppState) {
    setQueueEditIndexRaw = (index) => {
      if (index !== null) speculation.current = draft.value;
      setAppState((prev) =>
        prev.queueEditIndex === index
          ? prev
          : {
              ...prev,
              queueEditIndex: index,
            },
      );
    };
    $[13] = draft.value;
    $[14] = setAppState;
    $[15] = setQueueEditIndexRaw;
  } else setQueueEditIndexRaw = $[15];
  let setQueueEditIndex = setQueueEditIndexRaw;
  let resetQueueEditEffect;
  if (
    $[16] !== draft.changedFromOutside ||
    $[17] !== value ||
    $[18] !== setQueueEditIndex ||
    $[19] !== store
  ) {
    resetQueueEditEffect = () => {
      if (speculation.current === value) {
        return;
      }
      speculation.current = value;
      if (draft.changedFromOutside) {
        return;
      }
      if (store.getState().queueEditIndex !== null) setQueueEditIndex(null);
    };
    $[16] = draft.changedFromOutside;
    $[17] = value;
    $[18] = setQueueEditIndex;
    $[19] = store;
    $[20] = resetQueueEditEffect;
  } else resetQueueEditEffect = $[20];
  let resetQueueEditDeps;
  if ($[21] !== draft || $[22] !== value || $[23] !== setQueueEditIndex || $[24] !== store) {
    resetQueueEditDeps = [value, setQueueEditIndex, store, draft];
    $[21] = draft;
    $[22] = value;
    $[23] = setQueueEditIndex;
    $[24] = store;
    $[25] = resetQueueEditDeps;
  } else resetQueueEditDeps = $[25];
  useEffect(resetQueueEditEffect, resetQueueEditDeps);
  let queueEditIndex = useAppState(selectQueueEditIndex_2);
  let clampQueueEditEffect;
  if ($[26] !== commandQueue || $[27] !== setQueueEditIndex || $[28] !== store) {
    clampQueueEditEffect = () => {
      let queueEditIndex = store.getState().queueEditIndex;
      if (queueEditIndex === null) {
        return;
      }
      let refillableCount = countWhere(commandQueue, isQueuedCommandEditable);
      if (refillableCount === 0) setQueueEditIndex(null);
      else if (queueEditIndex > refillableCount - 1) setQueueEditIndex(refillableCount - 1);
    };
    $[26] = commandQueue;
    $[27] = setQueueEditIndex;
    $[28] = store;
    $[29] = clampQueueEditEffect;
  } else clampQueueEditEffect = $[29];
  let clampQueueEditDeps;
  if ($[30] !== queueEditIndex || $[31] !== commandQueue || $[32] !== setQueueEditIndex || $[33] !== store) {
    clampQueueEditDeps = [commandQueue, queueEditIndex, setQueueEditIndex, store];
    $[30] = queueEditIndex;
    $[31] = commandQueue;
    $[32] = setQueueEditIndex;
    $[33] = store;
    $[34] = clampQueueEditDeps;
  } else clampQueueEditDeps = $[34];
  useEffect(clampQueueEditEffect, clampQueueEditDeps);
  let viewSelectionMode = useAppState(viewedAgentMessages);
  let mainLoopModel_ = useAppState(pendingMessagesForActiveAgent);
  let queuedRows;
  if ($[35] !== viewSelectionMode || $[36] !== mainLoopModel_) {
    queuedRows = viewSelectionMode
      ? queuedHumanRows(viewSelectionMode, {
          queuedRowIds: new Set(mainLoopModel_?.flatMap(shownAsList)),
        })
      : undefined;
    $[35] = viewSelectionMode;
    $[36] = mainLoopModel_;
    $[37] = queuedRows;
  } else queuedRows = $[37];
  let queuedRowsStable = queuedRows;
  let mainLoopModelForSession = useRef(null);
  let registerPasteEffect;
  if ($[38] !== draft.value) {
    registerPasteEffect = () => registerPasteCarrier(() => [draft.value]);
    $[38] = draft.value;
    $[39] = registerPasteEffect;
  } else registerPasteEffect = $[39];
  let registerPasteDeps;
  if ($[40] !== draft) {
    registerPasteDeps = [draft];
    $[40] = draft;
    $[41] = registerPasteDeps;
  } else registerPasteDeps = $[41];
  useEffect(registerPasteEffect, registerPasteDeps);
  let thinkingEnabled = useRef(false);
  let isFastMode = useRef(null);
  let resetPasteHint;
  if ($[42] !== onExpandPasteHintChange) {
    resetPasteHint = () => {
      if (isFastMode.current) {
        isFastMode.current();
        isFastMode.current = null;
      }
      onExpandPasteHintChange(false);
    };
    $[42] = onExpandPasteHintChange;
    $[43] = resetPasteHint;
  } else resetPasteHint = $[43];
  let resetPasteHintStable = resetPasteHint;
  let cleanupTimerEffect;
  let cleanupTimerDeps;
  if ($[44] === MEMO_CACHE_SENTINEL) {
    cleanupTimerEffect = () => () => {
      isFastMode.current?.();
    };
    cleanupTimerDeps = [];
    $[44] = cleanupTimerEffect;
    $[45] = cleanupTimerDeps;
  } else {
    cleanupTimerEffect = $[44];
    cleanupTimerDeps = $[45];
  }
  useEffect(cleanupTimerEffect, cleanupTimerDeps);
  let displayedValueRaw;
  if ($[46] !== historyMatch || $[47] !== value || $[48] !== isSearchingHistory) {
    displayedValueRaw = isSearchingHistory && historyMatch ? stripModePrefix(historyMatch.display) : value;
    $[46] = historyMatch;
    $[47] = value;
    $[48] = isSearchingHistory;
    $[49] = displayedValueRaw;
  } else displayedValueRaw = $[49];
  let displayedValue = displayedValueRaw;
  let coordinatorTaskCount = useQueuedMessageText();
  let noViewedAgent = viewSelectionMode === undefined;
  let ultrathinkPositionsRaw;
  if ($[50] !== displayedValue) {
    ultrathinkPositionsRaw = ULTRATHINK_KEYWORD(displayedValue);
    $[50] = displayedValue;
    $[51] = ultrathinkPositionsRaw;
  } else ultrathinkPositionsRaw = $[51];
  let ultrathinkPositions = ultrathinkPositionsRaw;
  let activeUltrathinkRanges;
  if (
    $[52] !== coordinatorTaskCount ||
    $[53] !== mainLoopModel ||
    $[54] !== mode ||
    $[55] !== noViewedAgent ||
    $[56] !== ultrathinkPositions
  ) {
    activeUltrathinkRanges =
      mode === "prompt" &&
      noViewedAgent &&
      ultrathinkPositions.length > 0 &&
      ultrathinkRaisesEffort(mainLoopModel, coordinatorTaskCount)
        ? ultrathinkPositions
        : [];
    $[52] = coordinatorTaskCount;
    $[53] = mainLoopModel;
    $[54] = mode;
    $[55] = noViewedAgent;
    $[56] = ultrathinkPositions;
    $[57] = activeUltrathinkRanges;
  } else activeUltrathinkRanges = $[57];
  let ultrathinkRanges = activeUltrathinkRanges;
  let guideChipHighlights;
  if ($[58] !== displayedValue) {
    guideChipHighlights = setupGuideChipHighlights(displayedValue);
    $[58] = displayedValue;
    $[59] = guideChipHighlights;
  } else guideChipHighlights = $[59];
  let guideChipSpans = guideChipHighlights;
  let ultraplanSessionUrl = useAppState(selectUltraplanSessionUrl);
  let ultraplanLaunching = useAppState(selectUltraplanLaunching);
  let ultraplanRangesRaw;
  if (
    $[60] !== displayedValue ||
    $[61] !== pastedContents ||
    $[62] !== ultraplanLaunching ||
    $[63] !== ultraplanSessionUrl
  ) {
    ultraplanRangesRaw =
      isUltraplanEnabled() && !ultraplanSessionUrl && !ultraplanLaunching
        ? getLaunchMessagesOutsidePastes(displayedValue, pastedContents)
        : [];
    $[60] = displayedValue;
    $[61] = pastedContents;
    $[62] = ultraplanLaunching;
    $[63] = ultraplanSessionUrl;
    $[64] = ultraplanRangesRaw;
  } else ultraplanRangesRaw = $[64];
  let ultraplanRanges = ultraplanRangesRaw;
  let ultrareviewRanges;
  if ($[65] !== displayedValue) {
    ultrareviewRanges = isUltrareviewWithBridge() ? findUltrareviewTriggerPositions(displayedValue) : [];
    $[65] = displayedValue;
    $[66] = ultrareviewRanges;
  } else ultrareviewRanges = $[66];
  let ultrareviewPositions = ultrareviewRanges;
  let ultracodePositions;
  if ($[67] !== displayedValue) {
    ultracodePositions =
      isWorkflowsAvailable() && isWorkflowKeywordTriggerEnabled() ? ULTRACODE_KEYWORD(displayedValue) : [];
    $[67] = displayedValue;
    $[68] = ultracodePositions;
  } else ultracodePositions = $[68];
  let ultracodeRanges = ultracodePositions;
  let [isWorkflowKeywordSuppressed, setWorkflowKeywordSuppressed, getWorkflowKeywordSuppressed] =
    useLatestState(false);
  let keywordWatchEffect;
  let keywordWatchDeps;
  if (
    $[69] !== draft ||
    $[70] !== getWorkflowKeywordSuppressed ||
    $[71] !== removeNotification ||
    $[72] !== setWorkflowKeywordSuppressed
  ) {
    keywordWatchEffect = () => {
      let prevValue = draft.value;
      return draft.subscribe(() => {
        let nextValue = draft.value;
        if (nextValue === prevValue) {
          return;
        }
        prevValue = nextValue;
        if (getWorkflowKeywordSuppressed() && ULTRACODE_KEYWORD(nextValue).length === 0) {
          setWorkflowKeywordSuppressed(false);
          removeNotification("workflow-keyword-ignored");
        }
      });
    };
    keywordWatchDeps = [
      draft,
      getWorkflowKeywordSuppressed,
      setWorkflowKeywordSuppressed,
      removeNotification,
    ];
    $[69] = draft;
    $[70] = getWorkflowKeywordSuppressed;
    $[71] = removeNotification;
    $[72] = setWorkflowKeywordSuppressed;
    $[73] = keywordWatchEffect;
    $[74] = keywordWatchDeps;
  } else {
    keywordWatchEffect = $[73];
    keywordWatchDeps = $[74];
  }
  useEffect(keywordWatchEffect, keywordWatchDeps);
  let workflowKeywordToggleShortcut = useShortcutDisplay_2("chat:workflowKeywordToggle", "Chat", "alt+w");
  let btwPositions;
  if ($[75] !== displayedValue) {
    btwPositions = findBtwTriggerPositions(displayedValue);
    $[75] = displayedValue;
    $[76] = btwPositions;
  } else btwPositions = $[76];
  let btwRanges = btwPositions;
  let slashMentionPositions;
  if ($[77] !== commands || $[78] !== displayedValue) {
    slashMentionPositions = findSlashMentionRanges(displayedValue).filter((pos) => {
      let commandName = displayedValue.slice(pos.start + 1, pos.end);
      return hasCommand(commandName, commands);
    });
    $[77] = commands;
    $[78] = displayedValue;
    $[79] = slashMentionPositions;
  } else slashMentionPositions = $[79];
  let commandMentionRanges = slashMentionPositions;
  let slackChannelsChangeHandler;
  if ($[80] !== session) {
    slackChannelsChangeHandler = (channels) => onKnownSlackChannelsChanged(session, channels);
    $[80] = session;
    $[81] = slackChannelsChangeHandler;
  } else slackChannelsChangeHandler = $[81];
  let onSlackChannelsChanged = slackChannelsChangeHandler;
  let getSlackVersion;
  if ($[82] !== session) {
    getSlackVersion = () => getKnownSlackChannelsVersion(session);
    $[82] = session;
    $[83] = getSlackVersion;
  } else getSlackVersion = $[83];
  useSyncExternalStore(onSlackChannelsChanged, getSlackVersion);
  let slackMentionRangesRaw;
  if ($[84] !== displayedValue || $[85] !== session || $[86] !== store) {
    slackMentionRangesRaw = hasSlackClient(store.getState().mcp.clients)
      ? findSlackChannelMentions(session, displayedValue)
      : [];
    $[84] = displayedValue;
    $[85] = session;
    $[86] = store;
    $[87] = slackMentionRangesRaw;
  } else slackMentionRangesRaw = $[87];
  let slackMentionRanges = slackMentionRangesRaw;
  let agentMentionRanges;
  if ($[88] !== displayedValue || $[89] !== teamContext) {
    Ca: {
      if (!isAgentSwarmsEnabled()) {
        let emptySwarmRanges;
        if ($[91] === MEMO_CACHE_SENTINEL) {
          emptySwarmRanges = [];
          $[91] = emptySwarmRanges;
        } else emptySwarmRanges = $[91];
        agentMentionRanges = emptySwarmRanges;
        break Ca;
      }
      if (!teamContext?.teammates) {
        let emptyTeamRanges;
        if ($[92] === MEMO_CACHE_SENTINEL) {
          emptyTeamRanges = [];
          $[92] = emptyTeamRanges;
        } else emptyTeamRanges = $[92];
        agentMentionRanges = emptyTeamRanges;
        break Ca;
      }
      let memberRanges = [];
      let members = teamContext.teammates;
      if (!members) {
        agentMentionRanges = memberRanges;
        break Ca;
      }
      let memberPattern;
      if ($[93] === MEMO_CACHE_SENTINEL) {
        memberPattern = /(^|\s)@([\w-]+)/g;
        $[93] = memberPattern;
      } else memberPattern = $[93];
      let memberRegex = memberPattern;
      let memberValues = Object.values(members);
      let match;
      while ((match = memberRegex.exec(displayedValue)) !== null) {
        let leadingSpace = match[1] ?? "";
        let nameStart = match.index + leadingSpace.length;
        let fullMatch = match[0].trimStart();
        let memberName = match[2];
        let member = memberValues.find((memberValue) => memberValue.name === memberName);
        if (isAgentColorName(member?.color)) {
          let themeColor = AGENT_COLOR_TO_THEME_COLOR[member.color];
          if (themeColor)
            memberRanges.push({
              start: nameStart,
              end: nameStart + fullMatch.length,
              themeColor,
            });
        }
      }
      agentMentionRanges = memberRanges;
    }
    $[88] = displayedValue;
    $[89] = teamContext;
    $[90] = agentMentionRanges;
  } else agentMentionRanges = $[90];
  let memberMentionRanges = agentMentionRanges;
  let parsedRefs;
  if ($[94] !== displayedValue) {
    parsedRefs = parsePastedRefs(displayedValue);
    $[94] = displayedValue;
    $[95] = parsedRefs;
  } else parsedRefs = $[95];
  let placeholders = parsedRefs;
  const active = mode === "prompt" && !isSearchingHistory && !interimRange;
  let spellcheckArgs;
  if (
    $[96] !== cursorOffset ||
    $[97] !== displayedValue ||
    $[98] !== placeholders ||
    $[99] !== session.host ||
    $[100] !== active
  ) {
    spellcheckArgs = {
      host: session.host,
      text: displayedValue,
      cursorOffset,
      active,
      placeholders,
    };
    $[96] = cursorOffset;
    $[97] = displayedValue;
    $[98] = placeholders;
    $[99] = session.host;
    $[100] = active;
    $[101] = spellcheckArgs;
  } else spellcheckArgs = $[101];
  let spellcheckHighlights = useSpellcheckHighlights(spellcheckArgs);
  let imageRefCursorEffect;
  let imageRefCursorDeps;
  if ($[102] !== draft) {
    imageRefCursorEffect = () => {
      let prevValue;
      let prevCursorOffset;
      let imageRefs = [];
      return draft.subscribe(() => {
        let { value: nextValue, cursorOffset } = draft;
        if (nextValue === prevValue && cursorOffset === prevCursorOffset) {
          return;
        }
        if (nextValue !== prevValue)
          imageRefs = nextValue.includes("[") ? parsePastedRefs(nextValue).filter(isImagePasteRef) : [];
        prevValue = nextValue;
        prevCursorOffset = cursorOffset;
        let inside = imageRefs.find(
          (refRange) =>
            cursorOffset > refRange.index && cursorOffset < refRange.index + refRange.match.length,
        );
        if (inside) {
          let refEnd = inside.index + inside.match.length;
          let refMid = (inside.index + refEnd) / 2;
          draft.setCursorOffset(cursorOffset < refMid ? inside.index : refEnd);
        }
      });
    };
    imageRefCursorDeps = [draft];
    $[102] = draft;
    $[103] = imageRefCursorEffect;
    $[104] = imageRefCursorDeps;
  } else {
    imageRefCursorEffect = $[103];
    imageRefCursorDeps = $[104];
  }
  useEffect(imageRefCursorEffect, imageRefCursorDeps);
  let spansRaw;
  if (
    $[105] !== btwRanges ||
    $[106] !== cursorOffset ||
    $[107] !== historyFailedMatch ||
    $[108] !== historyMatch ||
    $[109] !== historyQuery ||
    $[110] !== isSearchingHistory ||
    $[111] !== memberMentionRanges ||
    $[112] !== guideChipSpans ||
    $[113] !== slackMentionRanges ||
    $[114] !== commandMentionRanges ||
    $[115] !== spellcheckHighlights ||
    $[116] !== ultrathinkRanges ||
    $[117] !== ultraplanRanges ||
    $[118] !== interimRange ||
    $[119] !== isWorkflowKeywordSuppressed ||
    $[120] !== ultracodeRanges
  ) {
    let spansList = [];
    if (isSearchingHistory && historyMatch && !historyFailedMatch)
      spansList.push({
        start: cursorOffset,
        end: cursorOffset + historyQuery.length,
        color: "warning",
        priority: 20,
      });
    for (const ref of btwRanges)
      spansList.push({
        start: ref.start,
        end: ref.end,
        color: "warning",
        priority: 15,
      });
    for (const trigger of commandMentionRanges)
      spansList.push({
        start: trigger.start,
        end: trigger.end,
        color: "suggestion",
        priority: 5,
      });
    for (const trigger of slackMentionRanges)
      spansList.push({
        start: trigger.start,
        end: trigger.end,
        color: "suggestion",
        priority: 5,
      });
    for (const trigger of memberMentionRanges)
      spansList.push({
        start: trigger.start,
        end: trigger.end,
        color: trigger.themeColor,
        priority: 5,
      });
    if (interimRange)
      spansList.push({
        start: interimRange.start,
        end: interimRange.end,
        color: undefined,
        dimColor: true,
        priority: 1,
      });
    for (const trigger of ultrathinkRanges) {
      for (let start = trigger.start; start < trigger.end; start++)
        spansList.push({
          start,
          end: start + 1,
          color: getRainbowColor(start - trigger.start),
          shimmerColor: getRainbowColor(start - trigger.start, true),
          priority: 10,
        });
    }
    spansList.push(...guideChipSpans);
    if (isUltraplanEnabled()) {
      for (const trigger of ultraplanRanges) {
        for (let start = trigger.start; start < trigger.end; start++)
          spansList.push({
            start,
            end: start + 1,
            color: getRainbowColor(start - trigger.start),
            shimmerColor: getRainbowColor(start - trigger.start, true),
            priority: 10,
          });
      }
    }
    if (isWorkflowsAvailable() && !isWorkflowKeywordSuppressed) {
      for (const trigger of ultracodeRanges) {
        for (let start = trigger.start; start < trigger.end; start++)
          spansList.push({
            start,
            end: start + 1,
            color: "autoAccept",
            priority: 10,
          });
      }
    }
    spansRaw = mergeNonOverlappingRanges(spansList, spellcheckHighlights);
    $[105] = btwRanges;
    $[106] = cursorOffset;
    $[107] = historyFailedMatch;
    $[108] = historyMatch;
    $[109] = historyQuery;
    $[110] = isSearchingHistory;
    $[111] = memberMentionRanges;
    $[112] = guideChipSpans;
    $[113] = slackMentionRanges;
    $[114] = commandMentionRanges;
    $[115] = spellcheckHighlights;
    $[116] = ultrathinkRanges;
    $[117] = ultraplanRanges;
    $[118] = interimRange;
    $[119] = isWorkflowKeywordSuppressed;
    $[120] = ultracodeRanges;
    $[121] = spansRaw;
  } else spansRaw = $[121];
  let spans = spansRaw;
  let showCursor = !footerItemSelected && !isSearchingHistory;
  let hasDecorations = decorations.length > 0 && !isSearchingHistory && displayedValue === value;
  let virtualTextsRaw;
  if ($[122] !== decorations || $[123] !== value || $[124] !== hasDecorations || $[125] !== plain) {
    let decorationSpansRaw = hasDecorations && value !== "" && !plain ? emptySpans(decorations) : EMPTY_SPANS;
    virtualTextsRaw =
      decorationSpansRaw.length > 0 && !isNfcStable(value, buildVirtualTextLayout(value, decorationSpansRaw))
        ? EMPTY_SPANS
        : decorationSpansRaw;
    $[122] = decorations;
    $[123] = value;
    $[124] = hasDecorations;
    $[125] = plain;
    $[126] = virtualTextsRaw;
  } else virtualTextsRaw = $[126];
  let virtualTexts = virtualTextsRaw;
  let cursorSide = isVimEditorMode && vimMode !== "INSERT" ? "after" : "before";
  let virtualTextAtCursor;
  if ($[127] !== cursorSide || $[128] !== cursorOffset || $[129] !== virtualTexts) {
    virtualTextAtCursor = cursorSide === "before" && virtualTexts.some((span) => span.start === cursorOffset);
    $[127] = cursorSide;
    $[128] = cursorOffset;
    $[129] = virtualTexts;
    $[130] = virtualTextAtCursor;
  } else virtualTextAtCursor = $[130];
  let hasVirtualTextAtCursor = virtualTextAtCursor;
  let highlightsRaw;
  if (
    $[131] !== spans ||
    $[132] !== cursorOffset ||
    $[133] !== decorations ||
    $[134] !== value ||
    $[135] !== hasVirtualTextAtCursor ||
    $[136] !== hasDecorations ||
    $[137] !== showCursor
  ) {
    highlightsRaw = !hasDecorations
      ? spans
      : overlayDecorations(
          spans,
          decorations,
          showCursor && !hasVirtualTextAtCursor
            ? {
                start: cursorOffset,
                end: cursorOffset + firstGrapheme(value.slice(cursorOffset)).length,
              }
            : undefined,
        );
    $[131] = spans;
    $[132] = cursorOffset;
    $[133] = decorations;
    $[134] = value;
    $[135] = hasVirtualTextAtCursor;
    $[136] = hasDecorations;
    $[137] = showCursor;
    $[138] = highlightsRaw;
  } else highlightsRaw = $[138];
  let highlights = highlightsRaw;
  let syncUltrathinkNotice;
  let ultrathinkNoticeDeps;
  if ($[139] !== addNotification || $[140] !== removeNotification || $[141] !== ultrathinkRanges.length) {
    syncUltrathinkNotice = () => {
      if (ultrathinkRanges.length)
        addNotification({
          key: "ultrathink-active",
          kind: "feedback",
          text: "Deeper reasoning requested for this turn",
          priority: "immediate",
          timeoutMs: 5000,
        });
      else removeNotification("ultrathink-active");
    };
    ultrathinkNoticeDeps = [addNotification, removeNotification, ultrathinkRanges.length];
    $[139] = addNotification;
    $[140] = removeNotification;
    $[141] = ultrathinkRanges.length;
    $[142] = syncUltrathinkNotice;
    $[143] = ultrathinkNoticeDeps;
  } else {
    syncUltrathinkNotice = $[142];
    ultrathinkNoticeDeps = $[143];
  }
  useEffect(syncUltrathinkNotice, ultrathinkNoticeDeps);
  let syncUltraplanNotice;
  let ultraplanNoticeDeps;
  if ($[144] !== addNotification || $[145] !== removeNotification || $[146] !== ultraplanRanges.length) {
    syncUltraplanNotice = () => {
      if (isUltraplanEnabled() && ultraplanRanges.length)
        addNotification({
          key: "ultraplan-active",
          kind: "feedback",
          text: "This prompt will launch an ultraplan cloud session",
          priority: "immediate",
          timeoutMs: 5000,
        });
      else removeNotification("ultraplan-active");
    };
    ultraplanNoticeDeps = [addNotification, removeNotification, ultraplanRanges.length];
    $[144] = addNotification;
    $[145] = removeNotification;
    $[146] = ultraplanRanges.length;
    $[147] = syncUltraplanNotice;
    $[148] = ultraplanNoticeDeps;
  } else {
    syncUltraplanNotice = $[147];
    ultraplanNoticeDeps = $[148];
  }
  useEffect(syncUltraplanNotice, ultraplanNoticeDeps);
  let showUltrareviewNotice;
  let ultrareviewNoticeDeps;
  if ($[149] !== addNotification || $[150] !== ultrareviewPositions.length) {
    showUltrareviewNotice = () => {
      if (isUltrareviewWithBridge() && ultrareviewPositions.length)
        addNotification({
          key: "ultrareview-active",
          kind: "contextual",
          text: "Run /code-review ultra after Claude finishes to review these changes in the cloud",
          priority: "immediate",
          timeoutMs: 5000,
        });
    };
    ultrareviewNoticeDeps = [addNotification, ultrareviewPositions.length];
    $[149] = addNotification;
    $[150] = ultrareviewPositions.length;
    $[151] = showUltrareviewNotice;
    $[152] = ultrareviewNoticeDeps;
  } else {
    showUltrareviewNotice = $[151];
    ultrareviewNoticeDeps = $[152];
  }
  useEffect(showUltrareviewNotice, ultrareviewNoticeDeps);
  let syncKeywordNotice;
  let keywordNoticeDeps;
  if (
    $[153] !== addNotification ||
    $[154] !== removeNotification ||
    $[155] !== isWorkflowKeywordSuppressed ||
    $[156] !== workflowKeywordToggleShortcut ||
    $[157] !== ultracodeRanges.length
  ) {
    syncKeywordNotice = () => {
      if (isWorkflowsAvailable() && ultracodeRanges.length && !isWorkflowKeywordSuppressed)
        addNotification({
          key: "workflow-keyword-active",
          text: `Dynamic workflow requested for this turn${workflowKeywordToggleShortcut ? ` \xB7 ${workflowKeywordToggleShortcut} to ignore` : ""}`,
          priority: "immediate",
          timeoutMs: 30000,
        });
      else removeNotification("workflow-keyword-active");
    };
    keywordNoticeDeps = [
      addNotification,
      removeNotification,
      ultracodeRanges.length,
      isWorkflowKeywordSuppressed,
      workflowKeywordToggleShortcut,
    ];
    $[153] = addNotification;
    $[154] = removeNotification;
    $[155] = isWorkflowKeywordSuppressed;
    $[156] = workflowKeywordToggleShortcut;
    $[157] = ultracodeRanges.length;
    $[158] = syncKeywordNotice;
    $[159] = keywordNoticeDeps;
  } else {
    syncKeywordNotice = $[158];
    keywordNoticeDeps = $[159];
  }
  useEffect(syncKeywordNotice, keywordNoticeDeps);
  let toggleKeywordSuppression;
  if (
    $[160] !== addNotification ||
    $[161] !== draft.value ||
    $[162] !== getWorkflowKeywordSuppressed ||
    $[163] !== removeNotification ||
    $[164] !== setWorkflowKeywordSuppressed ||
    $[165] !== workflowKeywordToggleShortcut
  ) {
    toggleKeywordSuppression = () => {
      if (ULTRACODE_KEYWORD(draft.value).length === 0) {
        return;
      }
      let nextSuppressed = !getWorkflowKeywordSuppressed();
      setWorkflowKeywordSuppressed(nextSuppressed);
      if (nextSuppressed) {
        logEvent("tengu_workflow_keyword_dismissed", {});
        addNotification({
          key: "workflow-keyword-ignored",
          text: `Ultracode keyword ignored for this prompt${workflowKeywordToggleShortcut ? ` \xB7 ${workflowKeywordToggleShortcut} to undo` : ""}`,
          row1Hint: `ultracode off${workflowKeywordToggleShortcut ? ` \xB7 ${workflowKeywordToggleShortcut} to undo` : ""}`,
          priority: "immediate",
          timeoutMs: 5000,
        });
      } else {
        logEvent("tengu_workflow_keyword_restored", {});
        removeNotification("workflow-keyword-ignored");
      }
    };
    $[160] = addNotification;
    $[161] = draft.value;
    $[162] = getWorkflowKeywordSuppressed;
    $[163] = removeNotification;
    $[164] = setWorkflowKeywordSuppressed;
    $[165] = workflowKeywordToggleShortcut;
    $[166] = toggleKeywordSuppression;
  } else toggleKeywordSuppression = $[166];
  let toggleKeywordSuppressed = toggleKeywordSuppression;
  let prevInputLengthRef = useRef(value.length);
  let peakInputLengthRef = useRef(value.length);
  let dismissStashHint;
  if ($[167] !== removeNotification) {
    dismissStashHint = () => {
      removeNotification("stash-hint");
    };
    $[167] = removeNotification;
    $[168] = dismissStashHint;
  } else dismissStashHint = $[168];
  let dismissStashHintStable = dismissStashHint;
  let stashHintEffect;
  let stashHintDeps;
  if ($[169] !== addNotification || $[170] !== value.length) {
    stashHintEffect = () => {
      let prevLength = prevInputLengthRef.current;
      let peakLength = peakInputLengthRef.current;
      let currentLength = value.length;
      prevInputLengthRef.current = currentLength;
      if (currentLength > peakLength) {
        peakInputLengthRef.current = currentLength;
        return;
      }
      if (currentLength === 0) {
        peakInputLengthRef.current = 0;
        return;
      }
      let clearedSubstantialInput = peakLength >= 20 && currentLength <= 5;
      let wasRapidClear = prevLength >= 20 && currentLength <= 5;
      if (clearedSubstantialInput && !wasRapidClear) {
        if (!getGlobalConfig().hasUsedStash)
          addNotification({
            key: "stash-hint",
            kind: "hint",
            jsx: jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "Tip:",
                " ",
                jsxProd_default(ConfigurableShortcutHint, {
                  action: "chat:stash",
                  context: "Chat",
                  fallback: "ctrl+s",
                  description: "stash",
                }),
              ],
            }),
            priority: "immediate",
            timeoutMs: NOTIFICATION_TIMEOUT_MS,
          });
        peakInputLengthRef.current = currentLength;
      }
    };
    stashHintDeps = [value.length, addNotification];
    $[169] = addNotification;
    $[170] = value.length;
    $[171] = stashHintEffect;
    $[172] = stashHintDeps;
  } else {
    stashHintEffect = $[171];
    stashHintDeps = $[172];
  }
  useEffect(stashHintEffect, stashHintDeps);
  let inputBufferOptions;
  if ($[173] === MEMO_CACHE_SENTINEL) {
    inputBufferOptions = {
      maxBufferSize: 50,
      debounceMs: 1000,
    };
    $[173] = inputBufferOptions;
  } else inputBufferOptions = $[173];
  let { pushToBuffer, undo, canUndo, clearBuffer } = useInputBuffer(inputBufferOptions);
  let defaultPlaceholder = useRef(mode);
  let pushToBufferWithMode;
  if (
    $[174] !== clearBuffer ||
    $[175] !== draft.mode ||
    $[176] !== draft.value ||
    $[177] !== pushToBuffer ||
    $[178] !== isVimEditorMode ||
    $[179] !== vimMode
  ) {
    pushToBufferWithMode = (text, editCursor, editPastedContents, editMeta) => {
      if (draft.mode !== defaultPlaceholder.current) {
        clearBuffer();
        if (text !== draft.value) {
          return;
        }
        defaultPlaceholder.current = draft.mode;
      }
      let immediate =
        !editMeta?.continuesGesture &&
        isVimEditorMode &&
        (vimMode !== "INSERT" || !promptSuggestionState.current);
      pushToBuffer(text, editCursor, editPastedContents, {
        immediate,
      });
      promptSuggestionState.current = isVimEditorMode;
    };
    $[174] = clearBuffer;
    $[175] = draft.mode;
    $[176] = draft.value;
    $[177] = pushToBuffer;
    $[178] = isVimEditorMode;
    $[179] = vimMode;
    $[180] = pushToBufferWithMode;
  } else pushToBufferWithMode = $[180];
  let pushToBufferStable = pushToBufferWithMode;
  let clampCursorForMode;
  if ($[181] !== sessionUiStore || $[182] !== isVimEditorMode) {
    clampCursorForMode = (value) =>
      isVimEditorMode && sessionUiStore.getState().vimMode === "NORMAL"
        ? setCwdState(value, value.length)
        : value.length;
    $[181] = sessionUiStore;
    $[182] = isVimEditorMode;
    $[183] = clampCursorForMode;
  } else clampCursorForMode = $[183];
  let clampCursor = clampCursorForMode;
  useMaybeTruncateInput(draft, clampCursor);
  let handleChange;
  if (
    $[184] !== cursorOffset ||
    $[185] !== dismissStashHintStable ||
    $[186] !== draft ||
    $[187] !== value ||
    $[188] !== setMode ||
    $[189] !== pastedContents ||
    $[190] !== pushToBufferStable ||
    $[191] !== session ||
    $[192] !== setAppState ||
    $[193] !== setCursorOffset ||
    $[194] !== setHelpOpen ||
    $[195] !== setValue
  ) {
    handleChange = (value_2, changeMeta) => {
      let interpretLeadingModeCharacter = changeMeta?.interpretLeadingModeCharacter ?? true;
      setHelpOpen(false);
      dismissStashHintStable();
      session.promptSuggestion.reset();
      setAppState(clearFooterSelectionState);
      let previousValue = changeMeta?.previous?.value ?? value;
      let isSingleCharInsertion = value_2.length === previousValue.length + 1;
      let wasAtStart = (changeMeta?.previous?.cursorOffset ?? cursorOffset) === 0;
      let mode = getModeFromInput_2(value_2);
      if (interpretLeadingModeCharacter && wasAtStart && mode !== "prompt") {
        if (isSingleCharInsertion) {
          if (mode !== draft.mode) {
            setMode(mode);
            return;
          }
        } else if (previousValue.length === 0 && mode !== draft.mode) {
          setMode(mode);
          let valueWithoutMode = stripModePrefix(value_2).replaceAll("\t", "    ");
          pushToBufferStable(value, cursorOffset, pastedContents);
          setValue(valueWithoutMode);
          setCursorOffset(valueWithoutMode.length);
          return;
        }
      }
      let processedValue = value_2.replaceAll("\t", "    ");
      if (value !== processedValue) pushToBufferStable(value, cursorOffset, pastedContents);
      if (changeMeta?.keystroke === true && processedValue === value_2) draft.setValueTyped(processedValue);
      else setValue(processedValue);
    };
    $[184] = cursorOffset;
    $[185] = dismissStashHintStable;
    $[186] = draft;
    $[187] = value;
    $[188] = setMode;
    $[189] = pastedContents;
    $[190] = pushToBufferStable;
    $[191] = session;
    $[192] = setAppState;
    $[193] = setCursorOffset;
    $[194] = setHelpOpen;
    $[195] = setValue;
    $[196] = handleChange;
  } else handleChange = $[196];
  let handleChangeStable = handleChange;
  let noopInputUpdateRef = useRef(noopInputUpdate);
  let onChangeKeystroke;
  if ($[197] !== handleChangeStable) {
    onChangeKeystroke = (nextValue, meta) =>
      handleChangeStable(nextValue, {
        ...meta,
        keystroke: true,
      });
    $[197] = handleChangeStable;
    $[198] = onChangeKeystroke;
  } else onChangeKeystroke = $[198];
  let onChange = onChangeKeystroke;
  let setOverrideRaw;
  if ($[199] !== draft) {
    setOverrideRaw = (prev) => draft.attribute(COMPOSER_EDIT_ORIGIN, prev);
    $[199] = draft;
    $[200] = setOverrideRaw;
  } else setOverrideRaw = $[200];
  let commitEdit = setOverrideRaw;
  let attachNoopUpdateEffect;
  if ($[201] !== draft.value || $[202] !== handleChangeStable || $[203] !== setCursorOffset) {
    attachNoopUpdateEffect = () => {
      noopInputUpdateRef.current = (nextState) => {
        if (nextState.text !== draft.value) handleChangeStable(nextState.text);
        setCursorOffset(nextState.cursor);
      };
    };
    $[201] = draft.value;
    $[202] = handleChangeStable;
    $[203] = setCursorOffset;
    $[204] = attachNoopUpdateEffect;
  } else attachNoopUpdateEffect = $[204];
  useLayoutEffect(attachNoopUpdateEffect);
  let read;
  if ($[205] !== draft.cursorOffset || $[206] !== draft.value) {
    read = () => ({
      text: draft.value,
      cursor: draft.cursorOffset,
    });
    $[205] = draft.cursorOffset;
    $[206] = draft.value;
    $[207] = read;
  } else read = $[207];
  let commit;
  if ($[208] !== commitEdit) {
    commit = (update) => commitEdit(() => noopInputUpdateRef.current(update));
    $[208] = commitEdit;
    $[209] = commit;
  } else commit = $[209];
  let carry;
  let carryLayers;
  let paint;
  if ($[210] !== draft) {
    carry = (paintLayer) => draft.carryPaint(paintLayer.before, paintLayer.after);
    carryLayers = (updater) => draft.carryLayers(updater.before, updater.after);
    paint = (decorations, layers) => draft.paint(normalizeInputDecorations(decorations, layers));
    $[210] = draft;
    $[211] = carry;
    $[212] = carryLayers;
    $[213] = paint;
  } else {
    carry = $[211];
    carryLayers = $[212];
    paint = $[213];
  }
  let relayHandlers;
  if (
    $[214] !== read ||
    $[215] !== commit ||
    $[216] !== carry ||
    $[217] !== carryLayers ||
    $[218] !== paint
  ) {
    relayHandlers = {
      read,
      commit,
      carry,
      carryLayers,
      paint,
    };
    $[214] = read;
    $[215] = commit;
    $[216] = carry;
    $[217] = carryLayers;
    $[218] = paint;
    $[219] = relayHandlers;
  } else relayHandlers = $[219];
  let editRelay = relayPromptEdits(relayHandlers);
  let recordableCommit;
  if (
    $[220] !== commitEdit ||
    $[221] !== draft.cursorOffset ||
    $[222] !== draft.value ||
    $[223] !== editRelay
  ) {
    recordableCommit = (prev) => {
      let before = {
        text: draft.value,
        cursor: draft.cursorOffset,
      };
      commitEdit(prev);
      if (editRelay.isRecording())
        editRelay.record({
          before,
          after: {
            text: draft.value,
            cursor: draft.cursorOffset,
          },
        });
    };
    $[220] = commitEdit;
    $[221] = draft.cursorOffset;
    $[222] = draft.value;
    $[223] = editRelay;
    $[224] = recordableCommit;
  } else recordableCommit = $[224];
  let commitWithRecording = recordableCommit;
  let handleExternalEdit;
  if (
    $[225] !== draft ||
    $[226] !== handleChangeStable ||
    $[227] !== setMode ||
    $[228] !== sessionUiStore ||
    $[229] !== setCursorOffset ||
    $[230] !== setPastedContents ||
    $[231] !== isVimEditorMode
  ) {
    handleExternalEdit = (text, mode, pastedContents, cursorOffset) => {
      draft.attribute(historyPromptOrigin, () =>
        handleChangeStable(text, {
          interpretLeadingModeCharacter: false,
        }),
      );
      setMode(mode);
      setPastedContents(pastedContents);
      let nextValue = draft.value;
      if (
        !isVimEditorMode ||
        sessionUiStore.getState().vimMode !== "NORMAL" ||
        nextValue !== nextValue.normalize("NFC")
      ) {
        setCursorOffset(cursorOffset);
        return;
      }
      let onSubmit = clampCursorOffset(nextValue, cursorOffset);
      let hasImages = parsePastedRefs(nextValue).some(
        (refRange) => onSubmit >= refRange.index && onSubmit < refRange.index + refRange.match.length,
      );
      setCursorOffset(hasImages ? cursorOffset : onSubmit);
    };
    $[225] = draft;
    $[226] = handleChangeStable;
    $[227] = setMode;
    $[228] = sessionUiStore;
    $[229] = setCursorOffset;
    $[230] = setPastedContents;
    $[231] = isVimEditorMode;
    $[232] = handleExternalEdit;
  } else handleExternalEdit = $[232];
  let {
    resetHistory,
    onHistoryUp,
    onHistoryDown,
    dismissSearchHint,
    historyIndex,
    historyTotal,
    historyEdited,
  } = useArrowKeyHistory(draft, handleExternalEdit, queuedRowsStable);
  let resetHistoryStable;
  if ($[233] !== resetHistory) {
    resetHistoryStable = () => {
      resetHistory();
    };
    $[233] = resetHistory;
    $[234] = resetHistoryStable;
  } else resetHistoryStable = $[234];
  let resetHistoryDeps;
  if ($[235] !== resetHistory || $[236] !== viewingAgentTaskId) {
    resetHistoryDeps = [viewingAgentTaskId, resetHistory];
    $[235] = resetHistory;
    $[236] = viewingAgentTaskId;
    $[237] = resetHistoryDeps;
  } else resetHistoryDeps = $[237];
  useEffect(resetHistoryStable, resetHistoryDeps);
  let dismissSearchHintEffect;
  let dismissSearchHintDeps;
  if ($[238] !== dismissSearchHint || $[239] !== isSearchingHistory) {
    dismissSearchHintEffect = () => {
      if (isSearchingHistory) dismissSearchHint();
    };
    dismissSearchHintDeps = [isSearchingHistory, dismissSearchHint];
    $[238] = dismissSearchHint;
    $[239] = isSearchingHistory;
    $[240] = dismissSearchHintEffect;
    $[241] = dismissSearchHintDeps;
  } else {
    dismissSearchHintEffect = $[240];
    dismissSearchHintDeps = $[241];
  }
  useEffect(dismissSearchHintEffect, dismissSearchHintDeps);
  let popQueuedInput;
  if (
    $[242] !== chrome ||
    $[243] !== draft ||
    $[244] !== setMode ||
    $[245] !== sessionUiStore ||
    $[246] !== messageQueue ||
    $[247] !== setCursorOffset ||
    $[248] !== setValue ||
    $[249] !== setPastedContents ||
    $[250] !== isVimEditorMode
  ) {
    popQueuedInput = () => {
      let queuedInput = messageQueue.popAllEditable(draft.value, draft.cursorOffset, draft.pastedContents);
      if (!queuedInput) {
        return false;
      }
      setValue(queuedInput.text);
      if (queuedInput.unpassed) draft.markCameBack();
      setMode(queuedInput.mode);
      setCursorOffset(
        isVimEditorMode && sessionUiStore.getState().vimMode === "NORMAL"
          ? setCwdState(draft.value, queuedInput.cursorOffset)
          : queuedInput.cursorOffset,
      );
      chrome.returnIdeSelection(queuedInput.ideSelection);
      if (queuedInput.images.length > 0)
        setPastedContents((pastedContents) => mergeTurnTags(pastedContents, queuedInput.images));
      logFeatureOk("input_queue_pop_to_edit");
      return true;
    };
    $[242] = chrome;
    $[243] = draft;
    $[244] = setMode;
    $[245] = sessionUiStore;
    $[246] = messageQueue;
    $[247] = setCursorOffset;
    $[248] = setValue;
    $[249] = setPastedContents;
    $[250] = isVimEditorMode;
    $[251] = popQueuedInput;
  } else popQueuedInput = $[251];
  let popQueuedInputStable = popQueuedInput;
  const suppressSuggestions = isSearchingHistory || (historyIndex > 0 && !historyEdited) || storeSelector;
  let typeaheadArgs;
  if (
    $[252] !== activeAgents ||
    $[253] !== commands ||
    $[254] !== draft ||
    $[255] !== markAccepted ||
    $[256] !== onSubmit ||
    $[257] !== scope.sessionEnvVars ||
    $[258] !== suggestionsStore ||
    $[259] !== suppressSuggestions
  ) {
    typeaheadArgs = {
      draft,
      commands,
      onSubmit,
      agents: activeAgents,
      suggestionsStore,
      suppressSuggestions,
      markAccepted,
      sessionEnvVars: scope.sessionEnvVars,
    };
    $[252] = activeAgents;
    $[253] = commands;
    $[254] = draft;
    $[255] = markAccepted;
    $[256] = onSubmit;
    $[257] = scope.sessionEnvVars;
    $[258] = suggestionsStore;
    $[259] = suppressSuggestions;
    $[260] = typeaheadArgs;
  } else typeaheadArgs = $[260];
  let {
    suggestions,
    commandArgumentHint,
    inlineGhostText,
    handleKeyDown,
    selectSuggestion,
    setHoveredSuggestion,
    cursorRowId,
  } = useTypeahead(typeaheadArgs);
  let isQueueEditable;
  if ($[261] !== draft.value || $[262] !== value || $[263] !== messageQueue) {
    isQueueEditable = function isQueueEditable() {
      return messageQueue.getCommandQueue().some(isQueuedCommandEditable) && draft.value === value;
    };
    $[261] = draft.value;
    $[262] = value;
    $[263] = messageQueue;
    $[264] = isQueueEditable;
  } else isQueueEditable = $[264];
  let isQueueEditableStable = isQueueEditable;
  let onHistoryUpHandler;
  if (
    $[265] !== clampCursor ||
    $[266] !== draft ||
    $[267] !== isQueueEditableStable ||
    $[268] !== onHistoryUp ||
    $[269] !== popQueuedInputStable ||
    $[270] !== messageQueue ||
    $[271] !== commandQueue ||
    $[272] !== setCursorOffset ||
    $[273] !== setQueueEditIndex ||
    $[274] !== store ||
    $[275] !== suggestions
  ) {
    onHistoryUpHandler = function onHistoryUpHandler() {
      if (suggestions.length > 1) {
        return;
      }
      let index = draft.value.indexOf(`
`);
      if (index !== -1 && draft.cursorOffset > index) {
        return;
      }
      if (draft.restoreCleared()) {
        setCursorOffset(clampCursor(draft.value));
        return;
      }
      if (isKbCohesionFixesOn()) {
        let queueEditIndex = store.getState().queueEditIndex;
        let refillableCount = countWhere(messageQueue.getCommandQueueSnapshot(), isQueuedCommandEditable);
        if (queueEditIndex === null && refillableCount > 0) {
          setQueueEditIndex(refillableCount - 1);
          return;
        }
        if (queueEditIndex !== null) {
          if (queueEditIndex > 0) setQueueEditIndex(queueEditIndex - 1);
          else {
            setQueueEditIndex(null);
            onHistoryUp();
          }
          return;
        }
      } else if (
        commandQueue.some(isQueuedCommandEditable) ||
        messageQueue.getCommandQueueSnapshot().some(isQueuedCommandEditable)
      ) {
        if (popQueuedInputStable() || !isQueueEditableStable()) {
          return;
        }
      }
      onHistoryUp();
    };
    $[265] = clampCursor;
    $[266] = draft;
    $[267] = isQueueEditableStable;
    $[268] = onHistoryUp;
    $[269] = popQueuedInputStable;
    $[270] = messageQueue;
    $[271] = commandQueue;
    $[272] = setCursorOffset;
    $[273] = setQueueEditIndex;
    $[274] = store;
    $[275] = suggestions;
    $[276] = onHistoryUpHandler;
  } else onHistoryUpHandler = $[276];
  let onHistoryUp_2 = onHistoryUpHandler;
  let onHistoryDownHandler;
  if (
    $[277] !== draft.cursorOffset ||
    $[278] !== draft.value ||
    $[279] !== onHistoryDown ||
    $[280] !== onHistoryDownPastEnd ||
    $[281] !== messageQueue ||
    $[282] !== setQueueEditIndex ||
    $[283] !== store ||
    $[284] !== suggestions
  ) {
    onHistoryDownHandler = function onHistoryDownHandler() {
      if (suggestions.length > 1) {
        return;
      }
      let index = draft.value.lastIndexOf(`
`);
      if (index !== -1 && draft.cursorOffset <= index) {
        return;
      }
      if (isKbCohesionFixesOn()) {
        let queueEditIndex = store.getState().queueEditIndex;
        if (queueEditIndex !== null) {
          let refillableCount = countWhere(messageQueue.getCommandQueueSnapshot(), isQueuedCommandEditable);
          if (queueEditIndex < refillableCount - 1) setQueueEditIndex(queueEditIndex + 1);
          else setQueueEditIndex(null);
          return;
        }
      }
      if (onHistoryDown()) onHistoryDownPastEnd();
    };
    $[277] = draft.cursorOffset;
    $[278] = draft.value;
    $[279] = onHistoryDown;
    $[280] = onHistoryDownPastEnd;
    $[281] = messageQueue;
    $[282] = setQueueEditIndex;
    $[283] = store;
    $[284] = suggestions;
    $[285] = onHistoryDownHandler;
  } else onHistoryDownHandler = $[285];
  let onHistoryDown_2 = onHistoryDownHandler;
  let [, bumpOffset] = useReducer(incrementOffset, 0);
  let onSubmitHandler;
  if (
    $[286] !== chordGestureSpent ||
    $[287] !== clock ||
    $[288] !== draft.typedOnly ||
    $[289] !== draft.value ||
    $[290] !== onSubmit
  ) {
    onSubmitHandler = (input) => {
      if (chordGestureSpent(input)) {
        return;
      }
      onSubmit(
        input === "" ? "" : draft.value,
        false,
        undefined,
        false,
        draft.typedOnly ? createFrozenEmpty() : undefined,
      );
      clock.setTimeout(bumpOffset, 0);
    };
    $[286] = chordGestureSpent;
    $[287] = clock;
    $[288] = draft.typedOnly;
    $[289] = draft.value;
    $[290] = onSubmit;
    $[291] = onSubmitHandler;
  } else onSubmitHandler = $[291];
  let onSubmit_2 = onSubmitHandler;
  let onKeyDownBefore = function onKeyDownBeforeImpl(prev) {
    if (prev.name === "return" && !prev.ctrl && !prev.meta && !prev.shift && takeEnter()) {
      prev.preventDefault();
      return;
    }
    if (isDeleteOrKillKey(prev) && store.getState().queueEditIndex !== null) setQueueEditIndex(null);
    historySearchKeyDown(prev);
    if (prev.defaultPrevented || prev.didStopImmediatePropagation()) {
      return;
    }
    handleKeyDown(prev);
    if (prev.defaultPrevented || prev.didStopImmediatePropagation()) {
      return;
    }
    if (
      isWorkflowsAvailable() &&
      prev.name === "backspace" &&
      !prev.meta &&
      !prev.ctrl &&
      !prev.superKey &&
      !isSearchingHistory &&
      (!isVimEditorMode || vimMode === "INSERT") &&
      !getWorkflowKeywordSuppressed() &&
      ultracodeRanges.some((prev) => prev.end === cursorOffset)
    ) {
      prev.preventDefault();
      toggleKeywordSuppressed();
      return;
    }
    if (getPlatform() === "macos" && isMacOptionSpecialChar(prev.key)) {
      let specialChar = MACOS_OPTION_SPECIAL_CHARS[prev.key];
      let nativeCSIuTerminalDisplayName = getNativeCSIuTerminalDisplayName();
      let segments = nativeCSIuTerminalDisplayName
        ? [
            {
              text: `To enable ${specialChar}, set `,
              dim: true,
            },
            {
              text: "Option as Meta",
              dim: true,
              bold: true,
            },
            {
              text: ` in ${nativeCSIuTerminalDisplayName} preferences (\u2318,)`,
              dim: true,
            },
          ]
        : [
            {
              text: `To enable ${specialChar}, run /terminal-setup`,
              dim: true,
            },
          ];
      addNotification({
        key: "option-meta-hint",
        kind: "contextual",
        segments,
        row1Hint: nativeCSIuTerminalDisplayName
          ? `set Option as Meta to use ${specialChar}`
          : `/terminal-setup to use ${specialChar}`,
        priority: "immediate",
        timeoutMs: 5000,
      });
    }
    if (prev.ctrl && prev.key === "c" && (historyIndex === 0 || historyEdited))
      draft.holdCleared({
        intoHistory: queuedRowsStable === undefined,
      });
    useComposerEscape(prev, {
      draft,
      vimEnabled: isVimEditorMode,
      vimMode,
      helpOpen,
      setHelpOpen,
    });
    if (prev.name === "escape") {
      if (
        dismissPromptOverlay({
          store,
          clearQueueSelection: () => setQueueEditIndex(null),
          helpOpen,
          setHelpOpen,
        })
      ) {
        return;
      }
      if (isVimEditorMode && vimMode !== "NORMAL") {
        return;
      }
      if (!isKbCohesionFixesOn()) {
        if (
          (commandQueue.some(isQueuedCommandEditable) ||
            messageQueue.getCommandQueueSnapshot().some(isQueuedCommandEditable)) &&
          (popQueuedInputStable() || !isQueueEditableStable())
        ) {
          return;
        }
      }
      if (transcript.getSnapshot().length > 0 && !value && !turn.getSnapshot().isLoading) isInputWrapped();
    }
    if (prev.name === "return" && helpOpen) setHelpOpen(false);
  };
  let pasteCleanupEffect;
  let draftDeps;
  if ($[292] !== draft) {
    pasteCleanupEffect = () => {
      let prevValue = draft.value;
      let prevPastedContents;
      let hasSynthetic = false;
      let weakMap = new WeakMap();
      let cachedNfd = (pastedEntry, getVariants) => {
        let cachedVariants = weakMap.get(pastedEntry);
        if (cachedVariants === undefined) {
          cachedVariants = normalizeCaseForComparison_2(getVariants().map(normalizeNfd));
          weakMap.set(pastedEntry, cachedVariants);
        }
        return cachedVariants;
      };
      return draft.subscribe(() => {
        let { value: nextValue, pastedContents } = draft;
        if (nextValue === prevValue) {
          return;
        }
        prevValue = nextValue;
        if (pastedContents !== prevPastedContents) {
          prevPastedContents = pastedContents;
          hasSynthetic = Object.values(pastedContents).some(isSyntheticContent);
        }
        if (!hasSynthetic) {
          return;
        }
        let pastedRefs = parsePastedRefs(nextValue);
        let referencedIds = new Set(pastedRefs.map(pasteIdOf));
        draft.setPastedContents((contents) => {
          let values = Object.values(contents);
          let orphaned = Object.entries(contents).filter(isOrphanedTextPaste);
          let lazySpaceInputFilter = expandTruncatedPastes(nextValue, contents);
          let mapped = orphaned.map(secondEntryValue);
          let truncatedIds = new Set(pastedRefs.flatMap(truncatedTextPasteIds));
          let onIdeAtMentioned = (atMentioned) =>
            cachedNfd(atMentioned, () => [atMentioned.content])[0] ?? "";
          let expandedNfd;
          let isRetained = (pastedEntry) => {
            let content = pastedEntry.content;
            if (lazySpaceInputFilter.includes(content)) {
              return true;
            }
            let variants = nfcVariants(content);
            if (variants.some((prev) => prev !== content && lazySpaceInputFilter.includes(prev))) {
              return true;
            }
            if (expandedNfd === undefined)
              expandedNfd = expandTruncatedPastes(
                nextValue.normalize("NFD"),
                Object.fromEntries(
                  orphaned
                    .filter((prev) => {
                      let [pasteId] = prev;
                      return truncatedIds.has(pasteId);
                    })
                    .map((prev) => {
                      let [pasteId, atMentioned] = prev;
                      return [
                        pasteId,
                        {
                          ...atMentioned,
                          content: onIdeAtMentioned(atMentioned),
                        },
                      ];
                    }),
                ),
              );
            let expandedNfdStable = expandedNfd;
            let nextMode = cachedNfd(pastedEntry, () => variants);
            if (
              nextMode.some((prev) => expandedNfdStable.includes(prev)) ||
              nextMode.some((current) => endsWithCombiningMatch(expandedNfdStable, current)) ||
              variants.some((prev) => mapped.some((prev_2) => prev_2.content.includes(prev)))
            ) {
              return true;
            }
            return nextMode.some((prev) =>
              mapped.some((imageData) => onIdeAtMentioned(imageData).includes(prev)),
            );
          };
          let filtered = values.filter((prev) =>
            prev.inline ? !isRetained(prev) : isSyntheticContent(prev) && !referencedIds.has(prev.id),
          );
          if (filtered.length === 0) {
            return contents;
          }
          let nextContents = {
            ...contents,
          };
          for (const pastedEntry of filtered) delete nextContents[pastedEntry.id];
          return nextContents;
        });
      });
    };
    draftDeps = [draft];
    $[292] = draft;
    $[293] = pasteCleanupEffect;
    $[294] = draftDeps;
  } else {
    pasteCleanupEffect = $[293];
    draftDeps = $[294];
  }
  useEffect(pasteCleanupEffect, draftDeps);
  let expandPaste;
  if (
    $[295] !== resetPasteHintStable ||
    $[296] !== draft ||
    $[297] !== pushToBufferStable ||
    $[298] !== setCursorOffset ||
    $[299] !== setValue ||
    $[300] !== setPastedContents
  ) {
    expandPaste = function expandPasteImpl(prev) {
      let { value: nextValue, cursorOffset, pastedContents } = draft;
      let paste = expandLastPaste(nextValue, pastedContents);
      if (paste?.id !== prev) {
        return false;
      }
      pushToBufferStable(nextValue, cursorOffset, pastedContents);
      let content = pastedContents[paste.id]?.content ?? "";
      let headLength = paste.cursorOffset - content.length;
      let { written, end } = composeNormalized(
        paste.expanded.slice(0, headLength).normalize("NFC"),
        content,
        paste.expanded.slice(paste.cursorOffset),
      );
      setValue(written);
      setCursorOffset(end);
      setPastedContents((prev) => {
        let nextContents = {
          ...prev,
        };
        let pastedEntry = nextContents[paste.id];
        delete nextContents[paste.id];
        return pastedEntry
          ? addInlineTextContentsWithFallback(nextContents, pastedEntry.content, isVirtualPancakeEnabled())
          : nextContents;
      });
      resetPasteHintStable();
      return true;
    };
    $[295] = resetPasteHintStable;
    $[296] = draft;
    $[297] = pushToBufferStable;
    $[298] = setCursorOffset;
    $[299] = setValue;
    $[300] = setPastedContents;
    $[301] = expandPaste;
  } else expandPaste = $[301];
  let expandPasteStable = expandPaste;
  let onPaste = function onPasteImpl(prev) {
    setAppState(clearFooterSelectionState);
    let prefix = thinkingEnabled.current === "link" ? " " : "";
    thinkingEnabled.current = false;
    let { value: nextValue, pastedContents } = draft;
    let replaced = stripAnsi(prev)
      .replace(
        /\r\n|\r/g,
        `
`,
      )
      .replaceAll("\t", "    ");
    if (nextValue.length === 0) {
      let modeFromInput = getModeFromInput_2(replaced);
      if (modeFromInput !== "prompt") {
        setMode(modeFromInput);
        replaced = stripModePrefix(replaced);
      }
    }
    let text = replaced.trim();
    let isGuideLink = isSetupGuideLink(text);
    if (isGuideLink) replaced = text;
    let lastPasteId = mainLoopModelForSession.current;
    if (
      lastPasteId !== null &&
      pastedContents[lastPasteId]?.type === "text" &&
      pastedContents[lastPasteId].content === replaced &&
      expandPasteStable(lastPasteId)
    ) {
      return;
    }
    let pastedTextRefNumLines = getPastedTextRefNumLines(replaced);
    let max = Math.max(0, Math.min(rows - 10, 2));
    if (replaced.length > PASTE_THRESHOLD || pastedTextRefNumLines > max || isGuideLink) {
      if (!isGuideLink) logFeatureOk("input_paste_large");
      let pasteId = mintPasteId(nextValue, pastedContents);
      mainLoopModelForSession.current = pasteId;
      let newContent = {
        id: pasteId,
        type: "text",
        content: replaced,
      };
      setPastedContents((prev) => ({
        ...prev,
        [pasteId]: newContent,
      }));
      insertAtCursor(
        prefix +
          formatPastedTextRef(
            pasteId,
            pastedTextRefNumLines,
            isGuideLink || isSetupGuidePaste(replaced) ? TEAM_SETUP_GUIDE_LABEL : undefined,
          ),
      );
      if (isGuideLink) thinkingEnabled.current = "link";
      if (replaced.length <= MAX_HISTORY_ENTRIES) {
        onExpandPasteHintChange(true);
        isFastMode.current?.();
        isFastMode.current = clock.setTimeout(() => {
          onExpandPasteHintChange(false);
          isFastMode.current = null;
        }, 8000);
      }
    } else {
      let needsInlinePaste =
        isVirtualPancakeEnabled() &&
        (mentionsUltraplan(replaced) || getPastedTextRefNumLines(stripInvisibleChars_2(replaced).text) > max);
      if (needsInlinePaste || hasTextAfterNfcNormalize(replaced))
        setPastedContents((pastedContents) =>
          addInlineTextContentsWithFallback(pastedContents, replaced, needsInlinePaste),
        );
      insertAtCursor(prefix + replaced, {
        isTyped: true,
      });
    }
  };
  let spaceRestoreFilter;
  if ($[302] === MEMO_CACHE_SENTINEL) {
    spaceRestoreFilter = (input, key) => {
      if (!thinkingEnabled.current) {
        return input;
      }
      thinkingEnabled.current = false;
      if (isYankKey(input, key) && !startsWithPunctuation(input)) {
        return " " + input;
      }
      return input;
    };
    $[302] = spaceRestoreFilter;
  } else spaceRestoreFilter = $[302];
  let spaceAwareFilter = spaceRestoreFilter;
  let pendingUndoRef = useRef(null);
  let pendingRestoreRef = useRef(null);
  let helpAwareFilter;
  if ($[303] !== draft.value || $[304] !== toggleHelp || $[305] !== isVimEditorMode || $[306] !== vimMode) {
    helpAwareFilter = (input, key) => {
      let canToggleHelp =
        !key.ctrl && !key.meta && draft.value === "" && (!isVimEditorMode || vimMode === "INSERT");
      if (input === "?" && canToggleHelp) {
        toggleHelp();
        thinkingEnabled.current = false;
        return "";
      }
      return spaceAwareFilter(input, key);
    };
    $[303] = draft.value;
    $[304] = toggleHelp;
    $[305] = isVimEditorMode;
    $[306] = vimMode;
    $[307] = helpAwareFilter;
  } else helpAwareFilter = $[307];
  let inputFilter = helpAwareFilter;
  let clampCursorBeforeTyped;
  if (
    $[308] !== columns ||
    $[309] !== draft.cursorOffset ||
    $[310] !== draft.value ||
    $[311] !== sessionUiStore
  ) {
    clampCursorBeforeTyped = () => {
      let cursorOffset = draft.cursorOffset;
      if (
        !EDITOR_MODES() ||
        sessionUiStore.getState().vimMode !== "NORMAL" ||
        draft.value !== draft.value.normalize("NFC")
      ) {
        return cursorOffset;
      }
      let cursor = Cursor.fromText(draft.value, columns, cursorOffset);
      let offset = cursor.endOfLogicalLine().offset;
      return cursorOffset !== cursor.startOfLogicalLine().offset &&
        cursorOffset < offset &&
        cursor.right().offset === offset
        ? offset
        : cursorOffset;
    };
    $[308] = columns;
    $[309] = draft.cursorOffset;
    $[310] = draft.value;
    $[311] = sessionUiStore;
    $[312] = clampCursorBeforeTyped;
  } else clampCursorBeforeTyped = $[312];
  let clampCursorByLine = clampCursorBeforeTyped;
  let insertAtCursor = (text, options) => {
    pendingUndoRef.current?.();
    pushToBufferStable(draft.value, draft.cursorOffset, draft.pastedContents, options);
    let terminalName = clampCursorByLine();
    let cursorMoved = terminalName !== draft.cursorOffset;
    if (cursorMoved) draft.setCursorOffset(terminalName);
    let insert = () => {
      draft.insertText(text);
      if (
        cursorMoved &&
        draft.value[draft.cursorOffset - 1] !==
          `
`
      ) {
        let cursor = Cursor.fromText(draft.value, columns, draft.cursorOffset);
        draft.setCursorOffset(clampOffsetOutsidePlaceholder(cursor, draft.cursorOffset));
      }
    };
    if (options?.isTyped === true) commitWithRecording(insert);
    else insert();
  };
  let pasteImage;
  if (
    $[313] !== draft.pastedContents ||
    $[314] !== draft.value ||
    $[315] !== insertAtCursor ||
    $[316] !== setMode ||
    $[317] !== setAppState ||
    $[318] !== setPastedContents
  ) {
    pasteImage = (image, meta) => {
      let { mediaType, filename, dimensions, sourcePath, continuesGesture } = meta ?? {};
      logEvent("tengu_paste_image", {});
      logFeatureOk(sourcePath ? "input_image_drag" : "input_image_paste");
      setMode("prompt");
      let pasteId = mintPasteId(draft.value, draft.pastedContents);
      mainLoopModelForSession.current = pasteId;
      let newContent = {
        id: pasteId,
        type: "image",
        content: image,
        mediaType: mediaType || "image/png",
        filename: filename || "Pasted image",
        dimensions,
        sourcePath,
      };
      let recordStoredImagePath = setSliceField(setAppState, "storedImagePaths");
      recordImagePath(newContent, recordStoredImagePath);
      storeImageAndRecord(newContent, recordStoredImagePath);
      setPastedContents((prev) => ({
        ...prev,
        [pasteId]: newContent,
      }));
      let prefix = thinkingEnabled.current ? " " : "";
      insertAtCursor(prefix + formatImageRef(pasteId), {
        continuesGesture,
      });
      thinkingEnabled.current = true;
    };
    $[313] = draft.pastedContents;
    $[314] = draft.value;
    $[315] = insertAtCursor;
    $[316] = setMode;
    $[317] = setAppState;
    $[318] = setPastedContents;
    $[319] = pasteImage;
  } else pasteImage = $[319];
  let onPasteImage = pasteImage;
  let isInputWrapped = useDoublePress(noopMessageSelector, chrome.openMessageSelector);
  let onAtMentioned;
  if ($[320] !== draft.value || $[321] !== insertAtCursor || $[322] !== clampCursorByLine) {
    onAtMentioned = (prev) => {
      logEvent("tengu_ext_at_mentioned", {});
      insertAtCursor(formatAtMention(prev, draft.value[clampCursorByLine() - 1]));
    };
    $[320] = draft.value;
    $[321] = insertAtCursor;
    $[322] = clampCursorByLine;
    $[323] = onAtMentioned;
  } else onAtMentioned = $[323];
  useIdeAtMentioned(mcpClients, onAtMentioned);
  let undoHandler;
  if (
    $[324] !== canUndo ||
    $[325] !== draft ||
    $[326] !== setCursorOffset ||
    $[327] !== setValue ||
    $[328] !== setPastedContents ||
    $[329] !== undo
  ) {
    undoHandler = () => {
      if (draft.mode !== defaultPlaceholder.current) {
        return;
      }
      if (canUndo) {
        let snapshot = undo();
        if (snapshot)
          draft.attribute(undoPromptOrigin, () => {
            setValue(snapshot.text);
            setCursorOffset(snapshot.cursorOffset);
            setPastedContents(snapshot.pastedContents);
          });
      }
    };
    $[324] = canUndo;
    $[325] = draft;
    $[326] = setCursorOffset;
    $[327] = setValue;
    $[328] = setPastedContents;
    $[329] = undo;
    $[330] = undoHandler;
  } else undoHandler = $[330];
  let undoStable = undoHandler;
  let recordInsertRef = useRef(null);
  let insertNewline;
  if (
    $[331] !== draft ||
    $[332] !== sessionUiStore ||
    $[333] !== pushToBufferStable ||
    $[334] !== commitWithRecording ||
    $[335] !== setCursorOffset
  ) {
    insertNewline = () => {
      let { value: nextValue, cursorOffset, pastedContents } = draft;
      pushToBufferStable(nextValue, cursorOffset, pastedContents);
      let insert = () => {
        draft.setValueTyped(
          nextValue.slice(0, cursorOffset) +
            `
` +
            nextValue.slice(cursorOffset),
        );
        setCursorOffset(cursorOffset + 1);
      };
      if (EDITOR_MODES() && sessionUiStore.getState().vimMode !== "INSERT") insert();
      else commitWithRecording(insert);
      recordInsertRef.current?.(`
`);
    };
    $[331] = draft;
    $[332] = sessionUiStore;
    $[333] = pushToBufferStable;
    $[334] = commitWithRecording;
    $[335] = setCursorOffset;
    $[336] = insertNewline;
  } else insertNewline = $[336];
  let insertNewlineStable = insertNewline;
  let openExternalEditor;
  if (
    $[337] !== addNotification ||
    $[338] !== draft.cursorOffset ||
    $[339] !== draft.pastedContents ||
    $[340] !== draft.value ||
    $[341] !== onExternalEditorActiveChange ||
    $[342] !== sessionUiStore ||
    $[343] !== pushToBufferStable ||
    $[344] !== setCursorOffset ||
    $[345] !== setValue ||
    $[346] !== transcript
  ) {
    openExternalEditor = async () => {
      logEvent("tengu_external_editor_used", {});
      onExternalEditorActiveChange(true);
      let originalValue = draft.value;
      let result;
      try {
        let contextText;
        if (getGlobalConfig().externalEditorContext) {
          let joined = collectTrailingAssistantTexts(transcript.getSnapshot()).messages.join(`

`);
          if (joined) contextText = joined;
        }
        result = await editPromptInEditor(
          originalValue,
          draft.pastedContents,
          contextText,
          draft.cursorOffset,
        );
      } catch (error) {
        let caughtError = error;
        if (caughtError instanceof Error) logError(caughtError);
        addNotification({
          key: "external-editor-error",
          kind: "warning",
          text: `External editor failed: ${errorMessage(caughtError)}`,
          color: "warning",
          priority: "high",
        });
        logFeatureBad("input_external_editor", "spawn_failed");
        onExternalEditorActiveChange(false);
        return;
      }
      onExternalEditorActiveChange(false);
      if (result.error) {
        addNotification({
          key: "external-editor-error",
          kind: "warning",
          text: result.error,
          color: "warning",
          priority: "high",
        });
        logFeatureSad("input_external_editor", "editor_error");
      } else logFeatureOk("input_external_editor");
      if (result.content !== null && result.content !== originalValue) {
        pushToBufferStable(originalValue, draft.cursorOffset, draft.pastedContents);
        setValue(result.content);
        setCursorOffset(
          EDITOR_MODES() && sessionUiStore.getState().vimMode === "NORMAL"
            ? setCwdState(result.content.normalize("NFC"), result.content.length)
            : result.content.length,
        );
      }
    };
    $[337] = addNotification;
    $[338] = draft.cursorOffset;
    $[339] = draft.pastedContents;
    $[340] = draft.value;
    $[341] = onExternalEditorActiveChange;
    $[342] = sessionUiStore;
    $[343] = pushToBufferStable;
    $[344] = setCursorOffset;
    $[345] = setValue;
    $[346] = transcript;
    $[347] = openExternalEditor;
  } else openExternalEditor = $[347];
  let openExternalEditorStable = openExternalEditor;
  let toggleStash = () => {
    if (draft.value.trim() === "" && draft.stashedPrompt !== undefined) {
      draft.popStash("input");
      clearBuffer();
      removeNotification("stash-saved");
      logFeatureOk("input_stash");
    } else if (draft.value.trim() !== "") {
      draft.stash();
      clearBuffer();
      if (isSwarmFooterVisible) {
        let message = `stashed \xB7 ${getShortcutDisplay("chat:stash", "Chat", "ctrl+s")} to restore`;
        addNotification({
          key: "stash-saved",
          kind: "feedback",
          text: message,
          row1Hint: message,
          priority: "immediate",
          timeoutMs: 3000,
        });
      }
      saveGlobalConfig(markStashUsed, storageV5);
      logFeatureOk("input_stash");
    }
  };
  let { dispatchPasteEvent } = useApp();
  let dispatchPendingPastes;
  if ($[348] !== dispatchPasteEvent || $[349] !== inputTakesFocus || $[350] !== takePendingPastes) {
    dispatchPendingPastes = () => {
      if (!inputTakesFocus) {
        return;
      }
      for (const pastedText of takePendingPastes()) dispatchPasteEvent(pastedText);
    };
    $[348] = dispatchPasteEvent;
    $[349] = inputTakesFocus;
    $[350] = takePendingPastes;
    $[351] = dispatchPendingPastes;
  } else dispatchPendingPastes = $[351];
  let dispatchPendingDeps;
  if (
    $[352] !== dispatchPasteEvent ||
    $[353] !== footerItemSelected ||
    $[354] !== inputTakesFocus ||
    $[355] !== takePendingPastes
  ) {
    dispatchPendingDeps = [inputTakesFocus, footerItemSelected, takePendingPastes, dispatchPasteEvent];
    $[352] = dispatchPasteEvent;
    $[353] = footerItemSelected;
    $[354] = inputTakesFocus;
    $[355] = takePendingPastes;
    $[356] = dispatchPendingDeps;
  } else dispatchPendingDeps = $[356];
  useEffect(dispatchPendingPastes, dispatchPendingDeps);
  let noImageNotice;
  if ($[357] !== addNotification) {
    noImageNotice = function noImageNoticeImpl() {
      let isSsh = env.isSSH();
      addNotification({
        key: "no-image-in-clipboard",
        kind: "feedback",
        text: isSsh
          ? "no image over SSH \xB7 copy the file over, paste its path"
          : `No image found in clipboard. Use ${getShortcutDisplay("chat:imagePaste", "Chat", "ctrl+v")} to paste images.`,
        row1Hint: isSsh ? "no image \xB7 over SSH, try scp" : "no image in clipboard",
        priority: "immediate",
        timeoutMs: isSsh ? 5000 : 1000,
      });
    };
    $[357] = addNotification;
    $[358] = noImageNotice;
  } else noImageNotice = $[358];
  let showNoImageNotice = noImageNotice;
  let pasteImageFromClipboard;
  if (
    $[359] !== dispatchPasteEvent ||
    $[360] !== mainLoopModel ||
    $[361] !== showNoImageNotice ||
    $[362] !== onPasteImage ||
    $[363] !== onIsPastingChange
  ) {
    pasteImageFromClipboard = () => {
      onIsPastingChange(true);
      getImageFromClipboard(imageLimitsForModel(mainLoopModel))
        .then(async (result) => {
          if (result) {
            onPasteImage(result.base64, {
              mediaType: result.mediaType,
              dimensions: result.dimensions,
            });
            return;
          }
          let clipboard = await readClipboard("clipboard");
          if (clipboard && !looksLikeBinaryText(clipboard)) {
            logFeatureSad("input_image_paste", "text_fallback");
            dispatchPasteEvent(clipboard);
            return;
          }
          logFeatureBad("input_image_paste", clipboard ? "binary_garbage" : "not_found");
          showNoImageNotice();
        })
        .catch(logImagePasteFailure)
        .finally(() => onIsPastingChange(false));
    };
    $[359] = dispatchPasteEvent;
    $[360] = mainLoopModel;
    $[361] = showNoImageNotice;
    $[362] = onPasteImage;
    $[363] = onIsPastingChange;
    $[364] = pasteImageFromClipboard;
  } else pasteImageFromClipboard = $[364];
  let pasteImageFromClipboardStable = pasteImageFromClipboard;
  let chatKeyActions;
  if (
    $[365] !== openExternalEditorStable ||
    $[366] !== pasteImageFromClipboardStable ||
    $[367] !== insertNewlineStable ||
    $[368] !== toggleStash ||
    $[369] !== undoStable
  ) {
    chatKeyActions = {
      "chat:undo": undoStable,
      "chat:newline": insertNewlineStable,
      "chat:externalEditor": openExternalEditorStable,
      "chat:stash": toggleStash,
      "chat:imagePaste": pasteImageFromClipboardStable,
    };
    $[365] = openExternalEditorStable;
    $[366] = pasteImageFromClipboardStable;
    $[367] = insertNewlineStable;
    $[368] = toggleStash;
    $[369] = undoStable;
    $[370] = chatKeyActions;
  } else chatKeyActions = $[370];
  let chatKeyActionsStable = chatKeyActions;
  const isActive = !isModalOverlayActive && !isSearchingHistory;
  let chatKeyArgs;
  if ($[371] !== footerOwnsKeyOf || $[372] !== isActive) {
    chatKeyArgs = {
      isActive,
      footerOwnsKeyOf,
    };
    $[371] = footerOwnsKeyOf;
    $[372] = isActive;
    $[373] = chatKeyArgs;
  } else chatKeyArgs = $[373];
  useFooterAwareMessageActions(chatKeyActionsStable, chatKeyArgs);
  let keywordKeyActions;
  if ($[374] !== toggleKeywordSuppressed) {
    keywordKeyActions = {
      "chat:workflowKeywordToggle": toggleKeywordSuppressed,
    };
    $[374] = toggleKeywordSuppressed;
    $[375] = keywordKeyActions;
  } else keywordKeyActions = $[375];
  const isActive_2 = !isModalOverlayActive && ultracodeRanges.length > 0;
  let keywordKeyArgs;
  if ($[376] !== footerOwnsKeyOf || $[377] !== isActive_2) {
    keywordKeyArgs = {
      isActive: isActive_2,
      footerOwnsKeyOf,
    };
    $[376] = footerOwnsKeyOf;
    $[377] = isActive_2;
    $[378] = keywordKeyArgs;
  } else keywordKeyArgs = $[378];
  useFooterAwareMessageActions(keywordKeyActions, keywordKeyArgs);
  let isSwarmFooterVisible = showSwarmFooterGate();
  let { agent, tmuxHint } = useTeammateBanner();
  let bannerOptions;
  if ($[379] !== embedded) {
    bannerOptions = {
      hideSessionTitle: embedded,
    };
    $[379] = embedded;
    $[380] = bannerOptions;
  } else bannerOptions = $[380];
  let sessionBanner = useSessionBanner(bannerOptions);
  let banner = agent ?? tmuxHint ?? sessionBanner;
  let maxWidth = columns - INPUT_RIGHT_GUTTER - 1;
  let badgeWidthValue;
  if ($[381] !== agent || $[382] !== isSwarmFooterVisible || $[383] !== mode || $[384] !== maxWidth) {
    badgeWidthValue = isSwarmFooterVisible
      ? badgeWidth(
          promptModeBadgeText({
            mode,
            agent,
            maxWidth,
          }),
        )
      : INPUT_BADGE_GUTTER;
    $[381] = agent;
    $[382] = isSwarmFooterVisible;
    $[383] = mode;
    $[384] = maxWidth;
    $[385] = badgeWidthValue;
  } else badgeWidthValue = $[385];
  let badgeWidthValueStable = badgeWidthValue;
  let leadingPillRaw;
  if (
    $[386] !== chrome.dismissIdeSelection ||
    $[387] !== ideSelection ||
    $[388] !== ideSelectionRidesRow1 ||
    $[389] !== mcpClients ||
    $[390] !== viewingAgentTaskId
  ) {
    let ideSelectionText =
      viewingAgentTaskId || ideSelectionRidesRow1
        ? null
        : ideSelectionLabel(useIdeConnectionStatus(mcpClients).status, ideSelection);
    leadingPillRaw =
      ideSelectionText === null
        ? undefined
        : {
            text: formatPasteLabel(ideSelectionText),
            onDelete: chrome.dismissIdeSelection,
          };
    $[386] = chrome.dismissIdeSelection;
    $[387] = ideSelection;
    $[388] = ideSelectionRidesRow1;
    $[389] = mcpClients;
    $[390] = viewingAgentTaskId;
    $[391] = leadingPillRaw;
  } else leadingPillRaw = $[391];
  let leadingPill = leadingPillRaw;
  let text = leadingPill?.text ?? "";
  let columns_2 = isSwarmFooterVisible
    ? Math.max(INPUT_RIGHT_GUTTER, columns - badgeWidthValueStable)
    : columns - INPUT_BADGE_GUTTER;
  let maxVisibleLines = useIsFullscreen()
    ? Math.max(MIN_FULLSCREEN_INPUT_ROWS, Math.floor(rows / 2) - MIN_INPUT_ROWS)
    : undefined;
  let ghostAtEnd =
    !isVimEditorMode && inlineGhostText?.insertPosition === cursorOffset && cursorOffset >= value.length;
  let getVirtualTexts;
  if ($[392] !== draft || $[393] !== hasDecorations || $[394] !== ghostAtEnd || $[395] !== plain) {
    getVirtualTexts = () => {
      let baseVirtualTexts =
        plain || !hasDecorations ? EMPTY_SPANS : emptySpans(draft.getSnapshot().decorations);
      return ghostAtEnd ? rangesBefore(baseVirtualTexts, draft.value.length) : baseVirtualTexts;
    };
    $[392] = draft;
    $[393] = hasDecorations;
    $[394] = ghostAtEnd;
    $[395] = plain;
    $[396] = getVirtualTexts;
  } else getVirtualTexts = $[396];
  let virtualTextsGetter = getVirtualTexts;
  let onClickHandler;
  if (
    $[397] !== cursorSide ||
    $[398] !== draft ||
    $[399] !== isSearchingHistory ||
    $[400] !== maxVisibleLines ||
    $[401] !== text ||
    $[402] !== setAppState ||
    $[403] !== setCursorOffset ||
    $[404] !== columns_2 ||
    $[405] !== virtualTextsGetter
  ) {
    onClickHandler = (entry) => {
      if (isSearchingHistory) {
        return;
      }
      setAppState(clearFooterSelectionState);
      let { value: nextValue, cursorOffset } = draft;
      if (!nextValue) {
        return;
      }
      let { cursor, bufferOffset } = createDisplayCursor({
        buffer: text + nextValue,
        offset: text.length + cursorOffset,
        texts: offsetDecorations(virtualTextsGetter(), text.length),
        columns: columns_2,
        side: cursorSide,
      });
      let entryMode = bufferOffset(
        cursor.measuredText.getOffsetFromPosition({
          line: entry.localRow + cursor.getViewportStartLine(maxVisibleLines),
          column: entry.localCol,
        }),
      );
      pendingRestoreRef.current?.();
      setCursorOffset(Math.max(0, entryMode - text.length));
    };
    $[397] = cursorSide;
    $[398] = draft;
    $[399] = isSearchingHistory;
    $[400] = maxVisibleLines;
    $[401] = text;
    $[402] = setAppState;
    $[403] = setCursorOffset;
    $[404] = columns_2;
    $[405] = virtualTextsGetter;
    $[406] = onClickHandler;
  } else onClickHandler = $[406];
  let onClick = onClickHandler;
  let value_2 = useRef(null);
  let deleteSelection;
  if (
    $[407] !== cursorSide ||
    $[408] !== draft ||
    $[409] !== isModalOverlayActive ||
    $[410] !== isSearchingHistory ||
    $[411] !== maxVisibleLines ||
    $[412] !== pushToBufferStable ||
    $[413] !== text ||
    $[414] !== setCursorOffset ||
    $[415] !== setValue ||
    $[416] !== columns_2 ||
    $[417] !== virtualTextsGetter
  ) {
    deleteSelection = (selection) => {
      let { value: nextValue, cursorOffset, pastedContents } = draft;
      if (!nextValue || isSearchingHistory || isModalOverlayActive) {
        return false;
      }
      let cachedLayout = value_2.current?.cachedLayout;
      let bounds = selectionBounds(selection);
      if (!cachedLayout || !bounds) {
        return false;
      }
      let { start, end } = bounds;
      if (
        start.row < cachedLayout.y ||
        end.row < cachedLayout.y ||
        start.row >= cachedLayout.y + cachedLayout.height ||
        end.row >= cachedLayout.y + cachedLayout.height
      ) {
        return false;
      }
      let { cursor, bufferOffset } = createDisplayCursor({
        buffer: text + nextValue,
        offset: text.length + cursorOffset,
        texts: offsetDecorations(virtualTextsGetter(), text.length),
        columns: columns_2,
        side: cursorSide,
      });
      let displayCursor = cursor;
      let offsetOf = bufferOffset;
      let viewportStartLine = displayCursor.getViewportStartLine(maxVisibleLines);
      let toBufferOffset = (show, key) =>
        offsetOf(
          displayCursor.measuredText.getOffsetFromPosition({
            line: show - cachedLayout.y + viewportStartLine,
            column: Math.max(0, key - cachedLayout.x),
          }),
        ) - text.length;
      let max = Math.max(0, toBufferOffset(start.row, start.col));
      let min = Math.min(nextValue.length, toBufferOffset(end.row, end.col + 1));
      if (min <= max) {
        return false;
      }
      pushToBufferStable(nextValue, cursorOffset, pastedContents);
      setValue(nextValue.slice(0, max) + nextValue.slice(min));
      setCursorOffset(max);
      return true;
    };
    $[407] = cursorSide;
    $[408] = draft;
    $[409] = isModalOverlayActive;
    $[410] = isSearchingHistory;
    $[411] = maxVisibleLines;
    $[412] = pushToBufferStable;
    $[413] = text;
    $[414] = setCursorOffset;
    $[415] = setValue;
    $[416] = columns_2;
    $[417] = virtualTextsGetter;
    $[418] = deleteSelection;
  } else deleteSelection = $[418];
  let deleteSelectionStable = deleteSelection;
  let previousState = useInputSelectionBridge();
  let bridgeEffect;
  let bridgeDeps;
  if ($[419] !== deleteSelectionStable || $[420] !== previousState) {
    bridgeEffect = () => {
      previousState.setHandler(deleteSelectionStable);
      return () => previousState.setHandler(null);
    };
    bridgeDeps = [previousState, deleteSelectionStable];
    $[419] = deleteSelectionStable;
    $[420] = previousState;
    $[421] = bridgeEffect;
    $[422] = bridgeDeps;
  } else {
    bridgeEffect = $[421];
    bridgeDeps = $[422];
  }
  useEffect(bridgeEffect, bridgeDeps);
  let composerApi;
  let composerApiDeps;
  if (
    $[423] !== clearBuffer ||
    $[424] !== draft ||
    $[425] !== getWorkflowKeywordSuppressed ||
    $[426] !== handleChangeStable ||
    $[427] !== resetHistory ||
    $[428] !== selectSuggestion ||
    $[429] !== setCursorOffset ||
    $[430] !== setHoveredSuggestion
  ) {
    composerApi = () => ({
      clearBuffer,
      resetHistory,
      typeText: (text) => {
        let { value: input, cursorOffset } = draft;
        handleChangeStable(input.slice(0, cursorOffset) + text + input.slice(cursorOffset));
        setCursorOffset(cursorOffset + text.length);
      },
      selectSuggestion,
      setHoveredSuggestion,
      isWorkflowKeywordSuppressed: getWorkflowKeywordSuppressed,
    });
    composerApiDeps = [
      clearBuffer,
      resetHistory,
      draft,
      handleChangeStable,
      setCursorOffset,
      selectSuggestion,
      setHoveredSuggestion,
      getWorkflowKeywordSuppressed,
    ];
    $[423] = clearBuffer;
    $[424] = draft;
    $[425] = getWorkflowKeywordSuppressed;
    $[426] = handleChangeStable;
    $[427] = resetHistory;
    $[428] = selectSuggestion;
    $[429] = setCursorOffset;
    $[430] = setHoveredSuggestion;
    $[431] = composerApi;
    $[432] = composerApiDeps;
  } else {
    composerApi = $[431];
    composerApiDeps = $[432];
  }
  useImperativeHandle(ref, composerApi, composerApiDeps);
  let historyBadge;
  if ($[433] !== historyEdited || $[434] !== historyIndex || $[435] !== historyTotal) {
    let historyLabel = historyPositionLabel(historyIndex, historyTotal, historyEdited);
    historyBadge = historyLabel
      ? {
          content: ` ${sequential.dim(historyLabel)} `,
          position: "top",
          align: "start",
          offset: 2,
        }
      : undefined;
    $[433] = historyEdited;
    $[434] = historyIndex;
    $[435] = historyTotal;
    $[436] = historyBadge;
  } else historyBadge = $[436];
  let historyBadgeStable = historyBadge;
  if (hidden) {
    return null;
  }
  let value_3;
  if ($[437] !== historyMatch || $[438] !== value) {
    value_3 = historyMatch ? stripModePrefix(historyMatch.display) : value;
    $[437] = historyMatch;
    $[438] = value;
    $[439] = value_3;
  } else value_3 = $[439];
  let getPastedContents;
  if ($[440] !== draft.pastedContents) {
    getPastedContents = () => draft.pastedContents;
    $[440] = draft.pastedContents;
    $[441] = getPastedContents;
  } else getPastedContents = $[441];
  let getInputMode;
  if ($[442] !== draft.mode) {
    getInputMode = () => draft.mode;
    $[442] = draft.mode;
    $[443] = getInputMode;
  } else getInputMode = $[443];
  const historyOnClear = !cameBack;
  const onLeftArrowOnEmpty = leftArrowRoute?.handler;
  const leftArrowConfirmHint = leftArrowRoute?.confirmHint;
  let onUnreadImagePaste;
  if ($[444] !== showNoImageNotice) {
    onUnreadImagePaste = () => {
      if (env.isSSH()) {
        logFeatureBad("input_image_paste", "not_found");
        showNoImageNotice();
      }
    };
    $[444] = showNoImageNotice;
    $[445] = onUnreadImagePaste;
  } else onUnreadImagePaste = $[445];
  const disableCursorMovementForUpDownKeys = suggestions.length > 0 || footerItemSelected;
  const disableEscapeDoublePress = suggestions.length > 0;
  const parkCursor = cursorRowId === null;
  const onUndo = canUndo ? undoStable : undefined;
  let textInputProps;
  if (
    $[446] !== chrome.requestExit ||
    $[447] !== commandArgumentHint ||
    $[448] !== commitEdit ||
    $[449] !== cursorOffset ||
    $[450] !== highlights ||
    $[451] !== virtualTexts ||
    $[452] !== editRelay ||
    $[453] !== onSubmit_2 ||
    $[454] !== onHistoryDown_2 ||
    $[455] !== onHistoryUp_2 ||
    $[456] !== onKeyDownBefore ||
    $[457] !== inlineGhostText ||
    $[458] !== inputTakesFocus ||
    $[459] !== maxVisibleLines ||
    $[460] !== onExitMessage ||
    $[461] !== onPasteImage ||
    $[462] !== onIsPastingChange ||
    $[463] !== onChange ||
    $[464] !== onPaste ||
    $[465] !== placeholder ||
    $[466] !== inputFilter ||
    $[467] !== resetHistory ||
    $[468] !== leadingPill ||
    $[469] !== setCursorOffset ||
    $[470] !== showCursor ||
    $[471] !== value_3 ||
    $[472] !== getPastedContents ||
    $[473] !== getInputMode ||
    $[474] !== historyOnClear ||
    $[475] !== onLeftArrowOnEmpty ||
    $[476] !== leftArrowConfirmHint ||
    $[477] !== onUnreadImagePaste ||
    $[478] !== disableCursorMovementForUpDownKeys ||
    $[479] !== disableEscapeDoublePress ||
    $[480] !== parkCursor ||
    $[481] !== onUndo ||
    $[482] !== columns_2
  ) {
    textInputProps = {
      multiline: true,
      allowPrintableKeybindings: true,
      onKeyDownBefore,
      onSubmit: onSubmit_2,
      onChange,
      value: value_3,
      onHistoryUp: onHistoryUp_2,
      onHistoryDown: onHistoryDown_2,
      onHistoryReset: resetHistory,
      getPastedContents,
      getInputMode,
      historyOnClear,
      placeholder,
      onExit: chrome.requestExit,
      onExitMessage,
      onLeftArrowOnEmpty,
      leftArrowConfirmHint,
      onImagePaste: onPasteImage,
      onUnreadImagePaste,
      columns: columns_2,
      leadingPill,
      maxVisibleLines,
      disableCursorMovementForUpDownKeys,
      disableEscapeDoublePress,
      cursorOffset,
      onChangeCursorOffset: setCursorOffset,
      onPaste,
      onIsPastingChange,
      focus: inputTakesFocus,
      showCursor,
      parkCursor,
      argumentHint: commandArgumentHint,
      onUndo,
      highlights,
      inlineGhostText,
      virtualTexts,
      inputFilter,
      editRelay,
      commitEdit,
    };
    $[446] = chrome.requestExit;
    $[447] = commandArgumentHint;
    $[448] = commitEdit;
    $[449] = cursorOffset;
    $[450] = highlights;
    $[451] = virtualTexts;
    $[452] = editRelay;
    $[453] = onSubmit_2;
    $[454] = onHistoryDown_2;
    $[455] = onHistoryUp_2;
    $[456] = onKeyDownBefore;
    $[457] = inlineGhostText;
    $[458] = inputTakesFocus;
    $[459] = maxVisibleLines;
    $[460] = onExitMessage;
    $[461] = onPasteImage;
    $[462] = onIsPastingChange;
    $[463] = onChange;
    $[464] = onPaste;
    $[465] = placeholder;
    $[466] = inputFilter;
    $[467] = resetHistory;
    $[468] = leadingPill;
    $[469] = setCursorOffset;
    $[470] = showCursor;
    $[471] = value_3;
    $[472] = getPastedContents;
    $[473] = getInputMode;
    $[474] = historyOnClear;
    $[475] = onLeftArrowOnEmpty;
    $[476] = leftArrowConfirmHint;
    $[477] = onUnreadImagePaste;
    $[478] = disableCursorMovementForUpDownKeys;
    $[479] = disableEscapeDoublePress;
    $[480] = parkCursor;
    $[481] = onUndo;
    $[482] = columns_2;
    $[483] = textInputProps;
  } else textInputProps = $[483];
  let textInputPropsStable = textInputProps;
  let editorBorderStyle;
  if ($[484] !== plain || $[485] !== mode) {
    editorBorderStyle = getEditorWaitBorderStyle(mode, plain);
    $[484] = plain;
    $[485] = mode;
    $[486] = editorBorderStyle;
  } else editorBorderStyle = $[486];
  let editorBorderStyleStable = editorBorderStyle;
  let editorElement;
  if (
    $[487] !== textInputPropsStable ||
    $[488] !== onModeChange ||
    $[489] !== onOpenHistorySearch ||
    $[490] !== toggleHelp ||
    $[491] !== isVimEditorMode ||
    $[492] !== vimMode
  ) {
    editorElement = isVimEditorMode
      ? jsxProd_default(VimTextInput, {
          ...textInputPropsStable,
          initialMode: vimMode,
          onModeChange,
          cancelRemapRef: pendingUndoRef,
          forgetColumnRef: pendingRestoreRef,
          onOpenHistorySearch,
          onToggleHelp: toggleHelp,
          recordInsertRef,
        })
      : jsxProd_default(TextInput, {
          ...textInputPropsStable,
        });
    $[487] = textInputPropsStable;
    $[488] = onModeChange;
    $[489] = onOpenHistorySearch;
    $[490] = toggleHelp;
    $[491] = isVimEditorMode;
    $[492] = vimMode;
    $[493] = editorElement;
  } else editorElement = $[493];
  let children = editorElement;
  let editorBox;
  if ($[494] !== onClick || $[495] !== children) {
    editorBox = jsxProd_default(Box, {
      ref: value_2,
      flexGrow: 1,
      flexShrink: 1,
      tabIndex: -1,
      onClick,
      children,
    });
    $[494] = onClick;
    $[495] = children;
    $[496] = editorBox;
  } else editorBox = $[496];
  let editorBoxStable = editorBox;
  if (isSwarmFooterVisible) {
    let topDivider;
    if ($[497] !== columns) {
      topDivider = jsxProd_default(Divider, {
        width: columns,
      });
      $[497] = columns;
      $[498] = topDivider;
    } else topDivider = $[498];
    let badge;
    if ($[499] !== agent || $[500] !== mode || $[501] !== maxWidth) {
      badge = jsxProd_default(PromptModeBadge, {
        mode,
        agent,
        maxWidth,
      });
      $[499] = agent;
      $[500] = mode;
      $[501] = maxWidth;
      $[502] = badge;
    } else badge = $[502];
    let badgeRow;
    if ($[503] !== editorBoxStable || $[504] !== badge) {
      badgeRow = jsxProd_default_2(Box, {
        flexDirection: "row",
        width: "100%",
        children: [badge, editorBoxStable],
      });
      $[503] = editorBoxStable;
      $[504] = badge;
      $[505] = badgeRow;
    } else badgeRow = $[505];
    let bottomDivider;
    if ($[506] !== columns) {
      bottomDivider = jsxProd_default(Divider, {
        width: columns,
      });
      $[506] = columns;
      $[507] = bottomDivider;
    } else bottomDivider = $[507];
    let swarmLayout;
    if ($[508] !== topDivider || $[509] !== badgeRow || $[510] !== bottomDivider) {
      swarmLayout = jsxProd_default_2(Fragment, {
        children: [false, topDivider, badgeRow, bottomDivider],
      });
      $[508] = topDivider;
      $[509] = badgeRow;
      $[510] = bottomDivider;
      $[511] = swarmLayout;
    } else swarmLayout = $[511];
    return swarmLayout;
  }
  if (banner && !historyBadgeStable) {
    let topBanner;
    if ($[512] !== columns || $[513] !== fastModeTag || $[514] !== banner) {
      topBanner = jsxProd_default(PromptBorderBanner, {
        banner,
        columns,
        fastModeTag,
      });
      $[512] = columns;
      $[513] = fastModeTag;
      $[514] = banner;
      $[515] = topBanner;
    } else topBanner = $[515];
    let indicatorRow;
    if ($[516] !== editorBoxStable || $[517] !== modeIndicator) {
      indicatorRow = jsxProd_default_2(Box, {
        flexDirection: "row",
        width: "100%",
        children: [modeIndicator, editorBoxStable],
      });
      $[516] = editorBoxStable;
      $[517] = modeIndicator;
      $[518] = indicatorRow;
    } else indicatorRow = $[518];
    let bottomBanner;
    if ($[519] !== columns || $[520] !== fastModeTag || $[521] !== banner) {
      bottomBanner = jsxProd_default(PromptBorderBanner, {
        banner,
        columns,
        fastModeTag,
        borderOnly: true,
      });
      $[519] = columns;
      $[520] = fastModeTag;
      $[521] = banner;
      $[522] = bottomBanner;
    } else bottomBanner = $[522];
    let bannerLayout;
    if ($[523] !== topBanner || $[524] !== indicatorRow || $[525] !== bottomBanner) {
      bannerLayout = jsxProd_default_2(Fragment, {
        children: [topBanner, indicatorRow, bottomBanner],
      });
      $[523] = topBanner;
      $[524] = indicatorRow;
      $[525] = bottomBanner;
      $[526] = bannerLayout;
    } else bannerLayout = $[526];
    return bannerLayout;
  }
  let plainUltraTag;
  if ($[527] !== plain || $[528] !== ultraEffortTag) {
    plainUltraTag =
      plain &&
      ultraEffortTag &&
      jsxProd_default(Text, {
        children: ultraEffortTag,
      });
    $[527] = plain;
    $[528] = ultraEffortTag;
    $[529] = plainUltraTag;
  } else plainUltraTag = $[529];
  let plainFastTag;
  if ($[530] !== fastModeCooldown || $[531] !== fastModeTag || $[532] !== plain) {
    plainFastTag =
      plain &&
      fastModeTag &&
      jsxProd_default(Text, {
        color: "fastMode",
        dimColor: fastModeCooldown,
        children: fastModeTag,
      });
    $[530] = fastModeCooldown;
    $[531] = fastModeTag;
    $[532] = plain;
    $[533] = plainFastTag;
  } else plainFastTag = $[533];
  const borderText = plain ? undefined : (historyBadgeStable ?? topBorderText);
  let inputRow;
  if (
    $[534] !== editorBorderStyleStable ||
    $[535] !== editorBoxStable ||
    $[536] !== modeIndicator ||
    $[537] !== borderText
  ) {
    inputRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      ...editorBorderStyleStable,
      width: "100%",
      borderText,
      children: [modeIndicator, editorBoxStable],
    });
    $[534] = editorBorderStyleStable;
    $[535] = editorBoxStable;
    $[536] = modeIndicator;
    $[537] = borderText;
    $[538] = inputRow;
  } else inputRow = $[538];
  let inputLayout;
  if ($[539] !== plainUltraTag || $[540] !== plainFastTag || $[541] !== inputRow) {
    inputLayout = jsxProd_default_2(Fragment, {
      children: [plainUltraTag, plainFastTag, inputRow],
    });
    $[539] = plainUltraTag;
    $[540] = plainFastTag;
    $[541] = inputRow;
    $[542] = inputLayout;
  } else inputLayout = $[542];
  return inputLayout;
}
//@ chunk-czq1j3j2.js:951491-951507 placement
var MemoizedPromptInput; // deferred: uses PromptInput of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:951491", () => {
  MemoizedPromptInput = memo(PromptInput);
});
export { buildBorderText, MemoizedPromptInput };
