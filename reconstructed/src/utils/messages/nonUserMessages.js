/**
 * utils/messages/nonUserMessages.ts
 *
 * 2.1.316 新增：非用户来源消息（插件、频道、对等会话等）的包装与分类
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (22)
 * attribution: placement 22
 */
import {
  toApprovalLabel,
  replaceLineBreaks,
  displayField,
} from "../permissions/approvalPayloadSerialization.js";
import { stripAnsi } from "../stripAnsi.js";
import { pluginMessagePrefix, PLUGIN_PROMPT_TEXTS } from "./pluginPrompts.js";
import {
  USER_SENT_MESSAGE_PREFIX,
  isIdleObservationFenceOn,
  getAutoModeSparseInstructions,
} from "../messages.js";
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
import { isTopHostSession } from "../sessionShape.js";
import {
  EXTERNAL_MESSAGE_PREFIX,
  EXTERNAL_RESPONSE_HINT,
  externalSourceWarning,
} from "../contextAttachments/externalMessages.js";
import { getTaskRunState } from "../task/taskNotifications.js";

//@ chunk-e6aww6q8.js:5037262-5037349 placement
/**
 * 绑定线程消息的表头说明与未命名来源标签。
 */
var UNNAMED_SOURCE_LABEL = `A message arrived in the bound thread while you were working:
`;
var UNNAMED = "unnamed";
//@ chunk-e6aww6q8.js:5037349-5037406 placement
/**
 * 取来源的展示标签（无标签时 "unnamed"）。
 */
function sourceLabel(e) {
  let approvalLabel = toApprovalLabel(e);
  return approvalLabel === null ? UNNAMED : String(approvalLabel);
}
//@ chunk-e6aww6q8.js:5037406-5037444 placement
/**
 * 取字段文本并去掉换行（单行展示）。
 */
function singleLineFieldText(e) {
  return replaceLineBreaks(displayField(e).text);
}
//@ chunk-e6aww6q8.js:5037444-5037541 placement
/**
 * 把文本清洗成单行作为 reason 对象（空则不返回字段）。
 */
