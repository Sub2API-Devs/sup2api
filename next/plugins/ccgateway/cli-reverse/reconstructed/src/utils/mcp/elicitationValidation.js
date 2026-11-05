/**
 * utils/mcp/elicitationValidation.ts
 *
 * 并入旧版已有路径：elicitation 校验。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mcp/elicitationValidation.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-czq1j3j2.js (24)
 * attribution: fingerprint 11, affinity 1, layout 2, file-local 2, placement 9
 */
import { modelSupportsStructuredOutputs, BETA_STRUCTURED_OUTPUTS } from "../betas.js";
import { isStructuredOutputsUnsupportedClaude } from "../../services/api/claude.js";
import { never, _enum, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { plural } from "../stringUtils.js";
import { coerceNumber, coerceBoolean } from "../../../vendor/zod/v4/classic/compat.js";
import { jsonStringify } from "../slowOperations.js";
import { parseNaturalLanguageDateTime } from "./dateTimeParser.js";
import {
  labelOrEmpty as labelOrEmpty_2,
  markBrokenSequences,
  replaceLineBreaks,
  stripUnsafeChars,
} from "../permissions/approvalPayloadSerialization.js";

//@ chunk-5xgkngpb.js:2712668-2712786 fingerprint (2.1.88 match: hasStringFormat, 1)
function hasStringFormat(outputFormat, request, betas, model) {
  if (
    !outputFormat ||
    "format" in request ||
    !modelSupportsStructuredOutputs(model) ||
    isStructuredOutputsUnsupportedClaude(model)
  )
    return false;
  request.format = outputFormat;
  if (!betas.includes(BETA_STRUCTURED_OUTPUTS)) betas.push(BETA_STRUCTURED_OUTPUTS);
  return true;
}
//@ chunk-czq1j3j2.js:1231617-1231680 affinity
function looksLikeIsoDate(stringValue) {
  return /^\d{4}-\d{2}-\d{2}(T|$)/.test(stringValue.trim());
}
//@ chunk-czq1j3j2.js:1231680-1231741 fingerprint (2.1.88 match: isEnumSchema, 1)
var isEnumSchema = (schema) => schema.type === "string" && ("enum" in schema || "oneOf" in schema);
//@ chunk-czq1j3j2.js:1231741-1231879 fingerprint (2.1.88 match: isMultiSelectEnumSchema, 1)
function isMultiSelectEnumSchema(schema) {
  return (
    schema.type === "array" &&
    "items" in schema &&
    typeof schema.items === "object" &&
    schema.items !== null &&
    ("enum" in schema.items || "anyOf" in schema.items)
  );
}
//@ chunk-czq1j3j2.js:1231879-1231971 layout
function isConstOption(schema) {
  return (
    schema !== null && typeof schema === "object" && "const" in schema && typeof schema.const === "string"
  );
}
//@ chunk-czq1j3j2.js:1231971-1232013 layout
function isString(value) {
  return typeof value === "string";
}
//@ chunk-czq1j3j2.js:1232013-1232233 fingerprint (2.1.88 match: getMultiSelectValues, 1)
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
//@ chunk-czq1j3j2.js:1232233-1232454 fingerprint (2.1.88 match: getMultiSelectLabels, 1)
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
//@ chunk-czq1j3j2.js:1232454-1232521 file-local
function getMultiSelectLabel(schema, value) {
  let index = getMultiSelectValues(schema).indexOf(value);
  return index >= 0 ? (getMultiSelectLabels(schema)[index] ?? value) : value;
}
//@ chunk-czq1j3j2.js:1232521-1232705 fingerprint (2.1.88 match: getEnumValues, 1)
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
//@ chunk-czq1j3j2.js:1232705-1233000 fingerprint (2.1.88 match: getEnumLabels, 1)
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
    if (Array.isArray(enumNames)) return enumNames.filter((enumName, index) => isString(schema.enum[index]));
    return schema.enum.filter(isString);
  }
  return [];
}
//@ chunk-czq1j3j2.js:1233000-1233067 file-local
function getEnumLabel(schema, value) {
  let index = getEnumValues(schema).indexOf(value);
  return index >= 0 ? (getEnumLabels(schema)[index] ?? value) : value;
}
//@ chunk-czq1j3j2.js:1233067-1234503 fingerprint (2.1.88 match: getZodSchema, 0.947)
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
    let stringSchema_2 = stringSchema();
    if (schema.minLength !== undefined)
      stringSchema_2 = stringSchema_2.min(schema.minLength, {
        message: `Must be at least ${schema.minLength} ${plural(schema.minLength, "character")}`,
      });
    if (schema.maxLength !== undefined)
      stringSchema_2 = stringSchema_2.max(schema.maxLength, {
        message: `Must be at most ${schema.maxLength} ${plural(schema.maxLength, "character")}`,
      });
    switch (schema.format) {
      case "email":
        stringSchema_2 = stringSchema_2.email({
          message: "Must be a valid email address, e.g. user@example.com",
        });
        break;
      case "uri":
        stringSchema_2 = stringSchema_2.url({
          message: "Must be a valid URI, e.g. https://example.com",
        });
        break;
      case "date":
        stringSchema_2 = stringSchema_2.date("Must be a valid date, e.g. 2024-03-15, today, next Monday");
        break;
      case "date-time":
        stringSchema_2 = stringSchema_2.datetime({
          offset: true,
          message: "Must be a valid date-time, e.g. 2024-03-15T14:30:00Z, tomorrow at 3pm",
        });
        break;
      default:
        break;
    }
    return stringSchema_2;
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
    let numberSchema = coerceNumber({
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
  if (schema.type === "boolean") return coerceBoolean();
  throw Error(`Unsupported schema: ${jsonStringify(schema)}`);
}
//@ chunk-czq1j3j2.js:1234503-1234664 fingerprint (2.1.88 match: validateElicitationInput, 1)
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
//@ chunk-czq1j3j2.js:1234664-1234763 fingerprint (2.1.88 match: isDateTimeSchema, 1)
function isDateTimeSchema(schema) {
  return (
    schema.type === "string" &&
    "format" in schema &&
    (schema.format === "date" || schema.format === "date-time")
  );
}
//@ chunk-czq1j3j2.js:1234763-1234954 fingerprint (2.1.88 match: validateElicitationInputAsync, 1)
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
//@ chunk-czq1j3j2.js:1234954-1234996 placement
/**
 * URL 字段成本估算的上限与需转义字符正则。
 */
var MAX_URL_COST_CHARS = 8000;
var URL_ESCAPE_CHARS_RE = /[()\][%!^"`<>&|;, *?]/g;
//@ chunk-czq1j3j2.js:1234996-1235116 placement
/**
 * 估算 URL 字段的编码成本（长度加上需转义字符的额外开销）。
 */
function elicitationUrlCost(url) {
  return (
    url.length +
    3 * (url.match(URL_ESCAPE_CHARS_RE)?.length ?? 0) +
    4 * (url.match(/"/g)?.length ?? 0) +
    (url.match(/\\/g)?.length ?? 0) +
    16
  );
}
//@ chunk-czq1j3j2.js:1235116-1235136 placement
/**
 * URL 字段字符上限与分片数上限。
 */
var MAX_URL_FIELD_CHARS = 1000;
var MAX_URL_PARTS = 16;
//@ chunk-czq1j3j2.js:1235136-1235164 placement
/**
 * 取字段标签，无标签返回空串。
 */
function labelOrEmpty(serverName) {
  return labelOrEmpty_2(serverName);
}
//@ chunk-czq1j3j2.js:1235164-1235245 placement
/**
 * 枚举标签的展示宽度、标量类型判定与脱敏占位文本。
 */
var MAX_ENUM_LABEL_CHARS = 12;
var isScalarSchemaType = (schema) => ["string", "number", "integer"].includes(schema.type);
var REDACTED_FIELD_TEXT = "********";
//@ chunk-czq1j3j2.js:1235408-1235492 placement
/**
 * 判断值是否为空（undefined/null/空串/空数组）。
 */
function isBlankValue(value) {
  return (
    value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)
  );
}
//@ chunk-czq1j3j2.js:1235492-1235585 placement
/**
 * 取对象中值为对象类型的字段条目。
 */
function objectFieldEntries(properties) {
  return Object.entries(properties ?? {}).filter(
    (entry) => typeof entry[1] === "object" && entry[1] !== null,
  );
}
//@ chunk-czq1j3j2.js:1235585-1235810 placement
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
  let validation = validateElicitationInput(stringValue, schema);
  return validation.isValid
    ? {
        kind: "set",
        value: validation.value,
      }
    : {
        kind: "set",
        value: stringValue,
        error: validation.error,
      };
}
//@ chunk-czq1j3j2.js:1235810-1236396 placement
/**
 * 把预填值还原为表单值：多选只保留合法选项，布尔原样，其余字符串化后校验。
 */
function restoreElicitationValue(propSchema, rawValue) {
  if (rawValue === undefined) return;
  if (isMultiSelectEnumSchema(propSchema)) {
    if (!Array.isArray(rawValue)) return;
    let valueCount = rawValue.length;
    if (typeof valueCount !== "number" || !Number.isSafeInteger(valueCount) || valueCount < 0) return;
    let multiSelectValues = getMultiSelectValues(propSchema);
    let selectedValues = [];
    for (let idx = 0; idx < valueCount; idx++) {
      let candidate = rawValue[idx];
      if (typeof candidate !== "string") return;
      let sanitizedValue = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(candidate)));
      if (!multiSelectValues.includes(sanitizedValue)) continue;
      selectedValues.push(sanitizedValue);
    }
    return selectedValues.length > 0
      ? {
          value: selectedValues,
        }
      : undefined;
  }
  if (propSchema.type === "boolean")
    return typeof rawValue === "boolean"
      ? {
          value: rawValue,
        }
      : undefined;
  if (
    isScalarSchemaType(propSchema) &&
    (typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean")
  ) {
    let sanitizedValue = markBrokenSequences(replaceLineBreaks(stripUnsafeChars(String(rawValue))));
    let elicitationField = parseElicitationField(propSchema, sanitizedValue);
    return elicitationField.kind === "set"
      ? {
          value: elicitationField.value,
          error: elicitationField.error,
        }
      : undefined;
  }
  return;
}
export {
  hasStringFormat,
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
};
