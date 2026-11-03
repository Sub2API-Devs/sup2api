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
import { init_react_production, Kc } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CtrlOToExpandHint } from "../CtrlOToExpand.js";
import { TEAMMATE_MESSAGE } from "../../constants/xml.js";
import { PEER_MESSAGE_SUFFIXES, PEER_MESSAGE_PREFIXES } from "../../utils/crossSessionMessages.js";
import { unescapeBasicHtmlEntities } from "../../utils/confusables.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState, useAppStoreDirect } from "../../state/AppState.js";
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
import { resolveTranscriptMode } from "./transcriptModeContext.js";
import { toInkColor } from "../../utils/ink.js";
import { Box, Text } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { renderTaskRelatedMessage, TaskAssignmentMessage } from "./TaskAssignmentMessage.js";
import { TeammateResultMessage } from "./TeammateResultMessage.js";
import { BriefTimestampNamespace } from "../../utils/formatBriefTimestamp.js";
import { CollapsibleText } from "./CollapsedLines.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-ah34pb7m.js:88531-88535 placement
init_react_production();
//@ chunk-ah34pb7m.js:88535-88539 placement
init_react_production();
//@ chunk-ah34pb7m.js:88539-88581 placement
function selectAgentNameRegistry(b) {
  return b.agentNameRegistry;
}
//@ chunk-ah34pb7m.js:88581-88739 placement
function renderTeammateMessageItem(L, N) {
  return L.kind === "panel"
    ? L.node
    : jsxProd_default(
        CtrlOToExpandHint,
        {
          displayName: L.senderName,
          qualifier: L.isUnverified ? UNVERIFIED : undefined,
          count: L.count,
          fallbackLabel: "teammate",
        },
        N,
      );
}
//@ chunk-ah34pb7m.js:88739-88759 placement
var UNVERIFIED = "unverified";
//@ chunk-ah34pb7m.js:88759-88795 placement
function unverifiedSenderLabel(m) {
  return `${m} (${UNVERIFIED})`;
}
//@ chunk-ah34pb7m.js:88795-88813 placement
var TEAMMATE_MESSAGE_CLOSE_TAG = `</${TEAMMATE_MESSAGE}>`;
//@ chunk-ah34pb7m.js:88813-89659 placement
/**
 * 从文本中解析 teammate-message 标签列表与剩余文本。
 */
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
  );
  let c = [];
  let g = 0;
  while (g < m.length) {
    regExp.lastIndex = g;
    let match = regExp.exec(m);
    if (!match)
      return {
        messages: c,
        unparsed: m.slice(g),
      };
    let h = g + match[0].length;
    let M = -1;
    let T = m.length;
    for (
      let index = m.indexOf(TEAMMATE_MESSAGE_CLOSE_TAG, h);
      index !== -1;
      index = m.indexOf(TEAMMATE_MESSAGE_CLOSE_TAG, index + 1)
    ) {
      let b = index + TEAMMATE_MESSAGE_CLOSE_TAG.length;
      while (b < m.length && /\s/.test(m.charAt(b))) b++;
      regExp.lastIndex = b;
      if (b === m.length || regExp.test(m)) {
        M = index;
        T = b;
        break;
      }
    }
    if (M === -1) M = m.length;
    let content = m.slice(h, M).trim();
    c.push({
      teammateId: unescapeBasicHtmlEntities(match[1] ?? ""),
      color: match[2] ? unescapeBasicHtmlEntities(match[2]) : undefined,
      summary: match[3] ? unescapeBasicHtmlEntities(match[3]) : undefined,
      content,
      ...(match[4] === "false" && {
        isVerified: false,
      }),
    });
    g = T;
  }
  return {
    messages: c,
    unparsed: "",
  };
}
//@ chunk-ah34pb7m.js:89659-90115 placement
/**
 * 收集进程内队友的显示颜色。
 */
function useTeammateColors() {
  let c = w(7);
  let appState = useAppState(selectAgentNameRegistry);
  let appStoreDirect = useAppStoreDirect();
  let g;
  if (c[0] !== appState || c[1] !== appStoreDirect) {
    g = new Map();
    let f;
    if (c[3] !== appStoreDirect) {
      f = Object.values(appStoreDirect.getState().tasks);
      c[3] = appStoreDirect;
      c[4] = f;
    } else f = c[4];
    for (const h of f) {
      if (h.type === "in_process_teammate") g.set(h.id, h.identity.agentName);
      else if (h.type === "local_agent") g.set(h.id, h.agentType);
    }
    for (const [M, T] of appState) g.set(T, M);
    c[0] = appState;
    c[1] = appStoreDirect;
    c[2] = g;
  } else g = c[2];
  let x = g;
  let f;
  if (c[5] !== x) {
    f = (k) => (k === "leader" ? "leader" : (x.get(k) ?? k));
    c[5] = x;
    c[6] = f;
  } else f = c[6];
  return f;
}
//@ chunk-ah34pb7m.js:90115-90405 placement
/**
 * 合并相邻的同名队友消息为计数项（panel 项保留不合并）。
 */
