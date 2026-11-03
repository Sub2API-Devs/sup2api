/**
 * components/FeedbackSurvey/useOrgSurvey.tsx
 *
 * 2.1.316 新增：组织调查与插件反馈调查的触发 Hook：按策略、遥测与插件来源决定是否弹出调查对话框并记录事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (19)
 * attribution: placement 19
 */
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import {
  checkPendingOrgSurvey,
  isSurveyEligible,
  orgSurveyCredentialSource,
} from "../../services/orgSurvey/orgSurvey.js";
import { y, R, P, init_react_production, Q, ce } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-18hwfzwa.js:1070020-1070057 placement
function selectTurnLoadingSurvey(_r) {
  return _r.isLoading;
}
//@ chunk-18hwfzwa.js:1070057-1070108 placement
function openIfAnswering(fr) {
  return fr === "answering" ? "open" : fr;
}
//@ chunk-18hwfzwa.js:1070108-1070121 placement
var SURVEY_CLOSE_DELAY_MS = 4000;
//@ chunk-18hwfzwa.js:1070121-1070182 placement
function logOrgSurveyEvent(h) {
  logEvent("tengu_org_survey_event", {
    event_type: fromEnum(h),
  });
}
//@ chunk-18hwfzwa.js:1070182-1074142 placement
/**
 * 组织调查问卷的显示状态：回合结束后拉取待答问卷，满足空闲、无其他提示与问卷、非无人值守等条件时打开；忽略/提交时上报并关闭。
 */
