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
import { wt } from "../../remote/remoteMode.js";
import { getRemoteUrlForBridge, normalizeGitRemoteUrl } from "../git.js";
import { logError } from "../log.js";
import { q1e, getGitHostKind, KIi } from "../gitHosts.js";
import {
  GITEA_COM,
  ke,
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
import { Ol } from "../../../vendor/@opentelemetry/api/build/src/index.js";

//@ chunk-p52gp8zk.js:4749-4804 placement
var Ue = new HostScoped(() => ({ settled: void 0, attributes: void 0 }));
//@ chunk-p52gp8zk.js:4804-4943 placement
function repositoryAttributesPromise() {
  let of = Ue.of(getRootSession().host);
  if (of.settled === void 0 && !wt())
    of.settled = getRemoteUrlForBridge()
      .then((n) => {
        of.attributes = n ? repositoryUrlAttribute(n) : void 0;
      })
      .catch(logError);
  return of;
}
//@ chunk-p52gp8zk.js:4943-5727 placement
function repositoryUrlAttribute(e) {
  let search = e.search(/[?#]/);
  if (search >= 0 && e.includes("@", search)) return;
  let o = normalizeGitRemoteUrl((search >= 0 ? e.slice(0, search) : e).replace(/\/+$/, ""));
  if (!o) return;
  let [r = "", ...s] = o.split("/"),
    c = q1e(r),
    filtered = s.filter((w) => w.length > 0),
    at = filtered.at(-1);
  if (
    !c ||
    !at ||
    c.includes("@") ||
    (c.includes(":") && !/^\[[0-9a-f:.]+\]$/i.test(c)) ||
    filtered.some((w) => w.includes("@"))
  )
    return;
  let a = getGitHostKind(c),
    y = a === "other" ? c : KIi[a],
    m = a !== "other" ? a : y === GITEA_COM ? "gitea" : void 0,
    E = filtered.length - 3,
    g = m === void 0 && E >= 0 && filtered[E] === "scm",
    T = g ? [...filtered.slice(0, E), ...filtered.slice(E + 1)] : filtered,
    sliced = T.slice(0, -1),
    at_2 = sliced.at(-1);
  if (m === void 0 && at_2 !== void 0 && (g || ke.test(e.trim()))) {
    let w = [...sliced.slice(0, -1), "projects", at_2, "repos", at];
    return {
      [VCS_REPOSITORY_URL_FULL]: `https://${y}/${w.join("/")}`,
      [VCS_OWNER_NAME]: at_2,
      [VCS_REPOSITORY_NAME]: at,
      [VCS_PROVIDER_NAME]: "bitbucket",
    };
  }
  return {
    [VCS_REPOSITORY_URL_FULL]: `https://${y}/${T.join("/")}`,
    ...(sliced.length > 0 && { [VCS_OWNER_NAME]: sliced.join("/") }),
    [VCS_REPOSITORY_NAME]: at,
    ...(m !== void 0 && { [VCS_PROVIDER_NAME]: m }),
  };
}
//@ chunk-p52gp8zk.js:5727-5816 placement
function commitAttributes({ commitId: commitId, branch: branch }) {
  return {
    [VCS_REF_HEAD_REVISION]: commitId,
    ...(branch !== void 0 && { [VCS_REF_HEAD_NAME]: branch, [VCS_REF_HEAD_TYPE]: "branch" }),
  };
}
//@ chunk-p52gp8zk.js:5816-5938 placement
async function initRepositoryAttributes() {
  if (
    isOtelMetricsAttributeEnabled("OTEL_METRICS_INCLUDE_REPOSITORY") &&
    parseResourceAttributes(env.OTEL_RESOURCE_ATTRIBUTES)[VCS_REPOSITORY_URL_FULL] === void 0
  )
    await repositoryAttributesPromise().settled;
}
//@ chunk-p52gp8zk.js:5938-5987 placement
var je = new HostScoped(() => ({ token: void 0, identity: null }));
//@ chunk-p52gp8zk.js:5987-6446 placement
function remoteSessionAttributes() {
  if (!env.CLAUDE_CODE_REMOTE_SESSION_ID) return null;
  let e = getSessionIngressAuthToken();
  if (!e) return null;
  let of = je.of(getRootSession().host);
  if (e === of.token) return of.identity;
  of.token = e;
  let o = decodeJwtPayload(e.replace(/^sk-ant-[a-z0-9]+-/, ""));
  if (typeof o !== "object" || o === null) return (of.identity = null);
  let r = o,
    s = (u) => (typeof u === "string" && u.length > 0 ? u : void 0),
    c = r.act ?? {};
  return (of.identity = {
    organizationUuid: s(r.organization_uuid),
    accountUuid: s(r.account_uuid),
    emailAddress: s(r.account_email) ?? s(c.email),
  });
}
//@ chunk-p52gp8zk.js:6446-6622 placement
var AGENT_ID_RE = /^a(?:[\w-]{1,63}-)?([0-9a-f]{16})$/,
  HEX4 = String.raw`[0-9a-f]{4}`,
  UUID_PATTERN = String.raw`[0-9a-f]{8}-${HEX4}-${HEX4}-${HEX4}-[0-9a-f]{12}`,
  regExp = new RegExp(String.raw`^(?:hook-agent-)?${UUID_PATTERN}$`);
//@ chunk-p52gp8zk.js:6622-6697 placement
function U(e) {
  let match = AGENT_ID_RE.exec(e),
    o = regExp.test(e) ? e : void 0;
  return match ? `a${match[1]}` : o;
}
//@ chunk-p52gp8zk.js:6697-6733 placement
function relayedId(e) {
  return isTracesRelayed() ? U(e) : e;
}
//@ chunk-p52gp8zk.js:6733-6884 placement
function agentAttributes(e) {
  if (!e || isMainAgent(e)) return {};
  let n = U(e.agentId),
    o = U(e.parentAgentId ?? "");
  return { ...(n !== void 0 && { agent_id: n }), ...(o !== void 0 && { parent_agent_id: o }) };
}
//@ chunk-p52gp8zk.js:6884-6901 placement
var A = Re(Ol(), 1);

export {
  relayedId,
  agentAttributes,
  initRepositoryAttributes,
  commitAttributes,
  repositoryAttributesPromise,
  remoteSessionAttributes,
  A,
};
