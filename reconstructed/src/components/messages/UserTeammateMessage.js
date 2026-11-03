/**
 * components/messages/UserTeammateMessage.tsx
 *
 * 队友消息（<teammate-message>）解析与显示，含 task_completed/teammate_terminated。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserTeammateMessage.tsx
 * pieces: chunk-ah34pb7m.js (17), chunk-q7z2h94h.js (1)
 * attribution: placement 16, fingerprint 2
 */
import { j, Kc } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CtrlOToExpandHint } from "../CtrlOToExpand.js";
import { TEAMMATE_MESSAGE } from "../../constants/xml.js";
import { PEER_MESSAGE_SUFFIXES, PEER_MESSAGE_PREFIXES } from "../../utils/crossSessionMessages.js";
import { ove } from "../../utils/confusables.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState, Cr } from "../../state/AppState.js";
import {
  parseFrameForDisplay,
  ShutdownApprovedMessageSchema,
  capFrameFieldForDisplay,
  capIdFrameField,
  IDLE_ID_FIELD_RECEIVE_BOUND,
  UNKNOWN_SENDER,
  capRawFrameTextForDisplay,
  IdleNotificationMessageSchema,
  TaskCompletedMessageSchema,
  IDLE_SUMMARY_RECEIVE_BOUND,
} from "../../utils/teammateMailbox.js";
import { Wj } from "./transcriptModeContext.js";
import { toInkColor } from "../../utils/ink.js";
import { Box, Text } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Gr, TaskAssignmentMessage } from "./TaskAssignmentMessage.js";
import { TeammateResultMessage } from "./TeammateResultMessage.js";
import { a9 } from "../../utils/formatBriefTimestamp.js";
import { CollapsibleText } from "./CollapsedLines.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-ah34pb7m.js:88531-88535 placement
j();
//@ chunk-ah34pb7m.js:88535-88539 placement
j();
//@ chunk-ah34pb7m.js:88539-88581 placement
function EI(b) {
  return b.agentNameRegistry;
}
//@ chunk-ah34pb7m.js:88581-88739 placement
function renderTeammateMessageItem(L, N) {
  return L.kind === "panel"
    ? L.node
    : e(
        CtrlOToExpandHint,
        {
          displayName: L.senderName,
          qualifier: L.isUnverified ? UNVERIFIED : void 0,
          count: L.count,
          fallbackLabel: "teammate",
        },
        N,
      );
}
//@ chunk-ah34pb7m.js:88739-88759 placement
var UNVERIFIED = "unverified";
//@ chunk-ah34pb7m.js:88759-88795 placement
function ca(m) {
  return `${m} (${UNVERIFIED})`;
}
//@ chunk-ah34pb7m.js:88795-88813 placement
var Gp = `</${TEAMMATE_MESSAGE}>`;
/**
 * 从文本中解析 teammate-message 标签列表与剩余文本。
 */
//@ chunk-ah34pb7m.js:88813-89659 placement
function parseTeammateMessages(m) {
  for (let f of PEER_MESSAGE_SUFFIXES)
    if (m.endsWith(f)) {
      m = m.slice(0, -f.length);
      break;
    }
  for (let f of PEER_MESSAGE_PREFIXES)
    if (m.startsWith(f) && m.startsWith(`<${TEAMMATE_MESSAGE} `, f.length)) {
      m = m.slice(f.length);
      break;
    }
  let regExp = new RegExp(
      `<${TEAMMATE_MESSAGE}\\s+teammate_id="([^"]+)"(?:\\s+color="([^"]+)")?(?:\\s+summary="([^"]+)")?(?:\\s+verified="(false)")?>\\n?`,
      "y",
    ),
    c = [],
    g = 0;
  while (g < m.length) {
    regExp.lastIndex = g;
    let match = regExp.exec(m);
    if (!match) return { messages: c, unparsed: m.slice(g) };
    let h = g + match[0].length,
      M = -1,
      T = m.length;
    for (let index = m.indexOf(Gp, h); index !== -1; index = m.indexOf(Gp, index + 1)) {
      let b = index + Gp.length;
      while (b < m.length && /\s/.test(m.charAt(b))) b++;
      if (((regExp.lastIndex = b), b === m.length || regExp.test(m))) {
        ((M = index), (T = b));
        break;
      }
    }
    if (M === -1) M = m.length;
    let trimmed = m.slice(h, M).trim();
    (c.push({
      teammateId: ove(match[1] ?? ""),
      color: match[2] ? ove(match[2]) : void 0,
      summary: match[3] ? ove(match[3]) : void 0,
      content: trimmed,
      ...(match[4] === "false" && { isVerified: !1 }),
    }),
      (g = T));
  }
  return { messages: c, unparsed: "" };
}
/**
 * 收集进程内队友的显示颜色。
 */
