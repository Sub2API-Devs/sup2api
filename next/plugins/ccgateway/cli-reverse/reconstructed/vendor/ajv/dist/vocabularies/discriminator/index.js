/**
 * ajv/dist/vocabularies/discriminator/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_types } from "./types.js";
import { require_compile_2 } from "../../compile/index.js";
import { require_ref_error_2 } from "../../compile/ref_error.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-xcs4sv9h.js:109129-111418 cjs-fingerprint
var require_discriminator = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var types_1 = require_types();
  var compile_1 = require_compile_2();
  var refErrorModule = require_ref_error_2();
  var util_1 = require_util_2();
  var error = {
    message: ({ params: { discrError, tagName } }) =>
      discrError === types_1.DiscrError.Tag
        ? `tag "${tagName}" must be string`
        : `value of tag "${tagName}" must be in oneOf`,
    params: ({ params: { discrError, tag, tagName } }) =>
      codegen_1._`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`,
  };
  var def = {
    keyword: "discriminator",
    type: "object",
    schemaType: "object",
    error,
    code(cxt) {
      let { gen, data, schema, parentSchema, it } = cxt;
      let { oneOf } = parentSchema;
      if (!it.opts.discriminator) throw Error("discriminator: requires discriminator option");
      let tagName = schema.propertyName;
      if (typeof tagName != "string") throw Error("discriminator: requires propertyName");
      if (schema.mapping) throw Error("discriminator: mapping is not supported");
      if (!oneOf) throw Error("discriminator: requires oneOf keyword");
      let valid = gen.let("valid", false);
      let tag = gen.const("tag", codegen_1._`${data}${codegen_1.getProperty(tagName)}`);
      gen.if(
        codegen_1._`typeof ${tag} == "string"`,
        () => validateMapping(),
        () =>
          cxt.error(false, {
            discrError: types_1.DiscrError.Tag,
            tag,
            tagName,
          }),
      );
      cxt.ok(valid);
      function validateMapping() {
        let mapping = getMapping();
        gen.if(false);
        for (let tagValue in mapping) {
          gen.elseIf(codegen_1._`${tag} === ${tagValue}`);
          gen.assign(valid, applyTagSchema(mapping[tagValue]));
        }
        gen.else();
        cxt.error(false, {
          discrError: types_1.DiscrError.Mapping,
          tag,
          tagName,
        });
        gen.endIf();
      }
      function applyTagSchema(schemaProp) {
        let _valid = gen.name("valid");
        let schCxt = cxt.subschema(
          {
            keyword: "oneOf",
            schemaProp,
          },
          _valid,
        );
        cxt.mergeEvaluated(schCxt, codegen_1.Name);
        return _valid;
      }
      function getMapping() {
        var _a;
        let oneOfMapping = {};
        let topRequired = hasRequired(parentSchema);
        let tagRequired = true;
        for (let i = 0; i < oneOf.length; i++) {
          let sch = oneOf[i];
          if (
            (sch === null || sch === undefined ? undefined : sch.$ref) &&
            !util_1.schemaHasRulesButRef(sch, it.self.RULES)
          ) {
            let $ref = sch.$ref;
            sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, $ref);
            if (sch instanceof compile_1.SchemaEnv) sch = sch.schema;
            if (sch === undefined) throw new refErrorModule.default(it.opts.uriResolver, it.baseId, $ref);
          }
          let propSch =
            (_a = sch === null || sch === undefined ? undefined : sch.properties) === null || _a === undefined
              ? undefined
              : _a[tagName];
          if (typeof propSch != "object")
            throw Error(
              `discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`,
            );
          tagRequired = tagRequired && (topRequired || hasRequired(sch));
          addMappings(propSch, i);
        }
        if (!tagRequired) throw Error(`discriminator: "${tagName}" must be required`);
        return oneOfMapping;
        function hasRequired({ required }) {
          return Array.isArray(required) && required.includes(tagName);
        }
        function addMappings(sch, i) {
          if (sch.const) addMapping(sch.const, i);
          else if (sch.enum) for (let tagValue of sch.enum) addMapping(tagValue, i);
          else throw Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
        }
        function addMapping(tagValue, i) {
          if (typeof tagValue != "string" || tagValue in oneOfMapping)
            throw Error(`discriminator: "${tagName}" values must be unique strings`);
          oneOfMapping[tagValue] = i;
        }
      }
    },
  };
  cjsExports.default = def;
});
export { require_discriminator };
