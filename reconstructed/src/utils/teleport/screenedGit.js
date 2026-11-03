/**
 * utils/teleport/screenedGit.ts
 *
 * 2.1.316 新增：受审查的 git
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (23)
 * attribution: placement 23
 */
import { join, basename, dirname, isAbsolute } from "path";
import { GitBinaryError, gitExeOnPathInEnv } from "../git/builderGit/gitBinary.js";
import {
  gitVersionCacheByHost,
  dirSyncSession,
  GIT_VERSION_PROBE_TIMEOUT_MS,
  gitProbeCacheByHost,
} from "./dirSync.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  IN_TREE_SETTINGS_UNREADABLE,
  buildGitEnv,
  buildGitEnvForReach,
  runGitWithEnv,
  C_LOCALE_ENV,
  IN_TREE_SETTINGS_UNREADABLE_MESSAGE,
  gitConfigLocationEnv,
  scrubGitTrace2Env,
  workTreeReachRoots,
  buildGitInvocation,
  getPreSettingsEnv,
} from "../git/builderGit/gitEnv.js";
import { isVolumeRoot, nearestRepoAncestor } from "../git/builderGit/sandboxReach.js";
import { isPathInside } from "../permissions/protectedEnvAndGitPaths.js";
import { logForDebugging } from "../debug.js";
import { isVersionAtLeast2_32, parseGitVersion } from "../../remote/tools/servedOwnerSettings.js";
import { logEvent } from "../../services/analytics/index.js";
import { getPlatform } from "../platform.js";
import { getEnvCaseInsensitive } from "../plugins/securityDefaultPlugin.js";
import { firstLineOf } from "../stringUtils.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { UNSET_REFERENCE_BACKEND_ENV, inspectGitLayout } from "../git/builderGit/gitConfigAudit.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { replaceControlChars } from "../resultError.js";
import { GIT_FAILURE_CLASSIFIERS, pickPreservedEnv } from "../git/builderGit/gitRun.js";
import { DEV_NULL } from "../git/gitIndexReader.js";
import { GIT_ALLOW_PROTOCOL_VALUE } from "../git/gitSafeEnv.js";

//@ chunk-e6aww6q8.js:1915792-1915836 placement
function gitBinaryErrorForHostShape(e) {
  return new GitBinaryError("operation");
}
//@ chunk-e6aww6q8.js:1915836-1915966 placement
function gitBinaryErrorForHost(e) {
  let n = e[0] ?? "";
  let r = gitVersionCacheByHost.of(getRootSession().host);
  let s = r.get(n);
  if (s !== undefined) return s;
  let h = new GitBinaryError("checkout");
  r.set(n, h);
  return h;
}
//@ chunk-e6aww6q8.js:1915966-1916059 placement
function buildScreenedGitEnv(e, n = preservedGitEnv()) {
  return e === undefined || e === IN_TREE_SETTINGS_UNREADABLE
    ? buildGitEnv(e, undefined, n)
    : buildGitEnvForReach(e, gitBinaryErrorForHost(e).screenMemo, n);
}
//@ chunk-e6aww6q8.js:1916059-1916120 placement
function describeGitBinaryFile(e) {
  return {
    file: locateScreenedGitBinary(e),
    startsOutside: e !== undefined,
  };
}
//@ chunk-e6aww6q8.js:1916120-1916746 placement
/**
 * 定位受审查的 git 可执行文件并上报其可写范围结论。
 */
