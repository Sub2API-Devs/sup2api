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
import { deepEqualIgnoringUndefined } from "../../bootstrap/stateSlices.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logMCPDebug } from "../../utils/log.js";
import { normalizeMcpServerName } from "../api/deferredToolsState.js";
import { redactMcpErrorDetail } from "./mcpServerOrigin.js";
import { describeConnectError } from "./auth.js";

//@ chunk-zdgk9dc6.js:1381-1404 placement
/**
 * 交接清单检查中途放弃时抛的错误。
 */
class ListingCheckAbortError extends Error {}
//@ chunk-zdgk9dc6.js:1404-1562 placement
var CALL_AGAIN_HINT =
  "Call the tool again: it is checked again each time, and Claude Code replaces it with the server's own tool once that is loaded.";
var SAFE_TOOL_NAME_REGEX = /^[A-Za-z0-9_-]+$/;
//@ chunk-zdgk9dc6.js:1562-1658 placement
/**
 * 判断工具清单是否可交付（名字合法且唯一）。
 */
function isDeliverableToolsList(n) {
  return n.every((o) => SAFE_TOOL_NAME_REGEX.test(o.name)) && new Set(n.map((o) => o.name)).size === n.length;
}
//@ chunk-zdgk9dc6.js:1658-1825 placement
function wrapHandedListingChecks(row, tools, tools_2, dialer, isHandshakeHanded) {
  let ctx = {
    row,
    dialer,
    isHandshakeHanded,
    handedByName: new Map(isDeliverableToolsList(tools_2) ? tools_2.map((u) => [u.name, u]) : []),
    ask: undefined,
    passed: new Set(),
  };
  for (let u of tools) wrapToolWithListingCheck(ctx, u);
}
//@ chunk-zdgk9dc6.js:1825-2513 placement
/**
 * 给一个 MCP 工具的 call、validateInput、checkPermissions、askInputPreparer 加上"与交给模型的工具列表比对"检查，不一致时分别抛错、返回校验失败、拒绝或让准备阶段报错。
 */
function wrapToolWithListingCheck(ctx, tool) {
  let toolName = tool.mcpInfo?.toolName;
  let { call: originalCall, validateInput, checkPermissions, askInputPreparer } = tool;
  tool.call = async (m, s, ...h) => {
    let c = await checkHandedListing(ctx, tool, toolName, s);
    if (c !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        c,
        "MCP tool refused by the check of its handed listing",
      );
    return originalCall(m, s, ...h);
  };
  tool.validateInput = async (m, s) => {
    let h = await checkHandedListing(ctx, tool, toolName, s);
    if (h !== undefined)
      return {
        result: false,
        message: h,
        errorCode: 3,
      };
    return (
      (await validateInput?.(m, s)) ?? {
        result: true,
      }
    );
  };
  tool.checkPermissions = async (m, s) => {
    let h = await checkHandedListing(ctx, tool, toolName, s);
    if (h !== undefined)
      return {
        behavior: "deny",
        message: h,
        decisionReason: {
          type: "other",
          reason: h,
        },
      };
    return checkPermissions(m, s);
  };
  if (askInputPreparer !== undefined)
    tool.askInputPreparer = async (m, s, h) => {
      let c = await checkHandedListing(ctx, tool, toolName, s);
      return c === undefined
        ? askInputPreparer(m, s, h)
        : {
            prepare: async () => ({
              error: c,
            }),
          };
    };
}
//@ chunk-zdgk9dc6.js:2513-3986 placement
/**
 * 把 MCP 工具调用与交给模型的工具列表比对，不一致时拒绝
 */
