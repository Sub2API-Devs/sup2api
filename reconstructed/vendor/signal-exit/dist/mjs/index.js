/**
 * signal-exit/dist/mjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: signal-exit@4.1.0
 * pieces: chunk-m4p5zn6n.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
 */
import { logForDebugging } from "../../../../src/utils/debug.js";
import { env } from "../../../../src/utils/env.js";
import { signals } from "./signals.js";
import { logEvent } from "../../../../src/services/analytics/index.js";

//@ chunk-m4p5zn6n.js:16481-16819 esm-fingerprint
var processOk = (e) =>
  !!e &&
  typeof e === "object" &&
  typeof e.removeListener === "function" &&
  typeof e.emit === "function" &&
  typeof e.reallyExit === "function" &&
  typeof e.listeners === "function" &&
  typeof e.kill === "function" &&
  typeof e.pid === "number" &&
  typeof e.on === "function";
var kExitEmitter = Symbol.for("signal-exit emitter");
var Ie = globalThis;
var ObjectDefineProperty = Object.defineProperty.bind(Object);
//@ chunk-m4p5zn6n.js:16819-17355 esm-fingerprint
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
    if (Ie[kExitEmitter]) return Ie[kExitEmitter];
    ObjectDefineProperty(Ie, kExitEmitter, {
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
//@ chunk-m4p5zn6n.js:17355-17365 esm-layout
class SignalExitBase {}
//@ chunk-m4p5zn6n.js:17365-17467 esm-fingerprint
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
//@ chunk-m4p5zn6n.js:17467-17528 esm-fingerprint
class SignalExitFallback extends SignalExitBase {
  onExit() {
    return () => {};
  }
  load() {}
  unload() {}
}
//@ chunk-m4p5zn6n.js:17528-19078 esm-fingerprint
class SignalExit extends SignalExitBase {
  #s = ve.platform === "win32" ? "SIGINT" : "SIGHUP";
  #t = new Emitter();
  #e;
  #o;
  #i;
  #r = {};
  #n = false;
  constructor(e) {
    super();
    this.#e = e;
    this.#r = {};
    for (let sig of signals)
      this.#r[sig] = () => {
        let listeners = this.#e.listeners(sig);
        let { count } = this.#t;
        let p = e;
        if (
          typeof p.__signal_exit_emitter__ === "object" &&
          typeof p.__signal_exit_emitter__.count === "number"
        )
          count += p.__signal_exit_emitter__.count;
        if (listeners.length === count) {
          this.unload();
          let ret = this.#t.emit("exit", null, sig);
          let s = sig === "SIGHUP" ? this.#s : sig;
          if (!ret) e.kill(e.pid, s);
        }
      };
    this.#i = e.reallyExit;
    this.#o = e.emit;
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
    for (let sig of signals)
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
    signals.forEach((sig) => {
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
}
//@ chunk-m4p5zn6n.js:19078-19164 esm-fingerprint
var ve = globalThis.process;
var { onExit, load, unload } = signalExitWrap(processOk(ve) ? new SignalExit(ve) : new SignalExitFallback());
export { onExit };
