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
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  rm,
  rm as rm_2,
  rm as rm_3,
  writeFile,
  writeFile as writeFile_2,
} from "fs/promises";
import { hostname, hostname as hostname_2, homedir, homedir as homedir_2, homedir as homedir_3 } from "os";
import { join, join as join_2, join as join_3, join as join_4, join as join_5, join as join_6 } from "path";
import {
  HTTPS_API_ANTHROPIC_COM,
  Ou,
  Iu,
  Gt,
  Au,
  Ai,
  Ci,
  Du,
  $i,
  ko,
  Di,
  Nu,
  $u,
  parseRunnerOptions,
  requireBaseDirOnWindows,
  readEnvironmentSecretFile,
  Ni,
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
  _h,
  checkPathNotOnNetworkLocation,
  wh,
  Ch,
  Th,
  HEALTH_PROBE_INTERVAL_MS,
  To,
  Oh,
  mh,
  Sh,
  hh,
  ph,
  gh,
  yh,
  ku,
  bh,
} from "./runnerConfig.js";
import { Tjn, Ajn, proxyAuthorizationConfig, startRunnerEgressProxy } from "./egressProxy.js";
import {
  Us,
  Ss,
  Es,
  wo,
  Ls,
  Lr,
  Ti,
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
  Oa,
  startClockSkewMonitor,
  startRunnerTokenRefresher,
  captureHostConfigSnapshot,
} from "./hostConfigSnapshot.js";
import { withBoundedTimeout, BoundedTimeoutError } from "../../utils/boundedTimeout.js";
import {
  envPositiveMs,
  getDrainWaitMs,
  _s,
  vi,
  si,
  snapshotOperatorGitConfig,
  getStartupTimeoutMs,
} from "./launcherHooks.js";
import { formatDuration } from "../../utils/format.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { createDefaultEnvironment } from "../../commands/remote-setup/api.js";
import { NO_ALLOW } from "../../selfHostedRunner/serverAutoMode.js";
import {
  isRetryableRunnerError,
  NHn,
  classifyRunnerError,
  retryReleaseSession,
} from "../../selfHostedRunner/runnerApiErrors.js";
import {
  describeServerAuthRejection,
  vo,
  PollWaker,
  streamWorkHints,
  wu,
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
  xks,
  Wuo,
  escapeMetricValue,
  Pks,
  dropSessionMetrics,
} from "../../entrypoints/selfHostedRunner/metrics.js";
import { Aa, sleep } from "../../utils/sleep.js";
import { startHealthServer } from "../../selfHostedRunner/healthServer.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { Mln } from "../../selfHostedRunner/git/fetchErrors.js";

/**
 * claude self-hosted-runner 入口：解析参数、检查 base-dir、捕获宿主配置、注册 runner 并进入运行循环（约 52 KB，含 --help 文本）。
 */
//@ chunk-hm0ce8vc.js:236182-288822 placement
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
                              [env: ${Tjn}]
  --proxy-authorization-file <path>
                              Same, but the header value is read from a file (re-read for each new
                              connection, so a file rotated in place is picked up). Set only one of
                              the two. [env: ${Ajn}]
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
  --capacity <n>              Max concurrent sessions (default: ${Ou})
  --base-dir <path>           Base directory for repo checkouts (default: ${Iu};
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
                              after this. Default: ${Us / 1000}.
                              [env: SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS, in ms]
  --post-session-hook-timeout-sec <n>
                              SIGTERM budget for the post-session lifecycle hook, on every session
                              end including runner shutdown. Default: ${Ss / 1000}.
                              [env: SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS, in ms]
  --checkout-hook-timeout-min <n>
                              Wall-clock budget for each run of the checkout lifecycle hook. A hook
                              still running at the budget is stopped (SIGTERM, then SIGKILL) and the
                              session fails setup with a "checkout hook timed out" error instead of
                              staying at "Preparing\u2026". Default: ${Es / 60000}. 0 disables. Max: ${Gt}.
                              [env: SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS, in ms]
  --drain-wait-sec <n>        On SIGTERM/SIGINT, wait up to N seconds for each session's in-flight
                              turn (a foreground tool call) and running background tasks to finish
                              before sending the session process its SIGTERM. Adds N to the
                              advertised shutdown budget.
                              A background task that has JUST finished also counts as
                              in-flight until the follow-up turn that reads its result starts
                              (bounded by SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS, in ms;
                              default: ${wo / 1000}s; 0 or an unusable value falls back
                              to the default \u2014 the hold cannot be disabled).
                              A turn that has JUST finished likewise counts as in flight until
                              the session process has reported its end to the server (bounded by
                              SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS, in ms; default: ${Ls / 1000}s;
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
                              are honored by the child. Default: ${Au}.
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
                              cwd). Default: ${Ai}. Off: they stay on disk until you recycle it,
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
                              Default: ${Ci}.
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
  --health-port <port>        Port for /healthz HTTP listener (default: ${Du}). 0 disables.
                              [env: SELF_HOSTED_RUNNER_HEALTH_PORT]
  --log-level <level>         Log level: info or debug (default: info)
  --log-file <path>           Tee runner logs to a file in append mode. Stdout is unchanged.
                              [env: SELF_HOSTED_RUNNER_LOG_FILE]

Runner lifecycle:
  --exit-if-unused-min <n>    Exit the runner if never assigned work for N min (autoscaler scale-down).
                              Default: never. Max: ${Gt}.
                              [env: SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS, in ms]
  --drain-grace-sec <n>       Default: 0 \u2014 exit immediately after active sessions finish, WITHOUT
                              polling for more (one-shot when --capacity=1).
                              Set a positive value (e.g. 30) to keep the runner warm and re-poll the
                              locked account's queue for that many seconds before exiting.
                              Max: ${$i}. [env: SELF_HOSTED_RUNNER_DRAIN_GRACE_MS, in ms]
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
                              gets up to 60s), and anything STILL attached ${(ko + Lr) / 1000}s later (that 60s + a 15s
                              margin; --drain-wait-sec + 15s if longer) is drained as on a second signal \u2014
                              the one path that requeues instead of parking. The runner exits 0 as soon as
                              it holds no session, before or after M. A SECOND signal drains immediately, as
                              the first does without this flag; a third force-exits (so does a signal during
                              that last-resort drain). READ THIS BEFORE ENABLING: your supervisor sends one
                              SIGTERM and then SIGKILLs at its stop timeout; if that timeout ends first,
                              every still-attached session is killed WITHOUT its post-session hook or
                              deregister and is requeued to another runner about a minute later \u2014 strictly
                              worse than the default drain. So set the stop timeout
                              (terminationGracePeriodSeconds etc.) to at least M minutes + ${(ko + Lr) / 1000}s (that post-ceiling
                              grace; --drain-wait-sec + 15s if longer) + the shutdown budget above \u2014 the runner
                              prints this sum at startup when the flag is set. --startup-timeout-min and
                              --kill-session-after-min keep working unchanged during the wait. Fractional
                              minutes are accepted. Default: 0 (off \u2014 drain on the first signal).
                              Max: ${Gt}. [env: SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS, in ms]

Per-session watchdogs:
  --release-idle-session-min <n>  Release a session slot after N min of no user input (turn finished,
                                  or parked at a permission prompt, user idle). Runner exits if this
                                  drops it to zero active sessions.
                                  Default: never. Max: ${Gt}.
                                  [env: SELF_HOSTED_RUNNER_SESSION_IDLE_MS, in ms]
  --hold-idle-file <path>         Do not release an idle session (--release-idle-session-min) while
                                  <path> is a regular file changed in the last ${Di / 1000}s: your host
                                  keeps it fresh while a process the session left running (nohup,
                                  tmux) lives. Looked at again every ${Nu / 1000}s. Does not hold a
                                  session at startup, at --retire-at, at the --defer-shutdown-max-min
                                  ceiling or at --kill-session-after-min. Default: off.
                                  [env: SELF_HOSTED_RUNNER_HOLD_IDLE_FILE]
  --max-hold-min <n>              With --hold-idle-file: release the session anyway N min after it
                                  went idle. Default: ${$u / 60000}. 0 disables the hold.
                                  Max: ${Gt}. [env: SELF_HOSTED_RUNNER_MAX_HOLD_MS, in ms]
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
                                  Max: ${Gt}.
                                  [env: SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS, in ms]
  --kill-session-after-min <n>    Cap a session child's wall-clock life at N min (runaway backstop).
                                  At the deadline a session that is waiting on its user (idle, parked
                                  at a permission prompt, or still starting up) is RELEASED \u2014 paused
                                  server-side, resumable \u2014 not killed; a turn in flight is released
                                  when it next parks or finishes; a turn still running (or a release
                                  the server keeps declining) is SIGTERMed at the hard cap, 15 min past
                                  the deadline (override: SELF_HOSTED_RUNNER_MAX_LIFETIME_GRACE_MS, in
                                  ms). Default: never. Max: ${Gt}.
                                  [env: SELF_HOSTED_RUNNER_MAX_LIFETIME_MS, in ms]

Debug:
  --debug-token-dir <path>    DEBUG ONLY \u2014 writes live tokens to disk. Do not use in production.
                              [env: SELF_HOSTED_RUNNER_DEBUG_TOKEN_DIR]

  --help, -h                  Show this help message`);
    return;
  }
  configureGlobalAgents();
  let r = () => new Date().toISOString(),
    s,
    a = openStdioWriter({
      stamp: (P) => `${r()} [self-hosted-runner] ${redactSecretsInText(P)}`,
      onOwnLine: (P) =>
        s?.write(
          P +
            `
