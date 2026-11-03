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
  Rh,
  fo,
  init_react_production,
  yt,
  R,
  P,
  qt,
  y,
  zt,
  Se,
} from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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
import {
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
  hasToolResultBlock,
} from "../utils/messages.js";
import { RetainedOutputChecker } from "../utils/messages/incrementalNormalizer.js";
import { computeSearchText } from "../utils/transcriptSearch.js";
import { isSubsetOf } from "../utils/fsWatchProbe.js";
import { collectToolUseIds, isNavigableMessage } from "./messageActions.js";
import { BLACK_CIRCLE } from "../utils/permissions/autoModeRulesPrompt.js";
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

//@ chunk-ag5x7vhf.js:117168-117911 callgraph-fingerprint = LogoHeader (0.199)
var LogoHeader = Rh(function (props) {
  let $ = w(14);
  let { latchAnnouncementSlot, hideWelcomeChrome, homeMessage, hideLogo } = props;
  let I = latchAnnouncementSlot === undefined ? true : latchAnnouncementSlot;
  let D = hideWelcomeChrome === undefined ? false : hideWelcomeChrome;
  let A = homeMessage === undefined ? false : homeMessage;
  let hideLogo_2 = hideLogo === undefined ? false : hideLogo;
  let V = useSessionOrUndefined() !== undefined;
  const flexGrow = A ? 1 : 0;
  let K;
  if ($[0] !== hideLogo_2 || $[1] !== D) {
    K =
      !D &&
      jsxProd_default(StartupUpdateSummary, {
        hideLogo: hideLogo_2,
      });
    $[0] = hideLogo_2;
    $[1] = D;
    $[2] = K;
  } else K = $[2];
  let q;
  if ($[3] !== V || $[4] !== A || $[5] !== I) {
    q =
      V &&
      jsxProd_default(fo, {
        fallback: null,
        children: jsxProd_default(LogoV2, {
          latchAnnouncementSlot: I,
          homeMessage: A,
        }),
      });
    $[3] = V;
    $[4] = A;
    $[5] = I;
    $[6] = q;
  } else q = $[6];
  let children;
  if ($[7] !== flexGrow || $[8] !== K || $[9] !== q) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      flexGrow,
      children: [K, null, q],
    });
    $[7] = flexGrow;
    $[8] = K;
    $[9] = q;
    $[10] = children;
  } else children = $[10];
  let pe;
  if ($[11] !== I || $[12] !== children) {
    pe = jsxProd_default(FreezeWhenOffscreen, {
      children: jsxProd_default(noticeImpressionEnabled.Provider, {
        value: I,
        children,
      }),
    });
    $[11] = I;
    $[12] = children;
    $[13] = pe;
  } else pe = $[13];
  return pe;
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
function scanForMultiBlockMessage(messages, h, x) {
  if (messages[0] !== x.head || h < x.upTo) {
    x.head = messages[0];
    x.upTo = 0;
    x.seed = false;
  }
  for (let upTo = x.upTo; upTo < h && !x.seed; upTo++) x.seed = hasMultipleContentBlocks(messages[upTo]);
  x.upTo = h;
  return x.seed;
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
  normalize(m, h) {
    let input = this.input;
    let max = Math.max(0, m.length - IncrementalMessageNormalizer.RECENT);
    let k = 0;
    let _ = 0;
    if (this.chainAt[0] === h) {
      let min = Math.min(input.length, max);
      while (k < min && input[k] === m[k]) k++;
      let min_2 = Math.min(input.length - k, max - k);
      while (_ < min_2 && input[input.length - 1 - _] === m[m.length - 1 - _]) _++;
    }
    if (input.length !== this.inputLength) {
      k = 0;
      _ = 0;
    }
    if (
      !this.probe.intact(
        this.output,
        this.starts,
        this.chainAt,
        k,
        _,
        this.inputLength,
        m.length,
        "normalize",
      )
    ) {
      k = 0;
      _ = 0;
      this.input = [];
      this.inputLength = 0;
      this.output = [];
      this.starts = [0];
      this.chainAt = [false];
      this.damageRebuilds++;
    }
    let sliced = this.output.slice(0, this.starts[k]);
    let sliced_2 = this.starts.slice(0, k + 1);
    let sliced_3 = this.chainAt.slice(0, k + 1);
    if (k === 0) sliced_3[0] = h;
    let L = sliced_3[k];
    let V = 0;
    let W = (q, Y) => {
      for (let pe = q; pe < Y; pe++) {
        let xe = m[pe];
        for (let ge of normalizeMessages([xe], L, this.cache)) if (isNotEmptyMessage(ge)) sliced.push(ge);
        this.notePending(xe, L);
        if (hasMultipleContentBlocks(xe)) L = true;
        sliced_2.push(sliced.length);
        sliced_3.push(L);
        V++;
      }
    };
    let z = m.length - _;
    W(k, z);
    let K = input.length - _;
    if (_ > 0 && this.chainAt[K] === L) {
      let q = sliced.length - this.starts[K];
      for (let Y = this.starts[K]; Y < this.output.length; Y++) sliced.push(this.output[Y]);
      for (let idx = K + 1; idx <= input.length; idx++) {
        sliced_2.push(this.starts[idx] + q);
        sliced_3.push(this.chainAt[idx]);
      }
    } else W(z, m.length);
    this.refreshPending(m);
    this.input = m;
    this.inputLength = m.length;
    this.output = sliced;
    this.starts = sliced_2;
    this.chainAt = sliced_3;
    this.lastWalked = V;
    return sliced;
  }
  notePending(m, h) {
    if (m.type !== "assistant") return;
    if (m.message.stop_reason === null) this.pending.set(m, h);
    else this.pending.delete(m);
  }
  refreshPending(m) {
    if (this.pending.size === 0) return;
    let h = this.pending.size > IncrementalMessageNormalizer.PRUNE_PENDING_AT ? new Set(m) : null;
    for (let [x, T] of this.pending) {
      if (h !== null && !h.has(x)) {
        this.pending.delete(x);
        continue;
      }
      normalizeMessages([x], T, this.cache);
      this.notePending(x, T);
    }
  }
}
//@ chunk-ag5x7vhf.js:136421-136460 placement
var INTERRUPT_MESSAGE_TEXTS = new Set([INTERRUPT_MESSAGE, INTERRUPT_MESSAGE_FOR_TOOL_USE]);
var weakMap_3 = new WeakMap();
//@ chunk-ag5x7vhf.js:136460-136561 placement
/**
 * 取消息的小写搜索文本，按消息对象 WeakMap 缓存。
 */
