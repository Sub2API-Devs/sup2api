/**
 * @mixmark-io/domino/lib/CSSStyleDeclaration.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_style_parser } from "./style_parser.js";

//@ chunk-vwj6ccer.js:77213-79901 cjs-fingerprint
var require_CSSStyleDeclaration = __commonJS(function (cjsExports, cjsModule) {
  var { parse } = require_style_parser();
  cjsModule.exports = function (elt) {
    let styleDeclaration = new CSSStyleDeclaration(elt);
    return new Proxy(styleDeclaration, {
      get: function (target, property) {
        return property in target ? target[property] : target.getPropertyValue(dasherizeProperty(property));
      },
      has: function (target, key) {
        return true;
      },
      set: function (target, property, value) {
        if (property in target) target[property] = value;
        else target.setProperty(dasherizeProperty(property), value ?? undefined);
        return true;
      },
    });
  };
  function dasherizeProperty(property) {
    return property.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }
  function CSSStyleDeclaration(elt) {
    this._element = elt;
  }
  var IMPORTANT_BANG = "!important";
  function parseStyles(value) {
    let result = {
      property: {},
      priority: {},
    };
    if (!value) return result;
    let styleValues = parse(value);
    if (styleValues.length < 2) return result;
    for (let i = 0; i < styleValues.length; i += 2) {
      let name = styleValues[i];
      let value = styleValues[i + 1];
      if (value.endsWith(IMPORTANT_BANG)) {
        result.priority[name] = "important";
        value = value.slice(0, -IMPORTANT_BANG.length).trim();
      }
      result.property[name] = value;
    }
    return result;
  }
  var NO_CHANGE = {};
  CSSStyleDeclaration.prototype = Object.create(Object.prototype, {
    _parsed: {
      get: function () {
        if (!this._parsedStyles || this.cssText !== this._lastParsedText) {
          var text = this.cssText;
          this._parsedStyles = parseStyles(text);
          this._lastParsedText = text;
          delete this._names;
        }
        return this._parsedStyles;
      },
    },
    _serialize: {
      value: function () {
        var styles = this._parsed;
        var s = "";
        for (var name in styles.property) {
          if (s) s += " ";
          s += name + ": " + styles.property[name];
          if (styles.priority[name]) s += " !" + styles.priority[name];
          s += ";";
        }
        this.cssText = s;
        this._lastParsedText = s;
        delete this._names;
      },
    },
    cssText: {
      get: function () {
        return this._element.getAttribute("style");
      },
      set: function (value) {
        this._element.setAttribute("style", value);
      },
    },
    length: {
      get: function () {
        if (!this._names) this._names = Object.getOwnPropertyNames(this._parsed.property);
        return this._names.length;
      },
    },
    item: {
      value: function (n) {
        if (!this._names) this._names = Object.getOwnPropertyNames(this._parsed.property);
        return this._names[n];
      },
    },
    getPropertyValue: {
      value: function (property) {
        property = property.toLowerCase();
        return this._parsed.property[property] || "";
      },
    },
    getPropertyPriority: {
      value: function (property) {
        property = property.toLowerCase();
        return this._parsed.priority[property] || "";
      },
    },
    setProperty: {
      value: function (property, value, priority) {
        property = property.toLowerCase();
        if (value === null || value === undefined) value = "";
        if (priority === null || priority === undefined) priority = "";
        if (value !== NO_CHANGE) value = "" + value;
        value = value.trim();
        if (value === "") {
          this.removeProperty(property);
          return;
        }
        if (priority !== "" && priority !== NO_CHANGE && !/^important$/i.test(priority)) return;
        var styles = this._parsed;
        if (value === NO_CHANGE) {
          if (!styles.property[property]) return;
          if (priority !== "") styles.priority[property] = "important";
          else delete styles.priority[property];
        } else {
          if (value.indexOf(";") !== -1) return;
          var newprops = parseStyles(property + ":" + value);
          if (Object.getOwnPropertyNames(newprops.property).length === 0) return;
          if (Object.getOwnPropertyNames(newprops.priority).length !== 0) return;
          for (var p in newprops.property) {
            styles.property[p] = newprops.property[p];
            if (priority === NO_CHANGE) continue;
            else if (priority !== "") styles.priority[p] = "important";
            else if (styles.priority[p]) delete styles.priority[p];
          }
        }
        this._serialize();
      },
    },
    setPropertyValue: {
      value: function (property, value) {
        return this.setProperty(property, value, NO_CHANGE);
      },
    },
    setPropertyPriority: {
      value: function (property, priority) {
        return this.setProperty(property, NO_CHANGE, priority);
      },
    },
    removeProperty: {
      value: function (property) {
        property = property.toLowerCase();
        var styles = this._parsed;
        if (property in styles.property) {
          delete styles.property[property];
          delete styles.priority[property];
          this._serialize();
        }
      },
    },
  });
});
export { require_CSSStyleDeclaration };
