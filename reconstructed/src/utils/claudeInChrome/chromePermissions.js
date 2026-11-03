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
  d5n,
  u5n,
  normalizeChromeSite,
  hostWithoutPort,
} from "./chromePermissionRules.js";
import { isHookOrPluginSteered } from "../agentContext.js";
import { sCe, Goe } from "./browserToolSchemas.js";
import { logChromeToolAttempted } from "./telemetry.js";
import { isDiskless } from "../../bootstrap/state.js";
import {
  x$e,
  ANTHROPIC_CHROMEUPLOADAUTOMODEONLY,
} from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { ise, stripCyclesAndHiddenKeys } from "../permissions/browserComputerUseTools.js";
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
var CLAUDECODE_CHROMESITE = "claudecode/chromeSite",
  me = 253,
  Y = /^[a-z0-9._-]+$/,
  Ne = /^\[[0-9a-f:.]+\]$/;
//@ chunk-29pqxdaf.js:10616-10661 placement
function z(e) {
  return e.length <= me && Y.test(e);
}
/**
 * 从 Claude in Chrome 工具的错误数据中读出操作的站点（chrome_site/端口），校验格式；无法读出返回 unreadable，非该服务器返回 undefined。
 */
//@ chunk-29pqxdaf.js:10661-11070 placement
function chromeSiteFromError(e, n) {
  if (
    e.name !== CLAUDE_IN_CHROME_MCP_SERVER_NAME ||
    !isClaudeAiProxyServer(e.config) ||
    !isPlainObject(n) ||
    (n.chrome_site === void 0 && n.chrome_site_port === void 0)
  )
    return;
  let { chrome_site: chrome_site, chrome_site_port: chrome_site_port } = n;
  if (
    typeof chrome_site !== "string" ||
    chrome_site.length > me ||
    !(Y.test(chrome_site) || Ne.test(chrome_site)) ||
    fe(`https://${chrome_site}`) !== chrome_site ||
    (chrome_site_port !== void 0 && !isPortString(chrome_site_port))
  )
    return { kind: "unreadable" };
  return {
    kind: "named",
    site: chrome_site_port === void 0 ? chrome_site : `${chrome_site}:${chrome_site_port}`,
    offersGrant: chrome_site_port === void 0 && Y.test(chrome_site) && n.chrome_offers_site_grant === "true",
  };
}
/**
 * 询问前检查 Chrome 站点拒绝规则：能识别站点时按拒绝列表判断；识别不了站点且存在拒绝规则时直接拒绝（安全检查，不可被分类器批准）。
 */
//@ chunk-29pqxdaf.js:11070-11495 placement
function chromeSiteDenyCheck(e, n) {
  let o = collectChromeSiteRules(n);
  if (e.kind !== "unreadable") {
    let r = chromeSiteDenyDecision(o, e.site);
    return r && { ...r, decideLocation: "pre-ask" };
  }
  if (o.denied.size === 0) return;
  return {
    behavior: "deny",
    message:
      "Claude in Chrome could not tell which site this call would act on, so it could not check the sites that are denied.",
    decisionReason: {
      type: "safetyCheck",
      reason: "Claude in Chrome: unreadable site",
      classifierApprovable: !1,
    },
    decideLocation: "pre-ask",
  };
}
/**
 * 为命名站点生成询问：若 navigate 目标可能离开该站点则注明；可授权时附带"本会话允许该站点"的规则建议，否则禁止"总是允许"。
 */
