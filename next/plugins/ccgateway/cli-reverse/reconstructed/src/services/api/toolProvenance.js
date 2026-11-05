/**
 * services/api/toolProvenance.ts
 *
 * 工具与工具结果的 ownership_metadata 归属信息：按 server 类型推导来源、是否可带 server_url，并决定 api_tool_provenance beta（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (31)
 * attribution: placement 31
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import { isChildSession, isClaudecodeSession } from "../../utils/sessionShape.js";
import { getCliOwnedState } from "../mcp/cliOwnedClients.js";
import {
  MCP_URL_PATTERN,
  MAX_MCP_URL_LENGTH,
  CONFIGURED_PROVENANCE,
  UNKNOWN_PROVENANCE,
  isSameOriginAsCcr,
  isCcrMcpPath,
  EXPECTED_CCR_MCP_PATHS,
  SESSION_SCOPED_SERVERS,
  ccrSessionIdFromMcpUrl,
  sessionScopedServerIds_2,
  ORG_CONNECTOR,
} from "../mcp/ccrMcpUrls.js";
import { getLoggingSafeMcpBaseUrl } from "../mcp/utils.js";
import {
  isCcsTenant,
  isToolProvenanceServerUrlRefused,
  markToolProvenanceServerUrlRefused,
} from "../../bootstrap/state.js";
import {
  isFirstPartyUploadScope,
  claudeAiConnectorCapabilityMap,
  connectorDisplayName,
  headerValues,
  X_MCP_SERVER_ORIGIN,
} from "../mcp/fileReference/fileReferencePolicy.js";
import { REMOTE_DEVICES, mcpServerIdHeader } from "../mcp/firstPartyServerIds.js";
import { toScopedConfig } from "../../cli/print.js";
import { hasUniqueQueryParams, isFirstPartyApiHost } from "../analytics/metadata.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { isLoopbackHost } from "../../utils/localhost.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { getMcpServerRulePrefixes } from "../mcp/serverIdentity.js";
import { getMcpPrefix as getMcpPrefix_4 } from "../mcp/mcpStringUtils.js";
import {
  BETA_CCR_TOOL_PROVENANCE,
  toolProvenancePermitted,
  toolProvenanceCoversConfiguredServers,
  BETA_TOOL_PROVENANCE_SERVER_URL_LATCH,
} from "../../utils/betas.js";
import {
  isBetaRejected as isBetaRejected_2,
  isBetaSent,
  markBetaSent,
  markBetaRejected,
} from "../../bootstrap/stateSlices.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import {
  toolAdditionName,
  toolAdditionOwnership,
  withToolOwnership,
  HTTPS_ADDRESS_NOT_RECORDED_INVALID,
  redactServerUrl,
} from "./toolDefinitionShape.js";
import { countWhere } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-5xgkngpb.js:2578225-2578444 placement
/**
 * 云会话启动时把 MCP server 的 url 记进 ccrLaunchMcpUrls，供之后判断来源。
 */
function recordLaunchMcpUrl(name, config) {
  if (
    env.CLAUDE_CODE_REMOTE === true &&
    (!env.CLAUDE_CODE_ENVIRONMENT_KIND || env.CLAUDE_CODE_ENVIRONMENT_KIND === "anthropic_cloud") &&
    !isChildSession() &&
    !isClaudecodeSession() &&
    "url" in config &&
    typeof config.url === "string"
  )
    getCliOwnedState().ccrLaunchMcpUrls.set(name, config.url);
}
//@ chunk-5xgkngpb.js:2578444-2578642 placement
function getReportableMcpUrl(url) {
  let hostname = MCP_URL_PATTERN.exec(url)?.[1];
  if (!hostname?.startsWith("[") && !/\.[^.]/.test(hostname ?? "")) return;
  let loggingSafeMcpBaseUrl = getLoggingSafeMcpBaseUrl({
    type: "http",
    url,
  });
  return loggingSafeMcpBaseUrl?.startsWith("https://") &&
    loggingSafeMcpBaseUrl.length <= MAX_MCP_URL_LENGTH &&
    !loggingSafeMcpBaseUrl.includes("@")
    ? loggingSafeMcpBaseUrl
    : undefined;
}
//@ chunk-5xgkngpb.js:2578642-2578673 placement
var URL_REDACTED_INVALID = "url-redacted.invalid";
//@ chunk-5xgkngpb.js:2578673-2578989 placement
/**
 * 把连接器 MCP server 规整成 {serverProvenance, serverUrl}：只有 https、非重定向主机、无凭据且长度合规才带 url。
 */