//@ chunk-ah34pb7m.js:89659-90115 placement
function useTeammateColors() {
  let c = w(7),
    m = useAppState(EI),
    d = Cr(),
    g;
  if (c[0] !== m || c[1] !== d) {
    g = new Map();
    let f;
    if (c[3] !== d) ((f = Object.values(d.getState().tasks)), (c[3] = d), (c[4] = f));
    else f = c[4];
    for (const h of f) {
      if (h.type === "in_process_teammate") g.set(h.id, h.identity.agentName);
      else if (h.type === "local_agent") g.set(h.id, h.agentType);
    }
    for (const [M, T] of m) g.set(T, M);
    ((c[0] = m), (c[1] = d), (c[2] = g));
  } else g = c[2];
  let x = g,
    f;
  if (c[5] !== x) ((f = (k) => (k === "leader" ? "leader" : (x.get(k) ?? k))), (c[5] = x), (c[6] = f));
  else f = c[6];
  return f;
}
/**
 * 合并相邻的同名队友消息为计数项（panel 项保留不合并）。
 */
//@ chunk-ah34pb7m.js:90115-90405 placement
function coalesceTeammateMessages(m) {
  let d = [];
  for (let c of m) {
    if (c.kind === "panel") {
      d.push(c);
      continue;
    }
    let at = d.at(-1);
    if (at && at.kind === "coalesced" && at.displayName === c.displayName) at.count++;
    else
      d.push({
        kind: "coalesced",
        displayName: c.displayName,
        senderName: c.senderName,
        isUnverified: c.isUnverified,
        count: 1,
      });
  }
  return d;
}
//@ chunk-ah34pb7m.js:90405-90545 placement
function filterDisplayableTeammateMessages(m) {
  return m.filter((d) => {
    if (d.summary?.trim()) return !0;
    if (d.isVerified === !1) return !0;
    if (parseFrameForDisplay(ShutdownApprovedMessageSchema(), d.content)) return !1;
    return !0;
  });
}
//@ chunk-ah34pb7m.js:90545-90628 placement
function aR(m) {
  let { messages: messages, unparsed: unparsed } = parseTeammateMessages(m);
  return filterDisplayableTeammateMessages(messages).length === 0 && !unparsed.trim();
}
//@ chunk-ah34pb7m.js:90628-90707 placement
function jb(m, d) {
  if (d) return m;
  let c = capFrameFieldForDisplay(m);
  return c === m.trim() ? c : `${c}\u2026`;
}
/**
 * 渲染用户回合中的队友消息。
 */
