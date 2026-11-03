/**
 * screens/_new/useOrgSurvey.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (19)
 * attribution: sole-consumer-new 19
 */
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { checkPendingOrgSurvey, N4, orgSurveyCredentialSource } from "../../services/orgSurvey/orgSurvey.js";
import { y, R, P, j, Q, ce } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useDelayedFlag, JM, YM } from "../../components/FeedbackSurvey/SurveyHost.js";
import { Aw, useShortDraftValue } from "../repl/storeHooks.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrgSurveyDialog } from "../../components/FeedbackSurvey/OrgSurveyDialog.js";
import { env } from "../../utils/env.js";
import { shouldSkipFeedbackSurvey, isFirstPartyTelemetryBlocked } from "../../utils/hostEnvironment.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { isOfficialMarketplace, mbr, parsePluginIdentifier } from "../../utils/plugins/pluginIdentifier.js";
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
  lx,
  buildPluginEventFields,
  isAnthropicPluginSource,
  getTelemetryPluginScope,
} from "../../utils/telemetry/pluginTelemetry.js";
import { Nqs, $qs, pFo } from "../../utils/pluginActivity.js";
import { ye } from "../../utils/startupMarks.js";
import { isToolDetailsLoggingEnabled, THIRD_PARTY } from "../../services/analytics/metadata.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { saveGlobalConfig, getGlobalConfig } from "../../utils/config.js";
import { useSurveyState } from "../../components/FeedbackSurvey/useSurveyState.js";
import { getInstalledPlugins } from "../../utils/plugins/installedPluginsManager.js";
import { af } from "../../utils/plugins/pluginPolicy.js";

//@ chunk-18hwfzwa.js:1070020-1070057 sole-consumer-new
function SSo(_r) {
  return _r.isLoading;
}
//@ chunk-18hwfzwa.js:1070057-1070108 sole-consumer-new
function bSo(fr) {
  return fr === "answering" ? "open" : fr;
}
//@ chunk-18hwfzwa.js:1070108-1070121 sole-consumer-new
var irt = 4000;
//@ chunk-18hwfzwa.js:1070121-1070182 sole-consumer-new
function Qf(h) {
  logEvent("tengu_org_survey_event", { event_type: fromEnum(h) });
}
/**
 * 组织调查问卷的显示状态：回合结束后拉取待答问卷，满足空闲、无其他提示与问卷、非无人值守等条件时打开；忽略/提交时上报并关闭。
 */
