/**
 * services/artifacts/capabilityDeclaration.ts
 *
 * 2.1.316 新增：页面能力声明（mcp/db/user）的规范化、host grant 过滤与展示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-chhd9p2w.js (79)
 * attribution: placement 79
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isPlainObjectConnector,
  emptyConnectorResolution,
  CONNECTOR_NAME_FIELDS,
  isDeclarableServer,
  sanitizeConnectorName,
} from "./connectorNames.js";
import {
  SAFE_ID_RE,
  MAX_SANITIZED_TEXT,
  MAX_LISTED_MCP_SERVERS,
  ESCAPE_CHAR_RE,
  MAX_NAME_LENGTH,
  makeEdgeSpaceMasker,
  escapeChar,
} from "./textSanitize.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { internalKey } from "../mcp/serverIdentity.js";
import {
  hostCapabilityServer,
  sameNormalizedServer,
  isHostCapabilityServer,
  HOST_CAPABILITY_SERVERS,
} from "../mcp/firstPartyServerIds.js";
import { CLAUDE_AI, CLAUDEAI_SERVER_PREFIX } from "../mcp/normalization.js";
import { firstLineOf, plural } from "../../utils/stringUtils.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, array, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  readUntrustedArray,
  UNREADABLE_ARRAY,
  UNREADABLE_LIST_TEXT,
  readUntrustedArrayOrUndefined,
} from "../../utils/untrustedArray.js";
import {
  QUOTE_HOMOGLYPHS,
  MODEL_TEXT_PUNCT_CODE_POINT,
  isJoinerOrEmojiSelector,
  selectorOrJoinerRides,
  rideStateAfter,
  sweepMarkerLookalikes,
  sweepAskCopy,
  isDecisionSurfaceControl,
  INVISIBLE_BLANKS,
} from "../../tools/ArtifactTool/artifactUrls.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-chhd9p2w.js:4934-4972 placement
function getUserScopes(user) {
  return arrayField(user, "scopes");
}
//@ chunk-chhd9p2w.js:4972-5064 placement
function isValidScopeList(scopes) {
  return scopes.every((scope) => typeof scope === "string" && /^[a-z][a-z0-9_-]{0,31}$/.test(scope));
}
//@ chunk-chhd9p2w.js:5064-5193 placement
function isValidUserCapability(user) {
  if (!isPlainObjectConnector(user)) return false;
  let { scopes, ...rest } = user;
  return (
    Object.keys(rest).length === 0 &&
    (scopes === undefined || (Array.isArray(scopes) && isValidScopeList(scopes)))
  );
}
//@ chunk-chhd9p2w.js:5193-5271 placement
function arrayField(obj, key) {
  if (!isPlainObjectConnector(obj)) return;
  let value = obj[key];
  return Array.isArray(value) ? value : undefined;
}
//@ chunk-chhd9p2w.js:5271-5411 placement
/**
 * 数据库规则路径正则（允许 {self} 段）与可用作用域集合（view/interact/admin/owner/self）。
 */
var DB_RULE_PATH_REGEX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DB_RULE_SCOPES;
deferInit("chunk-chhd9p2w.js:5271", () => {
  DB_RULE_PATH_REGEX = /^(?:[A-Za-z0-9_.~:@+-]+|\{self\})(?:\/(?:[A-Za-z0-9_.~:@+-]+|\{self\}))*$/;
  DB_RULE_SCOPES = new Set(["view", "interact", "admin", "owner", "self"]);
});
//@ chunk-chhd9p2w.js:5411-5626 placement
function isValidDbCapability(db) {
  if (!isPlainObjectConnector(db)) return false;
  let { rules, wake, ...rest } = db;
  return (
    Object.keys(rest).length === 0 &&
    (rules === undefined || (Array.isArray(rules) && isValidDbRules(rules))) &&
    (wake === undefined ||
      (Array.isArray(wake) &&
        wake.every((path) => typeof path === "string" && DB_RULE_PATH_REGEX.test(path))))
  );
}
//@ chunk-chhd9p2w.js:5626-5889 placement
function isValidDbRules(rules) {
  return rules.every((rule) => {
    if (!isPlainObjectConnector(rule)) return false;
    let { path, read, write, ...rest } = rule;
    return (
      Object.keys(rest).length === 0 &&
      typeof path === "string" &&
      (path === "" || DB_RULE_PATH_REGEX.test(path)) &&
      (read === undefined || (typeof read === "string" && DB_RULE_SCOPES.has(read))) &&
      (write === undefined || (typeof write === "string" && DB_RULE_SCOPES.has(write)))
    );
  });
}
//@ chunk-chhd9p2w.js:5889-5948 placement
function serverConfigOrUndefined(value) {
  try {
    return isPlainObjectConnector(value) ? value : undefined;
  } catch {
    return null;
  }
}
//@ chunk-chhd9p2w.js:5948-6022 placement
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
//@ chunk-chhd9p2w.js:6022-6057 placement
function stringListOrNull(tools) {
  return isStringArray(tools) ? tools : null;
}
//@ chunk-chhd9p2w.js:6057-6109 placement
function safeIds(ids) {
  return [...ids].filter((id) => SAFE_ID_RE.test(id));
}
//@ chunk-chhd9p2w.js:6109-6161 placement
function normalizedOrLower(value) {
  return normalizeUuidOrNull(value) === null ? value : value.toLowerCase();
}
//@ chunk-chhd9p2w.js:6161-11535 placement
/**
 * 规范化页面声明的 mcp 能力（servers 列表、dynamic、改名），返回规范结果、警告与被重命名的服务器。
 */
