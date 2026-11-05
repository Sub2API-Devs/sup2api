/**
 * utils/claudeInChrome/chromePermissions.ts
 *
 * 2.1.316 新增：Claude in Chrome 权限
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-323717f6.js (9), chunk-d6nykaks.js (11)
 * attribution: placement 17, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  hostWithoutPort,
  collectChromeSiteRules,
  chromeSiteDenyDecision,
  isBackOrForward,
  parseSiteActionUrl,
  normalizeChromeSite,
} from "./chromePermissionRules.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import {
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
  CFC_TOOL_PREFIX,
  FILE_UPLOAD_UNAVAILABLE,
  UPLOAD_NEEDS_APPROVAL,
  UPLOAD_IN_BATCH_UNAVAILABLE,
  BROWSER_BATCH_UNAVAILABLE,
} from "./common.js";
import { isClaudeAiProxyServer } from "../../services/mcp/builtinServerNames.js";
import { isPlainObject } from "../isPlainObject.js";
import { isHookOrPluginSteered } from "../agentContext.js";
import { BROWSER_TOOLS, CHROME_INPUT_APPROVED_TOOL_NAMES } from "./browserToolSchemas.js";
import { logChromeToolAttempted } from "./telemetry.js";
import { isDiskless } from "../../bootstrap/state.js";
import {
  disklessHostState,
  ANTHROPIC_CHROMEUPLOADAUTOMODEONLY,
} from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import {
  isBrowserHousekeepingCall,
  stripCyclesAndHiddenKeys,
} from "../permissions/browserComputerUseTools.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { setPendingPermissionNote } from "../permissions/permissionRecord.js";
import { getAccountSetPermissionMode, isAutoModeActive } from "../permissions/autoModeState.js";
import { getMcpPermissionModeOverride, isAutoAllowedInMode } from "../permissions/browserToolNames.js";
import { describeBrowserToolAction } from "../../components/TrustDialog/utils.js";
import { jsonParse } from "../slowOperations.js";
import { logForDebugging } from "../debug.js";
import { McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../services/mcp/client.js";
import { CCR_NEEDS_APPROVAL_CODE } from "../../services/mcp/mcpResultErrors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-d6nykaks.js:465-580 placement
/**
 * Chrome 站点名的最大长度（253）。
 */
var CLAUDECODE_CHROMESITE = "claudecode/chromeSite";
var CLAUDECODE_CHROMELATECARDSITE = "claudecode/chromeLateCardSite";
var MAX_CHROME_SITE_CHARS = 253;
var CHROME_SITE_RE = /^[a-z0-9._-]+$/;
var CHROME_SITE_IPV6_RE = /^\[[0-9a-f:.]+\]$/;
//@ chunk-d6nykaks.js:580-626 placement
/**
 * 判断站点名格式是否可用。
 */
function isUsableChromeSite(site) {
  return site.length <= MAX_CHROME_SITE_CHARS && CHROME_SITE_RE.test(site);
}
//@ chunk-d6nykaks.js:626-734 layout
function isUsableChromeSiteWithPort(site) {
  if (typeof site !== "string") return false;
  let host = hostWithoutPort(site);
  return isUsableChromeSite(host) && (host === site || isPortString(site.slice(host.length + 1)));
}
//@ chunk-d6nykaks.js:734-762 layout
var resolvedHostByToolUseIdSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-d6nykaks.js:734", () => {
  resolvedHostByToolUseIdSlot = new SessionRootSlot(() => new Map());
});
//@ chunk-d6nykaks.js:762-835 layout
function rememberResolvedHost(toolUseId, site) {
  if (isUsableChromeSiteWithPort(site))
    claudeInChromeSession().resolvedHostByToolUseId.set(toolUseId, {
      host: site,
    });
}
//@ chunk-d6nykaks.js:835-1240 placement
/**
 * 从 Claude in Chrome 工具的错误数据中读出操作的站点（chrome_site/端口），校验格式；无法读出返回 unreadable，非该服务器返回 undefined。
 */