function locateScreenedGitBinary(e) {
  let n =
    e === undefined || e === IN_TREE_SETTINGS_UNREADABLE
      ? gitExeOnPathInEnv(buildGitEnv(e))
      : gitExeOnPathInEnv(buildScreenedGitEnv(e), gitBinaryErrorForHost(e));
  if (n !== null) return n;
  let r = e === IN_TREE_SETTINGS_UNREADABLE;
  let s = typeof e === "object" ? e : [];
  let h = typeof e === "object" ? gitExeOnPathInEnv(buildGitEnv(undefined)) : null;
  let filtered = s.filter(isVolumeRoot);
  let S = h !== null && filtered.some((G) => isPathInside(G, h));
  let w = typeof e === "object" && !S && h !== null;
  let L = r ? "settings_unreadable" : S ? "volume_in_reach" : w ? "only_inside_reach" : "not_on_path";
  if (dirSyncSession().sayGitNotOnStartPath(L)) {
    let G = s[0] ?? "";
    let q = L === "only_inside_reach" ? nearestRepoAncestor(G) : null;
    logForDebugging(
      `[screenedGit] ${runScreenedGit({
        cause: L,
        tree: G,
        found: h,
        volumes: filtered,
        homeCheckout: q,
      })}`,
      {
        level: "warn",
      },
    );
    logScreenedGitReach({
      only_inside_reach: w,
      settings_unreadable: r,
      volume_in_reach: S,
      home_checkout: q !== null,
    });
  }
  return unreachableGitPath(e);
}
//@ chunk-e6aww6q8.js:1916746-1917352 placement
async function checkGitVersionForScreening(e, n) {
  let { dir, env, signal, startsInProject = false } = n;
  let startsOutside = !startsInProject;
  let w = {
    ...describeGitBinaryFile(e),
    startsOutside,
  };
  let file = w.file;
  let G = {
    file: unreachableGitPath(e),
    startsOutside,
  };
  if (file === G.file) return G;
  let q = await cachedGitVersionProbe(
    async () => {
      let Z = await runGitWithEnv(w, ["version"], {
        dir,
        env: {
          ...env,
          ...C_LOCALE_ENV,
        },
        abortSignal: signal,
        timeout: GIT_VERSION_PROBE_TIMEOUT_MS,
        stdin: "ignore",
        preserveOutputOnError: false,
      });
      return Z.code === 0 ? Z.stdout : null;
    },
    gitProbeCacheKey(w, dir),
  );
  if (isVersionAtLeast2_32(q === null ? null : parseGitVersion(q))) return w;
  if (q === null && signal?.aborted) return G;
  if (dirSyncSession().sayGitNotOnStartPath("old_git")) {
    logForDebugging(
      `[screenedGit] ${runScreenedGit({
        cause: "old_git",
        tree: dir,
        found: file,
        volumes: [],
        homeCheckout: null,
      })}`,
      {
        level: "warn",
      },
    );
    logScreenedGitReach({
      old_git: true,
    });
  }
  return G;
}
//@ chunk-e6aww6q8.js:1917352-1917499 placement
var SCREENED_GIT_FLAGS = {
  only_inside_reach: false,
  reach_unplaced: false,
  settings_unreadable: false,
  volume_in_reach: false,
  home_checkout: false,
  old_git: false,
  did_not_run_from_outside: false,
};
//@ chunk-e6aww6q8.js:1917499-1917571 placement
function logScreenedGitReach(e) {
  logEvent("tengu_dir_sync_git_not_on_start_path", {
    ...SCREENED_GIT_FLAGS,
    ...e,
  });
}
//@ chunk-e6aww6q8.js:1917571-1920015 placement
/**
 * 运行受审查的 git：确认可写范围后才执行。
 */
