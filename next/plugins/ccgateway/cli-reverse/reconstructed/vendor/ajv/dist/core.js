/**
 * ajv/dist/core.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-qq5knpkd.js (1), chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_validate_2 } from "./compile/validate/index.js";
import { require_codegen_2 } from "./compile/codegen/index.js";
import { require_validation_error_2 } from "./runtime/validation_error.js";
import { require_ref_error_2 } from "./compile/ref_error.js";
import { require_rules_2 } from "./compile/rules.js";
import { require_compile_2 } from "./compile/index.js";
import { require_resolve_2 } from "./compile/resolve.js";
import { require_dataType_2 } from "./compile/validate/dataType.js";
import { require_util_2 } from "./compile/util.js";
import { require_data_2 } from "./refs/data.json.js";
import { require_uri_2 } from "./runtime/uri.js";
import { initModule } from "../../@modelcontextprotocol/core/(bundler runtime of a pre-bundled dist file).js";

//@ chunk-xcs4sv9h.js:68784-81111 cjs-fingerprint
var require_core_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CodeGen =
    cjsExports.Name =
    cjsExports.nil =
    cjsExports.stringify =
    cjsExports.str =
    cjsExports._ =
    cjsExports.KeywordCxt =
      undefined;
  var validate_1 = require_validate_2();
  Object.defineProperty(cjsExports, "KeywordCxt", {
    enumerable: true,
    get: function () {
      return validate_1.KeywordCxt;
    },
  });
  var codegen_1 = require_codegen_2();
  Object.defineProperty(cjsExports, "_", {
    enumerable: true,
    get: function () {
      return codegen_1._;
    },
  });
  Object.defineProperty(cjsExports, "str", {
    enumerable: true,
    get: function () {
      return codegen_1.str;
    },
  });
  Object.defineProperty(cjsExports, "stringify", {
    enumerable: true,
    get: function () {
      return codegen_1.stringify;
    },
  });
  Object.defineProperty(cjsExports, "nil", {
    enumerable: true,
    get: function () {
      return codegen_1.nil;
    },
  });
  Object.defineProperty(cjsExports, "Name", {
    enumerable: true,
    get: function () {
      return codegen_1.Name;
    },
  });
  Object.defineProperty(cjsExports, "CodeGen", {
    enumerable: true,
    get: function () {
      return codegen_1.CodeGen;
    },
  });
  var validation_error_1 = require_validation_error_2();
  var ref_error_1 = require_ref_error_2();
  var rules_1 = require_rules_2();
  var compile_1 = require_compile_2();
  var codegen_2 = require_codegen_2();
  var resolve_1 = require_resolve_2();
  var dataType_1 = require_dataType_2();
  var util_1 = require_util_2();
  var $dataRefSchema = require_data_2();
  var uri_1 = require_uri_2();
  var defaultRegExp = (str, flags) => new RegExp(str, flags);
  defaultRegExp.code = "new RegExp";
  var META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
  var EXT_SCOPE_NAMES = new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error",
  ]);
  var removedOptions = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now.",
  };
  var deprecatedOptions = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.',
  };
  var MAX_EXPRESSION = 200;
  function requiredOptions(o_2) {
    var _a;
    var _b;
    var _c;
    var _d;
    var _e;
    var _f;
    var _g;
    var _h;
    var _j;
    var _k;
    var _l;
    var _m;
    var _o;
    var _p;
    var _q;
    var _r;
    var _s;
    var _t;
    var _u;
    var _v;
    var _w;
    var _x;
    var _y;
    var _z;
    var _0;
    let s = o_2.strict;
    let _optz = (_a = o_2.code) === null || _a === undefined ? undefined : _a.optimize;
    let optimize = _optz === true || _optz === undefined ? 1 : _optz || 0;
    let regExp =
      (_c = (_b = o_2.code) === null || _b === undefined ? undefined : _b.regExp) !== null && _c !== undefined
        ? _c
        : defaultRegExp;
    let uriResolver = (_d = o_2.uriResolver) !== null && _d !== undefined ? _d : uri_1.default;
    return {
      strictSchema:
        (_f = (_e = o_2.strictSchema) !== null && _e !== undefined ? _e : s) !== null && _f !== undefined
          ? _f
          : true,
      strictNumbers:
        (_h = (_g = o_2.strictNumbers) !== null && _g !== undefined ? _g : s) !== null && _h !== undefined
          ? _h
          : true,
      strictTypes:
        (_k = (_j = o_2.strictTypes) !== null && _j !== undefined ? _j : s) !== null && _k !== undefined
          ? _k
          : "log",
      strictTuples:
        (_m = (_l = o_2.strictTuples) !== null && _l !== undefined ? _l : s) !== null && _m !== undefined
          ? _m
          : "log",
      strictRequired:
        (_p = (_o = o_2.strictRequired) !== null && _o !== undefined ? _o : s) !== null && _p !== undefined
          ? _p
          : false,
      code: o_2.code
        ? {
            ...o_2.code,
            optimize,
            regExp,
          }
        : {
            optimize,
            regExp,
          },
      loopRequired: (_q = o_2.loopRequired) !== null && _q !== undefined ? _q : MAX_EXPRESSION,
      loopEnum: (_r = o_2.loopEnum) !== null && _r !== undefined ? _r : MAX_EXPRESSION,
      meta: (_s = o_2.meta) !== null && _s !== undefined ? _s : true,
      messages: (_t = o_2.messages) !== null && _t !== undefined ? _t : true,
      inlineRefs: (_u = o_2.inlineRefs) !== null && _u !== undefined ? _u : true,
      schemaId: (_v = o_2.schemaId) !== null && _v !== undefined ? _v : "$id",
      addUsedSchema: (_w = o_2.addUsedSchema) !== null && _w !== undefined ? _w : true,
      validateSchema: (_x = o_2.validateSchema) !== null && _x !== undefined ? _x : true,
      validateFormats: (_y = o_2.validateFormats) !== null && _y !== undefined ? _y : true,
      unicodeRegExp: (_z = o_2.unicodeRegExp) !== null && _z !== undefined ? _z : true,
      int32range: (_0 = o_2.int32range) !== null && _0 !== undefined ? _0 : true,
      uriResolver,
    };
  }
  class Ajv {
    constructor(opts = {}) {
      this.schemas = {};
      this.refs = {};
      this.formats = {};
      this._compilations = new Set();
      this._loading = {};
      this._cache = new Map();
      opts = this.opts = {
        ...opts,
        ...requiredOptions(opts),
      };
      let { es5, lines } = this.opts.code;
      this.scope = new codegen_2.ValueScope({
        scope: {},
        prefixes: EXT_SCOPE_NAMES,
        es5,
        lines,
      });
      this.logger = getLogger(opts.logger);
      let formatOpt = opts.validateFormats;
      opts.validateFormats = false;
      this.RULES = rules_1.getRules();
      checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
      checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
      this._metaOpts = getMetaSchemaOptions.call(this);
      if (opts.formats) addInitialFormats.call(this);
      this._addVocabularies();
      this._addDefaultMetaSchema();
      if (opts.keywords) addInitialKeywords.call(this, opts.keywords);
      if (typeof opts.meta == "object") this.addMetaSchema(opts.meta);
      addInitialSchemas.call(this);
      opts.validateFormats = formatOpt;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      let { $data, meta, schemaId } = this.opts;
      let _dataRefSchema = $dataRefSchema;
      if (schemaId === "id") {
        _dataRefSchema = {
          ...$dataRefSchema,
        };
        _dataRefSchema.id = _dataRefSchema.$id;
        delete _dataRefSchema.$id;
      }
      if (meta && $data) this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
    }
    defaultMeta() {
      let { meta, schemaId } = this.opts;
      return (this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : undefined);
    }
    validate(schemaKeyRef, data) {
      let v;
      if (typeof schemaKeyRef == "string") {
        v = this.getSchema(schemaKeyRef);
        if (!v) throw Error(`no schema with key or ref "${schemaKeyRef}"`);
      } else v = this.compile(schemaKeyRef);
      let valid = v(data);
      if (!("$async" in v)) this.errors = v.errors;
      return valid;
    }
    compile(schema, _meta) {
      let sch = this._addSchema(schema, _meta);
      return sch.validate || this._compileSchemaEnv(sch);
    }
    compileAsync(schema, meta) {
      if (typeof this.opts.loadSchema != "function") throw Error("options.loadSchema should be a function");
      let { loadSchema } = this.opts;
      return runCompileAsync.call(this, schema, meta);
      async function runCompileAsync(_schema, _meta) {
        await loadMetaSchema.call(this, _schema.$schema);
        let sch = this._addSchema(_schema, _meta);
        return sch.validate || _compileAsync.call(this, sch);
      }
      async function loadMetaSchema($ref) {
        if ($ref && !this.getSchema($ref))
          await runCompileAsync.call(
            this,
            {
              $ref,
            },
            true,
          );
      }
      async function _compileAsync(sch) {
        try {
          return this._compileSchemaEnv(sch);
        } catch (e) {
          if (!(e instanceof ref_error_1.default)) throw e;
          checkLoaded.call(this, e);
          await loadMissingSchema.call(this, e.missingSchema);
          return _compileAsync.call(this, sch);
        }
      }
      function checkLoaded({ missingSchema: ref, missingRef }) {
        if (this.refs[ref]) throw Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
      }
      async function loadMissingSchema(ref) {
        let _schema = await _loadSchema.call(this, ref);
        if (!this.refs[ref]) await loadMetaSchema.call(this, _schema.$schema);
        if (!this.refs[ref]) this.addSchema(_schema, ref, meta);
      }
      async function _loadSchema(ref) {
        let p = this._loading[ref];
        if (p) return p;
        try {
          return await (this._loading[ref] = loadSchema(ref));
        } finally {
          delete this._loading[ref];
        }
      }
    }
    addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
      if (Array.isArray(schema)) {
        for (let sch of schema) this.addSchema(sch, undefined, _meta, _validateSchema);
        return this;
      }
      let id;
      if (typeof schema === "object") {
        let { schemaId } = this.opts;
        id = schema[schemaId];
        if (id !== undefined && typeof id != "string") throw Error(`schema ${schemaId} must be string`);
      }
      key = resolve_1.normalizeId(key || id);
      this._checkUnique(key);
      this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
      return this;
    }
    addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
      this.addSchema(schema, key, true, _validateSchema);
      return this;
    }
    validateSchema(schema, throwOrLogError) {
      if (typeof schema == "boolean") return true;
      let $schema;
      $schema = schema.$schema;
      if ($schema !== undefined && typeof $schema != "string") throw Error("$schema must be a string");
      $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
      if (!$schema) {
        this.logger.warn("meta-schema not available");
        this.errors = null;
        return true;
      }
      let valid = this.validate($schema, schema);
      if (!valid && throwOrLogError) {
        let message = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log") this.logger.error(message);
        else throw Error(message);
      }
      return valid;
    }
    getSchema(keyRef) {
      let sch;
      while (typeof (sch = getSchEnv.call(this, keyRef)) == "string") keyRef = sch;
      if (sch === undefined) {
        let { schemaId } = this.opts;
        let root = new compile_1.SchemaEnv({
          schema: {},
          schemaId,
        });
        sch = compile_1.resolveSchema.call(this, root, keyRef);
        if (!sch) return;
        this.refs[keyRef] = sch;
      }
      return sch.validate || this._compileSchemaEnv(sch);
    }
    removeSchema(schemaKeyRef) {
      if (schemaKeyRef instanceof RegExp) {
        this._removeAllSchemas(this.schemas, schemaKeyRef);
        this._removeAllSchemas(this.refs, schemaKeyRef);
        return this;
      }
      switch (typeof schemaKeyRef) {
        case "undefined":
          this._removeAllSchemas(this.schemas);
          this._removeAllSchemas(this.refs);
          this._cache.clear();
          return this;
        case "string": {
          let sch = getSchEnv.call(this, schemaKeyRef);
          if (typeof sch == "object") this._cache.delete(sch.schema);
          delete this.schemas[schemaKeyRef];
          delete this.refs[schemaKeyRef];
          return this;
        }
        case "object": {
          let cacheKey = schemaKeyRef;
          this._cache.delete(cacheKey);
          let id = schemaKeyRef[this.opts.schemaId];
          if (id) {
            id = resolve_1.normalizeId(id);
            delete this.schemas[id];
            delete this.refs[id];
          }
          return this;
        }
        default:
          throw Error("ajv.removeSchema: invalid parameter");
      }
    }
    addVocabulary(definitions) {
      for (let def of definitions) this.addKeyword(def);
      return this;
    }
    addKeyword(kwdOrDef, def) {
      let keyword;
      if (typeof kwdOrDef == "string") {
        keyword = kwdOrDef;
        if (typeof def == "object") {
          this.logger.warn("these parameters are deprecated, see docs for addKeyword");
          def.keyword = keyword;
        }
      } else if (typeof kwdOrDef == "object" && def === undefined) {
        def = kwdOrDef;
        keyword = def.keyword;
        if (Array.isArray(keyword) && !keyword.length)
          throw Error("addKeywords: keyword must be string or non-empty array");
      } else throw Error("invalid addKeywords parameters");
      checkKeyword.call(this, keyword, def);
      if (!def) {
        util_1.eachItem(keyword, (kwd) => addRule.call(this, kwd));
        return this;
      }
      keywordMetaschema.call(this, def);
      let definition = {
        ...def,
        type: dataType_1.getJSONTypes(def.type),
        schemaType: dataType_1.getJSONTypes(def.schemaType),
      };
      util_1.eachItem(
        keyword,
        definition.type.length === 0
          ? (k) => addRule.call(this, k, definition)
          : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)),
      );
      return this;
    }
    getKeyword(keyword) {
      let rule = this.RULES.all[keyword];
      return typeof rule == "object" ? rule.definition : !!rule;
    }
    removeKeyword(keyword) {
      let { RULES } = this;
      delete RULES.keywords[keyword];
      delete RULES.all[keyword];
      for (let group of RULES.rules) {
        let i = group.rules.findIndex((rule) => rule.keyword === keyword);
        if (i >= 0) group.rules.splice(i, 1);
      }
      return this;
    }
    addFormat(name, format) {
      if (typeof format == "string") format = new RegExp(format);
      this.formats[name] = format;
      return this;
    }
    errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
      if (!errors || errors.length === 0) return "No errors";
      return errors
        .map((e) => `${dataVar}${e.instancePath} ${e.message}`)
        .reduce((text, msg) => text + separator + msg);
    }
    $dataMetaSchema(metaSchema, keywordsJsonPointers) {
      let rules = this.RULES.all;
      metaSchema = JSON.parse(JSON.stringify(metaSchema));
      for (let jsonPointer of keywordsJsonPointers) {
        let segments = jsonPointer.split("/").slice(1);
        let keywords = metaSchema;
        for (let seg of segments) keywords = keywords[seg];
        for (let key in rules) {
          let rule = rules[key];
          if (typeof rule != "object") continue;
          let { $data } = rule.definition;
          let schema = keywords[key];
          if ($data && schema) keywords[key] = schemaOrData(schema);
        }
      }
      return metaSchema;
    }
    _removeAllSchemas(schemas, regex) {
      for (let keyRef in schemas) {
        let sch = schemas[keyRef];
        if (!regex || regex.test(keyRef)) {
          if (typeof sch == "string") delete schemas[keyRef];
          else if (sch && !sch.meta) {
            this._cache.delete(sch.schema);
            delete schemas[keyRef];
          }
        }
      }
    }
    _addSchema(
      schema,
      meta,
      baseId,
      validateSchema = this.opts.validateSchema,
      addSchema = this.opts.addUsedSchema,
    ) {
      let id;
      let { schemaId } = this.opts;
      if (typeof schema == "object") id = schema[schemaId];
      else if (this.opts.jtd) throw Error("schema must be object");
      else if (typeof schema != "boolean") throw Error("schema must be object or boolean");
      let sch = this._cache.get(schema);
      if (sch !== undefined) return sch;
      baseId = resolve_1.normalizeId(id || baseId);
      let localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
      sch = new compile_1.SchemaEnv({
        schema,
        schemaId,
        meta,
        baseId,
        localRefs,
      });
      this._cache.set(sch.schema, sch);
      if (addSchema && !baseId.startsWith("#")) {
        if (baseId) this._checkUnique(baseId);
        this.refs[baseId] = sch;
      }
      if (validateSchema) this.validateSchema(schema, true);
      return sch;
    }
    _checkUnique(id) {
      if (this.schemas[id] || this.refs[id]) throw Error(`schema with key or id "${id}" already exists`);
    }
    _compileSchemaEnv(sch) {
      if (sch.meta) this._compileMetaSchema(sch);
      else compile_1.compileSchema.call(this, sch);
      if (!sch.validate) throw Error("ajv implementation error");
      return sch.validate;
    }
    _compileMetaSchema(sch) {
      let currentOpts = this.opts;
      this.opts = this._metaOpts;
      try {
        compile_1.compileSchema.call(this, sch);
      } finally {
        this.opts = currentOpts;
      }
    }
  }
  Ajv.ValidationError = validation_error_1.default;
  Ajv.MissingRefError = ref_error_1.default;
  cjsExports.default = Ajv;
  function checkOptions(checkOpts, options, msg, log = "error") {
    for (let key in checkOpts) {
      let opt = key;
      if (opt in options) this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
    }
  }
  function getSchEnv(keyRef) {
    keyRef = resolve_1.normalizeId(keyRef);
    return this.schemas[keyRef] || this.refs[keyRef];
  }
  function addInitialSchemas() {
    let optsSchemas = this.opts.schemas;
    if (!optsSchemas) return;
    if (Array.isArray(optsSchemas)) this.addSchema(optsSchemas);
    else for (let key in optsSchemas) this.addSchema(optsSchemas[key], key);
  }
  function addInitialFormats() {
    for (let name in this.opts.formats) {
      let format = this.opts.formats[name];
      if (format) this.addFormat(name, format);
    }
  }
  function addInitialKeywords(defs) {
    if (Array.isArray(defs)) {
      this.addVocabulary(defs);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (let keyword in defs) {
      let def = defs[keyword];
      if (!def.keyword) def.keyword = keyword;
      this.addKeyword(def);
    }
  }
  function getMetaSchemaOptions() {
    let metaOpts = {
      ...this.opts,
    };
    for (let opt of META_IGNORE_OPTIONS) delete metaOpts[opt];
    return metaOpts;
  }
  var noLogs = {
    log() {},
    warn() {},
    error() {},
  };
  function getLogger(logger) {
    if (logger === false) return noLogs;
    if (logger === undefined) return console;
    if (logger.log && logger.warn && logger.error) return logger;
    throw Error("logger must implement log, warn and error methods");
  }
  var KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
  function checkKeyword(keyword, def) {
    let { RULES } = this;
    util_1.eachItem(keyword, (kwd) => {
      if (RULES.keywords[kwd]) throw Error(`Keyword ${kwd} is already defined`);
      if (!KEYWORD_NAME.test(kwd)) throw Error(`Keyword ${kwd} has invalid name`);
    });
    if (!def) return;
    if (def.$data && !("code" in def || "validate" in def))
      throw Error('$data keyword must have "code" or "validate" function');
  }
  function addRule(keyword, definition, dataType) {
    var _a;
    let post = definition === null || definition === undefined ? undefined : definition.post;
    if (dataType && post) throw Error('keyword with "post" flag cannot have "type"');
    let { RULES } = this;
    let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
    if (!ruleGroup) {
      ruleGroup = {
        type: dataType,
        rules: [],
      };
      RULES.rules.push(ruleGroup);
    }
    RULES.keywords[keyword] = true;
    if (!definition) return;
    let rule = {
      keyword,
      definition: {
        ...definition,
        type: dataType_1.getJSONTypes(definition.type),
        schemaType: dataType_1.getJSONTypes(definition.schemaType),
      },
    };
    if (definition.before) addBeforeRule.call(this, ruleGroup, rule, definition.before);
    else ruleGroup.rules.push(rule);
    RULES.all[keyword] = rule;
    if (!((_a = definition.implements) === null || _a === undefined))
      _a.forEach((kwd) => this.addKeyword(kwd));
  }
  function addBeforeRule(ruleGroup, rule, before) {
    let i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
    if (i >= 0) ruleGroup.rules.splice(i, 0, rule);
    else {
      ruleGroup.rules.push(rule);
      this.logger.warn(`rule ${before} is not defined`);
    }
  }
  function keywordMetaschema(def) {
    let { metaSchema } = def;
    if (metaSchema === undefined) return;
    if (def.$data && this.opts.$data) metaSchema = schemaOrData(metaSchema);
    def.validateSchema = this.compile(metaSchema, true);
  }
  var $dataRef = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
  };
  function schemaOrData(schema) {
    return {
      anyOf: [schema, $dataRef],
    };
  }
});
//@ chunk-qq5knpkd.js:122688-202245 cjs-fingerprint
var require_code = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.regexpCode =
    cjsExports.getEsmExportName =
    cjsExports.getProperty =
    cjsExports.safeStringify =
    cjsExports.stringify =
    cjsExports.strConcat =
    cjsExports.addCodeArg =
    cjsExports.str =
    cjsExports._ =
    cjsExports.nil =
    cjsExports._Code =
    cjsExports.Name =
    cjsExports.IDENTIFIER =
    cjsExports._CodeOrName =
      undefined;
  var _CodeOrName = class {};
  cjsExports._CodeOrName = _CodeOrName;
  cjsExports.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
  var Name = class extends _CodeOrName {
    constructor(s) {
      super();
      if (!cjsExports.IDENTIFIER.test(s)) throw Error("CodeGen: name must be a valid identifier");
      this.str = s;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      return false;
    }
    get names() {
      return {
        [this.str]: 1,
      };
    }
  };
  cjsExports.Name = Name;
  var _Code = class extends _CodeOrName {
    constructor(code) {
      super();
      this._items = typeof code === "string" ? [code] : code;
    }
    toString() {
      return this.str;
    }
    emptyStr() {
      if (this._items.length > 1) return false;
      let item = this._items[0];
      return item === "" || item === '""';
    }
    get str() {
      var _a;
      return (_a = this._str) !== null && _a !== undefined
        ? _a
        : (this._str = this._items.reduce((s, c) => `${s}${c}`, ""));
    }
    get names() {
      var _a;
      return (_a = this._names) !== null && _a !== undefined
        ? _a
        : (this._names = this._items.reduce((names, c) => {
            if (c instanceof Name) names[c.str] = (names[c.str] || 0) + 1;
            return names;
          }, {}));
    }
  };
  cjsExports._Code = _Code;
  cjsExports.nil = new _Code("");
  function __2(strs, ...args) {
    let code = [strs[0]];
    let i = 0;
    while (i < args.length) {
      addCodeArg(code, args[i]);
      code.push(strs[++i]);
    }
    return new _Code(code);
  }
  cjsExports._ = __2;
  let plus = new _Code("+");
  function str(strs, ...args) {
    let expr = [safeStringify(strs[0])];
    let i = 0;
    while (i < args.length) {
      expr.push(plus);
      addCodeArg(expr, args[i]);
      expr.push(plus, safeStringify(strs[++i]));
    }
    optimize(expr);
    return new _Code(expr);
  }
  cjsExports.str = str;
  function addCodeArg(code, arg) {
    if (arg instanceof _Code) code.push(...arg._items);
    else if (arg instanceof Name) code.push(arg);
    else code.push(interpolate(arg));
  }
  cjsExports.addCodeArg = addCodeArg;
  function optimize(expr) {
    let i = 1;
    while (i < expr.length - 1) {
      if (expr[i] === plus) {
        let res = mergeExprItems(expr[i - 1], expr[i + 1]);
        if (res !== undefined) {
          expr.splice(i - 1, 3, res);
          continue;
        }
        expr[i++] = "+";
      }
      i++;
    }
  }
  function mergeExprItems(a, b) {
    if (b === '""') return a;
    if (a === '""') return b;
    if (typeof a == "string") {
      if (b instanceof Name || a[a.length - 1] !== '"') return;
      if (typeof b != "string") return `${a.slice(0, -1)}${b}"`;
      if (b[0] === '"') return a.slice(0, -1) + b.slice(1);
      return;
    }
    if (typeof b == "string" && b[0] === '"' && !(a instanceof Name)) return `"${a}${b.slice(1)}`;
  }
  function strConcat(c1, c2) {
    return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
  }
  cjsExports.strConcat = strConcat;
  function interpolate(x) {
    return typeof x == "number" || typeof x == "boolean" || x === null
      ? x
      : safeStringify(Array.isArray(x) ? x.join(",") : x);
  }
  function stringify(x) {
    return new _Code(safeStringify(x));
  }
  cjsExports.stringify = stringify;
  function safeStringify(x) {
    return JSON.stringify(x)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
  }
  cjsExports.safeStringify = safeStringify;
  function getProperty(key) {
    return typeof key == "string" && cjsExports.IDENTIFIER.test(key) ? new _Code(`.${key}`) : __2`[${key}]`;
  }
  cjsExports.getProperty = getProperty;
  function getEsmExportName(key) {
    if (typeof key == "string" && cjsExports.IDENTIFIER.test(key)) return new _Code(`${key}`);
    throw Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
  }
  cjsExports.getEsmExportName = getEsmExportName;
  function regexpCode(rx) {
    return new _Code(rx.toString());
  }
  cjsExports.regexpCode = regexpCode;
});
var require_scope = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ValueScope =
    cjsExports.ValueScopeName =
    cjsExports.Scope =
    cjsExports.varKinds =
    cjsExports.UsedValueState =
      undefined;
  let code_1 = require_code();
  var ValueError = class extends Error {
    constructor(name) {
      super(`CodeGen: "code" for ${name} not defined`);
      this.value = name.value;
    }
  };
  var UsedValueState;
  (function (UsedValueState) {
    UsedValueState[(UsedValueState.Started = 0)] = "Started";
    UsedValueState[(UsedValueState.Completed = 1)] = "Completed";
  })(UsedValueState || (cjsExports.UsedValueState = UsedValueState = {}));
  cjsExports.varKinds = {
    const: new code_1.Name("const"),
    let: new code_1.Name("let"),
    var: new code_1.Name("var"),
  };
  var Scope = class {
    constructor({ prefixes, parent } = {}) {
      this._names = {};
      this._prefixes = prefixes;
      this._parent = parent;
    }
    toName(nameOrPrefix) {
      return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
    }
    name(prefix) {
      return new code_1.Name(this._newName(prefix));
    }
    _newName(prefix) {
      let ng = this._names[prefix] || this._nameGroup(prefix);
      return `${prefix}${ng.index++}`;
    }
    _nameGroup(prefix) {
      var _a;
      var _b;
      if (
        ((_b = (_a = this._parent) === null || _a === undefined ? undefined : _a._prefixes) === null ||
        _b === undefined
          ? undefined
          : _b.has(prefix)) ||
        (this._prefixes && !this._prefixes.has(prefix))
      )
        throw Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
      return (this._names[prefix] = {
        prefix,
        index: 0,
      });
    }
  };
  cjsExports.Scope = Scope;
  var ValueScopeName = class extends code_1.Name {
    constructor(prefix, nameStr) {
      super(nameStr);
      this.prefix = prefix;
    }
    setValue(value, { property, itemIndex }) {
      this.value = value;
      this.scopePath = code_1._`.${new code_1.Name(property)}[${itemIndex}]`;
    }
  };
  cjsExports.ValueScopeName = ValueScopeName;
  let line = code_1._`\n`;
  var ValueScope = class extends Scope {
    constructor(opts) {
      super(opts);
      this._values = {};
      this._scope = opts.scope;
      this.opts = {
        ...opts,
        _n: opts.lines ? line : code_1.nil,
      };
    }
    get() {
      return this._scope;
    }
    name(prefix) {
      return new ValueScopeName(prefix, this._newName(prefix));
    }
    value(nameOrPrefix, value) {
      var _a;
      if (value.ref === undefined) throw Error("CodeGen: ref must be passed in value");
      let name = this.toName(nameOrPrefix);
      let { prefix } = name;
      let valueKey = (_a = value.key) !== null && _a !== undefined ? _a : value.ref;
      let vs = this._values[prefix];
      if (vs) {
        let _name = vs.get(valueKey);
        if (_name) return _name;
      } else vs = this._values[prefix] = new Map();
      vs.set(valueKey, name);
      let s = this._scope[prefix] || (this._scope[prefix] = []);
      let itemIndex = s.length;
      s[itemIndex] = value.ref;
      name.setValue(value, {
        property: prefix,
        itemIndex,
      });
      return name;
    }
    getValue(prefix, keyOrRef) {
      let vs = this._values[prefix];
      if (!vs) return;
      return vs.get(keyOrRef);
    }
    scopeRefs(scopeName, values = this._values) {
      return this._reduceValues(values, (name) => {
        if (name.scopePath === undefined) throw Error(`CodeGen: name "${name}" has no value`);
        return code_1._`${scopeName}${name.scopePath}`;
      });
    }
    scopeCode(values = this._values, usedValues, getCode) {
      return this._reduceValues(
        values,
        (name) => {
          if (name.value === undefined) throw Error(`CodeGen: name "${name}" has no value`);
          return name.value.code;
        },
        usedValues,
        getCode,
      );
    }
    _reduceValues(values, valueCode, usedValues = {}, getCode) {
      let code = code_1.nil;
      for (let prefix in values) {
        let vs = values[prefix];
        if (!vs) continue;
        let nameSet = (usedValues[prefix] = usedValues[prefix] || new Map());
        vs.forEach((name) => {
          if (nameSet.has(name)) return;
          nameSet.set(name, UsedValueState.Started);
          let c = valueCode(name);
          if (c) {
            let def = this.opts.es5 ? cjsExports.varKinds.var : cjsExports.varKinds.const;
            code = code_1._`${code}${def} ${name} = ${c};${this.opts._n}`;
          } else if ((c = getCode === null || getCode === undefined ? undefined : getCode(name)))
            code = code_1._`${code}${c}${this.opts._n}`;
          else throw new ValueError(name);
          nameSet.set(name, UsedValueState.Completed);
        });
      }
      return code;
    }
  };
  cjsExports.ValueScope = ValueScope;
});
var require_codegen = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.or =
    cjsExports.and =
    cjsExports.not =
    cjsExports.CodeGen =
    cjsExports.operators =
    cjsExports.varKinds =
    cjsExports.ValueScopeName =
    cjsExports.ValueScope =
    cjsExports.Scope =
    cjsExports.Name =
    cjsExports.regexpCode =
    cjsExports.stringify =
    cjsExports.getProperty =
    cjsExports.nil =
    cjsExports.strConcat =
    cjsExports.str =
    cjsExports._ =
      undefined;
  let code_1 = require_code();
  let scope_1 = require_scope();
  var code_2 = require_code();
  Object.defineProperty(cjsExports, "_", {
    enumerable: true,
    get: function () {
      return code_2._;
    },
  });
  Object.defineProperty(cjsExports, "str", {
    enumerable: true,
    get: function () {
      return code_2.str;
    },
  });
  Object.defineProperty(cjsExports, "strConcat", {
    enumerable: true,
    get: function () {
      return code_2.strConcat;
    },
  });
  Object.defineProperty(cjsExports, "nil", {
    enumerable: true,
    get: function () {
      return code_2.nil;
    },
  });
  Object.defineProperty(cjsExports, "getProperty", {
    enumerable: true,
    get: function () {
      return code_2.getProperty;
    },
  });
  Object.defineProperty(cjsExports, "stringify", {
    enumerable: true,
    get: function () {
      return code_2.stringify;
    },
  });
  Object.defineProperty(cjsExports, "regexpCode", {
    enumerable: true,
    get: function () {
      return code_2.regexpCode;
    },
  });
  Object.defineProperty(cjsExports, "Name", {
    enumerable: true,
    get: function () {
      return code_2.Name;
    },
  });
  var scope_2 = require_scope();
  Object.defineProperty(cjsExports, "Scope", {
    enumerable: true,
    get: function () {
      return scope_2.Scope;
    },
  });
  Object.defineProperty(cjsExports, "ValueScope", {
    enumerable: true,
    get: function () {
      return scope_2.ValueScope;
    },
  });
  Object.defineProperty(cjsExports, "ValueScopeName", {
    enumerable: true,
    get: function () {
      return scope_2.ValueScopeName;
    },
  });
  Object.defineProperty(cjsExports, "varKinds", {
    enumerable: true,
    get: function () {
      return scope_2.varKinds;
    },
  });
  cjsExports.operators = {
    GT: new code_1._Code(">"),
    GTE: new code_1._Code(">="),
    LT: new code_1._Code("<"),
    LTE: new code_1._Code("<="),
    EQ: new code_1._Code("==="),
    NEQ: new code_1._Code("!=="),
    NOT: new code_1._Code("!"),
    OR: new code_1._Code("||"),
    AND: new code_1._Code("&&"),
    ADD: new code_1._Code("+"),
  };
  var Node = class {
    optimizeNodes() {
      return this;
    }
    optimizeNames(_names, _constants) {
      return this;
    }
  };
  var Def = class extends Node {
    constructor(varKind, name, rhs) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.rhs = rhs;
    }
    render({ es5, _n }) {
      let varKind = es5 ? scope_1.varKinds.var : this.varKind;
      let rhs = this.rhs === undefined ? "" : ` = ${this.rhs}`;
      return `${varKind} ${this.name}${rhs};` + _n;
    }
    optimizeNames(names, constants) {
      if (!names[this.name.str]) return;
      if (this.rhs) this.rhs = optimizeExpr(this.rhs, names, constants);
      return this;
    }
    get names() {
      return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
    }
  };
  var Assign = class extends Node {
    constructor(lhs, rhs, sideEffects) {
      super();
      this.lhs = lhs;
      this.rhs = rhs;
      this.sideEffects = sideEffects;
    }
    render({ _n }) {
      return `${this.lhs} = ${this.rhs};` + _n;
    }
    optimizeNames(names, constants) {
      if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects) return;
      this.rhs = optimizeExpr(this.rhs, names, constants);
      return this;
    }
    get names() {
      return addExprNames(
        this.lhs instanceof code_1.Name
          ? {}
          : {
              ...this.lhs.names,
            },
        this.rhs,
      );
    }
  };
  var AssignOp = class extends Assign {
    constructor(lhs, op, rhs, sideEffects) {
      super(lhs, rhs, sideEffects);
      this.op = op;
    }
    render({ _n }) {
      return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
    }
  };
  var Label = class extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      return `${this.label}:` + _n;
    }
  };
  var Break = class extends Node {
    constructor(label) {
      super();
      this.label = label;
      this.names = {};
    }
    render({ _n }) {
      return `break${this.label ? ` ${this.label}` : ""};` + _n;
    }
  };
  var Throw = class extends Node {
    constructor(error) {
      super();
      this.error = error;
    }
    render({ _n }) {
      return `throw ${this.error};` + _n;
    }
    get names() {
      return this.error.names;
    }
  };
  var AnyCode = class extends Node {
    constructor(code) {
      super();
      this.code = code;
    }
    render({ _n }) {
      return `${this.code};` + _n;
    }
    optimizeNodes() {
      return `${this.code}` ? this : undefined;
    }
    optimizeNames(names, constants) {
      this.code = optimizeExpr(this.code, names, constants);
      return this;
    }
    get names() {
      return this.code instanceof code_1._CodeOrName ? this.code.names : {};
    }
  };
  var ParentNode = class extends Node {
    constructor(nodes = []) {
      super();
      this.nodes = nodes;
    }
    render(opts) {
      return this.nodes.reduce((code, n) => code + n.render(opts), "");
    }
    optimizeNodes() {
      let { nodes } = this;
      let i = nodes.length;
      while (i--) {
        let n = nodes[i].optimizeNodes();
        if (Array.isArray(n)) nodes.splice(i, 1, ...n);
        else if (n) nodes[i] = n;
        else nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : undefined;
    }
    optimizeNames(names, constants) {
      let { nodes } = this;
      let i = nodes.length;
      while (i--) {
        let n = nodes[i];
        if (n.optimizeNames(names, constants)) continue;
        subtractNames(names, n.names);
        nodes.splice(i, 1);
      }
      return nodes.length > 0 ? this : undefined;
    }
    get names() {
      return this.nodes.reduce((names, n) => addNames(names, n.names), {});
    }
  };
  var BlockNode = class extends ParentNode {
    render(opts) {
      return "{" + opts._n + super.render(opts) + "}" + opts._n;
    }
  };
  var Root = class extends ParentNode {};
  var Else = class extends BlockNode {};
  Else.kind = "else";
  var If = class If extends BlockNode {
    constructor(condition, nodes) {
      super(nodes);
      this.condition = condition;
    }
    render(opts) {
      let code = `if(${this.condition})` + super.render(opts);
      if (this.else) code += "else " + this.else.render(opts);
      return code;
    }
    optimizeNodes() {
      super.optimizeNodes();
      let cond = this.condition;
      if (cond === true) return this.nodes;
      let e = this.else;
      if (e) {
        let ns = e.optimizeNodes();
        e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
      }
      if (e) {
        if (cond === false) return e instanceof If ? e : e.nodes;
        if (this.nodes.length) return this;
        return new If(not(cond), e instanceof If ? [e] : e.nodes);
      }
      if (cond === false || !this.nodes.length) return;
      return this;
    }
    optimizeNames(names, constants) {
      var _a;
      this.else =
        (_a = this.else) === null || _a === undefined ? undefined : _a.optimizeNames(names, constants);
      if (!(super.optimizeNames(names, constants) || this.else)) return;
      this.condition = optimizeExpr(this.condition, names, constants);
      return this;
    }
    get names() {
      let names = super.names;
      addExprNames(names, this.condition);
      if (this.else) addNames(names, this.else.names);
      return names;
    }
  };
  If.kind = "if";
  var For = class extends BlockNode {};
  For.kind = "for";
  var ForLoop = class extends For {
    constructor(iteration) {
      super();
      this.iteration = iteration;
    }
    render(opts) {
      return `for(${this.iteration})` + super.render(opts);
    }
    optimizeNames(names, constants) {
      if (!super.optimizeNames(names, constants)) return;
      this.iteration = optimizeExpr(this.iteration, names, constants);
      return this;
    }
    get names() {
      return addNames(super.names, this.iteration.names);
    }
  };
  var ForRange = class extends For {
    constructor(varKind, name, from, to) {
      super();
      this.varKind = varKind;
      this.name = name;
      this.from = from;
      this.to = to;
    }
    render(opts) {
      let varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
      let { name, from, to } = this;
      return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
    }
    get names() {
      return addExprNames(addExprNames(super.names, this.from), this.to);
    }
  };
  var ForIter = class extends For {
    constructor(loop, varKind, name, iterable) {
      super();
      this.loop = loop;
      this.varKind = varKind;
      this.name = name;
      this.iterable = iterable;
    }
    render(opts) {
      return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
    }
    optimizeNames(names, constants) {
      if (!super.optimizeNames(names, constants)) return;
      this.iterable = optimizeExpr(this.iterable, names, constants);
      return this;
    }
    get names() {
      return addNames(super.names, this.iterable.names);
    }
  };
  var Func = class extends BlockNode {
    constructor(name, args, async) {
      super();
      this.name = name;
      this.args = args;
      this.async = async;
    }
    render(opts) {
      return `${this.async ? "async " : ""}function ${this.name}(${this.args})` + super.render(opts);
    }
  };
  Func.kind = "func";
  var Return = class extends ParentNode {
    render(opts) {
      return "return " + super.render(opts);
    }
  };
  Return.kind = "return";
  var Try = class extends BlockNode {
    render(opts) {
      let code = "try" + super.render(opts);
      if (this.catch) code += this.catch.render(opts);
      if (this.finally) code += this.finally.render(opts);
      return code;
    }
    optimizeNodes() {
      var _a;
      var _b;
      super.optimizeNodes();
      if (!((_a = this.catch) === null || _a === undefined)) _a.optimizeNodes();
      if (!((_b = this.finally) === null || _b === undefined)) _b.optimizeNodes();
      return this;
    }
    optimizeNames(names, constants) {
      var _a;
      var _b;
      super.optimizeNames(names, constants);
      if (!((_a = this.catch) === null || _a === undefined)) _a.optimizeNames(names, constants);
      if (!((_b = this.finally) === null || _b === undefined)) _b.optimizeNames(names, constants);
      return this;
    }
    get names() {
      let names = super.names;
      if (this.catch) addNames(names, this.catch.names);
      if (this.finally) addNames(names, this.finally.names);
      return names;
    }
  };
  var Catch = class extends BlockNode {
    constructor(error) {
      super();
      this.error = error;
    }
    render(opts) {
      return `catch(${this.error})` + super.render(opts);
    }
  };
  Catch.kind = "catch";
  var Finally = class extends BlockNode {
    render(opts) {
      return "finally" + super.render(opts);
    }
  };
  Finally.kind = "finally";
  var CodeGen = class {
    constructor(extScope, opts = {}) {
      this._values = {};
      this._blockStarts = [];
      this._constants = {};
      this.opts = {
        ...opts,
        _n: opts.lines
          ? `
`
          : "",
      };
      this._extScope = extScope;
      this._scope = new scope_1.Scope({
        parent: extScope,
      });
      this._nodes = [new Root()];
    }
    toString() {
      return this._root.render(this.opts);
    }
    name(prefix) {
      return this._scope.name(prefix);
    }
    scopeName(prefix) {
      return this._extScope.name(prefix);
    }
    scopeValue(prefixOrName, value) {
      let name = this._extScope.value(prefixOrName, value);
      (this._values[name.prefix] || (this._values[name.prefix] = new Set())).add(name);
      return name;
    }
    getScopeValue(prefix, keyOrRef) {
      return this._extScope.getValue(prefix, keyOrRef);
    }
    scopeRefs(scopeName) {
      return this._extScope.scopeRefs(scopeName, this._values);
    }
    scopeCode() {
      return this._extScope.scopeCode(this._values);
    }
    _def(varKind, nameOrPrefix, rhs, constant) {
      let name = this._scope.toName(nameOrPrefix);
      if (rhs !== undefined && constant) this._constants[name.str] = rhs;
      this._leafNode(new Def(varKind, name, rhs));
      return name;
    }
    const(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
    }
    let(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
    }
    var(nameOrPrefix, rhs, _constant) {
      return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
    }
    assign(lhs, rhs, sideEffects) {
      return this._leafNode(new Assign(lhs, rhs, sideEffects));
    }
    add(lhs, rhs) {
      return this._leafNode(new AssignOp(lhs, cjsExports.operators.ADD, rhs));
    }
    code(c) {
      if (typeof c == "function") c();
      else if (c !== code_1.nil) this._leafNode(new AnyCode(c));
      return this;
    }
    object(...keyValues) {
      let code = ["{"];
      for (let [key, value] of keyValues) {
        if (code.length > 1) code.push(",");
        code.push(key);
        if (key !== value || this.opts.es5) {
          code.push(":");
          (0, code_1.addCodeArg)(code, value);
        }
      }
      code.push("}");
      return new code_1._Code(code);
    }
    if(condition, thenBody, elseBody) {
      this._blockNode(new If(condition));
      if (thenBody && elseBody) this.code(thenBody).else().code(elseBody).endIf();
      else if (thenBody) this.code(thenBody).endIf();
      else if (elseBody) throw Error('CodeGen: "else" body without "then" body');
      return this;
    }
    elseIf(condition) {
      return this._elseNode(new If(condition));
    }
    else() {
      return this._elseNode(new Else());
    }
    endIf() {
      return this._endBlockNode(If, Else);
    }
    _for(node, forBody) {
      this._blockNode(node);
      if (forBody) this.code(forBody).endFor();
      return this;
    }
    for(iteration, forBody) {
      return this._for(new ForLoop(iteration), forBody);
    }
    forRange(
      nameOrPrefix,
      from,
      to,
      forBody,
      varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let,
    ) {
      let name = this._scope.toName(nameOrPrefix);
      return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
    }
    forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
      let name = this._scope.toName(nameOrPrefix);
      if (this.opts.es5) {
        let arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
        return this.forRange("_i", 0, code_1._`${arr}.length`, (i) => {
          this.var(name, code_1._`${arr}[${i}]`);
          forBody(name);
        });
      }
      return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
    }
    forIn(
      nameOrPrefix,
      obj,
      forBody,
      varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const,
    ) {
      if (this.opts.ownProperties) return this.forOf(nameOrPrefix, code_1._`Object.keys(${obj})`, forBody);
      let name = this._scope.toName(nameOrPrefix);
      return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
    }
    endFor() {
      return this._endBlockNode(For);
    }
    label(label) {
      return this._leafNode(new Label(label));
    }
    break(label) {
      return this._leafNode(new Break(label));
    }
    return(value) {
      let node = new Return();
      this._blockNode(node);
      this.code(value);
      if (node.nodes.length !== 1) throw Error('CodeGen: "return" should have one node');
      return this._endBlockNode(Return);
    }
    try(tryBody, catchCode, finallyCode) {
      if (!catchCode && !finallyCode) throw Error('CodeGen: "try" without "catch" and "finally"');
      let node = new Try();
      this._blockNode(node);
      this.code(tryBody);
      if (catchCode) {
        let error = this.name("e");
        this._currNode = node.catch = new Catch(error);
        catchCode(error);
      }
      if (finallyCode) {
        this._currNode = node.finally = new Finally();
        this.code(finallyCode);
      }
      return this._endBlockNode(Catch, Finally);
    }
    throw(error) {
      return this._leafNode(new Throw(error));
    }
    block(body, nodeCount) {
      this._blockStarts.push(this._nodes.length);
      if (body) this.code(body).endBlock(nodeCount);
      return this;
    }
    endBlock(nodeCount) {
      let len = this._blockStarts.pop();
      if (len === undefined) throw Error("CodeGen: not in self-balancing block");
      let toClose = this._nodes.length - len;
      if (toClose < 0 || (nodeCount !== undefined && toClose !== nodeCount))
        throw Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
      this._nodes.length = len;
      return this;
    }
    func(name, args = code_1.nil, async, funcBody) {
      this._blockNode(new Func(name, args, async));
      if (funcBody) this.code(funcBody).endFunc();
      return this;
    }
    endFunc() {
      return this._endBlockNode(Func);
    }
    optimize(n = 1) {
      while (n-- > 0) {
        this._root.optimizeNodes();
        this._root.optimizeNames(this._root.names, this._constants);
      }
    }
    _leafNode(node) {
      this._currNode.nodes.push(node);
      return this;
    }
    _blockNode(node) {
      this._currNode.nodes.push(node);
      this._nodes.push(node);
    }
    _endBlockNode(N1, N2) {
      let n = this._currNode;
      if (n instanceof N1 || (N2 && n instanceof N2)) {
        this._nodes.pop();
        return this;
      }
      throw Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
    }
    _elseNode(node) {
      let n = this._currNode;
      if (!(n instanceof If)) throw Error('CodeGen: "else" without "if"');
      this._currNode = n.else = node;
      return this;
    }
    get _root() {
      return this._nodes[0];
    }
    get _currNode() {
      let ns = this._nodes;
      return ns[ns.length - 1];
    }
    set _currNode(node) {
      let ns = this._nodes;
      ns[ns.length - 1] = node;
    }
  };
  cjsExports.CodeGen = CodeGen;
  function addNames(names, from) {
    for (let n in from) names[n] = (names[n] || 0) + (from[n] || 0);
    return names;
  }
  function addExprNames(names, from) {
    return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
  }
  function optimizeExpr(expr, names, constants) {
    if (expr instanceof code_1.Name) return replaceName(expr);
    if (!canOptimize(expr)) return expr;
    return new code_1._Code(
      expr._items.reduce((items, c) => {
        if (c instanceof code_1.Name) c = replaceName(c);
        if (c instanceof code_1._Code) items.push(...c._items);
        else items.push(c);
        return items;
      }, []),
    );
    function replaceName(n) {
      let c = constants[n.str];
      if (c === undefined || names[n.str] !== 1) return n;
      delete names[n.str];
      return c;
    }
    function canOptimize(e) {
      return (
        e instanceof code_1._Code &&
        e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== undefined)
      );
    }
  }
  function subtractNames(names, from) {
    for (let n in from) names[n] = (names[n] || 0) - (from[n] || 0);
  }
  function not(x) {
    return typeof x == "boolean" || typeof x == "number" || x === null ? !x : code_1._`!${par(x)}`;
  }
  cjsExports.not = not;
  let andCode = mappend(cjsExports.operators.AND);
  function and(...args) {
    return args.reduce(andCode);
  }
  cjsExports.and = and;
  let orCode = mappend(cjsExports.operators.OR);
  function or(...args) {
    return args.reduce(orCode);
  }
  cjsExports.or = or;
  function mappend(op) {
    return (x, y) => (x === code_1.nil ? y : y === code_1.nil ? x : code_1._`${par(x)} ${op} ${par(y)}`);
  }
  function par(x) {
    return x instanceof code_1.Name ? x : code_1._`(${x})`;
  }
});
var require_util = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.checkStrictMode =
    cjsExports.getErrorPath =
    cjsExports.Type =
    cjsExports.useFunc =
    cjsExports.setEvaluated =
    cjsExports.evaluatedPropsToName =
    cjsExports.mergeEvaluated =
    cjsExports.eachItem =
    cjsExports.unescapeJsonPointer =
    cjsExports.escapeJsonPointer =
    cjsExports.escapeFragment =
    cjsExports.unescapeFragment =
    cjsExports.schemaRefOrVal =
    cjsExports.schemaHasRulesButRef =
    cjsExports.schemaHasRules =
    cjsExports.checkUnknownRules =
    cjsExports.alwaysValidSchema =
    cjsExports.toHash =
      undefined;
  let codegen_1 = require_codegen();
  let code_1 = require_code();
  function toHash(arr) {
    let hash = {};
    for (let item of arr) hash[item] = true;
    return hash;
  }
  cjsExports.toHash = toHash;
  function alwaysValidSchema(it, schema) {
    if (typeof schema == "boolean") return schema;
    if (Object.keys(schema).length === 0) return true;
    checkUnknownRules(it, schema);
    return !schemaHasRules(schema, it.self.RULES.all);
  }
  cjsExports.alwaysValidSchema = alwaysValidSchema;
  function checkUnknownRules(it, schema = it.schema) {
    let { opts, self: ajvInstance } = it;
    if (!opts.strictSchema) return;
    if (typeof schema === "boolean") return;
    let rules = ajvInstance.RULES.keywords;
    for (let key in schema) if (!rules[key]) checkStrictMode(it, `unknown keyword: "${key}"`);
  }
  cjsExports.checkUnknownRules = checkUnknownRules;
  function schemaHasRules(schema, rules) {
    if (typeof schema == "boolean") return !schema;
    for (let key in schema) if (rules[key]) return true;
    return false;
  }
  cjsExports.schemaHasRules = schemaHasRules;
  function schemaHasRulesButRef(schema, RULES) {
    if (typeof schema == "boolean") return !schema;
    for (let key in schema) if (key !== "$ref" && RULES.all[key]) return true;
    return false;
  }
  cjsExports.schemaHasRulesButRef = schemaHasRulesButRef;
  function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
    if (!$data) {
      if (typeof schema == "number" || typeof schema == "boolean") return schema;
      if (typeof schema == "string") return codegen_1._`${schema}`;
    }
    return codegen_1._`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
  }
  cjsExports.schemaRefOrVal = schemaRefOrVal;
  function unescapeFragment(str) {
    return unescapeJsonPointer(decodeURIComponent(str));
  }
  cjsExports.unescapeFragment = unescapeFragment;
  function escapeFragment(str) {
    return encodeURIComponent(escapeJsonPointer(str));
  }
  cjsExports.escapeFragment = escapeFragment;
  function escapeJsonPointer(str) {
    if (typeof str == "number") return `${str}`;
    return str.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  cjsExports.escapeJsonPointer = escapeJsonPointer;
  function unescapeJsonPointer(str) {
    return str.replace(/~1/g, "/").replace(/~0/g, "~");
  }
  cjsExports.unescapeJsonPointer = unescapeJsonPointer;
  function eachItem(xs, f) {
    if (Array.isArray(xs)) for (let x of xs) f(x);
    else f(xs);
  }
  cjsExports.eachItem = eachItem;
  function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
    return (gen, from, to, toName) => {
      let res =
        to === undefined
          ? from
          : to instanceof codegen_1.Name
            ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to)
            : from instanceof codegen_1.Name
              ? (mergeToName(gen, to, from), from)
              : mergeValues(from, to);
      return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
    };
  }
  cjsExports.mergeEvaluated = {
    props: makeMergeEvaluated({
      mergeNames: (gen, from, to) =>
        gen.if(codegen_1._`${to} !== true && ${from} !== undefined`, () => {
          gen.if(
            codegen_1._`${from} === true`,
            () => gen.assign(to, true),
            () => gen.assign(to, codegen_1._`${to} || {}`).code(codegen_1._`Object.assign(${to}, ${from})`),
          );
        }),
      mergeToName: (gen, from, to) =>
        gen.if(codegen_1._`${to} !== true`, () => {
          if (from === true) gen.assign(to, true);
          else {
            gen.assign(to, codegen_1._`${to} || {}`);
            setEvaluated(gen, to, from);
          }
        }),
      mergeValues: (from, to) =>
        from === true
          ? true
          : {
              ...from,
              ...to,
            },
      resultToName: evaluatedPropsToName,
    }),
    items: makeMergeEvaluated({
      mergeNames: (gen, from, to) =>
        gen.if(codegen_1._`${to} !== true && ${from} !== undefined`, () =>
          gen.assign(to, codegen_1._`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`),
        ),
      mergeToName: (gen, from, to) =>
        gen.if(codegen_1._`${to} !== true`, () =>
          gen.assign(to, from === true ? true : codegen_1._`${to} > ${from} ? ${to} : ${from}`),
        ),
      mergeValues: (from, to) => (from === true ? true : Math.max(from, to)),
      resultToName: (gen, items) => gen.var("items", items),
    }),
  };
  function evaluatedPropsToName(gen, ps) {
    if (ps === true) return gen.var("props", true);
    let props = gen.var("props", codegen_1._`{}`);
    if (ps !== undefined) setEvaluated(gen, props, ps);
    return props;
  }
  cjsExports.evaluatedPropsToName = evaluatedPropsToName;
  function setEvaluated(gen, props, ps) {
    Object.keys(ps).forEach((p) => gen.assign(codegen_1._`${props}${(0, codegen_1.getProperty)(p)}`, true));
  }
  cjsExports.setEvaluated = setEvaluated;
  let snippets = {};
  function useFunc(gen, f) {
    return gen.scopeValue("func", {
      ref: f,
      code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code)),
    });
  }
  cjsExports.useFunc = useFunc;
  var Type;
  (function (Type) {
    Type[(Type.Num = 0)] = "Num";
    Type[(Type.Str = 1)] = "Str";
  })(Type || (cjsExports.Type = Type = {}));
  function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
    if (dataProp instanceof codegen_1.Name) {
      let isNumber = dataPropType === Type.Num;
      return jsPropertySyntax
        ? isNumber
          ? codegen_1._`"[" + ${dataProp} + "]"`
          : codegen_1._`"['" + ${dataProp} + "']"`
        : isNumber
          ? codegen_1._`"/" + ${dataProp}`
          : codegen_1._`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
    }
    return jsPropertySyntax
      ? (0, codegen_1.getProperty)(dataProp).toString()
      : "/" + escapeJsonPointer(dataProp);
  }
  cjsExports.getErrorPath = getErrorPath;
  function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
    if (!mode) return;
    msg = `strict mode: ${msg}`;
    if (mode === true) throw Error(msg);
    it.self.logger.warn(msg);
  }
  cjsExports.checkStrictMode = checkStrictMode;
});
var require_names = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let codegen_1 = require_codegen();
  let names = {
    data: new codegen_1.Name("data"),
    valCxt: new codegen_1.Name("valCxt"),
    instancePath: new codegen_1.Name("instancePath"),
    parentData: new codegen_1.Name("parentData"),
    parentDataProperty: new codegen_1.Name("parentDataProperty"),
    rootData: new codegen_1.Name("rootData"),
    dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
    vErrors: new codegen_1.Name("vErrors"),
    errors: new codegen_1.Name("errors"),
    this: new codegen_1.Name("this"),
    self: new codegen_1.Name("self"),
    scope: new codegen_1.Name("scope"),
    json: new codegen_1.Name("json"),
    jsonPos: new codegen_1.Name("jsonPos"),
    jsonLen: new codegen_1.Name("jsonLen"),
    jsonPart: new codegen_1.Name("jsonPart"),
  };
  cjsExports.default = names;
});
var require_errors = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.extendErrors =
    cjsExports.resetErrorsCount =
    cjsExports.reportExtraError =
    cjsExports.reportError =
    cjsExports.keyword$DataError =
    cjsExports.keywordError =
      undefined;
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let names_1 = require_names();
  cjsExports.keywordError = {
    message: ({ keyword }) => codegen_1.str`must pass "${keyword}" keyword validation`,
  };
  cjsExports.keyword$DataError = {
    message: ({ keyword, schemaType }) =>
      schemaType
        ? codegen_1.str`"${keyword}" keyword must be ${schemaType} ($data)`
        : codegen_1.str`"${keyword}" keyword is invalid ($data)`,
  };
  function reportError(cxt, error = cjsExports.keywordError, errorPaths, overrideAllErrors) {
    let { it } = cxt;
    let { gen, compositeRule, allErrors } = it;
    let errObj = errorObjectCode(cxt, error, errorPaths);
    if (
      overrideAllErrors !== null && overrideAllErrors !== undefined
        ? overrideAllErrors
        : compositeRule || allErrors
    )
      addError(gen, errObj);
    else returnErrors(it, codegen_1._`[${errObj}]`);
  }
  cjsExports.reportError = reportError;
  function reportExtraError(cxt, error = cjsExports.keywordError, errorPaths) {
    let { it } = cxt;
    let { gen, compositeRule, allErrors } = it;
    addError(gen, errorObjectCode(cxt, error, errorPaths));
    if (!(compositeRule || allErrors)) returnErrors(it, names_1.default.vErrors);
  }
  cjsExports.reportExtraError = reportExtraError;
  function resetErrorsCount(gen, errsCount) {
    gen.assign(names_1.default.errors, errsCount);
    gen.if(codegen_1._`${names_1.default.vErrors} !== null`, () =>
      gen.if(
        errsCount,
        () => gen.assign(codegen_1._`${names_1.default.vErrors}.length`, errsCount),
        () => gen.assign(names_1.default.vErrors, null),
      ),
    );
  }
  cjsExports.resetErrorsCount = resetErrorsCount;
  function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
    if (errsCount === undefined) throw Error("ajv implementation error");
    let err = gen.name("err");
    gen.forRange("i", errsCount, names_1.default.errors, (i) => {
      gen.const(err, codegen_1._`${names_1.default.vErrors}[${i}]`);
      gen.if(codegen_1._`${err}.instancePath === undefined`, () =>
        gen.assign(
          codegen_1._`${err}.instancePath`,
          (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath),
        ),
      );
      gen.assign(codegen_1._`${err}.schemaPath`, codegen_1.str`${it.errSchemaPath}/${keyword}`);
      if (it.opts.verbose) {
        gen.assign(codegen_1._`${err}.schema`, schemaValue);
        gen.assign(codegen_1._`${err}.data`, data);
      }
    });
  }
  cjsExports.extendErrors = extendErrors;
  function addError(gen, errObj) {
    let err = gen.const("err", errObj);
    gen.if(
      codegen_1._`${names_1.default.vErrors} === null`,
      () => gen.assign(names_1.default.vErrors, codegen_1._`[${err}]`),
      codegen_1._`${names_1.default.vErrors}.push(${err})`,
    );
    gen.code(codegen_1._`${names_1.default.errors}++`);
  }
  function returnErrors(it, errs) {
    let { gen, validateName, schemaEnv } = it;
    if (schemaEnv.$async) gen.throw(codegen_1._`new ${it.ValidationError}(${errs})`);
    else {
      gen.assign(codegen_1._`${validateName}.errors`, errs);
      gen.return(false);
    }
  }
  let E = {
    keyword: new codegen_1.Name("keyword"),
    schemaPath: new codegen_1.Name("schemaPath"),
    params: new codegen_1.Name("params"),
    propertyName: new codegen_1.Name("propertyName"),
    message: new codegen_1.Name("message"),
    schema: new codegen_1.Name("schema"),
    parentSchema: new codegen_1.Name("parentSchema"),
  };
  function errorObjectCode(cxt, error, errorPaths) {
    let { createErrors } = cxt.it;
    if (createErrors === false) return codegen_1._`{}`;
    return errorObject(cxt, error, errorPaths);
  }
  function errorObject(cxt, error, errorPaths = {}) {
    let { gen, it } = cxt;
    let keyValues = [errorInstancePath(it, errorPaths), errorSchemaPath(cxt, errorPaths)];
    extraErrorProps(cxt, error, keyValues);
    return gen.object(...keyValues);
  }
  function errorInstancePath({ errorPath }, { instancePath }) {
    let instPath = instancePath
      ? codegen_1.str`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}`
      : errorPath;
    return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
  }
  function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
    let schPath = parentSchema ? errSchemaPath : codegen_1.str`${errSchemaPath}/${keyword}`;
    if (schemaPath)
      schPath = codegen_1.str`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
    return [E.schemaPath, schPath];
  }
  function extraErrorProps(cxt, { params, message }, keyValues) {
    let { keyword, data, schemaValue, it } = cxt;
    let { opts, propertyName, topSchemaRef, schemaPath } = it;
    keyValues.push(
      [E.keyword, keyword],
      [E.params, typeof params == "function" ? params(cxt) : params || codegen_1._`{}`],
    );
    if (opts.messages) keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
    if (opts.verbose)
      keyValues.push(
        [E.schema, schemaValue],
        [E.parentSchema, codegen_1._`${topSchemaRef}${schemaPath}`],
        [names_1.default.data, data],
      );
    if (propertyName) keyValues.push([E.propertyName, propertyName]);
  }
});
var require_boolSchema = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.boolOrEmptySchema = cjsExports.topBoolOrEmptySchema = undefined;
  let errors_1 = require_errors();
  let codegen_1 = require_codegen();
  let names_1 = require_names();
  let boolError = {
    message: "boolean schema is false",
  };
  function topBoolOrEmptySchema(it) {
    let { gen, schema, validateName } = it;
    if (schema === false) falseSchemaError(it, false);
    else if (typeof schema == "object" && schema.$async === true) gen.return(names_1.default.data);
    else {
      gen.assign(codegen_1._`${validateName}.errors`, null);
      gen.return(true);
    }
  }
  cjsExports.topBoolOrEmptySchema = topBoolOrEmptySchema;
  function boolOrEmptySchema(it, valid) {
    let { gen, schema } = it;
    if (schema === false) {
      gen.var(valid, false);
      falseSchemaError(it);
    } else gen.var(valid, true);
  }
  cjsExports.boolOrEmptySchema = boolOrEmptySchema;
  function falseSchemaError(it, overrideAllErrors) {
    let { gen, data } = it;
    let cxt = {
      gen,
      keyword: "false schema",
      data,
      schema: false,
      schemaCode: false,
      schemaValue: false,
      params: {},
      it,
    };
    (0, errors_1.reportError)(cxt, boolError, undefined, overrideAllErrors);
  }
});
var require_rules = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getRules = cjsExports.isJSONType = undefined;
  let jsonTypes = new Set(["string", "number", "integer", "boolean", "null", "object", "array"]);
  function isJSONType(x) {
    return typeof x == "string" && jsonTypes.has(x);
  }
  cjsExports.isJSONType = isJSONType;
  function getRules() {
    let groups = {
      number: {
        type: "number",
        rules: [],
      },
      string: {
        type: "string",
        rules: [],
      },
      array: {
        type: "array",
        rules: [],
      },
      object: {
        type: "object",
        rules: [],
      },
    };
    return {
      types: {
        ...groups,
        integer: true,
        boolean: true,
        null: true,
      },
      rules: [
        {
          rules: [],
        },
        groups.number,
        groups.string,
        groups.array,
        groups.object,
      ],
      post: {
        rules: [],
      },
      all: {},
      keywords: {},
    };
  }
  cjsExports.getRules = getRules;
});
var require_applicability = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.shouldUseRule = cjsExports.shouldUseGroup = cjsExports.schemaHasRulesForType = undefined;
  function schemaHasRulesForType({ schema, self: ajvInstance }, type) {
    let group = ajvInstance.RULES.types[type];
    return group && group !== true && shouldUseGroup(schema, group);
  }
  cjsExports.schemaHasRulesForType = schemaHasRulesForType;
  function shouldUseGroup(schema, group) {
    return group.rules.some((rule) => shouldUseRule(schema, rule));
  }
  cjsExports.shouldUseGroup = shouldUseGroup;
  function shouldUseRule(schema, rule) {
    var _a;
    return (
      schema[rule.keyword] !== undefined ||
      ((_a = rule.definition.implements) === null || _a === undefined
        ? undefined
        : _a.some((kwd) => schema[kwd] !== undefined))
    );
  }
  cjsExports.shouldUseRule = shouldUseRule;
});
var require_dataType = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.reportTypeError =
    cjsExports.checkDataTypes =
    cjsExports.checkDataType =
    cjsExports.coerceAndCheckDataType =
    cjsExports.getJSONTypes =
    cjsExports.getSchemaTypes =
    cjsExports.DataType =
      undefined;
  let rules_1 = require_rules();
  let applicability_1 = require_applicability();
  let errors_1 = require_errors();
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  var DataType;
  (function (DataType) {
    DataType[(DataType.Correct = 0)] = "Correct";
    DataType[(DataType.Wrong = 1)] = "Wrong";
  })(DataType || (cjsExports.DataType = DataType = {}));
  function getSchemaTypes(schema) {
    let types = getJSONTypes(schema.type);
    if (types.includes("null")) {
      if (schema.nullable === false) throw Error("type: null contradicts nullable: false");
    } else {
      if (!types.length && schema.nullable !== undefined)
        throw Error('"nullable" cannot be used without "type"');
      if (schema.nullable === true) types.push("null");
    }
    return types;
  }
  cjsExports.getSchemaTypes = getSchemaTypes;
  function getJSONTypes(ts) {
    let types = Array.isArray(ts) ? ts : ts ? [ts] : [];
    if (types.every(rules_1.isJSONType)) return types;
    throw Error("type must be JSONType or JSONType[]: " + types.join(","));
  }
  cjsExports.getJSONTypes = getJSONTypes;
  function coerceAndCheckDataType(it, types) {
    let { gen, data, opts } = it;
    let coerceTo = coerceToTypes(types, opts.coerceTypes);
    let checkTypes =
      types.length > 0 &&
      !(
        coerceTo.length === 0 &&
        types.length === 1 &&
        (0, applicability_1.schemaHasRulesForType)(it, types[0])
      );
    if (checkTypes) {
      let wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
      gen.if(wrongType, () => {
        if (coerceTo.length) coerceData(it, types, coerceTo);
        else reportTypeError(it);
      });
    }
    return checkTypes;
  }
  cjsExports.coerceAndCheckDataType = coerceAndCheckDataType;
  let COERCIBLE = new Set(["string", "number", "integer", "boolean", "null"]);
  function coerceToTypes(types, coerceTypes) {
    return coerceTypes
      ? types.filter((t) => COERCIBLE.has(t) || (coerceTypes === "array" && t === "array"))
      : [];
  }
  function coerceData(it, types, coerceTo) {
    let { gen, data, opts } = it;
    let dataType = gen.let("dataType", codegen_1._`typeof ${data}`);
    let coerced = gen.let("coerced", codegen_1._`undefined`);
    if (opts.coerceTypes === "array")
      gen.if(codegen_1._`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () =>
        gen
          .assign(data, codegen_1._`${data}[0]`)
          .assign(dataType, codegen_1._`typeof ${data}`)
          .if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)),
      );
    gen.if(codegen_1._`${coerced} !== undefined`);
    for (let t of coerceTo)
      if (COERCIBLE.has(t) || (t === "array" && opts.coerceTypes === "array")) coerceSpecificType(t);
    gen.else();
    reportTypeError(it);
    gen.endIf();
    gen.if(codegen_1._`${coerced} !== undefined`, () => {
      gen.assign(data, coerced);
      assignParentData(it, coerced);
    });
    function coerceSpecificType(t) {
      switch (t) {
        case "string":
          gen
            .elseIf(codegen_1._`${dataType} == "number" || ${dataType} == "boolean"`)
            .assign(coerced, codegen_1._`"" + ${data}`)
            .elseIf(codegen_1._`${data} === null`)
            .assign(coerced, codegen_1._`""`);
          return;
        case "number":
          gen
            .elseIf(
              codegen_1._`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`,
            )
            .assign(coerced, codegen_1._`+${data}`);
          return;
        case "integer":
          gen
            .elseIf(
              codegen_1._`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`,
            )
            .assign(coerced, codegen_1._`+${data}`);
          return;
        case "boolean":
          gen
            .elseIf(codegen_1._`${data} === "false" || ${data} === 0 || ${data} === null`)
            .assign(coerced, false)
            .elseIf(codegen_1._`${data} === "true" || ${data} === 1`)
            .assign(coerced, true);
          return;
        case "null":
          gen.elseIf(codegen_1._`${data} === "" || ${data} === 0 || ${data} === false`);
          gen.assign(coerced, null);
          return;
        case "array":
          gen
            .elseIf(
              codegen_1._`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`,
            )
            .assign(coerced, codegen_1._`[${data}]`);
      }
    }
  }
  function assignParentData({ gen, parentData, parentDataProperty }, expr) {
    gen.if(codegen_1._`${parentData} !== undefined`, () =>
      gen.assign(codegen_1._`${parentData}[${parentDataProperty}]`, expr),
    );
  }
  function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
    let EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
    let cond;
    switch (dataType) {
      case "null":
        return codegen_1._`${data} ${EQ} null`;
      case "array":
        cond = codegen_1._`Array.isArray(${data})`;
        break;
      case "object":
        cond = codegen_1._`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
        break;
      case "integer":
        cond = numCond(codegen_1._`!(${data} % 1) && !isNaN(${data})`);
        break;
      case "number":
        cond = numCond();
        break;
      default:
        return codegen_1._`typeof ${data} ${EQ} ${dataType}`;
    }
    return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
    function numCond(_cond = codegen_1.nil) {
      return (0, codegen_1.and)(
        codegen_1._`typeof ${data} == "number"`,
        _cond,
        strictNums ? codegen_1._`isFinite(${data})` : codegen_1.nil,
      );
    }
  }
  cjsExports.checkDataType = checkDataType;
  function checkDataTypes(dataTypes, data, strictNums, correct) {
    if (dataTypes.length === 1) return checkDataType(dataTypes[0], data, strictNums, correct);
    let cond;
    let types = (0, util_1.toHash)(dataTypes);
    if (types.array && types.object) {
      let notObj = codegen_1._`typeof ${data} != "object"`;
      cond = types.null ? notObj : codegen_1._`!${data} || ${notObj}`;
      delete types.null;
      delete types.array;
      delete types.object;
    } else cond = codegen_1.nil;
    if (types.number) delete types.integer;
    for (let t in types) cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
    return cond;
  }
  cjsExports.checkDataTypes = checkDataTypes;
  let typeError = {
    message: ({ schema }) => `must be ${schema}`,
    params: ({ schema, schemaValue }) =>
      typeof schema == "string" ? codegen_1._`{type: ${schema}}` : codegen_1._`{type: ${schemaValue}}`,
  };
  function reportTypeError(it) {
    let cxt = getTypeErrorContext(it);
    (0, errors_1.reportError)(cxt, typeError);
  }
  cjsExports.reportTypeError = reportTypeError;
  function getTypeErrorContext(it) {
    let { gen, data, schema } = it;
    let schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
    return {
      gen,
      keyword: "type",
      data,
      schema: schema.type,
      schemaCode,
      schemaValue: schemaCode,
      parentSchema: schema,
      params: {},
      it,
    };
  }
});
var require_defaults = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.assignDefaults = undefined;
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  function assignDefaults(it, ty) {
    let { properties, items } = it.schema;
    if (ty === "object" && properties)
      for (let key in properties) assignDefault(it, key, properties[key].default);
    else if (ty === "array" && Array.isArray(items))
      items.forEach((sch, i) => assignDefault(it, i, sch.default));
  }
  cjsExports.assignDefaults = assignDefaults;
  function assignDefault(it, prop, defaultValue) {
    let { gen, compositeRule, data, opts } = it;
    if (defaultValue === undefined) return;
    let childData = codegen_1._`${data}${(0, codegen_1.getProperty)(prop)}`;
    if (compositeRule) {
      (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
      return;
    }
    let condition = codegen_1._`${childData} === undefined`;
    if (opts.useDefaults === "empty")
      condition = codegen_1._`${condition} || ${childData} === null || ${childData} === ""`;
    gen.if(condition, codegen_1._`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
  }
});
var require_code_2 = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateUnion =
    cjsExports.validateArray =
    cjsExports.usePattern =
    cjsExports.callValidateCode =
    cjsExports.schemaProperties =
    cjsExports.allSchemaProperties =
    cjsExports.noPropertyInData =
    cjsExports.propertyInData =
    cjsExports.isOwnProperty =
    cjsExports.hasPropFunc =
    cjsExports.reportMissingProp =
    cjsExports.checkMissingProp =
    cjsExports.checkReportMissingProp =
      undefined;
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  let names_1 = require_names();
  let util_2 = require_util();
  function checkReportMissingProp(cxt, prop) {
    let { gen, data, it } = cxt;
    gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
      cxt.setParams(
        {
          missingProperty: codegen_1._`${prop}`,
        },
        true,
      );
      cxt.error();
    });
  }
  cjsExports.checkReportMissingProp = checkReportMissingProp;
  function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
    return (0, codegen_1.or)(
      ...properties.map((prop) =>
        (0, codegen_1.and)(
          noPropertyInData(gen, data, prop, opts.ownProperties),
          codegen_1._`${missing} = ${prop}`,
        ),
      ),
    );
  }
  cjsExports.checkMissingProp = checkMissingProp;
  function reportMissingProp(cxt, missing) {
    cxt.setParams(
      {
        missingProperty: missing,
      },
      true,
    );
    cxt.error();
  }
  cjsExports.reportMissingProp = reportMissingProp;
  function hasPropFunc(gen) {
    return gen.scopeValue("func", {
      ref: Object.prototype.hasOwnProperty,
      code: codegen_1._`Object.prototype.hasOwnProperty`,
    });
  }
  cjsExports.hasPropFunc = hasPropFunc;
  function isOwnProperty(gen, data, property) {
    return codegen_1._`${hasPropFunc(gen)}.call(${data}, ${property})`;
  }
  cjsExports.isOwnProperty = isOwnProperty;
  function propertyInData(gen, data, property, ownProperties) {
    let cond = codegen_1._`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
    return ownProperties ? codegen_1._`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
  }
  cjsExports.propertyInData = propertyInData;
  function noPropertyInData(gen, data, property, ownProperties) {
    let cond = codegen_1._`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
    return ownProperties
      ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property)))
      : cond;
  }
  cjsExports.noPropertyInData = noPropertyInData;
  function allSchemaProperties(schemaMap) {
    return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
  }
  cjsExports.allSchemaProperties = allSchemaProperties;
  function schemaProperties(it, schemaMap) {
    return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
  }
  cjsExports.schemaProperties = schemaProperties;
  function callValidateCode(
    { schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it },
    func,
    context,
    passSchema,
  ) {
    let dataAndSchema = passSchema ? codegen_1._`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
    let valCxt = [
      [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
      [names_1.default.parentData, it.parentData],
      [names_1.default.parentDataProperty, it.parentDataProperty],
      [names_1.default.rootData, names_1.default.rootData],
    ];
    if (it.opts.dynamicRef) valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
    let args = codegen_1._`${dataAndSchema}, ${gen.object(...valCxt)}`;
    return context !== codegen_1.nil
      ? codegen_1._`${func}.call(${context}, ${args})`
      : codegen_1._`${func}(${args})`;
  }
  cjsExports.callValidateCode = callValidateCode;
  let newRegExp = codegen_1._`new RegExp`;
  function usePattern({ gen, it: { opts } }, pattern) {
    let u = opts.unicodeRegExp ? "u" : "";
    let { regExp } = opts.code;
    let rx = regExp(pattern, u);
    return gen.scopeValue("pattern", {
      key: rx.toString(),
      ref: rx,
      code: codegen_1._`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`,
    });
  }
  cjsExports.usePattern = usePattern;
  function validateArray(cxt) {
    let { gen, data, keyword, it } = cxt;
    let valid = gen.name("valid");
    if (it.allErrors) {
      let validArr = gen.let("valid", true);
      validateItems(() => gen.assign(validArr, false));
      return validArr;
    }
    gen.var(valid, true);
    validateItems(() => gen.break());
    return valid;
    function validateItems(notValid) {
      let len = gen.const("len", codegen_1._`${data}.length`);
      gen.forRange("i", 0, len, (i) => {
        cxt.subschema(
          {
            keyword,
            dataProp: i,
            dataPropType: util_1.Type.Num,
          },
          valid,
        );
        gen.if((0, codegen_1.not)(valid), notValid);
      });
    }
  }
  cjsExports.validateArray = validateArray;
  function validateUnion(cxt) {
    let { gen, schema, keyword, it } = cxt;
    if (!Array.isArray(schema)) throw Error("ajv implementation error");
    if (schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch)) && !it.opts.unevaluated) return;
    let valid = gen.let("valid", false);
    let schValid = gen.name("_valid");
    gen.block(() =>
      schema.forEach((_sch, i) => {
        let schCxt = cxt.subschema(
          {
            keyword,
            schemaProp: i,
            compositeRule: true,
          },
          schValid,
        );
        gen.assign(valid, codegen_1._`${valid} || ${schValid}`);
        if (!cxt.mergeValidEvaluated(schCxt, schValid)) gen.if((0, codegen_1.not)(valid));
      }),
    );
    cxt.result(
      valid,
      () => cxt.reset(),
      () => cxt.error(true),
    );
  }
  cjsExports.validateUnion = validateUnion;
});
var require_keyword = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateKeywordUsage =
    cjsExports.validSchemaType =
    cjsExports.funcKeywordCode =
    cjsExports.macroKeywordCode =
      undefined;
  let codegen_1 = require_codegen();
  let names_1 = require_names();
  let code_1 = require_code_2();
  let errors_1 = require_errors();
  function macroKeywordCode(cxt, def) {
    let { gen, keyword, schema, parentSchema, it } = cxt;
    let macroSchema = def.macro.call(it.self, schema, parentSchema, it);
    let schemaRef = useKeyword(gen, keyword, macroSchema);
    if (it.opts.validateSchema !== false) it.self.validateSchema(macroSchema, true);
    let valid = gen.name("valid");
    cxt.subschema(
      {
        schema: macroSchema,
        schemaPath: codegen_1.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: schemaRef,
        compositeRule: true,
      },
      valid,
    );
    cxt.pass(valid, () => cxt.error(true));
  }
  cjsExports.macroKeywordCode = macroKeywordCode;
  function funcKeywordCode(cxt, def) {
    var _a;
    let { gen, keyword, schema, parentSchema, $data, it } = cxt;
    checkAsyncKeyword(it, def);
    let validateRef = useKeyword(
      gen,
      keyword,
      !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate,
    );
    let valid = gen.let("valid");
    cxt.block$data(valid, validateKeyword);
    cxt.ok((_a = def.valid) !== null && _a !== undefined ? _a : valid);
    function validateKeyword() {
      if (def.errors === false) {
        assignValid();
        if (def.modifying) modifyData(cxt);
        reportErrs(() => cxt.error());
      } else {
        let ruleErrs = def.async ? validateAsync() : validateSync();
        if (def.modifying) modifyData(cxt);
        reportErrs(() => addErrs(cxt, ruleErrs));
      }
    }
    function validateAsync() {
      let ruleErrs = gen.let("ruleErrs", null);
      gen.try(
        () => assignValid(codegen_1._`await `),
        (e) =>
          gen.assign(valid, false).if(
            codegen_1._`${e} instanceof ${it.ValidationError}`,
            () => gen.assign(ruleErrs, codegen_1._`${e}.errors`),
            () => gen.throw(e),
          ),
      );
      return ruleErrs;
    }
    function validateSync() {
      let validateErrs = codegen_1._`${validateRef}.errors`;
      gen.assign(validateErrs, null);
      assignValid(codegen_1.nil);
      return validateErrs;
    }
    function assignValid(_await = def.async ? codegen_1._`await ` : codegen_1.nil) {
      let passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
      let passSchema = !(("compile" in def && !$data) || def.schema === false);
      gen.assign(
        valid,
        codegen_1._`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`,
        def.modifying,
      );
    }
    function reportErrs(errors) {
      var _a;
      gen.if((0, codegen_1.not)((_a = def.valid) !== null && _a !== undefined ? _a : valid), errors);
    }
  }
  cjsExports.funcKeywordCode = funcKeywordCode;
  function modifyData(cxt) {
    let { gen, data, it } = cxt;
    gen.if(it.parentData, () => gen.assign(data, codegen_1._`${it.parentData}[${it.parentDataProperty}]`));
  }
  function addErrs(cxt, errs) {
    let { gen } = cxt;
    gen.if(
      codegen_1._`Array.isArray(${errs})`,
      () => {
        gen
          .assign(
            names_1.default.vErrors,
            codegen_1._`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`,
          )
          .assign(names_1.default.errors, codegen_1._`${names_1.default.vErrors}.length`);
        (0, errors_1.extendErrors)(cxt);
      },
      () => cxt.error(),
    );
  }
  function checkAsyncKeyword({ schemaEnv }, def) {
    if (def.async && !schemaEnv.$async) throw Error("async keyword in sync schema");
  }
  function useKeyword(gen, keyword, result) {
    if (result === undefined) throw Error(`keyword "${keyword}" failed to compile`);
    return gen.scopeValue(
      "keyword",
      typeof result == "function"
        ? {
            ref: result,
          }
        : {
            ref: result,
            code: (0, codegen_1.stringify)(result),
          },
    );
  }
  function validSchemaType(schema, schemaType, allowUndefined = false) {
    return (
      !schemaType.length ||
      schemaType.some((st) =>
        st === "array"
          ? Array.isArray(schema)
          : st === "object"
            ? schema && typeof schema == "object" && !Array.isArray(schema)
            : typeof schema == st || (allowUndefined && typeof schema === "undefined"),
      )
    );
  }
  cjsExports.validSchemaType = validSchemaType;
  function validateKeywordUsage({ schema, opts, self: ajvInstance, errSchemaPath }, def, keyword) {
    if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword)
      throw Error("ajv implementation error");
    let deps = def.dependencies;
    if (
      deps === null || deps === undefined
        ? undefined
        : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))
    )
      throw Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
    if (def.validateSchema) {
      if (!def.validateSchema(schema[keyword])) {
        let msg =
          `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` +
          ajvInstance.errorsText(def.validateSchema.errors);
        if (opts.validateSchema === "log") ajvInstance.logger.error(msg);
        else throw Error(msg);
      }
    }
  }
  cjsExports.validateKeywordUsage = validateKeywordUsage;
});
var require_subschema = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.extendSubschemaMode = cjsExports.extendSubschemaData = cjsExports.getSubschema = undefined;
  let codegen_1 = require_codegen();
  let util_1 = require_util();
  function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
    if (keyword !== undefined && schema !== undefined)
      throw Error('both "keyword" and "schema" passed, only one allowed');
    if (keyword !== undefined) {
      let sch = it.schema[keyword];
      return schemaProp === undefined
        ? {
            schema: sch,
            schemaPath: codegen_1._`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
            errSchemaPath: `${it.errSchemaPath}/${keyword}`,
          }
        : {
            schema: sch[schemaProp],
            schemaPath: codegen_1._`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
            errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`,
          };
    }
    if (schema !== undefined) {
      if (schemaPath === undefined || errSchemaPath === undefined || topSchemaRef === undefined)
        throw Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
      return {
        schema,
        schemaPath,
        topSchemaRef,
        errSchemaPath,
      };
    }
    throw Error('either "keyword" or "schema" must be passed');
  }
  cjsExports.getSubschema = getSubschema;
  function extendSubschemaData(
    subschema,
    it,
    { dataProp, dataPropType: dpType, data, dataTypes, propertyName },
  ) {
    if (data !== undefined && dataProp !== undefined)
      throw Error('both "data" and "dataProp" passed, only one allowed');
    let { gen } = it;
    if (dataProp !== undefined) {
      let { errorPath, dataPathArr, opts } = it;
      nextData(gen.let("data", codegen_1._`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true));
      subschema.errorPath = codegen_1.str`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
      subschema.parentDataProperty = codegen_1._`${dataProp}`;
      subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
    }
    if (data !== undefined) {
      nextData(data instanceof codegen_1.Name ? data : gen.let("data", data, true));
      if (propertyName !== undefined) subschema.propertyName = propertyName;
    }
    if (dataTypes) subschema.dataTypes = dataTypes;
    function nextData(_nextData) {
      subschema.data = _nextData;
      subschema.dataLevel = it.dataLevel + 1;
      subschema.dataTypes = [];
      it.definedProperties = new Set();
      subschema.parentData = it.data;
      subschema.dataNames = [...it.dataNames, _nextData];
    }
  }
  cjsExports.extendSubschemaData = extendSubschemaData;
  function extendSubschemaMode(
    subschema,
    { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors },
  ) {
    if (compositeRule !== undefined) subschema.compositeRule = compositeRule;
    if (createErrors !== undefined) subschema.createErrors = createErrors;
    if (allErrors !== undefined) subschema.allErrors = allErrors;
    subschema.jtdDiscriminator = jtdDiscriminator;
    subschema.jtdMetadata = jtdMetadata;
  }
  cjsExports.extendSubschemaMode = extendSubschemaMode;
});
var require_fast_deep_equal = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = function equal(a_2, b) {
    if (a_2 === b) return true;
    if (a_2 && b && typeof a_2 == "object" && typeof b == "object") {
      if (a_2.constructor !== b.constructor) return false;
      var length;
      var index;
      var keys;
      if (Array.isArray(a_2)) {
        length = a_2.length;
        if (length != b.length) return false;
        for (index = length; index-- !== 0;) if (!equal(a_2[index], b[index])) return false;
        return true;
      }
      if (a_2.constructor === RegExp) return a_2.source === b.source && a_2.flags === b.flags;
      if (a_2.valueOf !== Object.prototype.valueOf) return a_2.valueOf() === b.valueOf();
      if (a_2.toString !== Object.prototype.toString) return a_2.toString() === b.toString();
      keys = Object.keys(a_2);
      length = keys.length;
      if (length !== Object.keys(b).length) return false;
      for (index = length; index-- !== 0;)
        if (!Object.prototype.hasOwnProperty.call(b, keys[index])) return false;
      for (index = length; index-- !== 0;) {
        var key = keys[index];
        if (!equal(a_2[key], b[key])) return false;
      }
      return true;
    }
    return a_2 !== a_2 && b !== b;
  };
});
var require_json_schema_traverse = initModule((cjsExports, cjsModule) => {
  var traverse = (cjsModule.exports = function (schema, opts, cb) {
    if (typeof opts == "function") {
      cb = opts;
      opts = {};
    }
    cb = opts.cb || cb;
    var pre = typeof cb == "function" ? cb : cb.pre || function () {};
    var post = cb.post || function () {};
    _traverse(opts, pre, post, schema, "", schema);
  });
  traverse.keywords = {
    additionalItems: true,
    items: true,
    contains: true,
    additionalProperties: true,
    propertyNames: true,
    not: true,
    if: true,
    then: true,
    else: true,
  };
  traverse.arrayKeywords = {
    items: true,
    allOf: true,
    anyOf: true,
    oneOf: true,
  };
  traverse.propsKeywords = {
    $defs: true,
    definitions: true,
    properties: true,
    patternProperties: true,
    dependencies: true,
  };
  traverse.skipKeywords = {
    default: true,
    enum: true,
    const: true,
    required: true,
    maximum: true,
    minimum: true,
    exclusiveMaximum: true,
    exclusiveMinimum: true,
    multipleOf: true,
    maxLength: true,
    minLength: true,
    pattern: true,
    format: true,
    maxItems: true,
    minItems: true,
    uniqueItems: true,
    maxProperties: true,
    minProperties: true,
  };
  function _traverse(
    opts,
    pre,
    post,
    schema,
    jsonPtr,
    rootSchema,
    parentJsonPtr,
    parentKeyword,
    parentSchema,
    keyIndex,
  ) {
    if (schema && typeof schema == "object" && !Array.isArray(schema)) {
      pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      for (var key in schema) {
        var sch = schema[key];
        if (Array.isArray(sch)) {
          if (key in traverse.arrayKeywords)
            for (var i = 0; i < sch.length; i++)
              _traverse(
                opts,
                pre,
                post,
                sch[i],
                jsonPtr + "/" + key + "/" + i,
                rootSchema,
                jsonPtr,
                key,
                schema,
                i,
              );
        } else if (key in traverse.propsKeywords) {
          if (sch && typeof sch == "object")
            for (var prop in sch)
              _traverse(
                opts,
                pre,
                post,
                sch[prop],
                jsonPtr + "/" + key + "/" + escapeJsonPtr(prop),
                rootSchema,
                jsonPtr,
                key,
                schema,
                prop,
              );
        } else if (key in traverse.keywords || (opts.allKeys && !(key in traverse.skipKeywords)))
          _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
      }
      post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
    }
  }
  function escapeJsonPtr(str) {
    return str.replace(/~/g, "~0").replace(/\//g, "~1");
  }
});
var require_resolve = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getSchemaRefs =
    cjsExports.resolveUrl =
    cjsExports.normalizeId =
    cjsExports._getFullPath =
    cjsExports.getFullPath =
    cjsExports.inlineRef =
      undefined;
  let util_1 = require_util();
  let equal = require_fast_deep_equal();
  let traverse = require_json_schema_traverse();
  let SIMPLE_INLINED = new Set([
    "type",
    "format",
    "pattern",
    "maxLength",
    "minLength",
    "maxProperties",
    "minProperties",
    "maxItems",
    "minItems",
    "maximum",
    "minimum",
    "uniqueItems",
    "multipleOf",
    "required",
    "enum",
    "const",
  ]);
  function inlineRef(schema, limit = true) {
    if (typeof schema == "boolean") return true;
    if (limit === true) return !hasRef(schema);
    if (!limit) return false;
    return countKeys(schema) <= limit;
  }
  cjsExports.inlineRef = inlineRef;
  let REF_KEYWORDS = new Set(["$ref", "$recursiveRef", "$recursiveAnchor", "$dynamicRef", "$dynamicAnchor"]);
  function hasRef(schema) {
    for (let key in schema) {
      if (REF_KEYWORDS.has(key)) return true;
      let sch = schema[key];
      if (Array.isArray(sch) && sch.some(hasRef)) return true;
      if (typeof sch == "object" && hasRef(sch)) return true;
    }
    return false;
  }
  function countKeys(schema) {
    let count = 0;
    for (let key in schema) {
      if (key === "$ref") return 1 / 0;
      count++;
      if (SIMPLE_INLINED.has(key)) continue;
      if (typeof schema[key] == "object")
        (0, util_1.eachItem)(schema[key], (sch) => (count += countKeys(sch)));
      if (count === 1 / 0) return 1 / 0;
    }
    return count;
  }
  function getFullPath(uriResolver, id = "", normalize) {
    if (normalize !== false) id = normalizeId(id);
    return _getFullPath(uriResolver, uriResolver.parse(id));
  }
  cjsExports.getFullPath = getFullPath;
  function _getFullPath(uriResolver, p) {
    return uriResolver.serialize(p).split("#")[0] + "#";
  }
  cjsExports._getFullPath = _getFullPath;
  let TRAILING_SLASH_HASH = /#\/?$/;
  function normalizeId(id) {
    return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
  }
  cjsExports.normalizeId = normalizeId;
  function resolveUrl(resolver, baseId, id) {
    id = normalizeId(id);
    return resolver.resolve(baseId, id);
  }
  cjsExports.resolveUrl = resolveUrl;
  let ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
  function getSchemaRefs(schema, baseId) {
    if (typeof schema == "boolean") return {};
    let { schemaId, uriResolver } = this.opts;
    let schId = normalizeId(schema[schemaId] || baseId);
    let baseIds = {
      "": schId,
    };
    let pathPrefix = getFullPath(uriResolver, schId, false);
    let localRefs = {};
    let schemaRefs = new Set();
    traverse(
      schema,
      {
        allKeys: true,
      },
      (sch, jsonPtr, _, parentJsonPtr) => {
        if (parentJsonPtr === undefined) return;
        let fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string") innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref) {
          let _resolve = this.opts.uriResolver.resolve;
          ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
          if (schemaRefs.has(ref)) throw ambiguos(ref);
          schemaRefs.add(ref);
          let schOrRef = this.refs[ref];
          if (typeof schOrRef == "string") schOrRef = this.refs[schOrRef];
          if (typeof schOrRef == "object") checkAmbiguosRef(sch, schOrRef.schema, ref);
          else if (ref !== normalizeId(fullPath))
            if (ref[0] === "#") {
              checkAmbiguosRef(sch, localRefs[ref], ref);
              localRefs[ref] = sch;
            } else this.refs[ref] = fullPath;
          return ref;
        }
        function addAnchor(anchor) {
          if (typeof anchor == "string") {
            if (!ANCHOR.test(anchor)) throw Error(`invalid anchor "${anchor}"`);
            addRef.call(this, `#${anchor}`);
          }
        }
      },
    );
    return localRefs;
    function checkAmbiguosRef(sch1, sch2, ref) {
      if (sch2 !== undefined && !equal(sch1, sch2)) throw ambiguos(ref);
    }
    function ambiguos(ref) {
      return Error(`reference "${ref}" resolves to more than one schema`);
    }
  }
  cjsExports.getSchemaRefs = getSchemaRefs;
});
var require_validate = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getData = cjsExports.KeywordCxt = cjsExports.validateFunctionCode = undefined;
  let boolSchema_1 = require_boolSchema();
  let dataType_1 = require_dataType();
  let applicability_1 = require_applicability();
  let dataType_2 = require_dataType();
  let defaults_1 = require_defaults();
  let keyword_1 = require_keyword();
  let subschema_1 = require_subschema();
  let codegen_1 = require_codegen();
  let names_1 = require_names();
  let resolve_1 = require_resolve();
  let util_1 = require_util();
  let errors_1 = require_errors();
  function validateFunctionCode(it) {
    if (isSchemaObj(it)) {
      checkKeywords(it);
      if (schemaCxtHasRules(it)) {
        topSchemaObjCode(it);
        return;
      }
    }
    validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
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
    (0, boolSchema_1.boolOrEmptySchema)(it, valid);
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
    (0, util_1.checkUnknownRules)(it);
    checkRefsAndKeywords(it);
  }
  function typeAndKeywords(it, errsCount) {
    if (it.opts.jtd) return schemaKeywords(it, [], false, errsCount);
    let types = (0, dataType_1.getSchemaTypes)(it.schema);
    schemaKeywords(it, types, !(0, dataType_1.coerceAndCheckDataType)(it, types), errsCount);
  }
  function checkRefsAndKeywords(it) {
    let { schema, errSchemaPath, opts, self: ajvInstance } = it;
    if (
      schema.$ref &&
      opts.ignoreKeywordsWithRef &&
      (0, util_1.schemaHasRulesButRef)(schema, ajvInstance.RULES)
    )
      ajvInstance.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
  }
  function checkNoDefault(it) {
    let { schema, opts } = it;
    if (schema.default !== undefined && opts.useDefaults && opts.strictSchema)
      (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
  }
  function updateContext(it) {
    let schId = it.schema[it.opts.schemaId];
    if (schId) it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
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
    if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
      gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
      return;
    }
    if (!opts.jtd) checkStrictTypes(it, types);
    gen.block(() => {
      for (let group of RULES.rules) groupKeywords(group);
      groupKeywords(RULES.post);
    });
    function groupKeywords(group) {
      if (!(0, applicability_1.shouldUseGroup)(schema, group)) return;
      if (group.type) {
        gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
        iterateKeywords(it, group);
        if (types.length === 1 && types[0] === group.type && typeErrors) {
          gen.else();
          (0, dataType_2.reportTypeError)(it);
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
    if (useDefaults) (0, defaults_1.assignDefaults)(it, group.type);
    gen.block(() => {
      for (let rule of group.rules)
        if ((0, applicability_1.shouldUseRule)(schema, rule))
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
      if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
        let { type } = rule.definition;
        if (type.length && !type.some((t) => hasApplicableType(ts, t)))
          strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
      }
    }
  }
  function hasApplicableType(schTs, kwdT) {
    return schTs.includes(kwdT) || (kwdT === "number" && schTs.includes("integer"));
  }
  function includesType(ts, t) {
    return ts.includes(t) || (t === "integer" && ts.includes("number"));
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
    (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
  }
  var KeywordCxt = class {
    constructor(it, def, keyword) {
      (0, keyword_1.validateKeywordUsage)(it, def, keyword);
      this.gen = it.gen;
      this.allErrors = it.allErrors;
      this.keyword = keyword;
      this.data = it.data;
      this.schema = it.schema[keyword];
      this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
      this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
      this.schemaType = def.schemaType;
      this.parentSchema = it.schema;
      this.params = {};
      this.it = it;
      this.def = def;
      if (this.$data) this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
      else {
        this.schemaCode = this.schemaValue;
        if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined))
          throw Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
      }
      if ("code" in def ? def.trackErrors : def.errors !== false)
        this.errsCount = it.gen.const("_errs", names_1.default.errors);
    }
    result(condition, successAction, failAction) {
      this.failResult((0, codegen_1.not)(condition), successAction, failAction);
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
      this.failResult((0, codegen_1.not)(condition), undefined, failAction);
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
        codegen_1._`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`,
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
      (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
    }
    reset() {
      if (this.errsCount === undefined) throw Error('add "trackErrors" to keyword definition');
      (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
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
      gen.if((0, codegen_1.or)(codegen_1._`${schemaCode} === undefined`, $dataValid));
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
      return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
      function wrong$DataType() {
        if (schemaType.length) {
          if (!(schemaCode instanceof codegen_1.Name)) throw Error("ajv implementation error");
          let st = Array.isArray(schemaType) ? schemaType : [schemaType];
          return codegen_1._`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
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
      let subschema = (0, subschema_1.getSubschema)(this.it, appl);
      (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
      (0, subschema_1.extendSubschemaMode)(subschema, appl);
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
  };
  cjsExports.KeywordCxt = KeywordCxt;
  function keywordCode(it, keyword, def, ruleType) {
    let cxt = new KeywordCxt(it, def, keyword);
    if ("code" in def) def.code(cxt, ruleType);
    else if (cxt.$data && def.validate) (0, keyword_1.funcKeywordCode)(cxt, def);
    else if ("macro" in def) (0, keyword_1.macroKeywordCode)(cxt, def);
    else if (def.compile || def.validate) (0, keyword_1.funcKeywordCode)(cxt, def);
  }
  let JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
  let RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
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
        data = codegen_1._`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
        expr = codegen_1._`${expr} && ${data}`;
      }
    return expr;
    function errorMsg(pointerType, up) {
      return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
    }
  }
  cjsExports.getData = getData;
});
var require_validation_error = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var ValidationError = class extends Error {
    constructor(errors) {
      super("validation failed");
      this.errors = errors;
      this.ajv = this.validation = true;
    }
  };
  cjsExports.default = ValidationError;
});
var require_ref_error = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let resolve_1 = require_resolve();
  var MissingRefError = class extends Error {
    constructor(resolver, baseId, ref, msg) {
      super(msg || `can't resolve reference ${ref} from id ${baseId}`);
      this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
      this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
    }
  };
  cjsExports.default = MissingRefError;
});
var require_compile = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.resolveSchema =
    cjsExports.getCompilingSchema =
    cjsExports.resolveRef =
    cjsExports.compileSchema =
    cjsExports.SchemaEnv =
      undefined;
  let codegen_1 = require_codegen();
  let validation_error_1 = require_validation_error();
  let names_1 = require_names();
  let resolve_1 = require_resolve();
  let util_1 = require_util();
  let validate_1 = require_validate();
  var SchemaEnv = class {
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
          : (0, resolve_1.normalizeId)(
              schema === null || schema === undefined ? undefined : schema[env.schemaId || "$id"],
            );
      this.schemaPath = env.schemaPath;
      this.localRefs = env.localRefs;
      this.meta = env.meta;
      this.$async = schema === null || schema === undefined ? undefined : schema.$async;
      this.refs = {};
    }
  };
  cjsExports.SchemaEnv = SchemaEnv;
  function compileSchema(sch) {
    let _sch = getCompilingSchema.call(this, sch);
    if (_sch) return _sch;
    let rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
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
              code: (0, codegen_1.stringify)(sch.schema),
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
      (0, validate_1.validateFunctionCode)(schemaCxt);
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
        if (validate.source) validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
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
    ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
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
    if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs)) return sch.schema;
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
    let p_2 = this.opts.uriResolver.parse(ref);
    let refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p_2);
    let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, undefined);
    if (Object.keys(root.schema).length > 0 && refPath === baseId)
      return getJsonPointer.call(this, p_2, root);
    let id = (0, resolve_1.normalizeId)(refPath);
    let schOrRef = this.refs[id] || this.schemas[id];
    if (typeof schOrRef == "string") {
      let sch = resolveSchema.call(this, root, schOrRef);
      if (typeof (sch === null || sch === undefined ? undefined : sch.schema) !== "object") return;
      return getJsonPointer.call(this, p_2, sch);
    }
    if (typeof (schOrRef === null || schOrRef === undefined ? undefined : schOrRef.schema) !== "object")
      return;
    if (!schOrRef.validate) compileSchema.call(this, schOrRef);
    if (id === (0, resolve_1.normalizeId)(ref)) {
      let { schema } = schOrRef;
      let { schemaId } = this.opts;
      let schId = schema[schemaId];
      if (schId) baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
      return new SchemaEnv({
        schema,
        schemaId,
        root,
        baseId,
      });
    }
    return getJsonPointer.call(this, p_2, schOrRef);
  }
  cjsExports.resolveSchema = resolveSchema;
  let PREVENT_SCOPE_CHANGE = new Set([
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
      let partSchema = schema[(0, util_1.unescapeFragment)(part)];
      if (partSchema === undefined) return;
      schema = partSchema;
      let schId = typeof schema === "object" && schema[this.opts.schemaId];
      if (!PREVENT_SCOPE_CHANGE.has(part) && schId)
        baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
    }
    let env;
    if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
      let $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
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
  }
});
var require_data = initModule((cjsExports, cjsModule) => {
  cjsModule.exports = {
    $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
    description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
    type: "object",
    required: ["$data"],
    properties: {
      $data: {
        type: "string",
        anyOf: [
          {
            format: "relative-json-pointer",
          },
          {
            format: "json-pointer",
          },
        ],
      },
    },
    additionalProperties: false,
  };
});
var require_utils = initModule((cjsExports, cjsModule) => {
  let isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
  let isIPv4 = RegExp.prototype.test.bind(
    /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u,
  );
  function stringArrayToHexStripped(input) {
    let acc = "";
    let code = 0;
    let i = 0;
    for (i = 0; i < input.length; i++) {
      code = input[i].charCodeAt(0);
      if (code === 48) continue;
      if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)))
        return "";
      acc += input[i];
      break;
    }
    for (i += 1; i < input.length; i++) {
      code = input[i].charCodeAt(0);
      if (!((code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102)))
        return "";
      acc += input[i];
    }
    return acc;
  }
  let nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
  function consumeIsZone(buffer) {
    buffer.length = 0;
    return true;
  }
  function consumeHextets(buffer, address, output) {
    if (buffer.length) {
      let hex = stringArrayToHexStripped(buffer);
      if (hex !== "") address.push(hex);
      else {
        output.error = true;
        return false;
      }
      buffer.length = 0;
    }
    return true;
  }
  function getIPV6(input) {
    let tokenCount = 0;
    let output = {
      error: false,
      address: "",
      zone: "",
    };
    let address = [];
    let buffer = [];
    let endipv6Encountered = false;
    let endIpv6 = false;
    let consume = consumeHextets;
    for (let i = 0; i < input.length; i++) {
      let cursor = input[i];
      if (cursor === "[" || cursor === "]") continue;
      if (cursor === ":") {
        if (endipv6Encountered === true) endIpv6 = true;
        if (!consume(buffer, address, output)) break;
        if (++tokenCount > 7) {
          output.error = true;
          break;
        }
        if (i > 0 && input[i - 1] === ":") endipv6Encountered = true;
        address.push(":");
        continue;
      } else if (cursor === "%") {
        if (!consume(buffer, address, output)) break;
        consume = consumeIsZone;
      } else {
        buffer.push(cursor);
        continue;
      }
    }
    if (buffer.length)
      if (consume === consumeIsZone) output.zone = buffer.join("");
      else if (endIpv6) address.push(buffer.join(""));
      else address.push(stringArrayToHexStripped(buffer));
    output.address = address.join("");
    return output;
  }
  function normalizeIPv6(host) {
    if (findToken(host, ":") < 2)
      return {
        host,
        isIPV6: false,
      };
    let ipv6 = getIPV6(host);
    if (!ipv6.error) {
      let { address: newHost, address: escapedHost } = ipv6;
      if (ipv6.zone) {
        newHost += "%" + ipv6.zone;
        escapedHost += "%25" + ipv6.zone;
      }
      return {
        host: newHost,
        isIPV6: true,
        escapedHost,
      };
    } else
      return {
        host,
        isIPV6: false,
      };
  }
  function findToken(str, token) {
    let ind = 0;
    for (let i = 0; i < str.length; i++) if (str[i] === token) ind++;
    return ind;
  }
  function removeDotSegments(path) {
    let input = path;
    let output = [];
    let nextSlash = -1;
    let len = 0;
    while ((len = input.length)) {
      if (len === 1) {
        if (input === ".") break;
        else if (input === "/") {
          output.push("/");
          break;
        } else {
          output.push(input);
          break;
        }
      } else if (len === 2) {
        if (input[0] === ".") {
          if (input[1] === ".") break;
          else if (input[1] === "/") {
            input = input.slice(2);
            continue;
          }
        } else if (input[0] === "/") {
          if (input[1] === "." || input[1] === "/") {
            output.push("/");
            break;
          }
        }
      } else if (len === 3) {
        if (input === "/..") {
          if (output.length !== 0) output.pop();
          output.push("/");
          break;
        }
      }
      if (input[0] === ".") {
        if (input[1] === ".") {
          if (input[2] === "/") {
            input = input.slice(3);
            continue;
          }
        } else if (input[1] === "/") {
          input = input.slice(2);
          continue;
        }
      } else if (input[0] === "/") {
        if (input[1] === ".") {
          if (input[2] === "/") {
            input = input.slice(2);
            continue;
          } else if (input[2] === ".") {
            if (input[3] === "/") {
              input = input.slice(3);
              if (output.length !== 0) output.pop();
              continue;
            }
          }
        }
      }
      if ((nextSlash = input.indexOf("/", 1)) === -1) {
        output.push(input);
        break;
      } else {
        output.push(input.slice(0, nextSlash));
        input = input.slice(nextSlash);
      }
    }
    return output.join("");
  }
  function normalizeComponentEncoding(component, esc) {
    let func = esc !== true ? escape : unescape;
    if (component.scheme !== undefined) component.scheme = func(component.scheme);
    if (component.userinfo !== undefined) component.userinfo = func(component.userinfo);
    if (component.host !== undefined) component.host = func(component.host);
    if (component.path !== undefined) component.path = func(component.path);
    if (component.query !== undefined) component.query = func(component.query);
    if (component.fragment !== undefined) component.fragment = func(component.fragment);
    return component;
  }
  function recomposeAuthority(component) {
    let uriTokens = [];
    if (component.userinfo !== undefined) {
      uriTokens.push(component.userinfo);
      uriTokens.push("@");
    }
    if (component.host !== undefined) {
      let host = unescape(component.host);
      if (!isIPv4(host)) {
        let ipV6res = normalizeIPv6(host);
        if (ipV6res.isIPV6 === true) host = `[${ipV6res.escapedHost}]`;
        else host = component.host;
      }
      uriTokens.push(host);
    }
    if (typeof component.port === "number" || typeof component.port === "string") {
      uriTokens.push(":");
      uriTokens.push(String(component.port));
    }
    return uriTokens.length ? uriTokens.join("") : undefined;
  }
  cjsModule.exports = {
    nonSimpleDomain,
    recomposeAuthority,
    normalizeComponentEncoding,
    removeDotSegments,
    isIPv4,
    isUUID,
    normalizeIPv6,
    stringArrayToHexStripped,
  };
});
var require_schemes = initModule((cjsExports, cjsModule) => {
  let { isUUID } = require_utils();
  let URN_REG = /([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-.:;=@]|%[\da-f]{2})+)/iu;
  let supportedSchemeNames = ["http", "https", "ws", "wss", "urn", "urn:uuid"];
  function isValidSchemeName(name) {
    return supportedSchemeNames.indexOf(name) !== -1;
  }
  function wsIsSecure(wsComponent) {
    if (wsComponent.secure === true) return true;
    else if (wsComponent.secure === false) return false;
    else if (wsComponent.scheme)
      return (
        wsComponent.scheme.length === 3 &&
        (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") &&
        (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") &&
        (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S")
      );
    else return false;
  }
  function httpParse(component) {
    if (!component.host) component.error = component.error || "HTTP URIs must have a host.";
    return component;
  }
  function httpSerialize(component) {
    let secure = String(component.scheme).toLowerCase() === "https";
    if (component.port === (secure ? 443 : 80) || component.port === "") component.port = undefined;
    if (!component.path) component.path = "/";
    return component;
  }
  function wsParse(wsComponent) {
    wsComponent.secure = wsIsSecure(wsComponent);
    wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
    wsComponent.path = undefined;
    wsComponent.query = undefined;
    return wsComponent;
  }
  function wsSerialize(wsComponent) {
    if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "")
      wsComponent.port = undefined;
    if (typeof wsComponent.secure === "boolean") {
      wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
      wsComponent.secure = undefined;
    }
    if (wsComponent.resourceName) {
      let [path, query] = wsComponent.resourceName.split("?");
      wsComponent.path = path && path !== "/" ? path : undefined;
      wsComponent.query = query;
      wsComponent.resourceName = undefined;
    }
    wsComponent.fragment = undefined;
    return wsComponent;
  }
  function urnParse(urnComponent, options) {
    if (!urnComponent.path) {
      urnComponent.error = "URN can not be parsed";
      return urnComponent;
    }
    let matches = urnComponent.path.match(URN_REG);
    if (matches) {
      let scheme = options.scheme || urnComponent.scheme || "urn";
      urnComponent.nid = matches[1].toLowerCase();
      urnComponent.nss = matches[2];
      let schemeHandler = getSchemeHandler(`${scheme}:${options.nid || urnComponent.nid}`);
      urnComponent.path = undefined;
      if (schemeHandler) urnComponent = schemeHandler.parse(urnComponent, options);
    } else urnComponent.error = urnComponent.error || "URN can not be parsed.";
    return urnComponent;
  }
  function urnSerialize(urnComponent, options) {
    if (urnComponent.nid === undefined) throw Error("URN without nid cannot be serialized");
    let scheme = options.scheme || urnComponent.scheme || "urn";
    let nid = urnComponent.nid.toLowerCase();
    let schemeHandler = getSchemeHandler(`${scheme}:${options.nid || nid}`);
    if (schemeHandler) urnComponent = schemeHandler.serialize(urnComponent, options);
    let uriComponent = urnComponent;
    let nss = urnComponent.nss;
    uriComponent.path = `${nid || options.nid}:${nss}`;
    options.skipEscape = true;
    return uriComponent;
  }
  function urnuuidParse(urnComponent, options) {
    let uuidComponent = urnComponent;
    uuidComponent.uuid = uuidComponent.nss;
    uuidComponent.nss = undefined;
    if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid)))
      uuidComponent.error = uuidComponent.error || "UUID is not valid.";
    return uuidComponent;
  }
  function urnuuidSerialize(uuidComponent) {
    let urnComponent = uuidComponent;
    urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
    return urnComponent;
  }
  let httpComponent = {
    scheme: "http",
    domainHost: true,
    parse: httpParse,
    serialize: httpSerialize,
  };
  let https = {
    scheme: "https",
    domainHost: httpComponent.domainHost,
    parse: httpParse,
    serialize: httpSerialize,
  };
  let ws = {
    scheme: "ws",
    domainHost: true,
    parse: wsParse,
    serialize: wsSerialize,
  };
  let wss = {
    scheme: "wss",
    domainHost: ws.domainHost,
    parse: ws.parse,
    serialize: ws.serialize,
  };
  let SCHEMES = {
    http: httpComponent,
    https,
    ws,
    wss,
    urn: {
      scheme: "urn",
      parse: urnParse,
      serialize: urnSerialize,
      skipNormalize: true,
    },
    "urn:uuid": {
      scheme: "urn:uuid",
      parse: urnuuidParse,
      serialize: urnuuidSerialize,
      skipNormalize: true,
    },
  };
  Object.setPrototypeOf(SCHEMES, null);
  function getSchemeHandler(scheme) {
    return (scheme && (SCHEMES[scheme] || SCHEMES[scheme.toLowerCase()])) || undefined;
  }
  cjsModule.exports = {
    wsIsSecure,
    SCHEMES,
    isValidSchemeName,
    getSchemeHandler,
  };
});
var require_fast_uri = initModule((cjsExports, cjsModule) => {
  let {
    normalizeIPv6,
    removeDotSegments,
    recomposeAuthority,
    normalizeComponentEncoding,
    isIPv4,
    nonSimpleDomain,
  } = require_utils();
  let { SCHEMES, getSchemeHandler } = require_schemes();
  function normalize(uri, options) {
    if (typeof uri === "string") uri = serialize(parse(uri, options), options);
    else if (typeof uri === "object") uri = parse(serialize(uri, options), options);
    return uri;
  }
  function resolve(baseURI, relativeURI, options) {
    let schemelessOptions = options
      ? Object.assign(
          {
            scheme: "null",
          },
          options,
        )
      : {
          scheme: "null",
        };
    let resolved = resolveComponent(
      parse(baseURI, schemelessOptions),
      parse(relativeURI, schemelessOptions),
      schemelessOptions,
      true,
    );
    schemelessOptions.skipEscape = true;
    return serialize(resolved, schemelessOptions);
  }
  function resolveComponent(base, relative, options, skipNormalization) {
    let target = {};
    if (!skipNormalization) {
      base = parse(serialize(base, options), options);
      relative = parse(serialize(relative, options), options);
    }
    options = options || {};
    if (!options.tolerant && relative.scheme) {
      target.scheme = relative.scheme;
      target.userinfo = relative.userinfo;
      target.host = relative.host;
      target.port = relative.port;
      target.path = removeDotSegments(relative.path || "");
      target.query = relative.query;
    } else {
      if (relative.userinfo !== undefined || relative.host !== undefined || relative.port !== undefined) {
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (!relative.path) {
          target.path = base.path;
          if (relative.query !== undefined) target.query = relative.query;
          else target.query = base.query;
        } else {
          if (relative.path[0] === "/") target.path = removeDotSegments(relative.path);
          else {
            if (
              (base.userinfo !== undefined || base.host !== undefined || base.port !== undefined) &&
              !base.path
            )
              target.path = "/" + relative.path;
            else if (!base.path) target.path = relative.path;
            else target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
            target.path = removeDotSegments(target.path);
          }
          target.query = relative.query;
        }
        target.userinfo = base.userinfo;
        target.host = base.host;
        target.port = base.port;
      }
      target.scheme = base.scheme;
    }
    target.fragment = relative.fragment;
    return target;
  }
  function equal(uriA, uriB, options) {
    if (typeof uriA === "string") {
      uriA = unescape(uriA);
      uriA = serialize(normalizeComponentEncoding(parse(uriA, options), true), {
        ...options,
        skipEscape: true,
      });
    } else if (typeof uriA === "object")
      uriA = serialize(normalizeComponentEncoding(uriA, true), {
        ...options,
        skipEscape: true,
      });
    if (typeof uriB === "string") {
      uriB = unescape(uriB);
      uriB = serialize(normalizeComponentEncoding(parse(uriB, options), true), {
        ...options,
        skipEscape: true,
      });
    } else if (typeof uriB === "object")
      uriB = serialize(normalizeComponentEncoding(uriB, true), {
        ...options,
        skipEscape: true,
      });
    return uriA.toLowerCase() === uriB.toLowerCase();
  }
  function serialize(cmpts, opts) {
    let component = {
      host: cmpts.host,
      scheme: cmpts.scheme,
      userinfo: cmpts.userinfo,
      port: cmpts.port,
      path: cmpts.path,
      query: cmpts.query,
      nid: cmpts.nid,
      nss: cmpts.nss,
      uuid: cmpts.uuid,
      fragment: cmpts.fragment,
      reference: cmpts.reference,
      resourceName: cmpts.resourceName,
      secure: cmpts.secure,
      error: "",
    };
    let options = Object.assign({}, opts);
    let uriTokens = [];
    let schemeHandler = getSchemeHandler(options.scheme || component.scheme);
    if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
    if (component.path !== undefined)
      if (!options.skipEscape) {
        component.path = escape(component.path);
        if (component.scheme !== undefined) component.path = component.path.split("%3A").join(":");
      } else component.path = unescape(component.path);
    if (options.reference !== "suffix" && component.scheme) uriTokens.push(component.scheme, ":");
    let authority = recomposeAuthority(component);
    if (authority !== undefined) {
      if (options.reference !== "suffix") uriTokens.push("//");
      uriTokens.push(authority);
      if (component.path && component.path[0] !== "/") uriTokens.push("/");
    }
    if (component.path !== undefined) {
      let s = component.path;
      if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) s = removeDotSegments(s);
      if (authority === undefined && s[0] === "/" && s[1] === "/") s = "/%2F" + s.slice(2);
      uriTokens.push(s);
    }
    if (component.query !== undefined) uriTokens.push("?", component.query);
    if (component.fragment !== undefined) uriTokens.push("#", component.fragment);
    return uriTokens.join("");
  }
  let URI_PARSE =
    /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
  function parse(uri, opts) {
    let options = Object.assign({}, opts);
    let parsed = {
      scheme: undefined,
      userinfo: undefined,
      host: "",
      port: undefined,
      path: "",
      query: undefined,
      fragment: undefined,
    };
    let isIP = false;
    if (options.reference === "suffix")
      if (options.scheme) uri = options.scheme + ":" + uri;
      else uri = "//" + uri;
    let matches = uri.match(URI_PARSE);
    if (matches) {
      parsed.scheme = matches[1];
      parsed.userinfo = matches[3];
      parsed.host = matches[4];
      parsed.port = parseInt(matches[5], 10);
      parsed.path = matches[6] || "";
      parsed.query = matches[7];
      parsed.fragment = matches[8];
      if (isNaN(parsed.port)) parsed.port = matches[5];
      if (parsed.host)
        if (isIPv4(parsed.host) === false) {
          let ipv6result = normalizeIPv6(parsed.host);
          parsed.host = ipv6result.host.toLowerCase();
          isIP = ipv6result.isIPV6;
        } else isIP = true;
      if (
        parsed.scheme === undefined &&
        parsed.userinfo === undefined &&
        parsed.host === undefined &&
        parsed.port === undefined &&
        parsed.query === undefined &&
        !parsed.path
      )
        parsed.reference = "same-document";
      else if (parsed.scheme === undefined) parsed.reference = "relative";
      else if (parsed.fragment === undefined) parsed.reference = "absolute";
      else parsed.reference = "uri";
      if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference)
        parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
      let schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
      if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport)) {
        if (
          parsed.host &&
          (options.domainHost || (schemeHandler && schemeHandler.domainHost)) &&
          isIP === false &&
          nonSimpleDomain(parsed.host)
        )
          try {
            parsed.host = URL.domainToASCII(parsed.host.toLowerCase());
          } catch (e) {
            parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
          }
      }
      if (!schemeHandler || (schemeHandler && !schemeHandler.skipNormalize)) {
        if (uri.indexOf("%") !== -1) {
          if (parsed.scheme !== undefined) parsed.scheme = unescape(parsed.scheme);
          if (parsed.host !== undefined) parsed.host = unescape(parsed.host);
        }
        if (parsed.path) parsed.path = escape(unescape(parsed.path));
        if (parsed.fragment) parsed.fragment = encodeURI(decodeURIComponent(parsed.fragment));
      }
      if (schemeHandler && schemeHandler.parse) schemeHandler.parse(parsed, options);
    } else parsed.error = parsed.error || "URI can not be parsed.";
    return parsed;
  }
  let fastUri = {
    SCHEMES,
    normalize,
    resolve,
    resolveComponent,
    equal,
    serialize,
    parse,
  };
  cjsModule.exports = fastUri;
  cjsModule.exports.default = fastUri;
  cjsModule.exports.fastUri = fastUri;
});
var require_uri = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  let uri = require_fast_uri();
  uri.code = 'require("ajv/dist/runtime/uri").default';
  cjsExports.default = uri;
});
var require_core = initModule((cjsExports) => {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CodeGen =
    cjsExports.Name =
    cjsExports.nil =
    cjsExports.stringify =
    cjsExports.str =
    cjsExports._ =
    cjsExports.KeywordCxt =
      undefined;
  var validate_1 = require_validate();
  Object.defineProperty(cjsExports, "KeywordCxt", {
    enumerable: true,
    get: function () {
      return validate_1.KeywordCxt;
    },
  });
  var codegen_1 = require_codegen();
  Object.defineProperty(cjsExports, "_", {
    enumerable: true,
    get: function () {
      return codegen_1._;
    },
  });
  Object.defineProperty(cjsExports, "str", {
    enumerable: true,
    get: function () {
      return codegen_1.str;
    },
  });
  Object.defineProperty(cjsExports, "stringify", {
    enumerable: true,
    get: function () {
      return codegen_1.stringify;
    },
  });
  Object.defineProperty(cjsExports, "nil", {
    enumerable: true,
    get: function () {
      return codegen_1.nil;
    },
  });
  Object.defineProperty(cjsExports, "Name", {
    enumerable: true,
    get: function () {
      return codegen_1.Name;
    },
  });
  Object.defineProperty(cjsExports, "CodeGen", {
    enumerable: true,
    get: function () {
      return codegen_1.CodeGen;
    },
  });
  let validation_error_1 = require_validation_error();
  let ref_error_1 = require_ref_error();
  let rules_1 = require_rules();
  let compile_1 = require_compile();
  let codegen_2 = require_codegen();
  let resolve_1 = require_resolve();
  let dataType_1 = require_dataType();
  let util_1 = require_util();
  let $dataRefSchema = require_data();
  let uri_1 = require_uri();
  let defaultRegExp = (str, flags) => new RegExp(str, flags);
  defaultRegExp.code = "new RegExp";
  let META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
  let EXT_SCOPE_NAMES = new Set([
    "validate",
    "serialize",
    "parse",
    "wrapper",
    "root",
    "schema",
    "keyword",
    "pattern",
    "formats",
    "validate$data",
    "func",
    "obj",
    "Error",
  ]);
  let removedOptions = {
    errorDataPath: "",
    format: "`validateFormats: false` can be used instead.",
    nullable: '"nullable" keyword is supported by default.',
    jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
    extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
    missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
    processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
    sourceCode: "Use option `code: {source: true}`",
    strictDefaults: "It is default now, see option `strict`.",
    strictKeywords: "It is default now, see option `strict`.",
    uniqueItems: '"uniqueItems" keyword is always validated.',
    unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
    cache: "Map is used as cache, schema object as key.",
    serialize: "Map is used as cache, schema object as key.",
    ajvErrors: "It is default now.",
  };
  let deprecatedOptions = {
    ignoreKeywordsWithRef: "",
    jsPropertySyntax: "",
    unicode: '"minLength"/"maxLength" account for unicode characters by default.',
  };
  let MAX_EXPRESSION = 200;
  function requiredOptions(o) {
    var _a;
    var _b;
    var _c;
    var _d;
    var _e;
    var _f;
    var _g;
    var _h;
    var _j;
    var _k;
    var _l;
    var _m;
    var _o;
    var _p;
    var _q;
    var _r;
    var _s;
    var _t;
    var _u;
    var _v;
    var _w;
    var _x;
    var _y;
    var _z;
    var _0;
    let s = o.strict;
    let _optz = (_a = o.code) === null || _a === undefined ? undefined : _a.optimize;
    let optimize = _optz === true || _optz === undefined ? 1 : _optz || 0;
    let regExp =
      (_c = (_b = o.code) === null || _b === undefined ? undefined : _b.regExp) !== null && _c !== undefined
        ? _c
        : defaultRegExp;
    let uriResolver = (_d = o.uriResolver) !== null && _d !== undefined ? _d : uri_1.default;
    return {
      strictSchema:
        (_f = (_e = o.strictSchema) !== null && _e !== undefined ? _e : s) !== null && _f !== undefined
          ? _f
          : true,
      strictNumbers:
        (_h = (_g = o.strictNumbers) !== null && _g !== undefined ? _g : s) !== null && _h !== undefined
          ? _h
          : true,
      strictTypes:
        (_k = (_j = o.strictTypes) !== null && _j !== undefined ? _j : s) !== null && _k !== undefined
          ? _k
          : "log",
      strictTuples:
        (_m = (_l = o.strictTuples) !== null && _l !== undefined ? _l : s) !== null && _m !== undefined
          ? _m
          : "log",
      strictRequired:
        (_p = (_o = o.strictRequired) !== null && _o !== undefined ? _o : s) !== null && _p !== undefined
          ? _p
          : false,
      code: o.code
        ? {
            ...o.code,
            optimize,
            regExp,
          }
        : {
            optimize,
            regExp,
          },
      loopRequired: (_q = o.loopRequired) !== null && _q !== undefined ? _q : MAX_EXPRESSION,
      loopEnum: (_r = o.loopEnum) !== null && _r !== undefined ? _r : MAX_EXPRESSION,
      meta: (_s = o.meta) !== null && _s !== undefined ? _s : true,
      messages: (_t = o.messages) !== null && _t !== undefined ? _t : true,
      inlineRefs: (_u = o.inlineRefs) !== null && _u !== undefined ? _u : true,
      schemaId: (_v = o.schemaId) !== null && _v !== undefined ? _v : "$id",
      addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== undefined ? _w : true,
      validateSchema: (_x = o.validateSchema) !== null && _x !== undefined ? _x : true,
      validateFormats: (_y = o.validateFormats) !== null && _y !== undefined ? _y : true,
      unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== undefined ? _z : true,
      int32range: (_0 = o.int32range) !== null && _0 !== undefined ? _0 : true,
      uriResolver,
    };
  }
  var Ajv = class {
    constructor(opts = {}) {
      this.schemas = {};
      this.refs = {};
      this.formats = {};
      this._compilations = new Set();
      this._loading = {};
      this._cache = new Map();
      opts = this.opts = {
        ...opts,
        ...requiredOptions(opts),
      };
      let { es5, lines } = this.opts.code;
      this.scope = new codegen_2.ValueScope({
        scope: {},
        prefixes: EXT_SCOPE_NAMES,
        es5,
        lines,
      });
      this.logger = getLogger(opts.logger);
      let formatOpt = opts.validateFormats;
      opts.validateFormats = false;
      this.RULES = (0, rules_1.getRules)();
      checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
      checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
      this._metaOpts = getMetaSchemaOptions.call(this);
      if (opts.formats) addInitialFormats.call(this);
      this._addVocabularies();
      this._addDefaultMetaSchema();
      if (opts.keywords) addInitialKeywords.call(this, opts.keywords);
      if (typeof opts.meta == "object") this.addMetaSchema(opts.meta);
      addInitialSchemas.call(this);
      opts.validateFormats = formatOpt;
    }
    _addVocabularies() {
      this.addKeyword("$async");
    }
    _addDefaultMetaSchema() {
      let { $data, meta, schemaId } = this.opts;
      let _dataRefSchema = $dataRefSchema;
      if (schemaId === "id") {
        _dataRefSchema = {
          ...$dataRefSchema,
        };
        _dataRefSchema.id = _dataRefSchema.$id;
        delete _dataRefSchema.$id;
      }
      if (meta && $data) this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
    }
    defaultMeta() {
      let { meta, schemaId } = this.opts;
      return (this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : undefined);
    }
    validate(schemaKeyRef, data) {
      let v;
      if (typeof schemaKeyRef == "string") {
        v = this.getSchema(schemaKeyRef);
        if (!v) throw Error(`no schema with key or ref "${schemaKeyRef}"`);
      } else v = this.compile(schemaKeyRef);
      let valid = v(data);
      if (!("$async" in v)) this.errors = v.errors;
      return valid;
    }
    compile(schema, _meta) {
      let sch = this._addSchema(schema, _meta);
      return sch.validate || this._compileSchemaEnv(sch);
    }
    compileAsync(schema, meta) {
      if (typeof this.opts.loadSchema != "function") throw Error("options.loadSchema should be a function");
      let { loadSchema } = this.opts;
      return runCompileAsync.call(this, schema, meta);
      async function runCompileAsync(_schema, _meta) {
        await loadMetaSchema.call(this, _schema.$schema);
        let sch = this._addSchema(_schema, _meta);
        return sch.validate || _compileAsync.call(this, sch);
      }
      async function loadMetaSchema($ref) {
        if ($ref && !this.getSchema($ref))
          await runCompileAsync.call(
            this,
            {
              $ref,
            },
            true,
          );
      }
      async function _compileAsync(sch) {
        try {
          return this._compileSchemaEnv(sch);
        } catch (e) {
          if (!(e instanceof ref_error_1.default)) throw e;
          checkLoaded.call(this, e);
          await loadMissingSchema.call(this, e.missingSchema);
          return _compileAsync.call(this, sch);
        }
      }
      function checkLoaded({ missingSchema: ref, missingRef }) {
        if (this.refs[ref]) throw Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
      }
      async function loadMissingSchema(ref) {
        let _schema = await _loadSchema.call(this, ref);
        if (!this.refs[ref]) await loadMetaSchema.call(this, _schema.$schema);
        if (!this.refs[ref]) this.addSchema(_schema, ref, meta);
      }
      async function _loadSchema(ref) {
        let p = this._loading[ref];
        if (p) return p;
        try {
          return await (this._loading[ref] = loadSchema(ref));
        } finally {
          delete this._loading[ref];
        }
      }
    }
    addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
      if (Array.isArray(schema)) {
        for (let sch of schema) this.addSchema(sch, undefined, _meta, _validateSchema);
        return this;
      }
      let id;
      if (typeof schema === "object") {
        let { schemaId } = this.opts;
        id = schema[schemaId];
        if (id !== undefined && typeof id != "string") throw Error(`schema ${schemaId} must be string`);
      }
      key = (0, resolve_1.normalizeId)(key || id);
      this._checkUnique(key);
      this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
      return this;
    }
    addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
      this.addSchema(schema, key, true, _validateSchema);
      return this;
    }
    validateSchema(schema, throwOrLogError) {
      if (typeof schema == "boolean") return true;
      let $schema;
      $schema = schema.$schema;
      if ($schema !== undefined && typeof $schema != "string") throw Error("$schema must be a string");
      $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
      if (!$schema) {
        this.logger.warn("meta-schema not available");
        this.errors = null;
        return true;
      }
      let valid = this.validate($schema, schema);
      if (!valid && throwOrLogError) {
        let message = "schema is invalid: " + this.errorsText();
        if (this.opts.validateSchema === "log") this.logger.error(message);
        else throw Error(message);
      }
      return valid;
    }
    getSchema(keyRef) {
      let sch;
      while (typeof (sch = getSchEnv.call(this, keyRef)) == "string") keyRef = sch;
      if (sch === undefined) {
        let { schemaId } = this.opts;
        let root = new compile_1.SchemaEnv({
          schema: {},
          schemaId,
        });
        sch = compile_1.resolveSchema.call(this, root, keyRef);
        if (!sch) return;
        this.refs[keyRef] = sch;
      }
      return sch.validate || this._compileSchemaEnv(sch);
    }
    removeSchema(schemaKeyRef) {
      if (schemaKeyRef instanceof RegExp) {
        this._removeAllSchemas(this.schemas, schemaKeyRef);
        this._removeAllSchemas(this.refs, schemaKeyRef);
        return this;
      }
      switch (typeof schemaKeyRef) {
        case "undefined":
          this._removeAllSchemas(this.schemas);
          this._removeAllSchemas(this.refs);
          this._cache.clear();
          return this;
        case "string": {
          let sch = getSchEnv.call(this, schemaKeyRef);
          if (typeof sch == "object") this._cache.delete(sch.schema);
          delete this.schemas[schemaKeyRef];
          delete this.refs[schemaKeyRef];
          return this;
        }
        case "object": {
          let cacheKey = schemaKeyRef;
          this._cache.delete(cacheKey);
          let id = schemaKeyRef[this.opts.schemaId];
          if (id) {
            id = (0, resolve_1.normalizeId)(id);
            delete this.schemas[id];
            delete this.refs[id];
          }
          return this;
        }
        default:
          throw Error("ajv.removeSchema: invalid parameter");
      }
    }
    addVocabulary(definitions) {
      for (let def of definitions) this.addKeyword(def);
      return this;
    }
    addKeyword(kwdOrDef, def) {
      let keyword;
      if (typeof kwdOrDef == "string") {
        keyword = kwdOrDef;
        if (typeof def == "object") {
          this.logger.warn("these parameters are deprecated, see docs for addKeyword");
          def.keyword = keyword;
        }
      } else if (typeof kwdOrDef == "object" && def === undefined) {
        def = kwdOrDef;
        keyword = def.keyword;
        if (Array.isArray(keyword) && !keyword.length)
          throw Error("addKeywords: keyword must be string or non-empty array");
      } else throw Error("invalid addKeywords parameters");
      checkKeyword.call(this, keyword, def);
      if (!def) {
        (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
        return this;
      }
      keywordMetaschema.call(this, def);
      let definition = {
        ...def,
        type: (0, dataType_1.getJSONTypes)(def.type),
        schemaType: (0, dataType_1.getJSONTypes)(def.schemaType),
      };
      (0, util_1.eachItem)(
        keyword,
        definition.type.length === 0
          ? (k) => addRule.call(this, k, definition)
          : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)),
      );
      return this;
    }
    getKeyword(keyword) {
      let rule = this.RULES.all[keyword];
      return typeof rule == "object" ? rule.definition : !!rule;
    }
    removeKeyword(keyword) {
      let { RULES } = this;
      delete RULES.keywords[keyword];
      delete RULES.all[keyword];
      for (let group of RULES.rules) {
        let i = group.rules.findIndex((rule) => rule.keyword === keyword);
        if (i >= 0) group.rules.splice(i, 1);
      }
      return this;
    }
    addFormat(name, format) {
      if (typeof format == "string") format = new RegExp(format);
      this.formats[name] = format;
      return this;
    }
    errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
      if (!errors || errors.length === 0) return "No errors";
      return errors
        .map((e) => `${dataVar}${e.instancePath} ${e.message}`)
        .reduce((text, msg) => text + separator + msg);
    }
    $dataMetaSchema(metaSchema, keywordsJsonPointers) {
      let rules = this.RULES.all;
      metaSchema = JSON.parse(JSON.stringify(metaSchema));
      for (let jsonPointer of keywordsJsonPointers) {
        let segments = jsonPointer.split("/").slice(1);
        let keywords = metaSchema;
        for (let seg of segments) keywords = keywords[seg];
        for (let key in rules) {
          let rule = rules[key];
          if (typeof rule != "object") continue;
          let { $data } = rule.definition;
          let schema = keywords[key];
          if ($data && schema) keywords[key] = schemaOrData(schema);
        }
      }
      return metaSchema;
    }
    _removeAllSchemas(schemas, regex) {
      for (let keyRef in schemas) {
        let sch = schemas[keyRef];
        if (!regex || regex.test(keyRef)) {
          if (typeof sch == "string") delete schemas[keyRef];
          else if (sch && !sch.meta) {
            this._cache.delete(sch.schema);
            delete schemas[keyRef];
          }
        }
      }
    }
    _addSchema(
      schema,
      meta,
      baseId,
      validateSchema = this.opts.validateSchema,
      addSchema = this.opts.addUsedSchema,
    ) {
      let id;
      let { schemaId } = this.opts;
      if (typeof schema == "object") id = schema[schemaId];
      else if (this.opts.jtd) throw Error("schema must be object");
      else if (typeof schema != "boolean") throw Error("schema must be object or boolean");
      let sch = this._cache.get(schema);
      if (sch !== undefined) return sch;
      baseId = (0, resolve_1.normalizeId)(id || baseId);
      let localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
      sch = new compile_1.SchemaEnv({
        schema,
        schemaId,
        meta,
        baseId,
        localRefs,
      });
      this._cache.set(sch.schema, sch);
      if (addSchema && !baseId.startsWith("#")) {
        if (baseId) this._checkUnique(baseId);
        this.refs[baseId] = sch;
      }
      if (validateSchema) this.validateSchema(schema, true);
      return sch;
    }
    _checkUnique(id) {
      if (this.schemas[id] || this.refs[id]) throw Error(`schema with key or id "${id}" already exists`);
    }
    _compileSchemaEnv(sch) {
      if (sch.meta) this._compileMetaSchema(sch);
      else compile_1.compileSchema.call(this, sch);
      if (!sch.validate) throw Error("ajv implementation error");
      return sch.validate;
    }
    _compileMetaSchema(sch) {
      let currentOpts = this.opts;
      this.opts = this._metaOpts;
      try {
        compile_1.compileSchema.call(this, sch);
      } finally {
        this.opts = currentOpts;
      }
    }
  };
  Ajv.ValidationError = validation_error_1.default;
  Ajv.MissingRefError = ref_error_1.default;
  cjsExports.default = Ajv;
  function checkOptions(checkOpts, options, msg, log = "error") {
    for (let key in checkOpts) {
      let opt = key;
      if (opt in options) this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
    }
  }
  function getSchEnv(keyRef) {
    keyRef = (0, resolve_1.normalizeId)(keyRef);
    return this.schemas[keyRef] || this.refs[keyRef];
  }
  function addInitialSchemas() {
    let optsSchemas = this.opts.schemas;
    if (!optsSchemas) return;
    if (Array.isArray(optsSchemas)) this.addSchema(optsSchemas);
    else for (let key in optsSchemas) this.addSchema(optsSchemas[key], key);
  }
  function addInitialFormats() {
    for (let name in this.opts.formats) {
      let format = this.opts.formats[name];
      if (format) this.addFormat(name, format);
    }
  }
  function addInitialKeywords(defs) {
    if (Array.isArray(defs)) {
      this.addVocabulary(defs);
      return;
    }
    this.logger.warn("keywords option as map is deprecated, pass array");
    for (let keyword in defs) {
      let def = defs[keyword];
      if (!def.keyword) def.keyword = keyword;
      this.addKeyword(def);
    }
  }
  function getMetaSchemaOptions() {
    let metaOpts = {
      ...this.opts,
    };
    for (let opt of META_IGNORE_OPTIONS) delete metaOpts[opt];
    return metaOpts;
  }
  let noLogs = {
    log() {},
    warn() {},
    error() {},
  };
  function getLogger(logger) {
    if (logger === false) return noLogs;
    if (logger === undefined) return console;
    if (logger.log && logger.warn && logger.error) return logger;
    throw Error("logger must implement log, warn and error methods");
  }
  let KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
  function checkKeyword(keyword, def) {
    let { RULES } = this;
    (0, util_1.eachItem)(keyword, (kwd) => {
      if (RULES.keywords[kwd]) throw Error(`Keyword ${kwd} is already defined`);
      if (!KEYWORD_NAME.test(kwd)) throw Error(`Keyword ${kwd} has invalid name`);
    });
    if (!def) return;
    if (def.$data && !("code" in def || "validate" in def))
      throw Error('$data keyword must have "code" or "validate" function');
  }
  function addRule(keyword, definition, dataType) {
    var _a;
    let post = definition === null || definition === undefined ? undefined : definition.post;
    if (dataType && post) throw Error('keyword with "post" flag cannot have "type"');
    let { RULES } = this;
    let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
    if (!ruleGroup) {
      ruleGroup = {
        type: dataType,
        rules: [],
      };
      RULES.rules.push(ruleGroup);
    }
    RULES.keywords[keyword] = true;
    if (!definition) return;
    let rule = {
      keyword,
      definition: {
        ...definition,
        type: (0, dataType_1.getJSONTypes)(definition.type),
        schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType),
      },
    };
    if (definition.before) addBeforeRule.call(this, ruleGroup, rule, definition.before);
    else ruleGroup.rules.push(rule);
    RULES.all[keyword] = rule;
    if (!((_a = definition.implements) === null || _a === undefined))
      _a.forEach((kwd) => this.addKeyword(kwd));
  }
  function addBeforeRule(ruleGroup, rule, before) {
    let i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
    if (i >= 0) ruleGroup.rules.splice(i, 0, rule);
    else {
      ruleGroup.rules.push(rule);
      this.logger.warn(`rule ${before} is not defined`);
    }
  }
  function keywordMetaschema(def) {
    let { metaSchema } = def;
    if (metaSchema === undefined) return;
    if (def.$data && this.opts.$data) metaSchema = schemaOrData(metaSchema);
    def.validateSchema = this.compile(metaSchema, true);
  }
  let $dataRef = {
    $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
  };
  function schemaOrData(schema) {
    return {
      anyOf: [schema, $dataRef],
    };
  }
});
export {
  require_core_2,
  require_ref_error,
  require_code_2,
  require_codegen,
  require_names,
  require_compile,
  require_util,
  require_fast_deep_equal,
  require_dataType,
  require_validate,
  require_core,
  require_validation_error,
};
