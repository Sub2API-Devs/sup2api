/**
 * bridge/workSecretRefresh.ts
 *
 * 远程工作密钥被拒时的刷新逻辑（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cg2r2hy6.js (8)
 * attribution: placement 8
 */
import { isCompactBoundaryMessage as isCompactBoundaryMessage_2 } from "../services/projects/threadRows.js";
import { logForDebugging } from "../utils/debug.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  classifyAxiosError,
} from "../utils/errors.js";
import {
  buildCCRv2SdkUrl,
  registerWorker,
  decodeWorkSecret,
  WorkSecretShapeError,
  sameSessionId,
} from "./workSecret.js";
import { decodeJwtExpiry, getJwtSessionId } from "./jwtUtils.js";
import { toSDKMessages } from "../utils/messages/mappers.js";

/**
 * 把转录消息逐条转发给桥接端（记录已发送 uuid），最后一条压缩边界附带保留的消息 id，子代理消息附带 agentId。
 */
//@ chunk-cg2r2hy6.js:24718-25015 placement
function forwardTranscriptMessages(s, u, p, o) {
  let lastIndex = u.findLastIndex((S) => isCompactBoundaryMessage_2(S));
  for (let [S, w] of u.entries())
    (p.add(w.uuid),
      s("transcript", w, {
        ...(S === lastIndex &&
          isCompactBoundaryMessage_2(w) && {
            isCompaction: !0,
            preservedEventIds: w.compactMetadata?.preservedMessages?.uuids,
          }),
        ...(o !== void 0 && { agentId: o }),
      }).catch((B) => {
        logForDebugging(`[persistence-sync] Write failed: ${B}`);
      }));
}
//@ chunk-cg2r2hy6.js:25015-25131 placement = isCompactBoundaryMessage (0.824)
function isCompactBoundaryMessage(message) {
  return new Set(
    nt(message.filter((u) => u.payload.type === "system" && u.payload.subtype === "compact_boundary")),
  );
}
//@ chunk-cg2r2hy6.js:25131-25218 placement
function nt(s) {
  return (s ?? []).map((u) => u.payload.uuid).filter((u) => typeof u === "string");
}
//@ chunk-cg2r2hy6.js:25218-25230 placement
var fr = 2100;
/**
 * 远程工作密钥被拒时尝试刷新；宿主无刷新途径时报告
 */
//@ chunk-cg2r2hy6.js:25230-27254 placement
function refreshWorkSecret(s) {
  let { sessionId: sessionId, apiBaseUrl: apiBaseUrl, requestFreshSecret: requestFreshSecret } = s,
    y = validateWorkSecretSession(s.secret, sessionId);
  if (typeof y === "string")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `work secret rejected: ${y}`,
      "work secret rejected",
    );
  let S = buildCCRv2SdkUrl(apiBaseUrl, sessionId),
    w = null,
    B = !1;
  async function _() {
    if (!requestFreshSecret)
      return (logForDebugging("[bridge:work-secret] the host offers no refresh path"), null);
    let E;
    try {
      E = await requestFreshSecret(sessionId);
    } catch (error) {
      return (
        logForDebugging(`[bridge:work-secret] host refresh request failed: ${errorMessage(error)}`, {
          level: "warn",
        }),
        null
      );
    }
    if (!E) return (logForDebugging("[bridge:work-secret] host has no fresh secret yet"), null);
    let A = validateWorkSecretSession(E, sessionId);
    if (typeof A === "string")
      return (logForDebugging(`[bridge:work-secret] fresh secret rejected: ${A}`, { level: "warn" }), null);
    let T = decodeJwtExpiry(A.session_ingress_token);
    if (
      w &&
      (A.session_ingress_token === w.secret.session_ingress_token ||
        (w.exp !== null && T !== null && T <= w.exp))
    )
      return (
        logForDebugging("[bridge:work-secret] host returned a secret no fresher than the registered one"),
        null
      );
    return A;
  }
  async function b(E, A = !1) {
    let session_ingress_token = E.session_ingress_token,
      v;
    try {
      v = await registerWorker(S, session_ingress_token);
    } catch (error) {
      let { kind: kind, status: status } = classifyAxiosError(error);
      if (
        (logForDebugging(
          `[bridge:work-secret] /worker/register failed kind=${kind} status=${status ?? "none"}: ${errorMessage(error)}`,
          { level: "warn" },
        ),
        kind === "other")
      )
        return { terminal: !0, reason: "malformed_response", status: 200 };
      if (status === void 0 || status === 408 || status === 429 || status >= 500) return null;
      if (A && (status === 401 || status === 403)) return ((B = !0), null);
      return { terminal: !0, reason: "request_rejected", status: status };
    }
    let F = decodeJwtExpiry(session_ingress_token);
    ((w = { secret: E, exp: F }), (B = !1));
    let I = F === null ? fr : Math.max(0, F - Math.floor(Date.now() / 1000));
    return (
      logForDebugging(`[bridge:work-secret] registered worker epoch=${v} expires_in=${I}s`),
      { worker_jwt: session_ingress_token, api_base_url: apiBaseUrl, expires_in: I, worker_epoch: v }
    );
  }
  return {
    async register(E, A) {
      if (E === "initial") return b(y);
      let T = await _();
      if (A?.stillWanted && !A.stillWanted())
        return (
          logForDebugging(
            "[bridge:work-secret] bridge torn down or superseded while the host was asked; not registering",
          ),
          null
        );
      if (T) return b(T);
      let v = w !== null && w.exp !== null ? w.exp - Math.floor(Date.now() / 1000) : 0;
      if (w !== null && !B && A?.reuseHeldAboveS !== void 0 && v > A.reuseHeldAboveS)
        return (
          logForDebugging(
            `[bridge:work-secret] nothing fresher from the host; re-registering the held secret (${v}s left)`,
          ),
          b(w.secret, !0)
        );
      return null;
    },
  };
}
//@ chunk-cg2r2hy6.js:27254-27501 placement
function validateWorkSecretSession(s, u) {
  let p;
  try {
    p = decodeWorkSecret(s);
  } catch (error) {
    return error instanceof WorkSecretShapeError ? error.message : "undecodable";
  }
  let o = getJwtSessionId(p.session_ingress_token);
  if (o === void 0) return "token carries no session_id claim";
  if (!sameSessionId(o, u)) return "token is for a different session";
  return p;
}
/**
 * 工作密钥刷新相关常量：快速/耐心两档读取预算（单文件与总时长）、刷新时间窗口，以及视为功能开关不可用的原因集合。
 */
//@ chunk-cg2r2hy6.js:27501-27641 placement
var QUICK_READ_BUDGET = { perFileMs: 400, totalMs: 1500 },
  PATIENT_READ_BUDGET = { perFileMs: 2000, totalMs: 6000 },
  WORK_SECRET_REFRESH_WINDOW_MS = 60000,
  FLAG_UNAVAILABLE_CAUSES = new Set(["flags_disabled", "flags_unreachable", "gate_off"]);
//@ chunk-cg2r2hy6.js:27641-27697 placement
function mr(s) {
  return (u) => {
    let p = s?.();
    return toSDKMessages(u, p);
  };
}

export {
  nt,
  isCompactBoundaryMessage,
  forwardTranscriptMessages,
  FLAG_UNAVAILABLE_CAUSES,
  refreshWorkSecret,
  mr,
  WORK_SECRET_REFRESH_WINDOW_MS,
};
