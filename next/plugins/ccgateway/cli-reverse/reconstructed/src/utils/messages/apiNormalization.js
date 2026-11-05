/**
 * utils/messages/apiNormalization.ts
 *
 * 2.1.316 新增：发往 API 前的消息规范化
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (69), chunk-nt9amew5.js (2)
 * attribution: placement 68, layout 1, affinity 2
 */
import { createHash, randomUUID } from "crypto";
import { isValidReminderId, parseReminderHeader, escapeBareReminderOpen } from "../systemReminder.js";
import {
  parseForwardedQueuedCommand,
  turnKey,
  getForwardedTurnKind,
  ISO_TIMESTAMP_RE,
  getSourceAttributionLabel,
  isProjectsRelay,
  classifyMessageFrame,
  isLegacyHearthRelayMessage,
  isVerifiedSlackHuman,
  isUnclassifiedProvenance,
} from "../messageProvenance.js";
import {
  MAX_ID_LIST_LENGTH,
  MAX_MCP_RULE_LENGTH,
  classifierExtraContextSchema,
} from "../permissions/serverClassifier/schemas.js";
import { isBareMode } from "../envUtils.js";
import {
  isInterruptionOnlyMessage,
  stripTrailingMessageIdTag,
  TRAILING_WHITESPACE_CHARS,
  INTERRUPT_TEXTS,
  SYNTHETIC_MODEL,
} from "../messages.js";
import { isHumanOrigin, isNonTypedInput } from "../turnOrigin.js";
import { IMAGE_MARKER_PREFIX, IMAGE_SOURCE_MARKER_PREFIX } from "../imageErrors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { normalizeFullWidthSpace, takeLastChars, truncateToLength } from "../stringUtils.js";
import { isSnugWallOn } from "../permissions/serverClassifier/context.js";
import { isVirtualConversationMessage, isSystemLocalCommandMessage } from "../../bootstrap/sessionSlices.js";
import { formatCoordinatorRelayMessages } from "../../services/projects/threadRows.js";
import { logCronTextDropped } from "../cronFireTexts.js";
import { logError } from "../log.js";
import {
  COMMAND_MESSAGE,
  COMMAND_NAME,
  COMMAND_ARGS,
  SKILL_FORMAT,
  COMMAND_CONTENTS,
  BASH_INPUT,
} from "../../constants/xml.js";
import { getAutoModeConfigOrDefault } from "../permissions/permissionSetup.js";
import { getIsInteractive } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { getLatchedPreSettingsEnvSnapshot } from "../managedEnvApply.js";
import { isChildSession, isClaudecodeSession } from "../sessionShape.js";
import { isTeammate, isModelDrivenSession } from "../teammate.js";
import { contextSectionsSchema } from "../transcript/resumeAnnouncements.js";
import { arraysEqual as arraysEqual_2 } from "../collections.js";
import { MESSAGE_MARK_SYMBOLS } from "../messageKinds.js";
import { answerOf } from "../../plugins/functionHooks/promptAttachmentHooks.js";
import { identity as identity_2 } from "../identity.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { attachRelayTurnFlags } from "../../services/projectsRelay/relayConfig.js";
import { isChatHostEntrypoint } from "../entrypointKinds.js";
import { normalizeDeliveredPeers } from "../pollEvents.js";
import { listsHumanReplies } from "../permissions/serverClassifier/fallbackNotice.js";
import { isNarrationThinking } from "../../services/api/narrationClassifier.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nt9amew5.js:13154-14138 placement
function describeForwardedTurns(content, messagesForAPI) {
  let descriptions = new Map();
  let seenReminderIds = new Set();
  let reminderByTurn = new Map();
  for (let message of content) {
    if (message.type !== "attachment" || message.attachment.type !== "queued_command") continue;
    let { attachment } = message;
    let reminderId = attachment.reminderId;
    if (isValidReminderId(reminderId)) seenReminderIds.add(reminderId);
    let turn = parseForwardedQueuedCommand(attachment);
    if (turn !== undefined) {
      let turn_2 = turnKey(turn);
      descriptions.delete(reminderByTurn.get(turn_2) ?? "");
      reminderByTurn.set(turn_2, isValidReminderId(reminderId) ? reminderId : "");
    }
    if (!isValidReminderId(reminderId) || descriptions.has(reminderId) || attachment.renderedByBatchHead)
      continue;
    let forwardedTurnKind = getForwardedTurnKind(attachment);
    if (forwardedTurnKind === undefined) continue;
    if (forwardedTurnKind === "forwarded_turn") {
      if (turn === undefined) continue;
      let timestamp =
        turn.source === "owner" &&
        turn.timestamp !== undefined &&
        turn.timestamp.length <= MAX_ID_LIST_LENGTH &&
        ISO_TIMESTAMP_RE.test(turn.timestamp)
          ? turn.timestamp
          : undefined;
      descriptions.set(reminderId, {
        provenance: forwardedTurnKind,
        author: getSourceAttributionLabel(turn.source),
        ...(timestamp !== undefined && {
          written: timestamp,
        }),
      });
    } else
      descriptions.set(reminderId, {
        provenance: forwardedTurnKind,
      });
  }
  if (descriptions.size === 0) return [];
  let result = [];
  let handledIds = new Set();
  for (let message of messagesForAPI) {
    if (message.type !== "user") continue;
    let content = message.message.content;
    let texts =
      typeof content === "string"
        ? [content]
        : content.flatMap((block) => (block.type === "text" ? [block.text] : []));
    for (let text of texts) {
      let reminderHeader = parseReminderHeader(text);
      if (reminderHeader === undefined || handledIds.has(reminderHeader)) continue;
      let description = descriptions.get(reminderHeader);
      if (description === undefined) continue;
      handledIds.add(reminderHeader);
      result.push({
        id: reminderHeader,
        ...description,
      });
    }
  }
  return result.length > MAX_MCP_RULE_LENGTH ? result.slice(result.length - MAX_MCP_RULE_LENGTH) : result;
}
//@ chunk-nt9amew5.js:14138-14338 placement
/**
 * 解析分类器请求附带的数据：request 为非空字符串且 context 通过 schema 校验时返回，否则 undefined。
 */