function normalizeMcpCapability(capabilities, connectors, serverNames, options = {}) {
  let mcp = capabilities.mcp;
  if (mcp === undefined)
    return {
      ok: true,
      caps: capabilities,
      warnings: [],
      servers: [],
      renamed: [],
    };
  let servers = isPlainObjectConnector(mcp) ? mcp.servers : false;
  if (servers === false || (servers != null && !Array.isArray(servers)))
    return {
      ...emptyConnectorResolution(),
      malformed: [
        {
          kind: "not_object",
        },
      ],
    };
  if (isPlainObjectConnector(mcp) && mcp.dynamic !== undefined && typeof mcp.dynamic !== "boolean")
    return {
      ...emptyConnectorResolution(),
      malformed: [
        {
          kind: "dynamic_not_boolean",
        },
      ],
    };
  if (servers == null || servers.length === 0) {
    if (isPlainObjectConnector(mcp) && isDynamicMcp(mcp))
      return {
        ok: true,
        caps: {
          ...capabilities,
          mcp: {
            ...mcp,
            servers: [],
          },
        },
        warnings: [],
        servers: [],
        renamed: [],
      };
    return {
      ...emptyConnectorResolution(),
      malformed: [
        {
          kind: "no_servers",
        },
      ],
    };
  }
  let byPrefix = new Map(connectors.map((connector) => [normalizedOrLower(connector.toolPrefix), connector]));
  let byServer = new Map(connectors.map((connector) => [connector.server, connector]));
  let unresolved = [];
  let internal = [];
  let malformed = [];
  let resolvedServers = [];
  let renamedServers = new Map();
  let suggestedNames = new Map();
  let renamedTools = [];
  let unknownToolNotes = [];
  for (let [index, entry] of servers.entries()) {
    let serverField = getServerField(entry);
    let serverFieldName = serverField?.startsWith("host:")
      ? `host:${internalKey(serverField.slice(5))}`
      : serverField;
    if (serverFieldName === undefined) {
      let wrongKey =
        entry !== null && typeof entry === "object"
          ? (CONNECTOR_NAME_FIELDS.find((fieldName) => fieldName in entry) ?? null)
          : null;
      malformed.push({
        kind: "entry_shape",
        index,
        wrongKey,
      });
      continue;
    }
    let byPrefixMatch = byPrefix.get(normalizedOrLower(internalKey(serverFieldName)));
    let tools = isPlainObjectConnector(entry) ? entry.tools : undefined;
    let toolNames = stringListOrNull(tools);
    if (tools === undefined || toolNames?.length === 0) {
      let known = byPrefixMatch ?? byServer.get(serverFieldName);
      malformed.push({
        kind: "no_tools",
        server: serverFieldName,
        display:
          byPrefixMatch !== undefined && isDeclarableServer(byPrefixMatch) ? byPrefixMatch.server : null,
        available: safeIds(known?.toolNames ?? []),
      });
    } else if (toolNames === null)
      malformed.push({
        kind: "tools_shape",
        server: serverFieldName,
      });
    let localServerName = getLocalServerName(serverFieldName);
    let localConnector =
      localServerName === undefined ? undefined : byPrefix.get(normalizedOrLower(localServerName));
    let hostServer = localServerName === undefined ? null : hostCapabilityServer(localServerName);
    let resolvedName = null;
    let byServerMatch = byServer.get(serverFieldName);
    if (byPrefixMatch !== undefined) {
      if (!isDeclarableServer(byPrefixMatch))
        malformed.push({
          kind: "undeclarable_name",
          server: serverFieldName,
          name: byPrefixMatch.server,
        });
      else if (normalizeUuidOrNull(serverFieldName) !== null)
        malformed.push({
          kind: "known_id",
          server: serverFieldName,
          display: byPrefixMatch.server,
        });
      else {
        resolvedName = byPrefixMatch.server;
        if (serverFieldName !== byPrefixMatch.server)
          renamedServers.set(serverFieldName, byPrefixMatch.server);
      }
    } else if (byServerMatch !== undefined) {
      if (isDeclarableServer(byServerMatch)) resolvedName = serverFieldName;
      else
        malformed.push({
          kind: "undeclarable_name",
          server: serverFieldName,
          name: serverFieldName,
        });
    } else if (serverFieldName.startsWith(CLAUDE_AI)) unresolved.push(serverFieldName);
    else if (serverFieldName.startsWith("mcp__")) {
      let toolNameMatch = byPrefix.get(normalizedOrLower(firstLineOf(serverFieldName.slice(5), "__")));
      malformed.push({
        kind: "tool_name",
        server: serverFieldName,
        display:
          toolNameMatch !== undefined && isDeclarableServer(toolNameMatch) ? toolNameMatch.server : null,
      });
    } else if (normalizeUuidOrNull(serverFieldName) !== null)
      malformed.push({
        kind: "opaque_id",
        server: serverFieldName,
      });
    else if (localConnector !== undefined)
      malformed.push(
        isDeclarableServer(localConnector)
          ? {
              kind: "connector_as_host",
              server: serverFieldName,
              display: localConnector.server,
            }
          : {
              kind: "undeclarable_name",
              server: serverFieldName,
              name: localConnector.server,
            },
      );
    else if (localServerName !== undefined && normalizeUuidOrNull(localServerName) !== null)
      malformed.push({
        kind: "opaque_id",
        server: serverFieldName,
      });
    else if (localServerName !== undefined && options.hostServers === false)
      malformed.push({
        kind: "host_unavailable",
        server: serverFieldName,
      });
    else if (hostServer !== null) {
      let matchesHost = (server) =>
        sameNormalizedServer(server, hostServer) ||
        sameNormalizedServer(firstLineOf(`${CLAUDEAI_SERVER_PREFIX(server)}__`, "__"), hostServer) ||
        sameNormalizedServer(normalizeConnectorName(server), hostServer);
      let localName =
        serverNames.find(matchesHost) ??
        connectors.find((connector) => matchesHost(connector.server))?.server;
      if (localName === undefined) resolvedName = `host:${hostServer}`;
      else
        malformed.push({
          kind: "local_server_as_first_party",
          server: serverFieldName,
          local: localName,
        });
    } else if (isHostCapabilityServer(localServerName ?? "")) internal.push(serverFieldName);
    else {
      resolvedName = serverFieldName;
      let suggested =
        localServerName === undefined ? suggestConnectorName(serverFieldName, connectors) : undefined;
      if (suggested !== undefined && !suggestedNames.has(serverFieldName))
        suggestedNames.set(serverFieldName, suggested);
    }
    if (resolvedName !== null && serverField !== serverFieldName && !renamedServers.has(serverFieldName))
      renamedServers.set(serverField ?? serverFieldName, resolvedName);
    if (
      resolvedName !== null &&
      toolNames !== null &&
      toolNames.length > 0 &&
      isPlainObjectConnector(entry)
    ) {
      let knownTools = new Set(
        connectors.flatMap((connector) =>
          connector.server === resolvedName && isDeclarableServer(connector)
            ? (connector.toolNames ?? [])
            : [],
        ),
      );
      let toolsToKeep = toolNames;
      if (knownTools.size > 0) {
        toolsToKeep = toolNames.map((declaredTool) => {
          if (knownTools.has(declaredTool)) return declaredTool;
          let filtered = [...knownTools].filter(
            (candidate) => CLAUDEAI_SERVER_PREFIX(candidate) === declaredTool,
          );
          if (filtered.length !== 1 || !SAFE_ID_RE.test(filtered[0])) return declaredTool;
          renamedTools.push([declaredTool, filtered[0]]);
          return filtered[0];
        });
        let unknown = normalizeCaseForComparison_2(toolsToKeep.filter((tool) => !knownTools.has(tool)));
        if (unknown.length > 0 && unknown.length === normalizeCaseForComparison_2(toolsToKeep).length) {
          malformed.push({
            kind: "unknown_tools",
            server: serverFieldName,
            display: serverFieldName === resolvedName ? null : resolvedName,
            unknown,
            available: safeIds(knownTools),
          });
          continue;
        }
        if (unknown.length > 0)
          unknownToolNotes.push({
            server: resolvedName,
            unknown,
            known: safeIds(knownTools),
          });
      }
      resolvedServers.push({
        ...entry,
        server: resolvedName,
        tools: toolsToKeep,
      });
    }
  }
  if (unresolved.length > 0 || internal.length > 0 || malformed.length > 0)
    return {
      ...emptyConnectorResolution(),
      unresolved,
      internal,
      malformed,
    };
  let mergedServers = [];
  let indexByName = new Map();
  for (let entry of resolvedServers) {
    let slot = indexByName.get(entry.server);
    if (slot === undefined) {
      indexByName.set(entry.server, {
        idx: mergedServers.length,
        from: 1,
      });
      mergedServers.push(entry);
    } else {
      slot.from++;
      let existing = mergedServers[slot.idx];
      mergedServers[slot.idx] = {
        ...existing,
        tools: normalizeCaseForComparison_2([...existing.tools, ...entry.tools]),
      };
    }
  }
  let warnings = [];
  if (renamedServers.size > 0) {
    let joined = capListForDisplay(
      [...renamedServers],
      8,
      ([from, to]) => `"${sanitizeDisplayText(from)}" \u2192 "${sanitizeConnectorName(to)}"`,
    ).join(", ");
    warnings.push(
      `resolved ${plural(renamedServers.size, "a connector name", "connector names")} to the display ${plural(renamedServers.size, "name")} viewers match \u2014 ${joined}; the page must pass exactly ${renamedServers.size === 1 ? "that name" : "those names"} to callTool(\u2026) / watchTool(\u2026).`,
    );
  }
  if (suggestedNames.size > 0) {
    let joined = capListForDisplay(
      [...suggestedNames],
      8,
      ([declared, closest]) =>
        `"${sanitizeConnectorName(declared)}" (closest here: "${sanitizeConnectorName(closest)}")`,
    ).join(", ");
    warnings.push(
      `no connector in this session is named ${joined} \u2014 if the closest name is the one you meant, declare it with exactly that spelling; viewers' connectors are matched by name (ignoring at most letter case and separators), so a name none of them carries works for no viewer.`,
    );
  }
  if (renamedTools.length > 0) {
    let renames = normalizeCaseForComparison_2(
      renamedTools.map(
        ([from, to]) => `"${sanitizeConnectorName(from)}" \u2192 "${sanitizeConnectorName(to)}"`,
      ),
    );
    warnings.push(
      `rewrote mcp tool ${plural(renames.length, "name")} to the upstream ${plural(renames.length, "spelling")} viewers call \u2014 ${capListForDisplay(renames, 8, (text) => text).join(", ")}; the page must pass exactly ${renames.length === 1 ? "that name" : "those names"} to callTool(\u2026) / watchTool(\u2026).`,
    );
  }
  for (let { server, unknown, known } of unknownToolNotes) {
    let joined = capListForDisplay(unknown, 8, (name) => `"${sanitizeConnectorName(name)}"`).join(", ");
    let pronoun = unknown.length === 1 ? "it" : "them";
    let knownNote =
      known.length === 0
        ? ""
        : ` (its tools here: ${capListForDisplay(known, 12, (name) => `"${sanitizeConnectorName(name)}"`).join(", ")})`;
    warnings.push(
      `connector "${sanitizeConnectorName(server)}" has no ${plural(unknown.length, "tool")} named ${joined} in this session${knownNote}, so the page's calls to ${pronoun} fail for any viewer whose "${sanitizeConnectorName(server)}" lacks ${pronoun} too \u2014 "tools" takes the connector's own top-level tool names; if ${pronoun === "it" ? "that name is" : "those names are"} wrong, fix "tools" and publish again.`,
    );
  }
  let oversized = [];
  for (let [server, slot] of indexByName) {
    let toolCount = mergedServers[slot.idx].tools.length;
    let isHost = hostCapabilityServer(getLocalServerName(server) ?? "") !== null;
    if (slot.from > 1 && !isHost) {
      let displayName = sanitizeConnectorName(server);
      let kindLabel = describeServerKind(server);
      warnings.push(
        `${slot.from} manifest entries resolve to ${kindLabel} "${displayName}" and were merged into one (${toolCount} ${plural(toolCount, "tool")}). A viewer with more than one ${kindLabel} named "${displayName}" gets server_ambiguous on every call until the duplicates are renamed or removed.`,
      );
    }
    if (toolCount > MAX_SANITIZED_TEXT)
      oversized.push({
        server,
        toolCount,
      });
  }
  let serverCount = mergedServers.length > MAX_LISTED_MCP_SERVERS ? mergedServers.length : null;
  if (oversized.length > 0 || serverCount !== null)
    return {
      ...emptyConnectorResolution(),
      oversized,
      serverCount,
    };
  return {
    ok: true,
    caps: {
      ...capabilities,
      mcp: {
        ...mcp,
        servers: mergedServers,
      },
    },
    warnings,
    servers: mergedServers.map((server) => server.server),
    renamed: [...renamedServers],
  };
}
//@ chunk-chhd9p2w.js:11535-11814 placement
function findUndeclaredMcpToolCalls(chunks, declaredTools, maxResults = 8) {
  let declared = new Set(declaredTools);
  let seen = new Set();
  let undeclared = [];
  let callPattern = /\.(?:callTool|watchTool)\(\s*(?:'([^'\\\n]{1,200})'|"([^"\\\n]{1,200})")\s*,/g;
  for (let chunk of chunks)
    for (let match of chunk.matchAll(callPattern)) {
      let toolName = match[1] ?? match[2];
      if (declared.has(toolName) || seen.has(toolName)) continue;
      seen.add(toolName);
      undeclared.push(toolName);
      if (undeclared.length >= maxResults) return undeclared;
    }
  return undeclared;
}
//@ chunk-chhd9p2w.js:11814-11894 placement
function foldName(server) {
  return server
    .toLowerCase()
    .replace(/[\s\p{Pd}\p{Pc}]+/gu, " ")
    .trim();
}
//@ chunk-chhd9p2w.js:11894-12395 placement
function suggestConnectorName(name, connectors) {
  let filtered = connectors.filter(isDeclarableServer);
  let folded = foldName(name);
  if (filtered.some((connector) => foldName(connector.server) === folded)) return;
  let stripPunct = (value) => value.replace(/[^\p{L}\p{N}]/gu, "");
  let words = (value) => value.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 3);
  let compact = stripPunct(folded);
  if (compact.length < 3) return;
  let found = filtered.find((connector) => stripPunct(foldName(connector.server)) === compact);
  if (found !== undefined) return found.server;
  let queryWords = words(folded);
  let best;
  for (let connector of filtered) {
    let connectorWords = words(foldName(connector.server));
    let [smaller, larger] =
      connectorWords.length <= queryWords.length
        ? [connectorWords, queryWords]
        : [queryWords, connectorWords];
    if (
      smaller.length > 0 &&
      smaller.every((word) => larger.includes(word)) &&
      (best === undefined || smaller.length > best.shared)
    )
      best = {
        server: connector.server,
        shared: smaller.length,
      };
  }
  return best?.server;
}
//@ chunk-chhd9p2w.js:12395-12506 placement
function findMentionedTools(texts, renamed) {
  return renamed.filter(([pair]) =>
    texts.some((text) => [`'${pair}'`, `"${pair}"`, `\`${pair}\``].some((quoted) => text.includes(quoted))),
  );
}
//@ chunk-chhd9p2w.js:12506-12619 placement
function listLocalServerDeclarations(capabilities) {
  let mcp = capabilities.mcp;
  if (!hasDeclaredServers(mcp)) return [];
  return mcp.servers
    .map(getServerField)
    .filter((server) => server !== undefined && server.startsWith(CLAUDE_AI));
}
//@ chunk-chhd9p2w.js:12619-13447 placement
function findUnservedMcpServers(capabilities, connectors, referencedTools) {
  let mcp = capabilities.mcp;
  let notices = isDynamicMcp(mcp) ? [DYNAMIC_CONNECTOR_NOTICE] : [];
  if (!hasDeclaredServers(mcp)) return notices;
  let declaredServers = normalizeCaseForComparison_2(
    mcp.servers.map(getServerField).filter((field) => field !== undefined),
  );
  let isUnserved = (server) =>
    referencedTools.has(server) &&
    !HOST_CAPABILITY_SERVERS.has(server) &&
    !connectors.some((connector) => connector.toolPrefix === server);
  return declaredServers
    .filter((server) => {
      let server_2 = getLocalServerName(server);
      if (server_2 !== undefined) {
        let hostMatch = hostCapabilityServer(server_2);
        return hostMatch === null
          ? !isUnserved(server_2)
          : ![...referencedTools].some(
              (candidate) => hostCapabilityServer(candidate) === hostMatch && isUnserved(candidate),
            );
      }
      return (
        !referencedTools.has(server) &&
        !isUnserved(normalizeConnectorName(server)) &&
        !connectors.some(
          (connector) => connector.server === server && referencedTools.has(connector.toolPrefix),
        )
      );
    })
    .map((server) => {
      let display = sanitizeConnectorName(server);
      return `This page declares ${describeServerKind(server)} "${display}" but no successful call to it was observed in this session, so the page is published against an unobserved interface. Check the page's argument names against each tool's input schema if this session has the tool. The result fields the page reads stay unverified unless you can safely make one real call; otherwise tell the user the page's "${display}" integration is unverified.`;
    })
    .concat(notices);
}
//@ chunk-chhd9p2w.js:13447-13545 placement
function normalizeConnectorName(value) {
  return CLAUDEAI_SERVER_PREFIX(value)
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 64)
    .replace(/_+$/, "");
}
//@ chunk-chhd9p2w.js:13545-13646 placement
function getServerField(server) {
  let server_2 = server != null && typeof server === "object" ? server.server : undefined;
  return typeof server_2 === "string" ? server_2 : undefined;
}
//@ chunk-chhd9p2w.js:13646-13699 placement
function isNonEmptyObject(capabilities) {
  return isPlainObjectCapability(capabilities) && Object.keys(capabilities).length > 0;
}
//@ chunk-chhd9p2w.js:13699-13770 placement
function isPlainObjectCapability(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-chhd9p2w.js:13770-13814 placement
function foldSelfConfig(capability) {
  let folded = foldSelfCapability(capability);
  return isPlainObjectCapability(folded) ? folded : capability;
}
//@ chunk-chhd9p2w.js:13814-13911 placement
function defineValue(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}
//@ chunk-chhd9p2w.js:13911-14114 placement
function mergeCapabilities(below, above) {
  let folded = foldSelfConfig(below ?? {});
  let folded2 = foldSelfConfig(above ?? {});
  let out = {
    ...folded,
  };
  let changed = false;
  let conflict = false;
  for (let [key, value] of Object.entries(folded2))
    if (Object.hasOwn(folded, key)) conflict ||= !sameCapabilityValue(folded[key], value);
    else {
      defineValue(out, key, value);
      changed = true;
    }
  return {
    capabilities: changed ? out : below,
    widened: changed,
    conflict,
  };
}
//@ chunk-chhd9p2w.js:14114-14130 placement
var UNVERSIONED_CONTRACT = "0.0.0";
//@ chunk-chhd9p2w.js:14130-14153 placement
class ServedCapabilityState {
  served = undefined;
}
//@ chunk-chhd9p2w.js:14153-14179 placement
var servedCapabilitySlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-chhd9p2w.js:14153", () => {
  servedCapabilitySlot = new SessionRootSlot(() => new ServedCapabilityState());
});
//@ chunk-chhd9p2w.js:14179-14215 placement
function setServedCapabilities(session, served) {
  servedCapabilitySlot.of(session).served = served;
}
//@ chunk-chhd9p2w.js:14215-14257 placement
function getServedCapabilities(session) {
  return servedCapabilitySlot.peek(session)?.served;
}
//@ chunk-chhd9p2w.js:14257-14296 placement
function clearServedCapabilities(rootSession) {
  servedCapabilitySlot.of(rootSession).served = undefined;
}
//@ chunk-chhd9p2w.js:14296-14311 placement
var HOST = "host";
//@ chunk-chhd9p2w.js:14311-14413 placement
function hasFeatureFlag(caps, feature, on) {
  let features = caps.features;
  return (
    features !== undefined && Object.hasOwn(features, feature) && Object.hasOwn(features[feature] ?? {}, on)
  );
}
//@ chunk-chhd9p2w.js:14413-14451 placement
var HOST_GRANT_SERVER_RE = /^host:([A-Za-z0-9_-]{1,64})$/;
//@ chunk-chhd9p2w.js:14451-14490 placement
function getLocalServerName(server) {
  return HOST_GRANT_SERVER_RE.exec(server)?.[1];
}
//@ chunk-chhd9p2w.js:14490-14556 placement
function describeServerKind(server) {
  return getLocalServerName(server) === undefined ? "connector" : "local server";
}
//@ chunk-chhd9p2w.js:14556-14665 placement
/**
 * CLAUDE_ARTIFACT_HOST_GRANT 环境变量的 schema：本机允许 artifact 调用的 MCP 服务器与工具。
 */
