/**
 * services/api/overageConsent.ts
 *
 * 2.1.316 新增：超额用量同意流程
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  booleanSchema,
  custom as custom_2,
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
  getEffectiveSettingSource,
  getSettingsForSource,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import { getEnvDefaultModel, isEnvDefaultModelGoverning } from "../../utils/model/defaultModel.js";
import { getLspManager } from "../lsp/manager.js";
import { cacheExtraUsageDisabledReason } from "../claudeAiLimits.js";
import { fetchUtilization, isLimitEnabled } from "./usage.js";
import { enableOverageBilling } from "./billing.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1695042-1695334 placement
/**
 * Fable 超额同意对话框的定义：载荷（是否开启超额、模型、余额与币种）与结果（同意、切换默认、取消）。
 */
var FABLE_OVERAGE_CONSENT_DIALOG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1695042", () => {
  FABLE_OVERAGE_CONSENT_DIALOG = withHideWhile({
    kind: "fable_overage_consent_prompt",
    payload: DoctorLazy(() =>
      objectSchema({
        overagesEnabled: booleanSchema(),
        modelName: custom_2(isProbeWrittenValue).optional(),
        model: stringSchema().optional(),
        balanceCents: numberSchema().nullable().optional(),
        currency: stringSchema().nullable().optional(),
      }),
    ),
    result: DoctorLazy(() => _enum(["consent", "switch_default", "cancelled"])),
    default: "cancelled",
  });
});
//@ chunk-5xgkngpb.js:1695334-1695432 placement
function canShowOverageConsentDialog(model) {
  if (model === undefined) return false;
  if (
    isSdkDialogHostActive() &&
    !(getSdkSupportedDialogKinds() ?? []).includes(FABLE_OVERAGE_CONSENT_DIALOG.kind)
  )
    return false;
  return true;
}
//@ chunk-5xgkngpb.js:1695432-1695485 placement
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
//@ chunk-5xgkngpb.js:1695485-1695545 placement
/**
 * 导出函数 `needsOverageConsentOnMainThread`：参数 e，返回 e.isMainThread && YJt(e.requestDialog)。
 */
function needsOverageConsentOnMainThread(model) {
  return model.isMainThread && canShowOverageConsentDialog(model.requestDialog);
}
//@ chunk-5xgkngpb.js:1695545-1695897 placement
/**
 * 当用户设置或环境默认模型属于只能用额度的模型族时，把用户设置中的默认模型改为指定模型，返回是否修改。
 */
function switchDefaultFromCreditsOnlyModel(model, newModel, storage) {
  if (getMainLoopModelOverride() !== undefined) return false;
  if (env.ANTHROPIC_MODEL) return false;
  let family = usageCreditsOnlyFamily(model);
  if (family === undefined) return false;
  let effectiveSettingSource = getEffectiveSettingSource("model");
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
//@ chunk-5xgkngpb.js:1695897-1696256 placement
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
//@ chunk-5xgkngpb.js:1696256-1696437 placement
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
//@ chunk-5xgkngpb.js:1696437-1696567 placement
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
  needsOverageConsentForModel,
  FABLE_OVERAGE_CONSENT_DIALOG,
  checkExtraUsageStatus,
  enableOverageForConsent,
  needsOverageConsentOnMainThread,
  recordCreditsOnlyConsent,
  switchDefaultFromCreditsOnlyModel,
};
