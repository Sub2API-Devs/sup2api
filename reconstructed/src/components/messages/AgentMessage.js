/**
 * components/messages/AgentMessage.tsx
 *
 * 2.1.316 新增：渲染稍后送达的工具结果（成功/拒绝/错误三种行）；渲染来自其他代理/对等会话的消息（来源名、来源类型、转录模式下展开）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (18)
 * attribution: placement 18
 */
import { j, zt } from "../../../vendor/react/cjs/react.production.js";
import { Hb } from "../../utils/swarm/teammateIds.js";
import {
  PEER_MESSAGE_PREFIXES,
  PEER_MESSAGE_SUFFIXES,
  DESCENDANT_MESSAGE_SUFFIXES,
} from "../../utils/crossSessionMessages.js";
import { regExp_3 } from "../../utils/messages.js";
import { HANDBACK_REPORT_HEADER } from "../../tools/AgentTool/handbackReport.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Wj } from "./transcriptModeContext.js";
import { rs } from "../../state/AppState.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { Zno } from "../../utils/messageProvenance.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { a9 } from "../../utils/formatBriefTimestamp.js";
import { CollapsibleText } from "./CollapsedLines.js";
import { CtrlOToExpandHint, OverflowHint } from "../CtrlOToExpand.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { truncateToLength, countCharInString } from "../../utils/stringUtils.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { iP } from "../../context/session.js";
import { kT } from "../../services/tools/detachedToolCalls.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { a5 } from "../FreezeWhenOffscreen.js";
import { MessageResponse } from "../MessageResponse.js";
import { formatDuration } from "../../utils/format.js";
import { readComputerFolderReplyTarget } from "../../remote/tools/toolHostsNotice.js";
import { dce } from "../../utils/teleport/repositoryTrustGate.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";

//@ chunk-ah34pb7m.js:209574-209578 placement
j();
//@ chunk-ah34pb7m.js:209578-209612 placement
function HF(te) {
  return te.verbose;
}
//@ chunk-ah34pb7m.js:209612-209643 placement
var Xf = "</agent-message>",
  BS = 5;
//@ chunk-ah34pb7m.js:209643-209680 placement
function FS(m) {
  return Hb(m) || "agent";
}
/**
 * 去掉代理消息的前缀与结尾标签，得到正文。
 */
//@ chunk-ah34pb7m.js:209680-210044 placement
function stripAgentMessageWrapper(m) {
  let d = m,
    found = PEER_MESSAGE_PREFIXES.find((f) => d.startsWith(f));
  if (found) d = d.slice(found.length);
  let g = d.lastIndexOf(Xf) + Xf.length;
  if (g > Xf.length - 1) {
    let f = regExp_3.exec(d.slice(g))?.[0];
    if (f !== void 0) d = d.slice(0, g) + d.slice(g + f.length);
    let sliced = d.slice(g);
    if (PEER_MESSAGE_SUFFIXES.includes(sliced) || DESCENDANT_MESSAGE_SUFFIXES.includes(sliced))
      d = d.slice(0, g);
  }
  return d.replace(/^<agent-message[^>]*>\n/, "").replace(/\n<\/agent-message>$/, "");
}
//@ chunk-ah34pb7m.js:210044-210203 placement
function stripAgentMessageHeader(m) {
  let d =
      HANDBACK_REPORT_HEADER +
      `
`,
    index = `
${m}`.indexOf(`
${d}`);
  if (index === -1) return m;
  let sliced = m.slice(index + d.length);
  if (index === 0) return dedentTwoSpaces(sliced);
  return `${dedentTwoSpaces(m.slice(0, index - 1))}

${sliced}`;
}
/**
 * 渲染来自其他代理/对等会话的消息（来源名、来源类型、转录模式下展开）。
 */
