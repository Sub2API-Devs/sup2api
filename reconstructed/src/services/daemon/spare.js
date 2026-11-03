/**
 * services/daemon/spare.ts
 *
 * 2.1.316 新增：备用（spare）进程池
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-89ebz077.js (11)
 * attribution: placement 11
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
  PROCESS_WRAPPER_ENV,
} from "../../utils/processWrapper.js";
import { logFeatureBad, withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import {
  daemonSparePtySocket,
  daemonSpareClaimSocket,
  daemonSpareDir,
  ptyErrFile,
  ptyLateFile,
} from "../../utils/sandbox/userNamespace.js";
import { writeAgentMetadata_2 } from "../../utils/sessionStorage.js";
import { getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { getOomKillCounter, cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { sigtermThenKill } from "../../utils/processIdentity.js";
import { withHostOwnedEnv } from "../../utils/settings/managedSettingsFiles.js";
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

//@ chunk-89ebz077.js:64813-65885 placement
async function runBgSpare(e) {
  let r = e[0];
  if (!r) {
    process.stderr.write(`[bg-spare] missing claim sock path
`);
    process.exit(2);
  }
  let claimAuth = await readClaimAuth();
  let n = import("./chunk-shkzs7rp.js");
  import("./chunk-pz8vz2wa.js").catch(() => {});
  import("./chunk-kgh2tnx9.js").catch(() => {});
  let o = () => {
    try {
      unlinkSync(r);
    } catch {}
  };
  let p = () => {
    o();
    process.exit(0);
  };
  let h = (E) => {
    o();
    process.stderr.write(`[bg-spare] uncaughtException: ${errorMessage(E)}
`);
    setBgExitCause("spare_uncaught");
    process.exit(1);
  };
  let ppid = process.ppid;
  let interval = setInterval(
    (E, S) => {
      if (process.ppid !== E) {
        S();
        process.exit(0);
      }
    },
    2000,
    ppid,
    o,
  );
  interval.unref();
  for (let E of ["SIGTERM", "SIGHUP", "SIGINT"]) process.on(E, p);
  process.on("uncaughtException", h);
  let f = () => {
    clearInterval(interval);
    for (let E of ["SIGTERM", "SIGHUP", "SIGINT"]) process.off(E, p);
    process.off("uncaughtException", h);
  };
  let w;
  try {
    w = await readSpareClaim(r, undefined, claimAuth);
  } catch (error) {
    o();
    process.stderr.write(`[bg-spare] claim recv failed: ${errorMessage(error)}
`);
    setBgExitCause("spare_claim_recv");
    process.exit(1);
  }
  f();
  try {
    await n;
    await applySpareClaim(w, n);
  } catch (error) {
    let S = sanitizeErrnoForTelemetry(error) ?? sanitizeErrorName(error) ?? "Error";
    setBgExitCause("spare_postclaim:" + S, w.env.CLAUDE_JOB_DIR);
    process.stderr.write(`[bg-spare] post-claim init failed: ${errorMessage(error)}
`);
    throw error;
  }
}
//@ chunk-89ebz077.js:65885-66233 placement
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
//@ chunk-89ebz077.js:66233-66245 placement
/**
 * 启动器启动后多少毫秒内退出视为 daemonize 违背契约（2000）。
 */
