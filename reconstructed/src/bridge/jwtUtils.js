/**
 * bridge/jwtUtils.ts
 *
 * JWT 解码与按会话的 token 刷新调度器（到期前刷新、失败重试、代际防竞态）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/jwtUtils.ts
 * pieces: chunk-aepeg2w5.js (7)
 * attribution: file-local 1, fingerprint 3, layout 3
 */
import { jsonParse } from "../utils/slowOperations.js";
import { logForDebugging } from "../utils/debug.js";
import { errorMessage } from "../utils/errors.js";
import { logForDiagnosticsNoPII } from "../utils/diagLogs.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-aepeg2w5.js:275640-275783 file-local
function formatDuration(ms) {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  let floored = Math.floor(ms / 60000),
    rounded = Math.round((ms % 60000) / 1000);
  return rounded > 0 ? `${floored}m ${rounded}s` : `${floored}m`;
}
/**
 * 解码 JWT payload（兼容 sk-ant-si- 前缀），失败返回 null。
 */
//@ chunk-aepeg2w5.js:275783-275974 fingerprint = decodeJwtPayload (1)
function decodeJwtPayload(token) {
  let parts = (token.startsWith("sk-ant-si-") ? token.slice(10) : token).split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    return jsonParse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
/**
 * token 的 aud 是否是 claude-gateway。
 */
//@ chunk-aepeg2w5.js:275974-276141 layout
function isGatewayToken(token) {
  let n = token ? decodeJwtPayload(token) : null,
    r = n !== null && typeof n === "object" && "aud" in n ? n.aud : void 0;
  return r === "claude-gateway" || (Array.isArray(r) && r.includes("claude-gateway"));
}
/**
 * 从 JWT 负载取 session_id。
 */
//@ chunk-aepeg2w5.js:276141-276276 layout
function getJwtSessionId(token) {
  let n = decodeJwtPayload(token);
  return n !== null && typeof n === "object" && "session_id" in n && typeof n.session_id === "string"
    ? n.session_id
    : void 0;
}
/**
 * 从 JWT 负载取 exp（秒），无法解析返回 null。
 */
//@ chunk-aepeg2w5.js:276276-276397 fingerprint = decodeJwtExpiry (1)
function decodeJwtExpiry(token) {
  let payload = decodeJwtPayload(token);
  if (payload !== null && typeof payload === "object" && "exp" in payload && typeof payload.exp === "number")
    return payload.exp;
  return null;
}
/**
 * 刷新调度默认值：提前 5 分钟、后续刷新间隔 30 分钟、最多失败 3 次、失败重试 60 秒。
 */
//@ chunk-aepeg2w5.js:276397-276436 layout
var DEFAULT_REFRESH_BUFFER_MS = 300000,
  FOLLOWUP_REFRESH_MS = 1800000,
  DEFAULT_MAX_FAILURES = 3,
  RETRY_DELAY_MS = 60000;
/**
 * 按 sessionId 调度 token 刷新：schedule（解 JWT exp，提前 buffer 刷新，可自适应 20%）、scheduleFromExpiresIn、refreshNow、cancel、cancelAll；
 * 刷新时取新 OAuth token 调 onRefresh，失败按次数重试，耗尽调 onExhausted；每次调度递增代号，过期回调直接丢弃。
 */
//@ chunk-aepeg2w5.js:276436-279315 fingerprint = createTokenRefreshScheduler (0.831)
function createTokenRefreshScheduler({
  getAccessToken: getAccessToken,
  onRefresh: onRefresh,
  onExhausted: onExhausted,
  label: label,
  refreshBufferMs: refreshBufferMs = DEFAULT_REFRESH_BUFFER_MS,
  maxFailures: maxFailures = DEFAULT_MAX_FAILURES,
  adaptiveBuffer: adaptiveBuffer = !1,
  rescheduleFromNewToken: rescheduleFromNewToken = !1,
  decodeExpiry: decodeExpiry = decodeJwtExpiry,
  formatDelay: formatDelay = formatDuration,
}) {
  let timers = new Map(),
    failureCounts = new Map(),
    generations = new Map();
  function nextGeneration(sessionId) {
    let Z = (generations.get(sessionId) ?? 0) + 1;
    return (generations.set(sessionId, Z), Z);
  }
  function schedule(sessionId, token) {
    let expiry = decodeExpiry(token);
    if (!expiry) {
      logForDebugging(
        `[${label}:token] Could not decode JWT expiry for sessionId=${sessionId}, token prefix=${token.slice(0, 15)}\u2026, keeping existing timer`,
      );
      return;
    }
    let existing = timers.get(sessionId);
    if (existing) clearTimeout(existing);
    let gen = nextGeneration(sessionId),
      expiryDate = new Date(expiry * 1000).toISOString(),
      xe = expiry * 1000 - Date.now(),
      Ie = adaptiveBuffer ? Math.min(refreshBufferMs, Math.max(1000, Math.floor(xe * 0.2))) : refreshBufferMs,
      De = xe - Ie;
    if (De <= 0)
      logForDebugging(
        `[${label}:token] Token for sessionId=${sessionId} expires=${expiryDate} (past or within buffer), refreshing immediately`,
      );
    else {
      let Ue = adaptiveBuffer ? Math.round(Ie / 1000) : refreshBufferMs / 1000;
      logForDebugging(
        `[${label}:token] Scheduled token refresh for sessionId=${sessionId} in ${formatDelay(De)} (expires=${expiryDate}, buffer=${Ue}s)`,
      );
    }
    scheduleAt(sessionId, Date.now() + De, gen);
  }
  let MAX_TIMER_CHUNK_MS = 60000;
  function scheduleAt(ie, Z, ce) {
    failureCounts.delete(ie);
    function fe() {
      if (generations.get(ie) !== ce) return;
      let Ae = Z - Date.now();
      if (Ae <= 0) {
        doRefresh(ie, ce);
        return;
      }
      let Me = setTimeout(fe, Math.min(Ae, MAX_TIMER_CHUNK_MS));
      timers.set(ie, Me);
    }
    fe();
  }
  function scheduleFromExpiresIn(sessionId, expiresInSeconds) {
    let existing = timers.get(sessionId);
    if (existing) clearTimeout(existing);
    let gen = nextGeneration(sessionId),
      delayMs = Math.max(expiresInSeconds * 1000 - refreshBufferMs, 30000);
    (logForDebugging(
      `[${label}:token] Scheduled token refresh for sessionId=${sessionId} in ${formatDelay(delayMs)} (expires_in=${expiresInSeconds}s, buffer=${refreshBufferMs / 1000}s)`,
    ),
      scheduleAt(sessionId, Date.now() + delayMs, gen));
  }
  function refreshNow(ie) {
    let Z = timers.get(ie);
    if (Z) clearTimeout(Z);
    let ce = nextGeneration(ie);
    (logForDebugging(`[${label}:token] Immediate token refresh requested for sessionId=${ie}`),
      doRefresh(ie, ce));
  }
  async function doRefresh(sessionId, gen) {
    let oauthToken;
    try {
      oauthToken = await getAccessToken();
    } catch (err) {
      logForDebugging(
        `[${label}:token] getAccessToken threw for sessionId=${sessionId}: ${errorMessage(err)}`,
        { level: "error" },
      );
    }
    if (generations.get(sessionId) !== gen) {
      logForDebugging(
        `[${label}:token] doRefresh for sessionId=${sessionId} stale (gen ${gen} vs ${generations.get(sessionId)}), skipping`,
      );
      return;
    }
    if (!oauthToken) {
      let Ae = (failureCounts.get(sessionId) ?? 0) + 1;
      if (
        (failureCounts.set(sessionId, Ae),
        logForDebugging(
          `[${label}:token] No OAuth token available for refresh, sessionId=${sessionId} (failure ${Ae}${Number.isFinite(maxFailures) ? `/${maxFailures}` : ""})`,
          { level: "error" },
        ),
        logForDiagnosticsNoPII("error", "bridge_token_refresh_no_oauth"),
        Ae < maxFailures)
      ) {
        let retryTimer = setTimeout(doRefresh, RETRY_DELAY_MS, sessionId, gen);
        timers.set(sessionId, retryTimer);
        return;
      }
      (logForDebugging(
        `[${label}:token] Refresh chain exhausted for sessionId=${sessionId} after ${Ae} consecutive failures`,
        { level: "error" },
      ),
        logForDiagnosticsNoPII("error", "bridge_token_refresh_exhausted"),
        onExhausted?.(sessionId, "no_oauth_token"));
      return;
    }
    if (
      (failureCounts.delete(sessionId),
      logForDebugging(
        `[${label}:token] Refreshing token for sessionId=${sessionId}: new token prefix=${oauthToken.slice(0, 15)}\u2026`,
      ),
      logEvent("tengu_bridge_token_refreshed", {}),
      onRefresh(sessionId, oauthToken),
      rescheduleFromNewToken && decodeExpiry(oauthToken))
    ) {
      schedule(sessionId, oauthToken);
      return;
    }
    let timer = setTimeout(doRefresh, FOLLOWUP_REFRESH_MS, sessionId, gen);
    (timers.set(sessionId, timer),
      logForDebugging(
        rescheduleFromNewToken
          ? `[${label}:token] Non-JWT token \u2014 scheduled fallback refresh for sessionId=${sessionId} in ${formatDelay(FOLLOWUP_REFRESH_MS)}`
          : `[${label}:token] Scheduled follow-up refresh for sessionId=${sessionId} in ${formatDelay(FOLLOWUP_REFRESH_MS)}`,
      ));
  }
  function cancel(sessionId) {
    nextGeneration(sessionId);
    let timer = timers.get(sessionId);
    if (timer) (clearTimeout(timer), timers.delete(sessionId));
    failureCounts.delete(sessionId);
  }
  function cancelAll() {
    for (let sessionId of generations.keys()) nextGeneration(sessionId);
    for (let timer of timers.values()) clearTimeout(timer);
    (timers.clear(), failureCounts.clear());
  }
  return {
    schedule: schedule,
    scheduleFromExpiresIn: scheduleFromExpiresIn,
    refreshNow: refreshNow,
    cancel: cancel,
    cancelAll: cancelAll,
  };
}

export { createTokenRefreshScheduler, decodeJwtExpiry, decodeJwtPayload, isGatewayToken, getJwtSessionId };