`,
        ),
    }),
    o,
    l,
    u,
    h;
  try {
    ((o = parseRunnerOptions(e)),
      (u = proxyAuthorizationConfig({
        command: o.proxyAuthorizationCommand,
        file: o.proxyAuthorizationFile,
      })));
    let P = o.envSetByFlag.has("SELF_HOSTED_RUNNER_AGENT_PROXY_URL")
      ? "--agent-proxy-url"
      : "SELF_HOSTED_RUNNER_AGENT_PROXY_URL";
    if (
      ((h = checkRunnerAgentProxyStandaloneUrl(env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL, P)),
      h !== void 0 && u !== void 0)
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${P} cannot be combined with --proxy-authorization-command / --proxy-authorization-file: sessions would reach that proxy without the egress listener. Remove one of the two.`,
        "runner agent proxy URL paired with a --proxy-authorization-* egress listener",
      );
    if (process.env.SELF_HOSTED_RUNNER_HOOKS_DIR) assertLifecycleHooksSupported("--hooks-dir");
    (requireBaseDirOnWindows(o.baseDirSource),
      lockCurrentVersion(),
      (l = await readEnvironmentSecretFile(o, (Z) => a.write("stderr", Z))),
      await checkBaseDirWritable(o.baseDir, void 0, (Z) => a.write("stderr", Z)));
  } catch (error) {
    (a.write(
      "stderr",
      `error: ${redactSecretsInText(errorMessage(error))}
Run 'claude self-hosted-runner --help' for usage.`,
    ),
      process.exit(2));
  }
  let p = o.logLevel === "debug";
  if (o.logFile)
    ((s = createWriteStream(o.logFile, { flags: "a", mode: 384 })),
      s.on("open", (P) => {
        fchmod(P, 384, () => {});
      }),
      s.on("error", (P) => {
        (a.write(
          "stderr",
          `${r()} [runner:warn] log-file write failed (${errorMessage(P)}); continuing stdout-only`,
        ),
          (s = void 0));
      }));
  let S = (P) => {
      s?.write(
        P +
          `
`,
      );
    },
    T = async () => {
      if (!s) return;
      let P = s;
      ((s = void 0),
        await withBoundedTimeout(new Promise((Z) => P.end(Z)), 500, "[runner:exit] log-file flush").catch(
          () => {},
        ));
    },
    y = (P) => {
      if (p) {
        let Z = `${r()} [DEBUG] ${redactSecretsInText(P)}`;
        (a.write("stderr", Z), S(Z));
      }
    },
    v = (P) => {
      let Z = `${r()} [self-hosted-runner] ${redactSecretsInText(P)}`;
      (a.write("stdout", Z), S(Z));
    };
  if ((y(`[runner:log] ${a.describe()}`), process.env.SELF_HOSTED_RUNNER_SIGKILL_TIMEOUT_MS !== void 0))
    (v(
      "[runner:fatal] SELF_HOSTED_RUNNER_SIGKILL_TIMEOUT_MS was renamed to SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS. It controls how long to wait for the Claude process to exit cleanly after a session ends, before force-killing it. The post-session hook runs after this.",
    ),
      await T(),
      process.exit(1));
  for (let P of [
    "RUNNER_RELEASE_IDLE_SESSION_MIN",
    "SELF_HOSTED_RUNNER_RELEASE_IDLE_SESSION_MIN",
    "SELF_HOSTED_RUNNER_SESSION_IDLE_MIN",
    "SELF_HOSTED_RUNNER_SESSION_IDLE_SEC",
  ])
    if (process.env[P] !== void 0)
      v(
        `[runner:warn] ${P} is set but is not a setting this runner ` +
          "reads \u2014 it is being IGNORED. The session idle-release window " +
          "is configured with --release-idle-session-min <minutes> (or env SELF_HOSTED_RUNNER_SESSION_IDLE_MS, in milliseconds).",
      );
  let w = Ti(
      envPositiveMs("SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS") || Us,
      envPositiveMs("SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS") || Ss,
      getDrainWaitMs(),
      o.pushOutcomeOnRelease ? _s : 0,
      vi(),
    ),
    E = `[runner] This runner needs up to ${w}s to stop the Claude process and run the post-session hook on shutdown, and force-exits after ${w}s (a session release already in flight when shutdown begins can add up to ${Ni / 1000}s, normally well under 1s, before the runner deregisters). Configure your process supervisor's stop timeout to at least ${w}s (e.g. terminationGracePeriodSeconds on Kubernetes, stop_grace_period on Docker Compose, TimeoutStopSec on systemd, or your platform's equivalent).`;
  v(E);
  let A = envPositiveMs("SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS"),
    G = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_IDLE_MS"),
    K = Math.max(getDrainWaitMs(), ko) + Lr,
    L =
      A > 0
        ? `[runner] --defer-shutdown-max-min is set (${formatDuration(A, { hideTrailingZeros: !0 })}): the FIRST shutdown signal does not start that ${w}s budget \u2014 the runner stops ` +
          "taking work but keeps serving the attached sessions; " +
          (G > 0
            ? `each is released (parked, resumable) once its user has been idle ${formatDuration(G, { hideTrailingZeros: !0 })} (--release-idle-session-min)`
            : "none is released early (--release-idle-session-min is not set)") +
          `, and the runner exits as soon as it holds no session; ${formatDuration(A, { hideTrailingZeros: !0 })} after the signal every remaining session is released at once and anything still attached ${formatDuration(K, { hideTrailingZeros: !0 })} later is drained. If your supervisor's stop timeout ends first, every still-attached session is killed WITHOUT its post-session hook or deregister and is requeued to another runner about a minute later. Size the stop timeout to at least ${Math.ceil((A + K) / 1000) + w}s (M + post-ceiling grace + the budget above). A second signal drains immediately.`
        : void 0;
  if (L !== void 0) v(L);
  let D = (P, Z, re, be = !1) => {
      let ee = process.env[P];
      if (ee === void 0 || ee === "")
        return re !== void 0 && re > 0
          ? `${formatDuration(re, { hideTrailingZeros: !0 })} (default)`
          : "disabled (not configured)";
      let Re = o.envSetByFlag.has(P) ? Z : `env ${P}`,
        Ue = envPositiveMs(P);
      if (Ue > 0) return `${formatDuration(Ue, { hideTrailingZeros: !0 })} (from ${Re})`;
      let ht = Number(ee) === 0 && (be !== "unless-zero" || ee.trim() !== "");
      if ((be === !0 || (be === "unless-zero" && !ht)) && re !== void 0 && re > 0) {
        let wn = ht ? "0 is not accepted" : "not a usable ms duration";
        return `${formatDuration(re, { hideTrailingZeros: !0 })} ` + `(default \u2014 ${Re} ignored: ${wn})`;
      }
      return ht
        ? `disabled (from ${Re})`
        : `disabled (from ${Re} \u2014 not a usable ms duration, treated as 0)`;
    },
    oe = () => {
      let P = holdIdleFile();
      if (P === void 0) return "off (--hold-idle-file not set)";
      let envSelfHostedRunnerMaxHoldMs = process.env.SELF_HOSTED_RUNNER_MAX_HOLD_MS,
        re =
          envSelfHostedRunnerMaxHoldMs === void 0 || envSelfHostedRunnerMaxHoldMs.trim() === ""
            ? "default"
            : o.envSetByFlag.has("SELF_HOSTED_RUNNER_MAX_HOLD_MS")
              ? "from --max-hold-min"
              : "from env SELF_HOSTED_RUNNER_MAX_HOLD_MS",
        be = getMaxHoldMs();
      if (be === 0)
        return re === "from --max-hold-min"
          ? "off (--max-hold-min is 0)"
          : "off (env SELF_HOSTED_RUNNER_MAX_HOLD_MS is 0 or not a usable ms duration)";
      let ee = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_IDLE_MS"),
        Re =
          ee === 0
            ? ", but holds nothing while --release-idle-session-min is off"
            : be <= ee
              ? ", but holds nothing: the cap is not longer than --release-idle-session-min"
              : "";
      return `${P}, cap ${formatDuration(be, { hideTrailingZeros: !0 })} (${re})${Re}`;
    };
  v(
    `[runner] watchdog config: idle-release=${D("SELF_HOSTED_RUNNER_SESSION_IDLE_MS", "--release-idle-session-min")}; startup-timeout=${D("SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS", "--startup-timeout-min", si)}; kill-session-after=${D("SELF_HOSTED_RUNNER_MAX_LIFETIME_MS", "--kill-session-after-min")}; exit-if-unused=${D("SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS", "--exit-if-unused-min")}; defer-shutdown-max=${D("SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS", "--defer-shutdown-max-min")}; checkout-hook-timeout=${D("SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS", "--checkout-hook-timeout-min", Es, "unless-zero")}; bg-result-grace=${D("SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS", "SELF_HOSTED_RUNNER_BG_RESULT_GRACE_MS", wo, !0)}; post-turn-settle=${D("SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS", "SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS", Ls, !0)}; leftover-hold=${oe()}; drain-marker-file=${process.env.SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE || "unset"}`,
  );
  let ge =
    o.removeSessionState === Ai
      ? "default"
      : "--remove-session-state / SELF_HOSTED_RUNNER_REMOVE_SESSION_STATE";
  v(
    o.removeSessionState
      ? `[runner] per-session state: REMOVED at session end (${ge}) \u2014 each session's _sessions/<id>.claude-config, .tool-server-config, .uploads, .gitconfig and <id>/ are deleted when it ends, best-effort`
      : `[runner] per-session state: KEPT at session end (${ge}) \u2014 each session's _sessions/<id>.claude-config, .tool-server-config, .uploads, .gitconfig and <id>/ stay under ${o.baseDir} until the disk is recycled`,
  );
  let Ne =
    o.diffFindsNestedRepository === Ci
      ? "the default"
      : "--diff-finds-nested-repository / SELF_HOSTED_RUNNER_DIFF_FINDS_NESTED_REPOSITORY";
  v(
    o.diffFindsNestedRepository
      ? `[runner] changes in a repository cloned into a sub-folder: SHOWN (${Ne}) \u2014 for a session started with no repository, the web session's Changes pane may show one repository under the session's working folder, only while the session's tool sandbox is off; while a repository is in that folder itself or in a folder above it the pane stays empty, sandbox on or off; a refusal is reported, with the session's id and the reason, in a "[changes pane] repository not shown" line in this log`
      : `[runner] changes in a repository cloned into a sub-folder: NOT SHOWN (${Ne}) \u2014 for a session started with no repository, the web session's Changes pane may show only a repository in the session's working folder itself or in a folder above it; --diff-finds-nested-repository shows one in a sub-folder instead; its --help entry says what that costs`,
  );
  let envSelfHostedRunnerHooksDir = process.env.SELF_HOSTED_RUNNER_HOOKS_DIR,
    execPath = o.execPath;
  if (!execPath) {
    let P = await findHook(envSelfHostedRunnerHooksDir, "command");
    if (P) ((execPath = P), v(`[runner:hook] using command hook ${P}`));
  }
  let { execPath: execPath_2, execArgs: execArgs } = runnerExecPath(execPath),
    ae = warnDiffFindsNestedRepository(o.diffFindsNestedRepository, execPath);
  if (ae) v(ae);
  let fe = !1;
  v(
    `Connecting to ${o.apiUrl} (capacity=${o.capacity}, baseDir=${o.baseDir}, execPath=${[execPath_2, ...execArgs].join(" ")})`,
  );
  let $e = warnCapacityOnSessionBoundRunner(l, o.capacity);
  if ($e !== null) v($e);
  if (h !== void 0)
    v(
      `[runner:warn] Every session on this runner goes through the agent proxy at ${h.protocol}//${h.host}. Anthropic-managed git (governed git) sessions go through it too, except on Windows and when the server sends no git setup for them, which are refused. This runner refuses sessions that the environment's relay mode sends through Anthropic's relay. Run refused sessions on a runner started without a proxy URL (--agent-proxy-url / SELF_HOSTED_RUNNER_AGENT_PROXY_URL).` +
        (execPath
          ? " Sessions start through --exec-path or a command hook: the claude it runs must be this version or newer, so keep it updated, and receive SELF_HOSTED_RUNNER_AGENT_PROXY_URL and CCR_AGENT_PROXY_RELAY_MODE, or its sessions connect directly instead. With an older claude, Anthropic-managed git does not run: git and gh fail if its traffic goes through the proxy, or else use this machine's own network access and credentials."
          : ""),
    );
  if (o.debugTokenDir)
    await mkdir(o.debugTokenDir, { recursive: !0, mode: 448 })
      .then(() => {
        v(`[runner:debug] debug token dir ready: ${o.debugTokenDir}`);
      })
      .catch((P) => {
        v(`[runner:debug] failed to create debug token dir (best-effort): ${P}`);
      });
  let Ve;
  if (u)
    try {
      ((Ve = await startRunnerEgressProxy(u, { onStatus: v, onDebug: y })),
        logFeatureOk("self_hosted_egress_proxy_auth"));
    } catch (error) {
      (logFeatureBad("self_hosted_egress_proxy_auth", "listener_start_failed"),
        v(`[runner:fatal] could not start the proxy-authorization listener: ${errorMessage(error)}`),
        await T(),
        process.exit(1));
    }
  let Be = o.capacity === 1 && o.debugTokenDir === void 0 && !execPath ? [CODE_REVIEW_TOKEN_HANDOFF] : [];
  y(`[runner] capabilities reported to the server: ${Be.join(", ") || "none"}`);
  let Fe = createDefaultEnvironment({ baseUrl: o.apiUrl, poolSecret: l, onDebug: y, capabilities: Be }),
    ve = o.clientLabel ?? hostname();
  if (o.lockToAccountId) v(`Registering locked to account: ${o.lockToAccountId}`);
  if (o.useAnthropicGitProxy)
    v("Registering as opted in to Anthropic-managed git (--use-anthropic-git-proxy)");
  if (o.serverAutoModeLists !== NO_ALLOW)
    v(
      `Registering with --server-auto-mode-lists ${o.serverAutoModeLists}: ${SERVER_AUTO_MODE_LISTS_DESCRIPTIONS[o.serverAutoModeLists]}`,
    );
  let Ae, Ht, Mt;
  try {
    ((Mt = await retryWithBackoff(
      () =>
        Fe.registerRunner({
          clientLabel: ve,
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
    )),
      (Ae = Mt.runner_id),
      (Ht = Mt.runner_token),
      logFeatureOk("self_hosted_register"));
  } catch (error) {
    let Z = error instanceof Error ? error.message : String(error),
      re = describeServerAuthRejection(error, l);
    if (re !== null)
      (logFeatureBad("self_hosted_register", "self_hosted_register_work_order_refused"),
        v(`[runner:fatal] ${re}`));
    else if (
      error instanceof Error &&
      "isSelfHostedDisabledByOrg" in error &&
      error.isSelfHostedDisabledByOrg === !0
    )
      (logFeatureBad("self_hosted_register", "self_hosted_register_disabled_by_org"),
        v(
          `[runner:fatal] RegisterRunner refused because self-hosted environments are not enabled for this organization. Usually the 'Allow self-hosted environments' setting on the Cloud environments admin page (claude.ai/admin-settings/cloud-environments) is off, and an organization Owner can turn it on. Self-hosted environments also need a Team or Enterprise plan, and the setting usually applies within a few minutes. If this message still appears after that, contact your Anthropic account team. The environment secret was accepted, so do not rotate it. (${Z})`,
        ));
    else if (isAuthFailure(error))
      (logFeatureBad("self_hosted_register", "self_hosted_register_auth_failed"),
        v(
          `[runner:fatal] RegisterRunner auth failed \u2014 environment secret invalid or revoked. Check --environment-secret-file or SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET. (${Z})`,
        ));
    else {
      logFeatureBad("self_hosted_register", "self_hosted_register_failed");
      let be = validateLockToAccount(Z);
      v(`[runner:fatal] RegisterRunner failed: ${Z}${be}`);
    }
    (await T(), process.exit(1));
  }
  v(`Registered: runner_id=${Ae}`);
  let _n = void 0,
    abortController = new AbortController(),
    sr = void 0,
    Gn = Fe,
    kn = Gn,
    abortController_2 = new AbortController(),
    an = "running",
    or = !0,
    br = {},
    Tn = {},
    On = (P) => {
      let Z = br.current,
        re =
          Z === void 0
            ? "session counts not yet initialized (startup in progress)"
            : `${Z.sessionIdle.size} active session(s), ${count([...Z.sessionIdle.values()], (be) => be !== null)} of them idle`;
      return `(${P}; uptime ${formatDuration(process.uptime() * 1000)}; ${re})`;
    },
    dn = (P) => {
      if (an === "running" && A > 0 && or) {
        if (
          ((an = "deferring"),
          v(
            `Received shutdown signal, deferring drain: refusing new work, serving the attached sessions until they are released or ${formatDuration(A, { hideTrailingZeros: !0 })} passes; a second signal drains immediately ${On(P)}`,
          ),
          v(E),
          L !== void 0)
        )
          v(L);
        abortController_2.abort(Date.now());
        return;
      }
      An(P);
    },
    An = (P, Z = "signal") => {
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
      ((an = "draining"),
        v(
          Z === "signal"
            ? "Received shutdown signal, draining active sessions... " + On(P)
            : `[runner:shutdown] ${P} \u2014 draining active sessions... ` + On("no new signal"),
        ),
        v(E));
      let re = postSessionHooksRunning();
      if (re > 0)
        v(
          `[runner] ${re} post-session hook(s) still running \u2014 waiting for them within the budget above. Another SIGTERM force-exits the runner immediately; make sure your supervisor's stop timeout covers the full budget so hooks are not cut short.`,
        );
      abortController.abort();
    },
    Bt = () => dn("SIGTERM"),
    kt = () => dn("SIGINT");
  (process.on("SIGTERM", Bt), process.on("SIGINT", kt));
  let Cn = { runnerToken: Ht };
  if (o.debugTokenDir) await writeRunnerFileBestEffort(o.debugTokenDir, "runner_token.jwt", Ht, v);
  let Fr = (P) => {
      if (o.debugTokenDir) writeRunnerFileBestEffort(o.debugTokenDir, "runner_token.jwt", P, v);
      ((Cn.runnerToken = P), y("[runner:main] runner_token refreshed"));
    },
    hr = getJwtExpiry({
      getAccessToken: async () => {
        let { token: token } = await Gn.refreshToken(Cn.runnerToken);
        return token;
      },
      onRefresh: (P, Z) => Fr(Z),
      label: "self-hosted-runner",
    });
  hr.schedule(RUNNER_KIND, Ht);
  let Nn = void 0;
  Tn.current = Nn;
  let zn;
  if (o.useAnthropicGitProxy) {
    if (o.capacity > 1)
      (v(
        "[runner:fatal] --use-anthropic-git-proxy requires --capacity 1 (the proxy URL is per-session and linked worktrees share origin). Omit --use-anthropic-git-proxy or set --capacity 1.",
      ),
        await T(),
        process.exit(1));
    if (
      antEnv.CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM &&
      envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS") > 0
    )
      (v(
        "[runner:fatal] CLAUDE_RUNNER_TRUST_CANONICAL_PREWARM requires --drain-grace-sec 0 (one-shot). With drain-grace > 0 a second session could reuse this VM after the first's child wrote to the canonical .git/, and the skip would bypass the cross-session-isolation sanitize for an untrusted canonical. Unset the env var or set --drain-grace-sec 0.",
      ),
        await T(),
        process.exit(1));
    let { parseGitVersion: parseGitVersion, readGitVersion: readGitVersion } =
        await import("./chunk-nxsqxhv4.js"),
      re = await readGitVersion(),
      be = parseGitVersion(re);
    if (!be || be[0] < 2 || (be[0] === 2 && be[1] < 32))
      (v(
        `[runner:fatal] --use-anthropic-git-proxy requires git >= 2.32 (found ${re.trim() || "<none>"}). Older git silently ignores GIT_CONFIG_GLOBAL, which this mode relies on for cross-session isolation.`,
      ),
        await T(),
        process.exit(1));
    zn = process.env.GIT_CONFIG_GLOBAL || join(homedir(), ".gitconfig");
    let ee = zn,
      Re = await lstat(ee).catch(() => {
        return;
      });
    if (Re && (Re.isCharacterDevice() || Re.isBlockDevice()))
      (v(
        `[runner:fatal] --use-anthropic-git-proxy requires a writable global git config, but GIT_CONFIG_GLOBAL resolves to ${ee} which is not a regular file. The proxy flag writes its credential helper there and restores it at each session start. Unset GIT_CONFIG_GLOBAL or point it at a regular file path.`,
      ),
        await T(),
        process.exit(1));
    let Ue = process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
      ht = Oa(Ue, homedir());
    (v(
      `[runner:git] --use-anthropic-git-proxy: wiping HOME-level git config (${ee}, ${ht.join(", ")}, ${join(o.baseDir, ".runner")}) for cross-session isolation. Operator-provisioned git config must live in system config (/etc/gitconfig) or via --configure-git; see "Git authentication" in the self-hosted runners guide.`,
    ),
      await resetRunnerHome({
        globalCfgPath: ee,
        homeGitconfigPath: join(homedir(), ".gitconfig"),
        xdgGitDirs: ht,
        runnerDir: join(o.baseDir, ".runner"),
      }));
  }
  let {
      operatorGitSnapshotWarnings: operatorGitSnapshotWarnings,
      quoteConfigValueForLog: quoteConfigValueForLog,
      readOperatorGitSnapshot: readOperatorGitSnapshot,
      resolveHookGitPrograms: resolveHookGitPrograms,
      parseGitVersion: parseGitVersion,
      readGitVersion: readGitVersion,
    } = await import("./chunk-nxsqxhv4.js"),
    Kt = await readOperatorGitSnapshot({
      baseDir: o.baseDir,
      lifecycleHooks: Boolean(envSelfHostedRunnerHooksDir),
    }),
    Mn = await resolveHookGitPrograms({ baseDir: o.baseDir }),
    ir = !1;
  if (envSelfHostedRunnerHooksDir) {
    let {
        envHasGitConfigKey: envHasGitConfigKey,
        lifecycleHookAskpassSource: lifecycleHookAskpassSource,
        operatorGitConfigPairStatus: operatorGitConfigPairStatus,
        withLifecycleHookGitEnv: withLifecycleHookGitEnv,
        LIFECYCLE_HOOK_GIT_ENV: LIFECYCLE_HOOK_GIT_ENV,
      } = await import("./chunk-1k90kvy4.js"),
      GIT_ALLOW_PROTOCOL = LIFECYCLE_HOOK_GIT_ENV.GIT_ALLOW_PROTOCOL,
      Ue = envHasGitConfigKey("core.hooksPath"),
      ht = withLifecycleHookGitEnv(),
      wn = ht.GIT_ALLOW_PROTOCOL !== GIT_ALLOW_PROTOCOL;
    for (let St of operatorGitSnapshotWarnings(Kt, {
      isRoot: process.getuid?.() === 0,
      operatorSshInEnv: ht.GIT_SSH_COMMAND !== LIFECYCLE_HOOK_GIT_ENV.GIT_SSH_COMMAND,
      askpassSource: lifecycleHookAskpassSource(),
      postSessionHook:
        Kt.lfsFilterScopes !== void 0 &&
        (await findHook(envSelfHostedRunnerHooksDir, "post-session")) !== null,
      envHooksPath: Ue,
    }))
      v(St);
    let et = operatorGitConfigPairStatus();
    if (et.discarded !== void 0)
      v(
        `[runner:warn] GIT_CONFIG_COUNT=${et.announced} in the runner environment is ${et.discarded === "sparse" ? "not backed by that many GIT_CONFIG_KEY_n pairs" : "above the supported maximum"}; the lifecycle hooks' git will NOT receive those operator pairs (only the runner's pins). Fix the count/pairs to have them applied.`,
      );
    v(
      "[runner:git] lifecycle hooks: core.hooksPath " +
        (Ue
          ? "taken from the GIT_CONFIG_KEY_n pair in the runner's environment"
          : `pinned to ${quoteConfigValueForLog(Kt.hooksPath ?? "/dev/null")}${Kt.hooksPath ? " (system git config)" : " (no repository or global hooks run inside lifecycle-hook git)"}`) +
        `; fsmonitor/askpass/templates off${ht.GIT_ASKPASS !== void 0 && ht.GIT_ASKPASS === ht.SSH_ASKPASS ? " (GIT_ASKPASS set from the runner environment's SSH_ASKPASS)" : ""}; GIT_ALLOW_PROTOCOL=${ht.GIT_ALLOW_PROTOCOL ?? "(unset)"} for hook git${wn ? " (from the runner environment)" : " (runner default \u2014 local-path/file://, git://, bundle and external-helper remotes refused)"}; gpg programs ${Mn.gpg}/${Mn.gpgsm}${Mn.skipped.length ? ` (skipped session-writable ${Mn.skipped.length} PATH entries)` : ""}; ` +
        (o.configureGit
          ? "hook-made commits signed per session (--configure-git), not co-authored"
          : "commit/tag signing off for hook-made commits (no --configure-git)"),
    );
    let Ct = parseGitVersion(await readGitVersion());
    if (Ct !== null && (Ct[0] < 2 || (Ct[0] === 2 && Ct[1] < 31)))
      ((ir = !0),
        v(
          `[runner:warn] git ${Ct[0]}.${Ct[1]} ignores GIT_CONFIG_COUNT; exporting the lifecycle-hook git configuration pins (and any GIT_CONFIG_KEY_n pairs from the runner environment, after them) via GIT_CONFIG_PARAMETERS instead (upgrade to git >= 2.31 for the documented behaviour).`,
        ));
  }
  if (o.configureGit)
    try {
      let { configureGitForSigning: configureGitForSigning } = await import("./chunk-nxsqxhv4.js");
      await configureGitForSigning({ baseDir: o.baseDir, execPath: process.execPath, onStatus: v });
    } catch (error) {
      (v(
        `[runner:fatal] --configure-git failed: ${errorMessage(error)}. Check git is on PATH and ~/.gitconfig is writable.`,
      ),
        await T(),
        process.exit(1));
    }
  if (o.pushOutcomeOnRelease)
    try {
      let { parseGitVersion: parseGitVersion } = await import("./chunk-nxsqxhv4.js"),
        Z = await execFileNoThrow("git", ["--version"], {
          timeout: 5000,
          useCwd: !1,
          stdin: "ignore",
          stderr: "pipe",
          maxBuffer: 1048576,
        });
      if (Z.stderr.trim() !== "") a.write("stderr", redactSecretsInText(Z.stderr.trimEnd()));
      let re = Z.code === 0 ? parseGitVersion(Z.stdout) : null;
      if (re !== null && (re[0] < 2 || (re[0] === 2 && re[1] < 29)))
        v(
          `[runner:warn] --push-outcome-on-release: git ${re[0]}.${re[1]} detected. The drain-push works on any version, but resuming from the preserved branch requires git >= 2.29 (--no-write-fetch-head). Upgrade git for full behavior.`,
        );
    } catch {}
  let Hn, de;
  if (o.configureGit) {
    let { coauthorHookStubs: coauthorHookStubs, codeSignArtifacts: codeSignArtifacts } =
      await import("./chunk-nxsqxhv4.js");
    ((Hn = coauthorHookStubs(o.baseDir)), (de = codeSignArtifacts(o.baseDir, process.execPath)));
  }
  let Yt, qn;
  if (o.useAnthropicGitProxy)
    try {
      let {
        configureGitProxyCredential: configureGitProxyCredential,
        GIT_PROXY_CRED_HELPER_CONTENT: GIT_PROXY_CRED_HELPER_CONTENT,
        gitProxyCredHelperPath: gitProxyCredHelperPath,
      } = await import("./chunk-nxsqxhv4.js");
      (await configureGitProxyCredential({ baseDir: o.baseDir, apiBaseUrl: o.apiUrl, onStatus: v }),
        (Yt = await readFile(zn, "utf-8").catch(() => "")),
        (qn = { path: gitProxyCredHelperPath(o.baseDir), content: GIT_PROXY_CRED_HELPER_CONTENT }));
    } catch (error) {
      (v(
        `[runner:fatal] --use-anthropic-git-proxy failed: ${errorMessage(error)}. Check git is on PATH and ~/.gitconfig is writable.`,
      ),
        await T(),
        process.exit(1));
    }
  let q = {
      apiUrl: o.apiUrl,
      capacity: o.capacity,
      baseDir: o.baseDir,
      logLevel: o.logLevel,
      gitSshRewriteHosts: o.gitSshRewriteHosts,
      gitHostRewrites: o.gitHostRewrites,
      useAnthropicGitProxy: o.useAnthropicGitProxy ? o.apiUrl : void 0,
      gitProxyGlobalConfigPath: zn,
      gitProxyGlobalConfigSnapshot: Yt,
      gitProxyCredHelper: qn,
      configureGitHookStubs: Hn,
      configureGitSigningArtifacts: de,
      operatorGitSnapshot: Kt,
      hookGitPrograms: Mn,
      hookGitLegacyParams: ir,
      configureGit: o.configureGit,
      pushOutcomeOnRelease: o.pushOutcomeOnRelease,
      trustWorkspace: o.trustWorkspace,
      removeSessionState: o.removeSessionState,
      diffFindsNestedRepository: o.diffFindsNestedRepository,
      freshMachinePerSession: fe,
      confineRepoSettings: o.confineRepoSettings,
      serverAutoModeLists: o.serverAutoModeLists,
    },
    Pe = {
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
      clientLabel: ve,
      capacity: o.capacity,
      claimVisibility: new Map(),
      lockedAccountEmail: null,
      initializingSessions: 0,
      sessionInitErrors: 0,
      sessionInitDurations: xks(),
      sessionStartHookErrors: 0,
      pollErrors: NHn(),
      sessionIdle: new Map(),
    };
  br.current = Pe;
  let En = startClockSkewMonitor({ clock: Aa, onStatus: v }),
    ft =
      o.healthPort > 0
        ? startRunnerTokenRefresher({
            baseUrl: o.apiUrl,
            getRunnerToken: () => Cn.runnerToken,
            renewRunnerToken: () =>
              notAvailableInThisBuild({ tokenState: Cn, refreshToken: (P) => Fe.refreshToken(P), adopt: Fr }),
            renewSessionTokens: () => En?.renewSessionTokens() ?? Promise.resolve(),
            isThawing: () => !1,
            getRetireAtMs: () => runnerRetireAtMs(),
            isStopping: () => an !== "running" || !or,
            isHeldOff: () => En?.isHeldOff() ?? !1,
            onGranted: (P) => En?.onGranted(P),
            clock: Aa,
            onStatus: v,
            onDebug: y,
          })
        : void 0,
    he = o.healthPort > 0 ? startHealthServer(o.healthPort, Pe, v, ft, void 0) : void 0,
    De = await captureHostConfigSnapshot(v, {
      storage: o.hostConfigSnapshot === "disk" ? { mode: "disk", baseDir: o.baseDir } : { mode: "memory" },
    }),
    Vt = await snapshotOperatorGitConfig(y);
  try {
    await runRunnerLoop(
      {
        apiClient: kn,
        runnerId: Ae,
        tokenState: Cn,
        config: q,
        execPath: execPath_2,
        execArgs: execArgs,
        startedFromWorkOrder: isPoolSpawnJwt(l),
        onDebug: y,
        onStatus: v,
        flushLogSink: T,
        healthState: Pe,
        hostConfig: De,
        governedGitConfigSeed: Vt,
        debugTokenDir: o.debugTokenDir,
        startCommandPhases: _n,
        moveWatch: En,
        ...!1,
        deferShutdown: {
          signal: abortController_2.signal,
          maxMs: A,
          requestDrain: (P) => {
            if (an !== "draining") An(P, "loop");
          },
          onClosed: () => {
            or = !1;
          },
        },
      },
      abortController.signal,
    );
  } finally {
    if ((hr.cancelAll(), he?.close(), En?.stop(), De?.snapshot?.storage.mode === "disk")) {
      let snapshotDir = De.snapshot.storage.snapshotDir;
      await withBoundedTimeout(
        rm(snapshotDir, { recursive: !0, force: !0 }),
        1e4,
        `[runner:exit] remove host config snapshot ${snapshotDir}`,
      ).catch(() => {});
    }
    if (Ve) await withBoundedTimeout(Ve.close(), 2000, "[runner:exit] egress proxy close").catch(() => {});
    (process.removeListener("SIGTERM", Bt), process.removeListener("SIGINT", kt), await T());
  }
}
//@ chunk-hm0ce8vc.js:288822-288906 placement
function isAuthFailure(e) {
  return e instanceof Error && "isAuthFailure" in e && e.isAuthFailure === !0;
}
/**
 * 校验 --lock-to-account：必须是组织成员的 user_<id> 或邮箱。
 */
//@ chunk-hm0ce8vc.js:288906-289263 placement
function validateLockToAccount(e) {
  if (!e.includes("lock_to_account_id")) return "";
  let n = "lock_to_account_id is the value of --lock-to-account / SELF_HOSTED_RUNNER_LOCK_TO_ACCOUNT";
  if (e.includes("is not a member") || e.includes("must be a user_"))
    return ` (${n}; it must be the user_<id> or email address of a member of the organization that owns this environment)`;
  return ` (${n})`;
}
/**
 * runner 主循环：轮询/兑现工单、跑会话、处理 401/epoch 失配、排空与重启（约 31 KB）。
 */
//@ chunk-hm0ce8vc.js:289263-320208 placement
async function runRunnerLoop(e, n) {
  let {
      apiClient: apiClient,
      tokenState: tokenState,
      config: config,
      execPath: execPath,
      execArgs: execArgs,
      startedFromWorkOrder: startedFromWorkOrder,
      onDebug: onDebug,
      onStatus: onStatus,
      healthState: healthState,
    } = e,
    runnerId = e.runnerId,
    y = e.retireAtMsOverride ?? runnerRetireAtMs(),
    v = startedFromWorkOrder ? `Draining and exiting. ${vo}` : "Draining and exiting for clean restart.",
    w = startedFromWorkOrder ? vo : "Orchestrator will restart.",
    E = new Map(),
    A = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS") || Us,
    G = envPositiveMs("SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS") || Ss,
    K = getCheckoutHookTimeoutMs(),
    L = getDrainWaitMs(),
    D = drainMarkerFile(),
    oe = !1,
    ge = !1,
    Ne = e.readDrainMarkerOverride ?? readRegularFileSafe,
    me = e.drainMarkerReadTimeoutMs ?? _h,
    resolved = Promise.resolve(void 0),
    Ye = !1,
    He = () => {
      if (Ye || D === void 0) return;
      ((Ye = !0),
        (resolved = withBoundedTimeout(Ne(D), me, "drain-marker read")
          .then(
            (se) => {
              if (se.present)
                onStatus(
                  `[runner] drain: host-drain marker ${D} present` +
                    (se.unreadable !== void 0
                      ? ` but unreadable (${se.unreadable}) \u2014 reporting a host drain with no deadline`
                      : se.deadlineMs !== void 0
                        ? ` (host deadline ${new Date(se.deadlineMs).toISOString()})`
                        : " (no deadline on its first line)"),
                );
              return se;
            },
            (se) => {
              onStatus(
                `[runner] drain: host-drain marker ${D} could not be read (${errorMessage(se)}) \u2014 reporting a plain shutdown signal`,
              );
              return;
            },
          )
          .catch(() => {
            return;
          })));
    };
  if (n.aborted) He();
  else n.addEventListener("abort", He, { once: !0 });
  let ae,
    fe = new Set(),
    $e = new Map(),
    Ve = new Set(),
    Be = 0,
    Fe = 0,
    ve,
    Ae,
    Ht = new Set(),
    Mt = new Map(),
    _n = new Set(),
    Sn = 0,
    now = Date.now(),
    Gn = !1,
    kn = !0,
    Er = 0,
    now_2 = Date.now(),
    startCommandPhases = e.startCommandPhases,
    br = () => {
      let se = startCommandPhases;
      return ((startCommandPhases = void 0), se);
    },
    Tn = !1,
    On = null,
    dn = envPositiveMs("SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS"),
    An = envPositiveMs("SELF_HOSTED_RUNNER_DRAIN_GRACE_MS"),
    Bt = envPositiveMs("SELF_HOSTED_RUNNER_SESSION_IDLE_MS"),
    kt = holdIdleFile(),
    Cn = getMaxHoldMs(),
    Fr = e.leftoverHoldLookOverride ?? checkPathNotOnNetworkLocation,
    hr = e.leftoverHoldRecheckMsOverride ?? Nu,
    Nn = e.leftoverHoldLookTimeoutMsOverride ?? wh,
    zn = getStartupTimeoutMs(),
    ze = e.retireReleaseRetryMsOverride ?? Ch,
    Xn = e.retireDeferredGraceMsOverride ?? ko,
    Pt = !1,
    Wt,
    $n,
    deferShutdown = e.deferShutdown,
    Kt = deferShutdown !== void 0 && deferShutdown.maxMs > 0,
    Mn = deferShutdown?.ceilingGraceMsOverride ?? Math.max(L, Xn),
    ir =
      deferShutdown?.ceilingGraceMsOverride !== void 0
        ? Math.max(10, Math.floor(deferShutdown.ceilingGraceMsOverride / 10))
        : 1000,
    Hn = deferShutdown?.ceilingGraceMsOverride ?? Lr,
    de,
    Yt,
    qn = !1,
    q = () => count([...E.entries()], ([se, ke]) => !ke.controller.signal.aborted && !ft.has(se)),
    Pe = () =>
      count([...E.entries()], ([se, ke]) => !ke.controller.signal.aborted && ft.has(se) && !De.has(se)),
    En = () =>
      $n === "shutdown"
        ? "[runner:exit] shutdown requested and every attached session has been released \u2014 exiting."
        : "[runner:exit] retire time passed and no active sessions \u2014 exiting before the host kills this runner.",
    ft = new Set(),
    he = new Map(),
    De = new Map(),
    abortController = new AbortController(),
    P = new Set(),
    Z = new Map(),
    re = new Set(),
    be = void 0,
    ee,
    Re = () => {
      let size = E.size;
      for (let ke of De.keys()) if (!E.has(ke)) size++;
      for (let ke of P) if (!E.has(ke) && !De.has(ke)) size++;
      return size;
    },
    Ue = new Set(),
    ht = 10,
    wn = e.sseHintsEnabledOverride ?? isEnvTruthy(process.env.CCR_SHR_SSE_HINTS),
    et = new PollWaker(),
    Ct = e.moveWatch?.moved.subscribe(() => et.wake("LOCAL")),
    St = e.openWorkHintsStream ?? streamWorkHints,
    Or;
  (() => {
    if (wn)
      (onDebug("[runner:hints] CCR_SHR_SSE_HINTS enabled \u2014 opening stream"),
        (Or = St({
          baseUrl: config.apiUrl,
          runnerId: runnerId,
          tokenState: tokenState,
          onWake: () => et.wake("SSE"),
          onDebug: onDebug,
          signal: n,
        })));
  })();
  let Gr = !1,
    pr = !1,
    Bn = () => {
      Wt = void 0;
      let se = y - Date.now();
      if (se > 0) {
        Wt = setTimeout(Bn, Math.min(se, 2147483647));
        return;
      }
      ((Pt = !0), ($n = "retire"));
      let size = P.size;
      if (
        (P.clear(),
        logFeatureOk("self_hosted_retire"),
        onStatus(
          `[runner:retire] retire time reached \u2014 releasing ${E.size} active session(s), refusing new work; exiting once the slots are empty`,
        ),
        size > 0)
      )
        onStatus(
          `[runner:retire] ${size} declined session(s) held for re-spawn dropped at the retire deadline \u2014 requeued at exit instead`,
        );
      for (let jt of E.values()) jt.releaseForRetire();
      et.wake("LOCAL");
    },
    un = () => {
      if (!Kt || deferShutdown === void 0) return;
      He();
      let se = typeof deferShutdown.signal.reason === "number" ? deferShutdown.signal.reason : Date.now();
      if (de === void 0) {
        let ke = se + deferShutdown.maxMs - Date.now();
        de = setTimeout(We, Math.min(Math.max(0, ke), 2147483647));
      }
      if ((logFeatureOk("self_hosted_defer_shutdown"), Pt)) {
        onStatus(
          "[runner:shutdown] shutdown requested while already retiring \u2014 sessions are already being released",
        );
        return;
      }
      ((Pt = !0),
        ($n = "shutdown"),
        onStatus(
          `[runner:shutdown] shutdown requested \u2014 deferring drain: ${E.size} active session(s), refusing new work; ` +
            (Bt > 0
              ? `each is released once its user has been idle ${formatDuration(Bt, { hideTrailingZeros: !0 })} (--release-idle-session-min) or when it ends`
              : "none is released early (--release-idle-session-min is not set)") +
            `; ${formatDuration(deferShutdown.maxMs, { hideTrailingZeros: !0 })} after the signal every session still attached is released at once; exiting as soon as the slots are empty`,
        ),
        et.wake("LOCAL"));
    },
    We = () => {
      if (((de = void 0), deferShutdown === void 0 || n.aborted)) return;
      qn = !0;
      let size = P.size;
      if (size > 0) (P.clear(), et.wake("LOCAL"));
      let ke = q(),
        jt = () => {
          if (size > 0)
            onStatus(
              `[runner:shutdown] ${size} declined session(s) held for re-spawn dropped at the ceiling \u2014 requeued at exit instead`,
            );
        };
      if (ke === 0 && Pe() === 0) {
        jt();
        return;
      }
      (logFeatureOk("self_hosted_defer_ceiling"),
        onStatus(
          `[runner:shutdown] defer ceiling reached (${formatDuration(deferShutdown.maxMs, { hideTrailingZeros: !0 })}) \u2014 ` +
            (ke > 0
              ? `releasing the remaining ${ke} session(s) now`
              : `waiting on ${Pe()} in-flight release(s)`) +
            `; any still attached after ${formatDuration(Mn + Hn, { hideTrailingZeros: !0 })} will be drained`,
        ),
        jt());
      for (let Jt of E.values()) Jt.releaseForShutdown();
      let cn = Hn,
        Pn = () => {
          if (((Yt = void 0), n.aborted)) return;
          let Jt = q(),
            In = Pe();
          if (Jt === 0 && In === 0) return;
          if (cn > 0) {
            ((cn -= ir), (Yt = setTimeout(Pn, ir)));
            return;
          }
          (onStatus(
            `[runner:shutdown] ${Jt + In} session(s) still attached after the post-ceiling grace \u2014 falling back to a drain`,
          ),
            deferShutdown.requestDrain("post-ceiling grace expired with sessions still attached"));
        };
      Yt = setTimeout(Pn, Mn);
    };
  if (y > 0) {
    let se = y - Date.now();
    (onStatus(
      se > 0
        ? `[runner:retire] retire time set for ${new Date(y).toISOString()} (in ${formatDuration(se)}) \u2014 sessions will be released and the runner will exit then`
        : `[runner:retire] retire time ${new Date(y).toISOString()} is already in the past \u2014 refusing work and exiting`,
    ),
      Bn());
  }
  if (Kt && deferShutdown !== void 0)
    if (deferShutdown.signal.aborted) un();
    else deferShutdown.signal.addEventListener("abort", un, { once: !0 });
  try {
    while (!n.aborted) {
      if (Pt && Re() === 0) {
        onStatus(En());
        return;
      }
      if (An === 0 && Tn && Re() === 0) {
        onStatus(`[runner:exit] account workload drained \u2014 exiting (grace=0, no re-poll). ${w}`);
        return;
      }
      let se = Pt ? 0 : Math.max(0, config.capacity - Re()),
        consume = et.consume();
      if (consume === "SSE") {
        if ((await sleep(Math.floor(Math.random() * wu), n), n.aborted)) break;
      }
      let jt = now,
        cn;
      try {
        let pollWork = await apiClient.pollWork(
          tokenState.runnerToken,
          runnerId,
          se,
          n,
          wn ? POLL_WAKE_SOURCES[consume] : void 0,
        );
        ((cn = pollWork.assignment_ids), $e.clear());
        for (let pe of pollWork.session_assignments ?? []) {
          if (!pe || typeof pe.session_id !== "string" || !pe.session_id) continue;
          if (typeof pe.client_platform === "string" && pe.client_platform && Wuo.test(pe.client_platform))
            $e.set(pe.session_id, pe.client_platform);
          else if (typeof pe.client_platform === "string" && pe.client_platform && !Ve.has(pe.session_id)) {
            if (Ve.size > 256) Ve.clear();
            (Ve.add(pe.session_id),
              onDebug(
                `[runner:session] assignment client_platform rejected by the charset gate (label falls back to "unknown"): "${escapeMetricValue(pe.client_platform)}" (len=${pe.client_platform.length}, session=${escapeMetricValue(pe.session_id)})`,
              ));
          }
        }
        if (
          ((ve = pollWork.lease_expires_at),
          (Ae = pollWork.suggested_poll_interval),
          (now = Date.now()),
          (Be = 0),
          (Fe = 0),
          kn || Gn)
        )
          (logFeatureOk("self_hosted_poll"), (kn = !1), (Gn = !1));
        if (healthState) ((healthState.lastPollAt = now), (healthState.activeSessions = E.size));
      } catch (error) {
        if (n.aborted) break;
        let pe = classifyRunnerError(error);
        if (healthState) healthState.pollErrors[pe]++;
        let It = error instanceof Error ? error.message : String(error);
        if (isAuthFailure(error)) {
          (logFeatureBad("self_hosted_poll", "self_hosted_poll_auth_failed"),
            onStatus(`[runner:fatal] poll auth failed \u2014 token expired or revoked. ${v}`),
            (ge = !0));
          break;
        }
        if (isNotFoundError(error)) {
          if ((Be++, Be >= 3)) {
            (logFeatureBad("self_hosted_poll", "self_hosted_poll_runner_not_found"),
              onStatus(
                `[runner:fatal] poll returned 404 ${Be}\xD7 \u2014 runner record gone server-side. ${v}`,
              ),
              (ge = !0));
            break;
          }
          let min = Math.min(Th, HEALTH_PROBE_INTERVAL_MS * 2 ** (Be - 1)),
            floored = Math.floor(Math.random() * min);
          (onStatus(
            `Poll failed: ${It} \u2014 confirming 404 (${Be}/3), retrying in ${(floored / 1000).toFixed(1)}s`,
          ),
            await sleep(e.pollIntervalOverrideMs ?? floored, n));
          continue;
        }
        if (((Be = 0), kn || !Gn))
          (logFeatureSad("self_hosted_poll", "self_hosted_poll_failed"), (kn = !1), (Gn = !0));
        let Ie;
        if (pe === "timeout" || pe === "transport") (Fe++, (Ie = backoffDelayMs(Fe, ve, Ae)));
        else if (pe === "5xx") Ie = clampToLeaseExpiry(To, ve, Oh, Ae);
        else Ie = To;
        (onStatus(`Poll failed: ${It} \u2014 retrying in ${(Ie / 1000).toFixed(1)}s`),
          await sleep(e.pollIntervalOverrideMs ?? Ie, n));
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
      if (filtered.length > 0) Tn = !0;
      let nn = new Set(cn);
      for (let [R, pe] of E)
        if (!nn.has(R))
          (onStatus(
            `[runner:session] ${R} deassigned by server (deleted/archived/requeued) \u2014 aborting child`,
          ),
            pe.controller.abort(ft.has(R) ? "idle-release" : "deassign"));
      for (let R of ft) if (!nn.has(R)) ft.delete(R);
      for (let R of he.keys()) if (!nn.has(R)) he.delete(R);
      for (let R of P) if (!nn.has(R) || fe.has(R)) P.delete(R);
      for (let R of re) if (!nn.has(R)) re.delete(R);
      for (let R of Z.keys()) if (!E.has(R) && !P.has(R) && !De.has(R) && !re.has(R)) Z.delete(R);
      for (let R of filtered) {
        if (E.has(R)) {
          onDebug(`[runner:main] Ignoring duplicate assignment for ${R}`);
          continue;
        }
        if (fe.has(R)) {
          (P.delete(R),
            onDebug(`[runner:main] Ignoring stuck session ${R} \u2014 already failed, not re-spawning`));
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
          else (Ue.add(R), onStatus(N));
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
        (Er++, onStatus(`Picked up session ${R} (${E.size + 1}/${config.capacity} active)`));
        let abortController_2 = new AbortController(),
          replaced = R.replace(/^cse_/, "session_"),
          Xe = $e.get(R) ?? UNKNOWN;
        (healthState?.sessionIdle.set(replaced, null), healthState?.sessionClientPlatform.set(replaced, Xe));
        let now = Date.now();
        healthState?.claimVisibility?.set(replaced, { pickedUpAt: now });
        let Nt = E.size === 0 ? now - now_2 : void 0;
        if (healthState) {
          for (let N of [
            healthState.sessionsStarted,
            healthState.sessionsCompleted,
            healthState.sessionsFailed,
            healthState.sessionsInterrupted,
          ])
            if (!N.has(Xe)) N.set(Xe, 0);
        }
        let Je,
          fn = !1,
          Wn = Z.get(R),
          Dn,
          Zt = !1,
          hn = !1,
          Ln = !1,
          Dt = !1,
          Cr = (N) => {
            Dt = N;
            let x = E.get(R);
            if (x !== void 0) x.turnInFlight = N;
            ae?.();
          },
          pt = !1,
          Lt,
          Ke = !1,
          Ut = "retire",
          V = () =>
            Ut === "shutdown"
              ? "defer ceiling passed"
              : Ut === "max-age"
                ? "max session age reached"
                : "retire time passed",
          ue = () =>
            Ut === "shutdown"
              ? "while shutting down"
              : Ut === "max-age"
                ? "while at max session age"
                : "while retiring",
          U = () =>
            Ut === "shutdown"
              ? "shutdown grace"
              : Ut === "max-age"
                ? "max-session-age grace"
                : "retire grace",
          nt = 0,
          Tt = 0,
          xn,
          Kn = () => {
            if (xn !== void 0) (clearTimeout(xn), (xn = void 0));
          },
          wr = !1,
          Jn = () => Ln || abortController_2.signal.aborted || wr,
          es = !1,
          ts = () => {},
          yo = (N) => {},
          Hr,
          vs = [1800000, 7200000, 28800000],
          Br = () => {
            if (Hr !== void 0) (clearTimeout(Hr), (Hr = void 0));
          },
          Nr = (N, x) => {
            let xe = N?.liveTasks ?? 0,
              joined = (N?.liveTaskIds ?? []).slice(0, 5).join(","),
              Yn = N?.wakeupInMs !== void 0 ? `wakeup pending in ${formatDuration(N.wakeupInMs)}` : void 0,
              Zn = N?.bgResultAwaitingFollowup
                ? "finished background task awaiting the follow-up turn"
                : void 0,
              filtered = [
                xe > 0 ? `${xe} background task(s) live [${joined}${xe > 5 ? ",\u2026" : ""}]` : void 0,
                Yn,
                Zn,
              ].filter(Boolean),
              ne = filtered.length > 0 ? filtered.join(" / ") : "planned resumption",
              mt = x > 0 ? " still" : "";
            if (
              (onStatus(`[runner:session] ${R} turn ended with ${ne} \u2014 idle clock${mt} deferred`),
              x < vs.length)
            )
              Hr = setTimeout(Nr, vs[x], N, x + 1);
          },
          pn = (N, x) => {
            if (N === "startup" && x?.childAlive === !0 && Lt !== "startup") {
              onDebug(
                `[runner:session] ${R} ignoring child output as a startup-clock restart: the startup phase is over`,
              );
              return;
            }
            let xe = N === "startup" && x?.childSilent === !0;
            if (xe && ft.has(R)) {
              onDebug(
                `[runner:session] ${R} no child output for ${formatDuration(zn)}, but a release is already in flight: leaving it to that one`,
              );
              return;
            }
            if (Je !== void 0) (clearTimeout(Je), (Je = void 0));
            if (((Dn = void 0), !Ln && healthState))
              if (N === "turn-end" || (N === "awaiting-action" && !pt)) {
                if (healthState.sessionIdle.get(replaced) === null)
                  healthState.sessionIdle.set(replaced, Date.now());
              } else healthState.sessionIdle.set(replaced, null);
            if (N === "init-observed") {
              if (Ke && Lt !== void 0) pn(Lt);
              return;
            }
            if (N === "activity") {
              if (Lt !== "startup") ((Wn = void 0), Z.delete(R), (Zt = !1), (hn = !1));
              (Cr(!0), (pt = !1), (Lt = void 0), (nt = 0), Br(), Kn(), he.delete(R));
              return;
            }
            if (N === "turn-end-deferred") {
              if ((Cr(!1), (pt = !0), (Lt = void 0), Br(), ts(), Jn())) return;
              if (Bt > 0) Nr(x, 0);
              if (Ke) ns();
              return;
            }
            if (N === "awaiting-action" && pt) {
              Lt = void 0;
              return;
            }
            if ((Br(), Kn(), Cr(!1), (pt = !1), (Lt = N), ts(), Jn())) return;
            let xt = xe ? 0 : Ke ? (nt === 0 ? 0 : ze) : N === "startup" ? zn : Bt,
              Yn = Ke ? ze : xt,
              Zn = () => (Ke ? (nt === 0 ? "now" : `in ${formatDuration(ze)}`) : `in ${formatDuration(Yn)}`),
              yn = Ke
                ? V()
                : N === "startup"
                  ? `no child output for ${formatDuration(zn)}`
                  : N === "awaiting-action"
                    ? `awaiting user action ${formatDuration(xt)}`
                    : `user idle ${formatDuration(xt)}`;
            if (!Ke && !xe && xt <= 0) return;
            if (Jn()) return;
            if (
              N === "awaiting-action" &&
              x !== void 0 &&
              (x.liveTasks > 0 || x.wakeupInMs !== void 0 || x.bgResultAwaitingFollowup === !0)
            ) {
              let joined = x.liveTaskIds.slice(0, 5).join(","),
                filtered = [
                  x.liveTasks > 0
                    ? `${x.liveTasks} background task(s) live [${joined}${x.liveTasks > 5 ? ",\u2026" : ""}]`
                    : void 0,
                  x.wakeupInMs !== void 0 ? `wakeup pending in ${formatDuration(x.wakeupInMs)}` : void 0,
                  x.bgResultAwaitingFollowup === !0
                    ? "finished background task awaiting the follow-up turn"
                    : void 0,
                ].filter(Boolean);
              onStatus(
                `[runner:session] ${R} awaiting user action overrides deferral (${filtered.join(" / ")}) \u2014 idle clock armed`,
              );
            }
            if (!Ke && !xe) {
              let mt = N === "startup" && x?.childAlive === !0,
                rn = `[runner:session] ${R} idle clock armed (${mt ? "startup, restarted by child output" : N}): releases in ${formatDuration(xt, { hideTrailingZeros: !0 })} at ${new Date(Date.now() + xt).toISOString()} unless new activity arrives`;
              if (!mt) onStatus(rn);
              else if (fn) onDebug(rn);
              else ((fn = !0), onStatus(`${rn} (later restarts are logged at debug)`));
            }
            if (Ke && nt === 0 && E.get(R)?.postTurnSettling === !0) {
              onStatus(
                `[runner:session] ${R} ${V()} \u2014 release held until the finished turn has been reported to the server (at most SELF_HOSTED_RUNNER_POST_TURN_SETTLE_MS, default ${Ls / 1000}s)`,
              );
              return;
            }
            if (!Ke && N !== "startup") ((Wn ??= Date.now()), Z.set(R, Wn));
            let ne = (mt = !1) => {
              if (((Je = void 0), Jn())) return;
              if (ft.has(R)) return;
              if (Dt) {
                onStatus(
                  `[runner:session] ${R} idle timer fired mid-turn \u2014 skipping release (stdout-tee likely broken)`,
                );
                return;
              }
              if (!mt && kt !== void 0 && Cn > 0 && !Ke && N !== "startup" && Wn !== void 0) {
                let _t = kt,
                  bt = Wn + Cn;
                if (Date.now() < bt) {
                  let en = {};
                  ((Dn = en),
                    withBoundedTimeout(Fr(_t, Date.now()), Nn, "hold-idle-file look")
                      .catch((Me) =>
                        Me instanceof BoundedTimeoutError
                          ? "timed out"
                          : { failed: Me instanceof Error ? Me.message : String(Me) },
                      )
                      .then((Me) => {
                        if (Dn !== en || Je !== void 0 || Jn() || Dt || pt || Ke) return;
                        Dn = void 0;
                        let max = Math.max(0, Math.min(hr, bt - Date.now()));
                        if (Me === !0) {
                          if (((hn = !1), !Zt))
                            ((Zt = !0),
                              onStatus(
                                `[runner:session] ${R} idle release held: ${_t} says a process the session left running still lives \u2014 looking again every ${formatDuration(hr, { hideTrailingZeros: !0 })}, until ${new Date(bt).toISOString()} at most (--max-hold-min)`,
                              ));
                          Je = setTimeout(ne, max, !1);
                          return;
                        }
                        let er =
                          Me === "timed out"
                            ? `looking at ${_t} took longer than ${formatDuration(Nn, { hideTrailingZeros: !0 })}`
                            : typeof Me === "object"
                              ? `the look at ${_t} failed (${Me.failed})`
                              : `${_t} is gone, not a regular file, or has not changed in ${formatDuration(Di, { hideTrailingZeros: !0 })}`;
                        if (Zt && !hn) {
                          ((hn = !0),
                            onStatus(
                              `[runner:session] ${R} idle release still held: ${er} \u2014 looking once more before releasing`,
                            ),
                            (Je = setTimeout(ne, max, !1)));
                          return;
                        }
                        if (Zt) onStatus(`[runner:session] ${R} idle release no longer held: ${er}`);
                        else if (Me !== !1)
                          onStatus(`[runner:session] ${R} idle release not held: ${er} \u2014 releasing`);
                        ((Zt = !1), (hn = !1), ne(!0));
                      })
                      .catch((Me) => {
                        onStatus(
                          `[runner:session] ${R} idle release after a look at ${_t} failed: ${Me instanceof Error ? Me.message : String(Me)}; the release may not have gone out, and the next turn end or a forced release tries again`,
                        );
                      }));
                  return;
                }
                if (Zt)
                  ((Zt = !1),
                    onStatus(
                      `[runner:session] ${R} idle release no longer held: ${formatDuration(Cn, { hideTrailingZeros: !0 })} have passed since the session went idle (--max-hold-min)`,
                    ));
              }
              if (Ke) nt++;
              if (
                (onStatus(`[runner:session] ${R} ${yn} \u2014 releasing`), ft.add(R), N !== "awaiting-action")
              ) {
                let _t = E.get(R)?.liveBgTasks ?? 0,
                  en = (E.get(R)?.task ?? Promise.resolve())
                    .then(() =>
                      retryReleaseSession({
                        release: () => apiClient.releaseSession(tokenState.runnerToken, R),
                        sessionId: R,
                        onStatus: onStatus,
                        stop: abortController.signal,
                      }),
                    )
                    .then(({ released: released }) => {
                      if ((De.delete(R), ft.delete(R), he.delete(R), Z.delete(R), Pt)) et.wake("LOCAL");
                      if (released) {
                        if (
                          (onStatus(
                            `[runner:session] ${R} released after post-session hook \u2014 parked server-side`,
                          ),
                          xe)
                        )
                          logFeatureSad("self_hosted_release_session", "released_true_child_silent");
                        else if (Dt || pt || _t > 0)
                          logFeatureSad("self_hosted_release_session", "released_true_mid_work");
                        else logFeatureOk("self_hosted_release_session");
                        return;
                      }
                      if ($n === "shutdown") {
                        let er = !qn;
                        if (er) P.add(R);
                        (onStatus(
                          er
                            ? `[runner:session] ${R} released=false after post-session hook (pending user event) while shutting down \u2014 the next poll re-spawns it to serve that event (its --release-idle-session-min window, if set, starts over; otherwise it stays until the ceiling)`
                            : `[runner:session] ${R} released=false after post-session hook (pending user event) after the defer ceiling \u2014 not re-spawned; it is requeued, snapshot complete, when this runner exits`,
                        ),
                          logFeatureSad("self_hosted_release_session", "released_false_shutting_down"));
                        return;
                      }
                      let gr = Ke && Ut === "max-age";
                      (onStatus(
                        Pt
                          ? `[runner:session] ${R} released=false after post-session hook (pending user event) while retiring \u2014 not re-spawned; it is requeued, snapshot complete, when this runner exits`
                          : `[runner:session] ${R} released=false after post-session hook (pending user event)${gr ? " at max session age" : ""} \u2014 respawns on the next poll, or is requeued by this runner's exit if it is draining (grace=0) or retiring`,
                      ),
                        logFeatureSad(
                          "self_hosted_release_session",
                          Pt
                            ? "released_false_retiring"
                            : gr
                              ? "released_false_max_age"
                              : xe
                                ? "released_false_child_silent"
                                : "released_false",
                        ));
                    })
                    .catch((Me) => {
                      if ((De.delete(R), ft.delete(R), re.add(R), $n === "shutdown" && !qn)) P.add(R);
                      if (Pt) et.wake("LOCAL");
                      let gr = Me instanceof Error ? Me.message : String(Me);
                      (onStatus(
                        `[runner:session] ${R} ordered release failed after the post-session hook: ${gr} \u2014 keeping session; respawns on the next poll, or is requeued by this runner's exit if it is draining (grace=0) or retiring`,
                      ),
                        logFeatureBad("self_hosted_release_session", "rpc_failed"));
                    });
                (De.set(R, en), abortController_2.abort("idle-release"));
                return;
              }
              let rn = (_t, bt) => {
                let en = Jn(),
                  Me = !en && !Dt && !pt;
                if (
                  (onStatus(
                    `[runner:session] ${R} ${_t} \u2014 ${en ? "not retried, the session is ending on this runner" : `keeping session${Me ? `, ${bt}` : ""}`}`,
                  ),
                  Me)
                )
                  pn(N);
              };
              apiClient
                .releaseSession(tokenState.runnerToken, R)
                .then(({ released: released }) => {
                  if (((Tt = 0), released)) {
                    if (Ln || abortController_2.signal.aborted) return;
                    (he.delete(R), onStatus(`[runner:session] ${R} released \u2014 aborting child`));
                    let en = E.get(R)?.liveBgTasks ?? 0;
                    if ((abortController_2.abort("idle-release"), Dt || pt || en > 0))
                      logFeatureSad("self_hosted_release_session", "released_true_mid_work");
                    else logFeatureOk("self_hosted_release_session");
                    return;
                  }
                  if (Ln || abortController_2.signal.aborted) return;
                  if ((ft.delete(R), Ke)) {
                    let en =
                      N === "awaiting-action"
                        ? "queued event behind the parked prompt"
                        : "pending user event";
                    (logFeatureSad(
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
                    ),
                      rn(`release declined (${en}) ${ue()}`, `retrying ${Zn()}`));
                    return;
                  }
                  if (N === "awaiting-action") {
                    (logFeatureSad("self_hosted_release_session", "released_false_parked"),
                      rn("released=false while parked at prompt (queued event behind prompt)", "re-arming"));
                    return;
                  }
                  let bt = (he.get(R) ?? 0) + 1;
                  if ((he.set(R, bt), bt >= 3)) {
                    (he.delete(R),
                      onStatus(`[runner:session] ${R} released=false ${bt}x \u2014 aborting as backstop`),
                      abortController_2.abort(),
                      logFeatureBad("self_hosted_release_session", "released_false_backstop"));
                    return;
                  }
                  if (
                    (onStatus(
                      `[runner:session] ${R} released=false (pending user event) \u2014 keeping session${Dt || pt ? "" : ", re-arming"}`,
                    ),
                    logFeatureSad("self_hosted_release_session", "released_false"),
                    !Dt && !pt)
                  )
                    pn?.(N);
                })
                .catch((_t) => {
                  (ft.delete(R), Tt++);
                  let bt = _t instanceof Error ? _t.message : String(_t);
                  (logFeatureBad("self_hosted_release_session", "rpc_failed"),
                    rn(
                      `releaseSession failed: ${bt}${Tt > 1 ? ` (${Tt} failures in a row)` : ""}`,
                      `retrying ${Zn()}`,
                    ));
                });
            };
            Je = setTimeout(ne, xt, !1);
          },
          ns = () => {
            if (Jn() || !pt) return;
            let N = E.get(R)?.liveBgTasks ?? 0;
            if (N === 0 && E.get(R)?.bgResultPendingFollowup === !0) {
              onStatus(
                `[runner:session] ${R} ${V()} while a finished background task's follow-up turn is pending \u2014 waiting for it before releasing`,
              );
              return;
            }
            if (N === 0) {
              (onStatus(
                `[runner:session] ${R} ${V()} with only perpetual monitor task(s) / a scheduled wakeup holding the turn \u2014 releasing now`,
              ),
                (pt = !1),
                Kn(),
                pn("turn-end"));
              return;
            }
            if (xn !== void 0) return;
            (onStatus(
              `[runner:session] ${R} ${V()} with ${N} background task(s) live \u2014 allowing ${formatDuration(Xn)} to finish before releasing`,
            ),
              (xn = setTimeout(() => {
                if (((xn = void 0), Jn() || !pt)) return;
                let x = E.get(R)?.liveBgTasks ?? 0,
                  xe = E.get(R)?.bgResultPendingFollowup === !0;
                if (x === 0 && xe) {
                  onStatus(
                    `[runner:session] ${R} ${U()} elapsed but a finished background task's follow-up turn is pending \u2014 waiting for it before releasing`,
                  );
                  return;
                }
                (onStatus(
                  x === 0
                    ? `[runner:session] ${R} background work finished during the ${U()}; only perpetual monitor task(s) / a scheduled wakeup still hold the turn \u2014 releasing now`
                    : `[runner:session] ${R} ${x} background task(s) still live after the ${U()} \u2014 releasing anyway (a parked session beats a lost worker)`,
                ),
                  (pt = !1),
                  pn("turn-end"));
              }, Xn)));
          },
          rs = (N) => {
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
            if (((Ke = !0), (Ut = N), Lt === void 0)) {
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
            (onStatus(`[runner:session] ${R} ${V()} while idle \u2014 releasing now`), pn(Lt));
          },
          Qe = () => rs("retire"),
          gt = () => rs("shutdown"),
          Qt = () => {
            if (Ln || abortController_2.signal.aborted) return "kill";
            let N = Lt !== void 0 || (pt && !Dt) ? "release" : "wait";
            return (logFeatureOk("self_hosted_max_lifetime", { decision: fromEnum(N) }), rs("max-age"), N);
          },
          yt = () => {
            if (wr) return;
            wr = !0;
            let N = Je !== void 0 || xn !== void 0;
            if (Je !== void 0) (clearTimeout(Je), (Je = void 0));
            if ((Kn(), N || Ke))
              onDebug(`[runner:session] ${R} child is being terminated \u2014 release clock stood down`);
          },
          $r = It && ee?.id === R,
          ar = $r && ee?.onUpdateBuild === !0 ? be : void 0;
        ee = void 0;
        let Q = (e.handleSession ?? handleSelfHostedSession)(
          R,
          {
            apiClient: apiClient,
            getRunnerToken: () => tokenState.runnerToken,
            baseDir: config.baseDir,
            execPath: ar !== void 0 && execPath === process.execPath ? ar : execPath,
            execArgs: ar !== void 0 ? [] : execArgs,
            updatedChildBin: ar,
            restartedHere: $r,
            childUpdateBin: be,
            onChildUpdateReady: () => {
              ((es = !0), ts());
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
            onDebug: onDebug,
            onStatus: onStatus,
            onSessionActivity: pn,
            onMaxLifetime: Qt,
            onChildTerminating: yt,
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
              : void 0,
            onInitPhase: healthState
              ? (N) => {
                  switch (N.kind) {
                    case "start":
                      healthState.initializingSessions++;
                      break;
                    case "end":
                      (healthState.initializingSessions--,
                        Pks(healthState.sessionInitDurations, N.durationSec));
                      break;
                    case "exit-before-init":
                      if ((healthState.initializingSessions--, N.failed)) healthState.sessionInitErrors++;
                      break;
                    default:
                  }
                }
              : void 0,
            onSessionStartHookError: healthState
              ? () => {
                  healthState.sessionStartHookErrors++;
                }
              : void 0,
            standbyIdleMs: Nt,
            takeStartCommandPhases: br,
            getHealthzClaimVisibleMs: () => healthState?.claimVisibility?.get(replaced)?.visibleMs,
            moveWatch: e.moveWatch,
            ...!1,
            onSessionTokenIssued: (N) => {
              if (healthState && healthState.lockedAccountEmail === null) {
                let x = getSessionIdFromJwt(N);
                if (x !== null) healthState.lockedAccountEmail = x;
              }
            },
            canonicalLocks: Mt,
            spawnedSessionIds: _n,
            postSessionHookTimeoutMs: G,
            checkoutHookTimeoutMs: K,
            pushOutcomeOnRelease: config.pushOutcomeOnRelease,
            trustWorkspace: config.trustWorkspace,
            removeSessionState: config.removeSessionState,
            diffFindsNestedRepository: config.diffFindsNestedRepository,
            freshMachinePerSession: config.freshMachinePerSession,
            confineRepoSettings: config.confineRepoSettings,
            serverAutoModeLists: config.serverAutoModeLists,
            onBgTaskLedger: (N) => {
              let x = E.get(R);
              if (x) x.liveBgTasks = N;
              ae?.();
            },
            onBgFollowupPending: (N, x) => {
              let xe = E.get(R);
              if (xe) xe.bgResultPendingFollowup = N;
              if ((ae?.(), !N && !x && Ke && pt)) ns();
            },
            onPostTurnSettle: (N, x) => {
              let xe = E.get(R);
              if (xe) xe.postTurnSettling = N;
              if ((ae?.(), !N && !x)) ts();
              if (!N && !x && Ke && nt === 0 && Lt !== void 0) pn(Lt);
            },
            debugTokenDir: e.debugTokenDir,
          },
          abortController_2.signal,
        )
          .then((N) => {
            let {
              result: x,
              failureReason: failureReason,
              setupFailureKind: setupFailureKind,
              failureKind: failureKind,
            } = N;
            if (failureReason) onStatus(`Session ${R} finished: ${x} \u2014 reason: ${failureReason}`);
            else onStatus(`Session ${R} finished: ${x}`);
            let Zn = x === "failed" || (x === "interrupted" && !abortController_2.signal.aborted);
            if (Zn && N.failedOnUpdateBuild === !0) {
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
                  setupFailureKind === "SETUP_FAILURE_KIND_SOURCE_REF_NOT_FOUND" ? yn : Mln(yn),
                  setupFailureKind,
                  failureKind,
                )
                .then((ne) => {
                  if (
                    (onStatus(
                      `[runner:session] ${R} failure reported \xB7 excluded_count=${ne.excluded_count} stuck=${ne.stuck}`,
                    ),
                    ne.stuck)
                  )
                    (fe.add(R),
                      onStatus(
                        `[runner:session] ${R} marked stuck \u2014 will not re-spawn on future polls`,
                      ));
                  logFeatureOk("self_hosted_failure_report");
                })
                .catch((ne) => {
                  let mt = ne instanceof Error ? ne.message : String(ne);
                  (onStatus(
                    `[runner:session] ${R} reportSessionFailure failed: ${mt} \u2014 marking stuck to bound respawn`,
                  ),
                    fe.add(R),
                    logFeatureSad("self_hosted_failure_report", "rpc_failed"));
                })
                .finally(() => {
                  Ht.delete(R);
                });
            }
          })
          .catch((N) => {
            let x = N instanceof Error ? N.message : String(N);
            onStatus(`Session ${R} handler threw: ${x}`);
          })
          .finally(() => {
            if (((Ln = !0), Je !== void 0)) (clearTimeout(Je), (Je = void 0));
            if ((Br(), Kn(), !De.has(R))) ft.delete(R);
            if ((he.delete(R), !P.has(R) && !De.has(R))) Z.delete(R);
            if (healthState)
              (healthState.sessionIdle.delete(replaced),
                healthState.sessionClientPlatform.delete(replaced),
                healthState.claimVisibility?.delete(replaced),
                dropSessionMetrics(healthState, replaced));
            let N = E.size >= config.capacity;
            if (
              ((oe =
                abortController_2.signal.aborted &&
                abortController_2.signal.reason === "idle-release" &&
                !Ke),
              E.delete(R),
              ae?.(),
              healthState)
            )
              healthState.activeSessions = E.size;
            if (E.size === 0) {
              if (((now_2 = Date.now()), Pt)) et.wake("LOCAL");
            }
            if (wn && N) et.wake("LOCAL");
          });
        if (
          (E.set(R, {
            task: Q,
            controller: abortController_2,
            liveBgTasks: 0,
            bgResultPendingFollowup: !1,
            postTurnSettling: !1,
            turnInFlight: !1,
            releaseForRetire: Qe,
            releaseForShutdown: gt,
          }),
          healthState)
        )
          healthState.activeSessions = E.size;
      }
      let tt = e.pollIntervalOverrideMs ?? nextPollDelayMs(ve, Ae);
      if ((Sn++, Sn % ht === 0)) {
        let size = E.size,
          pe = decodeSessionJwt(tokenState.runnerToken),
          now = Date.now(),
          Ie = now - jt,
          ye = pe !== null ? pe * 1000 - now : null,
          Xe =
            ye !== null
              ? `${ye < 0 ? "-" : ""}${formatDuration(Math.abs(ye), { mostSignificantOnly: !0 })}`
              : "unknown",
          qe = healthState?.lockedAccountEmail ?? (Tn ? "yes" : "no");
        onStatus(
          `[runner:health] polling ok \xB7 ${size}/${config.capacity} slots \xB7 last_poll=${Ie}ms ago \xB7 locked_account=${qe} \xB7 runner_token expires in ${Xe} \xB7 ${Er} sessions handled`,
        );
      }
      if (wn) et.atCapacity = Pt || E.size >= config.capacity;
      await et.wait(tt, n);
    }
  } finally {
    if (((pr = !0), Wt !== void 0)) (clearTimeout(Wt), (Wt = void 0));
    if (de !== void 0) (clearTimeout(de), (de = void 0));
    if (Yt !== void 0) (clearTimeout(Yt), (Yt = void 0));
    (deferShutdown?.signal.removeEventListener("abort", un),
      n.removeEventListener("abort", He),
      deferShutdown?.onClosed?.(),
      Or?.close(),
      Ct?.());
    let aborted = n.aborted;
    if ($n === "shutdown") He();
    let ke,
      jt = e.drainTimeoutMs ?? Ti(A, G, 0, config.pushOutcomeOnRelease ? _s : 0, vi()) * 1000,
      cn = !1,
      Pn = setInterval(() => {
        if (cn) return;
        ((cn = !0),
          apiClient
            .pollWork(tokenState.runnerToken, runnerId, 0)
            .then(() => {
              if (healthState) healthState.lastPollAt = Date.now();
            })
            .catch((tt) => {
              if (healthState) healthState.pollErrors[classifyRunnerError(tt)]++;
              onDebug(`[runner] shutdown: lease heartbeat failed (best-effort): ${tt}`);
            })
            .finally(() => {
              cn = !1;
            }));
      }, e.shutdownLeaseHeartbeatMs ?? mh);
    try {
      if (L > 0 && aborted) {
        let tt = () => [...E.values()].reduce((qe, Nt) => qe + Nt.liveBgTasks, 0),
          R = () => [...E.values()].reduce((qe, Nt) => qe + (Nt.turnInFlight ? 1 : 0), 0),
          pe = () => [...E.values()].reduce((qe, Nt) => qe + (Nt.bgResultPendingFollowup ? 1 : 0), 0),
          It = () => [...E.values()].reduce((qe, Nt) => qe + (Nt.postTurnSettling ? 1 : 0), 0),
          Ie = () =>
            (pe() > 0 ? `, ${pe()} finished background task(s) awaiting the follow-up turn` : "") +
            (It() > 0 ? `, ${It()} finished turn(s) still being reported to the server` : ""),
          ye = () =>
            [...E.entries()]
              .filter(([, qe]) => qe.turnInFlight || qe.liveBgTasks > 0 || qe.bgResultPendingFollowup)
              .map(([qe]) => qe),
          Xe = () => ye().length > 0 || It() > 0;
        if (
          ((ke = {
            outcome: "RUNNER_DRAIN_HOLD_OUTCOME_NOT_NEEDED",
            cap_ms: Math.round(L),
            held_ms: 0,
            busy_session_ids_at_release: [],
          }),
          Xe())
        ) {
          let now = Date.now(),
            Nt = !1;
          (onStatus(
            `[runner] drain-wait: ${R()} turn(s) in flight, ${tt()} background task(s) live${Ie()} across ${E.size} session(s) \u2014 waiting up to ` +
              `${L / 1000}s before stopping session(s)`,
          ),
            await new Promise((fn) => {
              let Wn = () => {
                  ((ae = void 0), fn());
                },
                Dn = setTimeout(() => {
                  ((Nt = !0), Wn());
                }, L);
              ae = () => {
                if (!Xe()) (clearTimeout(Dn), Wn());
              };
            }));
          let Je = ye();
          ((ke = {
            ...ke,
            outcome: Nt ? "RUNNER_DRAIN_HOLD_OUTCOME_CAP_EXPIRED" : "RUNNER_DRAIN_HOLD_OUTCOME_FINISHED",
            held_ms: Date.now() - now,
            busy_session_ids_at_release: Je.slice(0, Sh),
          }),
            onStatus(
              !Nt
                ? "[runner] drain-wait: in-flight work finished \u2014 stopping session(s)"
                : `[runner] drain-wait: timed out with ${R()} turn(s) in flight, ${tt()} task(s) still live${Ie()} \u2014 stopping session(s)`,
            ));
        }
      }
      for (let { controller: controller } of E.values()) controller.abort();
      if (E.size > 0) {
        onStatus(`Draining ${E.size} active session(s)...`);
        try {
          (await withBoundedTimeout(
            Promise.allSettled([...E.values()].map((tt) => tt.task)),
            jt,
            "[runner:stuck] drain",
          ),
            onStatus("Drain complete"),
            logFeatureOk("self_hosted_drain"));
        } catch {
          (logFeatureBad("self_hosted_drain", "shutdown_budget_exceeded"),
            onStatus(
              `[runner] shutdown exceeded ${jt}ms (session-stop-grace + post-session-hook-timeout` +
                (config.pushOutcomeOnRelease ? " + push-on-release window" : "") +
                ` + ${Lr / 1000}s); force-exiting. The post-session hook had its full budget; post-hook cleanup may have been cut short. ${E.size} session(s) still active.`,
            ),
            await e.flushLogSink?.(),
            process.exit(1));
        }
      }
      if (De.size > 0)
        (onStatus(
          `[runner] shutdown: waiting for ${De.size} in-flight session release(s) to settle before deregistering`,
        ),
          await withBoundedTimeout(
            Promise.allSettled([...De.values()]),
            Ni,
            "[runner:exit] release settle",
          ).catch(() => {
            (abortController.abort(),
              onStatus(
                `[runner] shutdown: ${De.size} session release(s) did not settle within ${Ni / 1000}s \u2014 deregistering anyway (those sessions are requeued rather than parked)`,
              ));
          }));
      await resolved;
    } finally {
      clearInterval(Pn);
    }
    let Jt = !1,
      In = await resolved,
      nn =
        aborted || $n === "shutdown"
          ? In?.present
            ? "host_drain"
            : "shutdown_signal"
          : Pt
            ? "retire_at"
            : oe && !ge
              ? "idle_release"
              : "";
    if (ke !== void 0 && In?.deadlineMs !== void 0)
      ke.host_deadline_unix_s = Math.round(In.deadlineMs / 1000);
    await withBoundedTimeout(
      apiClient
        .deregisterRunner(tokenState.runnerToken, { reason: nn, drain_hold: ke })
        .then(() => {
          if ((onStatus("[runner:exit] Deregistered"), !Jt))
            ((Jt = !0), logFeatureOk("self_hosted_deregister"));
        })
        .catch((tt) => {
          if ((onDebug(`[runner:exit] deregisterRunner failed (best-effort): ${tt}`), !Jt))
            ((Jt = !0), logFeatureSad("self_hosted_deregister", "rpc_failed"));
        }),
      5000,
      "[runner:exit] deregister",
    ).catch(() => {
      if (
        (onDebug("[runner:exit] deregisterRunner timed out (best-effort) \u2014 lease expiry will requeue"),
        !Jt)
      )
        ((Jt = !0), logFeatureSad("self_hosted_deregister", "timeout"));
    });
  }
}
//@ chunk-hm0ce8vc.js:320208-320369 placement
function nextPollDelayMs(e, n) {
  let r = e ? Date.parse(e) : NaN,
    s = Number.isNaN(r) ? To : Math.max(hh, Math.min(ph, Math.floor((r - Date.now()) / 3))),
    a = parseDurationSeconds(n);
  return a === void 0 ? s : Math.min(s, a);
}
//@ chunk-hm0ce8vc.js:320369-320570 placement
function parseDurationSeconds(e) {
  let n = e === void 0 ? null : /^(\d{1,15})(?:\.(\d{1,9}))?s$/.exec(e);
  if (!n) return;
  let r = n[2] ? Number(n[2].padEnd(9, "0")) : 0,
    s = Number(n[1]) * 1000 + Math.floor(r / 1e6);
  return s > 0 ? Math.max(gh, s) : void 0;
}
//@ chunk-hm0ce8vc.js:320570-320688 placement
function backoffDelayMs(e, n, r) {
  let min = Math.min(yh, ku * 2 ** Math.max(0, e - 1)),
    floored = Math.floor(min / 2 + Math.random() * (min / 2));
  return clampToLeaseExpiry(floored, n, ku, r);
}
//@ chunk-hm0ce8vc.js:320688-320839 placement
function clampToLeaseExpiry(e, n, r, s) {
  let a = n === void 0 ? NaN : Date.parse(n) - Date.now();
  if (!(a > 0)) return e;
  let min = Math.min(a - bh, parseDurationSeconds(s) ?? 1 / 0);
  return Math.min(e, Math.max(r, min));
}
//@ chunk-hm0ce8vc.js:320839-321020 placement
async function writeRunnerFileBestEffort(e, n, r, s) {
  try {
    (await mkdir(e, { recursive: !0, mode: 448 }), await writeFile(`${e}/${n}`, r, { mode: 384 }));
  } catch (error) {
    s(`[runner:debug] failed to write ${n} to ${e} (best-effort): ${error}`);
  }
}
