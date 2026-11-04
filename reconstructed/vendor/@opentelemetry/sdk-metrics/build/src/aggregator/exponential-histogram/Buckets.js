/**
 * @opentelemetry/sdk-metrics/build/src/aggregator/exponential-histogram/Buckets.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-wrv5s6k4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-wrv5s6k4.js:5286-7681 cjs-fingerprint
var require_Buckets = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Buckets = undefined;
  class Buckets {
    backing;
    indexBase;
    indexStart;
    indexEnd;
    constructor(backing = new BucketsBacking(), indexBase = 0, indexStart = 0, indexEnd = 0) {
      this.backing = backing;
      this.indexBase = indexBase;
      this.indexStart = indexStart;
      this.indexEnd = indexEnd;
    }
    get offset() {
      return this.indexStart;
    }
    get length() {
      if (this.backing.length === 0) return 0;
      if (this.indexEnd === this.indexStart && this.at(0) === 0) return 0;
      return this.indexEnd - this.indexStart + 1;
    }
    counts() {
      return Array.from(
        {
          length: this.length,
        },
        (_, i) => this.at(i),
      );
    }
    at(position) {
      let bias = this.indexBase - this.indexStart;
      if (position < bias) position += this.backing.length;
      position -= bias;
      return this.backing.countAt(position);
    }
    incrementBucket(bucketIndex, increment) {
      this.backing.increment(bucketIndex, increment);
    }
    decrementBucket(bucketIndex, decrement) {
      this.backing.decrement(bucketIndex, decrement);
    }
    trim() {
      for (let i = 0; i < this.length; i++)
        if (this.at(i) !== 0) {
          this.indexStart += i;
          break;
        } else if (i === this.length - 1) {
          this.indexStart = this.indexEnd = this.indexBase = 0;
          return;
        }
      for (let i = this.length - 1; i >= 0; i--)
        if (this.at(i) !== 0) {
          this.indexEnd -= this.length - i - 1;
          break;
        }
      this._rotate();
    }
    downscale(by) {
      this._rotate();
      let size = 1 + this.indexEnd - this.indexStart;
      let each = 1 << by;
      let inpos = 0;
      let outpos = 0;
      for (let pos = this.indexStart; pos <= this.indexEnd;) {
        let mod = pos % each;
        if (mod < 0) mod += each;
        for (let i = mod; i < each && inpos < size; i++) {
          this._relocateBucket(outpos, inpos);
          inpos++;
          pos++;
        }
        outpos++;
      }
      this.indexStart >>= by;
      this.indexEnd >>= by;
      this.indexBase = this.indexStart;
    }
    clone() {
      return new Buckets(this.backing.clone(), this.indexBase, this.indexStart, this.indexEnd);
    }
    _rotate() {
      let bias = this.indexBase - this.indexStart;
      if (bias === 0) return;
      else if (bias > 0) {
        this.backing.reverse(0, this.backing.length);
        this.backing.reverse(0, bias);
        this.backing.reverse(bias, this.backing.length);
      } else {
        this.backing.reverse(0, this.backing.length);
        this.backing.reverse(0, this.backing.length + bias);
      }
      this.indexBase = this.indexStart;
    }
    _relocateBucket(dest, src) {
      if (dest === src) return;
      this.incrementBucket(dest, this.backing.emptyBucket(src));
    }
  }
  cjsExports.Buckets = Buckets;
  class BucketsBacking {
    _counts;
    constructor(counts = [0]) {
      this._counts = counts;
    }
    get length() {
      return this._counts.length;
    }
    countAt(pos) {
      return this._counts[pos];
    }
    growTo(newSize, oldPositiveLimit, newPositiveLimit) {
      let tmp = Array(newSize).fill(0);
      tmp.splice(
        newPositiveLimit,
        this._counts.length - oldPositiveLimit,
        ...this._counts.slice(oldPositiveLimit),
      );
      tmp.splice(0, oldPositiveLimit, ...this._counts.slice(0, oldPositiveLimit));
      this._counts = tmp;
    }
    reverse(from, limit) {
      let num = Math.floor((from + limit) / 2) - from;
      for (let swapIndex = 0; swapIndex < num; swapIndex++) {
        let tmp = this._counts[from + swapIndex];
        this._counts[from + swapIndex] = this._counts[limit - swapIndex - 1];
        this._counts[limit - swapIndex - 1] = tmp;
      }
    }
    emptyBucket(src) {
      let tmp = this._counts[src];
      this._counts[src] = 0;
      return tmp;
    }
    increment(bucketIndex, increment) {
      this._counts[bucketIndex] += increment;
    }
    decrement(bucketIndex, decrement) {
      if (this._counts[bucketIndex] >= decrement) this._counts[bucketIndex] -= decrement;
      else this._counts[bucketIndex] = 0;
    }
    clone() {
      return new BucketsBacking([...this._counts]);
    }
  }
});
export { require_Buckets };
