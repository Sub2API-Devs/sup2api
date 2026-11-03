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
import { K5s, isMcpReviewedOutsideAuto } from "../utils/permissions/serverClassifier/fallbackNotice.js";
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
import { m4s, g4s } from "../utils/permissions/serverClassifier/flags.js";
import {
  permissionRuleValueFromString,
  hasWildcard,
  matchWildcard,
} from "../utils/permissions/permissionRuleParser.js";
import {
  allowsAliasExpansion,
  mBo,
  getAllowRules,
  isPatternRuleName,
  getAskRules,
  buildDenyRuleIndex,
  isToolDeniedByIndex,
  toolMatchesWholeToolRule,
  getMcpRuleClassifierRoute,
  P9n,
  I9n,
  isWebToolClassifierRouted,
  PERMISSION_RULE_SOURCES,
} from "../utils/permissions/permissions.js";
import {
  SERVER_CLASSIFIER_DECISION_SCHEMA,
  _Vs,
  bVs,
} from "../utils/permissions/serverClassifier/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  TENGU_VELVET_MARBLE,
  Vd,
  gg,
  tu,
  eu,
  withTimeoutDefault,
  mg,
  ou,
  fg,
  collectGitState,
  ug,
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
import { Wjr } from "../utils/permissions/browserComputerUseTools.js";
import { hadRefusedMcpSkip } from "../utils/permissions/autoModeState.js";
import { KW } from "../utils/hooks/matcherGrammar.js";
import { isAutoAllowedInMode } from "../utils/permissions/browserToolNames.js";
import {
  getAutoModeClassifierRole,
  checkServerClassifierEligibility,
} from "../utils/permissions/serverClassifier/arbiter.js";
import { logError } from "../utils/log.js";
import { withTelemetryMessage, toError } from "../utils/errors.js";
import { a4s } from "../utils/permissions/mcpRuleMatching.js";
import { Ji } from "../../vendor/lodash-es/uniqBy.js";
import { getAutoModeConfig } from "../utils/settings/settings.js";
import { replacesDefaults } from "../utils/permissions/autoModeRulesPrompt.js";
import { Yi } from "../commands/mobile/mobile.js";
import { ycn } from "../utils/hostSuppliedKey.js";
import { formatOriginForClassifier } from "../utils/permissions/classifierHostContext.js";
import { gl } from "../utils/cwd.js";
import { getPlatform } from "../utils/platform.js";
import { uniq } from "../utils/collections.js";
import { Ejr } from "../utils/permissions/yoloClassifier.js";
import { PPe } from "../utils/permissions/permissionSetup.js";
import { getClassifierUserTag } from "../utils/permissions/classifierCacheBreak.js";
import {
  clampClassifierVerdict,
  W_e,
  clampGitStateForClassifier,
} from "../utils/permissions/serverClassifier/clamp.js";
import { logEvent } from "../services/analytics/index.js";
import { getToolPermissionContext, Nmi } from "../utils/permissions/toolPermissionContext.js";
import { Lp } from "../bootstrap/stateSlices.js";
import { qT } from "../utils/betas.js";
import { logServerCheckDiagnostic } from "../utils/permissions/serverClassifier/results.js";
import { env } from "../utils/env.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { ge } from "../utils/identity.js";
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import { isToolResultMessage } from "../utils/messages.js";
import { getPolicyAttributionOverrides, getSessionAttribution, CSt } from "../utils/attribution.js";
import { createAttachmentMessage_2 } from "../utils/debug.js";
import { lastRemoteSessionAttachment } from "../utils/contextAttachments/remoteSession.js";
import { getSdkHostedBridgeHandle, getRemoteControlSessionCompatId } from "../bridge/replBridgeHandle.js";
import { toolMatchesName } from "../Tool.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { isAttributionAnnouncementEnabled } from "../bridge/bridgeEnabled.js";
import { shouldIncludeGitInstructions } from "../utils/gitSettings.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { Zar } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { Yg } from "../remote/remoteMode.js";
import { latestPromptSnapshot } from "../utils/contextAttachments/promptSnapshot.js";

