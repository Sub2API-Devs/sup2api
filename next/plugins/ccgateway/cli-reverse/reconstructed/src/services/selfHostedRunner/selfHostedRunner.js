/**
 * services/selfHostedRunner/selfHostedRunner.ts
 *
 * 2.1.316 新增：claude self-hosted-runner 子命令入口与主循环（注册、轮询工单、并发跑会话、排空退出）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-asf5gh8x.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  MAX_SESSION_IDLE_MS,
  SHUTDOWN_LEASE_HEARTBEAT_MS,
  MAX_REPORTED_BUSY_SESSIONS,
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
import { makeHttpsAgentCloseAfterServerError } from "../../utils/mtls.js";
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
import { describeIdleRelease, getRunnerIdleMs } from "./idleRelease.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { ADDED_FOLDER_PLUGINS_FOLLOW_SETTING_SOURCES } from "../../utils/plugins/addDirPluginSettings.js";
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
import { countWhere } from "../../utils/collections.js";
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
import {
  parseTurnSignal,
  BUSY_IDLE_MS,
  IDLE_BUSY_BEATS,
  TURN_STATE_STATUS_TEXT,
} from "./sessionTurnState.js";
import {
  checkoutStates,
  checkOwnFolder as checkOwnFolder_2,
  describeWorkLoss,
  keptReasonCode,
} from "./releaseReasons.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { rewriteContractionError } from "../../selfHostedRunner/git/fetchErrors.js";

//@ chunk-asf5gh8x.js:247881-302375 placement
/**
 * claude self-hosted-runner 入口：解析参数、检查 base-dir、捕获宿主配置、注册 runner 并进入运行循环（约 52 KB，含 --help 文本）。
 */
