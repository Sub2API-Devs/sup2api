/**
 * @protobufjs/codegen/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @protobufjs/codegen@2.0.5
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:76760-78091 cjs-fingerprint
var require_codegen = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = codegen;
  var reservedRe =
    /^(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/;
  function codegen(functionParams, functionName) {
    if (typeof functionParams === "string") {
      functionName = functionParams;
      functionParams = undefined;
    }
    var body = [];
    function Codegen(formatStringOrScope) {
      if (typeof formatStringOrScope !== "string") {
        var source = toString();
        if (codegen.verbose) console.log("codegen: " + source);
        source = "return " + source;
        if (formatStringOrScope) {
          var scopeKeys = Object.keys(formatStringOrScope);
          var scopeParams = Array(scopeKeys.length + 1);
          var scopeValues = Array(scopeKeys.length);
          var scopeOffset = 0;
          while (scopeOffset < scopeKeys.length) {
            scopeParams[scopeOffset] = scopeKeys[scopeOffset];
            scopeValues[scopeOffset] = formatStringOrScope[scopeKeys[scopeOffset++]];
          }
          scopeParams[scopeOffset] = source;
          return Function.apply(null, scopeParams).apply(null, scopeValues);
        }
        return Function(source)();
      }
      var formatParams = Array(arguments.length - 1);
      var formatOffset = 0;
      while (formatOffset < formatParams.length) formatParams[formatOffset] = arguments[++formatOffset];
      formatOffset = 0;
      formatStringOrScope = formatStringOrScope.replace(/%([%dfijs])/g, function ($0, $1) {
        var value = formatParams[formatOffset++];
        switch ($1) {
          case "d":
          case "f":
            return String(Number(value));
          case "i":
            return String(Math.floor(value));
          case "j":
            return JSON.stringify(value);
          case "s":
            return String(value);
        }
        return "%";
      });
      if (formatOffset !== formatParams.length) throw Error("parameter count mismatch");
      body.push(formatStringOrScope);
      return Codegen;
    }
    function toString(functionNameOverride) {
      return (
        "function " +
        safeFunctionName(functionNameOverride || functionName) +
        "(" +
        ((functionParams && functionParams.join(",")) || "") +
        `){
  ` +
        body.join(`
  `) +
        `
}`
      );
    }
    Codegen.toString = toString;
    return Codegen;
  }
  codegen.verbose = false;
  function safeFunctionName(name) {
    if (!name) return "";
    name = String(name).replace(/[^\w$]/g, "");
    if (!name) return "";
    if (/^\d/.test(name)) name = "_" + name;
    return reservedRe.test(name) ? name + "_" : name;
  }
});
export { require_codegen };
