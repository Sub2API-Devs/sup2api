/**
 * services/remoteTools/mountSafety.ts
 *
 * 2.1.316 新增。远程工具服务的挂载安全分类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e2fknt7w.js (18)
 * attribution: placement 17, affinity 1
 */
import { homedir, homedir as homedir_2 } from "os";
import { posix } from "path";
import { statSync } from "fs";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getProjectDirsUpToHome } from "../../utils/secureStorage/macOsKeychainHelpers.js";
import { isAbsolutePlatformPath, normalizeCommandForPlatform } from "../../utils/git.js";
import { servingBasesFor, b } from "./servingGates.js";
import { getWslWindowsUserDirs } from "../../utils/tmuxSocket.js";
import { withPathAliases, getClaudeConfigDirs } from "../../utils/permissions/claudeStatePaths.js";
import { getPlatform } from "../../utils/platform.js";
import { uniq } from "../../utils/collections.js";
import {
  classifyUncPath,
  uncAdminShareToDrive,
  Q8o,
  M2,
  J8o,
  Ali,
} from "../../utils/hooks/hookCommandAnalysis.js";
import {
  pathWithMountAliases,
  isOnSameWslMount,
  car,
  driveMountsForPath,
  otherWindowsMountsForPath,
  driveMountsUnder,
  otherWindowsMountsUnder,
  getOtherWindowsMountLines,
} from "../../utils/wslMounts.js";
import { windowsPowerShellProfileDirs, windowsAutoRunDirs } from "./windowsProfileDirs.js";
import { isUnderSensitiveProfileDir, isAncestorOfSensitiveProfileDir } from "../../utils/wslPaths.js";
import { Ruo, WINDOWS_PROFILE_FOLDER_NAMES, XEr } from "../../utils/windowsProfileFolders.js";
import { Cp } from "../../utils/pathIdentity.js";
import { ge } from "../../utils/identity.js";
import { getErrnoCode } from "../../utils/errors.js";

