/**
 * @mixmark-io/domino/lib/DOMTokenList.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ee } from "./utils.js";

//@ chunk-vwj6ccer.js:29363-31379 cjs-fingerprint
var xn = x(function (gd, bs) {
  var ln = ee();
  bs.exports = gs;
  function gs(e, t) {
    ((this._getString = e),
      (this._setString = t),
      (this._length = 0),
      (this._lastStringValue = ""),
      this._update());
  }
  Object.defineProperties(gs.prototype, {
    length: {
      get: function () {
        return this._length;
      },
    },
    item: {
      value: function (e) {
        var t = Mt(this);
        if (e < 0 || e >= t.length) return null;
        return t[e];
      },
    },
    contains: {
      value: function (e) {
        e = String(e);
        var t = Mt(this);
        return t.indexOf(e) > -1;
      },
    },
    add: {
      value: function () {
        var e = Mt(this);
        for (var t = 0, r = arguments.length; t < r; t++) {
          var a = sr(arguments[t]);
          if (e.indexOf(a) < 0) e.push(a);
        }
        this._update(e);
      },
    },
    remove: {
      value: function () {
        var e = Mt(this);
        for (var t = 0, r = arguments.length; t < r; t++) {
          var a = sr(arguments[t]),
            index = e.indexOf(a);
          if (index > -1) e.splice(index, 1);
        }
        this._update(e);
      },
    },
    toggle: {
      value: function (t, r) {
        if (((t = sr(t)), this.contains(t))) {
          if (r === void 0 || r === !1) return (this.remove(t), !1);
          return !0;
        } else {
          if (r === void 0 || r === !0) return (this.add(t), !0);
          return !1;
        }
      },
    },
    replace: {
      value: function (t, r) {
        if (String(r) === "") ln.SyntaxError();
        ((t = sr(t)), (r = sr(r)));
        var a = Mt(this),
          index = a.indexOf(t);
        if (index < 0) return !1;
        var index_2 = a.indexOf(r);
        if (index_2 < 0) a[index] = r;
        else if (index < index_2) ((a[index] = r), a.splice(index_2, 1));
        else a.splice(index, 1);
        return (this._update(a), !0);
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
      set: function (e) {
        (this._setString(e), this._update());
      },
    },
    _update: {
      value: function (e) {
        if (e) (ms(this, e), this._setString(e.join(" ").trim()));
        else ms(this, Mt(this));
        this._lastStringValue = this._getString();
      },
    },
  });
  function ms(e, t) {
    var _length = e._length,
      a;
    e._length = t.length;
    for (a = 0; a < t.length; a++) e[a] = t[a];
    for (; a < _length; a++) e[a] = void 0;
  }
  function sr(e) {
    if (((e = String(e)), e === "")) ln.SyntaxError();
    if (/[ \t\r\n\f]/.test(e)) ln.InvalidCharacterError();
    return e;
  }
  function Ml(e) {
    var _length = e._length,
      r = Array(_length);
    for (var a = 0; a < _length; a++) r[a] = e[a];
    return r;
  }
  function Mt(e) {
    var _getString = e._getString();
    if (_getString === e._lastStringValue) return Ml(e);
    var replaced = _getString.replace(/(^[ \t\r\n\f]+)|([ \t\r\n\f]+$)/g, "");
    if (replaced === "") return [];
    else {
      var create = Object.create(null);
      return replaced.split(/[ \t\r\n\f]+/g).filter(function (s) {
        var c = "$" + s;
        if (create[c]) return !1;
        return ((create[c] = !0), !0);
      });
    }
  }
});

export { xn };
