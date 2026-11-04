/**
 * zod/v4/core/compile.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core } from "./core.cjs";
import { require_doc } from "./doc.cjs";
import { require_memoizer } from "./memoizer.cjs";
import { require_regexes } from "./regexes.cjs";
import { require_schemas } from "./schemas.cjs";
import { require_util } from "./util.cjs";

//@ chunk-1ny7cxrt.js:509437-541070 cjs-fingerprint
var require_compile = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ZodCompileUnsupportedError = cjsExports.ZodCompileAsyncError = cjsExports.INVALID = undefined;
  cjsExports.compile = compile;
  cjsExports.withParser = withParser;
  cjsExports.compileFn = compileFn;
  var core_js_1 = require_core();
  var doc_js_1 = require_doc();
  var memoizer_js_1 = require_memoizer();
  var regexes = __importStar(require_regexes());
  var schemas_js_1 = require_schemas();
  var util = __importStar(require_util());
  cjsExports.INVALID = Symbol.for("zod.compile.invalid");
  var FALLBACK_FLAG = Symbol.for("zod.compile.fallback");
  class ZodCompileAsyncError extends Error {
    constructor(message = "z.compile does not support async refinements, transforms, or checks") {
      super(message);
      this.name = "ZodCompileAsyncError";
    }
  }
  cjsExports.ZodCompileAsyncError = ZodCompileAsyncError;
  class ZodCompileUnsupportedError extends Error {
    constructor(feature, islandable = true) {
      super(`z.compile does not support ${feature}; this schema must use the runtime parser`);
      this.name = "ZodCompileUnsupportedError";
      this.islandable = islandable;
    }
  }
  cjsExports.ZodCompileUnsupportedError = ZodCompileUnsupportedError;
  function compileValidator(schema, parser) {
    try {
      return compileFn(schema, {
        assertOnly: true,
      });
    } catch {
      return parser;
    }
  }
  function compile(schema, options) {
    try {
      let parser = compileFn(schema);
      let clone = withParser(schema, parser);
      clone._zod.bag.validator = compileValidator(schema, parser);
      return clone;
    } catch (err) {
      if (options?.strict) throw err;
      return schema;
    }
  }
  function withParser(schema, parser) {
    if (memoizer_js_1.isRecursiveSchema(schema))
      throw new ZodCompileUnsupportedError("a schema whose subtree contains a reference cycle");
    let clone = util.clone(schema);
    let liveRun = schema._zod.run;
    let originalRun = liveRun.__originalRun ?? liveRun;
    let wrapped = (payload, ctx) => {
      if (ctx?.async || ctx?.direction === "backward" || ctx?.skipChecks || ctx?.[FALLBACK_FLAG])
        return originalRun(payload, ctx);
      if (ctx && memoizer_js_1.isBackEdge(ctx, payload.value)) return originalRun(payload, ctx);
      let out = parser(payload.value);
      if (out !== cjsExports.INVALID) {
        payload.value = out;
        return payload;
      }
      if (ctx) ctx[FALLBACK_FLAG] = true;
      return originalRun(payload, ctx);
    };
    wrapped.__originalRun = originalRun;
    clone._zod.bag.fallbackRun = originalRun;
    clone._zod.bag.validator = parser;
    clone._zod.run = wrapped;
    if (!liveRun.__originalRun) installCompiledUserMethods(clone, schema, parser);
    return clone;
  }
  function installCompiledUserMethods(target, source, parser) {
    let targetAny = target;
    let sourceAny = source;
    if (typeof sourceAny.safeParse === "function") {
      let originalSafeParse = sourceAny.safeParse;
      targetAny.safeParse = (data, params) => {
        let out = parser(data);
        if (out !== cjsExports.INVALID)
          return {
            success: true,
            data: out,
          };
        return originalSafeParse(data, params);
      };
    }
    if (typeof sourceAny.parse === "function") {
      let originalParse = sourceAny.parse;
      targetAny.parse = (data, params) => {
        let out = parser(data);
        if (out !== cjsExports.INVALID) return out;
        return originalParse(data, params);
      };
    }
  }
  function compileFn(schema, options) {
    let recursive = true;
    try {
      recursive = memoizer_js_1.isRecursiveSchema(schema);
    } catch {}
    if (recursive) throw new ZodCompileUnsupportedError("a schema whose subtree contains a reference cycle");
    let ctx = {
      constants: new Map(),
      constantCounter: 0,
      varCounter: 0,
      definite: true,
    };
    let doc = new doc_js_1.Doc(["input"]);
    let outputAccessor = generateCheck(doc, ctx, schema, "input", !options?.assertOnly);
    doc.write(outputAccessor === null ? "return true;" : `return ${outputAccessor};`);
    let constantNames = ["INVALID", ...ctx.constants.keys()];
    let constantValues = [cjsExports.INVALID, ...ctx.constants.values()];
    let code = doc.content.join(`
`);
    let fullCode = options?.debug
      ? constantNames.length > 0
        ? `// Constants: ${constantNames.join(", ")}
${code}`
        : code
      : "";
    let F = Function;
    let factorySource = `return (input) => {
${code}
}`;
    let fn;
    try {
      fn = new F(...constantNames, factorySource)(...constantValues);
    } catch (err) {
      throw new ZodCompileUnsupportedError(`this schema (generated code failed to evaluate: ${err.message})`);
    }
    if (options?.debug) fn.code = fullCode;
    fn.definite = ctx.definite;
    return fn;
  }
  function addConstant(ctx, value) {
    for (let [name, v] of ctx.constants) if (v === value) return name;
    let name = `c${ctx.constantCounter++}`;
    ctx.constants.set(name, value);
    return name;
  }
  function addUserConstant(ctx, fn) {
    ctx.definite = false;
    return addConstant(ctx, fn);
  }
  function newVar(ctx) {
    return `v${ctx.varCounter++}`;
  }
  function runtimeRun(schema, value) {
    let result = schema._zod.run(
      {
        value,
        issues: [],
      },
      {},
    );
    if (result && typeof result.then === "function") return cjsExports.INVALID;
    let r = result;
    return r.issues.length === 0 ? r.value : cjsExports.INVALID;
  }
  function compileChild(doc, ctx, schema, accessor, needsValue = true) {
    let contentLen = doc.content.length;
    let constantCount = ctx.constants.size;
    let { constantCounter, varCounter } = ctx;
    try {
      return generateCheck(doc, ctx, schema, accessor, needsValue);
    } catch (err) {
      if (!(err instanceof ZodCompileUnsupportedError) || !err.islandable) throw err;
      doc.content.length = contentLen;
      if (ctx.constants.size > constantCount) {
        let trailing = Array.from(ctx.constants.keys()).slice(constantCount);
        for (let k of trailing) ctx.constants.delete(k);
      }
      ctx.constantCounter = constantCounter;
      ctx.varCounter = varCounter;
      return emitRuntimeIsland(doc, ctx, schema, accessor);
    }
  }
  function emitRuntimeIsland(doc, ctx, schema, accessor) {
    ctx.definite = false;
    let schemaConst = addConstant(ctx, schema);
    let runConst = addConstant(ctx, runtimeRun);
    let outVar = newVar(ctx);
    doc.write(`const ${outVar} = ${runConst}(${schemaConst}, ${accessor});`);
    doc.write(`if (${outVar} === INVALID) return INVALID;`);
    return outVar;
  }
  var WHEN_DEFAULTED_CHECKS = new Set([
    "max_size",
    "min_size",
    "size_equals",
    "max_length",
    "min_length",
    "length_equals",
  ]);
  function generateChecks(doc, ctx, schema, accessor) {
    let schemaChecks = schema._zod.def.checks;
    if (!schemaChecks || schemaChecks.length === 0) return accessor;
    let currentAccessor = accessor;
    for (let check of schemaChecks) {
      let def = check._zod.def;
      if (def.when && !WHEN_DEFAULTED_CHECKS.has(def.check))
        throw new ZodCompileUnsupportedError('check with a custom "when" condition');
      switch (def.check) {
        case "greater_than":
          generateGreaterThanCheck(doc, ctx, def, currentAccessor);
          break;
        case "less_than":
          generateLessThanCheck(doc, ctx, def, currentAccessor);
          break;
        case "multiple_of":
          generateMultipleOfCheck(doc, ctx, def, currentAccessor);
          break;
        case "number_format":
          generateNumberFormatCheck(doc, def, currentAccessor);
          break;
        case "min_length": {
          let min = numericOperand(def.minimum, "min_length");
          let len = codePointLengthVar(
            doc,
            ctx,
            currentAccessor,
            `${currentAccessor}.length >= ${min} && ${currentAccessor}.length < ${def.minimum * 2}`,
          );
          doc.write(`if (${len} < ${min}) return INVALID;`);
          break;
        }
        case "max_length": {
          let max = numericOperand(def.maximum, "max_length");
          let len = codePointLengthVar(doc, ctx, currentAccessor, `${currentAccessor}.length > ${max}`);
          doc.write(`if (${len} > ${max}) return INVALID;`);
          break;
        }
        case "length_equals": {
          let exact = numericOperand(def.length, "length_equals");
          let len = codePointLengthVar(
            doc,
            ctx,
            currentAccessor,
            `${currentAccessor}.length >= ${exact} && ${currentAccessor}.length <= ${def.length * 2}`,
          );
          doc.write(`if (${len} !== ${exact}) return INVALID;`);
          break;
        }
        case "min_size":
          doc.write(
            `if (${currentAccessor}.size < ${numericOperand(def.minimum, "min_size")}) return INVALID;`,
          );
          break;
        case "max_size":
          doc.write(
            `if (${currentAccessor}.size > ${numericOperand(def.maximum, "max_size")}) return INVALID;`,
          );
          break;
        case "size_equals":
          doc.write(
            `if (${currentAccessor}.size !== ${numericOperand(def.size, "size_equals")}) return INVALID;`,
          );
          break;
        case "string_format":
          currentAccessor = generateStringFormatCheck(doc, ctx, def, currentAccessor);
          break;
        case "custom":
          currentAccessor = generateCustomRefineCheck(doc, ctx, check, currentAccessor);
          break;
        case "bigint_format":
          generateBigIntFormatCheck(doc, def, currentAccessor);
          break;
        case "mime_type":
          generateMimeTypeCheck(doc, ctx, def, currentAccessor);
          break;
        case "property":
          generatePropertyCheck(doc, ctx, def, currentAccessor);
          break;
        case "properties":
          generatePropertiesChecks(doc, ctx, def, currentAccessor, false);
          break;
        case "overwrite": {
          let newAccessor = newVar(ctx);
          generateOverwriteCheck(doc, ctx, check, currentAccessor, newAccessor);
          currentAccessor = newAccessor;
          break;
        }
        default:
          throw new ZodCompileUnsupportedError(`check type ${def.check}`);
      }
    }
    return currentAccessor;
  }
  function codePointLengthVar(doc, ctx, accessor, inDoubt) {
    let cpLen = addConstant(ctx, util.codePointLength);
    let v = newVar(ctx);
    doc.write(
      `const ${v} = typeof ${accessor} === "string" && ${inDoubt} ? ${cpLen}(${accessor}) : ${accessor}.length;`,
    );
    return v;
  }
  function numericOperand(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new ZodCompileUnsupportedError(`${label} bound of type ${typeof value}`);
    return `${value}`;
  }
  function comparisonOperand(ctx, value) {
    if (typeof value === "bigint") return `${value}n`;
    if (typeof value === "number") {
      if (Number.isNaN(value)) throw new ZodCompileUnsupportedError("comparison check with NaN bound");
      return `${value}`;
    }
    if (value instanceof Date) {
      if (Number.isNaN(value.getTime()))
        throw new ZodCompileUnsupportedError("comparison check with Invalid Date bound");
      return addConstant(ctx, value);
    }
    throw new ZodCompileUnsupportedError(`comparison check bound of type ${typeof value}`);
  }
  function generateGreaterThanCheck(doc, ctx, def, accessor) {
    let op = def.inclusive ? "<" : "<=";
    doc.write(`if (${accessor} ${op} ${comparisonOperand(ctx, def.value)}) return INVALID;`);
  }
  function generateLessThanCheck(doc, ctx, def, accessor) {
    let op = def.inclusive ? ">" : ">=";
    doc.write(`if (${accessor} ${op} ${comparisonOperand(ctx, def.value)}) return INVALID;`);
  }
  function generateMultipleOfCheck(doc, ctx, def, accessor) {
    if (typeof def.value === "bigint") {
      if (def.value === BigInt(0))
        throw new ZodCompileUnsupportedError("multiple_of check with a zero divisor");
      doc.write(`if (${accessor} % ${def.value}n !== 0n) return INVALID;`);
    } else {
      let remainder = addConstant(ctx, util.floatSafeRemainder);
      doc.write(
        `if (${remainder}(${accessor}, ${numericOperand(def.value, "multiple_of")}) !== 0) return INVALID;`,
      );
    }
  }
  function generateNumberFormatCheck(doc, def, accessor) {
    let format = def.format;
    switch (format) {
      case "safeint":
        doc.write(`if (!Number.isSafeInteger(${accessor})) return INVALID;`);
        break;
      case "int32":
        doc.write(
          `if (!Number.isInteger(${accessor}) || ${accessor} < -2147483648 || ${accessor} > 2147483647) return INVALID;`,
        );
        break;
      case "uint32":
        doc.write(
          `if (!Number.isInteger(${accessor}) || ${accessor} < 0 || ${accessor} > 4294967295) return INVALID;`,
        );
        break;
      case "float32":
        doc.write(
          `if (!Number.isFinite(${accessor}) || ${accessor} < -3.4028234663852886e38 || ${accessor} > 3.4028234663852886e38) return INVALID;`,
        );
        break;
      case "float64":
        doc.write(`if (!Number.isFinite(${accessor})) return INVALID;`);
        break;
      default:
        throw new ZodCompileUnsupportedError(`number format ${format}`);
    }
  }
  function generateBigIntFormatCheck(doc, def, accessor) {
    let format = def.format;
    if (!format) return;
    switch (format) {
      case "int64":
        doc.write(
          `if (${accessor} < -9223372036854775808n || ${accessor} > 9223372036854775807n) return INVALID;`,
        );
        break;
      case "uint64":
        doc.write(`if (${accessor} < 0n || ${accessor} > 18446744073709551615n) return INVALID;`);
        break;
      default:
        throw new ZodCompileUnsupportedError(`bigint format ${format}`);
    }
  }
  function generateMimeTypeCheck(doc, ctx, def, accessor) {
    let mimeTypes = def.mime;
    if (mimeTypes && mimeTypes.length > 0) {
      let mimeSet = addConstant(ctx, new Set(mimeTypes));
      doc.write(`if (!${mimeSet}.has(${accessor}.type)) return INVALID;`);
    }
  }
  function generatePropertiesChecks(doc, ctx, def, accessor, schemaRole) {
    if (def.when) throw new ZodCompileUnsupportedError('check with a custom "when" condition');
    doc.write(
      schemaRole
        ? `if (${accessor} === null || (typeof ${accessor} !== "object" && typeof ${accessor} !== "function")) return INVALID;`
        : `if (${accessor} == null) return INVALID;`,
    );
    let shape = def.shape;
    for (let key of Reflect.ownKeys(shape)) {
      let keyExpr = typeof key === "symbol" ? addConstant(ctx, key) : util.esc(key);
      let inputVar = newVar(ctx);
      doc.write(`const ${inputVar} = ${accessor}[${keyExpr}];`);
      compileChild(doc, ctx, shape[key], inputVar, false);
    }
  }
  function generatePropertyCheck(doc, ctx, def, accessor) {
    let propAccessor = `${accessor}[${JSON.stringify(def.property)}]`;
    generateCheck(doc, ctx, def.schema, propAccessor);
  }
  function generateOverwriteCheck(doc, ctx, check, currentAccessor, newAccessor) {
    let tx = check._zod.def.tx;
    if (!tx) throw new ZodCompileUnsupportedError("overwrite check without a transform function");
    if (isAsyncFunction(tx))
      throw new ZodCompileAsyncError("z.compile: async overwrite transforms are not supported");
    let txConst = addConstant(ctx, tx);
    doc.write(`const ${newAccessor} = ${txConst}(${currentAccessor});`);
  }
  function throwAsync() {
    throw new core_js_1.$ZodAsyncError();
  }
  function pushIssue(issue) {
    this.issues.push(issue);
  }
  function generateCustomRefineCheck(doc, ctx, check, accessor) {
    let def = check._zod.def;
    if (def.fn) {
      if (isAsyncFunction(def.fn))
        throw new ZodCompileAsyncError("z.compile: async .refine() predicates are not supported");
      let fnConst = addUserConstant(ctx, def.fn);
      let throwAsyncConst = addConstant(ctx, throwAsync);
      let resVar = newVar(ctx);
      doc.write(`const ${resVar} = ${fnConst}(${accessor});`);
      doc.write(`if (${resVar} instanceof Promise) ${throwAsyncConst}();`);
      doc.write(`if (!${resVar}) return INVALID;`);
      return accessor;
    }
    if (check._zod.check) {
      if (isAsyncFunction(check._zod.check))
        throw new ZodCompileAsyncError("z.compile: async .superRefine() / check functions are not supported");
      let checkFn = check._zod.check;
      let checkConstant = addUserConstant(ctx, (value) => {
        let fakePayload = {
          value,
          issues: [],
          addIssue: pushIssue,
        };
        if (checkFn(fakePayload) instanceof Promise) throwAsync();
        return fakePayload.issues.length === 0 ? fakePayload.value : cjsExports.INVALID;
      });
      let outVar = newVar(ctx);
      doc.write(`const ${outVar} = ${checkConstant}(${accessor});`);
      doc.write(`if (${outVar} === INVALID) return INVALID;`);
      return outVar;
    }
    throw new ZodCompileUnsupportedError("custom check without a predicate or check function");
  }
  var PATTERN_IS_COMPLETE = new Set([
    "cidrv4",
    "cuid",
    "cuid2",
    "date",
    "datetime",
    "duration",
    "e164",
    "email",
    "emoji",
    "ends_with",
    "guid",
    "includes",
    "ipv4",
    "ksuid",
    "lowercase",
    "mac",
    "nanoid",
    "regex",
    "starts_with",
    "time",
    "ulid",
    "uppercase",
    "uuid",
    "xid",
  ]);
  function generateStringFormatCheck(doc, ctx, def, accessor) {
    let fmt = def.format;
    if (fmt === "base64") {
      let validator = addConstant(ctx, schemas_js_1.isValidBase64);
      doc.write(`if (!${validator}(${accessor})) return INVALID;`);
      return accessor;
    }
    if (fmt === "base64url") {
      let validator = addConstant(ctx, schemas_js_1.isValidBase64URL);
      doc.write(`if (!${validator}(${accessor})) return INVALID;`);
      return accessor;
    }
    if (fmt === "jwt") {
      let validator = addConstant(ctx, schemas_js_1.isValidJWT);
      let alg = addConstant(ctx, def.alg ?? null);
      doc.write(`if (!${validator}(${accessor}, ${alg})) return INVALID;`);
      return accessor;
    }
    if (fmt === "ipv6") {
      let validator = addConstant(ctx, schemas_js_1.isValidIPv6);
      doc.write(`if (!${validator}(${accessor})) return INVALID;`);
      return accessor;
    }
    if (fmt === "cidrv6") {
      let validator = addConstant(ctx, schemas_js_1.isValidCIDRv6);
      doc.write(`if (!${validator}(${accessor})) return INVALID;`);
      return accessor;
    }
    if (fmt === "credit_card") {
      let validator = addConstant(ctx, schemas_js_1.isValidCreditCard);
      doc.write(`if (!${validator}(${accessor})) return INVALID;`);
      return accessor;
    }
    if (fmt === "iban") {
      let validator = addConstant(ctx, schemas_js_1.isValidIBAN);
      doc.write(`if (!${validator}(${accessor})) return INVALID;`);
      return accessor;
    }
    let formatDef = def;
    if (
      fmt === "url" ||
      fmt === "httpurl" ||
      formatDef.normalize ||
      formatDef.hostname !== undefined ||
      formatDef.protocol !== undefined
    ) {
      let parseConst = addConstant(ctx, schemas_js_1.parseURLObject);
      let defConst = addConstant(ctx, def);
      let trimVar = newVar(ctx);
      let urlVar = newVar(ctx);
      doc.write(`const ${trimVar} = ${accessor}.trim();`);
      doc.write(`const ${urlVar} = ${parseConst}(${trimVar}, ${defConst});`);
      doc.write(`if (typeof ${urlVar} === "number") return INVALID;`);
      if (formatDef.hostname !== undefined) {
        let hostnameConst = addConstant(ctx, schemas_js_1.urlHostnameOk);
        doc.write(`if (!${hostnameConst}(${urlVar}, ${defConst}.hostname)) return INVALID;`);
      }
      if (formatDef.protocol !== undefined) {
        let protocolConst = addConstant(ctx, schemas_js_1.urlProtocolOk);
        doc.write(`if (!${protocolConst}(${urlVar}, ${defConst}.protocol)) return INVALID;`);
      }
      let outputVar = newVar(ctx);
      let outputExpr = formatDef.normalize
        ? `${urlVar}.href`
        : `${addConstant(ctx, schemas_js_1.stripTabAndNewline)}(${trimVar})`;
      doc.write(`const ${outputVar} = ${outputExpr};`);
      return outputVar;
    }
    let customFn = def.fn;
    if (customFn) {
      if (isAsyncFunction(customFn)) throw new ZodCompileUnsupportedError(`async string format ${fmt}`);
      let fnConst = addConstant(ctx, customFn);
      doc.write(`if (!${fnConst}(${accessor})) return INVALID;`);
      return accessor;
    }
    if (PATTERN_IS_COMPLETE.has(fmt) && def.pattern) {
      let patternConst = addConstant(ctx, def.pattern);
      doc.write(`${patternConst}.lastIndex = 0;`);
      doc.write(`if (!${patternConst}.test(${accessor})) return INVALID;`);
      return accessor;
    }
    let format = def.format;
    switch (format) {
      case "regex":
        throw new ZodCompileUnsupportedError("regex format without a pattern");
      case "lowercase":
        doc.write(`if (${accessor} !== ${accessor}.toLowerCase()) return INVALID;`);
        break;
      case "uppercase":
        doc.write(`if (${accessor} !== ${accessor}.toUpperCase()) return INVALID;`);
        break;
      case "includes":
        doc.write(`if (!${accessor}.includes(${util.esc(def.includes)})) return INVALID;`);
        break;
      case "starts_with": {
        let prefix = def.prefix;
        doc.write(`if (${accessor}.slice(0, ${prefix.length}) !== ${util.esc(prefix)}) return INVALID;`);
        break;
      }
      case "ends_with": {
        let suffix = def.suffix;
        doc.write(`if (${accessor}.slice(-${suffix.length}) !== ${util.esc(suffix)}) return INVALID;`);
        break;
      }
      default:
        throw new ZodCompileUnsupportedError(`string format ${format}`);
    }
    return accessor;
  }
  function generateCheck(doc, ctx, schema, accessor, needsValue = true) {
    let def = schema._zod.def;
    let type = def.type;
    if (def.coerce) throw new ZodCompileUnsupportedError(`coercion (z.coerce.${type}())`);
    let buildsValue = needsValue || !!def.checks?.length;
    let typeAccessor;
    switch (type) {
      case "string":
        typeAccessor = generateStringCheck(doc, ctx, schema, accessor);
        break;
      case "number":
        typeAccessor = generateNumberCheck(doc, schema, accessor);
        break;
      case "boolean":
        typeAccessor = generateBooleanCheck(doc, accessor);
        break;
      case "bigint":
        typeAccessor = generateBigIntCheck(doc, schema, accessor);
        break;
      case "symbol":
        typeAccessor = generateSymbolCheck(doc, accessor);
        break;
      case "undefined":
        typeAccessor = generateUndefinedCheck(doc, accessor);
        break;
      case "null":
        typeAccessor = generateNullCheck(doc, accessor);
        break;
      case "any":
      case "unknown":
        typeAccessor = accessor;
        break;
      case "never":
        doc.write("return INVALID;");
        typeAccessor = accessor;
        break;
      case "void":
        typeAccessor = generateVoidCheck(doc, accessor);
        break;
      case "nan":
        typeAccessor = generateNaNCheck(doc, accessor);
        break;
      case "date":
        typeAccessor = generateDateCheck(doc, accessor);
        break;
      case "object":
        typeAccessor = generateObjectCheck(doc, ctx, schema, accessor, buildsValue);
        break;
      case "optional":
        typeAccessor = generateOptionalCheck(doc, ctx, schema, accessor, buildsValue);
        break;
      case "nullable":
        typeAccessor = generateNullableCheck(doc, ctx, schema, accessor, buildsValue);
        break;
      case "array":
        typeAccessor = generateArrayCheck(doc, ctx, schema, accessor, buildsValue);
        break;
      case "literal":
        typeAccessor = generateLiteralCheck(doc, ctx, schema, accessor);
        break;
      case "enum":
        typeAccessor = generateEnumCheck(doc, ctx, schema, accessor);
        break;
      case "readonly": {
        let innerOut = generateWrapperCheck(doc, ctx, schema, accessor);
        let frozenVar = newVar(ctx);
        doc.write(`const ${frozenVar} = Object.freeze(${innerOut});`);
        typeAccessor = frozenVar;
        break;
      }
      case "success":
        generateWrapperCheck(doc, ctx, schema, accessor);
        typeAccessor = "true";
        break;
      case "default":
      case "prefault":
        typeAccessor = generateDefaultCheck(doc, ctx, schema, accessor);
        break;
      case "nonoptional":
        typeAccessor = generateNonOptionalCheck(doc, ctx, schema, accessor);
        break;
      case "tuple":
        typeAccessor = generateTupleCheck(doc, ctx, schema, accessor);
        break;
      case "union":
        typeAccessor = generateUnionCheck(doc, ctx, schema, accessor);
        break;
      case "intersection":
        typeAccessor = generateIntersectionCheck(doc, ctx, schema, accessor);
        break;
      case "record":
        typeAccessor = generateRecordCheck(doc, ctx, schema, accessor);
        break;
      case "map":
        typeAccessor = generateMapCheck(doc, ctx, schema, accessor);
        break;
      case "set":
        typeAccessor = generateSetCheck(doc, ctx, schema, accessor);
        break;
      case "file":
        typeAccessor = generateFileCheck(doc, accessor);
        break;
      case "template_literal":
        typeAccessor = generateTemplateLiteralCheck(doc, ctx, schema, accessor);
        break;
      case "lazy":
        typeAccessor = generateLazyCheck(doc, ctx, schema, accessor);
        break;
      case "pipe":
        typeAccessor = generatePipeCheck(doc, ctx, schema, accessor);
        break;
      case "custom":
        typeAccessor = generateCustomCheck(doc, ctx, schema, accessor);
        break;
      case "properties":
        generatePropertiesChecks(doc, ctx, schema._zod.def, accessor, true);
        typeAccessor = accessor;
        break;
      case "transform":
        typeAccessor = generateTransformCheck(doc, ctx, schema, accessor);
        break;
      case "catch":
        typeAccessor = generateCatchCheck(doc, ctx, schema, accessor);
        break;
      default:
        throw new ZodCompileUnsupportedError(`schema type ${type}`);
    }
    if (typeAccessor === null) return null;
    return generateChecks(doc, ctx, schema, typeAccessor);
  }
  function generateStringCheck(doc, ctx, schema, accessor) {
    doc.write(`if (typeof ${accessor} !== "string") return INVALID;`);
    let def = schema._zod.def;
    if (def.format === undefined) return accessor;
    return generateStringFormatCheck(doc, ctx, def, accessor);
  }
  function generateNumberCheck(doc, schema, accessor) {
    doc.write(`if (typeof ${accessor} !== "number" || !Number.isFinite(${accessor})) return INVALID;`);
    let def = schema._zod.def;
    if (def.check === "number_format" && def.format)
      generateNumberFormatCheck(
        doc,
        {
          format: def.format,
        },
        accessor,
      );
    return accessor;
  }
  function generateBooleanCheck(doc, accessor) {
    doc.write(`if (typeof ${accessor} !== "boolean") return INVALID;`);
    return accessor;
  }
  function generateBigIntCheck(doc, schema, accessor) {
    doc.write(`if (typeof ${accessor} !== "bigint") return INVALID;`);
    let def = schema._zod.def;
    if (def.format)
      switch (def.format) {
        case "int64":
          doc.write(
            `if (${accessor} < -9223372036854775808n || ${accessor} > 9223372036854775807n) return INVALID;`,
          );
          break;
        case "uint64":
          doc.write(`if (${accessor} < 0n || ${accessor} > 18446744073709551615n) return INVALID;`);
          break;
      }
    return accessor;
  }
  function generateSymbolCheck(doc, accessor) {
    doc.write(`if (typeof ${accessor} !== "symbol") return INVALID;`);
    return accessor;
  }
  function generateUndefinedCheck(doc, accessor) {
    doc.write(`if (${accessor} !== undefined) return INVALID;`);
    return accessor;
  }
  function generateNullCheck(doc, accessor) {
    doc.write(`if (${accessor} !== null) return INVALID;`);
    return accessor;
  }
  function generateVoidCheck(doc, accessor) {
    doc.write(`if (${accessor} !== undefined) return INVALID;`);
    return accessor;
  }
  function generateNaNCheck(doc, accessor) {
    doc.write(`if (typeof ${accessor} !== "number" || !Number.isNaN(${accessor})) return INVALID;`);
    return accessor;
  }
  function generateDateCheck(doc, accessor) {
    doc.write(`if (!(${accessor} instanceof Date) || Number.isNaN(${accessor}.getTime())) return INVALID;`);
    return accessor;
  }
  function generateObjectCheck(doc, ctx, schema, accessor, buildsValue = true) {
    let def = schema._zod.def;
    doc.write(
      `if (typeof ${accessor} !== "object" || ${accessor} === null || Array.isArray(${accessor})) return INVALID;`,
    );
    let shape = def.shape;
    let keys = Object.keys(shape);
    let symbolKeys = Object.getOwnPropertySymbols(shape);
    let allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
    let keyExpr = (k) => (typeof k === "symbol" ? addConstant(ctx, k) : util.esc(k));
    let propKey = (k) => (typeof k === "symbol" ? `[${keyExpr(k)}]` : util.esc(k));
    let propShape = shape;
    if (keys.includes("__proto__")) throw new ZodCompileUnsupportedError('object shape key "__proto__"');
    let propOutputs = new Map();
    for (let key of allKeys) {
      let propSchema = propShape[key];
      let kx = keyExpr(key);
      let inputVar = newVar(ctx);
      doc.write(`const ${inputVar} = ${accessor}[${kx}];`);
      if (propSchema._zod.optin !== undefined) {
        let outputVar = newVar(ctx);
        doc.write(`let ${outputVar} = (() => {`);
        doc.indented((d) => {
          let outputAccessor = compileChild(d, ctx, propSchema, inputVar);
          d.write(`return ${outputAccessor};`);
        });
        doc.write("})();");
        if (propSchema._zod.optout === "optional") {
          doc.write(`if (${outputVar} === INVALID) {`);
          doc.indented((d) => {
            d.write(`if (${kx} in ${accessor}) return INVALID;`);
            d.write(`${outputVar} = undefined;`);
          });
          doc.write("}");
        } else doc.write(`if (${outputVar} === INVALID) return INVALID;`);
        propOutputs.set(key, outputVar);
      } else {
        if (requiresPresenceCheck(propSchema)) doc.write(`if (!(${kx} in ${accessor})) return INVALID;`);
        let outputAccessor = compileChild(doc, ctx, propSchema, inputVar, buildsValue);
        if (outputAccessor !== null) propOutputs.set(key, outputAccessor);
      }
    }
    let catchall = def.catchall;
    let unknownKeysMode = "none";
    if (catchall) {
      let catchallType = catchall._zod.def.type;
      if (catchallType === "never") {
        let condition = keys.map((k) => `k !== ${util.esc(k)}`).join(" && ") || "true";
        doc.write(`for (const k in ${accessor}) {`);
        doc.indented((d) => {
          d.write(`if (${condition}) return INVALID;`);
        });
        doc.write("}");
      } else if ((catchallType === "unknown" || catchallType === "any") && !catchall._zod.def.checks?.length)
        unknownKeysMode = "passthrough";
      else unknownKeysMode = "schema";
    }
    let outputVar = newVar(ctx);
    let hasConditionalKeys = allKeys.some(
      (k) => mayOmitUndefined(propShape[k]) || dropsWhenAbsent(propShape[k]),
    );
    if (!buildsValue) {
      if (unknownKeysMode === "schema") {
        let knownSet = keys.length > 0 ? addConstant(ctx, new Set(keys)) : null;
        doc.write(`for (const k in ${accessor}) {`);
        doc.indented((d) => {
          d.write('if (k === "__proto__") continue;');
          if (knownSet) d.write(`if (${knownSet}.has(k)) continue;`);
          let valVar = newVar(ctx);
          d.write(`const ${valVar} = ${accessor}[k];`);
          compileChild(d, ctx, catchall, valVar, false);
        });
        doc.write("}");
      }
      return null;
    }
    if (!hasConditionalKeys) {
      let propLiterals = allKeys.map((k) => `${propKey(k)}: ${propOutputs.get(k)}`).join(", ");
      doc.write(`const ${outputVar} = { ${propLiterals} };`);
    } else {
      doc.write(`const ${outputVar} = {};`);
      for (let k of allKeys) {
        let kx = keyExpr(k);
        let out = propOutputs.get(k);
        if (dropsWhenAbsent(propShape[k]))
          doc.write(`if (${kx} in ${accessor}) ${outputVar}[${kx}] = ${out};`);
        else if (mayOmitUndefined(propShape[k]))
          doc.write(`if (${out} !== undefined || ${kx} in ${accessor}) ${outputVar}[${kx}] = ${out};`);
        else doc.write(`${outputVar}[${kx}] = ${out};`);
      }
    }
    if (unknownKeysMode !== "none") {
      let knownSet = keys.length > 0 ? addConstant(ctx, new Set(keys)) : null;
      doc.write(`for (const k in ${accessor}) {`);
      doc.indented((d) => {
        d.write('if (k === "__proto__") continue;');
        if (knownSet) d.write(`if (${knownSet}.has(k)) continue;`);
        if (unknownKeysMode === "passthrough") d.write(`${outputVar}[k] = ${accessor}[k];`);
        else {
          let valVar = newVar(ctx);
          d.write(`const ${valVar} = ${accessor}[k];`);
          let catchallOut = compileChild(d, ctx, catchall, valVar);
          d.write(`${outputVar}[k] = ${catchallOut};`);
        }
      });
      doc.write("}");
    }
    return outputVar;
  }
  function generateOptionalCheck(doc, ctx, schema, accessor, buildsValue = true) {
    let def = schema._zod.def;
    if (isExactOptional(schema)) return generateCheck(doc, ctx, def.innerType, accessor, buildsValue);
    if (def.innerType._zod.optin === "defaulted") {
      let outputVar = newVar(ctx);
      let branchVar = newVar(ctx);
      doc.write(`let ${outputVar};`);
      doc.write(`if (${accessor} === undefined) {`);
      doc.indented((d) => {
        d.write(`const ${branchVar} = (() => {`);
        d.indented((d2) => {
          let innerOutput = generateCheck(d2, ctx, def.innerType, accessor);
          d2.write(`return ${innerOutput};`);
        });
        d.write("})();");
        d.write(`if (${branchVar} !== INVALID) ${outputVar} = ${branchVar};`);
      });
      doc.write("} else {");
      doc.indented((d) => {
        let innerOutput = generateCheck(d, ctx, def.innerType, accessor);
        d.write(`${outputVar} = ${innerOutput};`);
      });
      doc.write("}");
      return outputVar;
    }
    let outputVar = buildsValue ? newVar(ctx) : null;
    if (outputVar) doc.write(`let ${outputVar};`);
    doc.write(`if (${accessor} !== undefined) {`);
    doc.indented((d) => {
      let innerOutput = generateCheck(d, ctx, def.innerType, accessor, buildsValue);
      if (outputVar && innerOutput !== null) d.write(`${outputVar} = ${innerOutput};`);
    });
    doc.write("}");
    return outputVar;
  }
  function isExactOptional(schema) {
    return schema._zod.traits?.has("$ZodExactOptional") === true;
  }
  function requiresPresenceCheck(schema) {
    return schema._zod.optin === undefined && fastPathAcceptsAbsence(schema);
  }
  function fastPathAcceptsAbsence(schema) {
    if (schema._zod.def.coerce) return true;
    let def = schema._zod.def;
    switch (def.type) {
      case "any":
      case "unknown":
      case "undefined":
      case "void":
      case "default":
      case "prefault":
      case "transform":
      case "custom":
      case "lazy":
        return true;
      case "string":
      case "number":
      case "boolean":
      case "bigint":
      case "symbol":
      case "null":
      case "never":
      case "nan":
      case "date":
      case "object":
      case "array":
      case "tuple":
      case "record":
      case "map":
      case "set":
      case "file":
      case "template_literal":
        return false;
      case "nonoptional":
        return def.innerType ? fastPathAcceptsAbsence(def.innerType) : false;
      case "literal":
        return !!def.values?.includes(undefined);
      case "enum":
        return !!schema._zod.values?.has(undefined);
      case "optional":
      case "nullable":
      case "readonly":
      case "success":
        return def.innerType ? fastPathAcceptsAbsence(def.innerType) : true;
      case "catch":
        return true;
      case "union":
        return def.options ? def.options.some(fastPathAcceptsAbsence) : true;
      case "intersection":
        if (!def.left || !def.right) return true;
        return fastPathAcceptsAbsence(def.left) && fastPathAcceptsAbsence(def.right);
      case "pipe":
        return def.in ? fastPathAcceptsAbsence(def.in) : true;
      default:
        return true;
    }
  }
  function dropsWhenAbsent(schema) {
    return schema._zod.optin === "optional" && schema._zod.optout === "optional";
  }
  function mayOmitUndefined(schema) {
    return (
      (schema._zod.optin !== "defaulted" || schema._zod.optout === "optional") && mayOutputUndefined(schema)
    );
  }
  function mayOutputUndefined(schema) {
    let def = schema._zod.def;
    switch (def.type) {
      case "string":
      case "number":
      case "boolean":
      case "bigint":
      case "symbol":
      case "null":
      case "nan":
      case "date":
      case "object":
      case "array":
      case "tuple":
      case "record":
      case "map":
      case "set":
      case "file":
      case "template_literal":
      case "never":
      case "success":
        return false;
      case "literal":
        return !!def.values?.includes(undefined);
      case "enum":
        return !!schema._zod.values?.has(undefined);
      case "optional":
        return true;
      case "nullable":
      case "readonly":
      case "nonoptional":
        return def.innerType ? mayOutputUndefined(def.innerType) : true;
      case "union":
        return def.options ? def.options.some(mayOutputUndefined) : true;
      case "intersection":
        return !def.left || !def.right || mayOutputUndefined(def.left) || mayOutputUndefined(def.right);
      case "pipe":
        return def.out ? mayOutputUndefined(def.out) : true;
      default:
        return true;
    }
  }
  function generateNullableCheck(doc, ctx, schema, accessor, buildsValue = true) {
    let def = schema._zod.def;
    let outputVar = buildsValue ? newVar(ctx) : null;
    if (outputVar) doc.write(`let ${outputVar} = null;`);
    doc.write(`if (${accessor} !== null) {`);
    doc.indented((d) => {
      let innerOutput = generateCheck(d, ctx, def.innerType, accessor, buildsValue);
      if (outputVar && innerOutput !== null) d.write(`${outputVar} = ${innerOutput};`);
    });
    doc.write("}");
    return outputVar;
  }
  function generateArrayCheck(doc, ctx, schema, accessor, buildsValue = true) {
    let def = schema._zod.def;
    doc.write(`if (!Array.isArray(${accessor})) return INVALID;`);
    let outputVar = buildsValue ? newVar(ctx) : null;
    let iVar = newVar(ctx);
    let elemVar = newVar(ctx);
    if (outputVar) doc.write(`const ${outputVar} = new Array(${accessor}.length);`);
    doc.write(`for (let ${iVar} = 0; ${iVar} < ${accessor}.length; ${iVar}++) {`);
    doc.indented((d) => {
      d.write(`const ${elemVar} = ${accessor}[${iVar}];`);
      let elemOutput = compileChild(d, ctx, def.element, elemVar, buildsValue);
      if (outputVar && elemOutput !== null) d.write(`${outputVar}[${iVar}] = ${elemOutput};`);
    });
    doc.write("}");
    return outputVar;
  }
  function generateLiteralCheck(doc, ctx, schema, accessor) {
    let values = schema._zod.def.values;
    if (values.length !== 1) {
      let literalSet = addConstant(ctx, new Set(values));
      doc.write(`if (!${literalSet}.has(${accessor})) return INVALID;`);
      return accessor;
    }
    let value = values[0];
    if (typeof value === "number" && Number.isNaN(value)) {
      let literalSet = addConstant(ctx, new Set(values));
      doc.write(`if (!${literalSet}.has(${accessor})) return INVALID;`);
      return accessor;
    }
    if (typeof value === "string") doc.write(`if (${accessor} !== ${util.esc(value)}) return INVALID;`);
    else if (typeof value === "number" || typeof value === "boolean")
      doc.write(`if (${accessor} !== ${value}) return INVALID;`);
    else if (value === null) doc.write(`if (${accessor} !== null) return INVALID;`);
    else if (value === undefined) doc.write(`if (${accessor} !== undefined) return INVALID;`);
    else if (typeof value === "bigint") doc.write(`if (${accessor} !== ${value}n) return INVALID;`);
    else throw new ZodCompileUnsupportedError(`literal type ${typeof value}`);
    return accessor;
  }
  function generateEnumCheck(doc, ctx, schema, accessor) {
    let values = schema._zod.values;
    if (!values) throw new ZodCompileUnsupportedError("enum schema without enumerated values");
    let enumSet = addConstant(ctx, values);
    doc.write(`if (!${enumSet}.has(${accessor})) return INVALID;`);
    return accessor;
  }
  function generateWrapperCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    return generateCheck(doc, ctx, def.innerType, accessor);
  }
  function generateDefaultCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    let defaultGetter = Object.getOwnPropertyDescriptor(schema._zod.def, "defaultValue")
      ? () => schema._zod.def.defaultValue
      : undefined;
    if (schema._zod.def.type === "prefault") {
      if (!defaultGetter) return generateCheck(doc, ctx, def.innerType, accessor);
      let defaultFn = addConstant(ctx, defaultGetter);
      let inputVar = newVar(ctx);
      doc.write(`let ${inputVar} = ${accessor};`);
      doc.write(`if (${accessor} === undefined) ${inputVar} = ${defaultFn}();`);
      return generateCheck(doc, ctx, def.innerType, inputVar);
    }
    let outputVar = newVar(ctx);
    if (defaultGetter) {
      let defaultFn = addConstant(ctx, defaultGetter);
      let cloneFn = addConstant(ctx, util.shallowClone);
      doc.write(`let ${outputVar};`);
      doc.write(`if (${accessor} === undefined) {`);
      doc.indented((d) => {
        d.write(`${outputVar} = ${cloneFn}(${defaultFn}());`);
      });
      doc.write("} else {");
      doc.indented((d) => {
        let innerOutput = generateCheck(d, ctx, def.innerType, accessor);
        d.write(`${outputVar} = ${innerOutput} === undefined ? ${cloneFn}(${defaultFn}()) : ${innerOutput};`);
      });
      doc.write("}");
    } else {
      doc.write(`let ${outputVar};`);
      doc.write(`if (${accessor} !== undefined) {`);
      doc.indented((d) => {
        let innerOutput = generateCheck(d, ctx, def.innerType, accessor);
        d.write(`${outputVar} = ${innerOutput};`);
      });
      doc.write("}");
    }
    return outputVar;
  }
  function generateNonOptionalCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    let innerOutput = generateCheck(doc, ctx, def.innerType, accessor);
    let outputVar = newVar(ctx);
    doc.write(`const ${outputVar} = ${innerOutput};`);
    doc.write(`if (${outputVar} === undefined) return INVALID;`);
    return outputVar;
  }
  function generateTupleCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    let { items, rest } = def;
    doc.write(`if (!Array.isArray(${accessor})) return INVALID;`);
    let optinStart = getTupleOptStart(items, "optin");
    let optoutStart = getTupleOptStart(items, "optout");
    if (rest) doc.write(`if (${accessor}.length < ${optinStart}) return INVALID;`);
    else
      doc.write(
        `if (${accessor}.length < ${optinStart} || ${accessor}.length > ${items.length}) return INVALID;`,
      );
    let outputVar = newVar(ctx);
    doc.write(`const ${outputVar} = [];`);
    for (let i = 0; i < items.length; i++) {
      let itemSchema = items[i];
      if (i >= optoutStart) {
        doc.write(`if (${outputVar}.length === ${i}) {`);
        doc.indented((d) => {
          d.write(`if (${i} < ${accessor}.length) {`);
          d.indented((d2) => {
            let elemVar = newVar(ctx);
            d2.write(`const ${elemVar} = ${accessor}[${i}];`);
            let elemOutput = compileChild(d2, ctx, itemSchema, elemVar);
            d2.write(`${outputVar}[${i}] = ${elemOutput};`);
          });
          d.write("} else {");
          d.indented((d2) => {
            if (dropsWhenAbsent(itemSchema)) {
              d2.write(`${outputVar}.length = ${i};`);
              return;
            }
            let elemVar = newVar(ctx);
            let branchVar = newVar(ctx);
            d2.write(`const ${elemVar} = undefined;`);
            d2.write(`const ${branchVar} = (() => {`);
            d2.indented((d3) => {
              let elemOutput = compileChild(d3, ctx, itemSchema, elemVar);
              d3.write(`return ${elemOutput};`);
            });
            d2.write("})();");
            d2.write(
              `if (${branchVar} === INVALID || ${branchVar} === undefined) ${outputVar}.length = ${i};`,
            );
            d2.write(`else ${outputVar}[${i}] = ${branchVar};`);
          });
          d.write("}");
        });
        doc.write("}");
      } else {
        let elemVar = newVar(ctx);
        doc.write(`const ${elemVar} = ${accessor}[${i}];`);
        let elemOutput = compileChild(doc, ctx, itemSchema, elemVar);
        doc.write(`${outputVar}[${i}] = ${elemOutput};`);
      }
    }
    if (rest) {
      let iVar = newVar(ctx);
      let elemVar = newVar(ctx);
      doc.write(`for (let ${iVar} = ${items.length}; ${iVar} < ${accessor}.length; ${iVar}++) {`);
      doc.indented((d) => {
        d.write(`const ${elemVar} = ${accessor}[${iVar}];`);
        let elemOutput = compileChild(d, ctx, rest, elemVar);
        d.write(`${outputVar}[${iVar}] = ${elemOutput};`);
      });
      doc.write("}");
    }
    return outputVar;
  }
  function getTupleOptStart(items, key) {
    for (let i = items.length - 1; i >= 0; i--)
      if (!(key === "optin" ? items[i]._zod.optin !== undefined : items[i]._zod.optout === "optional"))
        return i + 1;
    return 0;
  }
  function generateUnionCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    let options = def.options;
    if (def.discriminator) return generateDiscriminatedUnionCheck(doc, ctx, def, accessor);
    if (def.inclusive === false) throw new ZodCompileUnsupportedError("exclusive unions (z.xor)");
    if (options.length === 0) {
      doc.write("return INVALID;");
      return accessor;
    }
    if (options.length === 1) return generateCheck(doc, ctx, options[0], accessor);
    if (options.every((opt) => opt._zod.def.type === "literal" && !opt._zod.def.checks?.length)) {
      let values = new Set(options.flatMap((opt) => opt._zod.def.values));
      let valuesConst = addConstant(ctx, values);
      doc.write(`if (!${valuesConst}.has(${accessor})) return INVALID;`);
      return accessor;
    }
    let outputVar = newVar(ctx);
    doc.write(`let ${outputVar};`);
    for (let i = 0; i < options.length; i++) {
      let opt = options[i];
      if (i === 0) doc.write(`${outputVar} = (() => {`);
      else doc.write(`if (${outputVar} === INVALID) ${outputVar} = (() => {`);
      doc.indented((d) => {
        let branchOutput = generateCheck(d, ctx, opt, accessor);
        d.write(`return ${branchOutput};`);
      });
      doc.write("})();");
    }
    doc.write(`if (${outputVar} === INVALID) return INVALID;`);
    return outputVar;
  }
  function generateDiscriminatedUnionCheck(doc, ctx, def, accessor) {
    if (def.unionFallback) throw new ZodCompileUnsupportedError("discriminated union with unionFallback");
    if (def.options.length === 0) {
      doc.write("return INVALID;");
      return accessor;
    }
    let discVar = newVar(ctx);
    let outputVar = newVar(ctx);
    doc.write(`const ${discVar} = ${accessor}?.[${util.esc(def.discriminator)}];`);
    doc.write(`let ${outputVar};`);
    let firstBranch = true;
    let claimed = new Set();
    for (let option of def.options) {
      let values = option._zod.propValues?.[def.discriminator];
      if (!values || values.size === 0)
        throw new ZodCompileUnsupportedError(
          "discriminated union option without static discriminator values",
        );
      for (let value of values) {
        if (claimed.has(value))
          throw new ZodCompileUnsupportedError(`duplicate discriminator value ${String(value)}`);
        claimed.add(value);
      }
      let conditions = Array.from(values, (value) => literalEquality(ctx, discVar, value));
      let prefix = firstBranch ? "if" : "else if";
      doc.write(`${prefix} (${conditions.join(" || ")}) {`);
      doc.indented((d) => {
        let branchOutput = generateCheck(d, ctx, option, accessor);
        d.write(`${outputVar} = ${branchOutput};`);
      });
      doc.write("}");
      firstBranch = false;
    }
    doc.write("else { return INVALID; }");
    return outputVar;
  }
  function literalEquality(ctx, accessor, value) {
    if (typeof value === "string") return `${accessor} === ${util.esc(value)}`;
    if (typeof value === "number") {
      if (Number.isNaN(value)) return `Number.isNaN(${accessor})`;
      return `${accessor} === ${value}`;
    }
    if (typeof value === "boolean") return `${accessor} === ${value}`;
    if (value === null) return `${accessor} === null`;
    if (value === undefined) return `${accessor} === undefined`;
    if (typeof value === "bigint") return `${accessor} === ${value}n`;
    if (typeof value === "symbol") {
      let symbolConst = addConstant(ctx, value);
      return `${accessor} === ${symbolConst}`;
    }
    throw new ZodCompileUnsupportedError(`literal discriminator value ${String(value)}`);
  }
  function generateIntersectionCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    ctx.definite = false;
    let leftOutput = compileChild(doc, ctx, def.left, accessor);
    let rightOutput = compileChild(doc, ctx, def.right, accessor);
    let mergeConst = addConstant(ctx, schemas_js_1.mergeValues);
    let mergedVar = newVar(ctx);
    doc.write(`const ${mergedVar} = ${mergeConst}(${leftOutput}, ${rightOutput});`);
    doc.write(`if (!${mergedVar}.valid) return INVALID;`);
    return `${mergedVar}.data`;
  }
  function generateRecordCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    let isPlainObjectConst = addConstant(ctx, util.isPlainObject);
    doc.write(`if (!${isPlainObjectConst}(${accessor})) return INVALID;`);
    let outputVar = newVar(ctx);
    let kVar = newVar(ctx);
    let valVar = newVar(ctx);
    doc.write(`const ${outputVar} = {};`);
    let recordDef = def;
    let keyValues = recordDef.partial ? undefined : def.keyType._zod.values;
    if (keyValues) {
      let inputKeys = [];
      for (let key of keyValues) {
        if (!(typeof key === "string" || typeof key === "number" || typeof key === "symbol"))
          throw new ZodCompileUnsupportedError(`record key value ${String(key)}`);
        let inputKey = typeof key === "number" ? key.toString() : key;
        if (inputKey === "__proto__") throw new ZodCompileUnsupportedError('record key "__proto__"');
        inputKeys.push(inputKey);
        let keyConst = addConstant(ctx, key);
        let outKey = generateCheck(doc, ctx, def.keyType, keyConst);
        let valueVar = newVar(ctx);
        doc.write(`const ${valueVar} = ${accessor}[${literalPropertyKey(ctx, inputKey)}];`);
        let valOutput = compileChild(doc, ctx, def.valueType, valueVar);
        doc.write(`${outputVar}[${outKey}] = ${valOutput};`);
      }
      let knownKeysConst = addConstant(ctx, new Set(inputKeys));
      doc.write(`for (const ${kVar} in ${accessor}) {`);
      doc.indented((d) => {
        d.write(`if (${knownKeysConst}.has(${kVar})) continue;`);
        if (recordDef.mode === "loose")
          d.write(`if (${kVar} !== "__proto__") ${outputVar}[${kVar}] = ${accessor}[${kVar}];`);
        else d.write("return INVALID;");
      });
      doc.write("}");
      return outputVar;
    }
    let keyDef = def.keyType._zod.def;
    if (!(
      keyDef.type === "string" &&
      keyDef.format === undefined &&
      !keyDef.coerce &&
      (keyDef.checks?.length ?? 0) === 0
    )) {
      let isLoose = def.mode === "loose";
      let keyFn = compileFn(def.keyType);
      if (keyFn.definite === false) ctx.definite = false;
      let keyFast = addConstant(ctx, keyFn);
      let numericConst = addConstant(ctx, regexes.number);
      let outKeyVar = newVar(ctx);
      emitOwnKeys(doc, ctx, accessor, kVar, (d) => {
        d.write(`let ${outKeyVar} = ${keyFast}(${kVar});`);
        d.write(
          `if (${outKeyVar} === INVALID && typeof ${kVar} === "string" && ${numericConst}.test(${kVar})) ${outKeyVar} = ${keyFast}(Number(${kVar}));`,
        );
        if (isLoose)
          d.write(
            `if (${outKeyVar} === INVALID) { ${outputVar}[${kVar}] = ${accessor}[${kVar}]; continue; }`,
          );
        else d.write(`if (${outKeyVar} === INVALID) return INVALID;`);
        d.write(`if (${outKeyVar} === "__proto__") continue;`);
        let valueVar = newVar(ctx);
        d.write(`const ${valueVar} = ${accessor}[${kVar}];`);
        let valOutput = compileChild(d, ctx, def.valueType, valueVar);
        d.write(`${outputVar}[${outKeyVar}] = ${valOutput};`);
      });
      return outputVar;
    }
    emitOwnKeys(
      doc,
      ctx,
      accessor,
      kVar,
      (d) => {
        d.write(`const ${valVar} = ${accessor}[${kVar}];`);
        let valOutput = compileChild(d, ctx, def.valueType, valVar);
        d.write(`${outputVar}[${kVar}] = ${valOutput};`);
      },
      "return INVALID;",
    );
    return outputVar;
  }
  function emitOwnKeys(doc, ctx, accessor, kVar, body, onSymbol) {
    let propIsEnumerableConst = addConstant(ctx, Object.prototype.propertyIsEnumerable);
    let symsVar = newVar(ctx);
    let keysVar = newVar(ctx);
    let iVar = newVar(ctx);
    doc.write(`const ${symsVar} = Object.getOwnPropertySymbols(${accessor});`);
    doc.write(`const ${keysVar} = Object.getOwnPropertyNames(${accessor});`);
    doc.write(`for (let ${iVar} = 0; ${iVar} < ${keysVar}.length; ${iVar}++) {`);
    doc.indented((d) => {
      d.write(`const ${kVar} = ${keysVar}[${iVar}];`);
      d.write(
        `if (${kVar} === "__proto__" || !${propIsEnumerableConst}.call(${accessor}, ${kVar})) continue;`,
      );
      body(d);
    });
    doc.write("}");
    doc.write(`for (let ${iVar} = 0; ${iVar} < ${symsVar}.length; ${iVar}++) {`);
    doc.indented((d) => {
      d.write(`const ${kVar} = ${symsVar}[${iVar}];`);
      d.write(`if (!${propIsEnumerableConst}.call(${accessor}, ${kVar})) continue;`);
      if (onSymbol) d.write(onSymbol);
      else body(d);
    });
    doc.write("}");
  }
  function literalPropertyKey(ctx, key) {
    if (typeof key === "string") return util.esc(key);
    return addConstant(ctx, key);
  }
  function generateMapCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    doc.write(`if (!(${accessor} instanceof Map)) return INVALID;`);
    let outputVar = newVar(ctx);
    let kVar = newVar(ctx);
    let valVar = newVar(ctx);
    doc.write(`const ${outputVar} = new Map();`);
    doc.write(`for (const [${kVar}, ${valVar}] of ${accessor}) {`);
    doc.indented((d) => {
      let keyOutput = generateCheck(d, ctx, def.keyType, kVar);
      let valOutput = generateCheck(d, ctx, def.valueType, valVar);
      d.write(`${outputVar}.set(${keyOutput}, ${valOutput});`);
    });
    doc.write("}");
    return outputVar;
  }
  function generateSetCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    doc.write(`if (!(${accessor} instanceof Set)) return INVALID;`);
    let outputVar = newVar(ctx);
    let valVar = newVar(ctx);
    doc.write(`const ${outputVar} = new Set();`);
    doc.write(`for (const ${valVar} of ${accessor}) {`);
    doc.indented((d) => {
      let valOutput = generateCheck(d, ctx, def.valueType, valVar);
      d.write(`${outputVar}.add(${valOutput});`);
    });
    doc.write("}");
    return outputVar;
  }
  function generateFileCheck(doc, accessor) {
    doc.write(`if (!(${accessor} instanceof File)) return INVALID;`);
    return accessor;
  }
  function generateTemplateLiteralCheck(doc, ctx, schema, accessor) {
    doc.write(`if (typeof ${accessor} !== "string") return INVALID;`);
    let pattern = schema._zod.pattern;
    if (pattern) {
      let patternConst = addConstant(ctx, pattern);
      doc.write(`${patternConst}.lastIndex = 0;`);
      doc.write(`if (!${patternConst}.test(${accessor})) return INVALID;`);
    }
    return accessor;
  }
  function generateLazyCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    let getterConst = addUserConstant(ctx, def.getter);
    let cacheConst = addConstant(ctx, {
      parser: null,
    });
    doc.write(`if (!${cacheConst}.parser) {`);
    doc.indented((d) => {
      d.write(`const inner = ${getterConst}();`);
      d.write(`${cacheConst}.parser = function(input) {`);
      d.indented((d2) => {
        d2.write("const result = inner._zod.run({ value: input, issues: [] }, {});");
        d2.write("return result.issues.length === 0 ? result.value : INVALID;");
      });
      d.write("};");
    });
    doc.write("}");
    let outputVar = newVar(ctx);
    doc.write(`const ${outputVar} = ${cacheConst}.parser(${accessor});`);
    doc.write(`if (${outputVar} === INVALID) return INVALID;`);
    return outputVar;
  }
  function generatePipeCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    let inputOutput = generateCheck(doc, ctx, def.in, accessor);
    if (def.transform) {
      if (isAsyncFunction(def.transform))
        throw new ZodCompileAsyncError("z.compile: async transforms in pipes are not supported");
      let transformFn = def.transform;
      let transformConstant = addUserConstant(ctx, (value) => {
        let fakePayload = {
          value,
          issues: [],
          addIssue: pushIssue,
        };
        let result = transformFn(value, fakePayload);
        if (result instanceof Promise) return cjsExports.INVALID;
        return fakePayload.issues.length === 0 ? result : cjsExports.INVALID;
      });
      let transformedVar = newVar(ctx);
      doc.write(`const ${transformedVar} = ${transformConstant}(${inputOutput});`);
      doc.write(`if (${transformedVar} === INVALID) return INVALID;`);
      return generateCheck(doc, ctx, def.out, transformedVar);
    } else return generateCheck(doc, ctx, def.out, inputOutput);
  }
  function isAsyncFunction(fn) {
    return (
      typeof fn === "function" &&
      (fn.constructor.name === "AsyncFunction" || fn[Symbol.toStringTag] === "AsyncFunction")
    );
  }
  function generateCustomCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    if (def.fn) {
      if (isAsyncFunction(def.fn))
        throw new ZodCompileAsyncError("z.compile: async custom predicates are not supported");
      let fnConst = addUserConstant(ctx, def.fn);
      let throwAsyncConst = addConstant(ctx, throwAsync);
      let resVar = newVar(ctx);
      doc.write(`const ${resVar} = ${fnConst}(${accessor});`);
      doc.write(`if (${resVar} instanceof Promise) ${throwAsyncConst}();`);
      doc.write(`if (!${resVar}) return INVALID;`);
    } else throw new ZodCompileUnsupportedError("custom schema without a predicate function");
    return accessor;
  }
  function runtimeCatch(innerSchema, catchValue, value) {
    let result = innerSchema._zod.run(
      {
        value,
        issues: [],
      },
      {},
    );
    if (result && typeof result.then === "function") return cjsExports.INVALID;
    let runResult = result;
    if (runResult.issues.length === 0) return runResult.value;
    return catchValue();
  }
  function generateCatchCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    if (!def.catchValue[util.CONSTANT_CATCH])
      throw new ZodCompileUnsupportedError(
        "catch with a callback (only a constant catch value compiles)",
        false,
      );
    let outputVar = newVar(ctx);
    doc.write(`let ${outputVar} = (() => {`);
    doc.indented((d) => {
      let innerOut = compileChild(d, ctx, def.innerType, accessor);
      d.write(`return ${innerOut};`);
    });
    doc.write("})();");
    let innerConst = addConstant(ctx, def.innerType);
    let catchConst = addUserConstant(ctx, def.catchValue);
    let catchHelperConst = addConstant(ctx, runtimeCatch);
    doc.write(`if (${outputVar} === INVALID) {`);
    doc.indented((d) => {
      d.write(`${outputVar} = ${catchHelperConst}(${innerConst}, ${catchConst}, ${accessor});`);
      d.write(`if (${outputVar} === INVALID) return INVALID;`);
    });
    doc.write("}");
    return outputVar;
  }
  function generateTransformCheck(doc, ctx, schema, accessor) {
    let def = schema._zod.def;
    if (def.transform) {
      if (isAsyncFunction(def.transform))
        throw new ZodCompileAsyncError("z.compile: async transforms are not supported");
      let transformFn = def.transform;
      let transformConstant = addUserConstant(ctx, (value) => {
        let fakePayload = {
          value,
          issues: [],
          addIssue: pushIssue,
        };
        let result = transformFn(value, fakePayload);
        if (result instanceof Promise) return cjsExports.INVALID;
        return fakePayload.issues.length === 0 ? result : cjsExports.INVALID;
      });
      let outputVar = newVar(ctx);
      doc.write(`const ${outputVar} = ${transformConstant}(${accessor});`);
      doc.write(`if (${outputVar} === INVALID) return INVALID;`);
      return outputVar;
    }
    return accessor;
  }
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_compile };
