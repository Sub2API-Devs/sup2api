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
import { u, literal, string, M, array, _enum, E } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-fe6rs39h.js:41526-42021 placement
/**
 * 设备 MCP 同意的上限常量：最多 64 台服务器、名字 128 字符、机器名 256 字符，以及 device_mcp_consent 对话框 spec。
 */
var DEVICE_MCP_CONSENT_LIMITS = 20;
var MAX_DEVICE_MCP_CONSENT_SERVERS = 64;
var MAX_DEVICE_MCP_NAME_CHARS = 128;
var MAX_MACHINE_NAME_CHARS_2 = 256;
var deviceMcpConsentSpec = withHideWhile({
  kind: "device_mcp_consent",
  payload: DoctorLazy(() =>
    u({
      v: literal(1),
      machine_name: string().min(1).max(MAX_MACHINE_NAME_CHARS_2),
      reconsent: M(),
      changed_servers: array(string().min(1).max(MAX_DEVICE_MCP_NAME_CHARS)).optional(),
      servers: array(
        u({
          name: string().min(1).max(MAX_DEVICE_MCP_NAME_CHARS),
          scope: _enum(["user", "local", "plugin"]),
          transport: _enum(["stdio", "http", "sse", "ws"]),
          tool_count: E().int().nonnegative(),
          tool_names: array(string().min(1).max(MAX_DEVICE_MCP_NAME_CHARS)).max(DEVICE_MCP_CONSENT_LIMITS),
          tool_names_truncated: M(),
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
//@ chunk-fe6rs39h.js:42021-42633 placement
/**
 * 构造本机 MCP 服务器供云会话使用的同意请求载荷：列出（或重新同意时只列变化的）服务器名、范围、传输与工具摘要；数量超限、名称不干净或重名时返回 null。
 */
function buildMcpServeConsentPayload({ machineName, offered, snapshot, withheld, diffNamesCap }) {
  let servers = withheld === undefined ? offered : offered.filter(([R]) => Object.hasOwn(withheld, R));
  if (servers.length === 0 || servers.length > MAX_DEVICE_MCP_CONSENT_SERVERS) return null;
  let flattened = servers.flatMap(([R, config]) => {
    let I = mcpScopeLabel(config);
    let transportLabel = getTransportLabel(config);
    return I === undefined || transportLabel === undefined
      ? []
      : [
          {
            name: shortLabel(R),
            scope: I,
            transport: transportLabel,
            ...mcpToolSummary(
              R,
              snapshot,
              withheld !== undefined && Object.hasOwn(withheld, R) ? withheld[R] : undefined,
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
      changed_servers: flattened.map((R) => R.name),
    }),
    servers: flattened,
  };
  return flattened.length === servers.length &&
    flattened.every((R) => isCleanText(R.name)) &&
    new Set(offered.map(([R]) => shortLabel(R).normalize("NFC"))).size === offered.length &&
    deviceMcpConsentSpec.payload().safeParse(payload).success
    ? payload
    : null;
}
//@ chunk-fe6rs39h.js:42633-42825 placement
function mcpScopeLabel(e) {
  switch (e.scope) {
    case "user":
    case "local":
      return e.scope;
    case "dynamic":
      return isPluginServerConfig(e) ? "plugin" : undefined;
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
function mcpToolSummary(e, snapshot, s, diffNamesCap) {
  if (snapshot === "unreadable")
    return {
      tool_count: 0,
      tool_names: [],
      tool_names_truncated: true,
    };
  let h = Object.hasOwn(snapshot.servers, e) ? snapshot.servers[e] : undefined;
  let sliced = getMcpPrefix(e).slice(5);
  let S = uniq(
    [...(s?.added ?? []), ...(h === undefined || h === "declined" ? [] : Object.keys(h))].map((k) =>
      k.startsWith(sliced) ? k.slice(sliced.length) : k,
    ),
  );
  let filtered = S.filter((k) => isCleanText(shortLabel(k)));
  let R = disambiguateLabels(filtered, shortLabel);
  return {
    tool_count: S.length,
    tool_names: R.slice(0, DEVICE_MCP_CONSENT_LIMITS),
    tool_names_truncated:
      R.length > DEVICE_MCP_CONSENT_LIMITS ||
      filtered.length < S.length ||
      (s !== undefined && Math.max(s.added.length, s.changed.length) >= diffNamesCap),
  };
}
//@ chunk-fe6rs39h.js:43494-43728 placement
var UNATTENDED_SERVING_CONSENT = withHideWhile({
  kind: "unattended_serving_consent",
  payload: DoctorLazy(() =>
    u({
      machineName: string(),
      title: string(),
      body: string(),
      detail: string(),
      terms: string(),
      version: E().int().nonnegative(),
    }),
  ),
  result: DoctorLazy(() => _enum(["accept", "decline", "not_now"])),
  default: "not_now",
  hideWhile: [],
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
function isConsentDialogKind(e) {
  return e === UNATTENDED_SERVING_CONSENT.kind || e === deviceMcpConsentSpec.kind;
}
//@ chunk-fe6rs39h.js:43951-44661 placement
function createHostDialogHandler({ io, declaredKinds, clock }) {
  return async function (h, y, S) {
    let w = clock.now();
    let R = (N) => {
      logEvent("tengu_remote_headless_client_host_dialog", {
        dialog_kind: shortHash(h.kind),
        outcome: fromEnum(N),
        latency_ms: clock.now() - w,
      });
    };
    let k = {
      answer: h.default,
      answered: false,
    };
    if (!declaredKinds.has(h.kind)) {
      R("undeclared");
      return k;
    }
    let I = h.payload().safeParse(y);
    if (!I.success) {
      R("invalid_payload");
      return k;
    }
    let O;
    try {
      O = await io.requestUserDialog(h.kind, I.data, {
        signal: S?.signal,
      });
    } catch (error) {
      logForDebugging(`[headlessCloudClient] host dialog ${h.kind} failed: ${errorMessage(error)}`);
      O = {
        behavior: "cancelled",
      };
    }
    if (O.behavior === "cancelled") {
      R("cancelled");
      return k;
    }
    let P = h.result().safeParse(O.result);
    if (!P.success) {
      R("invalid_result");
      return k;
    }
    R("answered");
    return {
      answer: stripDeclineMessage(P.data),
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
