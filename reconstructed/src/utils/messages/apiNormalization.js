/**
 * utils/messages/apiNormalization.ts
 *
 * 2.1.316 新增：发往 API 前的消息规范化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (68)
 * attribution: placement 68
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
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { listsHumanReplies } from "../permissions/serverClassifier/fallbackNotice.js";
import { isNarrationThinking } from "../../services/api/narrationClassifier.js";

//@ chunk-e6aww6q8.js:144825-145817 placement
function describeForwardedTurns(messages, messagesForAPI) {
  let r = new Map();
  let s = new Set();
  let h = new Map();
  for (let w of messages) {
    if (w.type !== "attachment" || w.attachment.type !== "queued_command") continue;
    let { attachment } = w;
    let reminderId = attachment.reminderId;
    if (isValidReminderId(reminderId)) s.add(reminderId);
    let forwardedQueuedCommand = parseForwardedQueuedCommand(attachment);
    if (forwardedQueuedCommand !== undefined) {
      let Se = turnKey(forwardedQueuedCommand);
      r.delete(h.get(Se) ?? "");
      h.set(Se, isValidReminderId(reminderId) ? reminderId : "");
    }
    if (!isValidReminderId(reminderId) || r.has(reminderId) || attachment.renderedByBatchHead) continue;
    let forwardedTurnKind = getForwardedTurnKind(attachment);
    if (forwardedTurnKind === undefined) continue;
    if (forwardedTurnKind === "forwarded_turn") {
      if (forwardedQueuedCommand === undefined) continue;
      let timestamp =
        forwardedQueuedCommand.source === "owner" &&
        forwardedQueuedCommand.timestamp !== undefined &&
        forwardedQueuedCommand.timestamp.length <= MAX_ID_LIST_LENGTH &&
        ISO_TIMESTAMP_RE.test(forwardedQueuedCommand.timestamp)
          ? forwardedQueuedCommand.timestamp
          : undefined;
      r.set(reminderId, {
        provenance: forwardedTurnKind,
        author: getSourceAttributionLabel(forwardedQueuedCommand.source),
        ...(timestamp !== undefined && {
          written: timestamp,
        }),
      });
    } else
      r.set(reminderId, {
        provenance: forwardedTurnKind,
      });
  }
  if (r.size === 0) return [];
  let y = [];
  let S = new Set();
  for (let w of messagesForAPI) {
    if (w.type !== "user") continue;
    let content = w.message.content;
    let G =
      typeof content === "string" ? [content] : content.flatMap((q) => (q.type === "text" ? [q.text] : []));
    for (let q of G) {
      let reminderHeader = parseReminderHeader(q);
      if (reminderHeader === undefined || S.has(reminderHeader)) continue;
      let Se = r.get(reminderHeader);
      if (Se === undefined) continue;
      S.add(reminderHeader);
      y.push({
        id: reminderHeader,
        ...Se,
      });
    }
  }
  return y.length > MAX_MCP_RULE_LENGTH ? y.slice(y.length - MAX_MCP_RULE_LENGTH) : y;
}
//@ chunk-e6aww6q8.js:145817-146020 placement
/**
 * 解析分类器请求附带的数据：request 为非空字符串且 context 通过 schema 校验时返回，否则 undefined。
 */
function parseClassifierRequest(serverClassifierContext) {
  if (typeof serverClassifierContext !== "object" || serverClassifierContext === null) return;
  let { request, context } = serverClassifierContext;
  if (typeof request !== "string" || request.length === 0) return;
  let s = classifierExtraContextSchema().safeParse(context);
  return s.success
    ? {
        request,
        context: s.data,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:146063-146169 placement
/**
 * 精简（bare）模式下丢弃除队列命令与 poll 事件外的所有附件。
 */
function isBareModeAttachmentDropped(e) {
  if (!isBareMode()) return false;
  let { type: n } = e.attachment;
  return n !== "queued_command" && n !== "poll_events";
}
//@ chunk-e6aww6q8.js:146169-146554 placement
/**
 * 从某位置往前看，最近一条有意义的消息是否是人类亲自输入的用户消息（遇到助手、工具结果、压缩摘要、中断或非白名单元消息则为否）。
 */
function isAfterHumanTurn(e, n = e.length) {
  for (let idx = Math.min(n, e.length) - 1; idx >= 0; idx--) {
    let s = e[idx];
    if (s === undefined) continue;
    if (s.type === "assistant") return false;
    if (s.type !== "user") continue;
    if (s.toolUseResult !== undefined || s.isCompactSummary === true || isInterruptionOnlyMessage(s))
      return false;
    if (s.isVisibleInTranscriptOnly === true) continue;
    if (s.isMeta === true) {
      if (isHarmlessMetaMessage(s)) continue;
      return false;
    }
    return isHumanOrigin(s.origin) && s.verifiedSlackHumanTurn !== true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:146554-146744 placement
function isHarmlessMetaMessage(e) {
  let content = e.message.content;
  return (
    e.origin === undefined &&
    e.promptSource === undefined &&
    Array.isArray(content) &&
    content.length > 0 &&
    content.every((r) => r.type === "text" && typeof r.text === "string" && isTaskNotificationText(r.text))
  );
}
//@ chunk-e6aww6q8.js:146744-146840 placement
function isTaskNotificationText(text) {
  return (
    (text.startsWith(IMAGE_MARKER_PREFIX) || text.startsWith(IMAGE_SOURCE_MARKER_PREFIX)) &&
    text.endsWith("]") &&
    !text.includes(`
`)
  );
}
//@ chunk-e6aww6q8.js:146840-147179 placement
/**
 * 收集紧跟在人类回合之后的任务通知类队列命令附件 uuid（排除定时触发与 Projects 中继）。
 */
function collectTaskNotificationsAfterHuman(e) {
  let n;
  for (let idx = 0; idx < e.length; idx++) {
    let s = e[idx];
    if (s.type !== "attachment" || s.attachment.type !== "queued_command") continue;
    let origin = s.attachment.origin;
    if (
      (origin != null
        ? origin.kind === "task-notification" &&
          origin.subkind !== "scheduled-trigger" &&
          !isProjectsRelay(origin)
        : s.attachment.commandMode === "task-notification") &&
      isAfterHumanTurn(e, idx)
    )
      (n ??= new Set()).add(s.uuid);
  }
  return n ?? NO_NOTIFICATION_UUIDS;
}
//@ chunk-e6aww6q8.js:147179-147195 placement
var NO_NOTIFICATION_UUIDS = new Set();
//@ chunk-e6aww6q8.js:147195-147254 placement
var TENGU_VELVETY_RIPPLE = "tengu_velvety_ripple";
var TENGU_LEXICAL_CRYSTAL = "tengu_lexical_crystal";
//@ chunk-e6aww6q8.js:147254-147286 placement
/**
 * 判断 tengu_velvety_ripple 是否开启（默认关）。
 */
function isVelvetyRippleOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVETY_RIPPLE, false);
}
//@ chunk-e6aww6q8.js:147286-147318 placement
/**
 * 判断 tengu_lexical_crystal 是否开启（默认开）。
 */
function isLexicalCrystalOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LEXICAL_CRYSTAL, true);
}
//@ chunk-e6aww6q8.js:2516581-2516709 placement
function hashInsertedText(e, message) {
  let r = normalizeFullWidthSpace(e);
  return createHash("sha256")
    .update(`${Buffer.byteLength(r)}:${r}${normalizeFullWidthSpace(stripTrailingMessageIdTag(message))}`)
    .digest("hex")
    .slice(0, 32);
}
//@ chunk-e6aww6q8.js:2516709-2516856 placement
/**
 * 取出消息内容中的文本块（字符串内容视为一个文本块）。
 */
