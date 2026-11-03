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
import { init_react_production, zt } from "../../../vendor/react/cjs/react.production.js";
import { clipTeammateText } from "../../utils/swarm/teammateIds.js";
import {
  PEER_MESSAGE_PREFIXES,
  PEER_MESSAGE_SUFFIXES,
  DESCENDANT_MESSAGE_SUFFIXES,
} from "../../utils/crossSessionMessages.js";
import { regExp_3 } from "../../utils/messages.js";
import { HANDBACK_REPORT_HEADER } from "../../tools/AgentTool/handbackReport.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { resolveTranscriptMode } from "./transcriptModeContext.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { isPeerHandbackOrFlagged } from "../../utils/messageProvenance.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BriefTimestampNamespace } from "../../utils/formatBriefTimestamp.js";
import { CollapsibleText } from "./CollapsedLines.js";
import { CtrlOToExpandHint, OverflowHint } from "../CtrlOToExpand.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { truncateToLength, countCharInString } from "../../utils/stringUtils.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { useSessionOrUndefined } from "../../context/session.js";
import { detachedCallSlots } from "../../services/tools/detachedToolCalls.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useFrozenValue } from "../FreezeWhenOffscreen.js";
import { MessageResponse } from "../MessageResponse.js";
import { formatDuration } from "../../utils/format.js";
import { readComputerFolderReplyTarget } from "../../remote/tools/toolHostsNotice.js";
import { isRepositoryTrustGateEnabled } from "../../utils/teleport/repositoryTrustGate.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";

//@ chunk-ah34pb7m.js:209574-209578 placement
init_react_production();
//@ chunk-ah34pb7m.js:209578-209612 placement
function selectVerbose(te) {
  return te.verbose;
}
//@ chunk-ah34pb7m.js:209612-209643 placement
var AGENT_MESSAGE_CLOSE_TAG = "</agent-message>";
var DEFAULT_CAP_LINES = 5;
//@ chunk-ah34pb7m.js:209643-209680 placement
function senderLabelOrAgent(fromName) {
  return clipTeammateText(fromName) || "agent";
}
//@ chunk-ah34pb7m.js:209680-210044 placement
/**
 * 去掉代理消息的前缀与结尾标签，得到正文。
 */
