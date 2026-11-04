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
import {
  record,
  stringSchema,
  unknown,
  objectSchema,
  literal,
  array,
} from "../../vendor/zod/v4/classic/schemas.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { jsonParse } from "./slowOperations.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-71rdrfpa.js:346-386 placement
var EXTERNAL_EVENT_WAKE_PREFIX = '<wake reason="external-event"';
//@ chunk-71rdrfpa.js:386-427 placement
function isExternalEventWakeText(text) {
  return text.startsWith(EXTERNAL_EVENT_WAKE_PREFIX);
}
//@ chunk-71rdrfpa.js:427-642 placement
/**
 * 唤醒文本字段正则
 */
var WAKE_TEXT_PATTERNS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var EVENT_KIND_PATTERN;
var MAX_WAKE_HEADER_LENGTH;
var WAKE_ATTR_RE;
var WAKE_TOP_LEVEL_KEYS;
var WAKE_EVENT_KEYS;
var ExternalEventWakeSchema;
deferInit("chunk-71rdrfpa.js:427", () => {
  WAKE_TEXT_PATTERNS = /^[a-z0-9-]{1,32}$/;
  EVENT_KIND_PATTERN = /^[a-z0-9_.-]{1,64}$/;
  MAX_WAKE_HEADER_LENGTH = 2048;
  WAKE_ATTR_RE = /([a-z][a-z-]*)="([^"\s]{0,256})"/g;
  WAKE_TOP_LEVEL_KEYS = new Set(["reason", "current-time"]);
  WAKE_EVENT_KEYS = new Set(["source", "kind", "from", "trust", "untrusted-keys"]);
  ExternalEventWakeSchema = DoctorLazy(() => record(stringSchema(), unknown()));
});
//@ chunk-71rdrfpa.js:642-677 placement
function isBlank(text) {
  return text.trim() === "";
}
//@ chunk-71rdrfpa.js:677-1758 placement
/**
 * 解析外部事件唤醒文本（<wake reason="external-event">），只接受字段合法的记录。
 */
function parseExternalEventWake(text) {
  if (!isExternalEventWakeText(text)) return null;
  let index = text.indexOf(">");
  if (index === -1 || index > MAX_WAKE_HEADER_LENGTH) return null;
  let sliced = text.slice(5, index);
  if (!isBlank(sliced.replace(WAKE_ATTR_RE, " "))) return null;
  for (let attrMatch of sliced.matchAll(WAKE_ATTR_RE))
    if (!WAKE_TOP_LEVEL_KEYS.has(attrMatch[1])) return null;
  let index_2 = text.indexOf("<event ", index + 1);
  if (index_2 === -1 || !isBlank(text.slice(index + 1, index_2))) return null;
  let index_3 = text.indexOf(">", index_2);
  if (index_3 === -1 || index_3 - index_2 > MAX_WAKE_HEADER_LENGTH) return null;
  let index_4 = text.indexOf("</event>", index_3 + 1);
  if (index_4 === -1) return null;
  let eventBodyStart = index_4 + 8;
  let index_5 = text.indexOf("</wake>", eventBodyStart);
  if (index_5 === -1 || !isBlank(text.slice(eventBodyStart, index_5))) return null;
  if (!isBlank(text.slice(index_5 + 7))) return null;
  let eventAttrs = new Map();
  let sliced_2 = text.slice(index_2 + 6, index_3);
  if (!isBlank(sliced_2.replace(WAKE_ATTR_RE, " "))) return null;
  for (let attrMatch of sliced_2.matchAll(WAKE_ATTR_RE)) {
    if (!WAKE_EVENT_KEYS.has(attrMatch[1])) return null;
    let attrName = attrMatch[1];
    if (!eventAttrs.has(attrName)) eventAttrs.set(attrName, attrMatch[2]);
  }
  let source = eventAttrs.get("source");
  let kind = eventAttrs.get("kind");
  if (
    source === undefined ||
    kind === undefined ||
    !WAKE_TEXT_PATTERNS.test(source) ||
    !EVENT_KIND_PATTERN.test(kind)
  )
    return null;
  let text_2 = text.slice(index_3 + 1, index_4);
  let index_6 = text_2.indexOf("<!--");
  if (index_6 !== -1) {
    if (!isBlank(text_2.slice(0, index_6))) return null;
    let index = text_2.indexOf("-->", index_6 + 4);
    if (index === -1) return null;
    text_2 = text_2.slice(index + 3);
  }
  let eventJson = parseEventJson(text_2);
  if (eventJson === null) return null;
  let from = eventAttrs.get("from");
  let untrustedKeys = (eventAttrs.get("untrusted-keys") ?? "").split(",").filter((keyName) => keyName !== "");
  return {
    source,
    kind,
    ...(from !== undefined && {
      from,
    }),
    data: eventJson,
    untrustedKeys,
  };
}
//@ chunk-71rdrfpa.js:1758-2132 placement
/**
 * 外部事件唤醒 schema
 */