//@ chunk-ah34pb7m.js:90707-91432 placement
function UserTeammateMessage(m) {
  let d = w(12),
    c,
    g;
  if (d[0] !== m.param.text) {
    let { messages: messages, unparsed: unparsed } = parseTeammateMessages(m.param.text);
    c = filterDisplayableTeammateMessages(messages);
    g = unparsed.trim();
    ((d[0] = m.param.text), (d[1] = c), (d[2] = g));
  } else ((c = d[1]), (g = d[2]));
  let M = g;
  if (c.length === 0 && !M) {
    return null;
  }
  let T;
  if (
    d[3] !== c ||
    d[4] !== m.addMargin ||
    d[5] !== m.followsSpeakerLabel ||
    d[6] !== m.isTranscriptMode ||
    d[7] !== m.messageId ||
    d[8] !== m.origin ||
    d[9] !== m.verbose ||
    d[10] !== M
  )
    ((T = e(TeammateMessageList, {
      addMargin: m.addMargin,
      verbose: m.verbose,
      isTranscriptMode: m.isTranscriptMode,
      messageId: m.messageId,
      origin: m.origin,
      followsSpeakerLabel: m.followsSpeakerLabel,
      messages: c,
      unparsedTrimmed: M,
    })),
      (d[3] = c),
      (d[4] = m.addMargin),
      (d[5] = m.followsSpeakerLabel),
      (d[6] = m.isTranscriptMode),
      (d[7] = m.messageId),
      (d[8] = m.origin),
      (d[9] = m.verbose),
      (d[10] = M),
      (d[11] = T));
  else T = d[11];
  return T;
}
/**
 * 队友消息列表（标签视图、展开）。
 */
