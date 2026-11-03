/**
 * utils/git/builderGit/sandboxReach.ts
 *
 * builderGit：沙箱可达范围判断（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (60)
 * attribution: placement 60
 */
import {
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
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
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
  delimiter,
} from "path";
import {
  realpathSync,
  realpathSync as realpathSync_2,
  realpathSync as realpathSync_3,
  realpathSync as realpathSync_4,
  realpathSync as realpathSync_5,
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  statfsSync,
  lstatSync,
  lstatSync as lstatSync_2,
  openSync,
  openSync as openSync_2,
  readSync,
  readSync as readSync_2,
  closeSync,
  closeSync as closeSync_2,
  readlinkSync,
} from "fs";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
} from "os";
import {
  access,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
} from "fs/promises";
import { getPlatform as getPlatform_2 } from "../../platform.js";
import { uniq } from "../../collections.js";
import {
  resolveForeignSpelling,
  aqt,
  spellingsToCheck,
  isPathTooDeep,
  isPathInside as isPathInside_2,
  e3o,
  classifyPathSpellingSync,
  isForeignSpelling,
  isWindowsNonDrivePath,
} from "../../permissions/protectedEnvAndGitPaths.js";
import {
  protectedHomeRoots,
  getProtectedTempDirsWithPreSettings,
} from "../../permissions/protectedSettingsPaths.js";
import { logForDebugging } from "../../debug.js";
import { getGlobBaseDirectory_2 } from "../../permissions/pathValidation.js";
import { sS, BP } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { getSettingsForSourceTightenOnly, readRepoDirSettingsFresh } from "../../settings/settings.js";
import {
  parseRuleForSandbox,
  resolvePathPatternForSandbox,
  resolveSandboxFilesystemPath,
  detectWorktreeGitCommonDir,
} from "../../sandbox/sandbox-adapter.js";
import { FILE_EDIT_TOOL_NAME } from "../../../tools/FileEditTool/constants.js";
import { expandPath } from "../../path.js";
import { getClaudeTempDirRealpath, getChildProcessTmpDirRealpath } from "../../tempDirRealpaths.js";
import { getAdditionalDirectoriesForClaudeMd } from "../../../bootstrap/state.js";
import { SETTING_SOURCES, REPO_DIR_SETTING_SOURCE_LIST } from "../../settings/constants.js";
import { truncateWithCount } from "../../stringUtils.js";
import { ui } from "./gitEnv.js";
import { Eh } from "../../pathClassification.js";
import { getErrnoCode } from "../../errors.js";
import { isNetworkMountRoot, isOnForeignMount } from "../../networkPaths.js";
import { $c } from "../../platformTargets.js";
import { toUncLongPath } from "../../windowsUncPaths.js";
import { rawPointerPathIsUnsafe } from "../gitFilesystem.js";
import { stripPathQuotes } from "../../which.js";

//@ chunk-s61vbvea.js:208341-208477 placement
function msysPathToWindows(e) {
  let n = getPlatform_2() === "windows" ? /^\/([A-Za-z])(?=\/|$)/.exec(e) : null;
  return n === null ? e : `${n[1].toUpperCase()}:${e.slice(2) || "\\"}`;
}
//@ chunk-s61vbvea.js:208477-208564 placement
function ly(e, n) {
  let r = msysPathToWindows(e);
  if (r !== e) return uniq([...checkSandboxWriteRoot(r, n), ...checkSandboxWriteRoot(e, n)]);
  return checkSandboxWriteRoot(e, n);
}
//@ chunk-s61vbvea.js:208564-209049 placement
function checkSandboxWriteRoot(e, n) {
  let r = e.startsWith("~") || isAbsolute_7(e) ? e : resolve_3(n, e),
    s = resolveForeignSpelling(aqt(r, n, { pattern: !0 }), n, protectedHomeRoots(), { pattern: !0 }),
    { spelling: spelling, verdict: verdict } = s;
  if (verdict !== "local")
    return (
      logForDebugging(
        `[sandboxReach] write root ${r} cannot be vouched for (${verdict}): counted as every volume`,
        { level: "warn" },
      ),
      [...spellingsToCheck(verdict === "foreign" ? { ...s, verdict: "opaque" } : s, n)]
    );
  let S = getGlobBaseDirectory_2(spelling),
    w;
  try {
    w = getGlobBaseDirectory_2(sS(spelling));
  } catch {
    w = null;
  }
  let filtered = [S, w].filter((P) => P !== null),
    flattened = filtered.flatMap((P) => {
      try {
        let j = realpathSync_2(P);
        return isAbsolute_7(j) ? [j] : [];
      } catch {
        return [];
      }
    });
  return uniq([...filtered, ...flattened]);
}
/**
 * 读取某设置源（或传入的设置）中 permissions.allow 的 Edit 规则路径、sandbox.filesystem.allowWrite 与 permissions.additionalDirectories，展开为路径列表；读取失败返回空。
 */
