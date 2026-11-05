/**
 * @mixmark-io/domino/lib/Document.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";
import { require_NodeList } from "./NodeList.js";
import { require_ContainerNode } from "./ContainerNode.js";
import { require_Element } from "./Element.js";
import { require_Text } from "./Text.js";
import { require_Comment } from "./Comment.js";
import { require_Event } from "./Event.js";
import { require_DocumentFragment } from "./DocumentFragment.js";
import { require_ProcessingInstruction } from "./ProcessingInstruction.js";
import { require_DOMImplementation } from "./DOMImplementation.js";
import { require_TreeWalker } from "./TreeWalker.js";
import { require_NodeIterator } from "./NodeIterator.js";
import { require_NodeFilter } from "./NodeFilter.js";
import { require_URL } from "./URL.js";
import { require_select } from "./select.js";
import { require_events } from "./events.js";
import { require_xmlnames } from "./xmlnames.js";
import { require_htmlelts } from "./htmlelts.js";
import { require_svg } from "./svg.js";
import { require_utils } from "./utils.js";
import { require_MutationConstants } from "./MutationConstants.js";
import { require_config } from "./config.js";

//@ chunk-w04z664w.js:107912-120094 cjs-fingerprint
var require_Document = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Document;
  var Node = require_Node();
  var NodeList = require_NodeList();
  var ContainerNode = require_ContainerNode();
  var Element = require_Element();
  var Text = require_Text();
  var Comment = require_Comment();
  var EventModule = require_Event();
  var DocumentFragment = require_DocumentFragment();
  var ProcessingInstruction = require_ProcessingInstruction();
  var DOMImplementation = require_DOMImplementation();
  var TreeWalker = require_TreeWalker();
  var NodeIterator = require_NodeIterator();
  var NodeFilter = require_NodeFilter();
  var URLModule = require_URL();
  var select = require_select();
  var events = require_events();
  var xml = require_xmlnames();
  var html = require_htmlelts();
  var svg = require_svg();
  var utils = require_utils();
  var MUTATE = require_MutationConstants();
  var NAMESPACE = utils.NAMESPACE;
  var isApiWritable = require_config().isApiWritable;
  function Document(isHTML, address) {
    ContainerNode.call(this);
    this.nodeType = Node.DOCUMENT_NODE;
    this.isHTML = isHTML;
    this._address = address || "about:blank";
    this.readyState = "loading";
    this.implementation = new DOMImplementation(this);
    this.ownerDocument = null;
    this._contentType = isHTML ? "text/html" : "application/xml";
    this.doctype = null;
    this.documentElement = null;
    this._templateDocCache = null;
    this._nodeIterators = null;
    this._nid = 1;
    this._nextnid = 2;
    this._nodes = [null, this];
    this.byId = Object.create(null);
    this.modclock = 0;
  }
  var supportedEvents = {
    event: "Event",
    customevent: "CustomEvent",
    uievent: "UIEvent",
    mouseevent: "MouseEvent",
  };
  var replacementEvent = {
    events: "event",
    htmlevents: "event",
    mouseevents: "mouseevent",
    mutationevents: "mutationevent",
    uievents: "uievent",
  };
  var mirrorAttr = function (f, name, defaultValue) {
    return {
      get: function () {
        var o = f.call(this);
        if (o) return o[name];
        return defaultValue;
      },
      set: function (value) {
        var o = f.call(this);
        if (o) o[name] = value;
      },
    };
  };
  function validateAndExtract(namespace, qualifiedName) {
    var prefix;
    var localName;
    var pos;
    if (namespace === "") namespace = null;
    if (!xml.isValidQName(qualifiedName)) utils.InvalidCharacterError();
    prefix = null;
    localName = qualifiedName;
    pos = qualifiedName.indexOf(":");
    if (pos >= 0) {
      prefix = qualifiedName.substring(0, pos);
      localName = qualifiedName.substring(pos + 1);
    }
    if (prefix !== null && namespace === null) utils.NamespaceError();
    if (prefix === "xml" && namespace !== NAMESPACE.XML) utils.NamespaceError();
    if ((prefix === "xmlns" || qualifiedName === "xmlns") && namespace !== NAMESPACE.XMLNS)
      utils.NamespaceError();
    if (namespace === NAMESPACE.XMLNS && !(prefix === "xmlns" || qualifiedName === "xmlns"))
      utils.NamespaceError();
    return {
      namespace,
      prefix,
      localName,
    };
  }
  Document.prototype = Object.create(ContainerNode.prototype, {
    _setMutationHandler: {
      value: function (handler) {
        this.mutationHandler = handler;
      },
    },
    _dispatchRendererEvent: {
      value: function (targetNid, type, details) {
        var target = this._nodes[targetNid];
        if (!target) return;
        target._dispatchEvent(new EventModule(type, details), true);
      },
    },
    nodeName: {
      value: "#document",
    },
    nodeValue: {
      get: function () {
        return null;
      },
      set: function () {},
    },
    documentURI: {
      get: function () {
        return this._address;
      },
      set: utils.nyi,
    },
    compatMode: {
      get: function () {
        return this._quirks ? "BackCompat" : "CSS1Compat";
      },
    },
    createTextNode: {
      value: function (data) {
        return new Text(this, String(data));
      },
    },
    createComment: {
      value: function (data) {
        return new Comment(this, data);
      },
    },
    createDocumentFragment: {
      value: function () {
        return new DocumentFragment(this);
      },
    },
    createProcessingInstruction: {
      value: function (target, data) {
        if (!xml.isValidName(target) || data.indexOf("?>") !== -1) utils.InvalidCharacterError();
        return new ProcessingInstruction(this, target, data);
      },
    },
    createAttribute: {
      value: function (localName) {
        localName = String(localName);
        if (!xml.isValidName(localName)) utils.InvalidCharacterError();
        if (this.isHTML) localName = utils.toASCIILowerCase(localName);
        return new Element._Attr(null, localName, null, null, "");
      },
    },
    createAttributeNS: {
      value: function (namespace, qualifiedName) {
        namespace =
          namespace === null || namespace === undefined || namespace === "" ? null : String(namespace);
        qualifiedName = String(qualifiedName);
        var ve = validateAndExtract(namespace, qualifiedName);
        return new Element._Attr(null, ve.localName, ve.prefix, ve.namespace, "");
      },
    },
    createElement: {
      value: function (localName) {
        localName = String(localName);
        if (!xml.isValidName(localName)) utils.InvalidCharacterError();
        if (this.isHTML) {
          if (/[A-Z]/.test(localName)) localName = utils.toASCIILowerCase(localName);
          return html.createElement(this, localName, null);
        } else if (this.contentType === "application/xhtml+xml")
          return html.createElement(this, localName, null);
        else return new Element(this, localName, null, null);
      },
      writable: isApiWritable,
    },
    createElementNS: {
      value: function (namespace, qualifiedName) {
        namespace =
          namespace === null || namespace === undefined || namespace === "" ? null : String(namespace);
        qualifiedName = String(qualifiedName);
        var ve = validateAndExtract(namespace, qualifiedName);
        return this._createElementNS(ve.localName, ve.namespace, ve.prefix);
      },
      writable: isApiWritable,
    },
    _createElementNS: {
      value: function (localName, namespace, prefix) {
        if (namespace === NAMESPACE.HTML) return html.createElement(this, localName, prefix);
        else if (namespace === NAMESPACE.SVG) return svg.createElement(this, localName, prefix);
        return new Element(this, localName, namespace, prefix);
      },
    },
    createEvent: {
      value: function (interfaceName) {
        interfaceName = interfaceName.toLowerCase();
        var name = replacementEvent[interfaceName] || interfaceName;
        var constructor = events[supportedEvents[name]];
        if (constructor) {
          var e = new constructor();
          e._initialized = false;
          return e;
        } else utils.NotSupportedError();
      },
    },
    createTreeWalker: {
      value: function (root, whatToShow, filter) {
        if (!root) throw TypeError("root argument is required");
        if (!(root instanceof Node)) throw TypeError("root not a node");
        whatToShow = whatToShow === undefined ? NodeFilter.SHOW_ALL : +whatToShow;
        filter = filter === undefined ? null : filter;
        return new TreeWalker(root, whatToShow, filter);
      },
    },
    createNodeIterator: {
      value: function (root, whatToShow, filter) {
        if (!root) throw TypeError("root argument is required");
        if (!(root instanceof Node)) throw TypeError("root not a node");
        whatToShow = whatToShow === undefined ? NodeFilter.SHOW_ALL : +whatToShow;
        filter = filter === undefined ? null : filter;
        return new NodeIterator(root, whatToShow, filter);
      },
    },
    _attachNodeIterator: {
      value: function (ni) {
        if (!this._nodeIterators) this._nodeIterators = [];
        this._nodeIterators.push(ni);
      },
    },
    _detachNodeIterator: {
      value: function (ni) {
        var idx = this._nodeIterators.indexOf(ni);
        this._nodeIterators.splice(idx, 1);
      },
    },
    _preremoveNodeIterators: {
      value: function (toBeRemoved) {
        if (this._nodeIterators)
          this._nodeIterators.forEach(function (ni) {
            ni._preremove(toBeRemoved);
          });
      },
    },
    _updateDocTypeElement: {
      value: function () {
        this.doctype = this.documentElement = null;
        for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling)
          if (kid.nodeType === Node.DOCUMENT_TYPE_NODE) this.doctype = kid;
          else if (kid.nodeType === Node.ELEMENT_NODE) this.documentElement = kid;
      },
    },
    insertBefore: {
      value: function (child, refChild) {
        Node.prototype.insertBefore.call(this, child, refChild);
        this._updateDocTypeElement();
        return child;
      },
    },
    replaceChild: {
      value: function (node, child) {
        Node.prototype.replaceChild.call(this, node, child);
        this._updateDocTypeElement();
        return child;
      },
    },
    removeChild: {
      value: function (child) {
        Node.prototype.removeChild.call(this, child);
        this._updateDocTypeElement();
        return child;
      },
    },
    getElementById: {
      value: function (id) {
        var n = this.byId[id];
        if (!n) return null;
        if (n instanceof MultiId) return n.getFirst();
        return n;
      },
    },
    _hasMultipleElementsWithId: {
      value: function (id) {
        return this.byId[id] instanceof MultiId;
      },
    },
    getElementsByName: {
      value: Element.prototype.getElementsByName,
    },
    getElementsByTagName: {
      value: Element.prototype.getElementsByTagName,
    },
    getElementsByTagNameNS: {
      value: Element.prototype.getElementsByTagNameNS,
    },
    getElementsByClassName: {
      value: Element.prototype.getElementsByClassName,
    },
    adoptNode: {
      value: function (node) {
        if (node.nodeType === Node.DOCUMENT_NODE) utils.NotSupportedError();
        if (node.nodeType === Node.ATTRIBUTE_NODE) return node;
        if (node.parentNode) node.parentNode.removeChild(node);
        if (node.ownerDocument !== this) recursivelySetOwner(node, this);
        return node;
      },
    },
    importNode: {
      value: function (node, deep) {
        return this.adoptNode(node.cloneNode(deep));
      },
      writable: isApiWritable,
    },
    origin: {
      get: function () {
        return null;
      },
    },
    characterSet: {
      get: function () {
        return "UTF-8";
      },
    },
    contentType: {
      get: function () {
        return this._contentType;
      },
    },
    URL: {
      get: function () {
        return this._address;
      },
    },
    domain: {
      get: utils.nyi,
      set: utils.nyi,
    },
    referrer: {
      get: utils.nyi,
    },
    cookie: {
      get: utils.nyi,
      set: utils.nyi,
    },
    lastModified: {
      get: utils.nyi,
    },
    location: {
      get: function () {
        return this.defaultView ? this.defaultView.location : null;
      },
      set: utils.nyi,
    },
    _titleElement: {
      get: function () {
        return this.getElementsByTagName("title").item(0) || null;
      },
    },
    title: {
      get: function () {
        var elt = this._titleElement;
        var value = elt ? elt.textContent : "";
        return value.replace(/[ \t\n\r\f]+/g, " ").replace(/(^ )|( $)/g, "");
      },
      set: function (value) {
        var elt = this._titleElement;
        var head = this.head;
        if (!elt && !head) return;
        if (!elt) {
          elt = this.createElement("title");
          head.appendChild(elt);
        }
        elt.textContent = value;
      },
    },
    dir: mirrorAttr(
      function () {
        var htmlElement = this.documentElement;
        if (htmlElement && htmlElement.tagName === "HTML") return htmlElement;
      },
      "dir",
      "",
    ),
    fgColor: mirrorAttr(
      function () {
        return this.body;
      },
      "text",
      "",
    ),
    linkColor: mirrorAttr(
      function () {
        return this.body;
      },
      "link",
      "",
    ),
    vlinkColor: mirrorAttr(
      function () {
        return this.body;
      },
      "vLink",
      "",
    ),
    alinkColor: mirrorAttr(
      function () {
        return this.body;
      },
      "aLink",
      "",
    ),
    bgColor: mirrorAttr(
      function () {
        return this.body;
      },
      "bgColor",
      "",
    ),
    charset: {
      get: function () {
        return this.characterSet;
      },
    },
    inputEncoding: {
      get: function () {
        return this.characterSet;
      },
    },
    scrollingElement: {
      get: function () {
        return this._quirks ? this.body : this.documentElement;
      },
    },
    body: {
      get: function () {
        return namedHTMLChild(this.documentElement, "body");
      },
      set: utils.nyi,
    },
    head: {
      get: function () {
        return namedHTMLChild(this.documentElement, "head");
      },
    },
    images: {
      get: utils.nyi,
    },
    embeds: {
      get: utils.nyi,
    },
    plugins: {
      get: utils.nyi,
    },
    links: {
      get: utils.nyi,
    },
    forms: {
      get: utils.nyi,
    },
    scripts: {
      get: utils.nyi,
    },
    applets: {
      get: function () {
        return [];
      },
    },
    activeElement: {
      get: function () {
        return null;
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
        return this.serialize();
      },
      set: utils.nyi,
    },
    write: {
      value: function (args) {
        if (!this.isHTML) utils.InvalidStateError();
        if (!this._parser) return;
        if (!this._parser);
        var s = arguments.join("");
        this._parser.parse(s);
      },
    },
    writeln: {
      value: function (args) {
        this.write(
          Array.prototype.join.call(arguments, "") +
            `
`,
        );
      },
    },
    open: {
      value: function () {
        this.documentElement = null;
      },
    },
    close: {
      value: function () {
        this.readyState = "interactive";
        this._dispatchEvent(new EventModule("readystatechange"), true);
        this._dispatchEvent(new EventModule("DOMContentLoaded"), true);
        this.readyState = "complete";
        this._dispatchEvent(new EventModule("readystatechange"), true);
        if (this.defaultView) this.defaultView._dispatchEvent(new EventModule("load"), true);
      },
    },
    clone: {
      value: function () {
        var d = new Document(this.isHTML, this._address);
        d._quirks = this._quirks;
        d._contentType = this._contentType;
        return d;
      },
    },
    cloneNode: {
      value: function (deep) {
        var clone = Node.prototype.cloneNode.call(this, false);
        if (deep)
          for (var kid = this.firstChild; kid !== null; kid = kid.nextSibling)
            clone._appendChild(clone.importNode(kid, true));
        clone._updateDocTypeElement();
        return clone;
      },
    },
    isEqual: {
      value: function (n) {
        return true;
      },
    },
    mutateValue: {
      value: function (node) {
        if (this.mutationHandler)
          this.mutationHandler({
            type: MUTATE.VALUE,
            target: node,
            data: node.data,
          });
      },
    },
    mutateAttr: {
      value: function (attr, oldval) {
        if (this.mutationHandler)
          this.mutationHandler({
            type: MUTATE.ATTR,
            target: attr.ownerElement,
            attr,
          });
      },
    },
    mutateRemoveAttr: {
      value: function (attr) {
        if (this.mutationHandler)
          this.mutationHandler({
            type: MUTATE.REMOVE_ATTR,
            target: attr.ownerElement,
            attr,
          });
      },
    },
    mutateRemove: {
      value: function (node) {
        if (this.mutationHandler)
          this.mutationHandler({
            type: MUTATE.REMOVE,
            target: node.parentNode,
            node,
          });
        recursivelyUproot(node);
      },
    },
    mutateInsert: {
      value: function (node) {
        recursivelyRoot(node);
        if (this.mutationHandler)
          this.mutationHandler({
            type: MUTATE.INSERT,
            target: node.parentNode,
            node,
          });
      },
    },
    mutateMove: {
      value: function (node) {
        if (this.mutationHandler)
          this.mutationHandler({
            type: MUTATE.MOVE,
            target: node,
          });
      },
    },
    addId: {
      value: function (id, n) {
        var val = this.byId[id];
        if (!val) this.byId[id] = n;
        else {
          if (!(val instanceof MultiId)) {
            val = new MultiId(val);
            this.byId[id] = val;
          }
          val.add(n);
        }
      },
    },
    delId: {
      value: function (id, n) {
        var val = this.byId[id];
        utils.assert(val);
        if (val instanceof MultiId) {
          val.del(n);
          if (val.length === 1) this.byId[id] = val.downgrade();
        } else this.byId[id] = undefined;
      },
    },
    _resolve: {
      value: function (href) {
        return new URLModule(this._documentBaseURL).resolve(href);
      },
    },
    _documentBaseURL: {
      get: function () {
        var url = this._address;
        if (url === "about:blank") url = "/";
        var base = this.querySelector("base[href]");
        if (base) return new URLModule(url).resolve(base.getAttribute("href"));
        return url;
      },
    },
    _templateDoc: {
      get: function () {
        if (!this._templateDocCache) {
          var newDoc = new Document(this.isHTML, this._address);
          this._templateDocCache = newDoc._templateDocCache = newDoc;
        }
        return this._templateDocCache;
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
  var eventHandlerTypes = [
    "abort",
    "canplay",
    "canplaythrough",
    "change",
    "click",
    "contextmenu",
    "cuechange",
    "dblclick",
    "drag",
    "dragend",
    "dragenter",
    "dragleave",
    "dragover",
    "dragstart",
    "drop",
    "durationchange",
    "emptied",
    "ended",
    "input",
    "invalid",
    "keydown",
    "keypress",
    "keyup",
    "loadeddata",
    "loadedmetadata",
    "loadstart",
    "mousedown",
    "mousemove",
    "mouseout",
    "mouseover",
    "mouseup",
    "mousewheel",
    "pause",
    "play",
    "playing",
    "progress",
    "ratechange",
    "readystatechange",
    "reset",
    "seeked",
    "seeking",
    "select",
    "show",
    "stalled",
    "submit",
    "suspend",
    "timeupdate",
    "volumechange",
    "waiting",
    "blur",
    "error",
    "focus",
    "load",
    "scroll",
  ];
  eventHandlerTypes.forEach(function (type) {
    Object.defineProperty(Document.prototype, "on" + type, {
      get: function () {
        return this._getEventHandler(type);
      },
      set: function (v) {
        this._setEventHandler(type, v);
      },
    });
  });
  function namedHTMLChild(parent, name) {
    if (parent && parent.isHTML) {
      for (var kid = parent.firstChild; kid !== null; kid = kid.nextSibling)
        if (
          kid.nodeType === Node.ELEMENT_NODE &&
          kid.localName === name &&
          kid.namespaceURI === NAMESPACE.HTML
        )
          return kid;
    }
    return null;
  }
  function root(n) {
    n._nid = n.ownerDocument._nextnid++;
    n.ownerDocument._nodes[n._nid] = n;
    if (n.nodeType === Node.ELEMENT_NODE) {
      var id = n.getAttribute("id");
      if (id) n.ownerDocument.addId(id, n);
      if (n._roothook) n._roothook();
    }
  }
  function uproot(n) {
    if (n.nodeType === Node.ELEMENT_NODE) {
      var id = n.getAttribute("id");
      if (id) n.ownerDocument.delId(id, n);
    }
    n.ownerDocument._nodes[n._nid] = undefined;
    n._nid = undefined;
  }
  function recursivelyRoot(node) {
    root(node);
    if (node.nodeType === Node.ELEMENT_NODE)
      for (var kid = node.firstChild; kid !== null; kid = kid.nextSibling) recursivelyRoot(kid);
  }
  function recursivelyUproot(node) {
    uproot(node);
    for (var kid = node.firstChild; kid !== null; kid = kid.nextSibling) recursivelyUproot(kid);
  }
  function recursivelySetOwner(node, owner) {
    node.ownerDocument = owner;
    node._lastModTime = undefined;
    if (Object.prototype.hasOwnProperty.call(node, "_tagName")) node._tagName = undefined;
    for (var kid = node.firstChild; kid !== null; kid = kid.nextSibling) recursivelySetOwner(kid, owner);
  }
  function MultiId(node) {
    this.nodes = Object.create(null);
    this.nodes[node._nid] = node;
    this.length = 1;
    this.firstNode = undefined;
  }
  MultiId.prototype.add = function (node) {
    if (!this.nodes[node._nid]) {
      this.nodes[node._nid] = node;
      this.length++;
      this.firstNode = undefined;
    }
  };
  MultiId.prototype.del = function (node) {
    if (this.nodes[node._nid]) {
      delete this.nodes[node._nid];
      this.length--;
      this.firstNode = undefined;
    }
  };
  MultiId.prototype.getFirst = function () {
    if (!this.firstNode) {
      var nid;
      for (nid in this.nodes)
        if (
          this.firstNode === undefined ||
          this.firstNode.compareDocumentPosition(this.nodes[nid]) & Node.DOCUMENT_POSITION_PRECEDING
        )
          this.firstNode = this.nodes[nid];
    }
    return this.firstNode;
  };
  MultiId.prototype.downgrade = function () {
    if (this.length === 1) {
      var nid;
      for (nid in this.nodes) return this.nodes[nid];
    }
    return this;
  };
});
export { require_Document };