//@ chunk-29pqxdaf.js:11495-11997 placement
function chromeSiteAsk(e, n, o, r) {
  if (e.kind !== "named") return;
  let { site: site } = e,
    any = navigateTargets(n, o).some((d) => fe(d) !== site),
    i = !any && e.offersGrant && !isHookOrPluginSteered(r) && r.forRemoteExecution !== !0;
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
              rules: [{ toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL, ruleContent: site }],
              behavior: "allow",
              destination: "session",
            },
          ],
        }
      : { suppressAlwaysAllowRule: !0 }),
  };
}
//@ chunk-29pqxdaf.js:11997-12104 placement
function isPortString(e) {
  return typeof e === "string" && /^[0-9]{1,5}$/.test(e) && String(Number(e)) === e && Number(e) <= 65535;
}
//@ chunk-29pqxdaf.js:12104-12191 placement
function fe(e) {
  if (typeof e !== "string" || d5n(e)) return;
  let n = u5n(e);
  return n && normalizeChromeSite(n.host);
}
//@ chunk-29pqxdaf.js:12191-12391 placement
function navigateTargets(e, n) {
  if (e === "navigate") return [n.url];
  if (e !== "browser_batch" || !Array.isArray(n.actions)) return [];
  return n.actions.flatMap((action) =>
    isPlainObject(action) && action.name === "navigate"
      ? [isPlainObject(action.input) ? action.input.url : void 0]
      : [],
  );
}
//@ chunk-29pqxdaf.js:12391-12690 placement
var CHROME_TOOL_NAMES = new Set(sCe.map((e) => e.name)),
  ANTHROPIC_CHROMEWORKERDECIDES = "anthropic/chromeWorkerDecides",
  CLAUDECODE_CHROMEJUDGEDSITE = "claudecode/chromeJudgedSite",
  ANTHROPIC_CHROMEOWNTABSUNASKED = "anthropic/chromeOwnTabsUnasked",
  PAGE_READ_TOOLS = new Set([
    "computer",
    "find",
    "form_input",
    "get_page_text",
    "read_page",
    "read_console_messages",
    "read_network_requests",
  ]),
  TABS_CONTEXT_MCP = "tabs_context_mcp",
  MAX_SITE_LENGTH = 259,
  TAB_READ_TIMEOUT_MS = 5000;
/**
 * Claude in Chrome 的工具权限处理器（按会话与客户端平台判定、记录已允许站点）。
 */
