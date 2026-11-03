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
import { Rh, fo, j, yt, R, P, qt, y, zt, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { iP, useHost } from "../context/session.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { StartupUpdateSummary } from "./LogoV2/UpdateSummary.js";
import { LogoV2 } from "./LogoV2/LogoV2.js";
import { Box, Text } from "../ink/components/Text.js";
import { FreezeWhenOffscreen } from "./FreezeWhenOffscreen.js";
import { hr } from "./LogoV2/CondensedLogo.js";
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
  kCe,
} from "../utils/messages.js";
import { RetainedOutputChecker } from "../utils/messages/incrementalNormalizer.js";
import { computeSearchText } from "../utils/transcriptSearch.js";
import { H4t } from "../utils/fsWatchProbe.js";
import { ife, isNavigableMessage } from "./messageActions.js";
import { BLACK_CIRCLE } from "../utils/permissions/autoModeRulesPrompt.js";
import { StreamingMarkdown } from "./pluginUi/render/MarkdownBlock.js";
import { Nu } from "../context/QueuedMessageContext.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useAppState, Cr } from "../state/AppState.js";
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
import { Iho } from "./messages/UserPromptMessage.js";
import { qB } from "../utils/backgroundSessionResume.js";
import { isHumanOrAutoContinuation, joinTextContent, isPeerOrObserver } from "../utils/messageProvenance.js";
import { shortUuid, reportMessageWithoutUuid } from "../utils/transcriptDiagnostics.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { shouldShowNotice } from "./SlashCommandLink.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { lTe } from "./Spinner/SpinnerColumn.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { env } from "../utils/env.js";
import { Wj, i0t } from "./messages/transcriptModeContext.js";
import { fmt } from "../constants/xml.js";
import { Us } from "../services/projects/threadRows.js";
import { countToolCallsSince_2 } from "./_new/countToolCallsSince_2.js";
import { collapseBackgroundBashNotifications } from "../utils/collapseBackgroundBashNotifications.js";
import { collapseHookSummaries } from "../utils/collapseHookSummaries.js";
import { collapseHookAttachments, yp, dropRepeatedTurnDurations } from "./_new/dropRepeatedTurnDurations.js";
import { collapseTeammateShutdowns } from "../utils/collapseTeammateShutdowns.js";
import { findLeadingCompactBoundary, CompactSummaryContext } from "./messages/GroupedToolUseContent.js";
import { isDiskless } from "../bootstrap/state.js";
import { wt } from "../remote/remoteMode.js";
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
import { Pho } from "./messages/UserCommandMessage.js";
import { exceedsTenLines } from "../utils/messages/textLineCount.js";
import { findToolByName } from "../Tool.js";
import { displayOnlyMcpTool } from "../tools/MCPTool/displayOnlyTool.js";
import { useDialogOfKind } from "../state/dialogQueue.js";
import { LOCAL_JSX_DIALOG } from "../commands/rate-limit-options/index.js";
import { gFo, hFo } from "../utils/hooks/hookEventHelpers.js";
import { hasStringUuid } from "../bridge/inboundMessages.js";
import { NoSelect } from "../ink/components/Input.js";
import { TerminalSizeContext } from "../ink/terminalModes.js";
import { Divider } from "./design-system/Divider.js";
import { plural } from "../utils/stringUtils.js";
import { d5 } from "./messages/expandContext.js";
import { VirtualMessageList } from "./VirtualMessageList.js";
import { MAr, xtn } from "./messages/TeammateResultMessage.js";
import { sequential } from "../utils/sequential.js";
import { zBo } from "../utils/queuedCommandDisplay.js";
import { isTaggedPeerText } from "../utils/crossSessionMessages.js";
import { crossSessionPreviewHidesBody } from "./messages/UserCrossSessionMessage.js";

//@ chunk-ag5x7vhf.js:117168-117911 callgraph-fingerprint = LogoHeader (0.199)
var LogoHeader = Rh(function (t0) {
  let $ = w(14),
    {
      latchAnnouncementSlot: latchAnnouncementSlot,
      hideWelcomeChrome: hideWelcomeChrome,
      homeMessage: homeMessage,
      hideLogo: hideLogo,
    } = t0,
    I = latchAnnouncementSlot === void 0 ? !0 : latchAnnouncementSlot,
    D = hideWelcomeChrome === void 0 ? !1 : hideWelcomeChrome,
    A = homeMessage === void 0 ? !1 : homeMessage,
    L = hideLogo === void 0 ? !1 : hideLogo,
    V = iP() !== void 0;
  const W = A ? 1 : 0;
  let K;
  if ($[0] !== L || $[1] !== D)
    ((K = !D && e(StartupUpdateSummary, { hideLogo: L })), ($[0] = L), ($[1] = D), ($[2] = K));
  else K = $[2];
  let q;
  if ($[3] !== V || $[4] !== A || $[5] !== I)
    ((q = V && e(fo, { fallback: null, children: e(LogoV2, { latchAnnouncementSlot: I, homeMessage: A }) })),
      ($[3] = V),
      ($[4] = A),
      ($[5] = I),
      ($[6] = q));
  else q = $[6];
  let Y;
  if ($[7] !== W || $[8] !== K || $[9] !== q)
    ((Y = r(Box, { flexDirection: "column", gap: 1, flexGrow: W, children: [K, null, q] })),
      ($[7] = W),
      ($[8] = K),
      ($[9] = q),
      ($[10] = Y));
  else Y = $[10];
  let pe;
  if ($[11] !== I || $[12] !== Y)
    ((pe = e(FreezeWhenOffscreen, { children: e(hr.Provider, { value: I, children: Y }) })),
      ($[11] = I),
      ($[12] = Y),
      ($[13] = pe));
  else pe = $[13];
  return pe;
});
//@ chunk-ag5x7vhf.js:126968-127017 placement
function _p() {
  return { head: void 0, upTo: 0, seed: !1 };
}
//@ chunk-ag5x7vhf.js:127017-127168 placement
function scanForMultiBlockMessage(m, h, x) {
  if (m[0] !== x.head || h < x.upTo) ((x.head = m[0]), (x.upTo = 0), (x.seed = !1));
  for (let upTo = x.upTo; upTo < h && !x.seed; upTo++) x.seed = hasMultipleContentBlocks(m[upTo]);
  return ((x.upTo = h), x.seed);
}
/**
 * UI 侧增量规范化缓存：复用与上次输入相同的前后缀（末尾 RECENT=4 条总是重算），只对变化部分调用 normalizeMessages；探针发现损坏时整体重建（damageRebuilds）。
 */
//@ chunk-ag5x7vhf.js:127168-128928 sole-consumer
class IncrementalMessageNormalizer {
  cache;
  static RECENT = 4;
  static PRUNE_PENDING_AT = 64;
  input = [];
  output = [];
  starts = [0];
  chainAt = [!1];
  pending = new Map();
  lastWalked = 0;
  damageRebuilds = 0;
  probe = new RetainedOutputChecker();
  inputLength = 0;
  constructor(m) {
    this.cache = m;
  }
  normalize(m, h) {
    let input = this.input,
      max = Math.max(0, m.length - IncrementalMessageNormalizer.RECENT),
      k = 0,
      _ = 0;
    if (this.chainAt[0] === h) {
      let min = Math.min(input.length, max);
      while (k < min && input[k] === m[k]) k++;
      let min_2 = Math.min(input.length - k, max - k);
      while (_ < min_2 && input[input.length - 1 - _] === m[m.length - 1 - _]) _++;
    }
    if (input.length !== this.inputLength) ((k = 0), (_ = 0));
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
    )
      ((k = 0),
        (_ = 0),
        (this.input = []),
        (this.inputLength = 0),
        (this.output = []),
        (this.starts = [0]),
        (this.chainAt = [!1]),
        this.damageRebuilds++);
    let sliced = this.output.slice(0, this.starts[k]),
      sliced_2 = this.starts.slice(0, k + 1),
      sliced_3 = this.chainAt.slice(0, k + 1);
    if (k === 0) sliced_3[0] = h;
    let L = sliced_3[k],
      V = 0,
      W = (q, Y) => {
        for (let pe = q; pe < Y; pe++) {
          let xe = m[pe];
          for (let ge of normalizeMessages([xe], L, this.cache)) if (isNotEmptyMessage(ge)) sliced.push(ge);
          if ((this.notePending(xe, L), hasMultipleContentBlocks(xe))) L = !0;
          (sliced_2.push(sliced.length), sliced_3.push(L), V++);
        }
      },
      z = m.length - _;
    W(k, z);
    let K = input.length - _;
    if (_ > 0 && this.chainAt[K] === L) {
      let q = sliced.length - this.starts[K];
      for (let Y = this.starts[K]; Y < this.output.length; Y++) sliced.push(this.output[Y]);
      for (let Y = K + 1; Y <= input.length; Y++)
        (sliced_2.push(this.starts[Y] + q), sliced_3.push(this.chainAt[Y]));
    } else W(z, m.length);
    return (
      this.refreshPending(m),
      (this.input = m),
      (this.inputLength = m.length),
      (this.output = sliced),
      (this.starts = sliced_2),
      (this.chainAt = sliced_3),
      (this.lastWalked = V),
      sliced
    );
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
      (normalizeMessages([x], T, this.cache), this.notePending(x, T));
    }
  }
}
//@ chunk-ag5x7vhf.js:136421-136460 placement
var kw = new Set([INTERRUPT_MESSAGE, INTERRUPT_MESSAGE_FOR_TOOL_USE]),
  weakMap_3 = new WeakMap();
