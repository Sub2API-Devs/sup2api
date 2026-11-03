/**
 * utils/atomicPublishWrite.ts
 *
 * 2.1.316 新增：原子发布写入与瞬时错误重试
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-k176arn3.js (44)
 * attribution: placement 44
 */
import { randomBytes } from "crypto";
import { lstat, rename, open, writeFile, unlink, stat } from "fs/promises";
import {
  lstatSync,
  renameSync,
  constants,
  unlinkSync,
  openSync,
  fstatSync,
  readFileSync,
  closeSync,
  writeFileSync,
  fchmodSync,
  ftruncateSync,
} from "fs";
import { join, basename } from "path";
import { sleep } from "./sleep.js";
import { getErrnoCode } from "./errors.js";
import {
  copyFileNoFollow,
  isInPlaceWriteDefault,
  hardlinkedRefusalError,
  ATOMIC_WRITE_ERRNOS,
} from "./plugins/safeCopy.js";

//@ chunk-k176arn3.js:3097-3154 placement = atomicWriteToZipCache (0.651)
/**
 * 生成 <路径>.tmp.<随机> 临时文件名。
 */
function makeTempSiblingPath(e) {
  return `${e}.tmp.${randomBytes(4).toString("hex")}`;
}
//@ chunk-k176arn3.js:3154-3253 placement
function isOwnTempName(e, t) {
  let n = `${t}.tmp.`;
  return e.startsWith(n) && /^[0-9a-f]{8}$/.test(e.slice(n.length));
}
//@ chunk-k176arn3.js:3253-3327 placement
function isTempFileName(e) {
  return /\.tmp\.(?:[0-9a-f]{8}|\d+\.[0-9a-f]{12})$/.test(e);
}
//@ chunk-k176arn3.js:3327-3441 placement
/**
 * 重试的基础等待时长（50 毫秒）。
 */
var RETRY_DELAYS = 4;
var RETRY_BASE_DELAY_MS = 50;
var list = Array.from(
  {
    length: RETRY_DELAYS - 1,
  },
  () => RETRY_BASE_DELAY_MS,
);
var LONG_RETRY_DELAYS_MS = [100, 500, 2000];
var int32Array = new Int32Array(new SharedArrayBuffer(4));
//@ chunk-k176arn3.js:3441-3479 placement
/**
 * 同步等待给定毫秒（Atomics.wait）。
 */
function sleepSync(e) {
  Atomics.wait(int32Array, 0, 0, e);
}
//@ chunk-k176arn3.js:3479-3512 placement
/**
 * 判断错误是否可重试（当前恒返回 false）。
 */
function isRetryableError(error, t, n = RETRY_DELAYS - 1) {
  return false;
}
//@ chunk-k176arn3.js:3512-3523 placement
/**
 * 文件的“其他人可执行”权限位。
 */
var S_IXOTH = 128;
//@ chunk-k176arn3.js:3523-3597 placement
/**
 * 异步判断文件是否不可执行（读不到时视为不可执行）。
 */
async function isNotExecutableAsync(e) {
  try {
    return ((await lstat(e)).mode & S_IXOTH) === 0;
  } catch {
    return false;
  }
}
//@ chunk-k176arn3.js:3597-3783 placement
async function retryTransient(e, t, n = list) {
  let r = false;
  for (let idx = 0; ; idx++)
    try {
      await e();
      return r;
    } catch (error) {
      if (isRetryableError(error, idx, n.length)) {
        if (idx === 0 && t !== undefined && (await isNotExecutableAsync(t))) throw error;
        r = true;
        await sleep(n[idx]);
        continue;
      }
      throw error;
    }
}
//@ chunk-k176arn3.js:3783-3828 placement
function retryFsOp(e, t, n = rename) {
  return retryTransient(() => n(e, t), t);
}
//@ chunk-k176arn3.js:3828-3878 placement
function retryFsOpLong(e, t, n = rename) {
  return retryTransient(() => n(e, t), t, LONG_RETRY_DELAYS_MS);
}
//@ chunk-k176arn3.js:3878-3938 placement
/**
 * 同步判断文件是否不可执行（读不到视为不可执行）。
 */
