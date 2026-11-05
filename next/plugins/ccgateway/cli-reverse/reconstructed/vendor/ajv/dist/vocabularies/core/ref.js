/**
 * ajv/dist/vocabularies/core/ref.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_ref_error_2 } from "../../compile/ref_error.js";
import { require_code_2 } from "../code.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_names } from "../../compile/names.js";
import { require_compile_2 } from "../../compile/index.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-xcs4sv9h.js:81297-83654 cjs-fingerprint
var require_ref = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.callRef = cjsExports.getValidate = undefined;
  var ref_error_1 = require_ref_error_2();
  var code_1 = require_code_2();
  var codegen_1 = require_codegen_2();
  var names_1 = require_names();
  var compile_1 = require_compile_2();
  var util_1 = require_util_2();
  var def = {
    keyword: "$ref",
    schemaType: "string",
    code(cxt) {
      let { gen, schema: $ref, it } = cxt;
      let { baseId, schemaEnv: env, validateName, opts, self: ajvInstance } = it;
      let { root } = env;
      if (($ref === "#" || $ref === "#/") && baseId === root.baseId) return callRootRef();
      let schOrEnv = compile_1.resolveRef.call(ajvInstance, root, baseId, $ref);
      if (schOrEnv === undefined) throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
      if (schOrEnv instanceof compile_1.SchemaEnv) return callValidate(schOrEnv);
      return inlineRefSchema(schOrEnv);
      function callRootRef() {
        if (env === root) return callRef(cxt, validateName, env, env.$async);
        let rootName = gen.scopeValue("root", {
          ref: root,
        });
        return callRef(cxt, codegen_1._`${rootName}.validate`, root, root.$async);
      }
      function callValidate(sch) {
        let v = getValidate(cxt, sch);
        callRef(cxt, v, sch, sch.$async);
      }
      function inlineRefSchema(sch) {
        let schName = gen.scopeValue(
          "schema",
          opts.code.source === true
            ? {
                ref: sch,
                code: codegen_1.stringify(sch),
              }
            : {
                ref: sch,
              },
        );
        let valid = gen.name("valid");
        let schCxt = cxt.subschema(
          {
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref,
          },
          valid,
        );
        cxt.mergeEvaluated(schCxt);
        cxt.ok(valid);
      }
    },
  };
  function getValidate(cxt, sch) {
    let { gen } = cxt;
    return sch.validate
      ? gen.scopeValue("validate", {
          ref: sch.validate,
        })
      : codegen_1._`${gen.scopeValue("wrapper", {
          ref: sch,
        })}.validate`;
  }
  cjsExports.getValidate = getValidate;
  function callRef(cxt, v, sch, $async) {
    let { gen, it } = cxt;
    let { allErrors, schemaEnv: env, opts } = it;
    let passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
    if ($async) callAsyncRef();
    else callSyncRef();
    function callAsyncRef() {
      if (!env.$async) throw Error("async schema referenced by sync schema");
      let valid = gen.let("valid");
      gen.try(
        () => {
          gen.code(codegen_1._`await ${code_1.callValidateCode(cxt, v, passCxt)}`);
          addEvaluatedFrom(v);
          if (!allErrors) gen.assign(valid, true);
        },
        (e) => {
          gen.if(codegen_1._`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
          addErrorsFrom(e);
          if (!allErrors) gen.assign(valid, false);
        },
      );
      cxt.ok(valid);
    }
    function callSyncRef() {
      cxt.result(
        code_1.callValidateCode(cxt, v, passCxt),
        () => addEvaluatedFrom(v),
        () => addErrorsFrom(v),
      );
    }
    function addErrorsFrom(source) {
      let errs = codegen_1._`${source}.errors`;
      gen.assign(
        names_1.default.vErrors,
        codegen_1._`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`,
      );
      gen.assign(names_1.default.errors, codegen_1._`${names_1.default.vErrors}.length`);
    }
    function addEvaluatedFrom(source) {
      var _a;
      if (!it.opts.unevaluated) return;
      let schEvaluated =
        (_a = sch === null || sch === undefined ? undefined : sch.validate) === null || _a === undefined
          ? undefined
          : _a.evaluated;
      if (it.props !== true)
        if (schEvaluated && !schEvaluated.dynamicProps) {
          if (schEvaluated.props !== undefined)
            it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
        } else {
          let props = gen.var("props", codegen_1._`${source}.evaluated.props`);
          it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
        }
      if (it.items !== true)
        if (schEvaluated && !schEvaluated.dynamicItems) {
          if (schEvaluated.items !== undefined)
            it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
        } else {
          let items = gen.var("items", codegen_1._`${source}.evaluated.items`);
          it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
        }
    }
  }
  cjsExports.callRef = callRef;
  cjsExports.default = def;
});
export { require_ref };
