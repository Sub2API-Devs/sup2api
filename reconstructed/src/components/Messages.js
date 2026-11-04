/**
 * components/Messages.tsx
 *
 * 消息列表（MessagesImpl）：过滤/折叠/分组消息、brief 模式裁剪、按阈值切片（transcript 显示全部切换）、交给 VirtualMessageList 或静态渲染。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Messages.tsx
 * pieces: chunk-0sfjpx19.js (1), chunk-ag5x7vhf.js (80)
 * attribution: fingerprint 6, callgraph-fingerprint 1, placement 55, sole-consumer 1, file-local 3, layout 15
 */
import { randomUUID } from "crypto";
import {
  hasToolResultBlock,
  hasMultipleContentBlocks,
  normalizeMessages,
  isNotEmptyMessage,
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  getToolUseID,
  hasUnresolvedHooksFromLookup,
  TranscriptProgressSplitter,
  UnresolvedToolUseTracker,
  MessageLookupsBuilder,
  RowLookupsProjector,
  createUserMessage,
  filterFoldedScheduledTaskMessages,
  createAssistantMessage,
  deriveUUID,
  shouldShowUserMessage,
  reorderMessagesInUI,
  buildProgressLookups,
  UUID_PREFIX_LENGTH,
  isTeammateMessageTextInSwarm,
  isPositiveCountInSwarm,
} from "../utils/messages.js";
import {
  memo,
  suspenseTypeExport,
  init_react_production,
  useSyncExternalStore,
  useRef,
  useEffect,
  createContext,
  useState,
  useLayoutEffect,
  useContext,
} from "../../vendor/react/cjs/react.production.js";
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
import { RetainedOutputChecker } from "../utils/messages/incrementalNormalizer.js";
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
import { shouldShowNotice } from "./SlashCommandLink.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { SPINNER_COLUMN_MIN_WIDTH } from "./Spinner/SpinnerColumn.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { env } from "../utils/env.js";
import { resolveTranscriptMode, useTranscriptMode } from "./messages/transcriptModeContext.js";
import { isBashOutputText } from "../constants/xml.js";
import { messagesSinceCompactBoundary } from "../services/projects/threadRows.js";
import { countToolCallsSince_2 } from "../utils/groupToolUses.js";
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
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { agentMessageOverflows } from "./messages/AgentMessage.js";
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

//@ chunk-0sfjpx19.js:33717-34121 fingerprint = dropTextInBriefTurns (1)
function dropTextInBriefTurns(snapshot) {
  let briefByTurn = new Map();
  let turnsWithBrief = new Set();
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
      if (typeof block !== "string" && block.type === "tool_result") turnsWithBrief.add(block.tool_use_id);
  }
  for (let toolUseId of turnsWithBrief) briefByTurn.delete(toolUseId);
  return briefByTurn;
}
//@ chunk-ag5x7vhf.js:117168-117911 callgraph-fingerprint = LogoHeader (0.199)
var LogoHeader; // deferred: uses useSessionOrUndefined (../context/session.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ag5x7vhf.js:117168", () => {
  LogoHeader = memo(function (props) {
    let $ = useMemoCache(14);
    let { latchAnnouncementSlot, hideWelcomeChrome, homeMessage, hideLogo } = props;
    let latchAnnouncement = latchAnnouncementSlot === undefined ? true : latchAnnouncementSlot;
    let hideWelcome = hideWelcomeChrome === undefined ? false : hideWelcomeChrome;
    let homeMessageFlag = homeMessage === undefined ? false : homeMessage;
    let hideLogo_2 = hideLogo === undefined ? false : hideLogo;
    let hasSession = useSessionOrUndefined() !== undefined;
    const flexGrow = homeMessageFlag ? 1 : 0;
    let updateSummary;
    if ($[0] !== hideLogo_2 || $[1] !== hideWelcome) {
      updateSummary =
        !hideWelcome &&
        jsxProd_default(StartupUpdateSummary, {
          hideLogo: hideLogo_2,
        });
      $[0] = hideLogo_2;
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
    if ($[7] !== flexGrow || $[8] !== updateSummary || $[9] !== logoElement) {
      children = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        flexGrow,
        children: [updateSummary, null, logoElement],
      });
      $[7] = flexGrow;
      $[8] = updateSummary;
      $[9] = logoElement;
      $[10] = children;
    } else children = $[10];
    let freezeWhenOffscreenElement;
    if ($[11] !== latchAnnouncement || $[12] !== children) {
      freezeWhenOffscreenElement = jsxProd_default(FreezeWhenOffscreen, {
        children: jsxProd_default(noticeImpressionEnabled.Provider, {
          value: latchAnnouncement,
          children,
        }),
      });
      $[11] = latchAnnouncement;
      $[12] = children;
      $[13] = freezeWhenOffscreenElement;
    } else freezeWhenOffscreenElement = $[13];
    return freezeWhenOffscreenElement;
  });
});
//@ chunk-ag5x7vhf.js:126968-127017 placement
function createEmptySlice() {
  return {
    head: undefined,
    upTo: 0,
    seed: false,
  };
}
//@ chunk-ag5x7vhf.js:127017-127168 placement
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
//@ chunk-ag5x7vhf.js:127168-128928 sole-consumer
/**
 * UI 侧增量规范化缓存：复用与上次输入相同的前后缀（末尾 RECENT=4 条总是重算），只对变化部分调用 normalizeMessages；探针发现损坏时整体重建（damageRebuilds）。
 */
