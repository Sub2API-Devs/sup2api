/**
 * services/daemon/spare.ts
 *
 * 2.1.316 新增：备用（spare）进程池
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v6a0t823.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { unlinkSync } from "fs";
import { unlink, mkdir, open, readdir } from "fs/promises";
import { randomBytes } from "crypto";
import { connect } from "net";
import { join } from "path";
import {
  errorMessage,
  sanitizeErrnoForTelemetry,
  sanitizeErrorName,
  getErrnoCode,
} from "../../utils/errors.js";
import { setBgExitCause } from "../../utils/bgExitSidecars.js";
import { readSpareClaim, applySpareClaim } from "../../daemon/bgSpare.js";
import { env } from "../../utils/env.js";
import { readSessionAuthFile } from "../../utils/sessionRecords.js";
import { logForDebugging } from "../../utils/debug.js";
import { getPlatform } from "../../utils/platform.js";
import {
  processWrapperError,
  isProcessWrapperUsable,
  processWrapperArgv,
  PROCESS_WRAPPER_TIMEOUT_MS,
} from "../../utils/processWrapper.js";
import { logFeatureBad, withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import {
  daemonSparePtySocket,
  daemonSpareClaimSocket,
  daemonSpareDir,
  ptyErrFile,
  ptyLateFile,
} from "./paths.js";
import { writeAgentMetadata_2 } from "../../utils/sessionStorage.js";
import { getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { getOomKillCounter, cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { sigtermThenKill } from "../../utils/processIdentity.js";
import { withHostOwnedEnv } from "../../utils/settings/hostEnvWrites.js";
import {
  normalizeEnvKeyCase,
  usesCustomEndpoint,
  BG_STRIPPED_ENV_VARS,
  DaemonSupervisor,
  shouldCarryAuth,
} from "./DaemonSupervisor.js";
import {
  BG_CARRIED_ENV_KEYS_2,
  stripCoworkHostEnvKeys,
  stripBgScrubbedEnvKeys,
  stripInternalEntrypoint,
} from "../../utils/background/envCarry.js";
import {
  isHostManagedEnvironment,
  getHostAuthEnvVar,
  PROVIDER_CREDENTIAL_ENV_VARS,
  stripHostManagedEnv,
  PROVIDER_ENDPOINT_PAIRS,
  VERTEX_REGION_PREFIX,
} from "../../utils/managedEnvConstants.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { applySilentPeersFlag } from "./ptyHostClient.js";
import { writeAuthSnapshot } from "./spawnBgSession.js";
import { logEvent } from "../analytics/index.js";
import { bgShort } from "./roster.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import { encodeControlFrame } from "../../utils/framedSocket.js";
import { sleep } from "../../utils/sleep.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-v6a0t823.js:65009-66081 placement
async function runBgSpare(argv) {
  let claimSock = argv[0];
  if (!claimSock) {
    process.stderr.write(`[bg-spare] missing claim sock path
`);
    process.exit(2);
  }
  let claimAuth = await readClaimAuth();
  let applyModule = import("../../main.js");
  import("../../interactiveHelpers.js").catch(() => {});
  import("../../launchCloudCreateChecklist.lazy.js").catch(() => {});
  let cleanupSock = () => {
    try {
      unlinkSync(claimSock);
    } catch {}
  };
  let onSignal = () => {
    cleanupSock();
    process.exit(0);
  };
  let onUncaught = (error) => {
    cleanupSock();
    process.stderr.write(`[bg-spare] uncaughtException: ${errorMessage(error)}
`);
    setBgExitCause("spare_uncaught");
    process.exit(1);
  };
  let ppid = process.ppid;
  let interval = setInterval(
    (parentPid, cleanup) => {
      if (process.ppid !== parentPid) {
        cleanup();
        process.exit(0);
      }
    },
    2000,
    ppid,
    cleanupSock,
  );
  interval.unref();
  for (let signalName of ["SIGTERM", "SIGHUP", "SIGINT"]) process.on(signalName, onSignal);
  process.on("uncaughtException", onUncaught);
  let uninstallHandlers = () => {
    clearInterval(interval);
    for (let signalName of ["SIGTERM", "SIGHUP", "SIGINT"]) process.off(signalName, onSignal);
    process.off("uncaughtException", onUncaught);
  };
  let claim;
  try {
    claim = await readSpareClaim(claimSock, undefined, claimAuth);
  } catch (error) {
    cleanupSock();
    process.stderr.write(`[bg-spare] claim recv failed: ${errorMessage(error)}
`);
    setBgExitCause("spare_claim_recv");
    process.exit(1);
  }
  uninstallHandlers();
  try {
    await applyModule;
    await applySpareClaim(claim, applyModule);
  } catch (error) {
    let errorTag = sanitizeErrnoForTelemetry(error) ?? sanitizeErrorName(error) ?? "Error";
    setBgExitCause("spare_postclaim:" + errorTag, claim.env.CLAUDE_JOB_DIR);
    process.stderr.write(`[bg-spare] post-claim init failed: ${errorMessage(error)}
`);
    throw error;
  }
}
//@ chunk-v6a0t823.js:66081-66429 placement
/**
 * 读取并清除环境中的认领令牌：有令牌文件时从中读 claimAuth 并删除文件。
 */
