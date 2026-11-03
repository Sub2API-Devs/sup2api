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
import { posix } from "path";
import { firstLineOf } from "./stringUtils.js";
import { identity as identity_2 } from "./identity.js";
import { getPlatform } from "./platform.js";
import { uniq } from "./collections.js";
import { getFsImplementation } from "./fsOperations.js";
import {
  getErrnoCode,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import { logForDebugging } from "./debug.js";
import { foldCaseBasic } from "./pathIdentity.js";
import { stripTrailingDotsSpaces } from "./ignorePatterns.js";
import { logError } from "./log.js";
import { profileRelativeRemainders } from "./windowsProfileFolders.js";

//@ chunk-82kqcve8.js:163867-164285 placement
/**
 * WSL 里的 Windows 网络文件系统类型集合。
 */
var NETWORK_FS_TYPES = new Set(
  "drvfs 9p virtiofs cifs smb3 smbfs nfs nfs4 ntfs ntfs3 fuseblk vfat exfat msdos".split(" "),
);
var LOCAL_FS_TYPES = new Set(
  [
    "ext2 ext3 ext4 xfs btrfs zfs f2fs jfs reiserfs nilfs2 bcachefs tmpfs ramfs rootfs squashfs erofs",
    "proc sysfs devtmpfs devpts mqueue hugetlbfs cgroup cgroup2 pstore bpf debugfs tracefs securityfs",
    "configfs fusectl binfmt_misc nsfs rpc_pipefs efivarfs selinuxfs nfsd",
  ].flatMap((e) => e.split(" ")),
);
//@ chunk-82kqcve8.js:164285-164519 placement
/**
 * 挂载是否网络/FUSE/非本地文件系统，或来源为 Windows 盘符、UNC、URL、drvfs。
 */
function isNetworkOrForeignMount(e) {
  let n = firstLineOf(e.fstype, ".");
  let r = unescapeMountField(e.source ?? "");
  return (
    NETWORK_FS_TYPES.has(e.fstype) ||
    NETWORK_FS_TYPES.has(n) ||
    n === "fuse" ||
    !LOCAL_FS_TYPES.has(e.fstype) ||
    /^[A-Za-z]:/.test(r) ||
    /^(\\\\|\/\/)/.test(r) ||
    /^[^/\s]+:\//.test(r) ||
    /(^|,)aname=drvfs/.test(e.options ?? "")
  );
}
//@ chunk-82kqcve8.js:164519-164604 placement
/**
 * 是否是 drvfs（或 aname=drvfs 的 9p）挂载。
 */
function isDrvfsMount(e, n) {
  return e === "drvfs" || (e === "9p" && /(^|,)aname=drvfs(?=[,;]|$)/.test(n));
}
//@ chunk-82kqcve8.js:164604-164696 placement
/**
 * 还原 mountinfo 里的八进制转义。
 */
function unescapeMountField(e) {
  return e.replace(/\\([0-7]{3})/g, (n, r) => String.fromCharCode(parseInt(r, 8)));
}
//@ chunk-82kqcve8.js:164696-164762 placement
/**
 * 路径是否等于或位于挂载点之下。
 */
function isAtOrUnderPath(e, n) {
  return e === n || e.startsWith(n === "/" ? "/" : `${n}/`);
}
//@ chunk-82kqcve8.js:164762-165686 placement
/**
 * WSL mountinfo 解析用的正则与常量组（盘符、UNC、drvfs 选项、缓存时长等）。
 */
var UNREAD = "unread";
var SERVED_MOUNT_TABLE_UNREADABLE = "served-mount-table-unreadable";
var MNT_DRIVE_RE = /^\/mnt\/([a-z])(?=\/|$)/i;
var DRIVE_PATH_RE = /^([a-z]):(?:[\\/](.*))?$/is;
var UNC_DEVICE_PREFIX_RE = /^(?:[\\/]{2}[?.]|[\\/]\?\?)[\\/](?:(UNC[\\/])(?=[^\\/])|(?=[a-z]:))/i;
var DRVFS_ANAME_PATH_RE =
  /(?:^|[,;])aname=drvfsa?;(?:[^,;]*;)*path=(?:(?:[\\/]{2}[?.]|[\\/]\?\?)[\\/])?([a-z]):([^,;]*)(?=[,;]|$)/i;
var WINDOWS_FS_TYPES = new Set([
  "drvfs",
  "cifs",
  "smb3",
  "smbfs",
  "ntfs",
  "ntfs3",
  "fuseblk",
  "vfat",
  "exfat",
]);
var ANAME_DRVFS_RE = /(?:^|[,;])aname=drvfsa?(?=[,;]|$)/i;
var DEVICE_PATH_OPTION_RE = /^(?:\\\\|\/\/)[^\\/]/;
var UNC_PATH_RE = /^(?:\\\\|\/\/|UNC\\)[^\\/]+[\\/]+[a-z]\$(?:[\\/](.*))?$/is;
var DEVICE_ESCAPED_PATH_RE = /^(?:\\\\|\/\/|UNC\\)([^\\/]+)[\\/]+([^\\/]+)(?:[\\/](.*))?$/is;
var VOLUME_GUID_RE = /(?:^|,)prefixpath=([^,]*)/;
var DRVFS_SOURCE_RE =
  /(?:^|[,;])aname=drvfsa?;(?:[^,;]*;)*path=((?:\\\\|\/\/|UNC\\|[\\/]\?\?[\\/])[^,;]*)(?=[,;]|$)/i;
var WSL_MOUNT_OPTION_RE =
  /^\d+ \d+ \d+:\d+ ([^ ]+) ([^ ]+) (r[ow])(?:,[^ ]*)?(?: [^ ]+)*? - ([^ ]+) ([^ ]*) ((r[ow])(?:,.*)?)$/s;
var MOUNT_TABLE_TTL_MS = 2000;
var mountTableCache = identity_2(
  {
    read: undefined,
    readAt: 0,
    lastListed: undefined,
  },
  (e) => {
    e.read = undefined;
    e.readAt = 0;
    e.lastListed = undefined;
  },
);
//@ chunk-82kqcve8.js:165686-165782 placement
/**
 * WSL 的第二根挂载列表。
 */
function secondRootMounts() {
  if (getPlatform() !== "wsl") return [];
  let wslMounts = readWslMountsCached();
  return wslMounts === "unreadable" ? [] : wslMounts.secondRootMounts;
}
//@ chunk-82kqcve8.js:165782-165808 placement
var WSLG_DISTRO_ROOT = "/mnt/wslg/distro";
//@ chunk-82kqcve8.js:165808-165921 placement
function rootAliasMountPoints() {
  let mapped = secondRootMounts().map((n) => n.mountPoint);
  return (isWslMountInfoUnreadable() ? uniq([...mapped, WSLG_DISTRO_ROOT]) : mapped).toSorted(
    (n, r) => r.length - n.length,
  );
}
//@ chunk-82kqcve8.js:165921-166051 placement
function pathBelowRootAlias(e) {
  let n = rootAliasMountPoints();
  if (n.length === 0) return;
  let normalized = posix.normalize(e);
  let found = n.find((h) => isAtOrUnderPath(normalized, h));
  return found && (normalized.slice(found.length) || "/");
}
//@ chunk-82kqcve8.js:166051-166157 placement
/**
 * WSL 挂载信息不可读或含格式错误的行。
 */
function isWslMountInfoUnreadable() {
  if (getPlatform() !== "wsl") return false;
  let wslMounts = readWslMountsCached();
  return wslMounts === "unreadable" || wslMounts.malformedLineNumber !== undefined;
}
//@ chunk-82kqcve8.js:166157-166966 placement
/**
 * 解析 mountinfo：盘符挂载、其他 Windows 挂载及其原始行、Windows 卷与首个异常行。
 */
function parseMountInfo(file) {
  let lines = file.split(`
`);
  let mapped = lines.map(parseMountInfoLine);
  let malformedIndex = mapped.findIndex(
    (S, R) => lines[R] !== "" && (S === undefined || isMalformed9pMount(S)),
  );
  let mapped_2 = mapped.map((S) =>
    S === undefined ? EMPTY_WINDOWS_MOUNT_CLASSIFICATION : classifyWindowsMount(S),
  );
  let linesByMountPoint = mapped_2
    .flatMap((S, R) =>
      S.otherWindowsMounts.map((otherWindowsMount) => [otherWindowsMount.mountPoint, lines[R]]),
    )
    .reduce((acc, [R, O]) => {
      let P = acc.get(R);
      if (P === undefined) acc.set(R, [O]);
      else P.push(O);
      return acc;
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
    secondRootMountCandidates: sameFsTypeMounts(mapped.filter((S) => S !== undefined)),
    malformedLineNumber: malformedIndex === -1 ? undefined : malformedIndex + 1,
  };
}
//@ chunk-82kqcve8.js:166966-167256 placement
function sameFsTypeMounts(e) {
  let n = new Set(e.filter((h) => h.mountPoint === "/").map((h) => h.fstype));
  return [
    ...e
      .filter((h) => n.has(h.fstype) && h.mountPoint !== "/" && posix.isAbsolute(h.mountPoint))
      .reduce(
        (acc, { mountPoint, readOnly }) => acc.set(mountPoint, readOnly && (acc.get(mountPoint) ?? true)),
        new Map(),
      ),
  ].map(([h, y]) => ({
    mountPoint: h,
    readOnly: y,
  }));
}
//@ chunk-82kqcve8.js:167256-167583 placement
/**
 * 只保留与 / 同 dev/inode 的挂载点（看不到时当作第二根盘）。
 */
function filterSameInodeAsRoot(secondRootMountCandidates) {
  if (secondRootMountCandidates.length === 0) return [];
  let fsImplementation = getFsImplementation();
  let stats = fsImplementation.statSync("/");
  return secondRootMountCandidates.filter(({ mountPoint }) => {
    try {
      let stats_2 = fsImplementation.statSync(mountPoint);
      return stats.dev === stats_2.dev && stats.ino === stats_2.ino;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return false;
      logForDebugging(
        `[wsl] Could not look at ${mountPoint} (${errnoCode ?? errorMessage(error)}): taken for a second mount of the root disk`,
      );
      return true;
    }
  });
}
//@ chunk-82kqcve8.js:167583-167804 placement
function parseMountInfoLine(e) {
  let match = WSL_MOUNT_OPTION_RE.exec(e);
  if (match === null) return;
  let [, r, s, h, y, w, S, R] = match;
  return {
    root: unescapeMountField(r).replace(/\/\/deleted$/, ""),
    mountPoint: trimTrailingSlash(posix.normalize(unescapeMountField(s))),
    readOnly: h === "ro" || R === "ro",
    fstype: y,
    source: normalizeUncSource(unescapeMountField(w)),
    options: S,
  };
}
//@ chunk-82kqcve8.js:167804-167990 placement
function isMalformed9pMount({ fstype, source, options }) {
  return (
    fstype === "9p" &&
    (options.split(",trans=").length !== 2 ||
      options.split(/aname=/i).length > 2 ||
      options.split(/path=/i).length > 2 ||
      (DRIVE_PATH_RE.test(source) && ANAME_DRVFS_RE.test(options) && !DRVFS_ANAME_PATH_RE.test(options)))
  );
}
//@ chunk-82kqcve8.js:167990-168054 placement
var EMPTY_WINDOWS_MOUNT_CLASSIFICATION = {
  drives: [],
  otherWindowsMounts: [],
  otherWindowsVolumes: [],
};
//@ chunk-82kqcve8.js:168054-168910 placement
/**
 * 把一个挂载分类为盘符挂载、其他 Windows 挂载与 Windows 卷。
 */
function classifyWindowsMount({ root, mountPoint, fstype, source, options }) {
  if (!posix.isAbsolute(mountPoint)) return EMPTY_WINDOWS_MOUNT_CLASSIFICATION;
  let y = pathSegments(root);
  let match = DRIVE_PATH_RE.exec(source);
  let match_2 = DRVFS_ANAME_PATH_RE.exec(options);
  if ((match ?? match_2) === null) {
    if (!isWindowsForeignMount(fstype, source, options)) return EMPTY_WINDOWS_MOUNT_CLASSIFICATION;
    let optionVariants = /\\[0-7]{3}/.test(options) ? [options, unescapeMountField(options)] : [options];
    let sourcePaths = uniq(
      optionVariants.flatMap((optionVariant) => {
        let Z = normalizeUncSource(DRVFS_SOURCE_RE.exec(optionVariant)?.[1] ?? source);
        let ae = VOLUME_GUID_RE.exec(optionVariant)?.[1];
        return ae === undefined || ae === "" ? [Z] : [Z, `${Z}/${ae}`];
      }),
    );
    return {
      drives: [],
      otherWindowsMounts: sourcePaths
        .flatMap((sourcePath) => windowsMountSubpaths(sourcePath, y))
        .map((within) => ({
          mountPoint,
          within,
        })),
      otherWindowsVolumes: sourcePaths
        .flatMap((sourcePath) => windowsVolumeCandidates(sourcePath, y))
        .map((G) => ({
          mountPoint,
          ...G,
        })),
    };
  }
  let O = match_2?.[2] ?? "";
  return {
    drives: [
      ...(match === null ? [] : [[match[1], match[2] ?? ""]]),
      ...(match_2 === null ? [] : [[match_2[1], O]]),
      ...(match === null && match_2 !== null && /\\[0-7]{3}/.test(O)
        ? [[match_2[1], unescapeMountField(O)]]
        : []),
    ].flatMap(([L, j]) => {
      let G = pathSegments(j);
      return uniq(appendRemainingSegments(y, G).flatMap((Z) => [Z.join("/"), ...pathSpellings(Z)])).map(
        (within) => ({
          mountPoint,
          letter: L.toLowerCase(),
          within,
        }),
      );
    }),
    otherWindowsMounts: [],
    otherWindowsVolumes: [],
  };
}
//@ chunk-82kqcve8.js:168910-169009 placement
function stripCommonPrefixSegments(e, n) {
  return n.length > 0 && n.every((r, s) => foldCaseBasic(r) === foldCaseBasic(e[s] ?? ""))
    ? [e, e.slice(n.length)]
    : [e];
}
//@ chunk-82kqcve8.js:169009-169063 placement
function appendRemainingSegments(e, n) {
  return stripCommonPrefixSegments(e, n).map((r) => [...n, ...r]);
}
//@ chunk-82kqcve8.js:169063-169169 placement
function windowsMountSubpaths(sourcePath, n) {
  let r = pathSegments(DEVICE_ESCAPED_PATH_RE.exec(sourcePath)?.[3] ?? "");
  return [
    ...(UNC_PATH_RE.test(sourcePath) ? appendRemainingSegments(n, r) : []),
    ...stripCommonPrefixSegments(n, r),
    [],
  ].flatMap(pathSpellings);
}
//@ chunk-82kqcve8.js:169169-169528 placement
/**
 * 由 9p 来源推出 Windows 卷（UNC、盘符或未读）。
 */
function windowsVolumeCandidates(sourcePath, n) {
  let [, r, s, h] = DEVICE_ESCAPED_PATH_RE.exec(sourcePath) ?? [];
  let lower = /^([a-z])\$$/i.exec(s ?? "")?.[1]?.toLowerCase();
  let w =
    r === undefined || s === undefined
      ? [
          {
            volume: sourcePath.startsWith("/dev/") ? sourcePath : UNREAD,
          },
        ]
      : [
          {
            volume: `//${foldCaseBasic(r)}/${foldCaseBasic(s)}`,
          },
          ...(lower === undefined
            ? []
            : [
                {
                  volume: driveVolumeId(lower),
                  letter: lower,
                },
              ]),
        ];
  return uniq(
    [
      ...appendRemainingSegments(n, pathSegments(h ?? "")),
      ...(w.some(({ volume }) => volume === UNREAD) ? [[]] : []),
    ].flatMap(pathSpellings),
  ).flatMap((within) =>
    w.map((R) => ({
      ...R,
      within,
    })),
  );
}
//@ chunk-82kqcve8.js:169528-169590 placement
function normalizeUncSource(e) {
  return e.replace(UNC_DEVICE_PREFIX_RE, (n, r) => (r === undefined ? "" : "//"));
}
//@ chunk-82kqcve8.js:169590-169638 placement
function driveVolumeId(letter) {
  return `drive:${letter.toLowerCase()}`;
}
//@ chunk-82kqcve8.js:169638-169772 placement
function pathSpellings(e) {
  let filtered = e.map((r) => stripTrailingDotsSpaces(firstLineOf(r, ":"))).filter((r) => r !== "");
  return uniq([e, filtered].map((r) => posix.normalize(`/${r.join("/")}`).slice(1)));
}
//@ chunk-82kqcve8.js:169772-169858 placement
function isWindowsForeignMount(fstype, source, options) {
  return (
    WINDOWS_FS_TYPES.has(fstype) ||
    fstype.startsWith("fuseblk.") ||
    ANAME_DRVFS_RE.test(options) ||
    DEVICE_PATH_OPTION_RE.test(source)
  );
}
//@ chunk-82kqcve8.js:169858-170094 placement
/**
 * 路径所在的 Windows 盘符挂载（含 /mnt/<盘符> 形式）。
 */
function driveMountsForPath(e) {
  if (getPlatform() !== "wsl") return [];
  let match = MNT_DRIVE_RE.exec(e);
  let r = foldCaseBasic(e);
  let s = pathSegments(e);
  let h = [
    ...driveMounts().filter((y) => isMountUnderPath(y.mountPoint, r)),
    ...(match === null
      ? []
      : [
          {
            mountPoint: match[0],
            letter: match[1].toLowerCase(),
            within: "",
          },
        ]),
  ];
  return dedupeDriveMounts(h).map((y) => ({
    ...y,
    beneath: relativeBeneathMount(y, s),
  }));
}
//@ chunk-82kqcve8.js:170094-170247 placement
/**
 * 某目录之下的盘符挂载。
 */
function driveMountsUnder(e) {
  if (getPlatform() !== "wsl" || e === "") return [];
  let n = foldCaseBasic(e === "/" ? "/" : `${e.replace(/\/+$/, "")}/`);
  return driveMounts().filter((r) => foldCaseBasic(r.mountPoint).startsWith(n));
}
//@ chunk-82kqcve8.js:170247-170461 placement
/**
 * 路径所在的其他 Windows 挂载。
 */
function otherWindowsMountsForPath(e) {
  if (getPlatform() !== "wsl") return [];
  let wslMounts = readWslMountsCached();
  if (wslMounts === "unreadable") return [];
  let r = foldCaseBasic(e);
  let s = pathSegments(e);
  return wslMounts.otherWindowsMounts
    .filter((otherWindowsMount) => isMountUnderPath(otherWindowsMount.mountPoint, r))
    .map((otherWindowsMount) => ({
      mountPoint: otherWindowsMount.mountPoint,
      beneath: relativeBeneathMount(otherWindowsMount, s),
    }));
}
//@ chunk-82kqcve8.js:170461-170836 placement
/**
 * 路径对应的全部 Windows 卷（盘符、挂载、9p 卷）及其下相对路径。
 */
function windowsVolumesForPath(e) {
  if (getPlatform() !== "wsl") return [];
  let wslMounts = readWslMountsCached();
  let r = foldCaseBasic(e);
  let s = pathSegments(e);
  return [
    ...driveMountsForPath(e).flatMap((h) => [
      {
        volume: driveVolumeId(h.letter),
        beneath: h.beneath,
      },
      {
        volume: mountPointVolumeId(h.mountPoint),
        beneath: h.beneath,
      },
    ]),
    ...otherWindowsMountsForPath(e).map((h) => ({
      volume: mountPointVolumeId(h.mountPoint),
      beneath: h.beneath,
    })),
    ...(wslMounts === "unreadable" ? [] : wslMounts.otherWindowsVolumes)
      .filter((h) => isMountUnderPath(h.mountPoint, r))
      .map((h) => ({
        volume: h.volume,
        beneath: relativeBeneathMount(h, s),
      })),
  ];
}
//@ chunk-82kqcve8.js:170836-171387 placement
function listWslDrvfsMounts(e, n) {
  let r = getPlatform() === "wsl" ? readWslMountsCached() : "unreadable";
  if (r === "unreadable") return false;
  let s = new Set(windowsVolumesForPath(e).map((y) => y.volume));
  let flattened = [
    ...r.driveMounts.map(({ mountPoint, letter }) => ({
      mountPoint,
      volume: driveVolumeId(letter),
      letter,
      namesDrive: true,
    })),
    ...r.otherWindowsVolumes.map((otherWindowsVolume) => ({
      ...otherWindowsVolume,
      namesDrive: false,
    })),
  ].flatMap((y) =>
    y.letter === undefined
      ? [y]
      : [
          y,
          {
            ...y,
            mountPoint: `/mnt/${y.letter}`,
            namesDrive: true,
          },
        ],
  );
  return [...s]
    .filter((y) => y !== UNREAD)
    .some((y) => {
      let filtered = flattened.filter((S) => S.volume === y);
      return (
        new Set(filtered.map((S) => foldCaseBasic(S.mountPoint))).size > 1 &&
        (n === "all" || filtered.some((S) => !S.namesDrive))
      );
    });
}
//@ chunk-82kqcve8.js:171387-171527 placement
/**
 * 路径涉及 Windows 卷且存在未读出卷名的挂载。
 */
function touchesVolumeBesideUnreadMount(e) {
  let n = getPlatform() === "wsl" ? readWslMountsCached() : "unreadable";
  return (
    n !== "unreadable" &&
    n.otherWindowsVolumes.some((otherWindowsVolume) => otherWindowsVolume.volume === UNREAD) &&
    windowsVolumesForPath(e).length > 0
  );
}
//@ chunk-82kqcve8.js:171527-171562 placement
function mountPointVolumeId(mountPoint) {
  return `at:${foldCaseBasic(mountPoint)}`;
}
//@ chunk-82kqcve8.js:171562-171599 placement
function isMountUnderPath(mountPoint, n) {
  return isAtOrUnderPath(n, foldCaseBasic(mountPoint));
}
//@ chunk-82kqcve8.js:171599-171686 placement
function relativeBeneathMount(e, n) {
  return [...pathSegments(e.within), ...n.slice(pathSegments(e.mountPoint).length)].join("/");
}
//@ chunk-82kqcve8.js:171686-171798 placement
/**
 * 某挂载点对应的原始 mountinfo 行。
 */
function getOtherWindowsMountLines(mountPoint) {
  if (getPlatform() !== "wsl") return;
  let wslMounts = readWslMountsCached();
  return wslMounts === "unreadable" ? undefined : wslMounts.otherWindowsMountLines.get(mountPoint);
}
//@ chunk-82kqcve8.js:171798-172007 placement
/**
 * 某目录之下的其他 Windows 挂载。
 */
function otherWindowsMountsUnder(e) {
  if (getPlatform() !== "wsl" || e === "") return [];
  let wslMounts = readWslMountsCached();
  if (wslMounts === "unreadable") return [];
  let r = foldCaseBasic(e === "/" ? "/" : `${e.replace(/\/+$/, "")}/`);
  return wslMounts.otherWindowsMounts.filter((otherWindowsMount) =>
    foldCaseBasic(otherWindowsMount.mountPoint).startsWith(r),
  );
}
//@ chunk-82kqcve8.js:172007-172097 placement
function driveMounts() {
  if (getPlatform() !== "wsl") return [];
  let wslMounts = readWslMountsCached();
  return wslMounts === "unreadable" ? [] : wslMounts.driveMounts;
}
//@ chunk-82kqcve8.js:172097-172257 placement
function readWslMountsCached() {
  if (mountTableCache.read === undefined || Date.now() - mountTableCache.readAt > MOUNT_TABLE_TTL_MS) {
    let wslMountInfo = parseWslMountInfo();
    mountTableCache.read =
      wslMountInfo === "unreadable" && mountTableCache.read !== undefined
        ? mountTableCache.read
        : wslMountInfo;
    mountTableCache.readAt = Date.now();
  }
  return mountTableCache.read;
}
//@ chunk-82kqcve8.js:172257-174058 placement
function parseWslMountInfo() {
  try {
    let {
      driveMounts,
      otherWindowsMounts,
      otherWindowsVolumes,
      otherWindowsMountLines,
      secondRootMountCandidates,
      malformedLineNumber,
    } = parseMountInfo(
      getFsImplementation().readFileSync("/proc/self/mountinfo", {
        encoding: "utf8",
      }),
    );
    if (
      malformedLineNumber !== undefined &&
      (typeof mountTableCache.read !== "object" ||
        mountTableCache.read.malformedLineNumber !== malformedLineNumber)
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
              (driveMount) =>
                `${driveMount.letter.toUpperCase()}:${driveMount.within === "" ? "" : `\\${driveMount.within.replaceAll("/", "\\")}`} at ${driveMount.mountPoint}`,
            )
            .join(", ");
    let S =
      otherWindowsMounts.length === 0
        ? w
        : `${w}; Windows mounts that name no drive: ${otherWindowsMounts.map((otherWindowsMount) => (otherWindowsMount.within === "" ? otherWindowsMount.mountPoint : `${otherWindowsMount.mountPoint} (or from ${otherWindowsMount.within.replaceAll("/", "\\")})`)).join(", ")}`;
    if (S !== mountTableCache.lastListed) {
      mountTableCache.lastListed = S;
      logForDebugging(`[wsl] Windows drives in /proc/self/mountinfo: ${S}`);
    }
    return {
      driveMounts,
      otherWindowsMounts,
      otherWindowsVolumes,
      otherWindowsMountLines,
      secondRootMounts: filterSameInodeAsRoot(secondRootMountCandidates),
      malformedLineNumber,
    };
  } catch (error) {
    let n = getErrnoCode(error) ?? errorMessage(error);
    if (mountTableCache.read === undefined)
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[wsl] Could not read /proc/self/mountinfo (${n}): this machine's Windows drives cannot be located, so it serves no cloud session until a retry succeeds (retried automatically).`,
          "[wsl] Could not read /proc/self/mountinfo; no cloud session is served until a retry succeeds",
        ),
      );
    else logForDebugging(`[wsl] Could not read /proc/self/mountinfo (${n})`);
    mountTableCache.lastListed = undefined;
    return "unreadable";
  }
}
//@ chunk-82kqcve8.js:174058-174205 placement
function dedupeDriveMounts(e) {
  let n = new Set();
  return e.filter((r) => {
    let s = `${r.mountPoint}\x00${r.letter}\x00${r.within}`;
    if (n.has(s)) return false;
    n.add(s);
    return true;
  });
}
//@ chunk-82kqcve8.js:174205-174261 placement
function pathSegments(e) {
  return e.split(/[\\/]+/).filter(Boolean);
}
//@ chunk-82kqcve8.js:174261-174327 placement
function trimTrailingSlash(e) {
  return e.length > 1 && e.endsWith("/") ? e.slice(0, -1) : e;
}
//@ chunk-82kqcve8.js:174357-174408 placement
/**
 * 路径涉及的 Windows 卷路径（重叠卷）。
 */
