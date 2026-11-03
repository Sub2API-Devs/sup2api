/**
 * components/MessageRow.tsx
 *
 * 消息列表的一行：包装 Message，计算是否仍在流式、工具是否全部完成、后续是否还有内容，并用自定义比较做 memo。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageRow.tsx
 * pieces: chunk-ag5x7vhf.js (7)
 * attribution: placement 1, fingerprint 5, callgraph-witnessed 1
 */
import {
  FWt,
  getToolSearchOrReadInfo,
  JBo,
  getDisplayMessageFromCollapsed,
} from "../utils/collapseReadSearch.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { Z9n, ife } from "./messageActions.js";
import {
  getProgressMessagesFromLookup,
  EMPTY_STRING_SET,
  getSiblingToolUseIDsFromLookup,
  getToolUseID,
  rowReferencesToolUseIds,
} from "../utils/messages.js";
import { shouldRenderStatically } from "./Messages.js";
import { shouldShowMessageTimestamp, MessageTimestamp } from "./MessageTimestamp.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { agentProgressSelector } from "../tools/AgentTool/UI.js";
import { FreezeWhenOffscreen } from "./FreezeWhenOffscreen.js";
import { MessageModel } from "./MessageModel.js";
import { Box } from "../ink/components/Text.js";
import { Rh } from "../../vendor/react/cjs/react.production.js";

//@ chunk-ag5x7vhf.js:138979-139092 placement
function shouldShowModelLabel(m, h) {
  return h && m.type === "assistant" && !!m.message.model && m.message.content.some((x) => x.type === "text");
}
//@ chunk-ag5x7vhf.js:141082-141728 fingerprint = hasContentAfterIndex (0.897)
function hasContentAfterIndex(m, h, x) {
  for (let T = m.length - 1; T >= 0; T--) {
    let k = m[T];
    if (k?.type === "assistant") {
      let _ = k.message.content[0];
      if (_?.type === "thinking" || _?.type === "redacted_thinking") {
        if (FWt(k)) return T;
        continue;
      }
      if (_?.type === "tool_use") {
        if (getToolSearchOrReadInfo(_.name, _.input, h).isCollapsible) continue;
        if (x.has(_.id)) continue;
      }
      return T;
    }
    if (k?.type === "attachment" && JBo(k)) return T;
    if (k?.type === "system" || k?.type === "attachment" || k?.type === "recap_fold") continue;
    if (k?.type === "user") {
      if (k.message.content[0]?.type === "tool_result") continue;
    }
    if (k?.type === "grouped_tool_use") {
      let firstInput = k.messages[0]?.message.content[0]?.input;
      if (getToolSearchOrReadInfo(k.toolName, firstInput, h).isCollapsible) continue;
    }
    return T;
  }
  return -1;
}
/**
 * 消息列表单行：决定是否显示时间戳/模型、是否仍在流式（isMessageStreaming）、工具是否全部完成，渲染 Message；transcript 屏与折叠分组有特殊处理。
 */