function parseClassifierRequest(serverClassifierContext) {
  if (typeof serverClassifierContext !== "object" || serverClassifierContext === null) return;
  let { request, context } = serverClassifierContext;
  if (typeof request !== "string" || request.length === 0) return;
  let parsedContext = classifierExtraContextSchema().safeParse(context);
  return parsedContext.success
    ? {
        request,
        context: parsedContext.data,
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:139981-140087 placement
/**
 * 精简（bare）模式下丢弃除队列命令与 poll 事件外的所有附件。
 */
function isBareModeAttachmentDropped(message) {
  if (!isBareMode()) return false;
  let { type: attachmentType } = message.attachment;
  return attachmentType !== "queued_command" && attachmentType !== "poll_events";
}
//@ chunk-5xgkngpb.js:140087-140472 placement (2.1.88 match: selectableUserMessagesFilter, 0.75)
/**
 * 从某位置往前看，最近一条有意义的消息是否是人类亲自输入的用户消息（遇到助手、工具结果、压缩摘要、中断或非白名单元消息则为否）。
 */
function isAfterHumanTurn(messages, endIndex = messages.length) {
  for (let idx = Math.min(endIndex, messages.length) - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message === undefined) continue;
    if (message.type === "assistant") return false;
    if (message.type !== "user") continue;
    if (
      message.toolUseResult !== undefined ||
      message.isCompactSummary === true ||
      isInterruptionOnlyMessage(message)
    )
      return false;
    if (message.isVisibleInTranscriptOnly === true) continue;
    if (message.isMeta === true) {
      if (isHarmlessMetaMessage(message)) continue;
      return false;
    }
    return isHumanOrigin(message.origin) && message.verifiedSlackHumanTurn !== true;
  }
  return false;
}
//@ chunk-5xgkngpb.js:140472-140662 placement
function isHarmlessMetaMessage(message) {
  let content = message.message.content;
  return (
    message.origin === undefined &&
    message.promptSource === undefined &&
    Array.isArray(content) &&
    content.length > 0 &&
    content.every(
      (block) =>
        block.type === "text" && typeof block.text === "string" && isTaskNotificationText(block.text),
    )
  );
}
//@ chunk-5xgkngpb.js:140662-140758 placement
function isTaskNotificationText(text) {
  return (
    (text.startsWith(IMAGE_MARKER_PREFIX) || text.startsWith(IMAGE_SOURCE_MARKER_PREFIX)) &&
    text.endsWith("]") &&
    !text.includes(`
`)
  );
}
//@ chunk-5xgkngpb.js:140758-141097 placement
/**
 * 收集紧跟在人类回合之后的任务通知类队列命令附件 uuid（排除定时触发与 Projects 中继）。
 */
function collectTaskNotificationsAfterHuman(messages) {
  let uuids;
  for (let idx = 0; idx < messages.length; idx++) {
    let message = messages[idx];
    if (message.type !== "attachment" || message.attachment.type !== "queued_command") continue;
    let origin = message.attachment.origin;
    if (
      (origin != null
        ? origin.kind === "task-notification" &&
          origin.subkind !== "scheduled-trigger" &&
          !isProjectsRelay(origin)
        : message.attachment.commandMode === "task-notification") &&
      isAfterHumanTurn(messages, idx)
    )
      (uuids ??= new Set()).add(message.uuid);
  }
  return uuids ?? NO_NOTIFICATION_UUIDS;
}
//@ chunk-5xgkngpb.js:141097-141113 placement
var NO_NOTIFICATION_UUIDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:141097", () => {
  NO_NOTIFICATION_UUIDS = new Set();
});
//@ chunk-5xgkngpb.js:141113-141172 placement
var TENGU_VELVETY_RIPPLE = "tengu_velvety_ripple";
var TENGU_LEXICAL_CRYSTAL = "tengu_lexical_crystal";
//@ chunk-5xgkngpb.js:141172-141204 placement
/**
 * 判断 tengu_velvety_ripple 是否开启（默认关）。
 */
function isVelvetyRippleOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVETY_RIPPLE, false);
}
//@ chunk-5xgkngpb.js:141204-141236 placement
/**
 * 判断 tengu_lexical_crystal 是否开启（默认开）。
 */
function isLexicalCrystalOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LEXICAL_CRYSTAL, true);
}
//@ chunk-5xgkngpb.js:2559642-2559770 placement
function hashInsertedText(text, message) {
  let normalized = normalizeFullWidthSpace(text);
  return createHash("sha256")
    .update(
      `${Buffer.byteLength(normalized)}:${normalized}${normalizeFullWidthSpace(stripTrailingMessageIdTag(message))}`,
    )
    .digest("hex")
    .slice(0, 32);
}
//@ chunk-5xgkngpb.js:2559770-2559917 placement
/**
 * 取出消息内容中的文本块（字符串内容视为一个文本块）。
 */
function getTextBlocks(content) {
  if (typeof content === "string") return [content];
  return Array.isArray(content)
    ? content.flatMap((block) =>
        block?.type === "text" && typeof block.text === "string" ? [block.text] : [],
      )
    : [];
}
//@ chunk-5xgkngpb.js:2559917-2560014 placement
function isSystemReminderText(text) {
  let charAfterTag = text.charAt(16);
  return (
    text.startsWith("<system-reminder") &&
    (charAfterTag === ">" || TRAILING_WHITESPACE_CHARS.has(charAfterTag))
  );
}
//@ chunk-5xgkngpb.js:2560014-2560263 placement
function classifyInsertedTextKind(localMessage) {
  if (localMessage.wakeupSource !== undefined) return "timer";
  if (localMessage.type !== "user") return "asTyped";
  let frame = classifyMessageFrame(localMessage);
  if (frame.frame === "human" || frame.frame === "relay-human") return "asTyped";
  return frame.frame === "invisible" && frame.reason === "meta-without-provenance" ? "hidden" : undefined;
}
//@ chunk-5xgkngpb.js:2560263-2560300 placement
var COMMAND_TEXT_RANK = {
  hidden: 0,
  asTyped: 1,
  timer: 2,
};
//@ chunk-5xgkngpb.js:2560300-2560424 placement
/**
 * 有命令文本时给消息附上命令文本块计数（本条与全部）。
 */
function withCommandTextBlocks(userMessage, commandContent, ownContent) {
  return getTextBlocks(commandContent).length > 0
    ? {
        ...userMessage,
        commandTextBlocks: {
          own: getTextBlocks(ownContent).length,
          all: getTextBlocks(userMessage.message.content).length,
        },
      }
    : userMessage;
}
//@ chunk-5xgkngpb.js:2560424-2560589 placement
function countHiddenCommandBlocks(localMessage, allTextBlocks) {
  let commandTextBlocks = localMessage.commandTextBlocks;
  if (commandTextBlocks === undefined) return 0;
  return commandTextBlocks?.all === allTextBlocks.length &&
    Number.isSafeInteger(commandTextBlocks.own) &&
    commandTextBlocks.own >= 0 &&
    commandTextBlocks.own < commandTextBlocks.all
    ? commandTextBlocks.all - commandTextBlocks.own
    : allTextBlocks.length;
}
//@ chunk-5xgkngpb.js:2560589-2560646 placement
function takeLast(items, count) {
  return items.slice(Math.max(0, items.length - count));
}
//@ chunk-5xgkngpb.js:2560646-2560759 placement
function toolUseIdsOf(content) {
  return Array.isArray(content)
    ? content.flatMap((block) =>
        block?.type === "tool_use" && typeof block.id === "string" ? [block.id] : [],
      )
    : [];
}
//@ chunk-5xgkngpb.js:2560759-2562448 placement
/**
 * 为发给 API 的用户文本标注出处：找出本地记录里由定时器唤醒或隐藏的元消息插入的文本，按位置哈希在线上消息中定位，追加 inserted_text_at 出处条目（受列表上限约束）；未匹配时打点；出错返回原列表。
 */
