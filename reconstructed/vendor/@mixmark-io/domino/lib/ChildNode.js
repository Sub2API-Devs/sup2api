/**
 * @mixmark-io/domino/lib/ChildNode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";
import { Ya } from "./LinkedList.js";

//@ chunk-vwj6ccer.js:42755-44212 cjs-fingerprint
var ra = x(function (bd, ws) {
  var Ul = xe(),
    Vl = Ya(),
    pn = function (e, t) {
      var documentFragment = e.createDocumentFragment();
      for (var a = 0; a < t.length; a++) {
        var s = t[a],
          c = s instanceof Ul;
        documentFragment.appendChild(c ? s : e.createTextNode(String(s)));
      }
      return documentFragment;
    },
    jl = {
      after: {
        value: function () {
          var t = Array.prototype.slice.call(arguments),
            parentNode = this.parentNode,
            nextSibling = this.nextSibling;
          if (parentNode === null) return;
          while (
            nextSibling &&
            t.some(function (c) {
              return c === nextSibling;
            })
          )
            nextSibling = nextSibling.nextSibling;
          var s = pn(this.doc, t);
          parentNode.insertBefore(s, nextSibling);
        },
      },
      before: {
        value: function () {
          var t = Array.prototype.slice.call(arguments),
            parentNode = this.parentNode,
            previousSibling = this.previousSibling;
          if (parentNode === null) return;
          while (
            previousSibling &&
            t.some(function (d) {
              return d === previousSibling;
            })
          )
            previousSibling = previousSibling.previousSibling;
          var s = pn(this.doc, t),
            c = previousSibling ? previousSibling.nextSibling : parentNode.firstChild;
          parentNode.insertBefore(s, c);
        },
      },
      remove: {
        value: function () {
          if (this.parentNode === null) return;
          if (this.doc) {
            if ((this.doc._preremoveNodeIterators(this), this.rooted)) this.doc.mutateRemove(this);
          }
          (this._remove(), (this.parentNode = null));
        },
      },
      _remove: {
        value: function () {
          var parentNode = this.parentNode;
          if (parentNode === null) return;
          if (parentNode._childNodes) parentNode._childNodes.splice(this.index, 1);
          else if (parentNode._firstChild === this)
            if (this._nextSibling === this) parentNode._firstChild = null;
            else parentNode._firstChild = this._nextSibling;
          (Vl.remove(this), parentNode.modify());
        },
      },
      replaceWith: {
        value: function () {
          var t = Array.prototype.slice.call(arguments),
            parentNode = this.parentNode,
            nextSibling = this.nextSibling;
          if (parentNode === null) return;
          while (
            nextSibling &&
            t.some(function (c) {
              return c === nextSibling;
            })
          )
            nextSibling = nextSibling.nextSibling;
          var s = pn(this.doc, t);
          if (this.parentNode === parentNode) parentNode.replaceChild(s, this);
          else parentNode.insertBefore(s, nextSibling);
        },
      },
    };
  ws.exports = jl;
});

export { ra };
