/**
 * lru-cache/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lru-cache@10.3.0..11.0.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_yallist } from "../yallist/yallist.js";

//@ chunk-1ny7cxrt.js:15716-19351 cjs-fingerprint
var require_lru_cache = __commonJS(function (cjsExports, cjsModule) {
  var Yallist = require_yallist();
  var MAX = Symbol("max");
  var LENGTH = Symbol("length");
  var LENGTH_CALCULATOR = Symbol("lengthCalculator");
  var ALLOW_STALE = Symbol("allowStale");
  var MAX_AGE = Symbol("maxAge");
  var DISPOSE = Symbol("dispose");
  var NO_DISPOSE_ON_SET = Symbol("noDisposeOnSet");
  var LRU_LIST = Symbol("lruList");
  var CACHE = Symbol("cache");
  var UPDATE_AGE_ON_GET = Symbol("updateAgeOnGet");
  var naiveLength = () => 1;
  class LRUCache {
    constructor(options) {
      if (typeof options === "number")
        options = {
          max: options,
        };
      if (!options) options = {};
      if (options.max && (typeof options.max !== "number" || options.max < 0))
        throw TypeError("max must be a non-negative number");
      let max = (this[MAX] = options.max || 1 / 0);
      let lc = options.length || naiveLength;
      this[LENGTH_CALCULATOR] = typeof lc !== "function" ? naiveLength : lc;
      this[ALLOW_STALE] = options.stale || false;
      if (options.maxAge && typeof options.maxAge !== "number") throw TypeError("maxAge must be a number");
      this[MAX_AGE] = options.maxAge || 0;
      this[DISPOSE] = options.dispose;
      this[NO_DISPOSE_ON_SET] = options.noDisposeOnSet || false;
      this[UPDATE_AGE_ON_GET] = options.updateAgeOnGet || false;
      this.reset();
    }
    set max(mL) {
      if (typeof mL !== "number" || mL < 0) throw TypeError("max must be a non-negative number");
      this[MAX] = mL || 1 / 0;
      trim(this);
    }
    get max() {
      return this[MAX];
    }
    set allowStale(allowStale) {
      this[ALLOW_STALE] = !!allowStale;
    }
    get allowStale() {
      return this[ALLOW_STALE];
    }
    set maxAge(mA) {
      if (typeof mA !== "number") throw TypeError("maxAge must be a non-negative number");
      this[MAX_AGE] = mA;
      trim(this);
    }
    get maxAge() {
      return this[MAX_AGE];
    }
    set lengthCalculator(lC) {
      if (typeof lC !== "function") lC = naiveLength;
      if (lC !== this[LENGTH_CALCULATOR]) {
        this[LENGTH_CALCULATOR] = lC;
        this[LENGTH] = 0;
        this[LRU_LIST].forEach((hit) => {
          hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key);
          this[LENGTH] += hit.length;
        });
      }
      trim(this);
    }
    get lengthCalculator() {
      return this[LENGTH_CALCULATOR];
    }
    get length() {
      return this[LENGTH];
    }
    get itemCount() {
      return this[LRU_LIST].length;
    }
    rforEach(fn, thisp) {
      thisp = thisp || this;
      for (let walker = this[LRU_LIST].tail; walker !== null;) {
        let prev = walker.prev;
        forEachStep(this, fn, walker, thisp);
        walker = prev;
      }
    }
    forEach(fn, thisp) {
      thisp = thisp || this;
      for (let walker = this[LRU_LIST].head; walker !== null;) {
        let next = walker.next;
        forEachStep(this, fn, walker, thisp);
        walker = next;
      }
    }
    keys() {
      return this[LRU_LIST].toArray().map((k) => k.key);
    }
    values() {
      return this[LRU_LIST].toArray().map((k) => k.value);
    }
    reset() {
      if (this[DISPOSE] && this[LRU_LIST] && this[LRU_LIST].length)
        this[LRU_LIST].forEach((hit) => this[DISPOSE](hit.key, hit.value));
      this[CACHE] = new Map();
      this[LRU_LIST] = new Yallist();
      this[LENGTH] = 0;
    }
    dump() {
      return this[LRU_LIST].map((hit) =>
        isStale(this, hit)
          ? false
          : {
              k: hit.key,
              v: hit.value,
              e: hit.now + (hit.maxAge || 0),
            },
      )
        .toArray()
        .filter((h) => h);
    }
    dumpLru() {
      return this[LRU_LIST];
    }
    set(key, value, maxAge) {
      maxAge = maxAge || this[MAX_AGE];
      if (maxAge && typeof maxAge !== "number") throw TypeError("maxAge must be a number");
      let now = maxAge ? Date.now() : 0;
      let len = this[LENGTH_CALCULATOR](value, key);
      if (this[CACHE].has(key)) {
        if (len > this[MAX]) {
          del(this, this[CACHE].get(key));
          return false;
        }
        let item = this[CACHE].get(key).value;
        if (this[DISPOSE]) {
          if (!this[NO_DISPOSE_ON_SET]) this[DISPOSE](key, item.value);
        }
        item.now = now;
        item.maxAge = maxAge;
        item.value = value;
        this[LENGTH] += len - item.length;
        item.length = len;
        this.get(key);
        trim(this);
        return true;
      }
      let hit = new Entry(key, value, len, now, maxAge);
      if (hit.length > this[MAX]) {
        if (this[DISPOSE]) this[DISPOSE](key, value);
        return false;
      }
      this[LENGTH] += hit.length;
      this[LRU_LIST].unshift(hit);
      this[CACHE].set(key, this[LRU_LIST].head);
      trim(this);
      return true;
    }
    has(key) {
      if (!this[CACHE].has(key)) return false;
      let hit = this[CACHE].get(key).value;
      return !isStale(this, hit);
    }
    get(key) {
      return get(this, key, true);
    }
    peek(key) {
      return get(this, key, false);
    }
    pop() {
      let node = this[LRU_LIST].tail;
      if (!node) return null;
      del(this, node);
      return node.value;
    }
    del(key) {
      del(this, this[CACHE].get(key));
    }
    load(arr) {
      this.reset();
      let now = Date.now();
      for (let l = arr.length - 1; l >= 0; l--) {
        let hit = arr[l];
        let expiresAt = hit.e || 0;
        if (expiresAt === 0) this.set(hit.k, hit.v);
        else {
          let maxAge = expiresAt - now;
          if (maxAge > 0) this.set(hit.k, hit.v, maxAge);
        }
      }
    }
    prune() {
      this[CACHE].forEach((value, key) => get(this, key, false));
    }
  }
  var get = (cache, key, doUse) => {
    let node = cache[CACHE].get(key);
    if (node) {
      let hit = node.value;
      if (isStale(cache, hit)) {
        del(cache, node);
        if (!cache[ALLOW_STALE]) return;
      } else if (doUse) {
        if (cache[UPDATE_AGE_ON_GET]) node.value.now = Date.now();
        cache[LRU_LIST].unshiftNode(node);
      }
      return hit.value;
    }
  };
  var isStale = (cache, hit) => {
    if (!hit || (!hit.maxAge && !cache[MAX_AGE])) return false;
    let diff = Date.now() - hit.now;
    return hit.maxAge ? diff > hit.maxAge : cache[MAX_AGE] && diff > cache[MAX_AGE];
  };
  var trim = (cache) => {
    if (cache[LENGTH] > cache[MAX])
      for (let walker = cache[LRU_LIST].tail; cache[LENGTH] > cache[MAX] && walker !== null;) {
        let prev = walker.prev;
        del(cache, walker);
        walker = prev;
      }
  };
  var del = (cache, node) => {
    if (node) {
      let hit = node.value;
      if (cache[DISPOSE]) cache[DISPOSE](hit.key, hit.value);
      cache[LENGTH] -= hit.length;
      cache[CACHE].delete(hit.key);
      cache[LRU_LIST].removeNode(node);
    }
  };
  class Entry {
    constructor(key, value, length, now, maxAge) {
      this.key = key;
      this.value = value;
      this.length = length;
      this.now = now;
      this.maxAge = maxAge || 0;
    }
  }
  var forEachStep = (cache, fn, node, thisp) => {
    let hit = node.value;
    if (isStale(cache, hit)) {
      del(cache, node);
      if (!cache[ALLOW_STALE]) hit = undefined;
    }
    if (hit) fn.call(thisp, hit.value, hit.key, cache);
  };
  cjsModule.exports = LRUCache;
});
export { require_lru_cache };
