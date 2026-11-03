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
import { Ayi } from "../../utils/github/anthropicRepos.js";
import { isCcpoolId } from "../../utils/teleport/environmentSelection.js";
import { parseEnvironmentSelector } from "../../utils/teleport/cloudEnvironments.js";
import { Lr, parseTriBoolFlag } from "./launchFlags.js";
import { cliCarriesSessionConfig } from "../../utils/sessionConfigFlags.js";
import { _pendingSSH } from "../../main.js";
import { agentMcpSpecsToScopedConfigs } from "../../tools/AgentTool/loadAgentsDir.js";
import { createSystemMessage } from "../../utils/messages.js";
import { plural } from "../../utils/stringUtils.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "../../utils/claudeInChrome/common.js";
import { getSessionId, onSessionSwitch } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { ye } from "../../utils/startupMarks.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { is1mContextDisabled, Qxt } from "../../utils/model/contextWindow1m.js";
import { isAutoCompactEnabled } from "../../services/compact/compactSettings.js";
import { isUnresolvedInferenceProfile } from "../../utils/model/bedrock.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { getAutoCompactWindow } from "../../services/compact/autoCompact.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { isHipaaOrg, yv } from "../../utils/betas.js";
import { env } from "../../utils/env.js";
import { getCatalogEntry } from "../../utils/model/modelCatalog.js";
import { Lt } from "../../utils/model/modelIds.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { isPrivateNetworkHost } from "../../services/mcp/config.js";

/**
 * 解析 --cloud/--remote/--teleport/--attach-serve/--environment/--project 等启动选项组合，校验互斥并得出云会话启动方案。
 */
