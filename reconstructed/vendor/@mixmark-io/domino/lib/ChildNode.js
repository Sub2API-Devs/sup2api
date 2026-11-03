/**
 * @mixmark-io/domino/lib/ChildNode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";
import { require_LinkedList } from "./LinkedList.js";

//@ chunk-vwj6ccer.js:42755-44212 cjs-fingerprint
var require_ChildNode = x(function (cjsExports, cjsModule) {
  var Node = require_Node();
  var LinkedList = require_LinkedList();
  var createDocumentFragmentFromArguments = function (e, args) {
    var docFrag = e.createDocumentFragment();
    for (var i = 0; i < args.length; i++) {
      var argItem = args[i];
      var isNode = argItem instanceof Node;
      docFrag.appendChild(isNode ? argItem : e.createTextNode(String(argItem)));
    }
    return docFrag;
  };
  var ChildNode = {
    after: {
      value: function () {
        var argArr = Array.prototype.slice.call(arguments);
        var parentNode = this.parentNode;
        var nextSibling = this.nextSibling;
        if (parentNode === null) return;
        while (
          nextSibling &&
          argArr.some(function (v) {
            return v === nextSibling;
          })
        )
          nextSibling = nextSibling.nextSibling;
        var docFrag = createDocumentFragmentFromArguments(this.doc, argArr);
        parentNode.insertBefore(docFrag, nextSibling);
      },
    },
    before: {
      value: function () {
        var argArr = Array.prototype.slice.call(arguments);
        var parentNode = this.parentNode;
        var prevSibling = this.previousSibling;
        if (parentNode === null) return;
        while (
          prevSibling &&
          argArr.some(function (v) {
            return v === prevSibling;
          })
        )
          prevSibling = prevSibling.previousSibling;
        var docFrag = createDocumentFragmentFromArguments(this.doc, argArr);
        var nextSibling = prevSibling ? prevSibling.nextSibling : parentNode.firstChild;
        parentNode.insertBefore(docFrag, nextSibling);
      },
    },
    remove: {
      value: function () {
        if (this.parentNode === null) return;
        if (this.doc) {
          this.doc._preremoveNodeIterators(this);
          if (this.rooted) this.doc.mutateRemove(this);
        }
        this._remove();
        this.parentNode = null;
      },
    },
    _remove: {
      value: function () {
        var parent = this.parentNode;
        if (parent === null) return;
        if (parent._childNodes) parent._childNodes.splice(this.index, 1);
        else if (parent._firstChild === this)
          if (this._nextSibling === this) parent._firstChild = null;
          else parent._firstChild = this._nextSibling;
        LinkedList.remove(this);
        parent.modify();
      },
    },
    replaceWith: {
      value: function () {
        var argArr = Array.prototype.slice.call(arguments);
        var parentNode = this.parentNode;
        var nextSibling = this.nextSibling;
        if (parentNode === null) return;
        while (
          nextSibling &&
          argArr.some(function (v) {
            return v === nextSibling;
          })
        )
          nextSibling = nextSibling.nextSibling;
        var docFrag = createDocumentFragmentFromArguments(this.doc, argArr);
        if (this.parentNode === parentNode) parentNode.replaceChild(docFrag, this);
        else parentNode.insertBefore(docFrag, nextSibling);
      },
    },
  };
  cjsModule.exports = ChildNode;
});
export { require_ChildNode };