function chromeSiteFromError(client, errorInfo) {
  if (
    client.name !== CLAUDE_IN_CHROME_MCP_SERVER_NAME ||
    !isClaudeAiProxyServer(client.config) ||
    !isPlainObject(errorInfo) ||
    (errorInfo.chrome_site === undefined && errorInfo.chrome_site_port === undefined)
  )
    return;
  let { chrome_site: chromeSite, chrome_site_port: chromeSitePort } = errorInfo;
  if (
    typeof chromeSite !== "string" ||
    chromeSite.length > MAX_CHROME_SITE_CHARS ||
    !(CHROME_SITE_RE.test(chromeSite) || CHROME_SITE_IPV6_RE.test(chromeSite)) ||
    siteOfActionUrl(`https://${chromeSite}`) !== chromeSite ||
    (chromeSitePort !== undefined && !isPortString(chromeSitePort))
  )
    return {
      kind: "unreadable",
    };
  return {
    kind: "named",
    site: chromeSitePort === undefined ? chromeSite : `${chromeSite}:${chromeSitePort}`,
    offersGrant:
      chromeSitePort === undefined &&
      CHROME_SITE_RE.test(chromeSite) &&
      errorInfo.chrome_offers_site_grant === "true",
  };
}
//@ chunk-d6nykaks.js:1240-1665 placement
/**
 * 询问前检查 Chrome 站点拒绝规则：能识别站点时按拒绝列表判断；识别不了站点且存在拒绝规则时直接拒绝（安全检查，不可被分类器批准）。
 */
function chromeSiteDenyCheck(chromeSite, toolPermissionContext) {
  let chromeSiteRules = collectChromeSiteRules(toolPermissionContext);
  if (chromeSite.kind !== "unreadable") {
    let denyDecision = chromeSiteDenyDecision(chromeSiteRules, chromeSite.site);
    return (
      denyDecision && {
        ...denyDecision,
        decideLocation: "pre-ask",
      }
    );
  }
  if (chromeSiteRules.denied.size === 0) return;
  return {
    behavior: "deny",
    message:
      "Claude in Chrome could not tell which site this call would act on, so it could not check the sites that are denied.",
    decisionReason: {
      type: "safetyCheck",
      reason: "Claude in Chrome: unreadable site",
      classifierApprovable: false,
    },
    decideLocation: "pre-ask",
  };
}
//@ chunk-d6nykaks.js:1665-2165 placement
/**
 * 为命名站点生成询问：若 navigate 目标可能离开该站点则注明；可授权时附带"本会话允许该站点"的规则建议，否则禁止"总是允许"。
 */
function chromeSiteAsk(chromeSite, toolName, input, toolUseContext) {
  if (chromeSite.kind !== "named") return;
  let { site } = chromeSite;
  let any = navigateTargets(toolName, input).some((targetUrl) => siteOfActionUrl(targetUrl) !== site);
  let canOfferGrant =
    !any &&
    chromeSite.offersGrant &&
    !isHookOrPluginSteered(toolUseContext) &&
    toolUseContext.forRemoteExecution !== true;
  return {
    behavior: "ask",
    message: "Claude in Chrome requires permission.",
    decisionReason: {
      type: "other",
      reason: any
        ? `Claude in Chrome action on ${site}, which may also leave that site`
        : `Claude in Chrome action on ${site}`,
    },
    ...(canOfferGrant
      ? {
          suggestions: [
            {
              type: "addRules",
              rules: [
                {
                  toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
                  ruleContent: site,
                },
              ],
              behavior: "allow",
              destination: "session",
            },
          ],
        }
      : {
          suppressAlwaysAllowRule: true,
        }),
  };
}
//@ chunk-d6nykaks.js:2165-2271 placement
function isPortString(port) {
  return (
    typeof port === "string" &&
    /^[0-9]{1,5}$/.test(port) &&
    String(Number(port)) === port &&
    Number(port) <= 65535
  );
}
//@ chunk-d6nykaks.js:2271-2357 placement
/**
 * 把动作 URL 规范成 Chrome 站点名。
 */
