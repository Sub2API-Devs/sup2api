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
import { lstat, lstat as lstat_2, rename, open, open as open_2, writeFile, unlink, stat } from "fs/promises";
import {
  lstatSync,
  renameSync,
  constants,
  constants as constants_2,
  unlinkSync,
  openSync,
  fstatSync,
  readFileSync,
  closeSync,
  writeFileSync,
  fchmodSync,
  ftruncateSync,
} from "fs";
import { join, join as join_2, basename } from "path";
import { sleep } from "./sleep.js";
import { getErrnoCode } from "./errors.js";
import { copyFileNoFollow, isInPlaceWriteDefault, hardlinkedRefusalError, AI } from "./plugins/safeCopy.js";

/**
 * 生成 <路径>.tmp.<随机> 临时文件名。
 */
//@ chunk-k176arn3.js:3097-3154 placement = atomicWriteToZipCache (0.651)
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
var RETRY_DELAYS = 4,
  ce = 50,
  list = Array.from({ length: RETRY_DELAYS - 1 }, () => ce),
  Ado = [100, 500, 2000],
  int32Array = new Int32Array(new SharedArrayBuffer(4));
//@ chunk-k176arn3.js:3441-3479 placement
function Le(e) {
  Atomics.wait(int32Array, 0, 0, e);
}
//@ chunk-k176arn3.js:3479-3512 placement
function le(e, t, n = RETRY_DELAYS - 1) {
  return !1;
}
//@ chunk-k176arn3.js:3512-3523 placement
var ue = 128;
//@ chunk-k176arn3.js:3523-3597 placement
async function Ce(e) {
  try {
    return ((await lstat(e)).mode & ue) === 0;
  } catch {
    return !1;
  }
}
//@ chunk-k176arn3.js:3597-3783 placement
async function retryTransient(e, t, n = list) {
  let r = !1;
  for (let o = 0; ; o++)
    try {
      return (await e(), r);
    } catch (error) {
      if (le(error, o, n.length)) {
        if (o === 0 && t !== void 0 && (await Ce(t))) throw error;
        ((r = !0), await sleep(n[o]));
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
  return retryTransient(() => n(e, t), t, Ado);
}
//@ chunk-k176arn3.js:3878-3938 placement
function Ie(e) {
  try {
    return (lstatSync(e).mode & ue) === 0;
  } catch {
    return !1;
  }
}
//@ chunk-k176arn3.js:3938-4082 placement
function retryFsOpSync(e, t, n = renameSync) {
  let r = !1;
  for (let o = 0; ; o++)
    try {
      return (n(e, t), r);
    } catch (error) {
      if (le(error, o)) {
        if (o === 0 && Ie(t)) throw error;
        ((r = !0), Le(ce));
        continue;
      }
      throw error;
    }
}
//@ chunk-k176arn3.js:4082-4162 placement
var DISK_FULL_CODES = new Set(["ENOSPC", "EIO", "EDQUOT", "EFBIG"]),
  fe = 67108864,
  O_NONBLOCK = constants.O_NONBLOCK;
//@ chunk-k176arn3.js:4162-4234 placement
async function de(e, t, n = "linux") {
  return (await checkWindowsTarget(e, t, n)).kind === "pass";
}
//@ chunk-k176arn3.js:4234-4448 placement
async function checkWindowsTarget(e, t, n = "linux") {
  if (n !== "win32") return { kind: "pass" };
  try {
    return { kind: (await lstat(e)).isFile() ? "pass" : "refuse" };
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return { kind: t ? "pass" : "refuse" };
    return { kind: "failed", error: error };
  }
}
//@ chunk-k176arn3.js:4448-4560 placement
function isRegularFileOnWindows(e, t, n = "linux") {
  if (n !== "win32") return !0;
  try {
    return lstatSync(e).isFile();
  } catch (error) {
    return t && getErrnoCode(error) === "ENOENT";
  }
}
//@ chunk-k176arn3.js:4560-4994 placement
async function openReadNoFollow(e, t = !1) {
  if (!t && !(await de(e, !0))) return { kind: "unavailable" };
  let n;
  try {
    n = await open(e, constants.O_RDONLY | (t ? 0 : constants.O_NOFOLLOW) | O_NONBLOCK);
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? { kind: "absent" } : { kind: "unavailable" };
  }
  try {
    let stats = await n.stat();
    if (!stats.isFile() || stats.size > fe) return { kind: "unavailable" };
    return { kind: "snapshot", bytes: new Uint8Array(await n.readFile()), mode: stats.mode & 4095 };
  } catch {
    return { kind: "unavailable" };
  } finally {
    await n.close().catch(() => {});
  }
}
//@ chunk-k176arn3.js:4994-5363 placement
async function writeNoFollow(e, t, n = !1) {
  if (!n && !(await de(e, !0))) return !1;
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
    return !1;
  }
  try {
    if (!(await r.stat()).isFile()) return (await r.close().catch(() => {}), !1);
    return (await r.writeFile(t.bytes), await r.chmod(t.mode).catch(() => {}), await r.close(), !0);
  } catch {
    return (await r.close().catch(() => {}), !1);
  }
}
//@ chunk-k176arn3.js:5363-5738 placement
function annotateWriteError(e, t, n) {
  try {
    if (e instanceof Error)
      ((e.message = `${e.message}; ${t !== void 0 ? `new contents preserved at ${t}; ` : ""}${n === "restored" ? "original target restored" : n === "removed" ? "partial target removed" : n === "untouched" ? "target untouched" : "target left partial \u2014 treat contents as torn"}`),
        Object.assign(e, { ...(t !== void 0 && { preservedTmp: t }), targetOutcome: n }));
  } catch {}
  return e;
}
//@ chunk-k176arn3.js:5738-5826 placement
function isUnsupportedFlagError(e) {
  let t = getErrnoCode(e);
  return t === "EINVAL" || t === "ENOTSUP" || t === "EPERM" || t === "ENOSYS";
}
//@ chunk-k176arn3.js:5826-5983 placement
class PublishRefusedError extends Error {
  target;
  constructor(e) {
    super("beforePublish refused the write; nothing was published");
    this.target = e;
    this.name = "PublishRefusedError";
  }
}
//@ chunk-k176arn3.js:5983-6260 placement = isFsInaccessible (0.815)
async function isFsInaccessible(e, t) {
  if (t === void 0) return e;
  try {
    await (await open(t, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)).close();
  } catch (error) {
    switch (getErrnoCode(error)) {
      case "ENOENT":
      case "ELOOP":
      case "ENOTDIR":
        return e;
      case "EACCES":
      case "EPERM":
        if (await isOwnedByOtherUser(t)) return e;
        throw error;
      default:
        throw error;
    }
  }
  return join(t, basename(e));
}
//@ chunk-k176arn3.js:6260-6376 placement
async function isOwnedByOtherUser(e) {
  let t = process.getuid?.();
  if (t === void 0) return !1;
  try {
    return (await lstat(e)).uid !== t;
  } catch {
    return !1;
  }
}
//@ chunk-k176arn3.js:6376-6384 placement
var A = 3;
//@ chunk-k176arn3.js:6384-6502 placement = getUnameSR (0.793)
async function getUnameSR(e, t) {
  if (t !== "win32") return !1;
  try {
    return (await lstat(e), !0);
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? !1 : { cause: error };
  }
}
//@ chunk-k176arn3.js:6502-6677 placement
function exclusiveCreateTakenError(e, t) {
  return Object.assign(
    Error(
      "EEXIST: name already taken (exclusive create)",
      typeof t === "object" ? { cause: t.cause } : void 0,
    ),
    { code: "EEXIST", syscall: "lstat", path: e },
  );
}
//@ chunk-k176arn3.js:6677-6861 placement = tryCreateExclusive (0.782)
async function tryCreateExclusive(e, t, n) {
  for (let r = 1; ; r++) {
    let o = makeTempSiblingPath(e),
      i = await getUnameSR(o, t);
    if (i !== !1) {
      if (r < A) continue;
      throw exclusiveCreateTakenError(o, i);
    }
    try {
      return await n(o);
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST" && r < A) continue;
      throw error;
    }
  }
}
/**
 * 原子方式只在文件不存在时写入（wx 标志，失败清理临时文件）。
 */
//@ chunk-k176arn3.js:6861-7046 placement = writeIfMissing (0.817)
async function writeIfMissing(e, t, n, r = "linux") {
  return tryCreateExclusive(e, r, async (o) => {
    try {
      return (await writeFile(o, t, { encoding: "utf8", mode: n, flag: "wx" }), o);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") await unlink(o).catch(() => {});
      throw error;
    }
  });
}
//@ chunk-k176arn3.js:7046-7096 placement
var he = { exclusive: !0, exactMode: !1, nonBlocking: !0 };
//@ chunk-k176arn3.js:7096-7249 placement
async function copyIntoTemp(e, t, n = "linux") {
  return tryCreateExclusive(t, n, async (r) => {
    try {
      return (await copyFileNoFollow(e, r, he), r);
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
async function writeNewFile(e, t, n, r = "linux") {
  (await assertPathSafeAsync(e, r), await writeFile(e, t, { encoding: "utf8", mode: n, flag: "wx" }));
}
//@ chunk-k176arn3.js:7477-7543 placement = chordToDisplayString (1)
async function assertSafeThenWrite(e, t, n = "linux") {
  (await assertPathSafeAsync(t, n), await copyFileNoFollow(e, t, he));
}
//@ chunk-k176arn3.js:7543-7641 placement = chordToDisplayString (1)
async function assertPathSafeAsync(chord, platform = "linux") {
  let n = await getUnameSR(chord, platform);
  if (n === !0) throw exclusiveCreateTakenError(chord, n);
  if (n !== !1) throw n.cause;
}
//@ chunk-k176arn3.js:7641-7704 placement
async function writeFileAtomic(e, t, n, r) {
  return publishWriteAtomic(e, t, { mode: n, renameFn: r });
}
/**
 * 原子发布写入：写临时文件、可选 fsync、按模式重命名或就地写，处理符号链接与权限。
 */
//@ chunk-k176arn3.js:7704-9868 placement
async function publishWriteAtomic(e, t, n) {
  let {
      mode: mode,
      createMode: createMode,
      exactMode: exactMode,
      flush: flush,
      followSymlinks: followSymlinks,
      inPlaceOnTempCreateRefused: inPlaceOnTempCreateRefused,
      stagingDir: stagingDir,
      renameFn: renameFn,
      beforePublish: beforePublish,
    } = n,
    R = mode ?? createMode,
    P = () => {
      if (beforePublish !== void 0 && !beforePublish()) throw new PublishRefusedError(e);
    },
    E = await isFsInaccessible(e, stagingDir),
    v = followSymlinks === !0 ? 0 : constants.O_NOFOLLOW,
    m,
    N = !1,
    M = !1,
    z = async (p) => {
      let l = await openReadNoFollow(e, followSymlinks === !0),
        h = l.kind === "snapshot" ? l : void 0;
      P();
      let u = await open(e, constants.O_WRONLY | constants.O_CREAT | v | O_NONBLOCK, exactMode ?? R),
        O;
      try {
        O = await u.stat();
      } catch (error) {
        throw (
          await u.close().catch(() => {}),
          (N = p !== void 0),
          annotateWriteError(error, p, "untouched")
        );
      }
      let isCharacterDevice = O.isCharacterDevice();
      if (!O.isFile() && !isCharacterDevice)
        throw (
          await u.close().catch(() => {}),
          Object.assign(Error("refusing the in-place arm on a non-regular target"), {
            code: "ENXIO",
            path: e,
          })
        );
      if (!isCharacterDevice && O.nlink > 1 && isInPlaceWriteDefault())
        throw (await u.close().catch(() => {}), hardlinkedRefusalError(e, O.nlink));
      if (beforePublish !== void 0 && !beforePublish()) {
        if ((await u.close().catch(() => {}), l.kind === "absent" && O.size === 0 && !isCharacterDevice))
          await unlink(e).catch(() => {});
        throw new PublishRefusedError(e);
      }
      let Q = !1;
      try {
        if (!isCharacterDevice) (await u.truncate(0), (Q = !0));
        await u.writeFile(t, { encoding: "utf8" });
        let b = isCharacterDevice ? void 0 : (exactMode ?? (l.kind !== "absent" ? mode : void 0));
        if (b !== void 0) await u.chmod(b).catch(() => {});
        if (flush === !0)
          try {
            await u.sync();
          } catch (error) {
            if (!isUnsupportedFlagError(error)) throw error;
          }
        await u.close();
      } catch (error) {
        if ((await u.close().catch(() => {}), !Q))
          throw ((N = p !== void 0), annotateWriteError(error, p, "untouched"));
        N = p !== void 0;
        let Ee =
          h !== void 0 && (await writeNoFollow(e, h, followSymlinks === !0))
            ? "restored"
            : (await unlink(e).then(
                  () => !0,
                  (ye) => getErrnoCode(ye) === "ENOENT",
                ))
              ? "removed"
              : "partial";
        throw annotateWriteError(error, p, Ee);
      }
      let q = p ?? m;
      if (q !== void 0) await unlink(q).catch(() => {});
    };
  try {
    try {
      if (exactMode !== void 0 || flush === !0) {
        let l = await createExclusiveTemp(E, exactMode ?? R),
          fh = l.fh;
        m = l.tmp;
        let u = !1,
          O;
        try {
          if ((await fh.writeFile(t, { encoding: "utf8" }), exactMode !== void 0))
            try {
              await fh.chmod(exactMode);
            } catch (error) {
              if (!isUnsupportedFlagError(error)) throw error;
            }
          if (flush === !0)
            try {
              await fh.sync();
            } catch (error) {
              if (!isUnsupportedFlagError(error)) throw error;
            }
        } catch (error) {
          ((u = !0), (O = error));
        }
        if (!u) M = !0;
        try {
          await fh.close();
        } catch (error) {
          if (!u) throw ((N = !0), annotateWriteError(error, m, "untouched"));
        }
        if (u) throw O;
      } else ((m = await writeIfMissing(E, t, R)), (M = !0));
    } catch (error) {
      if (inPlaceOnTempCreateRefused !== !0) throw error;
      if (M) throw error;
      if (getErrnoCode(error) !== "EACCES") throw error;
      if (
        !(await stat(e).then(
          () => !0,
          () => !1,
        ))
      )
        throw error;
      await z(void 0);
      return;
    }
    if (m === void 0) throw Error("staging block exited without a staging file");
    let p = m;
    try {
      let l = renameFn ?? rename;
      await retryFsOp(p, e, (h, u) => (P(), l(h, u)));
    } catch (error) {
      let h = getErrnoCode(error);
      if (h === void 0 || !AI.has(h)) throw error;
      await z(p);
    }
  } catch (error) {
    if (m !== void 0 && !N) await unlink(m).catch(() => {});
    throw error;
  }
}
//@ chunk-k176arn3.js:9868-9900 placement
function B(e) {
  try {
    unlinkSync(e);
  } catch {}
}
//@ chunk-k176arn3.js:9900-10265 placement
function openReadNoFollowSync(e) {
  if (!isRegularFileOnWindows(e, !0)) return { kind: "unavailable" };
  let t;
  try {
    t = openSync(e, constants.O_RDONLY | constants.O_NOFOLLOW | O_NONBLOCK);
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? { kind: "absent" } : { kind: "unavailable" };
  }
  try {
    let n = fstatSync(t);
    if (!n.isFile() || n.size > fe) return { kind: "unavailable" };
    return { kind: "snapshot", bytes: new Uint8Array(readFileSync(t)), mode: n.mode & 4095 };
  } catch {
    return { kind: "unavailable" };
  } finally {
    try {
      closeSync(t);
    } catch {}
  }
}
//@ chunk-k176arn3.js:10265-10537 placement
function writeNoFollowSync(e, t) {
  if (!isRegularFileOnWindows(e, !0)) return !1;
  let n;
  try {
    n = openSync(
      e,
      constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW | O_NONBLOCK,
      t.mode,
    );
  } catch {
    return !1;
  }
  let r = !1;
  try {
    if (!fstatSync(n).isFile()) return ((r = !0), closeSync(n), !1);
    writeFileSync(n, t.bytes);
    try {
      fchmodSync(n, t.mode);
    } catch {}
    return ((r = !0), closeSync(n), !0);
  } catch {
    if (!r)
      try {
        closeSync(n);
      } catch {}
    return !1;
  }
}
//@ chunk-k176arn3.js:10537-10643 placement = getUnameSR (0.793)
function getUnameSR_2(e, t) {
  if (t !== "win32") return !1;
  try {
    return (lstatSync(e), !0);
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? !1 : { cause: error };
  }
}
//@ chunk-k176arn3.js:10643-10730 placement = chordToDisplayString (1)
function assertPathSafeSync(chord, platform = "linux") {
  let n = getUnameSR_2(chord, platform);
  if (n === !0) throw exclusiveCreateTakenError(chord, n);
  if (n !== !1) throw n.cause;
}
//@ chunk-k176arn3.js:10730-10962 placement = writeIfMissing (0.817)
function writeIfMissing_2(e, t, n, r = "linux") {
  for (let o = 1; ; o++) {
    let i = makeTempSiblingPath(e),
      s = getUnameSR_2(i, r);
    if (s !== !1) {
      if (o < A) continue;
      throw exclusiveCreateTakenError(i, s);
    }
    try {
      return (writeFileSync(i, t, { encoding: "utf8", mode: n, flag: "wx" }), i);
    } catch (error) {
      if (getErrnoCode(error) === "EEXIST") {
        if (o < A) continue;
        throw error;
      }
      throw (B(i), error);
    }
  }
}
//@ chunk-k176arn3.js:10962-11863 placement
function writeAndPublishSync(e, t, n, r) {
  let o = !1,
    i;
  try {
    i = writeIfMissing_2(e, t, n);
    try {
      retryFsOpSync(i, e, r);
    } catch (error) {
      let f = getErrnoCode(error);
      if (f === void 0 || !AI.has(f)) throw error;
      let c = openReadNoFollowSync(e),
        g = c.kind === "snapshot" ? c : void 0,
        w = openSync(e, constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW | O_NONBLOCK, n),
        y = !1;
      {
        let E;
        try {
          E = fstatSync(w);
        } catch (error) {
          try {
            closeSync(w);
          } catch {}
          throw ((o = !0), annotateWriteError(error, i, "untouched"));
        }
        if (((y = E.isCharacterDevice()), !E.isFile() && !y)) {
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
      let R = !1,
        P = !1;
      try {
        if (!y) (ftruncateSync(w, 0), (P = !0));
        if ((writeFileSync(w, t, { encoding: "utf8" }), n !== void 0 && c.kind !== "absent" && !y))
          try {
            fchmodSync(w, n);
          } catch {}
        ((R = !0), closeSync(w));
      } catch (error) {
        if (!R)
          try {
            closeSync(w);
          } catch {}
        if (!P) throw ((o = !0), annotateWriteError(error, i, "untouched"));
        o = !0;
        let v = g !== void 0 && writeNoFollowSync(e, g),
          m = "partial";
        if (v) m = "restored";
        else
          try {
            (unlinkSync(e), (m = "removed"));
          } catch (error) {
            m = getErrnoCode(error) === "ENOENT" ? "removed" : "partial";
          }
        throw annotateWriteError(error, i, m);
      }
      B(i);
    }
  } catch (error) {
    if (i !== void 0 && !o) B(i);
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
  Ado,
  PublishRefusedError,
};
