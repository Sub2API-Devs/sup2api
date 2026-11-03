/**
 * lru-cache/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lru-cache@10.3.0..11.0.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { KO } from "../yallist/yallist.js";

//@ chunk-1ny7cxrt.js:15716-19351 cjs-fingerprint
var yf = x(function (Bve, YO) {
  var wF = KO(),
    Ba = Symbol("max"),
    Ms = Symbol("length"),
    bl = Symbol("lengthCalculator"),
    Eu = Symbol("allowStale"),
    Ha = Symbol("maxAge"),
    Ds = Symbol("dispose"),
    ZO = Symbol("noDisposeOnSet"),
    Yn = Symbol("lruList"),
    Li = Symbol("cache"),
    qO = Symbol("updateAgeOnGet"),
    fy = () => 1;
  class GO {
    constructor(e) {
      if (typeof e === "number") e = { max: e };
      if (!e) e = {};
      if (e.max && (typeof e.max !== "number" || e.max < 0))
        throw TypeError("max must be a non-negative number");
      let t = (this[Ba] = e.max || 1 / 0),
        n = e.length || fy;
      if (
        ((this[bl] = typeof n !== "function" ? fy : n),
        (this[Eu] = e.stale || !1),
        e.maxAge && typeof e.maxAge !== "number")
      )
        throw TypeError("maxAge must be a number");
      ((this[Ha] = e.maxAge || 0),
        (this[Ds] = e.dispose),
        (this[ZO] = e.noDisposeOnSet || !1),
        (this[qO] = e.updateAgeOnGet || !1),
        this.reset());
    }
    set max(e) {
      if (typeof e !== "number" || e < 0) throw TypeError("max must be a non-negative number");
      ((this[Ba] = e || 1 / 0), ku(this));
    }
    get max() {
      return this[Ba];
    }
    set allowStale(e) {
      this[Eu] = !!e;
    }
    get allowStale() {
      return this[Eu];
    }
    set maxAge(e) {
      if (typeof e !== "number") throw TypeError("maxAge must be a non-negative number");
      ((this[Ha] = e), ku(this));
    }
    get maxAge() {
      return this[Ha];
    }
    set lengthCalculator(e) {
      if (typeof e !== "function") e = fy;
      if (e !== this[bl])
        ((this[bl] = e),
          (this[Ms] = 0),
          this[Yn].forEach((t) => {
            ((t.length = this[bl](t.value, t.key)), (this[Ms] += t.length));
          }));
      ku(this);
    }
    get lengthCalculator() {
      return this[bl];
    }
    get length() {
      return this[Ms];
    }
    get itemCount() {
      return this[Yn].length;
    }
    rforEach(e, t) {
      t = t || this;
      for (let tail = this[Yn].tail; tail !== null;) {
        let prev = tail.prev;
        (VO(this, e, tail, t), (tail = prev));
      }
    }
    forEach(e, t) {
      t = t || this;
      for (let head = this[Yn].head; head !== null;) {
        let o = head.next;
        (VO(this, e, head, t), (head = o));
      }
    }
    keys() {
      return this[Yn].toArray().map((e) => e.key);
    }
    values() {
      return this[Yn].toArray().map((e) => e.value);
    }
    reset() {
      if (this[Ds] && this[Yn] && this[Yn].length) this[Yn].forEach((e) => this[Ds](e.key, e.value));
      ((this[Li] = new Map()), (this[Yn] = new wF()), (this[Ms] = 0));
    }
    dump() {
      return this[Yn].map((e) => (gf(this, e) ? !1 : { k: e.key, v: e.value, e: e.now + (e.maxAge || 0) }))
        .toArray()
        .filter((e) => e);
    }
    dumpLru() {
      return this[Yn];
    }
    set(e, t, n) {
      if (((n = n || this[Ha]), n && typeof n !== "number")) throw TypeError("maxAge must be a number");
      let o = n ? Date.now() : 0,
        r = this[bl](t, e);
      if (this[Li].has(e)) {
        if (r > this[Ba]) return (vl(this, this[Li].get(e)), !1);
        let l = this[Li].get(e).value;
        if (this[Ds]) {
          if (!this[ZO]) this[Ds](e, l.value);
        }
        return (
          (l.now = o),
          (l.maxAge = n),
          (l.value = t),
          (this[Ms] += r - l.length),
          (l.length = r),
          this.get(e),
          ku(this),
          !0
        );
      }
      let s = new WO(e, t, r, o, n);
      if (s.length > this[Ba]) {
        if (this[Ds]) this[Ds](e, t);
        return !1;
      }
      return ((this[Ms] += s.length), this[Yn].unshift(s), this[Li].set(e, this[Yn].head), ku(this), !0);
    }
    has(e) {
      if (!this[Li].has(e)) return !1;
      let t = this[Li].get(e).value;
      return !gf(this, t);
    }
    get(e) {
      return py(this, e, !0);
    }
    peek(e) {
      return py(this, e, !1);
    }
    pop() {
      let tail = this[Yn].tail;
      if (!tail) return null;
      return (vl(this, tail), tail.value);
    }
    del(e) {
      vl(this, this[Li].get(e));
    }
    load(e) {
      this.reset();
      let now = Date.now();
      for (let n = e.length - 1; n >= 0; n--) {
        let o = e[n],
          r = o.e || 0;
        if (r === 0) this.set(o.k, o.v);
        else {
          let s = r - now;
          if (s > 0) this.set(o.k, o.v, s);
        }
      }
    }
    prune() {
      this[Li].forEach((e, t) => py(this, t, !1));
    }
  }
  var py = (e, t, n) => {
      let o = e[Li].get(t);
      if (o) {
        let r = o.value;
        if (gf(e, r)) {
          if ((vl(e, o), !e[Eu])) return;
        } else if (n) {
          if (e[qO]) o.value.now = Date.now();
          e[Yn].unshiftNode(o);
        }
        return r.value;
      }
    },
    gf = (e, t) => {
      if (!t || (!t.maxAge && !e[Ha])) return !1;
      let n = Date.now() - t.now;
      return t.maxAge ? n > t.maxAge : e[Ha] && n > e[Ha];
    },
    ku = (e) => {
      if (e[Ms] > e[Ba])
        for (let tail = e[Yn].tail; e[Ms] > e[Ba] && tail !== null;) {
          let prev = tail.prev;
          (vl(e, tail), (tail = prev));
        }
    },
    vl = (e, t) => {
      if (t) {
        let n = t.value;
        if (e[Ds]) e[Ds](n.key, n.value);
        ((e[Ms] -= n.length), e[Li].delete(n.key), e[Yn].removeNode(t));
      }
    };
  class WO {
    constructor(e, t, n, o, r) {
      ((this.key = e), (this.value = t), (this.length = n), (this.now = o), (this.maxAge = r || 0));
    }
  }
  var VO = (e, t, n, o) => {
    let r = n.value;
    if (gf(e, r)) {
      if ((vl(e, n), !e[Eu])) r = void 0;
    }
    if (r) t.call(o, r.value, r.key, e);
  };
  YO.exports = GO;
});

export { yf };
