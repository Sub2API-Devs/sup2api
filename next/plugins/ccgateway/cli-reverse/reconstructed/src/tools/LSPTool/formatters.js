/**
 * tools/LSPTool/formatters.ts
 *
 * LSP 结果格式化（定义、引用、hover、符号、调用层次）；混有插件市场等误归声明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/LSPTool/formatters.ts
 * pieces: chunk-fmnbrxwy.js (15)
 * attribution: fingerprint 14, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { relative } from "path";
import { logForDebugging } from "../../utils/debug.js";
import { stripPrefix, plural } from "../../utils/stringUtils.js";
import { errorMessage } from "../../utils/errors.js";
import { isLocationLink, toLocation } from "./LSPTool.js";

//@ chunk-fmnbrxwy.js:108241-108712 fingerprint (2.1.88 match: formatUri, 0.932)
function formatUri(uri, cwd) {
  if (!uri) {
    logForDebugging("formatUri called with undefined URI - indicates malformed LSP server response", {
      level: "warn",
    });
    return "<unknown location>";
  }
  let filePath = stripPrefix(uri, "file://");
  if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1);
  try {
    filePath = decodeURIComponent(filePath);
  } catch (error) {
    let errorMsg = errorMessage(error);
    logForDebugging(`Failed to decode LSP URI '${uri}': ${errorMsg}. Using un-decoded path: ${filePath}`, {
      level: "warn",
    });
  }
  if (cwd) {
    let relativePath = relative(cwd, filePath).replaceAll("\\", "/");
    if (relativePath.length < filePath.length && !relativePath.startsWith("../../")) return relativePath;
  }
  return filePath.replaceAll("\\", "/");
}
//@ chunk-fmnbrxwy.js:108712-108859 fingerprint (2.1.88 match: groupByFile, 1)
function groupByFile(items, cwd) {
  let byFile = new Map();
  for (let item of items) {
    let uri = "uri" in item ? item.uri : item.location.uri;
    let filePath = formatUri(uri, cwd);
    let existingItems = byFile.get(filePath);
    if (existingItems) existingItems.push(item);
    else byFile.set(filePath, [item]);
  }
  return byFile;
}
//@ chunk-fmnbrxwy.js:108859-108968 fingerprint (2.1.88 match: formatLocation, 1)
function formatLocation(location, cwd) {
  let filePath = formatUri(location.uri, cwd);
  let line = location.range.start.line + 1;
  let character = location.range.start.character + 1;
  return `${filePath}:${line}:${character}`;
}
//@ chunk-fmnbrxwy.js:109088-109883 fingerprint (2.1.88 match: formatGoToDefinitionResult, 1)
/**
 * 格式化 goToDefinition / goToImplementation 结果。
 */
function formatGoToDefinitionResult(result, cwd) {
  if (!result)
    return "No definition found. This may occur if the cursor is not on a symbol, or if the definition is in an external library not indexed by the LSP server.";
  if (Array.isArray(result)) {
    let locations = result.map((item) => (isLocationLink(item) ? toLocation(item) : item));
    let invalidLocations = locations.filter((loc) => !loc || !loc.uri);
    if (invalidLocations.length > 0)
      logForDebugging(
        `formatGoToDefinitionResult: Filtering out ${invalidLocations.length} invalid location(s) - this should have been caught earlier`,
        {
          level: "warn",
        },
      );
    let validLocations = locations.filter((loc) => loc && loc.uri);
    if (validLocations.length === 0)
      return "No definition found. This may occur if the cursor is not on a symbol, or if the definition is in an external library not indexed by the LSP server.";
    if (validLocations.length === 1) return `Defined in ${formatLocation(validLocations[0], cwd)}`;
    let locationList = validLocations.map((loc) => `  ${formatLocation(loc, cwd)}`).join(`
`);
    return `Found ${validLocations.length} definitions:
${locationList}`;
  }
  let location = isLocationLink(result) ? toLocation(result) : result;
  return `Defined in ${formatLocation(location, cwd)}`;
}
//@ chunk-fmnbrxwy.js:109883-110692 fingerprint (2.1.88 match: formatFindReferencesResult, 1)
/**
 * 格式化 findReferences 结果（按文件分组）。
 */
