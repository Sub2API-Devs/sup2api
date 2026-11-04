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
import {
  objectSchema,
  booleanSchema,
  custom,
  stringSchema,
  numberSchema,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { isProbeWrittenValue, firstWord } from "../../utils/model/thirdPartyModelDefaults.js";
import {
  isSdkDialogHostActive,
  getSdkSupportedDialogKinds,
  getMainLoopModelOverride,
} from "../../bootstrap/state.js";
import {
  needsConsentOrCredits,
  isModelBlockedByOverride,
  setSessionConsentKey,
  saveModelConsent,
  hasExtraUsageProvisioned,
} from "../../utils/planTiers.js";
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
import { fetchUtilization, isLimitEnabled } from "./usage.js";
import { enableOverageBilling } from "./billing.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1627336-1627628 placement
/**
 * Fable 超额同意对话框的定义：载荷（是否开启超额、模型、余额与币种）与结果（同意、切换默认、取消）。
 */
var FABLE_OVERAGE_CONSENT_DIALOG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1627336", () => {
  FABLE_OVERAGE_CONSENT_DIALOG = withHideWhile({
    kind: "fable_overage_consent_prompt",
    payload: DoctorLazy(() =>
      objectSchema({
        overagesEnabled: booleanSchema(),
        modelName: custom(isProbeWrittenValue).optional(),
        model: stringSchema().optional(),
        balanceCents: numberSchema().nullable().optional(),
        currency: stringSchema().nullable().optional(),
      }),
    ),
    result: DoctorLazy(() => _enum(["consent", "switch_default", "cancelled"])),
    default: "cancelled",
  });
});
//@ chunk-e6aww6q8.js:1627628-1627726 placement
function canShowOverageConsentDialog(model) {
  if (model === undefined) return false;
  if (
    isSdkDialogHostActive() &&
    !(getSdkSupportedDialogKinds() ?? []).includes(FABLE_OVERAGE_CONSENT_DIALOG.kind)
  )
    return false;
  return true;
}
//@ chunk-e6aww6q8.js:1627726-1627779 placement
/**
 * 导出函数 `needsOverageConsentForModel`：参数 e, n，返回 fPe(e) && !isModelBlockedByOverride(getCanonicalName(e)) && YJt(n)。
 */
function needsOverageConsentForModel(model, requestDialog) {
  return (
    needsConsentOrCredits(model) &&
    !isModelBlockedByOverride(getCanonicalName(model)) &&
    canShowOverageConsentDialog(requestDialog)
  );
}
//@ chunk-e6aww6q8.js:1627779-1627839 placement
/**
 * 导出函数 `needsOverageConsentOnMainThread`：参数 e，返回 e.isMainThread && YJt(e.requestDialog)。
 */
function needsOverageConsentOnMainThread(model) {
  return model.isMainThread && canShowOverageConsentDialog(model.requestDialog);
}
//@ chunk-e6aww6q8.js:1627839-1628191 placement
/**
 * 当用户设置或环境默认模型属于只能用额度的模型族时，把用户设置中的默认模型改为指定模型，返回是否修改。
 */
function switchDefaultFromCreditsOnlyModel(model, newModel, storage) {
  if (getMainLoopModelOverride() !== undefined) return false;
  if (env.ANTHROPIC_MODEL) return false;
  let family = usageCreditsOnlyFamily(model);
  if (family === undefined) return false;
  let effectiveSettingSource = getEffectiveSettingSource_2("model");
  if (effectiveSettingSource === null) {
    let envDefaultModel = getEnvDefaultModel();
    if (
      envDefaultModel === null ||
      !isEnvDefaultModelGoverning() ||
      usageCreditsOnlyFamily(parseUserSpecifiedModel(envDefaultModel)) !== family
    )
      return false;
  } else {
    if (effectiveSettingSource !== "userSettings") return false;
    let model = getSettingsForSource("userSettings")?.model;
    if (model === undefined || usageCreditsOnlyFamily(parseUserSpecifiedModel(model)) !== family)
      return false;
  }
  updateSettingsForSource(
    "userSettings",
    {
      model: newModel,
    },
    undefined,
    storage,
  );
  return true;
}
//@ chunk-e6aww6q8.js:1628191-1628550 placement
/**
 * 查询额外用量（超额）状态 enabled/blocked/disabled/unknown，并缓存禁用原因；本地 LSP 模拟器存在时用模拟值。
 */
async function checkExtraUsageStatus(credentials, storage) {
  let lspManager = getLspManager();
  if (lspManager) {
    cacheExtraUsageDisabledReason(lspManager.isEnabled ? null : "overage_not_provisioned", storage);
    return lspManager.isEnabled ? "enabled" : "disabled";
  }
  let pending = null;
  try {
    pending = await fetchUtilization(credentials);
  } catch {
    return "unknown";
  }
  let extraUsage = pending?.extra_usage;
  if (extraUsage?.is_enabled === true) {
    cacheExtraUsageDisabledReason(null, storage);
    return "enabled";
  }
  if (isLimitEnabled(extraUsage)) {
    cacheExtraUsageDisabledReason(extraUsage?.disabled_reason ?? null, storage);
    return "blocked";
  }
  return extraUsage?.is_enabled === false ? "disabled" : "unknown";
}
//@ chunk-e6aww6q8.js:1628550-1628731 placement
/**
 * 为同意使用额度开启超额计费：先检查是否已开启或被阻止，再开启并清除禁用原因缓存。
 */
async function enableOverageForConsent({ skipLiveCheck = false, credentials, storageV5 }) {
  if (!skipLiveCheck) {
    let status = await checkExtraUsageStatus(credentials, storageV5);
    if (status === "enabled" || status === "blocked") return true;
  }
  let enabled = await enableOverageBilling(credentials);
  if (enabled) cacheExtraUsageDisabledReason(null, storageV5);
  return enabled;
}
//@ chunk-e6aww6q8.js:1628731-1628861 placement
/**
 * 记录用户对只能用额度的模型的同意（会话内或持久），必要时刷新超额状态，返回是否仍需额外处理。
 */
async function recordCreditsOnlyConsent(attemptModel, storageV5, credentials, { sessionOnly = false } = {}) {
  let familyName = firstWord(renderUsageCreditsOnlyModelName(attemptModel));
  if (sessionOnly) setSessionConsentKey(familyName);
  else saveModelConsent(familyName, storageV5);
  if (!hasExtraUsageProvisioned()) await checkExtraUsageStatus(credentials, storageV5);
  return !needsConsentOrCredits(attemptModel);
}
export {
  FABLE_OVERAGE_CONSENT_DIALOG,
  checkExtraUsageStatus,
  enableOverageForConsent,
  needsOverageConsentForModel,
  needsOverageConsentOnMainThread,
  recordCreditsOnlyConsent,
  switchDefaultFromCreditsOnlyModel,
};
