/**
 * components/PromptInput/PromptInput.tsx
 *
 * 主输入框组件 PromptInput：订阅 PromptDraft（value/cursorOffset/mode/pastedContents），组合 TextInput/VimTextInput、模式指示、建议、历史、粘贴、语音、页脚与帮助菜单，提交时调用 onSubmit。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInput.tsx
 * pieces: chunk-18hwfzwa.js (22)
 * attribution: fingerprint 2, sole-consumer 19, affinity 1
 */
import { getActiveAgentForInput } from "../../state/selectors.js";
import { EMPTY_MESSAGES } from "../../state/inProgressToolUses.js";
import { isImagePlaceholder, hasCommand, TEAM_SETUP_GUIDE_LABEL } from "../../commands.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { R, zt, P, yt, Uy, vxe } from "../../../vendor/react/cjs/react.production.js";
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
import { count, uniq } from "../../utils/collections.js";
import { isRefillableInput } from "../../utils/messageQueueManager.js";
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
import { isUltrathinkEffective } from "../../utils/effort.js";
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
  PP,
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
import { cXe } from "../../plugins/functionHooks/sessionEvents.js";
import { relayPromptEdits, Dye } from "../pluginUi/promptEditHook.js";
import { IT } from "../../hooks/useHistorySearch.js";
import { clampCursorOffset, clampOffsetOutsidePlaceholder } from "../../vim/operators.js";
import { useArrowKeyHistory } from "../../hooks/useArrowKeyHistory.js";
import { mergeTurnTags } from "../../utils/userTurnTags.js";
import { useTypeahead } from "../../hooks/useTypeahead.js";
import { isKbCohesionFixesOn } from "../../utils/kbCohesionFixes.js";
import { getPlatform } from "../../utils/platform.js";
import { isMacOptionSpecialChar, MACOS_OPTION_SPECIAL_CHARS } from "../../utils/keyboardShortcuts.js";
import { getNativeCSIuTerminalDisplayName } from "../../commands/terminalSetup/terminalSetup.js";
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

//@ chunk-18hwfzwa.js:155398-155528 fingerprint = buildBorderText (0.791)
/**
 * 拼输入框上边框文字（如会话标题/状态）。
 */
