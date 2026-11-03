/**
 * utils/mcp/elicitationValidation.ts
 *
 * 并入旧版已有路径：elicitation 校验。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mcp/elicitationValidation.ts
 * pieces: chunk-18hwfzwa.js (24), chunk-e6aww6q8.js (1), chunk-s4bxxzsw.js (1)
 * attribution: affinity 1, fingerprint 11, layout 2, file-local 3, placement 9
 */
import { VJt, U, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { plural } from "../stringUtils.js";
import { F1e, v1i } from "../../../vendor/zod/v4/classic/compat.js";
import { jsonStringify } from "../slowOperations.js";
import { parseNaturalLanguageDateTime } from "./dateTimeParser.js";
import {
  labelOrEmpty,
  markBrokenSequences,
  replaceLineBreaks,
  stripUnsafeChars,
} from "../permissions/approvalPayloadSerialization.js";
import { modelSupportsStructuredOutputs, n8 } from "../betas.js";
import { Qve } from "../../services/api/claude.js";

//@ chunk-18hwfzwa.js:1201454-1201517 affinity
function looksLikeIsoDate(h) {
  return /^\d{4}-\d{2}-\d{2}(T|$)/.test(h.trim());
}
//@ chunk-18hwfzwa.js:1201517-1201578 fingerprint = isEnumSchema (1)
var isEnumSchema = (schema) => schema.type === "string" && ("enum" in schema || "oneOf" in schema);
//@ chunk-18hwfzwa.js:1201578-1201716 fingerprint = isMultiSelectEnumSchema (1)
function isMultiSelectEnumSchema(schema) {
  return (
    schema.type === "array" &&
    "items" in schema &&
    typeof schema.items === "object" &&
    schema.items !== null &&
    ("enum" in schema.items || "anyOf" in schema.items)
  );
}
//@ chunk-18hwfzwa.js:1201716-1201808 layout
function isConstOption(h) {
  return h !== null && typeof h === "object" && "const" in h && typeof h.const === "string";
}
//@ chunk-18hwfzwa.js:1201808-1201850 layout
function isString(h) {
  return typeof h === "string";
}
/**
 * getMultiSelectValues：多选 schema（items.anyOf 的 const 或 items.enum）的取值列表。
 */
//@ chunk-18hwfzwa.js:1201850-1202070 fingerprint = getMultiSelectValues (1)
function getMultiSelectValues(schema) {
  if ("anyOf" in schema.items) {
    if (!Array.isArray(schema.items.anyOf)) return [];
    return schema.items.anyOf.filter(isConstOption).map((item) => item.const);
  }
  if ("enum" in schema.items)
    return Array.isArray(schema.items.enum) ? schema.items.enum.filter(isString) : [];
  return [];
}
/**
 * getMultiSelectLabels：多选 schema 的显示标签（anyOf 的 title 或 enum 值）。
 */
//@ chunk-18hwfzwa.js:1202070-1202291 fingerprint = getMultiSelectLabels (1)
function getMultiSelectLabels(schema) {
  if ("anyOf" in schema.items) {
    if (!Array.isArray(schema.items.anyOf)) return [];
    return schema.items.anyOf.filter(isConstOption).map((item) => item.title);
  }
  if ("enum" in schema.items)
    return Array.isArray(schema.items.enum) ? schema.items.enum.filter(isString) : [];
  return [];
}
//@ chunk-18hwfzwa.js:1202291-1202358 file-local
function getMultiSelectLabel(schema, value) {
  let index = getMultiSelectValues(schema).indexOf(value);
  return index >= 0 ? (getMultiSelectLabels(schema)[index] ?? value) : value;
}
/**
 * getEnumValues：单选 schema（oneOf const 或 enum）的取值列表。
 */
//@ chunk-18hwfzwa.js:1202358-1202542 fingerprint = getEnumValues (1)
function getEnumValues(schema) {
  if ("oneOf" in schema) {
    if (!Array.isArray(schema.oneOf)) return [];
    return schema.oneOf.filter(isConstOption).map((item) => item.const);
  }
  if ("enum" in schema) return Array.isArray(schema.enum) ? schema.enum.filter(isString) : [];
  return [];
}
/**
 * getEnumLabels：单选 schema 的显示标签（oneOf title、enumNames 或 enum 值）。
 */
//@ chunk-18hwfzwa.js:1202542-1202837 fingerprint = getEnumLabels (1)
function getEnumLabels(schema) {
  if ("oneOf" in schema) {
    if (!Array.isArray(schema.oneOf)) return [];
    return schema.oneOf.filter(isConstOption).map((item) => item.title);
  }
  if ("enum" in schema) {
    if (!Array.isArray(schema.enum)) return [];
    let x = "enumNames" in schema ? schema.enumNames : void 0;
    if (Array.isArray(x)) return x.filter((D, L) => isString(schema.enum[L]));
    return schema.enum.filter(isString);
  }
  return [];
}
//@ chunk-18hwfzwa.js:1202837-1202904 file-local
function getEnumLabel(schema, value) {
  let index = getEnumValues(schema).indexOf(value);
  return index >= 0 ? (getEnumLabels(schema)[index] ?? value) : value;
}
/**
 * getZodSchema：把 elicitation 的原始属性 schema 转成 zod（枚举、字符串长度与 email/uri/date/date-time 格式、数字范围/整数、布尔），错误消息面向用户。
 */
//@ chunk-18hwfzwa.js:1202904-1204340 fingerprint = getZodSchema (0.947)
function getZodSchema(schema) {
  if (isEnumSchema(schema)) {
    let [x, ...D] = getEnumValues(schema);
    if (!x) return VJt();
    return U([x, ...D]);
  }
  if (schema.type === "string") {
    let x = o();
    if (schema.minLength !== void 0)
      x = x.min(schema.minLength, {
        message: `Must be at least ${schema.minLength} ${plural(schema.minLength, "character")}`,
      });
    if (schema.maxLength !== void 0)
      x = x.max(schema.maxLength, {
        message: `Must be at most ${schema.maxLength} ${plural(schema.maxLength, "character")}`,
      });
    switch (schema.format) {
      case "email":
        x = x.email({ message: "Must be a valid email address, e.g. user@example.com" });
        break;
      case "uri":
        x = x.url({ message: "Must be a valid URI, e.g. https://example.com" });
        break;
      case "date":
        x = x.date("Must be a valid date, e.g. 2024-03-15, today, next Monday");
        break;
      case "date-time":
        x = x.datetime({
          offset: !0,
          message: "Must be a valid date-time, e.g. 2024-03-15T14:30:00Z, tomorrow at 3pm",
        });
        break;
      default:
        break;
    }
    return x;
  }
  if (schema.type === "number" || schema.type === "integer") {
    let x = schema.type === "integer" ? "an integer" : "a number",
      isInteger = schema.type === "integer",
      formatNum = (Re) => (Number.isInteger(Re) && !isInteger ? `${Re}.0` : String(Re)),
      ee =
        schema.minimum !== void 0 && schema.maximum !== void 0
          ? `Must be ${x} between ${formatNum(schema.minimum)} and ${formatNum(schema.maximum)}`
          : schema.minimum !== void 0
            ? `Must be ${x} >= ${formatNum(schema.minimum)}`
            : schema.maximum !== void 0
              ? `Must be ${x} <= ${formatNum(schema.maximum)}`
              : `Must be ${x}`,
      ke = F1e({ error: ee });
    if (schema.type === "integer") ke = ke.int({ message: ee });
    if (schema.minimum !== void 0) ke = ke.min(schema.minimum, { message: ee });
    if (schema.maximum !== void 0) ke = ke.max(schema.maximum, { message: ee });
    return ke;
  }
  if (schema.type === "boolean") return v1i();
  throw Error(`Unsupported schema: ${jsonStringify(schema)}`);
}
/**
 * validateElicitationInput：用 getZodSchema 校验输入字符串，返回 {isValid, value|error}。
 */
//@ chunk-18hwfzwa.js:1204340-1204501 fingerprint = validateElicitationInput (1)
function validateElicitationInput(stringValue, schema) {
  let parseResult = getZodSchema(schema).safeParse(stringValue);
  if (parseResult.success) return { value: parseResult.data, isValid: !0 };
  return { isValid: !1, error: parseResult.error.issues.map((issue) => issue.message).join("; ") };
}
//@ chunk-18hwfzwa.js:1204501-1204600 fingerprint = isDateTimeSchema (1)
function isDateTimeSchema(schema) {
  return (
    schema.type === "string" &&
    "format" in schema &&
    (schema.format === "date" || schema.format === "date-time")
  );
}
/**
 * validateElicitationInputAsync：同步校验失败且字段为 date/date-time、输入不像 ISO 日期时，调用 parseNaturalLanguageDateTime 解析后再校验。
 */
//@ chunk-18hwfzwa.js:1204600-1204791 fingerprint = validateElicitationInputAsync (1)
async function validateElicitationInputAsync(stringValue, schema, signal, credentials) {
  let syncResult = validateElicitationInput(stringValue, schema);
  if (syncResult.isValid) return syncResult;
  if (isDateTimeSchema(schema) && !looksLikeIsoDate(stringValue)) {
    let ke = await parseNaturalLanguageDateTime(stringValue, schema.format, signal, credentials);
    if (ke.success) {
      let validatedParsed = validateElicitationInput(ke.value, schema);
      if (validatedParsed.isValid) return validatedParsed;
    }
  }
  return syncResult;
}
//@ chunk-18hwfzwa.js:1204899-1204941 placement
var Pdt = 8000,
  hRo = /[()\][%!^"`<>&|;, *?]/g;
/**
 * 估算 URL 字段的编码成本（长度加上需转义字符的额外开销）。
 */
//@ chunk-18hwfzwa.js:1204941-1205061 placement
function elicitationUrlCost(h) {
  return (
    h.length +
    3 * (h.match(hRo)?.length ?? 0) +
    4 * (h.match(/"/g)?.length ?? 0) +
    (h.match(/\\/g)?.length ?? 0) +
    16
  );
}
//@ chunk-18hwfzwa.js:1205061-1205081 placement
var yRo = 1000,
  bRo = 16;
//@ chunk-18hwfzwa.js:1205081-1205109 placement
function QL(h) {
  return labelOrEmpty(h);
}
//@ chunk-18hwfzwa.js:1205109-1205190 placement
var wRo = 12,
  zL = (h) => ["string", "number", "integer"].includes(h.type),
  Mdt = "********";
//@ chunk-18hwfzwa.js:1205353-1205437 placement
function ETe(h) {
  return h === void 0 || h === null || h === "" || (Array.isArray(h) && h.length === 0);
}
//@ chunk-18hwfzwa.js:1205437-1205530 placement
function C9(h) {
  return Object.entries(h ?? {}).filter((x) => typeof x[1] === "object" && x[1] !== null);
}
/**
 * 解析表单字段输入：空值为未设置或保留空串，否则校验并返回值与错误。
 */
//@ chunk-18hwfzwa.js:1205530-1205755 placement
function parseElicitationField(h, x) {
  if (x.trim() === "")
    return h.type !== "string" || ("format" in h && h.format !== void 0)
      ? { kind: "unset" }
      : { kind: "keepEmptyIfSet" };
  let L = validateElicitationInput(x, h);
  return L.isValid ? { kind: "set", value: L.value } : { kind: "set", value: x, error: L.error };
}
/**
 * 把预填值还原为表单值：多选只保留合法选项，布尔原样，其余字符串化后校验。
 */
//@ chunk-18hwfzwa.js:1205755-1206341 placement
function restoreElicitationValue(h, x) {
  if (x === void 0) return;
  if (isMultiSelectEnumSchema(h)) {
    if (!Array.isArray(x)) return;
    let D = x.length;
    if (typeof D !== "number" || !Number.isSafeInteger(D) || D < 0) return;
    let L = getMultiSelectValues(h),
      ee = [];
    for (let ke = 0; ke < D; ke++) {
      let Re = x[ke];
      if (typeof Re !== "string") return;
      let Be = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(Re)));
      if (!L.includes(Be)) continue;
      ee.push(Be);
    }
    return ee.length > 0 ? { value: ee } : void 0;
  }
  if (h.type === "boolean") return typeof x === "boolean" ? { value: x } : void 0;
  if (zL(h) && (typeof x === "string" || typeof x === "number" || typeof x === "boolean")) {
    let D = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(String(x)))),
      L = parseElicitationField(h, D);
    return L.kind === "set" ? { value: L.value, error: L.error } : void 0;
  }
  return;
}
//@ chunk-e6aww6q8.js:2651592-2651710 fingerprint = hasStringFormat (1)
function hasStringFormat(e, n, r, s) {
  if (!e || "format" in n || !modelSupportsStructuredOutputs(s) || Qve(s)) return !1;
  if (((n.format = e), !r.includes(n8))) r.push(n8);
  return !0;
}
//@ chunk-s4bxxzsw.js:7715-7745 file-local
var STRING_FORMATS = new Set(["date-time"]);

export {
  C9,
  yRo,
  restoreElicitationValue,
  zL,
  isEnumSchema,
  isMultiSelectEnumSchema,
  isDateTimeSchema,
  parseElicitationField,
  validateElicitationInputAsync,
  getMultiSelectValues,
  getMultiSelectLabel,
  getEnumValues,
  getEnumLabel,
  ETe,
  bRo,
  wRo,
  QL,
  elicitationUrlCost,
  Pdt,
  Mdt,
  hasStringFormat,
  STRING_FORMATS,
};