function getMessageSearchText(msg) {
  let h = weakMap_3.get(msg);
  if (h !== undefined) return h;
  let lower = computeSearchText(msg).toLowerCase();
  weakMap_3.set(msg, lower);
  return lower;
}
//@ chunk-ag5x7vhf.js:138975-138979 placement
init_react_production();
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
        screen === "transcript" && collectToolUseIds(message).every((I) => lookups.resolvedToolUseIDs.has(I))
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
var speakerLabelComponent = null;
var StreamingTextRow = Rh(function (props) {
  let D = w(14);
  let { store, transcriptV2 } = props;
  let { displayed, hideTrailingLine } = yt(store.subscribe, store.getDerived);
  if (!displayed) {
    return null;
  }
  const flexDirection = transcriptV2 === undefined ? "row" : "column";
  let A;
  if (D[0] !== transcriptV2) {
    A =
      transcriptV2 === "label" &&
      speakerLabelComponent !== null &&
      jsxProd_default(speakerLabelComponent, {
        speaker: {
          kind: "claude",
        },
      });
    D[0] = transcriptV2;
    D[1] = A;
  } else A = D[1];
  let L;
  if (D[2] !== transcriptV2) {
    L =
      transcriptV2 === undefined &&
      jsxProd_default(Box, {
        minWidth: 2,
        children: jsxProd_default(Text, {
          "aria-label": "claude:",
          color: "text",
          children: BLACK_CIRCLE,
        }),
      });
    D[2] = transcriptV2;
    D[3] = L;
  } else L = D[3];
  let V;
  if (D[4] !== displayed || D[5] !== hideTrailingLine) {
    V = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default(StreamingMarkdown, {
        hideTrailingLine,
        children: displayed,
      }),
    });
    D[4] = displayed;
    D[5] = hideTrailingLine;
    D[6] = V;
  } else V = D[6];
  let W;
  if (D[7] !== L || D[8] !== V) {
    W = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [L, V],
    });
    D[7] = L;
    D[8] = V;
    D[9] = W;
  } else W = D[9];
  let z;
  if (D[10] !== flexDirection || D[11] !== A || D[12] !== W) {
    z = jsxProd_default_2(Box, {
      alignItems: "flex-start",
      flexDirection,
      marginTop: 1,
      width: "100%",
      children: [A, W],
    });
    D[10] = flexDirection;
    D[11] = A;
    D[12] = W;
    D[13] = z;
  } else z = D[13];
  return z;
});
//@ chunk-ag5x7vhf.js:148926-148930 placement
init_react_production();
//@ chunk-ag5x7vhf.js:148930-148934 placement
init_react_production();
//@ chunk-ag5x7vhf.js:148934-149008 placement
function useCommandQueue() {
  let commandQueueOrDefault = useCommandQueueOrDefault();
  return yt(commandQueueOrDefault.subscribe, commandQueueOrDefault.getCommandQueueSnapshot);
}
//@ chunk-ag5x7vhf.js:149162-149198 placement
function selectIsLoading(ge) {
  return ge.isLoading;
}
//@ chunk-ag5x7vhf.js:149198-149230 placement
function selectTasks(Re) {
  return Re.tasks;
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
  let I = w(13);
  let { turn, hasToolsInProgress } = props;
  let storeSelector = useStoreSelector(turn, selectIsLoading);
  let tasks = useAppState(selectTasks);
  let queuedCommands = useCommandQueue();
  let D;
  if (I[0] !== queuedCommands || I[1] !== tasks) {
    D = countPendingBackgroundWork({
      tasks,
      queuedCommands,
    });
    I[0] = queuedCommands;
    I[1] = tasks;
    I[2] = D;
  } else D = I[2];
  let A = D;
  let L = A.pendingAgents > 0 || A.pendingWorkflows > 0;
  let V = renderWithForceUpdate(terminalProgressEnabled);
  let { progress } = useTerminalNotification();
  let taskListWatcherRef = R(null);
  let K;
  let q;
  if (
    I[3] !== V ||
    I[4] !== L ||
    I[5] !== hasToolsInProgress ||
    I[6] !== storeSelector ||
    I[7] !== progress
  ) {
    K = () => {
      let taskListWatcher = useTaskListWatcher({
        enabled: V,
        isLoading: storeSelector,
        hasToolsInProgress,
        hasPendingBackgroundWork: L,
      });
      if (taskListWatcherRef.current === taskListWatcher) {
        return;
      }
      taskListWatcherRef.current = taskListWatcher;
      progress(taskListWatcher);
    };
    q = [progress, V, storeSelector, hasToolsInProgress, L];
    I[3] = V;
    I[4] = L;
    I[5] = hasToolsInProgress;
    I[6] = storeSelector;
    I[7] = progress;
    I[8] = K;
    I[9] = q;
  } else {
    K = I[8];
    q = I[9];
  }
  P(K, q);
  let pe;
  let xe;
  if (I[10] !== progress) {
    pe = () => () => {
      if (taskListWatcherRef.current !== null) {
        taskListWatcherRef.current = null;
        progress(null);
      }
    };
    xe = [progress];
    I[10] = progress;
    I[11] = pe;
    I[12] = xe;
  } else {
    pe = I[11];
    xe = I[12];
  }
  P(pe, xe);
  return null;
}
//@ chunk-ag5x7vhf.js:149989-149993 placement
init_react_production();
//@ chunk-ag5x7vhf.js:149993-150071 placement
function shrinkTerminalSize(m, h) {
  return h === 0
    ? m
    : {
        columns: Math.max(1, m.columns - h),
        rows: m.rows,
      };
}
//@ chunk-ag5x7vhf.js:150628-150632 placement
init_react_production();
//@ chunk-ag5x7vhf.js:150632-150636 placement
init_react_production();
//@ chunk-ag5x7vhf.js:151691-151707 placement
var SuggestionSlot = qt(null);
//@ chunk-ag5x7vhf.js:151707-151711 placement
init_react_production();
//@ chunk-ag5x7vhf.js:151711-151715 placement
init_react_production();
//@ chunk-ag5x7vhf.js:158357-158361 placement
init_react_production();
//@ chunk-ag5x7vhf.js:176529-176563 placement
function selectVerbose_2(lO) {
  return lO.verbose;
}
//@ chunk-ag5x7vhf.js:176563-176605 placement
function selectBriefTranscript(cO) {
  return cO.briefTranscript;
}
//@ chunk-ag5x7vhf.js:176605-176653 placement
function selectHasRemoteReplyChannel(uO) {
  return uO.hasRemoteReplyChannel;
}
//@ chunk-ag5x7vhf.js:176653-176709 placement
function selectActiveAgents(dO) {
  return dO.agentDefinitions.activeAgents;
}
//@ chunk-ag5x7vhf.js:176709-176757 placement
function selectShowMessageTimestamps(mO) {
  return mO.showMessageTimestamps;
}
//@ chunk-ag5x7vhf.js:176757-176803 placement
function isSilkHingeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_silk_hinge", false);
}
//@ chunk-ag5x7vhf.js:176803-176828 placement
function returnFalse_2(yJ) {
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
function isVisibleMessage(pO) {
  return !isInvisibleMessage(pO);
}
//@ chunk-ag5x7vhf.js:177167-177198 placement
function messageUuid(fO) {
  return fO.uuid;
}
//@ chunk-ag5x7vhf.js:177198-177261 placement
function createSegmenter() {
  return transcriptPlugin === null ? null : new transcriptPlugin.TranscriptSegmenter();
}
//@ chunk-ag5x7vhf.js:177261-177351 placement
function pendingToUserMessage(m, gO) {
  let { text, origin } = m;
  return createUserMessage({
    content: text,
    origin,
    uuid: placeholderImageId(gO),
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
function isToolResultContent(bO) {
  return bO.type === "tool_result";
}
//@ chunk-ag5x7vhf.js:177460-177496 placement
function selectLoading(et) {
  return et.isLoading;
}
//@ chunk-ag5x7vhf.js:177496-177540 placement
function selectStreamingToolUses(Ke) {
  return Ke.streamingToolUses;
}
//@ chunk-ag5x7vhf.js:177540-177588 placement
function selectUserInputOnProcessing(Ye) {
  return Ye.userInputOnProcessing;
}
//@ chunk-ag5x7vhf.js:177588-177632 placement
function selectPlaceholderOrigin(je) {
  return je.placeholderOrigin;
}
//@ chunk-ag5x7vhf.js:177632-177687 placement
function selectFollowingPrompts(Xe) {
  return Xe.followingPromptsOnProcessing;
}
//@ chunk-ag5x7vhf.js:177687-177738 placement
function selectPlaceholderWaitedInQueue(Et) {
  return Et.placeholderWaitedInQueue;
}
//@ chunk-ag5x7vhf.js:177738-177776 placement
function selectIsBriefOnly(Ct) {
  return Ct.isBriefOnly;
}
//@ chunk-ag5x7vhf.js:177776-177810 placement
function selectVerbose_2_2(bt) {
  return bt.verbose;
}
//@ chunk-ag5x7vhf.js:177810-177849 placement
function selectSettledReply(_t) {
  return _t.settledReply;
}
//@ chunk-ag5x7vhf.js:177849-177880 placement
function selectUuid(xt) {
  return xt.uuid;
}
//@ chunk-ag5x7vhf.js:177880-178116 file-local
var BRIEF_TOOL_NAME = require("./chunk-vswknp5v.js").BRIEF_TOOL_NAME;
var SEND_USER_FILE_TOOL_NAME = require("./chunk-j52bj3xs.js").SEND_USER_FILE_TOOL_NAME;
var isBriefEnabled = require("./chunk-cv3kgbt2.js").isBriefEnabled;
var replyChannelProjectorModule = null;
var isPewterOwlTool = require("./chunk-egdy92df.js").isPewterOwlTool;
var transcriptPlugin = null;
var replyPlugin = null;
//@ chunk-ag5x7vhf.js:178116-179178 fingerprint = filterForBriefTool (0.892)
function filterForBriefTool(m, briefToolNames, x) {
  let nameSet = new Set(briefToolNames);
  let k = new Set(x);
  let briefToolUseIDs = new Set();
  let I = [];
  let D = 0;
  for (let idx = 0; idx < m.length; idx++) {
    let V = m[idx];
    let W = V.message?.content[0];
    if (V.type === "user" && W?.type !== "tool_result" && (!V.isMeta || isNonHumanInboundOrigin(V.origin)))
      D++;
    else if (
      V.type === "attachment" &&
      V.attachment?.type === "queued_command" &&
      V.attachment.commandMode === "prompt" &&
      (isNonHumanInboundOrigin(V.attachment.origin) ||
        (!V.attachment.isMeta && isHumanOrAutoContinuation(V.attachment.origin)))
    )
      D++;
    else if (V.type === "assistant" && W?.type === "tool_use" && W.name && k.has(W.name))
      briefToolUseIDs.add(D);
    I[idx] = D;
  }
  let A = new Set();
  return m.filter((msg, V) => {
    if (msg.type === "system") return true;
    let block = msg.message?.content[0];
    if (msg.type === "assistant") {
      if (msg.isApiErrorMessage) return true;
      if (block?.type === "tool_use" && block.name && nameSet.has(block.name)) {
        if ("id" in block) A.add(block.id);
        return true;
      }
      if ((block?.type === "text" || isSignedThinkingBlock(block)) && !briefToolUseIDs.has(I[V])) return true;
      return false;
    }
    if (msg.type === "user") {
      if (block?.type === "tool_result") return block.tool_use_id !== undefined && A.has(block.tool_use_id);
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
  let x = new Set(toolName);
  let T = new Set();
  let k = new Map();
  let _ = [];
  let I = 0;
  for (let idx = 0; idx < messages.length; idx++) {
    let A = messages[idx];
    let L = A.message?.content[0];
    if (A.type === "user" && L?.type !== "tool_result" && !A.isMeta) {
      I++;
      continue;
    }
    if (A.type === "assistant") {
      if (L?.type === "text" || isSignedThinkingBlock(L)) _[idx] = I;
      else if (L?.type === "tool_use" && L.name && x.has(L.name) && L.id) k.set(L.id, I);
    } else if (
      A.type === "user" &&
      L?.type === "tool_result" &&
      L.tool_use_id &&
      k.has(L.tool_use_id) &&
      !L.is_error
    )
      T.add(k.get(L.tool_use_id));
  }
  if (T.size === 0) return messages;
  return messages.filter((message, A) => {
    let toolName = _[A];
    return toolName === undefined || !T.has(toolName);
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
  let x = shortUuid(msg);
  return x !== undefined && x === shortUuid(prevType) && prevType.message.content[0]?.type !== "tool_result";
}
//@ chunk-ag5x7vhf.js:179897-180008 layout
function findSpeakerLabelAbove(m, h) {
  let x = h;
  while (x > 0 && isSplitUserMessagePart(m[x], m[x - 1])) x--;
  let T = m[x - 1];
  return T?.type === "speaker_label" ? T : undefined;
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
  sync(m, h) {
    if (this.conversationId !== m) {
      this.conversationId = m;
      this.preCap.current = null;
      this.slice.current = null;
    }
    if (this.verbose !== h) {
      this.verbose = h;
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
function adjustSliceStartForReplies(m, h, x = SLICE_STEP) {
  if (transcriptPlugin === null) return h;
  let { isLabelledReply, replyRunRowAbove, sitsBetweenReplies } = transcriptPlugin;
  let I = h;
  while (I < m.length && sitsBetweenReplies(m[I])) I++;
  if (isLabelledReply(m[I])) {
    let D = replyRunRowAbove(m, I);
    while (D >= 0 && isLabelledReply(m[D])) {
      if (D < h - x) return h;
      I = D;
      D = replyRunRowAbove(m, I);
    }
  } else I = h;
  return I > 0 && m[I - 1]?.type === "speaker_label" ? I - 1 : Math.min(I, h);
}
//@ chunk-ag5x7vhf.js:181053-199016 fingerprint = MessagesImpl (0.526)
function MessagesImpl(props) {
  let $ = w(284);
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
  let Fe = pauseAnimation === undefined ? false : pauseAnimation;
  let isFullscreen = useIsFullscreen();
  let me = screen === "transcript";
  let verbose = useAppState(selectVerbose_2) || me;
  let _e = history !== undefined;
  let oe = history === "uncapped" || renderRange !== undefined;
  let ve = renderWithForceUpdate(isBriefEnabled);
  let Ee = isBriefOnly && ve;
  let He = shouldShowNotice(verbose);
  let Ue = transcriptPlugin !== null && He;
  let terminalSize = useTerminalSize();
  let it = Ue ? SPINNER_COLUMN_MIN_WIDTH : 0;
  let tt;
  if ($[0] !== it || $[1] !== terminalSize) {
    tt = shrinkTerminalSize(terminalSize, it);
    $[0] = it;
    $[1] = terminalSize;
    $[2] = tt;
  } else tt = $[2];
  let ct = tt;
  let Je;
  if ($[3] !== ct) {
    Je = shrinkTerminalSize(ct, GUTTER_WIDTH);
    $[3] = ct;
    $[4] = Je;
  } else Je = $[4];
  let $e = Je;
  let { columns, rows } = ct;
  let toggleShowAllShortcut = useShortcutDisplay("transcript:toggleShowAll", "Transcript", "Ctrl+E");
  let CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL = env.CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL;
  let briefTranscript = useAppState(selectBriefTranscript);
  let hasRemoteReplyChannel = useAppState(selectHasRemoteReplyChannel);
  let host = useHost();
  let normalizedMessages = resolveTranscriptMode(verbose, me);
  let activeAgents = useAppState(selectActiveAgents);
  let showMessageTimestamps = useAppState(selectShowMessageTimestamps);
  let Ot = renderWithForceUpdate(isSilkHingeEnabled);
  let showMessageTimestamps_2 = showMessageTimestamps && Ot;
  let appStoreDirect = useAppStoreDirect();
  let appState = useAppState(returnFalse_2);
  let de = null;
  let le = scrollViewport != null && !CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL;
  let isStreamingThinkingVisible = streamingThinkingRows(rows, isFullscreen);
  let st;
  if ($[5] !== conversationId || $[6] !== verbose) {
    st = () => new MessagesSliceCache(conversationId, verbose);
    $[5] = conversationId;
    $[6] = verbose;
    $[7] = st;
  } else st = $[7];
  let [Ge] = y(st);
  Ge.sync(conversationId, verbose);
  let Ve = !le && !oe ? computeSliceStart(messages, Ge.preCap, isStreamingThinkingVisible * 2) : 0;
  let [ze] = y(createEmptySlice);
  let At = scanForMultiBlockMessage(messages, Ve, ze);
  let [ut] = y(createIncrementalNormalizer);
  let [jt] = y(createProgressSplitter);
  let [oo] = y(createToolUseTracker);
  let [mo] = y(createLookupsBuilder);
  let [Jt] = y(createIncrementalCollapser);
  let [Gt] = y(createRowProjector);
  let [Mo] = y(createWeakMap);
  let [Vo] = y(createWeakMap_2);
  let Po;
  if ($[8] !== messages || $[9] !== Ve) {
    Po = Ve > 0 ? messages.slice(Ve) : messages;
    $[8] = messages;
    $[9] = Ve;
    $[10] = Po;
  } else Po = $[10];
  let content = Po;
  let Yt;
  if ($[11] !== content || $[12] !== verbose) {
    Yt = verbose ? content : filterFoldedScheduledTaskMessages(content);
    $[11] = content;
    $[12] = verbose;
    $[13] = Yt;
  } else Yt = $[13];
  let Qt = Yt;
  let ne;
  if ($[14] !== ut || $[15] !== At || $[16] !== Qt) {
    ne = ut.normalize(Qt, At);
    $[14] = ut;
    $[15] = At;
    $[16] = Qt;
    $[17] = ne;
  } else ne = $[17];
  let ee = ne;
  let we;
  if ($[18] !== ee || $[19] !== jt) {
    we = jt.split(ee);
    $[18] = ee;
    $[19] = jt;
    $[20] = we;
  } else we = $[20];
  let { transcript, progress } = we;
  let Ke;
  if ($[21] !== transcript) {
    Ct: {
      for (let idx = transcript.length - 1; idx >= 0; idx--) {
        let je = transcript[idx];
        if (je?.type === "user") {
          let content = je.message.content;
          for (const block_0 of content) {
            if (block_0.type === "text" && isBashOutputText(block_0.text)) {
              Ke = je.uuid;
              break Ct;
            }
          }
        }
      }
      Ke = null;
    }
    $[21] = transcript;
    $[22] = Ke;
  } else Ke = $[22];
  let bt = Ke;
  let _t;
  if ($[23] !== oo || $[24] !== transcript) {
    _t = oo.next(transcript);
    $[23] = oo;
    $[24] = transcript;
    $[25] = _t;
  } else _t = $[25];
  let xt = _t;
  let [$t] = y(createDedupeState);
  let cn;
  if ($[26] !== inProgressToolUseIDs || $[27] !== xt || $[28] !== $t || $[29] !== streamingToolUses) {
    cn = $t.next(streamingToolUses, inProgressToolUseIDs, xt);
    $[26] = inProgressToolUseIDs;
    $[27] = xt;
    $[28] = $t;
    $[29] = streamingToolUses;
    $[30] = cn;
  } else cn = $[30];
  let un = cn;
  let [Yo] = y(createWeakMap_3);
  let ks;
  if ($[31] !== Yo) {
    ks = (stu) => {
      let id = stu.contentBlock.id;
      if (isNonEmptyString(id)) {
        return {
          id,
          minted: false,
        };
      }
      let Oi = Yo.get(stu);
      if (Oi) {
        return {
          id: Oi,
          minted: true,
        };
      }
      let $c = randomUUID();
      Yo.set(stu, $c);
      return {
        id: $c,
        minted: true,
      };
    };
    $[31] = Yo;
    $[32] = ks;
  } else ks = $[32];
  let ko = ks;
  let jn;
  if ($[33] !== ko || $[34] !== un) {
    let Gn;
    if ($[36] !== ko) {
      Gn = (streamingToolUse) => {
        let { id, minted } = ko(streamingToolUse);
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
      $[36] = ko;
      $[37] = Gn;
    } else Gn = $[37];
    jn = un.flatMap(Gn);
    $[33] = ko;
    $[34] = un;
    $[35] = jn;
  } else jn = $[35];
  let syntheticStreamingToolUseMessages = jn;
  let Xo = me && !_e && !le;
  let Gn;
  if ($[38] !== isFullscreen || $[39] !== transcript || $[40] !== verbose) {
    Gn = verbose || isFullscreen ? transcript : messagesSinceCompactBoundary(transcript, undefined);
    $[38] = isFullscreen;
    $[39] = transcript;
    $[40] = verbose;
    $[41] = Gn;
  } else Gn = $[41];
  let collapsedBase;
  let transcriptLookups;
  let hasTruncatedMessages;
  let hiddenMessageCount;
  let shownWindowUuids;
  if (
    $[42] !== activeAgents ||
    $[43] !== hasRemoteReplyChannel ||
    $[44] !== Ee ||
    $[45] !== me ||
    $[46] !== Jt ||
    $[47] !== Ue ||
    $[48] !== Xo ||
    $[49] !== syntheticStreamingToolUseMessages ||
    $[50] !== Gn ||
    $[51] !== tools ||
    $[52] !== mo ||
    $[53] !== transcript ||
    $[54] !== verbose ||
    $[55] !== le
  ) {
    const briefToolNames = Gn.filter(isVisibleMessage);
    let wn;
    if ($[61] !== me) {
      wn = (Ui) => shouldShowUserMessage(Ui, me);
      $[61] = me;
      $[62] = wn;
    } else wn = $[62];
    let dropTextToolNames = briefToolNames.filter(wn);
    let Qn = reorderMessagesInUI(dropTextToolNames, syntheticStreamingToolUseMessages);
    let messages =
      replyChannelProjectorModule !== null && hasRemoteReplyChannel
        ? replyChannelProjectorModule.projectReplyChannelToolUses(
            me || verbose ? Qn : replyChannelProjectorModule.dropReplyChannelNarration(Qn),
            {
              statusAsText: me || verbose,
            },
          )
        : Qn;
    let briefToolNames_2 = [BRIEF_TOOL_NAME, SEND_USER_FILE_TOOL_NAME];
    let toolName = [BRIEF_TOOL_NAME];
    let Is =
      !me && (isBriefEnabled() || !isPewterOwlTool())
        ? Ee
          ? filterForBriefTool(messages, briefToolNames_2, toolName)
          : hasSuccessfulToolCall(messages, toolName)
        : messages;
    let Es = Is;
    let Ds = Xo ? Es.slice(-MAX_RECENT_MESSAGES) : Es;
    let Vi = Xo && Is.length > MAX_RECENT_MESSAGES;
    let { messages: messages_2 } = countToolCallsSince_2(Ds, tools, verbose, activeAgents);
    let ji = collapseBackgroundBashNotifications(
      collapseHookSummaries(
        collapseHookAttachments(
          collapseTeammateShutdowns(
            collapseReadSearchGroups(
              messages_2,
              tools,
              {
                transcriptV2: Ue,
                expandRows: me && le,
              },
              Jt,
            ),
          ),
        ),
      ),
      verbose,
      Ue,
    );
    let zi = mo.build(transcript, Ds);
    let Gi = Qn.length - MAX_RECENT_MESSAGES;
    collapsedBase = ji;
    transcriptLookups = zi;
    hasTruncatedMessages = Vi;
    hiddenMessageCount = Gi;
    shownWindowUuids = Vi ? Ds.map(messageUuid) : [];
    $[42] = activeAgents;
    $[43] = hasRemoteReplyChannel;
    $[44] = Ee;
    $[45] = me;
    $[46] = Jt;
    $[47] = Ue;
    $[48] = Xo;
    $[49] = syntheticStreamingToolUseMessages;
    $[50] = Gn;
    $[51] = tools;
    $[52] = mo;
    $[53] = transcript;
    $[54] = verbose;
    $[55] = le;
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
  let Jn;
  if (
    $[63] !== collapsedBase ||
    $[64] !== transcriptLookups ||
    $[65] !== hasTruncatedMessages ||
    $[66] !== hiddenMessageCount ||
    $[67] !== shownWindowUuids
  ) {
    Jn = {
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
    $[68] = Jn;
  } else Jn = $[68];
  let {
    collapsedBase: collapsedBase_2,
    transcriptLookups: transcriptLookups_2,
    hasTruncatedMessages: hasTruncatedMessages_2,
    hiddenMessageCount: hiddenMessageCount_2,
    shownWindowUuids: shownWindowUuids_2,
  } = Jn;
  let wn;
  if ($[69] !== progress) {
    wn = buildProgressLookups(progress);
    $[69] = progress;
    $[70] = wn;
  } else wn = $[70];
  let Ns = wn;
  let Ps;
  if ($[71] !== Ns || $[72] !== transcriptLookups_2) {
    Ps = {
      ...transcriptLookups_2,
      ...Ns,
    };
    $[71] = Ns;
    $[72] = transcriptLookups_2;
    $[73] = Ps;
  } else Ps = $[73];
  let _o = Ps;
  let Yc;
  UL: {
    let Ls = replyChannelProjectorModule !== null && hasRemoteReplyChannel && !me && !verbose;
    if (!(isFullscreen && (briefTranscript || Ls) && !me)) {
      Yc = collapsedBase_2;
      break UL;
    }
    let tr;
    if ($[74] !== appStoreDirect) {
      tr = ($i) => {
        let Tv = appStoreDirect.getState().tasks[$i];
        return Tv?.type === "local_agent" ? Tv.result?.toolStats : undefined;
      };
      $[74] = appStoreDirect;
      $[75] = tr;
    } else tr = $[75];
    let Ki;
    if (
      $[76] !== collapsedBase_2 ||
      $[77] !== isLoading ||
      $[78] !== Ls ||
      $[79] !== Ue ||
      $[80] !== tr ||
      $[81] !== tools
    ) {
      Ki = isNavigableMessage(collapsedBase_2, tools, tr, isLoading, {
        keepAllText: Ls,
        transcriptV2: Ue,
      });
      $[76] = collapsedBase_2;
      $[77] = isLoading;
      $[78] = Ls;
      $[79] = Ue;
      $[80] = tr;
      $[81] = tools;
      $[82] = Ki;
    } else Ki = $[82];
    Yc = Ki;
  }
  let eg = Yc;
  let transcriptMode = useTranscriptMode();
  let Jc = transcriptMode || verbose;
  let tr;
  if ($[83] !== eg || $[84] !== Jc) {
    tr = dropDuplicateRemoteErrors(dropRepeatedTurnDurations(eg, Jc), Jc);
    $[83] = eg;
    $[84] = Jc;
    $[85] = tr;
  } else tr = $[85];
  let Io = tr;
  let Ki;
  if ($[86] !== messages || $[87] !== transcriptMode) {
    Ki = transcriptMode ? null : findLeadingCompactBoundary(messages);
    $[86] = messages;
    $[87] = transcriptMode;
    $[88] = Ki;
  } else Ki = $[88];
  let tg = Ki;
  let uuid = tg?.uuid;
  let og = (tg?.summary ?? null) !== null;
  let transcriptPath = tg?.summary?.transcriptPath;
  let [ng, BL] = y(null);
  if (ng?.uuid !== uuid || ng?.transcriptPath !== transcriptPath) {
    let HL =
      isDiskless() || isRemoteSessionAvailable() || env.CLAUDE_CODE_TRANSCRIPT_LOCAL_GC === true
        ? null
        : getMaterializedSessionFile();
    BL({
      uuid,
      transcriptPath,
      savedIn: transcriptPath === HL ? transcriptPath : undefined,
    });
  }
  let savedIn = ng?.savedIn;
  let Cv;
  if ($[89] !== savedIn || $[90] !== og || $[91] !== uuid) {
    Cv =
      uuid === undefined
        ? null
        : {
            uuid,
            summary: og
              ? {
                  savedIn,
                }
              : null,
          };
    $[89] = savedIn;
    $[90] = og;
    $[91] = uuid;
    $[92] = Cv;
  } else Cv = $[92];
  let value = Cv;
  let [Zc] = y(createSegmenter);
  let Mv;
  if ($[93] !== pendingPrompts) {
    Mv = normalizeMessages(pendingPrompts.map(pendingToUserMessage));
    $[93] = pendingPrompts;
    $[94] = Mv;
  } else Mv = $[94];
  let eu = Mv;
  let kv;
  if ($[95] !== Io || $[96] !== eu || $[97] !== Ue) {
    kv = Ue && eu.length > 0 ? Io.concat(eu) : Io;
    $[95] = Io;
    $[96] = eu;
    $[97] = Ue;
    $[98] = kv;
  } else kv = $[98];
  let tu = kv;
  let _v;
  if ($[99] !== Io || $[100] !== Ue) {
    _v = Ue && replyPlugin !== null ? replyPlugin.foldAgentMessages(Io) : null;
    $[99] = Io;
    $[100] = Ue;
    $[101] = _v;
  } else _v = $[101];
  let Jo = _v;
  let ig;
  mJ: {
    if (!Ue || Zc === null) {
      ig = Io;
      break mJ;
    }
    let or;
    if (
      $[102] !== activeAgents ||
      $[103] !== Jo?.folded ||
      $[104] !== columns ||
      $[105] !== isFullscreen ||
      $[106] !== hasStreamingText ||
      $[107] !== host ||
      $[108] !== isFocusedTurnLoading ||
      $[109] !== _o.progressMessagesByToolUseID ||
      $[110] !== uuid ||
      $[111] !== tu ||
      $[112] !== Zc ||
      $[113] !== tools
    ) {
      const progressMessagesByToolUseID = _o.progressMessagesByToolUseID;
      let foldedAgentMessages;
      if ($[115] !== Jo?.folded) {
        foldedAgentMessages = Jo?.folded ?? new Set();
        $[115] = Jo?.folded;
        $[116] = foldedAgentMessages;
      } else foldedAgentMessages = $[116];
      or = Zc.segment(tu, {
        tools,
        activeAgents,
        host,
        columns,
        progressMessagesByToolUseID,
        isLoading: isFocusedTurnLoading,
        hasStreamingText,
        isFullscreen,
        compactionWithoutEarlierMessages: uuid,
        foldedAgentMessages,
      });
      $[102] = activeAgents;
      $[103] = Jo?.folded;
      $[104] = columns;
      $[105] = isFullscreen;
      $[106] = hasStreamingText;
      $[107] = host;
      $[108] = isFocusedTurnLoading;
      $[109] = _o.progressMessagesByToolUseID;
      $[110] = uuid;
      $[111] = tu;
      $[112] = Zc;
      $[113] = tools;
      $[114] = or;
    } else or = $[114];
    ig = or;
  }
  let collapsed = ig;
  let nr = Ue && transcriptPlugin !== null && collapsed !== tu;
  let or;
  if (
    $[117] !== oe ||
    $[118] !== nr ||
    $[119] !== isStreamingThinkingVisible ||
    $[120] !== renderRange ||
    $[121] !== collapsed ||
    $[122] !== Ge.slice ||
    $[123] !== le
  ) {
    pJ: {
      let ag = !le && !oe ? computeSliceStart(collapsed, Ge.slice, isStreamingThinkingVisible) : 0;
      if (renderRange) {
        let renderableMessages;
        if ($[125] !== renderRange[0] || $[126] !== renderRange[1] || $[127] !== collapsed) {
          renderableMessages = collapsed.slice(renderRange[0], renderRange[1]);
          $[125] = renderRange[0];
          $[126] = renderRange[1];
          $[127] = collapsed;
          $[128] = renderableMessages;
        } else renderableMessages = $[128];
        let Qo;
        if ($[129] !== renderRange[0] || $[130] !== renderableMessages) {
          Qo = {
            renderableMessages,
            renderOffset: renderRange[0],
          };
          $[129] = renderRange[0];
          $[130] = renderableMessages;
          $[131] = Qo;
        } else Qo = $[131];
        or = Qo;
        break pJ;
      }
      if (ag > 0) {
        let qi = nr ? adjustSliceStartForReplies(collapsed, ag) : ag;
        const renderableMessages = qi > 0 ? collapsed.slice(qi) : collapsed;
        let Qo;
        if ($[132] !== qi || $[133] !== renderableMessages) {
          Qo = {
            renderableMessages,
            renderOffset: qi,
          };
          $[132] = qi;
          $[133] = renderableMessages;
          $[134] = Qo;
        } else Qo = $[134];
        or = Qo;
        break pJ;
      }
      let xo;
      if ($[135] !== collapsed) {
        xo = {
          renderableMessages: collapsed,
          renderOffset: 0,
        };
        $[135] = collapsed;
        $[136] = xo;
      } else xo = $[136];
      or = xo;
    }
    $[117] = oe;
    $[118] = nr;
    $[119] = isStreamingThinkingVisible;
    $[120] = renderRange;
    $[121] = collapsed;
    $[122] = Ge.slice;
    $[123] = le;
    $[124] = or;
  } else or = $[124];
  let { renderableMessages, renderOffset } = or;
  let xo;
  if ($[137] !== le) {
    xo = !le && isScreenReaderMode();
    $[137] = le;
    $[138] = xo;
  } else xo = $[138];
  let Cn = xo;
  let lg = R(null);
  let Iv = R(0);
  let shownWindowUuidsRef = R(shownWindowUuids_2);
  let Dv = R(0);
  let Qo;
  if (
    $[139] !== Cn ||
    $[140] !== shownWindowUuids_2 ||
    $[141] !== Ge.preCap.advances ||
    $[142] !== Ge.slice.advances
  ) {
    Qo = () => {
      let Av = shownWindowUuidsRef.current;
      shownWindowUuidsRef.current = shownWindowUuids_2;
      let Nv = Av[0];
      let Pv = shownWindowUuids_2[0];
      if (Nv !== undefined && Pv !== undefined && !shownWindowUuids_2.includes(Nv) && Av.includes(Pv))
        Dv.current = Dv.current + 1;
      let Lv = Ge.preCap.advances + Ge.slice.advances + Dv.current;
      if (Lv === Iv.current) {
        return;
      }
      Iv.current = Lv;
      if (Cn && lg.current !== null) setTranscriptFrontCut(lg.current);
    };
    $[139] = Cn;
    $[140] = shownWindowUuids_2;
    $[141] = Ge.preCap.advances;
    $[142] = Ge.slice.advances;
    $[143] = Qo;
  } else Qo = $[143];
  zt(Qo);
  let Ov;
  if ($[144] !== ko || $[145] !== streamingToolUses) {
    let pn;
    if ($[147] !== ko) {
      pn = (FL) => ko(FL).id;
      $[147] = ko;
      $[148] = pn;
    } else pn = $[148];
    Ov = new Set(streamingToolUses.map(pn));
    $[144] = ko;
    $[145] = streamingToolUses;
    $[146] = Ov;
  } else Ov = $[146];
  let ou = Ov;
  let cg = hasContentAfterIndex(renderableMessages, tools, ou);
  let pn;
  if (
    $[149] !== Jo ||
    $[150] !== Io ||
    $[151] !== renderableMessages ||
    $[152] !== Ue ||
    $[153] !== unseenDivider
  ) {
    fJ: {
      if (!unseenDivider) {
        pn = -1;
        break fJ;
      }
      let ug;
      let Pr;
      if ($[155] !== renderableMessages || $[156] !== Ue || $[157] !== unseenDivider.firstUnseenUuid) {
        ug = unseenDivider.firstUnseenUuid.slice(0, UUID_PREFIX_LENGTH);
        Pr = findMessageIndexByShortUuid(renderableMessages, Ue, ug);
        $[155] = renderableMessages;
        $[156] = Ue;
        $[157] = unseenDivider.firstUnseenUuid;
        $[158] = ug;
        $[159] = Pr;
      } else {
        ug = $[158];
        Pr = $[159];
      }
      let Uv = Pr;
      if (Uv !== -1 || Jo === null) {
        pn = Uv;
        break fJ;
      }
      let index = Io.findIndex((VL) => shortUuid(VL) === ug);
      let Bv = index === -1 ? undefined : Io[index];
      if (Bv === undefined || !Jo.folded.has(Bv)) {
        pn = -1;
        break fJ;
      }
      let selectedIdx = buildShortUuidIndex(renderableMessages, Ue);
      for (let idx = index + 1; idx < Io.length; idx++) {
        let Hv = Io[idx];
        if (Jo.folded.has(Hv)) {
          continue;
        }
        let Fv = shortUuid(Hv);
        let Vv = Fv === undefined ? undefined : selectedIdx.get(Fv);
        if (Vv !== undefined) {
          pn = Vv;
          break fJ;
        }
      }
      pn = -1;
    }
    $[149] = Jo;
    $[150] = Io;
    $[151] = renderableMessages;
    $[152] = Ue;
    $[153] = unseenDivider;
    $[154] = pn;
  } else pn = $[154];
  let rr = pn;
  let Pr;
  if (
    $[160] !== rr ||
    $[161] !== nr ||
    $[162] !== renderOffset ||
    $[163] !== renderableMessages ||
    $[164] !== collapsed
  ) {
    gJ: {
      let nu = new Set();
      if (!nr) {
        Pr = nu;
        break gJ;
      }
      let { isLabelledReply, replyRunRowAbove } = transcriptPlugin;
      for (let idx = 0; idx < renderableMessages.length; idx++) {
        if (!isLabelledReply(renderableMessages[idx])) {
          continue;
        }
        let GL = collapsed[renderOffset + idx - 1];
        let onItemClick = replyRunRowAbove(renderableMessages, idx);
        if (GL?.type === "speaker_label" || (nu.has(onItemClick) && !(rr > onItemClick && rr <= idx)))
          nu.add(idx);
      }
      Pr = nu;
    }
    $[160] = rr;
    $[161] = nr;
    $[162] = renderOffset;
    $[163] = renderableMessages;
    $[164] = collapsed;
    $[165] = Pr;
  } else Pr = $[165];
  let ru = Pr;
  let fg = nr ? transcriptPlugin.replyRunRowAbove(renderableMessages, renderableMessages.length) : -1;
  let transcriptV2 = !nr
    ? undefined
    : !transcriptPlugin.isLabelledReply(renderableMessages[fg])
      ? "label"
      : ru.has(fg) && rr <= fg
        ? "continues"
        : undefined;
  let [su, $L] = y(createIdSet);
  let jv;
  if ($[166] === MEMO_CACHE_SENTINEL) {
    jv = (msg) => {
      let k = expandKey(msg);
      $L((prev) => {
        let next = new Set(prev);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        return next;
      });
    };
    $[166] = jv;
  } else jv = $[166];
  let onItemClick = jv;
  let zv;
  if ($[167] !== su) {
    zv = (msg_5) => su.size > 0 && su.has(expandKey(msg_5));
    $[167] = su;
    $[168] = zv;
  } else zv = $[168];
  let Os = zv;
  let Gv;
  let $v;
  if ($[169] !== host || $[170] !== renderableMessages || $[171] !== screen || $[172] !== le) {
    Gv = () => {
      reportMessageWithoutUuid(host, renderableMessages, {
        virtualized: le,
        screen,
      });
    };
    $v = [host, renderableMessages, le, screen];
    $[169] = host;
    $[170] = renderableMessages;
    $[171] = screen;
    $[172] = le;
    $[173] = Gv;
    $[174] = $v;
  } else {
    Gv = $[173];
    $v = $[174];
  }
  P(Gv, $v);
  let au;
  if ($[175] !== collapsed || $[176] !== Ue) {
    hJ: {
      let yg = new Set();
      if (!Ue) {
        au = yg;
        break hJ;
      }
      au =
        (collapsed.forEach((JL, Kv) => {
          if (
            collapsed[Kv - 1]?.type === "speaker_label" ||
            findSpeakerLabelAbove(collapsed, Kv)?.speaker.kind === "inbound"
          )
            yg.add(JL);
        }),
        yg);
    }
    $[175] = collapsed;
    $[176] = Ue;
    $[177] = au;
  } else au = $[177];
  let lu = au;
  let qv;
  if (
    $[178] !== Mo ||
    $[179] !== columns ||
    $[180] !== Vo ||
    $[181] !== host ||
    $[182] !== me ||
    $[183] !== $e ||
    $[184] !== bt ||
    $[185] !== _o ||
    $[186] !== lu ||
    $[187] !== tools ||
    $[188] !== verbose
  ) {
    qv = (msg_6) => {
      if (msg_6.type === "collapsed_read_search") {
        return true;
      }
      if (msg_6.type === "attachment") {
        if (verbose || me) {
          return false;
        }
        if (msg_6.attachment?.type === "queued_command") {
          let trimmed = joinTextContent(msg_6.attachment.prompt).trim();
          if (lu.has(msg_6)) {
            return (
              isPeerOrObserver(msg_6.attachment.origin) &&
              agentMessageOverflows(msg_6, trimmed, msg_6.attachment.origin, $e.columns)
            );
          }
          return (
            isPeerOrObserver(msg_6.attachment.origin) ||
            isTeammateMessageTextInSwarm(trimmed) ||
            isCrossSessionBodyHidden(Vo, msg_6, trimmed, msg_6.attachment.origin)
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
        let Yi = msg_6.message.content[0];
        if (verbose || me) {
          return false;
        }
        return (
          Yi != null &&
          Yi.type === "advisor_tool_result" &&
          Yi.content?.type === "advisor_result" &&
          (!getErrorMessageIfRefusal(Yi) || getAdvisorRefusalText(Yi) !== undefined)
        );
      }
      if (msg_6.type !== "user") {
        return false;
      }
      let Uo = msg_6.message.content[0];
      if (Uo?.type === "text" && isBashOutputText(Uo.text)) {
        if (verbose || me || msg_6.uuid === bt) {
          return false;
        }
        return (
          mcpRenderOverrideFor(BashTool, "isResultTruncated")?.(
            {
              ...splitBashOutputCached(Mo, Uo),
              interrupted: false,
            },
            {
              columns,
            },
          ) ?? false
        );
      }
      if (Uo?.type === "text") {
        if (verbose || me) {
          return false;
        }
        if (lu.has(msg_6)) {
          return (
            isPeerOrObserver(msg_6.origin) &&
            typeof Uo.text === "string" &&
            agentMessageOverflows(msg_6, Uo.text, msg_6.origin, $e.columns)
          );
        }
        return (
          isPeerOrObserver(msg_6.origin) ||
          (typeof Uo.text === "string" &&
            (isTeammateMessageTextInSwarm(Uo.text) ||
              isCrossSessionBodyHidden(Vo, msg_6, Uo.text, msg_6.origin)))
        );
      }
      if (Uo?.type !== "tool_result") {
        return false;
      }
      if (Uo.is_error) {
        return exceedsTenLines(Uo.content);
      }
      if (!msg_6.toolUseResult) {
        return false;
      }
      let name = _o.toolUseByToolUseID.get(Uo.tool_use_id)?.name;
      let Yv = name ? (findToolByName(tools, name) ?? displayOnlyMcpTool(name, host)) : undefined;
      let toolUseResult = msg_6.toolUseResult;
      return (
        (Yv
          ? mcpRenderOverrideFor(Yv, "isResultTruncated")?.(toolUseResult, {
              columns,
            })
          : undefined) ?? false
      );
    };
    $[178] = Mo;
    $[179] = columns;
    $[180] = Vo;
    $[181] = host;
    $[182] = me;
    $[183] = $e;
    $[184] = bt;
    $[185] = _o;
    $[186] = lu;
    $[187] = tools;
    $[188] = verbose;
    $[189] = qv;
  } else qv = $[189];
  let isItemClickable = qv;
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let canAnimate = !Fe && !dialogOfKind;
  let prevProgressState = Se(TerminalWriteContext);
  let Xv;
  let Jv;
  if ($[190] !== prevProgressState) {
    Xv = () => {
      if (!prevProgressState) {
        return;
      }
      setHistoryWriter(prevProgressState);
      return () => clearHistoryWriter(prevProgressState);
    };
    Jv = [prevProgressState];
    $[190] = prevProgressState;
    $[191] = Xv;
    $[192] = Jv;
  } else {
    Xv = $[191];
    Jv = $[192];
  }
  P(Xv, Jv);
  let Qv;
  if ($[193] !== conversationId) {
    Qv = (msg_7) => `${msg_7.uuid}-${conversationId}`;
    $[193] = conversationId;
    $[194] = Qv;
  } else Qv = $[194];
  let Fs = Qv;
  let Zv;
  if (
    $[195] !== canAnimate ||
    $[196] !== columns ||
    $[197] !== commands ||
    $[198] !== conversationId ||
    $[199] !== rr ||
    $[200] !== hasStreamingText ||
    $[201] !== inProgressToolUseIDs ||
    $[202] !== Os ||
    $[203] !== isLoading ||
    $[204] !== ru ||
    $[205] !== $e ||
    $[206] !== cg ||
    $[207] !== bt ||
    $[208] !== it ||
    $[209] !== _o ||
    $[210] !== Fs ||
    $[211] !== renderOffset ||
    $[212] !== renderableMessages ||
    $[213] !== Gt ||
    $[214] !== screen ||
    $[215] !== collapsed ||
    $[216] !== showMessageTimestamps_2 ||
    $[217] !== ou ||
    $[218] !== tools ||
    $[219] !== turn?.armRateLimitAutoContinue ||
    $[220] !== turn?.openRateLimitOptions ||
    $[221] !== unseenDivider ||
    $[222] !== verbose
  ) {
    Zv = (msg, index) => {
      let prevType = index > 0 ? renderableMessages[index - 1] : undefined;
      let isUserContinuation = msg.type === "user" && prevType?.type === "user";
      let isSplitUserContinuation = isSplitUserMessagePart(msg, prevType);
      let nO = collapsed[renderOffset + index - 1];
      let tT = findSpeakerLabelAbove(collapsed, renderOffset + index)?.speaker.kind === "inbound";
      let oT = nO?.type === "speaker_label";
      let continuesLabelledReply = !oT && ru.has(index);
      let hasContentAfter = msg.type === "collapsed_read_search" && (hasStreamingText || index < cg);
      let vg = tT;
      let k_0 = hasStringUuid(msg) ? Fs(msg) : `no-uuid:${index}-${conversationId}`;
      let Tg = jsxProd_default(
        MessageRow,
        {
          message: msg,
          isUserContinuation,
          isSplitUserContinuation,
          followsSpeakerLabel: oT,
          continuesLabelledReply,
          followsInboundLabel: tT,
          hasContentAfter,
          tools,
          commands,
          verbose: verbose || Os(msg),
          showMessageTimestamps: showMessageTimestamps_2,
          inProgressToolUseIDs,
          streamingToolUseIDs: ou,
          screen,
          canAnimate,
          onOpenRateLimitOptions: turn?.openRateLimitOptions,
          onRateLimitAutoQueueContinue: turn?.armRateLimitAutoContinue,
          latestBashOutputUUID: bt,
          columns: vg ? $e.columns : columns,
          isLoading,
          lookups: Gt.forRow(msg, _o),
        },
        k_0,
      );
      let wrapped = Tg;
      let rT = it + (vg ? GUTTER_WIDTH : 0);
      if (rT > 0)
        wrapped = jsxProd_default_2(
          Box,
          {
            flexDirection: "row",
            children: [
              jsxProd_default(NoSelect, {
                fromLeftEdge: true,
                minWidth: rT,
              }),
              vg
                ? jsxProd_default(TerminalSizeContext, {
                    value: $e,
                    children: Tg,
                  })
                : Tg,
            ],
          },
          `li-${k_0}`,
        );
      if (unseenDivider && index === rr) {
        return [
          jsxProd_default(
            Box,
            {
              marginTop: 1,
              paddingLeft: it,
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
    $[199] = rr;
    $[200] = hasStreamingText;
    $[201] = inProgressToolUseIDs;
    $[202] = Os;
    $[203] = isLoading;
    $[204] = ru;
    $[205] = $e;
    $[206] = cg;
    $[207] = bt;
    $[208] = it;
    $[209] = _o;
    $[210] = Fs;
    $[211] = renderOffset;
    $[212] = renderableMessages;
    $[213] = Gt;
    $[214] = screen;
    $[215] = collapsed;
    $[216] = showMessageTimestamps_2;
    $[217] = ou;
    $[218] = tools;
    $[219] = turn?.armRateLimitAutoContinue;
    $[220] = turn?.openRateLimitOptions;
    $[221] = unseenDivider;
    $[222] = verbose;
    $[223] = Zv;
  } else Zv = $[223];
  let Xi = Zv;
  let [uu] = y(createWeakMap_4);
  let sT;
  if ($[224] !== _o || $[225] !== uu || $[226] !== tools) {
    sT = (msg) => {
      let cached = uu.get(msg);
      if (cached !== undefined) {
        return cached;
      }
      let text = getMessageSearchText(msg);
      let lT = true;
      if (msg.type === "user" && msg.toolUseResult && Array.isArray(msg.message.content)) {
        let tr = msg.message.content.find(isToolResultContent);
        if (tr && "tool_use_id" in tr) {
          let tu = _o.toolUseByToolUseID.get(tr.tool_use_id);
          lT = tu !== undefined;
          let tool = tu && findToolByName(tools, tu.name);
          let extracted = tool?.outputSchema?.safeParse(msg.toolUseResult);
          let aO = extracted?.data ?? msg.toolUseResult;
          let uT = extracted === undefined || extracted.success ? tool?.extractSearchText?.(aO) : undefined;
          if (uT !== undefined) text = uT;
        }
      }
      let lowered = text.toLowerCase();
      if (lT) uu.set(msg, lowered);
      return lowered;
    };
    $[224] = _o;
    $[225] = uu;
    $[226] = tools;
    $[227] = sT;
  } else sT = $[227];
  let extractSearchText = sT;
  let mT;
  if ($[228] !== hasStreamingText || $[229] !== Ee || $[230] !== transcriptV2 || $[231] !== turn) {
    mT =
      hasStreamingText && !Ee && turn
        ? jsxProd_default(StreamingTextRow, {
            store: turn.stream.previewStore,
            transcriptV2,
          })
        : null;
    $[228] = hasStreamingText;
    $[229] = Ee;
    $[230] = transcriptV2;
    $[231] = turn;
    $[232] = mT;
  } else mT = $[232];
  let Ji = mT;
  let pT;
  if (
    $[233] !== columns ||
    $[234] !== extractSearchText ||
    $[235] !== isFullscreen ||
    $[236] !== isItemClickable ||
    $[237] !== Os ||
    $[238] !== me ||
    $[239] !== Fs ||
    $[240] !== Xi ||
    $[241] !== renderableMessages ||
    $[242] !== reveal ||
    $[243] !== Cn ||
    $[244] !== scrollViewport ||
    $[245] !== search?.jumpRef ||
    $[246] !== search?.onSearchMatchesChange ||
    $[247] !== search?.scanElement ||
    $[248] !== search?.setPositions ||
    $[249] !== le
  ) {
    pT = le
      ? jsxProd_default(expandContextSignal.Provider, {
          value: true,
          children: jsxProd_default(VirtualMessageList, {
            messages: renderableMessages,
            scrollViewport,
            columns,
            itemKey: Fs,
            renderItem: Xi,
            onItemClick,
            isItemClickable,
            isItemExpanded: Os,
            trackStickyPrompt: !me && isFullscreen,
            jumpRef: search?.jumpRef,
            revealRef: reveal,
            onSearchMatchesChange: search?.onSearchMatchesChange,
            scanElement: search?.scanElement,
            setPositions: search?.setPositions,
            extractSearchText,
          }),
        })
      : Cn
        ? jsxProd_default(Box, {
            flexDirection: "column",
            ref: lg,
            children: renderableMessages.flatMap(Xi),
          })
        : renderableMessages.flatMap(Xi);
    $[233] = columns;
    $[234] = extractSearchText;
    $[235] = isFullscreen;
    $[236] = isItemClickable;
    $[237] = Os;
    $[238] = me;
    $[239] = Fs;
    $[240] = Xi;
    $[241] = renderableMessages;
    $[242] = reveal;
    $[243] = Cn;
    $[244] = scrollViewport;
    $[245] = search?.jumpRef;
    $[246] = search?.onSearchMatchesChange;
    $[247] = search?.scanElement;
    $[248] = search?.setPositions;
    $[249] = le;
    $[250] = pT;
  } else pT = $[250];
  let children = pT;
  const value_2 = Jo?.counts ?? monitorEventCache;
  let children_2;
  if ($[251] !== value || $[252] !== children) {
    children_2 = jsxProd_default(CompactSummaryContext, {
      value,
      children,
    });
    $[251] = value;
    $[252] = children;
    $[253] = children_2;
  } else children_2 = $[253];
  let fT;
  if ($[254] !== value_2 || $[255] !== children_2) {
    fT = jsxProd_default(monitorEventCacheStore, {
      value: value_2,
      children: children_2,
    });
    $[254] = value_2;
    $[255] = children_2;
    $[256] = fT;
  } else fT = $[256];
  let children_3 = fT;
  let gT;
  if ($[257] !== hiddenMessageCount_2 || $[258] !== Cn) {
    gT = Cn ? "" : `${sequential.bold(hiddenMessageCount_2)} `;
    $[257] = hiddenMessageCount_2;
    $[258] = Cn;
    $[259] = gT;
  } else gT = $[259];
  let Ws = gT;
  let mu;
  if (
    $[260] !== columns ||
    $[261] !== hasTruncatedMessages_2 ||
    $[262] !== Ws ||
    $[263] !== toggleShowAllShortcut
  ) {
    mu =
      hasTruncatedMessages_2 &&
      jsxProd_default(Divider, {
        title: `${toggleShowAllShortcut} to show ${Ws}previous messages`,
        width: columns,
      });
    $[260] = columns;
    $[261] = hasTruncatedMessages_2;
    $[262] = Ws;
    $[263] = toggleShowAllShortcut;
    $[264] = mu;
  } else mu = $[264];
  let pu;
  if (
    $[265] !== columns ||
    $[266] !== oe ||
    $[267] !== Ws ||
    $[268] !== hiddenMessageCount_2 ||
    $[269] !== me ||
    $[270] !== _e ||
    $[271] !== toggleShowAllShortcut
  ) {
    pu =
      me &&
      _e &&
      hiddenMessageCount_2 > 0 &&
      !oe &&
      jsxProd_default(Divider, {
        title: `${toggleShowAllShortcut} to hide ${Ws}previous messages`,
        width: columns,
      });
    $[265] = columns;
    $[266] = oe;
    $[267] = Ws;
    $[268] = hiddenMessageCount_2;
    $[269] = me;
    $[270] = _e;
    $[271] = toggleShowAllShortcut;
    $[272] = pu;
  } else pu = $[272];
  let fu;
  if ($[273] !== children_3) {
    fu = jsxProd_default(SuggestionSlot, {
      value: null,
      children: children_3,
    });
    $[273] = children_3;
    $[274] = fu;
  } else fu = $[274];
  let gu;
  if ($[275] !== it || $[276] !== Ji) {
    gu =
      Ji !== null && it > 0
        ? jsxProd_default_2(Box, {
            flexDirection: "row",
            children: [
              jsxProd_default(NoSelect, {
                fromLeftEdge: true,
                minWidth: it,
              }),
              Ji,
            ],
          })
        : Ji;
    $[275] = it;
    $[276] = Ji;
    $[277] = gu;
  } else gu = $[277];
  let hT;
  if ($[278] !== ct || $[279] !== mu || $[280] !== pu || $[281] !== fu || $[282] !== gu) {
    hT = jsxProd_default_2(TerminalSizeContext, {
      value: ct,
      children: [mu, pu, fu, gu],
    });
    $[278] = ct;
    $[279] = mu;
    $[280] = pu;
    $[281] = fu;
    $[282] = gu;
    $[283] = hT;
  } else hT = $[283];
  return hT;
}
//@ chunk-ag5x7vhf.js:199016-199223 layout
function findMessageIndexByShortUuid(renderableMessages, h, x) {
  return renderableMessages.findIndex(
    (T) =>
      shortUuid(T) === x ||
      (h &&
        ((T.type === "work_segment" && T.messages.some((message) => shortUuid(message) === x)) ||
          (T.type === "recap_fold" && T.notices.some((notice) => shortUuid(notice) === x)) ||
          collapsedRowOf(T)?.some((k) => shortUuid(k) === x) === true)),
  );
}
//@ chunk-ag5x7vhf.js:199223-199537 layout
/**
 * 为渲染行建立 短 uuid → 行下标 的索引；展开时也收录 work_segment/recap_fold 等折叠组内的消息。
 */
function buildShortUuidIndex(renderableMessages, h) {
  let x = new Map();
  for (let idx = 0; idx < renderableMessages.length; idx++) {
    let k = renderableMessages[idx];
    let _ = shortUuid(k);
    if (_ !== undefined && !x.has(_)) x.set(_, idx);
    if (!h) continue;
    let I =
      k.type === "work_segment"
        ? k.messages
        : k.type === "recap_fold"
          ? k.notices
          : (collapsedRowOf(k) ?? undefined);
    if (I === undefined) continue;
    for (let D of I) {
      let A = shortUuid(D);
      if (A !== undefined && !x.has(A)) x.set(A, idx);
    }
  }
  return x;
}
//@ chunk-ag5x7vhf.js:199537-199618 file-local
function expandKey(msg) {
  return (msg.type === "assistant" || msg.type === "user" ? getToolUseID(msg) : null) ?? msg.uuid;
}
//@ chunk-ag5x7vhf.js:199618-199755 layout
function isCrossSessionBodyHidden(m, h, x, origin) {
  if (isTaggedPeerText(x)) {
    let k = m.get(h);
    if (k === undefined) {
      k = crossSessionPreviewHidesBody(x, origin?.kind === "peer" && origin.hostInjected === true);
      m.set(h, k);
    }
    return k;
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
  next(m, h, x) {
    this.previous = dedupeStreamingToolUses(this.previous, m, h, x);
    return this.previous;
  }
}
//@ chunk-ag5x7vhf.js:200003-200250 layout
function dedupeStreamingToolUses(previous, h, x, T) {
  let k = new Set();
  let _ = [];
  for (let I of h) {
    let id = I.contentBlock.id;
    if (id) {
      let A = id;
      if (x.has(A) || T.has(A) || k.has(A)) continue;
      k.add(A);
    }
    _.push(I);
  }
  if (_.length === 0) return EMPTY_TOOL_USE_LIST;
  if (_.length === previous.length && _.every((I, D) => I === previous[D])) return previous;
  return _;
}
//@ chunk-ag5x7vhf.js:200250-200295 layout
function keepPreviousIfSame(m, messages, x) {
  return x && m[0] === messages[0] ? m : messages;
}
//@ chunk-ag5x7vhf.js:200295-200980 fingerprint = Messages (0.801)
/**
 * 消息列表组件：MessagesImpl 的 memo 版本，自定义比较忽略 scrollViewport/search/reveal，并对 streamingToolUses、inProgressToolUseIDs、unseenDivider、tools 做浅比较。
 */
var Messages = Rh(MessagesImpl, (prev, next) => {
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
var EMPTY_ID_SET = new Set();
var EMPTY_ARRAY_A = [];
var EMPTY_ARRAY_B = [];
var EMPTY_ARRAY_C = [];
//@ chunk-0sfjpx19.js:33717-34121 fingerprint = dropTextInBriefTurns (1)
function dropTextInBriefTurns(snapshot) {
  let n = new Map();
  let turnsWithBrief = new Set();
  for (let j = snapshot.length - 1; j >= 0; j--) {
    let h = snapshot[j];
    if (h.type === "assistant") {
      for (let _ of h.message.content) if (_.type === "tool_use") n.set(_.id, _.name);
      continue;
    }
    if (h.type !== "user") continue;
    let content = h.message.content;
    if (!hasToolResultBlock(content)) {
      if (h.isMeta !== true) break;
      continue;
    }
    for (let _ of content)
      if (typeof _ !== "string" && _.type === "tool_result") turnsWithBrief.add(_.tool_use_id);
  }
  for (let s of turnsWithBrief) n.delete(s);
  return n;
}
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