function isNotExecutableSync(e) {
  try {
    return (lstatSync(e).mode & S_IXOTH) === 0;
  } catch {
    return false;
  }
}
//@ chunk-k176arn3.js:3938-4082 placement
function retryFsOpSync(e, t, n = renameSync) {
  let r = false;
  for (let idx = 0; ; idx++)
    try {
      n(e, t);
      return r;
    } catch (error) {
      if (isRetryableError(error, idx)) {
        if (idx === 0 && isNotExecutableSync(t)) throw error;
        r = true;
        sleepSync(RETRY_BASE_DELAY_MS);
        continue;
      }
      throw error;
    }
}
//@ chunk-k176arn3.js:4082-4162 placement
/**
 * 复制或读取文件时的大小上限（64 MiB）。
 */
var DISK_FULL_CODES = new Set(["ENOSPC", "EIO", "EDQUOT", "EFBIG"]);
var MAX_COPY_BYTES = 67108864;
var O_NONBLOCK = constants.O_NONBLOCK;
//@ chunk-k176arn3.js:4162-4234 placement
/**
 * 判断 Windows 写目标检查是否通过。
 */
async function isWindowsTargetOk(e, t, n = "linux") {
  return (await checkWindowsTarget(e, t, n)).kind === "pass";
}
//@ chunk-k176arn3.js:4234-4448 placement
async function checkWindowsTarget(e, t, n = "linux") {
  if (n !== "win32")
    return {
      kind: "pass",
    };
  try {
    return {
      kind: (await lstat(e)).isFile() ? "pass" : "refuse",
    };
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return {
        kind: t ? "pass" : "refuse",
      };
    return {
      kind: "failed",
      error,
    };
  }
}
//@ chunk-k176arn3.js:4448-4560 placement
function isRegularFileOnWindows(e, t, n = "linux") {
  if (n !== "win32") return true;
  try {
    return lstatSync(e).isFile();
  } catch (error) {
    return t && getErrnoCode(error) === "ENOENT";
  }
}
//@ chunk-k176arn3.js:4560-4994 placement
async function openReadNoFollow(e, t = false) {
  if (!t && !(await isWindowsTargetOk(e, true)))
    return {
      kind: "unavailable",
    };
  let n;
  try {
    n = await open(e, constants.O_RDONLY | (t ? 0 : constants.O_NOFOLLOW) | O_NONBLOCK);
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? {
          kind: "absent",
        }
      : {
          kind: "unavailable",
        };
  }
  try {
    let stats = await n.stat();
    if (!stats.isFile() || stats.size > MAX_COPY_BYTES)
      return {
        kind: "unavailable",
      };
    return {
      kind: "snapshot",
      bytes: new Uint8Array(await n.readFile()),
      mode: stats.mode & 4095,
    };
  } catch {
    return {
      kind: "unavailable",
    };
  } finally {
    await n.close().catch(() => {});
  }
}
//@ chunk-k176arn3.js:4994-5363 placement
async function writeNoFollow(e, t, n = false) {
  if (!n && !(await isWindowsTargetOk(e, true))) return false;
  let r;
  try {
    r = await open(
      e,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_TRUNC |
        (n ? 0 : constants.O_NOFOLLOW) |
        O_NONBLOCK,
      t.mode,
    );
  } catch {
    return false;
  }
  try {
    if (!(await r.stat()).isFile()) {
      await r.close().catch(() => {});
      return false;
    }
    await r.writeFile(t.bytes);
    await r.chmod(t.mode).catch(() => {});
    await r.close();
    return true;
  } catch {
    await r.close().catch(() => {});
    return false;
  }
}
//@ chunk-k176arn3.js:5363-5738 placement
function annotateWriteError(error, t, n) {
  try {
    if (error instanceof Error) {
      error.message = `${error.message}; ${t !== undefined ? `new contents preserved at ${t}; ` : ""}${n === "restored" ? "original target restored" : n === "removed" ? "partial target removed" : n === "untouched" ? "target untouched" : "target left partial \u2014 treat contents as torn"}`;
      Object.assign(error, {
        ...(t !== undefined && {
          preservedTmp: t,
        }),
        targetOutcome: n,
      });
    }
  } catch {}
  return error;
}
//@ chunk-k176arn3.js:5738-5826 placement
function isUnsupportedFlagError(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "EINVAL" || errnoCode === "ENOTSUP" || errnoCode === "EPERM" || errnoCode === "ENOSYS";
}
//@ chunk-k176arn3.js:5826-5983 placement
class PublishRefusedError extends Error {
  target;
  constructor(target) {
    super("beforePublish refused the write; nothing was published");
    this.target = target;
    this.name = "PublishRefusedError";
  }
}
//@ chunk-k176arn3.js:5983-6260 placement = isFsInaccessible (0.815)
async function isFsInaccessible(e, stagingDir) {
  if (stagingDir === undefined) return e;
  try {
    await (await open(stagingDir, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)).close();
  } catch (error) {
    switch (getErrnoCode(error)) {
      case "ENOENT":
      case "ELOOP":
      case "ENOTDIR":
        return e;
      case "EACCES":
      case "EPERM":
        if (await isOwnedByOtherUser(stagingDir)) return e;
        throw error;
      default:
        throw error;
    }
  }
  return join(stagingDir, basename(e));
}
//@ chunk-k176arn3.js:6260-6376 placement
async function isOwnedByOtherUser(e) {
  let t = process.getuid?.();
  if (t === undefined) return false;
  try {
    return (await lstat(e)).uid !== t;
  } catch {
    return false;
  }
}
//@ chunk-k176arn3.js:6376-6384 placement
/**
 * 原子发布重命名的尝试次数（3）。
 */
