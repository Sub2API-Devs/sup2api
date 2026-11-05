/**
 * utils/messages/nonUserMessages.ts
 *
 * 2.1.316 新增：非用户来源消息（插件、频道、对等会话等）的包装与分类
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (22)
 * attribution: placement 22
 */
import {
  toApprovalLabel,
  replaceLineBreaks,
  displayField,
} from "../permissions/approvalPayloadSerialization.js";
import { stripAnsi } from "../stripAnsi.js";
import { pluginMessagePrefix, PLUGIN_PROMPT_TEXTS } from "./pluginPrompts.js";
import { USER_SENT_MESSAGE_PREFIX } from "../../services/compact/compact.js";
import { SLACK_BOT, RELAY_SOURCE_KINDS } from "../../services/projectsRelay/relayConfig.js";
import { isChatHostEntrypoint } from "../entrypointKinds.js";
import {
  isWakeEnvelope,
  wrapCoordinatorMessage,
  ensurePeerHeader,
  wrapPeerMessage,
  wrapObserverReport,
} from "../crossSessionMessages.js";
import { isHumanOrUnset, isHumanOrAutoContinuation } from "../messageProvenance.js";
import {
  withScheduledTaskPrefix,
  withBackgroundTaskPrefix,
  withSystemNotificationPrefix,
} from "../../services/api/promptCacheBreakParts.js";
import { formatCoordinatorRelay } from "../../services/projects/threadRows.js";
import { tagPeerMessagePlugin } from "../peerMessageHeaders.js";
import { isIdleObservationFenceOn, getAutoModeSparseInstructions } from "../messages.js";
import { isTopHostSession } from "../sessionShape.js";
import {
  EXTERNAL_MESSAGE_PREFIX,
  EXTERNAL_RESPONSE_HINT,
  externalSourceWarning,
} from "../contextAttachments/externalMessages.js";
import { getTaskRunState } from "../task/taskNotifications.js";

//@ chunk-5xgkngpb.js:5192387-5192474 placement
/**
 * 绑定线程消息的表头说明与未命名来源标签。
 */
var UNNAMED_SOURCE_LABEL = `A message arrived in the bound thread while you were working:
`;
var UNNAMED = "unnamed";
//@ chunk-5xgkngpb.js:5192474-5192531 placement
/**
 * 取来源的展示标签（无标签时 "unnamed"）。
 */
function sourceLabel(origin) {
  let approvalLabel = toApprovalLabel(origin);
  return approvalLabel === null ? UNNAMED : String(approvalLabel);
}
//@ chunk-5xgkngpb.js:5192531-5192569 placement
/**
 * 取字段文本并去掉换行（单行展示）。
 */
function singleLineFieldText(field) {
  return replaceLineBreaks(displayField(field).text);
}
//@ chunk-5xgkngpb.js:5192569-5192666 placement
/**
 * 把文本清洗成单行作为 reason 对象（空则不返回字段）。
 */
function reasonFromText(rawText) {
  let text = displayField(
    stripAnsi(rawText ?? "")
      .replace(
        /\r\n/g,
        `
`,
      )
      .trim(),
  ).text;
  return text === ""
    ? {}
    : {
        reason: text,
      };
}
//@ chunk-5xgkngpb.js:5192666-5192712 placement
/**
 * 生成 "来源: 文本" 格式的一行说明。
 */
function formatSourceLine(origin, field) {
  return `${sourceLabel(origin)}: ${singleLineFieldText(field)}`;
}
//@ chunk-5xgkngpb.js:5192712-5193043 placement
/**
 * 包装插件提交的提示词：非回合中时加插件前缀与固定后缀；回合中时说明"插件在你工作时发来消息"及如何处理。
 */
function wrapPluginPrompt(text, name, options) {
  let label = sourceLabel(name);
  if (!options.midTurn) return pluginMessagePrefix(label) + text + PLUGIN_PROMPT_TEXTS;
  return (
    `The ${label} plugin sent a message while you were working:
${text}

This is how Claude Code surfaces prompts a plugin submits mid-turn ` +
    "\u2014 within the running turn, often alongside the next tool result. " +
    "Address the message above as you continue this turn."
  );
}
//@ chunk-5xgkngpb.js:5193043-5193308 placement
/**
 * 若用户消息是插件（非以用户身份）提交的包装提示，拆出插件名与原始文本。
 */
