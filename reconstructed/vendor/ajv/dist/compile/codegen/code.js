/**
 * ajv/dist/compile/codegen/code.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:267-2859 cjs-fingerprint
var require_code = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.regexpCode =
    cjsExports.getEsmExportName =
    cjsExports.getProperty =
    cjsExports.safeStringify =
    cjsExports.stringify =
    cjsExports.strConcat =
    cjsExports.addCodeArg =
    cjsExports.str =
    cjsExports._ =
    cjsExports.nil =
    cjsExports._Code =
    cjsExports.Name =
    cjsExports.IDENTIFIER =
    cjsExports._CodeOrName =
      undefined;
  class _CodeOrName {}
  cjsExports._CodeOrName = _CodeOrName;
  cjsExports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  class Name extends _CodeOrName {
    constructor(s) {
      super();
      if (!cjsExports.IDENTIFIER.test(s)) throw Error("CodeGen: name must be a valid identifier");
      this.str = s;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return false;
    }
    get names() {
      return {
        [this.str]: 1,
      };
    }
  }
  cjsExports.Name = Name;
  class _Code extends _CodeOrName {
    constructor(code) {
      super();
      this._items = typeof code === "string" ? [code] : code;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1) return false;
      let item = this._items[0];
      return item === "" || item === '""';
    }
    get str() {
      var _a;
      return (_a = this._str) !== null && _a !== undefined
        ? _a
        : (this._str = this._items.reduce((s, c) => `${s}${c}`, ""));
    }
    get names() {
      var _a;
      return (_a = this._names) !== null && _a !== undefined
        ? _a
        : (this._names = this._items.reduce((names, c) => {
            if (c instanceof Name) names[c.str] = (names[c.str] || 0) + 1;
            return names;
          }, {}));
    }
  }
  cjsExports._Code = _Code;
  cjsExports.nil = new _Code("");
  function _(strs, ...args) {
    let code = [strs[0]];
    let i = 0;
    while (i < args.length) {
      addCodeArg(code, args[i]);
      code.push(strs[++i]);
    }
    return new _Code(code);
  }
  cjsExports._ = _;
  var plus = new _Code("+");
  function str(strs, ...args) {
    let expr = [safeStringify(strs[0])];
    let i = 0;
    while (i < args.length) {
      expr.push(plus);
      addCodeArg(expr, args[i]);
      expr.push(plus, safeStringify(strs[++i]));
    }
    optimize(expr);
    return new _Code(expr);
  }
  cjsExports.str = str;
  function addCodeArg(code, arg) {
    if (arg instanceof _Code) code.push(...arg._items);
    else if (arg instanceof Name) code.push(arg);
    else code.push(interpolate(arg));
  }
  cjsExports.addCodeArg = addCodeArg;
  function optimize(expr) {
    let i = 1;
    while (i < expr.length - 1) {
      if (expr[i] === plus) {
        let res = mergeExprItems(expr[i - 1], expr[i + 1]);
        if (res !== undefined) {
          expr.splice(i - 1, 3, res);
          continue;
        }
        expr[i++] = "+";
      }
      i++;
    }
  }
  function mergeExprItems(a, b) {
    if (b === '""') return a;
    if (a === '""') return b;
    if (typeof a == "string") {
      if (b instanceof Name || a[a.length - 1] !== '"') return;
      if (typeof b != "string") return `${a.slice(0, -1)}${b}"`;
      if (b[0] === '"') return a.slice(0, -1) + b.slice(1);
      return;
    }
    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name)) return `"${a}${b.slice(1)}`;
    return;
  }
  function strConcat(c1, c2) {
    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
  }
  cjsExports.strConcat = strConcat;
  function interpolate(x) {
    return typeof x == "number" || typeof x == "boolean" || x === null
      ? x
      : safeStringify(Array.isArray(x) ? x.join(",") : x);
  }
  function stringify(x) {
    return new _Code(safeStringify(x));
  }
  cjsExports.stringify = stringify;
  function safeStringify(x) {
    return JSON.stringify(x)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }
  cjsExports.safeStringify = safeStringify;
  function getProperty(key) {
    return typeof key == "string" && cjsExports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
  }
  cjsExports.getProperty = getProperty;
  function getEsmExportName(key) {
    if (typeof key == "string" && cjsExports.IDENTIFIER.test(key)) return new _Code(`${key}`);
    throw Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
  }
  cjsExports.getEsmExportName = getEsmExportName;
  function regexpCode(rx) {
    return new _Code(rx.toString());
  }
  cjsExports.regexpCode = regexpCode;
});
export { require_code };