class IncrementalMessageNormalizer {
  cache;
  static RECENT = 4;
  static PRUNE_PENDING_AT = 64;
  input = [];
  output = [];
  starts = [0];
  chainAt = [false];
  pending = new Map();
  lastWalked = 0;
  damageRebuilds = 0;
  probe = new RetainedOutputChecker();
  inputLength = 0;
  constructor(cache) {
    this.cache = cache;
  }
  normalize(messages, chainFlag) {
    let input = this.input;
    let max = Math.max(0, messages.length - IncrementalMessageNormalizer.RECENT);
    let headMatches = 0;
    let tailMatches = 0;
    if (this.chainAt[0] === chainFlag) {
      let min = Math.min(input.length, max);
      while (headMatches < min && input[headMatches] === messages[headMatches]) headMatches++;
      let min_2 = Math.min(input.length - headMatches, max - headMatches);
      while (
        tailMatches < min_2 &&
        input[input.length - 1 - tailMatches] === messages[messages.length - 1 - tailMatches]
      )
        tailMatches++;
    }
    if (input.length !== this.inputLength) {
      headMatches = 0;
      tailMatches = 0;
    }
    if (
      !this.probe.intact(
        this.output,
        this.starts,
        this.chainAt,
        headMatches,
        tailMatches,
        this.inputLength,
        messages.length,
        "normalize",
      )
    ) {
      headMatches = 0;
      tailMatches = 0;
      this.input = [];
      this.inputLength = 0;
      this.output = [];
      this.starts = [0];
      this.chainAt = [false];
      this.damageRebuilds++;
    }
    let sliced = this.output.slice(0, this.starts[headMatches]);
    let sliced_2 = this.starts.slice(0, headMatches + 1);
    let sliced_3 = this.chainAt.slice(0, headMatches + 1);
    if (headMatches === 0) sliced_3[0] = chainFlag;
    let chain = sliced_3[headMatches];
    let walked = 0;
    let walkRange = (from, to) => {
      for (let index = from; index < to; index++) {
        let message = messages[index];
        for (let normalized of normalizeMessages([message], chain, this.cache))
          if (isNotEmptyMessage(normalized)) sliced.push(normalized);
        this.notePending(message, chain);
        if (hasMultipleContentBlocks(message)) chain = true;
        sliced_2.push(sliced.length);
        sliced_3.push(chain);
        walked++;
      }
    };
    let tailStart = messages.length - tailMatches;
    walkRange(headMatches, tailStart);
    let tailIndex = input.length - tailMatches;
    if (tailMatches > 0 && this.chainAt[tailIndex] === chain) {
      let offset = sliced.length - this.starts[tailIndex];
      for (let index = this.starts[tailIndex]; index < this.output.length; index++)
        sliced.push(this.output[index]);
      for (let idx = tailIndex + 1; idx <= input.length; idx++) {
        sliced_2.push(this.starts[idx] + offset);
        sliced_3.push(this.chainAt[idx]);
      }
    } else walkRange(tailStart, messages.length);
    this.refreshPending(messages);
    this.input = messages;
    this.inputLength = messages.length;
    this.output = sliced;
    this.starts = sliced_2;
    this.chainAt = sliced_3;
    this.lastWalked = walked;
    return sliced;
  }
  notePending(message, chain) {
    if (message.type !== "assistant") return;
    if (message.message.stop_reason === null) this.pending.set(message, chain);
    else this.pending.delete(message);
  }
  refreshPending(messages) {
    if (this.pending.size === 0) return;
    let liveSet =
      this.pending.size > IncrementalMessageNormalizer.PRUNE_PENDING_AT ? new Set(messages) : null;
    for (let [message, chain] of this.pending) {
      if (liveSet !== null && !liveSet.has(message)) {
        this.pending.delete(message);
        continue;
      }
      normalizeMessages([message], chain, this.cache);
      this.notePending(message, chain);
    }
  }
}
//@ chunk-ag5x7vhf.js:136421-136460 placement
var INTERRUPT_MESSAGE_TEXTS; // deferred: uses INTERRUPT_MESSAGE (../utils/messages.js) of its import cycle while loading; runs once the cycle is complete
var weakMap_3;
deferInit("chunk-ag5x7vhf.js:136421", () => {
  INTERRUPT_MESSAGE_TEXTS = new Set([INTERRUPT_MESSAGE, INTERRUPT_MESSAGE_FOR_TOOL_USE]);
  weakMap_3 = new WeakMap();
});
//@ chunk-ag5x7vhf.js:136460-136561 placement
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
//@ chunk-ag5x7vhf.js:138975-138979 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:138975", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:147372-148064 fingerprint = shouldRenderStatically (0.736)
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
//@ chunk-ag5x7vhf.js:148068-148926 placement
/**
 * 说话人标签组件槽（初始 null）；同一声明里的 ql 是流式输出文本行组件。
 */
