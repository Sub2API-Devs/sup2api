/**
 * @modelcontextprotocol/sdk/dist/esm/server/zod-json-schema-compat.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-efaj9q04.js (2)
 * attribution: esm-fingerprint 2
 */
import { getShape, getLiteralValue, objectFromShape } from "./zod-compat.js";

//@ chunk-efaj9q04.js:11238-11426 esm-fingerprint
function getMethodFromSchema(schema) {
  let methodSchema = getShape(schema)?.method;
  if (!methodSchema) throw Error("Schema is missing a method literal");
  let value = getLiteralValue(methodSchema);
  if (typeof value !== "string") throw Error("Schema method literal must be a string");
  return value;
}
//@ chunk-efaj9q04.js:11426-11499 esm-fingerprint
function parseWithCompat(schema, data) {
  let result = objectFromShape(schema, data);
  if (!result.success) throw result.error;
  return result.data;
}
export { getMethodFromSchema, parseWithCompat };
