/**
 * ajv/dist/vocabularies/applicator/dependencies.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";
import { require_code_2 } from "../code.js";

//@ chunk-xcs4sv9h.js:96663-98190 cjs-fingerprint
var require_dependencies = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateSchemaDeps = cjsExports.validatePropertyDeps = cjsExports.error = undefined;
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var code_1 = require_code_2();
  cjsExports.error = {
    message: ({ params: { property, depsCount, deps } }) =>
      codegen_1.str`must have ${depsCount === 1 ? "property" : "properties"} ${deps} when property ${property} is present`,
    params: ({
      params: { property, depsCount, deps, missingProperty },
    }) => codegen_1._`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`,
  };
  var def = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: cjsExports.error,
    code(cxt) {
      let [propDeps, schDeps] = splitDependencies(cxt);
      validatePropertyDeps(cxt, propDeps);
      validateSchemaDeps(cxt, schDeps);
    },
  };
  function splitDependencies({ schema }) {
    let propertyDeps = {};
    let schemaDeps = {};
    for (let key in schema) {
      if (key === "__proto__") continue;
      let deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
      deps[key] = schema[key];
    }
    return [propertyDeps, schemaDeps];
  }
  function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
    let { gen, data, it } = cxt;
    if (Object.keys(propertyDeps).length === 0) return;
    let missing = gen.let("missing");
    for (let prop in propertyDeps) {
      let deps = propertyDeps[prop];
      if (deps.length === 0) continue;
      let hasProperty = code_1.propertyInData(gen, data, prop, it.opts.ownProperties);
      cxt.setParams({
        property: prop,
        depsCount: deps.length,
        deps: deps.join(", "),
      });
      if (it.allErrors)
        gen.if(hasProperty, () => {
          for (let depProp of deps) code_1.checkReportMissingProp(cxt, depProp);
        });
      else {
        gen.if(codegen_1._`${hasProperty} && (${code_1.checkMissingProp(cxt, deps, missing)})`);
        code_1.reportMissingProp(cxt, missing);
        gen.else();
      }
    }
  }
  cjsExports.validatePropertyDeps = validatePropertyDeps;
  function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
    let { gen, data, keyword, it } = cxt;
    let valid = gen.name("valid");
    for (let prop in schemaDeps) {
      if (util_1.alwaysValidSchema(it, schemaDeps[prop])) continue;
      gen.if(
        code_1.propertyInData(gen, data, prop, it.opts.ownProperties),
        () => {
          let schCxt = cxt.subschema(
            {
              keyword,
              schemaProp: prop,
            },
            valid,
          );
          cxt.mergeValidEvaluated(schCxt, valid);
        },
        () => gen.var(valid, true),
      );
      cxt.ok(valid);
    }
  }
  cjsExports.validateSchemaDeps = validateSchemaDeps;
  cjsExports.default = def;
});
export { require_dependencies };