function markInsertedTextProvenance(provenance, localMessages, wireMessages) {
  try {
    if (!isSnugWallOn()) return provenance;
    let wireToolIds = new Set(
      wireMessages.flatMap((wireMessage) =>
        wireMessage.type === "assistant" ? toolUseIdsOf(wireMessage.message.content) : [],
      ),
    );
    let kindByHash = new Map();
    let timerHashes = [];
    let seenToolIds = new Set();
    let localToolId = "";
    for (let localMessage of localMessages) {
      if (isVirtualConversationMessage(localMessage)) continue;
      if (localMessage.type === "assistant") {
        for (let toolUseId of toolUseIdsOf(localMessage.message?.content))
          if (wireToolIds.has(toolUseId)) {
            localToolId = toolUseId;
            seenToolIds.add(toolUseId);
          }
      } else if (localMessage.type === "user" || isSystemLocalCommandMessage(localMessage)) {
        let kind = classifyInsertedTextKind(localMessage);
        if (kind === undefined) continue;
        let textBlocks = getTextBlocks(
          localMessage.type === "user" ? localMessage.message?.content : localMessage.content,
        );
        let texts =
          localMessage.type === "user" && isLegacyHearthRelayMessage(localMessage)
            ? [formatCoordinatorRelayMessages(textBlocks)]
            : textBlocks;
        let hiddenCount =
          kind === "hidden" && localMessage.type === "user"
            ? countHiddenCommandBlocks(localMessage, texts)
            : 0;
        for (let [blockIndex, blockText] of texts.entries()) {
          let textKind = blockIndex < hiddenCount ? "asTyped" : kind;
          let message = localMessage.type === "user" ? escapeBareReminderOpen(blockText) : blockText;
          if (INTERRUPT_TEXTS.has(stripTrailingMessageIdTag(message)) || isSystemReminderText(message))
            continue;
          let hashes = [
            hashInsertedText(localToolId, message),
            hashInsertedText(
              localToolId,
              `${message}
[id:0]`,
            ),
          ];
          for (let hash of hashes) {
            let existingKind = kindByHash.get(hash);
            if (existingKind === undefined || COMMAND_TEXT_RANK[existingKind] < COMMAND_TEXT_RANK[textKind])
              kindByHash.set(hash, textKind);
          }
          if (textKind === "timer") timerHashes.push(hashes);
        }
      }
    }
    if (![...kindByHash.values()].some((kind) => kind !== "asTyped")) return provenance;
    let matchedHashes = new Set();
    let matched = {
      hidden: new Set(),
      timer: new Set(),
    };
    let lastSharedToolId = "";
    let wireToolId = "";
    for (let wireMessage of wireMessages)
      if (wireMessage.type === "assistant") {
        for (let toolUseId of toolUseIdsOf(wireMessage.message.content)) {
          wireToolId = toolUseId;
          if (seenToolIds.has(toolUseId)) lastSharedToolId = toolUseId;
        }
      } else if (wireMessage.type === "user")
        for (let blockText of getTextBlocks(wireMessage.message.content)) {
          if (isSystemReminderText(blockText)) continue;
          let hash = hashInsertedText(lastSharedToolId, blockText);
          let kind = kindByHash.get(hash);
          if (kind === "timer" || kind === "hidden") {
            matchedHashes.add(hash);
            let matchedHash =
              wireToolId === lastSharedToolId ? hash : hashInsertedText(wireToolId, blockText);
            matched[kind].delete(matchedHash);
            matched[kind].add(matchedHash);
          }
        }
    if (timerHashes.some((timerPair) => !matchedHashes.has(timerPair[0]) && !matchedHashes.has(timerPair[1])))
      logCronTextDropped("text_not_sent");
    let matchedIds = [...matched.hidden, ...matched.timer];
    if (matchedIds.length === 0) return provenance;
    let filtered = provenance.filter(
      (entry) => !matched.hidden.has(entry.id) && !matched.timer.has(entry.id),
    );
    if (matchedIds.length + filtered.length > MAX_MCP_RULE_LENGTH) logCronTextDropped("list_capped");
    let timerIds = takeLast([...matched.timer], MAX_MCP_RULE_LENGTH);
    let remainingSlots = MAX_MCP_RULE_LENGTH - timerIds.length;
    let min = Math.min(filtered.length, MAX_MCP_RULE_LENGTH / 2);
    let hiddenIds = takeLast([...matched.hidden], remainingSlots - min);
    return [
      ...takeLast(filtered, remainingSlots - hiddenIds.length),
      ...[...hiddenIds, ...timerIds].map((id) => ({
        id,
        provenance: "inserted_text_at",
      })),
    ];
  } catch (error) {
    logError(error);
    logCronTextDropped("list_failed");
    return provenance;
  }
}
//@ chunk-5xgkngpb.js:2562486-2562513 placement
var COMMAND_MESSAGE_TAGS; // deferred: uses COMMAND_NAME (../../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2562486", () => {
  COMMAND_MESSAGE_TAGS = [COMMAND_MESSAGE, COMMAND_NAME, COMMAND_ARGS, SKILL_FORMAT, COMMAND_CONTENTS];
});
//@ chunk-5xgkngpb.js:2562513-2563142 placement
/**
 * 解析斜杠命令消息文本里的标签（command-name/args/message/contents/skill-format 等），每种标签至多一次、只允许已知标签；返回命令名、参数、完整行、消息、内容与是否技能格式。
 */
function parseCommandMessage(text) {
  let tagRe = /<([a-z-]+)>([\s\S]*?)<\/\1>/y;
  let regExp = new RegExp(`<${COMMAND_ARGS}>([\\s\\S]*)</${COMMAND_ARGS}>\\s*$`, "y");
  let tags = new Map();
  let pos = skipWhitespace(text, 0);
  while (pos < text.length) {
    regExp.lastIndex = pos;
    tagRe.lastIndex = pos;
    let match = regExp.exec(text);
    let tagMatch = match ? null : tagRe.exec(text);
    let tagName = match ? COMMAND_ARGS : tagMatch?.[1];
    let tagContent = match ? match[1] : tagMatch?.[2];
    if (
      tagName === undefined ||
      tagContent === undefined ||
      !COMMAND_MESSAGE_TAGS.includes(tagName) ||
      tags.has(tagName)
    )
      return null;
    tags.set(tagName, tagContent);
    pos = skipWhitespace(text, match ? text.length : tagRe.lastIndex);
  }
  let trimmed = tags.get(COMMAND_NAME)?.trim();
  let skillFormat = tags.get(SKILL_FORMAT);
  if (!trimmed || (skillFormat ?? "true") !== "true") return null;
  let args = tags.get(COMMAND_ARGS)?.trim() ?? "";
  let trimmed_2 = tags.get(COMMAND_MESSAGE)?.trim();
  let trimmed_3 = tags.get(COMMAND_CONTENTS)?.trim();
  return {
    name: trimmed,
    args,
    line: `${trimmed} ${args}`.trim(),
    ...(trimmed_2 !== undefined && {
      message: trimmed_2,
    }),
    ...(trimmed_3 !== undefined && {
      contents: trimmed_3,
    }),
    isSkillFormat: skillFormat !== undefined,
  };
}
//@ chunk-5xgkngpb.js:2563142-2563228 placement
function messageRedundantWithName(command) {
  let { message, name } = command;
  return message !== undefined && message !== "" && message !== name && `/${message}` !== name;
}
//@ chunk-5xgkngpb.js:2563228-2563281 placement
/**
 * 找出最后一条可用的斜杠命令消息。
 */
