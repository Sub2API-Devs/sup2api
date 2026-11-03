/**
 * @modelcontextprotocol/sdk/dist/esm/server/zod-json-schema-compat.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (2)
 * attribution: esm-fingerprint 2
 */
import { J$t, H, q7 } from "./zod-compat.js";

//@ chunk-zykv69v4.js:11237-11425 esm-fingerprint
function R(e) {
  let r = J$t(e)?.method;
  if (!r) throw Error("Schema is missing a method literal");
  let a = H(r);
  if (typeof a !== "string") throw Error("Schema method literal must be a string");
  return a;
}
//@ chunk-zykv69v4.js:11425-11497 esm-fingerprint
function z(e, t) {
  let r = q7(e, t);
  if (!r.success) throw r.error;
  return r.data;
}

export { R, z };