//@ chunk-18hwfzwa.js:1070182-1074142 sole-consumer-new
function useOrgSurvey(h) {
  let ze = w(61),
    {
      turn: turn,
      messages: messages,
      localJsx: localJsx,
      hasActivePrompt: hasActivePrompt,
      enabled: enabled,
      otherSurveyActive: otherSurveyActive,
      client: client,
    } = h,
    { credentials: credentials, storageV5: storageV5 } = Me(),
    Xe;
  if (ze[0] !== credentials || ze[1] !== storageV5)
    ((Xe = () => checkPendingOrgSurvey({ credentials: credentials, storageV5: storageV5 })),
      (ze[0] = credentials),
      (ze[1] = storageV5),
      (ze[2] = Xe));
  else Xe = ze[2];
  let [rt] = y(Xe),
    kt = client ?? rt,
    At = useClock(),
    It = useIsScreenReaderEnabled(),
    Ot = enabled && !It,
    Et = useStoreSelector(turn, SSo),
    Dt = useDelayedFlag(Et),
    Lt = Aw(),
    oo = useShortDraftValue() === "",
    Xt;
  if (ze[3] !== Et || ze[4] !== messages)
    ((Xt = !Et && JM(messages)), (ze[3] = Et), (ze[4] = messages), (ze[5] = Xt));
  else Xt = ze[5];
  let io = Xt,
    [so, po] = y("closed"),
    [ao, co] = y(null),
    [bo, Ao] = y(!1),
    Bo = R(!1),
    Ro = R(!1),
    Ho = R(!1),
    Io = R(!1),
    Wo = R(!1),
    mn;
  if (ze[6] === MEMO_CACHE_SENTINEL) ((mn = {}), (ze[6] = mn));
  else mn = ze[6];
  let Cn = R(mn),
    No = R(null),
    vo = R(Et),
    Yo = R(!0),
    kn = R(null),
    Fn,
    bn;
  if (ze[7] === MEMO_CACHE_SENTINEL)
    ((Fn = () => (
      (Yo.current = !0),
      () => {
        ((Yo.current = !1), kn.current?.(), No.current?.close());
      }
    )),
      (bn = []),
      (ze[7] = Fn),
      (ze[8] = bn));
  else ((Fn = ze[7]), (bn = ze[8]));
  P(Fn, bn);
  let Go;
  if (ze[9] === MEMO_CACHE_SENTINEL)
    ((Go = () => {
      ((Ro.current = !0), po("closed"));
    }),
      (ze[9] = Go));
  else Go = ze[9];
  let hn = Go,
    Mn,
    Xo;
  if (ze[10] !== Ot || ze[11] !== kt || ze[12] !== Et)
    ((Mn = () => {
      let Sn = vo.current;
      if (((vo.current = Et), !Sn || Et || !Ot || Bo.current || isUnattendedInteractiveSession())) {
        return;
      }
      ((Bo.current = !0),
        kt.getPendingSurvey().then(($n) => {
          if ($n !== null) co($n);
        }));
    }),
      (Xo = [Et, Ot, kt]),
      (ze[10] = Ot),
      (ze[11] = kt),
      (ze[12] = Et),
      (ze[13] = Mn),
      (ze[14] = Xo));
  else ((Mn = ze[13]), (Xo = ze[14]));
  P(Mn, Xo);
  let on, _o;
  if (
    ze[15] !== Ot ||
    ze[16] !== hasActivePrompt ||
    ze[17] !== Et ||
    ze[18] !== Lt ||
    ze[19] !== io ||
    ze[20] !== otherSurveyActive ||
    ze[21] !== oo ||
    ze[22] !== so ||
    ze[23] !== ao ||
    ze[24] !== Dt
  )
    ((_o = () => {
      if (
        ao === null ||
        so !== "closed" ||
        Ro.current ||
        !Ot ||
        Et ||
        !Dt ||
        Lt ||
        !oo ||
        hasActivePrompt ||
        otherSurveyActive ||
        io ||
        isUnattendedInteractiveSession()
      ) {
        return;
      }
      po("open");
    }),
      (on = [ao, so, Ot, Et, Dt, Lt, oo, hasActivePrompt, otherSurveyActive, io]),
      (ze[15] = Ot),
      (ze[16] = hasActivePrompt),
      (ze[17] = Et),
      (ze[18] = Lt),
      (ze[19] = io),
      (ze[20] = otherSurveyActive),
      (ze[21] = oo),
      (ze[22] = so),
      (ze[23] = ao),
      (ze[24] = Dt),
      (ze[25] = on),
      (ze[26] = _o));
  else ((on = ze[25]), (_o = ze[26]));
  P(_o, on);
  let cn;
  if (ze[27] !== so)
    ((cn = () => {
      if (so !== "open") {
        return;
      }
      (Qf("ignored"), hn());
    }),
      (ze[27] = so),
      (ze[28] = cn));
  else cn = ze[28];
  let Dn = cn,
    wn,
    mr;
  if (ze[29] !== Dn || ze[30] !== Et)
    ((wn = () => {
      if (Et) Dn();
    }),
      (mr = [Et, Dn]),
      (ze[29] = Dn),
      (ze[30] = Et),
      (ze[31] = wn),
      (ze[32] = mr));
  else ((wn = ze[31]), (mr = ze[32]));
  P(wn, mr);
  let Kn;
  if (ze[33] !== kt || ze[34] !== ao)
    ((Kn = () => {
      if (Ho.current || ao === null) {
        return;
      }
      ((Ho.current = !0), Qf("shown"), kt.recordMilestone(ao, "shown"));
    }),
      (ze[33] = kt),
      (ze[34] = ao),
      (ze[35] = Kn));
  else Kn = ze[35];
  let Wn = Kn,
    Fr;
  if (ze[36] !== kt || ze[37] !== so || ze[38] !== ao)
    ((Fr = () => {
      if (so !== "open" || ao === null || Wo.current) {
        return;
      }
      (Qf("dismissed"), hn(), kt.dismissSurvey(ao));
    }),
      (ze[36] = kt),
      (ze[37] = so),
      (ze[38] = ao),
      (ze[39] = Fr));
  else Fr = ze[39];
  let Zn = Fr,
    Un;
  if (ze[40] !== kt || ze[41] !== At || ze[42] !== ao)
    ((Un = async (dr) => {
      if (ao === null) {
        return "failed";
      }
      if (isUnattendedInteractiveSession()) {
        return (Qf("ignored"), hn(), No.current?.close(), (No.current = null), "closed");
      }
      let submitSurvey = await kt.submitSurvey(ao, dr);
      if (submitSurvey === "failed") {
        return submitSurvey;
      }
      return (
        Qf(submitSurvey === "submitted" ? "submitted" : "unavailable"),
        (Ro.current = !0),
        No.current?.close(),
        (No.current = null),
        po(submitSurvey === "submitted" ? "thanks" : "gone"),
        (kn.current = At.setTimeout(() => po("closed"), irt)),
        submitSurvey
      );
    }),
      (ze[40] = kt),
      (ze[41] = At),
      (ze[42] = ao),
      (ze[43] = Un));
  else Un = ze[43];
  let pr = Un,
    Qn;
  if (ze[44] !== kt || ze[45] !== localJsx || ze[46] !== pr)
    ((Qn = (ur) => {
      if (!Io.current) ((Io.current = !0), Qf("started"), kt.recordMilestone(ur, "started"));
      po("answering");
      let show = localJsx.show(
        e(OrgSurveyDialog, {
          survey: ur,
          initialDraft: Cn.current,
          onDraftChange: (Ir) => {
            Cn.current = Ir;
          },
          onSubmit: pr,
          onClose: () => show.close(),
        }),
        { commandName: "org-survey", immediate: !1, hidesPrompt: !0, retireAtTurnBoundary: !1 },
      );
      ((No.current = show),
        show.closed.then(() => {
          if (No.current === show) No.current = null;
          if (!Ro.current) po(bSo);
        }));
    }),
      (ze[44] = kt),
      (ze[45] = localJsx),
      (ze[46] = pr),
      (ze[47] = Qn));
  else Qn = ze[47];
  let ts = Qn,
    Gn;
  if (ze[48] !== kt || ze[49] !== ts || ze[50] !== so || ze[51] !== ao)
    ((Gn = () => {
      if (so !== "open" || ao === null || Wo.current) {
        return;
      }
      ((Wo.current = !0), Ao(!0));
      let Ur = () => {
        ((Wo.current = !1), Ao(!1));
      };
      kt.isStillPending(ao).then((Zr) => {
        if ((Ur(), Ro.current || !Yo.current)) {
          return;
        }
        if (isUnattendedInteractiveSession()) {
          (Qf("ignored"), hn());
          return;
        }
        if (!Zr) {
          (Qf("unavailable"), hn());
          return;
        }
        ts(ao);
      }, Ur);
    }),
      (ze[48] = kt),
      (ze[49] = ts),
      (ze[50] = so),
      (ze[51] = ao),
      (ze[52] = Gn));
  else Gn = ze[52];
  let wr = Gn,
    zr;
  if (
    ze[53] !== Zn ||
    ze[54] !== Dn ||
    ze[55] !== Wn ||
    ze[56] !== wr ||
    ze[57] !== bo ||
    ze[58] !== so ||
    ze[59] !== ao
  )
    ((zr = { state: so, survey: ao, starting: bo, onShown: Wn, start: wr, dismiss: Zn, ignore: Dn }),
      (ze[53] = Zn),
      (ze[54] = Dn),
      (ze[55] = Wn),
      (ze[56] = wr),
      (ze[57] = bo),
      (ze[58] = so),
      (ze[59] = ao),
      (ze[60] = zr));
  else zr = ze[60];
  return zr;
}
//@ chunk-18hwfzwa.js:1074142-1074146 sole-consumer-new
j();
/**
 * 插件评分商店的默认配置、请求选项（teleport-org 认证、后台、5xx 才算错误）与每插件串行链的缓存上限。
 */