var MAX_PUBLISH_RENAME_ATTEMPTS = 3;
//@ chunk-k176arn3.js:6384-6502 placement = getUnameSR (0.793)
async function getUnameSR(e, t) {
  if (t !== "win32") return false;
  try {
    await lstat(e);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? false
      : {
          cause: error,
        };
  }
}
//@ chunk-k176arn3.js:6502-6677 placement
function exclusiveCreateTakenError(path, unameSR) {
  return Object.assign(
    Error(
      "EEXIST: name already taken (exclusive create)",
      typeof unameSR === "object"
        ? {
            cause: unameSR.cause,
          }
        : undefined,
    ),
    {
      code: "EEXIST",
      syscall: "lstat",
      path,
    },
  );
}
//@ chunk-k176arn3.js:6677-6861 placement = tryCreateExclusive (0.782)
async function tryCreateExclusive(e, t, n) {
  for (let idx = 1; ; idx++) {
    let tempSiblingPath = makeTempSiblingPath(e);
    let unameSR = await getUnameSR(tempSiblingPath, t);
    if (unameSR !== false) {
      if (idx < MAX_PUBLISH_RENAME_ATTEMPTS) continue;
      throw exclusiveCreateTakenError(tempSiblingPath, unameSR);
    }
    try {
      return await n(tempSiblingPath);
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST" && idx < MAX_PUBLISH_RENAME_ATTEMPTS) continue;
      throw error;
    }
  }
}
//@ chunk-k176arn3.js:6861-7046 placement = writeIfMissing (0.817)
/**
 * 原子方式只在文件不存在时写入（wx 标志，失败清理临时文件）。
 */
async function writeIfMissing(e, content, mode, r = "linux") {
  return tryCreateExclusive(e, r, async (o) => {
    try {
      await writeFile(o, content, {
        encoding: "utf8",
        mode,
        flag: "wx",
      });
      return o;
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") await unlink(o).catch(() => {});
      throw error;
    }
  });
}
//@ chunk-k176arn3.js:7046-7096 placement
/**
 * 复制文件时使用的独占、非阻塞、非精确模式标志。
 */