/**
 * 为 auto mode 分类器组装上下文：各来源的权限规则、MCP 挂载、用户设置、环境与 git 状态。
 */
//@ chunk-ha3km179.js:120069-125379 placement
async function buildAutoModeContext(e, n, r = !1) {
  let s = r && K5s(e.mode),
    h = toPosixPath,
    y = isDiskless(),
    S = (oe) => oe === "mcpMount" || (y && oe === "userSettings"),
    M = (oe, ht) =>
      ht.map((ut) => {
        let kt = formatPermissionRule(ut.ruleValue),
          Gt = {
            rule: matchLegacyRule(ut.stored ?? kt, oe),
            source: ut.source,
            ...(ut.stored !== void 0 && ut.stored !== kt && { canonical: matchLegacyRule(kt, oe) }),
          },
          { toolName: toolName, ruleContent: ruleContent } = ut.ruleValue;
        if (
          ruleContent === void 0 ||
          It === null ||
          (toolName !== FILE_READ_TOOL_NAME && toolName !== FILE_EDIT_TOOL_NAME)
        )
          return Gt;
        if ((y && ruleContent.startsWith("~/")) || (S(ut.source) && /^\/(?!\/)/.test(ruleContent))) return Gt;
        let At = compiledPathRulePattern(ruleContent, ut.source, oe);
        if (At === null) return Gt;
        return { ...Gt, root: At.root === null ? null : h(At.root), pattern: At.pattern };
      }),
    R =
      n?.options.toolAliases && m4s()
        ? Object.entries(n.options.toolAliases)
            .filter(([oe, ht]) => ht !== oe)
            .map(([oe]) => oe)
        : [],
    T = (oe, ht) =>
      Object.entries(oe)
        .flatMap(([ut, kt]) =>
          (kt ?? []).map((Gt) => ({
            source: ut,
            ruleBehavior: ht,
            ruleValue: permissionRuleValueFromString(Gt),
            stored: Gt,
          })),
        )
        .filter(
          (ut) =>
            ut.ruleValue.ruleContent !== void 0 ||
            allowsAliasExpansion(ut) ||
            !R.some(
              (kt) =>
                ut.ruleValue.toolName === kt ||
                (hasWildcard(ut.ruleValue.toolName) && matchWildcard(ut.ruleValue.toolName, kt)),
            ),
        ),
    { mcpServerPolicy: mcpServerPolicy, ...P } = e.alwaysAskRules,
    Q = s ? {} : P,
    D = s
      ? SERVER_CLASSIFIER_DECISION_SCHEMA
      : getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVET_MARBLE, SERVER_CLASSIFIER_DECISION_SCHEMA),
    L =
      typeof D === "number" && Number.isInteger(D) && D > SERVER_CLASSIFIER_DECISION_SCHEMA
        ? Math.min(D, _Vs)
        : SERVER_CLASSIFIER_DECISION_SCHEMA,
    z = !s && mBo(e.mode, e),
    G = s ? [] : getAllowRules(e),
    ee = getPluginRegistry(),
    V;
  if (
    n !== void 0 &&
    L > SERVER_CLASSIFIER_DECISION_SCHEMA &&
    !z &&
    ee.hooksRespawns.size === 0 &&
    ee.hookRegistrationInFlight === void 0 &&
    ee.hooksUnknownCause === void 0
  )
    try {
      let oe = getLoadedModulesForSite("tool.check"),
        [ht, ut] = SS(
          G.filter(
            ({ ruleValue: ruleValue }) =>
              ruleValue.ruleContent === void 0 && ruleValue.toolName.startsWith(MCP_TOOL_PREFIX),
          ),
          (it) => isPatternRuleName(it.ruleValue.toolName),
        ),
        groupBy = Map.groupBy(ut, (it) => it.ruleValue.toolName),
        Gt = getAskRules(e),
        Qt = buildDenyRuleIndex(e, [
          ...Gt,
          ...Gt.map((it) => ({ ...it, ruleValue: { toolName: it.ruleValue.toolName } })),
        ]);
      V = new Set(
        n.options.tools
          .filter((tool) => {
            let { name: At, mcpInfo: mcpInfo } = tool,
              we = groupBy.get(At);
            if (
              we === void 0 ||
              mcpInfo === void 0 ||
              At !== getToolNameForPermissionCheck(tool) ||
              wireName(At) !== At
            )
              return !1;
            return (
              mcpInfo.serverType !== void 0 &&
              !isIdeOrSdkType(mcpInfo.serverType) &&
              mcpInfo.serverName !== REMOTE_DEVICES &&
              !isChromeToolName(At) &&
              !Wjr(At) &&
              tool.classifierOnly === void 0 &&
              tool.ignoresWholeToolAllowRule === void 0 &&
              !hadRefusedMcpSkip(At) &&
              !hasModuleHookingSite("tool.check", { ...KW(tool), agentId: n.agentId }, oe) &&
              !isToolDeniedByIndex(e, Qt, tool) &&
              [...we.toReversed(), ...ht.filter((Le) => toolMatchesWholeToolRule(tool, Le))].every(
                (Le) =>
                  getMcpRuleClassifierRoute(Le, tool, {}, isAutoAllowedInMode(tool, e), n, () =>
                    getAutoModeClassifierRole(e.mode),
                  ) === void 0,
              )
            );
          })
          .map((it) => it.name),
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
      ({ ruleValue: ruleValue }) =>
        toInternalToolName(ruleValue.toolName) === ruleValue.toolName &&
        !(z && mcpInfoFromString(ruleValue.toolName) !== null) &&
        !P9n(ruleValue.toolName, e.mode, e) &&
        !a4s(ruleValue.toolName) &&
        !(
          V !== void 0 &&
          ruleValue.ruleContent === void 0 &&
          ruleValue.toolName.startsWith(MCP_TOOL_PREFIX) &&
          !V.has(ruleValue.toolName)
        ) &&
        !(
          ruleValue.ruleContent === void 0 &&
          I9n(ruleValue.toolName) &&
          isWebToolClassifierRouted(ruleValue.toolName, e.mode, e)
        ),
    ),
    ie = Ji(filtered, (oe) => `${oe.source} ${formatPermissionRule(oe.ruleValue)}`),
    Z = L > SERVER_CLASSIFIER_DECISION_SCHEMA ? ie : filtered,
    re = getAutoModeConfig(),
    Re = re?.allow ?? [],
    se = replacesDefaults(Re) ? Vd() : void 0,
    Te = se === void 0 || Re.includes(se) ? Re : [...Re, se],
    U = getSessionId(),
    nt = Yi().lastExecutedTabUrlByScope.get(ycn()),
    bt = nt === void 0 ? [] : [[U, nt]],
    dt = bt,
    rt = bt.length === 0 ? void 0 : await gg(),
    le = rt !== void 0 && rt.length > tu,
    Pe =
      dt.length === 0
        ? void 0
        : {
            enabled: e.chromeNavigationClassifierEnabled === !0,
            baselines: Object.fromEntries(
              dt.map(([oe, ht]) => [oe.slice(0, eu), formatOriginForClassifier(ht)]),
            ),
            ...(rt !== void 0 && {
              tabs: {
                [U.slice(0, eu)]: Object.fromEntries(
                  rt.slice(0, tu).map((oe) => [String(oe.tabId), formatOriginForClassifier(oe.url)]),
                ),
              },
            }),
          },
    Ke = (oe) => ({ path: h(oe), resolved: s ? [] : y ? [h(oe)] : getResolvedWorkingDirPaths(oe).map(h) }),
    J = gl(),
    je = getOriginalCwdOrNull(),
    It = J === null || je === null ? null : { live: J, original: je },
    go = {
      permission_mode: e.mode,
      platform: getPlatform(),
      ...(It !== null && { live_cwd: h(It.live) }),
      ...(!y && { home_dir: h(homedir().normalize("NFC")) }),
      rule_roots:
        It === null || s
          ? {}
          : Object.fromEntries(
              PERMISSION_RULE_SOURCES.filter((oe) => !S(oe)).map((oe) => [oe, h(rootPathForSource(oe))]),
            ),
      trusted_directories: {
        ...(It !== null && { primary: Ke(It.original) }),
        additional: s
          ? []
          : Array.from(e.additionalWorkingDirectories.values(), (oe) => ({
              ...Ke(oe.path),
              source: oe.source,
            })),
        network: s
          ? []
          : uniq(
              Array.from(e.trustedNetworkDirectories?.entries() ?? [], ([oe, ht]) => [oe, ...ht])
                .flat()
                .map(h),
            ),
        block_reads_outside_working_directories: e.blockReadsOutsideWorkingDirectories === !0,
      },
      rules: {
        allow: M("allow", Z),
        deny: M("deny", T(e.alwaysDenyRules, "deny")),
        ask: M("ask", T(Q, "ask")),
      },
      case_insensitive_paths: getPlatform() === "windows",
      auto_mode: {
        allow: Te,
        soft_deny: re?.soft_deny ?? [],
        hard_deny: re?.hard_deny ?? [],
        environment: re?.environment ?? [],
      },
      artifact_consent_holdback: !Ejr(),
      ...(Pe !== void 0 && { chrome_navigation: Pe }),
      ...(le && { truncated: !0 }),
      restricted: e.restricted === !0,
      is_remote_mode: e.isRemoteMode === !0,
      ...(V !== void 0 && { mcp_allow_rules_exact: !0 }),
      classify_all_shell: PPe(),
      user_identity: await withTimeoutDefault(getClassifierUserTag(), mg, null),
    };
  return clampClassifierVerdict(go, L, (oe) => {
    let ht = getSessionId(),
      ut = s ? "rulesUnread" : "whole";
    if (ou[ut] === ht) return;
    ((ou[ut] = ht),
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
        auto_mode_allow: Re.length,
        auto_mode_soft_deny: oe.autoMode.softDeny,
        auto_mode_hard_deny: oe.autoMode.hardDeny,
        auto_mode_environment: oe.autoMode.environment,
      }));
  });
}
/**
 * 判断本回合是否请求 auto mode（beta 被拒、未开启等原因上报）。
 */