//@ chunk-18hwfzwa.js:1074146-1074281 sole-consumer-new
var PLUGIN_RATINGS_STORE_DEFAULT = { enabled: !1 },
  TENGU_PLUGIN_RATINGS_STORE_CONFIG = "tengu_plugin_ratings_store_config",
  PLUGIN_RATINGS_REQUEST_OPTIONS = { auth: "teleport-org", isBackground: !0, validateStatus: (h) => h < 500 },
  MAX_RATING_CHAINS = 8;
//@ chunk-18hwfzwa.js:1074281-1074562 sole-consumer-new
function recordPluginRatingAppearance(h, x, D, L) {
  return chainRatingRequest(h, x, async () => {
    let ee = await getPluginRatingTarget(D, L);
    if (!ee) return;
    await callPluginRatingsApi(
      "appearance",
      "post",
      "/api/oauth/organizations/:orgUUID/plugin_ratings/appearances",
      {
        marketplace_name: ee.marketplaceName,
        plugin_name: ee.pluginName,
        client_surface: "cli",
        appearance_id: x,
      },
      L,
    );
  });
}
/**
 * 把插件评分提交到商店：bad/fine/good 提交评分，dismissed/not_sure 上报结果并在之前已评分时撤回；同一出现 id 的请求串行执行。
 */