function formatFindReferencesResult(result, cwd) {
  if (!result || result.length === 0)
    return "No references found. This may occur if the symbol has no usages, or if the LSP server has not fully indexed the workspace.";
  let invalidLocations = result.filter((loc) => !loc || !loc.uri);
  if (invalidLocations.length > 0)
    logForDebugging(
      `formatFindReferencesResult: Filtering out ${invalidLocations.length} invalid location(s) - this should have been caught earlier`,
      {
        level: "warn",
      },
    );
  let validLocations = result.filter((loc) => loc && loc.uri);
  if (validLocations.length === 0)
    return "No references found. This may occur if the symbol has no usages, or if the LSP server has not fully indexed the workspace.";
  if (validLocations.length === 1)
    return `Found 1 reference:
  ${formatLocation(validLocations[0], cwd)}`;
  let byFile = groupByFile(validLocations, cwd);
  let lines = [`Found ${validLocations.length} references across ${byFile.size} files:`];
  for (let [filePath, locations] of byFile) {
    lines.push(`
${filePath}:`);
    for (let loc of locations) {
      let line = loc.range.start.line + 1;
      let character = loc.range.start.character + 1;
      lines.push(`  Line ${line}:${character}`);
    }
  }
  return lines.join(`
`);
}
//@ chunk-fmnbrxwy.js:110692-110882 layout (2.1.88 match: extractMarkupText, 1)
function flattenTextBlocks(contents) {
  if (Array.isArray(contents))
    return contents.map((item) => {
      if (typeof item === "string") return item;
      return item.value;
    }).join(`

`);
  if (typeof contents === "string") return contents;
  if ("kind" in contents) return contents.value;
  return contents.value;
}
//@ chunk-fmnbrxwy.js:110882-111183 fingerprint (2.1.88 match: formatHoverResult, 1)
/**
 * 格式化 hover 结果（MarkupContent/MarkedString）。
 */
function formatHoverResult(result, _cwd) {
  if (!result)
    return "No hover information available. This may occur if the cursor is not on a symbol, or if the LSP server has not fully indexed the file.";
  let content = flattenTextBlocks(result.contents);
  if (result.range) {
    let line = result.range.start.line + 1;
    let character = result.range.start.character + 1;
    return `Hover info at ${line}:${character}:

${content}`;
  }
  return content;
}
//@ chunk-fmnbrxwy.js:111183-111596 fingerprint (2.1.88 match: symbolKindToString, 1)
function symbolKindToString(kind) {
  return (
    {
      [1]: "File",
      [2]: "Module",
      [3]: "Namespace",
      [4]: "Package",
      [5]: "Class",
      [6]: "Method",
      [7]: "Property",
      [8]: "Field",
      [9]: "Constructor",
      [10]: "Enum",
      [11]: "Interface",
      [12]: "Function",
      [13]: "Variable",
      [14]: "Constant",
      [15]: "String",
      [16]: "Number",
      [17]: "Boolean",
      [18]: "Array",
      [19]: "Object",
      [20]: "Key",
      [21]: "Null",
      [22]: "EnumMember",
      [23]: "Struct",
      [24]: "Event",
      [25]: "Operator",
      [26]: "TypeParameter",
    }[kind] || "Unknown"
  );
}
//@ chunk-fmnbrxwy.js:111596-111853 fingerprint (2.1.88 match: formatDocumentSymbolNode, 1)
function formatDocumentSymbolNode(symbol, indent = 0) {
  let lines = [];
  let prefix = "  ".repeat(indent);
  let kind = symbolKindToString(symbol.kind);
  let line = `${prefix}${symbol.name} (${kind})`;
  if (symbol.detail) line += ` ${symbol.detail}`;
  let symbolLine = symbol.range.start.line + 1;
  line += ` - Line ${symbolLine}`;
  lines.push(line);
  if (symbol.children && symbol.children.length > 0)
    for (let child of symbol.children) lines.push(...formatDocumentSymbolNode(child, indent + 1));
  return lines;
}
//@ chunk-fmnbrxwy.js:111853-112173 fingerprint (2.1.88 match: formatDocumentSymbolResult, 1)
/**
 * 格式化 documentSymbol 结果（层级缩进）。
 */
function formatDocumentSymbolResult(result, cwd) {
  if (!result || result.length === 0)
    return "No symbols found in document. This may occur if the file is empty, not supported by the LSP server, or if the server has not fully indexed the file.";
  let firstSymbol = result[0];
  if (firstSymbol && "location" in firstSymbol) return formatWorkspaceSymbolResult(result, cwd);
  let lines = ["Document symbols:"];
  for (let symbol of result) lines.push(...formatDocumentSymbolNode(symbol));
  return lines.join(`
`);
}
//@ chunk-fmnbrxwy.js:112173-113047 fingerprint (2.1.88 match: formatWorkspaceSymbolResult, 1)
/**
 * 格式化 workspaceSymbol 结果。
 */
