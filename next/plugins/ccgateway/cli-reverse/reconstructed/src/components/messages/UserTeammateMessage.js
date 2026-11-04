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
import { init_react_production, fragmentTypeExport } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { CtrlOToExpandHint } from "../CtrlOToExpand.js";
import { TEAMMATE_MESSAGE } from "../../constants/xml.js";
import { PEER_MESSAGE_SUFFIXES, PEER_MESSAGE_PREFIXES } from "../../utils/crossSessionMessages.js";
import { unescapeBasicHtmlEntities } from "../../utils/confusables.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-q7z2h94h.js:1585-1737 fingerprint (2.1.88 match: parseTeammateMessages, 0.361)
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
//@ chunk-ah34pb7m.js:88531-88535 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:88531", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:88535-88539 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:88535", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:88539-88581 placement
function selectAgentNameRegistry(state) {
  return state.agentNameRegistry;
}
//@ chunk-ah34pb7m.js:88581-88739 placement
function renderTeammateMessageItem(item, key) {
  return item.kind === "panel"
    ? item.node
    : jsxProd_default(
        CtrlOToExpandHint,
        {
          displayName: item.senderName,
          qualifier: item.isUnverified ? UNVERIFIED : undefined,
          count: item.count,
          fallbackLabel: "teammate",
        },
        key,
      );
}
//@ chunk-ah34pb7m.js:88739-88759 placement
var UNVERIFIED = "unverified";
//@ chunk-ah34pb7m.js:88759-88795 placement
function unverifiedSenderLabel(senderName) {
  return `${senderName} (${UNVERIFIED})`;
}
//@ chunk-ah34pb7m.js:88795-88813 placement
var TEAMMATE_MESSAGE_CLOSE_TAG = `</${TEAMMATE_MESSAGE}>`;
//@ chunk-ah34pb7m.js:88813-89659 placement
/**
 * 从文本中解析 teammate-message 标签列表与剩余文本。
 */
function parseTeammateMessages(text) {
  for (let suffix of PEER_MESSAGE_SUFFIXES)
    if (text.endsWith(suffix)) {
      text = text.slice(0, -suffix.length);
      break;
    }
  for (let body of PEER_MESSAGE_PREFIXES)
    if (text.startsWith(body) && text.startsWith(`<${TEAMMATE_MESSAGE} `, body.length)) {
      text = text.slice(body.length);
      break;
    }
  let regExp = new RegExp(
    `<${TEAMMATE_MESSAGE}\\s+teammate_id="([^"]+)"(?:\\s+color="([^"]+)")?(?:\\s+summary="([^"]+)")?(?:\\s+verified="(false)")?>\\n?`,
    "y",
  );
  let messages = [];
  let segments = 0;
  while (segments < text.length) {
    regExp.lastIndex = segments;
    let match = regExp.exec(text);
    if (!match)
      return {
        messages,
        unparsed: text.slice(segments),
      };
    let segment = segments + match[0].length;
    let unparsed = -1;
    let parts = text.length;
    for (
      let index = text.indexOf(TEAMMATE_MESSAGE_CLOSE_TAG, segment);
      index !== -1;
      index = text.indexOf(TEAMMATE_MESSAGE_CLOSE_TAG, index + 1)
    ) {
      let parsed = index + TEAMMATE_MESSAGE_CLOSE_TAG.length;
      while (parsed < text.length && /\s/.test(text.charAt(parsed))) parsed++;
      regExp.lastIndex = parsed;
      if (parsed === text.length || regExp.test(text)) {
        unparsed = index;
        parts = parsed;
        break;
      }
    }
    if (unparsed === -1) unparsed = text.length;
    let content = text.slice(segment, unparsed).trim();
    messages.push({
      teammateId: unescapeBasicHtmlEntities(match[1] ?? ""),
      color: match[2] ? unescapeBasicHtmlEntities(match[2]) : undefined,
      summary: match[3] ? unescapeBasicHtmlEntities(match[3]) : undefined,
      content,
      ...(match[4] === "false" && {
        isVerified: false,
      }),
    });
    segments = parts;
  }
  return {
    messages,
    unparsed: "",
  };
}
//@ chunk-ah34pb7m.js:89659-90115 placement
/**
 * 收集进程内队友的显示颜色。
 */
