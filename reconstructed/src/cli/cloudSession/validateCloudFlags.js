/**
 * cli/cloudSession/validateCloudFlags.ts
 *
 * 2.1.316 新增：校验云会话相关命令行参数（--attach-serve、会话 id、URL 主机、1M 上下文提示）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (11)
 * attribution: placement 11
 */
import { extractRepoSlug } from "../eagerFlags.js";
import {
  truncateCloudSessionLabel,
  environmentFlagErrorPrefix,
  isStreamJsonRemoteMode,
  isPrintNonStreamMode,
  validateCloudSessionFlags,
} from "../cloudSessionArgs.js";
import { noopAnthropicRepoHint } from "../../utils/github/anthropicRepos.js";
import { isCcpoolId } from "../../utils/teleport/environmentSelection.js";
import { parseEnvironmentSelector } from "../../utils/teleport/cloudEnvironments.js";
import { BYPASS_REFUSAL_MESSAGE, parseTriBoolFlag } from "./launchFlags.js";
import { cliCarriesSessionConfig } from "../../utils/sessionConfigFlags.js";
import { _pendingSSH } from "../../main.js";
import { agentMcpSpecsToScopedConfigs } from "../../tools/AgentTool/loadAgentsDir.js";
import { createSystemMessage } from "../../utils/messages.js";
import { plural } from "../../utils/stringUtils.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "../../utils/claudeInChrome/common.js";
import { getSessionId, onSessionSwitch } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { is1mContextDisabled, DEFAULT_CONTEXT_WINDOW } from "../../utils/model/contextWindow1m.js";
import { isAutoCompactEnabled } from "../../services/compact/compactSettings.js";
import { isUnresolvedInferenceProfile } from "../../utils/model/bedrock.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { getAutoCompactWindow } from "../../services/compact/autoCompact.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { isHipaaOrg, BETA_LONG_CONTEXT } from "../../utils/betas.js";
import { env } from "../../utils/env.js";
import { getCatalogEntry } from "../../utils/model/modelCatalog.js";
import { strip1mSuffix } from "../../utils/model/modelIds.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { isPrivateNetworkHost } from "../../services/mcp/config.js";

//@ chunk-3wek6r2k.js:49945-56846 placement
/**
 * 解析 --cloud/--remote/--teleport/--attach-serve/--environment/--project 等启动选项组合，校验互斥并得出云会话启动方案。
 */
