/**
 * @mixmark-io/domino/lib/NodeIterator.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_NodeFilter } from "./NodeFilter.js";
import { require_NodeTraversal } from "./NodeTraversal.js";
import { require_utils } from "./utils.js";

//@ chunk-vwj6ccer.js:71450-73463 cjs-fingerprint
var require_NodeIterator = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = NodeIterator;
  var NodeFilter = require_NodeFilter();
  var NodeTraversal = require_NodeTraversal();
  var utils = require_utils();
  function move(node, stayWithin, directionIsNext) {
    if (directionIsNext) return NodeTraversal.next(node, stayWithin);
    else {
      if (node === stayWithin) return null;
      return NodeTraversal.previous(node, null);
    }
  }
  function isInclusiveAncestor(node, possibleChild) {
    for (; possibleChild; possibleChild = possibleChild.parentNode) if (node === possibleChild) return true;
    return false;
  }
  function traverse(ni, directionIsNext) {
    var node;
    var beforeNode;
    node = ni._referenceNode;
    beforeNode = ni._pointerBeforeReferenceNode;
    while (true) {
      if (beforeNode === directionIsNext) beforeNode = !beforeNode;
      else {
        node = move(node, ni._root, directionIsNext);
        if (node === null) return null;
      }
      var result = ni._internalFilter(node);
      if (result === NodeFilter.FILTER_ACCEPT) break;
    }
    ni._referenceNode = node;
    ni._pointerBeforeReferenceNode = beforeNode;
    return node;
  }
  function NodeIterator(root, whatToShow, filter) {
    if (!root || !root.nodeType) utils.NotSupportedError();
    this._root = root;
    this._referenceNode = root;
    this._pointerBeforeReferenceNode = true;
    this._whatToShow = Number(whatToShow) || 0;
    this._filter = filter || null;
    this._active = false;
    root.doc._attachNodeIterator(this);
  }
  Object.defineProperties(NodeIterator.prototype, {
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
      value: function (node) {
        var result;
        var filter;
        if (this._active) utils.InvalidStateError();
        if (!((1 << (node.nodeType - 1)) & this._whatToShow)) return NodeFilter.FILTER_SKIP;
        filter = this._filter;
        if (filter === null) result = NodeFilter.FILTER_ACCEPT;
        else {
          this._active = true;
          try {
            if (typeof filter === "function") result = filter(node);
            else result = filter.acceptNode(node);
          } finally {
            this._active = false;
          }
        }
        return +result;
      },
    },
    _preremove: {
      value: function (toBeRemovedNode) {
        if (isInclusiveAncestor(toBeRemovedNode, this._root)) return;
        if (!isInclusiveAncestor(toBeRemovedNode, this._referenceNode)) return;
        if (this._pointerBeforeReferenceNode) {
          var next = toBeRemovedNode;
          while (next.lastChild) next = next.lastChild;
          next = NodeTraversal.next(next, this.root);
          if (next) {
            this._referenceNode = next;
            return;
          }
          this._pointerBeforeReferenceNode = false;
        }
        if (toBeRemovedNode.previousSibling === null) this._referenceNode = toBeRemovedNode.parentNode;
        else {
          this._referenceNode = toBeRemovedNode.previousSibling;
          var lastChild;
          for (
            lastChild = this._referenceNode.lastChild;
            lastChild;
            lastChild = this._referenceNode.lastChild
          )
            this._referenceNode = lastChild;
        }
      },
    },
    nextNode: {
      value: function () {
        return traverse(this, true);
      },
    },
    previousNode: {
      value: function () {
        return traverse(this, false);
      },
    },
    detach: {
      value: function () {},
    },
    toString: {
      value: function () {
        return "[object NodeIterator]";
      },
    },
  });
});
export { require_NodeIterator };