function useTeammateColors() {
  let $ = useMemoCache(7);
  let appState = useAppState(selectAgentNameRegistry);
  let appStoreDirect = useAppStoreDirect();
  let merged;
  if ($[0] !== appState || $[1] !== appStoreDirect) {
    merged = new Map();
    let seen;
    if ($[3] !== appStoreDirect) {
      seen = Object.values(appStoreDirect.getState().tasks);
      $[3] = appStoreDirect;
      $[4] = seen;
    } else seen = $[4];
    for (const message of seen) {
      if (message.type === "in_process_teammate") merged.set(message.id, message.identity.agentName);
      else if (message.type === "local_agent") merged.set(message.id, message.agentType);
    }
    for (const [key, existing] of appState) merged.set(existing, key);
    $[0] = appState;
    $[1] = appStoreDirect;
    $[2] = merged;
  } else merged = $[2];
  let coalesced = merged;
  let resolveName;
  if ($[5] !== coalesced) {
    resolveName = (name) => (name === "leader" ? "leader" : (coalesced.get(name) ?? name));
    $[5] = coalesced;
    $[6] = resolveName;
  } else resolveName = $[6];
  return resolveName;
}
//@ chunk-ah34pb7m.js:90115-90405 placement
/**
 * 合并相邻的同名队友消息为计数项（panel 项保留不合并）。
 */
function coalesceTeammateMessages(messages) {
  let coalesced = [];
  for (let message of messages) {
    if (message.kind === "panel") {
      coalesced.push(message);
      continue;
    }
    let last = coalesced.at(-1);
    if (last && last.kind === "coalesced" && last.displayName === message.displayName) last.count++;
    else
      coalesced.push({
        kind: "coalesced",
        displayName: message.displayName,
        senderName: message.senderName,
        isUnverified: message.isUnverified,
        count: 1,
      });
  }
  return coalesced;
}
//@ chunk-ah34pb7m.js:90405-90545 placement
function filterDisplayableTeammateMessages(messages) {
  return messages.filter((message) => {
    if (message.summary?.trim()) return true;
    if (message.isVerified === false) return true;
    if (parseFrameForDisplay(ShutdownApprovedMessageSchema(), message.content)) return false;
    return true;
  });
}
//@ chunk-ah34pb7m.js:90545-90628 placement
function hasNoDisplayableTeammateMessage(content) {
  let { messages, unparsed } = parseTeammateMessages(content);
  return filterDisplayableTeammateMessages(messages).length === 0 && !unparsed.trim();
}
//@ chunk-ah34pb7m.js:90628-90707 placement
function capTeammateText(summary, transcriptMode) {
  if (transcriptMode) return summary;
  let summaryValue = capFrameFieldForDisplay(summary);
  return summaryValue === summary.trim() ? summaryValue : `${summaryValue}\u2026`;
}
//@ chunk-ah34pb7m.js:90707-91432 placement
/**
 * 渲染用户回合中的队友消息。
 */
function UserTeammateMessage(props) {
  let $ = useMemoCache(12);
  let parsed;
  let items;
  if ($[0] !== props.param.text) {
    let { messages, unparsed } = parseTeammateMessages(props.param.text);
    parsed = filterDisplayableTeammateMessages(messages);
    items = unparsed.trim();
    $[0] = props.param.text;
    $[1] = parsed;
    $[2] = items;
  } else {
    parsed = $[1];
    items = $[2];
  }
  let isExpanded = items;
  if (parsed.length === 0 && !isExpanded) {
    return null;
  }
  let teammateMessageListElement;
  if (
    $[3] !== parsed ||
    $[4] !== props.addMargin ||
    $[5] !== props.followsSpeakerLabel ||
    $[6] !== props.isTranscriptMode ||
    $[7] !== props.messageId ||
    $[8] !== props.origin ||
    $[9] !== props.verbose ||
    $[10] !== isExpanded
  ) {
    teammateMessageListElement = jsxProd_default(TeammateMessageList, {
      addMargin: props.addMargin,
      verbose: props.verbose,
      isTranscriptMode: props.isTranscriptMode,
      messageId: props.messageId,
      origin: props.origin,
      followsSpeakerLabel: props.followsSpeakerLabel,
      messages: parsed,
      unparsedTrimmed: isExpanded,
    });
    $[3] = parsed;
    $[4] = props.addMargin;
    $[5] = props.followsSpeakerLabel;
    $[6] = props.isTranscriptMode;
    $[7] = props.messageId;
    $[8] = props.origin;
    $[9] = props.verbose;
    $[10] = isExpanded;
    $[11] = teammateMessageListElement;
  } else teammateMessageListElement = $[11];
  return teammateMessageListElement;
}
//@ chunk-ah34pb7m.js:91432-93961 placement
/**
 * 队友消息列表（标签视图、展开）。
 */