function extractPluginPrompt(message) {
  let { origin } = message;
  let content = message.message.content;
  if (origin?.kind !== "plugin" || origin.asUser === true || typeof content !== "string") return;
  let prefix = pluginMessagePrefix(sourceLabel(origin.name));
  return content.length > prefix.length + PLUGIN_PROMPT_TEXTS.length &&
    content.startsWith(prefix) &&
    content.endsWith(PLUGIN_PROMPT_TEXTS)
    ? {
        name: origin.name,
        text: content.slice(prefix.length, -PLUGIN_PROMPT_TEXTS.length),
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:5193308-5193677 placement
/**
 * 非用户来源消息的包装文案：绑定线程消息头、"非用户输入"标记，以及回合中用户消息的说明后缀。
 */
var BOUND_THREAD_MESSAGES_HEADER = `Messages arrived in the bound thread while you were working:
`;
var NON_USER_SOURCE_MARKER = `[MESSAGE FROM NON-USER SOURCE - NOT USER INPUT]
`;
var MID_TURN_USER_SUFFIX = `

This is how Claude Code surfaces messages the user sends mid-turn \u2014 within the running turn, often alongside the next tool result, rather than as a separate conversation turn. Address the message above as you continue this turn.`;
//@ chunk-5xgkngpb.js:5193677-5193718 placement
function wrapMidTurnUserMessage(text) {
  return `${USER_SENT_MESSAGE_PREFIX}${text}${MID_TURN_USER_SUFFIX}`;
}
//@ chunk-5xgkngpb.js:5193718-5193856 placement
/**
 * 若文本是"用户在你工作时发来消息"的包装，拆出原始文本，否则返回 undefined。
 */
function unwrapMidTurnUserMessage(content) {
  return content.length >= USER_SENT_MESSAGE_PREFIX.length + MID_TURN_USER_SUFFIX.length &&
    content.startsWith(USER_SENT_MESSAGE_PREFIX) &&
    content.endsWith(MID_TURN_USER_SUFFIX)
    ? content.slice(USER_SENT_MESSAGE_PREFIX.length, content.length - MID_TURN_USER_SUFFIX.length)
    : undefined;
}
//@ chunk-5xgkngpb.js:5193856-5193911 placement
/**
 * 为非用户来源文本加上非用户来源标记。
 */
function markNonUserSource(text) {
  return text.startsWith(NON_USER_SOURCE_MARKER) ? text : `${NON_USER_SOURCE_MARKER}${text}`;
}
//@ chunk-5xgkngpb.js:5193911-5194026 placement
function isSlackBotInbound(text, origin) {
  return (
    origin.inbound_origin === SLACK_BOT &&
    origin.activityObservation === undefined &&
    origin.hostInjected !== true &&
    isChatHostEntrypoint() &&
    isWakeEnvelope(text)
  );
}
//@ chunk-5xgkngpb.js:5194026-5195191 placement
/**
 * 判断一条消息的非用户来源（定时触发、项目中继、任务通知、频道、对等会话等）。
 */
function classifyNonUserMessageSource(text, origin, context) {
  if (context?.verifiedSlackHumanTurn && isHumanOrUnset(origin) && context?.isMeta !== true)
    return `${UNNAMED_SOURCE_LABEL}${text}`;
  if (origin === undefined && context?.isMeta === true) return markNonUserSource(text);
  switch (origin?.kind) {
    case "task-notification":
      return origin.subkind === "scheduled-trigger"
        ? withScheduledTaskPrefix(text)
        : origin.subkind === "projects-relay" && context?.hearthServerEnvelope === true
          ? formatCoordinatorRelay(text, {
              serverEnvelope: context.hearthJoinedTextBlocks !== true,
            })
          : context?.inHumanTurn === true
            ? withBackgroundTaskPrefix(text)
            : withSystemNotificationPrefix(text);
    case "coordinator":
      return wrapCoordinatorMessage(text);
    case "channel":
      return wrapSourceMessage(text, origin.server, {
        midTurn: true,
      });
    case "peer":
      if (context?.wholeMessage === true && isSlackBotInbound(text, origin))
        return ensurePeerHeader(text, {
          midTurn: true,
        });
      return wrapPeerMessage(tagPeerMessagePlugin(text, origin.plugin), {
        midTurn: true,
        activityObservation: origin.activityObservation,
        ...(origin.activityObservation !== undefined &&
          isIdleObservationFenceOn() && {
            allKindsTail: true,
          }),
        ...(origin.hostInjected &&
          (!isTopHostSession() || context?.sendMessageToolAbsent === true) && {
            hostInjected: true,
          }),
        ...(origin.senderTaskId !== undefined && {
          lineage: "descendant",
        }),
        ...(context?.sendMessageToolAbsent === true && {
          sendMessageToolAbsent: true,
        }),
      });
    case "slack-ping":
      return markNonUserSource(text);
    case "observer":
      return wrapObserverReport(text, origin.from, {
        midTurn: true,
      });
    case "unclassified":
      return markNonUserSource(text);
    case "observer-activity":
      return text;
    case "plugin":
      return origin.asUser === true
        ? wrapMidTurnUserMessage(text)
        : wrapPluginPrompt(text, origin.name, {
            midTurn: true,
          });
    case "auto-continuation":
    case "human":
    case undefined:
      return wrapMidTurnUserMessage(text);
    default: {
      let unknownOrigin = origin;
      return `${NON_USER_SOURCE_MARKER}${text}`;
    }
  }
}
//@ chunk-5xgkngpb.js:5195191-5195472 placement
/**
 * 判断消息来源是否是外部来源（其他会话、频道、观察者或 Slack 提醒）。
 */
function isExternalOrigin(origin) {
  switch (origin?.kind) {
    case "peer":
    case "channel":
    case "observer":
    case "slack-ping":
      return true;
    case "task-notification":
    case "coordinator":
    case "observer-activity":
    case "auto-continuation":
    case "plugin":
    case "human":
    case "unclassified":
    case undefined:
      return false;
    default: {
      let otherOrigin = origin;
      return false;
    }
  }
}
//@ chunk-5xgkngpb.js:5195472-5195612 placement
function wrapSourceMessage(text, server, options) {
  let header = options.midTurn
    ? `${EXTERNAL_MESSAGE_PREFIX}${server} while you were working:`
    : `${EXTERNAL_MESSAGE_PREFIX}${server}:`;
  let responseHint = options.midTurn ? EXTERNAL_RESPONSE_HINT : "";
  return `${header}
${text}

${externalSourceWarning(false)}${responseHint}`;
}
//@ chunk-5xgkngpb.js:5195612-5195893 placement
/**
 * 判断该来源的消息是否需要用"非用户输入"包装（外部来源、插件与未分类来源）。
 */
function needsNonUserWrapper(origin) {
  switch (origin?.kind) {
    case "peer":
    case "channel":
    case "observer":
    case "slack-ping":
    case "plugin":
    case "unclassified":
      return true;
    case "task-notification":
    case "coordinator":
    case "observer-activity":
    case "auto-continuation":
    case "human":
    case undefined:
      return false;
    default: {
      let otherOrigin = origin;
      return false;
    }
  }
}
//@ chunk-5xgkngpb.js:5195893-5196870 placement
/**
 * 包装非用户来源的消息，标明来源（频道、对等会话、插件等）。
 */
function wrapNonUserMessage(message, origin) {
  let wrap;
  if (origin.kind === "channel") return;
  else if (origin.kind === "peer") {
    let singleBlock = typeof message.message.content === "string" || message.message.content.length === 1;
    wrap = (text) => {
      if (singleBlock && isSlackBotInbound(text, origin))
        return ensurePeerHeader(text, {
          midTurn: false,
        });
      return wrapPeerMessage(tagPeerMessagePlugin(text, origin.plugin), {
        midTurn: false,
        activityObservation: origin.activityObservation,
        ...(origin.activityObservation !== undefined &&
          isIdleObservationFenceOn() && {
            allKindsTail: true,
          }),
        ...(origin.hostInjected &&
          !isTopHostSession() && {
            hostInjected: true,
          }),
        ...(origin.senderTaskId !== undefined && {
          lineage: "descendant",
        }),
      });
    };
  } else if (origin.kind === "slack-ping") wrap = (text) => markNonUserSource(text);
  else if (origin.kind === "observer")
    wrap = (text) =>
      wrapObserverReport(text, origin.from, {
        midTurn: false,
      });
  else if (origin.kind === "plugin") return;
  else if (origin.kind === "unclassified") wrap = markNonUserSource;
  if (!wrap) return;
  let content = message.message.content;
  if (typeof content === "string") message.message.content = wrap(content);
  else if (Array.isArray(content)) {
    if (origin.kind === "peer" || origin.kind === "slack-ping" || origin.kind === "unclassified")
      message.message.content = [
        {
          type: "text",
          text: wrap(
            content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(`
`),
          ),
        },
        ...content.filter((block) => block.type !== "text"),
      ];
    else for (let block of content) if (block.type === "text") block.text = wrap(block.text);
  }
}
//@ chunk-5xgkngpb.js:5196870-5197081 placement
/**
 * 给没有来源的用户消息补上来源（人类与自动续写除外；部分任务通知去掉 subkind）。
 */
function stampMissingOrigin(messages, origin) {
  if (isHumanOrAutoContinuation(origin)) return;
  let origin_2 =
    origin.kind === "task-notification" &&
    origin.subkind !== undefined &&
    RELAY_SOURCE_KINDS.has(origin.subkind)
      ? (({ subkind, ...rest }) => rest)(origin)
      : origin;
  for (let message of messages)
    if (message.type === "user" && message.origin === undefined && !getAutoModeSparseInstructions(message))
      message.origin = origin_2;
}
//@ chunk-5xgkngpb.js:5197081-5197157 placement
/**
 * 把消息列表中的用户消息标记为跳过附件。
 */
function markSkipAttachments(messages) {
  for (let message of messages) if (message.type === "user") message.queueSkipAttachments = true;
}
//@ chunk-5xgkngpb.js:5197157-5197225 placement
/**
 * 把消息列表中的用户消息标记为"非键入文本"。
 */
function markTextNotTyped(messages) {
  for (let message of messages) if (message.type === "user") message.textNotTyped = true;
}
//@ chunk-5xgkngpb.js:5197225-5197300 placement
/**
 * 把消息列表中的用户消息标记为只进转录。
 */
function markTranscriptOnly(messages) {
  for (let message of messages) if (message.type === "user") message.queueTranscriptOnly = true;
}
//@ chunk-5xgkngpb.js:5197300-5197474 placement
/**
 * 把任务投递信息附到指定（或第一条）用户消息上（任务输出已被读取时跳过）。
 */
function attachTaskDelivery(messages, taskDelivery, turnId) {
  if (getTaskRunState().bashTaskSnapshots.get(taskDelivery.taskId)?.fetched) return;
  let found = messages.find(
    (message) => message.type === "user" && (turnId === undefined || message.uuid === turnId),
  );
  if (found?.type === "user") found.taskDelivery = taskDelivery;
}
export {
  BOUND_THREAD_MESSAGES_HEADER,
  classifyNonUserMessageSource,
  isExternalOrigin,
  stampMissingOrigin,
  markSkipAttachments,
  markTextNotTyped,
  markTranscriptOnly,
  attachTaskDelivery,
  UNNAMED_SOURCE_LABEL,
  markNonUserSource,
  NON_USER_SOURCE_MARKER,
  needsNonUserWrapper,
  extractPluginPrompt,
  sourceLabel,
  wrapNonUserMessage,
  formatSourceLine,
  singleLineFieldText,
  unwrapMidTurnUserMessage,
  wrapPluginPrompt,
  reasonFromText,
};
