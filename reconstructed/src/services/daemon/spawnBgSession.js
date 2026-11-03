/**
 * services/daemon/spawnBgSession.ts
 *
 * 2.1.316 新增：启动后台会话
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-89ebz077.js (5)
 * attribution: placement 5
 */
import { isAbsolute } from "path";
import { mkdir, writeFile } from "fs/promises";
import { getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import { getPlatform } from "../../utils/platform.js";
import { ptyErrFile, daemonAuthFile, daemonAuthDir } from "../../utils/sandbox/userNamespace.js";
import { getErrnoCode, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { connectPtyHost, applySilentPeersFlag } from "./ptyHostClient.js";
import { stripLongPathPrefixes } from "../../utils/windowsUncPaths.js";
import { stripForwardedFlags } from "../../cli/forwardedFlags.js";
import { stripEnvironmentFlags } from "../../cli/cloudSessionArgs.js";
import {
  normalizeEnvKeyCase,
  BG_STRIPPED_ENV_VARS,
  isProviderManagedByHost,
  usesCustomEndpoint,
} from "./DaemonSupervisor.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { sanitizeSessionTitle } from "../../utils/stringUtils.js";
import { isSameConfigDir, isEnvTruthy } from "../../utils/envUtils.js";
import {
  BG_CARRIED_ENV_KEYS_2,
  stripCoworkHostEnvKeys,
  stripBgScrubbedEnvKeys,
  carrySandboxEnv,
  stripInternalEntrypoint,
} from "../../utils/background/envCarry.js";
import {
  VERTEX_REGION_PREFIX,
  isHostManagedEnvironment,
  PROVIDER_CREDENTIAL_ENV_VARS,
  stripHostManagedEnv,
  getHostAuthEnvVar,
  PROVIDER_ENDPOINT_COMPANION_VARS,
  PROVIDER_ENDPOINT_PAIRS,
  SKIP_AUTH_ENV_VARS,
} from "../../utils/managedEnvConstants.js";
import { PROCESS_WRAPPER_ENV_2 } from "../../utils/processWrapper.js";

//@ chunk-89ebz077.js:11865-12726 placement
/**
 * 返回启动 bg-pty-host 进程的函数：用当前二进制带 --bg-pty-host 参数分离启动，stderr 写到 socket 旁的日志；打不开日志文件时丢弃 stderr 并去掉 cgroup 重试；最后连接 pty 宿主。
 */
function createPtyHostSpawner() {
  return (e, r, s) => {
    let { cmd, prefixArgs } = getLaunchCommand({
      pinToCurrentBinary: true,
    });
    let argv = [
      cmd,
      ...prefixArgs,
      "--bg-pty-host",
      s.ptySock,
      String(s.cols),
      String(s.rows),
      "--",
      e,
      ...r,
    ];
    let spawnOptions = {
      cwd: s.cwd,
      env: s.env,
      detached: true,
      windowsHide: true,
      ...cgroupSpawnOptions("agent"),
      ...(getPlatform() !== "windows" && {
        argv0: "claude bg-pty-host",
      }),
    };
    let proc;
    try {
      proc = Bun.spawn(argv, {
        ...spawnOptions,
        stdio: ["ignore", "ignore", Bun.file(ptyErrFile(s.ptySock))],
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOSPC" && errnoCode !== "EACCES" && errnoCode !== "EROFS")
        throw error;
      logForDebugging(
        `bg: ptyHost stderr breadcrumb open failed (${errnoCode}) at ${ptyErrFile(s.ptySock)} \u2014 spawning with stderr discarded (crash diagnostics degraded): ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      let { cgroup, ...E } = spawnOptions;
      if (cgroup !== undefined)
        logForDebugging(`bg: retrying ptyHost spawn without tool cgroup placement (${cgroup})`, {
          level: "warn",
        });
      proc = Bun.spawn(argv, {
        ...E,
        stdio: ["ignore", "ignore", "ignore"],
      });
    }
    proc.unref();
    return connectPtyHost(s.ptySock, proc.pid, {
      short: s.short,
      hostProc: proc,
      auth: s.ptyAuth,
    });
  };
}
//@ chunk-89ebz077.js:12726-13141 placement
/**
 * 计算后台会话启动参数：exec 直接用原参数；重启时按是否有会话记录用 --resume 或 --session-id；resume 模式（可 fork）带 --resume；去掉转发与环境标志。
 */
function buildSessionLaunchArgs(e, r, s, sessionId, o, respawnFlags) {
  if (e.launch.mode === "exec") return e.launch.args.map(stripLongPathPrefixes);
  if (r > 1 && s)
    return stripForwardedFlags(["--resume", o ?? sessionId, ...stripEnvironmentFlags(respawnFlags)]);
  if (r > 1 && sessionId !== e.sessionId)
    return stripForwardedFlags(["--session-id", sessionId, ...stripEnvironmentFlags(respawnFlags)]);
  if (e.launch.mode === "resume")
    return stripForwardedFlags([
      ...(e.launch.fork ? ["--session-id", e.sessionId, "--fork-session"] : []),
      "--resume",
      e.launch.transcriptPath ?? e.launch.sessionId,
      ...stripEnvironmentFlags(e.launch.flagArgs),
    ]);
  return stripForwardedFlags(stripEnvironmentFlags(e.launch.args));
}
//@ chunk-89ebz077.js:13141-15895 placement
function buildBgSessionEnv(e, r, s, n, o) {
  let p = {
    ...process.env,
  };
  normalizeEnvKeyCase(p);
  if (e.env) normalizeEnvKeyCase(e.env);
  let h = {
    ...p,
    ...(s && {
      CLAUDE_BG_AUTH_SNAPSHOT_PATH: s,
    }),
    ...(isStorageV5Enabled() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_hover_rest", false) && {
        CLAUDE_CODE_HOVER_REST: "1",
      }),
    ...(getPlatform() === "windows" && {
      CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT: "1",
    }),
    ...e.env,
    CLAUDE_CODE_SESSION_KIND: "bg",
    CLAUDE_BG_BACKEND: "daemon",
    CLAUDE_BG_SOURCE: e.source,
    CLAUDE_JOB_DIR: r,
    CLAUDE_CODE_SESSION_NAME: sanitizeSessionTitle(e.seed?.name || e.seed?.intent || e.short),
    CLAUDE_BG_RENDEZVOUS_SOCK: n,
    FORCE_COLOR: "3",
    COLORTERM: "truecolor",
    BROWSER: "true",
  };
  let u = Object.hasOwn(p, "PATH") ? "PATH" : Object.keys(p).find((key) => key.toUpperCase() === "PATH");
  let g = e.env?.PATH || (u ? p[u] : undefined);
  for (let key of Object.keys(h)) if (key.toUpperCase() === "PATH") delete h[key];
  if (g) h[u ?? "PATH"] = g;
  if (process.env.CLAUDE_CONFIG_DIR) h.CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;
  else if (
    h.CLAUDE_CONFIG_DIR !== undefined &&
    (!isAbsolute(h.CLAUDE_CONFIG_DIR) ||
      h.CLAUDE_CONFIG_DIR.split(/[\\/]/).includes("..") ||
      !isSameConfigDir(h.CLAUDE_CONFIG_DIR))
  ) {
    logForDebugging(
      `bg spawn ${e.short}: dropped dispatch CLAUDE_CONFIG_DIR \u2014 not an absolute, dot-dot-free spelling of this daemon's config home`,
      {
        level: "warn",
      },
    );
    delete h.CLAUDE_CONFIG_DIR;
  }
  for (let f of BG_CARRIED_ENV_KEYS_2) if (!e.env?.[f]) delete h[f];
  stripCoworkHostEnvKeys(h);
  stripBgScrubbedEnvKeys(h);
  carrySandboxEnv(h, p);
  if (!e.env?.CLAUDE_CODE_ENTRYPOINT) stripInternalEntrypoint(h);
  if (e.isolation === "worktree") h.CLAUDE_BG_ISOLATION = "worktree";
  for (let f of BG_STRIPPED_ENV_VARS) if (!e.env?.[f]) delete h[f];
  for (let key of Object.keys(h))
    if (VERTEX_REGION_PREFIX.some((w) => key.startsWith(w)) && !e.env?.[key]) delete h[key];
  if (isHostManagedEnvironment(p) || isProviderManagedByHost(e)) {
    for (let E of PROVIDER_CREDENTIAL_ENV_VARS) delete h[E];
    if (isProviderManagedByHost(e) || isEnvTruthy(p.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST))
      stripHostManagedEnv(h, e.env);
    let hostAuthEnvVar = getHostAuthEnvVar(p);
    if (hostAuthEnvVar) {
      normalizeEnvKeyCase(h, [hostAuthEnvVar]);
      delete h[hostAuthEnvVar];
    }
    let w =
      e.env?.CLAUDE_CODE_HOST_CREDS_FILE ??
      (isProviderManagedByHost(e) ? p.CLAUDE_CODE_HOST_CREDS_FILE : undefined);
    if (w) h.CLAUDE_CODE_HOST_CREDS_FILE = w;
    for (let E of PROVIDER_ENDPOINT_COMPANION_VARS) delete h[E];
  } else {
    let f = new Set();
    let w = new Set();
    let E = new Set();
    let S = false;
    let R = false;
    for (let A of PROVIDER_ENDPOINT_PAIRS) {
      let O = A.selection === undefined || isEnvTruthy(h[A.selection]);
      if (
        h[A.endpoint] === p[A.endpoint] &&
        (!h[A.endpoint] || O) &&
        A.companions.every(
          (companion) =>
            !SKIP_AUTH_ENV_VARS.includes(companion) ||
            isEnvTruthy(h[companion]) === isEnvTruthy(p[companion]),
        )
      ) {
        if (h[A.endpoint]) {
          for (let companion of A.companions) f.add(companion);
          S ||= usesCustomEndpoint(p, A);
        }
        continue;
      }
      for (let L of [A.endpoint, ...A.companions]) {
        w.add(L);
        if (h[A.endpoint] && h[L] !== p[L]) E.add(L);
      }
      if (A.endpoint === "ANTHROPIC_BASE_URL" && p.ANTHROPIC_BASE_URL) delete h.ANTHROPIC_AUTH_TOKEN;
      else R ||= usesCustomEndpoint(p, A);
    }
    for (let A of w) if (!f.has(A) || E.has(A)) delete h[A];
    if (R && !S) delete h.ANTHROPIC_AUTH_TOKEN;
  }
  if (o) {
    h.CLAUDE_BG_RV_AUTH = o.rvAuth;
    h.CLAUDE_BG_PTY_AUTH = o.ptyAuth;
  }
  if (s) delete h.CLAUDE_CODE_OAUTH_TOKEN;
  if (e.launch.mode === "exec") {
    let any = PROVIDER_ENDPOINT_PAIRS.some((w) => usesCustomEndpoint(h, w));
    for (let key of Object.keys(h))
      if (
        (key.startsWith("CLAUDE_") &&
          key !== "CLAUDE_JOB_DIR" &&
          key !== "CLAUDE_CONFIG_DIR" &&
          key !== "CLAUDE_BG_PTY_AUTH") ||
        key.startsWith("OTEL_")
      )
        delete h[key];
    delete h.BROWSER;
    if (any) delete h.ANTHROPIC_AUTH_TOKEN;
    for (let w of PROVIDER_ENDPOINT_COMPANION_VARS) delete h[w];
    h.CLAUDE_PTY_HOST_EXEC = "1";
  }
  applySilentPeersFlag(h);
  return h;
}
//@ chunk-89ebz077.js:15895-15998 placement
function syncProcessWrapperEnv(bgSessionEnv, r) {
  let s = process.env[PROCESS_WRAPPER_ENV_2];
  if (r.launch.mode === "exec" || s === undefined) delete bgSessionEnv[PROCESS_WRAPPER_ENV_2];
  else bgSessionEnv[PROCESS_WRAPPER_ENV_2] = s;
}
//@ chunk-89ebz077.js:15998-16227 placement
async function writeAuthSnapshot(short, r) {
  if (!r || getPlatform() !== "macos") return;
  let s = daemonAuthFile(short);
  try {
    await mkdir(daemonAuthDir(), {
      recursive: true,
      mode: 448,
    });
    await writeFile(s, JSON.stringify(r), {
      mode: 384,
    });
    return s;
  } catch (error) {
    logForDebugging(`writeAuthSnapshot failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
}
export {
  createPtyHostSpawner,
  buildBgSessionEnv,
  syncProcessWrapperEnv,
  buildSessionLaunchArgs,
  writeAuthSnapshot,
};