//@ chunk-ah34pb7m.js:210203-211460 placement
function AgentMessage(m) {
  let E = w(31),
    {
      addMargin: addMargin,
      param: param,
      fromName: fromName,
      verbose: verbose,
      isTranscriptMode: isTranscriptMode,
      messageId: messageId,
      origin: origin,
      followsSpeakerLabel: followsSpeakerLabel,
    } = m,
    k = followsSpeakerLabel === void 0 ? !1 : followsSpeakerLabel,
    b = Wj(verbose, isTranscriptMode),
    B;
  if (E[0] !== fromName) ((B = FS(fromName)), (E[0] = fromName), (E[1] = B));
  else B = E[1];
  let L = B,
    N = rs(HF) === !0,
    W;
  if (E[2] !== origin.handback || E[3] !== origin.kind || E[4] !== param.text || E[5] !== N) {
    let U = stripAgentMessageWrapper(typeof param.text === "string" ? param.text : "");
    W = origin.kind === "peer" && origin.handback === !0 && !N ? stripAgentMessageHeader(U) : U;
    ((E[2] = origin.handback), (E[3] = origin.kind), (E[4] = param.text), (E[5] = N), (E[6] = W));
  } else W = E[6];
  let K = W,
    { columns: columns } = useTerminalSize(),
    Y;
  if (E[7] !== origin) ((Y = Zno(origin)), (E[7] = origin), (E[8] = Y));
  else Y = E[8];
  let X = Y,
    z;
  if (E[9] !== K || E[10] !== columns || E[11] !== b || E[12] !== k || E[13] !== X)
    ((z = b || (k && (X || capTextToLines(K, Math.max(1, columns)) === null))),
      (E[9] = K),
      (E[10] = columns),
      (E[11] = b),
      (E[12] = k),
      (E[13] = X),
      (E[14] = z));
  else z = E[14];
  let ee = z,
    le;
  if (E[15] !== L) ((le = { name: L }), (E[15] = L), (E[16] = le));
  else le = E[16];
  let ge;
  if (E[17] !== addMargin || E[18] !== b || E[19] !== k || E[20] !== fromName || E[21] !== L || E[22] !== X)
    ((ge = (ae) =>
      e(AgentMessageBody, {
        addMargin: addMargin,
        fromName: fromName,
        name: L,
        expanded: b,
        uncapped: X,
        followsSpeakerLabel: k,
        body: ae,
      })),
      (E[17] = addMargin),
      (E[18] = b),
      (E[19] = k),
      (E[20] = fromName),
      (E[21] = L),
      (E[22] = X),
      (E[23] = ge));
  else ge = E[23];
  let pe;
  if (E[24] !== K || E[25] !== ee || E[26] !== messageId || E[27] !== origin || E[28] !== le || E[29] !== ge)
    ((pe = { messageId: messageId, stored: origin, text: K, isExpanded: ee, sender: le, draw: ge }),
      (E[24] = K),
      (E[25] = ee),
      (E[26] = messageId),
      (E[27] = origin),
      (E[28] = le),
      (E[29] = ge),
      (E[30] = pe));
  else pe = E[30];
  return a9.useUserMessageSite(pe);
}
/**
 * 代理消息正文：展开或限高显示，跟在发言人标签后时省略标题。
 */
//@ chunk-ah34pb7m.js:211460-212319 placement
function AgentMessageBody(m) {
  let x = w(16),
    {
      addMargin: addMargin,
      fromName: fromName,
      name: g,
      expanded: expanded,
      uncapped: uncapped,
      followsSpeakerLabel: followsSpeakerLabel,
      body: body,
    } = m;
  if (followsSpeakerLabel) {
    let k;
    if (x[0] !== body || x[1] !== expanded || x[2] !== uncapped)
      ((k = expanded || uncapped ? e(CollapsibleText, { text: body }) : e(CappedMessageBody, { body: body })),
        (x[0] = body),
        (x[1] = expanded),
        (x[2] = uncapped),
        (x[3] = k));
    else k = x[3];
    return k;
  }
  if (!expanded) {
    let k;
    if (x[4] !== addMargin || x[5] !== fromName)
      ((k = e(CtrlOToExpandHint, { displayName: fromName, addMargin: addMargin, fallbackLabel: "agent" })),
        (x[4] = addMargin),
        (x[5] = fromName),
        (x[6] = k));
    else k = x[6];
    return k;
  }
  const k = addMargin ? 1 : 0;
  let b;
  if (x[7] === MEMO_CACHE_SENTINEL)
    ((b = r(Text, { "aria-hidden": !0, children: [re.pointerSmall, " "] })), (x[7] = b));
  else b = x[7];
  let E;
  if (x[8] !== g)
    ((E = r(Text, { dimColor: !0, children: [b, "Message from ", g] })), (x[8] = g), (x[9] = E));
  else E = x[9];
  let B;
  if (x[10] !== body)
    ((B = e(Box, { paddingLeft: 2, children: e(Text, { wrap: "wrap", children: body }) })),
      (x[10] = body),
      (x[11] = B));
  else B = x[11];
  let L;
  if (x[12] !== k || x[13] !== E || x[14] !== B)
    ((L = r(Box, { flexDirection: "column", marginTop: k, width: "100%", children: [E, B] })),
      (x[12] = k),
      (x[13] = E),
      (x[14] = B),
      (x[15] = L));
  else L = x[15];
  return L;
}
/**
 * 按终端宽度限制行数显示消息正文，超出时截断。
 */