async function resolveCloudLaunchOptions(e, o) {
  let teleport = e.teleport ?? null;
  let r = e.cloud ?? e.remote;
  let u = null;
  let p = u === "named" && typeof e.resume === "string" ? e.resume : r;
  let h = p === true ? "" : (p ?? null);
  let S = false;
  if (e.attachServe !== undefined) {
    if (p !== undefined)
      return {
        ok: false,
        error: "Error: --attach-serve cannot be combined with --cloud/--remote",
      };
    if (extractRepoSlug(e.attachServe) === null)
      return {
        ok: false,
        error: `Error: --attach-serve expects a session id (cse_...), got ${truncateCloudSessionLabel(e.attachServe)}`,
      };
    h = e.attachServe;
    S = true;
  }
  let y = typeof p === "string" ? extractRepoSlug(p) : S ? extractRepoSlug(e.attachServe ?? "") : null;
  let M = typeof p === "string" && y === null && !e.initOnly && /^\s*\S+\s*$/.test(p) ? p : undefined;
  let E = null;
  let w = null;
  let P = false;
  let A = null;
  let poolOnBranch = null;
  let q = e.noMonorepo === true ? noopAnthropicRepoHint() : undefined;
  let ce = false;
  let pe = e.environment ?? e.pool ?? q;
  if (pe !== undefined) {
    let { prefix, flag } = environmentFlagErrorPrefix(q !== undefined);
    let error = `Error: --environment expects a self-hosted environment id (ccpool_...), got ${truncateCloudSessionLabel(pe)}`;
    if ((e.environment === undefined || true) && !isCcpoolId(pe))
      return {
        ok: false,
        error,
      };
    let environmentSelector = parseEnvironmentSelector(pe);
    if (environmentSelector === null)
      return {
        ok: false,
        error,
      };
    if (e.resume || e.continue || teleport)
      return {
        ok: false,
        error: `${prefix}${flag} cannot be combined with --resume, --continue, or --teleport`,
      };
    if (e.initOnly || o.sessionId)
      return {
        ok: false,
        error: `${prefix}${flag} cannot be combined with ${e.initOnly ? "--init-only" : "--session-id"}`,
      };
    if (y !== null)
      return {
        ok: false,
        error:
          "Error: --environment creates a new session; it cannot be combined with --cloud <session_id|url>",
      };
    if (
      environmentSelector.kind === "pool" &&
      (e.print || o.nonInteractive) &&
      typeof p === "string" &&
      p.length > 0
    )
      return {
        ok: false,
        error: `${prefix}non-interactive ${flag} reads the prompt from the positional or stdin; drop --cloud/--remote <description>.`,
      };
    if ((e.print || o.nonInteractive) && o.outputFormat === "stream-json")
      return {
        ok: false,
        error: `${prefix}${flag} does not support --output-format stream-json`,
      };
    if (typeof p === "string" && p.length > 0 && typeof o.prompt === "string" && o.prompt.length > 0)
      return {
        ok: false,
        error: `${prefix}${flag} with --cloud <description> cannot also take a positional prompt. Pass the task as the description, or drop --cloud.`,
      };
    if (environmentSelector.kind === "pool") E = environmentSelector.poolId;
    else w = environmentSelector;
    if (h === null || h === "") {
      let prompt = typeof o.prompt === "string" ? o.prompt : "";
      if (!(e.print || o.nonInteractive) && extractRepoSlug(prompt) !== null)
        return {
          ok: false,
          error: `${prefix}${flag} creates a new session; it cannot be combined with a session id or url`,
        };
      h = E === null ? "" : prompt;
      P = E !== null;
    }
  }
  let ref = e.ref;
  if (ref !== undefined) {
    if (E === null && h === null)
      return {
        ok: false,
        error: `Error: --ref sets the base branch for a cloud session; pass --cloud or --environment${e.project !== undefined ? " \u2014 --project no longer starts cloud sessions" : ""}`,
      };
    if (y !== null)
      return {
        ok: false,
        error:
          "Error: --ref sets the base for a new cloud session; it cannot be combined with --cloud <session_id|url>",
      };
    if (ref === "")
      return {
        ok: false,
        error: "Error: --ref requires a non-empty branch, tag, or SHA",
      };
    A = ref;
  }
  let onBranch = e.onBranch;
  if (onBranch !== undefined) {
    if (E === null && h === null)
      return {
        ok: false,
        error: `Error: --on-branch resumes work on a branch in a cloud session; pass --cloud or --environment${e.project !== undefined ? " \u2014 --project no longer starts cloud sessions" : ""}`,
      };
    if (y !== null)
      return {
        ok: false,
        error:
          "Error: --on-branch resumes a branch in a new cloud session; it cannot be combined with --cloud <session_id|url>",
      };
    if (A !== null)
      return {
        ok: false,
        error: "Error: --on-branch and --ref both set the cloud session's base branch; pass one or the other",
      };
    if (onBranch === "")
      return {
        ok: false,
        error: "Error: --on-branch requires a non-empty branch name",
      };
    poolOnBranch = onBranch;
  }
  let $e = false;
  let ve = null;
  let pt = null;
  let correlationId = null;
  let correlationId_2 = e.correlationId;
  if (correlationId_2 !== undefined) {
    if (E === null)
      return {
        ok: false,
        error: "Error: --correlation-id requires --environment",
      };
    if (!/^[\x21-\x2C\x2E-\x7E][\x21-\x7E]{0,511}$/.test(correlationId_2))
      return {
        ok: false,
        error:
          'Error: --correlation-id must be 1-512 printable ASCII characters with no spaces and no leading "-"',
      };
    correlationId = correlationId_2;
  }
  let mt =
    h !== null &&
    E === null &&
    ve === null &&
    isStreamJsonRemoteMode({
      print: Boolean(e.print),
      initOnly: Boolean(e.initOnly),
      nonInteractive: o.nonInteractive,
      inputFormat: o.inputFormat,
      outputFormat: o.outputFormat,
      hasSdkUrl: o.hasSdkUrl,
    }) &&
    (await (S ? o.isViolinWoodEnabled : o.isConnectedSessionsEnabled)().catch(() => false));
  let Le = q !== undefined;
  let et =
    o.cloudPrintEnabled &&
    h !== null &&
    (typeof p !== "string" || p.trim() !== "" || Le) &&
    (E === null || Le) &&
    ve === null &&
    y === null &&
    M === undefined &&
    isPrintNonStreamMode({
      print: Boolean(e.print),
      initOnly: Boolean(e.initOnly),
      hasSdkUrl: o.hasSdkUrl,
      outputFormat: o.outputFormat,
    });
  if (et && Le) {
    h = "";
    P = false;
  }
  if (
    et &&
    typeof p === "string" &&
    p.trim() !== "" &&
    typeof o.prompt === "string" &&
    o.prompt.trim() !== ""
  )
    return {
      ok: false,
      error: `Error: the task was given twice: as --cloud's value (${truncateCloudSessionLabel(p)}) and as the prompt. With --print, give it in one place; to name the session, use -n/--name.`,
    };
  if (
    et &&
    (Boolean(e.dangerouslySkipPermissions) ||
      e.permissionMode === "bypassPermissions" ||
      e.inheritPermissionMode === "bypassPermissions")
  )
    return {
      ok: false,
      error: BYPASS_REFUSAL_MESSAGE,
    };
  if (S && !mt)
    return {
      ok: false,
      error:
        "Error: --attach-serve requires the serve-only headless launch (non-interactive, --input-format stream-json and --output-format stream-json) and an enabled headless cloud client; it never falls back to a plain attach",
    };
  let triBoolFlag = parseTriBoolFlag(e.forwardHomeSettings);
  if (triBoolFlag === "invalid")
    return {
      ok: false,
      error: `Error: --forward-home-settings takes true or false, not ${truncateCloudSessionLabel(String(e.forwardHomeSettings))}.`,
    };
  let forwardHomeSettings = triBoolFlag !== false;
  let homeSettingsConsent = triBoolFlag === true ? "forward" : null;
  if (triBoolFlag !== null && E === null && h === null && y === null)
    return {
      ok: false,
      error:
        "Error: --forward-home-settings says whether this machine's settings go into a cloud session; pass --cloud (a new session, or one to attach to) or --environment",
    };
  let persistentVolume = false;
  let persistentVolumeFromSessionId = null;
  let monorepo = false;
  if (h !== null) {
    let x = validateCloudSessionFlags({
      print: e.print,
      nonInteractive: o.nonInteractive,
      continue: e.continue,
      resume: u === null ? e.resume : undefined,
      fromPr: e.fromPr,
      hasTeleport: teleport !== null,
      hasConnect: o.hasConnect,
      hasSSH: o.hasSSH,
      hasAssistant: false,
      hasPool: E !== null,
      hasEnvironmentQuery: w !== null,
      isChosenByNoMonorepo: q !== undefined,
      isCloudAttach: y !== null,
      headlessCloud: mt,
      headlessCloudPrint: et,
      loneWordValue: M,
    });
    if (x)
      return {
        ok: false,
        error: x,
      };
  }
  let Ve =
    h === null &&
    validateCloudSessionFlags({
      print: e.print,
      nonInteractive: o.nonInteractive || Boolean(e.initOnly),
      continue: e.continue,
      resume: e.resume,
      fromPr: e.fromPr,
      hasTeleport: teleport !== null,
      hasConnect: o.hasConnect,
      hasSSH: o.hasSSH,
    }) === null &&
    !o.sessionId &&
    pt === null &&
    !$e &&
    e.remoteControl === undefined &&
    e.rc === undefined &&
    !cliCarriesSessionConfig(_pendingSSH(e)) &&
    e.watchArtifact === undefined &&
    e.watchArtifactNoAutoreact === undefined &&
    e.worktree === undefined &&
    !e.deepLinkOrigin;
  let At = !(o.cloudSessionsByDefault && Ve)
    ? "none"
    : e.local || e.unsandboxed
      ? "declined"
      : (await o.cloudSessionsDeniedByOrgPolicy())
        ? "not_allowed"
        : "applied";
  if (At === "applied") h = "";
  let sandboxVmDefault = !(o.sandboxVmByDefault && Ve && h === null)
    ? "none"
    : e.unsandboxed
      ? "declined"
      : "applied";
  let z = false;
  let Q = u !== null ? "resume" : y !== null ? "attach" : null;
  return {
    ok: true,
    value: {
      teleport,
      remote: h,
      cloudAttachId: y,
      resumeInCloud: u,
      poolId: E,
      environmentQuery: w,
      poolPromotedRemote: P,
      poolRef: A,
      poolOnBranch,
      forwardHomeSettings,
      homeSettingsConsent,
      projectFlag: ve,
      projectBrowse: pt,
      projectForRemoteControl: $e,
      correlationId,
      headlessCloud: mt,
      headlessCloudPrint: et,
      serveOnly: S,
      cloudDefault: At,
      sandboxVmDefault,
      persistentVolume,
      persistentVolumeFromSessionId,
      monorepo,
      noMonorepo: ce || E === q,
      noMonorepoAsksTheService: ce,
      personal: z && h !== null && Q === null,
      personalWithoutEffect: z ? Q : null,
    },
  };
}
//@ chunk-3wek6r2k.js:56846-57082 placement
function validateSessionIdFlag(e) {
  if (!e.sessionId)
    return {
      ok: true,
    };
  if ((e.continue || e.resume) && !e.forkSession && !e.sdkUrl)
    return {
      ok: false,
      error:
        "Error: --session-id can only be used with --continue or --resume if --fork-session is also specified.",
    };
  return {
    ok: true,
  };
}
//@ chunk-3wek6r2k.js:57082-57124 placement
var MCP_REMOTE_WORKSPACE_NOTE = "MCP runs in the remote workspace";
//@ chunk-3wek6r2k.js:57124-57506 placement
function mcpConfigIgnoredOnCloud({ mcpConfigFlagServers, agent, chromeFlag, dynamicMcpConfig }) {
  let u = new Set([
    ...Object.keys(mcpConfigFlagServers),
    ...(agent ? Object.keys(agentMcpSpecsToScopedConfigs(agent)) : []),
  ]);
  let p = [];
  if (u.size > 0)
    p.push(
      createSystemMessage(
        `MCP ${plural(u.size, "server")} from --mcp-config/agent frontmatter ignored \u2014 ${MCP_REMOTE_WORKSPACE_NOTE}: ${[...u].join(", ")}`,
        "warning",
      ),
    );
  if (chromeFlag === true && Object.hasOwn(dynamicMcpConfig, CLAUDE_IN_CHROME_MCP_SERVER_NAME))
    p.push(createSystemMessage(`--chrome has no effect: ${MCP_REMOTE_WORKSPACE_NOTE}.`, "warning"));
  return p;
}
//@ chunk-3wek6r2k.js:57506-57844 placement
function trackSessionSwitches(e) {
  let o = {};
  let sessionId = getSessionId();
  return {
    unsubscribe: onSessionSwitch((u, p) => {
      if (u === sessionId) return;
      let h = sessionId;
      sessionId = u;
      logEvent("tengu_session_start", {
        previous_session_id: sanitizeMarkName(h),
        source: fromEnum(p),
        permissionMode: fromEnum(e.permissionMode),
        dangerouslySkipPermissionsPassed: e.dangerouslySkipPermissionsPassed,
        modeIsBypass: e.modeIsBypass,
        print: e.print,
        ...o,
      });
    }),
    updateContext(u) {
      o = {
        ...o,
        ...u,
      };
    },
  };
}
//@ chunk-3wek6r2k.js:57844-58621 placement
function oneMillionContextNotice(resolvedInitialModel, windowArg, n) {
  try {
    if (!is1mContextDisabled() || !isAutoCompactEnabled()) return null;
    if (isUnresolvedInferenceProfile(resolvedInitialModel)) return null;
    let modelContextInfo = getModelContextInfo(resolvedInitialModel, n);
    let { recognized } = modelContextInfo;
    let p =
      !recognized ||
      modelContextInfo.apiContextWindowWithoutOptIn > DEFAULT_CONTEXT_WINDOW ||
      hasOptedInto1mContext(resolvedInitialModel, n);
    let h = DEFAULT_CONTEXT_WINDOW;
    let { window: S, source } = getAutoCompactWindow(modelContextInfo, windowArg, n);
    if ((source !== "auto" && S <= h) || !p) {
      logFeatureOk("compact_context_cap_enforcement");
      return null;
    }
    let E = recognized ? "" : ` or update to a Claude Code version that recognizes ${resolvedInitialModel}`;
    let w = `CLAUDE_CODE_DISABLE_1M_CONTEXT is set, but the ${h / 1000}K limit isn't enforced for ${resolvedInitialModel}, so this session can grow past it. To enforce it, set CLAUDE_CODE_AUTO_COMPACT_WINDOW=${h} (or the autoCompactWindow setting)${E}.`;
    logFeatureBad(
      "compact_context_cap_enforcement",
      source === "auto" ? "window_source_auto" : "window_above_boundary",
    );
    return w;
  } catch (error) {
    logFeatureSad("compact_context_cap_enforcement", "resolve_failed");
    logError(withTelemetryMessage(toError(error), "cap enforcement check failed"));
    return null;
  }
}
//@ chunk-3wek6r2k.js:58621-58826 placement
function hasOptedInto1mContext(e, o) {
  if (isHipaaOrg()) return false;
  if (!(
    o?.includes(BETA_LONG_CONTEXT.header) === true ||
    (env.ANTHROPIC_BETAS ?? "")
      .split(",")
      .map((r) => r.trim())
      .includes(BETA_LONG_CONTEXT.header)
  ))
    return false;
  return getCatalogEntry(strip1mSuffix(getCanonicalName(e)))?.context?.supports_1m_beta === true;
}
//@ chunk-3wek6r2k.js:58826-58940 placement
var PRIVATE_DNS_SUFFIXES = [
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".corp",
  ".home",
  ".home.arpa",
  ".localdomain",
  ".private",
  ".ts.net",
];
//@ chunk-3wek6r2k.js:58940-59143 placement = expandEnvVars (0.858)
/**
 * classifyServerLocation：遥测用服务器位置分类：stdio、managed（宿主类型）、localhost、private_network、public、other。
 */
