/**
 * ajv/dist/vocabularies/validation/pattern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Q } from "../code.js";
import { ew } from "../../compile/util.js";
import { uh } from "../../compile/codegen/index.js";

//@ chunk-s82q9s4x.js:85927-86590 cjs-fingerprint
var Mo = x(function (Co) {
  Object.defineProperty(Co, "__esModule", { value: !0 });
  var Io = Q(),
    To = ew(),
    X = uh(),
    _f = {
      message: ({ schemaCode: schemaCode }) => X.str`must match pattern "${schemaCode}"`,
      params: ({ schemaCode: schemaCode }) => X._`{pattern: ${schemaCode}}`,
    },
    gf = {
      keyword: "pattern",
      type: "string",
      schemaType: "string",
      $data: !0,
      error: _f,
      code(e) {
        let { gen: gen, data: r, $data: $data, schema: schema, schemaCode: schemaCode, it: it } = e,
          a = it.opts.unicodeRegExp ? "u" : "";
        if ($data) {
          let { regExp: regExp } = it.opts.code,
            u = regExp.code === "new RegExp" ? X._`new RegExp` : To.useFunc(gen, regExp),
            l = gen.let("valid");
          (gen.try(
            () => gen.assign(l, X._`${u}(${schemaCode}, ${a}).test(${r})`),
            () => gen.assign(l, !1),
          ),
            e.fail$data(X._`!${l}`));
        } else {
          let usePattern = Io.usePattern(e, schema);
          e.fail$data(X._`!${usePattern}.test(${r})`);
        }
      },
    };
  Co.default = gf;
});

export { Mo };
