/**
 * utils/teleport/cloudLaunch.ts
 *
 * 2.1.316 新增：云会话启动
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { printableName } from "../printableName.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1953413-1955101 placement
/**
 * 云会话 --tools 相关拒绝文案组：空列表、Remote Control 环境、自托管环境、未知环境。
 */
var CLOUD_LAUNCH_TOOL_ERRORS_2; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var BRIDGE_ENV_TOOLS_REFUSAL;
var SELF_HOSTED_ENV_TOOLS_REFUSAL;
var SELF_HOSTED_POOL_TOOLS_REFUSAL;
var UNKNOWN_ENV_TOOLS_REFUSAL;
var CLOUD_LAUNCH_TOOL_ERRORS;
var DEVICE_BIND_REFUSAL_REASONS;
var cloudLaunchErrorSchema;
deferInit("chunk-5xgkngpb.js:1953413", () => {
  CLOUD_LAUNCH_TOOL_ERRORS_2 =
    "The cloud session was not started: an empty --tools list asks for no built-in tools, which cloud sessions don't support yet. List the tools to keep, or leave --tools out.";
  BRIDGE_ENV_TOOLS_REFUSAL =
    "The cloud session was not started: --tools is not supported in a Remote Control environment. Leave --tools out, or use an Anthropic-hosted environment: choose one with /remote-env in claude, and drop any flag that names another.";
  SELF_HOSTED_ENV_TOOLS_REFUSAL =
    "The cloud session was not started: --tools does not work yet with the self-hosted environment that this session would use. Leave --tools out, or use an Anthropic-hosted environment: choose one with /remote-env in claude, and drop any flag that names another.";
  SELF_HOSTED_POOL_TOOLS_REFUSAL =
    "The cloud session was not started: this launch needs a session that is attached to this computer, and a session in the self-hosted environment that it would use cannot be attached. Use an Anthropic-hosted environment: choose one with /remote-env in claude.";
  UNKNOWN_ENV_TOOLS_REFUSAL =
    "The cloud session was not started: this version of Claude Code cannot tell whether the session's environment would apply a --tools list. Leave --tools out, or use an Anthropic-hosted environment: choose one with /remote-env in claude, and drop any flag that names another.";
  CLOUD_LAUNCH_TOOL_ERRORS =
    "The cloud session was not started: this command cannot start a session attached to this computer with both --tools and a prompt. Leave --tools out, or keep tools out with --disallowed-tools.";
  DEVICE_BIND_REFUSAL_REASONS =
    "The cloud session was not started: limiting a cloud session to the tools you list with --tools is not available for your organization. Leave --tools out, or keep tools out with --disallowed-tools.";
  cloudLaunchErrorSchema = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        reason: literal("builtin_tools_unavailable"),
      }),
    }),
  );
});
//@ chunk-5xgkngpb.js:1955101-1955150 placement
function isCloudLaunchError(value) {
  return cloudLaunchErrorSchema().safeParse(value).success;
}
//@ chunk-5xgkngpb.js:1955150-1955218 placement
function isDeduplicatedCreateResponse(responseData) {
  return objectSchema({
    deduplicated: literal(true),
  }).safeParse(responseData).success;
}
//@ chunk-5xgkngpb.js:1955218-1955251 placement
function printableSessionUrl(sessionUrl) {
  return printableName(sessionUrl, 200);
}
//@ chunk-5xgkngpb.js:1955251-1955531 placement
function duplicateSessionMessage(result) {
  return `No new cloud session was started: the service answered with a session it had already created for this request.${result.promptHeld ? " Your prompt was not sent." : ""} That session was left as it is. Look at it before you run the command again: ${printableSessionUrl(result.sessionUrl)}`;
}
//@ chunk-5xgkngpb.js:1955531-1955830 placement
function classifyPromptSendResult(result) {
  if (result.ok)
    return {
      kind: "sent",
    };
  if (result.status === undefined)
    return {
      kind:
        result.cause === "server" || result.cause === "timeout" || result.cause === "network"
          ? "busy"
          : "unsent",
      reason: result.reason,
    };
  if (result.status >= 200 && result.status < 300)
    return {
      kind: "sent",
    };
  return {
    kind: result.status === 408 || result.status === 429 ? "busy" : "refused",
    reason: result.reason,
  };
}
//@ chunk-5xgkngpb.js:1955830-1956459 placement
function archiveCloudSession(options, archiveResult) {
  let replaced = printableName(options.reason, 400).replace(/\.$/, "");
  let reasonText = replaced === "" ? "" : `: ${replaced}`;
  let archiveText = archiveResult.archived
    ? "The session was archived"
    : `The session could not be archived (archive it at ${printableSessionUrl(archiveResult.sessionUrl)})`;
  let retryHint = /^HTTP \d{3}$/.test(replaced)
    ? " Run the command again with --debug to record the service's full answer in the debug log."
    : "";
  return `The cloud session was created, but ${
    {
      busy: `the service was busy or could not be reached while your prompt was being sent${reasonText}. ${archiveText}; run the command again in a moment.`,
      refused: `the service refused your prompt${reasonText}. ${archiveText}.${retryHint}`,
      unsent: `your prompt could not be sent from this machine${reasonText}. ${archiveText}.${retryHint}`,
    }[options.kind]
  }`;
}
//@ chunk-5xgkngpb.js:1956459-1956785 placement
/**
 * 按环境类型返回不支持的启动结果与说明；Anthropic 云环境返回 null。
 */
function unsupportedEnvironmentOutcome(kind, allowsSelfHosted) {
  switch (kind) {
    case "anthropic_cloud":
      return null;
    case "bridge":
      return {
        outcome: "bridge_environment",
        message: BRIDGE_ENV_TOOLS_REFUSAL,
      };
    case "self_hosted_pool":
      return allowsSelfHosted
        ? {
            outcome: "self_hosted_pool",
            message: SELF_HOSTED_POOL_TOOLS_REFUSAL,
          }
        : null;
    case "byoc":
      return {
        outcome: "self_hosted_environment",
        message: SELF_HOSTED_ENV_TOOLS_REFUSAL,
      };
    default:
      return {
        outcome: "unknown_environment",
        message: UNKNOWN_ENV_TOOLS_REFUSAL,
      };
  }
}
//@ chunk-5xgkngpb.js:1956785-1956935 placement
function logBuiltinToolsCreate(outcome, selfHostedPool = false) {
  if (outcome === "created")
    logFeatureOk("cloud_builtin_tools_create", {
      self_hosted_pool: selfHostedPool,
    });
  else
    logFeatureBad("cloud_builtin_tools_create", outcome, {
      self_hosted_pool: selfHostedPool,
    });
}
//@ chunk-5xgkngpb.js:1956935-1956968 placement
var X_TRUSTED_DEVICE_TOKEN = "X-Trusted-Device-Token";
export {
  X_TRUSTED_DEVICE_TOKEN,
  isDeduplicatedCreateResponse,
  logBuiltinToolsCreate,
  duplicateSessionMessage,
  classifyPromptSendResult,
  archiveCloudSession,
  unsupportedEnvironmentOutcome,
  isCloudLaunchError,
  CLOUD_LAUNCH_TOOL_ERRORS_2,
  CLOUD_LAUNCH_TOOL_ERRORS,
  DEVICE_BIND_REFUSAL_REASONS,
};
