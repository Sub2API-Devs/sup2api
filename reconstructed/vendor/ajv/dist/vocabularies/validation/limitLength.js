/**
 * ajv/dist/vocabularies/validation/limitLength.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";
import { Oo } from "../../runtime/ucs2length.js";

//@ chunk-s82q9s4x.js:85340-85927 cjs-fingerprint
var Ro = x(function (xo) {
  Object.defineProperty(xo, "__esModule", { value: !0 });
  var G = uh(),
    jo = ew(),
    pf = Oo(),
    hf = {
      message({ keyword: e, schemaCode: t }) {
        return G.str`must NOT have ${e === "maxLength" ? "more" : "fewer"} than ${t} characters`;
      },
      params: ({ schemaCode: schemaCode }) => G._`{limit: ${schemaCode}}`,
    },
    mf = {
      keyword: ["maxLength", "minLength"],
      type: "string",
      schemaType: "number",
      $data: !0,
      error: hf,
      code(e) {
        let { keyword: keyword, data: r, schemaCode: schemaCode, it: it } = e,
          o = keyword === "maxLength" ? G.operators.GT : G.operators.LT,
          i = it.opts.unicode === !1 ? G._`${r}.length` : G._`${jo.useFunc(e.gen, pf.default)}(${r})`;
        e.fail$data(G._`${i} ${o} ${schemaCode}`);
      },
    };
  xo.default = mf;
});

export { Ro };