//@ chunk-ha3km179.js:125379-126239 placement
function checkAutoModeRequested(e, n) {
  try {
    let r = getToolPermissionContext(e),
      { role: role, offReason: offReason } = checkServerClassifierEligibility(r.mode),
      y = role !== "off",
      S = Lp(n, qT);
    if ((S || !y) && offReason !== "not_auto_mode") {
      let w = S ? "beta_rejected" : offReason;
      if (w !== void 0 && w !== "refused_latch")
        logServerCheckDiagnostic({ state: "not_requested", reason: w });
    }
    if (S) return;
    let M = y
      ? void 0
      : new Set(e.options.tools.filter((tool) => isMcpReviewedOutsideAuto(tool, r)).map((w) => w.name));
    if (M !== void 0 && (M.size === 0 || M.size > fg)) return;
    let R = gl(),
      T = {};
    return {
      probeTrace: T,
      ...(M !== void 0 && { judgeOnlyTools: M, logged: !0 }),
      tools: e.options.tools,
      computerAttached: () => checkComputerAttached(e.toolState),
      ...(e.options.structuredOutputIsHandback === !0 && { structuredOutputIsHandback: !0 }),
      context: buildAutoModeContext(r, e, M !== void 0 && !env.CLAUDE_CODE_AUTO_MODE_FULL_CONTEXT).catch(
        (w) => {
          logError(w);
          return;
        },
      ),
      git:
        M === void 0
          ? collectGitState(R, e.abortController.signal, T)
          : Promise.resolve({
              cwd: R,
              root: null,
              branch: null,
              default_branch: null,
              status: null,
              visibility: null,
            }),
      cwd: R,
      startedAt: Date.now(),
    };
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:126239-126303 placement
function au(e) {
  try {
    return Nmi(getToolPermissionContext(e).mode);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:126303-126377 placement
function lu(e) {
  try {
    return getAutoModeClassifierRole(getToolPermissionContext(e).mode) !== "off";
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-ha3km179.js:126377-126471 placement
async function du(e, n = kg) {
  if (e === void 0) return;
  try {
    return await refreshAutoModeGitState(e, n);
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 刷新 auto mode 上下文的 git 状态（超出上限时上报 tengu_auto_mode_context_over_ceiling）。
 */
//@ chunk-ha3km179.js:126471-127611 placement
async function refreshAutoModeGitState(e, n) {
  let context = await e.context;
  if (context === void 0) return;
  let s = W_e(context);
  if (s > bVs && e.overCeilingLogged === void 0)
    ((e.overCeilingLogged = !0), logEvent("tengu_auto_mode_context_over_ceiling", { bytes: s }));
  let now = Date.now(),
    y = await withTimeoutDefault_2(e.git, n, ug, {
      cwd: e.cwd,
      root: null,
      branch: null,
      default_branch: null,
      status: null,
      visibility: null,
      error: "pending",
    }),
    S = clampGitStateForClassifier({
      ...y,
      cwd: y.cwd === null ? null : toPosixPath(y.cwd),
      root: y.root === null ? null : toPosixPath(y.root),
    });
  if (e.logged === void 0) {
    e.logged = !0;
    let R = !nu.logged;
    ((nu.logged = !0),
      logEvent("tengu_auto_mode_git_state_probe", {
        duration_ms: now - e.startedAt,
        wait_ms: Date.now() - now,
        outcome: fromEnum(S.error ?? (S.status === null ? "no_status" : S.status.clean ? "clean" : "dirty")),
        truncated: S.truncated === !0 || S.status?.truncated === !0,
        first_in_process: R,
        repo_visibility_lookup: fromEnum(visibilityLookupKind(e, S)),
        ...(e.cwd === null && { no_directory: !0 }),
      }));
  }
  let M;
  try {
    let { artifactsClassifierContext: artifactsClassifierContext } = await import("./chunk-3jhw7vrg.js");
    M = artifactsClassifierContext({ tools: e.tools });
  } catch (error) {
    (logError(error), (M = void 0));
  }
  return {
    context: context,
    git: S,
    ...(M !== void 0 && { artifacts: M }),
    ...(e.judgeOnlyTools !== void 0 && { judgeOnlyTools: e.judgeOnlyTools }),
    ...((await isComputerAttachedSafe(e)) && g4s() && { computerAttached: !0 }),
    ...(e.structuredOutputIsHandback === !0 && { structuredOutputIsHandback: !0 }),
  };
}
/**
 * 调用 computerAttached（失败时视为已连接）。
 */
//@ chunk-ha3km179.js:127611-127743 placement
async function isComputerAttachedSafe(e) {
  if (e.computerAttached === void 0) return !0;
  try {
    return (await e.computerAttached()) !== !1;
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
/**
 * 动态加载并检查是否连接了 computer use，失败视为已连接。
 */
//@ chunk-ha3km179.js:127743-127893 placement
async function checkComputerAttached(e) {
  if (e === void 0) return !0;
  try {
    let { isComputerAttached: isComputerAttached } = await import("./chunk-xssqvf8d.js");
    return isComputerAttached(e);
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
//@ chunk-ha3km179.js:127893-127935 placement
var nu = ge({ logged: !1 }, (e) => {
  e.logged = !1;
});
/**
 * 仓库可见性查询的来源（缓存命中、加入进行中、自行查询、未到达）。
 */
//@ chunk-ha3km179.js:127935-128166 placement
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
      return visibility !== void 0 && n.error === "pending" ? "not_reached" : "none";
  }
}
//@ chunk-ha3km179.js:128166-128243 placement
var kg = {
  setTimeout: (e, n) => {
    let r = setTimeout(e, n);
    return () => clearTimeout(r);
  },
};
/**
 * 等待 Promise，超时或失败时返回默认值。
 */
//@ chunk-ha3km179.js:128243-128401 placement
function withTimeoutDefault_2(e, n, r, s) {
  return new Promise((h) => {
    let y = !1,
      S = n.setTimeout(() => {
        if (!y) ((y = !0), h(s));
      }, r);
    e.then(
      (M) => {
        if (!y) ((y = !0), S(), h(M));
      },
      () => {
        if (!y) ((y = !0), S(), h(s));
      },
    );
  });
}
/**
 * 生成 auto mode 回合附件（辅助查询与恢复中不生成）。
 */
//@ chunk-ha3km179.js:128401-128761 placement
async function autoModeTurnAttachments(
  e,
  n,
  { querySource: querySource, resumeActive: resumeActive, model: model, stamp: stamp },
) {
  if (resumeActive || classifyQuerySource(querySource) === "auxiliary") return [];
  try {
    let last = e.findLast(
      (R) => R.type === "user" && !R.isCompactSummary && R.taskDelivery === void 0 && !isToolResultMessage(R),
    );
    if (last?.type === "user" && last.handedOff) {
      let R = getPolicyAttributionOverrides();
      if (!R.commit && !R.pr) return [];
    }
    let M = await remoteSessionChangeAttachments(e, n.options.tools, model);
    return M ? [createAttachmentMessage_2(M, stamp)] : [];
  } catch (error) {
    return (logError(error), []);
  }
}
/**
 * 远程会话/桥接变更时生成提示附件。
 */
//@ chunk-ha3km179.js:128761-129466 placement
async function remoteSessionChangeAttachments(e, n, r) {
  let s = lastRemoteSessionAttachment(e),
    h = getSessionAttribution()?.url ?? null,
    y = getSdkHostedBridgeHandle(),
    S =
      (getRemoteControlSessionCompatId() !== void 0 || (y !== null && !y.outboundOnly)) &&
      n.some((Q) => toolMatchesName(Q, SEND_USER_FILE_TOOL_NAME)),
    M = isAttributionAnnouncementEnabled(),
    R = M ? r : void 0;
  if (s === void 0) {
    let Q = h !== null || S;
    if (
      !Q &&
      !(M && shouldIncludeGitInstructions() && (n.some((G) => toolMatchesName(G, BASH_TOOL_NAME)) || Zar(n)))
    )
      return;
    let { commit: commit, pr: pr } = await uu(R);
    if (!Q && !commit && !pr) return;
    let z = getPolicyAttributionOverrides();
    return {
      type: "remote_session_change",
      url: h,
      commit: commit,
      pr: pr,
      sendUserFileHint: S,
      managedCommit: z.commit,
      managedPr: z.pr,
    };
  }
  let { commit: commit, pr: pr } = await uu(R),
    P = getPolicyAttributionOverrides();
  if (
    h === s.url &&
    S === s.sendUserFileHint &&
    commit === s.commit &&
    pr === s.pr &&
    P.commit === (s.managedCommit ?? !1) &&
    P.pr === (s.managedPr ?? !1)
  )
    return;
  return {
    type: "remote_session_change",
    url: h,
    commit: commit,
    pr: pr,
    sendUserFileHint: S,
    managedCommit: P.commit,
    managedPr: P.pr,
  };
}
//@ chunk-ha3km179.js:129466-129548 placement
function uu(e) {
  let n = getOriginalCwdOrNull();
  return n === null ? CSt({ model: e }) : Yg(n, () => CSt({ model: e }));
}
//@ chunk-ha3km179.js:129548-129637 placement
function mu(e) {
  try {
    return { recorded: latestPromptSnapshot(e), uuids: e.map((n) => n.uuid) };
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 更新查询状态的消息与回合起点（失败时保持原状态）。
 */
//@ chunk-ha3km179.js:129637-129747 placement
function withTurnMessages(e, n, r) {
  try {
    return { ...e, messages: n, turnStartIndex: r(n), contextRoom: void 0 };
  } catch (error) {
    return (logError(error), e);
  }
}
/**
 * 去掉被放回队列的消息（必要时先结算已取出的）。
 */
//@ chunk-ha3km179.js:129747-129854 placement
function dropPutBackMessages(e, n, r) {
  try {
    if (r) e.settleTaken();
    return n.filter((s) => !e.wasPutBack(s));
  } catch (error) {
    return (logError(error), n);
  }
}

export {
  dropPutBackMessages,
  mu,
  withTurnMessages,
  autoModeTurnAttachments,
  checkAutoModeRequested,
  au,
  du,
  lu,
};