//@ chunk-ah34pb7m.js:212319-212929 placement
function CappedMessageBody(m) {
  let f = w(13),
    { body: body } = m,
    { columns: columns } = useTerminalSize(),
    max = Math.max(1, columns),
    h;
  if (f[0] !== body || f[1] !== max)
    ((h = capTextToLines(body, max)), (f[0] = body), (f[1] = max), (f[2] = h));
  else h = f[2];
  let M = h;
  if (M === null) {
    let T;
    if (f[3] !== body) ((T = e(CollapsibleText, { text: body })), (f[3] = body), (f[4] = T));
    else T = f[4];
    return T;
  }
  let T;
  if (f[5] !== M.shown) ((T = e(CollapsibleText, { text: M.shown })), (f[5] = M.shown), (f[6] = T));
  else T = f[6];
  let x;
  if (f[7] !== M.hiddenChars || f[8] !== M.hiddenLines)
    ((x = e(OverflowHint, { count: M.hiddenLines, hiddenChars: M.hiddenChars, expandable: !0 })),
      (f[7] = M.hiddenChars),
      (f[8] = M.hiddenLines),
      (f[9] = x));
  else x = f[9];
  let k;
  if (f[10] !== T || f[11] !== x)
    ((k = r(Box, { flexDirection: "column", children: [T, x] })), (f[10] = T), (f[11] = x), (f[12] = k));
  else k = f[12];
  return k;
}
/**
 * 把文本按宽度折行并截到最大行数，返回截断后的行与是否截断。
 */
//@ chunk-ah34pb7m.js:212929-213394 placement
function capTextToLines(m, d) {
  let max = Math.max(1e4, BS * d * 4 + 1),
    g = truncateToLength(m, max),
    f = g.length < m.length,
    parts = sanitizeDisplayText(g).split(`
`),
    T = [],
    x = BS,
    k = 0,
    b = f;
  for (let [L, N] of parts.entries()) {
    if (x === 0) {
      b = !0;
      break;
    }
    let W = truncateToLength(N, x * d * 4),
      parts_2 = wrapAnsi(W, d, { hard: !0, trim: !1 }).split(`
`);
    if (W.length < N.length || (f && L === parts.length - 1) || parts_2.length > x) {
      (T.push(parts_2.slice(0, x).join("")), (b = !0));
      break;
    }
    (T.push(N), k++, (x -= parts_2.length));
  }
  if (!b && k === parts.length) return null;
  let joined = T.join(`
`),
    B =
      countCharInString(
        m,
        `
`,
      ) + 1;
  return { shown: joined, hiddenLines: B - k, hiddenChars: m.length - joined.length };
}
//@ chunk-ah34pb7m.js:213394-213413 placement
var weakMap = new WeakMap();
/**
 * 判断代理消息在给定宽度下是否超过显示行数上限（按消息对象和宽度缓存）。
 */
//@ chunk-ah34pb7m.js:213413-213594 placement
function agentMessageOverflows(m, d, c, g) {
  if (Zno(c)) return !1;
  let f = weakMap.get(m);
  if (f !== void 0 && f.width === g) return f.overflows;
  let h = capTextToLines(stripAgentMessageWrapper(d), Math.max(1, g)) !== null;
  return (weakMap.set(m, { width: g, overflows: h }), h);
}
//@ chunk-ah34pb7m.js:213594-213703 placement
function dedentTwoSpaces(m) {
  let parts = m.split(`
`);
  return parts.every((c) => c.startsWith("  "))
    ? parts.map((c) => c.slice(2)).join(`
`)
    : m;
}
//@ chunk-ah34pb7m.js:213703-213707 placement
j();
/**
 * 读取某工具调用在后台完成后的结果状态（用于"结果稍后送达"）。
 */
