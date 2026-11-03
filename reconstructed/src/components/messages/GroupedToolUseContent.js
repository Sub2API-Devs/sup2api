/**
 * components/messages/GroupedToolUseContent.tsx
 *
 * 同类工具调用分组显示（工具的 renderGroupedToolUse）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/GroupedToolUseContent.tsx
 * pieces: chunk-ah34pb7m.js (18)
 * attribution: placement 15, sole-consumer 1, affinity 1, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  isToolDenial,
  uPn,
  REJECT_MESSAGE,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  AGENT_CALL_PROCESS_STOPPED,
  getUserMessageText,
} from "../../utils/messages.js";
import { INTERRUPTED_TOOL_STATUSES, Ige } from "../../entrypoints/sdk/coreSchemas.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RejectedToolUseMessage } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { mcpRenderOverrideFor } from "../Message.js";
import { safeParseToolInput, filterToolProgressMessages, findToolByName } from "../../Tool.js";
import { UserToolErrorMessage } from "./UserToolResultMessage/UserToolErrorMessage.js";
import { x6 } from "../../plugins/functionHooks/ui/index.js";
import { y, j, qt } from "../../../vendor/react/cjs/react.production.js";
import { D0, hasContentAfterIndex } from "./toolResultRendering.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { CollapsedReadSearchContent, selectViewingAgentTaskId_2 } from "./CollapsedReadSearchContent.js";
import { useAppState, rs } from "../../state/AppState.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { x_o } from "../Spinner/spinnerStatus.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { jWr } from "../../utils/collapseReadSearch.js";
import { formatDuration } from "../../utils/format.js";
import { Text } from "../../ink/components/Text.js";
import { Cb } from "../../services/orgMemory/promptIndex.js";
import { wrapText } from "../../ink/wrap-text.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { hasStringUuid } from "../../bridge/inboundMessages.js";

/**
 * 分组工具调用中的一行（输入、结果、进度）。
 */
