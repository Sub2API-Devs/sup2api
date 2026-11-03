/**
 * @mixmark-io/domino/lib/TreeWalker.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";
import { require_NodeFilter } from "./NodeFilter.js";
import { require_NodeTraversal } from "./NodeTraversal.js";
import { require_utils } from "./utils.js";

//@ chunk-vwj6ccer.js:68270-71450 cjs-fingerprint
var require_TreeWalker = x(function (cjsExports, cjsModule) {
  cjsModule.exports = TreeWalker;
  var Node = require_Node();
  var NodeFilter = require_NodeFilter();
  var NodeTraversal = require_NodeTraversal();
  var utils = require_utils();
  var mapChild = {
    first: "firstChild",
    last: "lastChild",
    next: "firstChild",
    previous: "lastChild",
  };
  var mapSibling = {
    first: "nextSibling",
    last: "previousSibling",
    next: "nextSibling",
    previous: "previousSibling",
  };
  function traverseChildren(tw, type) {
    var child;
    var node;
    var parent;
    var result;
    var sibling;
    node = tw._currentNode[mapChild[type]];
    while (node !== null) {
      result = tw._internalFilter(node);
      if (result === NodeFilter.FILTER_ACCEPT) {
        tw._currentNode = node;
        return node;
      }
      if (result === NodeFilter.FILTER_SKIP) {
        child = node[mapChild[type]];
        if (child !== null) {
          node = child;
          continue;
        }
      }
      while (node !== null) {
        sibling = node[mapSibling[type]];
        if (sibling !== null) {
          node = sibling;
          break;
        }
        parent = node.parentNode;
        if (parent === null || parent === tw.root || parent === tw._currentNode) return null;
        else node = parent;
      }
    }
    return null;
  }
  function traverseSiblings(tw, type) {
    var node;
    var result;
    var sibling;
    node = tw._currentNode;
    if (node === tw.root) return null;
    while (true) {
      sibling = node[mapSibling[type]];
      while (sibling !== null) {
        node = sibling;
        result = tw._internalFilter(node);
        if (result === NodeFilter.FILTER_ACCEPT) {
          tw._currentNode = node;
          return node;
        }
        sibling = node[mapChild[type]];
        if (result === NodeFilter.FILTER_REJECT || sibling === null) sibling = node[mapSibling[type]];
      }
      node = node.parentNode;
      if (node === null || node === tw.root) return null;
      if (tw._internalFilter(node) === NodeFilter.FILTER_ACCEPT) return null;
    }
  }
  function TreeWalker(root, whatToShow, filter) {
    if (!root || !root.nodeType) utils.NotSupportedError();
    this._root = root;
    this._whatToShow = Number(whatToShow) || 0;
    this._filter = filter || null;
    this._active = false;
    this._currentNode = root;
  }
  Object.defineProperties(TreeWalker.prototype, {
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
      set: function (v) {
        if (!(v instanceof Node)) throw TypeError("Not a Node");
        this._currentNode = v;
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
    parentNode: {
      value: function () {
        var node = this._currentNode;
        while (node !== this.root) {
          node = node.parentNode;
          if (node === null) return null;
          if (this._internalFilter(node) === NodeFilter.FILTER_ACCEPT) {
            this._currentNode = node;
            return node;
          }
        }
        return null;
      },
    },
    firstChild: {
      value: function () {
        return traverseChildren(this, "first");
      },
    },
    lastChild: {
      value: function () {
        return traverseChildren(this, "last");
      },
    },
    previousSibling: {
      value: function () {
        return traverseSiblings(this, "previous");
      },
    },
    nextSibling: {
      value: function () {
        return traverseSiblings(this, "next");
      },
    },
    previousNode: {
      value: function () {
        var node;
        var result;
        var previousSibling;
        var lastChild;
        node = this._currentNode;
        while (node !== this._root) {
          for (
            previousSibling = node.previousSibling;
            previousSibling;
            previousSibling = node.previousSibling
          ) {
            node = previousSibling;
            result = this._internalFilter(node);
            if (result === NodeFilter.FILTER_REJECT) continue;
            for (lastChild = node.lastChild; lastChild; lastChild = node.lastChild) {
              node = lastChild;
              result = this._internalFilter(node);
              if (result === NodeFilter.FILTER_REJECT) break;
            }
            if (result === NodeFilter.FILTER_ACCEPT) {
              this._currentNode = node;
              return node;
            }
          }
          if (node === this.root || node.parentNode === null) return null;
          node = node.parentNode;
          if (this._internalFilter(node) === NodeFilter.FILTER_ACCEPT) {
            this._currentNode = node;
            return node;
          }
        }
        return null;
      },
    },
    nextNode: {
      value: function () {
        var node;
        var result;
        var firstChild;
        var nextSibling;
        node = this._currentNode;
        result = NodeFilter.FILTER_ACCEPT;
        e: while (true) {
          for (firstChild = node.firstChild; firstChild; firstChild = node.firstChild) {
            node = firstChild;
            result = this._internalFilter(node);
            if (result === NodeFilter.FILTER_ACCEPT) {
              this._currentNode = node;
              return node;
            } else if (result === NodeFilter.FILTER_REJECT) break;
          }
          for (
            nextSibling = NodeTraversal.nextSkippingChildren(node, this.root);
            nextSibling;
            nextSibling = NodeTraversal.nextSkippingChildren(node, this.root)
          ) {
            node = nextSibling;
            result = this._internalFilter(node);
            if (result === NodeFilter.FILTER_ACCEPT) {
              this._currentNode = node;
              return node;
            } else if (result === NodeFilter.FILTER_SKIP) continue e;
          }
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
export { require_TreeWalker };