var CLAUDE_ARTIFACT_HOST_GRANT_ENV; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var hostGrantSchema;
deferInit("chunk-chhd9p2w.js:14556", () => {
  CLAUDE_ARTIFACT_HOST_GRANT_ENV = "CLAUDE_ARTIFACT_HOST_GRANT";
  hostGrantSchema = DoctorLazy(() =>
    objectSchema({
      v: literal(1),
      servers: array(
        objectSchema({
          server: stringSchema().regex(HOST_GRANT_SERVER_RE),
          tools: array(stringSchema()),
        }),
      ),
    }),
  );
});
//@ chunk-chhd9p2w.js:14665-14992 placement
/**
 * 读取 CLAUDE_ARTIFACT_HOST_GRANT（本机允许 artifact 调用的本地 MCP 服务器与工具），解析失败返回 unreadable。
 */
function readHostGrant(raw) {
  if (raw === undefined)
    return {
      kind: "absent",
    };
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    return {
      kind: "unreadable",
    };
  }
  let parsed = hostGrantSchema().safeParse(value);
  if (!parsed.success)
    return {
      kind: "unreadable",
    };
  let out = new Map();
  for (let server of parsed.data.servers) {
    let serverEntry = out.get(server.server) ?? new Set();
    for (let tool of server.tools) serverEntry.add(tool);
    out.set(server.server, serverEntry);
  }
  return {
    kind: "granted",
    tools: out,
  };
}
//@ chunk-chhd9p2w.js:14992-15067 placement
function serverNames(servers) {
  return servers.flatMap((server) => {
    let serverField = getServerField(server);
    return serverField === undefined ? [] : [serverField];
  });
}
//@ chunk-chhd9p2w.js:15067-15977 placement
/**
 * 按本机 host grant 过滤页面声明的本地 MCP 服务器，返回保留与丢弃的服务器。
 */
