/**
 * @mixmark-io/domino/lib/Node.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_EventTarget } from "./EventTarget.js";
import { require_LinkedList } from "./LinkedList.js";
import { require_NodeUtils } from "./NodeUtils.js";
import { require_utils } from "./utils.js";

//@ chunk-w04z664w.js:14225-23412 cjs-fingerprint
var require_Node = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Node;
  var EventTargetModule = require_EventTarget();
  var LinkedList = require_LinkedList();
  var NodeUtils = require_NodeUtils();
  var utils = require_utils();
  function Node() {
    EventTargetModule.call(this);
    this.parentNode = null;
    this._nextSibling = this._previousSibling = this;
    this._index = undefined;
  }
  var ELEMENT_NODE = (Node.ELEMENT_NODE = 1);
  var ATTRIBUTE_NODE = (Node.ATTRIBUTE_NODE = 2);
  var TEXT_NODE = (Node.TEXT_NODE = 3);
  var CDATA_SECTION_NODE = (Node.CDATA_SECTION_NODE = 4);
  var ENTITY_REFERENCE_NODE = (Node.ENTITY_REFERENCE_NODE = 5);
  var ENTITY_NODE = (Node.ENTITY_NODE = 6);
  var PROCESSING_INSTRUCTION_NODE = (Node.PROCESSING_INSTRUCTION_NODE = 7);
  var COMMENT_NODE = (Node.COMMENT_NODE = 8);
  var DOCUMENT_NODE = (Node.DOCUMENT_NODE = 9);
  var DOCUMENT_TYPE_NODE = (Node.DOCUMENT_TYPE_NODE = 10);
  var DOCUMENT_FRAGMENT_NODE = (Node.DOCUMENT_FRAGMENT_NODE = 11);
  var NOTATION_NODE = (Node.NOTATION_NODE = 12);
  var DOCUMENT_POSITION_DISCONNECTED = (Node.DOCUMENT_POSITION_DISCONNECTED = 1);
  var DOCUMENT_POSITION_PRECEDING = (Node.DOCUMENT_POSITION_PRECEDING = 2);
  var DOCUMENT_POSITION_FOLLOWING = (Node.DOCUMENT_POSITION_FOLLOWING = 4);
  var DOCUMENT_POSITION_CONTAINS = (Node.DOCUMENT_POSITION_CONTAINS = 8);
  var DOCUMENT_POSITION_CONTAINED_BY = (Node.DOCUMENT_POSITION_CONTAINED_BY = 16);
  var DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = (Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 32);
  Node.prototype = Object.create(EventTargetModule.prototype, {
    baseURI: {
      get: utils.nyi,
    },
    parentElement: {
      get: function () {
        return this.parentNode && this.parentNode.nodeType === ELEMENT_NODE ? this.parentNode : null;
      },
    },
    hasChildNodes: {
      value: utils.shouldOverride,
    },
    firstChild: {
      get: utils.shouldOverride,
    },
    lastChild: {
      get: utils.shouldOverride,
    },
    isConnected: {
      get: function () {
        let node = this;
        while (node != null) {
          if (node.nodeType === Node.DOCUMENT_NODE) return true;
          node = node.parentNode;
          if (node != null && node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) node = node.host;
        }
        return false;
      },
    },
    previousSibling: {
      get: function () {
        var parent = this.parentNode;
        if (!parent) return null;
        if (this === parent.firstChild) return null;
        return this._previousSibling;
      },
    },
    nextSibling: {
      get: function () {
        var parent = this.parentNode;
        var next = this._nextSibling;
        if (!parent) return null;
        if (next === parent.firstChild) return null;
        return next;
      },
    },
    textContent: {
      get: function () {
        return null;
      },
      set: function (v) {},
    },
    innerText: {
      get: function () {
        return null;
      },
      set: function (v) {},
    },
    _countChildrenOfType: {
      value: function (type) {
        var sum = 0;
        for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling) if (kid.nodeType === type) sum++;
        return sum;
      },
    },
    _ensureInsertValid: {
      value: function (node, child, isPreinsert) {
        var parent = this;
        var i;
        var kid;
        if (!node.nodeType) throw TypeError("not a node");
        switch (parent.nodeType) {
          case DOCUMENT_NODE:
          case DOCUMENT_FRAGMENT_NODE:
          case ELEMENT_NODE:
            break;
          default:
            utils.HierarchyRequestError();
        }
        if (node.isAncestor(parent)) utils.HierarchyRequestError();
        if (child !== null || !isPreinsert) {
          if (child.parentNode !== parent) utils.NotFoundError();
        }
        switch (node.nodeType) {
          case DOCUMENT_FRAGMENT_NODE:
          case DOCUMENT_TYPE_NODE:
          case ELEMENT_NODE:
          case TEXT_NODE:
          case PROCESSING_INSTRUCTION_NODE:
          case COMMENT_NODE:
            break;
          default:
            utils.HierarchyRequestError();
        }
        if (parent.nodeType === DOCUMENT_NODE)
          switch (node.nodeType) {
            case TEXT_NODE:
              utils.HierarchyRequestError();
              break;
            case DOCUMENT_FRAGMENT_NODE:
              if (node._countChildrenOfType(TEXT_NODE) > 0) utils.HierarchyRequestError();
              switch (node._countChildrenOfType(ELEMENT_NODE)) {
                case 0:
                  break;
                case 1:
                  if (child !== null) {
                    if (isPreinsert && child.nodeType === DOCUMENT_TYPE_NODE) utils.HierarchyRequestError();
                    for (kid = child.nextSibling; kid !== null; kid = kid.nextSibling)
                      if (kid.nodeType === DOCUMENT_TYPE_NODE) utils.HierarchyRequestError();
                  }
                  i = parent._countChildrenOfType(ELEMENT_NODE);
                  if (isPreinsert) {
                    if (i > 0) utils.HierarchyRequestError();
                  } else if (i > 1 || (i === 1 && child.nodeType !== ELEMENT_NODE))
                    utils.HierarchyRequestError();
                  break;
                default:
                  utils.HierarchyRequestError();
              }
              break;
            case ELEMENT_NODE:
              if (child !== null) {
                if (isPreinsert && child.nodeType === DOCUMENT_TYPE_NODE) utils.HierarchyRequestError();
                for (kid = child.nextSibling; kid !== null; kid = kid.nextSibling)
                  if (kid.nodeType === DOCUMENT_TYPE_NODE) utils.HierarchyRequestError();
              }
              i = parent._countChildrenOfType(ELEMENT_NODE);
              if (isPreinsert) {
                if (i > 0) utils.HierarchyRequestError();
              } else if (i > 1 || (i === 1 && child.nodeType !== ELEMENT_NODE)) utils.HierarchyRequestError();
              break;
            case DOCUMENT_TYPE_NODE:
              if (child === null) {
                if (parent._countChildrenOfType(ELEMENT_NODE)) utils.HierarchyRequestError();
              } else
                for (kid = parent.firstChild; kid !== null; kid = kid.nextSibling) {
                  if (kid === child) break;
                  if (kid.nodeType === ELEMENT_NODE) utils.HierarchyRequestError();
                }
              i = parent._countChildrenOfType(DOCUMENT_TYPE_NODE);
              if (isPreinsert) {
                if (i > 0) utils.HierarchyRequestError();
              } else if (i > 1 || (i === 1 && child.nodeType !== DOCUMENT_TYPE_NODE))
                utils.HierarchyRequestError();
              break;
          }
        else if (node.nodeType === DOCUMENT_TYPE_NODE) utils.HierarchyRequestError();
      },
    },
    insertBefore: {
      value: function (node, child) {
        var parent = this;
        parent._ensureInsertValid(node, child, true);
        var refChild = child;
        if (refChild === node) refChild = node.nextSibling;
        parent.doc.adoptNode(node);
        node._insertOrReplace(parent, refChild, false);
        return node;
      },
    },
    appendChild: {
      value: function (child) {
        return this.insertBefore(child, null);
      },
    },
    _appendChild: {
      value: function (child) {
        child._insertOrReplace(this, null, false);
      },
    },
    removeChild: {
      value: function (child) {
        var parent = this;
        if (!child.nodeType) throw TypeError("not a node");
        if (child.parentNode !== parent) utils.NotFoundError();
        child.remove();
        return child;
      },
    },
    replaceChild: {
      value: function (node, child) {
        var parent = this;
        parent._ensureInsertValid(node, child, false);
        if (node.doc !== parent.doc) parent.doc.adoptNode(node);
        node._insertOrReplace(parent, child, true);
        return child;
      },
    },
    contains: {
      value: function (node) {
        if (node === null) return false;
        if (this === node) return true;
        return (this.compareDocumentPosition(node) & DOCUMENT_POSITION_CONTAINED_BY) !== 0;
      },
    },
    compareDocumentPosition: {
      value: function (that) {
        if (this === that) return 0;
        if (this.doc !== that.doc || this.rooted !== that.rooted)
          return DOCUMENT_POSITION_DISCONNECTED + DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
        var these = [];
        var those = [];
        for (var n = this; n !== null; n = n.parentNode) these.push(n);
        for (n = that; n !== null; n = n.parentNode) those.push(n);
        these.reverse();
        those.reverse();
        if (these[0] !== those[0])
          return DOCUMENT_POSITION_DISCONNECTED + DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
        n = Math.min(these.length, those.length);
        for (var i = 1; i < n; i++)
          if (these[i] !== those[i])
            if (these[i].index < those[i].index) return DOCUMENT_POSITION_FOLLOWING;
            else return DOCUMENT_POSITION_PRECEDING;
        if (these.length < those.length) return DOCUMENT_POSITION_FOLLOWING + DOCUMENT_POSITION_CONTAINED_BY;
        else return DOCUMENT_POSITION_PRECEDING + DOCUMENT_POSITION_CONTAINS;
      },
    },
    isSameNode: {
      value: function (node) {
        return this === node;
      },
    },
    isEqualNode: {
      value: function (node) {
        if (!node) return false;
        if (node.nodeType !== this.nodeType) return false;
        if (!this.isEqual(node)) return false;
        for (
          var c1 = this.firstChild, c2 = node.firstChild;
          c1 && c2;
          c1 = c1.nextSibling, c2 = c2.nextSibling
        )
          if (!c1.isEqualNode(c2)) return false;
        return c1 === null && c2 === null;
      },
    },
    cloneNode: {
      value: function (deep) {
        var clone = this.clone();
        if (deep)
          for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling)
            clone._appendChild(kid.cloneNode(true));
        return clone;
      },
    },
    lookupPrefix: {
      value: function (ns) {
        var e;
        if (ns === "" || ns === null || ns === undefined) return null;
        switch (this.nodeType) {
          case ELEMENT_NODE:
            return this._lookupNamespacePrefix(ns, this);
          case DOCUMENT_NODE:
            e = this.documentElement;
            return e ? e.lookupPrefix(ns) : null;
          case ENTITY_NODE:
          case NOTATION_NODE:
          case DOCUMENT_FRAGMENT_NODE:
          case DOCUMENT_TYPE_NODE:
            return null;
          case ATTRIBUTE_NODE:
            e = this.ownerElement;
            return e ? e.lookupPrefix(ns) : null;
          default:
            e = this.parentElement;
            return e ? e.lookupPrefix(ns) : null;
        }
      },
    },
    lookupNamespaceURI: {
      value: function (prefix) {
        if (prefix === "" || prefix === undefined) prefix = null;
        var e;
        switch (this.nodeType) {
          case ELEMENT_NODE:
            return utils.shouldOverride();
          case DOCUMENT_NODE:
            e = this.documentElement;
            return e ? e.lookupNamespaceURI(prefix) : null;
          case ENTITY_NODE:
          case NOTATION_NODE:
          case DOCUMENT_TYPE_NODE:
          case DOCUMENT_FRAGMENT_NODE:
            return null;
          case ATTRIBUTE_NODE:
            e = this.ownerElement;
            return e ? e.lookupNamespaceURI(prefix) : null;
          default:
            e = this.parentElement;
            return e ? e.lookupNamespaceURI(prefix) : null;
        }
      },
    },
    isDefaultNamespace: {
      value: function (ns) {
        if (ns === "" || ns === undefined) ns = null;
        var defaultNamespace = this.lookupNamespaceURI(null);
        return defaultNamespace === ns;
      },
    },
    index: {
      get: function () {
        var parent = this.parentNode;
        if (this === parent.firstChild) return 0;
        var kids = parent.childNodes;
        if (this._index === undefined || kids[this._index] !== this) {
          for (var i = 0; i < kids.length; i++) kids[i]._index = i;
          utils.assert(kids[this._index] === this);
        }
        return this._index;
      },
    },
    isAncestor: {
      value: function (that) {
        if (this.doc !== that.doc) return false;
        if (this.rooted !== that.rooted) return false;
        for (var e = that; e; e = e.parentNode) if (e === this) return true;
        return false;
      },
    },
    ensureSameDoc: {
      value: function (that) {
        if (that.ownerDocument === null) that.ownerDocument = this.doc;
        else if (that.ownerDocument !== this.doc) utils.WrongDocumentError();
      },
    },
    removeChildren: {
      value: utils.shouldOverride,
    },
    _insertOrReplace: {
      value: function (parent, before, isReplace) {
        var child = this;
        var before_index;
        var i;
        if (child.nodeType === DOCUMENT_FRAGMENT_NODE && child.rooted) utils.HierarchyRequestError();
        if (parent._childNodes) {
          before_index = before === null ? parent._childNodes.length : before.index;
          if (child.parentNode === parent) {
            var child_index = child.index;
            if (child_index < before_index) before_index--;
          }
        }
        if (isReplace) {
          if (before.rooted) before.doc.mutateRemove(before);
          before.parentNode = null;
        }
        var n = before;
        if (n === null) n = parent.firstChild;
        var bothRooted = child.rooted && parent.rooted;
        if (child.nodeType === DOCUMENT_FRAGMENT_NODE) {
          var spliceArgs = [0, isReplace ? 1 : 0];
          var next;
          for (var kid = child.firstChild; kid !== null; kid = next) {
            next = kid.nextSibling;
            spliceArgs.push(kid);
            kid.parentNode = parent;
          }
          var len = spliceArgs.length;
          if (isReplace) LinkedList.replace(n, len > 2 ? spliceArgs[2] : null);
          else if (len > 2 && n !== null) LinkedList.insertBefore(spliceArgs[2], n);
          if (parent._childNodes) {
            spliceArgs[0] = before === null ? parent._childNodes.length : before._index;
            parent._childNodes.splice.apply(parent._childNodes, spliceArgs);
            for (i = 2; i < len; i++) spliceArgs[i]._index = spliceArgs[0] + (i - 2);
          } else if (parent._firstChild === before) {
            if (len > 2) parent._firstChild = spliceArgs[2];
            else if (isReplace) parent._firstChild = null;
          }
          if (child._childNodes) child._childNodes.length = 0;
          else child._firstChild = null;
          if (parent.rooted) {
            parent.modify();
            for (i = 2; i < len; i++) parent.doc.mutateInsert(spliceArgs[i]);
          }
        } else {
          if (before === child) return;
          if (bothRooted) child._remove();
          else if (child.parentNode) child.remove();
          child.parentNode = parent;
          if (isReplace) {
            LinkedList.replace(n, child);
            if (parent._childNodes) {
              child._index = before_index;
              parent._childNodes[before_index] = child;
            } else if (parent._firstChild === before) parent._firstChild = child;
          } else {
            if (n !== null) LinkedList.insertBefore(child, n);
            if (parent._childNodes) {
              child._index = before_index;
              parent._childNodes.splice(before_index, 0, child);
            } else if (parent._firstChild === before) parent._firstChild = child;
          }
          if (bothRooted) {
            parent.modify();
            parent.doc.mutateMove(child);
          } else if (parent.rooted) {
            parent.modify();
            parent.doc.mutateInsert(child);
          }
        }
      },
    },
    lastModTime: {
      get: function () {
        if (!this._lastModTime) this._lastModTime = this.doc.modclock;
        return this._lastModTime;
      },
    },
    modify: {
      value: function () {
        if (this.doc.modclock) {
          var time = ++this.doc.modclock;
          for (var n = this; n; n = n.parentElement) if (n._lastModTime) n._lastModTime = time;
        }
      },
    },
    doc: {
      get: function () {
        return this.ownerDocument || this;
      },
    },
    rooted: {
      get: function () {
        return !!this._nid;
      },
    },
    normalize: {
      value: function () {
        var next;
        for (var child = this.firstChild; child !== null; child = next) {
          next = child.nextSibling;
          if (child.normalize) child.normalize();
          if (child.nodeType !== Node.TEXT_NODE) continue;
          if (child.nodeValue === "") {
            this.removeChild(child);
            continue;
          }
          var prevChild = child.previousSibling;
          if (prevChild === null) continue;
          else if (prevChild.nodeType === Node.TEXT_NODE) {
            prevChild.appendData(child.nodeValue);
            this.removeChild(child);
          }
        }
      },
    },
    serialize: {
      value: function () {
        if (this._innerHTML) return this._innerHTML;
        var s = "";
        for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling)
          s += NodeUtils.serializeOne(kid, this);
        return s;
      },
    },
    outerHTML: {
      get: function () {
        return NodeUtils.serializeOne(this, {
          nodeType: 0,
        });
      },
      set: utils.nyi,
    },
    ELEMENT_NODE: {
      value: ELEMENT_NODE,
    },
    ATTRIBUTE_NODE: {
      value: ATTRIBUTE_NODE,
    },
    TEXT_NODE: {
      value: TEXT_NODE,
    },
    CDATA_SECTION_NODE: {
      value: CDATA_SECTION_NODE,
    },
    ENTITY_REFERENCE_NODE: {
      value: ENTITY_REFERENCE_NODE,
    },
    ENTITY_NODE: {
      value: ENTITY_NODE,
    },
    PROCESSING_INSTRUCTION_NODE: {
      value: PROCESSING_INSTRUCTION_NODE,
    },
    COMMENT_NODE: {
      value: COMMENT_NODE,
    },
    DOCUMENT_NODE: {
      value: DOCUMENT_NODE,
    },
    DOCUMENT_TYPE_NODE: {
      value: DOCUMENT_TYPE_NODE,
    },
    DOCUMENT_FRAGMENT_NODE: {
      value: DOCUMENT_FRAGMENT_NODE,
    },
    NOTATION_NODE: {
      value: NOTATION_NODE,
    },
    DOCUMENT_POSITION_DISCONNECTED: {
      value: DOCUMENT_POSITION_DISCONNECTED,
    },
    DOCUMENT_POSITION_PRECEDING: {
      value: DOCUMENT_POSITION_PRECEDING,
    },
    DOCUMENT_POSITION_FOLLOWING: {
      value: DOCUMENT_POSITION_FOLLOWING,
    },
    DOCUMENT_POSITION_CONTAINS: {
      value: DOCUMENT_POSITION_CONTAINS,
    },
    DOCUMENT_POSITION_CONTAINED_BY: {
      value: DOCUMENT_POSITION_CONTAINED_BY,
    },
    DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: {
      value: DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC,
    },
  });
});
export { require_Node };
