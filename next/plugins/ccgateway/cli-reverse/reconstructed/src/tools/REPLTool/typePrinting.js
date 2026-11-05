/**
 * tools/REPLTool/typePrinting.ts
 *
 * 把 JSON Schema 打印成 TypeScript 类型声明，带字符与 schema 预算（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (17)
 * attribution: placement 17
 */
import { createHash } from "crypto";
import { willHideCodeModeOnlyTools, isAsyncReplEnabled } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { withShellTools, isUnavailableShellTool } from "./mcpTools.js";
import { SKILL_2 } from "../SkillTool/skillToolNames.js";
import { isHiddenByCodeModeOnly } from "../../utils/codeMode.js";
import { matchesToolName } from "../../Tool.js";
import { TOOL_SEARCH_TOOL_NAME, isDeferredToolIgnoringTwoToolsMode } from "../ToolSearchTool/prompt.js";
import { shouldForwardRemoteTools, toolToAPISchema } from "../../utils/api.js";
import { POLL } from "../PollTool/prompt.js";
import { isToolSearchEnabledOptimistic } from "../../utils/toolSearch.js";
import { quoteIfNotIdentifier, jsonSchemaToTs } from "../../plugins/functionHooks/types/toolTypesDts.js";
import { isReplTypedEventsOn } from "../../utils/codeMode/typedEvents.js";
import { REPL_TOOL_NAME } from "./constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-n51jggtb.js:42209-42494 placement
/**
 * JSON Schema 打印的限额与白名单常量（文档字符数、schema 数、允许的键）。
 */
var DOC_CHARS_PER_LINE = 120;
var MAX_SCHEMAS_IN_TYPES = 1000;
var MAX_REF_LENGTH = 300;
var SCHEMA_KEY_ORDER = [
  "description",
  "properties",
  "prefixItems",
  "items",
  "type",
  "anyOf",
  "oneOf",
  "allOf",
  "const",
  "enum",
  "required",
];
var MAX_PROPERTY_DEPTH = 3;
var ABBREVIATIONS = new Set(["e.g", "i.e", "vs"]);
var LIST_TOOL_NAME = "list";
var RUN_IN_BACKGROUND_FIELD = "run_in_background";
var SCHEMA_KEYS = ["type", "properties", "items", "anyOf", "oneOf", "allOf", "const", "enum", "$ref"];
//@ chunk-n51jggtb.js:42494-42844 placement
/**
 * 枚举 REPL 可调用的非 MCP 工具，附上各自的输入 schema。
 */
async function listCodeModeOnlyTools(tools, permissionContext) {
  if (!willHideCodeModeOnlyTools(tools)) return [];
  let tools_2 = withShellTools(tools, permissionContext).filter(
    (tool) =>
      tool.isMcp !== true &&
      !tool.name.startsWith(SKILL_2) &&
      isHiddenByCodeModeOnly(tool, tools) &&
      !matchesToolName(tool, TOOL_SEARCH_TOOL_NAME) &&
      tool.name !== LIST_TOOL_NAME &&
      !isUnavailableShellTool(tool),
  );
  let remoteToolForwarding = await shouldForwardRemoteTools(tools_2);
  let pollActive =
    isAsyncReplEnabled() && tools.some((tool) => tool.isMcp !== true && matchesToolName(tool, POLL));
  let toolSearchOn = isToolSearchEnabledOptimistic();
  return tools_2.flatMap((tool) => {
    if (toolSearchOn && isDeferredToolIgnoringTwoToolsMode(tool))
      return [
        {
          name: tool.name,
          schema: undefined,
        },
      ];
    let schema = apiSchemaOf(tool, remoteToolForwarding, pollActive);
    return schema === undefined
      ? []
      : [
          {
            name: tool.name,
            schema,
          },
        ];
  });
}
//@ chunk-n51jggtb.js:42844-43242 placement
/**
 * 把工具与 schema 生成 `interface Tools {…}`。
 */
