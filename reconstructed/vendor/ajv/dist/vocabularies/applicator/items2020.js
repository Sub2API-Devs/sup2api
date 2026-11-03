/**
 * ajv/dist/vocabularies/applicator/items2020.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";
import { Q } from "../code.js";
import { Rr } from "./additionalItems.js";

//@ chunk-s82q9s4x.js:94448-94968 cjs-fingerprint
var hi = x(function (pi) {
  Object.defineProperty(pi, "__esModule", { value: !0 });
  var Ut = uh(),
    li = ew(),
    di = Q(),
    fi = Rr(),
    ip = {
      message: ({ params: { len: e } }) => Ut.str`must NOT have more than ${e} items`,
      params: ({ params: { len: e } }) => Ut._`{limit: ${e}}`,
    },
    ap = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error: ip,
      code(e) {
        let { schema: schema, parentSchema: parentSchema, it: it } = e,
          { prefixItems: prefixItems } = parentSchema;
        if (((it.items = !0), li.alwaysValidSchema(it, schema))) return;
        if (prefixItems) fi.validateAdditionalItems(e, prefixItems);
        else e.ok(di.validateArray(e));
      },
    };
  pi.default = ap;
});

export { hi };
