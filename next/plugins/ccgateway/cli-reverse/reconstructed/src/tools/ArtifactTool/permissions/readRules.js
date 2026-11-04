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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-rbtj21yz.js:2556-2656 placement
var WEBFETCH_RULE_TOOL; // deferred: uses ARTIFACT_TOOL_NAME (../constants.js) of its import cycle while loading; runs once the cycle is complete
var ARTIFACT_RULE_TOOL;
deferInit("chunk-rbtj21yz.js:2556", () => {
  WEBFETCH_RULE_TOOL = {
    name: WEBFETCH,
    mcpInfo: undefined,
    ruleContentField: WEB_FETCH_RULE_CONTENT_FIELD,
  };
  ARTIFACT_RULE_TOOL = {
    name: ARTIFACT_TOOL_NAME,
    mcpInfo: undefined,
    ruleContentField: ARTIFACT_RULE_CONTENT_FIELD,
  };
});
//@ chunk-rbtj21yz.js:2656-2828 placement
function artifactReadRuleInputs(url, prompt, page, version) {
  let prompt_2 = prompt ?? DEFAULT_ARTIFACT_READ_PROMPT;
  return {
    webFetch: {
      url,
      prompt: prompt_2,
      offset: undefined,
    },
    artifact: {
      action: "read",
      url,
      prompt: prompt_2,
      ...(page !== undefined && {
        page,
      }),
      ...(version !== undefined && {
        version,
      }),
    },
  };
}
//@ chunk-rbtj21yz.js:2828-2972 placement
var ARTIFACT_WEBFETCH_READ_ACTIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rbtj21yz.js:2828", () => {
  ARTIFACT_WEBFETCH_READ_ACTIONS = new Set([
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
});
//@ chunk-rbtj21yz.js:2972-3320 placement
function webFetchRuleForArtifactRead(toolPermissionContext, target, url, behavior, options) {
  let toolRule =
    options === undefined
      ? null
      : matchToolRule(
          toolPermissionContext,
          WEBFETCH_RULE_TOOL,
          artifactReadRuleInputs(url, options.prompt).webFetch,
          behavior,
        );
  if (toolRule !== null) return toolRule;
  let rules = getContentRulesMapForToolName(toolPermissionContext, WEBFETCH, behavior);
  if (rules.size === 0) return null;
  let hostnames = new Set([
    new URL(artifactViewerUrlFor(target)).hostname,
    new URL(artifactContentOriginUrlFor(target)).hostname,
  ]);
  if (typeof url === "string")
    try {
      hostnames.add(new URL(url).hostname);
    } catch {}
  for (let hostname of hostnames) {
    let domainRule = lookupDomainRule(rules, `domain:${hostname}`);
    if (domainRule !== undefined) return domainRule;
  }
  return null;
}
//@ chunk-rbtj21yz.js:3320-3579 placement
function artifactReadRule(toolPermissionContext, target, url, behavior, options = {}) {
  let dataToolName = dataToolEquivalent(
    {
      name: ARTIFACT_TOOL_NAME,
    },
    {
      action: options.action,
    },
  )?.tool.name;
  let webFetchRule = webFetchRuleForArtifactRead(toolPermissionContext, target, url, behavior, options.read);
  if (webFetchRule !== null) return webFetchRule;
  for (let toolName of [ARTIFACT_TOOL_NAME, ...(dataToolName ? [dataToolName] : [])]) {
    let contentRulesMapForToolName = getContentRulesMapForToolName(toolPermissionContext, toolName, behavior);
    let urlRule =
      getServerUrl(contentRulesMapForToolName, target, url) ??
      (options.copySource === true
        ? getServerUrl(contentRulesMapForToolName, target, url, "from_url")
        : null);
    if (urlRule !== null) return urlRule;
  }
  return null;
}
//@ chunk-rbtj21yz.js:3579-3746 placement
function withoutNarrowingDenyRules(context) {
  if (!NARROWING_RULE_SOURCES.some((source) => (context.alwaysDenyRules[source]?.length ?? 0) > 0))
    return context;
  let denyRules = {
    ...context.alwaysDenyRules,
  };
  for (let source of NARROWING_RULE_SOURCES) delete denyRules[source];
  return {
    ...context,
    alwaysDenyRules: denyRules,
  };
}
//@ chunk-rbtj21yz.js:3746-3848 placement
function matchArtifactReadRule(context, tool, input, behavior) {
  let { action, ...fields } = input;
  return (
    (action === undefined
      ? null
      : matchToolRule(
          withoutNarrowingDenyRules(context),
          tool,
          {
            action,
          },
          behavior,
        )) ?? matchToolRule(context, tool, fields, behavior)
  );
}
//@ chunk-rbtj21yz.js:3848-3992 placement
function artifactToolRuleForRead(context, ruleMap, url, behavior, options = {}) {
  let denyContext = withoutNarrowingDenyRules(context);
  return (
    (behavior === "deny"
      ? getDenyRuleForTool(denyContext, ARTIFACT_RULE_TOOL)
      : getAskRuleForTool(denyContext, ARTIFACT_RULE_TOOL)) ??
    matchArtifactReadRule(
      context,
      ARTIFACT_RULE_TOOL,
      artifactReadRuleInputs(url, options.prompt, options.page, options.version).artifact,
      behavior,
    ) ??
    getServerUrl(getContentRulesMapForToolName(context, ARTIFACT_TOOL_NAME, behavior), ruleMap, url)
  );
}
//@ chunk-rbtj21yz.js:3992-4359 placement
function artifactCallReadRule(context, target, url, behavior, options) {
  let ruleInput = {
    ...options.fields,
    ...(options.read !== undefined
      ? artifactReadRuleInputs(url, options.read.prompt, options.read.page, options.read.version).artifact
      : {
          ...(typeof options.action === "string" && {
            action: options.action,
          }),
          url: artifactViewerUrlFor(target),
        }),
  };
  let equivalent = dataToolEquivalent(ARTIFACT_RULE_TOOL, ruleInput);
  let context_2 = withoutNarrowingDenyRules(context);
  let wholeToolRule = (toolRef) =>
    behavior === "deny"
      ? getDenyRuleForTool(context_2, toolRef)
      : options.wholeToolAskAnswered === true && toolRef.name === ARTIFACT_TOOL_NAME
        ? null
        : getAskRuleForTool(context_2, toolRef);
  return (
    wholeToolRule(ARTIFACT_RULE_TOOL) ??
    matchArtifactReadRule(context, ARTIFACT_RULE_TOOL, ruleInput, behavior) ??
    (equivalent === undefined
      ? null
      : (wholeToolRule(equivalent.tool) ??
        matchArtifactReadRule(context, equivalent.tool, equivalent.input, behavior))) ??
    artifactReadRule(context, target, url, behavior, options)
  );
}
//@ chunk-rbtj21yz.js:4359-4442 placement
function denyRulePhrase(rule) {
  return `the ${refusalEcho(formatPermissionRule(rule.ruleValue))} deny rule from ${getSettingSourceDisplayNameLowercase(rule.source)}`;
}
//@ chunk-rbtj21yz.js:4442-4546 placement
var NEUTRALIZED_MARKS =
  'some tag-like sequences or line-opening turn markers in the copy below carry an inserted "\\"';