function buildToolsInterface(entries) {
  let flattened = entries.flatMap(({ name, schema }) =>
    schema === undefined
      ? []
      : [
          `  ${quoteIfNotIdentifier(name)}(input: ${schemaToTs(schema, "  ", DOC_CHARS_PER_LINE, 1 / 0)?.text ?? "unknown"}): Promise<unknown>`,
        ],
  );
  let filtered = entries.filter(({ schema }) => schema === undefined);
  if (filtered.length > 0)
    flattened.push(
      `  // Also callable as tools.<name>(input); describeTool(name) returns each one's input schema: ${filtered
        .map(({ name }) => name)
        .join(", ")}`,
    );
  return flattened.length === 0
    ? ""
    : `interface Tools {
${flattened.join(`
`)}
}`;
}
//@ chunk-n51jggtb.js:43242-43424 placement
/**
 * 在字符与 schema 预算内打印一个 schema 的类型。
 */
function schemaToTs(schema, indent, docChars, charsLeft) {
  let budget = {
    docChars,
    schemasLeft: MAX_SCHEMAS_IN_TYPES,
    charsLeft,
    isWhole: true,
  };
  try {
    return {
      text: jsonSchemaToTs(
        schemaToTsNode(schema, 0, false, schemaDefinitions(schema), new Set(), budget),
        indent,
      ),
      isWhole: budget.isWhole,
    };
  } catch (error) {
    if (error === TYPE_OVER_LIMIT) return;
    throw error;
  }
}
//@ chunk-n51jggtb.js:43424-43719 placement
/**
 * 计算工具列表的指纹（TD + sha256 前 16 位），用于提示词缓存。
 */
function toolSchemaCacheKey(tool, tools, getToolPermissionContext) {
  if (tool.isMcp === true) return;
  if (matchesToolName(tool, POLL)) return isReplTypedEventsOn() ? Promise.resolve("TE:") : undefined;
  if (!matchesToolName(tool, REPL_TOOL_NAME)) return;
  let typedEventsPrefix = isReplTypedEventsOn() ? "TE:" : "";
  if (!willHideCodeModeOnlyTools(tools)) return Promise.resolve(typedEventsPrefix);
  return getToolPermissionContext()
    .then((permissionContext) => listCodeModeOnlyTools(tools, permissionContext))
    .then((toolSchemas) => {
      let digest = createHash("sha256").update(jsonStringify(toolSchemas)).digest("hex");
      return `${typedEventsPrefix}TD${digest.slice(0, 16)}:`;
    });
}
//@ chunk-n51jggtb.js:43776-44026 placement
/**
 * 取工具的 JSON Schema，并去掉 run_in_background 字段。
 */
function apiSchemaOf(tool, remoteToolForwarding, omitRunInBackground) {
  let schema;
  try {
    schema = toolToAPISchema(tool, {
      remoteToolForwarding,
    });
  } catch {
    return;
  }
  if (!isPlainRecord(schema) || (schema.type !== "object" && !isPlainRecord(schema.properties))) return;
  let isShellTool = matchesToolName(tool, BASH_TOOL_NAME) || matchesToolName(tool, POWERSHELL_TOOL_NAME);
  if (!omitRunInBackground || !isShellTool || !isPlainRecord(schema.properties)) return schema;
  let { [RUN_IN_BACKGROUND_FIELD]: runInBackgroundField, ...otherProperties } = schema.properties;
  return {
    ...schema,
    properties: otherProperties,
  };
}
//@ chunk-n51jggtb.js:44026-44131 placement
/**
 * 收集 $defs 与 definitions 引用表。
 */
function schemaDefinitions(schema) {
  let defs = ownField(schema, "$defs");
  let legacyDefs = ownField(schema, "definitions");
  return {
    $defs: isPlainRecord(defs) ? defs : {},
    definitions: isPlainRecord(legacyDefs) ? legacyDefs : {},
  };
}
//@ chunk-n51jggtb.js:44131-44186 placement
/**
 * 取对象的自有属性值。
 */
function ownField(object, field) {
  return Object.hasOwn(object, field) ? object[field] : undefined;
}
//@ chunk-n51jggtb.js:44186-44237 placement
/**
 * 类型打印超限时抛出的哨兵错误。
 */
var TYPE_OVER_LIMIT = Error("the printed type is over its limit");
//@ chunk-n51jggtb.js:44237-44295 placement
/**
 * 扣减剩余字符额度，不足时抛出哨兵。
 */