function lastCommandMessageParsed(content) {
  let commandMessage = parseCommandMessage(content);
  return commandMessage && isUsableCommandMessage(commandMessage) ? commandMessage : null;
}
//@ chunk-5xgkngpb.js:2563281-2563378 placement
/**
 * 判断解析出的命令消息是否可用（有 message、与 name 不同、非技能参数）。
 */
function isUsableCommandMessage(command) {
  return (
    !!command.message &&
    !messageRedundantWithName(command) &&
    command.contents === undefined &&
    !(command.isSkillFormat && command.args !== "")
  );
}
//@ chunk-5xgkngpb.js:2563378-2563490 layout
function commandMessageText(record) {
  return record.isSkillFormat
    ? `Skill(${record.message})`
    : `/${[record.message, record.args].filter(Boolean).join(" ")}`;
}
//@ chunk-5xgkngpb.js:2563490-2563592 placement
/**
 * 从后往前找出最后一个可解析为命令的消息内容。
 */
function findLastCommandMessage(content) {
  let contentTexts = getContentTexts(content);
  for (let idx = contentTexts.length - 1; idx >= 0; idx--) {
    let commandMessage = parseCommandMessage(contentTexts[idx]);
    if (commandMessage) return commandMessage;
  }
  return null;
}
//@ chunk-5xgkngpb.js:2563592-2563670 placement
/**
 * 判断文本（跳过前导空白后）是否以命令标签开头。
 */
function startsWithCommandTag(text) {
  let start = skipWhitespace(text, 0);
  return COMMAND_MESSAGE_TAGS.some((tag) => text.startsWith(`<${tag}>`, start));
}
//@ chunk-5xgkngpb.js:2563670-2563853 placement
/**
 * 若最后一条文本是 <bash-input> 包裹的内容，取出其中的命令，否则返回 null。
 */
function extractBashInput(message) {
  let openTag = `<${BASH_INPUT}>`;
  let closeTag = `</${BASH_INPUT}>`;
  let text = getContentTexts(message).at(-1)?.trim() ?? "";
  return text.length >= openTag.length + closeTag.length &&
    text.startsWith(openTag) &&
    text.endsWith(closeTag)
    ? text.slice(openTag.length, text.length - closeTag.length)
    : null;
}
//@ chunk-5xgkngpb.js:2563853-2563918 placement
function skipWhitespace(text, start) {
  while (start < text.length && /\s/.test(text[start])) start++;
  return start;
}
//@ chunk-5xgkngpb.js:2563918-2564064 placement
function getContentTexts(content) {
  if (typeof content === "string") return [content];
  return !Array.isArray(content)
    ? []
    : content.flatMap((block) =>
        block.type === "text" && typeof block.text === "string" ? [block.text] : [],
      );
}
//@ chunk-5xgkngpb.js:2564064-2564077 placement
var MAX_COMMAND_TEXT_CHARS = 1024;
//@ chunk-5xgkngpb.js:2564077-2564229 placement
function hashVouchedText(lastSentCall, earlier, earlierCount, sent) {
  let normalizedSent = normalizeFullWidthSpace(lastSentCall);
  return createHash("sha256")
    .update(
      `vouched_text:${Buffer.byteLength(normalizedSent)}:${normalizedSent}#${earlier}/${earlierCount}:${normalizeFullWidthSpace(sent)}`,
    )
    .digest("hex")
    .slice(0, 32);
}
//@ chunk-5xgkngpb.js:2564229-2567920 placement
/**
 * 把上下文分段附件组装成发给 API 的消息。
 */