function connectorProvenance(url) {
  let reportableUrl = url === undefined ? undefined : getReportableMcpUrl(url);
  if (reportableUrl === undefined)
    return {
      serverProvenance: "connector",
      serverUrl: undefined,
    };
  let { hostname, pathname } = new URL(reportableUrl);
  let replaced = hostname.replace(/\.+$/, "");
  return {
    serverProvenance: "connector",
    serverUrl:
      replaced === URL_REDACTED_INVALID ||
      replaced.endsWith(".localhost") ||
      pathname.split("/").some((segment) => segment.startsWith("redacted-"))
        ? undefined
        : reportableUrl,
  };
}
//@ chunk-5xgkngpb.js:2578989-2579042 placement
function relayedConfiguredProvenance(config) {
  return config.relayed === true ? connectorProvenance(undefined) : CONFIGURED_PROVENANCE;
}
//@ chunk-5xgkngpb.js:2579042-2580599 placement
/**
 * 按 MCP server 配置类型（claudeai-proxy/sdk/http/sse/ws）推导来源与可上报的 url，是 server_url 归属信息的主入口。
 */
function serverProvenanceOf(server) {
  try {
    let { config } = server;
    switch (config.type) {
      case "claudeai-proxy":
        return connectorProvenance(
          config.scope === "claudeai" && config.urlReportable === true ? config.url : undefined,
        );
      case "sdk": {
        if (isCcsTenant() && !isFirstPartyUploadScope(config)) return relayedConfiguredProvenance(config);
        let storedServer = claudeAiConnectorCapabilityMap(server);
        if (typeof storedServer?.serverId !== "string") return UNKNOWN_PROVENANCE;
        return connectorProvenance(
          storedServer.serverId === connectorDisplayName(server) && typeof storedServer.serverUrl === "string"
            ? storedServer.serverUrl
            : undefined,
        );
      }
      case "http":
      case "sse":
      case "ws": {
        if (server.name === REMOTE_DEVICES && config.scope === "dynamic")
          return connectorProvenance(undefined);
        if (isSameOriginAsCcr(config.url)) {
          if (!toScopedConfig(config)) return connectorProvenance(undefined);
          if (isCcrMcpPath(config.url)) return UNKNOWN_PROVENANCE;
          if (!hasUniqueQueryParams(config.url, ["mcp_url", "mcp_server_url", "toolbox_mcp_server_id"]))
            return connectorProvenance(undefined);
          let { hostname, pathname, search, searchParams } = new URL(config.url);
          if (
            pathname === EXPECTED_CCR_MCP_PATHS.get(server.name) &&
            search === "" &&
            isFirstPartyApiHost(hostname)
          )
            return connectorProvenance(config.url);
          let mcpUrlParam = searchParams.get("mcp_url") || searchParams.get("mcp_server_url") || undefined;
          let originHeaders = headerValues(
            "headers" in config ? config.headers : undefined,
            X_MCP_SERVER_ORIGIN,
          );
          if (originHeaders.length === 1 && originHeaders[0] !== "") return connectorProvenance(mcpUrlParam);
          let scopedServer = SESSION_SCOPED_SERVERS.get(server.name);
          let sessionIdParts = ccrSessionIdFromMcpUrl(config.url);
          let upstreamUrl = getReportableMcpUrl(sessionIdParts?.upstreamUrl ?? "");
          if (
            scopedServer === undefined ||
            sessionIdParts === null ||
            upstreamUrl === undefined ||
            sessionIdParts.toolboxMcpServerId !== scopedServer.id ||
            mcpServerIdHeader(config) !== scopedServer.id ||
            !startupCcrEnv.ownCcrSessionIds.some(
              (ownCcrSessionId) =>
                sessionIdBody(ownCcrSessionId) === sessionIdBody(sessionIdParts.sessionSegment),
            ) ||
            !sessionScopedServerIds_2(sessionIdBody(sessionIdParts.sessionSegment), server.name).includes(
              sessionIdParts.mcpServerId,
            )
          )
            return connectorProvenance(undefined);
          let { hostname: hostname_2 } = new URL(upstreamUrl);
          return connectorProvenance(
            (
              scopedServer.at.startsWith("/")
                ? isFirstPartyApiHost(hostname_2) && upstreamUrl === `https://${hostname_2}${scopedServer.at}`
                : upstreamUrl === scopedServer.at
            )
              ? upstreamUrl
              : undefined,
          );
        }
        let hostname = URL.canParse(config.url) ? new URL(config.url).hostname.replace(/\.$/, "") : "";
        if (isLoopbackHost(hostname)) return UNKNOWN_PROVENANCE;
        if (server.name.startsWith(ORG_CONNECTOR) && toScopedConfig(config))
          return connectorProvenance(
            getCliOwnedState().ccrLaunchMcpUrls.get(server.name) === config.url ? config.url : undefined,
          );
        return CONFIGURED_PROVENANCE;
      }
      default:
        return UNKNOWN_PROVENANCE;
    }
  } catch (error) {
    logError(toError(error));
    let { type: configType } = server.config;
    return configType === undefined ||
      configType === "stdio" ||
      configType === "sse-ide" ||
      configType === "ws-ide"
      ? UNKNOWN_PROVENANCE
      : connectorProvenance(undefined);
  }
}
//@ chunk-5xgkngpb.js:2580599-2580770 placement
function isUnverifiedMcpAnnotation(annotation) {
  return (
    typeof annotation === "object" &&
    annotation !== null &&
    "verified" in annotation &&
    annotation.verified === false &&
    "owner" in annotation &&
    annotation.owner === "mcp" &&
    (!("server_url" in annotation) || typeof annotation.server_url === "string")
  );
}
//@ chunk-5xgkngpb.js:2580770-2580965 placement
function toUnverifiedMcpAnnotation(provenance, coverage) {
  if (
    provenance.serverProvenance === undefined ||
    (provenance.serverProvenance === "configured" && !coverage.configuredServers)
  )
    return;
  return {
    verified: false,
    owner: "mcp",
    ...(provenance.serverUrl !== undefined && {
      server_url: provenance.serverUrl,
    }),
  };
}
//@ chunk-5xgkngpb.js:2580965-2581099 placement
function annotationForServer(server, coverage) {
  let mcpInfo = server.mcpInfo;
  return mcpInfo === undefined || isCliOwnedOrAuthStub(server)
    ? undefined
    : toUnverifiedMcpAnnotation(
        {
          serverProvenance: mcpInfo.serverProvenance,
          serverUrl: mcpInfo.serverUrl,
        },
        coverage,
      );
}
//@ chunk-5xgkngpb.js:2581099-2581335 placement
function makeServerAnnotationResolver(servers, allServers, coverage) {
  if (coverage === undefined)
    return () => {
      return;
    };
  let serversByName = new Map(servers.map((server) => [server.name, server]));
  let cache = new Map();
  return (mcpServerName_2) => {
    if (!cache.has(mcpServerName_2)) {
      let server = serversByName.get(mcpServerName_2);
      cache.set(
        mcpServerName_2,
        server !== undefined && isCliOwnedOrAuthStub(server)
          ? undefined
          : !getMcpPrefix(mcpServerName_2)
            ? UNVERIFIED_MCP_ANNOTATION
            : server !== undefined
              ? annotationForServer(server, coverage)
              : annotationForMcpTool(mcpServerName_2, allServers, coverage),
      );
    }
    return cache.get(mcpServerName_2);
  };
}
//@ chunk-5xgkngpb.js:2581335-2581368 placement
var UNVERIFIED_MCP_ANNOTATION = {
  verified: false,
  owner: "mcp",
};
//@ chunk-5xgkngpb.js:2581368-2581444 placement
function isCliOwnedOrAuthStub(server) {
  return server.mcpInfo?.cliOwned === true || server.mcpInfo?.isAuthStub === true;
}
//@ chunk-5xgkngpb.js:2581444-2581547 placement (2.1.88 match: getMcpPrefix, 1)
function getMcpPrefix(serverName) {
  try {
    return (
      !serverName.startsWith("mcp__") ||
      getMcpServerRulePrefixes({
        name: serverName,
      }).length === 1
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-5xgkngpb.js:2581547-2581932 placement
/**
 * 工具名反推归属：按 mcp__ 前缀找匹配的 server 并合并其来源信息，不一致就统一给 {verified:false, owner:'mcp'}。
 */
function annotationForMcpTool(toolName, servers, coverage) {
  try {
    if (!toolName.startsWith("mcp__"))
      return env.CLAUDE_AGENT_SDK_MCP_NO_PREFIX && servers.some((server) => server.config.type === "sdk")
        ? UNVERIFIED_MCP_ANNOTATION
        : undefined;
    let mapped = servers
      .filter((server) => toolName.startsWith(getMcpPrefix_4(server.name)))
      .map((server) =>
        server.config.type === "sdk" && server.capabilities === undefined
          ? UNVERIFIED_MCP_ANNOTATION
          : toUnverifiedMcpAnnotation(serverProvenanceOf(server), coverage),
      );
    let [first] = mapped;
    return mapped.length > 0 &&
      mapped.every(
        (annotation) =>
          (annotation === undefined) === (first === undefined) &&
          annotation?.server_url === first?.server_url,
      )
      ? first
      : UNVERIFIED_MCP_ANNOTATION;
  } catch (error) {
    logError(toError(error));
    return UNVERIFIED_MCP_ANNOTATION;
  }
}
//@ chunk-5xgkngpb.js:2581932-2582217 placement
function withProvenanceBeta(conversation, betaList) {
  try {
    let included = betaList.includes(BETA_CCR_TOOL_PROVENANCE);
    if (included && !isBetaRejected_2(conversation, BETA_CCR_TOOL_PROVENANCE)) {
      if (!isBetaSent(conversation, BETA_CCR_TOOL_PROVENANCE)) logFeatureOk("api_tool_provenance");
      markBetaSent(conversation, BETA_CCR_TOOL_PROVENANCE);
    } else if (!isBetaSent(conversation, BETA_CCR_TOOL_PROVENANCE))
      markBetaRejected(conversation, BETA_CCR_TOOL_PROVENANCE);
    if (isBetaSent(conversation, BETA_CCR_TOOL_PROVENANCE) && toolProvenancePermitted())
      return {
        betas: included ? betaList : [...betaList, BETA_CCR_TOOL_PROVENANCE],
        coverage: {
          configuredServers: toolProvenanceCoversConfiguredServers(),
        },
      };
  } catch (error) {
    logError(toError(error));
  }
  return {
    betas: betaList.filter((beta) => beta !== BETA_CCR_TOOL_PROVENANCE),
    coverage: undefined,
  };
}
//@ chunk-5xgkngpb.js:2582217-2582282 placement
function withServerUrlHeader(conversation, header) {
  return {
    header,
    serverUrls:
      !isBetaRejected_2(conversation, BETA_TOOL_PROVENANCE_SERVER_URL_LATCH) &&
      !isToolProvenanceServerUrlRefused(),
  };
}
//@ chunk-5xgkngpb.js:2582282-2582321 placement
function withProperty(object, key, value) {
  return {
    ...object,
    [key]: value,
  };
}
//@ chunk-5xgkngpb.js:2582321-2582376 placement (2.1.88 match: getMcpPrefix, 1)
function getMcpPrefix_2(serverName) {
  return serverName.startsWith("mcp__") ? UNVERIFIED_MCP_ANNOTATION : undefined;
}
//@ chunk-5xgkngpb.js:2582376-2582432 placement
function tryOrUndefined(fn) {
  try {
    return fn();
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:2582432-2582514 placement
function stripOwnershipMetadata(withoutOwnershipMetadata) {
  return tryOrUndefined(() =>
    jsonParse(
      jsonStringify(withoutOwnershipMetadata, (key, value) =>
        key === "ownership_metadata" ? undefined : value,
      ),
    ),
  );
}
//@ chunk-5xgkngpb.js:2582514-2582623 placement
function applyServerUrlOption(annotation, options) {
  if (!options.header || annotation === undefined) return;
  if (options.serverUrls) return annotation;
  let { server_url: serverUrl, ...rest } = annotation;
  return rest;
}
//@ chunk-5xgkngpb.js:2582623-2582753 placement
function isSameAnnotation(existing, next) {
  return next === undefined
    ? existing === undefined
    : isUnverifiedMcpAnnotation(existing) &&
        existing.server_url === next.server_url &&
        Object.keys(existing).length === Object.keys(next).length;
}
//@ chunk-5xgkngpb.js:2582753-2583067 placement
/**
 * 给工具定义逐个补 ownership_metadata，并按 serverUrls 开关决定是否带 server_url。
 */
function annotateTools(tools, options, resolveToolAnnotation) {
  let changed = false;
  let mapped = tools.map((tool) => {
    let ownershipMetadata = "ownership_metadata" in tool ? tool.ownership_metadata : undefined;
    let nextAnnotation =
      "name" in tool && "input_schema" in tool
        ? applyServerUrlOption(resolveToolAnnotation(tool.name), options)
        : undefined;
    if (isSameAnnotation(ownershipMetadata, nextAnnotation)) return tool;
    changed = true;
    let { ownership_metadata: ownershipMetadata_2, ...rest } = {
      ownership_metadata: undefined,
      ...tool,
    };
    return nextAnnotation === undefined ? rest : withProperty(rest, "ownership_metadata", nextAnnotation);
  });
  return changed ? mapped : tools;
}
//@ chunk-5xgkngpb.js:2583067-2583200 placement
function annotateToolsWithFallback(tools, options, resolveToolAnnotation) {
  try {
    return annotateTools(tools, options, resolveToolAnnotation);
  } catch (error) {
    logError(toError(error));
    return (
      tryOrUndefined(() => annotateTools(tools, options, getMcpPrefix_2)) ??
      tryOrUndefined(() =>
        annotateTools(tools, options, () => {
          return;
        }),
      ) ??
      stripOwnershipMetadata(tools) ??
      []
    );
  }
}
//@ chunk-5xgkngpb.js:2583200-2583274 placement
function stripToolAnnotations(tools) {
  return annotateToolsWithFallback(
    [...tools],
    {
      header: false,
      serverUrls: false,
    },
    () => {
      return;
    },
  );
}
//@ chunk-5xgkngpb.js:2583274-2583546 placement
function annotateMessageContents(messages, options, resolveToolAnnotation) {
  let changed = false;
  let mapped = messages.map((message) => {
    let { content } = message;
    if (typeof content === "string") return message;
    let mapped = content.map((block) => {
      let toolName = toolAdditionName(block);
      let nextAnnotation =
        toolName === undefined ? undefined : applyServerUrlOption(resolveToolAnnotation(toolName), options);
      return isSameAnnotation(toolAdditionOwnership(block), nextAnnotation)
        ? block
        : withToolOwnership(block, nextAnnotation);
    });
    if (mapped.every((nextBlock, index) => nextBlock === content[index])) return message;
    changed = true;
    return withProperty(message, "content", mapped);
  });
  return changed ? mapped : messages;
}
//@ chunk-5xgkngpb.js:2583546-2583679 placement
function annotateMessageContentsWithFallback(messages, options, resolveToolAnnotation) {
  try {
    return annotateMessageContents(messages, options, resolveToolAnnotation);
  } catch (error) {
    logError(toError(error));
    return (
      tryOrUndefined(() => annotateMessageContents(messages, options, getMcpPrefix_2)) ??
      tryOrUndefined(() =>
        annotateMessageContents(messages, options, () => {
          return;
        }),
      ) ??
      stripOwnershipMetadata(messages) ??
      []
    );
  }
}
//@ chunk-5xgkngpb.js:2583679-2583729 placement
function isUrlWithheldAnnotation(annotation) {
  return (
    isUnverifiedMcpAnnotation(annotation) && annotation.server_url === HTTPS_ADDRESS_NOT_RECORDED_INVALID
  );
}
//@ chunk-5xgkngpb.js:2583729-2584024 placement
function countWithheldUrls(snapshottedParams) {
  try {
    let mapped = snapshottedParams.messages.map(({ content }) =>
      typeof content === "string"
        ? 0
        : countWhere(content, (block) => isUrlWithheldAnnotation(toolAdditionOwnership(block))),
    );
    return {
      cuts:
        countWhere(
          snapshottedParams.tools ?? [],
          (tool) => "ownership_metadata" in tool && isUrlWithheldAnnotation(tool.ownership_metadata),
        ) + mapped.reduce((acc, perMessageWithheldCount) => acc + perMessageWithheldCount, 0),
      messages: mapped.flatMap((count, index) => (count > 0 ? [index] : [])),
    };
  } catch (error) {
    logError(toError(error));
    return {
      cuts: 0,
      messages: [],
    };
  }
}
//@ chunk-5xgkngpb.js:2584024-2584413 placement
/**
 * 给消息里的工具结果块补同一套 ownership_metadata，字符串 content 原样保留。
 */
function stripUrlsFromAnnotations(request) {
  try {
    let mapped = request.tools?.map((tool) => {
      let ownershipMetadata = "ownership_metadata" in tool ? tool.ownership_metadata : undefined;
      let nextMetadata = redactServerUrl(ownershipMetadata);
      return nextMetadata === ownershipMetadata
        ? tool
        : withProperty(tool, "ownership_metadata", nextMetadata);
    });
    let messages = request.messages.map((message) => {
      let { content } = message;
      if (typeof content === "string") return message;
      let mapped = content.map((block) =>
        withToolOwnership(block, redactServerUrl(toolAdditionOwnership(block))),
      );
      return mapped.every((nextBlock, index) => nextBlock === content[index])
        ? message
        : withProperty(message, "content", mapped);
    });
    return {
      ...request,
      ...(mapped && {
        tools: mapped,
      }),
      messages,
    };
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:2584413-2584669 placement
function handleServerUrlRefused(conversation, hasTools, hasMessages) {
  try {
    if (!hasTools || !hasMessages) return false;
    markBetaRejected(conversation, BETA_TOOL_PROVENANCE_SERVER_URL_LATCH);
    markToolProvenanceServerUrlRefused();
    logFeatureSad("api_tool_provenance", "server_url_refused");
    logForDebugging(
      "[tool-provenance] the API refused a server_url; marking tools without addresses and retrying",
      {
        level: "warn",
      },
    );
    return true;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
export {
  withProvenanceBeta,
  makeServerAnnotationResolver,
  stripToolAnnotations,
  annotateToolsWithFallback,
  withServerUrlHeader,
  stripUrlsFromAnnotations,
  countWithheldUrls,
  annotateMessageContentsWithFallback,
  handleServerUrlRefused,
  serverProvenanceOf,
  recordLaunchMcpUrl,
};