var speakerLabelComponent; // deferred: uses Box (../ink/components/Text.js) of its import cycle while loading; runs once the cycle is complete
var StreamingTextRow;
deferInit("chunk-ag5x7vhf.js:148068", () => {
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
//@ chunk-ag5x7vhf.js:148926-148930 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:148926", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:148930-148934 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:148930", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:148934-149008 placement
function useCommandQueue() {
  let commandQueueOrDefault = useCommandQueueOrDefault();
  return useSyncExternalStore(commandQueueOrDefault.subscribe, commandQueueOrDefault.getCommandQueueSnapshot);
}
//@ chunk-ag5x7vhf.js:149162-149198 placement
function selectIsLoading(state) {
  return state.isLoading;
}
//@ chunk-ag5x7vhf.js:149198-149230 placement
function selectTasks(state) {
  return state.tasks;
}
//@ chunk-ag5x7vhf.js:149230-149293 placement
function terminalProgressEnabled() {
  return resolveSetting("terminalProgressBarEnabled", true).value;
}
//@ chunk-ag5x7vhf.js:149293-149989 placement
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
//@ chunk-ag5x7vhf.js:149989-149993 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:149989", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:149993-150071 placement
function shrinkTerminalSize(size, reservedColumns) {
  return reservedColumns === 0
    ? size
    : {
        columns: Math.max(1, size.columns - reservedColumns),
        rows: size.rows,
      };
}
//@ chunk-ag5x7vhf.js:150628-150632 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:150628", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:150632-150636 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:150632", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:151691-151707 placement
var SuggestionSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:151691", () => {
  SuggestionSlot = createContext(null);
});
//@ chunk-ag5x7vhf.js:151707-151711 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:151707", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:151711-151715 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:151711", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:158357-158361 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:158357", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:176529-176563 placement
function selectVerbose_2(state) {
  return state.verbose;
}
//@ chunk-ag5x7vhf.js:176563-176605 placement
function selectBriefTranscript(state) {
  return state.briefTranscript;
}
//@ chunk-ag5x7vhf.js:176605-176653 placement
function selectHasRemoteReplyChannel(state) {
  return state.hasRemoteReplyChannel;
}
//@ chunk-ag5x7vhf.js:176653-176709 placement
function selectActiveAgents(state) {
  return state.agentDefinitions.activeAgents;
}
//@ chunk-ag5x7vhf.js:176709-176757 placement
function selectShowMessageTimestamps(state) {
  return state.showMessageTimestamps;
}
//@ chunk-ag5x7vhf.js:176757-176803 placement
function isSilkHingeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_silk_hinge", false);
}
//@ chunk-ag5x7vhf.js:176803-176828 placement
function returnFalse_2(state) {
  return false;
}
//@ chunk-ag5x7vhf.js:176828-176869 placement
function createIncrementalNormalizer() {
  return new IncrementalMessageNormalizer(new WeakMap());
}
//@ chunk-ag5x7vhf.js:176869-176897 placement
function createProgressSplitter() {
  return new TranscriptProgressSplitter();
}
//@ chunk-ag5x7vhf.js:176897-176925 placement
function createToolUseTracker() {
  return new UnresolvedToolUseTracker();
}
//@ chunk-ag5x7vhf.js:176925-176953 placement
function createLookupsBuilder() {
  return new MessageLookupsBuilder();
}
//@ chunk-ag5x7vhf.js:176953-176982 placement
function createIncrementalCollapser() {
  return new IncrementalCollapser();
}
//@ chunk-ag5x7vhf.js:176982-177010 placement
function createRowProjector() {
  return new RowLookupsProjector();
}
//@ chunk-ag5x7vhf.js:177010-177043 placement
function createWeakMap() {
  return new WeakMap();
}
//@ chunk-ag5x7vhf.js:177043-177076 placement
function createWeakMap_2() {
  return new WeakMap();
}
//@ chunk-ag5x7vhf.js:177076-177104 placement
function createDedupeState() {
  return new StreamingToolUseDeduper();
}
//@ chunk-ag5x7vhf.js:177104-177137 placement
function createWeakMap_3() {
  return new WeakMap();
}
//@ chunk-ag5x7vhf.js:177137-177167 placement
function isVisibleMessage(message) {
  return !isInvisibleMessage(message);
}
//@ chunk-ag5x7vhf.js:177167-177198 placement
function messageUuid(message) {
  return message.uuid;
}
//@ chunk-ag5x7vhf.js:177198-177261 placement
function createSegmenter() {
  return transcriptPlugin === null ? null : new transcriptPlugin.TranscriptSegmenter();
}
//@ chunk-ag5x7vhf.js:177261-177351 placement
function pendingToUserMessage(pending, imageId) {
  let { text, origin } = pending;
  return createUserMessage({
    content: text,
    origin,
    uuid: placeholderImageId(imageId),
  });
}
//@ chunk-ag5x7vhf.js:177351-177380 placement
function createIdSet() {
  return new Set();
}
//@ chunk-ag5x7vhf.js:177380-177413 placement
function createWeakMap_4() {
  return new WeakMap();
}
//@ chunk-ag5x7vhf.js:177413-177460 placement
function isToolResultContent(content) {
  return content.type === "tool_result";
}
//@ chunk-ag5x7vhf.js:177460-177496 placement
function selectLoading(state) {
  return state.isLoading;
}
//@ chunk-ag5x7vhf.js:177496-177540 placement
function selectStreamingToolUses(state) {
  return state.streamingToolUses;
}
//@ chunk-ag5x7vhf.js:177540-177588 placement
function selectUserInputOnProcessing(state) {
  return state.userInputOnProcessing;
}
//@ chunk-ag5x7vhf.js:177588-177632 placement
function selectPlaceholderOrigin(state) {
  return state.placeholderOrigin;
}
//@ chunk-ag5x7vhf.js:177632-177687 placement
function selectFollowingPrompts(state) {
  return state.followingPromptsOnProcessing;
}
//@ chunk-ag5x7vhf.js:177687-177738 placement
function selectPlaceholderWaitedInQueue(state) {
  return state.placeholderWaitedInQueue;
}
//@ chunk-ag5x7vhf.js:177738-177776 placement
function selectIsBriefOnly(state) {
  return state.isBriefOnly;
}
//@ chunk-ag5x7vhf.js:177776-177810 placement
function selectVerbose_2_2(state) {
  return state.verbose;
}
//@ chunk-ag5x7vhf.js:177810-177849 placement
function selectSettledReply(state) {
  return state.settledReply;
}
//@ chunk-ag5x7vhf.js:177849-177880 placement
function selectUuid(state) {
  return state.uuid;
}
//@ chunk-ag5x7vhf.js:177880-178116 file-local
var BRIEF_TOOL_NAME; // deferred: loads other modules while loading; runs once its import cycle is complete
var SEND_USER_FILE_TOOL_NAME;
var isBriefEnabled;
var replyChannelProjectorModule;
var isPewterOwlTool;
var transcriptPlugin;
var replyPlugin;
deferInit("chunk-ag5x7vhf.js:177880", () => {
  BRIEF_TOOL_NAME = require("../tools/BriefTool/prompt.js").BRIEF_TOOL_NAME;
  SEND_USER_FILE_TOOL_NAME = require("../tools/SendUserFileTool/prompt.js").SEND_USER_FILE_TOOL_NAME;
  isBriefEnabled = require("../tools/BriefTool/BriefTool.js").isBriefEnabled;
  replyChannelProjectorModule = null;
  isPewterOwlTool = require("../tools/BriefTool/pewterOwl.js").isPewterOwlTool;
  transcriptPlugin = null;
  replyPlugin = null;
});
//@ chunk-ag5x7vhf.js:178116-179178 fingerprint = filterForBriefTool (0.892)
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
//@ chunk-ag5x7vhf.js:179178-179721 layout = hasSuccessfulToolCall (0.85)
function hasSuccessfulToolCall(messages, toolName) {
  let toolNameSet = new Set(toolName);
  let successfulTurns = new Set();
  let turnByToolUseId = new Map();
  let turnByMessageIndex = [];
  let humanTurnIndex = 0;
  for (let idx = 0; idx < messages.length; idx++) {
    let message = messages[idx];
    let firstBlock = message.message?.content[0];
    if (message.type === "user" && firstBlock?.type !== "tool_result" && !message.isMeta) {
      humanTurnIndex++;
      continue;
    }
    if (message.type === "assistant") {
      if (firstBlock?.type === "text" || isSignedThinkingBlock(firstBlock))
        turnByMessageIndex[idx] = humanTurnIndex;
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
    let toolName = turnByMessageIndex[index];
    return toolName === undefined || !successfulTurns.has(toolName);
  });
}
//@ chunk-ag5x7vhf.js:179721-179749 layout
var MAX_RECENT_MESSAGES = 30;
var SLICE_STEP = 50;
var MAX_THINKING_ROWS = 200;
var GUTTER_WIDTH = 2;
//@ chunk-ag5x7vhf.js:179749-179897 layout
function isSplitUserMessagePart(msg, prevType) {
  if (msg.type !== "user" || prevType?.type !== "user") return false;
  let shortId = shortUuid(msg);
  return (
    shortId !== undefined &&
    shortId === shortUuid(prevType) &&
    prevType.message.content[0]?.type !== "tool_result"
  );
}
//@ chunk-ag5x7vhf.js:179897-180008 layout
function findSpeakerLabelAbove(messages, startIndex) {
  let index = startIndex;
  while (index > 0 && isSplitUserMessagePart(messages[index], messages[index - 1])) index--;
  let candidate = messages[index - 1];
  return candidate?.type === "speaker_label" ? candidate : undefined;
}
//@ chunk-ag5x7vhf.js:180008-180052 layout
function streamingThinkingRows(rows, isFullscreen) {
  return isFullscreen ? Math.min(MAX_THINKING_ROWS, rows) : MAX_THINKING_ROWS;
}
//@ chunk-ag5x7vhf.js:180052-180371 layout
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
//@ chunk-ag5x7vhf.js:180371-180761 fingerprint = computeSliceStart (0.738)
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
//@ chunk-ag5x7vhf.js:180761-181053 layout
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
//@ chunk-ag5x7vhf.js:181053-199016 fingerprint = MessagesImpl (0.526)
function MessagesImpl(props) {
  let $ = useMemoCache(284);
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
    let reordered = reorderMessagesInUI(dropTextToolNames, syntheticStreamingToolUseMessages);
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
          : hasSuccessfulToolCall(messages, briefOnlyToolNames)
        : messages;
    let briefFiltered_2 = briefFiltered;
    let windowed = isWindowed ? briefFiltered_2.slice(-MAX_RECENT_MESSAGES) : briefFiltered_2;
    let isTruncated = isWindowed && briefFiltered.length > MAX_RECENT_MESSAGES;
    let { messages: messages_2 } = countToolCallsSince_2(windowed, tools, isVerbose, activeAgents);
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
  UL: {
    let keepTextReplies =
      replyChannelProjectorModule !== null && hasRemoteReplyChannel && !isTranscriptScreen && !isVerbose;
    if (!(isFullscreen && (briefTranscript || keepTextReplies) && !isTranscriptScreen)) {
      navigableBase = collapsedBase_2;
      break UL;
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
  mJ: {
    if (!isTranscriptV2 || segmenter === null) {
      collapsedMessages = transcriptMessages;
      break mJ;
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
    pJ: {
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
        break pJ;
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
        break pJ;
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
    fJ: {
      if (!unseenDivider) {
        unseenIndex = -1;
        break fJ;
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
        break fJ;
      }
      let index = transcriptMessages.findIndex((message) => shortUuid(message) === unseenUuidShort);
      let firstUnseen = index === -1 ? undefined : transcriptMessages[index];
      if (firstUnseen === undefined || !foldedAgentMessages.folded.has(firstUnseen)) {
        unseenIndex = -1;
        break fJ;
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
          break fJ;
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
    gJ: {
      let hiddenRows = new Set();
      if (!hasFoldedAgents) {
        replyHiddenRows = hiddenRows;
        break gJ;
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
  if ($[166] === MEMO_CACHE_SENTINEL) {
    toggleExpanded = (msg) => {
      let k = expandKey(msg);
      setExpandedKeys((prev) => {
        let next = new Set(prev);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
    };
    $[166] = toggleExpanded;
  } else toggleExpanded = $[166];
  let onItemClick = toggleExpanded;
  let isExpanded;
  if ($[167] !== expandedKeys) {
    isExpanded = (msg_5) => expandedKeys.size > 0 && expandedKeys.has(expandKey(msg_5));
    $[167] = expandedKeys;
    $[168] = isExpanded;
  } else isExpanded = $[168];
  let isExpandedStable = isExpanded;
  let reportMissingUuid;
  let reportDeps;
  if ($[169] !== host || $[170] !== renderableMessages || $[171] !== screen || $[172] !== isVirtualized) {
    reportMissingUuid = () => {
      reportMessageWithoutUuid(host, renderableMessages, {
        virtualized: isVirtualized,
        screen,
      });
    };
    reportDeps = [host, renderableMessages, isVirtualized, screen];
    $[169] = host;
    $[170] = renderableMessages;
    $[171] = screen;
    $[172] = isVirtualized;
    $[173] = reportMissingUuid;
    $[174] = reportDeps;
  } else {
    reportMissingUuid = $[173];
    reportDeps = $[174];
  }
  useEffect(reportMissingUuid, reportDeps);
  let inboundLabelRows;
  if ($[175] !== messages_2 || $[176] !== isTranscriptV2) {
    hJ: {
      let rows = new Set();
      if (!isTranscriptV2) {
        inboundLabelRows = rows;
        break hJ;
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
    $[175] = messages_2;
    $[176] = isTranscriptV2;
    $[177] = inboundLabelRows;
  } else inboundLabelRows = $[177];
  let inboundLabelRows_2 = inboundLabelRows;
  let isItemClickableRaw;
  if (
    $[178] !== bashSplitCache ||
    $[179] !== columns ||
    $[180] !== crossSessionBodies ||
    $[181] !== host ||
    $[182] !== isTranscriptScreen ||
    $[183] !== gutterSize ||
    $[184] !== latestBashOutputUuid_2 ||
    $[185] !== lookups_2 ||
    $[186] !== inboundLabelRows_2 ||
    $[187] !== tools ||
    $[188] !== isVerbose
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
    $[178] = bashSplitCache;
    $[179] = columns;
    $[180] = crossSessionBodies;
    $[181] = host;
    $[182] = isTranscriptScreen;
    $[183] = gutterSize;
    $[184] = latestBashOutputUuid_2;
    $[185] = lookups_2;
    $[186] = inboundLabelRows_2;
    $[187] = tools;
    $[188] = isVerbose;
    $[189] = isItemClickableRaw;
  } else isItemClickableRaw = $[189];
  let isItemClickable = isItemClickableRaw;
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let canAnimate = !pauseAnimation_2 && !dialogOfKind;
  let prevProgressState = useContext(TerminalWriteContext);
  let historyWriterEffect;
  let historyWriterDeps;
  if ($[190] !== prevProgressState) {
    historyWriterEffect = () => {
      if (!prevProgressState) {
        return;
      }
      setHistoryWriter(prevProgressState);
      return () => clearHistoryWriter(prevProgressState);
    };
    historyWriterDeps = [prevProgressState];
    $[190] = prevProgressState;
    $[191] = historyWriterEffect;
    $[192] = historyWriterDeps;
  } else {
    historyWriterEffect = $[191];
    historyWriterDeps = $[192];
  }
  useEffect(historyWriterEffect, historyWriterDeps);
  let itemKey;
  if ($[193] !== conversationId) {
    itemKey = (msg_7) => `${msg_7.uuid}-${conversationId}`;
    $[193] = conversationId;
    $[194] = itemKey;
  } else itemKey = $[194];
  let itemKey_2 = itemKey;
  let renderItem;
  if (
    $[195] !== canAnimate ||
    $[196] !== columns ||
    $[197] !== commands ||
    $[198] !== conversationId ||
    $[199] !== unseenIndex_2 ||
    $[200] !== hasStreamingText ||
    $[201] !== inProgressToolUseIDs ||
    $[202] !== isExpandedStable ||
    $[203] !== isLoading ||
    $[204] !== replyHiddenRows_2 ||
    $[205] !== gutterSize ||
    $[206] !== hasContentAfter ||
    $[207] !== latestBashOutputUuid_2 ||
    $[208] !== spinnerWidth ||
    $[209] !== lookups_2 ||
    $[210] !== itemKey_2 ||
    $[211] !== renderOffset ||
    $[212] !== renderableMessages ||
    $[213] !== rowProjector ||
    $[214] !== screen ||
    $[215] !== messages_2 ||
    $[216] !== showMessageTimestamps_2 ||
    $[217] !== streamingIds_2 ||
    $[218] !== tools ||
    $[219] !== turn?.armRateLimitAutoContinue ||
    $[220] !== turn?.openRateLimitOptions ||
    $[221] !== unseenDivider ||
    $[222] !== isVerbose
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
    $[195] = canAnimate;
    $[196] = columns;
    $[197] = commands;
    $[198] = conversationId;
    $[199] = unseenIndex_2;
    $[200] = hasStreamingText;
    $[201] = inProgressToolUseIDs;
    $[202] = isExpandedStable;
    $[203] = isLoading;
    $[204] = replyHiddenRows_2;
    $[205] = gutterSize;
    $[206] = hasContentAfter;
    $[207] = latestBashOutputUuid_2;
    $[208] = spinnerWidth;
    $[209] = lookups_2;
    $[210] = itemKey_2;
    $[211] = renderOffset;
    $[212] = renderableMessages;
    $[213] = rowProjector;
    $[214] = screen;
    $[215] = messages_2;
    $[216] = showMessageTimestamps_2;
    $[217] = streamingIds_2;
    $[218] = tools;
    $[219] = turn?.armRateLimitAutoContinue;
    $[220] = turn?.openRateLimitOptions;
    $[221] = unseenDivider;
    $[222] = isVerbose;
    $[223] = renderItem;
  } else renderItem = $[223];
  let renderItemStable = renderItem;
  let [searchTextCache] = useState(createWeakMap_4);
  let extractSearchTextImpl;
  if ($[224] !== lookups_2 || $[225] !== searchTextCache || $[226] !== tools) {
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
    $[224] = lookups_2;
    $[225] = searchTextCache;
    $[226] = tools;
    $[227] = extractSearchTextImpl;
  } else extractSearchTextImpl = $[227];
  let extractSearchText = extractSearchTextImpl;
  let streamingTextRow;
  if (
    $[228] !== hasStreamingText ||
    $[229] !== briefMessagesOnly ||
    $[230] !== transcriptV2 ||
    $[231] !== turn
  ) {
    streamingTextRow =
      hasStreamingText && !briefMessagesOnly && turn
        ? jsxProd_default(StreamingTextRow, {
            store: turn.stream.previewStore,
            transcriptV2,
          })
        : null;
    $[228] = hasStreamingText;
    $[229] = briefMessagesOnly;
    $[230] = transcriptV2;
    $[231] = turn;
    $[232] = streamingTextRow;
  } else streamingTextRow = $[232];
  let streamingTextRow_2 = streamingTextRow;
  let children;
  if (
    $[233] !== columns ||
    $[234] !== extractSearchText ||
    $[235] !== isFullscreen ||
    $[236] !== isItemClickable ||
    $[237] !== isExpandedStable ||
    $[238] !== isTranscriptScreen ||
    $[239] !== itemKey_2 ||
    $[240] !== renderItemStable ||
    $[241] !== renderableMessages ||
    $[242] !== reveal ||
    $[243] !== screenReaderLayout ||
    $[244] !== scrollViewport ||
    $[245] !== search?.jumpRef ||
    $[246] !== search?.onSearchMatchesChange ||
    $[247] !== search?.scanElement ||
    $[248] !== search?.setPositions ||
    $[249] !== isVirtualized
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
    $[233] = columns;
    $[234] = extractSearchText;
    $[235] = isFullscreen;
    $[236] = isItemClickable;
    $[237] = isExpandedStable;
    $[238] = isTranscriptScreen;
    $[239] = itemKey_2;
    $[240] = renderItemStable;
    $[241] = renderableMessages;
    $[242] = reveal;
    $[243] = screenReaderLayout;
    $[244] = scrollViewport;
    $[245] = search?.jumpRef;
    $[246] = search?.onSearchMatchesChange;
    $[247] = search?.scanElement;
    $[248] = search?.setPositions;
    $[249] = isVirtualized;
    $[250] = children;
  } else children = $[250];
  let children_2 = children;
  const value_2 = foldedAgentMessages?.counts ?? monitorEventCache;
  let children_3;
  if ($[251] !== value || $[252] !== children_2) {
    children_3 = jsxProd_default(CompactSummaryContext, {
      value,
      children: children_2,
    });
    $[251] = value;
    $[252] = children_2;
    $[253] = children_3;
  } else children_3 = $[253];
  let withMonitorCache;
  if ($[254] !== value_2 || $[255] !== children_3) {
    withMonitorCache = jsxProd_default(monitorEventCacheStore, {
      value: value_2,
      children: children_3,
    });
    $[254] = value_2;
    $[255] = children_3;
    $[256] = withMonitorCache;
  } else withMonitorCache = $[256];
  let children_4 = withMonitorCache;
  let hiddenCountLabel;
  if ($[257] !== hiddenMessageCount_2 || $[258] !== screenReaderLayout) {
    hiddenCountLabel = screenReaderLayout ? "" : `${sequential.bold(hiddenMessageCount_2)} `;
    $[257] = hiddenMessageCount_2;
    $[258] = screenReaderLayout;
    $[259] = hiddenCountLabel;
  } else hiddenCountLabel = $[259];
  let hiddenCountLabel_2 = hiddenCountLabel;
  let showOlderDivider;
  if (
    $[260] !== columns ||
    $[261] !== hasTruncatedMessages_2 ||
    $[262] !== hiddenCountLabel_2 ||
    $[263] !== toggleShowAllShortcut
  ) {
    showOlderDivider =
      hasTruncatedMessages_2 &&
      jsxProd_default(Divider, {
        title: `${toggleShowAllShortcut} to show ${hiddenCountLabel_2}previous messages`,
        width: columns,
      });
    $[260] = columns;
    $[261] = hasTruncatedMessages_2;
    $[262] = hiddenCountLabel_2;
    $[263] = toggleShowAllShortcut;
    $[264] = showOlderDivider;
  } else showOlderDivider = $[264];
  let hideOlderDivider;
  if (
    $[265] !== columns ||
    $[266] !== isUncapped ||
    $[267] !== hiddenCountLabel_2 ||
    $[268] !== hiddenMessageCount_2 ||
    $[269] !== isTranscriptScreen ||
    $[270] !== hasHistory ||
    $[271] !== toggleShowAllShortcut
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
    $[265] = columns;
    $[266] = isUncapped;
    $[267] = hiddenCountLabel_2;
    $[268] = hiddenMessageCount_2;
    $[269] = isTranscriptScreen;
    $[270] = hasHistory;
    $[271] = toggleShowAllShortcut;
    $[272] = hideOlderDivider;
  } else hideOlderDivider = $[272];
  let withSuggestionSlot;
  if ($[273] !== children_4) {
    withSuggestionSlot = jsxProd_default(SuggestionSlot, {
      value: null,
      children: children_4,
    });
    $[273] = children_4;
    $[274] = withSuggestionSlot;
  } else withSuggestionSlot = $[274];
  let withSpinnerGutter;
  if ($[275] !== spinnerWidth || $[276] !== streamingTextRow_2) {
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
    $[275] = spinnerWidth;
    $[276] = streamingTextRow_2;
    $[277] = withSpinnerGutter;
  } else withSpinnerGutter = $[277];
  let finalContent;
  if (
    $[278] !== contentSize ||
    $[279] !== showOlderDivider ||
    $[280] !== hideOlderDivider ||
    $[281] !== withSuggestionSlot ||
    $[282] !== withSpinnerGutter
  ) {
    finalContent = jsxProd_default_2(TerminalSizeContext, {
      value: contentSize,
      children: [showOlderDivider, hideOlderDivider, withSuggestionSlot, withSpinnerGutter],
    });
    $[278] = contentSize;
    $[279] = showOlderDivider;
    $[280] = hideOlderDivider;
    $[281] = withSuggestionSlot;
    $[282] = withSpinnerGutter;
    $[283] = finalContent;
  } else finalContent = $[283];
  return finalContent;
}
//@ chunk-ag5x7vhf.js:199016-199223 layout
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
//@ chunk-ag5x7vhf.js:199223-199537 layout
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
//@ chunk-ag5x7vhf.js:199537-199618 file-local
function expandKey(msg) {
  return (msg.type === "assistant" || msg.type === "user" ? getToolUseID(msg) : null) ?? msg.uuid;
}
//@ chunk-ag5x7vhf.js:199618-199755 layout
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
//@ chunk-ag5x7vhf.js:199755-199846 file-local
function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (let item of a) if (!b.has(item)) return false;
  return true;
}
//@ chunk-ag5x7vhf.js:199846-199856 layout
var EMPTY_TOOL_USE_LIST = [];
//@ chunk-ag5x7vhf.js:199856-199910 layout
function isNonEmptyString(id) {
  return typeof id === "string" && id.length > 0;
}
//@ chunk-ag5x7vhf.js:199910-200003 layout
class StreamingToolUseDeduper {
  previous = EMPTY_TOOL_USE_LIST;
  next(streamingToolUses, inProgressIds, resolvedIds) {
    this.previous = dedupeStreamingToolUses(this.previous, streamingToolUses, inProgressIds, resolvedIds);
    return this.previous;
  }
}
//@ chunk-ag5x7vhf.js:200003-200250 layout
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
//@ chunk-ag5x7vhf.js:200250-200295 layout
function keepPreviousIfSame(previous, messages, canReuse) {
  return canReuse && previous[0] === messages[0] ? previous : messages;
}
//@ chunk-ag5x7vhf.js:200295-200980 fingerprint = Messages (0.801)
/**
 * 消息列表组件：MessagesImpl 的 memo 版本，自定义比较忽略 scrollViewport/search/reveal，并对 streamingToolUses、inProgressToolUseIDs、unseenDivider、tools 做浅比较。
 */
var Messages; // deferred: uses MessagesImpl of its import cycle while loading; runs once the cycle is complete
var EMPTY_ID_SET;
var EMPTY_ARRAY_A;
var EMPTY_ARRAY_B;
var EMPTY_ARRAY_C;
deferInit("chunk-ag5x7vhf.js:200295", () => {
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
  dropTextInBriefTurns,
  useCommandQueue,
  LogoHeader,
  INTERRUPT_MESSAGE_TEXTS,
  shouldRenderStatically,
  shrinkTerminalSize,
  getMessageSearchText,
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
};
