/**
 * query/autoModeContext.ts
 *
 * 2.1.316 新增：为 auto mode 分类器组装上下文：各来源的权限规则、MCP 挂载、用户设置、环境与 git 状态；刷新 auto mode 上下文的 git 状态（超出上限时上报 tengu_auto_mode_context_over_ceiling）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (18)
 * attribution: placement 18
 */
import { homedir } from "os";
import {
  isNonAutoMode,
  isMcpReviewedOutsideAuto,
} from "../utils/permissions/serverClassifier/fallbackNotice.js";
import {
  toPosixPath,
  compiledPathRulePattern,
  getResolvedWorkingDirPaths,
  rootPathForSource,
} from "../utils/permissions/filesystem.js";
import { isDiskless, getSessionId, getOriginalCwdOrNull } from "../bootstrap/state.js";
import { formatPermissionRule } from "../utils/permissions/disallowedToolsFlag.js";
import { matchLegacyRule, wireName, toInternalToolName } from "../services/mcp/serverIdentity.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { isHazelPloverOn, isValiantSphinxOn } from "../utils/permissions/serverClassifier/flags.js";
import {
  permissionRuleValueFromString,
  hasWildcard,
  matchWildcard,
} from "../utils/permissions/permissionRuleParser.js";
import {
  allowsAliasExpansion,
  isBuzzingPelicanRouted,
  getAllowRules,
  isPatternRuleName,
  getAskRules,
  buildDenyRuleIndex,
  isToolDeniedByIndex,
  toolMatchesWholeToolRule,
  getMcpRuleClassifierRoute,
  isDeepDuskDeviceTool,
  isWebFetchOrSearch,
  isWebToolClassifierRouted_2,
  PERMISSION_RULE_SOURCES,
} from "../utils/permissions/permissions.js";
import {
  DEFAULT_MAX_SAVED_RULES,
  MAX_SAVED_RULES_SETTING,
  MAX_CLASSIFIER_PAYLOAD_BYTES,
} from "../utils/permissions/serverClassifier/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  TENGU_VELVET_MARBLE_2,
  scheduledTaskRule,
  listTabsWithTimeout,
  MAX_TAB_NAME_CHARS,
  MAX_TAB_COUNT,
  withTimeoutDefault,
  MAX_GIT_FACTS_BYTES,
  gitEnvCache,
  TAB_WAIT_MS,
  collectGitState,
  TENGU_VELVET_MARBLE,
} from "./autoModeGitState.js";
import { getPluginRegistry } from "../utils/plugins/pluginLoadState.js";
import {
  getLoadedModulesForSite,
  hasModuleHookingSite,
} from "../plugins/hooksModules/loadedModuleFilters.js";
import { partitionAlias } from "../../vendor/lodash-es/_inlinedHelpers.js";
import {
  MCP_TOOL_PREFIX,
  getToolNameForPermissionCheck,
  mcpInfoFromString,
} from "../services/mcp/mcpStringUtils.js";
import { isIdeOrSdkType } from "../services/mcp/types.js";
import { REMOTE_DEVICES } from "../services/mcp/firstPartyServerIds.js";
import { isChromeToolName } from "../utils/claudeInChrome/chromeToolNames.js";
import { isClassifiableBrowserCall } from "../utils/permissions/browserComputerUseTools.js";
import { hadRefusedMcpSkip } from "../utils/permissions/autoModeState.js";
import { matcherTestTarget } from "../utils/hooks/matcherGrammar.js";
import { isAutoAllowedInMode } from "../utils/permissions/browserToolNames.js";
import {
  getAutoModeClassifierRole,
  checkServerClassifierEligibility,
} from "../utils/permissions/serverClassifier/arbiter.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { isRemoteBrowserUnderModeFloor } from "../utils/permissions/mcpRuleMatching.js";
import { uniqByExport } from "../../vendor/lodash-es/uniqBy.js";
import { getAutoModeConfig } from "../utils/settings/settings.js";
import { replacesDefaults } from "../utils/permissions/autoModeRulesPrompt.js";
import { claudeInChromeSession } from "../commands/mobile/mobile.js";
import { sessionKeyOrHostKey } from "../utils/hostSuppliedKey.js";
import { formatOriginForClassifier } from "../utils/permissions/classifierHostContext.js";
import { getCwdOrNull } from "../utils/cwd.js";
import { getPlatform } from "../utils/platform.js";
import { uniq } from "../utils/collections.js";
import { recordArtifactConsentFlag } from "../utils/permissions/yoloClassifier.js";
import { classifyAllShellEnabled } from "../utils/permissions/permissionSetup.js";
import { getClassifierUserTag } from "../utils/permissions/classifierCacheBreak.js";
import {
  clampClassifierVerdict,
  jsonByteLength,
  clampGitStateForClassifier,
} from "../utils/permissions/serverClassifier/clamp.js";
import { logEvent } from "../services/analytics/index.js";
import { getToolPermissionContext, modeAtRequestFor } from "../utils/permissions/toolPermissionContext.js";
import { isBetaRejected } from "../bootstrap/stateSlices.js";
import { BETA_DANGEROUS_TOOL_USE } from "../utils/betas.js";
import { logServerCheckDiagnostic } from "../utils/permissions/serverClassifier/results.js";
import { env } from "../utils/env.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { identity } from "../utils/identity.js";
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import { isToolResultMessage } from "../utils/messages.js";
import {
  getPolicyAttributionOverrides,
  getSessionAttribution,
  buildSessionAttributionTexts,
} from "../utils/attribution.js";
import { createAttachmentMessage_2 } from "../utils/debug.js";
import { lastRemoteSessionAttachment } from "../utils/contextAttachments/remoteSession.js";
import { getSdkHostedBridgeHandle, getRemoteControlSessionCompatId } from "../bridge/replBridgeHandle.js";
import { toolMatchesName } from "../Tool.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { isAttributionAnnouncementEnabled } from "../bridge/bridgeEnabled.js";
import { shouldIncludeGitInstructions } from "../utils/gitSettings.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { alwaysFalseStream } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { runInRemoteCallFrameMain } from "../remote/remoteMode.js";
import { latestPromptSnapshot } from "../utils/contextAttachments/promptSnapshot.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ha3km179.js:120069-125379 placement
/**
 * 为 auto mode 分类器组装上下文：各来源的权限规则、MCP 挂载、用户设置、环境与 git 状态。
 */
