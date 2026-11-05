/**
 * @modelcontextprotocol/sdk/dist/esm/server/zod-compat.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-efaj9q04.js (4)
 * attribution: esm-fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { safeParseReal } from "../../../../../zod/v4/core/parse.js";

//@ chunk-efaj9q04.js:10458-10489 esm-fingerprint
function isZ4Schema(schema) {
  return !!schema._zod;
}
//@ chunk-efaj9q04.js:10489-10555 esm-fingerprint
function objectFromShape(shape, data) {
  if (isZ4Schema(shape)) return safeParseReal(shape, data);
  return shape.safeParse(data);
}
//@ chunk-efaj9q04.js:10555-10711 esm-fingerprint
function getShape(schema) {
  if (!schema) return;
  let rawShape;
  if (isZ4Schema(schema)) rawShape = schema._zod?.def?.shape;
  else rawShape = schema.shape;
  if (!rawShape) return;
  if (typeof rawShape === "function")
    try {
      return rawShape();
    } catch {
      return;
    }
  return rawShape;
}
//@ chunk-efaj9q04.js:10711-11024 esm-fingerprint
function getLiteralValue(methodSchema) {
  if (isZ4Schema(methodSchema)) {
    let def = methodSchema._zod?.def;
    if (def) {
      if (def.value !== undefined) return def.value;
      if (Array.isArray(def.values) && def.values.length > 0) return def.values[0];
    }
  }
  let def = methodSchema._def;
  if (def) {
    if (def.value !== undefined) return def.value;
    if (Array.isArray(def.values) && def.values.length > 0) return def.values[0];
  }
  let directValue = methodSchema.value;
  if (directValue !== undefined) return directValue;
  return;
}
export { getShape, isZ4Schema, objectFromShape, getLiteralValue };