function runScreenedGit({ cause, tree, found, volumes, homeCheckout }) {
  let y = tree === "" ? "" : ` (${tree})`;
  let S = found ?? "git";
  switch (cause) {
    case "settings_unreadable":
      return IN_TREE_SETTINGS_UNREADABLE_MESSAGE;
    case "volume_in_reach":
      return `no screened git runs here${y} this time: a whole volume (${volumes.filter((volume) => isPathInside(volume, S)).join(", ")}) counts as writable by the bound cloud session for now, so ${S} is not vouched for. If it persists, either a grant names a whole volume, or a directory the session can write could not be examined (the \xABcannot be vouched for\xBB line above names that directory)`;
    case "only_inside_reach":
      return homeCheckout === null
        ? `no screened git runs here${y}: ${S}, the git on the PATH this process was started with, stands where the bound cloud session can write (this checkout, one enclosing it, a directory granted to the session, a linked tree's main checkout), links into such a place, or is on another host \u2014 and nothing there is searched. Install or link git elsewhere on that PATH and restart Claude Code`
        : `no screened git runs here${y}: your home directory is a git checkout, or lies in one (${homeCheckout}), so a cloud session bound there could write everything beneath it, and ${S} stands there or somewhere else a session can write; nothing there is searched. Install or link git outside your home (the system's or a package manager's directory) and restart Claude Code, or move the .git directory out of ${homeCheckout} (kept elsewhere, it keeps its history)`;
    case "not_on_path":
      return "git is not on the absolute entries of the PATH this process was started with; no screened git runs";
    case "did_not_run_from_outside":
      return "";
    case "old_git":
      return `git reads made before a cloud session starts (such as which remote this checkout uses, or which pushed commit to start from) were skipped here${y}: ${S} is older than 2.32, or its version could not be read, and only git 2.32 or newer can be told to ignore your personal git configuration file \u2014 a file a cloud session could change when your home directory is itself a git checkout. Update git to 2.32 or newer and restart Claude Code`;
    case "reach_unplaced":
      return `git reads made before a cloud session starts (such as which remote this checkout uses, or which pushed commit to start from) were skipped here${y} this time: what a bound cloud session can write could not be worked out from this checkout\u2019s git layout, or there is no usable git on the PATH to read it with (the \xABcould not work out\xBB line above, at debug level, says which)`;
  }
}
//@ chunk-e6aww6q8.js:1920015-1920335 placement
/**
 * 返回一个不存在的 git 路径，用于在不能运行 git 时让调用失败。
 */
function unreachableGitPath(e) {
  if (getPlatform() !== "windows") return "/nonexistent/git-not-on-the-PATH-this-process-was-started-with";
  let envCaseInsensitive = getEnvCaseInsensitive(buildGitEnv(undefined), "SystemRoot");
  return join(
    envCaseInsensitive !== undefined &&
      /^[A-Za-z]:[\\/]/.test(envCaseInsensitive) &&
      e !== IN_TREE_SETTINGS_UNREADABLE &&
      !(e ?? []).some((r) => isPathInside(r, envCaseInsensitive) || isPathInside(envCaseInsensitive, r))
      ? envCaseInsensitive
      : "C:\\Windows",
    "System32",
    "git-not-on-the-PATH-this-process-was-started-with.exe",
  );
}
//@ chunk-e6aww6q8.js:1920335-1920405 placement
function gitProbeCacheKey({ file, startsOutside }, dir) {
  return `${file}\x00${dir}\x00${startsOutside}`;
}
//@ chunk-e6aww6q8.js:1920405-1920742 placement
/**
 * 按宿主缓存一次性探测的 git 版本，失败时清缓存。
 */
