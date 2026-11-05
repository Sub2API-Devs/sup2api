/**
 * components/messages/AgentMessage.tsx
 *
 * 2.1.316 新增：渲染稍后送达的工具结果（成功/拒绝/错误三种行）；渲染来自其他代理/对等会话的消息（来源名、来源类型、转录模式下展开）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wjygkcr4.js (18)
 * attribution: placement 18
 */
import { clipTeammateText } from "../../utils/swarm/teammateIds.js";
import {
  PEER_MESSAGE_PREFIXES,
  PEER_MESSAGE_SUFFIXES,
  DESCENDANT_MESSAGE_SUFFIXES,
} from "../../utils/crossSessionMessages.js";
import { regExp_3 } from "../../utils/messages.js";
import { HANDBACK_REPORT_HEADER } from "../../tools/AgentTool/handbackReport.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { useLayoutEffect, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { MessageResponse } from "../MessageResponse.js";
import { formatDuration } from "../../utils/format.js";
import { readComputerFolderReplyTarget } from "../../remote/tools/toolHostsNotice.js";
import { isRepositoryTrustGateEnabled } from "../../utils/teleport/repositoryTrustGate.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wjygkcr4.js:216516-216550 placement
function selectVerbose(state) {
  return state.verbose;
}
//@ chunk-wjygkcr4.js:216550-216581 placement
var AGENT_MESSAGE_CLOSE_TAG = "</agent-message>";
var DEFAULT_CAP_LINES = 5;
//@ chunk-wjygkcr4.js:216581-216618 placement
function senderLabelOrAgent(fromName) {
  return clipTeammateText(fromName) || "agent";
}
//@ chunk-wjygkcr4.js:216618-216982 placement
/**
 * 去掉代理消息的前缀与结尾标签，得到正文。
 */
function stripAgentMessageWrapper(text) {
  let rest = text;
  let found = PEER_MESSAGE_PREFIXES.find((prefix) => rest.startsWith(prefix));
  if (found) rest = rest.slice(found.length);
  let closeEnd = rest.lastIndexOf(AGENT_MESSAGE_CLOSE_TAG) + AGENT_MESSAGE_CLOSE_TAG.length;
  if (closeEnd > AGENT_MESSAGE_CLOSE_TAG.length - 1) {
    let closeMatch = regExp_3.exec(rest.slice(closeEnd))?.[0];
    if (closeMatch !== undefined) rest = rest.slice(0, closeEnd) + rest.slice(closeEnd + closeMatch.length);
    let sliced = rest.slice(closeEnd);
    if (PEER_MESSAGE_SUFFIXES.includes(sliced) || DESCENDANT_MESSAGE_SUFFIXES.includes(sliced))
      rest = rest.slice(0, closeEnd);
  }
  return rest.replace(/^<agent-message[^>]*>\n/, "").replace(/\n<\/agent-message>$/, "");
}
//@ chunk-wjygkcr4.js:216982-217141 placement
function stripAgentMessageHeader(text) {
  let headerPrefix =
    HANDBACK_REPORT_HEADER +
    `
`;
  let index = `
${text}`.indexOf(`
${headerPrefix}`);
  if (index === -1) return text;
  let text_2 = text.slice(index + headerPrefix.length);
  if (index === 0) return dedentTwoSpaces(text_2);
  return `${dedentTwoSpaces(text.slice(0, index - 1))}

${text_2}`;
}
//@ chunk-wjygkcr4.js:217141-218401 placement
/**
 * 渲染来自其他代理/对等会话的消息（来源名、来源类型、转录模式下展开）。
 */