//@ chunk-29pqxdaf.js:12690-18137 placement
function createChromePermissionHandler(e, n, o) {
  let r = `${CFC_TOOL_PREFIX}${e}`,
    weakMap = new WeakMap(),
    l = async (i, d) => {
      logChromeToolAttempted(d.options?.messageClientPlatform);
      let p = [],
        u = !1,
        S = !0,
        w = new Set(),
        y = () => isDiskless() && x$e.peek(d.session)?.host === void 0;
      if (e === "file_upload" && y()) return fileUploadDeny(FILE_UPLOAD_UNAVAILABLE);
      if (
        e === "file_upload" &&
        n?.[ANTHROPIC_CHROMEUPLOADAUTOMODEONLY] === !0 &&
        !isChromeToolAutoAllowed(e, getToolPermissionContext(d))
      )
        return fileUploadDeny(UPLOAD_NEEDS_APPROVAL);
      if (e === "navigate") {
        if (typeof i.url !== "string") return unjudgeableChromeInputDeny("navigate url is not a string");
        p.push(i.url);
      } else if (e === "browser_batch") {
        if (i.actions !== void 0 && !Array.isArray(i.actions))
          return unjudgeableChromeInputDeny("batch actions is not an array");
        for (let c of Array.isArray(i.actions) ? i.actions : []) {
          if (!isPlainObject(c) || typeof c.name !== "string")
            return unjudgeableChromeInputDeny("unreadable batch item");
          if (c.name === "browser_batch") return unjudgeableChromeInputDeny("nested batch");
          if (!CHROME_TOOL_NAMES.has(c.name))
            return unjudgeableChromeInputDeny("unrecognized batch item name");
          if (
            (w.add(PAGE_READ_TOOLS.has(c.name) && isPlainObject(c.input) ? c.input.tabId : void 0),
            c.name === "file_upload")
          )
            return fileUploadDeny(y() ? FILE_UPLOAD_UNAVAILABLE : UPLOAD_IN_BATCH_UNAVAILABLE);
          if (c.name === "navigate") {
            if (!isPlainObject(c.input) || typeof c.input.url !== "string")
              return unjudgeableChromeInputDeny("batch navigate url is not a string");
            if ((p.push(c.input.url), (u = !0), d5n(c.input.url))) S = !1;
          } else if (
            !Goe.has(c.name) ||
            (c.input !== void 0 && !isPlainObject(c.input)) ||
            !ise(c.name, isPlainObject(c.input) ? c.input : {})
          )
            S = !1;
        }
      }
      let E =
          n?.[ANTHROPIC_CHROMEWORKERDECIDES] === !0 &&
          o !== void 0 &&
          getToolPermissionContext(d).mode !== "plan",
        M = getToolPermissionContext(d),
        x =
          e === "browser_batch" &&
          E &&
          d.agentId === void 0 &&
          d.toolUseId !== void 0 &&
          !isChromeToolAutoAllowed(e, M) &&
          M.chromeClassifierFloorEnabled === !0 &&
          M.canAutoClassifierRun === !0;
      if (x && J(M.alwaysAllowRules.session).size > 0)
        return (
          logFeatureSad("chrome_permission_prompt", "batch_one_by_one"),
          {
            behavior: "deny",
            message: BROWSER_BATCH_UNAVAILABLE,
            decisionReason: {
              type: "safetyCheck",
              reason: "Claude in Chrome: this call does not run in auto mode, so each action is its own call",
              classifierApprovable: !1,
            },
          }
        );
      let Z = e === "browser_batch" && u && S,
        filtered = p.filter((c) => !d5n(c)),
        T,
        H = new Map();
      if (filtered.length > 0) {
        let c = getToolPermissionContext(d),
          A = collectChromeSiteRules(c);
        for (let P of filtered) {
          let h = u5n(P);
          if (!h)
            return (
              logFeatureBad("chrome_permission_prompt", "non_web_url"),
              {
                behavior: "deny",
                message:
                  "Can't interact with browser-internal or unparseable URLs. Navigate to a web page first.",
                decisionReason: {
                  type: "safetyCheck",
                  reason: "Claude in Chrome: non-web or unparseable URL",
                  classifierApprovable: !1,
                },
              }
            );
          let R = chromeSiteDenyDecision(A, h.host);
          if (R) return (logFeatureSad("chrome_permission_prompt", "domain_rule_denied"), R);
          let O = normalizeChromeSite(h.host);
          if (!A.allowed.has(O) && !H.has(O)) H.set(O, h.host);
          T ??= h;
        }
        if (T !== void 0 && H.size === 0 && (e === "navigate" || Z)) {
          if (E && e === "navigate" && z(hostWithoutPort(T.host)))
            setPendingPermissionNote(
              d,
              i,
              siteJudgementNote(T.host, d.agentId === void 0, c.alwaysAllowRules.session),
              r,
            );
          let P = normalizeChromeSite(T.host),
            h = A.sourceOf.get(P) ?? A.sourceOf.get(hostWithoutPort(P)) ?? "session";
          if (c.chromeClassifierFloorEnabled !== !0)
            return {
              behavior: "allow",
              updatedInput: i,
              decisionReason: {
                type: "rule",
                rule: {
                  source: h,
                  ruleBehavior: "allow",
                  ruleValue: { toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL, ruleContent: T.host },
                },
              },
            };
          return {
            behavior: "ask",
            message: "Claude in Chrome requires permission.",
            updatedInput: i,
            decisionReason: { type: "other", reason: `Claude in Chrome action on ${T.host}` },
            metadata: { command: { name: r, chrome: { ...T, domainAllowed: !0 } } },
          };
        }
      }
      if (Goe.has(e) && ise(e, i)) return { behavior: "allow", updatedInput: i };
      let ee = getToolPermissionContext(d);
      if (
        e === TABS_CONTEXT_MCP &&
        n?.[ANTHROPIC_CHROMEOWNTABSUNASKED] === !0 &&
        i.createIfEmpty === !0 &&
        Object.keys(i).length === 1 &&
        d.toolUseId !== void 0 &&
        ee.mode === "acceptEdits" &&
        getAccountSetPermissionMode() === "acceptEdits" &&
        getMcpPermissionModeOverride({ mcpInfo: { serverName: CLAUDE_IN_CHROME_MCP_SERVER_NAME } }, ee) ===
          void 0
      )
        return { behavior: "allow", updatedInput: i };
      if (E) {
        let c =
            e === "browser_batch"
              ? x && w.size === 1 && Object.keys(i).length === 1 && [...w][0]
              : !["navigate", "file_upload"].includes(e) && !Goe.has(e) && i.tabId,
          A =
            typeof c === "number" && d.toolUseId !== void 0 && d.permissionRound !== void 0
              ? await o?.(c, d.abortController.signal)
              : void 0,
          P = A === void 0 ? void 0 : u5n(A),
          h = e === "navigate" ? T : P !== void 0 && P.host.length <= MAX_SITE_LENGTH ? P : void 0,
          R = getToolPermissionContext(d),
          O = collectChromeSiteRules(R),
          ne = h && chromeSiteDenyDecision(O, h.host);
        if (R.mode === "plan");
        else if (x && J(R.alwaysAllowRules.session).size > 0) return l(i, d);
        else if (A !== void 0 && h === void 0)
          return (
            logFeatureBad("chrome_permission_prompt", "non_web_tab_url"),
            {
              behavior: "deny",
              message:
                "Can't interact with browser-internal or unparseable URLs. Navigate to a web page first.",
              decisionReason: {
                type: "safetyCheck",
                reason: "Claude in Chrome: non-web or unparseable tab URL",
                classifierApprovable: !1,
              },
            }
          );
        else if (ne) return (logFeatureSad("chrome_permission_prompt", "domain_rule_denied"), ne);
        else if (h !== void 0 && z(hostWithoutPort(h.host))) {
          if (A !== void 0) logFeatureOk("chrome_permission_prompt");
          if (e !== "browser_batch")
            setPendingPermissionNote(
              d,
              i,
              siteJudgementNote(h.host, d.agentId === void 0, R.alwaysAllowRules.session),
              r,
            );
          let oe = O.allowed.has(normalizeChromeSite(h.host)),
            re = !oe && R.chromeClassifierFloorEnabled === !0 && R.canAutoClassifierRun === !0;
          if (re) weakMap.set(i, h.host);
          let ie = e === "browser_batch" ? `in the ${h.host} tab` : `on ${h.host}`;
          return {
            behavior: "ask",
            message: "Claude in Chrome requires permission.",
            updatedInput: i,
            suggestions: re
              ? [
                  {
                    type: "addRules",
                    rules: [{ toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL, ruleContent: h.host }],
                    behavior: "allow",
                    destination: "session",
                  },
                ]
              : void 0,
            decisionReason: { type: "other", reason: `Claude in Chrome action ${ie}` },
            metadata: {
              command: {
                name: r,
                description: `Allow Claude in Chrome to ${describeBrowserToolAction(e, i)} ${ie}?`,
                chrome: { ...h, domainAllowed: oe && e !== "browser_batch" },
              },
            },
          };
        } else if (A !== void 0) logFeatureSad("chrome_permission_prompt", "tab_site_not_plain");
      }
      let we = !isDiskless();
      return {
        behavior: "passthrough",
        message: "Claude in Chrome requires permission.",
        suggestions:
          H.size === 1 && (e === "navigate" || Z) && we
            ? [
                {
                  type: "addRules",
                  rules: [...H.values()].map((c) => ({
                    toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
                    ruleContent: c,
                  })),
                  behavior: "allow",
                  destination: "session",
                },
              ]
            : void 0,
      };
    };
  return {
    coerceInput: (i) => {
      let d = stripCyclesAndHiddenKeys(i);
      return d === i ? null : { input: d, shapeClass: "chrome_host_only_args_removed" };
    },
    checkPermissions: l,
    suggestedAllowRule: (i, d) =>
      i.toolName === CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL &&
      i.ruleContent !== void 0 &&
      i.ruleContent === weakMap.get(d),
    suppressesAlwaysAllowRule: () => !0,
    ignoresWholeToolAllowRule: () => !0,
    excludedFromAutoModeAllowlist: () => !0,
    excludedFromModeBypassAllow: () => !0,
  };
}
/**
 * 调用 tabs_context_mcp 读取指定 tabId 的 URL（带超时）；读不到时按原因（未列出、超时、无标签组、非 JSON、需批准等）记 chrome_permission_prompt 埋点。
 */
