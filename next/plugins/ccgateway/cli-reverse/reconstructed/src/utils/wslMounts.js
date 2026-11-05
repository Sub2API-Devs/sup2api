/**
 * utils/wslMounts.ts
 *
 * WSL 挂载表解析（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (42), chunk-n44f9pt7.js (5)
 * attribution: placement 47
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { posix } from "path";
import { firstLineOf } from "./stringUtils.js";
import { identity as identity_2 } from "./identity.js";
import { getPlatform } from "./platform.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-n44f9pt7.js:2900-3318 placement
/**
 * WSL 里的 Windows 网络文件系统类型集合。
 */
var NETWORK_FS_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LOCAL_FS_TYPES;
deferInit("chunk-n44f9pt7.js:2900", () => {
  NETWORK_FS_TYPES = new Set(
    "drvfs 9p virtiofs cifs smb3 smbfs nfs nfs4 ntfs ntfs3 fuseblk vfat exfat msdos".split(" "),
  );
  LOCAL_FS_TYPES = new Set(
    [
      "ext2 ext3 ext4 xfs btrfs zfs f2fs jfs reiserfs nilfs2 bcachefs tmpfs ramfs rootfs squashfs erofs",
      "proc sysfs devtmpfs devpts mqueue hugetlbfs cgroup cgroup2 pstore bpf debugfs tracefs securityfs",
      "configfs fusectl binfmt_misc nsfs rpc_pipefs efivarfs selinuxfs nfsd",
    ].flatMap((group) => group.split(" ")),
  );
});
//@ chunk-n44f9pt7.js:3318-3552 placement
/**
 * 挂载是否网络/FUSE/非本地文件系统，或来源为 Windows 盘符、UNC、URL、drvfs。
 */
function isNetworkOrForeignMount(mount) {
  let baseFsType = firstLineOf(mount.fstype, ".");
  let source = unescapeMountField(mount.source ?? "");
  return (
    NETWORK_FS_TYPES.has(mount.fstype) ||
    NETWORK_FS_TYPES.has(baseFsType) ||
    baseFsType === "fuse" ||
    !LOCAL_FS_TYPES.has(mount.fstype) ||
    /^[A-Za-z]:/.test(source) ||
    /^(\\\\|\/\/)/.test(source) ||
    /^[^/\s]+:\//.test(source) ||
    /(^|,)aname=drvfs/.test(mount.options ?? "")
  );
}
//@ chunk-n44f9pt7.js:3552-3637 placement
/**
 * 是否是 drvfs（或 aname=drvfs 的 9p）挂载。
 */
function isDrvfsMount(fstype, options) {
  return fstype === "drvfs" || (fstype === "9p" && /(^|,)aname=drvfs(?=[,;]|$)/.test(options));
}
//@ chunk-n44f9pt7.js:3637-3729 placement
/**
 * 还原 mountinfo 里的八进制转义。
 */
function unescapeMountField(field) {
  return field.replace(/\\([0-7]{3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8)));
}
//@ chunk-n44f9pt7.js:3729-3795 placement
/**
 * 路径是否等于或位于挂载点之下。
 */
function isAtOrUnderPath(path, parent) {
  return path === parent || path.startsWith(parent === "/" ? "/" : `${parent}/`);
}
//@ chunk-a2q0x549.js:161956-162880 placement
/**
 * WSL mountinfo 解析用的正则与常量组（盘符、UNC、drvfs 选项、缓存时长等）。
 */
