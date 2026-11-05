/**
 * utils/safeMkdir.ts
 *
 * 2.1.316 新增：在用户数据目录内安全创建目录（防链接、属主检查、/proc/self/fd 校验）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jrka8r47.js (7)
 * attribution: placement 7
 */
import { constants } from "fs";
import { basename, dirname, join } from "path";
import { open, realpath, mkdir, lstat, stat, rename, readlink, rmdir } from "fs/promises";
import { randomUUID } from "crypto";
import { O_NOFOLLOW_ANY, READ_LIMITS } from "./fsBoundRead.js";
import {
  getErrnoCode,
  sanitizeErrnoForTelemetry,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import { getLocalUploadsRoot } from "../bootstrap/state.js";
import { logForDiagnosticsNoPII } from "./diagLogs.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";

//@ chunk-jrka8r47.js:617-656 placement
var dirOpenFlags = O_NOFOLLOW_ANY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS;
//@ chunk-jrka8r47.js:656-700 placement
function fdPath(handle) {
  return `/proc/self/fd/${handle.fd}`;
}
//@ chunk-jrka8r47.js:700-768 placement
async function isOwnedByCurrentUser(handle) {
  return (await handle.stat()).uid === process.getuid?.();
}
//@ chunk-jrka8r47.js:768-1449 placement
/**
 * 安全地打开（必要时逐级创建）目录：从已存在的上级打开句柄并确认不经过链接、属主正确，再逐级在句柄下 mkdir 并打开；返回 /proc/self/fd 形式路径与释放函数，或失败原因（链接、非属主、不存在等）。
 */
async function openOwnedDirChain(path, createDepth) {
  let missingParts = [];
  let baseDir = path;
  for (let depth = 0; depth < createDepth; depth++) {
    missingParts.unshift(basename(baseDir));
    baseDir = dirname(baseDir);
  }
  let handle;
  let pendingPath = baseDir;
  try {
    handle = await open(baseDir, dirOpenFlags);
    pendingPath = undefined;
    if ((await realpath(fdPath(handle))) !== baseDir) return "behind_a_link";
    if (createDepth === 0 && !(await isOwnedByCurrentUser(handle))) return "not_owned";
    for (let missingPart of missingParts) {
      pendingPath = join(fdPath(handle), missingPart);
      await mkdir(pendingPath, {
        mode: 448,
      }).catch((error) => {
        if (getErrnoCode(error) !== "EEXIST") throw error;
      });
      let childHandle = await open(pendingPath, dirOpenFlags);
      pendingPath = undefined;
      await handle.close();
      handle = childHandle;
      if (!(await isOwnedByCurrentUser(handle))) return "not_owned";
    }
    let ownedHandle = handle;
    handle = undefined;
    return {
      at: fdPath(ownedHandle),
      release: () => ownedHandle.close(),
    };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" && pendingPath === baseDir) return createDepth === 0 ? "absent" : "no_parent";
    if (pendingPath !== undefined && (errnoCode === "ENOTDIR" || errnoCode === "ELOOP"))
      return (await lstat(pendingPath).then(
        (stats) => stats.isSymbolicLink(),
        () => false,
      ))
        ? "a_link"
        : "not_a_directory";
    return sanitizeErrnoForTelemetry(error) ?? "unknown";
  } finally {
    await handle?.close();
  }
}
//@ chunk-jrka8r47.js:1449-1729 placement
/**
 * 在目录下新建子目录并打开句柄，确认属主与上级相同，返回句柄路径与释放函数。
 */
async function createOwnedSubdir(uploadsDir, subdirName) {
  let dirPath = join(uploadsDir, subdirName);
  await mkdir(dirPath, {
    mode: 448,
  });
  let handle = await open(dirPath, dirOpenFlags);
  if (
    !(await Promise.all([handle.stat(), stat(uploadsDir)]).then(
      ([newStats, parentStats]) => newStats.uid === parentStats.uid,
      () => false,
    ))
  ) {
    await handle.close();
    throw Error("the new folder has another owner than the folder it is in");
  }
  return {
    at: fdPath(handle),
    release: () => handle.close(),
  };
}
//@ chunk-jrka8r47.js:1729-2092 placement
/**
 * 探测已打开目录句柄在改名后是否仍指向同一目录（readlink 与 inode 一致），否则返回 holds_do_not_follow 或错误码。
 */
async function probeNoFollowSupport(dirRef) {
  let probePath = join(dirRef.at, `.probe-${randomUUID()}`);
  let movedPath = `${probePath}-moved`;
  let handle;
  try {
    await mkdir(probePath, {
      mode: 448,
    });
    handle = await open(probePath, dirOpenFlags);
    await rename(probePath, movedPath);
    let targetPath = await readlink(fdPath(handle)).catch(() => "");
    let stats = await stat(fdPath(handle)).catch(() => {
      return;
    });
    return (
      (basename(targetPath) === basename(movedPath) && stats?.ino === (await handle.stat()).ino) ||
      "holds_do_not_follow"
    );
  } catch (error) {
    return sanitizeErrnoForTelemetry(error) ?? "unknown";
  } finally {
    await handle?.close();
    await Promise.allSettled([rmdir(probePath), rmdir(movedPath)]);
  }
}
//@ chunk-jrka8r47.js:2092-2517 placement
async function ensureAttachmentsDir(dirPath) {
  let localUploadsRoot = getLocalUploadsRoot();
  if (localUploadsRoot === null || dirname(dirPath) !== localUploadsRoot) {
    await mkdir(dirPath, {
      recursive: true,
      mode: 448,
    });
    return {
      at: dirPath,
      release: async () => {},
    };
  }
  let ownedDirChain = await openOwnedDirChain(dirPath, 2);
  if (typeof ownedDirChain === "string") {
    logForDiagnosticsNoPII("warn", "attachments_in_user_data", {
      state: "write_refused",
      reason: ownedDirChain,
    });
    logFeatureBad("bridge_attachment_user_data_root", ownedDirChain);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `nothing was saved: the attachments folder cannot be used (${ownedDirChain})`,
      "nothing was saved: the attachments folder cannot be used",
    );
  }
  return ownedDirChain;
}
export { openOwnedDirChain, probeNoFollowSupport, createOwnedSubdir, ensureAttachmentsDir };
