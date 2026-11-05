/**
 * cli/cloudSession/validateCloudFlags.ts
 *
 * 2.1.316 新增：校验云会话相关命令行参数（--attach-serve、会话 id、URL 主机、1M 上下文提示）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (13)
 * attribution: sole-consumer 1, placement 11, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isModeDependentModelSetting, isOpusFableAdvisorSetting } from "../../utils/model/planModeModel.js";
import { strip1mSuffix } from "../../utils/model/modelIds.js";
import { parseEffortLevel } from "../../utils/effort.js";
import { cloudPermissionModeFrom, BYPASS_REFUSAL_MESSAGE, parseTriBoolFlag } from "./launchFlags.js";
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
import { cliCarriesSessionConfig } from "../../utils/sessionConfigFlags.js";
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
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";

//@ chunk-hjswk319.js:49022-49281 sole-consumer
function clearInheritedModelSettings(config) {
  let { model, effort, permissionMode } = config;
  return {
    ...config,
    model:
      typeof model === "string" &&
      !isModeDependentModelSetting(strip1mSuffix(model.trim().toLowerCase())) &&
      !isOpusFableAdvisorSetting(model)
        ? undefined
        : model,
    effort: typeof effort === "string" && parseEffortLevel(effort) !== undefined ? undefined : effort,
    permissionMode:
      typeof permissionMode === "string" && cloudPermissionModeFrom(permissionMode) !== undefined
        ? undefined
        : permissionMode,
  };
}
//@ chunk-hjswk319.js:49281-56275 placement
/**
 * 解析 --cloud/--remote/--teleport/--attach-serve/--environment/--project 等启动选项组合，校验互斥并得出云会话启动方案。
 */
