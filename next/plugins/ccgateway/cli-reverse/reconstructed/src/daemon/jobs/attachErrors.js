/**
 * daemon/jobs/attachErrors.ts
 *
 * 2.1.316 新增：附加结束时上报遥测（交互是否到达、耗时）；附加/控制错误码与提示文本等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bjxz9pt3.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { KICKED_ATTACH_CODE, SUPERVISOR_DETACH_CODE, BG_PROTO } from "../../services/daemon/leaseProtocol.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { controlRequest } from "../../services/daemon/controlClient.js";

//@ chunk-bjxz9pt3.js:9124-9499 placement
/**
 * 附加/控制错误码与提示文本。
 */
var ATTACH_ERROR_CODES_2 = 1e4;
var ENORESPONSE = "ENORESPONSE";
var SESSION_NOT_RESPONDING_TEXT = "Session isn't responding";
var ATTACH_ERROR_CODES = {
  ENOJOB: "enojob",
  ETIMEOUT: "etimeout",
  ECWDGONE: "ecwdgone",
  EUNKNOWN: "eunknown",
  ENOREPLY: "enoreply",
  ERESPAWNING: "erespawning",
  ESTALE: "estale",
  EALIVE: "ealive",
  ESTARTING: "estarting",
  EPEERUID: "epeeruid",
  ETOOLARGE: "etoolarge",
  EUNVERIFIED: "eunverified",
  EAUTH: "eauth",
  EPROTO: "eproto",
  EHOSTDEAD: "ehostdead",
  ESKEW: "eskew",
};
//@ chunk-bjxz9pt3.js:9499-9562 placement
function attachErrorCode(code) {
  return Object.hasOwn(ATTACH_ERROR_CODES, code) ? ATTACH_ERROR_CODES[code] : "unknown_code";
}
//@ chunk-bjxz9pt3.js:9562-9926 placement
/**
 * 从错误文本分类附加失败原因。
 */
function classifyAttachError(code) {
  if (code === undefined || code === "") return;
  if (KICKED_ATTACH_CODE.test(code)) return "ekicked";
  if (code.includes("ERESPAWNING")) return "erespawning";
  if (code.includes("ESTARTING")) return "estarting";
  if (code.includes("ESTALLED")) return "estalled";
  if (code.includes("EUNVERIFIED")) return "eunverified";
  if (code.includes("EHOSTDEAD")) return "ehostdead";
  if (SUPERVISOR_DETACH_CODE.test(code)) return "unknown_code";
  return "worker_detach";
}
//@ chunk-bjxz9pt3.js:9926-10838 placement
/**
 * 附加结束时上报遥测（交互是否到达、耗时）。
 */
function reportAttachTelemetry(markers, outcome, failureClass) {
  if (!markers) return;
  let reached = markers.interactive?.reached;
  let marksExpected = outcome === "detached" ? markers.interactive?.marksExpected : undefined;
  let isCensored = outcome === "detached" && reached === undefined && marksExpected === true;
  let elapsedMs =
    isCensored && markers.t0 !== undefined ? Math.round(performance.now() - markers.t0) : undefined;
  logEvent("tengu_bg_attach_outcome", {
    outcome: fromEnum(outcome),
    got_ack: false,
    got_first_frame: false,
    synthetic: true,
    apc_detach: false,
    failure_class: fromEnumOpt(outcome === "error" ? (failureClass ?? "daemon_unavailable") : undefined),
    gesture_id: sanitizeMarkName(markers.gestureId),
    attempt: ++markers.attempt,
    surface: fromEnumOpt(markers.surface),
    daemon_booted: markers.daemonBooted,
    via: fromEnumOpt(markers.interactive?.via),
    attach_cold: markers.interactive?.attachCold,
    attach_ms: reached !== undefined ? reached.attachMs : elapsedMs,
    content_paint_ms: reached !== undefined ? Math.round(reached.contentPaintMs) : undefined,
    prompt_idle_ms: reached !== undefined ? Math.round(reached.promptIdleMs) : undefined,
    msgs_loaded: reached?.msgsLoaded,
    msgs_in_jsonl: reached?.msgsInJsonl,
    msgs_rendered_at_first_paint: reached?.msgsRenderedAtFirstPaint,
    first_frame_kind: fromEnumOpt(reached !== undefined ? "real" : undefined),
    marks_expected: reached !== undefined ? true : marksExpected,
    attach_censored: isCensored ? true : undefined,
  });
}
//@ chunk-bjxz9pt3.js:10838-10946 placement
/**
 * 向守护进程询问短 id 对应的后台会话是否存在，明确不存在时为真。
 */
async function isBackgroundSessionGone(short) {
  let reply = await controlRequest({
    proto: BG_PROTO,
    op: "has",
    short,
  });
  return reply.ok && reply.op === "has" && reply.present === false;
}
export {
  reportAttachTelemetry,
  isBackgroundSessionGone,
  ENORESPONSE,
  SESSION_NOT_RESPONDING_TEXT,
  classifyAttachError,
  attachErrorCode,
  ATTACH_ERROR_CODES_2,
};