function applyHostGrant(caps, grant) {
  let mcp = caps.mcp;
  if (!isPlainObjectConnector(mcp) || !Array.isArray(mcp.servers))
    return {
      ok: true,
      caps,
      dropped: [],
      servers: [],
    };
  let servers = mcp.servers;
  if (grant.kind === "absent")
    return {
      ok: true,
      caps,
      dropped: [],
      servers: serverNames(servers),
    };
  let localServers = normalizeCaseForComparison_2(
    serverNames(servers).filter((server) => getLocalServerName(server) !== undefined),
  );
  if (localServers.length === 0)
    return {
      ok: true,
      caps,
      dropped: [],
      servers: serverNames(servers),
    };
  if (grant.kind === "unreadable")
    return {
      ok: false,
      refused: localServers,
    };
  let refused = [];
  let dropped = [];
  for (let server of servers) {
    let serverField = getServerField(server);
    if (serverField === undefined || getLocalServerName(serverField) === undefined) {
      dropped.push(server);
      continue;
    }
    let tools = grant.tools.get(serverField);
    if (tools === undefined || !isPlainObjectConnector(server)) {
      refused.push({
        server: serverField,
        tool: null,
      });
      continue;
    }
    let tools_2 = server.tools;
    if (!isStringArray(tools_2)) {
      refused.push({
        server: serverField,
        tool: null,
      });
      continue;
    }
    let filtered = tools_2.filter((tool) => tools.has(tool));
    for (let tool of tools_2)
      if (!tools.has(tool))
        refused.push({
          server: serverField,
          tool,
        });
    if (filtered.length > 0)
      dropped.push({
        ...server,
        tools: filtered,
      });
  }
  if (refused.length === 0)
    return {
      ok: true,
      caps,
      dropped: refused,
      servers: serverNames(servers),
    };
  if (dropped.length === 0) {
    let { mcp, ...rest } = caps;
    return {
      ok: true,
      caps: rest,
      dropped: refused,
      servers: [],
    };
  }
  return {
    ok: true,
    caps: {
      ...caps,
      mcp: {
        ...mcp,
        servers: dropped,
      },
    },
    dropped: refused,
    servers: serverNames(dropped),
  };
}
//@ chunk-chhd9p2w.js:15977-16041 placement
var CONTRACT_VERSION_REGEX = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,5})$/;
//@ chunk-chhd9p2w.js:16041-16215 placement
function isNewerContractVersion(version, version_2) {
  if (!CONTRACT_VERSION_REGEX.test(version) || !CONTRACT_VERSION_REGEX.test(version_2)) return false;
  let mapped = version.split(".").map(Number);
  let mapped_2 = version_2.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (mapped[i] !== mapped_2[i]) return mapped[i] > mapped_2[i];
  return false;
}
//@ chunk-chhd9p2w.js:16215-16246 placement
var CAPABILITY_NAME_REGEX = /^[a-z][a-z0-9]{0,23}$/;
//@ chunk-chhd9p2w.js:16246-16316 placement
function parseContractVersion(contract) {
  return typeof contract === "string" &&
    contract !== UNVERSIONED_CONTRACT &&
    CONTRACT_VERSION_REGEX.test(contract)
    ? contract
    : null;
}
//@ chunk-chhd9p2w.js:16316-16437 placement
function listUnknownCapabilities(caps, declared) {
  if (declared.version === UNVERSIONED_CONTRACT) return [];
  let known = new Set(declared.capabilities);
  return Object.keys(caps).filter((key) => !known.has(key));
}
//@ chunk-chhd9p2w.js:16437-16465 placement
var ARTIFACT_CAPABILITY_KEY = "artifact";
var SELF = "self";
//@ chunk-chhd9p2w.js:16465-16831 placement
function canonicalizeCapabilityValue(value) {
  let untrustedArray = readUntrustedArray(value);
  if (untrustedArray === UNREADABLE_ARRAY) return;
  if (untrustedArray !== undefined) {
    let mapped = untrustedArray.map((untrusted) => canonicalizeCapabilityValue(untrusted));
    return mapped.includes(undefined) ? undefined : `[${mapped.join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    let current = value;
    let mapped = Object.keys(current)
      .sort()
      .map((key) => {
        let value = canonicalizeCapabilityValue(current[key]);
        return value === undefined ? undefined : `${JSON.stringify(key)}:${value}`;
      });
    return mapped.includes(undefined) ? undefined : `{${mapped.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
//@ chunk-chhd9p2w.js:16831-16889 placement
function sameCapabilityValue(a, b) {
  let left = canonicalizeCapabilityValue(a);
  return left !== undefined && left === canonicalizeCapabilityValue(b);
}
//@ chunk-chhd9p2w.js:16889-17131 placement
function renameArtifactCapabilityToSelf(capabilities) {
  if (!Object.hasOwn(capabilities, ARTIFACT_CAPABILITY_KEY)) return capabilities;
  if (Object.hasOwn(capabilities, SELF)) {
    if (!sameCapabilityValue(capabilities[ARTIFACT_CAPABILITY_KEY], capabilities[SELF])) return capabilities;
    let out = {};
    for (let [key, value] of Object.entries(capabilities))
      if (key !== ARTIFACT_CAPABILITY_KEY) defineValue(out, key, value);
    return out;
  }
  let entry = {};
  for (let [key, value] of Object.entries(capabilities))
    defineValue(entry, key === ARTIFACT_CAPABILITY_KEY ? SELF : key, value);
  return entry;
}
//@ chunk-chhd9p2w.js:17131-17412 placement
/**
 * 规范化能力声明：把 SELF 键改写成 artifact 能力键（两者都在且不一致时原样返回）。
 */
function foldSelfCapability(capability) {
  if (capability === null || typeof capability !== "object" || Array.isArray(capability)) return capability;
  let rest = capability;
  if (!Object.hasOwn(rest, SELF)) return capability;
  if (
    Object.hasOwn(rest, ARTIFACT_CAPABILITY_KEY) &&
    !sameCapabilityValue(rest[ARTIFACT_CAPABILITY_KEY], rest[SELF])
  )
    return capability;
  let folded = {};
  for (let [key, value] of Object.entries(rest)) {
    if (key === SELF) {
      if (!Object.hasOwn(rest, ARTIFACT_CAPABILITY_KEY)) defineValue(folded, ARTIFACT_CAPABILITY_KEY, value);
      continue;
    }
    defineValue(folded, key, value);
  }
  return folded;
}
//@ chunk-chhd9p2w.js:17412-17959 placement
function reconcileSelfCapability(caps, next) {
  let hasArtifact = Object.hasOwn(caps, ARTIFACT_CAPABILITY_KEY);
  let hasSelf = Object.hasOwn(caps, SELF);
  if ((!hasArtifact && !hasSelf) || next.version === UNVERSIONED_CONTRACT)
    return {
      caps,
    };
  let known = new Set(next.capabilities);
  let hasKnown = known.has(ARTIFACT_CAPABILITY_KEY) ? ARTIFACT_CAPABILITY_KEY : known.has(SELF) ? SELF : null;
  if (hasKnown === null)
    return {
      caps,
    };
  if (hasArtifact && hasSelf) {
    if (!sameCapabilityValue(caps[ARTIFACT_CAPABILITY_KEY], caps[SELF]))
      return {
        errMsg:
          "capabilities declares both `artifact` and `self` \u2014 two " +
          "spellings of the same capability \u2014 with different configs. " +
          "Declare it once (canonically `artifact: {}`).",
      };
  }
  let out = {};
  for (let [key, value] of Object.entries(caps)) {
    if (key === ARTIFACT_CAPABILITY_KEY || key === SELF) {
      if (!Object.hasOwn(out, hasKnown)) defineValue(out, hasKnown, value);
      continue;
    }
    defineValue(out, key, value);
  }
  return {
    caps: out,
  };
}
//@ chunk-chhd9p2w.js:17959-18022 placement
function getDeclaredCapabilities(value) {
  return "capabilities" in value ? value.capabilities : undefined;
}
//@ chunk-chhd9p2w.js:18022-18097 placement
/**
 * artifact 能力声明的已知键（artifact/self/downloads/comments/room/db/assets/user 等）及其扩展集合 mcp/flags。
 */
var BASIC_CAPABILITY_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-chhd9p2w.js:18022", () => {
  BASIC_CAPABILITY_KEYS = new Set([
    ARTIFACT_CAPABILITY_KEY,
    SELF,
    "downloads",
    "comments",
    "room",
    "db",
    "assets",
    "user",
  ]);
});
//@ chunk-chhd9p2w.js:18097-18129 placement
/**
 * 导出函数 `isKnownCapabilityObject`：参数 e，返回 de(e, oe)。
 */
function isKnownCapabilityObject(value) {
  return onlyKeysIn(value, BASIC_CAPABILITY_KEYS);
}
//@ chunk-chhd9p2w.js:18129-18187 placement
var REMOTE_CAPABILITY_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-chhd9p2w.js:18129", () => {
  REMOTE_CAPABILITY_KEYS = new Set(["downloads", "room", "db", "assets", "user"]);
});
//@ chunk-chhd9p2w.js:18187-18466 placement
function isValidCapabilitiesObject(declaredCapabilities) {
  return (
    declaredCapabilities !== null &&
    isKnownCapabilityObject(declaredCapabilities) &&
    onlyKeysIn(declaredCapabilities, REMOTE_CAPABILITY_KEYS) &&
    Object.entries(declaredCapabilities).every(([key, value]) => {
      if (value === true) return true;
      if (!isPlainObjectConnector(value)) return false;
      switch (key) {
        case "db":
          return !("wake" in value) && isValidDbCapability(value);
        case "user":
          return (
            isValidUserCapability(value) && (getUserScopes(value) ?? []).every((scope) => scope === "profile")
          );
        default:
          return Object.keys(value).length === 0;
      }
    })
  );
}
//@ chunk-chhd9p2w.js:18466-18504 placement
var ALL_CAPABILITY_KEYS; // deferred: uses BASIC_CAPABILITY_KEYS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-chhd9p2w.js:18466", () => {
  ALL_CAPABILITY_KEYS = new Set([...BASIC_CAPABILITY_KEYS, "mcp", "flags"]);
});
//@ chunk-chhd9p2w.js:18504-18536 placement
/**
 * 导出函数 `isFullCapabilityObject`：参数 e，返回 de(e, xe)。
 */
