/**
 * utils/externalEventWake.ts
 *
 * 2.1.316 新增。解析外部事件唤醒文本（<wake reason="external-event">），只接受字段合法的记录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-71rdrfpa.js (14)
 * attribution: placement 14
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { record, string, unknown, u, literal, array } from "../../vendor/zod/v4/classic/schemas.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { jsonParse } from "./slowOperations.js";

//@ chunk-71rdrfpa.js:346-386 placement
var EXTERNAL_EVENT_WAKE_PREFIX = '<wake reason="external-event"';
//@ chunk-71rdrfpa.js:386-427 placement
function isExternalEventWakeText(e) {
  return e.startsWith(EXTERNAL_EVENT_WAKE_PREFIX);
}
//@ chunk-71rdrfpa.js:427-642 placement
/**
 * 唤醒文本字段正则
 */
var WAKE_TEXT_PATTERNS = /^[a-z0-9-]{1,32}$/;
var EVENT_KIND_PATTERN = /^[a-z0-9_.-]{1,64}$/;
var MAX_WAKE_HEADER_LENGTH = 2048;
var WAKE_ATTR_RE = /([a-z][a-z-]*)="([^"\s]{0,256})"/g;
var WAKE_TOP_LEVEL_KEYS = new Set(["reason", "current-time"]);
var WAKE_EVENT_KEYS = new Set(["source", "kind", "from", "trust", "untrusted-keys"]);
var ExternalEventWakeSchema = DoctorLazy(() => record(string(), unknown()));
//@ chunk-71rdrfpa.js:642-677 placement
function isBlank(e) {
  return e.trim() === "";
}
//@ chunk-71rdrfpa.js:677-1758 placement
/**
 * 解析外部事件唤醒文本（<wake reason="external-event">），只接受字段合法的记录。
 */
function parseExternalEventWake(e) {
  if (!isExternalEventWakeText(e)) return null;
  let index = e.indexOf(">");
  if (index === -1 || index > MAX_WAKE_HEADER_LENGTH) return null;
  let sliced = e.slice(5, index);
  if (!isBlank(sliced.replace(WAKE_ATTR_RE, " "))) return null;
  for (let i of sliced.matchAll(WAKE_ATTR_RE)) if (!WAKE_TOP_LEVEL_KEYS.has(i[1])) return null;
  let index_2 = e.indexOf("<event ", index + 1);
  if (index_2 === -1 || !isBlank(e.slice(index + 1, index_2))) return null;
  let index_3 = e.indexOf(">", index_2);
  if (index_3 === -1 || index_3 - index_2 > MAX_WAKE_HEADER_LENGTH) return null;
  let index_4 = e.indexOf("</event>", index_3 + 1);
  if (index_4 === -1) return null;
  let y = index_4 + 8;
  let index_5 = e.indexOf("</wake>", y);
  if (index_5 === -1 || !isBlank(e.slice(y, index_5))) return null;
  if (!isBlank(e.slice(index_5 + 7))) return null;
  let a = new Map();
  let sliced_2 = e.slice(index_2 + 6, index_3);
  if (!isBlank(sliced_2.replace(WAKE_ATTR_RE, " "))) return null;
  for (let i of sliced_2.matchAll(WAKE_ATTR_RE)) {
    if (!WAKE_EVENT_KEYS.has(i[1])) return null;
    let S = i[1];
    if (!a.has(S)) a.set(S, i[2]);
  }
  let k = a.get("source");
  let _ = a.get("kind");
  if (k === undefined || _ === undefined || !WAKE_TEXT_PATTERNS.test(k) || !EVENT_KIND_PATTERN.test(_))
    return null;
  let sliced_3 = e.slice(index_3 + 1, index_4);
  let index_6 = sliced_3.indexOf("<!--");
  if (index_6 !== -1) {
    if (!isBlank(sliced_3.slice(0, index_6))) return null;
    let index = sliced_3.indexOf("-->", index_6 + 4);
    if (index === -1) return null;
    sliced_3 = sliced_3.slice(index + 3);
  }
  let eventJson = parseEventJson(sliced_3);
  if (eventJson === null) return null;
  let R = a.get("from");
  let untrustedKeys = (a.get("untrusted-keys") ?? "").split(",").filter((i) => i !== "");
  return {
    source: k,
    kind: _,
    ...(R !== undefined && {
      from: R,
    }),
    data: eventJson,
    untrustedKeys,
  };
}
//@ chunk-71rdrfpa.js:1758-2132 placement
/**
 * 外部事件唤醒 schema
 */
