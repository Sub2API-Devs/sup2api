/**
 * signal-exit/dist/mjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: signal-exit@4.1.0
 * pieces: chunk-m4p5zn6n.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
 */
import { logForDebugging } from "../../../../src/utils/debug.js";
import { env } from "../../../../src/utils/env.js";
import { O } from "./signals.js";
import { logEvent } from "../../../../src/services/analytics/index.js";

//@ chunk-m4p5zn6n.js:16481-16819 esm-fingerprint
var se = (e) =>
    !!e &&
    typeof e === "object" &&
    typeof e.removeListener === "function" &&
    typeof e.emit === "function" &&
    typeof e.reallyExit === "function" &&
    typeof e.listeners === "function" &&
    typeof e.kill === "function" &&
    typeof e.pid === "number" &&
    typeof e.on === "function",
  Pe = Symbol.for("signal-exit emitter"),
  Ie = globalThis,
  Br = Object.defineProperty.bind(Object);
//@ chunk-m4p5zn6n.js:16819-17355 esm-fingerprint
class Zt {
  emitted = { afterExit: !1, exit: !1 };
  listeners = { afterExit: [], exit: [] };
  count = 0;
  id = Math.random();
  constructor() {
    if (Ie[Pe]) return Ie[Pe];
    Br(Ie, Pe, { value: this, writable: !1, enumerable: !1, configurable: !1 });
  }
  on(e, n) {
    this.listeners[e].push(n);
  }
  removeListener(e, n) {
    let r = this.listeners[e],
      index = r.indexOf(n);
    if (index === -1) return;
    if (index === 0 && r.length === 1) r.length = 0;
    else r.splice(index, 1);
  }
  emit(e, n, r) {
    if (this.emitted[e]) return !1;
    this.emitted[e] = !0;
    let o = !1;
    for (let s of this.listeners[e]) o = s(n, r) === !0 || o;
    if (e === "exit") o = this.emit("afterExit", n, r) || o;
    return o;
  }
}
//@ chunk-m4p5zn6n.js:17355-17365 esm-layout
class Oe {}
//@ chunk-m4p5zn6n.js:17365-17467 esm-fingerprint
var Kr = (e) => ({
  onExit(n, r) {
    return e.onExit(n, r);
  },
  load() {
    return e.load();
  },
  unload() {
    return e.unload();
  },
});
//@ chunk-m4p5zn6n.js:17467-17528 esm-fingerprint
class Qt extends Oe {
  onExit() {
    return () => {};
  }
  load() {}
  unload() {}
}
//@ chunk-m4p5zn6n.js:17528-19078 esm-fingerprint
class Jt extends Oe {
  #s = ve.platform === "win32" ? "SIGINT" : "SIGHUP";
  #t = new Zt();
  #e;
  #o;
  #i;
  #r = {};
  #n = !1;
  constructor(e) {
    super();
    ((this.#e = e), (this.#r = {}));
    for (let n of O)
      this.#r[n] = () => {
        let listeners = this.#e.listeners(n),
          { count: count } = this.#t,
          s = e;
        if (
          typeof s.__signal_exit_emitter__ === "object" &&
          typeof s.__signal_exit_emitter__.count === "number"
        )
          count += s.__signal_exit_emitter__.count;
        if (listeners.length === count) {
          this.unload();
          let emit = this.#t.emit("exit", null, n),
            d = n === "SIGHUP" ? this.#s : n;
          if (!emit) e.kill(e.pid, d);
        }
      };
    ((this.#i = e.reallyExit), (this.#o = e.emit));
  }
  onExit(e, n) {
    if (!se(this.#e)) return () => {};
    if (this.#n === !1) this.load();
    let r = n?.alwaysLast ? "afterExit" : "exit";
    return (
      this.#t.on(r, e),
      () => {
        if (
          (this.#t.removeListener(r, e),
          this.#t.listeners.exit.length === 0 && this.#t.listeners.afterExit.length === 0)
        )
          this.unload();
      }
    );
  }
  load() {
    if (this.#n) return;
    ((this.#n = !0), (this.#t.count += 1));
    for (let e of O)
      try {
        let n = this.#r[e];
        if (n) this.#e.on(e, n);
      } catch (error) {}
    ((this.#e.emit = (e, ...n) => this.#u(e, ...n)), (this.#e.reallyExit = (e) => this.#a(e)));
  }
  unload() {
    if (!this.#n) return;
    ((this.#n = !1),
      O.forEach((e) => {
        let n = this.#r[e];
        if (!n) throw Error("Listener not defined for signal: " + e);
        try {
          this.#e.removeListener(e, n);
        } catch (error) {}
      }),
      (this.#e.emit = this.#o),
      (this.#e.reallyExit = this.#i),
      (this.#t.count -= 1));
  }
  #a(e) {
    if (!se(this.#e)) return 0;
    return (
      (this.#e.exitCode = e || 0),
      this.#t.emit("exit", this.#e.exitCode, null),
      this.#i.call(this.#e, this.#e.exitCode)
    );
  }
  #u(e, ...n) {
    let r = this.#o;
    if (e === "exit" && se(this.#e)) {
      if (typeof n[0] === "number") this.#e.exitCode = n[0];
      let o = r.call(this.#e, e, ...n);
      return (this.#t.emit("exit", this.#e.exitCode, null), o);
    } else return r.call(this.#e, e, ...n);
  }
}
//@ chunk-m4p5zn6n.js:19078-19164 esm-fingerprint
var ve = globalThis.process,
  { onExit: onExit, load: load, unload: unload } = Kr(se(ve) ? new Jt(ve) : new Qt());

export { onExit };