function formatWorkspaceSymbolResult(result, cwd) {
  if (!result || result.length === 0)
    return "No symbols found in workspace. This may occur if the workspace is empty, or if the LSP server has not finished indexing the project.";
  let invalidSymbols = result.filter((sym) => !sym || !sym.location || !sym.location.uri);
  if (invalidSymbols.length > 0)
    logForDebugging(
      `formatWorkspaceSymbolResult: Filtering out ${invalidSymbols.length} invalid symbol(s) - this should have been caught earlier`,
      {
        level: "warn",
      },
    );
  let validSymbols = result.filter((sym) => sym && sym.location && sym.location.uri);
  if (validSymbols.length === 0)
    return "No symbols found in workspace. This may occur if the workspace is empty, or if the LSP server has not finished indexing the project.";
  let lines = [`Found ${validSymbols.length} ${plural(validSymbols.length, "symbol")} in workspace:`];
  let byFile = groupByFile(validSymbols, cwd);
  for (let [filePath, symbols] of byFile) {
    lines.push(`
${filePath}:`);
    for (let symbol of symbols) {
      let kind = symbolKindToString(symbol.kind);
      let line = symbol.location.range.start.line + 1;
      let symbolLine = `  ${symbol.name} (${kind}) - Line ${line}`;
      if (symbol.containerName) symbolLine += ` in ${symbol.containerName}`;
      lines.push(symbolLine);
    }
  }
  return lines.join(`
`);
}
//@ chunk-fmnbrxwy.js:113047-113339 fingerprint (2.1.88 match: formatCallHierarchyItem, 1)
function formatCallHierarchyItem(item, cwd) {
  if (!item.uri) {
    logForDebugging("formatCallHierarchyItem: CallHierarchyItem has undefined URI", {
      level: "warn",
    });
    return `${item.name} (${symbolKindToString(item.kind)}) - <unknown location>`;
  }
  let filePath = formatUri(item.uri, cwd);
  let line = item.range.start.line + 1;
  let kind = symbolKindToString(item.kind);
  let result = `${item.name} (${kind}) - ${filePath}:${line}`;
  if (item.detail) result += ` [${item.detail}]`;
  return result;
}
//@ chunk-fmnbrxwy.js:113339-113596 fingerprint (2.1.88 match: formatPrepareCallHierarchyResult, 1)
/**
 * 格式化 prepareCallHierarchy 结果。
 */
function formatPrepareCallHierarchyResult(result, cwd) {
  if (!result || result.length === 0) return "No call hierarchy item found at this position";
  if (result.length === 1) return `Call hierarchy item: ${formatCallHierarchyItem(result[0], cwd)}`;
  let lines = [`Found ${result.length} call hierarchy items:`];
  for (let item of result) lines.push(`  ${formatCallHierarchyItem(item, cwd)}`);
  return lines.join(`
`);
}
//@ chunk-fmnbrxwy.js:113596-114304 fingerprint (2.1.88 match: formatIncomingCallsResult, 1)
/**
 * 格式化 incomingCalls 结果。
 */
function formatIncomingCallsResult(result, cwd) {
  if (!result || result.length === 0) return "No incoming calls found (nothing calls this function)";
  let lines = [`Found ${result.length} incoming ${plural(result.length, "call")}:`];
  let byFile = new Map();
  for (let call of result) {
    if (!call.from) {
      logForDebugging("formatIncomingCallsResult: CallHierarchyIncomingCall has undefined from field", {
        level: "warn",
      });
      continue;
    }
    let filePath = formatUri(call.from.uri, cwd);
    let existing = byFile.get(filePath);
    if (existing) existing.push(call);
    else byFile.set(filePath, [call]);
  }
  for (let [filePath, calls] of byFile) {
    lines.push(`
${filePath}:`);
    for (let call of calls) {
      if (!call.from) continue;
      let kind = symbolKindToString(call.from.kind);
      let line = call.from.range.start.line + 1;
      let callLine = `  ${call.from.name} (${kind}) - Line ${line}`;
      if (call.fromRanges && call.fromRanges.length > 0) {
        let callSites = call.fromRanges
          .map((fromRange) => `${fromRange.start.line + 1}:${fromRange.start.character + 1}`)
          .join(", ");
        callLine += ` [calls at: ${callSites}]`;
      }
      lines.push(callLine);
    }
  }
  return lines.join(`
`);
}
//@ chunk-fmnbrxwy.js:114304-115001 fingerprint (2.1.88 match: formatOutgoingCallsResult, 1)
/**
 * 格式化 outgoingCalls 结果。
 */
function formatOutgoingCallsResult(result, cwd) {
  if (!result || result.length === 0) return "No outgoing calls found (this function calls nothing)";
  let lines = [`Found ${result.length} outgoing ${plural(result.length, "call")}:`];
  let byFile = new Map();
  for (let call of result) {
    if (!call.to) {
      logForDebugging("formatOutgoingCallsResult: CallHierarchyOutgoingCall has undefined to field", {
        level: "warn",
      });
      continue;
    }
    let filePath = formatUri(call.to.uri, cwd);
    let existing = byFile.get(filePath);
    if (existing) existing.push(call);
    else byFile.set(filePath, [call]);
  }
  for (let [filePath, calls] of byFile) {
    lines.push(`
${filePath}:`);
    for (let call of calls) {
      if (!call.to) continue;
      let kind = symbolKindToString(call.to.kind);
      let line = call.to.range.start.line + 1;
      let callLine = `  ${call.to.name} (${kind}) - Line ${line}`;
      if (call.fromRanges && call.fromRanges.length > 0) {
        let callSites = call.fromRanges
          .map((fromRange) => `${fromRange.start.line + 1}:${fromRange.start.character + 1}`)
          .join(", ");
        callLine += ` [called from: ${callSites}]`;
      }
      lines.push(callLine);
    }
  }
  return lines.join(`
`);
}
export {
  formatGoToDefinitionResult,
  formatFindReferencesResult,
  formatHoverResult,
  formatDocumentSymbolResult,
  formatWorkspaceSymbolResult,
  formatPrepareCallHierarchyResult,
  formatIncomingCallsResult,
  formatOutgoingCallsResult,
};