//@ chunk-s61vbvea.js:209049-209421 placement
function collectSettingsWriteRoots(e, n, r) {
  let s;
  try {
    s = r === void 0 ? getSettingsForSourceTightenOnly(e) : r;
  } catch {
    return [];
  }
  let h = [];
  for (let y of s?.permissions?.allow ?? [])
    try {
      let S = parseRuleForSandbox(y);
      if (S.toolName === FILE_EDIT_TOOL_NAME && S.ruleContent)
        h.push(resolvePathPatternForSandbox(S.ruleContent, e));
    } catch {}
  for (let y of s?.sandbox?.filesystem?.allowWrite ?? [])
    try {
      h.push(resolveSandboxFilesystemPath(y, e));
    } catch {}
  for (let y of s?.permissions?.additionalDirectories ?? [])
    try {
      h.push(expandPath(y, n));
    } catch {}
  return h;
}
/**
 * 默认可达根：临时目录、配置目录、工作树公共 git 目录与额外目录。
 */
//@ chunk-s61vbvea.js:209421-209601 placement
function collectBaseReachRoots(e) {
  let n = [getClaudeTempDirRealpath(), getChildProcessTmpDirRealpath()];
  try {
    n.push(...BP());
  } catch {}
  try {
    let r = detectWorktreeGitCommonDir(e);
    if (r) n.push(r);
  } catch {}
  for (let r of getAdditionalDirectoriesForClaudeMd())
    try {
      n.push(expandPath(r, e));
    } catch {}
  return uniq(n.flatMap((r) => ly(r, e)));
}
//@ chunk-s61vbvea.js:209601-209667 placement
function dSe(e, n, r) {
  return uniq((r ?? collectSettingsWriteRoots(n, e)).flatMap((s) => ly(s, e)));
}
//@ chunk-s61vbvea.js:209667-209739 placement
function xyn(e) {
  return uniq([...collectBaseReachRoots(e), ...SETTING_SOURCES.flatMap((n) => dSe(e, n, null))]);
}
//@ chunk-s61vbvea.js:209739-209749 placement
var qA = REPO_DIR_SETTING_SOURCE_LIST;
//@ chunk-s61vbvea.js:209749-209955 placement
function collectRepoSettingsReachRoots(e) {
  let mapped = qA.map((r) => ({ source: r, read: readRepoSettingsForReach(r) }));
  return mapped.some(({ read: read }) => read === "unreadable")
    ? "unreadable"
    : uniq(
        mapped.flatMap(({ source: source, read: read }) =>
          read === "unreadable"
            ? []
            : dSe(
                e,
                source,
                read.flatMap((h) => collectSettingsWriteRoots(source, e, h)),
              ),
        ),
      );
}
//@ chunk-s61vbvea.js:209955-210150 placement
function readRepoSettingsForReach(e) {
  try {
    let n = readRepoDirSettingsFresh(e);
    if (n.kind === "unreadable" || n.kind === "unreadable_for_now") return "unreadable";
    if (n.kind === "in_effect") return [n.settings];
    return "unreadable";
  } catch {
    return "unreadable";
  }
}
//@ chunk-s61vbvea.js:263193-263279 placement
function Lqr(e = !0) {
  return { roots: new Set(), keepsVolumes: e, paths: new Map(), loaders: new Map() };
}
//@ chunk-s61vbvea.js:263279-263448 placement
function mergeReachRoots(e, n) {
  let r = weakMap.get(n) ?? new Set(),
    filtered = n.filter((h) => r.has(h) || (!e.keepsVolumes && DVo(h)));
  for (let h of n) if (!filtered.includes(h)) e.roots.add(h);
  return uniq([...e.roots, ...filtered]);
}
//@ chunk-s61vbvea.js:263448-263486 placement
function DVo(e) {
  return e === parse_2(e).root;
}
//@ chunk-s61vbvea.js:263486-263599 placement
function reachForWorkTree(e, n) {
  let r = n?.workTree ?? e;
  return { tree: r, roots: aS(r, [...findEnclosingRepos(r), ...(n === void 0 ? [] : [Cvt(n.commonDir)])]) };
}
/**
 * 把可达根解析为真实路径，无法担保的按“整卷”处理。
 */
