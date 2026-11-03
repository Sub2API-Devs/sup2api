/**
 * ajv/dist/vocabularies/dynamic/dynamicAnchor.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { DPe } from "../../compile/names.js";
import { tlr } from "../../compile/index.js";
import { _Xr } from "../core/ref.js";

//@ chunk-1r4fv9mg.js:576-1267 cjs-fingerprint
var T = x(function (z) {
  Object.defineProperty(z, "__esModule", { value: !0 });
  z.dynamicAnchor = void 0;
  var A = uh(),
    Te = DPe(),
    O = tlr(),
    G = _Xr(),
    Fe = { keyword: "$dynamicAnchor", schemaType: "string", code: (e) => U(e, e.schema) };
  function U(e, r) {
    let { gen: gen, it: it } = e;
    it.schemaEnv.root.dynamicAnchors[r] = !0;
    let o = A._`${Te.default.dynamicAnchors}${A.getProperty(r)}`,
      i = it.errSchemaPath === "#" ? it.validateName : Ve(e);
    gen.if(A._`!${o}`, () => gen.assign(o, i));
  }
  z.dynamicAnchor = U;
  function Ve(e) {
    let { schemaEnv: schemaEnv, schema: schema, self: n } = e.it,
      { root: root, baseId: baseId, localRefs: localRefs, meta: meta } = schemaEnv.root,
      { schemaId: schemaId } = n.opts,
      p = new O.SchemaEnv({
        schema: schema,
        schemaId: schemaId,
        root: root,
        baseId: baseId,
        localRefs: localRefs,
        meta: meta,
      });
    return (O.compileSchema.call(n, p), G.getValidate(e, p));
  }
  z.default = Fe;
});

export { T };
