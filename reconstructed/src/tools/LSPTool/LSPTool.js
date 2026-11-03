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
import { ai, n_ } from "../../utils/networkPaths.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, U, o, E, u } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { af } from "../../utils/plugins/pluginPolicy.js";
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

/**
 * LocationLink 转 Location（targetUri + targetSelectionRange/targetRange）。
 */
//@ chunk-kxyd0g16.js:94254-94337 fingerprint = toLocation (1)
function toLocation(item) {
  return { uri: item.targetUri, range: item.targetSelectionRange || item.targetRange };
}
/**
 * 是否为 LSP LocationLink（含 targetUri）。
 */
//@ chunk-kxyd0g16.js:94337-94374 fingerprint = isLocationLink (1)
function isLocationLink(item) {
  return "targetUri" in item;
}
//@ chunk-kxyd0g16.js:103223-103289 placement
function xe(e, r) {
  let trimmed = e.trim();
  return ai(trimmed) || n_(trimmed) || ai(r) || n_(r);
}
//@ chunk-kxyd0g16.js:103920-105186 fingerprint = outputSchema (0.801)
var MAX_LSP_FILE_SIZE_BYTES = 1e7,
  lspInputSchema = DoctorLazy(() =>
    zodStrictObject({
      operation: U([
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
      filePath: o().describe("The absolute or relative path to the file"),
      line: E().int().positive().describe("The line number (1-based, as shown in editors)"),
      character: E().int().positive().describe("The character offset (1-based, as shown in editors)"),
      query: o()
        .optional()
        .describe(
          "The symbol name or partial name to search for (workspaceSymbol only). Most language servers return no results for an empty query, so always provide it when using workspaceSymbol.",
        ),
    }),
  ),
  lspOutputSchema = DoctorLazy(() =>
    u({
      operation: U([
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
      result: o().describe("The formatted result of the LSP operation"),
      filePath: o().describe("The file path the operation was performed on"),
      resultCount: E()
        .int()
        .nonnegative()
        .optional()
        .describe("Number of results (definitions, references, symbols)"),
      fileCount: E().int().nonnegative().optional().describe("Number of files containing results"),
    }),
  );
/**
 * LSP 工具定义（name "LSP"）。shouldDefer，只在有 LSP 服务器曾连接（hasEverConnected）时启用；只读、可并发；九种操作；文件需存在且不超过 10MB；结果过滤 gitignore 位置后格式化。
 */
//@ chunk-kxyd0g16.js:105853-109919 fingerprint = LSPTool (0.883)
var LSPTool = buildTool({
  name: LSP_TOOL_NAME,
  searchHint: "code intelligence (definitions, references, symbols, hover)",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  isLsp: !0,
  async description() {
    return LSP_TOOL_DESCRIPTION;
  },
  userFacingName() {
    return "LSP";
  },
  shouldDefer: !0,
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
    return !0;
  },
  isReadOnly() {
    return !0;
  },
  ruleContentField: "filePath",
  getPath({ filePath: e }) {
    return expandPath(e);
  },
  async prompt() {
    return LSP_TOOL_DESCRIPTION;
  },
  renderToolUseMessage: renderToolUseMessage,
  create(e) {
    return {
      async validateInput(input) {
        let safeParse = lspToolInputSchema().safeParse(input);
        if (!safeParse.success)
          return { result: !1, message: `Invalid input: ${safeParse.error.message}`, errorCode: 3 };
        let s = getFsImplementation(),
          f = expandPath(input.filePath);
        if (xe(input.filePath, f) || isNetworkJunction(findIntermediateUncJunction(s, f)))
          return { result: !0 };
        let h;
        try {
          h = await s.stat(f);
        } catch (error) {
          if (isENOENT(error))
            return { result: !1, message: `File does not exist: ${input.filePath}`, errorCode: 1 };
          let k = toError(error);
          return (
            logForDebugging(
              `Failed to access file stats for LSP operation on ${input.filePath}: ${k.message}`,
              { level: "error" },
            ),
            { result: !1, message: `Cannot access file: ${input.filePath}. ${k.message}`, errorCode: 4 }
          );
        }
        if (!h.isFile())
          return { result: !1, message: `Path is not a file: ${input.filePath}`, errorCode: 2 };
        return { result: !0 };
      },
      async checkPermissions(r, n) {
        let s = expandPath(r.filePath),
          f = walkPermissionCheckPaths(s);
        return (
          e.session.writePermissionStash.stash(n.toolUseId, s, f.spellings, "read"),
          checkReadPermissionForTool(LSPTool, r, e.permissions(), f)
        );
      },
      async call(input, n) {
        let absolutePath = expandPath(input.filePath),
          f = consumeReadPermission({ toolUseId: n.toolUseId, session: e.session }, absolutePath),
          h = getCwd();
        if (getInitializationStatus().status === "pending") await waitForLspInitialization();
        let lspManager = getLspServerManager();
        if (!lspManager) {
          let R = getInitializationStatus();
          if (R.status === "failed")
            return (
              logForDebugging(`LSP initialization failed: ${R.error.message}`, { level: "error" }),
              {
                data: {
                  operation: input.operation,
                  result: `LSP initialization failed: ${R.error.message}`,
                  filePath: input.filePath,
                },
              }
            );
          return (
            logError(Error("LSP server manager not initialized when tool was called")),
            {
              data: {
                operation: input.operation,
                result: "LSP server manager not initialized. This may indicate a startup issue.",
                filePath: input.filePath,
              },
            }
          );
        }
        let { method: method, params: params } = getMethodAndParams(input, absolutePath);
        try {
          if (!lspManager.isFileOpen(absolutePath)) {
            let q = await openReadBoundToApproval(absolutePath, f, n.signal),
              handle = q.handle;
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
              let content = await handle.readFile({ encoding: "utf-8" });
              await lspManager.openFile(absolutePath, content);
            } finally {
              await q.close();
            }
          }
          let sendRequest = await lspManager.sendRequest(absolutePath, method, params);
          if (sendRequest === void 0)
            return (
              logForDebugging(
                `No LSP server available for file type ${pathModule.extname(absolutePath)} for operation ${input.operation} on file ${input.filePath}`,
              ),
              {
                data: {
                  operation: input.operation,
                  result: `No LSP server available for file type: ${pathModule.extname(absolutePath)}`,
                  filePath: input.filePath,
                },
              }
            );
          let I = lspManager.getServerForFile(absolutePath)?.config?.pluginSource;
          if (I)
            (recordPluginUsage(I),
              logEvent("tengu_plugin_lsp_request", {
                operation: fromEnum(input.operation),
                ...buildPluginEventFieldsFromId(I, af()),
              }));
          if (input.operation === "incomingCalls" || input.operation === "outgoingCalls") {
            let q = sendRequest;
            if (!q || q.length === 0)
              return {
                data: {
                  operation: input.operation,
                  result: "No call hierarchy item found at this position",
                  filePath: input.filePath,
                  resultCount: 0,
                  fileCount: 0,
                },
              };
            let P =
              input.operation === "incomingCalls"
                ? "callHierarchy/incomingCalls"
                : "callHierarchy/outgoingCalls";
            if (
              ((sendRequest = await lspManager.sendRequest(absolutePath, P, { item: q[0] })),
              sendRequest === void 0)
            )
              logForDebugging(`LSP server returned undefined for ${P} on ${input.filePath}`);
          }
          if (
            sendRequest &&
            Array.isArray(sendRequest) &&
            (input.operation === "findReferences" ||
              input.operation === "goToDefinition" ||
              input.operation === "goToImplementation" ||
              input.operation === "workspaceSymbol")
          )
            if (input.operation === "workspaceSymbol") {
              let q = sendRequest,
                mapped = q.filter((Q) => Q?.location?.uri).map((Q) => Q.location),
                L = await filterGitIgnoredLocations(mapped, h),
                W = new Set(L.map((Q) => Q.uri));
              sendRequest = q.filter((Q) => !Q?.location?.uri || W.has(Q.location.uri));
            } else {
              let mapped = sendRequest.map(toLocation_2),
                P = await filterGitIgnoredLocations(mapped, h),
                L = new Set(P.map((W) => W.uri));
              sendRequest = sendRequest.filter((W) => {
                let Q = toLocation_2(W);
                return !Q.uri || L.has(Q.uri);
              });
            }
          let {
            formatted: formatted,
            resultCount: resultCount,
            fileCount: fileCount,
          } = formatResult(input.operation, sendRequest, h);
          return {
            data: {
              operation: input.operation,
              result: formatted,
              filePath: input.filePath,
              resultCount: resultCount,
              fileCount: fileCount,
            },
          };
        } catch (error) {
          let message = toError(error).message;
          return (
            logForDebugging(
              `LSP tool request failed for ${input.operation} on ${input.filePath}: ${message}`,
              { level: "error" },
            ),
            {
              data: {
                operation: input.operation,
                result: `Error performing ${input.operation}: ${message}`,
                filePath: input.filePath,
              },
            }
          );
        }
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, r) {
    return { tool_use_id: r, type: "tool_result", content: e.result };
  },
});
/**
 * 把工具输入转换为 LSP 方法与参数（1 基行列转 0 基，文件转 file:// URI）。
 */
//@ chunk-kxyd0g16.js:109919-110976 fingerprint = getMethodAndParams (1)
function getMethodAndParams(input, absolutePath) {
  let uri = pathToFileURL(absolutePath).href,
    position = { line: input.line - 1, character: input.character - 1 };
  switch (input.operation) {
    case "goToDefinition":
      return {
        method: "textDocument/definition",
        params: { textDocument: { uri: uri }, position: position },
      };
    case "findReferences":
      return {
        method: "textDocument/references",
        params: { textDocument: { uri: uri }, position: position, context: { includeDeclaration: !0 } },
      };
    case "hover":
      return { method: "textDocument/hover", params: { textDocument: { uri: uri }, position: position } };
    case "documentSymbol":
      return { method: "textDocument/documentSymbol", params: { textDocument: { uri: uri } } };
    case "workspaceSymbol":
      return { method: "workspace/symbol", params: { query: input.query ?? "" } };
    case "goToImplementation":
      return {
        method: "textDocument/implementation",
        params: { textDocument: { uri: uri }, position: position },
      };
    case "prepareCallHierarchy":
      return {
        method: "textDocument/prepareCallHierarchy",
        params: { textDocument: { uri: uri }, position: position },
      };
    case "incomingCalls":
      return {
        method: "textDocument/prepareCallHierarchy",
        params: { textDocument: { uri: uri }, position: position },
      };
    case "outgoingCalls":
      return {
        method: "textDocument/prepareCallHierarchy",
        params: { textDocument: { uri: uri }, position: position },
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
/**
 * 用 git check-ignore 批量过滤 LSP 返回位置中被 gitignore 的文件。
 */
//@ chunk-kxyd0g16.js:111268-111776 fingerprint = filterGitIgnoredLocations (1)
async function filterGitIgnoredLocations(locations, cwd) {
  if (locations.length === 0) return locations;
  let uriToPath = new Map();
  for (let loc of locations)
    if (loc.uri && !uriToPath.has(loc.uri)) uriToPath.set(loc.uri, uriToFilePath(loc.uri));
  let uniquePaths = uniq(uriToPath.values());
  if (uniquePaths.length === 0) return locations;
  let ignoredPaths = new Set(),
    BATCH_SIZE = 50;
  for (let y = 0; y < uniquePaths.length; y += BATCH_SIZE) {
    let batch = uniquePaths.slice(y, y + BATCH_SIZE),
      result = await execFileNoThrowWithCwd("git", ["check-ignore", ...batch], {
        cwd: cwd,
        preserveOutputOnError: !1,
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
    return { uri: item.targetUri, range: item.targetSelectionRange || item.targetRange };
  return item;
}
/**
 * 按操作类型格式化 LSP 结果，返回 {formatted, resultCount, fileCount}。
 */
//@ chunk-kxyd0g16.js:111914-114110 fingerprint = formatResult (0.96)
function formatResult(operation, result, cwd) {
  switch (operation) {
    case "goToDefinition": {
      let locations = (Array.isArray(result) ? result : result ? [result] : []).map(toLocation_2),
        invalidLocations = locations.filter((loc) => !loc || !loc.uri);
      if (invalidLocations.length > 0)
        logForDebugging(
          `LSP server returned ${invalidLocations.length} location(s) with undefined URI for goToDefinition on ${cwd}. This indicates malformed data from the LSP server.`,
          { level: "error" },
        );
      let validLocations = locations.filter((loc) => loc && loc.uri);
      return {
        formatted: formatGoToDefinitionResult(result, cwd),
        resultCount: validLocations.length,
        fileCount: countUniqueFilesFromCallItems(validLocations),
      };
    }
    case "findReferences": {
      let s = result || [],
        invalidLocations = s.filter((loc) => !loc || !loc.uri);
      if (invalidLocations.length > 0)
        logForDebugging(
          `LSP server returned ${invalidLocations.length} location(s) with undefined URI for findReferences on ${cwd}. This indicates malformed data from the LSP server.`,
          { level: "error" },
        );
      let validLocations = s.filter((loc) => loc && loc.uri);
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
      let s = result || [],
        h = s.length > 0 && s[0] && "range" in s[0] ? countSymbols(s) : s.length;
      return {
        formatted: formatDocumentSymbolResult(result, cwd),
        resultCount: h,
        fileCount: s.length > 0 ? 1 : 0,
      };
    }
    case "workspaceSymbol": {
      let s = result || [],
        invalidSymbols = s.filter((sym) => !sym || !sym.location || !sym.location.uri);
      if (invalidSymbols.length > 0)
        logForDebugging(
          `LSP server returned ${invalidSymbols.length} symbol(s) with undefined location URI for workspaceSymbol on ${cwd}. This indicates malformed data from the LSP server.`,
          { level: "error" },
        );
      let validSymbols = s.filter((sym) => sym && sym.location && sym.location.uri),
        locations = validSymbols.map((k) => k.location);
      return {
        formatted: formatWorkspaceSymbolResult(result, cwd),
        resultCount: validSymbols.length,
        fileCount: countUniqueFilesFromCallItems(locations),
      };
    }
    case "goToImplementation": {
      let locations = (Array.isArray(result) ? result : result ? [result] : []).map(toLocation_2),
        invalidLocations = locations.filter((loc) => !loc || !loc.uri);
      if (invalidLocations.length > 0)
        logForDebugging(
          `LSP server returned ${invalidLocations.length} location(s) with undefined URI for goToImplementation on ${cwd}. This indicates malformed data from the LSP server.`,
          { level: "error" },
        );
      let validLocations = locations.filter((loc) => loc && loc.uri);
      return {
        formatted: formatGoToDefinitionResult(result, cwd),
        resultCount: validLocations.length,
        fileCount: countUniqueFilesFromCallItems(validLocations),
      };
    }
    case "prepareCallHierarchy": {
      let s = result || [];
      return {
        formatted: formatPrepareCallHierarchyResult(result, cwd),
        resultCount: s.length,
        fileCount: s.length > 0 ? new Set(s.map((f) => f.uri).filter((f) => f)).size : 0,
      };
    }
    case "incomingCalls": {
      let s = result || [];
      return {
        formatted: formatIncomingCallsResult(result, cwd),
        resultCount: s.length,
        fileCount: s.length > 0 ? new Set(s.map((f) => f.from?.uri).filter((f) => f)).size : 0,
      };
    }
    case "outgoingCalls": {
      let s = result || [];
      return {
        formatted: formatOutgoingCallsResult(result, cwd),
        resultCount: s.length,
        fileCount: s.length > 0 ? new Set(s.map((f) => f.to?.uri).filter((f) => f)).size : 0,
      };
    }
  }
}

export { LSPTool, isLocationLink, toLocation, xe };
