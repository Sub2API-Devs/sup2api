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
import {
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  rm,
  rm as rm_2,
  rm as rm_3,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
} from "fs/promises";
import { constants, constants as constants_2, constants as constants_4 } from "fs";
import { envPositiveMs } from "./launcherHooks.js";
import { checkNetworkPath, UNVETTABLE_LINK_MESSAGE } from "../../utils/fsSafety/networkPathCheck.js";
import { isPathAbsent, errorMessage } from "../../utils/errors.js";
import { ws } from "../../utils/fsFlags.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { mvr, NO_ALLOW } from "../../selfHostedRunner/serverAutoMode.js";
import { parseIntLoose, isEnvDefinedFalsy, isEnvTruthy } from "../../utils/envUtils.js";
import { jsonStringify, isStandaloneExecutable } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { getSpawnSessionIdFromJwt } from "./sessionLaunch.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";

//@ chunk-hm0ce8vc.js:218854-218976 placement
var RUNNER_KIND = "runner",
  HTTPS_API_ANTHROPIC_COM = "https://api.anthropic.com",
  Ou = 1,
  Au = !0,
  Ai = !1,
  Ci = !1,
  To = 20000,
  hh = 5000,
  ph = 30000,
  gh = 1000,
  mh = 20000,
  Ni = 20000;
//@ chunk-hm0ce8vc.js:218976-219147 placement
function runnerRetireAtMs() {
  let envSelfHostedRunnerRetireAt = process.env.SELF_HOSTED_RUNNER_RETIRE_AT;
  if (envSelfHostedRunnerRetireAt === void 0 || envSelfHostedRunnerRetireAt === "") return 0;
  let n = Number(envSelfHostedRunnerRetireAt);
  if (!Number.isSafeInteger(n) || n < Li || n > Ui) return 0;
  return n * 1000;
}
//@ chunk-hm0ce8vc.js:219147-219171 placement
var Ru = 64,
  _h = 2000,
  Sh = 64;
//@ chunk-hm0ce8vc.js:219171-219286 placement
function drainMarkerFile() {
  let envSelfHostedRunnerDrainMarkerFile = process.env.SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE;
  return envSelfHostedRunnerDrainMarkerFile === void 0 || envSelfHostedRunnerDrainMarkerFile.trim() === ""
    ? void 0
    : resolve(envSelfHostedRunnerDrainMarkerFile);
}
//@ chunk-hm0ce8vc.js:219286-219329 placement
var Di = 180000,
  Nu = 30000,
  $u = 86400000,
  wh = 2000;
