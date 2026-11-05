/**
 * @opentelemetry/api/build/src/diag/consoleLogger.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:35356-35833 cjs-fingerprint
var require_consoleLogger = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.DiagConsoleLogger = undefined;
  var consoleMap = [
    {
      n: "error",
      c: "error",
    },
    {
      n: "warn",
      c: "warn",
    },
    {
      n: "info",
      c: "info",
    },
    {
      n: "debug",
      c: "debug",
    },
    {
      n: "verbose",
      c: "trace",
    },
  ];
  class DiagConsoleLogger {
    constructor() {
      function _consoleFunc(funcName) {
        return function (...args) {
          if (console) {
            let theFunc = console[funcName];
            if (typeof theFunc !== "function") theFunc = console.log;
            if (typeof theFunc === "function") return theFunc.apply(console, args);
          }
        };
      }
      for (let i = 0; i < consoleMap.length; i++) this[consoleMap[i].n] = _consoleFunc(consoleMap[i].c);
    }
  }
  cjsExports.DiagConsoleLogger = DiagConsoleLogger;
});
export { require_consoleLogger };