function coalesceTeammateMessages(m) {
  let d = [];
  for (let c of m) {
    if (c.kind === "panel") {
      d.push(c);
      continue;
    }
    let last = d.at(-1);
    if (last && last.kind === "coalesced" && last.displayName === c.displayName) last.count++;
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
function filterDisplayableTeammateMessages(messages) {
  return messages.filter((d) => {
    if (d.summary?.trim()) return true;
    if (d.isVerified === false) return true;
    if (parseFrameForDisplay(ShutdownApprovedMessageSchema(), d.content)) return false;
    return true;
  });
}
//@ chunk-ah34pb7m.js:90545-90628 placement
function hasNoDisplayableTeammateMessage(m) {
  let { messages, unparsed } = parseTeammateMessages(m);
  return filterDisplayableTeammateMessages(messages).length === 0 && !unparsed.trim();
}
//@ chunk-ah34pb7m.js:90628-90707 placement
function capTeammateText(summary, transcriptMode) {
  if (transcriptMode) return summary;
  let c = capFrameFieldForDisplay(summary);
  return c === summary.trim() ? c : `${c}\u2026`;
}
//@ chunk-ah34pb7m.js:90707-91432 placement
/**
 * 渲染用户回合中的队友消息。
 */
function UserTeammateMessage(m) {
  let d = w(12);
  let c;
  let g;
  if (d[0] !== m.param.text) {
    let { messages, unparsed } = parseTeammateMessages(m.param.text);
    c = filterDisplayableTeammateMessages(messages);
    g = unparsed.trim();
    d[0] = m.param.text;
    d[1] = c;
    d[2] = g;
  } else {
    c = d[1];
    g = d[2];
  }
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
  ) {
    T = jsxProd_default(TeammateMessageList, {
      addMargin: m.addMargin,
      verbose: m.verbose,
      isTranscriptMode: m.isTranscriptMode,
      messageId: m.messageId,
      origin: m.origin,
      followsSpeakerLabel: m.followsSpeakerLabel,
      messages: c,
      unparsedTrimmed: M,
    });
    d[3] = c;
    d[4] = m.addMargin;
    d[5] = m.followsSpeakerLabel;
    d[6] = m.isTranscriptMode;
    d[7] = m.messageId;
    d[8] = m.origin;
    d[9] = m.verbose;
    d[10] = M;
    d[11] = T;
  } else T = d[11];
  return T;
}
//@ chunk-ah34pb7m.js:91432-93961 placement
/**
 * 队友消息列表（标签视图、展开）。
 */
function TeammateMessageList(props) {
  let L = w(30);
  let {
    addMargin,
    verbose,
    isTranscriptMode,
    messageId,
    origin,
    followsSpeakerLabel,
    messages,
    unparsedTrimmed,
  } = props;
  let k = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let teammateColors = useTeammateColors();
  let transcriptMode = resolveTranscriptMode(verbose, isTranscriptMode);
  let B = transcriptMode || k;
  let N;
  let W;
  let U;
  let K;
  if (
    L[0] !== teammateColors ||
    L[1] !== k ||
    L[2] !== messages ||
    L[3] !== transcriptMode ||
    L[4] !== unparsedTrimmed
  ) {
    let V;
    if (L[9] !== teammateColors) {
      V = (Y) => capIdFrameField(teammateColors(Y.teammateId), IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER;
      L[9] = teammateColors;
      L[10] = V;
    } else V = L[10];
    let mapped = messages.map(V);
    let mapped_2 = messages.map((message, ee) => {
      let le = mapped[ee] ?? UNKNOWN_SENDER;
      return message.isVerified === false ? unverifiedSenderLabel(le) : le;
    });
    let ae;
    if (L[11] !== transcriptMode) {
      ae = (pe) => (pe.summary ? capTeammateText(pe.summary, transcriptMode) : "");
      L[11] = transcriptMode;
      L[12] = ae;
    } else ae = L[12];
    let mapped_3 = messages.map(ae);
    N = messages
      .map((message, ue) =>
        [
          mapped_3[ue]?.trim() ? mapped_3[ue] : "",
          capRawFrameTextForDisplay(message.content, message.teammateId),
        ].filter(Boolean).join(`
`),
      )
      .concat(unparsedTrimmed)
      .filter(Boolean).join(`

`);
    let [J] = mapped_2;
    U = J !== undefined && mapped_2.every((se) => se === J) ? J : undefined;
    W = messages.map((message, Te) => {
      let inkColor = toInkColor(message.color);
      let be = mapped_2[Te] ?? UNKNOWN_SENDER;
      let ve = mapped_3[Te] ?? "";
      let Ue = ve.trim()
        ? jsxProd_default_2(Box, {
            children: [
              jsxProd_default_2(Text, {
                color: inkColor,
                children: [
                  "@ ",
                  be,
                  jsxProd_default(Text, {
                    "aria-hidden": true,
                    children: figures_default.pointer,
                  }),
                ],
              }),
              jsxProd_default_2(Text, {
                children: [" ", ve],
              }),
            ],
          })
        : null;
      let we = message.isVerified === false ? null : renderTaskRelatedMessage(message.content, be);
      if (we) {
        return {
          kind: "panel",
          node: jsxProd_default_2(
            Kc,
            {
              children: [Ue, we],
            },
            Te,
          ),
        };
      }
      let $e =
        message.isVerified === false
          ? null
          : parseFrameForDisplay(IdleNotificationMessageSchema(), message.content);
      if ($e && !message.summary) {
        return {
          kind: "panel",
          node: jsxProd_default(
            TeammateResultMessage,
            {
              displayName: be,
              inkColor,
              idleReason: $e.idleReason,
              failureReason: $e.failureReason,
              summary: $e.summary,
              completedTaskId: $e.completedTaskId,
              result: $e.result,
              expanded: transcriptMode,
            },
            Te,
          ),
        };
      }
      let De =
        message.isVerified === false
          ? null
          : parseFrameForDisplay(TaskCompletedMessageSchema(), message.content);
      if (De) {
        let taskId = capIdFrameField(De.taskId, IDLE_ID_FIELD_RECEIVE_BOUND);
        let taskSubject = De.taskSubject ? capIdFrameField(De.taskSubject, IDLE_SUMMARY_RECEIVE_BOUND) : "";
        return {
          kind: "panel",
          node: jsxProd_default(
            TaskAssignmentMessage,
            {
              displayName: be,
              inkColor,
              summary: ve,
              taskId,
              taskSubject,
            },
            Te,
          ),
        };
      }
      return {
        kind: "text",
        displayName: be,
        senderName: mapped[Te] ?? UNKNOWN_SENDER,
        isUnverified: message.isVerified === false,
        inkColor,
        content: capRawFrameTextForDisplay(message.content, message.teammateId),
        summary: k ? ve : message.summary,
      };
    });
    K = W.length === 1 && W[0]?.kind === "text" && !unparsedTrimmed && !mapped_3[0]?.trim();
    L[0] = teammateColors;
    L[1] = k;
    L[2] = messages;
    L[3] = transcriptMode;
    L[4] = unparsedTrimmed;
    L[5] = N;
    L[6] = W;
    L[7] = U;
    L[8] = K;
  } else {
    N = L[5];
    W = L[6];
    U = L[7];
    K = L[8];
  }
  let co = K;
  let V;
  if (L[13] !== U) {
    V = U !== undefined && {
      sender: {
        name: U,
      },
    };
    L[13] = U;
    L[14] = V;
  } else V = L[14];
  let draw;
  if (
    L[15] !== addMargin ||
    L[16] !== N ||
    L[17] !== B ||
    L[18] !== co ||
    L[19] !== W ||
    L[20] !== k ||
    L[21] !== unparsedTrimmed
  ) {
    draw = (qe) =>
      jsxProd_default(TeammateMessageItems, {
        items:
          qe !== N && co
            ? W.map((Ke) =>
                Ke.kind === "text"
                  ? {
                      ...Ke,
                      content: qe,
                    }
                  : Ke,
              )
            : W,
        unparsedTrimmed: qe !== N && W.length === 0 ? qe : unparsedTrimmed,
        expanded: B,
        labelView: k,
        addMargin: addMargin && !k,
      });
    L[15] = addMargin;
    L[16] = N;
    L[17] = B;
    L[18] = co;
    L[19] = W;
    L[20] = k;
    L[21] = unparsedTrimmed;
    L[22] = draw;
  } else draw = L[22];
  let Ro;
  if (
    L[23] !== N ||
    L[24] !== B ||
    L[25] !== messageId ||
    L[26] !== origin ||
    L[27] !== V ||
    L[28] !== draw
  ) {
    Ro = {
      messageId,
      stored: origin,
      text: N,
      isExpanded: B,
      ...V,
      draw,
    };
    L[23] = N;
    L[24] = B;
    L[25] = messageId;
    L[26] = origin;
    L[27] = V;
    L[28] = draw;
    L[29] = Ro;
  } else Ro = L[29];
  return BriefTimestampNamespace.useUserMessageSite(Ro);
}
//@ chunk-ah34pb7m.js:93961-94605 placement
/**
 * 队友消息条目渲染。
 */
function TeammateMessageItems(props) {
  let T = w(11);
  let { items, unparsedTrimmed, expanded, labelView, addMargin } = props;
  const marginTop = addMargin ? 1 : 0;
  let x;
  if (T[0] !== expanded || T[1] !== items || T[2] !== labelView) {
    x = expanded
      ? items.map((item, b) =>
          item.kind === "panel"
            ? item.node
            : jsxProd_default(
                TeammateMessageContent,
                {
                  displayName: item.displayName,
                  inkColor: item.inkColor,
                  content: item.content,
                  summary: item.summary,
                  labelView,
                  headerless: labelView && b === 0,
                },
                b,
              ),
        )
      : coalesceTeammateMessages(items).map(renderTeammateMessageItem);
    T[0] = expanded;
    T[1] = items;
    T[2] = labelView;
    T[3] = x;
  } else x = T[3];
  let E;
  if (T[4] !== labelView || T[5] !== unparsedTrimmed) {
    E =
      unparsedTrimmed &&
      (labelView
        ? jsxProd_default(CollapsibleText, {
            text: unparsedTrimmed,
          })
        : jsxProd_default(Box, {
            children: jsxProd_default(Text, {
              children: unparsedTrimmed,
            }),
          }));
    T[4] = labelView;
    T[5] = unparsedTrimmed;
    T[6] = E;
  } else E = T[6];
  let B;
  if (T[7] !== marginTop || T[8] !== x || T[9] !== E) {
    B = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      width: "100%",
      children: [x, E],
    });
    T[7] = marginTop;
    T[8] = x;
    T[9] = E;
    T[10] = B;
  } else B = T[10];
  return B;
}
//@ chunk-ah34pb7m.js:94605-95673 fingerprint = TeammateMessageContent (0.583)
function TeammateMessageContent(props) {
  let $ = w(23);
  let { displayName, inkColor, content, summary, labelView, headerless } = props;
  let T = labelView === undefined ? false : labelView;
  let x = headerless === undefined ? false : headerless;
  let b;
  if ($[0] !== content || $[1] !== T) {
    b = T
      ? jsxProd_default(CollapsibleText, {
          text: content,
        })
      : jsxProd_default(MarkdownText_2, {
          stripPromptTags: false,
          children: content,
        });
    $[0] = content;
    $[1] = T;
    $[2] = b;
  } else b = $[2];
  let E = b;
  if (x) {
    let B;
    if ($[3] !== summary) {
      B =
        summary &&
        jsxProd_default(Text, {
          children: summary,
        });
      $[3] = summary;
      $[4] = B;
    } else B = $[4];
    const L = content && E;
    let N;
    if ($[5] !== B || $[6] !== L) {
      N = jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingLeft: 2,
        children: [B, L],
      });
      $[5] = B;
      $[6] = L;
      $[7] = N;
    } else N = $[7];
    return N;
  }
  let B;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    B = jsxProd_default(Text, {
      "aria-hidden": true,
      children: figures_default.pointer,
    });
    $[8] = B;
  } else B = $[8];
  let L;
  if ($[9] !== displayName || $[10] !== inkColor) {
    L = jsxProd_default_2(Text, {
      color: inkColor,
      children: ["@ ", displayName, B],
    });
    $[9] = displayName;
    $[10] = inkColor;
    $[11] = L;
  } else L = $[11];
  let N;
  if ($[12] !== summary) {
    N =
      summary &&
      jsxProd_default_2(Text, {
        children: [" ", summary],
      });
    $[12] = summary;
    $[13] = N;
  } else N = $[13];
  let W;
  if ($[14] !== L || $[15] !== N) {
    W = jsxProd_default_2(Box, {
      children: [L, N],
    });
    $[14] = L;
    $[15] = N;
    $[16] = W;
  } else W = $[16];
  let U;
  if ($[17] !== E || $[18] !== content) {
    U =
      content &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: E,
      });
    $[17] = E;
    $[18] = content;
    $[19] = U;
  } else U = $[19];
  let t6;
  if ($[20] !== W || $[21] !== U) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [W, U],
    });
    $[20] = W;
    $[21] = U;
    $[22] = t6;
  } else t6 = $[22];
  return t6;
}
//@ chunk-q7z2h94h.js:1585-1737 fingerprint = parseTeammateMessages (0.361)
var parseTeammateMessages_2 = (text) => ({
  started: ({ agentId, model, teammateId }) =>
    text.done({
      model,
      agentId,
      ...(teammateId !== undefined && {
        teammateId,
      }),
    }),
  [Symbol.dispose]: text[Symbol.dispose],
});
export {
  unverifiedSenderLabel,
  coalesceTeammateMessages,
  hasNoDisplayableTeammateMessage,
  UserTeammateMessage,
  TeammateMessageContent,
  UNVERIFIED,
  parseTeammateMessages_2,
};
