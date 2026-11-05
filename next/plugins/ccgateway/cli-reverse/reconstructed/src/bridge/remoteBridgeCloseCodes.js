/**
 * bridge/remoteBridgeCloseCodes.ts
 *
 * 2.1.316 新增：把 WebSocket 关闭码（4090–4094、401 等）和原因翻译成给用户看的断线说明。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-56msakfz.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isNonOriginSource, describeNonOriginRefusal } from "../services/api/requestIdSource.js";
import { plural } from "../utils/stringUtils.js";
import { CLEANUP_TIMEOUT_MS } from "../utils/cleanupRegistry.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";

//@ chunk-56msakfz.js:25536-27116 placement
/**
 * 把 WebSocket 关闭码（4090–4094、401 等）和原因翻译成给用户看的断线说明。
 */
function describeBridgeCloseCode(code, reason, details) {
  switch (code) {
    case undefined:
      return "no close code received";
    case 4090:
      switch (reason) {
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
      if (!isNonOriginSource(details?.rejectSource)) return "server rejected connection (code 403)";
      let refusal = describeNonOriginRefusal(details.rejectSource);
      if (details.streak === undefined) return refusal;
      let max = Math.max(1, Math.round(details.streak.streakMs / 60000));
      return `${refusal}, and kept refusing for ${max} ${plural(max, "minute")}`;
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
      return `code ${code}`;
  }
}
//@ chunk-56msakfz.js:27116-27128 placement
var REFRESH_MIN_INTERVAL_MS = 5000;
//@ chunk-56msakfz.js:27128-27273 placement
var FLUSH_TIMEOUT_MS = 300;
var ARCHIVE_AUTH_RETRY_MIN_REMAINING_MS = 200;
var CLEANUP_FLUSH_RESERVE_MS = 300;
var CLEANUP_EXIT_RESERVE_MS = 600;
var PREFLUSH_TIMEOUT_MS = CLEANUP_TIMEOUT_MS - CLEANUP_FLUSH_RESERVE_MS - CLEANUP_EXIT_RESERVE_MS;
var TEARDOWN_FLUSH_TIMEOUT_MS = 2000;
var SUBSCRIBERS_REPORTED_TIMEOUT_MS = 3000;
var BACKFILL_BATCH_SIZE = 100;
var BACKFILL_BATCH_FLUSH_TIMEOUT_MS = 5000;
var MAX_QUEUED_SUBAGENT_FRAMES = 200;
var UPLOAD_BUDGET_MS = 20000;
var MAX_CONSECUTIVE_UPLOAD_FAILURES = 8;
var MAX_UPLOAD_BATCH_BYTES = 1048576;
var UPLOAD_REQUEST_TIMEOUT_MS = 30000;
var TENGU_ENCAPSULATED_DUSK = "tengu_encapsulated_dusk";
//@ chunk-56msakfz.js:27273-27320 placement
/**
 * 决定未签名事件的处理方式：tengu_encapsulated_dusk 开则 "drop"，否则 "redact"。
 */
function strayDropMode() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ENCAPSULATED_DUSK, false) ? "drop" : "redact";
}
export {
  strayDropMode,
  MAX_CONSECUTIVE_UPLOAD_FAILURES,
  MAX_UPLOAD_BATCH_BYTES,
  UPLOAD_REQUEST_TIMEOUT_MS,
  REFRESH_MIN_INTERVAL_MS,
  FLUSH_TIMEOUT_MS,
  PREFLUSH_TIMEOUT_MS,
  TEARDOWN_FLUSH_TIMEOUT_MS,
  describeBridgeCloseCode,
  SUBSCRIBERS_REPORTED_TIMEOUT_MS,
  BACKFILL_BATCH_SIZE,
  BACKFILL_BATCH_FLUSH_TIMEOUT_MS,
  CLEANUP_FLUSH_RESERVE_MS,
  ARCHIVE_AUTH_RETRY_MIN_REMAINING_MS,
  UPLOAD_BUDGET_MS,
  MAX_QUEUED_SUBAGENT_FRAMES,
};