var externalEventWakeSchema = /^[^"'<>&\s]{0,256}$/;
var EVENT_FIELD_RE = /^[^"'<>&\s,]{1,256}$/;
var externalEventWakeZodSchema = DoctorLazy(() =>
  u({
    reason: literal("external-event"),
    current_time: string().regex(externalEventWakeSchema),
    event: u({
      source: string().regex(WAKE_TEXT_PATTERNS),
      kind: string().regex(EVENT_KIND_PATTERN),
      from: string().regex(externalEventWakeSchema),
      trust: string().regex(externalEventWakeSchema),
      untrusted_keys: array(string().regex(EVENT_FIELD_RE))
        .refine((e) => e.join(",").length <= 256)
        .optional(),
      guidance: string()
        .refine((e) => !e.includes("--") && !e.includes("</event>"))
        .optional(),
      data: string(),
    }),
  }),
);
//@ chunk-71rdrfpa.js:2132-2615 placement
function resolveExternalEventWake(e, n) {
  if (!isExternalEventWakeText(e)) return null;
  let r = externalEventWakeZodSchema().safeParse(n);
  if (!r.success) {
    if (externalEventReasonSchema().safeParse(n).success)
      logFeatureSad("ccr_external_event_record", "malformed_record");
    return parseExternalEventWake(e);
  }
  let { event } = r.data;
  if (renderExternalEventWake(r.data) !== e) {
    logFeatureSad("ccr_external_event_record", "text_mismatch");
    return parseExternalEventWake(e);
  }
  let eventJson = parseEventJson(event.data);
  if (eventJson === null) {
    logFeatureSad("ccr_external_event_record", "malformed_record");
    return parseExternalEventWake(e);
  }
  logFeatureOk("ccr_external_event_record");
  return {
    source: event.source,
    kind: event.kind,
    from: event.from,
    data: eventJson,
    untrustedKeys: event.untrusted_keys ?? [],
  };
}
//@ chunk-71rdrfpa.js:2615-2660 placement
var externalEventReasonSchema = DoctorLazy(() =>
  u({
    reason: literal("external-event"),
  }),
);
//@ chunk-71rdrfpa.js:2660-3150 placement
/**
 * 渲染外部事件唤醒文本
 */
function renderExternalEventWake({ current_time: currentTime, event }) {
  let r =
    event.untrusted_keys === undefined || event.untrusted_keys.length === 0
      ? ""
      : ` untrusted-keys="${event.untrusted_keys.join(",")}"`;
  let t =
    event.guidance === undefined || event.guidance === ""
      ? ""
      : `    <!-- ${event.guidance} -->
`;
  let replaced = event.data.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
  return (
    `<wake reason="external-event" current-time="${currentTime}">
  <event source="${event.source}" kind="${event.kind}" from="${event.from}" trust="${event.trust}"${r}>
` +
    t +
    `    ${replaced}
  </event>
</wake>`
  );
}
//@ chunk-71rdrfpa.js:3150-3364 placement
/**
 * 解析事件 JSON
 */
function parseEventJson(e) {
  let trimmed = e.trim();
  if (!trimmed.startsWith("{")) return null;
  let r;
  try {
    r = jsonParse(trimmed);
  } catch {
    return null;
  }
  if (typeof r !== "object" || r === null || Array.isArray(r)) return null;
  let t = ExternalEventWakeSchema().safeParse(r);
  return t.success ? t.data : null;
}
//@ chunk-71rdrfpa.js:3364-3443 placement
function isSessionInboxWake(e) {
  return e.source === "session-inbox" && e.kind === "message.received";
}
//@ chunk-71rdrfpa.js:3443-3525 placement
function isServerInboxDelivery(e) {
  return e?.kind === "task-notification" && e.subkind === "session-inbox";
}
//@ chunk-71rdrfpa.js:3525-3609 placement
function isOwnerInboxNotice(wake) {
  return isSessionInboxWake(wake) && wake.from === "rc_owner" && wake.data.sender_kind === "rc_owner";
}
//@ chunk-71rdrfpa.js:3609-3735 placement
function ownerInboxNoticeFileId(e, n) {
  if (!isServerInboxDelivery(e)) return;
  let externalEventWake = parseExternalEventWake(n);
  let fileId =
    externalEventWake !== null && isOwnerInboxNotice(externalEventWake)
      ? externalEventWake.data.file_id
      : undefined;
  return typeof fileId === "string" ? fileId : undefined;
}
export {
  parseExternalEventWake,
  isSessionInboxWake,
  isOwnerInboxNotice,
  isServerInboxDelivery,
  ownerInboxNoticeFileId,
};
