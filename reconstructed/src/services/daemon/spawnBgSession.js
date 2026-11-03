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
import { mkdir, mkdir as mkdir_2, writeFile } from "fs/promises";
import { getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { Nd } from "../../utils/toolCgroup.js";
import { getPlatform } from "../../utils/platform.js";
import { JC, $Tt, NTt } from "../../utils/sandbox/userNamespace.js";
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
  BG_CARRIED_ENV_KEYS,
  soe,
  Z0t,
  carrySandboxEnv,
  stripInternalEntrypoint,
} from "../../utils/background/envCarry.js";
import {
  tbr,
  isHostManagedEnvironment,
  Gx,
  stripHostManagedEnv,
  getHostAuthEnvVar,
  n8e,
  hct,
  aJt,
} from "../../utils/managedEnvConstants.js";
import { PROCESS_WRAPPER_ENV } from "../../utils/processWrapper.js";

/**
 * 返回启动 bg-pty-host 进程的函数：用当前二进制带 --bg-pty-host 参数分离启动，stderr 写到 socket 旁的日志；打不开日志文件时丢弃 stderr 并去掉 cgroup 重试；最后连接 pty 宿主。
 */
//@ chunk-89ebz077.js:11865-12726 placement
function createPtyHostSpawner() {
  return (e, r, s) => {
    let { cmd: cmd, prefixArgs: prefixArgs } = getLaunchCommand({ pinToCurrentBinary: !0 }),
      argv = [cmd, ...prefixArgs, "--bg-pty-host", s.ptySock, String(s.cols), String(s.rows), "--", e, ...r],
      spawnOptions = {
        cwd: s.cwd,
        env: s.env,
        detached: !0,
        windowsHide: !0,
        ...Nd("agent"),
        ...(getPlatform() !== "windows" && { argv0: "claude bg-pty-host" }),
      },
      proc;
    try {
      proc = Bun.spawn(argv, { ...spawnOptions, stdio: ["ignore", "ignore", Bun.file(JC(s.ptySock))] });
    } catch (error) {
      let f = getErrnoCode(error);
      if (f !== "ENOENT" && f !== "ENOSPC" && f !== "EACCES" && f !== "EROFS") throw error;
      logForDebugging(
        `bg: ptyHost stderr breadcrumb open failed (${f}) at ${JC(s.ptySock)} \u2014 spawning with stderr discarded (crash diagnostics degraded): ${errorMessage(error)}`,
        { level: "warn" },
      );
      let { cgroup: cgroup, ...E } = spawnOptions;
      if (cgroup !== void 0)
        logForDebugging(`bg: retrying ptyHost spawn without tool cgroup placement (${cgroup})`, {
          level: "warn",
        });
      proc = Bun.spawn(argv, { ...E, stdio: ["ignore", "ignore", "ignore"] });
    }
    return (
      proc.unref(),
      connectPtyHost(s.ptySock, proc.pid, { short: s.short, hostProc: proc, auth: s.ptyAuth })
    );
  };
}
/**
 * 计算后台会话启动参数：exec 直接用原参数；重启时按是否有会话记录用 --resume 或 --session-id；resume 模式（可 fork）带 --resume；去掉转发与环境标志。
 */