async function buildAutoModeContext(toolPermissionContext, toolUseContext, judgeOnlyToolsConfigured = false) {
  let rulesUnread = judgeOnlyToolsConfigured && isNonAutoMode(toolPermissionContext.mode);
  let toPosix = toPosixPath;
  let diskless = isDiskless();
  let isVolatileRuleSource = (source) => source === "mcpMount" || (diskless && source === "userSettings");
  let mapRules = (behavior, rules) =>
    rules.map((rule) => {
      let formattedRule = formatPermissionRule(rule.ruleValue);
      let mappedRule = {
        rule: matchLegacyRule(rule.stored ?? formattedRule, behavior),
        source: rule.source,
        ...(rule.stored !== undefined &&
          rule.stored !== formattedRule && {
            canonical: matchLegacyRule(formattedRule, behavior),
          }),
      };
      let { toolName, ruleContent } = rule.ruleValue;
      if (
        ruleContent === undefined ||
        cwdInfo === null ||
        (toolName !== FILE_READ_TOOL_NAME && toolName !== FILE_EDIT_TOOL_NAME)
      )
        return mappedRule;
      if (
        (diskless && ruleContent.startsWith("~/")) ||
        (isVolatileRuleSource(rule.source) && /^\/(?!\/)/.test(ruleContent))
      )
        return mappedRule;
      let compiledPattern = compiledPathRulePattern(ruleContent, rule.source, behavior);
      if (compiledPattern === null) return mappedRule;
      return {
        ...mappedRule,
        root: compiledPattern.root === null ? null : toPosix(compiledPattern.root),
        pattern: compiledPattern.pattern,
      };
    });
  let aliasedToolNames =
    toolUseContext?.options.toolAliases && isHazelPloverOn()
      ? Object.entries(toolUseContext.options.toolAliases)
          .filter(([key, value]) => value !== key)
          .map(([key]) => key)
      : [];
  let collectRulesBySource = (rulesBySource, ruleBehavior) =>
    Object.entries(rulesBySource)
      .flatMap(([key, value]) =>
        (value ?? []).map((ruleString) => ({
          source: key,
          ruleBehavior,
          ruleValue: permissionRuleValueFromString(ruleString),
          stored: ruleString,
        })),
      )
      .filter(
        (mappedRule) =>
          mappedRule.ruleValue.ruleContent !== undefined ||
          allowsAliasExpansion(mappedRule) ||
          !aliasedToolNames.some(
            (aliasName) =>
              mappedRule.ruleValue.toolName === aliasName ||
              (hasWildcard(mappedRule.ruleValue.toolName) &&
                matchWildcard(mappedRule.ruleValue.toolName, aliasName)),
          ),
      );
  let { mcpServerPolicy, ...askRulesWithoutPolicy } = toolPermissionContext.alwaysAskRules;
  let baseAskRules = rulesUnread ? {} : askRulesWithoutPolicy;
  let configuredMaxRules = rulesUnread
    ? DEFAULT_MAX_SAVED_RULES
    : getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVET_MARBLE_2, DEFAULT_MAX_SAVED_RULES);
  let maxAllowRules =
    typeof configuredMaxRules === "number" &&
    Number.isInteger(configuredMaxRules) &&
    configuredMaxRules > DEFAULT_MAX_SAVED_RULES
      ? Math.min(configuredMaxRules, MAX_SAVED_RULES_SETTING)
      : DEFAULT_MAX_SAVED_RULES;
  let classifierRouted =
    !rulesUnread && isBuzzingPelicanRouted(toolPermissionContext.mode, toolPermissionContext);
  let allowRules = rulesUnread ? [] : getAllowRules(toolPermissionContext);
  let pluginRegistry = getPluginRegistry();
  let exactMcpToolNames;
  if (
    toolUseContext !== undefined &&
    maxAllowRules > DEFAULT_MAX_SAVED_RULES &&
    !classifierRouted &&
    pluginRegistry.hooksRespawns.size === 0 &&
    pluginRegistry.hookRegistrationInFlight === undefined &&
    pluginRegistry.hooksUnknownCause === undefined
  )
    try {
      let loadedModulesForSite = getLoadedModulesForSite("tool.check");
      let [wholeToolRules, patternRules] = partitionAlias(
        allowRules.filter(
          ({ ruleValue }) =>
            ruleValue.ruleContent === undefined && ruleValue.toolName.startsWith(MCP_TOOL_PREFIX),
        ),
        (rule) => isPatternRuleName(rule.ruleValue.toolName),
      );
      let rulesByToolName = Map.groupBy(patternRules, (rule) => rule.ruleValue.toolName);
      let askRules = getAskRules(toolPermissionContext);
      let denyRuleIndex = buildDenyRuleIndex(toolPermissionContext, [
        ...askRules,
        ...askRules.map((askRule) => ({
          ...askRule,
          ruleValue: {
            toolName: askRule.ruleValue.toolName,
          },
        })),
      ]);
      exactMcpToolNames = new Set(
        toolUseContext.options.tools
          .filter((tool) => {
            let { name: toolName, mcpInfo } = tool;
            let toolRules = rulesByToolName.get(toolName);
            if (
              toolRules === undefined ||
              mcpInfo === undefined ||
              toolName !== getToolNameForPermissionCheck(tool) ||
              wireName(toolName) !== toolName
            )
              return false;
            return (
              mcpInfo.serverType !== undefined &&
              !isIdeOrSdkType(mcpInfo.serverType) &&
              mcpInfo.serverName !== REMOTE_DEVICES &&
              !isChromeToolName(toolName) &&
              !isClassifiableBrowserCall(toolName) &&
              tool.classifierOnly === undefined &&
              tool.ignoresWholeToolAllowRule === undefined &&
              !hadRefusedMcpSkip(toolName) &&
              !hasModuleHookingSite(
                "tool.check",
                {
                  ...matcherTestTarget(tool),
                  agentId: toolUseContext.agentId,
                },
                loadedModulesForSite,
              ) &&
              !isToolDeniedByIndex(toolPermissionContext, denyRuleIndex, tool) &&
              [
                ...toolRules.toReversed(),
                ...wholeToolRules.filter((rule) => toolMatchesWholeToolRule(tool, rule)),
              ].every(
                (rule) =>
                  getMcpRuleClassifierRoute(
                    rule,
                    tool,
                    {},
                    isAutoAllowedInMode(tool, toolPermissionContext),
                    toolUseContext,
                    () => getAutoModeClassifierRole(toolPermissionContext.mode),
                  ) === undefined,
              )
            );
          })
          .map((tool) => tool.name),
      );
    } catch (error) {
      logError(
        withTelemetryMessage(
          toError(error),
          "Auto mode could not filter the MCP allow rules, so it sends them to the classifier unfiltered and without mcp_allow_rules_exact",
        ),
      );
    }
  let filtered = allowRules.filter(
    ({ ruleValue }) =>
      toInternalToolName(ruleValue.toolName) === ruleValue.toolName &&
      !(classifierRouted && mcpInfoFromString(ruleValue.toolName) !== null) &&
      !isDeepDuskDeviceTool(ruleValue.toolName, toolPermissionContext.mode, toolPermissionContext) &&
      !isRemoteBrowserUnderModeFloor(ruleValue.toolName) &&
      !(
        exactMcpToolNames !== undefined &&
        ruleValue.ruleContent === undefined &&
        ruleValue.toolName.startsWith(MCP_TOOL_PREFIX) &&
        !exactMcpToolNames.has(ruleValue.toolName)
      ) &&
      !(
        ruleValue.ruleContent === undefined &&
        isWebFetchOrSearch(ruleValue.toolName) &&
        isWebToolClassifierRouted_2(ruleValue.toolName, toolPermissionContext.mode, toolPermissionContext)
      ),
  );
  let distinctRules = uniqByExport(
    filtered,
    (rule) => `${rule.source} ${formatPermissionRule(rule.ruleValue)}`,
  );
  let classifierAllowRules = maxAllowRules > DEFAULT_MAX_SAVED_RULES ? distinctRules : filtered;
  let autoModeConfig = getAutoModeConfig();
  let allow = autoModeConfig?.allow ?? [];
  let scheduledTaskRule_2 = replacesDefaults(allow) ? scheduledTaskRule() : undefined;
  let allow_2 =
    scheduledTaskRule_2 === undefined || allow.includes(scheduledTaskRule_2)
      ? allow
      : [...allow, scheduledTaskRule_2];
  let sessionId = getSessionId();
  let lastTabUrl = claudeInChromeSession().lastExecutedTabUrlByScope.get(sessionKeyOrHostKey());
  let tabBaselineEntries = lastTabUrl === undefined ? [] : [[sessionId, lastTabUrl]];
  let chromeTabBaselines = tabBaselineEntries;
  let openTabTitles = tabBaselineEntries.length === 0 ? undefined : await listTabsWithTimeout();
  let tabsTruncated = openTabTitles !== undefined && openTabTitles.length > MAX_TAB_NAME_CHARS;
  let chromeNavigation =
    chromeTabBaselines.length === 0
      ? undefined
      : {
          enabled: toolPermissionContext.chromeNavigationClassifierEnabled === true,
          baselines: Object.fromEntries(
            chromeTabBaselines.map(([scopeKey, tabUrl]) => [
              scopeKey.slice(0, MAX_TAB_COUNT),
              formatOriginForClassifier(tabUrl),
            ]),
          ),
          ...(openTabTitles !== undefined && {
            tabs: {
              [sessionId.slice(0, MAX_TAB_COUNT)]: Object.fromEntries(
                openTabTitles
                  .slice(0, MAX_TAB_NAME_CHARS)
                  .map((tab) => [String(tab.tabId), formatOriginForClassifier(tab.url)]),
              ),
            },
          }),
        };
  let toTrustedDir = (dirPath) => ({
    path: toPosix(dirPath),
    resolved: rulesUnread
      ? []
      : diskless
        ? [toPosix(dirPath)]
        : getResolvedWorkingDirPaths(dirPath).map(toPosix),
  });
  let cwdOrNull = getCwdOrNull();
  let originalCwdOrNull = getOriginalCwdOrNull();
  let cwdInfo =
    cwdOrNull === null || originalCwdOrNull === null
      ? null
      : {
          live: cwdOrNull,
          original: originalCwdOrNull,
        };
  let classifierContext = {
    permission_mode: toolPermissionContext.mode,
    platform: getPlatform(),
    ...(cwdInfo !== null && {
      live_cwd: toPosix(cwdInfo.live),
    }),
    ...(!diskless && {
      home_dir: toPosix(homedir().normalize("NFC")),
    }),
    rule_roots:
      cwdInfo === null || rulesUnread
        ? {}
        : Object.fromEntries(
            PERMISSION_RULE_SOURCES.filter((source) => !isVolatileRuleSource(source)).map((source) => [
              source,
              toPosix(rootPathForSource(source)),
            ]),
          ),
    trusted_directories: {
      ...(cwdInfo !== null && {
        primary: toTrustedDir(cwdInfo.original),
      }),
      additional: rulesUnread
        ? []
        : Array.from(toolPermissionContext.additionalWorkingDirectories.values(), (directory) => ({
            ...toTrustedDir(directory.path),
            source: directory.source,
          })),
      network: rulesUnread
        ? []
        : uniq(
            Array.from(
              toolPermissionContext.trustedNetworkDirectories?.entries() ?? [],
              ([host, networkEntries]) => [host, ...networkEntries],
            )
              .flat()
              .map(toPosix),
          ),
      block_reads_outside_working_directories:
        toolPermissionContext.blockReadsOutsideWorkingDirectories === true,
    },
    rules: {
      allow: mapRules("allow", classifierAllowRules),
      deny: mapRules("deny", collectRulesBySource(toolPermissionContext.alwaysDenyRules, "deny")),
      ask: mapRules("ask", collectRulesBySource(baseAskRules, "ask")),
    },
    case_insensitive_paths: getPlatform() === "windows",
    auto_mode: {
      allow: allow_2,
      soft_deny: autoModeConfig?.soft_deny ?? [],
      hard_deny: autoModeConfig?.hard_deny ?? [],
      environment: autoModeConfig?.environment ?? [],
    },
    artifact_consent_holdback: !recordArtifactConsentFlag(),
    ...(chromeNavigation !== undefined && {
      chrome_navigation: chromeNavigation,
    }),
    ...(tabsTruncated && {
      truncated: true,
    }),
    restricted: toolPermissionContext.restricted === true,
    is_remote_mode: toolPermissionContext.isRemoteMode === true,
    ...(exactMcpToolNames !== undefined && {
      mcp_allow_rules_exact: true,
    }),
    classify_all_shell: classifyAllShellEnabled(),
    user_identity: await withTimeoutDefault(getClassifierUserTag(), MAX_GIT_FACTS_BYTES, null),
  };
  return clampClassifierVerdict(classifierContext, maxAllowRules, (capReport) => {
    let sessionId = getSessionId();
    let rulesReadState = rulesUnread ? "rulesUnread" : "whole";
    if (gitEnvCache[rulesReadState] === sessionId) return;
    gitEnvCache[rulesReadState] = sessionId;
    logEvent("tengu_auto_mode_context_incomplete", {
      rules_left_out: rulesUnread,
      bytes: capReport.bytes,
      bytes_before_shedding: capReport.bytesBeforeShedding,
      over_cap_before_shedding: capReport.overCapBeforeShedding,
      over_cap: capReport.overCap,
      allow_rules_shed: capReport.allowRulesShed,
      resolved_spellings_shed: capReport.resolvedSpellingsShed,
      path_clamped: capReport.pathClamped,
      identity_clamped: capReport.identityClamped,
      additional_directories: capReport.additionalDirectories,
      network_roots: capReport.networkRoots,
      chrome_tabs_cut: tabsTruncated,
      truncated: capReport.truncated,
      dropped_allow: capReport.dropped.allow ?? 0,
      dropped_deny: capReport.dropped.deny ?? 0,
      dropped_ask: capReport.dropped.ask ?? 0,
      allow_rules: filtered.length,
      allow_rules_repeated: filtered.length - distinctRules.length,
      allow_rules_distinct: uniq(filtered.map((rule) => formatPermissionRule(rule.ruleValue))).length,
      allow_rules_cap: maxAllowRules,
      deny_rules: capReport.denyRules,
      ask_rules: capReport.askRules,
      auto_mode_allow: allow.length,
      auto_mode_soft_deny: capReport.autoMode.softDeny,
      auto_mode_hard_deny: capReport.autoMode.hardDeny,
      auto_mode_environment: capReport.autoMode.environment,
    });
  });
}
//@ chunk-ha3km179.js:125379-126239 placement
/**
 * 判断本回合是否请求 auto mode（beta 被拒、未开启等原因上报）。
 */
