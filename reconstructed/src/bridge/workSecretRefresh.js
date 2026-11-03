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

//@ chunk-cg2r2hy6.js:24718-25015 placement
/**
 * 把转录消息逐条转发给桥接端（记录已发送 uuid），最后一条压缩边界附带保留的消息 id，子代理消息附带 agentId。
 */
function forwardTranscriptMessages(uploadRows, u, serverUuids, agentId) {
  let lastIndex = u.findLastIndex((S) => isCompactBoundaryMessage_2(S));
  for (let [S, w] of u.entries()) {
    serverUuids.add(w.uuid);
    uploadRows("transcript", w, {
      ...(S === lastIndex &&
        isCompactBoundaryMessage_2(w) && {
          isCompaction: true,
          preservedEventIds: w.compactMetadata?.preservedMessages?.uuids,
        }),
      ...(agentId !== undefined && {
        agentId,
      }),
    }).catch((error) => {
      logForDebugging(`[persistence-sync] Write failed: ${error}`);
    });
  }
}
//@ chunk-cg2r2hy6.js:25015-25131 placement = isCompactBoundaryMessage (0.824)
function isCompactBoundaryMessage(message) {
  return new Set(
    compactBoundaryUuids(
      message.filter((u) => u.payload.type === "system" && u.payload.subtype === "compact_boundary"),
    ),
  );
}
//@ chunk-cg2r2hy6.js:25131-25218 placement
function compactBoundaryUuids(events) {
  return (events ?? []).map((u) => u.payload.uuid).filter((u) => typeof u === "string");
}
//@ chunk-cg2r2hy6.js:25218-25230 placement
var WORK_SECRET_REFRESH_LEAD_SEC = 2100;
//@ chunk-cg2r2hy6.js:25230-27254 placement
/**
 * 远程工作密钥被拒时尝试刷新；宿主无刷新途径时报告
 */
function refreshWorkSecret(s) {
  let { sessionId, apiBaseUrl, requestFreshSecret } = s;
  let y = validateWorkSecretSession(s.secret, sessionId);
  if (typeof y === "string")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `work secret rejected: ${y}`,
      "work secret rejected",
    );
  let sessionUrl = buildCCRv2SdkUrl(apiBaseUrl, sessionId);
  let w = null;
  let B = false;
  async function _() {
    if (!requestFreshSecret) {
      logForDebugging("[bridge:work-secret] the host offers no refresh path");
      return null;
    }
    let E;
    try {
      E = await requestFreshSecret(sessionId);
    } catch (error) {
      logForDebugging(`[bridge:work-secret] host refresh request failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      return null;
    }
    if (!E) {
      logForDebugging("[bridge:work-secret] host has no fresh secret yet");
      return null;
    }
    let A = validateWorkSecretSession(E, sessionId);
    if (typeof A === "string") {
      logForDebugging(`[bridge:work-secret] fresh secret rejected: ${A}`, {
        level: "warn",
      });
      return null;
    }
    let T = decodeJwtExpiry(A.session_ingress_token);
    if (
      w &&
      (A.session_ingress_token === w.secret.session_ingress_token ||
        (w.exp !== null && T !== null && T <= w.exp))
    ) {
      logForDebugging("[bridge:work-secret] host returned a secret no fresher than the registered one");
      return null;
    }
    return A;
  }
  async function b(E, A = false) {
    let sessionIngressToken = E.session_ingress_token;
    let v;
    try {
      v = await registerWorker(sessionUrl, sessionIngressToken);
    } catch (error) {
      let { kind, status } = classifyAxiosError(error);
      logForDebugging(
        `[bridge:work-secret] /worker/register failed kind=${kind} status=${status ?? "none"}: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      if (kind === "other")
        return {
          terminal: true,
          reason: "malformed_response",
          status: 200,
        };
      if (status === undefined || status === 408 || status === 429 || status >= 500) return null;
      if (A && (status === 401 || status === 403)) {
        B = true;
        return null;
      }
      return {
        terminal: true,
        reason: "request_rejected",
        status,
      };
    }
    let F = decodeJwtExpiry(sessionIngressToken);
    w = {
      secret: E,
      exp: F,
    };
    B = false;
    let I = F === null ? WORK_SECRET_REFRESH_LEAD_SEC : Math.max(0, F - Math.floor(Date.now() / 1000));
    logForDebugging(`[bridge:work-secret] registered worker epoch=${v} expires_in=${I}s`);
    return {
      worker_jwt: sessionIngressToken,
      api_base_url: apiBaseUrl,
      expires_in: I,
      worker_epoch: v,
    };
  }
  return {
    async register(E, A) {
      if (E === "initial") return b(y);
      let T = await _();
      if (A?.stillWanted && !A.stillWanted()) {
        logForDebugging(
          "[bridge:work-secret] bridge torn down or superseded while the host was asked; not registering",
        );
        return null;
      }
      if (T) return b(T);
      let v = w !== null && w.exp !== null ? w.exp - Math.floor(Date.now() / 1000) : 0;
      if (w !== null && !B && A?.reuseHeldAboveS !== undefined && v > A.reuseHeldAboveS) {
        logForDebugging(
          `[bridge:work-secret] nothing fresher from the host; re-registering the held secret (${v}s left)`,
        );
        return b(w.secret, true);
      }
      return null;
    },
  };
}
//@ chunk-cg2r2hy6.js:27254-27501 placement
function validateWorkSecretSession(s, sessionId) {
  let p;
  try {
    p = decodeWorkSecret(s);
  } catch (error) {
    return error instanceof WorkSecretShapeError ? error.message : "undecodable";
  }
  let jwtSessionId = getJwtSessionId(p.session_ingress_token);
  if (jwtSessionId === undefined) return "token carries no session_id claim";
  if (!sameSessionId(jwtSessionId, sessionId)) return "token is for a different session";
  return p;
}
//@ chunk-cg2r2hy6.js:27501-27641 placement
/**
 * 工作密钥刷新相关常量：快速/耐心两档读取预算（单文件与总时长）、刷新时间窗口，以及视为功能开关不可用的原因集合。
 */
var QUICK_READ_BUDGET = {
  perFileMs: 400,
  totalMs: 1500,
};
var PATIENT_READ_BUDGET = {
  perFileMs: 2000,
  totalMs: 6000,
};
var WORK_SECRET_REFRESH_WINDOW_MS = 60000;
var FLAG_UNAVAILABLE_CAUSES = new Set(["flags_disabled", "flags_unreachable", "gate_off"]);
//@ chunk-cg2r2hy6.js:27641-27697 placement
function transcriptForwarder(getTools) {
  return (messages) => {
    let p = getTools?.();
    return toSDKMessages(messages, p);
  };
}
export {
  compactBoundaryUuids,
  isCompactBoundaryMessage,
  forwardTranscriptMessages,
  FLAG_UNAVAILABLE_CAUSES,
  refreshWorkSecret,
  transcriptForwarder,
  WORK_SECRET_REFRESH_WINDOW_MS,
};
