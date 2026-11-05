/**
 * ajv/dist/compile/util.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "./codegen/index.js";
import { require_code } from "./codegen/code.js";

//@ chunk-xcs4sv9h.js:17192-20766 cjs-fingerprint
var require_util_2 = __commonJS(function (cjsExports) {
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
  var codegen_1 = require_codegen_2();
  var code_1 = require_code();
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
    let { opts, self: ajv } = it;
    if (!opts.strictSchema) return;
    if (typeof schema === "boolean") return;
    let rules = ajv.RULES.keywords;
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
    return codegen_1._`${topSchemaRef}${schemaPath}${codegen_1.getProperty(keyword)}`;
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
    Object.keys(ps).forEach((p) => gen.assign(codegen_1._`${props}${codegen_1.getProperty(p)}`, true));
  }
  cjsExports.setEvaluated = setEvaluated;
  var snippets = {};
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
    return jsPropertySyntax ? codegen_1.getProperty(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
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
export { require_util_2 };