function cachedGitVersionProbe(e, n) {
  let r = gitProbeCacheByHost.of(getRootSession().host);
  let s = r.get(n);
  if (s !== undefined) return s;
  let h = () => {
    r.delete(n);
    return null;
  };
  let y = e().then((S) => {
    if (S === null) return h();
    let gitVersion = parseGitVersion(S);
    try {
      logEvent("tengu_dir_sync_git_version", {
        release: gitVersion !== null,
        major: gitVersion?.major ?? 0,
        minor: gitVersion?.minor ?? 0,
        in_shims_folder: basename(dirname(firstLineOf(n, "\x00"))) === "shims",
      });
    } catch {}
    return S;
  }, h);
  r.set(n, y);
  return y;
}
//@ chunk-e6aww6q8.js:1920742-1920790 placement
function screenedGitPreservedEnv(e = preservedGitEnv()) {
  return gitConfigLocationEnv(buildScreenedGitEnv(undefined, e));
}
//@ chunk-e6aww6q8.js:1920790-1920925 placement
function screenedGitEnv(e, n, r) {
  let s = r ?? preservedGitEnv();
  let screenedGitEnv = buildScreenedGitEnv(n, s);
  return {
    ...getRemoteHostSessionCount(
      {
        ...screenedGitPreservedEnv(s),
        ...SCREENED_GIT_SAFE_ENV,
        ...{},
        ...scrubGitTrace2Env(screenedGitEnv),
        ...e,
      },
      {
        base: screenedGitEnv,
      },
    ),
    GIT_CONFIG: undefined,
    ...UNSET_REFERENCE_BACKEND_ENV,
  };
}
//@ chunk-e6aww6q8.js:1920925-1920957 placement
var REACH_UNPLACED = Symbol("reach unplaced");
//@ chunk-e6aww6q8.js:1920957-1921434 placement
/**
 * 读取启动目录的 git 布局（含链接工作树），计算云会话可写范围并上报 tengu_cloud_launch_git_layout_read 事件。
 */
async function readLaunchGitLayout(cwd, signal, startsInProject = false) {
  let startTime = performance.now();
  let layoutRead = await inspectGitLayout(cwd, signal, {
    linkedTrees: true,
    bound: true,
    startsInProject,
    probes: gitBinaryErrorForHostShape(cwd),
  });
  let y = vouchedReachForLayout(cwd, layoutRead);
  let S = signal?.aborted === true;
  try {
    logEvent("tengu_cloud_launch_git_layout_read", {
      outcome: fromEnum(
        y === REACH_UNPLACED
          ? "unplaced"
          : y === IN_TREE_SETTINGS_UNREADABLE
            ? "nothing_vouched"
            : layoutRead.kind === "read"
              ? "placed"
              : "widened",
      ),
      reason: S ? undefined : fromEnumOpt(layoutReadReason(layoutRead)),
      cut_short: S,
      git_within_reach:
        layoutRead.kind === "failed" &&
        layoutRead.why !== "changed_under_hold" &&
        layoutRead.withinReach === true,
      duration_ms: Math.round(performance.now() - startTime),
    });
  } catch {}
  return y;
}
//@ chunk-e6aww6q8.js:1921434-1921575 placement
function layoutReadReason(e) {
  if (e.kind === "read") return;
  if (e.kind === "tampered") return e.misplaced;
  return e.why === "changed_under_hold" ? e.why : (e.why ?? e.cause);
}
//@ chunk-e6aww6q8.js:1921575-1922409 placement
/**
 * 根据 git 布局读取结果确定可信的可达范围。
 */
function vouchedReachForLayout(cwd, layoutRead) {
  if (layoutRead.kind === "read") return workTreeReachRoots(cwd, layoutRead.layout);
  let r =
    layoutRead.kind === "tampered" && layoutRead.misplaced !== "temp_root"
      ? [layoutRead.commonDir, layoutRead.gitDir].find((h) => isAbsolute(h))
      : undefined;
  if (r === undefined) {
    if (layoutRead.kind === "failed" && layoutRead.why === "settings_unreadable")
      return IN_TREE_SETTINGS_UNREADABLE;
    if (
      layoutRead.kind === "failed" &&
      layoutRead.why !== "changed_under_hold" &&
      layoutRead.cause === "git_did_not_run_from_outside" &&
      dirSyncSession().sayGitNotOnStartPath("did_not_run_from_outside")
    ) {
      logForDebugging(
        `[screenedGit] ${runScreenedGit({
          cause: "did_not_run_from_outside",
          tree: cwd,
          found: null,
          volumes: [],
          homeCheckout: null,
        })}`,
        {
          level: "warn",
        },
      );
      logScreenedGitReach({
        did_not_run_from_outside: true,
      });
    }
    let h =
      layoutRead.kind === "tampered" ? layoutRead.misplaced : layoutRead.detail.slice(0, 200) || "no message";
    logForDebugging(
      replaceControlChars(
        `[screenedGit] could not work out what a bound cloud session can write in ${cwd} (${layoutRead.kind}: ${h})`,
      ),
    );
    return REACH_UNPLACED;
  }
  let commonDir = basename(dirname(r)).toLowerCase() === "worktrees" ? dirname(dirname(r)) : r;
  return workTreeReachRoots(cwd, {
    workTree: cwd,
    commonDir,
  });
}
//@ chunk-e6aww6q8.js:1922409-1922843 placement
/**
 * 根据可达范围构造筛查后的 git 环境，范围无法确定时记录并降级。
 */
