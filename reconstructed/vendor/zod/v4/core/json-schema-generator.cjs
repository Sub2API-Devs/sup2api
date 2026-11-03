/**
 * zod/v4/core/json-schema-generator.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { nd } from "./json-schema-processors.cjs";
import { td } from "./to-json-schema.cjs";

//@ chunk-1ny7cxrt.js:584049-585570 cjs-fingerprint
var sT = x(function (rc) {
  Object.defineProperty(rc, "__esModule", { value: !0 });
  rc.JSONSchemaGenerator = void 0;
  var rT = nd(),
    ta = td();
  class iT {
    get metadataRegistry() {
      return this.ctx.metadataRegistry;
    }
    get target() {
      return this.ctx.target;
    }
    get unrepresentable() {
      return this.ctx.unrepresentable;
    }
    get override() {
      return this.ctx.override;
    }
    get io() {
      return this.ctx.io;
    }
    get counter() {
      return this.ctx.counter;
    }
    set counter(e) {
      this.ctx.counter = e;
    }
    get seen() {
      return this.ctx.seen;
    }
    constructor(e) {
      let t = e?.target ?? "draft-2020-12";
      if (t === "draft-4") t = "draft-04";
      if (t === "draft-7") t = "draft-07";
      this.ctx = ta.initializeContext({
        processors: rT.allProcessors,
        target: t,
        ...(e?.metadata && { metadata: e.metadata }),
        ...(e?.unrepresentable && { unrepresentable: e.unrepresentable }),
        ...(e?.override && { override: e.override }),
        ...(e?.io && { io: e.io }),
      });
    }
    process(e, t = { path: [], schemaPath: [] }) {
      return ta.processSchema(e, this.ctx, t);
    }
    emit(e, t) {
      if (t) {
        if (t.cycles) this.ctx.cycles = t.cycles;
        if (t.reused) this.ctx.reused = t.reused;
        if (t.external) this.ctx.external = t.external;
      }
      ((this.ctx.sharedDefsExtractedFor = void 0),
        (this.ctx.sharedEmitDoneFor = void 0),
        ta.extractDefs(this.ctx, e));
      let finalize = ta.finalize(this.ctx, e),
        { "~standard": o, ...r } = finalize;
      return r;
    }
  }
  rc.JSONSchemaGenerator = iT;
  (function () {
    var ownPropertyNames = Object.getOwnPropertyNames(rc);
    for (var t = 0; t < ownPropertyNames.length; t++) {
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(rc, ownPropertyNames[t]);
      if (!ownPropertyDescriptor || !ownPropertyDescriptor.get || !ownPropertyDescriptor.configurable)
        continue;
      var o;
      try {
        o = ownPropertyDescriptor.get();
      } catch (error) {
        continue;
      }
      if (o === void 0) continue;
      Object.defineProperty(rc, ownPropertyNames[t], {
        value: o,
        writable: !1,
        enumerable: ownPropertyDescriptor.enumerable,
        configurable: !1,
      });
    }
    Object.freeze(rc);
  })();
});

export { sT };
