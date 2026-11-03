/**
 * services/selfHostedRunner/runnerConfig.ts
 *
 * 2.1.316 新增：自托管 runner 的命令行与 SELF_HOSTED_RUNNER_* 环境变量解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (23)
 * attribution: placement 23
 */
import { resolve, dirname } from "path";
import { lstat, open, rm, mkdir, readFile } from "fs/promises";
import { constants } from "fs";
import { envPositiveMs } from "./launcherHooks.js";
import { checkNetworkPath, UNVETTABLE_LINK_MESSAGE } from "../../utils/fsSafety/networkPathCheck.js";
import { isPathAbsent, errorMessage } from "../../utils/errors.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { ENV_DEFAULT_TIMEOUT_MS, NO_ALLOW } from "../../selfHostedRunner/serverAutoMode.js";
import { parseIntLoose, isEnvDefinedFalsy, isEnvTruthy } from "../../utils/envUtils.js";
import { jsonStringify, isStandaloneExecutable } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { getSpawnSessionIdFromJwt } from "./sessionLaunch.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";

//@ chunk-hm0ce8vc.js:218854-218976 placement
/**
 * 自托管 runner 的默认配置值：并发会话数、信任工作区等开关默认值，以及各类轮询/退避/超时的基准。
 */
var RUNNER_KIND = "runner";
var HTTPS_API_ANTHROPIC_COM = "https://api.anthropic.com";
var DEFAULT_SESSION_CAPACITY = 1;
var TRUST_WORKSPACE_DEFAULT = true;
var REMOVE_SESSION_STATE_DEFAULT = false;
var DIFF_FINDS_NESTED_REPO_DEFAULT = false;
var DEFAULT_POLL_INTERVAL_MS = 20000;
var MIN_POLL_INTERVAL_MS = 5000;
var MAX_POLL_INTERVAL_MS = 30000;
var MIN_BACKOFF_MS = 1000;
var SHUTDOWN_LEASE_HEARTBEAT_MS = 20000;
var RELEASE_IN_FLIGHT_WAIT_MS = 20000;
//@ chunk-hm0ce8vc.js:218976-219147 placement
function runnerRetireAtMs() {
  let envSelfHostedRunnerRetireAt = process.env.SELF_HOSTED_RUNNER_RETIRE_AT;
  if (envSelfHostedRunnerRetireAt === undefined || envSelfHostedRunnerRetireAt === "") return 0;
  let n = Number(envSelfHostedRunnerRetireAt);
  if (!Number.isSafeInteger(n) || n < MAX_TIMESTAMP_SECONDS || n > MIN_DURATION_MS) return 0;
  return n * 1000;
}
//@ chunk-hm0ce8vc.js:219147-219171 placement
/**
 * 读取 deadline 文件时一次读入的字节数与相关小上限。
 */
var MAX_SECRET_FILE_READ_BYTES = 64;
var DRAIN_MARKER_READ_TIMEOUT_MS = 2000;
var MAX_LISTED_SESSION_IDS = 64;
//@ chunk-hm0ce8vc.js:219171-219286 placement
function drainMarkerFile() {
  let envSelfHostedRunnerDrainMarkerFile = process.env.SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE;
  return envSelfHostedRunnerDrainMarkerFile === undefined || envSelfHostedRunnerDrainMarkerFile.trim() === ""
    ? undefined
    : resolve(envSelfHostedRunnerDrainMarkerFile);
}
//@ chunk-hm0ce8vc.js:219286-219329 placement
/**
 * hold-idle 文件的 mtime 新鲜窗口、残留查找超时、默认最大 hold 与重试间隔。
 */
