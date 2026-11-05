/**
 * proper-lockfile/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: proper-lockfile@4.1.2
 * pieces: chunk-3c7mkwg0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_lockfile } from "./lib/lockfile.js";
import { properLockfileAdapter } from "./lib/adapter.js";

//@ chunk-3c7mkwg0.js:21622-22139 cjs-fingerprint
var properLockfileIndex = __commonJS(function (cjsExports, cjsModule) {
  var lockfile = require_lockfile();
  var { toPromise, toSync, toSyncOptions } = properLockfileAdapter();
  async function lock(file, options) {
    let release = await toPromise(lockfile.lock)(file, options);
    return toPromise(release);
  }
  function lockSync(file, options) {
    let release = toSync(lockfile.lock)(file, toSyncOptions(options));
    return toSync(release);
  }
  function unlock(file, options) {
    return toPromise(lockfile.unlock)(file, options);
  }
  function unlockSync(file, options) {
    return toSync(lockfile.unlock)(file, toSyncOptions(options));
  }
  function check(file, options) {
    return toPromise(lockfile.check)(file, options);
  }
  function checkSync(file, options) {
    return toSync(lockfile.check)(file, toSyncOptions(options));
  }
  cjsModule.exports = lock;
  cjsModule.exports.lock = lock;
  cjsModule.exports.unlock = unlock;
  cjsModule.exports.lockSync = lockSync;
  cjsModule.exports.unlockSync = unlockSync;
  cjsModule.exports.check = check;
  cjsModule.exports.checkSync = checkSync;
});
export { properLockfileIndex };
