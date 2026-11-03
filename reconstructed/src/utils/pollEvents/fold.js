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
  xQo,
  RQo,
  remintEventNonce,
  gXr,
  vYe,
  wQo,
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
import { POLL, Gkn } from "../../tools/PollTool/prompt.js";
import { uniq } from "../collections.js";
import { hPt } from "../messageKinds.js";

//@ chunk-e6aww6q8.js:169498-169522 placement
function isPollEventsFoldEnabled() {
  return !1;
}
//@ chunk-e6aww6q8.js:169522-169562 placement
var EVENT_AT_PATTERN = /^<event\b[^>]*?\bat="([^"]*)"/;
/**
 * 把连续的附件消息段中可折叠的 task-notification 排队命令并入 poll_events 附件（与入站附件无关）。
 */
//@ chunk-e6aww6q8.js:169562-169796 placement = sanitizeFileName (1)
function foldQueuedNotificationsIntoPollEvents(messages, foldableUuids) {
  if (foldableUuids.size === 0) return messages.slice();
  let r = [],
    s = 0;
  while (s < messages.length) {
    if (messages[s].type !== "attachment") {
      (r.push(messages[s]), s++);
      continue;
    }
    let h = s;
    while (h < messages.length && messages[h].type === "attachment") h++;
    (r.push(...foldAttachmentRun(messages.slice(s, h), foldableUuids)), (s = h));
  }
  return r;
}
/**
 * 把连续的轮询事件附件折叠为一条。
 */