function isFullCapabilityObject(value) {
  return onlyKeysIn(value, ALL_CAPABILITY_KEYS);
}
//@ chunk-chhd9p2w.js:18536-18583 placement
/**
 * 导出函数 `allKnownCapabilityKeys`：参数 e，返回 e.every((n) => xe.has(n))。
 */
function allKnownCapabilityKeys(keys) {
  return keys.every((key) => ALL_CAPABILITY_KEYS.has(key));
}
//@ chunk-chhd9p2w.js:18583-18659 placement
function onlyKeysIn(value, allowed) {
  return (
    value == null || (isPlainObjectCapability(value) && Object.keys(value).every((key) => allowed.has(key)))
  );
}
//@ chunk-chhd9p2w.js:18659-18699 placement
var regExp; // deferred: uses QUOTE_HOMOGLYPHS (../../tools/ArtifactTool/artifactUrls.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-chhd9p2w.js:18659", () => {
  regExp = new RegExp(`^${QUOTE_HOMOGLYPHS.source}$`, "u");
});
//@ chunk-chhd9p2w.js:18699-18814 placement
function isStrippablePunctuation(char) {
  return (
    MODEL_TEXT_PUNCT_CODE_POINT.test(char) &&
    !/^[\p{P}\p{M}]$/u.test(char) &&
    !regExp.test(char) &&
    !isJoinerOrEmojiSelector(char.codePointAt(0) ?? 0) &&
    !ESCAPE_CHAR_RE.test(char)
  );
}
//@ chunk-chhd9p2w.js:18814-19212 placement
function maskConfusableChars(text) {
  let sliced = Array.from(text).slice(0, MAX_NAME_LENGTH + 1);
  let length = sliced.length;
  let mapped = sliced.map(isStrippablePunctuation);
  let mapped_2 = sliced.map(
    (ch, index) => mapped[index] || /^\p{M}$/u.test(ch) || isJoinerOrEmojiSelector(ch.codePointAt(0) ?? 0),
  );
  let mapped_3 = sliced.map((ch, index) => !mapped[index] && /^[\p{L}\p{N}]$/u.test(ch));
  let insideBefore = Array(length).fill(false);
  let insideAfter = Array(length).fill(false);
  let seenWord = false;
  for (let j = 0; j < length; j++) {
    insideBefore[j] = seenWord;
    seenWord = mapped_3[j] || (mapped_2[j] && seenWord);
  }
  seenWord = false;
  for (let j = length - 1; j >= 0; j--) {
    insideAfter[j] = seenWord;
    seenWord = mapped_3[j] || (mapped_2[j] && seenWord);
  }
  let masked = new Set();
  for (let j = 0; j < length; j++) if (mapped[j] && insideBefore[j] && insideAfter[j]) masked.add(j);
  return masked;
}
//@ chunk-chhd9p2w.js:19212-19468 placement
function makeMaskPredicate(text) {
  let mask = maskConfusableChars(text);
  let edgeSpaceMasker = makeEdgeSpaceMasker(text);
  let prevKind = "none";
  let prevIndex = -1;
  return (char) => {
    prevIndex++;
    let cp = char.codePointAt(0) ?? 0;
    if (edgeSpaceMasker(char, prevIndex)) {
      prevKind = "none";
      return true;
    }
    if (mask.has(prevIndex)) {
      prevKind = "none";
      return true;
    }
    if (isJoinerOrEmojiSelector(cp)) {
      let rides = selectorOrJoinerRides(cp, prevKind);
      prevKind = rides.after;
      return !rides.rides;
    }
    if (ESCAPE_CHAR_RE.test(char)) {
      prevKind = "none";
      return true;
    }
    prevKind = rideStateAfter(char);
    return false;
  };
}
//@ chunk-chhd9p2w.js:19468-19640 placement
/**
 * 逐字符拼接文本，需要转义的字符替换为转义串，累计长度超过上限时截断并标记 cut。
 */