//@ chunk-ah34pb7m.js:162030-163885 placement
function GroupedToolUseRow(m) {
  let k = w(24),
    {
      toolUseID: toolUseID,
      input: input,
      resultMsg: resultMsg,
      tool: tool,
      tools: tools,
      progressMessagesForMessage: progressMessagesForMessage,
    } = m,
    { columns: columns } = useTerminalSize(),
    [x] = useTheme();
  if (resultMsg?.type !== "user") {
    return null;
  }
  let b, E;
  if (
    k[0] !== columns ||
    k[1] !== input ||
    k[2] !== progressMessagesForMessage ||
    k[3] !== resultMsg ||
    k[4] !== x ||
    k[5] !== tool ||
    k[6] !== toolUseID ||
    k[7] !== tools
  ) {
    E = EARLY_RETURN_SENTINEL;
    N: {
      let B;
      if (k[10] !== toolUseID)
        ((B = (L) => L.type === "tool_result" && L.tool_use_id === toolUseID),
          (k[10] = toolUseID),
          (k[11] = B));
      else B = k[11];
      b = resultMsg.message.content.find(B);
      if (b?.type !== "tool_result") {
        E = null;
        break N;
      }
      let W = isToolDenial(b.content, resultMsg, INTERRUPTED_TOOL_STATUSES);
      let U = isToolDenial(b.content, resultMsg, Ige);
      if (W && typeof b.content === "string" && uPn(b.content)) {
        let K;
        if (k[12] === MEMO_CACHE_SENTINEL) ((K = e(RejectedToolUseMessage, {})), (k[12] = K));
        else K = k[12];
        E = K;
        break N;
      }
      if (
        (U &&
          typeof b.content === "string" &&
          (b.content.startsWith(REJECT_MESSAGE) ||
            (b.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX) &&
              mcpRenderOverrideFor(tool, "renderToolUseRejectedMessage") !== void 0))) ||
        (W &&
          (b.content === INTERRUPT_MESSAGE_FOR_TOOL_USE ||
            b.content === TOOL_CALL_ENDED_FOR_DELIVERY ||
            b.content === TOOL_CALL_SESSION_ENDED ||
            b.content === TOOL_RESULT_NOT_IN_COPY ||
            b.content === AGENT_CALL_PROCESS_STOPPED))
      ) {
        let V = mcpRenderOverrideFor(tool, "renderToolUseRejectedMessage");
        if (!V) {
          let K;
          if (k[13] === MEMO_CACHE_SENTINEL) ((K = e(RejectedToolUseMessage, {})), (k[13] = K));
          else K = k[13];
          E = K;
          break N;
        }
        let Y = safeParseToolInput(tool, input);
        if (!Y.success) {
          let K;
          if (k[14] === MEMO_CACHE_SENTINEL) ((K = e(RejectedToolUseMessage, {})), (k[14] = K));
          else K = k[14];
          E = K;
          break N;
        }
        E =
          V(Y.data, {
            columns: columns,
            messages: [],
            tools: tools,
            verbose: !0,
            progressMessagesForMessage: filterToolProgressMessages(progressMessagesForMessage),
            isInterrupted:
              typeof b.content !== "string" ||
              !(
                b.content.startsWith(REJECT_MESSAGE) ||
                b.content.startsWith(REJECT_MESSAGE_WITH_REASON_PREFIX)
              ),
            theme: x,
            isTranscriptMode: !0,
          }) ?? e(RejectedToolUseMessage, {});
        break N;
      }
    }
    ((k[0] = columns),
      (k[1] = input),
      (k[2] = progressMessagesForMessage),
      (k[3] = resultMsg),
      (k[4] = x),
      (k[5] = tool),
      (k[6] = toolUseID),
      (k[7] = tools),
      (k[8] = b),
      (k[9] = E));
  } else ((b = k[8]), (E = k[9]));
  if (E !== EARLY_RETURN_SENTINEL) return E;
  let B;
  if (
    k[15] !== b ||
    k[16] !== input ||
    k[17] !== progressMessagesForMessage ||
    k[18] !== resultMsg.remoteToolDenialKind ||
    k[19] !== resultMsg.toolDenialKind ||
    k[20] !== resultMsg.toolUseResult ||
    k[21] !== tool ||
    k[22] !== tools
  )
    ((B = e(UserToolErrorMessage, {
      param: b,
      tool: tool,
      tools: tools,
      input: input,
      output: resultMsg.toolUseResult,
      toolDenialKind: resultMsg.toolDenialKind,
      remoteToolDenialKind: resultMsg.remoteToolDenialKind,
      verbose: !0,
      progressMessagesForMessage: progressMessagesForMessage,
      isTranscriptMode: !0,
    })),
      (k[15] = b),
      (k[16] = input),
      (k[17] = progressMessagesForMessage),
      (k[18] = resultMsg.remoteToolDenialKind),
      (k[19] = resultMsg.toolDenialKind),
      (k[20] = resultMsg.toolUseResult),
      (k[21] = tool),
      (k[22] = tools),
      (k[23] = B));
  else B = k[23];
  return B;
}
//@ chunk-ah34pb7m.js:163885-163909 placement
var rw = "\x00",
  nw = "\x01";
/**
 * 渲染一组同类工具调用（进行中、出错、活跃组）。
 */