async function checkHandedListing(ctx, tool, toolName, y) {
  let { row, handedByName, passed } = ctx;
  if (toolName === undefined)
    return listingCheckFailedMessage(
      row,
      tool.name,
      "Claude Code could not tell which of the server's tools this is",
    );
  let { signal } = y.abortController;
  if (passed.has(toolName)) return;
  let s = (ctx.ask ??= startListingCheck(ctx, y.toolUseId));
  let h;
  try {
    h = await boundDial(s.answer, {
      signal,
      timeoutMs: 2 * getConnectionTimeoutMs(),
      serverName: row.name,
      context: "MCP tool check",
    });
  } catch (error) {
    clearPendingAsk(ctx, s);
    if (isAbortError(error)) throw error;
    if (!s.hasAnswered || error instanceof ListingCheckAbortError) {
      let M = s.hasAnswered ? errorMessage(error) : "the server did not answer in time";
      return refuseByListingCheck(
        ctx,
        s,
        "not_compared",
        `${listingCheckFailedMessage(row, toolName, M)} Try the call again.`,
      );
    }
    return refuseByListingCheck(
      ctx,
      s,
      "not_compared",
      error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
        ? errorMessage(error)
        : listingCheckFailedMessage(row, toolName, describeListingFailure(error, row)),
    );
  }
  if (ctx.isHandshakeHanded && h.hasOtherHandshake)
    return refuseByListingCheck(
      ctx,
      s,
      "handshake",
      `MCP server "${row.name}" does not match what Claude Code was given at start-up (in its capabilities, name, version or instructions), so the call was not made. ${CALL_AGAIN_HINT}`,
    );
  let c = h.tools.get(toolName);
  if (c === undefined && h.mayListMore)
    return refuseByListingCheck(
      ctx,
      s,
      "not_compared",
      `${listingCheckFailedMessage(row, toolName, "the server's list could not be matched tool by tool")} ${CALL_AGAIN_HINT}`,
    );
  if (!handedByName.has(toolName))
    return refuseByListingCheck(
      ctx,
      s,
      "not_compared",
      `${listingCheckFailedMessage(row, toolName, "the list given at start-up could not be matched tool by tool")} ${CALL_AGAIN_HINT}`,
    );
  if (c === undefined)
    return refuseByListingCheck(
      ctx,
      s,
      "tool_gone",
      `MCP server "${row.name}" no longer offers the tool "${toolName}", so the call was not made.`,
    );
  if (!deepEqualIgnoringUndefined(c, handedByName.get(toolName)))
    return refuseByListingCheck(
      ctx,
      s,
      "tool_differs",
      `MCP server "${row.name}" lists the tool "${toolName}" differently from the definition that Claude Code was given at start-up, so the call was not made. ${CALL_AGAIN_HINT}`,
    );
  logFeatureOk("mcp_handed_listing_check");
  passed.add(toolName);
  return;
}
//@ chunk-zdgk9dc6.js:3986-4105 placement
function startListingCheck(n, toolUseId) {
  let e = {
    answer: logHandedListingCheck(n, toolUseId),
    hasAnswered: false,
  };
  e.answer
    .finally(() => {
      e.hasAnswered = true;
    })
    .catch(() => {});
  return e;
}
//@ chunk-zdgk9dc6.js:4105-4755 placement
async function logHandedListingCheck({ row, dialer, isHandshakeHanded }, toolUseId) {
  let r = await dialer.ensureConnectedClient(row, {
    context: "MCP tool call",
    toolUseId,
  });
  let p = r.instructions !== row.instructions;
  if (isHandshakeHanded && p) logFeatureSad("mcp_handed_listing_check", "instructions_differ");
  let u =
    !deepEqualIgnoringUndefined(r.capabilities, row.capabilities) ||
    r.serverInfo?.name !== row.serverInfo?.name ||
    r.serverInfo?.version !== row.serverInfo?.version;
  if (isHandshakeHanded && u) logFeatureSad("mcp_handed_listing_check", "handshake_differs");
  let m = await dialer
    .listToolsRaw(r.client, {
      timeout: getConnectionTimeoutMs(),
    })
    .catch((error) => {
      if (isAbortError(error)) throw error;
      throw new ListingCheckAbortError(describeListingFailure(error, row));
    });
  let s = isDeliverableToolsList(m.tools);
  return {
    tools: new Map(s ? m.tools.map((tool) => [tool.name, tool]) : []),
    mayListMore: m.nextCursor !== undefined || !s,
    hasOtherHandshake: p || u,
  };
}
//@ chunk-zdgk9dc6.js:4755-4797 placement
/**
 * 若 ask 标记正是给定值就清掉。
 */
function clearPendingAsk(n, o) {
  if (n.ask === o) n.ask = undefined;
}
//@ chunk-zdgk9dc6.js:4797-4901 placement
function refuseByListingCheck(n, o, e, y) {
  clearPendingAsk(n, o);
  if (e !== "handshake") logFeatureSad("mcp_handed_listing_check", e);
  logMCPDebug(n.row.name, y);
  return y;
}
//@ chunk-zdgk9dc6.js:4901-5040 placement
function listingCheckFailedMessage(row, o, e) {
  return `The tool "${o}" could not be checked against what MCP server "${row.name}" lists (${e}), so the call was not made.`;
}
//@ chunk-zdgk9dc6.js:5040-5102 placement
/**
 * 生成清单检查失败的描述文本（脱敏）。
 */
function describeListingFailure(error, row) {
  return normalizeMcpServerName(
    redactMcpErrorDetail(row.name, row.config, describeConnectError(error, row.config)),
  );
}
export { wrapHandedListingChecks };