function truncateWithEscapes(text, isMasked, limit) {
  let out = [];
  let used = 0;
  for (let ch of text) {
    let piece = isMasked(ch) ? escapeChar(ch) : ch;
    let width = piece === ch ? 1 : piece.length;
    if (used + width > limit)
      return {
        text: out.join(""),
        cut: true,
      };
    out.push(piece);
    used += width;
  }
  return {
    text: out.join(""),
    cut: false,
  };
}
//@ chunk-chhd9p2w.js:19640-19819 placement
/**
 * 把能力/服务器名清洗成可安全展示的短文本：转义可疑字符、截断、去除标记同形字与 ;,(){}，空则为 "?"，截断时加省略号。
 */
function sanitizeCapabilityName(text) {
  let name = text;
  let seen = false;
  if (typeof text === "string")
    ({ text: name, cut: seen } = truncateWithEscapes(text, makeMaskPredicate(text), MAX_NAME_LENGTH));
  let out =
    sweepMarkerLookalikes(
      (
        sweepAskCopy(
          sanitizeDisplayText(name, {
            max: MAX_NAME_LENGTH,
          }),
        ) ?? "?"
      ).replace(/[;,(){}]/g, " "),
    ).trim() || "?";
  return seen ? `${out}\u2026` : out;
}
//@ chunk-chhd9p2w.js:19819-20819 placement
/**
 * 把能力声明（mcp 服务器/工具、db、user…）格式化成给用户/模型看的简短列表文本。
 */
