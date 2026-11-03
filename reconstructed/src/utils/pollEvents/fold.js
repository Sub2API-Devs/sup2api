/**
 * utils/pollEvents/fold.ts
 *
 * 2.1.316 新增：轮询事件折叠
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
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
import { uniq } from "../collections.js";
import { storedFormSymbol } from "../messageKinds.js";

//@ chunk-e6aww6q8.js:169498-169522 placement
function isPollEventsFoldEnabled() {
  return false;
}
//@ chunk-e6aww6q8.js:169522-169562 placement
var EVENT_AT_PATTERN = /^<event\b[^>]*?\bat="([^"]*)"/;
//@ chunk-e6aww6q8.js:169562-169796 placement = sanitizeFileName (1)
/**
 * 把连续的附件消息段中可折叠的 task-notification 排队命令并入 poll_events 附件（与入站附件无关）。
 */
function foldQueuedNotificationsIntoPollEvents(messages, foldableUuids) {
  if (foldableUuids.size === 0) return messages.slice();
  let r = [];
  let s = 0;
  while (s < messages.length) {
    if (messages[s].type !== "attachment") {
      r.push(messages[s]);
      s++;
      continue;
    }
    let h = s;
    while (h < messages.length && messages[h].type === "attachment") h++;
    r.push(...foldAttachmentRun(messages.slice(s, h), foldableUuids));
    s = h;
  }
  return r;
}
//@ chunk-e6aww6q8.js:169796-171080 placement
/**
 * 把连续的轮询事件附件折叠为一条。
 */
