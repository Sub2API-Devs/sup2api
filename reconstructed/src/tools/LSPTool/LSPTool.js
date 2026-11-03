/**
 * tools/LSPTool/LSPTool.ts
 *
 * LSP 工具：九种代码智能操作，有 LSP 服务器连接过才启用，结果过滤 gitignore
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/LSPTool/LSPTool.ts
 * pieces: chunk-kxyd0g16.js (13)
 * attribution: fingerprint 7, placement 1, file-local 2, callgraph-fingerprint 1, layout 2
 */
import * as pathModule from "path";
import { pathToFileURL } from "url";
import { isNonWslUncPath, isNetworkOrSpecialPath } from "../../utils/networkPaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, _enum, string, E, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { LSP_TOOL_NAME, LSP_TOOL_DESCRIPTION, renderToolUseMessage } from "./UI.js";
import {
  hasLspEverConnected,
  getInitializationStatus,
  waitForLspInitialization,
  getLspServerManager,
} from "../../services/lsp/manager.js";
import { expandPath } from "../../utils/path.js";
import { lspToolInputSchema } from "./schemas.js";
import {
  getFsImplementation,
  isNetworkJunction,
  findIntermediateUncJunction,
  walkPermissionCheckPaths,
} from "../../utils/fsOperations.js";
import { isENOENT, toError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { checkReadPermissionForTool } from "../../utils/permissions/filesystem.js";
import { consumeReadPermission } from "../../utils/fsSafety/atomicWriteStaging.js";
import { getCwd } from "../../utils/cwd.js";
import { logError } from "../../utils/log.js";
import { openReadBoundToApproval } from "../../utils/fsSafety/pathRevalidation.js";
import { recordPluginUsage, buildPluginEventFieldsFromId } from "../../utils/telemetry/pluginTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import { uniq } from "../../utils/collections.js";
import { execFileNoThrowWithCwd } from "../../utils/execFileNoThrow.js";
import { buildGitConfigScopedEnv } from "../../utils/git/gitConfigEnv.js";
import {
  formatGoToDefinitionResult,
  formatFindReferencesResult,
  formatHoverResult,
  formatDocumentSymbolResult,
  formatWorkspaceSymbolResult,
  formatPrepareCallHierarchyResult,
  formatIncomingCallsResult,
  formatOutgoingCallsResult,
} from "./formatters.js";

//@ chunk-kxyd0g16.js:94254-94337 fingerprint = toLocation (1)
/**
 * LocationLink 转 Location（targetUri + targetSelectionRange/targetRange）。
 */
function toLocation(item) {
  return {
    uri: item.targetUri,
    range: item.targetSelectionRange || item.targetRange,
  };
}
//@ chunk-kxyd0g16.js:94337-94374 fingerprint = isLocationLink (1)
/**
 * 是否为 LSP LocationLink（含 targetUri）。
 */
function isLocationLink(item) {
  return "targetUri" in item;
}
//@ chunk-kxyd0g16.js:103223-103289 placement
/**
 * 判断路径（或其对照写法）是否为 UNC/网络路径。
 */
function hasUncOrNetworkPath(filePath, r) {
  let trimmed = filePath.trim();
  return (
    isNonWslUncPath(trimmed) ||
    isNetworkOrSpecialPath(trimmed) ||
    isNonWslUncPath(r) ||
    isNetworkOrSpecialPath(r)
  );
}
//@ chunk-kxyd0g16.js:103920-105186 fingerprint = outputSchema (0.801)
var MAX_LSP_FILE_SIZE_BYTES = 1e7;
var lspInputSchema = DoctorLazy(() =>
  zodStrictObject({
    operation: _enum([
      "goToDefinition",
      "findReferences",
      "hover",
      "documentSymbol",
      "workspaceSymbol",
      "goToImplementation",
      "prepareCallHierarchy",
      "incomingCalls",
      "outgoingCalls",
    ]).describe("The LSP operation to perform"),
    filePath: string().describe("The absolute or relative path to the file"),
    line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
    character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
    query: string()
      .optional()
      .describe(
        "The symbol name or partial name to search for (workspaceSymbol only). Most language servers return no results for an empty query, so always provide it when using workspaceSymbol.",
      ),
  }),
);
var lspOutputSchema = DoctorLazy(() =>
  u({
    operation: _enum([
      "goToDefinition",
      "findReferences",
      "hover",
      "documentSymbol",
      "workspaceSymbol",
      "goToImplementation",
      "prepareCallHierarchy",
      "incomingCalls",
      "outgoingCalls",
    ]).describe("The LSP operation that was performed"),
    result: string().describe("The formatted result of the LSP operation"),
    filePath: string().describe("The file path the operation was performed on"),
    resultCount: E()
      .int()
      .nonnegative()
      .optional()
      .describe("Number of results (definitions, references, symbols)"),
    fileCount: E().int().nonnegative().optional().describe("Number of files containing results"),
  }),
);
//@ chunk-kxyd0g16.js:105853-109919 fingerprint = LSPTool (0.883)
/**
 * LSP 工具定义（name "LSP"）。shouldDefer，只在有 LSP 服务器曾连接（hasEverConnected）时启用；只读、可并发；九种操作；文件需存在且不超过 10MB；结果过滤 gitignore 位置后格式化。
 */
var LSPTool = buildTool({
  name: LSP_TOOL_NAME,
  searchHint: "code intelligence (definitions, references, symbols, hover)",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  isLsp: true,
  async description() {
    return LSP_TOOL_DESCRIPTION;
  },
  userFacingName() {
    return "LSP";
  },
  shouldDefer: true,
  isEnabled() {
    return hasLspEverConnected();
  },
  get inputSchema() {
    return lspInputSchema();
  },
  get outputSchema() {
    return lspOutputSchema();
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  ruleContentField: "filePath",
  getPath({ filePath }) {
    return expandPath(filePath);
  },
  async prompt() {
    return LSP_TOOL_DESCRIPTION;
  },
  renderToolUseMessage,
  create(e) {
    return {
      async validateInput(input) {
        let parseResult = lspToolInputSchema().safeParse(input);
        if (!parseResult.success)
          return {
            result: false,
            message: `Invalid input: ${parseResult.error.message}`,
            errorCode: 3,
          };
        let fsImplementation = getFsImplementation();
        let absolutePath = expandPath(input.filePath);
        if (
          hasUncOrNetworkPath(input.filePath, absolutePath) ||
          isNetworkJunction(findIntermediateUncJunction(fsImplementation, absolutePath))
        )
          return {
            result: true,
          };
        let stats;
        try {
          stats = await fsImplementation.stat(absolutePath);
        } catch (error) {
          if (isENOENT(error))
            return {
              result: false,
              message: `File does not exist: ${input.filePath}`,
              errorCode: 1,
            };
          let err = toError(error);
          logForDebugging(
            `Failed to access file stats for LSP operation on ${input.filePath}: ${err.message}`,
            {
              level: "error",
            },
          );
          return {
            result: false,
            message: `Cannot access file: ${input.filePath}. ${err.message}`,
            errorCode: 4,
          };
        }
        if (!stats.isFile())
          return {
            result: false,
            message: `Path is not a file: ${input.filePath}`,
            errorCode: 2,
          };
        return {
          result: true,
        };
      },
      async checkPermissions(input, n) {
        let s = expandPath(input.filePath);
        let f = walkPermissionCheckPaths(s);
        e.session.writePermissionStash.stash(n.toolUseId, s, f.spellings, "read");
        return checkReadPermissionForTool(LSPTool, input, e.permissions(), f);
      },
      async call(input, n) {
        let absolutePath = expandPath(input.filePath);
        let f = consumeReadPermission(
          {
            toolUseId: n.toolUseId,
            session: e.session,
          },
          absolutePath,
        );
        let cwd = getCwd();
        if (getInitializationStatus().status === "pending") await waitForLspInitialization();
        let lspManager = getLspServerManager();
        if (!lspManager) {
          let initializationStatus = getInitializationStatus();
          if (initializationStatus.status === "failed") {
            logForDebugging(`LSP initialization failed: ${initializationStatus.error.message}`, {
              level: "error",
            });
            return {
              data: {
                operation: input.operation,
                result: `LSP initialization failed: ${initializationStatus.error.message}`,
                filePath: input.filePath,
              },
            };
          }
          logError(Error("LSP server manager not initialized when tool was called"));
          return {
            data: {
              operation: input.operation,
              result: "LSP server manager not initialized. This may indicate a startup issue.",
              filePath: input.filePath,
            },
          };
        }
        let { method, params } = getMethodAndParams(input, absolutePath);
        try {
          if (!lspManager.isFileOpen(absolutePath)) {
            let readBoundToApproval = await openReadBoundToApproval(absolutePath, f, n.signal);
            let handle = readBoundToApproval.handle;
            try {
              let stats = await handle.stat();
              if (stats.size > MAX_LSP_FILE_SIZE_BYTES)
                return {
                  data: {
                    operation: input.operation,
                    result: `File too large for LSP analysis (${Math.ceil(stats.size / 1e6)}MB exceeds 10MB limit)`,
                    filePath: input.filePath,
                  },
                };
              let fileContent = await handle.readFile({
                encoding: "utf-8",
              });
              await lspManager.openFile(absolutePath, fileContent);
            } finally {
              await readBoundToApproval.close();
            }
          }
          let result = await lspManager.sendRequest(absolutePath, method, params);
          if (result === undefined) {
            logForDebugging(
              `No LSP server available for file type ${pathModule.extname(absolutePath)} for operation ${input.operation} on file ${input.filePath}`,
            );
            return {
              data: {
                operation: input.operation,
                result: `No LSP server available for file type: ${pathModule.extname(absolutePath)}`,
                filePath: input.filePath,
              },
            };
          }
          let pluginSource = lspManager.getServerForFile(absolutePath)?.config?.pluginSource;
          if (pluginSource) {
            recordPluginUsage(pluginSource);
            logEvent("tengu_plugin_lsp_request", {
              operation: fromEnum(input.operation),
              ...buildPluginEventFieldsFromId(pluginSource, policyEnabledPluginNameSet()),
            });
          }
          if (input.operation === "incomingCalls" || input.operation === "outgoingCalls") {
            let callItems = result;
            if (!callItems || callItems.length === 0)
              return {
                data: {
                  operation: input.operation,
                  result: "No call hierarchy item found at this position",
                  filePath: input.filePath,
                  resultCount: 0,
                  fileCount: 0,
                },
              };
            let callMethod =
              input.operation === "incomingCalls"
                ? "callHierarchy/incomingCalls"
                : "callHierarchy/outgoingCalls";
            result = await lspManager.sendRequest(absolutePath, callMethod, {
              item: callItems[0],
            });
            if (result === undefined)
              logForDebugging(`LSP server returned undefined for ${callMethod} on ${input.filePath}`);
          }
          if (
            result &&
            Array.isArray(result) &&
            (input.operation === "findReferences" ||
              input.operation === "goToDefinition" ||
              input.operation === "goToImplementation" ||
              input.operation === "workspaceSymbol")
          )
            if (input.operation === "workspaceSymbol") {
              let symbols = result;
              let locations = symbols
                .filter((symbol) => symbol?.location?.uri)
                .map((symbol) => symbol.location);
              let filteredLocations = await filterGitIgnoredLocations(locations, cwd);
              let filteredUris = new Set(filteredLocations.map((filteredLocation) => filteredLocation.uri));
              result = symbols.filter(
                (symbol) => !symbol?.location?.uri || filteredUris.has(symbol.location.uri),
              );
            } else {
              let locations = result.map(toLocation_2);
              let filteredLocations = await filterGitIgnoredLocations(locations, cwd);
              let filteredUris = new Set(filteredLocations.map((filteredLocation) => filteredLocation.uri));
              result = result.filter((item) => {
                let loc = toLocation_2(item);
                return !loc.uri || filteredUris.has(loc.uri);
              });
            }
          let { formatted, resultCount, fileCount } = formatResult(input.operation, result, cwd);
          return {
            data: {
              operation: input.operation,
              result: formatted,
              filePath: input.filePath,
              resultCount,
              fileCount,
            },
          };
        } catch (error) {
          let message = toError(error).message;
          logForDebugging(`LSP tool request failed for ${input.operation} on ${input.filePath}: ${message}`, {
            level: "error",
          });
          return {
            data: {
              operation: input.operation,
              result: `Error performing ${input.operation}: ${message}`,
              filePath: input.filePath,
            },
          };
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: "tool_result",
      content: output.result,
    };
  },
});
//@ chunk-kxyd0g16.js:109919-110976 fingerprint = getMethodAndParams (1)
/**
 * 把工具输入转换为 LSP 方法与参数（1 基行列转 0 基，文件转 file:// URI）。
 */
function getMethodAndParams(input, absolutePath) {
  let uri = pathToFileURL(absolutePath).href;
  let position = {
    line: input.line - 1,
    character: input.character - 1,
  };
  switch (input.operation) {
    case "goToDefinition":
      return {
        method: "textDocument/definition",
        params: {
          textDocument: {
            uri,
          },
          position,
        },
      };
    case "findReferences":
      return {
        method: "textDocument/references",
        params: {
          textDocument: {
            uri,
          },
          position,
          context: {
            includeDeclaration: true,
          },
        },
      };
    case "hover":
      return {
        method: "textDocument/hover",
        params: {
          textDocument: {
            uri,
          },
          position,
        },
      };
    case "documentSymbol":
      return {
        method: "textDocument/documentSymbol",
        params: {
          textDocument: {
            uri,
          },
        },
      };
    case "workspaceSymbol":
      return {
        method: "workspace/symbol",
        params: {
          query: input.query ?? "",
        },
      };
    case "goToImplementation":
      return {
        method: "textDocument/implementation",
        params: {
          textDocument: {
            uri,
          },
          position,
        },
      };
    case "prepareCallHierarchy":
      return {
        method: "textDocument/prepareCallHierarchy",
        params: {
          textDocument: {
            uri,
          },
          position,
        },
      };
    case "incomingCalls":
      return {
        method: "textDocument/prepareCallHierarchy",
        params: {
          textDocument: {
            uri,
          },
          position,
        },
      };
    case "outgoingCalls":
      return {
        method: "textDocument/prepareCallHierarchy",
        params: {
          textDocument: {
            uri,
          },
          position,
        },
      };
  }
}
//@ chunk-kxyd0g16.js:110976-111083 file-local
function countSymbols(symbols) {
  let count = symbols.length;
  for (let symbol of symbols)
    if (symbol.children && symbol.children.length > 0) count += countSymbols(symbol.children);
  return count;
}
//@ chunk-kxyd0g16.js:111083-111137 callgraph-fingerprint = countUniqueFilesFromCallItems (1)
function countUniqueFilesFromCallItems(items) {
  return new Set(items.map((item) => item.uri)).size;
}
//@ chunk-kxyd0g16.js:111137-111268 file-local
function uriToFilePath(uri) {
  let filePath = uri.replace(/^file:\/\//, "");
  if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1);
  try {
    filePath = decodeURIComponent(filePath);
  } catch {}
  return filePath;
}
//@ chunk-kxyd0g16.js:111268-111776 fingerprint = filterGitIgnoredLocations (1)
/**
 * 用 git check-ignore 批量过滤 LSP 返回位置中被 gitignore 的文件。
 */
async function filterGitIgnoredLocations(locations, cwd) {
  if (locations.length === 0) return locations;
  let uriToPath = new Map();
  for (let loc of locations)
    if (loc.uri && !uriToPath.has(loc.uri)) uriToPath.set(loc.uri, uriToFilePath(loc.uri));
  let uniquePaths = uniq(uriToPath.values());
  if (uniquePaths.length === 0) return locations;
  let ignoredPaths = new Set();
  let BATCH_SIZE = 50;
  for (let i = 0; i < uniquePaths.length; i += BATCH_SIZE) {
    let batch = uniquePaths.slice(i, i + BATCH_SIZE);
    let result = await execFileNoThrowWithCwd("git", ["check-ignore", ...batch], {
      cwd,
      preserveOutputOnError: false,
      timeout: 5000,
      env: buildGitConfigScopedEnv(),
    });
    if (result.code === 0 && result.stdout)
      for (let line of result.stdout.split(`
`)) {
        let trimmed = line.trim();
        if (trimmed) ignoredPaths.add(trimmed);
      }
  }
  if (ignoredPaths.size === 0) return locations;
  return locations.filter((loc) => {
    let filePath = uriToPath.get(loc.uri);
    return !filePath || !ignoredPaths.has(filePath);
  });
}
//@ chunk-kxyd0g16.js:111776-111813 layout = isLocationLink (1)
function isLocationLink_2(item) {
  return "targetUri" in item;
}
//@ chunk-kxyd0g16.js:111813-111914 layout = toLocation (1)
function toLocation_2(item) {
  if (isLocationLink_2(item))
    return {
      uri: item.targetUri,
      range: item.targetSelectionRange || item.targetRange,
    };
  return item;
}
//@ chunk-kxyd0g16.js:111914-114110 fingerprint = formatResult (0.96)
/**
 * 按操作类型格式化 LSP 结果，返回 {formatted, resultCount, fileCount}。
 */
function formatResult(operation, result, cwd) {
  switch (operation) {
    case "goToDefinition": {
      let locations = (Array.isArray(result) ? result : result ? [result] : []).map(toLocation_2);
      let invalidLocations = locations.filter((loc) => !loc || !loc.uri);
      if (invalidLocations.length > 0)
        logForDebugging(
          `LSP server returned ${invalidLocations.length} location(s) with undefined URI for goToDefinition on ${cwd}. This indicates malformed data from the LSP server.`,
          {
            level: "error",
          },
        );
      let validLocations = locations.filter((loc) => loc && loc.uri);
      return {
        formatted: formatGoToDefinitionResult(result, cwd),
        resultCount: validLocations.length,
        fileCount: countUniqueFilesFromCallItems(validLocations),
      };
    }
    case "findReferences": {
      let locations = result || [];
      let invalidLocations = locations.filter((loc) => !loc || !loc.uri);
      if (invalidLocations.length > 0)
        logForDebugging(
          `LSP server returned ${invalidLocations.length} location(s) with undefined URI for findReferences on ${cwd}. This indicates malformed data from the LSP server.`,
          {
            level: "error",
          },
        );
      let validLocations = locations.filter((loc) => loc && loc.uri);
      return {
        formatted: formatFindReferencesResult(result, cwd),
        resultCount: validLocations.length,
        fileCount: countUniqueFilesFromCallItems(validLocations),
      };
    }
    case "hover":
      return {
        formatted: formatHoverResult(result, cwd),
        resultCount: result ? 1 : 0,
        fileCount: result ? 1 : 0,
      };
    case "documentSymbol": {
      let symbols = result || [];
      let resultCount =
        symbols.length > 0 && symbols[0] && "range" in symbols[0] ? countSymbols(symbols) : symbols.length;
      return {
        formatted: formatDocumentSymbolResult(result, cwd),
        resultCount,
        fileCount: symbols.length > 0 ? 1 : 0,
      };
    }
    case "workspaceSymbol": {
      let symbols = result || [];
      let invalidSymbols = symbols.filter((sym) => !sym || !sym.location || !sym.location.uri);
      if (invalidSymbols.length > 0)
        logForDebugging(
          `LSP server returned ${invalidSymbols.length} symbol(s) with undefined location URI for workspaceSymbol on ${cwd}. This indicates malformed data from the LSP server.`,
          {
            level: "error",
          },
        );
      let validSymbols = symbols.filter((sym) => sym && sym.location && sym.location.uri);
      let locations = validSymbols.map((validSymbol) => validSymbol.location);
      return {
        formatted: formatWorkspaceSymbolResult(result, cwd),
        resultCount: validSymbols.length,
        fileCount: countUniqueFilesFromCallItems(locations),
      };
    }
    case "goToImplementation": {
      let locations = (Array.isArray(result) ? result : result ? [result] : []).map(toLocation_2);
      let invalidLocations = locations.filter((loc) => !loc || !loc.uri);
      if (invalidLocations.length > 0)
        logForDebugging(
          `LSP server returned ${invalidLocations.length} location(s) with undefined URI for goToImplementation on ${cwd}. This indicates malformed data from the LSP server.`,
          {
            level: "error",
          },
        );
      let validLocations = locations.filter((loc) => loc && loc.uri);
      return {
        formatted: formatGoToDefinitionResult(result, cwd),
        resultCount: validLocations.length,
        fileCount: countUniqueFilesFromCallItems(validLocations),
      };
    }
    case "prepareCallHierarchy": {
      let items = result || [];
      return {
        formatted: formatPrepareCallHierarchyResult(result, cwd),
        resultCount: items.length,
        fileCount: items.length > 0 ? new Set(items.map((item) => item.uri).filter((f) => f)).size : 0,
      };
    }
    case "incomingCalls": {
      let calls = result || [];
      return {
        formatted: formatIncomingCallsResult(result, cwd),
        resultCount: calls.length,
        fileCount: calls.length > 0 ? new Set(calls.map((f) => f.from?.uri).filter((f) => f)).size : 0,
      };
    }
    case "outgoingCalls": {
      let calls = result || [];
      return {
        formatted: formatOutgoingCallsResult(result, cwd),
        resultCount: calls.length,
        fileCount: calls.length > 0 ? new Set(calls.map((f) => f.to?.uri).filter((f) => f)).size : 0,
      };
    }
  }
}
export { LSPTool, isLocationLink, toLocation, hasUncOrNetworkPath };
