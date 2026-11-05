/**
 * ajv/dist/vocabularies/format/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1jdkttw7.js (3), chunk-xcs4sv9h.js (2)
 * attribution: cjs-require-graph 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
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
import { require_dynamicAnchor } from "../dynamic/dynamicAnchor.js";
import { require_dynamicRef } from "../dynamic/dynamicRef.js";
import { require_recursiveAnchor } from "../dynamic/recursiveAnchor.js";
import { require_recursiveRef } from "../dynamic/recursiveRef.js";
import { require_dependentRequired } from "../validation/dependentRequired.js";
import { require_dependentSchemas } from "../applicator/dependentSchemas.js";
import { require_limitContains } from "../validation/limitContains.js";
import { require_unevaluatedProperties } from "../unevaluated/unevaluatedProperties.js";
import { require_unevaluatedItems } from "../unevaluated/unevaluatedItems.js";

//@ chunk-xcs4sv9h.js:105960-106427 cjs-require-graph
var require_format_5 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var additionalItemsModule = require_additionalItems();
  var prefixItemsModule = require_prefixItems();
  var itemsModule = require_items();
  var items2020Module = require_items2020();
  var containsModule = require_contains();
  var dependenciesModule = require_dependencies();
  var propertyNamesModule = require_propertyNames();
  var additionalPropertiesModule = require_additionalProperties();
  var propertiesModule = require_properties();
  var patternPropertiesModule = require_patternProperties();
  var notModule = require_not();
  var anyOfModule = require_anyOf();
  var oneOfModule = require_oneOf();
  var allOfModule = require_allOf();
  var ifModule = require_if();
  var thenElseModule = require_thenElse();
  function applicator(draft2020 = false) {
    let vocabularies = [
      notModule.default,
      anyOfModule.default,
      oneOfModule.default,
      allOfModule.default,
      ifModule.default,
      thenElseModule.default,
      propertyNamesModule.default,
      additionalPropertiesModule.default,
      dependenciesModule.default,
      propertiesModule.default,
      patternPropertiesModule.default,
    ];
    if (draft2020) vocabularies.push(prefixItemsModule.default, items2020Module.default);
    else vocabularies.push(additionalItemsModule.default, itemsModule.default);
    vocabularies.push(containsModule.default);
    return vocabularies;
  }
  cjsExports.default = applicator;
});
//@ chunk-xcs4sv9h.js:108297-108414 cjs-require-graph
var require_format_4 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var format_1 = require_format_6();
  var format = [format_1.default];
  cjsExports.default = format;
});
//@ chunk-1jdkttw7.js:2410-2581 cjs-require-graph
var require_format = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var format_1 = require_dynamicAnchor();
  var dynamicRefModule = require_dynamicRef();
  var recursiveAnchorModule = require_recursiveAnchor();
  var recursiveRefModule = require_recursiveRef();
  var format = [
    format_1.default,
    dynamicRefModule.default,
    recursiveAnchorModule.default,
    recursiveRefModule.default,
  ];
  cjsExports.default = format;
});
//@ chunk-1jdkttw7.js:3299-3453 cjs-require-graph
var require_format_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var format_1 = require_dependentRequired();
  var dependentSchemasModule = require_dependentSchemas();
  var limitContainsModule = require_limitContains();
  var format = [format_1.default, dependentSchemasModule.default, limitContainsModule.default];
  cjsExports.default = format;
});
//@ chunk-1jdkttw7.js:5355-5490 cjs-require-graph
var require_format_3 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var format_1 = require_unevaluatedProperties();
  var unevaluatedItemsModule = require_unevaluatedItems();
  var format = [format_1.default, unevaluatedItemsModule.default];
  cjsExports.default = format;
});
export { require_format_5, require_format_4, require_format, require_format_2, require_format_3 };