function describeCapabilities(caps) {
  if (!caps) return "";
  let leadingKeys = [];
  let otherParts = [];
  let mcpPart;
  for (let [key, value] of Object.entries(caps)) {
    let mcpServers = key === "mcp" ? declaredServersOrUnreadable(value) : undefined;
    let isDynamic = key === "mcp" && isDynamicMcp(value);
    if (mcpServers === UNREADABLE_ARRAY) {
      mcpPart = isDynamic
        ? `${VIEWER_APPROVED_CONNECTOR_TEXT} + ${UNREADABLE_LIST_TEXT}`
        : UNREADABLE_LIST_TEXT;
      leadingKeys.unshift("mcp");
    } else if (mcpServers !== undefined && mcpServers.length > 0) {
      let joined = capListForDisplay(mcpServers, 8, (entry) => {
        let config = serverConfigOrUndefined(entry);
        let tools = config === null ? UNREADABLE_ARRAY : readUntrustedArray(config?.tools);
        let toolCount = declaredServerCount(tools) ?? 0;
        return `${sanitizeCapabilityName(config?.server)}[${tools === UNREADABLE_ARRAY ? "?" : toolCount} ${plural(toolCount, "tool")}]`;
      }).join(", ");
      mcpPart = isDynamic ? `${VIEWER_APPROVED_CONNECTOR_TEXT} + ${joined}` : joined;
      leadingKeys.unshift("mcp");
    } else if (isDynamic) {
      mcpPart = VIEWER_APPROVED_CONNECTOR_TEXT;
      leadingKeys.unshift("mcp");
    } else if (BASIC_CAPABILITY_KEYS.has(key)) {
      let config = serverConfigOrUndefined(value);
      let rules = config === null ? UNREADABLE_ARRAY : readUntrustedArray(config?.rules);
      let ruleCount = declaredServerCount(rules);
      otherParts.push(
        rules === undefined
          ? key
          : `${key}[${rules === UNREADABLE_ARRAY ? "?" : ruleCount} ${plural(ruleCount ?? 0, "rule")}]`,
      );
    } else leadingKeys.push(CAPABILITY_NAME_REGEX.test(key) ? key : INVALID_CAPABILITY_NAME);
  }
  let total = leadingKeys.length + otherParts.length;
  if (total === 0) return "";
  let parts = [...leadingKeys, ...otherParts.slice(0, Math.max(0, 8 - leadingKeys.length))];
  let totalPrefix = total > 8 ? `[${total} total]; ` : "";
  let text = totalPrefix + parts.join("; ");
  if (mcpPart !== undefined) {
    let joined = parts.slice(1).join("; ");
    let separator = joined === "" ? "" : "; ";
    let max = Math.max(16, 400 - Array.from(totalPrefix + joined + separator).length - 6);
    let list = Array.from(mcpPart);
    let trimmed = list.length > max ? list.slice(0, max).join("") + "\u2026" : mcpPart;
    text = `${totalPrefix}mcp: ${trimmed}${separator}${joined}`;
  }
  let list = Array.from(text);
  return ` (${list.length > 400 ? list.slice(0, 400).join("") + "\u2026" : list.join("")})`;
}
//@ chunk-chhd9p2w.js:20819-21112 placement
function describeCapabilityWidening(capabilities, declaredCapabilities) {
  let folded = foldSelfConfig(capabilities ?? {});
  let filtered = Object.keys(foldSelfConfig(declaredCapabilities ?? {})).filter(
    (key) => !Object.hasOwn(folded, key),
  );
  let rank = (key) => (key === "mcp" ? 0 : BASIC_CAPABILITY_KEYS.has(key) ? 2 : 1);
  let mapped = filtered
    .sort((a, b) => rank(a) - rank(b))
    .map((name) => (CAPABILITY_NAME_REGEX.test(name) ? name : INVALID_CAPABILITY_NAME));
  if (!filtered.includes("mcp")) {
    if (isDynamicMcp(declaredCapabilities?.mcp) && !isDynamicMcp(capabilities?.mcp))
      mapped.unshift(MCP_APPROVED_CONNECTOR_LABEL);
    else if (widensMcpAccess(capabilities?.mcp, declaredCapabilities?.mcp))
      mapped.unshift(MCP_ANY_CONNECTOR_LABEL);
  }
  return mapped;
}
//@ chunk-chhd9p2w.js:21112-21644 placement
/**
 * 页面连接器声明的文案：动态 mcp 说明、无效名与“查看者逐个批准”的提示。
 */
