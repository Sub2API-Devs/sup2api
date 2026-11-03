/**
 * bridge/remoteBridgeCloseCodes.ts
 *
 * 2.1.316 新增：把 WebSocket 关闭码（4090–4094、401 等）和原因翻译成给用户看的断线说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4cm44bmp.js (4)
 * attribution: placement 4
 */
import { v5e, describeNonOriginRefusal } from "../services/api/requestIdSource.js";
import { plural } from "../utils/stringUtils.js";
import { CLEANUP_TIMEOUT_MS } from "../utils/cleanupRegistry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

/**
 * 把 WebSocket 关闭码（4090–4094、401 等）和原因翻译成给用户看的断线说明。
 */
//@ chunk-4cm44bmp.js:28000-29580 placement
function describeBridgeCloseCode(n, h, w) {
  switch (n) {
    case void 0:
      return "no close code received";
    case 4090:
      switch (h) {
        case "superseded_by_worker":
          return "another connection took over this session (usually another device or Claude Code session) \u2014 this device is standing down (code 4090)";
        case "session_not_active":
          return "this session was ended or archived from another device or app (code 4090)";
        case "session_not_found":
          return "the server no longer reports this session \u2014 it may have been deleted from another device or app (code 4090)";
        case "epoch_stale":
          return "the session worker registration went stale \u2014 no active worker holds it (code 4090)";
        default:
          return "this connection is no longer the active worker for the session (code 4090)";
      }
    case 4091:
      return "transport init failed (code 4091)";
    case 4092:
      return "connection dropped \u2014 no close reason from server (code 4092)";
    case 4093:
      return "presence heartbeats to the server kept failing (code 4093)";
    case 4094:
      return "worker credential expired or rejected (code 4094)";
    case 401:
      return "auth token expired (code 401)";
    case 403: {
      if (!v5e(w?.rejectSource)) return "server rejected connection (code 403)";
      let C = describeNonOriginRefusal(w.rejectSource);
      if (w.streak === void 0) return C;
      let max = Math.max(1, Math.round(w.streak.streakMs / 60000));
      return `${C}, and kept refusing for ${max} ${plural(max, "minute")}`;
    }
    case 404:
      return "session not found on server (code 404)";
    case 1002:
      return "server rejected the connection handshake (code 1002)";
    case 4001:
      return "session expired or not found on server (code 4001)";
    case 4003:
      return "server rejected credentials (code 4003)";
    default:
      return `code ${n}`;
  }
}
//@ chunk-4cm44bmp.js:29580-29592 placement
var Ud = 5000;
//@ chunk-4cm44bmp.js:29592-29738 placement
var Ls = 300,
  Fd = 200,
  Xs = 300,
  Hd = 600,
  xd = CLEANUP_TIMEOUT_MS - Xs - Hd,
  zo = 2000,
  Ld = 3000,
  Yo = 100,
  Wd = 5000,
  $s = 200,
  Ws = 20000,
  qd = 8,
  Gd = 1048576,
  Kd = 30000,
  TENGU_ENCAPSULATED_DUSK = "tengu_encapsulated_dusk";
//@ chunk-4cm44bmp.js:29738-29785 placement
function HNo() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ENCAPSULATED_DUSK, !1) ? "drop" : "redact";
}

export { HNo, qd, Gd, Kd, Ud, Ls, xd, zo, describeBridgeCloseCode, Ld, Yo, Wd, Xs, Fd, Ws, $s };