//@ chunk-ah34pb7m.js:163909-165874 placement
function GroupedToolUseContent(m) {
  let M = w(34),
    {
      message: message,
      inProgressToolUseIDs: inProgressToolUseIDs,
      lookups: lookups,
      verbose: verbose,
      isActiveGroup: isActiveGroup,
    } = m,
    T;
  if (M[0] !== inProgressToolUseIDs || M[1] !== lookups || M[2] !== message) {
    const x = toolCallOf(message);
    let k;
    if (M[4] !== inProgressToolUseIDs || M[5] !== lookups)
      ((k = (b) =>
        [
          b.id,
          lookups.toolResultByToolUseID.get(b.id)?.uuid ?? "",
          inProgressToolUseIDs.has(b.id) ? "running" : "",
          lookups.erroredToolUseIDs.has(b.id) ? "errored" : "",
        ].join(rw)),
        (M[4] = inProgressToolUseIDs),
        (M[5] = lookups),
        (M[6] = k));
    else k = M[6];
    T = x.map(k).join(nw);
    ((M[0] = inProgressToolUseIDs), (M[1] = lookups), (M[2] = message), (M[3] = T));
  } else T = M[3];
  let E = T,
    x;
  if (M[7] !== inProgressToolUseIDs || M[8] !== lookups || M[9] !== message)
    ((x = (B) => ({
      key: B,
      calls: toolCallOf(message).map((L) => {
        let N = lookups.toolResultByToolUseID.get(L.id);
        return {
          tool_use_id: L.id,
          tool: L.name,
          input: L.input,
          isRunning: inProgressToolUseIDs.has(L.id),
          isErrored: lookups.erroredToolUseIDs.has(L.id),
          isInterrupted: x6.isInterruptedCall(N),
          output: N?.type === "user" ? N.toolUseResult : void 0,
        };
      }),
    })),
      (M[7] = inProgressToolUseIDs),
      (M[8] = lookups),
      (M[9] = message),
      (M[10] = x));
  else x = M[10];
  let W = x,
    k;
  if (M[11] !== E || M[12] !== W) ((k = () => W(E)), (M[11] = E), (M[12] = W), (M[13] = k));
  else k = M[13];
  let [U, K] = y(k),
    V = U;
  if (U.key !== E) {
    if (M[14] !== E || M[15] !== W) ((V = W(E)), K(V), (M[14] = E), (M[15] = W), (M[16] = V));
    else V = M[16];
  }
  let { calls: calls } = V,
    X;
  if (
    M[17] !== calls ||
    M[18] !== message.accountMemoryRecalls?.length ||
    M[19] !== message.hookCount ||
    M[20] !== message.hookInfos?.length ||
    M[21] !== message.hookTotalMs ||
    M[22] !== message.messages ||
    M[23] !== message.relevantMemories?.length
  )
    ((X =
      calls.every(D0) &&
      (message.relevantMemories?.length ?? 0) === 0 &&
      (message.accountMemoryRecalls?.length ?? 0) === 0 &&
      (message.hookCount ?? 0) === 0 &&
      (message.hookTotalMs ?? 0) === 0 &&
      (message.hookInfos?.length ?? 0) === 0 &&
      message.messages.every(hasContentAfterIndex)),
      (M[17] = calls),
      (M[18] = message.accountMemoryRecalls?.length),
      (M[19] = message.hookCount),
      (M[20] = message.hookInfos?.length),
      (M[21] = message.hookTotalMs),
      (M[22] = message.messages),
      (M[23] = message.relevantMemories?.length),
      (M[24] = X));
  else X = M[24];
  let z = X,
    ee,
    le;
  if (
    M[25] !== calls ||
    M[26] !== isActiveGroup ||
    M[27] !== z ||
    M[28] !== message.uuid ||
    M[29] !== verbose
  )
    ((ee = () => ({
      requestId: message.uuid,
      props: { calls: calls, isActive: isActiveGroup === !0, isExpanded: verbose, isCallsOnly: z },
    })),
      (le = [message.uuid, calls, isActiveGroup, verbose, z]),
      (M[25] = calls),
      (M[26] = isActiveGroup),
      (M[27] = z),
      (M[28] = message.uuid),
      (M[29] = verbose),
      (M[30] = ee),
      (M[31] = le));
  else ((ee = M[30]), (le = M[31]));
  let useRenderInput = actionKeysNamespace.useRenderInput("ToolGroup", ee, le),
    ae;
  if (M[32] !== m)
    ((ae = (pe) => e(CollapsedReadSearchContent, { ...m, verbose: pe.props.isExpanded })),
      (M[32] = m),
      (M[33] = ae));
  else ae = M[33];
  return actionKeysNamespace.useRenderHook(useRenderInput, ae);
}
//@ chunk-ah34pb7m.js:165874-166083 placement = toolCallOf (1)
function toolCallOf(msg) {
  let d = [];
  for (let message of msg.messages) {
    let g =
      message.type === "assistant" ? [message] : message.type === "grouped_tool_use" ? message.messages : [];
    for (let f of g) {
      let h = f.message.content[0];
      if (h?.type === "tool_use") d.push(h);
    }
  }
  return d;
}
/**
 * 思考已用时间计时显示。
 */
//@ chunk-ah34pb7m.js:185246-185626 placement
function ThinkingElapsed(m) {
  let f = w(6),
    { baseMs: baseMs, lastThinkingAtMs: lastThinkingAtMs } = m,
    g = useAppState(selectViewingAgentTaskId_2),
    h;
  if (f[0] !== g) ((h = g ?? mainAgentId()), (f[0] = g), (f[1] = h));
  else h = f[1];
  let M = x_o(h);
  useAnimationFrame(M !== null ? 1000 : null);
  let T =
    M !== null ? baseMs + Math.min(jWr, Math.max(0, Date.now() - Math.max(M, lastThinkingAtMs))) : baseMs;
  const max = Math.max(1000, T);
  let k;
  if (f[2] !== max) ((k = formatDuration(max)), (f[2] = max), (f[3] = k));
  else k = f[3];
  let b;
  if (f[4] !== k) ((b = e(Text, { bold: !0, children: k })), (f[4] = k), (f[5] = b));
  else b = f[5];
  return b;
}
/**
 * 从 anchorMs 起计时，超过 2 秒后显示" · 耗时"，动画时每秒刷新。
 */