function spendChars(budget, count) {
  budget.charsLeft -= count;
  if (budget.charsLeft < 0) throw TYPE_OVER_LIMIT;
}
//@ chunk-n51jggtb.js:44295-44336 placement
/**
 * 打印数组并把长度计入额度。
 */
function spendEach(budget, items) {
  spendChars(budget, items.length);
  return items;
}
//@ chunk-n51jggtb.js:44336-44391 placement
/**
 * 估算字面量的打印长度。
 */
function scalarCost(value) {
  return typeof value === "string" ? value.length + 2 : 1;
}
//@ chunk-n51jggtb.js:44391-46371 placement
/**
 * 把 JSON Schema 递归打印成 TypeScript 类型，处理 $ref、anyOf/oneOf/allOf、enum 与嵌套深度。
 */
function schemaToTsNode(schema, depth, withDocs, defs, refStack, budget) {
  if (!isPlainRecord(schema)) return schema;
  spendChars(budget, 1);
  budget.schemasLeft--;
  let properties = isPlainRecord(ownField(schema, "properties"));
  if (budget.schemasLeft < 0 || (properties && depth >= MAX_PROPERTY_DEPTH))
    return fallbackType(schema, withDocs, budget);
  let ref = ownField(schema, "$ref");
  if (typeof ref === "string") {
    let refMatch = ref.length > MAX_REF_LENGTH ? null : /^#\/(\$defs|definitions)\/(.+)$/.exec(ref);
    let definitions = refMatch?.[1] === "$defs" ? defs.$defs : defs.definitions;
    let defName = refMatch?.[2];
    if (defName === undefined || refStack.has(ref) || !Object.hasOwn(definitions, defName))
      return fallbackType(schema, withDocs, budget);
    let refDescription = withDocs ? ownField(schema, "description") : undefined;
    let converted;
    refStack.add(ref);
    try {
      converted = schemaToTsNode(
        definitions[defName],
        depth,
        withDocs && typeof refDescription !== "string",
        defs,
        refStack,
        budget,
      );
    } finally {
      refStack.delete(ref);
    }
    if (typeof refDescription !== "string") return converted;
    if (isPlainRecord(converted))
      return {
        ...converted,
        description: shortenDoc(refDescription, budget),
      };
    return converted === true
      ? {
          description: shortenDoc(refDescription, budget),
        }
      : converted;
  }
  let type = ownField(schema, "type");
  let additionalProperties = ownField(schema, "additionalProperties");
  if (
    !properties &&
    (type === "object" || type === undefined) &&
    additionalProperties !== undefined &&
    additionalProperties !== false
  )
    return fallbackType(schema, withDocs, budget);
  let hasPrefixItems = Array.isArray(ownField(schema, "prefixItems"));
  let convertChild = (childSchema) => schemaToTsNode(childSchema, depth, false, defs, refStack, budget);
  let out = {};
  for (let schemaKey of SCHEMA_KEY_ORDER) {
    if (!Object.hasOwn(schema, schemaKey)) continue;
    let value = schema[schemaKey];
    switch (schemaKey) {
      case "description":
        if (withDocs && typeof value === "string") out.description = shortenDoc(value, budget);
        break;
      case "properties":
        if (isPlainRecord(value))
          out.properties = Object.fromEntries(
            Object.keys(value).map((key) => {
              spendChars(budget, key.length);
              return [key, schemaToTsNode(value[key], depth + 1, true, defs, refStack, budget)];
            }),
          );
        break;
      case "prefixItems":
        if (Array.isArray(value)) out.items = spendEach(budget, value).map(convertChild);
        break;
      case "items":
        if (!hasPrefixItems)
          out.items = Array.isArray(value) ? spendEach(budget, value).map(convertChild) : convertChild(value);
        break;
      case "type":
        out.type = Array.isArray(value)
          ? normalizeCaseForComparison_2(
              spendEach(budget, value).filter((typeName) => typeof typeName === "string"),
            )
          : value;
        break;
      case "anyOf":
      case "oneOf":
        if (!Array.isArray(value)) break;
        if (spendEach(budget, value).some(looksLikeSchema)) out[schemaKey] = value.map(convertChild);
        else budget.isWhole = false;
        break;
      case "allOf": {
        let branches = Array.isArray(value) ? spendEach(budget, value) : [];
        let filtered = branches.filter(looksLikeSchema);
        if (filtered.length > 0) out.allOf = filtered.map(convertChild);
        if (
          branches.some(
            (branch) =>
              isPlainRecord(branch) && !looksLikeSchema(branch) && ownField(branch, "required") !== undefined,
          )
        )
          budget.isWhole = false;
        break;
      }
      case "const":
        spendChars(budget, scalarCost(value));
        out.const = value;
        break;
      case "enum":
        if (Array.isArray(value)) {
          for (let enumValue of value) spendChars(budget, scalarCost(enumValue));
          out.enum = value;
        }
        break;
      case "required":
        if (Array.isArray(value))
          out.required = spendEach(budget, value).filter((requiredName) => typeof requiredName === "string");
        break;
    }
  }
  let { anyOf, oneOf, allOf, description, ...rest } = out;
  let combinations = [
    ...(Array.isArray(anyOf)
      ? [
          {
            anyOf,
          },
        ]
      : []),
    ...(Array.isArray(oneOf)
      ? [
          {
            oneOf,
          },
        ]
      : []),
    ...(Array.isArray(allOf) ? allOf : []),
  ];
  return isPlainRecord(rest.properties) && combinations.length > 0
    ? {
        description,
        allOf: [rest, ...combinations],
      }
    : out;
}
//@ chunk-n51jggtb.js:46371-46433 placement
/**
 * 判断 schema 是否带可打印的类型关键字。
 */