//@ chunk-rbtj21yz.js:4546-4711 placement = isFileReadDenied (0.771)
function sharedReadApprovalHolds(context, target, url, read = {}) {
  let toolPermissionContext = getToolPermissionContext(context);
  let ruleInput = {
    action: "read",
    read,
  };
  return (
    artifactReadNeedsUser(context, target) &&
    !(hasAutoReactNoticePending(target.slug) && !isDelegatedObservationContext(context.agentContext)) &&
    artifactCallReadRule(toolPermissionContext, target, url, "deny", ruleInput) === null &&
    artifactCallReadRule(toolPermissionContext, target, url, "ask", ruleInput) === null
  );
}
//@ chunk-rbtj21yz.js:4711-4829 placement
function artifactReadNeedsUser(context, target) {
  let { mode, modeBeforeRewrite } = getToolPermissionContext(context);
  return (
    mode !== "plan" &&
    ((mode !== "auto" && modeBeforeRewrite !== "auto") ||
      othersArtifactReadIsUserOnly(target) ||
      outsideOrgReadIsUserOnly(target.slug))
  );
}
//@ chunk-rbtj21yz.js:4829-4906 placement
function sharedReadApprovalReachable(context, target, url, read = {}) {
  return (
    getToolPermissionContext(context).mode !== "dontAsk" &&
    !consentMustDeny(context) &&
    sharedReadApprovalHolds(context, target, url, read)
  );
}
//@ chunk-rbtj21yz.js:4906-4985 placement
function sharedArtifactReadApproved(context, target, url, read = {}) {
  return (
    hasSharedReadConsent(context.artifactRegistries, target.slug) &&
    sharedReadApprovalHolds(context, target, url, read)
  );
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