function classifyServerLocation(config) {
  if (config.type === undefined || config.type === "stdio") return "stdio";
  switch (config.type) {
    case "sdk":
    case "sse-ide":
    case "ws-ide":
    case "claudeai-proxy":
      return "managed";
    case "sse":
    case "http":
    case "ws":
      return classifyUrlHost(config.url);
  }
}
//@ chunk-3wek6r2k.js:59143-59598 placement
function classifyUrlHost(url) {
  if (/\$\{[^}]*\}/.test(url) || /^[a-z][a-z0-9+.-]*:\/\/\//i.test(url)) return "other";
  let o;
  try {
    o = new URL(url).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "");
  } catch {
    return "other";
  }
  if (!o) return "other";
  let n = ipv4FromMappedIpv6(o);
  if (n !== null) o = n;
  if (
    o === "localhost" ||
    o === "localhost.localdomain" ||
    o === "0.0.0.0" ||
    o === "::1" ||
    o === "::" ||
    o.endsWith(".localhost") ||
    /^127\.\d+\.\d+\.\d+$/.test(o)
  )
    return "localhost";
  if (isPrivateNetworkHost(o)) return "private_network";
  return "public";
}
//@ chunk-3wek6r2k.js:59598-59775 placement
function ipv4FromMappedIpv6(e) {
  let match = e.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (match) {
    let n = parseInt(match[1], 16);
    let r = parseInt(match[2], 16);
    return `${n >> 8}.${n & 255}.${r >> 8}.${r & 255}`;
  }
  return null;
}
export {
  PRIVATE_DNS_SUFFIXES,
  resolveCloudLaunchOptions,
  validateSessionIdFlag,
  oneMillionContextNotice,
  trackSessionSwitches,
  mcpConfigIgnoredOnCloud,
  classifyServerLocation,
};