//@ chunk-s61vbvea.js:263599-264061 placement
function resolveReachRoots(e, n) {
  let r = new Set(),
    s = new Set(),
    h = (w, R) => {
      let x = countRootAsEveryVolume(w, R, n);
      for (let P of x) r.add(P);
      return x;
    },
    y = uniq([
      ...e.filter((w) => !isPathTooDeep(w, 0)),
      ...uniq(e).flatMap((w) => {
        if (isPathTooDeep(w, 0)) return h(w, { spelling: w, verdict: "opaque" });
        let R = resolveForeignSpelling(aqt(w, n), n, protectedHomeRoots());
        if (R.verdict !== "local") return h(w, R);
        let x = resolveRealPathLoose(R.spelling, n);
        if (x === null) return h(w, { ...R, verdict: "opaque" });
        return (s.add(x), [x]);
      }),
    ]),
    filtered = [...r].filter((w) => !e.includes(w) && !s.has(w));
  if (filtered.length > 0) weakMap.set(y, new Set(filtered));
  return y;
}
//@ chunk-s61vbvea.js:264061-264080 placement
var weakMap = new WeakMap();
//@ chunk-s61vbvea.js:264080-264280 placement
function countRootAsEveryVolume(e, n, r) {
  return (
    logForDebugging(
      `[builderGit] reach root ${truncateWithCount(e, 256)} cannot be vouched for (${n.verdict}): counted as every volume`,
      { level: "warn" },
    ),
    spellingsToCheck(n.verdict === "foreign" ? { ...n, verdict: "opaque" } : n, r)
  );
}
//@ chunk-s61vbvea.js:264280-264331 placement
function HO(e, n) {
  return ui({ tree: e, roots: aS(e, n) });
}
//@ chunk-s61vbvea.js:264331-264395 placement
function aS(e, n) {
  return uniq([e, ...n, ...$O(e), ...getProtectedTempDirsWithPreSettings(), ...xyn(e)]);
}
//@ chunk-s61vbvea.js:264395-264471 placement
function $O(e) {
  let n = Za(e);
  return n.length === 0 ? [] : uniq([...n, homedir()].filter(isAbsolute_6));
}
//@ chunk-s61vbvea.js:264471-264531 placement
function Cvt(e) {
  return basename_2(e).toLowerCase() === ".git" ? dirname_2(e) : e;
}
/**
 * 工作树上方（家目录以下）的 git 仓库目录。
 */
//@ chunk-s61vbvea.js:264531-264651 placement
function findEnclosingRepos(e) {
  let n = resolveRealPathLoose(homedir(), e) ?? homedir(),
    r = (s) => {
      let h = dirname_2(s);
      return h === s || isPathInside_2(h, n) ? [] : [h, ...r(h)];
    };
  return r(e).filter(isGitRepoDir);
}
//@ chunk-s61vbvea.js:264651-264715 placement
function Hqr(e) {
  return Za(e).find((n) => isPathInside_2(n, e) && !isPathInside_2(e, n)) ?? null;
}
//@ chunk-s61vbvea.js:264715-264766 placement
function Za(e) {
  let n = homedir();
  return n === "" ? [] : listRepoAncestors(n, e);
}
//@ chunk-s61vbvea.js:264766-264804 placement
function Myn(e) {
  return Za(e)[0] ?? null;
}
/**
 * 路径相对家目录：home/above_home/elsewhere。
 */