var COPY_EXCLUSIVE_FLAGS = {
  exclusive: true,
  exactMode: false,
  nonBlocking: true,
};
//@ chunk-k176arn3.js:7096-7249 placement
async function copyIntoTemp(e, t, n = "linux") {
  return tryCreateExclusive(t, n, async (r) => {
    try {
      await copyFileNoFollow(e, r, COPY_EXCLUSIVE_FLAGS);
      return r;
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") await unlink(r).catch(() => {});
      throw error;
    }
  });
}
//@ chunk-k176arn3.js:7249-7379 placement
async function createExclusiveTemp(e, t, n = "linux") {
  return tryCreateExclusive(e, n, async (r) => ({
    fh: await open(r, n === "win32" ? "wx" : constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, t),
    tmp: r,
  }));
}
//@ chunk-k176arn3.js:7379-7477 placement
async function writeNewFile(e, t, mode, r = "linux") {
  await assertPathSafeAsync(e, r);
  await writeFile(e, t, {
    encoding: "utf8",
    mode,
    flag: "wx",
  });
}
//@ chunk-k176arn3.js:7477-7543 placement = chordToDisplayString (1)
async function assertSafeThenWrite(e, platform, n = "linux") {
  await assertPathSafeAsync(platform, n);
  await copyFileNoFollow(e, platform, COPY_EXCLUSIVE_FLAGS);
}
//@ chunk-k176arn3.js:7543-7641 placement = chordToDisplayString (1)
async function assertPathSafeAsync(chord, platform = "linux") {
  let unameSR = await getUnameSR(chord, platform);
  if (unameSR === true) throw exclusiveCreateTakenError(chord, unameSR);
  if (unameSR !== false) throw unameSR.cause;
}
//@ chunk-k176arn3.js:7641-7704 placement
async function writeFileAtomic(e, t, mode, renameFn) {
  return publishWriteAtomic(e, t, {
    mode,
    renameFn,
  });
}
//@ chunk-k176arn3.js:7704-9868 placement
/**
 * 原子发布写入：写临时文件、可选 fsync、按模式重命名或就地写，处理符号链接与权限。
 */