async function selfHostedRunnerMain(argv) {
  let now = Date.now();
  if (argv.includes("--help") || argv.includes("-h")) {
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
                              A session that the server starts without the repository's own
                              settings gets no workspace trust, as with false, whatever
                              this flag says.
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
                              they would without any signal: an idle limit (--release-idle-session-min, or
                              one that Anthropic's control plane sends for a session) releases a session
                              whose user has gone idle (it parks server-side and a fresh runner resumes it on
                              the user's next message); a session it would not release \u2014 it has no idle limit,
                              Anthropic's limit found changes or new commits in its checkouts or something
                              in its own folder, or could not check them, or the finished turn still has
                              background work running \u2014 simply stays attached. M minutes after the first
                              signal every session still attached
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
                                  Default: never, unless Anthropic's control plane sends a session an
                                  idle limit. That limit releases sessions only on Linux runners, only
                                  after a finished turn, never at a permission prompt, and only a session
                                  whose checkouts hold no uncommitted changes and are still at the
                                  commit that the runner checked out, and whose own folder
                                  (<base-dir>/_sessions/<id>) holds only what the runner put there.
                                  Any value set here, 0 (never) included, overrides it.
                                  Max: ${MAX_KILL_AFTER_MINUTES}.
                                  [env: SELF_HOSTED_RUNNER_SESSION_IDLE_MS, in ms]
  --hold-idle-file <path>         Do not release an idle session (--release-idle-session-min, or an
                                  idle limit from Anthropic's control plane) while
                                  <path> is a regular file changed in the last ${HOLD_IDLE_MTIME_FRESH_MS / 1000}s: your host
                                  keeps it fresh while a process the session left running (nohup,
                                  tmux) lives. Looked at again every ${LEFTOVER_HOLD_LOOK_TIMEOUT_MS / 1000}s. Does not hold a
                                  session at startup, at --retire-at, at the --defer-shutdown-max-min
                                  ceiling or at --kill-session-after-min. Default: off.
                                  [env: SELF_HOSTED_RUNNER_HOLD_IDLE_FILE]
  --max-hold-min <n>              With --hold-idle-file: hold a session no longer than N min after it
                                  went idle. If an idle limit from Anthropic's control plane reaches a
                                  session that is already idle and has none in force (at first, or
                                  after one was withdrawn), the N minutes count from then. Afterwards
                                  the session is handled as it would be without the file.
                                  Default: ${DEFAULT_MAX_HOLD_MS / 60000}. 0 disables the hold.
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
  makeHttpsAgentCloseAfterServerError();
  configureGlobalAgents();
  let timestamp = () => new Date().toISOString();
  let logStream;
  let stdioWriter = openStdioWriter({
    stamp: (message) => `${timestamp()} [self-hosted-runner] ${redactSecretsInText(message)}`,
    onOwnLine: (line) =>
      logStream?.write(
        line +
          `
`,
      ),
  });
  let options;
  let poolSecret;
  let proxyAuthConfig;
  let agentProxyUrl;
  try {
    options = parseRunnerOptions(argv);
    proxyAuthConfig = proxyAuthorizationConfig({
      command: options.proxyAuthorizationCommand,
      file: options.proxyAuthorizationFile,
    });
    let agentProxyFlagName = options.envSetByFlag.has("SELF_HOSTED_RUNNER_AGENT_PROXY_URL")
      ? "--agent-proxy-url"
      : "SELF_HOSTED_RUNNER_AGENT_PROXY_URL";
    agentProxyUrl = checkRunnerAgentProxyStandaloneUrl(
      env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
      agentProxyFlagName,
    );
    if (agentProxyUrl !== undefined && proxyAuthConfig !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${agentProxyFlagName} cannot be combined with --proxy-authorization-command / --proxy-authorization-file: sessions would reach that proxy without the egress listener. Remove one of the two.`,
        "runner agent proxy URL paired with a --proxy-authorization-* egress listener",
      );
    if (process.env.SELF_HOSTED_RUNNER_HOOKS_DIR) assertLifecycleHooksSupported("--hooks-dir");
    requireBaseDirOnWindows(options.baseDirSource);
    lockCurrentVersion();
    poolSecret = await readEnvironmentSecretFile(options, (message) => stdioWriter.write("stderr", message));
    await checkBaseDirWritable(options.baseDir, undefined, (message) => stdioWriter.write("stderr", message));
  } catch (error) {
    stdioWriter.write(
      "stderr",
      `error: ${redactSecretsInText(errorMessage(error))}
Run 'claude self-hosted-runner --help' for usage.`,
    );
    process.exit(2);
  }
  let isDebug = options.logLevel === "debug";
  if (options.logFile) {
    logStream = createWriteStream(options.logFile, {
      flags: "a",
      mode: 384,
    });
    logStream.on("open", (fd) => {
      fchmod(fd, 384, () => {});
    });
    logStream.on("error", (error) => {
      stdioWriter.write(
        "stderr",
        `${timestamp()} [runner:warn] log-file write failed (${errorMessage(error)}); continuing stdout-only`,
      );
      logStream = undefined;
    });
  }
  let writeToLogFile = (line) => {
    logStream?.write(
      line +
        `
`,
    );
  };
  let flushLogFile = async () => {
    if (!logStream) return;
    let stream = logStream;
    logStream = undefined;
    await withBoundedTimeout(
      new Promise((resolve) => stream.end(resolve)),
      500,
      "[runner:exit] log-file flush",
    ).catch(() => {});
  };
  let logDebug = (message) => {
    if (isDebug) {
      let line = `${timestamp()} [DEBUG] ${redactSecretsInText(message)}`;
      stdioWriter.write("stderr", line);
      writeToLogFile(line);
    }
  };
  let logInfo = (message) => {
    let line = `${timestamp()} [self-hosted-runner] ${redactSecretsInText(message)}`;
    stdioWriter.write("stdout", line);
    writeToLogFile(line);
  };
  logDebug(`[runner:log] ${stdioWriter.describe()}`);
  if (process.env.SELF_HOSTED_RUNNER_SIGKILL_TIMEOUT_MS !== undefined) {
    logInfo(
      "[runner:fatal] SELF_HOSTED_RUNNER_SIGKILL_TIMEOUT_MS was renamed to SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS. It controls how long to wait for the Claude process to exit cleanly after a session ends, before force-killing it. The post-session hook runs after this.",
    );
    await flushLogFile();
    process.exit(1);
  }
  for (let envName of [
    "RUNNER_RELEASE_IDLE_SESSION_MIN",
    "SELF_HOSTED_RUNNER_RELEASE_IDLE_SESSION_MIN",
    "SELF_HOSTED_RUNNER_SESSION_IDLE_MIN",
    "SELF_HOSTED_RUNNER_SESSION_IDLE_SEC",
  ])
    if (process.env[envName] !== undefined)
      logInfo(
        `[runner:warn] ${envName} is set but is not a setting this runner ` +
          "reads \u2014 it is being IGNORED. The session idle-release window " +
          "is configured with --release-idle-session-min <minutes> (or env SELF_HOSTED_RUNNER_SESSION_IDLE_MS, in milliseconds).",
      );
  let shutdownBudgetSeconds = graceSeconds(
    envPositiveMs("SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS") || SIGKILL_TIMEOUT_DEFAULT_MS,
    envPositiveMs("SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS") || POST_SESSION_HOOK_TIMEOUT_MS,
    getDrainWaitMs(),
    options.pushOutcomeOnRelease ? PUSH_ON_RELEASE_TIMEOUT_MS : 0,
    noHybridToken(),
  );
  let shutdownBudgetMessage = `[runner] This runner needs up to ${shutdownBudgetSeconds}s to stop the Claude process and run the post-session hook on shutdown, and force-exits after ${shutdownBudgetSeconds}s (a session release already in flight when shutdown begins can add up to ${RELEASE_IN_FLIGHT_WAIT_MS / 1000}s, normally well under 1s, before the runner deregisters). Configure your process supervisor's stop timeout to at least ${shutdownBudgetSeconds}s (e.g. terminationGracePeriodSeconds on Kubernetes, stop_grace_period on Docker Compose, TimeoutStopSec on systemd, or your platform's equivalent).`;
  logInfo(shutdownBudgetMessage);
  let deferShutdownMaxMs = envPositiveMs("SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS");
  let sessionIdleMs = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_IDLE_MS");
  let postCeilingGraceMs =
    Math.max(getDrainWaitMs(), DEFAULT_POST_SESSION_ALLOWANCE_MS) + SIGKILL_GRACE_BASE_MS;
  let deferShutdownExplanation =
    deferShutdownMaxMs > 0
      ? `[runner] --defer-shutdown-max-min is set (${formatDuration(deferShutdownMaxMs, {
          hideTrailingZeros: true,
        })}): the FIRST shutdown signal does not start that ${shutdownBudgetSeconds}s budget \u2014 the runner stops ` +
        "taking work but keeps serving the attached sessions; " +
        (sessionIdleMs > 0
          ? `each is released (parked, resumable) once its user has been idle ${formatDuration(
              sessionIdleMs,
              {
                hideTrailingZeros: true,
              },
            )} (--release-idle-session-min)`
          : describeIdleRelease()) +
        `, and the runner exits as soon as it holds no session; ${formatDuration(deferShutdownMaxMs, {
          hideTrailingZeros: true,
        })} after the signal every remaining session is released at once and anything still attached ${formatDuration(
          postCeilingGraceMs,
          {
            hideTrailingZeros: true,
          },
        )} later is drained. If your supervisor's stop timeout ends first, every still-attached session is killed WITHOUT its post-session hook or deregister and is requeued to another runner about a minute later. Size the stop timeout to at least ${Math.ceil((deferShutdownMaxMs + postCeilingGraceMs) / 1000) + shutdownBudgetSeconds}s (M + post-ceiling grace + the budget above). A second signal drains immediately.`
      : undefined;
  if (deferShutdownExplanation !== undefined) logInfo(deferShutdownExplanation);
  let describeEnvSetting = (envName, flagName, defaultMs, unlessZero = false) => {
    let rawValue = process.env[envName];
    if (rawValue === undefined || rawValue === "")
      return defaultMs !== undefined && defaultMs > 0
        ? `${formatDuration(defaultMs, {
            hideTrailingZeros: true,
          })} (default)`
        : "disabled (not configured)";
    let source = options.envSetByFlag.has(envName) ? flagName : `env ${envName}`;
    let parsedMs = envPositiveMs(envName);
    if (parsedMs > 0)
      return `${formatDuration(parsedMs, {
        hideTrailingZeros: true,
      })} (from ${source})`;
    let isExplicitZero = Number(rawValue) === 0 && (unlessZero !== "unless-zero" || rawValue.trim() !== "");
    if (
      (unlessZero === true || (unlessZero === "unless-zero" && !isExplicitZero)) &&
      defaultMs !== undefined &&
      defaultMs > 0
    ) {
      let ignoredReason = isExplicitZero ? "0 is not accepted" : "not a usable ms duration";
      return (
        `${formatDuration(defaultMs, {
          hideTrailingZeros: true,
        })} ` + `(default \u2014 ${source} ignored: ${ignoredReason})`
      );
    }
    return isExplicitZero
      ? `disabled (from ${source})`
      : `disabled (from ${source} \u2014 not a usable ms duration, treated as 0)`;
  };
  let describeLeftoverHold = () => {
    let holdPath = holdIdleFile();
    if (holdPath === undefined) return "off (--hold-idle-file not set)";
    let envSelfHostedRunnerMaxHoldMs = process.env.SELF_HOSTED_RUNNER_MAX_HOLD_MS;
    let source =
      envSelfHostedRunnerMaxHoldMs === undefined || envSelfHostedRunnerMaxHoldMs.trim() === ""
        ? "default"
        : options.envSetByFlag.has("SELF_HOSTED_RUNNER_MAX_HOLD_MS")
          ? "from --max-hold-min"
          : "from env SELF_HOSTED_RUNNER_MAX_HOLD_MS";
    let maxHoldMs = getMaxHoldMs();
    if (maxHoldMs === 0)
      return source === "from --max-hold-min"
        ? "off (--max-hold-min is 0)"
        : "off (env SELF_HOSTED_RUNNER_MAX_HOLD_MS is 0 or not a usable ms duration)";
    let idleReleaseMs = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_IDLE_MS");
    let holdCaveat =
      idleReleaseMs === 0
        ? getRunnerIdleMs()
          ? ", but holds nothing while --release-idle-session-min is off"
          : ", but holds nothing unless Anthropic's control plane sends a session an idle limit"
        : maxHoldMs <= idleReleaseMs
          ? ", but holds nothing: the cap is not longer than --release-idle-session-min"
          : "";
    return `${holdPath}, cap ${formatDuration(maxHoldMs, {
      hideTrailingZeros: true,
    })} (${source})${holdCaveat}`;
  };
  logInfo(
    `[runner] watchdog config: idle-release=${describeEnvSetting("SELF_HOSTED_RUNNER_SESSION_IDLE_MS", "--release-idle-session-min")}${getRunnerIdleMs() ? "" : " unless Anthropic's control plane sends a session an idle limit"}; startup-timeout=${describeEnvSetting("SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS", "--startup-timeout-min", DEFAULT_STARTUP_TIMEOUT_MS)}; kill-session-after=${describeEnvSetting("SELF_HOSTED_RUNNER_MAX_LIFETIME_MS", "--kill-session-after-min")}; exit-if-unused=${describeEnvSetting("SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS", "--exit-if-unused-min")}; defer-shutdown-max=${describeEnvSetting("SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS", "--defer-shutdown-max-min")}; checkout-hook-timeout=${describeEnvSetting("SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS", "--checkout-hook-timeout-min", CHECKOUT_HOOK_TIMEOUT_MS, "unless-zero")}; bg-result-grace=${describeEnvSetting("SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS", "SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS", BG_RESULT_GRACE_MS, true)}; post-turn-settle=${describeEnvSetting("SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS", "SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS", POST_TURN_SETTLE_MS, true)}; leftover-hold=${describeLeftoverHold()}; drain-marker-file=${process.env.SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE || "unset"}`,
  );
  let removeSessionStateSource =
    options.removeSessionState === REMOVE_SESSION_STATE_DEFAULT
      ? "default"
      : "--remove-session-state / SELF_HOSTED_RUNNER_REMOVE_SESSION_STATE";
  logInfo(
    options.removeSessionState
      ? `[runner] per-session state: REMOVED at session end (${removeSessionStateSource}) \u2014 each session's _sessions/<id>.claude-config, .tool-server-config, .uploads, .gitconfig, .disk-mark and <id>/ are deleted when it ends, best-effort`
      : `[runner] per-session state: KEPT at session end (${removeSessionStateSource}) \u2014 each session's _sessions/<id>.claude-config, .tool-server-config, .uploads, .gitconfig, .disk-mark and <id>/ stay under ${options.baseDir} until the disk is recycled`,
  );
  let diffFindsNestedSource =
    options.diffFindsNestedRepository === DIFF_FINDS_NESTED_REPO_DEFAULT
      ? "the default"
      : "--diff-finds-nested-repository / SELF_HOSTED_RUNNER_DIFF_FINDS_NESTED_REPOSITORY";
  logInfo(
    options.diffFindsNestedRepository
      ? `[runner] changes in a repository cloned into a sub-folder: SHOWN (${diffFindsNestedSource}) \u2014 for a session started with no repository, the web session's Changes pane may show one repository under the session's working folder, only while the session's tool sandbox is off; while a repository is in that folder itself or in a folder above it the pane stays empty, sandbox on or off; a refusal is reported, with the session's id and the reason, in a "[changes pane] repository not shown" line in this log`
      : `[runner] changes in a repository cloned into a sub-folder: NOT SHOWN (${diffFindsNestedSource}) \u2014 for a session started with no repository, the web session's Changes pane may show only a repository in the session's working folder itself or in a folder above it; --diff-finds-nested-repository shows one in a sub-folder instead; its --help entry says what that costs`,
  );
  let envSelfHostedRunnerHooksDir = process.env.SELF_HOSTED_RUNNER_HOOKS_DIR;
  let execPath = options.execPath;
  if (!execPath) {
    let hook = await findHook(envSelfHostedRunnerHooksDir, "command");
    if (hook) {
      execPath = hook;
      logInfo(`[runner:hook] using command hook ${hook}`);
    }
  }
  let { execPath: execPath_2, execArgs } = runnerExecPath(execPath);
  let diffFindsWarning = warnDiffFindsNestedRepository(options.diffFindsNestedRepository, execPath);
  if (diffFindsWarning) logInfo(diffFindsWarning);
  let freshMachinePerSession = false;
  logInfo(
    `Connecting to ${options.apiUrl} (capacity=${options.capacity}, baseDir=${options.baseDir}, execPath=${[execPath_2, ...execArgs].join(" ")})`,
  );
  let capacityWarning = warnCapacityOnSessionBoundRunner(poolSecret, options.capacity);
  if (capacityWarning !== null) logInfo(capacityWarning);
  if (agentProxyUrl !== undefined)
    logInfo(
      `[runner:warn] Every session on this runner goes through the agent proxy at ${agentProxyUrl.protocol}//${agentProxyUrl.host}. Anthropic-managed git (governed git) sessions go through it too, except on Windows and when the server sends no git setup for them, which are refused. This runner refuses sessions that the environment's relay mode sends through Anthropic's relay. Run refused sessions on a runner started without a proxy URL (--agent-proxy-url / SELF_HOSTED_RUNNER_AGENT_PROXY_URL).` +
        (execPath
          ? " Sessions start through --exec-path or a command hook: the claude it runs must be this version or newer, so keep it updated, and receive SELF_HOSTED_RUNNER_AGENT_PROXY_URL and CCR_AGENT_PROXY_RELAY_MODE, or its sessions connect directly instead. With an older claude, Anthropic-managed git does not run: git and gh fail if its traffic goes through the proxy, or else use this machine's own network access and credentials."
          : ""),
    );
  if (options.debugTokenDir)
    await mkdir(options.debugTokenDir, {
      recursive: true,
      mode: 448,
    })
      .then(() => {
        logInfo(`[runner:debug] debug token dir ready: ${options.debugTokenDir}`);
      })
      .catch((error) => {
        logInfo(`[runner:debug] failed to create debug token dir (best-effort): ${error}`);
      });
  let egressProxy;
  if (proxyAuthConfig)
    try {
      egressProxy = await startRunnerEgressProxy(proxyAuthConfig, {
        onStatus: logInfo,
        onDebug: logDebug,
      });
      logFeatureOk("self_hosted_egress_proxy_auth");
    } catch (error) {
      logFeatureBad("self_hosted_egress_proxy_auth", "listener_start_failed");
      logInfo(`[runner:fatal] could not start the proxy-authorization listener: ${errorMessage(error)}`);
      await flushLogFile();
      process.exit(1);
    }
  let capabilities = execPath
    ? []
    : [
        ...(options.capacity === 1 && options.debugTokenDir === undefined ? [CODE_REVIEW_TOKEN_HANDOFF] : []),
        ADDED_FOLDER_PLUGINS_FOLLOW_SETTING_SOURCES,
      ];
  logDebug(`[runner] capabilities reported to the server: ${capabilities.join(", ") || "none"}`);
  let defaultEnvironment = createDefaultEnvironment({
    baseUrl: options.apiUrl,
    poolSecret,
    onDebug: logDebug,
    capabilities,
    agentProxyUrl: agentProxyUrl?.origin,
  });
  let clientLabel = options.clientLabel ?? hostname();
  if (options.lockToAccountId) logInfo(`Registering locked to account: ${options.lockToAccountId}`);
  if (options.useAnthropicGitProxy)
    logInfo("Registering as opted in to Anthropic-managed git (--use-anthropic-git-proxy)");
  if (options.serverAutoModeLists !== NO_ALLOW)
    logInfo(
      `Registering with --server-auto-mode-lists ${options.serverAutoModeLists}: ${SERVER_AUTO_MODE_LISTS_DESCRIPTIONS[options.serverAutoModeLists]}`,
    );
  let runnerId;
  let runnerToken;
  let registration;
  try {
    registration = await retryWithBackoff(
      () =>
        defaultEnvironment.registerRunner({
          clientLabel,
          lockToAccountId: options.lockToAccountId,
          useAnthropicGitProxy: options.useAnthropicGitProxy,
          serverAutoModeLists: options.serverAutoModeLists,
        }),
      {
        initialDelayMs: 1000,
        maxDelayMs: 16000,
        maxAttempts: 5,
        shouldRetry: isRetryableRunnerError,
        onRetry: (attemptNumber, retryError) => {
          logInfo(
            `RegisterRunner attempt ${attemptNumber} transient failure (${retryError instanceof Error ? retryError.message : retryError}) \u2014 retrying`,
          );
        },
      },
    );
    runnerId = registration.runner_id;
    runnerToken = registration.runner_token;
    logFeatureOk("self_hosted_register");
  } catch (error) {
    let errorText = error instanceof Error ? error.message : String(error);
    let authRejectionMessage = describeServerAuthRejection(error, poolSecret);
    if (authRejectionMessage !== null) {
      logFeatureBad("self_hosted_register", "self_hosted_register_work_order_refused");
      logInfo(`[runner:fatal] ${authRejectionMessage}`);
    } else if (
      error instanceof Error &&
      "isSelfHostedDisabledByOrg" in error &&
      error.isSelfHostedDisabledByOrg === true
    ) {
      logFeatureBad("self_hosted_register", "self_hosted_register_disabled_by_org");
      logInfo(
        `[runner:fatal] RegisterRunner refused because self-hosted environments are not enabled for this organization. Usually the 'Allow self-hosted environments' setting on the Cloud environments admin page (claude.ai/admin-settings/cloud-environments) is off, and an organization Owner can turn it on. Self-hosted environments also need a Team or Enterprise plan, and the setting usually applies within a few minutes. If this message still appears after that, contact your Anthropic account team. The environment secret was accepted, so do not rotate it. (${errorText})`,
      );
    } else if (isAuthFailure(error)) {
      logFeatureBad("self_hosted_register", "self_hosted_register_auth_failed");
      logInfo(
        `[runner:fatal] RegisterRunner auth failed \u2014 environment secret invalid or revoked. Check --environment-secret-file or SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET. (${errorText})`,
      );
    } else {
      logFeatureBad("self_hosted_register", "self_hosted_register_failed");
      let lockToAccountHint = validateLockToAccount(errorText);
      logInfo(`[runner:fatal] RegisterRunner failed: ${errorText}${lockToAccountHint}`);
    }
    await flushLogFile();
    process.exit(1);
  }
  logInfo(`Registered: runner_id=${runnerId}`);
  let startCommandPhases = undefined;
  let abortController = new AbortController();
  let unusedStartPhases = undefined;
  let environment = defaultEnvironment;
  let apiClient = environment;
  let abortController_2 = new AbortController();
  let shutdownState = "running";
  let isDeferWindowOpen = true;
  let healthStateRef = {};
  let stateHolder = {};
  let describeUptime = (context) => {
    let sessionCounts = healthStateRef.current;
    let countsText =
      sessionCounts === undefined
        ? "session counts not yet initialized (startup in progress)"
        : `${sessionCounts.sessionIdle.size} active session(s), ${countWhere([...sessionCounts.sessionIdle.values()], (idleAt) => idleAt !== null)} of them idle`;
    return `(${context}; uptime ${formatDuration(process.uptime() * 1000)}; ${countsText})`;
  };
  let onShutdownSignal = (signalName) => {
    if (shutdownState === "running" && deferShutdownMaxMs > 0 && isDeferWindowOpen) {
      shutdownState = "deferring";
      logInfo(
        `Received shutdown signal, deferring drain: refusing new work, serving the attached sessions until they are released or ${formatDuration(
          deferShutdownMaxMs,
          {
            hideTrailingZeros: true,
          },
        )} passes; a second signal drains immediately ${describeUptime(signalName)}`,
      );
      logInfo(shutdownBudgetMessage);
      if (deferShutdownExplanation !== undefined) logInfo(deferShutdownExplanation);
      abortController_2.abort(Date.now());
      return;
    }
    beginDrain(signalName);
  };
  let beginDrain = (reason, source = "signal") => {
    if (shutdownState === "draining") {
      let hookCount = postSessionHooksRunning();
      if (hookCount > 0)
        logInfo(
          `[runner] Forced shutdown with ${hookCount} post-session hook(s) still running \u2014 they continue in their own process group, but their output is no longer captured and the runner's timeout budget no longer applies.`,
        );
      else logInfo("Forced shutdown");
      flushLogFile().finally(() => process.exit(1));
      return;
    }
    shutdownState = "draining";
    logInfo(
      source === "signal"
        ? "Received shutdown signal, draining active sessions... " + describeUptime(reason)
        : `[runner:shutdown] ${reason} \u2014 draining active sessions... ` + describeUptime("no new signal"),
    );
    logInfo(shutdownBudgetMessage);
    let hookCount = postSessionHooksRunning();
    if (hookCount > 0)
      logInfo(
        `[runner] ${hookCount} post-session hook(s) still running \u2014 waiting for them within the budget above. Another SIGTERM force-exits the runner immediately; make sure your supervisor's stop timeout covers the full budget so hooks are not cut short.`,
      );
    abortController.abort();
  };
  let onSigterm = () => onShutdownSignal("SIGTERM");
  let onSigint = () => onShutdownSignal("SIGINT");
  process.on("SIGTERM", onSigterm);
  process.on("SIGINT", onSigint);
  let tokenState = {
    runnerToken,
  };
  if (options.debugTokenDir)
    await writeRunnerFileBestEffort(options.debugTokenDir, "runner_token.jwt", runnerToken, logInfo);
  let adoptRefreshedToken = (token) => {
    if (options.debugTokenDir)
      writeRunnerFileBestEffort(options.debugTokenDir, "runner_token.jwt", token, logInfo);
    tokenState.runnerToken = token;
    logDebug("[runner:main] runner_token refreshed");
  };
  let jwtExpiry = getJwtExpiry({
    getAccessToken: async () => {
      let { token } = await environment.refreshToken(tokenState.runnerToken);
      return token;
    },
    onRefresh: (reason, token) => adoptRefreshedToken(token),
    label: "self-hosted-runner",
  });
  jwtExpiry.schedule(RUNNER_KIND, runnerToken);
  let holderValue = undefined;
  stateHolder.current = holderValue;
  let globalGitConfigPath;
  if (options.useAnthropicGitProxy) {
    if (options.capacity > 1) {
      logInfo(
        "[runner:fatal] --use-anthropic-git-proxy requires --capacity 1 (the proxy URL is per-session and linked worktrees share origin). Omit --use-anthropic-git-proxy or set --capacity 1.",
      );
      await flushLogFile();
      process.exit(1);
    }
    if (
      antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM &&
      envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS") > 0
    ) {
      logInfo(
        "[runner:fatal] CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM requires --drain-grace-sec 0 (one-shot). With drain-grace > 0 a second session could reuse this VM after the first's child wrote to the canonical .git/, and the skip would bypass the cross-session-isolation sanitize for an untrusted canonical. Unset the env var or set --drain-grace-sec 0.",
      );
      await flushLogFile();
      process.exit(1);
    }
    let { parseGitVersion, readGitVersion } = await import("./configureGit.js");
    let gitVersion = await readGitVersion();
    let gitVersion_2 = parseGitVersion(gitVersion);
    if (!gitVersion_2 || gitVersion_2[0] < 2 || (gitVersion_2[0] === 2 && gitVersion_2[1] < 32)) {
      logInfo(
        `[runner:fatal] --use-anthropic-git-proxy requires git >= 2.32 (found ${gitVersion.trim() || "<none>"}). Older git silently ignores GIT_CONFIG_GLOBAL, which this mode relies on for cross-session isolation.`,
      );
      await flushLogFile();
      process.exit(1);
    }
    globalGitConfigPath = process.env.GIT_CONFIG_GLOBAL || join(homedir(), ".gitconfig");
    let gitConfigPath = globalGitConfigPath;
    let gitConfigStats = await lstat(gitConfigPath).catch(() => {
      return;
    });
    if (gitConfigStats && (gitConfigStats.isCharacterDevice() || gitConfigStats.isBlockDevice())) {
      logInfo(
        `[runner:fatal] --use-anthropic-git-proxy requires a writable global git config, but GIT_CONFIG_GLOBAL resolves to ${gitConfigPath} which is not a regular file. The proxy flag writes its credential helper there and restores it at each session start. Unset GIT_CONFIG_GLOBAL or point it at a regular file path.`,
      );
      await flushLogFile();
      process.exit(1);
    }
    let xdgConfigHome = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
    let xdgGitDirs = gitSearchDirs(xdgConfigHome, homedir());
    logInfo(
      `[runner:git] --use-anthropic-git-proxy: wiping HOME-level git config (${gitConfigPath}, ${xdgGitDirs.join(", ")}, ${join(options.baseDir, ".runner")}) for cross-session isolation. Operator-provisioned git config must live in system config (/etc/gitconfig) or via --configure-git; see "Git authentication" in the self-hosted runners guide.`,
    );
    await resetRunnerHome({
      globalCfgPath: gitConfigPath,
      homeGitconfigPath: join(homedir(), ".gitconfig"),
      xdgGitDirs,
      runnerDir: join(options.baseDir, ".runner"),
    });
  }
  let {
    operatorGitSnapshotWarnings,
    quoteConfigValueForLog,
    readOperatorGitSnapshot,
    resolveHookGitPrograms,
    parseGitVersion,
    readGitVersion,
  } = await import("./configureGit.js");
  let operatorGitSnapshot = await readOperatorGitSnapshot({
    baseDir: options.baseDir,
    lifecycleHooks: Boolean(envSelfHostedRunnerHooksDir),
  });
  let hookGitPrograms = await resolveHookGitPrograms({
    baseDir: options.baseDir,
  });
  let hookGitLegacyParams = false;
  if (envSelfHostedRunnerHooksDir) {
    let {
      envHasGitConfigKey,
      lifecycleHookAskpassSource,
      operatorGitConfigPairStatus,
      withLifecycleHookGitEnv,
      LIFECYCLE_HOOK_GIT_ENV,
    } = await import("../../selfHostedRunner/lifecycleHooks.js");
    let GIT_ALLOW_PROTOCOL = LIFECYCLE_HOOK_GIT_ENV.GIT_ALLOW_PROTOCOL;
    let hasEnvHooksPath = envHasGitConfigKey("core.hooksPath");
    let hookGitEnv = withLifecycleHookGitEnv();
    let allowProtocolOverridden = hookGitEnv.GIT_ALLOW_PROTOCOL !== GIT_ALLOW_PROTOCOL;
    for (let warning of operatorGitSnapshotWarnings(operatorGitSnapshot, {
      isRoot: process.getuid?.() === 0,
      operatorSshInEnv: hookGitEnv.GIT_SSH_COMMAND !== LIFECYCLE_HOOK_GIT_ENV.GIT_SSH_COMMAND,
      askpassSource: lifecycleHookAskpassSource(),
      postSessionHook:
        operatorGitSnapshot.lfsFilterScopes !== undefined &&
        (await findHook(envSelfHostedRunnerHooksDir, "post-session")) !== null,
      envHooksPath: hasEnvHooksPath,
    }))
      logInfo(warning);
    let configPairStatus = operatorGitConfigPairStatus();
    if (configPairStatus.discarded !== undefined)
      logInfo(
        `[runner:warn] GIT_CONFIG_COUNT=${configPairStatus.announced} in the runner environment is ${configPairStatus.discarded === "sparse" ? "not backed by that many GIT_CONFIG_KEY_n pairs" : "above the supported maximum"}; the lifecycle hooks' git will NOT receive those operator pairs (only the runner's pins). Fix the count/pairs to have them applied.`,
      );
    logInfo(
      "[runner:git] lifecycle hooks: core.hooksPath " +
        (hasEnvHooksPath
          ? "taken from the GIT_CONFIG_KEY_n pair in the runner's environment"
          : `pinned to ${quoteConfigValueForLog(operatorGitSnapshot.hooksPath ?? "/dev/null")}${operatorGitSnapshot.hooksPath ? " (system git config)" : " (no repository or global hooks run inside lifecycle-hook git)"}`) +
        `; fsmonitor/askpass/templates off${hookGitEnv.GIT_ASKPASS !== undefined && hookGitEnv.GIT_ASKPASS === hookGitEnv.SSH_ASKPASS ? " (GIT_ASKPASS set from the runner environment's SSH_ASKPASS)" : ""}; GIT_ALLOW_PROTOCOL=${hookGitEnv.GIT_ALLOW_PROTOCOL ?? "(unset)"} for hook git${allowProtocolOverridden ? " (from the runner environment)" : " (runner default \u2014 local-path/file://, git://, bundle and external-helper remotes refused)"}; gpg programs ${hookGitPrograms.gpg}/${hookGitPrograms.gpgsm}${hookGitPrograms.skipped.length ? ` (skipped session-writable ${hookGitPrograms.skipped.length} PATH entries)` : ""}; ` +
        (options.configureGit
          ? "hook-made commits signed per session (--configure-git), not co-authored"
          : "commit/tag signing off for hook-made commits (no --configure-git)"),
    );
    let gitVersion = parseGitVersion(await readGitVersion());
    if (gitVersion !== null && (gitVersion[0] < 2 || (gitVersion[0] === 2 && gitVersion[1] < 31))) {
      hookGitLegacyParams = true;
      logInfo(
        `[runner:warn] git ${gitVersion[0]}.${gitVersion[1]} ignores GIT_CONFIG_COUNT; exporting the lifecycle-hook git configuration pins (and any GIT_CONFIG_KEY_n pairs from the runner environment, after them) via GIT_CONFIG_PARAMETERS instead (upgrade to git >= 2.31 for the documented behaviour).`,
      );
    }
  }
  if (options.configureGit)
    try {
      let { configureGitForSigning } = await import("./configureGit.js");
      await configureGitForSigning({
        baseDir: options.baseDir,
        execPath: process.execPath,
        onStatus: logInfo,
      });
    } catch (error) {
      logInfo(
        `[runner:fatal] --configure-git failed: ${errorMessage(error)}. Check git is on PATH and ~/.gitconfig is writable.`,
      );
      await flushLogFile();
      process.exit(1);
    }
  if (options.pushOutcomeOnRelease)
    try {
      let { parseGitVersion } = await import("./configureGit.js");
      let gitVersionResult = await execFileNoThrow("git", ["--version"], {
        timeout: 5000,
        useCwd: false,
        stdin: "ignore",
        stderr: "pipe",
        maxBuffer: 1048576,
      });
      if (gitVersionResult.stderr.trim() !== "")
        stdioWriter.write("stderr", redactSecretsInText(gitVersionResult.stderr.trimEnd()));
      let gitVersion = gitVersionResult.code === 0 ? parseGitVersion(gitVersionResult.stdout) : null;
      if (gitVersion !== null && (gitVersion[0] < 2 || (gitVersion[0] === 2 && gitVersion[1] < 29)))
        logInfo(
          `[runner:warn] --push-outcome-on-release: git ${gitVersion[0]}.${gitVersion[1]} detected. The drain-push works on any version, but resuming from the preserved branch requires git >= 2.29 (--no-write-fetch-head). Upgrade git for full behavior.`,
        );
    } catch {}
  let configureGitHookStubs;
  let configureGitSigningArtifacts;
  if (options.configureGit) {
    let { coauthorHookStubs, codeSignArtifacts } = await import("./configureGit.js");
    configureGitHookStubs = coauthorHookStubs(options.baseDir);
    configureGitSigningArtifacts = codeSignArtifacts(options.baseDir, process.execPath);
  }
  let gitProxyGlobalConfigSnapshot;
  let gitProxyCredHelper;
  if (options.useAnthropicGitProxy)
    try {
      let { configureGitProxyCredential, GIT_PROXY_CRED_HELPER_CONTENT, gitProxyCredHelperPath } =
        await import("./configureGit.js");
      await configureGitProxyCredential({
        baseDir: options.baseDir,
        apiBaseUrl: options.apiUrl,
        onStatus: logInfo,
      });
      gitProxyGlobalConfigSnapshot = await readFile(globalGitConfigPath, "utf-8").catch(() => "");
      gitProxyCredHelper = {
        path: gitProxyCredHelperPath(options.baseDir),
        content: GIT_PROXY_CRED_HELPER_CONTENT,
      };
    } catch (error) {
      logInfo(
        `[runner:fatal] --use-anthropic-git-proxy failed: ${errorMessage(error)}. Check git is on PATH and ~/.gitconfig is writable.`,
      );
      await flushLogFile();
      process.exit(1);
    }
  let config = {
    apiUrl: options.apiUrl,
    capacity: options.capacity,
    baseDir: options.baseDir,
    logLevel: options.logLevel,
    gitSshRewriteHosts: options.gitSshRewriteHosts,
    gitHostRewrites: options.gitHostRewrites,
    useAnthropicGitProxy: options.useAnthropicGitProxy ? options.apiUrl : undefined,
    gitProxyGlobalConfigPath: globalGitConfigPath,
    gitProxyGlobalConfigSnapshot,
    gitProxyCredHelper,
    configureGitHookStubs,
    configureGitSigningArtifacts,
    operatorGitSnapshot,
    hookGitPrograms,
    hookGitLegacyParams,
    configureGit: options.configureGit,
    pushOutcomeOnRelease: options.pushOutcomeOnRelease,
    trustWorkspace: options.trustWorkspace,
    removeSessionState: options.removeSessionState,
    diffFindsNestedRepository: options.diffFindsNestedRepository,
    freshMachinePerSession,
    confineRepoSettings: options.confineRepoSettings,
    serverAutoModeLists: options.serverAutoModeLists,
  };
  let healthState = {
    runnerId,
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
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    clientLabel,
    capacity: options.capacity,
    claimVisibility: new Map(),
    lockedAccountEmail: null,
    initializingSessions: 0,
    sessionInitErrors: 0,
    sessionInitDurations: createHistogram(),
    sessionStartHookErrors: 0,
    pollErrors: emptyErrorCategoryCounts(),
    sessionIdle: new Map(),
    sessionTurnState: new Map(),
  };
  healthStateRef.current = healthState;
  let clockSkewMonitor = startClockSkewMonitor({
    clock: systemClock,
    onStatus: logInfo,
  });
  let tokenRefresher =
    options.healthPort > 0
      ? startRunnerTokenRefresher({
          baseUrl: options.apiUrl,
          getRunnerToken: () => tokenState.runnerToken,
          renewRunnerToken: () =>
            notAvailableInThisBuild({
              tokenState,
              refreshToken: (token) => defaultEnvironment.refreshToken(token),
              adopt: adoptRefreshedToken,
            }),
          renewSessionTokens: () => clockSkewMonitor?.renewSessionTokens() ?? Promise.resolve(),
          isThawing: () => false,
          thaws: () => 0,
          getRetireAtMs: () => runnerRetireAtMs(),
          isStopping: () => shutdownState !== "running" || !isDeferWindowOpen,
          isHeldOff: () => clockSkewMonitor?.isHeldOff() ?? false,
          onGranted: (grant) => clockSkewMonitor?.onGranted(grant),
          clock: systemClock,
          onStatus: logInfo,
          onDebug: logDebug,
        })
      : undefined;
  let healthServer =
    options.healthPort > 0
      ? startHealthServer(options.healthPort, healthState, logInfo, tokenRefresher, undefined)
      : undefined;
  let hostConfig = await captureHostConfigSnapshot(logInfo, {
    storage:
      options.hostConfigSnapshot === "disk"
        ? {
            mode: "disk",
            baseDir: options.baseDir,
          }
        : {
            mode: "memory",
          },
  });
  let governedGitConfigSeed = await snapshotOperatorGitConfig(logDebug);
  try {
    await runRunnerLoop(
      {
        apiClient,
        runnerId,
        tokenState,
        config,
        execPath: execPath_2,
        execArgs,
        startedFromWorkOrder: isPoolSpawnJwt(poolSecret),
        onDebug: logDebug,
        onStatus: logInfo,
        flushLogSink: flushLogFile,
        healthState,
        hostConfig,
        governedGitConfigSeed,
        debugTokenDir: options.debugTokenDir,
        startCommandPhases,
        moveWatch: clockSkewMonitor,
        ...false,
        deferShutdown: {
          signal: abortController_2.signal,
          maxMs: deferShutdownMaxMs,
          requestDrain: (reason) => {
            if (shutdownState !== "draining") beginDrain(reason, "loop");
          },
          onClosed: () => {
            isDeferWindowOpen = false;
          },
        },
      },
      abortController.signal,
    );
  } finally {
    jwtExpiry.cancelAll();
    healthServer?.close();
    clockSkewMonitor?.stop();
    if (hostConfig?.snapshot?.storage.mode === "disk") {
      let snapshotDir = hostConfig.snapshot.storage.snapshotDir;
      await withBoundedTimeout(
        rm(snapshotDir, {
          recursive: true,
          force: true,
        }),
        1e4,
        `[runner:exit] remove host config snapshot ${snapshotDir}`,
      ).catch(() => {});
    }
    if (egressProxy)
      await withBoundedTimeout(egressProxy.close(), 2000, "[runner:exit] egress proxy close").catch(() => {});
    process.removeListener("SIGTERM", onSigterm);
    process.removeListener("SIGINT", onSigint);
    await flushLogFile();
  }
}
//@ chunk-asf5gh8x.js:302375-302459 placement
function isAuthFailure(error) {
  return error instanceof Error && "isAuthFailure" in error && error.isAuthFailure === true;
}
//@ chunk-asf5gh8x.js:302459-302816 placement
/**
 * 校验 --lock-to-account：必须是组织成员的 user_<id> 或邮箱。
 */
function validateLockToAccount(message) {
  if (!message.includes("lock_to_account_id")) return "";
  let flagHint = "lock_to_account_id is the value of --lock-to-account / SELF_HOSTED_RUNNER_LOCK_TO_ACCOUNT";
  if (message.includes("is not a member") || message.includes("must be a user_"))
    return ` (${flagHint}; it must be the user_<id> or email address of a member of the organization that owns this environment)`;
  return ` (${flagHint})`;
}
//@ chunk-asf5gh8x.js:302816-339882 placement
/**
 * runner 主循环：轮询/兑现工单、跑会话、处理 401/epoch 失配、排空与重启（约 31 KB）。
 */
async function runRunnerLoop(options, signal) {
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
  } = options;
  let runnerId = options.runnerId;
  let retireAtMs = options.retireAtMsOverride ?? runnerRetireAtMs();
  let drainMessage = startedFromWorkOrder
    ? `Draining and exiting. ${WORK_ORDER_SINGLE_USE_TEXT}`
    : "Draining and exiting for clean restart.";
  let restartHint = startedFromWorkOrder ? WORK_ORDER_SINGLE_USE_TEXT : "Orchestrator will restart.";
  let activeSessions = new Map();
  let notifyMissingTurnSignals = (turnSignalIds) => {
    for (let [sessionId, entry] of activeSessions)
      if (turnSignalIds?.has(sessionId) !== true) entry.onNoTurnSignal();
  };
  let notifyMissing = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS") || SIGKILL_TIMEOUT_DEFAULT_MS;
  let postSessionHookTimeoutMs =
    envPositiveMs("SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS") || POST_SESSION_HOOK_TIMEOUT_MS;
  let checkoutHookTimeoutMs = getCheckoutHookTimeoutMs();
  let drainWaitMs = getDrainWaitMs();
  let drainMarkerPath = drainMarkerFile();
  let drainRequested = false;
  let fatalExit = false;
  let readDrainMarkerOverride = options.readDrainMarkerOverride ?? readRegularFileSafe;
  let drainMarkerReadTimeoutMs = options.drainMarkerReadTimeoutMs ?? DRAIN_MARKER_READ_TIMEOUT_MS;
  let resolved = Promise.resolve(undefined);
  let drainMarkerReadStarted = false;
  let readDrainMarker = () => {
    if (drainMarkerReadStarted || drainMarkerPath === undefined) return;
    drainMarkerReadStarted = true;
    resolved = withBoundedTimeout(
      readDrainMarkerOverride(drainMarkerPath),
      drainMarkerReadTimeoutMs,
      "drain-marker read",
    )
      .then(
        (markerState) => {
          if (markerState.present)
            onStatus(
              `[runner] drain: host-drain marker ${drainMarkerPath} present` +
                (markerState.unreadable !== undefined
                  ? ` but unreadable (${markerState.unreadable}) \u2014 reporting a host drain with no deadline`
                  : markerState.deadlineMs !== undefined
                    ? ` (host deadline ${new Date(markerState.deadlineMs).toISOString()})`
                    : " (no deadline on its first line)"),
            );
          return markerState;
        },
        (error) => {
          onStatus(
            `[runner] drain: host-drain marker ${drainMarkerPath} could not be read (${errorMessage(error)}) \u2014 reporting a plain shutdown signal`,
          );
          return;
        },
      )
      .catch(() => {
        return;
      });
  };
  if (signal.aborted) readDrainMarker();
  else
    signal.addEventListener("abort", readDrainMarker, {
      once: true,
    });
  let wakeEpochTimer;
  let stuckSessions = new Set();
  let clientPlatforms = new Map();
  let badPlatformSessions = new Set();
  let notFoundCount = 0;
  let transportFailureCount = 0;
  let leaseExpiresAt;
  let suggestedPollMs;
  let failureReportInFlight = new Set();
  let spawnedIds = new Map();
  let unannouncedSkipCount = new Set();
  let unannouncedSkipCount_2 = 0;
  let pollOkLogged = Date.now();
  let pollOkNotLogged = false;
  let pollFailNotLogged = true;
  let pickedUpCount = 0;
  let takeStartCommandPhases = Date.now();
  let workloadDrained = options.startCommandPhases;
  let idleSince = () => {
    let phases = workloadDrained;
    workloadDrained = undefined;
    return phases;
  };
  let workloadDrained_2 = false;
  let idleSince_2 = null;
  let idleShutdownMs = envPositiveMs("SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS");
  let drainGraceMs = envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS");
  let sessionIdleMs = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_IDLE_MS");
  let platform = getRunnerIdleMs();
  let holdIdlePath = holdIdleFile();
  let maxHoldMs = getMaxHoldMs();
  let leftoverHoldLookOverride = options.leftoverHoldLookOverride ?? checkPathNotOnNetworkLocation;
  let leftoverHoldRecheckMsOverride = options.leftoverHoldRecheckMsOverride ?? LEFTOVER_HOLD_LOOK_TIMEOUT_MS;
  let leftoverHoldLookTimeoutMsOverride =
    options.leftoverHoldLookTimeoutMsOverride ?? RETIRE_RELEASE_RETRY_MS;
  let startupTimeoutMs = getStartupTimeoutMs();
  let retireReleaseRetryMsOverride = options.retireReleaseRetryMsOverride ?? ENV_SECRET_READ_TIMEOUT_MS_2;
  let retireDeferredGraceMsOverride =
    options.retireDeferredGraceMsOverride ?? DEFAULT_POST_SESSION_ALLOWANCE_MS;
  let retiring = false;
  let retireTimer;
  let retireReason;
  let deferShutdown = options.deferShutdown;
  let deferShutdownEnabled = deferShutdown !== undefined && deferShutdown.maxMs > 0;
  let ceilingWaitMs =
    deferShutdown?.ceilingGraceMsOverride ?? Math.max(drainWaitMs, retireDeferredGraceMsOverride);
  let ceilingPollStepMs =
    deferShutdown?.ceilingGraceMsOverride !== undefined
      ? Math.max(10, Math.floor(deferShutdown.ceilingGraceMsOverride / 10))
      : 1000;
  let ceilingGraceMsOverride = deferShutdown?.ceilingGraceMsOverride ?? SIGKILL_GRACE_BASE_MS;
  let deferCeilingTimer;
  let postCeilingPollTimer;
  let deferCeilingPassed = false;
  let liveSessionCount = () =>
    countWhere(
      [...activeSessions.entries()],
      ([sessionId, entry]) => !entry.controller.signal.aborted && !releaseInFlight.has(sessionId),
    );
  let releaseInFlightCount = () =>
    countWhere(
      [...activeSessions.entries()],
      ([sessionId, entry]) =>
        !entry.controller.signal.aborted && releaseInFlight.has(sessionId) && !releaseTasks.has(sessionId),
    );
  let exitReasonText = () =>
    retireReason === "shutdown"
      ? "[runner:exit] shutdown requested and every attached session has been released \u2014 exiting."
      : "[runner:exit] retire time passed and no active sessions \u2014 exiting before the host kills this runner.";
  let releaseInFlight = new Set();
  let releaseFailures = new Map();
  let releaseTasks = new Map();
  let abortController = new AbortController();
  let declinedSessions = new Set();
  let idleSinceBySession = new Map();
  let releaseRetryPending = new Set();
  let childUpdateBin = undefined;
  let pendingRestart;
  let attachedCount = () => {
    let size = activeSessions.size;
    for (let key of releaseTasks.keys()) if (!activeSessions.has(key)) size++;
    for (let sessionId of declinedSessions)
      if (!activeSessions.has(sessionId) && !releaseTasks.has(sessionId)) size++;
    return size;
  };
  let refusedNotified = new Set();
  let hintsRetries = 10;
  let sseHintsEnabled = options.sseHintsEnabledOverride ?? isEnvTruthy(process.env.CCR_SHR_SSE_HINTS);
  let pollWaker = new PollWaker();
  let moveWatchSub = options.moveWatch?.moved.subscribe(() => pollWaker.wake("LOCAL"));
  let openWorkHintsStream = options.openWorkHintsStream ?? streamWorkHints;
  let hintsStream;
  (() => {
    if (sseHintsEnabled) {
      onDebug("[runner:hints] CCR_SHR_SSE_HINTS enabled \u2014 opening stream");
      hintsStream = openWorkHintsStream({
        baseUrl: config.apiUrl,
        runnerId,
        tokenState,
        onWake: () => pollWaker.wake("SSE"),
        onDebug,
        signal,
      });
    }
  })();
  let retireExitHandled = false;
  let retireExitPending = false;
  let scheduleRetire = () => {
    retireTimer = undefined;
    let remainingMs = retireAtMs - Date.now();
    if (remainingMs > 0) {
      retireTimer = setTimeout(scheduleRetire, Math.min(remainingMs, 2147483647));
      return;
    }
    retiring = true;
    retireReason = "retire";
    let size = declinedSessions.size;
    declinedSessions.clear();
    logFeatureOk("self_hosted_retire");
    onStatus(
      `[runner:retire] retire time reached \u2014 releasing ${activeSessions.size} active session(s), refusing new work; exiting once the slots are empty`,
    );
    if (size > 0)
      onStatus(
        `[runner:retire] ${size} declined session(s) held for re-spawn dropped at the retire deadline \u2014 requeued at exit instead`,
      );
    for (let session of activeSessions.values()) session.releaseForRetire();
    pollWaker.wake("LOCAL");
  };
  let onShutdownSignal = () => {
    if (!deferShutdownEnabled || deferShutdown === undefined) return;
    readDrainMarker();
    let requestedAt =
      typeof deferShutdown.signal.reason === "number" ? deferShutdown.signal.reason : Date.now();
    if (deferCeilingTimer === undefined) {
      let remainingMs = requestedAt + deferShutdown.maxMs - Date.now();
      deferCeilingTimer = setTimeout(onDeferCeiling, Math.min(Math.max(0, remainingMs), 2147483647));
    }
    logFeatureOk("self_hosted_defer_shutdown");
    if (retiring) {
      onStatus(
        "[runner:shutdown] shutdown requested while already retiring \u2014 sessions are already being released",
      );
      return;
    }
    retiring = true;
    retireReason = "shutdown";
    onStatus(
      `[runner:shutdown] shutdown requested \u2014 deferring drain: ${activeSessions.size} active session(s), refusing new work; ` +
        (sessionIdleMs > 0
          ? `each is released once its user has been idle ${formatDuration(sessionIdleMs, {
              hideTrailingZeros: true,
            })} (--release-idle-session-min) or when it ends`
          : describeIdleRelease()) +
        `; ${formatDuration(deferShutdown.maxMs, {
          hideTrailingZeros: true,
        })} after the signal every session still attached is released at once; exiting as soon as the slots are empty`,
    );
    pollWaker.wake("LOCAL");
  };
  let onDeferCeiling = () => {
    deferCeilingTimer = undefined;
    if (deferShutdown === undefined || signal.aborted) return;
    deferCeilingPassed = true;
    let size = declinedSessions.size;
    if (size > 0) {
      declinedSessions.clear();
      pollWaker.wake("LOCAL");
    }
    let liveCount = liveSessionCount();
    let reportDropped = () => {
      if (size > 0)
        onStatus(
          `[runner:shutdown] ${size} declined session(s) held for re-spawn dropped at the ceiling \u2014 requeued at exit instead`,
        );
    };
    if (liveCount === 0 && releaseInFlightCount() === 0) {
      reportDropped();
      return;
    }
    logFeatureOk("self_hosted_defer_ceiling");
    onStatus(
      `[runner:shutdown] defer ceiling reached (${formatDuration(deferShutdown.maxMs, {
        hideTrailingZeros: true,
      })}) \u2014 ` +
        (liveCount > 0
          ? `releasing the remaining ${liveCount} session(s) now`
          : `waiting on ${releaseInFlightCount()} in-flight release(s)`) +
        `; any still attached after ${formatDuration(ceilingWaitMs + ceilingGraceMsOverride, {
          hideTrailingZeros: true,
        })} will be drained`,
    );
    reportDropped();
    for (let session of activeSessions.values()) session.releaseForShutdown();
    let graceLeftMs = ceilingGraceMsOverride;
    let pollPostCeilingGrace = () => {
      postCeilingPollTimer = undefined;
      if (signal.aborted) return;
      let attachedNow = liveSessionCount();
      let inFlightNow = releaseInFlightCount();
      if (attachedNow === 0 && inFlightNow === 0) return;
      if (graceLeftMs > 0) {
        graceLeftMs -= ceilingPollStepMs;
        postCeilingPollTimer = setTimeout(pollPostCeilingGrace, ceilingPollStepMs);
        return;
      }
      onStatus(
        `[runner:shutdown] ${attachedNow + inFlightNow} session(s) still attached after the post-ceiling grace \u2014 falling back to a drain`,
      );
      deferShutdown.requestDrain("post-ceiling grace expired with sessions still attached");
    };
    postCeilingPollTimer = setTimeout(pollPostCeilingGrace, ceilingWaitMs);
  };
  if (retireAtMs > 0) {
    let untilRetireMs = retireAtMs - Date.now();
    onStatus(
      untilRetireMs > 0
        ? `[runner:retire] retire time set for ${new Date(retireAtMs).toISOString()} (in ${formatDuration(untilRetireMs)}) \u2014 sessions will be released and the runner will exit then`
        : `[runner:retire] retire time ${new Date(retireAtMs).toISOString()} is already in the past \u2014 refusing work and exiting`,
    );
    scheduleRetire();
  }
  if (deferShutdownEnabled && deferShutdown !== undefined)
    if (deferShutdown.signal.aborted) onShutdownSignal();
    else
      deferShutdown.signal.addEventListener("abort", onShutdownSignal, {
        once: true,
      });
  try {
    while (!signal.aborted) {
      if (retiring && attachedCount() === 0) {
        onStatus(exitReasonText());
        return;
      }
      if (drainGraceMs === 0 && workloadDrained_2 && attachedCount() === 0) {
        onStatus(
          `[runner:exit] account workload drained \u2014 exiting (grace=0, no re-poll). ${restartHint}`,
        );
        return;
      }
      let freeSlots = retiring ? 0 : Math.max(0, config.capacity - attachedCount());
      let wakeSource = pollWaker.consume();
      if (wakeSource === "SSE") {
        await sleep(Math.floor(Math.random() * MAX_SERVER_MESSAGE_CHARS), signal);
        if (signal.aborted) break;
      }
      let pollStartedAt = pollOkLogged;
      let assignmentIds;
      try {
        let pollResult = await apiClient.pollWork(
          tokenState.runnerToken,
          runnerId,
          freeSlots,
          signal,
          sseHintsEnabled ? POLL_WAKE_SOURCES[wakeSource] : undefined,
        );
        assignmentIds = pollResult.assignment_ids;
        clientPlatforms.clear();
        let hintsStream = new Set();
        for (let assignment of pollResult.session_assignments ?? []) {
          if (!assignment || typeof assignment.session_id !== "string" || !assignment.session_id) continue;
          activeSessions.get(assignment.session_id)?.onTurnSignal(parseTurnSignal(assignment.turn_signal));
          hintsStream.add(assignment.session_id);
          if (
            typeof assignment.client_platform === "string" &&
            assignment.client_platform &&
            METRIC_NAME_RE.test(assignment.client_platform)
          )
            clientPlatforms.set(assignment.session_id, assignment.client_platform);
          else if (
            typeof assignment.client_platform === "string" &&
            assignment.client_platform &&
            !badPlatformSessions.has(assignment.session_id)
          ) {
            if (badPlatformSessions.size > 256) badPlatformSessions.clear();
            badPlatformSessions.add(assignment.session_id);
            onDebug(
              `[runner:session] assignment client_platform rejected by the charset gate (label falls back to "unknown"): "${escapeMetricValue(assignment.client_platform)}" (len=${assignment.client_platform.length}, session=${escapeMetricValue(assignment.session_id)})`,
            );
          }
        }
        notifyMissingTurnSignals(hintsStream);
        leaseExpiresAt = pollResult.lease_expires_at;
        suggestedPollMs = pollResult.suggested_poll_interval;
        pollOkLogged = Date.now();
        notFoundCount = 0;
        transportFailureCount = 0;
        if (pollFailNotLogged || pollOkNotLogged) {
          logFeatureOk("self_hosted_poll");
          pollFailNotLogged = false;
          pollOkNotLogged = false;
        }
        if (healthState) {
          healthState.lastPollAt = pollOkLogged;
          healthState.activeSessions = activeSessions.size;
        }
      } catch (error) {
        if (signal.aborted) break;
        let errorClass = classifyRunnerError(error);
        if (healthState) healthState.pollErrors[errorClass]++;
        notifyMissingTurnSignals();
        let errorText = error instanceof Error ? error.message : String(error);
        if (isAuthFailure(error)) {
          logFeatureBad("self_hosted_poll", "self_hosted_poll_auth_failed");
          onStatus(`[runner:fatal] poll auth failed \u2014 token expired or revoked. ${drainMessage}`);
          fatalExit = true;
          break;
        }
        if (isNotFoundError(error)) {
          notFoundCount++;
          if (notFoundCount >= 3) {
            logFeatureBad("self_hosted_poll", "self_hosted_poll_runner_not_found");
            onStatus(
              `[runner:fatal] poll returned 404 ${notFoundCount}\xD7 \u2014 runner record gone server-side. ${drainMessage}`,
            );
            fatalExit = true;
            break;
          }
          let min = Math.min(
            MAX_HEALTH_PROBE_BACKOFF_MS,
            HEALTH_PROBE_INTERVAL_MS * 2 ** (notFoundCount - 1),
          );
          let floored = Math.floor(Math.random() * min);
          onStatus(
            `Poll failed: ${errorText} \u2014 confirming 404 (${notFoundCount}/3), retrying in ${(floored / 1000).toFixed(1)}s`,
          );
          await sleep(options.pollIntervalOverrideMs ?? floored, signal);
          continue;
        }
        notFoundCount = 0;
        if (pollFailNotLogged || !pollOkNotLogged) {
          logFeatureSad("self_hosted_poll", "self_hosted_poll_failed");
          pollFailNotLogged = false;
          pollOkNotLogged = true;
        }
        let retryDelayMs;
        if (errorClass === "timeout" || errorClass === "transport") {
          transportFailureCount++;
          retryDelayMs = backoffDelayMs(transportFailureCount, leaseExpiresAt, suggestedPollMs);
        } else if (errorClass === "5xx")
          retryDelayMs = clampToLeaseExpiry(
            DEFAULT_POLL_INTERVAL_MS,
            leaseExpiresAt,
            LEASE_5XX_RETRY_DELAY_MS,
            suggestedPollMs,
          );
        else retryDelayMs = DEFAULT_POLL_INTERVAL_MS;
        onStatus(`Poll failed: ${errorText} \u2014 retrying in ${(retryDelayMs / 1000).toFixed(1)}s`);
        await sleep(options.pollIntervalOverrideMs ?? retryDelayMs, signal);
        continue;
      }
      let filtered = assignmentIds.filter((sessionId) => !stuckSessions.has(sessionId));
      if (filtered.length === 0 && attachedCount() === 0) {
        idleSince_2 ??= Date.now();
        let idleForMs = Date.now() - idleSince_2;
        if (workloadDrained_2) {
          if (idleForMs >= drainGraceMs) {
            onStatus(
              retiring
                ? exitReasonText()
                : drainGraceMs > 0
                  ? `[runner:exit] account workload drained ${Math.round(idleForMs / 1000)}s ago (grace ${Math.round(drainGraceMs / 1000)}s) \u2014 exiting for fresh disk. ${restartHint}`
                  : `[runner:exit] account workload drained \u2014 exiting for fresh disk. ${restartHint}`,
            );
            return;
          }
        } else if (idleShutdownMs > 0 && idleForMs >= idleShutdownMs) {
          onStatus(
            `[runner:exit] idle ${Math.round(idleForMs / 60000)}min with no work \u2014 exiting for autoscaler scale-down`,
          );
          return;
        }
      } else idleSince_2 = null;
      let drainNow = drainGraceMs === 0 && workloadDrained_2 && attachedCount() === 0;
      if (filtered.length > 0) workloadDrained_2 = true;
      let assignedNow = new Set(assignmentIds);
      for (let [sessionId, entry] of activeSessions)
        if (!assignedNow.has(sessionId)) {
          onStatus(
            `[runner:session] ${sessionId} deassigned by server (deleted/archived/requeued) \u2014 aborting child`,
          );
          entry.controller.abort(releaseInFlight.has(sessionId) ? "idle-release" : "deassign");
        }
      for (let sessionId of releaseInFlight)
        if (!assignedNow.has(sessionId)) releaseInFlight.delete(sessionId);
      for (let key of releaseFailures.keys()) if (!assignedNow.has(key)) releaseFailures.delete(key);
      for (let sessionId of declinedSessions)
        if (!assignedNow.has(sessionId) || stuckSessions.has(sessionId)) declinedSessions.delete(sessionId);
      for (let sessionId of releaseRetryPending)
        if (!assignedNow.has(sessionId)) releaseRetryPending.delete(sessionId);
      for (let key of idleSinceBySession.keys())
        if (
          !activeSessions.has(key) &&
          !declinedSessions.has(key) &&
          !releaseTasks.has(key) &&
          !releaseRetryPending.has(key)
        )
          idleSinceBySession.delete(key);
      for (let sessionId of filtered) {
        if (activeSessions.has(sessionId)) {
          onDebug(`[runner:main] Ignoring duplicate assignment for ${sessionId}`);
          continue;
        }
        if (stuckSessions.has(sessionId)) {
          declinedSessions.delete(sessionId);
          onDebug(`[runner:main] Ignoring stuck session ${sessionId} \u2014 already failed, not re-spawning`);
          continue;
        }
        if (failureReportInFlight.has(sessionId)) {
          onDebug(`[runner:main] Ignoring session ${sessionId} \u2014 failure report in-flight`);
          continue;
        }
        if (releaseInFlight.has(sessionId) || releaseTasks.has(sessionId)) {
          onDebug(
            `[runner:main] Ignoring released session ${sessionId} \u2014 awaiting server deassign (or its in-flight release to settle)`,
          );
          continue;
        }
        let serveDuringShutdown = retiring && retireReason === "shutdown" && !deferCeilingPassed;
        if (retiring && !serveDuringShutdown) {
          let skipMessage =
            retireReason === "shutdown"
              ? `[runner:shutdown] not starting session ${sessionId} \u2014 shutdown requested and the defer ceiling has passed; it will be requeued when this runner exits`
              : `[runner:retire] not starting session ${sessionId} \u2014 retire time has passed; it will be requeued when this runner exits`;
          if (refusedNotified.has(sessionId)) onDebug(skipMessage);
          else {
            refusedNotified.add(sessionId);
            onStatus(skipMessage);
          }
          declinedSessions.delete(sessionId);
          continue;
        }
        if (serveDuringShutdown)
          onStatus(
            declinedSessions.has(sessionId)
              ? `[runner:shutdown] ${sessionId} re-spawning after its declined release to serve the pending user event; it is released again like the others (its idle clock, or the ceiling)`
              : `[runner:shutdown] ${sessionId} was assigned after the shutdown signal \u2014 serving it; it is released like the others (its idle clock, or the ceiling)`,
          );
        let respawnedDeclined = declinedSessions.delete(sessionId);
        if (!releaseRetryPending.delete(sessionId) && !respawnedDeclined)
          idleSinceBySession.delete(sessionId);
        pickedUpCount++;
        onStatus(`Picked up session ${sessionId} (${activeSessions.size + 1}/${config.capacity} active)`);
        let abortController_2 = new AbortController();
        let sessionId_2 = sessionId.replace(/^cse_/, "session_");
        let platform_2 = clientPlatforms.get(sessionId) ?? UNKNOWN;
        healthState?.sessionIdle.set(sessionId_2, null);
        healthState?.sessionClientPlatform.set(sessionId_2, platform_2);
        let now = Date.now();
        healthState?.claimVisibility?.set(sessionId_2, {
          pickedUpAt: now,
        });
        let standbyIdleMs = activeSessions.size === 0 ? now - takeStartCommandPhases : undefined;
        if (healthState) {
          for (let counter of [
            healthState.sessionsStarted,
            healthState.sessionsCompleted,
            healthState.sessionsFailed,
            healthState.sessionsInterrupted,
          ])
            if (!counter.has(platform_2)) counter.set(platform_2, 0);
        }
        let idleTimer;
        let loggedStartupRestart = false;
        let idleSinceAt = idleSinceBySession.get(sessionId);
        let holdLookToken;
        let holdAnnounced = false;
        let holdReleasedAnnounced = false;
        let sessionEnding = false;
        let turnInFlight = false;
        let setTurnInFlight = (inFlight) => {
          turnInFlight = inFlight;
          let entry = activeSessions.get(sessionId);
          if (entry !== undefined) entry.turnInFlight = inFlight;
          wakeEpochTimer?.();
        };
        let turnDeferred = false;
        let lastActivityKind;
        let sawTurnInFlight;
        let pollIntervalMs = sessionIdleMs;
        let wakeDelayMs = 0;
        let platformsBySession;
        let notFoundCount;
        let transportFailureCount;
        let leaseExpiresAt = 0;
        let suggestedPollMs;
        let failureReports = false;
        let canonicalLocksByPath = false;
        let spawnedSessionIdSet = false;
        let releaseRequested = false;
        let releaseReason = "retire";
        let reasonPhrase = () =>
          releaseReason === "shutdown"
            ? "defer ceiling passed"
            : releaseReason === "max-age"
              ? "max session age reached"
              : "retire time passed";
        let whilePhrase = () =>
          releaseReason === "shutdown"
            ? "while shutting down"
            : releaseReason === "max-age"
              ? "while at max session age"
              : "while retiring";
        let gracePhrase = () =>
          releaseReason === "shutdown"
            ? "shutdown grace"
            : releaseReason === "max-age"
              ? "max-session-age grace"
              : "retire grace";
        let releaseAttempts = 0;
        let releaseFailureStreak = 0;
        let bgDrainTimer;
        let stopBgDrainTimer = () => {
          if (bgDrainTimer !== undefined) {
            clearTimeout(bgDrainTimer);
            bgDrainTimer = undefined;
          }
        };
        let childTerminating = false;
        let sessionEnded = () => sessionEnding || abortController_2.signal.aborted || childTerminating;
        let settleHoldArmed = false;
        let onTurnSettled = () => {};
        let onTurnSettledWith = (ledger) => {};
        let idleDeferTimer;
        let idleDeferSteps = [1800000, 7200000, 28800000];
        let stopIdleDefer = () => {
          if (idleDeferTimer !== undefined) {
            clearTimeout(idleDeferTimer);
            idleDeferTimer = undefined;
          }
        };
        let deferIdleClock = (ledger, step) => {
          let liveTasks = ledger?.liveTasks ?? 0;
          let joined = (ledger?.liveTaskIds ?? []).slice(0, 5).join(",");
          let wakeupNote =
            ledger?.wakeupInMs !== undefined
              ? `wakeup pending in ${formatDuration(ledger.wakeupInMs)}`
              : undefined;
          let followupNote = ledger?.bgResultAwaitingFollowup
            ? "finished background task awaiting the follow-up turn"
            : undefined;
          let filtered = [
            liveTasks > 0
              ? `${liveTasks} background task(s) live [${joined}${liveTasks > 5 ? ",\u2026" : ""}]`
              : undefined,
            wakeupNote,
            followupNote,
          ].filter(Boolean);
          let reasonText = filtered.length > 0 ? filtered.join(" / ") : "planned resumption";
          let stillText = step > 0 ? " still" : "";
          onStatus(
            `[runner:session] ${sessionId} turn ended with ${reasonText} \u2014 idle clock${stillText} deferred`,
          );
          if (step < idleDeferSteps.length)
            idleDeferTimer = setTimeout(deferIdleClock, idleDeferSteps[step], ledger, step + 1);
        };
        let stallTimer;
        let onTurnSignal = (onTurnSignal) => {
          if (sessionEnding) return;
          if (onTurnSignal === undefined) {
            stallTimer = undefined;
            healthState?.sessionTurnState.delete(sessionId_2);
          } else if (
            onTurnSignal.state !== stallTimer?.state ||
            onTurnSignal.workerEpoch !== stallTimer.workerEpoch ||
            onTurnSignal.act !== stallTimer.act
          ) {
            stallTimer = onTurnSignal;
            healthState?.sessionTurnState.set(sessionId_2, onTurnSignal.state);
            onStatus(
              `[runner:session] ${sessionId} turn state from the server: ${onTurnSignal.state} (worker epoch ${onTurnSignal.workerEpoch}, ${onTurnSignal.act ? "acting on it" : "report only"})`,
            );
          }
          tick(onTurnSignal);
        };
        let turnActive = false;
        let turnState;
        let busySince;
        let idleBeats = 0;
        let noteIdle = () => {
          turnState = undefined;
          onStatus(
            `[runner:session] ${sessionId} stopped following the server's turn state (it stopped asking, or polls gave no signal): retire and drain no longer wait for a turn`,
          );
          logFeatureSad("self_hosted_turn_signal", "stopped_acting");
          onActivity("turn-end-deferred");
        };
        let onNoTurnSignal = () => {
          busySince ??= Date.now();
          if (!sessionEnded() && turnState?.state === "busy" && Date.now() - busySince >= BUSY_IDLE_MS)
            noteIdle();
        };
        let tick = (signal) => {
          if (!turnActive || sessionEnded()) return;
          if (signal?.act !== true) {
            if (signal === undefined && turnState?.state === "busy" && ++idleBeats < IDLE_BUSY_BEATS) return;
            idleBeats = 0;
            if (turnState !== undefined) noteIdle();
            return;
          }
          idleBeats = 0;
          busySince = undefined;
          if (
            !(turnState !== undefined && signal.workerEpoch !== turnState.workerEpoch) &&
            signal.state === turnState?.state
          )
            return;
          if (turnState === undefined) logFeatureOk("self_hosted_turn_signal");
          turnState = signal;
          onActivity("activity");
          if (signal.state !== "busy") onActivity(TURN_STATE_STATUS_TEXT[signal.state]);
        };
        let onActivity = (kind, details) => {
          if (kind === "startup" && details?.childAlive === true && lastActivityKind !== "startup") {
            onDebug(
              `[runner:session] ${sessionId} ignoring child output as a startup-clock restart: the startup phase is over`,
            );
            return;
          }
          let childSilent = kind === "startup" && details?.childSilent === true;
          if (childSilent && releaseInFlight.has(sessionId)) {
            onDebug(
              `[runner:session] ${sessionId} no child output for ${formatDuration(startupTimeoutMs)}, but a release is already in flight: leaving it to that one`,
            );
            return;
          }
          if (idleTimer !== undefined) {
            clearTimeout(idleTimer);
            idleTimer = undefined;
          }
          leaseExpiresAt++;
          let wasParked = canonicalLocksByPath;
          let wasToolUse = spawnedSessionIdSet;
          canonicalLocksByPath = false;
          spawnedSessionIdSet = false;
          if (kind !== "turn-end") suggestedPollMs = undefined;
          holdLookToken = undefined;
          if (!sessionEnding && healthState)
            if (kind === "turn-end" || (kind === "awaiting-action" && !turnDeferred)) {
              if (healthState.sessionIdle.get(sessionId_2) === null)
                healthState.sessionIdle.set(sessionId_2, Date.now());
            } else healthState.sessionIdle.set(sessionId_2, null);
          if (kind === "init-observed") {
            if (releaseRequested && lastActivityKind !== undefined) onActivity(lastActivityKind);
            return;
          }
          if (kind === "activity") {
            if (lastActivityKind !== "startup") {
              idleSinceAt = undefined;
              idleSinceBySession.delete(sessionId);
              holdAnnounced = false;
              holdReleasedAnnounced = false;
            }
            setTurnInFlight(true);
            turnDeferred = false;
            lastActivityKind = undefined;
            releaseAttempts = 0;
            stopIdleDefer();
            stopBgDrainTimer();
            releaseFailures.delete(sessionId);
            return;
          }
          if (kind === "turn-end-deferred") {
            setTurnInFlight(false);
            turnDeferred = true;
            lastActivityKind = undefined;
            stopIdleDefer();
            onTurnSettled();
            if (sessionEnded()) return;
            if (pollIntervalMs > 0) deferIdleClock(details, 0);
            if (releaseRequested) releaseDeferredTurn();
            return;
          }
          if (kind === "awaiting-action" && turnDeferred) {
            lastActivityKind = undefined;
            return;
          }
          stopIdleDefer();
          stopBgDrainTimer();
          setTurnInFlight(false);
          turnDeferred = false;
          lastActivityKind = kind;
          sawTurnInFlight = details;
          onTurnSettled();
          if (sessionEnded()) return;
          let idleTimeoutMs = childSilent
            ? 0
            : releaseRequested
              ? releaseAttempts === 0
                ? 0
                : retireReleaseRetryMsOverride
              : kind === "startup"
                ? startupTimeoutMs
                : turnState !== undefined
                  ? 0
                  : kind === "turn-end" && details?.promptParked !== true && details?.goesOnUnasked !== true
                    ? wasToolUse
                      ? Math.max(pollIntervalMs, MAX_SESSION_IDLE_MS)
                      : pollIntervalMs
                    : sessionIdleMs;
          let limitNote =
            kind === "turn-end" && !releaseRequested && !platform
              ? " (limit sent by Anthropic's control plane)"
              : "";
          let effectiveMs = releaseRequested ? retireReleaseRetryMsOverride : idleTimeoutMs;
          let whenText = () =>
            releaseRequested
              ? releaseAttempts === 0
                ? "now"
                : `in ${formatDuration(retireReleaseRetryMsOverride)}`
              : `in ${formatDuration(effectiveMs)}`;
          let clockReason = releaseRequested
            ? reasonPhrase()
            : kind === "startup"
              ? `no child output for ${formatDuration(startupTimeoutMs)}`
              : kind === "awaiting-action"
                ? `awaiting user action ${formatDuration(idleTimeoutMs)}`
                : `user idle ${formatDuration(idleTimeoutMs)}`;
          if (!releaseRequested && !childSilent && idleTimeoutMs <= 0) {
            if (kind !== "startup") {
              idleSinceAt = undefined;
              idleSinceBySession.delete(sessionId);
              holdAnnounced = false;
              holdReleasedAnnounced = false;
            }
            if (details?.goesOnUnasked === true && pollIntervalMs > 0) {
              (failureReports ? onDebug : onStatus)(
                `[runner:session] ${sessionId} the idle limit from Anthropic's control plane is not counted: a scheduled prompt or a teammate agent may go on without the user`,
              );
              failureReports = true;
            }
            return;
          }
          if (sessionEnded()) return;
          if (
            kind === "awaiting-action" &&
            details !== undefined &&
            (details.liveTasks > 0 ||
              details.wakeupInMs !== undefined ||
              details.bgResultAwaitingFollowup === true)
          ) {
            let joined = details.liveTaskIds.slice(0, 5).join(",");
            let filtered = [
              details.liveTasks > 0
                ? `${details.liveTasks} background task(s) live [${joined}${details.liveTasks > 5 ? ",\u2026" : ""}]`
                : undefined,
              details.wakeupInMs !== undefined
                ? `wakeup pending in ${formatDuration(details.wakeupInMs)}`
                : undefined,
              details.bgResultAwaitingFollowup === true
                ? "finished background task awaiting the follow-up turn"
                : undefined,
            ].filter(Boolean);
            onStatus(
              `[runner:session] ${sessionId} awaiting user action overrides deferral (${filtered.join(" / ")}) \u2014 idle clock armed`,
            );
          }
          if (!releaseRequested && !childSilent) {
            let startupRestart = kind === "startup" && details?.childAlive === true;
            let clockMessage = `[runner:session] ${sessionId} idle clock armed (${startupRestart ? "startup, restarted by child output" : kind}): releases in ${formatDuration(
              idleTimeoutMs,
              {
                hideTrailingZeros: true,
              },
            )} at ${new Date(Date.now() + idleTimeoutMs).toISOString()} unless new activity arrives${limitNote}`;
            if (wasParked) onDebug(clockMessage);
            else if (!startupRestart) onStatus(clockMessage);
            else if (loggedStartupRestart) onDebug(clockMessage);
            else {
              loggedStartupRestart = true;
              onStatus(`${clockMessage} (later restarts are logged at debug)`);
            }
          }
          if (
            releaseRequested &&
            releaseAttempts === 0 &&
            activeSessions.get(sessionId)?.postTurnSettling === true
          ) {
            onStatus(
              `[runner:session] ${sessionId} ${reasonPhrase()} \u2014 release held until the finished turn has been reported to the server (at most SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS, default ${POST_TURN_SETTLE_MS / 1000}s)`,
            );
            return;
          }
          if (!releaseRequested && kind !== "startup") {
            idleSinceAt ??= Date.now();
            idleSinceBySession.set(sessionId, idleSinceAt);
          }
          let fireIdleRelease = (skipHold = false, settle = false) => {
            idleTimer = undefined;
            if (sessionEnded()) return;
            if (releaseInFlight.has(sessionId)) return;
            if (turnInFlight) {
              onStatus(
                `[runner:session] ${sessionId} idle timer fired mid-turn \u2014 skipping release (stdout-tee likely broken)`,
              );
              return;
            }
            if (
              !skipHold &&
              holdIdlePath !== undefined &&
              maxHoldMs > 0 &&
              !releaseRequested &&
              kind !== "startup" &&
              idleSinceAt !== undefined
            ) {
              let holdPath = holdIdlePath;
              let maxHoldDeadline = idleSinceAt + maxHoldMs;
              if (Date.now() < maxHoldDeadline) {
                let holdToken = {};
                holdLookToken = holdToken;
                withBoundedTimeout(
                  leftoverHoldLookOverride(holdPath, Date.now()),
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
                  .then((lookResult) => {
                    if (
                      holdLookToken !== holdToken ||
                      idleTimer !== undefined ||
                      sessionEnded() ||
                      turnInFlight ||
                      turnDeferred ||
                      releaseRequested
                    )
                      return;
                    holdLookToken = undefined;
                    let max = Math.max(
                      0,
                      Math.min(leftoverHoldRecheckMsOverride, maxHoldDeadline - Date.now()),
                    );
                    if (lookResult === true) {
                      holdReleasedAnnounced = false;
                      if (!holdAnnounced) {
                        holdAnnounced = true;
                        if (limitNote !== "")
                          logFeatureSad("self_hosted_server_idle_limit", "kept_hold_file");
                        onStatus(
                          `[runner:session] ${sessionId} idle release held: ${holdPath} says a process the session left running still lives \u2014 looking again every ${formatDuration(
                            leftoverHoldRecheckMsOverride,
                            {
                              hideTrailingZeros: true,
                            },
                          )}, until ${new Date(maxHoldDeadline).toISOString()} at most (--max-hold-min)`,
                        );
                      }
                      idleTimer = setTimeout(fireIdleRelease, max, false);
                      return;
                    }
                    let lookFailureText =
                      lookResult === "timed out"
                        ? `looking at ${holdPath} took longer than ${formatDuration(
                            leftoverHoldLookTimeoutMsOverride,
                            {
                              hideTrailingZeros: true,
                            },
                          )}`
                        : typeof lookResult === "object"
                          ? `the look at ${holdPath} failed (${lookResult.failed})`
                          : `${holdPath} is gone, not a regular file, or has not changed in ${formatDuration(
                              HOLD_IDLE_MTIME_FRESH_MS,
                              {
                                hideTrailingZeros: true,
                              },
                            )}`;
                    if (holdAnnounced && !holdReleasedAnnounced) {
                      holdReleasedAnnounced = true;
                      onStatus(
                        `[runner:session] ${sessionId} idle release still held: ${lookFailureText} \u2014 looking once more${limitNote === "" ? " before releasing" : ""}`,
                      );
                      idleTimer = setTimeout(fireIdleRelease, max, false);
                      return;
                    }
                    if (holdAnnounced)
                      onStatus(
                        `[runner:session] ${sessionId} idle release no longer held: ${lookFailureText}`,
                      );
                    else if (lookResult !== false)
                      onStatus(
                        `[runner:session] ${sessionId} idle release not held: ${lookFailureText} \u2014 ${limitNote === "" ? "releasing" : "its checkouts decide whether it is released"}`,
                      );
                    holdAnnounced = false;
                    holdReleasedAnnounced = false;
                    fireIdleRelease(true);
                  })
                  .catch((error) => {
                    onStatus(
                      `[runner:session] ${sessionId} idle release after a look at ${holdPath} failed: ${error instanceof Error ? error.message : String(error)}; the release may not have gone out, and the next turn end or a forced release tries again`,
                    );
                  });
                return;
              }
              if (holdAnnounced) {
                holdAnnounced = false;
                onStatus(
                  `[runner:session] ${sessionId} idle release no longer held: ${formatDuration(maxHoldMs, {
                    hideTrailingZeros: true,
                  })} have passed since ${limitNote === "" ? "the session went idle" : "its idle clock started"} (--max-hold-min)`,
                );
              }
            }
            if (releaseRequested) releaseAttempts++;
            if (limitNote !== "" && activeSessions.get(sessionId)?.postTurnSettling === true) {
              canonicalLocksByPath = true;
              onActivity(kind, details);
              return;
            }
            if (limitNote !== "" && !settle) {
              let idleBeatsAtStart = leaseExpiresAt;
              let checkouts = platformsBySession;
              Promise.all([
                checkoutStates(checkouts ?? [], notFoundCount),
                checkOwnFolder_2(transportFailureCount),
              ])
                .then(([checkoutResult, fetched]) => {
                  if (
                    leaseExpiresAt !== idleBeatsAtStart ||
                    lastActivityKind !== "turn-end" ||
                    turnDeferred ||
                    sessionEnded()
                  )
                    return;
                  if (checkouts !== undefined && checkoutResult.length === 0 && fetched === undefined) {
                    fireIdleRelease(true, true);
                    return;
                  }
                  let mismatchNote =
                    checkouts === undefined
                      ? "the runner does not know its checkouts"
                      : describeWorkLoss(checkoutResult, checkouts.length, fetched);
                  let sameAsBefore = mismatchNote === suggestedPollMs;
                  (sameAsBefore ? onDebug : onStatus)(
                    `[runner:session] ${sessionId} ${clockReason}${limitNote} \u2014 keeping the session: ${mismatchNote}. ` +
                      (checkoutResult.includes("started_by_script") ||
                      fetched === "own_folder_behind_script" ||
                      fetched === "own_folder_not_linux" ||
                      fetched === "own_folder_start_named"
                        ? ""
                        : `The runner checks again in ${formatDuration(
                            Math.max(pollIntervalMs, MAX_SESSION_IDLE_MS),
                            {
                              hideTrailingZeros: true,
                            },
                          )}. `) +
                      `To release idle sessions even when they hold such work, set --release-idle-session-min <minutes>: it checks nothing, so save their work with a post-session hook${fetched === undefined ? ", or with --push-outcome-on-release on every runner of the environment" : ""}.`,
                  );
                  if (!sameAsBefore)
                    logFeatureSad(
                      "self_hosted_server_idle_limit",
                      checkouts === undefined
                        ? "kept_checkouts_unknown"
                        : keptReasonCode(checkoutResult, fetched),
                    );
                  suggestedPollMs = mismatchNote;
                  canonicalLocksByPath = true;
                  spawnedSessionIdSet = true;
                  onActivity(kind, details);
                })
                .catch((error) => {
                  onStatus(
                    `[runner:session] ${sessionId} acting on the check of its checkouts and its own folder at the idle limit from Anthropic's control plane failed: ${error instanceof Error ? error.message : String(error)}. The session stays on this runner with its idle clock stopped until its next turn ends or a different limit arrives; --retire-at, --defer-shutdown-max-min and --kill-session-after-min, where set, still release it.`,
                  );
                  logFeatureBad("self_hosted_server_idle_limit", "acting_on_look_failed");
                });
              return;
            }
            onStatus(`[runner:session] ${sessionId} ${clockReason}${limitNote} \u2014 releasing`);
            if (limitNote !== "") logFeatureOk("self_hosted_server_idle_limit");
            releaseInFlight.add(sessionId);
            if (kind !== "awaiting-action") {
              let liveBgTasks = activeSessions.get(sessionId)?.liveBgTasks ?? 0;
              let orderedRelease = (activeSessions.get(sessionId)?.task ?? Promise.resolve())
                .then(() =>
                  retryReleaseSession({
                    release: () => apiClient.releaseSession(tokenState.runnerToken, sessionId),
                    sessionId,
                    onStatus,
                    stop: abortController.signal,
                  }),
                )
                .then(({ released }) => {
                  releaseTasks.delete(sessionId);
                  releaseInFlight.delete(sessionId);
                  releaseFailures.delete(sessionId);
                  idleSinceBySession.delete(sessionId);
                  if (retiring) pollWaker.wake("LOCAL");
                  if (released) {
                    onStatus(
                      `[runner:session] ${sessionId} released after post-session hook \u2014 parked server-side`,
                    );
                    if (childSilent)
                      logFeatureSad("self_hosted_release_session", "released_true_child_silent");
                    else if (turnInFlight || turnDeferred || liveBgTasks > 0)
                      logFeatureSad("self_hosted_release_session", "released_true_mid_work");
                    else logFeatureOk("self_hosted_release_session");
                    return;
                  }
                  if (retireReason === "shutdown") {
                    let keepForShutdown = !deferCeilingPassed;
                    if (keepForShutdown) declinedSessions.add(sessionId);
                    onStatus(
                      keepForShutdown
                        ? `[runner:session] ${sessionId} released=false after post-session hook (pending user event) while shutting down \u2014 the next poll re-spawns it to serve that event (its idle limit, if it has one, starts over; otherwise it stays until the ceiling)`
                        : `[runner:session] ${sessionId} released=false after post-session hook (pending user event) after the defer ceiling \u2014 not re-spawned; it is requeued, snapshot complete, when this runner exits`,
                    );
                    logFeatureSad("self_hosted_release_session", "released_false_shutting_down");
                    return;
                  }
                  let atMaxAge = releaseRequested && releaseReason === "max-age";
                  onStatus(
                    retiring
                      ? `[runner:session] ${sessionId} released=false after post-session hook (pending user event) while retiring \u2014 not re-spawned; it is requeued, snapshot complete, when this runner exits`
                      : `[runner:session] ${sessionId} released=false after post-session hook (pending user event)${atMaxAge ? " at max session age" : ""} \u2014 respawns on the next poll, or is requeued by this runner's exit if it is draining (grace=0) or retiring`,
                  );
                  logFeatureSad(
                    "self_hosted_release_session",
                    retiring
                      ? "released_false_retiring"
                      : atMaxAge
                        ? "released_false_max_age"
                        : childSilent
                          ? "released_false_child_silent"
                          : "released_false",
                  );
                })
                .catch((error) => {
                  releaseTasks.delete(sessionId);
                  releaseInFlight.delete(sessionId);
                  releaseRetryPending.add(sessionId);
                  if (retireReason === "shutdown" && !deferCeilingPassed) declinedSessions.add(sessionId);
                  if (retiring) pollWaker.wake("LOCAL");
                  let message = error instanceof Error ? error.message : String(error);
                  onStatus(
                    `[runner:session] ${sessionId} ordered release failed after the post-session hook: ${message} \u2014 keeping session; respawns on the next poll, or is requeued by this runner's exit if it is draining (grace=0) or retiring`,
                  );
                  logFeatureBad("self_hosted_release_session", "rpc_failed");
                });
              releaseTasks.set(sessionId, orderedRelease);
              abortController_2.abort("idle-release");
              return;
            }
            let settleRelease = (reason, retryNote) => {
              let ending = sessionEnded();
              let canRetry = !ending && !turnInFlight && !turnDeferred;
              onStatus(
                `[runner:session] ${sessionId} ${reason} \u2014 ${ending ? "not retried, the session is ending on this runner" : `keeping session${canRetry ? `, ${retryNote}` : ""}`}`,
              );
              if (canRetry) onActivity(kind);
            };
            apiClient
              .releaseSession(tokenState.runnerToken, sessionId)
              .then(({ released }) => {
                releaseFailureStreak = 0;
                if (released) {
                  if (sessionEnding || abortController_2.signal.aborted) return;
                  releaseFailures.delete(sessionId);
                  onStatus(`[runner:session] ${sessionId} released \u2014 aborting child`);
                  let liveBgTasks = activeSessions.get(sessionId)?.liveBgTasks ?? 0;
                  abortController_2.abort("idle-release");
                  if (turnInFlight || turnDeferred || liveBgTasks > 0)
                    logFeatureSad("self_hosted_release_session", "released_true_mid_work");
                  else logFeatureOk("self_hosted_release_session");
                  return;
                }
                if (sessionEnding || abortController_2.signal.aborted) return;
                releaseInFlight.delete(sessionId);
                if (releaseRequested) {
                  let declineReason =
                    kind === "awaiting-action"
                      ? "queued event behind the parked prompt"
                      : "pending user event";
                  logFeatureSad(
                    "self_hosted_release_session",
                    releaseReason === "shutdown"
                      ? kind === "awaiting-action"
                        ? "released_false_shutting_down_parked"
                        : "released_false_shutting_down"
                      : releaseReason === "max-age"
                        ? kind === "awaiting-action"
                          ? "released_false_max_age_parked"
                          : "released_false_max_age"
                        : kind === "awaiting-action"
                          ? "released_false_retiring_parked"
                          : "released_false_retiring",
                  );
                  settleRelease(
                    `release declined (${declineReason}) ${whilePhrase()}`,
                    `retrying ${whenText()}`,
                  );
                  return;
                }
                if (kind === "awaiting-action") {
                  logFeatureSad("self_hosted_release_session", "released_false_parked");
                  settleRelease(
                    "released=false while parked at prompt (queued event behind prompt)",
                    "re-arming",
                  );
                  return;
                }
                let declineStreak = (releaseFailures.get(sessionId) ?? 0) + 1;
                releaseFailures.set(sessionId, declineStreak);
                if (declineStreak >= 3) {
                  releaseFailures.delete(sessionId);
                  onStatus(
                    `[runner:session] ${sessionId} released=false ${declineStreak}x \u2014 aborting as backstop`,
                  );
                  abortController_2.abort();
                  logFeatureBad("self_hosted_release_session", "released_false_backstop");
                  return;
                }
                onStatus(
                  `[runner:session] ${sessionId} released=false (pending user event) \u2014 keeping session${turnInFlight || turnDeferred ? "" : ", re-arming"}`,
                );
                logFeatureSad("self_hosted_release_session", "released_false");
                if (!turnInFlight && !turnDeferred) onActivity?.(kind);
              })
              .catch((error) => {
                releaseInFlight.delete(sessionId);
                releaseFailureStreak++;
                let message = error instanceof Error ? error.message : String(error);
                logFeatureBad("self_hosted_release_session", "rpc_failed");
                settleRelease(
                  `releaseSession failed: ${message}${releaseFailureStreak > 1 ? ` (${releaseFailureStreak} failures in a row)` : ""}`,
                  `retrying ${whenText()}`,
                );
              });
          };
          idleTimer = setTimeout(fireIdleRelease, idleTimeoutMs, false);
        };
        let releaseDeferredTurn = () => {
          if (sessionEnded() || !turnDeferred) return;
          let liveBgTasks = activeSessions.get(sessionId)?.liveBgTasks ?? 0;
          if (liveBgTasks === 0 && activeSessions.get(sessionId)?.bgResultPendingFollowup === true) {
            onStatus(
              `[runner:session] ${sessionId} ${reasonPhrase()} while a finished background task's follow-up turn is pending \u2014 waiting for it before releasing`,
            );
            return;
          }
          if (liveBgTasks === 0) {
            onStatus(
              `[runner:session] ${sessionId} ${reasonPhrase()} with only perpetual monitor task(s) / a scheduled wakeup holding the turn \u2014 releasing now`,
            );
            turnDeferred = false;
            stopBgDrainTimer();
            onActivity("turn-end");
            return;
          }
          if (bgDrainTimer !== undefined) return;
          onStatus(
            `[runner:session] ${sessionId} ${reasonPhrase()} with ${liveBgTasks} background task(s) live \u2014 allowing ${formatDuration(retireDeferredGraceMsOverride)} to finish before releasing`,
          );
          bgDrainTimer = setTimeout(() => {
            bgDrainTimer = undefined;
            if (sessionEnded() || !turnDeferred) return;
            let liveBgTasks = activeSessions.get(sessionId)?.liveBgTasks ?? 0;
            let followupPending = activeSessions.get(sessionId)?.bgResultPendingFollowup === true;
            if (liveBgTasks === 0 && followupPending) {
              onStatus(
                `[runner:session] ${sessionId} ${gracePhrase()} elapsed but a finished background task's follow-up turn is pending \u2014 waiting for it before releasing`,
              );
              return;
            }
            onStatus(
              liveBgTasks === 0
                ? `[runner:session] ${sessionId} background work finished during the ${gracePhrase()}; only perpetual monitor task(s) / a scheduled wakeup still hold the turn \u2014 releasing now`
                : `[runner:session] ${sessionId} ${liveBgTasks} background task(s) still live after the ${gracePhrase()} \u2014 releasing anyway (a parked session beats a lost worker)`,
            );
            turnDeferred = false;
            onActivity("turn-end");
          }, retireDeferredGraceMsOverride);
        };
        let requestRelease = (reason) => {
          if (sessionEnding || abortController_2.signal.aborted) return;
          if (childTerminating) {
            onDebug(
              `[runner:session] ${sessionId} ${reason} release request while the child is being terminated \u2014 ignored`,
            );
            return;
          }
          if (releaseRequested) {
            onDebug(
              `[runner:session] ${sessionId} ${reason} release request adds nothing to the standing ${releaseReason} request \u2014 ignored`,
            );
            return;
          }
          releaseRequested = true;
          releaseReason = reason;
          if (lastActivityKind === undefined) {
            if (turnDeferred && !turnInFlight) {
              releaseDeferredTurn();
              return;
            }
            let whenText = turnInFlight
              ? "mid-turn \u2014 releasing as soon as the current turn finishes"
              : "before the child reported an idle state \u2014 releasing on its first idle transition";
            onStatus(`[runner:session] ${sessionId} ${reasonPhrase()} ${whenText}`);
            return;
          }
          onStatus(`[runner:session] ${sessionId} ${reasonPhrase()} while idle \u2014 releasing now`);
          onActivity(lastActivityKind);
        };
        let releaseForRetire = () => requestRelease("retire");
        let releaseForShutdown = () => requestRelease("shutdown");
        let onMaxLifetime = () => {
          if (sessionEnding || abortController_2.signal.aborted) return "kill";
          let decision =
            lastActivityKind !== undefined || (turnDeferred && !turnInFlight) ? "release" : "wait";
          logFeatureOk("self_hosted_max_lifetime", {
            decision: fromEnum(decision),
          });
          requestRelease("max-age");
          return decision;
        };
        let onChildTerminating = () => {
          if (childTerminating) return;
          childTerminating = true;
          let hadTimer = idleTimer !== undefined || bgDrainTimer !== undefined;
          if (idleTimer !== undefined) {
            clearTimeout(idleTimer);
            idleTimer = undefined;
          }
          stopBgDrainTimer();
          if (hadTimer || releaseRequested)
            onDebug(
              `[runner:session] ${sessionId} child is being terminated \u2014 release clock stood down`,
            );
        };
        let restartedHere = respawnedDeclined && pendingRestart?.id === sessionId;
        let effectiveExecPath =
          restartedHere && pendingRestart?.onUpdateBuild === true ? childUpdateBin : undefined;
        pendingRestart = undefined;
        let task = (options.handleSession ?? handleSelfHostedSession)(
          sessionId,
          {
            apiClient,
            getRunnerToken: () => tokenState.runnerToken,
            baseDir: config.baseDir,
            execPath:
              effectiveExecPath !== undefined && execPath === process.execPath ? effectiveExecPath : execPath,
            execArgs: effectiveExecPath !== undefined ? [] : execArgs,
            updatedChildBin: effectiveExecPath,
            restartedHere,
            childUpdateBin,
            onChildUpdateReady: () => {
              settleHoldArmed = true;
              onTurnSettled();
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
            hostConfig: options.hostConfig,
            governedGitConfigSeed: options.governedGitConfigSeed,
            onDebug,
            onStatus,
            onSessionActivity: onActivity,
            onMaxLifetime,
            onChildTerminating,
            onCheckouts: (products, platforms) => {
              platformsBySession = products;
              notFoundCount = platforms;
            },
            onOwnFolder: (folder) => {
              transportFailureCount = folder;
            },
            onServerIdleLimit: (limit) => {
              if (limit === wakeDelayMs || sessionEnded()) return;
              wakeDelayMs = limit;
              let limitValue = limit ?? 0;
              let limitText = formatDuration(limitValue, {
                hideTrailingZeros: true,
              });
              if (platform) {
                if (limitValue > 0)
                  onDebug(
                    `[runner:session] ${sessionId} Anthropic's control plane sent an idle limit of ${limitText}; the operator's --release-idle-session-min setting wins`,
                  );
                return;
              }
              if (limit === undefined) {
                logFeatureSad("self_hosted_server_idle_limit", "unusable_value");
                onDebug(
                  `[runner:session] ${sessionId} the idle limit that Anthropic's control plane sent is not a number of minutes from 0.1 to 10080: the session has no idle limit`,
                );
              }
              if (limitValue === pollIntervalMs) return;
              pollIntervalMs = limitValue;
              suggestedPollMs = undefined;
              failureReports = false;
              holdReleasedAnnounced = false;
              onStatus(
                limitValue > 0
                  ? `[runner:session] ${sessionId} idle limit ${limitText} from Anthropic's control plane: once its user has sent nothing for ${limitText} after a finished turn, the session is released only if its checkouts hold no uncommitted changes and are still at the commit that the runner checked out, and its own folder under --base-dir/_sessions holds only what the runner put there. The runner checks that folder only on Linux, and keeps the session on any other system.${drainGraceMs === 0 ? " This runner exits once its last session is released (--drain-grace-sec 0), so something has to start the next one." : ""} Set --release-idle-session-min to choose your own limit, or to 0 to keep idle sessions.${holdIdlePath !== undefined && maxHoldMs > 0 && maxHoldMs <= limitValue ? ` --hold-idle-file holds nothing at this limit, because --max-hold-min is not longer than ${limitText}: raise it for the file to hold.` : ""}`
                  : `[runner:session] ${sessionId} the idle limit from Anthropic's control plane no longer applies: the session is not released for being idle`,
              );
              if (lastActivityKind === "turn-end" && !releaseRequested)
                onActivity("turn-end", sawTurnInFlight);
            },
            onToolServerReady: () => {
              turnActive = true;
            },
            clientPlatform: platform_2,
            onChildLifecycle: healthState
              ? (lifecycleKind) => {
                  let counter =
                    lifecycleKind === "spawned"
                      ? healthState.sessionsStarted
                      : lifecycleKind === "completed"
                        ? healthState.sessionsCompleted
                        : lifecycleKind === "failed"
                          ? healthState.sessionsFailed
                          : healthState.sessionsInterrupted;
                  counter.set(platform_2, (counter.get(platform_2) ?? 0) + 1);
                }
              : undefined,
            onInitPhase: healthState
              ? (phase) => {
                  switch (phase.kind) {
                    case "start":
                      healthState.initializingSessions++;
                      break;
                    case "end":
                      healthState.initializingSessions--;
                      observeHistogram(healthState.sessionInitDurations, phase.durationSec);
                      break;
                    case "exit-before-init":
                      healthState.initializingSessions--;
                      if (phase.failed) healthState.sessionInitErrors++;
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
            takeStartCommandPhases: idleSince,
            getHealthzClaimVisibleMs: () => healthState?.claimVisibility?.get(sessionId_2)?.visibleMs,
            moveWatch: options.moveWatch,
            ...false,
            onSessionTokenIssued: (jwt) => {
              if (healthState && healthState.lockedAccountEmail === null) {
                let sessionIdFromJwt = getSessionIdFromJwt(jwt);
                if (sessionIdFromJwt !== null) healthState.lockedAccountEmail = sessionIdFromJwt;
              }
            },
            canonicalLocks: spawnedIds,
            spawnedSessionIds: unannouncedSkipCount,
            postSessionHookTimeoutMs,
            checkoutHookTimeoutMs,
            pushOutcomeOnRelease: config.pushOutcomeOnRelease,
            trustWorkspace: config.trustWorkspace,
            removeSessionState: config.removeSessionState,
            diffFindsNestedRepository: config.diffFindsNestedRepository,
            freshMachinePerSession: config.freshMachinePerSession,
            confineRepoSettings: config.confineRepoSettings,
            serverAutoModeLists: config.serverAutoModeLists,
            onBgTaskLedger: (liveBgTasks) => {
              let entry = activeSessions.get(sessionId);
              if (entry) entry.liveBgTasks = liveBgTasks;
              wakeEpochTimer?.();
            },
            onBgFollowupPending: (hasPendingFollowup, isSettled) => {
              let entry = activeSessions.get(sessionId);
              if (entry) entry.bgResultPendingFollowup = hasPendingFollowup;
              wakeEpochTimer?.();
              if (!hasPendingFollowup && !isSettled && releaseRequested && turnDeferred)
                releaseDeferredTurn();
            },
            onPostTurnSettle: (isSettling, isSettled) => {
              let entry = activeSessions.get(sessionId);
              if (entry) entry.postTurnSettling = isSettling;
              wakeEpochTimer?.();
              if (!isSettling && !isSettled) onTurnSettled();
              if (
                !isSettling &&
                !isSettled &&
                releaseRequested &&
                releaseAttempts === 0 &&
                lastActivityKind !== undefined
              )
                onActivity(lastActivityKind);
            },
            debugTokenDir: options.debugTokenDir,
          },
          abortController_2.signal,
        )
          .then((outcome) => {
            let { result, failureReason, setupFailureKind, failureKind } = outcome;
            if (failureReason)
              onStatus(`Session ${sessionId} finished: ${result} \u2014 reason: ${failureReason}`);
            else onStatus(`Session ${sessionId} finished: ${result}`);
            if (outcome.reviewDone && !releaseInFlight.has(sessionId) && !releaseTasks.has(sessionId)) {
              releaseInFlight.add(sessionId);
              let serverHint =
                "If the server still has it assigned, it is started once more; that start is refused and reported as a failed session. Nothing on this runner needs changing.";
              releaseTasks.set(
                sessionId,
                retryWithBackoff(() => apiClient.releaseSession(tokenState.runnerToken, sessionId), {
                  initialDelayMs: 500,
                  maxDelayMs: 2000,
                  maxAttempts: 3,
                  shouldRetry: isRetryableRunnerError,
                })
                  .then((granted) => {
                    if (granted?.released) {
                      onStatus(
                        `[runner:session] ${sessionId} released after its code review ended; parked server-side`,
                      );
                      logFeatureOk("self_hosted_release_session");
                      return;
                    }
                    releaseInFlight.delete(sessionId);
                    onStatus(
                      `[runner:session] ${sessionId}: the server declined to release this code review after it ended. ${serverHint}`,
                    );
                    logFeatureSad("self_hosted_release_session", "released_false_review_done");
                  })
                  .catch((error) => {
                    releaseInFlight.delete(sessionId);
                    onStatus(
                      `[runner:session] ${sessionId}: could not release this code review after it ended: ${errorMessage(error)}. ${serverHint}`,
                    );
                    logFeatureBad("self_hosted_release_session", "rpc_failed");
                  })
                  .finally(() => {
                    releaseTasks.delete(sessionId);
                    pollWaker.wake("LOCAL");
                  }),
              );
            }
            let isFailure =
              result === "failed" || (result === "interrupted" && !abortController_2.signal.aborted);
            if (isFailure && outcome.failedOnUpdateBuild === true) {
              onTurnSettledWith("build_failed");
              return;
            }
            if (isFailure) {
              failureReportInFlight.add(sessionId);
              let reasonText = failureReason ?? "failed (no reason captured)";
              apiClient
                .reportSessionFailure(
                  tokenState.runnerToken,
                  sessionId,
                  setupFailureKind === "SETUP_FAILURE_KIND_SOURCE_REF_NOT_FOUND"
                    ? reasonText
                    : rewriteContractionError(reasonText),
                  setupFailureKind,
                  failureKind,
                )
                .then((reportResult) => {
                  onStatus(
                    `[runner:session] ${sessionId} failure reported \xB7 excluded_count=${reportResult.excluded_count} stuck=${reportResult.stuck}`,
                  );
                  if (reportResult.stuck) {
                    stuckSessions.add(sessionId);
                    onStatus(
                      `[runner:session] ${sessionId} marked stuck \u2014 will not re-spawn on future polls`,
                    );
                  }
                  logFeatureOk("self_hosted_failure_report");
                })
                .catch((error) => {
                  let message = error instanceof Error ? error.message : String(error);
                  onStatus(
                    `[runner:session] ${sessionId} reportSessionFailure failed: ${message} \u2014 marking stuck to bound respawn`,
                  );
                  stuckSessions.add(sessionId);
                  logFeatureSad("self_hosted_failure_report", "rpc_failed");
                })
                .finally(() => {
                  failureReportInFlight.delete(sessionId);
                });
            }
          })
          .catch((error) => {
            let message = error instanceof Error ? error.message : String(error);
            onStatus(`Session ${sessionId} handler threw: ${message}`);
          })
          .finally(() => {
            sessionEnding = true;
            if (idleTimer !== undefined) {
              clearTimeout(idleTimer);
              idleTimer = undefined;
            }
            stopIdleDefer();
            stopBgDrainTimer();
            if (!releaseTasks.has(sessionId)) releaseInFlight.delete(sessionId);
            releaseFailures.delete(sessionId);
            if (!declinedSessions.has(sessionId) && !releaseTasks.has(sessionId))
              idleSinceBySession.delete(sessionId);
            if (healthState) {
              healthState.sessionIdle.delete(sessionId_2);
              healthState.sessionTurnState.delete(sessionId_2);
              healthState.sessionClientPlatform.delete(sessionId_2);
              healthState.claimVisibility?.delete(sessionId_2);
              dropSessionMetrics(healthState, sessionId_2);
            }
            let wasAtCapacity = activeSessions.size >= config.capacity;
            drainRequested =
              abortController_2.signal.aborted &&
              abortController_2.signal.reason === "idle-release" &&
              !releaseRequested;
            activeSessions.delete(sessionId);
            wakeEpochTimer?.();
            if (healthState) healthState.activeSessions = activeSessions.size;
            if (activeSessions.size === 0) {
              takeStartCommandPhases = Date.now();
              if (retiring) pollWaker.wake("LOCAL");
            }
            if (sseHintsEnabled && wasAtCapacity) pollWaker.wake("LOCAL");
          });
        activeSessions.set(sessionId, {
          task,
          controller: abortController_2,
          liveBgTasks: 0,
          bgResultPendingFollowup: false,
          postTurnSettling: false,
          turnInFlight: false,
          onTurnSignal,
          onNoTurnSignal,
          releaseForRetire,
          releaseForShutdown,
        });
        if (healthState) healthState.activeSessions = activeSessions.size;
      }
      let pollDelayMs = options.pollIntervalOverrideMs ?? nextPollDelayMs(leaseExpiresAt, suggestedPollMs);
      unannouncedSkipCount_2++;
      if (unannouncedSkipCount_2 % hintsRetries === 0) {
        let size = activeSessions.size;
        let jwtExpirySeconds = decodeSessionJwt(tokenState.runnerToken);
        let now = Date.now();
        let pollAgeMs = now - pollStartedAt;
        let tokenExpiresInMs = jwtExpirySeconds !== null ? jwtExpirySeconds * 1000 - now : null;
        let tokenExpiryText =
          tokenExpiresInMs !== null
            ? `${tokenExpiresInMs < 0 ? "-" : ""}${formatDuration(Math.abs(tokenExpiresInMs), {
                mostSignificantOnly: true,
              })}`
            : "unknown";
        let lockedAccountText = healthState?.lockedAccountEmail ?? (workloadDrained_2 ? "yes" : "no");
        onStatus(
          `[runner:health] polling ok \xB7 ${size}/${config.capacity} slots \xB7 last_poll=${pollAgeMs}ms ago \xB7 locked_account=${lockedAccountText} \xB7 runner_token expires in ${tokenExpiryText} \xB7 ${pickedUpCount} sessions handled`,
        );
      }
      if (sseHintsEnabled) pollWaker.atCapacity = retiring || activeSessions.size >= config.capacity;
      await pollWaker.wait(pollDelayMs, signal);
    }
  } finally {
    retireExitPending = true;
    if (retireTimer !== undefined) {
      clearTimeout(retireTimer);
      retireTimer = undefined;
    }
    if (deferCeilingTimer !== undefined) {
      clearTimeout(deferCeilingTimer);
      deferCeilingTimer = undefined;
    }
    if (postCeilingPollTimer !== undefined) {
      clearTimeout(postCeilingPollTimer);
      postCeilingPollTimer = undefined;
    }
    deferShutdown?.signal.removeEventListener("abort", onShutdownSignal);
    signal.removeEventListener("abort", readDrainMarker);
    deferShutdown?.onClosed?.();
    hintsStream?.close();
    moveWatchSub?.();
    let aborted = signal.aborted;
    if (retireReason === "shutdown") readDrainMarker();
    let drainHold;
    let drainTimeoutMs =
      options.drainTimeoutMs ??
      graceSeconds(
        notifyMissing,
        postSessionHookTimeoutMs,
        0,
        config.pushOutcomeOnRelease ? PUSH_ON_RELEASE_TIMEOUT_MS : 0,
        noHybridToken(),
      ) * 1000;
    let isHeartbeatInFlight = false;
    let interval = setInterval(() => {
      if (isHeartbeatInFlight) return;
      isHeartbeatInFlight = true;
      apiClient
        .pollWork(tokenState.runnerToken, runnerId, 0)
        .then((pollResult) => {
          if (healthState) healthState.lastPollAt = Date.now();
          let assignments = new Set();
          for (let assignment of pollResult.session_assignments ?? [])
            if (assignment && typeof assignment.session_id === "string") {
              activeSessions
                .get(assignment.session_id)
                ?.onTurnSignal(parseTurnSignal(assignment.turn_signal));
              assignments.add(assignment.session_id);
            }
          notifyMissingTurnSignals(assignments);
        })
        .catch((error) => {
          if (healthState) healthState.pollErrors[classifyRunnerError(error)]++;
          notifyMissingTurnSignals();
          onDebug(`[runner] shutdown: lease heartbeat failed (best-effort): ${error}`);
        })
        .finally(() => {
          isHeartbeatInFlight = false;
        });
    }, options.shutdownLeaseHeartbeatMs ?? SHUTDOWN_LEASE_HEARTBEAT_MS);
    try {
      if (drainWaitMs > 0 && aborted) {
        let liveBgTaskCount = () =>
          [...activeSessions.values()].reduce((acc, entry) => acc + entry.liveBgTasks, 0);
        let turnInFlightCount = () =>
          [...activeSessions.values()].reduce((acc, entry) => acc + (entry.turnInFlight ? 1 : 0), 0);
        let followupPendingCount = () =>
          [...activeSessions.values()].reduce(
            (acc, entry) => acc + (entry.bgResultPendingFollowup ? 1 : 0),
            0,
          );
        let postTurnSettlingCount = () =>
          [...activeSessions.values()].reduce((acc, entry) => acc + (entry.postTurnSettling ? 1 : 0), 0);
        let pendingWorkSuffix = () =>
          (followupPendingCount() > 0
            ? `, ${followupPendingCount()} finished background task(s) awaiting the follow-up turn`
            : "") +
          (postTurnSettlingCount() > 0
            ? `, ${postTurnSettlingCount()} finished turn(s) still being reported to the server`
            : "");
        let busySessionIds = () =>
          [...activeSessions.entries()]
            .filter(
              ([, entry]) => entry.turnInFlight || entry.liveBgTasks > 0 || entry.bgResultPendingFollowup,
            )
            .map(([sessionId]) => sessionId);
        let hasBusyWork = () => busySessionIds().length > 0 || postTurnSettlingCount() > 0;
        drainHold = {
          outcome: "RUNNER_DRAIN_HOLD_OUTCOME_NOT_NEEDED",
          cap_ms: Math.round(drainWaitMs),
          held_ms: 0,
          busy_session_ids_at_release: [],
        };
        if (hasBusyWork()) {
          let now = Date.now();
          let didCapExpire = false;
          onStatus(
            `[runner] drain-wait: ${turnInFlightCount()} turn(s) in flight, ${liveBgTaskCount()} background task(s) live${pendingWorkSuffix()} across ${activeSessions.size} session(s) \u2014 waiting up to ` +
              `${drainWaitMs / 1000}s before stopping session(s)`,
          );
          await new Promise((resolve) => {
            let wake = () => {
              wakeEpochTimer = undefined;
              resolve();
            };
            let timer = setTimeout(() => {
              didCapExpire = true;
              wake();
            }, drainWaitMs);
            wakeEpochTimer = () => {
              if (!hasBusyWork()) {
                clearTimeout(timer);
                wake();
              }
            };
          });
          let busyIds = busySessionIds();
          drainHold = {
            ...drainHold,
            outcome: didCapExpire
              ? "RUNNER_DRAIN_HOLD_OUTCOME_CAP_EXPIRED"
              : "RUNNER_DRAIN_HOLD_OUTCOME_FINISHED",
            held_ms: Date.now() - now,
            busy_session_ids_at_release: busyIds.slice(0, MAX_REPORTED_BUSY_SESSIONS),
          };
          onStatus(
            !didCapExpire
              ? "[runner] drain-wait: in-flight work finished \u2014 stopping session(s)"
              : `[runner] drain-wait: timed out with ${turnInFlightCount()} turn(s) in flight, ${liveBgTaskCount()} task(s) still live${pendingWorkSuffix()} \u2014 stopping session(s)`,
          );
        }
      }
      for (let { controller } of activeSessions.values()) controller.abort();
      if (activeSessions.size > 0) {
        onStatus(`Draining ${activeSessions.size} active session(s)...`);
        try {
          await withBoundedTimeout(
            Promise.allSettled([...activeSessions.values()].map((entry) => entry.task)),
            drainTimeoutMs,
            "[runner:stuck] drain",
          );
          onStatus("Drain complete");
          logFeatureOk("self_hosted_drain");
        } catch {
          logFeatureBad("self_hosted_drain", "shutdown_budget_exceeded");
          onStatus(
            `[runner] shutdown exceeded ${drainTimeoutMs}ms (session-stop-grace + post-session-hook-timeout` +
              (config.pushOutcomeOnRelease ? " + push-on-release window" : "") +
              ` + ${SIGKILL_GRACE_BASE_MS / 1000}s); force-exiting. The post-session hook had its full budget; post-hook cleanup may have been cut short. ${activeSessions.size} session(s) still active.`,
          );
          await options.flushLogSink?.();
          process.exit(1);
        }
      }
      if (releaseTasks.size > 0) {
        onStatus(
          `[runner] shutdown: waiting for ${releaseTasks.size} in-flight session release(s) to settle before deregistering`,
        );
        await withBoundedTimeout(
          Promise.allSettled([...releaseTasks.values()]),
          RELEASE_IN_FLIGHT_WAIT_MS,
          "[runner:exit] release settle",
        ).catch(() => {
          abortController.abort();
          onStatus(
            `[runner] shutdown: ${releaseTasks.size} session release(s) did not settle within ${RELEASE_IN_FLIGHT_WAIT_MS / 1000}s \u2014 deregistering anyway (those sessions are requeued rather than parked)`,
          );
        });
      }
      await resolved;
    } finally {
      clearInterval(interval);
    }
    let didLogDeregister = false;
    let drainMarkerState = await resolved;
    let reason =
      aborted || retireReason === "shutdown"
        ? drainMarkerState?.present
          ? "host_drain"
          : "shutdown_signal"
        : retiring
          ? "retire_at"
          : drainRequested && !fatalExit
            ? "idle_release"
            : "";
    if (drainHold !== undefined && drainMarkerState?.deadlineMs !== undefined)
      drainHold.host_deadline_unix_s = Math.round(drainMarkerState.deadlineMs / 1000);
    await withBoundedTimeout(
      apiClient
        .deregisterRunner(tokenState.runnerToken, {
          reason,
          drain_hold: drainHold,
        })
        .then(() => {
          onStatus("[runner:exit] Deregistered");
          if (!didLogDeregister) {
            didLogDeregister = true;
            logFeatureOk("self_hosted_deregister");
          }
        })
        .catch((error) => {
          onDebug(`[runner:exit] deregisterRunner failed (best-effort): ${error}`);
          if (!didLogDeregister) {
            didLogDeregister = true;
            logFeatureSad("self_hosted_deregister", "rpc_failed");
          }
        }),
      5000,
      "[runner:exit] deregister",
    ).catch(() => {
      onDebug("[runner:exit] deregisterRunner timed out (best-effort) \u2014 lease expiry will requeue");
      if (!didLogDeregister) {
        didLogDeregister = true;
        logFeatureSad("self_hosted_deregister", "timeout");
      }
    });
  }
}
//@ chunk-asf5gh8x.js:339882-340043 placement
function nextPollDelayMs(leaseExpiresAt, suggestedPollInterval) {
  let leaseExpiresMs = leaseExpiresAt ? Date.parse(leaseExpiresAt) : NaN;
  let leaseBasedMs = Number.isNaN(leaseExpiresMs)
    ? DEFAULT_POLL_INTERVAL_MS
    : Math.max(
        MIN_POLL_INTERVAL_MS,
        Math.min(MAX_POLL_INTERVAL_MS, Math.floor((leaseExpiresMs - Date.now()) / 3)),
      );
  let durationSeconds = parseDurationSeconds(suggestedPollInterval);
  return durationSeconds === undefined ? leaseBasedMs : Math.min(leaseBasedMs, durationSeconds);
}
//@ chunk-asf5gh8x.js:340043-340244 placement
function parseDurationSeconds(text) {
  let match = text === undefined ? null : /^(\d{1,15})(?:\.(\d{1,9}))?s$/.exec(text);
  if (!match) return;
  let fractionNanos = match[2] ? Number(match[2].padEnd(9, "0")) : 0;
  let durationMs = Number(match[1]) * 1000 + Math.floor(fractionNanos / 1e6);
  return durationMs > 0 ? Math.max(MIN_BACKOFF_MS, durationMs) : undefined;
}
//@ chunk-asf5gh8x.js:340244-340362 placement
function backoffDelayMs(attempt, leaseExpiresAt, suggestedPollInterval) {
  let min = Math.min(MAX_POLL_DELAY_MS, HEALTH_PROBE_BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1));
  let floored = Math.floor(min / 2 + Math.random() * (min / 2));
  return clampToLeaseExpiry(floored, leaseExpiresAt, HEALTH_PROBE_BACKOFF_BASE_MS, suggestedPollInterval);
}
//@ chunk-asf5gh8x.js:340362-340513 placement
function clampToLeaseExpiry(delayMs, leaseExpiresAt, minDelayMs, suggestedPollInterval) {
  let leaseLeftMs = leaseExpiresAt === undefined ? NaN : Date.parse(leaseExpiresAt) - Date.now();
  if (!(leaseLeftMs > 0)) return delayMs;
  let min = Math.min(
    leaseLeftMs - LEASE_EXPIRY_POLL_MARGIN_MS,
    parseDurationSeconds(suggestedPollInterval) ?? 1 / 0,
  );
  return Math.min(delayMs, Math.max(minDelayMs, min));
}
//@ chunk-asf5gh8x.js:340513-340694 placement
async function writeRunnerFileBestEffort(debugTokenDir, fileName, contents, onStatus) {
  try {
    await mkdir(debugTokenDir, {
      recursive: true,
      mode: 448,
    });
    await writeFile(`${debugTokenDir}/${fileName}`, contents, {
      mode: 384,
    });
  } catch (error) {
    onStatus(`[runner:debug] failed to write ${fileName} to ${debugTokenDir} (best-effort): ${error}`);
  }
}
export { selfHostedRunnerMain };