var UNREAD; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SERVED_MOUNT_TABLE_UNREADABLE;
var MNT_DRIVE_RE;
var DRIVE_PATH_RE;
var UNC_DEVICE_PREFIX_RE;
var DRVFS_ANAME_PATH_RE;
var WINDOWS_FS_TYPES;
var ANAME_DRVFS_RE;
var DEVICE_PATH_OPTION_RE;
var UNC_PATH_RE;
var DEVICE_ESCAPED_PATH_RE;
var VOLUME_GUID_RE;
var DRVFS_SOURCE_RE;
var WSL_MOUNT_OPTION_RE;
var MOUNT_TABLE_TTL_MS;
var mountTableCache;
deferInit("chunk-a2q0x549.js:161956", () => {
  UNREAD = "unread";
  SERVED_MOUNT_TABLE_UNREADABLE = "served-mount-table-unreadable";
  MNT_DRIVE_RE = /^\/mnt\/([a-z])(?=\/|$)/i;
  DRIVE_PATH_RE = /^([a-z]):(?:[\\/](.*))?$/is;
  UNC_DEVICE_PREFIX_RE = /^(?:[\\/]{2}[?.]|[\\/]\?\?)[\\/](?:(UNC[\\/])(?=[^\\/])|(?=[a-z]:))/i;
  DRVFS_ANAME_PATH_RE =
    /(?:^|[,;])aname=drvfsa?;(?:[^,;]*;)*path=(?:(?:[\\/]{2}[?.]|[\\/]\?\?)[\\/])?([a-z]):([^,;]*)(?=[,;]|$)/i;
  WINDOWS_FS_TYPES = new Set(["drvfs", "cifs", "smb3", "smbfs", "ntfs", "ntfs3", "fuseblk", "vfat", "exfat"]);
  ANAME_DRVFS_RE = /(?:^|[,;])aname=drvfsa?(?=[,;]|$)/i;
  DEVICE_PATH_OPTION_RE = /^(?:\\\\|\/\/)[^\\/]/;
  UNC_PATH_RE = /^(?:\\\\|\/\/|UNC\\)[^\\/]+[\\/]+[a-z]\$(?:[\\/](.*))?$/is;
  DEVICE_ESCAPED_PATH_RE = /^(?:\\\\|\/\/|UNC\\)([^\\/]+)[\\/]+([^\\/]+)(?:[\\/](.*))?$/is;
  VOLUME_GUID_RE = /(?:^|,)prefixpath=([^,]*)/;
  DRVFS_SOURCE_RE =
    /(?:^|[,;])aname=drvfsa?;(?:[^,;]*;)*path=((?:\\\\|\/\/|UNC\\|[\\/]\?\?[\\/])[^,;]*)(?=[,;]|$)/i;
  WSL_MOUNT_OPTION_RE =
    /^\d+ \d+ \d+:\d+ ([^ ]+) ([^ ]+) (r[ow])(?:,[^ ]*)?(?: [^ ]+)*? - ([^ ]+) ([^ ]*) ((r[ow])(?:,.*)?)$/s;
  MOUNT_TABLE_TTL_MS = 2000;
  mountTableCache = identity_2(
    {
      read: undefined,
      readAt: 0,
      lastListed: undefined,
    },
    (entry) => {
      entry.read = undefined;
      entry.readAt = 0;
      entry.lastListed = undefined;
    },
  );
});
//@ chunk-a2q0x549.js:162880-162976 placement
/**
 * WSL 的第二根挂载列表。
 */
function secondRootMounts() {
  if (getPlatform() !== "wsl") return [];
  let wslMounts = readWslMountsCached();
  return wslMounts === "unreadable" ? [] : wslMounts.secondRootMounts;
}
//@ chunk-a2q0x549.js:162976-163002 placement
var WSLG_DISTRO_ROOT = "/mnt/wslg/distro";
//@ chunk-a2q0x549.js:163002-163115 placement
function rootAliasMountPoints() {
  let mapped = secondRootMounts().map((mount) => mount.mountPoint);
  return (
    isWslMountInfoUnreadable() ? normalizeCaseForComparison_2([...mapped, WSLG_DISTRO_ROOT]) : mapped
  ).toSorted((left, right) => right.length - left.length);
}
//@ chunk-a2q0x549.js:163115-163245 placement
function pathBelowRootAlias(path) {
  let aliases = rootAliasMountPoints();
  if (aliases.length === 0) return;
  let normalized = posix.normalize(path);
  let found = aliases.find((alias) => isAtOrUnderPath(normalized, alias));
  return found && (normalized.slice(found.length) || "/");
}
//@ chunk-a2q0x549.js:163245-163351 placement
/**
 * WSL 挂载信息不可读或含格式错误的行。
 */
function isWslMountInfoUnreadable() {
  if (getPlatform() !== "wsl") return false;
  let wslMounts = readWslMountsCached();
  return wslMounts === "unreadable" || wslMounts.malformedLineNumber !== undefined;
}
//@ chunk-a2q0x549.js:163351-164160 placement
/**
 * 解析 mountinfo：盘符挂载、其他 Windows 挂载及其原始行、Windows 卷与首个异常行。
 */