function getTextBlocks(content) {
  if (typeof content === "string") return [content];
  return Array.isArray(content)
    ? content.flatMap((n) => (n?.type === "text" && typeof n.text === "string" ? [n.text] : []))
    : [];
}
//@ chunk-e6aww6q8.js:2516856-2516953 placement
function isSystemReminderText(e) {
  let n = e.charAt(16);
  return e.startsWith("<system-reminder") && (n === ">" || TRAILING_WHITESPACE_CHARS.has(n));
}
//@ chunk-e6aww6q8.js:2516953-2517202 placement
function classifyInsertedTextKind(localMessage) {
  if (localMessage.wakeupSource !== undefined) return "timer";
  if (localMessage.type !== "user") return "asTyped";
  let n = classifyMessageFrame(localMessage);
  if (n.frame === "human" || n.frame === "relay-human") return "asTyped";
  return n.frame === "invisible" && n.reason === "meta-without-provenance" ? "hidden" : undefined;
}
//@ chunk-e6aww6q8.js:2517202-2517239 placement
var COMMAND_TEXT_RANK = {
  hidden: 0,
  asTyped: 1,
  timer: 2,
};
//@ chunk-e6aww6q8.js:2517239-2517363 placement
/**
 * 有命令文本时给消息附上命令文本块计数（本条与全部）。
 */
function withCommandTextBlocks(userMessage, n, r) {
  return getTextBlocks(n).length > 0
    ? {
        ...userMessage,
        commandTextBlocks: {
          own: getTextBlocks(r).length,
          all: getTextBlocks(userMessage.message.content).length,
        },
      }
    : userMessage;
}
//@ chunk-e6aww6q8.js:2517363-2517528 placement
function countHiddenCommandBlocks(localMessage, n) {
  let commandTextBlocks = localMessage.commandTextBlocks;
  if (commandTextBlocks === undefined) return 0;
  return commandTextBlocks?.all === n.length &&
    Number.isSafeInteger(commandTextBlocks.own) &&
    commandTextBlocks.own >= 0 &&
    commandTextBlocks.own < commandTextBlocks.all
    ? commandTextBlocks.all - commandTextBlocks.own
    : n.length;
}
//@ chunk-e6aww6q8.js:2517528-2517585 placement
function takeLast(e, n) {
  return e.slice(Math.max(0, e.length - n));
}
//@ chunk-e6aww6q8.js:2517585-2517698 placement = countToolCallsSince (1)
function countToolCallsSince_8(content) {
  return Array.isArray(content)
    ? content.flatMap((block) =>
        block?.type === "tool_use" && typeof block.id === "string" ? [block.id] : [],
      )
    : [];
}
//@ chunk-e6aww6q8.js:2517698-2519379 placement
/**
 * 为发给 API 的用户文本标注出处：找出本地记录里由定时器唤醒或隐藏的元消息插入的文本，按位置哈希在线上消息中定位，追加 inserted_text_at 出处条目（受列表上限约束）；未匹配时打点；出错返回原列表。
 */
