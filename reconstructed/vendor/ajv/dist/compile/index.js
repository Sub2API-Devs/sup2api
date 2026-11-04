/**
 * ajv/dist/compile/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "./codegen/index.js";
import { require_validation_error_2 } from "../runtime/validation_error.js";
import { require_names } from "./names.js";
import { require_resolve_2 } from "./resolve.js";
import { require_util_2 } from "./util.js";
import { require_validate_2 } from "./validate/index.js";

//@ chunk-s82q9s4x.js:52476-57215 cjs-fingerprint
var require_compile_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.resolveSchema =
    cjsExports.getCompilingSchema =
    cjsExports.resolveRef =
    cjsExports.compileSchema =
    cjsExports.SchemaEnv =
      undefined;
  var codegen_1 = require_codegen_2();
  var validation_error_1 = require_validation_error_2();
  var names_1 = require_names();
  var resolve_1 = require_resolve_2();
  var util_1 = require_util_2();
  var validate_1 = require_validate_2();
  class SchemaEnv {
    constructor(env) {
      var _a;
      this.refs = {};
      this.dynamicAnchors = {};
      let schema;
      if (typeof env.schema == "object") schema = env.schema;
      this.schema = env.schema;
      this.schemaId = env.schemaId;
      this.root = env.root || this;
      this.baseId =
        (_a = env.baseId) !== null && _a !== undefined
          ? _a
          : resolve_1.normalizeId(
              schema === null || schema === undefined ? undefined : schema[env.schemaId || "$id"],
            );
      this.schemaPath = env.schemaPath;
      this.localRefs = env.localRefs;
      this.meta = env.meta;
      this.$async = schema === null || schema === undefined ? undefined : schema.$async;
      this.refs = {};
    }
  }
  cjsExports.SchemaEnv = SchemaEnv;
  function compileSchema(sch) {
    let _sch = getCompilingSchema.call(this, sch);
    if (_sch) return _sch;
    let rootId = resolve_1.getFullPath(this.opts.uriResolver, sch.root.baseId);
    let { es5, lines } = this.opts.code;
    let { ownProperties } = this.opts;
    let gen = new codegen_1.CodeGen(this.scope, {
      es5,
      lines,
      ownProperties,
    });
    let _ValidationError;
    if (sch.$async)
      _ValidationError = gen.scopeValue("Error", {
        ref: validation_error_1.default,
        code: codegen_1._`require("ajv/dist/runtime/validation_error").default`,
      });
    let validateName = gen.scopeName("validate");
    sch.validateName = validateName;
    let schemaCxt = {
      gen,
      allErrors: this.opts.allErrors,
      data: names_1.default.data,
      parentData: names_1.default.parentData,
      parentDataProperty: names_1.default.parentDataProperty,
      dataNames: [names_1.default.data],
      dataPathArr: [codegen_1.nil],
      dataLevel: 0,
      dataTypes: [],
      definedProperties: new Set(),
      topSchemaRef: gen.scopeValue(
        "schema",
        this.opts.code.source === true
          ? {
              ref: sch.schema,
              code: codegen_1.stringify(sch.schema),
            }
          : {
              ref: sch.schema,
            },
      ),
      validateName,
      ValidationError: _ValidationError,
      schema: sch.schema,
      schemaEnv: sch,
      rootId,
      baseId: sch.baseId || rootId,
      schemaPath: codegen_1.nil,
      errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
      errorPath: codegen_1._`""`,
      opts: this.opts,
      self: this,
    };
    let sourceCode;
    try {
      this._compilations.add(sch);
      validate_1.validateFunctionCode(schemaCxt);
      gen.optimize(this.opts.code.optimize);
      let validateCode = gen.toString();
      sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
      if (this.opts.code.process) sourceCode = this.opts.code.process(sourceCode, sch);
      let validate = Function(
        `${names_1.default.self}`,
        `${names_1.default.scope}`,
        sourceCode,
      )(this, this.scope.get());
      this.scope.value(validateName, {
        ref: validate,
      });
      validate.errors = null;
      validate.schema = sch.schema;
      validate.schemaEnv = sch;
      if (sch.$async) validate.$async = true;
      if (this.opts.code.source === true)
        validate.source = {
          validateName,
          validateCode,
          scopeValues: gen._values,
        };
      if (this.opts.unevaluated) {
        let { props, items } = schemaCxt;
        validate.evaluated = {
          props: props instanceof codegen_1.Name ? undefined : props,
          items: items instanceof codegen_1.Name ? undefined : items,
          dynamicProps: props instanceof codegen_1.Name,
          dynamicItems: items instanceof codegen_1.Name,
        };
        if (validate.source) validate.source.evaluated = codegen_1.stringify(validate.evaluated);
      }
      sch.validate = validate;
      return sch;
    } catch (e) {
      delete sch.validate;
      delete sch.validateName;
      if (sourceCode) this.logger.error("Error compiling schema, function code:", sourceCode);
      throw e;
    } finally {
      this._compilations.delete(sch);
    }
  }
  cjsExports.compileSchema = compileSchema;
  function resolveRef(root, baseId, ref) {
    var _a;
    ref = resolve_1.resolveUrl(this.opts.uriResolver, baseId, ref);
    let schOrFunc = root.refs[ref];
    if (schOrFunc) return schOrFunc;
    let _sch = resolve.call(this, root, ref);
    if (_sch === undefined) {
      let schema = (_a = root.localRefs) === null || _a === undefined ? undefined : _a[ref];
      let { schemaId } = this.opts;
      if (schema)
        _sch = new SchemaEnv({
          schema,
          schemaId,
          root,
          baseId,
        });
    }
    if (_sch === undefined) return;
    return (root.refs[ref] = inlineOrCompile.call(this, _sch));
  }
  cjsExports.resolveRef = resolveRef;
  function inlineOrCompile(sch) {
    if (resolve_1.inlineRef(sch.schema, this.opts.inlineRefs)) return sch.schema;
    return sch.validate ? sch : compileSchema.call(this, sch);
  }
  function getCompilingSchema(schEnv) {
    for (let sch of this._compilations) if (sameSchemaEnv(sch, schEnv)) return sch;
  }
  cjsExports.getCompilingSchema = getCompilingSchema;
  function sameSchemaEnv(s1, s2) {
    return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
  }
  function resolve(root, ref) {
    let sch;
    while (typeof (sch = this.refs[ref]) == "string") ref = sch;
    return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
  }
  function resolveSchema(root, ref) {
    let p = this.opts.uriResolver.parse(ref);
    let refPath = resolve_1._getFullPath(this.opts.uriResolver, p);
    let baseId = resolve_1.getFullPath(this.opts.uriResolver, root.baseId, undefined);
    if (Object.keys(root.schema).length > 0 && refPath === baseId) return getJsonPointer.call(this, p, root);
    let id = resolve_1.normalizeId(refPath);
    let schOrRef = this.refs[id] || this.schemas[id];
    if (typeof schOrRef == "string") {
      let sch = resolveSchema.call(this, root, schOrRef);
      if (typeof (sch === null || sch === undefined ? undefined : sch.schema) !== "object") return;
      return getJsonPointer.call(this, p, sch);
    }
    if (typeof (schOrRef === null || schOrRef === undefined ? undefined : schOrRef.schema) !== "object")
      return;
    if (!schOrRef.validate) compileSchema.call(this, schOrRef);
    if (id === resolve_1.normalizeId(ref)) {
      let { schema } = schOrRef;
      let { schemaId } = this.opts;
      let schId = schema[schemaId];
      if (schId) baseId = resolve_1.resolveUrl(this.opts.uriResolver, baseId, schId);
      return new SchemaEnv({
        schema,
        schemaId,
        root,
        baseId,
      });
    }
    return getJsonPointer.call(this, p, schOrRef);
  }
  cjsExports.resolveSchema = resolveSchema;
  var PREVENT_SCOPE_CHANGE = new Set([
    "properties",
    "patternProperties",
    "enum",
    "dependencies",
    "definitions",
  ]);
  function getJsonPointer(parsedRef, { baseId, schema, root }) {
    var _a;
    if (((_a = parsedRef.fragment) === null || _a === undefined ? undefined : _a[0]) !== "/") return;
    for (let part of parsedRef.fragment.slice(1).split("/")) {
      if (typeof schema === "boolean") return;
      let partSchema = schema[util_1.unescapeFragment(part)];
      if (partSchema === undefined) return;
      schema = partSchema;
      let schId = typeof schema === "object" && schema[this.opts.schemaId];
      if (!PREVENT_SCOPE_CHANGE.has(part) && schId)
        baseId = resolve_1.resolveUrl(this.opts.uriResolver, baseId, schId);
    }
    let env;
    if (typeof schema != "boolean" && schema.$ref && !util_1.schemaHasRulesButRef(schema, this.RULES)) {
      let $ref = resolve_1.resolveUrl(this.opts.uriResolver, baseId, schema.$ref);
      env = resolveSchema.call(this, root, $ref);
    }
    let { schemaId } = this.opts;
    env =
      env ||
      new SchemaEnv({
        schema,
        schemaId,
        root,
        baseId,
      });
    if (env.schema !== env.root.schema) return env;
    return;
  }
});
export { require_compile_2 };
