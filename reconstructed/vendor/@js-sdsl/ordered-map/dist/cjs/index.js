/**
 * @js-sdsl/ordered-map/dist/cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @js-sdsl/ordered-map@4.4.2
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:44332-52023 cjs-fingerprint
var Qc = x(function (Xc) {
  Object.defineProperty(Xc, "t", { value: !0 });
  class ya {
    constructor(e, t, r = 1) {
      ((this.i = void 0), (this.h = void 0), (this.o = void 0), (this.u = e), (this.l = t), (this.p = r));
    }
    I() {
      let e = this,
        t = e.o.o === e;
      if (t && e.p === 1) e = e.h;
      else if (e.i) {
        e = e.i;
        while (e.h) e = e.h;
      } else {
        if (t) return e.o;
        let r = e.o;
        while (r.i === e) ((e = r), (r = e.o));
        e = r;
      }
      return e;
    }
    B() {
      let e = this;
      if (e.h) {
        e = e.h;
        while (e.i) e = e.i;
        return e;
      } else {
        let t = e.o;
        while (t.h === e) ((e = t), (t = e.o));
        if (e.h !== t) return t;
        else return e;
      }
    }
    _() {
      let e = this.o,
        t = this.h,
        r = t.i;
      if (e.o === this) e.o = t;
      else if (e.i === this) e.i = t;
      else e.h = t;
      if (((t.o = e), (t.i = this), (this.o = t), (this.h = r), r)) r.o = this;
      return t;
    }
    g() {
      let e = this.o,
        t = this.i,
        r = t.h;
      if (e.o === this) e.o = t;
      else if (e.i === this) e.i = t;
      else e.h = t;
      if (((t.o = e), (t.h = this), (this.o = t), (this.i = r), r)) r.o = this;
      return t;
    }
  }
  class jc extends ya {
    constructor() {
      super(...arguments);
      this.M = 1;
    }
    _() {
      let e = super._();
      return (this.O(), e.O(), e);
    }
    g() {
      let e = super.g();
      return (this.O(), e.O(), e);
    }
    O() {
      if (((this.M = 1), this.i)) this.M += this.i.M;
      if (this.h) this.M += this.h.M;
    }
  }
  class Gc {
    constructor(e = 0) {
      this.iteratorType = e;
    }
    equals(e) {
      return this.T === e.T;
    }
  }
  class $c {
    constructor() {
      this.m = 0;
    }
    get length() {
      return this.m;
    }
    size() {
      return this.m;
    }
    empty() {
      return this.m === 0;
    }
  }
  class Vc extends $c {}
  function mr() {
    throw RangeError("Iterator access denied!");
  }
  class Yc extends Vc {
    constructor(
      e = function (r, i) {
        if (r < i) return -1;
        if (r > i) return 1;
        return 0;
      },
      t = !1,
    ) {
      super();
      ((this.v = void 0),
        (this.A = e),
        (this.enableIndex = t),
        (this.N = t ? jc : ya),
        (this.C = new this.N()));
    }
    R(e, t) {
      let r = this.C;
      while (e) {
        let i = this.A(e.u, t);
        if (i < 0) e = e.h;
        else if (i > 0) ((r = e), (e = e.i));
        else return e;
      }
      return r;
    }
    K(e, t) {
      let r = this.C;
      while (e)
        if (this.A(e.u, t) <= 0) e = e.h;
        else ((r = e), (e = e.i));
      return r;
    }
    L(e, t) {
      let r = this.C;
      while (e) {
        let i = this.A(e.u, t);
        if (i < 0) ((r = e), (e = e.h));
        else if (i > 0) e = e.i;
        else return e;
      }
      return r;
    }
    k(e, t) {
      let r = this.C;
      while (e)
        if (this.A(e.u, t) < 0) ((r = e), (e = e.h));
        else e = e.i;
      return r;
    }
    P(e) {
      while (!0) {
        let t = e.o;
        if (t === this.C) return;
        if (e.p === 1) {
          e.p = 0;
          return;
        }
        if (e === t.i) {
          let r = t.h;
          if (r.p === 1)
            if (((r.p = 0), (t.p = 1), t === this.v)) this.v = t._();
            else t._();
          else if (r.h && r.h.p === 1) {
            if (((r.p = t.p), (t.p = 0), (r.h.p = 0), t === this.v)) this.v = t._();
            else t._();
            return;
          } else if (r.i && r.i.p === 1) ((r.p = 1), (r.i.p = 0), r.g());
          else ((r.p = 1), (e = t));
        } else {
          let r = t.i;
          if (r.p === 1)
            if (((r.p = 0), (t.p = 1), t === this.v)) this.v = t.g();
            else t.g();
          else if (r.i && r.i.p === 1) {
            if (((r.p = t.p), (t.p = 0), (r.i.p = 0), t === this.v)) this.v = t.g();
            else t.g();
            return;
          } else if (r.h && r.h.p === 1) ((r.p = 1), (r.h.p = 0), r._());
          else ((r.p = 1), (e = t));
        }
      }
    }
    S(e) {
      if (this.m === 1) {
        this.clear();
        return;
      }
      let t = e;
      while (t.i || t.h) {
        if (t.h) {
          t = t.h;
          while (t.i) t = t.i;
        } else t = t.i;
        let i = e.u;
        ((e.u = t.u), (t.u = i));
        let s = e.l;
        ((e.l = t.l), (t.l = s), (e = t));
      }
      if (this.C.i === t) this.C.i = t.o;
      else if (this.C.h === t) this.C.h = t.o;
      this.P(t);
      let r = t.o;
      if (t === r.i) r.i = void 0;
      else r.h = void 0;
      if (((this.m -= 1), (this.v.p = 0), this.enableIndex)) while (r !== this.C) ((r.M -= 1), (r = r.o));
    }
    U(e) {
      let t = typeof e === "number" ? e : void 0,
        r = typeof e === "function" ? e : void 0,
        i = typeof e > "u" ? [] : void 0,
        s = 0,
        n = this.v,
        a = [];
      while (a.length || n)
        if (n) (a.push(n), (n = n.i));
        else {
          if (((n = a.pop()), s === t)) return n;
          (i && i.push(n), r && r(n, s, this), (s += 1), (n = n.h));
        }
      return i;
    }
    j(e) {
      while (!0) {
        let t = e.o;
        if (t.p === 0) return;
        let r = t.o;
        if (t === r.i) {
          let i = r.h;
          if (i && i.p === 1) {
            if (((i.p = t.p = 0), r === this.v)) return;
            ((r.p = 1), (e = r));
            continue;
          } else if (e === t.h) {
            if (((e.p = 0), e.i)) e.i.o = t;
            if (e.h) e.h.o = r;
            if (((t.h = e.i), (r.i = e.h), (e.i = t), (e.h = r), r === this.v))
              ((this.v = e), (this.C.o = e));
            else {
              let s = r.o;
              if (s.i === r) s.i = e;
              else s.h = e;
            }
            ((e.o = r.o), (t.o = e), (r.o = e), (r.p = 1));
          } else {
            if (((t.p = 0), r === this.v)) this.v = r.g();
            else r.g();
            r.p = 1;
            return;
          }
        } else {
          let i = r.i;
          if (i && i.p === 1) {
            if (((i.p = t.p = 0), r === this.v)) return;
            ((r.p = 1), (e = r));
            continue;
          } else if (e === t.i) {
            if (((e.p = 0), e.i)) e.i.o = r;
            if (e.h) e.h.o = t;
            if (((r.h = e.i), (t.i = e.h), (e.i = r), (e.h = t), r === this.v))
              ((this.v = e), (this.C.o = e));
            else {
              let s = r.o;
              if (s.i === r) s.i = e;
              else s.h = e;
            }
            ((e.o = r.o), (t.o = e), (r.o = e), (r.p = 1));
          } else {
            if (((t.p = 0), r === this.v)) this.v = r._();
            else r._();
            r.p = 1;
            return;
          }
        }
        if (this.enableIndex) (t.O(), r.O(), e.O());
        return;
      }
    }
    q(e, t, r) {
      if (this.v === void 0)
        return (
          (this.m += 1),
          (this.v = new this.N(e, t, 0)),
          (this.v.o = this.C),
          (this.C.o = this.C.i = this.C.h = this.v),
          this.m
        );
      let i,
        s = this.C.i,
        n = this.A(s.u, e);
      if (n === 0) return ((s.l = t), this.m);
      else if (n > 0) ((s.i = new this.N(e, t)), (s.i.o = s), (i = s.i), (this.C.i = i));
      else {
        let a = this.C.h,
          o = this.A(a.u, e);
        if (o === 0) return ((a.l = t), this.m);
        else if (o < 0) ((a.h = new this.N(e, t)), (a.h.o = a), (i = a.h), (this.C.h = i));
        else {
          if (r !== void 0) {
            let l = r.T;
            if (l !== this.C) {
              let c = this.A(l.u, e);
              if (c === 0) return ((l.l = t), this.m);
              else if (c > 0) {
                let u = l.I(),
                  d = this.A(u.u, e);
                if (d === 0) return ((u.l = t), this.m);
                else if (d < 0)
                  if (((i = new this.N(e, t)), u.h === void 0)) ((u.h = i), (i.o = u));
                  else ((l.i = i), (i.o = l));
              }
            }
          }
          if (i === void 0) {
            i = this.v;
            while (!0) {
              let l = this.A(i.u, e);
              if (l > 0) {
                if (i.i === void 0) {
                  ((i.i = new this.N(e, t)), (i.i.o = i), (i = i.i));
                  break;
                }
                i = i.i;
              } else if (l < 0) {
                if (i.h === void 0) {
                  ((i.h = new this.N(e, t)), (i.h.o = i), (i = i.h));
                  break;
                }
                i = i.h;
              } else return ((i.l = t), this.m);
            }
          }
        }
      }
      if (this.enableIndex) {
        let a = i.o;
        while (a !== this.C) ((a.M += 1), (a = a.o));
      }
      return (this.j(i), (this.m += 1), this.m);
    }
    H(e, t) {
      while (e) {
        let r = this.A(e.u, t);
        if (r < 0) e = e.h;
        else if (r > 0) e = e.i;
        else return e;
      }
      return e || this.C;
    }
    clear() {
      ((this.m = 0), (this.v = void 0), (this.C.o = void 0), (this.C.i = this.C.h = void 0));
    }
    updateKeyByIterator(e, t) {
      let r = e.T;
      if (r === this.C) mr();
      if (this.m === 1) return ((r.u = t), !0);
      let i = r.B().u;
      if (r === this.C.i) {
        if (this.A(i, t) > 0) return ((r.u = t), !0);
        return !1;
      }
      let s = r.I().u;
      if (r === this.C.h) {
        if (this.A(s, t) < 0) return ((r.u = t), !0);
        return !1;
      }
      if (this.A(s, t) >= 0 || this.A(i, t) <= 0) return !1;
      return ((r.u = t), !0);
    }
    eraseElementByPos(e) {
      if (e < 0 || e > this.m - 1) throw RangeError();
      let t = this.U(e);
      return (this.S(t), this.m);
    }
    eraseElementByKey(e) {
      if (this.m === 0) return !1;
      let t = this.H(this.v, e);
      if (t === this.C) return !1;
      return (this.S(t), !0);
    }
    eraseElementByIterator(e) {
      let t = e.T;
      if (t === this.C) mr();
      let r = t.h === void 0;
      if (e.iteratorType === 0) {
        if (r) e.next();
      } else if (!r || t.i === void 0) e.next();
      return (this.S(t), e);
    }
    getHeight() {
      if (this.m === 0) return 0;
      function e(t) {
        if (!t) return 0;
        return Math.max(e(t.i), e(t.h)) + 1;
      }
      return e(this.v);
    }
  }
  class Kc extends Gc {
    constructor(e, t, r) {
      super(r);
      if (((this.T = e), (this.C = t), this.iteratorType === 0))
        ((this.pre = function () {
          if (this.T === this.C.i) mr();
          return ((this.T = this.T.I()), this);
        }),
          (this.next = function () {
            if (this.T === this.C) mr();
            return ((this.T = this.T.B()), this);
          }));
      else
        ((this.pre = function () {
          if (this.T === this.C.h) mr();
          return ((this.T = this.T.B()), this);
        }),
          (this.next = function () {
            if (this.T === this.C) mr();
            return ((this.T = this.T.I()), this);
          }));
    }
    get index() {
      let e = this.T,
        t = this.C.o;
      if (e === this.C) {
        if (t) return t.M - 1;
        return 0;
      }
      let r = 0;
      if (e.i) r += e.i.M;
      while (e !== t) {
        let i = e.o;
        if (e === i.h) {
          if (((r += 1), i.i)) r += i.i.M;
        }
        e = i;
      }
      return r;
    }
    isAccessible() {
      return this.T !== this.C;
    }
  }
  class it extends Kc {
    constructor(e, t, r, i) {
      super(e, t, i);
      this.container = r;
    }
    get pointer() {
      if (this.T === this.C) mr();
      let e = this;
      return new Proxy([], {
        get(t, r) {
          if (r === "0") return e.T.u;
          else if (r === "1") return e.T.l;
          return ((t[0] = e.T.u), (t[1] = e.T.l), t[r]);
        },
        set(t, r, i) {
          if (r !== "1") throw TypeError("prop must be 1");
          return ((e.T.l = i), !0);
        },
      });
    }
    copy() {
      return new it(this.T, this.C, this.container, this.iteratorType);
    }
  }
  class Jc extends Yc {
    constructor(e = [], t, r) {
      super(t, r);
      let i = this;
      e.forEach(function (s) {
        i.setElement(s[0], s[1]);
      });
    }
    begin() {
      return new it(this.C.i || this.C, this.C, this);
    }
    end() {
      return new it(this.C, this.C, this);
    }
    rBegin() {
      return new it(this.C.h || this.C, this.C, this, 1);
    }
    rEnd() {
      return new it(this.C, this.C, this, 1);
    }
    front() {
      if (this.m === 0) return;
      let e = this.C.i;
      return [e.u, e.l];
    }
    back() {
      if (this.m === 0) return;
      let e = this.C.h;
      return [e.u, e.l];
    }
    lowerBound(e) {
      let t = this.R(this.v, e);
      return new it(t, this.C, this);
    }
    upperBound(e) {
      let t = this.K(this.v, e);
      return new it(t, this.C, this);
    }
    reverseLowerBound(e) {
      let t = this.L(this.v, e);
      return new it(t, this.C, this);
    }
    reverseUpperBound(e) {
      let t = this.k(this.v, e);
      return new it(t, this.C, this);
    }
    forEach(e) {
      this.U(function (t, r, i) {
        e([t.u, t.l], r, i);
      });
    }
    setElement(e, t, r) {
      return this.q(e, t, r);
    }
    getElementByPos(e) {
      if (e < 0 || e > this.m - 1) throw RangeError();
      let t = this.U(e);
      return [t.u, t.l];
    }
    find(e) {
      let t = this.H(this.v, e);
      return new it(t, this.C, this);
    }
    getElementByKey(e) {
      return this.H(this.v, e).l;
    }
    union(e) {
      let t = this;
      return (
        e.forEach(function (r) {
          t.setElement(r[0], r[1]);
        }),
        this.m
      );
    }
    *[Symbol.iterator]() {
      let e = this.m,
        t = this.U();
      for (let r = 0; r < e; ++r) {
        let i = t[r];
        yield [i.u, i.l];
      }
    }
  }
  Xc.OrderedMap = Jc;
});

export { Qc };