function TeammateMessageList(props) {
  let $ = useMemoCache(30);
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
  let followsLabel = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let teammateColors = useTeammateColors();
  let transcriptMode = resolveTranscriptMode(verbose, isTranscriptMode);
  let expanded = transcriptMode || followsLabel;
  let plainText;
  let items;
  let commonSender;
  let isSimple;
  if (
    $[0] !== teammateColors ||
    $[1] !== followsLabel ||
    $[2] !== messages ||
    $[3] !== transcriptMode ||
    $[4] !== unparsedTrimmed
  ) {
    let getName;
    if ($[9] !== teammateColors) {
      getName = (message) =>
        capIdFrameField(teammateColors(message.teammateId), IDLE_ID_FIELD_RECEIVE_BOUND) || UNKNOWN_SENDER;
      $[9] = teammateColors;
      $[10] = getName;
    } else getName = $[10];
    let mapped = messages.map(getName);
    let mapped_2 = messages.map((message, index) => {
      let name = mapped[index] ?? UNKNOWN_SENDER;
      return message.isVerified === false ? unverifiedSenderLabel(name) : name;
    });
    let getSummary;
    if ($[11] !== transcriptMode) {
      getSummary = (message) => (message.summary ? capTeammateText(message.summary, transcriptMode) : "");
      $[11] = transcriptMode;
      $[12] = getSummary;
    } else getSummary = $[12];
    let mapped_3 = messages.map(getSummary);
    plainText = messages
      .map((message, index) =>
        [
          mapped_3[index]?.trim() ? mapped_3[index] : "",
          capRawFrameTextForDisplay(message.content, message.teammateId),
        ].filter(Boolean).join(`
`),
      )
      .concat(unparsedTrimmed)
      .filter(Boolean).join(`

`);
    let [firstSender] = mapped_2;
    commonSender =
      firstSender !== undefined && mapped_2.every((name) => name === firstSender) ? firstSender : undefined;
    items = messages.map((message, index) => {
      let inkColor = toInkColor(message.color);
      let displayName = mapped_2[index] ?? UNKNOWN_SENDER;
      let summary = mapped_3[index] ?? "";
      let summaryNode = summary.trim()
        ? jsxProd_default_2(Box, {
            children: [
              jsxProd_default_2(Text, {
                color: inkColor,
                children: [
                  "@ ",
                  displayName,
                  jsxProd_default(Text, {
                    "aria-hidden": true,
                    children: figures_default.pointer,
                  }),
                ],
              }),
              jsxProd_default_2(Text, {
                children: [" ", summary],
              }),
            ],
          })
        : null;
      let taskNode =
        message.isVerified === false ? null : renderTaskRelatedMessage(message.content, displayName);
      if (taskNode) {
        return {
          kind: "panel",
          node: jsxProd_default_2(
            fragmentTypeExport,
            {
              children: [summaryNode, taskNode],
            },
            index,
          ),
        };
      }
      let idleFrame =
        message.isVerified === false
          ? null
          : parseFrameForDisplay(IdleNotificationMessageSchema(), message.content);
      if (idleFrame && !message.summary) {
        return {
          kind: "panel",
          node: jsxProd_default(
            TeammateResultMessage,
            {
              displayName,
              inkColor,
              idleReason: idleFrame.idleReason,
              failureReason: idleFrame.failureReason,
              summary: idleFrame.summary,
              completedTaskId: idleFrame.completedTaskId,
              result: idleFrame.result,
              expanded: transcriptMode,
            },
            index,
          ),
        };
      }
      let completedFrame =
        message.isVerified === false
          ? null
          : parseFrameForDisplay(TaskCompletedMessageSchema(), message.content);
      if (completedFrame) {
        let taskId = capIdFrameField(completedFrame.taskId, IDLE_ID_FIELD_RECEIVE_BOUND);
        let taskSubject = completedFrame.taskSubject
          ? capIdFrameField(completedFrame.taskSubject, IDLE_SUMMARY_RECEIVE_BOUND)
          : "";
        return {
          kind: "panel",
          node: jsxProd_default(
            TaskAssignmentMessage,
            {
              displayName,
              inkColor,
              summary,
              taskId,
              taskSubject,
            },
            index,
          ),
        };
      }
      return {
        kind: "text",
        displayName,
        senderName: mapped[index] ?? UNKNOWN_SENDER,
        isUnverified: message.isVerified === false,
        inkColor,
        content: capRawFrameTextForDisplay(message.content, message.teammateId),
        summary: followsLabel ? summary : message.summary,
      };
    });
    isSimple = items.length === 1 && items[0]?.kind === "text" && !unparsedTrimmed && !mapped_3[0]?.trim();
    $[0] = teammateColors;
    $[1] = followsLabel;
    $[2] = messages;
    $[3] = transcriptMode;
    $[4] = unparsedTrimmed;
    $[5] = plainText;
    $[6] = items;
    $[7] = commonSender;
    $[8] = isSimple;
  } else {
    plainText = $[5];
    items = $[6];
    commonSender = $[7];
    isSimple = $[8];
  }
  let isSimple_2 = isSimple;
  let senderProp;
  if ($[13] !== commonSender) {
    senderProp = commonSender !== undefined && {
      sender: {
        name: commonSender,
      },
    };
    $[13] = commonSender;
    $[14] = senderProp;
  } else senderProp = $[14];
  let draw;
  if (
    $[15] !== addMargin ||
    $[16] !== plainText ||
    $[17] !== expanded ||
    $[18] !== isSimple_2 ||
    $[19] !== items ||
    $[20] !== followsLabel ||
    $[21] !== unparsedTrimmed
  ) {
    draw = (text) =>
      jsxProd_default(TeammateMessageItems, {
        items:
          text !== plainText && isSimple_2
            ? items.map((item) =>
                item.kind === "text"
                  ? {
                      ...item,
                      content: text,
                    }
                  : item,
              )
            : items,
        unparsedTrimmed: text !== plainText && items.length === 0 ? text : unparsedTrimmed,
        expanded,
        labelView: followsLabel,
        addMargin: addMargin && !followsLabel,
      });
    $[15] = addMargin;
    $[16] = plainText;
    $[17] = expanded;
    $[18] = isSimple_2;
    $[19] = items;
    $[20] = followsLabel;
    $[21] = unparsedTrimmed;
    $[22] = draw;
  } else draw = $[22];
  let siteProps;
  if (
    $[23] !== plainText ||
    $[24] !== expanded ||
    $[25] !== messageId ||
    $[26] !== origin ||
    $[27] !== senderProp ||
    $[28] !== draw
  ) {
    siteProps = {
      messageId,
      stored: origin,
      text: plainText,
      isExpanded: expanded,
      ...senderProp,
      draw,
    };
    $[23] = plainText;
    $[24] = expanded;
    $[25] = messageId;
    $[26] = origin;
    $[27] = senderProp;
    $[28] = draw;
    $[29] = siteProps;
  } else siteProps = $[29];
  return BriefTimestampNamespace.useUserMessageSite(siteProps);
}
//@ chunk-ah34pb7m.js:93961-94605 placement
/**
 * 队友消息条目渲染。
 */
