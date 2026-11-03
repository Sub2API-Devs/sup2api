/**
 * @mixmark-io/domino/lib/FilteredElementList.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";

//@ chunk-vwj6ccer.js:28295-29363 cjs-fingerprint
var ps = x(function (md, hs) {
  hs.exports = ds;
  var Ll = xe();
  function ds(e, t) {
    ((this.root = e),
      (this.filter = t),
      (this.lastModTime = e.lastModTime),
      (this.done = !1),
      (this.cache = []),
      this.traverse());
  }
  ds.prototype = Object.create(Object.prototype, {
    length: {
      get: function () {
        if ((this.checkcache(), !this.done)) this.traverse();
        return this.cache.length;
      },
    },
    item: {
      value: function (e) {
        if ((this.checkcache(), !this.done && e >= this.cache.length)) this.traverse();
        return this.cache[e];
      },
    },
    checkcache: {
      value: function () {
        if (this.lastModTime !== this.root.lastModTime) {
          for (var e = this.cache.length - 1; e >= 0; e--) this[e] = void 0;
          ((this.cache.length = 0), (this.done = !1), (this.lastModTime = this.root.lastModTime));
        }
      },
    },
    traverse: {
      value: function (e) {
        if (e !== void 0) e++;
        var t;
        while ((t = this.next()) !== null)
          if (((this[this.cache.length] = t), this.cache.push(t), e && this.cache.length === e)) return;
        this.done = !0;
      },
    },
    next: {
      value: function () {
        var e = this.cache.length === 0 ? this.root : this.cache[this.cache.length - 1],
          t;
        if (e.nodeType === Ll.DOCUMENT_NODE) t = e.documentElement;
        else t = e.nextElement(this.root);
        while (t) {
          if (this.filter(t)) return t;
          t = t.nextElement(this.root);
        }
        return null;
      },
    },
  });
});

export { ps };