//@ chunk-18hwfzwa.js:1074562-1075909 sole-consumer-new
function submitPluginRating(chains, appearanceId, plugin, response, credentials) {
  return chainRatingRequest(chains, appearanceId, async (ke) => {
    let Re = await getPluginRatingTarget(plugin, credentials);
    if (!Re) return;
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
              marketplace_name: Re.marketplaceName,
              plugin_name: Re.pluginName,
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
          ke.ratedInStore = !0;
        return;
      }
      case "dismissed":
      case "not_sure": {
        if (
          (await callPluginRatingsApi(
            "outcome",
            "post",
            "/api/oauth/organizations/:orgUUID/plugin_ratings/appearances/outcome",
            {
              marketplace_name: Re.marketplaceName,
              plugin_name: Re.pluginName,
              outcome: response === "dismissed" ? "dismissed" : "unsure",
            },
            credentials,
          ),
          ke.ratedInStore)
        ) {
          if (
            await callPluginRatingsApi(
              "withdraw",
              "delete",
              `/api/oauth/organizations/:orgUUID/plugin_ratings?marketplace_name=${encodeURIComponent(Re.marketplaceName)}&plugin_name=${encodeURIComponent(Re.pluginName)}`,
              void 0,
              credentials,
            )
          )
            ke.ratedInStore = !1;
        }
        return;
      }
    }
  });
}
/**
 * 判断是否可以向商店上报插件评分（未禁用反馈、第一方、非官方市场、组织匹配、动态配置开启），返回 {marketplaceName, pluginName} 或 null。
 */
//@ chunk-18hwfzwa.js:1075909-1076474 sole-consumer-new
async function getPluginRatingTarget(h, x) {
  if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return null;
  if (shouldSkipFeedbackSurvey()) return null;
  if (isFirstPartyTelemetryBlocked()) return null;
  if (!isPolicyAllowed_2("allow_product_feedback")) return null;
  if (isEssentialTrafficOnly()) return null;
  if (getAPIProvider() !== "firstParty") return null;
  if (h.marketplace === void 0 || isOfficialMarketplace(h.marketplace)) return null;
  if (!N4()) {
    if (hasStoredOAuthToken()) logFeatureSad("cli_plugin_rating_store", "skip_auth_org_mismatch");
    return null;
  }
  if (!(await orgSurveyCredentialSource(x, { acceptInjectedTokens: !0 })))
    return (logFeatureSad("cli_plugin_rating_store", "skip_org_unpinned"), null);
  if (
    (await getDynamicConfig_BLOCKS_ON_INIT(TENGU_PLUGIN_RATINGS_STORE_CONFIG, PLUGIN_RATINGS_STORE_DEFAULT))
      .enabled !== !0
  )
    return null;
  return { marketplaceName: h.marketplace, pluginName: h.name };
}
//@ chunk-18hwfzwa.js:1076474-1076765 sole-consumer-new
function chainRatingRequest(h, x, D) {
  let L = h.get(x);
  if (!L) {
    if (((L = { chain: Promise.resolve(), ratedInStore: !1 }), h.set(x, L), h.size > MAX_RATING_CHAINS)) {
      for (let ke of h.keys())
        if (ke !== x) {
          h.delete(ke);
          break;
        }
    }
  }
  let ee = L;
  return (
    (L.chain = L.chain.then(() =>
      D(ee).catch((ke) => {
        (logError(ke), logFeatureBad("cli_plugin_rating_store", "chain_exception"));
      }),
    )),
    L.chain
  );
}
/**
 * 调用插件评分商店 API（post/delete），按网络错误、认证、HTTP 状态分类记录 cli_plugin_rating_store 结果，成功返回 true。
 */
