/**
 * services/daemon/sessionRestart.ts
 *
 * 2.1.316 新增：后台会话重启
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v6a0t823.js (3)
 * attribution: placement 3
 */
//@ chunk-v6a0t823.js:11106-11544 placement
/**
 * 后台会话自动重启相关常量：续跑提示词、重启窗口与次数、退避，以及会话 ID 被占用的提示。
 */
var RESTART_CONTINUE_PROMPT =
  "Continue from where you left off. Note: this session was automatically restarted after its process exited unexpectedly; the user has not sent a new message since the restart. Re-verify anything time-sensitive (branch state, running processes, prior partial work) before continuing.";
var RESTART_WINDOW_MS = 3600000;
var MAX_AUTO_RESTARTS = 3;
var RESTART_BACKOFF_MS = 5000;
var MAX_RESTART_BACKOFF_MS = 300000;
var STABLE_RUN_MS = 60000;
var MAX_RESTART_DETAIL = 200;
var SESSION_ID_TAKEN_NOTICE =
  "session ID already belongs to another conversation \u2014 open again to start with a new ID";
//@ chunk-v6a0t823.js:11544-11630 placement
/**
 * 工作目录不存在或不可访问时的原因文案。
 */
function cwdGoneReason(cwd) {
  return `working directory no longer exists or is not accessible: ${cwd}`;
}
//@ chunk-v6a0t823.js:11630-11933 placement
/**
 * 后台会话轮询与认领的时间常量、关键版本标记、可后台任务类型与若干上限。
 */
var POLL_INTERVAL_MS = 5000;
var STALE_POLL_MS = POLL_INTERVAL_MS * 3;
var ATTACH_TIMEOUT_MS = 120000;
var CLAIM_TIMEOUT_MS = 120000;
var MIN_POLL_MS = 1000;
var IDLE_RETIRE_MS = 300000;
var MIN_ADOPT_RELEASE = {
  release: "2.1.213",
  commitMs: Date.UTC(2026, 6, 16, 18, 0, 5),
};
var MIN_UPGRADE_RELEASE = {
  release: "2.1.287",
  commitMs: Date.UTC(2026, 8, 30, 14, 52, 7),
};
var DRAINABLE_TASK_KINDS = [
  "local_bash",
  "in_process_teammate",
  "dream",
  "auto_mode_scan",
  "local_memory_import",
  "post_turn_memory",
];
var MAX_UPGRADE_WAIT_MS = 3600000;
var MAX_STATUS_DETAIL = 4096;
export {
  cwdGoneReason,
  MIN_POLL_MS,
  DRAINABLE_TASK_KINDS,
  MIN_UPGRADE_RELEASE,
  MAX_UPGRADE_WAIT_MS,
  CLAIM_TIMEOUT_MS,
  MIN_ADOPT_RELEASE,
  IDLE_RETIRE_MS,
  MAX_AUTO_RESTARTS,
  POLL_INTERVAL_MS,
  MAX_RESTART_DETAIL,
  MAX_STATUS_DETAIL,
  RESTART_CONTINUE_PROMPT,
  RESTART_WINDOW_MS,
  STALE_POLL_MS,
  STABLE_RUN_MS,
  RESTART_BACKOFF_MS,
  MAX_RESTART_BACKOFF_MS,
  SESSION_ID_TAKEN_NOTICE,
  ATTACH_TIMEOUT_MS,
};