var SAFE_WAKE_FIELD_RE; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var EVENT_FIELD_RE;
var externalEventWakeZodSchema;
deferInit("chunk-71rdrfpa.js:1758", () => {
  SAFE_WAKE_FIELD_RE = /^[^"'<>&\s]{0,256}$/;
  EVENT_FIELD_RE = /^[^"'<>&\s,]{1,256}$/;
  externalEventWakeZodSchema = DoctorLazy(() =>
    objectSchema({
      reason: literal("external-event"),
      current_time: stringSchema().regex(SAFE_WAKE_FIELD_RE),
      event: objectSchema({
        source: stringSchema().regex(WAKE_TEXT_PATTERNS),
        kind: stringSchema().regex(EVENT_KIND_PATTERN),
        from: stringSchema().regex(SAFE_WAKE_FIELD_RE),
        trust: stringSchema().regex(SAFE_WAKE_FIELD_RE),
        untrusted_keys: array(stringSchema().regex(EVENT_FIELD_RE))
          .refine((keys) => keys.join(",").length <= 256)
          .optional(),
        guidance: stringSchema()
          .refine((value) => !value.includes("--") && !value.includes("</event>"))
          .optional(),
        data: stringSchema(),
      }),
    }),
  );
});
//@ chunk-71rdrfpa.js:2132-2615 placement
function resolveExternalEventWake(text, record) {
  if (!isExternalEventWakeText(text)) return null;
  let parseResult = externalEventWakeZodSchema().safeParse(record);
  if (!parseResult.success) {
    if (externalEventReasonSchema().safeParse(record).success)
      logFeatureSad("ccr_external_event_record", "malformed_record");
    return parseExternalEventWake(text);
  }
  let { event } = parseResult.data;
  if (renderExternalEventWake(parseResult.data) !== text) {
    logFeatureSad("ccr_external_event_record", "text_mismatch");
    return parseExternalEventWake(text);
  }
  let eventJson = parseEventJson(event.data);
  if (eventJson === null) {
    logFeatureSad("ccr_external_event_record", "malformed_record");
    return parseExternalEventWake(text);
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
var externalEventReasonSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-71rdrfpa.js:2615", () => {
  externalEventReasonSchema = DoctorLazy(() =>
    objectSchema({
      reason: literal("external-event"),
    }),
  );
});
//@ chunk-71rdrfpa.js:2660-3150 placement
/**
 * 渲染外部事件唤醒文本
 */
function renderExternalEventWake({ current_time: currentTime, event }) {
  let trustAttr =
    event.untrusted_keys === undefined || event.untrusted_keys.length === 0
      ? ""
      : ` untrusted-keys="${event.untrusted_keys.join(",")}"`;
  let bodyText =
    event.guidance === undefined || event.guidance === ""
      ? ""
      : `    <!-- ${event.guidance} -->
`;
  let replaced = event.data.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
  return (
    `<wake reason="external-event" current-time="${currentTime}">
  <event source="${event.source}" kind="${event.kind}" from="${event.from}" trust="${event.trust}"${trustAttr}>
` +
    bodyText +
    `    ${replaced}
  </event>
</wake>`
  );
}
//@ chunk-71rdrfpa.js:3150-3364 placement
/**
 * 解析事件 JSON
 */
function parseEventJson(text) {
  let trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  let parsed;
  try {
    parsed = jsonParse(trimmed);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  let parseResult = ExternalEventWakeSchema().safeParse(parsed);
  return parseResult.success ? parseResult.data : null;
}
//@ chunk-71rdrfpa.js:3364-3443 placement
function isSessionInboxWake(wake) {
  return wake.source === "session-inbox" && wake.kind === "message.received";
}
//@ chunk-71rdrfpa.js:3443-3525 placement
function isServerInboxDelivery(delivery) {
  return delivery?.kind === "task-notification" && delivery.subkind === "session-inbox";
}
//@ chunk-71rdrfpa.js:3525-3609 placement
function isOwnerInboxNotice(wake) {
  return isSessionInboxWake(wake) && wake.from === "rc_owner" && wake.data.sender_kind === "rc_owner";
}
//@ chunk-71rdrfpa.js:3609-3735 placement
function ownerInboxNoticeFileId(delivery, text) {
  if (!isServerInboxDelivery(delivery)) return;
  let externalEventWake = parseExternalEventWake(text);
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
  EXTERNAL_EVENT_WAKE_PREFIX,
  isExternalEventWakeText,
  resolveExternalEventWake,
};
