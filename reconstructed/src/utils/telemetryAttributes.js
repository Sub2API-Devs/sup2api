/**
 * utils/telemetryAttributes.ts
 *
 * OTel 公共属性：user.id、session.id、app.version、组织/账户、OTEL_RESOURCE_ATTRIBUTES。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetryAttributes.ts
 * pieces: chunk-p52gp8zk.js (3)
 * attribution: file-last-pair 1, layout 1, fingerprint 1
 */
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getOrCreateUserID } from "./config.js";
import { getSessionId, isDiskless } from "../bootstrap/state.js";
import {
  gatewayIdentityAttributes,
  isOtelMetricsAttributeEnabled,
} from "./telemetry/gatewayIdentityAttributes.js";
import { env } from "./env.js";
import { getEntrypointKind } from "./entrypointKinds.js";
import {
  VCS_REPOSITORY_URL_FULL,
  repositoryAttributesPromise,
  otelMetricsIncludeDefaults,
  remoteSessionAttributes,
} from "./telemetry/repositoryAttributes.js";
import { getAuthenticatedAccountInfo, getOauthAccountInfo } from "./auth.js";
import { hasRemoteOtelLogsEndpoint } from "./telemetry/otlpRelay.js";
import { connectorScopedAgentId } from "../skills/bundled/scheduleRemoteAgents.js";
import { NON_INTERACTIVE_TERMINAL, envDynamicProbe } from "./envDynamic.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-p52gp8zk.js:2638-2759 file-last-pair
function shouldIncludeAttribute(envVar) {
  for (let idx = 0; idx < envVar.length; idx++) {
    let code = envVar.charCodeAt(idx);
    if (code < 33 || code === 44 || code === 59 || code === 92 || code > 126) return false;
  }
  return true;
}
//@ chunk-p52gp8zk.js:2759-3163 layout
var MAX_RESOURCE_ATTRIBUTE_LENGTH; // deferred: uses shouldIncludeAttribute of its import cycle while loading; runs once the cycle is complete
var parseResourceAttributes;
deferInit("chunk-p52gp8zk.js:2759", () => {
  MAX_RESOURCE_ATTRIBUTE_LENGTH = 255;
  parseResourceAttributes = memoizeAlias((spec) => {
    if (!spec) return {};
    let result = {};
    try {
      for (let pair of spec.split(",")) {
        let [keyPart, valuePart, ...extraParts] = pair.split("=");
        if (keyPart === undefined || valuePart === undefined || extraParts.length > 0) continue;
        let envVar = keyPart.trim();
        let envVar_2 = valuePart.trim().split(/^"|"$/).join("");
        if (
          envVar.length === 0 ||
          envVar.length > MAX_RESOURCE_ATTRIBUTE_LENGTH ||
          !shouldIncludeAttribute(envVar)
        )
          throw Error("invalid resource attribute key");
        if (envVar_2.length > MAX_RESOURCE_ATTRIBUTE_LENGTH || !shouldIncludeAttribute(envVar_2))
          throw Error("invalid resource attribute value");
        result[envVar] = decodeURIComponent(envVar_2);
      }
    } catch {
      return {};
    }
    return result;
  });
});
//@ chunk-p52gp8zk.js:3163-4749 fingerprint = getTelemetryAttributes (0.672)
/**
 * OTel 公共属性：user.id、session.id（OTEL_METRICS_INCLUDE_SESSION_ID）、app.version（OTEL_METRICS_INCLUDE_VERSION）、organization.id、user.email、user.account_uuid、terminal.type 及 OTEL_RESOURCE_ATTRIBUTES。
 */
function getTelemetryAttributes() {
  let userId = getOrCreateUserID();
  let sessionId = getSessionId();
  let identityAttrs = gatewayIdentityAttributes();
  let hasIdentity = Object.keys(identityAttrs).length > 0;
  let attributes = {};
  let resourceAttributes = parseResourceAttributes(env.OTEL_RESOURCE_ATTRIBUTES);
  if (isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES"))
    for (let [key, value] of Object.entries(resourceAttributes)) {
      if (hasIdentity && (key.startsWith("user.") || key.startsWith("identity."))) continue;
      attributes[key] = value;
    }
  attributes["user.id"] = userId;
  if (isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_SESSION_ID")) {
    attributes["session.id"] = sessionId;
    if (env.CLAUDE_CODE_REMOTE_SESSION_ID) attributes["ccr.session.id"] = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  }
  if (isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_VERSION"))
    attributes["app.version"] = {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION;
  if (isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_ENTRYPOINT")) {
    let oauthAccount = getEntrypointKind();
    if (oauthAccount) attributes["app.entrypoint"] = oauthAccount;
  }
  if (isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_REPOSITORY")) {
    let attributes_2 =
      resourceAttributes[VCS_REPOSITORY_URL_FULL] === undefined
        ? repositoryAttributesPromise().attributes
        : undefined;
    for (let otelMetricsIncludeDefault of otelMetricsIncludeDefaults) {
      let gatewayAttributes =
        resourceAttributes[otelMetricsIncludeDefault] ?? attributes_2?.[otelMetricsIncludeDefault];
      if (gatewayAttributes) attributes[otelMetricsIncludeDefault] = gatewayAttributes;
    }
  }
  let userAttributes = getAuthenticatedAccountInfo() ?? getOauthAccountInfo() ?? remoteSessionAttributes();
  if (userAttributes) {
    let orgId = userAttributes.organizationUuid;
    let sessionAttributes = !isDiskless()
      ? userAttributes.emailAddress
      : hasRemoteOtelLogsEndpoint()
        ? env.CLAUDE_CODE_USER_EMAIL
        : undefined;
    let accountUuid = userAttributes.accountUuid;
    if (orgId) attributes["organization.id"] = orgId;
    if (sessionAttributes) attributes["user.email"] = sessionAttributes;
    if (accountUuid && isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_ACCOUNT_UUID")) {
      attributes["user.account_uuid"] = accountUuid;
      let mergedAttributes = env.CLAUDE_CODE_ACCOUNT_TAGGED_ID || connectorScopedAgentId("user", accountUuid);
      if (mergedAttributes) attributes["user.account_id"] = mergedAttributes;
    }
  }
  Object.assign(attributes, identityAttrs);
  let attributeEntry = isDiskless() ? NON_INTERACTIVE_TERMINAL : envDynamicProbe.terminal;
  if (attributeEntry) attributes["terminal.type"] = attributeEntry;
  return attributes;
}
export { getTelemetryAttributes, parseResourceAttributes };
