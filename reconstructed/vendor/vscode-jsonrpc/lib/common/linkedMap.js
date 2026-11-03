/**
 * vscode-jsonrpc/lib/common/linkedMap.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-t4ksmxzx.js:8540-13140 cjs-fingerprint
var mt = x(function (Rr) {
  var _r;
  Object.defineProperty(Rr, "__esModule", { value: !0 });
  Rr.LRUCache = Rr.LinkedMap = Rr.Touch = void 0;
  var U;
  (function (e) {
    ((e.None = 0), (e.First = 1), (e.AsOld = e.First), (e.Last = 2), (e.AsNew = e.Last));
  })(U || (Rr.Touch = U = {}));
  class pt {
    constructor() {
      ((this[_r] = "LinkedMap"),
        (this._map = new Map()),
        (this._head = void 0),
        (this._tail = void 0),
        (this._size = 0),
        (this._state = 0));
    }
    clear() {
      (this._map.clear(), (this._head = void 0), (this._tail = void 0), (this._size = 0), this._state++);
    }
    isEmpty() {
      return !this._head && !this._tail;
    }
    get size() {
      return this._size;
    }
    get first() {
      return this._head?.value;
    }
    get last() {
      return this._tail?.value;
    }
    has(e) {
      return this._map.has(e);
    }
    get(e, r = U.None) {
      let n = this._map.get(e);
      if (!n) return;
      if (r !== U.None) this.touch(n, r);
      return n.value;
    }
    set(e, r, n = U.None) {
      let s = this._map.get(e);
      if (s) {
        if (((s.value = r), n !== U.None)) this.touch(s, n);
      } else {
        switch (((s = { key: e, value: r, next: void 0, previous: void 0 }), n)) {
          case U.None:
            this.addItemLast(s);
            break;
          case U.First:
            this.addItemFirst(s);
            break;
          case U.Last:
            this.addItemLast(s);
            break;
          default:
            this.addItemLast(s);
            break;
        }
        (this._map.set(e, s), this._size++);
      }
      return this;
    }
    delete(e) {
      return !!this.remove(e);
    }
    remove(e) {
      let r = this._map.get(e);
      if (!r) return;
      return (this._map.delete(e), this.removeItem(r), this._size--, r.value);
    }
    shift() {
      if (!this._head && !this._tail) return;
      if (!this._head || !this._tail) throw Error("Invalid list");
      let _head = this._head;
      return (this._map.delete(_head.key), this.removeItem(_head), this._size--, _head.value);
    }
    forEach(e, r) {
      let _state = this._state,
        _head = this._head;
      while (_head) {
        if (r) e.bind(r)(_head.value, _head.key, this);
        else e(_head.value, _head.key, this);
        if (this._state !== _state) throw Error("LinkedMap got modified during iteration.");
        _head = _head.next;
      }
    }
    keys() {
      let _state = this._state,
        _head = this._head,
        n = {
          [Symbol.iterator]: () => n,
          next: () => {
            if (this._state !== _state) throw Error("LinkedMap got modified during iteration.");
            if (_head) {
              let s = { value: _head.key, done: !1 };
              return ((_head = _head.next), s);
            } else return { value: void 0, done: !0 };
          },
        };
      return n;
    }
    values() {
      let _state = this._state,
        _head = this._head,
        n = {
          [Symbol.iterator]: () => n,
          next: () => {
            if (this._state !== _state) throw Error("LinkedMap got modified during iteration.");
            if (_head) {
              let s = { value: _head.value, done: !1 };
              return ((_head = _head.next), s);
            } else return { value: void 0, done: !0 };
          },
        };
      return n;
    }
    entries() {
      let _state = this._state,
        _head = this._head,
        n = {
          [Symbol.iterator]: () => n,
          next: () => {
            if (this._state !== _state) throw Error("LinkedMap got modified during iteration.");
            if (_head) {
              let s = { value: [_head.key, _head.value], done: !1 };
              return ((_head = _head.next), s);
            } else return { value: void 0, done: !0 };
          },
        };
      return n;
    }
    [((_r = Symbol.toStringTag), Symbol.iterator)]() {
      return this.entries();
    }
    trimOld(e) {
      if (e >= this.size) return;
      if (e === 0) {
        this.clear();
        return;
      }
      let _head = this._head,
        size = this.size;
      while (_head && size > e) (this._map.delete(_head.key), (_head = _head.next), size--);
      if (((this._head = _head), (this._size = size), _head)) _head.previous = void 0;
      this._state++;
    }
    addItemFirst(e) {
      if (!this._head && !this._tail) this._tail = e;
      else if (!this._head) throw Error("Invalid list");
      else ((e.next = this._head), (this._head.previous = e));
      ((this._head = e), this._state++);
    }
    addItemLast(e) {
      if (!this._head && !this._tail) this._head = e;
      else if (!this._tail) throw Error("Invalid list");
      else ((e.previous = this._tail), (this._tail.next = e));
      ((this._tail = e), this._state++);
    }
    removeItem(e) {
      if (e === this._head && e === this._tail) ((this._head = void 0), (this._tail = void 0));
      else if (e === this._head) {
        if (!e.next) throw Error("Invalid list");
        ((e.next.previous = void 0), (this._head = e.next));
      } else if (e === this._tail) {
        if (!e.previous) throw Error("Invalid list");
        ((e.previous.next = void 0), (this._tail = e.previous));
      } else {
        let { next: r, previous: previous } = e;
        if (!r || !previous) throw Error("Invalid list");
        ((r.previous = previous), (previous.next = r));
      }
      ((e.next = void 0), (e.previous = void 0), this._state++);
    }
    touch(e, r) {
      if (!this._head || !this._tail) throw Error("Invalid list");
      if (r !== U.First && r !== U.Last) return;
      if (r === U.First) {
        if (e === this._head) return;
        let { next: n, previous: previous } = e;
        if (e === this._tail) ((previous.next = void 0), (this._tail = previous));
        else ((n.previous = previous), (previous.next = n));
        ((e.previous = void 0),
          (e.next = this._head),
          (this._head.previous = e),
          (this._head = e),
          this._state++);
      } else if (r === U.Last) {
        if (e === this._tail) return;
        let { next: n, previous: previous } = e;
        if (e === this._head) ((n.previous = void 0), (this._head = n));
        else ((n.previous = previous), (previous.next = n));
        ((e.next = void 0),
          (e.previous = this._tail),
          (this._tail.next = e),
          (this._tail = e),
          this._state++);
      }
    }
    toJSON() {
      let e = [];
      return (
        this.forEach((r, n) => {
          e.push([n, r]);
        }),
        e
      );
    }
    fromJSON(e) {
      this.clear();
      for (let [r, n] of e) this.set(r, n);
    }
  }
  Rr.LinkedMap = pt;
  class Sr extends pt {
    constructor(e, r = 1) {
      super();
      ((this._limit = e), (this._ratio = Math.min(Math.max(0, r), 1)));
    }
    get limit() {
      return this._limit;
    }
    set limit(e) {
      ((this._limit = e), this.checkTrim());
    }
    get ratio() {
      return this._ratio;
    }
    set ratio(e) {
      ((this._ratio = Math.min(Math.max(0, e), 1)), this.checkTrim());
    }
    get(e, r = U.AsNew) {
      return super.get(e, r);
    }
    peek(e) {
      return super.get(e, U.None);
    }
    set(e, r) {
      return (super.set(e, r, U.Last), this.checkTrim(), this);
    }
    checkTrim() {
      if (this.size > this._limit) this.trimOld(Math.round(this._limit * this._ratio));
    }
  }
  Rr.LRUCache = Sr;
});

export { mt };