function AgentMessage(props) {
  let $ = useMemoCache(31);
  let { addMargin, param, fromName, verbose, isTranscriptMode, messageId, origin, followsSpeakerLabel } =
    props;
  let followsLabel = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let transcriptMode = resolveTranscriptMode(verbose, isTranscriptMode);
  let senderLabel;
  if ($[0] !== fromName) {
    senderLabel = senderLabelOrAgent(fromName);
    $[0] = fromName;
    $[1] = senderLabel;
  } else senderLabel = $[1];
  let name = senderLabel;
  let isVerbose = useAppStateSlice(selectVerbose) === true;
  let bodyText;
  if ($[2] !== origin.handback || $[3] !== origin.kind || $[4] !== param.text || $[5] !== isVerbose) {
    let stripped = stripAgentMessageWrapper(typeof param.text === "string" ? param.text : "");
    bodyText =
      origin.kind === "peer" && origin.handback === true && !isVerbose
        ? stripAgentMessageHeader(stripped)
        : stripped;
    $[2] = origin.handback;
    $[3] = origin.kind;
    $[4] = param.text;
    $[5] = isVerbose;
    $[6] = bodyText;
  } else bodyText = $[6];
  let headerElement = bodyText;
  let { columns } = useTerminalSize();
  let senderElement;
  if ($[7] !== origin) {
    senderElement = isPeerHandbackOrFlagged(origin);
    $[7] = origin;
    $[8] = senderElement;
  } else senderElement = $[8];
  let roleElement = senderElement;
  let showsHeader;
  if (
    $[9] !== headerElement ||
    $[10] !== columns ||
    $[11] !== transcriptMode ||
    $[12] !== followsLabel ||
    $[13] !== roleElement
  ) {
    showsHeader =
      transcriptMode ||
      (followsLabel && (roleElement || capTextToLines(headerElement, Math.max(1, columns)) === null));
    $[9] = headerElement;
    $[10] = columns;
    $[11] = transcriptMode;
    $[12] = followsLabel;
    $[13] = roleElement;
    $[14] = showsHeader;
  } else showsHeader = $[14];
  let isExpanded = showsHeader;
  let sender;
  if ($[15] !== name) {
    sender = {
      name,
    };
    $[15] = name;
    $[16] = sender;
  } else sender = $[16];
  let draw;
  if (
    $[17] !== addMargin ||
    $[18] !== transcriptMode ||
    $[19] !== followsLabel ||
    $[20] !== fromName ||
    $[21] !== name ||
    $[22] !== roleElement
  ) {
    draw = (body) =>
      jsxProd_default(AgentMessageBody, {
        addMargin,
        fromName,
        name,
        expanded: transcriptMode,
        uncapped: roleElement,
        followsSpeakerLabel: followsLabel,
        body,
      });
    $[17] = addMargin;
    $[18] = transcriptMode;
    $[19] = followsLabel;
    $[20] = fromName;
    $[21] = name;
    $[22] = roleElement;
    $[23] = draw;
  } else draw = $[23];
  let containerElement;
  if (
    $[24] !== headerElement ||
    $[25] !== isExpanded ||
    $[26] !== messageId ||
    $[27] !== origin ||
    $[28] !== sender ||
    $[29] !== draw
  ) {
    containerElement = {
      messageId,
      stored: origin,
      text: headerElement,
      isExpanded,
      sender,
      draw,
    };
    $[24] = headerElement;
    $[25] = isExpanded;
    $[26] = messageId;
    $[27] = origin;
    $[28] = sender;
    $[29] = draw;
    $[30] = containerElement;
  } else containerElement = $[30];
  return BriefTimestampNamespace.useUserMessageSite(containerElement);
}
//@ chunk-wjygkcr4.js:218401-219260 placement
/**
 * 代理消息正文：展开或限高显示，跟在发言人标签后时省略标题。
 */