//@ chunk-18hwfzwa.js:1076765-1077648 sole-consumer-new
async function callPluginRatingsApi(step, method, path, body, credentials) {
  let ke = { ...PLUGIN_RATINGS_REQUEST_OPTIONS, credentials: credentials },
    Re;
  try {
    Re = method === "post" ? await apiClient.post(path, body, ke) : await apiClient.delete(path, body, ke);
  } catch (error) {
    let { kind: kind, status: status } = classifyAxiosError(error),
      ze =
        status !== void 0
          ? `http_${status}`
          : kind === "other"
            ? "exception"
            : kind === "http"
              ? (sanitizedConnectionCodeLowerForTelemetry(getErrnoCode(error)) ?? "no_response")
              : kind;
    return (
      logFeatureBad("cli_plugin_rating_store", `${step}_${ze}`),
      logForDebugging(`plugin rating store ${step} failed: ${ze}`, { level: "warn" }),
      !1
    );
  }
  if (!Re.ok) {
    let Be = Re.reason === "no-auth" ? "auth_unavailable" : Re.reason.replaceAll("-", "_");
    return (logFeatureSad("cli_plugin_rating_store", `${step}_${Be}`), !1);
  }
  if (Re.status >= 200 && Re.status < 300) return (logFeatureOk("cli_plugin_rating_store"), !0);
  if ([401, 403, 404, 409].includes(Re.status))
    return (
      logFeatureSad("cli_plugin_rating_store", `${step}_http_${Re.status}`),
      logForDebugging(`plugin rating store ${step} skipped: http_${Re.status}`),
      !1
    );
  return (
    logFeatureBad("cli_plugin_rating_store", `${step}_http_${Re.status}`),
    logForDebugging(`plugin rating store ${step} failed: http_${Re.status}`, { level: "warn" }),
    !1
  );
}
/**
 * 插件反馈调查的常量：感谢提示时长、默认配置（概率、全局/单插件间隔、最小活动时长、触发类型）、待调查记录上限、同插件活动去重窗口。
 */
//@ chunk-18hwfzwa.js:1077648-1077868 sole-consumer-new
var SURVEY_THANKS_MS = 3000,
  PLUGIN_SURVEY_DEFAULT_CONFIG = {
    probability: 0,
    minTimeBetweenGlobalMs: 86400000,
    minTimeBetweenPerPluginMs: 604800000,
    minActivityAgeMs: 21600000,
    enabledTriggers: ["skill", "subagent", "command", "mcp"],
    enabledScopes: void 0,
  },
  MAX_PENDING_SURVEYS = 32,
  ACTIVITY_DEDUPE_MS = 3600000;
/**
 * 把新的插件使用活动合并进待调查记录：同插件一小时内只保留更合适的触发类型，超过上限保留最新的。
 */
