/**
 * services/api/overageConsent.ts
 *
 * 2.1.316 新增：超额用量同意流程
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, M, hu, o, E, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { isProbeWrittenValue, firstWord } from "../../utils/model/thirdPartyModelDefaults.js";
import {
  isSdkDialogHostActive,
  getSdkSupportedDialogKinds,
  getMainLoopModelOverride,
} from "../../bootstrap/state.js";
import { fPe, isModelBlockedByOverride, Wdi, yst, hasExtraUsageProvisioned } from "../../utils/planTiers.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { env } from "../../utils/env.js";
import {
  usageCreditsOnlyFamily,
  parseUserSpecifiedModel,
  renderUsageCreditsOnlyModelName,
} from "../../utils/model/modelDisplay.js";
import {
  getEffectiveSettingSource_2,
  getSettingsForSource,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import { getEnvDefaultModel, isEnvDefaultModelGoverning } from "../../utils/model/defaultModel.js";
import { getLspManager } from "../lsp/manager.js";
import { cacheExtraUsageDisabledReason } from "../claudeAiLimits.js";
import { fetchUtilization, HEt } from "./usage.js";
import { enableOverageBilling } from "./billing.js";

/**
 * Fable 超额同意对话框的定义：载荷（是否开启超额、模型、余额与币种）与结果（同意、切换默认、取消）。
 */
//@ chunk-e6aww6q8.js:1627336-1627628 placement
var FABLE_OVERAGE_CONSENT_DIALOG = withHideWhile({
  kind: "fable_overage_consent_prompt",
  payload: DoctorLazy(() =>
    u({
      overagesEnabled: M(),
      modelName: hu(isProbeWrittenValue).optional(),
      model: o().optional(),
      balanceCents: E().nullable().optional(),
      currency: o().nullable().optional(),
    }),
  ),
  result: DoctorLazy(() => U(["consent", "switch_default", "cancelled"])),
  default: "cancelled",
});
//@ chunk-e6aww6q8.js:1627628-1627726 placement
function YJt(e) {
  if (e === void 0) return !1;
  if (
    isSdkDialogHostActive() &&
    !(getSdkSupportedDialogKinds() ?? []).includes(FABLE_OVERAGE_CONSENT_DIALOG.kind)
  )
    return !1;
  return !0;
}
//@ chunk-e6aww6q8.js:1627726-1627779 placement
function sWt(e, n) {
  return fPe(e) && !isModelBlockedByOverride(getCanonicalName(e)) && YJt(n);
}
//@ chunk-e6aww6q8.js:1627779-1627839 placement
function KYs(e) {
  return e.isMainThread && YJt(e.requestDialog);
}
/**
 * 当用户设置或环境默认模型属于只能用额度的模型族时，把用户设置中的默认模型改为指定模型，返回是否修改。
 */
//@ chunk-e6aww6q8.js:1627839-1628191 placement
function switchDefaultFromCreditsOnlyModel(model, newModel, storage) {
  if (getMainLoopModelOverride() !== void 0) return !1;
  if (env.ANTHROPIC_MODEL) return !1;
  let s = usageCreditsOnlyFamily(model);
  if (s === void 0) return !1;
  let h = getEffectiveSettingSource_2("model");
  if (h === null) {
    let y = getEnvDefaultModel();
    if (
      y === null ||
      !isEnvDefaultModelGoverning() ||
      usageCreditsOnlyFamily(parseUserSpecifiedModel(y)) !== s
    )
      return !1;
  } else {
    if (h !== "userSettings") return !1;
    let y = getSettingsForSource("userSettings")?.model;
    if (y === void 0 || usageCreditsOnlyFamily(parseUserSpecifiedModel(y)) !== s) return !1;
  }
  return (updateSettingsForSource("userSettings", { model: newModel }, void 0, storage), !0);
}
/**
 * 查询额外用量（超额）状态 enabled/blocked/disabled/unknown，并缓存禁用原因；本地 LSP 模拟器存在时用模拟值。
 */
//@ chunk-e6aww6q8.js:1628191-1628550 placement
async function checkExtraUsageStatus(credentials, storage) {
  let r = getLspManager();
  if (r)
    return (
      cacheExtraUsageDisabledReason(r.isEnabled ? null : "overage_not_provisioned", storage),
      r.isEnabled ? "enabled" : "disabled"
    );
  let s = null;
  try {
    s = await fetchUtilization(credentials);
  } catch {
    return "unknown";
  }
  let h = s?.extra_usage;
  if (h?.is_enabled === !0) return (cacheExtraUsageDisabledReason(null, storage), "enabled");
  if (HEt(h)) return (cacheExtraUsageDisabledReason(h?.disabled_reason ?? null, storage), "blocked");
  return h?.is_enabled === !1 ? "disabled" : "unknown";
}
/**
 * 为同意使用额度开启超额计费：先检查是否已开启或被阻止，再开启并清除禁用原因缓存。
 */
//@ chunk-e6aww6q8.js:1628550-1628731 placement
async function enableOverageForConsent({
  skipLiveCheck: skipLiveCheck = !1,
  credentials: credentials,
  storageV5: storageV5,
}) {
  if (!skipLiveCheck) {
    let h = await checkExtraUsageStatus(credentials, storageV5);
    if (h === "enabled" || h === "blocked") return !0;
  }
  let s = await enableOverageBilling(credentials);
  if (s) cacheExtraUsageDisabledReason(null, storageV5);
  return s;
}
/**
 * 记录用户对只能用额度的模型的同意（会话内或持久），必要时刷新超额状态，返回是否仍需额外处理。
 */
//@ chunk-e6aww6q8.js:1628731-1628861 placement
async function recordCreditsOnlyConsent(e, n, r, { sessionOnly: s = !1 } = {}) {
  let h = firstWord(renderUsageCreditsOnlyModelName(e));
  if (s) Wdi(h);
  else yst(h, n);
  if (!hasExtraUsageProvisioned()) await checkExtraUsageStatus(r, n);
  return !fPe(e);
}

export {
  FABLE_OVERAGE_CONSENT_DIALOG,
  checkExtraUsageStatus,
  enableOverageForConsent,
  sWt,
  KYs,
  recordCreditsOnlyConsent,
  switchDefaultFromCreditsOnlyModel,
};