function siteOfActionUrl(url) {
  if (typeof url !== "string" || isBackOrForward(url)) return;
  let siteActionUrl = parseSiteActionUrl(url);
  return siteActionUrl && normalizeChromeSite(siteActionUrl.host);
}
//@ chunk-d6nykaks.js:2357-2556 placement
function navigateTargets(toolName, input) {
  if (toolName === "navigate") return [input.url];
  if (toolName !== "browser_batch" || !Array.isArray(input.actions)) return [];
  return input.actions.flatMap((action) =>
    isPlainObject(action) && action.name === "navigate"
      ? [isPlainObject(action.input) ? action.input.url : undefined]
      : [],
  );
}
//@ chunk-323717f6.js:13196-13495 placement
var CHROME_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ANTHROPIC_CHROMEWORKERDECIDES;
var CLAUDECODE_CHROMEJUDGEDSITE;
var ANTHROPIC_CHROMEOWNTABSUNASKED;
var PAGE_READ_TOOLS;
var TABS_CONTEXT_MCP;
var MAX_SITE_LENGTH;
var TAB_READ_TIMEOUT_MS;
deferInit("chunk-323717f6.js:13196", () => {
  CHROME_TOOL_NAMES = new Set(BROWSER_TOOLS.map((tool) => tool.name));
  ANTHROPIC_CHROMEWORKERDECIDES = "anthropic/chromeWorkerDecides";
  CLAUDECODE_CHROMEJUDGEDSITE = "claudecode/chromeJudgedSite";
  ANTHROPIC_CHROMEOWNTABSUNASKED = "anthropic/chromeOwnTabsUnasked";
  PAGE_READ_TOOLS = new Set([
    "computer",
    "find",
    "form_input",
    "get_page_text",
    "read_page",
    "read_console_messages",
    "read_network_requests",
  ]);
  TABS_CONTEXT_MCP = "tabs_context_mcp";
  MAX_SITE_LENGTH = 259;
  TAB_READ_TIMEOUT_MS = 5000;
});
//@ chunk-323717f6.js:13495-19007 placement
/**
 * Claude in Chrome 的工具权限处理器（按会话与客户端平台判定、记录已允许站点）。
 */
