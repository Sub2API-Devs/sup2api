/**
 * utils/telemetry/repositoryAttributes.ts
 *
 * 2.1.316 新增：仓库与代理遥测属性
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p52gp8zk.js (13)
 * attribution: placement 13
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { getRemoteUrlForBridge, normalizeGitRemoteUrl } from "../git.js";
import { logError } from "../log.js";
import { portlessHost, getGitHostKind, GIT_HOST_NAME_BY_KIND } from "../gitHosts.js";
import { isOtelMetricsAttributeEnabled } from "./gatewayIdentityAttributes.js";
import { parseResourceAttributes } from "../telemetryAttributes.js";
import { env } from "../env.js";
import { getSessionIngressAuthToken } from "../sessionIngressAuth.js";
import { decodeJwtPayload } from "../../bridge/jwtUtils.js";
import { isTracesRelayed } from "./otlpRelay.js";
import { isMainAgent } from "../agentContext.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_api } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-p52gp8zk.js:2099-2559 placement
/**
 * OTel 指标默认包含项开关表与 VCS 语义属性名、常用托管域名与 7999 端口 SSH 模式。
 */
var OTEL_METRICS_INCLUDE_DEFAULTS = {
  OTEL_METRICS_INCLUDE_SESSION_ID: true,
  OTEL_METRICS_INCLUDE_VERSION: false,
  OTEL_METRICS_INCLUDE_ACCOUNT_UUID: true,
  OTEL_METRICS_INCLUDE_ENTRYPOINT: false,
  OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES: true,
  OTEL_METRICS_INCLUDE_REPOSITORY: false,
};
var VCS_REPOSITORY_URL_FULL = "vcs.repository.url.full";
var VCS_REPOSITORY_NAME = "vcs.repository.name";
var VCS_OWNER_NAME = "vcs.owner.name";
var VCS_PROVIDER_NAME = "vcs.provider.name";
var VCS_REF_HEAD_REVISION = "vcs.ref.head.revision";
var VCS_REF_HEAD_NAME = "vcs.ref.head.name";
var VCS_REF_HEAD_TYPE = "vcs.ref.head.type";
var otelMetricsIncludeDefaults = [
  VCS_REPOSITORY_URL_FULL,
  VCS_OWNER_NAME,
  VCS_REPOSITORY_NAME,
  VCS_PROVIDER_NAME,
];
var GITEA_COM = "gitea.com";
var VCS_ATTRIBUTE_NAMES = /^ssh:\/\/[^/?#]*:7999(?=[/?#]|$)/i;
//@ chunk-p52gp8zk.js:4749-4804 placement
var repositoryAttributesByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p52gp8zk.js:4749", () => {
  repositoryAttributesByHost = new HostScoped(() => ({
    settled: undefined,
    attributes: undefined,
  }));
});
//@ chunk-p52gp8zk.js:4804-4943 placement
function repositoryAttributesPromise() {
  let state = repositoryAttributesByHost.of(getRootSession().host);
  if (state.settled === undefined && !isRemoteSessionAvailable())
    state.settled = getRemoteUrlForBridge()
      .then((remoteUrlForBridge) => {
        state.attributes = remoteUrlForBridge ? repositoryUrlAttribute(remoteUrlForBridge) : undefined;
      })
      .catch(logError);
  return state;
}
//@ chunk-p52gp8zk.js:4943-5727 placement
function repositoryUrlAttribute(remoteUrlForBridge) {
  let queryIndex = remoteUrlForBridge.search(/[?#]/);
  if (queryIndex >= 0 && remoteUrlForBridge.includes("@", queryIndex)) return;
  let normalized = normalizeGitRemoteUrl(
    (queryIndex >= 0 ? remoteUrlForBridge.slice(0, queryIndex) : remoteUrlForBridge).replace(/\/+$/, ""),
  );
  if (!normalized) return;
  let [host = "", ...pathParts] = normalized.split("/");
  let hostName = portlessHost(host);
  let filtered = pathParts.filter((part) => part.length > 0);
  let last = filtered.at(-1);
  if (
    !hostName ||
    !last ||
    hostName.includes("@") ||
    (hostName.includes(":") && !/^\[[0-9a-f:.]+\]$/i.test(hostName)) ||
    filtered.some((part_2) => part_2.includes("@"))
  )
    return;
  let gitHostKind = getGitHostKind(hostName);
  let hostNameForUrl = gitHostKind === "other" ? hostName : GIT_HOST_NAME_BY_KIND[gitHostKind];
  let providerName =
    gitHostKind !== "other" ? gitHostKind : hostNameForUrl === GITEA_COM ? "gitea" : undefined;
  let scmIndex = filtered.length - 3;
  let hasScmSegment = providerName === undefined && scmIndex >= 0 && filtered[scmIndex] === "scm";
  let pathPartsWithoutScm = hasScmSegment
    ? [...filtered.slice(0, scmIndex), ...filtered.slice(scmIndex + 1)]
    : filtered;
  let sliced = pathPartsWithoutScm.slice(0, -1);
  let last_2 = sliced.at(-1);
  if (
    providerName === undefined &&
    last_2 !== undefined &&
    (hasScmSegment || VCS_ATTRIBUTE_NAMES.test(remoteUrlForBridge.trim()))
  ) {
    let bitbucketPath = [...sliced.slice(0, -1), "projects", last_2, "repos", last];
    return {
      [VCS_REPOSITORY_URL_FULL]: `https://${hostNameForUrl}/${bitbucketPath.join("/")}`,
      [VCS_OWNER_NAME]: last_2,
      [VCS_REPOSITORY_NAME]: last,
      [VCS_PROVIDER_NAME]: "bitbucket",
    };
  }
  return {
    [VCS_REPOSITORY_URL_FULL]: `https://${hostNameForUrl}/${pathPartsWithoutScm.join("/")}`,
    ...(sliced.length > 0 && {
      [VCS_OWNER_NAME]: sliced.join("/"),
    }),
    [VCS_REPOSITORY_NAME]: last,
    ...(providerName !== undefined && {
      [VCS_PROVIDER_NAME]: providerName,
    }),
  };
}
//@ chunk-p52gp8zk.js:5727-5816 placement
function commitAttributes({ commitId, branch }) {
  return {
    [VCS_REF_HEAD_REVISION]: commitId,
    ...(branch !== undefined && {
      [VCS_REF_HEAD_NAME]: branch,
      [VCS_REF_HEAD_TYPE]: "branch",
    }),
  };
}
//@ chunk-p52gp8zk.js:5816-5938 placement
async function initRepositoryAttributes() {
  if (
    isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_REPOSITORY") &&
    parseResourceAttributes(env.OTEL_RESOURCE_ATTRIBUTES)[VCS_REPOSITORY_URL_FULL] === undefined
  )
    await repositoryAttributesPromise().settled;
}
//@ chunk-p52gp8zk.js:5938-5987 placement
var remoteSessionStateByHost; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p52gp8zk.js:5938", () => {
  remoteSessionStateByHost = new HostScoped(() => ({
    token: undefined,
    identity: null,
  }));
});
//@ chunk-p52gp8zk.js:5987-6446 placement
function remoteSessionAttributes() {
  if (!env.CLAUDE_CODE_REMOTE_SESSION_ID) return null;
  let sessionIngressAuthToken = getSessionIngressAuthToken();
  if (!sessionIngressAuthToken) return null;
  let state = remoteSessionStateByHost.of(getRootSession().host);
  if (sessionIngressAuthToken === state.token) return state.identity;
  state.token = sessionIngressAuthToken;
  let claims = decodeJwtPayload(sessionIngressAuthToken.replace(/^sk-ant-[a-z0-9]+-/, ""));
  if (typeof claims !== "object" || claims === null) return (state.identity = null);
  let payload = claims;
  let nonEmpty = (value) => (typeof value === "string" && value.length > 0 ? value : undefined);
  let act = payload.act ?? {};
  return (state.identity = {
    organizationUuid: nonEmpty(payload.organization_uuid),
    accountUuid: nonEmpty(payload.account_uuid),
    emailAddress: nonEmpty(payload.account_email) ?? nonEmpty(act.email),
  });
}
//@ chunk-p52gp8zk.js:6446-6622 placement
var AGENT_ID_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HEX4;
var UUID_PATTERN;
var regExp;
deferInit("chunk-p52gp8zk.js:6446", () => {
  AGENT_ID_RE = /^a(?:[\w-]{1,63}-)?([0-9a-f]{16})$/;
  HEX4 = String.raw`[0-9a-f]{4}`;
  UUID_PATTERN = String.raw`[0-9a-f]{8}-${HEX4}-${HEX4}-${HEX4}-[0-9a-f]{12}`;
  regExp = new RegExp(String.raw`^(?:hook-agent-)?${UUID_PATTERN}$`);
});
//@ chunk-p52gp8zk.js:6622-6697 placement
function relayedAgentId(agentId) {
  let match = AGENT_ID_RE.exec(agentId);
  let fallback = regExp.test(agentId) ? agentId : undefined;
  return match ? `a${match[1]}` : fallback;
}
//@ chunk-p52gp8zk.js:6697-6733 placement
function relayedId(value) {
  return isTracesRelayed() ? relayedAgentId(value) : value;
}
//@ chunk-p52gp8zk.js:6733-6884 placement
function agentAttributes(agentContext) {
  if (!agentContext || isMainAgent(agentContext)) return {};
  let agentId = relayedAgentId(agentContext.agentId);
  let parentAgentId = relayedAgentId(agentContext.parentAgentId ?? "");
  return {
    ...(agentId !== undefined && {
      agent_id: agentId,
    }),
    ...(parentAgentId !== undefined && {
      parent_agent_id: parentAgentId,
    }),
  };
}
//@ chunk-p52gp8zk.js:6884-6901 placement
var otelApi_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p52gp8zk.js:6884", () => {
  otelApi_3 = __toESM(require_api(), 1);
});
export {
  relayedId,
  agentAttributes,
  initRepositoryAttributes,
  commitAttributes,
  OTEL_METRICS_INCLUDE_DEFAULTS,
  VCS_REPOSITORY_URL_FULL,
  repositoryAttributesPromise,
  otelMetricsIncludeDefaults,
  remoteSessionAttributes,
  otelApi_3,
};
