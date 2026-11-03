/**
 * @mixmark-io/domino/lib/TreeWalker.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";
import { hr } from "./NodeFilter.js";
import { On } from "./NodeTraversal.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:68270-71450 cjs-fingerprint
var u0 = x(function (Ld, o0) {
  o0.exports = c0;
  var fx = xe(),
    fe = hr(),
    a0 = On(),
    s0 = ee(),
    qn = { first: "firstChild", last: "lastChild", next: "firstChild", previous: "lastChild" },
    Hn = { first: "nextSibling", last: "previousSibling", next: "nextSibling", previous: "previousSibling" };
  function n0(e, t) {
    var r, a, s, c, d;
    a = e._currentNode[qn[t]];
    while (a !== null) {
      if (((c = e._internalFilter(a)), c === fe.FILTER_ACCEPT)) return ((e._currentNode = a), a);
      if (c === fe.FILTER_SKIP) {
        if (((r = a[qn[t]]), r !== null)) {
          a = r;
          continue;
        }
      }
      while (a !== null) {
        if (((d = a[Hn[t]]), d !== null)) {
          a = d;
          break;
        }
        if (((s = a.parentNode), s === null || s === e.root || s === e._currentNode)) return null;
        else a = s;
      }
    }
    return null;
  }
  function i0(e, t) {
    var r, a, s;
    if (((r = e._currentNode), r === e.root)) return null;
    while (!0) {
      s = r[Hn[t]];
      while (s !== null) {
        if (((r = s), (a = e._internalFilter(r)), a === fe.FILTER_ACCEPT)) return ((e._currentNode = r), r);
        if (((s = r[qn[t]]), a === fe.FILTER_REJECT || s === null)) s = r[Hn[t]];
      }
      if (((r = r.parentNode), r === null || r === e.root)) return null;
      if (e._internalFilter(r) === fe.FILTER_ACCEPT) return null;
    }
  }
  function c0(e, t, r) {
    if (!e || !e.nodeType) s0.NotSupportedError();
    ((this._root = e),
      (this._whatToShow = Number(t) || 0),
      (this._filter = r || null),
      (this._active = !1),
      (this._currentNode = e));
  }
  Object.defineProperties(c0.prototype, {
    root: {
      get: function () {
        return this._root;
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
    currentNode: {
      get: function () {
        return this._currentNode;
      },
      set: function (t) {
        if (!(t instanceof fx)) throw TypeError("Not a Node");
        this._currentNode = t;
      },
    },
    _internalFilter: {
      value: function (t) {
        var r, a;
        if (this._active) s0.InvalidStateError();
        if (!((1 << (t.nodeType - 1)) & this._whatToShow)) return fe.FILTER_SKIP;
        if (((a = this._filter), a === null)) r = fe.FILTER_ACCEPT;
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
    parentNode: {
      value: function () {
        var _currentNode = this._currentNode;
        while (_currentNode !== this.root) {
          if (((_currentNode = _currentNode.parentNode), _currentNode === null)) return null;
          if (this._internalFilter(_currentNode) === fe.FILTER_ACCEPT)
            return ((this._currentNode = _currentNode), _currentNode);
        }
        return null;
      },
    },
    firstChild: {
      value: function () {
        return n0(this, "first");
      },
    },
    lastChild: {
      value: function () {
        return n0(this, "last");
      },
    },
    previousSibling: {
      value: function () {
        return i0(this, "previous");
      },
    },
    nextSibling: {
      value: function () {
        return i0(this, "next");
      },
    },
    previousNode: {
      value: function () {
        var t, r, a, s;
        t = this._currentNode;
        while (t !== this._root) {
          for (a = t.previousSibling; a; a = t.previousSibling) {
            if (((t = a), (r = this._internalFilter(t)), r === fe.FILTER_REJECT)) continue;
            for (s = t.lastChild; s; s = t.lastChild)
              if (((t = s), (r = this._internalFilter(t)), r === fe.FILTER_REJECT)) break;
            if (r === fe.FILTER_ACCEPT) return ((this._currentNode = t), t);
          }
          if (t === this.root || t.parentNode === null) return null;
          if (((t = t.parentNode), this._internalFilter(t) === fe.FILTER_ACCEPT))
            return ((this._currentNode = t), t);
        }
        return null;
      },
    },
    nextNode: {
      value: function () {
        var t, r, a, s;
        ((t = this._currentNode), (r = fe.FILTER_ACCEPT));
        e: while (!0) {
          for (a = t.firstChild; a; a = t.firstChild)
            if (((t = a), (r = this._internalFilter(t)), r === fe.FILTER_ACCEPT))
              return ((this._currentNode = t), t);
            else if (r === fe.FILTER_REJECT) break;
          for (s = a0.nextSkippingChildren(t, this.root); s; s = a0.nextSkippingChildren(t, this.root))
            if (((t = s), (r = this._internalFilter(t)), r === fe.FILTER_ACCEPT))
              return ((this._currentNode = t), t);
            else if (r === fe.FILTER_SKIP) continue e;
          return null;
        }
      },
    },
    toString: {
      value: function () {
        return "[object TreeWalker]";
      },
    },
  });
});

export { u0 };
