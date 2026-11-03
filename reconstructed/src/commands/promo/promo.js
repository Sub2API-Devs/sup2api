/**
 * commands/promo/promo.tsx
 *
 * 促销/优惠领取命令界面与状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ndsajhew.js (39)
 * attribution: placement 39
 */
import { isDeepStrictEqual } from "util";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, M, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  V4r,
  vtr,
  DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS,
  parsePromoState,
  promoConfigSchema,
  TENGU_SWIFT_LYNX,
  a4o,
  ktr,
  ani,
} from "../../services/promo/promoState.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { arePromoOffersAllowed, ALLOW_PROMO_OFFERS, isPromoOffersBlocked } from "../../utils/planTiers.js";
import { logForDebugging } from "../../utils/debug.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { env } from "../../utils/env.js";
import { openInDesktopOrBrowser, getClaudeAiWebUrl } from "../../utils/desktopDeepLink.js";
import { withDeadline } from "../../utils/sleep.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { wt } from "../../remote/remoteMode.js";
import { isWebSetupOfferable } from "../../services/cloudSessions/webSetup.js";
import { getGhAuthStatus } from "../../utils/github/ghAuthStatus.js";
import { ZV } from "../remote-setup/api.js";

//@ chunk-ndsajhew.js:4209-4238 placement
var TENGU_SMOOTH_FOREST = "tengu_smooth_forest";
//@ chunk-ndsajhew.js:4238-4272 placement
function K() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SMOOTH_FOREST, !1) === !0;
}
//@ chunk-ndsajhew.js:4314-4433 placement
var promoStatusCacheSchema = DoctorLazy(() =>
  u({
    accountUuid: o().min(1),
    endpoint: o(),
    eligible: M(),
    claimed: M(),
    checkedAt: E()
      .optional()
      .catch(void 0),
  }),
);
//@ chunk-ndsajhew.js:4433-4717 placement
function readPromoStatusCache(e, s, n, r) {
  try {
    let S = promoStatusCacheSchema().safeParse(getGlobalConfig().promoStartupStatusCache).data;
    if (S?.accountUuid !== e || S.endpoint !== s || S.checkedAt === void 0 || V4r(S.checkedAt, n, r)) return;
    let { eligible: eligible, claimed: claimed, checkedAt: checkedAt } = S;
    return { status: { eligible: eligible, claimed: claimed }, checkedAt: checkedAt };
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-ndsajhew.js:4717-4853 placement
function writePromoStatusCache(e, s) {
  try {
    saveGlobalConfig(
      (n) => (isDeepStrictEqual(n.promoStartupStatusCache, e) ? n : { ...n, promoStartupStatusCache: e }),
      s,
    ).catch((n) => logError(toError(n)));
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-ndsajhew.js:4853-4911 placement
var pe = 1e4,
  ge = 3,
  freeze = Object.freeze({ eligible: !1, claimed: !1 });
//@ chunk-ndsajhew.js:4911-4962 placement
function Se() {
  return { entries: new Map(), changed: createSignal() };
}
//@ chunk-ndsajhew.js:4962-4979 placement
var _e = new HostScoped(Se);
//@ chunk-ndsajhew.js:4979-5015 placement
function O() {
  return _e.of(getRootSession().host);
}
//@ chunk-ndsajhew.js:5015-5079 placement
function Q(e) {
  let s = getOauthAccountInfo()?.accountUuid;
  return s
    ? `${s}
${e}`
    : null;
}
//@ chunk-ndsajhew.js:5079-5146 placement
function V(e) {
  let s = Q(e);
  return s === null ? void 0 : O().entries.get(s);
}
//@ chunk-ndsajhew.js:5146-5357 placement
function getPromoEntry(e) {
  let s = Q(e);
  if (s === null) return null;
  let entries = O().entries,
    r = entries.get(s);
  if (r === void 0)
    ((r = {
      status: void 0,
      checkedAt: null,
      pendingStatus: null,
      failedStatusAsks: 0,
      askBudgetWall: null,
      taken: !1,
    }),
      entries.set(s, r));
  return r;
}
//@ chunk-ndsajhew.js:5357-5471 placement
function isPromoOfferable(e) {
  if (!vtr(e) || !arePromoOffersAllowed()) return !1;
  let s = V(e);
  return s?.status?.eligible === !0 && !s.status.claimed && !s.taken;
}
//@ chunk-ndsajhew.js:5471-5509 placement
function J(e) {
  return V(e)?.taken === !0;
}
/**
 * 获取促销资格状态：内存有效则直接用；否则读全局配置缓存；再否则发起请求（失败计数受限），成功后写入缓存并通知变化。
 */
//@ chunk-ndsajhew.js:5509-6545 placement
async function getPromoStatus(
  endpoint,
  credentials,
  askBudgetWall,
  {
    refresh: refresh = !1,
    maxAgeSeconds: maxAgeSeconds = DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS,
    now: now = Date.now(),
    storageV5: storage,
  } = {},
) {
  if (!vtr(endpoint) || !arePromoOffersAllowed()) return;
  let accountUuid = getOauthAccountInfo()?.accountUuid,
    entry = getPromoEntry(endpoint);
  if (entry === null || !accountUuid) {
    logForDebugging("[promo] account not known yet; status not asked");
    return;
  }
  let isStale = entry.checkedAt !== null && !entry.taken && V4r(entry.checkedAt, maxAgeSeconds, now);
  if (entry.status !== void 0 && !refresh && !isStale) return entry.status;
  let useCache = maxAgeSeconds !== 0,
    cached =
      useCache && !refresh && entry.pendingStatus === null
        ? readPromoStatusCache(accountUuid, endpoint, maxAgeSeconds, now)
        : void 0;
  if (cached !== void 0)
    return (
      (entry.status = cached.status),
      (entry.checkedAt = cached.checkedAt),
      (entry.failedStatusAsks = 0),
      F(O().changed),
      entry.status
    );
  if (askBudgetWall !== void 0 && askBudgetWall !== entry.askBudgetWall)
    ((entry.askBudgetWall = askBudgetWall), (entry.failedStatusAsks = 0));
  if (entry.pendingStatus === null) {
    if (entry.failedStatusAsks >= ge) return entry.status;
    let x = O(),
      k = fetchPromoStatus(endpoint, credentials).then((P) => {
        if (((entry.pendingStatus = null), P === void 0)) entry.failedStatusAsks++;
        else {
          if (
            ((entry.failedStatusAsks = 0), (entry.checkedAt = now), P !== freeze || entry.status === void 0)
          )
            entry.status = P;
          let I = P.eligible && !P.claimed;
          if (useCache && P !== freeze && !(entry.taken && I) && arePromoOffersAllowed()) {
            let { eligible: eligible, claimed: claimed } = P;
            writePromoStatusCache(
              {
                accountUuid: accountUuid,
                endpoint: endpoint,
                eligible: eligible,
                claimed: claimed,
                checkedAt: now,
              },
              storage,
            );
          }
        }
        F(x.changed);
      });
    entry.pendingStatus = k;
  }
  return (await entry.pendingStatus, entry.status);
}
//@ chunk-ndsajhew.js:6545-6590 placement
function F(e) {
  try {
    e.emit();
  } catch (error) {
    logError(toError(error));
  }
}
/**
 * 查询促销状态，无登录或 teleport 组织时跳过
 */
//@ chunk-ndsajhew.js:6590-7604 placement
async function fetchPromoStatus(e, s) {
  try {
    let n = await apiClient.get(e, {
      auth: "teleport-org",
      timeout: pe,
      maxRedirects: 0,
      validateStatus: () => !0,
      credentials: s,
    });
    if (!n.ok) {
      if (n.reason === "no-auth") {
        logFeatureSad("promo_status", "no_auth");
        return;
      }
      return (logFeatureSad("promo_status", "refused"), freeze);
    }
    let r = parsePromoState({ httpStatus: n.status, body: n.data });
    if (r.kind === "answered") return (logFeatureOk("promo_status"), r.status);
    if (r.reason === "body") {
      if (r.kind === "no_answer") {
        (logForDebugging("[promo] status response carried neither field (in-band error)", { level: "warn" }),
          logFeatureSad("promo_status", "in_band_error"));
        return;
      }
      return (
        logForDebugging("[promo] status response had an unknown shape", { level: "warn" }),
        logFeatureSad("promo_status", "bad_shape"),
        freeze
      );
    }
    if (
      (logForDebugging(`[promo] status returned ${n.status}`, { level: "warn" }), r.kind === "not_eligible")
    )
      return (logFeatureSad("promo_status", "http_4xx"), freeze);
    if (n.status === 408 || n.status === 429) {
      logFeatureSad("promo_status", n.status === 408 ? "http_408" : "http_429");
      return;
    }
    logFeatureSad("promo_status", n.status >= 500 ? "http_5xx" : "http_3xx");
    return;
  } catch (error) {
    (logForDebugging(`[promo] status request failed: ${toError(error).message}`, { level: "warn" }),
      logFeatureSad("promo_status", "request_failed"));
    return;
  }
}
//@ chunk-ndsajhew.js:7604-7615 placement
var ke = 1e4;
/**
 * 打开优惠领取页，组织策略禁止时不打开
 */
//@ chunk-ndsajhew.js:7615-8237 placement
async function openPromoClaimPage(e, s) {
  if (!isPolicyAllowed(ALLOW_PROMO_OFFERS))
    return (logForDebugging("[promo] claim page not opened: org policy denies it"), null);
  let n = O(),
    r = getPromoEntry(e),
    m =
      promoConfigSchema().safeParse(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SWIFT_LYNX, null)).data
        ?.claimLinkIncludesOrganization === !0
        ? env.CLAUDE_CODE_ORGANIZATION_UUID || getOauthAccountInfo()?.organizationUuid
        : void 0,
    _ = openInDesktopOrBrowser({ webPath: a4o(s.webPath, m), desktopPath: a4o(s.desktopPath, m) }).catch(
      (d) => (logError(toError(d)), "none"),
    ),
    h = await withDeadline(_, ke);
  if (r !== null) ((r.taken = !0), F(n.changed));
  switch (h) {
    case void 0:
      logFeatureSad("promo_claim_page", "deadline");
      break;
    case "none":
      logFeatureSad("promo_claim_page", "not_opened");
      break;
    case "desktop":
    case "browser":
      logFeatureOk("promo_claim_page");
      break;
  }
  return { opened: h ?? "none", httpsUrl: getClaudeAiWebUrl(s.webPath) };
}
/**
 * /claim-credit 促销的文案与常量：入口编号、各种不可用/已领取/处理中提示、帮助链接、/web-setup 提示与打开延时。
 */
//@ chunk-ndsajhew.js:8237-8809 placement
var PROMO_ENTRY_POINT = "6",
  OFFER_UNAVAILABLE_TEXT = "This offer isn't available right now.",
  OFFER_OPENING_TEXT = "The offer page is already opening",
  OFFER_OPEN_FAILED_TEXT = "The offer page didn't open.",
  OFFER_PAGE_LABEL = "Offer page",
  CLAIM_PENDING_TEXT = "Your claim is being processed.",
  OFFER_EXPIRED_TEXT = "This offer has expired.",
  CLAIMED_ELSEWHERE_TEXT = "This offer was already claimed in another organization.",
  ALREADY_CLAIMED_TEXT = "You've already claimed this offer.",
  SEE_OFFER_TEXT = "See the offer at",
  NOT_ELIGIBLE_TEXT = "This offer isn't available for this account.",
  LEARN_MORE_TEXT = "Learn more at",
  PROMO_SUPPORT_URL = "https://support.claude.com/en/articles/17152539",
  WEB_SETUP_HINT = "Set up GitHub for cloud sessions automatically by running /web-setup",
  OPEN_DELAY_MS = 750,
  STATUS_CHECK_FAILED_TEXT = "Couldn't check this offer right now.";
//@ chunk-ndsajhew.js:8809-8883 placement
function Ie() {
  return { exposureLogged: !1, commandInFlight: !1, keptParse: null };
}
//@ chunk-ndsajhew.js:8883-8900 placement
var Fe = new HostScoped(Ie);
//@ chunk-ndsajhew.js:8900-8936 placement
function X() {
  return Fe.of(getRootSession().host);
}
//@ chunk-ndsajhew.js:8936-9016 placement
var He = DoctorLazy(() => u({ accountUuid: o().min(1), endpoint: o(), eligible: M(), claimed: M() }));
//@ chunk-ndsajhew.js:9016-9062 placement
function G() {
  return getOauthAccountInfo()?.accountUuid || void 0;
}
//@ chunk-ndsajhew.js:9062-9263 placement
function parseKeptPromoCache(e) {
  let s = X();
  if (s.keptParse === null || s.keptParse.raw !== e) {
    let safeParse = He().safeParse(e);
    s.keptParse = {
      raw: e,
      kept:
        safeParse.success && (safeParse.data.claimed || safeParse.data.eligible) ? safeParse.data : void 0,
    };
  }
  return s.keptParse.kept;
}
//@ chunk-ndsajhew.js:9263-9369 placement
function getCachedPromoForAccount(e, s, n) {
  let r = parseKeptPromoCache(e.promoStartupStatusCache);
  return r?.accountUuid === s && r.endpoint === n ? r : void 0;
}
/**
 * 刷新促销状态并同步全局配置中的启动缓存：不再符合时清除，状态变化时更新。
 */
//@ chunk-ndsajhew.js:9369-9930 placement
async function refreshPromoStartupStatus(promo, credentials, storage, refresh) {
  let accountUuid = G(),
    status = await getPromoStatus(promo.endpoint, credentials, void 0, {
      refresh: refresh,
      maxAgeSeconds: promo.statusMaxAgeSeconds,
      storageV5: storage,
    });
  if (status === void 0 || accountUuid === void 0) return status;
  if (status.eligible && !status.claimed && !isPromoOfferable(promo.endpoint)) return status;
  return (
    saveGlobalConfig((_) => {
      let h = getCachedPromoForAccount(_, accountUuid, promo.endpoint);
      if (!status.eligible && !status.claimed)
        return h?.claimed === !1 ? { ..._, promoStartupStatusCache: void 0 } : _;
      if (
        promo.statusMaxAgeSeconds !== 0 ||
        (h !== void 0 && h.eligible === status.eligible && h.claimed === status.claimed)
      )
        return _;
      return {
        ..._,
        promoStartupStatusCache: {
          accountUuid: accountUuid,
          endpoint: promo.endpoint,
          eligible: status.eligible,
          claimed: status.claimed,
        },
      };
    }, storage),
    status
  );
}
//@ chunk-ndsajhew.js:9930-9983 placement
function ne() {
  return !isPromoOffersBlocked() && isPolicyAllowed("allow_promo_offers");
}
//@ chunk-ndsajhew.js:9983-10142 placement
function logPromoExposureOnce(e, s) {
  let n = K(),
    r = X();
  if (!r.exposureLogged)
    ((r.exposureLogged = !0),
      logEvent("tengu_promo_exposure", { surface: fromEnum(e), exposed: n, config_version: s.version }));
  return n;
}
//@ chunk-ndsajhew.js:10142-11554 placement
async function resolvePromoCommandState(e, s, n) {
  if (!ne()) return OFFER_UNAVAILABLE_TEXT;
  let r = ktr();
  if (r === null) return OFFER_UNAVAILABLE_TEXT;
  let S = X();
  if (S.commandInFlight) return OFFER_OPENING_TEXT;
  let m = ani(r, PROMO_ENTRY_POINT);
  S.commandInFlight = !0;
  try {
    let _ = G(),
      h = await refreshPromoStartupStatus(r, s, n, !0);
    if (!ne()) return (logPromoNotOffered(r, "policy_denied"), OFFER_UNAVAILABLE_TEXT);
    if (!isPromoOfferable(r.endpoint)) {
      let k = G() === _ ? describePromoState(h, J(r.endpoint)) : { reason: "account_switched", text: void 0 },
        P = k.reason === "taken_this_session" && !logPromoExposureOnce("command", r) ? "held_out" : k.reason;
      if (P !== "taken_this_session" && P !== "pending" && P !== "already_claimed") {
        logPromoNotOffered(r, P);
        let R =
          P === "not_eligible"
            ? `${LEARN_MORE_TEXT} ${PROMO_SUPPORT_URL}`
            : `${OFFER_PAGE_LABEL} \xB7 ${getClaudeAiWebUrl(m.webPath)}`;
        return k.text === void 0 ? R : `${k.text} ${R}`;
      }
      let I = shouldSuggestWebSetup(e, s, n),
        C = await openPromoClaimPage(r.endpoint, m);
      if (C === null) return (logPromoNotOffered(r, "policy_denied"), OFFER_UNAVAILABLE_TEXT);
      return (
        logPromoNotOffered(r, P, C.opened),
        ae(
          P === "taken_this_session" ? re(r, C) : `${k.text} ${SEE_OFFER_TEXT} ${C.httpsUrl}`,
          (await withDeadline(I, OPEN_DELAY_MS)) === !0 && j(),
        )
      );
    }
    if (!logPromoExposureOnce("command", r))
      return (logPromoNotOffered(r, "held_out"), `${OFFER_PAGE_LABEL} \xB7 ${getClaudeAiWebUrl(m.webPath)}`);
    logEvent("tengu_promo_banner_clicked", {
      surface: fromEnum("command"),
      entry_point: fromEnum(PROMO_ENTRY_POINT),
      config_version: r.version,
    });
    let d = shouldSuggestWebSetup(e, s, n),
      now = Date.now(),
      b = await openPromoClaimPage(r.endpoint, m),
      A = Date.now() - now;
    if (b === null) return (logPromoNotOffered(r, "policy_denied"), OFFER_UNAVAILABLE_TEXT);
    saveGlobalConfig(
      (k) => (k.promoStartupStatusCache === void 0 ? k : { ...k, promoStartupStatusCache: void 0 }),
      n,
    );
    let x = (await withDeadline(d, OPEN_DELAY_MS)) === !0 && j();
    return (
      logEvent("tengu_promo_open_result", {
        surface: fromEnum("command"),
        entry_point: fromEnum(PROMO_ENTRY_POINT),
        opened: fromEnum(b.opened),
        latency_ms: A,
        config_version: r.version,
        web_setup_hint: x,
      }),
      ae(re(r, b), x)
    );
  } catch (error) {
    return (logError(toError(error)), de(r, getClaudeAiWebUrl(m.webPath)));
  } finally {
    S.commandInFlight = !1;
  }
}
//@ chunk-ndsajhew.js:11554-11611 placement
function de(e, s) {
  return `${e.claimPageLine ?? OFFER_PAGE_LABEL} \xB7 ${s}`;
}
//@ chunk-ndsajhew.js:11611-11695 placement
function re(e, { opened: opened, httpsUrl: httpsUrl }) {
  let r = de(e, httpsUrl);
  return opened === "none" ? `${OFFER_OPEN_FAILED_TEXT} ${r}` : r;
}
//@ chunk-ndsajhew.js:11695-11856 placement
function logPromoNotOffered(e, s, n) {
  logEvent("tengu_promo_command_not_offered", {
    surface: fromEnum("command"),
    entry_point: fromEnum(PROMO_ENTRY_POINT),
    config_version: e.version,
    reason: fromEnum(s),
    ...(n !== void 0 && { opened: fromEnum(n) }),
  });
}
//@ chunk-ndsajhew.js:11856-11897 placement
function ae(e, s) {
  return s
    ? `${e}
${WEB_SETUP_HINT}`
    : e;
}
//@ chunk-ndsajhew.js:11897-11961 placement
function j() {
  try {
    return !wt() && isWebSetupOfferable();
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
//@ chunk-ndsajhew.js:11961-12182 placement
async function shouldSuggestWebSetup(e, s, n) {
  try {
    if (!j()) return !1;
    let [r, S] = await Promise.all([
      getGhAuthStatus({ allowNetworkFallbackForOldGh: !1 }),
      ZV.of(e).readLive(s, n),
    ]);
    return r.status === "authenticated" && S === "not_connected";
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * 根据促销状态给出不可提供的原因与提示文字：未知、本会话已领取、不符合、处理中、已过期、在其他组织领取、已领取。
 */
//@ chunk-ndsajhew.js:12182-12712 placement
function describePromoState(status, takenThisSession) {
  if (status === void 0) return { reason: "status_unknown", text: STATUS_CHECK_FAILED_TEXT };
  if (!status.claimed) {
    if (status.eligible)
      return { reason: takenThisSession ? "taken_this_session" : "not_offerable", text: void 0 };
    return status.state === "not_claimed"
      ? { reason: "not_eligible", text: NOT_ELIGIBLE_TEXT }
      : { reason: "answer_unusable", text: void 0 };
  }
  switch (status.state) {
    case "pending":
      return { reason: "pending", text: CLAIM_PENDING_TEXT };
    case "expired":
      return { reason: "expired", text: OFFER_EXPIRED_TEXT };
    case "claimed_elsewhere":
      return { reason: "claimed_elsewhere", text: CLAIMED_ELSEWHERE_TEXT };
    case "active":
    case "not_claimed":
    case void 0:
      return { reason: "already_claimed", text: ALREADY_CLAIMED_TEXT };
  }
}
/**
 * /claim-credit 命令实现：返回解析后的促销命令状态文本。
 */
//@ chunk-ndsajhew.js:12712-12818 placement
async function claimCreditCommand(
  args,
  { credentials: credentials, session: session, storageV5: storageV5 },
) {
  return { type: "text", value: await resolvePromoCommandState(session.host, credentials, storageV5) };
}
