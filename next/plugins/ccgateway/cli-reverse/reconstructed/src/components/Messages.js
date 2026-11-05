/**
 * components/Messages.tsx
 *
 * 消息列表（MessagesImpl）：过滤/折叠/分组消息、brief 模式裁剪、按阈值切片（transcript 显示全部切换）、交给 VirtualMessageList 或静态渲染。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Messages.tsx
 * pieces: chunk-5yfs8sfq.js (5), chunk-aac6cgbf.js (1), chunk-hnxhr3bs.js (79)
 * attribution: placement 58, layout 18, callgraph-fingerprint 1, fingerprint 5, file-local 3
 */
import { randomUUID } from "crypto";
import {
  hasToolResultBlock,
  hasMultipleContentBlocks,
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  getToolUseID,
  hasUnresolvedHooksFromLookup,
  IncrementalMessageNormalizer,
  TranscriptProgressSplitter,
  UnresolvedToolUseTracker,
  MessageLookupsBuilder,
  RowLookupsProjector,
  createUserMessage,
  filterFoldedScheduledTaskMessages,
  createAssistantMessage,
  deriveUUID,
  normalizeMessages,
  shouldShowUserMessage,
  reorderMessagesInUI,
  buildProgressLookups,
  UUID_PREFIX_LENGTH,
  isTeammateMessageTextInSwarm,
  isPositiveCountInSwarm,
} from "../utils/messages.js";
import {
  init_react_production,
  createContext,
  memo,
  suspenseTypeExport,
  useSyncExternalStore,
  useRef,
  useEffect,
  useState,
  useLayoutEffect,
  useContext,
} from "../../vendor/react/cjs/react.production.js";
import { isPlainObject } from "../utils/objectUtils.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useSessionOrUndefined, useHost } from "../context/session.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { StartupUpdateSummary } from "./LogoV2/UpdateSummary.js";
import { LogoV2 } from "./LogoV2/LogoV2.js";
import { Box, Text } from "../ink/components/Text.js";
import { FreezeWhenOffscreen } from "./FreezeWhenOffscreen.js";
import { noticeImpressionEnabled } from "./LogoV2/CondensedLogo.js";
import { computeSearchText } from "../utils/transcriptSearch.js";
import { isSubsetOf } from "../utils/fsWatchProbe.js";
import { collectToolUseIds, isNavigableMessage } from "./messageActions.js";
import { BLACK_CIRCLE } from "../constants/figures.js";
import { StreamingMarkdown } from "./pluginUi/render/MarkdownBlock.js";
import { useCommandQueueOrDefault } from "../context/QueuedMessageContext.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useAppState, useAppStoreDirect } from "../state/AppState.js";
import { countPendingBackgroundWork } from "./messages/SystemTextMessage.js";
import { renderWithForceUpdate } from "../hooks/useForceRender.js";
import { useTerminalNotification, TerminalWriteContext } from "../ink/useTerminalNotification.js";
import { useTaskListWatcher } from "../hooks/useTaskListWatcher.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  IncrementalCollapser,
  isSignedThinkingBlock,
  collapseReadSearchGroups,
} from "../utils/collapseReadSearch.js";
import { isInvisibleMessage } from "./FullscreenLayout.js";
import { placeholderImageId } from "./messages/UserPromptMessage.js";
import { isNonHumanInboundOrigin } from "../utils/backgroundSessionResume.js";
import { isHumanOrAutoContinuation, joinTextContent, isPeerOrObserver } from "../utils/messageProvenance.js";
import { shortUuid, reportMessageWithoutUuid } from "../utils/transcriptDiagnostics.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { shouldShowNotice, slashCommandLinkContext } from "./SlashCommandLink.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { SPINNER_COLUMN_MIN_WIDTH } from "./Spinner/SpinnerColumn.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { env } from "../utils/env.js";
import { resolveTranscriptMode, useTranscriptMode } from "./messages/transcriptModeContext.js";
import { isBashOutputText } from "../constants/xml.js";
import { messagesSinceCompactBoundary } from "../services/projects/threadRows.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import { groupToolUses } from "../utils/groupToolUses.js";
import { collapseBackgroundBashNotifications } from "../utils/collapseBackgroundBashNotifications.js";
import { collapseHookSummaries } from "../utils/collapseHookSummaries.js";
import {
  collapseHookAttachments,
  dropDuplicateRemoteErrors,
  dropRepeatedTurnDurations,
} from "../utils/collapseTurnMessages.js";
import { collapseTeammateShutdowns } from "../utils/collapseTeammateShutdowns.js";
import { findLeadingCompactBoundary, CompactSummaryContext } from "./messages/GroupedToolUseContent.js";
import { isDiskless } from "../bootstrap/state.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { getMaterializedSessionFile } from "../utils/sessionStorage.js";
import { isScreenReaderMode } from "../utils/accessibility/screenReader.js";
import { setTranscriptFrontCut } from "../ink/render-to-screen-reader.js";
import { hasContentAfterIndex, MessageRow } from "./MessageRow.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { agentMessageOverflows } from "./messages/AgentMessage.js";
import { isEvalToolCallName } from "../tools/REPLTool/constants.js";
import { getErrorMessageIfRefusal } from "../services/api/errors.js";
import { getAdvisorRefusalText } from "../utils/advisor.js";
import { mcpRenderOverrideFor } from "./Message.js";
import { BashTool } from "../tools/BashTool/BashTool.js";
import { splitBashOutputCached } from "./messages/UserCommandMessage.js";
import { exceedsTenLines } from "../utils/messages/textLineCount.js";
import { findToolByName } from "../Tool.js";
import { displayOnlyMcpTool } from "../tools/MCPTool/displayOnlyTool.js";
import { useDialogOfKind } from "../state/dialogQueue.js";
import { LOCAL_JSX_DIALOG } from "../commands/rate-limit-options/index.js";
import { setHistoryWriter, clearHistoryWriter } from "../utils/hooks/hookEventHelpers.js";
import { hasStringUuid } from "../bridge/inboundMessages.js";
import { NoSelect } from "../ink/components/Input.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";
import { Divider } from "./design-system/Divider.js";
import { plural } from "../utils/stringUtils.js";
import { expandContextSignal } from "./messages/expandContext.js";
import { VirtualMessageList } from "./VirtualMessageList.js";
import { monitorEventCache, monitorEventCacheStore } from "./messages/TeammateResultMessage.js";
import { sequential } from "../utils/sequential.js";
import { collapsedRowOf } from "../utils/queuedCommandDisplay.js";
import { isTaggedPeerText } from "../utils/crossSessionMessages.js";
import { crossSessionPreviewHidesBody } from "./messages/UserCrossSessionMessage.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aac6cgbf.js:2042-2446 placement
function unansweredToolBriefs(snapshot) {
  let briefByTurn = new Map();
  let answeredIds = new Set();
  for (let j = snapshot.length - 1; j >= 0; j--) {
    let message = snapshot[j];
    if (message.type === "assistant") {
      for (let block of message.message.content)
        if (block.type === "tool_use") briefByTurn.set(block.id, block.name);
      continue;
    }
    if (message.type !== "user") continue;
    let content = message.message.content;
    if (!hasToolResultBlock(content)) {
      if (message.isMeta !== true) break;
      continue;
    }
    for (let block of content)
      if (typeof block !== "string" && block.type === "tool_result") answeredIds.add(block.tool_use_id);
  }
  for (let toolUseId of answeredIds) briefByTurn.delete(toolUseId);
  return briefByTurn;
}
//@ chunk-5yfs8sfq.js:265-269 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5yfs8sfq.js:265", () => {
  init_react_production();
});
//@ chunk-5yfs8sfq.js:269-298 placement
var SCRIPT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SuggestionSlot;
deferInit("chunk-5yfs8sfq.js:269", () => {
  SCRIPT = "script:";
  SuggestionSlot = createContext(null);
});
//@ chunk-5yfs8sfq.js:298-331 layout
function withScriptPrefix(text) {
  return `${SCRIPT}${text}`;
}
//@ chunk-5yfs8sfq.js:331-370 layout
function hasScriptPrefix(text) {
  return text.startsWith(SCRIPT);
}
//@ chunk-5yfs8sfq.js:370-459 placement
/**
 * 从工具结果里取可展示的 code 字段（非空白字符串才给）。
 */
function getCode(value) {
  return isPlainObject(value) && typeof value.code === "string" && value.code.trim() !== ""
    ? value.code
    : undefined;
}
//@ chunk-hnxhr3bs.js:116405-116409 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:116405", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:121325-122102 callgraph-fingerprint (2.1.88 match: LogoHeader, 0.199)
var LogoHeader; // deferred: uses useSessionOrUndefined (../context/session.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hnxhr3bs.js:121325", () => {
  LogoHeader = memo(function (props) {
    let $ = useMemoCache(15);
    let { latchAnnouncementSlot, hideWelcomeChrome, homeMessage, hideLogo } = props;
    let latchAnnouncement = latchAnnouncementSlot === undefined ? true : latchAnnouncementSlot;
    let hideWelcome = hideWelcomeChrome === undefined ? false : hideWelcomeChrome;
    let homeMessageFlag = homeMessage === undefined ? false : homeMessage;
    let hideLogoFlag = hideLogo === undefined ? false : hideLogo;
    let hasSession = useSessionOrUndefined() !== undefined;
    const gap = hideLogoFlag ? 0 : 1;
    const flexGrow = homeMessageFlag ? 1 : 0;
    let updateSummary;
    if ($[0] !== hideLogoFlag || $[1] !== hideWelcome) {
      updateSummary =
        !hideWelcome &&
        jsxProd_default(StartupUpdateSummary, {
          hideLogo: hideLogoFlag,
        });
      $[0] = hideLogoFlag;
      $[1] = hideWelcome;
      $[2] = updateSummary;
    } else updateSummary = $[2];
    let logoElement;
    if ($[3] !== hasSession || $[4] !== homeMessageFlag || $[5] !== latchAnnouncement) {
      logoElement =
        hasSession &&
        jsxProd_default(suspenseTypeExport, {
          fallback: null,
          children: jsxProd_default(LogoV2, {
            latchAnnouncementSlot: latchAnnouncement,
            homeMessage: homeMessageFlag,
          }),
        });
      $[3] = hasSession;
      $[4] = homeMessageFlag;
      $[5] = latchAnnouncement;
      $[6] = logoElement;
    } else logoElement = $[6];
    let children;
    if ($[7] !== gap || $[8] !== flexGrow || $[9] !== updateSummary || $[10] !== logoElement) {
      children = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap,
        flexGrow,
        children: [updateSummary, null, logoElement],
      });
      $[7] = gap;
      $[8] = flexGrow;
      $[9] = updateSummary;
      $[10] = logoElement;
      $[11] = children;
    } else children = $[11];
    let freezeWhenOffscreenElement;
    if ($[12] !== latchAnnouncement || $[13] !== children) {
      freezeWhenOffscreenElement = jsxProd_default(FreezeWhenOffscreen, {
        children: jsxProd_default(noticeImpressionEnabled.Provider, {
          value: latchAnnouncement,
          children,
        }),
      });
      $[12] = latchAnnouncement;
      $[13] = children;
      $[14] = freezeWhenOffscreenElement;
    } else freezeWhenOffscreenElement = $[14];
    return freezeWhenOffscreenElement;
  });
});
//@ chunk-hnxhr3bs.js:122143-122147 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:122143", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:131159-131208 placement
function createEmptySlice() {
  return {
    head: undefined,
    upTo: 0,
    seed: false,
  };
}
//@ chunk-hnxhr3bs.js:131208-131359 placement
function scanForMultiBlockMessage(messages, count, cache) {
  if (messages[0] !== cache.head || count < cache.upTo) {
    cache.head = messages[0];
    cache.upTo = 0;
    cache.seed = false;
  }
  for (let upTo = cache.upTo; upTo < count && !cache.seed; upTo++)
    cache.seed = hasMultipleContentBlocks(messages[upTo]);
  cache.upTo = count;
  return cache.seed;
}
//@ chunk-hnxhr3bs.js:140611-140650 placement
var INTERRUPT_MESSAGE_TEXTS; // deferred: uses INTERRUPT_MESSAGE (../utils/messages.js) of its import cycle while loading; runs once the cycle is complete
var weakMap_3;
deferInit("chunk-hnxhr3bs.js:140611", () => {
  INTERRUPT_MESSAGE_TEXTS = new Set([INTERRUPT_MESSAGE, INTERRUPT_MESSAGE_FOR_TOOL_USE]);
  weakMap_3 = new WeakMap();
});
//@ chunk-hnxhr3bs.js:140650-140751 placement
/**
 * 取消息的小写搜索文本，按消息对象 WeakMap 缓存。
 */