function useOrgSurvey(props) {
  let ze = w(61);
  let { turn, messages, localJsx, hasActivePrompt, enabled, otherSurveyActive, client } = props;
  let { credentials, storageV5 } = useTheme_2();
  let Xe;
  if (ze[0] !== credentials || ze[1] !== storageV5) {
    Xe = () =>
      checkPendingOrgSurvey({
        credentials,
        storageV5,
      });
    ze[0] = credentials;
    ze[1] = storageV5;
    ze[2] = Xe;
  } else Xe = ze[2];
  let [rt] = y(Xe);
  let kt = client ?? rt;
  let clock = useClock();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let Ot = enabled && !isScreenReaderEnabled;
  let storeSelector = useStoreSelector(turn, selectTurnLoadingSurvey);
  let delayedFlag = useDelayedFlag(storeSelector);
  let active = useActive();
  let oo = useShortDraftValue() === "";
  let Xt;
  if (ze[3] !== storeSelector || ze[4] !== messages) {
    Xt = !storeSelector && endsWithNumberedList(messages);
    ze[3] = storeSelector;
    ze[4] = messages;
    ze[5] = Xt;
  } else Xt = ze[5];
  let io = Xt;
  let [so, po] = y("closed");
  let [ao, co] = y(null);
  let [bo, Ao] = y(false);
  let Bo = R(false);
  let Ro = R(false);
  let Ho = R(false);
  let Io = R(false);
  let Wo = R(false);
  let mn;
  if (ze[6] === MEMO_CACHE_SENTINEL) {
    mn = {};
    ze[6] = mn;
  } else mn = ze[6];
  let Cn = R(mn);
  let No = R(null);
  let storeSelectorRef = R(storeSelector);
  let Yo = R(true);
  let kn = R(null);
  let Fn;
  let bn;
  if (ze[7] === MEMO_CACHE_SENTINEL) {
    Fn = () => {
      Yo.current = true;
      return () => {
        Yo.current = false;
        kn.current?.();
        No.current?.close();
      };
    };
    bn = [];
    ze[7] = Fn;
    ze[8] = bn;
  } else {
    Fn = ze[7];
    bn = ze[8];
  }
  P(Fn, bn);
  let Go;
  if (ze[9] === MEMO_CACHE_SENTINEL) {
    Go = () => {
      Ro.current = true;
      po("closed");
    };
    ze[9] = Go;
  } else Go = ze[9];
  let hn = Go;
  let Mn;
  let Xo;
  if (ze[10] !== Ot || ze[11] !== kt || ze[12] !== storeSelector) {
    Mn = () => {
      let Sn = storeSelectorRef.current;
      storeSelectorRef.current = storeSelector;
      if (!Sn || storeSelector || !Ot || Bo.current || isUnattendedInteractiveSession()) {
        return;
      }
      Bo.current = true;
      kt.getPendingSurvey().then(($n) => {
        if ($n !== null) co($n);
      });
    };
    Xo = [storeSelector, Ot, kt];
    ze[10] = Ot;
    ze[11] = kt;
    ze[12] = storeSelector;
    ze[13] = Mn;
    ze[14] = Xo;
  } else {
    Mn = ze[13];
    Xo = ze[14];
  }
  P(Mn, Xo);
  let on;
  let _o;
  if (
    ze[15] !== Ot ||
    ze[16] !== hasActivePrompt ||
    ze[17] !== storeSelector ||
    ze[18] !== active ||
    ze[19] !== io ||
    ze[20] !== otherSurveyActive ||
    ze[21] !== oo ||
    ze[22] !== so ||
    ze[23] !== ao ||
    ze[24] !== delayedFlag
  ) {
    _o = () => {
      if (
        ao === null ||
        so !== "closed" ||
        Ro.current ||
        !Ot ||
        storeSelector ||
        !delayedFlag ||
        active ||
        !oo ||
        hasActivePrompt ||
        otherSurveyActive ||
        io ||
        isUnattendedInteractiveSession()
      ) {
        return;
      }
      po("open");
    };
    on = [ao, so, Ot, storeSelector, delayedFlag, active, oo, hasActivePrompt, otherSurveyActive, io];
    ze[15] = Ot;
    ze[16] = hasActivePrompt;
    ze[17] = storeSelector;
    ze[18] = active;
    ze[19] = io;
    ze[20] = otherSurveyActive;
    ze[21] = oo;
    ze[22] = so;
    ze[23] = ao;
    ze[24] = delayedFlag;
    ze[25] = on;
    ze[26] = _o;
  } else {
    on = ze[25];
    _o = ze[26];
  }
  P(_o, on);
  let cn;
  if (ze[27] !== so) {
    cn = () => {
      if (so !== "open") {
        return;
      }
      logOrgSurveyEvent("ignored");
      hn();
    };
    ze[27] = so;
    ze[28] = cn;
  } else cn = ze[28];
  let Dn = cn;
  let wn;
  let mr;
  if (ze[29] !== Dn || ze[30] !== storeSelector) {
    wn = () => {
      if (storeSelector) Dn();
    };
    mr = [storeSelector, Dn];
    ze[29] = Dn;
    ze[30] = storeSelector;
    ze[31] = wn;
    ze[32] = mr;
  } else {
    wn = ze[31];
    mr = ze[32];
  }
  P(wn, mr);
  let Kn;
  if (ze[33] !== kt || ze[34] !== ao) {
    Kn = () => {
      if (Ho.current || ao === null) {
        return;
      }
      Ho.current = true;
      logOrgSurveyEvent("shown");
      kt.recordMilestone(ao, "shown");
    };
    ze[33] = kt;
    ze[34] = ao;
    ze[35] = Kn;
  } else Kn = ze[35];
  let onShown = Kn;
  let Fr;
  if (ze[36] !== kt || ze[37] !== so || ze[38] !== ao) {
    Fr = () => {
      if (so !== "open" || ao === null || Wo.current) {
        return;
      }
      logOrgSurveyEvent("dismissed");
      hn();
      kt.dismissSurvey(ao);
    };
    ze[36] = kt;
    ze[37] = so;
    ze[38] = ao;
    ze[39] = Fr;
  } else Fr = ze[39];
  let dismiss = Fr;
  let Un;
  if (ze[40] !== kt || ze[41] !== clock || ze[42] !== ao) {
    Un = async (dr) => {
      if (ao === null) {
        return "failed";
      }
      if (isUnattendedInteractiveSession()) {
        logOrgSurveyEvent("ignored");
        hn();
        No.current?.close();
        No.current = null;
        return "closed";
      }
      let or = await kt.submitSurvey(ao, dr);
      if (or === "failed") {
        return or;
      }
      logOrgSurveyEvent(or === "submitted" ? "submitted" : "unavailable");
      Ro.current = true;
      No.current?.close();
      No.current = null;
      po(or === "submitted" ? "thanks" : "gone");
      kn.current = clock.setTimeout(() => po("closed"), SURVEY_CLOSE_DELAY_MS);
      return or;
    };
    ze[40] = kt;
    ze[41] = clock;
    ze[42] = ao;
    ze[43] = Un;
  } else Un = ze[43];
  let onSubmit = Un;
  let Qn;
  if (ze[44] !== kt || ze[45] !== localJsx || ze[46] !== onSubmit) {
    Qn = (ur) => {
      if (!Io.current) {
        Io.current = true;
        logOrgSurveyEvent("started");
        kt.recordMilestone(ur, "started");
      }
      po("answering");
      let Pr = localJsx.show(
        jsxProd_default(OrgSurveyDialog, {
          survey: ur,
          initialDraft: Cn.current,
          onDraftChange: (Ir) => {
            Cn.current = Ir;
          },
          onSubmit,
          onClose: () => Pr.close(),
        }),
        {
          commandName: "org-survey",
          immediate: false,
          hidesPrompt: true,
          retireAtTurnBoundary: false,
        },
      );
      No.current = Pr;
      Pr.closed.then(() => {
        if (No.current === Pr) No.current = null;
        if (!Ro.current) po(openIfAnswering);
      });
    };
    ze[44] = kt;
    ze[45] = localJsx;
    ze[46] = onSubmit;
    ze[47] = Qn;
  } else Qn = ze[47];
  let ts = Qn;
  let Gn;
  if (ze[48] !== kt || ze[49] !== ts || ze[50] !== so || ze[51] !== ao) {
    Gn = () => {
      if (so !== "open" || ao === null || Wo.current) {
        return;
      }
      Wo.current = true;
      Ao(true);
      let Ur = () => {
        Wo.current = false;
        Ao(false);
      };
      kt.isStillPending(ao).then((Zr) => {
        Ur();
        if (Ro.current || !Yo.current) {
          return;
        }
        if (isUnattendedInteractiveSession()) {
          logOrgSurveyEvent("ignored");
          hn();
          return;
        }
        if (!Zr) {
          logOrgSurveyEvent("unavailable");
          hn();
          return;
        }
        ts(ao);
      }, Ur);
    };
    ze[48] = kt;
    ze[49] = ts;
    ze[50] = so;
    ze[51] = ao;
    ze[52] = Gn;
  } else Gn = ze[52];
  let start = Gn;
  let zr;
  if (
    ze[53] !== dismiss ||
    ze[54] !== Dn ||
    ze[55] !== onShown ||
    ze[56] !== start ||
    ze[57] !== bo ||
    ze[58] !== so ||
    ze[59] !== ao
  ) {
    zr = {
      state: so,
      survey: ao,
      starting: bo,
      onShown,
      start,
      dismiss,
      ignore: Dn,
    };
    ze[53] = dismiss;
    ze[54] = Dn;
    ze[55] = onShown;
    ze[56] = start;
    ze[57] = bo;
    ze[58] = so;
    ze[59] = ao;
    ze[60] = zr;
  } else zr = ze[60];
  return zr;
}
//@ chunk-18hwfzwa.js:1074142-1074146 placement
init_react_production();
//@ chunk-18hwfzwa.js:1074146-1074281 placement
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
  validateStatus: (h) => h < 500,
};
var MAX_RATING_CHAINS = 8;
//@ chunk-18hwfzwa.js:1074281-1074562 placement
function recordPluginRatingAppearance(h, x, D, credentials) {
  return chainRatingRequest(h, x, async () => {
    let pluginRatingTarget = await getPluginRatingTarget(D, credentials);
    if (!pluginRatingTarget) return;
    await callPluginRatingsApi(
      "appearance",
      "post",
      "/api/oauth/organizations/:orgUUID/plugin_ratings/appearances",
      {
        marketplace_name: pluginRatingTarget.marketplaceName,
        plugin_name: pluginRatingTarget.pluginName,
        client_surface: "cli",
        appearance_id: x,
      },
      credentials,
    );
  });
}
//@ chunk-18hwfzwa.js:1074562-1075909 placement
/**
 * 把插件评分提交到商店：bad/fine/good 提交评分，dismissed/not_sure 上报结果并在之前已评分时撤回；同一出现 id 的请求串行执行。
 */