async function readClaimAuth() {
  let CLAUDE_BG_CLAIM_AUTH = env.CLAUDE_BG_CLAIM_AUTH;
  delete process.env.CLAUDE_BG_CLAIM_AUTH;
  let CLAUDE_BG_SOCKET_TOKENS_PATH = env.CLAUDE_BG_SOCKET_TOKENS_PATH;
  delete process.env.CLAUDE_BG_SOCKET_TOKENS_PATH;
  if (!CLAUDE_BG_SOCKET_TOKENS_PATH) return CLAUDE_BG_CLAIM_AUTH;
  let sessionAuthFile = await readSessionAuthFile(CLAUDE_BG_SOCKET_TOKENS_PATH);
  await unlink(CLAUDE_BG_SOCKET_TOKENS_PATH).catch(() => {});
  if (!sessionAuthFile?.claimAuth)
    logForDebugging("[bg-spare] tokens file unreadable; claim gate degraded", {
      level: "warn",
    });
  return sessionAuthFile?.claimAuth ?? CLAUDE_BG_CLAIM_AUTH;
}
//@ chunk-v6a0t823.js:66429-66441 placement
/**
 * 启动器启动后多少毫秒内退出视为 daemonize 违背契约（2000）。
 */
var LAUNCHER_EXIT_GRACE_MS = 2000;
//@ chunk-v6a0t823.js:66441-69463 placement
async function spawnSpare(context) {
  if (getPlatform() === "windows") return null;
  if (processWrapperError()) return null;
  if (!(await isProcessWrapperUsable())) {
    if (!context.launcherNotRunnableEpisode.logged) {
      context.launcherNotRunnableEpisode.logged = true;
      logFeatureBad("agent_launcher", "spare_launcher_not_runnable");
      logForDebugging(
        `bg spare: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 not minting a warm spare until it is restored`,
        {
          level: "warn",
        },
      );
    }
    return null;
  }
  context.launcherNotRunnableEpisode.logged = false;
  return withFeatureTelemetry("daemon_bg_spare_refill", async () => {
    let id = randomBytes(4).toString("hex");
    let ptySock = daemonSparePtySocket(id);
    let claimSock = daemonSpareClaimSocket(id);
    let ptyAuth = randomBytes(16).toString("hex");
    let claimAuth = randomBytes(16).toString("hex");
    await mkdir(daemonSpareDir(), {
      recursive: true,
      mode: 448,
    }).catch(() => {});
    let credentialFile = await writeAgentMetadata_2(`spare-${id}`, {
      ptyAuth,
      claimAuth,
    });
    await unlink(ptySock).catch(() => {});
    await unlink(claimSock).catch(() => {});
    let { cmd, prefixArgs } = getLaunchCommand({
      pinToCurrentBinary: true,
    });
    let stderrFile = await open(ptyErrFile(ptySock), "w").catch(() => null);
    let oomKillCounter = getOomKillCounter("agent");
    let oomCountBefore = oomKillCounter?.();
    let child;
    try {
      child = Bun.spawn(
        [
          cmd,
          ...prefixArgs,
          "--bg-pty-host",
          ptySock,
          "200",
          "50",
          "--",
          cmd,
          ...prefixArgs,
          "--bg-spare",
          claimSock,
        ],
        {
          cwd: daemonSpareDir(),
          env: buildSpareSessionEnv(
            credentialFile
              ? {
                  tokensPath: credentialFile,
                }
              : {
                  ptyAuth,
                  claimAuth,
                },
          ),
          stdio: ["ignore", "ignore", stderrFile?.fd ?? "ignore"],
          detached: true,
          windowsHide: true,
          ...cgroupSpawnOptions("agent"),
          argv0: "claude bg-pty-host",
        },
      );
      child.unref();
    } catch (error) {
      if (credentialFile)
        if (isStorageV5Enabled() && context.credentials !== undefined)
          context.credentials.discardSpentCredentialFile(credentialFile).catch(() => {});
        else unlink(credentialFile).catch(() => {});
      throw error;
    } finally {
      await stderrFile?.close().catch(() => {});
    }
    let spare = {
      hostPid: child.pid,
      ptySock,
      claimSock,
      ptyAuth,
      claimAuth,
      startedAt: Date.now(),
      cliVersion: {
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
      claimed: false,
      dispose() {
        disposed = true;
        try {
          child.kill("SIGTERM");
        } catch {}
      },
    };
    let disposed = false;
    child.exited.then(async (exitCode) => {
      let now = Date.now();
      let oomCountAfter = oomKillCounter?.();
      let oomKilled =
        exitCode !== 0 &&
        oomCountBefore !== undefined &&
        oomCountAfter !== undefined &&
        oomCountAfter > oomCountBefore;
      unlink(ptySock).catch(() => {});
      unlink(claimSock).catch(() => {});
      if (credentialFile)
        if (isStorageV5Enabled() && context.credentials !== undefined)
          context.credentials.discardSpentCredentialFile(credentialFile).catch(() => {});
        else unlink(credentialFile).catch(() => {});
      let trimmed = ((await readSmallFileOrNull(ptyErrFile(ptySock), 1048576)) ?? "").slice(0, 2000).trim();
      if (trimmed.length > 0)
        logForDebugging(
          `bg spare host pid=${child.pid} exit stderr:
${trimmed}`,
          {
            level: "warn",
          },
        );
      unlink(ptyErrFile(ptySock)).catch(() => {});
      unlink(ptyLateFile(ptySock)).catch(() => {});
      let lifetimeMs = now - spare.startedAt;
      let launcherExited =
        !disposed &&
        !spare.claimed &&
        !oomKilled &&
        processWrapperArgv().length > 0 &&
        (lifetimeMs < LAUNCHER_EXIT_GRACE_MS || (exitCode === 0 && lifetimeMs < PROCESS_WRAPPER_TIMEOUT_MS));
      if (oomKilled && !spare.claimed && !disposed)
        logForDebugging(
          `bg spare: host pid=${child.pid} died ${lifetimeMs}ms after spawn while the tool memory cgroup OOM-killed a member \u2014 not attributed to the launcher`,
          {
            level: "warn",
          },
        );
      if (launcherExited) {
        sigtermThenKill([-child.pid]);
        logFeatureBad("agent_launcher", "spare_fork_or_crash");
        logForDebugging(
          `bg spare: launcher \`${processWrapperArgv()[0]}\` exited ${lifetimeMs}ms after spawn \u2014 it either daemonized instead of calling \`exec\` (launcher contract #1) or crashed at startup. Warm spares are disabled until the background service restarts; sessions still start, without the warm-attach shortcut.`,
          {
            level: "warn",
          },
        );
      }
      context.onExit(launcherExited);
    });
    context.log(`bg spare spawned host pid=${child.pid}`);
    return spare;
  });
}
//@ chunk-v6a0t823.js:69463-70184 placement
/**
 * 为备用后台会话构造环境：去掉携带的认证与宿主托管变量、自定义端点令牌、Mac 上的 OAuth 令牌，设置会话类型、颜色、BROWSER 与 pty/认领认证。
 */
function buildSpareSessionEnv(opts) {
  let env = withHostOwnedEnv(() => ({
    ...process.env,
  }));
  normalizeEnvKeyCase(env);
  for (let key of BG_CARRIED_ENV_KEYS_2) delete env[key];
  stripCoworkHostEnvKeys(env);
  stripBgScrubbedEnvKeys(env);
  stripInternalEntrypoint(env);
  if (isHostManagedEnvironment(env)) {
    let hostAuthEnvVar = getHostAuthEnvVar(env);
    if (hostAuthEnvVar) {
      normalizeEnvKeyCase(env, [hostAuthEnvVar]);
      delete env[hostAuthEnvVar];
    }
    for (let name of PROVIDER_CREDENTIAL_ENV_VARS) delete env[name];
    if (isEnvTruthy(env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)) stripHostManagedEnv(env);
  } else if (PROVIDER_ENDPOINT_PAIRS.some((pair) => usesCustomEndpoint(env, pair)))
    delete env.ANTHROPIC_AUTH_TOKEN;
  for (let key of BG_STRIPPED_ENV_VARS) delete env[key];
  for (let key of Object.keys(env))
    if (VERTEX_REGION_PREFIX.some((prefix) => key.startsWith(prefix))) delete env[key];
  if (getPlatform() === "macos") delete env.CLAUDE_CODE_OAUTH_TOKEN;
  Object.assign(env, {
    CLAUDE_CODE_SESSION_KIND: "bg",
    CLAUDE_BG_BACKEND: "daemon",
    FORCE_COLOR: "3",
    COLORTERM: "truecolor",
    BROWSER: "true",
    ...("tokensPath" in opts
      ? {
          CLAUDE_BG_SOCKET_TOKENS_PATH: opts.tokensPath,
        }
      : {
          CLAUDE_BG_PTY_AUTH: opts.ptyAuth,
          CLAUDE_BG_CLAIM_AUTH: opts.claimAuth,
        }),
  });
  applySilentPeersFlag(env);
  return env;
}
//@ chunk-v6a0t823.js:70184-70711 placement
function claimSpare(dispatch, spare, spawnPty, getAuthSnapshot, storageV5, credentials) {
  spare.claimed = true;
  let supervisor = DaemonSupervisor.claim(dispatch, {
    pid: spare.hostPid,
    ptySockPath: spare.ptySock,
    spawnPty,
    getAuthSnapshot,
    ptyAuth: spare.ptyAuth,
    storageV5,
    credentials,
  });
  writeAuthSnapshot(dispatch.short, shouldCarryAuth(dispatch) ? getAuthSnapshot?.() : undefined)
    .then((path) =>
      sendClaimWithRetry(
        spare.claimSock,
        buildClaimRequest(dispatch, path, supervisor.socketAuth(), spare.claimAuth),
      ),
    )
    .catch((error) => {
      logEvent("tengu_bg_sendclaim_failed", {
        short: bgShort(dispatch.short),
        errno: sanitizeErrnoForTelemetry(error),
        ...errorTelemetryFields(error),
      });
      logForDebugging(`[bg-spare] send-claim failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      let sock = connect(spare.ptySock);
      sock.on("error", () => {});
      sock.once("connect", () => {
        sock.write(
          encodeControlFrame({
            t: "kill",
            sig: "SIGTERM",
          }),
        );
        sock.end();
      });
    });
  return supervisor;
}
//@ chunk-v6a0t823.js:70711-70837 placement
function buildClaimRequest(dispatch, pid, ptyAuth, auth) {
  let { env, argv } = DaemonSupervisor.buildClaimFrame(dispatch, pid, ptyAuth);
  return {
    cwd: dispatch.cwd,
    env,
    argv,
    sessionId: dispatch.sessionId,
    auth,
  };
}
//@ chunk-v6a0t823.js:70837-70885 placement
/**
 * 重试启动器的退避序列。
 */
var LAUNCHER_RETRY_DELAYS_MS = [50, 100, 150, 200, 250, 300, 400, 500, 500, 500];
//@ chunk-v6a0t823.js:70885-71133 placement
async function sendClaimWithRetry(socketPath, request) {
  let now = Date.now();
  let deadline = 5000;
  for (let j = 0; ; j++) {
    if (Date.now() - now > 5000) throw Error("send-claim timeout");
    try {
      await sendClaimFrame(socketPath, request);
      return;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (!(errnoCode === "ENOENT" || errnoCode === "ECONNREFUSED") || j >= LAUNCHER_RETRY_DELAYS_MS.length)
        throw error;
      await sleep(LAUNCHER_RETRY_DELAYS_MS[j] ?? 500);
    }
  }
}
//@ chunk-v6a0t823.js:71133-71257 placement
function sendClaimFrame(socketPath, request) {
  return new Promise((resolve, reject) => {
    let socket = connect(socketPath);
    socket.once("error", reject);
    socket.once("connect", () => {
      socket.end(
        jsonStringify(request) +
          `
`,
        () => resolve(),
      );
    });
  });
}
//@ chunk-v6a0t823.js:71257-72027 placement
async function reapOrphanSpares(spares, log) {
  if (getPlatform() === "windows") return;
  let knownSockets = new Set();
  for (let spare of spares.values()) {
    let ptySock = spare.rosterEntry().ptySock;
    if (ptySock) knownSockets.add(ptySock);
  }
  let entries = await readdir(daemonSpareDir()).catch(() => []);
  let reaped = 0;
  for (let entry of entries) {
    if (!entry.endsWith(".pty.sock")) continue;
    let sockPath = join(daemonSpareDir(), entry);
    if (knownSockets.has(sockPath)) continue;
    reaped++;
    let sock = connect(sockPath);
    sock.on("error", () => {
      unlink(sockPath).catch(() => {});
    });
    sock.once("connect", () => {
      sock.resume();
      sock.write(
        encodeControlFrame({
          t: "kill",
          sig: "SIGTERM",
        }),
      );
      sock.end();
      setTimeout((sock) => sock.destroy(), 2000, sock).unref();
    });
  }
  for (let entry of entries) {
    let found = [".err", ".late", ".err.read"].find((suffix) => entry.endsWith(`.pty.sock${suffix}`));
    if (found) {
      let sliced = entry.slice(0, -found.length);
      if (!entries.includes(sliced)) unlink(join(daemonSpareDir(), entry)).catch(() => {});
    }
    if (entry.endsWith(".claim.sock")) {
      let ptyPath = join(daemonSpareDir(), `${entry.slice(0, -11)}.pty.sock`);
      if (!knownSockets.has(ptyPath)) unlink(join(daemonSpareDir(), entry)).catch(() => {});
    }
  }
  if (reaped) log(`bg orphan-spare reap: ${reaped}`);
}
export { spawnSpare, claimSpare, reapOrphanSpares, runBgSpare };
