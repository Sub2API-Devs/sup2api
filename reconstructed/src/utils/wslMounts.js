/**
 * utils/wslMounts.ts
 *
 * WSL 挂载表解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (47)
 * attribution: placement 47
 */
import { posix, posix as posix_2, posix as posix_3, posix as posix_4, posix as posix_5 } from "path";
import { firstLineOf } from "./stringUtils.js";
import { ge } from "./identity.js";
import { getPlatform } from "./platform.js";
import { uniq } from "./collections.js";
import { getFsImplementation } from "./fsOperations.js";
import {
  getErrnoCode,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import { logForDebugging } from "./debug.js";
import { Cp } from "./pathIdentity.js";
import { stripTrailingDotsSpaces } from "./ignorePatterns.js";
import { logError } from "./log.js";
import { profileRelativeRemainders } from "./windowsProfileFolders.js";

//@ chunk-82kqcve8.js:163867-164285 placement
var NETWORK_FS_TYPES = new Set(
    "drvfs 9p virtiofs cifs smb3 smbfs nfs nfs4 ntfs ntfs3 fuseblk vfat exfat msdos".split(" "),
  ),
  Xf = new Set(
    [
      "ext2 ext3 ext4 xfs btrfs zfs f2fs jfs reiserfs nilfs2 bcachefs tmpfs ramfs rootfs squashfs erofs",
      "proc sysfs devtmpfs devpts mqueue hugetlbfs cgroup cgroup2 pstore bpf debugfs tracefs securityfs",
      "configfs fusectl binfmt_misc nsfs rpc_pipefs efivarfs selinuxfs nfsd",
    ].flatMap((e) => e.split(" ")),
  );
/**
 * 挂载是否网络/FUSE/非本地文件系统，或来源为 Windows 盘符、UNC、URL、drvfs。
 */
//@ chunk-82kqcve8.js:164285-164519 placement
function isNetworkOrForeignMount(e) {
  let n = firstLineOf(e.fstype, "."),
    r = Mst(e.source ?? "");
  return (
    NETWORK_FS_TYPES.has(e.fstype) ||
    NETWORK_FS_TYPES.has(n) ||
    n === "fuse" ||
    !Xf.has(e.fstype) ||
    /^[A-Za-z]:/.test(r) ||
    /^(\\\\|\/\/)/.test(r) ||
    /^[^/\s]+:\//.test(r) ||
    /(^|,)aname=drvfs/.test(e.options ?? "")
  );
}
//@ chunk-82kqcve8.js:164519-164604 placement
function Aui(e, n) {
  return e === "drvfs" || (e === "9p" && /(^|,)aname=drvfs(?=[,;]|$)/.test(n));
}
//@ chunk-82kqcve8.js:164604-164696 placement
function Mst(e) {
  return e.replace(/\\([0-7]{3})/g, (n, r) => String.fromCharCode(parseInt(r, 8)));
}
//@ chunk-82kqcve8.js:164696-164762 placement
function q4t(e, n) {
  return e === n || e.startsWith(n === "/" ? "/" : `${n}/`);
}
//@ chunk-82kqcve8.js:164762-165686 placement
var UNREAD = "unread",
  SERVED_MOUNT_TABLE_UNREADABLE = "served-mount-table-unreadable",
  Zf = /^\/mnt\/([a-z])(?=\/|$)/i,
  $l = /^([a-z]):(?:[\\/](.*))?$/is,
  Jf = /^(?:[\\/]{2}[?.]|[\\/]\?\?)[\\/](?:(UNC[\\/])(?=[^\\/])|(?=[a-z]:))/i,
  Ll =
    /(?:^|[,;])aname=drvfsa?;(?:[^,;]*;)*path=(?:(?:[\\/]{2}[?.]|[\\/]\?\?)[\\/])?([a-z]):([^,;]*)(?=[,;]|$)/i,
  Qf = new Set(["drvfs", "cifs", "smb3", "smbfs", "ntfs", "ntfs3", "fuseblk", "vfat", "exfat"]),
  Nl = /(?:^|[,;])aname=drvfsa?(?=[,;]|$)/i,
  eg = /^(?:\\\\|\/\/)[^\\/]/,
  tg = /^(?:\\\\|\/\/|UNC\\)[^\\/]+[\\/]+[a-z]\$(?:[\\/](.*))?$/is,
  Wl = /^(?:\\\\|\/\/|UNC\\)([^\\/]+)[\\/]+([^\\/]+)(?:[\\/](.*))?$/is,
  ng = /(?:^|,)prefixpath=([^,]*)/,
  og = /(?:^|[,;])aname=drvfsa?;(?:[^,;]*;)*path=((?:\\\\|\/\/|UNC\\|[\\/]\?\?[\\/])[^,;]*)(?=[,;]|$)/i,
  sg =
    /^\d+ \d+ \d+:\d+ ([^ ]+) ([^ ]+) (r[ow])(?:,[^ ]*)?(?: [^ ]+)*? - ([^ ]+) ([^ ]*) ((r[ow])(?:,.*)?)$/s,
  lg = 2000,
  ze = ge({ read: void 0, readAt: 0, lastListed: void 0 }, (e) => {
    ((e.read = void 0), (e.readAt = 0), (e.lastListed = void 0));
  });
//@ chunk-82kqcve8.js:165686-165782 placement
function Dst() {
  if (getPlatform() !== "wsl") return [];
  let e = readWslMountsCached();
  return e === "unreadable" ? [] : e.secondRootMounts;
}
//@ chunk-82kqcve8.js:165782-165808 placement
var cg = "/mnt/wslg/distro";
//@ chunk-82kqcve8.js:165808-165921 placement
function rootAliasMountPoints() {
  let mapped = Dst().map((n) => n.mountPoint);
  return (isWslMountInfoUnreadable() ? uniq([...mapped, cg]) : mapped).toSorted(
    (n, r) => r.length - n.length,
  );
}
//@ chunk-82kqcve8.js:165921-166051 placement
function pathBelowRootAlias(e) {
  let n = rootAliasMountPoints();
  if (n.length === 0) return;
  let normalized = posix_3.normalize(e),
    found = n.find((h) => q4t(normalized, h));
  return found && (normalized.slice(found.length) || "/");
}
/**
 * WSL 挂载信息不可读或含格式错误的行。
 */
//@ chunk-82kqcve8.js:166051-166157 placement
function isWslMountInfoUnreadable() {
  if (getPlatform() !== "wsl") return !1;
  let e = readWslMountsCached();
  return e === "unreadable" || e.malformedLineNumber !== void 0;
}
/**
 * 解析 mountinfo：盘符挂载、其他 Windows 挂载及其原始行、Windows 卷与首个异常行。
 */
//@ chunk-82kqcve8.js:166157-166966 placement
function parseMountInfo(e) {
  let parts = e.split(`
`),
    mapped = parts.map(parseMountInfoLine),
    malformedIndex = mapped.findIndex((S, R) => parts[R] !== "" && (S === void 0 || isMalformed9pMount(S))),
    mapped_2 = mapped.map((S) => (S === void 0 ? Qo : classifyWindowsMount(S))),
    linesByMountPoint = mapped_2
      .flatMap((S, R) =>
        S.otherWindowsMounts.map((otherWindowsMount) => [otherWindowsMount.mountPoint, parts[R]]),
      )
      .reduce((S, [R, O]) => {
        let P = S.get(R);
        if (P === void 0) S.set(R, [O]);
        else P.push(O);
        return S;
      }, new Map());
  return {
    driveMounts: dedupeDriveMounts(mapped_2.flatMap((S) => S.drives)).toSorted(
      (S, R) => R.mountPoint.length - S.mountPoint.length,
    ),
    otherWindowsMounts: [
      ...new Map(
        mapped_2.flatMap((S) => S.otherWindowsMounts).map((S) => [`${S.mountPoint}\x00${S.within}`, S]),
      ).values(),
    ].toSorted((S, R) => R.mountPoint.length - S.mountPoint.length),
    otherWindowsVolumes: mapped_2.flatMap((S) => S.otherWindowsVolumes),
    otherWindowsMountLines: new Map(
      [...linesByMountPoint].map(([S, R]) => [
        S,
        R.join(`
`),
      ]),
    ),
    secondRootMountCandidates: sameFsTypeMounts(mapped.filter((S) => S !== void 0)),
    malformedLineNumber: malformedIndex === -1 ? void 0 : malformedIndex + 1,
  };
}
//@ chunk-82kqcve8.js:166966-167256 placement
function sameFsTypeMounts(e) {
  let n = new Set(e.filter((h) => h.mountPoint === "/").map((h) => h.fstype));
  return [
    ...e
      .filter((h) => n.has(h.fstype) && h.mountPoint !== "/" && posix_3.isAbsolute(h.mountPoint))
      .reduce(
        (h, { mountPoint: mountPoint, readOnly: readOnly }) =>
          h.set(mountPoint, readOnly && (h.get(mountPoint) ?? !0)),
        new Map(),
      ),
  ].map(([h, y]) => ({ mountPoint: h, readOnly: y }));
}
/**
 * 只保留与 / 同 dev/inode 的挂载点（看不到时当作第二根盘）。
 */
//@ chunk-82kqcve8.js:167256-167583 placement
function filterSameInodeAsRoot(e) {
  if (e.length === 0) return [];
  let n = getFsImplementation(),
    stats = n.statSync("/");
  return e.filter(({ mountPoint: mountPoint }) => {
    try {
      let stats_2 = n.statSync(mountPoint);
      return stats.dev === stats_2.dev && stats.ino === stats_2.ino;
    } catch (error) {
      let y = getErrnoCode(error);
      if (y === "ENOENT" || y === "ENOTDIR") return !1;
      return (
        logForDebugging(
          `[wsl] Could not look at ${mountPoint} (${y ?? errorMessage(error)}): taken for a second mount of the root disk`,
        ),
        !0
      );
    }
  });
}
//@ chunk-82kqcve8.js:167583-167804 placement
function parseMountInfoLine(e) {
  let match = sg.exec(e);
  if (match === null) return;
  let [, r, s, h, y, w, S, R] = match;
  return {
    root: Mst(r).replace(/\/\/deleted$/, ""),
    mountPoint: _g(posix_3.normalize(Mst(s))),
    readOnly: h === "ro" || R === "ro",
    fstype: y,
    source: jl(Mst(w)),
    options: S,
  };
}
//@ chunk-82kqcve8.js:167804-167990 placement
function isMalformed9pMount({ fstype: fstype, source: source, options: options }) {
  return (
    fstype === "9p" &&
    (options.split(",trans=").length !== 2 ||
      options.split(/aname=/i).length > 2 ||
      options.split(/path=/i).length > 2 ||
      ($l.test(source) && Nl.test(options) && !Ll.test(options)))
  );
}
//@ chunk-82kqcve8.js:167990-168054 placement
var Qo = { drives: [], otherWindowsMounts: [], otherWindowsVolumes: [] };
/**
 * 把一个挂载分类为盘符挂载、其他 Windows 挂载与 Windows 卷。
 */
//@ chunk-82kqcve8.js:168054-168910 placement
function classifyWindowsMount({
  root: root,
  mountPoint: mountPoint,
  fstype: fstype,
  source: source,
  options: options,
}) {
  if (!posix_3.isAbsolute(mountPoint)) return Qo;
  let y = ut(root),
    match = $l.exec(source),
    match_2 = Ll.exec(options);
  if ((match ?? match_2) === null) {
    if (!bg(fstype, source, options)) return Qo;
    let optionVariants = /\\[0-7]{3}/.test(options) ? [options, Mst(options)] : [options],
      sourcePaths = uniq(
        optionVariants.flatMap((G) => {
          let Z = jl(og.exec(G)?.[1] ?? source),
            ae = ng.exec(G)?.[1];
          return ae === void 0 || ae === "" ? [Z] : [Z, `${Z}/${ae}`];
        }),
      );
    return {
      drives: [],
      otherWindowsMounts: sourcePaths
        .flatMap((G) => windowsMountSubpaths(G, y))
        .map((G) => ({ mountPoint: mountPoint, within: G })),
      otherWindowsVolumes: sourcePaths
        .flatMap((G) => windowsVolumeCandidates(G, y))
        .map((G) => ({ mountPoint: mountPoint, ...G })),
    };
  }
  let O = match_2?.[2] ?? "";
  return {
    drives: [
      ...(match === null ? [] : [[match[1], match[2] ?? ""]]),
      ...(match_2 === null ? [] : [[match_2[1], O]]),
      ...(match === null && match_2 !== null && /\\[0-7]{3}/.test(O) ? [[match_2[1], Mst(O)]] : []),
    ].flatMap(([L, j]) => {
      let G = ut(j);
      return uniq(ti(y, G).flatMap((Z) => [Z.join("/"), ...pathSpellings(Z)])).map((Z) => ({
        mountPoint: mountPoint,
        letter: L.toLowerCase(),
        within: Z,
      }));
    }),
    otherWindowsMounts: [],
    otherWindowsVolumes: [],
  };
}
//@ chunk-82kqcve8.js:168910-169009 placement
function Bl(e, n) {
  return n.length > 0 && n.every((r, s) => Cp(r) === Cp(e[s] ?? "")) ? [e, e.slice(n.length)] : [e];
}
//@ chunk-82kqcve8.js:169009-169063 placement
function ti(e, n) {
  return Bl(e, n).map((r) => [...n, ...r]);
}
//@ chunk-82kqcve8.js:169063-169169 placement
function windowsMountSubpaths(e, n) {
  let r = ut(Wl.exec(e)?.[3] ?? "");
  return [...(tg.test(e) ? ti(n, r) : []), ...Bl(n, r), []].flatMap(pathSpellings);
}
/**
 * 由 9p 来源推出 Windows 卷（UNC、盘符或未读）。
 */
//@ chunk-82kqcve8.js:169169-169528 placement
function windowsVolumeCandidates(e, n) {
  let [, r, s, h] = Wl.exec(e) ?? [],
    y = /^([a-z])\$$/i.exec(s ?? "")?.[1]?.toLowerCase(),
    w =
      r === void 0 || s === void 0
        ? [{ volume: e.startsWith("/dev/") ? e : UNREAD }]
        : [{ volume: `//${Cp(r)}/${Cp(s)}` }, ...(y === void 0 ? [] : [{ volume: ni(y), letter: y }])];
  return uniq(
    [...ti(n, ut(h ?? "")), ...(w.some(({ volume: volume }) => volume === UNREAD) ? [[]] : [])].flatMap(
      pathSpellings,
    ),
  ).flatMap((S) => w.map((R) => ({ ...R, within: S })));
}
//@ chunk-82kqcve8.js:169528-169590 placement
function jl(e) {
  return e.replace(Jf, (n, r) => (r === void 0 ? "" : "//"));
}
//@ chunk-82kqcve8.js:169590-169638 placement
function ni(e) {
  return `drive:${e.toLowerCase()}`;
}
//@ chunk-82kqcve8.js:169638-169772 placement
function pathSpellings(e) {
  let filtered = e.map((r) => stripTrailingDotsSpaces(firstLineOf(r, ":"))).filter((r) => r !== "");
  return uniq([e, filtered].map((r) => posix_3.normalize(`/${r.join("/")}`).slice(1)));
}
//@ chunk-82kqcve8.js:169772-169858 placement
function bg(e, n, r) {
  return Qf.has(e) || e.startsWith("fuseblk.") || Nl.test(r) || eg.test(n);
}
/**
 * 路径所在的 Windows 盘符挂载（含 /mnt/<盘符> 形式）。
 */
//@ chunk-82kqcve8.js:169858-170094 placement
function driveMountsForPath(e) {
  if (getPlatform() !== "wsl") return [];
  let match = Zf.exec(e),
    r = Cp(e),
    s = ut(e),
    h = [
      ...Ul().filter((y) => ii(y.mountPoint, r)),
      ...(match === null ? [] : [{ mountPoint: match[0], letter: match[1].toLowerCase(), within: "" }]),
    ];
  return dedupeDriveMounts(h).map((y) => ({ ...y, beneath: ai(y, s) }));
}
/**
 * 某目录之下的盘符挂载。
 */
//@ chunk-82kqcve8.js:170094-170247 placement
function driveMountsUnder(e) {
  if (getPlatform() !== "wsl" || e === "") return [];
  let n = Cp(e === "/" ? "/" : `${e.replace(/\/+$/, "")}/`);
  return Ul().filter((r) => Cp(r.mountPoint).startsWith(n));
}
/**
 * 路径所在的其他 Windows 挂载。
 */
//@ chunk-82kqcve8.js:170247-170461 placement
function otherWindowsMountsForPath(e) {
  if (getPlatform() !== "wsl") return [];
  let n = readWslMountsCached();
  if (n === "unreadable") return [];
  let r = Cp(e),
    s = ut(e);
  return n.otherWindowsMounts
    .filter((otherWindowsMount) => ii(otherWindowsMount.mountPoint, r))
    .map((h) => ({ mountPoint: h.mountPoint, beneath: ai(h, s) }));
}
/**
 * 路径对应的全部 Windows 卷（盘符、挂载、9p 卷）及其下相对路径。
 */
//@ chunk-82kqcve8.js:170461-170836 placement
function windowsVolumesForPath(e) {
  if (getPlatform() !== "wsl") return [];
  let n = readWslMountsCached(),
    r = Cp(e),
    s = ut(e);
  return [
    ...driveMountsForPath(e).flatMap((h) => [
      { volume: ni(h.letter), beneath: h.beneath },
      { volume: Fl(h.mountPoint), beneath: h.beneath },
    ]),
    ...otherWindowsMountsForPath(e).map((h) => ({ volume: Fl(h.mountPoint), beneath: h.beneath })),
    ...(n === "unreadable" ? [] : n.otherWindowsVolumes)
      .filter((h) => ii(h.mountPoint, r))
      .map((h) => ({ volume: h.volume, beneath: ai(h, s) })),
  ];
}
//@ chunk-82kqcve8.js:170836-171387 placement
function listWslDrvfsMounts(e, n) {
  let r = getPlatform() === "wsl" ? readWslMountsCached() : "unreadable";
  if (r === "unreadable") return !1;
  let s = new Set(windowsVolumesForPath(e).map((y) => y.volume)),
    flattened = [
      ...r.driveMounts.map(({ mountPoint: mountPoint, letter: letter }) => ({
        mountPoint: mountPoint,
        volume: ni(letter),
        letter: letter,
        namesDrive: !0,
      })),
      ...r.otherWindowsVolumes.map((otherWindowsVolume) => ({ ...otherWindowsVolume, namesDrive: !1 })),
    ].flatMap((y) =>
      y.letter === void 0 ? [y] : [y, { ...y, mountPoint: `/mnt/${y.letter}`, namesDrive: !0 }],
    );
  return [...s]
    .filter((y) => y !== UNREAD)
    .some((y) => {
      let filtered = flattened.filter((S) => S.volume === y);
      return (
        new Set(filtered.map((S) => Cp(S.mountPoint))).size > 1 &&
        (n === "all" || filtered.some((S) => !S.namesDrive))
      );
    });
}
/**
 * 路径涉及 Windows 卷且存在未读出卷名的挂载。
 */
//@ chunk-82kqcve8.js:171387-171527 placement
function touchesVolumeBesideUnreadMount(e) {
  let n = getPlatform() === "wsl" ? readWslMountsCached() : "unreadable";
  return (
    n !== "unreadable" &&
    n.otherWindowsVolumes.some((otherWindowsVolume) => otherWindowsVolume.volume === UNREAD) &&
    windowsVolumesForPath(e).length > 0
  );
}
//@ chunk-82kqcve8.js:171527-171562 placement
function Fl(e) {
  return `at:${Cp(e)}`;
}
//@ chunk-82kqcve8.js:171562-171599 placement
function ii(e, n) {
  return q4t(n, Cp(e));
}
//@ chunk-82kqcve8.js:171599-171686 placement
function ai(e, n) {
  return [...ut(e.within), ...n.slice(ut(e.mountPoint).length)].join("/");
}
/**
 * 某挂载点对应的原始 mountinfo 行。
 */
//@ chunk-82kqcve8.js:171686-171798 placement
function getOtherWindowsMountLines(e) {
  if (getPlatform() !== "wsl") return;
  let n = readWslMountsCached();
  return n === "unreadable" ? void 0 : n.otherWindowsMountLines.get(e);
}
/**
 * 某目录之下的其他 Windows 挂载。
 */
//@ chunk-82kqcve8.js:171798-172007 placement
function otherWindowsMountsUnder(e) {
  if (getPlatform() !== "wsl" || e === "") return [];
  let n = readWslMountsCached();
  if (n === "unreadable") return [];
  let r = Cp(e === "/" ? "/" : `${e.replace(/\/+$/, "")}/`);
  return n.otherWindowsMounts.filter((otherWindowsMount) => Cp(otherWindowsMount.mountPoint).startsWith(r));
}
//@ chunk-82kqcve8.js:172007-172097 placement
function Ul() {
  if (getPlatform() !== "wsl") return [];
  let e = readWslMountsCached();
  return e === "unreadable" ? [] : e.driveMounts;
}
//@ chunk-82kqcve8.js:172097-172257 placement
function readWslMountsCached() {
  if (ze.read === void 0 || Date.now() - ze.readAt > lg) {
    let e = parseWslMountInfo();
    ((ze.read = e === "unreadable" && ze.read !== void 0 ? ze.read : e), (ze.readAt = Date.now()));
  }
  return ze.read;
}
//@ chunk-82kqcve8.js:172257-174058 placement
function parseWslMountInfo() {
  try {
    let {
      driveMounts: driveMounts,
      otherWindowsMounts: otherWindowsMounts,
      otherWindowsVolumes: otherWindowsVolumes,
      otherWindowsMountLines: otherWindowsMountLines,
      secondRootMountCandidates: secondRootMountCandidates,
      malformedLineNumber: malformedLineNumber,
    } = parseMountInfo(getFsImplementation().readFileSync("/proc/self/mountinfo", { encoding: "utf8" }));
    if (
      malformedLineNumber !== void 0 &&
      (typeof ze.read !== "object" || ze.read.malformedLineNumber !== malformedLineNumber)
    )
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[wsl] Line ${malformedLineNumber} of /proc/self/mountinfo is not a whole line of that file (as when a line break in a folder's name splits an entry in two), repeats an option, or names a drive as its source but none in its drvfs options. It may belong to a Windows drive, so this machine serves no cloud session while the line is there.`,
          "[wsl] /proc/self/mountinfo holds a line that is not whole, repeats an option, or names a drive only as its source; no cloud session is served while it does",
        ),
      );
    let w =
        driveMounts.length === 0
          ? "(none named; /mnt/<letter> applies)"
          : driveMounts
              .map(
                (R) =>
                  `${R.letter.toUpperCase()}:${R.within === "" ? "" : `\\${R.within.replaceAll("/", "\\")}`} at ${R.mountPoint}`,
              )
              .join(", "),
      S =
        otherWindowsMounts.length === 0
          ? w
          : `${w}; Windows mounts that name no drive: ${otherWindowsMounts.map((R) => (R.within === "" ? R.mountPoint : `${R.mountPoint} (or from ${R.within.replaceAll("/", "\\")})`)).join(", ")}`;
    if (S !== ze.lastListed)
      ((ze.lastListed = S), logForDebugging(`[wsl] Windows drives in /proc/self/mountinfo: ${S}`));
    return {
      driveMounts: driveMounts,
      otherWindowsMounts: otherWindowsMounts,
      otherWindowsVolumes: otherWindowsVolumes,
      otherWindowsMountLines: otherWindowsMountLines,
      secondRootMounts: filterSameInodeAsRoot(secondRootMountCandidates),
      malformedLineNumber: malformedLineNumber,
    };
  } catch (error) {
    let n = getErrnoCode(error) ?? errorMessage(error);
    if (ze.read === void 0)
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[wsl] Could not read /proc/self/mountinfo (${n}): this machine's Windows drives cannot be located, so it serves no cloud session until a retry succeeds (retried automatically).`,
          "[wsl] Could not read /proc/self/mountinfo; no cloud session is served until a retry succeeds",
        ),
      );
    else logForDebugging(`[wsl] Could not read /proc/self/mountinfo (${n})`);
    return ((ze.lastListed = void 0), "unreadable");
  }
}
//@ chunk-82kqcve8.js:174058-174205 placement
function dedupeDriveMounts(e) {
  let n = new Set();
  return e.filter((r) => {
    let s = `${r.mountPoint}\x00${r.letter}\x00${r.within}`;
    if (n.has(s)) return !1;
    return (n.add(s), !0);
  });
}
//@ chunk-82kqcve8.js:174205-174261 placement
function ut(e) {
  return e.split(/[\\/]+/).filter(Boolean);
}
//@ chunk-82kqcve8.js:174261-174327 placement
function _g(e) {
  return e.length > 1 && e.endsWith("/") ? e.slice(0, -1) : e;
}
//@ chunk-82kqcve8.js:174357-174408 placement
function car(e, n) {
  return overlappingVolumePaths(windowsVolumesForPath(posix_4.normalize(e)), n);
}
//@ chunk-82kqcve8.js:174408-174530 placement = execTmux (0.805)
function isOnSameWslMount(args, opts) {
  if (getPlatform() !== "wsl") return !1;
  let r = windowsVolumesForPath(posix_4.normalize(args));
  return r.length > 0 && pathWithMountAliases(opts).some((s) => overlappingVolumePaths(r, s).length > 0);
}
/**
 * 路径及其下所有挂载点。
 */
