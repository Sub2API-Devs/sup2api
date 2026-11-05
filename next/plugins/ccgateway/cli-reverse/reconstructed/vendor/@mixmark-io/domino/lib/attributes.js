/**
 * @mixmark-io/domino/lib/attributes.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";

//@ chunk-w04z664w.js:26129-28295 cjs-fingerprint
var require_attributes = __commonJS(function (cjsExports) {
  var utils = require_utils();
  cjsExports.property = function (attr) {
    if (Array.isArray(attr.type)) {
      var valid = Object.create(null);
      attr.type.forEach(function (val) {
        valid[val.value || val] = val.alias || val;
      });
      var missingValueDefault = attr.missing;
      if (missingValueDefault === undefined) missingValueDefault = null;
      var invalidValueDefault = attr.invalid;
      if (invalidValueDefault === undefined) invalidValueDefault = missingValueDefault;
      return {
        get: function () {
          var v = this._getattr(attr.name);
          if (v === null) return missingValueDefault;
          v = valid[v.toLowerCase()];
          if (v !== undefined) return v;
          if (invalidValueDefault !== null) return invalidValueDefault;
          return v;
        },
        set: function (v) {
          this._setattr(attr.name, v);
        },
      };
    } else if (attr.type === Boolean)
      return {
        get: function () {
          return this.hasAttribute(attr.name);
        },
        set: function (v) {
          if (v) this._setattr(attr.name, "");
          else this.removeAttribute(attr.name);
        },
      };
    else if (
      attr.type === Number ||
      attr.type === "long" ||
      attr.type === "unsigned long" ||
      attr.type === "limited unsigned long with fallback"
    )
      return numberPropDesc(attr);
    else if (!attr.type || attr.type === String)
      return {
        get: function () {
          return this._getattr(attr.name) || "";
        },
        set: function (v) {
          if (attr.treatNullAsEmptyString && v === null) v = "";
          this._setattr(attr.name, v);
        },
      };
    else if (typeof attr.type === "function") return attr.type(attr.name, attr);
    throw Error("Invalid attribute definition");
  };
  function numberPropDesc(a_2) {
    var def;
    if (typeof a_2.default === "function") def = a_2.default;
    else if (typeof a_2.default === "number")
      def = function () {
        return a_2.default;
      };
    else
      def = function () {
        utils.assert(false, typeof a_2.default);
      };
    var unsigned_long = a_2.type === "unsigned long";
    var signed_long = a_2.type === "long";
    var unsigned_fallback = a_2.type === "limited unsigned long with fallback";
    var { min, max, setmin } = a_2;
    if (min === undefined) {
      if (unsigned_long) min = 0;
      if (signed_long) min = -2147483648;
      if (unsigned_fallback) min = 1;
    }
    if (max === undefined) {
      if (unsigned_long || signed_long || unsigned_fallback) max = 2147483647;
    }
    return {
      get: function () {
        var v = this._getattr(a_2.name);
        var n = a_2.float ? parseFloat(v) : parseInt(v, 10);
        if (v === null || !isFinite(n) || (min !== undefined && n < min) || (max !== undefined && n > max))
          return def.call(this);
        if (unsigned_long || signed_long || unsigned_fallback) {
          if (!/^[ \t\n\f\r]*[-+]?[0-9]/.test(v)) return def.call(this);
          n = n | 0;
        }
        return n;
      },
      set: function (v) {
        if (!a_2.float) v = Math.floor(v);
        if (setmin !== undefined && v < setmin) utils.IndexSizeError(a_2.name + " set to " + v);
        if (unsigned_long) v = v < 0 || v > 2147483647 ? def.call(this) : v | 0;
        else if (unsigned_fallback) v = v < 1 || v > 2147483647 ? def.call(this) : v | 0;
        else if (signed_long) v = v < -2147483648 || v > 2147483647 ? def.call(this) : v | 0;
        this._setattr(a_2.name, String(v));
      },
    };
  }
  cjsExports.registerChangeHandler = function (c, name, handler) {
    var p = c.prototype;
    if (!Object.prototype.hasOwnProperty.call(p, "_attributeChangeHandlers"))
      p._attributeChangeHandlers = Object.create(p._attributeChangeHandlers || null);
    p._attributeChangeHandlers[name] = handler;
  };
});
export { require_attributes };