function AgentMessageBody(props) {
  let $ = useMemoCache(16);
  let { addMargin, fromName, name: fromNameOverride, expanded, uncapped, followsSpeakerLabel, body } = props;
  if (followsSpeakerLabel) {
    let bodyElement;
    if ($[0] !== body || $[1] !== expanded || $[2] !== uncapped) {
      bodyElement =
        expanded || uncapped
          ? jsxProd_default(CollapsibleText, {
              text: body,
            })
          : jsxProd_default(CappedMessageBody, {
              body,
            });
      $[0] = body;
      $[1] = expanded;
      $[2] = uncapped;
      $[3] = bodyElement;
    } else bodyElement = $[3];
    return bodyElement;
  }
  if (!expanded) {
    let ctrlOToExpandHintElement;
    if ($[4] !== addMargin || $[5] !== fromName) {
      ctrlOToExpandHintElement = jsxProd_default(CtrlOToExpandHint, {
        displayName: fromName,
        addMargin,
        fallbackLabel: "agent",
      });
      $[4] = addMargin;
      $[5] = fromName;
      $[6] = ctrlOToExpandHintElement;
    } else ctrlOToExpandHintElement = $[6];
    return ctrlOToExpandHintElement;
  }
  const marginTop = addMargin ? 1 : 0;
  let pointerElement;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    pointerElement = jsxProd_default_2(Text, {
      "aria-hidden": true,
      children: [figures_default.pointerSmall, " "],
    });
    $[7] = pointerElement;
  } else pointerElement = $[7];
  let senderLine;
  if ($[8] !== fromNameOverride) {
    senderLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: [pointerElement, "Message from ", fromNameOverride],
    });
    $[8] = fromNameOverride;
    $[9] = senderLine;
  } else senderLine = $[9];
  let bodyBox;
  if ($[10] !== body) {
    bodyBox = jsxProd_default(Box, {
      paddingLeft: 2,
      children: jsxProd_default(Text, {
        wrap: "wrap",
        children: body,
      }),
    });
    $[10] = body;
    $[11] = bodyBox;
  } else bodyBox = $[11];
  let messageColumn;
  if ($[12] !== marginTop || $[13] !== senderLine || $[14] !== bodyBox) {
    messageColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      width: "100%",
      children: [senderLine, bodyBox],
    });
    $[12] = marginTop;
    $[13] = senderLine;
    $[14] = bodyBox;
    $[15] = messageColumn;
  } else messageColumn = $[15];
  return messageColumn;
}
//@ chunk-wjygkcr4.js:219260-219870 placement
/**
 * 按终端宽度限制行数显示消息正文，超出时截断。
 */
function CappedMessageBody(props) {
  let $ = useMemoCache(13);
  let { body } = props;
  let { columns } = useTerminalSize();
  let max = Math.max(1, columns);
  let capped;
  if ($[0] !== body || $[1] !== max) {
    capped = capTextToLines(body, max);
    $[0] = body;
    $[1] = max;
    $[2] = capped;
  } else capped = $[2];
  let cappedBody = capped;
  if (cappedBody === null) {
    let fullTextElement;
    if ($[3] !== body) {
      fullTextElement = jsxProd_default(CollapsibleText, {
        text: body,
      });
      $[3] = body;
      $[4] = fullTextElement;
    } else fullTextElement = $[4];
    return fullTextElement;
  }
  let collapsibleTextElement;
  if ($[5] !== cappedBody.shown) {
    collapsibleTextElement = jsxProd_default(CollapsibleText, {
      text: cappedBody.shown,
    });
    $[5] = cappedBody.shown;
    $[6] = collapsibleTextElement;
  } else collapsibleTextElement = $[6];
  let overflowHintElement;
  if ($[7] !== cappedBody.hiddenChars || $[8] !== cappedBody.hiddenLines) {
    overflowHintElement = jsxProd_default(OverflowHint, {
      count: cappedBody.hiddenLines,
      hiddenChars: cappedBody.hiddenChars,
      expandable: true,
    });
    $[7] = cappedBody.hiddenChars;
    $[8] = cappedBody.hiddenLines;
    $[9] = overflowHintElement;
  } else overflowHintElement = $[9];
  let boxElement;
  if ($[10] !== collapsibleTextElement || $[11] !== overflowHintElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [collapsibleTextElement, overflowHintElement],
    });
    $[10] = collapsibleTextElement;
    $[11] = overflowHintElement;
    $[12] = boxElement;
  } else boxElement = $[12];
  return boxElement;
}
//@ chunk-wjygkcr4.js:219870-220333 placement
/**
 * 把文本按宽度折行并截到最大行数，返回截断后的行与是否截断。
 */