//@ chunk-ah34pb7m.js:213707-214296 placement
function useDeferredToolResult(m) {
  let c = w(15),
    d = iP(),
    g;
  if (c[0] !== d) ((g = d ? kT.of(d) : null), (c[0] = d), (c[1] = g));
  else g = c[1];
  let f = g,
    toolUseID = m.toolUseID,
    M;
  if (c[2] !== toolUseID) ((M = (T) => T.get(toolUseID)), (c[2] = toolUseID), (c[3] = M));
  else M = c[3];
  let x = useStoreSelector(f, M),
    [k, b] = a5(x),
    E = b !== void 0 && b.status !== "running",
    B,
    L;
  if (c[4] !== f || c[5] !== E || c[6] !== toolUseID)
    ((B = () => {
      if (E) f?.paintedInPlace(toolUseID);
    }),
      (L = [f, toolUseID, E]),
      (c[4] = f),
      (c[5] = E),
      (c[6] = toolUseID),
      (c[7] = B),
      (c[8] = L));
  else ((B = c[7]), (L = c[8]));
  zt(B, L);
  let N;
  if (c[9] !== m || c[10] !== b)
    ((N = e(DeferredToolResultRow, { props: m, state: b })), (c[9] = m), (c[10] = b), (c[11] = N));
  else N = c[11];
  let W;
  if (c[12] !== k || c[13] !== N)
    ((W = e(Box, { ref: k, flexDirection: "column", children: N })), (c[12] = k), (c[13] = N), (c[14] = W));
  else W = c[14];
  return W;
}
/**
 * 渲染稍后送达的工具结果（成功/拒绝/错误三种行）。
 */
