/**
 * @mixmark-io/domino/lib/Element.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { $r } from "./xmlnames.js";
import { ee } from "./utils.js";
import { un } from "./attributes.js";
import { xe } from "./Node.js";
import { yt } from "./NodeList.js";
import { Qa } from "./NodeUtils.js";
import { ps } from "./FilteredElementList.js";
import { Wr } from "./DOMException.js";
import { xn } from "./DOMTokenList.js";
import { ta } from "./select.js";
import { Qr } from "./ContainerNode.js";
import { ra } from "./ChildNode.js";
import { mn } from "./NonDocumentTypeChildNode.js";
import { gn } from "./NamedNodeMap.js";

//@ chunk-vwj6ccer.js:45299-62055 cjs-fingerprint
var Ft = x(function (vd, Is) {
  Is.exports = xt;
  var bn = $r(),
    Y = ee(),
    NAMESPACE = Y.NAMESPACE,
    na = un(),
    ke = xe(),
    En = yt(),
    zl = Qa(),
    aa = ps(),
    Ht = Wr(),
    Wl = xn(),
    _n = ta(),
    Ls = Qr(),
    Xl = ra(),
    Kl = mn(),
    Ms = gn(),
    create = Object.create(null);
  function xt(e, t, r, a) {
    (Ls.call(this),
      (this.nodeType = ke.ELEMENT_NODE),
      (this.ownerDocument = e),
      (this.localName = t),
      (this.namespaceURI = r),
      (this.prefix = a),
      (this._tagName = void 0),
      (this._attrsByQName = Object.create(null)),
      (this._attrsByLName = Object.create(null)),
      (this._attrKeys = []));
  }
  function vn(e, t) {
    if (e.nodeType === ke.TEXT_NODE) t.push(e._data);
    else for (var r = 0, a = e.childNodes.length; r < a; r++) vn(e.childNodes[r], t);
  }
  xt.prototype = Object.create(Ls.prototype, {
    isHTML: {
      get: function () {
        return this.namespaceURI === NAMESPACE.HTML && this.ownerDocument.isHTML;
      },
    },
    tagName: {
      get: function () {
        if (this._tagName === void 0) {
          var t;
          if (this.prefix === null) t = this.localName;
          else t = this.prefix + ":" + this.localName;
          if (this.isHTML) {
            var r = create[t];
            if (!r) create[t] = r = Y.toASCIIUpperCase(t);
            t = r;
          }
          this._tagName = t;
        }
        return this._tagName;
      },
    },
    nodeName: {
      get: function () {
        return this.tagName;
      },
    },
    nodeValue: {
      get: function () {
        return null;
      },
      set: function () {},
    },
    textContent: {
      get: function () {
        var e = [];
        return (vn(this, e), e.join(""));
      },
      set: function (e) {
        if ((this.removeChildren(), e !== null && e !== void 0 && e !== ""))
          this._appendChild(this.ownerDocument.createTextNode(e));
      },
    },
    innerText: {
      get: function () {
        var e = [];
        return (
          vn(this, e),
          e
            .join("")
            .replace(/[ \t\n\f\r]+/g, " ")
            .trim()
        );
      },
      set: function (e) {
        if ((this.removeChildren(), e !== null && e !== void 0 && e !== ""))
          this._appendChild(this.ownerDocument.createTextNode(e));
      },
    },
    innerHTML: {
      get: function () {
        return this.serialize();
      },
      set: Y.nyi,
    },
    outerHTML: {
      get: function () {
        return zl.serializeOne(this, { nodeType: 0 });
      },
      set: function (e) {
        var ownerDocument = this.ownerDocument,
          parentNode = this.parentNode;
        if (parentNode === null) return;
        if (parentNode.nodeType === ke.DOCUMENT_NODE) Y.NoModificationAllowedError();
        if (parentNode.nodeType === ke.DOCUMENT_FRAGMENT_NODE)
          parentNode = parentNode.ownerDocument.createElement("body");
        var mozHTMLParser = ownerDocument.implementation.mozHTMLParser(ownerDocument._address, parentNode);
        (mozHTMLParser.parse(e === null ? "" : String(e), !0),
          this.replaceWith(mozHTMLParser._asDocumentFragment()));
      },
    },
    _insertAdjacent: {
      value: function (t, r) {
        var a = !1;
        switch (t) {
          case "beforebegin":
            a = !0;
          case "afterend":
            var parentNode = this.parentNode;
            if (parentNode === null) return null;
            return parentNode.insertBefore(r, a ? this : this.nextSibling);
          case "afterbegin":
            a = !0;
          case "beforeend":
            return this.insertBefore(r, a ? this.firstChild : null);
          default:
            return Y.SyntaxError();
        }
      },
    },
    insertAdjacentElement: {
      value: function (t, r) {
        if (r.nodeType !== ke.ELEMENT_NODE) throw TypeError("not an element");
        return ((t = Y.toASCIILowerCase(String(t))), this._insertAdjacent(t, r));
      },
    },
    insertAdjacentText: {
      value: function (t, r) {
        var textNode = this.ownerDocument.createTextNode(r);
        ((t = Y.toASCIILowerCase(String(t))), this._insertAdjacent(t, textNode));
      },
    },
    insertAdjacentHTML: {
      value: function (t, r) {
        ((t = Y.toASCIILowerCase(String(t))), (r = String(r)));
        var a;
        switch (t) {
          case "beforebegin":
          case "afterend":
            if (((a = this.parentNode), a === null || a.nodeType === ke.DOCUMENT_NODE))
              Y.NoModificationAllowedError();
            break;
          case "afterbegin":
          case "beforeend":
            a = this;
            break;
          default:
            Y.SyntaxError();
        }
        if (
          !(a instanceof xt) ||
          (a.ownerDocument.isHTML && a.localName === "html" && a.namespaceURI === NAMESPACE.HTML)
        )
          a = a.ownerDocument.createElementNS(NAMESPACE.HTML, "body");
        var mozHTMLParser = this.ownerDocument.implementation.mozHTMLParser(this.ownerDocument._address, a);
        (mozHTMLParser.parse(r, !0), this._insertAdjacent(t, mozHTMLParser._asDocumentFragment()));
      },
    },
    children: {
      get: function () {
        if (!this._children) this._children = new Rs(this);
        return this._children;
      },
    },
    attributes: {
      get: function () {
        if (!this._attributes) this._attributes = new yn(this);
        return this._attributes;
      },
    },
    firstElementChild: {
      get: function () {
        for (var firstChild = this.firstChild; firstChild !== null; firstChild = firstChild.nextSibling)
          if (firstChild.nodeType === ke.ELEMENT_NODE) return firstChild;
        return null;
      },
    },
    lastElementChild: {
      get: function () {
        for (var lastChild = this.lastChild; lastChild !== null; lastChild = lastChild.previousSibling)
          if (lastChild.nodeType === ke.ELEMENT_NODE) return lastChild;
        return null;
      },
    },
    childElementCount: {
      get: function () {
        return this.children.length;
      },
    },
    nextElement: {
      value: function (e) {
        if (!e) e = this.ownerDocument.documentElement;
        var firstElementChild = this.firstElementChild;
        if (!firstElementChild) {
          if (this === e) return null;
          firstElementChild = this.nextElementSibling;
        }
        if (firstElementChild) return firstElementChild;
        for (
          var parentElement = this.parentElement;
          parentElement && parentElement !== e;
          parentElement = parentElement.parentElement
        )
          if (((firstElementChild = parentElement.nextElementSibling), firstElementChild))
            return firstElementChild;
        return null;
      },
    },
    getElementsByTagName: {
      value: function (t) {
        var r;
        if (!t) return new En();
        if (t === "*")
          r = function () {
            return !0;
          };
        else if (this.isHTML) r = Yl(t);
        else r = Tn(t);
        return new aa(this, r);
      },
    },
    getElementsByTagNameNS: {
      value: function (t, r) {
        var a;
        if (t === "*" && r === "*")
          a = function () {
            return !0;
          };
        else if (t === "*") a = Tn(r);
        else if (r === "*") a = Ql(t);
        else a = $l(t, r);
        return new aa(this, a);
      },
    },
    getElementsByClassName: {
      value: function (t) {
        if (((t = String(t).trim()), t === "")) {
          var r = new En();
          return r;
        }
        return ((t = t.split(/[ \t\r\n\f]+/)), new aa(this, Zl(t)));
      },
    },
    getElementsByName: {
      value: function (t) {
        return new aa(this, Jl(String(t)));
      },
    },
    clone: {
      value: function () {
        var t;
        if (this.namespaceURI !== NAMESPACE.HTML || this.prefix || !this.ownerDocument.isHTML)
          t = this.ownerDocument.createElementNS(
            this.namespaceURI,
            this.prefix !== null ? this.prefix + ":" + this.localName : this.localName,
          );
        else t = this.ownerDocument.createElement(this.localName);
        for (var r = 0, a = this._attrKeys.length; r < a; r++) {
          var s = this._attrKeys[r],
            c = this._attrsByLName[s],
            cloneNode = c.cloneNode();
          (cloneNode._setOwnerElement(t), (t._attrsByLName[s] = cloneNode), t._addQName(cloneNode));
        }
        return ((t._attrKeys = this._attrKeys.concat()), t);
      },
    },
    isEqual: {
      value: function (t) {
        if (
          this.localName !== t.localName ||
          this.namespaceURI !== t.namespaceURI ||
          this.prefix !== t.prefix ||
          this._numattrs !== t._numattrs
        )
          return !1;
        for (var r = 0, _numattrs = this._numattrs; r < _numattrs; r++) {
          var _attr = this._attr(r);
          if (!t.hasAttributeNS(_attr.namespaceURI, _attr.localName)) return !1;
          if (t.getAttributeNS(_attr.namespaceURI, _attr.localName) !== _attr.value) return !1;
        }
        return !0;
      },
    },
    _lookupNamespacePrefix: {
      value: function (t, r) {
        if (
          this.namespaceURI &&
          this.namespaceURI === t &&
          this.prefix !== null &&
          r.lookupNamespaceURI(this.prefix) === t
        )
          return this.prefix;
        for (var a = 0, _numattrs = this._numattrs; a < _numattrs; a++) {
          var _attr = this._attr(a);
          if (_attr.prefix === "xmlns" && _attr.value === t && r.lookupNamespaceURI(_attr.localName) === t)
            return _attr.localName;
        }
        var parentElement = this.parentElement;
        return parentElement ? parentElement._lookupNamespacePrefix(t, r) : null;
      },
    },
    lookupNamespaceURI: {
      value: function (t) {
        if (t === "" || t === void 0) t = null;
        if (this.namespaceURI !== null && this.prefix === t) return this.namespaceURI;
        for (var r = 0, _numattrs = this._numattrs; r < _numattrs; r++) {
          var _attr = this._attr(r);
          if (_attr.namespaceURI === NAMESPACE.XMLNS) {
            if (
              (_attr.prefix === "xmlns" && _attr.localName === t) ||
              (t === null && _attr.prefix === null && _attr.localName === "xmlns")
            )
              return _attr.value || null;
          }
        }
        var parentElement = this.parentElement;
        return parentElement ? parentElement.lookupNamespaceURI(t) : null;
      },
    },
    getAttribute: {
      value: function (t) {
        var attributeNode = this.getAttributeNode(t);
        return attributeNode ? attributeNode.value : null;
      },
    },
    getAttributeNS: {
      value: function (t, r) {
        var attributeNodeNS = this.getAttributeNodeNS(t, r);
        return attributeNodeNS ? attributeNodeNS.value : null;
      },
    },
    getAttributeNode: {
      value: function (t) {
        if (((t = String(t)), /[A-Z]/.test(t) && this.isHTML)) t = Y.toASCIILowerCase(t);
        var r = this._attrsByQName[t];
        if (!r) return null;
        if (Array.isArray(r)) r = r[0];
        return r;
      },
    },
    getAttributeNodeNS: {
      value: function (t, r) {
        ((t = t === void 0 || t === null ? "" : String(t)), (r = String(r)));
        var a = this._attrsByLName[t + "|" + r];
        return a ? a : null;
      },
    },
    hasAttribute: {
      value: function (t) {
        if (((t = String(t)), /[A-Z]/.test(t) && this.isHTML)) t = Y.toASCIILowerCase(t);
        return this._attrsByQName[t] !== void 0;
      },
    },
    hasAttributeNS: {
      value: function (t, r) {
        ((t = t === void 0 || t === null ? "" : String(t)), (r = String(r)));
        var a = t + "|" + r;
        return this._attrsByLName[a] !== void 0;
      },
    },
    hasAttributes: {
      value: function () {
        return this._numattrs > 0;
      },
    },
    toggleAttribute: {
      value: function (t, r) {
        if (((t = String(t)), !bn.isValidName(t))) Y.InvalidCharacterError();
        if (/[A-Z]/.test(t) && this.isHTML) t = Y.toASCIILowerCase(t);
        var a = this._attrsByQName[t];
        if (a === void 0) {
          if (r === void 0 || r === !0) return (this._setAttribute(t, ""), !0);
          return !1;
        } else {
          if (r === void 0 || r === !1) return (this.removeAttribute(t), !1);
          return !0;
        }
      },
    },
    _setAttribute: {
      value: function (t, r) {
        var a = this._attrsByQName[t],
          s;
        if (!a) ((a = this._newattr(t)), (s = !0));
        else if (Array.isArray(a)) a = a[0];
        if (((a.value = r), this._attributes)) this._attributes[t] = a;
        if (s && this._newattrhook) this._newattrhook(t, r);
      },
    },
    setAttribute: {
      value: function (t, r) {
        if (((t = String(t)), !bn.isValidName(t))) Y.InvalidCharacterError();
        if (/[A-Z]/.test(t) && this.isHTML) t = Y.toASCIILowerCase(t);
        this._setAttribute(t, String(r));
      },
    },
    _setAttributeNS: {
      value: function (t, r, a) {
        var index = r.indexOf(":"),
          c,
          d;
        if (index < 0) ((c = null), (d = r));
        else ((c = r.substring(0, index)), (d = r.substring(index + 1)));
        if (t === "" || t === void 0) t = null;
        var g = (t === null ? "" : t) + "|" + d,
          m = this._attrsByLName[g],
          v;
        if (!m) {
          if (((m = new ur(this, d, c, t)), (v = !0), (this._attrsByLName[g] = m), this._attributes))
            this._attributes[this._attrKeys.length] = m;
          (this._attrKeys.push(g), this._addQName(m));
        }
        if (((m.value = a), v && this._newattrhook)) this._newattrhook(r, a);
      },
    },
    setAttributeNS: {
      value: function (t, r, a) {
        if (
          ((t = t === null || t === void 0 || t === "" ? null : String(t)),
          (r = String(r)),
          !bn.isValidQName(r))
        )
          Y.InvalidCharacterError();
        var index = r.indexOf(":"),
          c = index < 0 ? null : r.substring(0, index);
        if (
          (c !== null && t === null) ||
          (c === "xml" && t !== NAMESPACE.XML) ||
          ((r === "xmlns" || c === "xmlns") && t !== NAMESPACE.XMLNS) ||
          (t === NAMESPACE.XMLNS && !(r === "xmlns" || c === "xmlns"))
        )
          Y.NamespaceError();
        this._setAttributeNS(t, r, String(a));
      },
    },
    setAttributeNode: {
      value: function (t) {
        if (t.ownerElement !== null && t.ownerElement !== this) throw new Ht(Ht.INUSE_ATTRIBUTE_ERR);
        var r = null,
          a = this._attrsByQName[t.name];
        if (a) {
          if (!Array.isArray(a)) a = [a];
          if (
            a.some(function (s) {
              return s === t;
            })
          )
            return t;
          else if (t.ownerElement !== null) throw new Ht(Ht.INUSE_ATTRIBUTE_ERR);
          (a.forEach(function (s) {
            this.removeAttributeNode(s);
          }, this),
            (r = a[0]));
        }
        return (this.setAttributeNodeNS(t), r);
      },
    },
    setAttributeNodeNS: {
      value: function (t) {
        if (t.ownerElement !== null) throw new Ht(Ht.INUSE_ATTRIBUTE_ERR);
        var namespaceURI = t.namespaceURI,
          a = (namespaceURI === null ? "" : namespaceURI) + "|" + t.localName,
          s = this._attrsByLName[a];
        if (s) this.removeAttributeNode(s);
        if ((t._setOwnerElement(this), (this._attrsByLName[a] = t), this._attributes))
          this._attributes[this._attrKeys.length] = t;
        if ((this._attrKeys.push(a), this._addQName(t), this._newattrhook))
          this._newattrhook(t.name, t.value);
        return s || null;
      },
    },
    removeAttribute: {
      value: function (t) {
        if (((t = String(t)), /[A-Z]/.test(t) && this.isHTML)) t = Y.toASCIILowerCase(t);
        var r = this._attrsByQName[t];
        if (!r) return;
        if (Array.isArray(r))
          if (r.length > 2) r = r.shift();
          else ((this._attrsByQName[t] = r[1]), (r = r[0]));
        else this._attrsByQName[t] = void 0;
        var namespaceURI = r.namespaceURI,
          s = (namespaceURI === null ? "" : namespaceURI) + "|" + r.localName;
        this._attrsByLName[s] = void 0;
        var index = this._attrKeys.indexOf(s);
        if (this._attributes)
          (Array.prototype.splice.call(this._attributes, index, 1), (this._attributes[t] = void 0));
        this._attrKeys.splice(index, 1);
        var onchange = r.onchange;
        if ((r._setOwnerElement(null), onchange)) onchange.call(r, this, r.localName, r.value, null);
        if (this.rooted) this.ownerDocument.mutateRemoveAttr(r);
      },
    },
    removeAttributeNS: {
      value: function (t, r) {
        ((t = t === void 0 || t === null ? "" : String(t)), (r = String(r)));
        var a = t + "|" + r,
          s = this._attrsByLName[a];
        if (!s) return;
        this._attrsByLName[a] = void 0;
        var index = this._attrKeys.indexOf(a);
        if (this._attributes) Array.prototype.splice.call(this._attributes, index, 1);
        (this._attrKeys.splice(index, 1), this._removeQName(s));
        var onchange = s.onchange;
        if ((s._setOwnerElement(null), onchange)) onchange.call(s, this, s.localName, s.value, null);
        if (this.rooted) this.ownerDocument.mutateRemoveAttr(s);
      },
    },
    removeAttributeNode: {
      value: function (t) {
        var namespaceURI = t.namespaceURI,
          a = (namespaceURI === null ? "" : namespaceURI) + "|" + t.localName;
        if (this._attrsByLName[a] !== t) Y.NotFoundError();
        return (this.removeAttributeNS(namespaceURI, t.localName), t);
      },
    },
    getAttributeNames: {
      value: function () {
        var t = this;
        return this._attrKeys.map(function (_attrKey) {
          return t._attrsByLName[_attrKey].name;
        });
      },
    },
    _getattr: {
      value: function (t) {
        var r = this._attrsByQName[t];
        return r ? r.value : null;
      },
    },
    _setattr: {
      value: function (t, r) {
        var a = this._attrsByQName[t],
          s;
        if (!a) ((a = this._newattr(t)), (s = !0));
        if (((a.value = String(r)), this._attributes)) this._attributes[t] = a;
        if (s && this._newattrhook) this._newattrhook(t, r);
      },
    },
    _newattr: {
      value: function (t) {
        var r = new ur(this, t, null, null),
          a = "|" + t;
        if (((this._attrsByQName[t] = r), (this._attrsByLName[a] = r), this._attributes))
          this._attributes[this._attrKeys.length] = r;
        return (this._attrKeys.push(a), r);
      },
    },
    _addQName: {
      value: function (e) {
        var t = e.name,
          r = this._attrsByQName[t];
        if (!r) this._attrsByQName[t] = e;
        else if (Array.isArray(r)) r.push(e);
        else this._attrsByQName[t] = [r, e];
        if (this._attributes) this._attributes[t] = e;
      },
    },
    _removeQName: {
      value: function (e) {
        var t = e.name,
          r = this._attrsByQName[t];
        if (Array.isArray(r)) {
          var index = r.indexOf(e);
          if ((Y.assert(index !== -1), r.length === 2)) {
            if (((this._attrsByQName[t] = r[1 - index]), this._attributes))
              this._attributes[t] = this._attrsByQName[t];
          } else if ((r.splice(index, 1), this._attributes && this._attributes[t] === e))
            this._attributes[t] = r[0];
        } else if ((Y.assert(r === e), (this._attrsByQName[t] = void 0), this._attributes))
          this._attributes[t] = void 0;
      },
    },
    _numattrs: {
      get: function () {
        return this._attrKeys.length;
      },
    },
    _attr: {
      value: function (e) {
        return this._attrsByLName[this._attrKeys[e]];
      },
    },
    id: na.property({ name: "id" }),
    className: na.property({ name: "class" }),
    classList: {
      get: function () {
        var e = this;
        if (this._classList) return this._classList;
        var t = new Wl(
          function () {
            return e.className || "";
          },
          function (r) {
            e.className = r;
          },
        );
        return ((this._classList = t), t);
      },
      set: function (e) {
        this.className = e;
      },
    },
    matches: {
      value: function (e) {
        return _n.matches(this, e);
      },
    },
    closest: {
      value: function (e) {
        var t = this;
        do {
          if (t.matches && t.matches(e)) return t;
          t = t.parentElement || t.parentNode;
        } while (t !== null && t.nodeType === ke.ELEMENT_NODE);
        return null;
      },
    },
    querySelector: {
      value: function (e) {
        return _n(e, this)[0];
      },
    },
    querySelectorAll: {
      value: function (e) {
        var t = _n(e, this);
        return t.item ? t : new En(t);
      },
    },
  });
  Object.defineProperties(xt.prototype, Xl);
  Object.defineProperties(xt.prototype, Kl);
  na.registerChangeHandler(xt, "id", function (e, t, r, a) {
    if (e.rooted) {
      if (r) e.ownerDocument.delId(r, e);
      if (a) e.ownerDocument.addId(a, e);
    }
  });
  na.registerChangeHandler(xt, "class", function (e, t, r, a) {
    if (e._classList) e._classList._update();
  });
  function ur(e, t, r, a, s) {
    ((this.localName = t),
      (this.prefix = r === null || r === "" ? null : "" + r),
      (this.namespaceURI = a === null || a === "" ? null : "" + a),
      (this.data = s),
      this._setOwnerElement(e));
  }
  ur.prototype = Object.create(Object.prototype, {
    ownerElement: {
      get: function () {
        return this._ownerElement;
      },
    },
    _setOwnerElement: {
      value: function (t) {
        if (((this._ownerElement = t), this.prefix === null && this.namespaceURI === null && t))
          this.onchange = t._attributeChangeHandlers[this.localName];
        else this.onchange = null;
      },
    },
    name: {
      get: function () {
        return this.prefix ? this.prefix + ":" + this.localName : this.localName;
      },
    },
    specified: {
      get: function () {
        return !0;
      },
    },
    value: {
      get: function () {
        return this.data;
      },
      set: function (e) {
        var t = this.data;
        if (((e = e === void 0 ? "" : e + ""), e === t)) return;
        if (((this.data = e), this.ownerElement)) {
          if (this.onchange) this.onchange(this.ownerElement, this.localName, t, e);
          if (this.ownerElement.rooted) this.ownerElement.ownerDocument.mutateAttr(this, t);
        }
      },
    },
    cloneNode: {
      value: function (t) {
        return new ur(null, this.localName, this.prefix, this.namespaceURI, this.data);
      },
    },
    nodeType: {
      get: function () {
        return ke.ATTRIBUTE_NODE;
      },
    },
    nodeName: {
      get: function () {
        return this.name;
      },
    },
    nodeValue: {
      get: function () {
        return this.value;
      },
      set: function (e) {
        this.value = e;
      },
    },
    textContent: {
      get: function () {
        return this.value;
      },
      set: function (e) {
        if (e === null || e === void 0) e = "";
        this.value = e;
      },
    },
    innerText: {
      get: function () {
        return this.value;
      },
      set: function (e) {
        if (e === null || e === void 0) e = "";
        this.value = e;
      },
    },
  });
  xt._Attr = ur;
  function yn(e) {
    Ms.call(this, e);
    for (var key in e._attrsByQName) this[key] = e._attrsByQName[key];
    for (var r = 0; r < e._attrKeys.length; r++) this[r] = e._attrsByLName[e._attrKeys[r]];
  }
  yn.prototype = Object.create(Ms.prototype, {
    length: {
      get: function () {
        return this.element._attrKeys.length;
      },
      set: function () {},
    },
    item: {
      value: function (e) {
        if (((e = e >>> 0), e >= this.length)) return null;
        return this.element._attrsByLName[this.element._attrKeys[e]];
      },
    },
  });
  if (globalThis.Symbol?.iterator)
    yn.prototype[globalThis.Symbol.iterator] = function () {
      var e = 0,
        t = this.length,
        r = this;
      return {
        next: function () {
          if (e < t) return { value: r.item(e++) };
          return { done: !0 };
        },
      };
    };
  function Rs(e) {
    ((this.element = e), this.updateCache());
  }
  Rs.prototype = Object.create(Object.prototype, {
    length: {
      get: function () {
        return (this.updateCache(), this.childrenByNumber.length);
      },
    },
    item: {
      value: function (t) {
        return (this.updateCache(), this.childrenByNumber[t] || null);
      },
    },
    namedItem: {
      value: function (t) {
        return (this.updateCache(), this.childrenByName[t] || null);
      },
    },
    namedItems: {
      get: function () {
        return (this.updateCache(), this.childrenByName);
      },
    },
    updateCache: {
      value: function () {
        var t = /^(a|applet|area|embed|form|frame|frameset|iframe|img|object)$/;
        if (this.lastModTime !== this.element.lastModTime) {
          this.lastModTime = this.element.lastModTime;
          var r = (this.childrenByNumber && this.childrenByNumber.length) || 0;
          for (var a = 0; a < r; a++) this[a] = void 0;
          ((this.childrenByNumber = []), (this.childrenByName = Object.create(null)));
          for (
            var firstChild = this.element.firstChild;
            firstChild !== null;
            firstChild = firstChild.nextSibling
          )
            if (firstChild.nodeType === ke.ELEMENT_NODE) {
              ((this[this.childrenByNumber.length] = firstChild), this.childrenByNumber.push(firstChild));
              var attribute = firstChild.getAttribute("id");
              if (attribute && !this.childrenByName[attribute]) this.childrenByName[attribute] = firstChild;
              var attribute_2 = firstChild.getAttribute("name");
              if (
                attribute_2 &&
                this.element.namespaceURI === NAMESPACE.HTML &&
                t.test(this.element.localName) &&
                !this.childrenByName[attribute_2]
              )
                this.childrenByName[attribute] = firstChild;
            }
        }
      },
    },
  });
  function Tn(e) {
    return function (t) {
      return t.localName === e;
    };
  }
  function Yl(e) {
    var toASCIILowerCase = Y.toASCIILowerCase(e);
    if (toASCIILowerCase === e) return Tn(e);
    return function (r) {
      return r.isHTML ? r.localName === toASCIILowerCase : r.localName === e;
    };
  }
  function Ql(e) {
    return function (t) {
      return t.namespaceURI === e;
    };
  }
  function $l(e, t) {
    return function (r) {
      return r.namespaceURI === e && r.localName === t;
    };
  }
  function Zl(e) {
    return function (t) {
      return e.every(function (r) {
        return t.classList.contains(r);
      });
    };
  }
  function Jl(e) {
    return function (t) {
      if (t.namespaceURI !== NAMESPACE.HTML) return !1;
      return t.getAttribute("name") === e;
    };
  }
});

export { Ft };
