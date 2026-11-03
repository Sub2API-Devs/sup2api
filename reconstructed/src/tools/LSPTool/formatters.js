/**
 * tools/LSPTool/formatters.ts
 *
 * LSP 结果格式化（定义、引用、hover、符号、调用层次）；混有插件市场等误归声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/LSPTool/formatters.ts
 * pieces: chunk-kxyd0g16.js (15)
 * attribution: fingerprint 14, layout 1
 */
import { relative } from "path";
import { logForDebugging } from "../../utils/debug.js";
import { stripPrefix, plural } from "../../utils/stringUtils.js";
import { errorMessage } from "../../utils/errors.js";
import { isLocationLink, toLocation } from "./LSPTool.js";

//@ chunk-kxyd0g16.js:93527-93998 fingerprint = formatUri (0.932)
function formatUri(uri, cwd) {
  if (!uri)
    return (
      logForDebugging("formatUri called with undefined URI - indicates malformed LSP server response", {
        level: "warn",
      }),
      "<unknown location>"
    );
  let n = stripPrefix(uri, "file://");
  if (/^\/[A-Za-z]:/.test(n)) n = n.slice(1);
  try {
    n = decodeURIComponent(n);
  } catch (error) {
    let errorMsg = errorMessage(error);
    logForDebugging(`Failed to decode LSP URI '${uri}': ${errorMsg}. Using un-decoded path: ${n}`, {
      level: "warn",
    });
  }
  if (cwd) {
    let relativePath = relative(cwd, n).replaceAll("\\", "/");
    if (relativePath.length < n.length && !relativePath.startsWith("../../")) return relativePath;
  }
  return n.replaceAll("\\", "/");
}
//@ chunk-kxyd0g16.js:93998-94145 fingerprint = groupByFile (1)
function groupByFile(items, cwd) {
  let byFile = new Map();
  for (let item of items) {
    let uri = "uri" in item ? item.uri : item.location.uri,
      filePath = formatUri(uri, cwd),
      existingItems = byFile.get(filePath);
    if (existingItems) existingItems.push(item);
    else byFile.set(filePath, [item]);
  }
  return byFile;
}
//@ chunk-kxyd0g16.js:94145-94254 fingerprint = formatLocation (1)
function formatLocation(location, cwd) {
  let filePath = formatUri(location.uri, cwd),
    s = location.range.start.line + 1,
    f = location.range.start.character + 1;
  return `${filePath}:${s}:${f}`;
}
/**
 * 格式化 goToDefinition / goToImplementation 结果。
 */
//@ chunk-kxyd0g16.js:94374-95169 fingerprint = formatGoToDefinitionResult (1)
function formatGoToDefinitionResult(result, cwd) {
  if (!result)
    return "No definition found. This may occur if the cursor is not on a symbol, or if the definition is in an external library not indexed by the LSP server.";
  if (Array.isArray(result)) {
    let locations = result.map((item) => (isLocationLink(item) ? toLocation(item) : item)),
      invalidLocations = locations.filter((loc) => !loc || !loc.uri);
    if (invalidLocations.length > 0)
      logForDebugging(
        `formatGoToDefinitionResult: Filtering out ${invalidLocations.length} invalid location(s) - this should have been caught earlier`,
        { level: "warn" },
      );
    let validLocations = locations.filter((loc) => loc && loc.uri);
    if (validLocations.length === 0)
      return "No definition found. This may occur if the cursor is not on a symbol, or if the definition is in an external library not indexed by the LSP server.";
    if (validLocations.length === 1) return `Defined in ${formatLocation(validLocations[0], cwd)}`;
    let joined = validLocations.map((loc) => `  ${formatLocation(loc, cwd)}`).join(`
`);
    return `Found ${validLocations.length} definitions:
${joined}`;
  }
  let location = isLocationLink(result) ? toLocation(result) : result;
  return `Defined in ${formatLocation(location, cwd)}`;
}
/**
 * 格式化 findReferences 结果（按文件分组）。
 */
