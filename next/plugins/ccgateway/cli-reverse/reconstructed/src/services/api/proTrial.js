/**
 * services/api/proTrial.ts
 *
 * 2.1.316 新增。Pro 试用接口。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-73yknwsx.js (9), chunk-aepeg2w5.js (1)
 * attribution: placement 10
 */
import { getOauthAccountInfo, getSubscriptionType } from "../../utils/auth.js";
import { withFeatureTelemetry } from "../analytics/featureTelemetry.js";
import { noop } from "./verificationRequired.js";
import { apiClient } from "../routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logError } from "../../utils/log.js";

//@ chunk-aepeg2w5.js:288982-289234 placement (2.1.88 match: initializationState, 0.51)
/**
 * （匹配存疑）恒返回 null 的死代码函数，后面是按 "not-started"/"expired"/数字算 endsAt 的不可达分支；与 LSP 无关。
 */
function initializationState() {
  return null;
  switch (n) {
    case "not-started":
      return {
        endsAt: null,
      };
    case "expired":
      return {
        endsAt: new Date(Date.now() - r).toISOString(),
      };
    default: {
      let value = Number(n);
      return Number.isFinite(value) && value > 0
        ? {
            endsAt: new Date(Date.now() + value * r).toISOString(),
          }
        : null;
    }
  }
}
//@ chunk-73yknwsx.js:353-362 placement
/**
 * Pro 试用默认 14 天（本地初始化试用结束时间用）。
 */
var DEFAULT_TRIAL_DAYS = 14;
//@ chunk-73yknwsx.js:362-424 placement
/**
 * 导出函数 `trialDurationDays`：返回 getOauthAccountInfo()?.claudeCodeTrialDurationDays ?? null。
 */
function trialDurationDays() {
  return getOauthAccountInfo()?.claudeCodeTrialDurationDays ?? null;
}
//@ chunk-73yknwsx.js:424-471 placement
var INELIGIBLE_TRIAL_STATUS = {
  status: "ineligible",
  daysRemaining: null,
};
//@ chunk-73yknwsx.js:471-643 placement
/**
 * 读取 Pro 试用状态：本地已初始化则按其结束时间；否则仅 pro 订阅且具备试用标志时按账号的试用结束时间计算。
 */
function getProTrialStatus() {
  let state = initializationState();
  if (state) return trialStatusFrom(true, state.endsAt);
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo || getSubscriptionType() !== "pro") return INELIGIBLE_TRIAL_STATUS;
  let onboarding = oauthAccountInfo.ccOnboardingFlags?.e10 === true;
  return trialStatusFrom(onboarding, oauthAccountInfo.claudeCodeTrialEndsAt ?? null);
}
//@ chunk-73yknwsx.js:643-1109 placement
/**
 * 开始 Pro 试用：本地模拟模式直接生成结束时间，否则调用组织 pro_trial 接口并保存结束时间，返回试用状态。
 */
async function startProTrial(storage, credentials) {
  return withFeatureTelemetry("api_pro_trial_start", async () => {
    if (initializationState()) {
      let iso = new Date(Date.now() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
      noop({
        endsAt: iso,
      });
      return trialStatusFrom(true, iso);
    }
    let response = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/claude_code/pro_trial",
      {},
      {
        auth: "teleport-org",
        credentials,
      },
    );
    if (!response.ok)
      throw Error(
        response.reason === "no-auth" ? response.detail : `Pro trial start unavailable: ${response.reason}`,
      );
    logForDebugging("Pro trial started", {
      level: "debug",
    });
    saveTrialEndsAt(response.data.ends_at, storage);
    return trialStatusFrom(true, response.data.ends_at);
  });
}
//@ chunk-73yknwsx.js:1109-1211 placement
/**
 * 判断 Pro 试用已过期且额外用量被禁用。
 */
function isProTrialExpiredWithDisabledCredits() {
  if (getProTrialStatus().status !== "expired") return false;
  return getGlobalConfig().cachedExtraUsageDisabledReason !== null;
}
//@ chunk-73yknwsx.js:1211-1414 placement
/**
 * 生成试用徽标文字：进行中显示剩余天数，过期显示 Usage credits，其他不显示。
 */
function proTrialBadgeText(daysLeft) {
  switch (daysLeft.status) {
    case "active": {
      let daysRemaining = daysLeft.daysRemaining ?? 0;
      return `Trial: ${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left`;
    }
    case "expired":
      return "Usage credits";
    case "ineligible":
    case "not_started":
      return null;
  }
}
//@ chunk-73yknwsx.js:1414-1745 placement
/**
 * 由是否有资格和结束时间计算试用状态（未开始、进行中及剩余天数、已过期）。
 */
function trialStatusFrom(eligible, endsAt) {
  if (!eligible) return INELIGIBLE_TRIAL_STATUS;
  if (!endsAt)
    return {
      status: "not_started",
      daysRemaining: null,
    };
  let date = new Date(endsAt);
  if (Number.isNaN(date.getTime())) {
    logError(Error(`Invalid claude_code_trial_ends_at: ${endsAt}`));
    return INELIGIBLE_TRIAL_STATUS;
  }
  let msUntil = date.getTime() - Date.now();
  if (msUntil <= 0)
    return {
      status: "expired",
      daysRemaining: 0,
    };
  return {
    status: "active",
    daysRemaining: Math.ceil(msUntil / 86400000),
  };
}
//@ chunk-73yknwsx.js:1745-1914 placement
function saveTrialEndsAt(endsAt, storage) {
  saveGlobalConfig((config) => {
    if (!config.oauthAccount || config.oauthAccount.claudeCodeTrialEndsAt === endsAt) return config;
    return {
      ...config,
      oauthAccount: {
        ...config.oauthAccount,
        claudeCodeTrialEndsAt: endsAt,
      },
    };
  }, storage);
}
export {
  isProTrialExpiredWithDisabledCredits,
  getProTrialStatus,
  startProTrial,
  trialDurationDays,
  proTrialBadgeText,
};
