/**
 * @modelcontextprotocol/sdk/dist/esm/server/zod-compat.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (4)
 * attribution: esm-fingerprint 4
 */
import { qgs } from "../../../../../zod/v4/core/parse.js";

//@ chunk-zykv69v4.js:10458-10489 esm-fingerprint
function isZ4Schema(e) {
  return !!e._zod;
}
//@ chunk-zykv69v4.js:10489-10554 esm-fingerprint
function objectFromShape(shape, t) {
  if (isZ4Schema(shape)) return qgs(shape, t);
  return shape.safeParse(t);
}
//@ chunk-zykv69v4.js:10554-10710 esm-fingerprint
function J$t(schema) {
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
//@ chunk-zykv69v4.js:10710-11023 esm-fingerprint
function H(methodSchema) {
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
export { J$t, isZ4Schema, objectFromShape, H };