//@ chunk-e6aww6q8.js:169796-171080 placement
function foldAttachmentRun(e, n) {
  let r = new Map();
  for (let Z of e) {
    if (!n.has(Z.uuid)) continue;
    let Se = toPollEventEnvelope(Z);
    if (Se !== void 0) r.set(Z.uuid, Se);
  }
  if (r.size === 0) return e.slice();
  let found = e.find(
      (Z) =>
        Z.type === "attachment" &&
        Z.attachment.type === "poll_events" &&
        Z.attachment.deliveredVia === void 0,
    ),
    h = found?.type === "attachment" && found.attachment.type === "poll_events" ? found.attachment : void 0;
  if (h !== void 0 && (xQo(h.envelopes).length < h.envelopes.length || !h.envelopes.every(RQo)))
    return e.slice();
  let y = [];
  if (h !== void 0)
    h.envelopes.forEach((envelope, Se) => {
      y.push({
        envelope: envelope,
        kind: h.kinds[Se] ?? "unknown",
        provenance: h.provenance?.[Se] ?? null,
        declared: h.declared?.[Se] ?? null,
        media: h.media?.[Se] ?? [],
        at: EVENT_AT_PATTERN.exec(envelope)?.[1],
      });
    });
  let S = mergeEnvelopesByTime(y, [...r.values()]),
    any = S.some((Z) => Z.media.length > 0),
    L = {
      ...(h ?? { type: "poll_events", remainingWakeCount: 0 }),
      type: "poll_events",
      envelopes: S.map((Z) => remintEventNonce(Z.envelope, gXr(Z.envelope))),
      kinds: S.map((Z) => Z.kind),
      provenance: S.map((Z) => Z.provenance),
      ...(S.some((Z) => Z.declared !== null) && { declared: S.map((Z) => Z.declared) }),
      ...(any && { media: S.map((Z) => Z.media) }),
      timestamp: S.at(-1)?.at ?? h?.timestamp,
    };
  if (!any) delete L.media;
  let G = found ?? e.find((Z) => r.has(Z.uuid)),
    q = [];
  for (let Z of e)
    if (Z === G && Z.type === "attachment") {
      let { rendered: rendered, renderedInHumanTurn: renderedInHumanTurn, ...we } = Z;
      q.push({ ...we, attachment: L });
    } else if (Z !== found && !r.has(Z.uuid)) q.push(Z);
  return q;
}
//@ chunk-e6aww6q8.js:171080-171278 placement
function mergeEnvelopesByTime(e, n) {
  let r = [],
    s = 0,
    h = 0;
  while (s < e.length && h < n.length) {
    let parse = Date.parse(e[s].at ?? "");
    if (Date.parse(n[h].at ?? "") < parse) r.push(n[h++]);
    else r.push(e[s++]);
  }
  return r.concat(e.slice(s), n.slice(h));
}
//@ chunk-e6aww6q8.js:171278-172211 placement
function toPollEventEnvelope(e) {
  if (e.type !== "attachment" || e.attachment.type !== "queued_command") return;
  let attachment = e.attachment,
    r = answerOf(e.uuid);
  if (r !== void 0 && r.kind !== "engine") return;
  let s = resolveTaskNotificationOrigin(attachment.origin, attachment.commandMode);
  if (
    s?.kind !== "task-notification" ||
    s.subkind !== void 0 ||
    attachment.verifiedSlackHumanTurn === !0 ||
    attachment.batchedRelayPrompts !== void 0 ||
    attachment.hearthRelayMessageIds !== void 0 ||
    attachment.inlinedImagePaths !== void 0 ||
    attachment.toolsUsedDelta !== void 0
  )
    return;
  let { prompt: prompt } = attachment,
    y =
      typeof prompt === "string"
        ? prompt
        : Array.isArray(prompt) && prompt.every((q) => q?.type === "text")
          ? prompt.map((q) => q.text).join(`
`)
          : void 0,
    S = attachment.timestamp ?? e.timestamp;
  if (y === void 0 || typeof S !== "string") return;
  let index = y.indexOf(`</${TASK_NOTIFICATION}>`);
  if (index !== -1 && regExp_5.test(y.slice(index + `</${TASK_NOTIFICATION}>`.length))) return;
  let L = withSystemNotificationPrefix(escapeSystemReminderClose(vYe(y)));
  if (wQo(L)) return;
  let G = void 0;
  if (G?.ok === !1) return;
  return {
    envelope:
      G === void 0
        ? withEventNonce(
            renderPollEvent({ kind: TASK_NOTIFICATION_2, at: S, content: L }),
            deriveEventNonce(e.uuid),
            "element",
          )
        : withEventNonce(G.envelope, deriveEventNonce(e.uuid), "json"),
    kind: TASK_NOTIFICATION_2,
    provenance: null,
    declared: null,
    media: [],
    at: S,
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
function foldPollEventsIntoToolResult(e, n, r) {
  if (!isPollEventsFoldEnabled() || n + 1 !== e.length - 1) return !1;
  let s = e[n],
    h = e[n + 1];
  if (s?.type !== "assistant" || h?.type !== "user" || typeof h.message.content === "string") return !1;
  let y = new Set(
      s.message.content.flatMap((Me) =>
        Me.type === "tool_use" && Me.name === POLL && !Me.id.startsWith(POLL_2) ? [Me.id] : [],
      ),
    ),
    sliced = h.message.content.slice(),
    index = sliced.findIndex((Me) => Me.type === "tool_result" && y.has(Me.tool_use_id)),
    L = sliced[index];
  if (L?.type !== "tool_result" || foldedToolResults.has(L) || L.is_error === !0) return !1;
  let G = typeof L.content === "string" ? [{ type: "text", text: L.content }] : (L.content ?? []),
    joined = G.flatMap((Me) => (Me.type === "text" ? [Me.text] : [])).join(""),
    filtered = G.filter((Me) => Me.type !== "text"),
    Se = Gkn(joined) ? [] : parseDeliveredPollEvents(joined);
  if (Se === void 0 && isPollEventDeliveryText(joined)) return !1;
  let ke = Se?.map((Me) => remintEventNonce(Me, gXr(Me))),
    sorted = uniq([
      ...(Se === void 0 ? [] : (parseToolsUsedBeforeSummary(joined) ?? [])),
      ...(r.toolsUsed ?? []),
    ]).sort(),
    Ee =
      buildPollEventDelivery([...(ke ?? []), ...r.envelopes], r.remainingWakeCount, sorted) +
      (Se === void 0 && joined !== ""
        ? `
${joined}`
        : ""),
    Ae = [...filtered, ...(r.media ?? []).flat()],
    Ie = { ...L, content: Ae.length === 0 ? Ee : [{ type: "text", text: Ee }, ...Ae] };
  return (
    foldedToolResults.add(Ie),
    (sliced[index] = Ie),
    (e[n + 1] = { ...h, message: { ...h.message, content: sliced } }),
    !0
  );
}
//@ chunk-e6aww6q8.js:173402-173422 placement
var foldedToolResults = new WeakSet();
/**
 * 若消息带有别名记录且 uuid 相同，返回别名消息，否则原样返回。
 */
//@ chunk-e6aww6q8.js:173422-173536 placement = sanitizeFileName (1)
function resolveMessageAlias(message) {
  let n = message.type === "user" || message.type === "attachment" ? message[hPt] : void 0;
  return n !== void 0 && n.uuid === message.uuid ? n : message;
}

export {
  isPollEventsFoldEnabled,
  foldQueuedNotificationsIntoPollEvents,
  foldPollEventsIntoToolResult,
  resolveMessageAlias,
};