//@ chunk-29pqxdaf.js:18137-18970 placement
async function readTabUrl(e, n, o) {
  let timeout = AbortSignal.timeout(TAB_READ_TIMEOUT_MS),
    s = "";
  try {
    let l = await e(TABS_CONTEXT_MCP, { createIfEmpty: !1 }, AbortSignal.any([o, timeout])),
      i = Array.isArray(l) ? l[0] : void 0;
    s = isPlainObject(i) ? String(i.text) : String(l);
    let d = jsonParse(s),
      p = isPlainObject(d) ? d.availableTabs : void 0,
      u = Array.isArray(p) ? p.find((S) => isPlainObject(S) && S.tabId === n) : void 0;
    if (isPlainObject(u) && typeof u.url === "string" && u.url) return u.url;
    logFeatureSad("chrome_permission_prompt", "tab_url_unresolved_tab_not_listed");
  } catch (error) {
    if (!o.aborted)
      (logForDebugging(`Claude in Chrome: the tab read failed: ${String(error)}`, { level: "error" }),
        logFeatureSad(
          "chrome_permission_prompt",
          timeout.aborted
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
        ));
  }
  return;
}
//@ chunk-29pqxdaf.js:18970-19073 placement
function siteJudgementNote(e, n, o = []) {
  return {
    site: e,
    personLeftItToClassifier:
      (getAccountSetPermissionMode() === "auto" && isAutoModeActive()) ||
      (n && J(o).has(normalizeChromeSite(e))),
  };
}
/**
 * 若本次调用由用户（或用户交给分类器）批准，返回权限阶段记录的站点信息用作结果元数据。
 */