function getMessageSearchText(msg) {
  let searchText = weakMap_3.get(msg);
  if (searchText !== undefined) return searchText;
  let lower = computeSearchText(msg).toLowerCase();
  weakMap_3.set(msg, lower);
  return lower;
}
//@ chunk-hnxhr3bs.js:143165-143169 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:143165", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:151692-152384 fingerprint (2.1.88 match: shouldRenderStatically, 0.715)
function shouldRenderStatically(
  message,
  streamingToolUseIDs,
  inProgressToolUseIDs,
  siblingToolUseIDs,
  screen,
  lookups,
) {
  switch (message.type) {
    case "attachment":
    case "user":
    case "assistant": {
      if (message.type === "assistant") {
        let block = message.message.content[0];
        if (block?.type === "server_tool_use") return lookups.resolvedToolUseIDs.has(block.id);
      }
      let toolUseID = getToolUseID(message);
      if (!toolUseID) return true;
      if (streamingToolUseIDs.has(toolUseID)) return false;
      if (inProgressToolUseIDs.has(toolUseID)) return false;
      if (hasUnresolvedHooksFromLookup(toolUseID, "PostToolUse", lookups)) return false;
      return isSubsetOf(siblingToolUseIDs, lookups.resolvedToolUseIDs);
    }
    case "system":
      return true;
    case "grouped_tool_use":
      return message.messages.every((msg) => {
        let content = msg.message.content[0];
        return content?.type === "tool_use" && lookups.resolvedToolUseIDs.has(content.id);
      });
    case "collapsed_read_search":
      return (
        screen === "transcript" &&
        collectToolUseIds(message).every((id) => lookups.resolvedToolUseIDs.has(id))
      );
    case "work_segment":
      return !message.isLive;
    case "speaker_label":
    case "recap_fold":
      return true;
  }
}
//@ chunk-hnxhr3bs.js:152384-152388 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:152384", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:152388-153246 placement
/**
 * 说话人标签组件槽（初始 null）；同一声明里的 ql 是流式输出文本行组件。
 */
var speakerLabelComponent; // deferred: uses Box (../ink/components/Text.js) of its import cycle while loading; runs once the cycle is complete
var StreamingTextRow;
deferInit("chunk-hnxhr3bs.js:152388", () => {
  speakerLabelComponent = null;
  StreamingTextRow = memo(function (props) {
    let $ = useMemoCache(14);
    let { store, transcriptV2 } = props;
    let { displayed, hideTrailingLine } = useSyncExternalStore(store.subscribe, store.getDerived);
    if (!displayed) {
      return null;
    }
    const flexDirection = transcriptV2 === undefined ? "row" : "column";
    let assistantLabel;
    if ($[0] !== transcriptV2) {
      assistantLabel =
        transcriptV2 === "label" &&
        speakerLabelComponent !== null &&
        jsxProd_default(speakerLabelComponent, {
          speaker: {
            kind: "claude",
          },
        });
      $[0] = transcriptV2;
      $[1] = assistantLabel;
    } else assistantLabel = $[1];
    let claudeLabel;
    if ($[2] !== transcriptV2) {
      claudeLabel =
        transcriptV2 === undefined &&
        jsxProd_default(Box, {
          minWidth: 2,
          children: jsxProd_default(Text, {
            "aria-label": "claude:",
            color: "text",
            children: BLACK_CIRCLE,
          }),
        });
      $[2] = transcriptV2;
      $[3] = claudeLabel;
    } else claudeLabel = $[3];
    let markdownElement;
    if ($[4] !== displayed || $[5] !== hideTrailingLine) {
      markdownElement = jsxProd_default(Box, {
        flexDirection: "column",
        children: jsxProd_default(StreamingMarkdown, {
          hideTrailingLine,
          children: displayed,
        }),
      });
      $[4] = displayed;
      $[5] = hideTrailingLine;
      $[6] = markdownElement;
    } else markdownElement = $[6];
    let labelRow;
    if ($[7] !== claudeLabel || $[8] !== markdownElement) {
      labelRow = jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [claudeLabel, markdownElement],
      });
      $[7] = claudeLabel;
      $[8] = markdownElement;
      $[9] = labelRow;
    } else labelRow = $[9];
    let columnElement;
    if ($[10] !== flexDirection || $[11] !== assistantLabel || $[12] !== labelRow) {
      columnElement = jsxProd_default_2(Box, {
        alignItems: "flex-start",
        flexDirection,
        marginTop: 1,
        width: "100%",
        children: [assistantLabel, labelRow],
      });
      $[10] = flexDirection;
      $[11] = assistantLabel;
      $[12] = labelRow;
      $[13] = columnElement;
    } else columnElement = $[13];
    return columnElement;
  });
});
//@ chunk-hnxhr3bs.js:153246-153250 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:153246", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:153250-153254 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:153250", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:153254-153328 placement
function useCommandQueue() {
  let commandQueueOrDefault = useCommandQueueOrDefault();
  return useSyncExternalStore(commandQueueOrDefault.subscribe, commandQueueOrDefault.getCommandQueueSnapshot);
}
//@ chunk-hnxhr3bs.js:153482-153518 placement
function selectIsLoading(state) {
  return state.isLoading;
}
//@ chunk-hnxhr3bs.js:153518-153550 placement
function selectTasks(state) {
  return state.tasks;
}
//@ chunk-hnxhr3bs.js:153550-153613 placement
function terminalProgressEnabled() {
  return resolveSetting("terminalProgressBarEnabled", true).value;
}
//@ chunk-hnxhr3bs.js:153613-154309 placement
/**
 * 根据加载状态、进行中的工具与后台 agent/工作流，计算任务进度并通过终端通知（OSC 进度）上报；卸载时清除。
 */