var LAUNCHER_EXIT_GRACE_MS = 2000;
//@ chunk-89ebz077.js:66245-69267 placement
async function spawnSpare(e) {
  if (getPlatform() === "windows") return null;
  if (processWrapperError()) return null;
  if (!(await isProcessWrapperUsable())) {
    if (!e.launcherNotRunnableEpisode.logged) {
      e.launcherNotRunnableEpisode.logged = true;
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
  e.launcherNotRunnableEpisode.logged = false;
  return withFeatureTelemetry("daemon_bg_spare_refill", async () => {
    let str = randomBytes(4).toString("hex");
    let s = daemonSparePtySocket(str);
    let n = daemonSpareClaimSocket(str);
    let ptyAuth = randomBytes(16).toString("hex");
    let claimAuth = randomBytes(16).toString("hex");
    await mkdir(daemonSpareDir(), {
      recursive: true,
      mode: 448,
    }).catch(() => {});
    let h = await writeAgentMetadata_2(`spare-${str}`, {
      ptyAuth,
      claimAuth,
    });
    await unlink(s).catch(() => {});
    await unlink(n).catch(() => {});
    let { cmd, prefixArgs } = getLaunchCommand({
      pinToCurrentBinary: true,
    });
    let f = await open(ptyErrFile(s), "w").catch(() => null);
    let oomKillCounter = getOomKillCounter("agent");
    let E = oomKillCounter?.();
    let S;
    try {
      S = Bun.spawn(
        [cmd, ...prefixArgs, "--bg-pty-host", s, "200", "50", "--", cmd, ...prefixArgs, "--bg-spare", n],
        {
          cwd: daemonSpareDir(),
          env: buildSpareSessionEnv(
            h
              ? {
                  tokensPath: h,
                }
              : {
                  ptyAuth,
                  claimAuth,
                },
          ),
          stdio: ["ignore", "ignore", f?.fd ?? "ignore"],
          detached: true,
          windowsHide: true,
          ...cgroupSpawnOptions("agent"),
          argv0: "claude bg-pty-host",
        },
      );
      S.unref();
    } catch (error) {
      if (h)
        if (isStorageV5Enabled() && e.credentials !== undefined)
          e.credentials.discardSpentCredentialFile(h).catch(() => {});
        else unlink(h).catch(() => {});
      throw error;
    } finally {
      await f?.close().catch(() => {});
    }
    let R = {
      hostPid: S.pid,
      ptySock: s,
      claimSock: n,
      ptyAuth,
      claimAuth,
      startedAt: Date.now(),
      cliVersion: {
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
      claimed: false,
      dispose() {
        A = true;
        try {
          S.kill("SIGTERM");
        } catch {}
      },
    };
    let A = false;
    S.exited.then(async (O) => {
      let now = Date.now();
      let L = oomKillCounter?.();
      let C = O !== 0 && E !== undefined && L !== undefined && L > E;
      unlink(s).catch(() => {});
      unlink(n).catch(() => {});
      if (h)
        if (isStorageV5Enabled() && e.credentials !== undefined)
          e.credentials.discardSpentCredentialFile(h).catch(() => {});
        else unlink(h).catch(() => {});
      let trimmed = ((await readSmallFileOrNull(ptyErrFile(s), 1048576)) ?? "").slice(0, 2000).trim();
      if (trimmed.length > 0)
        logForDebugging(
          `bg spare host pid=${S.pid} exit stderr:
${trimmed}`,
          {
            level: "warn",
          },
        );
      unlink(ptyErrFile(s)).catch(() => {});
      unlink(ptyLateFile(s)).catch(() => {});
      let W = now - R.startedAt;
      let P =
        !A &&
        !R.claimed &&
        !C &&
        processWrapperArgv().length > 0 &&
        (W < LAUNCHER_EXIT_GRACE_MS || (O === 0 && W < PROCESS_WRAPPER_ENV));
      if (C && !R.claimed && !A)
        logForDebugging(
          `bg spare: host pid=${S.pid} died ${W}ms after spawn while the tool memory cgroup OOM-killed a member \u2014 not attributed to the launcher`,
          {
            level: "warn",
          },
        );
      if (P) {
        sigtermThenKill([-S.pid]);
        logFeatureBad("agent_launcher", "spare_fork_or_crash");
        logForDebugging(
          `bg spare: launcher \`${processWrapperArgv()[0]}\` exited ${W}ms after spawn \u2014 it either daemonized instead of calling \`exec\` (launcher contract #1) or crashed at startup. Warm spares are disabled until the background service restarts; sessions still start, without the warm-attach shortcut.`,
          {
            level: "warn",
          },
        );
      }
      e.onExit(P);
    });
    e.log(`bg spare spawned host pid=${S.pid}`);
    return R;
  });
}
//@ chunk-89ebz077.js:69267-69987 placement
/**
 * 为备用后台会话构造环境：去掉携带的认证与宿主托管变量、自定义端点令牌、Mac 上的 OAuth 令牌，设置会话类型、颜色、BROWSER 与 pty/认领认证。
 */
function buildSpareSessionEnv(e) {
  let env = withHostOwnedEnv(() => ({
    ...process.env,
  }));
  normalizeEnvKeyCase(env);
  for (let s of BG_CARRIED_ENV_KEYS_2) delete env[s];
  stripCoworkHostEnvKeys(env);
  stripBgScrubbedEnvKeys(env);
  stripInternalEntrypoint(env);
  if (isHostManagedEnvironment(env)) {
    let hostAuthEnvVar = getHostAuthEnvVar(env);
    if (hostAuthEnvVar) {
      normalizeEnvKeyCase(env, [hostAuthEnvVar]);
      delete env[hostAuthEnvVar];
    }
    for (let n of PROVIDER_CREDENTIAL_ENV_VARS) delete env[n];
    if (isEnvTruthy(env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST)) stripHostManagedEnv(env);
  } else if (PROVIDER_ENDPOINT_PAIRS.some((s) => usesCustomEndpoint(env, s))) delete env.ANTHROPIC_AUTH_TOKEN;
  for (let s of BG_STRIPPED_ENV_VARS) delete env[s];
  for (let key of Object.keys(env)) if (VERTEX_REGION_PREFIX.some((n) => key.startsWith(n))) delete env[key];
  if (getPlatform() === "macos") delete env.CLAUDE_CODE_OAUTH_TOKEN;
  Object.assign(env, {
    CLAUDE_CODE_SESSION_KIND: "bg",
    CLAUDE_BG_BACKEND: "daemon",
    FORCE_COLOR: "3",
    COLORTERM: "truecolor",
    BROWSER: "true",
    ...("tokensPath" in e
      ? {
          CLAUDE_BG_SOCKET_TOKENS_PATH: e.tokensPath,
        }
      : {
          CLAUDE_BG_PTY_AUTH: e.ptyAuth,
          CLAUDE_BG_CLAIM_AUTH: e.claimAuth,
        }),
  });
  applySilentPeersFlag(env);
  return env;
}
//@ chunk-89ebz077.js:69987-70514 placement
function claimSpare(e, r, spawnPty, getAuthSnapshot, storageV5, credentials) {
  r.claimed = true;
  let h = DaemonSupervisor.claim(e, {
    pid: r.hostPid,
    ptySockPath: r.ptySock,
    spawnPty,
    getAuthSnapshot,
    ptyAuth: r.ptyAuth,
    storageV5,
    credentials,
  });
  writeAuthSnapshot(e.short, shouldCarryAuth(e) ? getAuthSnapshot?.() : undefined)
    .then((u) => sendClaimWithRetry(r.claimSock, buildClaimRequest(e, u, h.socketAuth(), r.claimAuth)))
    .catch((error) => {
      logEvent("tengu_bg_sendclaim_failed", {
        short: bgShort(e.short),
        errno: sanitizeErrnoForTelemetry(error),
        ...errorTelemetryFields(error),
      });
      logForDebugging(`[bg-spare] send-claim failed: ${errorMessage(error)}`, {
        level: "warn",
      });
      let g = connect(r.ptySock);
      g.on("error", () => {});
      g.once("connect", () => {
        g.write(
          encodeControlFrame({
            t: "kill",
            sig: "SIGTERM",
          }),
        );
        g.end();
      });
    });
  return h;
}
//@ chunk-89ebz077.js:70514-70640 placement
function buildClaimRequest(e, r, s, auth) {
  let { env, argv } = DaemonSupervisor.buildClaimFrame(e, r, s);
  return {
    cwd: e.cwd,
    env,
    argv,
    sessionId: e.sessionId,
    auth,
  };
}
//@ chunk-89ebz077.js:70640-70688 placement
/**
 * 重试启动器的退避序列。
 */
var LAUNCHER_RETRY_DELAYS_MS = [50, 100, 150, 200, 250, 300, 400, 500, 500, 500];
//@ chunk-89ebz077.js:70688-70936 placement
async function sendClaimWithRetry(claimSock, claimRequest) {
  let now = Date.now();
  let n = 5000;
  for (let j = 0; ; j++) {
    if (Date.now() - now > 5000) throw Error("send-claim timeout");
    try {
      await sendClaimFrame(claimSock, claimRequest);
      return;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (!(errnoCode === "ENOENT" || errnoCode === "ECONNREFUSED") || j >= LAUNCHER_RETRY_DELAYS_MS.length)
        throw error;
      await sleep(LAUNCHER_RETRY_DELAYS_MS[j] ?? 500);
    }
  }
}
//@ chunk-89ebz077.js:70936-71060 placement
function sendClaimFrame(e, r) {
  return new Promise((resolve, reject) => {
    let o = connect(e);
    o.once("error", reject);
    o.once("connect", () => {
      o.end(
        jsonStringify(r) +
          `
`,
        () => resolve(),
      );
    });
  });
}
//@ chunk-89ebz077.js:71060-71830 placement
async function reapOrphanSpares(e, r) {
  if (getPlatform() === "windows") return;
  let s = new Set();
  for (let p of e.values()) {
    let ptySock = p.rosterEntry().ptySock;
    if (ptySock) s.add(ptySock);
  }
  let n = await readdir(daemonSpareDir()).catch(() => []);
  let o = 0;
  for (let p of n) {
    if (!p.endsWith(".pty.sock")) continue;
    let h = join(daemonSpareDir(), p);
    if (s.has(h)) continue;
    o++;
    let u = connect(h);
    u.on("error", () => {
      unlink(h).catch(() => {});
    });
    u.once("connect", () => {
      u.resume();
      u.write(
        encodeControlFrame({
          t: "kill",
          sig: "SIGTERM",
        }),
      );
      u.end();
      setTimeout((g) => g.destroy(), 2000, u).unref();
    });
  }
  for (let p of n) {
    let found = [".err", ".late", ".err.read"].find((u) => p.endsWith(`.pty.sock${u}`));
    if (found) {
      let sliced = p.slice(0, -found.length);
      if (!n.includes(sliced)) unlink(join(daemonSpareDir(), p)).catch(() => {});
    }
    if (p.endsWith(".claim.sock")) {
      let u = join(daemonSpareDir(), `${p.slice(0, -11)}.pty.sock`);
      if (!s.has(u)) unlink(join(daemonSpareDir(), p)).catch(() => {});
    }
  }
  if (o) r(`bg orphan-spare reap: ${o}`);
}
export { spawnSpare, claimSpare, reapOrphanSpares };
