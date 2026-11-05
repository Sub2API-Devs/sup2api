/**
 * components/FeedbackSurvey/useOrgSurvey.tsx
 *
 * 2.1.316 新增：组织调查与插件反馈调查的触发 Hook：按策略、遥测与插件来源决定是否弹出调查对话框并记录事件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "../../../vendor/react/cjs/react.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import {
  checkPendingOrgSurvey,
  isSurveyEligible,
  orgSurveyCredentialSource,
} from "../../services/orgSurvey/orgSurvey.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useDelayedFlag, endsWithNumberedList, useDynamicConfigValue } from "./SurveyHost.js";
import { useActive, useShortDraftValue } from "../../screens/repl/storeHooks.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrgSurveyDialog } from "./OrgSurveyDialog.js";
import { env } from "../../utils/env.js";
import { shouldSkipFeedbackSurvey, isFirstPartyTelemetryBlocked } from "../../utils/hostEnvironment.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import {
  isOfficialMarketplace,
  isOfficialOrBuiltinMarketplace,
  parsePluginIdentifier,
} from "../../utils/plugins/pluginIdentifier.js";
import { hasStoredOAuthToken } from "../../utils/auth.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getDynamicConfig_BLOCKS_ON_INIT } from "../../services/analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import {
  classifyAxiosError,
  sanitizedConnectionCodeLowerForTelemetry,
  getErrnoCode,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  pluginIdHash,
  buildPluginEventFields,
  isAnthropicPluginSource,
  getTelemetryPluginScope,
} from "../../utils/telemetry/pluginTelemetry.js";
import {
  isPluginActivityKind,
  activityFeaturesFor,
  drainRecentActivity,
} from "../../utils/pluginActivity.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { isToolDetailsLoggingEnabled, THIRD_PARTY } from "../../services/analytics/metadata.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { saveGlobalConfig, getGlobalConfig } from "../../utils/config.js";
import { useSurveyState } from "./useSurveyState.js";
import { getInstalledPlugins } from "../../utils/plugins/installedPluginsManager.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1055668-1055672 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1055668", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1068743-1068747 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1068743", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1104049-1104086 placement
function selectTurnLoadingSurvey(appState) {
  return appState.isLoading;
}
//@ chunk-czq1j3j2.js:1104086-1104137 placement
function openIfAnswering(status) {
  return status === "answering" ? "open" : status;
}
//@ chunk-czq1j3j2.js:1104137-1104150 placement
var SURVEY_CLOSE_DELAY_MS = 4000;
//@ chunk-czq1j3j2.js:1104150-1104211 placement
function logOrgSurveyEvent(eventType) {
  logEvent("tengu_org_survey_event", {
    event_type: fromEnum(eventType),
  });
}
//@ chunk-czq1j3j2.js:1104211-1108173 placement
/**
 * 组织调查问卷的显示状态：回合结束后拉取待答问卷，满足空闲、无其他提示与问卷、非无人值守等条件时打开；忽略/提交时上报并关闭。
 */