function buildContextSectionsMessage(block, messagesForAPI, attachmentToMessages) {
  try {
    if (getAutoModeConfigOrDefault().typedMarks !== true) return;
    if (!getIsInteractive())
      return {
        unknown: "headless",
      };
    if (env.CLAUDE_CODE_SESSION_KIND !== undefined)
      return {
        unknown: "background",
      };
    let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
    if (
      isChildSession() ||
      (isClaudecodeSession() &&
        ((latchedPreSettingsEnvSnapshot === undefined
          ? env.CLAUDE_CODE_SKIP_PROMPT_HISTORY
          : latchedPreSettingsEnvSnapshot.CLAUDE_CODE_SKIP_PROMPT_HISTORY !== undefined) ||
          (!process.stdin.isTTY && !process.stdout.isTTY)))
    )
      return {
        unknown: "nested",
      };
    let isTeammateSession = isTeammate();
    let instructionTexts = new Map();
    let instructionsTrusted = true;
    for (let message of block) {
      if (message.type !== "attachment") continue;
      if (
        message.attachment.type === "context_sections" &&
        contextSectionsSchema()
          .safeParse(message.attachment)
          .data?.sections.some((section) => section.name === "claudeMd")
      )
        instructionsTrusted = false;
      if (message.attachment.type === "instructions") {
        let flattened = attachmentToMessages(message).messages.flatMap((message) =>
          getTextBlocks(message.message.content),
        );
        if (!arraysEqual_2(message[MESSAGE_MARK_SYMBOLS]?.texts, flattened)) {
          instructionsTrusted = false;
          continue;
        }
        if ((answerOf(message.uuid)?.kind ?? "engine") !== "engine") instructionsTrusted = false;
        instructionTexts.set(message, flattened);
      }
    }
    let firstMessage = block[0];
    if (firstMessage?.type === "user" && firstMessage.userContextReminder === true)
      instructionsTrusted = false;
    let instructionTextSet = new Set([...instructionTexts.values()].flat().map((text) => text.trimEnd()));
    let groupByToolId = new Map();
    for (let wireMessage of messagesForAPI) {
      let toolUseIds = wireMessage.type === "assistant" ? toolUseIdsOf(wireMessage.message.content) : [];
      for (let toolUseId of toolUseIds) groupByToolId.set(toolUseId, toolUseIds[0]);
    }
    let sentToolIds = new Set();
    let kindsByHash = new Map();
    let instructionHashes = new Set();
    let typedCandidateCount = 0;
    let typedOrCommandCount = 0;
    let lastSentToolId = "";
    for (let message of block) {
      if (isVirtualConversationMessage(message)) continue;
      let texts = [];
      let kind;
      let markTexts;
      let instructionTextList = instructionTexts.get(message);
      if (instructionTextList !== undefined) {
        texts = instructionTextList;
        kind = "instructions";
      } else if (message.type === "assistant")
        for (let toolUseId of toolUseIdsOf(message.message?.content)) {
          let groupToolId = groupByToolId.get(toolUseId);
          if (groupToolId !== undefined) {
            lastSentToolId = groupToolId;
            sentToolIds.add(groupToolId);
          }
        }
      else if (isSystemLocalCommandMessage(message)) texts = getTextBlocks(message.content);
      else if (message.type === "user") {
        let frame = classifyMessageFrame(message);
        if (frame.frame === "relay-human")
          return {
            unknown: "relay",
          };
        if (message.origin?.kind !== "task-notification")
          texts = getTextBlocks(message.message?.content).map(escapeBareReminderOpen);
        let marks = message[MESSAGE_MARK_SYMBOLS];
        markTexts = marks?.texts.map(escapeBareReminderOpen);
        if (
          frame.frame !== "human" ||
          isTeammateSession ||
          message.wakeupSource !== undefined ||
          message.promptRewritten === true
        )
          kind = undefined;
        else if (
          isHumanOrigin(message.origin) &&
          message.emailSenderTurn === undefined &&
          !isNonTypedInput(message)
        )
          kind =
            marks?.as !== "prompt"
              ? undefined
              : message.promptSource === "typed" || message.promptSource === "queued"
                ? "typed"
                : message.promptSource === undefined
                  ? "commands"
                  : undefined;
        else if (
          marks?.as === "plan" &&
          message.origin?.kind === "auto-continuation" &&
          message.planContent !== undefined &&
          message.isMeta !== true &&
          message.textNotTyped !== true &&
          message.handedOff !== true &&
          message.queueTranscriptOnly !== true
        )
          kind = "accepted";
        else if (marks?.as === "feedback" && !isNonTypedInput(message)) kind = "typed";
      }
      for (let text of texts) {
        if (text.trim() === "" || (isSystemReminderText(text) && !instructionTextSet.has(text.trimEnd())))
          continue;
        let hash = hashInsertedText(lastSentToolId, text);
        let provenanceKind =
          kind === undefined ||
          (markTexts !== undefined && !markTexts.includes(text)) ||
          (kind !== "instructions" && isSystemReminderText(text)) ||
          hash !==
            hashInsertedText(
              lastSentToolId,
              `${text}
[id:0]`,
            ) ||
          (kind === "commands" && parseCommandMessage(text) === null)
            ? undefined
            : kind;
        let kinds = kindsByHash.get(hash) ?? [];
        kinds.push(provenanceKind);
        kindsByHash.set(hash, kinds);
        if (provenanceKind === "instructions") instructionHashes.add(hash);
        typedCandidateCount += provenanceKind === undefined || provenanceKind === "instructions" ? 0 : 1;
        typedOrCommandCount += provenanceKind === "typed" || provenanceKind === "commands" ? 1 : 0;
      }
    }
    if (typedCandidateCount === 0 && instructionTextSet.size === 0)
      return {
        typed: [],
        ...(instructionsTrusted && {
          instructions: [],
        }),
      };
    let entries = [];
    let seenCounts = new Map();
    let sameTextCounts = new Map();
    let lastSentCall = "";
    let lastSentCall_2 = "";
    for (let wireMessage of messagesForAPI)
      if (wireMessage.type === "assistant")
        for (let toolUseId of toolUseIdsOf(wireMessage.message.content)) {
          lastSentCall_2 = toolUseId;
          sameTextCounts = new Map();
          let groupToolId = groupByToolId.get(toolUseId);
          if (groupToolId !== undefined && sentToolIds.has(groupToolId)) lastSentCall = groupToolId;
        }
      else if (wireMessage.type === "user")
        for (let text of getTextBlocks(wireMessage.message.content)) {
          if (text.trim() === "" || (isSystemReminderText(text) && !instructionTextSet.has(text.trimEnd())))
            continue;
          let hash = hashInsertedText(lastSentCall, text);
          let seenCount = seenCounts.get(hash) ?? 0;
          seenCounts.set(hash, seenCount + 1);
          let normalizedText = normalizeFullWidthSpace(text);
          let sameTextCount = sameTextCounts.get(normalizedText) ?? 0;
          sameTextCounts.set(normalizedText, sameTextCount + 1);
          let kinds = kindsByHash.get(hash);
          let kind = instructionHashes.has(hash) ? "instructions" : kinds?.[seenCount];
          if (kind !== undefined)
            entries.push({
              key: hash,
              list: kind,
              lastSentCall: lastSentCall_2,
              earlier: sameTextCount,
              sameTexts: sameTextCounts,
              sent: normalizedText,
            });
        }
    let lists = {
      typed: [],
      commands: [],
      accepted: [],
      instructions: [],
    };
    for (let entry of entries)
      if (seenCounts.get(entry.key) === kindsByHash.get(entry.key)?.length || entry.list === "instructions")
        lists[entry.list].push(
          hashVouchedText(
            entry.lastSentCall,
            entry.earlier,
            entry.sameTexts.get(entry.sent) ?? 0,
            entry.sent,
          ),
        );
    let typedTotal = lists.typed.length + lists.commands.length;
    if (typedTotal + lists.accepted.length + lists.instructions.length > MAX_COMMAND_TEXT_CHARS) {
      noteTypedMark("list_capped");
      return {
        unknown: "cap",
      };
    }
    return {
      typed: lists.typed,
      ...(lists.commands.length > 0 && {
        commands: lists.commands,
      }),
      ...(lists.accepted.length > 0 && {
        accepted: lists.accepted,
      }),
      ...(typedOrCommandCount > typedTotal && {
        unpaired: typedOrCommandCount - typedTotal,
      }),
      ...(instructionsTrusted &&
        (lists.instructions.length > 0 || instructionTextSet.size === 0) && {
          instructions: lists.instructions,
        }),
    };
  } catch (error) {
    logError(error);
    noteTypedMark("list_failed");
    return {
      unknown: "error",
    };
  }
}
//@ chunk-5xgkngpb.js:2567920-2567955 placement
var loggedTypedMarks; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:2567920", () => {
  loggedTypedMarks = identity_2(new Set(), (set) => set.clear());
});
//@ chunk-5xgkngpb.js:2567955-2568016 placement
function noteTypedMark(reason) {
  if (!loggedTypedMarks.has(reason)) {
    loggedTypedMarks.add(reason);
    logFeatureSad("typed_marks", reason);
  }
}
//@ chunk-5xgkngpb.js:2568092-2568255 placement
/**
 * 把用户消息标记为已验证的人类回合（可附 Projects 用户回合与邮件发送者回合标记）。
 */
function markVerifiedHumanTurn(message, turnId, { projectsUserTurn = false, emailSenderTurn } = {}) {
  attachRelayTurnFlags(message, turnId, {
    verifiedSlackHumanTurn: true,
    ...(projectsUserTurn && {
      projectsUserTurn: true,
    }),
    ...(emailSenderTurn !== undefined && {
      emailSenderTurn,
    }),
  });
}
//@ chunk-5xgkngpb.js:2568255-2568300 placement
/**
 * 为已验证的人类回合补一个 id（必要时生成）。
 */
function ensureTurnId(uuid, mintIfMissing) {
  return uuid || (mintIfMissing ? randomUUID() : undefined);
}
//@ chunk-5xgkngpb.js:2568300-2568503 placement
/**
 * 已验证人类回合摘录的预算常量（字符数、条数、引用字符、轮询事件人类字符），以及表示"有回合被省略"的占位系统消息。
 */
