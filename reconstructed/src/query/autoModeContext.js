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
  SERVER_CLASSIFIER_DECISION_SCHEMA,
  MAX_RULE_CANONICAL_LENGTH,
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
import { SS } from "../../vendor/lodash-es/_inlinedHelpers.js";
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
import { Ji } from "../../vendor/lodash-es/uniqBy.js";
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

//@ chunk-ha3km179.js:120069-125379 placement
/**
 * 为 auto mode 分类器组装上下文：各来源的权限规则、MCP 挂载、用户设置、环境与 git 状态。
 */
async function buildAutoModeContext(toolPermissionContext, n, r = false) {
  let s = r && isNonAutoMode(toolPermissionContext.mode);
  let h = toPosixPath;
  let y = isDiskless();
  let S = (oe) => oe === "mcpMount" || (y && oe === "userSettings");
  let M = (behavior, ht) =>
    ht.map((ut) => {
      let kt = formatPermissionRule(ut.ruleValue);
      let Gt = {
        rule: matchLegacyRule(ut.stored ?? kt, behavior),
        source: ut.source,
        ...(ut.stored !== undefined &&
          ut.stored !== kt && {
            canonical: matchLegacyRule(kt, behavior),
          }),
      };
      let { toolName, ruleContent } = ut.ruleValue;
      if (
        ruleContent === undefined ||
        It === null ||
        (toolName !== FILE_READ_TOOL_NAME && toolName !== FILE_EDIT_TOOL_NAME)
      )
        return Gt;
      if ((y && ruleContent.startsWith("~/")) || (S(ut.source) && /^\/(?!\/)/.test(ruleContent))) return Gt;
      let At = compiledPathRulePattern(ruleContent, ut.source, behavior);
      if (At === null) return Gt;
      return {
        ...Gt,
        root: At.root === null ? null : h(At.root),
        pattern: At.pattern,
      };
    });
  let R =
    n?.options.toolAliases && isHazelPloverOn()
      ? Object.entries(n.options.toolAliases)
          .filter(([key, value]) => value !== key)
          .map(([key]) => key)
      : [];
  let T = (oe, ruleBehavior) =>
    Object.entries(oe)
      .flatMap(([key, value]) =>
        (value ?? []).map((Gt) => ({
          source: key,
          ruleBehavior,
          ruleValue: permissionRuleValueFromString(Gt),
          stored: Gt,
        })),
      )
      .filter(
        (ut) =>
          ut.ruleValue.ruleContent !== undefined ||
          allowsAliasExpansion(ut) ||
          !R.some(
            (kt) =>
              ut.ruleValue.toolName === kt ||
              (hasWildcard(ut.ruleValue.toolName) && matchWildcard(ut.ruleValue.toolName, kt)),
          ),
      );
  let { mcpServerPolicy, ...P } = toolPermissionContext.alwaysAskRules;
  let Q = s ? {} : P;
  let D = s
    ? SERVER_CLASSIFIER_DECISION_SCHEMA
    : getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVET_MARBLE_2, SERVER_CLASSIFIER_DECISION_SCHEMA);
  let L =
    typeof D === "number" && Number.isInteger(D) && D > SERVER_CLASSIFIER_DECISION_SCHEMA
      ? Math.min(D, MAX_RULE_CANONICAL_LENGTH)
      : SERVER_CLASSIFIER_DECISION_SCHEMA;
  let z = !s && isBuzzingPelicanRouted(toolPermissionContext.mode, toolPermissionContext);
  let G = s ? [] : getAllowRules(toolPermissionContext);
  let pluginRegistry = getPluginRegistry();
  let V;
  if (
    n !== undefined &&
    L > SERVER_CLASSIFIER_DECISION_SCHEMA &&
    !z &&
    pluginRegistry.hooksRespawns.size === 0 &&
    pluginRegistry.hookRegistrationInFlight === undefined &&
    pluginRegistry.hooksUnknownCause === undefined
  )
    try {
      let loadedModulesForSite = getLoadedModulesForSite("tool.check");
      let [ht, ut] = SS(
        G.filter(
          ({ ruleValue }) =>
            ruleValue.ruleContent === undefined && ruleValue.toolName.startsWith(MCP_TOOL_PREFIX),
        ),
        (it) => isPatternRuleName(it.ruleValue.toolName),
      );
      let kt = Map.groupBy(ut, (it) => it.ruleValue.toolName);
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
      V = new Set(
        n.options.tools
          .filter((tool) => {
            let { name: At, mcpInfo } = tool;
            let we = kt.get(At);
            if (
              we === undefined ||
              mcpInfo === undefined ||
              At !== getToolNameForPermissionCheck(tool) ||
              wireName(At) !== At
            )
              return false;
            return (
              mcpInfo.serverType !== undefined &&
              !isIdeOrSdkType(mcpInfo.serverType) &&
              mcpInfo.serverName !== REMOTE_DEVICES &&
              !isChromeToolName(At) &&
              !isClassifiableBrowserCall(At) &&
              tool.classifierOnly === undefined &&
              tool.ignoresWholeToolAllowRule === undefined &&
              !hadRefusedMcpSkip(At) &&
              !hasModuleHookingSite(
                "tool.check",
                {
                  ...matcherTestTarget(tool),
                  agentId: n.agentId,
                },
                loadedModulesForSite,
              ) &&
              !isToolDeniedByIndex(toolPermissionContext, denyRuleIndex, tool) &&
              [...we.toReversed(), ...ht.filter((Le) => toolMatchesWholeToolRule(tool, Le))].every(
                (Le) =>
                  getMcpRuleClassifierRoute(
                    Le,
                    tool,
                    {},
                    isAutoAllowedInMode(tool, toolPermissionContext),
                    n,
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
  let filtered = G.filter(
    ({ ruleValue }) =>
      toInternalToolName(ruleValue.toolName) === ruleValue.toolName &&
      !(z && mcpInfoFromString(ruleValue.toolName) !== null) &&
      !isDeepDuskDeviceTool(ruleValue.toolName, toolPermissionContext.mode, toolPermissionContext) &&
      !isRemoteBrowserUnderModeFloor(ruleValue.toolName) &&
      !(
        V !== undefined &&
        ruleValue.ruleContent === undefined &&
        ruleValue.toolName.startsWith(MCP_TOOL_PREFIX) &&
        !V.has(ruleValue.toolName)
      ) &&
      !(
        ruleValue.ruleContent === undefined &&
        isWebFetchOrSearch(ruleValue.toolName) &&
        isWebToolClassifierRouted_2(ruleValue.toolName, toolPermissionContext.mode, toolPermissionContext)
      ),
  );
  let ie = Ji(filtered, (oe) => `${oe.source} ${formatPermissionRule(oe.ruleValue)}`);
  let Z = L > SERVER_CLASSIFIER_DECISION_SCHEMA ? ie : filtered;
  let autoModeConfig = getAutoModeConfig();
  let allow = autoModeConfig?.allow ?? [];
  let se = replacesDefaults(allow) ? scheduledTaskRule() : undefined;
  let allow_2 = se === undefined || allow.includes(se) ? allow : [...allow, se];
  let sessionId = getSessionId();
  let nt = claudeInChromeSession().lastExecutedTabUrlByScope.get(sessionKeyOrHostKey());
  let bt = nt === undefined ? [] : [[sessionId, nt]];
  let dt = bt;
  let rt = bt.length === 0 ? undefined : await listTabsWithTimeout();
  let le = rt !== undefined && rt.length > MAX_TAB_NAME_CHARS;
  let Pe =
    dt.length === 0
      ? undefined
      : {
          enabled: toolPermissionContext.chromeNavigationClassifierEnabled === true,
          baselines: Object.fromEntries(
            dt.map(([oe, ht]) => [oe.slice(0, MAX_TAB_COUNT), formatOriginForClassifier(ht)]),
          ),
          ...(rt !== undefined && {
            tabs: {
              [sessionId.slice(0, MAX_TAB_COUNT)]: Object.fromEntries(
                rt
                  .slice(0, MAX_TAB_NAME_CHARS)
                  .map((oe) => [String(oe.tabId), formatOriginForClassifier(oe.url)]),
              ),
            },
          }),
        };
  let Ke = (oe) => ({
    path: h(oe),
    resolved: s ? [] : y ? [h(oe)] : getResolvedWorkingDirPaths(oe).map(h),
  });
  let cwdOrNull = getCwdOrNull();
  let originalCwdOrNull = getOriginalCwdOrNull();
  let It =
    cwdOrNull === null || originalCwdOrNull === null
      ? null
      : {
          live: cwdOrNull,
          original: originalCwdOrNull,
        };
  let go = {
    permission_mode: toolPermissionContext.mode,
    platform: getPlatform(),
    ...(It !== null && {
      live_cwd: h(It.live),
    }),
    ...(!y && {
      home_dir: h(homedir().normalize("NFC")),
    }),
    rule_roots:
      It === null || s
        ? {}
        : Object.fromEntries(
            PERMISSION_RULE_SOURCES.filter((oe) => !S(oe)).map((oe) => [oe, h(rootPathForSource(oe))]),
          ),
    trusted_directories: {
      ...(It !== null && {
        primary: Ke(It.original),
      }),
      additional: s
        ? []
        : Array.from(toolPermissionContext.additionalWorkingDirectories.values(), (oe) => ({
            ...Ke(oe.path),
            source: oe.source,
          })),
      network: s
        ? []
        : uniq(
            Array.from(toolPermissionContext.trustedNetworkDirectories?.entries() ?? [], ([oe, ht]) => [
              oe,
              ...ht,
            ])
              .flat()
              .map(h),
          ),
      block_reads_outside_working_directories:
        toolPermissionContext.blockReadsOutsideWorkingDirectories === true,
    },
    rules: {
      allow: M("allow", Z),
      deny: M("deny", T(toolPermissionContext.alwaysDenyRules, "deny")),
      ask: M("ask", T(Q, "ask")),
    },
    case_insensitive_paths: getPlatform() === "windows",
    auto_mode: {
      allow: allow_2,
      soft_deny: autoModeConfig?.soft_deny ?? [],
      hard_deny: autoModeConfig?.hard_deny ?? [],
      environment: autoModeConfig?.environment ?? [],
    },
    artifact_consent_holdback: !recordArtifactConsentFlag(),
    ...(Pe !== undefined && {
      chrome_navigation: Pe,
    }),
    ...(le && {
      truncated: true,
    }),
    restricted: toolPermissionContext.restricted === true,
    is_remote_mode: toolPermissionContext.isRemoteMode === true,
    ...(V !== undefined && {
      mcp_allow_rules_exact: true,
    }),
    classify_all_shell: classifyAllShellEnabled(),
    user_identity: await withTimeoutDefault(getClassifierUserTag(), MAX_GIT_FACTS_BYTES, null),
  };
  return clampClassifierVerdict(go, L, (oe) => {
    let sessionId = getSessionId();
    let ut = s ? "rulesUnread" : "whole";
    if (gitEnvCache[ut] === sessionId) return;
    gitEnvCache[ut] = sessionId;
    logEvent("tengu_auto_mode_context_incomplete", {
      rules_left_out: s,
      bytes: oe.bytes,
      bytes_before_shedding: oe.bytesBeforeShedding,
      over_cap_before_shedding: oe.overCapBeforeShedding,
      over_cap: oe.overCap,
      allow_rules_shed: oe.allowRulesShed,
      resolved_spellings_shed: oe.resolvedSpellingsShed,
      path_clamped: oe.pathClamped,
      identity_clamped: oe.identityClamped,
      additional_directories: oe.additionalDirectories,
      network_roots: oe.networkRoots,
      chrome_tabs_cut: le,
      truncated: oe.truncated,
      dropped_allow: oe.dropped.allow ?? 0,
      dropped_deny: oe.dropped.deny ?? 0,
      dropped_ask: oe.dropped.ask ?? 0,
      allow_rules: filtered.length,
      allow_rules_repeated: filtered.length - ie.length,
      allow_rules_distinct: uniq(filtered.map((kt) => formatPermissionRule(kt.ruleValue))).length,
      allow_rules_cap: L,
      deny_rules: oe.denyRules,
      ask_rules: oe.askRules,
      auto_mode_allow: allow.length,
      auto_mode_soft_deny: oe.autoMode.softDeny,
      auto_mode_hard_deny: oe.autoMode.hardDeny,
      auto_mode_environment: oe.autoMode.environment,
    });
  });
}
//@ chunk-ha3km179.js:125379-126239 placement
/**
 * 判断本回合是否请求 auto mode（beta 被拒、未开启等原因上报）。
 */
function checkAutoModeRequested(toolUseContext, n) {
  try {
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    let { role, offReason } = checkServerClassifierEligibility(toolPermissionContext.mode);
    let y = role !== "off";
    let S = isBetaRejected(n, BETA_DANGEROUS_TOOL_USE);
    if ((S || !y) && offReason !== "not_auto_mode") {
      let w = S ? "beta_rejected" : offReason;
      if (w !== undefined && w !== "refused_latch")
        logServerCheckDiagnostic({
          state: "not_requested",
          reason: w,
        });
    }
    if (S) return;
    let M = y
      ? undefined
      : new Set(
          toolUseContext.options.tools
            .filter((tool) => isMcpReviewedOutsideAuto(tool, toolPermissionContext))
            .map((tool) => tool.name),
        );
    if (M !== undefined && (M.size === 0 || M.size > TAB_WAIT_MS)) return;
    let cwdOrNull = getCwdOrNull();
    let T = {};
    return {
      probeTrace: T,
      ...(M !== undefined && {
        judgeOnlyTools: M,
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
        M !== undefined && !env.CLAUDE_CODE_AUTO_MODE_FULL_CONTEXT,
      ).catch((error) => {
        logError(error);
        return;
      }),
      git:
        M === undefined
          ? collectGitState(cwdOrNull, toolUseContext.abortController.signal, T)
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
async function refreshGitStateSafe(autoModeContextPromise, n = timerUtils) {
  if (autoModeContextPromise === undefined) return;
  try {
    return await refreshAutoModeGitState(autoModeContextPromise, n);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:126471-127611 placement
/**
 * 刷新 auto mode 上下文的 git 状态（超出上限时上报 tengu_auto_mode_context_over_ceiling）。
 */
async function refreshAutoModeGitState(e, n) {
  let context = await e.context;
  if (context === undefined) return;
  let s = jsonByteLength(context);
  if (s > MAX_CLASSIFIER_PAYLOAD_BYTES && e.overCeilingLogged === undefined) {
    e.overCeilingLogged = true;
    logEvent("tengu_auto_mode_context_over_ceiling", {
      bytes: s,
    });
  }
  let now = Date.now();
  let y = await withTimeoutDefault_2(e.git, n, TENGU_VELVET_MARBLE, {
    cwd: e.cwd,
    root: null,
    branch: null,
    default_branch: null,
    status: null,
    visibility: null,
    error: "pending",
  });
  let S = clampGitStateForClassifier({
    ...y,
    cwd: y.cwd === null ? null : toPosixPath(y.cwd),
    root: y.root === null ? null : toPosixPath(y.root),
  });
  if (e.logged === undefined) {
    e.logged = true;
    let firstInProcess = !visibilityQueryState.logged;
    visibilityQueryState.logged = true;
    logEvent("tengu_auto_mode_git_state_probe", {
      duration_ms: now - e.startedAt,
      wait_ms: Date.now() - now,
      outcome: fromEnum(S.error ?? (S.status === null ? "no_status" : S.status.clean ? "clean" : "dirty")),
      truncated: S.truncated === true || S.status?.truncated === true,
      first_in_process: firstInProcess,
      repo_visibility_lookup: fromEnum(visibilityLookupKind(e, S)),
      ...(e.cwd === null && {
        no_directory: true,
      }),
    });
  }
  let M;
  try {
    let { artifactsClassifierContext } = await import("./chunk-3jhw7vrg.js");
    M = artifactsClassifierContext({
      tools: e.tools,
    });
  } catch (error) {
    logError(error);
    M = undefined;
  }
  return {
    context,
    git: S,
    ...(M !== undefined && {
      artifacts: M,
    }),
    ...(e.judgeOnlyTools !== undefined && {
      judgeOnlyTools: e.judgeOnlyTools,
    }),
    ...((await isComputerAttachedSafe(e)) &&
      isValiantSphinxOn() && {
        computerAttached: true,
      }),
    ...(e.structuredOutputIsHandback === true && {
      structuredOutputIsHandback: true,
    }),
  };
}
//@ chunk-ha3km179.js:127611-127743 placement
/**
 * 调用 computerAttached（失败时视为已连接）。
 */
async function isComputerAttachedSafe(e) {
  if (e.computerAttached === undefined) return true;
  try {
    return (await e.computerAttached()) !== false;
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
    let { isComputerAttached } = await import("./chunk-xssqvf8d.js");
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
var visibilityQueryState = identity(
  {
    logged: false,
  },
  (e) => {
    e.logged = false;
  },
);
//@ chunk-ha3km179.js:127935-128166 placement
/**
 * 仓库可见性查询的来源（缓存命中、加入进行中、自行查询、未到达）。
 */
function visibilityLookupKind(e, n) {
  let visibility = e.probeTrace.visibility;
  switch (visibility?.lookup) {
    case "hit":
      return "cache_hit";
    case "joined":
      return "joined_running";
    case "fetched":
      return "own_lookup";
    default:
      return visibility !== undefined && n.error === "pending" ? "not_reached" : "none";
  }
}
//@ chunk-ha3km179.js:128166-128243 placement
/**
 * setTimeout 包装
 */
var timerUtils = {
  setTimeout: (e, n) => {
    let timer = setTimeout(e, n);
    return () => clearTimeout(timer);
  },
};
//@ chunk-ha3km179.js:128243-128401 placement
/**
 * 等待 Promise，超时或失败时返回默认值。
 */
function withTimeoutDefault_2(e, n, r, s) {
  return new Promise((resolve) => {
    let y = false;
    let S = n.setTimeout(() => {
      if (!y) {
        y = true;
        resolve(s);
      }
    }, r);
    e.then(
      (M) => {
        if (!y) {
          y = true;
          S();
          resolve(M);
        }
      },
      () => {
        if (!y) {
          y = true;
          S();
          resolve(s);
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
  messagesForQuery,
  toolUseContext,
  { querySource, resumeActive, model, stamp },
) {
  if (resumeActive || classifyQuerySource(querySource) === "auxiliary") return [];
  try {
    let last = messagesForQuery.findLast(
      (R) =>
        R.type === "user" && !R.isCompactSummary && R.taskDelivery === undefined && !isToolResultMessage(R),
    );
    if (last?.type === "user" && last.handedOff) {
      let policyAttributionOverrides = getPolicyAttributionOverrides();
      if (!policyAttributionOverrides.commit && !policyAttributionOverrides.pr) return [];
    }
    let M = await remoteSessionChangeAttachments(messagesForQuery, toolUseContext.options.tools, model);
    return M ? [createAttachmentMessage_2(M, stamp)] : [];
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-ha3km179.js:128761-129466 placement
/**
 * 远程会话/桥接变更时生成提示附件。
 */
async function remoteSessionChangeAttachments(e, tools, model) {
  let s = lastRemoteSessionAttachment(e);
  let url = getSessionAttribution()?.url ?? null;
  let sdkHostedBridgeHandle = getSdkHostedBridgeHandle();
  let S =
    (getRemoteControlSessionCompatId() !== undefined ||
      (sdkHostedBridgeHandle !== null && !sdkHostedBridgeHandle.outboundOnly)) &&
    tools.some((Q) => toolMatchesName(Q, SEND_USER_FILE_TOOL_NAME));
  let M = isAttributionAnnouncementEnabled();
  let model_2 = M ? model : undefined;
  if (s === undefined) {
    let Q = url !== null || S;
    if (
      !Q &&
      !(
        M &&
        shouldIncludeGitInstructions() &&
        (tools.some((G) => toolMatchesName(G, BASH_TOOL_NAME)) || alwaysFalseStream(tools))
      )
    )
      return;
    let { commit, pr } = await repoCommitAndPr(model_2);
    if (!Q && !commit && !pr) return;
    let policyAttributionOverrides = getPolicyAttributionOverrides();
    return {
      type: "remote_session_change",
      url,
      commit,
      pr,
      sendUserFileHint: S,
      managedCommit: policyAttributionOverrides.commit,
      managedPr: policyAttributionOverrides.pr,
    };
  }
  let { commit, pr } = await repoCommitAndPr(model_2);
  let policyAttributionOverrides = getPolicyAttributionOverrides();
  if (
    url === s.url &&
    S === s.sendUserFileHint &&
    commit === s.commit &&
    pr === s.pr &&
    policyAttributionOverrides.commit === (s.managedCommit ?? false) &&
    policyAttributionOverrides.pr === (s.managedPr ?? false)
  )
    return;
  return {
    type: "remote_session_change",
    url,
    commit,
    pr,
    sendUserFileHint: S,
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
      uuids: messages.map((n) => n.uuid),
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
function withTurnMessages(toolUseContext, n, isHumanTurn) {
  try {
    return {
      ...toolUseContext,
      messages: n,
      turnStartIndex: isHumanTurn(n),
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
function dropPutBackMessages(messageQueue, n, r) {
  try {
    if (r) messageQueue.settleTaken();
    return n.filter((s) => !messageQueue.wasPutBack(s));
  } catch (error) {
    logError(error);
    return n;
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
