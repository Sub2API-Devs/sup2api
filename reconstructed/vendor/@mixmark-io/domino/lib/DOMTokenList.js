/**
 * @mixmark-io/domino/lib/DOMTokenList.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";

//@ chunk-vwj6ccer.js:29363-31379 cjs-fingerprint
var require_DOMTokenList = x(function (cjsExports, cjsModule) {
  var utils = require_utils();
  cjsModule.exports = DOMTokenList;
  function DOMTokenList(getter, setter) {
    this._getString = getter;
    this._setString = setter;
    this._length = 0;
    this._lastStringValue = "";
    this._update();
  }
  Object.defineProperties(DOMTokenList.prototype, {
    length: {
      get: function () {
        return this._length;
      },
    },
    item: {
      value: function (index) {
        var list = getList(this);
        if (index < 0 || index >= list.length) return null;
        return list[index];
      },
    },
    contains: {
      value: function (token) {
        token = String(token);
        var list = getList(this);
        return list.indexOf(token) > -1;
      },
    },
    add: {
      value: function () {
        var list = getList(this);
        for (var i = 0, len = arguments.length; i < len; i++) {
          var token = handleErrors(arguments[i]);
          if (list.indexOf(token) < 0) list.push(token);
        }
        this._update(list);
      },
    },
    remove: {
      value: function () {
        var list = getList(this);
        for (var i = 0, len = arguments.length; i < len; i++) {
          var token = handleErrors(arguments[i]);
          var index = list.indexOf(token);
          if (index > -1) list.splice(index, 1);
        }
        this._update(list);
      },
    },
    toggle: {
      value: function (token, force) {
        token = handleErrors(token);
        if (this.contains(token)) {
          if (force === undefined || force === false) {
            this.remove(token);
            return false;
          }
          return true;
        } else {
          if (force === undefined || force === true) {
            this.add(token);
            return true;
          }
          return false;
        }
      },
    },
    replace: {
      value: function (token, newToken) {
        if (String(newToken) === "") utils.SyntaxError();
        token = handleErrors(token);
        newToken = handleErrors(newToken);
        var list = getList(this);
        var idx = list.indexOf(token);
        if (idx < 0) return false;
        var idx2 = list.indexOf(newToken);
        if (idx2 < 0) list[idx] = newToken;
        else if (idx < idx2) {
          list[idx] = newToken;
          list.splice(idx2, 1);
        } else list.splice(idx, 1);
        this._update(list);
        return true;
      },
    },
    toString: {
      value: function () {
        return this._getString();
      },
    },
    value: {
      get: function () {
        return this._getString();
      },
      set: function (v) {
        this._setString(v);
        this._update();
      },
    },
    _update: {
      value: function (list) {
        if (list) {
          fixIndex(this, list);
          this._setString(list.join(" ").trim());
        } else fixIndex(this, getList(this));
        this._lastStringValue = this._getString();
      },
    },
  });
  function fixIndex(clist, list) {
    var oldLength = clist._length;
    var i;
    clist._length = list.length;
    for (i = 0; i < list.length; i++) clist[i] = list[i];
    for (; i < oldLength; i++) clist[i] = undefined;
  }
  function handleErrors(token) {
    token = String(token);
    if (token === "") utils.SyntaxError();
    if (/[ \t\r\n\f]/.test(token)) utils.InvalidCharacterError();
    return token;
  }
  function toArray(clist) {
    var length = clist._length;
    var arr = Array(length);
    for (var i = 0; i < length; i++) arr[i] = clist[i];
    return arr;
  }
  function getList(clist) {
    var strProp = clist._getString();
    if (strProp === clist._lastStringValue) return toArray(clist);
    var str = strProp.replace(/(^[ \t\r\n\f]+)|([ \t\r\n\f]+$)/g, "");
    if (str === "") return [];
    else {
      var seen = Object.create(null);
      return str.split(/[ \t\r\n\f]+/g).filter(function (n) {
        var key = "$" + n;
        if (seen[key]) return false;
        seen[key] = true;
        return true;
      });
    }
  }
});
export { require_DOMTokenList };
