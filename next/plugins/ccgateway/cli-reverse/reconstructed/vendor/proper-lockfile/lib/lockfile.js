/**
 * proper-lockfile/lib/lockfile.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: proper-lockfile@4.1.2
 * pieces: chunk-3c7mkwg0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_graceful_fs } from "../../graceful-fs/graceful-fs.js";
import { require_retry } from "../../retry/lib/retry.js";
import { require_signal_exit } from "../../signal-exit/index.js";
import { require_mtime_precision } from "./mtime-precision.js";

//@ chunk-3c7mkwg0.js:17645-20904 cjs-fingerprint
var require_lockfile = __commonJS(function (cjsExports, cjsModule) {
  var path = importMetaRequire("path");
  var fs = require_graceful_fs();
  var retry = require_retry();
  var onExit = require_signal_exit();
  var mtimePrecision = require_mtime_precision();
  var locks = {};
  function getLockFile(file, options) {
    return options.lockfilePath || `${file}.lock`;
  }
  function resolveCanonicalPath(file, options, callback) {
    if (!options.realpath) return callback(null, path.resolve(file));
    options.fs.realpath(file, callback);
  }
  function acquireLock(file, options, callback) {
    let lockfilePath = getLockFile(file, options);
    options.fs.mkdir(lockfilePath, (err) => {
      if (!err)
        return mtimePrecision.probe(lockfilePath, options.fs, (err, mtime, mtimePrecision) => {
          if (err) {
            options.fs.rmdir(lockfilePath, () => {});
            return callback(err);
          }
          callback(null, mtime, mtimePrecision);
        });
      if (err.code !== "EEXIST") return callback(err);
      if (options.stale <= 0)
        return callback(
          Object.assign(Error("Lock file is already being held"), {
            code: "ELOCKED",
            file,
          }),
        );
      options.fs.stat(lockfilePath, (err, stat) => {
        if (err) {
          if (err.code === "ENOENT")
            return acquireLock(
              file,
              {
                ...options,
                stale: 0,
              },
              callback,
            );
          return callback(err);
        }
        if (!isLockStale(stat, options))
          return callback(
            Object.assign(Error("Lock file is already being held"), {
              code: "ELOCKED",
              file,
            }),
          );
        removeLock(file, options, (err) => {
          if (err) return callback(err);
          acquireLock(
            file,
            {
              ...options,
              stale: 0,
            },
            callback,
          );
        });
      });
    });
  }
  function isLockStale(stat, options) {
    return stat.mtime.getTime() < Date.now() - options.stale;
  }
  function removeLock(file, options, callback) {
    options.fs.rmdir(getLockFile(file, options), (err) => {
      if (err && err.code !== "ENOENT") return callback(err);
      callback();
    });
  }
  function updateLock(file, options) {
    let lock = locks[file];
    if (lock.updateTimeout) return;
    lock.updateDelay = lock.updateDelay || options.update;
    lock.updateTimeout = setTimeout(() => {
      lock.updateTimeout = null;
      options.fs.stat(lock.lockfilePath, (err, stat) => {
        let isOverThreshold = lock.lastUpdate + options.stale < Date.now();
        if (err) {
          if (err.code === "ENOENT" || isOverThreshold)
            return setLockAsCompromised(
              file,
              lock,
              Object.assign(err, {
                code: "ECOMPROMISED",
              }),
            );
          lock.updateDelay = 1000;
          return updateLock(file, options);
        }
        if (lock.mtime.getTime() !== stat.mtime.getTime())
          return setLockAsCompromised(
            file,
            lock,
            Object.assign(Error("Unable to update lock within the stale threshold"), {
              code: "ECOMPROMISED",
            }),
          );
        let mtime = mtimePrecision.getMtime(lock.mtimePrecision);
        options.fs.utimes(lock.lockfilePath, mtime, mtime, (err) => {
          let isOverThreshold = lock.lastUpdate + options.stale < Date.now();
          if (lock.released) return;
          if (err) {
            if (err.code === "ENOENT" || isOverThreshold)
              return setLockAsCompromised(
                file,
                lock,
                Object.assign(err, {
                  code: "ECOMPROMISED",
                }),
              );
            lock.updateDelay = 1000;
            return updateLock(file, options);
          }
          lock.mtime = mtime;
          lock.lastUpdate = Date.now();
          lock.updateDelay = null;
          updateLock(file, options);
        });
      });
    }, lock.updateDelay);
    if (lock.updateTimeout.unref) lock.updateTimeout.unref();
  }
  function setLockAsCompromised(file, lock, err) {
    lock.released = true;
    if (lock.updateTimeout) clearTimeout(lock.updateTimeout);
    if (locks[file] === lock) delete locks[file];
    lock.options.onCompromised(err);
  }
  function lock(file, options, callback) {
    options = {
      stale: 1e4,
      update: null,
      realpath: true,
      retries: 0,
      fs,
      onCompromised: (err) => {
        throw err;
      },
      ...options,
    };
    options.retries = options.retries || 0;
    options.retries =
      typeof options.retries === "number"
        ? {
            retries: options.retries,
          }
        : options.retries;
    options.stale = Math.max(options.stale || 0, 2000);
    options.update = options.update == null ? options.stale / 2 : options.update || 0;
    options.update = Math.max(Math.min(options.update, options.stale / 2), 1000);
    resolveCanonicalPath(file, options, (err, file) => {
      if (err) return callback(err);
      let operation = retry.operation(options.retries);
      operation.attempt(() => {
        acquireLock(file, options, (err, mtime, mtimePrecision) => {
          if (operation.retry(err)) return;
          if (err) return callback(operation.mainError());
          let lock = (locks[file] = {
            lockfilePath: getLockFile(file, options),
            mtime,
            mtimePrecision,
            options,
            lastUpdate: Date.now(),
          });
          updateLock(file, options);
          callback(null, (releasedCallback) => {
            if (lock.released)
              return (
                releasedCallback &&
                releasedCallback(
                  Object.assign(Error("Lock is already released"), {
                    code: "ERELEASED",
                  }),
                )
              );
            unlock(
              file,
              {
                ...options,
                realpath: false,
              },
              releasedCallback,
            );
          });
        });
      });
    });
  }
  function unlock(file, options, callback) {
    options = {
      fs,
      realpath: true,
      ...options,
    };
    resolveCanonicalPath(file, options, (err, file) => {
      if (err) return callback(err);
      let lock = locks[file];
      if (!lock)
        return callback(
          Object.assign(Error("Lock is not acquired/owned by you"), {
            code: "ENOTACQUIRED",
          }),
        );
      if (lock.updateTimeout) clearTimeout(lock.updateTimeout);
      lock.released = true;
      delete locks[file];
      removeLock(file, options, callback);
    });
  }
  function check(file, options, callback) {
    options = {
      stale: 1e4,
      realpath: true,
      fs,
      ...options,
    };
    options.stale = Math.max(options.stale || 0, 2000);
    resolveCanonicalPath(file, options, (err, file) => {
      if (err) return callback(err);
      options.fs.stat(getLockFile(file, options), (err, stat) => {
        if (err) return err.code === "ENOENT" ? callback(null, false) : callback(err);
        return callback(null, !isLockStale(stat, options));
      });
    });
  }
  function getLocks() {
    return locks;
  }
  onExit(() => {
    for (let file in locks) {
      let options = locks[file].options;
      try {
        options.fs.rmdirSync(getLockFile(file, options));
      } catch (e) {}
    }
  });
  cjsExports.lock = lock;
  cjsExports.unlock = unlock;
  cjsExports.check = check;
  cjsExports.getLocks = getLocks;
});
export { require_lockfile };
