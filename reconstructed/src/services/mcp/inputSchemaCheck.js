/**
 * services/mcp/inputSchemaCheck.ts
 *
 * MCP 工具输入 schema 预检（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1r4fv9mg.js (8)
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
import { uniq } from "../../utils/collections.js";
import { truncatedEscaped, parseJsonPointer } from "../fileInputs/attachmentText.js";

//@ chunk-1r4fv9mg.js:14963-15035 placement
/**
 * 错误描述里最多列出的条目数（5）。
 */
var JSON_SCHEMA_2020_12 = "https://json-schema.org/draft/2020-12/schema";
var MAX_LISTED_ISSUES = 5;
var weakMap = new WeakMap();
//@ chunk-1r4fv9mg.js:15035-15712 placement
function checkMcpInputSchema(e, { tool, feature }) {
  if (!isPlainObject(e)) return null;
  let n = weakMap.get(e);
  if (n !== undefined) return n;
  if (isDisklessContext()) {
    logForDebugging(
      `[${tool}] input schema not checked before the call: sessions that share a process compile no schemas, so the server checks it`,
    );
    weakMap.set(e, null);
    return null;
  }
  let o = null;
  let $schema = e.$schema;
  if ($schema === undefined || $schema === JSON_SCHEMA_2020_12 || $schema === `${JSON_SCHEMA_2020_12}#`)
    try {
      let { Ajv2020 } = require_2020();
      o = new Ajv2020({
        allErrors: true,
        strict: false,
        validateFormats: false,
      }).compile(e);
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
  if (o === null) logFeatureSad(feature, "input_schema_not_checked");
  weakMap.set(e, o);
  return o;
}
//@ chunk-1r4fv9mg.js:15712-15890 placement
var COMBINATOR_KEYWORDS = new Set(["allOf", "anyOf", "contains", "if", "oneOf"]);
var TYPE_DESCRIPTIONS = {
  array: "a list",
  boolean: "true or false",
  integer: "a whole number",
  number: "a number",
  object: "an object",
  string: "text",
};
//@ chunk-1r4fv9mg.js:15890-17861 placement
function describeSchemaViolation(e, r, a) {
  let n = checkMcpInputSchema(r, a);
  if (n === null || n(e)) return;
  let o = isPlainObject(r) && isPlainObject(r.properties) ? Object.keys(r.properties) : [];
  let i = new Set(isPlainObject(r) && Array.isArray(r.required) ? r.required : []);
  let { ignoreInside } = a;
  let filtered = (n.errors ?? []).filter(
    (c) =>
      ignoreInside === undefined ||
      (!c.instancePath.startsWith(`/${ignoreInside}/`) &&
        !(c.instancePath === `/${ignoreInside}` && COMBINATOR_KEYWORDS.has(c.keyword))),
  );
  if (filtered.length === 0) return;
  let flattened = filtered.flatMap((c) => {
    let additionalProperty = c.params.additionalProperty;
    return c.keyword === "additionalProperties" &&
      c.instancePath === "" &&
      typeof additionalProperty === "string"
      ? [additionalProperty]
      : [];
  });
  let p = new Map(flattened.map((c) => [c, o.find((l) => namesLookRelated(c, l))]));
  let g = uniq([
    ...flattened.map((c) => {
      let l = p.get(c);
      return `it has no argument ${truncatedEscaped(c)}${l === undefined ? "" : ` (did you mean ${truncatedEscaped(l)}?)`}`;
    }),
    ...filtered.flatMap((c) => {
      let jsonPointer = parseJsonPointer(c.instancePath);
      let params = c.params;
      switch (c.keyword) {
        case "additionalProperties":
          return jsonPointer === undefined
            ? []
            : [`${jsonPointer} has no field ${truncatedEscaped(String(params.additionalProperty))}`];
        case "required": {
          let q = String(params.missingProperty);
          if (jsonPointer !== undefined) return [`${jsonPointer} needs the field ${truncatedEscaped(q)}`];
          return [...p.values()].includes(q) ? [] : [`the argument ${truncatedEscaped(q)} is required`];
        }
        case "type": {
          let filtered = (Array.isArray(params.type) ? params.type : [params.type]).filter(
            (w) => w !== "null",
          );
          return filtered.length === 0
            ? []
            : [
                `${jsonPointer ?? "the arguments"} must be ${filtered.map((w) => TYPE_DESCRIPTIONS[String(w)] ?? String(w)).join(" or ")}`,
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
      return [`${jsonPointer ?? "the arguments"} ${c.message ?? "are not valid"}`];
    }),
  ]);
  if (g.length === 0) return;
  let h = g.length > MAX_LISTED_ISSUES ? `, and ${g.length - MAX_LISTED_ISSUES} more` : "";
  let mapped = o.map((c) => (i.has(c) ? `${c} (required)` : c));
  return {
    listed: `${g.slice(0, MAX_LISTED_ISSUES).join("; ")}${h}`,
    takes: mapped.length === 0 ? "" : ` ${a.tool} takes ${mapped.join(", ")}.`,
  };
}
//@ chunk-1r4fv9mg.js:17861-18019 placement
function namesLookRelated(e, r) {
  let lower = e.toLowerCase();
  let lower_2 = r.toLowerCase();
  return (
    lower === lower_2 ||
    lower_2.endsWith(`_${lower}`) ||
    lower_2.startsWith(`${lower}_`) ||
    lower.endsWith(`_${lower_2}`) ||
    lower.startsWith(`${lower_2}_`)
  );
}
//@ chunk-1r4fv9mg.js:18054-18067 placement
/**
 * 文件路径参数的最大字符数（4096）。
 */
var MAX_FILE_PATH_CHARS = 4096;
//@ chunk-1r4fv9mg.js:18067-18858 placement
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
  let s = [];
  for (let entry of entries) {
    if (!isPlainObject(entry)) return badFileEntryError(spec);
    if (entry[ref] !== undefined)
      return {
        error: `${paths} file entries must give a \`${local}\`; this client uploads the file and fills in the ${refWord} itself. If these ${refWord}s came from an approval given before Claude Code restarted, that approval cannot be reused: call ${paths} again with paths. ${nothingDone}`,
        code: `model_${ref}`,
      };
    let g = entry[local];
    if (typeof g !== "string" || g === "" || g.length > MAX_FILE_PATH_CHARS) return badFileEntryError(spec);
    if (!isAbsolute(g))
      return {
        error: `Cannot attach "${g}": ${paths} file paths must be absolute paths as this session sees them. ${nothingDone}`,
        code: "relative_path",
      };
    s.push(g);
  }
  return s;
}
//@ chunk-1r4fv9mg.js:18858-19089 placement
function badFileEntryError({ tool, arg, local, nothingDone }) {
  return {
    error: `${tool} \`${arg}\` must be a list of objects, each with a \`${local}\` of at most ${MAX_FILE_PATH_CHARS} characters, such as [{"${local}": "/absolute/path/to/report.csv"}]. ${nothingDone}`,
    code: "bad_entry",
  };
}
export { MAX_FILE_PATH_CHARS, validateFileEntries, describeSchemaViolation };
