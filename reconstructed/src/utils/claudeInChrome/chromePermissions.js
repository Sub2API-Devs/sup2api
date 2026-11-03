/**
 * utils/claudeInChrome/chromePermissions.ts
 *
 * 2.1.316 新增：Claude in Chrome 权限
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-29pqxdaf.js (17)
 * attribution: placement 17
 */
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
import {
  collectChromeSiteRules,
  chromeSiteDenyDecision,
  isBackOrForward,
  parseSiteActionUrl,
  normalizeChromeSite,
  hostWithoutPort,
} from "./chromePermissionRules.js";
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

//@ chunk-29pqxdaf.js:10535-10616 placement
/**
 * Chrome 站点名的最大长度（253）。
 */
var CLAUDECODE_CHROMESITE = "claudecode/chromeSite";
var MAX_CHROME_SITE_CHARS = 253;
var CHROME_SITE_RE = /^[a-z0-9._-]+$/;
var CHROME_SITE_IPV6_RE = /^\[[0-9a-f:.]+\]$/;
//@ chunk-29pqxdaf.js:10616-10661 placement
/**
 * 判断站点名格式是否可用。
 */
function isUsableChromeSite(e) {
  return e.length <= MAX_CHROME_SITE_CHARS && CHROME_SITE_RE.test(e);
}
//@ chunk-29pqxdaf.js:10661-11070 placement
/**
 * 从 Claude in Chrome 工具的错误数据中读出操作的站点（chrome_site/端口），校验格式；无法读出返回 unreadable，非该服务器返回 undefined。
 */
function chromeSiteFromError(client, n) {
  if (
    client.name !== CLAUDE_IN_CHROME_MCP_SERVER_NAME ||
    !isClaudeAiProxyServer(client.config) ||
    !isPlainObject(n) ||
    (n.chrome_site === undefined && n.chrome_site_port === undefined)
  )
    return;
  let { chrome_site: chromeSite, chrome_site_port: chromeSitePort } = n;
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
      n.chrome_offers_site_grant === "true",
  };
}
//@ chunk-29pqxdaf.js:11070-11495 placement
/**
 * 询问前检查 Chrome 站点拒绝规则：能识别站点时按拒绝列表判断；识别不了站点且存在拒绝规则时直接拒绝（安全检查，不可被分类器批准）。
 */
