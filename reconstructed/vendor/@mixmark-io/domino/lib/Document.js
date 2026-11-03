/**
 * @mixmark-io/domino/lib/Document.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";
import { yt } from "./NodeList.js";
import { Qr } from "./ContainerNode.js";
import { Ft } from "./Element.js";
import { Sn } from "./Text.js";
import { Cn } from "./Comment.js";
import { Lt } from "./Event.js";
import { kn } from "./DocumentFragment.js";
import { Mn } from "./ProcessingInstruction.js";
import { Er } from "./DOMImplementation.js";
import { u0 } from "./TreeWalker.js";
import { p0 } from "./NodeIterator.js";
import { hr } from "./NodeFilter.js";
import { ca } from "./URL.js";
import { ta } from "./select.js";
import { Un } from "./events.js";
import { $r } from "./xmlnames.js";
import { la } from "./htmlelts.js";
import { Xn } from "./svg.js";
import { ee } from "./utils.js";
import { U0 } from "./MutationConstants.js";
import { Xr } from "./config.js";

//@ chunk-vwj6ccer.js:107912-120094 cjs-fingerprint
var fa = x(function (Wd, $0) {
  $0.exports = br;
  var he = xe(),
    kx = yt(),
    X0 = Qr(),
    ft = Ft(),
    Lx = Sn(),
    Mx = Cn(),
    gr = Lt(),
    Rx = kn(),
    Ix = Mn(),
    Ox = Er(),
    qx = u0(),
    Hx = p0(),
    V0 = hr(),
    j0 = ca(),
    G0 = ta(),
    Fx = Un(),
    xa = $r(),
    Kn = la(),
    Bx = Xn(),
    B = ee(),
    Ut = U0(),
    NAMESPACE = B.NAMESPACE,
    isApiWritable = Xr().isApiWritable;
  function br(e, t) {
    (X0.call(this),
      (this.nodeType = he.DOCUMENT_NODE),
      (this.isHTML = e),
      (this._address = t || "about:blank"),
      (this.readyState = "loading"),
      (this.implementation = new Ox(this)),
      (this.ownerDocument = null),
      (this._contentType = e ? "text/html" : "application/xml"),
      (this.doctype = null),
      (this.documentElement = null),
      (this._templateDocCache = null),
      (this._nodeIterators = null),
      (this._nid = 1),
      (this._nextnid = 2),
      (this._nodes = [null, this]),
      (this.byId = Object.create(null)),
      (this.modclock = 0));
  }
  var Px = { event: "Event", customevent: "CustomEvent", uievent: "UIEvent", mouseevent: "MouseEvent" },
    Ux = {
      events: "event",
      htmlevents: "event",
      mouseevents: "mouseevent",
      mutationevents: "mutationevent",
      uievents: "uievent",
    },
    Vt = function (e, t, r) {
      return {
        get: function () {
          var a = e.call(this);
          if (a) return a[t];
          return r;
        },
        set: function (a) {
          var s = e.call(this);
          if (s) s[t] = a;
        },
      };
    };
  function z0(e, t) {
    var r, a, s;
    if (e === "") e = null;
    if (!xa.isValidQName(t)) B.InvalidCharacterError();
    if (((r = null), (a = t), (s = t.indexOf(":")), s >= 0))
      ((r = t.substring(0, s)), (a = t.substring(s + 1)));
    if (r !== null && e === null) B.NamespaceError();
    if (r === "xml" && e !== NAMESPACE.XML) B.NamespaceError();
    if ((r === "xmlns" || t === "xmlns") && e !== NAMESPACE.XMLNS) B.NamespaceError();
    if (e === NAMESPACE.XMLNS && !(r === "xmlns" || t === "xmlns")) B.NamespaceError();
    return { namespace: e, prefix: r, localName: a };
  }
  br.prototype = Object.create(X0.prototype, {
    _setMutationHandler: {
      value: function (e) {
        this.mutationHandler = e;
      },
    },
    _dispatchRendererEvent: {
      value: function (e, t, r) {
        var a = this._nodes[e];
        if (!a) return;
        a._dispatchEvent(new gr(t, r), !0);
      },
    },
    nodeName: { value: "#document" },
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
      set: B.nyi,
    },
    compatMode: {
      get: function () {
        return this._quirks ? "BackCompat" : "CSS1Compat";
      },
    },
    createTextNode: {
      value: function (e) {
        return new Lx(this, String(e));
      },
    },
    createComment: {
      value: function (e) {
        return new Mx(this, e);
      },
    },
    createDocumentFragment: {
      value: function () {
        return new Rx(this);
      },
    },
    createProcessingInstruction: {
      value: function (e, t) {
        if (!xa.isValidName(e) || t.indexOf("?>") !== -1) B.InvalidCharacterError();
        return new Ix(this, e, t);
      },
    },
    createAttribute: {
      value: function (e) {
        if (((e = String(e)), !xa.isValidName(e))) B.InvalidCharacterError();
        if (this.isHTML) e = B.toASCIILowerCase(e);
        return new ft._Attr(null, e, null, null, "");
      },
    },
    createAttributeNS: {
      value: function (e, t) {
        ((e = e === null || e === void 0 || e === "" ? null : String(e)), (t = String(t)));
        var r = z0(e, t);
        return new ft._Attr(null, r.localName, r.prefix, r.namespace, "");
      },
    },
    createElement: {
      value: function (e) {
        if (((e = String(e)), !xa.isValidName(e))) B.InvalidCharacterError();
        if (this.isHTML) {
          if (/[A-Z]/.test(e)) e = B.toASCIILowerCase(e);
          return Kn.createElement(this, e, null);
        } else if (this.contentType === "application/xhtml+xml") return Kn.createElement(this, e, null);
        else return new ft(this, e, null, null);
      },
      writable: isApiWritable,
    },
    createElementNS: {
      value: function (e, t) {
        ((e = e === null || e === void 0 || e === "" ? null : String(e)), (t = String(t)));
        var r = z0(e, t);
        return this._createElementNS(r.localName, r.namespace, r.prefix);
      },
      writable: isApiWritable,
    },
    _createElementNS: {
      value: function (e, t, r) {
        if (t === NAMESPACE.HTML) return Kn.createElement(this, e, r);
        else if (t === NAMESPACE.SVG) return Bx.createElement(this, e, r);
        return new ft(this, e, t, r);
      },
    },
    createEvent: {
      value: function (t) {
        t = t.toLowerCase();
        var r = Ux[t] || t,
          a = Fx[Px[r]];
        if (a) {
          var s = new a();
          return ((s._initialized = !1), s);
        } else B.NotSupportedError();
      },
    },
    createTreeWalker: {
      value: function (e, t, r) {
        if (!e) throw TypeError("root argument is required");
        if (!(e instanceof he)) throw TypeError("root not a node");
        return ((t = t === void 0 ? V0.SHOW_ALL : +t), (r = r === void 0 ? null : r), new qx(e, t, r));
      },
    },
    createNodeIterator: {
      value: function (e, t, r) {
        if (!e) throw TypeError("root argument is required");
        if (!(e instanceof he)) throw TypeError("root not a node");
        return ((t = t === void 0 ? V0.SHOW_ALL : +t), (r = r === void 0 ? null : r), new Hx(e, t, r));
      },
    },
    _attachNodeIterator: {
      value: function (e) {
        if (!this._nodeIterators) this._nodeIterators = [];
        this._nodeIterators.push(e);
      },
    },
    _detachNodeIterator: {
      value: function (e) {
        var index = this._nodeIterators.indexOf(e);
        this._nodeIterators.splice(index, 1);
      },
    },
    _preremoveNodeIterators: {
      value: function (e) {
        if (this._nodeIterators)
          this._nodeIterators.forEach(function (_nodeIterator) {
            _nodeIterator._preremove(e);
          });
      },
    },
    _updateDocTypeElement: {
      value: function () {
        this.doctype = this.documentElement = null;
        for (var firstChild = this.firstChild; firstChild !== null; firstChild = firstChild.nextSibling)
          if (firstChild.nodeType === he.DOCUMENT_TYPE_NODE) this.doctype = firstChild;
          else if (firstChild.nodeType === he.ELEMENT_NODE) this.documentElement = firstChild;
      },
    },
    insertBefore: {
      value: function (t, r) {
        return (he.prototype.insertBefore.call(this, t, r), this._updateDocTypeElement(), t);
      },
    },
    replaceChild: {
      value: function (t, r) {
        return (he.prototype.replaceChild.call(this, t, r), this._updateDocTypeElement(), r);
      },
    },
    removeChild: {
      value: function (t) {
        return (he.prototype.removeChild.call(this, t), this._updateDocTypeElement(), t);
      },
    },
    getElementById: {
      value: function (e) {
        var t = this.byId[e];
        if (!t) return null;
        if (t instanceof Ke) return t.getFirst();
        return t;
      },
    },
    _hasMultipleElementsWithId: {
      value: function (e) {
        return this.byId[e] instanceof Ke;
      },
    },
    getElementsByName: { value: ft.prototype.getElementsByName },
    getElementsByTagName: { value: ft.prototype.getElementsByTagName },
    getElementsByTagNameNS: { value: ft.prototype.getElementsByTagNameNS },
    getElementsByClassName: { value: ft.prototype.getElementsByClassName },
    adoptNode: {
      value: function (t) {
        if (t.nodeType === he.DOCUMENT_NODE) B.NotSupportedError();
        if (t.nodeType === he.ATTRIBUTE_NODE) return t;
        if (t.parentNode) t.parentNode.removeChild(t);
        if (t.ownerDocument !== this) Q0(t, this);
        return t;
      },
    },
    importNode: {
      value: function (t, r) {
        return this.adoptNode(t.cloneNode(r));
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
    domain: { get: B.nyi, set: B.nyi },
    referrer: { get: B.nyi },
    cookie: { get: B.nyi, set: B.nyi },
    lastModified: { get: B.nyi },
    location: {
      get: function () {
        return this.defaultView ? this.defaultView.location : null;
      },
      set: B.nyi,
    },
    _titleElement: {
      get: function () {
        return this.getElementsByTagName("title").item(0) || null;
      },
    },
    title: {
      get: function () {
        var _titleElement = this._titleElement,
          t = _titleElement ? _titleElement.textContent : "";
        return t.replace(/[ \t\n\r\f]+/g, " ").replace(/(^ )|( $)/g, "");
      },
      set: function (e) {
        var _titleElement = this._titleElement,
          head = this.head;
        if (!_titleElement && !head) return;
        if (!_titleElement) ((_titleElement = this.createElement("title")), head.appendChild(_titleElement));
        _titleElement.textContent = e;
      },
    },
    dir: Vt(
      function () {
        var documentElement = this.documentElement;
        if (documentElement && documentElement.tagName === "HTML") return documentElement;
      },
      "dir",
      "",
    ),
    fgColor: Vt(
      function () {
        return this.body;
      },
      "text",
      "",
    ),
    linkColor: Vt(
      function () {
        return this.body;
      },
      "link",
      "",
    ),
    vlinkColor: Vt(
      function () {
        return this.body;
      },
      "vLink",
      "",
    ),
    alinkColor: Vt(
      function () {
        return this.body;
      },
      "aLink",
      "",
    ),
    bgColor: Vt(
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
        return W0(this.documentElement, "body");
      },
      set: B.nyi,
    },
    head: {
      get: function () {
        return W0(this.documentElement, "head");
      },
    },
    images: { get: B.nyi },
    embeds: { get: B.nyi },
    plugins: { get: B.nyi },
    links: { get: B.nyi },
    forms: { get: B.nyi },
    scripts: { get: B.nyi },
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
      set: B.nyi,
    },
    outerHTML: {
      get: function () {
        return this.serialize();
      },
      set: B.nyi,
    },
    write: {
      value: function (e) {
        if (!this.isHTML) B.InvalidStateError();
        if (!this._parser) return;
        if (!this._parser);
        var joined = arguments.join("");
        this._parser.parse(joined);
      },
    },
    writeln: {
      value: function (t) {
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
        if (
          ((this.readyState = "interactive"),
          this._dispatchEvent(new gr("readystatechange"), !0),
          this._dispatchEvent(new gr("DOMContentLoaded"), !0),
          (this.readyState = "complete"),
          this._dispatchEvent(new gr("readystatechange"), !0),
          this.defaultView)
        )
          this.defaultView._dispatchEvent(new gr("load"), !0);
      },
    },
    clone: {
      value: function () {
        var t = new br(this.isHTML, this._address);
        return ((t._quirks = this._quirks), (t._contentType = this._contentType), t);
      },
    },
    cloneNode: {
      value: function (t) {
        var r = he.prototype.cloneNode.call(this, !1);
        if (t)
          for (var firstChild = this.firstChild; firstChild !== null; firstChild = firstChild.nextSibling)
            r._appendChild(r.importNode(firstChild, !0));
        return (r._updateDocTypeElement(), r);
      },
    },
    isEqual: {
      value: function (t) {
        return !0;
      },
    },
    mutateValue: {
      value: function (e) {
        if (this.mutationHandler) this.mutationHandler({ type: Ut.VALUE, target: e, data: e.data });
      },
    },
    mutateAttr: {
      value: function (e, t) {
        if (this.mutationHandler) this.mutationHandler({ type: Ut.ATTR, target: e.ownerElement, attr: e });
      },
    },
    mutateRemoveAttr: {
      value: function (e) {
        if (this.mutationHandler)
          this.mutationHandler({ type: Ut.REMOVE_ATTR, target: e.ownerElement, attr: e });
      },
    },
    mutateRemove: {
      value: function (e) {
        if (this.mutationHandler) this.mutationHandler({ type: Ut.REMOVE, target: e.parentNode, node: e });
        Y0(e);
      },
    },
    mutateInsert: {
      value: function (e) {
        if ((K0(e), this.mutationHandler))
          this.mutationHandler({ type: Ut.INSERT, target: e.parentNode, node: e });
      },
    },
    mutateMove: {
      value: function (e) {
        if (this.mutationHandler) this.mutationHandler({ type: Ut.MOVE, target: e });
      },
    },
    addId: {
      value: function (t, r) {
        var a = this.byId[t];
        if (!a) this.byId[t] = r;
        else {
          if (!(a instanceof Ke)) ((a = new Ke(a)), (this.byId[t] = a));
          a.add(r);
        }
      },
    },
    delId: {
      value: function (t, r) {
        var a = this.byId[t];
        if ((B.assert(a), a instanceof Ke)) {
          if ((a.del(r), a.length === 1)) this.byId[t] = a.downgrade();
        } else this.byId[t] = void 0;
      },
    },
    _resolve: {
      value: function (e) {
        return new j0(this._documentBaseURL).resolve(e);
      },
    },
    _documentBaseURL: {
      get: function () {
        var _address = this._address;
        if (_address === "about:blank") _address = "/";
        var querySelector = this.querySelector("base[href]");
        if (querySelector) return new j0(_address).resolve(querySelector.getAttribute("href"));
        return _address;
      },
    },
    _templateDoc: {
      get: function () {
        if (!this._templateDocCache) {
          var e = new br(this.isHTML, this._address);
          this._templateDocCache = e._templateDocCache = e;
        }
        return this._templateDocCache;
      },
    },
    querySelector: {
      value: function (e) {
        return G0(e, this)[0];
      },
    },
    querySelectorAll: {
      value: function (e) {
        var t = G0(e, this);
        return t.item ? t : new kx(t);
      },
    },
  });
  var Vx = [
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
  Vx.forEach(function (e) {
    Object.defineProperty(br.prototype, "on" + e, {
      get: function () {
        return this._getEventHandler(e);
      },
      set: function (t) {
        this._setEventHandler(e, t);
      },
    });
  });
  function W0(e, t) {
    if (e && e.isHTML) {
      for (var firstChild = e.firstChild; firstChild !== null; firstChild = firstChild.nextSibling)
        if (
          firstChild.nodeType === he.ELEMENT_NODE &&
          firstChild.localName === t &&
          firstChild.namespaceURI === NAMESPACE.HTML
        )
          return firstChild;
    }
    return null;
  }
  function jx(e) {
    if (
      ((e._nid = e.ownerDocument._nextnid++),
      (e.ownerDocument._nodes[e._nid] = e),
      e.nodeType === he.ELEMENT_NODE)
    ) {
      var attribute = e.getAttribute("id");
      if (attribute) e.ownerDocument.addId(attribute, e);
      if (e._roothook) e._roothook();
    }
  }
  function Gx(e) {
    if (e.nodeType === he.ELEMENT_NODE) {
      var attribute = e.getAttribute("id");
      if (attribute) e.ownerDocument.delId(attribute, e);
    }
    ((e.ownerDocument._nodes[e._nid] = void 0), (e._nid = void 0));
  }
  function K0(e) {
    if ((jx(e), e.nodeType === he.ELEMENT_NODE))
      for (var firstChild = e.firstChild; firstChild !== null; firstChild = firstChild.nextSibling)
        K0(firstChild);
  }
  function Y0(e) {
    Gx(e);
    for (var firstChild = e.firstChild; firstChild !== null; firstChild = firstChild.nextSibling)
      Y0(firstChild);
  }
  function Q0(e, t) {
    if (
      ((e.ownerDocument = t), (e._lastModTime = void 0), Object.prototype.hasOwnProperty.call(e, "_tagName"))
    )
      e._tagName = void 0;
    for (var firstChild = e.firstChild; firstChild !== null; firstChild = firstChild.nextSibling)
      Q0(firstChild, t);
  }
  function Ke(e) {
    ((this.nodes = Object.create(null)),
      (this.nodes[e._nid] = e),
      (this.length = 1),
      (this.firstNode = void 0));
  }
  Ke.prototype.add = function (e) {
    if (!this.nodes[e._nid]) ((this.nodes[e._nid] = e), this.length++, (this.firstNode = void 0));
  };
  Ke.prototype.del = function (e) {
    if (this.nodes[e._nid]) (delete this.nodes[e._nid], this.length--, (this.firstNode = void 0));
  };
  Ke.prototype.getFirst = function () {
    if (!this.firstNode) {
      var e;
      for (e in this.nodes)
        if (
          this.firstNode === void 0 ||
          this.firstNode.compareDocumentPosition(this.nodes[e]) & he.DOCUMENT_POSITION_PRECEDING
        )
          this.firstNode = this.nodes[e];
    }
    return this.firstNode;
  };
  Ke.prototype.downgrade = function () {
    if (this.length === 1) {
      var e;
      for (e in this.nodes) return this.nodes[e];
    }
    return this;
  };
});

export { fa };
