/**
 * services/selfHostedRunner/selfHostedRunner.ts
 *
 * 2.1.316 新增：claude self-hosted-runner 子命令入口与主循环（注册、轮询工单、并发跑会话、排空退出）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (9)
 * attribution: placement 9
 */
import { createWriteStream, fchmod } from "fs";
import { mkdir, lstat, readFile, rm, writeFile } from "fs/promises";
import { hostname, homedir } from "os";
import { join } from "path";
import {
  HTTPS_API_ANTHROPIC_COM,
  DEFAULT_SESSION_CAPACITY,
  DEFAULT_BASE_DIR,
  MAX_KILL_AFTER_MINUTES,
  TRUST_WORKSPACE_DEFAULT,
  REMOVE_SESSION_STATE_DEFAULT,
  DIFF_FINDS_NESTED_REPO_DEFAULT,
  DEFAULT_HEALTH_PORT,
  MIN_TIMESTAMP_SECONDS,
  DEFAULT_POST_SESSION_ALLOWANCE_MS,
  HOLD_IDLE_MTIME_FRESH_MS,
  LEFTOVER_HOLD_LOOK_TIMEOUT_MS,
  DEFAULT_MAX_HOLD_MS,
  parseRunnerOptions,
  requireBaseDirOnWindows,
  readEnvironmentSecretFile,
  RELEASE_IN_FLIGHT_WAIT_MS,
  holdIdleFile,
  getMaxHoldMs,
  runnerExecPath,
  warnDiffFindsNestedRepository,
  warnCapacityOnSessionBoundRunner,
  SERVER_AUTO_MODE_LISTS_DESCRIPTIONS,
  RUNNER_KIND,
  resetRunnerHome,
  runnerRetireAtMs,
  drainMarkerFile,
  readRegularFileSafe,
  DRAIN_MARKER_READ_TIMEOUT_MS,
  checkPathNotOnNetworkLocation,
  RETIRE_RELEASE_RETRY_MS,
  ENV_SECRET_READ_TIMEOUT_MS_2,
  MAX_HEALTH_PROBE_BACKOFF_MS,
  HEALTH_PROBE_INTERVAL_MS,
  DEFAULT_POLL_INTERVAL_MS,
  LEASE_5XX_RETRY_DELAY_MS,
  SHUTDOWN_LEASE_HEARTBEAT_MS,
  MAX_LISTED_SESSION_IDS,
  MIN_POLL_INTERVAL_MS,
  MAX_POLL_INTERVAL_MS,
  MIN_BACKOFF_MS,
  MAX_POLL_DELAY_MS,
  HEALTH_PROBE_BACKOFF_BASE_MS,
  LEASE_EXPIRY_POLL_MARGIN_MS,
} from "./runnerConfig.js";
import {
  PROXY_AUTHORIZATION_COMMAND_ENV_VAR,
  RUNNER_PROXY_AUTHORIZATION_FILE_ENV,
  proxyAuthorizationConfig,
  startRunnerEgressProxy,
} from "./egressProxy.js";
import {
  SIGKILL_TIMEOUT_DEFAULT_MS,
  POST_SESSION_HOOK_TIMEOUT_MS,
  CHECKOUT_HOOK_TIMEOUT_MS,
  BG_RESULT_GRACE_MS,
  POST_TURN_SETTLE_MS,
  SIGKILL_GRACE_BASE_MS,
  graceSeconds,
  retryWithBackoff,
  getCheckoutHookTimeoutMs,
  handleSelfHostedSession,
} from "./handleSession.js";
import { configureGlobalAgents } from "../../utils/proxy.js";
import { openStdioWriter } from "../../selfHostedRunner/stdioWriter.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { checkRunnerAgentProxyStandaloneUrl } from "./agentProxyStandalone.js";
import { env, antEnv } from "../../utils/env.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import {
  assertLifecycleHooksSupported,
  findHook,
  postSessionHooksRunning,
} from "../../selfHostedRunner/lifecycleHooks.js";
import { lockCurrentVersion } from "../../utils/nativeInstaller/installer.js";
import {
  checkBaseDirWritable,
  CODE_REVIEW_TOKEN_HANDOFF,
  gitSearchDirs,
  startClockSkewMonitor,
  startRunnerTokenRefresher,
  captureHostConfigSnapshot,
} from "./hostConfigSnapshot.js";
import { withBoundedTimeout, BoundedTimeoutError } from "../../utils/boundedTimeout.js";
import {
  envPositiveMs,
  getDrainWaitMs,
  PUSH_ON_RELEASE_TIMEOUT_MS,
  noHybridToken,
  DEFAULT_STARTUP_TIMEOUT_MS,
  snapshotOperatorGitConfig,
  getStartupTimeoutMs,
} from "./launcherHooks.js";
import { formatDuration } from "../../utils/format.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { createDefaultEnvironment } from "../../commands/remote-setup/api.js";
import { NO_ALLOW } from "../../selfHostedRunner/serverAutoMode.js";
import {
  isRetryableRunnerError,
  emptyErrorCategoryCounts,
  classifyRunnerError,
  retryReleaseSession,
} from "../../selfHostedRunner/runnerApiErrors.js";
import {
  describeServerAuthRejection,
  WORK_ORDER_SINGLE_USE_TEXT,
  PollWaker,
  streamWorkHints,
  MAX_SERVER_MESSAGE_CHARS,
  POLL_WAKE_SOURCES,
} from "./workOrder.js";
import { count } from "../../utils/collections.js";
import {
  getJwtExpiry,
  notAvailableInThisBuild,
  isPoolSpawnJwt,
  isNotFoundError,
  getSessionIdFromJwt,
  decodeSessionJwt,
} from "./sessionLaunch.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import {
  UNKNOWN,
  createHistogram,
  METRIC_NAME_RE,
  escapeMetricValue,
  observeHistogram,
  dropSessionMetrics,
} from "../../entrypoints/selfHostedRunner/metrics.js";
import { systemClock, sleep } from "../../utils/sleep.js";
import { startHealthServer } from "../../selfHostedRunner/healthServer.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { rewriteContractionError } from "../../selfHostedRunner/git/fetchErrors.js";

//@ chunk-hm0ce8vc.js:236182-288822 placement
/**
 * claude self-hosted-runner 入口：解析参数、检查 base-dir、捕获宿主配置、注册 runner 并进入运行循环（约 52 KB，含 --help 文本）。
 */
