/**
 * protobufjs/src/parse.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_tokenize } from "./tokenize.js";
import { require_root } from "./root.js";
import { require_type } from "./type.js";
import { require_field } from "./field.js";
import { require_mapfield } from "./mapfield.js";
import { require_oneof } from "./oneof.js";
import { require_enum } from "./enum.js";
import { require_service } from "./service.js";
import { require_method } from "./method.js";
import { require_object } from "./object.js";
import { require_types } from "./types.js";
import { require_util_2 } from "./util.js";

//@ chunk-3k21nfa0.js:132937-141305 cjs-fingerprint
var require_parse = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = parse;
  parse.filename = null;
  parse.defaults = {
    keepCase: false,
  };
  var tokenize = require_tokenize();
  var Root = require_root();
  var Type = require_type();
  var Field = require_field();
  var MapField = require_mapfield();
  var OneOf = require_oneof();
  var Enum = require_enum();
  var Service = require_service();
  var Method = require_method();
  var ReflectionObject = require_object();
  var types = require_types();
  var util = require_util_2();
  var base10Re = /^[1-9][0-9]*$/;
  var base10NegRe = /^-?[1-9][0-9]*$/;
  var base16Re = /^0[x][0-9a-fA-F]+$/;
  var base16NegRe = /^-?0[x][0-9a-fA-F]+$/;
  var base8Re = /^0[0-7]+$/;
  var base8NegRe = /^-?0[0-7]+$/;
  var numberRe = util.patterns.numberRe;
  var nameRe = /^[a-zA-Z_][a-zA-Z_0-9]*$/;
  var typeRefRe = util.patterns.typeRefRe;
  function parse(source, root, options) {
    if (!(root instanceof Root)) {
      options = root;
      root = new Root();
    }
    if (!options) options = parse.defaults;
    var preferTrailingComment = options.preferTrailingComment || false;
    var tokenizer = tokenize(source, options.alternateCommentMode || false);
    var { next, push, peek, skip, cmnt } = tokenizer;
    var head = true;
    var pkg;
    var imports;
    var weakImports;
    var edition = "proto2";
    var ptr = root;
    var topLevelObjects = [];
    var topLevelOptions = {};
    var applyCase = options.keepCase
      ? function (name) {
          return name;
        }
      : util.camelCase;
    function resolveFileFeatures() {
      topLevelObjects.forEach((obj) => {
        obj._edition = edition;
        Object.keys(topLevelOptions).forEach((opt) => {
          if (obj.getOption(opt) !== undefined) return;
          obj.setOption(opt, topLevelOptions[opt], true);
        });
      });
    }
    function illegal(token, name, insideTryCatch) {
      var filename = parse.filename;
      if (!insideTryCatch) parse.filename = null;
      return Error(
        "illegal " +
          (name || "token") +
          " '" +
          token +
          "' (" +
          (filename ? filename + ", " : "") +
          "line " +
          tokenizer.line +
          ")",
      );
    }
    function readString() {
      var values = [];
      var token;
      do {
        if ((token = next()) !== '"' && token !== "'") throw illegal(token);
        values.push(next());
        skip(token);
        token = peek();
      } while (token === '"' || token === "'");
      return values.join("");
    }
    function readValue(acceptTypeRef) {
      var token = next();
      switch (token) {
        case "'":
        case '"':
          push(token);
          return readString();
        case "true":
        case "TRUE":
          return true;
        case "false":
        case "FALSE":
          return false;
      }
      try {
        return parseNumber(token, true);
      } catch (e) {
        if (acceptTypeRef && typeRefRe.test(token)) return token;
        throw illegal(token, "value");
      }
    }
    function readRanges(target, acceptStrings) {
      var token;
      var start;
      do
        if (acceptStrings && ((token = peek()) === '"' || token === "'")) {
          var str = readString();
          target.push(str);
          if (edition >= 2023) throw illegal(str, "id");
        } else
          try {
            target.push([(start = parseId(next())), skip("to", true) ? parseId(next()) : start]);
          } catch (err) {
            if (acceptStrings && typeRefRe.test(token) && edition >= 2023) target.push(token);
            else throw err;
          }
      while (skip(",", true));
      var dummy = {
        options: undefined,
      };
      dummy.setOption = function (name, value) {
        if (this.options === undefined) this.options = {};
        this.options[name] = value;
      };
      ifBlock(
        dummy,
        function (token) {
          if (token === "option") {
            parseOption(dummy, token);
            skip(";");
          } else throw illegal(token);
        },
        function () {
          parseInlineOptions(dummy);
        },
      );
    }
    function parseNumber(token, insideTryCatch) {
      var sign = 1;
      if (token.charAt(0) === "-") {
        sign = -1;
        token = token.substring(1);
      }
      switch (token) {
        case "inf":
        case "INF":
        case "Inf":
          return sign * (1 / 0);
        case "nan":
        case "NAN":
        case "Nan":
        case "NaN":
          return NaN;
        case "0":
          return 0;
      }
      if (base10Re.test(token)) return sign * parseInt(token, 10);
      if (base16Re.test(token)) return sign * parseInt(token, 16);
      if (base8Re.test(token)) return sign * parseInt(token, 8);
      if (numberRe.test(token)) return sign * parseFloat(token);
      throw illegal(token, "number", insideTryCatch);
    }
    function parseId(token, acceptNegative) {
      switch (token) {
        case "max":
        case "MAX":
        case "Max":
          return 536870911;
        case "0":
          return 0;
      }
      if (!acceptNegative && token.charAt(0) === "-") throw illegal(token, "id");
      if (base10NegRe.test(token)) return parseInt(token, 10);
      if (base16NegRe.test(token)) return parseInt(token, 16);
      if (base8NegRe.test(token)) return parseInt(token, 8);
      throw illegal(token, "id");
    }
    function parsePackage() {
      if (pkg !== undefined) throw illegal("package");
      pkg = next();
      if (!typeRefRe.test(pkg)) throw illegal(pkg, "name");
      ptr = ptr.define(pkg);
      skip(";");
    }
    function parseImport() {
      var token = peek();
      var whichImports;
      switch (token) {
        case "weak":
          whichImports = weakImports || (weakImports = []);
          next();
          break;
        case "public":
          next();
        default:
          whichImports = imports || (imports = []);
          break;
      }
      token = readString();
      skip(";");
      whichImports.push(token);
    }
    function parseSyntax() {
      skip("=");
      edition = readString();
      if (edition < 2023) throw illegal(edition, "syntax");
      skip(";");
    }
    function parseEdition() {
      skip("=");
      edition = readString();
      if (!["2023"].includes(edition)) throw illegal(edition, "edition");
      skip(";");
    }
    function parseCommon(parent, token, depth) {
      switch (((depth = util.checkDepth(depth)), token)) {
        case "option":
          parseOption(parent, token);
          skip(";");
          return true;
        case "message":
          parseType(parent, token, depth + 1);
          return true;
        case "enum":
          parseEnum(parent, token);
          return true;
        case "service":
          parseService(parent, token, depth + 1);
          return true;
        case "extend":
          parseExtension(parent, token, depth);
          return true;
      }
      return false;
    }
    function ifBlock(obj, fnIf, fnElse) {
      var trailingLine = tokenizer.line;
      if (obj) {
        if (typeof obj.comment !== "string") obj.comment = cmnt();
        obj.filename = parse.filename;
      }
      if (skip("{", true)) {
        var token;
        while ((token = next()) !== "}") fnIf(token);
        skip(";", true);
      } else {
        if (fnElse) fnElse();
        skip(";");
        if (obj && (typeof obj.comment !== "string" || preferTrailingComment))
          obj.comment = cmnt(trailingLine) || obj.comment;
      }
    }
    function parseType(parent, token, depth) {
      depth = util.checkDepth(depth);
      if (!nameRe.test((token = next()))) throw illegal(token, "type name");
      var type = new Type(token);
      ifBlock(type, function (token) {
        if (parseCommon(type, token, depth)) return;
        switch (token) {
          case "map":
            parseMapField(type, token);
            break;
          case "required":
            if (edition !== "proto2") throw illegal(token);
          case "repeated":
            parseField(type, token, undefined, depth + 1);
            break;
          case "optional":
            if (edition === "proto3") parseField(type, "proto3_optional", undefined, depth + 1);
            else if (edition !== "proto2") throw illegal(token);
            else parseField(type, "optional", undefined, depth + 1);
            break;
          case "oneof":
            parseOneOf(type, token, depth + 1);
            break;
          case "extensions":
            readRanges(type.extensions || (type.extensions = []));
            break;
          case "reserved":
            readRanges(type.reserved || (type.reserved = []), true);
            break;
          default:
            if (edition === "proto2" || !typeRefRe.test(token)) throw illegal(token);
            push(token);
            parseField(type, "optional", undefined, depth + 1);
            break;
        }
      });
      parent.add(type);
      if (parent === ptr) topLevelObjects.push(type);
    }
    function parseField(parent, rule, extend, depth) {
      var type = next();
      if (type === "group") {
        parseGroup(parent, rule, depth);
        return;
      }
      while (type.endsWith(".") || peek().startsWith(".")) type += next();
      if (!typeRefRe.test(type)) throw illegal(type, "type");
      var name = next();
      if (!nameRe.test(name)) throw illegal(name, "name");
      name = applyCase(name);
      skip("=");
      var field = new Field(name, parseId(next()), type, rule, extend);
      ifBlock(
        field,
        function (token) {
          if (token === "option") {
            parseOption(field, token);
            skip(";");
          } else throw illegal(token);
        },
        function () {
          parseInlineOptions(field);
        },
      );
      if (rule === "proto3_optional") {
        var oneof = new OneOf("_" + name);
        field.setOption("proto3_optional", true);
        oneof.add(field);
        parent.add(oneof);
      } else parent.add(field);
      if (parent === ptr) topLevelObjects.push(field);
    }
    function parseGroup(parent, rule, depth) {
      depth = util.checkDepth(depth);
      if (edition >= 2023) throw illegal("group");
      var name = next();
      if (!nameRe.test(name)) throw illegal(name, "name");
      var fieldName = util.lcFirst(name);
      if (name === fieldName) name = util.ucFirst(name);
      skip("=");
      var id = parseId(next());
      var type = new Type(name);
      type.group = true;
      var field = new Field(fieldName, id, name, rule);
      field.filename = parse.filename;
      ifBlock(type, function (token) {
        switch (token) {
          case "option":
            parseOption(type, token);
            skip(";");
            break;
          case "required":
          case "repeated":
            parseField(type, token, undefined, depth + 1);
            break;
          case "optional":
            if (edition === "proto3") parseField(type, "proto3_optional", undefined, depth + 1);
            else parseField(type, "optional", undefined, depth + 1);
            break;
          case "message":
            parseType(type, token, depth + 1);
            break;
          case "enum":
            parseEnum(type, token);
            break;
          case "reserved":
            readRanges(type.reserved || (type.reserved = []), true);
            break;
          default:
            throw illegal(token);
        }
      });
      parent.add(type).add(field);
    }
    function parseMapField(parent) {
      skip("<");
      var keyType = next();
      if (types.mapKey[keyType] === undefined) throw illegal(keyType, "type");
      skip(",");
      var valueType = next();
      if (!typeRefRe.test(valueType)) throw illegal(valueType, "type");
      skip(">");
      var name = next();
      if (!nameRe.test(name)) throw illegal(name, "name");
      skip("=");
      var field = new MapField(applyCase(name), parseId(next()), keyType, valueType);
      ifBlock(
        field,
        function (token) {
          if (token === "option") {
            parseOption(field, token);
            skip(";");
          } else throw illegal(token);
        },
        function () {
          parseInlineOptions(field);
        },
      );
      parent.add(field);
    }
    function parseOneOf(parent, token, depth) {
      if (!nameRe.test((token = next()))) throw illegal(token, "name");
      var oneof = new OneOf(applyCase(token));
      ifBlock(oneof, function (token) {
        if (token === "option") {
          parseOption(oneof, token);
          skip(";");
        } else {
          push(token);
          parseField(oneof, "optional", undefined, depth);
        }
      });
      parent.add(oneof);
    }
    function parseEnum(parent, token) {
      if (!nameRe.test((token = next()))) throw illegal(token, "name");
      var enm = new Enum(token);
      ifBlock(enm, function (token) {
        switch (token) {
          case "option":
            parseOption(enm, token);
            skip(";");
            break;
          case "reserved":
            readRanges(enm.reserved || (enm.reserved = []), true);
            if (enm.reserved === undefined) enm.reserved = [];
            break;
          default:
            parseEnumValue(enm, token);
        }
      });
      parent.add(enm);
      if (parent === ptr) topLevelObjects.push(enm);
    }
    function parseEnumValue(parent, token) {
      if (!nameRe.test(token)) throw illegal(token, "name");
      skip("=");
      var value = parseId(next(), true);
      var dummy = {
        options: undefined,
      };
      dummy.getOption = function (name) {
        return this.options[name];
      };
      dummy.setOption = function (name, value) {
        ReflectionObject.prototype.setOption.call(dummy, name, value);
      };
      dummy.setParsedOption = function () {
        return;
      };
      ifBlock(
        dummy,
        function (token) {
          if (token === "option") {
            parseOption(dummy, token);
            skip(";");
          } else throw illegal(token);
        },
        function () {
          parseInlineOptions(dummy);
        },
      );
      parent.add(token, value, dummy.comment, dummy.parsedOptions || dummy.options);
    }
    function parseOption(parent, token) {
      var option;
      var propName;
      var isOption = true;
      if (token === "option") token = next();
      while (token !== "=") {
        if (token === "(") {
          var parensValue = next();
          skip(")");
          token = "(" + parensValue + ")";
        }
        if (isOption) {
          isOption = false;
          if (token.includes(".") && !token.includes("(")) {
            var tokens = token.split(".");
            option = tokens[0] + ".";
            token = tokens[1];
            continue;
          }
          option = token;
        } else propName = propName ? (propName += token) : token;
        token = next();
      }
      var name = propName ? option.concat(propName) : option;
      var optionValue = parseOptionValue(parent, name);
      propName = propName && propName[0] === "." ? propName.slice(1) : propName;
      option = option && option[option.length - 1] === "." ? option.slice(0, -1) : option;
      setParsedOption(parent, option, optionValue, propName);
    }
    function parseOptionValue(parent, name, depth) {
      depth = util.checkDepth(depth);
      if (skip("{", true)) {
        var objectResult = {};
        while (!skip("}", true)) {
          if (!nameRe.test((token = next()))) throw illegal(token, "name");
          if (token === null) throw illegal(token, "end of input");
          var value;
          var propName = token;
          skip(":", true);
          if (peek() === "{") value = parseOptionValue(parent, name + "." + token, depth + 1);
          else if (peek() === "[") {
            value = [];
            var lastValue;
            if (skip("[", true)) {
              do {
                lastValue = readValue(true);
                value.push(lastValue);
              } while (skip(",", true));
              skip("]");
              if (typeof lastValue !== "undefined") setOption(parent, name + "." + token, lastValue);
            }
          } else {
            value = readValue(true);
            setOption(parent, name + "." + token, value);
          }
          var prevValue = objectResult[propName];
          if (prevValue) value = [].concat(prevValue).concat(value);
          if (propName !== "__proto__") objectResult[propName] = value;
          skip(",", true);
          skip(";", true);
        }
        return objectResult;
      }
      var simpleValue = readValue(true);
      setOption(parent, name, simpleValue);
      return simpleValue;
    }
    function setOption(parent, name, value) {
      if (ptr === parent && /^features\./.test(name)) {
        topLevelOptions[name] = value;
        return;
      }
      if (parent.setOption) parent.setOption(name, value);
    }
    function setParsedOption(parent, name, value, propName) {
      if (parent.setParsedOption) parent.setParsedOption(name, value, propName);
    }
    function parseInlineOptions(parent) {
      if (skip("[", true)) {
        do parseOption(parent, "option");
        while (skip(",", true));
        skip("]");
      }
      return parent;
    }
    function parseService(parent, token, depth) {
      depth = util.checkDepth(depth);
      if (!nameRe.test((token = next()))) throw illegal(token, "service name");
      var service = new Service(token);
      ifBlock(service, function (token) {
        if (parseCommon(service, token, depth)) return;
        if (token === "rpc") parseMethod(service, token);
        else throw illegal(token);
      });
      parent.add(service);
      if (parent === ptr) topLevelObjects.push(service);
    }
    function parseMethod(parent, token) {
      var commentText = cmnt();
      var type = token;
      if (!nameRe.test((token = next()))) throw illegal(token, "name");
      var name = token;
      var requestType;
      var requestStream;
      var responseType;
      var responseStream;
      skip("(");
      if (skip("stream", true)) requestStream = true;
      if (!typeRefRe.test((token = next()))) throw illegal(token);
      requestType = token;
      skip(")");
      skip("returns");
      skip("(");
      if (skip("stream", true)) responseStream = true;
      if (!typeRefRe.test((token = next()))) throw illegal(token);
      responseType = token;
      skip(")");
      var method = new Method(name, type, requestType, responseType, requestStream, responseStream);
      method.comment = commentText;
      ifBlock(method, function (token) {
        if (token === "option") {
          parseOption(method, token);
          skip(";");
        } else throw illegal(token);
      });
      parent.add(method);
    }
    function parseExtension(parent, token, depth) {
      if (!typeRefRe.test((token = next()))) throw illegal(token, "reference");
      var reference = token;
      ifBlock(null, function (token) {
        switch (token) {
          case "required":
          case "repeated":
            parseField(parent, token, reference, depth + 1);
            break;
          case "optional":
            if (edition === "proto3") parseField(parent, "proto3_optional", reference, depth + 1);
            else parseField(parent, "optional", reference, depth + 1);
            break;
          default:
            if (edition === "proto2" || !typeRefRe.test(token)) throw illegal(token);
            push(token);
            parseField(parent, "optional", reference, depth + 1);
            break;
        }
      });
    }
    var token;
    while ((token = next()) !== null)
      switch (token) {
        case "package":
          if (!head) throw illegal(token);
          parsePackage();
          break;
        case "import":
          if (!head) throw illegal(token);
          parseImport();
          break;
        case "syntax":
          if (!head) throw illegal(token);
          parseSyntax();
          break;
        case "edition":
          if (!head) throw illegal(token);
          parseEdition();
          break;
        case "option":
          parseOption(ptr, token);
          skip(";", true);
          break;
        default:
          if (parseCommon(ptr, token, 0)) {
            head = false;
            continue;
          }
          throw illegal(token);
      }
    resolveFileFeatures();
    parse.filename = null;
    return {
      package: pkg,
      imports,
      weakImports,
      root,
    };
  }
});
export { require_parse };
