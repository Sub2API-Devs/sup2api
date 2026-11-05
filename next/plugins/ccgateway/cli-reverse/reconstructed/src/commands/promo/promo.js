/**
 * commands/promo/promo.tsx
 *
 * 促销/优惠领取命令界面与状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wq8b028c.js (39)
 * attribution: placement 39
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDeepStrictEqual } from "util";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  booleanSchema,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  isPromoStale,
  isAbsolutePromoPath,
  DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS,
  parsePromoState,
  promoConfigSchema_2,
  TENGU_SWIFT_LYNX,
  appendOrgIdIfUuid,
  readPromoConfigFromGate,
  appendPromoSubpath,
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
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { isWebSetupOfferable } from "../../services/cloudSessions/webSetup.js";
import { getGhAuthStatus } from "../../utils/github/ghAuthStatus.js";
import { GITHUB_CONNECTION_STATUS_CACHE } from "../remote-setup/api.js";

//@ chunk-wq8b028c.js:4545-4574 placement
var TENGU_SMOOTH_FOREST = "tengu_smooth_forest";
//@ chunk-wq8b028c.js:4574-4608 placement
function isSmoothForestEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SMOOTH_FOREST, false) === true;
}
//@ chunk-wq8b028c.js:4650-4769 placement
var promoStatusCacheSchema = DoctorLazy(() =>
  objectSchema({
    accountUuid: stringSchema().min(1),
    endpoint: stringSchema(),
    eligible: booleanSchema(),
    claimed: booleanSchema(),
    checkedAt: numberSchema().optional().catch(undefined),
  }),
);
//@ chunk-wq8b028c.js:4769-5053 placement
function readPromoStatusCache(accountUuid, endpoint, ttlSeconds, nowMs) {
  try {
    let cachedStatus = promoStatusCacheSchema().safeParse(getGlobalConfig().promoStartupStatusCache).data;
    if (
      cachedStatus?.accountUuid !== accountUuid ||
      cachedStatus.endpoint !== endpoint ||
      cachedStatus.checkedAt === undefined ||
      isPromoStale(cachedStatus.checkedAt, ttlSeconds, nowMs)
    )
      return;
    let { eligible, claimed, checkedAt } = cachedStatus;
    return {
      status: {
        eligible,
        claimed,
      },
      checkedAt,
    };
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-wq8b028c.js:5053-5189 placement
function writePromoStatusCache(nextCache, storage) {
  try {
    saveGlobalConfig(
      (currentConfig) =>
        isDeepStrictEqual(currentConfig.promoStartupStatusCache, nextCache)
          ? currentConfig
          : {
              ...currentConfig,
              promoStartupStatusCache: nextCache,
            },
      storage,
    ).catch((error) => logError(toError(error)));
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-wq8b028c.js:5189-5247 placement
var PROMO_CLAIM_TIMEOUT_MS = 1e4;
var MAX_FAILED_STATUS_ASKS = 3;
var INELIGIBLE_PROMO_STATUS = Object.freeze({
  eligible: false,
  claimed: false,
});
//@ chunk-wq8b028c.js:5247-5298 placement
function createPromoState() {
  return {
    entries: new Map(),
    changed: createSignal(),
  };
}
//@ chunk-wq8b028c.js:5298-5315 placement
var PROMO_STATE_SLOT = new HostScoped(createPromoState);
//@ chunk-wq8b028c.js:5315-5351 placement
function promoState() {
  return PROMO_STATE_SLOT.of(getRootSession().host);
}
//@ chunk-wq8b028c.js:5351-5415 placement
function promoEntryKey(endpoint) {
  let accountUuid = getOauthAccountInfo()?.accountUuid;
  return accountUuid
    ? `${accountUuid}
${endpoint}`
    : null;
}
//@ chunk-wq8b028c.js:5415-5482 placement
function promoEntryOf(endpoint) {
  let entryKey = promoEntryKey(endpoint);
  return entryKey === null ? undefined : promoState().entries.get(entryKey);
}
//@ chunk-wq8b028c.js:5482-5693 placement
function getPromoEntry(endpoint) {
  let entryKey = promoEntryKey(endpoint);
  if (entryKey === null) return null;
  let entries = promoState().entries;
  let entry = entries.get(entryKey);
  if (entry === undefined) {
    entry = {
      status: undefined,
      checkedAt: null,
      pendingStatus: null,
      failedStatusAsks: 0,
      askBudgetWall: null,
      taken: false,
    };
    entries.set(entryKey, entry);
  }
  return entry;
}
//@ chunk-wq8b028c.js:5693-5807 placement
function isPromoOfferable(endpoint) {
  if (!isAbsolutePromoPath(endpoint) || !arePromoOffersAllowed()) return false;
  let entry = promoEntryOf(endpoint);
  return entry?.status?.eligible === true && !entry.status.claimed && !entry.taken;
}
//@ chunk-wq8b028c.js:5807-5845 placement
function isPromoTaken(endpoint) {
  return promoEntryOf(endpoint)?.taken === true;
}
//@ chunk-wq8b028c.js:5845-6881 placement
/**
 * 获取促销资格状态：内存有效则直接用；否则读全局配置缓存；再否则发起请求（失败计数受限），成功后写入缓存并通知变化。
 */
