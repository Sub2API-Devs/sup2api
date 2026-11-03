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
  add(item) {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size++;
  }
  addAll(items) {
    for (let item of items) this.add(item);
  }
  getRecent(count) {
    let result = [];
    let start = this.size < this.capacity ? 0 : this.head;
    let available = Math.min(count, this.size);
    for (let i = 0; i < available; i++) {
      let index = (start + this.size - available + i) % this.capacity;
      result.push(this.buffer[index]);
    }
    return result;
  }
  toArray() {
    if (this.size === 0) return [];
    let result = [];
    let start = this.size < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.size; i++) {
      let index = (start + i) % this.capacity;
      result.push(this.buffer[index]);
    }
    return result;
  }
  clear() {
    this.buffer.length = 0;
    this.head = 0;
    this.size = 0;
  }
  length() {
    return this.size;
  }
}
export { CircularBuffer };