function chromeSiteDenyCheck(e, toolPermissionContext) {
  let chromeSiteRules = collectChromeSiteRules(toolPermissionContext);
  if (e.kind !== "unreadable") {
    let r = chromeSiteDenyDecision(chromeSiteRules, e.site);
    return (
      r && {
        ...r,
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
//@ chunk-29pqxdaf.js:11495-11997 placement
/**
 * 为命名站点生成询问：若 navigate 目标可能离开该站点则注明；可授权时附带"本会话允许该站点"的规则建议，否则禁止"总是允许"。
 */
function chromeSiteAsk(e, tool, o, toolUseContext) {
  if (e.kind !== "named") return;
  let { site } = e;
  let any = navigateTargets(tool, o).some((d) => siteOfActionUrl(d) !== site);
  let i =
    !any &&
    e.offersGrant &&
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
    ...(i
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
//@ chunk-29pqxdaf.js:11997-12104 placement
function isPortString(chromeSitePort) {
  return (
    typeof chromeSitePort === "string" &&
    /^[0-9]{1,5}$/.test(chromeSitePort) &&
    String(Number(chromeSitePort)) === chromeSitePort &&
    Number(chromeSitePort) <= 65535
  );
}
//@ chunk-29pqxdaf.js:12104-12191 placement
/**
 * 把动作 URL 规范成 Chrome 站点名。
 */
function siteOfActionUrl(e) {
  if (typeof e !== "string" || isBackOrForward(e)) return;
  let siteActionUrl = parseSiteActionUrl(e);
  return siteActionUrl && normalizeChromeSite(siteActionUrl.host);
}
//@ chunk-29pqxdaf.js:12191-12391 placement
function navigateTargets(e, n) {
  if (e === "navigate") return [n.url];
  if (e !== "browser_batch" || !Array.isArray(n.actions)) return [];
  return n.actions.flatMap((action) =>
    isPlainObject(action) && action.name === "navigate"
      ? [isPlainObject(action.input) ? action.input.url : undefined]
      : [],
  );
}
//@ chunk-29pqxdaf.js:12391-12690 placement
var CHROME_TOOL_NAMES = new Set(BROWSER_TOOLS.map((e) => e.name));
var ANTHROPIC_CHROMEWORKERDECIDES = "anthropic/chromeWorkerDecides";
var CLAUDECODE_CHROMEJUDGEDSITE = "claudecode/chromeJudgedSite";
var ANTHROPIC_CHROMEOWNTABSUNASKED = "anthropic/chromeOwnTabsUnasked";
var PAGE_READ_TOOLS = new Set([
  "computer",
  "find",
  "form_input",
  "get_page_text",
  "read_page",
  "read_console_messages",
  "read_network_requests",
]);
var TABS_CONTEXT_MCP = "tabs_context_mcp";
var MAX_SITE_LENGTH = 259;
var TAB_READ_TIMEOUT_MS = 5000;
//@ chunk-29pqxdaf.js:12690-18137 placement
/**
 * Claude in Chrome 的工具权限处理器（按会话与客户端平台判定、记录已允许站点）。
 */
function createChromePermissionHandler(toolName, n, o) {
  let r = `${CFC_TOOL_PREFIX}${toolName}`;
  let weakMap = new WeakMap();
  let l = async (i, d) => {
    logChromeToolAttempted(d.options?.messageClientPlatform);
    let p = [];
    let u = false;
    let S = true;
    let w = new Set();
    let y = () => isDiskless() && disklessHostState.peek(d.session)?.host === undefined;
    if (toolName === "file_upload" && y()) return fileUploadDeny(FILE_UPLOAD_UNAVAILABLE);
    if (
      toolName === "file_upload" &&
      n?.[ANTHROPIC_CHROMEUPLOADAUTOMODEONLY] === true &&
      !isChromeToolAutoAllowed(toolName, getToolPermissionContext(d))
    )
      return fileUploadDeny(UPLOAD_NEEDS_APPROVAL);
    if (toolName === "navigate") {
      if (typeof i.url !== "string") return unjudgeableChromeInputDeny("navigate url is not a string");
      p.push(i.url);
    } else if (toolName === "browser_batch") {
      if (i.actions !== undefined && !Array.isArray(i.actions))
        return unjudgeableChromeInputDeny("batch actions is not an array");
      for (let c of Array.isArray(i.actions) ? i.actions : []) {
        if (!isPlainObject(c) || typeof c.name !== "string")
          return unjudgeableChromeInputDeny("unreadable batch item");
        if (c.name === "browser_batch") return unjudgeableChromeInputDeny("nested batch");
        if (!CHROME_TOOL_NAMES.has(c.name)) return unjudgeableChromeInputDeny("unrecognized batch item name");
        w.add(PAGE_READ_TOOLS.has(c.name) && isPlainObject(c.input) ? c.input.tabId : undefined);
        if (c.name === "file_upload")
          return fileUploadDeny(y() ? FILE_UPLOAD_UNAVAILABLE : UPLOAD_IN_BATCH_UNAVAILABLE);
        if (c.name === "navigate") {
          if (!isPlainObject(c.input) || typeof c.input.url !== "string")
            return unjudgeableChromeInputDeny("batch navigate url is not a string");
          p.push(c.input.url);
          u = true;
          if (isBackOrForward(c.input.url)) S = false;
        } else if (
          !CHROME_INPUT_APPROVED_TOOL_NAMES.has(c.name) ||
          (c.input !== undefined && !isPlainObject(c.input)) ||
          !isBrowserHousekeepingCall(c.name, isPlainObject(c.input) ? c.input : {})
        )
          S = false;
      }
    }
    let E =
      n?.[ANTHROPIC_CHROMEWORKERDECIDES] === true &&
      o !== undefined &&
      getToolPermissionContext(d).mode !== "plan";
    let toolPermissionContext = getToolPermissionContext(d);
    let x =
      toolName === "browser_batch" &&
      E &&
      d.agentId === undefined &&
      d.toolUseId !== undefined &&
      !isChromeToolAutoAllowed(toolName, toolPermissionContext) &&
      toolPermissionContext.chromeClassifierFloorEnabled === true &&
      toolPermissionContext.canAutoClassifierRun === true;
    if (x && sessionAllowedSites(toolPermissionContext.alwaysAllowRules.session).size > 0) {
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
    let Z = toolName === "browser_batch" && u && S;
    let filtered = p.filter((c) => !isBackOrForward(c));
    let T;
    let H = new Map();
    if (filtered.length > 0) {
      let toolPermissionContext = getToolPermissionContext(d);
      let chromeSiteRules = collectChromeSiteRules(toolPermissionContext);
      for (let P of filtered) {
        let siteActionUrl = parseSiteActionUrl(P);
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
        let R = chromeSiteDenyDecision(chromeSiteRules, siteActionUrl.host);
        if (R) {
          logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
          return R;
        }
        let O = normalizeChromeSite(siteActionUrl.host);
        if (!chromeSiteRules.allowed.has(O) && !H.has(O)) H.set(O, siteActionUrl.host);
        T ??= siteActionUrl;
      }
      if (T !== undefined && H.size === 0 && (toolName === "navigate" || Z)) {
        if (E && toolName === "navigate" && isUsableChromeSite(hostWithoutPort(T.host)))
          setPendingPermissionNote(
            d,
            i,
            siteJudgementNote(
              T.host,
              d.agentId === undefined,
              toolPermissionContext.alwaysAllowRules.session,
            ),
            r,
          );
        let P = normalizeChromeSite(T.host);
        let source =
          chromeSiteRules.sourceOf.get(P) ?? chromeSiteRules.sourceOf.get(hostWithoutPort(P)) ?? "session";
        if (toolPermissionContext.chromeClassifierFloorEnabled !== true)
          return {
            behavior: "allow",
            updatedInput: i,
            decisionReason: {
              type: "rule",
              rule: {
                source,
                ruleBehavior: "allow",
                ruleValue: {
                  toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
                  ruleContent: T.host,
                },
              },
            },
          };
        return {
          behavior: "ask",
          message: "Claude in Chrome requires permission.",
          updatedInput: i,
          decisionReason: {
            type: "other",
            reason: `Claude in Chrome action on ${T.host}`,
          },
          metadata: {
            command: {
              name: r,
              chrome: {
                ...T,
                domainAllowed: true,
              },
            },
          },
        };
      }
    }
    if (CHROME_INPUT_APPROVED_TOOL_NAMES.has(toolName) && isBrowserHousekeepingCall(toolName, i))
      return {
        behavior: "allow",
        updatedInput: i,
      };
    let toolPermissionContext_2 = getToolPermissionContext(d);
    if (
      toolName === TABS_CONTEXT_MCP &&
      n?.[ANTHROPIC_CHROMEOWNTABSUNASKED] === true &&
      i.createIfEmpty === true &&
      Object.keys(i).length === 1 &&
      d.toolUseId !== undefined &&
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
        updatedInput: i,
      };
    if (E) {
      let c =
        toolName === "browser_batch"
          ? x && w.size === 1 && Object.keys(i).length === 1 && [...w][0]
          : !["navigate", "file_upload"].includes(toolName) &&
            !CHROME_INPUT_APPROVED_TOOL_NAMES.has(toolName) &&
            i.tabId;
      let A =
        typeof c === "number" && d.toolUseId !== undefined && d.permissionRound !== undefined
          ? await o?.(c, d.abortController.signal)
          : undefined;
      let P = A === undefined ? undefined : parseSiteActionUrl(A);
      let h =
        toolName === "navigate" ? T : P !== undefined && P.host.length <= MAX_SITE_LENGTH ? P : undefined;
      let toolPermissionContext = getToolPermissionContext(d);
      let chromeSiteRules = collectChromeSiteRules(toolPermissionContext);
      let ne = h && chromeSiteDenyDecision(chromeSiteRules, h.host);
      if (toolPermissionContext.mode === "plan");
      else if (x && sessionAllowedSites(toolPermissionContext.alwaysAllowRules.session).size > 0)
        return l(i, d);
      else if (A !== undefined && h === undefined) {
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
      } else if (ne) {
        logFeatureSad("chrome_permission_prompt", "domain_rule_denied");
        return ne;
      } else if (h !== undefined && isUsableChromeSite(hostWithoutPort(h.host))) {
        if (A !== undefined) logFeatureOk("chrome_permission_prompt");
        if (toolName !== "browser_batch")
          setPendingPermissionNote(
            d,
            i,
            siteJudgementNote(
              h.host,
              d.agentId === undefined,
              toolPermissionContext.alwaysAllowRules.session,
            ),
            r,
          );
        let oe = chromeSiteRules.allowed.has(normalizeChromeSite(h.host));
        let re =
          !oe &&
          toolPermissionContext.chromeClassifierFloorEnabled === true &&
          toolPermissionContext.canAutoClassifierRun === true;
        if (re) weakMap.set(i, h.host);
        let ie = toolName === "browser_batch" ? `in the ${h.host} tab` : `on ${h.host}`;
        return {
          behavior: "ask",
          message: "Claude in Chrome requires permission.",
          updatedInput: i,
          suggestions: re
            ? [
                {
                  type: "addRules",
                  rules: [
                    {
                      toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
                      ruleContent: h.host,
                    },
                  ],
                  behavior: "allow",
                  destination: "session",
                },
              ]
            : undefined,
          decisionReason: {
            type: "other",
            reason: `Claude in Chrome action ${ie}`,
          },
          metadata: {
            command: {
              name: r,
              description: `Allow Claude in Chrome to ${describeBrowserToolAction(toolName, i)} ${ie}?`,
              chrome: {
                ...h,
                domainAllowed: oe && toolName !== "browser_batch",
              },
            },
          },
        };
      } else if (A !== undefined) logFeatureSad("chrome_permission_prompt", "tab_site_not_plain");
    }
    let we = !isDiskless();
    return {
      behavior: "passthrough",
      message: "Claude in Chrome requires permission.",
      suggestions:
        H.size === 1 && (toolName === "navigate" || Z) && we
          ? [
              {
                type: "addRules",
                rules: [...H.values()].map((ruleContent) => ({
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
    coerceInput: (i) => {
      let d = stripCyclesAndHiddenKeys(i);
      return d === i
        ? null
        : {
            input: d,
            shapeClass: "chrome_host_only_args_removed",
          };
    },
    checkPermissions: l,
    suggestedAllowRule: (i, d) =>
      i.toolName === CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL &&
      i.ruleContent !== undefined &&
      i.ruleContent === weakMap.get(d),
    suppressesAlwaysAllowRule: () => true,
    ignoresWholeToolAllowRule: () => true,
    excludedFromAutoModeAllowlist: () => true,
    excludedFromModeBypassAllow: () => true,
  };
}
//@ chunk-29pqxdaf.js:18137-18970 placement
/**
 * 调用 tabs_context_mcp 读取指定 tabId 的 URL（带超时）；读不到时按原因（未列出、超时、无标签组、非 JSON、需批准等）记 chrome_permission_prompt 埋点。
 */
async function readTabUrl(e, n, o) {
  let r = AbortSignal.timeout(TAB_READ_TIMEOUT_MS);
  let s = "";
  try {
    let l = await e(
      TABS_CONTEXT_MCP,
      {
        createIfEmpty: false,
      },
      AbortSignal.any([o, r]),
    );
    let i = Array.isArray(l) ? l[0] : undefined;
    s = isPlainObject(i) ? String(i.text) : String(l);
    let d = jsonParse(s);
    let availableTabs = isPlainObject(d) ? d.availableTabs : undefined;
    let u = Array.isArray(availableTabs)
      ? availableTabs.find((availableTab) => isPlainObject(availableTab) && availableTab.tabId === n)
      : undefined;
    if (isPlainObject(u) && typeof u.url === "string" && u.url) return u.url;
    logFeatureSad("chrome_permission_prompt", "tab_url_unresolved_tab_not_listed");
  } catch (error) {
    if (!o.aborted) {
      logForDebugging(`Claude in Chrome: the tab read failed: ${String(error)}`, {
        level: "error",
      });
      logFeatureSad(
        "chrome_permission_prompt",
        r.aborted
          ? "tab_url_unresolved_timed_out"
          : error instanceof SyntaxError
            ? s.includes("createIfEmpty")
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
//@ chunk-29pqxdaf.js:18970-19073 placement
function siteJudgementNote(host, n, session = []) {
  return {
    site: host,
    personLeftItToClassifier:
      (getAccountSetPermissionMode() === "auto" && isAutoModeActive()) ||
      (n && sessionAllowedSites(session).has(normalizeChromeSite(host))),
  };
}
//@ chunk-29pqxdaf.js:19073-19350 placement
/**
 * 若本次调用由用户（或用户交给分类器）批准，返回权限阶段记录的站点信息用作结果元数据。
 */
function judgedSiteMeta({ permissionPhase, toolUseId, allowGivenBy }) {
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
//@ chunk-29pqxdaf.js:19350-19437 placement
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
//@ chunk-29pqxdaf.js:19437-19608 placement
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
//@ chunk-29pqxdaf.js:19608-19719 placement
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
//@ chunk-29pqxdaf.js:19719-19995 placement
function unjudgeableChromeInputDeny(e) {
  logFeatureBad("chrome_permission_prompt", "unjudgeable_chrome_input");
  return {
    behavior: "deny",
    message: "Can't run this Claude in Chrome action: its input couldn't be safely checked.",
    decisionReason: {
      type: "safetyCheck",
      reason: `Claude in Chrome: ${e}`,
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
};
