/**
 * node-forge/lib/asn1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";
import { Ja } from "./oids.js";

//@ chunk-fq0cr76a.js:52411-64596 cjs-fingerprint
var Xi = x(function (ffe, _T) {
  var Rr = Tn();
  Zn();
  Ja();
  var _t = (_T.exports = Rr.asn1 = Rr.asn1 || {});
  _t.Class = { UNIVERSAL: 0, APPLICATION: 64, CONTEXT_SPECIFIC: 128, PRIVATE: 192 };
  _t.Type = {
    NONE: 0,
    BOOLEAN: 1,
    INTEGER: 2,
    BITSTRING: 3,
    OCTETSTRING: 4,
    NULL: 5,
    OID: 6,
    ODESC: 7,
    EXTERNAL: 8,
    REAL: 9,
    ENUMERATED: 10,
    EMBEDDED: 11,
    UTF8: 12,
    ROID: 13,
    SEQUENCE: 16,
    SET: 17,
    PRINTABLESTRING: 19,
    IA5STRING: 22,
    UTCTIME: 23,
    GENERALIZEDTIME: 24,
    BMPSTRING: 30,
  };
  _t.maxDepth = 256;
  _t.create = function (e, n, r, s, h) {
    if (Rr.util.isArray(s)) {
      var y = [];
      for (var b = 0; b < s.length; ++b) if (s[b] !== void 0) y.push(s[b]);
      s = y;
    }
    var S = { tagClass: e, type: n, constructed: r, composed: r || Rr.util.isArray(s), value: s };
    if (h && "bitStringContents" in h)
      ((S.bitStringContents = h.bitStringContents), (S.original = _t.copy(S)));
    return S;
  };
  _t.copy = function (e, n) {
    var r;
    if (Rr.util.isArray(e)) {
      r = [];
      for (var s = 0; s < e.length; ++s) r.push(_t.copy(e[s], n));
      return r;
    }
    if (typeof e === "string") return e;
    if (
      ((r = {
        tagClass: e.tagClass,
        type: e.type,
        constructed: e.constructed,
        composed: e.composed,
        value: _t.copy(e.value, n),
      }),
      n && !n.excludeBitStringContents)
    )
      r.bitStringContents = e.bitStringContents;
    return r;
  };
  _t.equals = function (e, n, r) {
    if (Rr.util.isArray(e)) {
      if (!Rr.util.isArray(n)) return !1;
      if (e.length !== n.length) return !1;
      for (var s = 0; s < e.length; ++s) if (!_t.equals(e[s], n[s])) return !1;
      return !0;
    }
    if (typeof e !== typeof n) return !1;
    if (typeof e === "string") return e === n;
    var h =
      e.tagClass === n.tagClass &&
      e.type === n.type &&
      e.constructed === n.constructed &&
      e.composed === n.composed &&
      _t.equals(e.value, n.value);
    if (r && r.includeBitStringContents) h = h && e.bitStringContents === n.bitStringContents;
    return h;
  };
  _t.getBerValueLength = function (e) {
    var byte = e.getByte();
    if (byte === 128) return;
    var r,
      s = byte & 128;
    if (!s) r = byte;
    else r = e.getInt((byte & 127) << 3);
    return r;
  };
  function gf(e, n, r) {
    if (r > n) {
      var s = Error("Too few bytes to parse DER.");
      throw ((s.available = e.length()), (s.remaining = n), (s.requested = r), s);
    }
  }
  var p3 = function (e, n) {
    var byte = e.getByte();
    if ((n--, byte === 128)) return;
    var s,
      h = byte & 128;
    if (!h) s = byte;
    else {
      var y = byte & 127;
      (gf(e, n, y), (s = e.getInt(y << 3)));
    }
    if (s < 0) throw Error("Negative length: " + s);
    return s;
  };
  _t.fromDer = function (e, n) {
    if (n === void 0) n = { strict: !0, parseAllBytes: !0, decodeBitStrings: !0 };
    if (typeof n === "boolean") n = { strict: n, parseAllBytes: !0, decodeBitStrings: !0 };
    if (!("strict" in n)) n.strict = !0;
    if (!("parseAllBytes" in n)) n.parseAllBytes = !0;
    if (!("decodeBitStrings" in n)) n.decodeBitStrings = !0;
    if (!("maxDepth" in n)) n.maxDepth = _t.maxDepth;
    if (typeof e === "string") e = Rr.util.createBuffer(e);
    var r = e.length(),
      s = Hh(e, e.length(), 0, n);
    if (n.parseAllBytes && e.length() !== 0) {
      var h = Error("Unparsed DER bytes remain after ASN.1 parsing.");
      throw ((h.byteCount = r), (h.remaining = e.length()), h);
    }
    return s;
  };
  function Hh(e, n, r, s) {
    if (r >= s.maxDepth) throw Error("ASN.1 parsing error: Max depth exceeded.");
    var h;
    gf(e, n, 2);
    var byte = e.getByte();
    n--;
    var b = byte & 192,
      S = byte & 31;
    h = e.length();
    var w = p3(e, n);
    if (((n -= h - e.length()), w !== void 0 && w > n)) {
      if (s.strict) {
        var R = Error("Too few bytes to read ASN.1 value.");
        throw ((R.available = e.length()), (R.remaining = n), (R.requested = w), R);
      }
      w = n;
    }
    var D,
      O,
      L = (byte & 32) === 32;
    if (L)
      if (((D = []), w === void 0))
        for (;;) {
          if ((gf(e, n, 2), e.bytes(2) === String.fromCharCode(0, 0))) {
            (e.getBytes(2), (n -= 2));
            break;
          }
          ((h = e.length()), D.push(Hh(e, n, r + 1, s)), (n -= h - e.length()));
        }
      else
        while (w > 0)
          ((h = e.length()), D.push(Hh(e, w, r + 1, s)), (n -= h - e.length()), (w -= h - e.length()));
    if (D === void 0 && b === _t.Class.UNIVERSAL && S === _t.Type.BITSTRING) O = e.bytes(w);
    if (D === void 0 && s.decodeBitStrings && b === _t.Class.UNIVERSAL && S === _t.Type.BITSTRING && w > 1) {
      var read = e.read,
        K = n,
        q = 0;
      if (S === _t.Type.BITSTRING) (gf(e, n, 1), (q = e.getByte()), n--);
      if (q === 0)
        try {
          h = e.length();
          var Z = { strict: !0, decodeBitStrings: !0 },
            J = Hh(e, n, r + 1, Z),
            ie = h - e.length();
          if (((n -= ie), S == _t.Type.BITSTRING)) ie++;
          var tagClass = J.tagClass;
          if (ie === w && (tagClass === _t.Class.UNIVERSAL || tagClass === _t.Class.CONTEXT_SPECIFIC))
            D = [J];
        } catch (error) {}
      if (D === void 0) ((e.read = read), (n = K));
    }
    if (D === void 0) {
      if (w === void 0) {
        if (s.strict) throw Error("Non-constructed ASN.1 object of indefinite length.");
        w = n;
      }
      if (S === _t.Type.BMPSTRING) {
        D = "";
        for (; w > 0; w -= 2) (gf(e, n, 2), (D += String.fromCharCode(e.getInt16())), (n -= 2));
      } else ((D = e.getBytes(w)), (n -= w));
    }
    var Se = O === void 0 ? null : { bitStringContents: O };
    return _t.create(b, S, L, D, Se);
  }
  _t.toDer = function (e) {
    var buffer = Rr.util.createBuffer(),
      r = e.tagClass | e.type,
      buffer_2 = Rr.util.createBuffer(),
      h = !1;
    if ("bitStringContents" in e) {
      if (((h = !0), e.original)) h = _t.equals(e, e.original);
    }
    if (h) buffer_2.putBytes(e.bitStringContents);
    else if (e.composed) {
      if (e.constructed) r |= 32;
      else buffer_2.putByte(0);
      for (var y = 0; y < e.value.length; ++y)
        if (e.value[y] !== void 0) buffer_2.putBuffer(_t.toDer(e.value[y]));
    } else if (e.type === _t.Type.BMPSTRING)
      for (var y = 0; y < e.value.length; ++y) buffer_2.putInt16(e.value.charCodeAt(y));
    else if (
      e.type === _t.Type.INTEGER &&
      e.value.length > 1 &&
      ((e.value.charCodeAt(0) === 0 && (e.value.charCodeAt(1) & 128) === 0) ||
        (e.value.charCodeAt(0) === 255 && (e.value.charCodeAt(1) & 128) === 128))
    )
      buffer_2.putBytes(e.value.substr(1));
    else buffer_2.putBytes(e.value);
    if ((buffer.putByte(r), buffer_2.length() <= 127)) buffer.putByte(buffer_2.length() & 127);
    else {
      var b = buffer_2.length(),
        S = "";
      do ((S += String.fromCharCode(b & 255)), (b = b >>> 8));
      while (b > 0);
      buffer.putByte(S.length | 128);
      for (var y = S.length - 1; y >= 0; --y) buffer.putByte(S.charCodeAt(y));
    }
    return (buffer.putBuffer(buffer_2), buffer);
  };
  _t.oidToDer = function (e) {
    var parts = e.split("."),
      buffer = Rr.util.createBuffer();
    buffer.putByte(40 * parseInt(parts[0], 10) + parseInt(parts[1], 10));
    var s, h, y, b;
    for (var S = 2; S < parts.length; ++S) {
      if (((s = !0), (h = []), (y = parseInt(parts[S], 10)), y > 4294967295))
        throw Error("OID value too large; max is 32-bits.");
      do {
        if (((b = y & 127), (y = y >>> 7), !s)) b |= 128;
        (h.push(b), (s = !1));
      } while (y > 0);
      for (var w = h.length - 1; w >= 0; --w) buffer.putByte(h[w]);
    }
    return buffer;
  };
  _t.derToOid = function (e) {
    var n;
    if (typeof e === "string") e = Rr.util.createBuffer(e);
    var byte = e.getByte();
    n = Math.floor(byte / 40) + "." + (byte % 40);
    var s = 0;
    while (e.length() > 0) {
      if (s > 70368744177663) throw Error("OID value too large; max is 53-bits.");
      if (((byte = e.getByte()), (s = s * 128), byte & 128)) s += byte & 127;
      else ((n += "." + (s + byte)), (s = 0));
    }
    return n;
  };
  _t.utcTimeToDate = function (e) {
    var date = new Date(),
      r = parseInt(e.substr(0, 2), 10);
    r = r >= 50 ? 1900 + r : 2000 + r;
    var s = parseInt(e.substr(2, 2), 10) - 1,
      h = parseInt(e.substr(4, 2), 10),
      y = parseInt(e.substr(6, 2), 10),
      b = parseInt(e.substr(8, 2), 10),
      S = 0;
    if (e.length > 11) {
      var charAt = e.charAt(10),
        R = 10;
      if (charAt !== "+" && charAt !== "-") ((S = parseInt(e.substr(10, 2), 10)), (R += 2));
    }
    if ((date.setUTCFullYear(r, s, h), date.setUTCHours(y, b, S, 0), R)) {
      if (((charAt = e.charAt(R)), charAt === "+" || charAt === "-")) {
        var D = parseInt(e.substr(R + 1, 2), 10),
          O = parseInt(e.substr(R + 4, 2), 10),
          L = D * 60 + O;
        if (((L *= 60000), charAt === "+")) date.setTime(+date - L);
        else date.setTime(+date + L);
      }
    }
    return date;
  };
  _t.generalizedTimeToDate = function (e) {
    var date = new Date(),
      r = parseInt(e.substr(0, 4), 10),
      s = parseInt(e.substr(4, 2), 10) - 1,
      h = parseInt(e.substr(6, 2), 10),
      y = parseInt(e.substr(8, 2), 10),
      b = parseInt(e.substr(10, 2), 10),
      S = parseInt(e.substr(12, 2), 10),
      w = 0,
      R = 0,
      D = !1;
    if (e.charAt(e.length - 1) === "Z") D = !0;
    var O = e.length - 5,
      charAt = e.charAt(O);
    if (charAt === "+" || charAt === "-") {
      var V = parseInt(e.substr(O + 1, 2), 10),
        K = parseInt(e.substr(O + 4, 2), 10);
      if (((R = V * 60 + K), (R *= 60000), charAt === "+")) R *= -1;
      D = !0;
    }
    if (e.charAt(14) === ".") w = parseFloat(e.substr(14), 10) * 1000;
    if (D) (date.setUTCFullYear(r, s, h), date.setUTCHours(y, b, S, w), date.setTime(+date + R));
    else (date.setFullYear(r, s, h), date.setHours(y, b, S, w));
    return date;
  };
  _t.dateToUtcTime = function (e) {
    if (typeof e === "string") return e;
    var n = "",
      r = [];
    (r.push(("" + e.getUTCFullYear()).substr(2)),
      r.push("" + (e.getUTCMonth() + 1)),
      r.push("" + e.getUTCDate()),
      r.push("" + e.getUTCHours()),
      r.push("" + e.getUTCMinutes()),
      r.push("" + e.getUTCSeconds()));
    for (var s = 0; s < r.length; ++s) {
      if (r[s].length < 2) n += "0";
      n += r[s];
    }
    return ((n += "Z"), n);
  };
  _t.dateToGeneralizedTime = function (e) {
    if (typeof e === "string") return e;
    var n = "",
      r = [];
    (r.push("" + e.getUTCFullYear()),
      r.push("" + (e.getUTCMonth() + 1)),
      r.push("" + e.getUTCDate()),
      r.push("" + e.getUTCHours()),
      r.push("" + e.getUTCMinutes()),
      r.push("" + e.getUTCSeconds()));
    for (var s = 0; s < r.length; ++s) {
      if (r[s].length < 2) n += "0";
      n += r[s];
    }
    return ((n += "Z"), n);
  };
  _t.integerToDer = function (e) {
    var buffer = Rr.util.createBuffer();
    if (e >= -128 && e < 128) return buffer.putSignedInt(e, 8);
    if (e >= -32768 && e < 32768) return buffer.putSignedInt(e, 16);
    if (e >= -8388608 && e < 8388608) return buffer.putSignedInt(e, 24);
    if (e >= -2147483648 && e < 2147483648) return buffer.putSignedInt(e, 32);
    var r = Error("Integer too large; max is 32-bits.");
    throw ((r.integer = e), r);
  };
  _t.derToInteger = function (e) {
    if (typeof e === "string") e = Rr.util.createBuffer(e);
    var n = e.length() * 8;
    if (n > 32) throw Error("Integer too large; max is 32-bits.");
    return e.getSignedInt(n);
  };
  _t.validate = function (e, n, r, s) {
    var h = !1;
    if (
      (e.tagClass === n.tagClass || typeof n.tagClass > "u") &&
      (e.type === n.type || typeof n.type > "u")
    ) {
      if (e.constructed === n.constructed || typeof n.constructed > "u") {
        if (((h = !0), n.value && Rr.util.isArray(n.value))) {
          var y = 0;
          for (var b = 0; h && b < n.value.length; ++b) {
            var S = n.value[b];
            h = !!S.optional;
            var w = e.value[y];
            if (!w) {
              if (!S.optional) {
                if (((h = !1), s))
                  s.push(
                    "[" +
                      n.name +
                      '] Missing required element. Expected tag class "' +
                      S.tagClass +
                      '", type "' +
                      S.type +
                      '"',
                  );
              }
              continue;
            }
            var R = typeof S.tagClass < "u" && typeof S.type < "u";
            if (R && (w.tagClass !== S.tagClass || w.type !== S.type))
              if (S.optional) {
                h = !0;
                continue;
              } else {
                if (((h = !1), s))
                  s.push(
                    "[" +
                      n.name +
                      "] Tag mismatch. Expected (" +
                      S.tagClass +
                      "," +
                      S.type +
                      "), got (" +
                      w.tagClass +
                      "," +
                      w.type +
                      ")",
                  );
                break;
              }
            var validate = _t.validate(w, S, r, s);
            if (validate) (++y, (h = !0));
            else if (S.optional) h = !0;
            else {
              h = !1;
              break;
            }
          }
        }
        if (h && r) {
          if (n.capture) r[n.capture] = e.value;
          if (n.captureAsn1) r[n.captureAsn1] = e;
          if (n.captureBitStringContents && "bitStringContents" in e)
            r[n.captureBitStringContents] = e.bitStringContents;
          if (n.captureBitStringValue && "bitStringContents" in e) {
            var O;
            if (e.bitStringContents.length < 2) r[n.captureBitStringValue] = "";
            else {
              var code = e.bitStringContents.charCodeAt(0);
              if (code !== 0) throw Error("captureBitStringValue only supported for zero unused bits");
              r[n.captureBitStringValue] = e.bitStringContents.slice(1);
            }
          }
        }
      } else if (s)
        s.push("[" + n.name + '] Expected constructed "' + n.constructed + '", got "' + e.constructed + '"');
    } else if (s) {
      if (e.tagClass !== n.tagClass)
        s.push("[" + n.name + '] Expected tag class "' + n.tagClass + '", got "' + e.tagClass + '"');
      if (e.type !== n.type) s.push("[" + n.name + '] Expected type "' + n.type + '", got "' + e.type + '"');
    }
    return h;
  };
  var xT = /[^\\u0000-\\u00ff]/;
  _t.prettyPrint = function (e, n, r) {
    var s = "";
    if (((n = n || 0), (r = r || 2), n > 0))
      s += `
`;
    var h = "";
    for (var y = 0; y < n * r; ++y) h += " ";
    switch (((s += h + "Tag: "), e.tagClass)) {
      case _t.Class.UNIVERSAL:
        s += "Universal:";
        break;
      case _t.Class.APPLICATION:
        s += "Application:";
        break;
      case _t.Class.CONTEXT_SPECIFIC:
        s += "Context-Specific:";
        break;
      case _t.Class.PRIVATE:
        s += "Private:";
        break;
    }
    if (e.tagClass === _t.Class.UNIVERSAL)
      switch (((s += e.type), e.type)) {
        case _t.Type.NONE:
          s += " (None)";
          break;
        case _t.Type.BOOLEAN:
          s += " (Boolean)";
          break;
        case _t.Type.INTEGER:
          s += " (Integer)";
          break;
        case _t.Type.BITSTRING:
          s += " (Bit string)";
          break;
        case _t.Type.OCTETSTRING:
          s += " (Octet string)";
          break;
        case _t.Type.NULL:
          s += " (Null)";
          break;
        case _t.Type.OID:
          s += " (Object Identifier)";
          break;
        case _t.Type.ODESC:
          s += " (Object Descriptor)";
          break;
        case _t.Type.EXTERNAL:
          s += " (External or Instance of)";
          break;
        case _t.Type.REAL:
          s += " (Real)";
          break;
        case _t.Type.ENUMERATED:
          s += " (Enumerated)";
          break;
        case _t.Type.EMBEDDED:
          s += " (Embedded PDV)";
          break;
        case _t.Type.UTF8:
          s += " (UTF8)";
          break;
        case _t.Type.ROID:
          s += " (Relative Object Identifier)";
          break;
        case _t.Type.SEQUENCE:
          s += " (Sequence)";
          break;
        case _t.Type.SET:
          s += " (Set)";
          break;
        case _t.Type.PRINTABLESTRING:
          s += " (Printable String)";
          break;
        case _t.Type.IA5String:
          s += " (IA5String (ASCII))";
          break;
        case _t.Type.UTCTIME:
          s += " (UTC time)";
          break;
        case _t.Type.GENERALIZEDTIME:
          s += " (Generalized time)";
          break;
        case _t.Type.BMPSTRING:
          s += " (BMP String)";
          break;
      }
    else s += e.type;
    if (
      ((s += `
`),
      (s +=
        h +
        "Constructed: " +
        e.constructed +
        `
`),
      e.composed)
    ) {
      var b = 0,
        S = "";
      for (var y = 0; y < e.value.length; ++y)
        if (e.value[y] !== void 0) {
          if (((b += 1), (S += _t.prettyPrint(e.value[y], n + 1, r)), y + 1 < e.value.length)) S += ",";
        }
      s += h + "Sub values: " + b + S;
    } else {
      if (((s += h + "Value: "), e.type === _t.Type.OID)) {
        var derToOid = _t.derToOid(e.value);
        if (((s += derToOid), Rr.pki && Rr.pki.oids)) {
          if (derToOid in Rr.pki.oids) s += " (" + Rr.pki.oids[derToOid] + ") ";
        }
      }
      if (e.type === _t.Type.INTEGER)
        try {
          s += _t.derToInteger(e.value);
        } catch (error) {
          s += "0x" + Rr.util.bytesToHex(e.value);
        }
      else if (e.type === _t.Type.BITSTRING) {
        if (e.value.length > 1) s += "0x" + Rr.util.bytesToHex(e.value.slice(1));
        else s += "(none)";
        if (e.value.length > 0) {
          var code = e.value.charCodeAt(0);
          if (code == 1) s += " (1 unused bit shown)";
          else if (code > 1) s += " (" + code + " unused bits shown)";
        }
      } else if (e.type === _t.Type.OCTETSTRING) {
        if (!xT.test(e.value)) s += "(" + e.value + ") ";
        s += "0x" + Rr.util.bytesToHex(e.value);
      } else if (e.type === _t.Type.UTF8)
        try {
          s += Rr.util.decodeUtf8(e.value);
        } catch (error) {
          if (error.message === "URI malformed")
            s += "0x" + Rr.util.bytesToHex(e.value) + " (malformed UTF8)";
          else throw error;
        }
      else if (e.type === _t.Type.PRINTABLESTRING || e.type === _t.Type.IA5String) s += e.value;
      else if (xT.test(e.value)) s += "0x" + Rr.util.bytesToHex(e.value);
      else if (e.value.length === 0) s += "[null]";
      else s += e.value;
    }
    return s;
  };
});

export { Xi };
