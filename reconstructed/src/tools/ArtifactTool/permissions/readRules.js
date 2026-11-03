/**
 * tools/ArtifactTool/permissions/readRules.ts
 *
 * 2.1.316 新增：读取权限规则
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rbtj21yz.js (15)
 * attribution: placement 15
 */
import { WEBFETCH, WEB_FETCH_RULE_CONTENT_FIELD } from "../../WebFetchTool/prompt.js";
import {
  ARTIFACT_TOOL_NAME,
  ARTIFACT_RULE_CONTENT_FIELD,
  DEFAULT_ARTIFACT_READ_PROMPT,
} from "../constants.js";
import {
  matchToolRule,
  getContentRulesMapForToolName,
  NARROWING_RULE_SOURCES,
  getDenyRuleForTool,
  getAskRuleForTool,
} from "../../../utils/permissions/permissions.js";
import { artifactViewerUrlFor, artifactContentOriginUrlFor, refusalEcho } from "../artifactUrls.js";
import { lookupDomainRule } from "../../../utils/wildcardMapLookup.js";
import { dataToolEquivalent, getServerUrl } from "./ruleTarget.js";
import { formatPermissionRule } from "../../../utils/permissions/disallowedToolsFlag.js";
import { getSettingSourceDisplayNameLowercase } from "../../../utils/settings/constants.js";
import {
  getToolPermissionContext,
  consentMustDeny,
} from "../../../utils/permissions/toolPermissionContext.js";
import { hasAutoReactNoticePending } from "../../../services/artifacts/shareEntries.js";
import { isDelegatedObservationContext } from "../../../utils/agentContext.js";
import {
  othersArtifactReadIsUserOnly,
  outsideOrgReadIsUserOnly,
} from "../../../services/artifacts/artifactToolGates.js";
import { hasSharedReadConsent } from "../../../services/artifacts/consentClasses.js";

//@ chunk-rbtj21yz.js:2556-2656 placement
var WEBFETCH_RULE_TOOL = { name: WEBFETCH, mcpInfo: void 0, ruleContentField: WEB_FETCH_RULE_CONTENT_FIELD },
  ARTIFACT_RULE_TOOL = {
    name: ARTIFACT_TOOL_NAME,
    mcpInfo: void 0,
    ruleContentField: ARTIFACT_RULE_CONTENT_FIELD,
  };