//@ chunk-kxyd0g16.js:95169-95978 fingerprint = formatFindReferencesResult (1)
function formatFindReferencesResult(result, cwd) {
  if (!result || result.length === 0)
    return "No references found. This may occur if the symbol has no usages, or if the LSP server has not fully indexed the workspace.";
  let invalidLocations = result.filter((loc) => !loc || !loc.uri);
  if (invalidLocations.length > 0)
    logForDebugging(
      `formatFindReferencesResult: Filtering out ${invalidLocations.length} invalid location(s) - this should have been caught earlier`,
      { level: "warn" },
    );
  let validLocations = result.filter((loc) => loc && loc.uri);
  if (validLocations.length === 0)
    return "No references found. This may occur if the symbol has no usages, or if the LSP server has not fully indexed the workspace.";
  if (validLocations.length === 1)
    return `Found 1 reference:
  ${formatLocation(validLocations[0], cwd)}`;
  let byFile = groupByFile(validLocations, cwd),
    lines = [`Found ${validLocations.length} references across ${byFile.size} files:`];
  for (let [y, k] of byFile) {
    lines.push(`
${y}:`);
    for (let loc of k) {
      let S = loc.range.start.line + 1,
        R = loc.range.start.character + 1;
      lines.push(`  Line ${S}:${R}`);
    }
  }
  return lines.join(`
`);
}
//@ chunk-kxyd0g16.js:95978-96168 layout = extractMarkupText (1)
function extractMarkupText(contents) {
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
/**
 * 格式化 hover 结果（MarkupContent/MarkedString）。
 */
//@ chunk-kxyd0g16.js:96168-96469 fingerprint = formatHoverResult (1)
function formatHoverResult(result, _cwd) {
  if (!result)
    return "No hover information available. This may occur if the cursor is not on a symbol, or if the LSP server has not fully indexed the file.";
  let content = extractMarkupText(result.contents);
  if (result.range) {
    let s = result.range.start.line + 1,
      f = result.range.start.character + 1;
    return `Hover info at ${s}:${f}:

${content}`;
  }
  return content;
}
//@ chunk-kxyd0g16.js:96469-96882 fingerprint = symbolKindToString (1)
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
//@ chunk-kxyd0g16.js:96882-97139 fingerprint = formatDocumentSymbolNode (1)
function formatDocumentSymbolNode(symbol, indent = 0) {
  let lines = [],
    prefix = "  ".repeat(indent),
    kind = symbolKindToString(symbol.kind),
    line = `${prefix}${symbol.name} (${kind})`;
  if (symbol.detail) line += ` ${symbol.detail}`;
  let symbolLine = symbol.range.start.line + 1;
  if (((line += ` - Line ${symbolLine}`), lines.push(line), symbol.children && symbol.children.length > 0))
    for (let child of symbol.children) lines.push(...formatDocumentSymbolNode(child, indent + 1));
  return lines;
}
/**
 * 格式化 documentSymbol 结果（层级缩进）。
 */
//@ chunk-kxyd0g16.js:97139-97459 fingerprint = formatDocumentSymbolResult (1)
function formatDocumentSymbolResult(result, cwd) {
  if (!result || result.length === 0)
    return "No symbols found in document. This may occur if the file is empty, not supported by the LSP server, or if the server has not fully indexed the file.";
  let firstSymbol = result[0];
  if (firstSymbol && "location" in firstSymbol) return formatWorkspaceSymbolResult(result, cwd);
  let lines = ["Document symbols:"];
  for (let h of result) lines.push(...formatDocumentSymbolNode(h));
  return lines.join(`
`);
}
/**
 * 格式化 workspaceSymbol 结果。
 */
//@ chunk-kxyd0g16.js:97459-98333 fingerprint = formatWorkspaceSymbolResult (1)
function formatWorkspaceSymbolResult(result, cwd) {
  if (!result || result.length === 0)
    return "No symbols found in workspace. This may occur if the workspace is empty, or if the LSP server has not finished indexing the project.";
  let invalidSymbols = result.filter((sym) => !sym || !sym.location || !sym.location.uri);
  if (invalidSymbols.length > 0)
    logForDebugging(
      `formatWorkspaceSymbolResult: Filtering out ${invalidSymbols.length} invalid symbol(s) - this should have been caught earlier`,
      { level: "warn" },
    );
  let validSymbols = result.filter((sym) => sym && sym.location && sym.location.uri);
  if (validSymbols.length === 0)
    return "No symbols found in workspace. This may occur if the workspace is empty, or if the LSP server has not finished indexing the project.";
  let lines = [`Found ${validSymbols.length} ${plural(validSymbols.length, "symbol")} in workspace:`],
    byFile = groupByFile(validSymbols, cwd);
  for (let [y, k] of byFile) {
    lines.push(`
${y}:`);
    for (let symbol of k) {
      let kind = symbolKindToString(symbol.kind),
        line = symbol.location.range.start.line + 1,
        symbolLine = `  ${symbol.name} (${kind}) - Line ${line}`;
      if (symbol.containerName) symbolLine += ` in ${symbol.containerName}`;
      lines.push(symbolLine);
    }
  }
  return lines.join(`
`);
}
//@ chunk-kxyd0g16.js:98333-98625 fingerprint = formatCallHierarchyItem (1)
function formatCallHierarchyItem(item, cwd) {
  if (!item.uri)
    return (
      logForDebugging("formatCallHierarchyItem: CallHierarchyItem has undefined URI", { level: "warn" }),
      `${item.name} (${symbolKindToString(item.kind)}) - <unknown location>`
    );
  let filePath = formatUri(item.uri, cwd),
    line = item.range.start.line + 1,
    kind = symbolKindToString(item.kind),
    result = `${item.name} (${kind}) - ${filePath}:${line}`;
  if (item.detail) result += ` [${item.detail}]`;
  return result;
}
/**
 * 格式化 prepareCallHierarchy 结果。
 */
//@ chunk-kxyd0g16.js:98625-98882 fingerprint = formatPrepareCallHierarchyResult (1)
function formatPrepareCallHierarchyResult(result, cwd) {
  if (!result || result.length === 0) return "No call hierarchy item found at this position";
  if (result.length === 1) return `Call hierarchy item: ${formatCallHierarchyItem(result[0], cwd)}`;
  let lines = [`Found ${result.length} call hierarchy items:`];
  for (let item of result) lines.push(`  ${formatCallHierarchyItem(item, cwd)}`);
  return lines.join(`
`);
}
/**
 * 格式化 incomingCalls 结果。
 */
//@ chunk-kxyd0g16.js:98882-99590 fingerprint = formatIncomingCallsResult (1)
function formatIncomingCallsResult(result, cwd) {
  if (!result || result.length === 0) return "No incoming calls found (nothing calls this function)";
  let lines = [`Found ${result.length} incoming ${plural(result.length, "call")}:`],
    byFile = new Map();
  for (let call of result) {
    if (!call.from) {
      logForDebugging("formatIncomingCallsResult: CallHierarchyIncomingCall has undefined from field", {
        level: "warn",
      });
      continue;
    }
    let filePath = formatUri(call.from.uri, cwd),
      existing = byFile.get(filePath);
    if (existing) existing.push(call);
    else byFile.set(filePath, [call]);
  }
  for (let [f, h] of byFile) {
    lines.push(`
${f}:`);
    for (let call of h) {
      if (!call.from) continue;
      let kind = symbolKindToString(call.from.kind),
        line = call.from.range.start.line + 1,
        callLine = `  ${call.from.name} (${kind}) - Line ${line}`;
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
/**
 * 格式化 outgoingCalls 结果。
 */
//@ chunk-kxyd0g16.js:99590-100287 fingerprint = formatOutgoingCallsResult (1)
function formatOutgoingCallsResult(result, cwd) {
  if (!result || result.length === 0) return "No outgoing calls found (this function calls nothing)";
  let lines = [`Found ${result.length} outgoing ${plural(result.length, "call")}:`],
    byFile = new Map();
  for (let call of result) {
    if (!call.to) {
      logForDebugging("formatOutgoingCallsResult: CallHierarchyOutgoingCall has undefined to field", {
        level: "warn",
      });
      continue;
    }
    let filePath = formatUri(call.to.uri, cwd),
      existing = byFile.get(filePath);
    if (existing) existing.push(call);
    else byFile.set(filePath, [call]);
  }
  for (let [f, h] of byFile) {
    lines.push(`
${f}:`);
    for (let call of h) {
      if (!call.to) continue;
      let kind = symbolKindToString(call.to.kind),
        line = call.to.range.start.line + 1,
        callLine = `  ${call.to.name} (${kind}) - Line ${line}`;
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
