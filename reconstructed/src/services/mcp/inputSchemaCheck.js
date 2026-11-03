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
import { MPe } from "../../utils/pollEvents.js";
import { logForDebugging } from "../../utils/debug.js";
import { Ce } from "../../../vendor/ajv/dist/2020.js";
import { errorMessage } from "../../utils/errors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import { uniq } from "../../utils/collections.js";
import { truncatedEscaped, parseJsonPointer } from "../fileInputs/attachmentText.js";

//@ chunk-1r4fv9mg.js:14963-15035 placement
var Ee = "https://json-schema.org/draft/2020-12/schema",
  W = 5,
  weakMap = new WeakMap();
//@ chunk-1r4fv9mg.js:15035-15712 placement
function checkMcpInputSchema(e, { tool: tool, feature: feature }) {
  if (!isPlainObject(e)) return null;
  let n = weakMap.get(e);
  if (n !== void 0) return n;
  if (MPe())
    return (
      logForDebugging(
        `[${tool}] input schema not checked before the call: sessions that share a process compile no schemas, so the server checks it`,
      ),
      weakMap.set(e, null),
      null
    );
  let o = null,
    $schema = e.$schema;
  if ($schema === void 0 || $schema === Ee || $schema === `${Ee}#`)
    try {
      let { Ajv2020: Ajv2020 } = Ce();
      o = new Ajv2020({ allErrors: !0, strict: !1, validateFormats: !1 }).compile(e);
    } catch (error) {
      logForDebugging(
        `[${tool}] input schema not checked: Ajv could not compile it: ${errorMessage(error)}`,
        { level: "warn" },
      );
    }
  else
    logForDebugging(
      `[${tool}] input schema not checked: it declares ${jsonStringify($schema)}, and only draft 2020-12 is checked`,
      { level: "warn" },
    );
  if (o === null) logFeatureSad(feature, "input_schema_not_checked");
  return (weakMap.set(e, o), o);
}
//@ chunk-1r4fv9mg.js:15712-15890 placement
var COMBINATOR_KEYWORDS = new Set(["allOf", "anyOf", "contains", "if", "oneOf"]),
  TYPE_DESCRIPTIONS = {
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
  let o = isPlainObject(r) && isPlainObject(r.properties) ? Object.keys(r.properties) : [],
    i = new Set(isPlainObject(r) && Array.isArray(r.required) ? r.required : []),
    { ignoreInside: ignoreInside } = a,
    filtered = (n.errors ?? []).filter(
      (c) =>
        ignoreInside === void 0 ||
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
    }),
    p = new Map(flattened.map((c) => [c, o.find((l) => namesLookRelated(c, l))])),
    g = uniq([
      ...flattened.map((c) => {
        let l = p.get(c);
        return `it has no argument ${truncatedEscaped(c)}${l === void 0 ? "" : ` (did you mean ${truncatedEscaped(l)}?)`}`;
      }),
      ...filtered.flatMap((c) => {
        let l = parseJsonPointer(c.instancePath),
          params = c.params;
        switch (c.keyword) {
          case "additionalProperties":
            return l === void 0
              ? []
              : [`${l} has no field ${truncatedEscaped(String(params.additionalProperty))}`];
          case "required": {
            let q = String(params.missingProperty);
            if (l !== void 0) return [`${l} needs the field ${truncatedEscaped(q)}`];
            return [...p.values()].includes(q) ? [] : [`the argument ${truncatedEscaped(q)} is required`];
          }
          case "type": {
            let filtered = (Array.isArray(params.type) ? params.type : [params.type]).filter(
              (w) => w !== "null",
            );
            return filtered.length === 0
              ? []
              : [
                  `${l ?? "the arguments"} must be ${filtered.map((w) => TYPE_DESCRIPTIONS[String(w)] ?? String(w)).join(" or ")}`,
                ];
          }
          case "minLength":
            return [
              params.limit === 1
                ? `${l ?? "the arguments"} must not be empty`
                : `${l ?? "the arguments"} must be at least ${String(params.limit)} characters`,
            ];
          case "maxLength":
            return [`${l ?? "the arguments"} must be at most ${String(params.limit)} characters`];
          case "maxItems":
            return [`${l ?? "the arguments"} must have at most ${String(params.limit)} entries`];
          case "enum":
            if (Array.isArray(params.allowedValues))
              return [
                `${l ?? "the arguments"} must be one of ${params.allowedValues.map((allowedValue) => jsonStringify(allowedValue)).join(", ")}`,
              ];
            break;
        }
        return [`${l ?? "the arguments"} ${c.message ?? "are not valid"}`];
      }),
    ]);
  if (g.length === 0) return;
  let h = g.length > W ? `, and ${g.length - W} more` : "",
    mapped = o.map((c) => (i.has(c) ? `${c} (required)` : c));
  return {
    listed: `${g.slice(0, W).join("; ")}${h}`,
    takes: mapped.length === 0 ? "" : ` ${a.tool} takes ${mapped.join(", ")}.`,
  };
}
//@ chunk-1r4fv9mg.js:17861-18019 placement
function namesLookRelated(e, r) {
  let lower = e.toLowerCase(),
    lower_2 = r.toLowerCase();
  return (
    lower === lower_2 ||
    lower_2.endsWith(`_${lower}`) ||
    lower_2.startsWith(`${lower}_`) ||
    lower.endsWith(`_${lower_2}`) ||
    lower.startsWith(`${lower_2}_`)
  );
}
//@ chunk-1r4fv9mg.js:18054-18067 placement
var XHe = 4096;
/**
 * 校验文件型工具参数：必须是不超过上限数量的对象列表，每项给出绝对路径（不能自带引用字段），返回路径数组或带错误码的错误。
 */
//@ chunk-1r4fv9mg.js:18067-18858 placement
function validateFileEntries(entries, spec) {
  let {
    tool: paths,
    local: local,
    ref: ref,
    refWord: refWord,
    maxFiles: maxFiles,
    nothingDone: nothingDone,
  } = spec;
  if (!Array.isArray(entries)) return badFileEntryError(spec);
  if (entries.length > maxFiles)
    return {
      error: `${paths} takes at most ${maxFiles} files; this call has ${entries.length}. ${nothingDone}`,
      code: "too_many_files",
    };
  let s = [];
  for (let p of entries) {
    if (!isPlainObject(p)) return badFileEntryError(spec);
    if (p[ref] !== void 0)
      return {
        error: `${paths} file entries must give a \`${local}\`; this client uploads the file and fills in the ${refWord} itself. If these ${refWord}s came from an approval given before Claude Code restarted, that approval cannot be reused: call ${paths} again with paths. ${nothingDone}`,
        code: `model_${ref}`,
      };
    let g = p[local];
    if (typeof g !== "string" || g === "" || g.length > XHe) return badFileEntryError(spec);
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
function badFileEntryError({ tool: tool, arg: arg, local: local, nothingDone: nothingDone }) {
  return {
    error: `${tool} \`${arg}\` must be a list of objects, each with a \`${local}\` of at most ${XHe} characters, such as [{"${local}": "/absolute/path/to/report.csv"}]. ${nothingDone}`,
    code: "bad_entry",
  };
}

export { XHe, validateFileEntries, describeSchemaViolation };
