/**
 * services/daemon/sessionRestart.ts
 *
 * 2.1.316 新增：后台会话重启
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-89ebz077.js (3)
 * attribution: placement 3
 */

/**
 * 后台会话自动重启相关常量：续跑提示词、重启窗口与次数、退避，以及会话 ID 被占用的提示。
 */
//@ chunk-89ebz077.js:11038-11476 placement
var RESTART_CONTINUE_PROMPT =
    "Continue from where you left off. Note: this session was automatically restarted after its process exited unexpectedly; the user has not sent a new message since the restart. Re-verify anything time-sensitive (branch state, running processes, prior partial work) before continuing.",
  RESTART_WINDOW_MS = 3600000,
  MAX_AUTO_RESTARTS = 3,
  RESTART_BACKOFF_MS = 5000,
  MAX_RESTART_BACKOFF_MS = 300000,
  STABLE_RUN_MS = 60000,
  MAX_RESTART_DETAIL = 200,
  SESSION_ID_TAKEN_NOTICE =
    "session ID already belongs to another conversation \u2014 open again to start with a new ID";
//@ chunk-89ebz077.js:11476-11562 placement
function Vuo(e) {
  return `working directory no longer exists or is not accessible: ${e}`;
}
/**
 * 后台会话轮询与认领的时间常量、关键版本标记、可后台任务类型与若干上限。
 */
//@ chunk-89ebz077.js:11562-11865 placement
var POLL_INTERVAL_MS = 5000,
  STALE_POLL_MS = POLL_INTERVAL_MS * 3,
  ATTACH_TIMEOUT_MS = 120000,
  CLAIM_TIMEOUT_MS = 120000,
  MIN_POLL_MS = 1000,
  IDLE_RETIRE_MS = 300000,
  MIN_ADOPT_RELEASE = { release: "2.1.213", commitMs: Date.UTC(2026, 6, 16, 18, 0, 5) },
  MIN_UPGRADE_RELEASE = { release: "2.1.287", commitMs: Date.UTC(2026, 8, 30, 14, 52, 7) },
  DRAINABLE_TASK_KINDS = [
    "local_bash",
    "in_process_teammate",
    "dream",
    "auto_mode_scan",
    "local_memory_import",
    "post_turn_memory",
  ],
  MAX_UPGRADE_WAIT_MS = 3600000,
  MAX_STATUS_DETAIL = 4096;

export {
  DRAINABLE_TASK_KINDS,
  MIN_UPGRADE_RELEASE,
  MAX_UPGRADE_WAIT_MS,
  CLAIM_TIMEOUT_MS,
  MIN_ADOPT_RELEASE,
  IDLE_RETIRE_MS,
  MAX_AUTO_RESTARTS,
  MIN_POLL_MS,
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
  Vuo,
  ATTACH_TIMEOUT_MS,
};
