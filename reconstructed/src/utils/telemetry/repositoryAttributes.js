/**
 * utils/telemetry/repositoryAttributes.ts
 *
 * 2.1.316 新增：仓库与代理遥测属性
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p52gp8zk.js (12)
 * attribution: placement 12
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { getRemoteUrlForBridge, normalizeGitRemoteUrl } from "../git.js";
import { logError } from "../log.js";
import { portlessHost, getGitHostKind, GIT_HOST_NAME_BY_KIND } from "../gitHosts.js";
import {
  GITEA_COM,
  VCS_ATTRIBUTE_NAMES,
  VCS_REPOSITORY_URL_FULL,
  VCS_OWNER_NAME,
  VCS_REPOSITORY_NAME,
  VCS_PROVIDER_NAME,
  VCS_REF_HEAD_REVISION,
  VCS_REF_HEAD_NAME,
  VCS_REF_HEAD_TYPE,
  isOtelMetricsAttributeEnabled,
} from "./gatewayIdentityAttributes.js";
import { parseResourceAttributes } from "../telemetryAttributes.js";
import { env } from "../env.js";
import { getSessionIngressAuthToken } from "../sessionIngressAuth.js";
import { decodeJwtPayload } from "../../bridge/jwtUtils.js";
import { isTracesRelayed } from "./otlpRelay.js";
import { isMainAgent } from "../agentContext.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_api } from "../../../vendor/@opentelemetry/api/build/src/index.js";

//@ chunk-p52gp8zk.js:4749-4804 placement
var repositoryAttributesByHost = new HostScoped(() => ({
  settled: undefined,
  attributes: undefined,
}));
//@ chunk-p52gp8zk.js:4804-4943 placement
function repositoryAttributesPromise() {
  let e = repositoryAttributesByHost.of(getRootSession().host);
  if (e.settled === undefined && !isRemoteSessionAvailable())
    e.settled = getRemoteUrlForBridge()
      .then((remoteUrlForBridge) => {
        e.attributes = remoteUrlForBridge ? repositoryUrlAttribute(remoteUrlForBridge) : undefined;
      })
      .catch(logError);
  return e;
}
//@ chunk-p52gp8zk.js:4943-5727 placement
function repositoryUrlAttribute(remoteUrlForBridge) {
  let n = remoteUrlForBridge.search(/[?#]/);
  if (n >= 0 && remoteUrlForBridge.includes("@", n)) return;
  let o = normalizeGitRemoteUrl(
    (n >= 0 ? remoteUrlForBridge.slice(0, n) : remoteUrlForBridge).replace(/\/+$/, ""),
  );
  if (!o) return;
  let [r = "", ...s] = o.split("/");
  let c = portlessHost(r);
  let filtered = s.filter((w) => w.length > 0);
  let last = filtered.at(-1);
  if (
    !c ||
    !last ||
    c.includes("@") ||
    (c.includes(":") && !/^\[[0-9a-f:.]+\]$/i.test(c)) ||
    filtered.some((w) => w.includes("@"))
  )
    return;
  let gitHostKind = getGitHostKind(c);
  let y = gitHostKind === "other" ? c : GIT_HOST_NAME_BY_KIND[gitHostKind];
  let m = gitHostKind !== "other" ? gitHostKind : y === GITEA_COM ? "gitea" : undefined;
  let E = filtered.length - 3;
  let g = m === undefined && E >= 0 && filtered[E] === "scm";
  let T = g ? [...filtered.slice(0, E), ...filtered.slice(E + 1)] : filtered;
  let sliced = T.slice(0, -1);
  let last_2 = sliced.at(-1);
  if (m === undefined && last_2 !== undefined && (g || VCS_ATTRIBUTE_NAMES.test(remoteUrlForBridge.trim()))) {
    let w = [...sliced.slice(0, -1), "projects", last_2, "repos", last];
    return {
      [VCS_REPOSITORY_URL_FULL]: `https://${y}/${w.join("/")}`,
      [VCS_OWNER_NAME]: last_2,
      [VCS_REPOSITORY_NAME]: last,
      [VCS_PROVIDER_NAME]: "bitbucket",
    };
  }
  return {
    [VCS_REPOSITORY_URL_FULL]: `https://${y}/${T.join("/")}`,
    ...(sliced.length > 0 && {
      [VCS_OWNER_NAME]: sliced.join("/"),
    }),
    [VCS_REPOSITORY_NAME]: last,
    ...(m !== undefined && {
      [VCS_PROVIDER_NAME]: m,
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
var remoteSessionStateByHost = new HostScoped(() => ({
  token: undefined,
  identity: null,
}));
//@ chunk-p52gp8zk.js:5987-6446 placement
function remoteSessionAttributes() {
  if (!env.CLAUDE_CODE_REMOTE_SESSION_ID) return null;
  let sessionIngressAuthToken = getSessionIngressAuthToken();
  if (!sessionIngressAuthToken) return null;
  let n = remoteSessionStateByHost.of(getRootSession().host);
  if (sessionIngressAuthToken === n.token) return n.identity;
  n.token = sessionIngressAuthToken;
  let o = decodeJwtPayload(sessionIngressAuthToken.replace(/^sk-ant-[a-z0-9]+-/, ""));
  if (typeof o !== "object" || o === null) return (n.identity = null);
  let r = o;
  let s = (u) => (typeof u === "string" && u.length > 0 ? u : undefined);
  let act = r.act ?? {};
  return (n.identity = {
    organizationUuid: s(r.organization_uuid),
    accountUuid: s(r.account_uuid),
    emailAddress: s(r.account_email) ?? s(act.email),
  });
}
//@ chunk-p52gp8zk.js:6446-6622 placement
var AGENT_ID_RE = /^a(?:[\w-]{1,63}-)?([0-9a-f]{16})$/;
var HEX4 = String.raw`[0-9a-f]{4}`;
var UUID_PATTERN = String.raw`[0-9a-f]{8}-${HEX4}-${HEX4}-${HEX4}-[0-9a-f]{12}`;
var regExp = new RegExp(String.raw`^(?:hook-agent-)?${UUID_PATTERN}$`);
//@ chunk-p52gp8zk.js:6622-6697 placement
function relayedAgentId(e) {
  let match = AGENT_ID_RE.exec(e);
  let o = regExp.test(e) ? e : undefined;
  return match ? `a${match[1]}` : o;
}
//@ chunk-p52gp8zk.js:6697-6733 placement
function relayedId(e) {
  return isTracesRelayed() ? relayedAgentId(e) : e;
}
//@ chunk-p52gp8zk.js:6733-6884 placement
function agentAttributes(e) {
  if (!e || isMainAgent(e)) return {};
  let n = relayedAgentId(e.agentId);
  let o = relayedAgentId(e.parentAgentId ?? "");
  return {
    ...(n !== undefined && {
      agent_id: n,
    }),
    ...(o !== undefined && {
      parent_agent_id: o,
    }),
  };
}
//@ chunk-p52gp8zk.js:6884-6901 placement
var otelApi_3 = Re(require_api(), 1);
export {
  relayedId,
  agentAttributes,
  initRepositoryAttributes,
  commitAttributes,
  repositoryAttributesPromise,
  remoteSessionAttributes,
  otelApi_3,
};
