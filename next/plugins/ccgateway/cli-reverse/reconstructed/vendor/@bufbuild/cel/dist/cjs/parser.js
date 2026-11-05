/**
 * @bufbuild/cel/dist/cjs/parser.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_builder } from "./builder.js";
import { require_logic_manager } from "./logic-manager.js";

//@ chunk-qg41pqt6.js:532879-597883 cjs-fingerprint
var require_parser = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ParseSyntaxError = cjsExports.ParseError = undefined;
  cjsExports.parse = parse;
  var runtime;
  (function (runtime) {
    class GrammarLocation {
      source;
      start;
      constructor(source, start) {
        this.source = source;
        this.start = start;
      }
      toString() {
        return String(this.source);
      }
      offset(loc) {
        return {
          line: loc.line + this.start.line - 1,
          column: loc.line === 1 ? loc.column + this.start.column - 1 : loc.column,
          offset: loc.offset + this.start.offset,
        };
      }
      static offsetStart(range) {
        if (range.source instanceof GrammarLocation) return range.source.offset(range.start);
        return range.start;
      }
      static offsetEnd(range) {
        if (range.source instanceof GrammarLocation) return range.source.offset(range.end);
        return range.end;
      }
    }
    runtime.GrammarLocation = GrammarLocation;
    function padEnd(str, targetLength, padString) {
      padString = padString || " ";
      if (str.length > targetLength) return str;
      targetLength -= str.length;
      padString += padString.repeat(targetLength);
      return str + padString.slice(0, targetLength);
    }
    runtime.padEnd = padEnd;
    class ParseFailure {}
    runtime.ParseFailure = ParseFailure;
    function isFailure(r) {
      return !r.success;
    }
    runtime.isFailure = isFailure;
    function getLine(input, offset) {
      let line = 1;
      for (let i = 0; i < offset; i++)
        if (input[i] === "\r") {
          if (
            input[i + 1] ===
            `
`
          )
            i++;
          line++;
        } else if (
          input[i] ===
          `
`
        )
          line++;
      return line;
    }
    function getColumn(input, offset) {
      let column = 1;
      for (let i = offset; i > 0; i--) {
        if (
          [
            `
`,
            "\r",
          ].includes(input[i - 1])
        )
          break;
        column++;
      }
      return column;
    }
    function getLocation(source, input, start, remainder) {
      return {
        source,
        start: {
          offset: input.length - start.length,
          line: getLine(input, input.length - start.length),
          column: getColumn(input, input.length - start.length),
        },
        end: {
          offset: input.length - remainder.length,
          line: getLine(input, input.length - remainder.length),
          column: getColumn(input, input.length - remainder.length),
        },
      };
    }
    runtime.getLocation = getLocation;
    function getRange(source, input, start, remainder) {
      return {
        source,
        start: input.length - start.length,
        end: input.length - remainder.length,
      };
    }
    runtime.getRange = getRange;
    function getText(start, remainder) {
      return start.slice(0, remainder.length > 0 ? -remainder.length : undefined);
    }
    runtime.getText = getText;
  })(runtime || (runtime = {}));
  class ParseError extends Error {
    rawMessage;
    location;
    constructor(message, location, name = "parse error") {
      super(ParseError.#e(message, location));
      this.name = name;
      this.rawMessage = message;
      this.location = location;
    }
    static #e(message, location) {
      return (
        `${location.source !== undefined ? String(location.source) : "<input>"}:${location.start.line}:${location.start.column}: ` +
        message
      );
    }
  }
  cjsExports.ParseError = ParseError;
  class ParseSyntaxError extends ParseError {
    expected;
    found;
    constructor(expected, found, location, name = "syntax error") {
      super(ParseSyntaxError.#e(expected, found), location, name);
      this.expected = expected;
      this.found = found;
    }
    static #e(expected, found) {
      function encode(s) {
        return (
          "'" +
          s.replace(/[\\\x07\b\f\n\r\t\v']/g, (match) => {
            switch (match) {
              case "\\":
                return "\\\\";
              case "\x07":
                return "\\x07";
              case "\b":
                return "\\b";
              case "\f":
                return "\\f";
              case `
`:
                return "\\n";
              case "\r":
                return "\\r";
              case "\t":
                return "\\t";
              case "\v":
                return "\\v";
              case "'":
                return "\\'";
              default:
                throw Error(
                  "Unexpected string encoding replacement character. This should be an unreachable error.",
                );
            }
          }) +
          "'"
        );
      }
      function describeExpected(expected) {
        let descriptions = [
          ...new Set(
            expected.map((e) => {
              if (e.type === "literal") return encode(e.value);
              return e.value;
            }),
          ),
        ];
        switch ((descriptions.sort(), descriptions.length)) {
          case 1:
            return descriptions[0];
          case 2:
            return `${descriptions[0]} or ${descriptions[1]}`;
          default:
            return descriptions.slice(0, -1).join(", ") + ", or " + descriptions[descriptions.length - 1];
        }
      }
      function describeFound(found) {
        return found.length === 1 ? found : "end of input";
      }
      return "found " + describeFound(found) + " but expecting " + describeExpected(expected);
    }
  }
  cjsExports.ParseSyntaxError = ParseSyntaxError;
  var builder_js_1 = require_builder();
  var logic_manager_js_1 = require_logic_manager();
  var builder = new builder_js_1.default();
  var item2 = {
    type: "any",
    value: "any character",
  };
  var item40 = {
    type: "class",
    value: "/^[\\t\\n\\f\\r ]/g",
  };
  var item41 = {
    type: "other",
    value: "whitespace",
  };
  var item47 = {
    type: "literal",
    value: "//",
  };
  var item50 = {
    type: "class",
    value: "/^[^\\r\\n]/g",
  };
  var item55 = {
    type: "class",
    value: "/^[\\r\\n]/g",
  };
  var item56 = {
    type: "other",
    value: "new line",
  };
  var item58 = {
    type: "other",
    value: "comment",
  };
  var item75 = {
    type: "literal",
    value: "-",
  };
  var item81 = {
    type: "other",
    value: "digit",
  };
  var item83 = {
    type: "literal",
    value: ".",
  };
  var item93 = {
    type: "class",
    value: "/^[+\\-]/g",
  };
  var item104 = {
    type: "other",
    value: "float literal",
  };
  var item114 = {
    type: "literal",
    value: "0x",
  };
  var item124 = {
    type: "class",
    value: "/^[uU]/g",
  };
  var item127 = {
    type: "other",
    value: "unsigned integer literal",
  };
  var item143 = {
    type: "other",
    value: "integer literal",
  };
  var item153 = {
    type: "class",
    value: "/^[rR]/g",
  };
  var item158 = {
    type: "literal",
    value: '"""',
  };
  var item171 = {
    type: "literal",
    value: "'''",
  };
  var item182 = {
    type: "literal",
    value: '"',
  };
  var item194 = {
    type: "literal",
    value: "'",
  };
  var item222 = {
    type: "literal",
    value: "\\",
  };
  var item224 = {
    type: "class",
    value: "/^[xX]/g",
  };
  var item233 = {
    type: "other",
    value: "byte value",
  };
  var item239 = {
    type: "literal",
    value: "\\u",
  };
  var item247 = {
    type: "literal",
    value: "\\U",
  };
  var item259 = {
    type: "class",
    value: "/^[0-3]/g",
  };
  var item265 = {
    type: "other",
    value: "escaped bytes",
  };
  var item266 = {
    type: "other",
    value: "byte sequence",
  };
  var item272 = {
    type: "class",
    value: "/^[abfnrtv]/g",
  };
  var item278 = {
    type: "class",
    value: "/^[\"'`\\\\?]/g",
  };
  var item279 = {
    type: "other",
    value: "escaped character",
  };
  var item326 = {
    type: "other",
    value: "quoted character sequence",
  };
  var item328 = {
    type: "other",
    value: "string literal",
  };
  var item334 = {
    type: "class",
    value: "/^[bB]/g",
  };
  var item338 = {
    type: "other",
    value: "bytes literal",
  };
  var item345 = {
    type: "literal",
    value: "true",
  };
  var item347 = {
    type: "literal",
    value: "false",
  };
  var item349 = {
    type: "other",
    value: "boolean literal",
  };
  var item355 = {
    type: "literal",
    value: "null",
  };
  var item361 = {
    type: "other",
    value: "null literal",
  };
  var item374 = {
    type: "class",
    value: "/^[_a-zA-Z]/g",
  };
  var item379 = {
    type: "other",
    value: "identifier",
  };
  var item381 = {
    type: "literal",
    value: "(",
  };
  var item386 = {
    type: "literal",
    value: ",",
  };
  var item388 = {
    type: "literal",
    value: ")",
  };
  var item408 = {
    type: "other",
    value: "selector",
  };
  var item413 = {
    type: "literal",
    value: "{",
  };
  var item423 = {
    type: "literal",
    value: ":",
  };
  var item432 = {
    type: "literal",
    value: "}",
  };
  var item451 = {
    type: "literal",
    value: "[",
  };
  var item456 = {
    type: "literal",
    value: "]",
  };
  var item524 = {
    type: "literal",
    value: "!",
  };
  var item540 = {
    type: "class",
    value: "/^[*\\/%]/g",
  };
  var item577 = {
    type: "literal",
    value: "<=",
  };
  var item579 = {
    type: "literal",
    value: "<",
  };
  var item581 = {
    type: "literal",
    value: ">=",
  };
  var item583 = {
    type: "literal",
    value: ">",
  };
  var item585 = {
    type: "literal",
    value: "==",
  };
  var item587 = {
    type: "literal",
    value: "!=",
  };
  var item591 = {
    type: "literal",
    value: "in",
  };
  var item593 = {
    type: "other",
    value: "relational operator",
  };
  var item601 = {
    type: "literal",
    value: "&&",
  };
  var item607 = {
    type: "literal",
    value: "||",
  };
  var item616 = {
    type: "literal",
    value: "?",
  };
  var item624 = {
    type: "end",
    value: "end of input",
  };
  function parse(input, options = {}) {
    let parse$source = options.grammarSource;
    let result = item1(input);
    if (result.success === true) return result.value;
    let remainder = input;
    let failedExpectations = [];
    for (let e of result.failedExpectations) {
      if (e.remainder.length < remainder.length) {
        remainder = e.remainder;
        failedExpectations = [];
      }
      if (e.remainder.length === remainder.length) failedExpectations.push(e);
    }
    throw new ParseSyntaxError(
      failedExpectations.map((e) => e.expectation),
      remainder.slice(0, 1),
      runtime.getLocation(parse$source, input, remainder, remainder),
    );
    function item103(offset, digits) {
      return builder.newDoubleExpr(offset(), digits);
    }
    function item126(offset, digits) {
      return builder.newUnsignedInt64Expr(offset(), digits);
    }
    function item142(offset, digits) {
      return builder.newInt64Expr(offset(), digits);
    }
    function item235(value) {
      return parseInt(value, 16);
    }
    function item243(value) {
      return parseInt(value, 16);
    }
    function item251(value) {
      return parseInt(value, 16);
    }
    function item264(value) {
      return parseInt(value, 8);
    }
    function item273(value) {
      switch (value) {
        case "a":
          return "\x07";
        case "b":
          return "\b";
        case "f":
          return "\f";
        case "n":
          return `
`;
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "v":
          return "\v";
      }
      throw Error();
    }
    function item327(offset, bytes) {
      return builder.newStringExpr(offset(), bytes);
    }
    function item337(offset, bytes) {
      return builder.newBytesExpr(offset(), bytes);
    }
    function item348(offset, keyword) {
      return builder.newBoolExpr(offset(), keyword);
    }
    function item360(offset) {
      return builder.newNullExpr(offset());
    }
    function item378(error, id) {
      if (
        [
          "true",
          "false",
          "null",
          "in",
          "as",
          "break",
          "const",
          "continue",
          "else",
          "for",
          "function",
          "if",
          "import",
          "let",
          "loop",
          "package",
          "namespace",
          "return",
          "var",
          "void",
          "while",
        ].includes(id)
      )
        error("reserved identifier");
      return id;
    }
    function item390(offset, identifier, args) {
      return builder.newCallExpr(offset(), identifier, args);
    }
    function item407(error, selector) {
      if (["true", "false", "null", "in"].includes(selector)) error("reserved keyword");
      return selector;
    }
    function item427(offset, key, value) {
      return builder.newStructEntry(offset(), key, value);
    }
    function item434(offset, dot, name, entries) {
      return builder.newStructExpr(offset(), entries, (dot !== null ? dot : "") + name.join("."));
    }
    function item441(offset, name) {
      return builder.newIdentExpr(offset(), name);
    }
    function item458(offset, elements) {
      return builder.newListExpr(offset(), elements);
    }
    function item472(offset, key, value) {
      return builder.newMapEntry(offset(), key, value);
    }
    function item481(offset, entries) {
      return builder.newStructExpr(offset(), entries);
    }
    function item497(offset, field) {
      return (prevExpr) => builder.newSelectExpr(offset(), prevExpr, field);
    }
    function item506(offset, func, args) {
      return (prevExpr) => builder.newMemberCallExpr(offset(), prevExpr, func, args);
    }
    function item513(offset, index) {
      return (prevExpr) => builder.newCallExpr(offset(), "_[_]", [prevExpr, index]);
    }
    function item516(primary, tail) {
      if (tail.length === 0) return primary;
      return tail.reduce((expr, op) => op(expr), primary);
    }
    function item529(offset, ops, expr) {
      if (ops.length % 2 === 0) return expr;
      if (expr.exprKind.case === "callExpr" && expr.exprKind.value.function === `${ops[0]}_`)
        return expr.exprKind.value.args[0];
      return builder.newCallExpr(offset(), `${ops[0]}_`, [expr]);
    }
    function item541(o) {
      return `_${o}_`;
    }
    function item544(offset, operator, nextExpr) {
      return (prevExpr) => builder.newCallExpr(offset(), operator, [prevExpr, nextExpr]);
    }
    function item546(unary, tail) {
      if (tail === null) return unary;
      return tail.reduce((expr, op) => op(expr), unary);
    }
    function item557(o) {
      return `_${o}_`;
    }
    function item559(offset, operator, nextExpr) {
      return (prevExpr) => builder.newCallExpr(offset(), operator, [prevExpr, nextExpr]);
    }
    function item561(multiplication, tail) {
      if (tail === null) return multiplication;
      return tail.reduce((expr, op) => op(expr), multiplication);
    }
    function item588(operator) {
      return `_${operator}_`;
    }
    function item592() {
      return "@in";
    }
    function item595(offset, operator, nextExpr) {
      return (prevExpr) => builder.newCallExpr(offset(), operator, [prevExpr, nextExpr]);
    }
    function item597(addition, tail) {
      if (tail === null) return addition;
      return tail.reduce((expr, op) => op(expr), addition);
    }
    function item603(offset, relation) {
      if (relation.length === 1) return relation[0];
      let logicManager = logic_manager_js_1.default.newBalancingLogicManager(builder, "_&&_", relation[0]);
      for (let i = 1; i < relation.length; i += 1) logicManager.addTerm(offset(), relation[i]);
      return logicManager.toExpr();
    }
    function item609(offset, and) {
      if (and.length === 1) return and[0];
      let logicManager = logic_manager_js_1.default.newBalancingLogicManager(builder, "_||_", and[0]);
      for (let i = 1; i < and.length; i += 1) logicManager.addTerm(offset(), and[i]);
      return logicManager.toExpr();
    }
    function item621(t, f) {
      return [t, f];
    }
    function item623(offset, or, tail) {
      if (tail === null) return or;
      return builder.newCallExpr(offset(), "_?_:_", [or, ...tail]);
    }
    function item1(text) {
      let result = item4(text);
      if (result.success === true) {
        if (result.remainder.length === 0) return result;
        return {
          success: false,
          remainder: result.remainder,
          failedExpectations: [
            {
              expectation: item624,
              remainder: result.remainder,
            },
          ],
        };
      }
      return result;
    }
    function item4(text) {
      let result = item5(text);
      if (result.success === true)
        return {
          success: true,
          value: item623(() => input.length - text.length, result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item5(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = item8(remainder);
      failedExpectations.push(...result0.failedExpectations);
      if (result0.success === false)
        return {
          success: false,
          remainder: result0.remainder,
          failedExpectations,
        };
      remainder = result0.remainder;
      let result1 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result1?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result1[0].length);
      let result2 = item611(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result0.value, result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item8(text) {
      let result = item10(text);
      if (result.success === true)
        return {
          success: true,
          value: item609(() => input.length - text.length, result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item10(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let r = remainder;
        if (values.length > 0) {
          let result = item604(r);
          failedExpectations.push(...result.failedExpectations);
          if (result.success === false) break;
          r = result.remainder;
        }
        let result = item12(r);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      if (values.length < 1)
        return {
          success: false,
          remainder: text,
          failedExpectations,
        };
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item12(text) {
      let result = item14(text);
      if (result.success === true)
        return {
          success: true,
          value: item603(() => input.length - text.length, result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item14(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let r = remainder;
        if (values.length > 0) {
          let result = item598(r);
          failedExpectations.push(...result.failedExpectations);
          if (result.success === false) break;
          r = result.remainder;
        }
        let result = item16(r);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      if (values.length < 1)
        return {
          success: false,
          remainder: text,
          failedExpectations,
        };
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item16(text) {
      let result = item17(text);
      if (result.success === true)
        return {
          success: true,
          value: item597(result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item17(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = item20(remainder);
      failedExpectations.push(...result0.failedExpectations);
      if (result0.success === false)
        return {
          success: false,
          remainder: result0.remainder,
          failedExpectations,
        };
      remainder = result0.remainder;
      let result1 = item563(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: [result0.value, result1.value],
        remainder,
        failedExpectations,
      };
    }
    function item20(text) {
      let result = item21(text);
      if (result.success === true)
        return {
          success: true,
          value: item561(result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item21(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = item24(remainder);
      failedExpectations.push(...result0.failedExpectations);
      if (result0.success === false)
        return {
          success: false,
          remainder: result0.remainder,
          failedExpectations,
        };
      remainder = result0.remainder;
      let result1 = item548(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: [result0.value, result1.value],
        remainder,
        failedExpectations,
      };
    }
    function item24(text) {
      let result = item25(text);
      if (result.success === true)
        return {
          success: true,
          value: item546(result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item25(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = item28(remainder);
      failedExpectations.push(...result0.failedExpectations);
      if (result0.success === false)
        return {
          success: false,
          remainder: result0.remainder,
          failedExpectations,
        };
      remainder = result0.remainder;
      let result1 = item531(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: [result0.value, result1.value],
        remainder,
        failedExpectations,
      };
    }
    function item28(text) {
      let choices = [item30, item517];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item30(text) {
      let result = item31(text);
      if (result.success === true)
        return {
          success: true,
          value: item516(result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item31(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item63(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = item484(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result1.value, result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item33(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = item34(remainder);
      failedExpectations.push(...result0.failedExpectations);
      if (result0.success === false)
        return {
          success: false,
          remainder: result0.remainder,
          failedExpectations,
        };
      remainder = result0.remainder;
      let result1 = item42(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = item59(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result0.value, result1.value, result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item34(text) {
      let result = item36(text);
      if (result.success === true) return result;
      return {
        success: true,
        value: null,
        remainder: text,
        failedExpectations: result.failedExpectations,
      };
    }
    function item36(text) {
      let result = item37(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item41,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item37(text) {
      let matches = text.match(/^([\t\n\f\r ])+/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item40,
            remainder: text,
          },
        ],
      };
    }
    function item42(text) {
      let result = item44(text);
      if (result.success === true) return result;
      return {
        success: true,
        value: null,
        remainder: text,
        failedExpectations: result.failedExpectations,
      };
    }
    function item44(text) {
      let result = item45(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item58,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item45(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = item46(remainder);
      failedExpectations.push(...result0.failedExpectations);
      if (result0.success === false)
        return {
          success: false,
          remainder: result0.remainder,
          failedExpectations,
        };
      remainder = result0.remainder;
      let result1 = item48(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = item52(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result0.value, result1.value, result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item46(text) {
      if (text.startsWith("//"))
        return {
          success: true,
          value: "//",
          remainder: text.slice(2),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item47,
            remainder: text,
          },
        ],
      };
    }
    function item48(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item49(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item49(text) {
      if (/^[^\r\n]/g.test(text))
        return {
          success: true,
          value: text.slice(0, 1),
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item50,
            remainder: text,
          },
        ],
      };
    }
    function item52(text) {
      let result = item53(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item56,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item53(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item54(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      if (values.length < 1)
        return {
          success: false,
          remainder: text,
          failedExpectations,
        };
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item54(text) {
      if (/^[\r\n]/g.test(text))
        return {
          success: true,
          value: text.slice(0, 1),
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item55,
            remainder: text,
          },
        ],
      };
    }
    function item59(text) {
      let result = item36(text);
      if (result.success === true) return result;
      return {
        success: true,
        value: null,
        remainder: text,
        failedExpectations: result.failedExpectations,
      };
    }
    function item63(text) {
      let choices = [item65, item362, item391, item435, item442, item447, item459];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item65(text) {
      let choices = [item67, item106, item129, item145, item330, item340, item351];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item67(text) {
      let result = item68(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item104,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item68(text) {
      let result = item70(text);
      if (result.success === true)
        return {
          success: true,
          value: item103(() => input.length - text.length, result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item70(text) {
      let matches = text.match(
        /^((-)?([0-9])*\.([0-9])+([eE]([+\-])?([0-9])+)?|(-)?([0-9])+[eE]([+\-])?([0-9])+)/g,
      );
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item75,
            remainder: text,
          },
          {
            expectation: item81,
            remainder: text,
          },
          {
            expectation: item83,
            remainder: text,
          },
        ],
      };
    }
    function item106(text) {
      let result = item107(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item127,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item107(text) {
      let result = item108(text);
      if (result.success === true)
        return {
          success: true,
          value: item126(() => input.length - text.length, result.value[0]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item108(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = item110(remainder);
      failedExpectations.push(...result0.failedExpectations);
      if (result0.success === false)
        return {
          success: false,
          remainder: result0.remainder,
          failedExpectations,
        };
      remainder = result0.remainder;
      let result1 = remainder.match(/^[uU]/g);
      failedExpectations.push({
        expectation: item124,
        remainder,
      });
      if (result1?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result1[0].length);
      return {
        success: true,
        value: [result0.value],
        remainder,
        failedExpectations,
      };
    }
    function item110(text) {
      let matches = text.match(/^(0x([0-9abcdefABCDEF])+|([0-9])+)/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item114,
            remainder: text,
          },
          {
            expectation: item81,
            remainder: text,
          },
        ],
      };
    }
    function item129(text) {
      let result = item130(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item143,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item130(text) {
      let result = item132(text);
      if (result.success === true)
        return {
          success: true,
          value: item142(() => input.length - text.length, result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item132(text) {
      let matches = text.match(/^(-)?(0x([0-9abcdefABCDEF])+|([0-9])+)/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item75,
            remainder: text,
          },
          {
            expectation: item114,
            remainder: text,
          },
          {
            expectation: item81,
            remainder: text,
          },
        ],
      };
    }
    function item145(text) {
      let result = item146(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item328,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item146(text) {
      let result = item149(text);
      if (result.success === true)
        return {
          success: true,
          value: item327(() => input.length - text.length, result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item149(text) {
      let result = item150(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item326,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item150(text) {
      let choices = [item151, item204];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item151(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^[rR]/g);
      failedExpectations.push({
        expectation: item153,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item155(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item155(text) {
      let choices = [item156, item169, item180, item192];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item156(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^"""/g);
      failedExpectations.push({
        expectation: item158,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item160(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^"""/g);
      failedExpectations.push({
        expectation: item158,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item160(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item161(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item161(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(?!""")/g);
      failedExpectations.push();
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item165(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item165(text) {
      if (text.length > 0)
        return {
          success: true,
          value: text.slice(0, 1),
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item2,
            remainder: text,
          },
        ],
      };
    }
    function item169(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^'''/g);
      failedExpectations.push({
        expectation: item171,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item173(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^'''/g);
      failedExpectations.push({
        expectation: item171,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item173(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item174(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item174(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(?!''')/g);
      failedExpectations.push();
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item178(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item178(text) {
      if (text.length > 0)
        return {
          success: true,
          value: text.slice(0, 1),
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item2,
            remainder: text,
          },
        ],
      };
    }
    function item180(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^"/g);
      failedExpectations.push({
        expectation: item182,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item184(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^"/g);
      failedExpectations.push({
        expectation: item182,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item184(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item185(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item185(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(?!("|([\r\n])+))/g);
      failedExpectations.push();
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item190(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item190(text) {
      if (text.length > 0)
        return {
          success: true,
          value: text.slice(0, 1),
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item2,
            remainder: text,
          },
        ],
      };
    }
    function item192(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^'/g);
      failedExpectations.push({
        expectation: item194,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item196(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^'/g);
      failedExpectations.push({
        expectation: item194,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item196(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item197(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item197(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(?!('|([\r\n])+))/g);
      failedExpectations.push();
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item202(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item202(text) {
      if (text.length > 0)
        return {
          success: true,
          value: text.slice(0, 1),
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item2,
            remainder: text,
          },
        ],
      };
    }
    function item204(text) {
      let choices = [item205, item288, item300, item313];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item205(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^"""/g);
      failedExpectations.push({
        expectation: item158,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item208(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^"""/g);
      failedExpectations.push({
        expectation: item158,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item208(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item209(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item209(text) {
      let choices = [item211, item280];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item211(text) {
      let result = item212(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item279,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item212(text) {
      let choices = [item214, item267, item274];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item214(text) {
      let result = item215(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item266,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item215(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item217(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      if (values.length < 1)
        return {
          success: false,
          remainder: text,
          failedExpectations,
        };
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item217(text) {
      let result = item218(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item265,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item218(text) {
      let choices = [item219, item236, item244, item252];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item219(text) {
      let result = item220(text);
      if (result.success === true)
        return {
          success: true,
          value: item235(result.value[0]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item220(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\\/g);
      failedExpectations.push({
        expectation: item222,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = remainder.match(/^[xX]/g);
      failedExpectations.push({
        expectation: item224,
        remainder,
      });
      if (result1?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result1[0].length);
      let result2 = item226(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item226(text) {
      let matches = text.match(/^([0-9abcdefABCDEF][0-9abcdefABCDEF]){0,1}/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item233,
            remainder: text,
          },
        ],
      };
    }
    function item236(text) {
      let result = item237(text);
      if (result.success === true)
        return {
          success: true,
          value: item243(result.value[0]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item237(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\\u/g);
      failedExpectations.push({
        expectation: item239,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item241(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: [result1.value],
        remainder,
        failedExpectations,
      };
    }
    function item241(text) {
      let matches = text.match(/^([0-9abcdefABCDEF][0-9abcdefABCDEF]){0,2}/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item233,
            remainder: text,
          },
        ],
      };
    }
    function item244(text) {
      let result = item245(text);
      if (result.success === true)
        return {
          success: true,
          value: item251(result.value[0]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item245(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\\U/g);
      failedExpectations.push({
        expectation: item247,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item249(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: [result1.value],
        remainder,
        failedExpectations,
      };
    }
    function item249(text) {
      let matches = text.match(/^([0-9abcdefABCDEF][0-9abcdefABCDEF]){0,4}/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item233,
            remainder: text,
          },
        ],
      };
    }
    function item252(text) {
      let result = item253(text);
      if (result.success === true)
        return {
          success: true,
          value: item264(result.value[0]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item253(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\\/g);
      failedExpectations.push({
        expectation: item222,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item256(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: [result1.value],
        remainder,
        failedExpectations,
      };
    }
    function item256(text) {
      let matches = text.match(/^[0-3][0-7][0-7]/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item259,
            remainder: text,
          },
        ],
      };
    }
    function item267(text) {
      let result = item268(text);
      if (result.success === true)
        return {
          success: true,
          value: item273(result.value[0]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item268(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\\/g);
      failedExpectations.push({
        expectation: item222,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item271(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: [result1.value],
        remainder,
        failedExpectations,
      };
    }
    function item271(text) {
      if (/^[abfnrtv]/g.test(text))
        return {
          success: true,
          value: text.slice(0, 1),
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item272,
            remainder: text,
          },
        ],
      };
    }
    function item274(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\\/g);
      failedExpectations.push({
        expectation: item222,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item277(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item277(text) {
      if (/^["'`\\?]/g.test(text))
        return {
          success: true,
          value: text.slice(0, 1),
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item278,
            remainder: text,
          },
        ],
      };
    }
    function item280(text) {
      let matches = text.match(/^(?!""")[\s\S]/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item2,
            remainder: text,
          },
        ],
      };
    }
    function item288(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^'''/g);
      failedExpectations.push({
        expectation: item171,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item291(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^'''/g);
      failedExpectations.push({
        expectation: item171,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item291(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item292(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item292(text) {
      let choices = [item211, item293];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item293(text) {
      let matches = text.match(/^(?!''')[\s\S]/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item2,
            remainder: text,
          },
        ],
      };
    }
    function item300(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^"/g);
      failedExpectations.push({
        expectation: item182,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item303(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^"/g);
      failedExpectations.push({
        expectation: item182,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item303(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item304(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item304(text) {
      let choices = [item211, item305];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item305(text) {
      let matches = text.match(/^(?!("|([\r\n])+))[\s\S]/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item2,
            remainder: text,
          },
        ],
      };
    }
    function item313(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^'/g);
      failedExpectations.push({
        expectation: item194,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item316(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^'/g);
      failedExpectations.push({
        expectation: item194,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item316(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item317(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item317(text) {
      let choices = [item211, item318];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item318(text) {
      let matches = text.match(/^(?!('|([\r\n])+))[\s\S]/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item2,
            remainder: text,
          },
        ],
      };
    }
    function item330(text) {
      let result = item331(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item338,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item331(text) {
      let result = item332(text);
      if (result.success === true)
        return {
          success: true,
          value: item337(() => input.length - text.length, result.value[0]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item332(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^[bB]/g);
      failedExpectations.push({
        expectation: item334,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item149(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: [result1.value],
        remainder,
        failedExpectations,
      };
    }
    function item340(text) {
      let result = item341(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item349,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item341(text) {
      let result = item343(text);
      if (result.success === true)
        return {
          success: true,
          value: item348(() => input.length - text.length, result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item343(text) {
      let choices = [item344, item346];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item344(text) {
      if (text.startsWith("true"))
        return {
          success: true,
          value: "true",
          remainder: text.slice(4),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item345,
            remainder: text,
          },
        ],
      };
    }
    function item346(text) {
      if (text.startsWith("false"))
        return {
          success: true,
          value: "false",
          remainder: text.slice(5),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item347,
            remainder: text,
          },
        ],
      };
    }
    function item351(text) {
      let result = item352(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item361,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item352(text) {
      let result = item353(text);
      if (result.success === true)
        return {
          success: true,
          value: item360(() => input.length - text.length),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item353(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^null/g);
      failedExpectations.push({
        expectation: item355,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = remainder.match(/^(?![_a-zA-Z0-9])/g);
      failedExpectations.push();
      if (result1?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result1[0].length);
      return {
        success: true,
        value: [],
        remainder,
        failedExpectations,
      };
    }
    function item362(text) {
      let result = item363(text);
      if (result.success === true)
        return {
          success: true,
          value: item390(() => input.length - text.length, result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item363(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(\.)?/g);
      failedExpectations.push({
        expectation: item83,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result1?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result1[0].length);
      let result2 = item368(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      let result3 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result3?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result3[0].length);
      let result4 = remainder.match(/^\(/g);
      failedExpectations.push({
        expectation: item381,
        remainder,
      });
      if (result4?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result4[0].length);
      let result5 = item384(remainder);
      failedExpectations.push(...result5.failedExpectations);
      if (result5.success === false)
        return {
          success: false,
          remainder: result5.remainder,
          failedExpectations,
        };
      remainder = result5.remainder;
      let result6 = remainder.match(/^\)/g);
      failedExpectations.push({
        expectation: item388,
        remainder,
      });
      if (result6?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result6[0].length);
      return {
        success: true,
        value: [result2.value, result5.value],
        remainder,
        failedExpectations,
      };
    }
    function item368(text) {
      let result = item369(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item379,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item369(text) {
      let result = item371(text);
      if (result.success === true)
        return {
          success: true,
          value: item378(
            (message, location = runtime.getLocation(parse$source, input, text, result.remainder), name) => {
              throw new ParseError(message, location, name);
            },
            result.value,
          ),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item371(text) {
      let matches = text.match(/^[_a-zA-Z]([_a-zA-Z0-9])*/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item374,
            remainder: text,
          },
        ],
      };
    }
    function item384(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let r = remainder;
        if (values.length > 0) {
          let result = item385(r);
          failedExpectations.push(...result.failedExpectations);
          if (result.success === false) break;
          r = result.remainder;
        }
        let result = item4(r);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item385(text) {
      if (text.startsWith(","))
        return {
          success: true,
          value: ",",
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item386,
            remainder: text,
          },
        ],
      };
    }
    function item391(text) {
      let result = item392(text);
      if (result.success === true)
        return {
          success: true,
          value: item434(() => input.length - text.length, result.value[0], result.value[1], result.value[2]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item392(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = item394(remainder);
      failedExpectations.push(...result0.failedExpectations);
      if (result0.success === false)
        return {
          success: false,
          remainder: result0.remainder,
          failedExpectations,
        };
      remainder = result0.remainder;
      let result1 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result1?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result1[0].length);
      let result2 = item397(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      let result3 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result3?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result3[0].length);
      let result4 = remainder.match(/^\{/g);
      failedExpectations.push({
        expectation: item413,
        remainder,
      });
      if (result4?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result4[0].length);
      let result5 = item416(remainder);
      failedExpectations.push(...result5.failedExpectations);
      if (result5.success === false)
        return {
          success: false,
          remainder: result5.remainder,
          failedExpectations,
        };
      remainder = result5.remainder;
      let result6 = remainder.match(/^(,)?/g);
      failedExpectations.push({
        expectation: item386,
        remainder,
      });
      if (result6?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result6[0].length);
      let result7 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result7?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result7[0].length);
      let result8 = remainder.match(/^\}/g);
      failedExpectations.push({
        expectation: item432,
        remainder,
      });
      if (result8?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result8[0].length);
      return {
        success: true,
        value: [result0.value, result2.value, result5.value],
        remainder,
        failedExpectations,
      };
    }
    function item394(text) {
      let result = item395(text);
      if (result.success === true) return result;
      return {
        success: true,
        value: null,
        remainder: text,
        failedExpectations: result.failedExpectations,
      };
    }
    function item395(text) {
      if (text.startsWith("."))
        return {
          success: true,
          value: ".",
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item83,
            remainder: text,
          },
        ],
      };
    }
    function item397(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let r = remainder;
        if (values.length > 0) {
          let result = item409(r);
          failedExpectations.push(...result.failedExpectations);
          if (result.success === false) break;
          r = result.remainder;
        }
        let result = item399(r);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      if (values.length < 1)
        return {
          success: false,
          remainder: text,
          failedExpectations,
        };
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item399(text) {
      let result = item400(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item408,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item400(text) {
      let result = item402(text);
      if (result.success === true)
        return {
          success: true,
          value: item407(
            (message, location = runtime.getLocation(parse$source, input, text, result.remainder), name) => {
              throw new ParseError(message, location, name);
            },
            result.value,
          ),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item402(text) {
      let matches = text.match(/^[_a-zA-Z]([_a-zA-Z0-9])*/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item374,
            remainder: text,
          },
        ],
      };
    }
    function item409(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = item33(remainder);
      failedExpectations.push(...result0.failedExpectations);
      if (result0.success === false)
        return {
          success: false,
          remainder: result0.remainder,
          failedExpectations,
        };
      remainder = result0.remainder;
      let result1 = item410(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = item33(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result0.value, result1.value, result0.value],
        remainder,
        failedExpectations,
      };
    }
    function item410(text) {
      if (text.startsWith("."))
        return {
          success: true,
          value: ".",
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item83,
            remainder: text,
          },
        ],
      };
    }
    function item416(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let r = remainder;
        if (values.length > 0) {
          let result = item428(r);
          failedExpectations.push(...result.failedExpectations);
          if (result.success === false) break;
          r = result.remainder;
        }
        let result = item417(r);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item417(text) {
      let result = item418(text);
      if (result.success === true)
        return {
          success: true,
          value: item427(() => input.length - text.length, result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item418(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item399(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?:/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
        {
          expectation: item423,
          remainder,
        },
      );
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      let result3 = item4(remainder);
      failedExpectations.push(...result3.failedExpectations);
      if (result3.success === false)
        return {
          success: false,
          remainder: result3.remainder,
          failedExpectations,
        };
      remainder = result3.remainder;
      return {
        success: true,
        value: [result1.value, result3.value],
        remainder,
        failedExpectations,
      };
    }
    function item428(text) {
      if (text.startsWith(","))
        return {
          success: true,
          value: ",",
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item386,
            remainder: text,
          },
        ],
      };
    }
    function item435(text) {
      let result = item436(text);
      if (result.success === true)
        return {
          success: true,
          value: item441(() => input.length - text.length, result.value[0]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item436(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(\.)?/g);
      failedExpectations.push({
        expectation: item83,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result1?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result1[0].length);
      let result2 = item399(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item442(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\(/g);
      failedExpectations.push({
        expectation: item381,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item4(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^\)/g);
      failedExpectations.push({
        expectation: item388,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item447(text) {
      let result = item449(text);
      if (result.success === true)
        return {
          success: true,
          value: item458(() => input.length - text.length, result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item449(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\[/g);
      failedExpectations.push({
        expectation: item451,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item384(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^(,)?/g);
      failedExpectations.push({
        expectation: item386,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      let result3 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result3?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result3[0].length);
      let result4 = remainder.match(/^\]/g);
      failedExpectations.push({
        expectation: item456,
        remainder,
      });
      if (result4?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result4[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item459(text) {
      let result = item461(text);
      if (result.success === true)
        return {
          success: true,
          value: item481(() => input.length - text.length, result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item461(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\{/g);
      failedExpectations.push({
        expectation: item413,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item465(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^(,)?(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?\}/g);
      failedExpectations.push(
        {
          expectation: item386,
          remainder,
        },
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
        {
          expectation: item432,
          remainder,
        },
      );
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item465(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let r = remainder;
        if (values.length > 0) {
          let result = item473(r);
          failedExpectations.push(...result.failedExpectations);
          if (result.success === false) break;
          r = result.remainder;
        }
        let result = item466(r);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item466(text) {
      let result = item467(text);
      if (result.success === true)
        return {
          success: true,
          value: item472(() => input.length - text.length, result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item467(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = item4(remainder);
      failedExpectations.push(...result0.failedExpectations);
      if (result0.success === false)
        return {
          success: false,
          remainder: result0.remainder,
          failedExpectations,
        };
      remainder = result0.remainder;
      let result1 = remainder.match(/^:/g);
      failedExpectations.push({
        expectation: item423,
        remainder,
      });
      if (result1?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result1[0].length);
      let result2 = item4(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result0.value, result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item473(text) {
      if (text.startsWith(","))
        return {
          success: true,
          value: ",",
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item386,
            remainder: text,
          },
        ],
      };
    }
    function item484(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item485(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item485(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item488(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      return {
        success: true,
        value: result1.value,
        remainder,
        failedExpectations,
      };
    }
    function item488(text) {
      let choices = [item489, item498, item507];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item489(text) {
      let result = item490(text);
      if (result.success === true)
        return {
          success: true,
          value: item497(() => input.length - text.length, result.value[0]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item490(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\./g);
      failedExpectations.push({
        expectation: item83,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result1?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result1[0].length);
      let result2 = item399(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      let result3 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result3?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result3[0].length);
      let result4 = remainder.match(/^(?![(])/g);
      failedExpectations.push();
      if (result4?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result4[0].length);
      return {
        success: true,
        value: [result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item498(text) {
      let result = item499(text);
      if (result.success === true)
        return {
          success: true,
          value: item506(() => input.length - text.length, result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item499(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\./g);
      failedExpectations.push({
        expectation: item83,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result1?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result1[0].length);
      let result2 = item399(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      let result3 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result3?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result3[0].length);
      let result4 = remainder.match(/^\(/g);
      failedExpectations.push({
        expectation: item381,
        remainder,
      });
      if (result4?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result4[0].length);
      let result5 = item384(remainder);
      failedExpectations.push(...result5.failedExpectations);
      if (result5.success === false)
        return {
          success: false,
          remainder: result5.remainder,
          failedExpectations,
        };
      remainder = result5.remainder;
      let result6 = remainder.match(/^\)/g);
      failedExpectations.push({
        expectation: item388,
        remainder,
      });
      if (result6?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result6[0].length);
      return {
        success: true,
        value: [result2.value, result5.value],
        remainder,
        failedExpectations,
      };
    }
    function item507(text) {
      let result = item508(text);
      if (result.success === true)
        return {
          success: true,
          value: item513(() => input.length - text.length, result.value[0]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item508(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\[/g);
      failedExpectations.push({
        expectation: item451,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item4(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^\]/g);
      failedExpectations.push({
        expectation: item456,
        remainder,
      });
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      return {
        success: true,
        value: [result1.value],
        remainder,
        failedExpectations,
      };
    }
    function item517(text) {
      let result = item518(text);
      if (result.success === true)
        return {
          success: true,
          value: item529(() => input.length - text.length, result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item518(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item520(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = item30(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result1.value, result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item520(text) {
      let matches = text.match(/^((!)+|(-)+)/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item524,
            remainder: text,
          },
          {
            expectation: item75,
            remainder: text,
          },
        ],
      };
    }
    function item531(text) {
      let result = item533(text);
      if (result.success === true) return result;
      return {
        success: true,
        value: null,
        remainder: text,
        failedExpectations: result.failedExpectations,
      };
    }
    function item533(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item534(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      if (values.length < 1)
        return {
          success: false,
          remainder: text,
          failedExpectations,
        };
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item534(text) {
      let result = item535(text);
      if (result.success === true)
        return {
          success: true,
          value: item544(() => input.length - text.length, result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item535(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item537(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = item28(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result1.value, result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item537(text) {
      let result = item539(text);
      if (result.success === true)
        return {
          success: true,
          value: item541(result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item539(text) {
      if (/^[*\/%]/g.test(text))
        return {
          success: true,
          value: text.slice(0, 1),
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item540,
            remainder: text,
          },
        ],
      };
    }
    function item548(text) {
      let result = item550(text);
      if (result.success === true) return result;
      return {
        success: true,
        value: null,
        remainder: text,
        failedExpectations: result.failedExpectations,
      };
    }
    function item550(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item551(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      if (values.length < 1)
        return {
          success: false,
          remainder: text,
          failedExpectations,
        };
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item551(text) {
      let result = item552(text);
      if (result.success === true)
        return {
          success: true,
          value: item559(() => input.length - text.length, result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item552(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item554(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = item24(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result1.value, result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item554(text) {
      let result = item556(text);
      if (result.success === true)
        return {
          success: true,
          value: item557(result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item556(text) {
      if (/^[+\-]/g.test(text))
        return {
          success: true,
          value: text.slice(0, 1),
          remainder: text.slice(1),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item93,
            remainder: text,
          },
        ],
      };
    }
    function item563(text) {
      let result = item565(text);
      if (result.success === true) return result;
      return {
        success: true,
        value: null,
        remainder: text,
        failedExpectations: result.failedExpectations,
      };
    }
    function item565(text) {
      let values = [];
      let failedExpectations = [];
      let remainder = text;
      while (true) {
        let result = item566(remainder);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === false) break;
        remainder = result.remainder;
        values.push(result.value);
      }
      if (values.length < 1)
        return {
          success: false,
          remainder: text,
          failedExpectations,
        };
      return {
        success: true,
        value: values,
        remainder,
        failedExpectations,
      };
    }
    function item566(text) {
      let result = item567(text);
      if (result.success === true)
        return {
          success: true,
          value: item595(() => input.length - text.length, result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item567(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item570(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = item20(remainder);
      failedExpectations.push(...result2.failedExpectations);
      if (result2.success === false)
        return {
          success: false,
          remainder: result2.remainder,
          failedExpectations,
        };
      remainder = result2.remainder;
      return {
        success: true,
        value: [result1.value, result2.value],
        remainder,
        failedExpectations,
      };
    }
    function item570(text) {
      let result = item571(text);
      if (result.success === true) return result;
      return {
        success: false,
        remainder: result.remainder,
        failedExpectations: [
          {
            expectation: item593,
            remainder: result.remainder,
          },
        ],
      };
    }
    function item571(text) {
      let choices = [item572, item589];
      let failedExpectations = [];
      for (let func = choices.shift(); func !== undefined; func = choices.shift()) {
        let result = func(text);
        failedExpectations.push(...result.failedExpectations);
        if (result.success === true)
          return {
            success: true,
            value: result.value,
            remainder: result.remainder,
            failedExpectations,
          };
      }
      return {
        success: false,
        remainder: text,
        failedExpectations,
      };
    }
    function item572(text) {
      let result = item574(text);
      if (result.success === true)
        return {
          success: true,
          value: item588(result.value),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item574(text) {
      let matches = text.match(/^(<=|<|>=|>|==|!=)/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item577,
            remainder: text,
          },
          {
            expectation: item579,
            remainder: text,
          },
          {
            expectation: item581,
            remainder: text,
          },
          {
            expectation: item583,
            remainder: text,
          },
          {
            expectation: item585,
            remainder: text,
          },
          {
            expectation: item587,
            remainder: text,
          },
        ],
      };
    }
    function item589(text) {
      let result = item590(text);
      if (result.success === true)
        return {
          success: true,
          value: item592(),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item590(text) {
      if (text.startsWith("in"))
        return {
          success: true,
          value: "in",
          remainder: text.slice(2),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item591,
            remainder: text,
          },
        ],
      };
    }
    function item598(text) {
      let matches = text.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?&&/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item41,
            remainder: text,
          },
          {
            expectation: item58,
            remainder: text,
          },
          {
            expectation: item601,
            remainder: text,
          },
        ],
      };
    }
    function item604(text) {
      let matches = text.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?\|\|/g);
      if (matches?.length === 1)
        return {
          success: true,
          value: matches[0],
          remainder: text.slice(matches[0].length),
          failedExpectations: [],
        };
      return {
        success: false,
        remainder: text,
        failedExpectations: [
          {
            expectation: item41,
            remainder: text,
          },
          {
            expectation: item58,
            remainder: text,
          },
          {
            expectation: item607,
            remainder: text,
          },
        ],
      };
    }
    function item611(text) {
      let result = item613(text);
      if (result.success === true) return result;
      return {
        success: true,
        value: null,
        remainder: text,
        failedExpectations: result.failedExpectations,
      };
    }
    function item613(text) {
      let result = item614(text);
      if (result.success === true)
        return {
          success: true,
          value: item621(result.value[0], result.value[1]),
          remainder: result.remainder,
          failedExpectations: [],
        };
      return result;
    }
    function item614(text) {
      let failedExpectations = [];
      let remainder = text;
      let result0 = remainder.match(/^\?/g);
      failedExpectations.push({
        expectation: item616,
        remainder,
      });
      if (result0?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result0[0].length);
      let result1 = item8(remainder);
      failedExpectations.push(...result1.failedExpectations);
      if (result1.success === false)
        return {
          success: false,
          remainder: result1.remainder,
          failedExpectations,
        };
      remainder = result1.remainder;
      let result2 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result2?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result2[0].length);
      let result3 = remainder.match(/^:/g);
      failedExpectations.push({
        expectation: item423,
        remainder,
      });
      if (result3?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result3[0].length);
      let result4 = item4(remainder);
      failedExpectations.push(...result4.failedExpectations);
      if (result4.success === false)
        return {
          success: false,
          remainder: result4.remainder,
          failedExpectations,
        };
      remainder = result4.remainder;
      let result5 = remainder.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      failedExpectations.push(
        {
          expectation: item41,
          remainder,
        },
        {
          expectation: item58,
          remainder,
        },
      );
      if (result5?.length !== 1)
        return {
          success: false,
          remainder,
          failedExpectations,
        };
      remainder = remainder.slice(result5[0].length);
      return {
        success: true,
        value: [result1.value, result4.value],
        remainder,
        failedExpectations,
      };
    }
  }
});
export { require_parser };