function markInsertedTextProvenance(provenance, localMessages, wireMessages) {
  try {
    if (!isSnugWallOn()) return provenance;
    let s = new Set(
      wireMessages.flatMap((wireMessage) =>
        wireMessage.type === "assistant" ? countToolCallsSince_8(wireMessage.message.content) : [],
      ),
    );
    let kindByHash = new Map();
    let y = [];
    let S = new Set();
    let w = "";
    for (let localMessage of localMessages) {
      if (isVirtualConversationMessage(localMessage)) continue;
      if (localMessage.type === "assistant") {
        for (let We of countToolCallsSince_8(localMessage.message?.content))
          if (s.has(We)) {
            w = We;
            S.add(We);
          }
      } else if (localMessage.type === "user" || isSystemLocalCommandMessage(localMessage)) {
        let We = classifyInsertedTextKind(localMessage);
        if (We === undefined) continue;
        let textBlocks = getTextBlocks(
          localMessage.type === "user" ? localMessage.message?.content : localMessage.content,
        );
        let lt =
          localMessage.type === "user" && isLegacyHearthRelayMessage(localMessage)
            ? [formatCoordinatorRelayMessages(textBlocks)]
            : textBlocks;
        let Je =
          We === "hidden" && localMessage.type === "user" ? countHiddenCommandBlocks(localMessage, lt) : 0;
        for (let [nt, pt] of lt.entries()) {
          let Et = nt < Je ? "asTyped" : We;
          let message = localMessage.type === "user" ? escapeBareReminderOpen(pt) : pt;
          if (INTERRUPT_TEXTS.has(stripTrailingMessageIdTag(message)) || isSystemReminderText(message))
            continue;
          let gt = [
            hashInsertedText(w, message),
            hashInsertedText(
              w,
              `${message}
[id:0]`,
            ),
          ];
          for (let At of gt) {
            let It = kindByHash.get(At);
            if (It === undefined || COMMAND_TEXT_RANK[It] < COMMAND_TEXT_RANK[Et]) kindByHash.set(At, Et);
          }
          if (Et === "timer") y.push(gt);
        }
      }
    }
    if (![...kindByHash.values()].some((Me) => Me !== "asTyped")) return provenance;
    let L = new Set();
    let matched = {
      hidden: new Set(),
      timer: new Set(),
    };
    let q = "";
    let Z = "";
    for (let wireMessage of wireMessages)
      if (wireMessage.type === "assistant") {
        for (let We of countToolCallsSince_8(wireMessage.message.content)) {
          Z = We;
          if (S.has(We)) q = We;
        }
      } else if (wireMessage.type === "user")
        for (let We of getTextBlocks(wireMessage.message.content)) {
          if (isSystemReminderText(We)) continue;
          let ze = hashInsertedText(q, We);
          let lt = kindByHash.get(ze);
          if (lt === "timer" || lt === "hidden") {
            L.add(ze);
            let Je = Z === q ? ze : hashInsertedText(Z, We);
            matched[lt].delete(Je);
            matched[lt].add(Je);
          }
        }
    if (y.some((Me) => !L.has(Me[0]) && !L.has(Me[1]))) logCronTextDropped("text_not_sent");
    let Se = [...matched.hidden, ...matched.timer];
    if (Se.length === 0) return provenance;
    let filtered = provenance.filter((Me) => !matched.hidden.has(Me.id) && !matched.timer.has(Me.id));
    if (Se.length + filtered.length > MAX_MCP_RULE_LENGTH) logCronTextDropped("list_capped");
    let we = takeLast([...matched.timer], MAX_MCP_RULE_LENGTH);
    let Ee = MAX_MCP_RULE_LENGTH - we.length;
    let min = Math.min(filtered.length, MAX_MCP_RULE_LENGTH / 2);
    let Ie = takeLast([...matched.hidden], Ee - min);
    return [
      ...takeLast(filtered, Ee - Ie.length),
      ...[...Ie, ...we].map((id) => ({
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
//@ chunk-e6aww6q8.js:2519417-2519444 placement
var COMMAND_MESSAGE_TAGS = [COMMAND_MESSAGE, COMMAND_NAME, COMMAND_ARGS, SKILL_FORMAT, COMMAND_CONTENTS];
//@ chunk-e6aww6q8.js:2519444-2520070 placement
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
    let Z = match ? null : tagRe.exec(text);
    let Se = match ? COMMAND_ARGS : Z?.[1];
    let ke = match ? match[1] : Z?.[2];
    if (Se === undefined || ke === undefined || !COMMAND_MESSAGE_TAGS.includes(Se) || tags.has(Se))
      return null;
    tags.set(Se, ke);
    pos = skipWhitespace(text, match ? text.length : tagRe.lastIndex);
  }
  let trimmed = tags.get(COMMAND_NAME)?.trim();
  let S = tags.get(SKILL_FORMAT);
  if (!trimmed || (S ?? "true") !== "true") return null;
  let w = tags.get(COMMAND_ARGS)?.trim() ?? "";
  let trimmed_2 = tags.get(COMMAND_MESSAGE)?.trim();
  let trimmed_3 = tags.get(COMMAND_CONTENTS)?.trim();
  return {
    name: trimmed,
    args: w,
    line: `${trimmed} ${w}`.trim(),
    ...(trimmed_2 !== undefined && {
      message: trimmed_2,
    }),
    ...(trimmed_3 !== undefined && {
      contents: trimmed_3,
    }),
    isSkillFormat: S !== undefined,
  };
}
//@ chunk-e6aww6q8.js:2520070-2520156 placement
function messageRedundantWithName(e) {
  let { message, name: r } = e;
  return message !== undefined && message !== "" && message !== r && `/${message}` !== r;
}
//@ chunk-e6aww6q8.js:2520156-2520209 placement
/**
 * 找出最后一条可用的斜杠命令消息。
 */
function lastCommandMessageParsed(text) {
  let commandMessage = parseCommandMessage(text);
  return commandMessage && isUsableCommandMessage(commandMessage) ? commandMessage : null;
}
//@ chunk-e6aww6q8.js:2520209-2520306 placement
/**
 * 判断解析出的命令消息是否可用（有 message、与 name 不同、非技能参数）。
 */
function isUsableCommandMessage(commandMessage) {
  return (
    !!commandMessage.message &&
    !messageRedundantWithName(commandMessage) &&
    commandMessage.contents === undefined &&
    !(commandMessage.isSkillFormat && commandMessage.args !== "")
  );
}
//@ chunk-e6aww6q8.js:2520306-2520408 placement
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
//@ chunk-e6aww6q8.js:2520408-2520486 placement
/**
 * 判断文本（跳过前导空白后）是否以命令标签开头。
 */
function startsWithCommandTag(e) {
  let n = skipWhitespace(e, 0);
  return COMMAND_MESSAGE_TAGS.some((r) => e.startsWith(`<${r}>`, n));
}
//@ chunk-e6aww6q8.js:2520486-2520669 placement
/**
 * 若最后一条文本是 <bash-input> 包裹的内容，取出其中的命令，否则返回 null。
 */
function extractBashInput(e) {
  let n = `<${BASH_INPUT}>`;
  let r = `</${BASH_INPUT}>`;
  let s = getContentTexts(e).at(-1)?.trim() ?? "";
  return s.length >= n.length + r.length && s.startsWith(n) && s.endsWith(r)
    ? s.slice(n.length, s.length - r.length)
    : null;
}
//@ chunk-e6aww6q8.js:2520669-2520734 placement
function skipWhitespace(text, n) {
  while (n < text.length && /\s/.test(text[n])) n++;
  return n;
}
//@ chunk-e6aww6q8.js:2520734-2520880 placement
function getContentTexts(e) {
  if (typeof e === "string") return [e];
  return !Array.isArray(e)
    ? []
    : e.flatMap((n) => (n.type === "text" && typeof n.text === "string" ? [n.text] : []));
}
//@ chunk-e6aww6q8.js:2520880-2520893 placement
var MAX_COMMAND_TEXT_CHARS = 1024;
//@ chunk-e6aww6q8.js:2520893-2521045 placement
function hashVouchedText(lastSentCall, earlier, r, sent) {
  let h = normalizeFullWidthSpace(lastSentCall);
  return createHash("sha256")
    .update(`vouched_text:${Buffer.byteLength(h)}:${h}#${earlier}/${r}:${normalizeFullWidthSpace(sent)}`)
    .digest("hex")
    .slice(0, 32);
}
//@ chunk-e6aww6q8.js:2521045-2524731 placement
/**
 * 把上下文分段附件组装成发给 API 的消息。
 */
function buildContextSectionsMessage(messages, messagesForAPI, attachmentToMessages) {
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
    let h = isTeammate();
    let y = new Map();
    let S = true;
    for (let nt of messages) {
      if (nt.type !== "attachment") continue;
      if (
        nt.attachment.type === "context_sections" &&
        contextSectionsSchema()
          .safeParse(nt.attachment)
          .data?.sections.some((section) => section.name === "claudeMd")
      )
        S = false;
      if (nt.attachment.type === "instructions") {
        let flattened = attachmentToMessages(nt).messages.flatMap((message) =>
          getTextBlocks(message.message.content),
        );
        if (!arraysEqual_2(nt[MESSAGE_MARK_SYMBOLS]?.texts, flattened)) {
          S = false;
          continue;
        }
        if ((answerOf(nt.uuid)?.kind ?? "engine") !== "engine") S = false;
        y.set(nt, flattened);
      }
    }
    let w = messages[0];
    if (w?.type === "user" && w.userContextReminder === true) S = false;
    let L = new Set([...y.values()].flat().map((nt) => nt.trimEnd()));
    let G = new Map();
    for (let nt of messagesForAPI) {
      let pt = nt.type === "assistant" ? countToolCallsSince_8(nt.message.content) : [];
      for (let Et of pt) G.set(Et, pt[0]);
    }
    let q = new Set();
    let Z = new Map();
    let Se = new Set();
    let ke = 0;
    let we = 0;
    let Ee = "";
    for (let nt of messages) {
      if (isVirtualConversationMessage(nt)) continue;
      let pt = [];
      let Et;
      let yt;
      let gt = y.get(nt);
      if (gt !== undefined) {
        pt = gt;
        Et = "instructions";
      } else if (nt.type === "assistant")
        for (let At of countToolCallsSince_8(nt.message?.content)) {
          let It = G.get(At);
          if (It !== undefined) {
            Ee = It;
            q.add(It);
          }
        }
      else if (isSystemLocalCommandMessage(nt)) pt = getTextBlocks(nt.content);
      else if (nt.type === "user") {
        let At = classifyMessageFrame(nt);
        if (At.frame === "relay-human")
          return {
            unknown: "relay",
          };
        if (nt.origin?.kind !== "task-notification")
          pt = getTextBlocks(nt.message?.content).map(escapeBareReminderOpen);
        let It = nt[MESSAGE_MARK_SYMBOLS];
        yt = It?.texts.map(escapeBareReminderOpen);
        if (At.frame !== "human" || h || nt.wakeupSource !== undefined || nt.promptRewritten === true)
          Et = undefined;
        else if (isHumanOrigin(nt.origin) && nt.emailSenderTurn === undefined && !isNonTypedInput(nt))
          Et =
            It?.as !== "prompt"
              ? undefined
              : nt.promptSource === "typed" || nt.promptSource === "queued"
                ? "typed"
                : nt.promptSource === undefined
                  ? "commands"
                  : undefined;
        else if (
          It?.as === "plan" &&
          nt.origin?.kind === "auto-continuation" &&
          nt.planContent !== undefined &&
          nt.isMeta !== true &&
          nt.textNotTyped !== true &&
          nt.handedOff !== true &&
          nt.queueTranscriptOnly !== true
        )
          Et = "accepted";
        else if (It?.as === "feedback" && !isNonTypedInput(nt)) Et = "typed";
      }
      for (let At of pt) {
        if (At.trim() === "" || (isSystemReminderText(At) && !L.has(At.trimEnd()))) continue;
        let It = hashInsertedText(Ee, At);
        let Yt =
          Et === undefined ||
          (yt !== undefined && !yt.includes(At)) ||
          (Et !== "instructions" && isSystemReminderText(At)) ||
          It !==
            hashInsertedText(
              Ee,
              `${At}
[id:0]`,
            ) ||
          (Et === "commands" && parseCommandMessage(At) === null)
            ? undefined
            : Et;
        let qt = Z.get(It) ?? [];
        qt.push(Yt);
        Z.set(It, qt);
        if (Yt === "instructions") Se.add(It);
        ke += Yt === undefined || Yt === "instructions" ? 0 : 1;
        we += Yt === "typed" || Yt === "commands" ? 1 : 0;
      }
    }
    if (ke === 0 && L.size === 0)
      return {
        typed: [],
        ...(S && {
          instructions: [],
        }),
      };
    let Ae = [];
    let Ie = new Map();
    let Me = new Map();
    let We = "";
    let lastSentCall = "";
    for (let nt of messagesForAPI)
      if (nt.type === "assistant")
        for (let pt of countToolCallsSince_8(nt.message.content)) {
          lastSentCall = pt;
          Me = new Map();
          let Et = G.get(pt);
          if (Et !== undefined && q.has(Et)) We = Et;
        }
      else if (nt.type === "user")
        for (let pt of getTextBlocks(nt.message.content)) {
          if (pt.trim() === "" || (isSystemReminderText(pt) && !L.has(pt.trimEnd()))) continue;
          let Et = hashInsertedText(We, pt);
          let yt = Ie.get(Et) ?? 0;
          Ie.set(Et, yt + 1);
          let gt = normalizeFullWidthSpace(pt);
          let At = Me.get(gt) ?? 0;
          Me.set(gt, At + 1);
          let It = Z.get(Et);
          let Yt = Se.has(Et) ? "instructions" : It?.[yt];
          if (Yt !== undefined)
            Ae.push({
              key: Et,
              list: Yt,
              lastSentCall,
              earlier: At,
              sameTexts: Me,
              sent: gt,
            });
        }
    let lt = {
      typed: [],
      commands: [],
      accepted: [],
      instructions: [],
    };
    for (let nt of Ae)
      if (Ie.get(nt.key) === Z.get(nt.key)?.length || nt.list === "instructions")
        lt[nt.list].push(
          hashVouchedText(nt.lastSentCall, nt.earlier, nt.sameTexts.get(nt.sent) ?? 0, nt.sent),
        );
    let Je = lt.typed.length + lt.commands.length;
    if (Je + lt.accepted.length + lt.instructions.length > MAX_COMMAND_TEXT_CHARS) {
      noteTypedMark("list_capped");
      return {
        unknown: "cap",
      };
    }
    return {
      typed: lt.typed,
      ...(lt.commands.length > 0 && {
        commands: lt.commands,
      }),
      ...(lt.accepted.length > 0 && {
        accepted: lt.accepted,
      }),
      ...(we > Je && {
        unpaired: we - Je,
      }),
      ...(S &&
        (lt.instructions.length > 0 || L.size === 0) && {
          instructions: lt.instructions,
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
//@ chunk-e6aww6q8.js:2524731-2524766 placement
var loggedTypedMarks = identity_2(new Set(), (e) => e.clear());
//@ chunk-e6aww6q8.js:2524766-2524827 placement
function noteTypedMark(e) {
  if (!loggedTypedMarks.has(e)) {
    loggedTypedMarks.add(e);
    logFeatureSad("typed_marks", e);
  }
}
//@ chunk-e6aww6q8.js:2524903-2525066 placement
/**
 * 把用户消息标记为已验证的人类回合（可附 Projects 用户回合与邮件发送者回合标记）。
 */
function markVerifiedHumanTurn(e, turnId, { projectsUserTurn: r = false, emailSenderTurn: s } = {}) {
  attachRelayTurnFlags(e, turnId, {
    verifiedSlackHumanTurn: true,
    ...(r && {
      projectsUserTurn: true,
    }),
    ...(s !== undefined && {
      emailSenderTurn: s,
    }),
  });
}
//@ chunk-e6aww6q8.js:2525066-2525111 placement
/**
 * 为已验证的人类回合补一个 id（必要时生成）。
 */
function ensureTurnId(uuid, n) {
  return uuid || (n ? randomUUID() : undefined);
}
//@ chunk-e6aww6q8.js:2525111-2525314 placement
/**
 * 已验证人类回合摘录的预算常量（字符数、条数、引用字符、轮询事件人类字符），以及表示"有回合被省略"的占位系统消息。
 */
var MAX_HUMAN_TURN_CHARS = 12000;
var MAX_HUMAN_TURNS = 16;
var MAX_REFERENT_CHARS = 6000;
var POLL_EVENT_HUMAN_CHARS = 3000;
var OMITTED_TURNS_MARKER = Object.freeze({
  type: "system",
  subtype: "informational",
  content: "",
  level: "info",
  uuid: "00000000-0000-0000-0000-000000000000",
  timestamp: "1970-01-01T00:00:00.000Z",
});
//@ chunk-e6aww6q8.js:2525314-2525851 placement
/**
 * 聊天宿主入口下，汇总已验证的人类回合（继承的加本会话的），从后往前在字符与条数预算内保留最近的回合，并在预算内附上每个回合所回应的助手消息；有省略时插入占位标记。
 */
function buildVerifiedHumanTurns({ messages, inheritedVerifiedHumanTurns: inheritedTurns, agentId }) {
  if (!isChatHostEntrypoint()) return;
  let s = splitInheritedTurns(inheritedTurns ?? []);
  let [first, ...rest] = [
    ...s.turns,
    ...(isModelDrivenSession(agentId)
      ? messages.flatMap((message) => {
          let turn = keepPrincipalOrVerifiedHumanMessage(message);
          return turn ? [turnEntry(turn)] : [];
        })
      : collectHumanTurns(messages)),
  ];
  if (!first) return;
  let startIndex = rest.length;
  let w = 0;
  while (startIndex > 0 && w < MAX_HUMAN_TURN_CHARS && rest.length - startIndex < MAX_HUMAN_TURNS) {
    startIndex--;
    w += countTurnChars(rest[startIndex].turn);
  }
  let sliced = rest.slice(startIndex);
  let G = assistantTailLength(first.referent);
  let q = 0;
  for (let idx = sliced.length - 1; idx >= 0; idx--) {
    let ke = assistantTailLength(sliced[idx].referent);
    if (G + ke > MAX_REFERENT_CHARS) {
      q = idx + 1;
      break;
    }
    G += ke;
  }
  let Z = budgetPollEventProvenance([first, ...sliced]);
  return [
    ...flattenTurnEntry(Z[0]),
    ...(s.omitted || startIndex > 0 ? [OMITTED_TURNS_MARKER] : []),
    ...Z.slice(1).flatMap((Se, ke) => (ke < q ? [Se.turn] : flattenTurnEntry(Se))),
  ];
}
//@ chunk-e6aww6q8.js:2525851-2526312 placement
/**
 * 为多条 poll 事件分配来源文本的字符预算：从最新的开始依次分配上限，超出总预算的部分截断。
 */
function budgetPollEventProvenance(e) {
  let flattened = e.flatMap((S, w) =>
    S.turn.type === "attachment" && S.turn.attachment.type === "poll_events"
      ? [
          {
            i: w,
            provenance: S.turn.attachment.provenance,
          },
        ]
      : [],
  );
  flattened.reverse();
  let r = POLL_EVENT_HUMAN_CHARS;
  let mapped = flattened.map(({ provenance }) => {
    let min = Math.min(MAX_PROVENANCE_CHARS, r);
    r -= budgetProvenanceEntries(provenance, min, 0).humanChars;
    return min;
  });
  let h = r;
  let y = [...e];
  flattened.forEach(({ i: S, provenance }, L) => {
    let humanBudget = mapped[L];
    let humanChars = budgetProvenanceEntries(provenance, humanBudget, 0).humanChars;
    let Z = budgetProvenanceEntries(provenance, humanBudget, Math.min(MAX_PROVENANCE_CHARS - humanChars, h));
    h = Math.max(0, h - Z.restChars);
    y[S] = {
      ...y[S],
      turn: withPollProvenance(y[S].turn, Z.entries),
    };
  });
  return y;
}
//@ chunk-e6aww6q8.js:2526312-2526551 placement
function withPollProvenance(turn, entries) {
  if (turn.type !== "attachment" || turn.attachment.type !== "poll_events") return turn;
  let provenance = turn.attachment.provenance;
  return Array.isArray(provenance) &&
    provenance.length === entries.length &&
    entries.every((s, h) => s === provenance[h])
    ? turn
    : {
        ...turn,
        attachment: {
          ...turn.attachment,
          provenance: entries,
        },
      };
}
//@ chunk-e6aww6q8.js:2526551-2526598 placement
function turnEntry(turn) {
  return {
    referent: undefined,
    turn,
  };
}
//@ chunk-e6aww6q8.js:2526598-2526651 placement
function flattenTurnEntry({ referent, turn }) {
  return referent ? [referent, turn] : [turn];
}
//@ chunk-e6aww6q8.js:2526651-2526839 placement
function splitInheritedTurns(e) {
  let n = [];
  let omitted = false;
  let s;
  for (let h of e) {
    if (h.type === "assistant") {
      s = h;
      continue;
    }
    if (h === OMITTED_TURNS_MARKER) omitted = true;
    else {
      let y = keepPrincipalOrVerifiedHumanMessage(h);
      if (y)
        n.push({
          referent: s,
          turn: y,
        });
    }
    s = undefined;
  }
  return {
    turns: n,
    omitted,
  };
}
//@ chunk-e6aww6q8.js:2526839-2526960 placement
function collectHumanTurns(messages) {
  let n = [];
  messages.forEach((r, s) => {
    let h = keepPrincipalOrVerifiedHumanMessage(r);
    if (h)
      n.push({
        referent: isHumanTurnMessage(r) ? findReferentAssistant(messages, s) : undefined,
        turn: h,
      });
  });
  return n;
}
//@ chunk-e6aww6q8.js:2526960-2527079 placement
function findReferentAssistant(e, n) {
  for (let idx = n - 1; idx >= 0; idx--) {
    let s = e[idx];
    if (s.type === "assistant" && getAssistantTextIfReal(s)) return s;
    if (!isTransparentBetweenTurns(s)) return;
  }
  return;
}
//@ chunk-e6aww6q8.js:2527079-2527233 placement = buildTranscriptEntries (0.777)
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
//@ chunk-e6aww6q8.js:2527233-2527419 placement
/**
 * poll_events 附件中含 principal 来源时保留；经核实的人类转发消息且有正文时保留；否则返回 undefined。
 */
function keepPrincipalOrVerifiedHumanMessage(message) {
  if (message.type === "attachment" && message.attachment.type === "poll_events")
    return normalizeDeliveredPeers(message.attachment.provenance).some((n) => n.kind === "principal")
      ? message
      : undefined;
  return isVerifiedRelayHumanMessage(message) && countTurnChars(message) > 0 ? message : undefined;
}
//@ chunk-e6aww6q8.js:2527419-2527688 placement
function isHumanTurnMessage(e) {
  switch (e.type) {
    case "user":
      return isHumanOrigin(e.origin);
    case "attachment":
      switch (e.attachment.type) {
        case "queued_command":
          return isHumanOrigin(e.attachment.origin);
        case "poll_events":
          return normalizeDeliveredPeers(e.attachment.provenance)[0]?.kind === "principal";
        default:
          return false;
      }
    default:
      return false;
  }
}
//@ chunk-e6aww6q8.js:2527688-2527950 placement
function isTransparentBetweenTurns(e) {
  switch (e.type) {
    case "assistant":
      return !getAssistantTextIfReal(e);
    case "user":
      return e.isMeta === true && isUnclassifiedProvenance(e.origin);
    case "attachment":
      return (
        e.attachment.type !== "queued_command" &&
        e.attachment.type !== "poll_events" &&
        e.attachment.type !== "teammate_mailbox"
      );
    default:
      return true;
  }
}
//@ chunk-e6aww6q8.js:2527950-2528083 placement
function getAssistantTextIfReal(e) {
  if (e.isApiErrorMessage || e.isVirtual || e.message.model === SYNTHETIC_MODEL) return "";
  let n = contentText(e.message.content);
  return n.trim() ? n : "";
}
//@ chunk-e6aww6q8.js:2528083-2528096 placement
var MAX_ASSISTANT_TAIL_CHARS = 2000;
//@ chunk-e6aww6q8.js:2528096-2528134 placement
/**
 * 取助手消息末尾文本（截断到预算）。
 */
function assistantTail(e) {
  return takeLastChars(getAssistantTextIfReal(e), MAX_ASSISTANT_TAIL_CHARS);
}
//@ chunk-e6aww6q8.js:2528134-2528189 placement
function assistantTailLength(referent) {
  return referent ? Math.min(getAssistantTextIfReal(referent).length, MAX_ASSISTANT_TAIL_CHARS) : 0;
}
//@ chunk-e6aww6q8.js:2528189-2528220 placement
var MAX_PROVENANCE_ENTRY_CHARS = 280;
var TRUNCATED_SUFFIX = " [truncated]";
//@ chunk-e6aww6q8.js:2528220-2528330 placement
function truncateSenderText(text) {
  let n = text.endsWith(TRUNCATED_SUFFIX) ? text.slice(0, -TRUNCATED_SUFFIX.length) : text;
  if (n.length <= MAX_PROVENANCE_ENTRY_CHARS) return text;
  return truncateToLength(n, MAX_PROVENANCE_ENTRY_CHARS) + TRUNCATED_SUFFIX;
}
//@ chunk-e6aww6q8.js:2528330-2528372 placement
var MAX_PROVENANCE_CHARS = 1000;
var MAX_REST_ENTRIES = 32;
var HARNESS_OMITTED = "harness-omitted";
//@ chunk-e6aww6q8.js:2528372-2528424 placement
function omittedEntriesNotice(omittedCount) {
  return `[${omittedCount} more entries omitted]`;
}
//@ chunk-e6aww6q8.js:2528424-2528471 placement
var OMITTED_ENTRIES_RE = /^\[(\d{1,3}) more entries omitted\]$/;
//@ chunk-e6aww6q8.js:2528471-2529523 placement
/**
 * 在字符预算内挑选轮询事件出处条目：委托人条目全部保留，其他人类与其余条目各在预算内按序保留，超出的合并为一条"省略 N 条"的条目；返回条目与已用字符数。
 */
function budgetProvenanceEntries(provenance, humanBudget, restBudget) {
  let candidates = normalizeDeliveredPeers(provenance).flatMap((Se) => {
    if (Se.kind === "skipped") return [];
    if (Se.kind === "principal")
      return [
        {
          entry: Se.entry,
          text: Se.text,
          group: "principal",
        },
      ];
    let authority = Se.entry.authority;
    return [
      {
        entry: Se.entry,
        text: authority === HARNESS_OMITTED ? Se.text : truncateSenderText(Se.text),
        group: authority === HARNESS_OMITTED ? "omitted" : authority === "human-other" ? "human" : "rest",
      },
    ];
  });
  let kept = new Set(candidates.filter((candidate) => candidate.group === "principal"));
  let takeGroup = (Se, ke, we) => {
    let filtered = candidates.filter((candidate) => candidate.group === Se);
    let Ie = filtered.reduce((acc, ze) => acc + ze.text.length, 0) <= ke ? ke : Math.max(0, ke - we);
    let Me = 0;
    for (let We of filtered)
      if (Me + We.text.length <= Ie) {
        kept.add(We);
        Me += We.text.length;
      }
    return Me;
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
    let ke = candidate.group === "omitted" ? OMITTED_ENTRIES_RE.exec(candidate.text) : null;
    omittedCount += ke ? Number(ke[1]) : 1;
  }
  if (omittedCount > 0) {
    let Se = omittedEntriesNotice(omittedCount);
    restChars += Se.length;
    let ke = dropped.length === 1 ? dropped[0] : undefined;
    entries.splice(
      omittedIndex,
      0,
      ke?.group === "omitted" && ke.entry.senderText === Se
        ? ke.entry
        : {
            authority: HARNESS_OMITTED,
            senderText: Se,
          },
    );
  }
  return {
    entries,
    humanChars,
    restChars,
  };
}
//@ chunk-e6aww6q8.js:2529523-2529852 placement
/**
 * 统计一个回合的人类输入字符数：用户消息与队列命令按文本长度，poll 事件只计主体（principal）文本。
 */
function countTurnChars(e) {
  switch (e.type) {
    case "user":
      return contentText(e.message.content).length;
    case "attachment":
      switch (e.attachment.type) {
        case "queued_command":
          return contentText(e.attachment.prompt).length;
        case "poll_events":
          return normalizeDeliveredPeers(e.attachment.provenance).reduce(
            (acc, r) => acc + (r.kind === "principal" ? r.text.length : 0),
            0,
          );
        default:
          return 0;
      }
    default:
      return 0;
  }
}
//@ chunk-e6aww6q8.js:2529852-2529996 placement
function contentText(e) {
  if (typeof e === "string") return e;
  if (!Array.isArray(e)) return "";
  return e.flatMap((n) => (n?.type === "text" ? [n.text ?? ""] : [])).join(`
`);
}
//@ chunk-e6aww6q8.js:2529996-2530198 placement
function hashHumanReply(e, n, text) {
  let s = text
    .trimEnd()
    .replace(/\[id:[a-z0-9]{1,8}\]$/, "")
    .trimEnd();
  return createHash("sha256")
    .update(`${Buffer.byteLength(e)}:${e}${Buffer.byteLength(n)}:${n}${s}`)
    .digest("hex")
    .slice(0, 32);
}
//@ chunk-e6aww6q8.js:2530198-2531710 placement
/**
 * 为发给 API 的、紧接助手文字之后的用户文本标注 human_reply 出处：用本地记录里人类亲自输入的文本（及其所回应的助手文字）建立计数，线上出现次数不超过本地次数时才标注（受列表剩余容量限制）。
 */
function markHumanReplyProvenance(entries, transcript, apiMessages, sessionContext) {
  try {
    let remainingSlots = MAX_MCP_RULE_LENGTH - entries.length;
    if (remainingSlots <= 0 || isModelDrivenSession(sessionContext) || !listsHumanReplies()) return entries;
    let humanPairCounts = new Map();
    let humanSaidCounts = new Map();
    let transcriptToolUseIds = new Set();
    let lastToolUseId = "";
    for (let [Ae, Ie] of transcript.entries()) {
      if (isVirtualConversationMessage(Ie)) continue;
      let content = Ie.type === "user" || Ie.type === "assistant" ? Ie.message.content : undefined;
      let We = Array.isArray(content) ? content : [];
      if (Ie.type === "assistant") {
        for (let Je of We)
          if (Je?.type === "tool_use") {
            lastToolUseId = Je.id;
            transcriptToolUseIds.add(Je.id);
          }
      }
      if (
        Ie.type !== "user" ||
        !isHumanOrigin(Ie.origin) ||
        Ie.emailSenderTurn !== undefined ||
        isNonTypedInput(Ie) ||
        classifyMessageFrame(Ie).frame !== "human"
      )
        continue;
      let ze =
        typeof content === "string" ? [content] : We.flatMap((Je) => (Je?.type === "text" ? [Je.text] : []));
      for (let Je of ze) {
        let nt = hashHumanReply(lastToolUseId, "", Je);
        humanSaidCounts.set(nt, (humanSaidCounts.get(nt) ?? 0) + 1);
      }
      let referentAssistant = findReferentAssistant(transcript, Ae);
      if (ze[0] !== undefined && referentAssistant !== undefined) {
        let Je = hashHumanReply(lastToolUseId, assistantTail(referentAssistant), ze[0]);
        humanPairCounts.set(Je, (humanPairCounts.get(Je) ?? 0) + 1);
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
      for (let Me of typeof content === "string"
        ? [
            {
              type: "text",
              text: content,
            },
          ]
        : content) {
        if (apiMessage.type === "assistant") {
          if (Me.type === "tool_use") {
            lastApiToolUseId = Me.id;
            matchedToolUseId = transcriptToolUseIds.has(Me.id) ? Me.id : matchedToolUseId;
          } else if (Me.type === "text" && Me.text.trim())
            lastAssistantTail = takeLastChars(Me.text, MAX_ASSISTANT_TAIL_CHARS);
          continue;
        }
        if (Me.type !== "text" || Me.text.startsWith("<system-reminder")) continue;
        let We = hashHumanReply(matchedToolUseId, "", Me.text);
        saidCounts.set(We, (saidCounts.get(We) ?? 0) + 1);
        if (lastAssistantTail !== undefined) {
          let ze = hashHumanReply(matchedToolUseId, lastAssistantTail, Me.text);
          pairCounts.set(ze, (pairCounts.get(ze) ?? 0) + 1);
          candidates.push({
            pair: ze,
            said: We,
            id: hashHumanReply(lastApiToolUseId, lastAssistantTail, Me.text),
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
//@ chunk-e6aww6q8.js:2531710-2531723 placement
/**
 * 分类器请求文本的字符上限。
 */
var MAX_CLASSIFIER_REQUEST_CHARS = 2048;
//@ chunk-e6aww6q8.js:2539630-2539681 placement
/**
 * 判断 thinking 是否是可当叙述用的思考文本。
 */
function hasNarrationThinking(block) {
  return !!block.thinking?.trim() && isNarrationThinking(block);
}
//@ chunk-e6aww6q8.js:2539681-2539755 placement
/**
 * 列出各条消息中可作叙述的思考块下标。
 */
function narrationThinkingIndexes(e) {
  let n = [];
  e.forEach((r, s) => {
    if (isNarrationThinking(r)) n.push(s);
  });
  return n;
}
export {
  collectTaskNotificationsAfterHuman,
  isBareModeAttachmentDropped,
  isLexicalCrystalOn,
  findLastCommandMessage,
  extractBashInput,
  hasNarrationThinking,
  buildVerifiedHumanTurns,
  narrationThinkingIndexes,
  parseCommandMessage,
  isUsableCommandMessage,
  ensureTurnId,
  getTextBlocks,
  markVerifiedHumanTurn,
  markInsertedTextProvenance,
  markHumanReplyProvenance,
  describeForwardedTurns,
  buildContextSectionsMessage,
  assistantTail,
  OMITTED_TURNS_MARKER,
  withCommandTextBlocks,
  lastCommandMessageParsed,
  startsWithCommandTag,
  isVelvetyRippleOn,
  parseClassifierRequest,
  TENGU_VELVETY_RIPPLE,
  MAX_CLASSIFIER_REQUEST_CHARS,
};
