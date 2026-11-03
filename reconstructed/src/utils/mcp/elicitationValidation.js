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
import { never, _enum, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { plural } from "../stringUtils.js";
import { F1e, v1i } from "../../../vendor/zod/v4/classic/compat.js";
import { jsonStringify } from "../slowOperations.js";
import { parseNaturalLanguageDateTime } from "./dateTimeParser.js";
import {
  labelOrEmpty as labelOrEmpty_2,
  markBrokenSequences,
  replaceLineBreaks,
  stripUnsafeChars,
} from "../permissions/approvalPayloadSerialization.js";
import { modelSupportsStructuredOutputs, BETA_STRUCTURED_OUTPUTS } from "../betas.js";
import { isStructuredOutputsUnsupportedClaude } from "../../services/api/claude.js";

//@ chunk-18hwfzwa.js:1201454-1201517 affinity
function looksLikeIsoDate(stringValue) {
  return /^\d{4}-\d{2}-\d{2}(T|$)/.test(stringValue.trim());
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
function isConstOption(schema) {
  return (
    schema !== null && typeof schema === "object" && "const" in schema && typeof schema.const === "string"
  );
}
//@ chunk-18hwfzwa.js:1201808-1201850 layout
function isString(h) {
  return typeof h === "string";
}
//@ chunk-18hwfzwa.js:1201850-1202070 fingerprint = getMultiSelectValues (1)
/**
 * getMultiSelectValues：多选 schema（items.anyOf 的 const 或 items.enum）的取值列表。
 */
function getMultiSelectValues(schema) {
  if ("anyOf" in schema.items) {
    if (!Array.isArray(schema.items.anyOf)) return [];
    return schema.items.anyOf.filter(isConstOption).map((item) => item.const);
  }
  if ("enum" in schema.items)
    return Array.isArray(schema.items.enum) ? schema.items.enum.filter(isString) : [];
  return [];
}
//@ chunk-18hwfzwa.js:1202070-1202291 fingerprint = getMultiSelectLabels (1)
/**
 * getMultiSelectLabels：多选 schema 的显示标签（anyOf 的 title 或 enum 值）。
 */
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
//@ chunk-18hwfzwa.js:1202358-1202542 fingerprint = getEnumValues (1)
/**
 * getEnumValues：单选 schema（oneOf const 或 enum）的取值列表。
 */
function getEnumValues(schema) {
  if ("oneOf" in schema) {
    if (!Array.isArray(schema.oneOf)) return [];
    return schema.oneOf.filter(isConstOption).map((item) => item.const);
  }
  if ("enum" in schema) return Array.isArray(schema.enum) ? schema.enum.filter(isString) : [];
  return [];
}
//@ chunk-18hwfzwa.js:1202542-1202837 fingerprint = getEnumLabels (1)
/**
 * getEnumLabels：单选 schema 的显示标签（oneOf title、enumNames 或 enum 值）。
 */
function getEnumLabels(schema) {
  if ("oneOf" in schema) {
    if (!Array.isArray(schema.oneOf)) return [];
    return schema.oneOf.filter(isConstOption).map((item) => item.title);
  }
  if ("enum" in schema) {
    if (!Array.isArray(schema.enum)) return [];
    let enumNames = "enumNames" in schema ? schema.enumNames : undefined;
    if (Array.isArray(enumNames)) return enumNames.filter((enumName, L) => isString(schema.enum[L]));
    return schema.enum.filter(isString);
  }
  return [];
}
//@ chunk-18hwfzwa.js:1202837-1202904 file-local
function getEnumLabel(schema, value) {
  let index = getEnumValues(schema).indexOf(value);
  return index >= 0 ? (getEnumLabels(schema)[index] ?? value) : value;
}
//@ chunk-18hwfzwa.js:1202904-1204340 fingerprint = getZodSchema (0.947)
/**
 * getZodSchema：把 elicitation 的原始属性 schema 转成 zod（枚举、字符串长度与 email/uri/date/date-time 格式、数字范围/整数、布尔），错误消息面向用户。
 */
function getZodSchema(schema) {
  if (isEnumSchema(schema)) {
    let [first, ...rest] = getEnumValues(schema);
    if (!first) return never();
    return _enum([first, ...rest]);
  }
  if (schema.type === "string") {
    let stringSchema = string();
    if (schema.minLength !== undefined)
      stringSchema = stringSchema.min(schema.minLength, {
        message: `Must be at least ${schema.minLength} ${plural(schema.minLength, "character")}`,
      });
    if (schema.maxLength !== undefined)
      stringSchema = stringSchema.max(schema.maxLength, {
        message: `Must be at most ${schema.maxLength} ${plural(schema.maxLength, "character")}`,
      });
    switch (schema.format) {
      case "email":
        stringSchema = stringSchema.email({
          message: "Must be a valid email address, e.g. user@example.com",
        });
        break;
      case "uri":
        stringSchema = stringSchema.url({
          message: "Must be a valid URI, e.g. https://example.com",
        });
        break;
      case "date":
        stringSchema = stringSchema.date("Must be a valid date, e.g. 2024-03-15, today, next Monday");
        break;
      case "date-time":
        stringSchema = stringSchema.datetime({
          offset: true,
          message: "Must be a valid date-time, e.g. 2024-03-15T14:30:00Z, tomorrow at 3pm",
        });
        break;
      default:
        break;
    }
    return stringSchema;
  }
  if (schema.type === "number" || schema.type === "integer") {
    let typeLabel = schema.type === "integer" ? "an integer" : "a number";
    let isInteger = schema.type === "integer";
    let formatNum = (n) => (Number.isInteger(n) && !isInteger ? `${n}.0` : String(n));
    let rangeMsg =
      schema.minimum !== undefined && schema.maximum !== undefined
        ? `Must be ${typeLabel} between ${formatNum(schema.minimum)} and ${formatNum(schema.maximum)}`
        : schema.minimum !== undefined
          ? `Must be ${typeLabel} >= ${formatNum(schema.minimum)}`
          : schema.maximum !== undefined
            ? `Must be ${typeLabel} <= ${formatNum(schema.maximum)}`
            : `Must be ${typeLabel}`;
    let numberSchema = F1e({
      error: rangeMsg,
    });
    if (schema.type === "integer")
      numberSchema = numberSchema.int({
        message: rangeMsg,
      });
    if (schema.minimum !== undefined)
      numberSchema = numberSchema.min(schema.minimum, {
        message: rangeMsg,
      });
    if (schema.maximum !== undefined)
      numberSchema = numberSchema.max(schema.maximum, {
        message: rangeMsg,
      });
    return numberSchema;
  }
  if (schema.type === "boolean") return v1i();
  throw Error(`Unsupported schema: ${jsonStringify(schema)}`);
}
//@ chunk-18hwfzwa.js:1204340-1204501 fingerprint = validateElicitationInput (1)
/**
 * validateElicitationInput：用 getZodSchema 校验输入字符串，返回 {isValid, value|error}。
 */
function validateElicitationInput(stringValue, schema) {
  let parseResult = getZodSchema(schema).safeParse(stringValue);
  if (parseResult.success)
    return {
      value: parseResult.data,
      isValid: true,
    };
  return {
    isValid: false,
    error: parseResult.error.issues.map((e) => e.message).join("; "),
  };
}
//@ chunk-18hwfzwa.js:1204501-1204600 fingerprint = isDateTimeSchema (1)
function isDateTimeSchema(schema) {
  return (
    schema.type === "string" &&
    "format" in schema &&
    (schema.format === "date" || schema.format === "date-time")
  );
}
//@ chunk-18hwfzwa.js:1204600-1204791 fingerprint = validateElicitationInputAsync (1)
/**
 * validateElicitationInputAsync：同步校验失败且字段为 date/date-time、输入不像 ISO 日期时，调用 parseNaturalLanguageDateTime 解析后再校验。
 */
async function validateElicitationInputAsync(stringValue, schema, signal, credentials) {
  let syncResult = validateElicitationInput(stringValue, schema);
  if (syncResult.isValid) return syncResult;
  if (isDateTimeSchema(schema) && !looksLikeIsoDate(stringValue)) {
    let parseResult = await parseNaturalLanguageDateTime(stringValue, schema.format, signal, credentials);
    if (parseResult.success) {
      let validatedParsed = validateElicitationInput(parseResult.value, schema);
      if (validatedParsed.isValid) return validatedParsed;
    }
  }
  return syncResult;
}
//@ chunk-18hwfzwa.js:1204899-1204941 placement
/**
 * URL 字段成本估算的上限与需转义字符正则。
 */
var MAX_URL_COST_CHARS = 8000;
var URL_ESCAPE_CHARS_RE = /[()\][%!^"`<>&|;, *?]/g;
//@ chunk-18hwfzwa.js:1204941-1205061 placement
/**
 * 估算 URL 字段的编码成本（长度加上需转义字符的额外开销）。
 */
function elicitationUrlCost(h) {
  return (
    h.length +
    3 * (h.match(URL_ESCAPE_CHARS_RE)?.length ?? 0) +
    4 * (h.match(/"/g)?.length ?? 0) +
    (h.match(/\\/g)?.length ?? 0) +
    16
  );
}
//@ chunk-18hwfzwa.js:1205061-1205081 placement
/**
 * URL 字段字符上限与分片数上限。
 */
var MAX_URL_FIELD_CHARS = 1000;
var MAX_URL_PARTS = 16;
//@ chunk-18hwfzwa.js:1205081-1205109 placement
/**
 * 取字段标签，无标签返回空串。
 */
function labelOrEmpty(serverName) {
  return labelOrEmpty_2(serverName);
}
//@ chunk-18hwfzwa.js:1205109-1205190 placement
/**
 * 枚举标签的展示宽度、标量类型判定与脱敏占位文本。
 */
var MAX_ENUM_LABEL_CHARS = 12;
var isScalarSchemaType = (schema) => ["string", "number", "integer"].includes(schema.type);
var REDACTED_FIELD_TEXT = "********";
//@ chunk-18hwfzwa.js:1205353-1205437 placement
/**
 * 判断值是否为空（undefined/null/空串/空数组）。
 */
function isBlankValue(h) {
  return h === undefined || h === null || h === "" || (Array.isArray(h) && h.length === 0);
}
//@ chunk-18hwfzwa.js:1205437-1205530 placement
/**
 * 取对象中值为对象类型的字段条目。
 */
function objectFieldEntries(properties) {
  return Object.entries(properties ?? {}).filter((x) => typeof x[1] === "object" && x[1] !== null);
}
//@ chunk-18hwfzwa.js:1205530-1205755 placement
/**
 * 解析表单字段输入：空值为未设置或保留空串，否则校验并返回值与错误。
 */
function parseElicitationField(schema, stringValue) {
  if (stringValue.trim() === "")
    return schema.type !== "string" || ("format" in schema && schema.format !== undefined)
      ? {
          kind: "unset",
        }
      : {
          kind: "keepEmptyIfSet",
        };
  let L = validateElicitationInput(stringValue, schema);
  return L.isValid
    ? {
        kind: "set",
        value: L.value,
      }
    : {
        kind: "set",
        value: stringValue,
        error: L.error,
      };
}
//@ chunk-18hwfzwa.js:1205755-1206341 placement
/**
 * 把预填值还原为表单值：多选只保留合法选项，布尔原样，其余字符串化后校验。
 */
function restoreElicitationValue(propSchema, x) {
  if (x === undefined) return;
  if (isMultiSelectEnumSchema(propSchema)) {
    if (!Array.isArray(x)) return;
    let D = x.length;
    if (typeof D !== "number" || !Number.isSafeInteger(D) || D < 0) return;
    let multiSelectValues = getMultiSelectValues(propSchema);
    let ee = [];
    for (let idx = 0; idx < D; idx++) {
      let Re = x[idx];
      if (typeof Re !== "string") return;
      let Be = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(Re)));
      if (!multiSelectValues.includes(Be)) continue;
      ee.push(Be);
    }
    return ee.length > 0
      ? {
          value: ee,
        }
      : undefined;
  }
  if (propSchema.type === "boolean")
    return typeof x === "boolean"
      ? {
          value: x,
        }
      : undefined;
  if (
    isScalarSchemaType(propSchema) &&
    (typeof x === "string" || typeof x === "number" || typeof x === "boolean")
  ) {
    let D = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(String(x))));
    let elicitationField = parseElicitationField(propSchema, D);
    return elicitationField.kind === "set"
      ? {
          value: elicitationField.value,
          error: elicitationField.error,
        }
      : undefined;
  }
  return;
}
//@ chunk-e6aww6q8.js:2651592-2651710 fingerprint = hasStringFormat (1)
function hasStringFormat(outputFormat, outputConfig, r, model) {
  if (
    !outputFormat ||
    "format" in outputConfig ||
    !modelSupportsStructuredOutputs(model) ||
    isStructuredOutputsUnsupportedClaude(model)
  )
    return false;
  outputConfig.format = outputFormat;
  if (!r.includes(BETA_STRUCTURED_OUTPUTS)) r.push(BETA_STRUCTURED_OUTPUTS);
  return true;
}
//@ chunk-s4bxxzsw.js:7715-7745 file-local
var STRING_FORMATS = new Set(["date-time"]);
export {
  objectFieldEntries,
  MAX_URL_FIELD_CHARS,
  restoreElicitationValue,
  isScalarSchemaType,
  isEnumSchema,
  isMultiSelectEnumSchema,
  isDateTimeSchema,
  parseElicitationField,
  validateElicitationInputAsync,
  getMultiSelectValues,
  getMultiSelectLabel,
  getEnumValues,
  getEnumLabel,
  isBlankValue,
  MAX_URL_PARTS,
  MAX_ENUM_LABEL_CHARS,
  labelOrEmpty,
  elicitationUrlCost,
  MAX_URL_COST_CHARS,
  REDACTED_FIELD_TEXT,
  hasStringFormat,
  STRING_FORMATS,
};
