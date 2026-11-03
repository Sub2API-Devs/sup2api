/**
 * daemon/jobs/attachErrors.ts
 *
 * 2.1.316 新增：附加结束时上报遥测（交互是否到达、耗时）；附加/控制错误码与提示文本等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrr64ez0.js (5)
 * attribution: placement 5
 */
import { KICKED_ATTACH_CODE, SUPERVISOR_DETACH_CODE, BG_PROTO } from "../../services/daemon/leaseProtocol.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { controlRequest } from "../../services/daemon/controlClient.js";

//@ chunk-vrr64ez0.js:9089-9464 placement
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
//@ chunk-vrr64ez0.js:9464-9527 placement
function attachErrorCode(code) {
  return Object.hasOwn(ATTACH_ERROR_CODES, code) ? ATTACH_ERROR_CODES[code] : "unknown_code";
}
//@ chunk-vrr64ez0.js:9527-9891 placement
/**
 * 从错误文本分类附加失败原因。
 */
function classifyAttachError(e) {
  if (e === undefined || e === "") return;
  if (KICKED_ATTACH_CODE.test(e)) return "ekicked";
  if (e.includes("ERESPAWNING")) return "erespawning";
  if (e.includes("ESTARTING")) return "estarting";
  if (e.includes("ESTALLED")) return "estalled";
  if (e.includes("EUNVERIFIED")) return "eunverified";
  if (e.includes("EHOSTDEAD")) return "ehostdead";
  if (SUPERVISOR_DETACH_CODE.test(e)) return "unknown_code";
  return "worker_detach";
}
//@ chunk-vrr64ez0.js:9891-10803 placement
/**
 * 附加结束时上报遥测（交互是否到达、耗时）。
 */
function reportAttachTelemetry(e, n, o) {
  if (!e) return;
  let reached = e.interactive?.reached;
  let marksExpected = n === "detached" ? e.interactive?.marksExpected : undefined;
  let s = n === "detached" && reached === undefined && marksExpected === true;
  let h = s && e.t0 !== undefined ? Math.round(performance.now() - e.t0) : undefined;
  logEvent("tengu_bg_attach_outcome", {
    outcome: fromEnum(n),
    got_ack: false,
    got_first_frame: false,
    synthetic: true,
    apc_detach: false,
    failure_class: fromEnumOpt(n === "error" ? (o ?? "daemon_unavailable") : undefined),
    gesture_id: sanitizeMarkName(e.gestureId),
    attempt: ++e.attempt,
    surface: fromEnumOpt(e.surface),
    daemon_booted: e.daemonBooted,
    via: fromEnumOpt(e.interactive?.via),
    attach_cold: e.interactive?.attachCold,
    attach_ms: reached !== undefined ? reached.attachMs : h,
    content_paint_ms: reached !== undefined ? Math.round(reached.contentPaintMs) : undefined,
    prompt_idle_ms: reached !== undefined ? Math.round(reached.promptIdleMs) : undefined,
    msgs_loaded: reached?.msgsLoaded,
    msgs_in_jsonl: reached?.msgsInJsonl,
    msgs_rendered_at_first_paint: reached?.msgsRenderedAtFirstPaint,
    first_frame_kind: fromEnumOpt(reached !== undefined ? "real" : undefined),
    marks_expected: reached !== undefined ? true : marksExpected,
    attach_censored: s ? true : undefined,
  });
}
//@ chunk-vrr64ez0.js:10803-10911 placement
/**
 * 向守护进程询问短 id 对应的后台会话是否存在，明确不存在时为真。
 */
async function isBackgroundSessionGone(short) {
  let n = await controlRequest({
    proto: BG_PROTO,
    op: "has",
    short,
  });
  return n.ok && n.op === "has" && n.present === false;
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
