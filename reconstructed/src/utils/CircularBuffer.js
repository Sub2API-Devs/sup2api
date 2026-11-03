/**
 * utils/CircularBuffer.ts
 *
 * 固定容量的环形缓冲区
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/CircularBuffer.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-e6aww6q8.js:252316-252979 fingerprint = CircularBuffer (1)
class CircularBuffer {
  capacity;
  buffer;
  head = 0;
  size = 0;
  constructor(e) {
    this.capacity = e;
    this.buffer = Array(e);
  }
  add(e) {
    if (
      ((this.buffer[this.head] = e), (this.head = (this.head + 1) % this.capacity), this.size < this.capacity)
    )
      this.size++;
  }
  addAll(e) {
    for (let n of e) this.add(n);
  }
  getRecent(e) {
    let n = [],
      r = this.size < this.capacity ? 0 : this.head,
      min = Math.min(e, this.size);
    for (let h = 0; h < min; h++) {
      let y = (r + this.size - min + h) % this.capacity;
      n.push(this.buffer[y]);
    }
    return n;
  }
  toArray() {
    if (this.size === 0) return [];
    let e = [],
      n = this.size < this.capacity ? 0 : this.head;
    for (let r = 0; r < this.size; r++) {
      let s = (n + r) % this.capacity;
      e.push(this.buffer[s]);
    }
    return e;
  }
  clear() {
    ((this.buffer.length = 0), (this.head = 0), (this.size = 0));
  }
  length() {
    return this.size;
  }
}

export { CircularBuffer };