function useOrgSurvey(props) {
  let $ = useMemoCache(61);
  let { turn, messages, localJsx, hasActivePrompt, enabled, otherSurveyActive, client } = props;
  let { credentials, storageV5 } = useTheme_2();
  let checkPendingCached;
  if ($[0] !== credentials || $[1] !== storageV5) {
    checkPendingCached = () =>
      checkPendingOrgSurvey({
        credentials,
        storageV5,
      });
    $[0] = credentials;
    $[1] = storageV5;
    $[2] = checkPendingCached;
  } else checkPendingCached = $[2];
  let [defaultClient] = useState(checkPendingCached);
  let surveyClient = client ?? defaultClient;
  let clock = useClock();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let isEnabled = enabled && !isScreenReaderEnabled;
  let busy = useStoreSelector(turn, selectTurnLoadingSurvey);
  let delayedFlag = useDelayedFlag(busy);
  let active = useActive();
  let isDraftEmpty = useShortDraftValue() === "";
  let endsWithListCached;
  if ($[3] !== busy || $[4] !== messages) {
    endsWithListCached = !busy && endsWithNumberedList(messages);
    $[3] = busy;
    $[4] = messages;
    $[5] = endsWithListCached;
  } else endsWithListCached = $[5];
  let endsWithList = endsWithListCached;
  let [state, setState] = useState("closed");
  let [survey, setSurvey] = useState(null);
  let [starting, setStarting] = useState(false);
  let fetchedRef = useRef(false);
  let isDoneRef = useRef(false);
  let shownRef = useRef(false);
  let startedRef = useRef(false);
  let startRequestedRef = useRef(false);
  let initialDraft;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    initialDraft = {};
    $[6] = initialDraft;
  } else initialDraft = $[6];
  let draftRef = useRef(initialDraft);
  let dialogHandleRef = useRef(null);
  let previousBusyRef = useRef(busy);
  let isMountedRef = useRef(true);
  let closeTimerRef = useRef(null);
  let unmountEffect;
  let unmountEffectDeps;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    unmountEffect = () => {
      isMountedRef.current = true;
      return () => {
        isMountedRef.current = false;
        closeTimerRef.current?.();
        dialogHandleRef.current?.close();
      };
    };
    unmountEffectDeps = [];
    $[7] = unmountEffect;
    $[8] = unmountEffectDeps;
  } else {
    unmountEffect = $[7];
    unmountEffectDeps = $[8];
  }
  useEffect(unmountEffect, unmountEffectDeps);
  let ignore;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    ignore = () => {
      isDoneRef.current = true;
      setState("closed");
    };
    $[9] = ignore;
  } else ignore = $[9];
  let ignoreSurvey = ignore;
  let fetchEffect;
  let fetchEffectDeps;
  if ($[10] !== isEnabled || $[11] !== surveyClient || $[12] !== busy) {
    fetchEffect = () => {
      let previousLoading = previousBusyRef.current;
      previousBusyRef.current = busy;
      if (!previousLoading || busy || !isEnabled || fetchedRef.current || isUnattendedInteractiveSession()) {
        return;
      }
      fetchedRef.current = true;
      surveyClient.getPendingSurvey().then((pendingSurvey) => {
        if (pendingSurvey !== null) setSurvey(pendingSurvey);
      });
    };
    fetchEffectDeps = [busy, isEnabled, surveyClient];
    $[10] = isEnabled;
    $[11] = surveyClient;
    $[12] = busy;
    $[13] = fetchEffect;
    $[14] = fetchEffectDeps;
  } else {
    fetchEffect = $[13];
    fetchEffectDeps = $[14];
  }
  useEffect(fetchEffect, fetchEffectDeps);
  let openEffectDeps;
  let openEffect;
  if (
    $[15] !== isEnabled ||
    $[16] !== hasActivePrompt ||
    $[17] !== busy ||
    $[18] !== active ||
    $[19] !== endsWithList ||
    $[20] !== otherSurveyActive ||
    $[21] !== isDraftEmpty ||
    $[22] !== state ||
    $[23] !== survey ||
    $[24] !== delayedFlag
  ) {
    openEffect = () => {
      if (
        survey === null ||
        state !== "closed" ||
        isDoneRef.current ||
        !isEnabled ||
        busy ||
        !delayedFlag ||
        active ||
        !isDraftEmpty ||
        hasActivePrompt ||
        otherSurveyActive ||
        endsWithList ||
        isUnattendedInteractiveSession()
      ) {
        return;
      }
      setState("open");
    };
    openEffectDeps = [
      survey,
      state,
      isEnabled,
      busy,
      delayedFlag,
      active,
      isDraftEmpty,
      hasActivePrompt,
      otherSurveyActive,
      endsWithList,
    ];
    $[15] = isEnabled;
    $[16] = hasActivePrompt;
    $[17] = busy;
    $[18] = active;
    $[19] = endsWithList;
    $[20] = otherSurveyActive;
    $[21] = isDraftEmpty;
    $[22] = state;
    $[23] = survey;
    $[24] = delayedFlag;
    $[25] = openEffectDeps;
    $[26] = openEffect;
  } else {
    openEffectDeps = $[25];
    openEffect = $[26];
  }
  useEffect(openEffect, openEffectDeps);
  let ignoreEffectCached;
  if ($[27] !== state) {
    ignoreEffectCached = () => {
      if (state !== "open") {
        return;
      }
      logOrgSurveyEvent("ignored");
      ignoreSurvey();
    };
    $[27] = state;
    $[28] = ignoreEffectCached;
  } else ignoreEffectCached = $[28];
  let ignoreWhileLoading = ignoreEffectCached;
  let ignoreLoadingEffect;
  let ignoreLoadingDeps;
  if ($[29] !== ignoreWhileLoading || $[30] !== busy) {
    ignoreLoadingEffect = () => {
      if (busy) ignoreWhileLoading();
    };
    ignoreLoadingDeps = [busy, ignoreWhileLoading];
    $[29] = ignoreWhileLoading;
    $[30] = busy;
    $[31] = ignoreLoadingEffect;
    $[32] = ignoreLoadingDeps;
  } else {
    ignoreLoadingEffect = $[31];
    ignoreLoadingDeps = $[32];
  }
  useEffect(ignoreLoadingEffect, ignoreLoadingDeps);
  let onShownCached;
  if ($[33] !== surveyClient || $[34] !== survey) {
    onShownCached = () => {
      if (shownRef.current || survey === null) {
        return;
      }
      shownRef.current = true;
      logOrgSurveyEvent("shown");
      surveyClient.recordMilestone(survey, "shown");
    };
    $[33] = surveyClient;
    $[34] = survey;
    $[35] = onShownCached;
  } else onShownCached = $[35];
  let onShown = onShownCached;
  let dismiss;
  if ($[36] !== surveyClient || $[37] !== state || $[38] !== survey) {
    dismiss = () => {
      if (state !== "open" || survey === null || startRequestedRef.current) {
        return;
      }
      logOrgSurveyEvent("dismissed");
      ignoreSurvey();
      surveyClient.dismissSurvey(survey);
    };
    $[36] = surveyClient;
    $[37] = state;
    $[38] = survey;
    $[39] = dismiss;
  } else dismiss = $[39];
  let dismiss_2 = dismiss;
  let submitSurvey;
  if ($[40] !== surveyClient || $[41] !== clock || $[42] !== survey) {
    submitSurvey = async (answers) => {
      if (survey === null) {
        return "failed";
      }
      if (isUnattendedInteractiveSession()) {
        logOrgSurveyEvent("ignored");
        ignoreSurvey();
        dialogHandleRef.current?.close();
        dialogHandleRef.current = null;
        return "closed";
      }
      let outcome = await surveyClient.submitSurvey(survey, answers);
      if (outcome === "failed") {
        return outcome;
      }
      logOrgSurveyEvent(outcome === "submitted" ? "submitted" : "unavailable");
      isDoneRef.current = true;
      dialogHandleRef.current?.close();
      dialogHandleRef.current = null;
      setState(outcome === "submitted" ? "thanks" : "gone");
      closeTimerRef.current = clock.setTimeout(() => setState("closed"), SURVEY_CLOSE_DELAY_MS);
      return outcome;
    };
    $[40] = surveyClient;
    $[41] = clock;
    $[42] = survey;
    $[43] = submitSurvey;
  } else submitSurvey = $[43];
  let onSubmit = submitSurvey;
  let startCached;
  if ($[44] !== surveyClient || $[45] !== localJsx || $[46] !== onSubmit) {
    startCached = (surveyToStart) => {
      if (!startedRef.current) {
        startedRef.current = true;
        logOrgSurveyEvent("started");
        surveyClient.recordMilestone(surveyToStart, "started");
      }
      setState("answering");
      let dialogHandle = localJsx.show(
        jsxProd_default(OrgSurveyDialog, {
          survey: surveyToStart,
          initialDraft: draftRef.current,
          onDraftChange: (nextDraft) => {
            draftRef.current = nextDraft;
          },
          onSubmit,
          onClose: () => dialogHandle.close(),
        }),
        {
          commandName: "org-survey",
          immediate: false,
          hidesPrompt: true,
          retireAtTurnBoundary: false,
        },
      );
      dialogHandleRef.current = dialogHandle;
      dialogHandle.closed.then(() => {
        if (dialogHandleRef.current === dialogHandle) dialogHandleRef.current = null;
        if (!isDoneRef.current) setState(openIfAnswering);
      });
    };
    $[44] = surveyClient;
    $[45] = localJsx;
    $[46] = onSubmit;
    $[47] = startCached;
  } else startCached = $[47];
  let start = startCached;
  let startSurveyCached;
  if ($[48] !== surveyClient || $[49] !== start || $[50] !== state || $[51] !== survey) {
    startSurveyCached = () => {
      if (state !== "open" || survey === null || startRequestedRef.current) {
        return;
      }
      startRequestedRef.current = true;
      setStarting(true);
      let resetStartRequested = () => {
        startRequestedRef.current = false;
        setStarting(false);
      };
      surveyClient.isStillPending(survey).then((isPending) => {
        resetStartRequested();
        if (isDoneRef.current || !isMountedRef.current) {
          return;
        }
        if (isUnattendedInteractiveSession()) {
          logOrgSurveyEvent("ignored");
          ignoreSurvey();
          return;
        }
        if (!isPending) {
          logOrgSurveyEvent("unavailable");
          ignoreSurvey();
          return;
        }
        start(survey);
      }, resetStartRequested);
    };
    $[48] = surveyClient;
    $[49] = start;
    $[50] = state;
    $[51] = survey;
    $[52] = startSurveyCached;
  } else startSurveyCached = $[52];
  let start_2 = startSurveyCached;
  let cardProps;
  if (
    $[53] !== dismiss_2 ||
    $[54] !== ignoreWhileLoading ||
    $[55] !== onShown ||
    $[56] !== start_2 ||
    $[57] !== starting ||
    $[58] !== state ||
    $[59] !== survey
  ) {
    cardProps = {
      state,
      survey,
      starting,
      onShown,
      start: start_2,
      dismiss: dismiss_2,
      ignore: ignoreWhileLoading,
    };
    $[53] = dismiss_2;
    $[54] = ignoreWhileLoading;
    $[55] = onShown;
    $[56] = start_2;
    $[57] = starting;
    $[58] = state;
    $[59] = survey;
    $[60] = cardProps;
  } else cardProps = $[60];
  return cardProps;
}
//@ chunk-czq1j3j2.js:1108177-1108312 placement
/**
 * 插件评分商店的默认配置、请求选项（teleport-org 认证、后台、5xx 才算错误）与每插件串行链的缓存上限。
 */
