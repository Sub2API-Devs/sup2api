/**
 * @typespec/ts-http-runtime/dist/esm/util/checkEnvironment.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
//@ chunk-b5df2wx1.js:47192-47892 esm-layout
var _a_2;
var _b;
var _c_2;
var _d;
var isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
var isWebWorker =
  typeof self === "object" &&
  typeof (self === null || self === undefined ? undefined : self.importScripts) === "function" &&
  (((_a_2 = self.constructor) === null || _a_2 === undefined ? undefined : _a_2.name) ===
    "DedicatedWorkerGlobalScope" ||
    ((_b = self.constructor) === null || _b === undefined ? undefined : _b.name) ===
      "ServiceWorkerGlobalScope" ||
    ((_c_2 = self.constructor) === null || _c_2 === undefined ? undefined : _c_2.name) ===
      "SharedWorkerGlobalScope");
var isDeno =
  typeof Deno !== "undefined" &&
  typeof Deno.version !== "undefined" &&
  typeof Deno.version.deno !== "undefined";
var isBun = typeof Bun !== "undefined" && typeof Bun.version !== "undefined";
var isNodeLike =
  typeof globalThis.process !== "undefined" &&
  Boolean(globalThis.process.version) &&
  Boolean((_d = globalThis.process.versions) === null || _d === undefined ? undefined : _d.node);
//@ chunk-b5df2wx1.js:47892-48001 esm-fingerprint
var isReactNative =
  typeof navigator !== "undefined" &&
  (navigator === null || navigator === undefined ? undefined : navigator.product) === "ReactNative";
export { isNodeLike };
