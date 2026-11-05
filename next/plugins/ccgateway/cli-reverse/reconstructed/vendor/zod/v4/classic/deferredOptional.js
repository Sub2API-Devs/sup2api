/**
 * zod/v4/classic/deferredOptional.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-z20c443b.js (2)
 * attribution: placement 2
 */
import { $ZodType } from "../core/schemas.js";
import { ZodType } from "./schemas.js";
import { $constructor } from "../core/core.js";
import { processSchema } from "../core/to-json-schema.js";
import { defineLazy, cleanRegex } from "../core/util.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:195548-196194 placement
/**
 * 延迟可选的 zod 类型。
 */
var ZodDeferredOptional; // deferred: uses ZodType (./schemas.js) of its import cycle while loading; runs once the cycle is complete
var zodDeferredOptionalInner;
var createDeferredOptional;
deferInit("chunk-z20c443b.js:195548", () => {
  ZodDeferredOptional = $ZodType;
  zodDeferredOptionalInner = ZodType;
  createDeferredOptional = $constructor("ZodDeferredOptional", (schema, def) => {
    ZodDeferredOptional.init(schema, def);
    zodDeferredOptionalInner.init(schema, def);
    schema._zod.optin = "optional";
    schema._zod.optout = "optional";
    Object.defineProperty(schema._zod, "innerType", {
      get: def.built,
      configurable: true,
    });
    schema._zod.processJSONSchema = (ctx, params, io) => {
      let getter = def.getter();
      processSchema(getter, ctx, io);
      ctx.seen.get(schema).ref = getter;
    };
    defineLazy(schema._zod, "values", () => {
      let values = def.getter()._zod.values;
      return values ? new Set([...values, undefined]) : undefined;
    });
    defineLazy(schema._zod, "pattern", () => {
      let pattern = def.getter()._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : undefined;
    });
    defineLazy(schema._zod, "propValues", () => def.getter()._zod.propValues);
    schema._zod.parse = (payload, ctx) => {
      if (payload.value === undefined) return payload;
      return def.getter()._zod.run(payload, ctx);
    };
    schema.unwrap = def.getter;
  });
});
//@ chunk-z20c443b.js:196194-196671 placement
/**
 * 创建延迟可选 schema（惰性 getter）。
 */
function deferredOptional(getter) {
  let built;
  return new createDeferredOptional({
    type: "lazy",
    getter: () => {
      if (built === undefined) {
        let inner = getter();
        if (inner._zod.optin !== undefined)
          throw Error(
            "deferredOptional(): the schema the build callback returned already handles a missing key itself (.optional(), .catch(), .default(), .prefault(), z.preprocess(), or a union or wrapper holding one). Return the plain schema and let deferredOptional() make it optional, or use that schema with .optional() without deferring it.",
          );
        built = inner;
      }
      return built;
    },
    built: () => built,
  });
}
export { deferredOptional, createDeferredOptional };