function buildBorderText(h) {
  let fastSeg = h.filter(Boolean).join("  ") || undefined;
  return fastSeg
    ? {
        content: ` ${fastSeg} `,
        position: "top",
        align: "end",
        offset: 0,
      }
    : undefined;
}
//@ chunk-18hwfzwa.js:879241-879289 sole-consumer = _temp2 (1)
function selectViewingAgentTaskId_3(s_0) {
  return s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:879289-879384 sole-consumer
function hasSuppliedTextLink(QB) {
  return QB.linkSuppliedTexts.size > 0 && QB.linkSuppliedTexts.has(QB.value.trim());
}
//@ chunk-18hwfzwa.js:879384-879428 sole-consumer
function selectQueueEditIndex_2(zne) {
  return zne.queueEditIndex;
}
//@ chunk-18hwfzwa.js:879428-879534 sole-consumer
function viewedAgentMessages(Ym) {
  let activeAgentForInput = getActiveAgentForInput(Ym);
  return activeAgentForInput.type === "leader"
    ? undefined
    : (Ym.transcripts[activeAgentForInput.task.id]?.messages ?? EMPTY_MESSAGES);
}
//@ chunk-18hwfzwa.js:879534-879740 sole-consumer
function pendingMessagesForActiveAgent(ky) {
  let activeAgentForInput = getActiveAgentForInput(ky);
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
//@ chunk-18hwfzwa.js:879740-879781 sole-consumer
function shownAsList(BNe) {
  return BNe.shownAs ?? [];
}
//@ chunk-18hwfzwa.js:879781-879828 sole-consumer
function selectUltraplanSessionUrl(CD) {
  return CD.ultraplanSessionUrl;
}
//@ chunk-18hwfzwa.js:879828-879874 sole-consumer
function selectUltraplanLaunching(sf) {
  return sf.ultraplanLaunching;
}
//@ chunk-18hwfzwa.js:879874-879912 sole-consumer
function isImagePasteRef(cg) {
  return isImagePlaceholder(cg.match);
}
//@ chunk-18hwfzwa.js:879912-879928 sole-consumer
function noopInputUpdate() {}
//@ chunk-18hwfzwa.js:879928-879957 sole-consumer
function incrementOffset(vy) {
  return vy + 1;
}
//@ chunk-18hwfzwa.js:879957-880001 sole-consumer
function normalizeNfd(z_) {
  return z_.normalize("NFD");
}
//@ chunk-18hwfzwa.js:880001-880033 sole-consumer
function pasteIdOf(EAt) {
  return EAt.id;
}
//@ chunk-18hwfzwa.js:880033-880096 sole-consumer
function isOrphanedTextPaste(h) {
  let [, Y_] = h;
  return Y_.type === "text" && !Y_.inline;
}
//@ chunk-18hwfzwa.js:880096-880135 sole-consumer
function secondEntryValue(h) {
  let [, DAt] = h;
  return DAt;
}
//@ chunk-18hwfzwa.js:880135-880220 sole-consumer
function truncatedTextPasteIds(Cy) {
  return Cy.match.startsWith("[...Truncated text") ? [String(Cy.id)] : [];
}
//@ chunk-18hwfzwa.js:880220-880236 sole-consumer
function noopMessageSelector() {}
//@ chunk-18hwfzwa.js:880236-880307 sole-consumer
function markStashUsed(Yne) {
  return Yne.hasUsedStash
    ? Yne
    : {
        ...Yne,
        hasUsedStash: true,
      };
}
//@ chunk-18hwfzwa.js:880307-880377 sole-consumer
function logImagePasteFailure(CP) {
  logFeatureBad("input_image_paste", "clipboard_read_failed");
  logError(CP);
}
//@ chunk-18hwfzwa.js:880377-880403 affinity
var MIN_INPUT_ROWS = 5;
var MIN_FULLSCREEN_INPUT_ROWS = 3;
var INPUT_BADGE_GUTTER = 3;
var INPUT_RIGHT_GUTTER = 2;
//@ chunk-18hwfzwa.js:880403-918585 fingerprint = PromptInput (0.391)
/**
 * 主输入框。从 PromptDraft 订阅 value/cursorOffset/mode/pastedContents/interimRange/decorations，从 scope 取 commands；组合：模式指示 + TextInput/VimTextInput（由 editorMode 决定）+ 建议列表（useTypeahead）+ 历史（useArrowKeyHistory / Ctrl+R）+ 粘贴（usePasteHandler，图片转 [Image #N]）+ 语音（useVoiceIntegration）+ 页脚/帮助菜单。
 * 关键行为：输入首字符 ! 切到 bash 模式；@队友 提及高亮；超长输入自动折叠；排队命令可上箭头回到编辑（queueEditIndex）；alt+w 切换 workflow 关键词；提交时调用 onSubmit(value, helpers)。
 */
function PromptInput(props) {
  let $ = w(543);
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
  let mergedClients = useMergedClients(scope.initialMcpClients, useAppState(selectMcpClients2));
  let activeAgents = useAppState(selectAgentDefinitionsActiveAgents_3);
  let teamContext = useAppState(selectTeamContext);
  let viewingAgentTaskId = useAppState(selectViewingAgentTaskId_3);
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
  let promptSuggestionState = R(false);
  let ms;
  if ($[0] !== session) {
    ms = (Xs) => {
      promptSuggestionState.current = false;
      setLaunchWarningFor(session, Xs);
    };
    $[0] = session;
    $[1] = ms;
  } else ms = $[1];
  let onModeChange = ms;
  let is;
  let ws;
  if ($[2] !== draft || $[3] !== sessionUiStore || $[4] !== isVimEditorMode) {
    is = () => {
      if (!isVimEditorMode || normalizeVimMode(sessionUiStore.getState().vimMode) !== "NORMAL") {
        return;
      }
      draft.setCursorOffset(setCwdState(draft.value.normalize("NFC"), draft.cursorOffset));
    };
    ws = [draft, sessionUiStore, isVimEditorMode];
    $[2] = draft;
    $[3] = sessionUiStore;
    $[4] = isVimEditorMode;
    $[5] = is;
    $[6] = ws;
  } else {
    is = $[5];
    ws = $[6];
  }
  zt(is, ws);
  let Ci;
  let oi;
  if ($[7] !== draft || $[8] !== value || $[9] !== sessionUiStore || $[10] !== isVimEditorMode) {
    Ci = () => {
      if (!isVimEditorMode || !draft.changedFromOutside || sessionUiStore.getState().vimMode !== "NORMAL") {
        return;
      }
      draft.setCursorOffset(setCwdState(value.normalize("NFC"), draft.cursorOffset));
    };
    oi = [value, draft, sessionUiStore, isVimEditorMode];
    $[7] = draft;
    $[8] = value;
    $[9] = sessionUiStore;
    $[10] = isVimEditorMode;
    $[11] = Ci;
    $[12] = oi;
  } else {
    Ci = $[11];
    oi = $[12];
  }
  zt(Ci, oi);
  let speculation = R(value);
  let Hi;
  if ($[13] !== draft.value || $[14] !== setAppState) {
    Hi = (Zi) => {
      if (Zi !== null) speculation.current = draft.value;
      setAppState((prev) =>
        prev.queueEditIndex === Zi
          ? prev
          : {
              ...prev,
              queueEditIndex: Zi,
            },
      );
    };
    $[13] = draft.value;
    $[14] = setAppState;
    $[15] = Hi;
  } else Hi = $[15];
  let setQueueEditIndex = Hi;
  let ps;
  if (
    $[16] !== draft.changedFromOutside ||
    $[17] !== value ||
    $[18] !== setQueueEditIndex ||
    $[19] !== store
  ) {
    ps = () => {
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
    $[20] = ps;
  } else ps = $[20];
  let xs;
  if ($[21] !== draft || $[22] !== value || $[23] !== setQueueEditIndex || $[24] !== store) {
    xs = [value, setQueueEditIndex, store, draft];
    $[21] = draft;
    $[22] = value;
    $[23] = setQueueEditIndex;
    $[24] = store;
    $[25] = xs;
  } else xs = $[25];
  P(ps, xs);
  let queueEditIndex = useAppState(selectQueueEditIndex_2);
  let ls;
  if ($[26] !== commandQueue || $[27] !== setQueueEditIndex || $[28] !== store) {
    ls = () => {
      let queueEditIndex = store.getState().queueEditIndex;
      if (queueEditIndex === null) {
        return;
      }
      let qs = count(commandQueue, isRefillableInput);
      if (qs === 0) setQueueEditIndex(null);
      else if (queueEditIndex > qs - 1) setQueueEditIndex(qs - 1);
    };
    $[26] = commandQueue;
    $[27] = setQueueEditIndex;
    $[28] = store;
    $[29] = ls;
  } else ls = $[29];
  let gs;
  if ($[30] !== queueEditIndex || $[31] !== commandQueue || $[32] !== setQueueEditIndex || $[33] !== store) {
    gs = [commandQueue, queueEditIndex, setQueueEditIndex, store];
    $[30] = queueEditIndex;
    $[31] = commandQueue;
    $[32] = setQueueEditIndex;
    $[33] = store;
    $[34] = gs;
  } else gs = $[34];
  P(ls, gs);
  let viewSelectionMode = useAppState(viewedAgentMessages);
  let mainLoopModel_ = useAppState(pendingMessagesForActiveAgent);
  let Hs;
  if ($[35] !== viewSelectionMode || $[36] !== mainLoopModel_) {
    Hs = viewSelectionMode
      ? queuedHumanRows(viewSelectionMode, {
          queuedRowIds: new Set(mainLoopModel_?.flatMap(shownAsList)),
        })
      : undefined;
    $[35] = viewSelectionMode;
    $[36] = mainLoopModel_;
    $[37] = Hs;
  } else Hs = $[37];
  let _s = Hs;
  let mainLoopModelForSession = R(null);
  let ii;
  if ($[38] !== draft.value) {
    ii = () => registerPasteCarrier(() => [draft.value]);
    $[38] = draft.value;
    $[39] = ii;
  } else ii = $[39];
  let ua;
  if ($[40] !== draft) {
    ua = [draft];
    $[40] = draft;
    $[41] = ua;
  } else ua = $[41];
  P(ii, ua);
  let thinkingEnabled = R(false);
  let isFastMode = R(null);
  let dl;
  if ($[42] !== onExpandPasteHintChange) {
    dl = () => {
      if (isFastMode.current) {
        isFastMode.current();
        isFastMode.current = null;
      }
      onExpandPasteHintChange(false);
    };
    $[42] = onExpandPasteHintChange;
    $[43] = dl;
  } else dl = $[43];
  let Vl = dl;
  let Hd;
  let Ss;
  if ($[44] === MEMO_CACHE_SENTINEL) {
    Hd = () => () => {
      isFastMode.current?.();
    };
    Ss = [];
    $[44] = Hd;
    $[45] = Ss;
  } else {
    Hd = $[44];
    Ss = $[45];
  }
  P(Hd, Ss);
  let yi;
  if ($[46] !== historyMatch || $[47] !== value || $[48] !== isSearchingHistory) {
    yi = isSearchingHistory && historyMatch ? stripModePrefix(historyMatch.display) : value;
    $[46] = historyMatch;
    $[47] = value;
    $[48] = isSearchingHistory;
    $[49] = yi;
  } else yi = $[49];
  let displayedValue = yi;
  let coordinatorTaskCount = useQueuedMessageText();
  let cl = viewSelectionMode === undefined;
  let Ol;
  if ($[50] !== displayedValue) {
    Ol = ULTRATHINK_KEYWORD(displayedValue);
    $[50] = displayedValue;
    $[51] = Ol;
  } else Ol = $[51];
  let as = Ol;
  let pi;
  if (
    $[52] !== coordinatorTaskCount ||
    $[53] !== mainLoopModel ||
    $[54] !== mode ||
    $[55] !== cl ||
    $[56] !== as
  ) {
    pi =
      mode === "prompt" && cl && as.length > 0 && isUltrathinkEffective(mainLoopModel, coordinatorTaskCount)
        ? as
        : [];
    $[52] = coordinatorTaskCount;
    $[53] = mainLoopModel;
    $[54] = mode;
    $[55] = cl;
    $[56] = as;
    $[57] = pi;
  } else pi = $[57];
  let qa = pi;
  let pd;
  if ($[58] !== displayedValue) {
    pd = setupGuideChipHighlights(displayedValue);
    $[58] = displayedValue;
    $[59] = pd;
  } else pd = $[59];
  let $l = pd;
  let ultraplanSessionUrl = useAppState(selectUltraplanSessionUrl);
  let ultraplanLaunching = useAppState(selectUltraplanLaunching);
  let Ll;
  if (
    $[60] !== displayedValue ||
    $[61] !== pastedContents ||
    $[62] !== ultraplanLaunching ||
    $[63] !== ultraplanSessionUrl
  ) {
    Ll =
      isUltraplanEnabled() && !ultraplanSessionUrl && !ultraplanLaunching
        ? getLaunchMessagesOutsidePastes(displayedValue, pastedContents)
        : [];
    $[60] = displayedValue;
    $[61] = pastedContents;
    $[62] = ultraplanLaunching;
    $[63] = ultraplanSessionUrl;
    $[64] = Ll;
  } else Ll = $[64];
  let _c = Ll;
  let mc;
  if ($[65] !== displayedValue) {
    mc = isUltrareviewWithBridge() ? findUltrareviewTriggerPositions(displayedValue) : [];
    $[65] = displayedValue;
    $[66] = mc;
  } else mc = $[66];
  let Vd = mc;
  let cd;
  if ($[67] !== displayedValue) {
    cd = isWorkflowsAvailable() && isWorkflowKeywordTriggerEnabled() ? ULTRACODE_KEYWORD(displayedValue) : [];
    $[67] = displayedValue;
    $[68] = cd;
  } else cd = $[68];
  let Ka = cd;
  let [pl, Gl, gd] = useLatestState(false);
  let hd;
  let bd;
  if ($[69] !== draft || $[70] !== gd || $[71] !== removeNotification || $[72] !== Gl) {
    hd = () => {
      let Od = draft.value;
      return draft.subscribe(() => {
        let pc = draft.value;
        if (pc === Od) {
          return;
        }
        Od = pc;
        if (gd() && ULTRACODE_KEYWORD(pc).length === 0) {
          Gl(false);
          removeNotification("workflow-keyword-ignored");
        }
      });
    };
    bd = [draft, gd, Gl, removeNotification];
    $[69] = draft;
    $[70] = gd;
    $[71] = removeNotification;
    $[72] = Gl;
    $[73] = hd;
    $[74] = bd;
  } else {
    hd = $[73];
    bd = $[74];
  }
  P(hd, bd);
  let workflowKeywordToggleShortcut = useShortcutDisplay_2("chat:workflowKeywordToggle", "Chat", "alt+w");
  let ec;
  if ($[75] !== displayedValue) {
    ec = findBtwTriggerPositions(displayedValue);
    $[75] = displayedValue;
    $[76] = ec;
  } else ec = $[76];
  let qu = ec;
  let Ku;
  if ($[77] !== commands || $[78] !== displayedValue) {
    Ku = findSlashMentionRanges(displayedValue).filter((pos) => {
      let commandName = displayedValue.slice(pos.start + 1, pos.end);
      return hasCommand(commandName, commands);
    });
    $[77] = commands;
    $[78] = displayedValue;
    $[79] = Ku;
  } else Ku = $[79];
  let Am = Ku;
  let Kp;
  if ($[80] !== session) {
    Kp = (nl) => onKnownSlackChannelsChanged(session, nl);
    $[80] = session;
    $[81] = Kp;
  } else Kp = $[81];
  let ss = Kp;
  let Gs;
  if ($[82] !== session) {
    Gs = () => getKnownSlackChannelsVersion(session);
    $[82] = session;
    $[83] = Gs;
  } else Gs = $[83];
  yt(ss, Gs);
  let $a;
  if ($[84] !== displayedValue || $[85] !== session || $[86] !== store) {
    $a = hasSlackClient(store.getState().mcp.clients)
      ? findSlackChannelMentions(session, displayedValue)
      : [];
    $[84] = displayedValue;
    $[85] = session;
    $[86] = store;
    $[87] = $a;
  } else $a = $[87];
  let xl = $a;
  let Si;
  if ($[88] !== displayedValue || $[89] !== teamContext) {
    js: {
      if (!isAgentSwarmsEnabled()) {
        let na;
        if ($[91] === MEMO_CACHE_SENTINEL) {
          na = [];
          $[91] = na;
        } else na = $[91];
        Si = na;
        break js;
      }
      if (!teamContext?.teammates) {
        let na;
        if ($[92] === MEMO_CACHE_SENTINEL) {
          na = [];
          $[92] = na;
        } else na = $[92];
        Si = na;
        break js;
      }
      let Ya = [];
      let members = teamContext.teammates;
      if (!members) {
        Si = Ya;
        break js;
      }
      let na;
      if ($[93] === MEMO_CACHE_SENTINEL) {
        na = /(^|\s)@([\w-]+)/g;
        $[93] = na;
      } else na = $[93];
      let ol = na;
      let memberValues = Object.values(members);
      let _d;
      while ((_d = ol.exec(displayedValue)) !== null) {
        let ga = _d[1] ?? "";
        let du = _d.index + ga.length;
        let fullMatch = _d[0].trimStart();
        let wp = _d[2];
        let member = memberValues.find((memberValue) => memberValue.name === wp);
        if (isAgentColorName(member?.color)) {
          let Yd = AGENT_COLOR_TO_THEME_COLOR[member.color];
          if (Yd)
            Ya.push({
              start: du,
              end: du + fullMatch.length,
              themeColor: Yd,
            });
        }
      }
      Si = Ya;
    }
    $[88] = displayedValue;
    $[89] = teamContext;
    $[90] = Si;
  } else Si = $[90];
  let Pi = Si;
  let na;
  if ($[94] !== displayedValue) {
    na = parsePastedRefs(displayedValue);
    $[94] = displayedValue;
    $[95] = na;
  } else na = $[95];
  let placeholders = na;
  const active = mode === "prompt" && !isSearchingHistory && !interimRange;
  let td;
  if (
    $[96] !== cursorOffset ||
    $[97] !== displayedValue ||
    $[98] !== placeholders ||
    $[99] !== session.host ||
    $[100] !== active
  ) {
    td = {
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
    $[101] = td;
  } else td = $[101];
  let spellcheckHighlights = useSpellcheckHighlights(td);
  let Ad;
  let od;
  if ($[102] !== draft) {
    Ad = () => {
      let md;
      let vp;
      let sg = [];
      return draft.subscribe(() => {
        let { value: zi, cursorOffset } = draft;
        if (zi === md && cursorOffset === vp) {
          return;
        }
        if (zi !== md) sg = zi.includes("[") ? parsePastedRefs(zi).filter(isImagePasteRef) : [];
        md = zi;
        vp = cursorOffset;
        let inside = sg.find((Qd) => cursorOffset > Qd.index && cursorOffset < Qd.index + Qd.match.length);
        if (inside) {
          let Hc = inside.index + inside.match.length;
          let xc = (inside.index + Hc) / 2;
          draft.setCursorOffset(cursorOffset < xc ? inside.index : Hc);
        }
      });
    };
    od = [draft];
    $[102] = draft;
    $[103] = Ad;
    $[104] = od;
  } else {
    Ad = $[103];
    od = $[104];
  }
  P(Ad, od);
  let Yc;
  if (
    $[105] !== qu ||
    $[106] !== cursorOffset ||
    $[107] !== historyFailedMatch ||
    $[108] !== historyMatch ||
    $[109] !== historyQuery ||
    $[110] !== isSearchingHistory ||
    $[111] !== Pi ||
    $[112] !== $l ||
    $[113] !== xl ||
    $[114] !== Am ||
    $[115] !== spellcheckHighlights ||
    $[116] !== qa ||
    $[117] !== _c ||
    $[118] !== interimRange ||
    $[119] !== pl ||
    $[120] !== Ka
  ) {
    let tc = [];
    if (isSearchingHistory && historyMatch && !historyFailedMatch)
      tc.push({
        start: cursorOffset,
        end: cursorOffset + historyQuery.length,
        color: "warning",
        priority: 20,
      });
    for (const ref of qu)
      tc.push({
        start: ref.start,
        end: ref.end,
        color: "warning",
        priority: 15,
      });
    for (const trigger of Am)
      tc.push({
        start: trigger.start,
        end: trigger.end,
        color: "suggestion",
        priority: 5,
      });
    for (const trigger of xl)
      tc.push({
        start: trigger.start,
        end: trigger.end,
        color: "suggestion",
        priority: 5,
      });
    for (const trigger of Pi)
      tc.push({
        start: trigger.start,
        end: trigger.end,
        color: trigger.themeColor,
        priority: 5,
      });
    if (interimRange)
      tc.push({
        start: interimRange.start,
        end: interimRange.end,
        color: undefined,
        dimColor: true,
        priority: 1,
      });
    for (const trigger of qa) {
      for (let start = trigger.start; start < trigger.end; start++)
        tc.push({
          start,
          end: start + 1,
          color: getRainbowColor(start - trigger.start),
          shimmerColor: getRainbowColor(start - trigger.start, true),
          priority: 10,
        });
    }
    tc.push(...$l);
    if (isUltraplanEnabled()) {
      for (const trigger of _c) {
        for (let start = trigger.start; start < trigger.end; start++)
          tc.push({
            start,
            end: start + 1,
            color: getRainbowColor(start - trigger.start),
            shimmerColor: getRainbowColor(start - trigger.start, true),
            priority: 10,
          });
      }
    }
    if (isWorkflowsAvailable() && !pl) {
      for (const trigger of Ka) {
        for (let start = trigger.start; start < trigger.end; start++)
          tc.push({
            start,
            end: start + 1,
            color: "autoAccept",
            priority: 10,
          });
      }
    }
    Yc = mergeNonOverlappingRanges(tc, spellcheckHighlights);
    $[105] = qu;
    $[106] = cursorOffset;
    $[107] = historyFailedMatch;
    $[108] = historyMatch;
    $[109] = historyQuery;
    $[110] = isSearchingHistory;
    $[111] = Pi;
    $[112] = $l;
    $[113] = xl;
    $[114] = Am;
    $[115] = spellcheckHighlights;
    $[116] = qa;
    $[117] = _c;
    $[118] = interimRange;
    $[119] = pl;
    $[120] = Ka;
    $[121] = Yc;
  } else Yc = $[121];
  let spans = Yc;
  let ba = !footerItemSelected && !isSearchingHistory;
  let Mi = decorations.length > 0 && !isSearchingHistory && displayedValue === value;
  let Ti;
  if ($[122] !== decorations || $[123] !== value || $[124] !== Mi || $[125] !== plain) {
    let Qa = Mi && value !== "" && !plain ? emptySpans(decorations) : PP;
    Ti = Qa.length > 0 && !isNfcStable(value, buildVirtualTextLayout(value, Qa)) ? PP : Qa;
    $[122] = decorations;
    $[123] = value;
    $[124] = Mi;
    $[125] = plain;
    $[126] = Ti;
  } else Ti = $[126];
  let Gp = Ti;
  let yl = isVimEditorMode && vimMode !== "INSERT" ? "after" : "before";
  let Dc;
  if ($[127] !== yl || $[128] !== cursorOffset || $[129] !== Gp) {
    Dc = yl === "before" && Gp.some((Bh) => Bh.start === cursorOffset);
    $[127] = yl;
    $[128] = cursorOffset;
    $[129] = Gp;
    $[130] = Dc;
  } else Dc = $[130];
  let Hh = Dc;
  let ES;
  if (
    $[131] !== spans ||
    $[132] !== cursorOffset ||
    $[133] !== decorations ||
    $[134] !== value ||
    $[135] !== Hh ||
    $[136] !== Mi ||
    $[137] !== ba
  ) {
    ES = !Mi
      ? spans
      : overlayDecorations(
          spans,
          decorations,
          ba && !Hh
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
    $[135] = Hh;
    $[136] = Mi;
    $[137] = ba;
    $[138] = ES;
  } else ES = $[138];
  let highlights = ES;
  let dm;
  let Uc;
  if ($[139] !== addNotification || $[140] !== removeNotification || $[141] !== qa.length) {
    dm = () => {
      if (qa.length)
        addNotification({
          key: "ultrathink-active",
          kind: "feedback",
          text: "Deeper reasoning requested for this turn",
          priority: "immediate",
          timeoutMs: 5000,
        });
      else removeNotification("ultrathink-active");
    };
    Uc = [addNotification, removeNotification, qa.length];
    $[139] = addNotification;
    $[140] = removeNotification;
    $[141] = qa.length;
    $[142] = dm;
    $[143] = Uc;
  } else {
    dm = $[142];
    Uc = $[143];
  }
  P(dm, Uc);
  let uy;
  let Wh;
  if ($[144] !== addNotification || $[145] !== removeNotification || $[146] !== _c.length) {
    uy = () => {
      if (isUltraplanEnabled() && _c.length)
        addNotification({
          key: "ultraplan-active",
          kind: "feedback",
          text: "This prompt will launch an ultraplan cloud session",
          priority: "immediate",
          timeoutMs: 5000,
        });
      else removeNotification("ultraplan-active");
    };
    Wh = [addNotification, removeNotification, _c.length];
    $[144] = addNotification;
    $[145] = removeNotification;
    $[146] = _c.length;
    $[147] = uy;
    $[148] = Wh;
  } else {
    uy = $[147];
    Wh = $[148];
  }
  P(uy, Wh);
  let my;
  let jh;
  if ($[149] !== addNotification || $[150] !== Vd.length) {
    my = () => {
      if (isUltrareviewWithBridge() && Vd.length)
        addNotification({
          key: "ultrareview-active",
          kind: "contextual",
          text: "Run /code-review ultra after Claude finishes to review these changes in the cloud",
          priority: "immediate",
          timeoutMs: 5000,
        });
    };
    jh = [addNotification, Vd.length];
    $[149] = addNotification;
    $[150] = Vd.length;
    $[151] = my;
    $[152] = jh;
  } else {
    my = $[151];
    jh = $[152];
  }
  P(my, jh);
  let Jb;
  let Im;
  if (
    $[153] !== addNotification ||
    $[154] !== removeNotification ||
    $[155] !== pl ||
    $[156] !== workflowKeywordToggleShortcut ||
    $[157] !== Ka.length
  ) {
    Jb = () => {
      if (isWorkflowsAvailable() && Ka.length && !pl)
        addNotification({
          key: "workflow-keyword-active",
          text: `Dynamic workflow requested for this turn${workflowKeywordToggleShortcut ? ` \xB7 ${workflowKeywordToggleShortcut} to ignore` : ""}`,
          priority: "immediate",
          timeoutMs: 30000,
        });
      else removeNotification("workflow-keyword-active");
    };
    Im = [addNotification, removeNotification, Ka.length, pl, workflowKeywordToggleShortcut];
    $[153] = addNotification;
    $[154] = removeNotification;
    $[155] = pl;
    $[156] = workflowKeywordToggleShortcut;
    $[157] = Ka.length;
    $[158] = Jb;
    $[159] = Im;
  } else {
    Jb = $[158];
    Im = $[159];
  }
  P(Jb, Im);
  let Hg;
  if (
    $[160] !== addNotification ||
    $[161] !== draft.value ||
    $[162] !== gd ||
    $[163] !== removeNotification ||
    $[164] !== Gl ||
    $[165] !== workflowKeywordToggleShortcut
  ) {
    Hg = () => {
      if (ULTRACODE_KEYWORD(draft.value).length === 0) {
        return;
      }
      let Zb = !gd();
      Gl(Zb);
      if (Zb) {
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
    $[162] = gd;
    $[163] = removeNotification;
    $[164] = Gl;
    $[165] = workflowKeywordToggleShortcut;
    $[166] = Hg;
  } else Hg = $[166];
  let Dd = Hg;
  let prevInputLengthRef = R(value.length);
  let peakInputLengthRef = R(value.length);
  let Zd;
  if ($[167] !== removeNotification) {
    Zd = () => {
      removeNotification("stash-hint");
    };
    $[167] = removeNotification;
    $[168] = Zd;
  } else Zd = $[168];
  let ig = Zd;
  let fy;
  let Fx;
  if ($[169] !== addNotification || $[170] !== value.length) {
    fy = () => {
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
    Fx = [value.length, addNotification];
    $[169] = addNotification;
    $[170] = value.length;
    $[171] = fy;
    $[172] = Fx;
  } else {
    fy = $[171];
    Fx = $[172];
  }
  P(fy, Fx);
  let vl;
  if ($[173] === MEMO_CACHE_SENTINEL) {
    vl = {
      maxBufferSize: 50,
      debounceMs: 1000,
    };
    $[173] = vl;
  } else vl = $[173];
  let { pushToBuffer, undo, canUndo, clearBuffer } = useInputBuffer(vl);
  let defaultPlaceholder = R(mode);
  let zp;
  if (
    $[174] !== clearBuffer ||
    $[175] !== draft.mode ||
    $[176] !== draft.value ||
    $[177] !== pushToBuffer ||
    $[178] !== isVimEditorMode ||
    $[179] !== vimMode
  ) {
    zp = (qh, Pc, Aa, rl) => {
      if (draft.mode !== defaultPlaceholder.current) {
        clearBuffer();
        if (qh !== draft.value) {
          return;
        }
        defaultPlaceholder.current = draft.mode;
      }
      let immediate =
        !rl?.continuesGesture && isVimEditorMode && (vimMode !== "INSERT" || !promptSuggestionState.current);
      pushToBuffer(qh, Pc, Aa, {
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
    $[180] = zp;
  } else zp = $[180];
  let _a = zp;
  let Jl;
  if ($[181] !== sessionUiStore || $[182] !== isVimEditorMode) {
    Jl = (value) =>
      isVimEditorMode && sessionUiStore.getState().vimMode === "NORMAL"
        ? setCwdState(value, value.length)
        : value.length;
    $[181] = sessionUiStore;
    $[182] = isVimEditorMode;
    $[183] = Jl;
  } else Jl = $[183];
  let ew = Jl;
  useMaybeTruncateInput(draft, ew);
  let Wg;
  if (
    $[184] !== cursorOffset ||
    $[185] !== ig ||
    $[186] !== draft ||
    $[187] !== value ||
    $[188] !== setMode ||
    $[189] !== pastedContents ||
    $[190] !== _a ||
    $[191] !== session ||
    $[192] !== setAppState ||
    $[193] !== setCursorOffset ||
    $[194] !== setHelpOpen ||
    $[195] !== setValue
  ) {
    Wg = (value_2, fc) => {
      let interpretLeadingModeCharacter = fc?.interpretLeadingModeCharacter ?? true;
      setHelpOpen(false);
      ig();
      session.promptSuggestion.reset();
      setAppState(clearFooterSelectionState);
      let gy = fc?.previous?.value ?? value;
      let isSingleCharInsertion = value_2.length === gy.length + 1;
      let Ux = (fc?.previous?.cursorOffset ?? cursorOffset) === 0;
      let mode = getModeFromInput_2(value_2);
      if (interpretLeadingModeCharacter && Ux && mode !== "prompt") {
        if (isSingleCharInsertion) {
          if (mode !== draft.mode) {
            setMode(mode);
            return;
          }
        } else if (gy.length === 0 && mode !== draft.mode) {
          setMode(mode);
          let valueWithoutMode = stripModePrefix(value_2).replaceAll("\t", "    ");
          _a(value, cursorOffset, pastedContents);
          setValue(valueWithoutMode);
          setCursorOffset(valueWithoutMode.length);
          return;
        }
      }
      let processedValue = value_2.replaceAll("\t", "    ");
      if (value !== processedValue) _a(value, cursorOffset, pastedContents);
      if (fc?.keystroke === true && processedValue === value_2) draft.setValueTyped(processedValue);
      else setValue(processedValue);
    };
    $[184] = cursorOffset;
    $[185] = ig;
    $[186] = draft;
    $[187] = value;
    $[188] = setMode;
    $[189] = pastedContents;
    $[190] = _a;
    $[191] = session;
    $[192] = setAppState;
    $[193] = setCursorOffset;
    $[194] = setHelpOpen;
    $[195] = setValue;
    $[196] = Wg;
  } else Wg = $[196];
  let pu = Wg;
  let noopInputUpdateRef = R(noopInputUpdate);
  let $x;
  if ($[197] !== pu) {
    $x = (C0, Yp) =>
      pu(C0, {
        ...Yp,
        keystroke: true,
      });
    $[197] = pu;
    $[198] = $x;
  } else $x = $[198];
  let onChange = $x;
  let RE;
  if ($[199] !== draft) {
    RE = (prev) => draft.attribute(cXe, prev);
    $[199] = draft;
    $[200] = RE;
  } else RE = $[200];
  let $g = RE;
  let OS;
  if ($[201] !== draft.value || $[202] !== pu || $[203] !== setCursorOffset) {
    OS = () => {
      noopInputUpdateRef.current = (xE) => {
        if (xE.text !== draft.value) pu(xE.text);
        setCursorOffset(xE.cursor);
      };
    };
    $[201] = draft.value;
    $[202] = pu;
    $[203] = setCursorOffset;
    $[204] = OS;
  } else OS = $[204];
  zt(OS);
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
  if ($[208] !== $g) {
    commit = (PE) => $g(() => noopInputUpdateRef.current(PE));
    $[208] = $g;
    $[209] = commit;
  } else commit = $[209];
  let carry;
  let carryLayers;
  let paint;
  if ($[210] !== draft) {
    carry = (Md) => draft.carryPaint(Md.before, Md.after);
    carryLayers = (updater) => draft.carryLayers(updater.before, updater.after);
    paint = (If, fu) => draft.paint(normalizeInputDecorations(If, fu));
    $[210] = draft;
    $[211] = carry;
    $[212] = carryLayers;
    $[213] = paint;
  } else {
    carry = $[211];
    carryLayers = $[212];
    paint = $[213];
  }
  let w_;
  if (
    $[214] !== read ||
    $[215] !== commit ||
    $[216] !== carry ||
    $[217] !== carryLayers ||
    $[218] !== paint
  ) {
    w_ = {
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
    $[219] = w_;
  } else w_ = $[219];
  let Vg = relayPromptEdits(w_);
  let k_;
  if ($[220] !== $g || $[221] !== draft.cursorOffset || $[222] !== draft.value || $[223] !== Vg) {
    k_ = (prev) => {
      let before = {
        text: draft.value,
        cursor: draft.cursorOffset,
      };
      $g(prev);
      if (Vg.isRecording())
        Vg.record({
          before,
          after: {
            text: draft.value,
            cursor: draft.cursorOffset,
          },
        });
    };
    $[220] = $g;
    $[221] = draft.cursorOffset;
    $[222] = draft.value;
    $[223] = Vg;
    $[224] = k_;
  } else k_ = $[224];
  let Kk = k_;
  let C_;
  if (
    $[225] !== draft ||
    $[226] !== pu ||
    $[227] !== setMode ||
    $[228] !== sessionUiStore ||
    $[229] !== setCursorOffset ||
    $[230] !== setPastedContents ||
    $[231] !== isVimEditorMode
  ) {
    C_ = (Jp, T_, sw, hy) => {
      draft.attribute(IT, () =>
        pu(Jp, {
          interpretLeadingModeCharacter: false,
        }),
      );
      setMode(T_);
      setPastedContents(sw);
      let FS = draft.value;
      if (!isVimEditorMode || sessionUiStore.getState().vimMode !== "NORMAL" || FS !== FS.normalize("NFC")) {
        setCursorOffset(hy);
        return;
      }
      let onSubmit = clampCursorOffset(FS, hy);
      let hasImages = parsePastedRefs(FS).some(
        (WS) => onSubmit >= WS.index && onSubmit < WS.index + WS.match.length,
      );
      setCursorOffset(hasImages ? hy : onSubmit);
    };
    $[225] = draft;
    $[226] = pu;
    $[227] = setMode;
    $[228] = sessionUiStore;
    $[229] = setCursorOffset;
    $[230] = setPastedContents;
    $[231] = isVimEditorMode;
    $[232] = C_;
  } else C_ = $[232];
  let {
    resetHistory,
    onHistoryUp,
    onHistoryDown,
    dismissSearchHint,
    historyIndex,
    historyTotal,
    historyEdited,
  } = useArrowKeyHistory(draft, C_, _s);
  let R0;
  if ($[233] !== resetHistory) {
    R0 = () => {
      resetHistory();
    };
    $[233] = resetHistory;
    $[234] = R0;
  } else R0 = $[234];
  let P_;
  if ($[235] !== resetHistory || $[236] !== viewingAgentTaskId) {
    P_ = [viewingAgentTaskId, resetHistory];
    $[235] = resetHistory;
    $[236] = viewingAgentTaskId;
    $[237] = P_;
  } else P_ = $[237];
  P(R0, P_);
  let UK;
  let EE;
  if ($[238] !== dismissSearchHint || $[239] !== isSearchingHistory) {
    UK = () => {
      if (isSearchingHistory) dismissSearchHint();
    };
    EE = [isSearchingHistory, dismissSearchHint];
    $[238] = dismissSearchHint;
    $[239] = isSearchingHistory;
    $[240] = UK;
    $[241] = EE;
  } else {
    UK = $[240];
    EE = $[241];
  }
  P(UK, EE);
  let A_;
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
    A_ = () => {
      let Zp = messageQueue.popAllEditable(draft.value, draft.cursorOffset, draft.pastedContents);
      if (!Zp) {
        return false;
      }
      setValue(Zp.text);
      if (Zp.unpassed) draft.markCameBack();
      setMode(Zp.mode);
      setCursorOffset(
        isVimEditorMode && sessionUiStore.getState().vimMode === "NORMAL"
          ? setCwdState(draft.value, Zp.cursorOffset)
          : Zp.cursorOffset,
      );
      chrome.returnIdeSelection(Zp.ideSelection);
      if (Zp.images.length > 0) setPastedContents((WK) => mergeTurnTags(WK, Zp.images));
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
    $[251] = A_;
  } else A_ = $[251];
  let M_ = A_;
  const suppressSuggestions = isSearchingHistory || (historyIndex > 0 && !historyEdited) || storeSelector;
  let OE;
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
    OE = {
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
    $[260] = OE;
  } else OE = $[260];
  let {
    suggestions,
    commandArgumentHint,
    inlineGhostText,
    handleKeyDown,
    selectSuggestion,
    setHoveredSuggestion,
    cursorRowId,
  } = useTypeahead(OE);
  let zx;
  if ($[261] !== draft.value || $[262] !== value || $[263] !== messageQueue) {
    zx = function Kg() {
      return messageQueue.getCommandQueue().some(isRefillableInput) && draft.value === value;
    };
    $[261] = draft.value;
    $[262] = value;
    $[263] = messageQueue;
    $[264] = zx;
  } else zx = $[264];
  let Kg = zx;
  let A0;
  if (
    $[265] !== ew ||
    $[266] !== draft ||
    $[267] !== Kg ||
    $[268] !== onHistoryUp ||
    $[269] !== M_ ||
    $[270] !== messageQueue ||
    $[271] !== commandQueue ||
    $[272] !== setCursorOffset ||
    $[273] !== setQueueEditIndex ||
    $[274] !== store ||
    $[275] !== suggestions
  ) {
    A0 = function GS() {
      if (suggestions.length > 1) {
        return;
      }
      let index = draft.value.indexOf(`
`);
      if (index !== -1 && draft.cursorOffset > index) {
        return;
      }
      if (draft.restoreCleared()) {
        setCursorOffset(ew(draft.value));
        return;
      }
      if (isKbCohesionFixesOn()) {
        let queueEditIndex = store.getState().queueEditIndex;
        let E0 = count(messageQueue.getCommandQueueSnapshot(), isRefillableInput);
        if (queueEditIndex === null && E0 > 0) {
          setQueueEditIndex(E0 - 1);
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
        commandQueue.some(isRefillableInput) ||
        messageQueue.getCommandQueueSnapshot().some(isRefillableInput)
      ) {
        if (M_() || !Kg()) {
          return;
        }
      }
      onHistoryUp();
    };
    $[265] = ew;
    $[266] = draft;
    $[267] = Kg;
    $[268] = onHistoryUp;
    $[269] = M_;
    $[270] = messageQueue;
    $[271] = commandQueue;
    $[272] = setCursorOffset;
    $[273] = setQueueEditIndex;
    $[274] = store;
    $[275] = suggestions;
    $[276] = A0;
  } else A0 = $[276];
  let onHistoryUp_2 = A0;
  let I_;
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
    I_ = function Tc() {
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
          let qK = count(messageQueue.getCommandQueueSnapshot(), isRefillableInput);
          if (queueEditIndex < qK - 1) setQueueEditIndex(queueEditIndex + 1);
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
    $[285] = I_;
  } else I_ = $[285];
  let onHistoryDown_2 = I_;
  let [, $K] = Uy(incrementOffset, 0);
  let VK;
  if (
    $[286] !== chordGestureSpent ||
    $[287] !== clock ||
    $[288] !== draft.typedOnly ||
    $[289] !== draft.value ||
    $[290] !== onSubmit
  ) {
    VK = (D0) => {
      if (chordGestureSpent(D0)) {
        return;
      }
      onSubmit(
        D0 === "" ? "" : draft.value,
        false,
        undefined,
        false,
        draft.typedOnly ? createFrozenEmpty() : undefined,
      );
      clock.setTimeout($K, 0);
    };
    $[286] = chordGestureSpent;
    $[287] = clock;
    $[288] = draft.typedOnly;
    $[289] = draft.value;
    $[290] = onSubmit;
    $[291] = VK;
  } else VK = $[291];
  let onSubmit_2 = VK;
  let onKeyDownBefore = function Qm(prev) {
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
      !gd() &&
      Ka.some((prev) => prev.end === cursorOffset)
    ) {
      prev.preventDefault();
      Dd();
      return;
    }
    if (getPlatform() === "macos" && isMacOptionSpecialChar(prev.key)) {
      let Df = MACOS_OPTION_SPECIAL_CHARS[prev.key];
      let nativeCSIuTerminalDisplayName = getNativeCSIuTerminalDisplayName();
      let segments = nativeCSIuTerminalDisplayName
        ? [
            {
              text: `To enable ${Df}, set `,
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
              text: `To enable ${Df}, run /terminal-setup`,
              dim: true,
            },
          ];
      addNotification({
        key: "option-meta-hint",
        kind: "contextual",
        segments,
        row1Hint: nativeCSIuTerminalDisplayName
          ? `set Option as Meta to use ${Df}`
          : `/terminal-setup to use ${Df}`,
        priority: "immediate",
        timeoutMs: 5000,
      });
    }
    if (prev.ctrl && prev.key === "c" && (historyIndex === 0 || historyEdited))
      draft.holdCleared({
        intoHistory: _s === undefined,
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
          (commandQueue.some(isRefillableInput) ||
            messageQueue.getCommandQueueSnapshot().some(isRefillableInput)) &&
          (M_() || !Kg())
        ) {
          return;
        }
      }
      if (transcript.getSnapshot().length > 0 && !value && !turn.getSnapshot().isLoading) isInputWrapped();
    }
    if (prev.name === "return" && helpOpen) setHelpOpen(false);
  };
  let j0;
  let uw;
  if ($[292] !== draft) {
    j0 = () => {
      let lne = draft.value;
      let Xx;
      let KK = false;
      let weakMap = new WeakMap();
      let HE = (D_, dne) => {
        let Jk = weakMap.get(D_);
        if (Jk === undefined) {
          Jk = uniq(dne().map(normalizeNfd));
          weakMap.set(D_, Jk);
        }
        return Jk;
      };
      return draft.subscribe(() => {
        let { value: UE, pastedContents } = draft;
        if (UE === lne) {
          return;
        }
        lne = UE;
        if (pastedContents !== Xx) {
          Xx = pastedContents;
          KK = Object.values(pastedContents).some(isSyntheticContent);
        }
        if (!KK) {
          return;
        }
        let pastedRefs = parsePastedRefs(UE);
        let referencedIds = new Set(pastedRefs.map(pasteIdOf));
        draft.setPastedContents((QS) => {
          let values = Object.values(QS);
          let orphaned = Object.entries(QS).filter(isOrphanedTextPaste);
          let lazySpaceInputFilter = expandTruncatedPastes(UE, QS);
          let mapped = orphaned.map(secondEntryValue);
          let jc = new Set(pastedRefs.flatMap(truncatedTextPasteIds));
          let onIdeAtMentioned = (atMentioned) => HE(atMentioned, () => [atMentioned.content])[0] ?? "";
          let O_;
          let VE = (prev) => {
            let content = prev.content;
            if (lazySpaceInputFilter.includes(content)) {
              return true;
            }
            let N_ = nfcVariants(content);
            if (N_.some((prev) => prev !== content && lazySpaceInputFilter.includes(prev))) {
              return true;
            }
            if (O_ === undefined)
              O_ = expandTruncatedPastes(
                UE.normalize("NFD"),
                Object.fromEntries(
                  orphaned
                    .filter((prev) => {
                      let [QK] = prev;
                      return jc.has(QK);
                    })
                    .map((prev) => {
                      let [zK, atMentioned] = prev;
                      return [
                        zK,
                        {
                          ...atMentioned,
                          content: onIdeAtMentioned(atMentioned),
                        },
                      ];
                    }),
                ),
              );
            let iP = O_;
            let nextMode = HE(prev, () => N_);
            if (
              nextMode.some((prev) => iP.includes(prev)) ||
              nextMode.some((current) => endsWithCombiningMatch(iP, current)) ||
              N_.some((prev) => mapped.some((prev_2) => prev_2.content.includes(prev)))
            ) {
              return true;
            }
            return nextMode.some((prev) =>
              mapped.some((imageData) => onIdeAtMentioned(imageData).includes(prev)),
            );
          };
          let filtered = values.filter((prev) =>
            prev.inline ? !VE(prev) : isSyntheticContent(prev) && !referencedIds.has(prev.id),
          );
          if (filtered.length === 0) {
            return QS;
          }
          let cne = {
            ...QS,
          };
          for (const une of filtered) delete cne[une.id];
          return cne;
        });
      });
    };
    uw = [draft];
    $[292] = draft;
    $[293] = j0;
    $[294] = uw;
  } else {
    j0 = $[293];
    uw = $[294];
  }
  P(j0, uw);
  let tP;
  if (
    $[295] !== Vl ||
    $[296] !== draft ||
    $[297] !== _a ||
    $[298] !== setCursorOffset ||
    $[299] !== setValue ||
    $[300] !== setPastedContents
  ) {
    tP = function ev(prev) {
      let { value: J0, cursorOffset, pastedContents } = draft;
      let bw = expandLastPaste(J0, pastedContents);
      if (bw?.id !== prev) {
        return false;
      }
      _a(J0, cursorOffset, pastedContents);
      let content = pastedContents[bw.id]?.content ?? "";
      let YK = bw.cursorOffset - content.length;
      let { written, end } = composeNormalized(
        bw.expanded.slice(0, YK).normalize("NFC"),
        content,
        bw.expanded.slice(bw.cursorOffset),
      );
      setValue(written);
      setCursorOffset(end);
      setPastedContents((prev) => {
        let Zk = {
          ...prev,
        };
        let Z0 = Zk[bw.id];
        delete Zk[bw.id];
        return Z0 ? addInlineTextContentsWithFallback(Zk, Z0.content, isVirtualPancakeEnabled()) : Zk;
      });
      Vl();
      return true;
    };
    $[295] = Vl;
    $[296] = draft;
    $[297] = _a;
    $[298] = setCursorOffset;
    $[299] = setValue;
    $[300] = setPastedContents;
    $[301] = tP;
  } else tP = $[301];
  let ev = tP;
  let onPaste = function eB(prev) {
    setAppState(clearFooterSelectionState);
    let eNe = thinkingEnabled.current === "link" ? " " : "";
    thinkingEnabled.current = false;
    let { value: tNe, pastedContents } = draft;
    let cwd = stripAnsi(prev)
      .replace(
        /\r\n|\r/g,
        `
`,
      )
      .replaceAll("\t", "    ");
    if (tNe.length === 0) {
      let modeFromInput = getModeFromInput_2(cwd);
      if (modeFromInput !== "prompt") {
        setMode(modeFromInput);
        cwd = stripModePrefix(cwd);
      }
    }
    let trimmed = cwd.trim();
    let JE = isSetupGuideLink(trimmed);
    if (JE) cwd = trimmed;
    let ZE = mainLoopModelForSession.current;
    if (ZE !== null && pastedContents[ZE]?.type === "text" && pastedContents[ZE].content === cwd && ev(ZE)) {
      return;
    }
    let pastedTextRefNumLines = getPastedTextRefNumLines(cwd);
    let max = Math.max(0, Math.min(rows - 10, 2));
    if (cwd.length > PASTE_THRESHOLD || pastedTextRefNumLines > max || JE) {
      if (!JE) logFeatureOk("input_paste_large");
      let tD = mintPasteId(tNe, pastedContents);
      mainLoopModelForSession.current = tD;
      let oNe = {
        id: tD,
        type: "text",
        content: cwd,
      };
      setPastedContents((prev) => ({
        ...prev,
        [tD]: oNe,
      }));
      Pp(
        eNe +
          formatPastedTextRef(
            tD,
            pastedTextRefNumLines,
            JE || isSetupGuidePaste(cwd) ? TEAM_SETUP_GUIDE_LABEL : undefined,
          ),
      );
      if (JE) thinkingEnabled.current = "link";
      if (cwd.length <= MAX_HISTORY_ENTRIES) {
        onExpandPasteHintChange(true);
        isFastMode.current?.();
        isFastMode.current = clock.setTimeout(() => {
          onExpandPasteHintChange(false);
          isFastMode.current = null;
        }, 8000);
      }
    } else {
      let yne =
        isVirtualPancakeEnabled() &&
        (mentionsUltraplan(cwd) || getPastedTextRefNumLines(stripInvisibleChars_2(cwd).text) > max);
      if (yne || hasTextAfterNfcNormalize(cwd))
        setPastedContents((MAt) => addInlineTextContentsWithFallback(MAt, cwd, yne));
      Pp(eNe + cwd, {
        isTyped: true,
      });
    }
  };
  let hw;
  if ($[302] === MEMO_CACHE_SENTINEL) {
    hw = (input, key) => {
      if (!thinkingEnabled.current) {
        return input;
      }
      thinkingEnabled.current = false;
      if (isYankKey(input, key) && !startsWithPunctuation(input)) {
        return " " + input;
      }
      return input;
    };
    $[302] = hw;
  } else hw = $[302];
  let iNe = hw;
  let tG = R(null);
  let oB = R(null);
  let Sne;
  if ($[303] !== draft.value || $[304] !== toggleHelp || $[305] !== isVimEditorMode || $[306] !== vimMode) {
    Sne = (nG, bne) => {
      let rG = !bne.ctrl && !bne.meta && draft.value === "" && (!isVimEditorMode || vimMode === "INSERT");
      if (nG === "?" && rG) {
        toggleHelp();
        thinkingEnabled.current = false;
        return "";
      }
      return iNe(nG, bne);
    };
    $[303] = draft.value;
    $[304] = toggleHelp;
    $[305] = isVimEditorMode;
    $[306] = vimMode;
    $[307] = Sne;
  } else Sne = $[307];
  let inputFilter = Sne;
  let sG;
  if (
    $[308] !== columns ||
    $[309] !== draft.cursorOffset ||
    $[310] !== draft.value ||
    $[311] !== sessionUiStore
  ) {
    sG = () => {
      let cursorOffset = draft.cursorOffset;
      if (
        !EDITOR_MODES() ||
        sessionUiStore.getState().vimMode !== "NORMAL" ||
        draft.value !== draft.value.normalize("NFC")
      ) {
        return cursorOffset;
      }
      let iG = Cursor.fromText(draft.value, columns, cursorOffset);
      let offset = iG.endOfLogicalLine().offset;
      return cursorOffset !== iG.startOfLogicalLine().offset &&
        cursorOffset < offset &&
        iG.right().offset === offset
        ? offset
        : cursorOffset;
    };
    $[308] = columns;
    $[309] = draft.cursorOffset;
    $[310] = draft.value;
    $[311] = sessionUiStore;
    $[312] = sG;
  } else sG = $[312];
  let dG = sG;
  let Pp = (cG, sB) => {
    tG.current?.();
    _a(draft.value, draft.cursorOffset, draft.pastedContents, sB);
    let terminalName = dG();
    let vne = terminalName !== draft.cursorOffset;
    if (vne) draft.setCursorOffset(terminalName);
    let uNe = () => {
      draft.insertText(cG);
      if (
        vne &&
        draft.value[draft.cursorOffset - 1] !==
          `
`
      ) {
        let dNe = Cursor.fromText(draft.value, columns, draft.cursorOffset);
        draft.setCursorOffset(clampOffsetOutsidePlaceholder(dNe, draft.cursorOffset));
      }
    };
    if (sB?.isTyped === true) Kk(uNe);
    else uNe();
  };
  let iB;
  if (
    $[313] !== draft.pastedContents ||
    $[314] !== draft.value ||
    $[315] !== Pp ||
    $[316] !== setMode ||
    $[317] !== setAppState ||
    $[318] !== setPastedContents
  ) {
    iB = (image, _ne) => {
      let { mediaType, filename, dimensions, sourcePath, continuesGesture } = _ne ?? {};
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
      let uB = setSliceField(setAppState, "storedImagePaths");
      recordImagePath(newContent, uB);
      storeImageAndRecord(newContent, uB);
      setPastedContents((prev) => ({
        ...prev,
        [pasteId]: newContent,
      }));
      let prefix = thinkingEnabled.current ? " " : "";
      Pp(prefix + formatImageRef(pasteId), {
        continuesGesture,
      });
      thinkingEnabled.current = true;
    };
    $[313] = draft.pastedContents;
    $[314] = draft.value;
    $[315] = Pp;
    $[316] = setMode;
    $[317] = setAppState;
    $[318] = setPastedContents;
    $[319] = iB;
  } else iB = $[319];
  let pP = iB;
  let isInputWrapped = useDoublePress(noopMessageSelector, chrome.openMessageSelector);
  let xne;
  if ($[320] !== draft.value || $[321] !== Pp || $[322] !== dG) {
    xne = (prev) => {
      logEvent("tengu_ext_at_mentioned", {});
      Pp(formatAtMention(prev, draft.value[dG() - 1]));
    };
    $[320] = draft.value;
    $[321] = Pp;
    $[322] = dG;
    $[323] = xne;
  } else xne = $[323];
  useIdeAtMentioned(mergedClients, xne);
  let Ane;
  if (
    $[324] !== canUndo ||
    $[325] !== draft ||
    $[326] !== setCursorOffset ||
    $[327] !== setValue ||
    $[328] !== setPastedContents ||
    $[329] !== undo
  ) {
    Ane = () => {
      if (draft.mode !== defaultPlaceholder.current) {
        return;
      }
      if (canUndo) {
        let mB = undo();
        if (mB)
          draft.attribute(Dye, () => {
            setValue(mB.text);
            setCursorOffset(mB.cursorOffset);
            setPastedContents(mB.pastedContents);
          });
      }
    };
    $[324] = canUndo;
    $[325] = draft;
    $[326] = setCursorOffset;
    $[327] = setValue;
    $[328] = setPastedContents;
    $[329] = undo;
    $[330] = Ane;
  } else Ane = $[330];
  let gG = Ane;
  let yG = R(null);
  let Mne;
  if (
    $[331] !== draft ||
    $[332] !== sessionUiStore ||
    $[333] !== _a ||
    $[334] !== Kk ||
    $[335] !== setCursorOffset
  ) {
    Mne = () => {
      let { value: SG, cursorOffset, pastedContents } = draft;
      _a(SG, cursorOffset, pastedContents);
      let F_ = () => {
        draft.setValueTyped(
          SG.slice(0, cursorOffset) +
            `
` +
            SG.slice(cursorOffset),
        );
        setCursorOffset(cursorOffset + 1);
      };
      if (EDITOR_MODES() && sessionUiStore.getState().vimMode !== "INSERT") F_();
      else Kk(F_);
      yG.current?.(`
`);
    };
    $[331] = draft;
    $[332] = sessionUiStore;
    $[333] = _a;
    $[334] = Kk;
    $[335] = setCursorOffset;
    $[336] = Mne;
  } else Mne = $[336];
  let bG = Mne;
  let rD;
  if (
    $[337] !== addNotification ||
    $[338] !== draft.cursorOffset ||
    $[339] !== draft.pastedContents ||
    $[340] !== draft.value ||
    $[341] !== onExternalEditorActiveChange ||
    $[342] !== sessionUiStore ||
    $[343] !== _a ||
    $[344] !== setCursorOffset ||
    $[345] !== setValue ||
    $[346] !== transcript
  ) {
    rD = async () => {
      logEvent("tengu_external_editor_used", {});
      onExternalEditorActiveChange(true);
      let wG = draft.value;
      let ZS;
      try {
        let kNe;
        if (getGlobalConfig().externalEditorContext) {
          let joined = collectTrailingAssistantTexts(transcript.getSnapshot()).messages.join(`

`);
          if (joined) kNe = joined;
        }
        ZS = await editPromptInEditor(wG, draft.pastedContents, kNe, draft.cursorOffset);
      } catch (error) {
        let kG = error;
        if (kG instanceof Error) logError(kG);
        addNotification({
          key: "external-editor-error",
          kind: "warning",
          text: `External editor failed: ${errorMessage(kG)}`,
          color: "warning",
          priority: "high",
        });
        logFeatureBad("input_external_editor", "spawn_failed");
        onExternalEditorActiveChange(false);
        return;
      }
      onExternalEditorActiveChange(false);
      if (ZS.error) {
        addNotification({
          key: "external-editor-error",
          kind: "warning",
          text: ZS.error,
          color: "warning",
          priority: "high",
        });
        logFeatureSad("input_external_editor", "editor_error");
      } else logFeatureOk("input_external_editor");
      if (ZS.content !== null && ZS.content !== wG) {
        _a(wG, draft.cursorOffset, draft.pastedContents);
        setValue(ZS.content);
        setCursorOffset(
          EDITOR_MODES() && sessionUiStore.getState().vimMode === "NORMAL"
            ? setCwdState(ZS.content.normalize("NFC"), ZS.content.length)
            : ZS.content.length,
        );
      }
    };
    $[337] = addNotification;
    $[338] = draft.cursorOffset;
    $[339] = draft.pastedContents;
    $[340] = draft.value;
    $[341] = onExternalEditorActiveChange;
    $[342] = sessionUiStore;
    $[343] = _a;
    $[344] = setCursorOffset;
    $[345] = setValue;
    $[346] = transcript;
    $[347] = rD;
  } else rD = $[347];
  let rv = rD;
  let iD = () => {
    if (draft.value.trim() === "" && draft.stashedPrompt !== undefined) {
      draft.popStash("input");
      clearBuffer();
      removeNotification("stash-saved");
      logFeatureOk("input_stash");
    } else if (draft.value.trim() !== "") {
      draft.stash();
      clearBuffer();
      if (sv) {
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
  let wB;
  if ($[348] !== dispatchPasteEvent || $[349] !== inputTakesFocus || $[350] !== takePendingPastes) {
    wB = () => {
      if (!inputTakesFocus) {
        return;
      }
      for (const Ene of takePendingPastes()) dispatchPasteEvent(Ene);
    };
    $[348] = dispatchPasteEvent;
    $[349] = inputTakesFocus;
    $[350] = takePendingPastes;
    $[351] = wB;
  } else wB = $[351];
  let vG;
  if (
    $[352] !== dispatchPasteEvent ||
    $[353] !== footerItemSelected ||
    $[354] !== inputTakesFocus ||
    $[355] !== takePendingPastes
  ) {
    vG = [inputTakesFocus, footerItemSelected, takePendingPastes, dispatchPasteEvent];
    $[352] = dispatchPasteEvent;
    $[353] = footerItemSelected;
    $[354] = inputTakesFocus;
    $[355] = takePendingPastes;
    $[356] = vG;
  } else vG = $[356];
  P(wB, vG);
  let kB;
  if ($[357] !== addNotification) {
    kB = function kw() {
      let Dne = env.isSSH();
      addNotification({
        key: "no-image-in-clipboard",
        kind: "feedback",
        text: Dne
          ? "no image over SSH \xB7 copy the file over, paste its path"
          : `No image found in clipboard. Use ${getShortcutDisplay("chat:imagePaste", "Chat", "ctrl+v")} to paste images.`,
        row1Hint: Dne ? "no image \xB7 over SSH, try scp" : "no image in clipboard",
        priority: "immediate",
        timeoutMs: Dne ? 5000 : 1000,
      });
    };
    $[357] = addNotification;
    $[358] = kB;
  } else kB = $[358];
  let kw = kB;
  let aD;
  if (
    $[359] !== dispatchPasteEvent ||
    $[360] !== mainLoopModel ||
    $[361] !== kw ||
    $[362] !== pP ||
    $[363] !== onIsPastingChange
  ) {
    aD = () => {
      onIsPastingChange(true);
      getImageFromClipboard(imageLimitsForModel(mainLoopModel))
        .then(async (result) => {
          if (result) {
            pP(result.base64, {
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
          kw();
        })
        .catch(logImagePasteFailure)
        .finally(() => onIsPastingChange(false));
    };
    $[359] = dispatchPasteEvent;
    $[360] = mainLoopModel;
    $[361] = kw;
    $[362] = pP;
    $[363] = onIsPastingChange;
    $[364] = aD;
  } else aD = $[364];
  let CG = aD;
  let vNe;
  if ($[365] !== rv || $[366] !== CG || $[367] !== bG || $[368] !== iD || $[369] !== gG) {
    vNe = {
      "chat:undo": gG,
      "chat:newline": bG,
      "chat:externalEditor": rv,
      "chat:stash": iD,
      "chat:imagePaste": CG,
    };
    $[365] = rv;
    $[366] = CG;
    $[367] = bG;
    $[368] = iD;
    $[369] = gG;
    $[370] = vNe;
  } else vNe = $[370];
  let One = vNe;
  const isActive = !isModalOverlayActive && !isSearchingHistory;
  let Nne;
  if ($[371] !== footerOwnsKeyOf || $[372] !== isActive) {
    Nne = {
      isActive,
      footerOwnsKeyOf,
    };
    $[371] = footerOwnsKeyOf;
    $[372] = isActive;
    $[373] = Nne;
  } else Nne = $[373];
  useFooterAwareMessageActions(One, Nne);
  let _G;
  if ($[374] !== Dd) {
    _G = {
      "chat:workflowKeywordToggle": Dd,
    };
    $[374] = Dd;
    $[375] = _G;
  } else _G = $[375];
  const isActive_2 = !isModalOverlayActive && Ka.length > 0;
  let iv;
  if ($[376] !== footerOwnsKeyOf || $[377] !== isActive_2) {
    iv = {
      isActive: isActive_2,
      footerOwnsKeyOf,
    };
    $[376] = footerOwnsKeyOf;
    $[377] = isActive_2;
    $[378] = iv;
  } else iv = $[378];
  useFooterAwareMessageActions(_G, iv);
  let sv = showSwarmFooterGate();
  let { agent, tmuxHint } = useTeammateBanner();
  let CB;
  if ($[379] !== embedded) {
    CB = {
      hideSessionTitle: embedded,
    };
    $[379] = embedded;
    $[380] = CB;
  } else CB = $[380];
  let sessionBanner = useSessionBanner(CB);
  let j_ = agent ?? tmuxHint ?? sessionBanner;
  let maxWidth = columns - INPUT_RIGHT_GUTTER - 1;
  let cD;
  if ($[381] !== agent || $[382] !== sv || $[383] !== mode || $[384] !== maxWidth) {
    cD = sv
      ? badgeWidth(
          promptModeBadgeText({
            mode,
            agent,
            maxWidth,
          }),
        )
      : INPUT_BADGE_GUTTER;
    $[381] = agent;
    $[382] = sv;
    $[383] = mode;
    $[384] = maxWidth;
    $[385] = cD;
  } else cD = $[385];
  let _Ne = cD;
  let Fne;
  if (
    $[386] !== chrome.dismissIdeSelection ||
    $[387] !== ideSelection ||
    $[388] !== ideSelectionRidesRow1 ||
    $[389] !== mergedClients ||
    $[390] !== viewingAgentTaskId
  ) {
    let TNe =
      viewingAgentTaskId || ideSelectionRidesRow1
        ? null
        : ideSelectionLabel(useIdeConnectionStatus(mergedClients).status, ideSelection);
    Fne =
      TNe === null
        ? undefined
        : {
            text: formatPasteLabel(TNe),
            onDelete: chrome.dismissIdeSelection,
          };
    $[386] = chrome.dismissIdeSelection;
    $[387] = ideSelection;
    $[388] = ideSelectionRidesRow1;
    $[389] = mergedClients;
    $[390] = viewingAgentTaskId;
    $[391] = Fne;
  } else Fne = $[391];
  let TB = Fne;
  let text = TB?.text ?? "";
  let columns_2 = sv ? Math.max(INPUT_RIGHT_GUTTER, columns - _Ne) : columns - INPUT_BADGE_GUTTER;
  let ob = useIsFullscreen()
    ? Math.max(MIN_FULLSCREEN_INPUT_ROWS, Math.floor(rows / 2) - MIN_INPUT_ROWS)
    : undefined;
  let uD =
    !isVimEditorMode && inlineGhostText?.insertPosition === cursorOffset && cursorOffset >= value.length;
  let RB;
  if ($[392] !== draft || $[393] !== Mi || $[394] !== uD || $[395] !== plain) {
    RB = () => {
      let Hne = plain || !Mi ? PP : emptySpans(draft.getSnapshot().decorations);
      return uD ? rangesBefore(Hne, draft.value.length) : Hne;
    };
    $[392] = draft;
    $[393] = Mi;
    $[394] = uD;
    $[395] = plain;
    $[396] = RB;
  } else RB = $[396];
  let fP = RB;
  let RG;
  if (
    $[397] !== yl ||
    $[398] !== draft ||
    $[399] !== isSearchingHistory ||
    $[400] !== ob ||
    $[401] !== text ||
    $[402] !== setAppState ||
    $[403] !== setCursorOffset ||
    $[404] !== columns_2 ||
    $[405] !== fP
  ) {
    RG = (entry) => {
      if (isSearchingHistory) {
        return;
      }
      setAppState(clearFooterSelectionState);
      let { value: q_, cursorOffset } = draft;
      if (!q_) {
        return;
      }
      let { cursor, bufferOffset } = createDisplayCursor({
        buffer: text + q_,
        offset: text.length + cursorOffset,
        texts: offsetDecorations(fP(), text.length),
        columns: columns_2,
        side: yl,
      });
      let entryMode = bufferOffset(
        cursor.measuredText.getOffsetFromPosition({
          line: entry.localRow + cursor.getViewportStartLine(ob),
          column: entry.localCol,
        }),
      );
      oB.current?.();
      setCursorOffset(Math.max(0, entryMode - text.length));
    };
    $[397] = yl;
    $[398] = draft;
    $[399] = isSearchingHistory;
    $[400] = ob;
    $[401] = text;
    $[402] = setAppState;
    $[403] = setCursorOffset;
    $[404] = columns_2;
    $[405] = fP;
    $[406] = RG;
  } else RG = $[406];
  let onClick = RG;
  let value_2 = R(null);
  let Wne;
  if (
    $[407] !== yl ||
    $[408] !== draft ||
    $[409] !== isModalOverlayActive ||
    $[410] !== isSearchingHistory ||
    $[411] !== ob ||
    $[412] !== _a ||
    $[413] !== text ||
    $[414] !== setCursorOffset ||
    $[415] !== setValue ||
    $[416] !== columns_2 ||
    $[417] !== fP
  ) {
    Wne = (PNe) => {
      let { value: hP, cursorOffset, pastedContents } = draft;
      if (!hP || isSearchingHistory || isModalOverlayActive) {
        return false;
      }
      let cachedLayout = value_2.current?.cachedLayout;
      let av = selectionBounds(PNe);
      if (!cachedLayout || !av) {
        return false;
      }
      let { start, end } = av;
      if (
        start.row < cachedLayout.y ||
        end.row < cachedLayout.y ||
        start.row >= cachedLayout.y + cachedLayout.height ||
        end.row >= cachedLayout.y + cachedLayout.height
      ) {
        return false;
      }
      let { cursor, bufferOffset } = createDisplayCursor({
        buffer: text + hP,
        offset: text.length + cursorOffset,
        texts: offsetDecorations(fP(), text.length),
        columns: columns_2,
        side: yl,
      });
      let mD = cursor;
      let MB = bufferOffset;
      let viewportStartLine = mD.getViewportStartLine(ob);
      let G_ = (show, key) =>
        MB(
          mD.measuredText.getOffsetFromPosition({
            line: show - cachedLayout.y + viewportStartLine,
            column: Math.max(0, key - cachedLayout.x),
          }),
        ) - text.length;
      let max = Math.max(0, G_(start.row, start.col));
      let min = Math.min(hP.length, G_(end.row, end.col + 1));
      if (min <= max) {
        return false;
      }
      _a(hP, cursorOffset, pastedContents);
      setValue(hP.slice(0, max) + hP.slice(min));
      setCursorOffset(max);
      return true;
    };
    $[407] = yl;
    $[408] = draft;
    $[409] = isModalOverlayActive;
    $[410] = isSearchingHistory;
    $[411] = ob;
    $[412] = _a;
    $[413] = text;
    $[414] = setCursorOffset;
    $[415] = setValue;
    $[416] = columns_2;
    $[417] = fP;
    $[418] = Wne;
  } else Wne = $[418];
  let NB = Wne;
  let previousState = useInputSelectionBridge();
  let yP;
  let IG;
  if ($[419] !== NB || $[420] !== previousState) {
    yP = () => {
      previousState.setHandler(NB);
      return () => previousState.setHandler(null);
    };
    IG = [previousState, NB];
    $[419] = NB;
    $[420] = previousState;
    $[421] = yP;
    $[422] = IG;
  } else {
    yP = $[421];
    IG = $[422];
  }
  P(yP, IG);
  let qne;
  let MNe;
  if (
    $[423] !== clearBuffer ||
    $[424] !== draft ||
    $[425] !== gd ||
    $[426] !== pu ||
    $[427] !== resetHistory ||
    $[428] !== selectSuggestion ||
    $[429] !== setCursorOffset ||
    $[430] !== setHoveredSuggestion
  ) {
    qne = () => ({
      clearBuffer,
      resetHistory,
      typeText: (text) => {
        let { value: input, cursorOffset } = draft;
        pu(input.slice(0, cursorOffset) + text + input.slice(cursorOffset));
        setCursorOffset(cursorOffset + text.length);
      },
      selectSuggestion,
      setHoveredSuggestion,
      isWorkflowKeywordSuppressed: gd,
    });
    MNe = [clearBuffer, resetHistory, draft, pu, setCursorOffset, selectSuggestion, setHoveredSuggestion, gd];
    $[423] = clearBuffer;
    $[424] = draft;
    $[425] = gd;
    $[426] = pu;
    $[427] = resetHistory;
    $[428] = selectSuggestion;
    $[429] = setCursorOffset;
    $[430] = setHoveredSuggestion;
    $[431] = qne;
    $[432] = MNe;
  } else {
    qne = $[431];
    MNe = $[432];
  }
  vxe(ref, qne, MNe);
  let FB;
  if ($[433] !== historyEdited || $[434] !== historyIndex || $[435] !== historyTotal) {
    let INe = historyPositionLabel(historyIndex, historyTotal, historyEdited);
    FB = INe
      ? {
          content: ` ${sequential.dim(INe)} `,
          position: "top",
          align: "start",
          offset: 2,
        }
      : undefined;
    $[433] = historyEdited;
    $[434] = historyIndex;
    $[435] = historyTotal;
    $[436] = FB;
  } else FB = $[436];
  let DNe = FB;
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
  if ($[444] !== kw) {
    onUnreadImagePaste = () => {
      if (env.isSSH()) {
        logFeatureBad("input_image_paste", "not_found");
        kw();
      }
    };
    $[444] = kw;
    $[445] = onUnreadImagePaste;
  } else onUnreadImagePaste = $[445];
  const disableCursorMovementForUpDownKeys = suggestions.length > 0 || footerItemSelected;
  const disableEscapeDoublePress = suggestions.length > 0;
  const parkCursor = cursorRowId === null;
  const onUndo = canUndo ? gG : undefined;
  let uv;
  if (
    $[446] !== chrome.requestExit ||
    $[447] !== commandArgumentHint ||
    $[448] !== $g ||
    $[449] !== cursorOffset ||
    $[450] !== highlights ||
    $[451] !== Gp ||
    $[452] !== Vg ||
    $[453] !== onSubmit_2 ||
    $[454] !== onHistoryDown_2 ||
    $[455] !== onHistoryUp_2 ||
    $[456] !== onKeyDownBefore ||
    $[457] !== inlineGhostText ||
    $[458] !== inputTakesFocus ||
    $[459] !== ob ||
    $[460] !== onExitMessage ||
    $[461] !== pP ||
    $[462] !== onIsPastingChange ||
    $[463] !== onChange ||
    $[464] !== onPaste ||
    $[465] !== placeholder ||
    $[466] !== inputFilter ||
    $[467] !== resetHistory ||
    $[468] !== TB ||
    $[469] !== setCursorOffset ||
    $[470] !== ba ||
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
    uv = {
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
      onImagePaste: pP,
      onUnreadImagePaste,
      columns: columns_2,
      leadingPill: TB,
      maxVisibleLines: ob,
      disableCursorMovementForUpDownKeys,
      disableEscapeDoublePress,
      cursorOffset,
      onChangeCursorOffset: setCursorOffset,
      onPaste,
      onIsPastingChange,
      focus: inputTakesFocus,
      showCursor: ba,
      parkCursor,
      argumentHint: commandArgumentHint,
      onUndo,
      highlights,
      inlineGhostText,
      virtualTexts: Gp,
      inputFilter,
      editRelay: Vg,
      commitEdit: $g,
    };
    $[446] = chrome.requestExit;
    $[447] = commandArgumentHint;
    $[448] = $g;
    $[449] = cursorOffset;
    $[450] = highlights;
    $[451] = Gp;
    $[452] = Vg;
    $[453] = onSubmit_2;
    $[454] = onHistoryDown_2;
    $[455] = onHistoryUp_2;
    $[456] = onKeyDownBefore;
    $[457] = inlineGhostText;
    $[458] = inputTakesFocus;
    $[459] = ob;
    $[460] = onExitMessage;
    $[461] = pP;
    $[462] = onIsPastingChange;
    $[463] = onChange;
    $[464] = onPaste;
    $[465] = placeholder;
    $[466] = inputFilter;
    $[467] = resetHistory;
    $[468] = TB;
    $[469] = setCursorOffset;
    $[470] = ba;
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
    $[483] = uv;
  } else uv = $[483];
  let nb = uv;
  let Gne;
  if ($[484] !== plain || $[485] !== mode) {
    Gne = getEditorWaitBorderStyle(mode, plain);
    $[484] = plain;
    $[485] = mode;
    $[486] = Gne;
  } else Gne = $[486];
  let NG = Gne;
  let LG;
  if (
    $[487] !== nb ||
    $[488] !== onModeChange ||
    $[489] !== onOpenHistorySearch ||
    $[490] !== toggleHelp ||
    $[491] !== isVimEditorMode ||
    $[492] !== vimMode
  ) {
    LG = isVimEditorMode
      ? jsxProd_default(VimTextInput, {
          ...nb,
          initialMode: vimMode,
          onModeChange,
          cancelRemapRef: tG,
          forgetColumnRef: oB,
          onOpenHistorySearch,
          onToggleHelp: toggleHelp,
          recordInsertRef: yG,
        })
      : jsxProd_default(TextInput, {
          ...nb,
        });
    $[487] = nb;
    $[488] = onModeChange;
    $[489] = onOpenHistorySearch;
    $[490] = toggleHelp;
    $[491] = isVimEditorMode;
    $[492] = vimMode;
    $[493] = LG;
  } else LG = $[493];
  let children = LG;
  let Qne;
  if ($[494] !== onClick || $[495] !== children) {
    Qne = jsxProd_default(Box, {
      ref: value_2,
      flexGrow: 1,
      flexShrink: 1,
      tabIndex: -1,
      onClick,
      children,
    });
    $[494] = onClick;
    $[495] = children;
    $[496] = Qne;
  } else Qne = $[496];
  let Yg = Qne;
  if (sv) {
    let Jg;
    if ($[497] !== columns) {
      Jg = jsxProd_default(Divider, {
        width: columns,
      });
      $[497] = columns;
      $[498] = Jg;
    } else Jg = $[498];
    let Of;
    if ($[499] !== agent || $[500] !== mode || $[501] !== maxWidth) {
      Of = jsxProd_default(PromptModeBadge, {
        mode,
        agent,
        maxWidth,
      });
      $[499] = agent;
      $[500] = mode;
      $[501] = maxWidth;
      $[502] = Of;
    } else Of = $[502];
    let Xg;
    if ($[503] !== Yg || $[504] !== Of) {
      Xg = jsxProd_default_2(Box, {
        flexDirection: "row",
        width: "100%",
        children: [Of, Yg],
      });
      $[503] = Yg;
      $[504] = Of;
      $[505] = Xg;
    } else Xg = $[505];
    let wy;
    if ($[506] !== columns) {
      wy = jsxProd_default(Divider, {
        width: columns,
      });
      $[506] = columns;
      $[507] = wy;
    } else wy = $[507];
    let wP;
    if ($[508] !== Jg || $[509] !== Xg || $[510] !== wy) {
      wP = jsxProd_default_2(Fragment, {
        children: [false, Jg, Xg, wy],
      });
      $[508] = Jg;
      $[509] = Xg;
      $[510] = wy;
      $[511] = wP;
    } else wP = $[511];
    return wP;
  }
  if (j_ && !DNe) {
    let Jg;
    if ($[512] !== columns || $[513] !== fastModeTag || $[514] !== j_) {
      Jg = jsxProd_default(PromptBorderBanner, {
        banner: j_,
        columns,
        fastModeTag,
      });
      $[512] = columns;
      $[513] = fastModeTag;
      $[514] = j_;
      $[515] = Jg;
    } else Jg = $[515];
    let Of;
    if ($[516] !== Yg || $[517] !== modeIndicator) {
      Of = jsxProd_default_2(Box, {
        flexDirection: "row",
        width: "100%",
        children: [modeIndicator, Yg],
      });
      $[516] = Yg;
      $[517] = modeIndicator;
      $[518] = Of;
    } else Of = $[518];
    let Xg;
    if ($[519] !== columns || $[520] !== fastModeTag || $[521] !== j_) {
      Xg = jsxProd_default(PromptBorderBanner, {
        banner: j_,
        columns,
        fastModeTag,
        borderOnly: true,
      });
      $[519] = columns;
      $[520] = fastModeTag;
      $[521] = j_;
      $[522] = Xg;
    } else Xg = $[522];
    let wy;
    if ($[523] !== Jg || $[524] !== Of || $[525] !== Xg) {
      wy = jsxProd_default_2(Fragment, {
        children: [Jg, Of, Xg],
      });
      $[523] = Jg;
      $[524] = Of;
      $[525] = Xg;
      $[526] = wy;
    } else wy = $[526];
    return wy;
  }
  let Jg;
  if ($[527] !== plain || $[528] !== ultraEffortTag) {
    Jg =
      plain &&
      ultraEffortTag &&
      jsxProd_default(Text, {
        children: ultraEffortTag,
      });
    $[527] = plain;
    $[528] = ultraEffortTag;
    $[529] = Jg;
  } else Jg = $[529];
  let Of;
  if ($[530] !== fastModeCooldown || $[531] !== fastModeTag || $[532] !== plain) {
    Of =
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
    $[533] = Of;
  } else Of = $[533];
  const borderText = plain ? undefined : (DNe ?? topBorderText);
  let wy;
  if ($[534] !== NG || $[535] !== Yg || $[536] !== modeIndicator || $[537] !== borderText) {
    wy = jsxProd_default_2(Box, {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "flex-start",
      ...NG,
      width: "100%",
      borderText,
      children: [modeIndicator, Yg],
    });
    $[534] = NG;
    $[535] = Yg;
    $[536] = modeIndicator;
    $[537] = borderText;
    $[538] = wy;
  } else wy = $[538];
  let wP;
  if ($[539] !== Jg || $[540] !== Of || $[541] !== wy) {
    wP = jsxProd_default_2(Fragment, {
      children: [Jg, Of, wy],
    });
    $[539] = Jg;
    $[540] = Of;
    $[541] = wy;
    $[542] = wP;
  } else wP = $[542];
  return wP;
}
export { buildBorderText, PromptInput };