function foldAttachmentRun(e, foldableUuids) {
  let r = new Map();
  for (let Z of e) {
    if (!foldableUuids.has(Z.uuid)) continue;
    let pollEventEnvelope = toPollEventEnvelope(Z);
    if (pollEventEnvelope !== undefined) r.set(Z.uuid, pollEventEnvelope);
  }
  if (r.size === 0) return e.slice();
  let found = e.find(
    (Z) =>
      Z.type === "attachment" &&
      Z.attachment.type === "poll_events" &&
      Z.attachment.deliveredVia === undefined,
  );
  let attachment =
    found?.type === "attachment" && found.attachment.type === "poll_events" ? found.attachment : undefined;
  if (
    attachment !== undefined &&
    (collectEventNonces(attachment.envelopes).length < attachment.envelopes.length ||
      !attachment.envelopes.every(envelopeNonceMatches))
  )
    return e.slice();
  let y = [];
  if (attachment !== undefined)
    attachment.envelopes.forEach((envelope, Se) => {
      y.push({
        envelope,
        kind: attachment.kinds[Se] ?? "unknown",
        provenance: attachment.provenance?.[Se] ?? null,
        declared: attachment.declared?.[Se] ?? null,
        media: attachment.media?.[Se] ?? [],
        at: EVENT_AT_PATTERN.exec(envelope)?.[1],
      });
    });
  let S = mergeEnvelopesByTime(y, [...r.values()]);
  let any = S.some((Z) => Z.media.length > 0);
  let L = {
    ...(attachment ?? {
      type: "poll_events",
      remainingWakeCount: 0,
    }),
    type: "poll_events",
    envelopes: S.map((Z) => remintEventNonce(Z.envelope, detectEnvelopeKind(Z.envelope))),
    kinds: S.map((Z) => Z.kind),
    provenance: S.map((Z) => Z.provenance),
    ...(S.some((Z) => Z.declared !== null) && {
      declared: S.map((Z) => Z.declared),
    }),
    ...(any && {
      media: S.map((Z) => Z.media),
    }),
    timestamp: S.at(-1)?.at ?? attachment?.timestamp,
  };
  if (!any) delete L.media;
  let G = found ?? e.find((Z) => r.has(Z.uuid));
  let q = [];
  for (let Z of e)
    if (Z === G && Z.type === "attachment") {
      let { rendered, renderedInHumanTurn, ...we } = Z;
      q.push({
        ...we,
        attachment: L,
      });
    } else if (Z !== found && !r.has(Z.uuid)) q.push(Z);
  return q;
}
//@ chunk-e6aww6q8.js:171080-171278 placement
function mergeEnvelopesByTime(e, n) {
  let r = [];
  let s = 0;
  let h = 0;
  while (s < e.length && h < n.length) {
    let timestamp = Date.parse(e[s].at ?? "");
    if (Date.parse(n[h].at ?? "") < timestamp) r.push(n[h++]);
    else r.push(e[s++]);
  }
  return r.concat(e.slice(s), n.slice(h));
}
//@ chunk-e6aww6q8.js:171278-172211 placement
function toPollEventEnvelope(e) {
  if (e.type !== "attachment" || e.attachment.type !== "queued_command") return;
  let attachment = e.attachment;
  let r = answerOf(e.uuid);
  if (r !== undefined && r.kind !== "engine") return;
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
  let y =
    typeof prompt === "string"
      ? prompt
      : Array.isArray(prompt) && prompt.every((q) => q?.type === "text")
        ? prompt.map((q) => q.text).join(`
`)
        : undefined;
  let timestamp = attachment.timestamp ?? e.timestamp;
  if (y === undefined || typeof timestamp !== "string") return;
  let index = y.indexOf(`</${TASK_NOTIFICATION}>`);
  if (index !== -1 && regExp_5.test(y.slice(index + `</${TASK_NOTIFICATION}>`.length))) return;
  let L = withSystemNotificationPrefix(escapeSystemReminderClose(normalizeNewlines(y)));
  if (containsEventTag(L)) return;
  let G = undefined;
  if (G?.ok === false) return;
  return {
    envelope:
      G === undefined
        ? withEventNonce(
            renderPollEvent({
              kind: TASK_NOTIFICATION_2,
              at: timestamp,
              content: L,
            }),
            deriveEventNonce(e.uuid),
            "element",
          )
        : withEventNonce(G.envelope, deriveEventNonce(e.uuid), "json"),
    kind: TASK_NOTIFICATION_2,
    provenance: null,
    declared: null,
    media: [],
    at: timestamp,
  };
}
//@ chunk-e6aww6q8.js:172211-172357 placement
var TASK_NOTIFICATION_FIELD_PATTERNS = [
  ...[TASK_ID, TOOL_USE_ID, TASK_TYPE, OUTPUT_FILE, STATUS].map((e) => [
    e,
    new RegExp(`\\n?<${e}>([^<\\n]*)</${e}>`, "y"),
  ]),
  [SUMMARY, new RegExp(`\\n?<${SUMMARY}>([\\s\\S]*?)</${SUMMARY}>`, "y")],
];
//@ chunk-e6aww6q8.js:172357-173402 placement
function foldPollEventsIntoToolResult(e, assistantIndex, r) {
  if (!isPollEventsFoldEnabled() || assistantIndex + 1 !== e.length - 1) return false;
  let s = e[assistantIndex];
  let h = e[assistantIndex + 1];
  if (s?.type !== "assistant" || h?.type !== "user" || typeof h.message.content === "string") return false;
  let y = new Set(
    s.message.content.flatMap((Me) =>
      Me.type === "tool_use" && Me.name === POLL && !Me.id.startsWith(POLL_2) ? [Me.id] : [],
    ),
  );
  let sliced = h.message.content.slice();
  let index = sliced.findIndex((Me) => Me.type === "tool_result" && y.has(Me.tool_use_id));
  let L = sliced[index];
  if (L?.type !== "tool_result" || foldedToolResults.has(L) || L.is_error === true) return false;
  let G =
    typeof L.content === "string"
      ? [
          {
            type: "text",
            text: L.content,
          },
        ]
      : (L.content ?? []);
  let text = G.flatMap((Me) => (Me.type === "text" ? [Me.text] : [])).join("");
  let filtered = G.filter((Me) => Me.type !== "text");
  let Se = isEmptyPollText(text) ? [] : parseDeliveredPollEvents(text);
  if (Se === undefined && isPollEventDeliveryText(text)) return false;
  let mapped = Se?.map((Me) => remintEventNonce(Me, detectEnvelopeKind(Me)));
  let sorted = uniq([
    ...(Se === undefined ? [] : (parseToolsUsedBeforeSummary(text) ?? [])),
    ...(r.toolsUsed ?? []),
  ]).sort();
  let Ee =
    buildPollEventDelivery([...(mapped ?? []), ...r.envelopes], r.remainingWakeCount, sorted) +
    (Se === undefined && text !== ""
      ? `
${text}`
      : "");
  let Ae = [...filtered, ...(r.media ?? []).flat()];
  let Ie = {
    ...L,
    content:
      Ae.length === 0
        ? Ee
        : [
            {
              type: "text",
              text: Ee,
            },
            ...Ae,
          ],
  };
  foldedToolResults.add(Ie);
  sliced[index] = Ie;
  e[assistantIndex + 1] = {
    ...h,
    message: {
      ...h.message,
      content: sliced,
    },
  };
  return true;
}
//@ chunk-e6aww6q8.js:173402-173422 placement
var foldedToolResults = new WeakSet();
//@ chunk-e6aww6q8.js:173422-173536 placement = sanitizeFileName (1)
/**
 * 若消息带有别名记录且 uuid 相同，返回别名消息，否则原样返回。
 */
function resolveMessageAlias(message) {
  let n = message.type === "user" || message.type === "attachment" ? message[storedFormSymbol] : undefined;
  return n !== undefined && n.uuid === message.uuid ? n : message;
}
export {
  isPollEventsFoldEnabled,
  foldQueuedNotificationsIntoPollEvents,
  foldPollEventsIntoToolResult,
  resolveMessageAlias,
};