function TerminalTaskProgress(props) {
  let $ = useMemoCache(13);
  let { turn, hasToolsInProgress } = props;
  let storeSelector = useStoreSelector(turn, selectIsLoading);
  let tasks = useAppState(selectTasks);
  let queuedCommands = useCommandQueue();
  let pendingWork;
  if ($[0] !== queuedCommands || $[1] !== tasks) {
    pendingWork = countPendingBackgroundWork({
      tasks,
      queuedCommands,
    });
    $[0] = queuedCommands;
    $[1] = tasks;
    $[2] = pendingWork;
  } else pendingWork = $[2];
  let pending = pendingWork;
  let hasPending = pending.pendingAgents > 0 || pending.pendingWorkflows > 0;
  let progressElement = renderWithForceUpdate(terminalProgressEnabled);
  let { progress } = useTerminalNotification();
  let taskListWatcherRef = useRef(null);
  let watchTaskList;
  let watchTaskListDeps;
  if (
    $[3] !== progressElement ||
    $[4] !== hasPending ||
    $[5] !== hasToolsInProgress ||
    $[6] !== storeSelector ||
    $[7] !== progress
  ) {
    watchTaskList = () => {
      let taskListWatcher = useTaskListWatcher({
        enabled: progressElement,
        isLoading: storeSelector,
        hasToolsInProgress,
        hasPendingBackgroundWork: hasPending,
      });
      if (taskListWatcherRef.current === taskListWatcher) {
        return;
      }
      taskListWatcherRef.current = taskListWatcher;
      progress(taskListWatcher);
    };
    watchTaskListDeps = [progress, progressElement, storeSelector, hasToolsInProgress, hasPending];
    $[3] = progressElement;
    $[4] = hasPending;
    $[5] = hasToolsInProgress;
    $[6] = storeSelector;
    $[7] = progress;
    $[8] = watchTaskList;
    $[9] = watchTaskListDeps;
  } else {
    watchTaskList = $[8];
    watchTaskListDeps = $[9];
  }
  useEffect(watchTaskList, watchTaskListDeps);
  let cleanupProgress;
  let cleanupProgressDeps;
  if ($[10] !== progress) {
    cleanupProgress = () => () => {
      if (taskListWatcherRef.current !== null) {
        taskListWatcherRef.current = null;
        progress(null);
      }
    };
    cleanupProgressDeps = [progress];
    $[10] = progress;
    $[11] = cleanupProgress;
    $[12] = cleanupProgressDeps;
  } else {
    cleanupProgress = $[11];
    cleanupProgressDeps = $[12];
  }
  useEffect(cleanupProgress, cleanupProgressDeps);
  return null;
}
//@ chunk-hnxhr3bs.js:154313-154391 placement
function shrinkTerminalSize(size, reservedColumns) {
  return reservedColumns === 0
    ? size
    : {
        columns: Math.max(1, size.columns - reservedColumns),
        rows: size.rows,
      };
}
//@ chunk-hnxhr3bs.js:154948-154952 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:154948", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:154952-154956 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:154952", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:156007-156011 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:156007", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:180831-180865 placement
function selectVerbose_2(state) {
  return state.verbose;
}
//@ chunk-hnxhr3bs.js:180865-180907 placement
function selectBriefTranscript(state) {
  return state.briefTranscript;
}
//@ chunk-hnxhr3bs.js:180907-180955 placement
function selectHasRemoteReplyChannel(state) {
  return state.hasRemoteReplyChannel;
}
//@ chunk-hnxhr3bs.js:180955-181011 placement
function selectActiveAgents(state) {
  return state.agentDefinitions.activeAgents;
}
//@ chunk-hnxhr3bs.js:181011-181059 placement
function selectShowMessageTimestamps(state) {
  return state.showMessageTimestamps;
}
//@ chunk-hnxhr3bs.js:181059-181105 placement
function isSilkHingeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_silk_hinge", false);
}
//@ chunk-hnxhr3bs.js:181105-181130 placement
function returnFalse_2(state) {
  return false;
}
//@ chunk-hnxhr3bs.js:181130-181171 placement
function createIncrementalNormalizer() {
  return new IncrementalMessageNormalizer(new WeakMap());
}
//@ chunk-hnxhr3bs.js:181171-181199 placement
function createProgressSplitter() {
  return new TranscriptProgressSplitter();
}
//@ chunk-hnxhr3bs.js:181199-181227 placement
function createToolUseTracker() {
  return new UnresolvedToolUseTracker();
}
//@ chunk-hnxhr3bs.js:181227-181255 placement
function createLookupsBuilder() {
  return new MessageLookupsBuilder();
}
//@ chunk-hnxhr3bs.js:181255-181284 placement
function createIncrementalCollapser() {
  return new IncrementalCollapser();
}
//@ chunk-hnxhr3bs.js:181284-181312 placement
function createRowProjector() {
  return new RowLookupsProjector();
}
//@ chunk-hnxhr3bs.js:181312-181345 placement
function createWeakMap() {
  return new WeakMap();
}
//@ chunk-hnxhr3bs.js:181345-181378 placement
function createWeakMap_2() {
  return new WeakMap();
}
//@ chunk-hnxhr3bs.js:181378-181406 placement
function createDedupeState() {
  return new StreamingToolUseDeduper();
}
//@ chunk-hnxhr3bs.js:181406-181439 placement
function createWeakMap_3() {
  return new WeakMap();
}
//@ chunk-hnxhr3bs.js:181439-181469 placement
function isVisibleMessage(message) {
  return !isInvisibleMessage(message);
}
//@ chunk-hnxhr3bs.js:181469-181500 placement
function messageUuid(message) {
  return message.uuid;
}
//@ chunk-hnxhr3bs.js:181500-181563 placement
function createSegmenter() {
  return transcriptPlugin === null ? null : new transcriptPlugin.TranscriptSegmenter();
}
//@ chunk-hnxhr3bs.js:181563-181653 placement
function pendingToUserMessage(pending, imageId) {
  let { text, origin } = pending;
  return createUserMessage({
    content: text,
    origin,
    uuid: placeholderImageId(imageId),
  });
}
//@ chunk-hnxhr3bs.js:181653-181682 placement
function createIdSet() {
  return new Set();
}
//@ chunk-hnxhr3bs.js:181682-181754 layout
function isNotInformational(message) {
  return message.type !== "system" || message.subtype !== "informational";
}
//@ chunk-hnxhr3bs.js:181754-181787 placement
function createWeakMap_4() {
  return new WeakMap();
}
//@ chunk-hnxhr3bs.js:181787-181834 placement
function isToolResultContent(content) {
  return content.type === "tool_result";
}
//@ chunk-hnxhr3bs.js:181834-181870 placement
function selectLoading(state) {
  return state.isLoading;
}
//@ chunk-hnxhr3bs.js:181870-181914 placement
function selectStreamingToolUses(state) {
  return state.streamingToolUses;
}
//@ chunk-hnxhr3bs.js:181914-181962 placement
function selectUserInputOnProcessing(state) {
  return state.userInputOnProcessing;
}
//@ chunk-hnxhr3bs.js:181962-182006 placement
function selectPlaceholderOrigin(state) {
  return state.placeholderOrigin;
}
//@ chunk-hnxhr3bs.js:182006-182061 placement
function selectFollowingPrompts(state) {
  return state.followingPromptsOnProcessing;
}
//@ chunk-hnxhr3bs.js:182061-182112 placement
function selectPlaceholderWaitedInQueue(state) {
  return state.placeholderWaitedInQueue;
}
//@ chunk-hnxhr3bs.js:182112-182150 placement
function selectIsBriefOnly(state) {
  return state.isBriefOnly;
}
//@ chunk-hnxhr3bs.js:182150-182184 placement
function selectVerbose_2_2(state) {
  return state.verbose;
}
//@ chunk-hnxhr3bs.js:182184-182223 placement
function selectSettledReply(state) {
  return state.settledReply;
}
//@ chunk-hnxhr3bs.js:182223-182254 placement
function selectUuid(state) {
  return state.uuid;
}
//@ chunk-hnxhr3bs.js:182254-182490 file-local
var BRIEF_TOOL_NAME; // deferred: loads other modules while loading; runs once its import cycle is complete
var SEND_USER_FILE_TOOL_NAME;
var isBriefEnabled;
var replyChannelProjectorModule;
var isPewterOwlTool;
var transcriptPlugin;
var replyPlugin;
deferInit("chunk-hnxhr3bs.js:182254", () => {
  BRIEF_TOOL_NAME = require("../tools/BriefTool/prompt.js").BRIEF_TOOL_NAME;
  SEND_USER_FILE_TOOL_NAME = require("../tools/SendUserFileTool/prompt.js").SEND_USER_FILE_TOOL_NAME;
  isBriefEnabled = require("../tools/BriefTool/BriefTool.js").isBriefEnabled;
  replyChannelProjectorModule = null;
  isPewterOwlTool = require("../tools/BriefTool/pewterOwl.js").isPewterOwlTool;
  transcriptPlugin = null;
  replyPlugin = null;
});
//@ chunk-hnxhr3bs.js:182490-183552 fingerprint (2.1.88 match: filterForBriefTool, 0.875)
function filterForBriefTool(messages, briefToolNames, briefOnlyToolNames) {
  let nameSet = new Set(briefToolNames);
  let briefOnlyNames = new Set(briefOnlyToolNames);
  let briefToolUseIDs = new Set();
  let briefToolUseIds = [];
  let humanTurnIndex = 0;
  for (let idx = 0; idx < messages.length; idx++) {
    let message = messages[idx];
    let firstBlock = message.message?.content[0];
    if (
      message.type === "user" &&
      firstBlock?.type !== "tool_result" &&
      (!message.isMeta || isNonHumanInboundOrigin(message.origin))
    )
      humanTurnIndex++;
    else if (
      message.type === "attachment" &&
      message.attachment?.type === "queued_command" &&
      message.attachment.commandMode === "prompt" &&
      (isNonHumanInboundOrigin(message.attachment.origin) ||
        (!message.attachment.isMeta && isHumanOrAutoContinuation(message.attachment.origin)))
    )
      humanTurnIndex++;
    else if (
      message.type === "assistant" &&
      firstBlock?.type === "tool_use" &&
      firstBlock.name &&
      briefOnlyNames.has(firstBlock.name)
    )
      briefToolUseIDs.add(humanTurnIndex);
    briefToolUseIds[idx] = humanTurnIndex;
  }
  let keptToolUseIds = new Set();
  return messages.filter((msg, index) => {
    if (msg.type === "system") return true;
    let block = msg.message?.content[0];
    if (msg.type === "assistant") {
      if (msg.isApiErrorMessage) return true;
      if (block?.type === "tool_use" && block.name && nameSet.has(block.name)) {
        if ("id" in block) keptToolUseIds.add(block.id);
        return true;
      }
      if (
        (block?.type === "text" || isSignedThinkingBlock(block)) &&
        !briefToolUseIDs.has(briefToolUseIds[index])
      )
        return true;
      return false;
    }
    if (msg.type === "user") {
      if (block?.type === "tool_result")
        return block.tool_use_id !== undefined && keptToolUseIds.has(block.tool_use_id);
      return !msg.isMeta || isNonHumanInboundOrigin(msg.origin);
    }
    if (msg.type === "attachment") {
      let att = msg.attachment;
      return (
        att?.type === "queued_command" &&
        att.commandMode === "prompt" &&
        (isNonHumanInboundOrigin(att.origin) || (!att.isMeta && isHumanOrAutoContinuation(att.origin)))
      );
    }
    return false;
  });
}
//@ chunk-hnxhr3bs.js:183552-184095 layout
function dropSucceededBriefTurns(messages, briefToolNames) {
  let toolNameSet = new Set(briefToolNames);
  let successfulTurns = new Set();
  let turnByToolUseId = new Map();
  let turnByMessageIndex = [];
  let humanTurnIndex = 0;
  for (let i = 0; i < messages.length; i++) {
    let message = messages[i];
    let firstBlock = message.message?.content[0];
    if (message.type === "user" && firstBlock?.type !== "tool_result" && !message.isMeta) {
      humanTurnIndex++;
      continue;
    }
    if (message.type === "assistant") {
      if (firstBlock?.type === "text" || isSignedThinkingBlock(firstBlock))
        turnByMessageIndex[i] = humanTurnIndex;
      else if (
        firstBlock?.type === "tool_use" &&
        firstBlock.name &&
        toolNameSet.has(firstBlock.name) &&
        firstBlock.id
      )
        turnByToolUseId.set(firstBlock.id, humanTurnIndex);
    } else if (
      message.type === "user" &&
      firstBlock?.type === "tool_result" &&
      firstBlock.tool_use_id &&
      turnByToolUseId.has(firstBlock.tool_use_id) &&
      !firstBlock.is_error
    )
      successfulTurns.add(turnByToolUseId.get(firstBlock.tool_use_id));
  }
  if (successfulTurns.size === 0) return messages;
  return messages.filter((message, index) => {
    let t = turnByMessageIndex[index];
    return t === undefined || !successfulTurns.has(t);
  });
}
//@ chunk-hnxhr3bs.js:184095-184123 layout
var MAX_RECENT_MESSAGES = 30;
var SLICE_STEP = 50;
var MAX_THINKING_ROWS = 200;
var GUTTER_WIDTH = 2;
//@ chunk-hnxhr3bs.js:184123-184271 layout
function isSplitUserMessagePart(message, prevType) {
  if (message.type !== "user" || prevType?.type !== "user") return false;
  let shortId = shortUuid(message);
  return (
    shortId !== undefined &&
    shortId === shortUuid(prevType) &&
    prevType.message.content[0]?.type !== "tool_result"
  );
}
//@ chunk-hnxhr3bs.js:184271-184382 layout
function findSpeakerLabelAbove(messages, startIndex) {
  let index = startIndex;
  while (index > 0 && isSplitUserMessagePart(messages[index], messages[index - 1])) index--;
  let candidate = messages[index - 1];
  return candidate?.type === "speaker_label" ? candidate : undefined;
}
//@ chunk-hnxhr3bs.js:184382-184426 layout
function streamingThinkingRows(rows, isFullscreen) {
  return isFullscreen ? Math.min(MAX_THINKING_ROWS, rows) : MAX_THINKING_ROWS;
}
//@ chunk-hnxhr3bs.js:184426-184745 layout
/**
 * 消息列表切片缓存：会话 id 或 verbose 变化时失效 preCap/slice。
 */
