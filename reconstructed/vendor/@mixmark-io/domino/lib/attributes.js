/**
 * @mixmark-io/domino/lib/attributes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:26129-28295 cjs-fingerprint
var un = x(function (Cl) {
  var fs = ee();
  Cl.property = function (e) {
    if (Array.isArray(e.type)) {
      var create = Object.create(null);
      e.type.forEach(function (s) {
        create[s.value || s] = s.alias || s;
      });
      var missing = e.missing;
      if (missing === void 0) missing = null;
      var invalid = e.invalid;
      if (invalid === void 0) invalid = missing;
      return {
        get: function () {
          var _getattr = this._getattr(e.name);
          if (_getattr === null) return missing;
          if (((_getattr = create[_getattr.toLowerCase()]), _getattr !== void 0)) return _getattr;
          if (invalid !== null) return invalid;
          return _getattr;
        },
        set: function (s) {
          this._setattr(e.name, s);
        },
      };
    } else if (e.type === Boolean)
      return {
        get: function () {
          return this.hasAttribute(e.name);
        },
        set: function (s) {
          if (s) this._setattr(e.name, "");
          else this.removeAttribute(e.name);
        },
      };
    else if (
      e.type === Number ||
      e.type === "long" ||
      e.type === "unsigned long" ||
      e.type === "limited unsigned long with fallback"
    )
      return Al(e);
    else if (!e.type || e.type === String)
      return {
        get: function () {
          return this._getattr(e.name) || "";
        },
        set: function (s) {
          if (e.treatNullAsEmptyString && s === null) s = "";
          this._setattr(e.name, s);
        },
      };
    else if (typeof e.type === "function") return e.type(e.name, e);
    throw Error("Invalid attribute definition");
  };
  function Al(e) {
    var t;
    if (typeof e.default === "function") t = e.default;
    else if (typeof e.default === "number")
      t = function () {
        return e.default;
      };
    else
      t = function () {
        fs.assert(!1, typeof e.default);
      };
    var r = e.type === "unsigned long",
      a = e.type === "long",
      s = e.type === "limited unsigned long with fallback",
      { min: min, max: max, setmin: setmin } = e;
    if (min === void 0) {
      if (r) min = 0;
      if (a) min = -2147483648;
      if (s) min = 1;
    }
    if (max === void 0) {
      if (r || a || s) max = 2147483647;
    }
    return {
      get: function () {
        var _getattr = this._getattr(e.name),
          v = e.float ? parseFloat(_getattr) : parseInt(_getattr, 10);
        if (_getattr === null || !isFinite(v) || (min !== void 0 && v < min) || (max !== void 0 && v > max))
          return t.call(this);
        if (r || a || s) {
          if (!/^[ \t\n\f\r]*[-+]?[0-9]/.test(_getattr)) return t.call(this);
          v = v | 0;
        }
        return v;
      },
      set: function (m) {
        if (!e.float) m = Math.floor(m);
        if (setmin !== void 0 && m < setmin) fs.IndexSizeError(e.name + " set to " + m);
        if (r) m = m < 0 || m > 2147483647 ? t.call(this) : m | 0;
        else if (s) m = m < 1 || m > 2147483647 ? t.call(this) : m | 0;
        else if (a) m = m < -2147483648 || m > 2147483647 ? t.call(this) : m | 0;
        this._setattr(e.name, String(m));
      },
    };
  }
  Cl.registerChangeHandler = function (e, t, r) {
    var a = e.prototype;
    if (!Object.prototype.hasOwnProperty.call(a, "_attributeChangeHandlers"))
      a._attributeChangeHandlers = Object.create(a._attributeChangeHandlers || null);
    a._attributeChangeHandlers[t] = r;
  };
});

export { un };
