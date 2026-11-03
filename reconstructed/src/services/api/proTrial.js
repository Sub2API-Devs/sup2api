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
import { Twi } from "./verificationRequired.js";
import { apiClient } from "../routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logError } from "../../utils/log.js";

//@ chunk-73yknwsx.js:353-362 placement
var u = 14;
//@ chunk-73yknwsx.js:362-424 placement
function Qgo() {
  return getOauthAccountInfo()?.claudeCodeTrialDurationDays ?? null;
}
//@ chunk-73yknwsx.js:424-471 placement
var s = { status: "ineligible", daysRemaining: null };
/**
 * 读取 Pro 试用状态：本地已初始化则按其结束时间；否则仅 pro 订阅且具备试用标志时按账号的试用结束时间计算。
 */
//@ chunk-73yknwsx.js:471-643 placement
function getProTrialStatus() {
  let r = initializationState();
  if (r) return trialStatusFrom(!0, r.endsAt);
  let e = getOauthAccountInfo();
  if (!e || getSubscriptionType() !== "pro") return s;
  let a = e.ccOnboardingFlags?.e10 === !0;
  return trialStatusFrom(a, e.claudeCodeTrialEndsAt ?? null);
}
/**
 * 开始 Pro 试用：本地模拟模式直接生成结束时间，否则调用组织 pro_trial 接口并保存结束时间，返回试用状态。
 */
//@ chunk-73yknwsx.js:643-1109 placement
async function startProTrial(storage, credentials) {
  return withFeatureTelemetry("api_pro_trial_start", async () => {
    if (initializationState()) {
      let iso = new Date(Date.now() + u * 24 * 60 * 60 * 1000).toISOString();
      return (Twi({ endsAt: iso }), trialStatusFrom(!0, iso));
    }
    let post = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/claude_code/pro_trial",
      {},
      { auth: "teleport-org", credentials: credentials },
    );
    if (!post.ok)
      throw Error(post.reason === "no-auth" ? post.detail : `Pro trial start unavailable: ${post.reason}`);
    return (
      logForDebugging("Pro trial started", { level: "debug" }),
      saveTrialEndsAt(post.data.ends_at, storage),
      trialStatusFrom(!0, post.data.ends_at)
    );
  });
}
/**
 * 判断 Pro 试用已过期且额外用量被禁用。
 */
//@ chunk-73yknwsx.js:1109-1211 placement
function isProTrialExpiredWithDisabledCredits() {
  if (getProTrialStatus().status !== "expired") return !1;
  return getGlobalConfig().cachedExtraUsageDisabledReason !== null;
}
/**
 * 生成试用徽标文字：进行中显示剩余天数，过期显示 Usage credits，其他不显示。
 */
//@ chunk-73yknwsx.js:1211-1414 placement
function proTrialBadgeText(r) {
  switch (r.status) {
    case "active": {
      let e = r.daysRemaining ?? 0;
      return `Trial: ${e} ${e === 1 ? "day" : "days"} left`;
    }
    case "expired":
      return "Usage credits";
    case "ineligible":
    case "not_started":
      return null;
  }
}
/**
 * 由是否有资格和结束时间计算试用状态（未开始、进行中及剩余天数、已过期）。
 */
//@ chunk-73yknwsx.js:1414-1745 placement
function trialStatusFrom(eligible, endsAt) {
  if (!eligible) return s;
  if (!endsAt) return { status: "not_started", daysRemaining: null };
  let date = new Date(endsAt);
  if (Number.isNaN(date.getTime()))
    return (logError(Error(`Invalid claude_code_trial_ends_at: ${endsAt}`)), s);
  let n = date.getTime() - Date.now();
  if (n <= 0) return { status: "expired", daysRemaining: 0 };
  return { status: "active", daysRemaining: Math.ceil(n / 86400000) };
}
//@ chunk-73yknwsx.js:1745-1914 placement
function saveTrialEndsAt(r, e) {
  saveGlobalConfig((a) => {
    if (!a.oauthAccount || a.oauthAccount.claudeCodeTrialEndsAt === r) return a;
    return { ...a, oauthAccount: { ...a.oauthAccount, claudeCodeTrialEndsAt: r } };
  }, e);
}
/**
 * （匹配存疑）恒返回 null 的死代码函数，后面是按 "not-started"/"expired"/数字算 endsAt 的不可达分支；与 LSP 无关。
 */
//@ chunk-aepeg2w5.js:288982-289234 placement = initializationState (0.51)
function initializationState() {
  return null;
  switch (n) {
    case "not-started":
      return { endsAt: null };
    case "expired":
      return { endsAt: new Date(Date.now() - r).toISOString() };
    default: {
      let s = Number(n);
      return Number.isFinite(s) && s > 0 ? { endsAt: new Date(Date.now() + s * r).toISOString() } : null;
    }
  }
}

export { isProTrialExpiredWithDisabledCredits, getProTrialStatus, startProTrial, Qgo, proTrialBadgeText };
