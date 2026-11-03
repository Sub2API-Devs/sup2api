/**
 * services/mcp/handedListingCheck.ts
 *
 * MCP 工具调用与交给模型的列表比对（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zdgk9dc6.js (12)
 * attribution: placement 12
 */
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isAbortError,
  errorMessage,
} from "../../utils/errors.js";
import { boundDial } from "./dialFailureLatch.js";
import { getConnectionTimeoutMs } from "./client.js";
import { eP } from "../../bootstrap/stateSlices.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logMCPDebug } from "../../utils/log.js";
import { normalizeMcpServerName } from "../api/deferredToolsState.js";
import { redactMcpErrorDetail } from "./mcpServerOrigin.js";
import { describeConnectError } from "./auth.js";

//@ chunk-zdgk9dc6.js:1381-1404 placement
class z extends Error {}
//@ chunk-zdgk9dc6.js:1404-1562 placement
var CALL_AGAIN_HINT =
    "Call the tool again: it is checked again each time, and Claude Code replaces it with the server's own tool once that is loaded.",
  SAFE_TOOL_NAME_REGEX = /^[A-Za-z0-9_-]+$/;
//@ chunk-zdgk9dc6.js:1562-1658 placement
function W(n) {
  return n.every((o) => SAFE_TOOL_NAME_REGEX.test(o.name)) && new Set(n.map((o) => o.name)).size === n.length;
}
//@ chunk-zdgk9dc6.js:1658-1825 placement
function wrapHandedListingChecks(n, o, e, y, r) {
  let p = {
    row: n,
    dialer: y,
    isHandshakeHanded: r,
    handedByName: new Map(W(e) ? e.map((u) => [u.name, u]) : []),
    ask: void 0,
    passed: new Set(),
  };
  for (let u of o) wrapToolWithListingCheck(p, u);
}
/**
 * 给一个 MCP 工具的 call、validateInput、checkPermissions、askInputPreparer 加上"与交给模型的工具列表比对"检查，不一致时分别抛错、返回校验失败、拒绝或让准备阶段报错。
 */
//@ chunk-zdgk9dc6.js:1825-2513 placement
function wrapToolWithListingCheck(ctx, tool) {
  let toolName = tool.mcpInfo?.toolName,
    {
      call: originalCall,
      validateInput: validateInput,
      checkPermissions: checkPermissions,
      askInputPreparer: askInputPreparer,
    } = tool;
  if (
    ((tool.call = async (m, s, ...h) => {
      let c = await checkHandedListing(ctx, tool, toolName, s);
      if (c !== void 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          c,
          "MCP tool refused by the check of its handed listing",
        );
      return originalCall(m, s, ...h);
    }),
    (tool.validateInput = async (m, s) => {
      let h = await checkHandedListing(ctx, tool, toolName, s);
      if (h !== void 0) return { result: !1, message: h, errorCode: 3 };
      return (await validateInput?.(m, s)) ?? { result: !0 };
    }),
    (tool.checkPermissions = async (m, s) => {
      let h = await checkHandedListing(ctx, tool, toolName, s);
      if (h !== void 0) return { behavior: "deny", message: h, decisionReason: { type: "other", reason: h } };
      return checkPermissions(m, s);
    }),
    askInputPreparer !== void 0)
  )
    tool.askInputPreparer = async (m, s, h) => {
      let c = await checkHandedListing(ctx, tool, toolName, s);
      return c === void 0 ? askInputPreparer(m, s, h) : { prepare: async () => ({ error: c }) };
    };
}
/**
 * 把 MCP 工具调用与交给模型的工具列表比对，不一致时拒绝
 */
