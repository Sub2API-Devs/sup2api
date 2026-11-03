/**
 * services/memorySync/syncFiles.ts
 *
 * 记忆同步文件写入（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (18)
 * attribution: placement 18
 */
import { AsyncLocalStorage } from "async_hooks";
import { HostScoped } from "../../utils/hostScoped.js";
import { getErrnoCode } from "../../utils/errors.js";
import { getPlatform as getPlatform_2 } from "../../utils/platform.js";
import { isAsideFileName } from "../../utils/storage/storageSpaces.js";

//@ chunk-s61vbvea.js:88942-88966 placement
/**
 * 同上（导出别名）。
 */
var MAX_WRITE_BUFFER_BYTES = 268435456;
var WRITE_BUFFER_LIMIT_BYTES = MAX_WRITE_BUFFER_BYTES;
//@ chunk-s61vbvea.js:88966-89174 placement
/**
 * 循环写入直到整个缓冲区写完，没有进展时抛 EIO。
 */
async function writeFully(e, n, r) {
  let s = 0;
  while (s < n.byteLength) {
    let { bytesWritten } = await e.write(n, s, n.byteLength - s, r === null ? null : r + s);
    if (bytesWritten <= 0)
      throw Object.assign(Error("write made no progress"), {
        code: "EIO",
      });
    s += bytesWritten;
  }
}
//@ chunk-s61vbvea.js:89174-89232 placement
/**
 * 不可重试的文件系统错误码。
 */
var NON_RETRYABLE_FS_ERRORS = new Set(["EPERM", "ENOTSUP", "EOPNOTSUPP", "ENOSYS"]);
//@ chunk-s61vbvea.js:89232-89309 placement
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
//@ chunk-s61vbvea.js:89309-89334 placement
/**
 * 按宿主保存的 once 日志器。
 */
var writeOnceLogger = new HostScoped(() => new OnceLogger());
//@ chunk-s61vbvea.js:89334-89432 placement
/**
 * 判断错误是否不可重试。
 */
function isNonRetryableFsError(error) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode === undefined) return false;
  return NON_RETRYABLE_FS_ERRORS.has(errnoCode) || (errnoCode === "EISDIR" && getPlatform_2() === "windows");
}
//@ chunk-s61vbvea.js:89432-89446 placement
/**
 * 保存写入作用域的 AsyncLocalStorage。
 */
var writeScopeStorage = new AsyncLocalStorage();
//@ chunk-s61vbvea.js:89446-89461 placement
/**
 * 写入锁的有效期（600000 毫秒）。
 */
var WRITE_LOCK_TTL_MS = 600000;
//@ chunk-s61vbvea.js:89461-89538 placement
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
//@ chunk-s61vbvea.js:89538-89563 placement
/**
 * 另一个按宿主保存的 once 日志器。
 */
var secondOnceLogger = new HostScoped(() => new OnceLogger2());
//@ chunk-s61vbvea.js:89563-89789 placement
var PURGE_TEMP_FILE_RE = /\.purge\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$/;
var HASH_TEMP_FILE_RE = /^\.[0-9a-f]{16}\.tmp$/;
var HASH_TEMP_BACKUP_RE = /^\.[0-9a-f]{16}\.tmp~$/;
var regExp_5 = new RegExp(
  `(${HASH_TEMP_FILE_RE.source})|(${HASH_TEMP_BACKUP_RE.source})|(\\.tmp\\.[0-9a-f]{8}$)|(${PURGE_TEMP_FILE_RE.source})`,
);
//@ chunk-s61vbvea.js:89789-89886 placement
/**
 * 匹配临时/锁文件的名称正则。
 */
var TEMP_FILE_RE = /(^\..*\.tmp~?$)|(\.tmp[.~][0-9a-f]{8}$)|(\.lock$)|(\.purge\..*\.tmp$)|(^apply\.marker$)/;
//@ chunk-s61vbvea.js:89886-89920 placement
/**
 * 判断是否为哈希临时文件。
 */
function isHashTempFile(e) {
  return HASH_TEMP_FILE_RE.test(e);
}
//@ chunk-s61vbvea.js:89920-89978 placement
/**
 * 判断是否为噪声临时文件。
 */
function isNoiseTempFile(name, n) {
  return isAsideFileName(name) || (n ? regExp_5.test(name) : TEMP_FILE_RE.test(name));
}
//@ chunk-s61vbvea.js:89978-89992 placement
/**
 * 锁被视为过期的时长（60000 毫秒）。
 */
var LOCK_STALE_MS = 60000;
//@ chunk-s61vbvea.js:90118-90174 placement
/**
 * 持有“加载器侧”实现的容器。
 */
class LoaderSideHolder {
  loaderSide = null;
  register(loaderSide) {
    this.loaderSide = loaderSide;
  }
}
//@ chunk-s61vbvea.js:90174-90188 placement
/**
 * 全局的加载器侧持有者。
 */
var loaderSideHolder = new LoaderSideHolder();
//@ chunk-s61vbvea.js:90188-90219 placement
/**
 * 注册加载器侧实现。
 */
function registerLoaderSide(e) {
  loaderSideHolder.register(e);
}
export {
  isHashTempFile,
  writeFully,
  WRITE_BUFFER_LIMIT_BYTES,
  LOCK_STALE_MS,
  registerLoaderSide,
  WRITE_LOCK_TTL_MS,
  isNonRetryableFsError,
  loaderSideHolder,
  isNoiseTempFile,
};
