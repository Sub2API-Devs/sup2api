/**
 * ajv/dist/compile/validate/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_boolSchema } from "./boolSchema.js";
import { require_dataType_2 } from "./dataType.js";
import { require_applicability } from "./applicability.js";
import { require_defaults } from "./defaults.js";
import { require_keyword } from "./keyword.js";
import { require_subschema } from "./subschema.js";
import { require_codegen_2 } from "../codegen/index.js";
import { require_names } from "../names.js";
import { require_resolve_2 } from "../resolve.js";
import { require_util_2 } from "../util.js";
import { require_errors } from "../errors.js";

//@ chunk-s82q9s4x.js:41944-51973 cjs-fingerprint
var require_validate_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getData = cjsExports.KeywordCxt = cjsExports.validateFunctionCode = undefined;
  var boolSchema_1 = require_boolSchema();
  var dataType_1 = require_dataType_2();
  var applicability_1 = require_applicability();
  var dataType_2 = require_dataType_2();
  var defaults_1 = require_defaults();
  var keyword_1 = require_keyword();
  var subschema_1 = require_subschema();
  var codegen_1 = require_codegen_2();
  var names_1 = require_names();
  var resolve_1 = require_resolve_2();
  var util_1 = require_util_2();
  var errors_1 = require_errors();
  function validateFunctionCode(it) {
    if (isSchemaObj(it)) {
      checkKeywords(it);
      if (schemaCxtHasRules(it)) {
        topSchemaObjCode(it);
        return;
      }
    }
    validateFunction(it, () => boolSchema_1.topBoolOrEmptySchema(it));
  }
  cjsExports.validateFunctionCode = validateFunctionCode;
  function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
    if (opts.code.es5)
      gen.func(
        validateName,
        codegen_1._`${names_1.default.data}, ${names_1.default.valCxt}`,
        schemaEnv.$async,
        () => {
          gen.code(codegen_1._`"use strict"; ${funcSourceUrl(schema, opts)}`);
          destructureValCxtES5(gen, opts);
          gen.code(body);
        },
      );
    else
      gen.func(
        validateName,
        codegen_1._`${names_1.default.data}, ${destructureValCxt(opts)}`,
        schemaEnv.$async,
        () => gen.code(funcSourceUrl(schema, opts)).code(body),
      );
  }
  function destructureValCxt(opts) {
    return codegen_1._`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? codegen_1._`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
  }
  function destructureValCxtES5(gen, opts) {
    gen.if(
      names_1.default.valCxt,
      () => {
        gen.var(
          names_1.default.instancePath,
          codegen_1._`${names_1.default.valCxt}.${names_1.default.instancePath}`,
        );
        gen.var(
          names_1.default.parentData,
          codegen_1._`${names_1.default.valCxt}.${names_1.default.parentData}`,
        );
        gen.var(
          names_1.default.parentDataProperty,
          codegen_1._`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`,
        );
        gen.var(names_1.default.rootData, codegen_1._`${names_1.default.valCxt}.${names_1.default.rootData}`);
        if (opts.dynamicRef)
          gen.var(
            names_1.default.dynamicAnchors,
            codegen_1._`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`,
          );
      },
      () => {
        gen.var(names_1.default.instancePath, codegen_1._`""`);
        gen.var(names_1.default.parentData, codegen_1._`undefined`);
        gen.var(names_1.default.parentDataProperty, codegen_1._`undefined`);
        gen.var(names_1.default.rootData, names_1.default.data);
        if (opts.dynamicRef) gen.var(names_1.default.dynamicAnchors, codegen_1._`{}`);
      },
    );
  }
  function topSchemaObjCode(it) {
    let { schema, opts, gen } = it;
    validateFunction(it, () => {
      if (opts.$comment && schema.$comment) commentKeyword(it);
      checkNoDefault(it);
      gen.let(names_1.default.vErrors, null);
      gen.let(names_1.default.errors, 0);
      if (opts.unevaluated) resetEvaluated(it);
      typeAndKeywords(it);
      returnResults(it);
    });
    return;
  }
  function resetEvaluated(it) {
    let { gen, validateName } = it;
    it.evaluated = gen.const("evaluated", codegen_1._`${validateName}.evaluated`);
    gen.if(codegen_1._`${it.evaluated}.dynamicProps`, () =>
      gen.assign(codegen_1._`${it.evaluated}.props`, codegen_1._`undefined`),
    );
    gen.if(codegen_1._`${it.evaluated}.dynamicItems`, () =>
      gen.assign(codegen_1._`${it.evaluated}.items`, codegen_1._`undefined`),
    );
  }
  function funcSourceUrl(schema, opts) {
    let schId = typeof schema == "object" && schema[opts.schemaId];
    return schId && (opts.code.source || opts.code.process)
      ? codegen_1._`/*# sourceURL=${schId} */`
      : codegen_1.nil;
  }
  function subschemaCode(it, valid) {
    if (isSchemaObj(it)) {
      checkKeywords(it);
      if (schemaCxtHasRules(it)) {
        subSchemaObjCode(it, valid);
        return;
      }
    }
    boolSchema_1.boolOrEmptySchema(it, valid);
  }
  function schemaCxtHasRules({ schema, self: ajvInstance }) {
    if (typeof schema == "boolean") return !schema;
    for (let key in schema) if (ajvInstance.RULES.all[key]) return true;
    return false;
  }
  function isSchemaObj(it) {
    return typeof it.schema != "boolean";
  }
  function subSchemaObjCode(it, valid) {
    let { schema, gen, opts } = it;
    if (opts.$comment && schema.$comment) commentKeyword(it);
    updateContext(it);
    checkAsyncSchema(it);
    let errsCount = gen.const("_errs", names_1.default.errors);
    typeAndKeywords(it, errsCount);
    gen.var(valid, codegen_1._`${errsCount} === ${names_1.default.errors}`);
  }
  function checkKeywords(it) {
    util_1.checkUnknownRules(it);
    checkRefsAndKeywords(it);
  }
  function typeAndKeywords(it, errsCount) {
    if (it.opts.jtd) return schemaKeywords(it, [], false, errsCount);
    let types = dataType_1.getSchemaTypes(it.schema);
    let checkedTypes = dataType_1.coerceAndCheckDataType(it, types);
    schemaKeywords(it, types, !checkedTypes, errsCount);
  }
  function checkRefsAndKeywords(it) {
    let { schema, errSchemaPath, opts, self: ajvInstance } = it;
    if (schema.$ref && opts.ignoreKeywordsWithRef && util_1.schemaHasRulesButRef(schema, ajvInstance.RULES))
      ajvInstance.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
  }
  function checkNoDefault(it) {
    let { schema, opts } = it;
    if (schema.default !== undefined && opts.useDefaults && opts.strictSchema)
      util_1.checkStrictMode(it, "default is ignored in the schema root");
  }
  function updateContext(it) {
    let schId = it.schema[it.opts.schemaId];
    if (schId) it.baseId = resolve_1.resolveUrl(it.opts.uriResolver, it.baseId, schId);
  }
  function checkAsyncSchema(it) {
    if (it.schema.$async && !it.schemaEnv.$async) throw Error("async schema in sync schema");
  }
  function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
    let msg = schema.$comment;
    if (opts.$comment === true) gen.code(codegen_1._`${names_1.default.self}.logger.log(${msg})`);
    else if (typeof opts.$comment == "function") {
      let schemaPath = codegen_1.str`${errSchemaPath}/$comment`;
      let rootName = gen.scopeValue("root", {
        ref: schemaEnv.root,
      });
      gen.code(codegen_1._`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
    }
  }
  function returnResults(it) {
    let { gen, schemaEnv, validateName, ValidationError, opts } = it;
    if (schemaEnv.$async)
      gen.if(
        codegen_1._`${names_1.default.errors} === 0`,
        () => gen.return(names_1.default.data),
        () => gen.throw(codegen_1._`new ${ValidationError}(${names_1.default.vErrors})`),
      );
    else {
      gen.assign(codegen_1._`${validateName}.errors`, names_1.default.vErrors);
      if (opts.unevaluated) assignEvaluated(it);
      gen.return(codegen_1._`${names_1.default.errors} === 0`);
    }
  }
  function assignEvaluated({ gen, evaluated, props, items }) {
    if (props instanceof codegen_1.Name) gen.assign(codegen_1._`${evaluated}.props`, props);
    if (items instanceof codegen_1.Name) gen.assign(codegen_1._`${evaluated}.items`, items);
  }
  function schemaKeywords(it, types, typeErrors, errsCount) {
    let { gen, schema, data, allErrors, opts, self: ajvInstance } = it;
    let { RULES } = ajvInstance;
    if (schema.$ref && (opts.ignoreKeywordsWithRef || !util_1.schemaHasRulesButRef(schema, RULES))) {
      gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
      return;
    }
    if (!opts.jtd) checkStrictTypes(it, types);
    gen.block(() => {
      for (let group of RULES.rules) groupKeywords(group);
      groupKeywords(RULES.post);
    });
    function groupKeywords(group) {
      if (!applicability_1.shouldUseGroup(schema, group)) return;
      if (group.type) {
        gen.if(dataType_2.checkDataType(group.type, data, opts.strictNumbers));
        iterateKeywords(it, group);
        if (types.length === 1 && types[0] === group.type && typeErrors) {
          gen.else();
          dataType_2.reportTypeError(it);
        }
        gen.endIf();
      } else iterateKeywords(it, group);
      if (!allErrors) gen.if(codegen_1._`${names_1.default.errors} === ${errsCount || 0}`);
    }
  }
  function iterateKeywords(it, group) {
    let {
      gen,
      schema,
      opts: { useDefaults },
    } = it;
    if (useDefaults) defaults_1.assignDefaults(it, group.type);
    gen.block(() => {
      for (let rule of group.rules)
        if (applicability_1.shouldUseRule(schema, rule))
          keywordCode(it, rule.keyword, rule.definition, group.type);
    });
  }
  function checkStrictTypes(it, types) {
    if (it.schemaEnv.meta || !it.opts.strictTypes) return;
    checkContextTypes(it, types);
    if (!it.opts.allowUnionTypes) checkMultipleTypes(it, types);
    checkKeywordTypes(it, it.dataTypes);
  }
  function checkContextTypes(it, types) {
    if (!types.length) return;
    if (!it.dataTypes.length) {
      it.dataTypes = types;
      return;
    }
    types.forEach((t) => {
      if (!includesType(it.dataTypes, t))
        strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
    });
    narrowSchemaTypes(it, types);
  }
  function checkMultipleTypes(it, ts) {
    if (ts.length > 1 && !(ts.length === 2 && ts.includes("null")))
      strictTypesError(it, "use allowUnionTypes to allow union type keyword");
  }
  function checkKeywordTypes(it, ts) {
    let rules = it.self.RULES.all;
    for (let keyword in rules) {
      let rule = rules[keyword];
      if (typeof rule == "object" && applicability_1.shouldUseRule(it.schema, rule)) {
        let { type } = rule.definition;
        if (type.length && !type.some((t) => hasApplicableType(ts, t)))
          strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
      }
    }
  }
  function hasApplicableType(schTs, kwdT) {
    return schTs.includes(kwdT) || (kwdT === "number" && schTs.includes("integer"));
  }
  function includesType(ts, kwd) {
    return ts.includes(kwd) || (kwd === "integer" && ts.includes("number"));
  }
  function narrowSchemaTypes(it, withTypes) {
    let ts = [];
    for (let t of it.dataTypes)
      if (includesType(withTypes, t)) ts.push(t);
      else if (withTypes.includes("integer") && t === "number") ts.push("integer");
    it.dataTypes = ts;
  }
  function strictTypesError(it, msg) {
    let schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
    msg += ` at "${schemaPath}" (strictTypes)`;
    util_1.checkStrictMode(it, msg, it.opts.strictTypes);
  }
  class KeywordCxt {
    constructor(it, def, keyword) {
      keyword_1.validateKeywordUsage(it, def, keyword);
      this.gen = it.gen;
      this.allErrors = it.allErrors;
      this.keyword = keyword;
      this.data = it.data;
      this.schema = it.schema[keyword];
      this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
      this.schemaValue = util_1.schemaRefOrVal(it, this.schema, keyword, this.$data);
      this.schemaType = def.schemaType;
      this.parentSchema = it.schema;
      this.params = {};
      this.it = it;
      this.def = def;
      if (this.$data) this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
      else {
        this.schemaCode = this.schemaValue;
        if (!keyword_1.validSchemaType(this.schema, def.schemaType, def.allowUndefined))
          throw Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
      }
      if ("code" in def ? def.trackErrors : def.errors !== false)
        this.errsCount = it.gen.const("_errs", names_1.default.errors);
    }
    result(condition, successAction, failAction) {
      this.failResult(codegen_1.not(condition), successAction, failAction);
    }
    failResult(condition, successAction, failAction) {
      this.gen.if(condition);
      if (failAction) failAction();
      else this.error();
      if (successAction) {
        this.gen.else();
        successAction();
        if (this.allErrors) this.gen.endIf();
      } else if (this.allErrors) this.gen.endIf();
      else this.gen.else();
    }
    pass(condition, failAction) {
      this.failResult(codegen_1.not(condition), undefined, failAction);
    }
    fail(condition) {
      if (condition === undefined) {
        this.error();
        if (!this.allErrors) this.gen.if(false);
        return;
      }
      this.gen.if(condition);
      this.error();
      if (this.allErrors) this.gen.endIf();
      else this.gen.else();
    }
    fail$data(condition) {
      if (!this.$data) return this.fail(condition);
      let { schemaCode } = this;
      this.fail(
        codegen_1._`${schemaCode} !== undefined && (${codegen_1.or(this.invalid$data(), condition)})`,
      );
    }
    error(append, errorParams, errorPaths) {
      if (errorParams) {
        this.setParams(errorParams);
        this._error(append, errorPaths);
        this.setParams({});
        return;
      }
      this._error(append, errorPaths);
    }
    _error(append, errorPaths) {
      (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
    }
    $dataError() {
      errors_1.reportError(this, this.def.$dataError || errors_1.keyword$DataError);
    }
    reset() {
      if (this.errsCount === undefined) throw Error('add "trackErrors" to keyword definition');
      errors_1.resetErrorsCount(this.gen, this.errsCount);
    }
    ok(cond) {
      if (!this.allErrors) this.gen.if(cond);
    }
    setParams(obj, assign) {
      if (assign) Object.assign(this.params, obj);
      else this.params = obj;
    }
    block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
      this.gen.block(() => {
        this.check$data(valid, $dataValid);
        codeBlock();
      });
    }
    check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
      if (!this.$data) return;
      let { gen, schemaCode, schemaType, def } = this;
      gen.if(codegen_1.or(codegen_1._`${schemaCode} === undefined`, $dataValid));
      if (valid !== codegen_1.nil) gen.assign(valid, true);
      if (schemaType.length || def.validateSchema) {
        gen.elseIf(this.invalid$data());
        this.$dataError();
        if (valid !== codegen_1.nil) gen.assign(valid, false);
      }
      gen.else();
    }
    invalid$data() {
      let { gen, schemaCode, schemaType, def, it } = this;
      return codegen_1.or(wrong$DataType(), invalid$DataSchema());
      function wrong$DataType() {
        if (schemaType.length) {
          if (!(schemaCode instanceof codegen_1.Name)) throw Error("ajv implementation error");
          let st = Array.isArray(schemaType) ? schemaType : [schemaType];
          return codegen_1._`${dataType_2.checkDataTypes(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
        }
        return codegen_1.nil;
      }
      function invalid$DataSchema() {
        if (def.validateSchema) {
          let validateSchemaRef = gen.scopeValue("validate$data", {
            ref: def.validateSchema,
          });
          return codegen_1._`!${validateSchemaRef}(${schemaCode})`;
        }
        return codegen_1.nil;
      }
    }
    subschema(appl, valid) {
      let subschema = subschema_1.getSubschema(this.it, appl);
      subschema_1.extendSubschemaData(subschema, this.it, appl);
      subschema_1.extendSubschemaMode(subschema, appl);
      let nextContext = {
        ...this.it,
        ...subschema,
        items: undefined,
        props: undefined,
      };
      subschemaCode(nextContext, valid);
      return nextContext;
    }
    mergeEvaluated(schemaCxt, toName) {
      let { it, gen } = this;
      if (!it.opts.unevaluated) return;
      if (it.props !== true && schemaCxt.props !== undefined)
        it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
      if (it.items !== true && schemaCxt.items !== undefined)
        it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
    }
    mergeValidEvaluated(schemaCxt, valid) {
      let { it, gen } = this;
      if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
        gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
        return true;
      }
    }
  }
  cjsExports.KeywordCxt = KeywordCxt;
  function keywordCode(it, keyword, def, ruleType) {
    let cxt = new KeywordCxt(it, def, keyword);
    if ("code" in def) def.code(cxt, ruleType);
    else if (cxt.$data && def.validate) keyword_1.funcKeywordCode(cxt, def);
    else if ("macro" in def) keyword_1.macroKeywordCode(cxt, def);
    else if (def.compile || def.validate) keyword_1.funcKeywordCode(cxt, def);
  }
  var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
  var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  function getData($data, { dataLevel, dataNames, dataPathArr }) {
    let jsonPointer;
    let data;
    if ($data === "") return names_1.default.rootData;
    if ($data[0] === "/") {
      if (!JSON_POINTER.test($data)) throw Error(`Invalid JSON-pointer: ${$data}`);
      jsonPointer = $data;
      data = names_1.default.rootData;
    } else {
      let matches = RELATIVE_JSON_POINTER.exec($data);
      if (!matches) throw Error(`Invalid JSON-pointer: ${$data}`);
      let up = +matches[1];
      jsonPointer = matches[2];
      if (jsonPointer === "#") {
        if (up >= dataLevel) throw Error(errorMsg("property/index", up));
        return dataPathArr[dataLevel - up];
      }
      if (up > dataLevel) throw Error(errorMsg("data", up));
      data = dataNames[dataLevel - up];
      if (!jsonPointer) return data;
    }
    let expr = data;
    let segments = jsonPointer.split("/");
    for (let segment of segments)
      if (segment) {
        data = codegen_1._`${data}${codegen_1.getProperty(util_1.unescapeJsonPointer(segment))}`;
        expr = codegen_1._`${expr} && ${data}`;
      }
    return expr;
    function errorMsg(pointerType, up) {
      return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
    }
  }
  cjsExports.getData = getData;
});
export { require_validate_2 };