function looksLikeSchema(looksLikeSchema) {
  return isPlainRecord(looksLikeSchema) && SCHEMA_KEYS.some((key) => Object.hasOwn(looksLikeSchema, key));
}
//@ chunk-n51jggtb.js:46433-46974 placement
/**
 * 压缩并截断 schema 的 description，把 ``` 换成 ''' 并转义 *\/。
 */
function shortenDoc(description, budget) {
  let isLong = description.length > 4 * budget.docChars;
  let replaced = (isLong ? description.slice(0, 4 * DOC_CHARS_PER_LINE) : description)
    .replace(/\s+/g, " ")
    .trim()
    .replaceAll("```", "'''")
    .replaceAll("*/", "*\\/");
  if (!isLong && replaced.length <= budget.docChars) {
    spendChars(budget, replaced.length);
    return replaced;
  }
  budget.isWhole = false;
  spendChars(budget, DOC_CHARS_PER_LINE / 2);
  let normalized = truncateToLength(replaced, DOC_CHARS_PER_LINE);
  let last = [...normalized.matchAll(/(\S*)\. (?=["'(\[]?[A-Z])/g)]
    .filter((truncated) => !ABBREVIATIONS.has(truncated[1].replace(/^\W+/, "").toLowerCase()))
    .map((sentenceEnd) => sentenceEnd.index + sentenceEnd[1].length)
    .at(-1);
  if (last !== undefined && last > DOC_CHARS_PER_LINE / 2) return `${normalized.slice(0, last + 1)} \u2026`;
  let index = normalized.lastIndexOf(" ");
  let spaceIndex = index > DOC_CHARS_PER_LINE / 2;
  let usable = spaceIndex ? normalized.slice(0, index) : normalized;
  return spaceIndex && /[.!?]$/.test(usable) ? `${usable} \u2026` : `${usable}\u2026`;
}
//@ chunk-n51jggtb.js:46974-47093 placement
/**
 * schema 打印超限时的降级：只保留 description 或 true。
 */
function fallbackType(schema, withDocs, budget) {
  budget.isWhole = false;
  let text = withDocs ? ownField(schema, "description") : undefined;
  return typeof text === "string"
    ? {
        description: shortenDoc(text, budget),
      }
    : true;
}
//@ chunk-n51jggtb.js:47093-47164 placement
/**
 * 判断值是否为非数组对象。
 */
function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export { toolSchemaCacheKey, buildToolsInterface, listCodeModeOnlyTools, DOC_CHARS_PER_LINE, schemaToTs };
