/**
 * @js-sdsl/ordered-map/dist/cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @js-sdsl/ordered-map@4.4.2
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:44332-52023 cjs-fingerprint
var Qc = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "t", {
    value: true,
  });
  class TreeNode {
    constructor(t_2, e, s = 1) {
      this.i = undefined;
      this.h = undefined;
      this.o = undefined;
      this.u = t_2;
      this.l = e;
      this.p = s;
    }
    I() {
      let t_2 = this;
      let e = t_2.o.o === t_2;
      if (e && t_2.p === 1) t_2 = t_2.h;
      else if (t_2.i) {
        t_2 = t_2.i;
        while (t_2.h) t_2 = t_2.h;
      } else {
        if (e) return t_2.o;
        let s = t_2.o;
        while (s.i === t_2) {
          t_2 = s;
          s = t_2.o;
        }
        t_2 = s;
      }
      return t_2;
    }
    B() {
      let t_2 = this;
      if (t_2.h) {
        t_2 = t_2.h;
        while (t_2.i) t_2 = t_2.i;
        return t_2;
      } else {
        let e = t_2.o;
        while (e.h === t_2) {
          t_2 = e;
          e = t_2.o;
        }
        if (t_2.h !== e) return e;
        else return t_2;
      }
    }
    _() {
      let t_2 = this.o;
      let e = this.h;
      let s = e.i;
      if (t_2.o === this) t_2.o = e;
      else if (t_2.i === this) t_2.i = e;
      else t_2.h = e;
      e.o = t_2;
      e.i = this;
      this.o = e;
      this.h = s;
      if (s) s.o = this;
      return e;
    }
    g() {
      let t_2 = this.o;
      let e = this.i;
      let s = e.h;
      if (t_2.o === this) t_2.o = e;
      else if (t_2.i === this) t_2.i = e;
      else t_2.h = e;
      e.o = t_2;
      e.h = this;
      this.o = e;
      this.i = s;
      if (s) s.o = this;
      return e;
    }
  }
  class TreeNodeEnableIndex extends TreeNode {
    constructor() {
      super(...arguments);
      this.M = 1;
    }
    _() {
      let t = super._();
      this.O();
      t.O();
      return t;
    }
    g() {
      let t = super.g();
      this.O();
      t.O();
      return t;
    }
    O() {
      this.M = 1;
      if (this.i) this.M += this.i.M;
      if (this.h) this.M += this.h.M;
    }
  }
  class ContainerIterator {
    constructor(t = 0) {
      this.iteratorType = t;
    }
    equals(t) {
      return this.T === t.T;
    }
  }
  class Base {
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
  class Container extends Base {}
  function throwIteratorAccessError() {
    throw RangeError("Iterator access denied!");
  }
  class TreeContainer extends Container {
    constructor(
      t_2 = function (t, e) {
        if (t < e) return -1;
        if (t > e) return 1;
        return 0;
      },
      e = false,
    ) {
      super();
      this.v = undefined;
      this.A = t_2;
      this.enableIndex = e;
      this.N = e ? TreeNodeEnableIndex : TreeNode;
      this.C = new this.N();
    }
    R(t_2, e) {
      let s = this.C;
      while (t_2) {
        let compareResult = this.A(t_2.u, e);
        if (compareResult < 0) t_2 = t_2.h;
        else if (compareResult > 0) {
          s = t_2;
          t_2 = t_2.i;
        } else return t_2;
      }
      return s;
    }
    K(t_2, key) {
      let s = this.C;
      while (t_2)
        if (this.A(t_2.u, key) <= 0) t_2 = t_2.h;
        else {
          s = t_2;
          t_2 = t_2.i;
        }
      return s;
    }
    L(t_2, e) {
      let s = this.C;
      while (t_2) {
        let compareResult = this.A(t_2.u, e);
        if (compareResult < 0) {
          s = t_2;
          t_2 = t_2.h;
        } else if (compareResult > 0) t_2 = t_2.i;
        else return t_2;
      }
      return s;
    }
    k(t_2, key) {
      let s = this.C;
      while (t_2)
        if (this.A(t_2.u, key) < 0) {
          s = t_2;
          t_2 = t_2.h;
        } else t_2 = t_2.i;
      return s;
    }
    P(t_2) {
      while (true) {
        let e = t_2.o;
        if (e === this.C) return;
        if (t_2.p === 1) {
          t_2.p = 0;
          return;
        }
        if (t_2 === e.i) {
          let s = e.h;
          if (s.p === 1) {
            s.p = 0;
            e.p = 1;
            if (e === this.v) this.v = e._();
            else e._();
          } else if (s.h && s.h.p === 1) {
            s.p = e.p;
            e.p = 0;
            s.h.p = 0;
            if (e === this.v) this.v = e._();
            else e._();
            return;
          } else if (s.i && s.i.p === 1) {
            s.p = 1;
            s.i.p = 0;
            s.g();
          } else {
            s.p = 1;
            t_2 = e;
          }
        } else {
          let s = e.i;
          if (s.p === 1) {
            s.p = 0;
            e.p = 1;
            if (e === this.v) this.v = e.g();
            else e.g();
          } else if (s.i && s.i.p === 1) {
            s.p = e.p;
            e.p = 0;
            s.i.p = 0;
            if (e === this.v) this.v = e.g();
            else e.g();
            return;
          } else if (s.h && s.h.p === 1) {
            s.p = 1;
            s.h.p = 0;
            s._();
          } else {
            s.p = 1;
            t_2 = e;
          }
        }
      }
    }
    S(t_2) {
      if (this.m === 1) {
        this.clear();
        return;
      }
      let e = t_2;
      while (e.i || e.h) {
        if (e.h) {
          e = e.h;
          while (e.i) e = e.i;
        } else e = e.i;
        let s_2 = t_2.u;
        t_2.u = e.u;
        e.u = s_2;
        let i = t_2.l;
        t_2.l = e.l;
        e.l = i;
        t_2 = e;
      }
      if (this.C.i === e) this.C.i = e.o;
      else if (this.C.h === e) this.C.h = e.o;
      this.P(e);
      let s = e.o;
      if (e === s.i) s.i = undefined;
      else s.h = undefined;
      this.m -= 1;
      this.v.p = 0;
      if (this.enableIndex)
        while (s !== this.C) {
          s.M -= 1;
          s = s.o;
        }
    }
    U(t_2) {
      let e = typeof t_2 === "number" ? t_2 : undefined;
      let s_2 = typeof t_2 === "function" ? t_2 : undefined;
      let resultNodes = typeof t_2 === "undefined" ? [] : undefined;
      let r = 0;
      let currentNode = this.v;
      let h = [];
      while (h.length || currentNode)
        if (currentNode) {
          h.push(currentNode);
          currentNode = currentNode.i;
        } else {
          currentNode = h.pop();
          if (r === e) return currentNode;
          if (resultNodes) resultNodes.push(currentNode);
          if (s_2) s_2(currentNode, r, this);
          r += 1;
          currentNode = currentNode.h;
        }
      return resultNodes;
    }
    j(t_2) {
      while (true) {
        let e = t_2.o;
        if (e.p === 0) return;
        let s_2 = e.o;
        if (e === s_2.i) {
          let rightUncleNode = s_2.h;
          if (rightUncleNode && rightUncleNode.p === 1) {
            rightUncleNode.p = e.p = 0;
            if (s_2 === this.v) return;
            s_2.p = 1;
            t_2 = s_2;
            continue;
          } else if (t_2 === e.h) {
            t_2.p = 0;
            if (t_2.i) t_2.i.o = e;
            if (t_2.h) t_2.h.o = s_2;
            e.h = t_2.i;
            s_2.i = t_2.h;
            t_2.i = e;
            t_2.h = s_2;
            if (s_2 === this.v) {
              this.v = t_2;
              this.C.o = t_2;
            } else {
              let e = s_2.o;
              if (e.i === s_2) e.i = t_2;
              else e.h = t_2;
            }
            t_2.o = s_2.o;
            e.o = t_2;
            s_2.o = t_2;
            s_2.p = 1;
          } else {
            e.p = 0;
            if (s_2 === this.v) this.v = s_2.g();
            else s_2.g();
            s_2.p = 1;
            return;
          }
        } else {
          let leftUncleNode = s_2.i;
          if (leftUncleNode && leftUncleNode.p === 1) {
            leftUncleNode.p = e.p = 0;
            if (s_2 === this.v) return;
            s_2.p = 1;
            t_2 = s_2;
            continue;
          } else if (t_2 === e.i) {
            t_2.p = 0;
            if (t_2.i) t_2.i.o = s_2;
            if (t_2.h) t_2.h.o = e;
            s_2.h = t_2.i;
            e.i = t_2.h;
            t_2.i = s_2;
            t_2.h = e;
            if (s_2 === this.v) {
              this.v = t_2;
              this.C.o = t_2;
            } else {
              let e = s_2.o;
              if (e.i === s_2) e.i = t_2;
              else e.h = t_2;
            }
            t_2.o = s_2.o;
            e.o = t_2;
            s_2.o = t_2;
            s_2.p = 1;
          } else {
            e.p = 0;
            if (s_2 === this.v) this.v = s_2._();
            else s_2._();
            s_2.p = 1;
            return;
          }
        }
        if (this.enableIndex) {
          e.O();
          s_2.O();
          t_2.O();
        }
        return;
      }
    }
    q(t_2, e, s_2) {
      if (this.v === undefined) {
        this.m += 1;
        this.v = new this.N(t_2, e, 0);
        this.v.o = this.C;
        this.C.o = this.C.i = this.C.h = this.v;
        return this.m;
      }
      let newNode;
      let r = this.C.i;
      let compareResult = this.A(r.u, t_2);
      if (compareResult === 0) {
        r.l = e;
        return this.m;
      } else if (compareResult > 0) {
        r.i = new this.N(t_2, e);
        r.i.o = r;
        newNode = r.i;
        this.C.i = newNode;
      } else {
        let r = this.C.h;
        let n = this.A(r.u, t_2);
        if (n === 0) {
          r.l = e;
          return this.m;
        } else if (n < 0) {
          r.h = new this.N(t_2, e);
          r.h.o = r;
          newNode = r.h;
          this.C.h = newNode;
        } else {
          if (s_2 !== undefined) {
            let r = s_2.T;
            if (r !== this.C) {
              let s = this.A(r.u, t_2);
              if (s === 0) {
                r.l = e;
                return this.m;
              } else if (s > 0) {
                let s = r.I();
                let n = this.A(s.u, t_2);
                if (n === 0) {
                  s.l = e;
                  return this.m;
                } else if (n < 0) {
                  newNode = new this.N(t_2, e);
                  if (s.h === undefined) {
                    s.h = newNode;
                    newNode.o = s;
                  } else {
                    r.i = newNode;
                    newNode.o = r;
                  }
                }
              }
            }
          }
          if (newNode === undefined) {
            newNode = this.v;
            while (true) {
              let s = this.A(newNode.u, t_2);
              if (s > 0) {
                if (newNode.i === undefined) {
                  newNode.i = new this.N(t_2, e);
                  newNode.i.o = newNode;
                  newNode = newNode.i;
                  break;
                }
                newNode = newNode.i;
              } else if (s < 0) {
                if (newNode.h === undefined) {
                  newNode.h = new this.N(t_2, e);
                  newNode.h.o = newNode;
                  newNode = newNode.h;
                  break;
                }
                newNode = newNode.h;
              } else {
                newNode.l = e;
                return this.m;
              }
            }
          }
        }
      }
      if (this.enableIndex) {
        let t = newNode.o;
        while (t !== this.C) {
          t.M += 1;
          t = t.o;
        }
      }
      this.j(newNode);
      this.m += 1;
      return this.m;
    }
    H(t_2, e) {
      while (t_2) {
        let s = this.A(t_2.u, e);
        if (s < 0) t_2 = t_2.h;
        else if (s > 0) t_2 = t_2.i;
        else return t_2;
      }
      return t_2 || this.C;
    }
    clear() {
      this.m = 0;
      this.v = undefined;
      this.C.o = undefined;
      this.C.i = this.C.h = undefined;
    }
    updateKeyByIterator(t_2, e) {
      let s_2 = t_2.T;
      if (s_2 === this.C) throwIteratorAccessError();
      if (this.m === 1) {
        s_2.u = e;
        return true;
      }
      let nextKey = s_2.B().u;
      if (s_2 === this.C.i) {
        if (this.A(nextKey, e) > 0) {
          s_2.u = e;
          return true;
        }
        return false;
      }
      let r = s_2.I().u;
      if (s_2 === this.C.h) {
        if (this.A(r, e) < 0) {
          s_2.u = e;
          return true;
        }
        return false;
      }
      if (this.A(r, e) >= 0 || this.A(nextKey, e) <= 0) return false;
      s_2.u = e;
      return true;
    }
    eraseElementByPos(t_2) {
      if (t_2 < 0 || t_2 > this.m - 1) throw RangeError();
      let e = this.U(t_2);
      this.S(e);
      return this.m;
    }
    eraseElementByKey(t_2) {
      if (this.m === 0) return false;
      let e = this.H(this.v, t_2);
      if (e === this.C) return false;
      this.S(e);
      return true;
    }
    eraseElementByIterator(t_2) {
      let e = t_2.T;
      if (e === this.C) throwIteratorAccessError();
      let s = e.h === undefined;
      if (t_2.iteratorType === 0) {
        if (s) t_2.next();
      } else if (!s || e.i === undefined) t_2.next();
      this.S(e);
      return t_2;
    }
    getHeight() {
      if (this.m === 0) return 0;
      function traversal(node) {
        if (!node) return 0;
        return Math.max(traversal(node.i), traversal(node.h)) + 1;
      }
      return traversal(this.v);
    }
  }
  class TreeIterator extends ContainerIterator {
    constructor(t_2, e, s) {
      super(s);
      this.T = t_2;
      this.C = e;
      if (this.iteratorType === 0) {
        this.pre = function () {
          if (this.T === this.C.i) throwIteratorAccessError();
          this.T = this.T.I();
          return this;
        };
        this.next = function () {
          if (this.T === this.C) throwIteratorAccessError();
          this.T = this.T.B();
          return this;
        };
      } else {
        this.pre = function () {
          if (this.T === this.C.h) throwIteratorAccessError();
          this.T = this.T.B();
          return this;
        };
        this.next = function () {
          if (this.T === this.C) throwIteratorAccessError();
          this.T = this.T.I();
          return this;
        };
      }
    }
    get index() {
      let t_2 = this.T;
      let e = this.C.o;
      if (t_2 === this.C) {
        if (e) return e.M - 1;
        return 0;
      }
      let s = 0;
      if (t_2.i) s += t_2.i.M;
      while (t_2 !== e) {
        let e = t_2.o;
        if (t_2 === e.h) {
          s += 1;
          if (e.i) s += e.i.M;
        }
        t_2 = e;
      }
      return s;
    }
    isAccessible() {
      return this.T !== this.C;
    }
  }
  class OrderedMapIterator extends TreeIterator {
    constructor(t_2, e, s, iteratorType) {
      super(t_2, e, iteratorType);
      this.container = s;
    }
    get pointer() {
      if (this.T === this.C) throwIteratorAccessError();
      let t_2 = this;
      return new Proxy([], {
        get(e, s) {
          if (s === "0") return t_2.T.u;
          else if (s === "1") return t_2.T.l;
          e[0] = t_2.T.u;
          e[1] = t_2.T.l;
          return e[s];
        },
        set(e, s, newValue) {
          if (s !== "1") throw TypeError("prop must be 1");
          t_2.T.l = newValue;
          return true;
        },
      });
    }
    copy() {
      return new OrderedMapIterator(this.T, this.C, this.container, this.iteratorType);
    }
  }
  class OrderedMap extends TreeContainer {
    constructor(t_2 = [], e, s) {
      super(e, s);
      let selfRef = this;
      t_2.forEach(function (t) {
        selfRef.setElement(t[0], t[1]);
      });
    }
    begin() {
      return new OrderedMapIterator(this.C.i || this.C, this.C, this);
    }
    end() {
      return new OrderedMapIterator(this.C, this.C, this);
    }
    rBegin() {
      return new OrderedMapIterator(this.C.h || this.C, this.C, this, 1);
    }
    rEnd() {
      return new OrderedMapIterator(this.C, this.C, this, 1);
    }
    front() {
      if (this.m === 0) return;
      let t = this.C.i;
      return [t.u, t.l];
    }
    back() {
      if (this.m === 0) return;
      let t = this.C.h;
      return [t.u, t.l];
    }
    lowerBound(t_2) {
      let e = this.R(this.v, t_2);
      return new OrderedMapIterator(e, this.C, this);
    }
    upperBound(t_2) {
      let e = this.K(this.v, t_2);
      return new OrderedMapIterator(e, this.C, this);
    }
    reverseLowerBound(t_2) {
      let e = this.L(this.v, t_2);
      return new OrderedMapIterator(e, this.C, this);
    }
    reverseUpperBound(t_2) {
      let e = this.k(this.v, t_2);
      return new OrderedMapIterator(e, this.C, this);
    }
    forEach(t_2) {
      this.U(function (e, s, treeContainer) {
        t_2([e.u, e.l], s, treeContainer);
      });
    }
    setElement(t_2, e, s) {
      return this.q(t_2, e, s);
    }
    getElementByPos(t_2) {
      if (t_2 < 0 || t_2 > this.m - 1) throw RangeError();
      let e = this.U(t_2);
      return [e.u, e.l];
    }
    find(t_2) {
      let e = this.H(this.v, t_2);
      return new OrderedMapIterator(e, this.C, this);
    }
    getElementByKey(key) {
      return this.H(this.v, key).l;
    }
    union(t_2) {
      let e = this;
      t_2.forEach(function (t) {
        e.setElement(t[0], t[1]);
      });
      return this.m;
    }
    *[Symbol.iterator]() {
      let t_2 = this.m;
      let e = this.U();
      for (let s = 0; s < t_2; ++s) {
        let t = e[s];
        yield [t.u, t.l];
      }
    }
  }
  cjsExports.OrderedMap = OrderedMap;
});
export { Qc };
