/**
 * @anthropic-ai/bedrock-sdk/internal/errors.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (3), chunk-qhhcfyds.js (3), chunk-xa96axyz.js (2)
 * attribution: esm-layout 4, esm-fingerprint 4
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { nke } from "../../../@smithy/fetch-http-handler/dist-cjs/index.js";
import { Kg } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { yat } from "../../../@smithy/signature-v4/dist-cjs/index.js";
import { wD } from "../../../@smithy/node-config-provider/dist-cjs/index.js";
import { dR } from "../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { Wur } from "../../../google-auth-library/build/src/index.js";

//@ chunk-h87x8cg3.js:937-982 esm-layout
var D = Re(nke(), 1),
  K = Re(Kg(), 1),
  M = Re(yat(), 1);
//@ chunk-h87x8cg3.js:1005-1173 esm-fingerprint
function j(e) {
  return (
    typeof e === "object" &&
    e !== null &&
    (("name" in e && e.name === "AbortError") ||
      ("message" in e && String(e.message).includes("FetchRequestCanceledException")))
  );
}
//@ chunk-h87x8cg3.js:1173-1564 esm-fingerprint
var x = (e) => {
  if (e instanceof Error) return e;
  if (typeof e === "object" && e !== null) {
    try {
      let t = Object.prototype.toString.call(e);
      if (t === "[object Error]" || t === "[object DOMException]") {
        let r = Error(e.message, e.cause ? { cause: e.cause } : {});
        if (e.stack) r.stack = e.stack;
        if (e.cause && !r.cause) r.cause = e.cause;
        if (e.name) r.name = e.name;
        return r;
      }
    } catch {}
    try {
      return Error(JSON.stringify(e));
    } catch {}
  }
  return Error(e);
};
//@ chunk-qhhcfyds.js:2410-2440 esm-layout
var H_2 = Re(wD(), 1),
  g_2 = Re(dR(), 1);
//@ chunk-qhhcfyds.js:2440-2485 esm-layout
var k = Re(nke(), 1),
  N = Re(Kg(), 1),
  D_qhhc = Re(yat(), 1);
//@ chunk-qhhcfyds.js:2508-2899 esm-fingerprint
var j_qhhc = (e) => {
  if (e instanceof Error) return e;
  if (typeof e === "object" && e !== null) {
    try {
      let t = Object.prototype.toString.call(e);
      if (t === "[object Error]" || t === "[object DOMException]") {
        let r = Error(e.message, e.cause ? { cause: e.cause } : {});
        if (e.stack) r.stack = e.stack;
        if (e.cause && !r.cause) r.cause = e.cause;
        if (e.name) r.name = e.name;
        return r;
      }
    } catch {}
    try {
      return Error(JSON.stringify(e));
    } catch {}
  }
  return Error(e);
};
//@ chunk-xa96axyz.js:381-399 esm-layout
var _ = Re(Wur(), 1);
//@ chunk-xa96axyz.js:399-790 esm-fingerprint
var g_xa96 = (e) => {
  if (e instanceof Error) return e;
  if (typeof e === "object" && e !== null) {
    try {
      let t = Object.prototype.toString.call(e);
      if (t === "[object Error]" || t === "[object DOMException]") {
        let r = Error(e.message, e.cause ? { cause: e.cause } : {});
        if (e.stack) r.stack = e.stack;
        if (e.cause && !r.cause) r.cause = e.cause;
        if (e.name) r.name = e.name;
        return r;
      }
    } catch {}
    try {
      return Error(JSON.stringify(e));
    } catch {}
  }
  return Error(e);
};

export { D, x, M, K, j, k, j_qhhc, D_qhhc, N, H_2, g_2, _, g_xa96 };
