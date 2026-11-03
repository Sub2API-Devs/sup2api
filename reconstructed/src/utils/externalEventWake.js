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
import { pe, o, oe, u, T, A } from "../../vendor/zod/v4/classic/schemas.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { jsonParse } from "./slowOperations.js";

//@ chunk-71rdrfpa.js:346-386 placement
var EXTERNAL_EVENT_WAKE_PREFIX = '<wake reason="external-event"';
//@ chunk-71rdrfpa.js:386-427 placement
function isExternalEventWakeText(e) {
  return e.startsWith(EXTERNAL_EVENT_WAKE_PREFIX);
}
/**
 * 唤醒文本字段正则
 */
//@ chunk-71rdrfpa.js:427-642 placement
var WAKE_TEXT_PATTERNS = /^[a-z0-9-]{1,32}$/,
  w = /^[a-z0-9_.-]{1,64}$/,
  b = 2048,
  d = /([a-z][a-z-]*)="([^"\s]{0,256})"/g,
  N = new Set(["reason", "current-time"]),
  P = new Set(["source", "kind", "from", "trust", "untrusted-keys"]),
  j = DoctorLazy(() => pe(o(), oe()));
//@ chunk-71rdrfpa.js:642-677 placement
function c(e) {
  return e.trim() === "";
}
/**
 * 解析外部事件唤醒文本（<wake reason="external-event">），只接受字段合法的记录。
 */
//@ chunk-71rdrfpa.js:677-1758 placement
function parseExternalEventWake(e) {
  if (!isExternalEventWakeText(e)) return null;
  let index = e.indexOf(">");
  if (index === -1 || index > b) return null;
  let sliced = e.slice(5, index);
  if (!c(sliced.replace(d, " "))) return null;
  for (let i of sliced.matchAll(d)) if (!N.has(i[1])) return null;
  let index_2 = e.indexOf("<event ", index + 1);
  if (index_2 === -1 || !c(e.slice(index + 1, index_2))) return null;
  let index_3 = e.indexOf(">", index_2);
  if (index_3 === -1 || index_3 - index_2 > b) return null;
  let index_4 = e.indexOf("</event>", index_3 + 1);
  if (index_4 === -1) return null;
  let y = index_4 + 8,
    index_5 = e.indexOf("</wake>", y);
  if (index_5 === -1 || !c(e.slice(y, index_5))) return null;
  if (!c(e.slice(index_5 + 7))) return null;
  let a = new Map(),
    sliced_2 = e.slice(index_2 + 6, index_3);
  if (!c(sliced_2.replace(d, " "))) return null;
  for (let i of sliced_2.matchAll(d)) {
    if (!P.has(i[1])) return null;
    let S = i[1];
    if (!a.has(S)) a.set(S, i[2]);
  }
  let k = a.get("source"),
    _ = a.get("kind");
  if (k === void 0 || _ === void 0 || !WAKE_TEXT_PATTERNS.test(k) || !w.test(_)) return null;
  let sliced_3 = e.slice(index_3 + 1, index_4),
    index_6 = sliced_3.indexOf("<!--");
  if (index_6 !== -1) {
    if (!c(sliced_3.slice(0, index_6))) return null;
    let index = sliced_3.indexOf("-->", index_6 + 4);
    if (index === -1) return null;
    sliced_3 = sliced_3.slice(index + 3);
  }
  let z = parseEventJson(sliced_3);
  if (z === null) return null;
  let R = a.get("from"),
    filtered = (a.get("untrusted-keys") ?? "").split(",").filter((i) => i !== "");
  return { source: k, kind: _, ...(R !== void 0 && { from: R }), data: z, untrustedKeys: filtered };
}
/**
 * 外部事件唤醒 schema
 */
//@ chunk-71rdrfpa.js:1758-2132 placement
var externalEventWakeSchema = /^[^"'<>&\s]{0,256}$/,
  C = /^[^"'<>&\s,]{1,256}$/,
  K = DoctorLazy(() =>
    u({
      reason: T("external-event"),
      current_time: o().regex(externalEventWakeSchema),
      event: u({
        source: o().regex(WAKE_TEXT_PATTERNS),
        kind: o().regex(w),
        from: o().regex(externalEventWakeSchema),
        trust: o().regex(externalEventWakeSchema),
        untrusted_keys: A(o().regex(C))
          .refine((e) => e.join(",").length <= 256)
          .optional(),
        guidance: o()
          .refine((e) => !e.includes("--") && !e.includes("</event>"))
          .optional(),
        data: o(),
      }),
    }),
  );
//@ chunk-71rdrfpa.js:2132-2615 placement
function resolveExternalEventWake(e, n) {
  if (!isExternalEventWakeText(e)) return null;
  let safeParse = K().safeParse(n);
  if (!safeParse.success) {
    if (B().safeParse(n).success) logFeatureSad("ccr_external_event_record", "malformed_record");
    return parseExternalEventWake(e);
  }
  let { event: event } = safeParse.data;
  if (renderExternalEventWake(safeParse.data) !== e)
    return (logFeatureSad("ccr_external_event_record", "text_mismatch"), parseExternalEventWake(e));
  let s = parseEventJson(event.data);
  if (s === null)
    return (logFeatureSad("ccr_external_event_record", "malformed_record"), parseExternalEventWake(e));
  return (
    logFeatureOk("ccr_external_event_record"),
    {
      source: event.source,
      kind: event.kind,
      from: event.from,
      data: s,
      untrustedKeys: event.untrusted_keys ?? [],
    }
  );
}
//@ chunk-71rdrfpa.js:2615-2660 placement
var B = DoctorLazy(() => u({ reason: T("external-event") }));
/**
 * 渲染外部事件唤醒文本
 */
//@ chunk-71rdrfpa.js:2660-3150 placement
function renderExternalEventWake({ current_time: current_time, event: event }) {
  let r =
      event.untrusted_keys === void 0 || event.untrusted_keys.length === 0
        ? ""
        : ` untrusted-keys="${event.untrusted_keys.join(",")}"`,
    t =
      event.guidance === void 0 || event.guidance === ""
        ? ""
        : `    <!-- ${event.guidance} -->
`,
    replaced = event.data.replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
  return (
    `<wake reason="external-event" current-time="${current_time}">
  <event source="${event.source}" kind="${event.kind}" from="${event.from}" trust="${event.trust}"${r}>
` +
    t +
    `    ${replaced}
  </event>
</wake>`
  );
}
/**
 * 解析事件 JSON
 */
//@ chunk-71rdrfpa.js:3150-3364 placement
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
  let safeParse = j().safeParse(r);
  return safeParse.success ? safeParse.data : null;
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
function isOwnerInboxNotice(e) {
  return isSessionInboxWake(e) && e.from === "rc_owner" && e.data.sender_kind === "rc_owner";
}
//@ chunk-71rdrfpa.js:3609-3735 placement
function ownerInboxNoticeFileId(e, n) {
  if (!isServerInboxDelivery(e)) return;
  let r = parseExternalEventWake(n),
    t = r !== null && isOwnerInboxNotice(r) ? r.data.file_id : void 0;
  return typeof t === "string" ? t : void 0;
}

export {
  parseExternalEventWake,
  isSessionInboxWake,
  isOwnerInboxNotice,
  isServerInboxDelivery,
  ownerInboxNoticeFileId,
};