var PLUGIN_RATINGS_STORE_DEFAULT = {
  enabled: false,
};
var TENGU_PLUGIN_RATINGS_STORE_CONFIG = "tengu_plugin_ratings_store_config";
var PLUGIN_RATINGS_REQUEST_OPTIONS = {
  auth: "teleport-org",
  isBackground: true,
  validateStatus: (status) => status < 500,
};
var MAX_RATING_CHAINS = 8;
//@ chunk-czq1j3j2.js:1108312-1108593 placement
function recordPluginRatingAppearance(chains, appearanceId, plugin, credentials) {
  return chainRatingRequest(chains, appearanceId, async () => {
    let pluginRatingTarget = await getPluginRatingTarget(plugin, credentials);
    if (!pluginRatingTarget) return;
    await callPluginRatingsApi(
      "appearance",
      "post",
      "/api/oauth/organizations/:orgUUID/plugin_ratings/appearances",
      {
        marketplace_name: pluginRatingTarget.marketplaceName,
        plugin_name: pluginRatingTarget.pluginName,
        client_surface: "cli",
        appearance_id: appearanceId,
      },
      credentials,
    );
  });
}
//@ chunk-czq1j3j2.js:1108593-1109940 placement
/**
 * 把插件评分提交到商店：bad/fine/good 提交评分，dismissed/not_sure 上报结果并在之前已评分时撤回；同一出现 id 的请求串行执行。
 */