function TeammateMessageItems(props) {
  let $ = useMemoCache(11);
  let { items, unparsedTrimmed, expanded, labelView, addMargin } = props;
  const marginTop = addMargin ? 1 : 0;
  let itemsElement;
  if ($[0] !== expanded || $[1] !== items || $[2] !== labelView) {
    itemsElement = expanded
      ? items.map((item, index) =>
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
                  headerless: labelView && index === 0,
                },
                index,
              ),
        )
      : coalesceTeammateMessages(items).map(renderTeammateMessageItem);
    $[0] = expanded;
    $[1] = items;
    $[2] = labelView;
    $[3] = itemsElement;
  } else itemsElement = $[3];
  let unparsedElement;
  if ($[4] !== labelView || $[5] !== unparsedTrimmed) {
    unparsedElement =
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
    $[4] = labelView;
    $[5] = unparsedTrimmed;
    $[6] = unparsedElement;
  } else unparsedElement = $[6];
  let boxElement;
  if ($[7] !== marginTop || $[8] !== itemsElement || $[9] !== unparsedElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      width: "100%",
      children: [itemsElement, unparsedElement],
    });
    $[7] = marginTop;
    $[8] = itemsElement;
    $[9] = unparsedElement;
    $[10] = boxElement;
  } else boxElement = $[10];
  return boxElement;
}
//@ chunk-ah34pb7m.js:94605-95673 fingerprint (2.1.88 match: TeammateMessageContent, 0.583)
function TeammateMessageContent(props) {
  let $ = useMemoCache(23);
  let { displayName, inkColor, content, summary, labelView, headerless } = props;
  let labelViewFlag = labelView === undefined ? false : labelView;
  let headerlessFlag = headerless === undefined ? false : headerless;
  let items;
  if ($[0] !== content || $[1] !== labelViewFlag) {
    items = labelViewFlag
      ? jsxProd_default(CollapsibleText, {
          text: content,
        })
      : jsxProd_default(MarkdownText_2, {
          stripPromptTags: false,
          children: content,
        });
    $[0] = content;
    $[1] = labelViewFlag;
    $[2] = items;
  } else items = $[2];
  let itemsElement = items;
  if (headerlessFlag) {
    let summaryElement;
    if ($[3] !== summary) {
      summaryElement =
        summary &&
        jsxProd_default(Text, {
          children: summary,
        });
      $[3] = summary;
      $[4] = summaryElement;
    } else summaryElement = $[4];
    const headerElement = content && itemsElement;
    let bodyElement;
    if ($[5] !== summaryElement || $[6] !== headerElement) {
      bodyElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingLeft: 2,
        children: [summaryElement, headerElement],
      });
      $[5] = summaryElement;
      $[6] = headerElement;
      $[7] = bodyElement;
    } else bodyElement = $[7];
    return bodyElement;
  }
  let containerElement;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    containerElement = jsxProd_default(Text, {
      "aria-hidden": true,
      children: figures_default.pointer,
    });
    $[8] = containerElement;
  } else containerElement = $[8];
  let outerElement;
  if ($[9] !== displayName || $[10] !== inkColor) {
    outerElement = jsxProd_default_2(Text, {
      color: inkColor,
      children: ["@ ", displayName, containerElement],
    });
    $[9] = displayName;
    $[10] = inkColor;
    $[11] = outerElement;
  } else outerElement = $[11];
  let summaryElement;
  if ($[12] !== summary) {
    summaryElement =
      summary &&
      jsxProd_default_2(Text, {
        children: [" ", summary],
      });
    $[12] = summary;
    $[13] = summaryElement;
  } else summaryElement = $[13];
  let summaryText;
  if ($[14] !== outerElement || $[15] !== summaryElement) {
    summaryText = jsxProd_default_2(Box, {
      children: [outerElement, summaryElement],
    });
    $[14] = outerElement;
    $[15] = summaryElement;
    $[16] = summaryText;
  } else summaryText = $[16];
  let teammateContainer;
  if ($[17] !== itemsElement || $[18] !== content) {
    teammateContainer =
      content &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: itemsElement,
      });
    $[17] = itemsElement;
    $[18] = content;
    $[19] = teammateContainer;
  } else teammateContainer = $[19];
  let t6;
  if ($[20] !== summaryText || $[21] !== teammateContainer) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [summaryText, teammateContainer],
    });
    $[20] = summaryText;
    $[21] = teammateContainer;
    $[22] = t6;
  } else t6 = $[22];
  return t6;
}
export {
  unverifiedSenderLabel,
  coalesceTeammateMessages,
  hasNoDisplayableTeammateMessage,
  UserTeammateMessage,
  TeammateMessageContent,
  UNVERIFIED,
  parseTeammateMessages_2,
};
