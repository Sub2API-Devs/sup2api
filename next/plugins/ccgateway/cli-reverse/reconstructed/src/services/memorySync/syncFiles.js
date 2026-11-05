/**
 * services/memorySync/syncFiles.ts
 *
 * 记忆同步文件写入（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (12), chunk-bqvygzwv.js (6)
 * attribution: placement 18
 */
import { AsyncLocalStorage } from "async_hooks";
import { HostScoped } from "../../utils/hostScoped.js";
import { isAsideFileName } from "../../utils/storage/storageSpaces.js";
import { getErrnoCode } from "../../utils/errors.js";
import { getPlatform } from "../../utils/platform.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:88256-88270 placement
/**
 * 保存写入作用域的 AsyncLocalStorage。
 */
var writeScopeStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:88256", () => {
  writeScopeStorage = new AsyncLocalStorage();
});
//@ chunk-7jxyna5q.js:88270-88285 placement
/**
 * 写入锁的有效期（600000 毫秒）。
 */
var WRITE_LOCK_TTL_MS = 600000;
//@ chunk-7jxyna5q.js:88285-88362 placement
/**
 * 只记录一次的日志器。
 */
class OnceLogger {
  logged = false;
  claim() {
    if (this.logged) return false;
    this.logged = true;
    return true;
  }
}
//@ chunk-7jxyna5q.js:88362-88387 placement
/**
 * 按宿主保存的 once 日志器。
 */
var writeOnceLogger; // deferred: uses OnceLogger of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:88362", () => {
  writeOnceLogger = new HostScoped(() => new OnceLogger());
});
//@ chunk-7jxyna5q.js:88387-88613 placement
var PURGE_TEMP_FILE_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HASH_TEMP_FILE_RE;
var HASH_TEMP_BACKUP_RE;
var regExp_5;
deferInit("chunk-7jxyna5q.js:88387", () => {
  PURGE_TEMP_FILE_RE = /\.purge\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$/;
  HASH_TEMP_FILE_RE = /^\.[0-9a-f]{16}\.tmp$/;
  HASH_TEMP_BACKUP_RE = /^\.[0-9a-f]{16}\.tmp~$/;
  regExp_5 = new RegExp(
    `(${HASH_TEMP_FILE_RE.source})|(${HASH_TEMP_BACKUP_RE.source})|(\\.tmp\\.[0-9a-f]{8}$)|(${PURGE_TEMP_FILE_RE.source})`,
  );
});
//@ chunk-7jxyna5q.js:88613-88710 placement
/**
 * 匹配临时/锁文件的名称正则。
 */
var TEMP_FILE_RE = /(^\..*\.tmp~?$)|(\.tmp[.~][0-9a-f]{8}$)|(\.lock$)|(\.purge\..*\.tmp$)|(^apply\.marker$)/;
//@ chunk-7jxyna5q.js:88710-88744 placement
/**
 * 判断是否为哈希临时文件。
 */
function isHashTempFile(fileName) {
  return HASH_TEMP_FILE_RE.test(fileName);
}
//@ chunk-7jxyna5q.js:88744-88802 placement
/**
 * 判断是否为噪声临时文件。
 */
function isNoiseTempFile(name, stagingShape) {
  return isAsideFileName(name) || (stagingShape ? regExp_5.test(name) : TEMP_FILE_RE.test(name));
}
//@ chunk-7jxyna5q.js:88802-88816 placement
/**
 * 锁被视为过期的时长（60000 毫秒）。
 */
var LOCK_STALE_MS = 60000;
//@ chunk-7jxyna5q.js:88942-88998 placement
/**
 * 持有“加载器侧”实现的容器。
 */
class LoaderSideHolder {
  loaderSide = null;
  register(loaderSide) {
    this.loaderSide = loaderSide;
  }
}
//@ chunk-7jxyna5q.js:88998-89012 placement
/**
 * 全局的加载器侧持有者。
 */
var loaderSideHolder; // deferred: uses LoaderSideHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:88998", () => {
  loaderSideHolder = new LoaderSideHolder();
});
//@ chunk-7jxyna5q.js:89012-89043 placement
/**
 * 注册加载器侧实现。
 */
function registerLoaderSide(loader) {
  loaderSideHolder.register(loader);
}
//@ chunk-bqvygzwv.js:296-318 placement
/**
 * 同上（导出别名）。
 */
var MAX_WRITE_BUFFER_BYTES = 268435456;
var WRITE_BUFFER_LIMIT_BYTES = MAX_WRITE_BUFFER_BYTES;
//@ chunk-bqvygzwv.js:318-526 placement
/**
 * 循环写入直到整个缓冲区写完，没有进展时抛 EIO。
 */
async function writeFully(handle, buffer, position) {
  let written = 0;
  while (written < buffer.byteLength) {
    let { bytesWritten } = await handle.write(
      buffer,
      written,
      buffer.byteLength - written,
      position === null ? null : position + written,
    );
    if (bytesWritten <= 0)
      throw Object.assign(Error("write made no progress"), {
        code: "EIO",
      });
    written += bytesWritten;
  }
}
//@ chunk-bqvygzwv.js:526-583 placement
/**
 * 不可重试的文件系统错误码。
 */
var NON_RETRYABLE_FS_ERRORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bqvygzwv.js:526", () => {
  NON_RETRYABLE_FS_ERRORS = new Set(["EPERM", "ENOTSUP", "EOPNOTSUPP", "ENOSYS"]);
});
//@ chunk-bqvygzwv.js:583-659 placement
/**
 * 另一个 once 日志器容器。
 */
class OnceLogger2 {
  logged = false;
  claim() {
    if (this.logged) return false;
    this.logged = true;
    return true;
  }
}
//@ chunk-bqvygzwv.js:659-682 placement
/**
 * 另一个按宿主保存的 once 日志器。
 */
var secondOnceLogger; // deferred: uses OnceLogger2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bqvygzwv.js:659", () => {
  secondOnceLogger = new HostScoped(() => new OnceLogger2());
});
//@ chunk-bqvygzwv.js:682-779 placement
/**
 * 判断错误是否不可重试。
 */
function isNonRetryableFsError(error) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode === undefined) return false;
  return NON_RETRYABLE_FS_ERRORS.has(errnoCode) || (errnoCode === "EISDIR" && getPlatform() === "windows");
}
export {
  writeFully,
  WRITE_BUFFER_LIMIT_BYTES,
  isHashTempFile,
  WRITE_LOCK_TTL_MS,
  isNonRetryableFsError,
  LOCK_STALE_MS,
  registerLoaderSide,
  loaderSideHolder,
  isNoiseTempFile,
};
