/**
 * @mixmark-io/domino/lib/NodeIterator.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { hr } from "./NodeFilter.js";
import { On } from "./NodeTraversal.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:71450-73463 cjs-fingerprint
var p0 = x(function (Md, h0) {
  h0.exports = d0;
  var Fn = hr(),
    Bn = On(),
    f0 = ee();
  function dx(e, t, r) {
    if (r) return Bn.next(e, t);
    else {
      if (e === t) return null;
      return Bn.previous(e, null);
    }
  }
  function l0(e, t) {
    for (; t; t = t.parentNode) if (e === t) return !0;
    return !1;
  }
  function x0(e, t) {
    var r, a;
    ((r = e._referenceNode), (a = e._pointerBeforeReferenceNode));
    while (!0) {
      if (a === t) a = !a;
      else if (((r = dx(r, e._root, t)), r === null)) return null;
      var _internalFilter = e._internalFilter(r);
      if (_internalFilter === Fn.FILTER_ACCEPT) break;
    }
    return ((e._referenceNode = r), (e._pointerBeforeReferenceNode = a), r);
  }
  function d0(e, t, r) {
    if (!e || !e.nodeType) f0.NotSupportedError();
    ((this._root = e),
      (this._referenceNode = e),
      (this._pointerBeforeReferenceNode = !0),
      (this._whatToShow = Number(t) || 0),
      (this._filter = r || null),
      (this._active = !1),
      e.doc._attachNodeIterator(this));
  }
  Object.defineProperties(d0.prototype, {
    root: {
      get: function () {
        return this._root;
      },
    },
    referenceNode: {
      get: function () {
        return this._referenceNode;
      },
    },
    pointerBeforeReferenceNode: {
      get: function () {
        return this._pointerBeforeReferenceNode;
      },
    },
    whatToShow: {
      get: function () {
        return this._whatToShow;
      },
    },
    filter: {
      get: function () {
        return this._filter;
      },
    },
    _internalFilter: {
      value: function (t) {
        var r, a;
        if (this._active) f0.InvalidStateError();
        if (!((1 << (t.nodeType - 1)) & this._whatToShow)) return Fn.FILTER_SKIP;
        if (((a = this._filter), a === null)) r = Fn.FILTER_ACCEPT;
        else {
          this._active = !0;
          try {
            if (typeof a === "function") r = a(t);
            else r = a.acceptNode(t);
          } finally {
            this._active = !1;
          }
        }
        return +r;
      },
    },
    _preremove: {
      value: function (t) {
        if (l0(t, this._root)) return;
        if (!l0(t, this._referenceNode)) return;
        if (this._pointerBeforeReferenceNode) {
          var r = t;
          while (r.lastChild) r = r.lastChild;
          if (((r = Bn.next(r, this.root)), r)) {
            this._referenceNode = r;
            return;
          }
          this._pointerBeforeReferenceNode = !1;
        }
        if (t.previousSibling === null) this._referenceNode = t.parentNode;
        else {
          this._referenceNode = t.previousSibling;
          var a;
          for (a = this._referenceNode.lastChild; a; a = this._referenceNode.lastChild)
            this._referenceNode = a;
        }
      },
    },
    nextNode: {
      value: function () {
        return x0(this, !0);
      },
    },
    previousNode: {
      value: function () {
        return x0(this, !1);
      },
    },
    detach: { value: function () {} },
    toString: {
      value: function () {
        return "[object NodeIterator]";
      },
    },
  });
});

export { p0 };