//@ chunk-s61vbvea.js:264804-264947 placement
function classifyHomePosition(e, n) {
  let r = homedir();
  if (r === "") return "elsewhere";
  let s = resolveRealPathLoose(r, n) ?? r;
  return s === e || r === e
    ? "home"
    : isPathInside_2(e, s) || isPathInside_2(e, r)
      ? "above_home"
      : "elsewhere";
}
//@ chunk-s61vbvea.js:264947-265102 placement
function listRepoAncestors(e, n) {
  let r = resolveRealPathLoose(e, n) ?? e;
  return uniq([...(isAbsolute_6(r) ? kd(r) : []), ...(isAbsolute_6(e) ? kd(e) : [])])
    .filter(cS)
    .filter(isGitRepoDir)
    .sort((h, y) => h.split(sep_5).length - y.split(sep_5).length);
}
//@ chunk-s61vbvea.js:265102-265147 placement
function UO(e, n) {
  return listRepoAncestors(e, n).at(-1) ?? null;
}
//@ chunk-s61vbvea.js:265147-265220 placement
function kd(e, n = BO) {
  let r = dirname_2(e);
  return r === e || n === 0 ? [e] : [e, ...kd(r, n - 1)];
}
//@ chunk-s61vbvea.js:265220-265231 placement
var BO = e3o;
/**
 * 找到可达范围内可写的 git 检出，或返回无法担保的位置。
 */
//@ chunk-s61vbvea.js:265231-265550 placement
async function findHeldCheckout(e, n) {
  if (Eh(e) || !isAbsolute_6(e)) return null;
  let r = classifyReachRoot(e, n),
    sorted = uniq(r.nodes)
      .filter((y) => !r.links.has(y) && !r.cutAt.has(y) && cS(y))
      .filter(isGitRepoDir)
      .sort((y, S) => S.split(sep_5).length - y.split(sep_5).length);
  for (let y of sorted) if (await isCheckoutHeld(r, y)) return { kind: "held", checkout: y };
  let [h] = r.cutAt;
  return h === void 0 ? null : { kind: "unvouched", at: h };
}
//@ chunk-s61vbvea.js:265550-265760 placement
async function isCheckoutHeld(e, n) {
  let filtered = uniq(e.nodes).filter((y) => isPathInside_2(n, y));
  if (filtered.some((y) => e.cutAt.has(y))) return !0;
  let filtered_2 = filtered.filter((y) => !e.links.has(y)),
    results = await Promise.all(filtered_2.map(isWritableOrOwned));
  return filtered_2.length === 0 || results.some((y) => y === !0);
}
//@ chunk-s61vbvea.js:265760-266322 placement
function classifyReachRoot(e, n) {
  let r = new Set(),
    s = new Set(),
    h = 0,
    y = (w, R) => {
      let { root: root } = parse_2(w),
        filtered = w
          .slice(root.length)
          .split(sep_5 === "/" ? /\/+/ : /[\\/]+/)
          .filter((j) => j !== "");
      return [root, ...S(root, [...filtered, ...R])];
    },
    S = (w, R) => {
      let [x, ...P] = R;
      if (x === void 0) return [];
      let j = join_7(w, x),
        G = lstatLinkKind(j);
      if (G === "missing") return [j, ...P.map((q, Q) => join_7(j, ...P.slice(0, Q + 1)))];
      if (G === "opaque") return (s.add(j), [j]);
      if (G.link === null) return [j, ...S(j, P)];
      r.add(j);
      let L =
        ++h > mS
          ? null
          : resolveForeignSpelling(classifyPathSpellingSync(G.link, w, n), n, protectedHomeRoots());
      if (L === null || L.verdict !== "local") return (s.add(j), [j]);
      return [j, ...y(L.spelling, P)];
    };
  return { nodes: y(e, []), links: r, cutAt: s };
}
/**
 * 路径可写，或属当前用户（不存在返回 absent）。
 */
