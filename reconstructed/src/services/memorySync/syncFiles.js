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
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
} from "async_hooks";
import { HostScoped } from "../../utils/hostScoped.js";
import { getErrnoCode } from "../../utils/errors.js";
import { getPlatform as getPlatform_2 } from "../../utils/platform.js";
import { sDn } from "../../utils/storage/storageSpaces.js";

//@ chunk-s61vbvea.js:88942-88966 placement
var pv = 268435456,
  A7s = pv;
/**
 * 循环写入直到整个缓冲区写完，没有进展时抛 EIO。
 */
//@ chunk-s61vbvea.js:88966-89174 placement
async function writeFully(e, n, r) {
  let s = 0;
  while (s < n.byteLength) {
    let { bytesWritten: bytesWritten } = await e.write(n, s, n.byteLength - s, r === null ? null : r + s);
    if (bytesWritten <= 0) throw Object.assign(Error("write made no progress"), { code: "EIO" });
    s += bytesWritten;
  }
}
//@ chunk-s61vbvea.js:89174-89232 placement
var mv = new Set(["EPERM", "ENOTSUP", "EOPNOTSUPP", "ENOSYS"]);
//@ chunk-s61vbvea.js:89232-89309 placement
class Rg {
  logged = !1;
  claim() {
    if (this.logged) return !1;
    return ((this.logged = !0), !0);
  }
}
//@ chunk-s61vbvea.js:89309-89334 placement
var t4 = new HostScoped(() => new Rg());
//@ chunk-s61vbvea.js:89334-89432 placement
function R7s(e) {
  let n = getErrnoCode(e);
  if (n === void 0) return !1;
  return mv.has(n) || (n === "EISDIR" && getPlatform_2() === "windows");
}
//@ chunk-s61vbvea.js:89432-89446 placement
var c4 = new AsyncLocalStorage();
//@ chunk-s61vbvea.js:89446-89461 placement
var x7s = 600000;
//@ chunk-s61vbvea.js:89461-89538 placement
class xg {
  logged = !1;
  claim() {
    if (this.logged) return !1;
    return ((this.logged = !0), !0);
  }
}
//@ chunk-s61vbvea.js:89538-89563 placement
var W4 = new HostScoped(() => new xg());
//@ chunk-s61vbvea.js:89563-89789 placement
var PURGE_TEMP_FILE_RE = /\.purge\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.tmp$/,
  HASH_TEMP_FILE_RE = /^\.[0-9a-f]{16}\.tmp$/,
  HASH_TEMP_BACKUP_RE = /^\.[0-9a-f]{16}\.tmp~$/,
  regExp_5 = new RegExp(
    `(${HASH_TEMP_FILE_RE.source})|(${HASH_TEMP_BACKUP_RE.source})|(\\.tmp\\.[0-9a-f]{8}$)|(${PURGE_TEMP_FILE_RE.source})`,
  );
//@ chunk-s61vbvea.js:89789-89886 placement
var bv = /(^\..*\.tmp~?$)|(\.tmp[.~][0-9a-f]{8}$)|(\.lock$)|(\.purge\..*\.tmp$)|(^apply\.marker$)/;
//@ chunk-s61vbvea.js:89886-89920 placement
function eie(e) {
  return HASH_TEMP_FILE_RE.test(e);
}
//@ chunk-s61vbvea.js:89920-89978 placement
function vg(e, n) {
  return sDn(e) || (n ? regExp_5.test(e) : bv.test(e));
}
//@ chunk-s61vbvea.js:89978-89992 placement
var P7s = 60000;
//@ chunk-s61vbvea.js:90118-90174 placement
class Cg {
  loaderSide = null;
  register(e) {
    this.loaderSide = e;
  }
}
//@ chunk-s61vbvea.js:90174-90188 placement
var Ag = new Cg();
//@ chunk-s61vbvea.js:90188-90219 placement
function $7s(e) {
  Ag.register(e);
}

export { eie, writeFully, A7s, P7s, $7s, x7s, R7s, Ag, vg };
