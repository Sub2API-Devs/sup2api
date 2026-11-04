/**
 * cli/headlessCloud/consent.ts
 *
 * 2.1.316 新增：无头云会话的同意对话（本机 MCP 供云会话使用、无人值守服务）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (9)
 * attribution: placement 9
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../handlers/util.js";
import {
  objectSchema,
  literal,
  stringSchema,
  booleanSchema,
  array,
  _enum,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  shortLabel,
  isCleanText,
  disambiguateLabels,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { isPluginServerConfig } from "../../services/mcp/types.js";
import { getMcpPrefix } from "../../services/mcp/mcpStringUtils.js";
import { uniq } from "../../utils/collections.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";
import {
  UNATTENDED_SERVING_CONSENT_TERMS,
  UNATTENDED_SERVING_CONSENT_VERSION,
} from "../../services/remoteTools/unattendedConsentStore.js";
import { logEvent } from "../../services/analytics/index.js";
import { shortHash } from "../../utils/shortHash.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { stripDeclineMessage } from "../../services/requestUserDialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fe6rs39h.js:41526-42021 placement
/**
 * 设备 MCP 同意的上限常量：最多 64 台服务器、名字 128 字符、机器名 256 字符，以及 device_mcp_consent 对话框 spec。
 */
var DEVICE_MCP_CONSENT_LIMITS; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_DEVICE_MCP_CONSENT_SERVERS;
var MAX_DEVICE_MCP_NAME_CHARS;
var MAX_MACHINE_NAME_CHARS_2;
var deviceMcpConsentSpec;
deferInit("chunk-fe6rs39h.js:41526", () => {
  DEVICE_MCP_CONSENT_LIMITS = 20;
  MAX_DEVICE_MCP_CONSENT_SERVERS = 64;
  MAX_DEVICE_MCP_NAME_CHARS = 128;
  MAX_MACHINE_NAME_CHARS_2 = 256;
  deviceMcpConsentSpec = withHideWhile({
    kind: "device_mcp_consent",
    payload: DoctorLazy(() =>
      objectSchema({
        v: literal(1),
        machine_name: stringSchema().min(1).max(MAX_MACHINE_NAME_CHARS_2),
        reconsent: booleanSchema(),
        changed_servers: array(stringSchema().min(1).max(MAX_DEVICE_MCP_NAME_CHARS)).optional(),
        servers: array(
          objectSchema({
            name: stringSchema().min(1).max(MAX_DEVICE_MCP_NAME_CHARS),
            scope: _enum(["user", "local", "plugin"]),
            transport: _enum(["stdio", "http", "sse", "ws"]),
            tool_count: numberSchema().int().nonnegative(),
            tool_names: array(stringSchema().min(1).max(MAX_DEVICE_MCP_NAME_CHARS)).max(
              DEVICE_MCP_CONSENT_LIMITS,
            ),
            tool_names_truncated: booleanSchema(),
          }),
        )
          .min(1)
          .max(MAX_DEVICE_MCP_CONSENT_SERVERS),
      }),
    ),
    result: DoctorLazy(() => _enum(["allow", "deny", "not_now"])),
    default: "not_now",
    hideWhile: [],
  });
});
//@ chunk-fe6rs39h.js:42021-42633 placement
/**
 * 构造本机 MCP 服务器供云会话使用的同意请求载荷：列出（或重新同意时只列变化的）服务器名、范围、传输与工具摘要；数量超限、名称不干净或重名时返回 null。
 */
