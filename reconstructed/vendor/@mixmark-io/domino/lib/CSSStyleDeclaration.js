/**
 * @mixmark-io/domino/lib/CSSStyleDeclaration.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { N0 } from "./style_parser.js";

//@ chunk-vwj6ccer.js:77213-79901 cjs-fingerprint
var oa = x(function (Hd, D0) {
  var { parse: parse } = N0();
  D0.exports = function (e) {
    let t = new C0(e);
    return new Proxy(t, {
      get: function (a, s) {
        return s in a ? a[s] : a.getPropertyValue(w0(s));
      },
      has: function (a, s) {
        return !0;
      },
      set: function (a, s, c) {
        if (s in a) a[s] = c;
        else a.setProperty(w0(s), c ?? void 0);
        return !0;
      },
    });
  };
  function w0(e) {
    return e.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }
  function C0(e) {
    this._element = e;
  }
  var S0 = "!important";
  function A0(e) {
    let t = { property: {}, priority: {} };
    if (!e) return t;
    let r = parse(e);
    if (r.length < 2) return t;
    for (let a = 0; a < r.length; a += 2) {
      let s = r[a],
        c = r[a + 1];
      if (c.endsWith(S0)) ((t.priority[s] = "important"), (c = c.slice(0, -S0.length).trim()));
      t.property[s] = c;
    }
    return t;
  }
  var Bt = {};
  C0.prototype = Object.create(Object.prototype, {
    _parsed: {
      get: function () {
        if (!this._parsedStyles || this.cssText !== this._lastParsedText) {
          var cssText = this.cssText;
          ((this._parsedStyles = A0(cssText)), (this._lastParsedText = cssText), delete this._names);
        }
        return this._parsedStyles;
      },
    },
    _serialize: {
      value: function () {
        var _parsed = this._parsed,
          t = "";
        for (var key in _parsed.property) {
          if (t) t += " ";
          if (((t += key + ": " + _parsed.property[key]), _parsed.priority[key]))
            t += " !" + _parsed.priority[key];
          t += ";";
        }
        ((this.cssText = t), (this._lastParsedText = t), delete this._names);
      },
    },
    cssText: {
      get: function () {
        return this._element.getAttribute("style");
      },
      set: function (e) {
        this._element.setAttribute("style", e);
      },
    },
    length: {
      get: function () {
        if (!this._names) this._names = Object.getOwnPropertyNames(this._parsed.property);
        return this._names.length;
      },
    },
    item: {
      value: function (e) {
        if (!this._names) this._names = Object.getOwnPropertyNames(this._parsed.property);
        return this._names[e];
      },
    },
    getPropertyValue: {
      value: function (e) {
        return ((e = e.toLowerCase()), this._parsed.property[e] || "");
      },
    },
    getPropertyPriority: {
      value: function (e) {
        return ((e = e.toLowerCase()), this._parsed.priority[e] || "");
      },
    },
    setProperty: {
      value: function (e, t, r) {
        if (((e = e.toLowerCase()), t === null || t === void 0)) t = "";
        if (r === null || r === void 0) r = "";
        if (t !== Bt) t = "" + t;
        if (((t = t.trim()), t === "")) {
          this.removeProperty(e);
          return;
        }
        if (r !== "" && r !== Bt && !/^important$/i.test(r)) return;
        var _parsed = this._parsed;
        if (t === Bt) {
          if (!_parsed.property[e]) return;
          if (r !== "") _parsed.priority[e] = "important";
          else delete _parsed.priority[e];
        } else {
          if (t.indexOf(";") !== -1) return;
          var s = A0(e + ":" + t);
          if (Object.getOwnPropertyNames(s.property).length === 0) return;
          if (Object.getOwnPropertyNames(s.priority).length !== 0) return;
          for (var key in s.property)
            if (((_parsed.property[key] = s.property[key]), r === Bt)) continue;
            else if (r !== "") _parsed.priority[key] = "important";
            else if (_parsed.priority[key]) delete _parsed.priority[key];
        }
        this._serialize();
      },
    },
    setPropertyValue: {
      value: function (e, t) {
        return this.setProperty(e, t, Bt);
      },
    },
    setPropertyPriority: {
      value: function (e, t) {
        return this.setProperty(e, Bt, t);
      },
    },
    removeProperty: {
      value: function (e) {
        e = e.toLowerCase();
        var _parsed = this._parsed;
        if (e in _parsed.property)
          (delete _parsed.property[e], delete _parsed.priority[e], this._serialize());
      },
    },
  });
});

export { oa };
