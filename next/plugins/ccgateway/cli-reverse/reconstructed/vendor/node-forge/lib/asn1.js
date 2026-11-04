/**
 * node-forge/lib/asn1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_util } from "./util.js";
import { require_oids } from "./oids.js";

//@ chunk-fq0cr76a.js:52411-64596 cjs-fingerprint
var require_asn1 = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_util();
  require_oids();
  var asn1 = (cjsModule.exports = forge.asn1 = forge.asn1 || {});
  asn1.Class = {
    UNIVERSAL: 0,
    APPLICATION: 64,
    CONTEXT_SPECIFIC: 128,
    PRIVATE: 192,
  };
  asn1.Type = {
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
  asn1.maxDepth = 256;
  asn1.create = function (tagClass, type, constructed, value, options) {
    if (forge.util.isArray(value)) {
      var tmp = [];
      for (var i = 0; i < value.length; ++i) if (value[i] !== undefined) tmp.push(value[i]);
      value = tmp;
    }
    var obj = {
      tagClass,
      type,
      constructed,
      composed: constructed || forge.util.isArray(value),
      value,
    };
    if (options && "bitStringContents" in options) {
      obj.bitStringContents = options.bitStringContents;
      obj.original = asn1.copy(obj);
    }
    return obj;
  };
  asn1.copy = function (obj, options) {
    var copy;
    if (forge.util.isArray(obj)) {
      copy = [];
      for (var i = 0; i < obj.length; ++i) copy.push(asn1.copy(obj[i], options));
      return copy;
    }
    if (typeof obj === "string") return obj;
    copy = {
      tagClass: obj.tagClass,
      type: obj.type,
      constructed: obj.constructed,
      composed: obj.composed,
      value: asn1.copy(obj.value, options),
    };
    if (options && !options.excludeBitStringContents) copy.bitStringContents = obj.bitStringContents;
    return copy;
  };
  asn1.equals = function (obj1, obj2, options) {
    if (forge.util.isArray(obj1)) {
      if (!forge.util.isArray(obj2)) return false;
      if (obj1.length !== obj2.length) return false;
      for (var i = 0; i < obj1.length; ++i) if (!asn1.equals(obj1[i], obj2[i])) return false;
      return true;
    }
    if (typeof obj1 !== typeof obj2) return false;
    if (typeof obj1 === "string") return obj1 === obj2;
    var equal =
      obj1.tagClass === obj2.tagClass &&
      obj1.type === obj2.type &&
      obj1.constructed === obj2.constructed &&
      obj1.composed === obj2.composed &&
      asn1.equals(obj1.value, obj2.value);
    if (options && options.includeBitStringContents)
      equal = equal && obj1.bitStringContents === obj2.bitStringContents;
    return equal;
  };
  asn1.getBerValueLength = function (b) {
    var b2 = b.getByte();
    if (b2 === 128) return;
    var length;
    var longForm = b2 & 128;
    if (!longForm) length = b2;
    else length = b.getInt((b2 & 127) << 3);
    return length;
  };
  function _checkBufferLength(bytes, remaining, n) {
    if (n > remaining) {
      var error = Error("Too few bytes to parse DER.");
      error.available = bytes.length();
      error.remaining = remaining;
      error.requested = n;
      throw error;
    }
  }
  var _getValueLength = function (bytes, remaining) {
    var b2 = bytes.getByte();
    remaining--;
    if (b2 === 128) return;
    var length;
    var longForm = b2 & 128;
    if (!longForm) length = b2;
    else {
      var longFormBytes = b2 & 127;
      _checkBufferLength(bytes, remaining, longFormBytes);
      length = bytes.getInt(longFormBytes << 3);
    }
    if (length < 0) throw Error("Negative length: " + length);
    return length;
  };
  asn1.fromDer = function (bytes, options) {
    if (options === undefined)
      options = {
        strict: true,
        parseAllBytes: true,
        decodeBitStrings: true,
      };
    if (typeof options === "boolean")
      options = {
        strict: options,
        parseAllBytes: true,
        decodeBitStrings: true,
      };
    if (!("strict" in options)) options.strict = true;
    if (!("parseAllBytes" in options)) options.parseAllBytes = true;
    if (!("decodeBitStrings" in options)) options.decodeBitStrings = true;
    if (!("maxDepth" in options)) options.maxDepth = asn1.maxDepth;
    if (typeof bytes === "string") bytes = forge.util.createBuffer(bytes);
    var byteCount = bytes.length();
    var value = _fromDer(bytes, bytes.length(), 0, options);
    if (options.parseAllBytes && bytes.length() !== 0) {
      var error = Error("Unparsed DER bytes remain after ASN.1 parsing.");
      error.byteCount = byteCount;
      error.remaining = bytes.length();
      throw error;
    }
    return value;
  };
  function _fromDer(bytes, remaining, depth, options) {
    if (depth >= options.maxDepth) throw Error("ASN.1 parsing error: Max depth exceeded.");
    var start;
    _checkBufferLength(bytes, remaining, 2);
    var b1 = bytes.getByte();
    remaining--;
    var tagClass = b1 & 192;
    var type = b1 & 31;
    start = bytes.length();
    var length = _getValueLength(bytes, remaining);
    remaining -= start - bytes.length();
    if (length !== undefined && length > remaining) {
      if (options.strict) {
        var error = Error("Too few bytes to read ASN.1 value.");
        error.available = bytes.length();
        error.remaining = remaining;
        error.requested = length;
        throw error;
      }
      length = remaining;
    }
    var value;
    var bitStringContents;
    var constructed = (b1 & 32) === 32;
    if (constructed) {
      value = [];
      if (length === undefined)
        for (;;) {
          _checkBufferLength(bytes, remaining, 2);
          if (bytes.bytes(2) === String.fromCharCode(0, 0)) {
            bytes.getBytes(2);
            remaining -= 2;
            break;
          }
          start = bytes.length();
          value.push(_fromDer(bytes, remaining, depth + 1, options));
          remaining -= start - bytes.length();
        }
      else
        while (length > 0) {
          start = bytes.length();
          value.push(_fromDer(bytes, length, depth + 1, options));
          remaining -= start - bytes.length();
          length -= start - bytes.length();
        }
    }
    if (value === undefined && tagClass === asn1.Class.UNIVERSAL && type === asn1.Type.BITSTRING)
      bitStringContents = bytes.bytes(length);
    if (
      value === undefined &&
      options.decodeBitStrings &&
      tagClass === asn1.Class.UNIVERSAL &&
      type === asn1.Type.BITSTRING &&
      length > 1
    ) {
      var savedRead = bytes.read;
      var savedRemaining = remaining;
      var unused = 0;
      if (type === asn1.Type.BITSTRING) {
        _checkBufferLength(bytes, remaining, 1);
        unused = bytes.getByte();
        remaining--;
      }
      if (unused === 0)
        try {
          start = bytes.length();
          var subOptions = {
            strict: true,
            decodeBitStrings: true,
          };
          var composed = _fromDer(bytes, remaining, depth + 1, subOptions);
          var used = start - bytes.length();
          remaining -= used;
          if (type == asn1.Type.BITSTRING) used++;
          var tc = composed.tagClass;
          if (used === length && (tc === asn1.Class.UNIVERSAL || tc === asn1.Class.CONTEXT_SPECIFIC))
            value = [composed];
        } catch (ex) {}
      if (value === undefined) {
        bytes.read = savedRead;
        remaining = savedRemaining;
      }
    }
    if (value === undefined) {
      if (length === undefined) {
        if (options.strict) throw Error("Non-constructed ASN.1 object of indefinite length.");
        length = remaining;
      }
      if (type === asn1.Type.BMPSTRING) {
        value = "";
        for (; length > 0; length -= 2) {
          _checkBufferLength(bytes, remaining, 2);
          value += String.fromCharCode(bytes.getInt16());
          remaining -= 2;
        }
      } else {
        value = bytes.getBytes(length);
        remaining -= length;
      }
    }
    var asn1Options =
      bitStringContents === undefined
        ? null
        : {
            bitStringContents,
          };
    return asn1.create(tagClass, type, constructed, value, asn1Options);
  }
  asn1.toDer = function (obj) {
    var bytes = forge.util.createBuffer();
    var b1 = obj.tagClass | obj.type;
    var value = forge.util.createBuffer();
    var useBitStringContents = false;
    if ("bitStringContents" in obj) {
      useBitStringContents = true;
      if (obj.original) useBitStringContents = asn1.equals(obj, obj.original);
    }
    if (useBitStringContents) value.putBytes(obj.bitStringContents);
    else if (obj.composed) {
      if (obj.constructed) b1 |= 32;
      else value.putByte(0);
      for (var i = 0; i < obj.value.length; ++i)
        if (obj.value[i] !== undefined) value.putBuffer(asn1.toDer(obj.value[i]));
    } else if (obj.type === asn1.Type.BMPSTRING)
      for (var i = 0; i < obj.value.length; ++i) value.putInt16(obj.value.charCodeAt(i));
    else if (
      obj.type === asn1.Type.INTEGER &&
      obj.value.length > 1 &&
      ((obj.value.charCodeAt(0) === 0 && (obj.value.charCodeAt(1) & 128) === 0) ||
        (obj.value.charCodeAt(0) === 255 && (obj.value.charCodeAt(1) & 128) === 128))
    )
      value.putBytes(obj.value.substr(1));
    else value.putBytes(obj.value);
    bytes.putByte(b1);
    if (value.length() <= 127) bytes.putByte(value.length() & 127);
    else {
      var len = value.length();
      var lenBytes = "";
      do {
        lenBytes += String.fromCharCode(len & 255);
        len = len >>> 8;
      } while (len > 0);
      bytes.putByte(lenBytes.length | 128);
      for (var i = lenBytes.length - 1; i >= 0; --i) bytes.putByte(lenBytes.charCodeAt(i));
    }
    bytes.putBuffer(value);
    return bytes;
  };
  asn1.oidToDer = function (oid) {
    var values = oid.split(".");
    var bytes = forge.util.createBuffer();
    bytes.putByte(40 * parseInt(values[0], 10) + parseInt(values[1], 10));
    var last;
    var valueBytes;
    var value;
    var base128Byte;
    for (var i = 2; i < values.length; ++i) {
      last = true;
      valueBytes = [];
      value = parseInt(values[i], 10);
      if (value > 4294967295) throw Error("OID value too large; max is 32-bits.");
      do {
        base128Byte = value & 127;
        value = value >>> 7;
        if (!last) base128Byte |= 128;
        valueBytes.push(base128Byte);
        last = false;
      } while (value > 0);
      for (var n = valueBytes.length - 1; n >= 0; --n) bytes.putByte(valueBytes[n]);
    }
    return bytes;
  };
  asn1.derToOid = function (bytes) {
    var oid;
    if (typeof bytes === "string") bytes = forge.util.createBuffer(bytes);
    var b = bytes.getByte();
    oid = Math.floor(b / 40) + "." + (b % 40);
    var value = 0;
    while (bytes.length() > 0) {
      if (value > 70368744177663) throw Error("OID value too large; max is 53-bits.");
      b = bytes.getByte();
      value = value * 128;
      if (b & 128) value += b & 127;
      else {
        oid += "." + (value + b);
        value = 0;
      }
    }
    return oid;
  };
  asn1.utcTimeToDate = function (utc) {
    var date = new Date();
    var year = parseInt(utc.substr(0, 2), 10);
    year = year >= 50 ? 1900 + year : 2000 + year;
    var MM = parseInt(utc.substr(2, 2), 10) - 1;
    var DD = parseInt(utc.substr(4, 2), 10);
    var hh = parseInt(utc.substr(6, 2), 10);
    var mm = parseInt(utc.substr(8, 2), 10);
    var ss = 0;
    if (utc.length > 11) {
      var c = utc.charAt(10);
      var end = 10;
      if (c !== "+" && c !== "-") {
        ss = parseInt(utc.substr(10, 2), 10);
        end += 2;
      }
    }
    date.setUTCFullYear(year, MM, DD);
    date.setUTCHours(hh, mm, ss, 0);
    if (end) {
      c = utc.charAt(end);
      if (c === "+" || c === "-") {
        var hhoffset = parseInt(utc.substr(end + 1, 2), 10);
        var mmoffset = parseInt(utc.substr(end + 4, 2), 10);
        var offset = hhoffset * 60 + mmoffset;
        offset *= 60000;
        if (c === "+") date.setTime(+date - offset);
        else date.setTime(+date + offset);
      }
    }
    return date;
  };
  asn1.generalizedTimeToDate = function (gentime) {
    var date = new Date();
    var YYYY = parseInt(gentime.substr(0, 4), 10);
    var MM = parseInt(gentime.substr(4, 2), 10) - 1;
    var DD = parseInt(gentime.substr(6, 2), 10);
    var hh = parseInt(gentime.substr(8, 2), 10);
    var mm = parseInt(gentime.substr(10, 2), 10);
    var ss = parseInt(gentime.substr(12, 2), 10);
    var fff = 0;
    var offset = 0;
    var isUTC = false;
    if (gentime.charAt(gentime.length - 1) === "Z") isUTC = true;
    var end = gentime.length - 5;
    var c = gentime.charAt(end);
    if (c === "+" || c === "-") {
      var hhoffset = parseInt(gentime.substr(end + 1, 2), 10);
      var mmoffset = parseInt(gentime.substr(end + 4, 2), 10);
      offset = hhoffset * 60 + mmoffset;
      offset *= 60000;
      if (c === "+") offset *= -1;
      isUTC = true;
    }
    if (gentime.charAt(14) === ".") fff = parseFloat(gentime.substr(14), 10) * 1000;
    if (isUTC) {
      date.setUTCFullYear(YYYY, MM, DD);
      date.setUTCHours(hh, mm, ss, fff);
      date.setTime(+date + offset);
    } else {
      date.setFullYear(YYYY, MM, DD);
      date.setHours(hh, mm, ss, fff);
    }
    return date;
  };
  asn1.dateToUtcTime = function (date) {
    if (typeof date === "string") return date;
    var rval = "";
    var format = [];
    format.push(("" + date.getUTCFullYear()).substr(2));
    format.push("" + (date.getUTCMonth() + 1));
    format.push("" + date.getUTCDate());
    format.push("" + date.getUTCHours());
    format.push("" + date.getUTCMinutes());
    format.push("" + date.getUTCSeconds());
    for (var i = 0; i < format.length; ++i) {
      if (format[i].length < 2) rval += "0";
      rval += format[i];
    }
    rval += "Z";
    return rval;
  };
  asn1.dateToGeneralizedTime = function (date) {
    if (typeof date === "string") return date;
    var rval = "";
    var format = [];
    format.push("" + date.getUTCFullYear());
    format.push("" + (date.getUTCMonth() + 1));
    format.push("" + date.getUTCDate());
    format.push("" + date.getUTCHours());
    format.push("" + date.getUTCMinutes());
    format.push("" + date.getUTCSeconds());
    for (var i = 0; i < format.length; ++i) {
      if (format[i].length < 2) rval += "0";
      rval += format[i];
    }
    rval += "Z";
    return rval;
  };
  asn1.integerToDer = function (x) {
    var rval = forge.util.createBuffer();
    if (x >= -128 && x < 128) return rval.putSignedInt(x, 8);
    if (x >= -32768 && x < 32768) return rval.putSignedInt(x, 16);
    if (x >= -8388608 && x < 8388608) return rval.putSignedInt(x, 24);
    if (x >= -2147483648 && x < 2147483648) return rval.putSignedInt(x, 32);
    var error = Error("Integer too large; max is 32-bits.");
    error.integer = x;
    throw error;
  };
  asn1.derToInteger = function (bytes) {
    if (typeof bytes === "string") bytes = forge.util.createBuffer(bytes);
    var bitLength = bytes.length() * 8;
    if (bitLength > 32) throw Error("Integer too large; max is 32-bits.");
    return bytes.getSignedInt(bitLength);
  };
  asn1.validate = function (obj, v, capture, errors) {
    var rval = false;
    if (
      (obj.tagClass === v.tagClass || typeof v.tagClass === "undefined") &&
      (obj.type === v.type || typeof v.type === "undefined")
    ) {
      if (obj.constructed === v.constructed || typeof v.constructed === "undefined") {
        rval = true;
        if (v.value && forge.util.isArray(v.value)) {
          var j = 0;
          for (var i = 0; rval && i < v.value.length; ++i) {
            var schemaItem = v.value[i];
            rval = !!schemaItem.optional;
            var objChild = obj.value[j];
            if (!objChild) {
              if (!schemaItem.optional) {
                rval = false;
                if (errors)
                  errors.push(
                    "[" +
                      v.name +
                      '] Missing required element. Expected tag class "' +
                      schemaItem.tagClass +
                      '", type "' +
                      schemaItem.type +
                      '"',
                  );
              }
              continue;
            }
            var schemaHasTag =
              typeof schemaItem.tagClass !== "undefined" && typeof schemaItem.type !== "undefined";
            if (
              schemaHasTag &&
              (objChild.tagClass !== schemaItem.tagClass || objChild.type !== schemaItem.type)
            )
              if (schemaItem.optional) {
                rval = true;
                continue;
              } else {
                rval = false;
                if (errors)
                  errors.push(
                    "[" +
                      v.name +
                      "] Tag mismatch. Expected (" +
                      schemaItem.tagClass +
                      "," +
                      schemaItem.type +
                      "), got (" +
                      objChild.tagClass +
                      "," +
                      objChild.type +
                      ")",
                  );
                break;
              }
            var childRval = asn1.validate(objChild, schemaItem, capture, errors);
            if (childRval) {
              ++j;
              rval = true;
            } else if (schemaItem.optional) rval = true;
            else {
              rval = false;
              break;
            }
          }
        }
        if (rval && capture) {
          if (v.capture) capture[v.capture] = obj.value;
          if (v.captureAsn1) capture[v.captureAsn1] = obj;
          if (v.captureBitStringContents && "bitStringContents" in obj)
            capture[v.captureBitStringContents] = obj.bitStringContents;
          if (v.captureBitStringValue && "bitStringContents" in obj) {
            var value;
            if (obj.bitStringContents.length < 2) capture[v.captureBitStringValue] = "";
            else {
              var unused = obj.bitStringContents.charCodeAt(0);
              if (unused !== 0) throw Error("captureBitStringValue only supported for zero unused bits");
              capture[v.captureBitStringValue] = obj.bitStringContents.slice(1);
            }
          }
        }
      } else if (errors)
        errors.push(
          "[" + v.name + '] Expected constructed "' + v.constructed + '", got "' + obj.constructed + '"',
        );
    } else if (errors) {
      if (obj.tagClass !== v.tagClass)
        errors.push("[" + v.name + '] Expected tag class "' + v.tagClass + '", got "' + obj.tagClass + '"');
      if (obj.type !== v.type)
        errors.push("[" + v.name + '] Expected type "' + v.type + '", got "' + obj.type + '"');
    }
    return rval;
  };
  var _nonLatinRegex = /[^\\u0000-\\u00ff]/;
  asn1.prettyPrint = function (obj, level, indentation) {
    var rval = "";
    level = level || 0;
    indentation = indentation || 2;
    if (level > 0)
      rval += `
`;
    var indent = "";
    for (var i = 0; i < level * indentation; ++i) indent += " ";
    switch (((rval += indent + "Tag: "), obj.tagClass)) {
      case asn1.Class.UNIVERSAL:
        rval += "Universal:";
        break;
      case asn1.Class.APPLICATION:
        rval += "Application:";
        break;
      case asn1.Class.CONTEXT_SPECIFIC:
        rval += "Context-Specific:";
        break;
      case asn1.Class.PRIVATE:
        rval += "Private:";
        break;
    }
    if (obj.tagClass === asn1.Class.UNIVERSAL)
      switch (((rval += obj.type), obj.type)) {
        case asn1.Type.NONE:
          rval += " (None)";
          break;
        case asn1.Type.BOOLEAN:
          rval += " (Boolean)";
          break;
        case asn1.Type.INTEGER:
          rval += " (Integer)";
          break;
        case asn1.Type.BITSTRING:
          rval += " (Bit string)";
          break;
        case asn1.Type.OCTETSTRING:
          rval += " (Octet string)";
          break;
        case asn1.Type.NULL:
          rval += " (Null)";
          break;
        case asn1.Type.OID:
          rval += " (Object Identifier)";
          break;
        case asn1.Type.ODESC:
          rval += " (Object Descriptor)";
          break;
        case asn1.Type.EXTERNAL:
          rval += " (External or Instance of)";
          break;
        case asn1.Type.REAL:
          rval += " (Real)";
          break;
        case asn1.Type.ENUMERATED:
          rval += " (Enumerated)";
          break;
        case asn1.Type.EMBEDDED:
          rval += " (Embedded PDV)";
          break;
        case asn1.Type.UTF8:
          rval += " (UTF8)";
          break;
        case asn1.Type.ROID:
          rval += " (Relative Object Identifier)";
          break;
        case asn1.Type.SEQUENCE:
          rval += " (Sequence)";
          break;
        case asn1.Type.SET:
          rval += " (Set)";
          break;
        case asn1.Type.PRINTABLESTRING:
          rval += " (Printable String)";
          break;
        case asn1.Type.IA5String:
          rval += " (IA5String (ASCII))";
          break;
        case asn1.Type.UTCTIME:
          rval += " (UTC time)";
          break;
        case asn1.Type.GENERALIZEDTIME:
          rval += " (Generalized time)";
          break;
        case asn1.Type.BMPSTRING:
          rval += " (BMP String)";
          break;
      }
    else rval += obj.type;
    rval += `
`;
    rval +=
      indent +
      "Constructed: " +
      obj.constructed +
      `
`;
    if (obj.composed) {
      var subvalues = 0;
      var sub = "";
      for (var i = 0; i < obj.value.length; ++i)
        if (obj.value[i] !== undefined) {
          subvalues += 1;
          sub += asn1.prettyPrint(obj.value[i], level + 1, indentation);
          if (i + 1 < obj.value.length) sub += ",";
        }
      rval += indent + "Sub values: " + subvalues + sub;
    } else {
      rval += indent + "Value: ";
      if (obj.type === asn1.Type.OID) {
        var oid = asn1.derToOid(obj.value);
        rval += oid;
        if (forge.pki && forge.pki.oids) {
          if (oid in forge.pki.oids) rval += " (" + forge.pki.oids[oid] + ") ";
        }
      }
      if (obj.type === asn1.Type.INTEGER)
        try {
          rval += asn1.derToInteger(obj.value);
        } catch (ex) {
          rval += "0x" + forge.util.bytesToHex(obj.value);
        }
      else if (obj.type === asn1.Type.BITSTRING) {
        if (obj.value.length > 1) rval += "0x" + forge.util.bytesToHex(obj.value.slice(1));
        else rval += "(none)";
        if (obj.value.length > 0) {
          var unused = obj.value.charCodeAt(0);
          if (unused == 1) rval += " (1 unused bit shown)";
          else if (unused > 1) rval += " (" + unused + " unused bits shown)";
        }
      } else if (obj.type === asn1.Type.OCTETSTRING) {
        if (!_nonLatinRegex.test(obj.value)) rval += "(" + obj.value + ") ";
        rval += "0x" + forge.util.bytesToHex(obj.value);
      } else if (obj.type === asn1.Type.UTF8)
        try {
          rval += forge.util.decodeUtf8(obj.value);
        } catch (e) {
          if (e.message === "URI malformed")
            rval += "0x" + forge.util.bytesToHex(obj.value) + " (malformed UTF8)";
          else throw e;
        }
      else if (obj.type === asn1.Type.PRINTABLESTRING || obj.type === asn1.Type.IA5String) rval += obj.value;
      else if (_nonLatinRegex.test(obj.value)) rval += "0x" + forge.util.bytesToHex(obj.value);
      else if (obj.value.length === 0) rval += "[null]";
      else rval += obj.value;
    }
    return rval;
  };
});
export { require_asn1 };