/**
 * 取消息的小写搜索文本，按消息对象 WeakMap 缓存。
 */
//@ chunk-ag5x7vhf.js:136460-136561 placement
function getMessageSearchText(m) {
  let h = weakMap_3.get(m);
  if (h !== void 0) return h;
  let lower = computeSearchText(m).toLowerCase();
  return (weakMap_3.set(m, lower), lower);
}
//@ chunk-ag5x7vhf.js:138975-138979 placement
j();
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
        let D = message.message.content[0];
        if (D?.type === "server_tool_use") return lookups.resolvedToolUseIDs.has(D.id);
      }
      let toolUseID = getToolUseID(message);
      if (!toolUseID) return !0;
      if (streamingToolUseIDs.has(toolUseID)) return !1;
      if (inProgressToolUseIDs.has(toolUseID)) return !1;
      if (hasUnresolvedHooksFromLookup(toolUseID, "PostToolUse", lookups)) return !1;
      return H4t(siblingToolUseIDs, lookups.resolvedToolUseIDs);
    }
    case "system":
      return !0;
    case "grouped_tool_use":
      return message.messages.every((msg) => {
        let A = msg.message.content[0];
        return A?.type === "tool_use" && lookups.resolvedToolUseIDs.has(A.id);
      });
    case "collapsed_read_search":
      return screen === "transcript" && ife(message).every((I) => lookups.resolvedToolUseIDs.has(I));
    case "work_segment":
      return !message.isLive;
    case "speaker_label":
    case "recap_fold":
      return !0;
  }
}
/**
 * 说话人标签组件槽（初始 null）；同一声明里的 ql 是流式输出文本行组件。
 */
//@ chunk-ag5x7vhf.js:148068-148926 placement
var speakerLabelComponent = null,
  StreamingTextRow = Rh(function (h) {
    let D = w(14),
      { store: store, transcriptV2: transcriptV2 } = h,
      { displayed: displayed, hideTrailingLine: hideTrailingLine } = yt(store.subscribe, store.getDerived);
    if (!displayed) {
      return null;
    }
    const I = transcriptV2 === void 0 ? "row" : "column";
    let A;
    if (D[0] !== transcriptV2)
      ((A =
        transcriptV2 === "label" &&
        speakerLabelComponent !== null &&
        e(speakerLabelComponent, { speaker: { kind: "claude" } })),
        (D[0] = transcriptV2),
        (D[1] = A));
    else A = D[1];
    let L;
    if (D[2] !== transcriptV2)
      ((L =
        transcriptV2 === void 0 &&
        e(Box, {
          minWidth: 2,
          children: e(Text, { "aria-label": "claude:", color: "text", children: BLACK_CIRCLE }),
        })),
        (D[2] = transcriptV2),
        (D[3] = L));
    else L = D[3];
    let V;
    if (D[4] !== displayed || D[5] !== hideTrailingLine)
      ((V = e(Box, {
        flexDirection: "column",
        children: e(StreamingMarkdown, { hideTrailingLine: hideTrailingLine, children: displayed }),
      })),
        (D[4] = displayed),
        (D[5] = hideTrailingLine),
        (D[6] = V));
    else V = D[6];
    let W;
    if (D[7] !== L || D[8] !== V)
      ((W = r(Box, { flexDirection: "row", children: [L, V] })), (D[7] = L), (D[8] = V), (D[9] = W));
    else W = D[9];
    let z;
    if (D[10] !== I || D[11] !== A || D[12] !== W)
      ((z = r(Box, {
        alignItems: "flex-start",
        flexDirection: I,
        marginTop: 1,
        width: "100%",
        children: [A, W],
      })),
        (D[10] = I),
        (D[11] = A),
        (D[12] = W),
        (D[13] = z));
    else z = D[13];
    return z;
  });
//@ chunk-ag5x7vhf.js:148926-148930 placement
j();
//@ chunk-ag5x7vhf.js:148930-148934 placement
j();
//@ chunk-ag5x7vhf.js:148934-149008 placement
function useCommandQueue() {
  let m = Nu();
  return yt(m.subscribe, m.getCommandQueueSnapshot);
}
//@ chunk-ag5x7vhf.js:149162-149198 placement
function OD(ge) {
  return ge.isLoading;
}
//@ chunk-ag5x7vhf.js:149198-149230 placement
function UD(Re) {
  return Re.tasks;
}
//@ chunk-ag5x7vhf.js:149230-149293 placement
function BD() {
  return resolveSetting("terminalProgressBarEnabled", !0).value;
}
/**
 * 根据加载状态、进行中的工具与后台 agent/工作流，计算任务进度并通过终端通知（OSC 进度）上报；卸载时清除。
 */
//@ chunk-ag5x7vhf.js:149293-149989 placement
function TerminalTaskProgress(m) {
  let I = w(13),
    { turn: turn, hasToolsInProgress: hasToolsInProgress } = m,
    T = useStoreSelector(turn, OD),
    k = useAppState(UD),
    _ = useCommandQueue(),
    D;
  if (I[0] !== _ || I[1] !== k)
    ((D = countPendingBackgroundWork({ tasks: k, queuedCommands: _ })), (I[0] = _), (I[1] = k), (I[2] = D));
  else D = I[2];
  let A = D,
    L = A.pendingAgents > 0 || A.pendingWorkflows > 0,
    V = renderWithForceUpdate(BD),
    { progress: progress } = useTerminalNotification(),
    z = R(null),
    K,
    q;
  if (I[3] !== V || I[4] !== L || I[5] !== hasToolsInProgress || I[6] !== T || I[7] !== progress)
    ((K = () => {
      let Y = useTaskListWatcher({
        enabled: V,
        isLoading: T,
        hasToolsInProgress: hasToolsInProgress,
        hasPendingBackgroundWork: L,
      });
      if (z.current === Y) {
        return;
      }
      ((z.current = Y), progress(Y));
    }),
      (q = [progress, V, T, hasToolsInProgress, L]),
      (I[3] = V),
      (I[4] = L),
      (I[5] = hasToolsInProgress),
      (I[6] = T),
      (I[7] = progress),
      (I[8] = K),
      (I[9] = q));
  else ((K = I[8]), (q = I[9]));
  P(K, q);
  let pe, xe;
  if (I[10] !== progress)
    ((pe = () => () => {
      if (z.current !== null) ((z.current = null), progress(null));
    }),
      (xe = [progress]),
      (I[10] = progress),
      (I[11] = pe),
      (I[12] = xe));
  else ((pe = I[11]), (xe = I[12]));
  return (P(pe, xe), null);
}
//@ chunk-ag5x7vhf.js:149989-149993 placement
j();
//@ chunk-ag5x7vhf.js:149993-150071 placement
function wr(m, h) {
  return h === 0 ? m : { columns: Math.max(1, m.columns - h), rows: m.rows };
}
//@ chunk-ag5x7vhf.js:150628-150632 placement
j();
//@ chunk-ag5x7vhf.js:150632-150636 placement
j();
//@ chunk-ag5x7vhf.js:151691-151707 placement
var Gp = qt(null);
//@ chunk-ag5x7vhf.js:151707-151711 placement
j();
//@ chunk-ag5x7vhf.js:151711-151715 placement
j();
//@ chunk-ag5x7vhf.js:158357-158361 placement
j();
//@ chunk-ag5x7vhf.js:176529-176563 placement
function FP(lO) {
  return lO.verbose;
}
//@ chunk-ag5x7vhf.js:176563-176605 placement
function VP(cO) {
  return cO.briefTranscript;
}
//@ chunk-ag5x7vhf.js:176605-176653 placement
function WP(uO) {
  return uO.hasRemoteReplyChannel;
}
//@ chunk-ag5x7vhf.js:176653-176709 placement
function jP(dO) {
  return dO.agentDefinitions.activeAgents;
}
//@ chunk-ag5x7vhf.js:176709-176757 placement
function zP(mO) {
  return mO.showMessageTimestamps;
}
//@ chunk-ag5x7vhf.js:176757-176803 placement
function GP() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_silk_hinge", !1);
}
//@ chunk-ag5x7vhf.js:176803-176828 placement
function $P(yJ) {
  return !1;
}
//@ chunk-ag5x7vhf.js:176828-176869 placement
function KP() {
  return new IncrementalMessageNormalizer(new WeakMap());
}
//@ chunk-ag5x7vhf.js:176869-176897 placement
function qP() {
  return new TranscriptProgressSplitter();
}
//@ chunk-ag5x7vhf.js:176897-176925 placement
function YP() {
  return new UnresolvedToolUseTracker();
}
//@ chunk-ag5x7vhf.js:176925-176953 placement
function XP() {
  return new MessageLookupsBuilder();
}
//@ chunk-ag5x7vhf.js:176953-176982 placement
function JP() {
  return new IncrementalCollapser();
}
//@ chunk-ag5x7vhf.js:176982-177010 placement
function QP() {
  return new RowLookupsProjector();
}
//@ chunk-ag5x7vhf.js:177010-177043 placement
function ZP() {
  return new WeakMap();
}
//@ chunk-ag5x7vhf.js:177043-177076 placement
function eL() {
  return new WeakMap();
}
//@ chunk-ag5x7vhf.js:177076-177104 placement
function tL() {
  return new Zf();
}
//@ chunk-ag5x7vhf.js:177104-177137 placement
function oL() {
  return new WeakMap();
}
//@ chunk-ag5x7vhf.js:177137-177167 placement
function nL(pO) {
  return !isInvisibleMessage(pO);
}
//@ chunk-ag5x7vhf.js:177167-177198 placement
function rL(fO) {
  return fO.uuid;
}
//@ chunk-ag5x7vhf.js:177198-177261 placement
function sL() {
  return uo === null ? null : new uo.TranscriptSegmenter();
}
//@ chunk-ag5x7vhf.js:177261-177351 placement
function iL(m, gO) {
  let { text: text, origin: origin } = m;
  return createUserMessage({ content: text, origin: origin, uuid: Iho(gO) });
}
//@ chunk-ag5x7vhf.js:177351-177380 placement
function aL() {
  return new Set();
}
//@ chunk-ag5x7vhf.js:177380-177413 placement
function lL() {
  return new WeakMap();
}
//@ chunk-ag5x7vhf.js:177413-177460 placement
function cL(bO) {
  return bO.type === "tool_result";
}
//@ chunk-ag5x7vhf.js:177460-177496 placement
function uL(et) {
  return et.isLoading;
}
//@ chunk-ag5x7vhf.js:177496-177540 placement
function dL(Ke) {
  return Ke.streamingToolUses;
}
//@ chunk-ag5x7vhf.js:177540-177588 placement
function mL(Ye) {
  return Ye.userInputOnProcessing;
}
//@ chunk-ag5x7vhf.js:177588-177632 placement
function pL(je) {
  return je.placeholderOrigin;
}
//@ chunk-ag5x7vhf.js:177632-177687 placement
function fL(Xe) {
  return Xe.followingPromptsOnProcessing;
}
//@ chunk-ag5x7vhf.js:177687-177738 placement
function gL(Et) {
  return Et.placeholderWaitedInQueue;
}
//@ chunk-ag5x7vhf.js:177738-177776 placement
function hL(Ct) {
  return Ct.isBriefOnly;
}
//@ chunk-ag5x7vhf.js:177776-177810 placement
function yL(bt) {
  return bt.verbose;
}
//@ chunk-ag5x7vhf.js:177810-177849 placement
function bL(_t) {
  return _t.settledReply;
}
//@ chunk-ag5x7vhf.js:177849-177880 placement
function SL(xt) {
  return xt.uuid;
}
//@ chunk-ag5x7vhf.js:177880-178116 file-local
var BRIEF_TOOL_NAME = require("./chunk-vswknp5v.js").BRIEF_TOOL_NAME,
  SEND_USER_FILE_TOOL_NAME = require("./chunk-j52bj3xs.js").SEND_USER_FILE_TOOL_NAME,
  isBriefEnabled = require("./chunk-cv3kgbt2.js").isBriefEnabled,
  Bn = null,
  isPewterOwlTool = require("./chunk-egdy92df.js").isPewterOwlTool,
  uo = null,
  cc = null;