function capTextToLines(body, columns) {
  let max = Math.max(1e4, DEFAULT_CAP_LINES * columns * 4 + 1);
  let truncated = truncateToLength(body, max);
  let wasTruncated = truncated.length < body.length;
  let lines = sanitizeDisplayText(truncated).split(`
`);
  let outLines = [];
  let remainingLines = DEFAULT_CAP_LINES;
  let lineIndex = 0;
  let overflowed = wasTruncated;
  for (let [originalIndex, line] of lines.entries()) {
    if (remainingLines === 0) {
      overflowed = true;
      break;
    }
    let clippedLine = truncateToLength(line, remainingLines * columns * 4);
    let lines_2 = wrapAnsi(clippedLine, columns, {
      hard: true,
      trim: false,
    }).split(`
`);
    if (
      clippedLine.length < line.length ||
      (wasTruncated && originalIndex === lines.length - 1) ||
      lines_2.length > remainingLines
    ) {
      outLines.push(lines_2.slice(0, remainingLines).join(""));
      overflowed = true;
      break;
    }
    outLines.push(line);
    lineIndex++;
    remainingLines -= lines_2.length;
  }
  if (!overflowed && lineIndex === lines.length) return null;
  let joined = outLines.join(`
`);
  let hiddenLineCount =
    countCharInString(
      body,
      `
`,
    ) + 1;
  return {
    shown: joined,
    hiddenLines: hiddenLineCount - lineIndex,
    hiddenChars: body.length - joined.length,
  };
}
//@ chunk-wjygkcr4.js:220333-220352 placement
var weakMap_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:220333", () => {
  weakMap_2 = new WeakMap();
});
//@ chunk-wjygkcr4.js:220352-220533 placement
/**
 * 判断代理消息在给定宽度下是否超过显示行数上限（按消息对象和宽度缓存）。
 */
function agentMessageOverflows(message, body, origin, columns) {
  if (isPeerHandbackOrFlagged(origin)) return false;
  let cached = weakMap_2.get(message);
  if (cached !== undefined && cached.width === columns) return cached.overflows;
  let overflows = capTextToLines(stripAgentMessageWrapper(body), Math.max(1, columns)) !== null;
  weakMap_2.set(message, {
    width: columns,
    overflows,
  });
  return overflows;
}
//@ chunk-wjygkcr4.js:220533-220642 placement
function dedentTwoSpaces(text) {
  let lines = text.split(`
`);
  return lines.every((line) => line.startsWith("  "))
    ? lines.map((line) => line.slice(2)).join(`
`)
    : text;
}
//@ chunk-wjygkcr4.js:220646-221235 placement
/**
 * 读取某工具调用在后台完成后的结果状态（用于"结果稍后送达"）。
 */