//@ chunk-ah34pb7m.js:91432-93961 placement
function TeammateMessageList(m) {
  let L = w(30),
    {
      addMargin: addMargin,
      verbose: verbose,
      isTranscriptMode: isTranscriptMode,
      messageId: messageId,
      origin: origin,
      followsSpeakerLabel: followsSpeakerLabel,
      messages: messages,
      unparsedTrimmed: unparsedTrimmed,
    } = m,
    k = followsSpeakerLabel === void 0 ? !1 : followsSpeakerLabel,
    b = useTeammateColors(),
    E = Wj(verbose, isTranscriptMode),
    B = E || k,
    N,
    W,
    U,
    K;
  if (L[0] !== b || L[1] !== k || L[2] !== messages || L[3] !== E || L[4] !== unparsedTrimmed) {
    let V;
    if (L[9] !== b)
      ((V = (Y) => capIdFrameField(b(Y.teammateId), IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER),
        (L[9] = b),
        (L[10] = V));
    else V = L[10];
    let mapped = messages.map(V);
    let mapped_2 = messages.map((z, ee) => {
      let le = mapped[ee] ?? UNKNOWN_SENDER;
      return z.isVerified === !1 ? ca(le) : le;
    });
    let ae;
    if (L[11] !== E) ((ae = (pe) => (pe.summary ? jb(pe.summary, E) : "")), (L[11] = E), (L[12] = ae));
    else ae = L[12];
    let mapped_3 = messages.map(ae);
    N = messages
      .map((de, ue) =>
        [
          mapped_3[ue]?.trim() ? mapped_3[ue] : "",
          capRawFrameTextForDisplay(de.content, de.teammateId),
        ].filter(Boolean).join(`
`),
      )
      .concat(unparsedTrimmed)
      .filter(Boolean).join(`

`);
    let [J] = mapped_2;
    U = J !== void 0 && mapped_2.every((se) => se === J) ? J : void 0;
    W = messages.map((ye, Te) => {
      let Me = toInkColor(ye.color);
      let be = mapped_2[Te] ?? UNKNOWN_SENDER;
      let ve = mapped_3[Te] ?? "";
      let Ue = ve.trim()
        ? r(Box, {
            children: [
              r(Text, {
                color: Me,
                children: ["@ ", be, e(Text, { "aria-hidden": !0, children: re.pointer })],
              }),
              r(Text, { children: [" ", ve] }),
            ],
          })
        : null;
      let we = ye.isVerified === !1 ? null : Gr(ye.content, be);
      if (we) {
        return { kind: "panel", node: r(Kc, { children: [Ue, we] }, Te) };
      }
      let $e =
        ye.isVerified === !1 ? null : parseFrameForDisplay(IdleNotificationMessageSchema(), ye.content);
      if ($e && !ye.summary) {
        return {
          kind: "panel",
          node: e(
            TeammateResultMessage,
            {
              displayName: be,
              inkColor: Me,
              idleReason: $e.idleReason,
              failureReason: $e.failureReason,
              summary: $e.summary,
              completedTaskId: $e.completedTaskId,
              result: $e.result,
              expanded: E,
            },
            Te,
          ),
        };
      }
      let De = ye.isVerified === !1 ? null : parseFrameForDisplay(TaskCompletedMessageSchema(), ye.content);
      if (De) {
        let xe = capIdFrameField(De.taskId, IDLE_ID_FIELD_RECEIVE_BOUND);
        let Pe = De.taskSubject ? capIdFrameField(De.taskSubject, IDLE_SUMMARY_RECEIVE_BOUND) : "";
        return {
          kind: "panel",
          node: e(
            TaskAssignmentMessage,
            { displayName: be, inkColor: Me, summary: ve, taskId: xe, taskSubject: Pe },
            Te,
          ),
        };
      }
      return {
        kind: "text",
        displayName: be,
        senderName: mapped[Te] ?? UNKNOWN_SENDER,
        isUnverified: ye.isVerified === !1,
        inkColor: Me,
        content: capRawFrameTextForDisplay(ye.content, ye.teammateId),
        summary: k ? ve : ye.summary,
      };
    });
    K = W.length === 1 && W[0]?.kind === "text" && !unparsedTrimmed && !mapped_3[0]?.trim();
    ((L[0] = b),
      (L[1] = k),
      (L[2] = messages),
      (L[3] = E),
      (L[4] = unparsedTrimmed),
      (L[5] = N),
      (L[6] = W),
      (L[7] = U),
      (L[8] = K));
  } else ((N = L[5]), (W = L[6]), (U = L[7]), (K = L[8]));
  let co = K,
    V;
  if (L[13] !== U) ((V = U !== void 0 && { sender: { name: U } }), (L[13] = U), (L[14] = V));
  else V = L[14];
  let ae;
  if (
    L[15] !== addMargin ||
    L[16] !== N ||
    L[17] !== B ||
    L[18] !== co ||
    L[19] !== W ||
    L[20] !== k ||
    L[21] !== unparsedTrimmed
  )
    ((ae = (qe) =>
      e(TeammateMessageItems, {
        items: qe !== N && co ? W.map((Ke) => (Ke.kind === "text" ? { ...Ke, content: qe } : Ke)) : W,
        unparsedTrimmed: qe !== N && W.length === 0 ? qe : unparsedTrimmed,
        expanded: B,
        labelView: k,
        addMargin: addMargin && !k,
      })),
      (L[15] = addMargin),
      (L[16] = N),
      (L[17] = B),
      (L[18] = co),
      (L[19] = W),
      (L[20] = k),
      (L[21] = unparsedTrimmed),
      (L[22] = ae));
  else ae = L[22];
  let Ro;
  if (L[23] !== N || L[24] !== B || L[25] !== messageId || L[26] !== origin || L[27] !== V || L[28] !== ae)
    ((Ro = { messageId: messageId, stored: origin, text: N, isExpanded: B, ...V, draw: ae }),
      (L[23] = N),
      (L[24] = B),
      (L[25] = messageId),
      (L[26] = origin),
      (L[27] = V),
      (L[28] = ae),
      (L[29] = Ro));
  else Ro = L[29];
  return a9.useUserMessageSite(Ro);
}
/**
 * 队友消息条目渲染。
 */
//@ chunk-ah34pb7m.js:93961-94605 placement
function TeammateMessageItems(m) {
  let T = w(11),
    {
      items: items,
      unparsedTrimmed: unparsedTrimmed,
      expanded: expanded,
      labelView: labelView,
      addMargin: addMargin,
    } = m;
  const M = addMargin ? 1 : 0;
  let x;
  if (T[0] !== expanded || T[1] !== items || T[2] !== labelView)
    ((x = expanded
      ? items.map((k, b) =>
          k.kind === "panel"
            ? k.node
            : e(
                TeammateMessageContent,
                {
                  displayName: k.displayName,
                  inkColor: k.inkColor,
                  content: k.content,
                  summary: k.summary,
                  labelView: labelView,
                  headerless: labelView && b === 0,
                },
                b,
              ),
        )
      : coalesceTeammateMessages(items).map(renderTeammateMessageItem)),
      (T[0] = expanded),
      (T[1] = items),
      (T[2] = labelView),
      (T[3] = x));
  else x = T[3];
  let E;
  if (T[4] !== labelView || T[5] !== unparsedTrimmed)
    ((E =
      unparsedTrimmed &&
      (labelView
        ? e(CollapsibleText, { text: unparsedTrimmed })
        : e(Box, { children: e(Text, { children: unparsedTrimmed }) }))),
      (T[4] = labelView),
      (T[5] = unparsedTrimmed),
      (T[6] = E));
  else E = T[6];
  let B;
  if (T[7] !== M || T[8] !== x || T[9] !== E)
    ((B = r(Box, { flexDirection: "column", marginTop: M, width: "100%", children: [x, E] })),
      (T[7] = M),
      (T[8] = x),
      (T[9] = E),
      (T[10] = B));
  else B = T[10];
  return B;
}
//@ chunk-ah34pb7m.js:94605-95673 fingerprint = TeammateMessageContent (0.583)
function TeammateMessageContent(t0) {
  let $ = w(23),
    {
      displayName: displayName,
      inkColor: inkColor,
      content: content,
      summary: summary,
      labelView: labelView,
      headerless: headerless,
    } = t0,
    T = labelView === void 0 ? !1 : labelView,
    x = headerless === void 0 ? !1 : headerless,
    b;
  if ($[0] !== content || $[1] !== T)
    ((b = T
      ? e(CollapsibleText, { text: content })
      : e(MarkdownText_2, { stripPromptTags: !1, children: content })),
      ($[0] = content),
      ($[1] = T),
      ($[2] = b));
  else b = $[2];
  let E = b;
  if (x) {
    let B;
    if ($[3] !== summary) ((B = summary && e(Text, { children: summary })), ($[3] = summary), ($[4] = B));
    else B = $[4];
    const L = content && E;
    let N;
    if ($[5] !== B || $[6] !== L)
      ((N = r(Box, { flexDirection: "column", paddingLeft: 2, children: [B, L] })),
        ($[5] = B),
        ($[6] = L),
        ($[7] = N));
    else N = $[7];
    return N;
  }
  let B;
  if ($[8] === MEMO_CACHE_SENTINEL) ((B = e(Text, { "aria-hidden": !0, children: re.pointer })), ($[8] = B));
  else B = $[8];
  let L;
  if ($[9] !== displayName || $[10] !== inkColor)
    ((L = r(Text, { color: inkColor, children: ["@ ", displayName, B] })),
      ($[9] = displayName),
      ($[10] = inkColor),
      ($[11] = L));
  else L = $[11];
  let N;
  if ($[12] !== summary)
    ((N = summary && r(Text, { children: [" ", summary] })), ($[12] = summary), ($[13] = N));
  else N = $[13];
  let W;
  if ($[14] !== L || $[15] !== N) ((W = r(Box, { children: [L, N] })), ($[14] = L), ($[15] = N), ($[16] = W));
  else W = $[16];
  let U;
  if ($[17] !== E || $[18] !== content)
    ((U = content && e(Box, { paddingLeft: 2, children: E })), ($[17] = E), ($[18] = content), ($[19] = U));
  else U = $[19];
  let K;
  if ($[20] !== W || $[21] !== U)
    ((K = r(Box, { flexDirection: "column", marginTop: 1, children: [W, U] })),
      ($[20] = W),
      ($[21] = U),
      ($[22] = K));
  else K = $[22];
  return K;
}
//@ chunk-q7z2h94h.js:1585-1737 fingerprint = parseTeammateMessages (0.361)
var parseTeammateMessages_2 = (text) => ({
  started: ({ agentId: agentId, model: model, teammateId: teammateId }) =>
    text.done({ model: model, agentId: agentId, ...(teammateId !== void 0 && { teammateId: teammateId }) }),
  [Symbol.dispose]: text[Symbol.dispose],
});

export {
  aR,
  UserTeammateMessage,
  TeammateMessageContent,
  UNVERIFIED,
  ca,
  coalesceTeammateMessages,
  parseTeammateMessages_2,
};
