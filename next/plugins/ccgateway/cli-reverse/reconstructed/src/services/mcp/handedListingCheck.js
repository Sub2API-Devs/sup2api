/**
 * services/mcp/handedListingCheck.ts
 *
 * MCP 工具调用与交给模型的列表比对（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nkjcc801.js (12)
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

//@ chunk-nkjcc801.js:1413-1436 placement
/**
 * 交接清单检查中途放弃时抛的错误。
 */
class ListingCheckAbortError extends Error {}
//@ chunk-nkjcc801.js:1436-1594 placement
var CALL_AGAIN_HINT =
  "Call the tool again: it is checked again each time, and Claude Code replaces it with the server's own tool once that is loaded.";
var SAFE_TOOL_NAME_REGEX = /^[A-Za-z0-9_-]+$/;
//@ chunk-nkjcc801.js:1594-1690 placement
/**
 * 判断工具清单是否可交付（名字合法且唯一）。
 */
function isDeliverableToolsList(tools) {
  return (
    tools.every((tool) => SAFE_TOOL_NAME_REGEX.test(tool.name)) &&
    new Set(tools.map((tool) => tool.name)).size === tools.length
  );
}
//@ chunk-nkjcc801.js:1690-1857 placement
function wrapHandedListingChecks(row, tools, tools_2, dialer, isHandshakeHanded) {
  let ctx = {
    row,
    dialer,
    isHandshakeHanded,
    handedByName: new Map(isDeliverableToolsList(tools_2) ? tools_2.map((tool) => [tool.name, tool]) : []),
    ask: undefined,
    passed: new Set(),
  };
  for (let tool of tools) wrapToolWithListingCheck(ctx, tool);
}
//@ chunk-nkjcc801.js:1857-2545 placement
/**
 * 给一个 MCP 工具的 call、validateInput、checkPermissions、askInputPreparer 加上"与交给模型的工具列表比对"检查，不一致时分别抛错、返回校验失败、拒绝或让准备阶段报错。
 */
function wrapToolWithListingCheck(ctx, tool) {
  let toolName = tool.mcpInfo?.toolName;
  let { call: originalCall, validateInput, checkPermissions, askInputPreparer } = tool;
  tool.call = async (input, context, ...rest) => {
    let refusal = await checkHandedListing(ctx, tool, toolName, context);
    if (refusal !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        refusal,
        "MCP tool refused by the check of its handed listing",
      );
    return originalCall(input, context, ...rest);
  };
  tool.validateInput = async (input, context) => {
    let refusal = await checkHandedListing(ctx, tool, toolName, context);
    if (refusal !== undefined)
      return {
        result: false,
        message: refusal,
        errorCode: 3,
      };
    return (
      (await validateInput?.(input, context)) ?? {
        result: true,
      }
    );
  };
  tool.checkPermissions = async (input, context) => {
    let refusal = await checkHandedListing(ctx, tool, toolName, context);
    if (refusal !== undefined)
      return {
        behavior: "deny",
        message: refusal,
        decisionReason: {
          type: "other",
          reason: refusal,
        },
      };
    return checkPermissions(input, context);
  };
  if (askInputPreparer !== undefined)
    tool.askInputPreparer = async (input, context, toolUseId) => {
      let refusal = await checkHandedListing(ctx, tool, toolName, context);
      return refusal === undefined
        ? askInputPreparer(input, context, toolUseId)
        : {
            prepare: async () => ({
              error: refusal,
            }),
          };
    };
}
//@ chunk-nkjcc801.js:2545-4018 placement
/**
 * 把 MCP 工具调用与交给模型的工具列表比对，不一致时拒绝
 */
