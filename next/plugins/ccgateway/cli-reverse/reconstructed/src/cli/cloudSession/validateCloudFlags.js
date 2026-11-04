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
async function resolveCloudLaunchOptions(parsed, env) {
  let teleport = parsed.teleport ?? null;
  let cloudOrRemote = parsed.cloud ?? parsed.remote;
  let resumeMode = null;
  let cloudValue =
    resumeMode === "named" && typeof parsed.resume === "string" ? parsed.resume : cloudOrRemote;
  let remoteTarget = cloudValue === true ? "" : (cloudValue ?? null);
  let isServeOnly = false;
  if (parsed.attachServe !== undefined) {
    if (cloudValue !== undefined)
      return {
        ok: false,
        error: "Error: --attach-serve cannot be combined with --cloud/--remote",
      };
    if (extractRepoSlug(parsed.attachServe) === null)
      return {
        ok: false,
        error: `Error: --attach-serve expects a session id (cse_...), got ${truncateCloudSessionLabel(parsed.attachServe)}`,
      };
    remoteTarget = parsed.attachServe;
    isServeOnly = true;
  }
  let attachSlug =
    typeof cloudValue === "string"
      ? extractRepoSlug(cloudValue)
      : isServeOnly
        ? extractRepoSlug(parsed.attachServe ?? "")
        : null;
  let loneWord =
    typeof cloudValue === "string" &&
    attachSlug === null &&
    !parsed.initOnly &&
    /^\s*\S+\s*$/.test(cloudValue)
      ? cloudValue
      : undefined;
  let poolId = null;
  let environmentQuery = null;
  let isPoolPromotedRemote = false;
  let poolRef = null;
  let poolOnBranch = null;
  let noMonorepoHint = parsed.noMonorepo === true ? noopAnthropicRepoHint() : undefined;
  let asksTheService = false;
  let environmentChoice = parsed.environment ?? parsed.pool ?? noMonorepoHint;
  if (environmentChoice !== undefined) {
    let { prefix, flag } = environmentFlagErrorPrefix(noMonorepoHint !== undefined);
    let error = `Error: --environment expects a self-hosted environment id (ccpool_...), got ${truncateCloudSessionLabel(environmentChoice)}`;
    if ((parsed.environment === undefined || true) && !isCcpoolId(environmentChoice))
      return {
        ok: false,
        error,
      };
    let environmentSelector = parseEnvironmentSelector(environmentChoice);
    if (environmentSelector === null)
      return {
        ok: false,
        error,
      };
    if (parsed.resume || parsed.continue || teleport)
      return {
        ok: false,
        error: `${prefix}${flag} cannot be combined with --resume, --continue, or --teleport`,
      };
    if (parsed.initOnly || env.sessionId)
      return {
        ok: false,
        error: `${prefix}${flag} cannot be combined with ${parsed.initOnly ? "--init-only" : "--session-id"}`,
      };
    if (attachSlug !== null)
      return {
        ok: false,
        error:
          "Error: --environment creates a new session; it cannot be combined with --cloud <session_id|url>",
      };
    if (
      environmentSelector.kind === "pool" &&
      (parsed.print || env.nonInteractive) &&
      typeof cloudValue === "string" &&
      cloudValue.length > 0
    )
      return {
        ok: false,
        error: `${prefix}non-interactive ${flag} reads the prompt from the positional or stdin; drop --cloud/--remote <description>.`,
      };
    if ((parsed.print || env.nonInteractive) && env.outputFormat === "stream-json")
      return {
        ok: false,
        error: `${prefix}${flag} does not support --output-format stream-json`,
      };
    if (
      typeof cloudValue === "string" &&
      cloudValue.length > 0 &&
      typeof env.prompt === "string" &&
      env.prompt.length > 0
    )
      return {
        ok: false,
        error: `${prefix}${flag} with --cloud <description> cannot also take a positional prompt. Pass the task as the description, or drop --cloud.`,
      };
    if (environmentSelector.kind === "pool") poolId = environmentSelector.poolId;
    else environmentQuery = environmentSelector;
    if (remoteTarget === null || remoteTarget === "") {
      let prompt = typeof env.prompt === "string" ? env.prompt : "";
      if (!(parsed.print || env.nonInteractive) && extractRepoSlug(prompt) !== null)
        return {
          ok: false,
          error: `${prefix}${flag} creates a new session; it cannot be combined with a session id or url`,
        };
      remoteTarget = poolId === null ? "" : prompt;
      isPoolPromotedRemote = poolId !== null;
    }
  }
  let ref = parsed.ref;
  if (ref !== undefined) {
    if (poolId === null && remoteTarget === null)
      return {
        ok: false,
        error: `Error: --ref sets the base branch for a cloud session; pass --cloud or --environment${parsed.project !== undefined ? " \u2014 --project no longer starts cloud sessions" : ""}`,
      };
    if (attachSlug !== null)
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
    poolRef = ref;
  }
  let onBranch = parsed.onBranch;
  if (onBranch !== undefined) {
    if (poolId === null && remoteTarget === null)
      return {
        ok: false,
        error: `Error: --on-branch resumes work on a branch in a cloud session; pass --cloud or --environment${parsed.project !== undefined ? " \u2014 --project no longer starts cloud sessions" : ""}`,
      };
    if (attachSlug !== null)
      return {
        ok: false,
        error:
          "Error: --on-branch resumes a branch in a new cloud session; it cannot be combined with --cloud <session_id|url>",
      };
    if (poolRef !== null)
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
  let projectForRemoteControl = false;
  let projectFlag = null;
  let projectBrowse = null;
  let correlationId = null;
  let correlationId_2 = parsed.correlationId;
  if (correlationId_2 !== undefined) {
    if (poolId === null)
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
  let isHeadlessCloud =
    remoteTarget !== null &&
    poolId === null &&
    projectFlag === null &&
    isStreamJsonRemoteMode({
      print: Boolean(parsed.print),
      initOnly: Boolean(parsed.initOnly),
      nonInteractive: env.nonInteractive,
      inputFormat: env.inputFormat,
      outputFormat: env.outputFormat,
      hasSdkUrl: env.hasSdkUrl,
    }) &&
    (await (isServeOnly ? env.isViolinWoodEnabled : env.isConnectedSessionsEnabled)().catch(() => false));
  let isFromNoMonorepo = noMonorepoHint !== undefined;
  let isHeadlessCloudPrint =
    env.cloudPrintEnabled &&
    remoteTarget !== null &&
    (typeof cloudValue !== "string" || cloudValue.trim() !== "" || isFromNoMonorepo) &&
    (poolId === null || isFromNoMonorepo) &&
    projectFlag === null &&
    attachSlug === null &&
    loneWord === undefined &&
    isPrintNonStreamMode({
      print: Boolean(parsed.print),
      initOnly: Boolean(parsed.initOnly),
      hasSdkUrl: env.hasSdkUrl,
      outputFormat: env.outputFormat,
    });
  if (isHeadlessCloudPrint && isFromNoMonorepo) {
    remoteTarget = "";
    isPoolPromotedRemote = false;
  }
  if (
    isHeadlessCloudPrint &&
    typeof cloudValue === "string" &&
    cloudValue.trim() !== "" &&
    typeof env.prompt === "string" &&
    env.prompt.trim() !== ""
  )
    return {
      ok: false,
      error: `Error: the task was given twice: as --cloud's value (${truncateCloudSessionLabel(cloudValue)}) and as the prompt. With --print, give it in one place; to name the session, use -n/--name.`,
    };
  if (
    isHeadlessCloudPrint &&
    (Boolean(parsed.dangerouslySkipPermissions) ||
      parsed.permissionMode === "bypassPermissions" ||
      parsed.inheritPermissionMode === "bypassPermissions")
  )
    return {
      ok: false,
      error: BYPASS_REFUSAL_MESSAGE,
    };
  if (isServeOnly && !isHeadlessCloud)
    return {
      ok: false,
      error:
        "Error: --attach-serve requires the serve-only headless launch (non-interactive, --input-format stream-json and --output-format stream-json) and an enabled headless cloud client; it never falls back to a plain attach",
    };
  let triBoolFlag = parseTriBoolFlag(parsed.forwardHomeSettings);
  if (triBoolFlag === "invalid")
    return {
      ok: false,
      error: `Error: --forward-home-settings takes true or false, not ${truncateCloudSessionLabel(String(parsed.forwardHomeSettings))}.`,
    };
  let forwardHomeSettings = triBoolFlag !== false;
  let homeSettingsConsent = triBoolFlag === true ? "forward" : null;
  if (triBoolFlag !== null && poolId === null && remoteTarget === null && attachSlug === null)
    return {
      ok: false,
      error:
        "Error: --forward-home-settings says whether this machine's settings go into a cloud session; pass --cloud (a new session, or one to attach to) or --environment",
    };
  let persistentVolume = false;
  let persistentVolumeFromSessionId = null;
  let monorepo = false;
  if (remoteTarget !== null) {
    let flagError = validateCloudSessionFlags({
      print: parsed.print,
      nonInteractive: env.nonInteractive,
      continue: parsed.continue,
      resume: resumeMode === null ? parsed.resume : undefined,
      fromPr: parsed.fromPr,
      hasTeleport: teleport !== null,
      hasConnect: env.hasConnect,
      hasSSH: env.hasSSH,
      hasAssistant: false,
      hasPool: poolId !== null,
      hasEnvironmentQuery: environmentQuery !== null,
      isChosenByNoMonorepo: noMonorepoHint !== undefined,
      isCloudAttach: attachSlug !== null,
      headlessCloud: isHeadlessCloud,
      headlessCloudPrint: isHeadlessCloudPrint,
      loneWordValue: loneWord,
    });
    if (flagError)
      return {
        ok: false,
        error: flagError,
      };
  }
  let mayDefaultToCloud =
    remoteTarget === null &&
    validateCloudSessionFlags({
      print: parsed.print,
      nonInteractive: env.nonInteractive || Boolean(parsed.initOnly),
      continue: parsed.continue,
      resume: parsed.resume,
      fromPr: parsed.fromPr,
      hasTeleport: teleport !== null,
      hasConnect: env.hasConnect,
      hasSSH: env.hasSSH,
    }) === null &&
    !env.sessionId &&
    projectBrowse === null &&
    !projectForRemoteControl &&
    parsed.remoteControl === undefined &&
    parsed.rc === undefined &&
    !cliCarriesSessionConfig(_pendingSSH(parsed)) &&
    parsed.watchArtifact === undefined &&
    parsed.watchArtifactNoAutoreact === undefined &&
    parsed.worktree === undefined &&
    !parsed.deepLinkOrigin;
  let cloudDefault = !(env.cloudSessionsByDefault && mayDefaultToCloud)
    ? "none"
    : parsed.local || parsed.unsandboxed
      ? "declined"
      : (await env.cloudSessionsDeniedByOrgPolicy())
        ? "not_allowed"
        : "applied";
  if (cloudDefault === "applied") remoteTarget = "";
  let sandboxVmDefault = !(env.sandboxVmByDefault && mayDefaultToCloud && remoteTarget === null)
    ? "none"
    : parsed.unsandboxed
      ? "declined"
      : "applied";
  let isPersonal = false;
  let personalMode = resumeMode !== null ? "resume" : attachSlug !== null ? "attach" : null;
  return {
    ok: true,
    value: {
      teleport,
      remote: remoteTarget,
      cloudAttachId: attachSlug,
      resumeInCloud: resumeMode,
      poolId,
      environmentQuery,
      poolPromotedRemote: isPoolPromotedRemote,
      poolRef,
      poolOnBranch,
      forwardHomeSettings,
      homeSettingsConsent,
      projectFlag,
      projectBrowse,
      projectForRemoteControl,
      correlationId,
      headlessCloud: isHeadlessCloud,
      headlessCloudPrint: isHeadlessCloudPrint,
      serveOnly: isServeOnly,
      cloudDefault,
      sandboxVmDefault,
      persistentVolume,
      persistentVolumeFromSessionId,
      monorepo,
      noMonorepo: asksTheService || poolId === noMonorepoHint,
      noMonorepoAsksTheService: asksTheService,
      personal: isPersonal && remoteTarget !== null && personalMode === null,
      personalWithoutEffect: isPersonal ? personalMode : null,
    },
  };
}
//@ chunk-3wek6r2k.js:56846-57082 placement
function validateSessionIdFlag(options) {
  if (!options.sessionId)
    return {
      ok: true,
    };
  if ((options.continue || options.resume) && !options.forkSession && !options.sdkUrl)
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
  let serverNames = new Set([
    ...Object.keys(mcpConfigFlagServers),
    ...(agent ? Object.keys(agentMcpSpecsToScopedConfigs(agent)) : []),
  ]);
  let messages = [];
  if (serverNames.size > 0)
    messages.push(
      createSystemMessage(
        `MCP ${plural(serverNames.size, "server")} from --mcp-config/agent frontmatter ignored \u2014 ${MCP_REMOTE_WORKSPACE_NOTE}: ${[...serverNames].join(", ")}`,
        "warning",
      ),
    );
  if (chromeFlag === true && Object.hasOwn(dynamicMcpConfig, CLAUDE_IN_CHROME_MCP_SERVER_NAME))
    messages.push(createSystemMessage(`--chrome has no effect: ${MCP_REMOTE_WORKSPACE_NOTE}.`, "warning"));
  return messages;
}
//@ chunk-3wek6r2k.js:57506-57844 placement
function trackSessionSwitches(options) {
  let extraFields = {};
  let sessionId = getSessionId();
  return {
    unsubscribe: onSessionSwitch((nextSessionId, source) => {
      if (nextSessionId === sessionId) return;
      let previousSessionId = sessionId;
      sessionId = nextSessionId;
      logEvent("tengu_session_start", {
        previous_session_id: sanitizeMarkName(previousSessionId),
        source: fromEnum(source),
        permissionMode: fromEnum(options.permissionMode),
        dangerouslySkipPermissionsPassed: options.dangerouslySkipPermissionsPassed,
        modeIsBypass: options.modeIsBypass,
        print: options.print,
        ...extraFields,
      });
    }),
    updateContext(fields) {
      extraFields = {
        ...extraFields,
        ...fields,
      };
    },
  };
}
//@ chunk-3wek6r2k.js:57844-58621 placement
function oneMillionContextNotice(model, windowArg, modelInfo) {
  try {
    if (!is1mContextDisabled() || !isAutoCompactEnabled()) return null;
    if (isUnresolvedInferenceProfile(model)) return null;
    let modelContextInfo = getModelContextInfo(model, modelInfo);
    let { recognized } = modelContextInfo;
    let isAboveDefault =
      !recognized ||
      modelContextInfo.apiContextWindowWithoutOptIn > DEFAULT_CONTEXT_WINDOW ||
      hasOptedInto1mContext(model, modelInfo);
    let defaultWindow = DEFAULT_CONTEXT_WINDOW;
    let { window: autoCompactWindow, source } = getAutoCompactWindow(modelContextInfo, windowArg, modelInfo);
    if ((source !== "auto" && autoCompactWindow <= defaultWindow) || !isAboveDefault) {
      logFeatureOk("compact_context_cap_enforcement");
      return null;
    }
    let upgradeHint = recognized ? "" : ` or update to a Claude Code version that recognizes ${model}`;
    let message = `CLAUDE_CODE_DISABLE_1M_CONTEXT is set, but the ${defaultWindow / 1000}K limit isn't enforced for ${model}, so this session can grow past it. To enforce it, set CLAUDE_CODE_AUTO_COMPACT_WINDOW=${defaultWindow} (or the autoCompactWindow setting)${upgradeHint}.`;
    logFeatureBad(
      "compact_context_cap_enforcement",
      source === "auto" ? "window_source_auto" : "window_above_boundary",
    );
    return message;
  } catch (error) {
    logFeatureSad("compact_context_cap_enforcement", "resolve_failed");
    logError(withTelemetryMessage(toError(error), "cap enforcement check failed"));
    return null;
  }
}
//@ chunk-3wek6r2k.js:58621-58826 placement
function hasOptedInto1mContext(model, betas) {
  if (isHipaaOrg()) return false;
  if (!(
    betas?.includes(BETA_LONG_CONTEXT.header) === true ||
    (env.ANTHROPIC_BETAS ?? "")
      .split(",")
      .map((beta) => beta.trim())
      .includes(BETA_LONG_CONTEXT.header)
  ))
    return false;
  return getCatalogEntry(strip1mSuffix(getCanonicalName(model)))?.context?.supports_1m_beta === true;
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
  let host;
  try {
    host = new URL(url).hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, "")
      .replace(/\.$/, "");
  } catch {
    return "other";
  }
  if (!host) return "other";
  let ipv4 = ipv4FromMappedIpv6(host);
  if (ipv4 !== null) host = ipv4;
  if (
    host === "localhost" ||
    host === "localhost.localdomain" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "::" ||
    host.endsWith(".localhost") ||
    /^127\.\d+\.\d+\.\d+$/.test(host)
  )
    return "localhost";
  if (isPrivateNetworkHost(host)) return "private_network";
  return "public";
}
//@ chunk-3wek6r2k.js:59598-59775 placement
function ipv4FromMappedIpv6(host) {
  let match = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (match) {
    let high = parseInt(match[1], 16);
    let low = parseInt(match[2], 16);
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
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
