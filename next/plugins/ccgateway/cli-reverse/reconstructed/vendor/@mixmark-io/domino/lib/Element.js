/**
 * @mixmark-io/domino/lib/Element.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_xmlnames } from "./xmlnames.js";
import { require_utils } from "./utils.js";
import { require_attributes } from "./attributes.js";
import { require_Node } from "./Node.js";
import { require_NodeList } from "./NodeList.js";
import { require_NodeUtils } from "./NodeUtils.js";
import { require_FilteredElementList } from "./FilteredElementList.js";
import { require_DOMException } from "./DOMException.js";
import { require_DOMTokenList } from "./DOMTokenList.js";
import { require_select } from "./select.js";
import { require_ContainerNode } from "./ContainerNode.js";
import { require_ChildNode } from "./ChildNode.js";
import { require_NonDocumentTypeChildNode } from "./NonDocumentTypeChildNode.js";
import { require_NamedNodeMap } from "./NamedNodeMap.js";

//@ chunk-vwj6ccer.js:45299-62055 cjs-fingerprint
var require_Element = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Element;
  var xml = require_xmlnames();
  var utils = require_utils();
  var NAMESPACE = utils.NAMESPACE;
  var attributes = require_attributes();
  var Node = require_Node();
  var NodeList = require_NodeList();
  var NodeUtils = require_NodeUtils();
  var FilteredElementList = require_FilteredElementList();
  var DOMException = require_DOMException();
  var DOMTokenList = require_DOMTokenList();
  var select = require_select();
  var ContainerNode = require_ContainerNode();
  var ChildNode = require_ChildNode();
  var NonDocumentTypeChildNode = require_NonDocumentTypeChildNode();
  var NamedNodeMap = require_NamedNodeMap();
  var uppercaseCache = Object.create(null);
  function Element(doc, localName, namespaceURI, prefix) {
    ContainerNode.call(this);
    this.nodeType = Node.ELEMENT_NODE;
    this.ownerDocument = doc;
    this.localName = localName;
    this.namespaceURI = namespaceURI;
    this.prefix = prefix;
    this._tagName = undefined;
    this._attrsByQName = Object.create(null);
    this._attrsByLName = Object.create(null);
    this._attrKeys = [];
  }
  function recursiveGetText(node, a_2) {
    if (node.nodeType === Node.TEXT_NODE) a_2.push(node._data);
    else for (var i = 0, n = node.childNodes.length; i < n; i++) recursiveGetText(node.childNodes[i], a_2);
  }
  Element.prototype = Object.create(ContainerNode.prototype, {
    isHTML: {
      get: function () {
        return this.namespaceURI === NAMESPACE.HTML && this.ownerDocument.isHTML;
      },
    },
    tagName: {
      get: function () {
        if (this._tagName === undefined) {
          var tn;
          if (this.prefix === null) tn = this.localName;
          else tn = this.prefix + ":" + this.localName;
          if (this.isHTML) {
            var up = uppercaseCache[tn];
            if (!up) uppercaseCache[tn] = up = utils.toASCIIUpperCase(tn);
            tn = up;
          }
          this._tagName = tn;
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
        var strings = [];
        recursiveGetText(this, strings);
        return strings.join("");
      },
      set: function (newtext) {
        this.removeChildren();
        if (newtext !== null && newtext !== undefined && newtext !== "")
          this._appendChild(this.ownerDocument.createTextNode(newtext));
      },
    },
    innerText: {
      get: function () {
        var strings = [];
        recursiveGetText(this, strings);
        return strings
          .join("")
          .replace(/[ \t\n\f\r]+/g, " ")
          .trim();
      },
      set: function (newtext) {
        this.removeChildren();
        if (newtext !== null && newtext !== undefined && newtext !== "")
          this._appendChild(this.ownerDocument.createTextNode(newtext));
      },
    },
    innerHTML: {
      get: function () {
        return this.serialize();
      },
      set: utils.nyi,
    },
    outerHTML: {
      get: function () {
        return NodeUtils.serializeOne(this, {
          nodeType: 0,
        });
      },
      set: function (v) {
        var ownerDocument = this.ownerDocument;
        var parent = this.parentNode;
        if (parent === null) return;
        if (parent.nodeType === Node.DOCUMENT_NODE) utils.NoModificationAllowedError();
        if (parent.nodeType === Node.DOCUMENT_FRAGMENT_NODE)
          parent = parent.ownerDocument.createElement("body");
        var parser = ownerDocument.implementation.mozHTMLParser(ownerDocument._address, parent);
        parser.parse(v === null ? "" : String(v), true);
        this.replaceWith(parser._asDocumentFragment());
      },
    },
    _insertAdjacent: {
      value: function (position, node) {
        var first = false;
        switch (position) {
          case "beforebegin":
            first = true;
          case "afterend":
            var parent = this.parentNode;
            if (parent === null) return null;
            return parent.insertBefore(node, first ? this : this.nextSibling);
          case "afterbegin":
            first = true;
          case "beforeend":
            return this.insertBefore(node, first ? this.firstChild : null);
          default:
            return utils.SyntaxError();
        }
      },
    },
    insertAdjacentElement: {
      value: function (position, element) {
        if (element.nodeType !== Node.ELEMENT_NODE) throw TypeError("not an element");
        position = utils.toASCIILowerCase(String(position));
        return this._insertAdjacent(position, element);
      },
    },
    insertAdjacentText: {
      value: function (position, data) {
        var textNode = this.ownerDocument.createTextNode(data);
        position = utils.toASCIILowerCase(String(position));
        this._insertAdjacent(position, textNode);
      },
    },
    insertAdjacentHTML: {
      value: function (position, text) {
        position = utils.toASCIILowerCase(String(position));
        text = String(text);
        var context;
        switch (position) {
          case "beforebegin":
          case "afterend":
            context = this.parentNode;
            if (context === null || context.nodeType === Node.DOCUMENT_NODE)
              utils.NoModificationAllowedError();
            break;
          case "afterbegin":
          case "beforeend":
            context = this;
            break;
          default:
            utils.SyntaxError();
        }
        if (
          !(context instanceof Element) ||
          (context.ownerDocument.isHTML &&
            context.localName === "html" &&
            context.namespaceURI === NAMESPACE.HTML)
        )
          context = context.ownerDocument.createElementNS(NAMESPACE.HTML, "body");
        var parser = this.ownerDocument.implementation.mozHTMLParser(this.ownerDocument._address, context);
        parser.parse(text, true);
        this._insertAdjacent(position, parser._asDocumentFragment());
      },
    },
    children: {
      get: function () {
        if (!this._children) this._children = new ChildrenCollection(this);
        return this._children;
      },
    },
    attributes: {
      get: function () {
        if (!this._attributes) this._attributes = new AttributesArray(this);
        return this._attributes;
      },
    },
    firstElementChild: {
      get: function () {
        for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling)
          if (kid.nodeType === Node.ELEMENT_NODE) return kid;
        return null;
      },
    },
    lastElementChild: {
      get: function () {
        for (var kid = this.lastChild; kid !== null; kid = kid.previousSibling)
          if (kid.nodeType === Node.ELEMENT_NODE) return kid;
        return null;
      },
    },
    childElementCount: {
      get: function () {
        return this.children.length;
      },
    },
    nextElement: {
      value: function (root) {
        if (!root) root = this.ownerDocument.documentElement;
        var next = this.firstElementChild;
        if (!next) {
          if (this === root) return null;
          next = this.nextElementSibling;
        }
        if (next) return next;
        for (var parent = this.parentElement; parent && parent !== root; parent = parent.parentElement) {
          next = parent.nextElementSibling;
          if (next) return next;
        }
        return null;
      },
    },
    getElementsByTagName: {
      value: function (lname) {
        var filter;
        if (!lname) return new NodeList();
        if (lname === "*")
          filter = function () {
            return true;
          };
        else if (this.isHTML) filter = htmlLocalNameElementFilter(lname);
        else filter = localNameElementFilter(lname);
        return new FilteredElementList(this, filter);
      },
    },
    getElementsByTagNameNS: {
      value: function (ns, lname) {
        var filter;
        if (ns === "*" && lname === "*")
          filter = function () {
            return true;
          };
        else if (ns === "*") filter = localNameElementFilter(lname);
        else if (lname === "*") filter = namespaceElementFilter(ns);
        else filter = namespaceLocalNameElementFilter(ns, lname);
        return new FilteredElementList(this, filter);
      },
    },
    getElementsByClassName: {
      value: function (names) {
        names = String(names).trim();
        if (names === "") {
          var result = new NodeList();
          return result;
        }
        names = names.split(/[ \t\r\n\f]+/);
        return new FilteredElementList(this, classNamesElementFilter(names));
      },
    },
    getElementsByName: {
      value: function (name) {
        return new FilteredElementList(this, elementNameFilter(String(name)));
      },
    },
    clone: {
      value: function () {
        var e;
        if (this.namespaceURI !== NAMESPACE.HTML || this.prefix || !this.ownerDocument.isHTML)
          e = this.ownerDocument.createElementNS(
            this.namespaceURI,
            this.prefix !== null ? this.prefix + ":" + this.localName : this.localName,
          );
        else e = this.ownerDocument.createElement(this.localName);
        for (var i = 0, n = this._attrKeys.length; i < n; i++) {
          var lname = this._attrKeys[i];
          var a = this._attrsByLName[lname];
          var b = a.cloneNode();
          b._setOwnerElement(e);
          e._attrsByLName[lname] = b;
          e._addQName(b);
        }
        e._attrKeys = this._attrKeys.concat();
        return e;
      },
    },
    isEqual: {
      value: function (that) {
        if (
          this.localName !== that.localName ||
          this.namespaceURI !== that.namespaceURI ||
          this.prefix !== that.prefix ||
          this._numattrs !== that._numattrs
        )
          return false;
        for (var i = 0, n = this._numattrs; i < n; i++) {
          var a = this._attr(i);
          if (!that.hasAttributeNS(a.namespaceURI, a.localName)) return false;
          if (that.getAttributeNS(a.namespaceURI, a.localName) !== a.value) return false;
        }
        return true;
      },
    },
    _lookupNamespacePrefix: {
      value: function (ns, originalElement) {
        if (
          this.namespaceURI &&
          this.namespaceURI === ns &&
          this.prefix !== null &&
          originalElement.lookupNamespaceURI(this.prefix) === ns
        )
          return this.prefix;
        for (var i = 0, n = this._numattrs; i < n; i++) {
          var a = this._attr(i);
          if (
            a.prefix === "xmlns" &&
            a.value === ns &&
            originalElement.lookupNamespaceURI(a.localName) === ns
          )
            return a.localName;
        }
        var parent = this.parentElement;
        return parent ? parent._lookupNamespacePrefix(ns, originalElement) : null;
      },
    },
    lookupNamespaceURI: {
      value: function (prefix) {
        if (prefix === "" || prefix === undefined) prefix = null;
        if (this.namespaceURI !== null && this.prefix === prefix) return this.namespaceURI;
        for (var i = 0, n = this._numattrs; i < n; i++) {
          var a = this._attr(i);
          if (a.namespaceURI === NAMESPACE.XMLNS) {
            if (
              (a.prefix === "xmlns" && a.localName === prefix) ||
              (prefix === null && a.prefix === null && a.localName === "xmlns")
            )
              return a.value || null;
          }
        }
        var parent = this.parentElement;
        return parent ? parent.lookupNamespaceURI(prefix) : null;
      },
    },
    getAttribute: {
      value: function (qname) {
        var attr = this.getAttributeNode(qname);
        return attr ? attr.value : null;
      },
    },
    getAttributeNS: {
      value: function (ns, lname) {
        var attr = this.getAttributeNodeNS(ns, lname);
        return attr ? attr.value : null;
      },
    },
    getAttributeNode: {
      value: function (qname) {
        qname = String(qname);
        if (/[A-Z]/.test(qname) && this.isHTML) qname = utils.toASCIILowerCase(qname);
        var attr = this._attrsByQName[qname];
        if (!attr) return null;
        if (Array.isArray(attr)) attr = attr[0];
        return attr;
      },
    },
    getAttributeNodeNS: {
      value: function (ns, lname) {
        ns = ns === undefined || ns === null ? "" : String(ns);
        lname = String(lname);
        var attr = this._attrsByLName[ns + "|" + lname];
        return attr ? attr : null;
      },
    },
    hasAttribute: {
      value: function (qname) {
        qname = String(qname);
        if (/[A-Z]/.test(qname) && this.isHTML) qname = utils.toASCIILowerCase(qname);
        return this._attrsByQName[qname] !== undefined;
      },
    },
    hasAttributeNS: {
      value: function (ns, lname) {
        ns = ns === undefined || ns === null ? "" : String(ns);
        lname = String(lname);
        var key = ns + "|" + lname;
        return this._attrsByLName[key] !== undefined;
      },
    },
    hasAttributes: {
      value: function () {
        return this._numattrs > 0;
      },
    },
    toggleAttribute: {
      value: function (qname, force) {
        qname = String(qname);
        if (!xml.isValidName(qname)) utils.InvalidCharacterError();
        if (/[A-Z]/.test(qname) && this.isHTML) qname = utils.toASCIILowerCase(qname);
        var attrNode = this._attrsByQName[qname];
        if (attrNode === undefined) {
          if (force === undefined || force === true) {
            this._setAttribute(qname, "");
            return true;
          }
          return false;
        } else {
          if (force === undefined || force === false) {
            this.removeAttribute(qname);
            return false;
          }
          return true;
        }
      },
    },
    _setAttribute: {
      value: function (qname, value) {
        var attr = this._attrsByQName[qname];
        var isnew;
        if (!attr) {
          attr = this._newattr(qname);
          isnew = true;
        } else if (Array.isArray(attr)) attr = attr[0];
        attr.value = value;
        if (this._attributes) this._attributes[qname] = attr;
        if (isnew && this._newattrhook) this._newattrhook(qname, value);
      },
    },
    setAttribute: {
      value: function (qname, value) {
        qname = String(qname);
        if (!xml.isValidName(qname)) utils.InvalidCharacterError();
        if (/[A-Z]/.test(qname) && this.isHTML) qname = utils.toASCIILowerCase(qname);
        this._setAttribute(qname, String(value));
      },
    },
    _setAttributeNS: {
      value: function (ns, qname, value) {
        var pos = qname.indexOf(":");
        var prefix;
        var lname;
        if (pos < 0) {
          prefix = null;
          lname = qname;
        } else {
          prefix = qname.substring(0, pos);
          lname = qname.substring(pos + 1);
        }
        if (ns === "" || ns === undefined) ns = null;
        var key = (ns === null ? "" : ns) + "|" + lname;
        var attr = this._attrsByLName[key];
        var isnew;
        if (!attr) {
          attr = new Attr(this, lname, prefix, ns);
          isnew = true;
          this._attrsByLName[key] = attr;
          if (this._attributes) this._attributes[this._attrKeys.length] = attr;
          this._attrKeys.push(key);
          this._addQName(attr);
        }
        attr.value = value;
        if (isnew && this._newattrhook) this._newattrhook(qname, value);
      },
    },
    setAttributeNS: {
      value: function (ns, qname, value) {
        ns = ns === null || ns === undefined || ns === "" ? null : String(ns);
        qname = String(qname);
        if (!xml.isValidQName(qname)) utils.InvalidCharacterError();
        var pos = qname.indexOf(":");
        var prefix = pos < 0 ? null : qname.substring(0, pos);
        if (
          (prefix !== null && ns === null) ||
          (prefix === "xml" && ns !== NAMESPACE.XML) ||
          ((qname === "xmlns" || prefix === "xmlns") && ns !== NAMESPACE.XMLNS) ||
          (ns === NAMESPACE.XMLNS && !(qname === "xmlns" || prefix === "xmlns"))
        )
          utils.NamespaceError();
        this._setAttributeNS(ns, qname, String(value));
      },
    },
    setAttributeNode: {
      value: function (attr) {
        if (attr.ownerElement !== null && attr.ownerElement !== this)
          throw new DOMException(DOMException.INUSE_ATTRIBUTE_ERR);
        var result = null;
        var oldAttrs = this._attrsByQName[attr.name];
        if (oldAttrs) {
          if (!Array.isArray(oldAttrs)) oldAttrs = [oldAttrs];
          if (
            oldAttrs.some(function (a) {
              return a === attr;
            })
          )
            return attr;
          else if (attr.ownerElement !== null) throw new DOMException(DOMException.INUSE_ATTRIBUTE_ERR);
          oldAttrs.forEach(function (a) {
            this.removeAttributeNode(a);
          }, this);
          result = oldAttrs[0];
        }
        this.setAttributeNodeNS(attr);
        return result;
      },
    },
    setAttributeNodeNS: {
      value: function (attr) {
        if (attr.ownerElement !== null) throw new DOMException(DOMException.INUSE_ATTRIBUTE_ERR);
        var ns = attr.namespaceURI;
        var key = (ns === null ? "" : ns) + "|" + attr.localName;
        var oldAttr = this._attrsByLName[key];
        if (oldAttr) this.removeAttributeNode(oldAttr);
        attr._setOwnerElement(this);
        this._attrsByLName[key] = attr;
        if (this._attributes) this._attributes[this._attrKeys.length] = attr;
        this._attrKeys.push(key);
        this._addQName(attr);
        if (this._newattrhook) this._newattrhook(attr.name, attr.value);
        return oldAttr || null;
      },
    },
    removeAttribute: {
      value: function (qname) {
        qname = String(qname);
        if (/[A-Z]/.test(qname) && this.isHTML) qname = utils.toASCIILowerCase(qname);
        var attr = this._attrsByQName[qname];
        if (!attr) return;
        if (Array.isArray(attr)) {
          if (attr.length > 2) attr = attr.shift();
          else {
            this._attrsByQName[qname] = attr[1];
            attr = attr[0];
          }
        } else this._attrsByQName[qname] = undefined;
        var ns = attr.namespaceURI;
        var key = (ns === null ? "" : ns) + "|" + attr.localName;
        this._attrsByLName[key] = undefined;
        var i = this._attrKeys.indexOf(key);
        if (this._attributes) {
          Array.prototype.splice.call(this._attributes, i, 1);
          this._attributes[qname] = undefined;
        }
        this._attrKeys.splice(i, 1);
        var onchange = attr.onchange;
        attr._setOwnerElement(null);
        if (onchange) onchange.call(attr, this, attr.localName, attr.value, null);
        if (this.rooted) this.ownerDocument.mutateRemoveAttr(attr);
      },
    },
    removeAttributeNS: {
      value: function (ns, lname) {
        ns = ns === undefined || ns === null ? "" : String(ns);
        lname = String(lname);
        var key = ns + "|" + lname;
        var attr = this._attrsByLName[key];
        if (!attr) return;
        this._attrsByLName[key] = undefined;
        var i = this._attrKeys.indexOf(key);
        if (this._attributes) Array.prototype.splice.call(this._attributes, i, 1);
        this._attrKeys.splice(i, 1);
        this._removeQName(attr);
        var onchange = attr.onchange;
        attr._setOwnerElement(null);
        if (onchange) onchange.call(attr, this, attr.localName, attr.value, null);
        if (this.rooted) this.ownerDocument.mutateRemoveAttr(attr);
      },
    },
    removeAttributeNode: {
      value: function (attr) {
        var ns = attr.namespaceURI;
        var key = (ns === null ? "" : ns) + "|" + attr.localName;
        if (this._attrsByLName[key] !== attr) utils.NotFoundError();
        this.removeAttributeNS(ns, attr.localName);
        return attr;
      },
    },
    getAttributeNames: {
      value: function () {
        var elt = this;
        return this._attrKeys.map(function (key) {
          return elt._attrsByLName[key].name;
        });
      },
    },
    _getattr: {
      value: function (qname) {
        var attr = this._attrsByQName[qname];
        return attr ? attr.value : null;
      },
    },
    _setattr: {
      value: function (qname, value) {
        var attr = this._attrsByQName[qname];
        var isnew;
        if (!attr) {
          attr = this._newattr(qname);
          isnew = true;
        }
        attr.value = String(value);
        if (this._attributes) this._attributes[qname] = attr;
        if (isnew && this._newattrhook) this._newattrhook(qname, value);
      },
    },
    _newattr: {
      value: function (qname) {
        var attr = new Attr(this, qname, null, null);
        var key = "|" + qname;
        this._attrsByQName[qname] = attr;
        this._attrsByLName[key] = attr;
        if (this._attributes) this._attributes[this._attrKeys.length] = attr;
        this._attrKeys.push(key);
        return attr;
      },
    },
    _addQName: {
      value: function (attr) {
        var qname = attr.name;
        var existing = this._attrsByQName[qname];
        if (!existing) this._attrsByQName[qname] = attr;
        else if (Array.isArray(existing)) existing.push(attr);
        else this._attrsByQName[qname] = [existing, attr];
        if (this._attributes) this._attributes[qname] = attr;
      },
    },
    _removeQName: {
      value: function (attr) {
        var qname = attr.name;
        var target = this._attrsByQName[qname];
        if (Array.isArray(target)) {
          var idx = target.indexOf(attr);
          utils.assert(idx !== -1);
          if (target.length === 2) {
            this._attrsByQName[qname] = target[1 - idx];
            if (this._attributes) this._attributes[qname] = this._attrsByQName[qname];
          } else {
            target.splice(idx, 1);
            if (this._attributes && this._attributes[qname] === attr) this._attributes[qname] = target[0];
          }
        } else {
          utils.assert(target === attr);
          this._attrsByQName[qname] = undefined;
          if (this._attributes) this._attributes[qname] = undefined;
        }
      },
    },
    _numattrs: {
      get: function () {
        return this._attrKeys.length;
      },
    },
    _attr: {
      value: function (n) {
        return this._attrsByLName[this._attrKeys[n]];
      },
    },
    id: attributes.property({
      name: "id",
    }),
    className: attributes.property({
      name: "class",
    }),
    classList: {
      get: function () {
        var elementRef = this;
        if (this._classList) return this._classList;
        var dtlist = new DOMTokenList(
          function () {
            return elementRef.className || "";
          },
          function (v) {
            elementRef.className = v;
          },
        );
        this._classList = dtlist;
        return dtlist;
      },
      set: function (v) {
        this.className = v;
      },
    },
    matches: {
      value: function (selector) {
        return select.matches(this, selector);
      },
    },
    closest: {
      value: function (selector) {
        var el = this;
        do {
          if (el.matches && el.matches(selector)) return el;
          el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === Node.ELEMENT_NODE);
        return null;
      },
    },
    querySelector: {
      value: function (selector) {
        return select(selector, this)[0];
      },
    },
    querySelectorAll: {
      value: function (selector) {
        var nodes = select(selector, this);
        return nodes.item ? nodes : new NodeList(nodes);
      },
    },
  });
  Object.defineProperties(Element.prototype, ChildNode);
  Object.defineProperties(Element.prototype, NonDocumentTypeChildNode);
  attributes.registerChangeHandler(Element, "id", function (element, lname, oldval, newval) {
    if (element.rooted) {
      if (oldval) element.ownerDocument.delId(oldval, element);
      if (newval) element.ownerDocument.addId(newval, element);
    }
  });
  attributes.registerChangeHandler(Element, "class", function (element, lname, oldval, newval) {
    if (element._classList) element._classList._update();
  });
  function Attr(elt, lname, prefix, namespace, value) {
    this.localName = lname;
    this.prefix = prefix === null || prefix === "" ? null : "" + prefix;
    this.namespaceURI = namespace === null || namespace === "" ? null : "" + namespace;
    this.data = value;
    this._setOwnerElement(elt);
  }
  Attr.prototype = Object.create(Object.prototype, {
    ownerElement: {
      get: function () {
        return this._ownerElement;
      },
    },
    _setOwnerElement: {
      value: function (elt) {
        this._ownerElement = elt;
        if (this.prefix === null && this.namespaceURI === null && elt)
          this.onchange = elt._attributeChangeHandlers[this.localName];
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
        return true;
      },
    },
    value: {
      get: function () {
        return this.data;
      },
      set: function (value) {
        var oldval = this.data;
        value = value === undefined ? "" : value + "";
        if (value === oldval) return;
        this.data = value;
        if (this.ownerElement) {
          if (this.onchange) this.onchange(this.ownerElement, this.localName, oldval, value);
          if (this.ownerElement.rooted) this.ownerElement.ownerDocument.mutateAttr(this, oldval);
        }
      },
    },
    cloneNode: {
      value: function (deep) {
        return new Attr(null, this.localName, this.prefix, this.namespaceURI, this.data);
      },
    },
    nodeType: {
      get: function () {
        return Node.ATTRIBUTE_NODE;
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
      set: function (v) {
        this.value = v;
      },
    },
    textContent: {
      get: function () {
        return this.value;
      },
      set: function (v) {
        if (v === null || v === undefined) v = "";
        this.value = v;
      },
    },
    innerText: {
      get: function () {
        return this.value;
      },
      set: function (v) {
        if (v === null || v === undefined) v = "";
        this.value = v;
      },
    },
  });
  Element._Attr = Attr;
  function AttributesArray(elt) {
    NamedNodeMap.call(this, elt);
    for (var name in elt._attrsByQName) this[name] = elt._attrsByQName[name];
    for (var i = 0; i < elt._attrKeys.length; i++) this[i] = elt._attrsByLName[elt._attrKeys[i]];
  }
  AttributesArray.prototype = Object.create(NamedNodeMap.prototype, {
    length: {
      get: function () {
        return this.element._attrKeys.length;
      },
      set: function () {},
    },
    item: {
      value: function (n) {
        n = n >>> 0;
        if (n >= this.length) return null;
        return this.element._attrsByLName[this.element._attrKeys[n]];
      },
    },
  });
  if (globalThis.Symbol?.iterator)
    AttributesArray.prototype[globalThis.Symbol.iterator] = function () {
      var i = 0;
      var n = this.length;
      var arrayRef = this;
      return {
        next: function () {
          if (i < n)
            return {
              value: arrayRef.item(i++),
            };
          return {
            done: true,
          };
        },
      };
    };
  function ChildrenCollection(element) {
    this.element = element;
    this.updateCache();
  }
  ChildrenCollection.prototype = Object.create(Object.prototype, {
    length: {
      get: function () {
        this.updateCache();
        return this.childrenByNumber.length;
      },
    },
    item: {
      value: function (n) {
        this.updateCache();
        return this.childrenByNumber[n] || null;
      },
    },
    namedItem: {
      value: function (name) {
        this.updateCache();
        return this.childrenByName[name] || null;
      },
    },
    namedItems: {
      get: function () {
        this.updateCache();
        return this.childrenByName;
      },
    },
    updateCache: {
      value: function () {
        var namedElts = /^(a|applet|area|embed|form|frame|frameset|iframe|img|object)$/;
        if (this.lastModTime !== this.element.lastModTime) {
          this.lastModTime = this.element.lastModTime;
          var n = (this.childrenByNumber && this.childrenByNumber.length) || 0;
          for (var i = 0; i < n; i++) this[i] = undefined;
          this.childrenByNumber = [];
          this.childrenByName = Object.create(null);
          for (var c_2 = this.element.firstChild; c_2 !== null; c_2 = c_2.nextSibling)
            if (c_2.nodeType === Node.ELEMENT_NODE) {
              this[this.childrenByNumber.length] = c_2;
              this.childrenByNumber.push(c_2);
              var id = c_2.getAttribute("id");
              if (id && !this.childrenByName[id]) this.childrenByName[id] = c_2;
              var name = c_2.getAttribute("name");
              if (
                name &&
                this.element.namespaceURI === NAMESPACE.HTML &&
                namedElts.test(this.element.localName) &&
                !this.childrenByName[name]
              )
                this.childrenByName[id] = c_2;
            }
        }
      },
    },
  });
  function localNameElementFilter(lname) {
    return function (e) {
      return e.localName === lname;
    };
  }
  function htmlLocalNameElementFilter(lname) {
    var lclname = utils.toASCIILowerCase(lname);
    if (lclname === lname) return localNameElementFilter(lname);
    return function (e) {
      return e.isHTML ? e.localName === lclname : e.localName === lname;
    };
  }
  function namespaceElementFilter(ns) {
    return function (e) {
      return e.namespaceURI === ns;
    };
  }
  function namespaceLocalNameElementFilter(ns, lname) {
    return function (e) {
      return e.namespaceURI === ns && e.localName === lname;
    };
  }
  function classNamesElementFilter(names) {
    return function (e) {
      return names.every(function (n) {
        return e.classList.contains(n);
      });
    };
  }
  function elementNameFilter(name) {
    return function (e) {
      if (e.namespaceURI !== NAMESPACE.HTML) return false;
      return e.getAttribute("name") === name;
    };
  }
});
export { require_Element };
