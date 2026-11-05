/**
 * ajv/dist/vocabularies/validation/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_limitNumber } from "./limitNumber.js";
import { require_multipleOf } from "./multipleOf.js";
import { require_limitLength } from "./limitLength.js";
import { require_pattern } from "./pattern.js";
import { require_limitProperties } from "./limitProperties.js";
import { require_required } from "./required.js";
import { require_limitItems } from "./limitItems.js";
import { require_uniqueItems } from "./uniqueItems.js";
import { require_const } from "./const.js";
import { require_enum } from "./enum.js";

//@ chunk-xcs4sv9h.js:91741-92118 cjs-fingerprint
var require_validation = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var limitNumber_1 = require_limitNumber();
  var multipleOf_1 = require_multipleOf();
  var limitLength_1 = require_limitLength();
  var pattern_1 = require_pattern();
  var limitProperties_1 = require_limitProperties();
  var required_1 = require_required();
  var limitItems_1 = require_limitItems();
  var uniqueItems_1 = require_uniqueItems();
  var const_1 = require_const();
  var enum_1 = require_enum();
  var validation = [
    limitNumber_1.default,
    multipleOf_1.default,
    limitLength_1.default,
    pattern_1.default,
    limitProperties_1.default,
    required_1.default,
    limitItems_1.default,
    uniqueItems_1.default,
    {
      keyword: "type",
      schemaType: ["string", "array"],
    },
    {
      keyword: "nullable",
      schemaType: "boolean",
    },
    const_1.default,
    enum_1.default,
  ];
  cjsExports.default = validation;
});
export { require_validation };