async function publishWriteAtomic(target, t, n) {
  let {
    mode,
    createMode,
    exactMode,
    flush,
    followSymlinks,
    inPlaceOnTempCreateRefused,
    stagingDir,
    renameFn,
    beforePublish,
  } = n;
  let R = mode ?? createMode;
  let P = () => {
    if (beforePublish !== undefined && !beforePublish()) throw new PublishRefusedError(target);
  };
  let E = await isFsInaccessible(target, stagingDir);
  let O_NOFOLLOW = followSymlinks === true ? 0 : constants.O_NOFOLLOW;
  let m;
  let N = false;
  let M = false;
  let z = async (p) => {
    let readNoFollow = await openReadNoFollow(target, followSymlinks === true);
    let h = readNoFollow.kind === "snapshot" ? readNoFollow : undefined;
    P();
    let u = await open(
      target,
      constants.O_WRONLY | constants.O_CREAT | O_NOFOLLOW | O_NONBLOCK,
      exactMode ?? R,
    );
    let O;
    try {
      O = await u.stat();
    } catch (error) {
      await u.close().catch(() => {});
      N = p !== undefined;
      throw annotateWriteError(error, p, "untouched");
    }
    let d = O.isCharacterDevice();
    if (!O.isFile() && !d) {
      await u.close().catch(() => {});
      throw Object.assign(Error("refusing the in-place arm on a non-regular target"), {
        code: "ENXIO",
        path: target,
      });
    }
    if (!d && O.nlink > 1 && isInPlaceWriteDefault()) {
      await u.close().catch(() => {});
      throw hardlinkedRefusalError(target, O.nlink);
    }
    if (beforePublish !== undefined && !beforePublish()) {
      await u.close().catch(() => {});
      if (readNoFollow.kind === "absent" && O.size === 0 && !d) await unlink(target).catch(() => {});
      throw new PublishRefusedError(target);
    }
    let Q = false;
    try {
      if (!d) {
        await u.truncate(0);
        Q = true;
      }
      await u.writeFile(t, {
        encoding: "utf8",
      });
      let b = d ? undefined : (exactMode ?? (readNoFollow.kind !== "absent" ? mode : undefined));
      if (b !== undefined) await u.chmod(b).catch(() => {});
      if (flush === true)
        try {
          await u.sync();
        } catch (error) {
          if (!isUnsupportedFlagError(error)) throw error;
        }
      await u.close();
    } catch (error) {
      await u.close().catch(() => {});
      if (!Q) {
        N = p !== undefined;
        throw annotateWriteError(error, p, "untouched");
      }
      N = p !== undefined;
      let Ee =
        h !== undefined && (await writeNoFollow(target, h, followSymlinks === true))
          ? "restored"
          : (await unlink(target).then(
                () => true,
                (error) => getErrnoCode(error) === "ENOENT",
              ))
            ? "removed"
            : "partial";
      throw annotateWriteError(error, p, Ee);
    }
    let q = p ?? m;
    if (q !== undefined) await unlink(q).catch(() => {});
  };
  try {
    try {
      if (exactMode !== undefined || flush === true) {
        let exclusiveTemp = await createExclusiveTemp(E, exactMode ?? R);
        let fh = exclusiveTemp.fh;
        m = exclusiveTemp.tmp;
        let u = false;
        let O;
        try {
          await fh.writeFile(t, {
            encoding: "utf8",
          });
          if (exactMode !== undefined)
            try {
              await fh.chmod(exactMode);
            } catch (error) {
              if (!isUnsupportedFlagError(error)) throw error;
            }
          if (flush === true)
            try {
              await fh.sync();
            } catch (error) {
              if (!isUnsupportedFlagError(error)) throw error;
            }
        } catch (error) {
          u = true;
          O = error;
        }
        if (!u) M = true;
        try {
          await fh.close();
        } catch (error) {
          if (!u) {
            N = true;
            throw annotateWriteError(error, m, "untouched");
          }
        }
        if (u) throw O;
      } else {
        m = await writeIfMissing(E, t, R);
        M = true;
      }
    } catch (error) {
      if (inPlaceOnTempCreateRefused !== true) throw error;
      if (M) throw error;
      if (getErrnoCode(error) !== "EACCES") throw error;
      if (
        !(await stat(target).then(
          () => true,
          () => false,
        ))
      )
        throw error;
      await z(undefined);
      return;
    }
    if (m === undefined) throw Error("staging block exited without a staging file");
    let p = m;
    try {
      let l = renameFn ?? rename;
      await retryFsOp(p, target, (h, u) => {
        P();
        return l(h, u);
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === undefined || !ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
      await z(p);
    }
  } catch (error) {
    if (m !== undefined && !N) await unlink(m).catch(() => {});
    throw error;
  }
}
//@ chunk-k176arn3.js:9868-9900 placement
/**
 * 删除文件并吞掉所有错误。
 */
function unlinkIgnoringErrors(e) {
  try {
    unlinkSync(e);
  } catch {}
}
//@ chunk-k176arn3.js:9900-10265 placement
function openReadNoFollowSync(e) {
  if (!isRegularFileOnWindows(e, true))
    return {
      kind: "unavailable",
    };
  let t;
  try {
    t = openSync(e, constants.O_RDONLY | constants.O_NOFOLLOW | O_NONBLOCK);
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? {
          kind: "absent",
        }
      : {
          kind: "unavailable",
        };
  }
  try {
    let n = fstatSync(t);
    if (!n.isFile() || n.size > MAX_COPY_BYTES)
      return {
        kind: "unavailable",
      };
    return {
      kind: "snapshot",
      bytes: new Uint8Array(readFileSync(t)),
      mode: n.mode & 4095,
    };
  } catch {
    return {
      kind: "unavailable",
    };
  } finally {
    try {
      closeSync(t);
    } catch {}
  }
}
//@ chunk-k176arn3.js:10265-10537 placement
function writeNoFollowSync(e, t) {
  if (!isRegularFileOnWindows(e, true)) return false;
  let n;
  try {
    n = openSync(
      e,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW | O_NONBLOCK,
      t.mode,
    );
  } catch {
    return false;
  }
  let r = false;
  try {
    if (!fstatSync(n).isFile()) {
      r = true;
      closeSync(n);
      return false;
    }
    writeFileSync(n, t.bytes);
    try {
      fchmodSync(n, t.mode);
    } catch {}
    r = true;
    closeSync(n);
    return true;
  } catch {
    if (!r)
      try {
        closeSync(n);
      } catch {}
    return false;
  }
}
//@ chunk-k176arn3.js:10537-10643 placement = getUnameSR (0.793)
function getUnameSR_2(e, t) {
  if (t !== "win32") return false;
  try {
    lstatSync(e);
    return true;
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? false
      : {
          cause: error,
        };
  }
}
//@ chunk-k176arn3.js:10643-10730 placement = chordToDisplayString (1)
function assertPathSafeSync(chord, platform = "linux") {
  let unameSR = getUnameSR_2(chord, platform);
  if (unameSR === true) throw exclusiveCreateTakenError(chord, unameSR);
  if (unameSR !== false) throw unameSR.cause;
}
//@ chunk-k176arn3.js:10730-10962 placement = writeIfMissing (0.817)
function writeIfMissing_2(e, t, mode, r = "linux") {
  for (let idx = 1; ; idx++) {
    let tempSiblingPath = makeTempSiblingPath(e);
    let unameSR = getUnameSR_2(tempSiblingPath, r);
    if (unameSR !== false) {
      if (idx < MAX_PUBLISH_RENAME_ATTEMPTS) continue;
      throw exclusiveCreateTakenError(tempSiblingPath, unameSR);
    }
    try {
      writeFileSync(tempSiblingPath, t, {
        encoding: "utf8",
        mode,
        flag: "wx",
      });
      return tempSiblingPath;
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") {
        if (idx < MAX_PUBLISH_RENAME_ATTEMPTS) continue;
        throw error;
      }
      unlinkIgnoringErrors(tempSiblingPath);
      throw error;
    }
  }
}
//@ chunk-k176arn3.js:10962-11863 placement
function writeAndPublishSync(e, t, mode, r) {
  let o = false;
  let i;
  try {
    i = writeIfMissing_2(e, t, mode);
    try {
      retryFsOpSync(i, e, r);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === undefined || !ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
      let readNoFollow = openReadNoFollowSync(e);
      let g = readNoFollow.kind === "snapshot" ? readNoFollow : undefined;
      let w = openSync(e, constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW | O_NONBLOCK, mode);
      let y = false;
      {
        let E;
        try {
          E = fstatSync(w);
        } catch (error) {
          try {
            closeSync(w);
          } catch {}
          o = true;
          throw annotateWriteError(error, i, "untouched");
        }
        y = E.isCharacterDevice();
        if (!E.isFile() && !y) {
          try {
            closeSync(w);
          } catch {}
          throw Object.assign(Error("refusing the in-place arm on a non-regular target"), {
            code: "ENXIO",
            path: e,
          });
        }
        if (!y && E.nlink > 1 && isInPlaceWriteDefault()) {
          try {
            closeSync(w);
          } catch {}
          throw hardlinkedRefusalError(e, E.nlink);
        }
      }
      let R = false;
      let P = false;
      try {
        if (!y) {
          ftruncateSync(w, 0);
          P = true;
        }
        writeFileSync(w, t, {
          encoding: "utf8",
        });
        if (mode !== undefined && readNoFollow.kind !== "absent" && !y)
          try {
            fchmodSync(w, mode);
          } catch {}
        R = true;
        closeSync(w);
      } catch (error) {
        if (!R)
          try {
            closeSync(w);
          } catch {}
        if (!P) {
          o = true;
          throw annotateWriteError(error, i, "untouched");
        }
        o = true;
        let v = g !== undefined && writeNoFollowSync(e, g);
        let m = "partial";
        if (v) m = "restored";
        else
          try {
            unlinkSync(e);
            m = "removed";
          } catch (error) {
            m = getErrnoCode(error) === "ENOENT" ? "removed" : "partial";
          }
        throw annotateWriteError(error, i, m);
      }
      unlinkIgnoringErrors(i);
    }
  } catch (error) {
    if (i !== undefined && !o) unlinkIgnoringErrors(i);
    throw error;
  }
}
export {
  makeTempSiblingPath,
  retryFsOp,
  isOwnTempName,
  writeFileAtomic,
  O_NONBLOCK,
  writeIfMissing,
  assertPathSafeAsync,
  writeNewFile,
  retryFsOpSync,
  publishWriteAtomic,
  isTempFileName,
  retryTransient,
  writeAndPublishSync,
  DISK_FULL_CODES,
  isUnsupportedFlagError,
  assertPathSafeSync,
  copyIntoTemp,
  assertSafeThenWrite,
  checkWindowsTarget,
  retryFsOpLong,
  LONG_RETRY_DELAYS_MS,
  PublishRefusedError,
};
