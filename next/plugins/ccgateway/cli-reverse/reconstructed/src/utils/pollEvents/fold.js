/**
 * utils/pollEvents/fold.ts
 *
 * 2.1.316 新增：轮询事件折叠
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 10
 */
import { codeModeAccepted } from "../codeMode/accepted.js";
import {
  collectEventNonces,
  envelopeNonceMatches,
  remintEventNonce,
  detectEnvelopeKind,
  normalizeNewlines,
  containsEventTag,
  withEventNonce,
  renderPollEvent,
  TASK_NOTIFICATION as TASK_NOTIFICATION_2,
  deriveEventNonce,
  POLL as POLL_2,
  parseDeliveredPollEvents,
  isPollEventDeliveryText,
  parseToolsUsedBeforeSummary,
  buildPollEventDelivery,
} from "../pollEvents.js";
import { answerOf } from "../../plugins/functionHooks/promptAttachmentHooks.js";
import { resolveTaskNotificationOrigin } from "../backgroundSessionResume.js";
import {
  TASK_NOTIFICATION,
  TASK_ID,
  TOOL_USE_ID,
  TASK_TYPE,
  OUTPUT_FILE,
  STATUS,
  SUMMARY,
} from "../../constants/xml.js";
import { regExp_5 } from "../messages.js";
import {
  withSystemNotificationPrefix,
  escapeSystemReminderClose,
} from "../../services/api/promptCacheBreakParts.js";
import { POLL, isEmptyPollText } from "../../tools/PollTool/prompt.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { storedFormSymbol } from "../messageKinds.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:169820-169926 placement
function isPollEventsFoldEnabled() {
  if (codeModeAccepted()) {
    let { isReplSpliceWaitEnabled } = require("../codeMode/waitForNews.js");
    return isReplSpliceWaitEnabled();
  }
  return false;
}
//@ chunk-5xgkngpb.js:169926-169966 placement
var EVENT_AT_PATTERN = /^<event\b[^>]*?\bat="([^"]*)"/;
//@ chunk-5xgkngpb.js:169966-170200 placement (2.1.88 match: sanitizeFileName, 1)
/**
 * 把连续的附件消息段中可折叠的 task-notification 排队命令并入 poll_events 附件（与入站附件无关）。
 */
function foldQueuedNotificationsIntoPollEvents(messages, foldableUuids) {
  if (foldableUuids.size === 0) return messages.slice();
  let out = [];
  let index = 0;
  while (index < messages.length) {
    if (messages[index].type !== "attachment") {
      out.push(messages[index]);
      index++;
      continue;
    }
    let runEnd = index;
    while (runEnd < messages.length && messages[runEnd].type === "attachment") runEnd++;
    out.push(...foldAttachmentRun(messages.slice(index, runEnd), foldableUuids));
    index = runEnd;
  }
  return out;
}
//@ chunk-5xgkngpb.js:170200-171519 placement
/**
 * 把连续的轮询事件附件折叠为一条。
 */
