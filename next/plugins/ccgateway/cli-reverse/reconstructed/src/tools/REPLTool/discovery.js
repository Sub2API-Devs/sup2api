/**
 * tools/REPLTool/discovery.ts
 *
 * VM 内的 searchTools / describeTool 工具发现辅助（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (6)
 * attribution: placement 6
 */
import { randomUUID } from "crypto";
import { REPL_PART_CAP } from "../../utils/codeMode.js";
import {
  ToolSearchDescriptionCache,
  searchToolsWithKeywords,
  buildToolApiSchemaOrUndefined,
  formatToolInputSignature,
  toolIndexAccess,
} from "../ToolSearchTool/ToolSearchTool.js";
import { shouldForwardRemoteTools } from "../../utils/api.js";
import { wireName, internalName, isServerIdentityActive } from "../../services/mcp/serverIdentity.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import { SCRIPT_CALL_TOOL_USE_ID_PREFIX } from "../../utils/codeMode/pendingActionReport.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { DOC_CHARS_PER_LINE, schemaToTs } from "./typePrinting.js";
import { logForDebugging } from "../../utils/debug.js";
import { getFirstLine } from "../../utils/stringUtils.js";

//@ chunk-n51jggtb.js:74102-74156 placement
/**
 * searchTools/describeTool 的限额常量。
 */
var DEFAULT_SEARCH_RESULTS = 8;
var MAX_SEARCH_RESULTS = 25;
var SEARCH_ABOUT_MAX_CHARS = 160;
var SEARCH_INPUT_MAX_CHARS = 6000;
var SEARCH_INPUT_TOTAL_BUDGET = REPL_PART_CAP / 2;
var DESCRIBE_MAX_CHARS = 4000;
var PROGRESS_ECHO_MAX_CHARS = 200;
//@ chunk-n51jggtb.js:74156-75721 placement
/**
 * 构造 searchTools/describeTool 两个发现辅助函数，并转发 repl_tool_call 进度。
 */
function createToolHelpers(toolUseContext, tools, onProgress) {
  let descriptionCache = new ToolSearchDescriptionCache();
  let helperEnv = {
    async searchTools(query, max) {
      if (typeof query !== "string" || query.trim() === "")
        throw Error("searchTools: pass the words to look for, e.g. searchTools('slack message')");
      let limit =
        typeof max === "number" && Number.isInteger(max) && max > 0
          ? Math.min(max, MAX_SEARCH_RESULTS)
          : DEFAULT_SEARCH_RESULTS;
      let names = await searchToolsWithKeywords(query, tools, tools, tools, limit, descriptionCache);
      let remoteToolForwarding = await shouldForwardRemoteTools(
        tools.filter((tool) => names.includes(tool.name)),
      );
      let descriptions = await Promise.all(
        names.map((name) => descriptionCache.describe(name, toolUseContext)),
      );
      let inputBudget = SEARCH_INPUT_TOTAL_BUDGET;
      return names.map((name, index) => {
        let tool = tools.find((toolName) => toolName.name === name);
        let inputSchema = tool
          ? schemaWithHint(tool, remoteToolForwarding, Math.min(inputBudget, SEARCH_INPUT_MAX_CHARS))
          : "{}";
        inputBudget -= inputSchema.length;
        return {
          name: wireName(name),
          ...serverCallNameProps(name),
          about: truncateWithEllipsis(firstLine(descriptions[index] ?? ""), SEARCH_ABOUT_MAX_CHARS),
          input: inputSchema,
        };
      });
    },
    async describeTool(name) {
      if (typeof name !== "string")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `describeTool: pass a tool name (a string), not a ${typeof name}`,
          "describeTool: the name is not a string",
        );
      let internalNameValue = internalName(name);
      let found = tools.find((name) => name.name === internalNameValue);
      if (found === undefined)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `describeTool: no tool named ${name}. searchTools('words') finds one.`,
          "describeTool: no such tool",
        );
      let description = await descriptionCache.describe(found.name, toolUseContext);
      return {
        name: wireName(found.name),
        ...serverCallNameProps(found.name),
        description: truncateWithEllipsis(description, DESCRIBE_MAX_CHARS),
        inputSchema: buildToolApiSchemaOrUndefined(found, await shouldForwardRemoteTools([found])),
      };
    },
  };
  let withProgress = async (toolName, toolInput, args) => {
    let callId = `${SCRIPT_CALL_TOOL_USE_ID_PREFIX}${randomUUID()}`;
    let emit = (phase, extra) =>
      onProgress?.({
        type: "progress",
        toolUseID: callId,
        data: {
          type: "repl_tool_call",
          toolName,
          toolInput,
          toolUseId: callId,
          phase,
          ...extra,
          scriptHelper: true,
        },
      });
    emit("start");
    try {
      let result = await args();
      emit("complete", {
        result,
      });
      return result;
    } catch (error) {
      emit("error", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
  let echoArg = (value) =>
    typeof value === "string" ? value.slice(0, PROGRESS_ECHO_MAX_CHARS) : `<non-string ${typeof value}>`;
  return {
    searchTools: (query, max) =>
      withProgress(
        "searchTools",
        {
          query: echoArg(query),
          ...(typeof max === "number" && {
            max,
          }),
        },
        () => helperEnv.searchTools(query, max),
      ),
    describeTool: (name) =>
      withProgress(
        "describeTool",
        {
          name: echoArg(name),
        },
        () => helperEnv.describeTool(name),
      ),
  };
}
//@ chunk-n51jggtb.js:75721-76169 placement
/**
 * 打印工具输入 schema 摘要，放不下时附上“用 describeTool 看全部”的提示。
 */
function schemaWithHint(tool, remoteToolForwarding, budget) {
  let defaultText = `
// Part of this is left out. describeTool(${jsonStringify(truncateWithEllipsis(wireName(tool.name), PROGRESS_ECHO_MAX_CHARS))}) returns the whole input schema.`;
  let text = `{}${defaultText}`;
  try {
    text = formatToolInputSignature(tool, remoteToolForwarding) + defaultText;
    let max = Math.max(budget, text.length);
    let cut = buildToolApiSchemaOrUndefined(tool, remoteToolForwarding);
    if (!isPlainObject_2(cut)) return "{}";
    let min = Math.min(max, SEARCH_INPUT_MAX_CHARS);
    for (let parsed of [min, DOC_CHARS_PER_LINE]) {
      let pruned = schemaToTs(cut, "", parsed, min);
      if (pruned === undefined) continue;
      let stringified = pruned.isWhole ? pruned.text : pruned.text + defaultText;
      if (stringified.length <= max) return stringified;
    }
  } catch (error) {
    logForDebugging(`searchTools: could not print ${tool.name}'s input: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  return text;
}
//@ chunk-n51jggtb.js:76169-76204 placement
/**
 * 去空白后做单行化处理。
 */
function firstLine(text) {
  return getFirstLine(text.trim());
}
//@ chunk-n51jggtb.js:76204-76266 placement
/**
 * 截断字符串用于列表展示。
 */
function truncateWithEllipsis(text, maxChars) {
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}\u2026`;
}
//@ chunk-n51jggtb.js:76266-76333 placement
/**
 * 当工具的调用名与真名不同时给出 call 字段。
 */
function serverCallNameProps(toolName) {
  let wire = wireName(toolName);
  let mapped = toolIndexAccess(wire);
  return isServerIdentityActive() && mapped !== wire
    ? {
        call: mapped,
      }
    : {};
}
export { createToolHelpers };
