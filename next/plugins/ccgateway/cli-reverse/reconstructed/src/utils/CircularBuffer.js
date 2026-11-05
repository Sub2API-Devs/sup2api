/**
 * utils/CircularBuffer.ts
 *
 * 固定容量的环形缓冲区
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/CircularBuffer.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-5xgkngpb.js:251549-252212 fingerprint (2.1.88 match: CircularBuffer, 1)
class CircularBuffer {
  capacity;
  buffer;
  head = 0;
  size = 0;
  constructor(capacity) {
    this.capacity = capacity;
    this.buffer = Array(capacity);
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