function normalizedVolumePaths(e, n) {
  return overlappingVolumePaths(windowsVolumesForPath(posix.normalize(e)), n);
}
//@ chunk-82kqcve8.js:174408-174530 placement = execTmux (0.805)
function isOnSameWslMount(args, opts) {
  if (getPlatform() !== "wsl") return false;
  let r = windowsVolumesForPath(posix.normalize(args));
  return r.length > 0 && pathWithMountAliases(opts).some((s) => overlappingVolumePaths(r, s).length > 0);
}
//@ chunk-82kqcve8.js:174530-174630 placement
/**
 * 路径及其下所有挂载点。
 */
function pathWithMountAliases(e) {
  let normalized = posix.normalize(e);
  return uniq([
    e,
    ...[...driveMountsUnder(normalized), ...otherWindowsMountsUnder(normalized)].map((r) => r.mountPoint),
  ]);
}
//@ chunk-82kqcve8.js:174630-174786 placement
function overlappingVolumePaths(e, n) {
  return windowsVolumesForPath(posix.normalize(n)).flatMap((r) =>
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
  normalizedVolumePaths,
  pathWithMountAliases,
  listWslDrvfsMounts,
  touchesVolumeBesideUnreadMount,
  isOnSameWslMount,
  otherWindowsMountsForPath,
  driveMountsUnder,
  otherWindowsMountsUnder,
  getOtherWindowsMountLines,
  secondRootMounts,
  unescapeMountField,
  isNetworkOrForeignMount,
  isDrvfsMount,
  isAtOrUnderPath,
};