function parseMountInfo(file) {
  let lines = file.split(`
`);
  let mapped = lines.map(parseMountInfoLine);
  let malformedIndex = mapped.findIndex(
    (parsed, lineIndex) => lines[lineIndex] !== "" && (parsed === undefined || isMalformed9pMount(parsed)),
  );
  let mapped_2 = mapped.map((parsed) =>
    parsed === undefined ? EMPTY_WINDOWS_MOUNT_CLASSIFICATION : classifyWindowsMount(parsed),
  );
  let linesByMountPoint = mapped_2
    .flatMap((classification, lineIndex) =>
      classification.otherWindowsMounts.map((otherWindowsMount) => [
        otherWindowsMount.mountPoint,
        lines[lineIndex],
      ]),
    )
    .reduce((acc, [mountPoint, line]) => {
      let group = acc.get(mountPoint);
      if (group === undefined) acc.set(mountPoint, [line]);
      else group.push(line);
      return acc;
    }, new Map());
  return {
    driveMounts: dedupeDriveMounts(mapped_2.flatMap((classification) => classification.drives)).toSorted(
      (left, right) => right.mountPoint.length - left.mountPoint.length,
    ),
    otherWindowsMounts: [
      ...new Map(
        mapped_2
          .flatMap((classification) => classification.otherWindowsMounts)
          .map((mount) => [`${mount.mountPoint}\x00${mount.within}`, mount]),
      ).values(),
    ].toSorted((left, right) => right.mountPoint.length - left.mountPoint.length),
    otherWindowsVolumes: mapped_2.flatMap((classification) => classification.otherWindowsVolumes),
    otherWindowsMountLines: new Map(
      [...linesByMountPoint].map(([mountPoint, lines]) => [
        mountPoint,
        lines.join(`
`),
      ]),
    ),
    secondRootMountCandidates: sameFsTypeMounts(mapped.filter((parsed) => parsed !== undefined)),
    malformedLineNumber: malformedIndex === -1 ? undefined : malformedIndex + 1,
  };
}
//@ chunk-a2q0x549.js:164160-164450 placement
function sameFsTypeMounts(mounts) {
  let rootFsTypes = new Set(mounts.filter((mount) => mount.mountPoint === "/").map((mount) => mount.fstype));
  return [
    ...mounts
      .filter(
        (mount) =>
          rootFsTypes.has(mount.fstype) && mount.mountPoint !== "/" && posix.isAbsolute(mount.mountPoint),
      )
      .reduce(
        (acc, { mountPoint, readOnly }) => acc.set(mountPoint, readOnly && (acc.get(mountPoint) ?? true)),
        new Map(),
      ),
  ].map(([mountPoint, readOnly]) => ({
    mountPoint,
    readOnly,
  }));
}
//@ chunk-a2q0x549.js:164450-164777 placement
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
//@ chunk-a2q0x549.js:164777-164998 placement
function parseMountInfoLine(line) {
  let match = WSL_MOUNT_OPTION_RE.exec(line);
  if (match === null) return;
  let [, root, mountPoint, mountOptions, fstype, source, options, superOptions] = match;
  return {
    root: unescapeMountField(root).replace(/\/\/deleted$/, ""),
    mountPoint: trimTrailingSlash(posix.normalize(unescapeMountField(mountPoint))),
    readOnly: mountOptions === "ro" || superOptions === "ro",
    fstype,
    source: normalizeUncSource(unescapeMountField(source)),
    options,
  };
}
//@ chunk-a2q0x549.js:164998-165184 placement
function isMalformed9pMount({ fstype, source, options }) {
  return (
    fstype === "9p" &&
    (options.split(",trans=").length !== 2 ||
      options.split(/aname=/i).length > 2 ||
      options.split(/path=/i).length > 2 ||
      (DRIVE_PATH_RE.test(source) && ANAME_DRVFS_RE.test(options) && !DRVFS_ANAME_PATH_RE.test(options)))
  );
}
//@ chunk-a2q0x549.js:165184-165248 placement
var EMPTY_WINDOWS_MOUNT_CLASSIFICATION = {
  drives: [],
  otherWindowsMounts: [],
  otherWindowsVolumes: [],
};
//@ chunk-a2q0x549.js:165248-166113 placement
/**
 * 把一个挂载分类为盘符挂载、其他 Windows 挂载与 Windows 卷。
 */