function reasonFromText(e) {
  let text = displayField(
    stripAnsi(e ?? "")
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
//@ chunk-e6aww6q8.js:5037541-5037587 placement
/**
 * 生成 "来源: 文本" 格式的一行说明。
 */
function formatSourceLine(e, n) {
  return `${sourceLabel(e)}: ${singleLineFieldText(n)}`;
}
//@ chunk-e6aww6q8.js:5037587-5037918 placement
/**
 * 包装插件提交的提示词：非回合中时加插件前缀与固定后缀；回合中时说明"插件在你工作时发来消息"及如何处理。
 */
function wrapPluginPrompt(e, name, r) {
  let s = sourceLabel(name);
  if (!r.midTurn) return pluginMessagePrefix(s) + e + PLUGIN_PROMPT_TEXTS;
  return (
    `The ${s} plugin sent a message while you were working:
${e}

This is how Claude Code surfaces prompts a plugin submits mid-turn ` +
    "\u2014 within the running turn, often alongside the next tool result. " +
    "Address the message above as you continue this turn."
  );
}
//@ chunk-e6aww6q8.js:5037918-5038183 placement
/**
 * 若用户消息是插件（非以用户身份）提交的包装提示，拆出插件名与原始文本。
 */
function extractPluginPrompt(e) {
  let { origin } = e;
  let content = e.message.content;
  if (origin?.kind !== "plugin" || origin.asUser === true || typeof content !== "string") return;
  let s = pluginMessagePrefix(sourceLabel(origin.name));
  return content.length > s.length + PLUGIN_PROMPT_TEXTS.length &&
    content.startsWith(s) &&
    content.endsWith(PLUGIN_PROMPT_TEXTS)
    ? {
        name: origin.name,
        text: content.slice(s.length, -PLUGIN_PROMPT_TEXTS.length),
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:5038183-5038552 placement
/**
 * 非用户来源消息的包装文案：绑定线程消息头、"非用户输入"标记，以及回合中用户消息的说明后缀。
 */
var BOUND_THREAD_MESSAGES_HEADER = `Messages arrived in the bound thread while you were working:
`;
var NON_USER_SOURCE_MARKER = `[MESSAGE FROM NON-USER SOURCE - NOT USER INPUT]
`;
var MID_TURN_USER_SUFFIX = `

This is how Claude Code surfaces messages the user sends mid-turn \u2014 within the running turn, often alongside the next tool result, rather than as a separate conversation turn. Address the message above as you continue this turn.`;
//@ chunk-e6aww6q8.js:5038552-5038593 placement
function wrapMidTurnUserMessage(e) {
  return `${USER_SENT_MESSAGE_PREFIX}${e}${MID_TURN_USER_SUFFIX}`;
}
//@ chunk-e6aww6q8.js:5038593-5038731 placement
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
//@ chunk-e6aww6q8.js:5038731-5038786 placement
/**
 * 为非用户来源文本加上非用户来源标记。
 */
function markNonUserSource(e) {
  return e.startsWith(NON_USER_SOURCE_MARKER) ? e : `${NON_USER_SOURCE_MARKER}${e}`;
}
//@ chunk-e6aww6q8.js:5038786-5038901 placement
function isSlackBotInbound(e, n) {
  return (
    n.inbound_origin === SLACK_BOT &&
    n.activityObservation === undefined &&
    n.hostInjected !== true &&
    isChatHostEntrypoint() &&
    isWakeEnvelope(e)
  );
}
//@ chunk-e6aww6q8.js:5038901-5040066 placement
/**
 * 判断一条消息的非用户来源（定时触发、项目中继、任务通知、频道、对等会话等）。
 */
function classifyNonUserMessageSource(e, n, r) {
  if (r?.verifiedSlackHumanTurn && isHumanOrUnset(n) && r?.isMeta !== true)
    return `${UNNAMED_SOURCE_LABEL}${e}`;
  if (n === undefined && r?.isMeta === true) return markNonUserSource(e);
  switch (n?.kind) {
    case "task-notification":
      return n.subkind === "scheduled-trigger"
        ? withScheduledTaskPrefix(e)
        : n.subkind === "projects-relay" && r?.hearthServerEnvelope === true
          ? formatCoordinatorRelay(e, {
              serverEnvelope: r.hearthJoinedTextBlocks !== true,
            })
          : r?.inHumanTurn === true
            ? withBackgroundTaskPrefix(e)
            : withSystemNotificationPrefix(e);
    case "coordinator":
      return wrapCoordinatorMessage(e);
    case "channel":
      return wrapSourceMessage(e, n.server, {
        midTurn: true,
      });
    case "peer":
      if (r?.wholeMessage === true && isSlackBotInbound(e, n))
        return ensurePeerHeader(e, {
          midTurn: true,
        });
      return wrapPeerMessage(tagPeerMessagePlugin(e, n.plugin), {
        midTurn: true,
        activityObservation: n.activityObservation,
        ...(n.activityObservation !== undefined &&
          isIdleObservationFenceOn() && {
            allKindsTail: true,
          }),
        ...(n.hostInjected &&
          (!isTopHostSession() || r?.sendMessageToolAbsent === true) && {
            hostInjected: true,
          }),
        ...(n.senderTaskId !== undefined && {
          lineage: "descendant",
        }),
        ...(r?.sendMessageToolAbsent === true && {
          sendMessageToolAbsent: true,
        }),
      });
    case "slack-ping":
      return markNonUserSource(e);
    case "observer":
      return wrapObserverReport(e, n.from, {
        midTurn: true,
      });
    case "unclassified":
      return markNonUserSource(e);
    case "observer-activity":
      return e;
    case "plugin":
      return n.asUser === true
        ? wrapMidTurnUserMessage(e)
        : wrapPluginPrompt(e, n.name, {
            midTurn: true,
          });
    case "auto-continuation":
    case "human":
    case undefined:
      return wrapMidTurnUserMessage(e);
    default: {
      let s = n;
      return `${NON_USER_SOURCE_MARKER}${e}`;
    }
  }
}
//@ chunk-e6aww6q8.js:5040066-5040347 placement
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
      let n = origin;
      return false;
    }
  }
}
//@ chunk-e6aww6q8.js:5040347-5040487 placement
function wrapSourceMessage(e, server, r) {
  let s = r.midTurn
    ? `${EXTERNAL_MESSAGE_PREFIX}${server} while you were working:`
    : `${EXTERNAL_MESSAGE_PREFIX}${server}:`;
  let h = r.midTurn ? EXTERNAL_RESPONSE_HINT : "";
  return `${s}
${e}

${externalSourceWarning(false)}${h}`;
}
//@ chunk-e6aww6q8.js:5040487-5040768 placement
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
      let n = origin;
      return false;
    }
  }
}
//@ chunk-e6aww6q8.js:5040768-5041745 placement
/**
 * 包装非用户来源的消息，标明来源（频道、对等会话、插件等）。
 */