//@ chunk-rbtj21yz.js:2656-2828 placement
function artifactReadRuleInputs(n, e, t, o) {
  let r = e ?? DEFAULT_ARTIFACT_READ_PROMPT;
  return {
    webFetch: { url: n, prompt: r, offset: void 0 },
    artifact: {
      action: "read",
      url: n,
      prompt: r,
      ...(t !== void 0 && { page: t }),
      ...(o !== void 0 && { version: o }),
    },
  };
}
//@ chunk-rbtj21yz.js:2828-2972 placement
var ARTIFACT_WEBFETCH_READ_ACTIONS = new Set([
  "read",
  "read_db",
  "comments",
  "list_files",
  "read_file",
  "list_assets",
  "read_asset",
  "get_endpoints",
  "call_endpoint",
  "run_script",
]);
//@ chunk-rbtj21yz.js:2972-3320 placement
function webFetchRuleForArtifactRead(n, e, t, o, r) {
  let l =
    r === void 0
      ? null
      : matchToolRule(n, WEBFETCH_RULE_TOOL, artifactReadRuleInputs(t, r.prompt).webFetch, o);
  if (l !== null) return l;
  let u = getContentRulesMapForToolName(n, WEBFETCH, o);
  if (u.size === 0) return null;
  let a = new Set([
    new URL(artifactViewerUrlFor(e)).hostname,
    new URL(artifactContentOriginUrlFor(e)).hostname,
  ]);
  if (typeof t === "string")
    try {
      a.add(new URL(t).hostname);
    } catch {}
  for (let i of a) {
    let s = lookupDomainRule(u, `domain:${i}`);
    if (s !== void 0) return s;
  }
  return null;
}
//@ chunk-rbtj21yz.js:3320-3579 placement
function artifactReadRule(n, e, t, o, r = {}) {
  let l = dataToolEquivalent({ name: ARTIFACT_TOOL_NAME }, { action: r.action })?.tool.name,
    u = webFetchRuleForArtifactRead(n, e, t, o, r.read);
  if (u !== null) return u;
  for (let a of [ARTIFACT_TOOL_NAME, ...(l ? [l] : [])]) {
    let i = getContentRulesMapForToolName(n, a, o),
      s = getServerUrl(i, e, t) ?? (r.copySource === !0 ? getServerUrl(i, e, t, "from_url") : null);
    if (s !== null) return s;
  }
  return null;
}
//@ chunk-rbtj21yz.js:3579-3746 placement
function withoutNarrowingDenyRules(n) {
  if (!NARROWING_RULE_SOURCES.some((t) => (n.alwaysDenyRules[t]?.length ?? 0) > 0)) return n;
  let e = { ...n.alwaysDenyRules };
  for (let t of NARROWING_RULE_SOURCES) delete e[t];
  return { ...n, alwaysDenyRules: e };
}
//@ chunk-rbtj21yz.js:3746-3848 placement
function matchArtifactReadRule(n, e, t, o) {
  let { action: action, ...l } = t;
  return (
    (action === void 0 ? null : matchToolRule(withoutNarrowingDenyRules(n), e, { action: action }, o)) ??
    matchToolRule(n, e, l, o)
  );
}
//@ chunk-rbtj21yz.js:3848-3992 placement
function artifactToolRuleForRead(n, e, t, o, r = {}) {
  let l = withoutNarrowingDenyRules(n);
  return (
    (o === "deny" ? getDenyRuleForTool(l, ARTIFACT_RULE_TOOL) : getAskRuleForTool(l, ARTIFACT_RULE_TOOL)) ??
    matchArtifactReadRule(
      n,
      ARTIFACT_RULE_TOOL,
      artifactReadRuleInputs(t, r.prompt, r.page, r.version).artifact,
      o,
    ) ??
    getServerUrl(getContentRulesMapForToolName(n, ARTIFACT_TOOL_NAME, o), e, t)
  );
}
//@ chunk-rbtj21yz.js:3992-4359 placement
function artifactCallReadRule(n, e, t, o, r) {
  let l = {
      ...r.fields,
      ...(r.read !== void 0
        ? artifactReadRuleInputs(t, r.read.prompt, r.read.page, r.read.version).artifact
        : { ...(typeof r.action === "string" && { action: r.action }), url: artifactViewerUrlFor(e) }),
    },
    u = dataToolEquivalent(ARTIFACT_RULE_TOOL, l),
    a = withoutNarrowingDenyRules(n),
    i = (s) =>
      o === "deny"
        ? getDenyRuleForTool(a, s)
        : r.wholeToolAskAnswered === !0 && s.name === ARTIFACT_TOOL_NAME
          ? null
          : getAskRuleForTool(a, s);
  return (
    i(ARTIFACT_RULE_TOOL) ??
    matchArtifactReadRule(n, ARTIFACT_RULE_TOOL, l, o) ??
    (u === void 0 ? null : (i(u.tool) ?? matchArtifactReadRule(n, u.tool, u.input, o))) ??
    artifactReadRule(n, e, t, o, r)
  );
}
//@ chunk-rbtj21yz.js:4359-4442 placement
function denyRulePhrase(n) {
  return `the ${refusalEcho(formatPermissionRule(n.ruleValue))} deny rule from ${getSettingSourceDisplayNameLowercase(n.source)}`;
}
//@ chunk-rbtj21yz.js:4442-4546 placement
var NEUTRALIZED_MARKS =
  'some tag-like sequences or line-opening turn markers in the copy below carry an inserted "\\"';
//@ chunk-rbtj21yz.js:4546-4711 placement = isFileReadDenied (0.771)
function sharedReadApprovalHolds(n, e, t, o = {}) {
  let r = getToolPermissionContext(n),
    l = { action: "read", read: o };
  return (
    artifactReadNeedsUser(n, e) &&
    !(hasAutoReactNoticePending(e.slug) && !isDelegatedObservationContext(n.agentContext)) &&
    artifactCallReadRule(r, e, t, "deny", l) === null &&
    artifactCallReadRule(r, e, t, "ask", l) === null
  );
}
//@ chunk-rbtj21yz.js:4711-4829 placement
function artifactReadNeedsUser(n, e) {
  let { mode: mode, modeBeforeRewrite: modeBeforeRewrite } = getToolPermissionContext(n);
  return (
    mode !== "plan" &&
    ((mode !== "auto" && modeBeforeRewrite !== "auto") ||
      othersArtifactReadIsUserOnly(e) ||
      outsideOrgReadIsUserOnly(e.slug))
  );
}
//@ chunk-rbtj21yz.js:4829-4906 placement
function sharedReadApprovalReachable(n, e, t, o = {}) {
  return (
    getToolPermissionContext(n).mode !== "dontAsk" &&
    !consentMustDeny(n) &&
    sharedReadApprovalHolds(n, e, t, o)
  );
}
//@ chunk-rbtj21yz.js:4906-4985 placement
function sharedArtifactReadApproved(n, e, t, o = {}) {
  return hasSharedReadConsent(n.artifactRegistries, e.slug) && sharedReadApprovalHolds(n, e, t, o);
}

export {
  sharedArtifactReadApproved,
  sharedReadApprovalReachable,
  NEUTRALIZED_MARKS,
  denyRulePhrase,
  artifactReadRule,
  artifactCallReadRule,
  ARTIFACT_WEBFETCH_READ_ACTIONS,
  webFetchRuleForArtifactRead,
  artifactToolRuleForRead,
  sharedReadApprovalHolds,
};
