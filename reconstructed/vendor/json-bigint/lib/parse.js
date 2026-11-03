/**
 * json-bigint/lib/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: json-bigint@1.0.0
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_bignumber } from "../../bignumber.js/bignumber.js";

//@ chunk-na3pph4p.js:39504-43194 cjs-fingerprint
var require_parse = x(function (cjsExports, cjsModule) {
  var BigNumber = null;
  var suspectProtoRx =
    /(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])/;
  var suspectConstructorRx =
    /(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)/;
  var json_parse = function (options) {
    var _options = {
      strict: false,
      storeAsString: false,
      alwaysParseAsBig: false,
      useNativeBigInt: false,
      protoAction: "error",
      constructorAction: "error",
    };
    if (options !== undefined && options !== null) {
      if (options.strict === true) _options.strict = true;
      if (options.storeAsString === true) _options.storeAsString = true;
      _options.alwaysParseAsBig = options.alwaysParseAsBig === true ? options.alwaysParseAsBig : false;
      _options.useNativeBigInt = options.useNativeBigInt === true ? options.useNativeBigInt : false;
      if (typeof options.constructorAction !== "undefined")
        if (
          options.constructorAction === "error" ||
          options.constructorAction === "ignore" ||
          options.constructorAction === "preserve"
        )
          _options.constructorAction = options.constructorAction;
        else
          throw Error(
            `Incorrect value for constructorAction option, must be "error", "ignore" or undefined but passed ${options.constructorAction}`,
          );
      if (typeof options.protoAction !== "undefined")
        if (
          options.protoAction === "error" ||
          options.protoAction === "ignore" ||
          options.protoAction === "preserve"
        )
          _options.protoAction = options.protoAction;
        else
          throw Error(
            `Incorrect value for protoAction option, must be "error", "ignore" or undefined but passed ${options.protoAction}`,
          );
    }
    var at;
    var ch;
    var escapee = {
      '"': '"',
      "\\": "\\",
      "/": "/",
      b: "\b",
      f: "\f",
      n: `
`,
      r: "\r",
      t: "\t",
    };
    var text;
    var error = function (m) {
      throw {
        name: "SyntaxError",
        message: m,
        at,
        text,
      };
    };
    var next = function (c) {
      if (c && c !== ch) error("Expected '" + c + "' instead of '" + ch + "'");
      ch = text.charAt(at);
      at += 1;
      return ch;
    };
    var number = function () {
      var number;
      var string = "";
      if (ch === "-") {
        string = "-";
        next("-");
      }
      while (ch >= "0" && ch <= "9") {
        string += ch;
        next();
      }
      if (ch === ".") {
        string += ".";
        while (next() && ch >= "0" && ch <= "9") string += ch;
      }
      if (ch === "e" || ch === "E") {
        string += ch;
        next();
        if (ch === "-" || ch === "+") {
          string += ch;
          next();
        }
        while (ch >= "0" && ch <= "9") {
          string += ch;
          next();
        }
      }
      number = +string;
      if (!isFinite(number)) error("Bad number");
      else {
        if (BigNumber == null) BigNumber = require_bignumber();
        if (string.length > 15)
          return _options.storeAsString
            ? string
            : _options.useNativeBigInt
              ? BigInt(string)
              : new BigNumber(string);
        else
          return !_options.alwaysParseAsBig
            ? number
            : _options.useNativeBigInt
              ? BigInt(number)
              : new BigNumber(number);
      }
    };
    var string = function () {
      var hex;
      var i;
      var string = "";
      var uffff;
      if (ch === '"') {
        var startAt = at;
        while (next()) {
          if (ch === '"') {
            if (at - 1 > startAt) string += text.substring(startAt, at - 1);
            next();
            return string;
          }
          if (ch === "\\") {
            if (at - 1 > startAt) string += text.substring(startAt, at - 1);
            next();
            if (ch === "u") {
              uffff = 0;
              for (i = 0; i < 4; i += 1) {
                hex = parseInt(next(), 16);
                if (!isFinite(hex)) break;
                uffff = uffff * 16 + hex;
              }
              string += String.fromCharCode(uffff);
            } else if (typeof escapee[ch] === "string") string += escapee[ch];
            else break;
            startAt = at;
          }
        }
      }
      error("Bad string");
    };
    var white = function () {
      while (ch && ch <= " ") next();
    };
    var word = function () {
      switch (ch) {
        case "t":
          next("t");
          next("r");
          next("u");
          next("e");
          return true;
        case "f":
          next("f");
          next("a");
          next("l");
          next("s");
          next("e");
          return false;
        case "n":
          next("n");
          next("u");
          next("l");
          next("l");
          return null;
      }
      error("Unexpected '" + ch + "'");
    };
    var value;
    var array = function () {
      var array = [];
      if (ch === "[") {
        next("[");
        white();
        if (ch === "]") {
          next("]");
          return array;
        }
        while (ch) {
          array.push(value());
          white();
          if (ch === "]") {
            next("]");
            return array;
          }
          next(",");
          white();
        }
      }
      error("Bad array");
    };
    var object = function () {
      var key;
      var object = Object.create(null);
      if (ch === "{") {
        next("{");
        white();
        if (ch === "}") {
          next("}");
          return object;
        }
        while (ch) {
          key = string();
          white();
          next(":");
          if (_options.strict === true && Object.hasOwnProperty.call(object, key))
            error('Duplicate key "' + key + '"');
          if (suspectProtoRx.test(key) === true) {
            if (_options.protoAction === "error") error("Object contains forbidden prototype property");
            else if (_options.protoAction === "ignore") value();
            else object[key] = value();
          } else if (suspectConstructorRx.test(key) === true) {
            if (_options.constructorAction === "error")
              error("Object contains forbidden constructor property");
            else if (_options.constructorAction === "ignore") value();
            else object[key] = value();
          } else object[key] = value();
          white();
          if (ch === "}") {
            next("}");
            return object;
          }
          next(",");
          white();
        }
      }
      error("Bad object");
    };
    value = function () {
      switch ((white(), ch)) {
        case "{":
          return object();
        case "[":
          return array();
        case '"':
          return string();
        case "-":
          return number();
        default:
          return ch >= "0" && ch <= "9" ? number() : word();
      }
    };
    return function (source, reviver) {
      var result;
      text = source + "";
      at = 0;
      ch = " ";
      result = value();
      white();
      if (ch) error("Syntax error");
      return typeof reviver === "function"
        ? (function walk(holder, key) {
            var k;
            var v;
            var value = holder[key];
            if (value && typeof value === "object")
              Object.keys(value).forEach(function (k) {
                v = walk(value, k);
                if (v !== undefined) value[k] = v;
                else delete value[k];
              });
            return reviver.call(holder, key, value);
          })(
            {
              "": result,
            },
            "",
          )
        : result;
    };
  };
  cjsModule.exports = json_parse;
});
export { require_parse };