//@ chunk-82kqcve8.js:174530-174630 placement
function pathWithMountAliases(e) {
  let normalized = posix_4.normalize(e);
  return uniq([
    e,
    ...[...driveMountsUnder(normalized), ...otherWindowsMountsUnder(normalized)].map((r) => r.mountPoint),
  ]);
}
//@ chunk-82kqcve8.js:174630-174786 placement
function overlappingVolumePaths(e, n) {
  return windowsVolumesForPath(posix_4.normalize(n)).flatMap((r) =>
    e.flatMap((s) =>
      r.volume === s.volume || [r.volume, s.volume].includes(UNREAD)
        ? profileRelativeRemainders(r.beneath, s.beneath)
        : [],
    ),
  );
}

export {
  SERVED_MOUNT_TABLE_UNREADABLE,
  rootAliasMountPoints,
  pathBelowRootAlias,
  isWslMountInfoUnreadable,
  driveMountsForPath,
  car,
  pathWithMountAliases,
  listWslDrvfsMounts,
  touchesVolumeBesideUnreadMount,
  isOnSameWslMount,
  otherWindowsMountsForPath,
  driveMountsUnder,
  otherWindowsMountsUnder,
  getOtherWindowsMountLines,
  Dst,
  Mst,
  isNetworkOrForeignMount,
  Aui,
  q4t,
};