async function selfHostedRunnerMain(e) {
  let now = Date.now();
  if (e.includes("--help") || e.includes("-h")) {
    console.log(`Usage: claude self-hosted-runner [options]

Connection:
  --api-url <url>             API base URL (default: ${HTTPS_API_ANTHROPIC_COM})
  --environment-secret-file <path>
                              Path to environment secret file (or set SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET)
                              (--pool-secret-file / SELF_HOSTED_RUNNER_POOL_SECRET are deprecated aliases.)
  --lock-to-account <id>      Lock runner to a single account at registration (webhook-driven on-demand
                              spawn). Only that account's sessions are assigned.
                              [env: SELF_HOSTED_RUNNER_LOCK_TO_ACCOUNT]
  --client-label <label>      Observability label sent at registration (default: hostname). Shown
                              beside the runner in the Anthropic console; never used for
                              authorization or routing. Set it when the hostname is not
                              meaningful, e.g. to a VM or container name.
                              [env: SELF_HOSTED_RUNNER_CLIENT_LABEL]
  --proxy-authorization-command <shell command>
                              For egress proxies that require a Proxy-Authorization header (for
                              example a short-lived bearer token) on every CONNECT. The command's
                              stdout is the full header value (e.g. "Bearer <token>"); it is run
                              afresh for each new connection to the proxy, so rotating tokens stay
                              current. Requires HTTPS_PROXY (or HTTP_PROXY) to name that upstream
                              proxy; ALL_PROXY alone is not consulted. When set, the runner starts a
                              small forward proxy on 127.0.0.1 that adds the header, and points
                              itself and every session it runs at it (HTTPS_PROXY/HTTP_PROXY are
                              rewritten for child processes, other proxy variables incl. ALL_PROXY
                              are cleared for them; NO_PROXY is unchanged). The value is never
                              logged. Not supported with the orchestrator subcommand yet.
                              [env: ${PROXY_AUTHORIZATION_COMMAND_ENV_VAR}]
  --proxy-authorization-file <path>
                              Same, but the header value is read from a file (re-read for each new
                              connection, so a file rotated in place is picked up). Set only one of
                              the two. [env: ${RUNNER_PROXY_AUTHORIZATION_FILE_ENV}]
  --agent-proxy-url <url>     Route every session this runner runs through the agent proxy at <url>
                              (https:// only, no user name or password). Anthropic-managed git
                              sessions go through it too, except on Windows and when the server
                              sends no git setup for them, which are refused. For them to work, a
                              claude started through --exec-path or a command hook must be this
                              version or newer, so keep it updated (with an older one, git and gh
                              fail if its traffic goes through the proxy, or else use this
                              machine's own network access and credentials). While it is set the
                              runner refuses sessions that the environment's relay mode sends
                              through Anthropic's relay, and it cannot be combined with
                              --proxy-authorization-command or --proxy-authorization-file. Sessions
                              receive the URL under the variable's name. The flag wins over the
                              variable when both are set.
                              [env: SELF_HOSTED_RUNNER_AGENT_PROXY_URL]

Runtime:
  --capacity <n>              Max concurrent sessions (default: ${DEFAULT_SESSION_CAPACITY})
  --base-dir <path>           Base directory for repo checkouts (default: ${DEFAULT_BASE_DIR};
                              required on Windows, which has no default)
                              [env: SELF_HOSTED_RUNNER_BASE_DIR]
  --exec-path <path>          Binary to spawn for child sessions. Default: this process's own binary.
                              [env: SELF_HOSTED_RUNNER_EXEC_PATH]
  --hooks-dir <path>          Directory of lifecycle hook scripts (checkout, command, post-session).
                              Absent hooks fall through to built-in behavior.
                              [env: SELF_HOSTED_RUNNER_HOOKS_DIR]
  --session-stop-grace-sec <n>
                              How long to wait for the Claude process to exit cleanly after a
                              session ends, before force-killing it. The post-session hook runs
                              after this. Default: ${SIGKILL_TIMEOUT_DEFAULT_MS / 1000}.
                              [env: SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS, in ms]
  --post-session-hook-timeout-sec <n>
                              SIGTERM budget for the post-session lifecycle hook, on every session
                              end including runner shutdown. Default: ${POST_SESSION_HOOK_TIMEOUT_MS / 1000}.
                              [env: SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS, in ms]
  --checkout-hook-timeout-min <n>
                              Wall-clock budget for each run of the checkout lifecycle hook. A hook
                              still running at the budget is stopped (SIGTERM, then SIGKILL) and the
                              session fails setup with a "checkout hook timed out" error instead of
                              staying at "Preparing\u2026". Default: ${CHECKOUT_HOOK_TIMEOUT_MS / 60000}. 0 disables. Max: ${MAX_KILL_AFTER_MINUTES}.
                              [env: SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS, in ms]
  --drain-wait-sec <n>        On SIGTERM/SIGINT, wait up to N seconds for each session's in-flight
                              turn (a foreground tool call) and running background tasks to finish
                              before sending the session process its SIGTERM. Adds N to the
                              advertised shutdown budget.
                              A background task that has JUST finished also counts as
                              in-flight until the follow-up turn that reads its result starts
                              (bounded by SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS, in ms;
                              default: ${BG_RESULT_GRACE_MS / 1000}s; 0 or an unusable value falls back
                              to the default \u2014 the hold cannot be disabled).
                              A turn that has JUST finished likewise counts as in flight until
                              the session process has reported its end to the server (bounded by
                              SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS, in ms; default: ${POST_TURN_SETTLE_MS / 1000}s;
                              normally about two seconds), so its result is not lost to the SIGTERM.
                              Default: 0 (send SIGTERM immediately). Max: 86400.
                              [env: SELF_HOSTED_RUNNER_DRAIN_WAIT_MS, in ms]
                              (--drain-wait-bg-tasks-sec is a deprecated alias for this flag.)
  --drain-marker-file <path>  For hosts that announce a graceful drain by writing a marker file
                              inside the machine and then sending the runner SIGTERM: if the
                              file exists when the drain begins, the runner reports its exit to
                              the server as a host drain rather than a plain shutdown signal,
                              with the host's force-delete time when the file's FIRST LINE is
                              that time as a plain integer in Unix seconds (the time is read only
                              from a regular file; anything else at the path \u2014 unreadable, a
                              directory, a symlink, a pipe \u2014 still counts as a host drain, with
                              no time). Telemetry only \u2014 the drain itself behaves exactly as
                              without the flag. No file at the path reads as "no host drain".
                              Name a path on a local filesystem that your sessions cannot write
                              to (a read that hangs on a network mount cannot delay the drain,
                              but can keep the exiting process alive until the mount answers).
                              Default: unset (off). [env: SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE]
  --git-ssh-rewrite <host>    Rewrite https://<host>/... source URLs to git@<host>:... (repeatable).
                              For SSH-only git hosts.
  --git-host-rewrite <f>=<t>  Rewrite https://<f>/... source URLs to https://<t>/... (repeatable).
                              For split-horizon DNS where the runner reaches GHE via a different
                              hostname than the control plane. Applied before --git-ssh-rewrite.
  --use-anthropic-git-proxy   Opt this runner into Anthropic-managed git (clones are authenticated
                              server-side with the session creator's stored GitHub OAuth token, or
                              the org's GitHub App installation token for bot/agent sessions; you
                              don't manage git auth on the runner). Supersedes --git-host-rewrite
                              and --git-ssh-rewrite.
                              WARNING: deletes and replaces the HOME-level git config of the
                              account running the runner: ~/.gitconfig, the GIT_CONFIG_GLOBAL target
                              if set, and the whole $XDG_CONFIG_HOME/git directory (default
                              ~/.config/git; config, ignore, attributes and anything else in it),
                              at startup and before every session, with no backup, so one session's
                              git settings cannot reach the next.
                              The replacement holds only this runner's git credential settings for
                              the Anthropic API host (plus the --configure-git settings, if set) and
                              is left in place when the runner exits. Before every session the runner
                              also writes $XDG_CONFIG_HOME/git/ignore, with the one rule that keeps
                              Claude Code's .claude/settings.local.json out of git. Run this flag only
                              under a dedicated runner account or container, never a personal login;
                              keep operator git config in /etc/gitconfig or use --configure-git.
                              [env: CLAUDE_RUNNER_USE_GIT_PROXY=1]
  --configure-git             Set global git identity to Claude <noreply@anthropic.com> and enable
                              commit signing via Anthropic's signing service, matching 1P sessions.
                              Writes ~/.gitconfig at runner startup. Without this flag, your image
                              must provide its own git identity.
                              [env: SELF_HOSTED_RUNNER_CONFIGURE_GIT=1]
  --push-outcome-on-release   On a runner-initiated non-completed session end (SIGTERM drain,
                              idle-release, failed), push every tracked outcome branch to origin
                              before deleting it, so in-flight commits survive a runner restart.
                              Skipped on server-initiated deassign. On a resumed session (worker
                              epoch > 1), the prep path fetches any previously pushed outcome
                              branch from origin and continues from it, so histories stay
                              linear. CAVEAT: the resume-fetch trusts refs/heads/<outcome-branch>
                              on the source remote \u2014 anyone with push access to that ref can
                              place content into the resumed workspace; if your source revision
                              is protected but claude/* refs are not, that collaborator write
                              surface widens on resume. Repos checked out via the checkout
                              lifecycle hook are NOT pushed \u2014 use the post-session hook to
                              snapshot those. Adds 30s
                              (total, shared across all pushes) to the advertised
                              shutdown budget.
                              [env: SELF_HOSTED_RUNNER_PUSH_OUTCOME_ON_RELEASE=1]
  --trust-workspace [bool]    Seed persisted trust for each session's repo paths so repo-level
                              .claude/settings.json permissions.allow and additionalDirectories
                              are honored by the child. Default: ${TRUST_WORKSPACE_DEFAULT}.
                              Set to false for cli#44151's stricter gate: repo-committed grants
                              are dropped with an "Ignoring N permissions.allow" stderr
                              diagnostic; configure host-level grants via the host-config dir's
                              settings.json permissions.allow (userSettings source) instead.
                              [env: SELF_HOSTED_RUNNER_TRUST_WORKSPACE=0 to disable]
  --remove-session-state [bool]
                              Remove a session's per-session state under <base-dir>/_sessions/
                              when it ends on this runner, on every outcome: its Claude config
                              directory (local transcript copy, shell snapshots, session env,
                              file history, debug log), staged uploads, per-session gitconfig
                              and session working directory (worktrees, hook checkouts, no-repo
                              cwd). Default: ${REMOVE_SESSION_STATE_DEFAULT}. Off: they stay on disk until you recycle it,
                              readable by any later session this --base-dir serves (same Unix
                              user). Best-effort: a runner killed before its cleanup leaves
                              them; canonical clones and files written elsewhere (temp dir) are
                              not touched; a fresh filesystem per runner remains the primary
                              control. Copy the debug log from the post-session hook
                              (CLAUDE_RUNNER_DEBUG_LOG_PATH) if you need it locally.
                              [env: SELF_HOSTED_RUNNER_REMOVE_SESSION_STATE=1]
  --diff-finds-nested-repository [bool]
                              Let the web session's Changes pane show the changes in a repository
                              that was cloned into a sub-folder of a session's working folder, when
                              the session was started with no repository. Only while the child's
                              tool sandbox is off; only one repository (a checkout declared for the
                              session inside that folder if there is one; else, of the repositories
                              directly under that folder, the one the shell is in, or the only one);
                              and only through a copy of its git settings that Claude Code takes and
                              checks first: a repository whose settings hold any key outside a fixed
                              list (harmless ones, and a few that Claude Code overrides) is refused
                              whole.
                              The pane then stays empty, and this runner's log says why in a
                              "[changes pane] repository not shown: ..." line with the session's
                              id; the operator guide's row for this option says more.
                              In exchange, such a session shows no repository that is in its working
                              folder itself or in a folder above it, sandbox on or off: while one is
                              there the pane stays empty. With the option off, that one is shown.
                              Off by default: with it on, Claude Code's own git commands read a
                              repository that the session itself could have written, on this host,
                              with no tool sandbox.
                              Requires --capacity 1: another session's process, run by the same
                              Unix user at the same time, could rewrite the checked copy after the
                              check. Under the copy Claude Code runs no "git diff", only git
                              commands that look things up. In its tests none of them started a
                              program with each setting that git documents written into the copy.
                              That is a measurement (git 2.55, Linux), not a proof: if it misses
                              a case, a rewritten setting starts a program as that user. Hence
                              the limit. Use git 2.45 or later. A rewrite can still stall the
                              pane or make it show false rows. A session of another runner
                              started as that user on this host, or a process an earlier session
                              left on a reused host, could rewrite the copy too: the runner
                              cannot prevent those two. The copy (in
                              _sessions/<session id>.diff-copies) can hold a secret from the
                              repository's settings. If the session's process is killed the copy
                              stays behind; the runner removes it when the session ends.
                              Default: ${DIFF_FINDS_NESTED_REPO_DEFAULT}.
                              [env: SELF_HOSTED_RUNNER_DIFF_FINDS_NESTED_REPOSITORY=1]
  --confine-repo-settings <mode>
                              Repo-committed-settings confine guard mode: warn (default) logs
                              a would-refuse diagnostic per violation and still spawns;
                              enforce refuses to spawn the session; off disables the scan.
                              Invalid values fail closed at startup.
                              [env: SELF_HOSTED_RUNNER_CONFINE_REPO_SETTINGS]
  --server-auto-mode-lists <mode>
                              Which of the server's auto mode classifier lists a session may
                              receive in its launcher settings, when the server asks this
                              runner to apply them: all applies all three; no-allow (default)
                              withholds allow, the exceptions to soft block rules, and applies
                              environment and soft_deny (an environment entry can make the
                              classifier allow more as well as less); none applies none of
                              them. The choice is reported to the server at registration. An
                              invalid value stops the runner at startup.
                              [env: SELF_HOSTED_RUNNER_SERVER_AUTO_MODE_LISTS]
  [env: SELF_HOSTED_RUNNER_HOST_CONFIG_DIR]
                              Directory seeded into each session's CLAUDE_CONFIG_DIR (settings,
                              agents/, skills/, plugins/, \u2026; runtime state excluded). Default:
                              ~/.claude. Point at an empty dir to disable.
  --host-config-snapshot <disk|memory>
                              Where the startup snapshot of that directory is held. disk
                              (default): copied once into a runner-owned directory under
                              --base-dir and verified against an in-memory manifest at every
                              session start \u2014 no size limit; a session that finds the copy
                              modified fails and the runner must be restarted. memory: held on
                              the heap, limited to 64 MiB in total (over that, sessions start
                              without host config and say so).
                              [env: SELF_HOSTED_RUNNER_HOST_CONFIG_SNAPSHOT]
  --health-port <port>        Port for /healthz HTTP listener (default: ${DEFAULT_HEALTH_PORT}). 0 disables.
                              [env: SELF_HOSTED_RUNNER_HEALTH_PORT]
  --log-level <level>         Log level: info or debug (default: info)
  --log-file <path>           Tee runner logs to a file in append mode. Stdout is unchanged.
                              [env: SELF_HOSTED_RUNNER_LOG_FILE]

Runner lifecycle:
  --exit-if-unused-min <n>    Exit the runner if never assigned work for N min (autoscaler scale-down).
                              Default: never. Max: ${MAX_KILL_AFTER_MINUTES}.
                              [env: SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS, in ms]
  --drain-grace-sec <n>       Default: 0 \u2014 exit immediately after active sessions finish, WITHOUT
                              polling for more (one-shot when --capacity=1).
                              Set a positive value (e.g. 30) to keep the runner warm and re-poll the
                              locked account's queue for that many seconds before exiting.
                              Max: ${MIN_TIMESTAMP_SECONDS}. [env: SELF_HOSTED_RUNNER_DRAIN_GRACE_MS, in ms]
  --retire-at <epoch-seconds> Retire the runner at the given wall-clock time (absolute Unix timestamp, in
                              seconds): release every active session through the ReleaseSession path that
                              --release-idle-session-min uses (the session parks server-side and a fresh
                              runner picks it up on the user's next message), stop taking new work, and
                              exit 0 once the slots are empty. A session still mid-turn at that time is
                              released as soon as its turn ends; background work a finished turn left
                              running gets up to 60s of grace, then the session parks anyway (perpetual
                              monitor tasks don't hold it at all). Use this when the host hard-kills the
                              runner at a known time (e.g. a sandbox lifetime cap): set it far enough
                              before the kill to cover typical turns PLUS the per-session shutdown
                              budget (--session-stop-grace-sec, the push-outcome window, the full
                              --post-session-hook-timeout-sec, the 60s background-work grace, one poll)
                              so sessions park cleanly and the post-session hook isn't truncated by
                              the kill. Default: never. [env: SELF_HOSTED_RUNNER_RETIRE_AT, in seconds]
  --defer-shutdown-max-min <m>
                              On the FIRST SIGTERM/SIGINT, do not drain: stop taking new work (the runner
                              advertises zero capacity and keeps polling only as its lease heartbeat) and
                              otherwise keep running as it does today, then finish shutting down M minutes
                              later. Until then attached sessions are served normally and leave only the way
                              they would without any signal: --release-idle-session-min, if set, releases a
                              session whose user has gone idle (it parks server-side and a fresh runner
                              resumes it on the user's next message); a session that flag would not release
                              \u2014 it is unset, or the finished turn still has background work running \u2014 simply
                              stays attached. M minutes after the first signal every session still attached
                              is released through that same park path at once regardless of idle time (one
                              mid-turn as soon as its turn ends; background work a finished turn left running
                              gets up to 60s), and anything STILL attached ${(DEFAULT_POST_SESSION_ALLOWANCE_MS + SIGKILL_GRACE_BASE_MS) / 1000}s later (that 60s + a 15s
                              margin; --drain-wait-sec + 15s if longer) is drained as on a second signal \u2014
                              the one path that requeues instead of parking. The runner exits 0 as soon as
                              it holds no session, before or after M. A SECOND signal drains immediately, as
                              the first does without this flag; a third force-exits (so does a signal during
                              that last-resort drain). READ THIS BEFORE ENABLING: your supervisor sends one
                              SIGTERM and then SIGKILLs at its stop timeout; if that timeout ends first,
                              every still-attached session is killed WITHOUT its post-session hook or
                              deregister and is requeued to another runner about a minute later \u2014 strictly
                              worse than the default drain. So set the stop timeout
                              (terminationGracePeriodSeconds etc.) to at least M minutes + ${(DEFAULT_POST_SESSION_ALLOWANCE_MS + SIGKILL_GRACE_BASE_MS) / 1000}s (that post-ceiling
                              grace; --drain-wait-sec + 15s if longer) + the shutdown budget above \u2014 the runner
                              prints this sum at startup when the flag is set. --startup-timeout-min and
                              --kill-session-after-min keep working unchanged during the wait. Fractional
                              minutes are accepted. Default: 0 (off \u2014 drain on the first signal).
                              Max: ${MAX_KILL_AFTER_MINUTES}. [env: SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS, in ms]

Per-session watchdogs:
  --release-idle-session-min <n>  Release a session slot after N min of no user input (turn finished,
                                  or parked at a permission prompt, user idle). Runner exits if this
                                  drops it to zero active sessions.
                                  Default: never. Max: ${MAX_KILL_AFTER_MINUTES}.
                                  [env: SELF_HOSTED_RUNNER_SESSION_IDLE_MS, in ms]
  --hold-idle-file <path>         Do not release an idle session (--release-idle-session-min) while
                                  <path> is a regular file changed in the last ${HOLD_IDLE_MTIME_FRESH_MS / 1000}s: your host
                                  keeps it fresh while a process the session left running (nohup,
                                  tmux) lives. Looked at again every ${LEFTOVER_HOLD_LOOK_TIMEOUT_MS / 1000}s. Does not hold a
                                  session at startup, at --retire-at, at the --defer-shutdown-max-min
                                  ceiling or at --kill-session-after-min. Default: off.
                                  [env: SELF_HOSTED_RUNNER_HOLD_IDLE_FILE]
  --max-hold-min <n>              With --hold-idle-file: release the session anyway N min after it
                                  went idle. Default: ${DEFAULT_MAX_HOLD_MS / 60000}. 0 disables the hold.
                                  Max: ${MAX_KILL_AFTER_MINUTES}. [env: SELF_HOSTED_RUNNER_MAX_HOLD_MS, in ms]
  --startup-timeout-min <n>       Release a session slot if the child has not finished starting up
                                  N min after spawn \u2014 covers a child hung during --resume hydration or
                                  MCP connect, and a session assigned with no pending input. Output the
                                  child writes before it has begun a turn, initialized or reported its
                                  state restarts the N min. Once the child begins a turn, however long
                                  that turn works before system:init, it is released only if the runner
                                  hears nothing from it for N min: a live child writes a line by itself
                                  several times in N min, so that means frozen, dead or cut off by a
                                  wrapper (a pinned older Claude Code version: the N min run until
                                  system:init). Cleared at system:init, after which
                                  --release-idle-session-min takes over. Default: 15. 0 disables.
                                  Max: ${MAX_KILL_AFTER_MINUTES}.
                                  [env: SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS, in ms]
  --kill-session-after-min <n>    Cap a session child's wall-clock life at N min (runaway backstop).
                                  At the deadline a session that is waiting on its user (idle, parked
                                  at a permission prompt, or still starting up) is RELEASED \u2014 paused
                                  server-side, resumable \u2014 not killed; a turn in flight is released
                                  when it next parks or finishes; a turn still running (or a release
                                  the server keeps declining) is SIGTERMed at the hard cap, 15 min past
                                  the deadline (override: SELF_HOSTED_RUNNER_MAX_LIFETIME_GRACE_MS, in
                                  ms). Default: never. Max: ${MAX_KILL_AFTER_MINUTES}.
                                  [env: SELF_HOSTED_RUNNER_MAX_LIFETIME_MS, in ms]

Debug:
  --debug-token-dir <path>    DEBUG ONLY \u2014 writes live tokens to disk. Do not use in production.
                              [env: SELF_HOSTED_RUNNER_DEBUG_TOKEN_DIR]

  --help, -h                  Show this help message`);
    return;
  }
  configureGlobalAgents();
  let r = () => new Date().toISOString();
  let s;
  let stdioWriter = openStdioWriter({
    stamp: (P) => `${r()} [self-hosted-runner] ${redactSecretsInText(P)}`,
    onOwnLine: (P) =>
      s?.write(
        P +
          `
`,
      ),
  });
  let o;
  let l;
  let u;
  let h;
  try {
    o = parseRunnerOptions(e);
    u = proxyAuthorizationConfig({
      command: o.proxyAuthorizationCommand,
      file: o.proxyAuthorizationFile,
    });
    let P = o.envSetByFlag.has("SELF_HOSTED_RUNNER_AGENT_PROXY_URL")
      ? "--agent-proxy-url"
      : "SELF_HOSTED_RUNNER_AGENT_PROXY_URL";
    h = checkRunnerAgentProxyStandaloneUrl(env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL, P);
    if (h !== undefined && u !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${P} cannot be combined with --proxy-authorization-command / --proxy-authorization-file: sessions would reach that proxy without the egress listener. Remove one of the two.`,
        "runner agent proxy URL paired with a --proxy-authorization-* egress listener",
      );
    if (process.env.SELF_HOSTED_RUNNER_HOOKS_DIR) assertLifecycleHooksSupported("--hooks-dir");
    requireBaseDirOnWindows(o.baseDirSource);
    lockCurrentVersion();
    l = await readEnvironmentSecretFile(o, (Z) => stdioWriter.write("stderr", Z));
    await checkBaseDirWritable(o.baseDir, undefined, (Z) => stdioWriter.write("stderr", Z));
  } catch (error) {
    stdioWriter.write(
      "stderr",
      `error: ${redactSecretsInText(errorMessage(error))}
Run 'claude self-hosted-runner --help' for usage.`,
    );
    process.exit(2);
  }
  let p = o.logLevel === "debug";
  if (o.logFile) {
    s = createWriteStream(o.logFile, {
      flags: "a",
      mode: 384,
    });
    s.on("open", (P) => {
      fchmod(P, 384, () => {});
    });
    s.on("error", (P) => {
      stdioWriter.write(
        "stderr",
        `${r()} [runner:warn] log-file write failed (${errorMessage(P)}); continuing stdout-only`,
      );
      s = undefined;
    });
  }
  let S = (P) => {
    s?.write(
      P +
        `
`,
    );
  };
  let T = async () => {
    if (!s) return;
    let P = s;
    s = undefined;
    await withBoundedTimeout(
      new Promise((resolve) => P.end(resolve)),
      500,
      "[runner:exit] log-file flush",
    ).catch(() => {});
  };
  let y = (P) => {
    if (p) {
      let Z = `${r()} [DEBUG] ${redactSecretsInText(P)}`;
      stdioWriter.write("stderr", Z);
      S(Z);
    }
  };
  let v = (P) => {
    let Z = `${r()} [self-hosted-runner] ${redactSecretsInText(P)}`;
    stdioWriter.write("stdout", Z);
    S(Z);
  };
  y(`[runner:log] ${stdioWriter.describe()}`);
  if (process.env.SELF_HOSTED_RUNNER_SIGKILL_TIMEOUT_MS !== undefined) {
    v(
      "[runner:fatal] SELF_HOSTED_RUNNER_SIGKILL_TIMEOUT_MS was renamed to SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS. It controls how long to wait for the Claude process to exit cleanly after a session ends, before force-killing it. The post-session hook runs after this.",
    );
    await T();
    process.exit(1);
  }
  for (let P of [
    "RUNNER_RELEASE_IDLE_SESSION_MIN",
    "SELF_HOSTED_RUNNER_RELEASE_IDLE_SESSION_MIN",
    "SELF_HOSTED_RUNNER_SESSION_IDLE_MIN",
    "SELF_HOSTED_RUNNER_SESSION_IDLE_SEC",
  ])
    if (process.env[P] !== undefined)
      v(
        `[runner:warn] ${P} is set but is not a setting this runner ` +
          "reads \u2014 it is being IGNORED. The session idle-release window " +
          "is configured with --release-idle-session-min <minutes> (or env SELF_HOSTED_RUNNER_SESSION_IDLE_MS, in milliseconds).",
      );
  let w = graceSeconds(
    envPositiveMs("SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS") || SIGKILL_TIMEOUT_DEFAULT_MS,
    envPositiveMs("SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS") || POST_SESSION_HOOK_TIMEOUT_MS,
    getDrainWaitMs(),
    o.pushOutcomeOnRelease ? PUSH_ON_RELEASE_TIMEOUT_MS : 0,
    noHybridToken(),
  );
  let E = `[runner] This runner needs up to ${w}s to stop the Claude process and run the post-session hook on shutdown, and force-exits after ${w}s (a session release already in flight when shutdown begins can add up to ${RELEASE_IN_FLIGHT_WAIT_MS / 1000}s, normally well under 1s, before the runner deregisters). Configure your process supervisor's stop timeout to at least ${w}s (e.g. terminationGracePeriodSeconds on Kubernetes, stop_grace_period on Docker Compose, TimeoutStopSec on systemd, or your platform's equivalent).`;
  v(E);
  let A = envPositiveMs("SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS");
  let G = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_IDLE_MS");
  let K = Math.max(getDrainWaitMs(), DEFAULT_POST_SESSION_ALLOWANCE_MS) + SIGKILL_GRACE_BASE_MS;
  let L =
    A > 0
      ? `[runner] --defer-shutdown-max-min is set (${formatDuration(A, {
          hideTrailingZeros: true,
        })}): the FIRST shutdown signal does not start that ${w}s budget \u2014 the runner stops ` +
        "taking work but keeps serving the attached sessions; " +
        (G > 0
          ? `each is released (parked, resumable) once its user has been idle ${formatDuration(G, {
              hideTrailingZeros: true,
            })} (--release-idle-session-min)`
          : "none is released early (--release-idle-session-min is not set)") +
        `, and the runner exits as soon as it holds no session; ${formatDuration(A, {
          hideTrailingZeros: true,
        })} after the signal every remaining session is released at once and anything still attached ${formatDuration(
          K,
          {
            hideTrailingZeros: true,
          },
        )} later is drained. If your supervisor's stop timeout ends first, every still-attached session is killed WITHOUT its post-session hook or deregister and is requeued to another runner about a minute later. Size the stop timeout to at least ${Math.ceil((A + K) / 1000) + w}s (M + post-ceiling grace + the budget above). A second signal drains immediately.`
      : undefined;
  if (L !== undefined) v(L);
  let D = (P, Z, re, be = false) => {
    let ee = process.env[P];
    if (ee === undefined || ee === "")
      return re !== undefined && re > 0
        ? `${formatDuration(re, {
            hideTrailingZeros: true,
          })} (default)`
        : "disabled (not configured)";
    let Re = o.envSetByFlag.has(P) ? Z : `env ${P}`;
    let Ue = envPositiveMs(P);
    if (Ue > 0)
      return `${formatDuration(Ue, {
        hideTrailingZeros: true,
      })} (from ${Re})`;
    let ht = Number(ee) === 0 && (be !== "unless-zero" || ee.trim() !== "");
    if ((be === true || (be === "unless-zero" && !ht)) && re !== undefined && re > 0) {
      let wn = ht ? "0 is not accepted" : "not a usable ms duration";
      return (
        `${formatDuration(re, {
          hideTrailingZeros: true,
        })} ` + `(default \u2014 ${Re} ignored: ${wn})`
      );
    }
    return ht
      ? `disabled (from ${Re})`
      : `disabled (from ${Re} \u2014 not a usable ms duration, treated as 0)`;
  };
  let oe = () => {
    let P = holdIdleFile();
    if (P === undefined) return "off (--hold-idle-file not set)";
    let envSelfHostedRunnerMaxHoldMs = process.env.SELF_HOSTED_RUNNER_MAX_HOLD_MS;
    let re =
      envSelfHostedRunnerMaxHoldMs === undefined || envSelfHostedRunnerMaxHoldMs.trim() === ""
        ? "default"
        : o.envSetByFlag.has("SELF_HOSTED_RUNNER_MAX_HOLD_MS")
          ? "from --max-hold-min"
          : "from env SELF_HOSTED_RUNNER_MAX_HOLD_MS";
    let maxHoldMs = getMaxHoldMs();
    if (maxHoldMs === 0)
      return re === "from --max-hold-min"
        ? "off (--max-hold-min is 0)"
        : "off (env SELF_HOSTED_RUNNER_MAX_HOLD_MS is 0 or not a usable ms duration)";
    let ee = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_IDLE_MS");
    let Re =
      ee === 0
        ? ", but holds nothing while --release-idle-session-min is off"
        : maxHoldMs <= ee
          ? ", but holds nothing: the cap is not longer than --release-idle-session-min"
          : "";
    return `${P}, cap ${formatDuration(maxHoldMs, {
      hideTrailingZeros: true,
    })} (${re})${Re}`;
  };
  v(
    `[runner] watchdog config: idle-release=${D("SELF_HOSTED_RUNNER_SESSION_IDLE_MS", "--release-idle-session-min")}; startup-timeout=${D("SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS", "--startup-timeout-min", DEFAULT_STARTUP_TIMEOUT_MS)}; kill-session-after=${D("SELF_HOSTED_RUNNER_MAX_LIFETIME_MS", "--kill-session-after-min")}; exit-if-unused=${D("SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS", "--exit-if-unused-min")}; defer-shutdown-max=${D("SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS", "--defer-shutdown-max-min")}; checkout-hook-timeout=${D("SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS", "--checkout-hook-timeout-min", CHECKOUT_HOOK_TIMEOUT_MS, "unless-zero")}; bg-result-grace=${D("SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS", "SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS", BG_RESULT_GRACE_MS, true)}; post-turn-settle=${D("SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS", "SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS", POST_TURN_SETTLE_MS, true)}; leftover-hold=${oe()}; drain-marker-file=${process.env.SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE || "unset"}`,
  );
  let ge =
    o.removeSessionState === REMOVE_SESSION_STATE_DEFAULT
      ? "default"
      : "--remove-session-state / SELF_HOSTED_RUNNER_REMOVE_SESSION_STATE";
  v(
    o.removeSessionState
      ? `[runner] per-session state: REMOVED at session end (${ge}) \u2014 each session's _sessions/<id>.claude-config, .tool-server-config, .uploads, .gitconfig and <id>/ are deleted when it ends, best-effort`
      : `[runner] per-session state: KEPT at session end (${ge}) \u2014 each session's _sessions/<id>.claude-config, .tool-server-config, .uploads, .gitconfig and <id>/ stay under ${o.baseDir} until the disk is recycled`,
  );
  let Ne =
    o.diffFindsNestedRepository === DIFF_FINDS_NESTED_REPO_DEFAULT
      ? "the default"
      : "--diff-finds-nested-repository / SELF_HOSTED_RUNNER_DIFF_FINDS_NESTED_REPOSITORY";
  v(
    o.diffFindsNestedRepository
      ? `[runner] changes in a repository cloned into a sub-folder: SHOWN (${Ne}) \u2014 for a session started with no repository, the web session's Changes pane may show one repository under the session's working folder, only while the session's tool sandbox is off; while a repository is in that folder itself or in a folder above it the pane stays empty, sandbox on or off; a refusal is reported, with the session's id and the reason, in a "[changes pane] repository not shown" line in this log`
      : `[runner] changes in a repository cloned into a sub-folder: NOT SHOWN (${Ne}) \u2014 for a session started with no repository, the web session's Changes pane may show only a repository in the session's working folder itself or in a folder above it; --diff-finds-nested-repository shows one in a sub-folder instead; its --help entry says what that costs`,
  );
  let envSelfHostedRunnerHooksDir = process.env.SELF_HOSTED_RUNNER_HOOKS_DIR;
  let execPath = o.execPath;
  if (!execPath) {
    let hook = await findHook(envSelfHostedRunnerHooksDir, "command");
    if (hook) {
      execPath = hook;
      v(`[runner:hook] using command hook ${hook}`);
    }
  }
  let { execPath: execPath_2, execArgs } = runnerExecPath(execPath);
  let ae = warnDiffFindsNestedRepository(o.diffFindsNestedRepository, execPath);
  if (ae) v(ae);
  let freshMachinePerSession = false;
  v(
    `Connecting to ${o.apiUrl} (capacity=${o.capacity}, baseDir=${o.baseDir}, execPath=${[execPath_2, ...execArgs].join(" ")})`,
  );
  let $e = warnCapacityOnSessionBoundRunner(l, o.capacity);
  if ($e !== null) v($e);
  if (h !== undefined)
    v(
      `[runner:warn] Every session on this runner goes through the agent proxy at ${h.protocol}//${h.host}. Anthropic-managed git (governed git) sessions go through it too, except on Windows and when the server sends no git setup for them, which are refused. This runner refuses sessions that the environment's relay mode sends through Anthropic's relay. Run refused sessions on a runner started without a proxy URL (--agent-proxy-url / SELF_HOSTED_RUNNER_AGENT_PROXY_URL).` +
        (execPath
          ? " Sessions start through --exec-path or a command hook: the claude it runs must be this version or newer, so keep it updated, and receive SELF_HOSTED_RUNNER_AGENT_PROXY_URL and CCR_AGENT_PROXY_RELAY_MODE, or its sessions connect directly instead. With an older claude, Anthropic-managed git does not run: git and gh fail if its traffic goes through the proxy, or else use this machine's own network access and credentials."
          : ""),
    );
  if (o.debugTokenDir)
    await mkdir(o.debugTokenDir, {
      recursive: true,
      mode: 448,
    })
      .then(() => {
        v(`[runner:debug] debug token dir ready: ${o.debugTokenDir}`);
      })
      .catch((error) => {
        v(`[runner:debug] failed to create debug token dir (best-effort): ${error}`);
      });
  let Ve;
  if (u)
    try {
      Ve = await startRunnerEgressProxy(u, {
        onStatus: v,
        onDebug: y,
      });
      logFeatureOk("self_hosted_egress_proxy_auth");
    } catch (error) {
      logFeatureBad("self_hosted_egress_proxy_auth", "listener_start_failed");
      v(`[runner:fatal] could not start the proxy-authorization listener: ${errorMessage(error)}`);
      await T();
      process.exit(1);
    }
  let Be = o.capacity === 1 && o.debugTokenDir === undefined && !execPath ? [CODE_REVIEW_TOKEN_HANDOFF] : [];
  y(`[runner] capabilities reported to the server: ${Be.join(", ") || "none"}`);
  let defaultEnvironment = createDefaultEnvironment({
    baseUrl: o.apiUrl,
    poolSecret: l,
    onDebug: y,
    capabilities: Be,
  });
  let clientLabel = o.clientLabel ?? hostname();
  if (o.lockToAccountId) v(`Registering locked to account: ${o.lockToAccountId}`);
  if (o.useAnthropicGitProxy)
    v("Registering as opted in to Anthropic-managed git (--use-anthropic-git-proxy)");
  if (o.serverAutoModeLists !== NO_ALLOW)
    v(
      `Registering with --server-auto-mode-lists ${o.serverAutoModeLists}: ${SERVER_AUTO_MODE_LISTS_DESCRIPTIONS[o.serverAutoModeLists]}`,
    );
  let Ae;
  let Ht;
  let Mt;
  try {
    Mt = await retryWithBackoff(
      () =>
        defaultEnvironment.registerRunner({
          clientLabel,
          lockToAccountId: o.lockToAccountId,
          useAnthropicGitProxy: o.useAnthropicGitProxy,
          serverAutoModeLists: o.serverAutoModeLists,
        }),
      {
        initialDelayMs: 1000,
        maxDelayMs: 16000,
        maxAttempts: 5,
        shouldRetry: isRetryableRunnerError,
        onRetry: (Z, re) => {
          v(
            `RegisterRunner attempt ${Z} transient failure (${re instanceof Error ? re.message : re}) \u2014 retrying`,
          );
        },
      },
    );
    Ae = Mt.runner_id;
    Ht = Mt.runner_token;
    logFeatureOk("self_hosted_register");
  } catch (error) {
    let Z = error instanceof Error ? error.message : String(error);
    let re = describeServerAuthRejection(error, l);
    if (re !== null) {
      logFeatureBad("self_hosted_register", "self_hosted_register_work_order_refused");
      v(`[runner:fatal] ${re}`);
    } else if (
      error instanceof Error &&
      "isSelfHostedDisabledByOrg" in error &&
      error.isSelfHostedDisabledByOrg === true
    ) {
      logFeatureBad("self_hosted_register", "self_hosted_register_disabled_by_org");
      v(
        `[runner:fatal] RegisterRunner refused because self-hosted environments are not enabled for this organization. Usually the 'Allow self-hosted environments' setting on the Cloud environments admin page (claude.ai/admin-settings/cloud-environments) is off, and an organization Owner can turn it on. Self-hosted environments also need a Team or Enterprise plan, and the setting usually applies within a few minutes. If this message still appears after that, contact your Anthropic account team. The environment secret was accepted, so do not rotate it. (${Z})`,
      );
    } else if (isAuthFailure(error)) {
      logFeatureBad("self_hosted_register", "self_hosted_register_auth_failed");
      v(
        `[runner:fatal] RegisterRunner auth failed \u2014 environment secret invalid or revoked. Check --environment-secret-file or SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET. (${Z})`,
      );
    } else {
      logFeatureBad("self_hosted_register", "self_hosted_register_failed");
      let be = validateLockToAccount(Z);
      v(`[runner:fatal] RegisterRunner failed: ${Z}${be}`);
    }
    await T();
    process.exit(1);
  }
  v(`Registered: runner_id=${Ae}`);
  let startCommandPhases = undefined;
  let abortController = new AbortController();
  let sr = undefined;
  let Gn = defaultEnvironment;
  let apiClient = Gn;
  let abortController_2 = new AbortController();
  let an = "running";
  let or = true;
  let br = {};
  let Tn = {};
  let On = (P) => {
    let Z = br.current;
    let re =
      Z === undefined
        ? "session counts not yet initialized (startup in progress)"
        : `${Z.sessionIdle.size} active session(s), ${count([...Z.sessionIdle.values()], (be) => be !== null)} of them idle`;
    return `(${P}; uptime ${formatDuration(process.uptime() * 1000)}; ${re})`;
  };
  let dn = (P) => {
    if (an === "running" && A > 0 && or) {
      an = "deferring";
      v(
        `Received shutdown signal, deferring drain: refusing new work, serving the attached sessions until they are released or ${formatDuration(
          A,
          {
            hideTrailingZeros: true,
          },
        )} passes; a second signal drains immediately ${On(P)}`,
      );
      v(E);
      if (L !== undefined) v(L);
      abortController_2.abort(Date.now());
      return;
    }
    An(P);
  };
  let An = (P, Z = "signal") => {
    if (an === "draining") {
      let be = postSessionHooksRunning();
      if (be > 0)
        v(
          `[runner] Forced shutdown with ${be} post-session hook(s) still running \u2014 they continue in their own process group, but their output is no longer captured and the runner's timeout budget no longer applies.`,
        );
      else v("Forced shutdown");
      T().finally(() => process.exit(1));
      return;
    }
    an = "draining";
    v(
      Z === "signal"
        ? "Received shutdown signal, draining active sessions... " + On(P)
        : `[runner:shutdown] ${P} \u2014 draining active sessions... ` + On("no new signal"),
    );
    v(E);
    let re = postSessionHooksRunning();
    if (re > 0)
      v(
        `[runner] ${re} post-session hook(s) still running \u2014 waiting for them within the budget above. Another SIGTERM force-exits the runner immediately; make sure your supervisor's stop timeout covers the full budget so hooks are not cut short.`,
      );
    abortController.abort();
  };
  let Bt = () => dn("SIGTERM");
  let kt = () => dn("SIGINT");
  process.on("SIGTERM", Bt);
  process.on("SIGINT", kt);
  let Cn = {
    runnerToken: Ht,
  };
  if (o.debugTokenDir) await writeRunnerFileBestEffort(o.debugTokenDir, "runner_token.jwt", Ht, v);
  let Fr = (P) => {
    if (o.debugTokenDir) writeRunnerFileBestEffort(o.debugTokenDir, "runner_token.jwt", P, v);
    Cn.runnerToken = P;
    y("[runner:main] runner_token refreshed");
  };
  let jwtExpiry = getJwtExpiry({
    getAccessToken: async () => {
      let { token } = await Gn.refreshToken(Cn.runnerToken);
      return token;
    },
    onRefresh: (P, Z) => Fr(Z),
    label: "self-hosted-runner",
  });
  jwtExpiry.schedule(RUNNER_KIND, Ht);
  let Nn = undefined;
  Tn.current = Nn;
  let zn;
  if (o.useAnthropicGitProxy) {
    if (o.capacity > 1) {
      v(
        "[runner:fatal] --use-anthropic-git-proxy requires --capacity 1 (the proxy URL is per-session and linked worktrees share origin). Omit --use-anthropic-git-proxy or set --capacity 1.",
      );
      await T();
      process.exit(1);
    }
    if (
      antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM &&
      envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS") > 0
    ) {
      v(
        "[runner:fatal] CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM requires --drain-grace-sec 0 (one-shot). With drain-grace > 0 a second session could reuse this VM after the first's child wrote to the canonical .git/, and the skip would bypass the cross-session-isolation sanitize for an untrusted canonical. Unset the env var or set --drain-grace-sec 0.",
      );
      await T();
      process.exit(1);
    }
    let { parseGitVersion, readGitVersion } = await import("./chunk-nxsqxhv4.js");
    let gitVersion = await readGitVersion();
    let gitVersion_2 = parseGitVersion(gitVersion);
    if (!gitVersion_2 || gitVersion_2[0] < 2 || (gitVersion_2[0] === 2 && gitVersion_2[1] < 32)) {
      v(
        `[runner:fatal] --use-anthropic-git-proxy requires git >= 2.32 (found ${gitVersion.trim() || "<none>"}). Older git silently ignores GIT_CONFIG_GLOBAL, which this mode relies on for cross-session isolation.`,
      );
      await T();
      process.exit(1);
    }
    zn = process.env.GIT_CONFIG_GLOBAL || join(homedir(), ".gitconfig");
    let ee = zn;
    let Re = await lstat(ee).catch(() => {
      return;
    });
    if (Re && (Re.isCharacterDevice() || Re.isBlockDevice())) {
      v(
        `[runner:fatal] --use-anthropic-git-proxy requires a writable global git config, but GIT_CONFIG_GLOBAL resolves to ${ee} which is not a regular file. The proxy flag writes its credential helper there and restores it at each session start. Unset GIT_CONFIG_GLOBAL or point it at a regular file path.`,
      );
      await T();
      process.exit(1);
    }
    let Ue = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
    let ht = gitSearchDirs(Ue, homedir());
    v(
      `[runner:git] --use-anthropic-git-proxy: wiping HOME-level git config (${ee}, ${ht.join(", ")}, ${join(o.baseDir, ".runner")}) for cross-session isolation. Operator-provisioned git config must live in system config (/etc/gitconfig) or via --configure-git; see "Git authentication" in the self-hosted runners guide.`,
    );
    await resetRunnerHome({
      globalCfgPath: ee,
      homeGitconfigPath: join(homedir(), ".gitconfig"),
      xdgGitDirs: ht,
      runnerDir: join(o.baseDir, ".runner"),
    });
  }
  let {
    operatorGitSnapshotWarnings,
    quoteConfigValueForLog,
    readOperatorGitSnapshot,
    resolveHookGitPrograms,
    parseGitVersion,
    readGitVersion,
  } = await import("./chunk-nxsqxhv4.js");
  let operatorGitSnapshot = await readOperatorGitSnapshot({
    baseDir: o.baseDir,
    lifecycleHooks: Boolean(envSelfHostedRunnerHooksDir),
  });
  let hookGitPrograms = await resolveHookGitPrograms({
    baseDir: o.baseDir,
  });
  let hookGitLegacyParams = false;
  if (envSelfHostedRunnerHooksDir) {
    let {
      envHasGitConfigKey,
      lifecycleHookAskpassSource,
      operatorGitConfigPairStatus,
      withLifecycleHookGitEnv,
      LIFECYCLE_HOOK_GIT_ENV,
    } = await import("./chunk-1k90kvy4.js");
    let GIT_ALLOW_PROTOCOL = LIFECYCLE_HOOK_GIT_ENV.GIT_ALLOW_PROTOCOL;
    let Ue = envHasGitConfigKey("core.hooksPath");
    let ht = withLifecycleHookGitEnv();
    let wn = ht.GIT_ALLOW_PROTOCOL !== GIT_ALLOW_PROTOCOL;
    for (let St of operatorGitSnapshotWarnings(operatorGitSnapshot, {
      isRoot: process.getuid?.() === 0,
      operatorSshInEnv: ht.GIT_SSH_COMMAND !== LIFECYCLE_HOOK_GIT_ENV.GIT_SSH_COMMAND,
      askpassSource: lifecycleHookAskpassSource(),
      postSessionHook:
        operatorGitSnapshot.lfsFilterScopes !== undefined &&
        (await findHook(envSelfHostedRunnerHooksDir, "post-session")) !== null,
      envHooksPath: Ue,
    }))
      v(St);
    let et = operatorGitConfigPairStatus();
    if (et.discarded !== undefined)
      v(
        `[runner:warn] GIT_CONFIG_COUNT=${et.announced} in the runner environment is ${et.discarded === "sparse" ? "not backed by that many GIT_CONFIG_KEY_n pairs" : "above the supported maximum"}; the lifecycle hooks' git will NOT receive those operator pairs (only the runner's pins). Fix the count/pairs to have them applied.`,
      );
    v(
      "[runner:git] lifecycle hooks: core.hooksPath " +
        (Ue
          ? "taken from the GIT_CONFIG_KEY_n pair in the runner's environment"
          : `pinned to ${quoteConfigValueForLog(operatorGitSnapshot.hooksPath ?? "/dev/null")}${operatorGitSnapshot.hooksPath ? " (system git config)" : " (no repository or global hooks run inside lifecycle-hook git)"}`) +
        `; fsmonitor/askpass/templates off${ht.GIT_ASKPASS !== undefined && ht.GIT_ASKPASS === ht.SSH_ASKPASS ? " (GIT_ASKPASS set from the runner environment's SSH_ASKPASS)" : ""}; GIT_ALLOW_PROTOCOL=${ht.GIT_ALLOW_PROTOCOL ?? "(unset)"} for hook git${wn ? " (from the runner environment)" : " (runner default \u2014 local-path/file://, git://, bundle and external-helper remotes refused)"}; gpg programs ${hookGitPrograms.gpg}/${hookGitPrograms.gpgsm}${hookGitPrograms.skipped.length ? ` (skipped session-writable ${hookGitPrograms.skipped.length} PATH entries)` : ""}; ` +
        (o.configureGit
          ? "hook-made commits signed per session (--configure-git), not co-authored"
          : "commit/tag signing off for hook-made commits (no --configure-git)"),
    );
    let gitVersion = parseGitVersion(await readGitVersion());
    if (gitVersion !== null && (gitVersion[0] < 2 || (gitVersion[0] === 2 && gitVersion[1] < 31))) {
      hookGitLegacyParams = true;
      v(
        `[runner:warn] git ${gitVersion[0]}.${gitVersion[1]} ignores GIT_CONFIG_COUNT; exporting the lifecycle-hook git configuration pins (and any GIT_CONFIG_KEY_n pairs from the runner environment, after them) via GIT_CONFIG_PARAMETERS instead (upgrade to git >= 2.31 for the documented behaviour).`,
      );
    }
  }
  if (o.configureGit)
    try {
      let { configureGitForSigning } = await import("./chunk-nxsqxhv4.js");
      await configureGitForSigning({
        baseDir: o.baseDir,
        execPath: process.execPath,
        onStatus: v,
      });
    } catch (error) {
      v(
        `[runner:fatal] --configure-git failed: ${errorMessage(error)}. Check git is on PATH and ~/.gitconfig is writable.`,
      );
      await T();
      process.exit(1);
    }
  if (o.pushOutcomeOnRelease)
    try {
      let { parseGitVersion } = await import("./chunk-nxsqxhv4.js");
      let Z = await execFileNoThrow("git", ["--version"], {
        timeout: 5000,
        useCwd: false,
        stdin: "ignore",
        stderr: "pipe",
        maxBuffer: 1048576,
      });
      if (Z.stderr.trim() !== "") stdioWriter.write("stderr", redactSecretsInText(Z.stderr.trimEnd()));
      let re = Z.code === 0 ? parseGitVersion(Z.stdout) : null;
      if (re !== null && (re[0] < 2 || (re[0] === 2 && re[1] < 29)))
        v(
          `[runner:warn] --push-outcome-on-release: git ${re[0]}.${re[1]} detected. The drain-push works on any version, but resuming from the preserved branch requires git >= 2.29 (--no-write-fetch-head). Upgrade git for full behavior.`,
        );
    } catch {}
  let configureGitHookStubs;
  let configureGitSigningArtifacts;
  if (o.configureGit) {
    let { coauthorHookStubs, codeSignArtifacts } = await import("./chunk-nxsqxhv4.js");
    configureGitHookStubs = coauthorHookStubs(o.baseDir);
    configureGitSigningArtifacts = codeSignArtifacts(o.baseDir, process.execPath);
  }
  let gitProxyGlobalConfigSnapshot;
  let gitProxyCredHelper;
  if (o.useAnthropicGitProxy)
    try {
      let { configureGitProxyCredential, GIT_PROXY_CRED_HELPER_CONTENT, gitProxyCredHelperPath } =
        await import("./chunk-nxsqxhv4.js");
      await configureGitProxyCredential({
        baseDir: o.baseDir,
        apiBaseUrl: o.apiUrl,
        onStatus: v,
      });
      gitProxyGlobalConfigSnapshot = await readFile(zn, "utf-8").catch(() => "");
      gitProxyCredHelper = {
        path: gitProxyCredHelperPath(o.baseDir),
        content: GIT_PROXY_CRED_HELPER_CONTENT,
      };
    } catch (error) {
      v(
        `[runner:fatal] --use-anthropic-git-proxy failed: ${errorMessage(error)}. Check git is on PATH and ~/.gitconfig is writable.`,
      );
      await T();
      process.exit(1);
    }
  let config = {
    apiUrl: o.apiUrl,
    capacity: o.capacity,
    baseDir: o.baseDir,
    logLevel: o.logLevel,
    gitSshRewriteHosts: o.gitSshRewriteHosts,
    gitHostRewrites: o.gitHostRewrites,
    useAnthropicGitProxy: o.useAnthropicGitProxy ? o.apiUrl : undefined,
    gitProxyGlobalConfigPath: zn,
    gitProxyGlobalConfigSnapshot,
    gitProxyCredHelper,
    configureGitHookStubs,
    configureGitSigningArtifacts,
    operatorGitSnapshot,
    hookGitPrograms,
    hookGitLegacyParams,
    configureGit: o.configureGit,
    pushOutcomeOnRelease: o.pushOutcomeOnRelease,
    trustWorkspace: o.trustWorkspace,
    removeSessionState: o.removeSessionState,
    diffFindsNestedRepository: o.diffFindsNestedRepository,
    freshMachinePerSession,
    confineRepoSettings: o.confineRepoSettings,
    serverAutoModeLists: o.serverAutoModeLists,
  };
  let Pe = {
    runnerId: Ae,
    activeSessions: 0,
    sessionsStarted: new Map([[UNKNOWN, 0]]),
    sessionsCompleted: new Map([[UNKNOWN, 0]]),
    sessionsFailed: new Map([[UNKNOWN, 0]]),
    sessionsInterrupted: new Map([[UNKNOWN, 0]]),
    sessionClientPlatform: new Map(),
    lastPollAt: 0,
    version: {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    clientLabel,
    capacity: o.capacity,
    claimVisibility: new Map(),
    lockedAccountEmail: null,
    initializingSessions: 0,
    sessionInitErrors: 0,
    sessionInitDurations: createHistogram(),
    sessionStartHookErrors: 0,
    pollErrors: emptyErrorCategoryCounts(),
    sessionIdle: new Map(),
  };
  br.current = Pe;
  let clockSkewMonitor = startClockSkewMonitor({
    clock: systemClock,
    onStatus: v,
  });
  let ft =
    o.healthPort > 0
      ? startRunnerTokenRefresher({
          baseUrl: o.apiUrl,
          getRunnerToken: () => Cn.runnerToken,
          renewRunnerToken: () =>
            notAvailableInThisBuild({
              tokenState: Cn,
              refreshToken: (P) => defaultEnvironment.refreshToken(P),
              adopt: Fr,
            }),
          renewSessionTokens: () => clockSkewMonitor?.renewSessionTokens() ?? Promise.resolve(),
          isThawing: () => false,
          getRetireAtMs: () => runnerRetireAtMs(),
          isStopping: () => an !== "running" || !or,
          isHeldOff: () => clockSkewMonitor?.isHeldOff() ?? false,
          onGranted: (P) => clockSkewMonitor?.onGranted(P),
          clock: systemClock,
          onStatus: v,
          onDebug: y,
        })
      : undefined;
  let he = o.healthPort > 0 ? startHealthServer(o.healthPort, Pe, v, ft, undefined) : undefined;
  let De = await captureHostConfigSnapshot(v, {
    storage:
      o.hostConfigSnapshot === "disk"
        ? {
            mode: "disk",
            baseDir: o.baseDir,
          }
        : {
            mode: "memory",
          },
  });
  let governedGitConfigSeed = await snapshotOperatorGitConfig(y);
  try {
    await runRunnerLoop(
      {
        apiClient,
        runnerId: Ae,
        tokenState: Cn,
        config,
        execPath: execPath_2,
        execArgs,
        startedFromWorkOrder: isPoolSpawnJwt(l),
        onDebug: y,
        onStatus: v,
        flushLogSink: T,
        healthState: Pe,
        hostConfig: De,
        governedGitConfigSeed,
        debugTokenDir: o.debugTokenDir,
        startCommandPhases,
        moveWatch: clockSkewMonitor,
        ...false,
        deferShutdown: {
          signal: abortController_2.signal,
          maxMs: A,
          requestDrain: (P) => {
            if (an !== "draining") An(P, "loop");
          },
          onClosed: () => {
            or = false;
          },
        },
      },
      abortController.signal,
    );
  } finally {
    jwtExpiry.cancelAll();
    he?.close();
    clockSkewMonitor?.stop();
    if (De?.snapshot?.storage.mode === "disk") {
      let snapshotDir = De.snapshot.storage.snapshotDir;
      await withBoundedTimeout(
        rm(snapshotDir, {
          recursive: true,
          force: true,
        }),
        1e4,
        `[runner:exit] remove host config snapshot ${snapshotDir}`,
      ).catch(() => {});
    }
    if (Ve) await withBoundedTimeout(Ve.close(), 2000, "[runner:exit] egress proxy close").catch(() => {});
    process.removeListener("SIGTERM", Bt);
    process.removeListener("SIGINT", kt);
    await T();
  }
}
//@ chunk-hm0ce8vc.js:288822-288906 placement
function isAuthFailure(error) {
  return error instanceof Error && "isAuthFailure" in error && error.isAuthFailure === true;
}
//@ chunk-hm0ce8vc.js:288906-289263 placement
/**
 * 校验 --lock-to-account：必须是组织成员的 user_<id> 或邮箱。
 */
function validateLockToAccount(e) {
  if (!e.includes("lock_to_account_id")) return "";
  let n = "lock_to_account_id is the value of --lock-to-account / SELF_HOSTED_RUNNER_LOCK_TO_ACCOUNT";
  if (e.includes("is not a member") || e.includes("must be a user_"))
    return ` (${n}; it must be the user_<id> or email address of a member of the organization that owns this environment)`;
  return ` (${n})`;
}
//@ chunk-hm0ce8vc.js:289263-320208 placement
/**
 * runner 主循环：轮询/兑现工单、跑会话、处理 401/epoch 失配、排空与重启（约 31 KB）。
 */
async function runRunnerLoop(e, signal) {
  let {
    apiClient,
    tokenState,
    config,
    execPath,
    execArgs,
    startedFromWorkOrder,
    onDebug,
    onStatus,
    healthState,
  } = e;
  let runnerId = e.runnerId;
  let y = e.retireAtMsOverride ?? runnerRetireAtMs();
  let v = startedFromWorkOrder
    ? `Draining and exiting. ${WORK_ORDER_SINGLE_USE_TEXT}`
    : "Draining and exiting for clean restart.";
  let w = startedFromWorkOrder ? WORK_ORDER_SINGLE_USE_TEXT : "Orchestrator will restart.";
  let E = new Map();
  let A = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS") || SIGKILL_TIMEOUT_DEFAULT_MS;
  let G = envPositiveMs("SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS") || POST_SESSION_HOOK_TIMEOUT_MS;
  let checkoutHookTimeoutMs = getCheckoutHookTimeoutMs();
  let drainWaitMs = getDrainWaitMs();
  let D = drainMarkerFile();
  let oe = false;
  let ge = false;
  let readDrainMarkerOverride = e.readDrainMarkerOverride ?? readRegularFileSafe;
  let drainMarkerReadTimeoutMs = e.drainMarkerReadTimeoutMs ?? DRAIN_MARKER_READ_TIMEOUT_MS;
  let resolved = Promise.resolve(undefined);
  let Ye = false;
  let He = () => {
    if (Ye || D === undefined) return;
    Ye = true;
    resolved = withBoundedTimeout(readDrainMarkerOverride(D), drainMarkerReadTimeoutMs, "drain-marker read")
      .then(
        (se) => {
          if (se.present)
            onStatus(
              `[runner] drain: host-drain marker ${D} present` +
                (se.unreadable !== undefined
                  ? ` but unreadable (${se.unreadable}) \u2014 reporting a host drain with no deadline`
                  : se.deadlineMs !== undefined
                    ? ` (host deadline ${new Date(se.deadlineMs).toISOString()})`
                    : " (no deadline on its first line)"),
            );
          return se;
        },
        (error) => {
          onStatus(
            `[runner] drain: host-drain marker ${D} could not be read (${errorMessage(error)}) \u2014 reporting a plain shutdown signal`,
          );
          return;
        },
      )
      .catch(() => {
        return;
      });
  };
  if (signal.aborted) He();
  else
    signal.addEventListener("abort", He, {
      once: true,
    });
  let ae;
  let fe = new Set();
  let $e = new Map();
  let Ve = new Set();
  let Be = 0;
  let Fe = 0;
  let ve;
  let Ae;
  let Ht = new Set();
  let canonicalLocks = new Map();
  let spawnedSessionIds = new Set();
  let Sn = 0;
  let now = Date.now();
  let Gn = false;
  let kn = true;
  let Er = 0;
  let now_2 = Date.now();
  let startCommandPhases = e.startCommandPhases;
  let takeStartCommandPhases = () => {
    let se = startCommandPhases;
    startCommandPhases = undefined;
    return se;
  };
  let Tn = false;
  let On = null;
  let dn = envPositiveMs("SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS");
  let An = envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS");
  let Bt = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_IDLE_MS");
  let kt = holdIdleFile();
  let maxHoldMs = getMaxHoldMs();
  let leftoverHoldLookOverride = e.leftoverHoldLookOverride ?? checkPathNotOnNetworkLocation;
  let leftoverHoldRecheckMsOverride = e.leftoverHoldRecheckMsOverride ?? LEFTOVER_HOLD_LOOK_TIMEOUT_MS;
  let leftoverHoldLookTimeoutMsOverride = e.leftoverHoldLookTimeoutMsOverride ?? RETIRE_RELEASE_RETRY_MS;
  let startupTimeoutMs = getStartupTimeoutMs();
  let retireReleaseRetryMsOverride = e.retireReleaseRetryMsOverride ?? ENV_SECRET_READ_TIMEOUT_MS_2;
  let retireDeferredGraceMsOverride = e.retireDeferredGraceMsOverride ?? DEFAULT_POST_SESSION_ALLOWANCE_MS;
  let Pt = false;
  let Wt;
  let $n;
  let deferShutdown = e.deferShutdown;
  let Kt = deferShutdown !== undefined && deferShutdown.maxMs > 0;
  let Mn = deferShutdown?.ceilingGraceMsOverride ?? Math.max(drainWaitMs, retireDeferredGraceMsOverride);
  let ir =
    deferShutdown?.ceilingGraceMsOverride !== undefined
      ? Math.max(10, Math.floor(deferShutdown.ceilingGraceMsOverride / 10))
      : 1000;
  let ceilingGraceMsOverride = deferShutdown?.ceilingGraceMsOverride ?? SIGKILL_GRACE_BASE_MS;
  let de;
  let Yt;
  let qn = false;
  let q = () => count([...E.entries()], ([se, ke]) => !ke.controller.signal.aborted && !ft.has(se));
  let Pe = () =>
    count([...E.entries()], ([se, ke]) => !ke.controller.signal.aborted && ft.has(se) && !De.has(se));
  let En = () =>
    $n === "shutdown"
      ? "[runner:exit] shutdown requested and every attached session has been released \u2014 exiting."
      : "[runner:exit] retire time passed and no active sessions \u2014 exiting before the host kills this runner.";
  let ft = new Set();
  let he = new Map();
  let De = new Map();
  let abortController = new AbortController();
  let P = new Set();
  let Z = new Map();
  let re = new Set();
  let be = undefined;
  let ee;
  let Re = () => {
    let size = E.size;
    for (let key of De.keys()) if (!E.has(key)) size++;
    for (let ke of P) if (!E.has(ke) && !De.has(ke)) size++;
    return size;
  };
  let Ue = new Set();
  let ht = 10;
  let wn = e.sseHintsEnabledOverride ?? isEnvTruthy(process.env.CCR_SHR_SSE_HINTS);
  let et = new PollWaker();
  let Ct = e.moveWatch?.moved.subscribe(() => et.wake("LOCAL"));
  let openWorkHintsStream = e.openWorkHintsStream ?? streamWorkHints;
  let Or;
  (() => {
    if (wn) {
      onDebug("[runner:hints] CCR_SHR_SSE_HINTS enabled \u2014 opening stream");
      Or = openWorkHintsStream({
        baseUrl: config.apiUrl,
        runnerId,
        tokenState,
        onWake: () => et.wake("SSE"),
        onDebug,
        signal,
      });
    }
  })();
  let Gr = false;
  let pr = false;
  let Bn = () => {
    Wt = undefined;
    let se = y - Date.now();
    if (se > 0) {
      Wt = setTimeout(Bn, Math.min(se, 2147483647));
      return;
    }
    Pt = true;
    $n = "retire";
    let size = P.size;
    P.clear();
    logFeatureOk("self_hosted_retire");
    onStatus(
      `[runner:retire] retire time reached \u2014 releasing ${E.size} active session(s), refusing new work; exiting once the slots are empty`,
    );
    if (size > 0)
      onStatus(
        `[runner:retire] ${size} declined session(s) held for re-spawn dropped at the retire deadline \u2014 requeued at exit instead`,
      );
    for (let jt of E.values()) jt.releaseForRetire();
    et.wake("LOCAL");
  };
  let un = () => {
    if (!Kt || deferShutdown === undefined) return;
    He();
    let se = typeof deferShutdown.signal.reason === "number" ? deferShutdown.signal.reason : Date.now();
    if (de === undefined) {
      let ke = se + deferShutdown.maxMs - Date.now();
      de = setTimeout(We, Math.min(Math.max(0, ke), 2147483647));
    }
    logFeatureOk("self_hosted_defer_shutdown");
    if (Pt) {
      onStatus(
        "[runner:shutdown] shutdown requested while already retiring \u2014 sessions are already being released",
      );
      return;
    }
    Pt = true;
    $n = "shutdown";
    onStatus(
      `[runner:shutdown] shutdown requested \u2014 deferring drain: ${E.size} active session(s), refusing new work; ` +
        (Bt > 0
          ? `each is released once its user has been idle ${formatDuration(Bt, {
              hideTrailingZeros: true,
            })} (--release-idle-session-min) or when it ends`
          : "none is released early (--release-idle-session-min is not set)") +
        `; ${formatDuration(deferShutdown.maxMs, {
          hideTrailingZeros: true,
        })} after the signal every session still attached is released at once; exiting as soon as the slots are empty`,
    );
    et.wake("LOCAL");
  };
  let We = () => {
    de = undefined;
    if (deferShutdown === undefined || signal.aborted) return;
    qn = true;
    let size = P.size;
    if (size > 0) {
      P.clear();
      et.wake("LOCAL");
    }
    let ke = q();
    let jt = () => {
      if (size > 0)
        onStatus(
          `[runner:shutdown] ${size} declined session(s) held for re-spawn dropped at the ceiling \u2014 requeued at exit instead`,
        );
    };
    if (ke === 0 && Pe() === 0) {
      jt();
      return;
    }
    logFeatureOk("self_hosted_defer_ceiling");
    onStatus(
      `[runner:shutdown] defer ceiling reached (${formatDuration(deferShutdown.maxMs, {
        hideTrailingZeros: true,
      })}) \u2014 ` +
        (ke > 0
          ? `releasing the remaining ${ke} session(s) now`
          : `waiting on ${Pe()} in-flight release(s)`) +
        `; any still attached after ${formatDuration(Mn + ceilingGraceMsOverride, {
          hideTrailingZeros: true,
        })} will be drained`,
    );
    jt();
    for (let Jt of E.values()) Jt.releaseForShutdown();
    let cn = ceilingGraceMsOverride;
    let Pn = () => {
      Yt = undefined;
      if (signal.aborted) return;
      let Jt = q();
      let In = Pe();
      if (Jt === 0 && In === 0) return;
      if (cn > 0) {
        cn -= ir;
        Yt = setTimeout(Pn, ir);
        return;
      }
      onStatus(
        `[runner:shutdown] ${Jt + In} session(s) still attached after the post-ceiling grace \u2014 falling back to a drain`,
      );
      deferShutdown.requestDrain("post-ceiling grace expired with sessions still attached");
    };
    Yt = setTimeout(Pn, Mn);
  };
  if (y > 0) {
    let se = y - Date.now();
    onStatus(
      se > 0
        ? `[runner:retire] retire time set for ${new Date(y).toISOString()} (in ${formatDuration(se)}) \u2014 sessions will be released and the runner will exit then`
        : `[runner:retire] retire time ${new Date(y).toISOString()} is already in the past \u2014 refusing work and exiting`,
    );
    Bn();
  }
  if (Kt && deferShutdown !== undefined)
    if (deferShutdown.signal.aborted) un();
    else
      deferShutdown.signal.addEventListener("abort", un, {
        once: true,
      });
  try {
    while (!signal.aborted) {
      if (Pt && Re() === 0) {
        onStatus(En());
        return;
      }
      if (An === 0 && Tn && Re() === 0) {
        onStatus(`[runner:exit] account workload drained \u2014 exiting (grace=0, no re-poll). ${w}`);
        return;
      }
      let se = Pt ? 0 : Math.max(0, config.capacity - Re());
      let ke = et.consume();
      if (ke === "SSE") {
        await sleep(Math.floor(Math.random() * MAX_SERVER_MESSAGE_CHARS), signal);
        if (signal.aborted) break;
      }
      let jt = now;
      let cn;
      try {
        let R = await apiClient.pollWork(
          tokenState.runnerToken,
          runnerId,
          se,
          signal,
          wn ? POLL_WAKE_SOURCES[ke] : undefined,
        );
        cn = R.assignment_ids;
        $e.clear();
        for (let pe of R.session_assignments ?? []) {
          if (!pe || typeof pe.session_id !== "string" || !pe.session_id) continue;
          if (
            typeof pe.client_platform === "string" &&
            pe.client_platform &&
            METRIC_NAME_RE.test(pe.client_platform)
          )
            $e.set(pe.session_id, pe.client_platform);
          else if (typeof pe.client_platform === "string" && pe.client_platform && !Ve.has(pe.session_id)) {
            if (Ve.size > 256) Ve.clear();
            Ve.add(pe.session_id);
            onDebug(
              `[runner:session] assignment client_platform rejected by the charset gate (label falls back to "unknown"): "${escapeMetricValue(pe.client_platform)}" (len=${pe.client_platform.length}, session=${escapeMetricValue(pe.session_id)})`,
            );
          }
        }
        ve = R.lease_expires_at;
        Ae = R.suggested_poll_interval;
        now = Date.now();
        Be = 0;
        Fe = 0;
        if (kn || Gn) {
          logFeatureOk("self_hosted_poll");
          kn = false;
          Gn = false;
        }
        if (healthState) {
          healthState.lastPollAt = now;
          healthState.activeSessions = E.size;
        }
      } catch (error) {
        if (signal.aborted) break;
        let pe = classifyRunnerError(error);
        if (healthState) healthState.pollErrors[pe]++;
        let It = error instanceof Error ? error.message : String(error);
        if (isAuthFailure(error)) {
          logFeatureBad("self_hosted_poll", "self_hosted_poll_auth_failed");
          onStatus(`[runner:fatal] poll auth failed \u2014 token expired or revoked. ${v}`);
          ge = true;
          break;
        }
        if (isNotFoundError(error)) {
          Be++;
          if (Be >= 3) {
            logFeatureBad("self_hosted_poll", "self_hosted_poll_runner_not_found");
            onStatus(
              `[runner:fatal] poll returned 404 ${Be}\xD7 \u2014 runner record gone server-side. ${v}`,
            );
            ge = true;
            break;
          }
          let min = Math.min(MAX_HEALTH_PROBE_BACKOFF_MS, HEALTH_PROBE_INTERVAL_MS * 2 ** (Be - 1));
          let floored = Math.floor(Math.random() * min);
          onStatus(
            `Poll failed: ${It} \u2014 confirming 404 (${Be}/3), retrying in ${(floored / 1000).toFixed(1)}s`,
          );
          await sleep(e.pollIntervalOverrideMs ?? floored, signal);
          continue;
        }
        Be = 0;
        if (kn || !Gn) {
          logFeatureSad("self_hosted_poll", "self_hosted_poll_failed");
          kn = false;
          Gn = true;
        }
        let Ie;
        if (pe === "timeout" || pe === "transport") {
          Fe++;
          Ie = backoffDelayMs(Fe, ve, Ae);
        } else if (pe === "5xx")
          Ie = clampToLeaseExpiry(DEFAULT_POLL_INTERVAL_MS, ve, LEASE_5XX_RETRY_DELAY_MS, Ae);
        else Ie = DEFAULT_POLL_INTERVAL_MS;
        onStatus(`Poll failed: ${It} \u2014 retrying in ${(Ie / 1000).toFixed(1)}s`);
        await sleep(e.pollIntervalOverrideMs ?? Ie, signal);
        continue;
      }
      let filtered = cn.filter((R) => !fe.has(R));
      if (filtered.length === 0 && Re() === 0) {
        On ??= Date.now();
        let R = Date.now() - On;
        if (Tn) {
          if (R >= An) {
            onStatus(
              Pt
                ? En()
                : An > 0
                  ? `[runner:exit] account workload drained ${Math.round(R / 1000)}s ago (grace ${Math.round(An / 1000)}s) \u2014 exiting for fresh disk. ${w}`
                  : `[runner:exit] account workload drained \u2014 exiting for fresh disk. ${w}`,
            );
            return;
          }
        } else if (dn > 0 && R >= dn) {
          onStatus(
            `[runner:exit] idle ${Math.round(R / 60000)}min with no work \u2014 exiting for autoscaler scale-down`,
          );
          return;
        }
      } else On = null;
      let In = An === 0 && Tn && Re() === 0;
      if (filtered.length > 0) Tn = true;
      let nn = new Set(cn);
      for (let [R, pe] of E)
        if (!nn.has(R)) {
          onStatus(
            `[runner:session] ${R} deassigned by server (deleted/archived/requeued) \u2014 aborting child`,
          );
          pe.controller.abort(ft.has(R) ? "idle-release" : "deassign");
        }
      for (let R of ft) if (!nn.has(R)) ft.delete(R);
      for (let key of he.keys()) if (!nn.has(key)) he.delete(key);
      for (let R of P) if (!nn.has(R) || fe.has(R)) P.delete(R);
      for (let R of re) if (!nn.has(R)) re.delete(R);
      for (let key of Z.keys()) if (!E.has(key) && !P.has(key) && !De.has(key) && !re.has(key)) Z.delete(key);
      for (let R of filtered) {
        if (E.has(R)) {
          onDebug(`[runner:main] Ignoring duplicate assignment for ${R}`);
          continue;
        }
        if (fe.has(R)) {
          P.delete(R);
          onDebug(`[runner:main] Ignoring stuck session ${R} \u2014 already failed, not re-spawning`);
          continue;
        }
        if (Ht.has(R)) {
          onDebug(`[runner:main] Ignoring session ${R} \u2014 failure report in-flight`);
          continue;
        }
        if (ft.has(R) || De.has(R)) {
          onDebug(
            `[runner:main] Ignoring released session ${R} \u2014 awaiting server deassign (or its in-flight release to settle)`,
          );
          continue;
        }
        let pe = Pt && $n === "shutdown" && !qn;
        if (Pt && !pe) {
          let N =
            $n === "shutdown"
              ? `[runner:shutdown] not starting session ${R} \u2014 shutdown requested and the defer ceiling has passed; it will be requeued when this runner exits`
              : `[runner:retire] not starting session ${R} \u2014 retire time has passed; it will be requeued when this runner exits`;
          if (Ue.has(R)) onDebug(N);
          else {
            Ue.add(R);
            onStatus(N);
          }
          P.delete(R);
          continue;
        }
        if (pe)
          onStatus(
            P.has(R)
              ? `[runner:shutdown] ${R} re-spawning after its declined release to serve the pending user event; it is released again like the others (its idle clock, or the ceiling)`
              : `[runner:shutdown] ${R} was assigned after the shutdown signal \u2014 serving it; it is released like the others (its idle clock, or the ceiling)`,
          );
        let It = P.delete(R);
        if (!re.delete(R) && !It) Z.delete(R);
        Er++;
        onStatus(`Picked up session ${R} (${E.size + 1}/${config.capacity} active)`);
        let abortController_2 = new AbortController();
        let replaced = R.replace(/^cse_/, "session_");
        let Xe = $e.get(R) ?? UNKNOWN;
        healthState?.sessionIdle.set(replaced, null);
        healthState?.sessionClientPlatform.set(replaced, Xe);
        let now = Date.now();
        healthState?.claimVisibility?.set(replaced, {
          pickedUpAt: now,
        });
        let standbyIdleMs = E.size === 0 ? now - now_2 : undefined;
        if (healthState) {
          for (let N of [
            healthState.sessionsStarted,
            healthState.sessionsCompleted,
            healthState.sessionsFailed,
            healthState.sessionsInterrupted,
          ])
            if (!N.has(Xe)) N.set(Xe, 0);
        }
        let Je;
        let fn = false;
        let Wn = Z.get(R);
        let Dn;
        let Zt = false;
        let hn = false;
        let Ln = false;
        let Dt = false;
        let Cr = (N) => {
          Dt = N;
          let x = E.get(R);
          if (x !== undefined) x.turnInFlight = N;
          ae?.();
        };
        let pt = false;
        let Lt;
        let Ke = false;
        let Ut = "retire";
        let V = () =>
          Ut === "shutdown"
            ? "defer ceiling passed"
            : Ut === "max-age"
              ? "max session age reached"
              : "retire time passed";
        let ue = () =>
          Ut === "shutdown"
            ? "while shutting down"
            : Ut === "max-age"
              ? "while at max session age"
              : "while retiring";
        let U = () =>
          Ut === "shutdown" ? "shutdown grace" : Ut === "max-age" ? "max-session-age grace" : "retire grace";
        let nt = 0;
        let Tt = 0;
        let xn;
        let Kn = () => {
          if (xn !== undefined) {
            clearTimeout(xn);
            xn = undefined;
          }
        };
        let wr = false;
        let Jn = () => Ln || abortController_2.signal.aborted || wr;
        let es = false;
        let ts = () => {};
        let yo = (N) => {};
        let Hr;
        let vs = [1800000, 7200000, 28800000];
        let Br = () => {
          if (Hr !== undefined) {
            clearTimeout(Hr);
            Hr = undefined;
          }
        };
        let Nr = (N, x) => {
          let liveTasks = N?.liveTasks ?? 0;
          let joined = (N?.liveTaskIds ?? []).slice(0, 5).join(",");
          let Yn =
            N?.wakeupInMs !== undefined ? `wakeup pending in ${formatDuration(N.wakeupInMs)}` : undefined;
          let Zn = N?.bgResultAwaitingFollowup
            ? "finished background task awaiting the follow-up turn"
            : undefined;
          let filtered = [
            liveTasks > 0
              ? `${liveTasks} background task(s) live [${joined}${liveTasks > 5 ? ",\u2026" : ""}]`
              : undefined,
            Yn,
            Zn,
          ].filter(Boolean);
          let ne = filtered.length > 0 ? filtered.join(" / ") : "planned resumption";
          let mt = x > 0 ? " still" : "";
          onStatus(`[runner:session] ${R} turn ended with ${ne} \u2014 idle clock${mt} deferred`);
          if (x < vs.length) Hr = setTimeout(Nr, vs[x], N, x + 1);
        };
        let pn = (N, x) => {
          if (N === "startup" && x?.childAlive === true && Lt !== "startup") {
            onDebug(
              `[runner:session] ${R} ignoring child output as a startup-clock restart: the startup phase is over`,
            );
            return;
          }
          let xe = N === "startup" && x?.childSilent === true;
          if (xe && ft.has(R)) {
            onDebug(
              `[runner:session] ${R} no child output for ${formatDuration(startupTimeoutMs)}, but a release is already in flight: leaving it to that one`,
            );
            return;
          }
          if (Je !== undefined) {
            clearTimeout(Je);
            Je = undefined;
          }
          Dn = undefined;
          if (!Ln && healthState)
            if (N === "turn-end" || (N === "awaiting-action" && !pt)) {
              if (healthState.sessionIdle.get(replaced) === null)
                healthState.sessionIdle.set(replaced, Date.now());
            } else healthState.sessionIdle.set(replaced, null);
          if (N === "init-observed") {
            if (Ke && Lt !== undefined) pn(Lt);
            return;
          }
          if (N === "activity") {
            if (Lt !== "startup") {
              Wn = undefined;
              Z.delete(R);
              Zt = false;
              hn = false;
            }
            Cr(true);
            pt = false;
            Lt = undefined;
            nt = 0;
            Br();
            Kn();
            he.delete(R);
            return;
          }
          if (N === "turn-end-deferred") {
            Cr(false);
            pt = true;
            Lt = undefined;
            Br();
            ts();
            if (Jn()) return;
            if (Bt > 0) Nr(x, 0);
            if (Ke) ns();
            return;
          }
          if (N === "awaiting-action" && pt) {
            Lt = undefined;
            return;
          }
          Br();
          Kn();
          Cr(false);
          pt = false;
          Lt = N;
          ts();
          if (Jn()) return;
          let xt = xe
            ? 0
            : Ke
              ? nt === 0
                ? 0
                : retireReleaseRetryMsOverride
              : N === "startup"
                ? startupTimeoutMs
                : Bt;
          let Yn = Ke ? retireReleaseRetryMsOverride : xt;
          let Zn = () =>
            Ke
              ? nt === 0
                ? "now"
                : `in ${formatDuration(retireReleaseRetryMsOverride)}`
              : `in ${formatDuration(Yn)}`;
          let yn = Ke
            ? V()
            : N === "startup"
              ? `no child output for ${formatDuration(startupTimeoutMs)}`
              : N === "awaiting-action"
                ? `awaiting user action ${formatDuration(xt)}`
                : `user idle ${formatDuration(xt)}`;
          if (!Ke && !xe && xt <= 0) return;
          if (Jn()) return;
          if (
            N === "awaiting-action" &&
            x !== undefined &&
            (x.liveTasks > 0 || x.wakeupInMs !== undefined || x.bgResultAwaitingFollowup === true)
          ) {
            let joined = x.liveTaskIds.slice(0, 5).join(",");
            let filtered = [
              x.liveTasks > 0
                ? `${x.liveTasks} background task(s) live [${joined}${x.liveTasks > 5 ? ",\u2026" : ""}]`
                : undefined,
              x.wakeupInMs !== undefined ? `wakeup pending in ${formatDuration(x.wakeupInMs)}` : undefined,
              x.bgResultAwaitingFollowup === true
                ? "finished background task awaiting the follow-up turn"
                : undefined,
            ].filter(Boolean);
            onStatus(
              `[runner:session] ${R} awaiting user action overrides deferral (${filtered.join(" / ")}) \u2014 idle clock armed`,
            );
          }
          if (!Ke && !xe) {
            let mt = N === "startup" && x?.childAlive === true;
            let rn = `[runner:session] ${R} idle clock armed (${mt ? "startup, restarted by child output" : N}): releases in ${formatDuration(
              xt,
              {
                hideTrailingZeros: true,
              },
            )} at ${new Date(Date.now() + xt).toISOString()} unless new activity arrives`;
            if (!mt) onStatus(rn);
            else if (fn) onDebug(rn);
            else {
              fn = true;
              onStatus(`${rn} (later restarts are logged at debug)`);
            }
          }
          if (Ke && nt === 0 && E.get(R)?.postTurnSettling === true) {
            onStatus(
              `[runner:session] ${R} ${V()} \u2014 release held until the finished turn has been reported to the server (at most SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS, default ${POST_TURN_SETTLE_MS / 1000}s)`,
            );
            return;
          }
          if (!Ke && N !== "startup") {
            Wn ??= Date.now();
            Z.set(R, Wn);
          }
          let ne = (mt = false) => {
            Je = undefined;
            if (Jn()) return;
            if (ft.has(R)) return;
            if (Dt) {
              onStatus(
                `[runner:session] ${R} idle timer fired mid-turn \u2014 skipping release (stdout-tee likely broken)`,
              );
              return;
            }
            if (!mt && kt !== undefined && maxHoldMs > 0 && !Ke && N !== "startup" && Wn !== undefined) {
              let _t = kt;
              let bt = Wn + maxHoldMs;
              if (Date.now() < bt) {
                let en = {};
                Dn = en;
                withBoundedTimeout(
                  leftoverHoldLookOverride(_t, Date.now()),
                  leftoverHoldLookTimeoutMsOverride,
                  "hold-idle-file look",
                )
                  .catch((error) =>
                    error instanceof BoundedTimeoutError
                      ? "timed out"
                      : {
                          failed: error instanceof Error ? error.message : String(error),
                        },
                  )
                  .then((Me) => {
                    if (Dn !== en || Je !== undefined || Jn() || Dt || pt || Ke) return;
                    Dn = undefined;
                    let max = Math.max(0, Math.min(leftoverHoldRecheckMsOverride, bt - Date.now()));
                    if (Me === true) {
                      hn = false;
                      if (!Zt) {
                        Zt = true;
                        onStatus(
                          `[runner:session] ${R} idle release held: ${_t} says a process the session left running still lives \u2014 looking again every ${formatDuration(
                            leftoverHoldRecheckMsOverride,
                            {
                              hideTrailingZeros: true,
                            },
                          )}, until ${new Date(bt).toISOString()} at most (--max-hold-min)`,
                        );
                      }
                      Je = setTimeout(ne, max, false);
                      return;
                    }
                    let er =
                      Me === "timed out"
                        ? `looking at ${_t} took longer than ${formatDuration(
                            leftoverHoldLookTimeoutMsOverride,
                            {
                              hideTrailingZeros: true,
                            },
                          )}`
                        : typeof Me === "object"
                          ? `the look at ${_t} failed (${Me.failed})`
                          : `${_t} is gone, not a regular file, or has not changed in ${formatDuration(
                              HOLD_IDLE_MTIME_FRESH_MS,
                              {
                                hideTrailingZeros: true,
                              },
                            )}`;
                    if (Zt && !hn) {
                      hn = true;
                      onStatus(
                        `[runner:session] ${R} idle release still held: ${er} \u2014 looking once more before releasing`,
                      );
                      Je = setTimeout(ne, max, false);
                      return;
                    }
                    if (Zt) onStatus(`[runner:session] ${R} idle release no longer held: ${er}`);
                    else if (Me !== false)
                      onStatus(`[runner:session] ${R} idle release not held: ${er} \u2014 releasing`);
                    Zt = false;
                    hn = false;
                    ne(true);
                  })
                  .catch((error) => {
                    onStatus(
                      `[runner:session] ${R} idle release after a look at ${_t} failed: ${error instanceof Error ? error.message : String(error)}; the release may not have gone out, and the next turn end or a forced release tries again`,
                    );
                  });
                return;
              }
              if (Zt) {
                Zt = false;
                onStatus(
                  `[runner:session] ${R} idle release no longer held: ${formatDuration(maxHoldMs, {
                    hideTrailingZeros: true,
                  })} have passed since the session went idle (--max-hold-min)`,
                );
              }
            }
            if (Ke) nt++;
            onStatus(`[runner:session] ${R} ${yn} \u2014 releasing`);
            ft.add(R);
            if (N !== "awaiting-action") {
              let liveBgTasks = E.get(R)?.liveBgTasks ?? 0;
              let en = (E.get(R)?.task ?? Promise.resolve())
                .then(() =>
                  retryReleaseSession({
                    release: () => apiClient.releaseSession(tokenState.runnerToken, R),
                    sessionId: R,
                    onStatus,
                    stop: abortController.signal,
                  }),
                )
                .then(({ released }) => {
                  De.delete(R);
                  ft.delete(R);
                  he.delete(R);
                  Z.delete(R);
                  if (Pt) et.wake("LOCAL");
                  if (released) {
                    onStatus(
                      `[runner:session] ${R} released after post-session hook \u2014 parked server-side`,
                    );
                    if (xe) logFeatureSad("self_hosted_release_session", "released_true_child_silent");
                    else if (Dt || pt || liveBgTasks > 0)
                      logFeatureSad("self_hosted_release_session", "released_true_mid_work");
                    else logFeatureOk("self_hosted_release_session");
                    return;
                  }
                  if ($n === "shutdown") {
                    let er = !qn;
                    if (er) P.add(R);
                    onStatus(
                      er
                        ? `[runner:session] ${R} released=false after post-session hook (pending user event) while shutting down \u2014 the next poll re-spawns it to serve that event (its --release-idle-session-min window, if set, starts over; otherwise it stays until the ceiling)`
                        : `[runner:session] ${R} released=false after post-session hook (pending user event) after the defer ceiling \u2014 not re-spawned; it is requeued, snapshot complete, when this runner exits`,
                    );
                    logFeatureSad("self_hosted_release_session", "released_false_shutting_down");
                    return;
                  }
                  let gr = Ke && Ut === "max-age";
                  onStatus(
                    Pt
                      ? `[runner:session] ${R} released=false after post-session hook (pending user event) while retiring \u2014 not re-spawned; it is requeued, snapshot complete, when this runner exits`
                      : `[runner:session] ${R} released=false after post-session hook (pending user event)${gr ? " at max session age" : ""} \u2014 respawns on the next poll, or is requeued by this runner's exit if it is draining (grace=0) or retiring`,
                  );
                  logFeatureSad(
                    "self_hosted_release_session",
                    Pt
                      ? "released_false_retiring"
                      : gr
                        ? "released_false_max_age"
                        : xe
                          ? "released_false_child_silent"
                          : "released_false",
                  );
                })
                .catch((error) => {
                  De.delete(R);
                  ft.delete(R);
                  re.add(R);
                  if ($n === "shutdown" && !qn) P.add(R);
                  if (Pt) et.wake("LOCAL");
                  let gr = error instanceof Error ? error.message : String(error);
                  onStatus(
                    `[runner:session] ${R} ordered release failed after the post-session hook: ${gr} \u2014 keeping session; respawns on the next poll, or is requeued by this runner's exit if it is draining (grace=0) or retiring`,
                  );
                  logFeatureBad("self_hosted_release_session", "rpc_failed");
                });
              De.set(R, en);
              abortController_2.abort("idle-release");
              return;
            }
            let rn = (_t, bt) => {
              let en = Jn();
              let Me = !en && !Dt && !pt;
              onStatus(
                `[runner:session] ${R} ${_t} \u2014 ${en ? "not retried, the session is ending on this runner" : `keeping session${Me ? `, ${bt}` : ""}`}`,
              );
              if (Me) pn(N);
            };
            apiClient
              .releaseSession(tokenState.runnerToken, R)
              .then(({ released }) => {
                Tt = 0;
                if (released) {
                  if (Ln || abortController_2.signal.aborted) return;
                  he.delete(R);
                  onStatus(`[runner:session] ${R} released \u2014 aborting child`);
                  let liveBgTasks = E.get(R)?.liveBgTasks ?? 0;
                  abortController_2.abort("idle-release");
                  if (Dt || pt || liveBgTasks > 0)
                    logFeatureSad("self_hosted_release_session", "released_true_mid_work");
                  else logFeatureOk("self_hosted_release_session");
                  return;
                }
                if (Ln || abortController_2.signal.aborted) return;
                ft.delete(R);
                if (Ke) {
                  let en =
                    N === "awaiting-action" ? "queued event behind the parked prompt" : "pending user event";
                  logFeatureSad(
                    "self_hosted_release_session",
                    Ut === "shutdown"
                      ? N === "awaiting-action"
                        ? "released_false_shutting_down_parked"
                        : "released_false_shutting_down"
                      : Ut === "max-age"
                        ? N === "awaiting-action"
                          ? "released_false_max_age_parked"
                          : "released_false_max_age"
                        : N === "awaiting-action"
                          ? "released_false_retiring_parked"
                          : "released_false_retiring",
                  );
                  rn(`release declined (${en}) ${ue()}`, `retrying ${Zn()}`);
                  return;
                }
                if (N === "awaiting-action") {
                  logFeatureSad("self_hosted_release_session", "released_false_parked");
                  rn("released=false while parked at prompt (queued event behind prompt)", "re-arming");
                  return;
                }
                let bt = (he.get(R) ?? 0) + 1;
                he.set(R, bt);
                if (bt >= 3) {
                  he.delete(R);
                  onStatus(`[runner:session] ${R} released=false ${bt}x \u2014 aborting as backstop`);
                  abortController_2.abort();
                  logFeatureBad("self_hosted_release_session", "released_false_backstop");
                  return;
                }
                onStatus(
                  `[runner:session] ${R} released=false (pending user event) \u2014 keeping session${Dt || pt ? "" : ", re-arming"}`,
                );
                logFeatureSad("self_hosted_release_session", "released_false");
                if (!Dt && !pt) pn?.(N);
              })
              .catch((error) => {
                ft.delete(R);
                Tt++;
                let bt = error instanceof Error ? error.message : String(error);
                logFeatureBad("self_hosted_release_session", "rpc_failed");
                rn(
                  `releaseSession failed: ${bt}${Tt > 1 ? ` (${Tt} failures in a row)` : ""}`,
                  `retrying ${Zn()}`,
                );
              });
          };
          Je = setTimeout(ne, xt, false);
        };
        let ns = () => {
          if (Jn() || !pt) return;
          let liveBgTasks = E.get(R)?.liveBgTasks ?? 0;
          if (liveBgTasks === 0 && E.get(R)?.bgResultPendingFollowup === true) {
            onStatus(
              `[runner:session] ${R} ${V()} while a finished background task's follow-up turn is pending \u2014 waiting for it before releasing`,
            );
            return;
          }
          if (liveBgTasks === 0) {
            onStatus(
              `[runner:session] ${R} ${V()} with only perpetual monitor task(s) / a scheduled wakeup holding the turn \u2014 releasing now`,
            );
            pt = false;
            Kn();
            pn("turn-end");
            return;
          }
          if (xn !== undefined) return;
          onStatus(
            `[runner:session] ${R} ${V()} with ${liveBgTasks} background task(s) live \u2014 allowing ${formatDuration(retireDeferredGraceMsOverride)} to finish before releasing`,
          );
          xn = setTimeout(() => {
            xn = undefined;
            if (Jn() || !pt) return;
            let liveBgTasks = E.get(R)?.liveBgTasks ?? 0;
            let xe = E.get(R)?.bgResultPendingFollowup === true;
            if (liveBgTasks === 0 && xe) {
              onStatus(
                `[runner:session] ${R} ${U()} elapsed but a finished background task's follow-up turn is pending \u2014 waiting for it before releasing`,
              );
              return;
            }
            onStatus(
              liveBgTasks === 0
                ? `[runner:session] ${R} background work finished during the ${U()}; only perpetual monitor task(s) / a scheduled wakeup still hold the turn \u2014 releasing now`
                : `[runner:session] ${R} ${liveBgTasks} background task(s) still live after the ${U()} \u2014 releasing anyway (a parked session beats a lost worker)`,
            );
            pt = false;
            pn("turn-end");
          }, retireDeferredGraceMsOverride);
        };
        let rs = (N) => {
          if (Ln || abortController_2.signal.aborted) return;
          if (wr) {
            onDebug(
              `[runner:session] ${R} ${N} release request while the child is being terminated \u2014 ignored`,
            );
            return;
          }
          if (Ke) {
            onDebug(
              `[runner:session] ${R} ${N} release request adds nothing to the standing ${Ut} request \u2014 ignored`,
            );
            return;
          }
          Ke = true;
          Ut = N;
          if (Lt === undefined) {
            if (pt && !Dt) {
              ns();
              return;
            }
            let x = Dt
              ? "mid-turn \u2014 releasing as soon as the current turn finishes"
              : "before the child reported an idle state \u2014 releasing on its first idle transition";
            onStatus(`[runner:session] ${R} ${V()} ${x}`);
            return;
          }
          onStatus(`[runner:session] ${R} ${V()} while idle \u2014 releasing now`);
          pn(Lt);
        };
        let releaseForRetire = () => rs("retire");
        let releaseForShutdown = () => rs("shutdown");
        let onMaxLifetime = () => {
          if (Ln || abortController_2.signal.aborted) return "kill";
          let N = Lt !== undefined || (pt && !Dt) ? "release" : "wait";
          logFeatureOk("self_hosted_max_lifetime", {
            decision: fromEnum(N),
          });
          rs("max-age");
          return N;
        };
        let onChildTerminating = () => {
          if (wr) return;
          wr = true;
          let N = Je !== undefined || xn !== undefined;
          if (Je !== undefined) {
            clearTimeout(Je);
            Je = undefined;
          }
          Kn();
          if (N || Ke)
            onDebug(`[runner:session] ${R} child is being terminated \u2014 release clock stood down`);
        };
        let $r = It && ee?.id === R;
        let ar = $r && ee?.onUpdateBuild === true ? be : undefined;
        ee = undefined;
        let task = (e.handleSession ?? handleSelfHostedSession)(
          R,
          {
            apiClient,
            getRunnerToken: () => tokenState.runnerToken,
            baseDir: config.baseDir,
            execPath: ar !== undefined && execPath === process.execPath ? ar : execPath,
            execArgs: ar !== undefined ? [] : execArgs,
            updatedChildBin: ar,
            restartedHere: $r,
            childUpdateBin: be,
            onChildUpdateReady: () => {
              es = true;
              ts();
            },
            capacity: config.capacity,
            healthPort: healthState?.listeningOn,
            gitSshRewriteHosts: config.gitSshRewriteHosts,
            gitHostRewrites: config.gitHostRewrites,
            useAnthropicGitProxy: config.useAnthropicGitProxy,
            gitProxyGlobalConfigPath: config.gitProxyGlobalConfigPath,
            gitProxyGlobalConfigSnapshot: config.gitProxyGlobalConfigSnapshot,
            gitProxyCredHelper: config.gitProxyCredHelper,
            configureGitHookStubs: config.configureGitHookStubs,
            configureGitSigningArtifacts: config.configureGitSigningArtifacts,
            operatorGitSnapshot: config.operatorGitSnapshot,
            hookGitPrograms: config.hookGitPrograms,
            hookGitLegacyParams: config.hookGitLegacyParams,
            hostConfig: e.hostConfig,
            governedGitConfigSeed: e.governedGitConfigSeed,
            onDebug,
            onStatus,
            onSessionActivity: pn,
            onMaxLifetime,
            onChildTerminating,
            clientPlatform: Xe,
            onChildLifecycle: healthState
              ? (N) => {
                  let x =
                    N === "spawned"
                      ? healthState.sessionsStarted
                      : N === "completed"
                        ? healthState.sessionsCompleted
                        : N === "failed"
                          ? healthState.sessionsFailed
                          : healthState.sessionsInterrupted;
                  x.set(Xe, (x.get(Xe) ?? 0) + 1);
                }
              : undefined,
            onInitPhase: healthState
              ? (N) => {
                  switch (N.kind) {
                    case "start":
                      healthState.initializingSessions++;
                      break;
                    case "end":
                      healthState.initializingSessions--;
                      observeHistogram(healthState.sessionInitDurations, N.durationSec);
                      break;
                    case "exit-before-init":
                      healthState.initializingSessions--;
                      if (N.failed) healthState.sessionInitErrors++;
                      break;
                    default:
                  }
                }
              : undefined,
            onSessionStartHookError: healthState
              ? () => {
                  healthState.sessionStartHookErrors++;
                }
              : undefined,
            standbyIdleMs,
            takeStartCommandPhases,
            getHealthzClaimVisibleMs: () => healthState?.claimVisibility?.get(replaced)?.visibleMs,
            moveWatch: e.moveWatch,
            ...false,
            onSessionTokenIssued: (N) => {
              if (healthState && healthState.lockedAccountEmail === null) {
                let sessionIdFromJwt = getSessionIdFromJwt(N);
                if (sessionIdFromJwt !== null) healthState.lockedAccountEmail = sessionIdFromJwt;
              }
            },
            canonicalLocks,
            spawnedSessionIds,
            postSessionHookTimeoutMs: G,
            checkoutHookTimeoutMs,
            pushOutcomeOnRelease: config.pushOutcomeOnRelease,
            trustWorkspace: config.trustWorkspace,
            removeSessionState: config.removeSessionState,
            diffFindsNestedRepository: config.diffFindsNestedRepository,
            freshMachinePerSession: config.freshMachinePerSession,
            confineRepoSettings: config.confineRepoSettings,
            serverAutoModeLists: config.serverAutoModeLists,
            onBgTaskLedger: (liveBgTasks) => {
              let x = E.get(R);
              if (x) x.liveBgTasks = liveBgTasks;
              ae?.();
            },
            onBgFollowupPending: (N, x) => {
              let xe = E.get(R);
              if (xe) xe.bgResultPendingFollowup = N;
              ae?.();
              if (!N && !x && Ke && pt) ns();
            },
            onPostTurnSettle: (N, x) => {
              let xe = E.get(R);
              if (xe) xe.postTurnSettling = N;
              ae?.();
              if (!N && !x) ts();
              if (!N && !x && Ke && nt === 0 && Lt !== undefined) pn(Lt);
            },
            debugTokenDir: e.debugTokenDir,
          },
          abortController_2.signal,
        )
          .then((N) => {
            let { result: x, failureReason, setupFailureKind, failureKind } = N;
            if (failureReason) onStatus(`Session ${R} finished: ${x} \u2014 reason: ${failureReason}`);
            else onStatus(`Session ${R} finished: ${x}`);
            let Zn = x === "failed" || (x === "interrupted" && !abortController_2.signal.aborted);
            if (Zn && N.failedOnUpdateBuild === true) {
              yo("build_failed");
              return;
            }
            if (Zn) {
              Ht.add(R);
              let yn = failureReason ?? "failed (no reason captured)";
              apiClient
                .reportSessionFailure(
                  tokenState.runnerToken,
                  R,
                  setupFailureKind === "SETUP_FAILURE_KIND_SOURCE_REF_NOT_FOUND"
                    ? yn
                    : rewriteContractionError(yn),
                  setupFailureKind,
                  failureKind,
                )
                .then((ne) => {
                  onStatus(
                    `[runner:session] ${R} failure reported \xB7 excluded_count=${ne.excluded_count} stuck=${ne.stuck}`,
                  );
                  if (ne.stuck) {
                    fe.add(R);
                    onStatus(`[runner:session] ${R} marked stuck \u2014 will not re-spawn on future polls`);
                  }
                  logFeatureOk("self_hosted_failure_report");
                })
                .catch((error) => {
                  let mt = error instanceof Error ? error.message : String(error);
                  onStatus(
                    `[runner:session] ${R} reportSessionFailure failed: ${mt} \u2014 marking stuck to bound respawn`,
                  );
                  fe.add(R);
                  logFeatureSad("self_hosted_failure_report", "rpc_failed");
                })
                .finally(() => {
                  Ht.delete(R);
                });
            }
          })
          .catch((error) => {
            let x = error instanceof Error ? error.message : String(error);
            onStatus(`Session ${R} handler threw: ${x}`);
          })
          .finally(() => {
            Ln = true;
            if (Je !== undefined) {
              clearTimeout(Je);
              Je = undefined;
            }
            Br();
            Kn();
            if (!De.has(R)) ft.delete(R);
            he.delete(R);
            if (!P.has(R) && !De.has(R)) Z.delete(R);
            if (healthState) {
              healthState.sessionIdle.delete(replaced);
              healthState.sessionClientPlatform.delete(replaced);
              healthState.claimVisibility?.delete(replaced);
              dropSessionMetrics(healthState, replaced);
            }
            let N = E.size >= config.capacity;
            oe =
              abortController_2.signal.aborted && abortController_2.signal.reason === "idle-release" && !Ke;
            E.delete(R);
            ae?.();
            if (healthState) healthState.activeSessions = E.size;
            if (E.size === 0) {
              now_2 = Date.now();
              if (Pt) et.wake("LOCAL");
            }
            if (wn && N) et.wake("LOCAL");
          });
        E.set(R, {
          task,
          controller: abortController_2,
          liveBgTasks: 0,
          bgResultPendingFollowup: false,
          postTurnSettling: false,
          turnInFlight: false,
          releaseForRetire,
          releaseForShutdown,
        });
        if (healthState) healthState.activeSessions = E.size;
      }
      let tt = e.pollIntervalOverrideMs ?? nextPollDelayMs(ve, Ae);
      Sn++;
      if (Sn % ht === 0) {
        let size = E.size;
        let pe = decodeSessionJwt(tokenState.runnerToken);
        let now = Date.now();
        let Ie = now - jt;
        let ye = pe !== null ? pe * 1000 - now : null;
        let Xe =
          ye !== null
            ? `${ye < 0 ? "-" : ""}${formatDuration(Math.abs(ye), {
                mostSignificantOnly: true,
              })}`
            : "unknown";
        let qe = healthState?.lockedAccountEmail ?? (Tn ? "yes" : "no");
        onStatus(
          `[runner:health] polling ok \xB7 ${size}/${config.capacity} slots \xB7 last_poll=${Ie}ms ago \xB7 locked_account=${qe} \xB7 runner_token expires in ${Xe} \xB7 ${Er} sessions handled`,
        );
      }
      if (wn) et.atCapacity = Pt || E.size >= config.capacity;
      await et.wait(tt, signal);
    }
  } finally {
    pr = true;
    if (Wt !== undefined) {
      clearTimeout(Wt);
      Wt = undefined;
    }
    if (de !== undefined) {
      clearTimeout(de);
      de = undefined;
    }
    if (Yt !== undefined) {
      clearTimeout(Yt);
      Yt = undefined;
    }
    deferShutdown?.signal.removeEventListener("abort", un);
    signal.removeEventListener("abort", He);
    deferShutdown?.onClosed?.();
    Or?.close();
    Ct?.();
    let aborted = signal.aborted;
    if ($n === "shutdown") He();
    let ke;
    let jt =
      e.drainTimeoutMs ??
      graceSeconds(A, G, 0, config.pushOutcomeOnRelease ? PUSH_ON_RELEASE_TIMEOUT_MS : 0, noHybridToken()) *
        1000;
    let cn = false;
    let interval = setInterval(() => {
      if (cn) return;
      cn = true;
      apiClient
        .pollWork(tokenState.runnerToken, runnerId, 0)
        .then(() => {
          if (healthState) healthState.lastPollAt = Date.now();
        })
        .catch((error) => {
          if (healthState) healthState.pollErrors[classifyRunnerError(error)]++;
          onDebug(`[runner] shutdown: lease heartbeat failed (best-effort): ${error}`);
        })
        .finally(() => {
          cn = false;
        });
    }, e.shutdownLeaseHeartbeatMs ?? SHUTDOWN_LEASE_HEARTBEAT_MS);
    try {
      if (drainWaitMs > 0 && aborted) {
        let tt = () => [...E.values()].reduce((acc, Nt) => acc + Nt.liveBgTasks, 0);
        let R = () => [...E.values()].reduce((acc, Nt) => acc + (Nt.turnInFlight ? 1 : 0), 0);
        let pe = () => [...E.values()].reduce((acc, Nt) => acc + (Nt.bgResultPendingFollowup ? 1 : 0), 0);
        let It = () => [...E.values()].reduce((acc, Nt) => acc + (Nt.postTurnSettling ? 1 : 0), 0);
        let Ie = () =>
          (pe() > 0 ? `, ${pe()} finished background task(s) awaiting the follow-up turn` : "") +
          (It() > 0 ? `, ${It()} finished turn(s) still being reported to the server` : "");
        let ye = () =>
          [...E.entries()]
            .filter(([, qe]) => qe.turnInFlight || qe.liveBgTasks > 0 || qe.bgResultPendingFollowup)
            .map(([qe]) => qe);
        let Xe = () => ye().length > 0 || It() > 0;
        ke = {
          outcome: "RUNNER_DRAIN_HOLD_OUTCOME_NOT_NEEDED",
          cap_ms: Math.round(drainWaitMs),
          held_ms: 0,
          busy_session_ids_at_release: [],
        };
        if (Xe()) {
          let now = Date.now();
          let Nt = false;
          onStatus(
            `[runner] drain-wait: ${R()} turn(s) in flight, ${tt()} background task(s) live${Ie()} across ${E.size} session(s) \u2014 waiting up to ` +
              `${drainWaitMs / 1000}s before stopping session(s)`,
          );
          await new Promise((resolve) => {
            let Wn = () => {
              ae = undefined;
              resolve();
            };
            let timer = setTimeout(() => {
              Nt = true;
              Wn();
            }, drainWaitMs);
            ae = () => {
              if (!Xe()) {
                clearTimeout(timer);
                Wn();
              }
            };
          });
          let Je = ye();
          ke = {
            ...ke,
            outcome: Nt ? "RUNNER_DRAIN_HOLD_OUTCOME_CAP_EXPIRED" : "RUNNER_DRAIN_HOLD_OUTCOME_FINISHED",
            held_ms: Date.now() - now,
            busy_session_ids_at_release: Je.slice(0, MAX_LISTED_SESSION_IDS),
          };
          onStatus(
            !Nt
              ? "[runner] drain-wait: in-flight work finished \u2014 stopping session(s)"
              : `[runner] drain-wait: timed out with ${R()} turn(s) in flight, ${tt()} task(s) still live${Ie()} \u2014 stopping session(s)`,
          );
        }
      }
      for (let { controller } of E.values()) controller.abort();
      if (E.size > 0) {
        onStatus(`Draining ${E.size} active session(s)...`);
        try {
          await withBoundedTimeout(
            Promise.allSettled([...E.values()].map((tt) => tt.task)),
            jt,
            "[runner:stuck] drain",
          );
          onStatus("Drain complete");
          logFeatureOk("self_hosted_drain");
        } catch {
          logFeatureBad("self_hosted_drain", "shutdown_budget_exceeded");
          onStatus(
            `[runner] shutdown exceeded ${jt}ms (session-stop-grace + post-session-hook-timeout` +
              (config.pushOutcomeOnRelease ? " + push-on-release window" : "") +
              ` + ${SIGKILL_GRACE_BASE_MS / 1000}s); force-exiting. The post-session hook had its full budget; post-hook cleanup may have been cut short. ${E.size} session(s) still active.`,
          );
          await e.flushLogSink?.();
          process.exit(1);
        }
      }
      if (De.size > 0) {
        onStatus(
          `[runner] shutdown: waiting for ${De.size} in-flight session release(s) to settle before deregistering`,
        );
        await withBoundedTimeout(
          Promise.allSettled([...De.values()]),
          RELEASE_IN_FLIGHT_WAIT_MS,
          "[runner:exit] release settle",
        ).catch(() => {
          abortController.abort();
          onStatus(
            `[runner] shutdown: ${De.size} session release(s) did not settle within ${RELEASE_IN_FLIGHT_WAIT_MS / 1000}s \u2014 deregistering anyway (those sessions are requeued rather than parked)`,
          );
        });
      }
      await resolved;
    } finally {
      clearInterval(interval);
    }
    let Jt = false;
    let In = await resolved;
    let reason =
      aborted || $n === "shutdown"
        ? In?.present
          ? "host_drain"
          : "shutdown_signal"
        : Pt
          ? "retire_at"
          : oe && !ge
            ? "idle_release"
            : "";
    if (ke !== undefined && In?.deadlineMs !== undefined)
      ke.host_deadline_unix_s = Math.round(In.deadlineMs / 1000);
    await withBoundedTimeout(
      apiClient
        .deregisterRunner(tokenState.runnerToken, {
          reason,
          drain_hold: ke,
        })
        .then(() => {
          onStatus("[runner:exit] Deregistered");
          if (!Jt) {
            Jt = true;
            logFeatureOk("self_hosted_deregister");
          }
        })
        .catch((error) => {
          onDebug(`[runner:exit] deregisterRunner failed (best-effort): ${error}`);
          if (!Jt) {
            Jt = true;
            logFeatureSad("self_hosted_deregister", "rpc_failed");
          }
        }),
      5000,
      "[runner:exit] deregister",
    ).catch(() => {
      onDebug("[runner:exit] deregisterRunner timed out (best-effort) \u2014 lease expiry will requeue");
      if (!Jt) {
        Jt = true;
        logFeatureSad("self_hosted_deregister", "timeout");
      }
    });
  }
}
//@ chunk-hm0ce8vc.js:320208-320369 placement
function nextPollDelayMs(e, n) {
  let r = e ? Date.parse(e) : NaN;
  let s = Number.isNaN(r)
    ? DEFAULT_POLL_INTERVAL_MS
    : Math.max(MIN_POLL_INTERVAL_MS, Math.min(MAX_POLL_INTERVAL_MS, Math.floor((r - Date.now()) / 3)));
  let durationSeconds = parseDurationSeconds(n);
  return durationSeconds === undefined ? s : Math.min(s, durationSeconds);
}
//@ chunk-hm0ce8vc.js:320369-320570 placement
function parseDurationSeconds(e) {
  let n = e === undefined ? null : /^(\d{1,15})(?:\.(\d{1,9}))?s$/.exec(e);
  if (!n) return;
  let r = n[2] ? Number(n[2].padEnd(9, "0")) : 0;
  let s = Number(n[1]) * 1000 + Math.floor(r / 1e6);
  return s > 0 ? Math.max(MIN_BACKOFF_MS, s) : undefined;
}
//@ chunk-hm0ce8vc.js:320570-320688 placement
function backoffDelayMs(e, n, r) {
  let min = Math.min(MAX_POLL_DELAY_MS, HEALTH_PROBE_BACKOFF_BASE_MS * 2 ** Math.max(0, e - 1));
  let floored = Math.floor(min / 2 + Math.random() * (min / 2));
  return clampToLeaseExpiry(floored, n, HEALTH_PROBE_BACKOFF_BASE_MS, r);
}
//@ chunk-hm0ce8vc.js:320688-320839 placement
function clampToLeaseExpiry(e, n, r, s) {
  let a = n === undefined ? NaN : Date.parse(n) - Date.now();
  if (!(a > 0)) return e;
  let min = Math.min(a - LEASE_EXPIRY_POLL_MARGIN_MS, parseDurationSeconds(s) ?? 1 / 0);
  return Math.min(e, Math.max(r, min));
}
//@ chunk-hm0ce8vc.js:320839-321020 placement
async function writeRunnerFileBestEffort(debugTokenDir, n, r, s) {
  try {
    await mkdir(debugTokenDir, {
      recursive: true,
      mode: 448,
    });
    await writeFile(`${debugTokenDir}/${n}`, r, {
      mode: 384,
    });
  } catch (error) {
    s(`[runner:debug] failed to write ${n} to ${debugTokenDir} (best-effort): ${error}`);
  }
}