function useDeferredToolResult(props) {
  let $ = useMemoCache(15);
  let sessionOrUndefined = useSessionOrUndefined();
  let store;
  if ($[0] !== sessionOrUndefined) {
    store = sessionOrUndefined ? detachedCallSlots.of(sessionOrUndefined) : null;
    $[0] = sessionOrUndefined;
    $[1] = store;
  } else store = $[1];
  let detachedStore = store;
  let toolUseID = props.toolUseID;
  let selector;
  if ($[2] !== toolUseID) {
    selector = (state) => state.get(toolUseID);
    $[2] = toolUseID;
    $[3] = selector;
  } else selector = $[3];
  let storeSelector = useStoreSelector(detachedStore, selector);
  let [frozenValue, setFrozenValue] = useFrozenValue(storeSelector);
  let isSettled = setFrozenValue !== undefined && setFrozenValue.status !== "running";
  let runningElement;
  let inputDeps;
  if ($[4] !== detachedStore || $[5] !== isSettled || $[6] !== toolUseID) {
    runningElement = () => {
      if (isSettled) detachedStore?.paintedInPlace(toolUseID);
    };
    inputDeps = [detachedStore, toolUseID, isSettled];
    $[4] = detachedStore;
    $[5] = isSettled;
    $[6] = toolUseID;
    $[7] = runningElement;
    $[8] = inputDeps;
  } else {
    runningElement = $[7];
    inputDeps = $[8];
  }
  useLayoutEffect(runningElement, inputDeps);
  let children;
  if ($[9] !== props || $[10] !== setFrozenValue) {
    children = jsxProd_default(DeferredToolResultRow, {
      props,
      state: setFrozenValue,
    });
    $[9] = props;
    $[10] = setFrozenValue;
    $[11] = children;
  } else children = $[11];
  let boxElement;
  if ($[12] !== frozenValue || $[13] !== children) {
    boxElement = jsxProd_default(Box, {
      ref: frozenValue,
      flexDirection: "column",
      children,
    });
    $[12] = frozenValue;
    $[13] = children;
    $[14] = boxElement;
  } else boxElement = $[14];
  return boxElement;
}
//@ chunk-wjygkcr4.js:221235-224039 placement
/**
 * 渲染稍后送达的工具结果（成功/拒绝/错误三种行）。
 */