var MAX_HUMAN_TURN_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_HUMAN_TURNS;
var MAX_REFERENT_CHARS;
var POLL_EVENT_HUMAN_CHARS;
var OMITTED_TURNS_MARKER;
deferInit("chunk-5xgkngpb.js:2568300", () => {
  MAX_HUMAN_TURN_CHARS = 12000;
  MAX_HUMAN_TURNS = 16;
  MAX_REFERENT_CHARS = 6000;
  POLL_EVENT_HUMAN_CHARS = 3000;
  OMITTED_TURNS_MARKER = Object.freeze({
    type: "system",
    subtype: "informational",
    content: "",
    level: "info",
    uuid: "00000000-0000-0000-0000-000000000000",
    timestamp: "1970-01-01T00:00:00.000Z",
  });
});
//@ chunk-5xgkngpb.js:2568503-2569043 placement
/**
 * 聊天宿主入口下，汇总已验证的人类回合（继承的加本会话的），从后往前在字符与条数预算内保留最近的回合，并在预算内附上每个回合所回应的助手消息；有省略时插入占位标记。
 */
function buildVerifiedHumanTurns({ messages, inheritedVerifiedHumanTurns: inheritedTurns, agentId }) {
  if (!isChatHostEntrypoint()) return;
  let inherited = splitInheritedTurns(inheritedTurns ?? []);
  let [first, ...rest] = [
    ...inherited.turns,
    ...(isModelDrivenSession(agentId)
      ? messages.flatMap((message) => {
          let turn = keepPrincipalOrVerifiedHumanMessage(message);
          return turn ? [turnEntry(turn)] : [];
        })
      : collectHumanTurns(messages)),
  ];
  if (!first) return;
  let startIndex = rest.length;
  let charCount = 0;
  while (startIndex > 0 && charCount < MAX_HUMAN_TURN_CHARS && rest.length - startIndex < MAX_HUMAN_TURNS) {
    startIndex--;
    charCount += countTurnChars(rest[startIndex].turn);
  }
  let sliced = rest.slice(startIndex);
  let referentChars = assistantTailLength(first.referent);
  let referentCut = 0;
  for (let idx = sliced.length - 1; idx >= 0; idx--) {
    let tailLength = assistantTailLength(sliced[idx].referent);
    if (referentChars + tailLength > MAX_REFERENT_CHARS) {
      referentCut = idx + 1;
      break;
    }
    referentChars += tailLength;
  }
  let budgeted = budgetPollEventProvenance([first, ...sliced]);
  return [
    ...flattenTurnEntry(budgeted[0]),
    ...(inherited.omitted || startIndex > 0 ? [OMITTED_TURNS_MARKER] : []),
    ...budgeted
      .slice(1)
      .flatMap((entry, entryIndex) => (entryIndex < referentCut ? [entry.turn] : flattenTurnEntry(entry))),
  ];
}
//@ chunk-5xgkngpb.js:2569043-2569507 placement
/**
 * 为多条 poll 事件分配来源文本的字符预算：从最新的开始依次分配上限，超出总预算的部分截断。
 */
function budgetPollEventProvenance(entries) {
  let flattened = entries.flatMap((entry, entryIndex) =>
    entry.turn.type === "attachment" && entry.turn.attachment.type === "poll_events"
      ? [
          {
            i: entryIndex,
            provenance: entry.turn.attachment.provenance,
          },
        ]
      : [],
  );
  flattened.reverse();
  let humanBudget = POLL_EVENT_HUMAN_CHARS;
  let mapped = flattened.map(({ provenance }) => {
    let min = Math.min(MAX_PROVENANCE_CHARS, humanBudget);
    humanBudget -= budgetProvenanceEntries(provenance, min, 0).humanChars;
    return min;
  });
  let restBudget = humanBudget;
  let result = [...entries];
  flattened.forEach(({ i: entryIndex, provenance }, pollIndex) => {
    let humanBudget = mapped[pollIndex];
    let humanChars = budgetProvenanceEntries(provenance, humanBudget, 0).humanChars;
    let budgeted = budgetProvenanceEntries(
      provenance,
      humanBudget,
      Math.min(MAX_PROVENANCE_CHARS - humanChars, restBudget),
    );
    restBudget = Math.max(0, restBudget - budgeted.restChars);
    result[entryIndex] = {
      ...result[entryIndex],
      turn: withPollProvenance(result[entryIndex].turn, budgeted.entries),
    };
  });
  return result;
}
//@ chunk-5xgkngpb.js:2569507-2569746 placement
function withPollProvenance(turn, entries) {
  if (turn.type !== "attachment" || turn.attachment.type !== "poll_events") return turn;
  let provenance = turn.attachment.provenance;
  return Array.isArray(provenance) &&
    provenance.length === entries.length &&
    entries.every((entry, index) => entry === provenance[index])
    ? turn
    : {
        ...turn,
        attachment: {
          ...turn.attachment,
          provenance: entries,
        },
      };
}
//@ chunk-5xgkngpb.js:2569746-2569793 placement
function turnEntry(turn) {
  return {
    referent: undefined,
    turn,
  };
}
//@ chunk-5xgkngpb.js:2569793-2569846 placement
function flattenTurnEntry({ referent, turn }) {
  return referent ? [referent, turn] : [turn];
}
//@ chunk-5xgkngpb.js:2569846-2570034 placement
function splitInheritedTurns(messages) {
  let turns = [];
  let omitted = false;
  let referent;
  for (let message of messages) {
    if (message.type === "assistant") {
      referent = message;
      continue;
    }
    if (message === OMITTED_TURNS_MARKER) omitted = true;
    else {
      let turn = keepPrincipalOrVerifiedHumanMessage(message);
      if (turn)
        turns.push({
          referent,
          turn,
        });
    }
    referent = undefined;
  }
  return {
    turns,
    omitted,
  };
}
//@ chunk-5xgkngpb.js:2570034-2570155 placement
function collectHumanTurns(messages) {
  let turns = [];
  messages.forEach((message, index) => {
    let turn = keepPrincipalOrVerifiedHumanMessage(message);
    if (turn)
      turns.push({
        referent: isHumanTurnMessage(message) ? findReferentAssistant(messages, index) : undefined,
        turn,
      });
  });
  return turns;
}
//@ chunk-5xgkngpb.js:2570155-2570274 placement
function findReferentAssistant(messages, beforeIndex) {
  for (let idx = beforeIndex - 1; idx >= 0; idx--) {
    let candidate = messages[idx];
    if (candidate.type === "assistant" && getAssistantTextIfReal(candidate)) return candidate;
    if (!isTransparentBetweenTurns(candidate)) return;
  }
  return;
}
//@ chunk-5xgkngpb.js:2570274-2570428 placement (2.1.88 match: buildTranscriptEntries, 0.902)
/**
 * user 消息或 queued_command 附件是否是经核实的转发人类发言（verifiedSlackHumanTurn 且非 meta）。
 */
function isVerifiedRelayHumanMessage(message) {
  switch (message.type) {
    case "user":
      return isVerifiedSlackHuman(message);
    case "attachment":
      return message.attachment.type === "queued_command" && isVerifiedSlackHuman(message.attachment);
    default:
      return false;
  }
}
//@ chunk-5xgkngpb.js:2570428-2570614 placement
/**
 * poll_events 附件中含 principal 来源时保留；经核实的人类转发消息且有正文时保留；否则返回 undefined。
 */
