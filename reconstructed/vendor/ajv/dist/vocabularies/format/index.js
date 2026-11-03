/**
 * ajv/dist/vocabularies/format/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (3), chunk-s82q9s4x.js (2)
 * attribution: cjs-require-graph 5
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_dynamicAnchor } from "../dynamic/dynamicAnchor.js";
import { require_dynamicRef } from "../dynamic/dynamicRef.js";
import { require_recursiveAnchor } from "../dynamic/recursiveAnchor.js";
import { require_recursiveRef } from "../dynamic/recursiveRef.js";
import { require_dependentRequired } from "../validation/dependentRequired.js";
import { require_dependentSchemas } from "../applicator/dependentSchemas.js";
import { require_limitContains } from "../validation/limitContains.js";
import { require_unevaluatedProperties } from "../unevaluated/unevaluatedProperties.js";
import { require_unevaluatedItems } from "../unevaluated/unevaluatedItems.js";
import { require_additionalItems } from "../applicator/additionalItems.js";
import { require_prefixItems } from "../applicator/prefixItems.js";
import { require_items } from "../applicator/items.js";
import { require_items2020 } from "../applicator/items2020.js";
import { require_contains } from "../applicator/contains.js";
import { require_dependencies } from "../applicator/dependencies.js";
import { require_propertyNames } from "../applicator/propertyNames.js";
import { require_additionalProperties } from "../applicator/additionalProperties.js";
import { require_properties } from "../applicator/properties.js";
import { require_patternProperties } from "../applicator/patternProperties.js";
import { require_not } from "../applicator/not.js";
import { require_anyOf } from "../applicator/anyOf.js";
import { require_oneOf } from "../applicator/oneOf.js";
import { require_allOf } from "../applicator/allOf.js";
import { require_if } from "../applicator/if.js";
import { require_thenElse } from "../applicator/thenElse.js";
import { require_format_6 } from "./format.js";

//@ chunk-1r4fv9mg.js:2409-2580 cjs-require-graph
var require_format = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var format_1 = require_dynamicAnchor();
  var Ye = require_dynamicRef();
  var Ze = require_recursiveAnchor();
  var Be = require_recursiveRef();
  var format = [format_1.default, Ye.default, Ze.default, Be.default];
  cjsExports.default = format;
});
//@ chunk-1r4fv9mg.js:3298-3452 cjs-require-graph
var require_format_2 = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var format_1 = require_dependentRequired();
  var it = require_dependentSchemas();
  var ct = require_limitContains();
  var format = [format_1.default, it.default, ct.default];
  cjsExports.default = format;
});
//@ chunk-1r4fv9mg.js:5354-5489 cjs-require-graph
var require_format_3 = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var format_1 = require_unevaluatedProperties();
  var bt = require_unevaluatedItems();
  var format = [format_1.default, bt.default];
  cjsExports.default = format;
});
//@ chunk-s82q9s4x.js:105960-106427 cjs-require-graph
var require_format_5 = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var Up = require_additionalItems();
  var Kp = require_prefixItems();
  var Fp = require_items();
  var Lp = require_items2020();
  var Hp = require_contains();
  var Gp = require_dependencies();
  var Jp = require_propertyNames();
  var Wp = require_additionalProperties();
  var Bp = require_properties();
  var Qp = require_patternProperties();
  var Xp = require_not();
  var Yp = require_anyOf();
  var Zp = require_oneOf();
  var eh = require_allOf();
  var th = require_if();
  var rh = require_thenElse();
  function sh(e = false) {
    let t = [
      Xp.default,
      Yp.default,
      Zp.default,
      eh.default,
      th.default,
      rh.default,
      Jp.default,
      Wp.default,
      Gp.default,
      Bp.default,
      Qp.default,
    ];
    if (e) t.push(Kp.default, Lp.default);
    else t.push(Up.default, Fp.default);
    t.push(Hp.default);
    return t;
  }
  cjsExports.default = sh;
});
//@ chunk-s82q9s4x.js:108297-108414 cjs-require-graph
var require_format_4 = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var format_1 = require_format_6();
  var format = [format_1.default];
  cjsExports.default = format;
});
export { require_format_5, require_format, require_format_2, require_format_3, require_format_4 };
