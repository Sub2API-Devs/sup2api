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
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { getOrCreateUserID } from "./config.js";
import { getSessionId, isDiskless } from "../bootstrap/state.js";
import {
  gatewayIdentityAttributes,
  isOtelMetricsAttributeEnabled,
  VCS_REPOSITORY_URL_FULL,
  Pe,
} from "./telemetry/gatewayIdentityAttributes.js";
import { env } from "./env.js";
import { getEntrypointKind } from "./entrypointKinds.js";
import { repositoryAttributesPromise, remoteSessionAttributes } from "./telemetry/repositoryAttributes.js";
import { getAuthenticatedAccountInfo, getOauthAccountInfo } from "./auth.js";
import { hasRemoteOtelLogsEndpoint } from "./telemetry/otlpRelay.js";
import { zbr } from "../skills/bundled/scheduleRemoteAgents.js";
import { NON_INTERACTIVE_TERMINAL, envDynamicProbe } from "./envDynamic.js";

//@ chunk-p52gp8zk.js:2638-2759 file-last-pair
function shouldIncludeAttribute(envVar) {
  for (let n = 0; n < envVar.length; n++) {
    let code = envVar.charCodeAt(n);
    if (code < 33 || code === 44 || code === 59 || code === 92 || code > 126) return !1;
  }
  return !0;
}
//@ chunk-p52gp8zk.js:2759-3163 layout
var MAX_RESOURCE_ATTRIBUTE_LENGTH = 255,
  parseResourceAttributes = io((e) => {
    if (!e) return {};
    let n = {};
    try {
      for (let o of e.split(",")) {
        let [r, s, ...c] = o.split("=");
        if (r === void 0 || s === void 0 || c.length > 0) continue;
        let trimmed = r.trim(),
          joined = s.trim().split(/^"|"$/).join("");
        if (
          trimmed.length === 0 ||
          trimmed.length > MAX_RESOURCE_ATTRIBUTE_LENGTH ||
          !shouldIncludeAttribute(trimmed)
        )
          throw Error("invalid resource attribute key");
        if (joined.length > MAX_RESOURCE_ATTRIBUTE_LENGTH || !shouldIncludeAttribute(joined))
          throw Error("invalid resource attribute value");
        n[trimmed] = decodeURIComponent(joined);
      }
    } catch {
      return {};
    }
    return n;
  });
/**
 * OTel 公共属性：user.id、session.id（OTEL_METRICS_INCLUDE_SESSION_ID）、app.version（OTEL_METRICS_INCLUDE_VERSION）、organization.id、user.email、user.account_uuid、terminal.type 及 OTEL_RESOURCE_ATTRIBUTES。
 */
//@ chunk-p52gp8zk.js:3163-4749 fingerprint = getTelemetryAttributes (0.672)
function getTelemetryAttributes() {
  let userId = getOrCreateUserID(),
    sessionId = getSessionId(),
    o = gatewayIdentityAttributes(),
    r = Object.keys(o).length > 0,
    s = {},
    c = parseResourceAttributes(env.OTEL_RESOURCE_ATTRIBUTES);
  if (isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES"))
    for (let [a, y] of Object.entries(c)) {
      if (r && (a.startsWith("user.") || a.startsWith("identity."))) continue;
      s[a] = y;
    }
  if (((s["user.id"] = userId), isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_SESSION_ID"))) {
    if (((s["session.id"] = sessionId), env.CLAUDE_CODE_REMOTE_SESSION_ID))
      s["ccr.session.id"] = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  }
  if (isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_VERSION"))
    s["app.version"] = {
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
    if (oauthAccount) s["app.entrypoint"] = oauthAccount;
  }
  if (isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_REPOSITORY")) {
    let a = c[VCS_REPOSITORY_URL_FULL] === void 0 ? repositoryAttributesPromise().attributes : void 0;
    for (let y of Pe) {
      let m = c[y] ?? a?.[y];
      if (m) s[y] = m;
    }
  }
  let u = getAuthenticatedAccountInfo() ?? getOauthAccountInfo() ?? remoteSessionAttributes();
  if (u) {
    let orgId = u.organizationUuid,
      y = !isDiskless() ? u.emailAddress : hasRemoteOtelLogsEndpoint() ? env.CLAUDE_CODE_USER_EMAIL : void 0,
      accountUuid = u.accountUuid;
    if (orgId) s["organization.id"] = orgId;
    if (y) s["user.email"] = y;
    if (accountUuid && isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_ACCOUNT_UUID")) {
      s["user.account_uuid"] = accountUuid;
      let E = env.CLAUDE_CODE_ACCOUNT_TAGGED_ID || zbr("user", accountUuid);
      if (E) s["user.account_id"] = E;
    }
  }
  Object.assign(s, o);
  let f = isDiskless() ? NON_INTERACTIVE_TERMINAL : envDynamicProbe.terminal;
  if (f) s["terminal.type"] = f;
  return s;
}

export { getTelemetryAttributes, parseResourceAttributes };