//@ chunk-hm0ce8vc.js:219329-219441 placement
function holdIdleFile() {
  let envSelfHostedRunnerHoldIdleFile = process.env.SELF_HOSTED_RUNNER_HOLD_IDLE_FILE;
  return envSelfHostedRunnerHoldIdleFile === void 0 || envSelfHostedRunnerHoldIdleFile.trim() === ""
    ? void 0
    : resolve(envSelfHostedRunnerHoldIdleFile);
}
//@ chunk-hm0ce8vc.js:219441-219577 placement
function getMaxHoldMs() {
  let envSelfHostedRunnerMaxHoldMs = process.env.SELF_HOSTED_RUNNER_MAX_HOLD_MS;
  return envSelfHostedRunnerMaxHoldMs === void 0 || envSelfHostedRunnerMaxHoldMs.trim() === ""
    ? $u
    : envPositiveMs("SELF_HOSTED_RUNNER_MAX_HOLD_MS");
}
//@ chunk-hm0ce8vc.js:219577-220001 placement
async function checkPathNotOnNetworkLocation(e, n) {
  let r = await checkNetworkPath(e);
  if (r === UNVETTABLE_LINK_MESSAGE)
    throw Error(
      "the path could not be checked for links to a network location: a folder or link on the way could not be read",
    );
  if (r !== void 0)
    throw Error(
      "the path, or a link on the way to it, leads to a network location; point --hold-idle-file at a local file",
    );
  let s = await lstat(e).catch((a) => {
    if (isPathAbsent(a)) return;
    throw a;
  });
  return s !== void 0 && s.isFile() && Math.abs(n - s.mtimeMs) < Di;
}
//@ chunk-hm0ce8vc.js:220001-220804 placement
async function readRegularFileSafe(e) {
  let n = await lstat(e).catch((s) => {
    let a = s instanceof Error && "code" in s && typeof s.code === "string" ? s.code : "";
    if (a === "ENOENT" || a === "ENOTDIR") return;
    throw s;
  });
  if (n === void 0) return { present: !1, deadlineMs: void 0 };
  let r;
  try {
    if (!n.isFile()) return { present: !0, deadlineMs: void 0, unreadable: "not a regular file" };
    r = await open(e, constants.O_RDONLY | ws);
    let alloc = Buffer.alloc(Ru),
      { bytesRead: bytesRead } = await r.read(alloc, 0, Ru, 0),
      replaced = getFirstLine(alloc.toString("utf8", 0, bytesRead)).replace(/\r$/, "");
    if (!/^[0-9]+$/.test(replaced)) return { present: !0, deadlineMs: void 0 };
    let l = Number(replaced);
    if (!Number.isSafeInteger(l) || l < Li || l > Ui) return { present: !0, deadlineMs: void 0 };
    return { present: !0, deadlineMs: l * 1000 };
  } catch (error) {
    return {
      present: !0,
      deadlineMs: void 0,
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
var HEALTH_PROBE_INTERVAL_MS = 1000,
  Th = 5000,
  ku = 2000,
  yh = To,
  bh = mvr + 2000,
  Oh = 5000,
  Ah = 1e4,
  Iu = "/workspace",
  Du = 8080,
  Gt = 10080,
  $i = 604800,
  Li = 1e9,
  Ui = 100000000000,
  Ch = 15000,
  ko = 60000;
//@ chunk-hm0ce8vc.js:220949-221157 placement
function parseHealthPort(e, n) {
  if (e === void 0 || e === "") return n;
  let r = parseIntLoose(e);
  if (Number.isNaN(r) || r < 0 || r > 65535)
    throw Error(
      `SELF_HOSTED_RUNNER_HEALTH_PORT must be an integer in [0, 65535] (0 disables), got: ${jsonStringify(e)}`,
    );
  return r;
}
//@ chunk-hm0ce8vc.js:221157-221332 placement
function parseBooleanEnv(e, n, r) {
  if (isEnvDefinedFalsy(n)) return !1;
  if (isEnvTruthy(n)) return !0;
  if (n === void 0 || n.trim() === "") return r;
  throw Error(`${e} must be one of 1/true/yes/on or 0/false/no/off (got: ${jsonStringify(n)})`);
}
//@ chunk-hm0ce8vc.js:221332-221570 placement
function parseConfineRepoSettings(e) {
  if (e === void 0 || e.trim() === "") return "warn";
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
  if (e === void 0 || e.trim() === "") return NO_ALLOW;
  let lower = e.trim().toLowerCase();
  if (lower === "all" || lower === "no-allow" || lower === "none") return lower;
  throw Error(
    `SELF_HOSTED_RUNNER_SERVER_AUTO_MODE_LISTS must be one of all/no-allow/none (got: ${jsonStringify(e)})`,
  );
}
//@ chunk-hm0ce8vc.js:222175-222395 placement
function parseHostConfigSnapshotMode(e) {
  if (e === void 0 || e.trim() === "") return "disk";
  let lower = e.trim().toLowerCase();
  if (lower === "disk" || lower === "memory") return lower;
  throw Error(
    `SELF_HOSTED_RUNNER_HOST_CONFIG_SNAPSHOT must be one of disk/memory (got: ${jsonStringify(e)})`,
  );
}
/**
 * 解析 claude self-hosted-runner 的全部参数与 SELF_HOSTED_RUNNER_* 环境变量（约 11 KB）。
 */
//@ chunk-hm0ce8vc.js:222395-233662 placement
function parseRunnerOptions(e) {
  let n = process.env.SELF_HOSTED_RUNNER_BASE_DIR || void 0,
    r = {
      apiUrl: HTTPS_API_ANTHROPIC_COM,
      capacity: Ou,
      baseDir: resolve(n ?? Iu),
      baseDirSource: n === void 0 ? "default" : "env",
      execPath: process.env.SELF_HOSTED_RUNNER_EXEC_PATH,
      logLevel: "info",
      logFile: process.env.SELF_HOSTED_RUNNER_LOG_FILE || void 0,
      healthPort: parseHealthPort(process.env.SELF_HOSTED_RUNNER_HEALTH_PORT, Du),
      debugTokenDir: process.env.SELF_HOSTED_RUNNER_DEBUG_TOKEN_DIR,
      lockToAccountId: process.env.SELF_HOSTED_RUNNER_LOCK_TO_ACCOUNT,
      clientLabel: process.env.SELF_HOSTED_RUNNER_CLIENT_LABEL?.trim() || void 0,
      gitSshRewriteHosts: [],
      gitHostRewrites: [],
      useAnthropicGitProxy: isEnvTruthy(process.env.CLAUDE_RUNNER_USE_GIT_PROXY),
      configureGit: isEnvTruthy(process.env.SELF_HOSTED_RUNNER_CONFIGURE_GIT),
      pushOutcomeOnRelease: isEnvTruthy(process.env.SELF_HOSTED_RUNNER_PUSH_OUTCOME_ON_RELEASE),
      trustWorkspace: parseBooleanEnv(
        "SELF_HOSTED_RUNNER_TRUST_WORKSPACE",
        process.env.SELF_HOSTED_RUNNER_TRUST_WORKSPACE,
        Au,
      ),
      removeSessionState: parseBooleanEnv(
        "SELF_HOSTED_RUNNER_REMOVE_SESSION_STATE",
        process.env.SELF_HOSTED_RUNNER_REMOVE_SESSION_STATE,
        Ai,
      ),
      diffFindsNestedRepository: parseBooleanEnv(
        "SELF_HOSTED_RUNNER_DIFF_FINDS_NESTED_REPOSITORY",
        process.env.SELF_HOSTED_RUNNER_DIFF_FINDS_NESTED_REPOSITORY,
        Ci,
      ),
      confineRepoSettings: parseConfineRepoSettings(process.env.SELF_HOSTED_RUNNER_CONFINE_REPO_SETTINGS),
      serverAutoModeLists: parseServerAutoModeLists(process.env.SELF_HOSTED_RUNNER_SERVER_AUTO_MODE_LISTS),
      hostConfigSnapshot: parseHostConfigSnapshotMode(process.env.SELF_HOSTED_RUNNER_HOST_CONFIG_SNAPSHOT),
      envSetByFlag: new Set(),
    };
  if (process.env.SELF_HOSTED_RUNNER_HOOKS_DIR)
    process.env.SELF_HOSTED_RUNNER_HOOKS_DIR = resolve(process.env.SELF_HOSTED_RUNNER_HOOKS_DIR);
  for (let a = 0; a < e.length; a++) {
    let o = e[a],
      l = e[a + 1];
    switch (o) {
      case "--api-url":
        if (l) ((r.apiUrl = l), a++);
        break;
      case "--pool-secret-file":
      case "--environment-secret-file":
        if (o === "--pool-secret-file")
          console.error("[runner:warn] --pool-secret-file is deprecated; use --environment-secret-file");
        if (l) ((r.poolSecretFile = l), a++);
        break;
      case "--capacity":
        if (l) {
          let u = parseIntLoose(l);
          if (Number.isNaN(u) || u < 1) throw Error(`--capacity must be a positive integer, got: ${l}`);
          ((r.capacity = u), a++);
        }
        break;
      case "--base-dir":
        if (l) ((r.baseDir = resolve(l)), (r.baseDirSource = "flag"), a++);
        break;
      case "--exec-path":
        if (l) ((r.execPath = l), a++);
        break;
      case "--hooks-dir":
        if (l) ((process.env.SELF_HOSTED_RUNNER_HOOKS_DIR = resolve(l)), a++);
        break;
      case "--git-ssh-rewrite":
        if (!l) throw Error("--git-ssh-rewrite requires a hostname");
        (r.gitSshRewriteHosts.push(l), a++);
        break;
      case "--git-host-rewrite": {
        if (!l) throw Error("--git-host-rewrite requires <from>=<to>");
        let index = l.indexOf("=");
        if (index <= 0 || index === l.length - 1)
          throw Error(`--git-host-rewrite requires <from>=<to>, got: ${l}`);
        let lower = l.slice(0, index).toLowerCase(),
          sliced = l.slice(index + 1);
        if (lower.includes("://") || lower.includes("/") || sliced.includes("://") || sliced.includes("/"))
          throw Error(
            `--git-host-rewrite expects bare hostnames (e.g. ext.example.com=int.example.com), not URLs. Got: ${l}`,
          );
        if (r.gitHostRewrites.some(([S]) => S === lower))
          throw Error(`duplicate --git-host-rewrite for '${lower}'`);
        (r.gitHostRewrites.push([lower, sliced]), a++);
        break;
      }
      case "--use-anthropic-git-proxy":
        r.useAnthropicGitProxy = !0;
        break;
      case "--configure-git":
        r.configureGit = !0;
        break;
      case "--push-outcome-on-release":
        r.pushOutcomeOnRelease = !0;
        break;
      case "--trust-workspace":
        if (l === "false" || l === "0") ((r.trustWorkspace = !1), a++);
        else if (l === "true" || l === "1") ((r.trustWorkspace = !0), a++);
        else r.trustWorkspace = !0;
        break;
      case "--remove-session-state":
        if (l === "false" || l === "0") ((r.removeSessionState = !1), a++);
        else if (l === "true" || l === "1") ((r.removeSessionState = !0), a++);
        else r.removeSessionState = !0;
        break;
      case "--diff-finds-nested-repository":
        if (l === "false" || l === "0") ((r.diffFindsNestedRepository = !1), a++);
        else if (l === "true" || l === "1") ((r.diffFindsNestedRepository = !0), a++);
        else r.diffFindsNestedRepository = !0;
        break;
      case "--confine-repo-settings":
        if (l === "enforce" || l === "warn" || l === "off") ((r.confineRepoSettings = l), a++);
        else
          throw Error(`--confine-repo-settings requires one of enforce/warn/off (got: ${jsonStringify(l)})`);
        break;
      case "--server-auto-mode-lists":
        if (l === "all" || l === "no-allow" || l === "none") ((r.serverAutoModeLists = l), a++);
        else
          throw Error(
            `--server-auto-mode-lists requires one of all/no-allow/none (got: ${jsonStringify(l)})`,
          );
        break;
      case "--host-config-snapshot":
        if (l === "disk" || l === "memory") ((r.hostConfigSnapshot = l), a++);
        else throw Error(`--host-config-snapshot requires one of disk/memory (got: ${jsonStringify(l)})`);
        break;
      case "--log-level":
        if (l) ((r.logLevel = l), a++);
        break;
      case "--log-file":
        if (l) ((r.logFile = l), a++);
        break;
      case "--health-port":
        if (l) {
          let u = parseIntLoose(l);
          if (Number.isNaN(u) || u < 0 || u > 65535)
            throw Error(`--health-port must be an integer in [0, 65535] (0 disables), got: ${l}`);
          ((r.healthPort = u), a++);
        }
        break;
      case "--kill-session-after-min": {
        if (l) {
          let u = Number(l);
          if (!Number.isFinite(u) || u < 0 || u > Gt)
            throw Error(
              `--kill-session-after-min must be a non-negative number of minutes (0 disables, max ${Gt}), got: ${l}`,
            );
          ((process.env.SELF_HOSTED_RUNNER_MAX_LIFETIME_MS = String(u * 60 * 1000)),
            r.envSetByFlag.add("SELF_HOSTED_RUNNER_MAX_LIFETIME_MS"),
            a++);
        }
        break;
      }
      case "--exit-if-unused-min": {
        if (l) {
          let u = Number(l);
          if (!Number.isFinite(u) || u < 0 || u > Gt)
            throw Error(
              `--exit-if-unused-min must be a non-negative number of minutes (0 disables, max ${Gt}), got: ${l}`,
            );
          ((process.env.SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS = String(u * 60 * 1000)),
            r.envSetByFlag.add("SELF_HOSTED_RUNNER_IDLE_SHUTDOWN_MS"),
            a++);
        }
        break;
      }
      case "--session-stop-grace-sec": {
        let u = e[++a],
          h = Number(u);
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
        let u = e[++a],
          h = Number(u);
        if (!u || !Number.isFinite(h) || h <= 0)
          throw Error(`--post-session-hook-timeout-sec must be a positive number of seconds, got: ${u}`);
        process.env.SELF_HOSTED_RUNNER_POST_SESSION_HOOK_TIMEOUT_MS = String(h * 1000);
        break;
      }
      case "--checkout-hook-timeout-min": {
        let u = e[++a],
          h = Number(u);
        if (!u || !Number.isFinite(h) || h < 0 || h > Gt)
          throw Error(
            `--checkout-hook-timeout-min must be a non-negative number of minutes (0 disables, max ${Gt}), got: ${u}`,
          );
        ((process.env.SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS = String(h * 60 * 1000)),
          r.envSetByFlag.add("SELF_HOSTED_RUNNER_CHECKOUT_HOOK_TIMEOUT_MS"));
        break;
      }
      case "--drain-wait-bg-tasks-sec":
      case "--drain-wait-sec": {
        if (o === "--drain-wait-bg-tasks-sec")
          console.error(
            "[runner:warn] --drain-wait-bg-tasks-sec is deprecated; use --drain-wait-sec (it now also waits for an in-flight foreground turn, not only background tasks)",
          );
        let u = e[++a],
          h = Number(u);
        if (!u || !Number.isFinite(h) || h < 0 || h > 86400)
          throw Error(`${o} must be a non-negative number of seconds (max 86400), got: ${u}`);
        process.env.SELF_HOSTED_RUNNER_DRAIN_WAIT_MS = String(h * 1000);
        break;
      }
      case "--drain-marker-file": {
        let u = e[++a];
        if (u === void 0 || u.trim() === "" || u.startsWith("--"))
          throw Error(
            `${o} requires a file path (the marker your host writes to announce a graceful drain), got: ${u === void 0 ? "nothing" : jsonStringify(u)}`,
          );
        process.env.SELF_HOSTED_RUNNER_DRAIN_MARKER_FILE = resolve(u);
        break;
      }
      case "--drain-grace-sec": {
        if (l) {
          let u = Number(l);
          if (!Number.isFinite(u) || u < 0 || u > $i)
            throw Error(
              `--drain-grace-sec must be a non-negative number of seconds (0 = immediate, max ${$i}), got: ${l}`,
            );
          ((process.env.SELF_HOSTED_RUNNER_DRAIN_GRACE_MS = String(u * 1000)), a++);
        }
        break;
      }
      case "--release-idle-session-min": {
        if (l) {
          let u = Number(l);
          if (!Number.isFinite(u) || u < 0 || u > Gt)
            throw Error(
              `--release-idle-session-min must be a non-negative number of minutes (0 disables, max ${Gt}), got: ${l}`,
            );
          ((process.env.SELF_HOSTED_RUNNER_SESSION_IDLE_MS = String(u * 60 * 1000)),
            r.envSetByFlag.add("SELF_HOSTED_RUNNER_SESSION_IDLE_MS"),
            a++);
        }
        break;
      }
      case "--hold-idle-file": {
        let u = e[++a];
        if (u === void 0 || u.trim() === "" || u.startsWith("--"))
          throw Error(
            `${o} requires a file path (a file your host keeps fresh while the session has processes left running), got: ${u === void 0 ? "nothing" : jsonStringify(u)}`,
          );
        ((process.env.SELF_HOSTED_RUNNER_HOLD_IDLE_FILE = resolve(u)),
          r.envSetByFlag.add("SELF_HOSTED_RUNNER_HOLD_IDLE_FILE"));
        break;
      }
      case "--max-hold-min": {
        let u = e[++a],
          h = Number(u);
        if (u === void 0 || u.trim() === "" || !Number.isFinite(h) || h < 0 || h > Gt)
          throw Error(`${o} must be a non-negative number of minutes (0 disables, max ${Gt}), got: ${u}`);
        ((process.env.SELF_HOSTED_RUNNER_MAX_HOLD_MS = String(h * 60 * 1000)),
          r.envSetByFlag.add("SELF_HOSTED_RUNNER_MAX_HOLD_MS"));
        break;
      }
      case "--startup-timeout-min": {
        if (l) {
          let u = Number(l);
          if (!Number.isFinite(u) || u < 0 || u > Gt)
            throw Error(
              `--startup-timeout-min must be a non-negative number of minutes (0 disables, max ${Gt}), got: ${l}`,
            );
          ((process.env.SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS = String(u * 60 * 1000)),
            r.envSetByFlag.add("SELF_HOSTED_RUNNER_STARTUP_TIMEOUT_MS"),
            a++);
        }
        break;
      }
      case "--defer-shutdown-max-min": {
        let u = e[++a],
          h = Number(u);
        if (u === void 0 || u.trim() === "" || !Number.isFinite(h) || h < 0 || h > Gt)
          throw Error(`${o} must be a non-negative number of minutes (0 disables, max ${Gt}), got: ${u}`);
        ((process.env.SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS = String(h * 60 * 1000)),
          r.envSetByFlag.add("SELF_HOSTED_RUNNER_DEFER_SHUTDOWN_MAX_MS"));
        break;
      }
      case "--retire-at": {
        let u = e[++a],
          h = Number(u);
        if (!u || !Number.isSafeInteger(h) || h < Li || h > Ui)
          throw Error(
            `--retire-at must be an absolute Unix timestamp in whole SECONDS (e.g. the output of 'date +%s' plus the runner's intended lifetime \u2014 not milliseconds, not a duration), got: ${u}`,
          );
        process.env.SELF_HOSTED_RUNNER_RETIRE_AT = String(h);
        break;
      }
      case "--lock-to-account":
        if (l) ((r.lockToAccountId = l), a++);
        break;
      case "--client-label":
        if (l && !l.startsWith("--")) {
          let trimmed = l.trim();
          if (trimmed) ((r.clientLabel = trimmed), a++);
        }
        break;
      case "--debug-token-dir":
        if (l) ((r.debugTokenDir = l), a++);
        break;
      case "--agent-proxy-url": {
        let u = e[++a];
        if (u === void 0 || u.trim() === "" || u.startsWith("--"))
          throw Error("--agent-proxy-url requires your proxy's https:// URL");
        (env.set("SELF_HOSTED_RUNNER_AGENT_PROXY_URL", u),
          r.envSetByFlag.add("SELF_HOSTED_RUNNER_AGENT_PROXY_URL"));
        break;
      }
      case "--proxy-authorization-command":
      case "--proxy-authorization-file":
        if (l === void 0 || l.startsWith("--"))
          throw Error("--proxy-authorization-command / --proxy-authorization-file requires a value");
        if (o === "--proxy-authorization-command") r.proxyAuthorizationCommand = l;
        else r.proxyAuthorizationFile = l;
        a++;
        break;
      default:
        if (o?.startsWith("--")) throw Error(`unknown flag ${o}`);
        if (o === "")
          throw Error("empty argument \u2014 a flag value may be unset (failed env/K8s substitution?)");
        if (o !== void 0)
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
function warnCapacityOnSessionBoundRunner(e, n) {
  if (n <= 1) return null;
  if (getSpawnSessionIdFromJwt(e) === null) return null;
  return (
    `[runner:warn] --capacity ${n} has no effect on a session-bound runner: this work order is bound to one session, so this runner will serve exactly one session and the extra ${n - 1} slot(s) will not be used. To run multiple concurrent sessions for the same account ` +
    "per runner, register a fixed-fleet runner with the environment secret \u2014 see " +
    'docs/self-hosted-runners-guide.md \xA7 "Get started".'
  );
}
//@ chunk-hm0ce8vc.js:234138-234416 placement
function requireBaseDirOnWindows(e, n = "linux") {
  if (n === "win32" && e === "default")
    throw Error(
      "--base-dir (or SELF_HOSTED_RUNNER_BASE_DIR) is required on Windows: the built-in default is a POSIX container path that does not apply there. Pass the directory that repositories should be checked out under.",
    );
}
//@ chunk-hm0ce8vc.js:234416-234694 placement
async function resetRunnerHome(e) {
  (await rm(e.globalCfgPath, { recursive: !0, force: !0 }),
    await rm(e.homeGitconfigPath, { recursive: !0, force: !0 }));
  for (let xdgGitDir of e.xdgGitDirs) await rm(xdgGitDir, { recursive: !0, force: !0 });
  (await rm(e.runnerDir, { recursive: !0, force: !0 }),
    await mkdir(dirname(e.globalCfgPath), { recursive: !0 }));
}
/**
 * 带超时读取环境密钥文件（CSI/secret 挂载）。
 */
//@ chunk-hm0ce8vc.js:234694-235481 placement
async function readEnvironmentSecretFile(e, n = (r) => console.error(r)) {
  if (e.poolSecretFile) {
    let a;
    try {
      a = await withBoundedTimeout(
        readFile(e.poolSecretFile, { encoding: "utf-8" }),
        Ah,
        `environment-secret read from ${e.poolSecretFile}`,
      );
    } catch (error) {
      let l = errorMessage(error);
      if (l.includes("timed out after"))
        (n(`[runner:fatal] ${l} \u2014 check CSI/secret mount health`), process.exit(1));
      throw Error(`Failed to read environment secret file ${e.poolSecretFile} (${l})`);
    }
    return a.trim();
  }
  let envSelfHostedRunnerEnvironmentSecret = process.env.SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET;
  if (envSelfHostedRunnerEnvironmentSecret) return envSelfHostedRunnerEnvironmentSecret.trim();
  let envSelfHostedRunnerPoolSecret = process.env.SELF_HOSTED_RUNNER_POOL_SECRET;
  if (envSelfHostedRunnerPoolSecret)
    return (
      n(
        "[runner:warn] SELF_HOSTED_RUNNER_POOL_SECRET is deprecated; use SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET",
      ),
      envSelfHostedRunnerPoolSecret.trim()
    );
  throw Error(
    "No environment secret provided. Use --environment-secret-file or set SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET.",
  );
}
//@ chunk-hm0ce8vc.js:235481-235601 placement
function runnerExecPath(e) {
  if (e) return { execPath: e, execArgs: [] };
  return { execPath: process.execPath, execArgs: isStandaloneExecutable() ? [] : [process.argv[1]] };
}
//@ chunk-hm0ce8vc.js:235601-236182 placement
function warnDiffFindsNestedRepository(e, n) {
  return e && n
    ? `[runner] --diff-finds-nested-repository is on and sessions start through ${n}. If that is a script, it must put nothing before "$@" when it starts Claude Code (options after "$@" are fine): with an option of its own first, this option is off for the session; the session still runs, and this log then has a "[changes pane] repository not shown" line. The Claude Code it starts must be this runner's release or later; an older one exits with "unknown option '--runner-declares=\u2026'". See "Pass every argument through" in the operator guide.`
    : void 0;
}

export {
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
};