class MessagesSliceCache {
  conversationId;
  verbose;
  preCap = {
    current: null,
    advances: 0,
  };
  slice = {
    current: null,
    advances: 0,
  };
  constructor(conversationId, verbose) {
    this.conversationId = conversationId;
    this.verbose = verbose;
  }
  sync(conversationId, isVerbose) {
    if (this.conversationId !== conversationId) {
      this.conversationId = conversationId;
      this.preCap.current = null;
      this.slice.current = null;
    }
    if (this.verbose !== isVerbose) {
      this.verbose = isVerbose;
      this.slice.current = null;
    }
  }
}
//@ chunk-hnxhr3bs.js:184745-185135 fingerprint (2.1.88 match: computeSliceStart, 0.738)
function computeSliceStart(collapsed, anchorRef, cap, step = SLICE_STEP) {
  let anchor = anchorRef.current;
  let anchorIdx = anchor
    ? collapsed[anchor.idx]?.uuid === anchor.uuid
      ? anchor.idx
      : collapsed.findIndex((m) => m?.uuid === anchor.uuid)
    : -1;
  let start = anchorIdx >= 0 ? anchorIdx : anchor && anchor.idx < collapsed.length ? anchor.idx : 0;
  if (collapsed.length - start > cap + step) {
    start = collapsed.length - cap;
    if (anchorIdx >= 0 || (anchor !== null && anchor.idx < collapsed.length)) anchorRef.advances++;
  }
  let msgAtStart = collapsed[start];
  let uuid = typeof msgAtStart?.uuid === "string" ? msgAtStart.uuid : undefined;
  if (uuid !== undefined && (anchor?.uuid !== uuid || anchor.idx !== start))
    anchorRef.current = {
      uuid,
      idx: start,
    };
  else if (msgAtStart === undefined && anchor) anchorRef.current = null;
  return start;
}
//@ chunk-hnxhr3bs.js:185135-185427 layout
function adjustSliceStartForReplies(messages, start, step = SLICE_STEP) {
  if (transcriptPlugin === null) return start;
  let { isLabelledReply, replyRunRowAbove, sitsBetweenReplies } = transcriptPlugin;
  let index = start;
  while (index < messages.length && sitsBetweenReplies(messages[index])) index++;
  if (isLabelledReply(messages[index])) {
    let aboveRow = replyRunRowAbove(messages, index);
    while (aboveRow >= 0 && isLabelledReply(messages[aboveRow])) {
      if (aboveRow < start - step) return start;
      index = aboveRow;
      aboveRow = replyRunRowAbove(messages, index);
    }
  } else index = start;
  return index > 0 && messages[index - 1]?.type === "speaker_label" ? index - 1 : Math.min(index, start);
}
//@ chunk-hnxhr3bs.js:185427-204031 fingerprint (2.1.88 match: MessagesImpl, 0.507)
function MessagesImpl(props) {
  let $ = useMemoCache(294);
  let {
    messages,
    tools,
    commands,
    inProgressToolUseIDs,
    pauseAnimation,
    conversationId,
    screen,
    history,
    scriptSources,
    turn,
    streamingToolUses,
    isLoading,
    hasStreamingText,
    isBriefOnly,
    isFocusedTurnLoading,
    pendingPrompts,
    unseenDivider,
    scrollViewport,
    search,
    reveal,
    renderRange,
  } = props;
  let pauseAnimation_2 = pauseAnimation === undefined ? false : pauseAnimation;
  let isFullscreen = useIsFullscreen();
  let isTranscriptScreen = screen === "transcript";
  let isVerbose = useAppState(selectVerbose_2) || isTranscriptScreen;
  let hasHistory = history !== undefined;
  let isUncapped = history === "uncapped" || renderRange !== undefined;
  let briefEnabled = renderWithForceUpdate(isBriefEnabled);
  let briefMessagesOnly = isBriefOnly && briefEnabled;
  let showNotice = shouldShowNotice(isVerbose);
  let isTranscriptV2 = transcriptPlugin !== null && showNotice;
  let terminalSize = useTerminalSize();
  let spinnerWidth = isTranscriptV2 ? SPINNER_COLUMN_MIN_WIDTH : 0;
  let sizeLessSpinner;
  if ($[0] !== spinnerWidth || $[1] !== terminalSize) {
    sizeLessSpinner = shrinkTerminalSize(terminalSize, spinnerWidth);
    $[0] = spinnerWidth;
    $[1] = terminalSize;
    $[2] = sizeLessSpinner;
  } else sizeLessSpinner = $[2];
  let contentSize = sizeLessSpinner;
  let sizeLessGutter;
  if ($[3] !== contentSize) {
    sizeLessGutter = shrinkTerminalSize(contentSize, GUTTER_WIDTH);
    $[3] = contentSize;
    $[4] = sizeLessGutter;
  } else sizeLessGutter = $[4];
  let gutterSize = sizeLessGutter;
  let { columns, rows } = contentSize;
  let toggleShowAllShortcut = useShortcutDisplay("transcript:toggleShowAll", "Transcript", "Ctrl+E");
  let CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL = env.CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL;
  let briefTranscript = useAppState(selectBriefTranscript);
  let hasRemoteReplyChannel = useAppState(selectHasRemoteReplyChannel);
  let host = useHost();
  let normalizedMessages = resolveTranscriptMode(isVerbose, isTranscriptScreen);
  let activeAgents = useAppState(selectActiveAgents);
  let showMessageTimestamps = useAppState(selectShowMessageTimestamps);
  let silkHingeEnabled = renderWithForceUpdate(isSilkHingeEnabled);
  let showMessageTimestamps_2 = showMessageTimestamps && silkHingeEnabled;
  let appStoreDirect = useAppStoreDirect();
  let appState = useAppState(returnFalse_2);
  let unusedNull = null;
  let isVirtualized = scrollViewport != null && !CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL;
  let isStreamingThinkingVisible = streamingThinkingRows(rows, isFullscreen);
  let createSliceCache;
  if ($[5] !== conversationId || $[6] !== isVerbose) {
    createSliceCache = () => new MessagesSliceCache(conversationId, isVerbose);
    $[5] = conversationId;
    $[6] = isVerbose;
    $[7] = createSliceCache;
  } else createSliceCache = $[7];
  let [sliceCache] = useState(createSliceCache);
  sliceCache.sync(conversationId, isVerbose);
  let sliceStart =
    !isVirtualized && !isUncapped
      ? computeSliceStart(messages, sliceCache.preCap, isStreamingThinkingVisible * 2)
      : 0;
  let [emptySlice] = useState(createEmptySlice);
  let multiBlockScan = scanForMultiBlockMessage(messages, sliceStart, emptySlice);
  let [normalizer] = useState(createIncrementalNormalizer);
  let [progressSplitter] = useState(createProgressSplitter);
  let [toolUseTracker] = useState(createToolUseTracker);
  let [lookupsBuilder] = useState(createLookupsBuilder);
  let [collapser] = useState(createIncrementalCollapser);
  let [rowProjector] = useState(createRowProjector);
  let [bashSplitCache] = useState(createWeakMap);
  let [crossSessionBodies] = useState(createWeakMap_2);
  let content;
  if ($[8] !== messages || $[9] !== sliceStart) {
    content = sliceStart > 0 ? messages.slice(sliceStart) : messages;
    $[8] = messages;
    $[9] = sliceStart;
    $[10] = content;
  } else content = $[10];
  let content_2 = content;
  let filteredContent;
  if ($[11] !== content_2 || $[12] !== isVerbose) {
    filteredContent = isVerbose ? content_2 : filterFoldedScheduledTaskMessages(content_2);
    $[11] = content_2;
    $[12] = isVerbose;
    $[13] = filteredContent;
  } else filteredContent = $[13];
  let visibleContent = filteredContent;
  let normalized;
  if ($[14] !== normalizer || $[15] !== multiBlockScan || $[16] !== visibleContent) {
    normalized = normalizer.normalize(visibleContent, multiBlockScan);
    $[14] = normalizer;
    $[15] = multiBlockScan;
    $[16] = visibleContent;
    $[17] = normalized;
  } else normalized = $[17];
  let normalizedList = normalized;
  let split;
  if ($[18] !== normalizedList || $[19] !== progressSplitter) {
    split = progressSplitter.split(normalizedList);
    $[18] = normalizedList;
    $[19] = progressSplitter;
    $[20] = split;
  } else split = $[20];
  let { transcript, progress } = split;
  let latestBashOutputUuid;
  if ($[21] !== transcript) {
    Ct: {
      for (let idx = transcript.length - 1; idx >= 0; idx--) {
        let candidate = transcript[idx];
        if (candidate?.type === "user") {
          let content = candidate.message.content;
          for (const block_0 of content) {
            if (block_0.type === "text" && isBashOutputText(block_0.text)) {
              latestBashOutputUuid = candidate.uuid;
              break Ct;
            }
          }
        }
      }
      latestBashOutputUuid = null;
    }
    $[21] = transcript;
    $[22] = latestBashOutputUuid;
  } else latestBashOutputUuid = $[22];
  let latestBashOutputUuid_2 = latestBashOutputUuid;
  let tracked;
  if ($[23] !== toolUseTracker || $[24] !== transcript) {
    tracked = toolUseTracker.next(transcript);
    $[23] = toolUseTracker;
    $[24] = transcript;
    $[25] = tracked;
  } else tracked = $[25];
  let toolUses = tracked;
  let [dedupeState] = useState(createDedupeState);
  let dedupedStreaming;
  if (
    $[26] !== inProgressToolUseIDs ||
    $[27] !== toolUses ||
    $[28] !== dedupeState ||
    $[29] !== streamingToolUses
  ) {
    dedupedStreaming = dedupeState.next(streamingToolUses, inProgressToolUseIDs, toolUses);
    $[26] = inProgressToolUseIDs;
    $[27] = toolUses;
    $[28] = dedupeState;
    $[29] = streamingToolUses;
    $[30] = dedupedStreaming;
  } else dedupedStreaming = $[30];
  let streamingRows = dedupedStreaming;
  let [mintedIdCache] = useState(createWeakMap_3);
  let mintId;
  if ($[31] !== mintedIdCache) {
    mintId = (stu) => {
      let id = stu.contentBlock.id;
      if (isNonEmptyString(id)) {
        return {
          id,
          minted: false,
        };
      }
      let existingId = mintedIdCache.get(stu);
      if (existingId) {
        return {
          id: existingId,
          minted: true,
        };
      }
      let newId = randomUUID();
      mintedIdCache.set(stu, newId);
      return {
        id: newId,
        minted: true,
      };
    };
    $[31] = mintedIdCache;
    $[32] = mintId;
  } else mintId = $[32];
  let mintIdStable = mintId;
  let syntheticMessages;
  if ($[33] !== mintIdStable || $[34] !== streamingRows) {
    let buildSyntheticMessage;
    if ($[36] !== mintIdStable) {
      buildSyntheticMessage = (streamingToolUse) => {
        let { id, minted } = mintIdStable(streamingToolUse);
        let msg_1 = createAssistantMessage({
          content: [
            minted
              ? {
                  ...streamingToolUse.contentBlock,
                  id,
                }
              : streamingToolUse.contentBlock,
          ],
        });
        msg_1.uuid = minted ? id : deriveUUID(id, 0);
        return normalizeMessages([msg_1]);
      };
      $[36] = mintIdStable;
      $[37] = buildSyntheticMessage;
    } else buildSyntheticMessage = $[37];
    syntheticMessages = streamingRows.flatMap(buildSyntheticMessage);
    $[33] = mintIdStable;
    $[34] = streamingRows;
    $[35] = syntheticMessages;
  } else syntheticMessages = $[35];
  let syntheticStreamingToolUseMessages = syntheticMessages;
  let isWindowed = isTranscriptScreen && !hasHistory && !isVirtualized;
  let baseTranscript;
  if ($[38] !== isFullscreen || $[39] !== transcript || $[40] !== isVerbose) {
    baseTranscript =
      isVerbose || isFullscreen ? transcript : messagesSinceCompactBoundary(transcript, undefined);
    $[38] = isFullscreen;
    $[39] = transcript;
    $[40] = isVerbose;
    $[41] = baseTranscript;
  } else baseTranscript = $[41];
  let collapsedBase;
  let transcriptLookups;
  let hasTruncatedMessages;
  let hiddenMessageCount;
  let shownWindowUuids;
  if (
    $[42] !== activeAgents ||
    $[43] !== hasRemoteReplyChannel ||
    $[44] !== briefMessagesOnly ||
    $[45] !== isTranscriptScreen ||
    $[46] !== collapser ||
    $[47] !== isTranscriptV2 ||
    $[48] !== isWindowed ||
    $[49] !== syntheticStreamingToolUseMessages ||
    $[50] !== baseTranscript ||
    $[51] !== tools ||
    $[52] !== lookupsBuilder ||
    $[53] !== transcript ||
    $[54] !== isVerbose ||
    $[55] !== isVirtualized
  ) {
    const briefToolNames = baseTranscript.filter(isVisibleMessage);
    let showUserMessage;
    if ($[61] !== isTranscriptScreen) {
      showUserMessage = (candidate) => shouldShowUserMessage(candidate, isTranscriptScreen);
      $[61] = isTranscriptScreen;
      $[62] = showUserMessage;
    } else showUserMessage = $[62];
    let dropTextToolNames = briefToolNames.filter(showUserMessage);
    let reordered = reorderMessagesInUI(
      codeModeAccepted()
        ? require("../utils/codeMode/isReplScriptHelperCall.lazy.js").withoutScriptHelperPairs(
            dropTextToolNames,
          )
        : dropTextToolNames,
      syntheticStreamingToolUseMessages,
    );
    let messages =
      replyChannelProjectorModule !== null && hasRemoteReplyChannel
        ? replyChannelProjectorModule.projectReplyChannelToolUses(
            isTranscriptScreen || isVerbose
              ? reordered
              : replyChannelProjectorModule.dropReplyChannelNarration(reordered),
            {
              statusAsText: isTranscriptScreen || isVerbose,
            },
          )
        : reordered;
    let briefToolNames_2 = [BRIEF_TOOL_NAME, SEND_USER_FILE_TOOL_NAME];
    let briefOnlyToolNames = [BRIEF_TOOL_NAME];
    let briefFiltered =
      !isTranscriptScreen && (isBriefEnabled() || !isPewterOwlTool())
        ? briefMessagesOnly
          ? filterForBriefTool(messages, briefToolNames_2, briefOnlyToolNames)
          : dropSucceededBriefTurns(messages, briefOnlyToolNames)
        : messages;
    let briefFiltered_2 = briefFiltered;
    let windowed = isWindowed ? briefFiltered_2.slice(-MAX_RECENT_MESSAGES) : briefFiltered_2;
    let isTruncated = isWindowed && briefFiltered.length > MAX_RECENT_MESSAGES;
    let { messages: messages_2 } = groupToolUses(windowed, tools, isVerbose, activeAgents);
    let collapsed = collapseBackgroundBashNotifications(
      collapseHookSummaries(
        collapseHookAttachments(
          collapseTeammateShutdowns(
            collapseReadSearchGroups(
              messages_2,
              tools,
              {
                transcriptV2: isTranscriptV2,
                expandRows: isTranscriptScreen && isVirtualized,
              },
              collapser,
            ),
          ),
        ),
      ),
      isVerbose,
      isTranscriptV2,
    );
    let lookups = lookupsBuilder.build(transcript, windowed);
    let hiddenCount = reordered.length - MAX_RECENT_MESSAGES;
    collapsedBase = collapsed;
    transcriptLookups = lookups;
    hasTruncatedMessages = isTruncated;
    hiddenMessageCount = hiddenCount;
    shownWindowUuids = isTruncated ? windowed.map(messageUuid) : [];
    $[42] = activeAgents;
    $[43] = hasRemoteReplyChannel;
    $[44] = briefMessagesOnly;
    $[45] = isTranscriptScreen;
    $[46] = collapser;
    $[47] = isTranscriptV2;
    $[48] = isWindowed;
    $[49] = syntheticStreamingToolUseMessages;
    $[50] = baseTranscript;
    $[51] = tools;
    $[52] = lookupsBuilder;
    $[53] = transcript;
    $[54] = isVerbose;
    $[55] = isVirtualized;
    $[56] = collapsedBase;
    $[57] = transcriptLookups;
    $[58] = hasTruncatedMessages;
    $[59] = hiddenMessageCount;
    $[60] = shownWindowUuids;
  } else {
    collapsedBase = $[56];
    transcriptLookups = $[57];
    hasTruncatedMessages = $[58];
    hiddenMessageCount = $[59];
    shownWindowUuids = $[60];
  }
  let collapseResult;
  if (
    $[63] !== collapsedBase ||
    $[64] !== transcriptLookups ||
    $[65] !== hasTruncatedMessages ||
    $[66] !== hiddenMessageCount ||
    $[67] !== shownWindowUuids
  ) {
    collapseResult = {
      collapsedBase,
      transcriptLookups,
      hasTruncatedMessages,
      hiddenMessageCount,
      shownWindowUuids,
    };
    $[63] = collapsedBase;
    $[64] = transcriptLookups;
    $[65] = hasTruncatedMessages;
    $[66] = hiddenMessageCount;
    $[67] = shownWindowUuids;
    $[68] = collapseResult;
  } else collapseResult = $[68];
  let {
    collapsedBase: collapsedBase_2,
    transcriptLookups: transcriptLookups_2,
    hasTruncatedMessages: hasTruncatedMessages_2,
    hiddenMessageCount: hiddenMessageCount_2,
    shownWindowUuids: shownWindowUuids_2,
  } = collapseResult;
  let progressLookups;
  if ($[69] !== progress) {
    progressLookups = buildProgressLookups(progress);
    $[69] = progress;
    $[70] = progressLookups;
  } else progressLookups = $[70];
  let progressLookups_2 = progressLookups;
  let mergedLookups;
  if ($[71] !== progressLookups_2 || $[72] !== transcriptLookups_2) {
    mergedLookups = {
      ...transcriptLookups_2,
      ...progressLookups_2,
    };
    $[71] = progressLookups_2;
    $[72] = transcriptLookups_2;
    $[73] = mergedLookups;
  } else mergedLookups = $[73];
  let lookups_2 = mergedLookups;
  let navigableBase;
  PU: {
    let keepTextReplies =
      replyChannelProjectorModule !== null && hasRemoteReplyChannel && !isTranscriptScreen && !isVerbose;
    if (!(isFullscreen && (briefTranscript || keepTextReplies) && !isTranscriptScreen)) {
      navigableBase = collapsedBase_2;
      break PU;
    }
    let getTaskStats;
    if ($[74] !== appStoreDirect) {
      getTaskStats = (taskId) => {
        let task = appStoreDirect.getState().tasks[taskId];
        return task?.type === "local_agent" ? task.result?.toolStats : undefined;
      };
      $[74] = appStoreDirect;
      $[75] = getTaskStats;
    } else getTaskStats = $[75];
    let navigable;
    if (
      $[76] !== collapsedBase_2 ||
      $[77] !== isLoading ||
      $[78] !== keepTextReplies ||
      $[79] !== isTranscriptV2 ||
      $[80] !== getTaskStats ||
      $[81] !== tools
    ) {
      navigable = isNavigableMessage(collapsedBase_2, tools, getTaskStats, isLoading, {
        keepAllText: keepTextReplies,
        transcriptV2: isTranscriptV2,
      });
      $[76] = collapsedBase_2;
      $[77] = isLoading;
      $[78] = keepTextReplies;
      $[79] = isTranscriptV2;
      $[80] = getTaskStats;
      $[81] = tools;
      $[82] = navigable;
    } else navigable = $[82];
    navigableBase = navigable;
  }
  let navigableBase_2 = navigableBase;
  let transcriptMode = useTranscriptMode();
  let shouldCollapseTurns = transcriptMode || isVerbose;
  let deduped;
  if ($[83] !== navigableBase_2 || $[84] !== shouldCollapseTurns) {
    deduped = dropDuplicateRemoteErrors(
      dropRepeatedTurnDurations(navigableBase_2, shouldCollapseTurns),
      shouldCollapseTurns,
    );
    $[83] = navigableBase_2;
    $[84] = shouldCollapseTurns;
    $[85] = deduped;
  } else deduped = $[85];
  let transcriptMessages = deduped;
  let compactBoundary;
  if ($[86] !== messages || $[87] !== transcriptMode) {
    compactBoundary = transcriptMode ? null : findLeadingCompactBoundary(messages);
    $[86] = messages;
    $[87] = transcriptMode;
    $[88] = compactBoundary;
  } else compactBoundary = $[88];
  let compactBoundary_2 = compactBoundary;
  let uuid = compactBoundary_2?.uuid;
  let hasSummary = (compactBoundary_2?.summary ?? null) !== null;
  let transcriptPath = compactBoundary_2?.summary?.transcriptPath;
  let [savedInfo, setSavedInfo] = useState(null);
  if (savedInfo?.uuid !== uuid || savedInfo?.transcriptPath !== transcriptPath) {
    let materializedPath =
      isDiskless() || isRemoteSessionAvailable() || env.CLAUDE_CODE_TRANSCRIPT_LOCAL_GC === true
        ? null
        : getMaterializedSessionFile();
    setSavedInfo({
      uuid,
      transcriptPath,
      savedIn: transcriptPath === materializedPath ? transcriptPath : undefined,
    });
  }
  let savedIn = savedInfo?.savedIn;
  let compactValue;
  if ($[89] !== savedIn || $[90] !== hasSummary || $[91] !== uuid) {
    compactValue =
      uuid === undefined
        ? null
        : {
            uuid,
            summary: hasSummary
              ? {
                  savedIn,
                }
              : null,
          };
    $[89] = savedIn;
    $[90] = hasSummary;
    $[91] = uuid;
    $[92] = compactValue;
  } else compactValue = $[92];
  let value = compactValue;
  let [segmenter] = useState(createSegmenter);
  let pendingMessages;
  if ($[93] !== pendingPrompts) {
    pendingMessages = normalizeMessages(pendingPrompts.map(pendingToUserMessage));
    $[93] = pendingPrompts;
    $[94] = pendingMessages;
  } else pendingMessages = $[94];
  let pendingUserMessages = pendingMessages;
  let allMessages;
  if ($[95] !== transcriptMessages || $[96] !== pendingUserMessages || $[97] !== isTranscriptV2) {
    allMessages =
      isTranscriptV2 && pendingUserMessages.length > 0
        ? transcriptMessages.concat(pendingUserMessages)
        : transcriptMessages;
    $[95] = transcriptMessages;
    $[96] = pendingUserMessages;
    $[97] = isTranscriptV2;
    $[98] = allMessages;
  } else allMessages = $[98];
  let withPending = allMessages;
  let foldedAgents;
  if ($[99] !== transcriptMessages || $[100] !== isTranscriptV2) {
    foldedAgents =
      isTranscriptV2 && replyPlugin !== null ? replyPlugin.foldAgentMessages(transcriptMessages) : null;
    $[99] = transcriptMessages;
    $[100] = isTranscriptV2;
    $[101] = foldedAgents;
  } else foldedAgents = $[101];
  let foldedAgentMessages = foldedAgents;
  let collapsedMessages;
  BJ: {
    if (!isTranscriptV2 || segmenter === null) {
      collapsedMessages = transcriptMessages;
      break BJ;
    }
    let segmented;
    if (
      $[102] !== activeAgents ||
      $[103] !== foldedAgentMessages?.folded ||
      $[104] !== columns ||
      $[105] !== isFullscreen ||
      $[106] !== hasStreamingText ||
      $[107] !== host ||
      $[108] !== isFocusedTurnLoading ||
      $[109] !== lookups_2.progressMessagesByToolUseID ||
      $[110] !== uuid ||
      $[111] !== withPending ||
      $[112] !== segmenter ||
      $[113] !== tools
    ) {
      const progressMessagesByToolUseID = lookups_2.progressMessagesByToolUseID;
      let foldedAgentMessages_2;
      if ($[115] !== foldedAgentMessages?.folded) {
        foldedAgentMessages_2 = foldedAgentMessages?.folded ?? new Set();
        $[115] = foldedAgentMessages?.folded;
        $[116] = foldedAgentMessages_2;
      } else foldedAgentMessages_2 = $[116];
      segmented = segmenter.segment(withPending, {
        tools,
        activeAgents,
        host,
        columns,
        progressMessagesByToolUseID,
        isLoading: isFocusedTurnLoading,
        hasStreamingText,
        isFullscreen,
        compactionWithoutEarlierMessages: uuid,
        foldedAgentMessages: foldedAgentMessages_2,
      });
      $[102] = activeAgents;
      $[103] = foldedAgentMessages?.folded;
      $[104] = columns;
      $[105] = isFullscreen;
      $[106] = hasStreamingText;
      $[107] = host;
      $[108] = isFocusedTurnLoading;
      $[109] = lookups_2.progressMessagesByToolUseID;
      $[110] = uuid;
      $[111] = withPending;
      $[112] = segmenter;
      $[113] = tools;
      $[114] = segmented;
    } else segmented = $[114];
    collapsedMessages = segmented;
  }
  let messages_2 = collapsedMessages;
  let hasFoldedAgents = isTranscriptV2 && transcriptPlugin !== null && messages_2 !== withPending;
  let sliceResult;
  if (
    $[117] !== isUncapped ||
    $[118] !== hasFoldedAgents ||
    $[119] !== isStreamingThinkingVisible ||
    $[120] !== renderRange ||
    $[121] !== messages_2 ||
    $[122] !== sliceCache.slice ||
    $[123] !== isVirtualized
  ) {
    FJ: {
      let sliceStart =
        !isVirtualized && !isUncapped
          ? computeSliceStart(messages_2, sliceCache.slice, isStreamingThinkingVisible)
          : 0;
      if (renderRange) {
        let renderableMessages;
        if ($[125] !== renderRange[0] || $[126] !== renderRange[1] || $[127] !== messages_2) {
          renderableMessages = messages_2.slice(renderRange[0], renderRange[1]);
          $[125] = renderRange[0];
          $[126] = renderRange[1];
          $[127] = messages_2;
          $[128] = renderableMessages;
        } else renderableMessages = $[128];
        let sliceResult_2;
        if ($[129] !== renderRange[0] || $[130] !== renderableMessages) {
          sliceResult_2 = {
            renderableMessages,
            renderOffset: renderRange[0],
          };
          $[129] = renderRange[0];
          $[130] = renderableMessages;
          $[131] = sliceResult_2;
        } else sliceResult_2 = $[131];
        sliceResult = sliceResult_2;
        break FJ;
      }
      if (sliceStart > 0) {
        let adjustedStart = hasFoldedAgents ? adjustSliceStartForReplies(messages_2, sliceStart) : sliceStart;
        const renderableMessages = adjustedStart > 0 ? messages_2.slice(adjustedStart) : messages_2;
        let sliceResult_3;
        if ($[132] !== adjustedStart || $[133] !== renderableMessages) {
          sliceResult_3 = {
            renderableMessages,
            renderOffset: adjustedStart,
          };
          $[132] = adjustedStart;
          $[133] = renderableMessages;
          $[134] = sliceResult_3;
        } else sliceResult_3 = $[134];
        sliceResult = sliceResult_3;
        break FJ;
      }
      let sliceResult_4;
      if ($[135] !== messages_2) {
        sliceResult_4 = {
          renderableMessages: messages_2,
          renderOffset: 0,
        };
        $[135] = messages_2;
        $[136] = sliceResult_4;
      } else sliceResult_4 = $[136];
      sliceResult = sliceResult_4;
    }
    $[117] = isUncapped;
    $[118] = hasFoldedAgents;
    $[119] = isStreamingThinkingVisible;
    $[120] = renderRange;
    $[121] = messages_2;
    $[122] = sliceCache.slice;
    $[123] = isVirtualized;
    $[124] = sliceResult;
  } else sliceResult = $[124];
  let { renderableMessages, renderOffset } = sliceResult;
  let screenReaderMode;
  if ($[137] !== isVirtualized) {
    screenReaderMode = !isVirtualized && isScreenReaderMode();
    $[137] = isVirtualized;
    $[138] = screenReaderMode;
  } else screenReaderMode = $[138];
  let screenReaderLayout = screenReaderMode;
  let frontCutRef = useRef(null);
  let advancesRef = useRef(0);
  let shownWindowUuidsRef = useRef(shownWindowUuids_2);
  let frontCutCounter = useRef(0);
  let syncFrontCutEffect;
  if (
    $[139] !== screenReaderLayout ||
    $[140] !== shownWindowUuids_2 ||
    $[141] !== sliceCache.preCap.advances ||
    $[142] !== sliceCache.slice.advances
  ) {
    syncFrontCutEffect = () => {
      let prevUuids = shownWindowUuidsRef.current;
      shownWindowUuidsRef.current = shownWindowUuids_2;
      let prevFirst = prevUuids[0];
      let nextFirst = shownWindowUuids_2[0];
      if (
        prevFirst !== undefined &&
        nextFirst !== undefined &&
        !shownWindowUuids_2.includes(prevFirst) &&
        prevUuids.includes(nextFirst)
      )
        frontCutCounter.current = frontCutCounter.current + 1;
      let totalAdvances = sliceCache.preCap.advances + sliceCache.slice.advances + frontCutCounter.current;
      if (totalAdvances === advancesRef.current) {
        return;
      }
      advancesRef.current = totalAdvances;
      if (screenReaderLayout && frontCutRef.current !== null) setTranscriptFrontCut(frontCutRef.current);
    };
    $[139] = screenReaderLayout;
    $[140] = shownWindowUuids_2;
    $[141] = sliceCache.preCap.advances;
    $[142] = sliceCache.slice.advances;
    $[143] = syncFrontCutEffect;
  } else syncFrontCutEffect = $[143];
  useLayoutEffect(syncFrontCutEffect);
  let streamingIds;
  if ($[144] !== mintIdStable || $[145] !== streamingToolUses) {
    let idOf;
    if ($[147] !== mintIdStable) {
      idOf = (row) => mintIdStable(row).id;
      $[147] = mintIdStable;
      $[148] = idOf;
    } else idOf = $[148];
    streamingIds = new Set(streamingToolUses.map(idOf));
    $[144] = mintIdStable;
    $[145] = streamingToolUses;
    $[146] = streamingIds;
  } else streamingIds = $[146];
  let streamingIds_2 = streamingIds;
  let hasContentAfter = hasContentAfterIndex(renderableMessages, tools, streamingIds_2);
  let unseenIndex;
  if (
    $[149] !== foldedAgentMessages ||
    $[150] !== transcriptMessages ||
    $[151] !== renderableMessages ||
    $[152] !== isTranscriptV2 ||
    $[153] !== unseenDivider
  ) {
    HJ: {
      if (!unseenDivider) {
        unseenIndex = -1;
        break HJ;
      }
      let unseenUuidShort;
      let foundIndex;
      if (
        $[155] !== renderableMessages ||
        $[156] !== isTranscriptV2 ||
        $[157] !== unseenDivider.firstUnseenUuid
      ) {
        unseenUuidShort = unseenDivider.firstUnseenUuid.slice(0, UUID_PREFIX_LENGTH);
        foundIndex = findMessageIndexByShortUuid(renderableMessages, isTranscriptV2, unseenUuidShort);
        $[155] = renderableMessages;
        $[156] = isTranscriptV2;
        $[157] = unseenDivider.firstUnseenUuid;
        $[158] = unseenUuidShort;
        $[159] = foundIndex;
      } else {
        unseenUuidShort = $[158];
        foundIndex = $[159];
      }
      let foundIndex_2 = foundIndex;
      if (foundIndex_2 !== -1 || foldedAgentMessages === null) {
        unseenIndex = foundIndex_2;
        break HJ;
      }
      let index = transcriptMessages.findIndex((message) => shortUuid(message) === unseenUuidShort);
      let firstUnseen = index === -1 ? undefined : transcriptMessages[index];
      if (firstUnseen === undefined || !foldedAgentMessages.folded.has(firstUnseen)) {
        unseenIndex = -1;
        break HJ;
      }
      let selectedIdx = buildShortUuidIndex(renderableMessages, isTranscriptV2);
      for (let idx = index + 1; idx < transcriptMessages.length; idx++) {
        let message = transcriptMessages[idx];
        if (foldedAgentMessages.folded.has(message)) {
          continue;
        }
        let candidateShortUuid = shortUuid(message);
        let index = candidateShortUuid === undefined ? undefined : selectedIdx.get(candidateShortUuid);
        if (index !== undefined) {
          unseenIndex = index;
          break HJ;
        }
      }
      unseenIndex = -1;
    }
    $[149] = foldedAgentMessages;
    $[150] = transcriptMessages;
    $[151] = renderableMessages;
    $[152] = isTranscriptV2;
    $[153] = unseenDivider;
    $[154] = unseenIndex;
  } else unseenIndex = $[154];
  let unseenIndex_2 = unseenIndex;
  let replyHiddenRows;
  if (
    $[160] !== unseenIndex_2 ||
    $[161] !== hasFoldedAgents ||
    $[162] !== renderOffset ||
    $[163] !== renderableMessages ||
    $[164] !== messages_2
  ) {
    VJ: {
      let hiddenRows = new Set();
      if (!hasFoldedAgents) {
        replyHiddenRows = hiddenRows;
        break VJ;
      }
      let { isLabelledReply, replyRunRowAbove } = transcriptPlugin;
      for (let idx = 0; idx < renderableMessages.length; idx++) {
        if (!isLabelledReply(renderableMessages[idx])) {
          continue;
        }
        let prevMessage = messages_2[renderOffset + idx - 1];
        let onItemClick = replyRunRowAbove(renderableMessages, idx);
        if (
          prevMessage?.type === "speaker_label" ||
          (hiddenRows.has(onItemClick) && !(unseenIndex_2 > onItemClick && unseenIndex_2 <= idx))
        )
          hiddenRows.add(idx);
      }
      replyHiddenRows = hiddenRows;
    }
    $[160] = unseenIndex_2;
    $[161] = hasFoldedAgents;
    $[162] = renderOffset;
    $[163] = renderableMessages;
    $[164] = messages_2;
    $[165] = replyHiddenRows;
  } else replyHiddenRows = $[165];
  let replyHiddenRows_2 = replyHiddenRows;
  let lastReplyRow = hasFoldedAgents
    ? transcriptPlugin.replyRunRowAbove(renderableMessages, renderableMessages.length)
    : -1;
  let transcriptV2 = !hasFoldedAgents
    ? undefined
    : !transcriptPlugin.isLabelledReply(renderableMessages[lastReplyRow])
      ? "label"
      : replyHiddenRows_2.has(lastReplyRow) && unseenIndex_2 <= lastReplyRow
        ? "continues"
        : undefined;
  let [expandedKeys, setExpandedKeys] = useState(createIdSet);
  let toggleExpanded;
  if ($[166] !== expandedKeys) {
    toggleExpanded = (msg) => {
      let k = expandKey(msg);
      if (hasScriptPrefix(k) && !expandedKeys.has(k)) logFeatureOk("repl_script_source_open");
      setExpandedKeys((prev) => {
        let next = new Set(prev);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
    };
    $[166] = expandedKeys;
    $[167] = toggleExpanded;
  } else toggleExpanded = $[167];
  let onItemClick = toggleExpanded;
  let isExpanded;
  if ($[168] !== expandedKeys) {
    isExpanded = (msg_5) => expandedKeys.size > 0 && expandedKeys.has(expandKey(msg_5));
    $[168] = expandedKeys;
    $[169] = isExpanded;
  } else isExpanded = $[169];
  let isExpandedStable = isExpanded;
  let scriptSourceSelection;
  if ($[170] !== expandedKeys || $[171] !== scriptSources) {
    scriptSourceSelection =
      codeModeAccepted() && scriptSources
        ? {
            all: scriptSources === "whole",
            keys: expandedKeys,
          }
        : null;
    $[170] = expandedKeys;
    $[171] = scriptSources;
    $[172] = scriptSourceSelection;
  } else scriptSourceSelection = $[172];
  let scriptSourceSelectionStable = scriptSourceSelection;
  let reportMissingUuid;
  let reportDeps;
  if ($[173] !== host || $[174] !== renderableMessages || $[175] !== screen || $[176] !== isVirtualized) {
    reportMissingUuid = () => {
      reportMessageWithoutUuid(host, renderableMessages, {
        virtualized: isVirtualized,
        screen,
      });
    };
    reportDeps = [host, renderableMessages, isVirtualized, screen];
    $[173] = host;
    $[174] = renderableMessages;
    $[175] = screen;
    $[176] = isVirtualized;
    $[177] = reportMissingUuid;
    $[178] = reportDeps;
  } else {
    reportMissingUuid = $[177];
    reportDeps = $[178];
  }
  useEffect(reportMissingUuid, reportDeps);
  let inboundLabelRows;
  if ($[179] !== messages_2 || $[180] !== isTranscriptV2) {
    WJ: {
      let rows = new Set();
      if (!isTranscriptV2) {
        inboundLabelRows = rows;
        break WJ;
      }
      inboundLabelRows =
        (messages_2.forEach((message, idx) => {
          if (
            messages_2[idx - 1]?.type === "speaker_label" ||
            findSpeakerLabelAbove(messages_2, idx)?.speaker.kind === "inbound"
          )
            rows.add(message);
        }),
        rows);
    }
    $[179] = messages_2;
    $[180] = isTranscriptV2;
    $[181] = inboundLabelRows;
  } else inboundLabelRows = $[181];
  let inboundLabelRows_2 = inboundLabelRows;
  let isItemClickableRaw;
  if (
    $[182] !== bashSplitCache ||
    $[183] !== columns ||
    $[184] !== crossSessionBodies ||
    $[185] !== host ||
    $[186] !== isTranscriptScreen ||
    $[187] !== gutterSize ||
    $[188] !== latestBashOutputUuid_2 ||
    $[189] !== lookups_2 ||
    $[190] !== inboundLabelRows_2 ||
    $[191] !== scriptSourceSelectionStable ||
    $[192] !== tools ||
    $[193] !== isVerbose
  ) {
    isItemClickableRaw = (msg_6) => {
      if (msg_6.type === "collapsed_read_search") {
        return true;
      }
      if (msg_6.type === "attachment") {
        if (isVerbose || isTranscriptScreen) {
          return false;
        }
        if (msg_6.attachment?.type === "queued_command") {
          let trimmed = joinTextContent(msg_6.attachment.prompt).trim();
          if (inboundLabelRows_2.has(msg_6)) {
            return (
              isPeerOrObserver(msg_6.attachment.origin) &&
              agentMessageOverflows(msg_6, trimmed, msg_6.attachment.origin, gutterSize.columns)
            );
          }
          return (
            isPeerOrObserver(msg_6.attachment.origin) ||
            isTeammateMessageTextInSwarm(trimmed) ||
            isCrossSessionBodyHidden(crossSessionBodies, msg_6, trimmed, msg_6.attachment.origin)
          );
        }
        if (msg_6.attachment?.type === "teammate_mailbox") {
          return (
            Array.isArray(msg_6.attachment.messages) &&
            isPositiveCountInSwarm(msg_6.attachment.messages.length)
          );
        }
        return msg_6.attachment?.type === "goal_status" && !!msg_6.attachment.reason;
      }
      if (msg_6.type === "assistant") {
        let block = msg_6.message.content[0];
        if (
          scriptSourceSelectionStable !== null &&
          block?.type === "tool_use" &&
          isEvalToolCallName(block.name)
        ) {
          return getCode(block.input) !== undefined;
        }
        if (isVerbose || isTranscriptScreen) {
          return false;
        }
        return (
          block != null &&
          block.type === "advisor_tool_result" &&
          block.content?.type === "advisor_result" &&
          (!getErrorMessageIfRefusal(block) || getAdvisorRefusalText(block) !== undefined)
        );
      }
      if (msg_6.type !== "user") {
        return false;
      }
      let block = msg_6.message.content[0];
      if (block?.type === "text" && isBashOutputText(block.text)) {
        if (isVerbose || isTranscriptScreen || msg_6.uuid === latestBashOutputUuid_2) {
          return false;
        }
        return (
          mcpRenderOverrideFor(BashTool, "isResultTruncated")?.(
            {
              ...splitBashOutputCached(bashSplitCache, block),
              interrupted: false,
            },
            {
              columns,
            },
          ) ?? false
        );
      }
      if (block?.type === "text") {
        if (isVerbose || isTranscriptScreen) {
          return false;
        }
        if (inboundLabelRows_2.has(msg_6)) {
          return (
            isPeerOrObserver(msg_6.origin) &&
            typeof block.text === "string" &&
            agentMessageOverflows(msg_6, block.text, msg_6.origin, gutterSize.columns)
          );
        }
        return (
          isPeerOrObserver(msg_6.origin) ||
          (typeof block.text === "string" &&
            (isTeammateMessageTextInSwarm(block.text) ||
              isCrossSessionBodyHidden(crossSessionBodies, msg_6, block.text, msg_6.origin)))
        );
      }
      if (block?.type !== "tool_result") {
        return false;
      }
      if (block.is_error) {
        return exceedsTenLines(block.content);
      }
      if (!msg_6.toolUseResult) {
        return false;
      }
      let name = lookups_2.toolUseByToolUseID.get(block.tool_use_id)?.name;
      let tool = name ? (findToolByName(tools, name) ?? displayOnlyMcpTool(name, host)) : undefined;
      let toolUseResult = msg_6.toolUseResult;
      return (
        (tool
          ? mcpRenderOverrideFor(tool, "isResultTruncated")?.(toolUseResult, {
              columns,
            })
          : undefined) ?? false
      );
    };
    $[182] = bashSplitCache;
    $[183] = columns;
    $[184] = crossSessionBodies;
    $[185] = host;
    $[186] = isTranscriptScreen;
    $[187] = gutterSize;
    $[188] = latestBashOutputUuid_2;
    $[189] = lookups_2;
    $[190] = inboundLabelRows_2;
    $[191] = scriptSourceSelectionStable;
    $[192] = tools;
    $[193] = isVerbose;
    $[194] = isItemClickableRaw;
  } else isItemClickableRaw = $[194];
  let isItemClickable = isItemClickableRaw;
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let canAnimate = !pauseAnimation_2 && !dialogOfKind;
  let prevProgressState = useContext(TerminalWriteContext);
  let historyWriterEffect;
  let historyWriterDeps;
  if ($[195] !== prevProgressState) {
    historyWriterEffect = () => {
      if (!prevProgressState) {
        return;
      }
      setHistoryWriter(prevProgressState);
      return () => clearHistoryWriter(prevProgressState);
    };
    historyWriterDeps = [prevProgressState];
    $[195] = prevProgressState;
    $[196] = historyWriterEffect;
    $[197] = historyWriterDeps;
  } else {
    historyWriterEffect = $[196];
    historyWriterDeps = $[197];
  }
  useEffect(historyWriterEffect, historyWriterDeps);
  let itemKey;
  if ($[198] !== conversationId) {
    itemKey = (msg_7) => `${msg_7.uuid}-${conversationId}`;
    $[198] = conversationId;
    $[199] = itemKey;
  } else itemKey = $[199];
  let itemKey_2 = itemKey;
  let suggestionSlotEnabled = useContext(slashCommandLinkContext);
  let topNoticeBoundary;
  jJ: {
    if (!suggestionSlotEnabled) {
      topNoticeBoundary = 0;
      break jJ;
    }
    let firstNonInformationalIndex;
    if ($[200] !== messages_2) {
      firstNonInformationalIndex = messages_2.findIndex(isNotInformational);
      $[200] = messages_2;
      $[201] = firstNonInformationalIndex;
    } else firstNonInformationalIndex = $[201];
    let cutIndex = firstNonInformationalIndex;
    topNoticeBoundary = cutIndex === -1 ? messages_2.length : cutIndex;
  }
  let topNoticeCutIndex = topNoticeBoundary;
  let renderItem;
  if (
    $[202] !== canAnimate ||
    $[203] !== columns ||
    $[204] !== commands ||
    $[205] !== conversationId ||
    $[206] !== unseenIndex_2 ||
    $[207] !== hasStreamingText ||
    $[208] !== inProgressToolUseIDs ||
    $[209] !== isExpandedStable ||
    $[210] !== isLoading ||
    $[211] !== replyHiddenRows_2 ||
    $[212] !== gutterSize ||
    $[213] !== hasContentAfter ||
    $[214] !== latestBashOutputUuid_2 ||
    $[215] !== spinnerWidth ||
    $[216] !== lookups_2 ||
    $[217] !== itemKey_2 ||
    $[218] !== renderOffset ||
    $[219] !== renderableMessages ||
    $[220] !== rowProjector ||
    $[221] !== screen ||
    $[222] !== messages_2 ||
    $[223] !== showMessageTimestamps_2 ||
    $[224] !== streamingIds_2 ||
    $[225] !== tools ||
    $[226] !== topNoticeCutIndex ||
    $[227] !== turn?.armRateLimitAutoContinue ||
    $[228] !== turn?.openRateLimitOptions ||
    $[229] !== unseenDivider ||
    $[230] !== isVerbose
  ) {
    renderItem = (msg, index) => {
      let prevType = index > 0 ? renderableMessages[index - 1] : undefined;
      let isUserContinuation = msg.type === "user" && prevType?.type === "user";
      let isSplitUserContinuation = isSplitUserMessagePart(msg, prevType);
      let prevCollapsed = messages_2[renderOffset + index - 1];
      let afterInboundLabel =
        findSpeakerLabelAbove(messages_2, renderOffset + index)?.speaker.kind === "inbound";
      let followsSpeakerLabel = prevCollapsed?.type === "speaker_label";
      let continuesLabelledReply = !followsSpeakerLabel && replyHiddenRows_2.has(index);
      let joinsTopNotices = renderOffset + index < topNoticeCutIndex;
      let hasContentAfter_2 =
        msg.type === "collapsed_read_search" && (hasStreamingText || index < hasContentAfter);
      let afterInboundLabel_2 = afterInboundLabel;
      let k_0 = hasStringUuid(msg) ? itemKey_2(msg) : `no-uuid:${index}-${conversationId}`;
      let row = jsxProd_default(
        MessageRow,
        {
          message: msg,
          isUserContinuation,
          isSplitUserContinuation,
          followsSpeakerLabel,
          continuesLabelledReply,
          joinsTopNotices,
          followsInboundLabel: afterInboundLabel,
          hasContentAfter: hasContentAfter_2,
          tools,
          commands,
          verbose: isVerbose || isExpandedStable(msg),
          showMessageTimestamps: showMessageTimestamps_2,
          inProgressToolUseIDs,
          streamingToolUseIDs: streamingIds_2,
          screen,
          canAnimate,
          onOpenRateLimitOptions: turn?.openRateLimitOptions,
          onRateLimitAutoQueueContinue: turn?.armRateLimitAutoContinue,
          latestBashOutputUUID: latestBashOutputUuid_2,
          columns: afterInboundLabel_2 ? gutterSize.columns : columns,
          isLoading,
          lookups: rowProjector.forRow(msg, lookups_2),
        },
        k_0,
      );
      let wrapped = row;
      let gutterWidth = spinnerWidth + (afterInboundLabel_2 ? GUTTER_WIDTH : 0);
      if (gutterWidth > 0)
        wrapped = jsxProd_default_2(
          Box,
          {
            flexDirection: "row",
            children: [
              jsxProd_default(NoSelect, {
                fromLeftEdge: true,
                minWidth: gutterWidth,
              }),
              afterInboundLabel_2
                ? jsxProd_default(TerminalSizeContext, {
                    value: gutterSize,
                    children: row,
                  })
                : row,
            ],
          },
          `li-${k_0}`,
        );
      if (unseenDivider && index === unseenIndex_2) {
        return [
          jsxProd_default(
            Box,
            {
              marginTop: 1,
              paddingLeft: spinnerWidth,
              children: jsxProd_default(Divider, {
                title: `${unseenDivider.count} new ${plural(unseenDivider.count, "message")}`,
                width: columns,
                color: "inactive",
              }),
            },
            "unseen-divider",
          ),
          wrapped,
        ];
      }
      return wrapped;
    };
    $[202] = canAnimate;
    $[203] = columns;
    $[204] = commands;
    $[205] = conversationId;
    $[206] = unseenIndex_2;
    $[207] = hasStreamingText;
    $[208] = inProgressToolUseIDs;
    $[209] = isExpandedStable;
    $[210] = isLoading;
    $[211] = replyHiddenRows_2;
    $[212] = gutterSize;
    $[213] = hasContentAfter;
    $[214] = latestBashOutputUuid_2;
    $[215] = spinnerWidth;
    $[216] = lookups_2;
    $[217] = itemKey_2;
    $[218] = renderOffset;
    $[219] = renderableMessages;
    $[220] = rowProjector;
    $[221] = screen;
    $[222] = messages_2;
    $[223] = showMessageTimestamps_2;
    $[224] = streamingIds_2;
    $[225] = tools;
    $[226] = topNoticeCutIndex;
    $[227] = turn?.armRateLimitAutoContinue;
    $[228] = turn?.openRateLimitOptions;
    $[229] = unseenDivider;
    $[230] = isVerbose;
    $[231] = renderItem;
  } else renderItem = $[231];
  let renderItemStable = renderItem;
  let [searchTextCache] = useState(createWeakMap_4);
  let extractSearchTextImpl;
  if ($[232] !== lookups_2 || $[233] !== searchTextCache || $[234] !== tools) {
    extractSearchTextImpl = (msg) => {
      let cached = searchTextCache.get(msg);
      if (cached !== undefined) {
        return cached;
      }
      let text = getMessageSearchText(msg);
      let shouldCache = true;
      if (msg.type === "user" && msg.toolUseResult && Array.isArray(msg.message.content)) {
        let tr = msg.message.content.find(isToolResultContent);
        if (tr && "tool_use_id" in tr) {
          let tu = lookups_2.toolUseByToolUseID.get(tr.tool_use_id);
          shouldCache = tu !== undefined;
          let tool = tu && findToolByName(tools, tu.name);
          let extracted = tool?.outputSchema?.safeParse(msg.toolUseResult);
          let parsed = extracted?.data ?? msg.toolUseResult;
          let searchText =
            extracted === undefined || extracted.success ? tool?.extractSearchText?.(parsed) : undefined;
          if (searchText !== undefined) text = searchText;
        }
      }
      let lowered = text.toLowerCase();
      if (shouldCache) searchTextCache.set(msg, lowered);
      return lowered;
    };
    $[232] = lookups_2;
    $[233] = searchTextCache;
    $[234] = tools;
    $[235] = extractSearchTextImpl;
  } else extractSearchTextImpl = $[235];
  let extractSearchText = extractSearchTextImpl;
  let streamingTextRow;
  if (
    $[236] !== hasStreamingText ||
    $[237] !== briefMessagesOnly ||
    $[238] !== transcriptV2 ||
    $[239] !== turn
  ) {
    streamingTextRow =
      hasStreamingText && !briefMessagesOnly && turn
        ? jsxProd_default(StreamingTextRow, {
            store: turn.stream.previewStore,
            transcriptV2,
          })
        : null;
    $[236] = hasStreamingText;
    $[237] = briefMessagesOnly;
    $[238] = transcriptV2;
    $[239] = turn;
    $[240] = streamingTextRow;
  } else streamingTextRow = $[240];
  let streamingTextRow_2 = streamingTextRow;
  let children;
  if (
    $[241] !== columns ||
    $[242] !== extractSearchText ||
    $[243] !== isFullscreen ||
    $[244] !== isItemClickable ||
    $[245] !== isExpandedStable ||
    $[246] !== isTranscriptScreen ||
    $[247] !== itemKey_2 ||
    $[248] !== onItemClick ||
    $[249] !== renderItemStable ||
    $[250] !== renderableMessages ||
    $[251] !== reveal ||
    $[252] !== screenReaderLayout ||
    $[253] !== scrollViewport ||
    $[254] !== search?.jumpRef ||
    $[255] !== search?.onSearchMatchesChange ||
    $[256] !== search?.scanElement ||
    $[257] !== search?.setPositions ||
    $[258] !== isVirtualized
  ) {
    children = isVirtualized
      ? jsxProd_default(expandContextSignal.Provider, {
          value: true,
          children: jsxProd_default(VirtualMessageList, {
            messages: renderableMessages,
            scrollViewport,
            columns,
            itemKey: itemKey_2,
            renderItem: renderItemStable,
            onItemClick,
            isItemClickable,
            isItemExpanded: isExpandedStable,
            trackStickyPrompt: !isTranscriptScreen && isFullscreen,
            jumpRef: search?.jumpRef,
            revealRef: reveal,
            onSearchMatchesChange: search?.onSearchMatchesChange,
            scanElement: search?.scanElement,
            setPositions: search?.setPositions,
            extractSearchText,
          }),
        })
      : screenReaderLayout
        ? jsxProd_default(Box, {
            flexDirection: "column",
            ref: frontCutRef,
            children: renderableMessages.flatMap(renderItemStable),
          })
        : renderableMessages.flatMap(renderItemStable);
    $[241] = columns;
    $[242] = extractSearchText;
    $[243] = isFullscreen;
    $[244] = isItemClickable;
    $[245] = isExpandedStable;
    $[246] = isTranscriptScreen;
    $[247] = itemKey_2;
    $[248] = onItemClick;
    $[249] = renderItemStable;
    $[250] = renderableMessages;
    $[251] = reveal;
    $[252] = screenReaderLayout;
    $[253] = scrollViewport;
    $[254] = search?.jumpRef;
    $[255] = search?.onSearchMatchesChange;
    $[256] = search?.scanElement;
    $[257] = search?.setPositions;
    $[258] = isVirtualized;
    $[259] = children;
  } else children = $[259];
  let children_2 = children;
  const value_2 = foldedAgentMessages?.counts ?? monitorEventCache;
  let children_3;
  if ($[260] !== value || $[261] !== children_2) {
    children_3 = jsxProd_default(CompactSummaryContext, {
      value,
      children: children_2,
    });
    $[260] = value;
    $[261] = children_2;
    $[262] = children_3;
  } else children_3 = $[262];
  let withMonitorCache;
  if ($[263] !== value_2 || $[264] !== children_3) {
    withMonitorCache = jsxProd_default(monitorEventCacheStore, {
      value: value_2,
      children: children_3,
    });
    $[263] = value_2;
    $[264] = children_3;
    $[265] = withMonitorCache;
  } else withMonitorCache = $[265];
  let children_4 = withMonitorCache;
  let hiddenCountLabel;
  if ($[266] !== hiddenMessageCount_2 || $[267] !== screenReaderLayout) {
    hiddenCountLabel = screenReaderLayout ? "" : `${sequential.bold(hiddenMessageCount_2)} `;
    $[266] = hiddenMessageCount_2;
    $[267] = screenReaderLayout;
    $[268] = hiddenCountLabel;
  } else hiddenCountLabel = $[268];
  let hiddenCountLabel_2 = hiddenCountLabel;
  let showOlderDivider;
  if (
    $[269] !== columns ||
    $[270] !== hasTruncatedMessages_2 ||
    $[271] !== hiddenCountLabel_2 ||
    $[272] !== toggleShowAllShortcut
  ) {
    showOlderDivider =
      hasTruncatedMessages_2 &&
      jsxProd_default(Divider, {
        title: `${toggleShowAllShortcut} to show ${hiddenCountLabel_2}previous messages`,
        width: columns,
      });
    $[269] = columns;
    $[270] = hasTruncatedMessages_2;
    $[271] = hiddenCountLabel_2;
    $[272] = toggleShowAllShortcut;
    $[273] = showOlderDivider;
  } else showOlderDivider = $[273];
  let hideOlderDivider;
  if (
    $[274] !== columns ||
    $[275] !== isUncapped ||
    $[276] !== hiddenCountLabel_2 ||
    $[277] !== hiddenMessageCount_2 ||
    $[278] !== isTranscriptScreen ||
    $[279] !== hasHistory ||
    $[280] !== toggleShowAllShortcut
  ) {
    hideOlderDivider =
      isTranscriptScreen &&
      hasHistory &&
      hiddenMessageCount_2 > 0 &&
      !isUncapped &&
      jsxProd_default(Divider, {
        title: `${toggleShowAllShortcut} to hide ${hiddenCountLabel_2}previous messages`,
        width: columns,
      });
    $[274] = columns;
    $[275] = isUncapped;
    $[276] = hiddenCountLabel_2;
    $[277] = hiddenMessageCount_2;
    $[278] = isTranscriptScreen;
    $[279] = hasHistory;
    $[280] = toggleShowAllShortcut;
    $[281] = hideOlderDivider;
  } else hideOlderDivider = $[281];
  let withSuggestionSlot;
  if ($[282] !== children_4 || $[283] !== scriptSourceSelectionStable) {
    withSuggestionSlot = jsxProd_default(SuggestionSlot, {
      value: scriptSourceSelectionStable,
      children: children_4,
    });
    $[282] = children_4;
    $[283] = scriptSourceSelectionStable;
    $[284] = withSuggestionSlot;
  } else withSuggestionSlot = $[284];
  let withSpinnerGutter;
  if ($[285] !== spinnerWidth || $[286] !== streamingTextRow_2) {
    withSpinnerGutter =
      streamingTextRow_2 !== null && spinnerWidth > 0
        ? jsxProd_default_2(Box, {
            flexDirection: "row",
            children: [
              jsxProd_default(NoSelect, {
                fromLeftEdge: true,
                minWidth: spinnerWidth,
              }),
              streamingTextRow_2,
            ],
          })
        : streamingTextRow_2;
    $[285] = spinnerWidth;
    $[286] = streamingTextRow_2;
    $[287] = withSpinnerGutter;
  } else withSpinnerGutter = $[287];
  let finalContent;
  if (
    $[288] !== contentSize ||
    $[289] !== showOlderDivider ||
    $[290] !== hideOlderDivider ||
    $[291] !== withSuggestionSlot ||
    $[292] !== withSpinnerGutter
  ) {
    finalContent = jsxProd_default_2(TerminalSizeContext, {
      value: contentSize,
      children: [showOlderDivider, hideOlderDivider, withSuggestionSlot, withSpinnerGutter],
    });
    $[288] = contentSize;
    $[289] = showOlderDivider;
    $[290] = hideOlderDivider;
    $[291] = withSuggestionSlot;
    $[292] = withSpinnerGutter;
    $[293] = finalContent;
  } else finalContent = $[293];
  return finalContent;
}
//@ chunk-hnxhr3bs.js:204031-204238 layout
function findMessageIndexByShortUuid(renderableMessages, searchNested, shortId) {
  return renderableMessages.findIndex(
    (row) =>
      shortUuid(row) === shortId ||
      (searchNested &&
        ((row.type === "work_segment" && row.messages.some((message) => shortUuid(message) === shortId)) ||
          (row.type === "recap_fold" && row.notices.some((notice) => shortUuid(notice) === shortId)) ||
          collapsedRowOf(row)?.some((nested) => shortUuid(nested) === shortId) === true)),
  );
}
//@ chunk-hnxhr3bs.js:204238-204552 layout
/**
 * 为渲染行建立 短 uuid → 行下标 的索引；展开时也收录 work_segment/recap_fold 等折叠组内的消息。
 */
function buildShortUuidIndex(renderableMessages, includeNested) {
  let indexById = new Map();
  for (let idx = 0; idx < renderableMessages.length; idx++) {
    let row = renderableMessages[idx];
    let shortId = shortUuid(row);
    if (shortId !== undefined && !indexById.has(shortId)) indexById.set(shortId, idx);
    if (!includeNested) continue;
    let nested =
      row.type === "work_segment"
        ? row.messages
        : row.type === "recap_fold"
          ? row.notices
          : (collapsedRowOf(row) ?? undefined);
    if (nested === undefined) continue;
    for (let item of nested) {
      let nestedShortId = shortUuid(item);
      if (nestedShortId !== undefined && !indexById.has(nestedShortId)) indexById.set(nestedShortId, idx);
    }
  }
  return indexById;
}
//@ chunk-hnxhr3bs.js:204552-204744 file-local
function expandKey(msg) {
  if (codeModeAccepted() && msg.type === "assistant") {
    let firstBlock = msg.message.content[0];
    if (firstBlock?.type === "tool_use" && isEvalToolCallName(firstBlock.name))
      return withScriptPrefix(firstBlock.id);
  }
  return (msg.type === "assistant" || msg.type === "user" ? getToolUseID(msg) : null) ?? msg.uuid;
}
//@ chunk-hnxhr3bs.js:204744-204881 layout
function isCrossSessionBodyHidden(cache, text, body, origin) {
  if (isTaggedPeerText(body)) {
    let isHidden = cache.get(text);
    if (isHidden === undefined) {
      isHidden = crossSessionPreviewHidesBody(body, origin?.kind === "peer" && origin.hostInjected === true);
      cache.set(text, isHidden);
    }
    return isHidden;
  }
  return false;
}
//@ chunk-hnxhr3bs.js:204881-204972 file-local
function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (let item of a) if (!b.has(item)) return false;
  return true;
}
//@ chunk-hnxhr3bs.js:204972-204982 layout
var EMPTY_TOOL_USE_LIST = [];
//@ chunk-hnxhr3bs.js:204982-205036 layout
function isNonEmptyString(id) {
  return typeof id === "string" && id.length > 0;
}
//@ chunk-hnxhr3bs.js:205036-205129 layout
class StreamingToolUseDeduper {
  previous = EMPTY_TOOL_USE_LIST;
  next(streamingToolUses, inProgressIds, resolvedIds) {
    this.previous = dedupeStreamingToolUses(this.previous, streamingToolUses, inProgressIds, resolvedIds);
    return this.previous;
  }
}
//@ chunk-hnxhr3bs.js:205129-205376 layout
function dedupeStreamingToolUses(previous, previousList, inProgressIds, resolvedIds) {
  let seenIds = new Set();
  let deduped = [];
  for (let toolUse of previousList) {
    let id = toolUse.contentBlock.id;
    if (id) {
      let blockId = id;
      if (inProgressIds.has(blockId) || resolvedIds.has(blockId) || seenIds.has(blockId)) continue;
      seenIds.add(blockId);
    }
    deduped.push(toolUse);
  }
  if (deduped.length === 0) return EMPTY_TOOL_USE_LIST;
  if (deduped.length === previous.length && deduped.every((item, index) => item === previous[index]))
    return previous;
  return deduped;
}
//@ chunk-hnxhr3bs.js:205376-205421 layout
function keepPreviousIfSame(previous, messages, canReuse) {
  return canReuse && previous[0] === messages[0] ? previous : messages;
}
//@ chunk-hnxhr3bs.js:205421-206106 fingerprint (2.1.88 match: Messages, 0.794)
/**
 * 消息列表组件：MessagesImpl 的 memo 版本，自定义比较忽略 scrollViewport/search/reveal，并对 streamingToolUses、inProgressToolUseIDs、unseenDivider、tools 做浅比较。
 */
var Messages; // deferred: uses MessagesImpl of its import cycle while loading; runs once the cycle is complete
var EMPTY_ID_SET;
var EMPTY_ARRAY_A;
var EMPTY_ARRAY_B;
var EMPTY_ARRAY_C;
deferInit("chunk-hnxhr3bs.js:205421", () => {
  Messages = memo(MessagesImpl, (prev, next) => {
    let keys = Object.keys(prev);
    for (let key of keys) {
      if (key === "scrollViewport" || key === "search" || key === "reveal") continue;
      if (prev[key] !== next[key]) {
        if (key === "streamingToolUses") {
          let streamingToolUses = prev.streamingToolUses;
          let n = next.streamingToolUses;
          if (
            streamingToolUses.length === n.length &&
            streamingToolUses.every((item, i) => item.contentBlock === n[i]?.contentBlock)
          )
            continue;
        }
        if (key === "inProgressToolUseIDs") {
          if (setsEqual(prev.inProgressToolUseIDs, next.inProgressToolUseIDs)) continue;
        }
        if (key === "unseenDivider") {
          let unseenDivider = prev.unseenDivider;
          let n = next.unseenDivider;
          if (unseenDivider?.firstUnseenUuid === n?.firstUnseenUuid && unseenDivider?.count === n?.count)
            continue;
        }
        if (key === "tools") {
          let tools = prev.tools;
          let n = next.tools;
          if (tools.length === n.length && tools.every((tool, i) => tool.name === n[i]?.name)) continue;
        }
        return false;
      }
    }
    return true;
  });
  EMPTY_ID_SET = new Set();
  EMPTY_ARRAY_A = [];
  EMPTY_ARRAY_B = [];
  EMPTY_ARRAY_C = [];
});
export {
  useCommandQueue,
  unansweredToolBriefs,
  selectLoading,
  selectStreamingToolUses,
  EMPTY_TOOL_USE_LIST,
  selectUserInputOnProcessing,
  selectPlaceholderOrigin,
  selectFollowingPrompts,
  EMPTY_ARRAY_B,
  selectPlaceholderWaitedInQueue,
  selectIsBriefOnly,
  selectVerbose_2_2,
  EMPTY_ARRAY_A,
  keepPreviousIfSame,
  selectSettledReply,
  EMPTY_ARRAY_C,
  selectUuid,
  transcriptPlugin,
  EMPTY_ID_SET,
  Messages,
  TerminalTaskProgress,
  LogoHeader,
  shrinkTerminalSize,
  INTERRUPT_MESSAGE_TEXTS,
  shouldRenderStatically,
  getMessageSearchText,
  SuggestionSlot,
  withScriptPrefix,
  getCode,
};