var HOLD_IDLE_MTIME_FRESH_MS = 180000;
var LEFTOVER_HOLD_LOOK_TIMEOUT_MS = 30000;
var DEFAULT_MAX_HOLD_MS = 86400000;
var RETIRE_RELEASE_RETRY_MS = 2000;
//@ chunk-hm0ce8vc.js:219329-219441 placement
function holdIdleFile() {
  let envSelfHostedRunnerHoldIdleFile = process.env.SELF_HOSTED_RUNNER_HOLD_IDLE_FILE;
  return envSelfHostedRunnerHoldIdleFile === undefined || envSelfHostedRunnerHoldIdleFile.trim() === ""
    ? undefined
    : resolve(envSelfHostedRunnerHoldIdleFile);
}
//@ chunk-hm0ce8vc.js:219441-219577 placement
function getMaxHoldMs() {
  let envSelfHostedRunnerMaxHoldMs = process.env.SELF_HOSTED_RUNNER_MAX_HOLD_MS;
  return envSelfHostedRunnerMaxHoldMs === undefined || envSelfHostedRunnerMaxHoldMs.trim() === ""
    ? DEFAULT_MAX_HOLD_MS
    : envPositiveMs("SELF_HOSTED_RUNNER_MAX_HOLD_MS");
}
//@ chunk-hm0ce8vc.js:219577-220001 placement
async function checkPathNotOnNetworkLocation(e, n) {
  let r = await checkNetworkPath(e);
  if (r === UNVETTABLE_LINK_MESSAGE)
    throw Error(
      "the path could not be checked for links to a network location: a folder or link on the way could not be read",
    );
  if (r !== undefined)
    throw Error(
      "the path, or a link on the way to it, leads to a network location; point --hold-idle-file at a local file",
    );
  let s = await lstat(e).catch((error) => {
    if (isPathAbsent(error)) return;
    throw error;
  });
  return s !== undefined && s.isFile() && Math.abs(n - s.mtimeMs) < HOLD_IDLE_MTIME_FRESH_MS;
}
//@ chunk-hm0ce8vc.js:220001-220804 placement
async function readRegularFileSafe(e) {
  let n = await lstat(e).catch((error) => {
    let code = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "";
    if (code === "ENOENT" || code === "ENOTDIR") return;
    throw error;
  });
  if (n === undefined)
    return {
      present: false,
      deadlineMs: undefined,
    };
  let r;
  try {
    if (!n.isFile())
      return {
        present: true,
        deadlineMs: undefined,
        unreadable: "not a regular file",
      };
    r = await open(e, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
    let s = Buffer.alloc(MAX_SECRET_FILE_READ_BYTES);
    let { bytesRead } = await r.read(s, 0, MAX_SECRET_FILE_READ_BYTES, 0);
    let replaced = getFirstLine(s.toString("utf8", 0, bytesRead)).replace(/\r$/, "");
    if (!/^[0-9]+$/.test(replaced))
      return {
        present: true,
        deadlineMs: undefined,
      };
    let l = Number(replaced);
    if (!Number.isSafeInteger(l) || l < MAX_TIMESTAMP_SECONDS || l > MIN_DURATION_MS)
      return {
        present: true,
        deadlineMs: undefined,
      };
    return {
      present: true,
      deadlineMs: l * 1000,
    };
  } catch (error) {
    return {
      present: true,
      deadlineMs: undefined,
      unreadable:
        error instanceof Error && "code" in error && typeof error.code === "string"
          ? error.code
          : errorMessage(error),
    };
  } finally {
    r?.close().catch(() => {});
  }
}
//@ chunk-hm0ce8vc.js:220804-220949 placement
/**
 * 健康探测、轮询、退避与租约相关的上限与默认值，以及默认工作目录、端口、时间戳合法区间。
 */
var HEALTH_PROBE_INTERVAL_MS = 1000;
var MAX_HEALTH_PROBE_BACKOFF_MS = 5000;
var HEALTH_PROBE_BACKOFF_BASE_MS = 2000;
var MAX_POLL_DELAY_MS = DEFAULT_POLL_INTERVAL_MS;
var LEASE_EXPIRY_POLL_MARGIN_MS = ENV_DEFAULT_TIMEOUT_MS + 2000;
var LEASE_5XX_RETRY_DELAY_MS = 5000;
var ENV_SECRET_READ_TIMEOUT_MS = 1e4;
var DEFAULT_BASE_DIR = "/workspace";
var DEFAULT_HEALTH_PORT = 8080;
var MAX_KILL_AFTER_MINUTES = 10080;
var MIN_TIMESTAMP_SECONDS = 604800;
var MAX_TIMESTAMP_SECONDS = 1e9;
var MIN_DURATION_MS = 100000000000;
var ENV_SECRET_READ_TIMEOUT_MS_2 = 15000;
var DEFAULT_POST_SESSION_ALLOWANCE_MS = 60000;
//@ chunk-hm0ce8vc.js:220949-221157 placement
function parseHealthPort(e, n) {
  if (e === undefined || e === "") return n;
  let intLoose = parseIntLoose(e);
  if (Number.isNaN(intLoose) || intLoose < 0 || intLoose > 65535)
    throw Error(
      `SELF_HOSTED_RUNNER_HEALTH_PORT must be an integer in [0, 65535] (0 disables), got: ${jsonStringify(e)}`,
    );
  return intLoose;
}
//@ chunk-hm0ce8vc.js:221157-221332 placement
function parseBooleanEnv(e, n, r) {
  if (isEnvDefinedFalsy(n)) return false;
  if (isEnvTruthy(n)) return true;
  if (n === undefined || n.trim() === "") return r;
  throw Error(`${e} must be one of 1/true/yes/on or 0/false/no/off (got: ${jsonStringify(n)})`);
}
//@ chunk-hm0ce8vc.js:221332-221570 placement
function parseConfineRepoSettings(e) {
  if (e === undefined || e.trim() === "") return "warn";
  let lower = e.trim().toLowerCase();
  if (lower === "enforce" || lower === "warn" || lower === "off") return lower;
  throw Error(
    `SELF_HOSTED_RUNNER_CONFINE_REPO_SETTINGS must be one of enforce/warn/off (got: ${jsonStringify(e)})`,
  );
}
//@ chunk-hm0ce8vc.js:221570-221936 placement
var SERVER_AUTO_MODE_LISTS_DESCRIPTIONS = {
  all: "when the server asks, sessions apply all of its auto mode lists, including allow, its exceptions to soft block rules",
  "no-allow":
    "when the server asks, sessions apply its auto mode restrictions and facts, but not allow, its exceptions to soft block rules",
  none: "sessions apply none of the server's auto mode lists, not even its soft_deny restrictions",
};
//@ chunk-hm0ce8vc.js:221936-222175 placement
function parseServerAutoModeLists(e) {
  if (e === undefined || e.trim() === "") return NO_ALLOW;
  let lower = e.trim().toLowerCase();
  if (lower === "all" || lower === "no-allow" || lower === "none") return lower;
  throw Error(
    `SELF_HOSTED_RUNNER_SERVER_AUTO_MODE_LISTS must be one of all/no-allow/none (got: ${jsonStringify(e)})`,
  );
}
//@ chunk-hm0ce8vc.js:222175-222395 placement
function parseHostConfigSnapshotMode(e) {
  if (e === undefined || e.trim() === "") return "disk";
  let lower = e.trim().toLowerCase();
  if (lower === "disk" || lower === "memory") return lower;
  throw Error(
    `SELF_HOSTED_RUNNER_HOST_CONFIG_SNAPSHOT must be one of disk/memory (got: ${jsonStringify(e)})`,
  );
}
//@ chunk-hm0ce8vc.js:222395-233662 placement
/**
 * 解析 claude self-hosted-runner 的全部参数与 SELF_HOSTED_RUNNER_* 环境变量（约 11 KB）。
 */
function parseRunnerOptions(e) {
  let SELF_HOSTED_RUNNER_BASE_DIR = process.env.SELF_HOSTED_RUNNER_BASE_DIR || undefined;
  let r = {
    apiUrl: HTTPS_API_ANTHROPIC_COM,
    capacity: DEFAULT_SESSION_CAPACITY,
    baseDir: resolve(SELF_HOSTED_RUNNER_BASE_DIR ?? DEFAULT_BASE_DIR),
    baseDirSource: SELF_HOSTED_RUNNER_BASE_DIR === undefined ? "default" : "env",
    execPath: process.env.SELF_HOSTED_RUNNER_EXEC_PATH,
    logLevel: "info",
    logFile: process.env.SELF_HOSTED_RUNNER_LOG_FILE || undefined,
    healthPort: parseHealthPort(process.env.SELF_HOSTED_RUNNER_HEALTH_PORT, DEFAULT_HEALTH_PORT),
    debugTokenDir: process.env.SELF_HOSTED_RUNNER_DEBUG_TOKEN_DIR,
    lockToAccountId: process.env.SELF_HOSTED_RUNNER_LOCK_TO_ACCOUNT,
    clientLabel: process.env.SELF_HOSTED_RUNNER_CLIENT_LABEL?.trim() || undefined,
    gitSshRewriteHosts: [],
    gitHostRewrites: [],
    useAnthropicGitProxy: isEnvTruthy(process.env.CLAUDE_RUNNER_USE_GIT_PROXY),
    configureGit: isEnvTruthy(process.env.SELF_HOSTED_RUNNER_CONFIGURE_GIT),
    pushOutcomeOnRelease: isEnvTruthy(process.env.SELF_HOSTED_RUNNER_PUSH_OUTCOME_ON_RELEASE),
    trustWorkspace: parseBooleanEnv(
      "SELF_HOSTED_RUNNER_TRUST_WORKSPACE",
      process.env.SELF_HOSTED_RUNNER_TRUST_WORKSPACE,
      TRUST_WORKSPACE_DEFAULT,
    ),
    removeSessionState: parseBooleanEnv(
      "SELF_HOSTED_RUNNER_REMOVE_SESSION_STATE",
      process.env.SELF_HOSTED_RUNNER_REMOVE_SESSION_STATE,
      REMOVE_SESSION_STATE_DEFAULT,
    ),
    diffFindsNestedRepository: parseBooleanEnv(
      "SELF_HOSTED_RUNNER_DIFF_FINDS_NESTED_REPOSITORY",
      process.env.SELF_HOSTED_RUNNER_DIFF_FINDS_NESTED_REPOSITORY,
      DIFF_FINDS_NESTED_REPO_DEFAULT,
    ),
    confineRepoSettings: parseConfineRepoSettings(process.env.SELF_HOSTED_RUNNER_CONFINE_REPO_SETTINGS),
    serverAutoModeLists: parseServerAutoModeLists(process.env.SELF_HOSTED_RUNNER_SERVER_AUTO_MODE_LISTS),
    hostConfigSnapshot: parseHostConfigSnapshotMode(process.env.SELF_HOSTED_RUNNER_HOST_CONFIG_SNAPSHOT),
    envSetByFlag: new Set(),
  };
  if (process.env.SELF_HOSTED_RUNNER_HOOKS_DIR)
    process.env.SELF_HOSTED_RUNNER_HOOKS_DIR = resolve(process.env.SELF_HOSTED_RUNNER_HOOKS_DIR);
  for (let j = 0; j < e.length; j++) {
    let o = e[j];
    let l = e[j + 1];
    switch (o) {
      case "--api-url":
        if (l) {
          r.apiUrl = l;
          j++;
        }
        break;
      case "--pool-secret-file":
      case "--environment-secret-file":
        if (o === "--pool-secret-file")
          console.error("[runner:warn] --pool-secret-file is deprecated; use --environment-secret-file");
        if (l) {
          r.poolSecretFile = l;
          j++;
        }
        break;
      case "--capacity":
        if (l) {
          let intLoose = parseIntLoose(l);
          if (Number.isNaN(intLoose) || intLoose < 1)
            throw Error(`--capacity must be a positive integer, got: ${l}`);
          r.capacity = intLoose;
          j++;
        }
        break;
      case "--base-dir":
        if (l) {
          r.baseDir = resolve(l);
          r.baseDirSource = "flag";
          j++;
        }
        break;
      case "--exec-path":
        if (l) {
          r.execPath = l;
          j++;
        }
        break;
      case "--hooks-dir":
        if (l) {
          process.env.SELF_HOSTED_RUNNER_HOOKS_DIR = resolve(l);
          j++;
        }
        break;
      case "--git-ssh-rewrite":
        if (!l) throw Error("--git-ssh-rewrite requires a hostname");
        r.gitSshRewriteHosts.push(l);
        j++;
        break;
      case "--git-host-rewrite": {
        if (!l) throw Error("--git-host-rewrite requires <from>=<to>");
        let index = l.indexOf("=");
        if (index <= 0 || index === l.length - 1)
          throw Error(`--git-host-rewrite requires <from>=<to>, got: ${l}`);
        let lower = l.slice(0, index).toLowerCase();
        let sliced = l.slice(index + 1);
        if (lower.includes("://") || lower.includes("/") || sliced.includes("://") || sliced.includes("/"))
          throw Error(
            `--git-host-rewrite expects bare hostnames (e.g. ext.example.com=int.example.com), not URLs. Got: ${l}`,
          );
        if (r.gitHostRewrites.some(([S]) => S === lower))
          throw Error(`duplicate --git-host-rewrite for '${lower}'`);
        r.gitHostRewrites.push([lower, sliced]);
        j++;
        break;
      }
      case "--use-anthropic-git-proxy":
        r.useAnthropicGitProxy = true;
        break;
      case "--configure-git":
        r.configureGit = true;
        break;
      case "--push-outcome-on-release":
        r.pushOutcomeOnRelease = true;
        break;
      case "--trust-workspace":
        if (l === "false" || l === "0") {
          r.trustWorkspace = false;
          j++;
        } else if (l === "true" || l === "1") {
          r.trustWorkspace = true;
          j++;
        } else r.trustWorkspace = true;
        break;
      case "--remove-session-state":
        if (l === "false" || l === "0") {
          r.removeSessionState = false;
          j++;
        } else if (l === "true" || l === "1") {
          r.removeSessionState = true;
          j++;
        } else r.removeSessionState = true;
        break;
      case "--diff-finds-nested-repository":
        if (l === "false" || l === "0") {
          r.diffFindsNestedRepository = false;
          j++;
        } else if (l === "true" || l === "1") {
          r.diffFindsNestedRepository = true;
          j++;
        } else r.diffFindsNestedRepository = true;
        break;
      case "--confine-repo-settings":
        if (l === "enforce" || l === "warn" || l === "off") {
          r.confineRepoSettings = l;
          j++;
        } else
          throw Error(`--confine-repo-settings requires one of enforce/warn/off (got: ${jsonStringify(l)})`);
        break;
      case "--server-auto-mode-lists":
        if (l === "all" || l === "no-allow" || l === "none") {
          r.serverAutoModeLists = l;
          j++;
        } else
          throw Error(
            `--server-auto-mode-lists requires one of all/no-allow/none (got: ${jsonStringify(l)})`,
          );
        break;
      case "--host-config-snapshot":
        if (l === "disk" || l === "memory") {
          r.hostConfigSnapshot = l;
          j++;
        } else throw Error(`--host-config-snapshot requires one of disk/memory (got: ${jsonStringify(l)})`);
        break;
      case "--log-level":
        if (l) {
          r.logLevel = l;
          j++;
        }
        break;
      case "--log-file":
        if (l) {
          r.logFile = l;
          j++;
        }
        break;
      case "--health-port":
        if (l) {
          let intLoose = parseIntLoose(l);
          if (Number.isNaN(intLoose) || intLoose < 0 || intLoose > 65535)
            throw Error(`--health-port must be an integer in [0, 65535] (0 disables), got: ${l}`);
          r.healthPort = intLoose;
          j++;
        }
        break;
      case "--kill-session-after-min": {
        if (l) {
          let u = Number(l);
          if (!Number.isFinite(u) || u < 0 || u > MAX_KILL_AFTER_MINUTES)
            throw Error(
              `--kill-session-after-min must be a non-negative number of minutes (0 disables, max ${MAX_KILL_AFTER_MINUTES}), got: ${l}`,
            );
          process.env.SELF_HOSTED_RUNNER_MAX_LIFETIME_MS = String(u * 60 * 1000);
          r.envSetByFlag.add("SELF_HOSTED_RUNNER_MAX_LIFETIME_MS");
          j++;
        }
        break;
      }
      case "--exit-if-unused-min": {
        if (l) {
          let u = Number(l);
          if (!Number.isFinite(u) || u < 0 || u > MAX_KILL_AFTER_MINUTES)
            throw Error(
              `--exit-if-unused-min must be a non-negative number of minutes (0 disables, max ${MAX_KILL_AFTER_MINUTES}), got: ${l}`,
            );
          process.env.SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS = String(u * 60 * 1000);
          r.envSetByFlag.add("SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS");
          j++;
        }
        break;
      }
      case "--session-stop-grace-sec": {
        let u = e[++j];
        let h = Number(u);
        if (!u || !Number.isFinite(h) || h <= 0)
          throw Error(`--session-stop-grace-sec must be a positive number of seconds, got: ${u}`);
        process.env.SELF_HOSTED_RUNNER_SESSION_STOP_GRACE_MS = String(h * 1000);
        break;
      }
      case "--sigkill-timeout-sec":
        throw Error(
          "--sigkill-timeout-sec was renamed to --session-stop-grace-sec. It controls how long to wait for the Claude process to exit cleanly after a session ends, before force-killing it. The post-session hook runs after this.",
        );
      case "--post-session-hook-timeout-sec": {
        let u = e[++j];
        let h = Number(u);
        if (!u || !Number.isFinite(h) || h <= 0)
          throw Error(`--post-session-hook-timeout-sec must be a positive number of seconds, got: ${u}`);
        process.env.SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS = String(h * 1000);
        break;
      }
      case "--checkout-hook-timeout-min": {
        let u = e[++j];
        let h = Number(u);
        if (!u || !Number.isFinite(h) || h < 0 || h > MAX_KILL_AFTER_MINUTES)
          throw Error(
            `--checkout-hook-timeout-min must be a non-negative number of minutes (0 disables, max ${MAX_KILL_AFTER_MINUTES}), got: ${u}`,
          );
        process.env.SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS = String(h * 60 * 1000);
        r.envSetByFlag.add("SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS");
        break;
      }
      case "--drain-wait-bg-tasks-sec":
      case "--drain-wait-sec": {
        if (o === "--drain-wait-bg-tasks-sec")
          console.error(
            "[runner:warn] --drain-wait-bg-tasks-sec is deprecated; use --drain-wait-sec (it now also waits for an in-flight foreground turn, not only background tasks)",
          );
        let u = e[++j];
        let h = Number(u);
        if (!u || !Number.isFinite(h) || h < 0 || h > 86400)
          throw Error(`${o} must be a non-negative number of seconds (max 86400), got: ${u}`);
        process.env.SELF_HOSTED_RUNNER_DRAIN_WAIT_MS = String(h * 1000);
        break;
      }
      case "--drain-marker-file": {
        let u = e[++j];
        if (u === undefined || u.trim() === "" || u.startsWith("--"))
          throw Error(
            `${o} requires a file path (the marker your host writes to announce a graceful drain), got: ${u === undefined ? "nothing" : jsonStringify(u)}`,
          );
        process.env.SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE = resolve(u);
        break;
      }
      case "--drain-grace-sec": {
        if (l) {
          let u = Number(l);
          if (!Number.isFinite(u) || u < 0 || u > MIN_TIMESTAMP_SECONDS)
            throw Error(
              `--drain-grace-sec must be a non-negative number of seconds (0 = immediate, max ${MIN_TIMESTAMP_SECONDS}), got: ${l}`,
            );
          process.env.SELF_HOSTED_RUNNER_DRAIN_GRACE_MS = String(u * 1000);
          j++;
        }
        break;
      }
      case "--release-idle-session-min": {
        if (l) {
          let u = Number(l);
          if (!Number.isFinite(u) || u < 0 || u > MAX_KILL_AFTER_MINUTES)
            throw Error(
              `--release-idle-session-min must be a non-negative number of minutes (0 disables, max ${MAX_KILL_AFTER_MINUTES}), got: ${l}`,
            );
          process.env.SELF_HOSTED_RUNNER_SESSION_IDLE_MS = String(u * 60 * 1000);
          r.envSetByFlag.add("SELF_HOSTED_RUNNER_SESSION_IDLE_MS");
          j++;
        }
        break;
      }
      case "--hold-idle-file": {
        let u = e[++j];
        if (u === undefined || u.trim() === "" || u.startsWith("--"))
          throw Error(
            `${o} requires a file path (a file your host keeps fresh while the session has processes left running), got: ${u === undefined ? "nothing" : jsonStringify(u)}`,
          );
        process.env.SELF_HOSTED_RUNNER_HOLD_IDLE_FILE = resolve(u);
        r.envSetByFlag.add("SELF_HOSTED_RUNNER_HOLD_IDLE_FILE");
        break;
      }
      case "--max-hold-min": {
        let u = e[++j];
        let h = Number(u);
        if (u === undefined || u.trim() === "" || !Number.isFinite(h) || h < 0 || h > MAX_KILL_AFTER_MINUTES)
          throw Error(
            `${o} must be a non-negative number of minutes (0 disables, max ${MAX_KILL_AFTER_MINUTES}), got: ${u}`,
          );
        process.env.SELF_HOSTED_RUNNER_MAX_HOLD_MS = String(h * 60 * 1000);
        r.envSetByFlag.add("SELF_HOSTED_RUNNER_MAX_HOLD_MS");
        break;
      }
      case "--startup-timeout-min": {
        if (l) {
          let u = Number(l);
          if (!Number.isFinite(u) || u < 0 || u > MAX_KILL_AFTER_MINUTES)
            throw Error(
              `--startup-timeout-min must be a non-negative number of minutes (0 disables, max ${MAX_KILL_AFTER_MINUTES}), got: ${l}`,
            );
          process.env.SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS = String(u * 60 * 1000);
          r.envSetByFlag.add("SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS");
          j++;
        }
        break;
      }
      case "--defer-shutdown-max-min": {
        let u = e[++j];
        let h = Number(u);
        if (u === undefined || u.trim() === "" || !Number.isFinite(h) || h < 0 || h > MAX_KILL_AFTER_MINUTES)
          throw Error(
            `${o} must be a non-negative number of minutes (0 disables, max ${MAX_KILL_AFTER_MINUTES}), got: ${u}`,
          );
        process.env.SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS = String(h * 60 * 1000);
        r.envSetByFlag.add("SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS");
        break;
      }
      case "--retire-at": {
        let u = e[++j];
        let h = Number(u);
        if (!u || !Number.isSafeInteger(h) || h < MAX_TIMESTAMP_SECONDS || h > MIN_DURATION_MS)
          throw Error(
            `--retire-at must be an absolute Unix timestamp in whole SECONDS (e.g. the output of 'date +%s' plus the runner's intended lifetime \u2014 not milliseconds, not a duration), got: ${u}`,
          );
        process.env.SELF_HOSTED_RUNNER_RETIRE_AT = String(h);
        break;
      }
      case "--lock-to-account":
        if (l) {
          r.lockToAccountId = l;
          j++;
        }
        break;
      case "--client-label":
        if (l && !l.startsWith("--")) {
          let trimmed = l.trim();
          if (trimmed) {
            r.clientLabel = trimmed;
            j++;
          }
        }
        break;
      case "--debug-token-dir":
        if (l) {
          r.debugTokenDir = l;
          j++;
        }
        break;
      case "--agent-proxy-url": {
        let u = e[++j];
        if (u === undefined || u.trim() === "" || u.startsWith("--"))
          throw Error("--agent-proxy-url requires your proxy's https:// URL");
        env.set("SELF_HOSTED_RUNNER_AGENT_PROXY_URL", u);
        r.envSetByFlag.add("SELF_HOSTED_RUNNER_AGENT_PROXY_URL");
        break;
      }
      case "--proxy-authorization-command":
      case "--proxy-authorization-file":
        if (l === undefined || l.startsWith("--"))
          throw Error("--proxy-authorization-command / --proxy-authorization-file requires a value");
        if (o === "--proxy-authorization-command") r.proxyAuthorizationCommand = l;
        else r.proxyAuthorizationFile = l;
        j++;
        break;
      default:
        if (o?.startsWith("--")) throw Error(`unknown flag ${o}`);
        if (o === "")
          throw Error("empty argument \u2014 a flag value may be unset (failed env/K8s substitution?)");
        if (o !== undefined)
          throw Error(`unexpected argument '${o}' \u2014 this command takes no positional arguments`);
        break;
    }
  }
  let s = new Set(r.gitSshRewriteHosts.map((gitSshRewriteHost) => gitSshRewriteHost.toLowerCase()));
  for (let [a, o] of r.gitHostRewrites)
    if (s.has(a))
      console.error(
        `[runner:warn] --git-ssh-rewrite '${a}' will not match: --git-host-rewrite rewrites it to '${o}' first. Did you mean --git-ssh-rewrite '${o}'?`,
      );
  if (r.diffFindsNestedRepository && r.capacity > 1)
    throw Error(
      "--diff-finds-nested-repository requires --capacity 1. Turn the option off (the flag, or SELF_HOSTED_RUNNER_DIFF_FINDS_NESTED_REPOSITORY), or run every runner in this environment at --capacity 1. Why: another session's process, run by the same Unix user at the same time, could rewrite the checked copy of the repository's git settings after the check. In Claude Code's tests no rewritten setting made the git commands it runs under that copy start a program, but those tests cover one git version on Linux, so the runner also keeps other sessions out.",
    );
  return r;
}
//@ chunk-hm0ce8vc.js:233662-234138 placement
function warnCapacityOnSessionBoundRunner(e, capacity) {
  if (capacity <= 1) return null;
  if (getSpawnSessionIdFromJwt(e) === null) return null;
  return (
    `[runner:warn] --capacity ${capacity} has no effect on a session-bound runner: this work order is bound to one session, so this runner will serve exactly one session and the extra ${capacity - 1} slot(s) will not be used. To run multiple concurrent sessions for the same account ` +
    "per runner, register a fixed-fleet runner with the environment secret \u2014 see " +
    'docs/self-hosted-runners-guide.md \xA7 "Get started".'
  );
}
//@ chunk-hm0ce8vc.js:234138-234416 placement
function requireBaseDirOnWindows(baseDirSource, n = "linux") {
  if (n === "win32" && baseDirSource === "default")
    throw Error(
      "--base-dir (or SELF_HOSTED_RUNNER_BASE_DIR) is required on Windows: the built-in default is a POSIX container path that does not apply there. Pass the directory that repositories should be checked out under.",
    );
}
//@ chunk-hm0ce8vc.js:234416-234694 placement
async function resetRunnerHome(e) {
  await rm(e.globalCfgPath, {
    recursive: true,
    force: true,
  });
  await rm(e.homeGitconfigPath, {
    recursive: true,
    force: true,
  });
  for (let xdgGitDir of e.xdgGitDirs)
    await rm(xdgGitDir, {
      recursive: true,
      force: true,
    });
  await rm(e.runnerDir, {
    recursive: true,
    force: true,
  });
  await mkdir(dirname(e.globalCfgPath), {
    recursive: true,
  });
}
//@ chunk-hm0ce8vc.js:234694-235481 placement
/**
 * 带超时读取环境密钥文件（CSI/secret 挂载）。
 */
async function readEnvironmentSecretFile(e, n = (r) => console.error(r)) {
  if (e.poolSecretFile) {
    let a;
    try {
      a = await withBoundedTimeout(
        readFile(e.poolSecretFile, {
          encoding: "utf-8",
        }),
        ENV_SECRET_READ_TIMEOUT_MS,
        `environment-secret read from ${e.poolSecretFile}`,
      );
    } catch (error) {
      let l = errorMessage(error);
      if (l.includes("timed out after")) {
        n(`[runner:fatal] ${l} \u2014 check CSI/secret mount health`);
        process.exit(1);
      }
      throw Error(`Failed to read environment secret file ${e.poolSecretFile} (${l})`);
    }
    return a.trim();
  }
  let envSelfHostedRunnerEnvironmentSecret = process.env.SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET;
  if (envSelfHostedRunnerEnvironmentSecret) return envSelfHostedRunnerEnvironmentSecret.trim();
  let envSelfHostedRunnerPoolSecret = process.env.SELF_HOSTED_RUNNER_POOL_SECRET;
  if (envSelfHostedRunnerPoolSecret) {
    n(
      "[runner:warn] SELF_HOSTED_RUNNER_POOL_SECRET is deprecated; use SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET",
    );
    return envSelfHostedRunnerPoolSecret.trim();
  }
  throw Error(
    "No environment secret provided. Use --environment-secret-file or set SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET.",
  );
}
//@ chunk-hm0ce8vc.js:235481-235601 placement
function runnerExecPath(execPath) {
  if (execPath)
    return {
      execPath,
      execArgs: [],
    };
  return {
    execPath: process.execPath,
    execArgs: isStandaloneExecutable() ? [] : [process.argv[1]],
  };
}
//@ chunk-hm0ce8vc.js:235601-236182 placement
function warnDiffFindsNestedRepository(diffFindsNestedRepository, execPath) {
  return diffFindsNestedRepository && execPath
    ? `[runner] --diff-finds-nested-repository is on and sessions start through ${execPath}. If that is a script, it must put nothing before "$@" when it starts Claude Code (options after "$@" are fine): with an option of its own first, this option is off for the session; the session still runs, and this log then has a "[changes pane] repository not shown" line. The Claude Code it starts must be this runner's release or later; an older one exits with "unknown option '--runner-declares=\u2026'". See "Pass every argument through" in the operator guide.`
    : undefined;
}
export {
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
};
