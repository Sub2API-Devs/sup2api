/**
 * ajv/dist/refs/json-schema-2020-12/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1jdkttw7.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_schema } from "./schema.json.js";
import { require_applicator } from "./meta/applicator.json.js";
import { require_unevaluated } from "./meta/unevaluated.json.js";
import { require_content } from "./meta/content.json.js";
import { require_core } from "./meta/core.json.js";
import { require_format_annotation } from "./meta/format-annotation.json.js";
import { require_meta_data } from "./meta/meta-data.json.js";
import { require_validation } from "./meta/validation.json.js";

//@ chunk-1jdkttw7.js:12941-13282 cjs-require-graph
var require_json_schema_2020_12 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var metaSchema = require_schema();
  var applicator = require_applicator();
  var unevaluated = require_unevaluated();
  var content = require_content();
  var core = require_core();
  var format = require_format_annotation();
  var metadata = require_meta_data();
  var validation = require_validation();
  var META_SUPPORT_DATA = ["/properties"];
  function addMetaSchema2020($data) {
    [
      metaSchema,
      applicator,
      unevaluated,
      content,
      core,
      with$data(this, format),
      metadata,
      with$data(this, validation),
    ].forEach((sch) => this.addMetaSchema(sch, undefined, false));
    return this;
    function with$data(ajv, sch) {
      return $data ? ajv.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
    }
  }
  cjsExports.default = addMetaSchema2020;
});
export { require_json_schema_2020_12 };
