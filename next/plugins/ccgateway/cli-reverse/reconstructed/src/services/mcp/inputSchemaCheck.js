/**
 * services/mcp/inputSchemaCheck.ts
 *
 * MCP 工具输入 schema 预检（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1jdkttw7.js (8)
 * attribution: placement 8
 */
import { isAbsolute } from "path";
import { isPlainObject } from "../../utils/objectUtils.js";
import { isDisklessContext } from "../../utils/pollEvents.js";
import { logForDebugging } from "../../utils/debug.js";
import { require_2020 } from "../../../vendor/ajv/dist/2020.js";
import { errorMessage } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { truncatedEscaped, parseJsonPointer } from "../fileInputs/attachmentText.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1jdkttw7.js:14964-15036 placement
/**
 * 错误描述里最多列出的条目数（5）。
 */
var JSON_SCHEMA_2020_12; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_LISTED_ISSUES;
var weakMap;
deferInit("chunk-1jdkttw7.js:14964", () => {
  JSON_SCHEMA_2020_12 = "https://json-schema.org/draft/2020-12/schema";
  MAX_LISTED_ISSUES = 5;
  weakMap = new WeakMap();
});
//@ chunk-1jdkttw7.js:15036-15713 placement
function checkMcpInputSchema(schema, { tool, feature }) {
  if (!isPlainObject(schema)) return null;
  let validator = weakMap.get(schema);
  if (validator !== undefined) return validator;
  if (isDisklessContext()) {
    logForDebugging(
      `[${tool}] input schema not checked before the call: sessions that share a process compile no schemas, so the server checks it`,
    );
    weakMap.set(schema, null);
    return null;
  }
  let validate = null;
  let $schema = schema.$schema;
  if ($schema === undefined || $schema === JSON_SCHEMA_2020_12 || $schema === `${JSON_SCHEMA_2020_12}#`)
    try {
      let { Ajv2020 } = require_2020();
      validate = new Ajv2020({
        allErrors: true,
        strict: false,
        validateFormats: false,
      }).compile(schema);
    } catch (error) {
      logForDebugging(
        `[${tool}] input schema not checked: Ajv could not compile it: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    }
  else
    logForDebugging(
      `[${tool}] input schema not checked: it declares ${jsonStringify($schema)}, and only draft 2020-12 is checked`,
      {
        level: "warn",
      },
    );
  if (validate === null) logFeatureSad(feature, "input_schema_not_checked");
  weakMap.set(schema, validate);
  return validate;
}
//@ chunk-1jdkttw7.js:15713-15891 placement
var COMBINATOR_KEYWORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TYPE_DESCRIPTIONS;
deferInit("chunk-1jdkttw7.js:15713", () => {
  COMBINATOR_KEYWORDS = new Set(["allOf", "anyOf", "contains", "if", "oneOf"]);
  TYPE_DESCRIPTIONS = {
    array: "a list",
    boolean: "true or false",
    integer: "a whole number",
    number: "a number",
    object: "an object",
    string: "text",
  };
});
//@ chunk-1jdkttw7.js:15891-17867 placement
function describeSchemaViolation(input, schema, options) {
  let validate = checkMcpInputSchema(schema, options);
  if (validate === null || validate(input)) return;
  let propertyNames =
    isPlainObject(schema) && isPlainObject(schema.properties) ? Object.keys(schema.properties) : [];
  let requiredNames = new Set(isPlainObject(schema) && Array.isArray(schema.required) ? schema.required : []);
  let { ignoreInside } = options;
  let filtered = (validate.errors ?? []).filter(
    (error) =>
      ignoreInside === undefined ||
      (!error.instancePath.startsWith(`/${ignoreInside}/`) &&
        !(error.instancePath === `/${ignoreInside}` && COMBINATOR_KEYWORDS.has(error.keyword))),
  );
  if (filtered.length === 0) return;
  let flattened = filtered.flatMap((error) => {
    let additionalProperty = error.params.additionalProperty;
    return error.keyword === "additionalProperties" &&
      error.instancePath === "" &&
      typeof additionalProperty === "string"
      ? [additionalProperty]
      : [];
  });
  let suggestionByUnknown = new Map(
    flattened.map((name) => [name, propertyNames.find((candidate) => namesLookRelated(name, candidate))]),
  );
  let issues = normalizeCaseForComparison_2([
    ...flattened.map((name) => {
      let suggestion = suggestionByUnknown.get(name);
      return `it has no argument ${truncatedEscaped(name)}${suggestion === undefined ? "" : ` (did you mean ${truncatedEscaped(suggestion)}?)`}`;
    }),
    ...filtered.flatMap((error) => {
      let jsonPointer = parseJsonPointer(error.instancePath);
      let params = error.params;
      switch (error.keyword) {
        case "additionalProperties":
          return jsonPointer === undefined
            ? []
            : [`${jsonPointer} has no field ${truncatedEscaped(String(params.additionalProperty))}`];
        case "required": {
          let missing = String(params.missingProperty);
          if (jsonPointer !== undefined)
            return [`${jsonPointer} needs the field ${truncatedEscaped(missing)}`];
          return [...suggestionByUnknown.values()].includes(missing)
            ? []
            : [`the argument ${truncatedEscaped(missing)} is required`];
        }
        case "type": {
          let filtered = (Array.isArray(params.type) ? params.type : [params.type]).filter(
            (type) => type !== "null",
          );
          return filtered.length === 0
            ? []
            : [
                `${jsonPointer ?? "the arguments"} must be ${filtered.map((type) => TYPE_DESCRIPTIONS[String(type)] ?? String(type)).join(" or ")}`,
              ];
        }
        case "minLength":
          return [
            params.limit === 1
              ? `${jsonPointer ?? "the arguments"} must not be empty`
              : `${jsonPointer ?? "the arguments"} must be at least ${String(params.limit)} characters`,
          ];
        case "maxLength":
          return [`${jsonPointer ?? "the arguments"} must be at most ${String(params.limit)} characters`];
        case "maxItems":
          return [`${jsonPointer ?? "the arguments"} must have at most ${String(params.limit)} entries`];
        case "enum":
          if (Array.isArray(params.allowedValues))
            return [
              `${jsonPointer ?? "the arguments"} must be one of ${params.allowedValues.map((allowedValue) => jsonStringify(allowedValue)).join(", ")}`,
            ];
          break;
      }
      return [`${jsonPointer ?? "the arguments"} ${error.message ?? "are not valid"}`];
    }),
  ]);
  if (issues.length === 0) return;
  let moreText = issues.length > MAX_LISTED_ISSUES ? `, and ${issues.length - MAX_LISTED_ISSUES} more` : "";
  let mapped = propertyNames.map((name) => (requiredNames.has(name) ? `${name} (required)` : name));
  return {
    listed: `${issues.slice(0, MAX_LISTED_ISSUES).join("; ")}${moreText}`,
    takes: mapped.length === 0 ? "" : ` ${options.tool} takes ${mapped.join(", ")}.`,
  };
}
//@ chunk-1jdkttw7.js:17867-18025 placement
function namesLookRelated(nameA, nameB) {
  let lower = nameA.toLowerCase();
  let lower_2 = nameB.toLowerCase();
  return (
    lower === lower_2 ||
    lower_2.endsWith(`_${lower}`) ||
    lower_2.startsWith(`${lower}_`) ||
    lower.endsWith(`_${lower_2}`) ||
    lower.startsWith(`${lower_2}_`)
  );
}
//@ chunk-1jdkttw7.js:18060-18073 placement
/**
 * 文件路径参数的最大字符数（4096）。
 */
var MAX_FILE_PATH_CHARS = 4096;
//@ chunk-1jdkttw7.js:18073-18864 placement
/**
 * 校验文件型工具参数：必须是不超过上限数量的对象列表，每项给出绝对路径（不能自带引用字段），返回路径数组或带错误码的错误。
 */
function validateFileEntries(entries, spec) {
  let { tool: paths, local, ref, refWord, maxFiles, nothingDone } = spec;
  if (!Array.isArray(entries)) return badFileEntryError(spec);
  if (entries.length > maxFiles)
    return {
      error: `${paths} takes at most ${maxFiles} files; this call has ${entries.length}. ${nothingDone}`,
      code: "too_many_files",
    };
  let paths_2 = [];
  for (let entry of entries) {
    if (!isPlainObject(entry)) return badFileEntryError(spec);
    if (entry[ref] !== undefined)
      return {
        error: `${paths} file entries must give a \`${local}\`; this client uploads the file and fills in the ${refWord} itself. If these ${refWord}s came from an approval given before Claude Code restarted, that approval cannot be reused: call ${paths} again with paths. ${nothingDone}`,
        code: `model_${ref}`,
      };
    let path = entry[local];
    if (typeof path !== "string" || path === "" || path.length > MAX_FILE_PATH_CHARS)
      return badFileEntryError(spec);
    if (!isAbsolute(path))
      return {
        error: `Cannot attach "${path}": ${paths} file paths must be absolute paths as this session sees them. ${nothingDone}`,
        code: "relative_path",
      };
    paths_2.push(path);
  }
  return paths_2;
}
//@ chunk-1jdkttw7.js:18864-19095 placement
function badFileEntryError({ tool, arg, local, nothingDone }) {
  return {
    error: `${tool} \`${arg}\` must be a list of objects, each with a \`${local}\` of at most ${MAX_FILE_PATH_CHARS} characters, such as [{"${local}": "/absolute/path/to/report.csv"}]. ${nothingDone}`,
    code: "bad_entry",
  };
}
export { MAX_FILE_PATH_CHARS, validateFileEntries, describeSchemaViolation };
