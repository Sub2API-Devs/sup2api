/**
 * signal-exit/dist/mjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: signal-exit@4.1.0
 * pieces: chunk-t889g22j.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
 */
import { logForDebugging } from "../../../../src/utils/debug.js";
import { env } from "../../../../src/utils/env.js";
import { signals_2 } from "./signals.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-t889g22j.js:16480-16818 esm-fingerprint
var processOk; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var kExitEmitter;
var globalObject;
var ObjectDefineProperty;
deferInit("chunk-t889g22j.js:16480", () => {
  processOk = (processRef) =>
    !!processRef &&
    typeof processRef === "object" &&
    typeof processRef.removeListener === "function" &&
    typeof processRef.emit === "function" &&
    typeof processRef.reallyExit === "function" &&
    typeof processRef.listeners === "function" &&
    typeof processRef.kill === "function" &&
    typeof processRef.pid === "number" &&
    typeof processRef.on === "function";
  kExitEmitter = Symbol.for("signal-exit emitter");
  globalObject = globalThis;
  ObjectDefineProperty = Object.defineProperty.bind(Object);
});
//@ chunk-t889g22j.js:16818-17354 esm-fingerprint
class Emitter {
  emitted = {
    afterExit: false,
    exit: false,
  };
  listeners = {
    afterExit: [],
    exit: [],
  };
  count = 0;
  id = Math.random();
  constructor() {
    if (globalObject[kExitEmitter]) return globalObject[kExitEmitter];
    ObjectDefineProperty(globalObject, kExitEmitter, {
      value: this,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
  on(ev, fn) {
    this.listeners[ev].push(fn);
  }
  removeListener(ev, fn) {
    let list = this.listeners[ev];
    let i = list.indexOf(fn);
    if (i === -1) return;
    if (i === 0 && list.length === 1) list.length = 0;
    else list.splice(i, 1);
  }
  emit(ev, code, signal) {
    if (this.emitted[ev]) return false;
    this.emitted[ev] = true;
    let ret = false;
    for (let fn of this.listeners[ev]) ret = fn(code, signal) === true || ret;
    if (ev === "exit") ret = this.emit("afterExit", code, signal) || ret;
    return ret;
  }
}
//@ chunk-t889g22j.js:17354-17364 esm-layout
class SignalExitBase {}
//@ chunk-t889g22j.js:17364-17466 esm-fingerprint
var signalExitWrap = (handler) => ({
  onExit(cb, opts) {
    return handler.onExit(cb, opts);
  },
  load() {
    return handler.load();
  },
  unload() {
    return handler.unload();
  },
});
//@ chunk-t889g22j.js:17466-17527 esm-fingerprint
let SignalExitFallback; // deferred: uses SignalExitBase of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-t889g22j.js:17466", () => {
  SignalExitFallback = class SignalExitFallback extends SignalExitBase {
    onExit() {
      return () => {};
    }
    load() {}
    unload() {}
  };
});
//@ chunk-t889g22j.js:17527-19077 esm-fingerprint
let SignalExit; // deferred: uses SignalExitBase of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-t889g22j.js:17527", () => {
  SignalExit = class SignalExit extends SignalExitBase {
    #s = globalProcess.platform === "win32" ? "SIGINT" : "SIGHUP";
    #t = new Emitter();
    #e;
    #o;
    #i;
    #r = {};
    #n = false;
    constructor(processRef) {
      super();
      this.#e = processRef;
      this.#r = {};
      for (let sig of signals_2)
        this.#r[sig] = () => {
          let listeners = this.#e.listeners(sig);
          let { count } = this.#t;
          let p = processRef;
          if (
            typeof p.__signal_exit_emitter__ === "object" &&
            typeof p.__signal_exit_emitter__.count === "number"
          )
            count += p.__signal_exit_emitter__.count;
          if (listeners.length === count) {
            this.unload();
            let ret = this.#t.emit("exit", null, sig);
            let s = sig === "SIGHUP" ? this.#s : sig;
            if (!ret) processRef.kill(processRef.pid, s);
          }
        };
      this.#i = processRef.reallyExit;
      this.#o = processRef.emit;
    }
    onExit(cb, opts) {
      if (!processOk(this.#e)) return () => {};
      if (this.#n === false) this.load();
      let ev = opts?.alwaysLast ? "afterExit" : "exit";
      this.#t.on(ev, cb);
      return () => {
        this.#t.removeListener(ev, cb);
        if (this.#t.listeners.exit.length === 0 && this.#t.listeners.afterExit.length === 0) this.unload();
      };
    }
    load() {
      if (this.#n) return;
      this.#n = true;
      this.#t.count += 1;
      for (let sig of signals_2)
        try {
          let fn = this.#r[sig];
          if (fn) this.#e.on(sig, fn);
        } catch (error) {}
      this.#e.emit = (ev, ...a) => this.#u(ev, ...a);
      this.#e.reallyExit = (code) => this.#a(code);
    }
    unload() {
      if (!this.#n) return;
      this.#n = false;
      signals_2.forEach((sig) => {
        let listener = this.#r[sig];
        if (!listener) throw Error("Listener not defined for signal: " + sig);
        try {
          this.#e.removeListener(sig, listener);
        } catch (error) {}
      });
      this.#e.emit = this.#o;
      this.#e.reallyExit = this.#i;
      this.#t.count -= 1;
    }
    #a(code) {
      if (!processOk(this.#e)) return 0;
      this.#e.exitCode = code || 0;
      this.#t.emit("exit", this.#e.exitCode, null);
      return this.#i.call(this.#e, this.#e.exitCode);
    }
    #u(ev, ...args) {
      let og = this.#o;
      if (ev === "exit" && processOk(this.#e)) {
        if (typeof args[0] === "number") this.#e.exitCode = args[0];
        let ret = og.call(this.#e, ev, ...args);
        this.#t.emit("exit", this.#e.exitCode, null);
        return ret;
      } else return og.call(this.#e, ev, ...args);
    }
  };
});
//@ chunk-t889g22j.js:19077-19163 esm-fingerprint
var globalProcess; // deferred: uses signalExitWrap of its import cycle while loading; runs once the cycle is complete
var onExit;
var load;
var unload;
deferInit("chunk-t889g22j.js:19077", () => {
  globalProcess = globalThis.process;
  ({ onExit, load, unload } = signalExitWrap(
    processOk(globalProcess) ? new SignalExit(globalProcess) : new SignalExitFallback(),
  ));
});
export { onExit };