function classifyWindowsMount({ root, mountPoint, fstype, source, options }) {
  if (!posix.isAbsolute(mountPoint)) return EMPTY_WINDOWS_MOUNT_CLASSIFICATION;
  let rootSegments = pathSegments(root);
  let match = DRIVE_PATH_RE.exec(source);
  let match_2 = DRVFS_ANAME_PATH_RE.exec(options);
  if ((match ?? match_2) === null) {
    if (!isWindowsForeignMount(fstype, source, options)) return EMPTY_WINDOWS_MOUNT_CLASSIFICATION;
    let optionVariants = /\\[0-7]{3}/.test(options) ? [options, unescapeMountField(options)] : [options];
    let sourcePaths = normalizeCaseForComparison_2(
      optionVariants.flatMap((optionVariant) => {
        let normalizedSource = normalizeUncSource(DRVFS_SOURCE_RE.exec(optionVariant)?.[1] ?? source);
        let volumeGuid = VOLUME_GUID_RE.exec(optionVariant)?.[1];
        return volumeGuid === undefined || volumeGuid === ""
          ? [normalizedSource]
          : [normalizedSource, `${normalizedSource}/${volumeGuid}`];
      }),
    );
    return {
      drives: [],
      otherWindowsMounts: sourcePaths
        .flatMap((sourcePath) => windowsMountSubpaths(sourcePath, rootSegments))
        .map((within) => ({
          mountPoint,
          within,
        })),
      otherWindowsVolumes: sourcePaths
        .flatMap((sourcePath) => windowsVolumeCandidates(sourcePath, rootSegments))
        .map((candidate) => ({
          mountPoint,
          ...candidate,
        })),
    };
  }
  let drvfsTarget = match_2?.[2] ?? "";
  return {
    drives: [
      ...(match === null ? [] : [[match[1], match[2] ?? ""]]),
      ...(match_2 === null ? [] : [[match_2[1], drvfsTarget]]),
      ...(match === null && match_2 !== null && /\\[0-7]{3}/.test(drvfsTarget)
        ? [[match_2[1], unescapeMountField(drvfsTarget)]]
        : []),
    ].flatMap(([letter, sourcePath]) => {
      let sourceSegments = pathSegments(sourcePath);
      return normalizeCaseForComparison_2(
        appendRemainingSegments(rootSegments, sourceSegments).flatMap((combined) => [
          combined.join("/"),
          ...pathSpellings(combined),
        ]),
      ).map((within) => ({
        mountPoint,
        letter: letter.toLowerCase(),
        within,
      }));
    }),
    otherWindowsMounts: [],
    otherWindowsVolumes: [],
  };
}
//@ chunk-a2q0x549.js:166113-166212 placement
function stripCommonPrefixSegments(segments, prefix) {
  return prefix.length > 0 &&
    prefix.every((segment, index) => foldCaseBasic(segment) === foldCaseBasic(segments[index] ?? ""))
    ? [segments, segments.slice(prefix.length)]
    : [segments];
}
//@ chunk-a2q0x549.js:166212-166266 placement
function appendRemainingSegments(rootSegments, sourceSegments) {
  return stripCommonPrefixSegments(rootSegments, sourceSegments).map((remainder) => [
    ...sourceSegments,
    ...remainder,
  ]);
}
//@ chunk-a2q0x549.js:166266-166372 placement
function windowsMountSubpaths(sourcePath, rootSegments) {
  let sourceSegments = pathSegments(DEVICE_ESCAPED_PATH_RE.exec(sourcePath)?.[3] ?? "");
  return [
    ...(UNC_PATH_RE.test(sourcePath) ? appendRemainingSegments(rootSegments, sourceSegments) : []),
    ...stripCommonPrefixSegments(rootSegments, sourceSegments),
    [],
  ].flatMap(pathSpellings);
}
//@ chunk-a2q0x549.js:166372-166731 placement
/**
 * 由 9p 来源推出 Windows 卷（UNC、盘符或未读）。
 */
