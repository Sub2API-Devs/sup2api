/**
 * yallist/yallist.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: yallist@4.0.0
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { require_iterator } from "./iterator.js";

//@ chunk-1ny7cxrt.js:10965-15716 cjs-fingerprint
var require_yallist = x(function (cjsExports, cjsModule) {
  cjsModule.exports = Yallist;
  Yallist.Node = Node;
  Yallist.create = Yallist;
  function Yallist(list) {
    var t = this;
    if (!(t instanceof Yallist)) t = new Yallist();
    t.tail = null;
    t.head = null;
    t.length = 0;
    if (list && typeof list.forEach === "function")
      list.forEach(function (item) {
        t.push(item);
      });
    else if (arguments.length > 0) for (var i = 0, l = arguments.length; i < l; i++) t.push(arguments[i]);
    return t;
  }
  Yallist.prototype.removeNode = function (node) {
    if (node.list !== this) throw Error("removing node which does not belong to this list");
    var { next, prev } = node;
    if (next) next.prev = prev;
    if (prev) prev.next = next;
    if (node === this.head) this.head = next;
    if (node === this.tail) this.tail = prev;
    node.list.length--;
    node.next = null;
    node.prev = null;
    node.list = null;
    return next;
  };
  Yallist.prototype.unshiftNode = function (node) {
    if (node === this.head) return;
    if (node.list) node.list.removeNode(node);
    var head = this.head;
    node.list = this;
    node.next = head;
    if (head) head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
    this.length++;
  };
  Yallist.prototype.pushNode = function (node) {
    if (node === this.tail) return;
    if (node.list) node.list.removeNode(node);
    var tail = this.tail;
    node.list = this;
    node.prev = tail;
    if (tail) tail.next = node;
    this.tail = node;
    if (!this.head) this.head = node;
    this.length++;
  };
  Yallist.prototype.push = function () {
    for (var i = 0, l = arguments.length; i < l; i++) push(this, arguments[i]);
    return this.length;
  };
  Yallist.prototype.unshift = function () {
    for (var i = 0, l = arguments.length; i < l; i++) unshift(this, arguments[i]);
    return this.length;
  };
  Yallist.prototype.pop = function () {
    if (!this.tail) return;
    var res = this.tail.value;
    this.tail = this.tail.prev;
    if (this.tail) this.tail.next = null;
    else this.head = null;
    this.length--;
    return res;
  };
  Yallist.prototype.shift = function () {
    if (!this.head) return;
    var res = this.head.value;
    this.head = this.head.next;
    if (this.head) this.head.prev = null;
    else this.tail = null;
    this.length--;
    return res;
  };
  Yallist.prototype.forEach = function (fn, thisp) {
    thisp = thisp || this;
    for (var walker = this.head, i = 0; walker !== null; i++) {
      fn.call(thisp, walker.value, i, this);
      walker = walker.next;
    }
  };
  Yallist.prototype.forEachReverse = function (fn, thisp) {
    thisp = thisp || this;
    for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
      fn.call(thisp, walker.value, i, this);
      walker = walker.prev;
    }
  };
  Yallist.prototype.get = function (n_2) {
    for (var i = 0, walker = this.head; walker !== null && i < n_2; i++) walker = walker.next;
    if (i === n_2 && walker !== null) return walker.value;
  };
  Yallist.prototype.getReverse = function (n_2) {
    for (var i = 0, walker = this.tail; walker !== null && i < n_2; i++) walker = walker.prev;
    if (i === n_2 && walker !== null) return walker.value;
  };
  Yallist.prototype.map = function (fn, thisp) {
    thisp = thisp || this;
    var res = new Yallist();
    for (var walker = this.head; walker !== null;) {
      res.push(fn.call(thisp, walker.value, this));
      walker = walker.next;
    }
    return res;
  };
  Yallist.prototype.mapReverse = function (fn, thisp) {
    thisp = thisp || this;
    var res = new Yallist();
    for (var walker = this.tail; walker !== null;) {
      res.push(fn.call(thisp, walker.value, this));
      walker = walker.prev;
    }
    return res;
  };
  Yallist.prototype.reduce = function (fn, initial) {
    var acc;
    var walker = this.head;
    if (arguments.length > 1) acc = initial;
    else if (this.head) {
      walker = this.head.next;
      acc = this.head.value;
    } else throw TypeError("Reduce of empty list with no initial value");
    for (var i = 0; walker !== null; i++) {
      acc = fn(acc, walker.value, i);
      walker = walker.next;
    }
    return acc;
  };
  Yallist.prototype.reduceReverse = function (fn, initial) {
    var acc;
    var walker = this.tail;
    if (arguments.length > 1) acc = initial;
    else if (this.tail) {
      walker = this.tail.prev;
      acc = this.tail.value;
    } else throw TypeError("Reduce of empty list with no initial value");
    for (var i = this.length - 1; walker !== null; i--) {
      acc = fn(acc, walker.value, i);
      walker = walker.prev;
    }
    return acc;
  };
  Yallist.prototype.toArray = function () {
    var arr = Array(this.length);
    for (var i = 0, walker = this.head; walker !== null; i++) {
      arr[i] = walker.value;
      walker = walker.next;
    }
    return arr;
  };
  Yallist.prototype.toArrayReverse = function () {
    var arr = Array(this.length);
    for (var i = 0, walker = this.tail; walker !== null; i++) {
      arr[i] = walker.value;
      walker = walker.prev;
    }
    return arr;
  };
  Yallist.prototype.slice = function (from, to) {
    to = to || this.length;
    if (to < 0) to += this.length;
    from = from || 0;
    if (from < 0) from += this.length;
    var ret = new Yallist();
    if (to < from || to < 0) return ret;
    if (from < 0) from = 0;
    if (to > this.length) to = this.length;
    for (var i = 0, walker = this.head; walker !== null && i < from; i++) walker = walker.next;
    for (; walker !== null && i < to; i++, walker = walker.next) ret.push(walker.value);
    return ret;
  };
  Yallist.prototype.sliceReverse = function (from, to) {
    to = to || this.length;
    if (to < 0) to += this.length;
    from = from || 0;
    if (from < 0) from += this.length;
    var ret = new Yallist();
    if (to < from || to < 0) return ret;
    if (from < 0) from = 0;
    if (to > this.length) to = this.length;
    for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) walker = walker.prev;
    for (; walker !== null && i > from; i--, walker = walker.prev) ret.push(walker.value);
    return ret;
  };
  Yallist.prototype.splice = function (start, deleteCount, ...nodes) {
    if (start > this.length) start = this.length - 1;
    if (start < 0) start = this.length + start;
    for (var i = 0, walker = this.head; walker !== null && i < start; i++) walker = walker.next;
    var ret = [];
    for (var i = 0; walker && i < deleteCount; i++) {
      ret.push(walker.value);
      walker = this.removeNode(walker);
    }
    if (walker === null) walker = this.tail;
    if (walker !== this.head && walker !== this.tail) walker = walker.prev;
    for (var i = 0; i < nodes.length; i++) walker = insert(this, walker, nodes[i]);
    return ret;
  };
  Yallist.prototype.reverse = function () {
    var head = this.head;
    var tail = this.tail;
    for (var walker = head; walker !== null; walker = walker.prev) {
      var p = walker.prev;
      walker.prev = walker.next;
      walker.next = p;
    }
    this.head = tail;
    this.tail = head;
    return this;
  };
  function insert(e, node, value) {
    var inserted = node === e.head ? new Node(value, null, node, e) : new Node(value, node, node.next, e);
    if (inserted.next === null) e.tail = inserted;
    if (inserted.prev === null) e.head = inserted;
    e.length++;
    return inserted;
  }
  function push(e, item) {
    e.tail = new Node(item, e.tail, null, e);
    if (!e.head) e.head = e.tail;
    e.length++;
  }
  function unshift(e, item) {
    e.head = new Node(item, null, e.head, e);
    if (!e.tail) e.tail = e.head;
    e.length++;
  }
  function Node(value, prev, next, list) {
    if (!(this instanceof Node)) return new Node(value, prev, next, list);
    this.list = list;
    this.value = value;
    if (prev) {
      prev.next = this;
      this.prev = prev;
    } else this.prev = null;
    if (next) {
      next.prev = this;
      this.next = next;
    } else this.next = null;
  }
  try {
    require_iterator()(Yallist);
  } catch (er) {}
});
export { require_yallist };
