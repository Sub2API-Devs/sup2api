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
import { u, T, o, M, A, U, E } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { gn } from "../../utils/shortHash.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { stripDeclineMessage } from "../../services/requestUserDialog.js";

//@ chunk-fe6rs39h.js:41526-42021 placement
var DEVICE_MCP_CONSENT_LIMITS = 20,
  Ln = 64,
  Lt = 128,
  ko = 256,
  CZt = withHideWhile({
    kind: "device_mcp_consent",
    payload: DoctorLazy(() =>
      u({
        v: T(1),
        machine_name: o().min(1).max(ko),
        reconsent: M(),
        changed_servers: A(o().min(1).max(Lt)).optional(),
        servers: A(
          u({
            name: o().min(1).max(Lt),
            scope: U(["user", "local", "plugin"]),
            transport: U(["stdio", "http", "sse", "ws"]),
            tool_count: E().int().nonnegative(),
            tool_names: A(o().min(1).max(Lt)).max(DEVICE_MCP_CONSENT_LIMITS),
            tool_names_truncated: M(),
          }),
        )
          .min(1)
          .max(Ln),
      }),
    ),
    result: DoctorLazy(() => U(["allow", "deny", "not_now"])),
    default: "not_now",
    hideWhile: [],
  });
/**
 * 构造本机 MCP 服务器供云会话使用的同意请求载荷：列出（或重新同意时只列变化的）服务器名、范围、传输与工具摘要；数量超限、名称不干净或重名时返回 null。
 */
//@ chunk-fe6rs39h.js:42021-42633 placement
function buildMcpServeConsentPayload({
  machineName: machineName,
  offered: offered,
  snapshot: snapshot,
  withheld: withheld,
  diffNamesCap: diffNamesCap,
}) {
  let servers = withheld === void 0 ? offered : offered.filter(([R]) => Object.hasOwn(withheld, R));
  if (servers.length === 0 || servers.length > Ln) return null;
  let flattened = servers.flatMap(([R, k]) => {
      let I = mcpScopeLabel(k),
        O = getTransportLabel(k);
      return I === void 0 || O === void 0
        ? []
        : [
            {
              name: shortLabel(R),
              scope: I,
              transport: O,
              ...mcpToolSummary(
                R,
                snapshot,
                withheld !== void 0 && Object.hasOwn(withheld, R) ? withheld[R] : void 0,
                diffNamesCap,
              ),
            },
          ];
    }),
    payload = {
      v: 1,
      machine_name: machineName,
      reconsent: withheld !== void 0,
      ...(withheld !== void 0 && { changed_servers: flattened.map((R) => R.name) }),
      servers: flattened,
    };
  return flattened.length === servers.length &&
    flattened.every((R) => isCleanText(R.name)) &&
    new Set(offered.map(([R]) => shortLabel(R).normalize("NFC"))).size === offered.length &&
    CZt.payload().safeParse(payload).success
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
      return isPluginServerConfig(e) ? "plugin" : void 0;
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
    case void 0:
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
function mcpToolSummary(e, n, s, r) {
  if (n === "unreadable") return { tool_count: 0, tool_names: [], tool_names_truncated: !0 };
  let h = Object.hasOwn(n.servers, e) ? n.servers[e] : void 0,
    sliced = getMcpPrefix(e).slice(5),
    S = uniq(
      [...(s?.added ?? []), ...(h === void 0 || h === "declined" ? [] : Object.keys(h))].map((k) =>
        k.startsWith(sliced) ? k.slice(sliced.length) : k,
      ),
    ),
    filtered = S.filter((k) => isCleanText(shortLabel(k))),
    R = disambiguateLabels(filtered, shortLabel);
  return {
    tool_count: S.length,
    tool_names: R.slice(0, DEVICE_MCP_CONSENT_LIMITS),
    tool_names_truncated:
      R.length > DEVICE_MCP_CONSENT_LIMITS ||
      filtered.length < S.length ||
      (s !== void 0 && Math.max(s.added.length, s.changed.length) >= r),
  };
}
//@ chunk-fe6rs39h.js:43494-43728 placement
var UNATTENDED_SERVING_CONSENT = withHideWhile({
  kind: "unattended_serving_consent",
  payload: DoctorLazy(() =>
    u({ machineName: o(), title: o(), body: o(), detail: o(), terms: o(), version: E().int().nonnegative() }),
  ),
  result: DoctorLazy(() => U(["accept", "decline", "not_now"])),
  default: "not_now",
  hideWhile: [],
});
//@ chunk-fe6rs39h.js:43728-43903 placement
function unattendedServingConsentPayload(e) {
  return {
    machineName: e,
    title: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.title"],
    body: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.body.host"],
    detail: REMOTE_TOOLS_CONSENT_TEXT["consent.unattended.detail"],
    terms: UNATTENDED_SERVING_CONSENT_TERMS,
    version: UNATTENDED_SERVING_CONSENT_VERSION,
  };
}
//@ chunk-fe6rs39h.js:43903-43951 placement
function isConsentDialogKind(e) {
  return e === UNATTENDED_SERVING_CONSENT.kind || e === CZt.kind;
}
//@ chunk-fe6rs39h.js:43951-44661 placement
function createHostDialogHandler({ io: io, declaredKinds: declaredKinds, clock: clock }) {
  return async function (h, y, S) {
    let now = clock.now(),
      R = (N) => {
        logEvent("tengu_remote_headless_client_host_dialog", {
          dialog_kind: gn(h.kind),
          outcome: fromEnum(N),
          latency_ms: clock.now() - now,
        });
      },
      k = { answer: h.default, answered: !1 };
    if (!declaredKinds.has(h.kind)) return (R("undeclared"), k);
    let safeParse = h.payload().safeParse(y);
    if (!safeParse.success) return (R("invalid_payload"), k);
    let O;
    try {
      O = await io.requestUserDialog(h.kind, safeParse.data, { signal: S?.signal });
    } catch (error) {
      (logForDebugging(`[headlessCloudClient] host dialog ${h.kind} failed: ${errorMessage(error)}`),
        (O = { behavior: "cancelled" }));
    }
    if (O.behavior === "cancelled") return (R("cancelled"), k);
    let safeParse_2 = h.result().safeParse(O.result);
    if (!safeParse_2.success) return (R("invalid_result"), k);
    return (R("answered"), { answer: stripDeclineMessage(safeParse_2.data), answered: !0 });
  };
}

export {
  CZt,
  buildMcpServeConsentPayload,
  isConsentDialogKind,
  createHostDialogHandler,
  UNATTENDED_SERVING_CONSENT,
  unattendedServingConsentPayload,
};