async function resolveCloudLaunchOptions(parsed, env) {
  let resumeMode = parsed.teleport ?? null;
  let cloudOrRemote = parsed.cloud ?? parsed.remote;
  let resumeMode_2 = null;
  let cloudValue =
    resumeMode_2 === "named" && typeof parsed.resume === "string" ? parsed.resume : cloudOrRemote;
  let remoteTarget = cloudValue === true || env.localSessionMove !== undefined ? "" : (cloudValue ?? null);
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
    env.localSessionMove === undefined &&
    attachSlug === null &&
    !parsed.initOnly &&
    /^\s*\S+\s*$/.test(cloudValue)
      ? cloudValue
      : undefined;
  let poolId = null;
  let environmentQuery = null;
  let isPoolPromotedRemote = false;
  let poolRef = null;
  let noMonorepoHint = null;
  let noMonorepoHint_2 = parsed.noMonorepo === true ? noopAnthropicRepoHint() : undefined;
  let asksTheService = false;
  let environmentChoice = false;
  if (environmentChoice) remoteTarget = "";
  let environmentChoice_2 = parsed.environment ?? parsed.pool ?? noMonorepoHint_2;
  if (environmentChoice_2 !== undefined) {
    let { prefix: environmentFlag, flag: environmentError } = environmentFlagErrorPrefix(
      noMonorepoHint_2 !== undefined,
    );
    let environmentSelector = `Error: --environment expects a self-hosted environment id (ccpool_...), got ${truncateCloudSessionLabel(environmentChoice_2)}`;
    if ((parsed.environment === undefined || true) && !isCcpoolId(environmentChoice_2))
      return {
        ok: false,
        error: environmentSelector,
      };
    let prompt = parseEnvironmentSelector(environmentChoice_2);
    if (prompt === null)
      return {
        ok: false,
        error: environmentSelector,
      };
    if (parsed.resume || parsed.continue || resumeMode)
      return {
        ok: false,
        error: `${environmentFlag}${environmentError} cannot be combined with --resume, --continue, or --teleport`,
      };
    if (parsed.initOnly || env.sessionId)
      return {
        ok: false,
        error: `${environmentFlag}${environmentError} cannot be combined with ${parsed.initOnly ? "--init-only" : "--session-id"}`,
      };
    if (attachSlug !== null)
      return {
        ok: false,
        error:
          "Error: --environment creates a new session; it cannot be combined with --cloud <session_id|url>",
      };
    if (
      prompt.kind === "pool" &&
      (parsed.print || env.nonInteractive) &&
      typeof cloudValue === "string" &&
      cloudValue.length > 0
    )
      return {
        ok: false,
        error: `${environmentFlag}non-interactive ${environmentError} reads the prompt from the positional or stdin; drop --cloud/--remote <description>.`,
      };
    if ((parsed.print || env.nonInteractive) && env.outputFormat === "stream-json")
      return {
        ok: false,
        error: `${environmentFlag}${environmentError} does not support --output-format stream-json`,
      };
    if (
      typeof cloudValue === "string" &&
      cloudValue.length > 0 &&
      typeof env.prompt === "string" &&
      env.prompt.length > 0
    )
      return {
        ok: false,
        error: `${environmentFlag}${environmentError} with --cloud <description> cannot also take a positional prompt. Pass the task as the description, or drop --cloud.`,
      };
    if (prompt.kind === "pool") poolId = prompt.poolId;
    else environmentQuery = prompt;
    if (remoteTarget === null || remoteTarget === "") {
      let ref = typeof env.prompt === "string" ? env.prompt : "";
      if (!(parsed.print || env.nonInteractive) && extractRepoSlug(ref) !== null)
        return {
          ok: false,
          error: `${environmentFlag}${environmentError} creates a new session; it cannot be combined with a session id or url`,
        };
      remoteTarget = poolId === null ? "" : ref;
      isPoolPromotedRemote = poolId !== null;
    }
  }
  let onBranch = parsed.ref;
  if (onBranch !== undefined) {
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
    if (onBranch === "")
      return {
        ok: false,
        error: "Error: --ref requires a non-empty branch, tag, or SHA",
      };
    poolRef = onBranch;
  }
  let projectForRemoteControl = parsed.onBranch;
  if (projectForRemoteControl !== undefined) {
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
    if (projectForRemoteControl === "")
      return {
        ok: false,
        error: "Error: --on-branch requires a non-empty branch name",
      };
    noMonorepoHint = projectForRemoteControl;
  }
  let projectForRemoteControl_2 = false;
  let projectFlag = null;
  let projectBrowse = null;
  let correlationIdFlag = null;
  let isHeadlessCloud = parsed.correlationId;
  if (isHeadlessCloud !== undefined) {
    if (poolId === null)
      return {
        ok: false,
        error: "Error: --correlation-id requires --environment",
      };
    if (!/^[\x21-\x2C\x2E-\x7E][\x21-\x7E]{0,511}$/.test(isHeadlessCloud))
      return {
        ok: false,
        error:
          'Error: --correlation-id must be 1-512 printable ASCII characters with no spaces and no leading "-"',
      };
    correlationIdFlag = isHeadlessCloud;
  }
  let isHeadlessCloud_2 =
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
  let isFromNoMonorepo = noMonorepoHint_2 !== undefined;
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
  if (isServeOnly && !isHeadlessCloud_2)
    return {
      ok: false,
      error:
        "Error: --attach-serve requires the serve-only headless launch (non-interactive, --input-format stream-json and --output-format stream-json) and an enabled headless cloud client; it never falls back to a plain attach",
    };
  let forwardHomeSettings = parseTriBoolFlag(parsed.forwardHomeSettings);
  if (forwardHomeSettings === "invalid")
    return {
      ok: false,
      error: `Error: --forward-home-settings takes true or false, not ${truncateCloudSessionLabel(String(parsed.forwardHomeSettings))}.`,
    };
  let homeSettingsConsent = forwardHomeSettings !== false;
  let persistentVolume = forwardHomeSettings === true ? "forward" : null;
  if (forwardHomeSettings !== null && poolId === null && remoteTarget === null && attachSlug === null)
    return {
      ok: false,
      error:
        "Error: --forward-home-settings says whether this machine's settings go into a cloud session; pass --cloud (a new session, or one to attach to) or --environment",
    };
  let persistentVolumeFromSessionId = false;
  let monorepo = null;
  let flagError = false;
  if (remoteTarget !== null) {
    let flagError = validateCloudSessionFlags({
      print: parsed.print,
      nonInteractive: env.nonInteractive,
      continue: parsed.continue,
      resume: resumeMode_2 === null ? parsed.resume : undefined,
      fromPr: parsed.fromPr,
      hasTeleport: resumeMode !== null,
      hasConnect: env.hasConnect,
      hasSSH: env.hasSSH,
      hasPool: poolId !== null,
      hasEnvironmentQuery: environmentQuery !== null,
      isChosenByNoMonorepo: noMonorepoHint_2 !== undefined,
      isImpliedByMonorepo: environmentChoice,
      isCloudAttach: attachSlug !== null,
      headlessCloud: isHeadlessCloud_2,
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
      hasTeleport: resumeMode !== null,
      hasConnect: env.hasConnect,
      hasSSH: env.hasSSH,
    }) === null &&
    !env.sessionId &&
    projectBrowse === null &&
    !projectForRemoteControl_2 &&
    parsed.remoteControl === undefined &&
    parsed.rc === undefined &&
    !cliCarriesSessionConfig(clearInheritedModelSettings(parsed)) &&
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
  let personalMode = resumeMode_2 !== null ? "resume" : attachSlug !== null ? "attach" : null;
  return {
    ok: true,
    value: {
      teleport: resumeMode,
      remote: remoteTarget,
      cloudAttachId: attachSlug,
      resumeInCloud: resumeMode_2,
      poolId,
      environmentQuery,
      poolPromotedRemote: isPoolPromotedRemote,
      poolRef,
      poolOnBranch: noMonorepoHint,
      forwardHomeSettings: homeSettingsConsent,
      homeSettingsConsent: persistentVolume,
      projectFlag,
      projectBrowse,
      projectForRemoteControl: projectForRemoteControl_2,
      correlationId: correlationIdFlag,
      headlessCloud: isHeadlessCloud_2,
      headlessCloudPrint: isHeadlessCloudPrint,
      serveOnly: isServeOnly,
      cloudDefault,
      sandboxVmDefault,
      persistentVolume: persistentVolumeFromSessionId,
      persistentVolumeFromSessionId: monorepo,
      monorepo: flagError,
      noMonorepo: asksTheService || poolId === noMonorepoHint_2,
      noMonorepoAsksTheService: asksTheService,
      personal: isPersonal && remoteTarget !== null && personalMode === null,
      personalWithoutEffect: isPersonal ? personalMode : null,
    },
  };
}
//@ chunk-hjswk319.js:56275-56511 placement
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
//@ chunk-hjswk319.js:56511-56553 placement
var MCP_REMOTE_WORKSPACE_NOTE = "MCP runs in the remote workspace";
//@ chunk-hjswk319.js:56553-56935 placement
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
//@ chunk-hjswk319.js:56935-57273 placement
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
//@ chunk-hjswk319.js:57273-58050 placement
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
//@ chunk-hjswk319.js:58050-58255 placement
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
//@ chunk-hjswk319.js:58255-58369 placement
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
//@ chunk-hjswk319.js:58369-58572 placement (2.1.88 match: expandEnvVars, 0.858)
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
//@ chunk-hjswk319.js:58572-59027 placement
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
//@ chunk-hjswk319.js:59027-59204 placement
function ipv4FromMappedIpv6(host) {
  let match = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (match) {
    let high = parseInt(match[1], 16);
    let low = parseInt(match[2], 16);
    return `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
  }
  return null;
}
//@ chunk-hjswk319.js:59204-59579 affinity
function isPrivateNetworkHost(host) {
  if (!host.includes(".") && !host.includes(":")) return true;
  if (
    /^10\.\d+\.\d+\.\d+$/.test(host) ||
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host) ||
    /^169\.254\.\d+\.\d+$/.test(host) ||
    /^100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/.test(host) ||
    /^f[cd][0-9a-f]{2}:/.test(host) ||
    /^fe[89ab][0-9a-f]:/.test(host)
  )
    return true;
  return PRIVATE_DNS_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
export {
  resolveCloudLaunchOptions,
  validateSessionIdFlag,
  oneMillionContextNotice,
  trackSessionSwitches,
  mcpConfigIgnoredOnCloud,
  classifyServerLocation,
};