//@ chunk-29pqxdaf.js:19073-19350 placement
function judgedSiteMeta({
  permissionPhase: permissionPhase,
  toolUseId: toolUseId,
  allowGivenBy: allowGivenBy,
}) {
  let r = permissionPhase?.pipeline !== void 0 ? permissionPhase.checked?.note : void 0,
    s = allowGivenBy?.toolUseId === toolUseId ? allowGivenBy?.approver : void 0;
  return isPlainObject(r) &&
    typeof r.site === "string" &&
    (s === "user" || (s === "classifier" && r.personLeftItToClassifier === !0))
    ? { [CLAUDECODE_CHROMEJUDGEDSITE]: normalizeChromeSite(r.site) }
    : void 0;
}
//@ chunk-29pqxdaf.js:19350-19437 placement
function J(e = []) {
  return collectChromeSiteRules({ alwaysAllowRules: { session: e }, alwaysDenyRules: {} }).allowed;
}
//@ chunk-29pqxdaf.js:19437-19608 placement
function fileUploadDeny(e) {
  return {
    behavior: "deny",
    message: e,
    decisionReason: {
      type: "safetyCheck",
      reason: "Claude in Chrome: a file_upload that cannot be served",
      classifierApprovable: !1,
    },
  };
}
//@ chunk-29pqxdaf.js:19608-19719 placement
function isChromeToolAutoAllowed(e, n) {
  return (
    isAutoAllowedInMode(
      {
        mcpInfo: { serverName: CLAUDE_IN_CHROME_MCP_SERVER_NAME, toolName: e },
        excludedFromModeBypassAllow: () => !0,
      },
      n,
    ) === "auto"
  );
}
//@ chunk-29pqxdaf.js:19719-19995 placement
function unjudgeableChromeInputDeny(e) {
  return (
    logFeatureBad("chrome_permission_prompt", "unjudgeable_chrome_input"),
    {
      behavior: "deny",
      message: "Can't run this Claude in Chrome action: its input couldn't be safely checked.",
      decisionReason: { type: "safetyCheck", reason: `Claude in Chrome: ${e}`, classifierApprovable: !1 },
    }
  );
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