function DeferredToolResultRow(props) {
  let $ = useMemoCache(47);
  let { props: props_2, state } = props;
  let toolUseID = props_2.toolUseID;
  let { Success, Reject, Error: ErrorRow } = props_2.rows;
  if (state === undefined) {
    let pendingElement;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      pendingElement = jsxProd_default(MessageResponse, {
        height: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Result delivered later in the conversation",
        }),
      });
      $[0] = pendingElement;
    } else pendingElement = $[0];
    return pendingElement;
  }
  if (state.status === "running") {
    return null;
  }
  let transcriptModeRow;
  if ($[1] !== props_2.isTranscriptMode || $[2] !== state.detachedAt || $[3] !== state.settledAt) {
    transcriptModeRow = props_2.isTranscriptMode
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
    $[1] = props_2.isTranscriptMode;
    $[2] = state.detachedAt;
    $[3] = state.settledAt;
    $[4] = transcriptModeRow;
  } else transcriptModeRow = $[4];
  let headerRow = transcriptModeRow;
  if (state.status === "completed") {
    let message;
    if ($[5] !== props_2.message || $[6] !== state.data) {
      message = {
        ...props_2.message,
        toolUseResult: state.data,
      };
      $[5] = props_2.message;
      $[6] = state.data;
      $[7] = message;
    } else message = $[7];
    let successElement;
    if (
      $[8] !== Success ||
      $[9] !== props_2.isTranscriptMode ||
      $[10] !== props_2.lookups ||
      $[11] !== props_2.progressMessagesForMessage ||
      $[12] !== props_2.style ||
      $[13] !== props_2.tool ||
      $[14] !== props_2.tools ||
      $[15] !== props_2.verbose ||
      $[16] !== props_2.width ||
      $[17] !== message ||
      $[18] !== toolUseID
    ) {
      successElement = jsxProd_default(Success, {
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
      $[8] = Success;
      $[9] = props_2.isTranscriptMode;
      $[10] = props_2.lookups;
      $[11] = props_2.progressMessagesForMessage;
      $[12] = props_2.style;
      $[13] = props_2.tool;
      $[14] = props_2.tools;
      $[15] = props_2.verbose;
      $[16] = props_2.width;
      $[17] = message;
      $[18] = toolUseID;
      $[19] = successElement;
    } else successElement = $[19];
    let settledElement;
    if ($[20] !== successElement || $[21] !== headerRow) {
      settledElement = jsxProd_default_2(Fragment, {
        children: [successElement, headerRow],
      });
      $[20] = successElement;
      $[21] = headerRow;
      $[22] = settledElement;
    } else settledElement = $[22];
    return settledElement;
  }
  if (state.status === "stopped") {
    let rejectElement;
    if (
      $[23] !== Reject ||
      $[24] !== props_2.input ||
      $[25] !== props_2.isTranscriptMode ||
      $[26] !== props_2.progressMessagesForMessage ||
      $[27] !== props_2.style ||
      $[28] !== props_2.tool ||
      $[29] !== props_2.tools ||
      $[30] !== props_2.verbose
    ) {
      rejectElement = jsxProd_default(Reject, {
        input: props_2.input,
        progressMessagesForMessage: props_2.progressMessagesForMessage,
        isInterrupted: true,
        tool: props_2.tool,
        tools: props_2.tools,
        style: props_2.style,
        verbose: props_2.verbose,
        isTranscriptMode: props_2.isTranscriptMode,
      });
      $[23] = Reject;
      $[24] = props_2.input;
      $[25] = props_2.isTranscriptMode;
      $[26] = props_2.progressMessagesForMessage;
      $[27] = props_2.style;
      $[28] = props_2.tool;
      $[29] = props_2.tools;
      $[30] = props_2.verbose;
      $[31] = rejectElement;
    } else rejectElement = $[31];
    return rejectElement;
  }
  let param;
  if ($[32] !== props_2.param || $[33] !== state.text) {
    param = {
      ...props_2.param,
      content: state.text,
      is_error: true,
    };
    $[32] = props_2.param;
    $[33] = state.text;
    $[34] = param;
  } else param = $[34];
  let errorRowElement;
  if (
    $[35] !== ErrorRow ||
    $[36] !== props_2.input ||
    $[37] !== props_2.isTranscriptMode ||
    $[38] !== props_2.progressMessagesForMessage ||
    $[39] !== props_2.tool ||
    $[40] !== props_2.tools ||
    $[41] !== props_2.verbose ||
    $[42] !== param
  ) {
    errorRowElement = jsxProd_default(ErrorRow, {
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
    $[35] = ErrorRow;
    $[36] = props_2.input;
    $[37] = props_2.isTranscriptMode;
    $[38] = props_2.progressMessagesForMessage;
    $[39] = props_2.tool;
    $[40] = props_2.tools;
    $[41] = props_2.verbose;
    $[42] = param;
    $[43] = errorRowElement;
  } else errorRowElement = $[43];
  let rowFragment;
  if ($[44] !== errorRowElement || $[45] !== headerRow) {
    rowFragment = jsxProd_default_2(Fragment, {
      children: [errorRowElement, headerRow],
    });
    $[44] = errorRowElement;
    $[45] = headerRow;
    $[46] = rowFragment;
  } else rowFragment = $[46];
  return rowFragment;
}
//@ chunk-wjygkcr4.js:224039-224105 placement
function folderWaitRefusal(toolName, content) {
  let computerFolderReplyTarget = readComputerFolderReplyTarget(toolName, content);
  return computerFolderReplyTarget !== undefined && isRepositoryTrustGateEnabled()
    ? computerFolderReplyTarget
    : undefined;
}
//@ chunk-wjygkcr4.js:224105-224357 placement
/**
 * 远程工具"等待文件夹信任"的拒绝提示行，文案取自 REMOTE_TOOLS_CONSENT_TEXT。
 */
function FolderWaitRefusalNotice(props) {
  let $ = useMemoCache(2);
  let { refusal } = props;
  const noticeText = REMOTE_TOOLS_CONSENT_TEXT[`repository_trust.folder_waits.${refusal}`];
  let noticeElement;
  if ($[0] !== noticeText) {
    noticeElement = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "wrap",
        children: [noticeText, " ", REMOTE_TOOLS_CONSENT_TEXT["repository_trust.folder_waits.marker"]],
      }),
    });
    $[0] = noticeText;
    $[1] = noticeElement;
  } else noticeElement = $[1];
  return noticeElement;
}
//@ chunk-wjygkcr4.js:225232-225236 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:225232", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:227346-227350 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:227346", () => {
  init_react_production();
});
export {
  AgentMessage,
  agentMessageOverflows,
  folderWaitRefusal,
  useDeferredToolResult,
  FolderWaitRefusalNotice,
};