function createChromePermissionHandler(toolName, gateConfig, readTabUrl) {
  let commandName = `${CFC_TOOL_PREFIX}${toolName}`;
  let weakMap = new WeakMap();
  let checkPermissions = async (input, toolUseContext) => {
    logChromeToolAttempted(toolUseContext.options?.messageClientPlatform);
    let urls = [];
    let sawNavigate = false;
    let isSingleSite = true;
    let readTabIds = new Set();
    let isHostlessDiskless = () =>
      isDiskless() && disklessHostState.peek(toolUseContext.session)?.host === undefined;
    if (toolName === "file_upload" && isHostlessDiskless()) return fileUploadDeny(FILE_UPLOAD_UNAVAILABLE);
    if (
      toolName === "file_upload" &&
      gateConfig?.[ANTHROPIC_CHROMEUPLOADAUTOMODEONLY] === true &&
      !isChromeToolAutoAllowed(toolName, getToolPermissionContext(toolUseContext))
    )
      return fileUploadDeny(UPLOAD_NEEDS_APPROVAL);
    if (toolName === "navigate") {
      if (typeof input.url !== "string") return unjudgeableChromeInputDeny("navigate url is not a string");
      urls.push(input.url);
    } else if (toolName === "browser_batch") {
      if (input.actions !== undefined && !Array.isArray(input.actions))
        return unjudgeableChromeInputDeny("batch actions is not an array");
      for (let action of Array.isArray(input.actions) ? input.actions : []) {
        if (!isPlainObject(action) || typeof action.name !== "string")
          return unjudgeableChromeInputDeny("unreadable batch item");
        if (action.name === "browser_batch") return unjudgeableChromeInputDeny("nested batch");
        if (!CHROME_TOOL_NAMES.has(action.name))
          return unjudgeableChromeInputDeny("unrecognized batch item name");
        readTabIds.add(
          PAGE_READ_TOOLS.has(action.name) && isPlainObject(action.input) ? action.input.tabId : undefined,
        );
        if (action.name === "file_upload")
          return fileUploadDeny(isHostlessDiskless() ? FILE_UPLOAD_UNAVAILABLE : UPLOAD_IN_BATCH_UNAVAILABLE);
        if (action.name === "navigate") {
          if (!isPlainObject(action.input) || typeof action.input.url !== "string")
            return unjudgeableChromeInputDeny("batch navigate url is not a string");
          urls.push(action.input.url);
          sawNavigate = true;
          if (isBackOrForward(action.input.url)) isSingleSite = false;
        } else if (
          !CHROME_INPUT_APPROVED_TOOL_NAMES.has(action.name) ||
          (action.input !== undefined && !isPlainObject(action.input)) ||
          !isBrowserHousekeepingCall(action.name, isPlainObject(action.input) ? action.input : {})
        )
          isSingleSite = false;
      }
    }
    let canWorkerDecide =
      gateConfig?.[ANTHROPIC_CHROMEWORKERDECIDES] === true &&
      readTabUrl !== undefined &&
      getToolPermissionContext(toolUseContext).mode !== "plan";
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    let isAutoBatch =
      toolName === "browser_batch" &&
      canWorkerDecide &&
      toolUseContext.agentId === undefined &&
      toolUseContext.toolUseId !== undefined &&
      !isChromeToolAutoAllowed(toolName, toolPermissionContext) &&
      toolPermissionContext.chromeClassifierFloorEnabled === true &&
      toolPermissionContext.canAutoClassifierRun === true;
    if (isAutoBatch && sessionAllowedSites(toolPermissionContext.alwaysAllowRules.session).size > 0) {
      logFeatureSad("chrome_permission_prompt", "batch_one_by_one");
      return {
        behavior: "deny",
        message: BROWSER_BATCH_UNAVAILABLE,
        decisionReason: {
          type: "safetyCheck",
          reason: "Claude in Chrome: this call does not run in auto mode, so each action is its own call",
          classifierApprovable: false,
        },
      };
    }
    let isPlainBatch = toolName === "browser_batch" && sawNavigate && isSingleSite;
    let filtered = urls.filter((url) => !isBackOrForward(url));
    let firstSiteUrl;
    let deniableHosts = new Map();
    if (filtered.length > 0) {
      let toolPermissionContext = getToolPermissionContext(toolUseContext);
      let chromeSiteRules = collectChromeSiteRules(toolPermissionContext);
      for (let url of filtered) {
        let siteActionUrl = parseSiteActionUrl(url);
        if (!siteActionUrl) {
          logFeatureBad("chrome_permission_prompt", "non_web_url");
          return {
            behavior: "deny",
            message:
              "Can't interact with browser-internal or unparseable URLs. Navigate to a web page first.",
            decisionReason: {
              type: "safetyCheck",
              reason: "Claude in Chrome: non-web or unparseable URL",
              classifierApprovable: false,
            },
          };
        }
        let denyDecision = chromeSiteDenyDecision(chromeSiteRules, siteActionUrl.host);
        if (denyDecision) {
          logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
          return denyDecision;
        }
        let site = normalizeChromeSite(siteActionUrl.host);
        if (!chromeSiteRules.allowed.has(site) && !deniableHosts.has(site))
          deniableHosts.set(site, siteActionUrl.host);
        firstSiteUrl ??= siteActionUrl;
      }
      if (
        firstSiteUrl !== undefined &&
        deniableHosts.size === 0 &&
        (toolName === "navigate" || isPlainBatch)
      ) {
        if (
          canWorkerDecide &&
          toolName === "navigate" &&
          isUsableChromeSite(hostWithoutPort(firstSiteUrl.host))
        )
          setPendingPermissionNote(
            toolUseContext,
            input,
            siteJudgementNote(
              firstSiteUrl.host,
              toolUseContext.agentId === undefined,
              toolPermissionContext.alwaysAllowRules.session,
            ),
            commandName,
          );
        let site = normalizeChromeSite(firstSiteUrl.host);
        let source =
          chromeSiteRules.sourceOf.get(site) ??
          chromeSiteRules.sourceOf.get(hostWithoutPort(site)) ??
          "session";
        if (toolPermissionContext.chromeClassifierFloorEnabled !== true)
          return {
            behavior: "allow",
            updatedInput: input,
            decisionReason: {
              type: "rule",
              rule: {
                source,
                ruleBehavior: "allow",
                ruleValue: {
                  toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
                  ruleContent: firstSiteUrl.host,
                },
              },
            },
          };
        return {
          behavior: "ask",
          message: "Claude in Chrome requires permission.",
          updatedInput: input,
          decisionReason: {
            type: "other",
            reason: `Claude in Chrome action on ${firstSiteUrl.host}`,
          },
          metadata: {
            command: {
              name: commandName,
              chrome: {
                ...firstSiteUrl,
                domainAllowed: true,
              },
            },
          },
        };
      }
    }
    if (CHROME_INPUT_APPROVED_TOOL_NAMES.has(toolName) && isBrowserHousekeepingCall(toolName, input))
      return {
        behavior: "allow",
        updatedInput: input,
      };
    let toolPermissionContext_2 = getToolPermissionContext(toolUseContext);
    if (
      toolName === TABS_CONTEXT_MCP &&
      gateConfig?.[ANTHROPIC_CHROMEOWNTABSUNASKED] === true &&
      input.createIfEmpty === true &&
      Object.keys(input).length === 1 &&
      toolUseContext.toolUseId !== undefined &&
      toolPermissionContext_2.mode === "acceptEdits" &&
      getAccountSetPermissionMode() === "acceptEdits" &&
      getMcpPermissionModeOverride(
        {
          mcpInfo: {
            serverName: CLAUDE_IN_CHROME_MCP_SERVER_NAME,
          },
        },
        toolPermissionContext_2,
      ) === undefined
    )
      return {
        behavior: "allow",
        updatedInput: input,
      };
    if (canWorkerDecide) {
      let tabIdToResolve =
        toolName === "browser_batch"
          ? isAutoBatch && readTabIds.size === 1 && Object.keys(input).length === 1 && [...readTabIds][0]
          : !["navigate", "file_upload"].includes(toolName) &&
            !CHROME_INPUT_APPROVED_TOOL_NAMES.has(toolName) &&
            input.tabId;
      let resolvedTabUrl =
        typeof tabIdToResolve === "number" &&
        toolUseContext.toolUseId !== undefined &&
        toolUseContext.permissionRound !== undefined
          ? await readTabUrl?.(tabIdToResolve, toolUseContext.abortController.signal)
          : undefined;
      let tabActionUrl = resolvedTabUrl === undefined ? undefined : parseSiteActionUrl(resolvedTabUrl);
      let actionSite =
        toolName === "navigate"
          ? firstSiteUrl
          : tabActionUrl !== undefined && tabActionUrl.host.length <= MAX_SITE_LENGTH
            ? tabActionUrl
            : undefined;
      let toolPermissionContext = getToolPermissionContext(toolUseContext);
      let chromeSiteRules = collectChromeSiteRules(toolPermissionContext);
      let tabDenyDecision = actionSite && chromeSiteDenyDecision(chromeSiteRules, actionSite.host);
      if (toolPermissionContext.mode === "plan");
      else if (isAutoBatch && sessionAllowedSites(toolPermissionContext.alwaysAllowRules.session).size > 0)
        return checkPermissions(input, toolUseContext);
      else if (resolvedTabUrl !== undefined && actionSite === undefined) {
        logFeatureBad("chrome_permission_prompt", "non_web_tab_url");
        return {
          behavior: "deny",
          message: "Can't interact with browser-internal or unparseable URLs. Navigate to a web page first.",
          decisionReason: {
            type: "safetyCheck",
            reason: "Claude in Chrome: non-web or unparseable tab URL",
            classifierApprovable: false,
          },
        };
      } else if (tabDenyDecision) {
        logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
        return tabDenyDecision;
      } else if (actionSite !== undefined && isUsableChromeSite(hostWithoutPort(actionSite.host))) {
        if (resolvedTabUrl !== undefined) logFeatureOk("chrome_permission_prompt");
        if (toolName !== "browser_batch")
          setPendingPermissionNote(
            toolUseContext,
            input,
            siteJudgementNote(
              actionSite.host,
              toolUseContext.agentId === undefined,
              toolPermissionContext.alwaysAllowRules.session,
            ),
            commandName,
          );
        let siteAllowed = chromeSiteRules.allowed.has(normalizeChromeSite(actionSite.host));
        let offerDomainRule =
          !siteAllowed &&
          toolPermissionContext.chromeClassifierFloorEnabled === true &&
          toolPermissionContext.canAutoClassifierRun === true;
        if (offerDomainRule) weakMap.set(input, actionSite.host);
        let whereText =
          toolName === "browser_batch" ? `in the ${actionSite.host} tab` : `on ${actionSite.host}`;
        return {
          behavior: "ask",
          message: "Claude in Chrome requires permission.",
          updatedInput: input,
          suggestions: offerDomainRule
            ? [
                {
                  type: "addRules",
                  rules: [
                    {
                      toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
                      ruleContent: actionSite.host,
                    },
                  ],
                  behavior: "allow",
                  destination: "session",
                },
              ]
            : undefined,
          decisionReason: {
            type: "other",
            reason: `Claude in Chrome action ${whereText}`,
          },
          metadata: {
            command: {
              name: commandName,
              description: `Allow Claude in Chrome to ${describeBrowserToolAction(toolName, input)} ${whereText}?`,
              chrome: {
                ...actionSite,
                domainAllowed: siteAllowed && toolName !== "browser_batch",
              },
            },
          },
        };
      } else if (resolvedTabUrl !== undefined)
        logFeatureSad("chrome_permission_prompt", "tab_site_not_plain");
    }
    let isNotDiskless = !isDiskless();
    return {
      behavior: "passthrough",
      message: "Claude in Chrome requires permission.",
      suggestions:
        deniableHosts.size === 1 && (toolName === "navigate" || isPlainBatch) && isNotDiskless
          ? [
              {
                type: "addRules",
                rules: [...deniableHosts.values()].map((ruleContent) => ({
                  toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
                  ruleContent,
                })),
                behavior: "allow",
                destination: "session",
              },
            ]
          : undefined,
    };
  };
  return {
    coerceInput: (input) => {
      let strippedInput = stripCyclesAndHiddenKeys(input);
      return strippedInput === input
        ? null
        : {
            input: strippedInput,
            shapeClass: "chrome_host_only_args_removed",
          };
    },
    checkPermissions,
    suggestedAllowRule: (rule, input) =>
      rule.toolName === CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL &&
      rule.ruleContent !== undefined &&
      (input === "late"
        ? isUsableChromeSite(rule.ruleContent.replace(/:[0-9]{1,5}$/, ""))
        : rule.ruleContent === weakMap.get(input)),
    suppressesAlwaysAllowRule: () => true,
    ignoresWholeToolAllowRule: () => true,
    excludedFromAutoModeAllowlist: () => true,
    excludedFromModeBypassAllow: () => true,
  };
}
//@ chunk-323717f6.js:19007-19840 placement
/**
 * 调用 tabs_context_mcp 读取指定 tabId 的 URL（带超时）；读不到时按原因（未列出、超时、无标签组、非 JSON、需批准等）记 chrome_permission_prompt 埋点。
 */