function stripAgentMessageWrapper(m) {
  let d = m;
  let found = PEER_MESSAGE_PREFIXES.find((f) => d.startsWith(f));
  if (found) d = d.slice(found.length);
  let g = d.lastIndexOf(AGENT_MESSAGE_CLOSE_TAG) + AGENT_MESSAGE_CLOSE_TAG.length;
  if (g > AGENT_MESSAGE_CLOSE_TAG.length - 1) {
    let f = regExp_3.exec(d.slice(g))?.[0];
    if (f !== undefined) d = d.slice(0, g) + d.slice(g + f.length);
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
`;
  let index = `
${m}`.indexOf(`
${d}`);
  if (index === -1) return m;
  let sliced = m.slice(index + d.length);
  if (index === 0) return dedentTwoSpaces(sliced);
  return `${dedentTwoSpaces(m.slice(0, index - 1))}

${sliced}`;
}
//@ chunk-ah34pb7m.js:210203-211460 placement
/**
 * 渲染来自其他代理/对等会话的消息（来源名、来源类型、转录模式下展开）。
 */
function AgentMessage(props) {
  let E = w(31);
  let { addMargin, param, fromName, verbose, isTranscriptMode, messageId, origin, followsSpeakerLabel } =
    props;
  let k = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let transcriptMode = resolveTranscriptMode(verbose, isTranscriptMode);
  let B;
  if (E[0] !== fromName) {
    B = senderLabelOrAgent(fromName);
    E[0] = fromName;
    E[1] = B;
  } else B = E[1];
  let name = B;
  let N = useAppStateSlice(selectVerbose) === true;
  let W;
  if (E[2] !== origin.handback || E[3] !== origin.kind || E[4] !== param.text || E[5] !== N) {
    let U = stripAgentMessageWrapper(typeof param.text === "string" ? param.text : "");
    W = origin.kind === "peer" && origin.handback === true && !N ? stripAgentMessageHeader(U) : U;
    E[2] = origin.handback;
    E[3] = origin.kind;
    E[4] = param.text;
    E[5] = N;
    E[6] = W;
  } else W = E[6];
  let K = W;
  let { columns } = useTerminalSize();
  let Y;
  if (E[7] !== origin) {
    Y = isPeerHandbackOrFlagged(origin);
    E[7] = origin;
    E[8] = Y;
  } else Y = E[8];
  let X = Y;
  let z;
  if (E[9] !== K || E[10] !== columns || E[11] !== transcriptMode || E[12] !== k || E[13] !== X) {
    z = transcriptMode || (k && (X || capTextToLines(K, Math.max(1, columns)) === null));
    E[9] = K;
    E[10] = columns;
    E[11] = transcriptMode;
    E[12] = k;
    E[13] = X;
    E[14] = z;
  } else z = E[14];
  let isExpanded = z;
  let sender;
  if (E[15] !== name) {
    sender = {
      name,
    };
    E[15] = name;
    E[16] = sender;
  } else sender = E[16];
  let draw;
  if (
    E[17] !== addMargin ||
    E[18] !== transcriptMode ||
    E[19] !== k ||
    E[20] !== fromName ||
    E[21] !== name ||
    E[22] !== X
  ) {
    draw = (body) =>
      jsxProd_default(AgentMessageBody, {
        addMargin,
        fromName,
        name,
        expanded: transcriptMode,
        uncapped: X,
        followsSpeakerLabel: k,
        body,
      });
    E[17] = addMargin;
    E[18] = transcriptMode;
    E[19] = k;
    E[20] = fromName;
    E[21] = name;
    E[22] = X;
    E[23] = draw;
  } else draw = E[23];
  let pe;
  if (
    E[24] !== K ||
    E[25] !== isExpanded ||
    E[26] !== messageId ||
    E[27] !== origin ||
    E[28] !== sender ||
    E[29] !== draw
  ) {
    pe = {
      messageId,
      stored: origin,
      text: K,
      isExpanded,
      sender,
      draw,
    };
    E[24] = K;
    E[25] = isExpanded;
    E[26] = messageId;
    E[27] = origin;
    E[28] = sender;
    E[29] = draw;
    E[30] = pe;
  } else pe = E[30];
  return BriefTimestampNamespace.useUserMessageSite(pe);
}
//@ chunk-ah34pb7m.js:211460-212319 placement
/**
 * 代理消息正文：展开或限高显示，跟在发言人标签后时省略标题。
 */
function AgentMessageBody(props) {
  let x = w(16);
  let { addMargin, fromName, name: g, expanded, uncapped, followsSpeakerLabel, body } = props;
  if (followsSpeakerLabel) {
    let k;
    if (x[0] !== body || x[1] !== expanded || x[2] !== uncapped) {
      k =
        expanded || uncapped
          ? jsxProd_default(CollapsibleText, {
              text: body,
            })
          : jsxProd_default(CappedMessageBody, {
              body,
            });
      x[0] = body;
      x[1] = expanded;
      x[2] = uncapped;
      x[3] = k;
    } else k = x[3];
    return k;
  }
  if (!expanded) {
    let k;
    if (x[4] !== addMargin || x[5] !== fromName) {
      k = jsxProd_default(CtrlOToExpandHint, {
        displayName: fromName,
        addMargin,
        fallbackLabel: "agent",
      });
      x[4] = addMargin;
      x[5] = fromName;
      x[6] = k;
    } else k = x[6];
    return k;
  }
  const marginTop = addMargin ? 1 : 0;
  let b;
  if (x[7] === MEMO_CACHE_SENTINEL) {
    b = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [figures_default.pointerSmall, " "],
    });
    x[7] = b;
  } else b = x[7];
  let E;
  if (x[8] !== g) {
    E = jsxProd_default_2(Text, {
      dimColor: true,
      children: [b, "Message from ", g],
    });
    x[8] = g;
    x[9] = E;
  } else E = x[9];
  let B;
  if (x[10] !== body) {
    B = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default(Text, {
        wrap: "wrap",
        children: body,
      }),
    });
    x[10] = body;
    x[11] = B;
  } else B = x[11];
  let L;
  if (x[12] !== marginTop || x[13] !== E || x[14] !== B) {
    L = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      width: "100%",
      children: [E, B],
    });
    x[12] = marginTop;
    x[13] = E;
    x[14] = B;
    x[15] = L;
  } else L = x[15];
  return L;
}
//@ chunk-ah34pb7m.js:212319-212929 placement
/**
 * 按终端宽度限制行数显示消息正文，超出时截断。
 */
function CappedMessageBody(props) {
  let f = w(13);
  let { body } = props;
  let { columns } = useTerminalSize();
  let max = Math.max(1, columns);
  let h;
  if (f[0] !== body || f[1] !== max) {
    h = capTextToLines(body, max);
    f[0] = body;
    f[1] = max;
    f[2] = h;
  } else h = f[2];
  let M = h;
  if (M === null) {
    let T;
    if (f[3] !== body) {
      T = jsxProd_default(CollapsibleText, {
        text: body,
      });
      f[3] = body;
      f[4] = T;
    } else T = f[4];
    return T;
  }
  let T;
  if (f[5] !== M.shown) {
    T = jsxProd_default(CollapsibleText, {
      text: M.shown,
    });
    f[5] = M.shown;
    f[6] = T;
  } else T = f[6];
  let x;
  if (f[7] !== M.hiddenChars || f[8] !== M.hiddenLines) {
    x = jsxProd_default(OverflowHint, {
      count: M.hiddenLines,
      hiddenChars: M.hiddenChars,
      expandable: true,
    });
    f[7] = M.hiddenChars;
    f[8] = M.hiddenLines;
    f[9] = x;
  } else x = f[9];
  let k;
  if (f[10] !== T || f[11] !== x) {
    k = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [T, x],
    });
    f[10] = T;
    f[11] = x;
    f[12] = k;
  } else k = f[12];
  return k;
}
//@ chunk-ah34pb7m.js:212929-213394 placement
/**
 * 把文本按宽度折行并截到最大行数，返回截断后的行与是否截断。
 */
function capTextToLines(m, d) {
  let max = Math.max(1e4, DEFAULT_CAP_LINES * d * 4 + 1);
  let g = truncateToLength(m, max);
  let f = g.length < m.length;
  let lines = sanitizeDisplayText(g).split(`
`);
  let T = [];
  let x = DEFAULT_CAP_LINES;
  let k = 0;
  let b = f;
  for (let [L, N] of lines.entries()) {
    if (x === 0) {
      b = true;
      break;
    }
    let W = truncateToLength(N, x * d * 4);
    let lines_2 = wrapAnsi(W, d, {
      hard: true,
      trim: false,
    }).split(`
`);
    if (W.length < N.length || (f && L === lines.length - 1) || lines_2.length > x) {
      T.push(lines_2.slice(0, x).join(""));
      b = true;
      break;
    }
    T.push(N);
    k++;
    x -= lines_2.length;
  }
  if (!b && k === lines.length) return null;
  let joined = T.join(`
`);
  let B =
    countCharInString(
      m,
      `
`,
    ) + 1;
  return {
    shown: joined,
    hiddenLines: B - k,
    hiddenChars: m.length - joined.length,
  };
}
//@ chunk-ah34pb7m.js:213394-213413 placement
var weakMap = new WeakMap();
//@ chunk-ah34pb7m.js:213413-213594 placement
/**
 * 判断代理消息在给定宽度下是否超过显示行数上限（按消息对象和宽度缓存）。
 */
function agentMessageOverflows(m, d, origin, columns) {
  if (isPeerHandbackOrFlagged(origin)) return false;
  let f = weakMap.get(m);
  if (f !== undefined && f.width === columns) return f.overflows;
  let h = capTextToLines(stripAgentMessageWrapper(d), Math.max(1, columns)) !== null;
  weakMap.set(m, {
    width: columns,
    overflows: h,
  });
  return h;
}
//@ chunk-ah34pb7m.js:213594-213703 placement
function dedentTwoSpaces(m) {
  let lines = m.split(`
`);
  return lines.every((line) => line.startsWith("  "))
    ? lines.map((line) => line.slice(2)).join(`
`)
    : m;
}
//@ chunk-ah34pb7m.js:213703-213707 placement
init_react_production();
//@ chunk-ah34pb7m.js:213707-214296 placement
/**
 * 读取某工具调用在后台完成后的结果状态（用于"结果稍后送达"）。
 */
function useDeferredToolResult(m) {
  let c = w(15);
  let sessionOrUndefined = useSessionOrUndefined();
  let g;
  if (c[0] !== sessionOrUndefined) {
    g = sessionOrUndefined ? detachedCallSlots.of(sessionOrUndefined) : null;
    c[0] = sessionOrUndefined;
    c[1] = g;
  } else g = c[1];
  let f = g;
  let toolUseID = m.toolUseID;
  let M;
  if (c[2] !== toolUseID) {
    M = (T) => T.get(toolUseID);
    c[2] = toolUseID;
    c[3] = M;
  } else M = c[3];
  let storeSelector = useStoreSelector(f, M);
  let [k, b] = useFrozenValue(storeSelector);
  let E = b !== undefined && b.status !== "running";
  let B;
  let L;
  if (c[4] !== f || c[5] !== E || c[6] !== toolUseID) {
    B = () => {
      if (E) f?.paintedInPlace(toolUseID);
    };
    L = [f, toolUseID, E];
    c[4] = f;
    c[5] = E;
    c[6] = toolUseID;
    c[7] = B;
    c[8] = L;
  } else {
    B = c[7];
    L = c[8];
  }
  zt(B, L);
  let children;
  if (c[9] !== m || c[10] !== b) {
    children = jsxProd_default(DeferredToolResultRow, {
      props: m,
      state: b,
    });
    c[9] = m;
    c[10] = b;
    c[11] = children;
  } else children = c[11];
  let W;
  if (c[12] !== k || c[13] !== children) {
    W = jsxProd_default(Box, {
      ref: k,
      flexDirection: "column",
      children,
    });
    c[12] = k;
    c[13] = children;
    c[14] = W;
  } else W = c[14];
  return W;
}
//@ chunk-ah34pb7m.js:214296-217098 placement
/**
 * 渲染稍后送达的工具结果（成功/拒绝/错误三种行）。
 */
function DeferredToolResultRow(props) {
  let T = w(47);
  let { props: props_2, state } = props;
  let toolUseID = props_2.toolUseID;
  let { Success, Reject, Error: M } = props_2.rows;
  if (state === undefined) {
    let x;
    if (T[0] === MEMO_CACHE_SENTINEL) {
      x = jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Result delivered later in the conversation",
        }),
      });
      T[0] = x;
    } else x = T[0];
    return x;
  }
  if (state.status === "running") {
    return null;
  }
  let x;
  if (T[1] !== props_2.isTranscriptMode || T[2] !== state.detachedAt || T[3] !== state.settledAt) {
    x = props_2.isTranscriptMode
      ? jsxProd_default(MessageResponse, {
          height: 1,
          children: jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "Stepped aside for your message \xB7 finished",
              " ",
              formatDuration(state.settledAt - state.detachedAt),
              " later",
            ],
          }),
        })
      : null;
    T[1] = props_2.isTranscriptMode;
    T[2] = state.detachedAt;
    T[3] = state.settledAt;
    T[4] = x;
  } else x = T[4];
  let k = x;
  if (state.status === "completed") {
    let message;
    if (T[5] !== props_2.message || T[6] !== state.data) {
      message = {
        ...props_2.message,
        toolUseResult: state.data,
      };
      T[5] = props_2.message;
      T[6] = state.data;
      T[7] = message;
    } else message = T[7];
    let E;
    if (
      T[8] !== Success ||
      T[9] !== props_2.isTranscriptMode ||
      T[10] !== props_2.lookups ||
      T[11] !== props_2.progressMessagesForMessage ||
      T[12] !== props_2.style ||
      T[13] !== props_2.tool ||
      T[14] !== props_2.tools ||
      T[15] !== props_2.verbose ||
      T[16] !== props_2.width ||
      T[17] !== message ||
      T[18] !== toolUseID
    ) {
      E = jsxProd_default(Success, {
        message,
        lookups: props_2.lookups,
        toolUseID,
        progressMessagesForMessage: props_2.progressMessagesForMessage,
        style: props_2.style,
        tool: props_2.tool,
        tools: props_2.tools,
        verbose: props_2.verbose,
        width: props_2.width,
        isTranscriptMode: props_2.isTranscriptMode,
      });
      T[8] = Success;
      T[9] = props_2.isTranscriptMode;
      T[10] = props_2.lookups;
      T[11] = props_2.progressMessagesForMessage;
      T[12] = props_2.style;
      T[13] = props_2.tool;
      T[14] = props_2.tools;
      T[15] = props_2.verbose;
      T[16] = props_2.width;
      T[17] = message;
      T[18] = toolUseID;
      T[19] = E;
    } else E = T[19];
    let B;
    if (T[20] !== E || T[21] !== k) {
      B = jsxProd_default_2(Fragment, {
        children: [E, k],
      });
      T[20] = E;
      T[21] = k;
      T[22] = B;
    } else B = T[22];
    return B;
  }
  if (state.status === "stopped") {
    let b;
    if (
      T[23] !== Reject ||
      T[24] !== props_2.input ||
      T[25] !== props_2.isTranscriptMode ||
      T[26] !== props_2.progressMessagesForMessage ||
      T[27] !== props_2.style ||
      T[28] !== props_2.tool ||
      T[29] !== props_2.tools ||
      T[30] !== props_2.verbose
    ) {
      b = jsxProd_default(Reject, {
        input: props_2.input,
        progressMessagesForMessage: props_2.progressMessagesForMessage,
        isInterrupted: true,
        tool: props_2.tool,
        tools: props_2.tools,
        style: props_2.style,
        verbose: props_2.verbose,
        isTranscriptMode: props_2.isTranscriptMode,
      });
      T[23] = Reject;
      T[24] = props_2.input;
      T[25] = props_2.isTranscriptMode;
      T[26] = props_2.progressMessagesForMessage;
      T[27] = props_2.style;
      T[28] = props_2.tool;
      T[29] = props_2.tools;
      T[30] = props_2.verbose;
      T[31] = b;
    } else b = T[31];
    return b;
  }
  let param;
  if (T[32] !== props_2.param || T[33] !== state.text) {
    param = {
      ...props_2.param,
      content: state.text,
      is_error: true,
    };
    T[32] = props_2.param;
    T[33] = state.text;
    T[34] = param;
  } else param = T[34];
  let E;
  if (
    T[35] !== M ||
    T[36] !== props_2.input ||
    T[37] !== props_2.isTranscriptMode ||
    T[38] !== props_2.progressMessagesForMessage ||
    T[39] !== props_2.tool ||
    T[40] !== props_2.tools ||
    T[41] !== props_2.verbose ||
    T[42] !== param
  ) {
    E = jsxProd_default(M, {
      progressMessagesForMessage: props_2.progressMessagesForMessage,
      tool: props_2.tool,
      tools: props_2.tools,
      param,
      input: props_2.input,
      output: undefined,
      toolDenialKind: undefined,
      verbose: props_2.verbose,
      isTranscriptMode: props_2.isTranscriptMode,
    });
    T[35] = M;
    T[36] = props_2.input;
    T[37] = props_2.isTranscriptMode;
    T[38] = props_2.progressMessagesForMessage;
    T[39] = props_2.tool;
    T[40] = props_2.tools;
    T[41] = props_2.verbose;
    T[42] = param;
    T[43] = E;
  } else E = T[43];
  let B;
  if (T[44] !== E || T[45] !== k) {
    B = jsxProd_default_2(Fragment, {
      children: [E, k],
    });
    T[44] = E;
    T[45] = k;
    T[46] = B;
  } else B = T[46];
  return B;
}
//@ chunk-ah34pb7m.js:217098-217164 placement
function folderWaitRefusal(name, content) {
  let computerFolderReplyTarget = readComputerFolderReplyTarget(name, content);
  return computerFolderReplyTarget !== undefined && isRepositoryTrustGateEnabled()
    ? computerFolderReplyTarget
    : undefined;
}
//@ chunk-ah34pb7m.js:217164-217416 placement
/**
 * 远程工具"等待文件夹信任"的拒绝提示行，文案取自 REMOTE_TOOLS_CONSENT_TEXT。
 */
function FolderWaitRefusalNotice(props) {
  let g = w(2);
  let { refusal } = props;
  const c = REMOTE_TOOLS_CONSENT_TEXT[`repository_trust.folder_waits.${refusal}`];
  let f;
  if (g[0] !== c) {
    f = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "wrap",
        children: [c, " ", REMOTE_TOOLS_CONSENT_TEXT["repository_trust.folder_waits.marker"]],
      }),
    });
    g[0] = c;
    g[1] = f;
  } else f = g[1];
  return f;
}
export {
  agentMessageOverflows,
  folderWaitRefusal,
  useDeferredToolResult,
  FolderWaitRefusalNotice,
  AgentMessage,
};