//@ chunk-3wek6r2k.js:49945-56846 placement
async function resolveCloudLaunchOptions(e, o) {
  let n = e.teleport ?? null,
    r = e.cloud ?? e.remote,
    u = null,
    p = u === "named" && typeof e.resume === "string" ? e.resume : r,
    h = p === !0 ? "" : (p ?? null),
    S = !1;
  if (e.attachServe !== void 0) {
    if (p !== void 0)
      return { ok: !1, error: "Error: --attach-serve cannot be combined with --cloud/--remote" };
    if (extractRepoSlug(e.attachServe) === null)
      return {
        ok: !1,
        error: `Error: --attach-serve expects a session id (cse_...), got ${truncateCloudSessionLabel(e.attachServe)}`,
      };
    ((h = e.attachServe), (S = !0));
  }
  let y = typeof p === "string" ? extractRepoSlug(p) : S ? extractRepoSlug(e.attachServe ?? "") : null,
    M = typeof p === "string" && y === null && !e.initOnly && /^\s*\S+\s*$/.test(p) ? p : void 0,
    E = null,
    w = null,
    P = !1,
    A = null,
    se = null,
    q = e.noMonorepo === !0 ? Ayi() : void 0,
    ce = !1,
    pe = e.environment ?? e.pool ?? q;
  if (pe !== void 0) {
    let { prefix: prefix, flag: flag } = environmentFlagErrorPrefix(q !== void 0),
      Ee = `Error: --environment expects a self-hosted environment id (ccpool_...), got ${truncateCloudSessionLabel(pe)}`;
    if ((e.environment === void 0 || !0) && !isCcpoolId(pe)) return { ok: !1, error: Ee };
    let De = parseEnvironmentSelector(pe);
    if (De === null) return { ok: !1, error: Ee };
    if (e.resume || e.continue || n)
      return {
        ok: !1,
        error: `${prefix}${flag} cannot be combined with --resume, --continue, or --teleport`,
      };
    if (e.initOnly || o.sessionId)
      return {
        ok: !1,
        error: `${prefix}${flag} cannot be combined with ${e.initOnly ? "--init-only" : "--session-id"}`,
      };
    if (y !== null)
      return {
        ok: !1,
        error:
          "Error: --environment creates a new session; it cannot be combined with --cloud <session_id|url>",
      };
    if (De.kind === "pool" && (e.print || o.nonInteractive) && typeof p === "string" && p.length > 0)
      return {
        ok: !1,
        error: `${prefix}non-interactive ${flag} reads the prompt from the positional or stdin; drop --cloud/--remote <description>.`,
      };
    if ((e.print || o.nonInteractive) && o.outputFormat === "stream-json")
      return { ok: !1, error: `${prefix}${flag} does not support --output-format stream-json` };
    if (typeof p === "string" && p.length > 0 && typeof o.prompt === "string" && o.prompt.length > 0)
      return {
        ok: !1,
        error: `${prefix}${flag} with --cloud <description> cannot also take a positional prompt. Pass the task as the description, or drop --cloud.`,
      };
    if (De.kind === "pool") E = De.poolId;
    else w = De;
    if (h === null || h === "") {
      let qe = typeof o.prompt === "string" ? o.prompt : "";
      if (!(e.print || o.nonInteractive) && extractRepoSlug(qe) !== null)
        return {
          ok: !1,
          error: `${prefix}${flag} creates a new session; it cannot be combined with a session id or url`,
        };
      ((h = E === null ? "" : qe), (P = E !== null));
    }
  }
  let ref = e.ref;
  if (ref !== void 0) {
    if (E === null && h === null)
      return {
        ok: !1,
        error: `Error: --ref sets the base branch for a cloud session; pass --cloud or --environment${e.project !== void 0 ? " \u2014 --project no longer starts cloud sessions" : ""}`,
      };
    if (y !== null)
      return {
        ok: !1,
        error:
          "Error: --ref sets the base for a new cloud session; it cannot be combined with --cloud <session_id|url>",
      };
    if (ref === "") return { ok: !1, error: "Error: --ref requires a non-empty branch, tag, or SHA" };
    A = ref;
  }
  let onBranch = e.onBranch;
  if (onBranch !== void 0) {
    if (E === null && h === null)
      return {
        ok: !1,
        error: `Error: --on-branch resumes work on a branch in a cloud session; pass --cloud or --environment${e.project !== void 0 ? " \u2014 --project no longer starts cloud sessions" : ""}`,
      };
    if (y !== null)
      return {
        ok: !1,
        error:
          "Error: --on-branch resumes a branch in a new cloud session; it cannot be combined with --cloud <session_id|url>",
      };
    if (A !== null)
      return {
        ok: !1,
        error: "Error: --on-branch and --ref both set the cloud session's base branch; pass one or the other",
      };
    if (onBranch === "") return { ok: !1, error: "Error: --on-branch requires a non-empty branch name" };
    se = onBranch;
  }
  let $e = !1,
    ve = null,
    pt = null,
    kt = null,
    correlationId = e.correlationId;
  if (correlationId !== void 0) {
    if (E === null) return { ok: !1, error: "Error: --correlation-id requires --environment" };
    if (!/^[\x21-\x2C\x2E-\x7E][\x21-\x7E]{0,511}$/.test(correlationId))
      return {
        ok: !1,
        error:
          'Error: --correlation-id must be 1-512 printable ASCII characters with no spaces and no leading "-"',
      };
    kt = correlationId;
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
      (await (S ? o.isViolinWoodEnabled : o.isConnectedSessionsEnabled)().catch(() => !1)),
    Le = q !== void 0,
    et =
      o.cloudPrintEnabled &&
      h !== null &&
      (typeof p !== "string" || p.trim() !== "" || Le) &&
      (E === null || Le) &&
      ve === null &&
      y === null &&
      M === void 0 &&
      isPrintNonStreamMode({
        print: Boolean(e.print),
        initOnly: Boolean(e.initOnly),
        hasSdkUrl: o.hasSdkUrl,
        outputFormat: o.outputFormat,
      });
  if (et && Le) ((h = ""), (P = !1));
  if (
    et &&
    typeof p === "string" &&
    p.trim() !== "" &&
    typeof o.prompt === "string" &&
    o.prompt.trim() !== ""
  )
    return {
      ok: !1,
      error: `Error: the task was given twice: as --cloud's value (${truncateCloudSessionLabel(p)}) and as the prompt. With --print, give it in one place; to name the session, use -n/--name.`,
    };
  if (
    et &&
    (Boolean(e.dangerouslySkipPermissions) ||
      e.permissionMode === "bypassPermissions" ||
      e.inheritPermissionMode === "bypassPermissions")
  )
    return { ok: !1, error: Lr };
  if (S && !mt)
    return {
      ok: !1,
      error:
        "Error: --attach-serve requires the serve-only headless launch (non-interactive, --input-format stream-json and --output-format stream-json) and an enabled headless cloud client; it never falls back to a plain attach",
    };
  let nt = parseTriBoolFlag(e.forwardHomeSettings);
  if (nt === "invalid")
    return {
      ok: !1,
      error: `Error: --forward-home-settings takes true or false, not ${truncateCloudSessionLabel(String(e.forwardHomeSettings))}.`,
    };
  let xt = nt !== !1,
    Zt = nt === !0 ? "forward" : null;
  if (nt !== null && E === null && h === null && y === null)
    return {
      ok: !1,
      error:
        "Error: --forward-home-settings says whether this machine's settings go into a cloud session; pass --cloud (a new session, or one to attach to) or --environment",
    };
  let gt = !1,
    jt = null,
    yt = !1;
  if (h !== null) {
    let x = validateCloudSessionFlags({
      print: e.print,
      nonInteractive: o.nonInteractive,
      continue: e.continue,
      resume: u === null ? e.resume : void 0,
      fromPr: e.fromPr,
      hasTeleport: n !== null,
      hasConnect: o.hasConnect,
      hasSSH: o.hasSSH,
      hasAssistant: !1,
      hasPool: E !== null,
      hasEnvironmentQuery: w !== null,
      isChosenByNoMonorepo: q !== void 0,
      isCloudAttach: y !== null,
      headlessCloud: mt,
      headlessCloudPrint: et,
      loneWordValue: M,
    });
    if (x) return { ok: !1, error: x };
  }
  let Ve =
      h === null &&
      validateCloudSessionFlags({
        print: e.print,
        nonInteractive: o.nonInteractive || Boolean(e.initOnly),
        continue: e.continue,
        resume: e.resume,
        fromPr: e.fromPr,
        hasTeleport: n !== null,
        hasConnect: o.hasConnect,
        hasSSH: o.hasSSH,
      }) === null &&
      !o.sessionId &&
      pt === null &&
      !$e &&
      e.remoteControl === void 0 &&
      e.rc === void 0 &&
      !cliCarriesSessionConfig(_pendingSSH(e)) &&
      e.watchArtifact === void 0 &&
      e.watchArtifactNoAutoreact === void 0 &&
      e.worktree === void 0 &&
      !e.deepLinkOrigin,
    At = !(o.cloudSessionsByDefault && Ve)
      ? "none"
      : e.local || e.unsandboxed
        ? "declined"
        : (await o.cloudSessionsDeniedByOrgPolicy())
          ? "not_allowed"
          : "applied";
  if (At === "applied") h = "";
  let we = !(o.sandboxVmByDefault && Ve && h === null) ? "none" : e.unsandboxed ? "declined" : "applied",
    z = !1,
    Q = u !== null ? "resume" : y !== null ? "attach" : null;
  return {
    ok: !0,
    value: {
      teleport: n,
      remote: h,
      cloudAttachId: y,
      resumeInCloud: u,
      poolId: E,
      environmentQuery: w,
      poolPromotedRemote: P,
      poolRef: A,
      poolOnBranch: se,
      forwardHomeSettings: xt,
      homeSettingsConsent: Zt,
      projectFlag: ve,
      projectBrowse: pt,
      projectForRemoteControl: $e,
      correlationId: kt,
      headlessCloud: mt,
      headlessCloudPrint: et,
      serveOnly: S,
      cloudDefault: At,
      sandboxVmDefault: we,
      persistentVolume: gt,
      persistentVolumeFromSessionId: jt,
      monorepo: yt,
      noMonorepo: ce || E === q,
      noMonorepoAsksTheService: ce,
      personal: z && h !== null && Q === null,
      personalWithoutEffect: z ? Q : null,
    },
  };
}
//@ chunk-3wek6r2k.js:56846-57082 placement
function validateSessionIdFlag(e) {
  if (!e.sessionId) return { ok: !0 };
  if ((e.continue || e.resume) && !e.forkSession && !e.sdkUrl)
    return {
      ok: !1,
      error:
        "Error: --session-id can only be used with --continue or --resume if --fork-session is also specified.",
    };
  return { ok: !0 };
}
//@ chunk-3wek6r2k.js:57082-57124 placement
var ca = "MCP runs in the remote workspace";
//@ chunk-3wek6r2k.js:57124-57506 placement
function mcpConfigIgnoredOnCloud({
  mcpConfigFlagServers: mcpConfigFlagServers,
  agent: agent,
  chromeFlag: chromeFlag,
  dynamicMcpConfig: dynamicMcpConfig,
}) {
  let u = new Set([
      ...Object.keys(mcpConfigFlagServers),
      ...(agent ? Object.keys(agentMcpSpecsToScopedConfigs(agent)) : []),
    ]),
    p = [];
  if (u.size > 0)
    p.push(
      createSystemMessage(
        `MCP ${plural(u.size, "server")} from --mcp-config/agent frontmatter ignored \u2014 ${ca}: ${[...u].join(", ")}`,
        "warning",
      ),
    );
  if (chromeFlag === !0 && Object.hasOwn(dynamicMcpConfig, CLAUDE_IN_CHROME_MCP_SERVER_NAME))
    p.push(createSystemMessage(`--chrome has no effect: ${ca}.`, "warning"));
  return p;
}
//@ chunk-3wek6r2k.js:57506-57844 placement
function trackSessionSwitches(e) {
  let o = {},
    n = getSessionId();
  return {
    unsubscribe: onSessionSwitch((u, p) => {
      if (u === n) return;
      let h = n;
      ((n = u),
        logEvent("tengu_session_start", {
          previous_session_id: ye(h),
          source: fromEnum(p),
          permissionMode: fromEnum(e.permissionMode),
          dangerouslySkipPermissionsPassed: e.dangerouslySkipPermissionsPassed,
          modeIsBypass: e.modeIsBypass,
          print: e.print,
          ...o,
        }));
    }),
    updateContext(u) {
      o = { ...o, ...u };
    },
  };
}
//@ chunk-3wek6r2k.js:57844-58621 placement
function oneMillionContextNotice(e, o, n) {
  try {
    if (!is1mContextDisabled() || !isAutoCompactEnabled()) return null;
    if (isUnresolvedInferenceProfile(e)) return null;
    let r = getModelContextInfo(e, n),
      { recognized: recognized } = r,
      p = !recognized || r.apiContextWindowWithoutOptIn > Qxt || hasOptedInto1mContext(e, n),
      h = Qxt,
      { window: S, source: source } = getAutoCompactWindow(r, o, n);
    if ((source !== "auto" && S <= h) || !p) return (logFeatureOk("compact_context_cap_enforcement"), null);
    let E = recognized ? "" : ` or update to a Claude Code version that recognizes ${e}`,
      w = `CLAUDE_CODE_DISABLE_1M_CONTEXT is set, but the ${h / 1000}K limit isn't enforced for ${e}, so this session can grow past it. To enforce it, set CLAUDE_CODE_AUTO_COMPACT_WINDOW=${h} (or the autoCompactWindow setting)${E}.`;
    return (
      logFeatureBad(
        "compact_context_cap_enforcement",
        source === "auto" ? "window_source_auto" : "window_above_boundary",
      ),
      w
    );
  } catch (error) {
    return (
      logFeatureSad("compact_context_cap_enforcement", "resolve_failed"),
      logError(withTelemetryMessage(toError(error), "cap enforcement check failed")),
      null
    );
  }
}
//@ chunk-3wek6r2k.js:58621-58826 placement
function hasOptedInto1mContext(e, o) {
  if (isHipaaOrg()) return !1;
  if (!(
    o?.includes(yv.header) === !0 ||
    (env.ANTHROPIC_BETAS ?? "")
      .split(",")
      .map((r) => r.trim())
      .includes(yv.header)
  ))
    return !1;
  return getCatalogEntry(Lt(getCanonicalName(e)))?.context?.supports_1m_beta === !0;
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
/**
 * classifyServerLocation：遥测用服务器位置分类：stdio、managed（宿主类型）、localhost、private_network、public、other。
 */
//@ chunk-3wek6r2k.js:58940-59143 placement = expandEnvVars (0.858)
function classifyServerLocation(config) {
  if (config.type === void 0 || config.type === "stdio") return "stdio";
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
function classifyUrlHost(e) {
  if (/\$\{[^}]*\}/.test(e) || /^[a-z][a-z0-9+.-]*:\/\/\//i.test(e)) return "other";
  let o;
  try {
    o = new URL(e).hostname
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
    let n = parseInt(match[1], 16),
      r = parseInt(match[2], 16);
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