function keepPrincipalOrVerifiedHumanMessage(message) {
  if (message.type === "attachment" && message.attachment.type === "poll_events")
    return normalizeDeliveredPeers(message.attachment.provenance).some((peer) => peer.kind === "principal")
      ? message
      : undefined;
  return isVerifiedRelayHumanMessage(message) && countTurnChars(message) > 0 ? message : undefined;
}
//@ chunk-5xgkngpb.js:2570614-2570883 placement
function isHumanTurnMessage(message) {
  switch (message.type) {
    case "user":
      return isHumanOrigin(message.origin);
    case "attachment":
      switch (message.attachment.type) {
        case "queued_command":
          return isHumanOrigin(message.attachment.origin);
        case "poll_events":
          return normalizeDeliveredPeers(message.attachment.provenance)[0]?.kind === "principal";
        default:
          return false;
      }
    default:
      return false;
  }
}
//@ chunk-5xgkngpb.js:2570883-2571145 placement
function isTransparentBetweenTurns(message) {
  switch (message.type) {
    case "assistant":
      return !getAssistantTextIfReal(message);
    case "user":
      return message.isMeta === true && isUnclassifiedProvenance(message.origin);
    case "attachment":
      return (
        message.attachment.type !== "queued_command" &&
        message.attachment.type !== "poll_events" &&
        message.attachment.type !== "teammate_mailbox"
      );
    default:
      return true;
  }
}
//@ chunk-5xgkngpb.js:2571145-2571278 placement
function getAssistantTextIfReal(message) {
  if (message.isApiErrorMessage || message.isVirtual || message.message.model === SYNTHETIC_MODEL) return "";
  let text = contentText(message.message.content);
  return text.trim() ? text : "";
}
//@ chunk-5xgkngpb.js:2571278-2571291 placement
var MAX_ASSISTANT_TAIL_CHARS = 2000;
//@ chunk-5xgkngpb.js:2571291-2571329 placement
/**
 * 取助手消息末尾文本（截断到预算）。
 */
function assistantTail(message) {
  return takeLastChars(getAssistantTextIfReal(message), MAX_ASSISTANT_TAIL_CHARS);
}
//@ chunk-5xgkngpb.js:2571329-2571384 placement
function assistantTailLength(referent) {
  return referent ? Math.min(getAssistantTextIfReal(referent).length, MAX_ASSISTANT_TAIL_CHARS) : 0;
}
//@ chunk-5xgkngpb.js:2571384-2571415 placement
var MAX_PROVENANCE_ENTRY_CHARS = 280;
var TRUNCATED_SUFFIX = " [truncated]";
//@ chunk-5xgkngpb.js:2571415-2571524 placement
function truncateSenderText(text) {
  let withoutSuffix = text.endsWith(TRUNCATED_SUFFIX) ? text.slice(0, -TRUNCATED_SUFFIX.length) : text;
  if (withoutSuffix.length <= MAX_PROVENANCE_ENTRY_CHARS) return text;
  return truncateToLength(withoutSuffix, MAX_PROVENANCE_ENTRY_CHARS) + TRUNCATED_SUFFIX;
}
//@ chunk-5xgkngpb.js:2571524-2571566 placement
var MAX_PROVENANCE_CHARS = 1000;
var MAX_REST_ENTRIES = 32;
var HARNESS_OMITTED = "harness-omitted";
//@ chunk-5xgkngpb.js:2571566-2571618 placement
function omittedEntriesNotice(omittedCount) {
  return `[${omittedCount} more entries omitted]`;
}
//@ chunk-5xgkngpb.js:2571618-2571665 placement
var OMITTED_ENTRIES_RE = /^\[(\d{1,3}) more entries omitted\]$/;
//@ chunk-5xgkngpb.js:2571665-2572720 placement
/**
 * 在字符预算内挑选轮询事件出处条目：委托人条目全部保留，其他人类与其余条目各在预算内按序保留，超出的合并为一条"省略 N 条"的条目；返回条目与已用字符数。
 */
function budgetProvenanceEntries(provenance, humanBudget, restBudget) {
  let candidates = normalizeDeliveredPeers(provenance).flatMap((peer) => {
    if (peer.kind === "skipped") return [];
    if (peer.kind === "principal")
      return [
        {
          entry: peer.entry,
          text: peer.text,
          group: "principal",
        },
      ];
    let authority = peer.entry.authority;
    return [
      {
        entry: peer.entry,
        text: authority === HARNESS_OMITTED ? peer.text : truncateSenderText(peer.text),
        group: authority === HARNESS_OMITTED ? "omitted" : authority === "human-other" ? "human" : "rest",
      },
    ];
  });
  let kept = new Set(candidates.filter((candidate) => candidate.group === "principal"));
  let takeGroup = (group, budget, reserved) => {
    let filtered = candidates.filter((candidate) => candidate.group === group);
    let allowedChars =
      filtered.reduce((acc, candidate) => acc + candidate.text.length, 0) <= budget
        ? budget
        : Math.max(0, budget - reserved);
    let usedChars = 0;
    for (let candidate of filtered)
      if (usedChars + candidate.text.length <= allowedChars) {
        kept.add(candidate);
        usedChars += candidate.text.length;
      }
    return usedChars;
  };
  let humanChars = takeGroup("human", humanBudget, 0);
  let restChars = takeGroup("rest", restBudget, MAX_REST_ENTRIES);
  let entries = [];
  let dropped = [];
  let omittedCount = 0;
  let omittedIndex = -1;
  for (let candidate of candidates) {
    if (kept.has(candidate)) {
      entries.push(
        candidate.text === candidate.entry.senderText
          ? candidate.entry
          : {
              ...candidate.entry,
              senderText: candidate.text,
            },
      );
      continue;
    }
    if (dropped.push(candidate) === 1) omittedIndex = entries.length;
    let omittedMatch = candidate.group === "omitted" ? OMITTED_ENTRIES_RE.exec(candidate.text) : null;
    omittedCount += omittedMatch ? Number(omittedMatch[1]) : 1;
  }
  if (omittedCount > 0) {
    let notice = omittedEntriesNotice(omittedCount);
    restChars += notice.length;
    let singleDropped = dropped.length === 1 ? dropped[0] : undefined;
    entries.splice(
      omittedIndex,
      0,
      singleDropped?.group === "omitted" && singleDropped.entry.senderText === notice
        ? singleDropped.entry
        : {
            authority: HARNESS_OMITTED,
            senderText: notice,
          },
    );
  }
  return {
    entries,
    humanChars,
    restChars,
  };
}
//@ chunk-5xgkngpb.js:2572720-2573049 placement
/**
 * 统计一个回合的人类输入字符数：用户消息与队列命令按文本长度，poll 事件只计主体（principal）文本。
 */