function submitPluginRating(chains, appearanceId, plugin, response, credentials) {
  return chainRatingRequest(chains, appearanceId, async (entry) => {
    let pluginRatingTarget = await getPluginRatingTarget(plugin, credentials);
    if (!pluginRatingTarget) return;
    switch (response) {
      case "bad":
      case "fine":
      case "good": {
        if (
          await callPluginRatingsApi(
            "submit",
            "post",
            "/api/oauth/organizations/:orgUUID/plugin_ratings",
            {
              marketplace_name: pluginRatingTarget.marketplaceName,
              plugin_name: pluginRatingTarget.pluginName,
              rating: response,
              client_surface: "cli",
              client_version: {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.318",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-11-03T18:52:53Z",
                GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION,
              appearance_id: appearanceId,
            },
            credentials,
          )
        )
          entry.ratedInStore = true;
        return;
      }
      case "dismissed":
      case "not_sure": {
        await callPluginRatingsApi(
          "outcome",
          "post",
          "/api/oauth/organizations/:orgUUID/plugin_ratings/appearances/outcome",
          {
            marketplace_name: pluginRatingTarget.marketplaceName,
            plugin_name: pluginRatingTarget.pluginName,
            outcome: response === "dismissed" ? "dismissed" : "unsure",
          },
          credentials,
        );
        if (entry.ratedInStore) {
          if (
            await callPluginRatingsApi(
              "withdraw",
              "delete",
              `/api/oauth/organizations/:orgUUID/plugin_ratings?marketplace_name=${encodeURIComponent(pluginRatingTarget.marketplaceName)}&plugin_name=${encodeURIComponent(pluginRatingTarget.pluginName)}`,
              undefined,
              credentials,
            )
          )
            entry.ratedInStore = false;
        }
        return;
      }
    }
  });
}
//@ chunk-czq1j3j2.js:1109940-1110505 placement
/**
 * 判断是否可以向商店上报插件评分（未禁用反馈、第一方、非官方市场、组织匹配、动态配置开启），返回 {marketplaceName, pluginName} 或 null。
 */
async function getPluginRatingTarget(plugin, credentials) {
  if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return null;
  if (shouldSkipFeedbackSurvey()) return null;
  if (isFirstPartyTelemetryBlocked()) return null;
  if (!isPolicyAllowed_2("allow_product_feedback")) return null;
  if (isEssentialTrafficOnly()) return null;
  if (getAPIProvider() !== "firstParty") return null;
  if (plugin.marketplace === undefined || isOfficialMarketplace(plugin.marketplace)) return null;
  if (!isSurveyEligible()) {
    if (hasStoredOAuthToken()) logFeatureSad("cli_plugin_rating_store", "skip_auth_org_mismatch");
    return null;
  }
  if (
    !(await orgSurveyCredentialSource(credentials, {
      acceptInjectedTokens: true,
    }))
  ) {
    logFeatureSad("cli_plugin_rating_store", "skip_org_unpinned");
    return null;
  }
  if (
    (await getDynamicConfig_BLOCKS_ON_INIT(TENGU_PLUGIN_RATINGS_STORE_CONFIG, PLUGIN_RATINGS_STORE_DEFAULT))
      .enabled !== true
  )
    return null;
  return {
    marketplaceName: plugin.marketplace,
    pluginName: plugin.name,
  };
}
//@ chunk-czq1j3j2.js:1110505-1110796 placement
function chainRatingRequest(chains, appearanceId, task) {
  let entry = chains.get(appearanceId);
  if (!entry) {
    entry = {
      chain: Promise.resolve(),
      ratedInStore: false,
    };
    chains.set(appearanceId, entry);
    if (chains.size > MAX_RATING_CHAINS) {
      for (let key of chains.keys())
        if (key !== appearanceId) {
          chains.delete(key);
          break;
        }
    }
  }
  let chainState = entry;
  entry.chain = entry.chain.then(() =>
    task(chainState).catch((error) => {
      logError(error);
      logFeatureBad("cli_plugin_rating_store", "chain_exception");
    }),
  );
  return entry.chain;
}
//@ chunk-czq1j3j2.js:1110796-1111679 placement
/**
 * 调用插件评分商店 API（post/delete），按网络错误、认证、HTTP 状态分类记录 cli_plugin_rating_store 结果，成功返回 true。
 */
async function callPluginRatingsApi(step, method, path, body, credentials) {
  let options = {
    ...PLUGIN_RATINGS_REQUEST_OPTIONS,
    credentials,
  };
  let response;
  try {
    response =
      method === "post"
        ? await apiClient.post(path, body, options)
        : await apiClient.delete(path, body, options);
  } catch (error) {
    let { kind, status } = classifyAxiosError(error);
    let failureCode =
      status !== undefined
        ? `http_${status}`
        : kind === "other"
          ? "exception"
          : kind === "http"
            ? (sanitizedConnectionCodeLowerForTelemetry(getErrnoCode(error)) ?? "no_response")
            : kind;
    logFeatureBad("cli_plugin_rating_store", `${step}_${failureCode}`);
    logForDebugging(`plugin rating store ${step} failed: ${failureCode}`, {
      level: "warn",
    });
    return false;
  }
  if (!response.ok) {
    let reasonCode =
      response.reason === "no-auth" ? "auth_unavailable" : response.reason.replaceAll("-", "_");
    logFeatureSad("cli_plugin_rating_store", `${step}_${reasonCode}`);
    return false;
  }
  if (response.status >= 200 && response.status < 300) {
    logFeatureOk("cli_plugin_rating_store");
    return true;
  }
  if ([401, 403, 404, 409].includes(response.status)) {
    logFeatureSad("cli_plugin_rating_store", `${step}_http_${response.status}`);
    logForDebugging(`plugin rating store ${step} skipped: http_${response.status}`);
    return false;
  }
  logFeatureBad("cli_plugin_rating_store", `${step}_http_${response.status}`);
  logForDebugging(`plugin rating store ${step} failed: http_${response.status}`, {
    level: "warn",
  });
  return false;
}
//@ chunk-czq1j3j2.js:1111679-1111899 placement
/**
 * 插件反馈调查的常量：感谢提示时长、默认配置（概率、全局/单插件间隔、最小活动时长、触发类型）、待调查记录上限、同插件活动去重窗口。
 */
var SURVEY_THANKS_MS = 3000;
var PLUGIN_SURVEY_DEFAULT_CONFIG = {
  probability: 0,
  minTimeBetweenGlobalMs: 86400000,
  minTimeBetweenPerPluginMs: 604800000,
  minActivityAgeMs: 21600000,
  enabledTriggers: ["skill", "subagent", "command", "mcp"],
  enabledScopes: undefined,
};
var MAX_PENDING_SURVEYS = 32;
var ACTIVITY_DEDUPE_MS = 3600000;
//@ chunk-czq1j3j2.js:1111899-1112520 placement
/**
 * 把新的插件使用活动合并进待调查记录：同插件一小时内只保留更合适的触发类型，超过上限保留最新的。
 */
function mergePendingSurveyActivity(
  pending,
  activities,
  enabledTriggers = PLUGIN_SURVEY_DEFAULT_CONFIG.enabledTriggers,
) {
  let isEnabled = (trigger) => enabledTriggers.includes(trigger);
  let next = null;
  for (let activity of activities) {
    if (isOfficialOrBuiltinMarketplace(activity.marketplace)) continue;
    let pluginKey = pluginIdHash(activity.name, activity.marketplace);
    let existing = (next ?? pending)[pluginKey];
    let hasExisting =
      existing != null && typeof existing.ts === "number" && typeof existing.trigger === "string";
    if (hasExisting && activity.ts - existing.ts < ACTIVITY_DEDUPE_MS) {
      if (isEnabled(activity.trigger) && !isEnabled(existing.trigger)) {
        next = next ?? {
          ...pending,
        };
        next[pluginKey] = {
          ts: existing.ts,
          trigger: activity.trigger,
        };
      }
      continue;
    }
    let keepOldTrigger = hasExisting && isEnabled(existing.trigger) && !isEnabled(activity.trigger);
    next = next ?? {
      ...pending,
    };
    next[pluginKey] = {
      ts: activity.ts,
      trigger: keepOldTrigger ? existing.trigger : activity.trigger,
    };
  }
  if (next && Object.keys(next).length > MAX_PENDING_SURVEYS) {
    let sliced = Object.entries(next)
      .sort((left, right) => (right[1]?.ts ?? 0) - (left[1]?.ts ?? 0))
      .slice(0, MAX_PENDING_SURVEYS);
    next = Object.fromEntries(sliced);
  }
  return next ?? pending;
}
//@ chunk-czq1j3j2.js:1112520-1112994 placement
/**
 * 从插件反馈问卷记录中筛出已到期（距触发超过最小间隔）且仍已安装、触发类型有效的插件，按触发时间倒序返回。
 */
function listEligibleSurveySubjects(activity, minActivityAgeMs, listPluginNames, now) {
  let filtered = Object.entries(activity).filter(
    ([, value]) =>
      value !== null &&
      typeof value === "object" &&
      typeof value.ts === "number" &&
      typeof value.trigger === "string" &&
      now - value.ts >= minActivityAgeMs,
  );
  if (filtered.length === 0) return [];
  let pluginsByHash = new Map();
  for (let ref of listPluginNames()) {
    let pluginIdentifier = parsePluginIdentifier(ref);
    pluginsByHash.set(pluginIdHash(pluginIdentifier.name, pluginIdentifier.marketplace), pluginIdentifier);
  }
  let subjects = [];
  for (let [pluginHash, entry] of filtered) {
    let plugin = pluginsByHash.get(pluginHash);
    if (!plugin || !isPluginActivityKind(entry.trigger)) continue;
    subjects.push({
      name: plugin.name,
      marketplace: plugin.marketplace,
      trigger: entry.trigger,
      ts: entry.ts,
    });
  }
  return subjects.sort((a, b) => b.ts - a.ts);
}
//@ chunk-czq1j3j2.js:1112994-1113401 placement
/**
 * 上报插件反馈问卷事件：tengu_plugin_feedback_survey_event 与 OTel feedback_survey（第三方插件名在未开启工具详情日志时隐去）。
 */
function logPluginSurveyEvent(eventType, appearanceId, subject, response) {
  logEvent("tengu_plugin_feedback_survey_event", {
    event_type: fromEnum(eventType),
    appearance_id: sanitizeMarkName(appearanceId),
    trigger_type: fromEnum(subject.trigger),
    ...(response && {
      response: fromEnum(response),
    }),
    ...buildPluginEventFields(subject.name, subject.marketplace),
  });
  let isFirstPartyPlugin =
    isAnthropicPluginSource(getTelemetryPluginScope(subject.name, subject.marketplace, null)) ||
    isToolDetailsLoggingEnabled();
  logOTelEvent("feedback_survey", {
    event_type: eventType,
    appearance_id: appearanceId,
    survey_type: "plugin",
    trigger_type: subject.trigger,
    ...(response && {
      response,
    }),
    plugin_id_hash: pluginIdHash(subject.name, subject.marketplace),
    "plugin.name": isFirstPartyPlugin ? subject.name : THIRD_PARTY,
  });
}
//@ chunk-czq1j3j2.js:1113401-1113996 placement
/**
 * 从候选中选出要显示问卷的插件：触发类型与作用域须启用、每个插件只看一次、距上次展示超过最小间隔，取最久未展示者。
 */
function pickPluginSurveySubject(subjects, config, lastShownByPlugin, capabilities, now) {
  let enabledTriggers = new Set(config.enabledTriggers);
  let enabledScopes =
    config.enabledScopes && config.enabledScopes.length > 0 ? new Set(config.enabledScopes) : null;
  let best = null;
  let seenHashes = new Set();
  for (let idx = subjects.length - 1; idx >= 0; idx--) {
    let subject = subjects[idx];
    if (!enabledTriggers.has(subject.trigger)) continue;
    if (
      enabledScopes &&
      !enabledScopes.has(getTelemetryPluginScope(subject.name, subject.marketplace, capabilities))
    )
      continue;
    let pluginHash = pluginIdHash(subject.name, subject.marketplace);
    if (seenHashes.has(pluginHash)) continue;
    seenHashes.add(pluginHash);
    let lastShown = lastShownByPlugin[pluginHash] ?? 0;
    if (now - lastShown < config.minTimeBetweenPerPluginMs) continue;
    if (best === null || lastShown < best.lastShown)
      best = {
        subject: {
          name: subject.name,
          marketplace: subject.marketplace,
          trigger: subject.trigger,
          features: activityFeaturesFor(subject.name, subject.marketplace),
        },
        lastShown,
      };
  }
  return best?.subject ?? null;
}
//@ chunk-czq1j3j2.js:1113996-1115981 placement
/**
 * 插件反馈调查：回合结束后按概率、间隔、启用的触发与范围挑选一个最近使用的插件显示调查，记录出现/回答/放弃并同步到评分商店。
 */
function usePluginFeedbackSurvey({
  turn,
  hasActivePrompt = false,
  enabled = true,
  otherSurveyActive = false,
}) {
  let { storageV5, credentials } = useTheme_2();
  let isLoading = useStoreSelector(turn, (turnState) => turnState.isLoading);
  let dynamicConfigValue = useDynamicConfigValue(
    "tengu_plugin_feedback_survey_config",
    PLUGIN_SURVEY_DEFAULT_CONFIG,
  );
  let config = useMemo(
    () => ({
      ...PLUGIN_SURVEY_DEFAULT_CONFIG,
      ...dynamicConfigValue,
    }),
    [dynamicConfigValue],
  );
  let [subject, setSubject] = useState(null);
  let subjectRef = useRef(null);
  let ratingsRef = useRef(new Map());
  let lastDrainAtRef = useRef(Date.now());
  let previousLoadingRef = useRef(isLoading);
  useEffect(() => {
    drainRecentActivity(Number.POSITIVE_INFINITY);
  }, []);
  let onOpen = useCallback(
    (appearanceId) => {
      let plugin = subjectRef.current;
      if (!plugin) return;
      let now = Date.now();
      let pluginHash = pluginIdHash(plugin.name, plugin.marketplace);
      saveGlobalConfig((config) => {
        let { [pluginHash]: removedTimestamp, ...restPending } = config.pluginSurveyState?.pending ?? {};
        return {
          ...config,
          pluginSurveyState: {
            ...config.pluginSurveyState,
            lastShownTime: now,
            perPlugin: {
              ...config.pluginSurveyState?.perPlugin,
              [pluginHash]: now,
            },
            pending: restPending,
          },
        };
      }, storageV5);
      logPluginSurveyEvent("appeared", appearanceId, plugin);
      recordPluginRatingAppearance(ratingsRef.current, appearanceId, plugin, credentials);
    },
    [storageV5, credentials],
  );
  let onSelect = useCallback(
    (appearanceId, response) => {
      let pluginSubject = subjectRef.current;
      if (!pluginSubject) return;
      logPluginSurveyEvent("responded", appearanceId, pluginSubject, response);
      submitPluginRating(ratingsRef.current, appearanceId, pluginSubject, response, credentials);
    },
    [credentials],
  );
  let onAbandon = useCallback((appearanceId) => {
    let plugin = subjectRef.current;
    if (!plugin) return;
    logPluginSurveyEvent("abandoned", appearanceId, plugin);
  }, []);
  let { state, lastResponse, appearanceId, open, abandon, handleSelect, handleUndo } = useSurveyState({
    hideThanksAfterMs: SURVEY_THANKS_MS,
    otherSurveyActive,
    onOpen,
    onSelect,
    onAbandon,
  });
  useEffect(() => {
    let wasLoading = previousLoadingRef.current;
    previousLoadingRef.current = isLoading;
    if (!wasLoading || isLoading) return;
    if (hasActivePrompt || state !== "closed") return;
    if (otherSurveyActive) return;
    if (!enabled || config.probability <= 0) return;
    if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return;
    if (shouldSkipFeedbackSurvey()) return;
    if (!isPolicyAllowed_2("allow_product_feedback")) return;
    let now = Date.now();
    let pluginSurveyState = getGlobalConfig().pluginSurveyState;
    let activities = drainRecentActivity(lastDrainAtRef.current);
    lastDrainAtRef.current = now;
    let pending = pluginSurveyState?.pending ?? {};
    let nextPending = mergePendingSurveyActivity(pending, activities, config.enabledTriggers);
    if (nextPending !== pending)
      saveGlobalConfig(
        (nextConfig) => ({
          ...nextConfig,
          pluginSurveyState: {
            ...nextConfig.pluginSurveyState,
            pending: mergePendingSurveyActivity(
              nextConfig.pluginSurveyState?.pending ?? {},
              activities,
              config.enabledTriggers,
            ),
          },
        }),
        storageV5,
      );
    if (
      pluginSurveyState?.lastShownTime &&
      now - pluginSurveyState.lastShownTime < config.minTimeBetweenGlobalMs
    )
      return;
    let subjects = listEligibleSurveySubjects(
      nextPending,
      config.minActivityAgeMs,
      () => Object.keys(getInstalledPlugins().plugins),
      now,
    );
    if (subjects.length === 0) return;
    let picked = pickPluginSurveySubject(
      subjects,
      config,
      pluginSurveyState?.perPlugin ?? {},
      policyEnabledPluginNameSet(),
      now,
    );
    if (!picked) return;
    if (Math.random() >= config.probability) return;
    subjectRef.current = picked;
    setSubject(picked);
    open();
  }, [enabled, isLoading, hasActivePrompt, state, config, open, otherSurveyActive, storageV5]);
  return {
    state,
    subject,
    lastResponse,
    appearanceId,
    abandon,
    handleSelect,
    handleUndo,
  };
}
export { usePluginFeedbackSurvey, useOrgSurvey };