async function readTabUrl(callTool, tabId, signal) {
  let timeoutSignal = AbortSignal.timeout(TAB_READ_TIMEOUT_MS);
  let rawText = "";
  try {
    let response = await callTool(
      TABS_CONTEXT_MCP,
      {
        createIfEmpty: false,
      },
      AbortSignal.any([signal, timeoutSignal]),
    );
    let firstBlock = Array.isArray(response) ? response[0] : undefined;
    rawText = isPlainObject(firstBlock) ? String(firstBlock.text) : String(response);
    let parsed = jsonParse(rawText);
    let availableTabs = isPlainObject(parsed) ? parsed.availableTabs : undefined;
    let tab = Array.isArray(availableTabs)
      ? availableTabs.find((availableTab) => isPlainObject(availableTab) && availableTab.tabId === tabId)
      : undefined;
    if (isPlainObject(tab) && typeof tab.url === "string" && tab.url) return tab.url;
    logFeatureSad("chrome_permission_prompt", "tab_url_unresolved_tab_not_listed");
  } catch (error) {
    if (!signal.aborted) {
      logForDebugging(`Claude in Chrome: the tab read failed: ${String(error)}`, {
        level: "error",
      });
      logFeatureSad(
        "chrome_permission_prompt",
        timeoutSignal.aborted
          ? "tab_url_unresolved_timed_out"
          : error instanceof SyntaxError
            ? rawText.includes("createIfEmpty")
              ? "tab_url_unresolved_no_tab_group"
              : "tab_url_unresolved_not_json"
            : error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
              ? "tab_url_unresolved_error_answer"
              : isPlainObject(error) && error.code === CCR_NEEDS_APPROVAL_CODE
                ? "tab_url_unresolved_needs_approval"
                : "tab_url_unresolved_call_threw",
      );
    }
  }
  return;
}
//@ chunk-323717f6.js:19840-19944 placement
function siteJudgementNote(host, leftToClassifier, session = []) {
  return {
    site: host,
    personLeftItToClassifier:
      (getAccountSetPermissionMode() === "auto" && isAutoModeActive()) ||
      (leftToClassifier && sessionAllowedSites(session).has(normalizeChromeSite(host))),
  };
}
//@ chunk-323717f6.js:19944-20327 placement
/**
 * 若本次调用由用户（或用户交给分类器）批准，返回权限阶段记录的站点信息用作结果元数据。
 */
