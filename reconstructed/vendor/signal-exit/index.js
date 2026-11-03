/**
 * signal-exit/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: signal-exit@4.1.0
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_signals } from "./signals.js";

//@ chunk-bmbhxpfm.js:15044-17126 cjs-fingerprint
var require_signal_exit = x(function (cjsExports, cjsModule) {
  var g = global.process;
  var processOk = function (e) {
    return (
      e &&
      typeof e === "object" &&
      typeof e.removeListener === "function" &&
      typeof e.emit === "function" &&
      typeof e.reallyExit === "function" &&
      typeof e.listeners === "function" &&
      typeof e.kill === "function" &&
      typeof e.pid === "number" &&
      typeof e.on === "function"
    );
  };
  if (!processOk(g))
    cjsModule.exports = function () {
      return function () {};
    };
  else {
    assert = importMetaRequire("assert");
    signals = require_signals();
    isWin = /^win/i.test(g.platform);
    EE = importMetaRequire("events");
    if (typeof EE !== "function") EE = EE.EventEmitter;
    if (g.__signal_exit_emitter__) emitter = g.__signal_exit_emitter__;
    else {
      emitter = g.__signal_exit_emitter__ = new EE();
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
          g.removeListener(sig, sigListeners[sig]);
        } catch (er) {}
      });
      g.emit = originalProcessEmit;
      g.reallyExit = originalProcessReallyExit;
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
        var listeners = g.listeners(sig);
        if (listeners.length === emitter.count) {
          unload();
          emit("exit", null, sig);
          emit("afterexit", null, sig);
          if (isWin && sig === "SIGHUP") sig = "SIGINT";
          g.kill(g.pid, sig);
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
          g.on(sig, sigListeners[sig]);
          return true;
        } catch (er) {
          return false;
        }
      });
      g.emit = processEmit;
      g.reallyExit = processReallyExit;
    };
    cjsModule.exports.load = load;
    originalProcessReallyExit = g.reallyExit;
    processReallyExit = function (code) {
      if (!processOk(global.process)) return;
      g.exitCode = code || 0;
      emit("exit", g.exitCode, null);
      emit("afterexit", g.exitCode, null);
      originalProcessReallyExit.call(g, g.exitCode);
    };
    originalProcessEmit = g.emit;
    processEmit = function (ev, arg) {
      if (ev === "exit" && processOk(global.process)) {
        if (arg !== undefined) g.exitCode = arg;
        var ret = originalProcessEmit.apply(this, arguments);
        emit("exit", g.exitCode, null);
        emit("afterexit", g.exitCode, null);
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