//@ chunk-89ebz077.js:12726-13141 placement
function buildSessionLaunchArgs(e, r, s, n, o, p) {
  if (e.launch.mode === "exec") return e.launch.args.map(stripLongPathPrefixes);
  if (r > 1 && s) return stripForwardedFlags(["--resume", o ?? n, ...stripEnvironmentFlags(p)]);
  if (r > 1 && n !== e.sessionId)
    return stripForwardedFlags(["--session-id", n, ...stripEnvironmentFlags(p)]);
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
  let p = { ...process.env };
  if ((normalizeEnvKeyCase(p), e.env)) normalizeEnvKeyCase(e.env);
  let h = {
      ...p,
      ...(s && { CLAUDE_BG_AUTH_SNAPSHOT_PATH: s }),
      ...(isStorageV5Enabled() &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_hover_rest", !1) && { CLAUDE_CODE_HOVER_REST: "1" }),
      ...(getPlatform() === "windows" && { CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT: "1" }),
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
    },
    u = Object.hasOwn(p, "PATH") ? "PATH" : Object.keys(p).find((f) => f.toUpperCase() === "PATH"),
    g = e.env?.PATH || (u ? p[u] : void 0);
  for (let f of Object.keys(h)) if (f.toUpperCase() === "PATH") delete h[f];
  if (g) h[u ?? "PATH"] = g;
  if (process.env.CLAUDE_CONFIG_DIR) h.CLAUDE_CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR;
  else if (
    h.CLAUDE_CONFIG_DIR !== void 0 &&
    (!isAbsolute(h.CLAUDE_CONFIG_DIR) ||
      h.CLAUDE_CONFIG_DIR.split(/[\\/]/).includes("..") ||
      !isSameConfigDir(h.CLAUDE_CONFIG_DIR))
  )
    (logForDebugging(
      `bg spawn ${e.short}: dropped dispatch CLAUDE_CONFIG_DIR \u2014 not an absolute, dot-dot-free spelling of this daemon's config home`,
      { level: "warn" },
    ),
      delete h.CLAUDE_CONFIG_DIR);
  for (let f of BG_CARRIED_ENV_KEYS) if (!e.env?.[f]) delete h[f];
  if ((soe(h), Z0t(h), carrySandboxEnv(h, p), !e.env?.CLAUDE_CODE_ENTRYPOINT)) stripInternalEntrypoint(h);
  if (e.isolation === "worktree") h.CLAUDE_BG_ISOLATION = "worktree";
  for (let f of BG_STRIPPED_ENV_VARS) if (!e.env?.[f]) delete h[f];
  for (let f of Object.keys(h)) if (tbr.some((w) => f.startsWith(w)) && !e.env?.[f]) delete h[f];
  if (isHostManagedEnvironment(p) || isProviderManagedByHost(e)) {
    for (let E of Gx) delete h[E];
    if (isProviderManagedByHost(e) || isEnvTruthy(p.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST))
      stripHostManagedEnv(h, e.env);
    let f = getHostAuthEnvVar(p);
    if (f) (normalizeEnvKeyCase(h, [f]), delete h[f]);
    let w =
      e.env?.CLAUDE_CODE_HOST_CREDS_FILE ??
      (isProviderManagedByHost(e) ? p.CLAUDE_CODE_HOST_CREDS_FILE : void 0);
    if (w) h.CLAUDE_CODE_HOST_CREDS_FILE = w;
    for (let E of n8e) delete h[E];
  } else {
    let f = new Set(),
      w = new Set(),
      E = new Set(),
      S = !1,
      R = !1;
    for (let A of hct) {
      let O = A.selection === void 0 || isEnvTruthy(h[A.selection]);
      if (
        h[A.endpoint] === p[A.endpoint] &&
        (!h[A.endpoint] || O) &&
        A.companions.every(
          (companion) => !aJt.includes(companion) || isEnvTruthy(h[companion]) === isEnvTruthy(p[companion]),
        )
      ) {
        if (h[A.endpoint]) {
          for (let companion of A.companions) f.add(companion);
          S ||= usesCustomEndpoint(p, A);
        }
        continue;
      }
      for (let L of [A.endpoint, ...A.companions]) if ((w.add(L), h[A.endpoint] && h[L] !== p[L])) E.add(L);
      if (A.endpoint === "ANTHROPIC_BASE_URL" && p.ANTHROPIC_BASE_URL) delete h.ANTHROPIC_AUTH_TOKEN;
      else R ||= usesCustomEndpoint(p, A);
    }
    for (let A of w) if (!f.has(A) || E.has(A)) delete h[A];
    if (R && !S) delete h.ANTHROPIC_AUTH_TOKEN;
  }
  if (o) ((h.CLAUDE_BG_RV_AUTH = o.rvAuth), (h.CLAUDE_BG_PTY_AUTH = o.ptyAuth));
  if (s) delete h.CLAUDE_CODE_OAUTH_TOKEN;
  if (e.launch.mode === "exec") {
    let any = hct.some((w) => usesCustomEndpoint(h, w));
    for (let w of Object.keys(h))
      if (
        (w.startsWith("CLAUDE_") &&
          w !== "CLAUDE_JOB_DIR" &&
          w !== "CLAUDE_CONFIG_DIR" &&
          w !== "CLAUDE_BG_PTY_AUTH") ||
        w.startsWith("OTEL_")
      )
        delete h[w];
    if ((delete h.BROWSER, any)) delete h.ANTHROPIC_AUTH_TOKEN;
    for (let w of n8e) delete h[w];
    h.CLAUDE_PTY_HOST_EXEC = "1";
  }
  return (applySilentPeersFlag(h), h);
}
//@ chunk-89ebz077.js:15895-15998 placement
function syncProcessWrapperEnv(e, r) {
  let s = process.env[PROCESS_WRAPPER_ENV];
  if (r.launch.mode === "exec" || s === void 0) delete e[PROCESS_WRAPPER_ENV];
  else e[PROCESS_WRAPPER_ENV] = s;
}
//@ chunk-89ebz077.js:15998-16227 placement
async function writeAuthSnapshot(e, r) {
  if (!r || getPlatform() !== "macos") return;
  let s = $Tt(e);
  try {
    return (
      await mkdir_2(NTt(), { recursive: !0, mode: 448 }),
      await writeFile(s, JSON.stringify(r), { mode: 384 }),
      s
    );
  } catch (error) {
    logForDebugging(`writeAuthSnapshot failed: ${errorMessage(error)}`, { level: "warn" });
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
