/**
 * yallist/yallist.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: yallist@4.0.0
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { BO } from "./iterator.js";

//@ chunk-1ny7cxrt.js:10965-15716 cjs-fingerprint
var KO = x(function (Fve, HO) {
  HO.exports = Nt;
  Nt.Node = Fa;
  Nt.create = Nt;
  function Nt(e) {
    var t = this;
    if (!(t instanceof Nt)) t = new Nt();
    if (((t.tail = null), (t.head = null), (t.length = 0), e && typeof e.forEach === "function"))
      e.forEach(function (r) {
        t.push(r);
      });
    else if (arguments.length > 0) for (var n = 0, o = arguments.length; n < o; n++) t.push(arguments[n]);
    return t;
  }
  Nt.prototype.removeNode = function (e) {
    if (e.list !== this) throw Error("removing node which does not belong to this list");
    var { next: t, prev: prev } = e;
    if (t) t.prev = prev;
    if (prev) prev.next = t;
    if (e === this.head) this.head = t;
    if (e === this.tail) this.tail = prev;
    return (e.list.length--, (e.next = null), (e.prev = null), (e.list = null), t);
  };
  Nt.prototype.unshiftNode = function (e) {
    if (e === this.head) return;
    if (e.list) e.list.removeNode(e);
    var head = this.head;
    if (((e.list = this), (e.next = head), head)) head.prev = e;
    if (((this.head = e), !this.tail)) this.tail = e;
    this.length++;
  };
  Nt.prototype.pushNode = function (e) {
    if (e === this.tail) return;
    if (e.list) e.list.removeNode(e);
    var tail = this.tail;
    if (((e.list = this), (e.prev = tail), tail)) tail.next = e;
    if (((this.tail = e), !this.head)) this.head = e;
    this.length++;
  };
  Nt.prototype.push = function () {
    for (var e = 0, t = arguments.length; e < t; e++) bF(this, arguments[e]);
    return this.length;
  };
  Nt.prototype.unshift = function () {
    for (var e = 0, t = arguments.length; e < t; e++) vF(this, arguments[e]);
    return this.length;
  };
  Nt.prototype.pop = function () {
    if (!this.tail) return;
    var e = this.tail.value;
    if (((this.tail = this.tail.prev), this.tail)) this.tail.next = null;
    else this.head = null;
    return (this.length--, e);
  };
  Nt.prototype.shift = function () {
    if (!this.head) return;
    var e = this.head.value;
    if (((this.head = this.head.next), this.head)) this.head.prev = null;
    else this.tail = null;
    return (this.length--, e);
  };
  Nt.prototype.forEach = function (e, t) {
    t = t || this;
    for (var head = this.head, o = 0; head !== null; o++)
      (e.call(t, head.value, o, this), (head = head.next));
  };
  Nt.prototype.forEachReverse = function (e, t) {
    t = t || this;
    for (var tail = this.tail, o = this.length - 1; tail !== null; o--)
      (e.call(t, tail.value, o, this), (tail = tail.prev));
  };
  Nt.prototype.get = function (e) {
    for (var t = 0, head = this.head; head !== null && t < e; t++) head = head.next;
    if (t === e && head !== null) return head.value;
  };
  Nt.prototype.getReverse = function (e) {
    for (var t = 0, tail = this.tail; tail !== null && t < e; t++) tail = tail.prev;
    if (t === e && tail !== null) return tail.value;
  };
  Nt.prototype.map = function (e, t) {
    t = t || this;
    var n = new Nt();
    for (var head = this.head; head !== null;) (n.push(e.call(t, head.value, this)), (head = head.next));
    return n;
  };
  Nt.prototype.mapReverse = function (e, t) {
    t = t || this;
    var n = new Nt();
    for (var tail = this.tail; tail !== null;) (n.push(e.call(t, tail.value, this)), (tail = tail.prev));
    return n;
  };
  Nt.prototype.reduce = function (e, t) {
    var n,
      head = this.head;
    if (arguments.length > 1) n = t;
    else if (this.head) ((head = this.head.next), (n = this.head.value));
    else throw TypeError("Reduce of empty list with no initial value");
    for (var r = 0; head !== null; r++) ((n = e(n, head.value, r)), (head = head.next));
    return n;
  };
  Nt.prototype.reduceReverse = function (e, t) {
    var n,
      tail = this.tail;
    if (arguments.length > 1) n = t;
    else if (this.tail) ((tail = this.tail.prev), (n = this.tail.value));
    else throw TypeError("Reduce of empty list with no initial value");
    for (var r = this.length - 1; tail !== null; r--) ((n = e(n, tail.value, r)), (tail = tail.prev));
    return n;
  };
  Nt.prototype.toArray = function () {
    var e = Array(this.length);
    for (var t = 0, head = this.head; head !== null; t++) ((e[t] = head.value), (head = head.next));
    return e;
  };
  Nt.prototype.toArrayReverse = function () {
    var e = Array(this.length);
    for (var t = 0, tail = this.tail; tail !== null; t++) ((e[t] = tail.value), (tail = tail.prev));
    return e;
  };
  Nt.prototype.slice = function (e, t) {
    if (((t = t || this.length), t < 0)) t += this.length;
    if (((e = e || 0), e < 0)) e += this.length;
    var n = new Nt();
    if (t < e || t < 0) return n;
    if (e < 0) e = 0;
    if (t > this.length) t = this.length;
    for (var o = 0, head = this.head; head !== null && o < e; o++) head = head.next;
    for (; head !== null && o < t; o++, head = head.next) n.push(head.value);
    return n;
  };
  Nt.prototype.sliceReverse = function (e, t) {
    if (((t = t || this.length), t < 0)) t += this.length;
    if (((e = e || 0), e < 0)) e += this.length;
    var n = new Nt();
    if (t < e || t < 0) return n;
    if (e < 0) e = 0;
    if (t > this.length) t = this.length;
    for (var o = this.length, tail = this.tail; tail !== null && o > t; o--) tail = tail.prev;
    for (; tail !== null && o > e; o--, tail = tail.prev) n.push(tail.value);
    return n;
  };
  Nt.prototype.splice = function (e, t, ...n) {
    if (e > this.length) e = this.length - 1;
    if (e < 0) e = this.length + e;
    for (var o = 0, head = this.head; head !== null && o < e; o++) head = head.next;
    var s = [];
    for (var o = 0; head && o < t; o++) (s.push(head.value), (head = this.removeNode(head)));
    if (head === null) head = this.tail;
    if (head !== this.head && head !== this.tail) head = head.prev;
    for (var o = 0; o < n.length; o++) head = _F(this, head, n[o]);
    return s;
  };
  Nt.prototype.reverse = function () {
    var head = this.head,
      tail = this.tail;
    for (var n = head; n !== null; n = n.prev) {
      var prev = n.prev;
      ((n.prev = n.next), (n.next = prev));
    }
    return ((this.head = tail), (this.tail = head), this);
  };
  function _F(e, t, n) {
    var o = t === e.head ? new Fa(n, null, t, e) : new Fa(n, t, t.next, e);
    if (o.next === null) e.tail = o;
    if (o.prev === null) e.head = o;
    return (e.length++, o);
  }
  function bF(e, t) {
    if (((e.tail = new Fa(t, e.tail, null, e)), !e.head)) e.head = e.tail;
    e.length++;
  }
  function vF(e, t) {
    if (((e.head = new Fa(t, null, e.head, e)), !e.tail)) e.tail = e.head;
    e.length++;
  }
  function Fa(e, t, n, o) {
    if (!(this instanceof Fa)) return new Fa(e, t, n, o);
    if (((this.list = o), (this.value = e), t)) ((t.next = this), (this.prev = t));
    else this.prev = null;
    if (n) ((n.prev = this), (this.next = n));
    else this.next = null;
  }
  try {
    BO()(Nt);
  } catch (error) {}
});

export { KO };