function windowsVolumeCandidates(sourcePath, rootSegments) {
  let [, device, shareName, restPath] = DEVICE_ESCAPED_PATH_RE.exec(sourcePath) ?? [];
  let lower = /^([a-z])\$$/i.exec(shareName ?? "")?.[1]?.toLowerCase();
  let volumes =
    device === undefined || shareName === undefined
      ? [
          {
            volume: sourcePath.startsWith("/dev/") ? sourcePath : UNREAD,
          },
        ]
      : [
          {
            volume: `//${foldCaseBasic(device)}/${foldCaseBasic(shareName)}`,
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
  return normalizeCaseForComparison_2(
    [
      ...appendRemainingSegments(rootSegments, pathSegments(restPath ?? "")),
      ...(volumes.some(({ volume }) => volume === UNREAD) ? [[]] : []),
    ].flatMap(pathSpellings),
  ).flatMap((within) =>
    volumes.map((volume) => ({
      ...volume,
      within,
    })),
  );
}
//@ chunk-a2q0x549.js:166731-166793 placement
function normalizeUncSource(source) {
  return source.replace(UNC_DEVICE_PREFIX_RE, (match, uncPrefix) => (uncPrefix === undefined ? "" : "//"));
}
//@ chunk-a2q0x549.js:166793-166841 placement
function driveVolumeId(letter) {
  return `drive:${letter.toLowerCase()}`;
}
//@ chunk-a2q0x549.js:166841-166975 placement
function pathSpellings(segments) {
  let filtered = segments
    .map((segment) => stripTrailingDotsSpaces(firstLineOf(segment, ":")))
    .filter((trimmed) => trimmed !== "");
  return normalizeCaseForComparison_2(
    [segments, filtered].map((variant) => posix.normalize(`/${variant.join("/")}`).slice(1)),
  );
}
//@ chunk-a2q0x549.js:166975-167061 placement
function isWindowsForeignMount(fstype, source, options) {
  return (
    WINDOWS_FS_TYPES.has(fstype) ||
    fstype.startsWith("fuseblk.") ||
    ANAME_DRVFS_RE.test(options) ||
    DEVICE_PATH_OPTION_RE.test(source)
  );
}
//@ chunk-a2q0x549.js:167061-167297 placement
/**
 * 路径所在的 Windows 盘符挂载（含 /mnt/<盘符> 形式）。
 */
function driveMountsForPath(path) {
  if (getPlatform() !== "wsl") return [];
  let match = MNT_DRIVE_RE.exec(path);
  let foldedPath = foldCaseBasic(path);
  let segments = pathSegments(path);
  let candidates = [
    ...driveMounts().filter((mount) => isMountUnderPath(mount.mountPoint, foldedPath)),
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
  return dedupeDriveMounts(candidates).map((mount) => ({
    ...mount,
    beneath: relativeBeneathMount(mount, segments),
  }));
}
//@ chunk-a2q0x549.js:167297-167450 placement
/**
 * 某目录之下的盘符挂载。
 */
function driveMountsUnder(dir) {
  if (getPlatform() !== "wsl" || dir === "") return [];
  let prefix = foldCaseBasic(dir === "/" ? "/" : `${dir.replace(/\/+$/, "")}/`);
  return driveMounts().filter((mount) => foldCaseBasic(mount.mountPoint).startsWith(prefix));
}
//@ chunk-a2q0x549.js:167450-167664 placement
/**
 * 路径所在的其他 Windows 挂载。
 */
function otherWindowsMountsForPath(path) {
  if (getPlatform() !== "wsl") return [];
  let wslMounts = readWslMountsCached();
  if (wslMounts === "unreadable") return [];
  let foldedPath = foldCaseBasic(path);
  let segments = pathSegments(path);
  return wslMounts.otherWindowsMounts
    .filter((otherWindowsMount) => isMountUnderPath(otherWindowsMount.mountPoint, foldedPath))
    .map((otherWindowsMount) => ({
      mountPoint: otherWindowsMount.mountPoint,
      beneath: relativeBeneathMount(otherWindowsMount, segments),
    }));
}
//@ chunk-a2q0x549.js:167664-168039 placement
/**
 * 路径对应的全部 Windows 卷（盘符、挂载、9p 卷）及其下相对路径。
 */
function windowsVolumesForPath(path) {
  if (getPlatform() !== "wsl") return [];
  let wslMounts = readWslMountsCached();
  let foldedPath = foldCaseBasic(path);
  let segments = pathSegments(path);
  return [
    ...driveMountsForPath(path).flatMap((mount) => [
      {
        volume: driveVolumeId(mount.letter),
        beneath: mount.beneath,
      },
      {
        volume: mountPointVolumeId(mount.mountPoint),
        beneath: mount.beneath,
      },
    ]),
    ...otherWindowsMountsForPath(path).map((mount) => ({
      volume: mountPointVolumeId(mount.mountPoint),
      beneath: mount.beneath,
    })),
    ...(wslMounts === "unreadable" ? [] : wslMounts.otherWindowsVolumes)
      .filter((volume) => isMountUnderPath(volume.mountPoint, foldedPath))
      .map((volume) => ({
        volume: volume.volume,
        beneath: relativeBeneathMount(volume, segments),
      })),
  ];
}
//@ chunk-a2q0x549.js:168039-168590 placement
function listWslDrvfsMounts(path, mode) {
  let mounts = getPlatform() === "wsl" ? readWslMountsCached() : "unreadable";
  if (mounts === "unreadable") return false;
  let volumeIds = new Set(windowsVolumesForPath(path).map((volumeInfo) => volumeInfo.volume));
  let flattened = [
    ...mounts.driveMounts.map(({ mountPoint, letter }) => ({
      mountPoint,
      volume: driveVolumeId(letter),
      letter,
      namesDrive: true,
    })),
    ...mounts.otherWindowsVolumes.map((otherWindowsVolume) => ({
      ...otherWindowsVolume,
      namesDrive: false,
    })),
  ].flatMap((mount) =>
    mount.letter === undefined
      ? [mount]
      : [
          mount,
          {
            ...mount,
            mountPoint: `/mnt/${mount.letter}`,
            namesDrive: true,
          },
        ],
  );
  return [...volumeIds]
    .filter((volumeId) => volumeId !== UNREAD)
    .some((volumeId) => {
      let filtered = flattened.filter((mount) => mount.volume === volumeId);
      return (
        new Set(filtered.map((mount) => foldCaseBasic(mount.mountPoint))).size > 1 &&
        (mode === "all" || filtered.some((mount) => !mount.namesDrive))
      );
    });
}
//@ chunk-a2q0x549.js:168590-168730 placement
/**
 * 路径涉及 Windows 卷且存在未读出卷名的挂载。
 */
function touchesVolumeBesideUnreadMount(path) {
  let mounts = getPlatform() === "wsl" ? readWslMountsCached() : "unreadable";
  return (
    mounts !== "unreadable" &&
    mounts.otherWindowsVolumes.some((otherWindowsVolume) => otherWindowsVolume.volume === UNREAD) &&
    windowsVolumesForPath(path).length > 0
  );
}
//@ chunk-a2q0x549.js:168730-168765 placement
function mountPointVolumeId(mountPoint) {
  return `at:${foldCaseBasic(mountPoint)}`;
}
//@ chunk-a2q0x549.js:168765-168802 placement
function isMountUnderPath(mountPoint, path) {
  return isAtOrUnderPath(path, foldCaseBasic(mountPoint));
}
//@ chunk-a2q0x549.js:168802-168889 placement
function relativeBeneathMount(mount, segments) {
  return [...pathSegments(mount.within), ...segments.slice(pathSegments(mount.mountPoint).length)].join("/");
}
//@ chunk-a2q0x549.js:168889-169001 placement
/**
 * 某挂载点对应的原始 mountinfo 行。
 */
function getOtherWindowsMountLines(mountPoint) {
  if (getPlatform() !== "wsl") return;
  let wslMounts = readWslMountsCached();
  return wslMounts === "unreadable" ? undefined : wslMounts.otherWindowsMountLines.get(mountPoint);
}
//@ chunk-a2q0x549.js:169001-169210 placement
/**
 * 某目录之下的其他 Windows 挂载。
 */
function otherWindowsMountsUnder(dir) {
  if (getPlatform() !== "wsl" || dir === "") return [];
  let wslMounts = readWslMountsCached();
  if (wslMounts === "unreadable") return [];
  let prefix = foldCaseBasic(dir === "/" ? "/" : `${dir.replace(/\/+$/, "")}/`);
  return wslMounts.otherWindowsMounts.filter((otherWindowsMount) =>
    foldCaseBasic(otherWindowsMount.mountPoint).startsWith(prefix),
  );
}
//@ chunk-a2q0x549.js:169210-169300 placement
function driveMounts() {
  if (getPlatform() !== "wsl") return [];
  let wslMounts = readWslMountsCached();
  return wslMounts === "unreadable" ? [] : wslMounts.driveMounts;
}
//@ chunk-a2q0x549.js:169300-169460 placement
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
//@ chunk-a2q0x549.js:169460-171261 placement
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
    let driveList =
      driveMounts.length === 0
        ? "(none named; /mnt/<letter> applies)"
        : driveMounts
            .map(
              (driveMount) =>
                `${driveMount.letter.toUpperCase()}:${driveMount.within === "" ? "" : `\\${driveMount.within.replaceAll("/", "\\")}`} at ${driveMount.mountPoint}`,
            )
            .join(", ");
    let listing =
      otherWindowsMounts.length === 0
        ? driveList
        : `${driveList}; Windows mounts that name no drive: ${otherWindowsMounts.map((otherWindowsMount) => (otherWindowsMount.within === "" ? otherWindowsMount.mountPoint : `${otherWindowsMount.mountPoint} (or from ${otherWindowsMount.within.replaceAll("/", "\\")})`)).join(", ")}`;
    if (listing !== mountTableCache.lastListed) {
      mountTableCache.lastListed = listing;
      logForDebugging(`[wsl] Windows drives in /proc/self/mountinfo: ${listing}`);
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
    let errno = getErrnoCode(error) ?? errorMessage(error);
    if (mountTableCache.read === undefined)
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[wsl] Could not read /proc/self/mountinfo (${errno}): this machine's Windows drives cannot be located, so it serves no cloud session until a retry succeeds (retried automatically).`,
          "[wsl] Could not read /proc/self/mountinfo; no cloud session is served until a retry succeeds",
        ),
      );
    else logForDebugging(`[wsl] Could not read /proc/self/mountinfo (${errno})`);
    mountTableCache.lastListed = undefined;
    return "unreadable";
  }
}
//@ chunk-a2q0x549.js:171261-171408 placement
function dedupeDriveMounts(mounts) {
  let seen = new Set();
  return mounts.filter((mount) => {
    let key = `${mount.mountPoint}\x00${mount.letter}\x00${mount.within}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
//@ chunk-a2q0x549.js:171408-171464 placement
function pathSegments(path) {
  return path.split(/[\\/]+/).filter(Boolean);
}
//@ chunk-a2q0x549.js:171464-171530 placement
function trimTrailingSlash(value) {
  return value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;
}
//@ chunk-a2q0x549.js:171560-171611 placement
/**
 * 路径涉及的 Windows 卷路径（重叠卷）。
 */
function normalizedVolumePaths(path, otherPath) {
  return overlappingVolumePaths(windowsVolumesForPath(posix.normalize(path)), otherPath);
}
//@ chunk-a2q0x549.js:171611-171733 placement (2.1.88 match: execTmux, 0.805)
function isOnSameWslMount(args, opts) {
  if (getPlatform() !== "wsl") return false;
  let volumes = windowsVolumesForPath(posix.normalize(args));
  return (
    volumes.length > 0 &&
    pathWithMountAliases(opts).some((alias) => overlappingVolumePaths(volumes, alias).length > 0)
  );
}
//@ chunk-a2q0x549.js:171733-171833 placement
/**
 * 路径及其下所有挂载点。
 */
function pathWithMountAliases(path) {
  let dir = posix.normalize(path);
  return normalizeCaseForComparison_2([
    path,
    ...[...driveMountsUnder(dir), ...otherWindowsMountsUnder(dir)].map((mount) => mount.mountPoint),
  ]);
}
//@ chunk-a2q0x549.js:171833-171989 placement
function overlappingVolumePaths(otherVolumes, path) {
  return windowsVolumesForPath(posix.normalize(path)).flatMap((volume) =>
    otherVolumes.flatMap((other) =>
      volume.volume === other.volume || [volume.volume, other.volume].includes(UNREAD)
        ? profileRelativeRemainders(volume.beneath, other.beneath)
        : [],
    ),
  );
}
export {
  rootAliasMountPoints,
  pathBelowRootAlias,
  isWslMountInfoUnreadable,
  pathWithMountAliases,
  listWslDrvfsMounts,
  touchesVolumeBesideUnreadMount,
  isOnSameWslMount,
  normalizedVolumePaths,
  driveMountsForPath,
  otherWindowsMountsForPath,
  driveMountsUnder,
  otherWindowsMountsUnder,
  getOtherWindowsMountLines,
  SERVED_MOUNT_TABLE_UNREADABLE,
  secondRootMounts,
  unescapeMountField,
  isNetworkOrForeignMount,
  isDrvfsMount,
  isAtOrUnderPath,
};