//@ chunk-ah34pb7m.js:185626-185889 placement
function ElapsedSinceAnchor(m) {
  let f = w(4),
    { anchorMs: anchorMs, shouldAnimate: shouldAnimate } = m;
  useAnimationFrame(shouldAnimate ? 1000 : null);
  let g = Date.now() - anchorMs;
  if (g < 2000) {
    return null;
  }
  let h;
  if (f[0] !== g) ((h = formatDuration(g)), (f[0] = g), (f[1] = h));
  else h = f[1];
  let M;
  if (f[2] !== h) ((M = r(Text, { dimColor: !0, children: [" \xB7 ", h] })), (f[2] = h), (f[3] = M));
  else M = f[3];
  return M;
}
/**
 * 把文本按宽度折行截到指定行数并加省略号。
 */
//@ chunk-ah34pb7m.js:185889-186222 placement
function truncateToLines(m, d, c) {
  let g = Cb(m);
  if (d < 1) return g;
  let parts = wrapText(g, d, "wrap").split(`
`);
  if (parts.length <= c) return g;
  let trimmed = parts.slice(0, c).join("").replace(/\s+/g, " ").trim();
  while (
    trimmed.length > 0 &&
    countCharInString(
      wrapText(`${trimmed}\u2026`, d, "wrap"),
      `
`,
    ) +
      1 >
      c
  ) {
    let M = trimmed.length > 1 ? trimmed.codePointAt(trimmed.length - 2) : void 0;
    trimmed = trimmed.slice(0, M !== void 0 && M > 65535 ? -2 : -1);
  }
  return `${trimmed.trimEnd()}\u2026`;
}
//@ chunk-ah34pb7m.js:186222-186312 placement
function NC(m, d) {
  return d || /^\S\S*\p{Lu}/u.test(m) ? m : m.charAt(0).toLowerCase() + m.slice(1);
}
/**
 * 收集消息中以后台方式运行的 Bash/Agent 工具调用 id。
 */
//@ chunk-ah34pb7m.js:186312-186984 placement
function collectBackgroundToolUseIds(m) {
  let d = new Set(),
    c = new Set();
  for (let h of m) {
    if (h.type !== "assistant") continue;
    for (let M of h.message.content)
      if (M.type === "tool_use" && (M.name === AGENT || M.name === TASK)) {
        if ((d.add(M.id), M.input?.run_in_background !== !1)) c.add(M.id);
      }
  }
  if (d.size === 0) return !1;
  let g = new Set(),
    f = !1;
  for (let h of m) {
    if (h.type !== "user" || !Array.isArray(h.message.content)) continue;
    let M = !1;
    for (let x of h.message.content)
      if (x.type === "tool_result" && d.has(x.tool_use_id)) {
        if (((M = !0), g.add(x.tool_use_id), x.is_error === !0)) f = !0;
      }
    if (!M) continue;
    let T = h.toolUseResult?.status;
    if (T === "async_launched" || T === "remote_launched" || T === "teammate_spawned") f = !0;
  }
  if (f) return !0;
  for (let h of c) if (!g.has(h)) return !0;
  return !1;
}
//@ chunk-ah34pb7m.js:186984-186988 placement
j();
//@ chunk-ah34pb7m.js:186988-186992 placement
j();
//@ chunk-ah34pb7m.js:186992-187166 placement
var COMPACTED_TRANSCRIPT_HINT =
    "If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at: ",
  CompactSummaryContext = qt(null);
/**
 * 找到消息列表开头的压缩边界及其摘要消息。
 */