function wrapNonUserMessage(userMessage, n) {
  let r;
  if (n.kind === "channel") return;
  else if (n.kind === "peer") {
    let h = typeof userMessage.message.content === "string" || userMessage.message.content.length === 1;
    r = (y) => {
      if (h && isSlackBotInbound(y, n))
        return ensurePeerHeader(y, {
          midTurn: false,
        });
      return wrapPeerMessage(tagPeerMessagePlugin(y, n.plugin), {
        midTurn: false,
        activityObservation: n.activityObservation,
        ...(n.activityObservation !== undefined &&
          isIdleObservationFenceOn() && {
            allKindsTail: true,
          }),
        ...(n.hostInjected &&
          !isTopHostSession() && {
            hostInjected: true,
          }),
        ...(n.senderTaskId !== undefined && {
          lineage: "descendant",
        }),
      });
    };
  } else if (n.kind === "slack-ping") r = (h) => markNonUserSource(h);
  else if (n.kind === "observer")
    r = (h) =>
      wrapObserverReport(h, n.from, {
        midTurn: false,
      });
  else if (n.kind === "plugin") return;
  else if (n.kind === "unclassified") r = markNonUserSource;
  if (!r) return;
  let content = userMessage.message.content;
  if (typeof content === "string") userMessage.message.content = r(content);
  else if (Array.isArray(content)) {
    if (n.kind === "peer" || n.kind === "slack-ping" || n.kind === "unclassified")
      userMessage.message.content = [
        {
          type: "text",
          text: r(
            content.flatMap((h) => (h.type === "text" ? [h.text] : [])).join(`
`),
          ),
        },
        ...content.filter((h) => h.type !== "text"),
      ];
    else for (let h of content) if (h.type === "text") h.text = r(h.text);
  }
}
//@ chunk-e6aww6q8.js:5041745-5041956 placement
/**
 * 给没有来源的用户消息补上来源（人类与自动续写除外；部分任务通知去掉 subkind）。
 */
function stampMissingOrigin(e, n) {
  if (isHumanOrAutoContinuation(n)) return;
  let origin =
    n.kind === "task-notification" && n.subkind !== undefined && RELAY_SOURCE_KINDS.has(n.subkind)
      ? (({ subkind, ...h }) => h)(n)
      : n;
  for (let s of e)
    if (s.type === "user" && s.origin === undefined && !getAutoModeSparseInstructions(s)) s.origin = origin;
}
//@ chunk-e6aww6q8.js:5041956-5042032 placement
/**
 * 把消息列表中的用户消息标记为跳过附件。
 */
function markSkipAttachments(e) {
  for (let n of e) if (n.type === "user") n.queueSkipAttachments = true;
}
//@ chunk-e6aww6q8.js:5042032-5042100 placement
/**
 * 把消息列表中的用户消息标记为"非键入文本"。
 */
function markTextNotTyped(e) {
  for (let n of e) if (n.type === "user") n.textNotTyped = true;
}
//@ chunk-e6aww6q8.js:5042100-5042175 placement
/**
 * 把消息列表中的用户消息标记为只进转录。
 */
function markTranscriptOnly(e) {
  for (let n of e) if (n.type === "user") n.queueTranscriptOnly = true;
}
//@ chunk-e6aww6q8.js:5042175-5042349 placement
/**
 * 把任务投递信息附到指定（或第一条）用户消息上（任务输出已被读取时跳过）。
 */
function attachTaskDelivery(e, taskDelivery, turnId) {
  if (getTaskRunState().bashTaskSnapshots.get(taskDelivery.taskId)?.fetched) return;
  let found = e.find((h) => h.type === "user" && (turnId === undefined || h.uuid === turnId));
  if (found?.type === "user") found.taskDelivery = taskDelivery;
}
export {
  BOUND_THREAD_MESSAGES_HEADER,
  classifyNonUserMessageSource,
  sourceLabel,
  singleLineFieldText,
  formatSourceLine,
  UNNAMED_SOURCE_LABEL,
  unwrapMidTurnUserMessage,
  stampMissingOrigin,
  markSkipAttachments,
  markTextNotTyped,
  markTranscriptOnly,
  attachTaskDelivery,
  isExternalOrigin,
  markNonUserSource,
  NON_USER_SOURCE_MARKER,
  needsNonUserWrapper,
  wrapNonUserMessage,
  wrapPluginPrompt,
  extractPluginPrompt,
  reasonFromText,
};