//@ chunk-e2fknt7w.js:18342-19169 placement
function classifyMountForServing(e, n) {
  let o = homedir(),
    r = getClaudeConfigDir(),
    s = getProjectDirsUpToHome();
  if (!isAbsolutePlatformPath(o) || !isAbsolutePlatformPath(r) || !isAbsolutePlatformPath(s)) return !0;
  let u = servingBasesFor(e);
  if (u === "refused_outright") return !0;
  if (touchesWindowsRootFromWsl(u, n) || mountsUnderLaunch(u, n)) return !0;
  let d = getWslWindowsUserDirs(u),
    a = b(o),
    m = [o, a],
    w = [...m, ...d],
    E = filterWslMountedPaths(m),
    Z = withPathAliases(getClaudeConfigDirs()),
    Q = getPlatform() === "windows" ? Z.map((p) => b(p)) : [],
    C = uniq([...Z, ...Q]);
  if (
    getPlatform() === "windows" &&
    ([...w, ...C].some((p) => {
      let R = classifyUncPath(normalizeCommandForPlatform(p));
      return R === "own_host" || R === "wsl_host";
    }) ||
      [a, ...Q].some((p) => classifyUncPath(normalizeCommandForPlatform(p)) === "short_name"))
  )
    return !0;
  let mapped = m.map((p) => normalizeCommandForPlatform(p)),
    T = uniq(u.flatMap(pathWithMountAliases));
  return (
    [...w, ...C.flatMap(pathWithMountAliases)].some((p) => u.some((R) => isSameOrUnder(p, R))) ||
    T.some((p) => C.some((R) => isSameOrUnder(p, R))) ||
    T.some(
      (p) =>
        [p, uncAdminShareToDrive(p)].some((R) => isUnderAny(R, m, E)) ||
        mapped.some((R) => isUnderAny(Q8o(normalizeCommandForPlatform(p), R), [R])),
    ) ||
    profileMountPointsUnder(m, n).some((p) =>
      T.some((R) => isOnSameWslMount(R, p) || isOnSameWslMount(p, R)),
    ) ||
    windowsRootMountPoints(n).some(({ mountPoint: mountPoint, place: place }) =>
      T.some(
        (J) =>
          isOnSameWslMount(mountPoint, J) || car(J, mountPoint).some((ke) => De(posix.join(place, ...ke))),
      ),
    ) ||
    yn([...windowsPowerShellProfileDirs(), ...windowsAutoRunDirs()], u)
  );
}
//@ chunk-e2fknt7w.js:19169-19284 placement = execTmux (0.805)
function filterWslMountedPaths(e) {
  return getPlatform() === "wsl"
    ? e.filter((n) => {
        let normalized = posix.normalize(n);
        return driveMountsForPath(normalized).length > 0 || otherWindowsMountsForPath(normalized).length > 0;
      })
    : [];
}
//@ chunk-e2fknt7w.js:19284-19486 placement
function profileMountPointsUnder(bases, scope) {
  let o = filterWslMountedPaths(bases);
  return uniq([
    ...bases.flatMap((r) => pathWithMountAliases(r).slice(1)).filter((r) => isUnderAny(r, bases, o)),
    ...pathWithMountAliases("/")
      .slice(1)
      .filter((r) =>
        windowsProfileRoots(r, scope).some(
          (s) => posix.normalize(s) !== "/" && isUnderSensitiveProfileDir(s, ["/"], "windows_on_wsl"),
        ),
      ),
  ]);
}
//@ chunk-e2fknt7w.js:19486-19634 placement
function windowsRootMountPoints(e) {
  return pathWithMountAliases("/")
    .slice(1)
    .flatMap((n) =>
      windowsProfileRoots(n, e)
        .filter((o) => o === "/" || isAncestorOfSensitiveProfileDir(o, ["/"], "windows_on_wsl"))
        .map((o) => ({ mountPoint: n, place: o })),
    );
}
//@ chunk-e2fknt7w.js:19634-19737 placement
function isUnderAny(e, n, o = []) {
  return (
    isUnderSensitiveProfileDir(e, n) ||
    (getPlatform() === "windows" && isAncestorOfSensitiveProfileDir(e, n)) ||
    (o.length > 0 && isUnderSensitiveProfileDir(e, o, "windows_on_wsl"))
  );
}
//@ chunk-e2fknt7w.js:19737-19844 placement
function isSameOrUnder(e, n) {
  let o = normalizeCommandForPlatform(n),
    r = Q8o(normalizeCommandForPlatform(e), o);
  return M2(r, o) || (getPlatform() === "windows" && (J8o(r, o) || Ali(r, o))) || isOnSameWslMount(e, n);
}
//@ chunk-e2fknt7w.js:19844-20000 placement
function isRemoteUncHost(e) {
  switch (classifyUncPath(e)) {
    case void 0:
    case "webdav_host":
      return !1;
    case "numeric_host":
      return !IPV4_PATTERN.test(/^\\\\([^\\@]+)/.exec(e)?.[1] ?? "");
    default:
      return !0;
  }
}
//@ chunk-e2fknt7w.js:20000-20091 placement
var IPV4_PATTERN = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d?)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
//@ chunk-e2fknt7w.js:20376-20453 affinity = execTmux (1)
function touchesWindowsRootFromWsl(args, opts) {
  if (getPlatform() !== "wsl") return !1;
  return args.some((o) => windowsProfileRoots(o, opts).some(De));
}
//@ chunk-e2fknt7w.js:20453-20545 placement
function De(e) {
  return (
    e === "/" ||
    isUnderSensitiveProfileDir(e, ["/"], "windows_on_wsl") ||
    isAncestorOfSensitiveProfileDir(e, ["/"], "windows_on_wsl")
  );
}
//@ chunk-e2fknt7w.js:20545-20727 placement
function windowsProfileRoots(e, n) {
  let normalized = posix.normalize(e);
  return (
    n === "all"
      ? [...driveMountsForPath(normalized), ...otherWindowsMountsForPath(normalized)]
      : driveMountsForPath(normalized)
  ).flatMap((s) =>
    Ruo(s.beneath).flatMap((u) =>
      u.length >= 2 && WINDOWS_PROFILE_FOLDER_NAMES(u[0]) ? [`/${u.slice(2).join("/")}`] : [],
    ),
  );
}
//@ chunk-e2fknt7w.js:20727-21443 placement
function mountsUnderLaunch(e, n) {
  if (getPlatform() !== "wsl") return !1;
  return e.some((o) => {
    let normalized = posix.normalize(o),
      s = driveMountsForPath(normalized),
      u =
        n === "all"
          ? otherWindowsMountsForPath(normalized).filter(
              (d) =>
                !s.some((a) => a.within === "" && a.mountPoint === d.mountPoint && a.beneath === d.beneath),
            )
          : [];
    return (
      On.has(Cp(normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized)) ||
      [...s, ...u].some((d) => {
        let a = XEr(d.beneath);
        return a.length === 1 && WINDOWS_PROFILE_FOLDER_NAMES(a[0]);
      }) ||
      driveMountsUnder(normalized).some((d) => Ee(d.within)) ||
      (n === "all" && otherWindowsMountsUnder(normalized).some((d) => Ee(d.within))) ||
      driveMountsUnder(normalized).some((d) => B(d.within) && hasWindowsUserProfileDirs(d.mountPoint)) ||
      s.some((d) => B(d.beneath) && hasWindowsUserProfileDirs(d.mountPoint)) ||
      u.some((d) => {
        if (!B(d.beneath)) return !1;
        let a = getOtherWindowsMountLines(d.mountPoint);
        if (a === void 0) return hasWindowsUserProfileDirs(d.mountPoint);
        let m = `${d.mountPoint}
${a}`,
          w = Pe.get(m);
        if (w !== void 0) return w;
        let E = hasWindowsUserProfileDirs(d.mountPoint);
        return (Pe.set(m, E), E);
      })
    );
  });
}
//@ chunk-e2fknt7w.js:21443-21482 placement
function B(e) {
  return XEr(e).length === 0;
}
//@ chunk-e2fknt7w.js:21482-21539 placement
function Ee(e) {
  let n = XEr(e);
  return n.length > 0 && WINDOWS_PROFILE_FOLDER_NAMES(n[0]);
}
//@ chunk-e2fknt7w.js:21539-21598 placement
var Pe = ge(new Map(), (e) => e.clear()),
  On = new Set(["/", "/mnt"]);
//@ chunk-e2fknt7w.js:21598-21732 placement = isRealPathWithinTeamDir (1)
function hasWindowsUserProfileDirs(realCandidate) {
  return WINDOWS_PROFILE_ROOT_NAMES.some((n) => {
    try {
      return statSync(`${realCandidate}/${n}`).isDirectory();
    } catch (error) {
      let code = getErrnoCode(error);
      return code !== "ENOENT" && code !== "ENOTDIR";
    }
  });
}
//@ chunk-e2fknt7w.js:21732-21804 placement
var WINDOWS_PROFILE_ROOT_NAMES = ["Users", "Documents and Settings", "Dokumente und Einstellungen"];
//@ chunk-e2fknt7w.js:21804-21869 placement
function yn(e, n) {
  return e.some((o) => n.some((r) => isSameOrUnder(r, o) || isSameOrUnder(o, r)));
}

export { classifyMountForServing, isRemoteUncHost, profileMountPointsUnder, windowsRootMountPoints };