function judgedSiteMeta({ permissionPhase, toolUseId, allowGivenBy, session }) {
  let cardSite =
    permissionPhase?.pipeline === undefined && toolUseId !== undefined
      ? resolvedHostByToolUseIdSlot.peek(session)?.get(toolUseId)
      : undefined;
  if (cardSite !== undefined)
    return {
      [CLAUDECODE_CHROMELATECARDSITE]: cardSite,
    };
  let note = permissionPhase?.pipeline !== undefined ? permissionPhase.checked?.note : undefined;
  let approver = allowGivenBy?.toolUseId === toolUseId ? allowGivenBy?.approver : undefined;
  return isPlainObject(note) &&
    typeof note.site === "string" &&
    (approver === "user" || (approver === "classifier" && note.personLeftItToClassifier === true))
    ? {
        [CLAUDECODE_CHROMEJUDGEDSITE]: normalizeChromeSite(note.site),
      }
    : undefined;
}
//@ chunk-323717f6.js:20327-20415 placement
/**
 * 取出会话级允许的 Chrome 站点集合。
 */
function sessionAllowedSites(session = []) {
  return collectChromeSiteRules({
    alwaysAllowRules: {
      session,
    },
    alwaysDenyRules: {},
  }).allowed;
}
//@ chunk-323717f6.js:20415-20586 placement
function fileUploadDeny(message) {
  return {
    behavior: "deny",
    message,
    decisionReason: {
      type: "safetyCheck",
      reason: "Claude in Chrome: a file_upload that cannot be served",
      classifierApprovable: false,
    },
  };
}
//@ chunk-323717f6.js:20586-20697 placement
function isChromeToolAutoAllowed(toolName, toolPermissionContext) {
  return (
    isAutoAllowedInMode(
      {
        mcpInfo: {
          serverName: CLAUDE_IN_CHROME_MCP_SERVER_NAME,
          toolName,
        },
        excludedFromModeBypassAllow: () => true,
      },
      toolPermissionContext,
    ) === "auto"
  );
}
//@ chunk-323717f6.js:20697-20973 placement
function unjudgeableChromeInputDeny(reason) {
  logFeatureBad("chrome_permission_prompt", "unjudgeable_chrome_input");
  return {
    behavior: "deny",
    message: "Can't run this Claude in Chrome action: its input couldn't be safely checked.",
    decisionReason: {
      type: "safetyCheck",
      reason: `Claude in Chrome: ${reason}`,
      classifierApprovable: false,
    },
  };
}
export {
  createChromePermissionHandler,
  readTabUrl,
  judgedSiteMeta,
  chromeSiteFromError,
  chromeSiteDenyCheck,
  chromeSiteAsk,
  CLAUDECODE_CHROMESITE,
  isUsableChromeSiteWithPort,
  rememberResolvedHost,
};