var INVALID_CAPABILITY_NAME = "invalid-name";
var MCP_ANY_CONNECTOR_LABEL = "mcp (more servers or tools)";
var VIEWER_APPROVED_CONNECTOR_TEXT = "any connector the viewer approves";
var MCP_APPROVED_CONNECTOR_LABEL = `mcp (${VIEWER_APPROVED_CONNECTOR_TEXT})`;
var DYNAMIC_CONNECTOR_NOTICE =
  "This page's connector declaration is dynamic: beyond any servers it lists, the page can ask each viewer for any connector by name at call time, and the viewer approves each at first use. Connectors and tools the page calls without listing them were not checked against this session. Tell the user which connectors and tools the page calls, and that those integrations are unverified unless one real call was made.";
//@ chunk-chhd9p2w.js:21644-21686 placement
function isDynamicMcp(mcp) {
  return serverConfigOrUndefined(mcp)?.dynamic === true;
}
//@ chunk-chhd9p2w.js:21686-22034 placement
function widensMcpAccess(previous, next) {
  if (next === undefined) return false;
  let nextServers = declaredServers(next);
  if (nextServers === undefined) return true;
  let previousTools = new Map();
  for (let entry of declaredServers(previous) ?? []) {
    let config = serverConfigOrUndefined(entry);
    let server = config?.server;
    if (typeof server === "string")
      previousTools.set(server, new Set(readUntrustedArrayOrUndefined(config?.tools) ?? []));
  }
  return nextServers.some((entry) => {
    let config = serverConfigOrUndefined(entry);
    let server = config?.server;
    let previousSet = typeof server === "string" ? previousTools.get(server) : undefined;
    let untrustedArrayOrUndefined = readUntrustedArrayOrUndefined(config?.tools);
    return (
      previousSet === undefined ||
      untrustedArrayOrUndefined === undefined ||
      untrustedArrayOrUndefined.some((tool) => !previousSet.has(tool))
    );
  });
}
//@ chunk-chhd9p2w.js:22034-22111 placement
function declaredServersOrUnreadable(value) {
  let config = serverConfigOrUndefined(value);
  return config === null
    ? UNREADABLE_ARRAY
    : config === undefined
      ? undefined
      : readUntrustedArray(config.servers);
}
//@ chunk-chhd9p2w.js:22111-22161 placement
function declaredServers(value) {
  let config = declaredServersOrUnreadable(value);
  return config === UNREADABLE_ARRAY ? undefined : config;
}
//@ chunk-chhd9p2w.js:22161-22218 placement
function declaredServerCount(value) {
  return value === undefined || value === UNREADABLE_ARRAY ? undefined : value.length;
}
//@ chunk-chhd9p2w.js:22218-22321 placement
function capListForDisplay(list, limit, render) {
  if (list.length <= limit) return list.map(render);
  return [`[${list.length} total]`, ...list.slice(0, limit).map(render)];
}
//@ chunk-chhd9p2w.js:22321-22433 placement
function hasDeclaredServers(value) {
  return (
    value != null &&
    typeof value === "object" &&
    "servers" in value &&
    Array.isArray(value.servers) &&
    value.servers.length > 0
  );
}
//@ chunk-chhd9p2w.js:22433-22647 placement
function sanitizeDisplayText(text, options) {
  if (typeof text !== "string") return "?";
  let max = options?.max ?? 64;
  let replaced = Array.from(text.slice(0, 2 * max), (char) =>
    isDecisionSurfaceControl(char.codePointAt(0) ?? 0) ? " " : char,
  )
    .slice(0, max)
    .join("")
    .replace(INVISIBLE_BLANKS, " ")
    .replace(/\s+/g, " ");
  return replaced.trim() === "" ? "?" : replaced;
}
//@ chunk-chhd9p2w.js:22647-22740 placement
function sanitizeDisplayTextOrUndefined(value, max) {
  let trimmed = sanitizeDisplayText(value, {
    max,
  })
    .replace(INVISIBLE_BLANKS, " ")
    .trim();
  return trimmed !== "" && trimmed !== "?" ? trimmed : undefined;
}
export {
  parseContractVersion,
  mergeCapabilities,
  sanitizeDisplayText,
  allKnownCapabilityKeys,
  readHostGrant,
  describeCapabilities,
  capListForDisplay,
  DB_RULE_PATH_REGEX,
  DB_RULE_SCOPES,
  getDeclaredCapabilities,
  isValidCapabilitiesObject,
  isFullCapabilityObject,
  isKnownCapabilityObject,
  isNonEmptyObject,
  describeCapabilityWidening,
  CONTRACT_VERSION_REGEX,
  getServedCapabilities,
  setServedCapabilities,
  findUnservedMcpServers,
  CAPABILITY_NAME_REGEX,
  getLocalServerName,
  listUnknownCapabilities,
  isNewerContractVersion,
  reconcileSelfCapability,
  renameArtifactCapabilityToSelf,
  sanitizeDisplayTextOrUndefined,
  normalizeMcpCapability,
  hasFeatureFlag,
  HOST,
  describeServerKind,
  findUndeclaredMcpToolCalls,
  findMentionedTools,
  listLocalServerDeclarations,
  applyHostGrant,
  CLAUDE_ARTIFACT_HOST_GRANT_ENV,
  isDynamicMcp,
  UNVERSIONED_CONTRACT,
  SELF,
  ARTIFACT_CAPABILITY_KEY,
  isValidDbRules,
  getUserScopes,
  isValidScopeList,
  isValidDbCapability,
  isValidUserCapability,
  clearServedCapabilities,
  truncateWithEscapes,
  arrayField,
  VIEWER_APPROVED_CONNECTOR_TEXT,
};