//@ chunk-18hwfzwa.js:1077868-1078489 sole-consumer-new
function mergePendingSurveyActivity(
  pending,
  activities,
  enabledTriggers = PLUGIN_SURVEY_DEFAULT_CONFIG.enabledTriggers,
) {
  let L = (ke) => enabledTriggers.includes(ke),
    next = null;
  for (let ke of activities) {
    if (mbr(ke.marketplace)) continue;
    let Re = lx(ke.name, ke.marketplace),
      Be = (next ?? pending)[Re],
      He = Be != null && typeof Be.ts === "number" && typeof Be.trigger === "string";
    if (He && ke.ts - Be.ts < ACTIVITY_DEDUPE_MS) {
      if (L(ke.trigger) && !L(Be.trigger))
        ((next = next ?? { ...pending }), (next[Re] = { ts: Be.ts, trigger: ke.trigger }));
      continue;
    }
    let We = He && L(Be.trigger) && !L(ke.trigger);
    ((next = next ?? { ...pending }), (next[Re] = { ts: ke.ts, trigger: We ? Be.trigger : ke.trigger }));
  }
  if (next && Object.keys(next).length > MAX_PENDING_SURVEYS) {
    let sliced = Object.entries(next)
      .sort((Re, Be) => (Be[1]?.ts ?? 0) - (Re[1]?.ts ?? 0))
      .slice(0, MAX_PENDING_SURVEYS);
    next = Object.fromEntries(sliced);
  }
  return next ?? pending;
}
/**
 * 从插件反馈问卷记录中筛出已到期（距触发超过最小间隔）且仍已安装、触发类型有效的插件，按触发时间倒序返回。
 */
//@ chunk-18hwfzwa.js:1078489-1078963 sole-consumer-new
function listEligibleSurveySubjects(h, x, D, L) {
  let filtered = Object.entries(h).filter(
    ([, Be]) =>
      Be !== null &&
      typeof Be === "object" &&
      typeof Be.ts === "number" &&
      typeof Be.trigger === "string" &&
      L - Be.ts >= x,
  );
  if (filtered.length === 0) return [];
  let ke = new Map();
  for (let Be of D()) {
    let He = parsePluginIdentifier(Be);
    ke.set(lx(He.name, He.marketplace), He);
  }
  let Re = [];
  for (let [Be, He] of filtered) {
    let We = ke.get(Be);
    if (!We || !Nqs(He.trigger)) continue;
    Re.push({ name: We.name, marketplace: We.marketplace, trigger: He.trigger, ts: He.ts });
  }
  return Re.sort((Be, He) => He.ts - Be.ts);
}
/**
 * 上报插件反馈问卷事件：tengu_plugin_feedback_survey_event 与 OTel feedback_survey（第三方插件名在未开启工具详情日志时隐去）。
 */
//@ chunk-18hwfzwa.js:1078963-1079370 sole-consumer-new
function logPluginSurveyEvent(h, x, D, L) {
  logEvent("tengu_plugin_feedback_survey_event", {
    event_type: fromEnum(h),
    appearance_id: ye(x),
    trigger_type: fromEnum(D.trigger),
    ...(L && { response: fromEnum(L) }),
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
    ...(L && { response: L }),
    plugin_id_hash: lx(D.name, D.marketplace),
    "plugin.name": ee ? D.name : THIRD_PARTY,
  });
}
/**
 * 从候选中选出要显示问卷的插件：触发类型与作用域须启用、每个插件只看一次、距上次展示超过最小间隔，取最久未展示者。
 */
//@ chunk-18hwfzwa.js:1079370-1079965 sole-consumer-new
function pickPluginSurveySubject(h, x, D, L, ee) {
  let ke = new Set(x.enabledTriggers),
    Re = x.enabledScopes && x.enabledScopes.length > 0 ? new Set(x.enabledScopes) : null,
    Be = null,
    He = new Set();
  for (let We = h.length - 1; We >= 0; We--) {
    let ze = h[We];
    if (!ke.has(ze.trigger)) continue;
    if (Re && !Re.has(getTelemetryPluginScope(ze.name, ze.marketplace, L))) continue;
    let Xe = lx(ze.name, ze.marketplace);
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
          features: $qs(ze.name, ze.marketplace),
        },
        lastShown: rt,
      };
  }
  return Be?.subject ?? null;
}
/**
 * 插件反馈调查：回合结束后按概率、间隔、启用的触发与范围挑选一个最近使用的插件显示调查，记录出现/回答/放弃并同步到评分商店。
 */
