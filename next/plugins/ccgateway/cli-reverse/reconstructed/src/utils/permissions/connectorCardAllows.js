/**
 * utils/permissions/connectorCardAllows.ts
 *
 * 连接器卡片授权的会话集合：加入/移出与状态裁剪（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vq9w1gev.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isRemoteCowork, isCcsRemoteCowork } from "../entrypointKinds.js";
import { getRemoteFlagOverrideState } from "./yoloClassifier.js";
import { getToolNameForPermissionCheck } from "../../services/mcp/mcpStringUtils.js";

//@ chunk-vq9w1gev.js:303-330 placement
var TENGU_HAZEL_SLUICE = "tengu_hazel_sluice";
//@ chunk-vq9w1gev.js:330-379 placement
/**
 * 连接器卡片授权特性是否开启。
 */
function isCoworkCardMode() {
  return (isRemoteCowork() || isCcsRemoteCowork()) && getRemoteFlagOverrideState(TENGU_HAZEL_SLUICE) === "on";
}
//@ chunk-vq9w1gev.js:379-806 placement
/**
 * 本次调用带有会话级 allow 规则时，把该连接器工具记入卡片授权集合。
 */
function recordConnectorCardAllow(context, tool, applied) {
  if (tool.mcpInfo === undefined || applied.length === 0 || !isCoworkCardMode()) return;
  let toolNameForPermissionCheck = getToolNameForPermissionCheck(tool);
  if (
    !applied.some(
      (applied) =>
        applied.type === "addRules" &&
        applied.behavior === "allow" &&
        applied.destination === "session" &&
        applied.rules.some(
          (rule) => rule.toolName === toolNameForPermissionCheck && rule.ruleContent === undefined,
        ),
    )
  )
    return;
  context.setSessionToolPermissionContext((ctx) =>
    ctx.alwaysAllowRules.session?.includes(toolNameForPermissionCheck) !== true ||
    ctx.connectorCardAllows?.has(toolNameForPermissionCheck) === true
      ? ctx
      : {
          ...ctx,
          connectorCardAllows: new Set([...(ctx.connectorCardAllows ?? []), toolNameForPermissionCheck]),
        },
  );
}
//@ chunk-vq9w1gev.js:806-925 placement
/**
 * 按工具权限上下文裁掉已不再需要的卡片授权。
 */
function withClearedCardAllows(state) {
  let toolPermissionContext = clearConnectorCardAllows(state.toolPermissionContext);
  return toolPermissionContext === state.toolPermissionContext
    ? state
    : {
        ...state,
        toolPermissionContext,
      };
}
//@ chunk-vq9w1gev.js:925-1127 placement
/**
 * 从上下文里移除某个（或全部）卡片授权。
 */
function clearConnectorCardAllows(permissionContext, toolName) {
  let connectorCardAllows = permissionContext.connectorCardAllows;
  if (connectorCardAllows === undefined || (toolName !== undefined && !connectorCardAllows.has(toolName)))
    return permissionContext;
  let remaining = new Set(toolName === undefined ? [] : connectorCardAllows);
  if (toolName !== undefined) remaining.delete(toolName);
  return {
    ...permissionContext,
    connectorCardAllows: remaining.size === 0 ? undefined : remaining,
  };
}
export { clearConnectorCardAllows, withClearedCardAllows, recordConnectorCardAllow, isCoworkCardMode };