async function screenedGitEnvForReach(e, n, signal, s = false) {
  if (e === REACH_UNPLACED) {
    if (!signal?.aborted && dirSyncSession().sayGitNotOnStartPath("reach_unplaced")) {
      logForDebugging(
        `[screenedGit] ${runScreenedGit({
          cause: "reach_unplaced",
          tree: n,
          found: null,
          volumes: [],
          homeCheckout: null,
        })}`,
        {
          level: "warn",
        },
      );
      logScreenedGitReach({
        reach_unplaced: true,
      });
    }
    let env = buildScreenedGitEnv_2({}, IN_TREE_SETTINGS_UNREADABLE);
    let w = {
      file: unreachableGitPath(IN_TREE_SETTINGS_UNREADABLE),
      startsOutside: !s,
    };
    return (L) =>
      buildGitInvocation(w, L, {
        dir: n,
        env,
      });
  }
  let env = buildScreenedGitEnv_2({}, e);
  let y = await checkGitVersionForScreening(e, {
    dir: n,
    env,
    signal,
    startsInProject: s,
  });
  return (S) =>
    buildGitInvocation(y, S, {
      dir: n,
      env,
    });
}
//@ chunk-e6aww6q8.js:1922843-1923045 placement
function buildScreenedGitEnv_2(e, n) {
  let r = GIT_FAILURE_CLASSIFIERS(getPreSettingsEnv());
  if (n === undefined)
    return {
      ...screenedGitEnv(e, undefined, r),
      GIT_REFERENCE_BACKEND: getEnvCaseInsensitive(r, "GIT_REFERENCE_BACKEND"),
    };
  return {
    ...screenedGitEnv(
      {
        ...e,
        GIT_CONFIG_GLOBAL: DEV_NULL,
      },
      n,
      r,
    ),
    GIT_CONFIG_SYSTEM: undefined,
  };
}
//@ chunk-e6aww6q8.js:1923045-1923124 placement
var SCREENED_GIT_SAFE_ENV = {
  GIT_ALLOW_PROTOCOL: GIT_ALLOW_PROTOCOL_VALUE,
  GIT_NO_LAZY_FETCH: "1",
  GIT_TERMINAL_PROMPT: "0",
};
//@ chunk-e6aww6q8.js:1923124-1923157 placement
function preservedGitEnv() {
  return pickPreservedEnv(getPreSettingsEnv());
}
//@ chunk-e6aww6q8.js:1923157-1923205 placement
var GIT_REF_READ_TIMEOUT_MS = 30000;
var GIT_REF_LIST_TIMEOUT_MS = 1e4;
var GIT_REF_PROBE_TIMEOUT_MS = 1e4;
var MAX_REMOTE_BRANCH_CANDIDATES = 8;
var GIT_REF_MAX_BUFFER = 4194304;
export {
  readLaunchGitLayout,
  screenedGitEnvForReach,
  REACH_UNPLACED,
  buildScreenedGitEnv_2,
  describeGitBinaryFile,
  checkGitVersionForScreening,
  GIT_REF_MAX_BUFFER,
  GIT_REF_LIST_TIMEOUT_MS,
  GIT_REF_READ_TIMEOUT_MS,
  GIT_REF_PROBE_TIMEOUT_MS,
  MAX_REMOTE_BRANCH_CANDIDATES,
};
