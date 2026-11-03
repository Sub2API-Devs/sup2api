/**
 * @typespec/ts-http-runtime/dist/esm/util/checkEnvironment.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */

//@ chunk-mrx6y2r5.js:47192-47892 esm-layout
var Zs,
  ea,
  ta,
  ra,
  _l = typeof window < "u" && typeof window.document < "u",
  Sl =
    typeof self === "object" &&
    typeof (self === null || self === void 0 ? void 0 : self.importScripts) === "function" &&
    (((Zs = self.constructor) === null || Zs === void 0 ? void 0 : Zs.name) ===
      "DedicatedWorkerGlobalScope" ||
      ((ea = self.constructor) === null || ea === void 0 ? void 0 : ea.name) === "ServiceWorkerGlobalScope" ||
      ((ta = self.constructor) === null || ta === void 0 ? void 0 : ta.name) === "SharedWorkerGlobalScope"),
  Rl = typeof Deno < "u" && typeof Deno.version < "u" && typeof Deno.version.deno < "u",
  wl = typeof Bun < "u" && typeof Bun.version < "u",
  Gr =
    typeof globalThis.process < "u" &&
    Boolean(globalThis.process.version) &&
    Boolean((ra = globalThis.process.versions) === null || ra === void 0 ? void 0 : ra.node);
//@ chunk-mrx6y2r5.js:47892-48001 esm-fingerprint
var vl =
  typeof navigator < "u" &&
  (navigator === null || navigator === void 0 ? void 0 : navigator.product) === "ReactNative";

export { Gr };
