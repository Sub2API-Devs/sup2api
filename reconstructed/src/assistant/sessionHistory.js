/**
 * assistant/sessionHistory.ts
 *
 * 远程会话事件历史：按页拉取最新/更早事件、判断远程回合是否仍在进行、构造会话端点 URL 与认证头
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/assistant/sessionHistory.ts
 * pieces: chunk-08945j39.js (2), chunk-fe6rs39h.js (2), chunk-kgtpkbhq.js (1)
 * attribution: fingerprint 4, affinity 1
 */
import { _en, renewDeviceTokenAndRetry, getSessionRequestConfig } from "../remote/RemoteSessionManager.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { fs, Wi } from "../cli/headlessCloud/openBareCloudSession.js";
import { toInfraSessionId, toCompatSessionId } from "../bridge/sessionIdCompat.js";
import { oauthHeaders } from "../bridge/codeSessionApi.js";
import { logForDebugging } from "../utils/debug.js";

/**
 * 取会话最新一页事件（倒序），失败记 assistant_history_load。
 */
//@ chunk-08945j39.js:78703-78925 fingerprint = fetchLatestEvents (0.435)
async function fetchLatestEvents(e, n = _en, s) {
  let i = await renewDeviceTokenAndRetry(e, { limit: n, sort_order: "desc" }, "fetchLatestEvents");
  if (s?.reportFeatureHealth !== !1)
    if (i === null) logFeatureBad("assistant_history_load", "http_error");
    else logFeatureOk("assistant_history_load");
  return i;
}
/**
 * 取更早一页会话事件（按游标倒序翻页）。
 */
//@ chunk-08945j39.js:78925-79028 fingerprint = fetchOlderEvents (0.553)
async function fetchOlderEvents(e, n, s = _en, i) {
  return renewDeviceTokenAndRetry(e, { limit: s, sort_order: "desc", cursor: n }, "fetchOlderEvents", i);
}
/**
 * 向前翻页查找远程会话最近的回合状态，返回是否仍在进行（under_way）。
 */
//@ chunk-fe6rs39h.js:150538-150807 fingerprint = fetchPage (0.361)
async function isRemoteTurnUnderWay(sessionId, context) {
  try {
    let s = await getSessionRequestConfig(sessionId, context),
      r = await fetchLatestEvents(s, fs, { reportFeatureHealth: !1 });
    for (let h = 1; r !== null; h += 1) {
      let y = classifyLatestTurnState(r.events);
      if (y !== void 0) return y === "under_way";
      if (!r.hasMore || r.firstId === null || h >= Wi) return;
      r = await fetchOlderEvents(s, r.firstId, fs);
    }
    return;
  } catch {
    return;
  }
}
/**
 * 从事件末尾找顶层回合状态：worker 的 result → over，worker assistant 或客户端 user → under_way。
 */
//@ chunk-fe6rs39h.js:150807-151068 affinity
function classifyLatestTurnState(events) {
  for (let n of [...events].reverse()) {
    if (!!n.payload.parent_tool_use_id) continue;
    if (n.source === "worker") {
      if (n.payload.type === "result") return "over";
      if (n.payload.type === "assistant") return "under_way";
    } else if (n.payload.type === "user") return "under_way";
  }
  return;
}
/**
 * 构造会话端点：v2 用 /v1/code/sessions/{cse_id}{suffix} + OAuth 头；v1 兼容路径用 /v1/sessions/{session_id}{suffix} + ccr-byoc beta 与 x-organization-uuid；可附 X-Trusted-Device-Token。
 */
//@ chunk-kgtpkbhq.js:6745-7196 fingerprint = createHistoryAuthCtx (0.566)
function buildSessionEndpoint(label, baseUrl, accessToken, sessionId, options, pathSuffix = "") {
  let m = options.trustedDeviceToken ? { "X-Trusted-Device-Token": options.trustedDeviceToken } : void 0;
  if (options.useV2) {
    let g = toInfraSessionId(sessionId);
    return {
      url: `${baseUrl}/v1/code/sessions/${g}${pathSuffix}`,
      headers: { ...oauthHeaders(accessToken), ...m },
      id: g,
    };
  }
  if (!options.orgUUID)
    return (logForDebugging(`[code-session] ${label} ${sessionId}: v1 compat path needs an org UUID`), null);
  let b = toCompatSessionId(sessionId);
  return {
    url: `${baseUrl}/v1/sessions/${b}${pathSuffix}`,
    headers: {
      ...oauthHeaders(accessToken),
      "anthropic-beta": "ccr-byoc-2025-07-29",
      "x-organization-uuid": options.orgUUID,
      ...m,
    },
    id: b,
  };
}

export { fetchLatestEvents, fetchOlderEvents, buildSessionEndpoint, isRemoteTurnUnderWay };