function checkAutoModeRequested(toolUseContext, options) {
  try {
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    let { role, offReason } = checkServerClassifierEligibility(toolPermissionContext.mode);
    let roleEnabled = role !== "off";
    let betaRejected = isBetaRejected(options, BETA_DANGEROUS_TOOL_USE);
    if ((betaRejected || !roleEnabled) && offReason !== "not_auto_mode") {
      let offReason_2 = betaRejected ? "beta_rejected" : offReason;
      if (offReason_2 !== undefined && offReason_2 !== "refused_latch")
        logServerCheckDiagnostic({
          state: "not_requested",
          reason: offReason_2,
        });
    }
    if (betaRejected) return;
    let judgeOnlyTools = roleEnabled
      ? undefined
      : new Set(
          toolUseContext.options.tools
            .filter((tool) => isMcpReviewedOutsideAuto(tool, toolPermissionContext))
            .map((tool) => tool.name),
        );
    if (judgeOnlyTools !== undefined && (judgeOnlyTools.size === 0 || judgeOnlyTools.size > TAB_WAIT_MS))
      return;
    let cwdOrNull = getCwdOrNull();
    let probeTrace = {};
    return {
      probeTrace,
      ...(judgeOnlyTools !== undefined && {
        judgeOnlyTools,
        logged: true,
      }),
      tools: toolUseContext.options.tools,
      computerAttached: () => checkComputerAttached(toolUseContext.toolState),
      ...(toolUseContext.options.structuredOutputIsHandback === true && {
        structuredOutputIsHandback: true,
      }),
      context: buildAutoModeContext(
        toolPermissionContext,
        toolUseContext,
        judgeOnlyTools !== undefined && !env.CLAUDE_CODE_AUTO_MODE_FULL_CONTEXT,
      ).catch((error) => {
        logError(error);
        return;
      }),
      git:
        judgeOnlyTools === undefined
          ? collectGitState(cwdOrNull, toolUseContext.abortController.signal, probeTrace)
          : Promise.resolve({
              cwd: cwdOrNull,
              root: null,
              branch: null,
              default_branch: null,
              status: null,
              visibility: null,
            }),
      cwd: cwdOrNull,
      startedAt: Date.now(),
    };
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:126239-126303 placement
/**
 * 取模式的分类器角色
 */
function classifierRoleFor(toolUseContext) {
  try {
    return modeAtRequestFor(getToolPermissionContext(toolUseContext).mode);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:126303-126377 placement
/**
 * 分类器角色非 off
 */
function isClassifierRoleOn(toolUseContext) {
  try {
    return getAutoModeClassifierRole(getToolPermissionContext(toolUseContext).mode) !== "off";
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-ha3km179.js:126377-126471 placement
/**
 * 刷新 auto mode 的 git 状态
 */
async function refreshGitStateSafe(autoModeContext, timerUtils = timerUtils_2) {
  if (autoModeContext === undefined) return;
  try {
    return await refreshAutoModeGitState(autoModeContext, timerUtils);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:126471-127611 placement
/**
 * 刷新 auto mode 上下文的 git 状态（超出上限时上报 tengu_auto_mode_context_over_ceiling）。
 */
async function refreshAutoModeGitState(autoModeContext, timerUtils) {
  let context = await autoModeContext.context;
  if (context === undefined) return;
  let payloadBytes = jsonByteLength(context);
  if (payloadBytes > MAX_CLASSIFIER_PAYLOAD_BYTES && autoModeContext.overCeilingLogged === undefined) {
    autoModeContext.overCeilingLogged = true;
    logEvent("tengu_auto_mode_context_over_ceiling", {
      bytes: payloadBytes,
    });
  }
  let now = Date.now();
  let gitState = await withTimeoutDefault_2(autoModeContext.git, timerUtils, TENGU_VELVET_MARBLE, {
    cwd: autoModeContext.cwd,
    root: null,
    branch: null,
    default_branch: null,
    status: null,
    visibility: null,
    error: "pending",
  });
  let clampedGit = clampGitStateForClassifier({
    ...gitState,
    cwd: gitState.cwd === null ? null : toPosixPath(gitState.cwd),
    root: gitState.root === null ? null : toPosixPath(gitState.root),
  });
  if (autoModeContext.logged === undefined) {
    autoModeContext.logged = true;
    let firstInProcess = !visibilityQueryState.logged;
    visibilityQueryState.logged = true;
    logEvent("tengu_auto_mode_git_state_probe", {
      duration_ms: now - autoModeContext.startedAt,
      wait_ms: Date.now() - now,
      outcome: fromEnum(
        clampedGit.error ??
          (clampedGit.status === null ? "no_status" : clampedGit.status.clean ? "clean" : "dirty"),
      ),
      truncated: clampedGit.truncated === true || clampedGit.status?.truncated === true,
      first_in_process: firstInProcess,
      repo_visibility_lookup: fromEnum(visibilityLookupKind(autoModeContext, clampedGit)),
      ...(autoModeContext.cwd === null && {
        no_directory: true,
      }),
    });
  }
  let artifactsContext;
  try {
    let { artifactsClassifierContext } =
      await import("../services/artifacts/artifactsClassifierContext.lazy.js");
    artifactsContext = artifactsClassifierContext({
      tools: autoModeContext.tools,
    });
  } catch (error) {
    logError(error);
    artifactsContext = undefined;
  }
  return {
    context,
    git: clampedGit,
    ...(artifactsContext !== undefined && {
      artifacts: artifactsContext,
    }),
    ...(autoModeContext.judgeOnlyTools !== undefined && {
      judgeOnlyTools: autoModeContext.judgeOnlyTools,
    }),
    ...((await isComputerAttachedSafe(autoModeContext)) &&
      isValiantSphinxOn() && {
        computerAttached: true,
      }),
    ...(autoModeContext.structuredOutputIsHandback === true && {
      structuredOutputIsHandback: true,
    }),
  };
}
//@ chunk-ha3km179.js:127611-127743 placement
/**
 * 调用 computerAttached（失败时视为已连接）。
 */
async function isComputerAttachedSafe(host) {
  if (host.computerAttached === undefined) return true;
  try {
    return (await host.computerAttached()) !== false;
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-ha3km179.js:127743-127893 placement
/**
 * 动态加载并检查是否连接了 computer use，失败视为已连接。
 */
async function checkComputerAttached(toolState) {
  if (toolState === undefined) return true;
  try {
    let { isComputerAttached } = await import("../services/remoteTools/isComputerAttached.lazy.js");
    return isComputerAttached(toolState);
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-ha3km179.js:127893-127935 placement
/**
 * 可见性查询缓存状态
 */
var visibilityQueryState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ha3km179.js:127893", () => {
  visibilityQueryState = identity(
    {
      logged: false,
    },
    (trace) => {
      trace.logged = false;
    },
  );
});
//@ chunk-ha3km179.js:127935-128166 placement
/**
 * 仓库可见性查询的来源（缓存命中、加入进行中、自行查询、未到达）。
 */
function visibilityLookupKind(autoModeContext, gitState) {
  let visibility = autoModeContext.probeTrace.visibility;
  switch (visibility?.lookup) {
    case "hit":
      return "cache_hit";
    case "joined":
      return "joined_running";
    case "fetched":
      return "own_lookup";
    default:
      return visibility !== undefined && gitState.error === "pending" ? "not_reached" : "none";
  }
}
//@ chunk-ha3km179.js:128166-128243 placement
/**
 * setTimeout 包装
 */
var timerUtils_2 = {
  setTimeout: (callback, delayMs) => {
    let timer = setTimeout(callback, delayMs);
    return () => clearTimeout(timer);
  },
};
//@ chunk-ha3km179.js:128243-128401 placement
/**
 * 等待 Promise，超时或失败时返回默认值。
 */
function withTimeoutDefault_2(promise, timers, timeoutMs, defaultValue) {
  return new Promise((resolve) => {
    let settled = false;
    let timeoutHandle = timers.setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(defaultValue);
      }
    }, timeoutMs);
    promise.then(
      (value) => {
        if (!settled) {
          settled = true;
          timeoutHandle();
          resolve(value);
        }
      },
      () => {
        if (!settled) {
          settled = true;
          timeoutHandle();
          resolve(defaultValue);
        }
      },
    );
  });
}
//@ chunk-ha3km179.js:128401-128761 placement
/**
 * 生成 auto mode 回合附件（辅助查询与恢复中不生成）。
 */
async function autoModeTurnAttachments(
  messages,
  toolUseContext,
  { querySource, resumeActive, model, stamp },
) {
  if (resumeActive || classifyQuerySource(querySource) === "auxiliary") return [];
  try {
    let last = messages.findLast(
      (message) =>
        message.type === "user" &&
        !message.isCompactSummary &&
        message.taskDelivery === undefined &&
        !isToolResultMessage(message),
    );
    if (last?.type === "user" && last.handedOff) {
      let policyAttributionOverrides = getPolicyAttributionOverrides();
      if (!policyAttributionOverrides.commit && !policyAttributionOverrides.pr) return [];
    }
    let attachment = await remoteSessionChangeAttachments(messages, toolUseContext.options.tools, model);
    return attachment ? [createAttachmentMessage_2(attachment, stamp)] : [];
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-ha3km179.js:128761-129466 placement
/**
 * 远程会话/桥接变更时生成提示附件。
 */
async function remoteSessionChangeAttachments(messages, unusedArg, model) {
  let lastChange = lastRemoteSessionAttachment(messages);
  let url = getSessionAttribution()?.url ?? null;
  let sdkHostedBridgeHandle = getSdkHostedBridgeHandle();
  let sendUserFileHint =
    (getRemoteControlSessionCompatId() !== undefined ||
      (sdkHostedBridgeHandle !== null && !sdkHostedBridgeHandle.outboundOnly)) &&
    unusedArg.some((tool) => toolMatchesName(tool, SEND_USER_FILE_TOOL_NAME));
  let attributionEnabled = isAttributionAnnouncementEnabled();
  let model_2 = attributionEnabled ? model : undefined;
  if (lastChange === undefined) {
    let hasAttribution = url !== null || sendUserFileHint;
    if (
      !hasAttribution &&
      !(
        attributionEnabled &&
        shouldIncludeGitInstructions() &&
        (unusedArg.some((tool) => toolMatchesName(tool, BASH_TOOL_NAME)) || alwaysFalseStream(unusedArg))
      )
    )
      return;
    let { commit, pr } = await repoCommitAndPr(model_2);
    if (!hasAttribution && !commit && !pr) return;
    let policyAttributionOverrides = getPolicyAttributionOverrides();
    return {
      type: "remote_session_change",
      url,
      commit,
      pr,
      sendUserFileHint,
      managedCommit: policyAttributionOverrides.commit,
      managedPr: policyAttributionOverrides.pr,
    };
  }
  let { commit, pr } = await repoCommitAndPr(model_2);
  let policyAttributionOverrides = getPolicyAttributionOverrides();
  if (
    url === lastChange.url &&
    sendUserFileHint === lastChange.sendUserFileHint &&
    commit === lastChange.commit &&
    pr === lastChange.pr &&
    policyAttributionOverrides.commit === (lastChange.managedCommit ?? false) &&
    policyAttributionOverrides.pr === (lastChange.managedPr ?? false)
  )
    return;
  return {
    type: "remote_session_change",
    url,
    commit,
    pr,
    sendUserFileHint,
    managedCommit: policyAttributionOverrides.commit,
    managedPr: policyAttributionOverrides.pr,
  };
}
//@ chunk-ha3km179.js:129466-129548 placement
/**
 * 取提交与 PR
 */
function repoCommitAndPr(model) {
  let originalCwdOrNull = getOriginalCwdOrNull();
  return originalCwdOrNull === null
    ? buildSessionAttributionTexts({
        model,
      })
    : runInRemoteCallFrameMain(originalCwdOrNull, () =>
        buildSessionAttributionTexts({
          model,
        }),
      );
}
//@ chunk-ha3km179.js:129548-129637 placement
/**
 * 记录消息与回合起点
 */
function snapshotMessagesAndStart(messages) {
  try {
    return {
      recorded: latestPromptSnapshot(messages),
      uuids: messages.map((message) => message.uuid),
    };
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:129637-129747 placement
/**
 * 更新查询状态的消息与回合起点（失败时保持原状态）。
 */
function withTurnMessages(toolUseContext, messages, isHumanTurn) {
  try {
    return {
      ...toolUseContext,
      messages,
      turnStartIndex: isHumanTurn(messages),
      contextRoom: undefined,
    };
  } catch (error) {
    logError(error);
    return toolUseContext;
  }
}
//@ chunk-ha3km179.js:129747-129854 placement
/**
 * 去掉被放回队列的消息（必要时先结算已取出的）。
 */
function dropPutBackMessages(messageQueue, uuids, shouldSettleTaken) {
  try {
    if (shouldSettleTaken) messageQueue.settleTaken();
    return uuids.filter((uuid) => !messageQueue.wasPutBack(uuid));
  } catch (error) {
    logError(error);
    return uuids;
  }
}
export {
  dropPutBackMessages,
  snapshotMessagesAndStart,
  withTurnMessages,
  autoModeTurnAttachments,
  checkAutoModeRequested,
  classifierRoleFor,
  refreshGitStateSafe,
  isClassifierRoleOn,
};
