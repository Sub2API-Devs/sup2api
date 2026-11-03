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
import { ye } from "../../utils/startupMarks.js";
import { controlRequest } from "../../services/daemon/controlClient.js";

/**
 * 附加/控制错误码与提示文本。
 */
//@ chunk-vrr64ez0.js:9089-9464 placement
var ATTACH_ERROR_CODES = 1e4,
  ENORESPONSE = "ENORESPONSE",
  IHt = "Session isn't responding",
  an = {
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
function tr(e) {
  return Object.hasOwn(an, e) ? an[e] : "unknown_code";
}
/**
 * 从错误文本分类附加失败原因。
 */
//@ chunk-vrr64ez0.js:9527-9891 placement
function classifyAttachError(e) {
  if (e === void 0 || e === "") return;
  if (KICKED_ATTACH_CODE.test(e)) return "ekicked";
  if (e.includes("ERESPAWNING")) return "erespawning";
  if (e.includes("ESTARTING")) return "estarting";
  if (e.includes("ESTALLED")) return "estalled";
  if (e.includes("EUNVERIFIED")) return "eunverified";
  if (e.includes("EHOSTDEAD")) return "ehostdead";
  if (SUPERVISOR_DETACH_CODE.test(e)) return "unknown_code";
  return "worker_detach";
}
/**
 * 附加结束时上报遥测（交互是否到达、耗时）。
 */
//@ chunk-vrr64ez0.js:9891-10803 placement
function reportAttachTelemetry(e, n, o) {
  if (!e) return;
  let r = e.interactive?.reached,
    u = n === "detached" ? e.interactive?.marksExpected : void 0,
    s = n === "detached" && r === void 0 && u === !0,
    h = s && e.t0 !== void 0 ? Math.round(performance.now() - e.t0) : void 0;
  logEvent("tengu_bg_attach_outcome", {
    outcome: fromEnum(n),
    got_ack: !1,
    got_first_frame: !1,
    synthetic: !0,
    apc_detach: !1,
    failure_class: fromEnumOpt(n === "error" ? (o ?? "daemon_unavailable") : void 0),
    gesture_id: ye(e.gestureId),
    attempt: ++e.attempt,
    surface: fromEnumOpt(e.surface),
    daemon_booted: e.daemonBooted,
    via: fromEnumOpt(e.interactive?.via),
    attach_cold: e.interactive?.attachCold,
    attach_ms: r !== void 0 ? r.attachMs : h,
    content_paint_ms: r !== void 0 ? Math.round(r.contentPaintMs) : void 0,
    prompt_idle_ms: r !== void 0 ? Math.round(r.promptIdleMs) : void 0,
    msgs_loaded: r?.msgsLoaded,
    msgs_in_jsonl: r?.msgsInJsonl,
    msgs_rendered_at_first_paint: r?.msgsRenderedAtFirstPaint,
    first_frame_kind: fromEnumOpt(r !== void 0 ? "real" : void 0),
    marks_expected: r !== void 0 ? !0 : u,
    attach_censored: s ? !0 : void 0,
  });
}
/**
 * 向守护进程询问短 id 对应的后台会话是否存在，明确不存在时为真。
 */
//@ chunk-vrr64ez0.js:10803-10911 placement
async function isBackgroundSessionGone(e) {
  let n = await controlRequest({ proto: BG_PROTO, op: "has", short: e });
  return n.ok && n.op === "has" && n.present === !1;
}

export {
  reportAttachTelemetry,
  isBackgroundSessionGone,
  ENORESPONSE,
  IHt,
  classifyAttachError,
  tr,
  ATTACH_ERROR_CODES,
};