//@ chunk-zdgk9dc6.js:2513-3986 placement
async function checkHandedListing(n, o, e, y) {
  let { row: row, handedByName: handedByName, passed: passed } = n;
  if (e === void 0)
    return listingCheckFailedMessage(
      row,
      o.name,
      "Claude Code could not tell which of the server's tools this is",
    );
  let { signal: signal } = y.abortController;
  if (passed.has(e)) return;
  let s = (n.ask ??= startListingCheck(n, y.toolUseId)),
    h;
  try {
    h = await boundDial(s.answer, {
      signal: signal,
      timeoutMs: 2 * getConnectionTimeoutMs(),
      serverName: row.name,
      context: "MCP tool check",
    });
  } catch (error) {
    if ((V(n, s), isAbortError(error))) throw error;
    if (!s.hasAnswered || error instanceof z) {
      let M = s.hasAnswered ? errorMessage(error) : "the server did not answer in time";
      return refuseByListingCheck(
        n,
        s,
        "not_compared",
        `${listingCheckFailedMessage(row, e, M)} Try the call again.`,
      );
    }
    return refuseByListingCheck(
      n,
      s,
      "not_compared",
      error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
        ? errorMessage(error)
        : listingCheckFailedMessage(row, e, Y(error, row)),
    );
  }
  if (n.isHandshakeHanded && h.hasOtherHandshake)
    return refuseByListingCheck(
      n,
      s,
      "handshake",
      `MCP server "${row.name}" does not match what Claude Code was given at start-up (in its capabilities, name, version or instructions), so the call was not made. ${CALL_AGAIN_HINT}`,
    );
  let c = h.tools.get(e);
  if (c === void 0 && h.mayListMore)
    return refuseByListingCheck(
      n,
      s,
      "not_compared",
      `${listingCheckFailedMessage(row, e, "the server's list could not be matched tool by tool")} ${CALL_AGAIN_HINT}`,
    );
  if (!handedByName.has(e))
    return refuseByListingCheck(
      n,
      s,
      "not_compared",
      `${listingCheckFailedMessage(row, e, "the list given at start-up could not be matched tool by tool")} ${CALL_AGAIN_HINT}`,
    );
  if (c === void 0)
    return refuseByListingCheck(
      n,
      s,
      "tool_gone",
      `MCP server "${row.name}" no longer offers the tool "${e}", so the call was not made.`,
    );
  if (!eP(c, handedByName.get(e)))
    return refuseByListingCheck(
      n,
      s,
      "tool_differs",
      `MCP server "${row.name}" lists the tool "${e}" differently from the definition that Claude Code was given at start-up, so the call was not made. ${CALL_AGAIN_HINT}`,
    );
  (logFeatureOk("mcp_handed_listing_check"), passed.add(e));
  return;
}
//@ chunk-zdgk9dc6.js:3986-4105 placement
function startListingCheck(n, o) {
  let e = { answer: logHandedListingCheck(n, o), hasAnswered: !1 };
  return (
    e.answer
      .finally(() => {
        e.hasAnswered = !0;
      })
      .catch(() => {}),
    e
  );
}
//@ chunk-zdgk9dc6.js:4105-4755 placement
async function logHandedListingCheck({ row: row, dialer: dialer, isHandshakeHanded: isHandshakeHanded }, y) {
  let ensureConnectedClient = await dialer.ensureConnectedClient(row, {
      context: "MCP tool call",
      toolUseId: y,
    }),
    p = ensureConnectedClient.instructions !== row.instructions;
  if (isHandshakeHanded && p) logFeatureSad("mcp_handed_listing_check", "instructions_differ");
  let u =
    !eP(ensureConnectedClient.capabilities, row.capabilities) ||
    ensureConnectedClient.serverInfo?.name !== row.serverInfo?.name ||
    ensureConnectedClient.serverInfo?.version !== row.serverInfo?.version;
  if (isHandshakeHanded && u) logFeatureSad("mcp_handed_listing_check", "handshake_differs");
  let m = await dialer
      .listToolsRaw(ensureConnectedClient.client, { timeout: getConnectionTimeoutMs() })
      .catch((h) => {
        if (isAbortError(h)) throw h;
        throw new z(Y(h, row));
      }),
    s = W(m.tools);
  return {
    tools: new Map(s ? m.tools.map((tool) => [tool.name, tool]) : []),
    mayListMore: m.nextCursor !== void 0 || !s,
    hasOtherHandshake: p || u,
  };
}
//@ chunk-zdgk9dc6.js:4755-4797 placement
function V(n, o) {
  if (n.ask === o) n.ask = void 0;
}
//@ chunk-zdgk9dc6.js:4797-4901 placement
function refuseByListingCheck(n, o, e, y) {
  if ((V(n, o), e !== "handshake")) logFeatureSad("mcp_handed_listing_check", e);
  return (logMCPDebug(n.row.name, y), y);
}
//@ chunk-zdgk9dc6.js:4901-5040 placement
function listingCheckFailedMessage(n, o, e) {
  return `The tool "${o}" could not be checked against what MCP server "${n.name}" lists (${e}), so the call was not made.`;
}
//@ chunk-zdgk9dc6.js:5040-5102 placement
function Y(n, o) {
  return normalizeMcpServerName(redactMcpErrorDetail(o.name, o.config, describeConnectError(n, o.config)));
}

export { wrapHandedListingChecks };
