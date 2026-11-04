/**
 * @grpc/grpc-js/build/src/priority-queue.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:371590-372594 cjs-fingerprint
var yv = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.PriorityQueue = undefined;
  var top = 0;
  var parent = (i) => Math.floor(i / 2);
  var left = (i) => i * 2 + 1;
  var right = (i) => i * 2 + 2;
  class PriorityQueue {
    constructor(comparator = (a, b) => a > b) {
      this.comparator = comparator;
      this.heap = [];
    }
    size() {
      return this.heap.length;
    }
    isEmpty() {
      return this.size() == 0;
    }
    peek() {
      return this.heap[top];
    }
    push(...values) {
      values.forEach((value) => {
        this.heap.push(value);
        this.siftUp();
      });
      return this.size();
    }
    pop() {
      let poppedValue = this.peek();
      let bottom = this.size() - 1;
      if (bottom > top) this.swap(top, bottom);
      this.heap.pop();
      this.siftDown();
      return poppedValue;
    }
    replace(value) {
      let replacedValue = this.peek();
      this.heap[top] = value;
      this.siftDown();
      return replacedValue;
    }
    greater(i, j) {
      return this.comparator(this.heap[i], this.heap[j]);
    }
    swap(i, j) {
      [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
    }
    siftUp() {
      let node = this.size() - 1;
      while (node > top && this.greater(node, parent(node))) {
        this.swap(node, parent(node));
        node = parent(node);
      }
    }
    siftDown() {
      let node = top;
      while (
        (left(node) < this.size() && this.greater(left(node), node)) ||
        (right(node) < this.size() && this.greater(right(node), node))
      ) {
        let maxChild =
          right(node) < this.size() && this.greater(right(node), left(node)) ? right(node) : left(node);
        this.swap(node, maxChild);
        node = maxChild;
      }
    }
  }
  cjsExports.PriorityQueue = PriorityQueue;
});
export { yv };
