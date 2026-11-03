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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
} from "path";
import { GitBinaryError, iKt } from "../git/builderGit/gitBinary.js";
import { Ier, HB, Ler, Der } from "./dirSync.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  IN_TREE_SETTINGS_UNREADABLE,
  buildGitEnv,
  oKt,
  eer,
  Hyn,
  IN_TREE_SETTINGS_UNREADABLE_MESSAGE,
  gitConfigLocationEnv,
  scrubGitTrace2Env,
  MVo,
  buildGitInvocation,
  getPreSettingsEnv,
} from "../git/builderGit/gitEnv.js";
import { DVo, Myn } from "../git/builderGit/sandboxReach.js";
import { isPathInside } from "../permissions/protectedEnvAndGitPaths.js";
import { logForDebugging } from "../debug.js";
import { hti, parseGitVersion } from "../../remote/tools/servedOwnerSettings.js";
import { logEvent } from "../../services/analytics/index.js";
import { getPlatform } from "../platform.js";
import { getEnvCaseInsensitive } from "../plugins/securityDefaultPlugin.js";
import { firstLineOf } from "../stringUtils.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { nKt, inspectGitLayout } from "../git/builderGit/gitConfigAudit.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { replaceControlChars } from "../resultError.js";
import { Pqr, pickPreservedEnv } from "../git/builderGit/gitRun.js";
import { DEV_NULL } from "../git/gitIndexReader.js";
import { kMe } from "../git/gitSafeEnv.js";

//@ chunk-e6aww6q8.js:1915792-1915836 placement
function Ner(e) {
  return new GitBinaryError("operation");
}
//@ chunk-e6aww6q8.js:1915836-1915966 placement
function gitBinaryErrorForHost(e) {
  let n = e[0] ?? "",
    of = Ier.of(getRootSession().host),
    s = of.get(n);
  if (s !== void 0) return s;
  let h = new GitBinaryError("checkout");
  return (of.set(n, h), h);
}
//@ chunk-e6aww6q8.js:1915966-1916059 placement
function gXe(e, n = SXe()) {
  return e === void 0 || e === IN_TREE_SETTINGS_UNREADABLE
    ? buildGitEnv(e, void 0, n)
    : oKt(e, gitBinaryErrorForHost(e).screenMemo, n);
}
//@ chunk-e6aww6q8.js:1916059-1916120 placement
function hXe(e) {
  return { file: Fer(e), startsOutside: e !== void 0 };
}
/**
 * 描述 git 可执行路径筛查结果：是否只在可写范围内找到等。
 */
//@ chunk-e6aww6q8.js:1916120-1916746 placement
function Fer(e) {
  let n =
    e === void 0 || e === IN_TREE_SETTINGS_UNREADABLE
      ? iKt(buildGitEnv(e))
      : iKt(gXe(e), gitBinaryErrorForHost(e));
  if (n !== null) return n;
  let r = e === IN_TREE_SETTINGS_UNREADABLE,
    s = typeof e === "object" ? e : [],
    h = typeof e === "object" ? iKt(buildGitEnv(void 0)) : null,
    filtered = s.filter(DVo),
    S = h !== null && filtered.some((G) => isPathInside(G, h)),
    w = typeof e === "object" && !S && h !== null,
    L = r ? "settings_unreadable" : S ? "volume_in_reach" : w ? "only_inside_reach" : "not_on_path";
  if (HB().sayGitNotOnStartPath(L)) {
    let G = s[0] ?? "",
      q = L === "only_inside_reach" ? Myn(G) : null;
    (logForDebugging(
      `[screenedGit] ${runScreenedGit({ cause: L, tree: G, found: h, volumes: filtered, homeCheckout: q })}`,
      { level: "warn" },
    ),
      lTe({ only_inside_reach: w, settings_unreadable: r, volume_in_reach: S, home_checkout: q !== null }));
  }
  return unreachableGitPath(e);
}
//@ chunk-e6aww6q8.js:1916746-1917352 placement
async function checkGitVersionForScreening(e, n) {
  let { dir: dir, env: env, signal: signal, startsInProject: startsInProject = !1 } = n,
    S = !startsInProject,
    w = { ...hXe(e), startsOutside: S },
    file = w.file,
    G = { file: unreachableGitPath(e), startsOutside: S };
  if (file === G.file) return G;
  let q = await Ber(
    async () => {
      let Z = await eer(w, ["version"], {
        dir: dir,
        env: { ...env, ...Hyn },
        abortSignal: signal,
        timeout: Ler,
        stdin: "ignore",
        preserveOutputOnError: !1,
      });
      return Z.code === 0 ? Z.stdout : null;
    },
    Her(w, dir),
  );
  if (hti(q === null ? null : parseGitVersion(q))) return w;
  if (q === null && signal?.aborted) return G;
  if (HB().sayGitNotOnStartPath("old_git"))
    (logForDebugging(
      `[screenedGit] ${runScreenedGit({ cause: "old_git", tree: dir, found: file, volumes: [], homeCheckout: null })}`,
      { level: "warn" },
    ),
      lTe({ old_git: !0 }));
  return G;
}
//@ chunk-e6aww6q8.js:1917352-1917499 placement
var SCREENED_GIT_FLAGS = {
  only_inside_reach: !1,
  reach_unplaced: !1,
  settings_unreadable: !1,
  volume_in_reach: !1,
  home_checkout: !1,
  old_git: !1,
  did_not_run_from_outside: !1,
};
//@ chunk-e6aww6q8.js:1917499-1917571 placement
function lTe(e) {
  logEvent("tengu_dir_sync_git_not_on_start_path", { ...SCREENED_GIT_FLAGS, ...e });
}
/**
 * 运行受审查的 git：确认可写范围后才执行。
 */
