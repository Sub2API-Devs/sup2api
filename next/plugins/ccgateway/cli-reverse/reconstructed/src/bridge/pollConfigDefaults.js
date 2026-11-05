/**
 * bridge/pollConfigDefaults.ts
 *
 * 轮询间隔默认值（空闲/部分 2s、满载 10 分钟、会话 keepalive 2 分钟、SSE 连接超时 30s、watch 相关）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/pollConfigDefaults.ts
 * pieces: chunk-nkxt28ky.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-nkxt28ky.js:532-956 fingerprint (2.1.88 match: DEFAULT_POLL_CONFIG, 0.704)
var DEFAULT_POLL_CONFIG = {
  non_exclusive_heartbeat_interval_ms: 0,
  multisession_poll_interval_ms_not_at_capacity: 2000,
  multisession_poll_interval_ms_partial_capacity: 2000,
  multisession_poll_interval_ms_at_capacity: 600000,
  reclaim_older_than_ms: 5000,
  session_keepalive_interval_v2_ms: 120000,
  sse_connect_timeout_ms: 30000,
  watch_sessions: false,
  watch_connected_poll_interval_ms: 60000,
  watch_fallback_poll_interval_ms: 30000,
  watch_session_end_window_ms: 600000,
};
export { DEFAULT_POLL_CONFIG };
