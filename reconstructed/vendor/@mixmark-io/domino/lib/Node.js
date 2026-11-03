/**
 * @mixmark-io/domino/lib/Node.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ka } from "./EventTarget.js";
import { Ya } from "./LinkedList.js";
import { Qa } from "./NodeUtils.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:14225-23412 cjs-fingerprint
var xe = x(function (ud, es) {
  es.exports = X;
  var Ji = Ka(),
    Kr = Ya(),
    Yi = Qa(),
    V = ee();
  function X() {
    (Ji.call(this),
      (this.parentNode = null),
      (this._nextSibling = this._previousSibling = this),
      (this._index = void 0));
  }
  var _e = (X.ELEMENT_NODE = 1),
    $a = (X.ATTRIBUTE_NODE = 2),
    Yr = (X.TEXT_NODE = 3),
    xl = (X.CDATA_SECTION_NODE = 4),
    fl = (X.ENTITY_REFERENCE_NODE = 5),
    Za = (X.ENTITY_NODE = 6),
    Qi = (X.PROCESSING_INSTRUCTION_NODE = 7),
    $i = (X.COMMENT_NODE = 8),
    ar = (X.DOCUMENT_NODE = 9),
    Ae = (X.DOCUMENT_TYPE_NODE = 10),
    ut = (X.DOCUMENT_FRAGMENT_NODE = 11),
    Ja = (X.NOTATION_NODE = 12),
    en = (X.DOCUMENT_POSITION_DISCONNECTED = 1),
    tn = (X.DOCUMENT_POSITION_PRECEDING = 2),
    rn = (X.DOCUMENT_POSITION_FOLLOWING = 4),
    Zi = (X.DOCUMENT_POSITION_CONTAINS = 8),
    an = (X.DOCUMENT_POSITION_CONTAINED_BY = 16),
    nn = (X.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 32);
  X.prototype = Object.create(Ji.prototype, {
    baseURI: { get: V.nyi },
    parentElement: {
      get: function () {
        return this.parentNode && this.parentNode.nodeType === _e ? this.parentNode : null;
      },
    },
    hasChildNodes: { value: V.shouldOverride },
    firstChild: { get: V.shouldOverride },
    lastChild: { get: V.shouldOverride },
    isConnected: {
      get: function () {
        let e = this;
        while (e != null) {
          if (e.nodeType === X.DOCUMENT_NODE) return !0;
          if (((e = e.parentNode), e != null && e.nodeType === X.DOCUMENT_FRAGMENT_NODE)) e = e.host;
        }
        return !1;
      },
    },
    previousSibling: {
      get: function () {
        var parentNode = this.parentNode;
        if (!parentNode) return null;
        if (this === parentNode.firstChild) return null;
        return this._previousSibling;
      },
    },
    nextSibling: {
      get: function () {
        var parentNode = this.parentNode,
          _nextSibling = this._nextSibling;
        if (!parentNode) return null;
        if (_nextSibling === parentNode.firstChild) return null;
        return _nextSibling;
      },
    },
    textContent: {
      get: function () {
        return null;
      },
      set: function (e) {},
    },
    innerText: {
      get: function () {
        return null;
      },
      set: function (e) {},
    },
    _countChildrenOfType: {
      value: function (e) {
        var t = 0;
        for (var firstChild = this.firstChild; firstChild !== null; firstChild = firstChild.nextSibling)
          if (firstChild.nodeType === e) t++;
        return t;
      },
    },
    _ensureInsertValid: {
      value: function (t, r, a) {
        var s = this,
          c,
          d;
        if (!t.nodeType) throw TypeError("not a node");
        switch (s.nodeType) {
          case ar:
          case ut:
          case _e:
            break;
          default:
            V.HierarchyRequestError();
        }
        if (t.isAncestor(s)) V.HierarchyRequestError();
        if (r !== null || !a) {
          if (r.parentNode !== s) V.NotFoundError();
        }
        switch (t.nodeType) {
          case ut:
          case Ae:
          case _e:
          case Yr:
          case Qi:
          case $i:
            break;
          default:
            V.HierarchyRequestError();
        }
        if (s.nodeType === ar)
          switch (t.nodeType) {
            case Yr:
              V.HierarchyRequestError();
              break;
            case ut:
              if (t._countChildrenOfType(Yr) > 0) V.HierarchyRequestError();
              switch (t._countChildrenOfType(_e)) {
                case 0:
                  break;
                case 1:
                  if (r !== null) {
                    if (a && r.nodeType === Ae) V.HierarchyRequestError();
                    for (d = r.nextSibling; d !== null; d = d.nextSibling)
                      if (d.nodeType === Ae) V.HierarchyRequestError();
                  }
                  if (((c = s._countChildrenOfType(_e)), a)) {
                    if (c > 0) V.HierarchyRequestError();
                  } else if (c > 1 || (c === 1 && r.nodeType !== _e)) V.HierarchyRequestError();
                  break;
                default:
                  V.HierarchyRequestError();
              }
              break;
            case _e:
              if (r !== null) {
                if (a && r.nodeType === Ae) V.HierarchyRequestError();
                for (d = r.nextSibling; d !== null; d = d.nextSibling)
                  if (d.nodeType === Ae) V.HierarchyRequestError();
              }
              if (((c = s._countChildrenOfType(_e)), a)) {
                if (c > 0) V.HierarchyRequestError();
              } else if (c > 1 || (c === 1 && r.nodeType !== _e)) V.HierarchyRequestError();
              break;
            case Ae:
              if (r === null) {
                if (s._countChildrenOfType(_e)) V.HierarchyRequestError();
              } else
                for (d = s.firstChild; d !== null; d = d.nextSibling) {
                  if (d === r) break;
                  if (d.nodeType === _e) V.HierarchyRequestError();
                }
              if (((c = s._countChildrenOfType(Ae)), a)) {
                if (c > 0) V.HierarchyRequestError();
              } else if (c > 1 || (c === 1 && r.nodeType !== Ae)) V.HierarchyRequestError();
              break;
          }
        else if (t.nodeType === Ae) V.HierarchyRequestError();
      },
    },
    insertBefore: {
      value: function (t, r) {
        var a = this;
        a._ensureInsertValid(t, r, !0);
        var s = r;
        if (s === t) s = t.nextSibling;
        return (a.doc.adoptNode(t), t._insertOrReplace(a, s, !1), t);
      },
    },
    appendChild: {
      value: function (e) {
        return this.insertBefore(e, null);
      },
    },
    _appendChild: {
      value: function (e) {
        e._insertOrReplace(this, null, !1);
      },
    },
    removeChild: {
      value: function (t) {
        var r = this;
        if (!t.nodeType) throw TypeError("not a node");
        if (t.parentNode !== r) V.NotFoundError();
        return (t.remove(), t);
      },
    },
    replaceChild: {
      value: function (t, r) {
        var a = this;
        if ((a._ensureInsertValid(t, r, !1), t.doc !== a.doc)) a.doc.adoptNode(t);
        return (t._insertOrReplace(a, r, !0), r);
      },
    },
    contains: {
      value: function (t) {
        if (t === null) return !1;
        if (this === t) return !0;
        return (this.compareDocumentPosition(t) & an) !== 0;
      },
    },
    compareDocumentPosition: {
      value: function (t) {
        if (this === t) return 0;
        if (this.doc !== t.doc || this.rooted !== t.rooted) return en + nn;
        var r = [],
          a = [];
        for (var s = this; s !== null; s = s.parentNode) r.push(s);
        for (s = t; s !== null; s = s.parentNode) a.push(s);
        if ((r.reverse(), a.reverse(), r[0] !== a[0])) return en + nn;
        s = Math.min(r.length, a.length);
        for (var c = 1; c < s; c++)
          if (r[c] !== a[c])
            if (r[c].index < a[c].index) return rn;
            else return tn;
        if (r.length < a.length) return rn + an;
        else return tn + Zi;
      },
    },
    isSameNode: {
      value: function (t) {
        return this === t;
      },
    },
    isEqualNode: {
      value: function (t) {
        if (!t) return !1;
        if (t.nodeType !== this.nodeType) return !1;
        if (!this.isEqual(t)) return !1;
        for (
          var firstChild = this.firstChild, firstChild_2 = t.firstChild;
          firstChild && firstChild_2;
          firstChild = firstChild.nextSibling, firstChild_2 = firstChild_2.nextSibling
        )
          if (!firstChild.isEqualNode(firstChild_2)) return !1;
        return firstChild === null && firstChild_2 === null;
      },
    },
    cloneNode: {
      value: function (e) {
        var clone = this.clone();
        if (e)
          for (var firstChild = this.firstChild; firstChild !== null; firstChild = firstChild.nextSibling)
            clone._appendChild(firstChild.cloneNode(!0));
        return clone;
      },
    },
    lookupPrefix: {
      value: function (t) {
        var r;
        if (t === "" || t === null || t === void 0) return null;
        switch (this.nodeType) {
          case _e:
            return this._lookupNamespacePrefix(t, this);
          case ar:
            return ((r = this.documentElement), r ? r.lookupPrefix(t) : null);
          case Za:
          case Ja:
          case ut:
          case Ae:
            return null;
          case $a:
            return ((r = this.ownerElement), r ? r.lookupPrefix(t) : null);
          default:
            return ((r = this.parentElement), r ? r.lookupPrefix(t) : null);
        }
      },
    },
    lookupNamespaceURI: {
      value: function (t) {
        if (t === "" || t === void 0) t = null;
        var r;
        switch (this.nodeType) {
          case _e:
            return V.shouldOverride();
          case ar:
            return ((r = this.documentElement), r ? r.lookupNamespaceURI(t) : null);
          case Za:
          case Ja:
          case Ae:
          case ut:
            return null;
          case $a:
            return ((r = this.ownerElement), r ? r.lookupNamespaceURI(t) : null);
          default:
            return ((r = this.parentElement), r ? r.lookupNamespaceURI(t) : null);
        }
      },
    },
    isDefaultNamespace: {
      value: function (t) {
        if (t === "" || t === void 0) t = null;
        var lookupNamespaceURI = this.lookupNamespaceURI(null);
        return lookupNamespaceURI === t;
      },
    },
    index: {
      get: function () {
        var parentNode = this.parentNode;
        if (this === parentNode.firstChild) return 0;
        var childNodes = parentNode.childNodes;
        if (this._index === void 0 || childNodes[this._index] !== this) {
          for (var r = 0; r < childNodes.length; r++) childNodes[r]._index = r;
          V.assert(childNodes[this._index] === this);
        }
        return this._index;
      },
    },
    isAncestor: {
      value: function (e) {
        if (this.doc !== e.doc) return !1;
        if (this.rooted !== e.rooted) return !1;
        for (var t = e; t; t = t.parentNode) if (t === this) return !0;
        return !1;
      },
    },
    ensureSameDoc: {
      value: function (e) {
        if (e.ownerDocument === null) e.ownerDocument = this.doc;
        else if (e.ownerDocument !== this.doc) V.WrongDocumentError();
      },
    },
    removeChildren: { value: V.shouldOverride },
    _insertOrReplace: {
      value: function (t, r, a) {
        var s = this,
          c,
          d;
        if (s.nodeType === ut && s.rooted) V.HierarchyRequestError();
        if (t._childNodes) {
          if (((c = r === null ? t._childNodes.length : r.index), s.parentNode === t)) {
            var index = s.index;
            if (index < c) c--;
          }
        }
        if (a) {
          if (r.rooted) r.doc.mutateRemove(r);
          r.parentNode = null;
        }
        var m = r;
        if (m === null) m = t.firstChild;
        var v = s.rooted && t.rooted;
        if (s.nodeType === ut) {
          var T = [0, a ? 1 : 0],
            ne;
          for (var firstChild = s.firstChild; firstChild !== null; firstChild = ne)
            ((ne = firstChild.nextSibling), T.push(firstChild), (firstChild.parentNode = t));
          var l = T.length;
          if (a) Kr.replace(m, l > 2 ? T[2] : null);
          else if (l > 2 && m !== null) Kr.insertBefore(T[2], m);
          if (t._childNodes) {
            ((T[0] = r === null ? t._childNodes.length : r._index),
              t._childNodes.splice.apply(t._childNodes, T));
            for (d = 2; d < l; d++) T[d]._index = T[0] + (d - 2);
          } else if (t._firstChild === r) {
            if (l > 2) t._firstChild = T[2];
            else if (a) t._firstChild = null;
          }
          if (s._childNodes) s._childNodes.length = 0;
          else s._firstChild = null;
          if (t.rooted) {
            t.modify();
            for (d = 2; d < l; d++) t.doc.mutateInsert(T[d]);
          }
        } else {
          if (r === s) return;
          if (v) s._remove();
          else if (s.parentNode) s.remove();
          if (((s.parentNode = t), a)) {
            if ((Kr.replace(m, s), t._childNodes)) ((s._index = c), (t._childNodes[c] = s));
            else if (t._firstChild === r) t._firstChild = s;
          } else {
            if (m !== null) Kr.insertBefore(s, m);
            if (t._childNodes) ((s._index = c), t._childNodes.splice(c, 0, s));
            else if (t._firstChild === r) t._firstChild = s;
          }
          if (v) (t.modify(), t.doc.mutateMove(s));
          else if (t.rooted) (t.modify(), t.doc.mutateInsert(s));
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
          var e = ++this.doc.modclock;
          for (var t = this; t; t = t.parentElement) if (t._lastModTime) t._lastModTime = e;
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
        var e;
        for (var firstChild = this.firstChild; firstChild !== null; firstChild = e) {
          if (((e = firstChild.nextSibling), firstChild.normalize)) firstChild.normalize();
          if (firstChild.nodeType !== X.TEXT_NODE) continue;
          if (firstChild.nodeValue === "") {
            this.removeChild(firstChild);
            continue;
          }
          var previousSibling = firstChild.previousSibling;
          if (previousSibling === null) continue;
          else if (previousSibling.nodeType === X.TEXT_NODE)
            (previousSibling.appendData(firstChild.nodeValue), this.removeChild(firstChild));
        }
      },
    },
    serialize: {
      value: function () {
        if (this._innerHTML) return this._innerHTML;
        var e = "";
        for (var firstChild = this.firstChild; firstChild !== null; firstChild = firstChild.nextSibling)
          e += Yi.serializeOne(firstChild, this);
        return e;
      },
    },
    outerHTML: {
      get: function () {
        return Yi.serializeOne(this, { nodeType: 0 });
      },
      set: V.nyi,
    },
    ELEMENT_NODE: { value: _e },
    ATTRIBUTE_NODE: { value: $a },
    TEXT_NODE: { value: Yr },
    CDATA_SECTION_NODE: { value: xl },
    ENTITY_REFERENCE_NODE: { value: fl },
    ENTITY_NODE: { value: Za },
    PROCESSING_INSTRUCTION_NODE: { value: Qi },
    COMMENT_NODE: { value: $i },
    DOCUMENT_NODE: { value: ar },
    DOCUMENT_TYPE_NODE: { value: Ae },
    DOCUMENT_FRAGMENT_NODE: { value: ut },
    NOTATION_NODE: { value: Ja },
    DOCUMENT_POSITION_DISCONNECTED: { value: en },
    DOCUMENT_POSITION_PRECEDING: { value: tn },
    DOCUMENT_POSITION_FOLLOWING: { value: rn },
    DOCUMENT_POSITION_CONTAINS: { value: Zi },
    DOCUMENT_POSITION_CONTAINED_BY: { value: an },
    DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC: { value: nn },
  });
});

export { xe };