//@ chunk-ah34pb7m.js:187166-187682 placement
function findLeadingCompactBoundary(m) {
  let index = m.findIndex((T) => T.type === "user" || T.type === "assistant" || isCompactBoundaryMessage(T)),
    c = m[index];
  if (c === void 0 || !isCompactBoundaryMessage(c) || !hasStringUuid(c)) return null;
  let g;
  for (let T = index + 1; T < m.length; T++) {
    let x = m[T];
    if (isCompactBoundaryMessage(x)) break;
    if (x.type === "user" && x.isCompactSummary) {
      g = getUserMessageText(x);
      break;
    }
  }
  if (g === void 0) return { uuid: c.uuid, summary: null };
  let f =
    g?.lastIndexOf(`
${COMPACTED_TRANSCRIPT_HINT}`) ?? -1;
  if (g === null || f === -1) return { uuid: c.uuid, summary: { transcriptPath: void 0 } };
  let h = f + 1 + COMPACTED_TRANSCRIPT_HINT.length,
    index_2 = g.indexOf(
      `
`,
      h,
    );
  return { uuid: c.uuid, summary: { transcriptPath: g.slice(h, index_2 === -1 ? void 0 : index_2) } };
}
/**
 * 工具组标题后的提示后缀：没有摘要信息时提示查看历史，有摘要时提示查看摘要。
 */
//@ chunk-ah34pb7m.js:187682-187792 placement
function historyHintSuffix(m, d) {
  if (m === null) return ` (${d} for history)`;
  return m.summary === null ? "" : ` (${d} for the summary)`;
}
//@ chunk-ah34pb7m.js:187792-187857 placement
function Dho(m, d, c) {
  let g = findLeadingCompactBoundary(m);
  return historyHintSuffix(g?.uuid === d ? g : null, c);
}
//@ chunk-ah34pb7m.js:189153-189209 sole-consumer
function dB(ee) {
  return ee.agentDefinitions.activeAgents;
}
//@ chunk-ah34pb7m.js:189209-189248 affinity
function mB(le) {
  return le.isInProgress;
}
//@ chunk-ah34pb7m.js:189248-190237 fingerprint = GroupedToolUseContent (0.834)
function GroupedToolUseContent_2(m) {
  let $ = w(11),
    {
      message: message,
      tools: tools,
      lookups: lookups,
      inProgressToolUseIDs: inProgressToolUseIDs,
      shouldAnimate: shouldAnimate,
      addMargin: addMargin,
    } = m,
    T = rs(dB),
    k,
    b;
  if (
    $[0] !== T ||
    $[1] !== addMargin ||
    $[2] !== inProgressToolUseIDs ||
    $[3] !== lookups ||
    $[4] !== message.messages ||
    $[5] !== message.results ||
    $[6] !== message.toolName ||
    $[7] !== shouldAnimate ||
    $[8] !== tools
  ) {
    b = EARLY_RETURN_SENTINEL;
    L: {
      let tool = findToolByName(tools, message.toolName);
      let B = tool && mcpRenderOverrideFor(tool, "renderGroupedToolUse");
      if (!B) {
        b = null;
        break L;
      }
      let resultsByToolUseId = new Map();
      for (const resultMsg of message.results) {
        for (const content of resultMsg.message.content) {
          if (content.type === "tool_result")
            resultsByToolUseId.set(content.tool_use_id, { param: content, output: resultMsg.toolUseResult });
        }
      }
      let toolUsesData = message.messages.map((msg) => {
        let content = msg.message.content[0];
        let result = resultsByToolUseId.get(content.id);
        return {
          param: content,
          isResolved: lookups.resolvedToolUseIDs.has(content.id),
          isError: lookups.erroredToolUseIDs.has(content.id),
          isInProgress: inProgressToolUseIDs.has(content.id),
          progressMessages: filterToolProgressMessages(
            lookups.progressMessagesByToolUseID.get(content.id) ?? [],
          ),
          result: result,
        };
      });
      let anyInProgress = toolUsesData.some(mB);
      k = B(toolUsesData, {
        shouldAnimate: shouldAnimate && anyInProgress,
        tools: tools,
        addMargin: addMargin,
        activeAgents: T,
      });
    }
    (($[0] = T),
      ($[1] = addMargin),
      ($[2] = inProgressToolUseIDs),
      ($[3] = lookups),
      ($[4] = message.messages),
      ($[5] = message.results),
      ($[6] = message.toolName),
      ($[7] = shouldAnimate),
      ($[8] = tools),
      ($[9] = k),
      ($[10] = b));
  } else ((k = $[9]), (b = $[10]));
  if (b !== EARLY_RETURN_SENTINEL) return b;
  return k;
}

export {
  findLeadingCompactBoundary,
  CompactSummaryContext,
  Dho,
  historyHintSuffix,
  GroupedToolUseRow,
  toolCallOf,
  ThinkingElapsed,
  collectBackgroundToolUseIds,
  NC,
  ElapsedSinceAnchor,
  truncateToLines,
  GroupedToolUseContent_2,
  GroupedToolUseContent,
};
