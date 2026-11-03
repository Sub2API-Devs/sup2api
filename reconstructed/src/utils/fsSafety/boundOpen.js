/**
 * utils/fsSafety/boundOpen.ts
 *
 * 2.1.316 新增：绑定到权限批准路径的文件打开（/proc/self/fd 核对、不支持时回退）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (6)
 * attribution: placement 6
 */
import { realpath, lstat, readlink, open } from "fs/promises";
import { constants } from "fs";
import { READ_LIMITS, O_NOATIME_FLAG } from "../fsBoundRead.js";
import { getErrnoCode } from "../errors.js";

//@ chunk-t0gq9gyw.js:7930-8222 placement
async function readHandleBounded(e, n, r) {
  let o = n + 1;
  let s = Buffer.alloc(r === undefined ? o : Math.min(Math.max(Number(r) + 1, 1), o));
  let a = 0;
  while (a < o) {
    if (a === s.length) {
      let u = Buffer.alloc(o);
      s.copy(u);
      s = u;
    }
    let { bytesRead } = await e.read(s, a, s.length - a, a);
    if (bytesRead === 0) break;
    a += bytesRead;
  }
  return {
    bytes: s.subarray(0, Math.min(a, n)),
    overLimit: a > n,
  };
}
//@ chunk-t0gq9gyw.js:8222-8264 placement
var boundOpenFsOps = {
  realpath,
  lstat,
  readlink,
};
//@ chunk-t0gq9gyw.js:8264-8651 placement
async function bindCanonicalPathToHandle(e, n, r, o = boundOpenFsOps) {
  let s;
  try {
    s = await o.lstat(r, {
      bigint: true,
    });
  } catch {
    return;
  }
  if (s.dev !== n.dev || s.ino !== n.ino) return;
  try {
    let a = await o.readlink(`/proc/self/fd/${e.fd}`);
    if (!a.startsWith("/") || a.endsWith(" (deleted)")) return;
    let stats = await o.lstat(a, {
      bigint: true,
    });
    if (stats.dev !== n.dev || stats.ino !== n.ino) return;
    return a;
  } catch {
    return;
  }
  try {
    if ((await o.realpath(r)) !== r) return;
  } catch {
    return;
  }
  return r;
}
//@ chunk-t0gq9gyw.js:8651-8741 placement
var OPEN_READ_NOFOLLOW_FLAGS = constants.O_RDONLY | constants.O_NONBLOCK | READ_LIMITS;
var BENIGN_OPEN_ERRNOS = new Set(["EPERM", "EINVAL", "ENOTSUP", "EOPNOTSUPP"]);
//@ chunk-t0gq9gyw.js:8741-8779 placement
async function openRegularFileForRead(e) {
  return open(e, OPEN_READ_NOFOLLOW_FLAGS);
}
//@ chunk-t0gq9gyw.js:8779-8948 placement
async function openRegularFileForReadWithNoAtime(e, n = O_NOATIME_FLAG) {
  if (n !== 0)
    try {
      return {
        handle: await open(e, OPEN_READ_NOFOLLOW_FLAGS | n),
        withNoAtime: true,
      };
    } catch (error) {
      if (!BENIGN_OPEN_ERRNOS.has(getErrnoCode(error) ?? "")) throw error;
    }
  return {
    handle: await openRegularFileForRead(e),
    withNoAtime: false,
  };
}
export {
  openRegularFileForReadWithNoAtime,
  openRegularFileForRead,
  readHandleBounded,
  bindCanonicalPathToHandle,
};