//@ chunk-18hwfzwa.js:1079965-1081950 sole-consumer-new
function usePluginFeedbackSurvey({
  turn: turn,
  hasActivePrompt: hasActivePrompt = !1,
  enabled: enabled = !0,
  otherSurveyActive: otherSurveyActive = !1,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    Re = useStoreSelector(turn, (ao) => ao.isLoading),
    Be = YM("tengu_plugin_feedback_survey_config", PLUGIN_SURVEY_DEFAULT_CONFIG),
    He = Q(() => ({ ...PLUGIN_SURVEY_DEFAULT_CONFIG, ...Be }), [Be]),
    [We, ze] = y(null),
    Xe = R(null),
    rt = R(new Map()),
    kt = R(Date.now()),
    At = R(Re);
  P(() => {
    pFo(Number.POSITIVE_INFINITY);
  }, []);
  let It = ce(
      (ao) => {
        let co = Xe.current;
        if (!co) return;
        let now = Date.now(),
          Ao = lx(co.name, co.marketplace);
        (saveGlobalConfig((Bo) => {
          let { [Ao]: Ro, ...Ho } = Bo.pluginSurveyState?.pending ?? {};
          return {
            ...Bo,
            pluginSurveyState: {
              ...Bo.pluginSurveyState,
              lastShownTime: now,
              perPlugin: { ...Bo.pluginSurveyState?.perPlugin, [Ao]: now },
              pending: Ho,
            },
          };
        }, storageV5),
          logPluginSurveyEvent("appeared", ao, co),
          recordPluginRatingAppearance(rt.current, ao, co, credentials));
      },
      [storageV5, credentials],
    ),
    Ot = ce(
      (ao, co) => {
        let bo = Xe.current;
        if (!bo) return;
        (logPluginSurveyEvent("responded", ao, bo, co),
          submitPluginRating(rt.current, ao, bo, co, credentials));
      },
      [credentials],
    ),
    Et = ce((ao) => {
      let co = Xe.current;
      if (!co) return;
      logPluginSurveyEvent("abandoned", ao, co);
    }, []),
    {
      state: state,
      lastResponse: lastResponse,
      appearanceId: appearanceId,
      open: open,
      abandon: abandon,
      handleSelect: handleSelect,
      handleUndo: handleUndo,
    } = useSurveyState({
      hideThanksAfterMs: SURVEY_THANKS_MS,
      otherSurveyActive: otherSurveyActive,
      onOpen: It,
      onSelect: Ot,
      onAbandon: Et,
    });
  return (
    P(() => {
      let ao = At.current;
      if (((At.current = Re), !ao || Re)) return;
      if (hasActivePrompt || state !== "closed") return;
      if (otherSurveyActive) return;
      if (!enabled || He.probability <= 0) return;
      if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return;
      if (shouldSkipFeedbackSurvey()) return;
      if (!isPolicyAllowed_2("allow_product_feedback")) return;
      let now = Date.now(),
        pluginSurveyState = getGlobalConfig().pluginSurveyState,
        Ao = pFo(kt.current);
      kt.current = now;
      let Bo = pluginSurveyState?.pending ?? {},
        Ro = mergePendingSurveyActivity(Bo, Ao, He.enabledTriggers);
      if (Ro !== Bo)
        saveGlobalConfig(
          (Wo) => ({
            ...Wo,
            pluginSurveyState: {
              ...Wo.pluginSurveyState,
              pending: mergePendingSurveyActivity(
                Wo.pluginSurveyState?.pending ?? {},
                Ao,
                He.enabledTriggers,
              ),
            },
          }),
          storageV5,
        );
      if (
        pluginSurveyState?.lastShownTime &&
        now - pluginSurveyState.lastShownTime < He.minTimeBetweenGlobalMs
      )
        return;
      let Ho = listEligibleSurveySubjects(
        Ro,
        He.minActivityAgeMs,
        () => Object.keys(getInstalledPlugins().plugins),
        now,
      );
      if (Ho.length === 0) return;
      let Io = pickPluginSurveySubject(Ho, He, pluginSurveyState?.perPlugin ?? {}, af(), now);
      if (!Io) return;
      if (Math.random() >= He.probability) return;
      ((Xe.current = Io), ze(Io), open());
    }, [enabled, Re, hasActivePrompt, state, He, open, otherSurveyActive, storageV5]),
    {
      state: state,
      subject: We,
      lastResponse: lastResponse,
      appearanceId: appearanceId,
      abandon: abandon,
      handleSelect: handleSelect,
      handleUndo: handleUndo,
    }
  );
}
//@ chunk-18hwfzwa.js:1081950-1081954 sole-consumer-new
j();

export { usePluginFeedbackSurvey, useOrgSurvey };