function buildMcpServeConsentPayload({ machineName, offered, snapshot, withheld, diffNamesCap }) {
  let servers =
    withheld === undefined ? offered : offered.filter(([offered]) => Object.hasOwn(withheld, offered));
  if (servers.length === 0 || servers.length > MAX_DEVICE_MCP_CONSENT_SERVERS) return null;
  let flattened = servers.flatMap(([entry, serverConfig]) => {
    let scope = mcpScopeLabel(serverConfig);
    let transportLabel = getTransportLabel(serverConfig);
    return scope === undefined || transportLabel === undefined
      ? []
      : [
          {
            name: shortLabel(entry),
            scope,
            transport: transportLabel,
            ...mcpToolSummary(
              entry,
              snapshot,
              withheld !== undefined && Object.hasOwn(withheld, entry) ? withheld[entry] : undefined,
              diffNamesCap,
            ),
          },
        ];
  });
  let payload = {
    v: 1,
    machine_name: machineName,
    reconsent: withheld !== undefined,
    ...(withheld !== undefined && {
      changed_servers: flattened.map((server) => server.name),
    }),
    servers: flattened,
  };
  return flattened.length === servers.length &&
    flattened.every((server) => isCleanText(server.name)) &&
    new Set(offered.map(([server]) => shortLabel(server).normalize("NFC"))).size === offered.length &&
    deviceMcpConsentSpec.payload().safeParse(payload).success
    ? payload
    : null;
}
//@ chunk-fe6rs39h.js:42633-42825 placement
function mcpScopeLabel(client) {
  switch (client.scope) {
    case "user":
    case "local":
      return client.scope;
    case "dynamic":
      return isPluginServerConfig(client) ? "plugin" : undefined;
    case "project":
    case "enterprise":
    case "managed":
    case "claudeai":
    case "agent":
      return;
  }
}
//@ chunk-fe6rs39h.js:42825-43003 placement = expandEnvVars (0.913)
function getTransportLabel(config) {
  switch (config.type) {
    case undefined:
    case "stdio":
      return "stdio";
    case "http":
    case "sse":
    case "ws":
      return config.type;
    case "sdk":
    case "sse-ide":
    case "ws-ide":
    case "claudeai-proxy":
      return;
  }
}
//@ chunk-fe6rs39h.js:43003-43494 placement
function mcpToolSummary(serverName, snapshot, diff, diffNamesCap) {
  if (snapshot === "unreadable")
    return {
      tool_count: 0,
      tool_names: [],
      tool_names_truncated: true,
    };
  let serverTools = Object.hasOwn(snapshot.servers, serverName) ? snapshot.servers[serverName] : undefined;
  let sliced = getMcpPrefix(serverName).slice(5);
  let toolNames = uniq(
    [
      ...(diff?.added ?? []),
      ...(serverTools === undefined || serverTools === "declined" ? [] : Object.keys(serverTools)),
    ].map((name) => (name.startsWith(sliced) ? name.slice(sliced.length) : name)),
  );
  let filtered = toolNames.filter((name) => isCleanText(shortLabel(name)));
  let listable = disambiguateLabels(filtered, shortLabel);
  return {
    tool_count: toolNames.length,
    tool_names: listable.slice(0, DEVICE_MCP_CONSENT_LIMITS),
    tool_names_truncated:
      listable.length > DEVICE_MCP_CONSENT_LIMITS ||
      filtered.length < toolNames.length ||
      (diff !== undefined && Math.max(diff.added.length, diff.changed.length) >= diffNamesCap),
  };
}
//@ chunk-fe6rs39h.js:43494-43728 placement
var UNATTENDED_SERVING_CONSENT; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fe6rs39h.js:43494", () => {
  UNATTENDED_SERVING_CONSENT = withHideWhile({
    kind: "unattended_serving_consent",
    payload: DoctorLazy(() =>
      objectSchema({
        machineName: stringSchema(),
        title: stringSchema(),
        body: stringSchema(),
        detail: stringSchema(),
        terms: stringSchema(),
        version: numberSchema().int().nonnegative(),
      }),
    ),
    result: DoctorLazy(() => _enum(["accept", "decline", "not_now"])),
    default: "not_now",
    hideWhile: [],
  });
});
//@ chunk-fe6rs39h.js:43728-43903 placement
function unattendedServingConsentPayload(machineName) {
  return {
    machineName,
    title: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.title"],
    body: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.body.host"],
    detail: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.detail"],
    terms: UNATTENDED_SERVING_CONSENT_TERMS,
    version: UNATTENDED_SERVING_CONSENT_VERSION,
  };
}
//@ chunk-fe6rs39h.js:43903-43951 placement
function isConsentDialogKind(kind) {
  return kind === UNATTENDED_SERVING_CONSENT.kind || kind === deviceMcpConsentSpec.kind;
}
//@ chunk-fe6rs39h.js:43951-44661 placement
function createHostDialogHandler({ io, declaredKinds, clock }) {
  return async function (request, payload, context) {
    let startedAt = clock.now();
    let logOutcome = (outcome) => {
      logEvent("tengu_remote_headless_client_host_dialog", {
        dialog_kind: shortHash(request.kind),
        outcome: fromEnum(outcome),
        latency_ms: clock.now() - startedAt,
      });
    };
    let fallback = {
      answer: request.default,
      answered: false,
    };
    if (!declaredKinds.has(request.kind)) {
      logOutcome("undeclared");
      return fallback;
    }
    let parsedPayload = request.payload().safeParse(payload);
    if (!parsedPayload.success) {
      logOutcome("invalid_payload");
      return fallback;
    }
    let dialogResult;
    try {
      dialogResult = await io.requestUserDialog(request.kind, parsedPayload.data, {
        signal: context?.signal,
      });
    } catch (error) {
      logForDebugging(`[headlessCloudClient] host dialog ${request.kind} failed: ${errorMessage(error)}`);
      dialogResult = {
        behavior: "cancelled",
      };
    }
    if (dialogResult.behavior === "cancelled") {
      logOutcome("cancelled");
      return fallback;
    }
    let parsedResult = request.result().safeParse(dialogResult.result);
    if (!parsedResult.success) {
      logOutcome("invalid_result");
      return fallback;
    }
    logOutcome("answered");
    return {
      answer: stripDeclineMessage(parsedResult.data),
      answered: true,
    };
  };
}
export {
  deviceMcpConsentSpec,
  buildMcpServeConsentPayload,
  isConsentDialogKind,
  createHostDialogHandler,
  UNATTENDED_SERVING_CONSENT,
  unattendedServingConsentPayload,
};