//@ chunk-ag5x7vhf.js:178116-179178 fingerprint = filterForBriefTool (0.892)
function filterForBriefTool(m, h, x) {
  let nameSet = new Set(h),
    k = new Set(x),
    briefToolUseIDs = new Set(),
    I = [],
    D = 0;
  for (let L = 0; L < m.length; L++) {
    let V = m[L],
      W = V.message?.content[0];
    if (V.type === "user" && W?.type !== "tool_result" && (!V.isMeta || qB(V.origin))) D++;
    else if (
      V.type === "attachment" &&
      V.attachment?.type === "queued_command" &&
      V.attachment.commandMode === "prompt" &&
      (qB(V.attachment.origin) || (!V.attachment.isMeta && isHumanOrAutoContinuation(V.attachment.origin)))
    )
      D++;
    else if (V.type === "assistant" && W?.type === "tool_use" && W.name && k.has(W.name))
      briefToolUseIDs.add(D);
    I[L] = D;
  }
  let A = new Set();
  return m.filter((L, V) => {
    if (L.type === "system") return !0;
    let block = L.message?.content[0];
    if (L.type === "assistant") {
      if (L.isApiErrorMessage) return !0;
      if (block?.type === "tool_use" && block.name && nameSet.has(block.name)) {
        if ("id" in block) A.add(block.id);
        return !0;
      }
      if ((block?.type === "text" || isSignedThinkingBlock(block)) && !briefToolUseIDs.has(I[V])) return !0;
      return !1;
    }
    if (L.type === "user") {
      if (block?.type === "tool_result") return block.tool_use_id !== void 0 && A.has(block.tool_use_id);
      return !L.isMeta || qB(L.origin);
    }
    if (L.type === "attachment") {
      let att = L.attachment;
      return (
        att?.type === "queued_command" &&
        att.commandMode === "prompt" &&
        (qB(att.origin) || (!att.isMeta && isHumanOrAutoContinuation(att.origin)))
      );
    }
    return !1;
  });
}
//@ chunk-ag5x7vhf.js:179178-179721 layout = hasSuccessfulToolCall (0.85)
function hasSuccessfulToolCall(messages, toolName) {
  let x = new Set(toolName),
    T = new Set(),
    k = new Map(),
    _ = [],
    I = 0;
  for (let D = 0; D < messages.length; D++) {
    let A = messages[D],
      L = A.message?.content[0];
    if (A.type === "user" && L?.type !== "tool_result" && !A.isMeta) {
      I++;
      continue;
    }
    if (A.type === "assistant") {
      if (L?.type === "text" || isSignedThinkingBlock(L)) _[D] = I;
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
  return messages.filter((D, A) => {
    let L = _[A];
    return L === void 0 || !T.has(L);
  });
}
//@ chunk-ag5x7vhf.js:179721-179749 layout
var fs = 30,
  Sv = 50,
  Ix = 200,
  uc = 2;
//@ chunk-ag5x7vhf.js:179749-179897 layout
function isSplitUserMessagePart(m, h) {
  if (m.type !== "user" || h?.type !== "user") return !1;
  let x = shortUuid(m);
  return x !== void 0 && x === shortUuid(h) && h.message.content[0]?.type !== "tool_result";
}
//@ chunk-ag5x7vhf.js:179897-180008 layout
function findSpeakerLabelAbove(m, h) {
  let x = h;
  while (x > 0 && isSplitUserMessagePart(m[x], m[x - 1])) x--;
  let T = m[x - 1];
  return T?.type === "speaker_label" ? T : void 0;
}
//@ chunk-ag5x7vhf.js:180008-180052 layout
function Dx(m, h) {
  return h ? Math.min(Ix, m) : Ix;
}
/**
 * 消息列表切片缓存：会话 id 或 verbose 变化时失效 preCap/slice。
 */
//@ chunk-ag5x7vhf.js:180052-180371 layout
class MessagesSliceCache {
  conversationId;
  verbose;
  preCap = { current: null, advances: 0 };
  slice = { current: null, advances: 0 };
  constructor(m, h) {
    this.conversationId = m;
    this.verbose = h;
  }
  sync(m, h) {
    if (this.conversationId !== m)
      ((this.conversationId = m), (this.preCap.current = null), (this.slice.current = null));
    if (this.verbose !== h) ((this.verbose = h), (this.slice.current = null));
  }
}
//@ chunk-ag5x7vhf.js:180371-180761 fingerprint = computeSliceStart (0.738)
function computeSliceStart(collapsed, anchorRef, cap, step = Sv) {
  let anchor = anchorRef.current,
    _ = anchor
      ? collapsed[anchor.idx]?.uuid === anchor.uuid
        ? anchor.idx
        : collapsed.findIndex((L) => L?.uuid === anchor.uuid)
      : -1,
    I = _ >= 0 ? _ : anchor && anchor.idx < collapsed.length ? anchor.idx : 0;
  if (collapsed.length - I > cap + step) {
    if (((I = collapsed.length - cap), _ >= 0 || (anchor !== null && anchor.idx < collapsed.length)))
      anchorRef.advances++;
  }
  let msgAtStart = collapsed[I],
    A = typeof msgAtStart?.uuid === "string" ? msgAtStart.uuid : void 0;
  if (A !== void 0 && (anchor?.uuid !== A || anchor.idx !== I)) anchorRef.current = { uuid: A, idx: I };
  else if (msgAtStart === void 0 && anchor) anchorRef.current = null;
  return I;
}
//@ chunk-ag5x7vhf.js:180761-181053 layout
function adjustSliceStartForReplies(m, h, x = Sv) {
  if (uo === null) return h;
  let {
      isLabelledReply: isLabelledReply,
      replyRunRowAbove: replyRunRowAbove,
      sitsBetweenReplies: sitsBetweenReplies,
    } = uo,
    I = h;
  while (I < m.length && sitsBetweenReplies(m[I])) I++;
  if (isLabelledReply(m[I])) {
    let D = replyRunRowAbove(m, I);
    while (D >= 0 && isLabelledReply(m[D])) {
      if (D < h - x) return h;
      ((I = D), (D = replyRunRowAbove(m, I)));
    }
  } else I = h;
  return I > 0 && m[I - 1]?.type === "speaker_label" ? I - 1 : Math.min(I, h);
}
//@ chunk-ag5x7vhf.js:181053-199016 fingerprint = MessagesImpl (0.526)
function MessagesImpl(m) {
  let $ = w(284),
    {
      messages: messages,
      tools: tools,
      commands: commands,
      inProgressToolUseIDs: inProgressToolUseIDs,
      pauseAnimation: pauseAnimation,
      conversationId: conversationId,
      screen: screen,
      history: history,
      scriptSources: scriptSources,
      turn: turn,
      streamingToolUses: streamingToolUses,
      isLoading: isLoading,
      hasStreamingText: hasStreamingText,
      isBriefOnly: isBriefOnly,
      isFocusedTurnLoading: isFocusedTurnLoading,
      pendingPrompts: pendingPrompts,
      unseenDivider: unseenDivider,
      scrollViewport: scrollViewport,
      search: search,
      reveal: reveal,
      renderRange: renderRange,
    } = m,
    Fe = pauseAnimation === void 0 ? !1 : pauseAnimation,
    te = useIsFullscreen(),
    me = screen === "transcript",
    se = useAppState(FP) || me,
    _e = history !== void 0,
    oe = history === "uncapped" || renderRange !== void 0,
    ve = renderWithForceUpdate(isBriefEnabled),
    Ee = isBriefOnly && ve,
    He = shouldShowNotice(se),
    Ue = uo !== null && He,
    lt = useTerminalSize(),
    it = Ue ? lTe : 0,
    tt;
  if ($[0] !== it || $[1] !== lt) ((tt = wr(lt, it)), ($[0] = it), ($[1] = lt), ($[2] = tt));
  else tt = $[2];
  let ct = tt,
    Je;
  if ($[3] !== ct) ((Je = wr(ct, uc)), ($[3] = ct), ($[4] = Je));
  else Je = $[4];
  let $e = Je,
    { columns: columns, rows: rows } = ct,
    toggleShowAllShortcut = useShortcutDisplay("transcript:toggleShowAll", "Transcript", "Ctrl+E"),
    CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL = env.CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL,
    briefTranscript = useAppState(VP),
    hasRemoteReplyChannel = useAppState(WP),
    qe = useHost(),
    normalizedMessages = Wj(se, me),
    activeAgents = useAppState(jP),
    showMessageTimestamps = useAppState(zP),
    Ot = renderWithForceUpdate(GP),
    It = showMessageTimestamps && Ot,
    kt = Cr(),
    to = useAppState($P),
    de = null,
    le = scrollViewport != null && !CLAUDE_CODE_DISABLE_VIRTUAL_SCROLL,
    isStreamingThinkingVisible = Dx(rows, te),
    st;
  if ($[5] !== conversationId || $[6] !== se)
    ((st = () => new MessagesSliceCache(conversationId, se)),
      ($[5] = conversationId),
      ($[6] = se),
      ($[7] = st));
  else st = $[7];
  let [Ge] = y(st);
  Ge.sync(conversationId, se);
  let Ve = !le && !oe ? computeSliceStart(messages, Ge.preCap, isStreamingThinkingVisible * 2) : 0,
    [ze] = y(_p),
    At = scanForMultiBlockMessage(messages, Ve, ze),
    [ut] = y(KP),
    [jt] = y(qP),
    [oo] = y(YP),
    [mo] = y(XP),
    [Jt] = y(JP),
    [Gt] = y(QP),
    [Mo] = y(ZP),
    [Vo] = y(eL),
    Po;
  if ($[8] !== messages || $[9] !== Ve)
    ((Po = Ve > 0 ? messages.slice(Ve) : messages), ($[8] = messages), ($[9] = Ve), ($[10] = Po));
  else Po = $[10];
  let So = Po,
    Yt;
  if ($[11] !== So || $[12] !== se)
    ((Yt = se ? So : filterFoldedScheduledTaskMessages(So)), ($[11] = So), ($[12] = se), ($[13] = Yt));
  else Yt = $[13];
  let Qt = Yt,
    ne;
  if ($[14] !== ut || $[15] !== At || $[16] !== Qt)
    ((ne = ut.normalize(Qt, At)), ($[14] = ut), ($[15] = At), ($[16] = Qt), ($[17] = ne));
  else ne = $[17];
  let ee = ne,
    we;
  if ($[18] !== ee || $[19] !== jt) ((we = jt.split(ee)), ($[18] = ee), ($[19] = jt), ($[20] = we));
  else we = $[20];
  let { transcript: transcript, progress: progress } = we,
    Ke;
  if ($[21] !== transcript) {
    Ct: {
      for (let Ye = transcript.length - 1; Ye >= 0; Ye--) {
        let je = transcript[Ye];
        if (je?.type === "user") {
          let content = je.message.content;
          for (const block_0 of content) {
            if (block_0.type === "text" && fmt(block_0.text)) {
              Ke = je.uuid;
              break Ct;
            }
          }
        }
      }
      Ke = null;
    }
    (($[21] = transcript), ($[22] = Ke));
  } else Ke = $[22];
  let bt = Ke,
    _t;
  if ($[23] !== oo || $[24] !== transcript)
    ((_t = oo.next(transcript)), ($[23] = oo), ($[24] = transcript), ($[25] = _t));
  else _t = $[25];
  let xt = _t,
    [$t] = y(tL),
    cn;
  if ($[26] !== inProgressToolUseIDs || $[27] !== xt || $[28] !== $t || $[29] !== streamingToolUses)
    ((cn = $t.next(streamingToolUses, inProgressToolUseIDs, xt)),
      ($[26] = inProgressToolUseIDs),
      ($[27] = xt),
      ($[28] = $t),
      ($[29] = streamingToolUses),
      ($[30] = cn));
  else cn = $[30];
  let un = cn,
    [Yo] = y(oL),
    ks;
  if ($[31] !== Yo)
    ((ks = (stu) => {
      let id = stu.contentBlock.id;
      if (nv(id)) {
        return { id: id, minted: !1 };
      }
      let Oi = Yo.get(stu);
      if (Oi) {
        return { id: Oi, minted: !0 };
      }
      let $c = randomUUID();
      return (Yo.set(stu, $c), { id: $c, minted: !0 });
    }),
      ($[31] = Yo),
      ($[32] = ks));
  else ks = $[32];
  let ko = ks,
    jn;
  if ($[33] !== ko || $[34] !== un) {
    let Gn;
    if ($[36] !== ko)
      ((Gn = (streamingToolUse) => {
        let { id: id, minted: minted } = ko(streamingToolUse);
        let msg_1 = createAssistantMessage({
          content: [minted ? { ...streamingToolUse.contentBlock, id: id } : streamingToolUse.contentBlock],
        });
        return ((msg_1.uuid = minted ? id : deriveUUID(id, 0)), normalizeMessages([msg_1]));
      }),
        ($[36] = ko),
        ($[37] = Gn));
    else Gn = $[37];
    jn = un.flatMap(Gn);
    (($[33] = ko), ($[34] = un), ($[35] = jn));
  } else jn = $[35];
  let mn = jn,
    Xo = me && !_e && !le,
    Gn;
  if ($[38] !== te || $[39] !== transcript || $[40] !== se)
    ((Gn = se || te ? transcript : Us(transcript, void 0)),
      ($[38] = te),
      ($[39] = transcript),
      ($[40] = se),
      ($[41] = Gn));
  else Gn = $[41];
  let $n, Kn, _r, qn, Xn;
  if (
    $[42] !== activeAgents ||
    $[43] !== hasRemoteReplyChannel ||
    $[44] !== Ee ||
    $[45] !== me ||
    $[46] !== Jt ||
    $[47] !== Ue ||
    $[48] !== Xo ||
    $[49] !== mn ||
    $[50] !== Gn ||
    $[51] !== tools ||
    $[52] !== mo ||
    $[53] !== transcript ||
    $[54] !== se ||
    $[55] !== le
  ) {
    const briefToolNames = Gn.filter(nL);
    let wn;
    if ($[61] !== me) ((wn = (Ui) => shouldShowUserMessage(Ui, me)), ($[61] = me), ($[62] = wn));
    else wn = $[62];
    let dropTextToolNames = briefToolNames.filter(wn);
    let Qn = reorderMessagesInUI(dropTextToolNames, mn);
    let Ir =
      Bn !== null && hasRemoteReplyChannel
        ? Bn.projectReplyChannelToolUses(me || se ? Qn : Bn.dropReplyChannelNarration(Qn), {
            statusAsText: me || se,
          })
        : Qn;
    let Hi = [BRIEF_TOOL_NAME, SEND_USER_FILE_TOOL_NAME];
    let _s = [BRIEF_TOOL_NAME];
    let Is =
      !me && (isBriefEnabled() || !isPewterOwlTool())
        ? Ee
          ? filterForBriefTool(Ir, Hi, _s)
          : hasSuccessfulToolCall(Ir, _s)
        : Ir;
    let Es = Is;
    let Ds = Xo ? Es.slice(-fs) : Es;
    let Vi = Xo && Is.length > fs;
    let { messages: messages } = countToolCallsSince_2(Ds, tools, se, activeAgents);
    let ji = collapseBackgroundBashNotifications(
      collapseHookSummaries(
        collapseHookAttachments(
          collapseTeammateShutdowns(
            collapseReadSearchGroups(messages, tools, { transcriptV2: Ue, expandRows: me && le }, Jt),
          ),
        ),
      ),
      se,
      Ue,
    );
    let build = mo.build(transcript, Ds);
    let Gi = Qn.length - fs;
    $n = ji;
    Kn = build;
    _r = Vi;
    qn = Gi;
    Xn = Vi ? Ds.map(rL) : [];
    (($[42] = activeAgents),
      ($[43] = hasRemoteReplyChannel),
      ($[44] = Ee),
      ($[45] = me),
      ($[46] = Jt),
      ($[47] = Ue),
      ($[48] = Xo),
      ($[49] = mn),
      ($[50] = Gn),
      ($[51] = tools),
      ($[52] = mo),
      ($[53] = transcript),
      ($[54] = se),
      ($[55] = le),
      ($[56] = $n),
      ($[57] = Kn),
      ($[58] = _r),
      ($[59] = qn),
      ($[60] = Xn));
  } else (($n = $[56]), (Kn = $[57]), (_r = $[58]), (qn = $[59]), (Xn = $[60]));
  let Jn;
  if ($[63] !== $n || $[64] !== Kn || $[65] !== _r || $[66] !== qn || $[67] !== Xn)
    ((Jn = {
      collapsedBase: $n,
      transcriptLookups: Kn,
      hasTruncatedMessages: _r,
      hiddenMessageCount: qn,
      shownWindowUuids: Xn,
    }),
      ($[63] = $n),
      ($[64] = Kn),
      ($[65] = _r),
      ($[66] = qn),
      ($[67] = Xn),
      ($[68] = Jn));
  else Jn = $[68];
  let {
      collapsedBase: collapsedBase,
      transcriptLookups: transcriptLookups,
      hasTruncatedMessages: hasTruncatedMessages,
      hiddenMessageCount: hiddenMessageCount,
      shownWindowUuids: shownWindowUuids,
    } = Jn,
    wn;
  if ($[69] !== progress) ((wn = buildProgressLookups(progress)), ($[69] = progress), ($[70] = wn));
  else wn = $[70];
  let Ns = wn,
    Ps;
  if ($[71] !== Ns || $[72] !== transcriptLookups)
    ((Ps = { ...transcriptLookups, ...Ns }), ($[71] = Ns), ($[72] = transcriptLookups), ($[73] = Ps));
  else Ps = $[73];
  let _o = Ps,
    Yc;
  UL: {
    let Ls = Bn !== null && hasRemoteReplyChannel && !me && !se;
    if (!(te && (briefTranscript || Ls) && !me)) {
      Yc = collapsedBase;
      break UL;
    }
    let tr;
    if ($[74] !== kt)
      ((tr = ($i) => {
        let Tv = kt.getState().tasks[$i];
        return Tv?.type === "local_agent" ? Tv.result?.toolStats : void 0;
      }),
        ($[74] = kt),
        ($[75] = tr));
    else tr = $[75];
    let Ki;
    if (
      $[76] !== collapsedBase ||
      $[77] !== isLoading ||
      $[78] !== Ls ||
      $[79] !== Ue ||
      $[80] !== tr ||
      $[81] !== tools
    )
      ((Ki = isNavigableMessage(collapsedBase, tools, tr, isLoading, { keepAllText: Ls, transcriptV2: Ue })),
        ($[76] = collapsedBase),
        ($[77] = isLoading),
        ($[78] = Ls),
        ($[79] = Ue),
        ($[80] = tr),
        ($[81] = tools),
        ($[82] = Ki));
    else Ki = $[82];
    Yc = Ki;
  }
  let eg = Yc,
    Xc = i0t(),
    Jc = Xc || se,
    tr;
  if ($[83] !== eg || $[84] !== Jc)
    ((tr = yp(dropRepeatedTurnDurations(eg, Jc), Jc)), ($[83] = eg), ($[84] = Jc), ($[85] = tr));
  else tr = $[85];
  let Io = tr,
    Ki;
  if ($[86] !== messages || $[87] !== Xc)
    ((Ki = Xc ? null : findLeadingCompactBoundary(messages)), ($[86] = messages), ($[87] = Xc), ($[88] = Ki));
  else Ki = $[88];
  let tg = Ki,
    Tn = tg?.uuid,
    og = (tg?.summary ?? null) !== null,
    Qc = tg?.summary?.transcriptPath,
    [ng, BL] = y(null);
  if (ng?.uuid !== Tn || ng?.transcriptPath !== Qc) {
    let HL =
      isDiskless() || wt() || env.CLAUDE_CODE_TRANSCRIPT_LOCAL_GC === !0
        ? null
        : getMaterializedSessionFile();
    BL({ uuid: Tn, transcriptPath: Qc, savedIn: Qc === HL ? Qc : void 0 });
  }
  let rg = ng?.savedIn,
    Cv;
  if ($[89] !== rg || $[90] !== og || $[91] !== Tn)
    ((Cv = Tn === void 0 ? null : { uuid: Tn, summary: og ? { savedIn: rg } : null }),
      ($[89] = rg),
      ($[90] = og),
      ($[91] = Tn),
      ($[92] = Cv));
  else Cv = $[92];
  let sg = Cv,
    [Zc] = y(sL),
    Mv;
  if ($[93] !== pendingPrompts)
    ((Mv = normalizeMessages(pendingPrompts.map(iL))), ($[93] = pendingPrompts), ($[94] = Mv));
  else Mv = $[94];
  let eu = Mv,
    kv;
  if ($[95] !== Io || $[96] !== eu || $[97] !== Ue)
    ((kv = Ue && eu.length > 0 ? Io.concat(eu) : Io), ($[95] = Io), ($[96] = eu), ($[97] = Ue), ($[98] = kv));
  else kv = $[98];
  let tu = kv,
    _v;
  if ($[99] !== Io || $[100] !== Ue)
    ((_v = Ue && cc !== null ? cc.foldAgentMessages(Io) : null), ($[99] = Io), ($[100] = Ue), ($[101] = _v));
  else _v = $[101];
  let Jo = _v,
    ig;
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
      $[105] !== te ||
      $[106] !== hasStreamingText ||
      $[107] !== qe ||
      $[108] !== isFocusedTurnLoading ||
      $[109] !== _o.progressMessagesByToolUseID ||
      $[110] !== Tn ||
      $[111] !== tu ||
      $[112] !== Zc ||
      $[113] !== tools
    ) {
      const progressMessagesByToolUseID = _o.progressMessagesByToolUseID;
      let Qo;
      if ($[115] !== Jo?.folded) ((Qo = Jo?.folded ?? new Set()), ($[115] = Jo?.folded), ($[116] = Qo));
      else Qo = $[116];
      or = Zc.segment(tu, {
        tools: tools,
        activeAgents: activeAgents,
        host: qe,
        columns: columns,
        progressMessagesByToolUseID: progressMessagesByToolUseID,
        isLoading: isFocusedTurnLoading,
        hasStreamingText: hasStreamingText,
        isFullscreen: te,
        compactionWithoutEarlierMessages: Tn,
        foldedAgentMessages: Qo,
      });
      (($[102] = activeAgents),
        ($[103] = Jo?.folded),
        ($[104] = columns),
        ($[105] = te),
        ($[106] = hasStreamingText),
        ($[107] = qe),
        ($[108] = isFocusedTurnLoading),
        ($[109] = _o.progressMessagesByToolUseID),
        ($[110] = Tn),
        ($[111] = tu),
        ($[112] = Zc),
        ($[113] = tools),
        ($[114] = or));
    } else or = $[114];
    ig = or;
  }
  let Bt = ig,
    nr = Ue && uo !== null && Bt !== tu,
    or;
  if (
    $[117] !== oe ||
    $[118] !== nr ||
    $[119] !== isStreamingThinkingVisible ||
    $[120] !== renderRange ||
    $[121] !== Bt ||
    $[122] !== Ge.slice ||
    $[123] !== le
  ) {
    pJ: {
      let ag = !le && !oe ? computeSliceStart(Bt, Ge.slice, isStreamingThinkingVisible) : 0;
      if (renderRange) {
        let xo;
        if ($[125] !== renderRange[0] || $[126] !== renderRange[1] || $[127] !== Bt)
          ((xo = Bt.slice(renderRange[0], renderRange[1])),
            ($[125] = renderRange[0]),
            ($[126] = renderRange[1]),
            ($[127] = Bt),
            ($[128] = xo));
        else xo = $[128];
        let Qo;
        if ($[129] !== renderRange[0] || $[130] !== xo)
          ((Qo = { renderableMessages: xo, renderOffset: renderRange[0] }),
            ($[129] = renderRange[0]),
            ($[130] = xo),
            ($[131] = Qo));
        else Qo = $[131];
        or = Qo;
        break pJ;
      }
      if (ag > 0) {
        let qi = nr ? adjustSliceStartForReplies(Bt, ag) : ag;
        const xo = qi > 0 ? Bt.slice(qi) : Bt;
        let Qo;
        if ($[132] !== qi || $[133] !== xo)
          ((Qo = { renderableMessages: xo, renderOffset: qi }), ($[132] = qi), ($[133] = xo), ($[134] = Qo));
        else Qo = $[134];
        or = Qo;
        break pJ;
      }
      let xo;
      if ($[135] !== Bt) ((xo = { renderableMessages: Bt, renderOffset: 0 }), ($[135] = Bt), ($[136] = xo));
      else xo = $[136];
      or = xo;
    }
    (($[117] = oe),
      ($[118] = nr),
      ($[119] = isStreamingThinkingVisible),
      ($[120] = renderRange),
      ($[121] = Bt),
      ($[122] = Ge.slice),
      ($[123] = le),
      ($[124] = or));
  } else or = $[124];
  let { renderableMessages: renderableMessages, renderOffset: renderOffset } = or,
    xo;
  if ($[137] !== le) ((xo = !le && isScreenReaderMode()), ($[137] = le), ($[138] = xo));
  else xo = $[138];
  let Cn = xo,
    lg = R(null),
    Iv = R(0),
    Ev = R(shownWindowUuids),
    Dv = R(0),
    Qo;
  if (
    $[139] !== Cn ||
    $[140] !== shownWindowUuids ||
    $[141] !== Ge.preCap.advances ||
    $[142] !== Ge.slice.advances
  )
    ((Qo = () => {
      let Av = Ev.current;
      Ev.current = shownWindowUuids;
      let Nv = Av[0];
      let Pv = shownWindowUuids[0];
      if (Nv !== void 0 && Pv !== void 0 && !shownWindowUuids.includes(Nv) && Av.includes(Pv))
        Dv.current = Dv.current + 1;
      let Lv = Ge.preCap.advances + Ge.slice.advances + Dv.current;
      if (Lv === Iv.current) {
        return;
      }
      if (((Iv.current = Lv), Cn && lg.current !== null)) setTranscriptFrontCut(lg.current);
    }),
      ($[139] = Cn),
      ($[140] = shownWindowUuids),
      ($[141] = Ge.preCap.advances),
      ($[142] = Ge.slice.advances),
      ($[143] = Qo));
  else Qo = $[143];
  zt(Qo);
  let Ov;
  if ($[144] !== ko || $[145] !== streamingToolUses) {
    let pn;
    if ($[147] !== ko) ((pn = (FL) => ko(FL).id), ($[147] = ko), ($[148] = pn));
    else pn = $[148];
    Ov = new Set(streamingToolUses.map(pn));
    (($[144] = ko), ($[145] = streamingToolUses), ($[146] = Ov));
  } else Ov = $[146];
  let ou = Ov,
    cg = hasContentAfterIndex(renderableMessages, tools, ou),
    pn;
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
      let ug, Pr;
      if ($[155] !== renderableMessages || $[156] !== Ue || $[157] !== unseenDivider.firstUnseenUuid)
        ((ug = unseenDivider.firstUnseenUuid.slice(0, UUID_PREFIX_LENGTH)),
          (Pr = findMessageIndexByShortUuid(renderableMessages, Ue, ug)),
          ($[155] = renderableMessages),
          ($[156] = Ue),
          ($[157] = unseenDivider.firstUnseenUuid),
          ($[158] = ug),
          ($[159] = Pr));
      else ((ug = $[158]), (Pr = $[159]));
      let Uv = Pr;
      if (Uv !== -1 || Jo === null) {
        pn = Uv;
        break fJ;
      }
      let index = Io.findIndex((VL) => shortUuid(VL) === ug);
      let Bv = index === -1 ? void 0 : Io[index];
      if (Bv === void 0 || !Jo.folded.has(Bv)) {
        pn = -1;
        break fJ;
      }
      let selectedIdx = buildShortUuidIndex(renderableMessages, Ue);
      for (let pg = index + 1; pg < Io.length; pg++) {
        let Hv = Io[pg];
        if (Jo.folded.has(Hv)) {
          continue;
        }
        let Fv = shortUuid(Hv);
        let Vv = Fv === void 0 ? void 0 : selectedIdx.get(Fv);
        if (Vv !== void 0) {
          pn = Vv;
          break fJ;
        }
      }
      pn = -1;
    }
    (($[149] = Jo),
      ($[150] = Io),
      ($[151] = renderableMessages),
      ($[152] = Ue),
      ($[153] = unseenDivider),
      ($[154] = pn));
  } else pn = $[154];
  let rr = pn,
    Pr;
  if (
    $[160] !== rr ||
    $[161] !== nr ||
    $[162] !== renderOffset ||
    $[163] !== renderableMessages ||
    $[164] !== Bt
  ) {
    gJ: {
      let nu = new Set();
      if (!nr) {
        Pr = nu;
        break gJ;
      }
      let { isLabelledReply: isLabelledReply, replyRunRowAbove: replyRunRowAbove } = uo;
      for (let Lr = 0; Lr < renderableMessages.length; Lr++) {
        if (!isLabelledReply(renderableMessages[Lr])) {
          continue;
        }
        let GL = Bt[renderOffset + Lr - 1];
        let onItemClick = replyRunRowAbove(renderableMessages, Lr);
        if (GL?.type === "speaker_label" || (nu.has(onItemClick) && !(rr > onItemClick && rr <= Lr)))
          nu.add(Lr);
      }
      Pr = nu;
    }
    (($[160] = rr),
      ($[161] = nr),
      ($[162] = renderOffset),
      ($[163] = renderableMessages),
      ($[164] = Bt),
      ($[165] = Pr));
  } else Pr = $[165];
  let ru = Pr,
    fg = nr ? uo.replyRunRowAbove(renderableMessages, renderableMessages.length) : -1,
    gg = !nr
      ? void 0
      : !uo.isLabelledReply(renderableMessages[fg])
        ? "label"
        : ru.has(fg) && rr <= fg
          ? "continues"
          : void 0,
    [su, $L] = y(aL),
    jv;
  if ($[166] === MEMO_CACHE_SENTINEL)
    ((jv = (msg_4) => {
      let hg = expandKey(msg_4);
      $L((prev) => {
        let next = new Set(prev);
        if (next.has(hg)) next.delete(hg);
        else next.add(hg);
        return next;
      });
    }),
      ($[166] = jv));
  else jv = $[166];
  let YL = jv,
    zv;
  if ($[167] !== su)
    ((zv = (msg_5) => su.size > 0 && su.has(expandKey(msg_5))), ($[167] = su), ($[168] = zv));
  else zv = $[168];
  let Os = zv,
    Gv,
    $v;
  if ($[169] !== qe || $[170] !== renderableMessages || $[171] !== screen || $[172] !== le)
    ((Gv = () => {
      reportMessageWithoutUuid(qe, renderableMessages, { virtualized: le, screen: screen });
    }),
      ($v = [qe, renderableMessages, le, screen]),
      ($[169] = qe),
      ($[170] = renderableMessages),
      ($[171] = screen),
      ($[172] = le),
      ($[173] = Gv),
      ($[174] = $v));
  else ((Gv = $[173]), ($v = $[174]));
  P(Gv, $v);
  let au;
  if ($[175] !== Bt || $[176] !== Ue) {
    hJ: {
      let yg = new Set();
      if (!Ue) {
        au = yg;
        break hJ;
      }
      au =
        (Bt.forEach((JL, Kv) => {
          if (
            Bt[Kv - 1]?.type === "speaker_label" ||
            findSpeakerLabelAbove(Bt, Kv)?.speaker.kind === "inbound"
          )
            yg.add(JL);
        }),
        yg);
    }
    (($[175] = Bt), ($[176] = Ue), ($[177] = au));
  } else au = $[177];
  let lu = au,
    qv;
  if (
    $[178] !== Mo ||
    $[179] !== columns ||
    $[180] !== Vo ||
    $[181] !== qe ||
    $[182] !== me ||
    $[183] !== $e ||
    $[184] !== bt ||
    $[185] !== _o ||
    $[186] !== lu ||
    $[187] !== tools ||
    $[188] !== se
  )
    ((qv = (msg_6) => {
      if (msg_6.type === "collapsed_read_search") {
        return !0;
      }
      if (msg_6.type === "attachment") {
        if (se || me) {
          return !1;
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
        if (se || me) {
          return !1;
        }
        return (
          Yi != null &&
          Yi.type === "advisor_tool_result" &&
          Yi.content?.type === "advisor_result" &&
          (!getErrorMessageIfRefusal(Yi) || getAdvisorRefusalText(Yi) !== void 0)
        );
      }
      if (msg_6.type !== "user") {
        return !1;
      }
      let Uo = msg_6.message.content[0];
      if (Uo?.type === "text" && fmt(Uo.text)) {
        if (se || me || msg_6.uuid === bt) {
          return !1;
        }
        return (
          mcpRenderOverrideFor(BashTool, "isResultTruncated")?.(
            { ...Pho(Mo, Uo), interrupted: !1 },
            { columns: columns },
          ) ?? !1
        );
      }
      if (Uo?.type === "text") {
        if (se || me) {
          return !1;
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
        return !1;
      }
      if (Uo.is_error) {
        return exceedsTenLines(Uo.content);
      }
      if (!msg_6.toolUseResult) {
        return !1;
      }
      let name = _o.toolUseByToolUseID.get(Uo.tool_use_id)?.name;
      let Yv = name ? (findToolByName(tools, name) ?? displayOnlyMcpTool(name, qe)) : void 0;
      let toolUseResult = msg_6.toolUseResult;
      return (
        (Yv
          ? mcpRenderOverrideFor(Yv, "isResultTruncated")?.(toolUseResult, { columns: columns })
          : void 0) ?? !1
      );
    }),
      ($[178] = Mo),
      ($[179] = columns),
      ($[180] = Vo),
      ($[181] = qe),
      ($[182] = me),
      ($[183] = $e),
      ($[184] = bt),
      ($[185] = _o),
      ($[186] = lu),
      ($[187] = tools),
      ($[188] = se),
      ($[189] = qv));
  else qv = $[189];
  let xg = qv,
    ZL = useDialogOfKind(LOCAL_JSX_DIALOG.kind),
    Rg = !Fe && !ZL,
    prevProgressState = Se(TerminalWriteContext),
    Xv,
    Jv;
  if ($[190] !== prevProgressState)
    ((Xv = () => {
      if (!prevProgressState) {
        return;
      }
      return (gFo(prevProgressState), () => hFo(prevProgressState));
    }),
      (Jv = [prevProgressState]),
      ($[190] = prevProgressState),
      ($[191] = Xv),
      ($[192] = Jv));
  else ((Xv = $[191]), (Jv = $[192]));
  P(Xv, Jv);
  let Qv;
  if ($[193] !== conversationId)
    ((Qv = (msg_7) => `${msg_7.uuid}-${conversationId}`), ($[193] = conversationId), ($[194] = Qv));
  else Qv = $[194];
  let Fs = Qv,
    Zv;
  if (
    $[195] !== Rg ||
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
    $[215] !== Bt ||
    $[216] !== It ||
    $[217] !== ou ||
    $[218] !== tools ||
    $[219] !== turn?.armRateLimitAutoContinue ||
    $[220] !== turn?.openRateLimitOptions ||
    $[221] !== unseenDivider ||
    $[222] !== se
  )
    ((Zv = (msg_8, index) => {
      let eT = index > 0 ? renderableMessages[index - 1] : void 0;
      let tO = msg_8.type === "user" && eT?.type === "user";
      let oO = isSplitUserMessagePart(msg_8, eT);
      let nO = Bt[renderOffset + index - 1];
      let tT = findSpeakerLabelAbove(Bt, renderOffset + index)?.speaker.kind === "inbound";
      let oT = nO?.type === "speaker_label";
      let sO = !oT && ru.has(index);
      let iO = msg_8.type === "collapsed_read_search" && (hasStreamingText || index < cg);
      let vg = tT;
      let nT = hasStringUuid(msg_8) ? Fs(msg_8) : `no-uuid:${index}-${conversationId}`;
      let Tg = e(
        MessageRow,
        {
          message: msg_8,
          isUserContinuation: tO,
          isSplitUserContinuation: oO,
          followsSpeakerLabel: oT,
          continuesLabelledReply: sO,
          followsInboundLabel: tT,
          hasContentAfter: iO,
          tools: tools,
          commands: commands,
          verbose: se || Os(msg_8),
          showMessageTimestamps: It,
          inProgressToolUseIDs: inProgressToolUseIDs,
          streamingToolUseIDs: ou,
          screen: screen,
          canAnimate: Rg,
          onOpenRateLimitOptions: turn?.openRateLimitOptions,
          onRateLimitAutoQueueContinue: turn?.armRateLimitAutoContinue,
          latestBashOutputUUID: bt,
          columns: vg ? $e.columns : columns,
          isLoading: isLoading,
          lookups: Gt.forRow(msg_8, _o),
        },
        nT,
      );
      let Cg = Tg;
      let rT = it + (vg ? uc : 0);
      if (rT > 0)
        Cg = r(
          Box,
          {
            flexDirection: "row",
            children: [
              e(NoSelect, { fromLeftEdge: !0, minWidth: rT }),
              vg ? e(TerminalSizeContext, { value: $e, children: Tg }) : Tg,
            ],
          },
          `li-${nT}`,
        );
      if (unseenDivider && index === rr) {
        return [
          e(
            Box,
            {
              marginTop: 1,
              paddingLeft: it,
              children: e(Divider, {
                title: `${unseenDivider.count} new ${plural(unseenDivider.count, "message")}`,
                width: columns,
                color: "inactive",
              }),
            },
            "unseen-divider",
          ),
          Cg,
        ];
      }
      return Cg;
    }),
      ($[195] = Rg),
      ($[196] = columns),
      ($[197] = commands),
      ($[198] = conversationId),
      ($[199] = rr),
      ($[200] = hasStreamingText),
      ($[201] = inProgressToolUseIDs),
      ($[202] = Os),
      ($[203] = isLoading),
      ($[204] = ru),
      ($[205] = $e),
      ($[206] = cg),
      ($[207] = bt),
      ($[208] = it),
      ($[209] = _o),
      ($[210] = Fs),
      ($[211] = renderOffset),
      ($[212] = renderableMessages),
      ($[213] = Gt),
      ($[214] = screen),
      ($[215] = Bt),
      ($[216] = It),
      ($[217] = ou),
      ($[218] = tools),
      ($[219] = turn?.armRateLimitAutoContinue),
      ($[220] = turn?.openRateLimitOptions),
      ($[221] = unseenDivider),
      ($[222] = se),
      ($[223] = Zv));
  else Zv = $[223];
  let Xi = Zv,
    [uu] = y(lL),
    sT;
  if ($[224] !== _o || $[225] !== uu || $[226] !== tools)
    ((sT = (msg_9) => {
      let cached = uu.get(msg_9);
      if (cached !== void 0) {
        return cached;
      }
      let text_0 = getMessageSearchText(msg_9);
      let lT = !0;
      if (msg_9.type === "user" && msg_9.toolUseResult && Array.isArray(msg_9.message.content)) {
        let tr = msg_9.message.content.find(cL);
        if (tr && "tool_use_id" in tr) {
          let tu = _o.toolUseByToolUseID.get(tr.tool_use_id);
          lT = tu !== void 0;
          let cT = tu && findToolByName(tools, tu.name);
          let extracted = cT?.outputSchema?.safeParse(msg_9.toolUseResult);
          let aO = extracted?.data ?? msg_9.toolUseResult;
          let uT = extracted === void 0 || extracted.success ? cT?.extractSearchText?.(aO) : void 0;
          if (uT !== void 0) text_0 = uT;
        }
      }
      let lowered = text_0.toLowerCase();
      if (lT) uu.set(msg_9, lowered);
      return lowered;
    }),
      ($[224] = _o),
      ($[225] = uu),
      ($[226] = tools),
      ($[227] = sT));
  else sT = $[227];
  let Ig = sT,
    mT;
  if ($[228] !== hasStreamingText || $[229] !== Ee || $[230] !== gg || $[231] !== turn)
    ((mT =
      hasStreamingText && !Ee && turn
        ? e(StreamingTextRow, { store: turn.stream.previewStore, transcriptV2: gg })
        : null),
      ($[228] = hasStreamingText),
      ($[229] = Ee),
      ($[230] = gg),
      ($[231] = turn),
      ($[232] = mT));
  else mT = $[232];
  let Ji = mT,
    pT;
  if (
    $[233] !== columns ||
    $[234] !== Ig ||
    $[235] !== te ||
    $[236] !== xg ||
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
  )
    ((pT = le
      ? e(d5.Provider, {
          value: !0,
          children: e(VirtualMessageList, {
            messages: renderableMessages,
            scrollViewport: scrollViewport,
            columns: columns,
            itemKey: Fs,
            renderItem: Xi,
            onItemClick: YL,
            isItemClickable: xg,
            isItemExpanded: Os,
            trackStickyPrompt: !me && te,
            jumpRef: search?.jumpRef,
            revealRef: reveal,
            onSearchMatchesChange: search?.onSearchMatchesChange,
            scanElement: search?.scanElement,
            setPositions: search?.setPositions,
            extractSearchText: Ig,
          }),
        })
      : Cn
        ? e(Box, { flexDirection: "column", ref: lg, children: renderableMessages.flatMap(Xi) })
        : renderableMessages.flatMap(Xi)),
      ($[233] = columns),
      ($[234] = Ig),
      ($[235] = te),
      ($[236] = xg),
      ($[237] = Os),
      ($[238] = me),
      ($[239] = Fs),
      ($[240] = Xi),
      ($[241] = renderableMessages),
      ($[242] = reveal),
      ($[243] = Cn),
      ($[244] = scrollViewport),
      ($[245] = search?.jumpRef),
      ($[246] = search?.onSearchMatchesChange),
      ($[247] = search?.scanElement),
      ($[248] = search?.setPositions),
      ($[249] = le),
      ($[250] = pT));
  else pT = $[250];
  let Eg = pT;
  const Dg = Jo?.counts ?? MAr;
  let du;
  if ($[251] !== sg || $[252] !== Eg)
    ((du = e(CompactSummaryContext, { value: sg, children: Eg })),
      ($[251] = sg),
      ($[252] = Eg),
      ($[253] = du));
  else du = $[253];
  let fT;
  if ($[254] !== Dg || $[255] !== du)
    ((fT = e(xtn, { value: Dg, children: du })), ($[254] = Dg), ($[255] = du), ($[256] = fT));
  else fT = $[256];
  let Ag = fT,
    gT;
  if ($[257] !== hiddenMessageCount || $[258] !== Cn)
    ((gT = Cn ? "" : `${sequential.bold(hiddenMessageCount)} `),
      ($[257] = hiddenMessageCount),
      ($[258] = Cn),
      ($[259] = gT));
  else gT = $[259];
  let Ws = gT,
    mu;
  if (
    $[260] !== columns ||
    $[261] !== hasTruncatedMessages ||
    $[262] !== Ws ||
    $[263] !== toggleShowAllShortcut
  )
    ((mu =
      hasTruncatedMessages &&
      e(Divider, { title: `${toggleShowAllShortcut} to show ${Ws}previous messages`, width: columns })),
      ($[260] = columns),
      ($[261] = hasTruncatedMessages),
      ($[262] = Ws),
      ($[263] = toggleShowAllShortcut),
      ($[264] = mu));
  else mu = $[264];
  let pu;
  if (
    $[265] !== columns ||
    $[266] !== oe ||
    $[267] !== Ws ||
    $[268] !== hiddenMessageCount ||
    $[269] !== me ||
    $[270] !== _e ||
    $[271] !== toggleShowAllShortcut
  )
    ((pu =
      me &&
      _e &&
      hiddenMessageCount > 0 &&
      !oe &&
      e(Divider, { title: `${toggleShowAllShortcut} to hide ${Ws}previous messages`, width: columns })),
      ($[265] = columns),
      ($[266] = oe),
      ($[267] = Ws),
      ($[268] = hiddenMessageCount),
      ($[269] = me),
      ($[270] = _e),
      ($[271] = toggleShowAllShortcut),
      ($[272] = pu));
  else pu = $[272];
  let fu;
  if ($[273] !== Ag) ((fu = e(Gp, { value: null, children: Ag })), ($[273] = Ag), ($[274] = fu));
  else fu = $[274];
  let gu;
  if ($[275] !== it || $[276] !== Ji)
    ((gu =
      Ji !== null && it > 0
        ? r(Box, { flexDirection: "row", children: [e(NoSelect, { fromLeftEdge: !0, minWidth: it }), Ji] })
        : Ji),
      ($[275] = it),
      ($[276] = Ji),
      ($[277] = gu));
  else gu = $[277];
  let hT;
  if ($[278] !== ct || $[279] !== mu || $[280] !== pu || $[281] !== fu || $[282] !== gu)
    ((hT = r(TerminalSizeContext, { value: ct, children: [mu, pu, fu, gu] })),
      ($[278] = ct),
      ($[279] = mu),
      ($[280] = pu),
      ($[281] = fu),
      ($[282] = gu),
      ($[283] = hT));
  else hT = $[283];
  return hT;
}
//@ chunk-ag5x7vhf.js:199016-199223 layout
function findMessageIndexByShortUuid(m, h, x) {
  return m.findIndex(
    (T) =>
      shortUuid(T) === x ||
      (h &&
        ((T.type === "work_segment" && T.messages.some((message) => shortUuid(message) === x)) ||
          (T.type === "recap_fold" && T.notices.some((notice) => shortUuid(notice) === x)) ||
          zBo(T)?.some((k) => shortUuid(k) === x) === !0)),
  );
}
/**
 * 为渲染行建立 短 uuid → 行下标 的索引；展开时也收录 work_segment/recap_fold 等折叠组内的消息。
 */
//@ chunk-ag5x7vhf.js:199223-199537 layout
function buildShortUuidIndex(m, h) {
  let x = new Map();
  for (let T = 0; T < m.length; T++) {
    let k = m[T],
      _ = shortUuid(k);
    if (_ !== void 0 && !x.has(_)) x.set(_, T);
    if (!h) continue;
    let I = k.type === "work_segment" ? k.messages : k.type === "recap_fold" ? k.notices : (zBo(k) ?? void 0);
    if (I === void 0) continue;
    for (let D of I) {
      let A = shortUuid(D);
      if (A !== void 0 && !x.has(A)) x.set(A, T);
    }
  }
  return x;
}
//@ chunk-ag5x7vhf.js:199537-199618 file-local
function expandKey(msg) {
  return (msg.type === "assistant" || msg.type === "user" ? getToolUseID(msg) : null) ?? msg.uuid;
}
//@ chunk-ag5x7vhf.js:199618-199755 layout
function isCrossSessionBodyHidden(m, h, x, T) {
  if (isTaggedPeerText(x)) {
    let k = m.get(h);
    if (k === void 0)
      ((k = crossSessionPreviewHidesBody(x, T?.kind === "peer" && T.hostInjected === !0)), m.set(h, k));
    return k;
  }
  return !1;
}
//@ chunk-ag5x7vhf.js:199755-199846 file-local
function setsEqual(a, b) {
  if (a.size !== b.size) return !1;
  for (let item of a) if (!b.has(item)) return !1;
  return !0;
}
//@ chunk-ag5x7vhf.js:199846-199856 layout
var jc = [];
//@ chunk-ag5x7vhf.js:199856-199910 layout
function nv(m) {
  return typeof m === "string" && m.length > 0;
}
//@ chunk-ag5x7vhf.js:199910-200003 layout
class Zf {
  previous = jc;
  next(m, h, x) {
    return ((this.previous = dedupeStreamingToolUses(this.previous, m, h, x)), this.previous);
  }
}
//@ chunk-ag5x7vhf.js:200003-200250 layout
function dedupeStreamingToolUses(m, h, x, T) {
  let k = new Set(),
    _ = [];
  for (let I of h) {
    let id = I.contentBlock.id;
    if (id) {
      let A = id;
      if (x.has(A) || T.has(A) || k.has(A)) continue;
      k.add(A);
    }
    _.push(I);
  }
  if (_.length === 0) return jc;
  if (_.length === m.length && _.every((I, D) => I === m[D])) return m;
  return _;
}
//@ chunk-ag5x7vhf.js:200250-200295 layout
function rv(m, h, x) {
  return x && m[0] === h[0] ? m : h;
}
/**
 * 消息列表组件：MessagesImpl 的 memo 版本，自定义比较忽略 scrollViewport/search/reveal，并对 streamingToolUses、inProgressToolUseIDs、unseenDivider、tools 做浅比较。
 */
//@ chunk-ag5x7vhf.js:200295-200980 fingerprint = Messages (0.801)
var Messages = Rh(MessagesImpl, (m, h) => {
    let keys = Object.keys(m);
    for (let T of keys) {
      if (T === "scrollViewport" || T === "search" || T === "reveal") continue;
      if (m[T] !== h[T]) {
        if (T === "streamingToolUses") {
          let streamingToolUses = m.streamingToolUses,
            streamingToolUses_2 = h.streamingToolUses;
          if (
            streamingToolUses.length === streamingToolUses_2.length &&
            streamingToolUses.every((I, D) => I.contentBlock === streamingToolUses_2[D]?.contentBlock)
          )
            continue;
        }
        if (T === "inProgressToolUseIDs") {
          if (setsEqual(m.inProgressToolUseIDs, h.inProgressToolUseIDs)) continue;
        }
        if (T === "unseenDivider") {
          let unseenDivider = m.unseenDivider,
            unseenDivider_2 = h.unseenDivider;
          if (
            unseenDivider?.firstUnseenUuid === unseenDivider_2?.firstUnseenUuid &&
            unseenDivider?.count === unseenDivider_2?.count
          )
            continue;
        }
        if (T === "tools") {
          let tools = m.tools,
            tools_2 = h.tools;
          if (tools.length === tools_2.length && tools.every((I, D) => I.name === tools_2[D]?.name)) continue;
        }
        return !1;
      }
    }
    return !0;
  }),
  EMPTY_ID_SET = new Set(),
  vs = [],
  Ts = [],
  av = [];
//@ chunk-0sfjpx19.js:33717-34121 fingerprint = dropTextInBriefTurns (1)
function dropTextInBriefTurns(e) {
  let n = new Map(),
    turnsWithBrief = new Set();
  for (let s = e.length - 1; s >= 0; s--) {
    let h = e[s];
    if (h.type === "assistant") {
      for (let _ of h.message.content) if (_.type === "tool_use") n.set(_.id, _.name);
      continue;
    }
    if (h.type !== "user") continue;
    let content = h.message.content;
    if (!kCe(content)) {
      if (h.isMeta !== !0) break;
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
  kw,
  shouldRenderStatically,
  wr,
  getMessageSearchText,
  uL,
  dL,
  jc,
  mL,
  pL,
  fL,
  Ts,
  gL,
  hL,
  yL,
  vs,
  rv,
  bL,
  av,
  SL,
  uo,
  EMPTY_ID_SET,
  Messages,
  TerminalTaskProgress,
};
