/**
 * utils/safeMkdir.ts
 *
 * 2.1.316 新增：在用户数据目录内安全创建目录（防链接、属主检查、/proc/self/fd 校验）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s42bpptg.js (7)
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

//@ chunk-s42bpptg.js:617-656 placement
var dirOpenFlags = O_NOFOLLOW_ANY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS;
//@ chunk-s42bpptg.js:656-700 placement
function fdPath(t) {
  return `/proc/self/fd/${t.fd}`;
}
//@ chunk-s42bpptg.js:700-768 placement
async function isOwnedByCurrentUser(handle) {
  return (await handle.stat()).uid === process.getuid?.();
}
//@ chunk-s42bpptg.js:768-1450 placement
/**
 * 安全地打开（必要时逐级创建）目录：从已存在的上级打开句柄并确认不经过链接、属主正确，再逐级在句柄下 mkdir 并打开；返回 /proc/self/fd 形式路径与释放函数，或失败原因（链接、非属主、不存在等）。
 */
async function openOwnedDirChain(path, createDepth) {
  let missingParts = [];
  let baseDir = path;
  for (let i = 0; i < createDepth; i++) {
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
      let _ = await open(pendingPath, dirOpenFlags);
      pendingPath = undefined;
      await handle.close();
      handle = _;
      if (!(await isOwnedByCurrentUser(handle))) return "not_owned";
    }
    let i = handle;
    handle = undefined;
    return {
      at: fdPath(i),
      release: () => i.close(),
    };
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" && pendingPath === baseDir) return createDepth === 0 ? "absent" : "no_parent";
    if (pendingPath !== undefined && (errnoCode === "ENOTDIR" || errnoCode === "ELOOP"))
      return (await lstat(pendingPath).then(
        (d) => d.isSymbolicLink(),
        () => false,
      ))
        ? "a_link"
        : "not_a_directory";
    return sanitizeErrnoForTelemetry(error) ?? "unknown";
  } finally {
    await handle?.close();
  }
}
//@ chunk-s42bpptg.js:1450-1730 placement
/**
 * 在目录下新建子目录并打开句柄，确认属主与上级相同，返回句柄路径与释放函数。
 */
async function createOwnedSubdir(uploadsDir, r) {
  let n = join(uploadsDir, r);
  await mkdir(n, {
    mode: 448,
  });
  let e = await open(n, dirOpenFlags);
  if (
    !(await Promise.all([e.stat(), stat(uploadsDir)]).then(
      ([a, i]) => a.uid === i.uid,
      () => false,
    ))
  ) {
    await e.close();
    throw Error("the new folder has another owner than the folder it is in");
  }
  return {
    at: fdPath(e),
    release: () => e.close(),
  };
}
//@ chunk-s42bpptg.js:1730-2093 placement
/**
 * 探测已打开目录句柄在改名后是否仍指向同一目录（readlink 与 inode 一致），否则返回 holds_do_not_follow 或错误码。
 */
async function probeNoFollowSupport(t) {
  let r = join(t.at, `.probe-${randomUUID()}`);
  let n = `${r}-moved`;
  let e;
  try {
    await mkdir(r, {
      mode: 448,
    });
    e = await open(r, dirOpenFlags);
    await rename(r, n);
    let o = await readlink(fdPath(e)).catch(() => "");
    let a = await stat(fdPath(e)).catch(() => {
      return;
    });
    return (basename(o) === basename(n) && a?.ino === (await e.stat()).ino) || "holds_do_not_follow";
  } catch (error) {
    return sanitizeErrnoForTelemetry(error) ?? "unknown";
  } finally {
    await e?.close();
    await Promise.allSettled([rmdir(r), rmdir(n)]);
  }
}
//@ chunk-s42bpptg.js:2093-2519 placement
async function ensureAttachmentsDir(t) {
  let localUploadsRoot = getLocalUploadsRoot();
  if (localUploadsRoot === null || dirname(t) !== localUploadsRoot) {
    await mkdir(t, {
      recursive: true,
      mode: 448,
    });
    return {
      at: t,
      release: async () => {},
    };
  }
  let ownedDirChain = await openOwnedDirChain(t, 2);
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
export { createOwnedSubdir, ensureAttachmentsDir, openOwnedDirChain, probeNoFollowSupport };
