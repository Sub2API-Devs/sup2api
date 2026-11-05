/**
 * vscode-jsonrpc/lib/common/is.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-mvgr3jmb.js:4420-5002 cjs-fingerprint
var require_is = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.stringArray =
    cjsExports.array =
    cjsExports.func =
    cjsExports.error =
    cjsExports.number =
    cjsExports.string =
    cjsExports.boolean =
      undefined;
  function boolean(value) {
    return value === true || value === false;
  }
  cjsExports.boolean = boolean;
  function string(value) {
    return typeof value === "string" || value instanceof String;
  }
  cjsExports.string = string;
  function number(value) {
    return typeof value === "number" || value instanceof Number;
  }
  cjsExports.number = number;
  function error(value) {
    return value instanceof Error;
  }
  cjsExports.error = error;
  function func(value) {
    return typeof value === "function";
  }
  cjsExports.func = func;
  function array(value) {
    return Array.isArray(value);
  }
  cjsExports.array = array;
  function stringArray(value) {
    return array(value) && value.every((elem) => string(elem));
  }
  cjsExports.stringArray = stringArray;
});
export { require_is };
