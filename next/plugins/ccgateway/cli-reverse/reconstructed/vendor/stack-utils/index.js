/**
 * stack-utils/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: stack-utils@2.0.6
 * pieces: chunk-2avr6cej.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_escape_string_regexp } from "../escape-string-regexp/index.js";

//@ chunk-2avr6cej.js:126279-129747 cjs-fingerprint
var require_stack_utils = __commonJS(function (cjsExports, cjsModule) {
  var escapeStringRegexp = require_escape_string_regexp();
  var cwd = typeof process === "object" && process && typeof process.cwd === "function" ? process.cwd() : ".";
  var natives = []
    .concat(importMetaRequire("module").builtinModules, "bootstrap_node", "node")
    .map(
      (moduleName) =>
        new RegExp(
          `(?:\\((?:node:)?${moduleName}(?:\\.js)?:\\d+:\\d+\\)$|^\\s*at (?:node:)?${moduleName}(?:\\.js)?:\\d+:\\d+$)`,
        ),
    );
  natives.push(
    /\((?:node:)?internal\/[^:]+:\d+:\d+\)$/,
    /\s*at (?:node:)?internal\/[^:]+:\d+:\d+$/,
    /\/\.node-spawn-wrap-\w+-\w+\/node:\d+:\d+\)?$/,
  );
  class StackUtils {
    constructor(opts) {
      opts = {
        ignoredPackages: [],
        ...opts,
      };
      if ("internals" in opts === false) opts.internals = StackUtils.nodeInternals();
      if ("cwd" in opts === false) opts.cwd = cwd;
      this._cwd = opts.cwd.replace(/\\/g, "/");
      this._internals = [].concat(opts.internals, ignoredPackagesRegExp(opts.ignoredPackages));
      this._wrapCallSite = opts.wrapCallSite || false;
    }
    static nodeInternals() {
      return [...natives];
    }
    clean(stack, indent = 0) {
      indent = " ".repeat(indent);
      if (!Array.isArray(stack))
        stack = stack.split(`
`);
      if (!/^\s*at /.test(stack[0]) && /^\s*at /.test(stack[1])) stack = stack.slice(1);
      let outdent = false;
      let lastNonAtLine = null;
      let result = [];
      stack.forEach((st) => {
        st = st.replace(/\\/g, "/");
        if (this._internals.some((internal) => internal.test(st))) return;
        let isAtLine = /^\s*at /.test(st);
        if (outdent) st = st.trimEnd().replace(/^(\s+)at /, "$1");
        else {
          st = st.trim();
          if (isAtLine) st = st.slice(3);
        }
        st = st.replace(`${this._cwd}/`, "");
        if (st)
          if (isAtLine) {
            if (lastNonAtLine) {
              result.push(lastNonAtLine);
              lastNonAtLine = null;
            }
            result.push(st);
          } else {
            outdent = true;
            lastNonAtLine = st;
          }
      });
      return result
        .map(
          (line) => `${indent}${line}
`,
        )
        .join("");
    }
    captureString(limit, fn = this.captureString) {
      if (typeof limit === "function") {
        fn = limit;
        limit = 1 / 0;
      }
      let { stackTraceLimit } = Error;
      if (limit) Error.stackTraceLimit = limit;
      let obj = {};
      Error.captureStackTrace(obj, fn);
      let { stack } = obj;
      Error.stackTraceLimit = stackTraceLimit;
      return this.clean(stack);
    }
    capture(limit, fn = this.capture) {
      if (typeof limit === "function") {
        fn = limit;
        limit = 1 / 0;
      }
      let { prepareStackTrace, stackTraceLimit } = Error;
      Error.prepareStackTrace = (obj, site) => {
        if (this._wrapCallSite) return site.map(this._wrapCallSite);
        return site;
      };
      if (limit) Error.stackTraceLimit = limit;
      let obj = {};
      Error.captureStackTrace(obj, fn);
      let { stack } = obj;
      Object.assign(Error, {
        prepareStackTrace,
        stackTraceLimit,
      });
      return stack;
    }
    at(fn = this.at) {
      let [site] = this.capture(1, fn);
      if (!site) return {};
      let res = {
        line: site.getLineNumber(),
        column: site.getColumnNumber(),
      };
      setFile(res, site.getFileName(), this._cwd);
      if (site.isConstructor())
        Object.defineProperty(res, "constructor", {
          value: true,
          configurable: true,
        });
      if (site.isEval()) res.evalOrigin = site.getEvalOrigin();
      if (site.isNative()) res.native = true;
      let typename;
      try {
        typename = site.getTypeName();
      } catch (_) {}
      if (typename && typename !== "Object" && typename !== "[object Object]") res.type = typename;
      let fname = site.getFunctionName();
      if (fname) res.function = fname;
      let meth = site.getMethodName();
      if (meth && fname !== meth) res.method = meth;
      return res;
    }
    parseLine(line) {
      let match = line && line.match(re);
      if (!match) return null;
      let ctor = match[1] === "new";
      let fname = match[2];
      let evalOrigin = match[3];
      let evalFile = match[4];
      let evalLine = Number(match[5]);
      let evalCol = Number(match[6]);
      let file = match[7];
      let lnum = match[8];
      let col = match[9];
      let native = match[10] === "native";
      let closeParen = match[11] === ")";
      let method;
      let res = {};
      if (lnum) res.line = Number(lnum);
      if (col) res.column = Number(col);
      if (closeParen && file) {
        let closes = 0;
        for (let i = file.length - 1; i > 0; i--)
          if (file.charAt(i) === ")") closes++;
          else if (file.charAt(i) === "(" && file.charAt(i - 1) === " ") {
            closes--;
            if (closes === -1 && file.charAt(i - 1) === " ") {
              let before = file.slice(0, i - 1);
              file = file.slice(i + 1);
              fname += ` (${before}`;
              break;
            }
          }
      }
      if (fname) {
        let methodMatch = fname.match(methodRe);
        if (methodMatch) {
          fname = methodMatch[1];
          method = methodMatch[2];
        }
      }
      setFile(res, file, this._cwd);
      if (ctor)
        Object.defineProperty(res, "constructor", {
          value: true,
          configurable: true,
        });
      if (evalOrigin) {
        res.evalOrigin = evalOrigin;
        res.evalLine = evalLine;
        res.evalColumn = evalCol;
        res.evalFile = evalFile && evalFile.replace(/\\/g, "/");
      }
      if (native) res.native = true;
      if (fname) res.function = fname;
      if (method && fname !== method) res.method = method;
      return res;
    }
  }
  function setFile(result, filename, cwd) {
    if (filename) {
      filename = filename.replace(/\\/g, "/");
      if (filename.startsWith(`${cwd}/`)) filename = filename.slice(cwd.length + 1);
      result.file = filename;
    }
  }
  function ignoredPackagesRegExp(ignoredPackages) {
    if (ignoredPackages.length === 0) return [];
    let packages = ignoredPackages.map((mod) => escapeStringRegexp(mod));
    return new RegExp(`[/\\\\]node_modules[/\\\\](?:${packages.join("|")})[/\\\\][^:]+:\\d+:\\d+`);
  }
  var re = new RegExp(
    "^(?:\\s*at )?(?:(new) )?(?:(.*?) \\()?(?:eval at ([^ ]+) \\((.+?):(\\d+):(\\d+)\\), )?(?:(.+?):(\\d+):(\\d+)|(native))(\\)?)$",
  );
  var methodRe = /^(.*?) \[as (.*?)\]$/;
  cjsModule.exports = StackUtils;
});
export { require_stack_utils };
