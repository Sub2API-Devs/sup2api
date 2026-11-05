/**
 * utils/fsSafety/boundOpen.ts
 *
 * 2.1.316 新增：绑定到权限批准路径的文件打开（/proc/self/fd 核对、不支持时回退）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-85eyj5gy.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { realpath, lstat, readlink, open } from "fs/promises";
import { constants } from "fs";
import { READ_LIMITS, O_NOATIME_FLAG } from "../fsBoundRead.js";
import { getErrnoCode } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-85eyj5gy.js:8000-8292 placement
async function readHandleBounded(handle, maxBytes, limitBytes) {
  let bufferSize = maxBytes + 1;
  let buffer = Buffer.alloc(
    limitBytes === undefined ? bufferSize : Math.min(Math.max(Number(limitBytes) + 1, 1), bufferSize),
  );
  let totalRead = 0;
  while (totalRead < bufferSize) {
    if (totalRead === buffer.length) {
      let grownBuffer = Buffer.alloc(bufferSize);
      buffer.copy(grownBuffer);
      buffer = grownBuffer;
    }
    let { bytesRead } = await handle.read(buffer, totalRead, buffer.length - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return {
    bytes: buffer.subarray(0, Math.min(totalRead, maxBytes)),
    overLimit: totalRead > maxBytes,
  };
}
//@ chunk-85eyj5gy.js:8292-8334 placement
var boundOpenFsOps = {
  realpath,
  lstat,
  readlink,
};
//@ chunk-85eyj5gy.js:8334-8721 placement
async function bindCanonicalPathToHandle(handle, expectedIdentity, filePath, fsImpl = boundOpenFsOps) {
  let pathStats;
  try {
    pathStats = await fsImpl.lstat(filePath, {
      bigint: true,
    });
  } catch {
    return;
  }
  if (pathStats.dev !== expectedIdentity.dev || pathStats.ino !== expectedIdentity.ino) return;
  try {
    let descriptorPath = await fsImpl.readlink(`/proc/self/fd/${handle.fd}`);
    if (!descriptorPath.startsWith("/") || descriptorPath.endsWith(" (deleted)")) return;
    let stats = await fsImpl.lstat(descriptorPath, {
      bigint: true,
    });
    if (stats.dev !== expectedIdentity.dev || stats.ino !== expectedIdentity.ino) return;
    return descriptorPath;
  } catch {
    return;
  }
  try {
    if ((await fsImpl.realpath(filePath)) !== filePath) return;
  } catch {
    return;
  }
  return filePath;
}
//@ chunk-85eyj5gy.js:8721-8811 placement
var OPEN_READ_NOFOLLOW_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BENIGN_OPEN_ERRNOS;
deferInit("chunk-85eyj5gy.js:8721", () => {
  OPEN_READ_NOFOLLOW_FLAGS = constants.O_RDONLY | constants.O_NONBLOCK | READ_LIMITS;
  BENIGN_OPEN_ERRNOS = new Set(["EPERM", "EINVAL", "ENOTSUP", "EOPNOTSUPP"]);
});
//@ chunk-85eyj5gy.js:8811-8849 placement
async function openRegularFileForRead(filePath) {
  return open(filePath, OPEN_READ_NOFOLLOW_FLAGS);
}
//@ chunk-85eyj5gy.js:8849-9018 placement
async function openRegularFileForReadWithNoAtime(filePath, noAtimeFlag = O_NOATIME_FLAG) {
  if (noAtimeFlag !== 0)
    try {
      return {
        handle: await open(filePath, OPEN_READ_NOFOLLOW_FLAGS | noAtimeFlag),
        withNoAtime: true,
      };
    } catch (error) {
      if (!BENIGN_OPEN_ERRNOS.has(getErrnoCode(error) ?? "")) throw error;
    }
  return {
    handle: await openRegularFileForRead(filePath),
    withNoAtime: false,
  };
}
export {
  readHandleBounded,
  openRegularFileForRead,
  bindCanonicalPathToHandle,
  openRegularFileForReadWithNoAtime,
};
