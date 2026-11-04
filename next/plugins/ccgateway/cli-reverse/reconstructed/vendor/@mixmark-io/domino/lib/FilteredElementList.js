/**
 * @mixmark-io/domino/lib/FilteredElementList.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";

//@ chunk-vwj6ccer.js:28295-29363 cjs-fingerprint
var require_FilteredElementList = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = FilteredElementList;
  var Node = require_Node();
  function FilteredElementList(root, filter) {
    this.root = root;
    this.filter = filter;
    this.lastModTime = root.lastModTime;
    this.done = false;
    this.cache = [];
    this.traverse();
  }
  FilteredElementList.prototype = Object.create(Object.prototype, {
    length: {
      get: function () {
        this.checkcache();
        if (!this.done) this.traverse();
        return this.cache.length;
      },
    },
    item: {
      value: function (n) {
        this.checkcache();
        if (!this.done && n >= this.cache.length) this.traverse();
        return this.cache[n];
      },
    },
    checkcache: {
      value: function () {
        if (this.lastModTime !== this.root.lastModTime) {
          for (var i = this.cache.length - 1; i >= 0; i--) this[i] = undefined;
          this.cache.length = 0;
          this.done = false;
          this.lastModTime = this.root.lastModTime;
        }
      },
    },
    traverse: {
      value: function (n) {
        if (n !== undefined) n++;
        var elt;
        while ((elt = this.next()) !== null) {
          this[this.cache.length] = elt;
          this.cache.push(elt);
          if (n && this.cache.length === n) return;
        }
        this.done = true;
      },
    },
    next: {
      value: function () {
        var start = this.cache.length === 0 ? this.root : this.cache[this.cache.length - 1];
        var elt;
        if (start.nodeType === Node.DOCUMENT_NODE) elt = start.documentElement;
        else elt = start.nextElement(this.root);
        while (elt) {
          if (this.filter(elt)) return elt;
          elt = elt.nextElement(this.root);
        }
        return null;
      },
    },
  });
});
export { require_FilteredElementList };
