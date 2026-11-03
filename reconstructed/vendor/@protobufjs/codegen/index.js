/**
 * @protobufjs/codegen/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @protobufjs/codegen@2.0.5
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:76760-78091 cjs-fingerprint
var ed = x(function (Zw, Zu) {
  Zu.exports = Na;
  var iE =
    /^(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$/;
  function Na(e, t) {
    if (typeof e === "string") ((t = e), (e = void 0));
    var r = [];
    function i(n) {
      if (typeof n !== "string") {
        var a = s();
        if (Na.verbose) console.log("codegen: " + a);
        if (((a = "return " + a), n)) {
          var keys = Object.keys(n),
            l = Array(keys.length + 1),
            c = Array(keys.length),
            u = 0;
          while (u < keys.length) ((l[u] = keys[u]), (c[u] = n[keys[u++]]));
          return ((l[u] = a), Function.apply(null, l).apply(null, c));
        }
        return Function(a)();
      }
      var d = Array(arguments.length - 1),
        h = 0;
      while (h < d.length) d[h] = arguments[++h];
      if (
        ((h = 0),
        (n = n.replace(/%([%dfijs])/g, function (f, y) {
          var C = d[h++];
          switch (y) {
            case "d":
            case "f":
              return String(Number(C));
            case "i":
              return String(Math.floor(C));
            case "j":
              return JSON.stringify(C);
            case "s":
              return String(C);
          }
          return "%";
        })),
        h !== d.length)
      )
        throw Error("parameter count mismatch");
      return (r.push(n), i);
    }
    function s(n) {
      return (
        "function " +
        sE(n || t) +
        "(" +
        ((e && e.join(",")) || "") +
        `){
  ` +
        r.join(`
  `) +
        `
}`
      );
    }
    return ((i.toString = s), i);
  }
  Na.verbose = !1;
  function sE(e) {
    if (!e) return "";
    if (((e = String(e).replace(/[^\w$]/g, "")), !e)) return "";
    if (/^\d/.test(e)) e = "_" + e;
    return iE.test(e) ? e + "_" : e;
  }
});

export { ed };