function countTurnChars(turn) {
  switch (turn.type) {
    case "user":
      return contentText(turn.message.content).length;
    case "attachment":
      switch (turn.attachment.type) {
        case "queued_command":
          return contentText(turn.attachment.prompt).length;
        case "poll_events":
          return normalizeDeliveredPeers(turn.attachment.provenance).reduce(
            (acc, peer) => acc + (peer.kind === "principal" ? peer.text.length : 0),
            0,
          );
        default:
          return 0;
      }
    default:
      return 0;
  }
}
//@ chunk-5xgkngpb.js:2573049-2573193 placement
function contentText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.flatMap((block) => (block?.type === "text" ? [block.text ?? ""] : [])).join(`
`);
}
//@ chunk-5xgkngpb.js:2573193-2573336 placement
function hashHumanReply(lastSentCall, assistantTailText, text) {
  return createHash("sha256")
    .update(
      `${Buffer.byteLength(lastSentCall)}:${lastSentCall}${Buffer.byteLength(assistantTailText)}:${assistantTailText}${normalizeReplyText(text)}`,
    )
    .digest("hex")
    .slice(0, 32);
}
//@ chunk-5xgkngpb.js:2573336-2575001 placement
/**
 * 为发给 API 的、紧接助手文字之后的用户文本标注 human_reply 出处：用本地记录里人类亲自输入的文本（及其所回应的助手文字）建立计数，线上出现次数不超过本地次数时才标注（受列表剩余容量限制）。
 */
function markHumanReplyProvenance(entries, transcript, apiMessages, sessionContext) {
  try {
    let remainingSlots = MAX_MCP_RULE_LENGTH - entries.length;
    if (remainingSlots <= 0 || isModelDrivenSession(sessionContext) || !listsHumanReplies()) return entries;
    let humanPairCounts = new Map();
    let humanSaidCounts = new Map();
    let seen = new Set();
    let seenNames = new Set();
    let lastToolUseId = "";
    for (let [index, message] of transcript.entries()) {
      if (isVirtualConversationMessage(message)) continue;
      let content =
        message.type === "user" || message.type === "assistant" ? message.message.content : undefined;
      let contentBlocks = Array.isArray(content) ? content : [];
      if (message.type === "assistant") {
        for (let block of contentBlocks)
          if (block?.type === "tool_use") {
            if (typeof block.id !== "string") return entries;
            lastToolUseId = block.id;
            seenNames.add(block.id);
          }
      }
      if (
        message.type !== "user" ||
        !isHumanOrigin(message.origin) ||
        message.emailSenderTurn !== undefined ||
        isNonTypedInput(message) ||
        classifyMessageFrame(message).frame !== "human"
      )
        continue;
      let texts =
        typeof content === "string"
          ? [content]
          : contentBlocks.flatMap((block) => (block?.type === "text" ? [block.text] : []));
      for (let text of texts) {
        seen.add(normalizeReplyTextFullWidth(text));
        let saidHash = hashHumanReply(lastToolUseId, "", text);
        humanSaidCounts.set(saidHash, (humanSaidCounts.get(saidHash) ?? 0) + 1);
      }
      let message_2 = findReferentAssistant(transcript, index);
      if (texts[0] !== undefined && message_2 !== undefined) {
        let pairHash = hashHumanReply(lastToolUseId, assistantTail(message_2), texts[0]);
        humanPairCounts.set(pairHash, (humanPairCounts.get(pairHash) ?? 0) + 1);
      }
    }
    if (humanPairCounts.size === 0) return entries;
    let candidates = [];
    let pairCounts = new Map();
    let saidCounts = new Map();
    let lastAssistantTail;
    let matchedToolUseId = "";
    let lastApiToolUseId = "";
    for (let apiMessage of apiMessages) {
      if (apiMessage.type === "api_system") continue;
      let content = apiMessage.message.content;
      for (let block of typeof content === "string"
        ? [
            {
              type: "text",
              text: content,
            },
          ]
        : content) {
        if (apiMessage.type === "assistant") {
          if (block.type === "tool_use") {
            if (typeof block.id !== "string") return entries;
            lastApiToolUseId = block.id;
            matchedToolUseId = seenNames.has(block.id) ? block.id : matchedToolUseId;
          } else if (block.type === "text" && block.text.trim())
            lastAssistantTail = takeLastChars(block.text, MAX_ASSISTANT_TAIL_CHARS);
          continue;
        }
        if (block.type !== "text" || block.text.startsWith("<system-reminder")) continue;
        if (!seen.has(normalizeReplyTextFullWidth(block.text))) {
          lastAssistantTail = undefined;
          continue;
        }
        let saidHash = hashHumanReply(matchedToolUseId, "", block.text);
        saidCounts.set(saidHash, (saidCounts.get(saidHash) ?? 0) + 1);
        if (lastAssistantTail !== undefined) {
          let pairHash = hashHumanReply(matchedToolUseId, lastAssistantTail, block.text);
          pairCounts.set(pairHash, (pairCounts.get(pairHash) ?? 0) + 1);
          candidates.push({
            pair: pairHash,
            said: saidHash,
            id: hashHumanReply(lastApiToolUseId, lastAssistantTail, block.text),
          });
        }
        lastAssistantTail = undefined;
      }
    }
    return [
      ...candidates
        .flatMap(({ pair, said, id }) =>
          (saidCounts.get(said) ?? 0) <= (humanSaidCounts.get(said) ?? 0) &&
          (pairCounts.get(pair) ?? 0) <= (humanPairCounts.get(pair) ?? 0)
            ? [
                {
                  id,
                  provenance: "human_reply",
                },
              ]
            : [],
        )
        .slice(-remainingSlots),
      ...entries,
    ];
  } catch (error) {
    logError(error);
    return entries;
  }
}
//@ chunk-5xgkngpb.js:2575001-2575082 affinity
function normalizeReplyText(text) {
  return text
    .trimEnd()
    .replace(/\[id:[a-z0-9]{1,8}\]$/, "")
    .trimEnd();
}
//@ chunk-5xgkngpb.js:2575082-2575116 affinity
function normalizeReplyTextFullWidth(text) {
  return normalizeFullWidthSpace(normalizeReplyText(text));
}
//@ chunk-5xgkngpb.js:2575536-2575549 placement
/**
 * 分类器请求文本的字符上限。
 */
var MAX_CLASSIFIER_REQUEST_CHARS = 2048;
//@ chunk-5xgkngpb.js:2591082-2591133 placement
/**
 * 判断 thinking 是否是可当叙述用的思考文本。
 */
function hasNarrationThinking(block) {
  return !!block.thinking?.trim() && isNarrationThinking(block);
}
//@ chunk-5xgkngpb.js:2591133-2591207 placement
/**
 * 列出各条消息中可作叙述的思考块下标。
 */
function narrationThinkingIndexes(messages) {
  let indexes = [];
  messages.forEach((message, index) => {
    if (isNarrationThinking(message)) indexes.push(index);
  });
  return indexes;
}
export {
  markInsertedTextProvenance,
  markHumanReplyProvenance,
  describeForwardedTurns,
  buildContextSectionsMessage,
  collectTaskNotificationsAfterHuman,
  isBareModeAttachmentDropped,
  isLexicalCrystalOn,
  findLastCommandMessage,
  extractBashInput,
  hasNarrationThinking,
  ensureTurnId,
  markVerifiedHumanTurn,
  isVelvetyRippleOn,
  getTextBlocks,
  buildVerifiedHumanTurns,
  parseClassifierRequest,
  TENGU_VELVETY_RIPPLE,
  assistantTail,
  OMITTED_TURNS_MARKER,
  MAX_CLASSIFIER_REQUEST_CHARS,
  withCommandTextBlocks,
  lastCommandMessageParsed,
  commandMessageText,
  narrationThinkingIndexes,
  isUsableCommandMessage,
  startsWithCommandTag,
  parseCommandMessage,
};