function foldAttachmentRun(messages, foldableUuids) {
  let foldableEnvelopes = new Map();
  for (let message of messages) {
    if (!foldableUuids.has(message.uuid)) continue;
    let pollEventEnvelope = toPollEventEnvelope(message);
    if (pollEventEnvelope !== undefined) foldableEnvelopes.set(message.uuid, pollEventEnvelope);
  }
  if (foldableEnvelopes.size === 0) return messages.slice();
  let found = messages.find(
    (message) =>
      message.type === "attachment" &&
      message.attachment.type === "poll_events" &&
      message.attachment.deliveredVia === undefined,
  );
  let attachment =
    found?.type === "attachment" && found.attachment.type === "poll_events" ? found.attachment : undefined;
  if (
    attachment !== undefined &&
    (collectEventNonces(attachment.envelopes).length < attachment.envelopes.length ||
      !attachment.envelopes.every(envelopeNonceMatches))
  )
    return messages.slice();
  let parsed = [];
  if (attachment !== undefined)
    attachment.envelopes.forEach((envelope, index) => {
      parsed.push({
        envelope,
        kind: attachment.kinds[index] ?? "unknown",
        provenance: attachment.provenance?.[index] ?? null,
        declared: attachment.declared?.[index] ?? null,
        media: attachment.media?.[index] ?? [],
        at: EVENT_AT_PATTERN.exec(envelope)?.[1],
      });
    });
  let merged = mergeEnvelopesByTime(parsed, [...foldableEnvelopes.values()]);
  let any = merged.some((entry) => entry.media.length > 0);
  let mergedAttachment = {
    ...(attachment ?? {
      type: "poll_events",
      remainingWakeCount: 0,
    }),
    type: "poll_events",
    envelopes: merged.map((entry) => remintEventNonce(entry.envelope, detectEnvelopeKind(entry.envelope))),
    kinds: merged.map((entry) => entry.kind),
    provenance: merged.map((entry) => entry.provenance),
    ...(merged.some((entry) => entry.declared !== null) && {
      declared: merged.map((entry) => entry.declared),
    }),
    ...(any && {
      media: merged.map((entry) => entry.media),
    }),
    timestamp: merged.at(-1)?.at ?? attachment?.timestamp,
  };
  if (!any) delete mergedAttachment.media;
  let hostMessage = found ?? messages.find((message) => foldableEnvelopes.has(message.uuid));
  let out = [];
  for (let message of messages)
    if (message === hostMessage && message.type === "attachment") {
      let { rendered, renderedInHumanTurn, ...rest } = message;
      out.push({
        ...rest,
        attachment: mergedAttachment,
      });
    } else if (message !== found && !foldableEnvelopes.has(message.uuid)) out.push(message);
  return out;
}
//@ chunk-5xgkngpb.js:171519-171717 placement
function mergeEnvelopesByTime(left, right) {
  let merged = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    let timestamp = Date.parse(left[leftIndex].at ?? "");
    if (Date.parse(right[rightIndex].at ?? "") < timestamp) merged.push(right[rightIndex++]);
    else merged.push(left[leftIndex++]);
  }
  return merged.concat(left.slice(leftIndex), right.slice(rightIndex));
}
//@ chunk-5xgkngpb.js:171717-172650 placement
function toPollEventEnvelope(message) {
  if (message.type !== "attachment" || message.attachment.type !== "queued_command") return;
  let attachment = message.attachment;
  let answer = answerOf(message.uuid);
  if (answer !== undefined && answer.kind !== "engine") return;
  let taskNotificationOrigin = resolveTaskNotificationOrigin(attachment.origin, attachment.commandMode);
  if (
    taskNotificationOrigin?.kind !== "task-notification" ||
    taskNotificationOrigin.subkind !== undefined ||
    attachment.verifiedSlackHumanTurn === true ||
    attachment.batchedRelayPrompts !== undefined ||
    attachment.hearthRelayMessageIds !== undefined ||
    attachment.inlinedImagePaths !== undefined ||
    attachment.toolsUsedDelta !== undefined
  )
    return;
  let { prompt } = attachment;
  let text =
    typeof prompt === "string"
      ? prompt
      : Array.isArray(prompt) && prompt.every((part) => part?.type === "text")
        ? prompt.map((part) => part.text).join(`
`)
        : undefined;
  let timestamp = attachment.timestamp ?? message.timestamp;
  if (text === undefined || typeof timestamp !== "string") return;
  let index = text.indexOf(`</${TASK_NOTIFICATION}>`);
  if (index !== -1 && regExp_5.test(text.slice(index + `</${TASK_NOTIFICATION}>`.length))) return;
  let content = withSystemNotificationPrefix(escapeSystemReminderClose(normalizeNewlines(text)));
  if (containsEventTag(content)) return;
  let declaredEnvelope = undefined;
  if (declaredEnvelope?.ok === false) return;
  return {
    envelope:
      declaredEnvelope === undefined
        ? withEventNonce(
            renderPollEvent({
              kind: TASK_NOTIFICATION_2,
              at: timestamp,
              content,
            }),
            deriveEventNonce(message.uuid),
            "element",
          )
        : withEventNonce(declaredEnvelope.envelope, deriveEventNonce(message.uuid), "json"),
    kind: TASK_NOTIFICATION_2,
    provenance: null,
    declared: null,
    media: [],
    at: timestamp,
  };
}
//@ chunk-5xgkngpb.js:172650-172796 placement
var TASK_NOTIFICATION_FIELD_PATTERNS; // deferred: uses COMMAND_NAME (../../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:172650", () => {
  TASK_NOTIFICATION_FIELD_PATTERNS = [
    ...[TASK_ID, TOOL_USE_ID, TASK_TYPE, OUTPUT_FILE, STATUS].map((tagName) => [
      tagName,
      new RegExp(`\\n?<${tagName}>([^<\\n]*)</${tagName}>`, "y"),
    ]),
    [SUMMARY, new RegExp(`\\n?<${SUMMARY}>([\\s\\S]*?)</${SUMMARY}>`, "y")],
  ];
});
//@ chunk-5xgkngpb.js:172796-173843 placement
function foldPollEventsIntoToolResult(messages, assistantIndex, foldData) {
  if (!isPollEventsFoldEnabled() || assistantIndex + 1 !== messages.length - 1) return false;
  let assistantMessage = messages[assistantIndex];
  let userMessage = messages[assistantIndex + 1];
  if (
    assistantMessage?.type !== "assistant" ||
    userMessage?.type !== "user" ||
    typeof userMessage.message.content === "string"
  )
    return false;
  let pollToolUseIds = new Set(
    assistantMessage.message.content.flatMap((block) =>
      block.type === "tool_use" && block.name === POLL && !block.id.startsWith(POLL_2) ? [block.id] : [],
    ),
  );
  let sliced = userMessage.message.content.slice();
  let index = sliced.findIndex(
    (block) => block.type === "tool_result" && pollToolUseIds.has(block.tool_use_id),
  );
  let toolResult = sliced[index];
  if (toolResult?.type !== "tool_result" || foldedToolResults.has(toolResult) || toolResult.is_error === true)
    return false;
  let contentBlocks =
    typeof toolResult.content === "string"
      ? [
          {
            type: "text",
            text: toolResult.content,
          },
        ]
      : (toolResult.content ?? []);
  let text = contentBlocks.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
  let filtered = contentBlocks.filter((block) => block.type !== "text");
  let envelopes = isEmptyPollText(text) ? [] : parseDeliveredPollEvents(text);
  if (envelopes === undefined && isPollEventDeliveryText(text)) return false;
  let mapped = envelopes?.map((envelope) => remintEventNonce(envelope, detectEnvelopeKind(envelope)));
  let sorted = normalizeCaseForComparison_2([
    ...(envelopes === undefined ? [] : (parseToolsUsedBeforeSummary(text) ?? [])),
    ...(foldData.toolsUsed ?? []),
  ]).sort();
  let deliveryText =
    buildPollEventDelivery([...(mapped ?? []), ...foldData.envelopes], foldData.remainingWakeCount, sorted) +
    (envelopes === undefined && text !== ""
      ? `
${text}`
      : "");
  let mediaBlocks = [...filtered, ...(foldData.media ?? []).flat()];
  let newResult = {
    ...toolResult,
    content:
      mediaBlocks.length === 0
        ? deliveryText
        : [
            {
              type: "text",
              text: deliveryText,
            },
            ...mediaBlocks,
          ],
  };
  foldedToolResults.add(newResult);
  sliced[index] = newResult;
  messages[assistantIndex + 1] = {
    ...userMessage,
    message: {
      ...userMessage.message,
      content: sliced,
    },
  };
  return true;
}
//@ chunk-5xgkngpb.js:173843-173863 placement
var foldedToolResults; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:173843", () => {
  foldedToolResults = new WeakSet();
});
//@ chunk-5xgkngpb.js:173863-173977 placement (2.1.88 match: sanitizeFileName, 1)
/**
 * 若消息带有别名记录且 uuid 相同，返回别名消息，否则原样返回。
 */
function resolveMessageAlias(message) {
  let storedMessage =
    message.type === "user" || message.type === "attachment" ? message[storedFormSymbol] : undefined;
  return storedMessage !== undefined && storedMessage.uuid === message.uuid ? storedMessage : message;
}
export {
  resolveMessageAlias,
  isPollEventsFoldEnabled,
  foldQueuedNotificationsIntoPollEvents,
  foldPollEventsIntoToolResult,
};