//@ chunk-e6aww6q8.js:1917571-1920015 placement
function runScreenedGit({
  cause: cause,
  tree: tree,
  found: found,
  volumes: volumes,
  homeCheckout: homeCheckout,
}) {
  let y = tree === "" ? "" : ` (${tree})`,
    S = found ?? "git";
  switch (cause) {
    case "settings_unreadable":
      return IN_TREE_SETTINGS_UNREADABLE_MESSAGE;
    case "volume_in_reach":
      return `no screened git runs here${y} this time: a whole volume (${volumes.filter((w) => isPathInside(w, S)).join(", ")}) counts as writable by the bound cloud session for now, so ${S} is not vouched for. If it persists, either a grant names a whole volume, or a directory the session can write could not be examined (the \xABcannot be vouched for\xBB line above names that directory)`;
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
/**
 * 返回一个不存在的 git 路径，用于在不能运行 git 时让调用失败。
 */
//@ chunk-e6aww6q8.js:1920015-1920335 placement
function unreachableGitPath(e) {
  if (getPlatform() !== "windows") return "/nonexistent/git-not-on-the-PATH-this-process-was-started-with";
  let n = getEnvCaseInsensitive(buildGitEnv(void 0), "SystemRoot");
  return join_74(
    n !== void 0 &&
      /^[A-Za-z]:[\\/]/.test(n) &&
      e !== IN_TREE_SETTINGS_UNREADABLE &&
      !(e ?? []).some((r) => isPathInside(r, n) || isPathInside(n, r))
      ? n
      : "C:\\Windows",
    "System32",
    "git-not-on-the-PATH-this-process-was-started-with.exe",
  );
}
//@ chunk-e6aww6q8.js:1920335-1920405 placement
function Her({ file: file, startsOutside: startsOutside }, r) {
  return `${file}\x00${r}\x00${startsOutside}`;
}
/**
 * 按宿主缓存一次性探测结果，失败时清除缓存。
 */
//@ chunk-e6aww6q8.js:1920405-1920742 placement
function Ber(e, n) {
  let of = Der.of(getRootSession().host),
    s = of.get(n);
  if (s !== void 0) return s;
  let h = () => (of.delete(n), null),
    y = e().then((S) => {
      if (S === null) return h();
      let w = parseGitVersion(S);
      try {
        logEvent("tengu_dir_sync_git_version", {
          release: w !== null,
          major: w?.major ?? 0,
          minor: w?.minor ?? 0,
          in_shims_folder: basename_39(dirname_43(firstLineOf(n, "\x00"))) === "shims",
        });
      } catch {}
      return S;
    }, h);
  return (of.set(n, y), y);
}
//@ chunk-e6aww6q8.js:1920742-1920790 placement
function Uer(e = SXe()) {
  return gitConfigLocationEnv(gXe(void 0, e));
}
//@ chunk-e6aww6q8.js:1920790-1920925 placement
function screenedGitEnv(e, n, r) {
  let s = r ?? SXe(),
    h = gXe(n, s);
  return {
    ...getRemoteHostSessionCount({ ...Uer(s), ...Ker, ...{}, ...scrubGitTrace2Env(h), ...e }, { base: h }),
    GIT_CONFIG: void 0,
    ...nKt,
  };
}
//@ chunk-e6aww6q8.js:1920925-1920957 placement
var cZ = Symbol("reach unplaced");
/**
 * 读取启动目录的 git 布局（含链接工作树），计算云会话可写范围并上报 tengu_cloud_launch_git_layout_read 事件。
 */
//@ chunk-e6aww6q8.js:1920957-1921434 placement
async function readLaunchGitLayout(e, n, r = !1) {
  let startTime = performance.now(),
    h = await inspectGitLayout(e, n, { linkedTrees: !0, bound: !0, startsInProject: r, probes: Ner(e) }),
    y = vouchedReachForLayout(e, h),
    S = n?.aborted === !0;
  try {
    logEvent("tengu_cloud_launch_git_layout_read", {
      outcome: fromEnum(
        y === cZ
          ? "unplaced"
          : y === IN_TREE_SETTINGS_UNREADABLE
            ? "nothing_vouched"
            : h.kind === "read"
              ? "placed"
              : "widened",
      ),
      reason: S ? void 0 : fromEnumOpt(layoutReadReason(h)),
      cut_short: S,
      git_within_reach: h.kind === "failed" && h.why !== "changed_under_hold" && h.withinReach === !0,
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
/**
 * 根据 git 布局读取结果确定可信的可达范围。
 */
//@ chunk-e6aww6q8.js:1921575-1922409 placement
function vouchedReachForLayout(cwd, layoutRead) {
  if (layoutRead.kind === "read") return MVo(cwd, layoutRead.layout);
  let r =
    layoutRead.kind === "tampered" && layoutRead.misplaced !== "temp_root"
      ? [layoutRead.commonDir, layoutRead.gitDir].find((h) => isAbsolute_37(h))
      : void 0;
  if (r === void 0) {
    if (layoutRead.kind === "failed" && layoutRead.why === "settings_unreadable")
      return IN_TREE_SETTINGS_UNREADABLE;
    if (
      layoutRead.kind === "failed" &&
      layoutRead.why !== "changed_under_hold" &&
      layoutRead.cause === "git_did_not_run_from_outside" &&
      HB().sayGitNotOnStartPath("did_not_run_from_outside")
    )
      (logForDebugging(
        `[screenedGit] ${runScreenedGit({ cause: "did_not_run_from_outside", tree: cwd, found: null, volumes: [], homeCheckout: null })}`,
        { level: "warn" },
      ),
        lTe({ did_not_run_from_outside: !0 }));
    let h =
      layoutRead.kind === "tampered" ? layoutRead.misplaced : layoutRead.detail.slice(0, 200) || "no message";
    return (
      logForDebugging(
        replaceControlChars(
          `[screenedGit] could not work out what a bound cloud session can write in ${cwd} (${layoutRead.kind}: ${h})`,
        ),
      ),
      cZ
    );
  }
  let s = basename_39(dirname_43(r)).toLowerCase() === "worktrees" ? dirname_43(dirname_43(r)) : r;
  return MVo(cwd, { workTree: cwd, commonDir: s });
}
/**
 * 根据可达范围构造筛查后的 git 环境，范围无法确定时记录并降级。
 */
//@ chunk-e6aww6q8.js:1922409-1922843 placement
async function screenedGitEnvForReach(e, n, r, s = !1) {
  if (e === cZ) {
    if (!r?.aborted && HB().sayGitNotOnStartPath("reach_unplaced"))
      (logForDebugging(
        `[screenedGit] ${runScreenedGit({ cause: "reach_unplaced", tree: n, found: null, volumes: [], homeCheckout: null })}`,
        { level: "warn" },
      ),
        lTe({ reach_unplaced: !0 }));
    let S = buildScreenedGitEnv({}, IN_TREE_SETTINGS_UNREADABLE),
      w = { file: unreachableGitPath(IN_TREE_SETTINGS_UNREADABLE), startsOutside: !s };
    return (L) => buildGitInvocation(w, L, { dir: n, env: S });
  }
  let h = buildScreenedGitEnv({}, e),
    y = await checkGitVersionForScreening(e, { dir: n, env: h, signal: r, startsInProject: s });
  return (S) => buildGitInvocation(y, S, { dir: n, env: h });
}
//@ chunk-e6aww6q8.js:1922843-1923045 placement
function buildScreenedGitEnv(e, n) {
  let r = Pqr(getPreSettingsEnv());
  if (n === void 0)
    return {
      ...screenedGitEnv(e, void 0, r),
      GIT_REFERENCE_BACKEND: getEnvCaseInsensitive(r, "GIT_REFERENCE_BACKEND"),
    };
  return { ...screenedGitEnv({ ...e, GIT_CONFIG_GLOBAL: DEV_NULL }, n, r), GIT_CONFIG_SYSTEM: void 0 };
}
//@ chunk-e6aww6q8.js:1923045-1923124 placement
var Ker = { GIT_ALLOW_PROTOCOL: kMe, GIT_NO_LAZY_FETCH: "1", GIT_TERMINAL_PROMPT: "0" };
//@ chunk-e6aww6q8.js:1923124-1923157 placement
function SXe() {
  return pickPreservedEnv(getPreSettingsEnv());
}
//@ chunk-e6aww6q8.js:1923157-1923205 placement
var Ver = 30000,
  Qer = 1e4,
  oon = 1e4,
  Zer = 8,
  etr = 4194304;

export {
  readLaunchGitLayout,
  screenedGitEnvForReach,
  cZ,
  buildScreenedGitEnv,
  hXe,
  checkGitVersionForScreening,
  etr,
  Qer,
  Ver,
  oon,
  Zer,
};
