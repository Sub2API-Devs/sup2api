/**
 * @mixmark-io/domino/lib/htmlelts.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { xe } from "./Node.js";
import { Ft } from "./Element.js";
import { oa } from "./CSSStyleDeclaration.js";
import { ee } from "./utils.js";
import { Vn } from "./URLUtils.js";
import { jn } from "./defineElement.js";

//@ chunk-vwj6ccer.js:84376-106314 cjs-fingerprint
var la = x(function (Nx) {
  var Gn = xe(),
    I0 = Ft(),
    _x = oa(),
    Te = ee(),
    O0 = Vn(),
    vx = jn(),
    Xe = (Nx.elements = {}),
    create = Object.create(null);
  Nx.createElement = function (e, t, r) {
    var a = create[t] || yx;
    return new a(e, t, r);
  };
  function _(e) {
    return vx(e, y, Xe, create);
  }
  function te(e) {
    return {
      get: function () {
        var _getattr = this._getattr(e);
        if (_getattr === null) return "";
        var _resolve = this.doc._resolve(_getattr);
        return _resolve === null ? _getattr : _resolve;
      },
      set: function (t) {
        this._setattr(e, t);
      },
    };
  }
  function ua(e) {
    return {
      get: function () {
        var _getattr = this._getattr(e);
        if (_getattr === null) return null;
        if (_getattr.toLowerCase() === "use-credentials") return "use-credentials";
        return "anonymous";
      },
      set: function (t) {
        if (t === null || t === void 0) this.removeAttribute(e);
        else this._setattr(e, t);
      },
    };
  }
  var Pt = {
      type: [
        "",
        "no-referrer",
        "no-referrer-when-downgrade",
        "same-origin",
        "origin",
        "strict-origin",
        "origin-when-cross-origin",
        "strict-origin-when-cross-origin",
        "unsafe-url",
      ],
      missing: "",
    },
    Tx = { A: !0, LINK: !0, BUTTON: !0, INPUT: !0, SELECT: !0, TEXTAREA: !0, COMMAND: !0 },
    Le = function (e, t, r) {
      (y.call(this, e, t, r), (this._form = null));
    },
    y = (Nx.HTMLElement = _({
      superclass: I0,
      name: "HTMLElement",
      ctor: function (t, r, a) {
        I0.call(this, t, r, Te.NAMESPACE.HTML, a);
      },
      props: {
        dangerouslySetInnerHTML: {
          set: function (e) {
            this._innerHTML = e;
          },
        },
        innerHTML: {
          get: function () {
            return this.serialize();
          },
          set: function (e) {
            var mozHTMLParser = this.ownerDocument.implementation.mozHTMLParser(
              this.ownerDocument._address,
              this,
            );
            mozHTMLParser.parse(e === null ? "" : String(e), !0);
            var r = this instanceof create.template ? this.content : this;
            while (r.hasChildNodes()) r.removeChild(r.firstChild);
            r.appendChild(mozHTMLParser._asDocumentFragment());
          },
        },
        style: {
          get: function () {
            if (!this._style) this._style = new _x(this);
            return this._style;
          },
          set: function (e) {
            if (e === null || e === void 0) e = "";
            this._setattr("style", String(e));
          },
        },
        blur: { value: function () {} },
        focus: { value: function () {} },
        forceSpellCheck: { value: function () {} },
        click: {
          value: function () {
            if (this._click_in_progress) return;
            this._click_in_progress = !0;
            try {
              if (this._pre_click_activation_steps) this._pre_click_activation_steps();
              var event = this.ownerDocument.createEvent("MouseEvent");
              event.initMouseEvent(
                "click",
                !0,
                !0,
                this.ownerDocument.defaultView,
                1,
                0,
                0,
                0,
                0,
                !1,
                !1,
                !1,
                !1,
                0,
                null,
              );
              var dispatchEvent = this.dispatchEvent(event);
              if (dispatchEvent) {
                if (this._post_click_activation_steps) this._post_click_activation_steps(event);
              } else if (this._cancelled_activation_steps) this._cancelled_activation_steps();
            } finally {
              this._click_in_progress = !1;
            }
          },
        },
        submit: { value: Te.nyi },
      },
      attributes: {
        title: String,
        lang: String,
        dir: { type: ["ltr", "rtl", "auto"], missing: "" },
        draggable: { type: ["true", "false"], treatNullAsEmptyString: !0 },
        spellcheck: { type: ["true", "false"], missing: "" },
        enterKeyHint: { type: ["enter", "done", "go", "next", "previous", "search", "send"], missing: "" },
        autoCapitalize: { type: ["off", "on", "none", "sentences", "words", "characters"], missing: "" },
        autoFocus: Boolean,
        accessKey: String,
        nonce: String,
        hidden: Boolean,
        translate: { type: ["no", "yes"], missing: "" },
        tabIndex: {
          type: "long",
          default: function () {
            if (this.tagName in Tx || this.contentEditable) return 0;
            else return -1;
          },
        },
      },
      events: [
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
      ],
    })),
    yx = _({
      name: "HTMLUnknownElement",
      ctor: function (t, r, a) {
        y.call(this, t, r, a);
      },
    }),
    Me = {
      form: {
        get: function () {
          return this._form;
        },
      },
    };
  _({
    tag: "a",
    name: "HTMLAnchorElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: {
      _post_click_activation_steps: {
        value: function (e) {
          if (this.href) this.ownerDocument.defaultView.location = this.href;
        },
      },
    },
    attributes: {
      href: te,
      ping: String,
      download: String,
      target: String,
      rel: String,
      media: String,
      hreflang: String,
      type: String,
      referrerPolicy: Pt,
      coords: String,
      charset: String,
      name: String,
      rev: String,
      shape: String,
    },
  });
  O0._inherit(create.a.prototype);
  _({
    tag: "area",
    name: "HTMLAreaElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      alt: String,
      target: String,
      download: String,
      rel: String,
      media: String,
      href: te,
      hreflang: String,
      type: String,
      shape: String,
      coords: String,
      ping: String,
      referrerPolicy: Pt,
      noHref: Boolean,
    },
  });
  O0._inherit(create.area.prototype);
  _({
    tag: "br",
    name: "HTMLBRElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { clear: String },
  });
  _({
    tag: "base",
    name: "HTMLBaseElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { target: String },
  });
  _({
    tag: "body",
    name: "HTMLBodyElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    events: [
      "afterprint",
      "beforeprint",
      "beforeunload",
      "blur",
      "error",
      "focus",
      "hashchange",
      "load",
      "message",
      "offline",
      "online",
      "pagehide",
      "pageshow",
      "popstate",
      "resize",
      "scroll",
      "storage",
      "unload",
    ],
    attributes: {
      text: { type: String, treatNullAsEmptyString: !0 },
      link: { type: String, treatNullAsEmptyString: !0 },
      vLink: { type: String, treatNullAsEmptyString: !0 },
      aLink: { type: String, treatNullAsEmptyString: !0 },
      bgColor: { type: String, treatNullAsEmptyString: !0 },
      background: String,
    },
  });
  _({
    tag: "button",
    name: "HTMLButtonElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: Me,
    attributes: {
      name: String,
      value: String,
      disabled: Boolean,
      autofocus: Boolean,
      type: { type: ["submit", "reset", "button", "menu"], missing: "submit" },
      formTarget: String,
      formAction: te,
      formNoValidate: Boolean,
      formMethod: { type: ["get", "post", "dialog"], invalid: "get", missing: "" },
      formEnctype: {
        type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        invalid: "application/x-www-form-urlencoded",
        missing: "",
      },
    },
  });
  _({
    tag: "dl",
    name: "HTMLDListElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { compact: Boolean },
  });
  _({
    tag: "data",
    name: "HTMLDataElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { value: String },
  });
  _({
    tag: "datalist",
    name: "HTMLDataListElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
  });
  _({
    tag: "details",
    name: "HTMLDetailsElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { open: Boolean },
  });
  _({
    tag: "div",
    name: "HTMLDivElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { align: String },
  });
  _({
    tag: "embed",
    name: "HTMLEmbedElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { src: te, type: String, width: String, height: String, align: String, name: String },
  });
  _({
    tag: "fieldset",
    name: "HTMLFieldSetElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: Me,
    attributes: { disabled: Boolean, name: String },
  });
  _({
    tag: "form",
    name: "HTMLFormElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      action: String,
      autocomplete: { type: ["on", "off"], missing: "on" },
      name: String,
      acceptCharset: { name: "accept-charset" },
      target: String,
      noValidate: Boolean,
      method: { type: ["get", "post", "dialog"], invalid: "get", missing: "get" },
      enctype: {
        type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        invalid: "application/x-www-form-urlencoded",
        missing: "application/x-www-form-urlencoded",
      },
      encoding: {
        name: "enctype",
        type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        invalid: "application/x-www-form-urlencoded",
        missing: "application/x-www-form-urlencoded",
      },
    },
  });
  _({
    tag: "hr",
    name: "HTMLHRElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { align: String, color: String, noShade: Boolean, size: String, width: String },
  });
  _({
    tag: "head",
    name: "HTMLHeadElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
  });
  _({
    tags: ["h1", "h2", "h3", "h4", "h5", "h6"],
    name: "HTMLHeadingElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { align: String },
  });
  _({
    tag: "html",
    name: "HTMLHtmlElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { xmlns: te, version: String },
  });
  _({
    tag: "iframe",
    name: "HTMLIFrameElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      src: te,
      srcdoc: String,
      name: String,
      width: String,
      height: String,
      seamless: Boolean,
      allow: Boolean,
      allowFullscreen: Boolean,
      allowUserMedia: Boolean,
      allowPaymentRequest: Boolean,
      referrerPolicy: Pt,
      loading: { type: ["eager", "lazy"], treatNullAsEmptyString: !0 },
      align: String,
      scrolling: String,
      frameBorder: String,
      longDesc: te,
      marginHeight: { type: String, treatNullAsEmptyString: !0 },
      marginWidth: { type: String, treatNullAsEmptyString: !0 },
    },
  });
  _({
    tag: "img",
    name: "HTMLImageElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      alt: String,
      src: te,
      srcset: String,
      crossOrigin: ua,
      useMap: String,
      isMap: Boolean,
      sizes: String,
      height: { type: "unsigned long", default: 0 },
      width: { type: "unsigned long", default: 0 },
      referrerPolicy: Pt,
      loading: { type: ["eager", "lazy"], missing: "" },
      name: String,
      lowsrc: te,
      align: String,
      hspace: { type: "unsigned long", default: 0 },
      vspace: { type: "unsigned long", default: 0 },
      longDesc: te,
      border: { type: String, treatNullAsEmptyString: !0 },
    },
  });
  _({
    tag: "input",
    name: "HTMLInputElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: {
      form: Me.form,
      _post_click_activation_steps: {
        value: function (e) {
          if (this.type === "checkbox") this.checked = !this.checked;
          else if (this.type === "radio") {
            var elementsByName = this.form.getElementsByName(this.name);
            for (var r = elementsByName.length - 1; r >= 0; r--) {
              var a = elementsByName[r];
              a.checked = a === this;
            }
          }
        },
      },
    },
    attributes: {
      name: String,
      disabled: Boolean,
      autofocus: Boolean,
      accept: String,
      alt: String,
      max: String,
      min: String,
      pattern: String,
      placeholder: String,
      step: String,
      dirName: String,
      defaultValue: { name: "value" },
      multiple: Boolean,
      required: Boolean,
      readOnly: Boolean,
      checked: Boolean,
      value: String,
      src: te,
      defaultChecked: { name: "checked", type: Boolean },
      size: { type: "unsigned long", default: 20, min: 1, setmin: 1 },
      width: { type: "unsigned long", min: 0, setmin: 0, default: 0 },
      height: { type: "unsigned long", min: 0, setmin: 0, default: 0 },
      minLength: { type: "unsigned long", min: 0, setmin: 0, default: -1 },
      maxLength: { type: "unsigned long", min: 0, setmin: 0, default: -1 },
      autocomplete: String,
      type: {
        type: [
          "text",
          "hidden",
          "search",
          "tel",
          "url",
          "email",
          "password",
          "datetime",
          "date",
          "month",
          "week",
          "time",
          "datetime-local",
          "number",
          "range",
          "color",
          "checkbox",
          "radio",
          "file",
          "submit",
          "image",
          "reset",
          "button",
        ],
        missing: "text",
      },
      formTarget: String,
      formNoValidate: Boolean,
      formMethod: { type: ["get", "post"], invalid: "get", missing: "" },
      formEnctype: {
        type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        invalid: "application/x-www-form-urlencoded",
        missing: "",
      },
      inputMode: {
        type: [
          "verbatim",
          "latin",
          "latin-name",
          "latin-prose",
          "full-width-latin",
          "kana",
          "kana-name",
          "katakana",
          "numeric",
          "tel",
          "email",
          "url",
        ],
        missing: "",
      },
      align: String,
      useMap: String,
    },
  });
  _({
    tag: "keygen",
    name: "HTMLKeygenElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: Me,
    attributes: {
      name: String,
      disabled: Boolean,
      autofocus: Boolean,
      challenge: String,
      keytype: { type: ["rsa"], missing: "" },
    },
  });
  _({
    tag: "li",
    name: "HTMLLIElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { value: { type: "long", default: 0 }, type: String },
  });
  _({
    tag: "label",
    name: "HTMLLabelElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: Me,
    attributes: { htmlFor: { name: "for", type: String } },
  });
  _({
    tag: "legend",
    name: "HTMLLegendElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { align: String },
  });
  _({
    tag: "link",
    name: "HTMLLinkElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      href: te,
      rel: String,
      media: String,
      hreflang: String,
      type: String,
      crossOrigin: ua,
      nonce: String,
      integrity: String,
      referrerPolicy: Pt,
      imageSizes: String,
      imageSrcset: String,
      charset: String,
      rev: String,
      target: String,
    },
  });
  _({
    tag: "map",
    name: "HTMLMapElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { name: String },
  });
  _({
    tag: "menu",
    name: "HTMLMenuElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      type: { type: ["context", "popup", "toolbar"], missing: "toolbar" },
      label: String,
      compact: Boolean,
    },
  });
  _({
    tag: "meta",
    name: "HTMLMetaElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      name: String,
      content: String,
      httpEquiv: { name: "http-equiv", type: String },
      scheme: String,
    },
  });
  _({
    tag: "meter",
    name: "HTMLMeterElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: Me,
  });
  _({
    tags: ["ins", "del"],
    name: "HTMLModElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { cite: te, dateTime: String },
  });
  _({
    tag: "ol",
    name: "HTMLOListElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: {
      _numitems: {
        get: function () {
          var e = 0;
          return (
            this.childNodes.forEach(function (childNode) {
              if (childNode.nodeType === Gn.ELEMENT_NODE && childNode.tagName === "LI") e++;
            }),
            e
          );
        },
      },
    },
    attributes: {
      type: String,
      reversed: Boolean,
      start: {
        type: "long",
        default: function () {
          if (this.reversed) return this._numitems;
          else return 1;
        },
      },
      compact: Boolean,
    },
  });
  _({
    tag: "object",
    name: "HTMLObjectElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: Me,
    attributes: {
      data: te,
      type: String,
      name: String,
      useMap: String,
      typeMustMatch: Boolean,
      width: String,
      height: String,
      align: String,
      archive: String,
      code: String,
      declare: Boolean,
      hspace: { type: "unsigned long", default: 0 },
      standby: String,
      vspace: { type: "unsigned long", default: 0 },
      codeBase: te,
      codeType: String,
      border: { type: String, treatNullAsEmptyString: !0 },
    },
  });
  _({
    tag: "optgroup",
    name: "HTMLOptGroupElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { disabled: Boolean, label: String },
  });
  _({
    tag: "option",
    name: "HTMLOptionElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: {
      form: {
        get: function () {
          var parentNode = this.parentNode;
          while (parentNode && parentNode.nodeType === Gn.ELEMENT_NODE) {
            if (parentNode.localName === "select") return parentNode.form;
            parentNode = parentNode.parentNode;
          }
        },
      },
      value: {
        get: function () {
          return this._getattr("value") || this.text;
        },
        set: function (e) {
          this._setattr("value", e);
        },
      },
      text: {
        get: function () {
          return this.textContent.replace(/[ \t\n\f\r]+/g, " ").trim();
        },
        set: function (e) {
          this.textContent = e;
        },
      },
    },
    attributes: { disabled: Boolean, defaultSelected: { name: "selected", type: Boolean }, label: String },
  });
  _({
    tag: "output",
    name: "HTMLOutputElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: Me,
    attributes: { name: String },
  });
  _({
    tag: "p",
    name: "HTMLParagraphElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { align: String },
  });
  _({
    tag: "param",
    name: "HTMLParamElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { name: String, value: String, type: String, valueType: String },
  });
  _({
    tags: ["pre", "listing", "xmp"],
    name: "HTMLPreElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { width: { type: "long", default: 0 } },
  });
  _({
    tag: "progress",
    name: "HTMLProgressElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: Me,
    attributes: { max: { type: Number, float: !0, default: 1, min: 0 } },
  });
  _({
    tags: ["q", "blockquote"],
    name: "HTMLQuoteElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { cite: te },
  });
  _({
    tag: "script",
    name: "HTMLScriptElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: {
      text: {
        get: function () {
          var e = "";
          for (var t = 0, r = this.childNodes.length; t < r; t++) {
            var a = this.childNodes[t];
            if (a.nodeType === Gn.TEXT_NODE) e += a._data;
          }
          return e;
        },
        set: function (e) {
          if ((this.removeChildren(), e !== null && e !== ""))
            this.appendChild(this.ownerDocument.createTextNode(e));
        },
      },
    },
    attributes: {
      src: te,
      type: String,
      charset: String,
      referrerPolicy: Pt,
      defer: Boolean,
      async: Boolean,
      nomodule: Boolean,
      crossOrigin: ua,
      nonce: String,
      integrity: String,
    },
  });
  _({
    tag: "select",
    name: "HTMLSelectElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: {
      form: Me.form,
      options: {
        get: function () {
          return this.getElementsByTagName("option");
        },
      },
    },
    attributes: {
      autocomplete: String,
      name: String,
      disabled: Boolean,
      autofocus: Boolean,
      multiple: Boolean,
      required: Boolean,
      size: { type: "unsigned long", default: 0 },
    },
  });
  _({
    tag: "span",
    name: "HTMLSpanElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
  });
  _({
    tag: "style",
    name: "HTMLStyleElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { media: String, type: String, scoped: Boolean },
  });
  _({
    tag: "caption",
    name: "HTMLTableCaptionElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { align: String },
  });
  _({
    name: "HTMLTableCellElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      colSpan: { type: "unsigned long", default: 1 },
      rowSpan: { type: "unsigned long", default: 1 },
      scope: { type: ["row", "col", "rowgroup", "colgroup"], missing: "" },
      abbr: String,
      align: String,
      axis: String,
      height: String,
      width: String,
      ch: { name: "char", type: String },
      chOff: { name: "charoff", type: String },
      noWrap: Boolean,
      vAlign: String,
      bgColor: { type: String, treatNullAsEmptyString: !0 },
    },
  });
  _({
    tags: ["col", "colgroup"],
    name: "HTMLTableColElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      span: { type: "limited unsigned long with fallback", default: 1, min: 1 },
      align: String,
      ch: { name: "char", type: String },
      chOff: { name: "charoff", type: String },
      vAlign: String,
      width: String,
    },
  });
  _({
    tag: "table",
    name: "HTMLTableElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: {
      rows: {
        get: function () {
          return this.getElementsByTagName("tr");
        },
      },
    },
    attributes: {
      align: String,
      border: String,
      frame: String,
      rules: String,
      summary: String,
      width: String,
      bgColor: { type: String, treatNullAsEmptyString: !0 },
      cellPadding: { type: String, treatNullAsEmptyString: !0 },
      cellSpacing: { type: String, treatNullAsEmptyString: !0 },
    },
  });
  _({
    tag: "template",
    name: "HTMLTemplateElement",
    ctor: function (t, r, a) {
      (y.call(this, t, r, a), (this._contentFragment = t._templateDoc.createDocumentFragment()));
    },
    props: {
      content: {
        get: function () {
          return this._contentFragment;
        },
      },
      serialize: {
        value: function () {
          return this.content.serialize();
        },
      },
    },
  });
  _({
    tag: "tr",
    name: "HTMLTableRowElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: {
      cells: {
        get: function () {
          return this.querySelectorAll("td,th");
        },
      },
    },
    attributes: {
      align: String,
      ch: { name: "char", type: String },
      chOff: { name: "charoff", type: String },
      vAlign: String,
      bgColor: { type: String, treatNullAsEmptyString: !0 },
    },
  });
  _({
    tags: ["thead", "tfoot", "tbody"],
    name: "HTMLTableSectionElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: {
      rows: {
        get: function () {
          return this.getElementsByTagName("tr");
        },
      },
    },
    attributes: {
      align: String,
      ch: { name: "char", type: String },
      chOff: { name: "charoff", type: String },
      vAlign: String,
    },
  });
  _({
    tag: "textarea",
    name: "HTMLTextAreaElement",
    ctor: function (t, r, a) {
      Le.call(this, t, r, a);
    },
    props: {
      form: Me.form,
      type: {
        get: function () {
          return "textarea";
        },
      },
      defaultValue: {
        get: function () {
          return this.textContent;
        },
        set: function (e) {
          this.textContent = e;
        },
      },
      value: {
        get: function () {
          return this.defaultValue;
        },
        set: function (e) {
          this.defaultValue = e;
        },
      },
      textLength: {
        get: function () {
          return this.value.length;
        },
      },
    },
    attributes: {
      autocomplete: String,
      name: String,
      disabled: Boolean,
      autofocus: Boolean,
      placeholder: String,
      wrap: String,
      dirName: String,
      required: Boolean,
      readOnly: Boolean,
      rows: { type: "limited unsigned long with fallback", default: 2 },
      cols: { type: "limited unsigned long with fallback", default: 20 },
      maxLength: { type: "unsigned long", min: 0, setmin: 0, default: -1 },
      minLength: { type: "unsigned long", min: 0, setmin: 0, default: -1 },
      inputMode: {
        type: [
          "verbatim",
          "latin",
          "latin-name",
          "latin-prose",
          "full-width-latin",
          "kana",
          "kana-name",
          "katakana",
          "numeric",
          "tel",
          "email",
          "url",
        ],
        missing: "",
      },
    },
  });
  _({
    tag: "time",
    name: "HTMLTimeElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { dateTime: String, pubDate: Boolean },
  });
  _({
    tag: "title",
    name: "HTMLTitleElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: {
      text: {
        get: function () {
          return this.textContent;
        },
      },
    },
  });
  _({
    tag: "ul",
    name: "HTMLUListElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { type: String, compact: Boolean },
  });
  _({
    name: "HTMLMediaElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      src: te,
      crossOrigin: ua,
      preload: { type: ["metadata", "none", "auto", { value: "", alias: "auto" }], missing: "auto" },
      loop: Boolean,
      autoplay: Boolean,
      mediaGroup: String,
      controls: Boolean,
      defaultMuted: { name: "muted", type: Boolean },
    },
  });
  _({
    name: "HTMLAudioElement",
    tag: "audio",
    superclass: Xe.HTMLMediaElement,
    ctor: function (t, r, a) {
      Xe.HTMLMediaElement.call(this, t, r, a);
    },
  });
  _({
    name: "HTMLVideoElement",
    tag: "video",
    superclass: Xe.HTMLMediaElement,
    ctor: function (t, r, a) {
      Xe.HTMLMediaElement.call(this, t, r, a);
    },
    attributes: {
      poster: te,
      width: { type: "unsigned long", min: 0, default: 0 },
      height: { type: "unsigned long", min: 0, default: 0 },
    },
  });
  _({
    tag: "td",
    name: "HTMLTableDataCellElement",
    superclass: Xe.HTMLTableCellElement,
    ctor: function (t, r, a) {
      Xe.HTMLTableCellElement.call(this, t, r, a);
    },
  });
  _({
    tag: "th",
    name: "HTMLTableHeaderCellElement",
    superclass: Xe.HTMLTableCellElement,
    ctor: function (t, r, a) {
      Xe.HTMLTableCellElement.call(this, t, r, a);
    },
  });
  _({
    tag: "frameset",
    name: "HTMLFrameSetElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
  });
  _({
    tag: "frame",
    name: "HTMLFrameElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
  });
  _({
    tag: "canvas",
    name: "HTMLCanvasElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: {
      getContext: { value: Te.nyi },
      probablySupportsContext: { value: Te.nyi },
      setContext: { value: Te.nyi },
      transferControlToProxy: { value: Te.nyi },
      toDataURL: { value: Te.nyi },
      toBlob: { value: Te.nyi },
    },
    attributes: {
      width: { type: "unsigned long", default: 300 },
      height: { type: "unsigned long", default: 150 },
    },
  });
  _({
    tag: "dialog",
    name: "HTMLDialogElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: { show: { value: Te.nyi }, showModal: { value: Te.nyi }, close: { value: Te.nyi } },
    attributes: { open: Boolean, returnValue: String },
  });
  _({
    tag: "menuitem",
    name: "HTMLMenuItemElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    props: {
      _label: {
        get: function () {
          var _getattr = this._getattr("label");
          if (_getattr !== null && _getattr !== "") return _getattr;
          return ((_getattr = this.textContent), _getattr.replace(/[ \t\n\f\r]+/g, " ").trim());
        },
      },
      label: {
        get: function () {
          var _getattr = this._getattr("label");
          if (_getattr !== null) return _getattr;
          return this._label;
        },
        set: function (e) {
          this._setattr("label", e);
        },
      },
    },
    attributes: {
      type: { type: ["command", "checkbox", "radio"], missing: "command" },
      icon: te,
      disabled: Boolean,
      checked: Boolean,
      radiogroup: String,
      default: Boolean,
    },
  });
  _({
    tag: "source",
    name: "HTMLSourceElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      srcset: String,
      sizes: String,
      media: String,
      src: te,
      type: String,
      width: String,
      height: String,
    },
  });
  _({
    tag: "track",
    name: "HTMLTrackElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      src: te,
      srclang: String,
      label: String,
      default: Boolean,
      kind: {
        type: ["subtitles", "captions", "descriptions", "chapters", "metadata"],
        missing: "subtitles",
        invalid: "metadata",
      },
    },
    props: {
      NONE: {
        get: function () {
          return 0;
        },
      },
      LOADING: {
        get: function () {
          return 1;
        },
      },
      LOADED: {
        get: function () {
          return 2;
        },
      },
      ERROR: {
        get: function () {
          return 3;
        },
      },
      readyState: { get: Te.nyi },
      track: { get: Te.nyi },
    },
  });
  _({
    tag: "font",
    name: "HTMLFontElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: {
      color: { type: String, treatNullAsEmptyString: !0 },
      face: { type: String },
      size: { type: String },
    },
  });
  _({
    tag: "dir",
    name: "HTMLDirectoryElement",
    ctor: function (t, r, a) {
      y.call(this, t, r, a);
    },
    attributes: { compact: Boolean },
  });
  _({
    tags: [
      "abbr",
      "address",
      "article",
      "aside",
      "b",
      "bdi",
      "bdo",
      "cite",
      "content",
      "code",
      "dd",
      "dfn",
      "dt",
      "em",
      "figcaption",
      "figure",
      "footer",
      "header",
      "hgroup",
      "i",
      "kbd",
      "main",
      "mark",
      "nav",
      "noscript",
      "rb",
      "rp",
      "rt",
      "rtc",
      "ruby",
      "s",
      "samp",
      "section",
      "small",
      "strong",
      "sub",
      "summary",
      "sup",
      "u",
      "var",
      "wbr",
      "acronym",
      "basefont",
      "big",
      "center",
      "nobr",
      "noembed",
      "noframes",
      "plaintext",
      "strike",
      "tt",
    ],
  });
});

export { la };