function submitPluginRating(chains, appearanceId, plugin, response, credentials) {
  return chainRatingRequest(chains, appearanceId, async (ke) => {
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
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION,
              appearance_id: appearanceId,
            },
            credentials,
          )
        )
          ke.ratedInStore = true;
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
        if (ke.ratedInStore) {
          if (
            await callPluginRatingsApi(
              "withdraw",
              "delete",
              `/api/oauth/organizations/:orgUUID/plugin_ratings?marketplace_name=${encodeURIComponent(pluginRatingTarget.marketplaceName)}&plugin_name=${encodeURIComponent(pluginRatingTarget.pluginName)}`,
              undefined,
              credentials,
            )
          )
            ke.ratedInStore = false;
        }
        return;
      }
    }
  });
}
//@ chunk-18hwfzwa.js:1075909-1076474 placement
/**
 * 判断是否可以向商店上报插件评分（未禁用反馈、第一方、非官方市场、组织匹配、动态配置开启），返回 {marketplaceName, pluginName} 或 null。
 */
async function getPluginRatingTarget(h, x) {
  if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return null;
  if (shouldSkipFeedbackSurvey()) return null;
  if (isFirstPartyTelemetryBlocked()) return null;
  if (!isPolicyAllowed_2("allow_product_feedback")) return null;
  if (isEssentialTrafficOnly()) return null;
  if (getAPIProvider() !== "firstParty") return null;
  if (h.marketplace === undefined || isOfficialMarketplace(h.marketplace)) return null;
  if (!isSurveyEligible()) {
    if (hasStoredOAuthToken()) logFeatureSad("cli_plugin_rating_store", "skip_auth_org_mismatch");
    return null;
  }
  if (
    !(await orgSurveyCredentialSource(x, {
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
    marketplaceName: h.marketplace,
    pluginName: h.name,
  };
}
//@ chunk-18hwfzwa.js:1076474-1076765 placement
function chainRatingRequest(h, x, D) {
  let L = h.get(x);
  if (!L) {
    L = {
      chain: Promise.resolve(),
      ratedInStore: false,
    };
    h.set(x, L);
    if (h.size > MAX_RATING_CHAINS) {
      for (let key of h.keys())
        if (key !== x) {
          h.delete(key);
          break;
        }
    }
  }
  let ee = L;
  L.chain = L.chain.then(() =>
    D(ee).catch((error) => {
      logError(error);
      logFeatureBad("cli_plugin_rating_store", "chain_exception");
    }),
  );
  return L.chain;
}
//@ chunk-18hwfzwa.js:1076765-1077648 placement
/**
 * 调用插件评分商店 API（post/delete），按网络错误、认证、HTTP 状态分类记录 cli_plugin_rating_store 结果，成功返回 true。
 */
async function callPluginRatingsApi(step, method, path, body, credentials) {
  let ke = {
    ...PLUGIN_RATINGS_REQUEST_OPTIONS,
    credentials,
  };
  let Re;
  try {
    Re = method === "post" ? await apiClient.post(path, body, ke) : await apiClient.delete(path, body, ke);
  } catch (error) {
    let { kind, status } = classifyAxiosError(error);
    let ze =
      status !== undefined
        ? `http_${status}`
        : kind === "other"
          ? "exception"
          : kind === "http"
            ? (sanitizedConnectionCodeLowerForTelemetry(getErrnoCode(error)) ?? "no_response")
            : kind;
    logFeatureBad("cli_plugin_rating_store", `${step}_${ze}`);
    logForDebugging(`plugin rating store ${step} failed: ${ze}`, {
      level: "warn",
    });
    return false;
  }
  if (!Re.ok) {
    let Be = Re.reason === "no-auth" ? "auth_unavailable" : Re.reason.replaceAll("-", "_");
    logFeatureSad("cli_plugin_rating_store", `${step}_${Be}`);
    return false;
  }
  if (Re.status >= 200 && Re.status < 300) {
    logFeatureOk("cli_plugin_rating_store");
    return true;
  }
  if ([401, 403, 404, 409].includes(Re.status)) {
    logFeatureSad("cli_plugin_rating_store", `${step}_http_${Re.status}`);
    logForDebugging(`plugin rating store ${step} skipped: http_${Re.status}`);
    return false;
  }
  logFeatureBad("cli_plugin_rating_store", `${step}_http_${Re.status}`);
  logForDebugging(`plugin rating store ${step} failed: http_${Re.status}`, {
    level: "warn",
  });
  return false;
}
//@ chunk-18hwfzwa.js:1077648-1077868 placement
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
//@ chunk-18hwfzwa.js:1077868-1078489 placement
/**
 * 把新的插件使用活动合并进待调查记录：同插件一小时内只保留更合适的触发类型，超过上限保留最新的。
 */
function mergePendingSurveyActivity(
  pending,
  activities,
  enabledTriggers = PLUGIN_SURVEY_DEFAULT_CONFIG.enabledTriggers,
) {
  let L = (trigger) => enabledTriggers.includes(trigger);
  let next = null;
  for (let activity of activities) {
    if (isOfficialOrBuiltinMarketplace(activity.marketplace)) continue;
    let Re = pluginIdHash(activity.name, activity.marketplace);
    let Be = (next ?? pending)[Re];
    let He = Be != null && typeof Be.ts === "number" && typeof Be.trigger === "string";
    if (He && activity.ts - Be.ts < ACTIVITY_DEDUPE_MS) {
      if (L(activity.trigger) && !L(Be.trigger)) {
        next = next ?? {
          ...pending,
        };
        next[Re] = {
          ts: Be.ts,
          trigger: activity.trigger,
        };
      }
      continue;
    }
    let We = He && L(Be.trigger) && !L(activity.trigger);
    next = next ?? {
      ...pending,
    };
    next[Re] = {
      ts: activity.ts,
      trigger: We ? Be.trigger : activity.trigger,
    };
  }
  if (next && Object.keys(next).length > MAX_PENDING_SURVEYS) {
    let sliced = Object.entries(next)
      .sort((Re, Be) => (Be[1]?.ts ?? 0) - (Re[1]?.ts ?? 0))
      .slice(0, MAX_PENDING_SURVEYS);
    next = Object.fromEntries(sliced);
  }
  return next ?? pending;
}
//@ chunk-18hwfzwa.js:1078489-1078963 placement
/**
 * 从插件反馈问卷记录中筛出已到期（距触发超过最小间隔）且仍已安装、触发类型有效的插件，按触发时间倒序返回。
 */
function listEligibleSurveySubjects(h, minActivityAgeMs, D, L) {
  let filtered = Object.entries(h).filter(
    ([, value]) =>
      value !== null &&
      typeof value === "object" &&
      typeof value.ts === "number" &&
      typeof value.trigger === "string" &&
      L - value.ts >= minActivityAgeMs,
  );
  if (filtered.length === 0) return [];
  let ke = new Map();
  for (let Be of D()) {
    let pluginIdentifier = parsePluginIdentifier(Be);
    ke.set(pluginIdHash(pluginIdentifier.name, pluginIdentifier.marketplace), pluginIdentifier);
  }
  let Re = [];
  for (let [Be, He] of filtered) {
    let We = ke.get(Be);
    if (!We || !isPluginActivityKind(He.trigger)) continue;
    Re.push({
      name: We.name,
      marketplace: We.marketplace,
      trigger: He.trigger,
      ts: He.ts,
    });
  }
  return Re.sort((Be, He) => He.ts - Be.ts);
}
//@ chunk-18hwfzwa.js:1078963-1079370 placement
/**
 * 上报插件反馈问卷事件：tengu_plugin_feedback_survey_event 与 OTel feedback_survey（第三方插件名在未开启工具详情日志时隐去）。
 */
function logPluginSurveyEvent(h, x, D, L) {
  logEvent("tengu_plugin_feedback_survey_event", {
    event_type: fromEnum(h),
    appearance_id: sanitizeMarkName(x),
    trigger_type: fromEnum(D.trigger),
    ...(L && {
      response: fromEnum(L),
    }),
    ...buildPluginEventFields(D.name, D.marketplace),
  });
  let ee =
    isAnthropicPluginSource(getTelemetryPluginScope(D.name, D.marketplace, null)) ||
    isToolDetailsLoggingEnabled();
  logOTelEvent("feedback_survey", {
    event_type: h,
    appearance_id: x,
    survey_type: "plugin",
    trigger_type: D.trigger,
    ...(L && {
      response: L,
    }),
    plugin_id_hash: pluginIdHash(D.name, D.marketplace),
    "plugin.name": ee ? D.name : THIRD_PARTY,
  });
}
//@ chunk-18hwfzwa.js:1079370-1079965 placement
/**
 * 从候选中选出要显示问卷的插件：触发类型与作用域须启用、每个插件只看一次、距上次展示超过最小间隔，取最久未展示者。
 */
function pickPluginSurveySubject(h, x, D, L, ee) {
  let ke = new Set(x.enabledTriggers);
  let Re = x.enabledScopes && x.enabledScopes.length > 0 ? new Set(x.enabledScopes) : null;
  let Be = null;
  let He = new Set();
  for (let idx = h.length - 1; idx >= 0; idx--) {
    let ze = h[idx];
    if (!ke.has(ze.trigger)) continue;
    if (Re && !Re.has(getTelemetryPluginScope(ze.name, ze.marketplace, L))) continue;
    let Xe = pluginIdHash(ze.name, ze.marketplace);
    if (He.has(Xe)) continue;
    He.add(Xe);
    let rt = D[Xe] ?? 0;
    if (ee - rt < x.minTimeBetweenPerPluginMs) continue;
    if (Be === null || rt < Be.lastShown)
      Be = {
        subject: {
          name: ze.name,
          marketplace: ze.marketplace,
          trigger: ze.trigger,
          features: activityFeaturesFor(ze.name, ze.marketplace),
        },
        lastShown: rt,
      };
  }
  return Be?.subject ?? null;
}
//@ chunk-18hwfzwa.js:1079965-1081950 placement
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
  let Re = useStoreSelector(turn, (ao) => ao.isLoading);
  let dynamicConfigValue = useDynamicConfigValue(
    "tengu_plugin_feedback_survey_config",
    PLUGIN_SURVEY_DEFAULT_CONFIG,
  );
  let He = Q(
    () => ({
      ...PLUGIN_SURVEY_DEFAULT_CONFIG,
      ...dynamicConfigValue,
    }),
    [dynamicConfigValue],
  );
  let [We, ze] = y(null);
  let Xe = R(null);
  let rt = R(new Map());
  let kt = R(Date.now());
  let At = R(Re);
  P(() => {
    drainRecentActivity(Number.POSITIVE_INFINITY);
  }, []);
  let onOpen = ce(
    (ao) => {
      let co = Xe.current;
      if (!co) return;
      let now = Date.now();
      let Ao = pluginIdHash(co.name, co.marketplace);
      saveGlobalConfig((Bo) => {
        let { [Ao]: Ro, ...Ho } = Bo.pluginSurveyState?.pending ?? {};
        return {
          ...Bo,
          pluginSurveyState: {
            ...Bo.pluginSurveyState,
            lastShownTime: now,
            perPlugin: {
              ...Bo.pluginSurveyState?.perPlugin,
              [Ao]: now,
            },
            pending: Ho,
          },
        };
      }, storageV5);
      logPluginSurveyEvent("appeared", ao, co);
      recordPluginRatingAppearance(rt.current, ao, co, credentials);
    },
    [storageV5, credentials],
  );
  let onSelect = ce(
    (appearanceId, response) => {
      let plugin = Xe.current;
      if (!plugin) return;
      logPluginSurveyEvent("responded", appearanceId, plugin, response);
      submitPluginRating(rt.current, appearanceId, plugin, response, credentials);
    },
    [credentials],
  );
  let onAbandon = ce((ao) => {
    let co = Xe.current;
    if (!co) return;
    logPluginSurveyEvent("abandoned", ao, co);
  }, []);
  let { state, lastResponse, appearanceId, open, abandon, handleSelect, handleUndo } = useSurveyState({
    hideThanksAfterMs: SURVEY_THANKS_MS,
    otherSurveyActive,
    onOpen,
    onSelect,
    onAbandon,
  });
  P(() => {
    let ao = At.current;
    At.current = Re;
    if (!ao || Re) return;
    if (hasActivePrompt || state !== "closed") return;
    if (otherSurveyActive) return;
    if (!enabled || He.probability <= 0) return;
    if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return;
    if (shouldSkipFeedbackSurvey()) return;
    if (!isPolicyAllowed_2("allow_product_feedback")) return;
    let now = Date.now();
    let pluginSurveyState = getGlobalConfig().pluginSurveyState;
    let activities = drainRecentActivity(kt.current);
    kt.current = now;
    let pending = pluginSurveyState?.pending ?? {};
    let Ro = mergePendingSurveyActivity(pending, activities, He.enabledTriggers);
    if (Ro !== pending)
      saveGlobalConfig(
        (Wo) => ({
          ...Wo,
          pluginSurveyState: {
            ...Wo.pluginSurveyState,
            pending: mergePendingSurveyActivity(
              Wo.pluginSurveyState?.pending ?? {},
              activities,
              He.enabledTriggers,
            ),
          },
        }),
        storageV5,
      );
    if (pluginSurveyState?.lastShownTime && now - pluginSurveyState.lastShownTime < He.minTimeBetweenGlobalMs)
      return;
    let Ho = listEligibleSurveySubjects(
      Ro,
      He.minActivityAgeMs,
      () => Object.keys(getInstalledPlugins().plugins),
      now,
    );
    if (Ho.length === 0) return;
    let Io = pickPluginSurveySubject(
      Ho,
      He,
      pluginSurveyState?.perPlugin ?? {},
      policyEnabledPluginNameSet(),
      now,
    );
    if (!Io) return;
    if (Math.random() >= He.probability) return;
    Xe.current = Io;
    ze(Io);
    open();
  }, [enabled, Re, hasActivePrompt, state, He, open, otherSurveyActive, storageV5]);
  return {
    state,
    subject: We,
    lastResponse,
    appearanceId,
    abandon,
    handleSelect,
    handleUndo,
  };
}
//@ chunk-18hwfzwa.js:1081950-1081954 placement
init_react_production();
export { usePluginFeedbackSurvey, useOrgSurvey };
