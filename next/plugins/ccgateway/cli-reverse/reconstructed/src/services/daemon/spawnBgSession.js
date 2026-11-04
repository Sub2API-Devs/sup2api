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
import { ptyErrFile, daemonAuthFile, daemonAuthDir } from "./paths.js";
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
import { PROCESS_WRAPPER_ENV } from "../../utils/processWrapper.js";

//@ chunk-89ebz077.js:11865-12726 placement
/**
 * 返回启动 bg-pty-host 进程的函数：用当前二进制带 --bg-pty-host 参数分离启动，stderr 写到 socket 旁的日志；打不开日志文件时丢弃 stderr 并去掉 cgroup 重试；最后连接 pty 宿主。
 */
function createPtyHostSpawner() {
  return (command, args, options) => {
    let { cmd, prefixArgs } = getLaunchCommand({
      pinToCurrentBinary: true,
    });
    let argv = [
      cmd,
      ...prefixArgs,
      "--bg-pty-host",
      options.ptySock,
      String(options.cols),
      String(options.rows),
      "--",
      command,
      ...args,
    ];
    let spawnOptions = {
      cwd: options.cwd,
      env: options.env,
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
        stdio: ["ignore", "ignore", Bun.file(ptyErrFile(options.ptySock))],
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOSPC" && errnoCode !== "EACCES" && errnoCode !== "EROFS")
        throw error;
      logForDebugging(
        `bg: ptyHost stderr breadcrumb open failed (${errnoCode}) at ${ptyErrFile(options.ptySock)} \u2014 spawning with stderr discarded (crash diagnostics degraded): ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      let { cgroup, ...spawnOptions_2 } = spawnOptions;
      if (cgroup !== undefined)
        logForDebugging(`bg: retrying ptyHost spawn without tool cgroup placement (${cgroup})`, {
          level: "warn",
        });
      proc = Bun.spawn(argv, {
        ...spawnOptions_2,
        stdio: ["ignore", "ignore", "ignore"],
      });
    }
    proc.unref();
    return connectPtyHost(options.ptySock, proc.pid, {
      short: options.short,
      hostProc: proc,
      auth: options.ptyAuth,
    });
  };
}
//@ chunk-89ebz077.js:12726-13141 placement
/**
 * 计算后台会话启动参数：exec 直接用原参数；重启时按是否有会话记录用 --resume 或 --session-id；resume 模式（可 fork）带 --resume；去掉转发与环境标志。
 */
function buildSessionLaunchArgs(dispatch, attempt, hasMessages, sessionId, resumeSessionId, respawnFlags) {
  if (dispatch.launch.mode === "exec") return dispatch.launch.args.map(stripLongPathPrefixes);
  if (attempt > 1 && hasMessages)
    return stripForwardedFlags([
      "--resume",
      resumeSessionId ?? sessionId,
      ...stripEnvironmentFlags(respawnFlags),
    ]);
  if (attempt > 1 && sessionId !== dispatch.sessionId)
    return stripForwardedFlags(["--session-id", sessionId, ...stripEnvironmentFlags(respawnFlags)]);
  if (dispatch.launch.mode === "resume")
    return stripForwardedFlags([
      ...(dispatch.launch.fork ? ["--session-id", dispatch.sessionId, "--fork-session"] : []),
      "--resume",
      dispatch.launch.transcriptPath ?? dispatch.launch.sessionId,
      ...stripEnvironmentFlags(dispatch.launch.flagArgs),
    ]);
  return stripForwardedFlags(stripEnvironmentFlags(dispatch.launch.args));
}
//@ chunk-89ebz077.js:13141-15895 placement
function buildBgSessionEnv(dispatch, jobDir, authSnapshotPath, rvSock, auth) {
  let baseEnv = {
    ...process.env,
  };
  normalizeEnvKeyCase(baseEnv);
  if (dispatch.env) normalizeEnvKeyCase(dispatch.env);
  let env = {
    ...baseEnv,
    ...(authSnapshotPath && {
      CLAUDE_BG_AUTH_SNAPSHOT_PATH: authSnapshotPath,
    }),
    ...(isStorageV5Enabled() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_hover_rest", false) && {
        CLAUDE_CODE_HOVER_REST: "1",
      }),
    ...(getPlatform() === "windows" && {
      CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT: "1",
    }),
    ...dispatch.env,
    CLAUDE_CODE_SESSION_KIND: "bg",
    CLAUDE_BG_BACKEND: "daemon",
    CLAUDE_BG_SOURCE: dispatch.source,
    CLAUDE_JOB_DIR: jobDir,
    CLAUDE_CODE_SESSION_NAME: sanitizeSessionTitle(
      dispatch.seed?.name || dispatch.seed?.intent || dispatch.short,
    ),
    CLAUDE_BG_RENDEZVOUS_SOCK: rvSock,
    FORCE_COLOR: "3",
    COLORTERM: "truecolor",
    BROWSER: "true",
  };
  let pathKey = Object.hasOwn(baseEnv, "PATH")
    ? "PATH"
    : Object.keys(baseEnv).find((key) => key.toUpperCase() === "PATH");
  let pathValue = dispatch.env?.PATH || (pathKey ? baseEnv[pathKey] : undefined);
  for (let key of Object.keys(env)) if (key.toUpperCase() === "PATH") delete env[key];
  if (pathValue) env[pathKey ?? "PATH"] = pathValue;
  if (process.env.CLAUDE_CONFIG_DIR) env.CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;
  else if (
    env.CLAUDE_CONFIG_DIR !== undefined &&
    (!isAbsolute(env.CLAUDE_CONFIG_DIR) ||
      env.CLAUDE_CONFIG_DIR.split(/[\\/]/).includes("..") ||
      !isSameConfigDir(env.CLAUDE_CONFIG_DIR))
  ) {
    logForDebugging(
      `bg spawn ${dispatch.short}: dropped dispatch CLAUDE_CONFIG_DIR \u2014 not an absolute, dot-dot-free spelling of this daemon's config home`,
      {
        level: "warn",
      },
    );
    delete env.CLAUDE_CONFIG_DIR;
  }
  for (let carriedKey of BG_CARRIED_ENV_KEYS_2) if (!dispatch.env?.[carriedKey]) delete env[carriedKey];
  stripCoworkHostEnvKeys(env);
  stripBgScrubbedEnvKeys(env);
  carrySandboxEnv(env, baseEnv);
  if (!dispatch.env?.CLAUDE_CODE_ENTRYPOINT) stripInternalEntrypoint(env);
  if (dispatch.isolation === "worktree") env.CLAUDE_BG_ISOLATION = "worktree";
  for (let strippedKey of BG_STRIPPED_ENV_VARS) if (!dispatch.env?.[strippedKey]) delete env[strippedKey];
  for (let key of Object.keys(env))
    if (VERTEX_REGION_PREFIX.some((regionPrefix) => key.startsWith(regionPrefix)) && !dispatch.env?.[key])
      delete env[key];
  if (isHostManagedEnvironment(baseEnv) || isProviderManagedByHost(dispatch)) {
    for (let credentialVar of PROVIDER_CREDENTIAL_ENV_VARS) delete env[credentialVar];
    if (isProviderManagedByHost(dispatch) || isEnvTruthy(baseEnv.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST))
      stripHostManagedEnv(env, dispatch.env);
    let hostAuthEnvVar = getHostAuthEnvVar(baseEnv);
    if (hostAuthEnvVar) {
      normalizeEnvKeyCase(env, [hostAuthEnvVar]);
      delete env[hostAuthEnvVar];
    }
    let hostCredsFile =
      dispatch.env?.CLAUDE_CODE_HOST_CREDS_FILE ??
      (isProviderManagedByHost(dispatch) ? baseEnv.CLAUDE_CODE_HOST_CREDS_FILE : undefined);
    if (hostCredsFile) env.CLAUDE_CODE_HOST_CREDS_FILE = hostCredsFile;
    for (let companionVar of PROVIDER_ENDPOINT_COMPANION_VARS) delete env[companionVar];
  } else {
    let keptCompanions = new Set();
    let pairVars = new Set();
    let changedVars = new Set();
    let hostCustomEndpoint = false;
    let dispatchCustomEndpoint = false;
    for (let pair of PROVIDER_ENDPOINT_PAIRS) {
      let selectionOn = pair.selection === undefined || isEnvTruthy(env[pair.selection]);
      if (
        env[pair.endpoint] === baseEnv[pair.endpoint] &&
        (!env[pair.endpoint] || selectionOn) &&
        pair.companions.every(
          (companion) =>
            !SKIP_AUTH_ENV_VARS.includes(companion) ||
            isEnvTruthy(env[companion]) === isEnvTruthy(baseEnv[companion]),
        )
      ) {
        if (env[pair.endpoint]) {
          for (let companion of pair.companions) keptCompanions.add(companion);
          hostCustomEndpoint ||= usesCustomEndpoint(baseEnv, pair);
        }
        continue;
      }
      for (let varName of [pair.endpoint, ...pair.companions]) {
        pairVars.add(varName);
        if (env[pair.endpoint] && env[varName] !== baseEnv[varName]) changedVars.add(varName);
      }
      if (pair.endpoint === "ANTHROPIC_BASE_URL" && baseEnv.ANTHROPIC_BASE_URL)
        delete env.ANTHROPIC_AUTH_TOKEN;
      else dispatchCustomEndpoint ||= usesCustomEndpoint(baseEnv, pair);
    }
    for (let varName of pairVars)
      if (!keptCompanions.has(varName) || changedVars.has(varName)) delete env[varName];
    if (dispatchCustomEndpoint && !hostCustomEndpoint) delete env.ANTHROPIC_AUTH_TOKEN;
  }
  if (auth) {
    env.CLAUDE_BG_RV_AUTH = auth.rvAuth;
    env.CLAUDE_BG_PTY_AUTH = auth.ptyAuth;
  }
  if (authSnapshotPath) delete env.CLAUDE_CODE_OAUTH_TOKEN;
  if (dispatch.launch.mode === "exec") {
    let any = PROVIDER_ENDPOINT_PAIRS.some((pair) => usesCustomEndpoint(env, pair));
    for (let key of Object.keys(env))
      if (
        (key.startsWith("CLAUDE_") &&
          key !== "CLAUDE_JOB_DIR" &&
          key !== "CLAUDE_CONFIG_DIR" &&
          key !== "CLAUDE_BG_PTY_AUTH") ||
        key.startsWith("OTEL_")
      )
        delete env[key];
    delete env.BROWSER;
    if (any) delete env.ANTHROPIC_AUTH_TOKEN;
    for (let companionVar of PROVIDER_ENDPOINT_COMPANION_VARS) delete env[companionVar];
    env.CLAUDE_PTY_HOST_EXEC = "1";
  }
  applySilentPeersFlag(env);
  return env;
}
//@ chunk-89ebz077.js:15895-15998 placement
function syncProcessWrapperEnv(bgSessionEnv, sessionEnv) {
  let wrapperEnv = process.env[PROCESS_WRAPPER_ENV];
  if (sessionEnv.launch.mode === "exec" || wrapperEnv === undefined) delete bgSessionEnv[PROCESS_WRAPPER_ENV];
  else bgSessionEnv[PROCESS_WRAPPER_ENV] = wrapperEnv;
}
//@ chunk-89ebz077.js:15998-16227 placement
async function writeAuthSnapshot(short, snapshot) {
  if (!snapshot || getPlatform() !== "macos") return;
  let path = daemonAuthFile(short);
  try {
    await mkdir(daemonAuthDir(), {
      recursive: true,
      mode: 448,
    });
    await writeFile(path, JSON.stringify(snapshot), {
      mode: 384,
    });
    return path;
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
