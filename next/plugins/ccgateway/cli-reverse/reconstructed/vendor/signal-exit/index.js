/**
 * signal-exit/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: signal-exit@4.1.0
 * pieces: chunk-3c7mkwg0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_signals } from "./signals.js";

//@ chunk-3c7mkwg0.js:15044-17126 cjs-fingerprint
var require_signal_exit = __commonJS(function (cjsExports, cjsModule) {
  var processRef = global.process;
  var processOk = function (processRef) {
    return (
      processRef &&
      typeof processRef === "object" &&
      typeof processRef.removeListener === "function" &&
      typeof processRef.emit === "function" &&
      typeof processRef.reallyExit === "function" &&
      typeof processRef.listeners === "function" &&
      typeof processRef.kill === "function" &&
      typeof processRef.pid === "number" &&
      typeof processRef.on === "function"
    );
  };
  if (!processOk(processRef))
    cjsModule.exports = function () {
      return function () {};
    };
  else {
    assert = importMetaRequire("assert");
    signals = require_signals();
    isWin = /^win/i.test(processRef.platform);
    EE = importMetaRequire("events");
    if (typeof EE !== "function") EE = EE.EventEmitter;
    if (processRef.__signal_exit_emitter__) emitter = processRef.__signal_exit_emitter__;
    else {
      emitter = processRef.__signal_exit_emitter__ = new EE();
      emitter.count = 0;
      emitter.emitted = {};
    }
    if (!emitter.infinite) {
      emitter.setMaxListeners(1 / 0);
      emitter.infinite = true;
    }
    cjsModule.exports = function (cb, opts) {
      if (!processOk(global.process)) return function () {};
      assert.equal(typeof cb, "function", "a callback must be provided for exit handler");
      if (loaded === false) load();
      var ev = "exit";
      if (opts && opts.alwaysLast) ev = "afterexit";
      var remove = function () {
        emitter.removeListener(ev, cb);
        if (emitter.listeners("exit").length === 0 && emitter.listeners("afterexit").length === 0) unload();
      };
      emitter.on(ev, cb);
      return remove;
    };
    unload = function () {
      if (!loaded || !processOk(global.process)) return;
      loaded = false;
      signals.forEach(function (sig) {
        try {
          processRef.removeListener(sig, sigListeners[sig]);
        } catch (er) {}
      });
      processRef.emit = originalProcessEmit;
      processRef.reallyExit = originalProcessReallyExit;
      emitter.count -= 1;
    };
    cjsModule.exports.unload = unload;
    emit = function (event, code, signal) {
      if (emitter.emitted[event]) return;
      emitter.emitted[event] = true;
      emitter.emit(event, code, signal);
    };
    sigListeners = {};
    signals.forEach(function (sig) {
      sigListeners[sig] = function () {
        if (!processOk(global.process)) return;
        var listeners = processRef.listeners(sig);
        if (listeners.length === emitter.count) {
          unload();
          emit("exit", null, sig);
          emit("afterexit", null, sig);
          if (isWin && sig === "SIGHUP") sig = "SIGINT";
          processRef.kill(processRef.pid, sig);
        }
      };
    });
    cjsModule.exports.signals = function () {
      return signals;
    };
    loaded = false;
    load = function () {
      if (loaded || !processOk(global.process)) return;
      loaded = true;
      emitter.count += 1;
      signals = signals.filter(function (sig) {
        try {
          processRef.on(sig, sigListeners[sig]);
          return true;
        } catch (er) {
          return false;
        }
      });
      processRef.emit = processEmit;
      processRef.reallyExit = processReallyExit;
    };
    cjsModule.exports.load = load;
    originalProcessReallyExit = processRef.reallyExit;
    processReallyExit = function (code) {
      if (!processOk(global.process)) return;
      processRef.exitCode = code || 0;
      emit("exit", processRef.exitCode, null);
      emit("afterexit", processRef.exitCode, null);
      originalProcessReallyExit.call(processRef, processRef.exitCode);
    };
    originalProcessEmit = processRef.emit;
    processEmit = function (ev, arg) {
      if (ev === "exit" && processOk(global.process)) {
        if (arg !== undefined) processRef.exitCode = arg;
        var ret = originalProcessEmit.apply(this, arguments);
        emit("exit", processRef.exitCode, null);
        emit("afterexit", processRef.exitCode, null);
        return ret;
      } else return originalProcessEmit.apply(this, arguments);
    };
  }
  var assert;
  var signals;
  var isWin;
  var EE;
  var emitter;
  var unload;
  var emit;
  var sigListeners;
  var loaded;
  var load;
  var originalProcessReallyExit;
  var processReallyExit;
  var originalProcessEmit;
  var processEmit;
});
export { require_signal_exit };