//@ chunk-ah34pb7m.js:214296-217098 placement
function DeferredToolResultRow(m) {
  let T = w(47),
    { props: props, state: state } = m,
    toolUseID = props.toolUseID,
    { Success: Success, Reject: Reject, Error: M } = props.rows;
  if (state === void 0) {
    let x;
    if (T[0] === MEMO_CACHE_SENTINEL)
      ((x = e(MessageResponse, {
        height: 1,
        children: e(Text, { dimColor: !0, children: "Result delivered later in the conversation" }),
      })),
        (T[0] = x));
    else x = T[0];
    return x;
  }
  if (state.status === "running") {
    return null;
  }
  let x;
  if (T[1] !== props.isTranscriptMode || T[2] !== state.detachedAt || T[3] !== state.settledAt)
    ((x = props.isTranscriptMode
      ? e(MessageResponse, {
          height: 1,
          children: r(Text, {
            dimColor: !0,
            children: [
              "Stepped aside for your message \xB7 finished",
              " ",
              formatDuration(state.settledAt - state.detachedAt),
              " later",
            ],
          }),
        })
      : null),
      (T[1] = props.isTranscriptMode),
      (T[2] = state.detachedAt),
      (T[3] = state.settledAt),
      (T[4] = x));
  else x = T[4];
  let k = x;
  if (state.status === "completed") {
    let b;
    if (T[5] !== props.message || T[6] !== state.data)
      ((b = { ...props.message, toolUseResult: state.data }),
        (T[5] = props.message),
        (T[6] = state.data),
        (T[7] = b));
    else b = T[7];
    let E;
    if (
      T[8] !== Success ||
      T[9] !== props.isTranscriptMode ||
      T[10] !== props.lookups ||
      T[11] !== props.progressMessagesForMessage ||
      T[12] !== props.style ||
      T[13] !== props.tool ||
      T[14] !== props.tools ||
      T[15] !== props.verbose ||
      T[16] !== props.width ||
      T[17] !== b ||
      T[18] !== toolUseID
    )
      ((E = e(Success, {
        message: b,
        lookups: props.lookups,
        toolUseID: toolUseID,
        progressMessagesForMessage: props.progressMessagesForMessage,
        style: props.style,
        tool: props.tool,
        tools: props.tools,
        verbose: props.verbose,
        width: props.width,
        isTranscriptMode: props.isTranscriptMode,
      })),
        (T[8] = Success),
        (T[9] = props.isTranscriptMode),
        (T[10] = props.lookups),
        (T[11] = props.progressMessagesForMessage),
        (T[12] = props.style),
        (T[13] = props.tool),
        (T[14] = props.tools),
        (T[15] = props.verbose),
        (T[16] = props.width),
        (T[17] = b),
        (T[18] = toolUseID),
        (T[19] = E));
    else E = T[19];
    let B;
    if (T[20] !== E || T[21] !== k)
      ((B = r(Fragment, { children: [E, k] })), (T[20] = E), (T[21] = k), (T[22] = B));
    else B = T[22];
    return B;
  }
  if (state.status === "stopped") {
    let b;
    if (
      T[23] !== Reject ||
      T[24] !== props.input ||
      T[25] !== props.isTranscriptMode ||
      T[26] !== props.progressMessagesForMessage ||
      T[27] !== props.style ||
      T[28] !== props.tool ||
      T[29] !== props.tools ||
      T[30] !== props.verbose
    )
      ((b = e(Reject, {
        input: props.input,
        progressMessagesForMessage: props.progressMessagesForMessage,
        isInterrupted: !0,
        tool: props.tool,
        tools: props.tools,
        style: props.style,
        verbose: props.verbose,
        isTranscriptMode: props.isTranscriptMode,
      })),
        (T[23] = Reject),
        (T[24] = props.input),
        (T[25] = props.isTranscriptMode),
        (T[26] = props.progressMessagesForMessage),
        (T[27] = props.style),
        (T[28] = props.tool),
        (T[29] = props.tools),
        (T[30] = props.verbose),
        (T[31] = b));
    else b = T[31];
    return b;
  }
  let b;
  if (T[32] !== props.param || T[33] !== state.text)
    ((b = { ...props.param, content: state.text, is_error: !0 }),
      (T[32] = props.param),
      (T[33] = state.text),
      (T[34] = b));
  else b = T[34];
  let E;
  if (
    T[35] !== M ||
    T[36] !== props.input ||
    T[37] !== props.isTranscriptMode ||
    T[38] !== props.progressMessagesForMessage ||
    T[39] !== props.tool ||
    T[40] !== props.tools ||
    T[41] !== props.verbose ||
    T[42] !== b
  )
    ((E = e(M, {
      progressMessagesForMessage: props.progressMessagesForMessage,
      tool: props.tool,
      tools: props.tools,
      param: b,
      input: props.input,
      output: void 0,
      toolDenialKind: void 0,
      verbose: props.verbose,
      isTranscriptMode: props.isTranscriptMode,
    })),
      (T[35] = M),
      (T[36] = props.input),
      (T[37] = props.isTranscriptMode),
      (T[38] = props.progressMessagesForMessage),
      (T[39] = props.tool),
      (T[40] = props.tools),
      (T[41] = props.verbose),
      (T[42] = b),
      (T[43] = E));
  else E = T[43];
  let B;
  if (T[44] !== E || T[45] !== k)
    ((B = r(Fragment, { children: [E, k] })), (T[44] = E), (T[45] = k), (T[46] = B));
  else B = T[46];
  return B;
}
//@ chunk-ah34pb7m.js:217098-217164 placement
function ph(m, d) {
  let c = readComputerFolderReplyTarget(m, d);
  return c !== void 0 && dce() ? c : void 0;
}
/**
 * 远程工具"等待文件夹信任"的拒绝提示行，文案取自 REMOTE_TOOLS_CONSENT_TEXT。
 */
//@ chunk-ah34pb7m.js:217164-217416 placement
function FolderWaitRefusalNotice(m) {
  let g = w(2),
    { refusal: refusal } = m;
  const c = REMOTE_TOOLS_CONSENT_TEXT[`repository_trust.folder_waits.${refusal}`];
  let f;
  if (g[0] !== c)
    ((f = e(MessageResponse, {
      children: r(Text, {
        dimColor: !0,
        wrap: "wrap",
        children: [c, " ", REMOTE_TOOLS_CONSENT_TEXT["repository_trust.folder_waits.marker"]],
      }),
    })),
      (g[0] = c),
      (g[1] = f));
  else f = g[1];
  return f;
}

export { agentMessageOverflows, AgentMessage, ph, useDeferredToolResult, FolderWaitRefusalNotice };
