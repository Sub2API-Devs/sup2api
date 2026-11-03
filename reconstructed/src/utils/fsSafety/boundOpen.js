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
import {
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
} from "fs/promises";
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
} from "fs";
import { READ_LIMITS, _Oi } from "../fsBoundRead.js";
import { getErrnoCode } from "../errors.js";

//@ chunk-t0gq9gyw.js:7930-8222 placement
async function readHandleBounded(e, n, r) {
  let o = n + 1,
    alloc = Buffer.alloc(r === void 0 ? o : Math.min(Math.max(Number(r) + 1, 1), o)),
    a = 0;
  while (a < o) {
    if (a === alloc.length) {
      let alloc_2 = Buffer.alloc(o);
      (alloc.copy(alloc_2), (alloc = alloc_2));
    }
    let { bytesRead: bytesRead } = await e.read(alloc, a, alloc.length - a, a);
    if (bytesRead === 0) break;
    a += bytesRead;
  }
  return { bytes: alloc.subarray(0, Math.min(a, n)), overLimit: a > n };
}
//@ chunk-t0gq9gyw.js:8222-8264 placement
var ci = { realpath: realpath_2, lstat: lstat_2, readlink: readlink };
//@ chunk-t0gq9gyw.js:8264-8651 placement
async function bindCanonicalPathToHandle(e, n, r, o = ci) {
  let s;
  try {
    s = await o.lstat(r, { bigint: !0 });
  } catch {
    return;
  }
  if (s.dev !== n.dev || s.ino !== n.ino) return;
  try {
    let readlink = await o.readlink(`/proc/self/fd/${e.fd}`);
    if (!readlink.startsWith("/") || readlink.endsWith(" (deleted)")) return;
    let stats = await o.lstat(readlink, { bigint: !0 });
    if (stats.dev !== n.dev || stats.ino !== n.ino) return;
    return readlink;
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
var Gt = constants_4.O_RDONLY | constants_4.O_NONBLOCK | READ_LIMITS,
  ui = new Set(["EPERM", "EINVAL", "ENOTSUP", "EOPNOTSUPP"]);
//@ chunk-t0gq9gyw.js:8741-8779 placement
async function openRegularFileForRead(e) {
  return open_2(e, Gt);
}
//@ chunk-t0gq9gyw.js:8779-8948 placement
async function openRegularFileForReadWithNoAtime(e, n = _Oi) {
  if (n !== 0)
    try {
      return { handle: await open_2(e, Gt | n), withNoAtime: !0 };
    } catch (error) {
      if (!ui.has(getErrnoCode(error) ?? "")) throw error;
    }
  return { handle: await openRegularFileForRead(e), withNoAtime: !1 };
}

export {
  openRegularFileForReadWithNoAtime,
  openRegularFileForRead,
  readHandleBounded,
  bindCanonicalPathToHandle,
};
