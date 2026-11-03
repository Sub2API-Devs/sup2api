/**
 * @mixmark-io/domino/lib/htmlelts.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_Node } from "./Node.js";
import { require_Element } from "./Element.js";
import { require_CSSStyleDeclaration } from "./CSSStyleDeclaration.js";
import { require_utils } from "./utils.js";
import { require_URLUtils } from "./URLUtils.js";
import { require_defineElement } from "./defineElement.js";

//@ chunk-vwj6ccer.js:84376-106314 cjs-fingerprint
var require_htmlelts = x(function (cjsExports) {
  var Node = require_Node();
  var Element = require_Element();
  var CSSStyleDeclaration = require_CSSStyleDeclaration();
  var utils = require_utils();
  var URLUtils = require_URLUtils();
  var defineElement = require_defineElement();
  var htmlElements = (cjsExports.elements = {});
  var htmlNameToImpl = Object.create(null);
  cjsExports.createElement = function (doc, localName, prefix) {
    var impl = htmlNameToImpl[localName] || HTMLUnknownElement;
    return new impl(doc, localName, prefix);
  };
  function define(spec) {
    return defineElement(spec, HTMLElement, htmlElements, htmlNameToImpl);
  }
  function te(attr) {
    return {
      get: function () {
        var v = this._getattr(attr);
        if (v === null) return "";
        var url = this.doc._resolve(v);
        return url === null ? v : url;
      },
      set: function (value) {
        this._setattr(attr, value);
      },
    };
  }
  function CORS(attr) {
    return {
      get: function () {
        var v = this._getattr(attr);
        if (v === null) return null;
        if (v.toLowerCase() === "use-credentials") return "use-credentials";
        return "anonymous";
      },
      set: function (value) {
        if (value === null || value === undefined) this.removeAttribute(attr);
        else this._setattr(attr, value);
      },
    };
  }
  var REFERRER = {
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
  };
  var focusableElements = {
    A: true,
    LINK: true,
    BUTTON: true,
    INPUT: true,
    SELECT: true,
    TEXTAREA: true,
    COMMAND: true,
  };
  var HTMLFormElement = function (doc, localName, prefix) {
    HTMLElement.call(this, doc, localName, prefix);
    this._form = null;
  };
  var HTMLElement = (cjsExports.HTMLElement = define({
    superclass: Element,
    name: "HTMLElement",
    ctor: function (doc, localName, prefix) {
      Element.call(this, doc, localName, utils.NAMESPACE.HTML, prefix);
    },
    props: {
      dangerouslySetInnerHTML: {
        set: function (v) {
          this._innerHTML = v;
        },
      },
      innerHTML: {
        get: function () {
          return this.serialize();
        },
        set: function (v) {
          var parser = this.ownerDocument.implementation.mozHTMLParser(this.ownerDocument._address, this);
          parser.parse(v === null ? "" : String(v), true);
          var target = this instanceof htmlNameToImpl.template ? this.content : this;
          while (target.hasChildNodes()) target.removeChild(target.firstChild);
          target.appendChild(parser._asDocumentFragment());
        },
      },
      style: {
        get: function () {
          if (!this._style) this._style = new CSSStyleDeclaration(this);
          return this._style;
        },
        set: function (v) {
          if (v === null || v === undefined) v = "";
          this._setattr("style", String(v));
        },
      },
      blur: {
        value: function () {},
      },
      focus: {
        value: function () {},
      },
      forceSpellCheck: {
        value: function () {},
      },
      click: {
        value: function () {
          if (this._click_in_progress) return;
          this._click_in_progress = true;
          try {
            if (this._pre_click_activation_steps) this._pre_click_activation_steps();
            var event = this.ownerDocument.createEvent("MouseEvent");
            event.initMouseEvent(
              "click",
              true,
              true,
              this.ownerDocument.defaultView,
              1,
              0,
              0,
              0,
              0,
              false,
              false,
              false,
              false,
              0,
              null,
            );
            var success = this.dispatchEvent(event);
            if (success) {
              if (this._post_click_activation_steps) this._post_click_activation_steps(event);
            } else if (this._cancelled_activation_steps) this._cancelled_activation_steps();
          } finally {
            this._click_in_progress = false;
          }
        },
      },
      submit: {
        value: utils.nyi,
      },
    },
    attributes: {
      title: String,
      lang: String,
      dir: {
        type: ["ltr", "rtl", "auto"],
        missing: "",
      },
      draggable: {
        type: ["true", "false"],
        treatNullAsEmptyString: true,
      },
      spellcheck: {
        type: ["true", "false"],
        missing: "",
      },
      enterKeyHint: {
        type: ["enter", "done", "go", "next", "previous", "search", "send"],
        missing: "",
      },
      autoCapitalize: {
        type: ["off", "on", "none", "sentences", "words", "characters"],
        missing: "",
      },
      autoFocus: Boolean,
      accessKey: String,
      nonce: String,
      hidden: Boolean,
      translate: {
        type: ["no", "yes"],
        missing: "",
      },
      tabIndex: {
        type: "long",
        default: function () {
          if (this.tagName in focusableElements || this.contentEditable) return 0;
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
  }));
  var HTMLUnknownElement = define({
    name: "HTMLUnknownElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
  });
  var formAssociatedProps = {
    form: {
      get: function () {
        return this._form;
      },
    },
  };
  define({
    tag: "a",
    name: "HTMLAnchorElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
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
      referrerPolicy: REFERRER,
      coords: String,
      charset: String,
      name: String,
      rev: String,
      shape: String,
    },
  });
  URLUtils._inherit(htmlNameToImpl.a.prototype);
  define({
    tag: "area",
    name: "HTMLAreaElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
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
      referrerPolicy: REFERRER,
      noHref: Boolean,
    },
  });
  URLUtils._inherit(htmlNameToImpl.area.prototype);
  define({
    tag: "br",
    name: "HTMLBRElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      clear: String,
    },
  });
  define({
    tag: "base",
    name: "HTMLBaseElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      target: String,
    },
  });
  define({
    tag: "body",
    name: "HTMLBodyElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
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
      text: {
        type: String,
        treatNullAsEmptyString: true,
      },
      link: {
        type: String,
        treatNullAsEmptyString: true,
      },
      vLink: {
        type: String,
        treatNullAsEmptyString: true,
      },
      aLink: {
        type: String,
        treatNullAsEmptyString: true,
      },
      bgColor: {
        type: String,
        treatNullAsEmptyString: true,
      },
      background: String,
    },
  });
  define({
    tag: "button",
    name: "HTMLButtonElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      name: String,
      value: String,
      disabled: Boolean,
      autofocus: Boolean,
      type: {
        type: ["submit", "reset", "button", "menu"],
        missing: "submit",
      },
      formTarget: String,
      formAction: te,
      formNoValidate: Boolean,
      formMethod: {
        type: ["get", "post", "dialog"],
        invalid: "get",
        missing: "",
      },
      formEnctype: {
        type: ["application/x-www-form-urlencoded", "multipart/form-data", "text/plain"],
        invalid: "application/x-www-form-urlencoded",
        missing: "",
      },
    },
  });
  define({
    tag: "dl",
    name: "HTMLDListElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      compact: Boolean,
    },
  });
  define({
    tag: "data",
    name: "HTMLDataElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      value: String,
    },
  });
  define({
    tag: "datalist",
    name: "HTMLDataListElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
  });
  define({
    tag: "details",
    name: "HTMLDetailsElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      open: Boolean,
    },
  });
  define({
    tag: "div",
    name: "HTMLDivElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      align: String,
    },
  });
  define({
    tag: "embed",
    name: "HTMLEmbedElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      src: te,
      type: String,
      width: String,
      height: String,
      align: String,
      name: String,
    },
  });
  define({
    tag: "fieldset",
    name: "HTMLFieldSetElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      disabled: Boolean,
      name: String,
    },
  });
  define({
    tag: "form",
    name: "HTMLFormElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      action: String,
      autocomplete: {
        type: ["on", "off"],
        missing: "on",
      },
      name: String,
      acceptCharset: {
        name: "accept-charset",
      },
      target: String,
      noValidate: Boolean,
      method: {
        type: ["get", "post", "dialog"],
        invalid: "get",
        missing: "get",
      },
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
  define({
    tag: "hr",
    name: "HTMLHRElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      align: String,
      color: String,
      noShade: Boolean,
      size: String,
      width: String,
    },
  });
  define({
    tag: "head",
    name: "HTMLHeadElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
  });
  define({
    tags: ["h1", "h2", "h3", "h4", "h5", "h6"],
    name: "HTMLHeadingElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      align: String,
    },
  });
  define({
    tag: "html",
    name: "HTMLHtmlElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      xmlns: te,
      version: String,
    },
  });
  define({
    tag: "iframe",
    name: "HTMLIFrameElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
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
      referrerPolicy: REFERRER,
      loading: {
        type: ["eager", "lazy"],
        treatNullAsEmptyString: true,
      },
      align: String,
      scrolling: String,
      frameBorder: String,
      longDesc: te,
      marginHeight: {
        type: String,
        treatNullAsEmptyString: true,
      },
      marginWidth: {
        type: String,
        treatNullAsEmptyString: true,
      },
    },
  });
  define({
    tag: "img",
    name: "HTMLImageElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      alt: String,
      src: te,
      srcset: String,
      crossOrigin: CORS,
      useMap: String,
      isMap: Boolean,
      sizes: String,
      height: {
        type: "unsigned long",
        default: 0,
      },
      width: {
        type: "unsigned long",
        default: 0,
      },
      referrerPolicy: REFERRER,
      loading: {
        type: ["eager", "lazy"],
        missing: "",
      },
      name: String,
      lowsrc: te,
      align: String,
      hspace: {
        type: "unsigned long",
        default: 0,
      },
      vspace: {
        type: "unsigned long",
        default: 0,
      },
      longDesc: te,
      border: {
        type: String,
        treatNullAsEmptyString: true,
      },
    },
  });
  define({
    tag: "input",
    name: "HTMLInputElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: {
      form: formAssociatedProps.form,
      _post_click_activation_steps: {
        value: function (e) {
          if (this.type === "checkbox") this.checked = !this.checked;
          else if (this.type === "radio") {
            var group = this.form.getElementsByName(this.name);
            for (var i = group.length - 1; i >= 0; i--) {
              var el = group[i];
              el.checked = el === this;
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
      defaultValue: {
        name: "value",
      },
      multiple: Boolean,
      required: Boolean,
      readOnly: Boolean,
      checked: Boolean,
      value: String,
      src: te,
      defaultChecked: {
        name: "checked",
        type: Boolean,
      },
      size: {
        type: "unsigned long",
        default: 20,
        min: 1,
        setmin: 1,
      },
      width: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: 0,
      },
      height: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: 0,
      },
      minLength: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: -1,
      },
      maxLength: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: -1,
      },
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
      formMethod: {
        type: ["get", "post"],
        invalid: "get",
        missing: "",
      },
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
  define({
    tag: "keygen",
    name: "HTMLKeygenElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      name: String,
      disabled: Boolean,
      autofocus: Boolean,
      challenge: String,
      keytype: {
        type: ["rsa"],
        missing: "",
      },
    },
  });
  define({
    tag: "li",
    name: "HTMLLIElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      value: {
        type: "long",
        default: 0,
      },
      type: String,
    },
  });
  define({
    tag: "label",
    name: "HTMLLabelElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      htmlFor: {
        name: "for",
        type: String,
      },
    },
  });
  define({
    tag: "legend",
    name: "HTMLLegendElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      align: String,
    },
  });
  define({
    tag: "link",
    name: "HTMLLinkElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      href: te,
      rel: String,
      media: String,
      hreflang: String,
      type: String,
      crossOrigin: CORS,
      nonce: String,
      integrity: String,
      referrerPolicy: REFERRER,
      imageSizes: String,
      imageSrcset: String,
      charset: String,
      rev: String,
      target: String,
    },
  });
  define({
    tag: "map",
    name: "HTMLMapElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      name: String,
    },
  });
  define({
    tag: "menu",
    name: "HTMLMenuElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      type: {
        type: ["context", "popup", "toolbar"],
        missing: "toolbar",
      },
      label: String,
      compact: Boolean,
    },
  });
  define({
    tag: "meta",
    name: "HTMLMetaElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      name: String,
      content: String,
      httpEquiv: {
        name: "http-equiv",
        type: String,
      },
      scheme: String,
    },
  });
  define({
    tag: "meter",
    name: "HTMLMeterElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
  });
  define({
    tags: ["ins", "del"],
    name: "HTMLModElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      cite: te,
      dateTime: String,
    },
  });
  define({
    tag: "ol",
    name: "HTMLOListElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      _numitems: {
        get: function () {
          var items = 0;
          this.childNodes.forEach(function (n) {
            if (n.nodeType === Node.ELEMENT_NODE && n.tagName === "LI") items++;
          });
          return items;
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
  define({
    tag: "object",
    name: "HTMLObjectElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
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
      hspace: {
        type: "unsigned long",
        default: 0,
      },
      standby: String,
      vspace: {
        type: "unsigned long",
        default: 0,
      },
      codeBase: te,
      codeType: String,
      border: {
        type: String,
        treatNullAsEmptyString: true,
      },
    },
  });
  define({
    tag: "optgroup",
    name: "HTMLOptGroupElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      disabled: Boolean,
      label: String,
    },
  });
  define({
    tag: "option",
    name: "HTMLOptionElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      form: {
        get: function () {
          var p = this.parentNode;
          while (p && p.nodeType === Node.ELEMENT_NODE) {
            if (p.localName === "select") return p.form;
            p = p.parentNode;
          }
        },
      },
      value: {
        get: function () {
          return this._getattr("value") || this.text;
        },
        set: function (v) {
          this._setattr("value", v);
        },
      },
      text: {
        get: function () {
          return this.textContent.replace(/[ \t\n\f\r]+/g, " ").trim();
        },
        set: function (v) {
          this.textContent = v;
        },
      },
    },
    attributes: {
      disabled: Boolean,
      defaultSelected: {
        name: "selected",
        type: Boolean,
      },
      label: String,
    },
  });
  define({
    tag: "output",
    name: "HTMLOutputElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      name: String,
    },
  });
  define({
    tag: "p",
    name: "HTMLParagraphElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      align: String,
    },
  });
  define({
    tag: "param",
    name: "HTMLParamElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      name: String,
      value: String,
      type: String,
      valueType: String,
    },
  });
  define({
    tags: ["pre", "listing", "xmp"],
    name: "HTMLPreElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      width: {
        type: "long",
        default: 0,
      },
    },
  });
  define({
    tag: "progress",
    name: "HTMLProgressElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: formAssociatedProps,
    attributes: {
      max: {
        type: Number,
        float: true,
        default: 1,
        min: 0,
      },
    },
  });
  define({
    tags: ["q", "blockquote"],
    name: "HTMLQuoteElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      cite: te,
    },
  });
  define({
    tag: "script",
    name: "HTMLScriptElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      text: {
        get: function () {
          var s = "";
          for (var i = 0, n = this.childNodes.length; i < n; i++) {
            var child = this.childNodes[i];
            if (child.nodeType === Node.TEXT_NODE) s += child._data;
          }
          return s;
        },
        set: function (value) {
          this.removeChildren();
          if (value !== null && value !== "") this.appendChild(this.ownerDocument.createTextNode(value));
        },
      },
    },
    attributes: {
      src: te,
      type: String,
      charset: String,
      referrerPolicy: REFERRER,
      defer: Boolean,
      async: Boolean,
      nomodule: Boolean,
      crossOrigin: CORS,
      nonce: String,
      integrity: String,
    },
  });
  define({
    tag: "select",
    name: "HTMLSelectElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: {
      form: formAssociatedProps.form,
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
      size: {
        type: "unsigned long",
        default: 0,
      },
    },
  });
  define({
    tag: "span",
    name: "HTMLSpanElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
  });
  define({
    tag: "style",
    name: "HTMLStyleElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      media: String,
      type: String,
      scoped: Boolean,
    },
  });
  define({
    tag: "caption",
    name: "HTMLTableCaptionElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      align: String,
    },
  });
  define({
    name: "HTMLTableCellElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      colSpan: {
        type: "unsigned long",
        default: 1,
      },
      rowSpan: {
        type: "unsigned long",
        default: 1,
      },
      scope: {
        type: ["row", "col", "rowgroup", "colgroup"],
        missing: "",
      },
      abbr: String,
      align: String,
      axis: String,
      height: String,
      width: String,
      ch: {
        name: "char",
        type: String,
      },
      chOff: {
        name: "charoff",
        type: String,
      },
      noWrap: Boolean,
      vAlign: String,
      bgColor: {
        type: String,
        treatNullAsEmptyString: true,
      },
    },
  });
  define({
    tags: ["col", "colgroup"],
    name: "HTMLTableColElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      span: {
        type: "limited unsigned long with fallback",
        default: 1,
        min: 1,
      },
      align: String,
      ch: {
        name: "char",
        type: String,
      },
      chOff: {
        name: "charoff",
        type: String,
      },
      vAlign: String,
      width: String,
    },
  });
  define({
    tag: "table",
    name: "HTMLTableElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
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
      bgColor: {
        type: String,
        treatNullAsEmptyString: true,
      },
      cellPadding: {
        type: String,
        treatNullAsEmptyString: true,
      },
      cellSpacing: {
        type: String,
        treatNullAsEmptyString: true,
      },
    },
  });
  define({
    tag: "template",
    name: "HTMLTemplateElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
      this._contentFragment = doc._templateDoc.createDocumentFragment();
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
  define({
    tag: "tr",
    name: "HTMLTableRowElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
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
      ch: {
        name: "char",
        type: String,
      },
      chOff: {
        name: "charoff",
        type: String,
      },
      vAlign: String,
      bgColor: {
        type: String,
        treatNullAsEmptyString: true,
      },
    },
  });
  define({
    tags: ["thead", "tfoot", "tbody"],
    name: "HTMLTableSectionElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
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
      ch: {
        name: "char",
        type: String,
      },
      chOff: {
        name: "charoff",
        type: String,
      },
      vAlign: String,
    },
  });
  define({
    tag: "textarea",
    name: "HTMLTextAreaElement",
    ctor: function (doc, localName, prefix) {
      HTMLFormElement.call(this, doc, localName, prefix);
    },
    props: {
      form: formAssociatedProps.form,
      type: {
        get: function () {
          return "textarea";
        },
      },
      defaultValue: {
        get: function () {
          return this.textContent;
        },
        set: function (v) {
          this.textContent = v;
        },
      },
      value: {
        get: function () {
          return this.defaultValue;
        },
        set: function (v) {
          this.defaultValue = v;
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
      rows: {
        type: "limited unsigned long with fallback",
        default: 2,
      },
      cols: {
        type: "limited unsigned long with fallback",
        default: 20,
      },
      maxLength: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: -1,
      },
      minLength: {
        type: "unsigned long",
        min: 0,
        setmin: 0,
        default: -1,
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
    },
  });
  define({
    tag: "time",
    name: "HTMLTimeElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      dateTime: String,
      pubDate: Boolean,
    },
  });
  define({
    tag: "title",
    name: "HTMLTitleElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      text: {
        get: function () {
          return this.textContent;
        },
      },
    },
  });
  define({
    tag: "ul",
    name: "HTMLUListElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      type: String,
      compact: Boolean,
    },
  });
  define({
    name: "HTMLMediaElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      src: te,
      crossOrigin: CORS,
      preload: {
        type: [
          "metadata",
          "none",
          "auto",
          {
            value: "",
            alias: "auto",
          },
        ],
        missing: "auto",
      },
      loop: Boolean,
      autoplay: Boolean,
      mediaGroup: String,
      controls: Boolean,
      defaultMuted: {
        name: "muted",
        type: Boolean,
      },
    },
  });
  define({
    name: "HTMLAudioElement",
    tag: "audio",
    superclass: htmlElements.HTMLMediaElement,
    ctor: function (doc, localName, prefix) {
      htmlElements.HTMLMediaElement.call(this, doc, localName, prefix);
    },
  });
  define({
    name: "HTMLVideoElement",
    tag: "video",
    superclass: htmlElements.HTMLMediaElement,
    ctor: function (doc, localName, prefix) {
      htmlElements.HTMLMediaElement.call(this, doc, localName, prefix);
    },
    attributes: {
      poster: te,
      width: {
        type: "unsigned long",
        min: 0,
        default: 0,
      },
      height: {
        type: "unsigned long",
        min: 0,
        default: 0,
      },
    },
  });
  define({
    tag: "td",
    name: "HTMLTableDataCellElement",
    superclass: htmlElements.HTMLTableCellElement,
    ctor: function (doc, localName, prefix) {
      htmlElements.HTMLTableCellElement.call(this, doc, localName, prefix);
    },
  });
  define({
    tag: "th",
    name: "HTMLTableHeaderCellElement",
    superclass: htmlElements.HTMLTableCellElement,
    ctor: function (doc, localName, prefix) {
      htmlElements.HTMLTableCellElement.call(this, doc, localName, prefix);
    },
  });
  define({
    tag: "frameset",
    name: "HTMLFrameSetElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
  });
  define({
    tag: "frame",
    name: "HTMLFrameElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
  });
  define({
    tag: "canvas",
    name: "HTMLCanvasElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      getContext: {
        value: utils.nyi,
      },
      probablySupportsContext: {
        value: utils.nyi,
      },
      setContext: {
        value: utils.nyi,
      },
      transferControlToProxy: {
        value: utils.nyi,
      },
      toDataURL: {
        value: utils.nyi,
      },
      toBlob: {
        value: utils.nyi,
      },
    },
    attributes: {
      width: {
        type: "unsigned long",
        default: 300,
      },
      height: {
        type: "unsigned long",
        default: 150,
      },
    },
  });
  define({
    tag: "dialog",
    name: "HTMLDialogElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      show: {
        value: utils.nyi,
      },
      showModal: {
        value: utils.nyi,
      },
      close: {
        value: utils.nyi,
      },
    },
    attributes: {
      open: Boolean,
      returnValue: String,
    },
  });
  define({
    tag: "menuitem",
    name: "HTMLMenuItemElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    props: {
      _label: {
        get: function () {
          var val = this._getattr("label");
          if (val !== null && val !== "") return val;
          val = this.textContent;
          return val.replace(/[ \t\n\f\r]+/g, " ").trim();
        },
      },
      label: {
        get: function () {
          var val = this._getattr("label");
          if (val !== null) return val;
          return this._label;
        },
        set: function (v) {
          this._setattr("label", v);
        },
      },
    },
    attributes: {
      type: {
        type: ["command", "checkbox", "radio"],
        missing: "command",
      },
      icon: te,
      disabled: Boolean,
      checked: Boolean,
      radiogroup: String,
      default: Boolean,
    },
  });
  define({
    tag: "source",
    name: "HTMLSourceElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
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
  define({
    tag: "track",
    name: "HTMLTrackElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
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
      readyState: {
        get: utils.nyi,
      },
      track: {
        get: utils.nyi,
      },
    },
  });
  define({
    tag: "font",
    name: "HTMLFontElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      color: {
        type: String,
        treatNullAsEmptyString: true,
      },
      face: {
        type: String,
      },
      size: {
        type: String,
      },
    },
  });
  define({
    tag: "dir",
    name: "HTMLDirectoryElement",
    ctor: function (doc, localName, prefix) {
      HTMLElement.call(this, doc, localName, prefix);
    },
    attributes: {
      compact: Boolean,
    },
  });
  define({
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
export { require_htmlelts };