async function checkHandedListing(ctx, tool, toolName, context) {
  let { row, handedByName, passed } = ctx;
  if (toolName === undefined)
    return listingCheckFailedMessage(
      row,
      tool.name,
      "Claude Code could not tell which of the server's tools this is",
    );
  let { signal } = context.abortController;
  if (passed.has(toolName)) return;
  let ask = (ctx.ask ??= startListingCheck(ctx, context.toolUseId));
  let result;
  try {
    result = await boundDial(ask.answer, {
      signal,
      timeoutMs: 2 * getConnectionTimeoutMs(),
      serverName: row.name,
      context: "MCP tool check",
    });
  } catch (error) {
    clearPendingAsk(ctx, ask);
    if (isAbortError(error)) throw error;
    if (!ask.hasAnswered || error instanceof ListingCheckAbortError) {
      let failureText = ask.hasAnswered ? errorMessage(error) : "the server did not answer in time";
      return refuseByListingCheck(
        ctx,
        ask,
        "not_compared",
        `${listingCheckFailedMessage(row, toolName, failureText)} Try the call again.`,
      );
    }
    return refuseByListingCheck(
      ctx,
      ask,
      "not_compared",
      error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
        ? errorMessage(error)
        : listingCheckFailedMessage(row, toolName, describeListingFailure(error, row)),
    );
  }
  if (ctx.isHandshakeHanded && result.hasOtherHandshake)
    return refuseByListingCheck(
      ctx,
      ask,
      "handshake",
      `MCP server "${row.name}" does not match what Claude Code was given at start-up (in its capabilities, name, version or instructions), so the call was not made. ${CALL_AGAIN_HINT}`,
    );
  let handedTool = result.tools.get(toolName);
  if (handedTool === undefined && result.mayListMore)
    return refuseByListingCheck(
      ctx,
      ask,
      "not_compared",
      `${listingCheckFailedMessage(row, toolName, "the server's list could not be matched tool by tool")} ${CALL_AGAIN_HINT}`,
    );
  if (!handedByName.has(toolName))
    return refuseByListingCheck(
      ctx,
      ask,
      "not_compared",
      `${listingCheckFailedMessage(row, toolName, "the list given at start-up could not be matched tool by tool")} ${CALL_AGAIN_HINT}`,
    );
  if (handedTool === undefined)
    return refuseByListingCheck(
      ctx,
      ask,
      "tool_gone",
      `MCP server "${row.name}" no longer offers the tool "${toolName}", so the call was not made.`,
    );
  if (!deepEqualIgnoringUndefined(handedTool, handedByName.get(toolName)))
    return refuseByListingCheck(
      ctx,
      ask,
      "tool_differs",
      `MCP server "${row.name}" lists the tool "${toolName}" differently from the definition that Claude Code was given at start-up, so the call was not made. ${CALL_AGAIN_HINT}`,
    );
  logFeatureOk("mcp_handed_listing_check");
  passed.add(toolName);
  return;
}
//@ chunk-nkjcc801.js:4018-4137 placement
function startListingCheck(ctx, toolUseId) {
  let ask = {
    answer: logHandedListingCheck(ctx, toolUseId),
    hasAnswered: false,
  };
  ask.answer
    .finally(() => {
      ask.hasAnswered = true;
    })
    .catch(() => {});
  return ask;
}
//@ chunk-nkjcc801.js:4137-4787 placement
async function logHandedListingCheck({ row, dialer, isHandshakeHanded }, toolUseId) {
  let freshConnection = await dialer.ensureConnectedClient(row, {
    context: "MCP tool call",
    toolUseId,
  });
  let instructionsDiffer = freshConnection.instructions !== row.instructions;
  if (isHandshakeHanded && instructionsDiffer)
    logFeatureSad("mcp_handed_listing_check", "instructions_differ");
  let handshakeDiffers =
    !deepEqualIgnoringUndefined(freshConnection.capabilities, row.capabilities) ||
    freshConnection.serverInfo?.name !== row.serverInfo?.name ||
    freshConnection.serverInfo?.version !== row.serverInfo?.version;
  if (isHandshakeHanded && handshakeDiffers) logFeatureSad("mcp_handed_listing_check", "handshake_differs");
  let listing = await dialer
    .listToolsRaw(freshConnection.client, {
      timeout: getConnectionTimeoutMs(),
    })
    .catch((error) => {
      if (isAbortError(error)) throw error;
      throw new ListingCheckAbortError(describeListingFailure(error, row));
    });
  let isDeliverable = isDeliverableToolsList(listing.tools);
  return {
    tools: new Map(isDeliverable ? listing.tools.map((tool) => [tool.name, tool]) : []),
    mayListMore: listing.nextCursor !== undefined || !isDeliverable,
    hasOtherHandshake: instructionsDiffer || handshakeDiffers,
  };
}
//@ chunk-nkjcc801.js:4787-4829 placement
/**
 * 若 ask 标记正是给定值就清掉。
 */
function clearPendingAsk(ctx, ask) {
  if (ctx.ask === ask) ctx.ask = undefined;
}
//@ chunk-nkjcc801.js:4829-4933 placement
function refuseByListingCheck(ctx, ask, reason, message) {
  clearPendingAsk(ctx, ask);
  if (reason !== "handshake") logFeatureSad("mcp_handed_listing_check", reason);
  logMCPDebug(ctx.row.name, message);
  return message;
}
//@ chunk-nkjcc801.js:4933-5072 placement
function listingCheckFailedMessage(row, toolName, reason) {
  return `The tool "${toolName}" could not be checked against what MCP server "${row.name}" lists (${reason}), so the call was not made.`;
}
//@ chunk-nkjcc801.js:5072-5134 placement
/**
 * 生成清单检查失败的描述文本（脱敏）。
 */
function describeListingFailure(error, row) {
  return normalizeMcpServerName(
    redactMcpErrorDetail(row.name, row.config, describeConnectError(error, row.config)),
  );
}
export { wrapHandedListingChecks };