async function getPromoStatus(
  endpoint,
  credentials,
  askBudgetWall,
  {
    refresh = false,
    maxAgeSeconds = DEFAULT_PROMO_STATUS_MAX_AGE_SECONDS,
    now = Date.now(),
    storageV5: storage,
  } = {},
) {
  if (!isAbsolutePromoPath(endpoint) || !arePromoOffersAllowed()) return;
  let accountUuid = getOauthAccountInfo()?.accountUuid;
  let entry = getPromoEntry(endpoint);
  if (entry === null || !accountUuid) {
    logForDebugging("[promo] account not known yet; status not asked");
    return;
  }
  let isStale = entry.checkedAt !== null && !entry.taken && isPromoStale(entry.checkedAt, maxAgeSeconds, now);
  if (entry.status !== undefined && !refresh && !isStale) return entry.status;
  let useCache = maxAgeSeconds !== 0;
  let cached =
    useCache && !refresh && entry.pendingStatus === null
      ? readPromoStatusCache(accountUuid, endpoint, maxAgeSeconds, now)
      : undefined;
  if (cached !== undefined) {
    entry.status = cached.status;
    entry.checkedAt = cached.checkedAt;
    entry.failedStatusAsks = 0;
    emitSignalSafely(promoState().changed);
    return entry.status;
  }
  if (askBudgetWall !== undefined && askBudgetWall !== entry.askBudgetWall) {
    entry.askBudgetWall = askBudgetWall;
    entry.failedStatusAsks = 0;
  }
  if (entry.pendingStatus === null) {
    if (entry.failedStatusAsks >= MAX_FAILED_STATUS_ASKS) return entry.status;
    let state = promoState();
    let pendingStatus = fetchPromoStatus(endpoint, credentials).then((promoStatus) => {
      entry.pendingStatus = null;
      if (promoStatus === undefined) entry.failedStatusAsks++;
      else {
        entry.failedStatusAsks = 0;
        entry.checkedAt = now;
        if (promoStatus !== INELIGIBLE_PROMO_STATUS || entry.status === undefined) entry.status = promoStatus;
        let isOfferAvailable = promoStatus.eligible && !promoStatus.claimed;
        if (
          useCache &&
          promoStatus !== INELIGIBLE_PROMO_STATUS &&
          !(entry.taken && isOfferAvailable) &&
          arePromoOffersAllowed()
        ) {
          let { eligible, claimed } = promoStatus;
          writePromoStatusCache(
            {
              accountUuid,
              endpoint,
              eligible,
              claimed,
              checkedAt: now,
            },
            storage,
          );
        }
      }
      emitSignalSafely(state.changed);
    });
    entry.pendingStatus = pendingStatus;
  }
  await entry.pendingStatus;
  return entry.status;
}
//@ chunk-wq8b028c.js:6881-6926 placement
function emitSignalSafely(changed) {
  try {
    changed.emit();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-wq8b028c.js:6926-7940 placement
/**
 * 查询促销状态，无登录或 teleport 组织时跳过
 */
async function fetchPromoStatus(endpoint, credentials) {
  try {
    let response = await apiClient.get(endpoint, {
      auth: "teleport-org",
      timeout: PROMO_CLAIM_TIMEOUT_MS,
      maxRedirects: 0,
      validateStatus: () => true,
      credentials,
    });
    if (!response.ok) {
      if (response.reason === "no-auth") {
        logFeatureSad("promo_status", "no_auth");
        return;
      }
      logFeatureSad("promo_status", "refused");
      return INELIGIBLE_PROMO_STATUS;
    }
    let promoState = parsePromoState({
      httpStatus: response.status,
      body: response.data,
    });
    if (promoState.kind === "answered") {
      logFeatureOk("promo_status");
      return promoState.status;
    }
    if (promoState.reason === "body") {
      if (promoState.kind === "no_answer") {
        logForDebugging("[promo] status response carried neither field (in-band error)", {
          level: "warn",
        });
        logFeatureSad("promo_status", "in_band_error");
        return;
      }
      logForDebugging("[promo] status response had an unknown shape", {
        level: "warn",
      });
      logFeatureSad("promo_status", "bad_shape");
      return INELIGIBLE_PROMO_STATUS;
    }
    logForDebugging(`[promo] status returned ${response.status}`, {
      level: "warn",
    });
    if (promoState.kind === "not_eligible") {
      logFeatureSad("promo_status", "http_4xx");
      return INELIGIBLE_PROMO_STATUS;
    }
    if (response.status === 408 || response.status === 429) {
      logFeatureSad("promo_status", response.status === 408 ? "http_408" : "http_429");
      return;
    }
    logFeatureSad("promo_status", response.status >= 500 ? "http_5xx" : "http_3xx");
    return;
  } catch (error) {
    logForDebugging(`[promo] status request failed: ${toError(error).message}`, {
      level: "warn",
    });
    logFeatureSad("promo_status", "request_failed");
    return;
  }
}
//@ chunk-wq8b028c.js:7940-7951 placement
var PROMO_OPEN_TIMEOUT_MS = 1e4;
//@ chunk-wq8b028c.js:7951-8573 placement
/**
 * 打开优惠领取页，组织策略禁止时不打开
 */
async function openPromoClaimPage(endpoint, claimPaths) {
  if (!isPolicyAllowed(ALLOW_PROMO_OFFERS)) {
    logForDebugging("[promo] claim page not opened: org policy denies it");
    return null;
  }
  let state = promoState();
  let promoEntry = getPromoEntry(endpoint);
  let organizationUuid =
    promoConfigSchema_2().safeParse(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_SWIFT_LYNX, null)).data
      ?.claimLinkIncludesOrganization === true
      ? env.CLAUDE_CODE_ORGANIZATION_UUID || getOauthAccountInfo()?.organizationUuid
      : undefined;
  let openPromise = openInDesktopOrBrowser({
    webPath: appendOrgIdIfUuid(claimPaths.webPath, organizationUuid),
    desktopPath: appendOrgIdIfUuid(claimPaths.desktopPath, organizationUuid),
  }).catch((error) => {
    logError(toError(error));
    return "none";
  });
  let openedTarget = await withDeadline(openPromise, PROMO_OPEN_TIMEOUT_MS);
  if (promoEntry !== null) {
    promoEntry.taken = true;
    emitSignalSafely(state.changed);
  }
  switch (openedTarget) {
    case undefined:
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
  return {
    opened: openedTarget ?? "none",
    httpsUrl: getClaudeAiWebUrl(claimPaths.webPath),
  };
}
//@ chunk-wq8b028c.js:8573-9145 placement
/**
 * /claim-credit 促销的文案与常量：入口编号、各种不可用/已领取/处理中提示、帮助链接、/web-setup 提示与打开延时。
 */
var PROMO_ENTRY_POINT = "6";
var OFFER_UNAVAILABLE_TEXT = "This offer isn't available right now.";
var OFFER_OPENING_TEXT = "The offer page is already opening";
var OFFER_OPEN_FAILED_TEXT = "The offer page didn't open.";
var OFFER_PAGE_LABEL = "Offer page";
var CLAIM_PENDING_TEXT = "Your claim is being processed.";
var OFFER_EXPIRED_TEXT = "This offer has expired.";
var CLAIMED_ELSEWHERE_TEXT = "This offer was already claimed in another organization.";
var ALREADY_CLAIMED_TEXT = "You've already claimed this offer.";
var SEE_OFFER_TEXT = "See the offer at";
var NOT_ELIGIBLE_TEXT = "This offer isn't available for this account.";
var LEARN_MORE_TEXT = "Learn more at";
var PROMO_SUPPORT_URL = "https://support.claude.com/en/articles/17152539";
var WEB_SETUP_HINT = "Set up GitHub for cloud sessions automatically by running /web-setup";
var OPEN_DELAY_MS = 750;
var STATUS_CHECK_FAILED_TEXT = "Couldn't check this offer right now.";
//@ chunk-wq8b028c.js:9145-9219 placement
function createPromoStatus() {
  return {
    exposureLogged: false,
    commandInFlight: false,
    keptParse: null,
  };
}
//@ chunk-wq8b028c.js:9219-9236 placement
var PROMO_STATUS_SLOT = new HostScoped(createPromoStatus);
//@ chunk-wq8b028c.js:9236-9272 placement
function promoStatus() {
  return PROMO_STATUS_SLOT.of(getRootSession().host);
}
//@ chunk-wq8b028c.js:9272-9352 placement
var promoStatusSchema = DoctorLazy(() =>
  objectSchema({
    accountUuid: stringSchema().min(1),
    endpoint: stringSchema(),
    eligible: booleanSchema(),
    claimed: booleanSchema(),
  }),
);
//@ chunk-wq8b028c.js:9352-9398 placement
function currentAccountUuid() {
  return getOauthAccountInfo()?.accountUuid || undefined;
}
//@ chunk-wq8b028c.js:9398-9599 placement
function parseKeptPromoCache(promoStartupStatusCache) {
  let state = promoStatus();
  if (state.keptParse === null || state.keptParse.raw !== promoStartupStatusCache) {
    let parsed = promoStatusSchema().safeParse(promoStartupStatusCache);
    state.keptParse = {
      raw: promoStartupStatusCache,
      kept: parsed.success && (parsed.data.claimed || parsed.data.eligible) ? parsed.data : undefined,
    };
  }
  return state.keptParse.kept;
}
//@ chunk-wq8b028c.js:9599-9705 placement
function getCachedPromoForAccount(config, accountUuid, endpoint) {
  let keptPromoCache = parseKeptPromoCache(config.promoStartupStatusCache);
  return keptPromoCache?.accountUuid === accountUuid && keptPromoCache.endpoint === endpoint
    ? keptPromoCache
    : undefined;
}
//@ chunk-wq8b028c.js:9705-10266 placement
/**
 * 刷新促销状态并同步全局配置中的启动缓存：不再符合时清除，状态变化时更新。
 */
async function refreshPromoStartupStatus(promo, credentials, storage, refresh) {
  let accountUuid = currentAccountUuid();
  let status = await getPromoStatus(promo.endpoint, credentials, undefined, {
    refresh,
    maxAgeSeconds: promo.statusMaxAgeSeconds,
    storageV5: storage,
  });
  if (status === undefined || accountUuid === undefined) return status;
  if (status.eligible && !status.claimed && !isPromoOfferable(promo.endpoint)) return status;
  saveGlobalConfig((config) => {
    let cachedPromoForAccount = getCachedPromoForAccount(config, accountUuid, promo.endpoint);
    if (!status.eligible && !status.claimed)
      return cachedPromoForAccount?.claimed === false
        ? {
            ...config,
            promoStartupStatusCache: undefined,
          }
        : config;
    if (
      promo.statusMaxAgeSeconds !== 0 ||
      (cachedPromoForAccount !== undefined &&
        cachedPromoForAccount.eligible === status.eligible &&
        cachedPromoForAccount.claimed === status.claimed)
    )
      return config;
    return {
      ...config,
      promoStartupStatusCache: {
        accountUuid,
        endpoint: promo.endpoint,
        eligible: status.eligible,
        claimed: status.claimed,
      },
    };
  }, storage);
  return status;
}
//@ chunk-wq8b028c.js:10266-10319 placement
function isPromoOfferedHere() {
  return !isPromoOffersBlocked() && isPolicyAllowed("allow_promo_offers");
}
//@ chunk-wq8b028c.js:10319-10478 placement
function logPromoExposureOnce(surface, promo) {
  let isExposed = isSmoothForestEnabled();
  let state = promoStatus();
  if (!state.exposureLogged) {
    state.exposureLogged = true;
    logEvent("tengu_promo_exposure", {
      surface: fromEnum(surface),
      exposed: isExposed,
      config_version: promo.version,
    });
  }
  return isExposed;
}
//@ chunk-wq8b028c.js:10478-11890 placement
async function resolvePromoCommandState(host, credentials, storage) {
  if (!isPromoOfferedHere()) return OFFER_UNAVAILABLE_TEXT;
  let promoConfigFromGate = readPromoConfigFromGate();
  if (promoConfigFromGate === null) return OFFER_UNAVAILABLE_TEXT;
  let state = promoStatus();
  if (state.commandInFlight) return OFFER_OPENING_TEXT;
  let claimPaths = appendPromoSubpath(promoConfigFromGate, PROMO_ENTRY_POINT);
  state.commandInFlight = true;
  try {
    let accountUuidBefore = currentAccountUuid();
    let status = await refreshPromoStartupStatus(promoConfigFromGate, credentials, storage, true);
    if (!isPromoOfferedHere()) {
      logPromoNotOffered(promoConfigFromGate, "policy_denied");
      return OFFER_UNAVAILABLE_TEXT;
    }
    if (!isPromoOfferable(promoConfigFromGate.endpoint)) {
      let description =
        currentAccountUuid() === accountUuidBefore
          ? describePromoState(status, isPromoTaken(promoConfigFromGate.endpoint))
          : {
              reason: "account_switched",
              text: undefined,
            };
      let reason =
        description.reason === "taken_this_session" && !logPromoExposureOnce("command", promoConfigFromGate)
          ? "held_out"
          : description.reason;
      if (reason !== "taken_this_session" && reason !== "pending" && reason !== "already_claimed") {
        logPromoNotOffered(promoConfigFromGate, reason);
        let offerSuffix =
          reason === "not_eligible"
            ? `${LEARN_MORE_TEXT} ${PROMO_SUPPORT_URL}`
            : `${OFFER_PAGE_LABEL} \xB7 ${getClaudeAiWebUrl(claimPaths.webPath)}`;
        return description.text === undefined ? offerSuffix : `${description.text} ${offerSuffix}`;
      }
      let webSetupPromise = shouldSuggestWebSetup(host, credentials, storage);
      let promoClaimPage = await openPromoClaimPage(promoConfigFromGate.endpoint, claimPaths);
      if (promoClaimPage === null) {
        logPromoNotOffered(promoConfigFromGate, "policy_denied");
        return OFFER_UNAVAILABLE_TEXT;
      }
      logPromoNotOffered(promoConfigFromGate, reason, promoClaimPage.opened);
      return offerLineWithSetupHint(
        reason === "taken_this_session"
          ? offerLine(promoConfigFromGate, promoClaimPage)
          : `${description.text} ${SEE_OFFER_TEXT} ${promoClaimPage.httpsUrl}`,
        (await withDeadline(webSetupPromise, OPEN_DELAY_MS)) === true && canOfferWebSetup(),
      );
    }
    if (!logPromoExposureOnce("command", promoConfigFromGate)) {
      logPromoNotOffered(promoConfigFromGate, "held_out");
      return `${OFFER_PAGE_LABEL} \xB7 ${getClaudeAiWebUrl(claimPaths.webPath)}`;
    }
    logEvent("tengu_promo_banner_clicked", {
      surface: fromEnum("command"),
      entry_point: fromEnum(PROMO_ENTRY_POINT),
      config_version: promoConfigFromGate.version,
    });
    let webSetupPromise = shouldSuggestWebSetup(host, credentials, storage);
    let now = Date.now();
    let promoClaimPage = await openPromoClaimPage(promoConfigFromGate.endpoint, claimPaths);
    let latencyMs = Date.now() - now;
    if (promoClaimPage === null) {
      logPromoNotOffered(promoConfigFromGate, "policy_denied");
      return OFFER_UNAVAILABLE_TEXT;
    }
    saveGlobalConfig(
      (currentConfig) =>
        currentConfig.promoStartupStatusCache === undefined
          ? currentConfig
          : {
              ...currentConfig,
              promoStartupStatusCache: undefined,
            },
      storage,
    );
    let webSetupHint = (await withDeadline(webSetupPromise, OPEN_DELAY_MS)) === true && canOfferWebSetup();
    logEvent("tengu_promo_open_result", {
      surface: fromEnum("command"),
      entry_point: fromEnum(PROMO_ENTRY_POINT),
      opened: fromEnum(promoClaimPage.opened),
      latency_ms: latencyMs,
      config_version: promoConfigFromGate.version,
      web_setup_hint: webSetupHint,
    });
    return offerLineWithSetupHint(offerLine(promoConfigFromGate, promoClaimPage), webSetupHint);
  } catch (error) {
    logError(toError(error));
    return claimPageLine(promoConfigFromGate, getClaudeAiWebUrl(claimPaths.webPath));
  } finally {
    state.commandInFlight = false;
  }
}
//@ chunk-wq8b028c.js:11890-11947 placement
function claimPageLine(promoConfig, pageUrl) {
  return `${promoConfig.claimPageLine ?? OFFER_PAGE_LABEL} \xB7 ${pageUrl}`;
}
//@ chunk-wq8b028c.js:11947-12031 placement
function offerLine(promoConfig, { opened, httpsUrl }) {
  let pageLine = claimPageLine(promoConfig, httpsUrl);
  return opened === "none" ? `${OFFER_OPEN_FAILED_TEXT} ${pageLine}` : pageLine;
}
//@ chunk-wq8b028c.js:12031-12192 placement
function logPromoNotOffered(promoConfig, reason, opened) {
  logEvent("tengu_promo_command_not_offered", {
    surface: fromEnum("command"),
    entry_point: fromEnum(PROMO_ENTRY_POINT),
    config_version: promoConfig.version,
    reason: fromEnum(reason),
    ...(opened !== undefined && {
      opened: fromEnum(opened),
    }),
  });
}
//@ chunk-wq8b028c.js:12192-12233 placement
function offerLineWithSetupHint(line, showSetupHint) {
  return showSetupHint
    ? `${line}
${WEB_SETUP_HINT}`
    : line;
}
//@ chunk-wq8b028c.js:12233-12297 placement
function canOfferWebSetup() {
  try {
    return !isRemoteSessionAvailable() && isWebSetupOfferable();
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-wq8b028c.js:12297-12518 placement
async function shouldSuggestWebSetup(host, credentials, storage) {
  try {
    if (!canOfferWebSetup()) return false;
    let [ghAuthStatus, connectionStatus] = await Promise.all([
      getGhAuthStatus({
        allowNetworkFallbackForOldGh: false,
      }),
      GITHUB_CONNECTION_STATUS_CACHE.of(host).readLive(credentials, storage),
    ]);
    return ghAuthStatus.status === "authenticated" && connectionStatus === "not_connected";
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-wq8b028c.js:12518-13048 placement
/**
 * 根据促销状态给出不可提供的原因与提示文字：未知、本会话已领取、不符合、处理中、已过期、在其他组织领取、已领取。
 */
function describePromoState(status, takenThisSession) {
  if (status === undefined)
    return {
      reason: "status_unknown",
      text: STATUS_CHECK_FAILED_TEXT,
    };
  if (!status.claimed) {
    if (status.eligible)
      return {
        reason: takenThisSession ? "taken_this_session" : "not_offerable",
        text: undefined,
      };
    return status.state === "not_claimed"
      ? {
          reason: "not_eligible",
          text: NOT_ELIGIBLE_TEXT,
        }
      : {
          reason: "answer_unusable",
          text: undefined,
        };
  }
  switch (status.state) {
    case "pending":
      return {
        reason: "pending",
        text: CLAIM_PENDING_TEXT,
      };
    case "expired":
      return {
        reason: "expired",
        text: OFFER_EXPIRED_TEXT,
      };
    case "claimed_elsewhere":
      return {
        reason: "claimed_elsewhere",
        text: CLAIMED_ELSEWHERE_TEXT,
      };
    case "active":
    case "not_claimed":
    case undefined:
      return {
        reason: "already_claimed",
        text: ALREADY_CLAIMED_TEXT,
      };
  }
}
//@ chunk-wq8b028c.js:13048-13154 placement
/**
 * /claim-credit 命令实现：返回解析后的促销命令状态文本。
 */
async function claimCreditCommand(args, { credentials, session, storageV5 }) {
  return {
    type: "text",
    value: await resolvePromoCommandState(session.host, credentials, storageV5),
  };
}
export { claimCreditCommand };
