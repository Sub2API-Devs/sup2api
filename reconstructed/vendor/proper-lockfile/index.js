/**
 * proper-lockfile/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: proper-lockfile@4.1.2
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { it } from "./lib/lockfile.js";
import { properLockfileAdapter } from "./lib/adapter.js";

//@ chunk-bmbhxpfm.js:21622-22139 cjs-fingerprint
var properLockfileIndex = x(function (ur, K) {
  var U = it(),
    { toPromise: toPromise, toSync: toSync, toSyncOptions: toSyncOptions } = properLockfileAdapter();
  async function ct(e, r) {
    let n = await toPromise(U.lock)(e, r);
    return toPromise(n);
  }
  function Kt(e, r) {
    let n = toSync(U.lock)(e, toSyncOptions(r));
    return toSync(n);
  }
  function Qt(e, r) {
    return toPromise(U.unlock)(e, r);
  }
  function Bt(e, r) {
    return toSync(U.unlock)(e, toSyncOptions(r));
  }
  function zt(e, r) {
    return toPromise(U.check)(e, r);
  }
  function Ht(e, r) {
    return toSync(U.check)(e, toSyncOptions(r));
  }
  K.exports = ct;
  K.exports.lock = ct;
  K.exports.unlock = Qt;
  K.exports.lockSync = Kt;
  K.exports.unlockSync = Bt;
  K.exports.check = zt;
  K.exports.checkSync = Ht;
});

export { properLockfileIndex };