//@ chunk-ag5x7vhf.js:141728-145756 fingerprint = MessageRowImpl (0.817)
function MessageRowImpl(t0) {
  let $ = w(80),
    {
      message: msg,
      isUserContinuation: isUserContinuation,
      isSplitUserContinuation: isSplitUserContinuation,
      followsSpeakerLabel: followsSpeakerLabel,
      continuesLabelledReply: continuesLabelledReply,
      followsInboundLabel: followsInboundLabel,
      hasContentAfter: hasContentAfter,
      tools: tools,
      commands: commands,
      verbose: verbose,
      showMessageTimestamps: showMessageTimestamps,
      inProgressToolUseIDs: inProgressToolUseIDs,
      streamingToolUseIDs: streamingToolUseIDs,
      screen: screen,
      canAnimate: canAnimate,
      onOpenRateLimitOptions: onOpenRateLimitOptions,
      onRateLimitAutoQueueContinue: onRateLimitAutoQueueContinue,
      latestBashOutputUUID: latestBashOutputUUID,
      columns: columns,
      isLoading: isLoading,
      lookups: lookups,
    } = t0,
    Fe = screen === "transcript",
    te = msg.type === "grouped_tool_use",
    me = msg.type === "collapsed_read_search",
    _e;
  if (
    $[0] !== hasContentAfter ||
    $[1] !== inProgressToolUseIDs ||
    $[2] !== me ||
    $[3] !== isLoading ||
    $[4] !== msg
  )
    ((_e = me && (Z9n(msg, inProgressToolUseIDs) || (isLoading && !hasContentAfter))),
      ($[0] = hasContentAfter),
      ($[1] = inProgressToolUseIDs),
      ($[2] = me),
      ($[3] = isLoading),
      ($[4] = msg),
      ($[5] = _e));
  else _e = $[5];
  let oe = _e,
    ve;
  if ($[6] !== msg)
    ((ve =
      msg.type === "grouped_tool_use"
        ? msg.displayMessage
        : msg.type === "collapsed_read_search"
          ? getDisplayMessageFromCollapsed(msg)
          : msg.type === "work_segment" || msg.type === "speaker_label" || msg.type === "recap_fold"
            ? null
            : msg),
      ($[6] = msg),
      ($[7] = ve));
  else ve = $[7];
  let Ee = ve,
    He;
  if ($[8] !== Ee || $[9] !== me || $[10] !== te || $[11] !== lookups)
    ((He = Ee === null || te || me ? [] : getProgressMessagesFromLookup(Ee, lookups)),
      ($[8] = Ee),
      ($[9] = me),
      ($[10] = te),
      ($[11] = lookups),
      ($[12] = He));
  else He = $[12];
  let Ue = He,
    lt;
  if (
    $[13] !== Ee ||
    $[14] !== inProgressToolUseIDs ||
    $[15] !== me ||
    $[16] !== te ||
    $[17] !== lookups ||
    $[18] !== msg ||
    $[19] !== screen ||
    $[20] !== streamingToolUseIDs
  ) {
    let it = Ee === null || te || me ? EMPTY_STRING_SET : getSiblingToolUseIDsFromLookup(Ee, lookups);
    lt = shouldRenderStatically(msg, streamingToolUseIDs, inProgressToolUseIDs, it, screen, lookups);
    (($[13] = Ee),
      ($[14] = inProgressToolUseIDs),
      ($[15] = me),
      ($[16] = te),
      ($[17] = lookups),
      ($[18] = msg),
      ($[19] = screen),
      ($[20] = streamingToolUseIDs),
      ($[21] = lt));
  } else lt = $[21];
  let ae = lt,
    tt = !1;
  if (canAnimate) {
    if (msg.type === "grouped_tool_use") {
      let ct;
      if ($[22] !== inProgressToolUseIDs || $[23] !== msg.messages) {
        let Je;
        if ($[25] !== inProgressToolUseIDs)
          ((Je = ($e) => {
            let content = $e.message.content[0];
            return content?.type === "tool_use" && inProgressToolUseIDs.has(content.id);
          }),
            ($[25] = inProgressToolUseIDs),
            ($[26] = Je));
        else Je = $[26];
        ct = msg.messages.some(Je);
        (($[22] = inProgressToolUseIDs), ($[23] = msg.messages), ($[24] = ct));
      } else ct = $[24];
      tt = ct;
    } else if (msg.type === "collapsed_read_search") {
      let ct;
      if ($[27] !== inProgressToolUseIDs || $[28] !== msg)
        ((ct = Z9n(msg, inProgressToolUseIDs)), ($[27] = inProgressToolUseIDs), ($[28] = msg), ($[29] = ct));
      else ct = $[29];
      tt = ct;
    } else if (msg.type === "work_segment") tt = msg.isLive;
    else if (msg.type === "speaker_label" || msg.type === "recap_fold") tt = !1;
    else {
      let ct;
      if ($[30] !== inProgressToolUseIDs || $[31] !== msg) {
        let toolUseID = getToolUseID(msg);
        ct = !toolUseID || inProgressToolUseIDs.has(toolUseID);
        (($[30] = inProgressToolUseIDs), ($[31] = msg), ($[32] = ct));
      } else ct = $[32];
      tt = ct;
    }
  }
  let ct;
  if (
    $[33] !== continuesLabelledReply ||
    $[34] !== Ee ||
    $[35] !== followsSpeakerLabel ||
    $[36] !== isSplitUserContinuation ||
    $[37] !== Fe ||
    $[38] !== showMessageTimestamps
  )
    ((ct =
      Ee !== null &&
      !followsSpeakerLabel &&
      !continuesLabelledReply &&
      (shouldShowMessageTimestamp(Ee, Fe, showMessageTimestamps, isSplitUserContinuation) ||
        shouldShowModelLabel(Ee, Fe))),
      ($[33] = continuesLabelledReply),
      ($[34] = Ee),
      ($[35] = followsSpeakerLabel),
      ($[36] = isSplitUserContinuation),
      ($[37] = Fe),
      ($[38] = showMessageTimestamps),
      ($[39] = ct));
  else ct = $[39];
  let Ze = ct;
  const t6 = !Ze,
    pt = Ze ? void 0 : columns,
    Xt = !followsSpeakerLabel && !continuesLabelledReply;
  let rt;
  if (
    $[40] !== commands ||
    $[41] !== followsInboundLabel ||
    $[42] !== followsSpeakerLabel ||
    $[43] !== Ze ||
    $[44] !== inProgressToolUseIDs ||
    $[45] !== oe ||
    $[46] !== isSplitUserContinuation ||
    $[47] !== ae ||
    $[48] !== Fe ||
    $[49] !== isUserContinuation ||
    $[50] !== latestBashOutputUUID ||
    $[51] !== lookups ||
    $[52] !== msg ||
    $[53] !== onOpenRateLimitOptions ||
    $[54] !== onRateLimitAutoQueueContinue ||
    $[55] !== Ue ||
    $[56] !== tt ||
    $[57] !== t6 ||
    $[58] !== pt ||
    $[59] !== Xt ||
    $[60] !== tools ||
    $[61] !== verbose
  )
    ((rt = e(agentProgressSelector, {
      message: msg,
      lookups: lookups,
      addMargin: t6,
      containerWidth: pt,
      tools: tools,
      commands: commands,
      verbose: verbose,
      inProgressToolUseIDs: inProgressToolUseIDs,
      progressMessagesForMessage: Ue,
      shouldAnimate: tt,
      shouldShowDot: Xt,
      isTranscriptMode: Fe,
      isStatic: ae,
      onOpenRateLimitOptions: onOpenRateLimitOptions,
      onRateLimitAutoQueueContinue: onRateLimitAutoQueueContinue,
      isActiveCollapsedGroup: oe,
      isUserContinuation: isUserContinuation,
      isSplitUserContinuation: isSplitUserContinuation,
      followsSpeakerLabel: followsSpeakerLabel,
      followsInboundLabel: followsInboundLabel,
      hasMetadataHeader: Ze,
      latestBashOutputUUID: latestBashOutputUUID,
    })),
      ($[40] = commands),
      ($[41] = followsInboundLabel),
      ($[42] = followsSpeakerLabel),
      ($[43] = Ze),
      ($[44] = inProgressToolUseIDs),
      ($[45] = oe),
      ($[46] = isSplitUserContinuation),
      ($[47] = ae),
      ($[48] = Fe),
      ($[49] = isUserContinuation),
      ($[50] = latestBashOutputUUID),
      ($[51] = lookups),
      ($[52] = msg),
      ($[53] = onOpenRateLimitOptions),
      ($[54] = onRateLimitAutoQueueContinue),
      ($[55] = Ue),
      ($[56] = tt),
      ($[57] = t6),
      ($[58] = pt),
      ($[59] = Xt),
      ($[60] = tools),
      ($[61] = verbose),
      ($[62] = rt));
  else rt = $[62];
  let qe = rt;
  if (!Ze || Ee === null) {
    let St;
    if ($[63] !== qe) ((St = e(FreezeWhenOffscreen, { children: qe })), ($[63] = qe), ($[64] = St));
    else St = $[64];
    return St;
  }
  let St;
  if ($[65] !== Ee || $[66] !== isSplitUserContinuation || $[67] !== Fe || $[68] !== showMessageTimestamps)
    ((St = e(MessageTimestamp, {
      message: Ee,
      isTranscriptMode: Fe,
      showMessageTimestamps: showMessageTimestamps,
      isSplitUserContinuation: isSplitUserContinuation,
    })),
      ($[65] = Ee),
      ($[66] = isSplitUserContinuation),
      ($[67] = Fe),
      ($[68] = showMessageTimestamps),
      ($[69] = St));
  else St = $[69];
  let dt;
  if ($[70] !== Ee || $[71] !== Fe)
    ((dt = e(MessageModel, { message: Ee, isTranscriptMode: Fe })), ($[70] = Ee), ($[71] = Fe), ($[72] = dt));
  else dt = $[72];
  let Pt;
  if ($[73] !== St || $[74] !== dt)
    ((Pt = r(Box, {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 1,
      marginTop: 1,
      children: [St, dt],
    })),
      ($[73] = St),
      ($[74] = dt),
      ($[75] = Pt));
  else Pt = $[75];
  let Ot;
  if ($[76] !== columns || $[77] !== qe || $[78] !== Pt)
    ((Ot = e(FreezeWhenOffscreen, {
      children: r(Box, { width: columns, flexDirection: "column", children: [Pt, qe] }),
    })),
      ($[76] = columns),
      ($[77] = qe),
      ($[78] = Pt),
      ($[79] = Ot));
  else Ot = $[79];
  return Ot;
}
//@ chunk-ag5x7vhf.js:146130-146586 fingerprint = allToolsResolved (0.655)
function allToolsResolved(msg, resolvedToolUseIDs) {
  if (msg.type === "grouped_tool_use")
    return msg.messages.every((message) => {
      let k = message.message.content[0];
      return k?.type === "tool_use" && resolvedToolUseIDs.has(k.id);
    });
  if (msg.type === "collapsed_read_search") return ife(msg).every((id) => resolvedToolUseIDs.has(id));
  if (msg.type === "assistant") {
    let T = msg.message.content[0];
    if (T?.type === "server_tool_use") return resolvedToolUseIDs.has(T.id);
  }
  if (msg.type === "work_segment") return !msg.isLive;
  if (msg.type === "speaker_label" || msg.type === "recap_fold") return !0;
  let toolUseID = getToolUseID(msg);
  return !toolUseID || resolvedToolUseIDs.has(toolUseID);
}
//@ chunk-ag5x7vhf.js:146586-147355 fingerprint = areMessageRowPropsEqual (0.751)
function areMessageRowPropsEqual(prev, next) {
  if (prev.message !== next.message) return !1;
  if (prev.screen !== next.screen) return !1;
  if (prev.verbose !== next.verbose) return !1;
  if (prev.showMessageTimestamps !== next.showMessageTimestamps) return !1;
  if (
    prev.isUserContinuation !== next.isUserContinuation ||
    prev.isSplitUserContinuation !== next.isSplitUserContinuation ||
    prev.followsSpeakerLabel !== next.followsSpeakerLabel ||
    prev.continuesLabelledReply !== next.continuesLabelledReply ||
    prev.followsInboundLabel !== next.followsInboundLabel
  )
    return !1;
  if (prev.message.type === "collapsed_read_search" && next.screen !== "transcript") return !1;
  if (prev.columns !== next.columns) return !1;
  let x = prev.latestBashOutputUUID === prev.message.uuid,
    T = next.latestBashOutputUUID === next.message.uuid;
  if (x !== T) return !1;
  let isStreaming = rowReferencesToolUseIds(prev.message, prev.streamingToolUseIDs),
    isResolved = allToolsResolved(prev.message, prev.lookups.resolvedToolUseIDs);
  if (isStreaming || !isResolved) return !1;
  return !0;
}
/**
 * MessageRow = React.memo(MessageRowImpl, areMessageRowPropsEqual)。
 */
//@ chunk-ag5x7vhf.js:147355-147372 callgraph-witnessed = MessageRow (0)
var MessageRow = Rh(MessageRowImpl, areMessageRowPropsEqual);
/**
 * 判断消息是否仍在流式输出：与当前流式工具 ID 比较，按 assistant/user/grouped_tool_use/collapsed_read_search 分类检查。
 */
//@ chunk-ag5x7vhf.js:172936-173244 fingerprint = isMessageStreaming (0.863)
function isMessageStreaming(msg, streamingToolUseIDs) {
  if (msg.uuid === streamingToolUseIDs) return !0;
  switch (msg.type) {
    case "assistant":
    case "user":
      return getToolUseID(msg) === streamingToolUseIDs;
    case "grouped_tool_use":
      return msg.messages.some((message) => message.message.content[0]?.id === streamingToolUseIDs);
    case "collapsed_read_search":
      return msg.messages.some(
        (id) => (id.type === "assistant" || id.type === "user") && getToolUseID(id) === streamingToolUseIDs,
      );
    default:
      return !1;
  }
}

export { hasContentAfterIndex, MessageRow, shouldShowModelLabel, isMessageStreaming };
