/**
 * vscode-jsonrpc/lib/common/linkedMap.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-mvgr3jmb.js:8904-13504 cjs-fingerprint
var require_linkedMap = __commonJS(function (cjsExports) {
  var _a;
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.LRUCache = cjsExports.LinkedMap = cjsExports.Touch = undefined;
  var Touch;
  (function (Touch) {
    Touch.None = 0;
    Touch.First = 1;
    Touch.AsOld = Touch.First;
    Touch.Last = 2;
    Touch.AsNew = Touch.Last;
  })(Touch || (cjsExports.Touch = Touch = {}));
  class LinkedMap {
    constructor() {
      this[_a] = "LinkedMap";
      this._map = new Map();
      this._head = undefined;
      this._tail = undefined;
      this._size = 0;
      this._state = 0;
    }
    clear() {
      this._map.clear();
      this._head = undefined;
      this._tail = undefined;
      this._size = 0;
      this._state++;
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
    has(key) {
      return this._map.has(key);
    }
    get(key, touch = Touch.None) {
      let item = this._map.get(key);
      if (!item) return;
      if (touch !== Touch.None) this.touch(item, touch);
      return item.value;
    }
    set(key, value, touch = Touch.None) {
      let item = this._map.get(key);
      if (item) {
        item.value = value;
        if (touch !== Touch.None) this.touch(item, touch);
      } else {
        switch (
          ((item = {
            key,
            value,
            next: undefined,
            previous: undefined,
          }),
          touch)
        ) {
          case Touch.None:
            this.addItemLast(item);
            break;
          case Touch.First:
            this.addItemFirst(item);
            break;
          case Touch.Last:
            this.addItemLast(item);
            break;
          default:
            this.addItemLast(item);
            break;
        }
        this._map.set(key, item);
        this._size++;
      }
      return this;
    }
    delete(key) {
      return !!this.remove(key);
    }
    remove(key) {
      let item = this._map.get(key);
      if (!item) return;
      this._map.delete(key);
      this.removeItem(item);
      this._size--;
      return item.value;
    }
    shift() {
      if (!this._head && !this._tail) return;
      if (!this._head || !this._tail) throw Error("Invalid list");
      let item = this._head;
      this._map.delete(item.key);
      this.removeItem(item);
      this._size--;
      return item.value;
    }
    forEach(callbackfn, thisArg) {
      let state = this._state;
      let current = this._head;
      while (current) {
        if (thisArg) callbackfn.bind(thisArg)(current.value, current.key, this);
        else callbackfn(current.value, current.key, this);
        if (this._state !== state) throw Error("LinkedMap got modified during iteration.");
        current = current.next;
      }
    }
    keys() {
      let state = this._state;
      let current = this._head;
      let iterator = {
        [Symbol.iterator]: () => iterator,
        next: () => {
          if (this._state !== state) throw Error("LinkedMap got modified during iteration.");
          if (current) {
            let result = {
              value: current.key,
              done: false,
            };
            current = current.next;
            return result;
          } else
            return {
              value: undefined,
              done: true,
            };
        },
      };
      return iterator;
    }
    values() {
      let state = this._state;
      let current = this._head;
      let iterator = {
        [Symbol.iterator]: () => iterator,
        next: () => {
          if (this._state !== state) throw Error("LinkedMap got modified during iteration.");
          if (current) {
            let result = {
              value: current.value,
              done: false,
            };
            current = current.next;
            return result;
          } else
            return {
              value: undefined,
              done: true,
            };
        },
      };
      return iterator;
    }
    entries() {
      let state = this._state;
      let current = this._head;
      let iterator = {
        [Symbol.iterator]: () => iterator,
        next: () => {
          if (this._state !== state) throw Error("LinkedMap got modified during iteration.");
          if (current) {
            let result = {
              value: [current.key, current.value],
              done: false,
            };
            current = current.next;
            return result;
          } else
            return {
              value: undefined,
              done: true,
            };
        },
      };
      return iterator;
    }
    [((_a = Symbol.toStringTag), Symbol.iterator)]() {
      return this.entries();
    }
    trimOld(newSize) {
      if (newSize >= this.size) return;
      if (newSize === 0) {
        this.clear();
        return;
      }
      let current = this._head;
      let currentSize = this.size;
      while (current && currentSize > newSize) {
        this._map.delete(current.key);
        current = current.next;
        currentSize--;
      }
      this._head = current;
      this._size = currentSize;
      if (current) current.previous = undefined;
      this._state++;
    }
    addItemFirst(item) {
      if (!this._head && !this._tail) this._tail = item;
      else if (!this._head) throw Error("Invalid list");
      else {
        item.next = this._head;
        this._head.previous = item;
      }
      this._head = item;
      this._state++;
    }
    addItemLast(item) {
      if (!this._head && !this._tail) this._head = item;
      else if (!this._tail) throw Error("Invalid list");
      else {
        item.previous = this._tail;
        this._tail.next = item;
      }
      this._tail = item;
      this._state++;
    }
    removeItem(item) {
      if (item === this._head && item === this._tail) {
        this._head = undefined;
        this._tail = undefined;
      } else if (item === this._head) {
        if (!item.next) throw Error("Invalid list");
        item.next.previous = undefined;
        this._head = item.next;
      } else if (item === this._tail) {
        if (!item.previous) throw Error("Invalid list");
        item.previous.next = undefined;
        this._tail = item.previous;
      } else {
        let { next, previous } = item;
        if (!next || !previous) throw Error("Invalid list");
        next.previous = previous;
        previous.next = next;
      }
      item.next = undefined;
      item.previous = undefined;
      this._state++;
    }
    touch(item, touch) {
      if (!this._head || !this._tail) throw Error("Invalid list");
      if (touch !== Touch.First && touch !== Touch.Last) return;
      if (touch === Touch.First) {
        if (item === this._head) return;
        let { next, previous } = item;
        if (item === this._tail) {
          previous.next = undefined;
          this._tail = previous;
        } else {
          next.previous = previous;
          previous.next = next;
        }
        item.previous = undefined;
        item.next = this._head;
        this._head.previous = item;
        this._head = item;
        this._state++;
      } else if (touch === Touch.Last) {
        if (item === this._tail) return;
        let { next, previous } = item;
        if (item === this._head) {
          next.previous = undefined;
          this._head = next;
        } else {
          next.previous = previous;
          previous.next = next;
        }
        item.next = undefined;
        item.previous = this._tail;
        this._tail.next = item;
        this._tail = item;
        this._state++;
      }
    }
    toJSON() {
      let data = [];
      this.forEach((value, key) => {
        data.push([key, value]);
      });
      return data;
    }
    fromJSON(data) {
      this.clear();
      for (let [key, value] of data) this.set(key, value);
    }
  }
  cjsExports.LinkedMap = LinkedMap;
  class LRUCache extends LinkedMap {
    constructor(limit, ratio = 1) {
      super();
      this._limit = limit;
      this._ratio = Math.min(Math.max(0, ratio), 1);
    }
    get limit() {
      return this._limit;
    }
    set limit(limit) {
      this._limit = limit;
      this.checkTrim();
    }
    get ratio() {
      return this._ratio;
    }
    set ratio(ratio) {
      this._ratio = Math.min(Math.max(0, ratio), 1);
      this.checkTrim();
    }
    get(key, touch = Touch.AsNew) {
      return super.get(key, touch);
    }
    peek(key) {
      return super.get(key, Touch.None);
    }
    set(key, value) {
      super.set(key, value, Touch.Last);
      this.checkTrim();
      return this;
    }
    checkTrim() {
      if (this.size > this._limit) this.trimOld(Math.round(this._limit * this._ratio));
    }
  }
  cjsExports.LRUCache = LRUCache;
});
export { require_linkedMap };