//@ chunk-s61vbvea.js:266322-266635 placement
async function isWritableOrOwned(e) {
  try {
    return (await access(e, constants_4.W_OK), !0);
  } catch (error) {
    let r = getErrnoCode(error);
    if (r === "ENOENT" || r === "ENOTDIR") return "absent";
    if (!(r === "EACCES" || r === "EPERM" || r === "EROFS")) return !0;
  }
  try {
    let n = process.getuid?.();
    return n === void 0 || (await lstat_2(e)).uid === n;
  } catch (error) {
    let r = getErrnoCode(error);
    return r === "ENOENT" || r === "ENOTDIR" ? "absent" : !0;
  }
}
//@ chunk-s61vbvea.js:266635-266671 placement
function cS(e) {
  return !isNetworkMountRoot(e) && !VO(e);
}
//@ chunk-s61vbvea.js:266671-266729 placement
function VO(e) {
  try {
    return statfsSync(e).type === YO;
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:266729-266740 placement
var YO = 391;
//@ chunk-s61vbvea.js:266740-266786 placement
function isGitRepoDir(e) {
  return pathMayExist(join_7(e, ".git")) || isCurrentDirectoryBareGitRepo(e);
}
//@ chunk-s61vbvea.js:266786-266953 placement = isCurrentDirectoryBareGitRepo (0.757)
function isCurrentDirectoryBareGitRepo(e) {
  return (
    basename_2(e).toLowerCase() !== ".git" &&
    (["HEAD", "objects", "refs"].every((n) => pathExistsSync(join_7(e, n))) ||
      (el(join_7(e, "worktrees"))?.isDirectory() === !0 && isGitdirFile(join_7(e, "config"))))
  );
}
//@ chunk-s61vbvea.js:266953-266990 placement
function pathExistsSync(e) {
  return el(e) !== void 0;
}
//@ chunk-s61vbvea.js:266990-267128 placement
function pathMayExist(e) {
  try {
    return lstatSync(e, { throwIfNoEntry: !1 }) !== void 0;
  } catch (error) {
    let r = getErrnoCode(error);
    return !(r === "ENOTDIR" || r === "ELOOP" || r === "ENAMETOOLONG");
  }
}
//@ chunk-s61vbvea.js:267128-267163 placement
var wy = 4096,
  QO = /^[ \t]*\[core\]/im;
//@ chunk-s61vbvea.js:267163-267380 placement
function isGitdirFile(e) {
  if (el(e)?.isFile() !== !0) return !1;
  try {
    let n = openSync(e, $c());
    try {
      let alloc = Buffer.alloc(wy),
        s = readSync(n, alloc, 0, wy, 0),
        replaced = alloc.toString("latin1", 0, s).replace(/^\xEF\xBB\xBF/, "");
      return QO.test(replaced);
    } finally {
      closeSync(n);
    }
  } catch {
    return !1;
  }
}
//@ chunk-s61vbvea.js:267380-267395 placement
var eI = 1048576;
//@ chunk-s61vbvea.js:274016-274082 placement
function el(e) {
  try {
    return lstatSync(e, { throwIfNoEntry: !1 });
  } catch {
    return;
  }
}
//@ chunk-s61vbvea.js:274082-274177 placement
function resolveRealPathLoose(e, n) {
  if (isPathTooDeep(e, 0)) return null;
  let [r, s] = splitAtPathMax(e),
    h = realpathWithMissingTail(r, n);
  return h === null ? null : join_7(h, s);
}
//@ chunk-s61vbvea.js:274177-274436 placement = getReservedShortcuts (0.806)
function splitAtPathMax(e) {
  let n = getPlatform_2() === "windows" ? null : getPlatform_2() === "macos" ? 1024 : 4096;
  if (n === null || Buffer.byteLength(e) < n) return [e, ""];
  let index = e.lastIndexOf(sep_5, n - 1);
  while (index > 0 && Buffer.byteLength(e.slice(0, index)) >= n) index = e.lastIndexOf(sep_5, index - 1);
  return index > 0 ? [e.slice(0, index), e.slice(index + 1)] : [e, ""];
}
//@ chunk-s61vbvea.js:274436-274715 placement
function realpathWithMissingTail(e, n, r = [], s = 0) {
  if (isPathTooDeep(e, r.length)) return null;
  try {
    return join_7(toUncLongPath(realpathSync.native(e)), ...r);
  } catch {
    let h = s < MAX_LINK_HOPS ? SI(e) : null;
    if (h !== null) {
      let { spelling: spelling, verdict: verdict } = classifyPathSpellingSync(h.text, h.dir, n);
      return verdict === "local" ? realpathWithMissingTail(spelling, n, r, s + 1) : null;
    }
    let y = dirname_2(e);
    return y === e ? join_7(e, ...r) : realpathWithMissingTail(y, n, [basename_2(e), ...r], s);
  }
}
//@ chunk-s61vbvea.js:274715-274803 placement
function resolvePathSpellings(e, n) {
  let r = resolveRealPathLoose(e, n);
  return r === null ? spellingsToCheck({ spelling: e, verdict: "opaque" }, n) : [r];
}
//@ chunk-s61vbvea.js:274803-274877 placement
var MAX_LINK_HOPS = 8,
  GIT_NOT_FOUND_MESSAGE = "git was not found on the PATH this process was started with";
//@ chunk-s61vbvea.js:274877-275039 placement
function homeInCheckoutNote(e) {
  let n = Myn(e);
  return n === null
    ? ""
    : `; the home directory counts here because it ${classifyHomePosition(n, e) === "home" ? "is itself" : "lies inside"} a git checkout (${n})`;
}
//@ chunk-s61vbvea.js:275039-275590 placement
var SANDBOX_REACH_TEXTS = `${GIT_NOT_FOUND_MESSAGE} (directories a cloud session bound here can write \u2014 inside this checkout or a checkout enclosing it, such as a worktree\u2019s main checkout; below your home directory when it is, or lies inside, a git checkout; a session temp directory; one whose git links into those \u2014 and directories that name or lead to another host are not searched)`,
  LVo =
    "If one of the directories that a cloud session can write cannot be examined, or is too deep or too long to resolve, every directory is left out; the debug log names the one to fix.";
//@ chunk-s61vbvea.js:275590-275638 placement
function Lyn(e, n, r = n) {
  return isOnForeignMount(e, r) || rawPointerPathIsUnsafe(e, n, r);
}
//@ chunk-s61vbvea.js:275638-275733 placement
function SI(e) {
  try {
    let n = readlinkSync(e),
      r = isAbsolute_6(n) ? dirname_2(e) : realpathSync(dirname_2(e));
    return { text: n, dir: r };
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:275733-275859 placement
function filterSafePathEnv(e, n, r) {
  let s = makeReachPredicate(n),
    h = new Map();
  return e
    .split(delimiter)
    .map((y) => stripPathQuotes(y))
    .filter((y) => y !== "" && isAbsolute_6(y) && isPathDirSafe(y, s, r, h))
    .join(delimiter);
}
/**
 * PATH 中的目录及其中的 git 等程序都在可达范围之外。
 */
//@ chunk-s61vbvea.js:275859-276200 placement
function isPathDirSafe(e, n, r, s = new Map()) {
  if (isReachableOrUnsafe(e, n, s)) return !1;
  let h = resolveRealPathLoose(e, n.anchor);
  if (h === null) return !1;
  return r.every((y) => {
    let S = `${e}${sep_5}${y}`;
    if (isForeignSpelling(S, n.anchor)) return !1;
    let w = s.get(S) ?? lstatLinkKind(S);
    if ((s.set(S, w), w === "missing")) return !n(S) && !n(join_7(h, y));
    if (w !== "opaque" && w.link === null) {
      let R = resolveRealPathLoose(S, n.anchor);
      return R !== null && !n(S) && !n(R);
    }
    return !isReachableOrUnsafe(S, n, s);
  });
}
//@ chunk-s61vbvea.js:276200-276325 placement
function makeReachPredicate(e) {
  return Object.assign((n) => e.some((r) => isPathInside_2(r, n)), {
    beneath: (n) => e.some((r) => isPathInside_2(n, r) && !isPathInside_2(r, n)),
    anchor: e[0] ?? sep_5,
  });
}
/**
 * 判断路径能否被沙箱写到：非绝对、设备路径或在可达范围内（含其上层）直接返回 true；否则逐级 lstat， 遇到不存在的组件按真实路径与剩余部分判断，遇到链接递归解析（限深度），无法判断的视为可达。
 */
//@ chunk-s61vbvea.js:276325-277031 placement
function isReachableOrUnsafe(e, n, r, s = mS) {
  if (
    !isAbsolute_6(e) ||
    isWindowsNonDrivePath(e) ||
    e.startsWith("\\\\?\\") ||
    isForeignSpelling(e, n.anchor) ||
    n(e) ||
    n.beneath(e)
  )
    return !0;
  let { root: root } = parse_2(e),
    filtered = e
      .slice(root.length)
      .split(sep_5 === "/" ? /\/+/ : /[\\/]+/)
      .filter((R) => R !== "" && R !== "."),
    S = root;
  for (let [R, x] of filtered.entries()) {
    S = x === ".." ? dirname_2(S) : join_7(S, x);
    let P = r.get(S);
    if (P === void 0 && (n(S) || isForeignSpelling(S, n.anchor))) return !0;
    let j = P ?? lstatLinkKind(S);
    if ((r.set(S, j), j === "opaque")) return !0;
    if (j === "missing") {
      let G = resolveRealPathLoose(e, n.anchor);
      return (
        G === null ||
        n(G) ||
        n.beneath(G) ||
        filtered.slice(R + 1).some((L, q) => n(join_7(S, ...filtered.slice(R + 1, R + 2 + q))))
      );
    }
    if (j.link !== null) {
      if (s === 0) return !0;
      let G = isAbsolute_6(j.link) ? j.link : `${dirname_2(S)}${sep_5}${j.link}`;
      return isReachableOrUnsafe([G, ...filtered.slice(R + 1)].join(sep_5), n, r, s - 1);
    }
  }
  let w = resolveRealPathLoose(e, n.anchor);
  return w === null || n(w) || n.beneath(w);
}
//@ chunk-s61vbvea.js:277031-277041 placement
var mS = 40;
//@ chunk-s61vbvea.js:277041-277278 placement
function lstatLinkKind(e) {
  try {
    let n = lstatSync(e, { throwIfNoEntry: !1 });
    if (n === void 0) return "missing";
    if (!n.isSymbolicLink()) return { link: null };
    let r = readlinkSync(e);
    return { link: toUncLongPath(r.replace(/^\\\?\?\\/, "\\\\?\\")) };
  } catch (error) {
    return getErrnoCode(error) === "ENOTDIR" ? "missing" : "opaque";
  }
}

export {
  collectBaseReachRoots,
  collectSettingsWriteRoots,
  dSe,
  DVo,
  Myn,
  Cvt,
  Lqr,
  Hqr,
  findEnclosingRepos,
  classifyHomePosition,
  Lyn,
  LVo,
  xyn,
  collectRepoSettingsReachRoots,
  resolveReachRoots,
  mergeReachRoots,
  makeReachPredicate,
  isReachableOrUnsafe,
  el,
  filterSafePathEnv,
  reachForWorkTree,
  GIT_NOT_FOUND_MESSAGE,
  SANDBOX_REACH_TEXTS,
  homeInCheckoutNote,
  HO,
  UO,
  Za,
  resolvePathSpellings,
  resolveRealPathLoose,
  findHeldCheckout,
  eI,
  isPathDirSafe,
};
