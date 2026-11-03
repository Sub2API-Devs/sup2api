/**
 * @modelcontextprotocol/sdk/dist/esm/server/zod-json-schema-compat.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (2)
 * attribution: esm-fingerprint 2
 */
import { J$t, H, objectFromShape } from "./zod-compat.js";

//@ chunk-zykv69v4.js:11237-11425 esm-fingerprint
function R(schema) {
  let methodSchema = J$t(schema)?.method;
  if (!methodSchema) throw Error("Schema is missing a method literal");
  let value = H(methodSchema);
  if (typeof value !== "string") throw Error("Schema method literal must be a string");
  return value;
}
//@ chunk-zykv69v4.js:11425-11497 esm-fingerprint
function parseWithCompat(schema, data) {
  let result = objectFromShape(schema, data);
  if (!result.success) throw result.error;
  return result.data;
}
export { R, parseWithCompat };
